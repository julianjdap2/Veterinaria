"""
notification_service.py

Servicio de notificaciones. Usa el backend configurado en NOTIFICATION_BACKEND
(log, smtp o queue) para enviar avisos (ej. consulta registrada, recordatorio cita).
"""

from datetime import datetime

from app.core.notifications import (
    Attachment,
    NotificationMessage,
    NotificationSender,
    get_notification_sender,
)


def notify_cita_recordatorio(
    *,
    sender=None,
    email_cliente: str | None = None,
    nombre_mascota: str = "",
    fecha_cita: datetime | None = None,
) -> None:
    """Envía recordatorio de cita al cliente (para cron de citas del día siguiente)."""
    if not email_cliente:
        return
    if sender is None:
        sender = get_notification_sender()
    fecha_str = fecha_cita.strftime("%Y-%m-%d %H:%M") if fecha_cita else ""
    message = NotificationMessage(
        subject=f"Recordatorio: cita para {nombre_mascota}",
        body=f"Tiene una cita programada para {nombre_mascota} el {fecha_str}.",
        to_email=email_cliente,
    )
    sender.send(message)


def notify_consulta_creada(
    *,
    sender: NotificationSender | None = None,
    email_cliente: str | None = None,
    nombre_mascota: str = "",
) -> None:
    if not email_cliente:
        return
    if sender is None:
        sender = get_notification_sender()

    message = NotificationMessage(
        subject=f"Nueva consulta registrada para {nombre_mascota}",
        body=f"Se ha registrado una nueva consulta para la mascota {nombre_mascota}.",
        to_email=email_cliente,
    )
    sender.send(message)


def notify_resumen_consulta(
    *,
    sender: NotificationSender | None = None,
    email_cliente: str | None = None,
    nombre_mascota: str = "",
    resumen_cuerpo: str,
    pdf_bytes: bytes | None = None,
) -> None:
    """Envía al cliente el resumen de la consulta por email (cuerpo en texto y opcionalmente PDF adjunto)."""
    if not email_cliente:
        return
    if sender is None:
        sender = get_notification_sender()
    attachments = None
    if pdf_bytes:
        filename = f"resumen_consulta_{nombre_mascota.replace(' ', '_')}.pdf"
        attachments = [Attachment(filename=filename, content=pdf_bytes)]
    message = NotificationMessage(
        subject=f"Resumen de consulta - {nombre_mascota}",
        body=resumen_cuerpo,
        to_email=email_cliente,
        attachments=attachments,
    )
    sender.send(message)

