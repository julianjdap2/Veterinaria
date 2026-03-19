"""
categoria_producto.py

Categorías de productos por empresa (Medicamento, Insumo, Alimento, etc.).
"""

from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from app.database.database import Base


class CategoriaProducto(Base):
    __tablename__ = "categorias_producto"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False)
    nombre = Column(String(80), nullable=False)

    empresa = relationship("Empresa", backref="categorias_producto")
