"""
Tests de integración: health check y raíz.

Comprueban que la API responde y el endpoint /health devuelve estructura esperada.
"""

import pytest
from fastapi.testclient import TestClient


def test_root_returns_200(client: TestClient):
    """GET / devuelve 200 y mensaje de bienvenida."""
    r = client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert "message" in data
    assert "Veterinary" in data["message"]


def test_health_returns_structure(client: TestClient):
    """GET /health devuelve status y database."""
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert "status" in data
    assert "database" in data
    assert data["status"] in ("ok", "degraded")
