from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.database.database import get_db
from app.models.empresa import Empresa
from app.models.empresa_configuracion import EmpresaConfiguracion
from app.models.plan import Plan
from app.security.dependencies import get_current_user


def assert_empresa_feature(db: Session, empresa_id: int, feature_field: str) -> None:
    """
    Misma regla que `require_feature`, para usar dentro de un endpoint que ya resolvió rol/DB.
    """
    cfg = (
        db.query(EmpresaConfiguracion)
        .filter(EmpresaConfiguracion.empresa_id == empresa_id)
        .first()
    )
    if cfg is not None and hasattr(cfg, feature_field):
        if not bool(getattr(cfg, feature_field)):
            raise ApiError(
                code="feature_disabled",
                message="Este módulo/funcionalidad está deshabilitado para tu empresa",
                status_code=403,
            )
        return

    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    plan = db.query(Plan).filter(Plan.id == empresa.plan_id).first() if empresa else None
    if plan is not None and hasattr(plan, feature_field):
        if not bool(getattr(plan, feature_field)):
            raise ApiError(
                code="feature_disabled_plan",
                message="Este módulo/funcionalidad no está disponible en tu plan",
                status_code=403,
            )


def require_feature(feature_field: str):
    """Valida feature flag por empresa con fallback al plan."""

    def checker(
        current_user=Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        # Superadmin bypass
        if current_user.rol_id == 4:
            return current_user

        cfg = (
            db.query(EmpresaConfiguracion)
            .filter(EmpresaConfiguracion.empresa_id == current_user.empresa_id)
            .first()
        )
        if cfg is not None and hasattr(cfg, feature_field):
            enabled = bool(getattr(cfg, feature_field))
            if not enabled:
                raise ApiError(
                    code="feature_disabled",
                    message="Este módulo/funcionalidad está deshabilitado para tu empresa",
                    status_code=403,
                )
            return current_user

        empresa = db.query(Empresa).filter(Empresa.id == current_user.empresa_id).first()
        plan = db.query(Plan).filter(Plan.id == empresa.plan_id).first() if empresa else None
        if plan is not None and hasattr(plan, feature_field):
            enabled = bool(getattr(plan, feature_field))
            if not enabled:
                raise ApiError(
                    code="feature_disabled_plan",
                    message="Este módulo/funcionalidad no está disponible en tu plan",
                    status_code=403,
                )
        return current_user

    return checker
