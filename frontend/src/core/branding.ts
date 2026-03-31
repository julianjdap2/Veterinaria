/**
 * Marca pública del producto. Definir nombre definitivo en .env (VITE_APP_NAME).
 */
export const APP_NAME = import.meta.env.VITE_APP_NAME?.trim() || 'Vet System'

/** Subtítulo corto bajo el logo en el panel (opcional vía env). */
export const APP_PANEL_SUBTITLE =
  import.meta.env.VITE_APP_PANEL_SUBTITLE?.trim() || 'Consultorio'
