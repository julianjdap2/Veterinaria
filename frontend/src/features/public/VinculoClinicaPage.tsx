import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Card } from '../../shared/ui/Card'

type ApiErr = { error?: { message?: string; code?: string } }

export function VinculoClinicaPage() {
  const [params] = useSearchParams()
  const token = (params.get('token') ?? '').trim()

  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [message, setMessage] = useState('')
  const [clinica, setClinica] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('err')
      setMessage('Falta el enlace completo. Abra el botón del correo o copie la URL entera.')
      return
    }

    const ctrl = new AbortController()
    async function run() {
      setStatus('loading')
      const base = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')
      try {
        const res = await fetch(`${base}/public/vinculos/confirmar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
          signal: ctrl.signal,
        })
        const data = (await res.json().catch(() => null)) as ApiErr & {
          mensaje?: string
          empresa_nombre?: string
          ok?: boolean
        }
        if (!res.ok) {
          setStatus('err')
          setMessage(data?.error?.message ?? 'No se pudo confirmar el acceso.')
          return
        }
        setStatus('ok')
        setMessage(data?.mensaje ?? 'Listo.')
        setClinica(data?.empresa_nombre ?? '')
      } catch {
        if (!ctrl.signal.aborted) {
          setStatus('err')
          setMessage('Error de red. Compruebe su conexión e intente de nuevo.')
        }
      }
    }
    void run()
    return () => ctrl.abort()
  }, [token])

  return (
    <div className="register-pattern-bg flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md border-slate-200/80 p-8 shadow-xl">
        <h1 className="text-center text-xl font-semibold text-slate-900">Acceso a tu expediente</h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Confirmación de vínculo entre tu perfil y una clínica veterinaria.
        </p>

        {status === 'loading' && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
            <p className="text-sm text-slate-600">Validando enlace…</p>
          </div>
        )}

        {status === 'ok' && (
          <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-center">
            <p className="text-lg font-semibold text-emerald-900">✓ Autorizado</p>
            {clinica ? (
              <p className="mt-1 text-sm text-emerald-800">
                Clínica: <strong>{clinica}</strong>
              </p>
            ) : null}
            <p className="mt-2 text-sm text-emerald-900/90">{message}</p>
            <p className="mt-4 text-xs text-emerald-800/80">Puede cerrar esta ventana.</p>
          </div>
        )}

        {status === 'err' && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-center">
            <p className="text-sm font-medium text-red-900">No se pudo completar</p>
            <p className="mt-2 text-sm text-red-800">{message}</p>
            <Link
              to="/"
              className="mt-4 inline-block text-sm font-medium text-primary-600 hover:text-primary-800"
            >
              Ir al inicio
            </Link>
          </div>
        )}
      </Card>
    </div>
  )
}
