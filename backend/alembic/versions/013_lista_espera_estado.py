"""lista_espera: agregar estado de flujo

Revision ID: 013
Revises: 012
Create Date: 2026-03-19
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "013"
down_revision: Union[str, None] = "012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


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
    if _column_exists(conn, "lista_espera", "estado"):
        return
    op.add_column(
        "lista_espera",
        sa.Column("estado", sa.String(length=20), nullable=False, server_default=sa.text("'pendiente'")),
    )


def downgrade() -> None:
    conn = op.get_bind()
    if not _column_exists(conn, "lista_espera", "estado"):
        return
    op.drop_column("lista_espera", "estado")
