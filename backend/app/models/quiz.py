from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Float, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database.db import Base


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    checkpoint_id = Column(UUID(as_uuid=True), ForeignKey("checkpoints.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    questions = Column(JSON, nullable=False)
    user_answers = Column(JSON)
    evaluation = Column(JSON)
    score = Column(Float, default=0.0)
    passed = Column(Boolean, default=False)
    attempt_number = Column(Integer, default=1)
    is_retest = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    checkpoint = relationship("Checkpoint", back_populates="quiz_attempts")


class WeakConcept(Base):
    __tablename__ = "weak_concepts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    checkpoint_id = Column(UUID(as_uuid=True), ForeignKey("checkpoints.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    concept = Column(String(255), nullable=False)
    description = Column(Text)
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    checkpoint = relationship("Checkpoint", back_populates="weak_concepts")


class FeynmanSession(Base):
    __tablename__ = "feynman_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    checkpoint_id = Column(UUID(as_uuid=True), ForeignKey("checkpoints.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    weak_concepts = Column(JSON)
    explanation = Column(Text)
    user_explanation = Column(Text)
    gaps_identified = Column(JSON)
    clarification = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    checkpoint = relationship("Checkpoint", back_populates="feynman_sessions")
