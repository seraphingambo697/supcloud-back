# services/shares/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.shares.routes import router
from shared.config import get_settings

settings = get_settings()

app = FastAPI(
    title="SUPcloud — Shares Service",
    version="1.0.0",
    description="Liens de partage publics, partage interne entre utilisateurs",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health", tags=["Health"])
async def health():
    return {"service": "shares", "status": "ok"}
