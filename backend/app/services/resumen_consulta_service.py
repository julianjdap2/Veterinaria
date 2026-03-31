"""
resumen_consulta_service.py

Genera el resumen estructurado de una consulta (texto y PDF) para mostrar,
descargar o enviar por email al cliente.
"""

from datetime import datetime
from io import BytesIO
from typing import Any

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.repositories.consulta_repository import obtener_consulta_por_id
from app.repositories.formula_repository import listar_por_consulta
from app.services.variables_clinicas_service import extras_consulta_a_texto


def _safe(s: str | None) -> str:
    return (s or "").strip() or "—"


def get_resumen_consulta(
    db: Session,
    consulta_id: int,
    empresa_id: int,
    mostrar_precio: bool = True,
) -> dict[str, Any]:
    """
    Obtiene la consulta con relaciones y devuelve un diccionario con el resumen
    estructurado (para JSON y para generar texto/PDF).
    """
    consulta = obtener_consulta_por_id(
        db=db,
        consulta_id=consulta_id,
        empresa_id=empresa_id,
    )
    if not consulta:
        raise ApiError(
            code="consulta_not_found",
            message="Consulta no encontrada",
            status_code=404,
        )

    mascota = getattr(consulta, "mascota", None)
    cliente = mascota.cliente if mascota else None
    veterinario = getattr(consulta, "veterinario", None)
    cita = getattr(consulta, "cita", None)

    fecha_consulta = consulta.fecha_consulta or consulta.created_at
    fecha_str = ""
    if fecha_consulta:
        if isinstance(fecha_consulta, datetime):
            fecha_str = fecha_consulta.strftime("%d/%m/%Y %H:%M")
        else:
            fecha_str = str(fecha_consulta)

    # Fórmula médica (medicamento, presentación, precio, observación)
    formula_items = listar_por_consulta(db, consulta.id, empresa_id)
    formula = [
        {
            "nombre": getattr(getattr(it, "producto", None), "nombre", None) or "—",
            "presentacion": _safe(it.presentacion) if hasattr(it, "presentacion") else "—",
            "precio": (
                (
                    str(it.precio)
                    if getattr(it, "precio", None) is not None
                    else (
                        str(getattr(getattr(it, "producto", None), "precio", None))
                        if getattr(getattr(it, "producto", None), "precio", None) is not None
                        else "—"
                    )
                )
                if mostrar_precio
                else None
            ),
            "observacion": _safe(it.observacion) if hasattr(it, "observacion") else "—",
            "cantidad": getattr(it, "cantidad", 1),
        }
        for it in formula_items
    ]

    return {
        "consulta_id": consulta.id,
        "fecha_consulta": fecha_str,
        "mascota_nombre": _safe(mascota.nombre) if mascota else "—",
        "cliente_nombre": _safe(cliente.nombre) if cliente else "—",
        "cliente_email": (cliente.email or "").strip() if cliente else "",
        "veterinario_nombre": _safe(veterinario.nombre) if veterinario else "—",
        "motivo_consulta": _safe(consulta.motivo_consulta),
        "diagnostico": _safe(consulta.diagnostico),
        "tratamiento": _safe(consulta.tratamiento),
        "notas_cita": _safe(getattr(cita, "notas", None)),
        "observaciones": _safe(consulta.observaciones),
        "extras_clinicos_texto": _safe(
            extras_consulta_a_texto(db, empresa_id, getattr(consulta, "extras_clinicos_json", None))
        ),
        "formula": formula,
        "mostrar_precio": mostrar_precio,
    }


