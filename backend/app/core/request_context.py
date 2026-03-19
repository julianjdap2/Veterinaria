from __future__ import annotations

from contextvars import ContextVar
from uuid import uuid4


request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)


def ensure_request_id(existing: str | None = None) -> str:
    rid = existing or str(uuid4())
    request_id_var.set(rid)
    return rid


def get_request_id() -> str | None:
    return request_id_var.get()


def clear_request_id() -> None:
    request_id_var.set(None)

