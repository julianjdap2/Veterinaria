"""Schemas para catálogos especies y razas."""

from pydantic import BaseModel, ConfigDict


class EspecieResponse(BaseModel):
    id: int
    nombre: str
    model_config = ConfigDict(from_attributes=True)


class RazaResponse(BaseModel):
    id: int
    nombre: str | None
    especie_id: int | None
    model_config = ConfigDict(from_attributes=True)
