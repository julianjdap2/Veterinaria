from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func

from app.database.database import Base


class AuditLog(Base):

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)

    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)

    accion = Column(String(50), nullable=False)

    tabla_afectada = Column(String(50))

    registro_id = Column(Integer)

    descripcion = Column(Text)

    ip = Column(String(45))

    created_at = Column(TIMESTAMP, server_default=func.now())