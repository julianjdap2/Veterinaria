import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../core/auth-store'
import { APP_NAME } from '../../core/branding'
import { ApiError } from '../../api/errors'
import { activarRegistro, fetchSessionMe, userFromToken } from './api'
import { Alert } from '../../shared/ui/Alert'

/**
 * Intercambia el token del correo por sesión y redirige a configuración inicial (términos + asistente).
 * Sin formulario de login.
 */
export function ActivarPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const tokenParam = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const [message, setMessage] = useState<string | null>(null)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    if (!tokenParam?.trim()) {
      setStatus('error')
      setMessage('Falta el enlace de activación. Revise el correo o inicie sesión con su contraseña.')
      return
    }
    ran.current = true

    ;(async () => {
      try {
        const { access_token } = await activarRegistro(tokenParam.trim())
        const u = userFromToken(access_token)
        setAuth(access_token, u)
        try {
          const me = await fetchSessionMe()
          setAuth(access_token, { ...u, email: me.email })
        } catch {
          /* sesión ya válida; el asistente puede cargar /auth/me después */
        }
        navigate('/configuracion-inicial', { replace: true })
      } catch (err) {
        setStatus('error')
        setMessage(
          err instanceof ApiError
            ? err.message
            : 'No se pudo validar el enlace. Intente de nuevo o inicie sesión.',
        )
      }
    })()
  }, [tokenParam, navigate, setAuth])

  return (
    <div className="register-pattern-bg flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-emerald-100/80 bg-white shadow-panel-lg ring-1 ring-emerald-100/40">
        <div className="panel-accent-top rounded-none" aria-hidden />
        <div className="p-8 text-center">
          <h1 className="text-lg font-bold text-emerald-950">{APP_NAME}</h1>
          <p className="mt-2 text-sm text-stone-600">Activando su acceso…</p>
          {status === 'loading' && <p className="mt-6 text-sm text-stone-500">Un momento, por favor.</p>}
          {status === 'error' && message && (
            <>
              <Alert variant="error" className="mt-4 text-left">
                {message}
              </Alert>
              <Link
                to="/login"
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-emerald-700/20 hover:from-emerald-700 hover:to-teal-700"
              >
                Ir a iniciar sesión
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
