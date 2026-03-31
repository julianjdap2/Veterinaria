"""
Infraestructura de notificaciones.

Backends soportados (NOTIFICATION_BACKEND en .env):
- log: solo registra en consola (desarrollo).
- smtp: envía email vía SMTP (configurar SMTP_*).
- queue: reservado para futura cola (Celery/RQ).
"""

from __future__ import annotations

import smtplib
from dataclasses import dataclass
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Protocol

from app.config import get_settings


@dataclass(slots=True)
class Attachment:
    """Adjunto para email: nombre de archivo y contenido en bytes."""

    filename: str
    content: bytes


@dataclass(slots=True)
class NotificationMessage:
    """Mensaje estándar para cualquier canal de notificación."""

    subject: str
    body: str
    to_email: str | None = None
    attachments: list[Attachment] | None = None
    reply_to: str | None = None
    body_html: str | None = None


class NotificationSender(Protocol):
    """Interfaz para enviar notificaciones (log, email, cola)."""

    def send(self, message: NotificationMessage) -> None:
        ...


class SyncLoggerNotificationSender:
    """
    Registra la notificación en consola. No envía email real.
    Para enviar correos configure NOTIFICATION_BACKEND=smtp y SMTP_* en .env
    """

    def send(self, message: NotificationMessage) -> None:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(
            "NOTIFICATION (modo log, no se envía email) to=%s subject=%s",
            message.to_email,
            message.subject,
        )
        if getattr(message, "attachments", None) and message.attachments:
            logger.info("  Adjuntos: %s", [a.filename for a in message.attachments])
        if getattr(message, "body_html", None):
            logger.info("  (HTML alternativo incluido)")


class SMTPNotificationSender:
    """
    Envía notificaciones por email vía SMTP.
    Usa SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL.
    """

    def __init__(self) -> None:
        s = get_settings()
        self.host = s.SMTP_HOST
        self.port = s.SMTP_PORT
        self.user = s.SMTP_USER or None
        self.password = s.SMTP_PASSWORD or None
        self.from_email = s.SMTP_FROM_EMAIL or (s.SMTP_USER or "noreply@vet.local")

    def send(self, message: NotificationMessage) -> None:
        if not message.to_email:
            return
        if not self.host:
            import logging
            logging.getLogger(__name__).warning(
                "SMTP no configurado; omitiendo envío a %s", message.to_email
            )
            return
        msg = MIMEMultipart("mixed")
        msg["Subject"] = message.subject
        msg["From"] = self.from_email
        msg["To"] = message.to_email
        if getattr(message, "reply_to", None) and message.reply_to:
            msg["Reply-To"] = message.reply_to
        body_html = getattr(message, "body_html", None)
        if body_html:
            alt = MIMEMultipart("alternative")
            alt.attach(MIMEText(message.body, "plain", "utf-8"))
            alt.attach(MIMEText(body_html, "html", "utf-8"))
            msg.attach(alt)
        else:
            msg.attach(MIMEText(message.body, "plain", "utf-8"))
        if getattr(message, "attachments", None):
            for att in message.attachments:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(att.content)
                encoders.encode_base64(part)
                part.add_header(
                    "Content-Disposition",
                    "attachment",
                    filename=("utf-8", "", att.filename),
                )
                msg.attach(part)
        try:
            with smtplib.SMTP(self.host, self.port) as server:
                if self.user and self.password:
                    server.starttls()
                    server.login(self.user, self.password)
                server.sendmail(self.from_email, message.to_email, msg.as_string())
        except Exception as e:
            import logging
            logging.getLogger(__name__).exception("Error SMTP: %s", e)


def get_notification_sender() -> NotificationSender:
    """
    Devuelve el sender configurado según NOTIFICATION_BACKEND.
    """
    backend = get_settings().NOTIFICATION_BACKEND
    if backend == "smtp":
        return SMTPNotificationSender()
    if backend == "queue":
        # Futuro: return QueueNotificationSender()
        return SyncLoggerNotificationSender()
    return SyncLoggerNotificationSender()


# Compatibilidad: sender por defecto (log) para no romper llamadas directas
default_notification_sender: NotificationSender = SyncLoggerNotificationSender()

