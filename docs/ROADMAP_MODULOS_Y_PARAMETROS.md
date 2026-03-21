# Roadmap módulos, UX y parametrización (Vet System)

Documento de **análisis y recomendaciones** frente a la lista de mejoras solicitada. Objetivo: priorizar, separar **plataforma (Superadmin)** vs **clínica (admin empresa)** y evitar valores “quemados” en código.

**Última revisión:** 2026-03.

---

## 1. Qué ya quedó aplicado en código (esta entrega)

| Área | Cambio |
|------|--------|
| **Clientes** | Un solo campo de búsqueda → API `busqueda` (nombre **O** documento). |
| **Mascotas** | Un solo campo → API `busqueda` (nombre mascota **O** nombre cliente **O** documento). |
| **Auditoría** | Filtros en **una fila horizontal** con scroll en pantallas chicas. |
| **Citas (fases A–C)** | Columna agenda con **nombre del veterinario**; chips de estado; accesos rápidos de fechas; lista de espera en **`<details>`**; fecha por defecto **hoy** en nueva cita; tipos de servicio y flags urgente/recurrente desde **`GET /empresa/config-operativa`**; citas pasadas/cerradas **solo lectura** (UI + `403` en PATCH). |
| **Consultas** | Medicamentos con **búsqueda autocompletar** (debounce, API productos `search`). |
| **Ventas** | **Modal de detalle ampliado** (`GET /ventas/{id}/detalle-ampliado`); **CYD unificado** en un flujo; **`codigo_interno`** y consecutivo por empresa (`empresa_configuraciones` + asignación en transacción). |
| **Mascota** | Enlace desde agenda con **`state.from`**; vuelta contextual a citas; nombre de cliente en ficha cuando aplica. |
| **Inventario** | Barra de filtros con **scroll horizontal** en pantallas pequeñas. |
| **Config. operativa** | Pantalla admin **`/configuracion-operativa`**: JSON tipos de servicio + prefijo/padding ventas. |
| **Fase D – Notificaciones** | **`/configuracion-notificaciones`**: modo día vs ventana en horas, plantillas con variables, canales, Reply-To, límite diario; cron usa `notificaciones_json` + deduplicación por `cita_id` en logs. |

---

## 2. Modelo de parametrización recomendado

### 2.1 Tres niveles (no mezclar responsabilidades)

| Nivel | Quién | Qué guarda | Ejemplos |
|-------|--------|------------|----------|
| **Plan SaaS** | Superadmin | Límites y módulos del producto | `max_usuarios`, flags de módulos |
| **Empresa (plataforma)** | Superadmin por empresa | Overrides y datos de clínica “duros” | `empresa_configuraciones`, datos de ticket, SMTP si fuera multi-tenant gestionado |
| **Operación clínica** | Admin de la veterinaria | Preferencias del día a día | Prefijo/consecutivo **interno** de venta, tipos de servicio de agenda, textos de recordatorio, hora del cron **sugerida** |

**Recomendación clave:**  
- Lo que es **contractual / facturación legal país** → fase posterior y con asesoría fiscal.  
- Lo que es **consecutivo interno de sistema** (no DIAN/SAT) → tabla `empresa_parametros_operacion` o ampliar `empresa_configuraciones` con JSON tipado + UI admin empresa.

### 2.2 Superadmin vs admin clínica (matriz rápida)

| Parámetro | Superadmin | Admin clínica |
|-----------|------------|----------------|
| Plan, límites, módulos del producto | Sí | No |
| Override flags (inventario, ventas…) | Sí | No (solo lectura o ticket) |
| Prefijo + consecutivo venta **interno** | Ver/reset soporte | Sí (configura) |
| Tipos de servicio agenda (Consulta, Baño, Peluquería…) | Seed por defecto | Sí (edita lista) |
| Plantilla email recordatorio citas | Plantilla base sistema | Sí (variables + texto) |
| Periodicidad cron (cada X h / a las HH:MM) | Límite mínimo/máximo plataforma | Sí dentro de rango |
| SMTP propio de la clínica | Opcional (feature) | Sí si está habilitado |

---

## 3. Por módulo: recomendación y prioridad

### 3.1 Inventario

- **Pendiente de detalle en tu mensaje.** Recomendación estándar: **un solo buscador** (nombre, código, EAN) + filtros opcionales (categoría, stock bajo) en barra horizontal, alineado con Clientes/Mascotas/Productos.

### 3.2 Citas (bloque grande)

**Columna “Asignada”:** mostrar **nombre del veterinario** → join/campo en API de listado de citas + cache de nombres en front si hace falta.

**Nueva cita – fecha por defecto:** `hoy` en el date picker (timezone: usar `empresa_configuraciones.timezone` cuando exista en front).

**Tipos de servicio (Peluquería, Baño, etc.):**  
- **No hardcodear** la lista final: guardar en `empresa_configuraciones.configuracion_agenda_json` o tabla `tipos_servicio_cita` por empresa.  
- Superadmin puede definir **plantilla inicial** al crear empresa; admin clínica edita.

**Urgente y recurrente – visibilidad “inteligente” (propuesta):**

