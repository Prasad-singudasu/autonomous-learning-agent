from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database.db import get_db
from app.utils.dependencies import get_current_user
from app.models.user import User
from app.schemas.learning import LearningGoalCreate, LearningGoalResponse, RoadmapResponse, LessonResponse, GenerateRoadmapRequest
from app.services.learning_service import learning_service

router = APIRouter(prefix="/learning", tags=["Learning"])


@router.post("/goals", response_model=LearningGoalResponse)
async def create_goal(data: LearningGoalCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await learning_service.create_goal(db, str(current_user.id), data)


@router.get("/goals", response_model=List[LearningGoalResponse])
def get_goals(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return learning_service.get_goals(db, str(current_user.id))


@router.get("/goals/{goal_id}", response_model=LearningGoalResponse)
def get_goal(goal_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    goals = learning_service.get_goals(db, str(current_user.id))
    goal = next((g for g in goals if str(g.id) == goal_id), None)
    if not goal:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal
