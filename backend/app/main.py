# ============================================================================
# IMPORTS
# ============================================================================
# FastAPI framework for building the REST API
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Internal modules for database operations and data models
from .data_service import DatabaseService
from .models import ActivityCreate, ActivityResponse, UserCreate, UserSignUp, UserSignIn, UserResponse, EmissionSummary, EconomicImpact,ActivityUpdate

# MongoDB ObjectId handling and JSON serialization
from bson import ObjectId
import json


# ============================================================================
# APPLICATION SETUP
# ============================================================================
# Initialize FastAPI application with metadata
app = FastAPI(title="Sustainability Tracker API", version="1.0.0")

# Configure CORS middleware to allow cross-origin requests from frontend
# In production, replace "*" with specific frontend domain for security
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (adjust for production)
    allow_credentials=True,  # Allow cookies and authentication headers
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allow all headers
)

# Initialize database service for MongoDB operations
db_service = DatabaseService()

# ============================================================================
# UTILITY CLASSES
# ============================================================================
class JSONEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle MongoDB ObjectId serialization."""
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)  # Convert ObjectId to string for JSON compatibility
        return super().default(obj)

# ============================================================================
# HEALTH CHECK ENDPOINT
# ============================================================================
@app.get("/")
async def root():
    """Health check endpoint to verify API is running."""
    return {"message": "Sustainability Tracker API", "status": "healthy"}

# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================
@app.post("/auth/signup")
async def sign_up(user: UserSignUp):
    """
    Register a new user with email and password.
    
    Args:
        user: UserSignUp model containing username, email, and password
    
    Returns:
        User object with ID, username, email, and creation timestamp
    
    Raises:
        400: If email already exists or validation fails
        500: For internal server errors
    """
    try:
        # Create user with hashed password
        user_id = db_service.create_user_with_password(user)
        user_obj = db_service.get_user(user_id)
        
        # Return user data (password hash excluded)
        return {
            "_id": str(user_obj["_id"]),
            "user_id": str(user_obj["_id"]),
            "username": user_obj["username"],
            "email": user_obj["email"],
            "created_at": user_obj["created_at"]
        }
    except ValueError as e:
        # Handle validation errors (duplicate email, etc.)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/auth/signin")
async def sign_in(credentials: UserSignIn):
    """
    Authenticate user with email and password.
    
    Args:
        credentials: UserSignIn model with email and password
    
    Returns:
        User object if authentication successful
    
    Raises:
        401: If credentials are invalid
        500: For internal server errors
    """
    try:
        # Verify password and return user data
        user = db_service.authenticate_user(credentials.email, credentials.password)
        return {
            "_id": str(user["_id"]),
            "user_id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"],
            "created_at": user["created_at"]
        }
    except ValueError as e:
        # Invalid credentials
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

# ============================================================================
# EMISSION FACTORS & CATEGORIES ENDPOINTS
# ============================================================================
@app.get("/categories")
async def get_categories():
    """
    Retrieve all emission categories (e.g., Transportation, Food, Energy).
    
    Returns:
        List of category objects with IDs and names
    """
    categories = db_service.get_categories()
    # Convert MongoDB ObjectIds to strings for JSON serialization
    for cat in categories:
        cat["_id"] = str(cat["_id"])
    return categories

@app.get("/emission-factors")
async def get_emission_factors(category: str = None, search: str = None):
    """
    Get emission factors with optional filtering by category or search term.
    
    Args:
        category: Optional category name to filter by
        search: Optional search term for text search
    
    Returns:
        List of emission factors with CO2e values per unit
    """
    factors = db_service.get_emission_factors(category, search)
    # Convert ObjectIds to strings for JSON compatibility
    for factor in factors:
        factor["_id"] = str(factor["_id"])
        factor["category_id"] = str(factor["category_id"])
    return factors

# ============================================================================
# ACTIVITY CRUD ENDPOINTS
# ============================================================================
@app.post("/users/{user_id}/activities")
async def create_activity(user_id: str, activity: ActivityCreate):
    """
    Create a new carbon emission activity for a user.
    Automatically calculates CO2e based on quantity/monetary amount and emission factor.
    
    Args:
        user_id: User's unique identifier
        activity: Activity data (factor_id, quantity, monetary_amount, date)
    
    Returns:
        Created activity with calculated total_co2e
    
    Raises:
        400: If validation fails or emission factor not found
        500: For internal server errors
    """
    try:
        result = db_service.create_activity(user_id, activity)
        # Convert ObjectIds to strings for JSON response
        result["_id"] = str(result["_id"])
        result["user_id"] = str(result["user_id"])
        result["factor_id"] = str(result["factor_id"])
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/users/{user_id}/activities")
async def get_user_activities(user_id: str, limit: int = 50):
    """
    Retrieve all activities for a specific user with enriched data.
    
    Args:
        user_id: User's unique identifier
        limit: Maximum number of activities to return (default: 50)
    
    Returns:
        List of activities with emission factor and category details
    """
    activities = db_service.get_user_activities(user_id, limit)
    # Convert ObjectIds to strings
    for activity in activities:
        activity["_id"] = str(activity["_id"])
    return activities

@app.put("/users/{user_id}/activities/{activity_id}")
async def update_user_activity(user_id: str, activity_id: str, update_data: ActivityUpdate):
    """
    Update an existing activity and recalculate emissions.
    
    Args:
        user_id: User's unique identifier
        activity_id: Activity's unique identifier
        update_data: Fields to update (factor_id, quantity, monetary_amount, date)
    
    Returns:
        Updated activity with recalculated total_co2e
    
    Raises:
        404: If activity not found or user unauthorized
        500: For internal server errors
    """
    try:
        updated_activity = db_service.update_activity(user_id, activity_id, update_data)
        # Convert ObjectIds to strings for JSON response
        updated_activity["_id"] = str(updated_activity["_id"])
        updated_activity["user_id"] = str(updated_activity["user_id"])
        updated_activity["factor_id"] = str(updated_activity["factor_id"])
        
        return updated_activity
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@app.delete("/users/{user_id}/activities/{activity_id}")
async def delete_user_activity(user_id: str, activity_id: str):
    """
    Delete a specific activity.
    
    Args:
        user_id: User's unique identifier
        activity_id: Activity's unique identifier
    
    Returns:
        Success message
    
    Raises:
        404: If activity not found or user unauthorized
        500: For internal server errors
    """
    try:
        result = db_service.delete_activity(user_id, activity_id)
        return result 
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

# ============================================================================
# ANALYTICS & SUMMARY ENDPOINTS
# ============================================================================
@app.get("/users/{user_id}/summary/physical")
async def get_physical_summary(user_id: str):
    """
    Get physical emissions summary grouped by specific items.
    Excludes economic activities (USD-based).
    
    Args:
        user_id: User's unique identifier
    
    Returns:
        List of items with total CO2e emissions (e.g., Beef: 45.2 kg CO2e)
    """
    results = db_service.get_physical_emissions_summary(user_id)
    return results

@app.get("/users/{user_id}/summary/economic")
async def get_economic_summary(user_id: str):
    """
    Get economic impact analysis grouped by sector.
    Shows spending and emissions for USD-based activities.
    
    Args:
        user_id: User's unique identifier
    
    Returns:
        List of sectors with total spending and CO2e emissions
    """
    results = db_service.get_economic_impact_analysis(user_id)
    return results

@app.get("/users/{user_id}/summary/by-category")
async def get_summary_by_category_route(user_id: str):
    """
    Get emissions summary grouped by category (Transportation, Food, Energy, etc.).
    Includes both physical and economic activities.
    
    Args:
        user_id: User's unique identifier
    
    Returns:
        List of categories with total CO2e emissions
    """
    results = db_service.get_summary_by_category(user_id)
    return results

@app.get("/users/{user_id}/summary/biggest-impactors")
async def get_biggest_impactors_route(user_id: str):
    """
    Identify the single biggest emission source for physical and economic activities.
    
    Args:
        user_id: User's unique identifier
    
    Returns:
        Object with biggest_physical and biggest_economic impactors
    """
    results = db_service.get_biggest_impactors(user_id)
    return results


# ============================================================================
# USER MANAGEMENT ENDPOINTS
# ============================================================================
@app.post("/users")
async def create_user(user: UserCreate):
    """
    Create a new user (username-only, for backward compatibility).
    For new implementations, use /auth/signup instead.
    
    Args:
        user: UserCreate model with username (and optional email)
    
    Returns:
        User object with ID and creation timestamp
    """
    user_id = db_service.create_user(user)
    user_obj = db_service.get_user(user_id)
    return {
        "_id": str(user_obj["_id"]),
        "user_id": str(user_obj["_id"]),
        "username": user_obj["username"],
        "email": user_obj.get("email"),
        "created_at": user_obj["created_at"]
    }

@app.get("/users/{user_id}")
async def get_user(user_id: str):
    """
    Retrieve user information by ID.
    
    Args:
        user_id: User's unique identifier
    
    Returns:
        User object (password hash excluded)
    
    Raises:
        404: If user not found
    """
    user = db_service.get_user(user_id)
    if user:
        user["_id"] = str(user["_id"])
        return user
    raise HTTPException(status_code=404, detail="User not found")

# ============================================================================
# TIME-BASED ANALYTICS ENDPOINTS
# ============================================================================
@app.get("/users/{user_id}/summary/monthly")
async def get_monthly_summary_route(user_id: str):
    """
    Get emissions summary aggregated by month.
    Useful for tracking long-term trends.
    
    Args:
        user_id: User's unique identifier
    
    Returns:
        List of months with total CO2e emissions (e.g., "2025-11": 123.45 kg)
    """
    results = db_service.get_monthly_summary(user_id)
    return results

@app.get("/users/{user_id}/summary/weekly")
async def get_weekly_summary_route(user_id: str):
    """
    Get emissions summary aggregated by week.
    
    Args:
        user_id: User's unique identifier
    
    Returns:
        List of weeks with total CO2e emissions (e.g., "Week 47, 2025": 45.2 kg)
    """
    results = db_service.get_weekly_summary(user_id)
    return results

@app.get("/users/{user_id}/summary/daily")
async def get_daily_summary_route(user_id: str):
    """
    Get emissions summary aggregated by day.
    Useful for detailed daily tracking.
    
    Args:
        user_id: User's unique identifier
    
    Returns:
        List of days with total CO2e emissions (e.g., "2025-11-24": 12.3 kg)
    """
    results = db_service.get_daily_summary(user_id)
    return results

# ============================================================================
# APPLICATION ENTRY POINT
# ============================================================================
if __name__ == "__main__":
    # Run the application with Uvicorn ASGI server
    # Host 0.0.0.0 allows external connections (use 127.0.0.1 for local-only)
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)