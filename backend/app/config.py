"""
config.py

Configuración centralizada del backend. Usa pydantic-settings para validar
variables de entorno al arranque y fallar rápido si faltan las obligatorias.
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Literal

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()


class Settings(BaseSettings):
    """
    Configuración global del sistema. Todas las variables se leen de entorno
    (o .env). SECRET_KEY y DATABASE_URL son obligatorias para producción.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Seguridad
    SECRET_KEY: str = Field(
        default="",
        description="Clave secreta para firmar JWT. En producción debe ser fuerte y secreta.",
    )
    ALGORITHM: str = Field(default="HS256", description="Algoritmo para JWT.")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=60,
        ge=1,
        le=10080,
        description="Minutos de validez del access token.",
    )

    # Base de datos
    DATABASE_URL: str = Field(
        default="",
        description="URL de conexión MySQL (ej: mysql+pymysql://user:pass@host/db).",
    )

    # CORS (orígenes permitidos, separados por coma)
    CORS_ORIGINS: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000",
        description="Orígenes permitidos para CORS, separados por coma.",
    )

    # Notificaciones: "log" | "smtp" | "queue" (queue reservado para futuro)
    NOTIFICATION_BACKEND: Literal["log", "smtp", "queue"] = Field(
        default="log",
        description="Backend de notificaciones: log (solo registrar), smtp (email), queue (cola).",
    )
    SMTP_HOST: str = Field(default="", description="Host SMTP para envío de emails.")
    SMTP_PORT: int = Field(default=587, description="Puerto SMTP.")
    SMTP_USER: str = Field(default="", description="Usuario SMTP.")
    SMTP_PASSWORD: str = Field(default="", description="Contraseña SMTP.")
    SMTP_FROM_EMAIL: str = Field(default="", description="Email remitente por defecto.")

    # Cron: si está definido, POST /cron/* exige header X-Cron-Secret
    CRON_SECRET: str = Field(default="", description="Secret para endpoints cron (header X-Cron-Secret).")

    def validate_production(self) -> None:
        """
        Llamar al arranque para validar que las variables críticas existan.
        Si SECRET_KEY o DATABASE_URL están vacías, lanza ValueError.
        No se valida si la variable de entorno TESTING=1 (pytest).
        """
        import os
        if os.getenv("TESTING") == "1":
            return
        if not self.SECRET_KEY or self.SECRET_KEY == "change-me":
            raise ValueError(
                "SECRET_KEY no puede estar vacía ni ser 'change-me'. "
                "Configure SECRET_KEY en .env para producción."
            )
        if not self.DATABASE_URL:
            raise ValueError(
                "DATABASE_URL es obligatoria. Configure DATABASE_URL en .env."
            )


@lru_cache
def get_settings() -> Settings:
    """Devuelve la configuración cacheada (una sola instancia)."""
    return Settings()


# Instancia global para compatibilidad con imports existentes (app.database, app.security, etc.)
settings = get_settings()
