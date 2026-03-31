"""
Módulo de Historial Clínico / Consultas.
"""

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.security.roles import require_roles
from app.security.usuario_operativo import require_roles_y_consultorio
from app.schemas.consulta_schema import (
    ConsultaCreate,
    ConsultaCreateConFormula,
    ConsultaUpdate,
    ConsultaResponse,
    ConsultaParaVentaResponse,
    ResumenConsultaResponse,
    EnviarResumenBody,
)
from app.schemas.extras_clinicos_schema import pop_extras_a_json_column
from app.repositories.consulta_repository import listar_consultas_por_cliente
from app.repositories.cita_repository import obtener_cita_por_id_y_empresa, actualizar_cita
from app.services.consulta_service import (
    crear_consulta_service,
    crear_consulta_con_formula_service,
    listar_historial_clinico,
    obtener_consulta_detalle,
)
from app.services.resumen_consulta_service import (
    get_resumen_consulta,
    get_resumen_pdf,
    resumen_consulta_como_texto,
)
from app.services.consulta_asistente_service import construir_asistente_clinico
from app.schemas.consulta_asistente_schema import AsistenteClinicoResponse
from app.security.feature_flags import assert_empresa_feature
from app.services.notification_service import notify_resumen_consulta
from app.schemas.formula_schema import FormulaItemCreate, FormulaItemResponse
from app.repositories.formula_repository import (
    listar_por_consulta as listar_formula,
    crear_item as crear_formula_item,
    eliminar_item as eliminar_formula_item,
)

router = APIRouter(prefix="/consultas", tags=["Consultas"])

# Permisos:
# - Todos pueden leer; pero al menos se necesita rol válido para crear consultas y manejar fórmula.
# - El precio se oculta en resumen/PDF para VET según rol (ver resumen_consulta_service).
_formula_escribir = require_roles_y_consultorio(1, 2, 3)

def _consulta_payload_a_orm(d: dict) -> dict:
    pop_extras_a_json_column(d, "extras_clinicos", "extras_clinicos_json")
    return d


@router.post(
    "/{consulta_id}/finalizar",
    status_code=204,
    summary="Finalizar consulta y marcar cita como atendida",
)
def finalizar_consulta(
    consulta_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles_y_consultorio(1, 2)),
):
    consulta = obtener_consulta_detalle(
        db=db,
        consulta_id=consulta_id,
        empresa_id=current_user.empresa_id,
    )
    cita_id = getattr(consulta, "cita_id", None)
    if not cita_id:
        return None

    cita = obtener_cita_por_id_y_empresa(db, cita_id, current_user.empresa_id)
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    if (cita.estado or "").strip() != "revision":
        raise HTTPException(
            status_code=400,
            detail="La cita no está en revisión; no se puede marcar como atendida.",
        )

    actualizar_cita(db, cita, {"estado": "atendida"})
    return None


@router.post("/", response_model=ConsultaResponse)
def crear_consulta(
    payload: ConsultaCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles_y_consultorio(1, 2, 3)),
):
    datos = _consulta_payload_a_orm(payload.model_dump())
    return crear_consulta_service(
        db=db,
        datos=datos,
        veterinario_id=current_user.id,
        empresa_id=current_user.empresa_id,
    )


@router.post(
    "/crear-con-formula",
    response_model=ConsultaResponse,
    summary="Crear consulta y guardar fórmula (atómico)",
)
def crear_consulta_con_formula(
    payload: ConsultaCreateConFormula,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles_y_consultorio(1, 2, 3)),
):
    datos = _consulta_payload_a_orm(payload.model_dump())
    formula_items = datos.pop("formula_items", []) or []
    return crear_consulta_con_formula_service(
        db=db,
        datos=datos,
        veterinario_id=current_user.id,
        empresa_id=current_user.empresa_id,
        formula_items=formula_items,
    )


