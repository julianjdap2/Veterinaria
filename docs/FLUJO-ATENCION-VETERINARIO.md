# Flujo de atención: cuándo el veterinario “toma” la cita

## Cómo está hoy el sistema

- **Cita**: tiene mascota, fecha, motivo y estado (pendiente → confirmada → atendida / cancelada). **No** tiene “veterinario asignado”.
- **Consulta** (historial clínico): sí tiene `veterinario_id` (el usuario que crea la consulta = el vet que atendió).

Es decir: la cita es solo un turno (quién viene y cuándo); la “asignación” al veterinario queda registrada cuando se crea la **consulta** asociada a esa atención.

---

## Dos formas de entender “el veterinario toma la cita”

### Opción A – Sin asignar vet a la cita (como está ahora)

1. **Recepción/Admin** crea la cita (pendiente o confirmada). No se elige veterinario.
2. **Agenda**: todos ven la misma agenda (todas las citas del día/semana).
3. **Momento de atender**:
   - El veterinario abre la cita en la agenda (o desde “mis citas del día” si luego añadimos filtro).
   - Marca la cita como **“Atendida”**.
   - Crea la **Consulta** (historial clínico) para esa mascota: motivo, diagnóstico, tratamiento, etc. Esa consulta lleva su `veterinario_id`.
4. **Quién atendió**: queda registrado en la **Consulta**, no en la cita. La cita solo pasa a estado “atendida”.

**Ventaja**: no hace falta tocar modelo de Cita.  
**Desventaja**: en la agenda no se ve “esta cita la atiende el Dr. X” hasta que se crea la consulta.

---

### Opción B – Asignar veterinario a la cita (recomendada para clínicas con varios vets)

1. **Modelo**: se agrega en Cita el campo opcional `veterinario_id` (FK a usuarios, solo vets).
2. **Al crear la cita**: recepción puede dejarla “sin asignar” o asignar ya a un vet si se sabe.
3. **Agenda**:
   - Vista “Todas”: todas las citas (recepción/admin).
   - Vista “Mis citas” (veterinario): solo citas donde `veterinario_id = yo` o `veterinario_id` es null (sin asignar).
4. **Momento en que el veterinario “toma” la cita**:
   - Abre una cita (desde “sin asignar” o desde la agenda general).
   - Pulsa **“Asignarme”** o **“Atender”**: el backend hace `PATCH /citas/{id}` con `veterinario_id = usuario actual` (y opcionalmente pasa estado a “confirmada” si estaba pendiente).
   - A partir de ahí la cita aparece en “Mis citas” de ese vet.
5. **Al terminar la atención**:
   - Marca la cita como **“Atendida”**.
   - Crea la **Consulta** para esa mascota (con su `veterinario_id`). Así queda tanto “quién tenía asignada la cita” como “quién hizo la consulta”.

**Ventaja**: la agenda refleja quién atiende cada cita; el vet trabaja desde “Mis citas” y puede “asignarse” turnos.  
**Desventaja**: requiere migración (añadir `veterinario_id` a `citas`) y ajustar API y front (agenda + botón “Asignarme” / “Atender”).

---

## Resumen recomendado (Opción B)

- **Crear cita**: recepción; opcionalmente asignar vet.
- **Ver agenda**: todos las citas o “solo las mías” (vet).
- **Tomar la cita**: el vet abre la cita y pulsa **“Asignarme”** → se guarda `veterinario_id` en la cita.
- **Cerrar la atención**: marcar cita “Atendida” y crear **Consulta** (ahí queda el vet que atendió en el historial clínico).

Si quieres seguir con la Opción B, el siguiente paso sería: añadir `veterinario_id` a la tabla y al API de citas, y en el front: filtro “Mis citas” en la agenda y botón “Asignarme” en el detalle de la cita.
