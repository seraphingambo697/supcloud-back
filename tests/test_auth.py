"""
Tests unitaires du service Auth.
pytest tests/ -v
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import uuid

from fastapi import HTTPException
from services.auth.service import AuthService, hash_password, verify_password
from shared.schemas.schemas import LoginRequest, RegisterRequest


# Utilitaires 

def test_hash_and_verify_password():
    plain = "SuperSecret123!"
    hashed = hash_password(plain)
    assert hashed != plain
    assert verify_password(plain, hashed)
    assert not verify_password("wrong", hashed)


# Tests AuthService

@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.mark.asyncio
async def test_register_success(mock_db):
    with patch("services.auth.service.UserRepository") as MockRepo:
        repo = AsyncMock()
        repo.email_exists.return_value = False
        repo.create.return_value = MagicMock(
            id=uuid.uuid4(),
            email="test@supfile.io",
            name="Test User",
            avatar_url=None,
            quota_bytes=32_212_254_720,
            used_bytes=0,
            oauth_provider=None,
            oauth_sub=None,
            is_active=True,
            created_at=None,
            updated_at=None,
            password_hash="hashed",
        )
        MockRepo.return_value = repo

        svc = AuthService(mock_db)
        data = RegisterRequest(name="Test User", email="test@supfile.io", password="password123")
        user, token = await svc.register(data)

        assert user.email == "test@supfile.io"
        assert isinstance(token, str)
        assert len(token) > 10


@pytest.mark.asyncio
async def test_register_duplicate_email(mock_db):
    with patch("services.auth.service.UserRepository") as MockRepo:
        repo = AsyncMock()
        repo.email_exists.return_value = True
        MockRepo.return_value = repo

        svc = AuthService(mock_db)
        data = RegisterRequest(name="Test", email="existing@supfile.io", password="password123")

        with pytest.raises(HTTPException) as exc_info:
            await svc.register(data)
        assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_login_wrong_password(mock_db):
    with patch("services.auth.service.UserRepository") as MockRepo:
        repo = AsyncMock()
        repo.get_by_email.return_value = MagicMock(
            id=uuid.uuid4(),
            email="test@supfile.io",
            password_hash=hash_password("correct_password"),
            is_active=True,
        )
        MockRepo.return_value = repo

        svc = AuthService(mock_db)
        data = LoginRequest(email="test@supfile.io", password="wrong_password")

        with pytest.raises(HTTPException) as exc_info:
            await svc.login(data)
        assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(mock_db):
    with patch("services.auth.service.UserRepository") as MockRepo:
        repo = AsyncMock()
        repo.get_by_email.return_value = None
        MockRepo.return_value = repo

        svc = AuthService(mock_db)
        data = LoginRequest(email="ghost@supfile.io", password="any")

        with pytest.raises(HTTPException) as exc_info:
            await svc.login(data)
        assert exc_info.value.status_code == 401
