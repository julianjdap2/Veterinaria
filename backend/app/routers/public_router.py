"""
Rutas públicas (sin JWT) para marketing y landing.
"""

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.empresa import Empresa
from app.models.empresa_configuracion import EmpresaConfiguracion
from app.core.rate_limit import limiter
from app.core.errors import ApiError
from app.core.recaptcha import recaptcha_configured, verify_recaptcha_v2
from app.schemas.auth_schema import TokenResponse
from app.schemas.public_schema import (
    ActivarRegistroRequest,
    PublicClinicaItem,
    RegistroPublicoRequest,
    RegistroPublicoResponse,
    VinculoConfirmarRequest,
    VinculoConfirmarResponse,
)
from app.security.registro_activation import create_registro_activation_token
from app.services.registro_demo_email import enviar_correo_solicitud_registro
from app.services.registro_publico_service import activar_registro_desde_token, registrar_clinica_y_admin
from app.services.vinculo_invitacion_service import confirmar_vinculo_desde_token

router = APIRouter(prefix="/public", tags=["Público"])


@router.get(
    "/clinicas",
    response_model=list[PublicClinicaItem],
    summary="Clínicas registradas (landing)",
    description="Listado mínimo para carrusel de confianza en la web pública. Sin datos sensibles.",
)
def listar_clinicas_publicas(
    db: Session = Depends(get_db),
    limit: int = Query(default=48, ge=1, le=200),
):
    rows = (
        db.query(Empresa.id, Empresa.nombre, EmpresaConfiguracion.logo_url)
        .outerjoin(EmpresaConfiguracion, EmpresaConfiguracion.empresa_id == Empresa.id)
        .filter(Empresa.activa.is_(True))
        .filter(Empresa.deleted_at.is_(None))
        .filter(Empresa.estado.in_(["activa", "en_prueba"]))
        .order_by(Empresa.id.desc())
        .limit(limit)
        .all()
    )
    return [
        PublicClinicaItem(id=r.id, nombre=(r.nombre or "").strip() or "Clínica", logo_url=r.logo_url)
        for r in rows
    ]


@router.post(
    "/registro",
    response_model=RegistroPublicoResponse,
    summary="Registro de clínica y administrador",
    description="Crea empresa en prueba, configuración y primer usuario admin. Envía correo con enlace de activación (sin login). Limitado por IP.",
)
@limiter.limit("5/minute")
def registro_publico(
    request: Request,
    payload: RegistroPublicoRequest,
    db: Session = Depends(get_db),
):
    _ = request
    if recaptcha_configured():
        tok = (payload.recaptcha_token or "").strip()
        if not tok:
            raise ApiError(
                code="captcha_required",
                message="Completa la verificación «No soy un robot».",
                status_code=400,
            )
        if not verify_recaptcha_v2(tok):
            raise ApiError(
                code="captcha_invalid",
                message="La verificación de seguridad no es válida. Intenta de nuevo.",
                status_code=400,
            )
    nuevo_user_id = registrar_clinica_y_admin(
        db,
        empresa_nombre=payload.empresa_nombre,
        ciudad=payload.ciudad,
        pais=payload.pais,
        tipo_establecimiento=payload.tipo_establecimiento,
        departamento=payload.departamento,
        registro_canal=payload.canal_origen,
        registro_distribuidor=payload.distribuidor,
        usuario_nombre=payload.usuario_nombre,
        usuario_email=payload.usuario_email,
        usuario_telefono=payload.usuario_telefono,
        usuario_password=payload.usuario_password,
    )
    activation_token = create_registro_activation_token(nuevo_user_id)
    enviar_correo_solicitud_registro(
        usuario_email=payload.usuario_email,
        usuario_nombre=payload.usuario_nombre,
        empresa_nombre=payload.empresa_nombre,
        ciudad=payload.ciudad,
        departamento=payload.departamento,
        pais=payload.pais,
        tipo_establecimiento=payload.tipo_establecimiento,
        telefono=payload.usuario_telefono,
        canal_origen=payload.canal_origen,
        distribuidor=payload.distribuidor,
        activation_token=activation_token,
    )
    return RegistroPublicoResponse(
        solicitud_recibida=True,
        message="Solicitud recibida. Revise su correo para continuar con el proceso.",
    )


@router.post(
    "/activar",
    response_model=TokenResponse,
    summary="Activar cuenta desde el enlace del correo",
    description="Intercambia el token del correo por un JWT de sesión (sin formulario de login). Luego el frontend redirige a configuración inicial.",
)
@limiter.limit("15/minute")
def activar_registro_publico(
    request: Request,
    payload: ActivarRegistroRequest,
    db: Session = Depends(get_db),
):
    _ = request
    access_token = activar_registro_desde_token(db, payload.token.strip())
    return TokenResponse(access_token=access_token, token_type="bearer")


@router.post(
    "/vinculos/confirmar",
    response_model=VinculoConfirmarResponse,
    summary="Confirmar acceso completo de clínica (enlace del correo)",
    description="Intercambia el token del correo por vínculo completo entre propietario y clínica. Sin autenticación.",
)
@limiter.limit("20/minute")
def confirmar_vinculo_publico(
    request: Request,
    payload: VinculoConfirmarRequest,
    db: Session = Depends(get_db),
):
    _ = request
    return confirmar_vinculo_desde_token(db, payload.token.strip())
