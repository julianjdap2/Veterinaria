import json
from collections import Counter
from datetime import date, datetime, timedelta

from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.models.cita import Cita
from app.models.usuario import Usuario
from app.models.lista_espera import ListaEspera
from app.models.venta import Venta, VentaItem
from app.models.producto import Producto
from app.models.consulta import Consulta
from app.models.notification_log import NotificationLog

from app.repositories.cita_repository import base_query_citas_empresa
from app.repositories.consulta_repository import base_query_consultas_empresa
from app.services.variables_clinicas_service import obtener_variables_clinicas_service


def _day_window(target: date) -> tuple[datetime, datetime]:
    start = datetime.combine(target, datetime.min.time())
    end = start + timedelta(days=1)
    return start, end


def get_dashboard_resumen_service(db: Session, empresa_id: int, dias: int = 1) -> dict:
    hoy = date.today()
    hoy_start, end = _day_window(hoy)
    start = hoy_start - timedelta(days=max(1, dias) - 1)

    # Resumen de estados de citas en el periodo.
    agg = (
        base_query_citas_empresa(db, empresa_id)
        .filter(Cita.fecha >= start, Cita.fecha < end)
        .with_entities(
            func.count(Cita.id).label("total"),
            func.sum(case((Cita.estado == "pendiente", 1), else_=0)).label("pendientes"),
            func.sum(case((Cita.estado == "confirmada", 1), else_=0)).label("confirmadas"),
            func.sum(case((Cita.estado == "revision", 1), else_=0)).label("revision"),
            func.sum(case((Cita.estado == "atendida", 1), else_=0)).label("atendidas"),
            func.sum(case((Cita.estado == "cancelada", 1), else_=0)).label("canceladas"),
            func.sum(case((Cita.urgente.is_(True), 1), else_=0)).label("urgentes"),
            func.sum(case((Cita.en_sala_espera.is_(True), 1), else_=0)).label("en_sala"),
        )
        .first()
    )

    total_hoy = int(agg.total or 0)
    pendientes_hoy = int(agg.pendientes or 0)
    confirmadas_hoy = int(agg.confirmadas or 0)
    en_revision_hoy = int(agg.revision or 0)
    atendidas_hoy = int(agg.atendidas or 0)
    canceladas_hoy = int(agg.canceladas or 0)
    urgentes_hoy = int(agg.urgentes or 0)
    en_sala_espera_ahora = (
        base_query_citas_empresa(db, empresa_id)
        .filter(
            Cita.en_sala_espera.is_(True),
            Cita.estado.in_(["pendiente", "confirmada"]),
        )
        .with_entities(func.count(Cita.id))
        .scalar()
    )
    en_sala_espera_ahora = int(en_sala_espera_ahora or 0)

    # Espera promedio (minutos) de lista_espera procesada en el periodo.
    wait_rows = (
        db.query(ListaEspera.created_at, ListaEspera.procesada_en)
        .filter(
            ListaEspera.empresa_id == empresa_id,
            ListaEspera.procesada.is_(True),
            ListaEspera.procesada_en.isnot(None),
            ListaEspera.procesada_en >= start,
            ListaEspera.procesada_en < end,
        )
        .all()
    )
    waits: list[int] = []
    for created_at, procesada_en in wait_rows:
        if created_at and procesada_en:
            delta = procesada_en - created_at
            waits.append(max(0, int(delta.total_seconds() // 60)))
    espera_promedio_min_hoy = int(round(sum(waits) / len(waits))) if waits else 0

    # Ventas del periodo: cantidad, ingresos y ticket promedio.
    ventas_hoy_row = (
        db.query(
            func.count(Venta.id).label("ventas"),
            func.coalesce(func.sum(Venta.total), 0).label("ingresos"),
        )
        .filter(
            Venta.empresa_id == empresa_id,
            Venta.fecha >= start,
            Venta.fecha < end,
        )
        .first()
    )
    ventas_hoy = int(ventas_hoy_row.ventas or 0)
    ingresos_hoy = float(ventas_hoy_row.ingresos or 0)
    ticket_promedio_hoy = float(round((ingresos_hoy / ventas_hoy), 2)) if ventas_hoy > 0 else 0.0

    # Consultas del periodo.
    consultas_totales = (
        base_query_consultas_empresa(db, empresa_id)
        .filter(
            func.coalesce(Consulta.fecha_consulta, Consulta.created_at) >= start,
            func.coalesce(Consulta.fecha_consulta, Consulta.created_at) < end,
        )
        .with_entities(func.count(Consulta.id))
        .scalar()
    )
    consultas_totales_periodo = int(consultas_totales or 0)

    top_motivos_rows = (
        base_query_consultas_empresa(db, empresa_id)
        .filter(
            func.coalesce(Consulta.fecha_consulta, Consulta.created_at) >= start,
            func.coalesce(Consulta.fecha_consulta, Consulta.created_at) < end,
            Consulta.motivo_consulta.isnot(None),
            Consulta.motivo_consulta != "",
        )
        .with_entities(
            Consulta.motivo_consulta.label("texto"),
            func.count(Consulta.id).label("cantidad"),
        )
        .group_by(Consulta.motivo_consulta)
        .order_by(func.count(Consulta.id).desc())
        .limit(10)
        .all()
    )
    top_motivos_consulta = [
        {"texto": (r.texto or "").strip()[:120], "cantidad": int(r.cantidad or 0)}
        for r in top_motivos_rows
        if (r.texto or "").strip()
    ]

    top_tratamientos_rows = (
        base_query_consultas_empresa(db, empresa_id)
        .filter(
            func.coalesce(Consulta.fecha_consulta, Consulta.created_at) >= start,
            func.coalesce(Consulta.fecha_consulta, Consulta.created_at) < end,
            Consulta.tratamiento.isnot(None),
            Consulta.tratamiento != "",
        )
        .with_entities(
            Consulta.tratamiento.label("texto"),
            func.count(Consulta.id).label("cantidad"),
        )
        .group_by(Consulta.tratamiento)
        .order_by(func.count(Consulta.id).desc())
        .limit(10)
        .all()
    )
    top_tratamientos = [
        {"texto": (r.texto or "").strip()[:120], "cantidad": int(r.cantidad or 0)}
        for r in top_tratamientos_rows
        if (r.texto or "").strip()
    ]

    # Variables clínicas (extras JSON en consultas/citas del periodo).
    def _parse_extras(raw: str | None) -> dict:
        if not raw or not str(raw).strip():
            return {}
        try:
            data = json.loads(raw)
            return data if isinstance(data, dict) else {}
        except json.JSONDecodeError:
            return {}

    def _top_from_counter(counter: Counter[str], labels: dict[str, str], limit: int = 10) -> list[dict]:
        out: list[dict] = []
        for item_id, qty in counter.most_common(limit):
            out.append({"texto": labels.get(item_id, item_id), "cantidad": int(qty)})
        return out

    vars_catalog = obtener_variables_clinicas_service(db, empresa_id)
    vacunas_label = {x.id: x.nombre for x in vars_catalog.vacunas}
    pruebas_label = {x.id: x.nombre for x in vars_catalog.pruebas_laboratorio}
    hospital_label = {x.id: x.nombre for x in vars_catalog.hospitalizacion}
    proc_label = {x.id: x.nombre for x in vars_catalog.procedimientos}

    consulta_extras_rows = (
        base_query_consultas_empresa(db, empresa_id)
        .filter(
            func.coalesce(Consulta.fecha_consulta, Consulta.created_at) >= start,
            func.coalesce(Consulta.fecha_consulta, Consulta.created_at) < end,
            Consulta.extras_clinicos_json.isnot(None),
        )
        .with_entities(Consulta.extras_clinicos_json)
        .all()
    )
    cnt_vacunas = Counter[str]()
    cnt_pruebas = Counter[str]()
    cnt_hospital = Counter[str]()
    for (raw_extras,) in consulta_extras_rows:
        ex = _parse_extras(raw_extras)
        for vid in ex.get("vacuna_ids") or []:
            if isinstance(vid, str) and vid.strip():
                cnt_vacunas[vid] += 1
        for pid in ex.get("pruebas_lab_ids") or []:
            if isinstance(pid, str) and pid.strip():
                cnt_pruebas[pid] += 1
        hid = ex.get("hospitalizacion_id")
        if isinstance(hid, str) and hid.strip():
            cnt_hospital[hid] += 1

    cita_extras_rows = (
        base_query_citas_empresa(db, empresa_id)
        .filter(
            Cita.fecha >= start,
            Cita.fecha < end,
            Cita.estado != "cancelada",
            Cita.extras_clinicos_json.isnot(None),
        )
        .with_entities(Cita.extras_clinicos_json)
        .all()
    )
    cnt_proc = Counter[str]()
    for (raw_extras,) in cita_extras_rows:
        ex = _parse_extras(raw_extras)
        pid = ex.get("procedimiento_id")
        if isinstance(pid, str) and pid.strip():
            cnt_proc[pid] += 1

    top_vacunas_consulta = _top_from_counter(cnt_vacunas, vacunas_label)
    top_pruebas_laboratorio_consulta = _top_from_counter(cnt_pruebas, pruebas_label)
    top_hospitalizacion_consulta = _top_from_counter(cnt_hospital, hospital_label)
    top_procedimientos_cita = _top_from_counter(cnt_proc, proc_label)

    notif_today = (
        db.query(
            func.sum(case((NotificationLog.canal == "email", 1), else_=0)).label("email"),
            func.sum(case((NotificationLog.canal == "sms", 1), else_=0)).label("sms"),
            func.sum(case((NotificationLog.canal == "whatsapp", 1), else_=0)).label("wa"),
            func.sum(case((NotificationLog.estado == "failed", 1), else_=0)).label("failed"),
        )
        .filter(
            NotificationLog.empresa_id == empresa_id,
            NotificationLog.created_at >= hoy_start,
            NotificationLog.created_at < end,
        )
        .first()
    )
    notificaciones_email_hoy = int(notif_today.email or 0)
    notificaciones_sms_hoy = int(notif_today.sms or 0)
    notificaciones_whatsapp_hoy = int(notif_today.wa or 0)
    notificaciones_fallidas_hoy = int(notif_today.failed or 0)

    # Top veterinarios por carga en el periodo.
    top_rows = (
        base_query_citas_empresa(db, empresa_id)
        .filter(
            Cita.fecha >= start,
            Cita.fecha < end,
            Cita.veterinario_id.isnot(None),
            Cita.estado != "cancelada",
        )
        .with_entities(
            Cita.veterinario_id,
            func.count(Cita.id).label("citas"),
            func.max(Usuario.nombre).label("nombre"),
        )
        .group_by(Cita.veterinario_id)
        .order_by(func.count(Cita.id).desc())
        .limit(5)
        .all()
    )
    top_veterinarios_hoy = [
        {
            "veterinario_id": int(r.veterinario_id),
            "nombre": r.nombre or f"Vet #{int(r.veterinario_id)}",
            "citas": int(r.citas or 0),
        }
        for r in top_rows
    ]

    # Top productos del periodo (por unidades e ingresos).
    top_productos_rows = (
        db.query(
            VentaItem.producto_id,
            func.max(Producto.nombre).label("nombre"),
            func.coalesce(func.sum(VentaItem.cantidad), 0).label("unidades"),
            func.coalesce(func.sum(VentaItem.cantidad * VentaItem.precio_unitario), 0).label("ingresos"),
        )
        .join(Venta, Venta.id == VentaItem.venta_id)
        .join(Producto, Producto.id == VentaItem.producto_id, isouter=True)
        .filter(
            Venta.empresa_id == empresa_id,
            Venta.fecha >= start,
            Venta.fecha < end,
        )
        .group_by(VentaItem.producto_id)
        .order_by(func.sum(VentaItem.cantidad).desc())
        .limit(5)
        .all()
    )
    top_productos_hoy = [
        {
            "producto_id": int(r.producto_id),
            "nombre": r.nombre or f"Producto #{int(r.producto_id)}",
            "unidades": int(r.unidades or 0),
            "ingresos": float(r.ingresos or 0),
        }
        for r in top_productos_rows
    ]

    # Serie últimos 7 días: atendidas por día.
    series: list[dict] = []
    series_ventas: list[dict] = []
    for i in range(6, -1, -1):
        d = hoy - timedelta(days=i)
        d_start, d_end = _day_window(d)
        attended = (
            base_query_citas_empresa(db, empresa_id)
            .filter(
                Cita.fecha >= d_start,
                Cita.fecha < d_end,
                Cita.estado == "atendida",
            )
            .with_entities(func.count(Cita.id))
            .scalar()
        )
        series.append({"fecha": d.strftime("%Y-%m-%d"), "atendidas": int(attended or 0)})

        ventas_row = (
            db.query(
                func.count(Venta.id).label("ventas"),
                func.coalesce(func.sum(Venta.total), 0).label("ingresos"),
            )
            .filter(
                Venta.empresa_id == empresa_id,
                Venta.fecha >= d_start,
                Venta.fecha < d_end,
            )
            .first()
        )
        series_ventas.append(
            {
                "fecha": d.strftime("%Y-%m-%d"),
                "ventas": int(ventas_row.ventas or 0),
                "ingresos": float(ventas_row.ingresos or 0),
            }
        )

    return {
        "total_hoy": total_hoy,
        "pendientes_hoy": pendientes_hoy,
        "confirmadas_hoy": confirmadas_hoy,
        "en_revision_hoy": en_revision_hoy,
        "atendidas_hoy": atendidas_hoy,
        "canceladas_hoy": canceladas_hoy,
        "urgentes_hoy": urgentes_hoy,
        "en_sala_espera_ahora": en_sala_espera_ahora,
        "espera_promedio_min_hoy": espera_promedio_min_hoy,
        "ventas_hoy": ventas_hoy,
        "ingresos_hoy": ingresos_hoy,
        "ticket_promedio_hoy": ticket_promedio_hoy,
        "ventas_ultimos_7_dias": series_ventas,
        "top_productos_hoy": top_productos_hoy,
        "notificaciones_email_hoy": notificaciones_email_hoy,
        "notificaciones_sms_hoy": notificaciones_sms_hoy,
        "notificaciones_whatsapp_hoy": notificaciones_whatsapp_hoy,
        "notificaciones_fallidas_hoy": notificaciones_fallidas_hoy,
        "consultas_totales_periodo": consultas_totales_periodo,
        "top_motivos_consulta": top_motivos_consulta,
        "top_tratamientos": top_tratamientos,
        "top_vacunas_consulta": top_vacunas_consulta,
        "top_pruebas_laboratorio_consulta": top_pruebas_laboratorio_consulta,
        "top_hospitalizacion_consulta": top_hospitalizacion_consulta,
        "top_procedimientos_cita": top_procedimientos_cita,
        "top_veterinarios_hoy": top_veterinarios_hoy,
        "atendidas_ultimos_7_dias": series,
    }


def list_dashboard_notificaciones_service(
    db: Session,
    empresa_id: int,
    dias: int = 1,
    page: int = 1,
    page_size: int = 100,
    canal: str | None = None,
    estado: str | None = None,
) -> tuple[list[dict], int]:
    now = datetime.now()
    start = now - timedelta(days=max(1, dias) - 1)
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)

    q = db.query(NotificationLog).filter(
        NotificationLog.empresa_id == empresa_id,
        NotificationLog.created_at >= start,
        NotificationLog.created_at <= now,
    )
    if canal:
        q = q.filter(NotificationLog.canal == canal.strip().lower())
    if estado:
        q = q.filter(NotificationLog.estado == estado.strip().lower())

    total = q.count()
    rows = (
        q.order_by(NotificationLog.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        {
            "id": int(r.id),
            "canal": r.canal,
            "tipo_evento": r.tipo_evento,
            "destino": r.destino,
            "estado": r.estado,
            "proveedor": r.proveedor,
            "error": r.error,
            "created_at": r.created_at.isoformat() if r.created_at else "",
        }
        for r in rows
    ]
    return items, total
