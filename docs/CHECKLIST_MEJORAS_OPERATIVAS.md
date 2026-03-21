# Checklist mejoras operativas — estado y recomendaciones

Documento de seguimiento frente a la lista de producto compartida. **Última revisión:** 2026-03.

---

## Pendiente grande (prioridad UX)

### Configuración operativa — tipos de servicio y numeración de ventas

**Situación actual:** los tipos de servicio (Consulta, Vacunación, Peluquería, etc.) se editan como **JSON en texto** en `/configuracion-operativa`. Funciona para desarrollo y migraciones, pero **no es práctico** para personal de clínica sin formación técnica.

**Pendiente:** sustituir o complementar con una **UI guiada**:
- Tabla/listado editable: nombre visible, `id` (slug) generado o validado, duración, toggles urgente/recurrente, categoría.
- Botones “Añadir tipo”, “Duplicar”, “Restaurar valores por defecto”.
- Validación en cliente y servidor sin exponer JSON crudo (o solo en “Avanzado” colapsado).

**Estimación:** trabajo mediano-grande (front + posible endpoint dedicado para CRUD de tipos sin editar el JSON a mano).

---

## Estado por ítem del checklist

Leyenda: **Hecho** | **Parcial** | **Pendiente**

### Módulo Clientes
| Requisito | Estado | Notas |
|-----------|--------|--------|
| Un solo filtro (documento **o** nombre) | **Hecho** | API `busqueda` + UI unificada. |

### Módulo Mascotas
| Requisito | Estado | Notas |
|-----------|--------|--------|
| Un solo filtro (cliente **o** nombre mascota) | **Hecho** | Backend `busqueda` con OR (nombre mascota, nombre cliente, documento). Placeholder UI alineado. |

### Módulo Inventario
| Requisito | Estado | Notas |
|-----------|--------|--------|
| Alineado con otros módulos (buscador único + filtros) | **Parcial** | Ya hay `search` + categoría; barra con scroll horizontal en pantallas chicas. Falta pulir copy (“un solo buscador”) y, si se desea, stock bajo como chip opcional. |

### Módulo Auditoría
| Requisito | Estado | Notas |
|-----------|--------|--------|
| Filtros en fila horizontal | **Hecho** | |

### Módulo Citas
| Requisito | Estado | Notas |
|-----------|--------|--------|
| Columna “Asignada” = nombre del veterinario | **Hecho** | `veterinario_nombre` en API. |
| Nueva cita: fecha por defecto hoy | **Hecho** | |
| Nueva cita: Peluquería, Baño, etc. | **Parcial** | Tipos vienen de **config por empresa** (JSON). Contenido parametrizable; **edición poco usable** → ver *Pendiente grande*. |
| Urgente / Recurrente solo según tipo de servicio | **Hecho** | Flags `allow_urgente` / `allow_recurrente` por tipo en config. |
| Rediseño agenda: quitar Desde / Hasta / Estado confusos | **Parcial** | Estado pasó a **chips** + atajos “Esta semana” / “Limpiar fechas”; **Desde/Hasta siguen** en vista lista. Falte rediseño completo al nivel que pides. |
| Quitar bloque “Lista de espera” bajo el calendario | **Parcial** | Está en **`<details>` colapsado**, no eliminado. Pendiente **eliminar** o mover a ruta aparte si confirmas. |
| “Ver citas”: filtros y redundancia con listado principal | **Parcial** | Sigue siendo panel aparte (disponibilidad + slots). **Recomendación:** mantener **solo** como **vista de disponibilidad** (renombrar a “Disponibilidad” / “Huecos libres”), sin duplicar tabla de citas; la tabla única queda en la agenda principal. |
| Clic en mascota → ficha; cliente con **nombre**; volver a **citas** si vino de agenda | **Hecho** | `state.from`, nombre de cliente cargado, enlace contextual. |
| Nueva consulta: medicamento por **búsqueda** | **Hecho** | Autocompletar con debounce. |
| Historial citas: “Ver” no editable si ya pasó | **Hecho** | UI + API `403` (`cita_readonly`). |

### Módulo Ventas
| Requisito | Estado | Notas |
|-----------|--------|--------|
| Botones de acción más modernos | **Hecho** | Ghost/iconos; evolución posible con icon set único. |
| Detalle en **modal** | **Hecho** | |
| Detalle con cliente y mascota | **Hecho** | Endpoint detalle ampliado + modal. |
| Volver a la vista de origen | **Hecho** | Patrón `location.state` documentado en README. |
| Cambio vs devolución (redundancia) | **Hecho** | Un flujo **CYD** en modal → POS. |
| Consecutivo / prefijo por empresa | **Hecho** | Config en empresa + `codigo_interno` en venta. |
| Venta por consulta: propietario por **búsqueda** | **Pendiente** | Sigue **lista** de clientes (`page_size: 500`). Falta mismo patrón que Clientes (buscar con debounce). |
| Venta por consulta: fórmula + **añadir más artículos** | **Pendiente** | Hoy solo checklist de fórmula; falta carrito extra (productos adicionales). |

