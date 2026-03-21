"""Lectura y persistencia de configuración de notificaciones (JSON en empresa_configuraciones)."""

import json
from typing import Any

from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models.empresa_configuracion import EmpresaConfiguracion
from app.schemas.notificaciones_config_schema import (
    NotificacionesConfigResponse,
    NotificacionesConfigUpdate,
)


def _defaults_dict() -> dict[str, Any]:
    return NotificacionesConfigResponse().model_dump()


def _sanitize_reglas_en_dict(d: dict[str, Any]) -> None:
    """Compatibilidad: reglas sin ningún canal activo se corrigen con email por defecto."""
    reglas = d.get("reglas_recordatorio")
    if not isinstance(reglas, list):
        return
    for r in reglas:
        if isinstance(r, dict) and not (r.get("canal_email") or r.get("canal_sms") or r.get("canal_whatsapp")):
            r["canal_email"] = True


def _merge_notif_dict(raw: str | None) -> dict[str, Any]:
    base = _defaults_dict()
    if not raw or not str(raw).strip():
        return base
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            for k, v in data.items():
                if k in base and v is not None:
                    base[k] = v
        _sanitize_reglas_en_dict(base)
        return base
    except json.JSONDecodeError:
        return base


def _row(db: Session, empresa_id: int) -> EmpresaConfiguracion:
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


def obtener_notificaciones_config_service(db: Session, empresa_id: int) -> NotificacionesConfigResponse:
    rec = _row(db, empresa_id)
    merged = _merge_notif_dict(rec.notificaciones_json)
    return NotificacionesConfigResponse.model_validate(merged)


def actualizar_notificaciones_config_service(
    db: Session, empresa_id: int, payload: NotificacionesConfigUpdate
) -> NotificacionesConfigResponse:
    rec = _row(db, empresa_id)
    current = _merge_notif_dict(rec.notificaciones_json)
    updates = payload.model_dump(exclude_unset=True)
    current.update(updates)
    try:
        validated = NotificacionesConfigResponse.model_validate(current)
    except Exception as e:
        raise ApiError(
            code="notificaciones_config_invalid",
            message=f"Configuración inválida: {e}",
            status_code=400,
        ) from e
    rec.notificaciones_json = json.dumps(validated.model_dump(), ensure_ascii=False)
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return validated


def notificaciones_dict_for_empresa(db: Session, empresa_id: int) -> dict[str, Any]:
    """Uso interno (cron): dict fusionado con defaults."""
    rec = (
        db.query(EmpresaConfiguracion)
        .filter(EmpresaConfiguracion.empresa_id == empresa_id)
        .first()
    )
    return _merge_notif_dict(rec.notificaciones_json if rec else None)
