import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '../../shared/ui/Card'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Modal } from '../../shared/ui/Modal'
import { Alert } from '../../shared/ui/Alert'
import { useAuthStore } from '../../core/auth-store'
import { ROLES } from '../../core/constants'
import {
  fetchEmpresaAdminPermisos,
  fetchEmpresaConfig,
  fetchEmpresaPerfilesAdmin,
  fetchSuperadminEmpresas,
  createEmpresaPerfilAdmin,
  deleteEmpresaPerfilAdmin,
  patchEmpresaPerfilAdmin,
  updateEmpresaAdminPermisos,
  updateEmpresaConfig,
  updateSuperadminEmpresa,
  type EmpresaAdminPermisos,
  type EmpresaConfiguracion,
  type EmpresaPerfilAdmin,
} from './api'
import { ApiError } from '../../api/errors'
import { toast } from '../../core/toast-store'

type PermisoKey = keyof Omit<EmpresaAdminPermisos, 'empresa_id'>

const PERMISO_ADMIN_ROWS: [PermisoKey, string][] = [
  ['admin_gestion_usuarios', 'Gestionar usuarios'],
  ['admin_gestion_inventario', 'Gestionar inventario'],
  ['admin_gestion_ventas', 'Gestionar ventas'],
  ['admin_gestion_citas', 'Gestionar citas'],
  ['admin_ver_auditoria', 'Ver auditoría'],
  ['admin_configuracion_empresa', 'Configurar empresa'],
  ['admin_carga_masiva_inventario', 'Carga masiva inventario (CSV)'],
  ['admin_exportacion_dashboard', 'Exportar datos del dashboard (CSV)'],
]

function slugify(s: string): string {
  const x = s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return x && /^[a-z0-9]/.test(x) ? x : `perfil-${x || 'nuevo'}`.replace(/^-+/, '')
}

type Tri = 'inherit' | 'yes' | 'no'

function triFromValue(v: boolean | null | undefined): Tri {
  if (v === true) return 'yes'
  if (v === false) return 'no'
  return 'inherit'
}

