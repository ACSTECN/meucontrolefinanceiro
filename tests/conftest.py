from __future__ import annotations

import os
from datetime import date
from decimal import Decimal
from typing import Any, Dict
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

# Garante que o fallback seja usado sempre (mesmo que o usuário tenha .env)
os.environ.pop("SUPABASE_URL", None)
os.environ.pop("SUPABASE_SERVICE_ROLE_KEY", None)


from app.services.transactions_repo import (
    InMemoryTransactionRepository,
    get_default_repository,
)
from app.models.repository_protocol import TransactionRepository
from api.index import app


SALARIO_ID = UUID("00000000-0000-0000-0000-000000000001")
ALIMENTACAO_ID = UUID("00000000-0000-0000-0000-000000000011")
MORADIA_ID = UUID("00000000-0000-0000-0000-000000000014")


def _sample_transactions() -> list[dict[str, Any]]:
    return [
        {
            "id": UUID("11111111-1111-1111-1111-111111111111"),
            "tipo": "RECEITA",
            "descricao": "Salário setembro",
            "category_id": SALARIO_ID,
            "valor": Decimal("5000.00"),
            "data": date(2026, 9, 5),
            "forma_pagamento": "Transferência",
            "observacao": "CLT",
        },
        {
            "id": UUID("22222222-2222-2222-2222-222222222222"),
            "tipo": "DESPESA",
            "descricao": "Aluguel setembro",
            "category_id": MORADIA_ID,
            "valor": Decimal("1500.00"),
            "data": date(2026, 9, 10),
            "forma_pagamento": "PIX",
        },
        {
            "id": UUID("33333333-3333-3333-3333-333333333333"),
            "tipo": "DESPESA",
            "descricao": "Supermercado",
            "category_id": ALIMENTACAO_ID,
            "valor": Decimal("700.00"),
            "data": date(2026, 9, 15),
            "forma_pagamento": "Cartão de crédito",
            "cartao_nome": "Nubank",
            "qtd_parcelas": 3,
            "parcela_atual": 1,
        },
        # Fora do período de setembro
        {
            "id": UUID("44444444-4444-4444-4444-444444444444"),
            "tipo": "DESPESA",
            "descricao": "Aluguel agosto",
            "category_id": MORADIA_ID,
            "valor": Decimal("1500.00"),
            "data": date(2026, 8, 10),
            "forma_pagamento": "PIX",
        },
        {
            "id": UUID("55555555-5555-5555-5555-555555555555"),
            "tipo": "DESPESA",
            "descricao": "Restaurante",
            "category_id": ALIMENTACAO_ID,
            "valor": Decimal("120.00"),
            "data": date(2026, 9, 20),
            "forma_pagamento": "Débito",
        },
    ]


@pytest.fixture()
def in_memory_repo() -> InMemoryTransactionRepository:
    repo = InMemoryTransactionRepository()
    for tx in _sample_transactions():
        repo.create_transaction(tx)
    return repo


@pytest.fixture()
def sample_transactions() -> list[dict[str, Any]]:
    return _sample_transactions()


@pytest.fixture()
def sample_categories() -> list[dict[str, Any]]:
    # mesmas sementes do InMemory
    return InMemoryTransactionRepository().list_categories()


@pytest.fixture()
def client(in_memory_repo: InMemoryTransactionRepository) -> TestClient:
    # Override da dependência padrão para usar nosso InMemory populado
    import app.routes.categories as cats_rt
    import app.routes.dashboard as dash_rt
    import app.routes.transactions as tx_rt

    original_cats = cats_rt._repo
    original_dash = dash_rt._repo
    original_tx = tx_rt._repo

    def _inj() -> TransactionRepository:
        return in_memory_repo  # type: ignore[return-value]

    cats_rt._repo = _inj  # type: ignore[assignment]
    dash_rt._repo = _inj  # type: ignore[assignment]
    tx_rt._repo = _inj  # type: ignore[assignment]

    # Também sobrescreve get_default_repository global por segurança
    from app.services import transactions_repo as tr

    tr._fallback_repo = in_memory_repo  # type: ignore[assignment]

    with TestClient(app) as c:
        yield c

    # restaura
    cats_rt._repo = original_cats
    dash_rt._repo = original_dash
    tx_rt._repo = original_tx
