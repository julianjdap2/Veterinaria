"""
Registro público de clínica + primer administrador (self-service).
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.models.empresa import Empresa
from app.models.empresa_configuracion import EmpresaConfiguracion
from app.models.plan import Plan
from app.models.usuario import Usuario
from app.repositories.usuario_repository import get_user_by_email
from app.security.auth import create_access_token
from app.security.password import hash_password
from app.security.registro_activation import decode_registro_activation_token


def _plan_por_defecto(db: Session) -> Plan:
    p = db.query(Plan).filter(Plan.codigo == "STANDARD").first()
    if p:
        return p
    p = db.query(Plan).order_by(Plan.id.asc()).first()
    if not p:
        raise ApiError(
            code="no_plan_configured",
            message="No hay planes configurados. Contacte al administrador del sistema.",
            status_code=503,
        )
    return p


def registrar_clinica_y_admin(
    db: Session,
    *,
    empresa_nombre: str,
    ciudad: str,
    pais: str,
    tipo_establecimiento: str,
    departamento: str | None,
    registro_canal: str,
    registro_distribuidor: str,
    usuario_nombre: str,
    usuario_email: str,
    usuario_telefono: str | None,
    usuario_password: str,
) -> str:
    """
    Crea empresa (en prueba), fila de configuración y usuario administrador.
    Devuelve JWT de acceso.
    """
    email = usuario_email.strip().lower()
    if get_user_by_email(db, email):
        raise ApiError(
            code="email_already_registered",
            message="Este correo ya está registrado. Inicia sesión o usa otro email.",
            status_code=409,
        )

    plan = _plan_por_defecto(db)

    dep = (departamento or "").strip()
    tel = (usuario_telefono or "").strip()
    empresa = Empresa(
        nombre=empresa_nombre.strip(),
        plan_id=plan.id,
        estado="en_prueba",
        activa=True,
        ciudad=ciudad.strip(),
        departamento=dep or None,
        pais=pais.strip(),
        tipo_establecimiento=tipo_establecimiento.strip(),
        registro_canal=registro_canal.strip(),
        registro_distribuidor=registro_distribuidor.strip(),
        telefono=tel or None,
        email=usuario_email.strip().lower(),
        direccion=f"{ciudad.strip()}, {pais.strip()}",
    )
    db.add(empresa)
    db.flush()

    db.add(EmpresaConfiguracion(empresa_id=empresa.id))

    admin = Usuario(
        nombre=usuario_nombre.strip(),
        email=email,
        password_hash=hash_password(usuario_password),
        rol_id=1,
        empresa_id=empresa.id,
        activo=True,
        perfil_admin_id=None,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    return admin.id


def activar_registro_desde_token(db: Session, token: str) -> str:
    """Valida el JWT del correo y devuelve un JWT de sesión (equivalente a login)."""
    user_id = decode_registro_activation_token(token)
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise ApiError(code="usuario_no_encontrado", message="Usuario no encontrado.", status_code=404)
    if not user.activo:
        raise ApiError(code="usuario_inactivo", message="Usuario inactivo.", status_code=403)
    if user.rol_id != 4:
        empresa = db.query(Empresa).filter(Empresa.id == user.empresa_id).first()
        if not empresa:
            raise ApiError(code="empresa_not_found", message="Empresa no encontrada.", status_code=403)
        if bool(getattr(empresa, "deleted_at", None)):
            raise ApiError(code="empresa_deleted", message="Empresa eliminada o inactiva.", status_code=403)
        estado = (getattr(empresa, "estado", "activa") or "activa").lower()
        if not empresa.activa or estado == "suspendida":
            raise ApiError(code="empresa_suspendida", message="Empresa suspendida. Contacta al administrador.", status_code=403)
    return create_access_token(
        {
            "user_id": user.id,
            "empresa_id": user.empresa_id,
            "rol_id": user.rol_id,
        }
    )
