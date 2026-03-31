"""Lectura y actualización de catálogos de variables clínicas por empresa."""

from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models.empresa_configuracion import EmpresaConfiguracion
from app.models.consulta import Consulta
from app.schemas.variables_clinicas_schema import (
    FormatoDocumentoItem,
    ItemVariableSimple,
    TopVariableUsoItem,
    VariablesClinicasResponse,
    VariablesClinicasUpdate,
)


def _obtener_o_crear_config_row(db: Session, empresa_id: int) -> EmpresaConfiguracion:
    rec = (
        db.query(EmpresaConfiguracion)
        .filter(EmpresaConfiguracion.empresa_id == empresa_id)
        .first()
    )
    if not rec:
        rec = EmpresaConfiguracion(empresa_id=empresa_id)
        db.add(rec)
        db.commit()
        db.refresh(rec)
    return rec


DEFAULT_VACUNAS: list[dict[str, Any]] = [
    {"id": "sys-vac-rabia", "nombre": "Antirrábica", "sistema": True},
    {"id": "sys-vac-moquillo", "nombre": "Moquillo canino", "sistema": True},
    {"id": "sys-vac-parvo", "nombre": "Parvovirus", "sistema": True},
    {"id": "sys-vac-lepto", "nombre": "Leptospirosis", "sistema": True},
    {"id": "sys-vac-bordetella", "nombre": "Bordetella / tos de las perreras", "sistema": True},
]

DEFAULT_HOSPITALIZACION: list[dict[str, Any]] = [
    {"id": "sys-hosp-interna", "nombre": "Hospitalización", "sistema": True},
    {"id": "sys-hosp-amb", "nombre": "Ambulatorio", "sistema": True},
]

DEFAULT_PROCEDIMIENTOS: list[dict[str, Any]] = [
    {"id": "sys-proc-esteril", "nombre": "Esterilización / castración", "sistema": True},
    {"id": "sys-proc-limpieza", "nombre": "Limpieza dental", "sistema": True},
]

DEFAULT_LAB: list[dict[str, Any]] = [
    {"id": "sys-lab-hemo", "nombre": "Hemograma", "categoria": "hematologia", "sistema": True},
    {"id": "sys-lab-bioq", "nombre": "Bioquímica sanguínea", "categoria": "bioquimica", "sistema": True},
    {"id": "sys-lab-orina", "nombre": "Urianálisis", "categoria": "orina", "sistema": True},
]

DEFAULT_FORMATOS: list[dict[str, Any]] = [
    {
        "id": "sys-fmt-consent",
        "nombre": "Consentimiento informado (plantilla)",
        "contenido_html": "<p><strong>Consentimiento informado</strong></p><p>Yo, ____________________, autorizo el procedimiento descrito.</p>",
        "sistema": True,
    },
]


def _defaults_dict() -> dict[str, list[dict[str, Any]]]:
    return {
        "vacunas": [dict(x) for x in DEFAULT_VACUNAS],
        "hospitalizacion": [dict(x) for x in DEFAULT_HOSPITALIZACION],
        "procedimientos": [dict(x) for x in DEFAULT_PROCEDIMIENTOS],
        "pruebas_laboratorio": [dict(x) for x in DEFAULT_LAB],
        "formatos_documento": [dict(x) for x in DEFAULT_FORMATOS],
    }


def _parse_guardado(raw: str | None) -> dict[str, list[dict[str, Any]]] | None:
    if not raw or not raw.strip():
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    return data  # type: ignore[return-value]


