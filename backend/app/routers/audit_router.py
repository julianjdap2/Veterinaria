"""
audit_router.py

Consulta de logs de auditoría. Solo ADMIN.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.security.roles import require_roles
from app.repositories.audit_repository import listar_audit_logs
from app.schemas.audit_schema import AuditLogResponse
from app.schemas.common_schema import PaginatedResponse

router = APIRouter(prefix="/audit", tags=["Auditoría"])


@router.get(
    "/",
    response_model=PaginatedResponse[AuditLogResponse],
    summary="Listar logs de auditoría",
    description="Solo ADMIN. Filtros: tabla, usuario_id, fecha_desde, fecha_hasta.",
)
def listar_audit(
    tabla: Optional[str] = None,
    usuario_id: Optional[int] = None,
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(1)),
):
    items, total = listar_audit_logs(
        db,
        tabla=tabla,
        usuario_id=usuario_id,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        page=page,
        page_size=page_size,
    )
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)
