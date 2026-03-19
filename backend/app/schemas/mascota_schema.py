"""
mascota_schema.py

Schemas de validación para Mascotas.
Utilizamos Pydantic para validar los datos
que llegan a la API.
"""

from datetime import date
from typing import Optional
from pydantic import BaseModel, ConfigDict


class MascotaBase(BaseModel):

    nombre: str
    cliente_id: int
    especie_id: Optional[int]=None
    raza_id: Optional[int]=None
    sexo: Optional[str]=None
    fecha_nacimiento: Optional[date]=None
    color: Optional[str]=None
    peso: Optional[float]=None
    alergias: Optional[str]=None


class MascotaUpdate(BaseModel):
    """Payload para actualizar mascota (p. ej. reactivar)."""

    activo: Optional[bool] = None


class MascotaCreate(MascotaBase):
    """Payload para crear una mascota."""

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "nombre": "Firulais",
                    "cliente_id": 1,
                    "especie_id": 1,
                    "raza_id": 1,
                    "sexo": "M",
                    "peso": 12.5,
                }
            ]
        }
    }


class MascotaResponse(MascotaBase):

    id: int
    empresa_id: int
    activo: bool

    model_config = ConfigDict(from_attributes=True)