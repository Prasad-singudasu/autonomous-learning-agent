from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import os

from app.config import settings
from app.database.db import create_tables
from app.api import (
    auth_router, learning_router, roadmap_router,
    checkpoints_router, quiz_router, progress_router, materials_router
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Autonomous Learning Agent API...")
    os.makedirs("uploads/documents", exist_ok=True)
    os.makedirs("uploads/vector_stores", exist_ok=True)
    create_tables()
    logger.info("Database tables created/verified")
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="Autonomous Learning Agent API",
    description="AI-powered personalized learning platform",
    version="1.0.0",
    lifespan=lifespan,
)

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

if settings.FRONTEND_URL:
    ALLOWED_ORIGINS.append(settings.FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(learning_router)
app.include_router(roadmap_router)
app.include_router(checkpoints_router)
app.include_router(quiz_router)
app.include_router(progress_router)
app.include_router(materials_router)


@app.get("/")
def root():
    return {"message": "Autonomous Learning Agent API", "version": "1.0.0", "status": "running"}


@app.get("/health")
def health():
    return {"status": "healthy"}
