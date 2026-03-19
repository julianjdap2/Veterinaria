from pydantic import BaseModel, ConfigDict, Field


class CategoriaProductoBase(BaseModel):
    nombre: str = Field(..., max_length=80)


class CategoriaProductoCreate(CategoriaProductoBase):
    pass


class CategoriaProductoResponse(CategoriaProductoBase):
    id: int
    empresa_id: int

    model_config = ConfigDict(from_attributes=True)
