"""
catalogo_repository.py

Lectura de catálogos especies y razas (tablas compartidas, solo GET).
"""

from sqlalchemy.orm import Session
from app.models.especie import Especie
from app.models.raza import Raza


def listar_especies(db: Session) -> list[Especie]:
    """Lista todas las especies ordenadas por nombre."""
    return db.query(Especie).order_by(Especie.nombre).all()


def listar_razas(db: Session, especie_id: int | None = None) -> list[Raza]:
    """Lista razas; si especie_id se indica, filtra por especie."""
    q = db.query(Raza).order_by(Raza.nombre)
    if especie_id is not None:
        q = q.filter(Raza.especie_id == especie_id)
    return q.all()
