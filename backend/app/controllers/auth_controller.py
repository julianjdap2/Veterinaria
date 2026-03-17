"""
auth_controller.py

Endpoints relacionados con autenticación.
"""

from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session

from app.database.database import get_db

from app.schemas.auth_schema import LoginRequest, TokenResponse

from app.services.auth_service import login_user


router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):

    token = login_user(db, data.email, data.password)

    if not token:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    return {"access_token": token}