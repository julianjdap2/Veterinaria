from __future__ import annotations

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.errors import ApiError, error_payload
from app.core.request_context import get_request_id


def _request_id() -> str | None:
    return get_request_id()


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=error_payload(
            code="http_error",
            message=str(exc.detail) if exc.detail else "Error HTTP",
            request_id=_request_id(),
        ),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    details = exc.errors()
    return JSONResponse(
        status_code=422,
        content=error_payload(
            code="validation_error",
            message="Solicitud inválida",
            request_id=_request_id(),
            details=details,
        ),
    )


async def api_error_handler(request: Request, exc: ApiError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=error_payload(
            code=exc.code,
            message=exc.message,
            request_id=_request_id(),
            details=exc.details,
        ),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content=error_payload(
            code="internal_error",
            message="Error interno del servidor",
            request_id=_request_id(),
        ),
    )

