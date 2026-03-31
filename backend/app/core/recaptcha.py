"""Verificación de Google reCAPTCHA v2 (checkbox)."""

from __future__ import annotations

import os

import httpx


def recaptcha_configured() -> bool:
    return bool(os.getenv("RECAPTCHA_SECRET_KEY", "").strip())


def verify_recaptcha_v2(response_token: str) -> bool:
    """
    Valida el token del cliente con la API siteverify de Google.
    Si RECAPTCHA_SECRET_KEY no está definida, no verifica (solo desarrollo local).
    """
    secret = os.getenv("RECAPTCHA_SECRET_KEY", "").strip()
    if not secret:
        return True
    token = (response_token or "").strip()
    if not token:
        return False
    try:
        r = httpx.post(
            "https://www.google.com/recaptcha/api/siteverify",
            data={"secret": secret, "response": token},
            timeout=15.0,
        )
        r.raise_for_status()
        data = r.json()
        return bool(data.get("success"))
    except (httpx.HTTPError, ValueError, TypeError):
        return False
