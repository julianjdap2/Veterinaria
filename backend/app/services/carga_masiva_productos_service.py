"""
Carga masiva de productos desde CSV.
Columnas esperadas: nombre, cod_articulo, ean, fabricante, presentacion, tipo, unidad, precio, stock_inicial, stock_minimo, categoria
La primera fila debe ser el encabezado. 'nombre' es obligatorio.
"""

import csv
import io
from typing import Any

from sqlalchemy.orm import Session

from app.repositories.categoria_producto_repository import (
    obtener_categoria_por_nombre,
    crear_categoria,
)
from app.repositories.producto_repository import crear_producto
from app.models.movimiento_stock import MovimientoStock

COLUMNAS = [
    "nombre",
    "cod_articulo",
    "ean",
    "fabricante",
    "presentacion",
    "tipo",
    "unidad",
    "precio",
    "stock_inicial",
    "stock_minimo",
    "categoria",
]


def _normalize_row(row: dict[str, str]) -> dict[str, Any]:
    """Convierte valores de string a tipos correctos."""
    out = {}
    for k, v in row.items():
        k = k.strip().lower() if k else ""
        v = (v or "").strip()
        if k == "nombre":
            out["nombre"] = v or None
        elif k == "cod_articulo":
            out["cod_articulo"] = v or None
        elif k == "ean":
            out["ean"] = v or None
        elif k == "fabricante":
            out["fabricante"] = v or None
        elif k == "presentacion":
            out["presentacion"] = v or None
        elif k == "tipo":
            out["tipo"] = v or None
        elif k == "unidad":
            out["unidad"] = v or None
        elif k == "precio":
            try:
                out["precio"] = float(v) if v else None
            except ValueError:
                out["precio"] = None
        elif k == "stock_inicial":
            try:
                out["stock_inicial"] = int(v) if v else 0
            except ValueError:
                out["stock_inicial"] = 0
        elif k == "stock_minimo":
            try:
                out["stock_minimo"] = int(v) if v else 0
            except ValueError:
                out["stock_minimo"] = 0
        elif k == "categoria":
            out["categoria_nombre"] = v or None
    return out


def cargar_productos_desde_csv(
    db: Session,
    empresa_id: int,
    contenido: bytes | str,
) -> tuple[int, list[dict]]:
    """
    Parsea el CSV y crea productos. Devuelve (cantidad_creados, lista_errores).
    errores: [{ "fila": int, "mensaje": str }]
    """
    if isinstance(contenido, bytes):
        contenido = contenido.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(contenido), delimiter=",", skipinitialspace=True)
    creados = 0
    errores: list[dict] = []
    categorias_cache: dict[str, int] = {}

    for idx, row in enumerate(reader, start=2):
        fila_num = idx
        norm = _normalize_row(row)
        nombre = norm.get("nombre")
        if not nombre:
            errores.append({"fila": fila_num, "mensaje": "Nombre obligatorio"})
            continue

        categoria_id = None
        cat_nombre = norm.get("categoria_nombre")
        if cat_nombre:
            if cat_nombre in categorias_cache:
                categoria_id = categorias_cache[cat_nombre]
            else:
                cat = obtener_categoria_por_nombre(db, empresa_id, cat_nombre)
                if cat:
                    categoria_id = cat.id
                    categorias_cache[cat_nombre] = cat.id
                else:
                    nueva = crear_categoria(db, empresa_id, cat_nombre)
                    categoria_id = nueva.id
                    categorias_cache[cat_nombre] = nueva.id

        datos = {
            "nombre": nombre,
            "categoria_id": categoria_id,
            "cod_articulo": norm.get("cod_articulo"),
            "ean": norm.get("ean"),
            "fabricante": norm.get("fabricante"),
            "presentacion": norm.get("presentacion"),
            "tipo": norm.get("tipo"),
            "unidad": norm.get("unidad"),
            "precio": norm.get("precio"),
            "stock_minimo": norm.get("stock_minimo", 0) or 0,
            "activo": True,
            "stock_inicial": norm.get("stock_inicial", 0) or 0,
        }
        try:
            p = crear_producto(db, empresa_id, datos)
            if datos.get("stock_inicial", 0) > 0:
                mov = MovimientoStock(
                    producto_id=p.id,
                    tipo="entrada",
                    cantidad=datos["stock_inicial"],
                    observacion="Carga masiva CSV",
                )
                db.add(mov)
                db.commit()
                db.refresh(p)
            creados += 1
        except Exception as e:
            db.rollback()
            errores.append({"fila": fila_num, "mensaje": str(e)})

    return creados, errores
