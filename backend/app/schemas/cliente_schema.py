from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr


class ClienteCreate(BaseModel):
    """Payload para crear un cliente (dueño de mascotas)."""

    nombre: str
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    direccion: Optional[str] = None
    documento: Optional[str] = None

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "nombre": "Juan Pérez",
                    "telefono": "3001234567",
                    "email": "juan@email.com",
                    "direccion": "Calle 1 # 2-3",
                    "documento": "12345678",
                }
            ]
        }
    }


class ClienteUpdate(BaseModel):
    """Payload para actualizar cliente (campos opcionales)."""

    nombre: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    direccion: Optional[str] = None
    documento: Optional[str] = None
    activo: Optional[bool] = None


class ClienteResponse(BaseModel):
    id: int
    nombre: str
    documento: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    email: Optional[EmailStr] = None
    empresa_id: int
    activo: bool

    model_config = ConfigDict(from_attributes=True)

