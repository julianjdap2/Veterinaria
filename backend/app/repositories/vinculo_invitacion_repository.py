"""Tokens de invitación para ampliar vínculo (parcial → completo)."""

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.cliente_vinculo_invitacion import ClienteVinculoInvitacion


def invalidar_pendientes(db: Session, cliente_id: int, empresa_id: int) -> None:
    now = datetime.utcnow()
    (
        db.query(ClienteVinculoInvitacion)
        .filter(
            ClienteVinculoInvitacion.cliente_id == cliente_id,
            ClienteVinculoInvitacion.empresa_id == empresa_id,
            ClienteVinculoInvitacion.used_at.is_(None),
            ClienteVinculoInvitacion.expires_at > now,
        )
        .update({ClienteVinculoInvitacion.used_at: now}, synchronize_session=False)
    )
    db.commit()


def crear_invitacion(
    db: Session,
    *,
    cliente_id: int,
    empresa_id: int,
    token_hash: str,
    expires_at: datetime,
) -> ClienteVinculoInvitacion:
    row = ClienteVinculoInvitacion(
        cliente_id=cliente_id,
        empresa_id=empresa_id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def obtener_por_token_hash(db: Session, token_hash: str) -> ClienteVinculoInvitacion | None:
    return db.query(ClienteVinculoInvitacion).filter(ClienteVinculoInvitacion.token_hash == token_hash).first()


def marcar_usada(db: Session, inv: ClienteVinculoInvitacion) -> None:
    inv.used_at = datetime.utcnow()
    db.commit()
    db.refresh(inv)
