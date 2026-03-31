"""
Asistente en consultorio: checklist y sugerencias por reglas (edad, especie, palabras clave).
Extensible a LLM en el futuro manteniendo el mismo contrato de respuesta.
"""

from __future__ import annotations

from datetime import date
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models.consulta import Consulta
from app.models.especie import Especie
from app.config import get_settings
from app.repositories.consulta_repository import obtener_consulta_por_id
from app.schemas.consulta_asistente_schema import AsistenteClinicoItem, AsistenteClinicoResponse
from app.services.llm_consulta_client import solicitar_sugerencias_llm


def _edad_meses(fecha_nac: date | None) -> int | None:
    if fecha_nac is None:
        return None
    today = date.today()
    m = (today.year - fecha_nac.year) * 12 + today.month - fecha_nac.month
    if today.day < fecha_nac.day:
        m -= 1
    return max(0, m)


def _edad_texto(meses: int | None) -> str:
    if meses is None:
        return "Edad no registrada"
    if meses < 12:
        return f"{meses} mes(es)"
    a = meses // 12
    m = meses % 12
    if m == 0:
        return f"{a} año(s)"
    return f"{a} año(s) y {m} mes(es)"


def _es_canino_felino(nombre_especie: str | None) -> tuple[bool, bool]:
    if not nombre_especie:
        return False, False
    n = nombre_especie.lower()
    can = "can" in n or "perro" in n.lower()
    fel = "fel" in n or "gato" in n.lower()
    return can, fel


def _blob_texto(consulta: Consulta) -> str:
    parts = [
        consulta.motivo_consulta or "",
        consulta.diagnostico or "",
        consulta.tratamiento or "",
        consulta.observaciones or "",
    ]
    return " ".join(parts).lower()


def _items_por_reglas(
    consulta: Consulta,
    nombre_especie: str | None,
    meses: int | None,
) -> list[AsistenteClinicoItem]:
    items: list[AsistenteClinicoItem] = []
    can, fel = _es_canino_felino(nombre_especie)
    texto = _blob_texto(consulta)

    if meses is not None:
        if meses < 6:
            items.append(
                AsistenteClinicoItem(
                    categoria="preventivo",
                    titulo="Juvenil",
                    detalle="Revisar calendario de vacunación y desparasitación acorde a la edad y especie; registrar refuerzos en la historia.",
                    prioridad="media",
                )
            )
        elif meses >= 96 and (can or fel):
            items.append(
                AsistenteClinicoItem(
                    categoria="preventivo",
                    titulo="Paciente geriátrico (perro/gato)",
                    detalle="Considerar valoración de laboratorio (hemograma / bioquímica) según contexto clínico.",
                    prioridad="info",
                )
            )
        elif meses >= 6:
            items.append(
                AsistenteClinicoItem(
                    categoria="preventivo",
                    titulo="Control de adulto",
                    detalle="Revisar vacunas y desparasitación según protocolo de la clínica y zona.",
                    prioridad="info",
                )
            )

    if any(k in texto for k in ["vómito", "vomito", "vomité", "vomita"]):
        items.append(
            AsistenteClinicoItem(
                categoria="clinico",
                titulo="Signos digestivos",
                detalle="Valorar hidratación, tiempo de evolución y síntomas asociados; documentar en observaciones.",
                prioridad="media",
            )
        )
    if any(k in texto for k in ["diarrea", "diarreas"]):
        items.append(
            AsistenteClinicoItem(
                categoria="clinico",
                titulo="Signos digestivos",
                detalle="Valorar deshidratación, parásitos y dieta; registrar si hay sangre en heces.",
                prioridad="media",
            )
        )
    if any(k in texto for k in ["dermatitis", "picazón", "picazon", "prurito", "piel"]):
        items.append(
            AsistenteClinicoItem(
                categoria="clinico",
                titulo="Dermatología",
                detalle="Considerar ectoparásitos, alergias y distribución de lesiones; fotos en historia si aplica.",
                prioridad="info",
            )
        )

    items.append(
        AsistenteClinicoItem(
            categoria="administrativo",
            titulo="Documentación",
            detalle="Completar motivo, diagnóstico y tratamiento antes de cerrar; facilita resumen al propietario y auditoría.",
            prioridad="info",
        )
    )

    return items


def construir_asistente_clinico(
    db: Session,
    consulta_id: int,
    empresa_id: int,
) -> AsistenteClinicoResponse:
    consulta = obtener_consulta_por_id(db, consulta_id, empresa_id)
    if not consulta:
        raise ApiError(code="consulta_not_found", message="Consulta no encontrada", status_code=404)

    mascota = consulta.mascota
    if not mascota:
        raise ApiError(code="mascota_not_found", message="Mascota no encontrada", status_code=404)

    nombre_especie: str | None = None
    if mascota.especie_id:
        esp = db.query(Especie).filter(Especie.id == mascota.especie_id).first()
        if esp:
            nombre_especie = esp.nombre

    meses = _edad_meses(mascota.fecha_nacimiento)
    items_reglas = _items_por_reglas(consulta, nombre_especie, meses)
    edad_txt = _edad_texto(meses)
    peso_str = str(mascota.peso) if mascota.peso is not None else None

    basado_en = "reglas_locales"
    modelo_llm: str | None = None
    items = items_reglas

    if get_settings().LLM_ENABLED:
        llm_res = solicitar_sugerencias_llm(
            mascota_nombre=mascota.nombre,
            especie=nombre_especie,
            edad_texto=edad_txt,
            peso=peso_str,
            motivo=consulta.motivo_consulta,
            diagnostico=consulta.diagnostico,
            tratamiento=consulta.tratamiento,
            observaciones=consulta.observaciones,
        )
        if llm_res and llm_res.items:
            items = _fusionar_items(items_reglas, llm_res.items)
            basado_en = "reglas_locales_y_llm"
            modelo_llm = llm_res.model

    return AsistenteClinicoResponse(
        mascota_nombre=mascota.nombre,
        especie=nombre_especie,
        edad_meses=meses,
        edad_texto=edad_txt,
        items=items,
        basado_en=basado_en,
        modelo_llm=modelo_llm,
    )
