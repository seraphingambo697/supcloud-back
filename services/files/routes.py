# services/files/routes.py

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from services.files.service import FileService
from services.auth.repository import UserRepository
from shared.database import get_db
from shared.schemas.schemas import (
    BreadcrumbItem,
    CreateFolderRequest,
    FileItemOut,
    MessageResponse,
    MoveRequest,
    RenameRequest,
    StorageStats,
    TrashRequest,
)
from shared.utils.jwt_utils import get_current_user_id

router = APIRouter(prefix="/files", tags=["Files"])


def _svc(db: AsyncSession = Depends(get_db)) -> FileService:
    return FileService(db)


async def _get_user_quota(
    user_id: uuid.UUID,
    db: AsyncSession,
) -> tuple[int, int]:
    """Retourne (used_bytes, quota_bytes) de l'utilisateur courant."""
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        return 0, 0
    return user.used_bytes, user.quota_bytes



@router.get(
    "",
    response_model=list[FileItemOut],
    summary="Lister le contenu d'un dossier",
)
async def list_folder(
    folder_id: Optional[uuid.UUID] = Query(None),
    user_id: uuid.UUID = Depends(get_current_user_id),
    svc: FileService = Depends(_svc),
):
    return await svc.list_folder(user_id, folder_id)



@router.get(
    "/breadcrumb",
    response_model=list[BreadcrumbItem],
    summary="Fil d'Ariane pour un dossier",
)
async def breadcrumb(
    folder_id: Optional[uuid.UUID] = Query(None),
    user_id: uuid.UUID = Depends(get_current_user_id),
    svc: FileService = Depends(_svc),
):
    return await svc.get_breadcrumb(user_id, folder_id)



@router.get(
    "/recent",
    response_model=list[FileItemOut],
    summary="5 derniers fichiers modifiés",
)
async def recent_files(
    limit: int = Query(5, ge=1, le=20),
    user_id: uuid.UUID = Depends(get_current_user_id),
    svc: FileService = Depends(_svc),
):
    return await svc.get_recent_files(user_id, limit)


@router.get(
    "/stats",
    response_model=StorageStats,
    summary="Répartition du stockage par catégorie",
)
async def storage_stats(
    user_id: uuid.UUID = Depends(get_current_user_id),
    svc: FileService = Depends(_svc),
    db: AsyncSession = Depends(get_db),
):
    used, quota = await _get_user_quota(user_id, db)
    return await svc.get_storage_stats(user_id, quota, used)


#Corbeille 

@router.get(
    "/trash",
    response_model=list[FileItemOut],
    summary="Contenu de la corbeille",
)
async def list_trash(
    user_id: uuid.UUID = Depends(get_current_user_id),
    svc: FileService = Depends(_svc),
):
    return await svc.get_trashed(user_id)


@router.post(
    "/trash/restore",
    response_model=MessageResponse,
    summary="Restaurer des éléments depuis la corbeille",
)
async def restore(
    data: TrashRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    svc: FileService = Depends(_svc),
):
    result = await svc.restore(user_id, data)
    return MessageResponse(message=f"{result['restored']} élément(s) restauré(s).")


@router.delete(
    "/trash",
    response_model=MessageResponse,
    summary="Vider la corbeille (suppression définitive)",
)
async def empty_trash(
    data: TrashRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    svc: FileService = Depends(_svc),
    db: AsyncSession = Depends(get_db),
):
    result, freed = await svc.delete_permanently(user_id, data)
    # Mettre à jour le quota
    repo = UserRepository(db)
    await repo.add_used_bytes(user_id, -freed)
    return MessageResponse(message=f"{result['deleted']} élément(s) supprimé(s).")


# Recherche

