# gateway/main.py
"""
API Gateway — point d'entrée unique sur le port 8000.
Route les requêtes vers les microservices internes.
Vérifie le JWT avant de proxifier (sauf routes publiques).

Architecture :
  Client → Gateway :8000 → auth:8001 | files:8002 | shares:8003
"""

import re
import httpx
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from shared.config import get_settings
from shared.utils.jwt_utils import get_current_user_id

settings = get_settings()

app = FastAPI(
    title="SUPFile — API Gateway",
    version="1.0.0",
    description="Point d'entrée unique. Route vers auth/files/shares.",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes publiques (pas de vérif JWT) ───────────────────────────────────────
PUBLIC_PREFIXES = [
    "/auth/login",
    "/auth/register",
    "/auth/oauth/",
    "/share/resolve/",
    "/share/",
    "/health",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/favicon.ico",
]


def _is_public(path: str) -> bool:
    # Vérification exacte ET par préfixe
    for p in PUBLIC_PREFIXES:
        if path.startswith(p):
            return True
    # Cas spécial : /share/resolve/{token} sans slash final dans les prefixes
    if re.match(r"^/share/resolve/", path):
        return True
    return False


# ── Client HTTP vers les services internes ────────────────────────────────────
_clients: dict[str, httpx.AsyncClient] = {}


async def _get_client(base_url: str) -> httpx.AsyncClient:
    if base_url not in _clients:
        _clients[base_url] = httpx.AsyncClient(base_url=base_url, timeout=30.0)
    return _clients[base_url]


async def _proxy(request: Request, target_base: str, target_path: str) -> Response:
    """
    Forwarde la requête vers le service cible et retourne la réponse.
    Préserve headers, body, query params.
    """
    client = await _get_client(target_base)

    headers = dict(request.headers)
    headers.pop("host", None)

    url = target_path
    if request.url.query:
        url = f"{url}?{request.url.query}"

    body = await request.body()

    try:
        resp = await client.request(
            method=request.method,
            url=url,
            headers=headers,
            content=body,
        )
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service indisponible : {target_base}",
        )

    resp_headers = dict(resp.headers)
    resp_headers.pop("content-encoding", None)

    return Response(
        content=resp.content,
        status_code=resp.status_code,
        headers=resp_headers,
        media_type=resp.headers.get("content-type"),
    )


# ── Middleware JWT ─────────────────────────────────────────────────────────────

@app.middleware("http")
async def jwt_middleware(request: Request, call_next):
    if _is_public(request.url.path):
        return await call_next(request)

    # Autoriser le téléchargement public via share_token query param
    # Ex: GET /files/{id}/download?share_token=TOKEN
    if "share_token" in request.query_params:
        return await call_next(request)

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": "Token manquant."},
            headers={"WWW-Authenticate": "Bearer"},
        )
    return await call_next(request)


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health():
    return {"gateway": "ok"}


# ── Routing vers Auth ──────────────────────────────────────────────────────────

@app.api_route("/auth/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_auth(request: Request, path: str):
    return await _proxy(request, settings.auth_service_url, f"/auth/{path}")


# ── Routing vers Files ─────────────────────────────────────────────────────────

@app.api_route("/files/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_files(request: Request, path: str):
    return await _proxy(request, settings.files_service_url, f"/files/{path}")


@app.api_route("/files", methods=["GET", "POST"])
async def proxy_files_root(request: Request):
    return await _proxy(request, settings.files_service_url, "/files")


# ── Routing vers Shares ────────────────────────────────────────────────────────

@app.get("/share/{token}")
async def share_public_get(token: str):
    """
    Route GET publique pour les liens de partage.
    Retourne 200 — le frontend React (PublicSharePage) gère l'affichage.
    """
    return JSONResponse({"ok": True, "token": token})


@app.api_route("/share/{path:path}", methods=["POST", "PUT", "PATCH", "DELETE"])
async def proxy_shares(request: Request, path: str):
    return await _proxy(request, settings.shares_service_url, f"/share/{path}")


# ── Shutdown propre ────────────────────────────────────────────────────────────

@app.on_event("shutdown")
async def shutdown():
    for client in _clients.values():
        await client.aclose()