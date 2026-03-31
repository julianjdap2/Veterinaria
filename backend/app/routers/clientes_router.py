"""
clientes_router.py

Endpoints para gestión de clientes (dueños de mascotas).
Solo se exponen clientes de la empresa del usuario autenticado.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.rate_limit import limiter
from app.database.database import get_db
from app.security.dependencies import get_current_user
from app.security.usuario_operativo import (
    require_cliente_detalle_user,
    require_cliente_mutacion_user,
    require_identidad_o_vinculo_user,
)
from app.schemas.cliente_schema import ClienteCreate, ClienteResponse, ClienteUpdate
from app.schemas.cliente_identidad_schema import (
    ClienteIdentidadBusquedaResponse,
    VinculacionParcialRequest,
    VinculacionPresencialRequest,
    VinculacionResponse,
)
from app.schemas.common_schema import PaginatedResponse
from app.services.cliente_identidad_service import (
    buscar_por_documento_service,
    vincular_parcial_service,
    vincular_presencial_service,
)
from app.services.cliente_service import (
    crear_cliente_service,
    listar_clientes_por_empresa_service,
    obtener_cliente_por_empresa_service,
    desactivar_cliente_service,
    actualizar_activo_cliente_service,
    actualizar_cliente_service,
)

router = APIRouter(prefix="/clientes", tags=["Clientes"])


@router.post(
    "/",
    response_model=ClienteResponse,
    summary="Crear cliente",
    description="Registra un nuevo cliente en la empresa. Solo ADMIN y RECEPCIÓN.",
)
def crear_cliente(
    payload: ClienteCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_cliente_mutacion_user),
):
    """Crea un cliente asociado a la empresa del usuario autenticado."""
    data = payload.model_dump()
    return crear_cliente_service(db, data, current_user.empresa_id)


@router.get(
    "/",
    response_model=PaginatedResponse[ClienteResponse],
    summary="Listar clientes",
    description="Lista clientes de la empresa con paginación y total. Filtros: nombre, documento, busqueda (nombre O documento). incluir_inactivos=true para ver también inactivos.",
)
def listar_clientes(
    page: int = 1,
    page_size: int = 20,
    nombre: str | None = None,
    documento: str | None = None,
    busqueda: str | None = None,
    incluir_inactivos: bool = False,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Devuelve clientes de la empresa con items, total, page y page_size."""
    items, total = listar_clientes_por_empresa_service(
        db=db,
        empresa_id=current_user.empresa_id,
        page=page,
        page_size=page_size,
        solo_activos=not incluir_inactivos,
        nombre=nombre,
        documento=documento,
        busqueda=busqueda,
    )
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)


@router.get(
    "/buscar-identidad",
    response_model=ClienteIdentidadBusquedaResponse,
    summary="Buscar propietario por documento (identidad global)",
    description="Localiza un propietario en todo el sistema. Si no hay vínculo con su clínica, devuelve datos enmascarados. Limitado por IP para mitigar enumeración de documentos.",
)
@limiter.limit("30/minute")
def buscar_identidad_global(
    request: Request,
    documento: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_identidad_o_vinculo_user),
):
    return buscar_por_documento_service(db, documento, current_user.empresa_id)


@router.post(
    "/vinculos/presencial",
    response_model=VinculacionResponse,
    summary="Vincular con verificación presencial (acceso completo)",
)
def vincular_presencial(
    payload: VinculacionPresencialRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_identidad_o_vinculo_user),
):
    return vincular_presencial_service(
        db,
        current_user.empresa_id,
        cliente_id=payload.cliente_id,
        documento=payload.documento,
        telefono=payload.telefono,
        confirmo_consentimiento=payload.confirmo_consentimiento,
        marketing_canal=payload.marketing_canal,
    )


@router.post(
    "/vinculos/parcial",
    response_model=VinculacionResponse,
    summary="Vinculación parcial (operar en clínica; historial completo restringido)",
)
def vincular_parcial(
    payload: VinculacionParcialRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_identidad_o_vinculo_user),
):
    return vincular_parcial_service(
        db,
        current_user.empresa_id,
        cliente_id=payload.cliente_id,
        documento=payload.documento,
        marketing_canal=payload.marketing_canal,
    )


@router.get(
    "/{cliente_id}",
    response_model=ClienteResponse,
    summary="Obtener cliente por ID",
    description="Devuelve un cliente si pertenece a la empresa del usuario.",
)
def obtener_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_cliente_detalle_user),
):
    """Obtiene el detalle de un cliente por id (solo si es de la empresa)."""
    return obtener_cliente_por_empresa_service(
        db=db,
        cliente_id=cliente_id,
        empresa_id=current_user.empresa_id,
    )


@router.patch(
    "/{cliente_id}",
    response_model=ClienteResponse,
    summary="Actualizar cliente",
    description="Actualiza campos del cliente (nombre, teléfono, email, etc. o activo). Solo ADMIN o RECEPCIÓN.",
)
def actualizar_cliente(
    cliente_id: int,
    payload: ClienteUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_cliente_mutacion_user),
):
    """Actualiza los campos enviados (nombre, teléfono, email, direccion, documento, activo)."""
    payload_dict = payload.model_dump(exclude_unset=True)
    if not payload_dict:
        return obtener_cliente_por_empresa_service(
            db=db,
            cliente_id=cliente_id,
            empresa_id=current_user.empresa_id,
        )
    return actualizar_cliente_service(
        db=db,
        cliente_id=cliente_id,
        empresa_id=current_user.empresa_id,
        payload=payload_dict,
    )


@router.delete(
    "/{cliente_id}",
    response_model=ClienteResponse,
    summary="Desactivar cliente (soft delete)",
    description="Marca el cliente como inactivo. Solo ADMIN o RECEPCIÓN.",
)
def desactivar_cliente(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_cliente_mutacion_user),
):
    """Soft delete: marca cliente como inactivo (no borra el registro)."""
    return desactivar_cliente_service(db, cliente_id, current_user.empresa_id)