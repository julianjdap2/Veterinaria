from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models.consulta import Consulta
from app.models.mascota import Mascota
from app.repositories.cita_repository import obtener_cita_por_id_y_empresa
from app.repositories.consulta_repository import obtener_consulta_por_id
from app.repositories.venta_repository import crear_venta as repo_crear_venta
from app.repositories.venta_repository import listar_ventas as repo_listar_ventas
from app.repositories.venta_repository import obtener_venta as repo_obtener_venta


def _cliente_desde_consulta(db: Session, consulta_id: int, empresa_id: int) -> int | None:
    consulta = (
        db.query(Consulta)
        .join(Mascota, Consulta.mascota_id == Mascota.id)
        .filter(Consulta.id == consulta_id, Mascota.empresa_id == empresa_id)
        .first()
    )
    if not consulta or not consulta.mascota:
        return None
    return getattr(consulta.mascota, "cliente_id", None)


def crear_venta_service(
    db: Session,
    empresa_id: int,
    usuario_id: int | None,
    payload: dict,
):
    cliente_id = payload.get("cliente_id")
    consulta_id = payload.get("consulta_id")
    if consulta_id and cliente_id is None:
        cliente_id = _cliente_desde_consulta(db, consulta_id, empresa_id)

    # Control de estados: si la venta está ligada a una consulta, la cita debe estar "atendida".
    if consulta_id:
        consulta = obtener_consulta_por_id(db=db, consulta_id=consulta_id, empresa_id=empresa_id)
        if not consulta:
            raise ApiError(code="consulta_not_found", message="Consulta no encontrada", status_code=404)
        cita_id = getattr(consulta, "cita_id", None)
        if cita_id:
            cita = obtener_cita_por_id_y_empresa(db, cita_id, empresa_id)
            if not cita:
                raise ApiError(code="cita_not_found", message="Cita no encontrada", status_code=404)
            if (cita.estado or "").strip() != "atendida":
                raise ApiError(
                    code="venta_cita_no_atendida",
                    message="No se puede registrar la venta: la cita aún no está atendida.",
                    status_code=400,
                )
    items = [
        {
            "producto_id": it["producto_id"],
            "cantidad": it["cantidad"],
            "precio_unitario": it.get("precio_unitario"),
        }
        for it in payload["items"]
    ]
    try:
        return repo_crear_venta(
            db=db,
            empresa_id=empresa_id,
            usuario_id=usuario_id,
            cliente_id=cliente_id,
            consulta_id=consulta_id,
            items=items,
        )
    except ValueError as e:
        raise ApiError(
            code="venta_error",
            message=str(e),
            status_code=400,
        )


def listar_ventas_service(
    db: Session,
    empresa_id: int,
    page: int = 1,
    page_size: int = 20,
    consulta_id: int | None = None,
):
    return repo_listar_ventas(
        db=db,
        empresa_id=empresa_id,
        page=page,
        page_size=page_size,
        consulta_id=consulta_id,
    )


def obtener_venta_service(db: Session, venta_id: int, empresa_id: int):
    v = repo_obtener_venta(db, venta_id, empresa_id)
    if not v:
        raise ApiError(
            code="venta_not_found",
            message="Venta no encontrada",
            status_code=404,
        )
    return v
