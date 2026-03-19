"""formula_medica: tabla formula_items para fórmula médica por consulta

Revision ID: 008
Revises: 007
Create Date: 2026-03-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(conn, table: str) -> bool:
    if conn.dialect.name != "mysql":
        return False
    r = conn.execute(sa.text(f"SHOW TABLES LIKE '{table}'"))
    return r.fetchone() is not None


def upgrade() -> None:
    conn = op.get_bind()
    if _table_exists(conn, "formula_items"):
        return
    op.create_table(
        "formula_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("consulta_id", sa.Integer(), nullable=False),
        sa.Column("producto_id", sa.Integer(), nullable=False),
        sa.Column("presentacion", sa.String(200), nullable=True),
        sa.Column("precio", sa.Numeric(12, 2), nullable=True),
        sa.Column("observacion", sa.Text(), nullable=True),
        sa.Column("cantidad", sa.Integer(), nullable=False, server_default="1"),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["consulta_id"], ["consultas.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["producto_id"], ["productos.id"]),
    )
    op.create_index(op.f("ix_formula_items_id"), "formula_items", ["id"], unique=False)
    op.create_index(op.f("ix_formula_items_consulta_id"), "formula_items", ["consulta_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_formula_items_consulta_id"), table_name="formula_items")
    op.drop_index(op.f("ix_formula_items_id"), table_name="formula_items")
    op.drop_table("formula_items")
