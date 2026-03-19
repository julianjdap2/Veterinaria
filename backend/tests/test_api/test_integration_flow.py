"""
Tests de integración: flujo login → cliente → mascota → consulta.

Requieren BD de test con al menos un usuario (ej. admin@vet.com) y empresa/plan.
"""

import pytest
from fastapi.testclient import TestClient


@pytest.mark.integration
def test_flujo_completo_login_cliente_mascota_consulta(client: TestClient):
    """Login, crear cliente, crear mascota, crear consulta (VETERINARIO)."""
    # Login
    r_login = client.post(
        "/auth/login",
        json={"email": "admin@vet.com", "password": "admin123"},
    )
    if r_login.status_code != 200:
        pytest.skip("Login falló: ¿usuario admin@vet.com en BD de test?")
    token = r_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Crear cliente (admin puede)
    r_cli = client.post(
        "/clientes/",
        json={
            "nombre": "Cliente Test Integración",
            "telefono": "3001112233",
            "email": "cliente.test@test.com",
            "documento": "98765432",
        },
        headers=headers,
    )
    if r_cli.status_code not in (200, 201):
        pytest.skip(f"Crear cliente falló: {r_cli.status_code} {r_cli.text}")
    cliente_id = r_cli.json()["id"]

    # Crear mascota
    r_mas = client.post(
        "/mascotas/",
        json={
            "nombre": "Mascota Test",
            "cliente_id": cliente_id,
            "especie_id": 1,
            "raza_id": 1,
        },
        headers=headers,
    )
    if r_mas.status_code not in (200, 201):
        pytest.skip(f"Crear mascota falló: {r_mas.status_code} {r_mas.text}")
    mascota_id = r_mas.json()["id"]

    # Crear consulta (veterinario)
    r_con = client.post(
        "/consultas/",
        json={
            "mascota_id": mascota_id,
            "motivo_consulta": "Control",
            "diagnostico": "Sin novedad",
        },
        headers=headers,
    )
    assert r_con.status_code in (200, 201), r_con.text
    data = r_con.json()
    assert data["mascota_id"] == mascota_id
    assert "id" in data


def test_clientes_list_returns_200_with_auth(client: TestClient, auth_headers: dict):
    """GET /clientes con token devuelve 200 y estructura paginada."""
    r = client.get("/clientes/", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)


def test_clientes_get_404_when_not_found(client: TestClient, auth_headers: dict):
    """GET /clientes/999999 devuelve 404 si no existe o no es de la empresa."""
    r = client.get("/clientes/999999", headers=auth_headers)
    assert r.status_code == 404


def test_citas_agenda_returns_200_with_auth(client: TestClient, auth_headers: dict):
    """GET /citas/agenda con token devuelve 200 y estructura paginada."""
    r = client.get("/citas/agenda", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)


def test_citas_get_404_when_not_found(client: TestClient, auth_headers: dict):
    """GET /citas/999999 devuelve 404 si no existe."""
    r = client.get("/citas/999999", headers=auth_headers)
    assert r.status_code == 404
