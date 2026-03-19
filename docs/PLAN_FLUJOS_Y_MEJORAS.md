# Plan: Flujos de citas, inventario, resumen PDF y mejoras

## 1. Estado actual (resumen)

| Área | Estado |
|------|--------|
| **Citas** | Creación por ADMIN/VET/RECEPCION. Sin selector de veterinario en alta; solo "Asignarme" (vet). Cambio de estado solo editando formulario (varios clics). |
| **Roles** | RECEPCION puede crear citas pero no asignar veterinario en la UI. Veterinarios ven "Mis citas". |
| **Consulta ↔ Cita** | Campo `cita_id` en consulta (opcional). Botón "Crear consulta desde esta cita" en detalle de cita (VET/ADMIN). |
| **Inventario** | No existe (productos, stock, ventas). |
| **Resumen / PDF / Email** | Resumen estructurado (GET /consultas/{id}/resumen), PDF (GET /consultas/{id}/resumen/pdf), envío por email con PDF adjunto (POST /consultas/{id}/enviar-resumen). Página detalle consulta con acciones. |
| **Motivo consulta** | Selector con motivos predefinidos + "Otro" (texto libre). GET /catalogo/motivos-consulta. |
| **Vista citas** | Solo tabla con filtros; sin vista calendario ni agrupación por día. |

---

## 2. Objetivos y enfoque

1. **Recepción**: Crear citas y poder **asignar veterinario** (o dejar sin asignar).
2. **Veterinarios**: Ver citas asignadas y sin asignar; mínimo de clics para cambiar estado.
3. **Menos clics**: Botones directos (Confirmar, Atender, Cancelar) sin entrar a editar.
4. **Post-cita**: Recepción puede **vender medicamentos** recomendados; hace falta **inventario**.
5. **Resumen de la cita médica**: Generar **resumen**, **PDF** y **envío por email** al cliente.
6. **Implementación práctica**: Priorizar lo que da valor rápido y es mantenible.
7. **Motivos de consulta**: **Plantillas/motivos predefinidos** para elegir rápido.
8. **Vista citas**: Más **intuitiva** (agrupación por día, posible vista tipo agenda/semana).

---

## 3. Fases propuestas

### Fase 1 – Flujos de citas y motivos (rápido, alto impacto)

- **1.1** Botones de acción rápida en detalle de cita: **Confirmar**, **Atender**, **Cancelar** (y opcionalmente en la fila de la agenda).
- **1.2** En **crear cita** y en **detalle de cita**: selector opcional **Asignar veterinario** (RECEPCION y ADMIN).
- **1.3** **Vínculo Cita → Consulta**: campo `cita_id` en Consulta (opcional), y en detalle de cita botón **"Crear consulta"** que lleve al alta de consulta con mascota y motivo pref rellenados.
- **1.4** **Motivos predefinidos**: catálogo o lista configurable (ej. Revisión anual, Vacunas, Urgencia, Cojera, Vómitos/diarrea, Dermatología, Oftalmología, etc.) como selector en cita y en consulta, manteniendo opción "Otro" (texto libre).

### Fase 2 – Resumen de consulta, PDF y email

- **2.1** **Resumen de la consulta**: texto estructurado (motivo, diagnóstico, tratamiento, observaciones) generado a partir de la consulta; guardado o generado on-demand.
- **2.2** **PDF**: generación del resumen en PDF (backend, ej. WeasyPrint o reportlab) y endpoint para descarga.
- **2.3** **Email al cliente**: reutilizar `notification_service` para enviar email con el resumen en cuerpo y/o PDF adjunto (o link de descarga).

### Fase 3 – Inventario y venta de medicamentos

- **3.1** **Productos**: modelo Producto (nombre, tipo medicamento/insumo, unidad, precio, activo); CRUD y listado.
- **3.2** **Stock**: por producto (y opcionalmente por sede si hay multi-sede); movimientos (entrada/salida/ajuste).
- **3.3** **Venta/Dispensación**: registro de venta con items (producto, cantidad, precio); opcionalmente vinculada a `consulta_id` para "venta post-consulta".
- **3.4** **UI recepción**: pantalla "Vender medicamentos" (puede abrirse desde detalle de consulta/cita atendida): seleccionar productos, cantidades, confirmar; descontar stock.

### Fase 4 – Vista de citas más intuitiva

- **4.1** Agenda: **agrupar por día** (o por semana) y mostrar bloques horarios o lista por día.
- **4.2** Opcional: **vista tipo calendario** (semana o mes) con eventos por mascota/vet.
- **4.3** En lista/detalle: colores o iconos por estado (pendiente/confirmada/atendida/cancelada) para lectura rápida.

---

## 4. Orden de implementación recomendado

1. **Fase 1.1** – Botones Confirmar / Atender / Cancelar (menos clics).
2. **Fase 1.2** – Asignar veterinario en crear/editar cita (recepción).
3. **Fase 1.4** – Motivos predefinidos (catálogo o lista; selector en cita y consulta).
4. **Fase 1.3** – `cita_id` en Consulta + "Crear consulta desde esta cita".
5. **Fase 2** – Resumen, PDF y email.
6. **Fase 3** – Inventario y venta.
7. **Fase 4** – Mejora visual de la agenda.

---

## 5. Motivos de consulta sugeridos (plantilla inicial)

Basado en buenas prácticas y motivos frecuentes:

- Revisión general / chequeo
- Vacunación
- Desparasitación
- Urgencia
- Cojera / traumatismo
- Vómitos / diarrea
- Problemas de piel / prurito
- Oídos / otitis
- Ojos
- Problemas dentales
- Control post-operatorio
- Esterilización / castración
- Control de peso
- Enfermedad crónica (seguimiento)
- Otro (texto libre)

Se pueden guardar en BD (tabla `motivos_consulta`) o en configuración; el selector en front puede combinar "Motivos frecuentes" + "Otro".

---

## 6. Notas técnicas

- **PDF**: En Python, WeasyPrint o reportlab; o generar HTML y convertir a PDF. Incluir logo/clínica, datos mascota/cliente, fecha, motivo, diagnóstico, tratamiento.
- **Email con adjunto**: Revisar si el `NotificationMessage` actual soporta adjuntos; si no, extenderlo o usar directamente SMTP con MIME.
- **Inventario**: Empezar con modelo simple (Producto, Stock por producto, Movimiento o Venta con líneas). Sin multi-almacén al inicio.
- **Cita–Consulta**: Añadir `cita_id` (nullable) en `consultas` y rellenarlo cuando se crea la consulta "desde" una cita.

Este documento se irá actualizando según se implemente cada fase.
