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
  tipo_documento?: string | null
  telefono: string | null
  celular?: string | null
  telefono_fijo?: string | null
  contacto?: string | null
  tipo_contacto?: string | null
  direccion: string | null
  email: string | null
  empresa_id: number
  activo: boolean
  created_at?: string | null
  updated_at?: string | null
  mascotas_count?: number | null
  autorizacion_at?: string | null
}

export interface ClienteCreate {
  nombre: string
  telefono?: string | null
  tipo_documento?: string | null
  celular?: string | null
  telefono_fijo?: string | null
  contacto?: string | null
  tipo_contacto?: string | null
  email?: string | null
  direccion?: string | null
  documento?: string | null
}

export interface ClienteUpdate {
  nombre?: string
  telefono?: string | null
  tipo_documento?: string | null
  celular?: string | null
  telefono_fijo?: string | null
  contacto?: string | null
  tipo_contacto?: string | null
  email?: string | null
  direccion?: string | null
  documento?: string | null
}

/** Búsqueda global por documento + estado de vínculo con la clínica actual */
export interface ClienteIdentidadMascotaItem {
  id: number
  nombre: string
  sexo: string | null
  especie_id: number | null
}

export interface ClienteIdentidadBusqueda {
  encontrado: boolean
  cliente_id: number | null
  estado_vinculo: 'ninguno' | 'parcial' | 'completo'
  puede_vincular: boolean
  nombre: string | null
  documento: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  mascotas: ClienteIdentidadMascotaItem[]
}

