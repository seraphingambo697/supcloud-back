# shared/utils/jwt_utils.py
"""
Utilitaires JWT partagés entre le service Auth et la Gateway.
- Création de tokens
- Vérification / décodage
- Dependency FastAPI pour extraire l'utilisateur courant
"""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from shared.config import get_settings

settings = get_settings()

_bearer = HTTPBearer(auto_error=True)


# ── Création ───────────────────────────────────────────────────────────────────

def create_access_token(user_id: uuid.UUID, email: str) -> str:
    """
    Génère un JWT signé avec l'algorithme HS256.
    Payload : sub (user_id), email, exp.
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


# ── Décodage ───────────────────────────────────────────────────────────────────

def decode_token(token: str) -> dict:
    """
    Décode et vérifie un JWT.
    Lève HTTPException 401 si invalide ou expiré.
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


# ── Dependency FastAPI ─────────────────────────────────────────────────────────

def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> uuid.UUID:
    """
    Dependency : extrait et retourne l'UUID de l'utilisateur depuis le JWT.
    Injectée dans toutes les routes protégées.

    Usage:
        @router.get("/protected")
        async def route(user_id: uuid.UUID = Depends(get_current_user_id)):
            ...
    """
    payload = decode_token(credentials.credentials)
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide.")
    return uuid.UUID(sub)


def get_current_user_payload(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """Retourne le payload complet du JWT (sub, email, exp…)."""
    return decode_token(credentials.credentials)
