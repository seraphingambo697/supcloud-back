"""
Logique métier du service Files.
"""

import uuid
from datetime import datetime

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from services.files.repository import FileRepository
from services.files.storage import StorageManager
from shared.config import get_settings
from shared.models.models import FileCategory, FileItem
from shared.schemas.schemas import (
    BreadcrumbItem,
    CreateFolderRequest,
    FileItemOut,
    MoveRequest,
    RenameRequest,
    StorageStats,
    TrashRequest,
)
from shared.utils.file_utils import (
    build_storage_path,
    category_from_mime,
    get_extension,
    is_image,
)

settings = get_settings()
storage = StorageManager()


def _to_out(item: FileItem) -> FileItemOut:
    """Convertit un modèle SQLAlchemy en schéma de sortie."""
    return FileItemOut(
        id=item.id,
        name=item.name,
        item_type=item.item_type.value,
        category=item.category.value,
        parent_id=item.parent_id,
        owner_id=item.owner_id,
        size_bytes=item.size_bytes,
        mime_type=item.mime_type,
        extension=item.extension,
        is_trashed=item.is_trashed,
        trashed_at=item.trashed_at,
        is_shared=item.is_shared,
        thumbnail_url=storage.thumbnail_url(item.thumbnail_path),
        created_at=item.created_at,
        modified_at=item.modified_at,
    )


