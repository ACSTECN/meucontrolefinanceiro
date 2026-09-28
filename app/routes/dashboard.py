from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query

from app.models.repository_protocol import TransactionRepository
from app.schemas.transaction import DashboardResponse
from app.services.finance import calculate_dashboard
from app.services.transactions_repo import get_default_repository


router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _repo() -> TransactionRepository:
    return get_default_repository()


RepoDep = Annotated[TransactionRepository, Depends(_repo)]


@router.get("", response_model=DashboardResponse)
def dashboard(
    repo: RepoDep,
    start_date: Optional[str] = Query(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    end_date: Optional[str] = Query(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    type: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    payment_method: Optional[str] = Query(default=None),
):
    rows = repo.list_transactions(
        start_date=start_date,
        end_date=end_date,
        type=type,
        category_id=category,
        payment_method=payment_method,
    )
    cats = repo.list_categories()
    return calculate_dashboard(rows, categories=cats)
