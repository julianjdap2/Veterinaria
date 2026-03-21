/**
 * Tamaños de página y constantes de listados para evitar números mágicos
 * y cargas innecesarias (p. ej. 500 registros en un solo request).
 */

/** Tablas paginadas estándar (listados principales). */
export const PAGE_SIZE_TABLE = 20

/** Selectores con búsqueda (cliente, mascota, etc.): resultados por página. */
export const PAGE_SIZE_SELECT = 50

/** Debounce típico para disparar API de búsqueda. */
export const SEARCH_DEBOUNCE_MS = 300

/** Vista calendario día: máximo de citas a pedir para un solo día (carga completa del día). */
export const AGENDA_CITA_DIA_PAGE_SIZE = 500

/** Modal de dashboard (drill-down): límite razonable antes de exportar/paginar. */
export const DASHBOARD_MODAL_PAGE_SIZE = 200

/** Mínimo de caracteres para búsqueda en selectores (reduce ruido en API). */
export const SEARCH_MIN_CHARS = 2
