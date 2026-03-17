"""
mascota_service.py

Contiene la lógica de negocio del módulo Mascotas.
"""

from sqlalchemy.orm import Session
from app.repositories import mascota_repository

from app.repositories.cliente_repository import obtener_cliente
from fastapi import HTTPException


def crear_mascota(db: Session, mascota):

    cliente = obtener_cliente(db, mascota["cliente_id"])

    if not cliente:
        raise HTTPException(
            status_code=404,
            detail="Cliente no encontrado"
        )

    return mascota_repository.crear_mascota(db, mascota)


def listar_mascotas(db: Session):

    return mascota_repository.listar_mascotas(db)


def obtener_mascota(db: Session, mascota_id: int):

    return mascota_repository.obtener_mascota(db, mascota_id)


def eliminar_mascota(db: Session, mascota_id: int):

    return mascota_repository.eliminar_mascota(db, mascota_id)