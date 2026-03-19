"""
movimiento_stock.py

Historial de movimientos de stock (entrada, salida, ajuste) por producto.
"""

from sqlalchemy import Column, Integer, String, ForeignKey, TIMESTAMP, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database.database import Base


class MovimientoStock(Base):
    __tablename__ = "movimientos_stock"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    tipo = Column(String(20), nullable=False)  # entrada, salida, ajuste
    cantidad = Column(Integer, nullable=False)  # positivo para entrada/ajuste+, negativo para salida o siempre positivo y tipo indica signo
    observacion = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    venta_id = Column(Integer, ForeignKey("ventas.id"), nullable=True)  # si la salida es por venta

    producto = relationship("Producto", backref="movimientos")
    venta = relationship("Venta", backref="movimientos_stock")
