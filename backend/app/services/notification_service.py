"""
notification_service.py

Servicio de notificaciones. Usa el backend configurado en NOTIFICATION_BACKEND
(log, smtp o queue) para enviar avisos (ej. consulta registrada, recordatorio cita).
"""

from datetime import datetime

import logging

import httpx
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.notification_log import NotificationLog
from app.core.notifications import (
    Attachment,
    NotificationMessage,
    NotificationSender,
    get_notification_sender,
)


def _log_notification_attempt(
    *,
    db: Session | None,
    empresa_id: int | None,
    canal: str,
    tipo_evento: str,
    destino: str | None,
    estado: str,
    proveedor: str,
    error: str | None = None,
    cita_id: int | None = None,
) -> None:
    if db is None:
        return
    try:
        db.add(
            NotificationLog(
                empresa_id=empresa_id,
                cita_id=cita_id,
                canal=canal,
                tipo_evento=tipo_evento,
                destino=destino,
                estado=estado,
                proveedor=proveedor,
                error=error,
            )
        )
        db.commit()
    except Exception:
        db.rollback()


def notify_cita_recordatorio(
    *,
    db: Session | None = None,
    empresa_id: int | None = None,
    sender=None,
    email_cliente: str | None = None,
    nombre_mascota: str = "",
    fecha_cita: datetime | None = None,
    subject: str | None = None,
    body: str | None = None,
    reply_to: str | None = None,
    cita_id: int | None = None,
) -> None:
    """Envía recordatorio de cita al cliente (cron). Plantillas opcionales."""
    if not email_cliente:
        return
    if sender is None:
        sender = get_notification_sender()
    fecha_str = fecha_cita.strftime("%Y-%m-%d %H:%M") if fecha_cita else ""
    subj = subject if subject is not None else f"Recordatorio: cita para {nombre_mascota}"
    bod = (
        body
        if body is not None
        else f"Tiene una cita programada para {nombre_mascota} el {fecha_str}."
    )
    message = NotificationMessage(
        subject=subj,
        body=bod,
        to_email=email_cliente,
        reply_to=reply_to,
    )
    try:
        sender.send(message)
        _log_notification_attempt(
            db=db,
            empresa_id=empresa_id,
            canal="email",
            tipo_evento="cita_recordatorio",
            destino=email_cliente,
            estado="sent",
            proveedor=get_settings().NOTIFICATION_BACKEND,
            cita_id=cita_id,
        )
    except Exception as e:
        _log_notification_attempt(
            db=db,
            empresa_id=empresa_id,
            canal="email",
            tipo_evento="cita_recordatorio",
            destino=email_cliente,
            estado="failed",
            proveedor=get_settings().NOTIFICATION_BACKEND,
            error=str(e),
            cita_id=cita_id,
        )


def _log_phone_notification(*, channel: str, telefono: str, nombre_mascota: str, fecha_cita: datetime | None) -> None:
    """Simula envío a teléfono (SMS/WhatsApp) dejando traza en logs.

    Se deja como simulación para no depender de un proveedor (Twilio, Meta WhatsApp, etc.)
    mientras se integra la mensajería real.
    """
    logger = logging.getLogger(__name__)
    fecha_str = fecha_cita.strftime("%Y-%m-%d %H:%M") if fecha_cita else ""
    logger.info(
        "PHONE_NOTIFICATION channel=%s to=%s subject=%s body=%s",
        channel,
        telefono,
        f"Recordatorio: cita para {nombre_mascota}",
        f"Tiene una cita programada para {nombre_mascota} el {fecha_str}.",
    )


def _twilio_send_message(*, whatsapp: bool, telefono: str, body: str) -> None:
    """Envía mensajes vía Twilio (SMS o WhatsApp).

    Si Twilio no está configurado, el caller debe hacer fallback a log.
    """
    settings = get_settings()
    if not (settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_FROM_NUMBER):
        return

    logger = logging.getLogger(__name__)
    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"

    def normalize_phone_for_twilio(raw: str) -> str:
        """Convierte números a formato E.164 (con '+') para Twilio.

        Heurística:
        - Si viene con '+', lo respetamos.
        - Si viene con '00', lo convertimos a '+'.
        - Si no viene con '+':
          - si es <= 10 dígitos: asumimos DEFAULT_PHONE_COUNTRY_CODE (p.ej. '+57')
          - si es > 10 dígitos: asumimos que ya trae indicativo y solo agregamos '+'.
        """
        raw_s = (raw or "").strip()
        if not raw_s:
            return ""

        raw_s = raw_s.replace(" ", "")
        if raw_s.startswith("whatsapp:"):
            raw_s = raw_s[len("whatsapp:"):]

        digits = "".join(ch for ch in raw_s if ch.isdigit())
        if not digits:
            return ""

        # Si el raw traía '+', ya está.
        if raw_s.startswith("+"):
            return f"+{digits}"
        # Si trae '00' como prefijo internacional, lo pasamos a '+'.
        if raw_s.startswith("00"):
            return f"+{digits}"

        # Caso sin indicativo (local) vs con indicativo.
        if len(digits) <= 10:
            default_cc = settings.DEFAULT_PHONE_COUNTRY_CODE
            return f"{default_cc}{digits}"

        return f"+{digits}"

    to_number_base = normalize_phone_for_twilio(telefono)
    from_number_base = normalize_phone_for_twilio(settings.TWILIO_FROM_NUMBER)

    if whatsapp:
        to_number = f"whatsapp:{to_number_base}"
        from_number = f"whatsapp:{from_number_base}"
    else:
        to_number = to_number_base
        from_number = from_number_base

    try:
        resp = httpx.post(
            url,
            data={"To": to_number, "From": from_number, "Body": body},
            auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
            timeout=20,
        )
        resp.raise_for_status()
    except Exception as e:
        logger.exception("Twilio send failed: %s", e)
        # No levantamos excepción: preferimos fallback a log y no romper el flujo.
        raise


