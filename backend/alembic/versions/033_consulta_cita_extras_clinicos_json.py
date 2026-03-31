"""extras_clinicos_json en consultas y citas."""

from alembic import op
import sqlalchemy as sa


revision = "033_extras_clinicos"
down_revision = "032_variables_clinicas"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("consultas", sa.Column("extras_clinicos_json", sa.Text(), nullable=True))
    op.add_column("citas", sa.Column("extras_clinicos_json", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("citas", "extras_clinicos_json")
    op.drop_column("consultas", "extras_clinicos_json")
