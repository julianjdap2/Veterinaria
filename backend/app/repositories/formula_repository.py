from typing import List
from sqlalchemy.orm import Session, joinedload

from app.models.formula_item import FormulaItem
from app.models.consulta import Consulta
from app.models.cita import Cita
from app.models.mascota import Mascota


def listar_por_consulta(db: Session, consulta_id: int, empresa_id: int) -> List[FormulaItem]:
    """Lista ítems de fórmula de una consulta (verificando empresa vía mascota)."""
    return (
        db.query(FormulaItem)
        .options(joinedload(FormulaItem.producto))
        .join(Consulta, FormulaItem.consulta_id == Consulta.id)
        .join(Mascota, Consulta.mascota_id == Mascota.id)
        .filter(
            FormulaItem.consulta_id == consulta_id,
            FormulaItem.consulta_id.isnot(None),
            Mascota.empresa_id == empresa_id,
        )
        .order_by(FormulaItem.id)
        .all()
    )


def listar_por_cita(db: Session, cita_id: int, empresa_id: int) -> List[FormulaItem]:
    """Lista ítems de prescripción de una cita (medicamentos a recetar; empresa vía mascota)."""
    return (
        db.query(FormulaItem)
        .options(joinedload(FormulaItem.producto))
        .join(Cita, FormulaItem.cita_id == Cita.id)
        .join(Mascota, Cita.mascota_id == Mascota.id)
        .filter(
            FormulaItem.cita_id == cita_id,
            FormulaItem.cita_id.isnot(None),
            Mascota.empresa_id == empresa_id,
        )
        .order_by(FormulaItem.id)
        .all()
    )


def crear_item(
    db: Session,
    consulta_id: int,
    empresa_id: int,
    datos: dict,
) -> FormulaItem | None:
    """Crea un ítem de fórmula; verifica que la consulta pertenezca a la empresa."""
    from app.repositories.consulta_repository import obtener_consulta_por_id
    consulta = obtener_consulta_por_id(db, consulta_id, empresa_id)
    if not consulta:
        return None
    item = FormulaItem(consulta_id=consulta_id, cita_id=None, **datos)
    db.add(item)
    db.commit()
    db.refresh(item)
    item = db.query(FormulaItem).options(joinedload(FormulaItem.producto)).filter(FormulaItem.id == item.id).first()
    return item


def crear_item_cita(
    db: Session,
    cita_id: int,
    empresa_id: int,
    datos: dict,
) -> FormulaItem | None:
    """Crea un ítem de prescripción en la cita; verifica que la cita pertenezca a la empresa."""
    from app.repositories.cita_repository import obtener_cita_por_id_y_empresa
    cita = obtener_cita_por_id_y_empresa(db, cita_id, empresa_id)
    if not cita:
        return None
    item = FormulaItem(cita_id=cita_id, consulta_id=None, **datos)
    db.add(item)
    db.commit()
    db.refresh(item)
    item = db.query(FormulaItem).options(joinedload(FormulaItem.producto)).filter(FormulaItem.id == item.id).first()
    return item


def eliminar_item(
    db: Session,
    item_id: int,
    empresa_id: int,
) -> bool:
    """Elimina un ítem de fórmula si pertenece a una consulta de la empresa."""
    item = (
        db.query(FormulaItem)
        .join(Consulta, FormulaItem.consulta_id == Consulta.id)
        .join(Mascota, Consulta.mascota_id == Mascota.id)
        .filter(FormulaItem.id == item_id, FormulaItem.consulta_id.isnot(None), Mascota.empresa_id == empresa_id)
        .first()
    )
    if not item:
        return False
    db.delete(item)
    db.commit()
    return True


def eliminar_item_cita(db: Session, item_id: int, empresa_id: int) -> bool:
    """Elimina un ítem de prescripción de una cita si pertenece a la empresa."""
    item = (
        db.query(FormulaItem)
        .join(Cita, FormulaItem.cita_id == Cita.id)
        .join(Mascota, Cita.mascota_id == Mascota.id)
        .filter(FormulaItem.id == item_id, FormulaItem.cita_id.isnot(None), Mascota.empresa_id == empresa_id)
        .first()
    )
    if not item:
        return False
    db.delete(item)
    db.commit()
    return True


def copy_cita_formula_to_consulta(
    db: Session,
    cita_id: int,
    consulta_id: int,
    empresa_id: int,
) -> None:
    """Copia los ítems de prescripción de la cita a la fórmula de la consulta (al crear consulta desde cita)."""
    items = listar_por_cita(db, cita_id, empresa_id)
    for it in items:
        nuevo = FormulaItem(
            consulta_id=consulta_id,
            cita_id=None,
            producto_id=it.producto_id,
            presentacion=it.presentacion,
            precio=it.precio,
            observacion=it.observacion,
            cantidad=it.cantidad,
        )
        db.add(nuevo)
    db.commit()


def obtener_item(db: Session, item_id: int, empresa_id: int) -> FormulaItem | None:
    return (
        db.query(FormulaItem)
        .join(Consulta, FormulaItem.consulta_id == Consulta.id)
        .join(Mascota, Consulta.mascota_id == Mascota.id)
        .filter(FormulaItem.id == item_id, Mascota.empresa_id == empresa_id)
        .first()
    )
