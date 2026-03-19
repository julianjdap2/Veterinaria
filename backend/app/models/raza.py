"""
raza.py

Modelo ORM para razas por especie (Labrador, Siames, etc.). Catálogo compartido.
"""

from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database.database import Base


class Raza(Base):
    __tablename__ = "razas"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=True)
    especie_id = Column(Integer, ForeignKey("especies.id"), nullable=True)

    especie = relationship("Especie", backref="razas")
