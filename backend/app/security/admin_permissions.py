from fastapi import Depends

from sqlalchemy.orm import Session



from app.core.errors import ApiError

from app.database.database import get_db

from app.models.empresa_admin_permiso import EmpresaAdminPermiso

from app.models.empresa_perfil_admin import EmpresaPerfilAdmin

from app.models.usuario import Usuario

from app.security.dependencies import get_current_user



# Campos consultados por la API / require_admin_permission (plantilla empresa + perfiles).

ADMIN_PERMISSION_FIELDS: tuple[str, ...] = (

    "admin_gestion_usuarios",

    "admin_gestion_inventario",

    "admin_gestion_ventas",

    "admin_gestion_citas",

    "admin_ver_auditoria",

    "admin_configuracion_empresa",

    "admin_carga_masiva_inventario",

    "admin_exportacion_dashboard",

)





def leer_permisos_plantilla_empresa(db: Session, empresa_id: int) -> dict[str, bool]:

    """Plantilla base (`empresa_admin_permisos`). Si no hay fila, todo True (legacy)."""

    rec = (

        db.query(EmpresaAdminPermiso)

        .filter(EmpresaAdminPermiso.empresa_id == empresa_id)

        .first()

    )

    out: dict[str, bool] = {}

    for field in ADMIN_PERMISSION_FIELDS:

        if rec is None:

            out[field] = True

        else:

            out[field] = bool(getattr(rec, field, True))

    return out





def leer_permisos_admin_empresa(db: Session, empresa_id: int) -> dict[str, bool]:

    """Alias retrocompatible: valores plantilla por empresa."""

    return leer_permisos_plantilla_empresa(db, empresa_id)





def permisos_efectivos_admin(db: Session, usuario: Usuario) -> dict[str, bool]:

    """

    Permisos efectivos para un usuario admin (rol_id=1): plantilla + overrides del perfil asignado.

    Para otros roles no administrador, devuelve la plantilla (no usado por require_admin_permission).

    """

    base = leer_permisos_plantilla_empresa(db, usuario.empresa_id)

    if usuario.rol_id != 1 or not getattr(usuario, "perfil_admin_id", None):

        return base

    perfil = (

        db.query(EmpresaPerfilAdmin)

        .filter(

            EmpresaPerfilAdmin.id == usuario.perfil_admin_id,

            EmpresaPerfilAdmin.empresa_id == usuario.empresa_id,

        )

        .first()

    )

    if not perfil:

        return base

    for field in ADMIN_PERMISSION_FIELDS:

        v = getattr(perfil, field, None)

        if v is not None:

            base[field] = bool(v)

    return base





def require_admin_permission(permission_field: str):

    """Valida permiso granular para rol ADMIN (rol_id=1), respetando plantilla y perfil."""



    def checker(

        current_user=Depends(get_current_user),

        db: Session = Depends(get_db),

    ):

        if current_user.rol_id == 4:

            return current_user



        if current_user.rol_id != 1:

            return current_user



        effective = permisos_efectivos_admin(db, current_user)

        allowed = effective.get(permission_field, True)

        if not allowed:

            raise ApiError(

                code="admin_permission_denied",

                message="Tu perfil admin no tiene permiso para esta operación en esta empresa",

                status_code=403,

            )

        return current_user



    return checker


