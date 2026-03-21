"""perfiles admin y permisos avanzados por empresa

Revision ID: 018
Revises: 017
Create Date: 2026-03-17
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "018"
down_revision: Union[str, None] = "017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(conn, table: str) -> bool:
    if conn.dialect.name != "mysql":
        return False
    r = conn.execute(sa.text(f"SHOW TABLES LIKE '{table}'")).fetchone()
    return r is not None


def _column_exists(conn, table: str, column: str) -> bool:
    if conn.dialect.name != "mysql":
        return False
    sql = """
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = :table
      AND COLUMN_NAME = :column
    """
    r = conn.execute(sa.text(sql), {"table": table, "column": column}).fetchone()
    return bool(r and r[0] > 0)


def upgrade() -> None:
    conn = op.get_bind()

    if _table_exists(conn, "empresa_admin_permisos"):
        if not _column_exists(conn, "empresa_admin_permisos", "admin_carga_masiva_inventario"):
            op.add_column(
                "empresa_admin_permisos",
                sa.Column("admin_carga_masiva_inventario", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            )
        if not _column_exists(conn, "empresa_admin_permisos", "admin_exportacion_dashboard"):
            op.add_column(
                "empresa_admin_permisos",
                sa.Column("admin_exportacion_dashboard", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            )

    if not _table_exists(conn, "empresa_perfiles_admin"):
        op.create_table(
            "empresa_perfiles_admin",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("empresa_id", sa.Integer(), nullable=False),
            sa.Column("nombre", sa.String(length=100), nullable=False),
            sa.Column("slug", sa.String(length=50), nullable=False),
            sa.Column("admin_gestion_usuarios", sa.Boolean(), nullable=True),
            sa.Column("admin_gestion_inventario", sa.Boolean(), nullable=True),
            sa.Column("admin_gestion_ventas", sa.Boolean(), nullable=True),
            sa.Column("admin_gestion_citas", sa.Boolean(), nullable=True),
            sa.Column("admin_ver_auditoria", sa.Boolean(), nullable=True),
            sa.Column("admin_configuracion_empresa", sa.Boolean(), nullable=True),
            sa.Column("admin_carga_masiva_inventario", sa.Boolean(), nullable=True),
            sa.Column("admin_exportacion_dashboard", sa.Boolean(), nullable=True),
            sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["empresa_id"], ["empresas.id"]),
            sa.UniqueConstraint("empresa_id", "slug", name="uq_empresa_perfil_slug"),
        )
        op.create_index(op.f("ix_empresa_perfiles_admin_id"), "empresa_perfiles_admin", ["id"], unique=False)

    if _table_exists(conn, "usuarios") and not _column_exists(conn, "usuarios", "perfil_admin_id"):
        op.add_column("usuarios", sa.Column("perfil_admin_id", sa.Integer(), nullable=True))
        op.create_foreign_key(
            "fk_usuarios_perfil_admin",
            "usuarios",
            "empresa_perfiles_admin",
            ["perfil_admin_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    conn = op.get_bind()
    if _table_exists(conn, "usuarios") and _column_exists(conn, "usuarios", "perfil_admin_id"):
        op.drop_constraint("fk_usuarios_perfil_admin", "usuarios", type_="foreignkey")
        op.drop_column("usuarios", "perfil_admin_id")
    if _table_exists(conn, "empresa_perfiles_admin"):
        op.drop_index(op.f("ix_empresa_perfiles_admin_id"), table_name="empresa_perfiles_admin")
        op.drop_table("empresa_perfiles_admin")
    if _table_exists(conn, "empresa_admin_permisos"):
        if _column_exists(conn, "empresa_admin_permisos", "admin_exportacion_dashboard"):
            op.drop_column("empresa_admin_permisos", "admin_exportacion_dashboard")
        if _column_exists(conn, "empresa_admin_permisos", "admin_carga_masiva_inventario"):
            op.drop_column("empresa_admin_permisos", "admin_carga_masiva_inventario")
