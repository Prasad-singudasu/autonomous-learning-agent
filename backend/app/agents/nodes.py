import json
import logging
from typing import Any, Dict
from app.agents.state import LearningState
from app.llm.llm_service import get_llm_service
from app.llm.base import TruncatedResponseError
from app.utils.prompts import (
    ROADMAP_SYSTEM_PROMPT, LESSON_SYSTEM_PROMPT,
    QUIZ_SYSTEM_PROMPT, EVALUATION_SYSTEM_PROMPT,
    FEYNMAN_SYSTEM_PROMPT, WEAK_AREA_SYSTEM_PROMPT
)
from app.utils.json_parser import safe_parse_json

logger = logging.getLogger(__name__)
llm = get_llm_service()


async def generate_roadmap_node(state: LearningState) -> Dict[str, Any]:
    topic = state["topic"]
    prompt = f"""Generate a learning roadmap for: {topic}

Return ONLY a valid JSON object, no other text:
{{
  "overview": "One sentence overview",
  "phases": [
    {{
      "title": "Phase 1: Fundamentals",
      "description": "What this phase covers",
      "order_index": 0,
      "checkpoints": [
        {{"title": "Topic A", "description": "Brief description", "order_index": 0}},
        {{"title": "Topic B", "description": "Brief description", "order_index": 1}}
      ]
    }}
  ]
}}

Rules:
- Exactly 4 phases (Beginner → Intermediate → Advanced → Expert)
- Exactly 4 checkpoints per phase (16 total)
- All strings under 80 characters
- No markdown, no extra text, no trailing commas
- Output must start with {{ and end with }}"""

    try:
        response = await llm.generate(prompt, ROADMAP_SYSTEM_PROMPT, max_tokens=2048)
        roadmap_data = safe_parse_json(response)
        log_entry = {"action": "Generated learning roadmap", "topic": topic, "phases": len(roadmap_data.get("phases", []))}
        return {
            "roadmap": roadmap_data,
            "phases": roadmap_data.get("phases", []),
            "action": "teach",
            "agent_activity_log": state.get("agent_activity_log", []) + [log_entry],
        }
    except Exception as e:
        logger.error(f"Roadmap generation failed: {e}")
        return {"error": str(e), "action": "done"}


async def generate_lesson_node(state: LearningState) -> Dict[str, Any]:
    phases = state.get("phases", [])
    phase_idx = state.get("current_phase_index", 0)
    cp_idx = state.get("current_checkpoint_index", 0)

    if phase_idx >= len(phases):
        return {"action": "done", "agent_activity_log": state.get("agent_activity_log", []) + [{"action": "All phases completed!"}]}

    current_phase = phases[phase_idx]
    checkpoints = current_phase.get("checkpoints", [])

    if cp_idx >= len(checkpoints):
        return {
            "current_phase_index": phase_idx + 1,
            "current_checkpoint_index": 0,
            "action": "teach",
        }

    current_checkpoint = checkpoints[cp_idx]
    topic = state["topic"]
    rag_context = state.get("rag_context", "")

    rag_section = f'\nAdditional context from uploaded materials: {rag_context[:500]}' if rag_context else ''

    # Structured prompt — avoids embedding large markdown inside a JSON string value.
    # Each field is short and well-scoped so Groq does not truncate mid-JSON.
    prompt = f"""Create a lesson for:
Topic: {topic}
Phase: {current_phase['title']}
Checkpoint: {current_checkpoint['title']}{rag_section}

Return ONLY a valid JSON object with exactly these fields:
{{
  "summary": "2-3 sentence plain-English overview of this checkpoint",
  "explanation": "Clear explanation of the concept (3-5 paragraphs, plain text, no markdown)",
  "analogy": "One real-world analogy that makes this concept easy to understand",
  "key_concepts": ["concept1", "concept2", "concept3"],
  "examples": [
    {{"title": "Basic example", "code": "print('hello')", "explanation": "what it does"}},
    {{"title": "Practical example", "code": "x = 5", "explanation": "what it does"}}
  ],
  "important_points": ["point1", "point2", "point3"],
  "common_mistakes": ["mistake1", "mistake2"]
}}

Rules:
- All string values must be plain text (no markdown, no backticks inside values).
- Code goes only inside the examples[].code field.
- Keep explanation under 400 words.
- Return ONLY the JSON object, nothing else."""

    try:
        response = await llm.generate(prompt, LESSON_SYSTEM_PROMPT)
        logger.info("[lesson] raw response type=%s len=%d preview=%s",
                    type(response).__name__, len(response), response[:120])
        lesson_data = safe_parse_json(response)

        # Build a clean markdown content string from the structured fields
        content = _build_lesson_content(lesson_data, current_checkpoint['title'])

        log_entry = {"action": f"Generated lesson: {current_checkpoint['title']}", "phase": current_phase['title']}
        return {
            "current_phase": current_phase,
            "current_checkpoint": current_checkpoint,
            "lesson": content,
            "key_concepts": lesson_data.get("key_concepts", []),
            "examples": lesson_data.get("examples", []),
            "action": "quiz",
            "agent_activity_log": state.get("agent_activity_log", []) + [log_entry],
        }
    except Exception as e:
        logger.error("Lesson generation failed: %s", e)
        return {"error": str(e), "action": "done"}


