import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Modal } from '../../shared/ui/Modal'
import { Alert } from '../../shared/ui/Alert'
import { Table, TableBody, TableHead, TableRow, TableTh, TableTd } from '../../shared/ui/Table'
import { useAuthStore } from '../../core/auth-store'
import { ROLES } from '../../core/constants'
import {
  createSuperadminPlan,
  fetchSuperadminPlanes,
  updateSuperadminPlan,
  type SuperadminPlan,
  type SuperadminPlanCreate,
  type SuperadminPlanUpdate,
} from './api'
import { ApiError } from '../../api/errors'
import { toast } from '../../core/toast-store'

const QK = ['superadmin', 'planes'] as const

function emptyCreate(): SuperadminPlanCreate {
  return {
    nombre: '',
    codigo: 'STANDARD',
    precio: 0,
    max_usuarios: null,
    max_mascotas: null,
    max_citas_mes: null,
    modulo_inventario: true,
    modulo_ventas: true,
    modulo_reportes: true,
    modulo_facturacion_electronica: false,
    feature_recordatorios_automaticos: true,
    feature_dashboard_avanzado: false,
    feature_exportaciones: true,
    soporte_nivel: 'basico',
  }
}

function PlanEditForm<T extends SuperadminPlanUpdate>({
  draft,
  setDraft,
}: {
  draft: T
  setDraft: React.Dispatch<React.SetStateAction<T>>
}) {
  const numOrNull = (v: string): number | null => {
    if (v.trim() === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Nombre" value={draft.nombre ?? ''} onChange={(e) => setDraft((d) => ({ ...d, nombre: e.target.value }))} />
        <Input label="Código" value={draft.codigo ?? ''} onChange={(e) => setDraft((d) => ({ ...d, codigo: e.target.value }))} />
        <Input
          label="Precio"
          type="number"
          step="0.01"
          value={draft.precio != null ? String(draft.precio) : ''}
          onChange={(e) => setDraft((d) => ({ ...d, precio: Number(e.target.value) || 0 }))}
        />
        <Input
          label="Soporte"
          value={draft.soporte_nivel ?? 'basico'}
          onChange={(e) => setDraft((d) => ({ ...d, soporte_nivel: e.target.value }))}
          placeholder="basico | premium"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label="Máx. usuarios (vacío = sin límite)"
          value={draft.max_usuarios != null ? String(draft.max_usuarios) : ''}
          onChange={(e) => setDraft((d) => ({ ...d, max_usuarios: numOrNull(e.target.value) }))}
        />
        <Input
          label="Máx. mascotas"
          value={draft.max_mascotas != null ? String(draft.max_mascotas) : ''}
          onChange={(e) => setDraft((d) => ({ ...d, max_mascotas: numOrNull(e.target.value) }))}
        />
        <Input
          label="Máx. citas / mes"
          value={draft.max_citas_mes != null ? String(draft.max_citas_mes) : ''}
          onChange={(e) => setDraft((d) => ({ ...d, max_citas_mes: numOrNull(e.target.value) }))}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 border-t border-slate-100 pt-3 text-sm">
        {(
          [
            ['modulo_inventario', 'Módulo inventario'],
            ['modulo_ventas', 'Módulo ventas'],
            ['modulo_reportes', 'Módulo reportes'],
            ['modulo_facturacion_electronica', 'Facturación electrónica'],
            ['feature_recordatorios_automaticos', 'Recordatorios automáticos'],
            ['feature_dashboard_avanzado', 'Dashboard avanzado'],
            ['feature_exportaciones', 'Exportaciones'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="rounded border-slate-300"
              checked={!!draft[key]}
              onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.checked }))}
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  )
}

export function SuperadminPlanesPage() {
  const user = useAuthStore((s) => s.user)
  const isSuperadmin = user?.rolId === ROLES.SUPERADMIN
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<SuperadminPlan | null>(null)
  const [editDraft, setEditDraft] = useState<SuperadminPlanUpdate>({})
  const [showCreate, setShowCreate] = useState(false)
  const [createDraft, setCreateDraft] = useState<SuperadminPlanCreate>(emptyCreate)

  const { data: planes, isLoading, isError } = useQuery({
    queryKey: QK,
    queryFn: fetchSuperadminPlanes,
  })

  const patchMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: SuperadminPlanUpdate }) =>
      updateSuperadminPlan(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK })
      toast.success('Plan actualizado')
      setEditing(null)
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Error al guardar plan'),
  })

  const createMutation = useMutation({
    mutationFn: (payload: SuperadminPlanCreate) => createSuperadminPlan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK })
      toast.success('Plan creado')
      setShowCreate(false)
      setCreateDraft(emptyCreate())
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Error al crear plan'),
  })

  const rows = useMemo(() => planes ?? [], [planes])

  function openEdit(p: SuperadminPlan) {
    setEditing(p)
    setEditDraft({
      nombre: p.nombre,
      codigo: p.codigo,
      precio: p.precio,
      max_usuarios: p.max_usuarios,
      max_mascotas: p.max_mascotas,
      max_citas_mes: p.max_citas_mes,
      modulo_inventario: p.modulo_inventario,
      modulo_ventas: p.modulo_ventas,
      modulo_reportes: p.modulo_reportes,
      modulo_facturacion_electronica: p.modulo_facturacion_electronica,
      feature_recordatorios_automaticos: p.feature_recordatorios_automaticos,
      feature_dashboard_avanzado: p.feature_dashboard_avanzado,
      feature_exportaciones: p.feature_exportaciones,
      soporte_nivel: p.soporte_nivel,
    })
  }

  function saveEdit() {
    if (!editing) return
    const payload: SuperadminPlanUpdate = { ...editDraft }
    if (!String(payload.nombre ?? '').trim()) {
      toast.warning('El nombre es obligatorio')
      return
    }
    patchMutation.mutate({ id: editing.id, payload })
  }

  function submitCreate() {
    if (!String(createDraft.nombre).trim()) {
      toast.warning('El nombre es obligatorio')
      return
    }
    createMutation.mutate(createDraft)
  }

  if (!isSuperadmin) {
    return (
      <Alert variant="error">
        <strong className="block">Acceso denegado.</strong>
        Solo superadmin puede gestionar planes.
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Planes de suscripción</h1>
        <Button variant="secondary" onClick={() => setShowCreate((s) => !s)}>
          {showCreate ? 'Ocultar nuevo plan' : 'Nuevo plan'}
        </Button>
      </div>

      {isError && (
        <Alert variant="error">
          <strong className="block">Error.</strong> No se pudieron cargar los planes.
        </Alert>
      )}

      {showCreate && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Crear plan</h2>
          <PlanEditForm draft={createDraft} setDraft={setCreateDraft} />
          <div className="mt-4 flex gap-2">
            <Button onClick={submitCreate} loading={createMutation.isPending}>
              Crear
            </Button>
            <Button variant="ghost" onClick={() => setCreateDraft(emptyCreate())}>
              Limpiar
            </Button>
          </div>
        </Card>
      )}

      <Card>
        {isLoading ? (
          <p className="text-sm text-slate-500">Cargando…</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <TableTh>ID</TableTh>
                  <TableTh>Nombre</TableTh>
                  <TableTh>Código</TableTh>
                  <TableTh>Precio</TableTh>
                  <TableTh>Límites</TableTh>
                  <TableTh className="text-right">Acciones</TableTh>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableTd colSpan={6} className="text-center text-slate-500">
                      No hay planes registrados.
                    </TableTd>
                  </TableRow>
                ) : (
                  rows.map((p) => (
                    <TableRow key={p.id}>
                      <TableTd>{p.id}</TableTd>
                      <TableTd className="font-medium">{p.nombre}</TableTd>
                      <TableTd>{p.codigo}</TableTd>
                      <TableTd>{p.precio}</TableTd>
                      <TableTd className="text-xs text-slate-600">
                        u:{p.max_usuarios ?? '∞'} m:{p.max_mascotas ?? '∞'} c/m:{p.max_citas_mes ?? '∞'}
                      </TableTd>
                      <TableTd className="text-right">
                        <Button variant="secondary" className="text-xs" onClick={() => openEdit(p)}>
                          Editar
                        </Button>
                      </TableTd>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Modal
        open={!!editing}
        title={editing ? `Editar plan — ${editing.nombre}` : 'Plan'}
        onClose={() => !patchMutation.isPending && setEditing(null)}
      >
        <PlanEditForm draft={editDraft} setDraft={setEditDraft} />
        <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
          <Button onClick={saveEdit} loading={patchMutation.isPending}>
            Guardar
          </Button>
          <Button variant="secondary" onClick={() => setEditing(null)} disabled={patchMutation.isPending}>
            Cancelar
          </Button>
        </div>
      </Modal>
    </div>
  )
}
