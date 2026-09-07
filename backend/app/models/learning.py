from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Float, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database.db import Base


class LearningGoal(Base):
    __tablename__ = "learning_goals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    topic = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), default="active")  # active, completed, paused
    current_phase_index = Column(Integer, default=0)
    current_checkpoint_index = Column(Integer, default=0)
    total_progress = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="learning_goals")
    roadmap = relationship("Roadmap", back_populates="goal", uselist=False, cascade="all, delete-orphan")
    progress = relationship("LearningProgress", back_populates="goal", uselist=False, cascade="all, delete-orphan")


class Roadmap(Base):
    __tablename__ = "roadmaps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    goal_id = Column(UUID(as_uuid=True), ForeignKey("learning_goals.id"), nullable=False, index=True)
    topic = Column(String(255), nullable=False)
    overview = Column(Text)
    total_phases = Column(Integer, default=0)
    total_checkpoints = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    goal = relationship("LearningGoal", back_populates="roadmap")
    phases = relationship("Phase", back_populates="roadmap", cascade="all, delete-orphan", order_by="Phase.order_index")


class Phase(Base):
    __tablename__ = "phases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    roadmap_id = Column(UUID(as_uuid=True), ForeignKey("roadmaps.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    order_index = Column(Integer, nullable=False)
    is_unlocked = Column(Boolean, default=False)
    is_completed = Column(Boolean, default=False)

    roadmap = relationship("Roadmap", back_populates="phases")
    checkpoints = relationship("Checkpoint", back_populates="phase", cascade="all, delete-orphan", order_by="Checkpoint.order_index")


class Checkpoint(Base):
    __tablename__ = "checkpoints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phase_id = Column(UUID(as_uuid=True), ForeignKey("phases.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    order_index = Column(Integer, nullable=False)
    is_unlocked = Column(Boolean, default=False)
    is_completed = Column(Boolean, default=False)
    best_score = Column(Float, default=0.0)
    attempts = Column(Integer, default=0)

    phase = relationship("Phase", back_populates="checkpoints")
    lesson = relationship("Lesson", back_populates="checkpoint", uselist=False, cascade="all, delete-orphan")
    quiz_attempts = relationship("QuizAttempt", back_populates="checkpoint", cascade="all, delete-orphan")
    weak_concepts = relationship("WeakConcept", back_populates="checkpoint", cascade="all, delete-orphan")
    feynman_sessions = relationship("FeynmanSession", back_populates="checkpoint", cascade="all, delete-orphan")


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    checkpoint_id = Column(UUID(as_uuid=True), ForeignKey("checkpoints.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    key_concepts = Column(JSON)
    examples = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    checkpoint = relationship("Checkpoint", back_populates="lesson")


class UploadedMaterial(Base):
    __tablename__ = "uploaded_materials"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer)
    status = Column(String(50), default="processing")  # processing, ready, failed
    chunk_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="uploaded_materials")
