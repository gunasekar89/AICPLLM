from __future__ import annotations

import json
from dataclasses import asdict
from datetime import datetime
from typing import Any, Dict, Generator, List, Optional

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from config import settings
from database.chat_store import chat_store
from models.ollama_interface import OllamaInterface, iter_messages_for_chat
from utils.text_extractor import extract_text_from_upload

app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_store() -> Any:
    return chat_store


def get_ollama() -> OllamaInterface:
    return OllamaInterface()


class ChatResponse(BaseModel):
    id: int
    title: str
    created_at: datetime


class MessageResponse(BaseModel):
    id: int
    chat_id: int
    role: str
    content: str
    created_at: datetime


class ChatCreateRequest(BaseModel):
    title: Optional[str] = None


class RenameChatRequest(BaseModel):
    title: str


class ChatMessageRequest(BaseModel):
    prompt: str
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None


class ChatResponseChunk(BaseModel):
    message: str
    is_end: bool = False


class SettingsResponse(BaseModel):
    default_model: str
    default_temperature: float
    default_max_tokens: int


@app.get("/api/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/api/settings", response_model=SettingsResponse)
def read_settings() -> SettingsResponse:
    return SettingsResponse(
        default_model=settings.default_model,
        default_temperature=settings.default_temperature,
        default_max_tokens=settings.default_max_tokens,
    )


@app.get("/api/chats", response_model=List[ChatResponse])
def list_chats(store=Depends(get_store)) -> List[ChatResponse]:
    return [ChatResponse(**asdict(chat)) for chat in store.list_chats()]


@app.post("/api/chats", response_model=ChatResponse)
def create_chat(request: ChatCreateRequest, store=Depends(get_store)) -> ChatResponse:
    chat = store.create_chat(request.title)
    return ChatResponse(**asdict(chat))


@app.delete("/api/chats/{chat_id}")
def delete_chat(chat_id: int, store=Depends(get_store)) -> Dict[str, str]:
    store.delete_chat(chat_id)
    return {"status": "deleted"}


@app.patch("/api/chats/{chat_id}")
def rename_chat(chat_id: int, request: RenameChatRequest, store=Depends(get_store)) -> Dict[str, str]:
    store.rename_chat(chat_id, request.title)
    return {"status": "renamed"}


@app.get("/api/chats/{chat_id}/messages", response_model=List[MessageResponse])
def get_messages(chat_id: int, store=Depends(get_store)) -> List[MessageResponse]:
    return [MessageResponse(**asdict(message)) for message in store.get_messages(chat_id)]


@app.post("/api/chats/{chat_id}/message")
def create_message(
    chat_id: int,
    request: ChatMessageRequest,
    store=Depends(get_store),
    ollama: OllamaInterface = Depends(get_ollama),
) -> StreamingResponse:
    history = [
        {"role": message.role, "content": message.content}
        for message in store.get_messages(chat_id)
    ]

    selected_model = request.model or settings.default_model
    temperature = request.temperature or settings.default_temperature
    max_tokens = request.max_tokens or settings.default_max_tokens

    store.add_message(chat_id, "user", request.prompt)

    def event_stream() -> Generator[bytes, None, None]:
        assistant_content = []
        try:
            for chunk in ollama.stream_chat(
                prompt=request.prompt,
                model=selected_model,
                temperature=temperature,
                max_tokens=max_tokens,
                chat_history=iter_messages_for_chat(history),
            ):
                assistant_content.append(chunk)
                payload = ChatResponseChunk(message=chunk, is_end=False)
                yield f"data: {payload.json()}\n\n".encode("utf-8")
        except RuntimeError as exc:
            error_payload = {"error": str(exc)}
            yield f"data: {json.dumps(error_payload)}\n\n".encode("utf-8")
            return
        assistant_message = "".join(assistant_content)
        store.add_message(chat_id, "assistant", assistant_message)
        payload = ChatResponseChunk(message="", is_end=True)
        yield f"data: {payload.json()}\n\n".encode("utf-8")

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/api/upload")
def upload_file(file: UploadFile = File(...)) -> Dict[str, str]:
    try:
        text = extract_text_from_upload(file)
    except Exception as exc:  # pragma: no cover - user feedback
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"filename": file.filename or "", "text": text}


@app.exception_handler(RuntimeError)
async def runtime_error_handler(_, exc: RuntimeError) -> JSONResponse:  # pragma: no cover
    return JSONResponse(status_code=500, content={"detail": str(exc)})
