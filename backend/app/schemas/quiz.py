from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid


class QuizQuestion(BaseModel):
    id: str
    type: str  # multiple_choice, short_answer, scenario, coding
    question: str
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None


class GenerateQuizRequest(BaseModel):
    checkpoint_id: uuid.UUID
    is_retest: bool = False
    weak_concepts: Optional[List[str]] = None


class QuizResponse(BaseModel):
    checkpoint_id: uuid.UUID
    questions: List[QuizQuestion]
    attempt_number: int
    is_retest: bool


class SubmitQuizRequest(BaseModel):
    checkpoint_id: uuid.UUID
    attempt_id: Optional[uuid.UUID] = None
    answers: Dict[str, str]
    is_retest: bool = False


class QuestionEvaluation(BaseModel):
    question_id: str
    correct: bool
    user_answer: str
    correct_answer: str
    explanation: Optional[str] = None
    concept: Optional[str] = None


class QuizResult(BaseModel):
    attempt_id: uuid.UUID
    checkpoint_id: uuid.UUID
    score: float
    passed: bool
    total_questions: int
    correct_answers: int
    evaluations: List[QuestionEvaluation]
    weak_concepts: List[str]
    next_action: str  # "unlock_next" | "feynman_learning" | "retry"
    message: str


class FeynmanRequest(BaseModel):
    checkpoint_id: uuid.UUID
    weak_concepts: List[str]


class FeynmanResponse(BaseModel):
    session_id: uuid.UUID
    checkpoint_id: uuid.UUID
    weak_concepts: List[str]
    explanation: str
    analogies: List[str]
    examples: List[str]
    user_prompt: str


class FeynmanUserExplanation(BaseModel):
    session_id: uuid.UUID
    user_explanation: str


class FeynmanGapAnalysis(BaseModel):
    session_id: uuid.UUID
    gaps: List[str]
    clarification: str
    ready_for_retest: bool
