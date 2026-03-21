"""Venta: codigo_interno; empresa: consecutivo ventas.

Revision ID: 021
Revises: 020
Create Date: 2026-03-17
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "021"
down_revision: Union[str, None] = "020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(conn, table: str, column: str) -> bool:
    if conn.dialect.name != "mysql":
        return False
    r = conn.execute(sa.text(f"SHOW COLUMNS FROM {table} LIKE '{column}'"))
    return r.fetchone() is not None


def upgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name != "mysql":
        return

    if not _column_exists(conn, "ventas", "codigo_interno"):
        op.add_column("ventas", sa.Column("codigo_interno", sa.String(length=64), nullable=True))

    if not _column_exists(conn, "empresa_configuraciones", "venta_prefijo"):
        op.add_column(
            "empresa_configuraciones",
            sa.Column("venta_prefijo", sa.String(length=20), nullable=False, server_default="V-"),
        )
    if not _column_exists(conn, "empresa_configuraciones", "venta_siguiente_numero"):
        op.add_column(
            "empresa_configuraciones",
            sa.Column("venta_siguiente_numero", sa.Integer(), nullable=False, server_default="1"),
        )
    if not _column_exists(conn, "empresa_configuraciones", "venta_numero_padding"):
        op.add_column(
            "empresa_configuraciones",
            sa.Column("venta_numero_padding", sa.Integer(), nullable=False, server_default="6"),
        )


def downgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name != "mysql":
        return
    if _column_exists(conn, "empresa_configuraciones", "venta_numero_padding"):
        op.drop_column("empresa_configuraciones", "venta_numero_padding")
    if _column_exists(conn, "empresa_configuraciones", "venta_siguiente_numero"):
        op.drop_column("empresa_configuraciones", "venta_siguiente_numero")
    if _column_exists(conn, "empresa_configuraciones", "venta_prefijo"):
        op.drop_column("empresa_configuraciones", "venta_prefijo")
    if _column_exists(conn, "ventas", "codigo_interno"):
        op.drop_column("ventas", "codigo_interno")
