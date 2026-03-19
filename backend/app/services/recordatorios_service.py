"""
recordatorios_service.py

Envío de recordatorios de citas (ej. día siguiente).
Pensado para ser invocado por cron o tarea programada.
"""

from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session, joinedload

from app.models.cita import Cita
from app.models.mascota import Mascota
from app.services.notification_service import notify_cita_recordatorio


def enviar_recordatorios_citas_manana(db: Session) -> int:
    """
    Busca citas con fecha en el día siguiente (mañana) y envía
    notificación al email del cliente de la mascota. Devuelve cantidad enviadas.
    """
    now = datetime.now(timezone.utc)
    manana_inicio = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    manana_fin = manana_inicio + timedelta(days=1)

    citas = (
        db.query(Cita)
        .options(joinedload(Cita.mascota).joinedload(Mascota.cliente))
        .filter(
            Cita.fecha >= manana_inicio,
            Cita.fecha < manana_fin,
            Cita.estado != "cancelada",
        )
        .all()
    )
    enviadas = 0
    for cita in citas:
        mascota = cita.mascota
        if not mascota:
            continue
        cliente = getattr(mascota, "cliente", None)
        email = getattr(cliente, "email", None) if cliente else None
        if email:
            notify_cita_recordatorio(
                email_cliente=email,
                nombre_mascota=mascota.nombre,
                fecha_cita=cita.fecha,
            )
            enviadas += 1
    return enviadas
