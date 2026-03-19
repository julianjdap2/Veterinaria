from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UsuarioBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    email: EmailStr
    rol_id: int


class UsuarioCreate(UsuarioBase):
    password: str = Field(min_length=8, max_length=128)


class UsuarioUpdate(BaseModel):
    """Payload para actualizar usuario (p. ej. activo)."""
    activo: bool | None = None


class UsuarioResponse(UsuarioBase):
    id: int
    empresa_id: int
    activo: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
