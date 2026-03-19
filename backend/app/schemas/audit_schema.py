"""Schemas para auditoría."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    id: int
    usuario_id: Optional[int]
    accion: str
    tabla_afectada: Optional[str]
    registro_id: Optional[int]
    descripcion: Optional[str]
    ip: Optional[str]
    created_at: datetime
    old_values: Optional[str] = None
    new_values: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
