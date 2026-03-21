/**
 * Tipos de datos de la API (auth, clientes, etc.).
 */

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface Cliente {
  id: number
  nombre: string
  documento: string | null
  telefono: string | null
  direccion: string | null
  email: string | null
  empresa_id: number
  activo: boolean
}

export interface ClienteCreate {
  nombre: string
  telefono?: string | null
  email?: string | null
  direccion?: string | null
  documento?: string | null
}

export interface ClienteUpdate {
  nombre?: string
  telefono?: string | null
  email?: string | null
  direccion?: string | null
  documento?: string | null
}

export interface Mascota {
  id: number
  empresa_id: number
  activo: boolean
  nombre: string
  cliente_id: number
  /** Presente en listados API enriquecidos */
  cliente_nombre?: string | null
  especie_id: number | null
  raza_id: number | null
  sexo: string | null
  fecha_nacimiento: string | null
  color: string | null
  peso: number | null
  alergias: string | null
}

export interface MascotaCreate {
  nombre: string
  cliente_id: number
  especie_id?: number | null
  raza_id?: number | null
  sexo?: string | null
  fecha_nacimiento?: string | null
  color?: string | null
  peso?: number | null
  alergias?: string | null
}

export interface Cita {
  id: number
  mascota_id: number
  mascota_nombre?: string | null
  veterinario_id: number | null
  veterinario_nombre?: string | null
  fecha: string | null
  motivo: string | null
  notas: string | null
  urgente: boolean
  en_sala_espera: boolean
  estado: string | null
}

export interface CitaCreate {
  mascota_id: number
  fecha?: string | null
  motivo?: string | null
  notas?: string | null
  estado?: string | null
  veterinario_id?: number | null
  urgente?: boolean
  en_sala_espera?: boolean
}

export interface CitasDisponibilidad {
  fecha: string // 'YYYY-MM-DD'
  veterinario_id: number
  disponible: string[] // ['08:00', '08:30', ...]
  reservado: string[]
}

export interface CitaUpdate {
  fecha?: string | null
  motivo?: string | null
  notas?: string | null
  estado?: string | null
  veterinario_id?: number | null
  urgente?: boolean | null
  en_sala_espera?: boolean | null
}

export interface CitaRecurrenteCreate {
  mascota_id: number
  fecha_inicio: string // 'YYYY-MM-DDTHH:mm:ss'
  veterinario_id: number
  motivo?: string | null
  notas?: string | null
  urgente?: boolean
  repeticiones: number
  intervalo_semana: number
  crear_waitlist_en_conflicto?: boolean
}

export interface CitaLlegadaCreate {
  mascota_id: number
  motivo?: string | null
  notas?: string | null
  urgente?: boolean
  veterinario_preferido_id?: number | null
  fecha_llegada?: string | null
}

export interface CitasRecurrentesResponse {
  created_ids: number[]
  skipped: Array<{ fecha: string; message: string; code?: string; status_code?: number }>
  waitlist_ids: number[]
}

export interface ListaEsperaCreate {
  mascota_id: number
  veterinario_id: number
  fecha: string // 'YYYY-MM-DDTHH:mm:ss'
  motivo?: string | null
  notas?: string | null
  urgente?: boolean
}

export interface ListaEsperaResponse {
  id: number
  empresa_id: number
  mascota_id: number
  veterinario_id: number
  fecha: string
  urgente: boolean
  motivo?: string | null
  notas?: string | null
  estado: string
  procesada: boolean
  created_at: string
  procesada_en?: string | null
  cita_id?: number | null
}

export interface DashboardTopVeterinario {
  veterinario_id: number
  nombre: string
  citas: number
}

export interface DashboardSerieDia {
  fecha: string
  atendidas: number
}

export interface DashboardSerieVentasDia {
  fecha: string
  ventas: number
  ingresos: number
}

export interface DashboardTopProducto {
  producto_id: number
  nombre: string
  unidades: number
  ingresos: number
}

export interface DashboardTopTexto {
  texto: string
  cantidad: number
}

export interface DashboardResumen {
  total_hoy: number
  pendientes_hoy: number
  confirmadas_hoy: number
  en_revision_hoy: number
  atendidas_hoy: number
  canceladas_hoy: number
  urgentes_hoy: number
  en_sala_espera_ahora: number
  espera_promedio_min_hoy: number
  ventas_hoy: number
  ingresos_hoy: number
  ticket_promedio_hoy: number
  ventas_ultimos_7_dias: DashboardSerieVentasDia[]
  top_productos_hoy: DashboardTopProducto[]
  notificaciones_email_hoy: number
  notificaciones_sms_hoy: number
  notificaciones_whatsapp_hoy: number
  notificaciones_fallidas_hoy: number
  consultas_totales_periodo: number
  top_motivos_consulta: DashboardTopTexto[]
  top_tratamientos: DashboardTopTexto[]
  top_veterinarios_hoy: DashboardTopVeterinario[]
  atendidas_ultimos_7_dias: DashboardSerieDia[]
}

export interface DashboardNotificationLog {
  id: number
  canal: string
  tipo_evento: string
  destino?: string | null
  estado: string
  proveedor?: string | null
  error?: string | null
  created_at: string
}

export interface Consulta {
  id: number
  veterinario_id: number
  created_at: string
  mascota_id: number
  cita_id: number | null
  motivo_consulta: string | null
  diagnostico: string | null
  tratamiento: string | null
  observaciones: string | null
  fecha_consulta: string | null
  cliente_id?: number | null
}

export interface ConsultaParaVenta {
  id: number
  mascota_id: number
  mascota_nombre: string
  created_at: string
}

