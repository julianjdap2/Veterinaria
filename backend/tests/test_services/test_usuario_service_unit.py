"""
Tests unitarios del servicio de usuarios.

Prueban reglas de negocio (email duplicado) con mocks.
"""

import pytest
from unittest.mock import MagicMock, patch
from app.core.errors import ApiError
from app.services.usuario_service import crear_usuario


def test_crear_usuario_lanza_api_error_si_email_ya_existe():
    """Si el email ya está registrado, crear_usuario lanza ApiError."""
    db = MagicMock()
    empresa = MagicMock(id=1)
    plan = MagicMock(max_usuarios=10)
    with pytest.raises(ApiError) as exc_info:
        with (
            patch("app.services.usuario_service.get_user_by_email", return_value=MagicMock(id=1)),
            patch("app.services.usuario_service.count_users_by_empresa", return_value=0),
            patch("app.services.usuario_service._obtener_empresa_y_plan", return_value=(empresa, plan)),
            patch("app.services.usuario_service.hash_password", return_value="hashed"),
        ):
            crear_usuario(
                db,
                nombre="Test",
                email="existente@test.com",
                password="pass123456",
                rol_id=1,
                empresa_id=1,
            )
    assert exc_info.value.code == "email_already_registered"
    assert exc_info.value.status_code == 400
