"""
Productos (inventario): CRUD por empresa. Solo ADMIN y RECEPCIÓN.
"""

import io
from fastapi import APIRouter, Depends, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.security.dependencies import get_current_user
from app.security.roles import require_roles
from app.security.admin_permissions import require_admin_permission
from app.security.feature_flags import require_feature
from app.schemas.producto_schema import (
    ProductoCreate,
    ProductoUpdate,
    ProductoResponse,
    ProductosListResponse,
)
from app.schemas.categoria_producto_schema import CategoriaProductoResponse, CategoriaProductoCreate
from app.services.producto_service import (
    listar_productos_service,
    obtener_producto_service,
    crear_producto_service,
    actualizar_producto_service,
)
from app.services.carga_masiva_productos_service import cargar_productos_desde_csv
from app.repositories.categoria_producto_repository import listar_categorias, crear_categoria

router = APIRouter(prefix="/productos", tags=["Productos"])

# ADMIN=1, VET=2, RECEPCION=3
_recep_admin = require_roles(1, 3)
_lectura_productos = require_roles(1, 2, 3)  # todos los roles pueden listar/ver productos (ej. para ventas)


@router.get("/categorias", response_model=list[CategoriaProductoResponse])
def listar_categorias_producto(
    db: Session = Depends(get_db),
    current_user=Depends(_recep_admin),
    _perm=Depends(require_admin_permission("admin_gestion_inventario")),
):
    """Lista categorías de productos de la empresa (para selector al crear/editar producto)."""
    return listar_categorias(db, current_user.empresa_id)


@router.post("/categorias", response_model=CategoriaProductoResponse, status_code=201)
def crear_categoria_producto(
    payload: CategoriaProductoCreate,
    db: Session = Depends(get_db),
    current_user=Depends(_recep_admin),
    _perm=Depends(require_admin_permission("admin_gestion_inventario")),
):
    """Crea una categoría de productos (ej. Medicamento, Insumo, Alimento)."""
    return crear_categoria(db, current_user.empresa_id, payload.nombre.strip())


@router.get("", response_model=ProductosListResponse)
def listar_productos(
    db: Session = Depends(get_db),
    current_user=Depends(_lectura_productos),
    _feature=Depends(require_feature("modulo_inventario")),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    search: str | None = None,
    categoria_id: int | None = None,
    incluir_inactivos: bool = False,
):
    """Lista productos de la empresa (paginado). Filtro por categoría y búsqueda por nombre, EAN, código, fabricante."""
    items, total = listar_productos_service(
        db=db,
        empresa_id=current_user.empresa_id,
        activo_only=not incluir_inactivos,
        page=page,
        page_size=page_size,
        search=search,
        categoria_id=categoria_id,
    )
    return ProductosListResponse(
        items=[ProductoResponse.model_validate(p) for p in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/plantilla-csv")
def descargar_plantilla_csv(
    current_user=Depends(_recep_admin),
    _perm=Depends(require_admin_permission("admin_gestion_inventario")),
    _perm_bulk=Depends(require_admin_permission("admin_carga_masiva_inventario")),
    _feature=Depends(require_feature("modulo_inventario")),
):
    """Devuelve un CSV de ejemplo para carga masiva. Columnas: nombre, cod_articulo, ean, fabricante, presentacion, tipo, unidad, precio, stock_inicial, stock_minimo, categoria."""
    headers = "nombre,cod_articulo,ean,fabricante,presentacion,tipo,unidad,precio,stock_inicial,stock_minimo,categoria\n"
    ejemplo = "Paracetamol 500mg,PAR500,7501234567890,Genérico,500mg x 30 comp,medicamento,unidad,5.50,100,10,Medicamento\n"
    content = headers + ejemplo
    return StreamingResponse(
        io.BytesIO(content.encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=plantilla_inventario.csv"},
    )


@router.post("/carga-masiva")
def carga_masiva_productos(
    archivo: UploadFile,
    db: Session = Depends(get_db),
    current_user=Depends(_recep_admin),
    _perm=Depends(require_admin_permission("admin_gestion_inventario")),
    _perm_bulk=Depends(require_admin_permission("admin_carga_masiva_inventario")),
    _feature=Depends(require_feature("modulo_inventario")),
):
    """Carga productos desde un CSV. La primera fila debe ser encabezado. Nombre obligatorio por fila."""
    if not archivo.filename or not (archivo.filename.lower().endswith(".csv") or "csv" in (archivo.content_type or "")):
        return {"creados": 0, "errores": [{"fila": 0, "mensaje": "El archivo debe ser CSV"}]}
    contenido = archivo.file.read()
    creados, errores = cargar_productos_desde_csv(db, current_user.empresa_id, contenido)
    return {"creados": creados, "errores": errores}


@router.get("/{producto_id}", response_model=ProductoResponse)
def obtener_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(_lectura_productos),
    _feature=Depends(require_feature("modulo_inventario")),
):
    return obtener_producto_service(
        db=db,
        producto_id=producto_id,
        empresa_id=current_user.empresa_id,
    )


@router.post("", response_model=ProductoResponse, status_code=201)
def crear_producto(
    payload: ProductoCreate,
    db: Session = Depends(get_db),
    current_user=Depends(_recep_admin),
    _perm=Depends(require_admin_permission("admin_gestion_inventario")),
    _feature=Depends(require_feature("modulo_inventario")),
):
    return crear_producto_service(
        db=db,
        empresa_id=current_user.empresa_id,
        datos=payload.model_dump(),
    )


@router.patch("/{producto_id}", response_model=ProductoResponse)
def actualizar_producto(
    producto_id: int,
    payload: ProductoUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(_recep_admin),
    _perm=Depends(require_admin_permission("admin_gestion_inventario")),
    _feature=Depends(require_feature("modulo_inventario")),
):
    datos = payload.model_dump(exclude_unset=True)
    return actualizar_producto_service(
        db=db,
        producto_id=producto_id,
        empresa_id=current_user.empresa_id,
        datos=datos,
    )
