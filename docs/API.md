# Contrato HTTP de la API (Vet System)

Referencia única para **cualquier cliente** (SPA, mobile, integraciones). La lista autoritativa de rutas y schemas es **OpenAPI**: `http://127.0.0.1:8000/docs` (con el backend en marcha).

---

## 1. Base URL y CORS

| Entorno | URL típica |
|---------|------------|
| API local | `http://127.0.0.1:8000` o `http://localhost:8000` |

- **Proxy Vite (recomendado en dev):** con `VITE_API_URL=/api`, el navegador usa el mismo origen (`localhost:5173`) y Vite reenvía `/api` al backend; **CORS no aplica** a esas peticiones.
- **Llamada directa al API:** configurar `CORS_ORIGINS` en el backend (plantilla: `backend/.env.example`; por defecto incluye puertos 3000 y 5173). En **producción**, lista solo orígenes reales del front.

---

## 2. Autenticación (JWT)

| Acción | Detalle |
|--------|---------|
| Login | `POST /auth/login` body `{ "email", "password" }` |
| Respuesta | `{ "access_token", "token_type": "bearer" }` |
| Resto de rutas | Header `Authorization: Bearer <access_token>` |
| Sin token | `GET /`, `GET /health`, `POST /auth/login` |

- **Almacenamiento del token:** el proyecto front usa `sessionStorage` (menor superficie que `localStorage` ante XSS). Cookies `httpOnly` requieren cambios en backend y política CSRF.
- **Expiración:** por defecto 60 minutos (`ACCESS_TOKEN_EXPIRE_MINUTES` en backend). **401** → limpiar sesión y redirigir a login.
- **Rate limit:** login **10 req/min por IP** → **429**; mostrar mensaje claro al usuario.

---

## 3. Errores (formato estándar)

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

| HTTP | `error.code` típico | Notas |
|------|---------------------|--------|
| 422 | `validation_error` | `details`: errores Pydantic |
| 401 | `http_error` o flujo sin body estándar | Token inválido/expirado |
| 403, 404, otros HTTP | `http_error` | Mensaje en `error.message` |
| Negocio (`ApiError`) | Específico (`mascota_not_found`, etc.) | Según endpoint |
| 500 | `internal_error` | No exponer detalles internos al usuario |

Mostrar **`error.message`** en UI; usar **`request_id`** solo en logs o soporte.

---

## 4. Paginación

Respuesta típica:

```json
{
  "items": [],
  "total": 100,
  "page": 1,
  "page_size": 20
}
```

Query: `page` (default 1), `page_size` (default 20). Endpoints comunes: `GET /clientes/`, `GET /mascotas/`, `GET /citas/agenda`, `GET /audit/`, y otros listados (ver `/docs`).

---

## 5. Roles (RBAC)

`rol_id` en JWT:

| ID | Rol | Uso típico |
|----|-----|------------|
| 1 | ADMIN | Usuarios, configuración, auditoría |
| 2 | VETERINARIO | Consultas, citas, clínica |
| 3 | RECEPCIÓN | Clientes, citas, recepción |
| 4 | SUPERADMIN | Prefijo `/superadmin/*` (empresas, planes) |

Claims útiles: `user_id`, `empresa_id`, `rol_id`. **Permisos finos** por endpoint: siempre confirmar en OpenAPI.

---

## 6. Tabla rápida de recursos

| Área | Prefijo / notas |
|------|-----------------|
| Auth | `POST /auth/login` |
| Usuarios | `/usuarios` |
| Clientes | `/clientes` |
| Mascotas | `/mascotas` |
| Consultas | `/consultas` |
| Citas | `/citas` |
| Catálogo | `/catalogo` |
| Productos | `/productos` |
| Ventas | `/ventas` (p. ej. `GET /ventas/{id}/detalle-ampliado`) |
| Dashboard | `/dashboard` |
| Auditoría | `/audit` |
| Empresa | `/empresa/config-operativa`, `/empresa/config-notificaciones` |
| Superadmin | `/superadmin/*` (rol **4**) |
| Cron | `/cron/*` (opcional `X-Cron-Secret`) |

Para paths exactos, query params y body, usar **`/docs`**.

---

## 7. Endpoints públicos (sin JWT)

| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/public/clinicas` | Listado mínimo de clínicas activas para la landing (nombre, `logo_url`). Sin datos sensibles. |
| POST | `/public/registro` | Alta de clínica (en prueba) + primer administrador. Respuesta: `{ "solicitud_recibida": true, "message": "..." }`. El correo incluye enlace al frontend con token de activación. Límite: 5/min por IP. |
| POST | `/public/activar` | Cuerpo JSON `{ "token": "<jwt del correo>" }`. Devuelve JWT de sesión (igual que login). Sin login manual. Límite: 15/min por IP. |
| GET | `/auth/me` | Requiere JWT. Devuelve `email`, `usuario_nombre`, `empresa_nombre` (p. ej. pantalla de términos en onboarding). |

---

## 8. Buenas prácticas para clientes

- Cliente HTTP con **interceptor**: inyectar `Authorization`; en **401** limpiar sesión y enviar a login.
- **No** poner tokens en URLs.
- **Paginación:** componente reutilizable con `items`, `total`, `page`, `page_size`.
- **Formularios:** validar en cliente; **422** con `details` para mostrar errores por campo.