def _merge_lista(
    defaults: list[dict[str, Any]],
    guardado: list[dict[str, Any]] | None,
) -> list[dict[str, Any]]:
    """Orden de `defaults` primero; aplica nombres/contenido guardados; añade ítems personalizados al final."""
    by_def = {d["id"]: dict(d) for d in defaults}
    if not guardado:
        return [dict(d) for d in defaults]

    saved_by_id: dict[str, dict[str, Any]] = {}
    for row in guardado:
        if not isinstance(row, dict):
            continue
        rid = row.get("id")
        if not isinstance(rid, str) or not rid:
            continue
        saved_by_id[rid] = row

    out: list[dict[str, Any]] = []
    for d in defaults:
        sid = d["id"]
        if sid in saved_by_id:
            merged = dict(by_def[sid])
            nm = saved_by_id[sid].get("nombre")
            if isinstance(nm, str) and nm.strip():
                merged["nombre"] = nm.strip()
            cg = saved_by_id[sid].get("categoria")
            if isinstance(cg, str):
                merged["categoria"] = cg.strip() or None
            if "contenido_html" in merged:
                ch = saved_by_id[sid].get("contenido_html")
                if isinstance(ch, str):
                    merged["contenido_html"] = ch
            out.append(merged)
        else:
            out.append(dict(by_def[sid]))

    def_ids = set(by_def.keys())
    for rid, row in saved_by_id.items():
        if rid in def_ids:
            continue
        if row.get("sistema"):
            continue
        nombre = str(row.get("nombre", "")).strip()
        if not nombre:
            continue
        extra: dict[str, Any] = {"id": rid, "nombre": nombre, "sistema": False}
        if "categoria" in row:
            extra["categoria"] = str(row.get("categoria", "")).strip() or None
        if "contenido_html" in row:
            extra["contenido_html"] = str(row.get("contenido_html", ""))
        out.append(extra)
    return out


def obtener_variables_clinicas_service(db: Session, empresa_id: int) -> VariablesClinicasResponse:
    rec = _obtener_o_crear_config_row(db, empresa_id)
    base = _defaults_dict()
    parsed = _parse_guardado(rec.variables_clinicas_json)
    if not parsed:
        return VariablesClinicasResponse.model_validate(base)

    merged = {
        "vacunas": _merge_lista(base["vacunas"], parsed.get("vacunas") if isinstance(parsed.get("vacunas"), list) else None),
        "hospitalizacion": _merge_lista(
            base["hospitalizacion"],
            parsed.get("hospitalizacion") if isinstance(parsed.get("hospitalizacion"), list) else None,
        ),
        "procedimientos": _merge_lista(
            base["procedimientos"],
            parsed.get("procedimientos") if isinstance(parsed.get("procedimientos"), list) else None,
        ),
        "pruebas_laboratorio": _merge_lista(
            base["pruebas_laboratorio"],
            parsed.get("pruebas_laboratorio") if isinstance(parsed.get("pruebas_laboratorio"), list) else None,
        ),
        "formatos_documento": _merge_lista(
            base["formatos_documento"],
            parsed.get("formatos_documento") if isinstance(parsed.get("formatos_documento"), list) else None,
        ),
    }
    return VariablesClinicasResponse.model_validate(merged)


def _ids_sistema(defaults: list[dict[str, Any]]) -> set[str]:
    return {d["id"] for d in defaults if d.get("sistema")}


def _validar_sin_eliminar_sistema(
    key: str,
    enviados: list[dict[str, Any]],
    defaults: list[dict[str, Any]],
) -> None:
    required = _ids_sistema(defaults)
    present = {x.get("id") for x in enviados if isinstance(x.get("id"), str)}
    if not required.issubset(present):
        faltan = required - present
        raise ApiError(
            code="variables_sistema_requeridas",
            message=f"En {key} no se pueden eliminar ítems del sistema: faltan {sorted(faltan)}",
            status_code=400,
        )


def _validar_items_simples(items: list[ItemVariableSimple], key: str) -> None:
    ids = [x.id for x in items]
    if len(ids) != len(set(ids)):
        raise ApiError(
            code="variables_ids_duplicados",
            message=f"Ids duplicados en {key}",
            status_code=400,
        )


