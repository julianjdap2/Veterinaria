from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.security.dependencies import get_current_user

from app.services.cliente_service import crear_cliente_service


router = APIRouter(
    prefix="/clientes",
    tags=["Clientes"]
)


@router.post("/")
def crear_cliente(
    nombre: str,
    telefono: str,
    email: str,
    direccion: str,
    documento: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    data = {
        "nombre": nombre,
        "telefono": telefono,
        "email": email,
        "direccion": direccion,
        "documento": documento
    }

    cliente = crear_cliente_service(
        db,
        data,
        current_user.empresa_id
    )

    return cliente