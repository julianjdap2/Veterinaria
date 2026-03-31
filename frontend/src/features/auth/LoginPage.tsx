import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { APP_NAME } from '../../core/branding'
import { useAuthStore } from '../../core/auth-store'
import { login, userFromToken } from './api'
import { ApiError } from '../../api/errors'
import { toast } from '../../core/toast-store'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Alert } from '../../shared/ui/Alert'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const slides = ['/login/photo-1.jpg', '/login/photo-2.jpg', '/login/photo-3.jpg']
  const [currentSlide, setCurrentSlide] = useState(0)

  const nextParam = new URLSearchParams(location.search).get('next')
  const safeNext =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : null
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ??
    safeNext ??
    '/dashboard'

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [slides.length])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      const msg = 'Email y contraseña son obligatorios.'
      setError(msg)
      toast.warning(msg)
      return
    }
    setLoading(true)
    try {
      const { access_token } = await login(email.trim(), password)
      const user = userFromToken(access_token)
      setAuth(access_token, { ...user, email: email.trim().toLowerCase() })
      toast.success('Sesión iniciada correctamente')
      navigate(from, { replace: true })
    } catch (err) {
      const msg =
        err instanceof ApiError && err.statusCode === 429
          ? 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.'
          : err instanceof ApiError
            ? err.message
            : 'No se pudo iniciar sesión. Comprueba tu conexión.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 sm:py-10">
      <div className="absolute inset-0">
        {slides.map((slide, idx) => (
          <div
            key={slide}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
              idx === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ backgroundImage: `url(${slide})` }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/15 via-slate-900/28 to-slate-950/35" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center md:justify-end">
        {/* Panel opaco claro: máximo contraste para texto e inputs (WCAG-friendly sobre fotos oscuras) */}
        <section className="w-full max-w-sm animate-fade-in-up overflow-hidden rounded-2xl border border-emerald-100/80 bg-white shadow-panel-lg ring-1 ring-emerald-100/40 sm:p-0">
          <div className="panel-accent-top rounded-none" aria-hidden />
          <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 text-lg font-bold text-white shadow-md shadow-emerald-900/15 ring-1 ring-white/20">
              {APP_NAME.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <p className="text-base font-bold text-slate-900">{APP_NAME}</p>
              <p className="text-xs font-medium text-slate-600">Acceso seguro</p>
            </div>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-slate-900">Inicia sesión</h2>
          <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-700">
            Ingresa tus credenciales para continuar.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-5 space-y-3.5 [&_input]:border-slate-300 [&_input]:bg-white [&_label]:text-slate-800"
          >
            {error && (
              <Alert variant="error" onDismiss={() => setError(null)}>
                {error}
              </Alert>
            )}
            <Input
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
              disabled={loading}
            />
            <Input
              type="password"
              label="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={loading}
            />
            <Button
              type="submit"
              className="w-full rounded-xl py-2.5 !border-transparent !bg-gradient-to-r !from-emerald-600 !via-teal-600 !to-cyan-600 !shadow-lg !shadow-emerald-900/15 hover:!from-emerald-500 hover:!via-teal-500 hover:!to-cyan-500"
              loading={loading}
            >
              Entrar al panel
            </Button>
          </form>

          <p className="mt-4 text-center text-sm">
            <Link to="/registro" className="font-medium text-emerald-700 hover:underline">
              Crear cuenta nueva
            </Link>
            <span className="mx-2 text-slate-300">·</span>
            <Link to="/" className="font-medium text-teal-700 hover:underline">
              Volver al inicio
            </Link>
          </p>

          <div className="mt-4 flex items-center justify-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={`dot-${idx}`}
                type="button"
                aria-label={`Ir al fondo ${idx + 1}`}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentSlide ? 'w-7 bg-emerald-600' : 'w-2 bg-emerald-400/70 hover:bg-teal-500'
                }`}
              />
            ))}
          </div>
          </div>
        </section>
      </div>
    </div>
  )
}
