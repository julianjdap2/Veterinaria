"""Datos de suscripción SaaS para la empresa autenticada."""

from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models.empresa import Empresa
from app.models.plan import Plan
from app.schemas.empresa_suscripcion_schema import PlanCatalogoItem, SuscripcionTenantResponse


def obtener_vista_suscripcion_tenant(db: Session, empresa_id: int) -> SuscripcionTenantResponse:
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise ApiError(code="empresa_not_found", message="Empresa no encontrada", status_code=404)

    catalogo_rows = db.query(Plan).order_by(Plan.precio.asc()).all()
    planes_catalogo = [PlanCatalogoItem.model_validate(p) for p in catalogo_rows]

    plan_actual: PlanCatalogoItem | None = None
    if empresa.plan_id:
        p = db.query(Plan).filter(Plan.id == empresa.plan_id).first()
        if p:
            plan_actual = PlanCatalogoItem.model_validate(p)

    return SuscripcionTenantResponse(
        empresa_nombre=empresa.nombre or "",
        empresa_estado=empresa.estado or "activa",
        plan_actual_id=empresa.plan_id,
        plan_actual=plan_actual,
        planes_catalogo=planes_catalogo,
    )
