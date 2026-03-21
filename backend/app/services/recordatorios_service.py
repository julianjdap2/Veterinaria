"""
recordatorios_service.py

Envío de recordatorios de citas (cron). Respeta configuración por empresa
(notificaciones_json): modo día calendario vs ventana en horas, plantillas,
canales, límite diario y deduplicación por cita_id + canal.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta

from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.models.cita import Cita
from app.models.empresa import Empresa
from app.models.empresa_configuracion import EmpresaConfiguracion
from app.models.mascota import Mascota
from app.models.notification_log import NotificationLog
from app.services.notificaciones_config_service import notificaciones_dict_for_empresa
from app.services.notification_service import (
    notify_cita_recordatorio,
    notify_cita_recordatorio_sms,
    notify_cita_recordatorio_whatsapp,
)


def _formatear_plantillas(
    cfg: dict,
    *,
    nombre_mascota: str,
    fecha_cita: datetime | None,
    nombre_clinica: str,
    nombre_cliente: str,
) -> tuple[str, str, str]:
    fecha_str = fecha_cita.strftime("%Y-%m-%d %H:%M") if fecha_cita else ""
    ctx = {
        "nombre_mascota": nombre_mascota or "",
        "fecha": fecha_str,
        "clinica": nombre_clinica or "",
        "cliente": nombre_cliente or "",
    }

    def fmt(tpl: str | None) -> str:
        if not tpl:
            return ""
        try:
            return str(tpl).format(**ctx)
        except (KeyError, ValueError):
            return str(tpl)

    subj = fmt(cfg.get("plantilla_email_asunto"))
    body = fmt(cfg.get("plantilla_email_cuerpo"))
    sms = fmt(cfg.get("plantilla_sms_cuerpo"))
    return subj, body, sms


def _count_envios_recordatorio_hoy(db: Session, empresa_id: int) -> int:
    start = datetime.combine(datetime.now().date(), time.min)
    n = (
        db.query(func.count(NotificationLog.id))
        .filter(
            NotificationLog.empresa_id == empresa_id,
            NotificationLog.tipo_evento == "cita_recordatorio",
            NotificationLog.estado == "sent",
            NotificationLog.created_at >= start,
        )
        .scalar()
    )
    return int(n or 0)


def _ya_enviado(db: Session, cita_id: int, canal: str) -> bool:
    return (
        db.query(NotificationLog)
        .filter(
            NotificationLog.cita_id == cita_id,
            NotificationLog.canal == canal,
            NotificationLog.tipo_evento == "cita_recordatorio",
            NotificationLog.estado == "sent",
        )
        .first()
        is not None
    )


def _cita_en_modo_calendario(cita: Cita, target_date: date) -> bool:
    if not cita.fecha:
        return False
    return cita.fecha.date() == target_date


def _cita_en_modo_ventana(cita: Cita, now: datetime, horas: float, ventana: float) -> bool:
    if not cita.fecha:
        return False
    delta_h = (cita.fecha - now).total_seconds() / 3600.0
    return abs(delta_h - horas) <= (ventana / 2.0)


def enviar_recordatorios_citas_manana(db: Session, fecha_objetivo: date | None = None) -> int:
    """
    Procesa citas próximas y envía recordatorios según la config de cada empresa.

    - Modo `dia_calendario` (por defecto): citas del día `fecha_objetivo` o mañana.
    - Modo `ventana_horas`: citas cuya fecha cae en [ahora + H - V/2, ahora + H + V/2].

    Returns:
        Número de envíos realizados (suma por canal).
    """
    now = datetime.now()
    target_date = fecha_objetivo or (now.date() + timedelta(days=1))

    citas = (
        db.query(Cita)
        .options(
            joinedload(Cita.mascota).joinedload(Mascota.cliente),
            joinedload(Cita.mascota).joinedload(Mascota.empresa).joinedload(Empresa.plan),
        )
        .filter(or_(Cita.estado.is_(None), Cita.estado != "cancelada"))
        .filter(Cita.fecha.isnot(None))
        .filter(Cita.fecha >= now - timedelta(hours=1))
        .filter(Cita.fecha <= now + timedelta(days=5))
        .all()
    )

    enviadas = 0
    for cita in citas:
        mascota = cita.mascota
        if not mascota:
            continue
        empresa_id = mascota.empresa_id
        ecfg = (
            db.query(EmpresaConfiguracion)
            .filter(EmpresaConfiguracion.empresa_id == empresa_id)
            .first()
        )
        if ecfg and not ecfg.feature_recordatorios_automaticos:
            continue

        cfg = notificaciones_dict_for_empresa(db, empresa_id)
        modo = cfg.get("recordatorio_modo") or "dia_calendario"
        if modo == "dia_calendario":
            if not _cita_en_modo_calendario(cita, target_date):
                continue
        else:
            horas = float(cfg.get("recordatorio_horas_antes") or 24)
            ventana = float(cfg.get("recordatorio_ventana_horas") or 6)
            if not _cita_en_modo_ventana(cita, now, horas, ventana):
                continue

        max_d = cfg.get("max_envios_recordatorio_dia")
        if max_d is not None:
            try:
                lim = int(max_d)
                if lim > 0 and _count_envios_recordatorio_hoy(db, empresa_id) >= lim:
                    continue
            except (TypeError, ValueError):
                pass

        cliente = getattr(mascota, "cliente", None)
        email = getattr(cliente, "email", None) if cliente else None
        telefono = getattr(cliente, "telefono", None) if cliente else None
        nombre_cliente = getattr(cliente, "nombre", "") if cliente else ""
        empresa = getattr(mascota, "empresa", None)
        nombre_clinica = getattr(empresa, "nombre", "") if empresa else "la clínica"
        plan = getattr(empresa, "plan", None) if empresa else None
        modulo_whatsapp = bool(getattr(plan, "modulo_whatsapp", False)) if plan else False

        subj, body_email, body_sms = _formatear_plantillas(
            cfg,
            nombre_mascota=mascota.nombre,
            fecha_cita=cita.fecha,
            nombre_clinica=nombre_clinica,
            nombre_cliente=nombre_cliente,
        )
        reply_to = cfg.get("reply_to_email")
        if isinstance(reply_to, str):
            reply_to = reply_to.strip() or None
        else:
            reply_to = None

        canal_email = cfg.get("canal_email", True)
        if canal_email and email:
            if not _ya_enviado(db, cita.id, "email"):
                notify_cita_recordatorio(
                    db=db,
                    empresa_id=empresa_id,
                    email_cliente=email,
                    nombre_mascota=mascota.nombre,
                    fecha_cita=cita.fecha,
                    subject=subj or None,
                    body=body_email or None,
                    reply_to=reply_to,
                    cita_id=cita.id,
                )
                enviadas += 1

        if not telefono or not modulo_whatsapp:
            continue

        body_wa = (body_sms or "").strip() or None

        if cfg.get("canal_whatsapp", False):
            if not _ya_enviado(db, cita.id, "whatsapp"):
                notify_cita_recordatorio_whatsapp(
                    db=db,
                    empresa_id=empresa_id,
                    telefono=telefono,
                    nombre_mascota=mascota.nombre,
                    fecha_cita=cita.fecha,
                    body_text=body_wa,
                    cita_id=cita.id,
                )
                enviadas += 1

        if cfg.get("canal_sms", False):
            if not _ya_enviado(db, cita.id, "sms"):
                notify_cita_recordatorio_sms(
                    db=db,
                    empresa_id=empresa_id,
                    telefono=telefono,
                    nombre_mascota=mascota.nombre,
                    fecha_cita=cita.fecha,
                    body_text=body_wa,
                    cita_id=cita.id,
                )
                enviadas += 1

    return enviadas
