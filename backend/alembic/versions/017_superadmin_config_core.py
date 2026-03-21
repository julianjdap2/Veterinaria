"""superadmin config core

Revision ID: 017
Revises: 016
Create Date: 2026-03-19
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "017"
down_revision: Union[str, None] = "016"
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

    if not _column_exists(conn, "empresas", "estado"):
        op.add_column("empresas", sa.Column("estado", sa.String(length=30), nullable=False, server_default=sa.text("'activa'")))
    if not _column_exists(conn, "empresas", "deleted_at"):
        op.add_column("empresas", sa.Column("deleted_at", sa.TIMESTAMP(), nullable=True))

    plan_columns = [
        ("codigo", sa.String(length=30), "'STANDARD'"),
        ("max_citas_mes", sa.Integer(), None),
        ("modulo_inventario", sa.Boolean(), "1"),
        ("modulo_ventas", sa.Boolean(), "1"),
        ("modulo_reportes", sa.Boolean(), "1"),
        ("modulo_facturacion_electronica", sa.Boolean(), "0"),
        ("feature_recordatorios_automaticos", sa.Boolean(), "1"),
        ("feature_dashboard_avanzado", sa.Boolean(), "0"),
        ("feature_exportaciones", sa.Boolean(), "1"),
        ("soporte_nivel", sa.String(length=20), "'basico'"),
    ]
    for name, col_type, default in plan_columns:
        if _column_exists(conn, "planes", name):
            continue
        server_default = sa.text(default) if default is not None else None
        op.add_column("planes", sa.Column(name, col_type, nullable=True if default is None else False, server_default=server_default))

    if not _table_exists(conn, "empresa_configuraciones"):
        op.create_table(
            "empresa_configuraciones",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("empresa_id", sa.Integer(), nullable=False, unique=True),
            sa.Column("logo_url", sa.String(length=255), nullable=True),
            sa.Column("horario_desde", sa.String(length=5), nullable=True),
            sa.Column("horario_hasta", sa.String(length=5), nullable=True),
            sa.Column("timezone", sa.String(length=50), nullable=True, server_default=sa.text("'America/Bogota'")),
            sa.Column("tipos_servicio_json", sa.Text(), nullable=True),
            sa.Column("precios_servicio_json", sa.Text(), nullable=True),
            sa.Column("configuracion_agenda_json", sa.Text(), nullable=True),
            sa.Column("modulo_inventario", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column("modulo_ventas", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column("modulo_reportes", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column("modulo_facturacion_electronica", sa.Boolean(), nullable=False, server_default=sa.text("0")),
            sa.Column("feature_recordatorios_automaticos", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column("feature_dashboard_avanzado", sa.Boolean(), nullable=False, server_default=sa.text("0")),
            sa.Column("feature_exportaciones", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["empresa_id"], ["empresas.id"]),
        )
        op.create_index(op.f("ix_empresa_configuraciones_id"), "empresa_configuraciones", ["id"], unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    if _table_exists(conn, "empresa_configuraciones"):
        op.drop_index(op.f("ix_empresa_configuraciones_id"), table_name="empresa_configuraciones")
        op.drop_table("empresa_configuraciones")
