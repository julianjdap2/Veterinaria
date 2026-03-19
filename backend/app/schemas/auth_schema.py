"""
auth_schema.py

Schemas para autenticación (login y respuesta JWT).
"""

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """Cuerpo del request de login."""

    email: str = Field(description="Email del usuario")
    password: str = Field(description="Contraseña")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"email": "admin@vet.com", "password": "mi_password_seguro"}
            ]
        }
    }


class TokenResponse(BaseModel):
    """Respuesta con el token JWT."""

    access_token: str = Field(description="Token JWT para Authorization: Bearer")
    token_type: str = Field(default="bearer", description="Tipo de token")