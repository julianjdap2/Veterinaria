"""
Privilegios operativos por usuario (JSON extendido).
El rol administrador (1) no queda restringido por estos flags.
"""

from __future__ import annotations

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models.usuario import Usuario
from app.security.dependencies import get_current_user
from app.services.usuario_extendido import UsuarioOperativo, parse_extendido_json

# Palabras clave por slug (valor en servicios_relacionados) para validar cita.motivo (texto libre).
MOTIVO_KEYWORDS_POR_SLUG: dict[str, tuple[str, ...]] = {
    "consulta_general": ("consulta general", "general", "consulta"),
    "consulta_especializada": ("consulta especializada", "especializada", "especialista"),
    "cirugia": ("cirug",),
    "cirugia_laser": ("láser", "laser"),
    "cirugia_tejidos_blandos": ("tejidos blandos", "blandos"),
    "consulta_domicilio": ("domicilio", "casa", "a domicilio"),
    "consulta_no_programada": ("no programada", "sin cita", "espontánea"),
    "consulta_preanestesica": ("preanest",),
    "consulta_prequirurgica": ("prequirúrg", "prequirurg"),
    "urgencias": ("urgencia", "crític", "critico", "uci", "emergencia"),
    "dermatologia": ("dermat", "piel"),
    "cardiologia": ("cardio", "corazón", "corazon"),
    "odontologia": ("odont", "dental"),
    "imagenologia": ("imagen", "rx", "radiograf", "ecograf", "ultrason"),
    "fisioterapia": ("fisio", "rehabilit"),
    "peluqueria_spa": ("peluquer", "spa", "baño", "bano", "estética", "estetica"),
    "vacunacion": ("vacun", "vacuna"),
    "desparasitacion": ("desparasit", "antiparasit"),
}


def operativo_para_enforcement(user: Usuario) -> UsuarioOperativo:
    """Administrador: acceso pleno (defaults). Resto: según extendido_json."""
    if user.rol_id in (1, 4):
        return UsuarioOperativo()
    return parse_extendido_json(user.extendido_json).operativo


def motivo_permitido_para_servicios(motivo: str | None, servicios_restringidos: list[str]) -> bool:
    """Lista vacía = sin restricción. Si hay lista, el motivo debe coincidir con algún slug."""
    if not servicios_restringidos:
        return True
    if motivo is None or not str(motivo).strip():
        return True
    m = str(motivo).strip().lower()
    for slug in servicios_restringidos:
        hints = MOTIVO_KEYWORDS_POR_SLUG.get(slug, (slug.replace("_", " "),))
        for h in hints:
            if h.lower() in m or m in h.lower():
                return True
    return False


def assert_acceso_consultorio(user: Usuario) -> None:
    if user.rol_id in (1, 4):
        return
    if not operativo_para_enforcement(user).acceso_consultorio:
        raise ApiError(
            code="sin_acceso_consultorio",
            message="Tu usuario no tiene habilitado el acceso al consultorio.",
            status_code=403,
        )


def assert_info_tutores_completa(user: Usuario) -> None:
    if user.rol_id in (1, 4):
        return
    if not operativo_para_enforcement(user).info_tutores_completa:
        raise ApiError(
            code="sin_acceso_datos_tutores",
            message="Tu usuario no tiene acceso completo a la información de tutores.",
            status_code=403,
        )


def assert_veterinario_agenda_personal(db: Session, veterinario_id: int, empresa_id: int) -> None:
    """El profesional asignado debe tener «agenda personal» activo (rol veterinario)."""
    v = (
        db.query(Usuario)
        .filter(Usuario.id == veterinario_id, Usuario.empresa_id == empresa_id, Usuario.activo.is_(True))
        .first()
    )
    if not v:
        raise ApiError(code="veterinario_not_found", message="Veterinario no encontrado", status_code=404)
    if v.rol_id != 2:
        return
    if not operativo_para_enforcement(v).agenda_personal:
        raise ApiError(
            code="veterinario_sin_agenda_personal",
            message="El profesional seleccionado no está habilitado en la agenda para recibir citas.",
            status_code=403,
        )


