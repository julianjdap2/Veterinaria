"""Vínculo propietario–clínica: identidad global y permisos por empresa.

Revision ID: 026
Revises: 025
Create Date: 2026-03-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "026"
down_revision: Union[str, None] = "025"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(conn, table: str) -> bool:
    if conn.dialect.name != "mysql":
        return False
    r = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = DATABASE() AND table_name = :t LIMIT 1"
        ),
        {"t": table},
    )
    return r.fetchone() is not None


def upgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name != "mysql":
        return
    if not _table_exists(conn, "cliente_empresa_vinculos"):
        op.create_table(
            "cliente_empresa_vinculos",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("cliente_id", sa.Integer(), nullable=False),
            sa.Column("empresa_id", sa.Integer(), nullable=False),
            sa.Column("access_level", sa.String(20), nullable=False, server_default="full"),
            sa.Column("estado", sa.String(30), nullable=False, server_default="active"),
            sa.Column("marketing_canal", sa.String(150), nullable=True),
            sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("validated_at", sa.TIMESTAMP(), nullable=True),
            sa.ForeignKeyConstraint(["cliente_id"], ["clientes.id"], name="fk_venv_cliente"),
            sa.ForeignKeyConstraint(["empresa_id"], ["empresas.id"], name="fk_venv_empresa"),
            sa.UniqueConstraint("cliente_id", "empresa_id", name="uq_cliente_empresa_vinculo"),
        )
        op.create_index("ix_venv_empresa", "cliente_empresa_vinculos", ["empresa_id"])
        op.create_index("ix_venv_cliente", "cliente_empresa_vinculos", ["cliente_id"])

    # Backfill: un vínculo completo por cada cliente con empresa asignada
    conn.execute(
        sa.text(
            """
            INSERT IGNORE INTO cliente_empresa_vinculos
              (cliente_id, empresa_id, access_level, estado, created_at)
            SELECT c.id, c.empresa_id, 'full', 'active', COALESCE(c.created_at, CURRENT_TIMESTAMP)
            FROM clientes c
            WHERE c.empresa_id IS NOT NULL
            """
        )
    )


def downgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name != "mysql":
        return
    if _table_exists(conn, "cliente_empresa_vinculos"):
        op.drop_table("cliente_empresa_vinculos")
