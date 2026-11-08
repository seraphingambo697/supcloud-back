# shared/utils/file_utils.py
"""
Utilitaires fichiers partagés :
- Détection catégorie depuis MIME ou extension
- Formatage taille
- Génération chemin de stockage physique
"""

import os
import uuid
from pathlib import Path

from shared.models.models import FileCategory


# ── Catégorie depuis MIME ──────────────────────────────────────────────────────

_MIME_MAP: dict[str, FileCategory] = {
    # Images
    "image/jpeg": FileCategory.image,
    "image/png": FileCategory.image,
    "image/gif": FileCategory.image,
    "image/webp": FileCategory.image,
    "image/svg+xml": FileCategory.image,
    "image/bmp": FileCategory.image,
    "image/heic": FileCategory.image,
    # Vidéos
    "video/mp4": FileCategory.video,
    "video/quicktime": FileCategory.video,
    "video/x-msvideo": FileCategory.video,
    "video/webm": FileCategory.video,
    "video/x-matroska": FileCategory.video,
    # Audio
    "audio/mpeg": FileCategory.audio,
    "audio/wav": FileCategory.audio,
    "audio/flac": FileCategory.audio,
    "audio/aac": FileCategory.audio,
    "audio/ogg": FileCategory.audio,
    "audio/mp4": FileCategory.audio,
    # Documents
    "application/pdf": FileCategory.document,
    "application/msword": FileCategory.document,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": FileCategory.document,
    "application/vnd.ms-excel": FileCategory.document,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": FileCategory.document,
    "application/vnd.ms-powerpoint": FileCategory.document,
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": FileCategory.document,
    # Textes
    "text/plain": FileCategory.text,
    "text/markdown": FileCategory.text,
    "text/csv": FileCategory.text,
    "application/json": FileCategory.text,
    "application/xml": FileCategory.text,
    "text/xml": FileCategory.text,
    "text/yaml": FileCategory.text,
    # Archives
    "application/zip": FileCategory.archive,
    "application/x-tar": FileCategory.archive,
    "application/gzip": FileCategory.archive,
    "application/x-rar-compressed": FileCategory.archive,
    "application/x-7z-compressed": FileCategory.archive,
}

_EXT_MAP: dict[str, FileCategory] = {
    # Images
    "jpg": FileCategory.image, "jpeg": FileCategory.image, "png": FileCategory.image,
    "gif": FileCategory.image, "webp": FileCategory.image, "svg": FileCategory.image,
    "bmp": FileCategory.image, "heic": FileCategory.image,
    # Vidéos
    "mp4": FileCategory.video, "mov": FileCategory.video, "avi": FileCategory.video,
    "mkv": FileCategory.video, "webm": FileCategory.video, "flv": FileCategory.video,
    # Audio
    "mp3": FileCategory.audio, "wav": FileCategory.audio, "flac": FileCategory.audio,
    "aac": FileCategory.audio, "m4a": FileCategory.audio, "ogg": FileCategory.audio,
    # Documents
    "pdf": FileCategory.document, "doc": FileCategory.document, "docx": FileCategory.document,
    "xls": FileCategory.document, "xlsx": FileCategory.document,
    "ppt": FileCategory.document, "pptx": FileCategory.document,
    # Textes
    "txt": FileCategory.text, "md": FileCategory.text, "json": FileCategory.text,
    "csv": FileCategory.text, "xml": FileCategory.text, "yaml": FileCategory.text,
    "yml": FileCategory.text, "log": FileCategory.text,
    # Archives
    "zip": FileCategory.archive, "tar": FileCategory.archive, "gz": FileCategory.archive,
    "rar": FileCategory.archive, "7z": FileCategory.archive,
}


def category_from_mime(mime: str | None, ext: str | None = None) -> FileCategory:
    if mime and mime in _MIME_MAP:
        return _MIME_MAP[mime]
    if ext and ext.lower().lstrip(".") in _EXT_MAP:
        return _EXT_MAP[ext.lower().lstrip(".")]
    # Fallback sur le type MIME générique
    if mime:
        prefix = mime.split("/")[0]
        if prefix == "image":   return FileCategory.image
        if prefix == "video":   return FileCategory.video
        if prefix == "audio":   return FileCategory.audio
        if prefix == "text":    return FileCategory.text
    return FileCategory.other


def get_extension(filename: str) -> str:
    """Retourne l'extension sans le point, en minuscules."""
    _, ext = os.path.splitext(filename)
    return ext.lstrip(".").lower()


def build_storage_path(owner_id: uuid.UUID, file_id: uuid.UUID, filename: str) -> str:
    """
    Construit le chemin physique relatif au STORAGE_PATH.
    Structure : <owner_id>/<file_id>/<filename_original>
    → Isole chaque fichier dans son propre dossier pour éviter les collisions.
    """
    ext = get_extension(filename)
    return str(Path(str(owner_id)) / str(file_id) / f"file.{ext}" if ext else Path(str(owner_id)) / str(file_id) / "file")


def format_bytes(n: int) -> str:
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if n < 1024:
            return f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} PB"


def is_image(mime: str | None) -> bool:
    return bool(mime and mime.startswith("image/"))
