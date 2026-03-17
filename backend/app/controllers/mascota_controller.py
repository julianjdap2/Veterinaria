"""
mascota_controller.py

Controlador del módulo Mascotas.
Aquí se definen los endpoints HTTP.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.mascota_schema import MascotaCreate, MascotaResponse
from app.services import mascota_service
from app.security.dependencies import get_current_user

router = APIRouter(prefix="/mascotas", tags=["Mascotas"])


@router.post("/", response_model=MascotaResponse)
def crear_mascota(
    mascota: MascotaCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    mascota_dict = mascota.dict()

    # agregar empresa del usuario autenticado
    mascota_dict["empresa_id"] = current_user.empresa_id

    return mascota_service.crear_mascota(db, mascota_dict)


@router.get("/", response_model=list[MascotaResponse])
def listar_mascotas(db: Session = Depends(get_db)):

    return mascota_service.listar_mascotas(db)


@router.get("/{mascota_id}", response_model=MascotaResponse)
def obtener_mascota(mascota_id: int, db: Session = Depends(get_db)):

    return mascota_service.obtener_mascota(db, mascota_id)


@router.delete("/{mascota_id}")
def eliminar_mascota(mascota_id: int, db: Session = Depends(get_db)):

    return mascota_service.eliminar_mascota(db, mascota_id)