### Parametrización y SuperAdmin
| Requisito | Estado | Notas |
|-----------|--------|--------|
| Nada “quemado”; panel SuperAdmin | **Parcial** | Mucho vive en `empresa_configuraciones` y APIs; **Superadmin UI** ya toca config empresa/planes, pero **no hay pantalla rica** para tipos de servicio, notificaciones ni ventas como para admin clínica. |
| Cron / plantillas / correo parametrizable | **Hecho** (base) | `/configuracion-notificaciones` + `notificaciones_json`; cron respeta modos y plantillas. **SMTP solo global** en `.env`; **SMTP por clínica** sigue pendiente (secretos cifrados). |

---

## Recomendación: qué parametriza Superadmin vs admin de la veterinaria

| Parámetro | Superadmin plataforma | Admin clínica | Comentario |
|-----------|----------------------|---------------|------------|
| Plan, límites (`max_*`, módulos del plan) | **Sí** | No (solo lectura o ticket) | Ya alineado con `planes` + overrides en empresa. |
| Flags módulos (inventario, ventas, recordatorios…) | **Sí** (override) | Ver según permiso | `empresa_configuraciones` + permisos admin. |
| **Tipos de servicio de agenda** | Plantilla/seeding al crear empresa | **Sí** (edición día a día) | Ideal: UI tabla, no JSON; superadmin solo **plantilla inicial**. |
| **Prefijo y consecutivo venta interna** | Ver / soporte / reset extremo | **Sí** | Ya configurable vía config operativa; valorar mostrar también en Superadmin solo lectura. |
| **Recordatorios:** modos, plantillas, canales, límites | Límites máx. (ej. `max_envios/día` tope global) | **Sí** dentro del rango | Implementado por empresa; falta tope opcional por plan. |
| **SMTP servidor (host, usuario, contraseña)** | Política de producto (si multi-SMTP) | Opcional futuro | Hoy: un solo SMTP en servidor + **Reply-To** por clínica. |
| Zona horaria, horario clínica | **Sí** al provisionar | **Sí** | Ya en config empresa. |
| Textos legales / facturación electrónica | **Sí** + asesoría fiscal | Parcial | Módulo país pendiente. |

**Principio:** lo **contractual/legal o multi-tenant** → Superadmin; lo **operativo del día a día** → admin de la veterinaria, con **límites** definidos por plan/superadmin.

---

## Recomendación sobre “Ver citas” y calendario

1. **No duplicar** el mismo listado paginado en dos sitios.  
2. Renombrar mentalmente el botón actual **“Ver citas”** a algo como **“Disponibilidad del veterinario”** y dejarlo **solo** con: fecha + vet + lista de slots libres/ocupados (y enlace a nueva cita con slot).  
3. **Lista de espera:** si el flujo real ya es otro (orden de llegada en recepción), **sacar del calendario** y enlazar desde un menú “Colas / Lista de espera” si sigue haciendo falta, o eliminar si el negocio ya no la usa ahí.

---

## Orden sugerido de próximos desarrollos

1. **UI tipos de servicio** (elimina fricción del JSON) — *pendiente grande*.  
2. **Venta por consulta:** búsqueda de cliente + líneas extra al carrito.  
3. **Agenda:** retirar Desde/Hasta de la vista principal si adoptáis solo “semana actual + chips”; afinar “Ver citas” como disponibilidad únicamente.  
4. **Lista de espera** bajo calendario: eliminar o reubicar según decisión de negocio.  
5. **Superadmin:** pantallas de solo lectura / override para `notificaciones_json`, consecutivo venta, y plantilla de tipos al crear empresa.  
6. **SMTP por clínica** (fase posterior, con vault/cifrado).

---

## Referencias de código

- Búsquedas: `GET /clientes/?busqueda=`, `GET /mascotas/?busqueda=`
- Config operativa: `GET/PATCH /empresa/config-operativa`
- Notificaciones: `GET/PATCH /empresa/config-notificaciones`, `POST /cron/recordatorios-citas`
- Ventas ampliadas: `GET /ventas/{id}/detalle-ampliado`
