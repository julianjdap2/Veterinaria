"""
mascotas_router.py

Endpoints del módulo Mascotas.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.security.dependencies import get_current_user
from app.schemas.mascota_schema import MascotaCreate
from app.services.mascota_service import crear_mascota

router = APIRouter(prefix="/mascotas", tags=["Mascotas"])


@router.post("/")
def crear_mascota_endpoint(
    mascota: MascotaCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        data = mascota.model_dump()   # ← Pydantic v2 (equivalente a .dict())

        data["empresa_id"] = current_user.empresa_id

        nueva_mascota = crear_mascota(db, data)

        return nueva_mascota

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))