@router.get(
    "/mascota/{mascota_id}",
    response_model=list[ConsultaResponse],
)
def obtener_historial_clinico(
    mascota_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles_y_consultorio(1, 2, 3)),
):
    return listar_historial_clinico(
        db=db,
        mascota_id=mascota_id,
        empresa_id=current_user.empresa_id,
    )


@router.get(
    "/por-cliente/{cliente_id}",
    response_model=list[ConsultaParaVentaResponse],
    summary="Consultas del cliente (para registrar venta desde fórmula)",
)
def listar_consultas_por_cliente_endpoint(
    cliente_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles_y_consultorio(1, 2, 3)),
):
    """Lista consultas de las mascotas del cliente; el recepcionista elige una para cargar la fórmula."""
    consultas = listar_consultas_por_cliente(
        db=db,
        cliente_id=cliente_id,
        empresa_id=current_user.empresa_id,
    )
    return [
        ConsultaParaVentaResponse(
            id=c.id,
            mascota_id=c.mascota_id,
            mascota_nombre=(c.mascota.nombre if c.mascota else "—"),
            created_at=c.created_at,
        )
        for c in consultas
    ]


@router.get(
    "/{consulta_id}/resumen",
    response_model=ResumenConsultaResponse,
    summary="Resumen estructurado de la consulta",
)
def obtener_resumen_consulta(
    consulta_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles_y_consultorio(1, 2, 3)),
):
    """Devuelve el resumen de la consulta (motivo, diagnóstico, tratamiento, etc.) para mostrar o enviar."""
    mostrar_precio = current_user.rol_id in (1, 3)
    return get_resumen_consulta(
        db=db,
        consulta_id=consulta_id,
        empresa_id=current_user.empresa_id,
        mostrar_precio=mostrar_precio,
    )


@router.get(
    "/{consulta_id}/resumen/pdf",
    response_class=Response,
    summary="Descargar resumen en PDF",
)
def descargar_resumen_pdf(
    consulta_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles_y_consultorio(1, 2, 3)),
):
    """Genera y devuelve el resumen de la consulta en PDF."""
    mostrar_precio = current_user.rol_id in (1, 3)
    pdf_bytes = get_resumen_pdf(
        db=db,
        consulta_id=consulta_id,
        empresa_id=current_user.empresa_id,
        mostrar_precio=mostrar_precio,
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="resumen_consulta_{consulta_id}.pdf"'
        },
    )


@router.get(
    "/{consulta_id}/asistente-clinico",
    response_model=AsistenteClinicoResponse,
    summary="Asistente clínico (checklist y sugerencias por reglas)",
)
def obtener_asistente_clinico(
    consulta_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles_y_consultorio(1, 2, 3)),
):
    """
    Sugerencias orientativas según edad, especie y palabras clave en motivo/diagnóstico.
    Requiere `feature_ia_consultorio` en el plan SaaS de la empresa.
    """
    assert_empresa_feature(db, current_user.empresa_id, "feature_ia_consultorio")
    return construir_asistente_clinico(db, consulta_id, current_user.empresa_id)


@router.post(
    "/{consulta_id}/enviar-resumen",
    status_code=204,
    summary="Enviar resumen por email al cliente",
)
def enviar_resumen_por_email(
    consulta_id: int,
    body: EnviarResumenBody | None = Body(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles_y_consultorio(1, 2, 3)),
):
    """Envía el resumen de la consulta al email del cliente (cuerpo en texto + PDF adjunto)."""
    mostrar_precio = current_user.rol_id in (1, 3)
    resumen = get_resumen_consulta(
        db=db,
        consulta_id=consulta_id,
        empresa_id=current_user.empresa_id,
        mostrar_precio=mostrar_precio,
    )
    to_email = (body and body.to_email and body.to_email.strip()) or resumen.get("cliente_email", "")
    if not to_email:
        raise HTTPException(
            status_code=400,
            detail="No hay email del cliente y no se indicó uno en el cuerpo.",
        )
    texto = resumen_consulta_como_texto(resumen)
    pdf_bytes = get_resumen_pdf(
        db=db,
        consulta_id=consulta_id,
        empresa_id=current_user.empresa_id,
        mostrar_precio=mostrar_precio,
    )
    notify_resumen_consulta(
        email_cliente=to_email,
        nombre_mascota=resumen.get("mascota_nombre", "Consulta"),
        resumen_cuerpo=texto,
        pdf_bytes=pdf_bytes,
    )
    return None


