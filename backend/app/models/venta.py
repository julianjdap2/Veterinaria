"""
venta.py

Ventas de productos (medicamentos/insumos). Opcionalmente vinculadas a consulta o cliente.
"""

from sqlalchemy import Column, Integer, Numeric, ForeignKey, TIMESTAMP, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database.database import Base


class Venta(Base):
    __tablename__ = "ventas"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False)
    fecha = Column(DateTime, server_default=func.now(), nullable=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True)
    consulta_id = Column(Integer, ForeignKey("consultas.id"), nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)  # quien registró
    total = Column(Numeric(12, 2), nullable=True)

    empresa = relationship("Empresa")
    cliente = relationship("Cliente")
    consulta = relationship("Consulta")
    usuario = relationship("Usuario")
    items = relationship("VentaItem", back_populates="venta", cascade="all, delete-orphan")


class VentaItem(Base):
    __tablename__ = "ventas_items"

    id = Column(Integer, primary_key=True, index=True)
    venta_id = Column(Integer, ForeignKey("ventas.id"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Numeric(12, 2), nullable=False)

    venta = relationship("Venta", back_populates="items")
    producto = relationship("Producto")
