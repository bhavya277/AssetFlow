import os

class Settings:
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "AssetFlow"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkeyforassetflowhackathon2026")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # SQLite default, or PostgreSQL if specified
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./assetflow.db")

settings = Settings()
