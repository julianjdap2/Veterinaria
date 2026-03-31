"""Lógica de planes de salud y afiliaciones (por empresa)."""

from __future__ import annotations

import json
from calendar import monthrange
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy.orm import Session, joinedload

from app.core.errors import ApiError
from app.models.cliente import Cliente
from app.models.empresa import Empresa
from app.models.empresa_configuracion import EmpresaConfiguracion
from app.models.mascota import Mascota
from app.models.plan_salud import PlanAfiliacion, PlanAfiliacionUso, PlanSalud, PlanSaludCobertura
from app.repositories.cliente_repository import obtener_cliente_por_empresa
from app.repositories.mascota_repository import obtener_mascota_por_empresa
from app.repositories import vinculo_repository
from app.schemas.plan_salud_schema import (
    AfiliacionCreate,
    AfiliacionMascotaActivaResponse,
    AfiliacionResponse,
    AfiliacionUpdate,
    CoberturaIn,
    CoberturaResponse,
    EstadoCuentaLinea,
    EstadoCuentaResponse,
    PlanSaludCreate,
    PlanSaludResponse,
    PlanSaludUpdate,
)

COBERTURA_CATEGORIAS: list[tuple[str, str]] = [
    ("consulta", "Consulta"),
    ("vacunacion", "Vacunación"),
    ("formula_medica", "Fórmula médica"),
    ("desparasitacion", "Desparasitación"),
    ("hospitalizacion", "Hospitalización/ambulatorio"),
    ("cirugia", "Cirugía/procedimiento"),
    ("laboratorio", "Examen de laboratorio"),
    ("imagenologia", "Imagenología"),
]


def _parse_especies_json(raw: str | None) -> list[int]:
    if not raw or not raw.strip():
        return []
    try:
        data = json.loads(raw)
        if not isinstance(data, list):
            return []
        return [int(x) for x in data if str(x).isdigit() or isinstance(x, int)]
    except (json.JSONDecodeError, TypeError, ValueError):
        return []


def _dump_especies(ids: list[int]) -> str | None:
    if not ids:
        return None
    return json.dumps(sorted(set(ids)))


def add_months(d: date, months: int) -> date:
    m0 = d.month - 1 + months
    y = d.year + m0 // 12
    m = m0 % 12 + 1
    last = monthrange(y, m)[1]
    day = min(d.day, last)
    return date(y, m, day)


def obtener_modulo_habilitado(db: Session, empresa_id: int) -> bool:
    rec = (
        db.query(EmpresaConfiguracion)
        .filter(EmpresaConfiguracion.empresa_id == empresa_id)
        .first()
    )
    if not rec:
        return True
    return bool(getattr(rec, "modulo_planes_salud", True))


def set_modulo_habilitado(db: Session, empresa_id: int, habilitado: bool) -> None:
    rec = (
        db.query(EmpresaConfiguracion)
        .filter(EmpresaConfiguracion.empresa_id == empresa_id)
        .first()
    )
    if not rec:
        rec = EmpresaConfiguracion(empresa_id=empresa_id, modulo_planes_salud=habilitado)
        db.add(rec)
    else:
        rec.modulo_planes_salud = habilitado
    db.commit()


def listar_planes(db: Session, empresa_id: int, solo_activos: bool = True) -> list[PlanSaludResponse]:
    q = db.query(PlanSalud).filter(PlanSalud.empresa_id == empresa_id)
    if solo_activos:
        q = q.filter(PlanSalud.activo.is_(True))
    rows = q.order_by(PlanSalud.id.desc()).all()
    out: list[PlanSaludResponse] = []
    for p in rows:
        n = (
            db.query(PlanAfiliacion)
            .filter(
                PlanAfiliacion.plan_salud_id == p.id,
                PlanAfiliacion.activo.is_(True),
            )
            .count()
        )
        out.append(_plan_a_response(p, afiliaciones_activas=n))
    return out


def _plan_a_response(p: PlanSalud, afiliaciones_activas: int = 0) -> PlanSaludResponse:
    cobs = [CoberturaResponse.model_validate(c) for c in (p.coberturas or [])]
    return PlanSaludResponse(
        id=p.id,
        empresa_id=p.empresa_id,
        nombre=p.nombre,
        precio=p.precio,
        periodicidad_meses=p.periodicidad_meses,
        especies_ids=_parse_especies_json(p.especies_ids_json),
        activo=bool(p.activo),
        coberturas=cobs,
        afiliaciones_activas=afiliaciones_activas,
        updated_at=p.updated_at,
    )


