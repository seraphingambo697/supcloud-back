"""
Couche d'accès aux données.
"""
import uuid

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from shared.models.models import User


class UserRepository:
    """CRUD utilisateurs — async SQLAlchemy."""

    def __init__(self, db: AsyncSession):
        self.db = db


    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        result = await self.db.execute(
            select(User).where(User.email == email.lower())
        )
        return result.scalar_one_or_none()

    async def get_by_oauth(self, provider: str, sub: str) -> User | None:
        result = await self.db.execute(
            select(User).where(
                User.oauth_provider == provider,
                User.oauth_sub == sub,
            )
        )
        return result.scalar_one_or_none()

    async def email_exists(self, email: str) -> bool:
        result = await self.db.execute(
            select(User.id).where(User.email == email.lower())
        )
        return result.scalar_one_or_none() is not None
 

    async def create(
        self,
        *,
        name: str,
        email: str,
        password_hash: str | None = None,
        oauth_provider: str | None = None,
        oauth_sub: str | None = None,
        avatar_url: str | None = None,
        quota_bytes: int = 32_212_254_720,
    ) -> User:
        user = User(
            name=name,
            email=email.lower(),
            password_hash=password_hash,
            oauth_provider=oauth_provider,
            oauth_sub=oauth_sub,
            avatar_url=avatar_url,
            quota_bytes=quota_bytes,
        )
        self.db.add(user)
        await self.db.flush()   
        await self.db.refresh(user)
        return user

    async def update_profile(
        self,
        user_id: uuid.UUID,
        *,
        name: str | None = None,
        avatar_url: str | None = None,
    ) -> User | None:
        values: dict = {}
        if name is not None:
            values["name"] = name
        if avatar_url is not None:
            values["avatar_url"] = avatar_url
        if not values:
            return await self.get_by_id(user_id)

        await self.db.execute(
            update(User).where(User.id == user_id).values(**values)
        )
        return await self.get_by_id(user_id)

    async def update_password(self, user_id: uuid.UUID, new_hash: str) -> None:
        await self.db.execute(
            update(User).where(User.id == user_id).values(password_hash=new_hash)
        )

    async def add_used_bytes(self, user_id: uuid.UUID, delta: int) -> None:
        """Incrémente ou décrémente le quota utilisé """
        user = await self.get_by_id(user_id)
        if user:
            new_val = max(0, user.used_bytes + delta)
            await self.db.execute(
                update(User).where(User.id == user_id).values(used_bytes=new_val)
            )
