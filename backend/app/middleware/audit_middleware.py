from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from sqlalchemy.orm import Session

from app.database.database import SessionLocal
from app.repositories.audit_repository import create_audit_log


class AuditMiddleware(BaseHTTPMiddleware):

    async def dispatch(self, request: Request, call_next):

        response = await call_next(request)

        # Solo registrar acciones importantes
        if request.method in ["POST", "PUT", "DELETE"]:

            try:
                db: Session = SessionLocal()

                # Obtener usuario desde el token (si existe)
                user = getattr(request.state, "user", None)

                usuario_id = None
                if user:
                    usuario_id = user.id

                modulo = request.url.path
                accion = request.method

                registrar_log(
                    db=db,
                    usuario_id=usuario_id,
                    accion=accion,
                    modulo=modulo,
                    registro_id=None,
                    descripcion=f"{accion} en {modulo}"
                )

                db.close()

            except Exception:
                # Nunca romper la API por un error de auditoría
                pass

        return response