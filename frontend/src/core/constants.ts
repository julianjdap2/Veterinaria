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
