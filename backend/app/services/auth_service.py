from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.schemas.auth import UserCreate
from app.utils.security import hash_password, verify_password, create_access_token
import re


class AuthService:
    def register(self, db: Session, user_data: UserCreate) -> User:
        if db.query(User).filter(User.email == user_data.email).first():
            raise HTTPException(status_code=400, detail="Email already registered")
        if db.query(User).filter(User.username == user_data.username).first():
            raise HTTPException(status_code=400, detail="Username already taken")

        user = User(
            email=user_data.email,
            username=user_data.username,
            hashed_password=hash_password(user_data.password),
            full_name=user_data.full_name,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def login(self, db: Session, email: str, password: str) -> dict:
        user = db.query(User).filter(User.email == email).first()
        if not user or not user.hashed_password or not verify_password(password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Account is inactive")

        token = create_access_token({"sub": str(user.id)})
        return {"access_token": token, "token_type": "bearer", "user": user}

    def google_login(self, db: Session, info: dict) -> dict:
        email = info.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Google account has no email")

        user = db.query(User).filter(User.email == email).first()
        if not user:
            base = re.sub(r'[^a-z0-9]', '', (info.get("given_name") or email.split("@")[0]).lower())
            username = base
            suffix = 1
            while db.query(User).filter(User.username == username).first():
                username = f"{base}{suffix}"; suffix += 1

            user = User(
                email=email,
                username=username,
                full_name=info.get("name"),
                hashed_password=None,
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        token = create_access_token({"sub": str(user.id)})
        return {"access_token": token, "token_type": "bearer", "user": user}


auth_service = AuthService()
