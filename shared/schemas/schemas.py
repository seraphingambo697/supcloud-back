"""
Schémas Pydantic 
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, model_validator

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    email: str
    name: str
    avatar_url: str | None
    quota_bytes: int
    used_bytes: int
    is_oauth: bool = False
    oauth_provider: str | None
    created_at: datetime

    @model_validator(mode="after")
    def set_is_oauth(self):
        self.is_oauth = self.oauth_provider is not None
        return self


class UpdateProfileRequest(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=255)
    avatar_url: str | None = Field(None, max_length=512)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


class FileItemOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    item_type: str
    category: str
    parent_id: uuid.UUID | None
    owner_id: uuid.UUID
    size_bytes: int | None
    mime_type: str | None
    extension: str | None
    is_trashed: bool
    trashed_at: datetime | None
    is_shared: bool
    thumbnail_url: str | None = None
    created_at: datetime
    modified_at: datetime


class CreateFolderRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=512)
    parent_id: uuid.UUID | None = None


class RenameRequest(BaseModel):
    new_name: str = Field(..., min_length=1, max_length=512)


class MoveRequest(BaseModel):
    ids: list[str] = Field(..., min_length=1)  
    destination_folder_id: uuid.UUID | None = None


class TrashRequest(BaseModel):
    ids: list[str] = Field(..., min_length=1) 


class BreadcrumbItem(BaseModel):
    id: uuid.UUID | None
    name: str


class StorageStats(BaseModel):
    total_bytes: int
    used_bytes: int
    free_bytes: int
    by_category: dict[str, int]


class CreateShareLinkRequest(BaseModel):
    file_item_id: uuid.UUID
    expires_at: datetime | None = None
    password: str | None = Field(None, min_length=4, max_length=128)


class ShareLinkOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    token: str
    file_item_id: uuid.UUID
    file_item_name: str = ""
    is_folder: bool = False
    has_password: bool = False
    expires_at: datetime | None
    download_count: int
    url: str = ""
    created_at: datetime


class ResolveShareRequest(BaseModel):
    password: str | None = None


class ShareWithUserRequest(BaseModel):
    folder_id: uuid.UUID
    target_email: EmailStr
    can_edit: bool = False


class SharedFolderOut(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    folder_id: uuid.UUID
    folder_name: str = ""
    shared_by_name: str = ""
    shared_with_id: uuid.UUID
    can_edit: bool
    created_at: datetime


class MessageResponse(BaseModel):
    message: str


class ErrorResponse(BaseModel):
    detail: str
