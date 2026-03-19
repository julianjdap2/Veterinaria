"""Schemas comunes: paginación con total."""

from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Respuesta paginada con items y total de registros."""

    items: list[T]
    total: int
    page: int
    page_size: int
