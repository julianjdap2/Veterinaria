from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UsuarioBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    email: EmailStr
    rol_id: int


class UsuarioCreate(UsuarioBase):
    password: str = Field(min_length=8, max_length=128)
    perfil_admin_id: int | None = Field(default=None, description="Solo aplica si rol_id es administrador")


class UsuarioUpdate(BaseModel):
    """Payload para actualizar usuario (p. ej. activo)."""
    activo: bool | None = None
    perfil_admin_id: int | None = Field(
        default=None,
        description="Perfil de permisos admin (solo usuarios con rol administrador). null revierte a plantilla empresa.",
    )


class UsuarioPasswordAdminReset(BaseModel):
    """Reset de contraseña por administrador de la empresa (sin contraseña anterior)."""

    password: str = Field(min_length=8, max_length=128, description="Nueva contraseña temporal o definitiva")


class MisPermisosAdminResponse(BaseModel):
    """Permisos granulares del admin para la empresa actual (para UI)."""

    admin_gestion_usuarios: bool
    admin_gestion_inventario: bool
    admin_gestion_ventas: bool
    admin_gestion_citas: bool
    admin_ver_auditoria: bool
    admin_configuracion_empresa: bool
    admin_carga_masiva_inventario: bool
    admin_exportacion_dashboard: bool


class UsuarioResponse(UsuarioBase):
    id: int
    empresa_id: int
    activo: bool
    created_at: datetime
    perfil_admin_id: int | None = None

    model_config = ConfigDict(from_attributes=True)
