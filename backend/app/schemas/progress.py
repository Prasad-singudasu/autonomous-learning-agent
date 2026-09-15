from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
import uuid


class ProgressResponse(BaseModel):
    goal_id: uuid.UUID
    topic: str
    current_phase: Optional[str]
    current_checkpoint: Optional[str]
    total_progress: float
    completed_checkpoints: List[str]
    total_checkpoints: int
    average_score: float
    strong_areas: List[str]
    weak_areas: List[str]
    total_study_time_minutes: int
    current_streak_days: int
    last_activity: Optional[datetime]
    agent_activity_log: List[Any]
    next_recommendation: str


class TutorMessage(BaseModel):
    message: str
    checkpoint_id: Optional[uuid.UUID] = None
    goal_id: Optional[uuid.UUID] = None
    history: Optional[List[Any]] = []


class TutorResponse(BaseModel):
    response: str
    used_rag: bool


class HistoryResponse(BaseModel):
    id: uuid.UUID
    goal_id: uuid.UUID
    topic: str
    event_type: str
    event_data: Optional[Any]
    created_at: datetime
