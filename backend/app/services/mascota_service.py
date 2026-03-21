"""
mascota_service.py

Contiene la lógica de negocio del módulo Mascotas.
"""

from sqlalchemy.orm import Session

from app.repositories import mascota_repository
from app.repositories.cliente_repository import obtener_cliente
from app.core.errors import ApiError
from app.services import plan_quotas
from app.models.cliente import Cliente
from app.schemas.mascota_schema import MascotaResponse


def crear_mascota(db: Session, datos: dict):
    cliente = obtener_cliente(db, datos["cliente_id"])

    if not cliente:
        raise ApiError(
            code="cliente_not_found",
            message="Cliente no encontrado",
            status_code=404,
        )

    empresa_id = datos.get("empresa_id")
    if empresa_id is None:
        raise ApiError(
            code="empresa_required",
            message="empresa_id es requerido",
            status_code=400,
        )

    # Solo aplica a mascotas activas (alta normal: activo=True por defecto)
    if datos.get("activo", True):
        plan_quotas.verificar_limite_mascotas_activas(db, empresa_id)

    return mascota_repository.crear_mascota(db, datos)


def listar_mascotas_por_empresa(
    db: Session,
    empresa_id: int,
    page: int = 1,
    page_size: int = 20,
    solo_activas: bool = True,
    cliente_id: int | None = None,
    nombre: str | None = None,
    busqueda: str | None = None,
) -> tuple[list, int]:
    """Devuelve (lista de mascotas, total) para paginación con totales."""
    total = mascota_repository.count_mascotas_por_empresa(
        db,
        empresa_id,
        solo_activas=solo_activas,
        cliente_id=cliente_id,
        nombre=nombre,
        busqueda=busqueda,
    )
    items = mascota_repository.listar_mascotas_por_empresa(
        db=db,
        empresa_id=empresa_id,
        page=page,
        page_size=page_size,
        solo_activas=solo_activas,
        cliente_id=cliente_id,
        nombre=nombre,
        busqueda=busqueda,
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
    if activo:
        prev = mascota_repository.obtener_mascota_por_empresa(
            db, mascota_id, empresa_id, incluir_inactivas=True
        )
        if prev and not prev.activo:
            plan_quotas.verificar_limite_mascotas_activas(db, empresa_id)

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


def mascotas_a_response_con_cliente_nombre(db: Session, items: list) -> list[MascotaResponse]:
    """Una consulta batch de nombres de cliente; evita que el front cargue todos los clientes."""
    if not items:
        return []
    ids = {m.cliente_id for m in items if m.cliente_id is not None}
    cmap: dict[int, str | None] = {}
    if ids:
        pairs = db.query(Cliente.id, Cliente.nombre).filter(Cliente.id.in_(ids)).all()
        cmap = {int(cid): nombre for cid, nombre in pairs}
    return [
        MascotaResponse.model_validate(m).model_copy(update={"cliente_nombre": cmap.get(m.cliente_id)})
        for m in items
    ]


def mascota_a_response_con_cliente_nombre(db: Session, mascota) -> MascotaResponse:
    base = MascotaResponse.model_validate(mascota)
    if not mascota.cliente_id:
        return base
    nombre = db.query(Cliente.nombre).filter(Cliente.id == mascota.cliente_id).scalar_one_or_none()
    return base.model_copy(update={"cliente_nombre": nombre})


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