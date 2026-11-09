"""Tests unitaires du service Files."""

import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException
from services.files.service import FileService
from shared.schemas.schemas import CreateFolderRequest, RenameRequest, TrashRequest
from shared.models.models import FileCategory, FileItemType


def _mock_folder(name="Docs", parent_id=None):
    f = MagicMock()
    f.id = uuid.uuid4()
    f.name = name
    f.item_type = MagicMock(value="folder")
    f.category = MagicMock(value="other")
    f.parent_id = parent_id
    f.owner_id = uuid.uuid4()
    f.size_bytes = None
    f.mime_type = None
    f.extension = None
    f.is_trashed = False
    f.trashed_at = None
    f.is_shared = False
    f.thumbnail_path = None
    f.created_at = None
    f.modified_at = None
    return f


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.mark.asyncio
async def test_create_folder_success(mock_db):
    owner_id = uuid.uuid4()
    with patch("services.files.service.FileRepository") as MockRepo:
        repo = AsyncMock()
        repo.name_exists_in_folder.return_value = False
        folder = _mock_folder("TestFolder")
        repo.create_folder.return_value = folder
        MockRepo.return_value = repo

        svc = FileService(mock_db)
        data = CreateFolderRequest(name="TestFolder", parent_id=None)
        result = await svc.create_folder(owner_id, data)

        assert result.name == "TestFolder"
        repo.create_folder.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_folder_duplicate_name(mock_db):
    owner_id = uuid.uuid4()
    with patch("services.files.service.FileRepository") as MockRepo:
        repo = AsyncMock()
        repo.name_exists_in_folder.return_value = True
        MockRepo.return_value = repo

        svc = FileService(mock_db)
        data = CreateFolderRequest(name="Existing", parent_id=None)

        with pytest.raises(HTTPException) as exc_info:
            await svc.create_folder(owner_id, data)
        assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_rename_not_found(mock_db):
    owner_id = uuid.uuid4()
    file_id = uuid.uuid4()
    with patch("services.files.service.FileRepository") as MockRepo:
        repo = AsyncMock()
        repo.get_by_id_and_owner.return_value = None
        MockRepo.return_value = repo

        svc = FileService(mock_db)
        with pytest.raises(HTTPException) as exc_info:
            await svc.rename(owner_id, file_id, RenameRequest(new_name="new"))
        assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_get_breadcrumb_root(mock_db):
    owner_id = uuid.uuid4()
    with patch("services.files.service.FileRepository"):
        svc = FileService(mock_db)
        crumbs = await svc.get_breadcrumb(owner_id, None)
        assert len(crumbs) == 1
        assert crumbs[0].name == "Mon Drive"
        assert crumbs[0].id is None
