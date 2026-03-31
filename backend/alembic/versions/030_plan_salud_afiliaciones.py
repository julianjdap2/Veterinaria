"""Planes de salud (paquetes), coberturas y afiliaciones por empresa.

Idempotente: tolera entornos donde `create_all` ya creó tablas.

Revision ID: 030
Revises: 029
Create Date: 2026-03-25
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "030"
down_revision: Union[str, None] = "029"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)

    ec_cols = {c["name"] for c in insp.get_columns("empresa_configuraciones")}
    if "modulo_planes_salud" not in ec_cols:
        op.add_column(
            "empresa_configuraciones",
            sa.Column("modulo_planes_salud", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        )

    tables = set(insp.get_table_names())
    if "plan_salud" not in tables:
        op.create_table(
            "plan_salud",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("empresa_id", sa.Integer(), sa.ForeignKey("empresas.id"), nullable=False, index=True),
            sa.Column("nombre", sa.String(200), nullable=False),
            sa.Column("precio", sa.Numeric(12, 2), nullable=False, server_default="0"),
            sa.Column("periodicidad_meses", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("especies_ids_json", sa.Text(), nullable=True),
            sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.TIMESTAMP(), nullable=True),
        )

    tables = set(sa.inspect(conn).get_table_names())
    if "plan_salud_cobertura" not in tables:
        op.create_table(
            "plan_salud_cobertura",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "plan_salud_id",
                sa.Integer(),
                sa.ForeignKey("plan_salud.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column("categoria_codigo", sa.String(80), nullable=False),
            sa.Column("nombre_servicio", sa.String(200), nullable=False),
            sa.Column("cantidad", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("cobertura_maxima", sa.Numeric(12, 2), nullable=True),
        )

    tables = set(sa.inspect(conn).get_table_names())
    if "plan_afiliacion" not in tables:
        op.create_table(
            "plan_afiliacion",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("empresa_id", sa.Integer(), sa.ForeignKey("empresas.id"), nullable=False, index=True),
            sa.Column("plan_salud_id", sa.Integer(), sa.ForeignKey("plan_salud.id"), nullable=False, index=True),
            sa.Column("cliente_id", sa.Integer(), sa.ForeignKey("clientes.id"), nullable=False, index=True),
            sa.Column("mascota_id", sa.Integer(), sa.ForeignKey("mascotas.id"), nullable=True, index=True),
            sa.Column("fecha_inicio", sa.Date(), nullable=False),
            sa.Column("fecha_fin", sa.Date(), nullable=False),
            sa.Column("valor_pagado", sa.Numeric(12, 2), nullable=False, server_default="0"),
            sa.Column("observaciones", sa.String(500), nullable=True),
            sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP")),
        )

    tables = set(sa.inspect(conn).get_table_names())
    if "plan_afiliacion_uso" not in tables:
        op.create_table(
            "plan_afiliacion_uso",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "afiliacion_id",
                sa.Integer(),
                sa.ForeignKey("plan_afiliacion.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column("cobertura_id", sa.Integer(), sa.ForeignKey("plan_salud_cobertura.id"), nullable=False),
            sa.Column("consumidos", sa.Integer(), nullable=False, server_default="0"),
        )


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    tables = set(insp.get_table_names())
    if "plan_afiliacion_uso" in tables:
        op.drop_table("plan_afiliacion_uso")
    if "plan_afiliacion" in tables:
        op.drop_table("plan_afiliacion")
    if "plan_salud_cobertura" in tables:
        op.drop_table("plan_salud_cobertura")
    if "plan_salud" in tables:
        op.drop_table("plan_salud")
    ec_cols = {c["name"] for c in insp.get_columns("empresa_configuraciones")}
    if "modulo_planes_salud" in ec_cols:
        op.drop_column("empresa_configuraciones", "modulo_planes_salud")
