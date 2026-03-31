"""clientes: tipo_documento, celular, telefono_fijo, contacto, tipo_contacto, updated_at.

Revision ID: 029
Revises: 028
Create Date: 2026-03-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "029"
down_revision: Union[str, None] = "028"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("clientes", sa.Column("tipo_documento", sa.String(10), nullable=True))
    op.add_column("clientes", sa.Column("celular", sa.String(30), nullable=True))
    op.add_column("clientes", sa.Column("telefono_fijo", sa.String(30), nullable=True))
    op.add_column("clientes", sa.Column("contacto", sa.String(30), nullable=True))
    op.add_column("clientes", sa.Column("tipo_contacto", sa.String(50), nullable=True))
    op.add_column(
        "clientes",
        sa.Column("updated_at", sa.TIMESTAMP(), nullable=True, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.execute(
        """
        UPDATE clientes
        SET celular = telefono
        WHERE telefono IS NOT NULL AND telefono != '' AND (celular IS NULL OR celular = '')
        """
    )
    op.execute(
        """
        UPDATE clientes
        SET tipo_documento = 'CC'
        WHERE documento IS NOT NULL AND documento != '' AND tipo_documento IS NULL
        """
    )
    op.execute(
        """
        UPDATE clientes
        SET updated_at = created_at
        WHERE updated_at IS NULL
        """
    )


def downgrade() -> None:
    op.drop_column("clientes", "updated_at")
    op.drop_column("clientes", "tipo_contacto")
    op.drop_column("clientes", "contacto")
    op.drop_column("clientes", "telefono_fijo")
    op.drop_column("clientes", "celular")
    op.drop_column("clientes", "tipo_documento")
