"""
mascota_repository.py

Repositorio encargado de acceder a la base de datos.
Aquí se ejecutan las consultas ORM.
"""

from sqlalchemy.orm import Session
from app.models.mascota import Mascota


def crear_mascota(db: Session, mascota):

    nueva_mascota = Mascota(**mascota)

    db.add(nueva_mascota)
    db.commit()
    db.refresh(nueva_mascota)

    return nueva_mascota


def listar_mascotas(db: Session):

    return db.query(Mascota).all()


def obtener_mascota(db: Session, mascota_id: int):

    return db.query(Mascota).filter(Mascota.id == mascota_id).first()


def eliminar_mascota(db: Session, mascota_id: int):

    mascota = db.query(Mascota).filter(Mascota.id == mascota_id).first()

    if mascota:
        db.delete(mascota)
        db.commit()

    return mascota