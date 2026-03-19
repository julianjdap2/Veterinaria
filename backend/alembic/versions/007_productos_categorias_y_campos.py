"""productos: categorías y campos EAN, cod_articulo, fabricante, presentación, stock_minimo

Revision ID: 007
Revises: 006
Create Date: 2026-03-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(conn, table: str, column: str) -> bool:
    if conn.dialect.name != "mysql":
        return False
    r = conn.execute(sa.text(f"SHOW COLUMNS FROM {table} LIKE '{column}'"))
    return r.fetchone() is not None


def _table_exists(conn, table: str) -> bool:
    if conn.dialect.name != "mysql":
        return False
    r = conn.execute(sa.text(f"SHOW TABLES LIKE '{table}'"))
    return r.fetchone() is not None


def upgrade() -> None:
    conn = op.get_bind()
    if not _table_exists(conn, "categorias_producto"):
        op.create_table(
            "categorias_producto",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("empresa_id", sa.Integer(), nullable=False),
            sa.Column("nombre", sa.String(80), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(["empresa_id"], ["empresas.id"]),
        )
        op.create_index("ix_categorias_producto_id", "categorias_producto", ["id"])

    if not _column_exists(conn, "productos", "categoria_id"):
        op.add_column("productos", sa.Column("categoria_id", sa.Integer(), nullable=True))
        op.create_foreign_key(
            "fk_productos_categoria_id_categorias",
            "productos",
            "categorias_producto",
            ["categoria_id"],
            ["id"],
        )
    if not _column_exists(conn, "productos", "cod_articulo"):
        op.add_column("productos", sa.Column("cod_articulo", sa.String(50), nullable=True))
    if not _column_exists(conn, "productos", "ean"):
        op.add_column("productos", sa.Column("ean", sa.String(20), nullable=True))
    if not _column_exists(conn, "productos", "fabricante"):
        op.add_column("productos", sa.Column("fabricante", sa.String(150), nullable=True))
    if not _column_exists(conn, "productos", "presentacion"):
        op.add_column("productos", sa.Column("presentacion", sa.String(200), nullable=True))
    if not _column_exists(conn, "productos", "stock_minimo"):
        op.add_column(
            "productos",
            sa.Column("stock_minimo", sa.Integer(), nullable=False, server_default="0"),
        )


def downgrade() -> None:
    op.drop_constraint("fk_productos_categoria_id_categorias", "productos", type_="foreignkey")
    op.drop_column("productos", "stock_minimo")
    op.drop_column("productos", "presentacion")
    op.drop_column("productos", "fabricante")
    op.drop_column("productos", "ean")
    op.drop_column("productos", "cod_articulo")
    op.drop_column("productos", "categoria_id")
    op.drop_table("categorias_producto")
