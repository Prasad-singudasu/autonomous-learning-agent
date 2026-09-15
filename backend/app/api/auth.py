from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.utils.dependencies import get_current_user
from app.schemas.auth import UserCreate, UserLogin, Token, UserResponse
from app.services.auth_service import auth_service
from app.config import settings
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Authentication"])


class GoogleToken(BaseModel):
    credential: str


@router.post("/register", response_model=Token)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    auth_service.register(db, user_data)
    return auth_service.login(db, user_data.email, user_data.password)


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    return auth_service.login(db, credentials.email, credentials.password)


@router.get("/me", response_model=UserResponse)
def get_me(current_user=Depends(get_current_user)):
    return current_user


@router.post("/google", response_model=Token)
def google_auth(body: GoogleToken, db: Session = Depends(get_db)):
    from fastapi import HTTPException
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
    try:
        info = id_token.verify_oauth2_token(
            body.credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=10,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Google token: {e}")
    return auth_service.google_login(db, info)