def resumen_consulta_como_texto(resumen: dict[str, Any]) -> str:
    """Genera el resumen en texto plano para el cuerpo del email."""
    lineas = [
        "RESUMEN DE CONSULTA MÉDICA",
        "=" * 40,
        "",
        f"Fecha: {resumen.get('fecha_consulta', '—')}",
        f"Mascota: {resumen.get('mascota_nombre', '—')}",
        f"Cliente: {resumen.get('cliente_nombre', '—')}",
        "",
        "Motivo de consulta:",
        resumen.get("motivo_consulta", "—"),
        "",
        "Variables clínicas:",
        resumen.get("extras_clinicos_texto") or "—",
        "",
        "Diagnóstico:",
        resumen.get("diagnostico", "—"),
        "",
        "Tratamiento:",
        resumen.get("tratamiento", "—"),
        "",
        "Notas de la cita:",
        resumen.get("notas_cita", "—"),
        "",
        "Observaciones:",
        resumen.get("observaciones", "—"),
        "",
    ]
    formula = resumen.get("formula") or []
    if formula:
        lineas.append("FÓRMULA MÉDICA")
        lineas.append("-" * 40)
        for it in formula:
            if resumen.get("mostrar_precio"):
                lineas.append(
                    f"• {it.get('nombre', '—')} | Presentación: {it.get('presentacion', '—')} | Precio: {it.get('precio', '—')}"
                )
            else:
                lineas.append(
                    f"• {it.get('nombre', '—')} | Presentación: {it.get('presentacion', '—')}"
                )
            if it.get("observacion"):
                lineas.append(f"  Cómo aplicar: {it['observacion']}")
        lineas.append("")
    lineas.append(f"Atendido por: {resumen.get('veterinario_nombre', '—')}")
    return "\n".join(lineas)


def generar_pdf_resumen(resumen: dict[str, Any]) -> bytes:
    """Genera un PDF con el resumen de la consulta. Devuelve los bytes del archivo."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=1.5 * cm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "Title",
        parent=styles["Heading1"],
        fontSize=16,
        spaceAfter=12,
    )
    heading_style = styles["Heading2"]
    body_style = styles["Normal"]

    story = []
    story.append(Paragraph("Resumen de consulta médica", title_style))
    story.append(Spacer(1, 0.5 * cm))

    datos = [
        ["Fecha", resumen.get("fecha_consulta", "—")],
        ["Mascota", resumen.get("mascota_nombre", "—")],
        ["Cliente", resumen.get("cliente_nombre", "—")],
        ["Veterinario", resumen.get("veterinario_nombre", "—")],
    ]
    t = Table(datos, colWidths=[4 * cm, 12 * cm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f0f0f0")),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.black),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ]
        )
    )
    story.append(t)
    story.append(Spacer(1, 0.5 * cm))

    for label, key in [
        ("Motivo de consulta", "motivo_consulta"),
        ("Variables clínicas", "extras_clinicos_texto"),
        ("Diagnóstico", "diagnostico"),
        ("Tratamiento", "tratamiento"),
        ("Notas de la cita", "notas_cita"),
        ("Observaciones", "observaciones"),
    ]:
        story.append(Paragraph(label, heading_style))
        text = (resumen.get(key) or "—").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        story.append(Paragraph(text.replace("\n", "<br/>"), body_style))
        story.append(Spacer(1, 0.3 * cm))

    formula = resumen.get("formula") or []
    if formula:
        story.append(Paragraph("Fórmula médica", heading_style))
        story.append(Spacer(1, 0.2 * cm))
        mostrar_precio = bool(resumen.get("mostrar_precio"))
        if mostrar_precio:
            table_data = [["Medicamento", "Presentación", "Precio", "Observación (cómo aplicar)"]]
        else:
            table_data = [["Medicamento", "Presentación", "Observación (cómo aplicar)"]]
        for it in formula:
            nombre = (it.get("nombre") or "—").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            pres = (it.get("presentacion") or "—").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            obs = (it.get("observacion") or "—").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            if mostrar_precio:
                table_data.append([nombre, pres, str(it.get("precio", "—")), obs])
            else:
                table_data.append([nombre, pres, obs])
        if mostrar_precio:
            t_f = Table(table_data, colWidths=[4 * cm, 4 * cm, 2.5 * cm, 5.5 * cm])
        else:
            t_f = Table(table_data, colWidths=[5 * cm, 4 * cm, 5 * cm])
        t_f.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8f0fe")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ]
            )
        )
        story.append(t_f)
        story.append(Spacer(1, 0.5 * cm))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


def get_resumen_pdf(
    db: Session,
    consulta_id: int,
    empresa_id: int,
    mostrar_precio: bool = True,
) -> bytes:
    """Obtiene el resumen de la consulta y lo devuelve como PDF (bytes)."""
    resumen = get_resumen_consulta(
        db=db,
        consulta_id=consulta_id,
        empresa_id=empresa_id,
        mostrar_precio=mostrar_precio,
    )
    return generar_pdf_resumen(resumen)
