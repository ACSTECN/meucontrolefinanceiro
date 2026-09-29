from __future__ import annotations

from datetime import datetime, date as _date
from typing import Any, Dict, Iterable, List, Optional
from uuid import UUID, uuid4

from app.models.repository_protocol import TransactionRepository

_CATEGORIES_SEED: List[Dict[str, Any]] = [
    {
        "id": UUID("00000000-0000-0000-0000-000000000001"),
        "tipo": "RECEITA",
        "nome": "Salário",
        "slug": "salario",
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000002"),
        "tipo": "RECEITA",
        "nome": "Freelance",
        "slug": "freelance",
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000003"),
        "tipo": "RECEITA",
        "nome": "Venda",
        "slug": "venda",
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000004"),
        "tipo": "RECEITA",
        "nome": "Reembolso",
        "slug": "reembolso",
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000005"),
        "tipo": "RECEITA",
        "nome": "Outras receitas",
        "slug": "outras-receitas",
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000011"),
        "tipo": "DESPESA",
        "nome": "Alimentação",
        "slug": "alimentacao",
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000012"),
        "tipo": "DESPESA",
        "nome": "Mercado",
        "slug": "mercado",
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000013"),
        "tipo": "DESPESA",
        "nome": "Transporte",
        "slug": "transporte",
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000014"),
        "tipo": "DESPESA",
        "nome": "Moradia",
        "slug": "moradia",
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000015"),
        "tipo": "DESPESA",
        "nome": "Saúde",
        "slug": "saude",
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000016"),
        "tipo": "DESPESA",
        "nome": "Academia",
        "slug": "academia",
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000017"),
        "tipo": "DESPESA",
        "nome": "Lazer",
        "slug": "lazer",
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000018"),
        "tipo": "DESPESA",
        "nome": "Assinaturas",
        "slug": "assinaturas",
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000019"),
        "tipo": "DESPESA",
        "nome": "Compras",
        "slug": "compras",
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000020"),
        "tipo": "DESPESA",
        "nome": "Educação",
        "slug": "educacao",
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000021"),
        "tipo": "DESPESA",
        "nome": "Impostos",
        "slug": "impostos",
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000022"),
        "tipo": "DESPESA",
        "nome": "Outros",
        "slug": "outros",
    },
]


def _ts_now_iso() -> str:
    return datetime.now().astimezone().isoformat()


def _demo_transactions() -> List[Dict[str, Any]]:
    """Lançamentos de exemplo para fallback em memória (modo local). Mostra
    dados no dashboard mesmo sem Supabase configurado. Não é usado em
    ambiente de teste (testes sempre passam fixtures explícitas)."""
    today = _date.today()
    y, m = today.year, today.month

    def iso(d: int) -> str:
        return f"{y:04d}-{m:02d}-{d:02d}"

    def catid(slug: str) -> Optional[UUID]:
        for c in _CATEGORIES_SEED:
            if c["slug"] == slug:
                return c["id"]
        return None

    samples = [
        {
            "tipo": "RECEITA",
            "descricao": "Salário",
            "category_id": catid("salario"),
            "valor": "7500.00",
            "data": iso(5),
            "forma_pagamento": "PIX",
            "observacao": "Salário mensal",
        },
        {
            "tipo": "RECEITA",
            "descricao": "Freelance de site",
            "category_id": catid("freelance"),
            "valor": "1800.00",
            "data": iso(12),
            "forma_pagamento": "Transferência",
            "observacao": "Projeto landing page",
        },
        {
            "tipo": "DESPESA",
            "descricao": "Aluguel + condomínio",
            "category_id": catid("moradia"),
            "valor": "2200.00",
            "data": iso(8),
            "forma_pagamento": "Boleto",
            "observacao": "",
        },
        {
            "tipo": "DESPESA",
            "descricao": "Supermercado semanal",
            "category_id": catid("mercado"),
            "valor": "860.90",
            "data": iso(14),
            "forma_pagamento": "Cartão de crédito",
            "cartao_nome": "Nubank Ultravioleta",
            "qtd_parcelas": 1,
            "parcela_atual": 1,
            "observacao": "Compras do mês",
        },
        {
            "tipo": "DESPESA",
            "descricao": "Restaurante com a família",
            "category_id": catid("alimentacao"),
            "valor": "258.50",
            "data": iso(16),
            "forma_pagamento": "PIX",
            "observacao": "Almoço sábado",
        },
        {
            "tipo": "DESPESA",
            "descricao": "Uber / transporte",
            "category_id": catid("transporte"),
            "valor": "132.40",
            "data": iso(18),
            "forma_pagamento": "Débito",
            "observacao": "Corridas da semana",
        },
        {
            "tipo": "DESPESA",
            "descricao": "Mensalidade academia",
            "category_id": catid("academia"),
            "valor": "129.90",
            "data": iso(3),
            "forma_pagamento": "Cartão de crédito",
            "cartao_nome": "Nubank Ultravioleta",
            "qtd_parcelas": 1,
            "parcela_atual": 1,
            "observacao": "",
        },
        {
            "tipo": "DESPESA",
            "descricao": "Netflix / Spotify",
            "category_id": catid("assinaturas"),
            "valor": "74.80",
            "data": iso(1),
            "forma_pagamento": "Cartão de crédito",
            "cartao_nome": "Nubank Ultravioleta",
            "qtd_parcelas": 1,
            "parcela_atual": 1,
            "observacao": "Assinaturas mensais",
        },
    ]
    out: List[Dict[str, Any]] = []
    for idx, s in enumerate(samples):
        out.append(
            {
                "id": UUID(f"99999999-9999-9999-9999-99999999999{idx}"),
                "created_at": _ts_now_iso(),
                "updated_at": _ts_now_iso(),
                **s,
            }
        )
    return out


