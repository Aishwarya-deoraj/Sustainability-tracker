# ============================================================================
# IMPORTS
# ============================================================================
import os  # For environment variable access
import certifi  # For SSL certificate verification with MongoDB Atlas
from pymongo import MongoClient  # MongoDB database driver
from dotenv import load_dotenv  # Load environment variables from .env file
from bson.objectid import ObjectId  # MongoDB ObjectId handling
from datetime import datetime  # Timestamp management
import bcrypt  # Password hashing for secure authentication

# Load environment variables (MONGODB_URI, etc.)
load_dotenv()

# ============================================================================
# DATABASE SERVICE CLASS
# ============================================================================
class DatabaseService:
    """
    Central service class for all database operations.
    Handles user authentication, activity tracking, and analytics queries.
    
    Collections used:
    - users: User accounts with authentication
    - categories: Emission categories (Transportation, Food, etc.)
    - emission_factors: CO2e factors for various activities
    - activities: User's tracked carbon emission activities
    """
    
    def __init__(self):
        """
        Initialize MongoDB connection and select database.
        Uses MongoDB Atlas with SSL/TLS certificate verification.
        """
        self.client = MongoClient(
            os.getenv("MONGODB_URI"),  # Connection string from environment
            tlsCAFile=certifi.where()  # SSL certificate for secure connection
        )
        # Select the sustainability_tracker database
        self.db = self.client.sustainability_tracker
    
    # ========================================================================
    # USER AUTHENTICATION & MANAGEMENT
    # ========================================================================
    
    def hash_password(self, password: str) -> str:
        """
        Hash a password using bcrypt with automatic salt generation.
        
        Args:
            password: Plain text password
        
        Returns:
            Hashed password as string (safe to store in database)
        """
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """
        Verify a plain text password against a bcrypt hash.
        
        Args:
            plain_password: User-provided password
            hashed_password: Stored hash from database
        
        Returns:
            True if password matches, False otherwise
        """
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    
    def create_user_with_password(self, user_data):
        """
        Create a new user account with email and hashed password.
        
        Args:
            user_data: UserSignUp model with username, email, and password
        
        Returns:
            String representation of the new user's ObjectId
        
        Raises:
            ValueError: If email or username already exists
        """
        # Validate email uniqueness
        existing_user = self.db.users.find_one({"email": user_data.email})
        if existing_user:
            raise ValueError("User with this email already exists")
        
        # Validate username uniqueness
        existing_username = self.db.users.find_one({"username": user_data.username})
        if existing_username:
            raise ValueError("Username already taken")
        
        # Create user document with hashed password
        user_doc = {
            "username": user_data.username,
            "email": user_data.email,
            "password_hash": self.hash_password(user_data.password),  # Never store plain passwords!
            "created_at": datetime.now(),
            "last_login": datetime.now()
        }
        
        # Insert into database
        result = self.db.users.insert_one(user_doc)
        return str(result.inserted_id)
    
    def authenticate_user(self, email: str, password: str):
        """
        Authenticate a user with email and password.
        Updates last_login timestamp on successful authentication.
        
        Args:
            email: User's email address
            password: Plain text password to verify
        
        Returns:
            User document (with password_hash, but should be excluded in API response)
        
        Raises:
            ValueError: If user not found or password is incorrect
        """
        # Find user by email
        user = self.db.users.find_one({"email": email})
        if not user:
            raise ValueError("User not found")
        
        # Verify password against stored hash
        if not self.verify_password(password, user["password_hash"]):
            raise ValueError("Invalid password")
        
        # Update last login timestamp
        self.db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login": datetime.now()}}
        )
        
        return user
    
    def create_user(self, user_data):
        """
        Create a user without password (backward compatibility).
        If username exists, returns existing user ID.
        
        Args:
            user_data: UserCreate model with username and optional email
        
        Returns:
            String representation of user's ObjectId
        """
        # Check if username already exists
        existing_user = self.db.users.find_one({"username": user_data.username})
        if existing_user:
            # Return existing user ID (idempotent operation)
            return str(existing_user["_id"])
        
        # Create new user without password
        user_doc = {
            "username": user_data.username,
            "email": user_data.email,
            "created_at": datetime.now(),
            "last_login": datetime.now()
        }
        
        result = self.db.users.insert_one(user_doc)
        return str(result.inserted_id)

    # ========================================================================
    # USER RETRIEVAL METHODS
    # ========================================================================

    def get_user_by_email(self, email: str):
        """Retrieve user document by email address."""
        return self.db.users.find_one({"email": email})
    
    def get_user_by_username(self, username: str):
        """Retrieve user document by username."""
        return self.db.users.find_one({"username": username})

    def get_user(self, user_id):
        """Retrieve user document by ObjectId."""
        return self.db.users.find_one({"_id": ObjectId(user_id)})

    # ========================================================================
    # EMISSION FACTORS AND CATEGORIES
    # ========================================================================
    
    def get_emission_factors(self, category_name=None, search_term=None):
        """
        Retrieve emission factors with optional filtering.
        
        Args:
            category_name: Optional category name to filter by (e.g., "Transportation")
            search_term: Optional text search term (requires text index)
        
        Returns:
            List of emission factor documents with CO2e per unit values
        """
        query = {}
        
        # Filter by category if provided
        if category_name:
            category = self.db.categories.find_one({"name": category_name})
            if category:
                query["category_id"] = category["_id"]
        
        # Add text search if provided
        if search_term:
            query["$text"] = {"$search": search_term}
        
        return list(self.db.emission_factors.find(query))
    
    def get_categories(self):
        """
        Retrieve all emission categories.
        
        Returns:
            List of category documents (Transportation, Food, Energy, etc.)
        """
        return list(self.db.categories.find({}))
    
    # ========================================================================
    # ACTIVITY CRUD OPERATIONS
    # ========================================================================
    
    def create_activity(self, user_id, activity_data):
        """
        Create a new carbon emission activity with automatic CO2e calculation.
        Uses hybrid calculation logic for physical vs. economic activities.
        
        Args:
            user_id: User's ObjectId as string
            activity_data: ActivityCreate model with factor_id, quantity, monetary_amount, date
        
        Returns:
            Created activity document with calculated total_co2e
        
        Raises:
            ValueError: If emission factor not found or validation fails
        """
        # Retrieve the emission factor from database
        factor = self.db.emission_factors.find_one({"_id": ObjectId(activity_data.factor_id)})
        if not factor:
            raise ValueError("Emission factor not found")
        
        # HYBRID CALCULATION LOGIC:
        # Economic activities (USD-based) use monetary_amount
        # Physical activities use quantity
        if "USD" in factor.get("unit", ""):
            # Economic activity: CO2e = spending * emission_factor
            # Example: $100 spent on electricity * 0.5 kg CO2e/USD = 50 kg CO2e
            if activity_data.monetary_amount <= 0:
                raise ValueError("Monetary amount must be positive for economic activities")
            total_co2e = activity_data.monetary_amount * factor["co2e_per_unit"]
            quantity = 1  # Economic activities typically have quantity 1
        else:
            # Physical activity: CO2e = quantity * emission_factor
            # Example: 10 kg beef * 27 kg CO2e/kg = 270 kg CO2e
            total_co2e = activity_data.quantity * factor["co2e_per_unit"]
        
        # Create activity document
        activity_doc = {
            "user_id": ObjectId(user_id),
            "factor_id": ObjectId(activity_data.factor_id),
            "quantity": activity_data.quantity,
            "monetary_amount": activity_data.monetary_amount,
            "total_co2e": total_co2e,  # Calculated CO2 equivalent emissions
            "date": activity_data.date,
            "unit_used": factor["unit"]  # Store unit for reference
        }
        
        # Insert into database
        result = self.db.activities.insert_one(activity_doc)
        activity_doc["_id"] = result.inserted_id
        return activity_doc

    def update_activity(self, user_id, activity_id, update_data):
        """
        Update an existing activity and recalculate CO2e emissions.
        Ensures user authorization and maintains data integrity.
        
        Args:
            user_id: User's ObjectId as string
            activity_id: Activity's ObjectId as string
            update_data: ActivityUpdate model with optional fields to update
        
        Returns:
            Updated activity document with recalculated emissions
        
        Raises:
            ValueError: If activity not found, user unauthorized, or validation fails
        """
        
        # Step 1: Verify activity exists and belongs to user (authorization)
        original_activity = self.db.activities.find_one({
            "_id": ObjectId(activity_id),
            "user_id": ObjectId(user_id)
        })
        if not original_activity:
            raise ValueError("Activity not found or user unauthorized")

        # Step 2: Prepare update document
        update_doc = {}
        
        # Step 3: Merge update data with original values
        # Use new values if provided, otherwise keep original
        factor_id = update_data.factor_id if hasattr(update_data, 'factor_id') and update_data.factor_id else str(original_activity["factor_id"])
        quantity = update_data.quantity if hasattr(update_data, 'quantity') and update_data.quantity is not None else original_activity["quantity"]
        monetary_amount = update_data.monetary_amount if hasattr(update_data, 'monetary_amount') and update_data.monetary_amount is not None else original_activity["monetary_amount"]

        # Step 4: Get emission factor (may be new if factor_id changed)
        factor = self.db.emission_factors.find_one({"_id": ObjectId(factor_id)})
        if not factor:
            raise ValueError("Emission factor not found")

        # Step 5: Recalculate CO2e using hybrid logic
        if "USD" in factor.get("unit", ""):
            # Economic activity calculation
            if monetary_amount <= 0:
                raise ValueError("Monetary amount must be positive for economic activities")
            total_co2e = monetary_amount * factor["co2e_per_unit"]
        else:
            # Physical activity calculation
            total_co2e = quantity * factor["co2e_per_unit"]
        
        # Build update document with recalculated values
        update_doc["factor_id"] = ObjectId(factor_id)
        update_doc["quantity"] = quantity
        update_doc["monetary_amount"] = monetary_amount
        update_doc["total_co2e"] = total_co2e  # Recalculated emissions
        update_doc["unit_used"] = factor["unit"]

        # Step 6: Add optional date update
        if hasattr(update_data, 'date') and update_data.date:
            update_doc["date"] = update_data.date
            
        # Step 7: Perform database update
        result = self.db.activities.update_one(
            {"_id": ObjectId(activity_id)},
            {"$set": update_doc}
        )

        if result.matched_count == 0:
            raise ValueError("Activity not found")
        
        # Step 8: Return updated document
        updated_activity = self.db.activities.find_one({"_id": ObjectId(activity_id)})
        return updated_activity


    def delete_activity(self, user_id, activity_id):
        """
        Delete an activity with user authorization check.
        
        Args:
            user_id: User's ObjectId as string
            activity_id: Activity's ObjectId as string
        
        Returns:
            Success message dictionary
        
        Raises:
            ValueError: If activity not found or user unauthorized
        """
        # Delete only if activity belongs to user (authorization)
        result = self.db.activities.delete_one({
            "_id": ObjectId(activity_id),
            "user_id": ObjectId(user_id)
        })
        
        if result.deleted_count == 0:
            raise ValueError("Activity not found or user unauthorized")
        
        return {"message": "Activity deleted successfully"}

    # ========================================================================
    # DASHBOARD AND ANALYTICS QUERIES
    # ========================================================================
    
    def get_user_activities(self, user_id, limit=50):
        """
        Retrieve user's activities with enriched data (emission factor and category details).
        Uses MongoDB aggregation pipeline with $lookup (joins).
        
        Args:
            user_id: User's ObjectId as string
            limit: Maximum number of activities to return (default: 50)
        
        Returns:
            List of activity documents with item name, category, emissions, etc.
        """
        pipeline = [
            # Filter activities for this user
            {"$match": {"user_id": ObjectId(user_id)}},
            
            # Sort by date (most recent first)
            {"$sort": {"date": -1}},
            
            # Limit results
            {"$limit": limit},
            
            # Join with emission_factors collection
            {"$lookup": {
                "from": "emission_factors",
                "localField": "factor_id",
                "foreignField": "_id",
                "as": "factor_details"
            }},
            {"$unwind": "$factor_details"},  # Convert array to object
            
            # Join with categories collection
            {"$lookup": {
                "from": "categories",
                "localField": "factor_details.category_id",
                "foreignField": "_id",
                "as": "category_info"
            }},
            {"$unwind": "$category_info"},
            
            # Project (select) specific fields for response
            {"$project": {
                "_id": 1,
                "name": "$factor_details.item_name",  # e.g., "Beef", "Electricity"
                "category": "$category_info.name",  # e.g., "Food", "Energy"
                "quantity": 1,
                "monetary_amount": 1,
                "emissions": "$total_co2e",
                "date": 1,
                "unit": "$unit_used"
            }}
        ]
        return list(self.db.activities.aggregate(pipeline))
    
    def get_physical_emissions_summary(self, user_id):
        """
        Get physical emissions summary grouped by specific items.
        Excludes economic (USD-based) activities.
        
        Example output: [{"item_name": "Beef", "total_co2e_kg": 270.5}, ...]
        
        Args:
            user_id: User's ObjectId as string
        
        Returns:
            List of items with total CO2e emissions, sorted by highest emissions
        """
        pipeline = [
            # Filter: only this user's physical activities (not USD-based)
            {"$match": {
                "user_id": ObjectId(user_id),
                "unit_used": {"$not": {"$regex": "USD"}}  # Exclude economic activities
            }},
            
            # Join with emission_factors to get item names
            {"$lookup": {
                "from": "emission_factors",
                "localField": "factor_id",
                "foreignField": "_id",
                "as": "factor_details"
            }},
            {"$unwind": "$factor_details"},
            
            # Group by item name and sum emissions
            {"$group": {
                "_id": "$factor_details.item_name",  # Group by: Beef, Chicken, etc.
                "total_co2e_kg": {"$sum": "$total_co2e"}  # Sum all emissions for this item
            }},
            
            # Sort by highest emissions first
            {"$sort": {"total_co2e_kg": -1}},
            
            # Format output
            {"$project": {
                "_id": 0,
                "item_name": "$_id",
                "total_co2e_kg": {"$round": ["$total_co2e_kg", 2]}  # Round to 2 decimals
            }}
        ]
        return list(self.db.activities.aggregate(pipeline))

    def get_economic_impact_analysis(self, user_id):
        """
        Get economic impact analysis grouped by sector.
        Shows both spending and emissions for USD-based activities.
        
        Example output: [{"sector": "Electricity", "total_spending_usd": 150.0, "total_co2e_kg": 75.0}, ...]
        
        Args:
            user_id: User's ObjectId as string
        
        Returns:
            List of sectors with total spending and CO2e emissions
        """
        pipeline = [
            # Filter: only this user's economic activities (USD-based)
            {"$match": {
                "user_id": ObjectId(user_id),
                "unit_used": {"$regex": "USD"}  # Only economic activities
            }},
            
            # Join with emission_factors to get sector names
            {"$lookup": {
                "from": "emission_factors",
                "localField": "factor_id",
                "foreignField": "_id",
                "as": "factor_details"
            }},
            {"$unwind": "$factor_details"},
            
            # Group by sector and sum spending + emissions
            {"$group": {
                "_id": "$factor_details.item_name",  # Group by: Electricity, Transportation, etc.
                "total_spending_usd": {"$sum": "$monetary_amount"},  # Total money spent
                "total_co2e_kg": {"$sum": "$total_co2e"}  # Total emissions from spending
            }},
            
            # Sort by highest emissions
            {"$sort": {"total_co2e_kg": -1}},
            
            # Format output
            {"$project": {
                "_id": 0,
                "sector": "$_id",
                "total_spending_usd": {"$round": ["$total_spending_usd", 2]},
                "total_co2e_kg": {"$round": ["$total_co2e_kg", 2]}
            }}
        ]
        return list(self.db.activities.aggregate(pipeline))

    def get_summary_by_category(self, user_id):
        """
        Get emissions summary grouped by category (Transportation, Food, Energy, etc.).
        Includes both physical and economic activities.
        
        Example output: [{"category": "Food", "total_co2e_kg": 450.2}, ...]
        
        Args:
            user_id: User's ObjectId as string
        
        Returns:
            List of categories with total CO2e emissions
        """
        pipeline = [
            # Filter: all activities for this user
            {"$match": {"user_id": ObjectId(user_id)}},
            
            # Join with emission_factors
            {"$lookup": {
                "from": "emission_factors",
                "localField": "factor_id",
                "foreignField": "_id",
                "as": "factor_details"
            }},
            {"$unwind": "$factor_details"},
            
            # Join with categories to get category names
            {"$lookup": {
                "from": "categories",
                "localField": "factor_details.category_id",
                "foreignField": "_id",
                "as": "category_info"
            }},
            {"$unwind": "$category_info"},
            
            # Group by category and sum emissions
            {"$group": {
                "_id": "$category_info.name",  # Group by: Transportation, Food, etc.
                "total_co2e_kg": {"$sum": "$total_co2e"}
            }},
            
            # Sort by highest emissions
            {"$sort": {"total_co2e_kg": -1}},
            
            # Format output
            {"$project": {
                "_id": 0,
                "category": "$_id",
                "total_co2e_kg": {"$round": ["$total_co2e_kg", 2]}
            }}
        ]
        return list(self.db.activities.aggregate(pipeline))

    def get_biggest_impactors(self, user_id):
        """
        Identify the single biggest emission source for both physical and economic activities.
        
        Example output: {
            "biggest_physical": {"item_name": "Beef", "total_co2e_kg": 270.5},
            "biggest_economic": {"sector": "Electricity", "total_co2e_kg": 150.0}
        }
        
        Args:
            user_id: User's ObjectId as string
        
        Returns:
            Dictionary with biggest_physical and biggest_economic impactors
        """
        # Find biggest physical activity impactor
        physical_pipeline = [
            {"$match": {"user_id": ObjectId(user_id), "unit_used": {"$not": {"$regex": "USD"}}}},
            {"$lookup": {"from": "emission_factors", "localField": "factor_id", "foreignField": "_id", "as": "factor"}},
            {"$unwind": "$factor"},
            {"$group": {"_id": "$factor.item_name", "total_co2e_kg": {"$sum": "$total_co2e"}}},
            {"$sort": {"total_co2e_kg": -1}},  # Sort descending
            {"$limit": 1},  # Get only the top one
            {"$project": {"_id": 0, "item_name": "$_id", "total_co2e_kg": 1}}
        ]
        biggest_physical = list(self.db.activities.aggregate(physical_pipeline))

        # Find biggest economic activity impactor
        economic_pipeline = [
            {"$match": {"user_id": ObjectId(user_id), "unit_used": {"$regex": "USD"}}},
            {"$lookup": {"from": "emission_factors", "localField": "factor_id", "foreignField": "_id", "as": "factor"}},
            {"$unwind": "$factor"},
            {"$group": {"_id": "$factor.item_name", "total_co2e_kg": {"$sum": "$total_co2e"}}},
            {"$sort": {"total_co2e_kg": -1}},
            {"$limit": 1},
            {"$project": {"_id": 0, "sector": "$_id", "total_co2e_kg": 1}}
        ]
        biggest_economic = list(self.db.activities.aggregate(economic_pipeline))

        # Return both (or None if no activities exist)
        return {
            "biggest_physical": biggest_physical[0] if biggest_physical else None,
            "biggest_economic": biggest_economic[0] if biggest_economic else None
        }

    # ========================================================================
    # TIME-BASED ANALYTICS
    # ========================================================================
    
    def get_monthly_summary(self, user_id):
        """
        Get emissions summary aggregated by month.
        Useful for tracking long-term trends.
        
        Example output: [{"label": "2025-11", "emissions": 123.45}, ...]
        
        Args:
            user_id: User's ObjectId as string
        
        Returns:
            List of months with total CO2e emissions
        """
        pipeline = [
            {"$match": {"user_id": ObjectId(user_id)}},
            
            # Group by year and month
            {"$group": {
                "_id": {
                    "year": {"$year": "$date"},
                    "month": {"$month": "$date"}
                },
                "total_co2e_kg": {"$sum": "$total_co2e"}
            }},
            
            # Sort chronologically
            {"$sort": {"_id.year": 1, "_id.month": 1}},
            
            # Format output with readable labels
            {"$project": {
                "_id": 0,
                "label": {"$concat": [
                    {"$toString": "$_id.year"}, "-", 
                    {"$toString": "$_id.month"}
                ]},  # e.g., "2025-11"
                "emissions": {"$round": ["$total_co2e_kg", 2]}
            }}
        ]
        return list(self.db.activities.aggregate(pipeline))

    def get_weekly_summary(self, user_id):
        """
        Get emissions summary aggregated by week.
        
        Example output: [{"label": "Week 47, 2025", "emissions": 45.2}, ...]
        
        Args:
            user_id: User's ObjectId as string
        
        Returns:
            List of weeks with total CO2e emissions
        """
        pipeline = [
            {"$match": {"user_id": ObjectId(user_id)}},
            
            # Group by year and week number
            {"$group": {
                "_id": {
                    "year": {"$year": "$date"},
                    "week": {"$week": "$date"}  # Week of year (1-53)
                },
                "total_co2e_kg": {"$sum": "$total_co2e"}
            }},
            
            # Sort chronologically
            {"$sort": {"_id.year": 1, "_id.week": 1}},
            
            # Format output
            {"$project": {
                "_id": 0,
                "label": {"$concat": [
                    "Week ", {"$toString": "$_id.week"}, 
                    ", ", {"$toString": "$_id.year"}
                ]},  # e.g., "Week 47, 2025"
                "emissions": {"$round": ["$total_co2e_kg", 2]}
            }}
        ]
        return list(self.db.activities.aggregate(pipeline))

    def get_daily_summary(self, user_id):
        """
        Get emissions summary aggregated by day.
        Useful for detailed daily tracking.
        
        Example output: [{"label": "2025-11-24", "emissions": 12.3}, ...]
        
        Args:
            user_id: User's ObjectId as string
        
        Returns:
            List of days with total CO2e emissions
        """
        pipeline = [
            {"$match": {"user_id": ObjectId(user_id)}},
            
            # Group by year and day of year
            {"$group": {
                "_id": {
                    "year": {"$year": "$date"},
                    "day": {"$dayOfYear": "$date"}  # Day number (1-365)
                },
                "date": {"$first": "$date"},  # Keep original date for formatting
                "total_co2e_kg": {"$sum": "$total_co2e"}
            }},
            
            # Sort chronologically
            {"$sort": {"date": 1}},
            
            # Format output with ISO date strings
            {"$project": {
                "_id": 0,
                "label": {"$dateToString": {"format": "%Y-%m-%d", "date": "$date"}},  # e.g., "2025-11-24"
                "emissions": {"$round": ["$total_co2e_kg", 2]}
            }}
        ]
        return list(self.db.activities.aggregate(pipeline))