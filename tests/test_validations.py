from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID

import pytest
from pydantic import ValidationError

from app.schemas.transaction import TransactionCreate, TransactionUpdate
from app.services.finance import validate_transaction_payload
from app.services.transactions_repo import InMemoryTransactionRepository


MORADIA_ID = UUID("00000000-0000-0000-0000-000000000014")
SALARIO_ID = UUID("00000000-0000-0000-0000-000000000001")


def _base() -> dict:
    return {
        "tipo": "DESPESA",
        "descricao": "Aluguel",
        "category_id": MORADIA_ID,
        "valor": Decimal("1.00"),
        "data": date.today(),
        "forma_pagamento": "PIX",
    }


def test_valor_zero_ou_negativo_rejeitado():
    """Valor <= 0 deve gerar erro de validação Pydantic."""
    b = _base()
    b["valor"] = Decimal("0")
    with pytest.raises(ValidationError):
        TransactionCreate.model_validate(b)

    b2 = _base()
    b2["valor"] = Decimal("-10.00")
    with pytest.raises(ValidationError):
        TransactionCreate.model_validate(b2)


def test_descricao_vazia_ou_so_espacos():
    b = _base()
    for bad in ("", "   ", "\t\n"):
        b["descricao"] = bad
        with pytest.raises(ValidationError):
            TransactionCreate.model_validate(b)


def test_tipo_invalido():
    b = _base()
    b["tipo"] = "GANHO"
    with pytest.raises(ValidationError):
        TransactionCreate.model_validate(b)


def test_forma_pagamento_invalida():
    b = _base()
    b["forma_pagamento"] = "CHEQUE"
    with pytest.raises(ValidationError):
        TransactionCreate.model_validate(b)


def test_validate_categoria_para_tipo_errado():
    """Validação de negócio: categoria RECEITA usada em tipo DESPESA → erro."""
    cats = InMemoryTransactionRepository().list_categories()
    payload = {
        "tipo": "DESPESA",
        "category_id": SALARIO_ID,  # Salário é RECEITA
        "descricao": "Aluguel",
        "valor": 1,
        "data": date.today(),
        "forma_pagamento": "PIX",
    }
    erros = validate_transaction_payload(payload, cats)
    assert len(erros) == 1
    assert erros[0].field == "category_id"

    # Mesmo tipo deve passar sem erros
    payload2 = {**payload, "category_id": MORADIA_ID}
    assert validate_transaction_payload(payload2, cats) == []


def test_cartao_credito_parcela_atual_maior_que_total():
    b = _base()
    b["forma_pagamento"] = "Cartão de crédito"
    b["qtd_parcelas"] = 2
    b["parcela_atual"] = 5
    with pytest.raises(ValidationError) as exc_info:
        TransactionCreate.model_validate(b)
    msgs = [e["msg"] for e in exc_info.value.errors()]
    assert any("parcela atual" in m.lower() for m in msgs)


def test_update_valida_valor_quando_informado():
    """TransactionUpdate deve validar valor apenas se ele for passado."""
    # sem valor → ok
    upd = TransactionUpdate.model_validate({"descricao": "novo nome"})
    assert upd.descricao == "novo nome"

    # com valor zero → erro
    with pytest.raises(ValidationError):
        TransactionUpdate.model_validate({"valor": Decimal("0")})
