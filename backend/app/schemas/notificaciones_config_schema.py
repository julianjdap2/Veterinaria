"""Configuración de recordatorios y plantillas por empresa."""

from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator
from typing_extensions import Self


RecordatorioModo = Literal["dia_calendario", "ventana_horas"]
UnidadAntes = Literal["horas", "dias", "semanas"]


class ReglaRecordatorio(BaseModel):
    """Una regla: cuánto antes de la cita y por qué canales."""

    valor: int = Field(1, ge=1, le=8760, description="Cantidad antes de la cita")
    unidad: UnidadAntes = "dias"
    canal_email: bool = True
    canal_sms: bool = False
    canal_whatsapp: bool = False

    @model_validator(mode="after")
    def al_menos_un_medio(self) -> Self:
        if not (self.canal_email or self.canal_sms or self.canal_whatsapp):
            raise ValueError("Cada regla debe tener al menos un medio de envío activo (email, SMS o WhatsApp).")
        return self


class NotificacionesConfigResponse(BaseModel):
    recordatorio_modo: RecordatorioModo = "dia_calendario"
    recordatorio_horas_antes: int = Field(24, ge=1, le=168)
    recordatorio_ventana_horas: int = Field(6, ge=1, le=48)
    canal_email: bool = True
    canal_sms: bool = False
    canal_whatsapp: bool = False
    # Si hay al menos una regla, el cron usa solo reglas (ventana por regla) y deduplica por índice.
    reglas_recordatorio: list[ReglaRecordatorio] = Field(default_factory=list)
    plantilla_email_asunto: str = Field(
        default="Recordatorio: cita para {nombre_mascota}",
        max_length=200,
    )
    plantilla_email_cuerpo: str = Field(
        default=(
            "Hola {cliente},\n\n"
            "Le recordamos la cita de {nombre_mascota} el {fecha} en {clinica}.\n\n"
            "Saludos."
        ),
        max_length=4000,
    )
    plantilla_sms_cuerpo: str = Field(
        default="Cita de {nombre_mascota} el {fecha}. {clinica}",
        max_length=500,
    )
    max_envios_recordatorio_dia: Optional[int] = Field(None, ge=1, le=10000)
    reply_to_email: Optional[str] = Field(None, max_length=120)


class NotificacionesConfigUpdate(BaseModel):
    recordatorio_modo: Optional[RecordatorioModo] = None
    recordatorio_horas_antes: Optional[int] = Field(None, ge=1, le=168)
    recordatorio_ventana_horas: Optional[int] = Field(None, ge=1, le=48)
    canal_email: Optional[bool] = None
    canal_sms: Optional[bool] = None
    canal_whatsapp: Optional[bool] = None
    reglas_recordatorio: Optional[list[ReglaRecordatorio]] = None
    plantilla_email_asunto: Optional[str] = Field(None, max_length=200)
    plantilla_email_cuerpo: Optional[str] = Field(None, max_length=4000)
    plantilla_sms_cuerpo: Optional[str] = Field(None, max_length=500)
    max_envios_recordatorio_dia: Optional[int] = Field(None, ge=1, le=10000)
    reply_to_email: Optional[str] = Field(None, max_length=120)
