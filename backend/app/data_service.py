import os
import certifi
from pymongo import MongoClient
from dotenv import load_dotenv
from bson.objectid import ObjectId
from datetime import datetime 
import bcrypt

load_dotenv()

class DatabaseService:
    def __init__(self):
        # Initializes the MongoDB client and selects the database
        self.client = MongoClient(
            os.getenv("MONGODB_URI"),
            tlsCAFile=certifi.where()
        )
        self.db = self.client.sustainability_tracker
    
    # USER AUTHENTICATION & MANAGEMENT
    
    def hash_password(self, password: str) -> str:
        """Hash a password using bcrypt"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    
    def create_user_with_password(self, user_data):
        """Create a new user with email and password"""
        # Check if user already exists with this email
        existing_user = self.db.users.find_one({"email": user_data.email})
        if existing_user:
            raise ValueError("User with this email already exists")
        
        # Check if username is taken
        existing_username = self.db.users.find_one({"username": user_data.username})
        if existing_username:
            raise ValueError("Username already taken")
        
        user_doc = {
            "username": user_data.username,
            "email": user_data.email,
            "password_hash": self.hash_password(user_data.password),
            "created_at": datetime.now(),
            "last_login": datetime.now()
        }
        
        result = self.db.users.insert_one(user_doc)
        return str(result.inserted_id)
    
    def authenticate_user(self, email: str, password: str):
        """Authenticate user with email and password"""
        user = self.db.users.find_one({"email": email})
        if not user:
            raise ValueError("User not found")
        
        if not self.verify_password(password, user["password_hash"]):
            raise ValueError("Invalid password")
        
        # Update last login
        self.db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login": datetime.now()}}
        )
        
        return user
    
    def create_user(self, user_data):
        """Create a new user (for username-only login)"""
        # Check if username already exists
        existing_user = self.db.users.find_one({"username": user_data.username})
        if existing_user:
            # Return existing user
            return str(existing_user["_id"])
        
        user_doc = {
            "username": user_data.username,
            "email": user_data.email,
            "created_at": datetime.now(),
            "last_login": datetime.now()
        }
        
        result = self.db.users.insert_one(user_doc)
        return str(result.inserted_id)

    # USER GETTERS

    def get_user_by_email(self, email: str):
        """Get user by email"""
        return self.db.users.find_one({"email": email})
    
    def get_user_by_username(self, username: str):
        """Get user by username"""
        return self.db.users.find_one({"username": username})

    def get_user(self, user_id):
        """Get user by ID"""
        return self.db.users.find_one({"_id": ObjectId(user_id)})

    # FACTORS AND CATEGORIES
    
    def get_emission_factors(self, category_name=None, search_term=None):
        """Get emission factors with optional filtering"""
        query = {}
        if category_name:
            category = self.db.categories.find_one({"name": category_name})
            if category:
                query["category_id"] = category["_id"]
        
        if search_term:
            query["$text"] = {"$search": search_term}
        
        return list(self.db.emission_factors.find(query))
    
    def get_categories(self):
        """Get all categories"""
        return list(self.db.categories.find({}))
    
    # ACTIVITY CRUD
    
    def create_activity(self, user_id, activity_data):
        """Create a new activity with hybrid calculation logic"""
        # Get the emission factor
        factor = self.db.emission_factors.find_one({"_id": ObjectId(activity_data.factor_id)})
        if not factor:
            raise ValueError("Emission factor not found")
        
        # Hybrid calculation logic
        if "USD" in factor.get("unit", ""):
            # Economic activity - use monetary amount
            if activity_data.monetary_amount <= 0:
                raise ValueError("Monetary amount must be positive for economic activities")
            total_co2e = activity_data.monetary_amount * factor["co2e_per_unit"]
            quantity = 1  # Economic activities typically have quantity 1
        else:
            # Physical activity - use quantity
            total_co2e = activity_data.quantity * factor["co2e_per_unit"]
        
        activity_doc = {
            "user_id": ObjectId(user_id),
            "factor_id": ObjectId(activity_data.factor_id),
            "quantity": activity_data.quantity,
            "monetary_amount": activity_data.monetary_amount,
            "total_co2e": total_co2e,
            "date": activity_data.date,
            "unit_used": factor["unit"]
        }
        
        result = self.db.activities.insert_one(activity_doc)
        activity_doc["_id"] = result.inserted_id
        return activity_doc

    def update_activity(self, user_id, activity_id, update_data):
        """Update an existing activity and recalculate emissions"""
        
        # 1. Find the original activity to ensure it exists and belongs to the user
        original_activity = self.db.activities.find_one({
            "_id": ObjectId(activity_id),
            "user_id": ObjectId(user_id)
        })
        if not original_activity:
            raise ValueError("Activity not found or user unauthorized")

        # 2. Prepare the update document
        update_doc = {}
        
        # 3. Check if factor, quantity, or monetary amount changed (as they trigger recalculation)
        factor_id = update_data.factor_id if hasattr(update_data, 'factor_id') and update_data.factor_id else str(original_activity["factor_id"])
        quantity = update_data.quantity if hasattr(update_data, 'quantity') and update_data.quantity is not None else original_activity["quantity"]
        monetary_amount = update_data.monetary_amount if hasattr(update_data, 'monetary_amount') and update_data.monetary_amount is not None else original_activity["monetary_amount"]

        # Get the *new* or *old* emission factor
        factor = self.db.emission_factors.find_one({"_id": ObjectId(factor_id)})
        if not factor:
            raise ValueError("Emission factor not found")

        # 4. Recalculate CO2e
        if "USD" in factor.get("unit", ""):
            if monetary_amount <= 0:
                raise ValueError("Monetary amount must be positive for economic activities")
            total_co2e = monetary_amount * factor["co2e_per_unit"]
        else:
            total_co2e = quantity * factor["co2e_per_unit"]
            
        update_doc["factor_id"] = ObjectId(factor_id)
        update_doc["quantity"] = quantity
        update_doc["monetary_amount"] = monetary_amount
        update_doc["total_co2e"] = total_co2e
        update_doc["unit_used"] = factor["unit"]

        # 5. Add any other fields that were updated (like date)
        if hasattr(update_data, 'date') and update_data.date:
            update_doc["date"] = update_data.date
            
        # 6. Perform the update
        result = self.db.activities.update_one(
            {"_id": ObjectId(activity_id)},
            {"$set": update_doc}
        )

        if result.matched_count == 0:
            raise ValueError("Activity not found")
        
        # 7. Return the updated document
        updated_activity = self.db.activities.find_one({"_id": ObjectId(activity_id)})
        return updated_activity


    def delete_activity(self, user_id, activity_id):
        """Delete an activity"""
        result = self.db.activities.delete_one({
            "_id": ObjectId(activity_id),
            "user_id": ObjectId(user_id)
        })
        
        if result.deleted_count == 0:
            raise ValueError("Activity not found or user unauthorized")
        
        return {"message": "Activity deleted successfully"}

    # DASHBOARD AND REPORTS
    
    def get_user_activities(self, user_id, limit=50):
        """Get activities for a specific user"""
        pipeline = [
            {"$match": {"user_id": ObjectId(user_id)}},
            {"$sort": {"date": -1}},
            {"$limit": limit},
            {"$lookup": {
                "from": "emission_factors",
                "localField": "factor_id",
                "foreignField": "_id",
                "as": "factor_details"
            }},
            {"$unwind": "$factor_details"},
            {"$lookup": {
                "from": "categories",
                "localField": "factor_details.category_id",
                "foreignField": "_id",
                "as": "category_info"
            }},
            {"$unwind": "$category_info"},
            {"$project": {
                "_id": 1,
                "name": "$factor_details.item_name",
                "category": "$category_info.name",
                "quantity": 1,
                "monetary_amount": 1,
                "emissions": "$total_co2e",
                "date": 1,
                "unit": "$unit_used"
            }}
        ]
        return list(self.db.activities.aggregate(pipeline))
    
    def get_physical_emissions_summary(self, user_id):
        """Physical Activity Tracking (Detailed by item)"""
        pipeline = [
            {"$match": {
                "user_id": ObjectId(user_id),
                "unit_used": {"$not": {"$regex": "USD"}}
            }},
            {"$lookup": {
                "from": "emission_factors",
                "localField": "factor_id",
                "foreignField": "_id",
                "as": "factor_details"
            }},
            {"$unwind": "$factor_details"},
            {"$group": {
                "_id": "$factor_details.item_name",
                "total_co2e_kg": {"$sum": "$total_co2e"}
            }},
            {"$sort": {"total_co2e_kg": -1}},
            {"$project": {
                "_id": 0,
                "item_name": "$_id",
                "total_co2e_kg": {"$round": ["$total_co2e_kg", 2]}
            }}
        ]
        return list(self.db.activities.aggregate(pipeline))

    def get_economic_impact_analysis(self, user_id):
        """Economic Impact Analysis"""
        pipeline = [
            {"$match": {
                "user_id": ObjectId(user_id),
                "unit_used": {"$regex": "USD"}
            }},
            {"$lookup": {
                "from": "emission_factors",
                "localField": "factor_id",
                "foreignField": "_id",
                "as": "factor_details"
            }},
            {"$unwind": "$factor_details"},
            {"$group": {
                "_id": "$factor_details.item_name",
                "total_spending_usd": {"$sum": "$monetary_amount"},
                "total_co2e_kg": {"$sum": "$total_co2e"}
            }},
            {"$sort": {"total_co2e_kg": -1}},
            {"$project": {
                "_id": 0,
                "sector": "$_id",
                "total_spending_usd": {"$round": ["$total_spending_usd", 2]},
                "total_co2e_kg": {"$round": ["$total_co2e_kg", 2]}
            }}
        ]
        return list(self.db.activities.aggregate(pipeline))

    def get_summary_by_category(self, user_id):
        """Summary by Category (Physical & Economic)"""
        pipeline = [
            {"$match": {"user_id": ObjectId(user_id)}},
            {"$lookup": {
                "from": "emission_factors",
                "localField": "factor_id",
                "foreignField": "_id",
                "as": "factor_details"
            }},
            {"$unwind": "$factor_details"},
            {"$lookup": {
                "from": "categories",
                "localField": "factor_details.category_id",
                "foreignField": "_id",
                "as": "category_info"
            }},
            {"$unwind": "$category_info"},
            {"$group": {
                "_id": "$category_info.name",
                "total_co2e_kg": {"$sum": "$total_co2e"}
            }},
            {"$sort": {"total_co2e_kg": -1}},
            {"$project": {
                "_id": 0,
                "category": "$_id",
                "total_co2e_kg": {"$round": ["$total_co2e_kg", 2]}
            }}
        ]
        return list(self.db.activities.aggregate(pipeline))

    def get_biggest_impactors(self, user_id):
        """Biggest Impactors (Physical & Economic)"""
        # Physical
        physical_pipeline = [
            {"$match": {"user_id": ObjectId(user_id), "unit_used": {"$not": {"$regex": "USD"}}}},
            {"$lookup": {"from": "emission_factors", "localField": "factor_id", "foreignField": "_id", "as": "factor"}},
            {"$unwind": "$factor"},
            {"$group": {"_id": "$factor.item_name", "total_co2e_kg": {"$sum": "$total_co2e"}}},
            {"$sort": {"total_co2e_kg": -1}},
            {"$limit": 1},
            {"$project": {"_id": 0, "item_name": "$_id", "total_co2e_kg": 1}}
        ]
        biggest_physical = list(self.db.activities.aggregate(physical_pipeline))

        # Economic
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

        return {
            "biggest_physical": biggest_physical[0] if biggest_physical else None,
            "biggest_economic": biggest_economic[0] if biggest_economic else None
        }

    def get_monthly_summary(self, user_id):
        """Monthly Emissions Summary"""
        pipeline = [
            {"$match": {"user_id": ObjectId(user_id)}},
            {"$group": {
                "_id": {
                    "year": {"$year": "$date"},
                    "month": {"$month": "$date"}
                },
                "total_co2e_kg": {"$sum": "$total_co2e"}
            }},
            {"$sort": {"_id.year": 1, "_id.month": 1}},
            {"$project": {
                "_id": 0,
                "label": {"$concat": [
                    {"$toString": "$_id.year"}, "-", 
                    {"$toString": "$_id.month"}
                ]},
                "emissions": {"$round": ["$total_co2e_kg", 2]}
            }}
        ]
        return list(self.db.activities.aggregate(pipeline))

    def get_weekly_summary(self, user_id):
        """Weekly Emissions Summary"""
        pipeline = [
            {"$match": {"user_id": ObjectId(user_id)}},
            {"$group": {
                "_id": {
                    "year": {"$year": "$date"},
                    "week": {"$week": "$date"}
                },
                "total_co2e_kg": {"$sum": "$total_co2e"}
            }},
            {"$sort": {"_id.year": 1, "_id.week": 1}},
            {"$project": {
                "_id": 0,
                "label": {"$concat": [
                    "Week ", {"$toString": "$_id.week"}, 
                    ", ", {"$toString": "$_id.year"}
                ]},
                "emissions": {"$round": ["$total_co2e_kg", 2]}
            }}
        ]
        return list(self.db.activities.aggregate(pipeline))

    def get_daily_summary(self, user_id):
        """Daily Emissions Summary"""
        pipeline = [
            {"$match": {"user_id": ObjectId(user_id)}},
            {"$group": {
                "_id": {
                    "year": {"$year": "$date"},
                    "day": {"$dayOfYear": "$date"}
                },
                "date": {"$first": "$date"},
                "total_co2e_kg": {"$sum": "$total_co2e"}
            }},
            {"$sort": {"date": 1}},
            {"$project": {
                "_id": 0,
                "label": {"$dateToString": {"format": "%Y-%m-%d", "date": "$date"}},
                "emissions": {"$round": ["$total_co2e_kg", 2]}
            }}
        ]
        return list(self.db.activities.aggregate(pipeline))