"""Schemas para endpoints públicos (sin autenticación), p. ej. landing."""

from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class PublicClinicaItem(BaseModel):
    id: int
    nombre: str = Field(..., max_length=150)
    logo_url: str | None = None

    model_config = {"from_attributes": False}


TipoEstablecimiento = Literal["independiente", "clinica", "guarderia", "peluqueria"]


class RegistroPublicoRequest(BaseModel):
    empresa_nombre: str = Field(..., min_length=2, max_length=150)
    ciudad: str = Field(..., min_length=2, max_length=120)
    pais: str = Field(..., min_length=2, max_length=80)
    tipo_establecimiento: TipoEstablecimiento
    departamento: str | None = Field(None, max_length=120)
    canal_origen: str = Field(..., min_length=1, max_length=100)
    distribuidor: str = Field(..., min_length=1, max_length=150)
    usuario_nombre: str = Field(..., min_length=2, max_length=100)
    usuario_email: EmailStr
    usuario_telefono: str | None = Field(None, max_length=40)
    usuario_password: str = Field(..., min_length=8, max_length=128)
    recaptcha_token: str | None = Field(None, max_length=4000)


class RegistroPublicoResponse(BaseModel):
    """Respuesta al enviar la solicitud de registro (sin JWT; el acceso es tras abrir el enlace del correo)."""

    solicitud_recibida: bool = True
    message: str = Field(
        default="Solicitud recibida. Revise su correo para continuar con el proceso.",
        description="Mensaje para el usuario.",
    )


class ActivarRegistroRequest(BaseModel):
    """Token recibido en el correo (query o body)."""

    token: str = Field(..., min_length=20, max_length=8000)


class VinculoConfirmarRequest(BaseModel):
    """Token del enlace enviado al propietario para ampliar vínculo parcial → completo."""

    token: str = Field(..., min_length=20, max_length=512)


class VinculoConfirmarResponse(BaseModel):
    ok: bool = True
    mensaje: str
    empresa_nombre: str = ""
