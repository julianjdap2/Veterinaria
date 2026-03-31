from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, TIMESTAMP
from sqlalchemy.sql import func

from app.database.database import Base


class EmpresaConfiguracion(Base):
    __tablename__ = "empresa_configuraciones"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, unique=True)

    # Datos de clínica (editable por admin/superadmin)
    logo_url = Column(String(255), nullable=True)
    horario_desde = Column(String(5), nullable=True)  # HH:MM
    horario_hasta = Column(String(5), nullable=True)  # HH:MM
    timezone = Column(String(50), nullable=True, default="America/Bogota")

    # Parametrización interna
    tipos_servicio_json = Column(Text, nullable=True)
    precios_servicio_json = Column(Text, nullable=True)
    configuracion_agenda_json = Column(Text, nullable=True)

    # Feature flags por empresa (override del plan)
    modulo_inventario = Column(Boolean, nullable=False, default=True)
    modulo_ventas = Column(Boolean, nullable=False, default=True)
    modulo_reportes = Column(Boolean, nullable=False, default=True)
    modulo_facturacion_electronica = Column(Boolean, nullable=False, default=False)
    feature_recordatorios_automaticos = Column(Boolean, nullable=False, default=True)
    feature_dashboard_avanzado = Column(Boolean, nullable=False, default=False)
    feature_exportaciones = Column(Boolean, nullable=False, default=True)
    modulo_planes_salud = Column(Boolean, nullable=False, default=True)

    # Consecutivo interno de ventas (por empresa; configurable en admin clínica)
    venta_prefijo = Column(String(20), nullable=False, default="V-")
    venta_siguiente_numero = Column(Integer, nullable=False, default=1)
    venta_numero_padding = Column(Integer, nullable=False, default=6)

    # Recordatorios y plantillas (JSON); ver services/notificaciones_config_service.py
    notificaciones_json = Column(Text, nullable=True)

    # Catálogos clínicos (vacunas, hospitalización, procedimientos, laboratorio, formatos); ver variables_clinicas_service.py
    variables_clinicas_json = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
