"""Lectura/actualización de parámetros operativos de la clínica (empresa actual)."""

import json

from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models.empresa_configuracion import EmpresaConfiguracion
from app.schemas.empresa_operacion_schema import (
    ConfigOperativaResponse,
    ConfigOperativaUpdate,
    TipoServicioCita,
)

DEFAULT_TIPOS_SERVICIO: list[dict] = [
    {
        "id": "consulta",
        "label": "Consulta",
        "duracion_min": 30,
        "allow_urgente": True,
        "allow_recurrente": True,
        "categoria": "consulta",
    },
    {
        "id": "vacuna",
        "label": "Vacunación",
        "duracion_min": 30,
        "allow_urgente": False,
        "allow_recurrente": True,
        "categoria": "prevencion",
    },
    {
        "id": "cirugia",
        "label": "Cirugía",
        "duracion_min": 90,
        "allow_urgente": True,
        "allow_recurrente": False,
        "categoria": "quirurgico",
    },
    {
        "id": "peluqueria",
        "label": "Peluquería / baño",
        "duracion_min": 60,
        "allow_urgente": False,
        "allow_recurrente": True,
        "categoria": "estetica",
    },
]


def _obtener_o_crear_config_row(db: Session, empresa_id: int) -> EmpresaConfiguracion:
    rec = (
        db.query(EmpresaConfiguracion)
        .filter(EmpresaConfiguracion.empresa_id == empresa_id)
        .first()
    )
    if not rec:
        rec = EmpresaConfiguracion(empresa_id=empresa_id)
        db.add(rec)
        db.commit()
        db.refresh(rec)
    return rec


def _parse_tipos_json(raw: str | None) -> list[TipoServicioCita]:
    if not raw or not raw.strip():
        return [TipoServicioCita.model_validate(x) for x in DEFAULT_TIPOS_SERVICIO]
    try:
        data = json.loads(raw)
        if not isinstance(data, list) or not data:
            return [TipoServicioCita.model_validate(x) for x in DEFAULT_TIPOS_SERVICIO]
        return [TipoServicioCita.model_validate(x) for x in data]
    except (json.JSONDecodeError, ValueError):
        return [TipoServicioCita.model_validate(x) for x in DEFAULT_TIPOS_SERVICIO]


def obtener_config_operativa_service(db: Session, empresa_id: int) -> ConfigOperativaResponse:
    rec = _obtener_o_crear_config_row(db, empresa_id)
    tipos = _parse_tipos_json(rec.tipos_servicio_json)
    return ConfigOperativaResponse(
        tipos_servicio=tipos,
        venta_prefijo=(rec.venta_prefijo or "V-").strip() or "V-",
        venta_siguiente_numero=int(rec.venta_siguiente_numero or 1),
        venta_numero_padding=int(rec.venta_numero_padding or 6),
        timezone=rec.timezone,
    )


def actualizar_config_operativa_service(
    db: Session, empresa_id: int, payload: ConfigOperativaUpdate
) -> ConfigOperativaResponse:
    rec = _obtener_o_crear_config_row(db, empresa_id)
    data = payload.model_dump(exclude_unset=True)
    if "tipos_servicio" in data and data["tipos_servicio"] is not None:
        tipos = [TipoServicioCita.model_validate(x) for x in data["tipos_servicio"]]
        if len(tipos) < 1:
            raise ApiError(
                code="tipos_servicio_invalid",
                message="Debe existir al menos un tipo de servicio",
                status_code=400,
            )
        # ids únicos
        ids = [t.id for t in tipos]
        if len(ids) != len(set(ids)):
            raise ApiError(
                code="tipos_servicio_duplicate_id",
                message="Los tipos de servicio deben tener id único",
                status_code=400,
            )
        rec.tipos_servicio_json = json.dumps(
            [t.model_dump() for t in tipos],
            ensure_ascii=False,
        )
    if "venta_prefijo" in data and data["venta_prefijo"] is not None:
        p = (data["venta_prefijo"] or "").strip()
        if not p:
            raise ApiError(
                code="venta_prefijo_invalid",
                message="El prefijo de venta no puede estar vacío",
                status_code=400,
            )
        rec.venta_prefijo = p
    if "venta_numero_padding" in data and data["venta_numero_padding"] is not None:
        rec.venta_numero_padding = int(data["venta_numero_padding"])
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return obtener_config_operativa_service(db, empresa_id)
