"""
config.py

Carga variables de entorno del archivo .env
y las centraliza para todo el proyecto.
"""

import os
from dotenv import load_dotenv

# Cargar variables desde .env
load_dotenv()


class Settings:
    """
    Configuración global del sistema
    """

    SECRET_KEY: str = os.getenv("SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    DATABASE_URL: str = os.getenv("DATABASE_URL")


# Instancia global
settings = Settings()