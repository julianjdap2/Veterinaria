"""
Cliente LLM para el asistente de consultorio (API compatible con OpenAI chat/completions).
Devuelve ítems validados o None si falla (el caller usa solo reglas locales).
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass

import httpx

from app.config import get_settings
from app.schemas.consulta_asistente_schema import AsistenteClinicoItem

logger = logging.getLogger(__name__)

_MAX_USER_CHARS = 12000


def _truncate(s: str | None, max_len: int = 2000) -> str:
    if not s:
        return ""
    s = s.strip()
    if len(s) <= max_len:
        return s
    return s[: max_len - 1] + "…"


@dataclass
class LlmConsultaResult:
    items: list[AsistenteClinicoItem]
    model: str


def _build_messages(
    *,
    mascota_nombre: str,
    especie: str | None,
    edad_texto: str,
    peso: str | None,
    motivo: str | None,
    diagnostico: str | None,
    tratamiento: str | None,
    observaciones: str | None,
) -> list[dict[str, str]]:
    system = (
        "Eres un asistente clínico para veterinarios en español (Colombia). "
        "Debes responder SOLO con un objeto JSON válido, sin markdown, sin texto fuera del JSON. "
        'El JSON debe tener exactamente la clave "items" cuyo valor es un array de objetos. '
        "Cada objeto tiene: categoria (string: preventivo | clinico | administrativo), "
        "titulo (string breve), detalle (string útil y concreto), "
        "prioridad (string: info | media | alta). "
        "No inventes datos que no aparezcan en el contexto. "
        "No des diagnósticos definitivos ni prescripciones con dosis de medicamentos. "
        "Sugiere aspectos a considerar, preguntas de seguimiento, revisiones o documentación. "
        f"Máximo {get_settings().LLM_MAX_LLM_ITEMS} elementos en items."
    )
    user_payload = (
        f"Contexto de la consulta (sin datos del propietario):\n"
        f"- Nombre mascota: {_truncate(mascota_nombre, 120)}\n"
        f"- Especie: {_truncate(especie, 80) or 'no indicada'}\n"
        f"- Edad: {_truncate(edad_texto, 80)}\n"
        f"- Peso: {_truncate(peso, 40) or 'no indicado'}\n"
        f"- Motivo: {_truncate(motivo)}\n"
        f"- Diagnóstico: {_truncate(diagnostico)}\n"
        f"- Tratamiento: {_truncate(tratamiento)}\n"
        f"- Observaciones: {_truncate(observaciones)}\n"
    )
    if len(user_payload) > _MAX_USER_CHARS:
        user_payload = user_payload[: _MAX_USER_CHARS - 1] + "…"
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user_payload},
    ]


def _parse_items_from_content(raw: str) -> list[AsistenteClinicoItem]:
    raw = raw.strip()
    m = re.search(r"\{[\s\S]*\}\s*$", raw)
    if m:
        raw = m.group(0)
    data = json.loads(raw)
    if not isinstance(data, dict) or "items" not in data:
        raise ValueError("JSON sin clave items")
    items_raw = data["items"]
    if not isinstance(items_raw, list):
        raise ValueError("items no es lista")
    out: list[AsistenteClinicoItem] = []
    max_n = get_settings().LLM_MAX_LLM_ITEMS
    for it in items_raw[:max_n]:
        if not isinstance(it, dict):
            continue
        cat = str(it.get("categoria", "clinico")).lower().strip()
        if cat not in ("preventivo", "clinico", "administrativo"):
            cat = "clinico"
        pr = str(it.get("prioridad", "info")).lower().strip()
        if pr not in ("info", "media", "alta"):
            pr = "info"
        item = AsistenteClinicoItem(
            categoria=cat,
            titulo=str(it.get("titulo", ""))[:200],
            detalle=str(it.get("detalle", ""))[:1200],
            prioridad=pr,
        )
        if not item.titulo or not item.detalle:
            continue
        out.append(item)
    if not out:
        raise ValueError("Sin ítems válidos")
    return out


def solicitar_sugerencias_llm(
    *,
    mascota_nombre: str,
    especie: str | None,
    edad_texto: str,
    peso: str | None,
    motivo: str | None,
    diagnostico: str | None,
    tratamiento: str | None,
    observaciones: str | None,
) -> LlmConsultaResult | None:
    settings = get_settings()
    if not settings.LLM_ENABLED or not (settings.LLM_API_KEY or "").strip():
        return None

    if (settings.LLM_CHAT_COMPLETIONS_URL or "").strip():
        url = settings.LLM_CHAT_COMPLETIONS_URL.strip()
    else:
        url = settings.LLM_BASE_URL.rstrip("/") + "/chat/completions"
    messages = _build_messages(
        mascota_nombre=mascota_nombre,
        especie=especie,
        edad_texto=edad_texto,
        peso=peso,
        motivo=motivo,
        diagnostico=diagnostico,
        tratamiento=tratamiento,
        observaciones=observaciones,
    )
    body = {
        "model": settings.LLM_MODEL,
        "messages": messages,
        "temperature": 0.25,
        "max_tokens": 900,
        "response_format": {"type": "json_object"},
    }
    headers = {
        "Authorization": f"Bearer {settings.LLM_API_KEY.strip()}",
        "Content-Type": "application/json",
    }

    try:
        with httpx.Client(timeout=settings.LLM_TIMEOUT_SECONDS) as client:
            r = client.post(url, headers=headers, json=body)
    except httpx.HTTPError as e:
        logger.warning("LLM HTTP error: %s", e)
        return None

    if r.status_code >= 400:
        logger.warning("LLM status %s: %s", r.status_code, r.text[:500])
        return None

    try:
        payload = r.json()
        content = (
            payload.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )
        if not content or not isinstance(content, str):
            logger.warning("LLM respuesta sin content")
            return None
        items = _parse_items_from_content(content)
        model = str(payload.get("model", settings.LLM_MODEL))
        return LlmConsultaResult(items=items, model=model)
    except (json.JSONDecodeError, KeyError, ValueError, TypeError) as e:
        logger.warning("LLM parse error: %s", e)
        return None
