
import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from services.shares.service import ShareService
from shared.database import get_db
from shared.schemas.schemas import (
    CreateShareLinkRequest,
    MessageResponse,
    ResolveShareRequest,
    ShareLinkOut,
    SharedFolderOut,
    ShareWithUserRequest,
)
from shared.utils.jwt_utils import get_current_user_id

router = APIRouter(prefix="/share", tags=["Shares"])


def _svc(db: AsyncSession = Depends(get_db)) -> ShareService:
    return ShareService(db)


@router.post(
    "/resolve/{token}",
    response_model=ShareLinkOut,
    summary="Résoudre un lien de partage public (accès sans compte)",
)
async def resolve_share(
    token: str,
    data: ResolveShareRequest,
    svc: ShareService = Depends(_svc),
):
    return await svc.resolve(token, data.password)



@router.post(
    "/links",
    response_model=ShareLinkOut,
    status_code=status.HTTP_201_CREATED,
    summary="Créer un lien de partage public",
)
async def create_link(
    data: CreateShareLinkRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    svc: ShareService = Depends(_svc),
):
    return await svc.create_link(user_id, data)


@router.get(
    "/links",
    response_model=list[ShareLinkOut],
    summary="Lister mes liens de partage",
)
async def list_links(
    user_id: uuid.UUID = Depends(get_current_user_id),
    svc: ShareService = Depends(_svc),
):
    return await svc.list_my_links(user_id)


@router.delete(
    "/links/{link_id}",
    response_model=MessageResponse,
    summary="Révoquer un lien de partage",
)
async def revoke_link(
    link_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    svc: ShareService = Depends(_svc),
):
    await svc.revoke(user_id, link_id)
    return MessageResponse(message="Lien révoqué.")



@router.post(
    "/internal",
    response_model=MessageResponse,
    summary="Partager un dossier avec un autre utilisateur",
)
async def share_with_user(
    data: ShareWithUserRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    svc: ShareService = Depends(_svc),
):
    result = await svc.share_with_user(user_id, data)
    return MessageResponse(message=result["message"])


@router.get(
    "/with-me",
    response_model=list[SharedFolderOut],
    summary="Dossiers partagés avec moi",
)
async def shared_with_me(
    user_id: uuid.UUID = Depends(get_current_user_id),
    svc: ShareService = Depends(_svc),
):
    return await svc.get_shared_with_me(user_id)

@router.get("/{token}/download")
async def download_via_share_token(
    token: str,
    password: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Téléchargement public via token de partage
    """
    import httpx
    from fastapi.responses import Response, StreamingResponse

    service = ShareService(db)
    link_out = await service.resolve(token, password)

    settings = get_settings()
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.get(
            f"{settings.files_service_url}/files/{link_out.file_item_id}/download"
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fichier introuvable ou inaccessible."
        )

    filename = link_out.file_item_name or "fichier"
    content_type = resp.headers.get("content-type", "application/octet-stream")

    return Response(
        content=resp.content,
        media_type=content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(resp.content)),
        },
    )


@router.get("/{token}/zip")
async def download_folder_via_share_token(
    token: str,
    password: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Téléchargement de dossier ZIP via token de partage."""
    import httpx
    from fastapi.responses import Response

    service = ShareService(db)
    link_out = await service.resolve(token, password)

    if not link_out.is_folder:
        raise HTTPException(status_code=400, detail="Ce lien ne pointe pas vers un dossier.")

    settings = get_settings()
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.get(
            f"{settings.files_service_url}/files/{link_out.file_item_id}/zip"
        )

    filename = f"{link_out.file_item_name or 'dossier'}.zip"
    return Response(
        content=resp.content,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
