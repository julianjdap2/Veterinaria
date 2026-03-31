"""
Aislamiento multi-tenant y datos de propietarios (referencia para desarrollo y auditoría).

Reglas que debe cumplir la API del panel clínica:

1. **Tenant efectivo**: `Usuario.empresa_id` obtenido solo desde la sesión autenticada (JWT con
   `user_id` → carga de usuario en BD). No usar `empresa_id` enviado por el cliente en body o query
   para autorizar el acceso a datos de otra clínica.

2. **Propietarios globales**: un `Cliente` puede existir una vez en la plataforma. Cada clínica solo
   opera con quien tenga fila activa en `cliente_empresa_vinculos` para su `empresa_id`.

3. **Mascotas**: el acceso debe seguir el mismo criterio que `join_mascota_accesible_por_empresa`
   (vínculo propietario–clínica), no confiar solo en `mascotas.empresa_id` heredado.

4. **Búsqueda por documento sin vínculo**: no devolver listados de mascotas ni datos clínicos hasta
   que exista vínculo (o solo lo permitido por nivel parcial/completo según política de producto).

5. **Superadmin**: rutas bajo prefijo superadmin; el `empresa_id` en path es intencional y requiere
   rol de plataforma, no mezclar con el modelo de panel de clínica.
"""
