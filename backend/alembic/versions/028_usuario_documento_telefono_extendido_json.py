"""usuarios: documento, telefono, extendido_json (preferencias y perfil operativo).

Revision ID: 028
Revises: 027
Create Date: 2026-03-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "028"
down_revision: Union[str, None] = "027"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("usuarios", sa.Column("documento", sa.String(64), nullable=True))
    op.add_column("usuarios", sa.Column("telefono", sa.String(64), nullable=True))
    op.add_column("usuarios", sa.Column("extendido_json", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("usuarios", "extendido_json")
    op.drop_column("usuarios", "telefono")
    op.drop_column("usuarios", "documento")
