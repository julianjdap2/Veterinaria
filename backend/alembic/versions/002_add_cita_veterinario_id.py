"""add cita veterinario_id

Revision ID: 002
Revises: 001
Create Date: 2026-03-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "citas",
        sa.Column("veterinario_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_citas_veterinario_id_usuarios",
        "citas",
        "usuarios",
        ["veterinario_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_citas_veterinario_id_usuarios", "citas", type_="foreignkey")
    op.drop_column("citas", "veterinario_id")
