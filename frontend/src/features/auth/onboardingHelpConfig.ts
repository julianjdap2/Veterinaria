/** Tras "Ir al consultorio": el dashboard abre el modal de ayuda una vez. */
export const ONBOARDING_PENDING_HELP_KEY = 'vet_pending_onboarding_help_v1'

export type OnboardingVideoItem = { title: string; videoId: string }

/** Lista desde `VITE_ONBOARDING_VIDEOS`: `Título|videoId,Título2|id2` */
export function parseOnboardingVideos(): OnboardingVideoItem[] {
  const raw = import.meta.env.VITE_ONBOARDING_VIDEOS?.trim()
  if (!raw) {
    return [
      {
        title: 'Primeros pasos — Registrar propietarios y mascotas',
        videoId: 'VIDEO_ID_1',
      },
      {
        title: 'Primeros pasos — Registrar información',
        videoId: 'VIDEO_ID_2',
      },
    ]
  }
  return raw.split(',').map((part: string, i: number) => {
    const [title, id] = part.split('|').map((s: string) => s.trim())
    return { title: title || `Video ${i + 1}`, videoId: id || part.trim() }
  })
}

/** ID de vídeo válido para embed (evita placeholders). */
export function isEmbeddableYoutubeId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(id)
}
