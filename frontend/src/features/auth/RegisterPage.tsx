import { useCallback, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import ReCAPTCHA from 'react-google-recaptcha'
import { useAuthStore } from '../../core/auth-store'
import { APP_NAME } from '../../core/branding'
import { toast } from '../../core/toast-store'
import { ApiError } from '../../api/errors'
import { registroClinica } from './api'
import { CityAutocomplete } from './CityAutocomplete'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { SelectField } from '../../shared/ui/SelectField'
import { Alert } from '../../shared/ui/Alert'

const TIPOS = [
  { value: 'independiente' as const, label: 'Independiente' },
  { value: 'clinica' as const, label: 'Clínica veterinaria' },
  { value: 'guarderia' as const, label: 'Guardería' },
  { value: 'peluqueria' as const, label: 'Peluquería / Spa' },
]

const CANAL_OPTIONS = [
  { value: 'facebook_instagram', label: 'Facebook o Instagram' },
  { value: 'google', label: 'Google' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'Youtube' },
  { value: 'recomendacion', label: 'Recomendación (Veterinaria, Amigo, …)' },
  { value: 'ia', label: 'IA (Chat GPT, Gemini, Claude…)' },
  { value: 'otro', label: 'Otro' },
]

const DISTRIBUIDOR_OPTIONS = [
  { value: 'ninguno', label: 'Ninguno' },
  { value: 'san_lucas', label: 'Clínica veterinaria San Lucas' },
  { value: 'shoppets', label: 'SHOPPETS CORP SAS' },
]

const STEPS = ['Veterinaria', 'Usuario', 'Confirmación']

function labelFor(options: { value: string; label: string }[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value
}

export function RegisterPage() {
  const token = useAuthStore((s) => s.token)

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [empresaNombre, setEmpresaNombre] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [departamento, setDepartamento] = useState('')
  const [pais, setPais] = useState('')
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]['value'] | ''>('')

  const [usuarioNombre, setUsuarioNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')

  const [canal, setCanal] = useState('')
  const [distribuidor, setDistribuidor] = useState('ninguno')
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)

  const recaptchaRef = useRef<ReCAPTCHA | null>(null)
  const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim() ?? ''
  const termsUrl = import.meta.env.VITE_TERMS_URL?.trim()

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const onCiudadChange = useCallback((v: string) => setCiudad(v), [])
  const onPaisChange = useCallback((v: string) => setPais(v), [])
  const onDepartamentoChange = useCallback((v: string) => setDepartamento(v), [])

  if (token) {
    return <Navigate to="/dashboard" replace />
  }

  const step1ErrorKeys = ['empresa', 'ciudad', 'pais', 'tipo'] as const
  const step2ErrorKeys = ['usuarioNombre', 'email', 'telefono', 'password', 'password2'] as const
  const step3ErrorKeys = ['canal', 'distribuidor', 'terminos', 'recaptcha'] as const

  function validateStep1(): boolean {
    const e: Record<string, string> = {}
    if (empresaNombre.trim().length < 2) e.empresa = 'Indica el nombre de la clínica.'
    if (ciudad.trim().length < 2) e.ciudad = 'Indica la ciudad o elige una en la lista.'
    if (pais.trim().length < 2) e.pais = 'Indica el país.'
    if (!tipo) e.tipo = 'Selecciona un tipo.'
    setFieldErrors((prev) => {
      const next = { ...prev }
      for (const k of step1ErrorKeys) delete next[k]
      return { ...next, ...e }
    })
    return Object.keys(e).length === 0
  }

  function validateStep2(): boolean {
    const e: Record<string, string> = {}
    if (usuarioNombre.trim().length < 2) e.usuarioNombre = 'Indica nombres y apellidos.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Email no válido.'
    const tel = telefono.replace(/\s/g, '')
    if (tel.length < 8) e.telefono = 'Indica un celular o WhatsApp válido.'
    if (password.length < 8) e.password = 'Mínimo 8 caracteres.'
    if (password !== password2) e.password2 = 'Las contraseñas no coinciden.'
    setFieldErrors((prev) => {
      const next = { ...prev }
      for (const k of step2ErrorKeys) delete next[k]
      return { ...next, ...e }
    })
    return Object.keys(e).length === 0
  }

  function validateStep3(): boolean {
    const e: Record<string, string> = {}
    if (!canal) e.canal = 'Selecciona una opción.'
    if (!distribuidor) e.distribuidor = 'Selecciona una opción.'
    if (!aceptaTerminos) e.terminos = 'Debes aceptar los términos para enviar la solicitud.'
    if (recaptchaSiteKey && !recaptchaToken) e.recaptcha = 'Completa la verificación «No soy un robot».'
    setFieldErrors((prev) => {
      const next = { ...prev }
      for (const k of step3ErrorKeys) delete next[k]
      return { ...next, ...e }
    })
    return Object.keys(e).length === 0
  }

  function resetRecaptcha() {
    setRecaptchaToken(null)
    recaptchaRef.current?.reset()
  }

  async function handleSubmit() {
    if (!validateStep1()) {
      setStep(1)
      return
    }
    if (!validateStep2()) {
      setStep(2)
      return
    }
    if (!validateStep3()) {
      setStep(3)
      return
    }
    setError(null)
    setLoading(true)
    try {
      await registroClinica({
        empresa_nombre: empresaNombre.trim(),
        ciudad: ciudad.trim(),
        departamento: departamento.trim() || undefined,
        pais: pais.trim(),
        tipo_establecimiento: tipo as 'independiente' | 'clinica' | 'guarderia' | 'peluqueria',
        canal_origen: labelFor(CANAL_OPTIONS, canal),
        distribuidor: labelFor(DISTRIBUIDOR_OPTIONS, distribuidor),
        usuario_nombre: usuarioNombre.trim(),
        usuario_email: email.trim(),
        usuario_telefono: telefono.trim() || undefined,
        usuario_password: password,
        recaptcha_token: recaptchaSiteKey ? recaptchaToken ?? undefined : undefined,
      })
      toast.success(
        'Solicitud enviada. Se ha enviado al correo registrado un vínculo para continuar con el proceso.',
        { duration: 8000 },
      )
      setStep(4)
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'No se pudo completar el registro. Intenta de nuevo.'
      setError(msg)
      toast.error(msg)
      if (msg.toLowerCase().includes('captcha') || msg.toLowerCase().includes('verificación')) {
        resetRecaptcha()
        setStep(3)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src="/login/photo-2.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/85 via-stone-900/45 to-stone-900/20" />
        <div className="relative flex h-full min-h-[420px] flex-col justify-end p-10 text-white">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-200/90">Onboarding</p>
          <h2 className="mt-2 text-3xl font-bold leading-tight">
            El mejor software veterinario
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-stone-200">
            Empieza a gestionar tu veterinaria y organiza tu información para optimizar y automatizar los procesos.
          </p>
        </div>
      </div>

      <div className="register-pattern-bg flex flex-col justify-center px-4 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto w-full max-w-lg">
          <div className="mb-8 text-center">
            <div className="mb-3 flex justify-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 text-sm font-bold text-white shadow-md shadow-emerald-900/20 ring-1 ring-white/20">
                {APP_NAME.slice(0, 1).toUpperCase()}
              </span>
            </div>
            <h1 className="text-xl font-bold text-stone-900">{APP_NAME}</h1>
            <p className="mt-1 text-sm text-stone-600">Registrar mi veterinaria</p>
          </div>

          {step < 4 && (
            <div className="mb-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs font-medium sm:text-sm">
              {STEPS.map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  {i > 0 && <span className="text-emerald-400">›</span>}
                  <span
                    className={
                      step === i + 1
                        ? 'rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1 text-white shadow-sm'
                        : step > i + 1
                          ? 'text-emerald-700'
                          : 'text-stone-400'
                    }
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="overflow-hidden rounded-[1.5rem] border border-emerald-100/80 bg-white shadow-panel-lg ring-1 ring-emerald-100/40 sm:p-0">
            <div className="panel-accent-top rounded-none" aria-hidden />
            <div className="overflow-visible p-6 sm:p-8">
            {error && step < 4 && (
              <Alert variant="error" className="mb-4" onDismiss={() => setError(null)}>
                {error}
              </Alert>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <Input
                  label="Nombre de tu veterinaria o razón social"
                  value={empresaNombre}
                  onChange={(e) => setEmpresaNombre(e.target.value)}
                  placeholder="Ej. Centro Veterinario Norte"
                  error={fieldErrors.empresa}
                />
                <CityAutocomplete
                  fieldKey={`cf-${step}`}
                  ciudad={ciudad}
                  pais={pais}
                  onCiudadChange={onCiudadChange}
                  onPaisChange={onPaisChange}
                  onDepartamentoChange={onDepartamentoChange}
                  ciudadError={fieldErrors.ciudad}
                  paisError={fieldErrors.pais}
                />
                <SelectField
                  label="Tipo de establecimiento"
                  placeholder="Seleccione un tipo"
                  value={tipo}
                  onChange={(v) => setTipo(v === '' ? '' : (v as (typeof TIPOS)[number]['value']))}
                  options={TIPOS.map((t) => ({ value: t.value, label: t.label }))}
                  error={fieldErrors.tipo}
                />
                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    className="rounded-xl border-0 bg-gradient-to-r from-emerald-600 to-teal-600 px-6 text-white shadow-md shadow-emerald-700/15 hover:from-emerald-700 hover:to-teal-700"
                    onClick={() => {
                      setFieldErrors({})
                      if (validateStep1()) setStep(2)
                    }}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="border-b border-stone-100 pb-1 text-center">
                  <p className="text-sm font-semibold text-stone-800">Datos de acceso y contacto</p>
                </div>
                <Input
                  label="Nombres y apellidos"
                  value={usuarioNombre}
                  onChange={(e) => setUsuarioNombre(e.target.value)}
                  placeholder="Nombre completo del administrador"
                  error={fieldErrors.usuarioNombre}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    type="email"
                    label="Correo electrónico"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="correo@ejemplo.com"
                    error={fieldErrors.email}
                  />
                  <Input
                    label="Celular / WhatsApp"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+57 300 0000000"
                    autoComplete="tel"
                    error={fieldErrors.telefono}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    type="password"
                    label="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    error={fieldErrors.password}
                  />
                  <Input
                    type="password"
                    label="Confirme la contraseña"
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    autoComplete="new-password"
                    error={fieldErrors.password2}
                  />
                </div>
                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between sm:gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-xl border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                    onClick={() => setStep(1)}
                  >
                    Atrás
                  </Button>
                  <Button
                    type="button"
                    className="rounded-xl border-0 bg-gradient-to-r from-emerald-600 to-teal-600 px-6 text-white shadow-md shadow-emerald-700/15 hover:from-emerald-700 hover:to-teal-700"
                    onClick={() => {
                      setFieldErrors({})
                      if (validateStep2()) setStep(3)
                    }}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <SelectField
                  label="¿Cómo nos encontró?"
                  placeholder="Seleccione una opción"
                  value={canal}
                  onChange={setCanal}
                  options={CANAL_OPTIONS}
                  error={fieldErrors.canal}
                />
                <SelectField
                  label="Distribuidor"
                  value={distribuidor}
                  onChange={setDistribuidor}
                  options={DISTRIBUIDOR_OPTIONS}
                  error={fieldErrors.distribuidor}
                  hint="Diligencie este campo solo si uno de los distribuidores disponibles lo recomendó o lo asistió en el proceso."
                />
                <label className="flex cursor-pointer items-start gap-3 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                    checked={aceptaTerminos}
                    onChange={(e) => setAceptaTerminos(e.target.checked)}
                  />
                  <span>
                    He leído y acepto los términos, condiciones y política de uso aceptable.{' '}
                    {termsUrl ? (
                      <a
                        href={termsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-emerald-700 hover:underline"
                      >
                        Más información
                      </a>
                    ) : null}
                  </span>
                </label>
                {fieldErrors.terminos && (
                  <p className="text-sm text-red-600" role="alert">
                    {fieldErrors.terminos}
                  </p>
                )}

                {recaptchaSiteKey ? (
                  <div className="flex flex-col items-start gap-2">
                    <ReCAPTCHA
                      ref={recaptchaRef}
                      sitekey={recaptchaSiteKey}
                      onChange={(t) => setRecaptchaToken(t)}
                    />
                    {fieldErrors.recaptcha && (
                      <p className="text-sm text-red-600" role="alert">
                        {fieldErrors.recaptcha}
                      </p>
                    )}
                  </div>
                ) : import.meta.env.DEV ? (
                  <p className="text-xs text-stone-500">
                    Sin reCAPTCHA en cliente: el registro sigue permitido si el servidor no exige clave secreta.
                  </p>
                ) : null}

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between sm:gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-xl border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                    onClick={() => {
                      setStep(2)
                      resetRecaptcha()
                    }}
                  >
                    Atrás
                  </Button>
                  <Button
                    type="button"
                    className="rounded-xl border-0 bg-gradient-to-r from-emerald-600 to-teal-600 px-6 text-white shadow-md shadow-emerald-700/15 hover:from-emerald-700 hover:to-teal-700"
                    loading={loading}
                    onClick={() => void handleSubmit()}
                  >
                    Solicitar demo gratis
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5 text-center text-stone-700">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
                  ✓
                </div>
                <h2 className="text-xl font-bold text-emerald-800">¡Muchas gracias por registrarte!</h2>
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Verifica tu email</p>
                <p className="text-lg font-semibold text-stone-900">{email.trim().toLowerCase()}</p>
                <p className="text-sm leading-relaxed text-stone-600">
                  Hemos recibido su solicitud y le hemos enviado un correo para continuar con el inicio de sesión.
                </p>
                <p className="text-sm leading-relaxed text-stone-600">
                  Al continuar con la activación se creará una cuenta gratuita para su veterinaria, sujeta a validación.
                  Si no podemos validar la información, lo contactaremos.
                </p>
                <p className="rounded-lg bg-stone-50 px-3 py-2 text-xs leading-relaxed text-stone-600">
                  Use su cuenta con regularidad; {APP_NAME} es gratuito, pero evite más de 45 días de inactividad.
                  Contáctenos para reactivarla si se suspende. Horario de atención: 7:00 a 17:00 de lunes a viernes
                  (hora Colombia).
                </p>
                <p className="text-sm text-stone-600">
                  Cuando reciba el correo, abra el enlace del mensaje: se abrirá la configuración (términos y pasos
                  siguientes) sin volver a escribir correo ni contraseña.
                </p>
                <p className="text-xs text-stone-500">
                  ¿Necesitas ayuda?{' '}
                  {import.meta.env.VITE_SUPPORT_EMAIL?.trim() ? (
                    <a
                      href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL.trim()}`}
                      className="font-medium text-emerald-600 hover:underline"
                    >
                      Contacta a soporte
                    </a>
                  ) : (
                    <span>Contacta a soporte</span>
                  )}
                </p>
              </div>
            )}
            </div>
          </div>

          {step < 4 ? (
            <>
              <p className="mt-8 text-center text-sm text-stone-600">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="font-semibold text-emerald-700 hover:underline">
                  Iniciar sesión
                </Link>
              </p>
              {import.meta.env.VITE_SUPPORT_EMAIL?.trim() && (
                <p className="mt-3 text-center">
                  <a
                    href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL.trim()}`}
                    className="text-xs font-medium text-emerald-600 hover:underline"
                  >
                    ¿Necesitas ayuda?
                  </a>
                </p>
              )}
            </>
          ) : (
            <p className="mt-8 text-center text-sm text-stone-600">
              ¿Ya recibiste el correo?{' '}
              <Link to="/login" className="font-semibold text-emerald-700 hover:underline">
                Iniciar sesión
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
