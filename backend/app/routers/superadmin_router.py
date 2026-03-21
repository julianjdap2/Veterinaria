from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.empresa import Empresa
from app.models.empresa_admin_permiso import EmpresaAdminPermiso
from app.models.empresa_perfil_admin import EmpresaPerfilAdmin
from app.models.empresa_configuracion import EmpresaConfiguracion
from app.models.plan import Plan
from app.schemas.common_schema import PaginatedResponse
from app.schemas.superadmin_schema import (
    EmpresaConfiguracionPayload,
    EmpresaConfiguracionResponse,
    EmpresaCreatePayload,
    EmpresaAdminPermisosPayload,
    EmpresaPermisosResponse,
    EmpresaSuperadminResponse,
    EmpresaUpdatePayload,
    PlanCreatePayload,
    PlanResponse,
    PlanUpdatePayload,
    EmpresaPerfilAdminCreate,
    EmpresaPerfilAdminUpdate,
    EmpresaPerfilAdminResponse,
)
from app.security.roles import require_roles
from app.security.admin_permissions import ADMIN_PERMISSION_FIELDS

router = APIRouter(prefix="/superadmin", tags=["Superadmin"])


@router.get("/empresas", response_model=PaginatedResponse[EmpresaSuperadminResponse])
def listar_empresas(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(4)),
):
    _ = current_user
    q = db.query(Empresa)
    total = q.count()
    items = q.order_by(Empresa.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)


@router.post("/empresas", response_model=EmpresaSuperadminResponse, status_code=201)
def crear_empresa(
    payload: EmpresaCreatePayload,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(4)),
):
    _ = current_user
    empresa = Empresa(
        nombre=payload.nombre.strip(),
        nit=payload.nit,
        telefono=payload.telefono,
        email=payload.email,
        direccion=payload.direccion,
        plan_id=payload.plan_id,
        estado=payload.estado,
        activa=payload.activa,
    )
    db.add(empresa)
    db.commit()
    db.refresh(empresa)
    return empresa


@router.patch("/empresas/{empresa_id}", response_model=EmpresaSuperadminResponse)
def patch_empresa(
    empresa_id: int,
    payload: EmpresaUpdatePayload,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(4)),
):
    _ = current_user
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        from app.core.errors import ApiError
        raise ApiError(code="empresa_not_found", message="Empresa no encontrada", status_code=404)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(empresa, k, v)
    db.add(empresa)
    db.commit()
    db.refresh(empresa)
    return empresa


@router.delete("/empresas/{empresa_id}", response_model=EmpresaSuperadminResponse)
def soft_delete_empresa(
    empresa_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(4)),
):
    _ = current_user
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        from app.core.errors import ApiError
        raise ApiError(code="empresa_not_found", message="Empresa no encontrada", status_code=404)
    from datetime import datetime
    empresa.deleted_at = datetime.now()
    empresa.activa = False
    empresa.estado = "suspendida"
    db.add(empresa)
    db.commit()
    db.refresh(empresa)
    return empresa


@router.get("/empresas/{empresa_id}/permisos-admin", response_model=EmpresaPermisosResponse)
def get_permisos_admin_empresa(
    empresa_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(4)),
):
    _ = current_user
    rec = db.query(EmpresaAdminPermiso).filter(EmpresaAdminPermiso.empresa_id == empresa_id).first()
    if rec is None:
        rec = EmpresaAdminPermiso(empresa_id=empresa_id)
        db.add(rec)
        db.commit()
        db.refresh(rec)
    return {
        "empresa_id": empresa_id,
        **{k: bool(getattr(rec, k, True)) for k in ADMIN_PERMISSION_FIELDS},
    }


@router.patch("/empresas/{empresa_id}/permisos-admin", response_model=EmpresaPermisosResponse)
def patch_permisos_admin_empresa(
    empresa_id: int,
    payload: EmpresaAdminPermisosPayload,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(4)),
):
    _ = current_user
    rec = db.query(EmpresaAdminPermiso).filter(EmpresaAdminPermiso.empresa_id == empresa_id).first()
    if rec is None:
        rec = EmpresaAdminPermiso(empresa_id=empresa_id)
        db.add(rec)

    data = payload.model_dump()
    for k, v in data.items():
        setattr(rec, k, bool(v))
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return {"empresa_id": empresa_id, **data}


def _aplicar_overrides_perfil(perfil: EmpresaPerfilAdmin, overrides: dict) -> None:
    for k, v in overrides.items():
        if k in ADMIN_PERMISSION_FIELDS and v is not None:
            setattr(perfil, k, bool(v))


@router.get(
    "/empresas/{empresa_id}/perfiles-admin",
    response_model=list[EmpresaPerfilAdminResponse],
    summary="Listar perfiles admin de la empresa",
)
def listar_perfiles_admin(
    empresa_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(4)),
):
    _ = current_user
    return (
        db.query(EmpresaPerfilAdmin)
        .filter(EmpresaPerfilAdmin.empresa_id == empresa_id)
        .order_by(EmpresaPerfilAdmin.nombre.asc())
        .all()
    )


