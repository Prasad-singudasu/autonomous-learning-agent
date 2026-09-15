import os
import uuid
import json
import logging
from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile

from app.models.learning import UploadedMaterial
from app.rag.rag_service import get_rag_service
from app.config import settings

logger = logging.getLogger(__name__)


def _flatten_context(context: str) -> str:
    """Convert JSON context to readable plain text for the LLM."""
    try:
        data = json.loads(context)
        lines = []
        def _walk(obj, indent=0):
            prefix = "  " * indent
            if isinstance(obj, dict):
                for k, v in obj.items():
                    if isinstance(v, (dict, list)):
                        lines.append(f"{prefix}{k}:")
                        _walk(v, indent + 1)
                    else:
                        lines.append(f"{prefix}{k}: {v}")
            elif isinstance(obj, list):
                for item in obj:
                    if isinstance(item, (dict, list)):
                        _walk(item, indent)
                    else:
                        lines.append(f"{prefix}- {item}")
            else:
                lines.append(f"{prefix}{obj}")
        _walk(data)
        return "\n".join(lines)
    except (json.JSONDecodeError, ValueError):
        return context


class MaterialService:
    async def upload_material(self, db: Session, user_id: str, file: UploadFile) -> UploadedMaterial:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")

        content = await file.read()
        size_mb = len(content) / (1024 * 1024)
        if size_mb > settings.MAX_UPLOAD_SIZE_MB:
            raise HTTPException(status_code=400, detail=f"File too large. Max {settings.MAX_UPLOAD_SIZE_MB}MB")

        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        filename = f"{uuid.uuid4()}.pdf"
        file_path = os.path.join(settings.UPLOAD_DIR, filename)

        with open(file_path, "wb") as f:
            f.write(content)

        material = UploadedMaterial(
            user_id=user_id,
            filename=filename,
            original_name=file.filename,
            file_path=file_path,
            file_size=len(content),
            status="processing",
        )
        db.add(material)
        db.commit()
        db.refresh(material)

        try:
            rag = get_rag_service()
            chunk_count = await rag.process_document(file_path, user_id)
            material.status = "ready"
            material.chunk_count = chunk_count
        except Exception as e:
            logger.error(f"RAG processing failed: {e}")
            material.status = "failed"

        db.commit()
        db.refresh(material)
        return material

    def get_materials(self, db: Session, user_id: str):
        return db.query(UploadedMaterial).filter(UploadedMaterial.user_id == user_id).order_by(UploadedMaterial.created_at.desc()).all()

    async def search_materials(self, db: Session, user_id: str, query: str) -> dict:
        rag = get_rag_service()
        if not rag.has_documents(user_id):
            return {"query": query, "results": [], "found": False}
        context = await rag.search(query, user_id, k=5)
        if not context:
            return {"query": query, "results": [], "found": False}
        return {"query": query, "results": context.split("\n\n"), "found": True}

    async def ask_document(self, db: Session, user_id: str, question: str) -> dict:
        rag = get_rag_service()
        if not rag.has_documents(user_id):
            return {"question": question, "answer": None, "found": False}

        context = await rag.search(question, user_id, k=5)
        if not context:
            return {"question": question, "answer": None, "found": False}

        readable_context = _flatten_context(context)
        # Trim context to ~1500 chars to keep total tokens within Groq OTPM limit
        if len(readable_context) > 1500:
            readable_context = readable_context[:1500] + "..."

        from app.llm.llm_service import get_llm_service
        llm = get_llm_service()
        prompt = f"""Answer the following question using ONLY the provided document context. If the answer is not in the context, say so clearly.

Document context:
{readable_context}

Question: {question}

Respond as a helpful tutor. Use bullet points and headings. Do NOT output JSON or raw data structures."""

        answer = await llm.generate(
            prompt,
            "You are a helpful assistant that answers questions based strictly on provided document content. Be accurate and cite relevant parts.",
            max_tokens=450,
        )
        return {"question": question, "answer": answer, "found": True}


material_service = MaterialService()
