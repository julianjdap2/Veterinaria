"""
Cuotas numéricas del plan SaaS (mascotas activas, citas por mes calendario).

Los límites vienen de `planes`; `null` en el plan significa sin tope.
"""

from datetime import datetime

from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models.empresa import Empresa
from app.models.plan import Plan


def _obtener_plan_por_empresa(db: Session, empresa_id: int) -> Plan:
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise ApiError(
            code="empresa_not_found",
            message="Empresa no encontrada",
            status_code=404,
        )
    plan = db.query(Plan).filter(Plan.id == empresa.plan_id).first()
    if not plan:
        raise ApiError(
            code="plan_not_found",
            message="Plan asociado a la empresa no encontrado",
            status_code=500,
        )
    return plan


def verificar_limite_mascotas_activas(db: Session, empresa_id: int) -> None:
    """
    Impide crear o reactivar mascotas si las activas ya alcanzaron plan.max_mascotas.
    """
    from app.repositories import mascota_repository

    plan = _obtener_plan_por_empresa(db, empresa_id)
    if plan.max_mascotas is None:
        return
    total = mascota_repository.count_mascotas_por_empresa(
        db, empresa_id, solo_activas=True
    )
    if total >= plan.max_mascotas:
        raise ApiError(
            code="plan_pet_limit_reached",
            message="Límite de mascotas activas alcanzado para el plan",
            status_code=400,
        )


def verificar_limite_citas_mes(
    db: Session,
    empresa_id: int,
    fecha_cita: datetime,
    *,
    exclude_cita_id: int | None = None,
) -> None:
    """
    Citas no canceladas cuyo `fecha` cae en el mismo mes calendario que `fecha_cita`
    (año/mes); al crear, `exclude_cita_id` debe ser None; al mover de mes, excluir el id.
    """
    from app.repositories.cita_repository import count_citas_empresa_en_mes

    plan = _obtener_plan_por_empresa(db, empresa_id)
    if plan.max_citas_mes is None:
        return
    y, m = fecha_cita.year, fecha_cita.month
    cnt = count_citas_empresa_en_mes(
        db, empresa_id, y, m, exclude_cita_id=exclude_cita_id
    )
    if cnt >= plan.max_citas_mes:
        raise ApiError(
            code="plan_cita_month_limit_reached",
            message="Límite de citas del mes alcanzado para el plan",
            status_code=400,
        )
