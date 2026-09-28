from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID, uuid4

from fastapi.testclient import TestClient


SALARIO_ID = UUID("00000000-0000-0000-0000-000000000001")
ALIMENTACAO_ID = UUID("00000000-0000-0000-0000-000000000011")
MORADIA_ID = UUID("00000000-0000-0000-0000-000000000014")


def test_healthz(client: TestClient):
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json() == {"ok": True}


def test_home_renders(client: TestClient):
    r = client.get("/")
    assert r.status_code == 200
    assert "Meu Controle Financeiro" in r.text


def test_categories_endpoint(client: TestClient):
    r = client.get("/api/categories")
    assert r.status_code == 200
    data = r.json()
    assert "RECEITA" in data and "DESPESA" in data
    receitas = [c["nome"] for c in data["RECEITA"]]
    # Valores mínimos obrigatórios do seed
    for nome in ["Salário", "Freelance", "Venda", "Reembolso", "Outras receitas"]:
        assert nome in receitas
    despesas = [c["nome"] for c in data["DESPESA"]]
    for nome in ["Alimentação", "Mercado", "Transporte", "Moradia", "Saúde",
                 "Academia", "Lazer", "Assinaturas", "Compras", "Educação",
                 "Impostos", "Outros"]:
        assert nome in despesas


def test_post_cria_lancamento_201(client: TestClient):
    payload = {
        "tipo": "RECEITA",
        "descricao": "Venda notebook",
        "category_id": str(SALARIO_ID),  # categoria de receita seedada
        "valor": 1.50,
        "data": "2026-09-25",
        "forma_pagamento": "PIX",
    }
    r = client.post("/api/transactions", json=payload)
    assert r.status_code == 201, r.json()
    body = r.json()
    assert body["descricao"] == "Venda notebook"
    assert Decimal(str(body["valor"])) == Decimal("1.50")
    assert body["id"] is not None


def test_post_valor_zero_retorna_422(client: TestClient):
    payload = {
        "tipo": "RECEITA",
        "descricao": "Deve falhar",
        "category_id": str(SALARIO_ID),
        "valor": 0,
        "data": "2026-09-25",
        "forma_pagamento": "PIX",
    }
    r = client.post("/api/transactions", json=payload)
    assert r.status_code == 422


def test_post_descricao_vazia_retorna_422(client: TestClient):
    payload = {
        "tipo": "RECEITA",
        "descricao": "    ",
        "category_id": str(SALARIO_ID),
        "valor": 100,
        "data": "2026-09-25",
        "forma_pagamento": "PIX",
    }
    r = client.post("/api/transactions", json=payload)
    assert r.status_code == 422


def test_post_tipo_invalido_retorna_422(client: TestClient):
    payload = {
        "tipo": "INVESTIMENTO",
        "descricao": "Tipo errado",
        "category_id": str(SALARIO_ID),
        "valor": 100,
        "data": "2026-09-25",
        "forma_pagamento": "PIX",
    }
    r = client.post("/api/transactions", json=payload)
    assert r.status_code == 422


def test_dashboard_balance(client: TestClient):
    """Dashboard calcula corretamente income, expenses, balance no mês de setembro."""
    r = client.get("/api/dashboard?start_date=2026-09-01&end_date=2026-09-30")
    assert r.status_code == 200, r.json()
    j = r.json()
    # Receitas setembro: 5000; Despesas setembro: 1500 + 700 + 120 = 2320
    assert Decimal(str(j["income"])) == Decimal("5000.00")
    assert Decimal(str(j["expenses"])) == Decimal("2320.00")
    assert Decimal(str(j["balance"])) == Decimal("2680.00")
    assert j["transaction_count"] == 4
    # Breakdowns
    assert isinstance(j["expenses_by_category"], list)
    assert isinstance(j["ultimas_movimentacoes"], list)
    assert len(j["ultimas_movimentacoes"]) <= 10


def test_put_and_delete_flow(client: TestClient):
    """Cria → atualiza → deleta; confirma que get retorna 404 após exclusão."""
    payload = {
        "tipo": "DESPESA",
        "descricao": "Academia",
        "category_id": str(UUID("00000000-0000-0000-0000-000000000016")),  # Academia
        "valor": 120.00,
        "data": "2026-09-12",
        "forma_pagamento": "Débito",
    }
    created = client.post("/api/transactions", json=payload)
    assert created.status_code == 201
    tx_id = created.json()["id"]

    # Atualiza
    upd = client.put(
        f"/api/transactions/{tx_id}",
        json={"descricao": "Academia atualizada", "valor": "140.00"},
    )
    assert upd.status_code == 200
    body = upd.json()
    assert body["descricao"] == "Academia atualizada"
    assert Decimal(str(body["valor"])) == Decimal("140.00")

    # Busca individual
    single = client.get(f"/api/transactions/{tx_id}")
    assert single.status_code == 200
    assert single.json()["descricao"] == "Academia atualizada"

    # Exclui
    deleted = client.delete(f"/api/transactions/{tx_id}")
    assert deleted.status_code == 204

    # Busca após exclusão → 404
    after = client.get(f"/api/transactions/{tx_id}")
    assert after.status_code == 404

    # Excluir novamente → 404
    r2 = client.delete(f"/api/transactions/{tx_id}")
    assert r2.status_code == 404


def test_delete_missing_returns_404(client: TestClient):
    r = client.delete(f"/api/transactions/{uuid4()}")
    assert r.status_code == 404
