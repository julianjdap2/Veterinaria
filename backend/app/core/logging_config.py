"""
logging_config.py

Configuración de logging para la aplicación.
Reemplaza uso de print en auditoría, notificaciones y middleware.
"""

import logging
import sys

LOG_FORMAT = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"


def setup_logging(level: str = "INFO") -> None:
    """Configura el root logger con formato y nivel."""
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format=LOG_FORMAT,
        handlers=[logging.StreamHandler(sys.stdout)],
    )


def get_logger(name: str) -> logging.Logger:
    """Devuelve un logger con el nombre del módulo."""
    return logging.getLogger(name)
