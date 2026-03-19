"""
cita_service.py

Lógica de negocio para el módulo de citas/agenda.
Todas las operaciones se acotan por empresa (vía mascota).
"""

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models.mascota import Mascota
from app.repositories.cita_repository import (
    crear_cita,
    listar_citas_por_mascota,
    listar_citas_por_empresa_y_rango,
    count_citas_por_empresa_y_rango,
    obtener_cita_por_id_y_empresa,
    actualizar_cita,
)


def _verificar_mascota_empresa(db: Session, mascota_id: int, empresa_id: int) -> Mascota:
    """Comprueba que la mascota exista y pertenezca a la empresa."""
    mascota = (
        db.query(Mascota)
        .filter(Mascota.id == mascota_id, Mascota.empresa_id == empresa_id, Mascota.activo.is_(True))
        .first()
    )
    if not mascota:
        raise ApiError(
            code="mascota_not_found",
            message="Mascota no encontrada para la empresa actual",
            status_code=404,
        )
    return mascota


def crear_cita_service(db: Session, datos: dict, empresa_id: int):
    """Crea una cita para una mascota de la empresa."""
    _verificar_mascota_empresa(db, datos["mascota_id"], empresa_id)
    return crear_cita(db, datos)


def listar_citas_mascota_service(db: Session, mascota_id: int, empresa_id: int):
    """Lista el historial de citas de una mascota."""
    _verificar_mascota_empresa(db, mascota_id, empresa_id)
    return listar_citas_por_mascota(db, mascota_id, empresa_id)


def listar_citas_agenda_service(
    db: Session,
    empresa_id: int,
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
    page: int = 1,
    page_size: int = 20,
    estado: Optional[str] = None,
    veterinario_id: Optional[int] = None,
) -> tuple[list, int]:
    """Lista citas de la empresa (agenda); devuelve (items, total)."""
    total = count_citas_por_empresa_y_rango(
        db, empresa_id, fecha_desde, fecha_hasta, estado=estado, veterinario_id=veterinario_id
    )
    items = listar_citas_por_empresa_y_rango(
        db, empresa_id, fecha_desde, fecha_hasta, page, page_size,
        estado=estado, veterinario_id=veterinario_id
    )
    return items, total


def obtener_cita_service(db: Session, cita_id: int, empresa_id: int):
    """Obtiene una cita por id si pertenece a la empresa."""
    cita = obtener_cita_por_id_y_empresa(db, cita_id, empresa_id)
    if not cita:
        raise ApiError(
            code="cita_not_found",
            message="Cita no encontrada",
            status_code=404,
        )
    return cita


def actualizar_cita_service(db: Session, cita_id: int, empresa_id: int, datos: dict, current_user):
    """Actualiza una cita (estado, fecha, motivo) con validación de transiciones."""
    cita = obtener_cita_por_id_y_empresa(db, cita_id, empresa_id)
    if not cita:
        raise ApiError(
            code="cita_not_found",
            message="Cita no encontrada",
            status_code=404,
        )

    nuevo_estado = datos.get("estado")
    if nuevo_estado:
        nuevo_estado = (nuevo_estado or "").strip()
        estado_actual = (cita.estado or "").strip()
        rol_id = getattr(current_user, "rol_id", None)

        # Transiciones permitidas:
        # pendiente -> confirmada     (ADMIN/RECEPCION)
        # confirmada -> revision      (VETERINARIO/ADMIN)
        # revision  -> atendida       (VETERINARIO/ADMIN)
        # *          -> cancelada      (ADMIN/RECEPCION, si no está atendida)
        if nuevo_estado == estado_actual:
            # idempotente
            pass
        elif nuevo_estado == "confirmada":
            if rol_id not in (1, 3):
                raise ApiError(code="cita_forbidden", message="Solo recepción/admin puede confirmar", status_code=403)
            if estado_actual != "pendiente":
                raise ApiError(code="cita_estado_invalid", message="La cita debe estar en pendiente para confirmar", status_code=400)
        elif nuevo_estado == "revision":
            if rol_id not in (1, 2):
                raise ApiError(code="cita_forbidden", message="Solo veterinario/admin puede pasar a revisión", status_code=403)
            if estado_actual != "confirmada":
                raise ApiError(code="cita_estado_invalid", message="La cita debe estar en confirmada para pasar a revisión", status_code=400)
        elif nuevo_estado == "atendida":
            if rol_id not in (1, 2):
                raise ApiError(code="cita_forbidden", message="Solo veterinario/admin puede marcar como atendida", status_code=403)
            if estado_actual != "revision":
                raise ApiError(code="cita_estado_invalid", message="La cita debe estar en revisión para pasar a atendida", status_code=400)
        elif nuevo_estado == "cancelada":
            if rol_id not in (1, 3):
                raise ApiError(code="cita_forbidden", message="Solo recepción/admin puede cancelar", status_code=403)
            if estado_actual == "atendida":
                raise ApiError(code="cita_estado_invalid", message="No se puede cancelar una cita atendida", status_code=400)
        else:
            raise ApiError(code="cita_estado_invalid", message="Estado de cita no permitido", status_code=400)

    return actualizar_cita(db, cita, datos)
