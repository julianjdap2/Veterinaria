import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  AtSign,
  Copy,
  Eye,
  FileText,
  HeartPulse,
  MoreHorizontal,
  Printer,
  Trash2,
} from 'lucide-react'
import { downloadResumenPdf, deleteFormulaItem, enviarResumenEmail } from '../../consultas/api'
import { toast } from '../../../core/toast-store'
import { ApiError } from '../../../api/errors'
import type { FormulaItem } from '../../../api/types'

type Props = {
  consultaId: number
  mascotaId: number
  formulaItems: FormulaItem[]
}

const MENU_WIDTH = 248

const itemClass =
  'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-slate-800 transition hover:bg-slate-50'

export function FormulaMedicaOpcionesMenu({ consultaId, mascotaId, formulaItems }: Props) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<'pdf' | 'email' | 'delete' | null>(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  function updateMenuPosition() {
    const el = btnRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const pad = 8
    let left = r.right - MENU_WIDTH
    left = Math.max(pad, Math.min(left, window.innerWidth - MENU_WIDTH - pad))
    const top = Math.min(r.bottom + 6, window.innerHeight - pad)
    setMenuPos({ top, left })
  }

  useLayoutEffect(() => {
    if (!open) return
    updateMenuPosition()
  }, [open])

  useEffect(() => {
    if (!open) return
    function onScrollOrResize() {
      updateMenuPosition()
    }
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function close(e: MouseEvent) {
      const t = e.target as Node
      if (btnRef.current?.contains(t)) return
      if (menuRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['consultas', 'formula', consultaId] })
    queryClient.invalidateQueries({ queryKey: ['consultas', 'mascota', mascotaId] })
    queryClient.invalidateQueries({ queryKey: ['consultas', 'detail', consultaId] })
    queryClient.invalidateQueries({ queryKey: ['consultas', 'resumen', consultaId] })
  }

  async function handlePdf() {
    setBusy('pdf')
    try {
      await downloadResumenPdf(consultaId)
      toast.success('PDF descargado')
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo generar el PDF.')
    } finally {
      setBusy(null)
    }
  }

  async function handleEmail() {
    setBusy('email')
    try {
      await enviarResumenEmail(consultaId)
      toast.success('Resumen enviado por email')
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo enviar el email.')
    } finally {
      setBusy(null)
    }
  }

  async function handleEliminarFormula() {
    if (formulaItems.length === 0) {
      toast.warning('No hay medicamentos en esta fórmula.')
      setOpen(false)
      return
    }
    const ok = window.confirm(
      '¿Quitar todos los medicamentos de esta fórmula? La consulta seguirá registrada; solo se borran los ítems de la receta.',
    )
    if (!ok) return
    setBusy('delete')
    try {
      for (const it of formulaItems) {
        await deleteFormulaItem(consultaId, it.id)
      }
      invalidate()
      toast.success('Medicamentos eliminados de la fórmula')
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo eliminar la fórmula.')
    } finally {
      setBusy(null)
    }
  }

  const menu =
    open &&
    createPortal(
      <div
        ref={menuRef}
        className="fixed z-[520] max-h-[min(24rem,calc(100vh-1rem))] w-[15.5rem] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl ring-1 ring-slate-900/10"
        style={{ top: menuPos.top, left: menuPos.left }}
        role="menu"
      >
        <Link
          to={`/consultas/${consultaId}`}
          state={{ fromMascota: mascotaId }}
          className={itemClass}
          onClick={() => setOpen(false)}
          role="menuitem"
        >
          <Eye className="h-4 w-4 shrink-0 text-slate-600" />
          Ver
        </Link>
        <button
          type="button"
          role="menuitem"
          disabled={busy !== null}
          className={`${itemClass} disabled:opacity-50`}
          onClick={handlePdf}
        >
          <Printer className="h-4 w-4 shrink-0 text-slate-600" />
          {busy === 'pdf' ? 'Generando…' : 'Impresión'}
        </button>
        <button
          type="button"
          role="menuitem"
          disabled={busy !== null}
          className={`${itemClass} disabled:opacity-50`}
          onClick={handleEmail}
        >
          <AtSign className="h-4 w-4 shrink-0 text-slate-600" />
          {busy === 'email' ? 'Enviando…' : 'Enviar por email'}
        </button>
        <button
          type="button"
          className={`${itemClass} cursor-not-allowed text-slate-400`}
          disabled
          title="Próximamente"
        >
          <HeartPulse className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="min-w-0 flex-1 truncate">Seguimientos</span>
          <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary-600 px-1.5 text-[10px] font-bold text-white">
            0
          </span>
        </button>
        <button
          type="button"
          className={`${itemClass} cursor-not-allowed text-slate-400`}
          disabled
          title="Próximamente"
        >
          <FileText className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="min-w-0 flex-1 truncate">Documentos</span>
          <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary-600 px-1.5 text-[10px] font-bold text-white">
            0
          </span>
        </button>
        <button
          type="button"
          role="menuitem"
          className={itemClass}
          onClick={() => {
            toast.info('Próximamente: duplicar fórmula en una nueva consulta.')
            setOpen(false)
          }}
        >
          <Copy className="h-4 w-4 shrink-0 text-slate-600" />
          Replicar
        </button>
        <div className="my-1 border-t border-slate-100" role="separator" />
        <button
          type="button"
          role="menuitem"
          disabled={busy !== null || formulaItems.length === 0}
          className={`${itemClass} text-red-700 hover:bg-red-50 disabled:opacity-50`}
          onClick={handleEliminarFormula}
        >
          <Trash2 className="h-4 w-4 shrink-0" />
          {busy === 'delete' ? 'Eliminando…' : 'Eliminar'}
        </button>
      </div>,
      document.body,
    )

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
        title="Más opciones"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {menu}
    </>
  )
}
