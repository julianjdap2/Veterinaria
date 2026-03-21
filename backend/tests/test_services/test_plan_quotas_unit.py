"""Tests unitarios de cuotas de plan (mascotas activas, citas por mes)."""

from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest

from app.core.errors import ApiError
from app.services.plan_quotas import verificar_limite_citas_mes, verificar_limite_mascotas_activas


def test_limite_mascotas_sin_tope_no_falla():
    db = MagicMock()
    plan = MagicMock(max_mascotas=None)
    with patch("app.services.plan_quotas._obtener_plan_por_empresa", return_value=plan):
        verificar_limite_mascotas_activas(db, 1)


def test_limite_mascotas_bloquea_cuando_igual_al_max():
    db = MagicMock()
    plan = MagicMock(max_mascotas=3)
    with (
        patch("app.services.plan_quotas._obtener_plan_por_empresa", return_value=plan),
        patch(
            "app.repositories.mascota_repository.count_mascotas_por_empresa",
            return_value=3,
        ),
    ):
        with pytest.raises(ApiError) as e:
            verificar_limite_mascotas_activas(db, 1)
    assert e.value.code == "plan_pet_limit_reached"


def test_limite_citas_mes_bloquea_cuando_igual_al_max():
    db = MagicMock()
    plan = MagicMock(max_citas_mes=10)
    with (
        patch("app.services.plan_quotas._obtener_plan_por_empresa", return_value=plan),
        patch(
            "app.repositories.cita_repository.count_citas_empresa_en_mes",
            return_value=10,
        ),
    ):
        with pytest.raises(ApiError) as e:
            verificar_limite_citas_mes(
                db,
                1,
                datetime(2026, 3, 15, 10, 0, 0),
                exclude_cita_id=None,
            )
    assert e.value.code == "plan_cita_month_limit_reached"


def test_limite_citas_mes_permite_si_hay_cupo():
    db = MagicMock()
    plan = MagicMock(max_citas_mes=10)
    with (
        patch("app.services.plan_quotas._obtener_plan_por_empresa", return_value=plan),
        patch(
            "app.repositories.cita_repository.count_citas_empresa_en_mes",
            return_value=9,
        ),
    ):
        verificar_limite_citas_mes(
            db,
            1,
            datetime(2026, 3, 15, 10, 0, 0),
            exclude_cita_id=5,
        )
