"""add consulta cita_id

Revision ID: 003
Revises: 002
Create Date: 2026-03-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "consultas",
        sa.Column("cita_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_consultas_cita_id_citas",
        "consultas",
        "citas",
        ["cita_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_consultas_cita_id_citas", "consultas", type_="foreignkey")
    op.drop_column("consultas", "cita_id")
