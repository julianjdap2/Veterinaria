"""
Crea invitación firmada por hash, envía correo al propietario y confirma ampliación de vínculo.
"""

from __future__ import annotations

import hashlib
import logging
import secrets
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.errors import ApiError
from app.core.notifications import NotificationMessage, get_notification_sender
from app.models.cliente import Cliente
from app.models.empresa import Empresa
from app.repositories import vinculo_repository
from app.repositories.vinculo_invitacion_repository import (
    crear_invitacion,
    invalidar_pendientes,
    marcar_usada,
    obtener_por_token_hash,
)

logger = logging.getLogger(__name__)


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def crear_y_enviar_invitacion_ampliar_vinculo(
    db: Session,
    *,
    cliente_id: int,
    empresa_id: int,
) -> None:
    """Genera token, persiste hash y envía correo (o log si no hay SMTP)."""
    if not vinculo_repository.obtener_vinculo_activo(db, cliente_id, empresa_id):
        logger.warning(
            "Invitación no enviada: no hay vínculo activo cliente_id=%s empresa_id=%s",
            cliente_id,
            empresa_id,
        )
        return
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente or not (cliente.email or "").strip():
        logger.warning("Sin email de propietario; no se envía invitación de vínculo cliente_id=%s", cliente_id)
        return

    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    nombre_clinica = (empresa.nombre if empresa else "Una clínica").strip() or "Una clínica"

    settings = get_settings()
    horas = settings.VINCULO_INVITE_EXPIRE_HOURS
    raw = secrets.token_urlsafe(32)
    th = _hash_token(raw)
    exp = datetime.utcnow() + timedelta(hours=horas)

    invalidar_pendientes(db, cliente_id, empresa_id)
    crear_invitacion(db, cliente_id=cliente_id, empresa_id=empresa_id, token_hash=th, expires_at=exp)

    base = settings.FRONTEND_PUBLIC_URL.rstrip("/")
    url = f"{base}/vinculo-clinica?token={raw}"

    subject = f"{nombre_clinica} solicita acceso completo a tu historial"
    body = (
        f"Hola{((' ' + (cliente.nombre or '').split()[0]) if (cliente.nombre or '').strip() else '')},\n\n"
        f"La clínica «{nombre_clinica}» registró un vínculo provisional contigo en nuestra plataforma.\n"
        "Si reconoces la visita y deseas permitir acceso completo (ver y gestionar historial según las políticas del servicio), "
        "abre el siguiente enlace o pégalo en tu navegador:\n\n"
        f"{url}\n\n"
        f"El enlace caduca en aproximadamente {horas} horas. Si no fuiste tú, ignora este mensaje.\n"
    )
    body_html = f"""
    <p>Hola{((' ' + (cliente.nombre or '').split()[0]) if (cliente.nombre or '').strip() else '')},</p>
    <p>La clínica <strong>{nombre_clinica}</strong> solicita ampliar el acceso a tu expediente veterinario compartido.</p>
    <p><a href="{url}" style="display:inline-block;padding:10px 18px;background:#4f46e5;color:#fff;
    text-decoration:none;border-radius:8px;font-weight:600;">Autorizar acceso completo</a></p>
    <p style="font-size:12px;color:#64748b;">Si el botón no funciona, copia y pega esta URL:<br/><span style="word-break:break-all;">{url}</span></p>
    <p style="font-size:12px;color:#64748b;">Caduca en unas {horas} horas.</p>
    """

    get_notification_sender().send(
        NotificationMessage(
            subject=subject,
            body=body,
            body_html=body_html,
            to_email=cliente.email.strip(),
        )
    )


def confirmar_vinculo_desde_token(db: Session, raw_token: str) -> dict:
    raw = (raw_token or "").strip()
    if len(raw) < 20:
        raise ApiError(code="token_invalido", message="Enlace incompleto o inválido.", status_code=400)

    th = _hash_token(raw)
    inv = obtener_por_token_hash(db, th)
    if not inv:
        raise ApiError(code="token_invalido", message="Enlace no válido o ya utilizado.", status_code=400)

    now = datetime.utcnow()
    if inv.used_at is not None:
        raise ApiError(code="token_usado", message="Este enlace ya fue utilizado.", status_code=400)
    if inv.expires_at <= now:
        raise ApiError(code="token_expirado", message="El enlace ha caducado. Solicite uno nuevo en la clínica.", status_code=400)

    vinculo_repository.upsert_vinculo(
        db,
        cliente_id=inv.cliente_id,
        empresa_id=inv.empresa_id,
        access_level=vinculo_repository.ACCESS_FULL,
    )
    marcar_usada(db, inv)

    empresa = db.query(Empresa).filter(Empresa.id == inv.empresa_id).first()
    return {
        "ok": True,
        "mensaje": "Acceso completo autorizado para esta clínica.",
        "empresa_nombre": (empresa.nombre if empresa else "") or "La clínica",
    }
