"""
Perfil de permisos admin dentro de una empresa.

Cada campo de permiso nullable = heredar del registro empresa_admin_permisos (plantilla).
"""

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, TIMESTAMP, UniqueConstraint
from sqlalchemy.sql import func

from app.database.database import Base


class EmpresaPerfilAdmin(Base):
    __tablename__ = "empresa_perfiles_admin"
    __table_args__ = (UniqueConstraint("empresa_id", "slug", name="uq_empresa_perfil_slug"),)

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False)
    nombre = Column(String(100), nullable=False)
    slug = Column(String(50), nullable=False)

    admin_gestion_usuarios = Column(Boolean, nullable=True)
    admin_gestion_inventario = Column(Boolean, nullable=True)
    admin_gestion_ventas = Column(Boolean, nullable=True)
    admin_gestion_citas = Column(Boolean, nullable=True)
    admin_ver_auditoria = Column(Boolean, nullable=True)
    admin_configuracion_empresa = Column(Boolean, nullable=True)
    admin_carga_masiva_inventario = Column(Boolean, nullable=True)
    admin_exportacion_dashboard = Column(Boolean, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
