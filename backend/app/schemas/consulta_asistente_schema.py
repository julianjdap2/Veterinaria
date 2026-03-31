"""Respuesta del asistente clínico (reglas; sin sustituir criterio veterinario)."""

from pydantic import BaseModel, Field


class AsistenteClinicoItem(BaseModel):
    categoria: str = Field(..., description="preventivo | clinico | administrativo")
    titulo: str
    detalle: str
    prioridad: str = Field("info", description="info | media | alta")


class AsistenteClinicoResponse(BaseModel):
    mascota_nombre: str
    especie: str | None = None
    edad_meses: int | None = None
    edad_texto: str
    items: list[AsistenteClinicoItem] = Field(default_factory=list)
    basado_en: str = "reglas_locales"
    modelo_llm: str | None = Field(
        default=None,
        description="Identificador del modelo si hubo enriquecimiento LLM.",
    )
    aviso_legal: str = (
        "Sugerencias orientativas basadas en datos de la ficha y texto de la consulta. "
        "No constituyen diagnóstico ni prescripción: el criterio clínico es siempre del veterinario."
    )