def _build_lesson_content(data: dict, title: str) -> str:
    """Assemble structured lesson fields into a readable markdown string."""
    parts = [f"## {title}"]

    if data.get("summary"):
        parts.append(f"\n{data['summary']}")

    if data.get("explanation"):
        parts.append(f"\n### Explanation\n{data['explanation']}")

    if data.get("analogy"):
        parts.append(f"\n### Real-World Analogy\n> {data['analogy']}")

    if data.get("examples"):
        parts.append("\n### Examples")
        for ex in data["examples"]:
            parts.append(f"\n**{ex.get('title', 'Example')}**")
            if ex.get("code"):
                parts.append(f"```\n{ex['code']}\n```")
            if ex.get("explanation"):
                parts.append(ex["explanation"])

    if data.get("important_points"):
        parts.append("\n### Important Points")
        for p in data["important_points"]:
            parts.append(f"- {p}")

    if data.get("common_mistakes"):
        parts.append("\n### Common Mistakes")
        for m in data["common_mistakes"]:
            parts.append(f"- ⚠️ {m}")

    return "\n".join(parts)


def _validate_quiz(data: dict) -> bool:
    """Return True only if data contains at least 3 well-formed questions."""
    questions = data.get("questions", [])
    if not isinstance(questions, list) or len(questions) < 3:
        return False
    for q in questions:
        if not isinstance(q, dict):
            return False
        if not q.get("question") or not q.get("correct_answer"):
            return False
        opts = q.get("options", [])
        if not isinstance(opts, list) or len(opts) < 2:
            return False
    return True


async def generate_quiz_node(state: LearningState) -> Dict[str, Any]:
    checkpoint = state.get("current_checkpoint", {})
    topic = state["topic"]
    weak_concepts = state.get("weak_concepts", [])
    is_retest = state.get("attempts", 0) > 0

    prompt = f"""Quiz: {topic} — {checkpoint.get('title', '')}.
{('Weak areas: ' + ', '.join(weak_concepts) + '.') if weak_concepts else ''}
{'New questions (retest).' if is_retest else ''}

Return ONLY this JSON, 5 questions, no extra fields:
{{"questions":[{{"id":"q1","type":"multiple_choice","question":"Short question?","options":["A) opt","B) opt","C) opt","D) opt"],"correct_answer":"A","concept":"term"}}]}}

Rules: 5 questions. Options max 5 words each. Questions max 12 words. correct_answer is A/B/C/D only."""

    # Keep well under Groq's 1000 OTPM free-tier cap.
    # The compact quiz prompt + 5 short questions fits comfortably in 800 tokens.
    # Mistral/OpenRouter have no such cap so they use their own defaults (4096).
    QUIZ_MAX_TOKENS = 800

    last_error = None
    for attempt in range(2):
        try:
            response = await llm.generate(prompt, QUIZ_SYSTEM_PROMPT, max_tokens=QUIZ_MAX_TOKENS)
            quiz_data = safe_parse_json(response)

            if not _validate_quiz(quiz_data):
                logger.warning(
                    "[quiz] Schema validation failed on attempt %d — questions=%d",
                    attempt + 1, len(quiz_data.get('questions', []))
                )
                last_error = ValueError(
                    f"Quiz schema invalid: got {len(quiz_data.get('questions', []))} valid questions"
                )
                # Don't retry on attempt 1 with the same provider — fall through
                # to the error return so the caller gets a clear message.
                if attempt == 0:
                    continue
                break

            log_entry = {
                "action": f"Generated {'retest' if is_retest else 'quiz'} for: {checkpoint.get('title', '')}",
                "questions": len(quiz_data["questions"]),
            }
            return {
                "quiz_questions": quiz_data["questions"],
                "user_answers": {},
                "action": "collect_answers",
                "agent_activity_log": state.get("agent_activity_log", []) + [log_entry],
            }

        except ValueError as e:
            # Bad JSON parse — retry once; llm_service will try the next provider
            # if the previous one already failed internally.
            logger.warning("[quiz] Attempt %d JSON parse error: %s", attempt + 1, str(e)[:120])
            last_error = e
            if attempt == 0:
                continue
            break
        except TruncatedResponseError as e:
            # llm_service already exhausted all providers for this call.
            # Retry the outer loop so llm_service starts fresh from provider[0].
            logger.warning("[quiz] Attempt %d truncated response — retrying full provider chain", attempt + 1)
            last_error = e
            if attempt == 0:
                continue
            break
        except Exception as e:
            logger.error("[quiz] Attempt %d unexpected error: %s", attempt + 1, str(e)[:120])
            last_error = e
            break

    logger.error("Quiz generation failed after retries: %s", last_error)
    return {"error": str(last_error), "action": "done"}


