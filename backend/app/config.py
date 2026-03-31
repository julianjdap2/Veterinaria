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
        default=(
            "http://localhost:3000,http://127.0.0.1:3000,"
            "http://localhost:5173,http://127.0.0.1:5173"
        ),
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

    # Twilio (SMS / WhatsApp) - opcional.
    # Si no se configura, el sistema hace fallback a modo log.
    TWILIO_ACCOUNT_SID: str = Field(default="", description="Twilio Account SID.")
    TWILIO_AUTH_TOKEN: str = Field(default="", description="Twilio Auth Token.")
    TWILIO_FROM_NUMBER: str = Field(
        default="",
        description="Número origen para SMS/WhatsApp en formato E.164 (ej: +573001234567).",
    )

    DEFAULT_PHONE_COUNTRY_CODE: str = Field(
        default="+57",
        description="Indicativo por defecto para números sin '+'.",
    )

    # URL pública del frontend (enlaces en emails, ej. registro / login)
    FRONTEND_PUBLIC_URL: str = Field(
        default="http://localhost:5173",
        description="Origen del SPA para enlaces en correos (sin barra final). Debe ser la URL real en producción.",
    )

    VINCULO_INVITE_EXPIRE_HOURS: int = Field(
        default=168,
        ge=1,
        le=720,
        description="Validez del enlace por correo para ampliar vínculo parcial → completo (horas).",
    )

    # Cron: si está definido, POST /cron/* exige header X-Cron-Secret
    CRON_SECRET: str = Field(default="", description="Secret para endpoints cron (header X-Cron-Secret).")

    # LLM (OpenAI-compatible /chat/completions). Opcional: enriquece asistente clínico.
    LLM_ENABLED: bool = Field(
        default=False,
        description="Si true y hay LLM_API_KEY, el asistente añade sugerencias vía modelo (además de reglas locales).",
    )
    LLM_API_KEY: str = Field(default="", description="API key del proveedor (Bearer).")
    LLM_BASE_URL: str = Field(
        default="https://api.openai.com/v1",
        description="Base URL del API (sin barra final); se concatena /chat/completions.",
    )
    LLM_CHAT_COMPLETIONS_URL: str = Field(
        default="",
        description="Si se define, URL completa del POST (Azure u otro); ignora LLM_BASE_URL.",
    )
    LLM_MODEL: str = Field(default="gpt-4o-mini", description="Identificador del modelo.")
    LLM_TIMEOUT_SECONDS: float = Field(default=25.0, ge=5.0, le=120.0)
    LLM_MAX_LLM_ITEMS: int = Field(default=6, ge=1, le=12, description="Máximo de ítems añadidos por el LLM.")

    def validate_production(self) -> None:
        """
        Llamar al arranque para validar que las variables críticas existan.
        Si SECRET_KEY o DATABASE_URL están vacías, lanza ValueError.
        No se valida si la variable de entorno TESTING=1 (pytest).
        """
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
