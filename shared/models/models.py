"""
Modèles SQLAlchemy 
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger, Boolean, DateTime, Enum, ForeignKey,
    Integer, String, Text, func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base

import enum


class FileItemType(str, enum.Enum):
    file   = "file"
    folder = "folder"


class FileCategory(str, enum.Enum):
    image    = "image"
    video    = "video"
    audio    = "audio"
    document = "document"
    text     = "text"
    archive  = "archive"
    other    = "other"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    oauth_provider: Mapped[str | None] = mapped_column(String(50), nullable=True)
    oauth_sub: Mapped[str | None] = mapped_column(String(255), nullable=True)

    quota_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False, default=32_212_254_720)
    used_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    file_items: Mapped[list["FileItem"]] = relationship("FileItem", back_populates="owner", lazy="noload")


class FileItem(Base):
    __tablename__ = "file_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    item_type: Mapped[FileItemType] = mapped_column(
        Enum(FileItemType), nullable=False
    )
    category: Mapped[FileCategory] = mapped_column(
        Enum(FileCategory), nullable=False, default=FileCategory.other
    )

    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("file_items.id", ondelete="CASCADE"), nullable=True, index=True
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    extension: Mapped[str | None] = mapped_column(String(50), nullable=True)
    storage_path: Mapped[str | None] = mapped_column(Text, nullable=True)  
    thumbnail_path: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_trashed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    trashed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_shared: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    modified_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    owner: Mapped["User"] = relationship("User", back_populates="file_items", lazy="noload")
    children: Mapped[list["FileItem"]] = relationship(
        "FileItem", foreign_keys=[parent_id], lazy="noload"
    )
    share_links: Mapped[list["ShareLink"]] = relationship("ShareLink", back_populates="file_item", lazy="noload")


class ShareLink(Base):
    __tablename__ = "share_links"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    file_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("file_items.id", ondelete="CASCADE"), nullable=False
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    download_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    file_item: Mapped["FileItem"] = relationship("FileItem", back_populates="share_links", lazy="noload")


class SharedFolder(Base):
    __tablename__ = "shared_folders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    folder_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("file_items.id", ondelete="CASCADE"), nullable=False
    )
    shared_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    shared_with: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    can_edit: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
