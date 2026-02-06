"""
Routers package - exports all API routers
"""

from routers.auth import router as auth_router
from routers.users import router as users_router
from routers.transactions import router as transactions_router
from routers.alerts import router as alerts_router

__all__ = [
    "auth_router",
    "users_router",
    "transactions_router",
    "alerts_router"
]
