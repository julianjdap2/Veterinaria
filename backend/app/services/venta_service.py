from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models.consulta import Consulta
from app.models.mascota import Mascota
from app.repositories.cita_repository import obtener_cita_por_id_y_empresa
from app.repositories.consulta_repository import obtener_consulta_por_id
from app.repositories.venta_repository import crear_venta as repo_crear_venta
from app.repositories.venta_repository import listar_ventas as repo_listar_ventas
from app.repositories.venta_repository import obtener_venta as repo_obtener_venta
from app.repositories.venta_repository import obtener_venta_ampliada as repo_obtener_venta_ampliada
from app.schemas.venta_schema import VentaDetalleAmpliadoResponse, VentaItemAmpliadoResponse, VentaResponse


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

    metodo_pago = (payload.get("metodo_pago") or "efectivo").strip()
    tipo_operacion = (payload.get("tipo_operacion") or "venta").strip()
    venta_origen_id = payload.get("venta_origen_id")
    motivo_cyd = payload.get("motivo_cyd")

    if tipo_operacion in ("cambio", "devolucion") and not venta_origen_id:
        raise ApiError(
            code="venta_origen_required",
            message="Para cambio/devolucion debes indicar venta_origen_id",
            status_code=400,
        )

    if venta_origen_id:
        origen = repo_obtener_venta(db, venta_origen_id, empresa_id)
        if not origen:
            raise ApiError(
                code="venta_origen_not_found",
                message="Venta origen no encontrada",
                status_code=404,
            )

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
            metodo_pago=metodo_pago,
            tipo_operacion=tipo_operacion,
            venta_origen_id=venta_origen_id,
            motivo_cyd=motivo_cyd,
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


def obtener_venta_ampliada_service(db: Session, venta_id: int, empresa_id: int) -> VentaDetalleAmpliadoResponse:
    v = repo_obtener_venta_ampliada(db, venta_id, empresa_id)
    if not v:
        raise ApiError(
            code="venta_not_found",
            message="Venta no encontrada",
            status_code=404,
        )

    cli_nom = None
    cli_doc = None
    if v.cliente:
        cli_nom = v.cliente.nombre
        cli_doc = v.cliente.documento
    elif v.consulta and v.consulta.mascota and getattr(v.consulta.mascota, "cliente", None):
        cli_nom = v.consulta.mascota.cliente.nombre
        cli_doc = v.consulta.mascota.cliente.documento

    mas_nom = None
    if v.consulta and v.consulta.mascota:
        mas_nom = v.consulta.mascota.nombre

    items_out: list[VentaItemAmpliadoResponse] = []
    for it in v.items:
        ir = VentaItemAmpliadoResponse.model_validate(it)
        pn = it.producto.nombre if it.producto else None
        items_out.append(ir.model_copy(update={"producto_nombre": pn}))

    base = VentaResponse.model_validate(v).model_dump()
    # Evitar duplicar "items": **base ya trae items de VentaResponse; los ampliados van aparte.
    base.pop("items", None)
    return VentaDetalleAmpliadoResponse(
        **base,
        cliente_nombre=cli_nom,
        cliente_documento=cli_doc,
        mascota_nombre=mas_nom,
        items=items_out,
    )
