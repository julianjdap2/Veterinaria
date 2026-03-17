"""
mascota_schema.py

Schemas de validación para Mascotas.
Utilizamos Pydantic para validar los datos
que llegan a la API.
"""

from pydantic import BaseModel
from datetime import date
from typing import Optional


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


class MascotaCreate(MascotaBase):
    pass


class MascotaResponse(MascotaBase):

    id: int
    empresa_id: int
    activo: int

    class Config:
        from_attributes = True