def _cita_body(nombre_mascota: str, fecha_cita: datetime | None) -> str:
    fecha_str = fecha_cita.strftime("%Y-%m-%d %H:%M") if fecha_cita else ""
    return f"Tiene una cita programada para {nombre_mascota} el {fecha_str}."


def notify_cita_recordatorio_whatsapp(
    *,
    db: Session | None = None,
    empresa_id: int | None = None,
    telefono: str | None = None,
    nombre_mascota: str = "",
    fecha_cita: datetime | None = None,
    body_text: str | None = None,
    cita_id: int | None = None,
) -> None:
    """Envia recordatorio de cita por WhatsApp (Twilio si está configurado; si no, log)."""
    if not telefono:
        return

    body = body_text if body_text is not None else _cita_body(nombre_mascota=nombre_mascota, fecha_cita=fecha_cita)
    s = get_settings()
    if s.TWILIO_ACCOUNT_SID and s.TWILIO_AUTH_TOKEN and s.TWILIO_FROM_NUMBER:
        try:
            _twilio_send_message(whatsapp=True, telefono=telefono, body=body)
            _log_notification_attempt(
                db=db,
                empresa_id=empresa_id,
                canal="whatsapp",
                tipo_evento="cita_recordatorio",
                destino=telefono,
                estado="sent",
                proveedor="twilio",
                cita_id=cita_id,
            )
            return
        except Exception as e:
            # Fallback a log si Twilio falla.
            _log_notification_attempt(
                db=db,
                empresa_id=empresa_id,
                canal="whatsapp",
                tipo_evento="cita_recordatorio",
                destino=telefono,
                estado="failed",
                proveedor="twilio",
                error=str(e),
                cita_id=cita_id,
            )

    _log_phone_notification(
        channel="whatsapp",
        telefono=telefono,
        nombre_mascota=nombre_mascota,
        fecha_cita=fecha_cita,
    )
    _log_notification_attempt(
        db=db,
        empresa_id=empresa_id,
        canal="whatsapp",
        tipo_evento="cita_recordatorio",
        destino=telefono,
        estado="sent",
        proveedor="log",
        cita_id=cita_id,
    )


def notify_cita_recordatorio_sms(
    *,
    db: Session | None = None,
    empresa_id: int | None = None,
    telefono: str | None = None,
    nombre_mascota: str = "",
    fecha_cita: datetime | None = None,
    body_text: str | None = None,
    cita_id: int | None = None,
) -> None:
    """Envia recordatorio de cita por SMS (Twilio si está configurado; si no, log)."""
    if not telefono:
        return

    body = body_text if body_text is not None else _cita_body(nombre_mascota=nombre_mascota, fecha_cita=fecha_cita)
    s = get_settings()
    if s.TWILIO_ACCOUNT_SID and s.TWILIO_AUTH_TOKEN and s.TWILIO_FROM_NUMBER:
        try:
            _twilio_send_message(whatsapp=False, telefono=telefono, body=body)
            _log_notification_attempt(
                db=db,
                empresa_id=empresa_id,
                canal="sms",
                tipo_evento="cita_recordatorio",
                destino=telefono,
                estado="sent",
                proveedor="twilio",
                cita_id=cita_id,
            )
            return
        except Exception as e:
            _log_notification_attempt(
                db=db,
                empresa_id=empresa_id,
                canal="sms",
                tipo_evento="cita_recordatorio",
                destino=telefono,
                estado="failed",
                proveedor="twilio",
                error=str(e),
                cita_id=cita_id,
            )

    _log_phone_notification(
        channel="sms",
        telefono=telefono,
        nombre_mascota=nombre_mascota,
        fecha_cita=fecha_cita,
    )
    _log_notification_attempt(
        db=db,
        empresa_id=empresa_id,
        canal="sms",
        tipo_evento="cita_recordatorio",
        destino=telefono,
        estado="sent",
        proveedor="log",
        cita_id=cita_id,
    )


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