@router.get("/{consulta_id}/formula", response_model=list[FormulaItemResponse])
def listar_formula_consulta(
    consulta_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles_y_consultorio(1, 2, 3)),
):
    """Lista la fórmula médica de la consulta (nombre medicamento, presentación, precio, observación)."""
    mostrar_precio = current_user.rol_id in (1, 3)
    items = listar_formula(db, consulta_id, current_user.empresa_id)
    out = []
    for it in items:
        data = FormulaItemResponse.model_validate(it)
        if hasattr(it, "producto") and it.producto:
            data.producto_nombre = it.producto.nombre
            if mostrar_precio:
                # Si el veterinario no envió precio (porque ocultamos el campo),
                # lo recuperamos desde el inventario para Admin/Recepción.
                data.precio = data.precio if data.precio is not None else it.producto.precio
            else:
                data.precio = None
        else:
            data.producto_nombre = None
            if not mostrar_precio:
                data.precio = None
        out.append(data)
    return out


@router.post("/{consulta_id}/formula", response_model=FormulaItemResponse, status_code=201)
def agregar_item_formula(
    consulta_id: int,
    payload: FormulaItemCreate,
    db: Session = Depends(get_db),
    current_user=Depends(_formula_escribir),
):
    """Añade un medicamento a la fórmula (veterinario)."""
    item = crear_formula_item(
        db=db,
        consulta_id=consulta_id,
        empresa_id=current_user.empresa_id,
        datos=payload.model_dump(),
    )
    if not item:
        raise HTTPException(status_code=404, detail="Consulta no encontrada")
    # Cargar nombre del producto para respuesta
    resp = FormulaItemResponse.model_validate(item)
    if item.producto:
        resp.producto_nombre = item.producto.nombre
    return resp


@router.delete("/{consulta_id}/formula/{item_id}", status_code=204)
def quitar_item_formula(
    consulta_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(_formula_escribir),
):
    """Quita un ítem de la fórmula (veterinario)."""
    ok = eliminar_formula_item(db, item_id, current_user.empresa_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Ítem no encontrado")
    return None


@router.patch("/{consulta_id}", response_model=ConsultaResponse)
def actualizar_consulta_parcial(
    consulta_id: int,
    payload: ConsultaUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles_y_consultorio(1, 2, 3)),
):
    campos = payload.model_dump(exclude_unset=True)
    if not campos:
        consulta = obtener_consulta_detalle(
            db=db,
            consulta_id=consulta_id,
            empresa_id=current_user.empresa_id,
        )
    else:
        consulta = actualizar_consulta_parcial_service(
            db=db,
            consulta_id=consulta_id,
            empresa_id=current_user.empresa_id,
            campos=campos,
        )
    resp = ConsultaResponse.model_validate(consulta)
    if getattr(consulta, "mascota", None):
        resp = resp.model_copy(update={"cliente_id": consulta.mascota.cliente_id})
    return resp


@router.get("/{consulta_id}", response_model=ConsultaResponse)
def obtener_consulta(
    consulta_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles_y_consultorio(1, 2, 3)),
):
    consulta = obtener_consulta_detalle(
        db=db,
        consulta_id=consulta_id,
        empresa_id=current_user.empresa_id,
    )
    resp = ConsultaResponse.model_validate(consulta)
    if getattr(consulta, "mascota", None):
        resp = resp.model_copy(update={"cliente_id": consulta.mascota.cliente_id})
    return resp

