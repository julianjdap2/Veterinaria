# Checklist de producto (Vet System)

Seguimiento de funcionalidad y plan de mejoras. Actualizado: 2026-03.

## A. Multiempresa y superadmin

| Ítem | Estado |
|------|--------|
| CRUD empresas (superadmin) | Hecho |
| Estado empresa (activa / suspendida / en prueba) | Hecho |
| Config por empresa (`empresa_configuraciones`) + flags módulos/features | Hecho |
| Permisos granulares admin por empresa (`empresa_admin_permisos`) | Hecho |
| Pantalla superadmin **Empresas** + permisos + config módulos | Hecho |
| Pantalla superadmin **Planes** (`/superadmin/planes`) | Hecho |
| Plataforma: permisos configurables “avanzados” (matriz extendida, perfiles admin por empresa) | **Hecho** (plantilla + 2 permisos extra + perfiles + `perfil_admin_id` en usuario) |
| Plataforma: roles custom completos (no solo admin) | Pendiente / evolutivo |

## B. Admin empresa y usuarios

| Ítem | Estado |
|------|--------|
| Listado de usuarios (todos los admins) | Hecho |
| Alta / baja (activo) / reset contraseña | Hecho; acciones condicionadas a `admin_gestion_usuarios` en UI |
| API `GET /usuarios/mi-permisos-admin` para UI | Hecho |
| Auditoría de cambios sensibles | En evolución |

## C. Plan de flujos (`PLAN_FLUJOS_Y_MEJORAS.md`)

| Fase | Ítem | Estado |
|------|------|--------|
| 1.1 | Acciones rápidas cita (confirmar / atender / cancelar) | Hecho (revisar detalle cita / flujos) |
| 1.2 | Asignar veterinario en crear/editar cita | Hecho |
| 1.3 | `cita_id` en consulta + crear desde cita | Hecho |
| 1.4 | Motivos predefinidos | Hecho |
| 2.x | Resumen, PDF, email | Hecho (backend + UI principal) |
| 3.x | Inventario y ventas | Hecho (MVP) |
| 4.1–4.2 | Agenda por día / calendario | Hecho (vista día + tabla) |
| 4.3 | Colores / iconos por estado en agenda | Hecho (tabla + tarjetas por slot día) |

## D. Deuda técnica frecuente

- `npm run build` / `tsc`: **OK** (2026-03) — `Button` con `size="sm"`, limpieza `CitaDetailPage` / `ConsultaCreatePage`, guard de `productId` en `ProductoEditPage`.
- **Planes y límites comerciales:** ver [`PLANES_Y_LIMITES.md`](PLANES_Y_LIMITES.md) (tiers sugeridos + qué está enforce en código).

---

## E. Módulos — backlog / pendientes reales

| Área | Pendiente | Notas |
|------|-----------|--------|
| **Plan / cuotas** | Validar `max_mascotas` al crear/reactivar mascota | **Hecho** (`plan_quotas` + `mascota_service`; solo **activas**). |
| **Plan / cuotas** | Validar `max_citas_mes` al crear/reprogramar cita | **Hecho** (`plan_quotas` + `cita_service`; mes calendario de `fecha`; **timezone empresa** pendiente si se requiere). |
| **Plan** | Uso consistente de `modulo_agenda` en endpoints de citas | Evitar divergencia plan vs solo flags inventario/ventas/reportes. |
| **Facturación** | Módulo según país (DIAN, SAT, etc.) | Flag `modulo_facturacion_electronica` + `empresa_config`; integración pendiente. |
| **Marketing / WhatsApp** | `modulo_marketing` / `modulo_whatsapp` | WhatsApp parcial en recordatorios; marketing como módulo UI pendiente. |
| **Recordatorios** | SMS / canal adicional | Comentario en código; dependería de flag y proveedor. |
| **Dashboard** | `feature_dashboard_avanzado` / exportaciones | Parte en UI; alinear 100% con flags y permisos admin exportación. |
| **Auditoría** | Cobertura de eventos sensibles | Middleware/modelo en evolución. |
| **Plataforma** | Roles custom (vet/recep con matriz) | Ver fila A: evolutivo. |
| **Calidad** | Tests e2e (login → cita → venta) | No iniciado en repo. |
| **Docs** | Actualizar `FLUJO-ATENCION-VETERINARIO.md` | Asignación de veterinario en flujo actual difiere del doc histórico. |
| **UX config operativa** | Editor visual de tipos de servicio (sin JSON para usuario final) | **Pendiente grande** — ver [`CHECKLIST_MEJORAS_OPERATIVAS.md`](CHECKLIST_MEJORAS_OPERATIVAS.md). |

---

**Próximos candidatos (orden sugerido):** (1) `modulo_agenda` homogéneo en API, (2) facturación según país MVP, (3) tests e2e críticos, (4) roles custom.

**Checklist detallado (mejoras cliente / agenda / ventas / parametrización):** [`CHECKLIST_MEJORAS_OPERATIVAS.md`](CHECKLIST_MEJORAS_OPERATIVAS.md).