class InMemoryTransactionRepository:
    """Implementação em memória do repositório, usada em testes e como
    fallback quando o Supabase não está configurado."""

    def __init__(
        self,
        categories: Optional[Iterable[Dict[str, Any]]] = None,
        transactions: Optional[Iterable[Dict[str, Any]]] = None,
    ) -> None:
        self._categories: Dict[UUID, Dict[str, Any]] = {
            c["id"]: dict(c) for c in (categories or _CATEGORIES_SEED)
        }
        self._transactions: Dict[UUID, Dict[str, Any]] = {}
        for t in transactions or []:
            t2 = dict(t)
            t2["id"] = t2.get("id") or uuid4()
            t2["created_at"] = t2.get("created_at") or _ts_now_iso()
            t2["updated_at"] = t2.get("updated_at") or _ts_now_iso()
            self._transactions[t2["id"]] = t2

    # ---- Categories ----
    def list_categories(self) -> List[Dict[str, Any]]:
        return [dict(c) for c in self._categories.values()]

    def get_category(self, cat_id: UUID) -> Optional[Dict[str, Any]]:
        c = self._categories.get(cat_id)
        return dict(c) if c else None

    # ---- Transactions ----
    def list_transactions(
        self,
        *,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        type: Optional[str] = None,
        category_id: Optional[UUID] = None,
        payment_method: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        from datetime import date as _date

        rows: List[Dict[str, Any]] = []
        for t in self._transactions.values():
            if type and t["tipo"] != type:
                continue
            if category_id and t["category_id"] != category_id:
                continue
            if payment_method and t["forma_pagamento"] != payment_method:
                continue
            d = t["data"]
            if isinstance(d, _date):
                dt = d
            else:
                dt = _date.fromisoformat(str(d))
            if start_date and dt < _date.fromisoformat(start_date):
                continue
            if end_date and dt > _date.fromisoformat(end_date):
                continue
            cat = self._categories.get(UUID(str(t["category_id"])))
            row = dict(t)
            row["categoria_nome"] = cat["nome"] if cat else None
            rows.append(row)
        rows.sort(key=lambda r: (str(r["data"]), str(r.get("created_at", ""))), reverse=True)
        return rows

    def get_transaction(self, tx_id: UUID) -> Optional[Dict[str, Any]]:
        t = self._transactions.get(tx_id)
        if not t:
            return None
        row = dict(t)
        cat = self._categories.get(UUID(str(row["category_id"])))
        row["categoria_nome"] = cat["nome"] if cat else None
        return row

    def create_transaction(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        now = _ts_now_iso()
        tx_id = payload.get("id") or uuid4()
        if isinstance(tx_id, str):
            tx_id = UUID(tx_id)
        row = dict(payload)
        row["id"] = tx_id
        row["created_at"] = now
        row["updated_at"] = now
        self._transactions[tx_id] = row
        return self.get_transaction(tx_id)  # type: ignore[return-value]

    def update_transaction(
        self, tx_id: UUID, payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        existing = self._transactions.get(tx_id)
        if not existing:
            raise KeyError(f"Transaction {tx_id} not found")
        merged = {**existing, **{k: v for k, v in payload.items() if v is not None}}
        merged["id"] = tx_id
        merged["updated_at"] = _ts_now_iso()
        self._transactions[tx_id] = merged
        return self.get_transaction(tx_id)  # type: ignore[return-value]

    def delete_transaction(self, tx_id: UUID) -> None:
        if tx_id not in self._transactions:
            raise KeyError(f"Transaction {tx_id} not found")
        del self._transactions[tx_id]


class SupabaseTransactionRepository:
    """Implementação do repositório usando supabase-py (service_role)."""

    def __init__(self, client) -> None:
        self._client = client

    # ---- Categories ----
    def list_categories(self) -> List[Dict[str, Any]]:
        r = (
            self._client.table("categories")
            .select("*")
            .order("tipo", desc=False)
            .order("nome", desc=False)
            .execute()
        )
        return list(r.data or [])

    def get_category(self, cat_id: UUID) -> Optional[Dict[str, Any]]:
        r = (
            self._client.table("categories")
            .select("*")
            .eq("id", str(cat_id))
            .maybe_single()
            .execute()
        )
        return r.data or None

    # ---- Transactions ----
    def list_transactions(
        self,
        *,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        type: Optional[str] = None,
        category_id: Optional[UUID] = None,
        payment_method: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        q = (
            self._client.table("transactions")
            .select("*, category:categories(nome)")
            .order("data", desc=True)
            .order("created_at", desc=True)
        )
        if type:
            q = q.eq("tipo", type)
        if category_id:
            q = q.eq("category_id", str(category_id))
        if payment_method:
            q = q.eq("forma_pagamento", payment_method)
        if start_date:
            q = q.gte("data", start_date)
        if end_date:
            q = q.lte("data", end_date)
        data = q.execute().data or []
        flat: List[Dict[str, Any]] = []
        for r in data:
            d = dict(r)
            if isinstance(d.get("category"), dict):
                d["categoria_nome"] = d["category"].get("nome")
            flat.append(d)
        return flat

    def get_transaction(self, tx_id: UUID) -> Optional[Dict[str, Any]]:
        r = (
            self._client.table("transactions")
            .select("*, category:categories(nome)")
            .eq("id", str(tx_id))
            .maybe_single()
            .execute()
        )
        row = r.data
        if not row:
            return None
        d = dict(row)
        if isinstance(d.get("category"), dict):
            d["categoria_nome"] = d["category"].get("nome")
        return d

    def create_transaction(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        insertable = {
            k: (str(v) if isinstance(v, UUID) else v)
            for k, v in payload.items()
            if v is not None
        }
        r = (
            self._client.table("transactions")
            .insert(insertable)
            .select("*, category:categories(nome)")
            .single()
            .execute()
        )
        row = dict(r.data)
        if isinstance(row.get("category"), dict):
            row["categoria_nome"] = row["category"].get("nome")
        return row

    def update_transaction(
        self, tx_id: UUID, payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        updatable = {
            k: (str(v) if isinstance(v, UUID) else v)
            for k, v in payload.items()
            if v is not None
        }
        r = (
            self._client.table("transactions")
            .update(updatable)
            .eq("id", str(tx_id))
            .select("*, category:categories(nome)")
            .maybe_single()
            .execute()
        )
        row = r.data
        if not row:
            raise KeyError(f"Transaction {tx_id} not found")
        d = dict(row)
        if isinstance(d.get("category"), dict):
            d["categoria_nome"] = d["category"].get("nome")
        return d

    def delete_transaction(self, tx_id: UUID) -> None:
        r = (
            self._client.table("transactions")
            .delete()
            .eq("id", str(tx_id))
            .execute()
        )
        status = getattr(r, "status_code", None)
        if status == 406 or (status is None and not (getattr(r, "data", None) is None)):
            # Tentamos buscar para confirmar se ainda existe (status 200 sem rows deletadas → KeyError)
            existing = self.get_transaction(tx_id)
            if existing is not None:
                raise KeyError(f"Transaction {tx_id} not found")


# Instância global de fallback (in-memory) para quando Supabase não está
# disponível. Em testes ou no app, ela pode ser sobrescrita via overrides.
_fallback_repo: Optional[InMemoryTransactionRepository] = None


def get_default_repository() -> TransactionRepository:
    global _fallback_repo
    from app.database.supabase_client import get_supabase

    sb = get_supabase()
    if sb is not None:
        return SupabaseTransactionRepository(sb)  # type: ignore[return-value]
    if _fallback_repo is None:
        _fallback_repo = InMemoryTransactionRepository(transactions=_demo_transactions())
    return _fallback_repo  # type: ignore[return-value]
