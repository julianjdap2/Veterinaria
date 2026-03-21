"""
cron_router.py

Endpoints para tareas programadas (cron). Protegidos por cabecera X-Cron-Secret.
"""

from datetime import date

from fastapi import APIRouter, Depends, Header, HTTPException, Query
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
    summary="Recordatorios de citas (cron)",
    description=(
        "Envía recordatorios según la configuración de cada empresa "
        "(`GET /empresa/config-notificaciones`): modo día calendario (por defecto: citas del día `fecha` o mañana) "
        "o modo ventana en horas. Requiere cron periódico (ej. cada hora si usas ventana_horas). "
        "Header opcional X-Cron-Secret."
    ),
)
def ejecutar_recordatorios_citas(
    db: Session = Depends(get_db),
    _: bool = Depends(_verificar_cron_secret),
    fecha: date | None = Query(
        default=None,
        description="Opcional: ejecutar recordatorios para la fecha indicada (YYYY-MM-DD). Si no se envía, usa mañana.",
    ),
):
    enviadas = enviar_recordatorios_citas_manana(db, fecha_objetivo=fecha)
    return {"enviadas": enviadas}
