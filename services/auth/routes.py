"""
Routes FastAPI du service Auth.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from services.auth.oauth import github_auth_url, github_callback, google_auth_url, google_callback
from services.auth.service import AuthService
from shared.database import get_db
from shared.schemas.schemas import (
    ChangePasswordRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserOut,
)
from shared.utils.jwt_utils import get_current_user_id

router = APIRouter(prefix="/auth", tags=["Auth"])
import logging
logger = logging.getLogger("auth")


def _svc(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(db)



@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Créer un compte email/mot de passe",
)
async def register(
    data: RegisterRequest,
    svc: AuthService = Depends(_svc),
):
    user, token = await svc.register(data)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))



@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Connexion email/mot de passe",
)
async def login(
    data: LoginRequest,
    svc: AuthService = Depends(_svc),
):
    user, token = await svc.login(data)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))



@router.get(
    "/oauth/google",
    summary="Redirection vers Google OAuth2",
)
async def oauth_google_redirect():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=google_auth_url())


"""@router.get(
    "/oauth/google/callback",
    response_model=TokenResponse,
    summary="Callback Google OAuth2",
)
async def oauth_google_callback(
    code: str,
    svc: AuthService = Depends(_svc),
):
    profile = await google_callback(code)
    user, token = await svc.login_or_create_oauth(
        provider="google",
        sub=profile["sub"],
        email=profile["email"],
        name=profile["name"],
        avatar_url=profile.get("avatar_url"),
    )
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))"""

@router.get(
    "/oauth/google/callback",
    summary="Callback Google OAuth2",
)
async def oauth_google_callback(
    code: str,
    svc: AuthService = Depends(_svc),
):
    from fastapi.responses import RedirectResponse
    from shared.config import get_settings

    front = get_settings().frontend_url
    try:
        profile = await google_callback(code)
        user, token = await svc.login_or_create_oauth(
            provider="google",
            sub=profile["sub"],
            email=profile["email"],
            name=profile["name"],
            avatar_url=profile.get("avatar_url"),
        )
    except Exception as e:
        import traceback; traceback.print_exc()
        logger.exception(f"Échec du callback Google: {e}")
        return RedirectResponse(url=f"{front}/login?error=google")

    return RedirectResponse(url=f"{front}/oauth/callback#token={token}")


@router.get(
    "/oauth/github",
    summary="Redirection vers GitHub OAuth2",
)
async def oauth_github_redirect():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=github_auth_url())


@router.get(
    "/oauth/github/callback",
    response_model=TokenResponse,
    summary="Callback GitHub OAuth2",
)
async def oauth_github_callback(
    code: str,
    svc: AuthService = Depends(_svc),
):
    profile = await github_callback(code)
    user, token = await svc.login_or_create_oauth(
        provider="github",
        sub=profile["sub"],
        email=profile["email"],
        name=profile["name"],
        avatar_url=profile.get("avatar_url"),
    )
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))



@router.get(
    "/me",
    response_model=UserOut,
    summary="Récupérer le profil de l'utilisateur connecté",
)
async def get_me(
    user_id: uuid.UUID = Depends(get_current_user_id),
    svc: AuthService = Depends(_svc),
):
    user = await svc.get_user(user_id)
    return UserOut.model_validate(user)


@router.patch(
    "/me",
    response_model=UserOut,
    summary="Mettre à jour nom / avatar",
)
async def update_me(
    data: UpdateProfileRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    svc: AuthService = Depends(_svc),
):
    user = await svc.update_profile(user_id, data)
    return UserOut.model_validate(user)


@router.post(
    "/me/password",
    response_model=MessageResponse,
    summary="Changer le mot de passe",
)
async def change_password(
    data: ChangePasswordRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    svc: AuthService = Depends(_svc),
):
    await svc.change_password(user_id, data)
    return MessageResponse(message="Mot de passe mis à jour.")
