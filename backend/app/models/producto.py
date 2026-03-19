"""
producto.py

Productos (medicamentos/insumos) por empresa.
Incluye: categoría, EAN, código de artículo, fabricante, presentación, stock y stock mínimo (alerta).
"""

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Numeric
from sqlalchemy.orm import relationship

from app.database.database import Base


class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False)
    categoria_id = Column(Integer, ForeignKey("categorias_producto.id"), nullable=True)
    nombre = Column(String(200), nullable=False)
    cod_articulo = Column(String(50), nullable=True)  # código interno o del fabricante
    ean = Column(String(20), nullable=True)  # código de barras EAN
    fabricante = Column(String(150), nullable=True)
    presentacion = Column(String(200), nullable=True)  # ej. "100mg x 30 comprimidos"
    tipo = Column(String(50), nullable=True)  # medicamento, insumo (legacy; puede deprecarse por categoría)
    unidad = Column(String(50), nullable=True)  # unidad, caja, ml, etc.
    precio = Column(Numeric(12, 2), nullable=True)
    stock_actual = Column(Integer, default=0, nullable=False)
    stock_minimo = Column(Integer, default=0, nullable=False)  # alerta si stock_actual <= stock_minimo
    activo = Column(Boolean, default=True, nullable=False)

    empresa = relationship("Empresa", backref="productos")
    categoria = relationship("CategoriaProducto", backref="productos")
