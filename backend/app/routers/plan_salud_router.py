"""Planes de salud (paquetes) y afiliaciones por clínica."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.database.database import get_db
from app.security.dependencies import get_current_user
from app.security.roles import require_roles
from app.schemas.plan_salud_schema import (
    AfiliacionCreate,
    AfiliacionMascotaActivaResponse,
    AfiliacionResponse,
    AfiliacionUpdate,
    CoberturaCategoriaItem,
    EstadoCuentaResponse,
    ModuloPlanSaludPatch,
    PlanSaludCreate,
    PlanSaludMetaResponse,
    PlanSaludResponse,
    PlanSaludUpdate,
)
from app.services.plan_salud_service import (
    COBERTURA_CATEGORIAS,
    actualizar_afiliacion,
    actualizar_plan,
    afiliacion_activa_por_mascota,
    crear_afiliacion,
    crear_plan,
    eliminar_afiliacion,
    eliminar_plan,
    estado_cuenta,
    listar_afiliaciones,
    listar_planes,
    obtener_modulo_habilitado,
    obtener_plan,
    set_modulo_habilitado,
)

router = APIRouter(prefix="/planes-salud", tags=["Planes de salud"])

_read = require_roles(1, 2, 3)
_admin = require_roles(1)


@router.get("/meta", response_model=PlanSaludMetaResponse)
def meta_planes_salud(
    db: Session = Depends(get_db),
    current_user=Depends(_read),
):
    return PlanSaludMetaResponse(
        modulo_habilitado=obtener_modulo_habilitado(db, current_user.empresa_id),
        categorias=[CoberturaCategoriaItem(codigo=c, label=l) for c, l in COBERTURA_CATEGORIAS],
        periodicidades_meses=[1, 3, 6, 12],
    )


@router.patch("/modulo", response_model=PlanSaludMetaResponse)
def patch_modulo_planes_salud(
    payload: ModuloPlanSaludPatch,
    db: Session = Depends(get_db),
    current_user=Depends(_admin),
):
    set_modulo_habilitado(db, current_user.empresa_id, payload.habilitado)
    return PlanSaludMetaResponse(
        modulo_habilitado=payload.habilitado,
        categorias=[CoberturaCategoriaItem(codigo=c, label=l) for c, l in COBERTURA_CATEGORIAS],
        periodicidades_meses=[1, 3, 6, 12],
    )


@router.get("/", response_model=list[PlanSaludResponse])
def get_planes(
    db: Session = Depends(get_db),
    current_user=Depends(_read),
    incluir_inactivos: bool = Query(False),
):
    if not obtener_modulo_habilitado(db, current_user.empresa_id):
        return []
    return listar_planes(db, current_user.empresa_id, solo_activos=not incluir_inactivos)


@router.post("/", response_model=PlanSaludResponse)
def post_plan(
    payload: PlanSaludCreate,
    db: Session = Depends(get_db),
    current_user=Depends(_admin),
):
    return crear_plan(db, current_user.empresa_id, payload)


@router.get("/afiliaciones/{afiliacion_id}/estado-cuenta", response_model=EstadoCuentaResponse)
def get_estado_cuenta(
    afiliacion_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(_read),
):
    return estado_cuenta(db, afiliacion_id, current_user.empresa_id)


@router.get("/mascota/{mascota_id}/afiliacion-activa", response_model=AfiliacionMascotaActivaResponse)
def get_afiliacion_activa_mascota(
    mascota_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(_read),
):
    return afiliacion_activa_por_mascota(db, mascota_id, current_user.empresa_id)


@router.delete("/afiliaciones/{afiliacion_id}")
def delete_afiliacion_route(
    afiliacion_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(_read),
):
    eliminar_afiliacion(db, afiliacion_id, current_user.empresa_id)
    return {"ok": True}


@router.patch("/afiliaciones/{afiliacion_id}", response_model=AfiliacionResponse)
def patch_afiliacion(
    afiliacion_id: int,
    payload: AfiliacionUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(_read),
):
    return actualizar_afiliacion(db, afiliacion_id, current_user.empresa_id, payload)


@router.get("/{plan_id}", response_model=PlanSaludResponse)
def get_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(_read),
):
    if not obtener_modulo_habilitado(db, current_user.empresa_id):
        raise ApiError(code="modulo_off", message="Módulo deshabilitado", status_code=403)
    return obtener_plan(db, plan_id, current_user.empresa_id)


@router.patch("/{plan_id}", response_model=PlanSaludResponse)
def patch_plan(
    plan_id: int,
    payload: PlanSaludUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(_admin),
):
    return actualizar_plan(db, plan_id, current_user.empresa_id, payload)


@router.delete("/{plan_id}")
def delete_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(_admin),
):
    eliminar_plan(db, plan_id, current_user.empresa_id)
    return {"ok": True}


@router.get("/{plan_id}/afiliaciones", response_model=list[AfiliacionResponse])
def get_afiliaciones(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(_read),
):
    if not obtener_modulo_habilitado(db, current_user.empresa_id):
        return []
    return listar_afiliaciones(db, plan_id, current_user.empresa_id)


@router.post("/{plan_id}/afiliaciones", response_model=AfiliacionResponse)
def post_afiliacion(
    plan_id: int,
    payload: AfiliacionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(_read),
):
    return crear_afiliacion(db, current_user.empresa_id, plan_id, payload)
