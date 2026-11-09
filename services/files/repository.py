"""
Couche d'accès aux données pour le service Files.
"""

import uuid
from datetime import datetime

from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from shared.models.models import FileCategory, FileItem, FileItemType


class FileRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, file_id: uuid.UUID) -> FileItem | None:
        result = await self.db.execute(
            select(FileItem).where(FileItem.id == file_id)
        )
        return result.scalar_one_or_none()

    async def get_by_id_and_owner(
        self, file_id: uuid.UUID, owner_id: uuid.UUID
    ) -> FileItem | None:
        result = await self.db.execute(
            select(FileItem).where(
                FileItem.id == file_id,
                FileItem.owner_id == owner_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_folder(
        self,
        owner_id: uuid.UUID,
        parent_id: uuid.UUID | None,
        include_trashed: bool = False,
    ) -> list[FileItem]:
        """Liste le contenu d'un dossier ("""
        conditions = [
            FileItem.owner_id == owner_id,
            FileItem.parent_id == parent_id,
        ]
        if not include_trashed:
            conditions.append(FileItem.is_trashed == False)  # noqa: E712

        result = await self.db.execute(
            select(FileItem)
            .where(and_(*conditions))
            .order_by(FileItem.item_type.desc(), FileItem.name)
        )
        return list(result.scalars().all())

    async def get_recent_files(
        self, owner_id: uuid.UUID, limit: int = 5
    ) -> list[FileItem]:
        result = await self.db.execute(
            select(FileItem)
            .where(
                FileItem.owner_id == owner_id,
                FileItem.item_type == FileItemType.file,
                FileItem.is_trashed == False,  # noqa: E712
            )
            .order_by(FileItem.modified_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_trashed(self, owner_id: uuid.UUID) -> list[FileItem]:
        result = await self.db.execute(
            select(FileItem).where(
                FileItem.owner_id == owner_id,
                FileItem.is_trashed == True,  # noqa: E712
            ).order_by(FileItem.trashed_at.desc())
        )
        return list(result.scalars().all())

    async def search(
        self,
        owner_id: uuid.UUID,
        query: str,
        category: FileCategory | None = None,
        modified_after: datetime | None = None,
    ) -> list[FileItem]:
        conditions = [
            FileItem.owner_id == owner_id,
            FileItem.is_trashed == False,  # noqa: E712
            or_(
                FileItem.name.ilike(f"%{query}%"),
                FileItem.extension.ilike(f"%{query}%"),
            ),
        ]
        if category:
            conditions.append(FileItem.category == category)
        if modified_after:
            conditions.append(FileItem.modified_at >= modified_after)

        result = await self.db.execute(
            select(FileItem)
            .where(and_(*conditions))
            .order_by(FileItem.modified_at.desc())
            .limit(100)
        )
        return list(result.scalars().all())

    async def get_ancestors(self, folder_id: uuid.UUID) -> list[FileItem]:
        """Retourne la liste des dossiers parents pour le breadcrumb."""
        ancestors: list[FileItem] = []
        current_id: uuid.UUID | None = folder_id
        visited: set[uuid.UUID] = set()

        while current_id and current_id not in visited:
            visited.add(current_id)
            item = await self.get_by_id(current_id)
            if not item:
                break
            ancestors.insert(0, item)
            current_id = item.parent_id

        return ancestors

    async def storage_by_category(self, owner_id: uuid.UUID) -> dict[str, int]:
        result = await self.db.execute(
            select(FileItem.category, func.sum(FileItem.size_bytes))
            .where(
                FileItem.owner_id == owner_id,
                FileItem.item_type == FileItemType.file,
                FileItem.is_trashed == False,  # noqa: E712
                FileItem.size_bytes.is_not(None),
            )
            .group_by(FileItem.category)
        )
        return {str(row[0].value): int(row[1] or 0) for row in result.all()}

    async def name_exists_in_folder(
        self,
        owner_id: uuid.UUID,
        parent_id: uuid.UUID | None,
        name: str,
        exclude_id: uuid.UUID | None = None,
    ) -> bool:
        conditions = [
            FileItem.owner_id == owner_id,
            FileItem.parent_id == parent_id,
            FileItem.name == name,
            FileItem.is_trashed == False,  # noqa: E712
        ]
        if exclude_id:
            conditions.append(FileItem.id != exclude_id)
        result = await self.db.execute(
            select(FileItem.id).where(and_(*conditions))
        )
        return result.scalar_one_or_none() is not None

    async def create_folder(
        self,
        owner_id: uuid.UUID,
        name: str,
        parent_id: uuid.UUID | None,
    ) -> FileItem:
        folder = FileItem(
            name=name,
            item_type=FileItemType.folder,
            category=FileCategory.other,
            parent_id=parent_id,
            owner_id=owner_id,
        )
        self.db.add(folder)
        await self.db.flush()
        await self.db.refresh(folder)
        return folder

    async def create_file(
        self,
        owner_id: uuid.UUID,
        name: str,
        parent_id: uuid.UUID | None,
        size_bytes: int,
        mime_type: str,
        extension: str,
        category: FileCategory,
        storage_path: str,
        thumbnail_path: str | None = None,
    ) -> FileItem:
        file_item = FileItem(
            name=name,
            item_type=FileItemType.file,
            category=category,
            parent_id=parent_id,
            owner_id=owner_id,
            size_bytes=size_bytes,
            mime_type=mime_type,
            extension=extension,
            storage_path=storage_path,
            thumbnail_path=thumbnail_path,
        )
        self.db.add(file_item)
        await self.db.flush()
        await self.db.refresh(file_item)
        return file_item

    async def rename(
        self, file_id: uuid.UUID, new_name: str
    ) -> FileItem | None:
        await self.db.execute(
            update(FileItem)
            .where(FileItem.id == file_id)
            .values(name=new_name, modified_at=func.now())
        )
        return await self.get_by_id(file_id)

    async def move(
        self,
        file_ids: list[uuid.UUID],
        destination_id: uuid.UUID | None,
        owner_id: uuid.UUID,
    ) -> int:
        result = await self.db.execute(
            update(FileItem)
            .where(
                FileItem.id.in_(file_ids),
                FileItem.owner_id == owner_id,
            )
            .values(parent_id=destination_id, modified_at=func.now())
        )
        return result.rowcount  

    async def set_trashed(
        self,
        file_ids: list[uuid.UUID],
        owner_id: uuid.UUID,
        trashed: bool,
    ) -> None:
        values: dict = {"is_trashed": trashed}
        values["trashed_at"] = func.now() if trashed else None
        await self.db.execute(
            update(FileItem)
            .where(
                FileItem.id.in_(file_ids),
                FileItem.owner_id == owner_id,
            )
            .values(**values)
        )

    async def delete_permanently(
        self, file_ids: list[uuid.UUID], owner_id: uuid.UUID
    ) -> list[FileItem]:
        """Retourne les items supprimés"""
        result = await self.db.execute(
            select(FileItem).where(
                FileItem.id.in_(file_ids),
                FileItem.owner_id == owner_id,
            )
        )
        items = list(result.scalars().all())
        for item in items:
            await self.db.delete(item)
        return items

    async def update_thumbnail(
        self, file_id: uuid.UUID, thumbnail_path: str
    ) -> None:
        await self.db.execute(
            update(FileItem)
            .where(FileItem.id == file_id)
            .values(thumbnail_path=thumbnail_path)
        )
