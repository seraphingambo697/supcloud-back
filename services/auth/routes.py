# services/auth/routes.py
"""
Routes FastAPI du service Auth.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
