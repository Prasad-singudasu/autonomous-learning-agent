from sqlalchemy import Column, String, DateTime, Text, Integer, Float, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database.db import Base


class LearningProgress(Base):
    __tablename__ = "learning_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    goal_id = Column(UUID(as_uuid=True), ForeignKey("learning_goals.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    completed_checkpoints = Column(JSON, default=list)
    total_study_time_minutes = Column(Integer, default=0)
    current_streak_days = Column(Integer, default=0)
    last_activity = Column(DateTime(timezone=True))
    agent_activity_log = Column(JSON, default=list)
    strong_areas = Column(JSON, default=list)
    weak_areas = Column(JSON, default=list)
    average_score = Column(Float, default=0.0)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    goal = relationship("LearningGoal", back_populates="progress")


class LearningHistory(Base):
    __tablename__ = "learning_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    goal_id = Column(UUID(as_uuid=True), ForeignKey("learning_goals.id"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    event_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
