import secrets
import uuid
from datetime import datetime, timezone

from sqlalchemy import and_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from shared.models.models import FileItem, ShareLink, SharedFolder, User

def _naive_utc(dt: datetime | None) -> datetime | None:
    """Convertit une date avec fuseau en date UTC """
    if dt is not None and dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt
class ShareRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    # ShareLink 

    async def get_link_by_id(self, link_id: uuid.UUID) -> ShareLink | None:
        r = await self.db.execute(select(ShareLink).where(ShareLink.id == link_id))
        return r.scalar_one_or_none()

    async def get_link_by_token(self, token: str) -> ShareLink | None:
        r = await self.db.execute(
            select(ShareLink).where(ShareLink.token == token, ShareLink.is_active == True)  # noqa: E712
        )
        return r.scalar_one_or_none()

    async def list_links_by_owner(self, owner_id: uuid.UUID) -> list[ShareLink]:
        r = await self.db.execute(
            select(ShareLink)
            .where(ShareLink.created_by == owner_id)
            .order_by(ShareLink.created_at.desc())
        )
        return list(r.scalars().all())

    async def create_link(
        self,
        file_item_id: uuid.UUID,
        created_by: uuid.UUID,
        expires_at: datetime | None,
        password_hash: str | None,
    ) -> ShareLink:
        token = secrets.token_urlsafe(24)
        link = ShareLink(
            token=token,
            file_item_id=file_item_id,
            created_by=created_by,
            expires_at=_naive_utc(expires_at),
            password_hash=password_hash,
        )
        self.db.add(link)
        await self.db.flush()
        await self.db.refresh(link)
        return link

    async def revoke_link(self, link_id: uuid.UUID, owner_id: uuid.UUID) -> bool:
        r = await self.db.execute(
            update(ShareLink)
            .where(ShareLink.id == link_id, ShareLink.created_by == owner_id)
            .values(is_active=False)
        )
        return r.rowcount > 0  # type: ignore[return-value]

    async def increment_download(self, token: str) -> None:
        link = await self.get_link_by_token(token)
        if link:
            await self.db.execute(
                update(ShareLink)
                .where(ShareLink.token == token)
                .values(download_count=ShareLink.download_count + 1)
            )

    async def get_file_item(self, item_id: uuid.UUID) -> FileItem | None:
        r = await self.db.execute(select(FileItem).where(FileItem.id == item_id))
        return r.scalar_one_or_none()

    # SharedFolder

    async def share_folder(
        self,
        folder_id: uuid.UUID,
        shared_by: uuid.UUID,
        shared_with: uuid.UUID,
        can_edit: bool,
    ) -> SharedFolder:
        existing = await self.db.execute(
            select(SharedFolder).where(
                SharedFolder.folder_id == folder_id,
                SharedFolder.shared_with == shared_with,
            )
        )
        sf = existing.scalar_one_or_none()
        if sf:
            await self.db.execute(
                update(SharedFolder)
                .where(SharedFolder.id == sf.id)
                .values(can_edit=can_edit)
            )
            return sf

        sf = SharedFolder(
            folder_id=folder_id,
            shared_by=shared_by,
            shared_with=shared_with,
            can_edit=can_edit,
        )
        self.db.add(sf)
        await self.db.flush()
        await self.db.refresh(sf)
        return sf

    async def get_folders_shared_with(self, user_id: uuid.UUID) -> list[SharedFolder]:
        r = await self.db.execute(
            select(SharedFolder)
            .where(SharedFolder.shared_with == user_id)
            .order_by(SharedFolder.created_at.desc())
        )
        return list(r.scalars().all())

    async def get_folders_shared_by(self, user_id: uuid.UUID) -> list[SharedFolder]:
        r = await self.db.execute(
            select(SharedFolder)
            .where(SharedFolder.shared_by == user_id)
            .order_by(SharedFolder.created_at.desc())
        )
        return list(r.scalars().all())

    async def get_user_by_email(self, email: str) -> User | None:
        r = await self.db.execute(select(User).where(User.email == email.lower()))
        return r.scalar_one_or_none()
