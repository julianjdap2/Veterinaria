"""empresa admin permissions

Revision ID: 016
Revises: 015
Create Date: 2026-03-19
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "016"
down_revision: Union[str, None] = "015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(conn, table: str) -> bool:
    if conn.dialect.name != "mysql":
        return False
    r = conn.execute(sa.text(f"SHOW TABLES LIKE '{table}'")).fetchone()
    return r is not None


def upgrade() -> None:
    conn = op.get_bind()
    if _table_exists(conn, "empresa_admin_permisos"):
        return
    op.create_table(
        "empresa_admin_permisos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("empresa_id", sa.Integer(), nullable=False, unique=True),
        sa.Column("admin_gestion_usuarios", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("admin_gestion_inventario", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("admin_gestion_ventas", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("admin_gestion_citas", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("admin_ver_auditoria", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("admin_configuracion_empresa", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["empresa_id"], ["empresas.id"]),
    )
    op.create_index(op.f("ix_empresa_admin_permisos_id"), "empresa_admin_permisos", ["id"], unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    if not _table_exists(conn, "empresa_admin_permisos"):
        return
    op.drop_index(op.f("ix_empresa_admin_permisos_id"), table_name="empresa_admin_permisos")
    op.drop_table("empresa_admin_permisos")