@router.get(
    "/search",
    response_model=list[FileItemOut],
    summary="Rechercher des fichiers par nom, extension, catégorie ou date",
)
async def search(
    q: str = Query(..., min_length=1),
    category: Optional[str] = Query(None),
    modified_after: Optional[datetime] = Query(None),
    user_id: uuid.UUID = Depends(get_current_user_id),
    svc: FileService = Depends(_svc),
):
    return await svc.search(user_id, q, category, modified_after)


# Créer un dossier 

@router.post(
    "/folder",
    response_model=FileItemOut,
    status_code=status.HTTP_201_CREATED,
    summary="Créer un nouveau dossier",
)
async def create_folder(
    data: CreateFolderRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    svc: FileService = Depends(_svc),
):
    return await svc.create_folder(user_id, data)


# Upload 

@router.post(
    "/upload",
    response_model=FileItemOut,
    status_code=status.HTTP_201_CREATED,
    summary="Uploader un fichier (multipart/form-data)",
)
async def upload_file(
    file: UploadFile = File(...),
    parent_id: Optional[uuid.UUID] = Form(None),
    user_id: uuid.UUID = Depends(get_current_user_id),
    svc: FileService = Depends(_svc),
    db: AsyncSession = Depends(get_db),
):
    used, quota = await _get_user_quota(user_id, db)
    item, size = await svc.upload_file(user_id, file, parent_id, used, quota)

    # Mettre à jour le quota utilisé
    repo = UserRepository(db)
    await repo.add_used_bytes(user_id, size)

    return item


# Download fichier

@router.get(
    "/{file_id}/download",
    summary="Télécharger un fichier",
)
async def download_file(
    file_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    svc: FileService = Depends(_svc),
):
    data, item = await svc.get_file_for_download(user_id, file_id)
    return Response(
        content=data,
        media_type=item.mime_type or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{item.name}"'},
    )


# Streaming (audio/vidéo)

@router.get(
    "/{file_id}/stream",
    summary="Streaming audio/vidéo",
)
async def stream_file(
    file_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    svc: FileService = Depends(_svc),
):
    data, item = await svc.get_file_for_download(user_id, file_id)

    def _iter():
        chunk_size = 64 * 1024 
        for i in range(0, len(data), chunk_size):
            yield data[i:i + chunk_size]

    return StreamingResponse(
        _iter(),
        media_type=item.mime_type or "application/octet-stream",
        headers={"Accept-Ranges": "bytes"},
    )


# Download dossier ZIP 

@router.get(
    "/{folder_id}/zip",
    summary="Télécharger un dossier entier en ZIP",
)
async def download_folder_zip(
    folder_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    svc: FileService = Depends(_svc),
):
    zip_bytes, filename = await svc.build_folder_zip(user_id, folder_id)
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# Thumbnail 

@router.get(
    "/{file_id}/thumbnail",
    summary="Récupérer le thumbnail d'une image",
)
async def get_thumbnail(
    file_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    svc: FileService = Depends(_svc),
):
    data, mime = await svc.get_thumbnail(user_id, file_id)
    return Response(content=data, media_type=mime)


# Renommer

@router.patch(
    "/{file_id}/rename",
    response_model=FileItemOut,
    summary="Renommer un fichier ou dossier",
)
async def rename(
    file_id: uuid.UUID,
    data: RenameRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    svc: FileService = Depends(_svc),
):
    return await svc.rename(user_id, file_id, data)


# Déplacer

@router.post(
    "/move",
    response_model=MessageResponse,
    summary="Déplacer des éléments vers un dossier",
)
async def move(
    data: MoveRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    svc: FileService = Depends(_svc),
):
    result = await svc.move(user_id, data)
    return MessageResponse(message=f"{result['moved']} élément(s) déplacé(s).")


#Corbeille 

@router.post(
    "/trash",
    response_model=MessageResponse,
    summary="Mettre des éléments à la corbeille",
)
async def trash(
    data: TrashRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    svc: FileService = Depends(_svc),
):
    result = await svc.trash(user_id, data)
    return MessageResponse(message=f"{result['trashed']} élément(s) mis à la corbeille.")
