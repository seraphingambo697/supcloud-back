"""
Handlers OAuth2 pour Google et GitHub.
"""

import httpx
from fastapi import HTTPException, status

from shared.config import get_settings

settings = get_settings()


#Google 

GOOGLE_AUTH_URL   = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL  = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO   = "https://www.googleapis.com/oauth2/v2/userinfo"


def google_auth_url() -> str:
    """Construit l'URL de redirection vers Google."""
    params = {
        "client_id":     settings.google_client_id,
        "redirect_uri":  settings.google_redirect_uri,
        "response_type": "code",
        "scope":         "openid email profile",
        "access_type":   "offline",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{GOOGLE_AUTH_URL}?{query}"


async def google_callback(code: str) -> dict:
    """
    Échange le code contre un profil utilisateur Google.
    """
    async with httpx.AsyncClient() as client:
        # 1. Échange code → tokens
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code":          code,
                "client_id":     settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri":  settings.google_redirect_uri,
                "grant_type":    "authorization_code",
            },
        )
        token_resp.raise_for_status()
        tokens = token_resp.json()

        info_resp = await client.get(
            GOOGLE_USERINFO,
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        info_resp.raise_for_status()
        info = info_resp.json()

    return {
        "sub":        info["id"],
        "email":      info["email"],
        "name":       info.get("name", info["email"].split("@")[0]),
        "avatar_url": info.get("picture"),
    }


GITHUB_AUTH_URL  = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USERINFO  = "https://api.github.com/user"
GITHUB_EMAILS    = "https://api.github.com/user/emails"


def github_auth_url() -> str:
    params = {
        "client_id":    settings.github_client_id,
        "redirect_uri": settings.github_redirect_uri,
        "scope":        "read:user user:email",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{GITHUB_AUTH_URL}?{query}"


async def github_callback(code: str) -> dict:
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            GITHUB_TOKEN_URL,
            data={
                "client_id":     settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code":          code,
                "redirect_uri":  settings.github_redirect_uri,
            },
            headers={"Accept": "application/json"},
        )
        token_resp.raise_for_status()
        access_token = token_resp.json().get("access_token")
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="GitHub OAuth : code invalide.",
            )

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
        }

        user_resp = await client.get(GITHUB_USERINFO, headers=headers)
        user_resp.raise_for_status()
        user_info = user_resp.json()

        email = user_info.get("email")
        if not email:
            emails_resp = await client.get(GITHUB_EMAILS, headers=headers)
            emails_resp.raise_for_status()
            primary = next(
                (e for e in emails_resp.json() if e.get("primary") and e.get("verified")),
                None,
            )
            if primary:
                email = primary["email"]

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Impossible de récupérer l'email GitHub.",
            )

    return {
        "sub":        str(user_info["id"]),
        "email":      email,
        "name":       user_info.get("name") or user_info.get("login", email.split("@")[0]),
        "avatar_url": user_info.get("avatar_url"),
    }
