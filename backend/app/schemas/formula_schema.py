from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict


class FormulaItemCreate(BaseModel):
    producto_id: int
    presentacion: Optional[str] = None
    precio: Optional[Decimal] = None
    observacion: Optional[str] = None
    cantidad: int = 1


class FormulaItemResponse(BaseModel):
    id: int
    consulta_id: Optional[int] = None
    cita_id: Optional[int] = None
    producto_id: int
    presentacion: Optional[str] = None
    precio: Optional[Decimal] = None
    observacion: Optional[str] = None
    cantidad: int = 1
    producto_nombre: Optional[str] = None  # para mostrar en listado

    model_config = ConfigDict(from_attributes=True)
