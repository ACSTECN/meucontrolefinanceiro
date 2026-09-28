from __future__ import annotations

from typing import Annotated, Dict, List

from fastapi import APIRouter, Depends

from app.models.repository_protocol import TransactionRepository
from app.schemas.transaction import CategorySchema
from app.services.transactions_repo import get_default_repository


router = APIRouter(prefix="/api/categories", tags=["categories"])


def _repo() -> TransactionRepository:
    return get_default_repository()


RepoDep = Annotated[TransactionRepository, Depends(_repo)]


@router.get("", response_model=Dict[str, List[CategorySchema]])
def list_categories(repo: RepoDep):
    all_cats = repo.list_categories()
    result: Dict[str, List[CategorySchema]] = {
        "RECEITA": [],
        "DESPESA": [],
    }
    for c in all_cats:
        try:
            schema = CategorySchema.model_validate(c)
        except Exception:
            continue
        if schema.tipo in result:
            result[schema.tipo].append(schema)
    for key in result:
        result[key].sort(key=lambda x: x.nome)
    return result