@router.post(
    "/empresas/{empresa_id}/perfiles-admin",
    response_model=EmpresaPerfilAdminResponse,
    status_code=201,
    summary="Crear perfil admin (plantilla + overrides)",
)
def crear_perfil_admin(
    empresa_id: int,
    payload: EmpresaPerfilAdminCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(4)),
):
    _ = current_user
    slug = payload.slug.strip().lower()
    dup = (
        db.query(EmpresaPerfilAdmin)
        .filter(EmpresaPerfilAdmin.empresa_id == empresa_id, EmpresaPerfilAdmin.slug == slug)
        .first()
    )
    if dup:
        from app.core.errors import ApiError
        raise ApiError(code="perfil_slug_duplicado", message="Ya existe un perfil con ese slug en la empresa", status_code=400)
    perfil = EmpresaPerfilAdmin(empresa_id=empresa_id, nombre=payload.nombre.strip(), slug=slug)
    _aplicar_overrides_perfil(perfil, payload.overrides.model_dump(exclude_unset=True))
    db.add(perfil)
    db.commit()
    db.refresh(perfil)
    return perfil


@router.patch(
    "/empresas/{empresa_id}/perfiles-admin/{perfil_id}",
    response_model=EmpresaPerfilAdminResponse,
)
def patch_perfil_admin(
    empresa_id: int,
    perfil_id: int,
    payload: EmpresaPerfilAdminUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(4)),
):
    _ = current_user
    perfil = (
        db.query(EmpresaPerfilAdmin)
        .filter(EmpresaPerfilAdmin.id == perfil_id, EmpresaPerfilAdmin.empresa_id == empresa_id)
        .first()
    )
    if not perfil:
        from app.core.errors import ApiError
        raise ApiError(code="perfil_not_found", message="Perfil no encontrado", status_code=404)
    if payload.nombre is not None:
        perfil.nombre = payload.nombre.strip()
    if payload.slug is not None:
        slug = payload.slug.strip().lower()
        dup = (
            db.query(EmpresaPerfilAdmin)
            .filter(
                EmpresaPerfilAdmin.empresa_id == empresa_id,
                EmpresaPerfilAdmin.slug == slug,
                EmpresaPerfilAdmin.id != perfil_id,
            )
            .first()
        )
        if dup:
            from app.core.errors import ApiError
            raise ApiError(code="perfil_slug_duplicado", message="Ya existe un perfil con ese slug", status_code=400)
        perfil.slug = slug
    if payload.overrides is not None:
        for k, v in payload.overrides.items():
            if k in ADMIN_PERMISSION_FIELDS:
                setattr(perfil, k, v)
    db.add(perfil)
    db.commit()
    db.refresh(perfil)
    return perfil


@router.delete(
    "/empresas/{empresa_id}/perfiles-admin/{perfil_id}",
    status_code=204,
)
def borrar_perfil_admin(
    empresa_id: int,
    perfil_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(4)),
):
    _ = current_user
    perfil = (
        db.query(EmpresaPerfilAdmin)
        .filter(EmpresaPerfilAdmin.id == perfil_id, EmpresaPerfilAdmin.empresa_id == empresa_id)
        .first()
    )
    if not perfil:
        from app.core.errors import ApiError
        raise ApiError(code="perfil_not_found", message="Perfil no encontrado", status_code=404)
    db.delete(perfil)
    db.commit()
    return Response(status_code=204)


@router.get("/empresas/{empresa_id}/config", response_model=EmpresaConfiguracionResponse)
def get_config_empresa(
    empresa_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(4)),
):
    _ = current_user
    rec = db.query(EmpresaConfiguracion).filter(EmpresaConfiguracion.empresa_id == empresa_id).first()
    if rec is None:
        rec = EmpresaConfiguracion(empresa_id=empresa_id)
        db.add(rec)
        db.commit()
        db.refresh(rec)
    data = EmpresaConfiguracionResponse.model_validate(rec).model_dump()
    data["empresa_id"] = empresa_id
    return data


@router.patch("/empresas/{empresa_id}/config", response_model=EmpresaConfiguracionResponse)
def patch_config_empresa(
    empresa_id: int,
    payload: EmpresaConfiguracionPayload,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(4)),
):
    _ = current_user
    rec = db.query(EmpresaConfiguracion).filter(EmpresaConfiguracion.empresa_id == empresa_id).first()
    if rec is None:
        rec = EmpresaConfiguracion(empresa_id=empresa_id)
        db.add(rec)
    for k, v in payload.model_dump().items():
        setattr(rec, k, v)
    db.add(rec)
    db.commit()
    db.refresh(rec)
    data = EmpresaConfiguracionResponse.model_validate(rec).model_dump()
    data["empresa_id"] = empresa_id
    return data


@router.get("/planes", response_model=list[PlanResponse])
def listar_planes(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(4)),
):
    _ = current_user
    return db.query(Plan).order_by(Plan.id.asc()).all()


@router.post("/planes", response_model=PlanResponse, status_code=201)
def crear_plan(
    payload: PlanCreatePayload,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(4)),
):
    _ = current_user
    p = Plan(**payload.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.patch("/planes/{plan_id}", response_model=PlanResponse)
def patch_plan(
    plan_id: int,
    payload: PlanUpdatePayload,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(4)),
):
    _ = current_user
    p = db.query(Plan).filter(Plan.id == plan_id).first()
    if not p:
        from app.core.errors import ApiError
        raise ApiError(code="plan_not_found", message="Plan no encontrado", status_code=404)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p
