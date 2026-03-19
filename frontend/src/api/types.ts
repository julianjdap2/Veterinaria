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
  veterinario_id: number | null
  fecha: string | null
  motivo: string | null
  estado: string | null
}

export interface CitaCreate {
  mascota_id: number
  fecha?: string | null
  motivo?: string | null
  estado?: string | null
}

export interface CitaUpdate {
  fecha?: string | null
  motivo?: string | null
  estado?: string | null
  veterinario_id?: number | null
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
  total: string | number | null
  items: VentaItemResponse[]
}

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
}

export interface UsuarioCreate {
  nombre: string
  email: string
  rol_id: number
  password: string
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
