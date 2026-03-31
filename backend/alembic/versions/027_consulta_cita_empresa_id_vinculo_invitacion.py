"""empresa_id en consultas/citas; invitaciones para ampliar vínculo por correo.

Revision ID: 027
Revises: 026
Create Date: 2026-03-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "027"
down_revision: Union[str, None] = "026"
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

    if not _column_exists(conn, "consultas", "empresa_id"):
        op.add_column("consultas", sa.Column("empresa_id", sa.Integer(), nullable=True))
        op.create_foreign_key("fk_consultas_empresa_id", "consultas", "empresas", ["empresa_id"], ["id"])
        op.create_index("ix_consultas_empresa_id", "consultas", ["empresa_id"])

    conn.execute(
        sa.text(
            """
            UPDATE consultas c
            INNER JOIN mascotas m ON c.mascota_id = m.id
            SET c.empresa_id = m.empresa_id
            WHERE c.empresa_id IS NULL AND m.empresa_id IS NOT NULL
            """
        )
    )
    conn.execute(
        sa.text(
            """
            UPDATE consultas c
            INNER JOIN mascotas m ON c.mascota_id = m.id
            INNER JOIN cliente_empresa_vinculos v
              ON v.cliente_id = m.cliente_id AND v.estado = 'active'
            SET c.empresa_id = v.empresa_id
            WHERE c.empresa_id IS NULL
            """
        )
    )

    if not _column_exists(conn, "citas", "empresa_id"):
        op.add_column("citas", sa.Column("empresa_id", sa.Integer(), nullable=True))
        op.create_foreign_key("fk_citas_empresa_id", "citas", "empresas", ["empresa_id"], ["id"])
        op.create_index("ix_citas_empresa_id", "citas", ["empresa_id"])

    conn.execute(
        sa.text(
            """
            UPDATE citas ci
            INNER JOIN mascotas m ON ci.mascota_id = m.id
            SET ci.empresa_id = m.empresa_id
            WHERE ci.empresa_id IS NULL AND m.empresa_id IS NOT NULL
            """
        )
    )
    conn.execute(
        sa.text(
            """
            UPDATE citas ci
            INNER JOIN mascotas m ON ci.mascota_id = m.id
            INNER JOIN cliente_empresa_vinculos v
              ON v.cliente_id = m.cliente_id AND v.estado = 'active'
            SET ci.empresa_id = v.empresa_id
            WHERE ci.empresa_id IS NULL
            """
        )
    )

    if not _table_exists(conn, "cliente_vinculo_invitaciones"):
        op.create_table(
            "cliente_vinculo_invitaciones",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("cliente_id", sa.Integer(), nullable=False),
            sa.Column("empresa_id", sa.Integer(), nullable=False),
            sa.Column("token_hash", sa.String(64), nullable=False),
            sa.Column("expires_at", sa.TIMESTAMP(), nullable=False),
            sa.Column("used_at", sa.TIMESTAMP(), nullable=True),
            sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["cliente_id"], ["clientes.id"], name="fk_vinv_cliente"),
            sa.ForeignKeyConstraint(["empresa_id"], ["empresas.id"], name="fk_vinv_empresa"),
        )
        op.create_index("ix_vinv_token_hash", "cliente_vinculo_invitaciones", ["token_hash"], unique=True)
        op.create_index("ix_vinv_cliente_empresa", "cliente_vinculo_invitaciones", ["cliente_id", "empresa_id"])


def downgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name != "mysql":
        return
    if _table_exists(conn, "cliente_vinculo_invitaciones"):
        op.drop_table("cliente_vinculo_invitaciones")
    if _column_exists(conn, "citas", "empresa_id"):
        op.drop_constraint("fk_citas_empresa_id", "citas", type_="foreignkey")
        op.drop_index("ix_citas_empresa_id", table_name="citas")
        op.drop_column("citas", "empresa_id")
    if _column_exists(conn, "consultas", "empresa_id"):
        op.drop_constraint("fk_consultas_empresa_id", "consultas", type_="foreignkey")
        op.drop_index("ix_consultas_empresa_id", table_name="consultas")
        op.drop_column("consultas", "empresa_id")
