"""ventas POS: metodo pago y CYD

Revision ID: 019
Revises: 018
Create Date: 2026-03-17
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "019"
down_revision: Union[str, None] = "018"
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

    if not _column_exists(conn, "ventas", "metodo_pago"):
        op.add_column("ventas", sa.Column("metodo_pago", sa.String(length=30), nullable=False, server_default="efectivo"))
    if not _column_exists(conn, "ventas", "tipo_operacion"):
        op.add_column("ventas", sa.Column("tipo_operacion", sa.String(length=20), nullable=False, server_default="venta"))
    if not _column_exists(conn, "ventas", "venta_origen_id"):
        op.add_column("ventas", sa.Column("venta_origen_id", sa.Integer(), nullable=True))
        op.create_foreign_key(
            "fk_ventas_venta_origen_id_ventas",
            "ventas",
            "ventas",
            ["venta_origen_id"],
            ["id"],
        )
    if not _column_exists(conn, "ventas", "motivo_cyd"):
        op.add_column("ventas", sa.Column("motivo_cyd", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("ventas", "motivo_cyd")
    op.drop_constraint("fk_ventas_venta_origen_id_ventas", "ventas", type_="foreignkey")
    op.drop_column("ventas", "venta_origen_id")
    op.drop_column("ventas", "tipo_operacion")
    op.drop_column("ventas", "metodo_pago")
