from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class EmpresaAdminPermisosPayload(BaseModel):
    admin_gestion_usuarios: bool = True
    admin_gestion_inventario: bool = True
    admin_gestion_ventas: bool = True
    admin_gestion_citas: bool = True
    admin_ver_auditoria: bool = True
    admin_configuracion_empresa: bool = True
    admin_carga_masiva_inventario: bool = True
    admin_exportacion_dashboard: bool = True


class EmpresaSuperadminResponse(BaseModel):
    id: int
    nombre: str
    email: str | None = None
    activa: bool
    estado: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EmpresaPermisosResponse(EmpresaAdminPermisosPayload):
    empresa_id: int


class EmpresaCreatePayload(BaseModel):
    nombre: str
    nit: str | None = None
    telefono: str | None = None
    email: str | None = None
    direccion: str | None = None
    plan_id: int | None = None
    estado: str = "en_prueba"
    activa: bool = True


class EmpresaUpdatePayload(BaseModel):
    nombre: str | None = None
    nit: str | None = None
    telefono: str | None = None
    email: str | None = None
    direccion: str | None = None
    plan_id: int | None = None
    estado: str | None = None
    activa: bool | None = None


class PlanResponse(BaseModel):
    id: int
    nombre: str
    codigo: str
    precio: float
    max_usuarios: int | None = None
    max_mascotas: int | None = None
    max_citas_mes: int | None = None
    modulo_inventario: bool
    modulo_ventas: bool
    modulo_reportes: bool
    modulo_facturacion_electronica: bool
    feature_recordatorios_automaticos: bool
    feature_dashboard_avanzado: bool
    feature_exportaciones: bool
    feature_ia_consultorio: bool = False
    soporte_nivel: str

    model_config = ConfigDict(from_attributes=True)


class PlanCreatePayload(BaseModel):
    nombre: str
    codigo: str
    precio: float
    max_usuarios: int | None = None
    max_mascotas: int | None = None
    max_citas_mes: int | None = None
    modulo_inventario: bool = True
    modulo_ventas: bool = True
    modulo_reportes: bool = True
    modulo_facturacion_electronica: bool = False
    feature_recordatorios_automaticos: bool = True
    feature_dashboard_avanzado: bool = False
    feature_exportaciones: bool = True
    feature_ia_consultorio: bool = False
    soporte_nivel: str = "basico"


class PlanUpdatePayload(BaseModel):
    nombre: str | None = None
    codigo: str | None = None
    precio: float | None = None
    max_usuarios: int | None = None
    max_mascotas: int | None = None
    max_citas_mes: int | None = None
    modulo_inventario: bool | None = None
    modulo_ventas: bool | None = None
    modulo_reportes: bool | None = None
    modulo_facturacion_electronica: bool | None = None
    feature_recordatorios_automaticos: bool | None = None
    feature_dashboard_avanzado: bool | None = None
    feature_exportaciones: bool | None = None
    feature_ia_consultorio: bool | None = None
    soporte_nivel: str | None = None


class EmpresaConfiguracionPayload(BaseModel):
    logo_url: str | None = None
    horario_desde: str | None = None
    horario_hasta: str | None = None
    timezone: str | None = "America/Bogota"
    tipos_servicio_json: str | None = None
    precios_servicio_json: str | None = None
    configuracion_agenda_json: str | None = None
    modulo_inventario: bool = True
    modulo_ventas: bool = True
    modulo_reportes: bool = True
    modulo_facturacion_electronica: bool = False
    feature_recordatorios_automaticos: bool = True
    feature_dashboard_avanzado: bool = False
    feature_exportaciones: bool = True


class EmpresaConfiguracionResponse(EmpresaConfiguracionPayload):
    """Respuesta de configuración; permite validar desde ORM EmpresaConfiguracion."""

    empresa_id: int
    venta_prefijo: str | None = None
    venta_siguiente_numero: int | None = None
    venta_numero_padding: int | None = None
    notificaciones_json: str | None = None

    model_config = ConfigDict(from_attributes=True)


class EmpresaPerfilAdminBase(BaseModel):
    """Overrides opcionales: null en respuesta = heredar de la plantilla de empresa."""

    admin_gestion_usuarios: bool | None = None
    admin_gestion_inventario: bool | None = None
    admin_gestion_ventas: bool | None = None
    admin_gestion_citas: bool | None = None
    admin_ver_auditoria: bool | None = None
    admin_configuracion_empresa: bool | None = None
    admin_carga_masiva_inventario: bool | None = None
    admin_exportacion_dashboard: bool | None = None


class EmpresaPerfilAdminCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    slug: str = Field(min_length=1, max_length=50, pattern=r"^[a-z0-9][a-z0-9\-]*$")
    overrides: EmpresaPerfilAdminBase = Field(default_factory=EmpresaPerfilAdminBase)


class EmpresaPerfilAdminUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    slug: str | None = Field(default=None, min_length=1, max_length=50, pattern=r"^[a-z0-9][a-z0-9\-]*$")
    # dict explícito para PATCH parcial (evita anular permisos con None por defecto del modelo anidado).
    overrides: dict[str, bool | None] | None = None


class EmpresaPerfilAdminResponse(BaseModel):
    id: int
    empresa_id: int
    nombre: str
    slug: str
    admin_gestion_usuarios: bool | None = None
    admin_gestion_inventario: bool | None = None
    admin_gestion_ventas: bool | None = None
    admin_gestion_citas: bool | None = None
    admin_ver_auditoria: bool | None = None
    admin_configuracion_empresa: bool | None = None
    admin_carga_masiva_inventario: bool | None = None
    admin_exportacion_dashboard: bool | None = None

    model_config = ConfigDict(from_attributes=True)
