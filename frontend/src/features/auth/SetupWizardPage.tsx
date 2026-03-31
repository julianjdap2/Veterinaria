import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../core/auth-store'
import { fetchSessionMe } from './api'
import { APP_NAME } from '../../core/branding'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { SelectField } from '../../shared/ui/SelectField'
import { CityAutocomplete } from './CityAutocomplete'
import { ONBOARDING_PENDING_HELP_KEY } from './onboardingHelpConfig'
import { SetupWizardMap } from './SetupWizardMap'

const STORAGE_KEY = 'vet_setup_completed_v1'

const STEPS = [
  { id: 'welcome', title: 'Bienvenida', subtitle: 'Instructivo' },
  { id: 'location', title: 'Ubicación', subtitle: 'Dirección o área de cobertura' },
  { id: 'regional', title: 'Regional', subtitle: 'Idioma, moneda y zona horaria' },
  { id: 'schedule', title: 'Horario y servicios', subtitle: 'Disponibilidad al público' },
  { id: 'billing', title: 'Facturación', subtitle: 'Datos para facturación' },
] as const

const TIMEZONES = [
  { value: 'America/Bogota', label: 'America/Bogota' },
  { value: 'America/Mexico_City', label: 'America/Mexico_City' },
  { value: 'America/Lima', label: 'America/Lima' },
  { value: 'America/Santiago', label: 'America/Santiago' },
  { value: 'Europe/Madrid', label: 'Europe/Madrid' },
]

