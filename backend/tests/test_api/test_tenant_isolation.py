"""
Regresión mínima de aislamiento por tenant: IDs inexistentes o no accesibles → 404/empty.

No sustituye pentest; valida que la API no devuelva 200 con datos ajenos por ID adivinado.
"""

import pytest
from fastapi.testclient import TestClient


@pytest.mark.integration
def test_mascota_inexistente_o_no_accesible_404(client: TestClient, auth_headers: dict):
    """Otra clínica o ID inexistente: misma respuesta (404), sin filtrar existencia real."""
    r = client.get("/mascotas/999999998", headers=auth_headers)
    assert r.status_code == 404
    body = r.json()
    err = body.get("error") or {}
    assert isinstance(err, dict) and err.get("code") == "mascota_not_found"


@pytest.mark.integration
def test_consulta_inexistente_o_no_accesible_404(client: TestClient, auth_headers: dict):
    r = client.get("/consultas/999999998", headers=auth_headers)
    assert r.status_code == 404


@pytest.mark.integration
def test_buscar_identidad_documento_inexistente_sin_mascotas(client: TestClient, auth_headers: dict):
    """Documento que no existe en la plataforma: encontrado false, sin filas de mascotas."""
    r = client.get(
        "/clientes/buscar-identidad",
        params={"documento": "00000000000000001"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    data = r.json()
    assert data.get("encontrado") is False
    assert data.get("mascotas") == []


@pytest.mark.integration
def test_cita_inexistente_404(client: TestClient, auth_headers: dict):
    r = client.get("/citas/999999998", headers=auth_headers)
    assert r.status_code == 404
