import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useMisPermisosAdmin, usePatchUsuario, useUsuarioDetalle } from './hooks/useUsuarios'
import { fetchPerfilesAdminEmpresa } from './api'
import { ESPECIALIDADES_VETERINARIAS, SERVICIOS_AGENDA_OPCIONES } from './usuarioCatalog'
import { PageHeader } from '../../shared/ui/PageHeader'
import { SettingsPanel } from '../../shared/ui/SettingsPanel'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Alert } from '../../shared/ui/Alert'
import { Switch } from '../../shared/ui/Switch'
import { toast } from '../../core/toast-store'
import { ROLES, ROL_DESCRIPTIONS, ROL_LABELS, type RolId } from '../../core/constants'
import { ApiError } from '../../api/errors'
import { resetUsuarioPassword } from './api'
import type { UsuarioExtendido } from '../../api/types'

type TabId = 'personal' | 'rol' | 'profesional' | 'password' | 'preferencias'

function initials(nombre: string) {
  const p = nombre.trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return '?'
  if (p.length === 1) return p[0]!.slice(0, 2).toUpperCase()
  return (p[0]![0] + p[p.length - 1]![0]).toUpperCase()
}

function SearchableMulti({
  label,
  options,
  values,
  onChange,
  hint,
  disabled,
}: {
  label: string
  options: { value: string; label: string }[]
  values: string[]
  onChange: (v: string[]) => void
  hint?: string
  disabled?: boolean
}) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return options
    return options.filter((o) => o.label.toLowerCase().includes(s) || o.value.includes(s))
  }, [options, q])
  function toggle(val: string) {
    if (values.includes(val)) onChange(values.filter((x) => x !== val))
    else onChange([...values, val])
  }
  function selectAll() {
    onChange(filtered.map((o) => o.value))
  }
  function clearAll() {
    onChange([])
  }
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar…"
        disabled={disabled}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:bg-slate-50"
      />
      <div className="flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          className="font-medium text-primary-600 hover:text-primary-800 disabled:opacity-50"
          onClick={selectAll}
          disabled={disabled || filtered.length === 0}
        >
          Seleccionar visibles
        </button>
        <span className="text-slate-300">|</span>
        <button
          type="button"
          className="font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
          onClick={clearAll}
          disabled={disabled}
        >
          Desmarcar todos
        </button>
      </div>
      <div
        className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2"
        role="group"
        aria-label={label}
      >
        {filtered.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white"
          >
            <input
              type="checkbox"
              checked={values.includes(o.value)}
              onChange={() => toggle(o.value)}
              disabled={disabled}
              className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-slate-800">{o.label}</span>
          </label>
        ))}
      </div>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}

const defaultExtendido = (): UsuarioExtendido => ({
  preferencias: { notif_email_cuenta: true, agenda_color_evento: null },
  operativo: {
    acceso_consultorio: true,
    hospitalizacion_ambulatorio: true,
    info_tutores_completa: true,
    admin_agenda: false,
    admin_disponibilidad: false,
    agenda_personal: true,
    servicios_relacionados: [],
  },
  profesional: {
    especialidades: [],
    tarjeta_numero: '',
    tarjeta_adjunto_url: null,
    firma_url: null,
  },
})

