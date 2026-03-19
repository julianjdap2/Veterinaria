"""
conftest.py

Fixtures compartidos para pytest. Configura entorno de test y cliente HTTP.
"""

import os
import sys

import pytest
from fastapi.testclient import TestClient

# Asegurar que el backend está en el path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Marcar que estamos en test (para no validar SECRET_KEY/DATABASE_URL en startup)
os.environ.setdefault("TESTING", "1")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-pytest")
os.environ.setdefault("DATABASE_URL", "mysql+pymysql://root:@127.0.0.1/vet_system")


@pytest.fixture(scope="session")
def client():
    """Cliente HTTP para tests contra la API (sin levantar servidor)."""
    from main import app
    return TestClient(app)


@pytest.fixture
def auth_headers(client):
    """
    Obtiene un token de login y devuelve headers con Authorization.
    Requiere que exista un usuario en la BD de test (admin@vet.com / su contraseña).
    """
    # Si no hay usuario de test, el test que use auth_headers puede marcar skip
    r = client.post(
        "/auth/login",
        json={"email": "admin@vet.com", "password": "admin123"},
    )
    if r.status_code != 200:
        pytest.skip("Login falló (¿usuario admin@vet.com en BD de test?)")
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
