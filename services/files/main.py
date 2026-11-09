from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.files.routes import router
from shared.config import get_settings

settings = get_settings()

app = FastAPI(
    title="SUPCloud — Files Service",
    version="1.0.0",
    description="Upload, download, gestion des dossiers, recherche, corbeille",
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
    return {"service": "files", "status": "ok"}
