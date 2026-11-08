"""
Configuration centralisée via pydantic-settings.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    database_url: str = "postgresql+asyncpg://supcloud_user:supcloud@db:5432/supcloud"
    database_url_sync: str = "postgresql://supcloud_user:supcloud@db:5432/supcloud"

    jwt_secret: str = "8@@udsfnhbaeuyFBEBDNJKNJSKNJFNGKJNGNIUQUNRFBBYIEWYR&&&&&&&4344348"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    # OAuth2 
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/auth/oauth/google/callback"

    github_client_id: str = ""
    github_client_secret: str = ""
    github_redirect_uri: str = "http://localhost:8000/auth/oauth/github/callback"

    # Stockage
    storage_path: str = "/app/storage"
    max_upload_mb: int = 5120
    default_quota_bytes: int = 32_212_254_720  

    
    auth_service_url: str = "http://auth:8001"
    files_service_url: str = "http://files:8002"
    shares_service_url: str = "http://shares:8003"

    allowed_origins: str = "http://localhost,http://localhost:3000"

    frontend_url: str = "http://localhost:3000" 


    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    """Obtenir les settings."""
    return Settings()
