from sqlalchemy.orm import Session

from app.repositories.cliente_repository import crear_cliente


def crear_cliente_service(db: Session, data: dict, empresa_id: int):

    data["empresa_id"] = empresa_id

    cliente = crear_cliente(db, data)

    return cliente