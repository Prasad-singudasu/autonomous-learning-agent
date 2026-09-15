import logging
import uuid
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from fastapi import HTTPException

from app.models.learning import Checkpoint
from app.models.quiz import QuizAttempt, WeakConcept, FeynmanSession
from app.models.progress import LearningProgress, LearningHistory
from app.schemas.quiz import SubmitQuizRequest, FeynmanRequest
from app.agents.nodes import generate_quiz_node, feynman_explanation_node
from app.agents.state import LearningState

logger = logging.getLogger(__name__)


class QuizService:
    async def generate_quiz(self, db: Session, user_id: str, checkpoint_id: str, is_retest: bool = False, weak_concepts: Optional[List[str]] = None):
        checkpoint = db.query(Checkpoint).filter(Checkpoint.id == checkpoint_id).first()
        if not checkpoint:
            raise HTTPException(status_code=404, detail="Checkpoint not found")
        if not checkpoint.is_unlocked:
            raise HTTPException(status_code=403, detail="Checkpoint is locked")

        phase = checkpoint.phase
        roadmap = phase.roadmap
        goal = roadmap.goal

        state: LearningState = {
            "user_id": user_id, "goal_id": str(goal.id), "topic": goal.topic,
            "roadmap": None, "phases": None, "current_phase_index": phase.order_index,
            "current_checkpoint_index": checkpoint.order_index,
            "current_phase": {"title": phase.title, "description": phase.description, "order_index": phase.order_index, "checkpoints": []},
            "current_checkpoint": {"title": checkpoint.title, "description": checkpoint.description, "order_index": checkpoint.order_index},
            "lesson": checkpoint.lesson.content if checkpoint.lesson else "",
            "key_concepts": checkpoint.lesson.key_concepts if checkpoint.lesson else [],
            "quiz_questions": None, "user_answers": None, "quiz_evaluation": None,
            "score": 0.0, "passed": False,
            "weak_concepts": weak_concepts or [],
            "attempts": checkpoint.attempts,
            "feynman_explanation": None, "feynman_session_id": None,
            "user_feynman_explanation": None, "feynman_gaps": None,
            "completed_checkpoints": [], "agent_activity_log": [], "action": "quiz", "error": None, "rag_context": None,
        }

        result = await generate_quiz_node(state)
        if result.get("error"):
            raise HTTPException(status_code=500, detail=f"Quiz generation failed: {result['error']}")

        questions = result.get("quiz_questions", [])
        attempt = QuizAttempt(
            checkpoint_id=checkpoint.id,
            user_id=user_id,
            questions=questions,
            attempt_number=checkpoint.attempts + 1,
            is_retest=is_retest,
        )
        db.add(attempt)
        db.commit()
        db.refresh(attempt)

        return {"attempt_id": attempt.id, "checkpoint_id": checkpoint.id, "questions": questions, "attempt_number": attempt.attempt_number, "is_retest": is_retest}

    async def submit_quiz(self, db: Session, user_id: str, data: SubmitQuizRequest):
        checkpoint = db.query(Checkpoint).filter(Checkpoint.id == data.checkpoint_id).first()
        if not checkpoint:
            raise HTTPException(status_code=404, detail="Checkpoint not found")

        attempt = None
        if data.attempt_id:
            attempt = db.query(QuizAttempt).filter(QuizAttempt.id == data.attempt_id).first()

        if not attempt:
            attempt = db.query(QuizAttempt).filter(
                QuizAttempt.checkpoint_id == data.checkpoint_id,
                QuizAttempt.user_id == user_id,
            ).order_by(QuizAttempt.created_at.desc()).first()

        if not attempt:
            raise HTTPException(status_code=404, detail="Quiz attempt not found")

        phase = checkpoint.phase
        roadmap = phase.roadmap
        goal = roadmap.goal

        # --- Programmatic MCQ scoring (no LLM) ---
        questions = attempt.questions or []
        total_q = len(questions)
        evaluations = []
        correct_count = 0
        weak_concepts = []

        for q in questions:
            qid = q.get("id", "")
            correct_ans = q.get("correct_answer", "").strip().upper()
            user_ans = (data.answers.get(qid) or "").strip().upper()
            is_correct = user_ans == correct_ans
            if is_correct:
                correct_count += 1
            else:
                concept = q.get("concept", "")
                if concept and concept not in weak_concepts:
                    weak_concepts.append(concept)
            evaluations.append({
                "question_id": qid,
                "correct": is_correct,
                "user_answer": user_ans,
                "correct_answer": correct_ans,
                "concept": q.get("concept", ""),
            })

        score = round((correct_count / total_q * 100), 1) if total_q > 0 else 0.0
        passed = score >= 70.0
        incorrect_count = total_q - correct_count

        attempt.user_answers = data.answers
        attempt.evaluation = evaluations
        attempt.score = score
        attempt.passed = passed
        db.commit()

        checkpoint.attempts += 1
        if score > checkpoint.best_score:
            checkpoint.best_score = score

        if passed:
            checkpoint.is_completed = True
            self._unlock_next_checkpoint(db, checkpoint)
            next_action = "unlock_next"
            message = f"🎉 Excellent! You scored {score:.1f}% ({correct_count}/{total_q} correct) and mastered this checkpoint!"
            self._update_activity(db, user_id, str(goal.id), f"✓ Completed checkpoint: {checkpoint.title} ({score:.1f}%)")
        else:
            next_action = "feynman_learning"
            message = f"You scored {score:.1f}% ({correct_count}/{total_q} correct). You need 70% to pass. Let's strengthen your understanding."
            self._update_activity(db, user_id, str(goal.id), f"Detected weakness in: {checkpoint.title}")
            for concept in weak_concepts:
                existing = db.query(WeakConcept).filter(
                    WeakConcept.checkpoint_id == checkpoint.id,
                    WeakConcept.user_id == user_id,
                    WeakConcept.concept == concept
                ).first()
                if not existing:
                    db.add(WeakConcept(checkpoint_id=checkpoint.id, user_id=user_id, concept=concept))

        db.commit()

        self._update_progress(db, user_id, str(goal.id), score, weak_concepts, passed, checkpoint.title)
        self._log_history(db, user_id, str(goal.id), "quiz_submitted", {"checkpoint": checkpoint.title, "score": score, "passed": passed})

        return {
            "attempt_id": attempt.id,
            "checkpoint_id": checkpoint.id,
            "total_questions": total_q,
            "correct_answers": correct_count,
            "incorrect_answers": incorrect_count,
            "score": score,
            "passed": passed,
            "evaluations": evaluations,
            "weak_concepts": weak_concepts,
            "next_action": next_action,
            "message": message,
        }

    async def generate_feynman(self, db: Session, user_id: str, data: FeynmanRequest):
        checkpoint = db.query(Checkpoint).filter(Checkpoint.id == data.checkpoint_id).first()
        if not checkpoint:
            raise HTTPException(status_code=404, detail="Checkpoint not found")

        phase = checkpoint.phase
        roadmap = phase.roadmap
        goal = roadmap.goal

        state: LearningState = {
            "user_id": user_id, "goal_id": str(goal.id), "topic": goal.topic,
            "roadmap": None, "phases": None, "current_phase_index": phase.order_index,
            "current_checkpoint_index": checkpoint.order_index,
            "current_phase": {"title": phase.title, "description": phase.description, "order_index": phase.order_index, "checkpoints": []},
            "current_checkpoint": {"title": checkpoint.title, "description": checkpoint.description, "order_index": checkpoint.order_index},
            "lesson": checkpoint.lesson.content if checkpoint.lesson else "",
            "key_concepts": [], "quiz_questions": None, "user_answers": None,
            "quiz_evaluation": None, "score": checkpoint.best_score, "passed": False,
            "weak_concepts": data.weak_concepts, "attempts": checkpoint.attempts,
            "feynman_explanation": None, "feynman_session_id": None,
            "user_feynman_explanation": None, "feynman_gaps": None,
            "completed_checkpoints": [], "agent_activity_log": [], "action": "feynman", "error": None, "rag_context": None,
        }

        result = await feynman_explanation_node(state)
        if result.get("error"):
            raise HTTPException(status_code=500, detail=f"Feynman generation failed: {result['error']}")

        session = FeynmanSession(
            checkpoint_id=checkpoint.id,
            user_id=user_id,
            weak_concepts=data.weak_concepts,
            explanation=result.get("feynman_explanation", ""),
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        self._update_activity(db, user_id, str(goal.id), f"Started Feynman explanation for: {', '.join(data.weak_concepts)}")
        self._log_history(db, user_id, str(goal.id), "feynman_session", {"checkpoint": checkpoint.title, "weak_concepts": data.weak_concepts})

        return {
            "session_id": session.id,
            "checkpoint_id": checkpoint.id,
            "weak_concepts": data.weak_concepts,
            "explanation": result.get("feynman_explanation", ""),
        }

    def _unlock_next_checkpoint(self, db: Session, current_checkpoint: Checkpoint):
        phase = current_checkpoint.phase
        checkpoints = sorted(phase.checkpoints, key=lambda c: c.order_index)
        current_idx = current_checkpoint.order_index

        next_cp = next((c for c in checkpoints if c.order_index == current_idx + 1), None)
        if next_cp:
            next_cp.is_unlocked = True
            db.commit()
            return

        # Unlock first checkpoint of next phase
        roadmap = phase.roadmap
        phases = sorted(roadmap.phases, key=lambda p: p.order_index)
        current_phase_idx = phase.order_index
        next_phase = next((p for p in phases if p.order_index == current_phase_idx + 1), None)
        if next_phase:
            next_phase.is_unlocked = True
            if next_phase.checkpoints:
                first_cp = sorted(next_phase.checkpoints, key=lambda c: c.order_index)[0]
                first_cp.is_unlocked = True
            db.commit()

    def _update_progress(self, db: Session, user_id: str, goal_id: str, score: float, weak_concepts: list, passed: bool, checkpoint_title: str):
        progress = db.query(LearningProgress).filter(LearningProgress.goal_id == goal_id).first()
        if not progress:
            return

        if passed and checkpoint_title not in (progress.completed_checkpoints or []):
            completed = list(progress.completed_checkpoints or [])
            completed.append(checkpoint_title)
            progress.completed_checkpoints = completed
            flag_modified(progress, "completed_checkpoints")

        if weak_concepts:
            weak = list(progress.weak_areas or [])
            for wc in weak_concepts:
                if wc not in weak:
                    weak.append(wc)
            progress.weak_areas = weak
            flag_modified(progress, "weak_areas")

        db.commit()

    def _update_activity(self, db: Session, user_id: str, goal_id: str, activity: str):
        progress = db.query(LearningProgress).filter(LearningProgress.goal_id == goal_id).first()
        if progress:
            log = list(progress.agent_activity_log or [])
            log.append({"action": activity})
            progress.agent_activity_log = log
            flag_modified(progress, "agent_activity_log")
            db.commit()

    def _log_history(self, db: Session, user_id: str, goal_id: str, event_type: str, event_data: dict):
        history = LearningHistory(user_id=user_id, goal_id=goal_id, event_type=event_type, event_data=event_data)
        db.add(history)
        db.commit()


quiz_service = QuizService()
