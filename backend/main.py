"""
main.py

Archivo principal del backend.
"""

from fastapi import FastAPI
from app.middleware.audit_middleware import AuditMiddleware
from app.database.database import engine, Base

# Importar modelos
from app.models import Rol, Usuario, Cliente, Mascota

from app.controllers.mascota_controller import router as mascota_router

from app.controllers.auth_controller import router as auth_router

from app.routers import usuarios_router

from app.routers import clientes_router

from app.routers import mascotas_router





# Crear tablas en la base de datos
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Veterinary Management System",
    version="1.0.0"
)

app.add_middleware(AuditMiddleware)

app.include_router(mascota_router)
app.include_router(auth_router)
app.include_router(usuarios_router.router)
app.include_router(clientes_router.router)
app.include_router(mascotas_router.router)

@app.get("/")
def root():

    return {
        "message": "Veterinary System API funcionando correctamente"
    }