async def evaluate_answers_node(state: LearningState) -> Dict[str, Any]:
    questions = state.get("quiz_questions", [])
    answers = state.get("user_answers", {})
    checkpoint = state.get("current_checkpoint", {})
    topic = state["topic"]

    qa_pairs = []
    for q in questions:
        qa_pairs.append({
            "id": q["id"],
            "correct": q.get("correct_answer", ""),
            "given": answers.get(q["id"], ""),
            "concept": q.get("concept", ""),
        })

    prompt = f"""Evaluate quiz for: {topic} / {checkpoint.get('title', '')}

Answers (id, correct, given, concept):
{json.dumps(qa_pairs)}

Return ONLY valid JSON:
{{"evaluations":[{{"question_id":"q1","correct":true,"explanation":"brief","concept":"c"}}],"score":85.5,"weak_concepts":[],"strong_concepts":[],"overall_feedback":"brief"}}"""

    try:
        response = await llm.generate(prompt, EVALUATION_SYSTEM_PROMPT)
        eval_data = safe_parse_json(response)
        score = eval_data.get("score", 0.0)
        passed = score >= 70.0
        weak_concepts = eval_data.get("weak_concepts", [])

        log_entry = {"action": f"Evaluated quiz: {checkpoint.get('title', '')}", "score": score, "passed": passed}
        next_action = "complete_checkpoint" if passed else "feynman"

        return {
            "quiz_evaluation": eval_data.get("evaluations", []),
            "score": score,
            "passed": passed,
            "weak_concepts": weak_concepts,
            "action": next_action,
            "agent_activity_log": state.get("agent_activity_log", []) + [log_entry],
        }
    except Exception as e:
        logger.error(f"Evaluation failed: {e}")
        return {"error": str(e), "action": "done"}


async def feynman_explanation_node(state: LearningState) -> Dict[str, Any]:
    weak_concepts = state.get("weak_concepts", [])
    checkpoint = state.get("current_checkpoint", {})
    topic = state["topic"]
    score = state.get("score", 0)

    prompt = f"""The learner scored {score}% on: {checkpoint.get('title', '')} in {topic}.
Weak areas: {', '.join(weak_concepts)}

Generate a Feynman-technique explanation. Return ONLY valid JSON:
{{
  "explanation": "Simple explanation of all weak concepts in plain language (markdown format)",
  "analogies": ["Real-world analogy 1", "Real-world analogy 2"],
  "examples": [
    {{"concept": "concept1", "simple_example": "...", "detailed_example": "..."}},
    {{"concept": "concept2", "simple_example": "...", "detailed_example": "..."}}
  ],
  "user_prompt": "Now explain [concept] in your own words as if teaching a 10-year-old."
}}"""

    try:
        response = await llm.generate(prompt, FEYNMAN_SYSTEM_PROMPT)
        feynman_data = safe_parse_json(response)
        log_entry = {"action": f"Started Feynman explanation for: {', '.join(weak_concepts)}", "checkpoint": checkpoint.get('title', '')}
        return {
            "feynman_explanation": feynman_data.get("explanation", ""),
            "action": "retest",
            "attempts": state.get("attempts", 0) + 1,
            "agent_activity_log": state.get("agent_activity_log", []) + [log_entry],
        }
    except Exception as e:
        logger.error(f"Feynman generation failed: {e}")
        return {"error": str(e), "action": "done"}


async def complete_checkpoint_node(state: LearningState) -> Dict[str, Any]:
    checkpoint = state.get("current_checkpoint", {})
    phase = state.get("current_phase", {})
    completed = state.get("completed_checkpoints", [])
    cp_id = checkpoint.get("id", checkpoint.get("title", ""))

    if cp_id not in completed:
        completed = completed + [cp_id]

    log_entry = {"action": f"✓ Completed checkpoint: {checkpoint.get('title', '')}", "score": state.get("score", 0)}

    phases = state.get("phases", [])
    phase_idx = state.get("current_phase_index", 0)
    cp_idx = state.get("current_checkpoint_index", 0)
    checkpoints = phases[phase_idx].get("checkpoints", []) if phase_idx < len(phases) else []

    next_cp_idx = cp_idx + 1
    next_phase_idx = phase_idx

    if next_cp_idx >= len(checkpoints):
        next_cp_idx = 0
        next_phase_idx = phase_idx + 1

    return {
        "completed_checkpoints": completed,
        "current_checkpoint_index": next_cp_idx,
        "current_phase_index": next_phase_idx,
        "attempts": 0,
        "weak_concepts": [],
        "feynman_explanation": None,
        "score": 0.0,
        "action": "teach" if next_phase_idx < len(phases) else "done",
        "agent_activity_log": state.get("agent_activity_log", []) + [log_entry],
    }


def route_after_evaluation(state: LearningState) -> str:
    return state.get("action", "done")


def route_after_roadmap(state: LearningState) -> str:
    return state.get("action", "done")
