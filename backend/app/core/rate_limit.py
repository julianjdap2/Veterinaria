"""
rate_limit.py

Limitador de tasa por IP (slowapi). Uso típico:
- Login: fuerza bruta.
- Búsqueda por documento (identidad): enumeración de documentos.
- Endpoints públicos: abuso de ancho de banda.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
