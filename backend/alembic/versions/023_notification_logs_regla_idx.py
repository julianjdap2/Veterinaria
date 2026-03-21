"""Índice de regla de recordatorio en notification_logs (deduplicación por regla).

Revision ID: 023
Revises: 022
Create Date: 2026-03-17
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "023"
down_revision: Union[str, None] = "022"
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
    if not _column_exists(conn, "notification_logs", "recordatorio_regla_idx"):
        op.add_column(
            "notification_logs",
            sa.Column("recordatorio_regla_idx", sa.Integer(), nullable=True),
        )
        op.create_index(
            "ix_notification_logs_cita_canal_regla",
            "notification_logs",
            ["cita_id", "canal", "recordatorio_regla_idx"],
            unique=False,
        )


def downgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name != "mysql":
        return
    if _column_exists(conn, "notification_logs", "recordatorio_regla_idx"):
        try:
            op.drop_index("ix_notification_logs_cita_canal_regla", table_name="notification_logs")
        except Exception:
            pass
        op.drop_column("notification_logs", "recordatorio_regla_idx")