def validar_cita_operativa_creacion(
    db: Session,
    datos: dict,
    empresa_id: int,
    actor: Usuario | None,
) -> None:
    """Valida motivo vs servicios del actor y veterinario asignado (agenda personal)."""
    vid = datos.get("veterinario_id")
    if vid is not None:
        assert_veterinario_agenda_personal(db, int(vid), empresa_id)

    if actor is None or actor.rol_id in (1, 4):
        return
    op = operativo_para_enforcement(actor)
    if not motivo_permitido_para_servicios(datos.get("motivo"), list(op.servicios_relacionados or [])):
        raise ApiError(
            code="motivo_no_permitido",
            message="El tipo de servicio/motivo de la cita no está permitido para tu usuario.",
            status_code=403,
        )


def assert_puede_ver_cita_agenda(cita_veterinario_id: int | None, viewer: Usuario) -> None:
    """Veterinario sin «administrador de agenda» solo ve/gestiona citas donde es el responsable."""
    if viewer.rol_id != 2:
        return
    op = operativo_para_enforcement(viewer)
    if op.admin_agenda:
        return
    if cita_veterinario_id != viewer.id:
        raise ApiError(
            code="cita_fuera_de_agenda_personal",
            message="Solo puedes acceder a tus propias citas en la agenda.",
            status_code=403,
        )


def assert_disponibilidad_agenda(veterinario_id: int, viewer: Usuario) -> None:
    if viewer.rol_id in (1, 3, 4):
        return
    op = operativo_para_enforcement(viewer)
    if op.admin_disponibilidad:
        return
    if veterinario_id != viewer.id:
        raise ApiError(
            code="sin_acceso_disponibilidad",
            message="Solo puedes consultar disponibilidad de tu propia agenda.",
            status_code=403,
        )


def require_acceso_consultorio_user(user: Usuario = Depends(get_current_user)) -> Usuario:
    assert_acceso_consultorio(user)
    return user


def require_info_tutores_user(user: Usuario = Depends(get_current_user)) -> Usuario:
    assert_info_tutores_completa(user)
    return user


def require_cliente_detalle_user(user: Usuario = Depends(get_current_user)) -> Usuario:
    """Veterinario y recepción necesitan privilegio de tutores para ver ficha completa del cliente."""
    if user.rol_id in (2, 3):
        assert_info_tutores_completa(user)
    return user


def require_cliente_mutacion_user(user: Usuario = Depends(get_current_user)) -> Usuario:
    """Crear / editar / desactivar cliente (roles que mutan tutores)."""
    if user.rol_id not in (1, 3):
        raise HTTPException(status_code=403, detail="No tienes permisos para realizar esta acción")
    assert_info_tutores_completa(user)
    return user


def require_identidad_o_vinculo_user(user: Usuario = Depends(get_current_user)) -> Usuario:
    """Búsqueda por documento y vínculos (flujo consultorio)."""
    if user.rol_id not in (1, 2, 3):
        raise HTTPException(status_code=403, detail="No tienes permisos para realizar esta acción")
    assert_acceso_consultorio(user)
    return user


def require_mascotas_read_user(user: Usuario = Depends(get_current_user)) -> Usuario:
    """Veterinario necesita acceso al consultorio para listar/ver mascotas; recepción y admin no."""
    if user.rol_id == 2:
        assert_acceso_consultorio(user)
    return user


def require_mascotas_write_user(user: Usuario = Depends(get_current_user)) -> Usuario:
    if user.rol_id not in (1, 2, 3):
        raise HTTPException(status_code=403, detail="No tienes permisos para realizar esta acción")
    if user.rol_id == 2:
        assert_acceso_consultorio(user)
    return user


def require_roles_y_consultorio(*allowed_roles: int):
    """Misma semántica que require_roles, más acceso al consultorio (excepto admin/superadmin)."""

    def _dep(user: Usuario = Depends(get_current_user)) -> Usuario:
        if user.rol_id not in allowed_roles:
            raise HTTPException(status_code=403, detail="No tienes permisos para realizar esta acción")
        assert_acceso_consultorio(user)
        return user

    return _dep
