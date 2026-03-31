from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


class ClienteCreate(BaseModel):
    """Payload para crear un cliente (dueño de mascotas)."""

    nombre: str
    telefono: Optional[str] = None
    tipo_documento: Optional[str] = None
    celular: Optional[str] = None
    telefono_fijo: Optional[str] = None
    contacto: Optional[str] = None
    tipo_contacto: Optional[str] = None
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
    tipo_documento: Optional[str] = None
    celular: Optional[str] = None
    telefono_fijo: Optional[str] = None
    contacto: Optional[str] = None
    tipo_contacto: Optional[str] = None
    email: Optional[EmailStr] = None
    direccion: Optional[str] = None
    documento: Optional[str] = None
    activo: Optional[bool] = None


class ClienteResponse(BaseModel):
    id: int
    nombre: str
    documento: Optional[str] = None
    tipo_documento: Optional[str] = None
    telefono: Optional[str] = None
    celular: Optional[str] = None
    telefono_fijo: Optional[str] = None
    contacto: Optional[str] = None
    tipo_contacto: Optional[str] = None
    direccion: Optional[str] = None
    email: Optional[EmailStr] = None
    empresa_id: int
    activo: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    mascotas_count: Optional[int] = None
    autorizacion_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("email", mode="before")
    @classmethod
    def empty_email_to_none(cls, v):
        if v == "":
            return None
        return v

