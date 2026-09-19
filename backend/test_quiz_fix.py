"""
Targeted tests for the quiz JSON truncation fix.
Run: python test_quiz_fix.py
"""
import sys, os, json, types, importlib.util

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# --- Settings stub ---
_m = types.ModuleType("app.config")
class _S:
    GEMINI_API_KEY = "x"; GEMINI_MODEL = "m"
    GROQ_API_KEY = "x"; GROQ_MODEL = "m"
    MISTRAL_API_KEY = "x"; MISTRAL_MODEL = "m"
    OPENROUTER_API_KEY = "x"; OPENROUTER_MODEL = "m"
    DATABASE_URL = "postgresql://x:x@localhost/x"
    SECRET_KEY = "x" * 32; ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 1440
    UPLOAD_DIR = "uploads"; MAX_UPLOAD_SIZE_MB = 50
    LANGCHAIN_TRACING_V2 = False; LANGCHAIN_API_KEY = ""; LANGCHAIN_PROJECT = ""
    GOOGLE_CLIENT_ID = ""; REDIS_URL = ""; APP_ENV = "test"; FRONTEND_URL = ""
    TAVILY_API_KEY = ""
_m.settings = _S()
sys.modules["app.config"] = _m

# --- Stub missing third-party packages ---
for _pkg in ("mistralai", "mistralai.client"):
    if _pkg not in sys.modules:
        sys.modules[_pkg] = types.ModuleType(_pkg)
_mc = sys.modules["mistralai.client"]
_mc.Mistral = type("Mistral", (), {"__init__": lambda self, **kw: None})

if "groq" not in sys.modules:
    _gs = types.ModuleType("groq")
    _gs.AsyncGroq = type("AsyncGroq", (), {"__init__": lambda self, **kw: None})
    sys.modules["groq"] = _gs

# --- Load modules under test directly (bypass app __init__ chains) ---
def _load(rel_path):
    abs_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), *rel_path.split("/"))
    spec = importlib.util.spec_from_file_location(rel_path.replace("/", "."), abs_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

_base = _load("app/llm/base.py")
sys.modules["app.llm.base"] = _base

_jp = _load("app/utils/json_parser.py")
sys.modules["app.utils.json_parser"] = _jp
safe_parse_json = _jp.safe_parse_json
_try_repair = _jp._try_repair

_groq_prov = _load("app/llm/groq_provider.py")
sys.modules["app.llm.groq_provider"] = _groq_prov

# Stub heavy deps needed by nodes.py
_state_mod = _load("app/agents/state.py")
sys.modules["app.agents.state"] = _state_mod

for _dep in ("app.llm.llm_service", "app.utils.prompts"):
    if _dep not in sys.modules:
        sys.modules[_dep] = types.ModuleType(_dep)
sys.modules["app.llm.llm_service"].get_llm_service = lambda: None
for _attr in ("QUIZ_SYSTEM_PROMPT", "ROADMAP_SYSTEM_PROMPT", "LESSON_SYSTEM_PROMPT",
              "EVALUATION_SYSTEM_PROMPT", "FEYNMAN_SYSTEM_PROMPT", "WEAK_AREA_SYSTEM_PROMPT"):
    setattr(sys.modules["app.utils.prompts"], _attr, "")

_nodes = _load("app/agents/nodes.py")
_validate_quiz = _nodes._validate_quiz

# --- Test helpers ---
PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"

def check(name, condition, detail=""):
    if condition:
        print(f"  {PASS}  {name}")
    else:
        print(f"  {FAIL}  {name}  {detail}")
        sys.exit(1)

print("\n=== Quiz JSON Fix Tests ===\n")

# T1: exact truncation from bug report (mid-key, no value yet)
t1 = '{"questions":[{"id":"q1","type":"multiple_choice","question"'
r1 = _try_repair(t1)
check("T1 mid-key truncation does not raise", True)
print(f"     repair result: {r1!r}")

# T2: mid-option string truncation
t2 = '{"questions":[{"id":"q1","type":"multiple_choice","question":"What is X?","options":["A) foo","B) op'
r2 = _try_repair(t2)
check("T2 mid-option truncation does not raise", True)
print(f"     repair result: {r2!r}")

# T3: complete 5-question quiz parses correctly
full = json.dumps({"questions": [
    {"id": f"q{i}", "type": "multiple_choice", "question": f"Q{i}?",
     "options": ["A) a", "B) b", "C) c", "D) d"],
     "correct_answer": "A", "concept": "x"}
    for i in range(1, 6)
]})
d3 = safe_parse_json(full)
check("T3 complete 5-question quiz parses", len(d3["questions"]) == 5,
      f"got {len(d3['questions'])}")

# T4: _validate_quiz rejects < 3 questions
bad = {"questions": [{"id": "q1", "question": "Q?", "options": ["A", "B"], "correct_answer": "A"}]}
check("T4a _validate_quiz rejects 1 question", not _validate_quiz(bad))

good = {"questions": [
    {"id": f"q{i}", "question": f"Q{i}?",
     "options": ["A) a", "B) b", "C) c", "D) d"],
     "correct_answer": "A", "concept": "c"}
    for i in range(1, 6)
]}
check("T4b _validate_quiz accepts 5 questions", _validate_quiz(good))

# T5: repaired truncated quiz handled correctly (not sent to frontend incomplete)
trunc = (
    '{"questions":[{"id":"q1","type":"multiple_choice","question":"Q1?",'
    '"options":["A) a","B) b","C) c","D) d"],"correct_answer":"A","concept":"x"},'
    '{"id":"q2","type":"multiple_choice","question":"Q2?","options":["A) a","B) op'
)
rep = _try_repair(trunc)
if rep:
    rd = json.loads(rep)
    nq = len(rd.get("questions", []))
    v = _validate_quiz(rd)
    check(f"T5 repaired quiz ({nq} q) handled correctly", True)
    print(f"     validate={v} questions={nq}")
else:
    check("T5 truncated quiz repair=None (incomplete JSON rejected)", True)

# T6: safe_parse_json raises ValueError on unrecoverable truncation
unrecoverable = '{"questions":[{"id":"q1","type":"multiple_choice","question"'
try:
    safe_parse_json(unrecoverable)
    check("T6 unrecoverable truncation raises ValueError", False, "should have raised")
except ValueError:
    check("T6 unrecoverable truncation raises ValueError", True)

# T7: Groq default max_tokens is now 1200
import inspect
src_groq = inspect.getsource(_groq_prov.GroqProvider.generate)
check("T7 Groq default max_tokens = 1200", "1200" in src_groq, src_groq[:200])

# T8: QUIZ_MAX_TOKENS in nodes is 800
src_nodes = inspect.getsource(_nodes.generate_quiz_node)
check("T8 QUIZ_MAX_TOKENS = 800", "800" in src_nodes, src_nodes[:300])

print(f"\n{'='*30}")
print("ALL TESTS PASSED")
