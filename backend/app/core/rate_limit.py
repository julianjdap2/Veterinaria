"""
rate_limit.py

Limitador de tasa por IP (slowapi). Se usa en endpoints públicos
como login para mitigar fuerza bruta.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
