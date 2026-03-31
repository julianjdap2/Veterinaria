/** Datos solo en el navegador hasta persistir en API (foto, hábitos, notas). */

export type MascotaExtrasFlags = {
  animalServicio?: boolean
  apoyoEmocional?: boolean
  fallecido?: boolean
}

export type MascotaDatosGenerales = {
  alimento?: string
  cantidadAlimento?: string
  undAlimento?: string
  frecuenciaAlimento?: string
  vivienda?: string
  frecuenciaBano?: string
  productosBano?: string
  otrasMascotas?: string
  ultimoCalor?: string
}

export type MascotaExtrasV1 = {
  fotoDataUrl?: string | null
  flags?: MascotaExtrasFlags
  datosGenerales?: MascotaDatosGenerales
  notasImportantes?: string
}

const PREFIX = 'vet-mascota-extras-v1:'

function key(id: number): string {
  return `${PREFIX}${id}`
}

export function loadMascotaExtras(mascotaId: number): MascotaExtrasV1 {
  try {
    const raw = localStorage.getItem(key(mascotaId))
    if (!raw) return {}
    const p = JSON.parse(raw) as MascotaExtrasV1
    return p && typeof p === 'object' ? p : {}
  } catch {
    return {}
  }
}

export function saveMascotaExtras(mascotaId: number, extras: MascotaExtrasV1): void {
  try {
    localStorage.setItem(key(mascotaId), JSON.stringify(extras))
  } catch {
    /* quota */
  }
}

export function mergeMascotaExtras(mascotaId: number, partial: Partial<MascotaExtrasV1>): MascotaExtrasV1 {
  const prev = loadMascotaExtras(mascotaId)
  const next = { ...prev, ...partial }
  saveMascotaExtras(mascotaId, next)
  return next
}
