"""Campos de registro público en empresas: ciudad, país, tipo de establecimiento.

Revision ID: 024
Revises: 023
Create Date: 2026-03-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "024"
down_revision: Union[str, None] = "023"
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
    if not _column_exists(conn, "empresas", "ciudad"):
        op.add_column("empresas", sa.Column("ciudad", sa.String(120), nullable=True))
    if not _column_exists(conn, "empresas", "pais"):
        op.add_column("empresas", sa.Column("pais", sa.String(80), nullable=True))
    if not _column_exists(conn, "empresas", "tipo_establecimiento"):
        op.add_column("empresas", sa.Column("tipo_establecimiento", sa.String(40), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name != "mysql":
        return
    if _column_exists(conn, "empresas", "tipo_establecimiento"):
        op.drop_column("empresas", "tipo_establecimiento")
    if _column_exists(conn, "empresas", "pais"):
        op.drop_column("empresas", "pais")
    if _column_exists(conn, "empresas", "ciudad"):
        op.drop_column("empresas", "ciudad")
