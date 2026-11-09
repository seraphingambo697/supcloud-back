# services/shares/service.py

import os
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from services.shares.repository import ShareRepository
from shared.config import get_settings
from shared.schemas.schemas import (
    CreateShareLinkRequest,
    ShareLinkOut,
    SharedFolderOut,
    ShareWithUserRequest,
)

settings = get_settings()
_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

BASE_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")


class ShareService:

    def __init__(self, db: AsyncSession):
        self.repo = ShareRepository(db)

    def _link_to_out(self, link, item=None) -> ShareLinkOut:
        return ShareLinkOut(
            id=link.id,
            token=link.token,
            file_item_id=link.file_item_id,
            file_item_name=item.name if item else "",
            is_folder=(item.item_type.value == "folder") if item else False,
            has_password=link.password_hash is not None,
            expires_at=link.expires_at,
            download_count=link.download_count,
            url=f"{BASE_URL}/share/{link.token}",
            created_at=link.created_at,
        )

    # Créer un lien 

    async def create_link(
        self, owner_id: uuid.UUID, data: CreateShareLinkRequest
    ) -> ShareLinkOut:
        item = await self.repo.get_file_item(data.file_item_id)
        if not item or item.owner_id != owner_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Élément introuvable.")

        password_hash = _pwd_ctx.hash(data.password) if data.password else None
        link = await self.repo.create_link(
            file_item_id=data.file_item_id,
            created_by=owner_id,
            expires_at=data.expires_at,
            password_hash=password_hash,
        )
        return self._link_to_out(link, item)

    #  mes liens 

    async def list_my_links(self, owner_id: uuid.UUID) -> list[ShareLinkOut]:
        links = await self.repo.list_links_by_owner(owner_id)
        result = []
        for link in links:
            item = await self.repo.get_file_item(link.file_item_id)
            result.append(self._link_to_out(link, item))
        return result

    # Révoquer

    async def revoke(self, owner_id: uuid.UUID, link_id: uuid.UUID) -> None:
        ok = await self.repo.revoke_link(link_id, owner_id)
        if not ok:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lien introuvable.")

    # Résoudre (public) 

    async def resolve(self, token: str, password: str | None) -> ShareLinkOut:
        link = await self.repo.get_link_by_token(token)
        if not link:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lien invalide.")

        if link.expires_at and datetime.now(timezone.utc) > link.expires_at.replace(tzinfo=timezone.utc):
            raise HTTPException(status_code=status.HTTP_410_GONE, detail="Lien expiré.")

        if link.password_hash:
            if not password or not _pwd_ctx.verify(password, link.password_hash):
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Mot de passe incorrect.")

        await self.repo.increment_download(token)
        item = await self.repo.get_file_item(link.file_item_id)
        return self._link_to_out(link, item)

    #Partage interne

    async def share_with_user(
        self, owner_id: uuid.UUID, data: ShareWithUserRequest
    ) -> dict:
        item = await self.repo.get_file_item(data.folder_id)
        if not item or item.owner_id != owner_id or item.item_type.value != "folder":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dossier introuvable.")

        target = await self.repo.get_user_by_email(data.target_email)
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable.")
        if target.id == owner_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vous ne pouvez pas partager avec vous-même.")

        await self.repo.share_folder(data.folder_id, owner_id, target.id, data.can_edit)
        return {"message": f"Dossier partagé avec {target.email}."}

    async def get_shared_with_me(self, user_id: uuid.UUID) -> list[SharedFolderOut]:
        rows = await self.repo.get_folders_shared_with(user_id)
        result = []
        for row in rows:
            item = await self.repo.get_file_item(row.folder_id)
            result.append(SharedFolderOut(
                id=row.id,
                folder_id=row.folder_id,
                folder_name=item.name if item else "",
                shared_by_name="",
                shared_with_id=row.shared_with,
                can_edit=row.can_edit,
                created_at=row.created_at,
            ))
        return result
