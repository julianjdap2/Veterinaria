"""
mascota_service.py

Contiene la lógica de negocio del módulo Mascotas.
"""

from sqlalchemy.orm import Session

from app.repositories import mascota_repository
from app.repositories.cliente_repository import obtener_cliente
from app.core.errors import ApiError


def crear_mascota(db: Session, datos: dict):
    cliente = obtener_cliente(db, datos["cliente_id"])

    if not cliente:
        raise ApiError(
            code="cliente_not_found",
            message="Cliente no encontrado",
            status_code=404,
        )

    return mascota_repository.crear_mascota(db, datos)


def listar_mascotas_por_empresa(
    db: Session,
    empresa_id: int,
    page: int = 1,
    page_size: int = 20,
    solo_activas: bool = True,
    cliente_id: int | None = None,
    nombre: str | None = None,
) -> tuple[list, int]:
    """Devuelve (lista de mascotas, total) para paginación con totales."""
    total = mascota_repository.count_mascotas_por_empresa(
        db, empresa_id, solo_activas=solo_activas, cliente_id=cliente_id, nombre=nombre
    )
    items = mascota_repository.listar_mascotas_por_empresa(
        db=db,
        empresa_id=empresa_id,
        page=page,
        page_size=page_size,
        solo_activas=solo_activas,
        cliente_id=cliente_id,
        nombre=nombre,
    )
    return items, total


def obtener_mascota_por_empresa(
    db: Session,
    mascota_id: int,
    empresa_id: int,
):
    """Obtiene una mascota por id (activa o inactiva); 404 si no existe."""
    mascota = mascota_repository.obtener_mascota_por_empresa(
        db=db,
        mascota_id=mascota_id,
        empresa_id=empresa_id,
        incluir_inactivas=True,
    )
    if not mascota:
        raise ApiError(
            code="mascota_not_found",
            message="Mascota no encontrada",
            status_code=404,
        )
    return mascota


def actualizar_activo_mascota_service(
    db: Session,
    mascota_id: int,
    empresa_id: int,
    activo: bool,
):
    """Actualiza el campo activo (reactivar o desactivar). 404 si no existe."""
    mascota = mascota_repository.actualizar_activo_mascota_por_empresa(
        db, mascota_id, empresa_id, activo
    )
    if not mascota:
        raise ApiError(
            code="mascota_not_found",
            message="Mascota no encontrada",
            status_code=404,
        )
    return mascota


def eliminar_mascota_por_empresa(
    db: Session,
    mascota_id: int,
    empresa_id: int,
):
    mascota = mascota_repository.eliminar_mascota_por_empresa(
        db=db,
        mascota_id=mascota_id,
        empresa_id=empresa_id,
    )
    if not mascota:
        raise ApiError(
            code="mascota_not_found",
            message="Mascota no encontrada",
            status_code=404,
        )
    return mascota