import json
import re
import logging

logger = logging.getLogger(__name__)


def _strip_think_blocks(text: str) -> str:
    """Remove <think>...</think> reasoning blocks (Groq qwen models)."""
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


def _strip_fences(text: str) -> str:
    """Strip markdown code fences like ```json ... ``` or ``` ... ```."""
    text = re.sub(r"```(?:json)?\s*", "", text)
    return re.sub(r"```\s*", "", text).strip()


def _extract_balanced(text: str, open_char: str, close_char: str) -> str | None:
    """Extract the first balanced JSON object or array from text."""
    start = text.find(open_char)
    if start == -1:
        return None
    depth = 0
    in_string = False
    escape_next = False
    for i in range(start, len(text)):
        ch = text[i]
        if escape_next:
            escape_next = False
            continue
        if ch == "\\" and in_string:
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == open_char:
            depth += 1
        elif ch == close_char:
            depth -= 1
            if depth == 0:
                return text[start:i + 1]
    return None


def _try_repair(text: str) -> str | None:
    """
    Attempt to repair truncated JSON by closing unclosed braces/brackets.
    Handles mid-string truncation by stripping the incomplete last element.
    Only used as a last resort — returns None if repair produces invalid JSON.
    """
    def _count_depth(s: str):
        depth_brace = depth_bracket = 0
        in_string = escape_next = False
        for ch in s:
            if escape_next:
                escape_next = False
                continue
            if ch == "\\" and in_string:
                escape_next = True
                continue
            if ch == '"':
                in_string = not in_string
                continue
            if in_string:
                continue
            if ch == '{': depth_brace += 1
            elif ch == '}': depth_brace -= 1
            elif ch == '[': depth_bracket += 1
            elif ch == ']': depth_bracket -= 1
        return depth_brace, depth_bracket, in_string

    depth_brace, depth_bracket, in_string = _count_depth(text)

    if depth_brace <= 0 and depth_bracket <= 0 and not in_string:
        return None  # Nothing to repair

    candidate = text.rstrip()

    # If we're mid-string, truncate back to the last complete JSON value boundary.
    # Strategy: walk back to find the last ',' or '[' or '{' outside a string
    # that precedes the incomplete token, then cut there.
    if in_string or depth_brace > 0 or depth_bracket > 0:
        # Find the last position that is a clean value boundary outside a string
        last_safe = 0
        in_str2 = esc2 = False
        for i, ch in enumerate(candidate):
            if esc2:
                esc2 = False
                continue
            if ch == "\\" and in_str2:
                esc2 = True
                continue
            if ch == '"':
                in_str2 = not in_str2
                continue
            if in_str2:
                continue
            # Outside a string — record safe boundary after complete values
            if ch in ('}', ']'):
                last_safe = i + 1

        if last_safe > 0:
            candidate = candidate[:last_safe]

    # Strip trailing dangling comma or incomplete key
    candidate = re.sub(r',\s*$', '', candidate.rstrip())
    candidate = re.sub(r',\s*"[^"]*$', '', candidate)

    # Recount after trimming
    depth_brace, depth_bracket, _ = _count_depth(candidate)

    if depth_brace <= 0 and depth_bracket <= 0:
        # May already be valid after trimming
        try:
            json.loads(candidate)
            return candidate
        except json.JSONDecodeError:
            return None

    repaired = candidate + ']' * max(0, depth_bracket) + '}' * max(0, depth_brace)

    try:
        json.loads(repaired)
        return repaired
    except json.JSONDecodeError:
        return None


def safe_parse_json(text: str) -> dict:
    if not isinstance(text, str):
        logger.error("[json_parser] Expected str, got %s", type(text).__name__)
        raise ValueError(f"LLM response is not a string, got {type(text).__name__}")

    # 1. Strip <think> blocks
    text = _strip_think_blocks(text)

    # 2. Strip markdown fences
    text = _strip_fences(text)

    text = text.strip()

    logger.info("[json_parser] Cleaned text: len=%d first=%r last=%r",
                len(text), text[:80], text[-80:])

    # 3. Direct parse
    try:
        result = json.loads(text)
        if not isinstance(result, dict):
            raise ValueError(f"Expected JSON object, got {type(result).__name__}")
        logger.info("[json_parser] Direct parse succeeded")
        return result
    except json.JSONDecodeError as e:
        logger.debug("[json_parser] Direct parse failed at pos %d: %s", e.pos, e.msg)

    # 4. Balanced extraction — find the outermost { ... }
    block = _extract_balanced(text, '{', '}')
    if block:
        try:
            result = json.loads(block)
            if isinstance(result, dict):
                logger.info("[json_parser] Balanced extraction succeeded, len=%d", len(block))
                return result
        except json.JSONDecodeError as e:
            logger.debug("[json_parser] Balanced block parse failed: %s", e.msg)

    # 5. Repair attempt (truncated response)
    candidate = block or text
    repaired = _try_repair(candidate)
    if repaired:
        try:
            result = json.loads(repaired)
            if isinstance(result, dict):
                logger.warning("[json_parser] Used repaired JSON (response was likely truncated)")
                return result
        except json.JSONDecodeError:
            pass

    # 6. Give up — log enough context to diagnose
    logger.error(
        "[json_parser] FAILED to parse JSON.\n"
        "  total_len=%d\n"
        "  first_100=%r\n"
        "  last_200=%r",
        len(text), text[:100], text[-200:]
    )
    raise ValueError(
        f"Could not parse LLM response as JSON. "
        f"Response length: {len(text)}. "
        f"Starts with: {text[:60]!r}. "
        f"Ends with: {text[-60:]!r}"
    )