class FileService:

    def __init__(self, db: AsyncSession):
        self.repo = FileRepository(db)


    async def list_folder(
        self,
        owner_id: uuid.UUID,
        folder_id: uuid.UUID | None,
    ) -> list[FileItemOut]:
        items = await self.repo.list_folder(owner_id, folder_id)
        return [_to_out(i) for i in items]


    async def create_folder(
        self, owner_id: uuid.UUID, data: CreateFolderRequest
    ) -> FileItemOut:
        if data.parent_id:
            parent = await self.repo.get_by_id_and_owner(data.parent_id, owner_id)
            if not parent or parent.item_type.value != "folder":
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Dossier parent introuvable.",
                )

        if await self.repo.name_exists_in_folder(owner_id, data.parent_id, data.name):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Un dossier '{data.name}' existe déjà ici.",
            )

        folder = await self.repo.create_folder(owner_id, data.name, data.parent_id)
        return _to_out(folder)


    async def upload_file(
        self,
        owner_id: uuid.UUID,
        file: UploadFile,
        parent_id: uuid.UUID | None,
        user_used_bytes: int,
        user_quota_bytes: int,
    ) -> tuple[FileItemOut, int]:
        """
        Sauvegarde un fichier uploadé.
        """
        data = await file.read()
        size = len(data)

        if user_used_bytes + size > user_quota_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Quota dépassé.",
            )

        if size > settings.max_upload_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Fichier trop volumineux (max {settings.max_upload_mb} MB).",
            )

        filename = file.filename or "upload"
        mime = file.content_type or "application/octet-stream"
        ext = get_extension(filename)
        category = category_from_mime(mime, ext)

        file_id = uuid.uuid4()
        rel_path = await storage.save(owner_id, file_id, filename, data)

        thumb_path: str | None = None
        if is_image(mime):
            thumb_data = storage.generate_thumbnail(data)
            if thumb_data:
                thumb_path = await storage.save_thumbnail(owner_id, file_id, thumb_data)

        item = await self.repo.create_file(
            owner_id=owner_id,
            name=filename,
            parent_id=parent_id,
            size_bytes=size,
            mime_type=mime,
            extension=ext,
            category=category,
            storage_path=rel_path,
            thumbnail_path=thumb_path,
        )

        return _to_out(item), size

    async def get_file_for_download(
        self, owner_id: uuid.UUID, file_id: uuid.UUID
    ) -> tuple[bytes, FileItem]:
        item = await self.repo.get_by_id_and_owner(file_id, owner_id)
        if not item or item.item_type.value != "file":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fichier introuvable.")
        if not item.storage_path:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fichier physique absent.")
        data = await storage.read(item.storage_path)
        return data, item

    async def build_folder_zip(
        self, owner_id: uuid.UUID, folder_id: uuid.UUID
    ) -> tuple[bytes, str]:
        """
        Collecte récursivement tous les fichiers d'un dossier
        """
        folder = await self.repo.get_by_id_and_owner(folder_id, owner_id)
        if not folder or folder.item_type.value != "folder":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dossier introuvable.")

        files: list[tuple[str, str]] = []
        await self._collect_files_recursive(owner_id, folder_id, folder.name, files)

        zip_bytes = storage.build_zip(files)
        return zip_bytes, f"{folder.name}.zip"

    async def _collect_files_recursive(
        self,
        owner_id: uuid.UUID,
        folder_id: uuid.UUID,
        prefix: str,
        acc: list[tuple[str, str]],
    ) -> None:
        items = await self.repo.list_folder(owner_id, folder_id)
        for item in items:
            if item.item_type.value == "file" and item.storage_path:
                acc.append((item.storage_path, f"{prefix}/{item.name}"))
            elif item.item_type.value == "folder":
                await self._collect_files_recursive(
                    owner_id, item.id, f"{prefix}/{item.name}", acc
                )

    async def rename(
        self, owner_id: uuid.UUID, file_id: uuid.UUID, data: RenameRequest
    ) -> FileItemOut:
        item = await self.repo.get_by_id_and_owner(file_id, owner_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Élément introuvable.")

        if await self.repo.name_exists_in_folder(owner_id, item.parent_id, data.new_name, exclude_id=file_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Un élément '{data.new_name}' existe déjà ici.",
            )

        updated = await self.repo.rename(file_id, data.new_name)
        return _to_out(updated)

    async def move(self, owner_id: uuid.UUID, data: MoveRequest) -> dict:
        if data.destination_folder_id:
            dest = await self.repo.get_by_id_and_owner(data.destination_folder_id, owner_id)
            if not dest or dest.item_type.value != "folder":
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination introuvable.")

        moved = await self.repo.move(
            [i for i in data.ids], data.destination_folder_id, owner_id
        )
        return {"moved": moved}

    async def trash(self, owner_id: uuid.UUID, data: TrashRequest) -> dict:
        await self.repo.set_trashed(list(data.ids), owner_id, trashed=True)
        return {"trashed": len(data.ids)}

    async def restore(self, owner_id: uuid.UUID, data: TrashRequest) -> dict:
        await self.repo.set_trashed(list(data.ids), owner_id, trashed=False)
        return {"restored": len(data.ids)}

    async def delete_permanently(
        self, owner_id: uuid.UUID, data: TrashRequest
    ) -> tuple[dict, int]:
        """Retourne (résultat, bytes_libérés) pour mise à jour quota."""
        items = await self.repo.delete_permanently(list(data.ids), owner_id)
        freed = 0
        for item in items:
            if item.storage_path:
                storage.delete(item.storage_path)
            if item.thumbnail_path:
                storage.delete(item.thumbnail_path)
            freed += item.size_bytes or 0
        return {"deleted": len(items)}, freed

    async def get_trashed(self, owner_id: uuid.UUID) -> list[FileItemOut]:
        items = await self.repo.get_trashed(owner_id)
        return [_to_out(i) for i in items]

    async def search(
        self,
        owner_id: uuid.UUID,
        query: str,
        category: str | None,
        modified_after: datetime | None,
    ) -> list[FileItemOut]:
        cat: FileCategory | None = None
        if category:
            try:
                cat = FileCategory(category)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Catégorie invalide : {category}",
                )
        items = await self.repo.search(owner_id, query, cat, modified_after)
        return [_to_out(i) for i in items]

    async def get_breadcrumb(
        self, owner_id: uuid.UUID, folder_id: uuid.UUID | None
    ) -> list[BreadcrumbItem]:
        crumbs = [BreadcrumbItem(id=None, name="Mon Drive")]
        if folder_id:
            ancestors = await self.repo.get_ancestors(folder_id)
            crumbs += [BreadcrumbItem(id=a.id, name=a.name) for a in ancestors]
        return crumbs

    async def get_storage_stats(
        self, owner_id: uuid.UUID, quota_bytes: int, used_bytes: int
    ) -> StorageStats:
        by_cat = await self.repo.storage_by_category(owner_id)
        return StorageStats(
            total_bytes=quota_bytes,
            used_bytes=used_bytes,
            free_bytes=max(0, quota_bytes - used_bytes),
            by_category=by_cat,
        )

    async def get_recent_files(
        self, owner_id: uuid.UUID, limit: int = 5
    ) -> list[FileItemOut]:
        items = await self.repo.get_recent_files(owner_id, limit)
        return [_to_out(i) for i in items]

    async def get_thumbnail(
        self, owner_id: uuid.UUID, file_id: uuid.UUID
    ) -> tuple[bytes, str]:
        item = await self.repo.get_by_id_and_owner(file_id, owner_id)
        if not item or not item.thumbnail_path:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thumbnail indisponible.")
        data = await storage.read(item.thumbnail_path)
        return data, "image/jpeg"
