"""add empresa_id to ventas if missing

Revision ID: 005
Revises: 004
Create Date: 2026-03-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # La tabla ventas puede existir sin empresa_id. Añadimos la columna solo si no existe.
    conn = op.get_bind()
    if conn.dialect.name == "mysql":
        r = conn.execute(sa.text("SHOW COLUMNS FROM ventas LIKE 'empresa_id'"))
        if r.fetchone() is None:
            op.add_column(
                "ventas",
                sa.Column("empresa_id", sa.Integer(), nullable=True),
            )
            conn.execute(sa.text("UPDATE ventas SET empresa_id = 1 WHERE empresa_id IS NULL"))
            op.alter_column(
                "ventas",
                "empresa_id",
                existing_type=sa.Integer(),
                nullable=False,
            )
            op.create_foreign_key(
                "fk_ventas_empresa_id_empresas",
                "ventas",
                "empresas",
                ["empresa_id"],
                ["id"],
            )
    else:
        # SQLite / otros: intentar añadir (fallará si ya existe)
        try:
            op.add_column(
                "ventas",
                sa.Column("empresa_id", sa.Integer(), nullable=True),
            )
            conn.execute(sa.text("UPDATE ventas SET empresa_id = 1 WHERE empresa_id IS NULL"))
            op.alter_column(
                "ventas",
                "empresa_id",
                existing_type=sa.Integer(),
                nullable=False,
            )
            op.create_foreign_key(
                "fk_ventas_empresa_id_empresas",
                "ventas",
                "empresas",
                ["empresa_id"],
                ["id"],
            )
        except Exception:
            pass


def downgrade() -> None:
    op.drop_constraint("fk_ventas_empresa_id_empresas", "ventas", type_="foreignkey")
    op.drop_column("ventas", "empresa_id")
