from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.utils.dependencies import get_current_user
from app.models.user import User
from app.schemas.learning import RoadmapResponse, LessonResponse
from app.services.learning_service import learning_service
from app.rag.rag_service import get_rag_service

router = APIRouter(prefix="/roadmap", tags=["Roadmap"])


@router.post("/generate", response_model=RoadmapResponse)
async def generate_roadmap(goal_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await learning_service.generate_roadmap(db, str(current_user.id), goal_id)


@router.get("/{roadmap_id}", response_model=RoadmapResponse)
def get_roadmap(roadmap_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return learning_service.get_roadmap(db, str(current_user.id), roadmap_id)


@router.get("/by-goal/{goal_id}", response_model=RoadmapResponse)
def get_roadmap_by_goal(goal_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.learning import LearningGoal
    from fastapi import HTTPException
    goal = db.query(LearningGoal).filter(LearningGoal.id == goal_id, LearningGoal.user_id == current_user.id).first()
    if not goal or not goal.roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    return goal.roadmap
