"""
health.py

Comprobaciones de salud para el endpoint /health.
Permite a balanceadores y monitoreo verificar que la API y la BD responden.
"""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.database import engine


def check_database() -> tuple[bool, str]:
    """
    Ejecuta una consulta mínima contra la base de datos.
    Returns:
        (ok, message): ok True si la BD responde, message descriptivo.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True, "ok"
    except Exception as e:
        return False, str(e)
