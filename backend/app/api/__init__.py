from app.api.auth import router as auth_router
from app.api.learning import router as learning_router
from app.api.roadmap import router as roadmap_router
from app.api.checkpoints import router as checkpoints_router
from app.api.quiz import router as quiz_router
from app.api.progress import router as progress_router
from app.api.materials import router as materials_router

__all__ = [
    "auth_router", "learning_router", "roadmap_router",
    "checkpoints_router", "quiz_router", "progress_router", "materials_router"
]
