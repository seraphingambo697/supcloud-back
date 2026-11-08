# services/auth/service.py
"""
Logique métier du service Auth.
"""

import uuid

from fastapi import HTTPException, status
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from services.auth.repository import UserRepository
from shared.models.models import User
from shared.schemas.schemas import (
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    UpdateProfileRequest,
)
from shared.utils.jwt_utils import create_access_token

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return _pwd_ctx.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_ctx.verify(plain, hashed)


# Service 

class AuthService:

    def __init__(self, db: AsyncSession):
        self.repo = UserRepository(db)

    async def register(self, data: RegisterRequest) -> tuple[User, str]:
        """
        Crée un compte email/mdp.
        """
        if await self.repo.email_exists(data.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Un compte existe déjà avec cet email.",
            )

        user = await self.repo.create(
            name=data.name,
            email=data.email,
            password_hash=hash_password(data.password),
        )
        token = create_access_token(user.id, user.email)
        return user, token


    async def login(self, data: LoginRequest) -> tuple[User, str]:
        """
        Vérifie email + mot de passe.
        """
        user = await self.repo.get_by_email(data.email)

        dummy_hash = "$2b$12$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        stored = user.password_hash if (user and user.password_hash) else dummy_hash

        if not verify_password(data.password, stored) or user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou mot de passe incorrect.",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Compte désactivé.",
            )

        token = create_access_token(user.id, user.email)
        return user, token

    async def login_or_create_oauth(
        self,
        *,
        provider: str,
        sub: str,
        email: str,
        name: str,
        avatar_url: str | None = None,
    ) -> tuple[User, str]:
        """
        Trouve ou crée un utilisateur OAuth2.
        """
        user = await self.repo.get_by_oauth(provider, sub)

        if not user:
            user = await self.repo.get_by_email(email)
            if user:
                await self.repo.update_profile(
                    user.id,
                    avatar_url=avatar_url or user.avatar_url,
                )
            else:
                user = await self.repo.create(
                    name=name,
                    email=email,
                    oauth_provider=provider,
                    oauth_sub=sub,
                    avatar_url=avatar_url,
                )

        token = create_access_token(user.id, user.email)
        return user, token


    async def get_user(self, user_id: uuid.UUID) -> User:
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable.")
        return user

    async def update_profile(self, user_id: uuid.UUID, data: UpdateProfileRequest) -> User:
        user = await self.repo.update_profile(
            user_id,
            name=data.name,
            avatar_url=data.avatar_url,
        )
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable.")
        return user

    async def change_password(self, user_id: uuid.UUID, data: ChangePasswordRequest) -> None:
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable.")
        if not user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Compte OAuth — pas de mot de passe à changer.",
            )
        if not verify_password(data.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Mot de passe actuel incorrect.",
            )
        await self.repo.update_password(user_id, hash_password(data.new_password))