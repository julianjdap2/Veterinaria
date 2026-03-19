import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'

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
      setAuth(access_token, user)
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
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-primary-50 via-white to-accent-50/40">
      <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200/80 shadow-card-hover p-8 animate-fade-in-up">
        <div className="flex justify-center mb-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600 text-xl font-bold">
            V
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 text-center mb-1">
          Vet System
        </h1>
        <p className="text-sm text-slate-500 text-center mb-6">
          Inicia sesión en tu cuenta
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <Button type="submit" className="w-full rounded-xl py-3" loading={loading}>
            Entrar
          </Button>
        </form>
      </div>
    </div>
  )
}
