from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func

from app.database.database import Base


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)
    cita_id = Column(Integer, ForeignKey("citas.id"), nullable=True, index=True)
    canal = Column(String(20), nullable=False)  # email, sms, whatsapp
    tipo_evento = Column(String(50), nullable=False)  # cita_recordatorio, consulta_resumen, etc.
    destino = Column(String(255), nullable=True)
    estado = Column(String(20), nullable=False, default="sent")  # sent, failed
    proveedor = Column(String(50), nullable=True)  # smtp, twilio, log
    error = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
