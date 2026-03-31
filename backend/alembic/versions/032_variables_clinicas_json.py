"""variables_clinicas_json en empresa_configuraciones."""

from alembic import op
import sqlalchemy as sa


revision = "032_variables_clinicas"
down_revision = "031"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "empresa_configuraciones",
        sa.Column("variables_clinicas_json", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("empresa_configuraciones", "variables_clinicas_json")
