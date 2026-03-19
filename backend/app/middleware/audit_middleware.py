from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.utils.audit_context import set_audit_context, clear_audit_context


class AuditMiddleware(BaseHTTPMiddleware):
    """
    Middleware que garantiza que siempre exista un contexto de auditoría
    (aunque el request no pase por autenticación).
    """

    async def dispatch(self, request: Request, call_next):
        try:
            ip = None

            if request.headers.get("x-forwarded-for"):
                ip = request.headers.get("x-forwarded-for").split(",")[0].strip()
            elif request.client:
                ip = request.client.host

            # Si la autenticación luego establece el usuario, solo se
            # sobrescribirá el user_id, manteniendo la IP.
            set_audit_context(user_id=None, ip=ip)

        except Exception as e:
            import logging
            logging.getLogger(__name__).warning("Error capturando IP: %s", e)

        try:
            response = await call_next(request)
        finally:
            # Asegurarse de limpiar el contexto al finalizar el request
            clear_audit_context()

        return response