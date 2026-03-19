"""
catalogo_router.py

Endpoints de solo lectura para especies, razas y motivos de consulta (catálogo).
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database.database import get_db
from app.security.dependencies import get_current_user
from app.repositories.catalogo_repository import listar_especies, listar_razas
from app.schemas.catalogo_schema import EspecieResponse, RazaResponse

router = APIRouter(prefix="/catalogo", tags=["Catálogo"])

# Motivos de consulta predefinidos (sin BD para simplicidad; se puede migrar a tabla después)
MOTIVOS_CONSULTA = [
    "Revisión general / chequeo",
    "Vacunación",
    "Desparasitación",
    "Urgencia",
    "Cojera / traumatismo",
    "Vómitos / diarrea",
    "Problemas de piel / prurito",
    "Oídos / otitis",
    "Ojos",
    "Problemas dentales",
    "Control post-operatorio",
    "Esterilización / castración",
    "Control de peso",
    "Enfermedad crónica (seguimiento)",
]


class MotivoConsultaItem(BaseModel):
    id: str
    nombre: str


@router.get("/especies", response_model=list[EspecieResponse])
def get_especies(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Lista todas las especies (Perro, Gato, etc.)."""
    return listar_especies(db)


@router.get("/razas", response_model=list[RazaResponse])
def get_razas(
    especie_id: int | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Lista razas; opcionalmente filtradas por especie_id."""
    return listar_razas(db, especie_id=especie_id)


@router.get("/motivos-consulta", response_model=list[MotivoConsultaItem])
def get_motivos_consulta(current_user=Depends(get_current_user)):
    """Lista motivos de consulta predefinidos para citas y consultas (selector rápido)."""
    return [MotivoConsultaItem(id=nombre, nombre=nombre) for nombre in MOTIVOS_CONSULTA]
