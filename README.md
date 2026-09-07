# 🧠 Autonomous Learning Agent

An AI-powered personalized learning platform that automatically creates roadmaps, teaches checkpoint by checkpoint, evaluates understanding, detects weak areas, and only unlocks the next topic after mastery.

## 🚀 Live Demo
> Coming soon

---

## 📸 Screenshots

> Add screenshots here after deployment

---

## ✨ Features

- 🗺️ **AI Roadmap Generation** — Beginner to Advanced learning path
- 📚 **Checkpoint-based Learning** — One concept at a time
- 🧪 **Mastery Quizzes** — Must score 70% to unlock next checkpoint
- 🧠 **Feynman Technique** — AI re-teaches weak concepts simply
- 🤖 **AI Tutor** — Ask anything, context-aware chat
- 📄 **RAG Support** — Upload PDFs to enhance lessons
- 📊 **Progress Analytics** — Track scores, streaks, weak areas
- 🔐 **JWT Authentication** — Secure per-user data isolation
- 🔄 **LLM Fallback** — Gemini primary, Groq fallback

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js + Tailwind CSS + Vite |
| Backend | Python + FastAPI |
| AI Agent | LangGraph + LangChain |
| Primary LLM | Google Gemini 2.5 Flash |
| Fallback LLM | Groq (Qwen) |
| Database | PostgreSQL + SQLAlchemy |
| Vector Store | FAISS |
| Auth | JWT + bcrypt |

---

## 📁 Project Structure

```
autonomous-learning-agent/
├── backend/
│   └── app/
│       ├── api/          # REST endpoints
│       ├── models/       # Database models
│       ├── schemas/      # Pydantic schemas
│       ├── services/     # Business logic
│       ├── agents/       # LangGraph nodes
│       ├── llm/          # Gemini + Groq providers
│       ├── rag/          # FAISS vector store
│       └── utils/        # JWT, bcrypt, JSON parser
└── frontend/
    └── src/
        ├── pages/        # 16 React pages
        ├── components/   # Reusable components
        ├── services/     # Axios API layer
        └── context/      # Auth context
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+

### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Fill in your API keys in .env
python run.py
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/autonomous_learning
GEMINI_API_KEY=your-gemini-key
GROQ_API_KEY=your-groq-key
SECRET_KEY=your-secret-key
```

---

## 🔑 API Keys Required

| Key | Get it from | Free? |
|---|---|---|
| GEMINI_API_KEY | https://aistudio.google.com | ✅ Yes |
| GROQ_API_KEY | https://console.groq.com | ✅ Yes |
| TAVILY_API_KEY | https://tavily.com | ✅ Yes |

---

## 🌊 Learning Flow

```
Enter Topic → AI Generates Roadmap → Select Checkpoint
→ Generate Lesson → Take Quiz → Evaluate
→ Score >= 70%? → Unlock Next Checkpoint
→ Score < 70%? → Feynman Teaching → Retest → Repeat
```

---

## 👨‍💻 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [Your LinkedIn](https://linkedin.com/in/yourprofile)
