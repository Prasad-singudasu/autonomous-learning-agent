import logging
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.learning import LearningGoal, Roadmap, Phase, Checkpoint, Lesson
from app.models.progress import LearningProgress, LearningHistory
from app.schemas.learning import LearningGoalCreate
from app.agents.nodes import generate_roadmap_node, generate_lesson_node
from app.agents.state import LearningState

logger = logging.getLogger(__name__)


class LearningService:
    async def create_goal(self, db: Session, user_id: str, data: LearningGoalCreate) -> LearningGoal:
        goal = LearningGoal(user_id=user_id, topic=data.topic, description=data.description)
        db.add(goal)
        db.commit()
        db.refresh(goal)

        progress = LearningProgress(goal_id=goal.id, user_id=user_id, completed_checkpoints=[], agent_activity_log=[], strong_areas=[], weak_areas=[])
        db.add(progress)
        db.commit()

        self._log_history(db, user_id, str(goal.id), "goal_created", {"topic": data.topic})
        return goal

    async def generate_roadmap(self, db: Session, user_id: str, goal_id: str) -> Roadmap:
        goal = db.query(LearningGoal).filter(LearningGoal.id == goal_id, LearningGoal.user_id == user_id).first()
        if not goal:
            raise HTTPException(status_code=404, detail="Learning goal not found")

        if goal.roadmap:
            return goal.roadmap

        state: LearningState = {
            "user_id": user_id, "goal_id": goal_id, "topic": goal.topic,
            "roadmap": None, "phases": None, "current_phase_index": 0,
            "current_checkpoint_index": 0, "current_phase": None, "current_checkpoint": None,
            "lesson": None, "key_concepts": None, "quiz_questions": None,
            "user_answers": None, "quiz_evaluation": None, "score": 0.0, "passed": False,
            "weak_concepts": [], "attempts": 0, "feynman_explanation": None,
            "feynman_session_id": None, "user_feynman_explanation": None, "feynman_gaps": None,
            "completed_checkpoints": [], "agent_activity_log": [], "action": "generate_roadmap", "error": None, "rag_context": None,
        }

        result = await generate_roadmap_node(state)
        if result.get("error"):
            raise HTTPException(status_code=500, detail=f"Roadmap generation failed: {result['error']}")

        roadmap_data = result.get("roadmap", {})
        phases_data = result.get("phases", [])

        roadmap = Roadmap(
            goal_id=goal.id,
            topic=goal.topic,
            overview=roadmap_data.get("overview", ""),
            total_phases=len(phases_data),
            total_checkpoints=sum(len(p.get("checkpoints", [])) for p in phases_data),
        )
        db.add(roadmap)
        db.flush()

        for phase_data in phases_data:
            phase = Phase(
                roadmap_id=roadmap.id,
                title=phase_data["title"],
                description=phase_data.get("description", ""),
                order_index=phase_data.get("order_index", 0),
                is_unlocked=phase_data.get("order_index", 0) == 0,
            )
            db.add(phase)
            db.flush()

            for cp_data in phase_data.get("checkpoints", []):
                cp = Checkpoint(
                    phase_id=phase.id,
                    title=cp_data["title"],
                    description=cp_data.get("description", ""),
                    order_index=cp_data.get("order_index", 0),
                    is_unlocked=(phase_data.get("order_index", 0) == 0 and cp_data.get("order_index", 0) == 0),
                )
                db.add(cp)

        db.commit()
        db.refresh(roadmap)

        self._log_history(db, user_id, goal_id, "roadmap_generated", {"topic": goal.topic, "phases": len(phases_data)})
        self._update_activity(db, user_id, goal_id, f"Generated roadmap for {goal.topic}")
        return roadmap

    async def generate_lesson(self, db: Session, user_id: str, checkpoint_id: str, rag_context: Optional[str] = None) -> Lesson:
        checkpoint = db.query(Checkpoint).filter(Checkpoint.id == checkpoint_id).first()
        if not checkpoint:
            raise HTTPException(status_code=404, detail="Checkpoint not found")
        if not checkpoint.is_unlocked:
            raise HTTPException(status_code=403, detail="Checkpoint is locked")

        if checkpoint.lesson:
            return checkpoint.lesson

        phase = checkpoint.phase
        roadmap = phase.roadmap
        goal = roadmap.goal

        state: LearningState = {
            "user_id": user_id, "goal_id": str(goal.id), "topic": goal.topic,
            "roadmap": None, "phases": self._phases_to_dict(roadmap.phases),
            "current_phase_index": phase.order_index,
            "current_checkpoint_index": checkpoint.order_index,
            "current_phase": {"title": phase.title, "description": phase.description, "order_index": phase.order_index, "checkpoints": []},
            "current_checkpoint": {"title": checkpoint.title, "description": checkpoint.description, "order_index": checkpoint.order_index},
            "lesson": None, "key_concepts": None, "quiz_questions": None,
            "user_answers": None, "quiz_evaluation": None, "score": 0.0, "passed": False,
            "weak_concepts": [], "attempts": checkpoint.attempts, "feynman_explanation": None,
            "feynman_session_id": None, "user_feynman_explanation": None, "feynman_gaps": None,
            "completed_checkpoints": [], "agent_activity_log": [], "action": "teach", "error": None,
            "rag_context": rag_context,
        }

        result = await generate_lesson_node(state)
        if result.get("error"):
            raise HTTPException(status_code=500, detail=f"Lesson generation failed: {result['error']}")

        lesson = Lesson(
            checkpoint_id=checkpoint.id,
            content=result.get("lesson", ""),
            key_concepts=result.get("key_concepts", []),
            examples=result.get("examples", []),
        )
        db.add(lesson)
        db.commit()
        db.refresh(lesson)

        self._update_activity(db, user_id, str(goal.id), f"Generated lesson: {checkpoint.title}")
        return lesson

    def get_goals(self, db: Session, user_id: str):
        return db.query(LearningGoal).filter(LearningGoal.user_id == user_id).order_by(LearningGoal.created_at.desc()).all()

    def get_roadmap(self, db: Session, user_id: str, roadmap_id: str) -> Roadmap:
        roadmap = db.query(Roadmap).filter(Roadmap.id == roadmap_id).first()
        if not roadmap:
            raise HTTPException(status_code=404, detail="Roadmap not found")
        goal = roadmap.goal
        if str(goal.user_id) != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        return roadmap

    def get_checkpoint(self, db: Session, checkpoint_id: str) -> Checkpoint:
        cp = db.query(Checkpoint).filter(Checkpoint.id == checkpoint_id).first()
        if not cp:
            raise HTTPException(status_code=404, detail="Checkpoint not found")
        return cp

    def _phases_to_dict(self, phases):
        result = []
        for p in phases:
            result.append({
                "title": p.title, "description": p.description, "order_index": p.order_index,
                "checkpoints": [{"title": c.title, "description": c.description, "order_index": c.order_index} for c in p.checkpoints]
            })
        return result

    def _log_history(self, db: Session, user_id: str, goal_id: str, event_type: str, event_data: dict):
        history = LearningHistory(user_id=user_id, goal_id=goal_id, event_type=event_type, event_data=event_data)
        db.add(history)
        db.commit()

    def _update_activity(self, db: Session, user_id: str, goal_id: str, activity: str):
        progress = db.query(LearningProgress).filter(LearningProgress.goal_id == goal_id).first()
        if progress:
            log = progress.agent_activity_log or []
            log.append({"action": activity})
            from sqlalchemy.orm.attributes import flag_modified
            progress.agent_activity_log = log
            flag_modified(progress, "agent_activity_log")
            db.commit()


learning_service = LearningService()
