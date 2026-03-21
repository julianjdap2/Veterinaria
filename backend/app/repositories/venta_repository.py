from datetime import datetime
from decimal import Decimal
from typing import List
from sqlalchemy.orm import Session, joinedload

from app.models.producto import Producto
from app.models.venta import Venta, VentaItem
from app.models.movimiento_stock import MovimientoStock
from app.models.empresa_configuracion import EmpresaConfiguracion
from app.models.consulta import Consulta
from app.models.mascota import Mascota


def _asignar_codigo_interno_venta(db: Session, empresa_id: int) -> str:
    """Reserva el siguiente consecutivo (fila empresa_configuraciones bloqueada)."""
    cfg = (
        db.query(EmpresaConfiguracion)
        .filter(EmpresaConfiguracion.empresa_id == empresa_id)
        .with_for_update()
        .first()
    )
    if not cfg:
        cfg = EmpresaConfiguracion(empresa_id=empresa_id)
        db.add(cfg)
        db.flush()

    pref = (cfg.venta_prefijo or "V-").strip() or "V-"
    pad = int(cfg.venta_numero_padding or 6)
    n = int(cfg.venta_siguiente_numero or 1)
    codigo = f"{pref}{n:0{pad}d}"
    cfg.venta_siguiente_numero = n + 1
    db.add(cfg)
    return codigo


def crear_venta(
    db: Session,
    empresa_id: int,
    usuario_id: int | None,
    cliente_id: int | None,
    consulta_id: int | None,
    metodo_pago: str,
    tipo_operacion: str,
    venta_origen_id: int | None,
    motivo_cyd: str | None,
    items: list[dict],
) -> Venta:
    """Crea la venta, items, descuenta stock y registra movimientos."""
    codigo = _asignar_codigo_interno_venta(db, empresa_id)
    venta = Venta(
        empresa_id=empresa_id,
        usuario_id=usuario_id,
        cliente_id=cliente_id,
        consulta_id=consulta_id,
        metodo_pago=metodo_pago,
        tipo_operacion=tipo_operacion,
        venta_origen_id=venta_origen_id,
        motivo_cyd=motivo_cyd,
        total=Decimal("0"),
        codigo_interno=codigo,
        # Evita filas con fecha NULL si el motor no devuelve server_default tras flush/refresh.
        fecha=datetime.now(),
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
        if tipo_operacion != "devolucion" and producto.stock_actual < cantidad:
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

        if tipo_operacion == "devolucion":
            producto.stock_actual += cantidad
            mov_tipo = "entrada"
            mov_obs = f"Devolucion #{venta.id}"
        else:
            producto.stock_actual -= cantidad
            mov_tipo = "salida"
            mov_obs = f"{tipo_operacion.capitalize()} #{venta.id}"
        mov = MovimientoStock(
            producto_id=producto.id,
            tipo=mov_tipo,
            cantidad=cantidad,
            venta_id=venta.id,
            observacion=mov_obs,
        )
        db.add(mov)

    venta.total = (total * Decimal("-1")) if tipo_operacion == "devolucion" else total
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


def obtener_venta_ampliada(db: Session, venta_id: int, empresa_id: int) -> Venta | None:
    return (
        db.query(Venta)
        .options(
            joinedload(Venta.items).joinedload(VentaItem.producto),
            joinedload(Venta.cliente),
            joinedload(Venta.consulta).joinedload(Consulta.mascota).joinedload(Mascota.cliente),
        )
        .filter(Venta.id == venta_id, Venta.empresa_id == empresa_id)
        .first()
    )
