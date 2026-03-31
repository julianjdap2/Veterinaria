from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.services.usuario_extendido import UsuarioExtendido


class UsuarioBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    email: EmailStr
    rol_id: int


class UsuarioCreate(UsuarioBase):
    password: str = Field(min_length=8, max_length=128)
    perfil_admin_id: int | None = Field(default=None, description="Solo aplica si rol_id es administrador")


class UsuarioPreferenciasPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    notif_email_cuenta: bool | None = None
    agenda_color_evento: str | None = None


class UsuarioOperativoPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    acceso_consultorio: bool | None = None
    hospitalizacion_ambulatorio: bool | None = None
    info_tutores_completa: bool | None = None
    admin_agenda: bool | None = None
    admin_disponibilidad: bool | None = None
    agenda_personal: bool | None = None
    servicios_relacionados: list[str] | None = None


class UsuarioProfesionalPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    especialidades: list[str] | None = None
    tarjeta_numero: str | None = None
    tarjeta_adjunto_url: str | None = None
    firma_url: str | None = None


class UsuarioExtendidoPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    preferencias: UsuarioPreferenciasPatch | None = None
    operativo: UsuarioOperativoPatch | None = None
    profesional: UsuarioProfesionalPatch | None = None


class UsuarioUpdate(BaseModel):
    """Actualización parcial por administrador de la empresa."""

    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = None
    documento: str | None = Field(default=None, max_length=64)
    telefono: str | None = Field(default=None, max_length=64)
    rol_id: int | None = Field(default=None, description="1 admin, 2 veterinario, 3 recepción")
    activo: bool | None = None
    perfil_admin_id: int | None = Field(
        default=None,
        description="Perfil de permisos admin (solo rol administrador). null = plantilla empresa.",
    )
    extendido: UsuarioExtendidoPatch | None = None


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


class UsuarioDetalleResponse(UsuarioBase):
    id: int
    empresa_id: int
    activo: bool
    created_at: datetime
    perfil_admin_id: int | None = None
    documento: str | None = None
    telefono: str | None = None
    extendido: UsuarioExtendido
