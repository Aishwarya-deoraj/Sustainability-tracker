from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    """
    Custom type used to handle BSON ObjectId fields in Pydantic models.
    It ensures validation and correct schema modification for FastAPI/Swagger.
    """
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

# ACTIVITY MODELS

class ActivityCreate(BaseModel):
    """Schema for creating a new carbon activity."""
    factor_id: str
    quantity: float = Field(..., gt=0)
    monetary_amount: float = Field(default=0, ge=0)
    date: datetime = Field(default_factory=datetime.now)

class ActivityResponse(BaseModel):
    """Schema for returning a created or retrieved activity."""
    id: str
    user_id: str
    factor_id: str
    quantity: float
    monetary_amount: float
    total_co2e: float
    date: datetime
    unit_used: str

class ActivityUpdate(BaseModel):
    """Schema for updating an existing activity."""
    factor_id: Optional[str] = None
    quantity: Optional[float] = Field(None, gt=0)
    monetary_amount: Optional[float] = Field(None, ge=0)
    date: Optional[datetime] = None


# DASHBOARD/REPORT MODELS

class EmissionSummary(BaseModel):
    """Schema for returning total emissions grouped by category."""
    category: str
    total_co2e_kg: float

class EconomicImpact(BaseModel):
    """Schema for returning emissions and spending grouped by economic sector."""
    sector: str
    total_spending_usd: float
    total_co2e_kg: float

# USER AUTHENTICATION & DATA MODELS

class UserCreate(BaseModel):
    """Schema for creating a user without a password"""
    username: str
    email: Optional[str] = None

class UserSignUp(BaseModel):
    """Schema for user registration, requiring email and password."""
    username: str
    email: EmailStr
    password: str

class UserSignIn(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    """Schema for returning user data (excluding password hash)."""
    _id: str
    user_id: str
    username: str
    email: Optional[str] = None
    created_at: datetime