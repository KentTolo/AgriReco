from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
import joblib
import pandas as pd
from databases import Database
from typing import Optional
import uuid
from model2 import compare_crop_with_expert_advice
from supabase import create_client, Client
from datetime import datetime
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        user = supabase.auth.get_user(token)
        return user.user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )

SUPABASE_URL = "https://orrpihjleufxfbtpgfwr.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ycnBpaGpsZXVmeGZidHBnZndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5OTIxNjIsImV4cCI6MjA2MDU2ODE2Mn0.s7t-VwI7yFffkyEUL8dwGCTsXWEe8gKz4njpGQl5ZjI"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

DATABASE_URL = "postgresql://postgres:agroai@Nul0._@db.orrpihjleufxfbtpgfwr.supabase.co:5432/postgres"
database = Database(DATABASE_URL)

# Load ML model
model = joblib.load("crop_recommendation_model.pkl")

# Database configuration
# In your FastAPI app
DATABASE_URL = "postgresql://agroai_user:SecurePass123!@localhost:5432/agroai_db"
database = Database(DATABASE_URL)

# Security setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Define FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class CropRecommendationRequest(BaseModel):
    N: int
    P: int
    K: int
    temperature: float
    humidity: float
    ph: float
    rainfall: float

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None

class UserInDB(UserCreate):
    user_id: uuid.UUID
    password_hash: str

class LoginRequest(BaseModel):
    email: str
    password: str
    
class CropComparisonRequest(BaseModel):
    desired_crop: str
    N: int
    P: int
    K: int
    temperature: float
    humidity: float
    ph: float
    rainfall: float    

# Database connection events
@app.on_event("startup")
async def startup():
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

# Authentication functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

async def get_user(email: str):
    query = "SELECT * FROM users WHERE email = :email"
    return await database.fetch_one(query=query, values={"email": email})

async def authenticate_user(email: str, password: str):
    user = await get_user(email)
    if not user or not verify_password(password, user.password_hash):
        return False
    return user

# Routes
@app.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": form_data.username,
            "password": form_data.password
        })
        return {
            "access_token": response.session.access_token,
            "token_type": "bearer"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
@app.get("/")
async def read_root():
    return {"message": "Welcome to the Crop Recommendation API"}

# Recommendation endpoint
@app.post("/recommend")
async def recommend_crop(
    request: CropRecommendationRequest,
    user=Depends(get_current_user)
):
    input_data = pd.DataFrame([{
        "N": request.N,
        "P": request.P,
        "K": request.K,
        "temperature": request.temperature,
        "humidity": request.humidity,
        "ph": request.ph,
        "rainfall": request.rainfall,
    }])
    try:
        prediction = model.predict(input_data)
        return {"recommended_crop": prediction[0]}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )

@app.post("/register")
async def register(user: UserCreate):
    try:
        response = supabase.auth.sign_up({
            "email": user.email,
            "password": user.password,
            "options": {
                "data": {
                    "full_name": user.full_name
                }
            }
        })
        # Insert user data into the users table
        await database.execute(
            query="""
                INSERT INTO users (user_id, email, full_name, created_at)
                VALUES (:user_id, :email, :full_name, :created_at)
            """,
            values={
                "user_id": response.user.id,
                "email": user.email,
                "full_name": user.full_name,
                "created_at": datetime.utcnow()
            }
        )
        return {"message": "User created successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
@app.on_event("startup")
async def startup():
    try:
        await database.connect()
        # Verify connection
        version = await database.fetch_val("SELECT version()")
        print(f"Connected to PostgreSQL: {version}")
    except Exception as e:
        print(f"Database connection failed: {str(e)}")
        raise

@app.get("/users/me")
async def read_users_me(user=Depends(get_current_user)):
    query = "SELECT user_id, email, full_name, created_at FROM users WHERE user_id = :user_id"
    db_user = await database.fetch_one(query=query, values={"user_id": user.id})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "email": db_user["email"],
        "full_name": db_user["full_name"],
        "created_at": db_user["created_at"]
    } 
    
@app.get("/users/me")
async def read_current_user(user_id: str = Depends(oauth2_scheme)):
    query = "SELECT user_id, email, full_name, created_at FROM users WHERE user_id = :user_id"
    user = await database.fetch_one(query=query, values={"user_id": user_id})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    return {
        "email": user["email"],
        "full_name": user["full_name"],
        "created_at": user["created_at"]
    }    

# Add these imports at the top
from model2 import compare_crop_with_expert_advice

# Add this endpoint
class CropComparisonRequest(BaseModel):
    desired_crop: str
    N: int
    P: int
    K: int
    temperature: float
    humidity: float
    ph: float
    rainfall: float

@app.post("/compare_crop")
async def compare_crop(
    request: CropComparisonRequest,
    user_id: str = Depends(oauth2_scheme)
):
    try:
        # Map fields to match model2.py expectations
        ui_readings = {
            'temperature': request.temperature,
            'soil_ph': request.ph,
            'rainfall': request.rainfall,
            'humidity': request.humidity,
            'nitrogen': request.N,
            'phosphorus': request.P,
            'potassium': request.K
        }
        
        # Get expert analysis
        analysis = compare_crop_with_expert_advice(
            request.desired_crop,
            ui_readings
        )
        
        # Calculate compatibility score
        score = 100 - (analysis.count("⚠️") * 15)
        score = max(10, min(100, score))
        
        return {
            "compatibility_score": score,
            "feedback": analysis,
            "recommended_crop": request.desired_crop
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )    