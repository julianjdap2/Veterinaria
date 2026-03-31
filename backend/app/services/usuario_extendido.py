"""Parseo y fusión del JSON extendido de usuario (preferencias, operativo, profesional)."""

from __future__ import annotations

import copy
import json
from typing import Any

from pydantic import BaseModel, Field


class UsuarioPreferencias(BaseModel):
    notif_email_cuenta: bool = True
    agenda_color_evento: str | None = None


class UsuarioOperativo(BaseModel):
    acceso_consultorio: bool = True
    hospitalizacion_ambulatorio: bool = True
    info_tutores_completa: bool = True
    admin_agenda: bool = False
    admin_disponibilidad: bool = False
    agenda_personal: bool = True
    # Lista de códigos; vacío = sin restricción (acceso a todos los servicios/tipos).
    servicios_relacionados: list[str] = Field(default_factory=list)


class UsuarioProfesional(BaseModel):
    especialidades: list[str] = Field(default_factory=list)
    tarjeta_numero: str = ""
    tarjeta_adjunto_url: str | None = None
    firma_url: str | None = None


class UsuarioExtendido(BaseModel):
    preferencias: UsuarioPreferencias = Field(default_factory=UsuarioPreferencias)
    operativo: UsuarioOperativo = Field(default_factory=UsuarioOperativo)
    profesional: UsuarioProfesional = Field(default_factory=UsuarioProfesional)


def _default_extendido_dict() -> dict[str, Any]:
    return UsuarioExtendido().model_dump()


def _deep_merge(base: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(base)
    for k, v in patch.items():
        if k in out and isinstance(out[k], dict) and isinstance(v, dict):
            out[k] = _deep_merge(out[k], v)
        else:
            out[k] = copy.deepcopy(v) if isinstance(v, dict) else v
    return out


def parse_extendido_json(raw: str | None) -> UsuarioExtendido:
    base = _default_extendido_dict()
    if not raw or not raw.strip():
        return UsuarioExtendido.model_validate(base)
    try:
        data = json.loads(raw)
        if not isinstance(data, dict):
            return UsuarioExtendido.model_validate(base)
        merged = _deep_merge(base, data)
        return UsuarioExtendido.model_validate(merged)
    except (json.JSONDecodeError, ValueError):
        return UsuarioExtendido.model_validate(base)


def apply_extendido_patch_dict(existing: UsuarioExtendido, patch: dict[str, Any]) -> UsuarioExtendido:
    """Fusiona un dict parcial (p. ej. desde PATCH JSON) sobre el estado actual."""
    merged = _deep_merge(existing.model_dump(), patch)
    return UsuarioExtendido.model_validate(merged)


def serialize_extendido(ext: UsuarioExtendido) -> str:
    return json.dumps(ext.model_dump(), ensure_ascii=False, separators=(",", ":"))
