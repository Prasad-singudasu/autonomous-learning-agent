from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
import uuid


class LearningGoalCreate(BaseModel):
    topic: str
    description: Optional[str] = None


class CheckpointResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str]
    order_index: int
    is_unlocked: bool
    is_completed: bool
    best_score: float
    attempts: int

    class Config:
        from_attributes = True


class PhaseResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str]
    order_index: int
    is_unlocked: bool
    is_completed: bool
    checkpoints: List[CheckpointResponse] = []

    class Config:
        from_attributes = True


class RoadmapResponse(BaseModel):
    id: uuid.UUID
    topic: str
    overview: Optional[str]
    total_phases: int
    total_checkpoints: int
    phases: List[PhaseResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


class LearningGoalResponse(BaseModel):
    id: uuid.UUID
    topic: str
    description: Optional[str]
    status: str
    current_phase_index: int
    current_checkpoint_index: int
    total_progress: float
    created_at: datetime
    roadmap: Optional[RoadmapResponse] = None

    class Config:
        from_attributes = True


class LessonResponse(BaseModel):
    id: uuid.UUID
    checkpoint_id: uuid.UUID
    content: str
    key_concepts: Optional[List[str]]
    examples: Optional[List[Any]]
    created_at: datetime

    class Config:
        from_attributes = True


class GenerateRoadmapRequest(BaseModel):
    goal_id: uuid.UUID


class GenerateLessonRequest(BaseModel):
    checkpoint_id: uuid.UUID
