import logging
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.learning import LearningGoal, Roadmap, Phase, Checkpoint
from app.models.progress import LearningProgress, LearningHistory
from app.llm.llm_service import get_llm_service
from app.utils.prompts import TUTOR_SYSTEM_PROMPT, RESOURCES_SYSTEM_PROMPT
from app.utils.json_parser import safe_parse_json

logger = logging.getLogger(__name__)
llm = get_llm_service()


class ProgressService:
    def get_progress(self, db: Session, user_id: str, goal_id: str) -> dict:
        goal = db.query(LearningGoal).filter(LearningGoal.id == goal_id, LearningGoal.user_id == user_id).first()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")

        progress = db.query(LearningProgress).filter(LearningProgress.goal_id == goal_id).first()
        roadmap = goal.roadmap

        current_phase = None
        current_checkpoint = None
        total_checkpoints = 0
        completed_count = 0

        if roadmap:
            for phase in sorted(roadmap.phases, key=lambda p: p.order_index):
                for cp in sorted(phase.checkpoints, key=lambda c: c.order_index):
                    total_checkpoints += 1
                    if cp.is_completed:
                        completed_count += 1
                    elif cp.is_unlocked and not current_checkpoint:
                        current_phase = phase.title
                        current_checkpoint = cp.title

        total_progress = (completed_count / total_checkpoints * 100) if total_checkpoints > 0 else 0
        goal.total_progress = total_progress
        db.commit()

        next_recommendation = self._get_next_recommendation(current_checkpoint, current_phase, total_progress)

        return {
            "goal_id": goal.id,
            "topic": goal.topic,
            "current_phase": current_phase,
            "current_checkpoint": current_checkpoint,
            "total_progress": total_progress,
            "completed_checkpoints": progress.completed_checkpoints if progress else [],
            "total_checkpoints": total_checkpoints,
            "average_score": progress.average_score if progress else 0.0,
            "strong_areas": progress.strong_areas if progress else [],
            "weak_areas": progress.weak_areas if progress else [],
            "total_study_time_minutes": progress.total_study_time_minutes if progress else 0,
            "current_streak_days": progress.current_streak_days if progress else 0,
            "last_activity": progress.last_activity if progress else None,
            "agent_activity_log": (progress.agent_activity_log or [])[-20:] if progress else [],
            "next_recommendation": next_recommendation,
        }

    def get_history(self, db: Session, user_id: str):
        return db.query(LearningHistory).filter(LearningHistory.user_id == user_id).order_by(LearningHistory.created_at.desc()).limit(50).all()

    async def tutor_chat(self, db: Session, user_id: str, message: str, checkpoint_id=None, goal_id=None, rag_context=None, history=None) -> dict:
        context_parts = []

        if checkpoint_id:
            cp = db.query(Checkpoint).filter(Checkpoint.id == checkpoint_id).first()
            if cp:
                context_parts.append(f"Current checkpoint: {cp.title}")
                if cp.lesson:
                    context_parts.append(f"Lesson summary: {cp.lesson.content[:500]}...")
                if cp.weak_concepts:
                    weak = [wc.concept for wc in cp.weak_concepts if not wc.resolved]
                    if weak:
                        context_parts.append(f"Learner's weak areas: {', '.join(weak)}")

        if rag_context:
            context_parts.append(f"Relevant material from uploaded documents:\n{rag_context}")

        # Build conversation history string (last 6 turns)
        history_text = ""
        if history:
            recent = history[-6:]
            history_text = "\n".join(
                f"{'User' if m['role'] == 'user' else 'Tutor'}: {m['content']}"
                for m in recent
            )

        context = "\n".join(context_parts)
        prompt = f"""{'Context about the learner:' + chr(10) + context + chr(10) if context else ''}{'Conversation so far:' + chr(10) + history_text + chr(10) if history_text else ''}Learner's question: {message}

Respond in structured Markdown with clear headings, bullet points, and code blocks where relevant."""

        response = await llm.generate(prompt, TUTOR_SYSTEM_PROMPT, temperature=0.7)
        return {"response": response, "used_rag": bool(rag_context)}

    async def get_resources(self, db: Session, checkpoint_id: str) -> dict:
        cp = db.query(Checkpoint).filter(Checkpoint.id == checkpoint_id).first()
        if not cp:
            raise HTTPException(status_code=404, detail="Checkpoint not found")

        phase = cp.phase
        roadmap = phase.roadmap
        goal = roadmap.goal

        prompt = f"""Generate real, accurate learning resources for:
Topic: {goal.topic}
Phase: {phase.title}
Checkpoint: {cp.title}

IMPORTANT RULES:
- For documentation: provide REAL official URLs that actually exist (e.g. docs.python.org, developer.mozilla.org, docs.oracle.com)
- For YouTube: provide a real youtube search URL like https://www.youtube.com/results?search_query=python+variables+tutorial — use the search_query field to build it
- For books: provide real book titles with their Google Books or Amazon search URL
- For articles: provide real URLs from sites like realpython.com, medium.com, geeksforgeeks.org, w3schools.com, freecodecamp.org
- For practice sites: provide real URLs like leetcode.com, hackerrank.com, exercism.org, codewars.com, w3schools.com
- NEVER invent fake URLs. If unsure of exact URL, use a search URL.

Return ONLY valid JSON:
{{
  "documentation": [
    {{"title": "Official Docs Title", "url": "https://real-url.com", "description": "What this covers"}}
  ],
  "books": [
    {{"title": "Book Title", "author": "Author Name", "url": "https://www.amazon.com/s?k=book+title", "description": "What this book covers"}}
  ],
  "videos": [
    {{"title": "Video/Playlist Title", "channel": "Channel Name", "url": "https://www.youtube.com/results?search_query=topic+keyword", "description": "What this video covers"}}
  ],
  "articles": [
    {{"title": "Article Title", "source": "Site Name", "url": "https://real-article-url.com", "description": "What this article covers"}}
  ],
  "practice_sites": [
    {{"title": "Site Name", "url": "https://real-site.com", "description": "How to practice here"}}
  ],
  "projects": [
    {{"title": "Project Title", "difficulty": "beginner", "description": "What to build and what you learn"}}
  ]
}}"""

        try:
            response = await llm.generate(prompt, RESOURCES_SYSTEM_PROMPT)
            resources = safe_parse_json(response)
            # Build real YouTube URLs from search queries if needed
            import urllib.parse
            for v in resources.get("videos", []):
                if not v.get("url") or "youtube.com" not in v.get("url", ""):
                    q = v.get("title", cp.title + " tutorial")
                    v["url"] = f"https://www.youtube.com/results?search_query={urllib.parse.quote(q)}"
            return {"checkpoint_id": cp.id, "checkpoint_title": cp.title, **resources}
        except Exception as e:
            logger.error(f"Resources generation failed: {e}")
            return {"checkpoint_id": cp.id, "checkpoint_title": cp.title, "documentation": [], "books": [], "videos": [], "articles": [], "practice_sites": [], "projects": []}

    def _get_next_recommendation(self, current_checkpoint, current_phase, progress) -> str:
        if progress >= 100:
            return "🎓 Congratulations! You've completed the entire learning path!"
        if current_checkpoint:
            return f"Continue with: {current_checkpoint} in {current_phase}"
        return "Start your first checkpoint to begin learning!"


progress_service = ProgressService()
