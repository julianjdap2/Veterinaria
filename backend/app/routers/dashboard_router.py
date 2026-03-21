from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.security.dependencies import get_current_user
from app.security.feature_flags import require_feature
from app.schemas.common_schema import PaginatedResponse
from app.schemas.dashboard_schema import DashboardNotificationLog, DashboardResumenResponse
from app.services.dashboard_service import get_dashboard_resumen_service, list_dashboard_notificaciones_service


router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/resumen",
    response_model=DashboardResumenResponse,
    summary="Resumen dashboard",
    description="Métricas operativas de citas y espera para la empresa actual.",
)
def get_resumen(
    dias: int = Query(default=1, ge=1, le=30, description="Periodo en días para métricas acumuladas (1, 7, 30)."),
    db: Session = Depends(get_db),
    _feature=Depends(require_feature("modulo_reportes")),
    current_user=Depends(get_current_user),
):
    return get_dashboard_resumen_service(db=db, empresa_id=current_user.empresa_id, dias=dias)


@router.get(
    "/notificaciones",
    response_model=PaginatedResponse[DashboardNotificationLog],
    summary="Trazabilidad de notificaciones",
    description="Lista de intentos de notificación (email/sms/whatsapp) por empresa y periodo.",
)
def get_notificaciones(
    dias: int = Query(default=1, ge=1, le=30),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=1, le=500),
    canal: str | None = Query(default=None),
    estado: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _feature=Depends(require_feature("modulo_reportes")),
    current_user=Depends(get_current_user),
):
    items, total = list_dashboard_notificaciones_service(
        db=db,
        empresa_id=current_user.empresa_id,
        dias=dias,
        page=page,
        page_size=page_size,
        canal=canal,
        estado=estado,
    )
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)
