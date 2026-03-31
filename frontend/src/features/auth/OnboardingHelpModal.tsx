import { useMemo, useState } from 'react'
import { Button } from '../../shared/ui/Button'
import { isEmbeddableYoutubeId, parseOnboardingVideos } from './onboardingHelpConfig'

type Props = {
  open: boolean
  onClose: () => void
}

/**
 * Modal de bienvenida con tutoriales YouTube (16:9, encima del panel principal).
 */
export function OnboardingHelpModal({ open, onClose }: Props) {
  const videos = useMemo(() => parseOnboardingVideos(), [])
  const [expanded, setExpanded] = useState(0)

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/55 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-help-title"
    >
      <div className="flex max-h-[min(92vh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200/80">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
          <h3 id="onboarding-help-title" className="text-base font-semibold text-slate-900 sm:text-lg">
            ¿Necesitas ayuda?
          </h3>
          <button
            type="button"
            className="rounded-lg p-1.5 text-2xl leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <p className="text-sm font-semibold text-sky-600">Cómo empezar</p>
          <ul className="mt-3 space-y-2 sm:mt-4 sm:space-y-3">
            {videos.map((v, i) => {
              const isOpen = expanded === i
              const canEmbed = isEmbeddableYoutubeId(v.videoId)
              return (
                <li key={`${v.videoId}-${i}`} className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/50">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm font-medium text-sky-800 hover:bg-white sm:px-4"
                    onClick={() => setExpanded(isOpen ? -1 : i)}
                  >
                    <span className="min-w-0 flex-1">{v.title}</span>
                    <span className="shrink-0 text-slate-500" aria-hidden>
                      {isOpen ? '▼' : '▶'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-100 bg-white px-2 pb-3 pt-1 sm:px-3 sm:pb-4">
                      {!canEmbed ? (
                        <p className="p-3 text-sm text-slate-600 sm:p-4">
                          Configura{' '}
                          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">VITE_ONBOARDING_VIDEOS</code> en
                          el frontend con IDs de YouTube (11 caracteres), por ejemplo:{' '}
                          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                            Primeros pasos|dQw4w9WgXcQ
                          </code>
                          .
                        </p>
                      ) : (
                        <div className="mx-auto w-full max-w-3xl">
                          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-inner ring-1 ring-slate-200/80">
                            <iframe
                              title={v.title}
                              className="absolute inset-0 h-full w-full"
                              src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.videoId)}?rel=0&modestbranding=1`}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              allowFullScreen
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

        <div className="shrink-0 border-t border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
          <Button
            type="button"
            className="w-full rounded-xl bg-sky-600 text-white hover:bg-sky-700"
            onClick={onClose}
          >
            Entendido, ir al panel
          </Button>
        </div>
      </div>
    </div>
  )
}
