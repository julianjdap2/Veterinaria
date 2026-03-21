from sqlalchemy import Boolean, Column, ForeignKey, Integer, TIMESTAMP
from sqlalchemy.sql import func

from app.database.database import Base


class EmpresaAdminPermiso(Base):
    __tablename__ = "empresa_admin_permisos"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, unique=True)

    admin_gestion_usuarios = Column(Boolean, nullable=False, default=True)
    admin_gestion_inventario = Column(Boolean, nullable=False, default=True)
    admin_gestion_ventas = Column(Boolean, nullable=False, default=True)
    admin_gestion_citas = Column(Boolean, nullable=False, default=True)
    admin_ver_auditoria = Column(Boolean, nullable=False, default=True)
    admin_configuracion_empresa = Column(Boolean, nullable=False, default=True)

    admin_carga_masiva_inventario = Column(Boolean, nullable=False, default=True)
    admin_exportacion_dashboard = Column(Boolean, nullable=False, default=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
