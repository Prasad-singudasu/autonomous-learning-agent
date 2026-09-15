from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database.db import get_db
from app.utils.dependencies import get_current_user
from app.models.user import User
from app.schemas.quiz import GenerateQuizRequest, SubmitQuizRequest, FeynmanRequest
from app.services.quiz_service import quiz_service

router = APIRouter(prefix="/quiz", tags=["Quiz"])


@router.post("/generate")
async def generate_quiz(data: GenerateQuizRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await quiz_service.generate_quiz(db, str(current_user.id), str(data.checkpoint_id), data.is_retest, data.weak_concepts)


@router.post("/submit")
async def submit_quiz(data: SubmitQuizRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await quiz_service.submit_quiz(db, str(current_user.id), data)


@router.post("/feynman")
async def generate_feynman(data: FeynmanRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await quiz_service.generate_feynman(db, str(current_user.id), data)
