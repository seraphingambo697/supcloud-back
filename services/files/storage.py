"""
Gestion du stockage physique des fichiers.
"""

import io
import os
import uuid
import zipfile
from pathlib import Path

import aiofiles
from fastapi import HTTPException, status

from shared.config import get_settings

settings = get_settings()


class StorageManager:

    def __init__(self):
        self.base_path = Path(settings.storage_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def _full_path(self, relative: str) -> Path:
        return self.base_path / relative


    async def save(
        self,
        owner_id: uuid.UUID,
        file_id: uuid.UUID,
        filename: str,
        data: bytes,
    ) -> str:
        """
        Sauvegarde les octets sur le disque.
        """
        ext = Path(filename).suffix.lstrip(".").lower()
        rel_dir = Path(str(owner_id)) / str(file_id)
        abs_dir = self.base_path / rel_dir
        abs_dir.mkdir(parents=True, exist_ok=True)

        rel_path = str(rel_dir / (f"file.{ext}" if ext else "file"))
        abs_path = self.base_path / rel_path

        async with aiofiles.open(abs_path, "wb") as f:
            await f.write(data)

        return rel_path

    async def save_thumbnail(
        self,
        owner_id: uuid.UUID,
        file_id: uuid.UUID,
        data: bytes,
    ) -> str:
        rel_dir = Path(str(owner_id)) / str(file_id)
        abs_dir = self.base_path / rel_dir
        abs_dir.mkdir(parents=True, exist_ok=True)

        rel_path = str(rel_dir / "thumb.jpg")
        async with aiofiles.open(self.base_path / rel_path, "wb") as f:
            await f.write(data)
        return rel_path

    async def read(self, relative_path: str) -> bytes:
        abs_path = self._full_path(relative_path)
        if not abs_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Fichier physique introuvable.",
            )
        async with aiofiles.open(abs_path, "rb") as f:
            return await f.read()

    def get_abs_path(self, relative_path: str) -> Path:
        return self._full_path(relative_path)

    def exists(self, relative_path: str) -> bool:
        return self._full_path(relative_path).exists()

    def delete(self, relative_path: str) -> None:
        abs_path = self._full_path(relative_path)
        if abs_path.exists():
            abs_path.unlink()
        parent = abs_path.parent
        if parent.exists() and not any(parent.iterdir()):
            parent.rmdir()

    def build_zip(self, files: list[tuple[str, str]]) -> bytes:
        """
        Génère un ZIP en mémoire.
        """
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for storage_path, archive_name in files:
                abs_path = self._full_path(storage_path)
                if abs_path.exists():
                    zf.write(abs_path, arcname=archive_name)
        buf.seek(0)
        return buf.read()

    # Thumbnail

    def generate_thumbnail(self, image_data: bytes, size: tuple = (300, 300)) -> bytes | None:
        """
        """
        try:
            from PIL import Image

            img = Image.open(io.BytesIO(image_data))
            img.thumbnail(size, Image.LANCZOS)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            out = io.BytesIO()
            img.save(out, format="JPEG", quality=80, optimize=True)
            out.seek(0)
            return out.read()
        except Exception:
            return None


    @staticmethod
    def thumbnail_url(relative_path: str | None, base_url: str = "") -> str | None:
        if not relative_path:
            return None
        return f"{base_url}/files/thumbnail/{relative_path.replace('/', ':')}"
