# Planes comerciales y límites (Vet System)

Documento orientado a **producto y comercialización**, alineado con el modelo actual (`planes`, `empresa_configuraciones`) y con el comportamiento real del código.

**Última revisión:** 2026-03.

---

## 1. Dónde viven los datos

| Origen | Tabla / uso |
|--------|-------------|
| **Plan SaaS** | `planes`: precio, límites numéricos, flags de módulos del plan, soporte. |
| **Override por empresa** | `empresa_configuraciones`: mismos flags que el superadmin edita en UI (inventario, ventas, reportes, facturación electrónica, recordatorios, dashboard avanzado, exportaciones). Si existe fila, **tiene prioridad** sobre el plan (`require_feature`). |
| **Empresa → plan** | `empresas.plan_id` |

---

## 2. Campos del plan (`planes`)

| Campo | Significado |
|-------|-------------|
| `nombre`, `codigo` | Ej. `STANDARD`, `PRO`, `VIP` (el código es el identificador estable). |
| `precio` | Precio de referencia (moneda según negocio; no hay multi-moneda en modelo). |
| `max_usuarios` | Tope de usuarios; **`null` = sin límite**. |
| `max_mascotas` | Tope de mascotas (activas o total según definas al implementar); **`null` = sin límite**. |
| `max_citas_mes` | Tope de citas **con `fecha` en un mismo mes calendario** (no canceladas); **`null` = sin límite**. |
| `modulo_agenda` | En modelo; uso futuro homogéneo con otros flags (hoy la agenda no suele cortarse solo por este campo en API). |
| `modulo_inventario`, `modulo_ventas`, `modulo_reportes`, `modulo_facturacion_electronica` | Incluidos en API de superadmin / plan; **enforce** vía `require_feature` para inventario, ventas y dashboard (reportes). |
| `modulo_marketing`, `modulo_whatsapp` | Plan; **WhatsApp** se considera en lógica de recordatorios; marketing avanzado pendiente de módulo propio. |
| `feature_recordatorios_automaticos`, `feature_dashboard_avanzado`, `feature_exportaciones` | Plan + override empresa. |
| `soporte_nivel` | `basico` / `premium` (contractual, no enforcement automático en código). |

---

## 3. Propuesta de tiers (referencia mercado SMB veterinario)

Valores **orientativos**; el superadmin los ajusta en **Planes** o por migración/seed.

| Código | Enfoque | Usuarios | Mascotas | Citas/mes | Módulos base | Extras típicos |
|--------|---------|----------|----------|-----------|--------------|----------------|
| **STANDARD** | Clínica pequeña, una sede | 3–5 | 500–2000 | 300–800 | Agenda, consultas, clientes/mascotas, inventario básico, ventas | Reportes básicos, recordatorios email |
| **PRO** | Operación media, más reporting | 8–15 | ilimitado* | 1500–4000 | + dashboard avanzado, exportaciones CSV | Facturación electrónica (cuando exista integración país) |
| **VIP / ENTERPRISE** | Multi-sede futuro / SLA | negociado | negociado | negociado | todo lo anterior | WhatsApp, marketing, soporte `premium` |

\*En BD: `null` en límites = sin tope hasta que implementes políticas.

**Precios:** definirlos por moneda local y bundle (mensual/anual); el campo `precio` es un número de referencia por plan.

---

## 4. Qué está **enforce** hoy en backend

| Regla | Estado |
|-------|--------|
| Máximo **usuarios** al crear usuario | ✅ `usuario_service` vs `plan.max_usuarios` |
| **Inventario / ventas / dashboard (reportes)** por flag | ✅ `require_feature`: prioridad `empresa_configuraciones`, si no hay fila → `planes` |
| **Permisos admin** granulares + perfiles | ✅ `empresa_admin_permisos`, `empresa_perfiles_admin`, `usuarios.perfil_admin_id` |
| Máximo **mascotas** | ✅ `mascota_service`: altas activas y reactivación vs `plan.max_mascotas` (cuenta **mascotas activas**) |
| Máximo **citas / mes** | ✅ `cita_service`: crear cita y reprogramar a **otro mes** vs `plan.max_citas_mes` (citas no canceladas por mes de `fecha`) |
| `modulo_agenda` único como kill-switch | ⚠️ No homogeneizado en todos los endpoints de citas |
| Facturación electrónica | ⚠️ Flag existe; **módulo funcional por país pendiente** |

---

## 5. Relación plan ↔ pantalla superadmin

- **Superadmin → Planes:** edita filas de `planes` (límites y flags del plan).
- **Superadmin → Empresas → Feature flags:** edita `empresa_configuraciones` (override por clínica).

Convención: para una **nueva empresa**, si tienes seed o creación automática de `empresa_configuraciones`, copiar defaults del plan o dejar que `require_feature` haga fallback al plan cuando no hay fila.

---

## 6. Referencias en código

- Modelo: `backend/app/models/plan.py`
- Feature flags: `backend/app/security/feature_flags.py`
- Límite usuarios: `backend/app/services/usuario_service.py` (`plan_user_limit_reached`)
- Límite mascotas / citas-mes: `backend/app/services/plan_quotas.py` (`plan_pet_limit_reached`, `plan_cita_month_limit_reached`)

---

## 7. Próximos pasos de producto (resumen)

Ver **`docs/CHECKLIST_PRODUCTO.md` → sección E (módulos / backlog)** para la lista viva de pendientes por módulo.
