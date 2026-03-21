"""citas: crear tabla lista_espera

Revision ID: 012
Revises: 011
Create Date: 2026-03-19
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "012"
down_revision: Union[str, None] = "011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(conn, table: str) -> bool:
    if conn.dialect.name != "mysql":
        return False
    r = conn.execute(sa.text(f"SHOW TABLES LIKE '{table}'")).fetchone()
    return r is not None


def upgrade() -> None:
    conn = op.get_bind()
    if _table_exists(conn, "lista_espera"):
        return
    # MySQL (idempotencia mínima): no existe FK checking complejo aquí.
    op.create_table(
        "lista_espera",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("empresa_id", sa.Integer(), nullable=False),
        sa.Column("mascota_id", sa.Integer(), nullable=False),
        sa.Column("veterinario_id", sa.Integer(), nullable=False),
        sa.Column("fecha", sa.DateTime(), nullable=False),
        sa.Column("motivo", sa.String(length=200), nullable=True),
        sa.Column("notas", sa.Text(), nullable=True),
        sa.Column("urgente", sa.Boolean(), server_default=sa.text("0"), nullable=False),
        sa.Column("procesada", sa.Boolean(), server_default=sa.text("0"), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("procesada_en", sa.DateTime(), nullable=True),
        sa.Column("cita_id", sa.Integer(), nullable=True),
    )
    op.create_index(op.f("ix_lista_espera_id"), "lista_espera", ["id"], unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    if not _table_exists(conn, "lista_espera"):
        return
    op.drop_index(op.f("ix_lista_espera_id"), table_name="lista_espera")
    op.drop_table("lista_espera")

