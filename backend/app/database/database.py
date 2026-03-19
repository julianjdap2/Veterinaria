"""
database.py

Este archivo se encarga de:

1. Crear la conexión con la base de datos
2. Crear el motor de SQLAlchemy
3. Crear la sesión de conexión que usará toda la aplicación
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

# Usar la URL centralizada en settings para evitar
# configuraciones divergentes.
DATABASE_URL = settings.DATABASE_URL

# Crear motor de conexión
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

# Crear sesión de base de datos
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base para los modelos
Base = declarative_base()


def get_db():
    """
    Generador de sesión de base de datos.

    Se utiliza en FastAPI para abrir y cerrar
    conexiones automáticamente en cada request.
    """

    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()