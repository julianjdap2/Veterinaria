"""citas: añadir columna urgente (priorización simple)

Revision ID: 011
Revises: 010
Create Date: 2026-03-19
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "011"
down_revision: Union[str, None] = "010"
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
    if _column_exists(conn, "citas", "urgente"):
        return
    op.add_column("citas", sa.Column("urgente", sa.Boolean(), nullable=False, server_default=sa.text("0")))


def downgrade() -> None:
    conn = op.get_bind()
    if not _column_exists(conn, "citas", "urgente"):
        return
    op.drop_column("citas", "urgente")

