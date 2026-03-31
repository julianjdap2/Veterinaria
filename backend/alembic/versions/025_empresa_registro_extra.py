"""Campos extra de registro: departamento, canal, distribuidor.

Revision ID: 025
Revises: 024
Create Date: 2026-03-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "025"
down_revision: Union[str, None] = "024"
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
    if not _column_exists(conn, "empresas", "departamento"):
        op.add_column("empresas", sa.Column("departamento", sa.String(120), nullable=True))
    if not _column_exists(conn, "empresas", "registro_canal"):
        op.add_column("empresas", sa.Column("registro_canal", sa.String(100), nullable=True))
    if not _column_exists(conn, "empresas", "registro_distribuidor"):
        op.add_column("empresas", sa.Column("registro_distribuidor", sa.String(150), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name != "mysql":
        return
    if _column_exists(conn, "empresas", "registro_distribuidor"):
        op.drop_column("empresas", "registro_distribuidor")
    if _column_exists(conn, "empresas", "registro_canal"):
        op.drop_column("empresas", "registro_canal")
    if _column_exists(conn, "empresas", "departamento"):
        op.drop_column("empresas", "departamento")
