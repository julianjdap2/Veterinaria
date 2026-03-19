# Guía para el frontend – Veterinary System

Recomendaciones antes de empezar el front, alineadas con la API actual.

---

## 1. Base URL y CORS

- **API base:** `http://localhost:8000` en desarrollo (o la URL de tu backend).
- **CORS:** El backend acepta orígenes definidos en `CORS_ORIGINS` (por defecto `http://localhost:3000`). Si el front corre en otro puerto (ej. 5173 con Vite), añade ese origen en el `.env` del backend:  
  `CORS_ORIGINS=http://localhost:3000,http://localhost:5173`

---

## 2. Autenticación (JWT)

- **Login:** `POST /auth/login` con body `{ "email": "...", "password": "..." }`.  
  Respuesta: `{ "access_token": "...", "token_type": "bearer" }`.
- **Uso del token:** En todas las peticiones (salvo login y `/`, `/health`) envía la cabecera:  
  `Authorization: Bearer <access_token>`.
- **Dónde guardar el token:** `localStorage` o `sessionStorage`; en apps con riesgo XSS alto, valorar httpOnly cookies (el backend actual devuelve solo el token en JSON).
- **Expiración:** 60 minutos por defecto. Si el token expira, el backend responde 401; el front debe redirigir a login y limpiar el token.
- **Rate limit:** Login limitado a 10 peticiones/minuto por IP; en el front mostrar mensaje claro si recibes 429.

---

## 3. Formato de errores (estándar de la API)

Todas las respuestas de error siguen esta forma:

```json
{
  "error": {
    "code": "código_interno",
    "message": "Mensaje para el usuario",
    "request_id": "uuid-opcional",
    "details": null
  }
}
```

- **Validación (422):** `code: "validation_error"`, `details` con el array de errores de Pydantic.
- **No autorizado (401):** token inválido o expirado.
- **Sin permisos (403):** `detail` indica falta de permisos.
- **Recurso no encontrado (404):** `code` tipo `mascota_not_found`, `cliente_not_found`, etc.
- **Error interno (500):** `code: "internal_error"`; no exponer detalles sensibles al usuario.

Usar siempre `error.message` (o `detail` si la API lo envía en el mismo nivel) para mostrar el mensaje al usuario, y `request_id` solo para soporte o logs.

---

## 4. Paginación (listados)

Los listados devuelven un objeto paginado, no un array directo:

```json
{
  "items": [ ... ],
  "total": 100,
  "page": 1,
  "page_size": 20
}
```

- **Endpoints afectados:** `GET /clientes/`, `GET /mascotas/`, `GET /citas/agenda`, `GET /audit/`.
- Parámetros de consulta: `page` (default 1) y `page_size` (default 20).  
En el front: construir tablas/listas con `items`, y usar `total` + `page` + `page_size` para “Página X de Y” o scroll infinito.

---

## 5. Roles (RBAC)

El backend usa `rol_id` numérico:

| rol_id | Rol        | Uso típico                          |
|--------|------------|-------------------------------------|
| 1      | ADMIN      | Usuarios, configuración, auditoría |
| 2      | VETERINARIO| Consultas, citas, mascotas         |
| 3      | RECEPCIÓN  | Clientes, citas, mascotas          |

El JWT incluye `user_id`, `empresa_id`, `rol_id`. Guarda `rol_id` (y si quieres el rol como texto, un mapa 1→ADMIN, 2→VETERINARIO, 3→RECEPCIÓN) para mostrar menús y acciones según el rol.

---

## 6. Endpoints útiles para el front

| Recurso      | Método | Ruta (resumida)              | Notas                          |
|-------------|--------|------------------------------|--------------------------------|
| Login       | POST   | `/auth/login`                | Body: email, password          |
| Clientes    | GET    | `/clientes/?page=&page_size=&nombre=&documento=` | Paginado + filtros |
| Clientes    | GET    | `/clientes/{id}`             | Detalle                        |
| Clientes    | POST   | `/clientes/`                 | Body JSON (nombre, email, …)   |
| Clientes    | DELETE | `/clientes/{id}`             | Soft delete (solo ADMIN/RECEP)|
| Mascotas    | GET    | `/mascotas/?page=&page_size=&cliente_id=&nombre=` | Paginado + filtros |
| Mascotas    | GET    | `/mascotas/{id}`             | Detalle                        |
| Mascotas    | POST   | `/mascotas/`                 | Body JSON (nombre, cliente_id, …) |
| Mascotas    | DELETE | `/mascotas/{id}`            | Soft delete                    |
| Consultas   | GET    | `/consultas/mascota/{mascota_id}` | Historial clínico        |
| Consultas   | POST   | `/consultas/`                | Body: mascota_id, motivo_consulta, … |
| Citas       | GET    | `/citas/agenda?fecha_desde=&fecha_hasta=&estado=&page=&page_size=` | Agenda paginada |
| Citas       | GET    | `/citas/mascota/{mascota_id}`| Citas de una mascota           |
| Citas       | POST   | `/citas/`                    | Body: mascota_id, fecha, motivo, estado |
| Citas       | PATCH  | `/citas/{id}`                | Actualizar estado/fecha/motivo |
| Catálogo    | GET    | `/catalogo/especies`         | Lista especies                 |
| Catálogo    | GET    | `/catalogo/razas?especie_id=`| Lista razas (opcional filtro)  |
| Auditoría   | GET    | `/audit/?tabla=&usuario_id=&fecha_desde=&fecha_hasta=&page=&page_size=` | Solo ADMIN |

Documentación interactiva: **http://localhost:8000/docs** (probar peticiones y ver schemas).

---

## 7. Recomendaciones técnicas para el front

- **Stack:** React (Vite) o Vue 3 (Vite) o SvelteKit; cualquiera encaja con esta API.
- **HTTP:** Cliente con interceptores: enviar `Authorization: Bearer <token>` en cada petición y, si la respuesta es 401, limpiar token y redirigir a login.
- **Estado:** Guardar token y usuario (y rol) en contexto/store; no poner el token en la URL.
- **Errores:** Centralizar el manejo usando el formato `error.code` / `error.message` anterior.
- **Paginación:** Un componente reutilizable que reciba `items`, `total`, `page`, `page_size` y llame a la API con `page` y `page_size` al cambiar de página.
- **Formularios:** Validar en el front (tipos, requeridos, email) y asumir que el backend devuelve 422 con `details` si algo falla; mostrar esos mensajes junto a los campos.

---

## 8. Orden sugerido para implementar

1. Login + guardar token + redirección si no hay token o 401.
2. Layout y menú según rol (ADMIN / VETERINARIO / RECEPCIÓN).
3. Clientes: listado paginado con filtros, alta, detalle, (opcional) desactivar.
4. Mascotas: listado paginado con filtros, alta, detalle, (opcional) desactivar; usar catálogo especies/razas en formularios.
5. Consultas: historial por mascota y alta de consulta.
6. Citas: agenda (vista por fechas), alta/edición, filtro por estado.
7. Usuarios (solo ADMIN) y auditoría (solo ADMIN) si aplica.

Con esto el backend queda cerrado para consumo y puedes empezar el front con criterios claros de auth, errores y paginación.
