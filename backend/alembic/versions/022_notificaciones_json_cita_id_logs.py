"""Notificaciones: JSON en empresa_config; cita_id en notification_logs.

Revision ID: 022
Revises: 021
Create Date: 2026-03-17
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "022"
down_revision: Union[str, None] = "021"
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

    if not _column_exists(conn, "empresa_configuraciones", "notificaciones_json"):
        op.add_column("empresa_configuraciones", sa.Column("notificaciones_json", sa.Text(), nullable=True))

    if not _column_exists(conn, "notification_logs", "cita_id"):
        op.add_column("notification_logs", sa.Column("cita_id", sa.Integer(), nullable=True))
        op.create_foreign_key(
            "fk_notification_logs_cita_id",
            "notification_logs",
            "citas",
            ["cita_id"],
            ["id"],
        )
        op.create_index("ix_notification_logs_cita_id", "notification_logs", ["cita_id"])


def downgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name != "mysql":
        return
    if _column_exists(conn, "notification_logs", "cita_id"):
        op.drop_index("ix_notification_logs_cita_id", table_name="notification_logs")
        op.drop_constraint("fk_notification_logs_cita_id", "notification_logs", type_="foreignkey")
        op.drop_column("notification_logs", "cita_id")
    if _column_exists(conn, "empresa_configuraciones", "notificaciones_json"):
        op.drop_column("empresa_configuraciones", "notificaciones_json")