export interface ConsultaCreate {
  mascota_id: number
  motivo_consulta?: string | null
  diagnostico?: string | null
  tratamiento?: string | null
  observaciones?: string | null
  fecha_consulta?: string | null
  cita_id?: number | null
}

export interface ConsultaCreateConFormula extends ConsultaCreate {
  formula_items: FormulaItemCreate[]
}

export interface ResumenConsulta {
  consulta_id: number
  fecha_consulta: string
  mascota_nombre: string
  cliente_nombre: string
  cliente_email: string
  veterinario_nombre: string
  motivo_consulta: string
  diagnostico: string
  tratamiento: string
  notas_cita: string
  observaciones: string
}

export interface FormulaItem {
  id: number
  consulta_id: number
  producto_id: number
  presentacion: string | null
  precio: string | number | null
  observacion: string | null
  cantidad: number
  producto_nombre?: string | null
}

export interface FormulaItemCreate {
  producto_id: number
  presentacion?: string | null
  precio?: number | null
  observacion?: string | null
  cantidad?: number
}

export interface CategoriaProducto {
  id: number
  empresa_id: number
  nombre: string
}

export interface Producto {
  id: number
  empresa_id: number
  nombre: string
  categoria_id: number | null
  cod_articulo: string | null
  ean: string | null
  fabricante: string | null
  presentacion: string | null
  tipo: string | null
  unidad: string | null
  precio: string | number | null
  stock_actual: number
  stock_minimo: number
  activo: boolean
  alerta_stock_bajo: boolean
}

export interface ProductoCreate {
  nombre: string
  categoria_id?: number | null
  cod_articulo?: string | null
  ean?: string | null
  fabricante?: string | null
  presentacion?: string | null
  tipo?: string | null
  unidad?: string | null
  precio?: number | null
  stock_minimo?: number
  activo?: boolean
  stock_inicial?: number
}

export interface VentaItemCreate {
  producto_id: number
  cantidad: number
  precio_unitario?: number | null
}

export interface VentaCreate {
  cliente_id?: number | null
  consulta_id?: number | null
  metodo_pago?: 'efectivo' | 'tarjeta' | 'transferencia_qr' | 'cyd'
  tipo_operacion?: 'venta' | 'cambio' | 'devolucion'
  venta_origen_id?: number | null
  motivo_cyd?: string | null
  items: VentaItemCreate[]
}

export interface VentaItemResponse {
  id: number
  venta_id: number
  producto_id: number
  cantidad: number
  precio_unitario: string | number
}

export interface Venta {
  id: number
  empresa_id: number
  fecha: string | null
  cliente_id: number | null
  consulta_id: number | null
  usuario_id: number | null
  metodo_pago?: string | null
  tipo_operacion?: string | null
  venta_origen_id?: number | null
  motivo_cyd?: string | null
  total: string | number | null
  codigo_interno?: string | null
  items: VentaItemResponse[]
}

export interface VentaItemAmpliadoResponse extends VentaItemResponse {
  producto_nombre?: string | null
}

export interface VentaDetalleAmpliado extends Venta {
  cliente_nombre?: string | null
  cliente_documento?: string | null
  mascota_nombre?: string | null
  items: VentaItemAmpliadoResponse[]
}

export interface TipoServicioCita {
  id: string
  label: string
  duracion_min: number
  allow_urgente: boolean
  allow_recurrente: boolean
  categoria: string
}

export interface ConfigOperativa {
  tipos_servicio: TipoServicioCita[]
  venta_prefijo: string
  venta_siguiente_numero: number
  venta_numero_padding: number
  timezone?: string | null
}

export interface ConfigOperativaUpdate {
  tipos_servicio?: TipoServicioCita[]
  venta_prefijo?: string | null
  venta_numero_padding?: number | null
}

export type RecordatorioModo = 'dia_calendario' | 'ventana_horas'

export type ReglaRecordatorioUnidad = 'horas' | 'dias' | 'semanas'

export interface ReglaRecordatorio {
  valor: number
  unidad: ReglaRecordatorioUnidad
  canal_email: boolean
  canal_sms: boolean
  canal_whatsapp: boolean
}

export interface NotificacionesConfig {
  recordatorio_modo: RecordatorioModo
  recordatorio_horas_antes: number
  recordatorio_ventana_horas: number
  canal_email: boolean
  canal_sms: boolean
  canal_whatsapp: boolean
  /** Si hay al menos una regla, el cron usa solo estas ventanas (y canales por fila). */
  reglas_recordatorio: ReglaRecordatorio[]
  plantilla_email_asunto: string
  plantilla_email_cuerpo: string
  plantilla_sms_cuerpo: string
  max_envios_recordatorio_dia: number | null
  reply_to_email: string | null
}

export type NotificacionesConfigUpdate = Partial<NotificacionesConfig>

export interface Especie {
  id: number
  nombre: string
}

export interface Raza {
  id: number
  nombre: string | null
  especie_id: number | null
}

export interface Usuario {
  id: number
  empresa_id: number
  activo: boolean
  created_at: string
  nombre: string
  email: string
  rol_id: number
  perfil_admin_id?: number | null
}

export interface UsuarioCreate {
  nombre: string
  email: string
  rol_id: number
  password: string
  perfil_admin_id?: number | null
}

export interface AuditLog {
  id: number
  usuario_id: number | null
  accion: string
  tabla_afectada: string | null
  registro_id: number | null
  descripcion: string | null
  ip: string | null
  created_at: string
  old_values: string | null
  new_values: string | null
}
