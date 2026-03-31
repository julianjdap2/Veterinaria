import apiClient from '../../api/client'

export type PublicClinicaItem = {
  id: number
  nombre: string
  logo_url: string | null
}

export async function fetchPublicClinicas(): Promise<PublicClinicaItem[]> {
  const { data } = await apiClient.get<PublicClinicaItem[]>('/public/clinicas')
  return data
}

/** Resuelve URL de logo: absoluta o relativa al origen del API (ver `VITE_BACKEND_ORIGIN`). */
export function resolveClinicaLogoUrl(logoUrl: string | null | undefined): string | null {
  if (!logoUrl?.trim()) return null
  const u = logoUrl.trim()
  if (/^https?:\/\//i.test(u)) return u
  const origin = import.meta.env.VITE_BACKEND_ORIGIN?.trim()
  if (origin && u.startsWith('/')) {
    return `${origin.replace(/\/$/, '')}${u}`
  }
  return u
}
