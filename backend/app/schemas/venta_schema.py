from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class VentaItemCreate(BaseModel):
    producto_id: int
    cantidad: int = Field(..., gt=0)
    precio_unitario: Optional[Decimal] = None  # si no se envía, se usa precio del producto


class VentaItemResponse(BaseModel):
    id: int
    venta_id: int
    producto_id: int
    cantidad: int
    precio_unitario: Decimal

    model_config = ConfigDict(from_attributes=True)


class VentaCreate(BaseModel):
    cliente_id: Optional[int] = None
    consulta_id: Optional[int] = None
    items: list[VentaItemCreate] = Field(..., min_length=1)


class VentaResponse(BaseModel):
    id: int
    empresa_id: int
    fecha: Optional[datetime] = None
    cliente_id: Optional[int] = None
    consulta_id: Optional[int] = None
    usuario_id: Optional[int] = None
    total: Optional[Decimal] = None
    items: list[VentaItemResponse] = []

    model_config = ConfigDict(from_attributes=True)
