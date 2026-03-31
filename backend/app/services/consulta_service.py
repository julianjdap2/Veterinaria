from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models.consulta import Consulta
from app.models.formula_item import FormulaItem
from app.repositories.formula_repository import listar_por_cita
from app.repositories.cita_repository import obtener_cita_por_id_y_empresa
from app.models.cita import Cita
from app.repositories.consulta_repository import (
    crear_consulta,
    listar_consultas_por_mascota,
    obtener_consulta_por_id,
    actualizar_consulta_campos,
)
from app.repositories.mascota_repository import obtener_mascota_por_empresa
from app.repositories.cita_repository import actualizar_cita
from app.repositories.formula_repository import copy_cita_formula_to_consulta
from app.services.notification_service import notify_consulta_creada


def crear_consulta_service(
    db: Session,
    datos: dict,
    veterinario_id: int,
    empresa_id: int,
):
    mascota = obtener_mascota_por_empresa(db, datos["mascota_id"], empresa_id, incluir_inactivas=False)
    if not mascota:
        raise ApiError(
            code="mascota_not_found",
            message="Mascota no encontrada para la empresa actual",
            status_code=404,
        )

    datos_creacion = {
        **datos,
        "veterinario_id": veterinario_id,
        "empresa_id": empresa_id,
    }

    consulta = crear_consulta(db, datos_creacion)

    cita_id = datos_creacion.get("cita_id")
    if cita_id:
        # Cuando el veterinario ingresa a la consulta, la cita pasa a "revision".
        cita = obtener_cita_por_id_y_empresa(db, cita_id, empresa_id)
        if not cita:
            raise ApiError(code="cita_not_found", message="Cita no encontrada", status_code=404)
        if (cita.estado or "").strip() != "confirmada":
            raise ApiError(
                code="cita_estado_invalid",
                message="La cita debe estar confirmada para iniciar la consulta",
                status_code=400,
            )
        # Asignación automática: cuando el veterinario inicia la consulta desde
        # la cita confirmada, la cita queda asignada a ese veterinario.
        actualizar_cita(db, cita, {"estado": "revision", "veterinario_id": veterinario_id})

        copy_cita_formula_to_consulta(
            db=db,
            cita_id=cita_id,
            consulta_id=consulta.id,
            empresa_id=empresa_id,
        )

    notify_consulta_creada(
        email_cliente=mascota.cliente.email if hasattr(mascota, "cliente") else None,
        nombre_mascota=mascota.nombre,
    )

    return consulta


def crear_consulta_con_formula_service(
    db: Session,
    datos: dict,
    veterinario_id: int,
    empresa_id: int,
    formula_items: list[dict],
):
    """
    Crea una consulta junto con su fórmula médica en un solo request.
    Si se crea desde una cita (cita_id), valida transiciones y marca la cita como 'atendida'
    cuando todo queda guardado.
    """
    mascota = obtener_mascota_por_empresa(db, datos["mascota_id"], empresa_id, incluir_inactivas=False)
    if not mascota:
        raise ApiError(
            code="mascota_not_found",
            message="Mascota no encontrada para la empresa actual",
            status_code=404,
        )

    cita_id = datos.get("cita_id")
    cita = None
    if cita_id:
        cita = obtener_cita_por_id_y_empresa(db, cita_id, empresa_id)
        if not cita:
            raise ApiError(code="cita_not_found", message="Cita no encontrada", status_code=404)

        estado_cita = (cita.estado or "").strip()
        if estado_cita not in ("confirmada", "revision"):
            raise ApiError(
                code="cita_estado_invalid",
                message="La cita no está en un estado válido para iniciar revisión.",
                status_code=400,
            )
        # Cuando inicia la consulta, pasamos a revisión.
        if estado_cita == "confirmada":
            cita.estado = "revision"
        # Asignación automática del veterinario para trazabilidad del turno.
        cita.veterinario_id = veterinario_id

    datos_creacion = {
        **datos,
        "veterinario_id": veterinario_id,
        "empresa_id": empresa_id,
    }

    consulta = Consulta(**datos_creacion)
    db.add(consulta)
    db.flush()  # obtenemos consulta.id sin commit

    if formula_items and len(formula_items) > 0:
        for it in formula_items:
            db.add(
                FormulaItem(
                    consulta_id=consulta.id,
                    cita_id=None,
                    producto_id=it["producto_id"],
                    presentacion=it.get("presentacion"),
                    precio=it.get("precio"),
                    observacion=it.get("observacion"),
                    cantidad=it.get("cantidad") or 1,
                )
            )
    elif cita_id:
        # Compatibilidad: si no vinieron ítems desde el front, copiamos prescripción de la cita.
        items_cita = listar_por_cita(db, cita_id, empresa_id)
        for it in items_cita:
            db.add(
                FormulaItem(
                    consulta_id=consulta.id,
                    cita_id=None,
                    producto_id=it.producto_id,
                    presentacion=it.presentacion,
                    precio=it.precio,
                    observacion=it.observacion,
                    cantidad=it.cantidad,
                )
            )

    # Cuando la consulta y la fórmula quedaron guardadas, marcamos la cita como atendida.
    if cita:
        estado_cita = (cita.estado or "").strip()
        if estado_cita != "revision":
            raise ApiError(
                code="cita_estado_invalid",
                message="La cita debe estar en revisión para pasar a atendida.",
                status_code=400,
            )
        cita.estado = "atendida"

    db.commit()
    db.refresh(consulta)

    notify_consulta_creada(
        email_cliente=mascota.cliente.email if hasattr(mascota, "cliente") else None,
        nombre_mascota=mascota.nombre,
    )

    return consulta


def listar_historial_clinico(
    db: Session,
    mascota_id: int,
    empresa_id: int,
):
    return listar_consultas_por_mascota(
        db=db,
        mascota_id=mascota_id,
        empresa_id=empresa_id,
    )


def obtener_consulta_detalle(
    db: Session,
    consulta_id: int,
    empresa_id: int,
):
    consulta = obtener_consulta_por_id(
        db=db,
        consulta_id=consulta_id,
        empresa_id=empresa_id,
    )
    if not consulta:
        raise ApiError(
            code="consulta_not_found",
            message="Consulta no encontrada",
            status_code=404,
        )
    return consulta


def actualizar_consulta_parcial_service(
    db: Session,
    consulta_id: int,
    empresa_id: int,
    campos: dict,
):
    consulta = obtener_consulta_detalle(db=db, consulta_id=consulta_id, empresa_id=empresa_id)
    return actualizar_consulta_campos(db, consulta, campos)

