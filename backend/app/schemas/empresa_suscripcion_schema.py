"""Vista de suscripción SaaS para el administrador de la clínica (tenant)."""

from pydantic import BaseModel, ConfigDict, Field


class PlanCatalogoItem(BaseModel):
    """Plan tal como se muestra en el catálogo (comparativa)."""

    id: int
    nombre: str
    codigo: str
    precio: float = Field(..., description="Precio mensual referencia (COP)")
    max_usuarios: int | None = None
    max_mascotas: int | None = None
    max_citas_mes: int | None = None
    modulo_agenda: bool = True
    modulo_marketing: bool = False
    modulo_whatsapp: bool = False
    modulo_inventario: bool = True
    modulo_ventas: bool = True
    modulo_reportes: bool = True
    modulo_facturacion_electronica: bool = False
    feature_recordatorios_automaticos: bool = True
    feature_dashboard_avanzado: bool = False
    feature_exportaciones: bool = True
    feature_ia_consultorio: bool = False
    soporte_nivel: str = "basico"

    model_config = ConfigDict(from_attributes=True)


class SuscripcionTenantResponse(BaseModel):
    empresa_nombre: str
    empresa_estado: str
    plan_actual_id: int | None = None
    plan_actual: PlanCatalogoItem | None = None
    planes_catalogo: list[PlanCatalogoItem] = Field(default_factory=list)
