/**
 * Constantes globales: roles y configuración.
 */

export const ROLES = {
  ADMIN: 1,
  VETERINARIO: 2,
  RECEPCION: 3,
} as const

export type RolId = (typeof ROLES)[keyof typeof ROLES]

export const ROL_LABELS: Record<RolId, string> = {
  [ROLES.ADMIN]: 'Administrador',
  [ROLES.VETERINARIO]: 'Veterinario',
  [ROLES.RECEPCION]: 'Recepción',
}

export const DEFAULT_PAGE_SIZE = 20
