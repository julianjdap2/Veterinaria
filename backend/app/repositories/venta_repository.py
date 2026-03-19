from decimal import Decimal
from typing import List
from sqlalchemy.orm import Session, joinedload

from app.models.producto import Producto
from app.models.venta import Venta, VentaItem
from app.models.movimiento_stock import MovimientoStock


def crear_venta(
    db: Session,
    empresa_id: int,
    usuario_id: int | None,
    cliente_id: int | None,
    consulta_id: int | None,
    items: list[dict],
) -> Venta:
    """Crea la venta, items, descuenta stock y registra movimientos."""
    venta = Venta(
        empresa_id=empresa_id,
        usuario_id=usuario_id,
        cliente_id=cliente_id,
        consulta_id=consulta_id,
        total=Decimal("0"),
    )
    db.add(venta)
    db.flush()

    total = Decimal("0")
    for it in items:
        producto = (
            db.query(Producto)
            .filter(Producto.id == it["producto_id"], Producto.empresa_id == empresa_id)
            .first()
        )
        if not producto:
            raise ValueError(f"Producto {it['producto_id']} no encontrado")
        cantidad = it["cantidad"]
        if producto.stock_actual < cantidad:
            raise ValueError(
                f"Stock insuficiente para {producto.nombre}: tiene {producto.stock_actual}, se piden {cantidad}"
            )
        precio = it.get("precio_unitario") if it.get("precio_unitario") is not None else producto.precio
        if precio is None:
            precio = Decimal("0")
        precio = Decimal(str(precio))
        subtotal = precio * cantidad
        total += subtotal

        item = VentaItem(
            venta_id=venta.id,
            producto_id=producto.id,
            cantidad=cantidad,
            precio_unitario=precio,
        )
        db.add(item)

        producto.stock_actual -= cantidad
        mov = MovimientoStock(
            producto_id=producto.id,
            tipo="salida",
            cantidad=cantidad,
            venta_id=venta.id,
            observacion=f"Venta #{venta.id}",
        )
        db.add(mov)

    venta.total = total
    db.commit()
    db.refresh(venta)
    return venta


def listar_ventas(
    db: Session,
    empresa_id: int,
    page: int = 1,
    page_size: int = 20,
    consulta_id: int | None = None,
) -> tuple[List[Venta], int]:
    q = db.query(Venta).options(joinedload(Venta.items)).filter(Venta.empresa_id == empresa_id)
    if consulta_id is not None:
        q = q.filter(Venta.consulta_id == consulta_id)
    total = q.count()
    items = q.order_by(Venta.fecha.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def obtener_venta(db: Session, venta_id: int, empresa_id: int) -> Venta | None:
    return (
        db.query(Venta)
        .options(joinedload(Venta.items))
        .filter(Venta.id == venta_id, Venta.empresa_id == empresa_id)
        .first()
    )
