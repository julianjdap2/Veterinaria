"""
citas_router.py

Endpoints para gestión de citas/agenda. Todas las operaciones
están acotadas por la empresa del usuario autenticado.
"""

from datetime import datetime, date
import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.security.dependencies import get_current_user
from app.security.roles import require_roles
from app.security.usuario_operativo import (
    assert_disponibilidad_agenda,
    assert_puede_ver_cita_agenda,
    require_acceso_consultorio_user,
)
from app.security.admin_permissions import require_admin_permission
from app.schemas.cita_schema import (
    CitaCreate,
    CitaResponse,
    CitaUpdate,
    CitasDisponibilidadResponse,
    CitaLlegadaCreate,
    ListaEsperaCreate,
    ListaEsperaResponse,
)
from app.schemas.extras_clinicos_schema import pop_extras_a_json_column
from app.schemas.common_schema import PaginatedResponse
from app.schemas.formula_schema import FormulaItemCreate, FormulaItemResponse
from app.repositories.formula_repository import (
    listar_por_cita,
    crear_item_cita,
    eliminar_item_cita,
)
from app.services.cita_service import (
    crear_cita_service,
    crear_cita_llegada_automatica_service,
    crear_lista_espera_service,
    listar_lista_espera_service,
    promover_lista_espera_service,
    descartar_lista_espera_service,
    llamar_lista_espera_service,
    promover_siguiente_lista_espera_service,
    listar_citas_mascota_service,
    listar_citas_agenda_service,
    listar_citas_disponibilidad_service,
    obtener_cita_service,
    actualizar_cita_service,
    citas_a_respuestas,
    cita_a_respuesta,
)

router = APIRouter(prefix="/citas", tags=["Citas"])


def _cita_payload_a_orm(d: dict) -> dict:
    pop_extras_a_json_column(d, "extras_clinicos", "extras_clinicos_json")
    if "encargados_ids" in d:
        raw = d.pop("encargados_ids") or []
        if isinstance(raw, list):
            vals: list[int] = []
            for x in raw:
                try:
                    vals.append(int(x))
                except (TypeError, ValueError):
                    continue
            d["encargados_json"] = json.dumps(sorted(set(vals)))
    return d


@router.post(
    "/",
    response_model=CitaResponse,
    summary="Crear cita",
    description="Registra una nueva cita para una mascota. Solo ADMIN y RECEPCIÓN.",
)
def crear_cita(
    payload: CitaCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(1, 3)),  # ADMIN, RECEPCION
    _perm=Depends(require_admin_permission("admin_gestion_citas")),
):
    """Crea una cita asociada a una mascota de la empresa."""
    c = crear_cita_service(
        db, _cita_payload_a_orm(payload.model_dump()), current_user.empresa_id, actor=current_user
    )
    return cita_a_respuesta(db, c)


@router.post(
    "/llegada",
    response_model=CitaResponse,
    summary="Crear cita por orden de llegada",
    description="Asigna automáticamente el veterinario y el slot más cercano desde la hora actual/llegada.",
)
def crear_cita_llegada(
    payload: CitaLlegadaCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(1, 3)),
    _perm=Depends(require_admin_permission("admin_gestion_citas")),
):
    c = crear_cita_llegada_automatica_service(
        db=db,
        datos=_cita_payload_a_orm(payload.model_dump()),
        empresa_id=current_user.empresa_id,
        actor=current_user,
    )
    return cita_a_respuesta(db, c)


@router.post(
    "/waitlist",
    response_model=ListaEsperaResponse,
    summary="Crear entrada en lista de espera",
    description="Agrega una solicitud para un slot ocupado en la agenda.",
)
def crear_waitlist(
    payload: ListaEsperaCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(1, 3)),
    _perm=Depends(require_admin_permission("admin_gestion_citas")),
):
    return crear_lista_espera_service(db=db, datos=payload.model_dump(), empresa_id=current_user.empresa_id)


