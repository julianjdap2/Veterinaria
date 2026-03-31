"""Correo tras registro público: resumen tipo tabla y enlace al login / configuración."""

from __future__ import annotations

import html
import logging
from urllib.parse import quote

from app.config import get_settings
from app.core.notifications import NotificationMessage, get_notification_sender

logger = logging.getLogger(__name__)

TIPO_LABELS: dict[str, str] = {
    "independiente": "Independiente",
    "clinica": "Clínica veterinaria",
    "guarderia": "Guardería",
    "peluqueria": "Peluquería / Spa",
}


def enviar_correo_solicitud_registro(
    *,
    usuario_email: str,
    usuario_nombre: str,
    empresa_nombre: str,
    ciudad: str,
    departamento: str | None,
    pais: str,
    tipo_establecimiento: str,
    telefono: str | None,
    canal_origen: str,
    distribuidor: str,
    activation_token: str,
) -> None:
    s = get_settings()
    base = (s.FRONTEND_PUBLIC_URL or "").strip().rstrip("/") or "http://localhost:5173"
    continuar_url = f"{base}/activar?token={quote(activation_token, safe='')}"
    tipo_txt = TIPO_LABELS.get(tipo_establecimiento.strip().lower(), tipo_establecimiento)
    dep = (departamento or "").strip() or "—"
    tel = (telefono or "").strip() or "N/A"
    canal = (canal_origen or "").strip()
    dist = (distribuidor or "").strip() or "N/A"

    def esc(x: str) -> str:
        return html.escape(x, quote=True)

    rows_html = "".join(
        f"<tr><td style='padding:8px 12px;border:1px solid #e5e7eb;color:#64748b;'>{esc(l)}</td>"
        f"<td style='padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;color:#0f172a;'>{esc(v)}</td></tr>"
        for l, v in [
            ("Veterinaria", empresa_nombre),
            ("Tipo", tipo_txt),
            ("Ciudad", ciudad),
            ("Departamento/Región", dep),
            ("País", pais),
            ("Contacto", usuario_nombre),
            ("Email", usuario_email),
            ("Teléfono", tel),
            ("Distribuidor", dist),
            ("¿Cómo nos encontró?", canal),
        ]
    )

    body_html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;box-shadow:0 1px 3px rgba(0,0,0,.08);">
    <h1 style="font-size:18px;color:#0f172a;margin:0 0 12px;">Solicitud de instalación</h1>
    <p style="color:#475569;font-size:14px;line-height:1.5;margin:0 0 20px;">
      Hemos recibido su solicitud de instalación; para continuar, abra el vínculo siguiente (no necesita escribir correo ni contraseña).
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
      <thead><tr>
        <th style="text-align:left;padding:8px 12px;border:1px solid #e5e7eb;background:#f1f5f9;">Solicitado</th>
        <th style="text-align:left;padding:8px 12px;border:1px solid #e5e7eb;background:#f1f5f9;">Respuesta</th>
      </tr></thead>
      <tbody>{rows_html}</tbody>
    </table>
    <div style="text-align:center;margin-bottom:16px;">
      <a href="{esc(continuar_url)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">Continuar con la configuración</a>
    </div>
    <p style="font-size:12px;color:#64748b;font-style:italic;text-align:center;">*El vínculo de activación puede caducar en 24 horas según políticas de seguridad.*</p>
    <p style="font-size:12px;color:#64748b;margin-top:16px;line-height:1.5;">
      Al continuar con la instalación se creará una cuenta para su veterinaria, sujeta a validación.
      Use la cuenta de forma regular; evite períodos prolongados de inactividad.
    </p>
  </div>
</body></html>"""

    body_plain = (
        f"Solicitud de instalación\n\n"
        f"Veterinaria: {empresa_nombre}\n"
        f"Tipo: {tipo_txt}\n"
        f"Ciudad: {ciudad}\n"
        f"Departamento/Región: {dep}\n"
        f"País: {pais}\n"
        f"Contacto: {usuario_nombre}\n"
        f"Email: {usuario_email}\n"
        f"Teléfono: {tel}\n"
        f"Distribuidor: {dist}\n"
        f"¿Cómo nos encontró?: {canal}\n\n"
        f"Continuar con la configuración (enlace seguro, sin volver a iniciar sesión): {continuar_url}\n"
    )

    try:
        get_notification_sender().send(
            NotificationMessage(
                subject=f"Verificación instalación — {empresa_nombre}",
                body=body_plain,
                body_html=body_html,
                to_email=usuario_email.strip().lower(),
            )
        )
    except Exception:
        logger.exception("No se pudo enviar el correo post-registro a %s", usuario_email)
