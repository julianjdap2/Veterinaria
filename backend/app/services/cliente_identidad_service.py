"""
Búsqueda de propietario por documento (identidad global) y vinculación con la clínica.
"""

from __future__ import annotations

import secrets
from typing import Any

from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.repositories import vinculo_repository
from app.repositories.cliente_repository import obtener_cliente, obtener_cliente_por_documento_normalizado
from app.repositories.mascota_repository import listar_mascotas_por_empresa


def _solo_digitos(s: str) -> str:
    return "".join(ch for ch in (s or "") if ch.isdigit())


def enmascarar_documento(doc: str | None) -> str | None:
    if not doc or len(doc) < 4:
        return None
    return f"••••{doc[-4:]}"


def enmascarar_telefono(tel: str | None) -> str | None:
    if not tel:
        return None
    d = _solo_digitos(tel)
    if len(d) < 4:
        return "••••"
    pref = tel.strip()[:2] if tel.strip().startswith("+") else ""
    return f"{pref}••••{d[-4:]}" if pref else f"••••{d[-4:]}"


def enmascarar_email(email: str | None) -> str | None:
    if not email or "@" not in email:
        return None
    user, _, domain = email.partition("@")
    if len(user) <= 1:
        return f"••@{domain}"
    return f"{user[0]}•••@{domain}"


def _mascotas_visibles_para_clinica(db: Session, empresa_id: int, cliente_id: int) -> list[dict[str, Any]]:
    """Solo pacientes accesibles vía vínculo propietario–clínica (nunca listado global por cliente_id)."""
    pets = listar_mascotas_por_empresa(
        db,
        empresa_id,
        page=1,
        page_size=500,
        solo_activas=True,
        cliente_id=cliente_id,
    )
    return [{"id": m.id, "nombre": m.nombre, "sexo": m.sexo, "especie_id": m.especie_id} for m in pets]


def buscar_por_documento_service(db: Session, documento: str, empresa_id: int) -> dict[str, Any]:
    c = obtener_cliente_por_documento_normalizado(db, documento)
    if not c:
        return {"encontrado": False, "estado_vinculo": "ninguno", "puede_vincular": False, "mascotas": []}

    v = vinculo_repository.obtener_vinculo_activo(db, c.id, empresa_id)
    # Sin vínculo: no exponer mascotas ni metadatos clínicos de otros contextos.
    items: list[dict[str, Any]] = [] if not v else _mascotas_visibles_para_clinica(db, empresa_id, c.id)

    if not v:
        return {
            "encontrado": True,
            "cliente_id": c.id,
            "estado_vinculo": "ninguno",
            "puede_vincular": True,
            "nombre": c.nombre,
            "documento": enmascarar_documento(c.documento),
            "telefono": enmascarar_telefono(c.telefono),
            "email": enmascarar_email(c.email),
            "direccion": None,
            "mascotas": items,
        }

    if v.access_level == vinculo_repository.ACCESS_PARTIAL:
        return {
            "encontrado": True,
            "cliente_id": c.id,
            "estado_vinculo": "parcial",
            "puede_vincular": True,
            "nombre": c.nombre,
            "documento": enmascarar_documento(c.documento),
            "telefono": enmascarar_telefono(c.telefono),
            "email": enmascarar_email(c.email),
            "direccion": None,
            "mascotas": items,
        }

    return {
        "encontrado": True,
        "cliente_id": c.id,
        "estado_vinculo": "completo",
        "puede_vincular": False,
        "nombre": c.nombre,
        "documento": c.documento,
        "telefono": c.telefono,
        "email": c.email,
        "direccion": c.direccion,
        "mascotas": items,
    }


def vincular_presencial_service(
    db: Session,
    empresa_id: int,
    *,
    cliente_id: int,
    documento: str,
    telefono: str,
    confirmo_consentimiento: bool,
    marketing_canal: str | None,
):
    if not confirmo_consentimiento:
        raise ApiError(
            code="consentimiento_requerido",
            message="Debe confirmar que el propietario aportó los datos y aceptó los términos aplicables.",
            status_code=400,
        )
    c = obtener_cliente(db, cliente_id)
    if not c:
        raise ApiError(code="cliente_not_found", message="Propietario no encontrado", status_code=404)

    doc_ok = secrets.compare_digest((c.documento or "").strip(), documento.strip())
    if not doc_ok:
        raise ApiError(
            code="verificacion_fallida",
            message="El documento no coincide con el registro. Revise con el propietario.",
            status_code=400,
        )

    if c.telefono and telefono.strip():
        if _solo_digitos(c.telefono) != _solo_digitos(telefono):
            raise ApiError(
                code="verificacion_fallida",
                message="El teléfono no coincide con el registro.",
                status_code=400,
            )
    elif c.telefono and not telefono.strip():
        raise ApiError(
            code="telefono_requerido",
            message="Confirme el teléfono registrado para completar la vinculación.",
            status_code=400,
        )

    vinculo_repository.upsert_vinculo(
        db,
        cliente_id=cliente_id,
        empresa_id=empresa_id,
        access_level=vinculo_repository.ACCESS_FULL,
        marketing_canal=marketing_canal,
    )
    return {
        "ok": True,
        "access_level": vinculo_repository.ACCESS_FULL,
        "mensaje": "Vínculo completo: puede ver y editar datos e historial según su rol.",
    }


def vincular_parcial_service(
    db: Session,
    empresa_id: int,
    *,
    cliente_id: int,
    documento: str,
    marketing_canal: str | None,
):
    c = obtener_cliente(db, cliente_id)
    if not c:
        raise ApiError(code="cliente_not_found", message="Propietario no encontrado", status_code=404)
    if not secrets.compare_digest((c.documento or "").strip(), documento.strip()):
        raise ApiError(
            code="verificacion_fallida",
            message="El documento no coincide con el registro.",
            status_code=400,
        )

    vinculo_repository.upsert_vinculo(
        db,
        cliente_id=cliente_id,
        empresa_id=empresa_id,
        access_level=vinculo_repository.ACCESS_PARTIAL,
        marketing_canal=marketing_canal,
    )
    from app.services.vinculo_invitacion_service import crear_y_enviar_invitacion_ampliar_vinculo

    crear_y_enviar_invitacion_ampliar_vinculo(db, cliente_id=cliente_id, empresa_id=empresa_id)
    return {
        "ok": True,
        "access_level": vinculo_repository.ACCESS_PARTIAL,
        "mensaje": "Vínculo parcial activo. Si el propietario tiene correo en el registro, se envió un enlace para autorizar acceso completo.",
    }
