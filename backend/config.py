"""
Configuration settings for the Fraud-Aware Digital Wallet Backend
"""

from pydantic_settings import BaseSettings
from functools import lru_cache
from urllib.parse import quote_plus


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Money Square"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Database
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = "Jayasree@123"
    DB_NAME: str = "fraud_aware_wallet"
    
    @property
    def DATABASE_URL(self) -> str:
        # URL-encode password to handle special characters like @
        encoded_password = quote_plus(self.DB_PASSWORD)
        return f"mysql+pymysql://{self.DB_USER}:{encoded_password}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    # JWT Settings
    JWT_SECRET_KEY: str = "your-super-secret-jwt-key-change-in-production-2024"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    
    # Fraud Detection Thresholds
    RISK_LOW_THRESHOLD: int = 30
    RISK_MEDIUM_THRESHOLD: int = 60
    RISK_HIGH_THRESHOLD: int = 100
    
    # Alert Settings
    CONFIRMATION_TIMEOUT_SECONDS: int = 60
    DEFAULT_FREEZE_DURATION_MINUTES: int = 30
    
    class Config:
        env_file = ".env"
        extra = "allow"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
