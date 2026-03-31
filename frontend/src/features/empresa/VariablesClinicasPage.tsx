import { useMemo, useState } from 'react'
import { useAuthStore } from '../../core/auth-store'
import { ROLES } from '../../core/constants'
import { useMisPermisosAdmin } from '../usuarios/hooks/useUsuarios'
import {
  usePatchVariablesClinicas,
  useTopPruebasLaboratorioMasUsadas,
  useVariablesClinicas,
} from './hooks/useVariablesClinicas'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Alert } from '../../shared/ui/Alert'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Modal } from '../../shared/ui/Modal'
import { Table, TableBody, TableHead, TableRow, TableTd, TableTh } from '../../shared/ui/Table'
import { IconLockClosed } from '../../shared/ui/icons'
import { RichTextEditor } from '../../shared/ui/RichTextEditor'
import { toast } from '../../core/toast-store'
import { ApiError } from '../../api/errors'
import type { FormatoDocumentoItem, ItemVariableSimple, VariablesClinicasPatch } from '../../api/types'

type SectionSimple = 'vacunas' | 'hospitalizacion' | 'procedimientos' | 'pruebas_laboratorio'

const TABS: { key: SectionSimple | 'formatos_documento'; label: string; description: string }[] = [
  { key: 'vacunas', label: 'Vacunas', description: 'Vacunas disponibles para historial y recordatorios.' },
  { key: 'hospitalizacion', label: 'Hospitalización', description: 'Tipos de estancia (hospitalización, ambulatorio, etc.).' },
  { key: 'procedimientos', label: 'Cirugías / procedimientos', description: 'Lista de procedimientos habituales.' },
  { key: 'pruebas_laboratorio', label: 'Pruebas de laboratorio', description: 'Pruebas solicitables para órdenes.' },
  { key: 'formatos_documento', label: 'Formatos de documentos', description: 'Plantillas HTML para impresión o consentimientos.' },
]

function newId(): string {
  const u = globalThis.crypto?.randomUUID?.()
  if (u) return `u-${u.replace(/-/g, '').slice(0, 12)}`
  return `u-${Date.now().toString(36)}`
}