def _validar_formatos(items: list[FormatoDocumentoItem]) -> None:
    ids = [x.id for x in items]
    if len(ids) != len(set(ids)):
        raise ApiError(
            code="variables_ids_duplicados",
            message="Ids duplicados en formatos_documento",
            status_code=400,
        )


def _aplicar_sistema_flags_simple(
    defaults: list[dict[str, Any]],
    enviados: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    by_id = {d["id"]: dict(d) for d in defaults}
    out: list[dict[str, Any]] = []
    for row in enviados:
        rid = row.get("id")
        if not isinstance(rid, str) or not rid:
            raise ApiError(
                code="variables_id_invalido",
                message="Cada ítem debe tener id",
                status_code=400,
            )
        nombre = str(row.get("nombre", "")).strip()
        if not nombre:
            raise ApiError(
                code="variables_nombre_vacio",
                message="Nombre requerido en cada ítem",
                status_code=400,
            )
        if rid in by_id:
            out.append(
                {
                    "id": rid,
                    "nombre": nombre,
                    "categoria": str(row.get("categoria", "")).strip() or None,
                    "sistema": bool(by_id[rid].get("sistema")),
                }
            )
        else:
            out.append(
                {
                    "id": rid,
                    "nombre": nombre,
                    "categoria": str(row.get("categoria", "")).strip() or None,
                    "sistema": False,
                }
            )
    return out


def _aplicar_sistema_flags_formatos(
    defaults: list[dict[str, Any]],
    enviados: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    by_id = {d["id"]: dict(d) for d in defaults}
    out: list[dict[str, Any]] = []
    for row in enviados:
        rid = row.get("id")
        if not isinstance(rid, str) or not rid:
            raise ApiError(
                code="variables_id_invalido",
                message="Cada ítem debe tener id",
                status_code=400,
            )
        nombre = str(row.get("nombre", "")).strip()
        if not nombre:
            raise ApiError(
                code="variables_nombre_vacio",
                message="Nombre requerido en cada ítem",
                status_code=400,
            )
        if rid in by_id:
            merged = dict(by_id[rid])
            merged["nombre"] = nombre
            merged["contenido_html"] = str(row.get("contenido_html", merged.get("contenido_html", "")))
            merged["sistema"] = bool(by_id[rid].get("sistema"))
            out.append(merged)
        else:
            out.append(
                {
                    "id": rid,
                    "nombre": nombre,
                    "contenido_html": str(row.get("contenido_html", "")),
                    "sistema": False,
                }
            )
    return out


def actualizar_variables_clinicas_service(
    db: Session,
    empresa_id: int,
    payload: VariablesClinicasUpdate,
) -> VariablesClinicasResponse:
    rec = _obtener_o_crear_config_row(db, empresa_id)
    base = _defaults_dict()
    actual = obtener_variables_clinicas_service(db, empresa_id)
    data = actual.model_dump()

    incoming = payload.model_dump(exclude_unset=True)
    for key in ("vacunas", "hospitalizacion", "procedimientos", "pruebas_laboratorio"):
        if key not in incoming:
            continue
        items = [ItemVariableSimple.model_validate(x) for x in incoming[key]]
        _validar_items_simples(items, key)
        raw = [x.model_dump() for x in items]
        _validar_sin_eliminar_sistema(key, raw, base[key])
        data[key] = _aplicar_sistema_flags_simple(base[key], raw)

    if "formatos_documento" in incoming:
        items = [FormatoDocumentoItem.model_validate(x) for x in incoming["formatos_documento"]]
        _validar_formatos(items)
        raw = [x.model_dump() for x in items]
        _validar_sin_eliminar_sistema("formatos_documento", raw, base["formatos_documento"])
        data["formatos_documento"] = _aplicar_sistema_flags_formatos(base["formatos_documento"], raw)

    rec.variables_clinicas_json = json.dumps(data, ensure_ascii=False)
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return obtener_variables_clinicas_service(db, empresa_id)


def _label_por_id(items: list, item_id: str) -> str:
    for it in items:
        iid = it.id if hasattr(it, "id") else it.get("id")
        if iid == item_id:
            n = it.nombre if hasattr(it, "nombre") else it.get("nombre")
            return str(n or item_id)
    return item_id


def extras_consulta_a_texto(db: Session, empresa_id: int, raw_json: str | None) -> str:
    """Convierte JSON guardado en etiquetas legibles usando catálogos actuales."""
    if not raw_json or not str(raw_json).strip():
        return ""
    try:
        ex = json.loads(raw_json)
    except json.JSONDecodeError:
        return ""
    if not isinstance(ex, dict):
        return ""
    v = obtener_variables_clinicas_service(db, empresa_id)
    lineas: list[str] = []
    hid = ex.get("hospitalizacion_id")
    if hid:
        lineas.append(f"Hospitalización / ingreso: {_label_por_id(list(v.hospitalizacion), str(hid))}")
    for vid in ex.get("vacuna_ids") or []:
        lineas.append(f"Vacuna: {_label_por_id(list(v.vacunas), str(vid))}")
    for lid in ex.get("pruebas_lab_ids") or []:
        lineas.append(f"Laboratorio: {_label_por_id(list(v.pruebas_laboratorio), str(lid))}")
    fid = ex.get("formato_documento_id")
    if fid:
        lineas.append(f"Formato documento: {_label_por_id(list(v.formatos_documento), str(fid))}")
    return "\n".join(lineas)


def extras_cita_a_texto(db: Session, empresa_id: int, raw_json: str | None) -> str:
    if not raw_json or not str(raw_json).strip():
        return ""
    try:
        ex = json.loads(raw_json)
    except json.JSONDecodeError:
        return ""
    if not isinstance(ex, dict):
        return ""
    v = obtener_variables_clinicas_service(db, empresa_id)
    lineas: list[str] = []
    if ex.get("vacuna_id"):
        lineas.append(f"Vacuna (cita): {_label_por_id(list(v.vacunas), str(ex['vacuna_id']))}")
    if ex.get("hospitalizacion_id"):
        lineas.append(f"Ingreso: {_label_por_id(list(v.hospitalizacion), str(ex['hospitalizacion_id']))}")
    if ex.get("procedimiento_id"):
        lineas.append(f"Procedimiento: {_label_por_id(list(v.procedimientos), str(ex['procedimiento_id']))}")
    return "\n".join(lineas)


def top_pruebas_laboratorio_mas_usadas_service(
    db: Session, empresa_id: int, dias: int = 90, limit: int = 10
) -> list[TopVariableUsoItem]:
    """Top de pruebas de laboratorio usando extras de consulta en ventana de días."""
    start = datetime.utcnow() - timedelta(days=max(1, dias))
    rows = (
        db.query(Consulta.extras_clinicos_json)
        .filter(
            Consulta.empresa_id == empresa_id,
            Consulta.extras_clinicos_json.isnot(None),
            Consulta.created_at >= start,
        )
        .all()
    )
    counter: Counter[str] = Counter()
    for (raw_json,) in rows:
        if not raw_json or not str(raw_json).strip():
            continue
        try:
            parsed = json.loads(raw_json)
        except json.JSONDecodeError:
            continue
        if not isinstance(parsed, dict):
            continue
        for test_id in parsed.get("pruebas_lab_ids") or []:
            if isinstance(test_id, str) and test_id.strip():
                counter[test_id] += 1

    vars_cfg = obtener_variables_clinicas_service(db, empresa_id)
    labels = {x.id: x.nombre for x in vars_cfg.pruebas_laboratorio}
    out: list[TopVariableUsoItem] = []
    for item_id, qty in counter.most_common(max(1, min(50, limit))):
        out.append(
            TopVariableUsoItem(
                id=item_id,
                nombre=labels.get(item_id, item_id),
                cantidad=int(qty),
            )
        )
    return out
