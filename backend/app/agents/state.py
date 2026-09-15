from typing import TypedDict, Optional, List, Dict, Any
import uuid


class LearningState(TypedDict):
    # Identity
    user_id: str
    goal_id: str
    topic: str

    # Roadmap
    roadmap: Optional[Dict[str, Any]]
    phases: Optional[List[Dict[str, Any]]]

    # Current position
    current_phase_index: int
    current_checkpoint_index: int
    current_phase: Optional[Dict[str, Any]]
    current_checkpoint: Optional[Dict[str, Any]]

    # Lesson
    lesson: Optional[str]
    key_concepts: Optional[List[str]]

    # Quiz
    quiz_questions: Optional[List[Dict[str, Any]]]
    user_answers: Optional[Dict[str, str]]
    quiz_evaluation: Optional[List[Dict[str, Any]]]
    score: float
    passed: bool

    # Weak areas
    weak_concepts: Optional[List[str]]
    attempts: int

    # Feynman
    feynman_explanation: Optional[str]
    feynman_session_id: Optional[str]
    user_feynman_explanation: Optional[str]
    feynman_gaps: Optional[List[str]]

    # Progress
    completed_checkpoints: List[str]
    agent_activity_log: List[Dict[str, Any]]

    # Control flow
    action: str  # generate_roadmap | teach | quiz | evaluate | feynman | complete | done
    error: Optional[str]

    # RAG context
    rag_context: Optional[str]
