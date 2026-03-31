"""Asistente clínico (reglas): flag en plan SaaS.

Revision ID: 031
Revises: 030
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "031"
down_revision: Union[str, None] = "030"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    cols = {c["name"] for c in insp.get_columns("planes")}
    if "feature_ia_consultorio" not in cols:
        op.add_column(
            "planes",
            sa.Column("feature_ia_consultorio", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        )


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    cols = {c["name"] for c in insp.get_columns("planes")}
    if "feature_ia_consultorio" in cols:
        op.drop_column("planes", "feature_ia_consultorio")