@router.get(
    "/waitlist",
    response_model=list[ListaEsperaResponse],
    summary="Listar lista de espera",
    description="Lista entradas pendientes de lista de espera por fecha y veterinario.",
)
def listar_waitlist(
    fecha: date,
    veterinario_id: int | None = None,
    procesadas: bool = False,
    solo_urgentes: bool = False,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(1, 3)),
    _perm=Depends(require_admin_permission("admin_gestion_citas")),
):
    return listar_lista_espera_service(
        db=db,
        empresa_id=current_user.empresa_id,
        fecha=fecha,
        veterinario_id=veterinario_id,
        procesadas=procesadas,
        solo_urgentes=solo_urgentes,
    )


@router.post(
    "/waitlist/{entry_id}/promover",
    response_model=ListaEsperaResponse,
    summary="Promover entrada de lista de espera",
    description="Intenta crear una cita para la entrada seleccionada. Si el slot está ocupado, retorna conflicto.",
)
def promover_waitlist(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(1, 3)),
    _perm=Depends(require_admin_permission("admin_gestion_citas")),
):
    return promover_lista_espera_service(
        db=db,
        empresa_id=current_user.empresa_id,
        entry_id=entry_id,
    )


@router.post(
    "/waitlist/{entry_id}/descartar",
    response_model=ListaEsperaResponse,
    summary="Descartar entrada de lista de espera",
    description="Marca una entrada de lista de espera como procesada sin crear cita.",
)
def descartar_waitlist(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(1, 3)),
    _perm=Depends(require_admin_permission("admin_gestion_citas")),
):
    return descartar_lista_espera_service(
        db=db,
        empresa_id=current_user.empresa_id,
        entry_id=entry_id,
    )


@router.post(
    "/waitlist/{entry_id}/llamar",
    response_model=ListaEsperaResponse,
    summary="Marcar entrada como llamada",
    description="Marca una entrada de lista de espera como llamada (check-in de espera).",
)
def llamar_waitlist(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(1, 3)),
    _perm=Depends(require_admin_permission("admin_gestion_citas")),
):
    return llamar_lista_espera_service(
        db=db,
        empresa_id=current_user.empresa_id,
        entry_id=entry_id,
    )


@router.post(
    "/waitlist/promover-siguiente",
    response_model=ListaEsperaResponse,
    summary="Promover siguiente de lista de espera",
    description="Promueve automáticamente el siguiente por urgencia y orden de llegada.",
)
def promover_siguiente_waitlist(
    fecha: date,
    veterinario_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(1, 3)),
    _perm=Depends(require_admin_permission("admin_gestion_citas")),
):
    return promover_siguiente_lista_espera_service(
        db=db,
        empresa_id=current_user.empresa_id,
        fecha=fecha,
        veterinario_id=veterinario_id,
    )


@router.get(
    "/mascota/{mascota_id}",
    response_model=list[CitaResponse],
    summary="Historial de citas de una mascota",
)
def listar_citas_por_mascota(
    mascota_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_acceso_consultorio_user),
):
    """Lista todas las citas de una mascota de la empresa."""
    items = listar_citas_mascota_service(db, mascota_id, current_user.empresa_id)
    return citas_a_respuestas(db, items)


