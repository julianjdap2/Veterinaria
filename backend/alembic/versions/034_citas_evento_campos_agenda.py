"""Campos agenda avanzada en citas.

Revision ID: 034_citas_evento
Revises: 033_extras_clinicos
"""

from alembic import op
import sqlalchemy as sa


revision = "034_citas_evento"
down_revision = "033_extras_clinicos"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("citas", sa.Column("fecha_fin", sa.DateTime(), nullable=True))
    op.add_column(
        "citas",
        sa.Column("sin_hora_definida", sa.Boolean(), nullable=False, server_default=sa.text("0")),
    )
    op.add_column("citas", sa.Column("encargados_json", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("citas", "encargados_json")
    op.drop_column("citas", "sin_hora_definida")
    op.drop_column("citas", "fecha_fin")
