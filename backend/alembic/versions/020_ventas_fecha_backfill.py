"""Rellenar ventas.fecha cuando es NULL (MySQL).

Revision ID: 020
Revises: 019
Create Date: 2026-03-17
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "020"
down_revision: Union[str, None] = "019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name == "mysql":
        conn.execute(sa.text("UPDATE ventas SET fecha = CURRENT_TIMESTAMP WHERE fecha IS NULL"))


def downgrade() -> None:
    pass
