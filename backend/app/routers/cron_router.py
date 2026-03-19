"""
cron_router.py

Endpoints para tareas programadas (cron). Protegidos por cabecera X-Cron-Secret.
"""

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.config import get_settings
from app.services.recordatorios_service import enviar_recordatorios_citas_manana

router = APIRouter(prefix="/cron", tags=["Cron"])


def _verificar_cron_secret(x_cron_secret: str | None = Header(None, alias="X-Cron-Secret")):
    """Si CRON_SECRET está definido en .env, exige header X-Cron-Secret igual."""
    secret = get_settings().CRON_SECRET or ""
    if secret and (not x_cron_secret or x_cron_secret != secret):
        raise HTTPException(status_code=403, detail="Cron secret inválido")
    return True


@router.post(
    "/recordatorios-citas",
    summary="Recordatorios de citas (mañana)",
    description="Envía notificaciones por cada cita con fecha mañana. Llamar desde cron. Opcional: header X-Cron-Secret.",
)
def ejecutar_recordatorios_citas(
    db: Session = Depends(get_db),
    _: bool = Depends(_verificar_cron_secret),
):
    enviadas = enviar_recordatorios_citas_manana(db)
    return {"enviadas": enviadas}
