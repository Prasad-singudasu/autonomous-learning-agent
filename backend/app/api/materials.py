from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from app.database.db import get_db
from app.utils.dependencies import get_current_user
from app.models.user import User
from app.services.material_service import material_service
from pydantic import BaseModel

router = APIRouter(prefix="/materials", tags=["Materials"])


class SearchRequest(BaseModel):
    query: str


@router.post("/upload")
async def upload_material(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    material = await material_service.upload_material(db, str(current_user.id), file)
    return {
        "id": material.id, "original_name": material.original_name,
        "status": material.status, "chunk_count": material.chunk_count,
        "file_size": material.file_size, "created_at": material.created_at,
    }


@router.get("/")
def get_materials(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    materials = material_service.get_materials(db, str(current_user.id))
    return [{"id": m.id, "original_name": m.original_name, "status": m.status, "chunk_count": m.chunk_count, "file_size": m.file_size, "created_at": m.created_at} for m in materials]


@router.post("/search")
async def search_materials(data: SearchRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await material_service.search_materials(db, str(current_user.id), data.query)


@router.post("/ask")
async def ask_document(data: SearchRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await material_service.ask_document(db, str(current_user.id), data.query)
