"""
Relación N:N entre propietario (cliente) y clínica (empresa).

Un mismo propietario puede vincularse a varias clínicas con distinto nivel de acceso.
"""

from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database.database import Base


class ClienteEmpresaVinculo(Base):
    __tablename__ = "cliente_empresa_vinculos"
    __table_args__ = (UniqueConstraint("cliente_id", "empresa_id", name="uq_cliente_empresa_vinculo"),)

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)

    # full = historial y edición según rol; partial = detectar + operar en esta clínica sin historial ajeno
    access_level = Column(String(20), nullable=False, default="full")
    estado = Column(String(30), nullable=False, default="active")

    marketing_canal = Column(String(150), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    validated_at = Column(TIMESTAMP, nullable=True)

    cliente = relationship("Cliente", back_populates="vinculos_empresa")
    empresa = relationship("Empresa", back_populates="cliente_vinculos")
