from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.request_context import ensure_request_id, clear_request_id


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        incoming = request.headers.get("x-request-id")
        request_id = ensure_request_id(incoming)

        try:
            response = await call_next(request)
        finally:
            clear_request_id()

        response.headers["x-request-id"] = request_id
        return response

