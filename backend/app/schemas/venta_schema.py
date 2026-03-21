from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from typing import Literal


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
    metodo_pago: Literal["efectivo", "tarjeta", "transferencia_qr", "cyd"] = "efectivo"
    tipo_operacion: Literal["venta", "cambio", "devolucion"] = "venta"
    venta_origen_id: Optional[int] = None
    motivo_cyd: Optional[str] = None
    items: list[VentaItemCreate] = Field(..., min_length=1)


class VentaResponse(BaseModel):
    id: int
    empresa_id: int
    fecha: Optional[datetime] = None
    cliente_id: Optional[int] = None
    consulta_id: Optional[int] = None
    usuario_id: Optional[int] = None
    metodo_pago: str = "efectivo"
    tipo_operacion: str = "venta"
    venta_origen_id: Optional[int] = None
    motivo_cyd: Optional[str] = None
    total: Optional[Decimal] = None
    codigo_interno: Optional[str] = None
    items: list[VentaItemResponse] = []

    model_config = ConfigDict(from_attributes=True)


class VentaItemAmpliadoResponse(VentaItemResponse):
    producto_nombre: Optional[str] = None


class VentaDetalleAmpliadoResponse(VentaResponse):
    cliente_nombre: Optional[str] = None
    cliente_documento: Optional[str] = None
    mascota_nombre: Optional[str] = None
    items: list[VentaItemAmpliadoResponse] = []

    model_config = ConfigDict(from_attributes=True)