export interface VinculacionResponse {
  ok: boolean
  access_level: string
  mensaje: string
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

/** PATCH parcial en `/mascotas/:id` */
export interface MascotaUpdate {
  nombre?: string
  especie_id?: number | null
  raza_id?: number | null
  sexo?: string | null
  fecha_nacimiento?: string | null
  color?: string | null
  peso?: number | null
  alergias?: string | null
  activo?: boolean
}

export interface Cita {
  id: number
  mascota_id: number | null
  mascota_nombre?: string | null
  /** Propietario (enriquecido en listados de agenda). */
  cliente_nombre?: string | null
  veterinario_id: number | null
  veterinario_nombre?: string | null
  fecha: string | null
  fecha_fin?: string | null
  motivo: string | null
  notas: string | null
  urgente: boolean
  sin_hora_definida?: boolean
  en_sala_espera: boolean
  estado: string | null
  encargados_ids?: number[]
  extras_clinicos?: CitaExtrasClinicos | null
}

export interface CitaExtrasClinicos {
  vacuna_id?: string | null
  hospitalizacion_id?: string | null
  procedimiento_id?: string | null
}

export interface CitaCreate {
  mascota_id?: number | null
  fecha?: string | null
  fecha_fin?: string | null
  motivo?: string | null
  notas?: string | null
  estado?: string | null
  veterinario_id?: number | null
  urgente?: boolean
  sin_hora_definida?: boolean
  en_sala_espera?: boolean
  solo_reservar_espacio?: boolean
  encargados_ids?: number[]
  extras_clinicos?: CitaExtrasClinicos | null
}

export interface CitasDisponibilidad {
  fecha: string // 'YYYY-MM-DD'
  veterinario_id: number
  disponible: string[] // ['08:00', '08:30', ...]
  reservado: string[]
}

export interface CitaUpdate {
  fecha?: string | null
  fecha_fin?: string | null
  motivo?: string | null
  notas?: string | null
  estado?: string | null
  veterinario_id?: number | null
  urgente?: boolean | null
  sin_hora_definida?: boolean | null
  en_sala_espera?: boolean | null
  encargados_ids?: number[] | null
  extras_clinicos?: CitaExtrasClinicos | null
}

export interface CitaLlegadaCreate {
  mascota_id: number
  motivo?: string | null
  notas?: string | null
  urgente?: boolean
  encargados_ids?: number[]
  veterinario_preferido_id?: number | null
  fecha_llegada?: string | null
  extras_clinicos?: CitaExtrasClinicos | null
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
  top_vacunas_consulta: DashboardTopTexto[]
  top_pruebas_laboratorio_consulta: DashboardTopTexto[]
  top_hospitalizacion_consulta: DashboardTopTexto[]
  top_procedimientos_cita: DashboardTopTexto[]
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
  extras_clinicos?: ConsultaExtrasClinicos | null
}

export interface ConsultaExtrasClinicos {
  hospitalizacion_id?: string | null
  vacuna_ids: string[]
  pruebas_lab_ids: string[]
  formato_documento_id?: string | null
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
  extras_clinicos?: ConsultaExtrasClinicos | null
}

export interface ConsultaCreateConFormula extends ConsultaCreate {
  formula_items: FormulaItemCreate[]
}

/** PATCH parcial `/consultas/:id` (diagnóstico, observaciones, fecha) */
export interface ConsultaUpdate {
  diagnostico?: string | null
  observaciones?: string | null
  fecha_consulta?: string | null
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
  extras_clinicos_texto: string
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

/** Catálogos de variables clínicas (Administración). */
export interface ItemVariableSimple {
  id: string
  nombre: string
  categoria?: string | null
  sistema: boolean
}

export interface FormatoDocumentoItem {
  id: string
  nombre: string
  contenido_html: string
  sistema: boolean
}

export interface VariablesClinicas {
  vacunas: ItemVariableSimple[]
  hospitalizacion: ItemVariableSimple[]
  procedimientos: ItemVariableSimple[]
  pruebas_laboratorio: ItemVariableSimple[]
  formatos_documento: FormatoDocumentoItem[]
}

export type VariablesClinicasPatch = Partial<VariablesClinicas>

export interface TopVariableUsoItem {
  id: string
  nombre: string
  cantidad: number
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

export interface UsuarioPreferencias {
  notif_email_cuenta: boolean
  agenda_color_evento: string | null
}

export interface UsuarioOperativo {
  acceso_consultorio: boolean
  hospitalizacion_ambulatorio: boolean
  info_tutores_completa: boolean
  admin_agenda: boolean
  admin_disponibilidad: boolean
  agenda_personal: boolean
  /** Vacío = sin restricción (todos los servicios). */
  servicios_relacionados: string[]
}

export interface UsuarioProfesional {
  especialidades: string[]
  tarjeta_numero: string
  tarjeta_adjunto_url: string | null
  firma_url: string | null
}

export interface UsuarioExtendido {
  preferencias: UsuarioPreferencias
  operativo: UsuarioOperativo
  profesional: UsuarioProfesional
}

export interface UsuarioDetalle extends Usuario {
  documento: string | null
  telefono: string | null
  extendido: UsuarioExtendido
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

/** Plan de salud / paquete de servicios (por clínica) */
export interface PlanSaludCobertura {
  id: number
  categoria_codigo: string
  nombre_servicio: string
  cantidad: number
  cobertura_maxima: string | number | null
}

export interface PlanSalud {
  id: number
  empresa_id: number
  nombre: string
  precio: string | number
  periodicidad_meses: number
  especies_ids: number[]
  activo: boolean
  coberturas: PlanSaludCobertura[]
  afiliaciones_activas: number
  updated_at?: string | null
}

export interface PlanSaludMeta {
  modulo_habilitado: boolean
  categorias: { codigo: string; label: string }[]
  periodicidades_meses: number[]
}

/** Respuesta de GET /planes-salud/mascota/:id/afiliacion-activa */
export interface AfiliacionMascotaActiva {
  tiene_afiliacion: boolean
  afiliacion_id?: number | null
  plan_salud_id?: number | null
  plan_nombre?: string | null
  fecha_fin?: string | null
}

export interface PlanAfiliacion {
  id: number
  plan_salud_id: number
  cliente_id: number
  cliente_nombre?: string | null
  cliente_documento?: string | null
  mascota_id?: number | null
  mascota_nombre?: string | null
  fecha_inicio: string
  fecha_fin: string
  valor_pagado: string | number
  observaciones?: string | null
  activo: boolean
  resumen_usos: string
  created_at?: string | null
}

export interface EstadoCuentaPlan {
  clinica_nombre: string
  clinica_direccion?: string | null
  clinica_telefono?: string | null
  clinica_email?: string | null
  plan_numero: string
  titular_documento?: string | null
  titular_nombre?: string | null
  mascota_nombre?: string | null
  plan_nombre: string
  vigencia_desde: string
  vigencia_hasta: string
  lineas: {
    nombre_servicio: string
    categoria_codigo: string
    consumidos: number
    limite: number
    cobertura_maxima?: string | number | null
  }[]
}

/** Catálogo de plan SaaS (software) — superadmin / empresa */
export interface PlanCatalogoItem {
  id: number
  nombre: string
  codigo: string
  precio: number
  max_usuarios: number | null
  max_mascotas: number | null
  max_citas_mes: number | null
  modulo_agenda: boolean
  modulo_marketing: boolean
  modulo_whatsapp: boolean
  modulo_inventario: boolean
  modulo_ventas: boolean
  modulo_reportes: boolean
  modulo_facturacion_electronica: boolean
  feature_recordatorios_automaticos: boolean
  feature_dashboard_avanzado: boolean
  feature_exportaciones: boolean
  feature_ia_consultorio: boolean
  soporte_nivel: string
}

export interface SuscripcionTenantResponse {
  empresa_nombre: string
  empresa_estado: string
  plan_actual_id: number | null
  plan_actual: PlanCatalogoItem | null
  planes_catalogo: PlanCatalogoItem[]
}

/** Asistente en consultorio (reglas locales) */
export interface AsistenteClinicoItem {
  categoria: string
  titulo: string
  detalle: string
  prioridad: string
}

export interface AsistenteClinicoResponse {
  mascota_nombre: string
  especie: string | null
  edad_meses: number | null
  edad_texto: string
  items: AsistenteClinicoItem[]
  basado_en: string
  modelo_llm?: string | null
  aviso_legal: string
}
