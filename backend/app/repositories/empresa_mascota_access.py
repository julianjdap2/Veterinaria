"""
Patrones de join: acceso a mascotas por vínculo propietario–clínica (no por mascota.empresa_id).
"""

from sqlalchemy import and_
from sqlalchemy.orm import Query

from app.models.cliente import Cliente
from app.models.cliente_empresa_vinculo import ClienteEmpresaVinculo
from app.models.mascota import Mascota

from app.repositories.vinculo_repository import ESTADO_ACTIVO


def join_mascota_accesible_por_empresa(query: Query, empresa_id: int) -> Query:
    """
    La consulta debe partir de un modelo que ya tenga join con Mascota
    (p. ej. query(Mascota) o query(Cita).join(Mascota)).
    """
    return (
        query.join(Cliente, Mascota.cliente_id == Cliente.id)
        .join(
            ClienteEmpresaVinculo,
            and_(
                ClienteEmpresaVinculo.cliente_id == Cliente.id,
                ClienteEmpresaVinculo.empresa_id == empresa_id,
                ClienteEmpresaVinculo.estado == ESTADO_ACTIVO,
            ),
        )
    )
