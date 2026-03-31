"""Catálogos de variables clínicas por empresa (vacunas, hospitalización, etc.)."""

from pydantic import BaseModel, Field


class ItemVariableSimple(BaseModel):
    id: str = Field(..., min_length=1, max_length=80)
    nombre: str = Field(..., min_length=1, max_length=200)
    categoria: str | None = Field(default=None, max_length=120)
    sistema: bool = False


class FormatoDocumentoItem(BaseModel):
    id: str = Field(..., min_length=1, max_length=80)
    nombre: str = Field(..., min_length=1, max_length=200)
    contenido_html: str = Field("", max_length=50000)
    sistema: bool = False


class VariablesClinicasResponse(BaseModel):
    vacunas: list[ItemVariableSimple]
    hospitalizacion: list[ItemVariableSimple]
    procedimientos: list[ItemVariableSimple]
    pruebas_laboratorio: list[ItemVariableSimple]
    formatos_documento: list[FormatoDocumentoItem]


class VariablesClinicasUpdate(BaseModel):
    vacunas: list[ItemVariableSimple] | None = None
    hospitalizacion: list[ItemVariableSimple] | None = None
    procedimientos: list[ItemVariableSimple] | None = None
    pruebas_laboratorio: list[ItemVariableSimple] | None = None
    formatos_documento: list[FormatoDocumentoItem] | None = None


class TopVariableUsoItem(BaseModel):
    id: str
    nombre: str
    cantidad: int
