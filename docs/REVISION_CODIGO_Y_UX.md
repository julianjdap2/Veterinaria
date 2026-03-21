# Revisión de código, eficiencia y UX (Vet System)

Documento orientativo (no exhaustivo). Actualizar al evolucionar el repo.

## Seguridad

- **Nunca** compartir credenciales en chats, tickets o código. Rotar contraseñas expuestas de inmediato.
- Revisar que `.env` y secretos no entren al repositorio (`.gitignore`).

## Redundancias y estructura

| Área | Observación | Sugerencia |
|------|-------------|------------|
| Navegación por rol | ~~`navByRole` duplicaba rutas~~ | **Hecho:** `NAV_ITEMS` único filtrado por `roles` en `AppLayout.tsx`. Siguiente paso opcional: cruzar con permisos admin. |
| Citas / agenda | Varias vistas (lista, calendario, “ver citas”) pueden solaparse | Unificar o renombrar según `CHECKLIST_MEJORAS_OPERATIVAS.md`. |
| Config operativa | JSON de tipos de servicio + UI mezclados | Editor visual; JSON solo en modo avanzado. |
| Ventas | ID interno en URL vs `codigo_interno` visible | Coherente: mostrar siempre nº interno; URL puede seguir con `id` hasta tener `GET /ventas/by-codigo/...`. |

## Eficiencia (frontend)

- ~~Listados con `page_size: 500`~~ **Reducido:** `core/listDefaults.ts` (`PAGE_SIZE_SELECT`, `DASHBOARD_MODAL_PAGE_SIZE`, etc.); **ClienteSearchSelect** / **MascotaSearchSelect**; productos en detalle consulta con filtro + `PAGE_SIZE_SELECT`; dashboard modales acotados.
- **`useMisPermisosAdmin` / `useVeterinarios`:** `staleTime` 5 min para menos refetch.
- `useQuery` con keys estables (ya aplicado en listados).
- Componentes pesados: `React.lazy` + `Suspense` para rutas poco usadas (superadmin, auditoría).

## Eficiencia (backend)

- Endpoints de listado: índices en columnas de filtro (`busqueda`, fechas, `empresa_id`).
- **Mascotas:** `cliente_nombre` en listado vía **una query batch** (`mascotas_a_response_con_cliente_nombre`) en lugar de que el front cargue todos los clientes.
- **Citas:** `mascota_nombre` en `citas_a_respuestas` (batch con nombres de mascota), alineado con `veterinario_nombre`.

## “Variables globales”

- **No** abusar de variables globales en JS. Preferir:
  - **Zustand** (`auth-store`) para sesión.
  - **Variables CSS** (`:root { --color-primary: ... }`) si se quiere tema dinámico por empresa (futuro).
  - **Context** solo donde haga falta árbol profundo (evitar si se puede con props + stores).

## Implementaciones que suelen faltar en MVP

- Tests automatizados (e2e críticos: login → cita → venta).
- Facturación **legal** por país (DIAN, etc.) vs consecutivo interno actual.
- SMTP por tenant cifrado (hoy suele ser global + Reply-To).
- Observabilidad: logs estructurados, correlación `request_id`, métricas de errores.

## Comparativa con productos tipo [OkVet](https://okvet.co/) (marketing público)

Referencia de mercado: historia clínica, agenda, notificaciones, inventario/ventas, planes freemium/pro, app móvil tutor, marketing SMS/WA, facturación electrónica (p. ej. Colombia).

**Diferenciación posible para Vet System:** control del despliegue (on-prem / propio), datos bajo control del cliente, parametrización por clínica sin depender de un único SaaS, roadmap abierto.

---

## Cambios de UX recientes (menú lateral)

En `AppLayout.tsx` se reforzó el feedback visual al pasar el cursor:

- Enlaces inactivos: gradiente suave primary/accent, borde izquierdo, sombra y ligero desplazamiento.
- Logo: transición en el isotipo al hover.
- Estado activo: sin cambiar (sigue destacado con primary).

Para extender el mismo criterio a **tablas de acciones** y **botones**, reutilizar clases `Button` o un componente `NavLinkItem` compartido.
