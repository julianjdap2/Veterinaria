from __future__ import annotations

from typing import Any


class ApiError(Exception):
    """Excepción de negocio; el handler global devuelve JSON con code, message y request_id."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: Any | None = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


def error_payload(*, code: str, message: str, request_id: str | None, details: Any | None = None) -> dict:
    payload: dict[str, Any] = {
        "error": {
            "code": code,
            "message": message,
        }
    }
    if request_id:
        payload["error"]["request_id"] = request_id
    if details is not None:
        payload["error"]["details"] = details
    return payload

