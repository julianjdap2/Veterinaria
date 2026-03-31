"""Payloads JSON para variables clínicas enlazadas a consultas y citas."""

from __future__ import annotations

import json
from typing import Any, Optional

from pydantic import BaseModel, Field


class ConsultaExtrasClinicos(BaseModel):
    hospitalizacion_id: Optional[str] = None
    vacuna_ids: list[str] = Field(default_factory=list)
    pruebas_lab_ids: list[str] = Field(default_factory=list)
    formato_documento_id: Optional[str] = None


class CitaExtrasClinicos(BaseModel):
    vacuna_id: Optional[str] = None
    hospitalizacion_id: Optional[str] = None
    procedimiento_id: Optional[str] = None


def pop_extras_a_json_column(d: dict[str, Any], key_in: str, column: str) -> None:
    """Convierte `extras_clinicos` del body en columna `*_json` para el ORM."""
    if key_in not in d:
        return
    extras = d.pop(key_in)
    if extras is None:
        d[column] = None
    elif hasattr(extras, "model_dump"):
        d[column] = json.dumps(extras.model_dump(), ensure_ascii=False)
    elif isinstance(extras, dict):
        d[column] = json.dumps(extras, ensure_ascii=False)
    else:
        d[column] = None
