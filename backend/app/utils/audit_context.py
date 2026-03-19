from contextvars import ContextVar

# Contexto global por request para auditoría.
# Se usa en eventos de SQLAlchemy para resolver el usuario e IP actuales
# sin acoplarse a la sesión concreta.

current_user_id: ContextVar[int | None] = ContextVar("current_user_id", default=None)
current_ip: ContextVar[str | None] = ContextVar("current_ip", default=None)


def set_audit_context(user_id: int | None, ip: str | None) -> None:
    """
    Establece el contexto de auditoría para el request actual.
    """
    current_user_id.set(user_id)
    current_ip.set(ip)


def clear_audit_context() -> None:
    """
    Limpia el contexto de auditoría al finalizar el request.
    """
    current_user_id.set(None)
    current_ip.set(None)