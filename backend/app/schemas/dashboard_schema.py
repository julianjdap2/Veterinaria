from pydantic import BaseModel


class DashboardTopVeterinario(BaseModel):
    veterinario_id: int
    nombre: str
    citas: int


class DashboardSerieDia(BaseModel):
    fecha: str  # YYYY-MM-DD
    atendidas: int


class DashboardSerieVentasDia(BaseModel):
    fecha: str  # YYYY-MM-DD
    ventas: int
    ingresos: float


class DashboardTopProducto(BaseModel):
    producto_id: int
    nombre: str
    unidades: int
    ingresos: float


class DashboardTopTexto(BaseModel):
    texto: str
    cantidad: int


class DashboardNotificationLog(BaseModel):
    id: int
    canal: str
    tipo_evento: str
    destino: str | None = None
    estado: str
    proveedor: str | None = None
    error: str | None = None
    created_at: str


class DashboardResumenResponse(BaseModel):
    total_hoy: int
    pendientes_hoy: int
    confirmadas_hoy: int
    en_revision_hoy: int
    atendidas_hoy: int
    canceladas_hoy: int
    urgentes_hoy: int
    en_sala_espera_ahora: int
    espera_promedio_min_hoy: int
    ventas_hoy: int
    ingresos_hoy: float
    ticket_promedio_hoy: float
    ventas_ultimos_7_dias: list[DashboardSerieVentasDia]
    top_productos_hoy: list[DashboardTopProducto]
    notificaciones_email_hoy: int
    notificaciones_sms_hoy: int
    notificaciones_whatsapp_hoy: int
    notificaciones_fallidas_hoy: int
    consultas_totales_periodo: int
    top_motivos_consulta: list[DashboardTopTexto]
    top_tratamientos: list[DashboardTopTexto]
    top_vacunas_consulta: list[DashboardTopTexto]
    top_pruebas_laboratorio_consulta: list[DashboardTopTexto]
    top_hospitalizacion_consulta: list[DashboardTopTexto]
    top_procedimientos_cita: list[DashboardTopTexto]
    top_veterinarios_hoy: list[DashboardTopVeterinario]
    atendidas_ultimos_7_dias: list[DashboardSerieDia]