export function UsuarioEditPage() {
  const { id: idParam } = useParams()
  const id = Number(idParam)
  const navigate = useNavigate()
  const { data, isLoading, isError } = useUsuarioDetalle(Number.isFinite(id) ? id : undefined)
  const { data: permisosAdmin } = useMisPermisosAdmin()
  const patchMutation = usePatchUsuario()
  const canEdit = permisosAdmin?.admin_gestion_usuarios === true

  const { data: perfilesAdmin } = useQuery({
    queryKey: ['usuarios', 'perfiles-admin'],
    queryFn: fetchPerfilesAdminEmpresa,
  })

  const [tab, setTab] = useState<TabId>('personal')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [documento, setDocumento] = useState('')
  const [telefono, setTelefono] = useState('')
  const [rolId, setRolId] = useState<RolId>(ROLES.RECEPCION)
  const [perfilAdminId, setPerfilAdminId] = useState<number | ''>('')
  const [ext, setExt] = useState<UsuarioExtendido>(defaultExtendido)
  const [pwd1, setPwd1] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [pwdBusy, setPwdBusy] = useState(false)

  useEffect(() => {
    if (!data) return
    setNombre(data.nombre)
    setEmail(data.email)
    setDocumento(data.documento ?? '')
    setTelefono(data.telefono ?? '')
    setRolId(data.rol_id as RolId)
    setPerfilAdminId(data.perfil_admin_id != null ? data.perfil_admin_id : '')
    setExt({
      preferencias: { ...defaultExtendido().preferencias, ...data.extendido.preferencias },
      operativo: { ...defaultExtendido().operativo, ...data.extendido.operativo },
      profesional: { ...defaultExtendido().profesional, ...data.extendido.profesional },
    })
  }, [data])

  const tabs: { id: TabId; label: string }[] = [
    { id: 'personal', label: 'Información personal' },
    { id: 'rol', label: 'Rol y privilegios' },
    { id: 'profesional', label: 'Información profesional' },
    { id: 'password', label: 'Contraseña' },
    { id: 'preferencias', label: 'Preferencias' },
  ]

  async function handleSave() {
    if (!canEdit || !Number.isFinite(id)) return
    try {
      await patchMutation.mutateAsync({
        id,
        payload: {
          nombre: nombre.trim(),
          email: email.trim(),
          documento: documento.trim() || null,
          telefono: telefono.trim() || null,
          rol_id: rolId,
          perfil_admin_id: rolId === ROLES.ADMIN ? (perfilAdminId === '' ? null : perfilAdminId) : null,
          extendido: {
            preferencias: { ...ext.preferencias },
            operativo: { ...ext.operativo },
            profesional: { ...ext.profesional },
          },
        },
      })
      toast.success('Cambios guardados')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'No se pudo guardar')
    }
  }

  async function handlePasswordUpdate() {
    if (!canEdit || !Number.isFinite(id)) return
    if (pwd1.length < 8) {
      toast.warning('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (pwd1 !== pwd2) {
      toast.warning('Las contraseñas no coinciden.')
      return
    }
    setPwdBusy(true)
    try {
      await resetUsuarioPassword(id, pwd1)
      toast.success('Contraseña actualizada')
      setPwd1('')
      setPwd2('')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error al actualizar la contraseña')
    } finally {
      setPwdBusy(false)
    }
  }

  function setOperativo<K extends keyof UsuarioExtendido['operativo']>(key: K, v: UsuarioExtendido['operativo'][K]) {
    setExt((prev) => ({ ...prev, operativo: { ...prev.operativo, [key]: v } }))
  }

  if (!Number.isFinite(id)) {
    return (
      <div className="mx-auto max-w-3xl pb-8">
        <Alert variant="error">Identificador de usuario no válido.</Alert>
        <Link to="/usuarios" className="mt-4 inline-block text-primary-600">
          Volver al listado
        </Link>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl pb-8">
        <PageHeader breadcrumbs={[{ label: 'Usuarios', to: '/usuarios' }, { label: 'Error' }]} title="Usuario" />
        <Alert variant="error">No se pudo cargar el usuario.</Alert>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-4xl pb-8">
        <p className="text-slate-500">Cargando…</p>
      </div>
    )
  }

  const isAdminRol = rolId === ROLES.ADMIN
  const serviciosLabel =
    ext.operativo.servicios_relacionados.length === 0
      ? 'Sin restricción (vacío = todos los servicios)'
      : `${ext.operativo.servicios_relacionados.length} seleccionados`

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      <PageHeader
        breadcrumbs={[{ label: 'Usuarios', to: '/usuarios' }, { label: data.nombre }]}
        title={`Configuración de usuario: ${data.nombre}`}
        subtitle="Edición"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate('/usuarios')}>
              Atrás
            </Button>
            <Button type="button" onClick={handleSave} disabled={!canEdit || patchMutation.isPending}>
              {patchMutation.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        }
      />

      {!canEdit ? (
        <Alert variant="warning">
          No tienes permiso para editar usuarios. Solo puedes revisar la ficha.
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-px">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`
              rounded-t-lg px-3 py-2 text-sm font-medium transition-colors
              ${tab === t.id
                ? 'border border-b-0 border-slate-200 bg-white text-primary-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }
            `}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'personal' && (
        <SettingsPanel title="Información personal" kicker="Perfil">
          <div className="space-y-6 max-w-2xl">
            <div className="flex items-center gap-4">
              <div
                className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary-100 text-lg font-semibold text-primary-800"
                aria-hidden
              >
                {initials(nombre || data.nombre)}
              </div>
              <p className="text-sm text-slate-600">
                Avatar opcional: en una próxima versión podrás subir imagen; por ahora se muestran las iniciales.
              </p>
            </div>
            <Input
              label="Documento"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              placeholder="Número de identificación"
              disabled={!canEdit}
            />
            <Input label="Nombres y apellidos" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={!canEdit} />
            <Input type="email" label="Correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!canEdit} />
            <p className="-mt-2 text-xs text-slate-500">
              Email de contacto y para recuperación de cuenta. Se guarda con «Guardar» arriba.
            </p>
            <Input
              label="Móvil / WhatsApp"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+57 …"
              disabled={!canEdit}
            />
            <div>
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Firma (URL)</span>
              <Input
                value={ext.profesional.firma_url ?? ''}
                onChange={(e) =>
                  setExt((p) => ({
                    ...p,
                    profesional: {
                      ...p.profesional,
                      firma_url: e.target.value.trim() || null,
                    },
                  }))
                }
                placeholder="https://… (imagen PNG con fondo transparente recomendado)"
                disabled={!canEdit}
              />
              <p className="mt-1 text-xs text-slate-500">Para impresiones; sugerido ~230×80 px, fondo transparente.</p>
            </div>
          </div>
        </SettingsPanel>
      )}

      {tab === 'rol' && (
        <div className="space-y-6">
          <SettingsPanel title="Perfil del usuario" kicker="Rol">
            <Alert variant="error" className="mb-4 border-red-200 bg-red-50/80 text-red-900">
              Se recomienda tener al menos un administrador activo. Cualquier administrador con permiso de usuarios
              puede crear o editar cuentas.
            </Alert>
            <div className="max-w-xl space-y-2">
              <label htmlFor="rol-usuario" className="block text-sm font-medium text-slate-700">
                Rol
              </label>
              <select
                id="rol-usuario"
                value={rolId}
                onChange={(e) => {
                  const r = Number(e.target.value) as RolId
                  setRolId(r)
                  if (r !== ROLES.ADMIN) setPerfilAdminId('')
                }}
                disabled={!canEdit}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
              >
                <option value={ROLES.ADMIN}>{ROL_LABELS[ROLES.ADMIN]}</option>
                <option value={ROLES.VETERINARIO}>{ROL_LABELS[ROLES.VETERINARIO]}</option>
                <option value={ROLES.RECEPCION}>{ROL_LABELS[ROLES.RECEPCION]}</option>
              </select>
              <p className="text-sm text-slate-600">{ROL_DESCRIPTIONS[rolId as keyof typeof ROL_DESCRIPTIONS] ?? ''}</p>
              <p className="text-xs text-slate-500">El rol determina el alcance general en el panel (rutas y permisos base).</p>
            </div>
            {isAdminRol ? (
              <div className="mt-6 max-w-xl">
                <label htmlFor="perfil-admin-ed" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Perfil de permisos admin
                </label>
                <select
                  id="perfil-admin-ed"
                  value={perfilAdminId === '' ? '' : String(perfilAdminId)}
                  onChange={(e) => setPerfilAdminId(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={!canEdit}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 disabled:bg-slate-50"
                >
                  <option value="">Plantilla por defecto de la empresa</option>
                  {(perfilesAdmin ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.slug})
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </SettingsPanel>

          {isAdminRol ? (
            <Alert variant="info" className="border-primary-200 bg-primary-50/80 text-primary-950">
              Como <strong>administrador</strong>, el sistema no aplica estos interruptores a tu sesión (acceso pleno).
              Igual puedes definirlos para otros usuarios o para si este usuario deja de ser admin.
            </Alert>
          ) : null}

          <SettingsPanel
            title="Privilegios generales"
            description="Acceso a consultorio, hospitalización/ambulatorio (cuando exista el módulo) y datos de tutores."
            kicker="Privilegios"
          >
            <div className="space-y-4 max-w-3xl">
              {(
                [
                  ['acceso_consultorio', 'Acceso al consultorio', 'Buscar tutores/mascotas y acceder a la historia clínica.'],
                  ['hospitalizacion_ambulatorio', 'Hospitalización / ambulatorio', 'Acceso al flujo de internación y seguimiento (Kardex u homólogo).'],
                  ['info_tutores_completa', 'Información de tutores', 'Ver y editar datos completos de clientes (ficha, altas/bajas).'],
                ] as const
              ).map(([key, title, desc]) => (
                <div
                  key={key}
                  className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{title}</p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                  <Switch
                    checked={ext.operativo[key]}
                    onChange={(v) => setOperativo(key, v)}
                    disabled={!canEdit}
                    aria-label={title}
                  />
                </div>
              ))}
            </div>
          </SettingsPanel>

          <SettingsPanel
            title="Privilegios de agenda"
            description="Quién gestiona la agenda global, disponibilidad de otros profesionales y restricción por tipo de servicio."
            kicker="Agenda"
          >
            <div className="space-y-4 max-w-3xl">
              {(
                [
                  ['admin_agenda', 'Administrador de agenda', 'Gestionar la agenda de toda la clínica, no solo eventos propios.'],
                  ['admin_disponibilidad', 'Administrador de disponibilidad', 'Consultar disponibilidad de cualquier veterinario en la agenda.'],
                  ['agenda_personal', 'Agenda personal', 'Puede asignarse como responsable en citas y ver su columna en la agenda.'],
                ] as const
              ).map(([key, title, desc]) => (
                <div
                  key={key}
                  className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{title}</p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                  <Switch
                    checked={ext.operativo[key]}
                    onChange={(v) => setOperativo(key, v)}
                    disabled={!canEdit}
                    aria-label={title}
                  />
                </div>
              ))}
              <div className="pt-2">
                <SearchableMulti
                  label="Servicios relacionados (restricción)"
                  options={SERVICIOS_AGENDA_OPCIONES}
                  values={ext.operativo.servicios_relacionados}
                  onChange={(v) => setOperativo('servicios_relacionados', v)}
                  disabled={!canEdit}
                  hint={serviciosLabel}
                />
              </div>
            </div>
          </SettingsPanel>
        </div>
      )}

      {tab === 'profesional' && (
        <SettingsPanel title="Información profesional (si aplica)" kicker="Profesional">
          <div className="max-w-2xl space-y-6">
            <SearchableMulti
              label="Especialidades"
              options={ESPECIALIDADES_VETERINARIAS}
              values={ext.profesional.especialidades}
              onChange={(v) => setExt((p) => ({ ...p, profesional: { ...p.profesional, especialidades: v } }))}
              disabled={!canEdit}
              hint="Si aplica, seleccione una o varias."
            />
            <Input
              label="Nº tarjeta profesional"
              value={ext.profesional.tarjeta_numero}
              onChange={(e) =>
                setExt((p) => ({ ...p, profesional: { ...p.profesional, tarjeta_numero: e.target.value } }))
              }
              disabled={!canEdit}
            />
            <div>
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Tarjeta profesional (URL de archivo)</span>
              <Input
                value={ext.profesional.tarjeta_adjunto_url ?? ''}
                onChange={(e) =>
                  setExt((p) => ({
                    ...p,
                    profesional: {
                      ...p.profesional,
                      tarjeta_adjunto_url: e.target.value.trim() || null,
                    },
                  }))
                }
                placeholder="https://…"
                disabled={!canEdit}
              />
            </div>
          </div>
        </SettingsPanel>
      )}

      {tab === 'password' && (
        <SettingsPanel title="Actualizar la contraseña" kicker="Seguridad">
          <div className="max-w-md space-y-4">
            <Input
              type="password"
              label="Nueva contraseña"
              value={pwd1}
              onChange={(e) => setPwd1(e.target.value)}
              placeholder="Nueva contraseña"
              disabled={!canEdit || pwdBusy}
            />
            <p className="-mt-2 text-xs text-slate-500">Usa el botón de abajo; no se guarda con «Guardar» del encabezado.</p>
            <Input
              type="password"
              label="Confirme la contraseña"
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              placeholder="Confirme la contraseña"
              disabled={!canEdit || pwdBusy}
            />
            <Button type="button" onClick={handlePasswordUpdate} disabled={!canEdit || pwdBusy}>
              {pwdBusy ? 'Actualizando…' : 'Actualizar contraseña'}
            </Button>
          </div>
        </SettingsPanel>
      )}

      {tab === 'preferencias' && (
        <SettingsPanel title="Preferencias" kicker="Cuenta">
          <div className="max-w-xl space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">Notificaciones por email (actividad de cuenta)</p>
                <p className="text-xs text-slate-500">Preferencia almacenada; el envío real depende de la configuración del sistema.</p>
              </div>
              <Switch
                checked={ext.preferencias.notif_email_cuenta}
                onChange={(v) => setExt((p) => ({ ...p, preferencias: { ...p.preferencias, notif_email_cuenta: v } }))}
                disabled={!canEdit}
                aria-label="Notificaciones por email"
              />
            </div>
            <div>
              <label htmlFor="color-agenda" className="mb-1.5 block text-sm font-medium text-slate-700">
                Color de eventos en agenda
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  id="color-agenda"
                  type="color"
                  value={ext.preferencias.agenda_color_evento || '#e2e8f0'}
                  onChange={(e) =>
                    setExt((p) => ({
                      ...p,
                      preferencias: { ...p.preferencias, agenda_color_evento: e.target.value },
                    }))
                  }
                  disabled={!canEdit}
                  className="h-10 w-14 cursor-pointer rounded border border-slate-300 bg-white disabled:opacity-50"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="text-xs"
                  disabled={!canEdit}
                  onClick={() =>
                    setExt((p) => ({
                      ...p,
                      preferencias: { ...p.preferencias, agenda_color_evento: null },
                    }))
                  }
                >
                  Sin definir
                </Button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {ext.preferencias.agenda_color_evento ? 'Color guardado al pulsar «Guardar».' : 'Sin definir: la agenda usará colores por defecto.'}
              </p>
            </div>
          </div>
        </SettingsPanel>
      )}
    </div>
  )
}
