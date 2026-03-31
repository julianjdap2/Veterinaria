from pydantic import BaseModel, Field


class MascotaIdentidadItem(BaseModel):
    id: int
    nombre: str
    sexo: str | None = None
    especie_id: int | None = None


class ClienteIdentidadBusquedaResponse(BaseModel):
    """Resultado de búsqueda por documento (ámbito global + permisos de la clínica actual)."""

    encontrado: bool
    cliente_id: int | None = None
    estado_vinculo: str = "ninguno"  # ninguno | parcial | completo
    puede_vincular: bool = False
    nombre: str | None = None
    documento: str | None = None
    telefono: str | None = None
    email: str | None = None
    direccion: str | None = None
    mascotas: list[MascotaIdentidadItem] = Field(default_factory=list)


class VinculacionPresencialRequest(BaseModel):
    cliente_id: int = Field(..., ge=1)
    documento: str = Field(..., min_length=4, max_length=32)
    telefono: str = Field(..., min_length=6, max_length=32)
    confirmo_consentimiento: bool = False
    marketing_canal: str | None = Field(None, max_length=150)


class VinculacionParcialRequest(BaseModel):
    cliente_id: int = Field(..., ge=1)
    documento: str = Field(..., min_length=4, max_length=32)
    marketing_canal: str | None = Field(None, max_length=150)


class VinculacionResponse(BaseModel):
    ok: bool = True
    access_level: str
    mensaje: str
