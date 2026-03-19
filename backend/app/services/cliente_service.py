"""
cliente_service.py

Lógica de negocio para el módulo de clientes.
"""

from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.repositories.cliente_repository import (
    crear_cliente,
    listar_clientes_por_empresa,
    obtener_cliente_por_empresa,
    count_clientes_por_empresa,
    desactivar_cliente_por_empresa,
    actualizar_activo_cliente_por_empresa,
    actualizar_cliente_por_empresa,
)


def crear_cliente_service(db: Session, data: dict, empresa_id: int):
    """Crea un cliente asociado a la empresa indicada."""
    data["empresa_id"] = empresa_id
    return crear_cliente(db, data)


def listar_clientes_por_empresa_service(
    db: Session,
    empresa_id: int,
    page: int = 1,
    page_size: int = 20,
    solo_activos: bool = True,
    nombre: str | None = None,
    documento: str | None = None,
) -> tuple[list, int]:
    """Lista clientes de la empresa con paginación; devuelve (items, total)."""
    total = count_clientes_por_empresa(
        db, empresa_id, solo_activos=solo_activos, nombre=nombre, documento=documento
    )
    items = listar_clientes_por_empresa(
        db=db,
        empresa_id=empresa_id,
        page=page,
        page_size=page_size,
        solo_activos=solo_activos,
        nombre=nombre,
        documento=documento,
    )
    return items, total


def desactivar_cliente_service(db: Session, cliente_id: int, empresa_id: int):
    """Soft delete: marca cliente como inactivo. Lanza ApiError si no existe."""
    cliente = desactivar_cliente_por_empresa(db, cliente_id, empresa_id)
    if not cliente:
        raise ApiError(
            code="cliente_not_found",
            message="Cliente no encontrado",
            status_code=404,
        )
    return cliente


def obtener_cliente_por_empresa_service(
    db: Session,
    cliente_id: int,
    empresa_id: int,
):
    """Obtiene un cliente por id si pertenece a la empresa (activo o inactivo); si no, 404."""
    cliente = obtener_cliente_por_empresa(
        db, cliente_id, empresa_id, incluir_inactivos=True
    )
    if not cliente:
        raise ApiError(
            code="cliente_not_found",
            message="Cliente no encontrado",
            status_code=404,
        )
    return cliente


def actualizar_activo_cliente_service(
    db: Session,
    cliente_id: int,
    empresa_id: int,
    activo: bool,
):
    """Actualiza el campo activo (reactivar o desactivar). Lanza ApiError 404 si no existe."""
    cliente = actualizar_activo_cliente_por_empresa(db, cliente_id, empresa_id, activo)
    if not cliente:
        raise ApiError(
            code="cliente_not_found",
            message="Cliente no encontrado",
            status_code=404,
        )
    return cliente


def actualizar_cliente_service(
    db: Session,
    cliente_id: int,
    empresa_id: int,
    payload: dict,
):
    """Actualiza campos del cliente (solo los enviados). Lanza ApiError 404 si no existe."""
    data = {k: v for k, v in payload.items() if v is not None}
    if not data:
        return obtener_cliente_por_empresa_service(db, cliente_id, empresa_id)
    cliente = actualizar_cliente_por_empresa(db, cliente_id, empresa_id, data)
    if not cliente:
        raise ApiError(
            code="cliente_not_found",
            message="Cliente no encontrado",
            status_code=404,
        )
    return cliente