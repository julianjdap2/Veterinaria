/**
 * Constantes globales: roles y configuración.
 */

export const ROLES = {
  ADMIN: 1,
  VETERINARIO: 2,
  RECEPCION: 3,
  SUPERADMIN: 4,
} as const

export type RolId = (typeof ROLES)[keyof typeof ROLES]

export const ROL_LABELS: Record<RolId, string> = {
  [ROLES.ADMIN]: 'Administrador',
  [ROLES.VETERINARIO]: 'Veterinario',
  [ROLES.RECEPCION]: 'Recepción',
  [ROLES.SUPERADMIN]: 'Superadmin',
}

/** Textos orientativos para el selector de rol (referencia funcional tipo software de gestión clínica). */
export const ROL_DESCRIPTIONS: Partial<Record<RolId, string>> = {
  [ROLES.ADMIN]:
    'Acceso amplio a la empresa; puede gestionar usuarios y configuración según el perfil de administrador asignado.',
  [ROLES.VETERINARIO]:
    'Registro de consultas e historia clínica; puede asignarse como profesional en citas.',
  [ROLES.RECEPCION]:
    'Gestión de clientes, mascotas, citas y ventas según los módulos habituales de recepción.',
}

export const DEFAULT_PAGE_SIZE = 20

/** Listados y selectores: ver `listDefaults.ts` (tamaños unificados). */
export {
  PAGE_SIZE_SELECT,
  PAGE_SIZE_TABLE,
  AGENDA_CITA_DIA_PAGE_SIZE,
  DASHBOARD_MODAL_PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
  SEARCH_MIN_CHARS,
} from './listDefaults'
