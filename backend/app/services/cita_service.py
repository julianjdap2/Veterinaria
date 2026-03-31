"""
cita_service.py

Lógica de negocio para el módulo de citas/agenda.
Todas las operaciones se acotan por empresa (vía mascota).
"""

from datetime import datetime, date, time, timedelta
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.errors import ApiError
from app.models.cliente import Cliente
from app.models.mascota import Mascota
from app.models.cita import Cita
from app.models.lista_espera import ListaEspera
from app.models.usuario import Usuario
from app.schemas.cita_schema import CitaResponse
from app.repositories.cita_repository import (
    base_query_citas_empresa,
    crear_cita,
    listar_citas_por_mascota,
    listar_citas_por_empresa_y_rango,
    count_citas_por_empresa_y_rango,
    obtener_cita_por_id_y_empresa,
    actualizar_cita,
)
from app.repositories.mascota_repository import obtener_mascota_por_empresa
from app.repositories.usuario_repository import listar_veterinarios_por_empresa
from app.services import plan_quotas
from app.security.usuario_operativo import (
    operativo_para_enforcement,
    validar_cita_operativa_creacion,
    assert_puede_ver_cita_agenda,
)


SLOT_MINUTES = 30
JORNADA_INICIO = time(8, 0)
JORNADA_FIN = time(18, 30)


def _slots_jornada() -> list[str]:
    """Genera lista de slots (HH:MM) dentro de la jornada configurada."""
    start_minutes = JORNADA_INICIO.hour * 60 + JORNADA_INICIO.minute
    end_minutes = JORNADA_FIN.hour * 60 + JORNADA_FIN.minute
    slots: list[str] = []
    for minutes in range(start_minutes, end_minutes + 1, SLOT_MINUTES):
        hh = minutes // 60
        mm = minutes % 60
        slots.append(f"{hh:02d}:{mm:02d}")
    return slots


def _verificar_mascota_empresa(db: Session, mascota_id: int, empresa_id: int) -> Mascota:
    """Comprueba que la mascota exista y sea accesible por vínculo con la empresa."""
    mascota = obtener_mascota_por_empresa(db, mascota_id, empresa_id, incluir_inactivas=False)
    if not mascota:
        raise ApiError(
            code="mascota_not_found",
            message="Mascota no encontrada para la empresa actual",
            status_code=404,
        )
    return mascota