const CURRENCIES = [
  { value: 'COP', label: 'COP - Peso colombiano' },
  { value: 'USD', label: 'USD - Dólar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'MXN', label: 'MXN - Peso mexicano' },
]

const LOCALE_OPTIONS = [
  { value: 'es-419', label: 'Español (Latinoamérica)' },
  { value: 'es-ES', label: 'Español (España)' },
]

const SERVICIOS = [
  'Consulta',
  'Consulta a domicilio',
  'Consulta virtual',
  'Desparasitación',
  'Medicina interna',
  'Medicina preventiva',
  'Vacunación',
  'Estética (Peluquería, Spa)',
  'Farmacia',
  'Urgencias',
]

const ESPECIES = [
  'Canino',
  'Felino',
  'Equino',
  'Bovino',
  'Roedor',
  'Reptil',
  'Ave',
  'Ovino',
  'Caprino',
  'Pez',
]

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

/** Separa primer nombre / resto en apellidos (p. ej. "David Pérez García"). */
function splitNombreUsuario(full: string): { nombre: string; apellidos: string } {
  const t = full.trim()
  if (!t) return { nombre: '', apellidos: '' }
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return { nombre: parts[0], apellidos: '' }
  return { nombre: parts[0], apellidos: parts.slice(1).join(' ') }
}

export function SetupWizardPage() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const emailUser = user?.email ?? ''

  const [mounted, setMounted] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsCheck, setTermsCheck] = useState(false)
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [sinDireccion, setSinDireccion] = useState(false)
  const [direccion, setDireccion] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [departamento, setDepartamento] = useState('')
  const [pais, setPais] = useState('')
  const [mapPos, setMapPos] = useState<[number, number]>([6.2442, -75.5812])
  /** Radio de cobertura mostrado en el mapa y usado para sesgo de búsqueda de ciudad (Google). */
  const [radioKm, setRadioKm] = useState(5)

  const [timezone, setTimezone] = useState('America/Bogota')
  const [currency, setCurrency] = useState('COP')
  const [locale, setLocale] = useState('es-419')
  const [regionalOk, setRegionalOk] = useState(false)

  const [servicio24h, setServicio24h] = useState(false)
  const [diasSeleccion, setDiasSeleccion] = useState<string[]>(['Lun', 'Mar', 'Mié', 'Jue', 'Vie'])
  const [apertura, setApertura] = useState('09:00')
  const [cierre, setCierre] = useState('18:00')
  const [serviciosSel, setServiciosSel] = useState<string[]>([])
  const [especiesSel, setEspeciesSel] = useState<string[]>([])
  const [tipoPersona, setTipoPersona] = useState<'natural' | 'empresa'>('empresa')
  const [docId, setDocId] = useState('')
  const [razonNombre, setRazonNombre] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [emailFactura, setEmailFactura] = useState('')
  const [dirFactura, setDirFactura] = useState('')

  const [successOpen, setSuccessOpen] = useState(false)

  const onCiudadChange = useCallback((v: string) => setCiudad(v), [])
  const onPaisChange = useCallback((v: string) => setPais(v), [])
  const onDepartamentoChange = useCallback((v: string) => setDepartamento(v), [])

  const [setupDone, setSetupDone] = useState(false)

  const { data: sessionMe } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchSessionMe,
    enabled: Boolean(token),
    staleTime: 60_000,
  })

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1') {
      setSetupDone(true)
    }
  }, [])

  /**
   * Facturación: Natural = nombre/apellidos desde el usuario de sesión + correo/dirección del flujo.
   * Empresa = razón social desde la veterinaria + mismo correo y dirección de referencia (editables).
   */
  const billingSyncRef = useRef<{
    step: number
    tipo: 'natural' | 'empresa'
    dir: string
    email: string
    smKey: string
  }>({ step: -1, tipo: 'empresa', dir: '', email: '', smKey: '' })

  useEffect(() => {
    if (step !== 4) {
      billingSyncRef.current = {
        step,
        tipo: tipoPersona,
        dir: direccion,
        email: emailUser,
        smKey: `${sessionMe?.usuario_nombre ?? ''}|${sessionMe?.empresa_nombre ?? ''}|${sessionMe?.email ?? ''}`,
      }
      return
    }
    const smKey = `${sessionMe?.usuario_nombre ?? ''}|${sessionMe?.empresa_nombre ?? ''}|${sessionMe?.email ?? ''}`
    const p = billingSyncRef.current
    const needSync =
      p.step !== 4 ||
      p.tipo !== tipoPersona ||
      p.dir !== direccion ||
      p.email !== emailUser ||
      p.smKey !== smKey

    billingSyncRef.current = {
      step,
      tipo: tipoPersona,
      dir: direccion,
      email: emailUser,
      smKey,
    }
    if (!needSync) return

    const email = (emailUser || sessionMe?.email || '').trim()
    const dir = direccion.trim()

    if (tipoPersona === 'natural') {
      setEmailFactura(email)
      setDirFactura(dir)
      if (sessionMe?.usuario_nombre) {
        const { nombre, apellidos: ap } = splitNombreUsuario(sessionMe.usuario_nombre)
        setRazonNombre(nombre)
        setApellidos(ap)
      } else {
        setRazonNombre('')
        setApellidos('')
      }
    } else {
      setEmailFactura(email)
      setDirFactura(dir)
      setRazonNombre((sessionMe?.empresa_nombre ?? '').trim())
      setApellidos('')
    }
  }, [step, tipoPersona, emailUser, direccion, sessionMe])

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      const res = await fetch(url, { headers: { 'Accept-Language': 'es' } })
      if (!res.ok) return
      const data = (await res.json()) as {
        address?: Record<string, string>
        display_name?: string
      }
      const a = data.address ?? {}
      const city = a.city || a.town || a.village || a.municipality || ''
      const state = a.state || a.region || ''
      const country = a.country || ''
      if (city) setCiudad(city)
      if (state) setDepartamento(state)
      if (country) setPais(country)
      const line = [a.road, a.house_number].filter(Boolean).join(' ')
      if (line) setDireccion((d) => d || line)
    } catch {
      /* ignore */
    }
  }, [])

  const handleMapMove = useCallback(
    (lat: number, lng: number) => {
      setMapPos([lat, lng])
      void reverseGeocode(lat, lng)
    },
    [reverseGeocode]
  )

  function validateStep(i: number): boolean {
    const e: Record<string, string> = {}
    if (i === 1) {
      if (!sinDireccion && direccion.trim().length < 3) {
        e.direccion = 'Indica la dirección o active la opción de solo servicio a domicilio / sin sede física.'
      }
      if (ciudad.trim().length < 2) e.ciudad = 'Indica ciudad o municipio de cobertura.'
      if (pais.trim().length < 2) e.pais = 'Indica el país.'
      if (!Number.isFinite(radioKm) || radioKm < 1 || radioKm > 200) {
        e.radio = 'Indique un radio de cobertura entre 1 y 200 km.'
      }
    }
    if (i === 2) {
      if (!regionalOk) e.regional = 'Confirma que la configuración regional es correcta.'
    }
    if (i === 3) {
      if (!servicio24h && diasSeleccion.length === 0) e.dias = 'Selecciona al menos un día o activa 24 h.'
      if (serviciosSel.length === 0) e.servicios = 'Selecciona al menos un servicio.'
      if (especiesSel.length === 0) e.especies = 'Selecciona al menos una especie.'
    }
    if (i === 4) {
      if (!docId.trim()) e.doc = 'Indica el documento fiscal.'
      if (!razonNombre.trim()) e.nombre = 'Indica nombre o razón social.'
      if (!emailFactura.trim()) e.emailF = 'Indica correo de facturación.'
      if (!dirFactura.trim()) e.dirF = 'Indica dirección de facturación.'
      if (tipoPersona === 'natural' && !apellidos.trim()) e.apellidos = 'Indica apellidos.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleNext() {
    setErrors({})
    if (!validateStep(step)) return
    if (step < STEPS.length - 1) setStep(step + 1)
    else setSuccessOpen(true)
  }

  function handleBack() {
    setErrors({})
    if (step > 0) setStep(step - 1)
  }

  function finishWizard() {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, '1')
    setSuccessOpen(false)
    navigate('/dashboard', { replace: true })
  }

  /** Marca setup completado, pide al dashboard mostrar ayuda con vídeos y navega al panel. */
  function goToDashboardWithHelp() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, '1')
      localStorage.setItem(ONBOARDING_PENDING_HELP_KEY, '1')
    }
    setSuccessOpen(false)
    navigate('/dashboard', { replace: true })
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (setupDone) {
    return <Navigate to="/dashboard" replace />
  }

  const termsUrl = import.meta.env.VITE_TERMS_URL?.trim()

  if (!termsAccepted) {
    return (
      <div className="register-pattern-bg flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-8 shadow-xl">
          <h1 className="text-center text-xl font-bold text-stone-900">{APP_NAME}</h1>
          <p className="mt-2 text-center text-sm text-stone-600">Configuración inicial</p>
          <h2 className="mt-6 text-center text-base font-semibold text-stone-800">
            Hemos actualizado nuestras políticas de uso
          </h2>
          {sessionMe?.empresa_nombre ? (
            <p className="mt-4 text-center text-lg font-semibold text-stone-900">{sessionMe.empresa_nombre}</p>
          ) : null}
          {sessionMe?.usuario_nombre ? (
            <p className="mt-1 text-center text-base text-stone-800">{sessionMe.usuario_nombre}</p>
          ) : null}
          <p className="mt-4 text-sm leading-relaxed text-stone-600">
            Para continuar usando {APP_NAME} es necesario aceptar nuestras nuevas políticas.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-stone-600">
            Trabajamos para ofrecer un servicio más seguro y confiable. Al aceptar, reconoces el uso de la plataforma
            conforme a las condiciones vigentes.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-stone-600">
            Si tienes dudas, revisa el documento completo o contacta a soporte antes de continuar.
          </p>
          {termsUrl ? (
            <p className="mt-3 text-center">
              <a
                href={termsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-emerald-700 hover:underline"
              >
                → Leer política de uso aceptable
              </a>
            </p>
          ) : null}
          <label className="mt-8 flex cursor-pointer items-start gap-3 text-sm text-stone-700">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
              checked={termsCheck}
              onChange={(ev) => setTermsCheck(ev.target.checked)}
            />
            <span>
              He leído y acepto los términos, condiciones y política de uso aceptable.
            </span>
          </label>
          {errors.terms && <p className="mt-2 text-sm text-red-600">{errors.terms}</p>}
          <Button
            type="button"
            className="mt-8 w-full rounded-xl border-0 bg-emerald-700 px-6 py-2.5 text-white hover:bg-emerald-800"
            onClick={() => {
              if (!termsCheck) {
                setErrors({ terms: 'Debes aceptar para continuar.' })
                return
              }
              setErrors({})
              setTermsAccepted(true)
            }}
          >
            Continuar
          </Button>
        </div>
      </div>
    )
  }

  const previewMoney = new Intl.NumberFormat(locale, { style: 'currency', currency }).format(12345.67)
  const previewDate = new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeStyle: 'medium',
    timeZone: timezone,
  }).format(new Date())

  return (
    <div className="register-pattern-bg min-h-screen">
      <header className="flex items-center justify-between border-b border-stone-200 bg-white/90 px-4 py-3">
        <span className="font-semibold text-stone-900">{APP_NAME}</span>
        <div className="flex items-center gap-3 text-sm text-stone-600">
          <span>Hola {emailUser.split('@')[0]}</span>
          <Link to="/dashboard" className="font-medium text-emerald-700 hover:underline">
            Ir al sistema
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 lg:flex-row">
        <nav className="hidden w-64 shrink-0 lg:block">
          <ul className="space-y-1 rounded-2xl border border-stone-200 bg-white p-2 shadow-sm">
            {STEPS.map((s, i) => {
              const active = i === step
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (i <= step) setStep(i)
                    }}
                    className={`flex w-full flex-col rounded-xl px-3 py-2.5 text-left text-sm transition ${
                      active ? 'bg-sky-50 text-sky-900' : 'text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <span className="font-semibold">{s.title}</span>
                    <span className="text-xs text-stone-500">{s.subtitle}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <main className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-stone-900">Bienvenidos a {APP_NAME}</h2>
              <p className="text-sm leading-relaxed text-stone-600">
                En los siguientes pasos se establecerá la configuración indispensable para empezar a usar el sistema:
              </p>
              <ul className="list-inside list-disc space-y-2 text-sm text-stone-700">
                <li>Ubicación de la veterinaria o área de cobertura</li>
                <li>Configuración regional, hora y moneda</li>
                <li>Horario de atención y servicios al público</li>
                <li>Datos de facturación</li>
              </ul>
              <p className="text-sm text-stone-600">
                Lee con atención y responde las preguntas; cuando esté listo presione «Siguiente».
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <h2 className="text-lg font-semibold text-stone-900">¿Dónde está ubicada tu veterinaria?</h2>
                {import.meta.env.VITE_SUPPORT_EMAIL?.trim() ? (
                  <a
                    href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL.trim()}?subject=Ayuda%20ubicación%20${APP_NAME}`}
                    className="shrink-0 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-800 hover:bg-sky-100"
                  >
                    Ayuda
                  </a>
                ) : null}
              </div>

              <label className="flex cursor-pointer items-start gap-3 text-sm text-stone-700">
                <span className="relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center">
                  <input
                    type="checkbox"
                    role="switch"
                    aria-checked={sinDireccion}
                    className="peer sr-only"
                    checked={sinDireccion}
                    onChange={(e) => setSinDireccion(e.target.checked)}
                  />
                  <span className="absolute inset-0 rounded-full bg-stone-300 transition peer-checked:bg-sky-500" />
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
                      sinDireccion ? 'left-[1.375rem]' : 'left-0.5'
                    }`}
                  />
                </span>
                <span>
                  Marca esta opción si la veterinaria no tiene una dirección física o solo ofrece sus servicios a
                  domicilio.
                </span>
              </label>

              {mounted && (
                <>
                  <SetupWizardMap
                    position={mapPos}
                    onPositionChange={handleMapMove}
                    disabled={false}
                    radiusKm={radioKm}
                  />
                  <p className="text-xs text-stone-500">
                    {sinDireccion
                      ? 'El círculo muestra el área aproximada de cobertura. Mueva el mapa o el marcador para centrar la zona.'
                      : 'Desplace el mapa, haga clic o arrastre el marcador. La dirección puede completarla abajo.'}
                  </p>
                </>
              )}

              {!sinDireccion && (
                <>
                  <Input
                    label="Dirección"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Calle, número, barrio…"
                    error={errors.direccion}
                  />
                  <span className="text-xs text-stone-500">Ubicación física de la veterinaria.</span>
                </>
              )}

              <CityAutocomplete
                fieldKey="setup-loc"
                ciudad={ciudad}
                pais={pais}
                onCiudadChange={onCiudadChange}
                onPaisChange={onPaisChange}
                onDepartamentoChange={onDepartamentoChange}
                ciudadError={errors.ciudad}
                paisError={errors.pais}
                ciudadHint="Donde se tiene cobertura para la prestación de servicios."
                locationBias={{
                  lat: mapPos[0],
                  lng: mapPos[1],
                  radiusM: Math.max(radioKm, 1) * 1000,
                }}
              />
              <div className="max-w-xs">
                <label className="mb-1.5 block text-sm font-medium text-stone-800" htmlFor="setup-radio-km">
                  Distancia de cobertura
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="setup-radio-km"
                    type="number"
                    min={1}
                    max={200}
                    step={1}
                    value={radioKm}
                    onChange={(e) => {
                      const n = Number(e.target.value)
                      setRadioKm(Number.isFinite(n) ? n : radioKm)
                    }}
                    className="w-full min-w-0 rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50"
                  />
                  <span className="shrink-0 text-sm font-medium text-stone-600">Km</span>
                </div>
                <p className="mt-1 text-xs text-stone-500">Radio</p>
                {errors.radio && (
                  <p className="mt-1.5 text-sm text-red-600" role="alert">
                    {errors.radio}
                  </p>
                )}
              </div>
              <p className="text-xs text-stone-500">
                Ciudad / departamento / país: correspondiente al área de servicio.
                {departamento ? ` Departamento: ${departamento}.` : ''}
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-stone-900">Verifica región y zona horaria</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <SelectField
                  label="Regional e idioma"
                  value={locale}
                  onChange={setLocale}
                  options={LOCALE_OPTIONS}
                />
                <SelectField label="Zona horaria" value={timezone} onChange={setTimezone} options={TIMEZONES} />
                <SelectField label="Moneda" value={currency} onChange={setCurrency} options={CURRENCIES} />
              </div>
              <div className="rounded-xl border border-stone-100 bg-stone-50 p-4 text-sm">
                <p className="font-medium text-stone-800">Vista previa</p>
                <p className="mt-1 text-stone-600">
                  Formato de moneda: <span className="font-mono text-stone-900">{previewMoney}</span>
                </p>
                <p className="mt-1 text-stone-600">
                  Fecha y hora actual: <span className="text-stone-900">{previewDate}</span>
                </p>
              </div>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-stone-700">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-stone-300 text-emerald-600"
                  checked={regionalOk}
                  onChange={(e) => setRegionalOk(e.target.checked)}
                />
                Confirmo que el idioma, moneda y zona horaria son los correctos para la veterinaria.
              </label>
              {errors.regional && <p className="text-sm text-red-600">{errors.regional}</p>}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">¿Cuál es el horario de tu veterinaria?</h2>
                <p className="text-sm text-stone-600">Agrega filas según necesites (versión simplificada).</p>
                <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-stone-300 text-emerald-600"
                    checked={servicio24h}
                    onChange={(e) => setServicio24h(e.target.checked)}
                  />
                  Marca esta opción si la veterinaria ofrece servicio 24 horas
                </label>
                {!servicio24h && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {DIAS.map((d) => (
                      <label key={d} className="flex items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          className="rounded border-stone-300 text-emerald-600"
                          checked={diasSeleccion.includes(d)}
                          onChange={() =>
                            setDiasSeleccion((prev) =>
                              prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
                            )
                          }
                        />
                        {d}
                      </label>
                    ))}
                  </div>
                )}
                {!servicio24h && (
                  <div className="mt-4 grid max-w-md grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-stone-700">Apertura</label>
                      <input
                        type="time"
                        value={apertura}
                        onChange={(e) => setApertura(e.target.value)}
                        className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-stone-700">Cierre</label>
                      <input
                        type="time"
                        value={cierre}
                        onChange={(e) => setCierre(e.target.value)}
                        className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                )}
                {errors.dias && <p className="text-sm text-red-600">{errors.dias}</p>}
              </div>

              <div>
                <h3 className="font-semibold text-stone-900">Servicios y especies</h3>
                <p className="text-xs text-stone-500">
                  Útil para que te encuentren clientes. No condiciona el funcionamiento del sistema.
                </p>
                <p className="mt-3 text-sm font-medium text-stone-800">Servicios ofertados</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SERVICIOS.map((s) => (
                    <label key={s} className="flex items-center gap-2 rounded-lg border border-stone-200 px-2 py-1 text-sm">
                      <input
                        type="checkbox"
                        className="rounded border-stone-300 text-emerald-600"
                        checked={serviciosSel.includes(s)}
                        onChange={() =>
                          setServiciosSel((prev) =>
                            prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                          )
                        }
                      />
                      {s}
                    </label>
                  ))}
                </div>
                {errors.servicios && <p className="mt-1 text-sm text-red-600">{errors.servicios}</p>}

                <p className="mt-4 text-sm font-medium text-stone-800">Especies que atiende</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ESPECIES.map((s) => (
                    <label key={s} className="flex items-center gap-2 rounded-lg border border-stone-200 px-2 py-1 text-sm">
                      <input
                        type="checkbox"
                        className="rounded border-stone-300 text-emerald-600"
                        checked={especiesSel.includes(s)}
                        onChange={() =>
                          setEspeciesSel((prev) =>
                            prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                          )
                        }
                      />
                      {s}
                    </label>
                  ))}
                </div>
                {errors.especies && <p className="mt-1 text-sm text-red-600">{errors.especies}</p>}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-stone-900">Completa tus datos de facturación</h2>
              <SelectField
                label="Tipo persona"
                value={tipoPersona}
                onChange={(v) => setTipoPersona(v as 'natural' | 'empresa')}
                options={[
                  { value: 'natural', label: 'Natural' },
                  { value: 'empresa', label: 'Empresa' },
                ]}
                hint={
                  tipoPersona === 'natural'
                    ? 'Persona natural: se sugieren nombre y apellidos según su usuario; correo y dirección según su cuenta y el paso Ubicación.'
                    : 'Empresa: se sugiere la razón social de su veterinaria y el mismo correo y dirección de referencia (puede editarlos).'
                }
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Número de identificación tributaria o CC"
                  value={docId}
                  onChange={(e) => setDocId(e.target.value)}
                  placeholder="Sin dígito de verificación si aplica"
                  error={errors.doc}
                />
                <Input
                  label={tipoPersona === 'empresa' ? 'Nombre o Razón social' : 'Nombre'}
                  value={razonNombre}
                  onChange={(e) => setRazonNombre(e.target.value)}
                  error={errors.nombre}
                />
              </div>
              {tipoPersona === 'natural' && (
                <Input
                  label="Apellidos"
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  error={errors.apellidos}
                />
              )}
              <Input
                label="Correo facturación"
                type="email"
                value={emailFactura}
                onChange={(e) => setEmailFactura(e.target.value)}
                error={errors.emailF}
              />
              <Input
                label="Dirección facturación"
                value={dirFactura}
                onChange={(e) => setDirFactura(e.target.value)}
                error={errors.dirF}
              />
              <p className="text-xs text-stone-500">
                {tipoPersona === 'natural'
                  ? 'Correo y dirección se rellenan con los datos del flujo (cuenta y Ubicación); ajústelos si factura a otro domicilio.'
                  : 'Correo y dirección coinciden por defecto con su cuenta y la ubicación de la clínica; cámbielos si la facturación es distinta.'}
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-stone-100 pt-6 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              className="rounded-xl border border-stone-300 bg-white"
              onClick={handleBack}
              disabled={step === 0}
            >
              ← Atrás
            </Button>
            <Button
              type="button"
              className="rounded-xl border-0 bg-sky-600 px-6 text-white hover:bg-sky-700"
              onClick={handleNext}
            >
              {step === STEPS.length - 1 ? 'Finalizar' : 'Siguiente →'}
            </Button>
          </div>
        </main>
      </div>

      {successOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-md rounded-2xl bg-white p-8 shadow-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
              ✓
            </div>
            <h3 className="mt-4 text-center text-lg font-semibold text-stone-900">Configuración guardada</h3>
            <p className="mt-2 text-center text-sm text-stone-600">
              Listo, ya terminaste de configurar tu veterinaria. Ahora puedes ir al consultorio o ver tutoriales en
              vídeo.
            </p>
            <button
              type="button"
              className="mt-6 w-full rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white hover:bg-sky-700"
              onClick={goToDashboardWithHelp}
            >
              Ir al consultorio
            </button>
            <button
              type="button"
              className="mt-3 w-full text-sm text-stone-500 hover:text-stone-800"
              onClick={finishWizard}
            >
              Omitir ayuda
            </button>
          </div>
        </div>
      )}

      <p className="pb-8 text-center text-xs text-stone-500">
        ¿Necesitas ayuda?{' '}
        {import.meta.env.VITE_SUPPORT_EMAIL?.trim() ? (
          <a href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL.trim()}`} className="text-emerald-600 hover:underline">
            Contacta a soporte
          </a>
        ) : (
          <span>Contacta a soporte</span>
        )}
      </p>
    </div>
  )
}
