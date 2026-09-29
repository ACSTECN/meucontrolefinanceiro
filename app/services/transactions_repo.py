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
    """Implementação do repositório usando HTTP REST direto no Supabase
    (httpx). NÃO DEPENDE da biblioteca supabase-py para queries, evitando
    AttributeErrors de API inconsistente entre v1/v2 (ex:
    'SyncQueryRequestBuilder has no attribute select')."""

    def __init__(self, cfg: Any) -> None:
        # cfg é o dataclass SupabaseRestConfig
        self._rest_url = cfg.rest_url.rstrip("/")
        self._service_key = cfg.service_role_key
        self._headers = {
            "apikey": self._service_key,
            "Authorization": f"Bearer {self._service_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        # Usa httpx stateless (sem sessão/Client persistente) — melhor p/ serverless,
        # evita conexões presas e "carregando infinito" na Vercel Lambda.
        import httpx
        self._httpx = httpx
        self._timeout = 5.0

    @staticmethod
    def _jsonable(v: Any) -> Any:
        import datetime as _dt
        from decimal import Decimal
        if isinstance(v, UUID):
            return str(v)
        if isinstance(v, Decimal):
            return float(v)
        if isinstance(v, _dt.datetime):
            return v.isoformat()
        if isinstance(v, _dt.date):
            return v.isoformat()
        if isinstance(v, dict):
            return {str(k): SupabaseTransactionRepository._jsonable(x) for k, x in v.items()}
        if isinstance(v, (list, tuple, set)):
            return [SupabaseTransactionRepository._jsonable(x) for x in v]
        return v

    def _get(self, path: str, params: Any = None) -> Any:
        try:
            r = self._httpx.get(
                f"{self._rest_url}{path}",
                headers=self._headers,
                params=params or {},
                timeout=self._timeout,
            )
        except self._httpx.TimeoutException as exc:
            raise RuntimeError(f"Supabase GET {path} timeout 5s excedido") from exc
        except Exception as exc:
            raise RuntimeError(f"Supabase GET {path} falhou ({exc.__class__.__name__})") from exc
        if r.status_code >= 400:
            raise RuntimeError(f"Supabase GET {path} {r.status_code}: {r.text[:200]}")
        try:
            return r.json()
        except Exception:
            return []

    def _post(self, path: str, json_body: Any, extra_headers: Optional[Dict[str, str]] = None) -> Any:
        import json as _json
        h = dict(self._headers)
        if extra_headers:
            h.update(extra_headers)
        payload = self._jsonable(json_body)
        content = _json.dumps(payload, ensure_ascii=False).encode("utf-8")
        try:
            r = self._httpx.post(
                f"{self._rest_url}{path}",
                headers=h,
                content=content,
                timeout=self._timeout,
            )
        except self._httpx.TimeoutException as exc:
            raise RuntimeError(f"Supabase POST {path} timeout 5s excedido") from exc
        except Exception as exc:
            raise RuntimeError(f"Supabase POST {path} falhou ({exc.__class__.__name__})") from exc
        if r.status_code >= 400:
            raise RuntimeError(f"Supabase POST {path} {r.status_code}: {r.text[:200]}")
        try:
            return r.json()
        except Exception:
            return r.text

    def _patch(self, path: str, json_body: Any, params: Any = None) -> Any:
        import json as _json
        payload = self._jsonable(json_body)
        content = _json.dumps(payload, ensure_ascii=False).encode("utf-8")
        try:
            r = self._httpx.patch(
                f"{self._rest_url}{path}",
                headers=self._headers,
                params=params or {},
                content=content,
                timeout=self._timeout,
            )
        except self._httpx.TimeoutException as exc:
            raise RuntimeError(f"Supabase PATCH {path} timeout 5s excedido") from exc
        except Exception as exc:
            raise RuntimeError(f"Supabase PATCH {path} falhou ({exc.__class__.__name__})") from exc
        if r.status_code >= 400:
            raise RuntimeError(f"Supabase PATCH {path} {r.status_code}: {r.text[:200]}")
        try:
            return r.json()
        except Exception:
            return []

    def _delete(self, path: str, params: Any = None) -> int:
        try:
            r = self._httpx.delete(
                f"{self._rest_url}{path}",
                headers=self._headers,
                params=params or {},
                timeout=self._timeout,
            )
        except self._httpx.TimeoutException as exc:
            raise RuntimeError(f"Supabase DELETE {path} timeout 5s excedido") from exc
        except Exception as exc:
            raise RuntimeError(f"Supabase DELETE {path} falhou ({exc.__class__.__name__})") from exc
        if r.status_code >= 400:
            raise RuntimeError(f"Supabase DELETE {path} {r.status_code}: {r.text[:200]}")
        return r.status_code

    @staticmethod
    def _attach_cat(row: Dict[str, Any]) -> Dict[str, Any]:
        if isinstance(row.get("category"), dict):
            row["categoria_nome"] = row["category"].get("nome")
        return row

    # ---- Categories ----
    def list_categories(self) -> List[Dict[str, Any]]:
        rows = self._get(
            "/categories",
            params={"select": "*", "order": "tipo.asc,nome.asc"},
        )
        return [dict(r) for r in (rows or [])]

    def get_category(self, cat_id: UUID) -> Optional[Dict[str, Any]]:
        rows = self._get(
            "/categories",
            params={"select": "*", "id": f"eq.{cat_id}"},
        )
        return dict(rows[0]) if rows else None

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
        # Usa sempre lista de tuplas para params (permite múltiplos valores
        # para mesma chave, ex: data=gte.X&data=lte.Y em range de datas).
        params_list: List[Tuple[str, str]] = [
            ("select", "*,category:categories(nome)"),
            ("order", "data.desc,created_at.desc"),
        ]
        if type:
            params_list.append(("tipo", f"eq.{type}"))
        if category_id:
            params_list.append(("category_id", f"eq.{category_id}"))
        if payment_method:
            params_list.append(("forma_pagamento", f"eq.{payment_method}"))
        if start_date:
            params_list.append(("data", f"gte.{start_date}"))
        if end_date:
            params_list.append(("data", f"lte.{end_date}"))
        try:
            r = self._httpx.get(
                f"{self._rest_url}/transactions",
                headers=self._headers,
                params=params_list,
                timeout=self._timeout,
            )
        except self._httpx.TimeoutException as exc:
            raise RuntimeError("Supabase GET /transactions timeout 5s excedido") from exc
        except Exception as exc:
            raise RuntimeError(f"Supabase GET /transactions falhou ({exc.__class__.__name__})") from exc
        if r.status_code >= 400:
            raise RuntimeError(f"Supabase GET /transactions {r.status_code}: {r.text[:200]}")
        try:
            data = r.json() or []
        except Exception:
            data = []
        return [self._attach_cat(dict(x)) for x in data]

    def get_transaction(self, tx_id: UUID) -> Optional[Dict[str, Any]]:
        rows = self._get(
            "/transactions",
            params={
                "select": "*,category:categories(nome)",
                "id": f"eq.{tx_id}",
            },
        )
        if not rows:
            return None
        d = dict(rows[0])
        return self._attach_cat(d)

    def create_transaction(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        # Remove None; o resto (date, Decimal, UUID, datetime) é convertido
        # automaticamente por _jsonable() dentro de _post().
        insertable = {k: v for k, v in payload.items() if v is not None}
        rows = self._post(
            "/transactions",
            json_body=[insertable],
            extra_headers={
                "Prefer": "return=representation",
                "Accept": "application/json",
            },
        )
        if isinstance(rows, list):
            if not rows:
                raise RuntimeError("Supabase insert não retornou a linha criada")
            row = dict(rows[0])
        else:
            row = dict(rows or {})
        if "id" in row:
            full = self.get_transaction(UUID(str(row["id"])))
            if full:
                return full
        return self._attach_cat(row)

    def update_transaction(
        self, tx_id: UUID, payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        updatable = {k: v for k, v in payload.items() if v is not None}
        self._patch(
            "/transactions",
            json_body=updatable,
            params={"id": f"eq.{tx_id}"},
        )
        full = self.get_transaction(tx_id)
        if not full:
            raise KeyError(f"Transaction {tx_id} not found")
        return full

    def delete_transaction(self, tx_id: UUID) -> None:
        existing = self.get_transaction(tx_id)
        if existing is None:
            raise KeyError(f"Transaction {tx_id} not found")
        self._delete("/transactions", params={"id": f"eq.{tx_id}"})


# Instância global de fallback (in-memory) para quando Supabase não está
# disponível. Em testes ou no app, ela pode ser sobrescrita via overrides.
_fallback_repo: Optional[InMemoryTransactionRepository] = None


def get_default_repository() -> TransactionRepository:
    global _fallback_repo
    from app.database.supabase_client import get_supabase_rest_config

    cfg = get_supabase_rest_config()
    if cfg is not None:
        # Usa REST httpx direto — nunca mais dá erro de atributo da lib supabase
        try:
            return SupabaseTransactionRepository(cfg)  # type: ignore[return-value]
        except Exception:
            # Se a inicialização (httpx import) falhar por qualquer motivo, cai no in-memory
            pass
    if _fallback_repo is None:
        _fallback_repo = InMemoryTransactionRepository(transactions=_demo_transactions())
    return _fallback_repo  # type: ignore[return-value]