def crear_cita_service(db: Session, datos: dict, empresa_id: int, actor: Usuario | None = None):
    """Crea una cita para una mascota de la empresa."""
    datos = {**datos, "empresa_id": empresa_id}
    solo_reservar_espacio = bool(datos.pop("solo_reservar_espacio", False))
    mascota_id = datos.get("mascota_id")
    if mascota_id is None:
        if not solo_reservar_espacio:
            raise ApiError(
                code="mascota_required",
                message="Selecciona una mascota o activa 'Solo reservar el espacio'.",
                status_code=400,
            )
        datos["estado"] = "confirmada"
        datos["en_sala_espera"] = False
    else:
        _verificar_mascota_empresa(db, int(mascota_id), empresa_id)
    validar_cita_operativa_creacion(db, datos, empresa_id, actor)

    fecha_cuota = datos.get("fecha")
    if fecha_cuota is not None and isinstance(fecha_cuota, datetime):
        plan_quotas.verificar_limite_citas_mes(db, empresa_id, fecha_cuota)
    fecha_fin = datos.get("fecha_fin")
    if fecha_cuota is not None and fecha_fin is not None and isinstance(fecha_fin, datetime) and isinstance(fecha_cuota, datetime):
        if fecha_fin < fecha_cuota:
            raise ApiError(
                code="cita_fecha_fin_invalid",
                message="La fecha/hora de finalización no puede ser menor al inicio.",
                status_code=400,
            )

    # Validación de disponibilidad (bloqueo por slots) si viene veterinario + fecha.
    # Esto evita que recepción elija horas arbitrarias.
    fecha_dt = datos.get("fecha")
    veterinario_id = datos.get("veterinario_id")
    sin_hora_definida = bool(datos.get("sin_hora_definida", False))
    if (not sin_hora_definida) and fecha_dt is not None and veterinario_id is not None:
        if not isinstance(fecha_dt, datetime):
            # Pydantic debería convertir a datetime; si no, rechazamos para evitar inconsistencias.
            raise ApiError(
                code="cita_fecha_invalid",
                message="Formato de fecha inválido",
                status_code=400,
            )

        # Solo permitimos slots de 30 minutos: minute=00 o minute=30
        if fecha_dt.minute % SLOT_MINUTES != 0 or fecha_dt.second not in (0, None):
            raise ApiError(
                code="cita_slot_invalid",
                message="Solo se permiten horarios en intervalos de 30 minutos",
                status_code=400,
            )

        # Ajustamos al inicio del slot para la comparación.
        total_minutes = fecha_dt.hour * 60 + fecha_dt.minute
        slot_start_minutes = (total_minutes // SLOT_MINUTES) * SLOT_MINUTES
        slot_start = datetime.combine(fecha_dt.date(), time(slot_start_minutes // 60, slot_start_minutes % 60))
        slot_end = slot_start + timedelta(minutes=SLOT_MINUTES)

        # Existe otra cita en el mismo slot (se considera ocupada si no está cancelada).
        existe = (
            base_query_citas_empresa(db, empresa_id)
            .filter(
                Cita.veterinario_id == veterinario_id,
                Cita.fecha >= slot_start,
                Cita.fecha < slot_end,
                or_(Cita.estado.is_(None), Cita.estado != "cancelada"),
            )
            .first()
        )

        if existe:
            raise ApiError(
                code="cita_slot_occupied",
                message="Ese horario ya está reservado",
                status_code=409,
            )

    return crear_cita(db, datos)


def crear_lista_espera_service(db: Session, datos: dict, empresa_id: int) -> ListaEspera:
    """Crea un registro en lista de espera para un slot ocupado."""
    mascota_id = datos.get("mascota_id")
    veterinario_id = datos.get("veterinario_id")
    fecha_dt = datos.get("fecha")

    if mascota_id is None:
        raise ApiError(code="cita_lista_espera_invalid", message="mascota_id es requerido", status_code=400)
    _verificar_mascota_empresa(db, mascota_id, empresa_id)

    if veterinario_id is None:
        raise ApiError(
            code="cita_lista_espera_invalid",
            message="veterinario_id es requerido",
            status_code=400,
        )
    if not fecha_dt or not isinstance(fecha_dt, datetime):
        raise ApiError(
            code="cita_fecha_invalid",
            message="Formato de fecha inválido",
            status_code=400,
        )

    # Validación de slot (30 minutos).
    if fecha_dt.minute % SLOT_MINUTES != 0 or fecha_dt.second not in (0, None):
        raise ApiError(
            code="cita_slot_invalid",
            message="Solo se permiten horarios en intervalos de 30 minutos",
            status_code=400,
        )

    entry = ListaEspera(
        empresa_id=empresa_id,
        mascota_id=mascota_id,
        veterinario_id=veterinario_id,
        fecha=fecha_dt,
        motivo=datos.get("motivo"),
        notas=datos.get("notas"),
        urgente=bool(datos.get("urgente", False)),
        estado="pendiente",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def _round_up_to_slot(dt: datetime) -> datetime:
    """Redondea una fecha al siguiente bloque de 30 min."""
    base = dt.replace(second=0, microsecond=0)
    rem = base.minute % SLOT_MINUTES
    if rem == 0:
        return base
    return base + timedelta(minutes=(SLOT_MINUTES - rem))


def _primer_slot_disponible_vet(
    db: Session,
    empresa_id: int,
    veterinario_id: int,
    desde: datetime,
    dias_horizonte: int = 7,
) -> datetime | None:
    """Busca el primer slot libre para un veterinario desde una fecha/hora."""
    inicio_busqueda = _round_up_to_slot(desde)
    for i in range(dias_horizonte + 1):
        day = (inicio_busqueda + timedelta(days=i)).date()
        day_start = datetime.combine(day, JORNADA_INICIO)
        day_end = datetime.combine(day, JORNADA_FIN)
        primer = max(inicio_busqueda, day_start)
        if primer > day_end:
            continue
        cursor = _round_up_to_slot(primer)
        while cursor <= day_end:
            slot_end = cursor + timedelta(minutes=SLOT_MINUTES)
            existe = (
                base_query_citas_empresa(db, empresa_id)
                .filter(
                    Cita.veterinario_id == veterinario_id,
                    Cita.fecha >= cursor,
                    Cita.fecha < slot_end,
                    or_(Cita.estado.is_(None), Cita.estado != "cancelada"),
                )
                .first()
            )
            if not existe:
                return cursor
            cursor += timedelta(minutes=SLOT_MINUTES)
    return None


def _queue_size_vet(db: Session, empresa_id: int, veterinario_id: int, now_dt: datetime) -> int:
    return (
        db.query(ListaEspera)
        .filter(
            ListaEspera.empresa_id == empresa_id,
            ListaEspera.veterinario_id == veterinario_id,
            ListaEspera.procesada.is_(False),
            ListaEspera.fecha >= now_dt,
        )
        .count()
    )


def _active_load_vet(db: Session, empresa_id: int, veterinario_id: int, day: date) -> int:
    start = datetime.combine(day, time.min)
    end = start + timedelta(days=1)
    return (
        base_query_citas_empresa(db, empresa_id)
        .filter(
            Cita.veterinario_id == veterinario_id,
            Cita.fecha >= start,
            Cita.fecha < end,
            or_(Cita.estado.is_(None), Cita.estado != "cancelada"),
        )
        .count()
    )


def _veterinario_disponible_para_agenda(db: Session, u: Usuario) -> bool:
    if u.rol_id != 2:
        return True
    return operativo_para_enforcement(u).agenda_personal


def crear_cita_llegada_automatica_service(
    db: Session, datos: dict, empresa_id: int, actor: Usuario | None = None
) -> Cita:
    """Crea una cita por orden de llegada asignando el mejor veterinario/slot disponible."""
    mascota_id = datos.get("mascota_id")
    if mascota_id is None:
        raise ApiError(code="cita_llegada_invalid", message="mascota_id es requerido", status_code=400)
    _verificar_mascota_empresa(db, mascota_id, empresa_id)

    now_dt = datos.get("fecha_llegada")
    if now_dt is None:
        now_dt = datetime.now()
    if not isinstance(now_dt, datetime):
        raise ApiError(code="cita_fecha_invalid", message="fecha_llegada inválida", status_code=400)

    veterinarios = [
        v
        for v in listar_veterinarios_por_empresa(db, empresa_id)
        if _veterinario_disponible_para_agenda(db, v)
    ]
    if not veterinarios:
        raise ApiError(
            code="vet_not_found",
            message="No hay veterinarios activos habilitados en agenda para asignar la cita",
            status_code=400,
        )

    preferido = datos.get("veterinario_preferido_id")
    candidatos = [v for v in veterinarios if (preferido is None or v.id == preferido)]
    if preferido is not None and not candidatos:
        # fallback: si el preferido no aplica, usamos todos.
        candidatos = veterinarios
    if not candidatos:
        candidatos = veterinarios

    opciones: list[tuple[datetime, int, int, int]] = []
    for v in candidatos:
        slot = _primer_slot_disponible_vet(db, empresa_id=empresa_id, veterinario_id=v.id, desde=now_dt)
        if not slot:
            continue
        qsize = _queue_size_vet(db, empresa_id=empresa_id, veterinario_id=v.id, now_dt=now_dt)
        carga = _active_load_vet(db, empresa_id=empresa_id, veterinario_id=v.id, day=slot.date())
        opciones.append((slot, qsize, carga, v.id))

    if not opciones:
        raise ApiError(
            code="cita_no_slot_found",
            message="No se encontró disponibilidad cercana para asignar la cita",
            status_code=409,
        )

    slot, _, _, vet_id = sorted(opciones, key=lambda x: (x[0], x[1], x[2], x[3]))[0]
    return crear_cita_service(
        db=db,
        empresa_id=empresa_id,
        actor=actor,
        datos={
            "mascota_id": mascota_id,
            "fecha": slot,
            "veterinario_id": vet_id,
            "motivo": datos.get("motivo"),
            "notas": datos.get("notas"),
            "urgente": bool(datos.get("urgente", False)),
            "en_sala_espera": True,
            "estado": "confirmada",
            "extras_clinicos_json": datos.get("extras_clinicos_json"),
        },
    )


def listar_lista_espera_service(
    db: Session,
    empresa_id: int,
    fecha: date,
    veterinario_id: int | None = None,
    procesadas: bool = False,
    solo_urgentes: bool = False,
) -> list[ListaEspera]:
    """Lista entradas de lista de espera en un día, por veterinario."""
    day_start = datetime.combine(fecha, time.min)
    day_end = day_start + timedelta(days=1)
    q = (
        db.query(ListaEspera)
        .filter(
            ListaEspera.empresa_id == empresa_id,
            ListaEspera.fecha >= day_start,
            ListaEspera.fecha < day_end,
            ListaEspera.procesada.is_(procesadas),
        )
        .order_by(ListaEspera.urgente.desc(), ListaEspera.created_at.asc())
    )
    if veterinario_id is not None:
        q = q.filter(ListaEspera.veterinario_id == veterinario_id)
    if solo_urgentes:
        q = q.filter(ListaEspera.urgente.is_(True))
    return q.all()


def _obtener_lista_espera_por_id_empresa(db: Session, entry_id: int, empresa_id: int) -> ListaEspera | None:
    return (
        db.query(ListaEspera)
        .filter(
            ListaEspera.id == entry_id,
            ListaEspera.empresa_id == empresa_id,
        )
        .first()
    )


def promover_lista_espera_service(db: Session, empresa_id: int, entry_id: int) -> ListaEspera:
    """Intenta promover una entrada de lista de espera creando una cita."""
    entry = _obtener_lista_espera_por_id_empresa(db, entry_id=entry_id, empresa_id=empresa_id)
    if not entry:
        raise ApiError(code="waitlist_not_found", message="Entrada de lista de espera no encontrada", status_code=404)
    if entry.procesada:
        raise ApiError(code="waitlist_already_processed", message="La entrada ya fue procesada", status_code=400)

    cita = crear_cita_service(
        db=db,
        empresa_id=empresa_id,
        datos={
            "mascota_id": entry.mascota_id,
            "fecha": entry.fecha,
            "veterinario_id": entry.veterinario_id,
            "motivo": entry.motivo,
            "notas": entry.notas,
            "urgente": entry.urgente,
            "estado": "pendiente",
        },
    )
    entry.procesada = True
    entry.estado = "atendido"
    entry.procesada_en = datetime.now()
    entry.cita_id = cita.id
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def descartar_lista_espera_service(db: Session, empresa_id: int, entry_id: int) -> ListaEspera:
    """Marca una entrada de lista de espera como procesada sin crear cita."""
    entry = _obtener_lista_espera_por_id_empresa(db, entry_id=entry_id, empresa_id=empresa_id)
    if not entry:
        raise ApiError(code="waitlist_not_found", message="Entrada de lista de espera no encontrada", status_code=404)
    if entry.procesada:
        return entry

    entry.procesada = True
    entry.estado = "cancelado"
    entry.procesada_en = datetime.now()
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def llamar_lista_espera_service(db: Session, empresa_id: int, entry_id: int) -> ListaEspera:
    """Marca una entrada como llamada para atención."""
    entry = _obtener_lista_espera_por_id_empresa(db, entry_id=entry_id, empresa_id=empresa_id)
    if not entry:
        raise ApiError(code="waitlist_not_found", message="Entrada de lista de espera no encontrada", status_code=404)
    if entry.procesada:
        raise ApiError(code="waitlist_already_processed", message="La entrada ya fue procesada", status_code=400)

    entry.estado = "llamado"
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def promover_siguiente_lista_espera_service(
    db: Session,
    empresa_id: int,
    fecha: date,
    veterinario_id: int,
) -> ListaEspera:
    """Promueve el siguiente de la cola: urgentes primero, luego orden de llegada."""
    day_start = datetime.combine(fecha, time.min)
    day_end = day_start + timedelta(days=1)
    entry = (
        db.query(ListaEspera)
        .filter(
            ListaEspera.empresa_id == empresa_id,
            ListaEspera.veterinario_id == veterinario_id,
            ListaEspera.fecha >= day_start,
            ListaEspera.fecha < day_end,
            ListaEspera.procesada.is_(False),
        )
        .order_by(ListaEspera.urgente.desc(), ListaEspera.created_at.asc())
        .first()
    )
    if not entry:
        raise ApiError(code="waitlist_empty", message="No hay entradas pendientes en lista de espera", status_code=404)
    return promover_lista_espera_service(db=db, empresa_id=empresa_id, entry_id=entry.id)


def _procesar_lista_espera_para_slot(db: Session, empresa_id: int, veterinario_id: int, fecha_slot: datetime) -> None:
    """Si existe lista de espera para el slot, intenta crear una cita pendiente."""
    entry = (
        db.query(ListaEspera)
        .filter(
            ListaEspera.empresa_id == empresa_id,
            ListaEspera.veterinario_id == veterinario_id,
            ListaEspera.fecha == fecha_slot,
            ListaEspera.procesada.is_(False),
        )
        .order_by(ListaEspera.urgente.desc(), ListaEspera.created_at.asc())
        .first()
    )
    if not entry:
        return

    try:
        cita = crear_cita_service(
            db=db,
            empresa_id=empresa_id,
            datos={
                "mascota_id": entry.mascota_id,
                "fecha": entry.fecha,
                "veterinario_id": entry.veterinario_id,
                "motivo": entry.motivo,
                "notas": entry.notas,
                "urgente": entry.urgente,
                "estado": "pendiente",
            },
        )
    except ApiError:
        # El slot volvió a estar ocupado (condición de carrera); no procesamos.
        return

    entry.procesada = True
    entry.estado = "atendido"
    entry.procesada_en = datetime.now()
    entry.cita_id = cita.id
    db.add(entry)
    db.commit()


def listar_citas_disponibilidad_service(
    db: Session,
    empresa_id: int,
    fecha: date,
    veterinario_id: int,
) -> tuple[list[str], list[str]]:
    """
    Devuelve (disponible, reservado) para una jornada y veterinario.
    Se basa en slots de 30 minutos entre JORNADA_INICIO y JORNADA_FIN.
    """
    slots = _slots_jornada()

    day_start = datetime.combine(fecha, time.min)
    day_end = day_start + timedelta(days=1)

    citas = (
        base_query_citas_empresa(db, empresa_id)
        .filter(
            Cita.veterinario_id == veterinario_id,
            Cita.fecha >= day_start,
            Cita.fecha < day_end,
            or_(Cita.estado.is_(None), Cita.estado != "cancelada"),
        )
        .all()
    )

    reserved = set()
    for c in citas:
        if not c.fecha:
            continue
        total_minutes = c.fecha.hour * 60 + c.fecha.minute
        slot_start_minutes = (total_minutes // SLOT_MINUTES) * SLOT_MINUTES
        if JORNADA_INICIO.hour * 60 + JORNADA_INICIO.minute <= slot_start_minutes <= JORNADA_FIN.hour * 60 + JORNADA_FIN.minute:
            hh = slot_start_minutes // 60
            mm = slot_start_minutes % 60
            reserved.add(f"{hh:02d}:{mm:02d}")

    disponible = [s for s in slots if s not in reserved]
    reservado = [s for s in slots if s in reserved]
    return disponible, reservado


def listar_citas_mascota_service(db: Session, mascota_id: int, empresa_id: int):
    """Lista el historial de citas de una mascota."""
    _verificar_mascota_empresa(db, mascota_id, empresa_id)
    return listar_citas_por_mascota(db, mascota_id, empresa_id)


def citas_a_respuestas(db: Session, citas: list) -> list[CitaResponse]:
    """Enriquece citas con veterinario, mascota y propietario (batch)."""
    if not citas:
        return []
    ids = {c.veterinario_id for c in citas if getattr(c, "veterinario_id", None)}
    nombres: dict[int, str] = {}
    if ids:
        for u in db.query(Usuario).filter(Usuario.id.in_(ids)).all():
            nombres[u.id] = u.nombre
    mids = {c.mascota_id for c in citas if getattr(c, "mascota_id", None)}
    mnames: dict[int, str] = {}
    cnames: dict[int, str] = {}
    if mids:
        for mid, mnombre, cnombre in (
            db.query(Mascota.id, Mascota.nombre, Cliente.nombre)
            .join(Cliente, Mascota.cliente_id == Cliente.id)
            .filter(Mascota.id.in_(mids))
            .all()
        ):
            mnames[int(mid)] = mnombre or ""
            cnames[int(mid)] = cnombre or ""
    out: list[CitaResponse] = []
    for c in citas:
        r = CitaResponse.model_validate(c)
        vid = c.veterinario_id
        mid = c.mascota_id
        out.append(
            r.model_copy(
                update={
                    "veterinario_nombre": nombres.get(vid) if vid else None,
                    "mascota_nombre": mnames.get(mid) if mid else None,
                    "cliente_nombre": cnames.get(mid) if mid else None,
                }
            )
        )
    return out


def cita_a_respuesta(db: Session, cita) -> CitaResponse:
    """Una cita con veterinario_nombre resuelto."""
    return citas_a_respuestas(db, [cita])[0]


def _cita_no_editable_por_historial(cita: Cita) -> bool:
    """Citas pasadas o cerradas no admiten PATCH (solo lectura)."""
    st = (cita.estado or "").strip()
    if st in ("atendida", "cancelada"):
        return True
    if cita.fecha and cita.fecha < datetime.now():
        return True
    return False


def listar_citas_agenda_service(
    db: Session,
    empresa_id: int,
    fecha_desde: Optional[datetime] = None,
    fecha_hasta: Optional[datetime] = None,
    page: int = 1,
    page_size: int = 20,
    estado: Optional[str] = None,
    veterinario_id: Optional[int] = None,
    en_sala_espera: Optional[bool] = None,
    current_user: Usuario | None = None,
) -> tuple[list, int]:
    """Lista citas de la empresa (agenda); devuelve (items, total)."""
    eff_veterinario_id = veterinario_id
    if current_user is not None and current_user.rol_id == 2:
        op = operativo_para_enforcement(current_user)
        if not op.admin_agenda:
            eff_veterinario_id = current_user.id

    total = count_citas_por_empresa_y_rango(
        db,
        empresa_id,
        fecha_desde,
        fecha_hasta,
        estado=estado,
        veterinario_id=eff_veterinario_id,
        en_sala_espera=en_sala_espera,
    )
    items = listar_citas_por_empresa_y_rango(
        db,
        empresa_id,
        fecha_desde,
        fecha_hasta,
        page,
        page_size,
        estado=estado,
        veterinario_id=eff_veterinario_id,
        en_sala_espera=en_sala_espera,
    )
    return items, total


def obtener_cita_service(db: Session, cita_id: int, empresa_id: int):
    """Obtiene una cita por id si pertenece a la empresa."""
    cita = obtener_cita_por_id_y_empresa(db, cita_id, empresa_id)
    if not cita:
        raise ApiError(
            code="cita_not_found",
            message="Cita no encontrada",
            status_code=404,
        )
    return cita


def actualizar_cita_service(db: Session, cita_id: int, empresa_id: int, datos: dict, current_user):
    """Actualiza una cita (estado, fecha, motivo) con validación de transiciones."""
    cita = obtener_cita_por_id_y_empresa(db, cita_id, empresa_id)
    if not cita:
        raise ApiError(
            code="cita_not_found",
            message="Cita no encontrada",
            status_code=404,
        )

    assert_puede_ver_cita_agenda(cita.veterinario_id, current_user)

    if datos:
        preview = {
            "motivo": datos["motivo"] if "motivo" in datos else cita.motivo,
            "veterinario_id": datos["veterinario_id"] if "veterinario_id" in datos else cita.veterinario_id,
        }
        validar_cita_operativa_creacion(db, preview, empresa_id, current_user)

    if _cita_no_editable_por_historial(cita) and datos:
        raise ApiError(
            code="cita_readonly",
            message="No se puede editar una cita pasada o finalizada/cancelada.",
            status_code=403,
        )

    nuevo_estado = datos.get("estado")
    # Guardamos fecha/vet antes del update para procesar lista de espera
    # si el update libera un slot (cancelación, o cambio de fecha/veterinario).
    fecha_slot_anterior = cita.fecha
    veterinario_slot_anterior = cita.veterinario_id

    # Caso específico: cancelación.
    fecha_slot_cancelada = None
    veterinario_slot_cancelado = None
    will_cancel = False
    if nuevo_estado is not None:
        will_cancel = (nuevo_estado or "").strip() == "cancelada"
        if will_cancel:
            fecha_slot_cancelada = fecha_slot_anterior
            veterinario_slot_cancelado = veterinario_slot_anterior
    if nuevo_estado:
        nuevo_estado = (nuevo_estado or "").strip()
        estado_actual = (cita.estado or "").strip()
        rol_id = getattr(current_user, "rol_id", None)

        # Transiciones permitidas:
        # pendiente -> confirmada     (ADMIN/RECEPCION)
        # confirmada -> revision      (VETERINARIO/ADMIN)
        # revision  -> atendida       (VETERINARIO/ADMIN)
        # *          -> cancelada      (ADMIN/RECEPCION, si no está atendida)
        if nuevo_estado == estado_actual:
            # idempotente
            pass
        elif nuevo_estado == "confirmada":
            if rol_id not in (1, 3):
                raise ApiError(code="cita_forbidden", message="Solo recepción/admin puede confirmar", status_code=403)
            if estado_actual != "pendiente":
                raise ApiError(code="cita_estado_invalid", message="La cita debe estar en pendiente para confirmar", status_code=400)
        elif nuevo_estado == "revision":
            if rol_id not in (1, 2):
                raise ApiError(code="cita_forbidden", message="Solo veterinario/admin puede pasar a revisión", status_code=403)
            if estado_actual != "confirmada":
                raise ApiError(code="cita_estado_invalid", message="La cita debe estar en confirmada para pasar a revisión", status_code=400)
        elif nuevo_estado == "atendida":
            if rol_id not in (1, 2):
                raise ApiError(code="cita_forbidden", message="Solo veterinario/admin puede marcar como atendida", status_code=403)
            if estado_actual != "revision":
                raise ApiError(code="cita_estado_invalid", message="La cita debe estar en revisión para pasar a atendida", status_code=400)
        elif nuevo_estado == "cancelada":
            if rol_id not in (1, 3):
                raise ApiError(code="cita_forbidden", message="Solo recepción/admin puede cancelar", status_code=403)
            if estado_actual == "atendida":
                raise ApiError(code="cita_estado_invalid", message="No se puede cancelar una cita atendida", status_code=400)
        else:
            raise ApiError(code="cita_estado_invalid", message="Estado de cita no permitido", status_code=400)

    # Al pasar a revisión/atendida/cancelada dejamos de marcar "en sala de espera".
    if nuevo_estado in ("revision", "atendida", "cancelada"):
        datos["en_sala_espera"] = False

    # Reprogramación: si solo se envía `fecha`, conservar la duración del evento (evita fecha_fin < nuevo inicio).
    if (
        "fecha" in datos
        and "fecha_fin" not in datos
        and datos.get("fecha") is not None
        and isinstance(datos["fecha"], datetime)
    ):
        nueva_ini = datos["fecha"]
        ini_ant = cita.fecha
        fin_ant = cita.fecha_fin
        if ini_ant is not None and fin_ant is not None:
            delta = fin_ant - ini_ant
            if delta.total_seconds() > 0:
                datos["fecha_fin"] = nueva_ini + delta
            else:
                datos["fecha_fin"] = nueva_ini + timedelta(minutes=SLOT_MINUTES)
        else:
            datos["fecha_fin"] = nueva_ini + timedelta(minutes=SLOT_MINUTES)

    # Validación de bloqueo por slots si se reprograma por fecha (misma lógica que crear_cita_service).
    # Esto evita que la UI (drag/drop) mueva citas a horarios ya ocupados.
    fecha_dt = datos.get("fecha")
    sin_hora_definida = bool(datos.get("sin_hora_definida", cita.sin_hora_definida))
    fecha_fin_nueva = datos.get("fecha_fin", cita.fecha_fin)
    fecha_inicio_nueva = datos.get("fecha", cita.fecha)
    if (
        fecha_inicio_nueva is not None
        and fecha_fin_nueva is not None
        and isinstance(fecha_inicio_nueva, datetime)
        and isinstance(fecha_fin_nueva, datetime)
        and fecha_fin_nueva < fecha_inicio_nueva
    ):
        raise ApiError(
            code="cita_fecha_fin_invalid",
            message="La fecha/hora de finalización no puede ser menor al inicio.",
            status_code=400,
        )
    if (not sin_hora_definida) and fecha_dt is not None:
        if not isinstance(fecha_dt, datetime):
            raise ApiError(
                code="cita_fecha_invalid",
                message="Formato de fecha inválido",
                status_code=400,
            )

        anterior = cita.fecha
        if anterior is None or anterior.year != fecha_dt.year or anterior.month != fecha_dt.month:
            plan_quotas.verificar_limite_citas_mes(
                db, empresa_id, fecha_dt, exclude_cita_id=cita.id
            )

        efectivo_veterinario_id = datos.get("veterinario_id") or cita.veterinario_id
        if efectivo_veterinario_id is not None:
            if fecha_dt.minute % SLOT_MINUTES != 0 or fecha_dt.second not in (0, None):
                raise ApiError(
                    code="cita_slot_invalid",
                    message="Solo se permiten horarios en intervalos de 30 minutos",
                    status_code=400,
                )

            total_minutes = fecha_dt.hour * 60 + fecha_dt.minute
            slot_start_minutes = (total_minutes // SLOT_MINUTES) * SLOT_MINUTES
            slot_start = datetime.combine(
                fecha_dt.date(),
                time(slot_start_minutes // 60, slot_start_minutes % 60),
            )
            slot_end = slot_start + timedelta(minutes=SLOT_MINUTES)

            # Existe otra cita en el mismo slot para ese veterinario (no cancelada).
            existe = (
                base_query_citas_empresa(db, empresa_id)
                .filter(
                    Cita.veterinario_id == efectivo_veterinario_id,
                    Cita.id != cita_id,
                    Cita.fecha >= slot_start,
                    Cita.fecha < slot_end,
                    or_(Cita.estado.is_(None), Cita.estado != "cancelada"),
                )
                .first()
            )
            if existe:
                raise ApiError(
                    code="cita_slot_occupied",
                    message="Ese horario ya está reservado",
                    status_code=409,
                )

    updated = actualizar_cita(db, cita, datos)

    # Procesar lista de espera si esta cita se canceló y existía un pendiente para ese slot.
    if will_cancel:
        if fecha_slot_cancelada and veterinario_slot_cancelado is not None:
            _procesar_lista_espera_para_slot(
                db=db,
                empresa_id=empresa_id,
                veterinario_id=veterinario_slot_cancelado,
                fecha_slot=fecha_slot_cancelada,
            )

    # Procesar lista de espera si el update liberó un slot anterior.
    # (Ej: reprogramación cambiando fecha o reasignación cambiando veterinario.)
    if (not will_cancel) and (fecha_slot_anterior is not None) and (veterinario_slot_anterior is not None):
        fecha_nueva = datos.get("fecha", fecha_slot_anterior)
        veterinario_nuevo = datos.get("veterinario_id", veterinario_slot_anterior)
        liberado_por_fecha = ("fecha" in datos) and (fecha_nueva != fecha_slot_anterior)
        liberado_por_vet = ("veterinario_id" in datos) and (veterinario_nuevo != veterinario_slot_anterior)
        if liberado_por_fecha or liberado_por_vet:
            _procesar_lista_espera_para_slot(
                db=db,
                empresa_id=empresa_id,
                veterinario_id=veterinario_slot_anterior,
                fecha_slot=fecha_slot_anterior,
            )

    return updated
