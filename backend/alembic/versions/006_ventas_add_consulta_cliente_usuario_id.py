"""add consulta_id, cliente_id, usuario_id to ventas if missing

Revision ID: 006
Revises: 005
Create Date: 2026-03-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "006"
down_revision: Union[str, None] = "005"
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

    if not _column_exists(conn, "ventas", "consulta_id"):
        op.add_column(
            "ventas",
            sa.Column("consulta_id", sa.Integer(), nullable=True),
        )
        op.create_foreign_key(
            "fk_ventas_consulta_id_consultas",
            "ventas",
            "consultas",
            ["consulta_id"],
            ["id"],
        )
    if not _column_exists(conn, "ventas", "cliente_id"):
        op.add_column(
            "ventas",
            sa.Column("cliente_id", sa.Integer(), nullable=True),
        )
        op.create_foreign_key(
            "fk_ventas_cliente_id_clientes",
            "ventas",
            "clientes",
            ["cliente_id"],
            ["id"],
        )
    if not _column_exists(conn, "ventas", "usuario_id"):
        op.add_column(
            "ventas",
            sa.Column("usuario_id", sa.Integer(), nullable=True),
        )
        op.create_foreign_key(
            "fk_ventas_usuario_id_usuarios",
            "ventas",
            "usuarios",
            ["usuario_id"],
            ["id"],
        )


def downgrade() -> None:
    op.drop_constraint("fk_ventas_usuario_id_usuarios", "ventas", type_="foreignkey")
    op.drop_constraint("fk_ventas_cliente_id_clientes", "ventas", type_="foreignkey")
    op.drop_constraint("fk_ventas_consulta_id_consultas", "ventas", type_="foreignkey")
    op.drop_column("ventas", "usuario_id")
    op.drop_column("ventas", "cliente_id")
    op.drop_column("ventas", "consulta_id")
