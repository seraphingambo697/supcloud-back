# services/auth/service.py
"""
Logique métier du service Auth.
"""

import uuid

from fastapi import HTTPException, status
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
