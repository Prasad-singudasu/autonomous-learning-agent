from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.schemas.auth import UserCreate, UserLogin, Token, UserResponse
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    user = auth_service.register(db, user_data)
    return auth_service.login(db, user_data.email, user_data.password)


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    return auth_service.login(db, credentials.email, credentials.password)


@router.get("/me", response_model=UserResponse)
def get_me(db: Session = Depends(get_db), current_user=Depends(__import__("app.utils.dependencies", fromlist=["get_current_user"]).get_current_user)):
    return current_user