| Tipo / categoría | Mostrar “Urgente” | Mostrar “Recurrente” |
|------------------|-------------------|----------------------|
| Emergencia / Urgencias (si existe en catálogo) | Sí (default off) | No |
| Consulta general | Sí (colapsado o avanzado) | Opcional |
| Peluquería, Baño, Estética | No | **Sí** (ej. cada 4 semanas) |
| Vacunación / Desparasitación | No | **Sí** |
| Control / Seguimiento | Raramente urgente | Sí |

Implementación: campo `categoria` o `flags` en cada tipo de servicio: `{ "allow_urgente": true, "allow_recurrente": true }`.

**Agenda / calendario – filtros “Desde / Hasta / Estado”:**  
- Recomendación: **vista semana/día** con **un solo contexto temporal** (semana actual + flechas), sin rango libre confuso.  
- Estado → **chips** horizontales (Todas, Pendientes, Confirmadas, …) encima del calendario.  
- “Ver citas” vs agenda principal: **sí hay redundancia** si ambas listan lo mismo.  
  - **Recomendación:** una sola **Agenda** con: selector de veterinario, vista mes/semana/día, y panel lateral “solo mi día”. Eliminar o fusionar “Ver citas” en esa ruta; si se mantiene, que sea **solo disponibilidad** (slots) de un vet sin duplicar la lista global.

**Lista de espera (abajo del calendario):** quitar del layout principal o mover a **pestaña / drawer** para no competir con el calendario.

**Clic en mascota → ficha:**  
- Mostrar **nombre del cliente** (resolver por API).  
- “Volver”: si el usuario llegó desde Citas, **volver a `/citas`** (usar `location.state` o query `?from=citas`).

### 3.3 Consultas – medicamentos

- Sustituir `<select>` masivo por **búsqueda con autocompletar** (mismo patrón que clientes/mascotas), debounce, máximo N resultados.

### 3.4 Historial de citas – solo lectura

- Si la cita ya pasó (`fecha < now` o estado atendida/cancelada): **desactivar edición** en UI y **rechazar PATCH** en API con `403`/`400` coherente.

### 3.5 Ventas

**Botones de acción:** iconos + variante ghost/outline, agrupados en menú “⋯” en móvil.

**Detalle en modal:** cargar venta + **cliente** (nombre, doc) + **mascota** si aplica vía `consulta_id` → join mascota/cliente en backend en un `VentaDetalleAmpliado` o endpoint dedicado.

**Volver atrás:** usar `state` de React Router (`from`) o historial; documentar patrón en README técnico.

**Cambio vs devolución:**  
- **No es lo mismo:** devolución = entrada stock + total negativo; cambio = a menudo **dos movimientos** (devolución parcial + nueva venta) o un flujo guiado.  
- **Recomendación UX:** un solo botón **“Cambio / devolución”** que abre modal: elegir tipo + motivo + carga de ítems; internamente sigue llamando los mismos endpoints. Evita dos enlaces que confunden al usuario.

**Consecutivo y prefijo por empresa:**  
- Tabla o campos: `venta_prefijo`, `venta_siguiente_consecutivo`, opcional `venta_padding` (ej. 6 dígitos).  
- Generar `numero_interno` al crear venta en transacción (`SELECT FOR UPDATE` o atomic update).  
- Configurable por **admin clínica**; Superadmin solo ve/soporte.

**Venta por consulta:**  
- Propietario por **búsqueda** (mismo `busqueda` que clientes).  
- Permitir **añadir ítems extra** además de la fórmula (carrito unificado: filas fórmula + botón “añadir producto”).

### 3.6 Cron y correos

- **Parametrizar:** hora local de envío, antelación (ej. 24 h antes), canales habilitados, plantilla con variables `{nombre_mascota}`, `{fecha}`, `{clinica}`.  
- **Módulo de configuración:** pantalla “Notificaciones” en admin clínica; Superadmin define **límites** (máx. envíos/día, proveedor por defecto).  
- **SMTP:** si cada clínica envía con su correo → cifrado de secretos + almacenamiento seguro; si no, envío desde dominio plataforma con reply-to de la clínica (más simple).

---

## 4. Fases de implementación sugeridas

1. **Fase A – UX rápida (sin mucho backend nuevo):** citas (nombre vet, fecha hoy, chips estado), consulta medicamentos búsqueda, historial citas read-only, ventas modal detalle + botones.  
2. **Fase B – Datos enriquecidos:** venta detalle con cliente/mascota; ruta “volver” con state; unificar CYD en un flujo.  
3. **Fase C – Parametrización:** consecutivos, tipos servicio agenda en JSON/BD, flags urgente/recurrente por tipo.  
4. **Fase D – Notificaciones:** cron configurable + plantillas + (opcional) SMTP por clínica.

---

## 5. Nota sobre “nada quemado en código”

- Textos de negocio largos (políticas ticket, plantillas email) → **BD o JSON admin**, con valores por defecto en **seed/migración**, no strings fijos en componentes.  
- Listas de tipos de servicio → **API** desde config empresa.  
- Límites del cron → validación en backend según plan.

---

## Referencias de código útiles

- Búsqueda unificada clientes: `GET /clientes/?busqueda=`  
- Búsqueda unificada mascotas: `GET /mascotas/?busqueda=`  
- Config empresa: `empresa_configuraciones`, `feature_flags`, `docs/PLANES_Y_LIMITES.md`
