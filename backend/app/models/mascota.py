from sqlalchemy import Column, Integer, String, ForeignKey, Date, DECIMAL, TIMESTAMP
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database.database import Base


class Mascota(Base):

    __tablename__ = "mascotas"

    id = Column(Integer, primary_key=True, index=True)

    nombre = Column(String(100), nullable=False)

    cliente_id = Column(Integer, ForeignKey("clientes.id"))

    especie_id = Column(Integer)

    raza_id = Column(Integer)

    sexo = Column(String(1))

    fecha_nacimiento = Column(Date)

    color = Column(String(50))

    peso = Column(DECIMAL(5,2))

    alergias = Column(String(500))

    empresa_id = Column(Integer, ForeignKey("empresas.id"))

    activo = Column(Integer, default=1)

    created_at = Column(
        TIMESTAMP,
        server_default=func.now()
    )

    cliente = relationship("Cliente", back_populates="mascotas")

    empresa = relationship("Empresa", back_populates="mascotas")