@router.get(
    "/agenda",
    response_model=PaginatedResponse[CitaResponse],
    summary="Listar citas (agenda)",
    description="Lista citas de la empresa. Filtros: fecha_desde, fecha_hasta, estado, veterinario_id (para 'Mis citas').",
)
def listar_agenda(
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
    estado: Optional[str] = None,
    veterinario_id: Optional[int] = None,
    en_sala_espera: Optional[bool] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Devuelve citas con items, total, page y page_size."""
    items, total = listar_citas_agenda_service(
        db=db,
        empresa_id=current_user.empresa_id,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        page=page,
        page_size=page_size,
        estado=estado,
        veterinario_id=veterinario_id,
        en_sala_espera=en_sala_espera,
        current_user=current_user,
    )
    return PaginatedResponse(
        items=citas_a_respuestas(db, items),
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/disponibilidad",
    response_model=CitasDisponibilidadResponse,
    summary="Disponibilidad de horarios (slots de 30 min)",
    description="Devuelve slots disponibles y reservados para una fecha y un veterinario.",
)
def disponibilidad_citas(
    fecha: date,
    veterinario_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    assert_disponibilidad_agenda(veterinario_id, current_user)
    empresa_id = current_user.empresa_id
    disponible, reservado = listar_citas_disponibilidad_service(
        db=db,
        empresa_id=empresa_id,
        fecha=fecha,
        veterinario_id=veterinario_id,
    )
    return CitasDisponibilidadResponse(
        fecha=fecha,
        veterinario_id=veterinario_id,
        disponible=disponible,
        reservado=reservado,
    )


_formula_cita_escribir = require_roles(1, 2)  # admin, vet: seleccionar medicamentos a recetar en la cita


@router.get("/{cita_id}/formula", response_model=list[FormulaItemResponse])
def listar_formula_cita_endpoint(
    cita_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Lista los medicamentos a recetar (prescripción) de la cita."""
    c = obtener_cita_service(db, cita_id, current_user.empresa_id)
    assert_puede_ver_cita_agenda(c.veterinario_id, current_user)
    items = listar_por_cita(db, cita_id, current_user.empresa_id)
    out = []
    for it in items:
        data = FormulaItemResponse.model_validate(it)
        if hasattr(it, "producto") and it.producto:
            data.producto_nombre = it.producto.nombre
        else:
            data.producto_nombre = None
        out.append(data)
    return out


@router.post("/{cita_id}/formula", response_model=FormulaItemResponse, status_code=201)
def agregar_item_formula_cita(
    cita_id: int,
    payload: FormulaItemCreate,
    db: Session = Depends(get_db),
    current_user=Depends(_formula_cita_escribir),
):
    """Añade un medicamento a recetar en la cita (veterinario)."""
    c = obtener_cita_service(db, cita_id, current_user.empresa_id)
    assert_puede_ver_cita_agenda(c.veterinario_id, current_user)
    item = crear_item_cita(
        db=db,
        cita_id=cita_id,
        empresa_id=current_user.empresa_id,
        datos=payload.model_dump(),
    )
    if not item:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    resp = FormulaItemResponse.model_validate(item)
    if item.producto:
        resp.producto_nombre = item.producto.nombre
    return resp


@router.delete("/{cita_id}/formula/{item_id}", status_code=204)
def quitar_item_formula_cita(
    cita_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(_formula_cita_escribir),
):
    """Quita un medicamento de la prescripción de la cita."""
    c = obtener_cita_service(db, cita_id, current_user.empresa_id)
    assert_puede_ver_cita_agenda(c.veterinario_id, current_user)
    ok = eliminar_item_cita(db, item_id, current_user.empresa_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Ítem no encontrado")
    return None


@router.get(
    "/{cita_id}",
    response_model=CitaResponse,
    summary="Obtener cita por ID",
)
def obtener_cita(
    cita_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Obtiene el detalle de una cita (solo si pertenece a la empresa)."""
    c = obtener_cita_service(db, cita_id, current_user.empresa_id)
    assert_puede_ver_cita_agenda(c.veterinario_id, current_user)
    return cita_a_respuesta(db, c)


@router.patch(
    "/{cita_id}",
    response_model=CitaResponse,
    summary="Actualizar cita",
    description="Actualiza estado, fecha o motivo de una cita.",
)
def actualizar_cita(
    cita_id: int,
    payload: CitaUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(1, 3)),  # ADMIN, RECEPCION
    _perm=Depends(require_admin_permission("admin_gestion_citas")),
):
    """Actualiza una cita. Solo campos enviados son modificados."""
    datos = _cita_payload_a_orm(payload.model_dump(exclude_unset=True))
    c = actualizar_cita_service(db, cita_id, current_user.empresa_id, datos, current_user)
    return cita_a_respuesta(db, c)
