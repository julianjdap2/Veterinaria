import { useRef } from 'react'
import { Camera, Cat, Dog, PawPrint } from 'lucide-react'

function speciesIcon(especieNombre: string | undefined) {
  if (!especieNombre) return 'paw' as const
  const s = especieNombre.toLowerCase()
  if (s.includes('gato') || s.includes('felino') || s.includes('felis')) return 'cat' as const
  if (s.includes('perro') || s.includes('canino') || s.includes('canis')) return 'dog' as const
  return 'paw' as const
}

type Props = {
  especieNombre?: string | null
  fotoDataUrl?: string | null
  onFotoChange: (dataUrl: string | null) => void
  sizeClassName?: string
}

export function MascotaAvatar({ especieNombre, fotoDataUrl, onFotoChange, sizeClassName = 'h-28 w-28' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const kind = speciesIcon(especieNombre ?? undefined)

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f || !f.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const r = reader.result
      if (typeof r === 'string') onFotoChange(r)
    }
    reader.readAsDataURL(f)
    e.target.value = ''
  }

  const Icon =
    kind === 'cat' ? Cat : kind === 'dog' ? Dog : PawPrint

  return (
    <div className="relative inline-flex">
      <div
        className={`relative flex ${sizeClassName} shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-slate-200 bg-gradient-to-br from-slate-100 to-slate-50 shadow-inner`}
      >
        {fotoDataUrl ? (
          <img src={fotoDataUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icon className="h-[45%] w-[45%] text-slate-400" strokeWidth={1.25} />
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="absolute -right-0.5 -top-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#26a69a] text-white shadow-md ring-2 ring-white transition hover:bg-[#20897f]"
        title="Cambiar imagen"
      >
        <Camera className="h-4 w-4" />
      </button>
    </div>
  )
}
