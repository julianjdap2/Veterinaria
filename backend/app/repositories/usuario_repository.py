"""
usuario_repository.py

Consultas de base de datos relacionadas
con usuarios.
"""

from sqlalchemy.orm import Session

from app.models.usuario import Usuario


def get_user_by_email(db: Session, email: str):

    return db.query(Usuario).filter(Usuario.email == email).first()