"""
Fórmula médica: medicamentos prescritos por el veterinario.
Pueden estar ligados a una cita (prescripción en la cita) o a una consulta (fórmula de la consulta).
Al crear la consulta desde una cita, se copian los ítems de la cita a la consulta.
"""

from sqlalchemy import Column, Integer, String, Text, Numeric, ForeignKey
from sqlalchemy.orm import relationship

from app.database.database import Base


class FormulaItem(Base):
    __tablename__ = "formula_items"

    id = Column(Integer, primary_key=True, index=True)
    consulta_id = Column(Integer, ForeignKey("consultas.id", ondelete="CASCADE"), nullable=True)
    cita_id = Column(Integer, ForeignKey("citas.id", ondelete="CASCADE"), nullable=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    presentacion = Column(String(200), nullable=True)  # ej. "100mg x 30 comprimidos"
    precio = Column(Numeric(12, 2), nullable=True)  # precio unitario en la fórmula
    observacion = Column(Text, nullable=True)  # cómo aplicar el medicamento
    cantidad = Column(Integer, default=1, nullable=False)

    consulta = relationship("Consulta", backref="formula_items")
    cita = relationship("Cita", backref="formula_items")
    producto = relationship("Producto")
