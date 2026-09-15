import os
import logging
from typing import List, Optional
from pathlib import Path

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from google import genai

from app.config import settings

logger = logging.getLogger(__name__)

VECTOR_STORE_DIR = "uploads/vector_stores"


class GeminiEmbeddings(Embeddings):
    def __init__(self, api_key: str, model: str = "gemini-embedding-001"):
        self.client = genai.Client(api_key=api_key)
        self.model = model

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        embeddings = []
        for text in texts:
            result = self.client.models.embed_content(model=self.model, contents=[text])
            embeddings.append(result.embeddings[0].values)
        return embeddings

    def embed_query(self, text: str) -> List[float]:
        result = self.client.models.embed_content(model=self.model, contents=[text])
        return result.embeddings[0].values


class RAGService:
    def __init__(self):
        self.embeddings = None
        self.text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        self._init_embeddings()

    def _init_embeddings(self):
        try:
            self.embeddings = GeminiEmbeddings(api_key=settings.GEMINI_API_KEY)
        except Exception as e:
            logger.warning(f"Embeddings init failed: {e}")

    def _get_store_path(self, user_id: str) -> str:
        path = os.path.join(VECTOR_STORE_DIR, user_id)
        os.makedirs(path, exist_ok=True)
        return path

    async def process_document(self, file_path: str, user_id: str) -> int:
        if not self.embeddings:
            raise RuntimeError("Embeddings not initialized")

        loader = PyPDFLoader(file_path)
        documents = loader.load()
        chunks = self.text_splitter.split_documents(documents)

        store_path = self._get_store_path(user_id)
        index_path = os.path.join(store_path, "faiss_index")

        if os.path.exists(index_path):
            vector_store = FAISS.load_local(index_path, self.embeddings, allow_dangerous_deserialization=True)
            vector_store.add_documents(chunks)
        else:
            vector_store = FAISS.from_documents(chunks, self.embeddings)

        vector_store.save_local(index_path)
        return len(chunks)

    async def search(self, query: str, user_id: str, k: int = 4) -> Optional[str]:
        if not self.embeddings:
            return None

        store_path = self._get_store_path(user_id)
        index_path = os.path.join(store_path, "faiss_index")

        if not os.path.exists(index_path):
            return None

        try:
            vector_store = FAISS.load_local(index_path, self.embeddings, allow_dangerous_deserialization=True)
            docs = vector_store.similarity_search(query, k=k)
            if not docs:
                return None
            return "\n\n".join([doc.page_content for doc in docs])
        except Exception as e:
            logger.error(f"RAG search failed: {e}")
            return None

    def has_documents(self, user_id: str) -> bool:
        store_path = self._get_store_path(user_id)
        index_path = os.path.join(store_path, "faiss_index")
        return os.path.exists(index_path)


_rag_service: Optional[RAGService] = None


def get_rag_service() -> RAGService:
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service
