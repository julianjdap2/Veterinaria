"""notification_logs table

Revision ID: 015
Revises: 014
Create Date: 2026-03-19
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "015"
down_revision: Union[str, None] = "014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(conn, table: str) -> bool:
    if conn.dialect.name != "mysql":
        return False
    r = conn.execute(sa.text(f"SHOW TABLES LIKE '{table}'")).fetchone()
    return r is not None


def upgrade() -> None:
    conn = op.get_bind()
    if _table_exists(conn, "notification_logs"):
        return
    op.create_table(
        "notification_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("empresa_id", sa.Integer(), nullable=True),
        sa.Column("canal", sa.String(length=20), nullable=False),
        sa.Column("tipo_evento", sa.String(length=50), nullable=False),
        sa.Column("destino", sa.String(length=255), nullable=True),
        sa.Column("estado", sa.String(length=20), nullable=False, server_default=sa.text("'sent'")),
        sa.Column("proveedor", sa.String(length=50), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index(op.f("ix_notification_logs_id"), "notification_logs", ["id"], unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    if not _table_exists(conn, "notification_logs"):
        return
    op.drop_index(op.f("ix_notification_logs_id"), table_name="notification_logs")
    op.drop_table("notification_logs")
