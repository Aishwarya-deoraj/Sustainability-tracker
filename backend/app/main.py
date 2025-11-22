from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .data_service import DatabaseService
from models import ActivityCreate, ActivityResponse, UserCreate, UserSignUp, UserSignIn, UserResponse, EmissionSummary, EconomicImpact,ActivityUpdate
from bson import ObjectId
import json

app = FastAPI(title="Sustainability Tracker API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db_service = DatabaseService()

class JSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        return super().default(obj)

@app.get("/")
async def root():
    return {"message": "Sustainability Tracker API", "status": "healthy"}

# NEW AUTHENTICATION ENDPOINTS
@app.post("/auth/signup")
async def sign_up(user: UserSignUp):
    """Create a new user with email and password"""
    try:
        user_id = db_service.create_user_with_password(user)
        user_obj = db_service.get_user(user_id)
        return {
            "_id": str(user_obj["_id"]),
            "user_id": str(user_obj["_id"]),
            "username": user_obj["username"],
            "email": user_obj["email"],
            "created_at": user_obj["created_at"]
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/auth/signin")
async def sign_in(credentials: UserSignIn):
    """Sign in with email and password"""
    try:
        user = db_service.authenticate_user(credentials.email, credentials.password)
        return {
            "_id": str(user["_id"]),
            "user_id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"],
            "created_at": user["created_at"]
        }
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

# KEEP YOUR EXISTING ENDPOINTS (they should work as before)
@app.get("/categories")
async def get_categories():
    """Get all categories"""
    categories = db_service.get_categories()
    for cat in categories:
        cat["_id"] = str(cat["_id"])
    return categories

@app.get("/emission-factors")
async def get_emission_factors(category: str = None, search: str = None):
    """Get emission factors with optional filtering"""
    factors = db_service.get_emission_factors(category, search)
    for factor in factors:
        factor["_id"] = str(factor["_id"])
        factor["category_id"] = str(factor["category_id"])
    return factors

@app.post("/users/{user_id}/activities")
async def create_activity(user_id: str, activity: ActivityCreate):
    """Create a new activity for a user"""
    try:
        result = db_service.create_activity(user_id, activity)
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
    """Get activities for a specific user"""
    activities = db_service.get_user_activities(user_id, limit)
    for activity in activities:
        activity["_id"] = str(activity["_id"])
    return activities

@app.put("/users/{user_id}/activities/{activity_id}")
async def update_user_activity(user_id: str, activity_id: str, update_data: ActivityUpdate):
    """Update an existing activity"""
    try:
        updated_activity = db_service.update_activity(user_id, activity_id, update_data)
        
        # Convert ObjectIds to strings for the JSON response
        updated_activity["_id"] = str(updated_activity["_id"])
        updated_activity["user_id"] = str(updated_activity["user_id"])
        updated_activity["factor_id"] = str(updated_activity["factor_id"])
        
        return updated_activity
    except ValueError as e:
        # Use 404 if the activity isn't found
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@app.delete("/users/{user_id}/activities/{activity_id}")
async def delete_user_activity(user_id: str, activity_id: str):
    """Delete an activity"""
    try:
        result = db_service.delete_activity(user_id, activity_id)
        return result  # This will return {"message": "Activity deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

# ... (your other imports and app setup) ...

# 1. MODIFIED ROUTE
@app.get("/users/{user_id}/summary/physical")
async def get_physical_summary(user_id: str):
    """Get physical emissions summary (Query 1) - NOW BY ITEM"""
    results = db_service.get_physical_emissions_summary(user_id)
    return results

# This route is ALREADY CORRECT
@app.get("/users/{user_id}/summary/economic")
async def get_economic_summary(user_id: str):
    """Get economic impact analysis (Query 2)"""
    results = db_service.get_economic_impact_analysis(user_id)
    return results

# --- 2. NEW ROUTES (Add these) ---

@app.get("/users/{user_id}/summary/by-category")
async def get_summary_by_category_route(user_id: str):
    """Get summary by category (Query 3)"""
    results = db_service.get_summary_by_category(user_id)
    return results

@app.get("/users/{user_id}/summary/biggest-impactors")
async def get_biggest_impactors_route(user_id: str):
    """Get biggest impactors (Query 4)"""
    results = db_service.get_biggest_impactors(user_id)
    return results


@app.post("/users")
async def create_user(user: UserCreate):
    """Create a new user (username-only, for backward compatibility)"""
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
    """Get user information"""
    user = db_service.get_user(user_id)
    if user:
        user["_id"] = str(user["_id"])
        return user
    raise HTTPException(status_code=404, detail="User not found")

# --- ADD THESE 3 ROUTES to main.py ---

@app.get("/users/{user_id}/summary/monthly")
async def get_monthly_summary_route(user_id: str):
    """Get monthly emissions summary"""
    results = db_service.get_monthly_summary(user_id)
    return results

@app.get("/users/{user_id}/summary/weekly")
async def get_weekly_summary_route(user_id: str):
    """Get weekly emissions summary"""
    results = db_service.get_weekly_summary(user_id)
    return results

@app.get("/users/{user_id}/summary/daily")
async def get_daily_summary_route(user_id: str):
    """Get daily emissions summary"""
    results = db_service.get_daily_summary(user_id)
    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)