export function VariablesClinicasPage() {
  const user = useAuthStore((s) => s.user)
  const rolId = user?.rolId ?? 0
  const isAdmin = rolId === ROLES.ADMIN
  const { data: permisosAdmin } = useMisPermisosAdmin({ enabled: isAdmin })
  const canEdit =
    isAdmin && (permisosAdmin?.admin_configuracion_empresa === undefined || permisosAdmin.admin_configuracion_empresa === true)

  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('vacunas')
  const { data, isLoading, isError, error } = useVariablesClinicas()
  const { data: topLabMasUsadas = [] } = useTopPruebasLaboratorioMasUsadas({
    enabled: tab === 'pruebas_laboratorio',
    dias: 120,
    limit: 10,
  })
  const mutation = usePatchVariablesClinicas()

  const [editSimple, setEditSimple] = useState<ItemVariableSimple | null>(null)
  const [editFormato, setEditFormato] = useState<FormatoDocumentoItem | null>(null)
  const [createSimple, setCreateSimple] = useState<{ nombre: string; categoria: string }>({
    nombre: '',
    categoria: '',
  })
  const [createFormato, setCreateFormato] = useState<{ nombre: string; contenido_html: string }>({
    nombre: '',
    contenido_html: '<p></p>',
  })
  const [openCreateSimple, setOpenCreateSimple] = useState(false)
  const [openCreateFormato, setOpenCreateFormato] = useState(false)

  const currentTabMeta = useMemo(() => TABS.find((t) => t.key === tab), [tab])

  async function patchSection(payload: VariablesClinicasPatch) {
    try {
      await mutation.mutateAsync(payload)
      toast.success('Catálogo actualizado')
      setEditSimple(null)
      setEditFormato(null)
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'No se pudo guardar'
      toast.error(msg)
    }
  }

  function handleSaveSimple() {
    if (!data || !editSimple) return
    const key = tab as SectionSimple
    const list = [...data[key]]
    const i = list.findIndex((x) => x.id === editSimple.id)
    if (i < 0) return
    list[i] = {
      ...list[i],
      nombre: editSimple.nombre.trim(),
      categoria: tab === 'pruebas_laboratorio' ? editSimple.categoria ?? null : null,
    }
    void patchSection({ [key]: list } as VariablesClinicasPatch)
  }

  function handleSaveFormato() {
    if (!data || !editFormato) return
    const list = data.formatos_documento.map((x) =>
      x.id === editFormato.id ? { ...editFormato } : x,
    )
    void patchSection({ formatos_documento: list })
  }

  function handleDeleteSimple(item: ItemVariableSimple) {
    if (!data || !canEdit || item.sistema) return
    const key = tab as SectionSimple
    const list = data[key].filter((x) => x.id !== item.id)
    void patchSection({ [key]: list } as VariablesClinicasPatch)
  }

  function handleDeleteFormato(item: FormatoDocumentoItem) {
    if (!data || !canEdit || item.sistema) return
    const list = data.formatos_documento.filter((x) => x.id !== item.id)
    void patchSection({ formatos_documento: list })
  }

  function handleConfirmCreateSimple() {
    if (!data || !canEdit) return
    const nombre = createSimple.nombre.trim()
    if (!nombre) {
      toast.warning('El nombre es obligatorio')
      return
    }
    const key = tab as SectionSimple
    const nuevo: ItemVariableSimple = {
      id: newId(),
      nombre,
      categoria: key === 'pruebas_laboratorio' ? createSimple.categoria.trim() || null : null,
      sistema: false,
    }
    void patchSection({ [key]: [...data[key], nuevo] } as VariablesClinicasPatch)
    setCreateSimple({ nombre: '', categoria: '' })
    setOpenCreateSimple(false)
  }

  function handleConfirmCreateFormato() {
    if (!data || !canEdit) return
    const nombre = createFormato.nombre.trim()
    if (!nombre) {
      toast.warning('El nombre del formato es obligatorio')
      return
    }
    const nuevo: FormatoDocumentoItem = {
      id: newId(),
      nombre,
      contenido_html: createFormato.contenido_html || '<p></p>',
      sistema: false,
    }
    void patchSection({ formatos_documento: [...data.formatos_documento, nuevo] })
    setCreateFormato({ nombre: '', contenido_html: '<p></p>' })
    setOpenCreateFormato(false)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <PageHeader
        breadcrumbs={[{ label: 'Administración' }, { label: 'Variables clínicas' }]}
        title="Variables clínicas"
        subtitle="Catálogos compartidos por la clínica. Solo los administradores pueden crear, editar o eliminar; el resto del equipo puede consultarlos."
      />

      {!isAdmin && (
        <Alert variant="info">
          <span className="inline-flex items-center gap-2">
            <IconLockClosed className="h-4 w-4 shrink-0 text-slate-500" />
            Vista de solo lectura. Los cambios los realiza un administrador desde su cuenta.
          </span>
        </Alert>
      )}

      {isAdmin && permisosAdmin && permisosAdmin.admin_configuracion_empresa === false && (
        <Alert variant="warning">
          Tu perfil de administrador no incluye permiso para configurar la empresa. Contacta a un superadmin si necesitas
          editar estos catálogos.
        </Alert>
      )}

      {isError && (
        <Alert variant="error">{error instanceof Error ? error.message : 'Error al cargar variables'}</Alert>
      )}

      {isLoading && <p className="text-sm text-slate-500">Cargando catálogos…</p>}

      {data && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  tab === t.key
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {currentTabMeta && (
            <p className="text-sm text-slate-600">
              <strong className="text-slate-800">{currentTabMeta.label}.</strong> {currentTabMeta.description}
            </p>
          )}

          {tab !== 'formatos_documento' && (
            <div className="flex justify-end">
              <Button type="button" variant="secondary" onClick={() => setOpenCreateSimple(true)} disabled={!canEdit || mutation.isPending}>
                Añadir ítem
              </Button>
            </div>
          )}

          {tab === 'formatos_documento' && (
            <div className="flex justify-end">
              <Button type="button" variant="secondary" onClick={() => setOpenCreateFormato(true)} disabled={!canEdit || mutation.isPending}>
                Añadir formato
              </Button>
            </div>
          )}

          {tab === 'pruebas_laboratorio' && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="mb-2 text-sm font-semibold text-slate-800">Perfiles más usados</p>
              {topLabMasUsadas.length === 0 ? (
                <p className="text-sm text-slate-500">Aún no hay suficiente historial para calcularlo.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {topLabMasUsadas.map((x) => (
                    <span key={x.id} className="inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
                      {x.nombre} ({x.cantidad})
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab !== 'formatos_documento' && (
            <Table plain>
              <TableHead>
                <TableRow header>
                  <TableTh className="w-12"> </TableTh>
                  <TableTh>Nombre</TableTh>
                  {tab === 'pruebas_laboratorio' ? <TableTh>Categoría / agrupación</TableTh> : null}
                  {canEdit ? <TableTh className="w-40 text-right">Acciones</TableTh> : null}
                </TableRow>
              </TableHead>
              <TableBody>
                {(data[tab as SectionSimple] as ItemVariableSimple[]).map((row) => (
                  <TableRow key={row.id}>
                    <TableTd className="align-middle">
                      {!canEdit ? (
                        <span title="Solo lectura" className="inline-flex text-slate-400">
                          <IconLockClosed className="h-4 w-4" />
                        </span>
                      ) : row.sistema ? (
                        <span title="Ítem del sistema: no se puede eliminar" className="inline-flex text-amber-600">
                          <IconLockClosed className="h-4 w-4" />
                        </span>
                      ) : (
                        <span className="inline-flex text-slate-300" aria-hidden>
                          <span className="h-4 w-4" />
                        </span>
                      )}
                    </TableTd>
                    <TableTd className={canEdit ? 'font-medium text-slate-900' : 'font-medium text-slate-900 pr-4'}>
                      {row.nombre}
                    </TableTd>
                    {tab === 'pruebas_laboratorio' ? (
                      <TableTd className="text-slate-600">{row.categoria || '—'}</TableTd>
                    ) : null}
                    {canEdit ? (
                      <TableTd className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            className="text-sm"
                            disabled={mutation.isPending}
                            onClick={() => setEditSimple({ ...row })}
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="text-sm text-red-700 hover:text-red-800"
                            disabled={row.sistema || mutation.isPending}
                            onClick={() => handleDeleteSimple(row)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </TableTd>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {tab === 'formatos_documento' && (
            <Table plain>
              <TableHead>
                <TableRow header>
                  <TableTh className="w-12"> </TableTh>
                  <TableTh>Nombre</TableTh>
                  {canEdit ? <TableTh className="w-48 text-right">Acciones</TableTh> : null}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.formatos_documento.map((row) => (
                  <TableRow key={row.id}>
                    <TableTd className="align-middle">
                      {!canEdit ? (
                        <span title="Solo lectura" className="inline-flex text-slate-400">
                          <IconLockClosed className="h-4 w-4" />
                        </span>
                      ) : row.sistema ? (
                        <span title="Plantilla del sistema: no se puede eliminar" className="inline-flex text-amber-600">
                          <IconLockClosed className="h-4 w-4" />
                        </span>
                      ) : (
                        <span className="inline-flex text-slate-300" aria-hidden>
                          <span className="h-4 w-4" />
                        </span>
                      )}
                    </TableTd>
                    <TableTd className={canEdit ? 'font-medium text-slate-900' : 'font-medium text-slate-900 pr-4'}>
                      {row.nombre}
                    </TableTd>
                    {canEdit ? (
                      <TableTd className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            className="text-sm"
                            disabled={mutation.isPending}
                            onClick={() => setEditFormato({ ...row })}
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="text-sm text-red-700 hover:text-red-800"
                            disabled={row.sistema || mutation.isPending}
                            onClick={() => handleDeleteFormato(row)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </TableTd>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      <Modal
        open={editSimple != null}
        title="Editar nombre"
        onClose={() => setEditSimple(null)}
        size="md"
      >
        {editSimple && (
          <div className="space-y-4">
            <Input
              label="Nombre"
              value={editSimple.nombre}
              onChange={(e) => setEditSimple({ ...editSimple, nombre: e.target.value })}
            />
            {tab === 'pruebas_laboratorio' ? (
              <Input
                label="Categoría / agrupación"
                value={editSimple.categoria ?? ''}
                onChange={(e) => setEditSimple({ ...editSimple, categoria: e.target.value })}
              />
            ) : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditSimple(null)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleSaveSimple} loading={mutation.isPending}>
                Guardar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={editFormato != null}
        title="Editar formato de documento"
        onClose={() => setEditFormato(null)}
        size="xl"
      >
        {editFormato && (
          <div className="space-y-4">
            <Input
              label="Nombre"
              value={editFormato.nombre}
              onChange={(e) => setEditFormato({ ...editFormato, nombre: e.target.value })}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Formato</label>
              <RichTextEditor
                value={editFormato.contenido_html}
                onChange={(html) => setEditFormato({ ...editFormato, contenido_html: html })}
                placeholder="Contenido del formato..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditFormato(null)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleSaveFormato} loading={mutation.isPending}>
                Guardar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={openCreateSimple} title="Registrar ítem" onClose={() => setOpenCreateSimple(false)} size="md">
        <div className="space-y-4">
          <Input
            label="Nombre"
            value={createSimple.nombre}
            onChange={(e) => setCreateSimple((s) => ({ ...s, nombre: e.target.value }))}
            placeholder={tab === 'pruebas_laboratorio' ? 'Ej. Perfil hepático' : 'Nombre del ítem'}
          />
          {tab === 'pruebas_laboratorio' ? (
            <Input
              label="Categoría / agrupación"
              value={createSimple.categoria}
              onChange={(e) => setCreateSimple((s) => ({ ...s, categoria: e.target.value }))}
              placeholder="Ej. Química sanguínea"
            />
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpenCreateSimple(false)}>
              Cerrar
            </Button>
            <Button type="button" onClick={handleConfirmCreateSimple} loading={mutation.isPending}>
              Guardar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={openCreateFormato} title="Registro de formato de documento" onClose={() => setOpenCreateFormato(false)} size="xl">
        <div className="space-y-4">
          <Input
            label="Nombre"
            value={createFormato.nombre}
            onChange={(e) => setCreateFormato((s) => ({ ...s, nombre: e.target.value }))}
            placeholder="Ej. Consentimiento guardería"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Formato</label>
            <RichTextEditor
              value={createFormato.contenido_html}
              onChange={(html) => setCreateFormato((s) => ({ ...s, contenido_html: html }))}
              placeholder="Escribe el contenido del formato..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpenCreateFormato(false)}>
              Cerrar
            </Button>
            <Button type="button" onClick={handleConfirmCreateFormato} loading={mutation.isPending}>
              Guardar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
