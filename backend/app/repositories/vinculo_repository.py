"""Acceso a vínculos propietario ↔ clínica."""

from datetime import datetime

from sqlalchemy.orm import Session

from app.models.cliente_empresa_vinculo import ClienteEmpresaVinculo

ESTADO_ACTIVO = "active"
ACCESS_FULL = "full"
ACCESS_PARTIAL = "partial"


def obtener_vinculo_activo(
    db: Session,
    cliente_id: int,
    empresa_id: int,
) -> ClienteEmpresaVinculo | None:
    return (
        db.query(ClienteEmpresaVinculo)
        .filter(
            ClienteEmpresaVinculo.cliente_id == cliente_id,
            ClienteEmpresaVinculo.empresa_id == empresa_id,
            ClienteEmpresaVinculo.estado == ESTADO_ACTIVO,
        )
        .first()
    )


def crear_vinculo(
    db: Session,
    *,
    cliente_id: int,
    empresa_id: int,
    access_level: str,
    marketing_canal: str | None = None,
) -> ClienteEmpresaVinculo:
    row = ClienteEmpresaVinculo(
        cliente_id=cliente_id,
        empresa_id=empresa_id,
        access_level=access_level,
        estado=ESTADO_ACTIVO,
        marketing_canal=(marketing_canal or None),
        validated_at=datetime.utcnow() if access_level == ACCESS_FULL else None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def upsert_vinculo(
    db: Session,
    *,
    cliente_id: int,
    empresa_id: int,
    access_level: str,
    marketing_canal: str | None = None,
) -> ClienteEmpresaVinculo:
    row = obtener_vinculo_activo(db, cliente_id, empresa_id)
    if row:
        row.access_level = access_level
        row.estado = ESTADO_ACTIVO
        if marketing_canal is not None:
            row.marketing_canal = marketing_canal or None
        if access_level == ACCESS_FULL:
            row.validated_at = datetime.utcnow()
        db.commit()
        db.refresh(row)
        return row
    return crear_vinculo(
        db,
        cliente_id=cliente_id,
        empresa_id=empresa_id,
        access_level=access_level,
        marketing_canal=marketing_canal,
    )


def asegurar_vinculo_registro_primario(db: Session, cliente_id: int, empresa_id: int) -> ClienteEmpresaVinculo:
    """Tras crear cliente en una clínica: vínculo completo activo."""
    return upsert_vinculo(
        db,
        cliente_id=cliente_id,
        empresa_id=empresa_id,
        access_level=ACCESS_FULL,
    )
