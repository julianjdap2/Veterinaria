"""
audit_events.py

Registro de auditoría vía eventos SQLAlchemy. Guarda old_values/new_values
(JSON) cuando está disponible para trazabilidad de cambios.
"""

import json
from sqlalchemy import event, insert, select
from sqlalchemy.inspection import inspect

from app.models.audit_log import AuditLog
from app.utils.audit_context import current_user_id, current_ip


EXCLUDED_TABLES = ["audit_logs"]


def get_primary_key(instance):
    mapper = inspect(instance).mapper
    primary_key = mapper.primary_key[0].name
    return getattr(instance, primary_key, None)


def _serialize_instance(instance) -> str | None:
    """Serializa el objeto a JSON (solo columnas, sin relaciones)."""
    try:
        mapper = inspect(instance).mapper
        d = {}
        for col in mapper.columns:
            val = getattr(instance, col.key, None)
            if hasattr(val, "isoformat"):
                val = val.isoformat()
            d[col.key] = val
        return json.dumps(d, default=str)
    except Exception:
        return None


def get_description(action, target):
    tabla = target.__tablename__
    if tabla == "usuarios":
        return f"Usuario: {getattr(target, 'email', '')}"
    if tabla == "mascotas":
        return f"Mascota: {getattr(target, 'nombre', '')}"
    if tabla == "clientes":
        return f"Cliente: {getattr(target, 'nombre', '')}"
    return f"{action} en tabla {tabla}"


def register_audit(mapper, connection, target, action, old_values_json: str | None = None):
    tabla = target.__tablename__
    if tabla in EXCLUDED_TABLES:
        return
    try:
        registro_id = get_primary_key(target)
        descripcion = get_description(action, target)
        usuario_id = current_user_id.get()
        ip = current_ip.get()

        # Fallback: si el ContextVar llega como None, inferimos un usuario
        # relacionado para que el log no quede vacío.
        if usuario_id is None:
            try:
                from app.models.consulta import Consulta
                from app.models.cita import Cita

                if tabla == "consultas" and getattr(target, "veterinario_id", None) is not None:
                    usuario_id = getattr(target, "veterinario_id", None)
                elif tabla == "citas" and getattr(target, "veterinario_id", None) is not None:
                    usuario_id = getattr(target, "veterinario_id", None)
                elif tabla == "formula_items":
                    consulta_id = getattr(target, "consulta_id", None)
                    cita_id = getattr(target, "cita_id", None)
                    if consulta_id is not None:
                        row = connection.execute(
                            select(Consulta.veterinario_id).where(Consulta.id == consulta_id)
                        ).first()
                        usuario_id = row[0] if row else None
                    elif cita_id is not None:
                        row = connection.execute(
                            select(Cita.veterinario_id).where(Cita.id == cita_id)
                        ).first()
                        usuario_id = row[0] if row else None
                elif tabla == "ventas" and getattr(target, "usuario_id", None) is not None:
                    usuario_id = getattr(target, "usuario_id", None)
            except Exception:
                pass

        new_values_json = _serialize_instance(target) if action in ("CREATE", "UPDATE") else None
        if action == "DELETE" and old_values_json is None:
            old_values_json = _serialize_instance(target)
        stmt = insert(AuditLog).values(
            usuario_id=usuario_id,
            accion=f"{action}_{tabla.upper()}",
            tabla_afectada=tabla,
            registro_id=registro_id,
            descripcion=descripcion,
            ip=ip,
            old_values=old_values_json,
            new_values=new_values_json,
        )
        connection.execute(stmt)
    except Exception as e:
        import logging
        logging.getLogger(__name__).exception("Error registrando auditoría: %s", e)


def after_insert(mapper, connection, target):
    register_audit(mapper, connection, target, "CREATE")


def after_update(mapper, connection, target):
    register_audit(mapper, connection, target, "UPDATE", old_values_json=None)


def after_delete(mapper, connection, target):
    register_audit(mapper, connection, target, "DELETE")


def register_model_events(Base):
    for mapper in Base.registry.mappers:
        model = mapper.class_
        event.listen(model, "after_insert", after_insert)
        event.listen(model, "after_update", after_update)
        event.listen(model, "after_delete", after_delete)