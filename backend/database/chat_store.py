from __future__ import annotations

from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime
from typing import Iterable, List, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker

from config import settings


db_engine = create_engine(f"sqlite:///{settings.sqlite_path}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=db_engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


class Chat(Base):
    __tablename__ = "chats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), default="New Chat")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    messages: Mapped[List[Message]] = relationship("Message", back_populates="chat", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    chat_id: Mapped[int] = mapped_column(ForeignKey("chats.id", ondelete="CASCADE"))
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    chat: Mapped[Chat] = relationship("Chat", back_populates="messages")


Base.metadata.create_all(bind=db_engine)


@contextmanager
def get_session() -> Iterable[Session]:
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


@dataclass
class ChatDTO:
    id: int
    title: str
    created_at: datetime


@dataclass
class MessageDTO:
    id: int
    chat_id: int
    role: str
    content: str
    created_at: datetime


class ChatStore:
    def list_chats(self) -> List[ChatDTO]:
        with get_session() as session:
            chats = session.query(Chat).order_by(Chat.created_at.desc()).all()
            return [ChatDTO(id=chat.id, title=chat.title, created_at=chat.created_at) for chat in chats]

    def create_chat(self, title: Optional[str] = None) -> ChatDTO:
        with get_session() as session:
            chat = Chat(title=title or "New Chat")
            session.add(chat)
            session.flush()
            return ChatDTO(id=chat.id, title=chat.title, created_at=chat.created_at)

    def delete_chat(self, chat_id: int) -> None:
        with get_session() as session:
            chat = session.get(Chat, chat_id)
            if chat:
                session.delete(chat)

    def rename_chat(self, chat_id: int, title: str) -> None:
        with get_session() as session:
            chat = session.get(Chat, chat_id)
            if chat:
                chat.title = title

    def add_message(self, chat_id: int, role: str, content: str) -> MessageDTO:
        with get_session() as session:
            message = Message(chat_id=chat_id, role=role, content=content)
            session.add(message)
            session.flush()
            return MessageDTO(
                id=message.id,
                chat_id=chat_id,
                role=role,
                content=content,
                created_at=message.created_at,
            )

    def get_messages(self, chat_id: int) -> List[MessageDTO]:
        with get_session() as session:
            messages = (
                session.query(Message)
                .filter(Message.chat_id == chat_id)
                .order_by(Message.created_at.asc())
                .all()
            )
            return [
                MessageDTO(
                    id=message.id,
                    chat_id=message.chat_id,
                    role=message.role,
                    content=message.content,
                    created_at=message.created_at,
                )
                for message in messages
            ]


chat_store = ChatStore()
