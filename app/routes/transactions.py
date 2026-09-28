from __future__ import annotations

from typing import Annotated, Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import ValidationError

from app.models.repository_protocol import TransactionRepository
from app.schemas.transaction import (
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate,
)
from app.services.finance import _to_transaction_response, validate_transaction_payload
from app.services.transactions_repo import get_default_repository


router = APIRouter(prefix="/api/transactions", tags=["transactions"])


def _repo() -> TransactionRepository:
    return get_default_repository()


RepoDep = Annotated[TransactionRepository, Depends(_repo)]


def _unpack_validation_error(exc: ValidationError) -> List[dict]:
    out = []
    for e in exc.errors():
        loc = ".".join(str(x) for x in e.get("loc", []))
        out.append({"field": loc or "payload", "message": e.get("msg", "Erro de validação")})
    return out


def _map_response(tx_dict) -> TransactionResponse:
    return _to_transaction_response(tx_dict)


@router.get("", response_model=List[TransactionResponse])
def list_transactions(
    repo: RepoDep,
    start_date: Optional[str] = Query(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    end_date: Optional[str] = Query(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    type: Optional[str] = Query(default=None),
    category: Optional[UUID] = Query(default=None),
    payment_method: Optional[str] = Query(default=None),
):
    try:
        rows = repo.list_transactions(
            start_date=start_date,
            end_date=end_date,
            type=type,
            category_id=category,
            payment_method=payment_method,
        )
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Falha ao listar lançamentos.",
            headers={"X-Error": str(exc.__class__.__name__)},
        )
    return [_map_response(r) for r in rows]


@router.get("/{tx_id}", response_model=TransactionResponse)
def get_transaction(tx_id: UUID, repo: RepoDep):
    row = repo.get_transaction(tx_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado.")
    return _map_response(row)


@router.post("", response_model=TransactionResponse, status_code=201)
def create_transaction(payload: dict, repo: RepoDep):
    # 1) Validação do schema via Pydantic
    try:
        parsed = TransactionCreate.model_validate(payload)
    except ValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail="Dados inválidos para criar lançamento.",
        ) from None
    # 2) Validação contra categorias do banco
    cats = repo.list_categories()
    biz = validate_transaction_payload(parsed.model_dump(), cats)
    if biz:
        raise HTTPException(
            status_code=422,
            detail="Erros de validação.",
        ) from None

    insertable = parsed.model_dump()
    try:
        created = repo.create_transaction(insertable)
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(
            status_code=500,
            detail=f"Falha ao salvar lançamento: {exc.__class__.__name__}",
        )
    return _map_response(created)


@router.put("/{tx_id}", response_model=TransactionResponse)
def update_transaction(tx_id: UUID, payload: dict, repo: RepoDep):
    existing = repo.get_transaction(tx_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado.")
    try:
        upd = TransactionUpdate.model_validate(payload)
    except ValidationError:
        raise HTTPException(status_code=422, detail="Dados inválidos.") from None

    merged = {**existing, **{k: v for k, v in upd.model_dump().items() if v is not None}}
    cats = repo.list_categories()
    biz = validate_transaction_payload(merged, cats)
    if biz:
        raise HTTPException(status_code=422, detail="Erros de validação.") from None

    try:
        updated = repo.update_transaction(tx_id, upd.model_dump(exclude_unset=True))
    except KeyError:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado.")
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(
            status_code=500,
            detail=f"Falha ao atualizar lançamento: {exc.__class__.__name__}",
        )
    return _map_response(updated)


@router.delete("/{tx_id}", status_code=204)
def delete_transaction(tx_id: UUID, repo: RepoDep):
    existing = repo.get_transaction(tx_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado.")
    try:
        repo.delete_transaction(tx_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado.")
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(
            status_code=500,
            detail=f"Falha ao excluir lançamento: {exc.__class__.__name__}",
        )
    return None
