from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database.db import get_db
from app.utils.dependencies import get_current_user
from app.models.user import User
from app.schemas.progress import ProgressResponse, TutorMessage, TutorResponse, HistoryResponse
from app.services.progress_service import progress_service
from app.rag.rag_service import get_rag_service

router = APIRouter(tags=["Progress & Tutor"])


@router.get("/progress/{goal_id}", response_model=ProgressResponse)
def get_progress(goal_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return progress_service.get_progress(db, str(current_user.id), goal_id)


@router.get("/history", response_model=List[HistoryResponse])
def get_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    history = progress_service.get_history(db, str(current_user.id))
    result = []
    for h in history:
        from app.models.learning import LearningGoal
        goal = db.query(LearningGoal).filter(LearningGoal.id == h.goal_id).first()
        result.append({
            "id": h.id, "goal_id": h.goal_id,
            "topic": goal.topic if goal else "Unknown",
            "event_type": h.event_type, "event_data": h.event_data, "created_at": h.created_at,
        })
    return result


@router.post("/tutor/chat", response_model=TutorResponse)
async def tutor_chat(data: TutorMessage, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rag_context = None
    rag = get_rag_service()
    if rag.has_documents(str(current_user.id)):
        rag_context = await rag.search(data.message, str(current_user.id))

    return await progress_service.tutor_chat(
        db, str(current_user.id), data.message,
        str(data.checkpoint_id) if data.checkpoint_id else None,
        str(data.goal_id) if data.goal_id else None,
        rag_context,
        data.history or [],
    )


@router.get("/resources/{checkpoint_id}")
async def get_resources(checkpoint_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await progress_service.get_resources(db, checkpoint_id)
