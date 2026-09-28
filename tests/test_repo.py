from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID, uuid4

import pytest

from app.services.transactions_repo import InMemoryTransactionRepository


MORADIA_ID = UUID("00000000-0000-0000-0000-000000000014")
SALARIO_ID = UUID("00000000-0000-0000-0000-000000000001")


def test_create_and_list(in_memory_repo: InMemoryTransactionRepository):
    """Testa criação de um lançamento e recuperação."""
    tx_id = uuid4()
    payload = {
        "id": tx_id,
        "tipo": "RECEITA",
        "descricao": "Freelance site",
        "category_id": SALARIO_ID,
        "valor": Decimal("1200.00"),
        "data": date(2026, 9, 22),
        "forma_pagamento": "PIX",
        "observacao": "Projeto X",
    }
    created = in_memory_repo.create_transaction(payload)
    assert created["id"] == tx_id
    assert created["categoria_nome"] == "Salário"  # nome correto da FK do seed

    all_txs = in_memory_repo.list_transactions()
    assert any(str(t["id"]) == str(tx_id) for t in all_txs)


def test_update_transaction(in_memory_repo: InMemoryTransactionRepository):
    """Testa atualização de valor e descrição."""
    existing = in_memory_repo.list_transactions()[0]
    tx_id = existing["id"]
    updated = in_memory_repo.update_transaction(
        tx_id,
        {
            "descricao": "Atualizada",
            "valor": Decimal("9999.99"),
        },
    )
    assert updated["descricao"] == "Atualizada"
    assert Decimal(str(updated["valor"])) == Decimal("9999.99")
    # outros campos permanecem
    assert updated["tipo"] == existing["tipo"]


def test_delete_existing_and_missing(in_memory_repo: InMemoryTransactionRepository):
    """Exclusão de ID existente funciona; ID inexistente levanta KeyError."""
    first = in_memory_repo.list_transactions()[0]
    tx_id = first["id"]
    in_memory_repo.delete_transaction(tx_id)
    assert in_memory_repo.get_transaction(tx_id) is None

    with pytest.raises(KeyError):
        in_memory_repo.delete_transaction(uuid4())


def test_list_filters(in_memory_repo: InMemoryTransactionRepository):
    """Filtros por período, tipo e forma de pagamento combinam corretamente."""
    sept = in_memory_repo.list_transactions(
        start_date="2026-09-01", end_date="2026-09-30"
    )
    # Seed do conftest: 5 lançamentos, 4 em setembro
    assert len(sept) == 4

    # Tipo DESPESA + setembro → 3 (Aluguel, Supermercado, Restaurante)
    despesas = in_memory_repo.list_transactions(
        start_date="2026-09-01",
        end_date="2026-09-30",
        type="DESPESA",
    )
    assert len(despesas) == 3

    # Forma de pagamento PIX em setembro → 1 (Aluguel)
    pix = in_memory_repo.list_transactions(
        start_date="2026-09-01",
        end_date="2026-09-30",
        payment_method="PIX",
    )
    assert len(pix) == 1
    assert pix[0]["forma_pagamento"] == "PIX"
