"""add audit_logs old_values new_values

Revision ID: 001
Revises:
Create Date: 2026-03-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("audit_logs", sa.Column("old_values", sa.Text(), nullable=True))
    op.add_column("audit_logs", sa.Column("new_values", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("audit_logs", "new_values")
    op.drop_column("audit_logs", "old_values")
