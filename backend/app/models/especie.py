"""
especie.py

Modelo ORM para especies (Perro, Gato, etc.). Catálogo compartido.
"""

from sqlalchemy import Column, Integer, String
from app.database.database import Base


class Especie(Base):
    __tablename__ = "especies"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), nullable=False)
