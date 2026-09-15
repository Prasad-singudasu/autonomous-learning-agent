from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.utils.dependencies import get_current_user
from app.models.user import User
from app.schemas.learning import LessonResponse
from app.services.learning_service import learning_service
from app.rag.rag_service import get_rag_service

router = APIRouter(prefix="/checkpoints", tags=["Checkpoints"])


@router.get("/{checkpoint_id}")
def get_checkpoint(checkpoint_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cp = learning_service.get_checkpoint(db, checkpoint_id)
    return {
        "id": cp.id, "title": cp.title, "description": cp.description,
        "order_index": cp.order_index, "is_unlocked": cp.is_unlocked,
        "is_completed": cp.is_completed, "best_score": cp.best_score, "attempts": cp.attempts,
        "has_lesson": cp.lesson is not None,
    }


@router.post("/{checkpoint_id}/lesson", response_model=LessonResponse)
async def generate_lesson(checkpoint_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rag = get_rag_service()
    rag_context = None
    if rag.has_documents(str(current_user.id)):
        cp = learning_service.get_checkpoint(db, checkpoint_id)
        rag_context = await rag.search(cp.title, str(current_user.id))

    return await learning_service.generate_lesson(db, str(current_user.id), checkpoint_id, rag_context)