export function SuperadminEmpresasPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isSuperadmin = user?.rolId === ROLES.SUPERADMIN
  const [page] = useState(1)
  const [empresaId, setEmpresaId] = useState<number | null>(null)

  const [draft, setDraft] = useState<Omit<EmpresaAdminPermisos, 'empresa_id'> | null>(null)
  const [estadoDraft, setEstadoDraft] = useState<'activa' | 'suspendida' | 'en_prueba'>('activa')
  const [nuevoPerfilNombre, setNuevoPerfilNombre] = useState('')
  const [nuevoPerfilSlug, setNuevoPerfilSlug] = useState('')
  const [perfilEdit, setPerfilEdit] = useState<EmpresaPerfilAdmin | null>(null)
  const [overrideTri, setOverrideTri] = useState<Record<string, Tri>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['superadmin', 'empresas', page],
    queryFn: () => fetchSuperadminEmpresas(page, 50),
  })

  const { data: permisos, isLoading: loadingPermisos } = useQuery({
    queryKey: ['superadmin', 'empresa-permisos', empresaId],
    queryFn: () => fetchEmpresaAdminPermisos(empresaId as number),
    enabled: empresaId != null,
  })

  const { data: perfiles, isLoading: loadingPerfiles } = useQuery({
    queryKey: ['superadmin', 'perfiles-admin', empresaId],
    queryFn: () => fetchEmpresaPerfilesAdmin(empresaId as number),
    enabled: empresaId != null,
  })

  const effective = useMemo(
    () =>
      draft ??
      (permisos ? ({ ...permisos, empresa_id: undefined } as unknown as Omit<EmpresaAdminPermisos, 'empresa_id'>) : null),
    [draft, permisos],
  )
  const selectedEmpresa = (data?.items ?? []).find((e) => e.id === empresaId) ?? null

  const { data: config, isLoading: loadingConfig } = useQuery({
    queryKey: ['superadmin', 'empresa-config', empresaId],
    queryFn: () => fetchEmpresaConfig(empresaId as number),
    enabled: empresaId != null,
  })
  const [configDraft, setConfigDraft] = useState<Omit<EmpresaConfiguracion, 'empresa_id'> | null>(null)
  const effectiveConfig = useMemo(
    () =>
      configDraft ??
      (config ? ({ ...config, empresa_id: undefined } as unknown as Omit<EmpresaConfiguracion, 'empresa_id'>) : null),
    [configDraft, config],
  )

  const mutation = useMutation({
    mutationFn: (payload: Omit<EmpresaAdminPermisos, 'empresa_id'>) =>
      updateEmpresaAdminPermisos(empresaId as number, payload),
    onSuccess: () => {
      toast.success('Permisos actualizados')
      setDraft(null)
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Error al actualizar permisos'
      toast.error(msg)
    },
  })

  const crearPerfilMut = useMutation({
    mutationFn: () =>
      createEmpresaPerfilAdmin(empresaId as number, {
        nombre: nuevoPerfilNombre.trim(),
        slug: nuevoPerfilSlug.trim().toLowerCase() || slugify(nuevoPerfilNombre),
      }),
    onSuccess: () => {
      toast.success('Perfil creado')
      setNuevoPerfilNombre('')
      setNuevoPerfilSlug('')
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'perfiles-admin', empresaId] })
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Error al crear perfil'),
  })

  const borrarPerfilMut = useMutation({
    mutationFn: (perfilId: number) => deleteEmpresaPerfilAdmin(empresaId as number, perfilId),
    onSuccess: () => {
      toast.success('Perfil eliminado')
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'perfiles-admin', empresaId] })
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Error al eliminar'),
  })

  const patchPerfilMut = useMutation({
    mutationFn: (payload: { perfilId: number; overrides: Record<string, boolean | null> }) =>
      patchEmpresaPerfilAdmin(empresaId as number, payload.perfilId, { overrides: payload.overrides }),
    onSuccess: () => {
      toast.success('Perfil actualizado')
      setPerfilEdit(null)
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'perfiles-admin', empresaId] })
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Error al guardar perfil'),
  })

  const empresaMutation = useMutation({
    mutationFn: (payload: { estado: string; activa: boolean }) =>
      updateSuperadminEmpresa(empresaId as number, payload),
    onSuccess: () => {
      toast.success('Estado de empresa actualizado')
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Error al actualizar empresa'),
  })

  const configMutation = useMutation({
    mutationFn: (payload: Omit<EmpresaConfiguracion, 'empresa_id'>) =>
      updateEmpresaConfig(empresaId as number, payload),
    onSuccess: () => {
      toast.success('Feature flags actualizados')
      setConfigDraft(null)
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Error al actualizar configuración'),
  })

  function toggle(key: PermisoKey) {
    if (!effective) return
    setDraft({ ...effective, [key]: !effective[key] })
  }

  function openEditPerfil(p: EmpresaPerfilAdmin) {
    setPerfilEdit(p)
    const next: Record<string, Tri> = {}
    for (const [k] of PERMISO_ADMIN_ROWS) {
      next[k] = triFromValue(p[k as keyof EmpresaPerfilAdmin] as boolean | null)
    }
    setOverrideTri(next)
  }

  function savePerfilOverrides() {
    if (!perfilEdit || empresaId == null) return
    const overrides: Record<string, boolean | null> = {}
    for (const [k] of PERMISO_ADMIN_ROWS) {
      const t = overrideTri[k] ?? 'inherit'
      overrides[k] = t === 'inherit' ? null : t === 'yes'
    }
    patchPerfilMut.mutate({ perfilId: perfilEdit.id, overrides })
  }

  if (!isSuperadmin) {
    return (
      <Alert variant="error">
        Acceso restringido. Esta sección es exclusiva para superadmin de plataforma.
      </Alert>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <PageHeader
        breadcrumbs={[{ label: 'Superadmin' }, { label: 'Empresas' }]}
        title="Empresas y permisos"
        subtitle="Selecciona una clínica para ajustar permisos de admin, perfiles y configuración."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Empresas">
          {isLoading ? (
            <p className="text-sm text-slate-500">Cargando empresas...</p>
          ) : (
            <div className="space-y-2">
              {(data?.items ?? []).map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    setEmpresaId(e.id)
                    setDraft(null)
                    setConfigDraft(null)
                    setEstadoDraft((e.estado as 'activa' | 'suspendida' | 'en_prueba') ?? 'activa')
                  }}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                    empresaId === e.id
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-800">{e.nombre}</p>
                  <p className="text-xs text-slate-500">
                    ID #{e.id} - {e.email ?? 'sin email'} - {e.estado} - {e.activa ? 'Activa' : 'Inactiva'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card title="Plantilla: permisos de admin (empresa)">
          {empresaId == null ? (
            <Alert variant="info">Selecciona una empresa para configurar permisos.</Alert>
          ) : loadingPermisos || !effective ? (
            <p className="text-sm text-slate-500">Cargando permisos...</p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Valores por defecto para todos los administradores. Los <strong>perfiles</strong> pueden acotar permisos
                por usuario.
              </p>
              {PERMISO_ADMIN_ROWS.map(([k, label]) => (
                <label key={k} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <span className="text-sm text-slate-700">{label}</span>
                  <input
                    type="checkbox"
                    checked={!!effective[k]}
                    onChange={() => toggle(k)}
                    className="h-4 w-4 rounded border-slate-300 text-primary-600"
                  />
                </label>
              ))}
              <div className="flex gap-2 pt-2">
                <Button onClick={() => mutation.mutate(effective)} loading={mutation.isPending}>
                  Guardar plantilla
                </Button>
                <Button variant="secondary" onClick={() => setDraft(null)} disabled={mutation.isPending}>
                  Revertir
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card title="Perfiles admin personalizados (por empresa)">
        {empresaId == null ? (
          <Alert variant="info">Selecciona una empresa para gestionar perfiles.</Alert>
        ) : loadingPerfiles ? (
          <p className="text-sm text-slate-500">Cargando perfiles...</p>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Cada perfil puede <strong>restringir o ampliar</strong> permisos respecto a la plantilla (heredar = usar el
              valor de la plantilla).
            </p>
            <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
              <Input
                label="Nombre del perfil"
                value={nuevoPerfilNombre}
                onChange={(e) => setNuevoPerfilNombre(e.target.value)}
                placeholder="Ej. Admin solo recepción"
                className="min-w-[200px]"
              />
              <Input
                label="Slug (id único)"
                value={nuevoPerfilSlug}
                onChange={(e) => setNuevoPerfilSlug(e.target.value)}
                placeholder={slugify(nuevoPerfilNombre || 'mi-perfil')}
                className="min-w-[160px]"
              />
              <Button
                onClick={() => crearPerfilMut.mutate()}
                loading={crearPerfilMut.isPending}
                disabled={!nuevoPerfilNombre.trim()}
              >
                Crear perfil
              </Button>
            </div>
            {(perfiles?.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">No hay perfiles. Los admins usan solo la plantilla.</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {(perfiles ?? []).map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{p.nombre}</p>
                      <p className="text-xs text-slate-500">slug: {p.slug}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" className="text-xs" onClick={() => openEditPerfil(p)}>
                        Overrides
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-xs text-red-700"
                        onClick={() => {
                          if (window.confirm(`¿Eliminar perfil "${p.nombre}"? Los usuarios quedarán sin perfil.`)) {
                            borrarPerfilMut.mutate(p.id)
                          }
                        }}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Estado de empresa">
          {selectedEmpresa ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Empresa: <span className="font-semibold">{selectedEmpresa.nombre}</span>
              </p>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Estado</label>
                <select
                  value={estadoDraft}
                  onChange={(e) => setEstadoDraft(e.target.value as 'activa' | 'suspendida' | 'en_prueba')}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2"
                >
                  <option value="activa">Activa</option>
                  <option value="suspendida">Suspendida</option>
                  <option value="en_prueba">En prueba</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={selectedEmpresa.activa}
                  onChange={(e) => empresaMutation.mutate({ estado: estadoDraft, activa: e.target.checked })}
                />
                Empresa activa
              </label>
              <Button
                onClick={() => empresaMutation.mutate({ estado: estadoDraft, activa: selectedEmpresa.activa })}
                loading={empresaMutation.isPending}
              >
                Guardar estado
              </Button>
            </div>
          ) : (
            <Alert variant="info">Selecciona una empresa.</Alert>
          )}
        </Card>
        <Card title="Feature flags por empresa">
          {empresaId == null ? (
            <Alert variant="info">Selecciona una empresa para configurar módulos.</Alert>
          ) : loadingConfig || !effectiveConfig ? (
            <p className="text-sm text-slate-500">Cargando configuración...</p>
          ) : (
            <div className="space-y-2">
              {[
                ['modulo_inventario', 'Módulo Inventario'],
                ['modulo_ventas', 'Módulo Ventas'],
                ['modulo_reportes', 'Módulo Reportes'],
                ['modulo_facturacion_electronica', 'Facturación electrónica'],
                ['feature_recordatorios_automaticos', 'Recordatorios automáticos'],
                ['feature_dashboard_avanzado', 'Dashboard avanzado'],
                ['feature_exportaciones', 'Exportaciones'],
              ].map(([k, label]) => {
                const key = k as keyof Omit<EmpresaConfiguracion, 'empresa_id'>
                return (
                  <label key={k} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <span className="text-sm text-slate-700">{label}</span>
                    <input
                      type="checkbox"
                      checked={!!effectiveConfig[key]}
                      onChange={() => setConfigDraft({ ...effectiveConfig, [key]: !effectiveConfig[key] })}
                    />
                  </label>
                )
              })}
              <Button onClick={() => configMutation.mutate(effectiveConfig)} loading={configMutation.isPending}>
                Guardar módulos/flags
              </Button>
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={!!perfilEdit}
        title={perfilEdit ? `Overrides — ${perfilEdit.nombre}` : 'Perfil'}
        onClose={() => !patchPerfilMut.isPending && setPerfilEdit(null)}
      >
        <p className="mb-3 text-xs text-slate-600">
          Heredar = usar la plantilla de empresa. Sí/No fuerza el permiso para los usuarios con este perfil.
        </p>
        <div className="max-h-[50vh] space-y-2 overflow-auto pr-1">
          {PERMISO_ADMIN_ROWS.map(([k, label]) => (
            <div key={k} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-2 py-1.5">
              <span className="text-xs text-slate-700">{label}</span>
              <select
                value={overrideTri[k] ?? 'inherit'}
                onChange={(e) => setOverrideTri((prev) => ({ ...prev, [k]: e.target.value as Tri }))}
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                disabled={patchPerfilMut.isPending}
              >
                <option value="inherit">Heredar</option>
                <option value="yes">Sí</option>
                <option value="no">No</option>
              </select>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
          <Button onClick={savePerfilOverrides} loading={patchPerfilMut.isPending}>
            Guardar overrides
          </Button>
          <Button variant="secondary" onClick={() => setPerfilEdit(null)} disabled={patchPerfilMut.isPending}>
            Cancelar
          </Button>
        </div>
      </Modal>
    </div>
  )
}