def obtener_plan(db: Session, plan_id: int, empresa_id: int) -> PlanSaludResponse:
    p = (
        db.query(PlanSalud)
        .options(joinedload(PlanSalud.coberturas))
        .filter(PlanSalud.id == plan_id, PlanSalud.empresa_id == empresa_id)
        .first()
    )
    if not p:
        raise ApiError(code="plan_salud_not_found", message="Plan no encontrado", status_code=404)
    n = (
        db.query(PlanAfiliacion)
        .filter(PlanAfiliacion.plan_salud_id == p.id, PlanAfiliacion.activo.is_(True))
        .count()
    )
    return _plan_a_response(p, afiliaciones_activas=n)


def _sync_coberturas(db: Session, plan: PlanSalud, items: list[CoberturaIn] | None) -> None:
    if items is None:
        return
    db.query(PlanSaludCobertura).filter(PlanSaludCobertura.plan_salud_id == plan.id).delete()
    for it in items:
        db.add(
            PlanSaludCobertura(
                plan_salud_id=plan.id,
                categoria_codigo=it.categoria_codigo.strip(),
                nombre_servicio=it.nombre_servicio.strip(),
                cantidad=it.cantidad,
                cobertura_maxima=it.cobertura_maxima,
            )
        )


def crear_plan(db: Session, empresa_id: int, payload: PlanSaludCreate) -> PlanSaludResponse:
    if not obtener_modulo_habilitado(db, empresa_id):
        raise ApiError(
            code="modulo_planes_salud_off",
            message="El módulo de planes de salud está deshabilitado para esta clínica.",
            status_code=403,
        )
    p = PlanSalud(
        empresa_id=empresa_id,
        nombre=payload.nombre.strip(),
        precio=payload.precio,
        periodicidad_meses=payload.periodicidad_meses,
        especies_ids_json=_dump_especies(payload.especies_ids),
        activo=True,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    _sync_coberturas(db, p, payload.coberturas)
    db.commit()
    p = db.query(PlanSalud).options(joinedload(PlanSalud.coberturas)).filter(PlanSalud.id == p.id).first()
    if not p:
        raise ApiError(code="plan_salud_error", message="No se pudo crear el plan", status_code=500)
    return _plan_a_response(p, 0)


def actualizar_plan(db: Session, plan_id: int, empresa_id: int, payload: PlanSaludUpdate) -> PlanSaludResponse:
    p = (
        db.query(PlanSalud)
        .filter(PlanSalud.id == plan_id, PlanSalud.empresa_id == empresa_id)
        .first()
    )
    if not p:
        raise ApiError(code="plan_salud_not_found", message="Plan no encontrado", status_code=404)
    data = payload.model_dump(exclude_unset=True)
    if "nombre" in data and data["nombre"] is not None:
        p.nombre = data["nombre"].strip()
    if "precio" in data and data["precio"] is not None:
        p.precio = data["precio"]
    if "periodicidad_meses" in data and data["periodicidad_meses"] is not None:
        p.periodicidad_meses = data["periodicidad_meses"]
    if "especies_ids" in data and data["especies_ids"] is not None:
        p.especies_ids_json = _dump_especies(data["especies_ids"])
    if "activo" in data and data["activo"] is not None:
        p.activo = data["activo"]
    if "coberturas" in data and data["coberturas"] is not None:
        _sync_coberturas(db, p, data["coberturas"])
    p.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(p)
    return obtener_plan(db, plan_id, empresa_id)


def eliminar_plan(db: Session, plan_id: int, empresa_id: int) -> None:
    p = (
        db.query(PlanSalud)
        .filter(PlanSalud.id == plan_id, PlanSalud.empresa_id == empresa_id)
        .first()
    )
    if not p:
        raise ApiError(code="plan_salud_not_found", message="Plan no encontrado", status_code=404)
    n = (
        db.query(PlanAfiliacion)
        .filter(PlanAfiliacion.plan_salud_id == p.id, PlanAfiliacion.activo.is_(True))
        .count()
    )
    if n > 0:
        p.activo = False
        db.commit()
        return
    db.delete(p)
    db.commit()


def _afiliacion_a_response(db: Session, a: PlanAfiliacion, plan_id: int) -> AfiliacionResponse:
    cli = db.query(Cliente).filter(Cliente.id == a.cliente_id).first()
    mas = db.query(Mascota).filter(Mascota.id == a.mascota_id).first() if a.mascota_id else None
    usos = db.query(PlanAfiliacionUso).filter(PlanAfiliacionUso.afiliacion_id == a.id).all()
    total_cons = sum(u.consumidos for u in usos)
    cobs = db.query(PlanSaludCobertura).filter(PlanSaludCobertura.plan_salud_id == plan_id).all()
    limite = sum(int(c.cantidad or 0) for c in cobs)
    resumen = "Sin usos" if total_cons == 0 else f"{total_cons}/{limite} servicios"
    return AfiliacionResponse(
        id=a.id,
        plan_salud_id=a.plan_salud_id,
        cliente_id=a.cliente_id,
        cliente_nombre=cli.nombre if cli else None,
        cliente_documento=cli.documento if cli else None,
        mascota_id=a.mascota_id,
        mascota_nombre=mas.nombre if mas else None,
        fecha_inicio=a.fecha_inicio,
        fecha_fin=a.fecha_fin,
        valor_pagado=a.valor_pagado,
        observaciones=a.observaciones,
        activo=bool(a.activo),
        resumen_usos=resumen,
        created_at=a.created_at,
    )


def listar_afiliaciones(db: Session, plan_id: int, empresa_id: int) -> list[AfiliacionResponse]:
    obtener_plan(db, plan_id, empresa_id)
    rows = (
        db.query(PlanAfiliacion)
        .filter(PlanAfiliacion.plan_salud_id == plan_id, PlanAfiliacion.empresa_id == empresa_id)
        .order_by(PlanAfiliacion.id.desc())
        .all()
    )
    return [_afiliacion_a_response(db, a, plan_id) for a in rows]


def crear_afiliacion(
    db: Session,
    empresa_id: int,
    plan_id: int,
    payload: AfiliacionCreate,
) -> AfiliacionResponse:
    if not obtener_modulo_habilitado(db, empresa_id):
        raise ApiError(
            code="modulo_planes_salud_off",
            message="El módulo de planes de salud está deshabilitado.",
            status_code=403,
        )
    plan = (
        db.query(PlanSalud)
        .filter(PlanSalud.id == plan_id, PlanSalud.empresa_id == empresa_id, PlanSalud.activo.is_(True))
        .first()
    )
    if not plan:
        raise ApiError(code="plan_salud_not_found", message="Plan no encontrado", status_code=404)

    cli = obtener_cliente_por_empresa(db, payload.cliente_id, empresa_id, incluir_inactivos=False)
    if not cli:
        raise ApiError(code="cliente_not_found", message="Propietario no encontrado en su clínica", status_code=404)
    vin = vinculo_repository.obtener_vinculo_activo(db, payload.cliente_id, empresa_id)
    if not vin:
        raise ApiError(code="cliente_sin_vinculo", message="El propietario no tiene vínculo activo con esta clínica", status_code=403)

    mascota_id = payload.mascota_id
    if mascota_id is not None:
        m = obtener_mascota_por_empresa(db, mascota_id, empresa_id, incluir_inactivas=True)
        if not m or m.cliente_id != payload.cliente_id:
            raise ApiError(code="mascota_invalida", message="La mascota no corresponde al propietario", status_code=400)

    fecha_inicio = payload.fecha_inicio
    fecha_fin = payload.fecha_fin
    if fecha_fin is None:
        fecha_fin = add_months(fecha_inicio, plan.periodicidad_meses)
    valor = payload.valor_pagado if payload.valor_pagado is not None else plan.precio

    af = PlanAfiliacion(
        empresa_id=empresa_id,
        plan_salud_id=plan_id,
        cliente_id=payload.cliente_id,
        mascota_id=mascota_id,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        valor_pagado=valor,
        observaciones=(payload.observaciones or "").strip() or None,
        activo=True,
    )
    db.add(af)
    db.commit()
    db.refresh(af)

    cobs = db.query(PlanSaludCobertura).filter(PlanSaludCobertura.plan_salud_id == plan_id).all()
    for c in cobs:
        db.add(PlanAfiliacionUso(afiliacion_id=af.id, cobertura_id=c.id, consumidos=0))
    db.commit()
    db.refresh(af)
    return _afiliacion_a_response(db, af, plan_id)


def actualizar_afiliacion(
    db: Session,
    afiliacion_id: int,
    empresa_id: int,
    payload: AfiliacionUpdate,
) -> AfiliacionResponse:
    a = (
        db.query(PlanAfiliacion)
        .filter(PlanAfiliacion.id == afiliacion_id, PlanAfiliacion.empresa_id == empresa_id)
        .first()
    )
    if not a:
        raise ApiError(code="afiliacion_not_found", message="Afiliación no encontrada", status_code=404)
    data = payload.model_dump(exclude_unset=True)
    if "mascota_id" in data:
        mid = data["mascota_id"]
        if mid is not None:
            m = obtener_mascota_por_empresa(db, mid, empresa_id, incluir_inactivas=True)
            if not m or m.cliente_id != a.cliente_id:
                raise ApiError(code="mascota_invalida", message="La mascota no corresponde al propietario", status_code=400)
        a.mascota_id = mid
    if "fecha_inicio" in data and data["fecha_inicio"] is not None:
        a.fecha_inicio = data["fecha_inicio"]
    if "fecha_fin" in data and data["fecha_fin"] is not None:
        a.fecha_fin = data["fecha_fin"]
    if "valor_pagado" in data and data["valor_pagado"] is not None:
        a.valor_pagado = data["valor_pagado"]
    if "observaciones" in data:
        obs = data["observaciones"]
        a.observaciones = (obs or "").strip() or None
    db.commit()
    db.refresh(a)
    return _afiliacion_a_response(db, a, a.plan_salud_id)


def eliminar_afiliacion(db: Session, afiliacion_id: int, empresa_id: int) -> None:
    a = (
        db.query(PlanAfiliacion)
        .filter(PlanAfiliacion.id == afiliacion_id, PlanAfiliacion.empresa_id == empresa_id)
        .first()
    )
    if not a:
        raise ApiError(code="afiliacion_not_found", message="Afiliación no encontrada", status_code=404)
    a.activo = False
    db.commit()


def estado_cuenta(db: Session, afiliacion_id: int, empresa_id: int) -> EstadoCuentaResponse:
    a = (
        db.query(PlanAfiliacion)
        .filter(PlanAfiliacion.id == afiliacion_id, PlanAfiliacion.empresa_id == empresa_id)
        .first()
    )
    if not a:
        raise ApiError(code="afiliacion_not_found", message="Afiliación no encontrada", status_code=404)
    emp = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    cli = db.query(Cliente).filter(Cliente.id == a.cliente_id).first()
    plan = db.query(PlanSalud).filter(PlanSalud.id == a.plan_salud_id).first()
    mas = db.query(Mascota).filter(Mascota.id == a.mascota_id).first() if a.mascota_id else None

    lineas: list[EstadoCuentaLinea] = []
    usos_map = {
        u.cobertura_id: u.consumidos
        for u in db.query(PlanAfiliacionUso).filter(PlanAfiliacionUso.afiliacion_id == a.id).all()
    }
    for c in db.query(PlanSaludCobertura).filter(PlanSaludCobertura.plan_salud_id == a.plan_salud_id).all():
        lineas.append(
            EstadoCuentaLinea(
                nombre_servicio=c.nombre_servicio,
                categoria_codigo=c.categoria_codigo,
                consumidos=int(usos_map.get(c.id, 0)),
                limite=int(c.cantidad or 0),
                cobertura_maxima=c.cobertura_maxima,
            )
        )

    parts = [emp.direccion or "", emp.ciudad or "", emp.departamento or "", emp.pais or ""]
    dir_full = ", ".join(x for x in parts if x)

    return EstadoCuentaResponse(
        clinica_nombre=emp.nombre if emp else "",
        clinica_direccion=dir_full or None,
        clinica_telefono=emp.telefono if emp else None,
        clinica_email=emp.email if emp else None,
        plan_numero=f"{a.plan_salud_id}-{a.id}",
        titular_documento=cli.documento if cli else None,
        titular_nombre=cli.nombre if cli else None,
        mascota_nombre=mas.nombre if mas else ("Todas las mascotas del titular" if a.mascota_id is None else None),
        plan_nombre=plan.nombre if plan else "",
        vigencia_desde=a.fecha_inicio,
        vigencia_hasta=a.fecha_fin,
        lineas=lineas,
    )


def afiliacion_activa_por_mascota(
    db: Session,
    mascota_id: int,
    empresa_id: int,
) -> AfiliacionMascotaActivaResponse:
    if not obtener_modulo_habilitado(db, empresa_id):
        return AfiliacionMascotaActivaResponse(tiene_afiliacion=False)

    m = obtener_mascota_por_empresa(db, mascota_id, empresa_id, incluir_inactivas=True)
    if not m:
        raise ApiError(
            code="mascota_not_found",
            message="Mascota no encontrada o sin acceso",
            status_code=404,
        )

    today = date.today()
    af = (
        db.query(PlanAfiliacion)
        .join(PlanSalud, PlanSalud.id == PlanAfiliacion.plan_salud_id)
        .filter(
            PlanAfiliacion.empresa_id == empresa_id,
            PlanAfiliacion.mascota_id == mascota_id,
            PlanAfiliacion.activo.is_(True),
            PlanAfiliacion.fecha_fin >= today,
            PlanAfiliacion.fecha_inicio <= today,
        )
        .order_by(PlanAfiliacion.fecha_fin.desc())
        .first()
    )
    if not af:
        return AfiliacionMascotaActivaResponse(tiene_afiliacion=False)

    plan = db.query(PlanSalud).filter(PlanSalud.id == af.plan_salud_id).first()
    return AfiliacionMascotaActivaResponse(
        tiene_afiliacion=True,
        afiliacion_id=af.id,
        plan_salud_id=af.plan_salud_id,
        plan_nombre=plan.nombre if plan else None,
        fecha_fin=af.fecha_fin,
    )
