from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, computed_field


class ProductoBase(BaseModel):
    nombre: str = Field(..., max_length=200)
    categoria_id: Optional[int] = None
    cod_articulo: Optional[str] = Field(None, max_length=50)
    ean: Optional[str] = Field(None, max_length=20)
    fabricante: Optional[str] = Field(None, max_length=150)
    presentacion: Optional[str] = Field(None, max_length=200)
    tipo: Optional[str] = Field(None, max_length=50)
    unidad: Optional[str] = Field(None, max_length=50)
    precio: Optional[Decimal] = None
    stock_minimo: int = Field(0, ge=0)
    activo: bool = True


class ProductoCreate(ProductoBase):
    stock_inicial: Optional[int] = Field(0, ge=0)


class ProductoUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=200)
    categoria_id: Optional[int] = None
    cod_articulo: Optional[str] = Field(None, max_length=50)
    ean: Optional[str] = Field(None, max_length=20)
    fabricante: Optional[str] = Field(None, max_length=150)
    presentacion: Optional[str] = Field(None, max_length=200)
    tipo: Optional[str] = Field(None, max_length=50)
    unidad: Optional[str] = Field(None, max_length=50)
    precio: Optional[Decimal] = None
    stock_minimo: Optional[int] = Field(None, ge=0)
    activo: Optional[bool] = None
    stock_ajuste: Optional[int] = None


class ProductoResponse(ProductoBase):
    id: int
    empresa_id: int
    stock_actual: int

    @computed_field
    @property
    def alerta_stock_bajo(self) -> bool:
        """True si tiene stock mínimo definido y el actual está en o por debajo."""
        return self.stock_minimo > 0 and self.stock_actual <= self.stock_minimo

    model_config = ConfigDict(from_attributes=True)


class ProductosListResponse(BaseModel):
    """Respuesta paginada del listado de productos."""

    items: list[ProductoResponse]
    total: int
    page: int
    page_size: int
