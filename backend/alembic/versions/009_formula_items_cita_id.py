"""formula_items: añadir cita_id y hacer consulta_id nullable (prescripción en cita)

Revision ID: 009
Revises: 008
Create Date: 2026-03-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("formula_items", sa.Column("cita_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_formula_items_cita_id",
        "formula_items",
        "citas",
        ["cita_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index(op.f("ix_formula_items_cita_id"), "formula_items", ["cita_id"], unique=False)
    op.alter_column(
        "formula_items",
        "consulta_id",
        existing_type=sa.Integer(),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "formula_items",
        "consulta_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
    op.drop_index(op.f("ix_formula_items_cita_id"), table_name="formula_items")
    op.drop_constraint("fk_formula_items_cita_id", "formula_items", type_="foreignkey")
    op.drop_column("formula_items", "cita_id")
