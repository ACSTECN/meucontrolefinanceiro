from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any, Dict, Iterable, List, Optional, Tuple, TYPE_CHECKING

from app.schemas.transaction import (
    BreakdownItem,
    DashboardResponse,
    SeriesPoint,
    TransactionResponse,
    TransactionType,
)

if TYPE_CHECKING:  # pragma: no cover
    from uuid import UUID

_ZERO = Decimal("0.00")
_Q = Decimal("0.01")


def _q(d: Decimal) -> Decimal:
    return d.quantize(_Q, rounding=ROUND_HALF_UP)


def _to_decimal(v) -> Decimal:
    if isinstance(v, Decimal):
        return _q(v)
    try:
        return _q(Decimal(str(v)))
    except (InvalidOperation, TypeError):
        return _ZERO


def _parse_iso_date(s: str) -> date:
    return date.fromisoformat(s)


@dataclass
class ValidationErrorItem:
    field: str
    message: str


def validate_transaction_payload(
    payload: Dict[str, Any],
    categories: Iterable[Dict[str, Any]],
) -> List[ValidationErrorItem]:
    """Valida payload (create/update) contra lista de categorias.
    NÃO substitui os validadores do Pydantic — apenas regras de negócio que
    dependem do banco (ex.: categoria existir e ser do mesmo tipo)."""

    errors: List[ValidationErrorItem] = []

    cats_by_id: Dict[str, Dict[str, Any]] = {str(c["id"]): c for c in categories}
    tipo = payload.get("tipo")

    cat_id = payload.get("category_id")
    if cat_id is not None:
        cat = cats_by_id.get(str(cat_id))
        if not cat:
            errors.append(
                ValidationErrorItem("category_id", "Categoria não encontrada.")
            )
        else:
            if tipo is not None and cat["tipo"] != tipo:
                errors.append(
                    ValidationErrorItem(
                        "category_id",
                        f"Categoria '{cat['nome']}' é do tipo "
                        f"{cat['tipo']} e não pode ser usada com tipo {tipo}.",
                    )
                )
    return errors


def apply_date_filters(
    transactions: Iterable[Dict[str, Any]],
    *,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> List[Dict[str, Any]]:
    start = _parse_iso_date(start_date) if start_date else None
    end = _parse_iso_date(end_date) if end_date else None
    out: List[Dict[str, Any]] = []
    for t in transactions:
        d = t["data"]
        if isinstance(d, date):
            dt = d
        else:
            dt = _parse_iso_date(str(d))
        if start and dt < start:
            continue
        if end and dt > end:
            continue
        out.append(t)
    return out


def _to_transaction_response(t: Dict[str, Any]) -> TransactionResponse:
    from datetime import datetime

    def _ts(v):
        if isinstance(v, datetime):
            return v
        return datetime.fromisoformat(str(v).replace("Z", "+00:00"))

    return TransactionResponse(
        id=t["id"],
        tipo=t["tipo"],
        descricao=t["descricao"],
        category_id=t["category_id"],
        categoria_nome=t.get("categoria_nome") or t.get("category", {}).get("nome") if isinstance(t.get("category"), dict) else None,
        valor=_to_decimal(t["valor"]),
        data=t["data"] if isinstance(t["data"], date) else _parse_iso_date(str(t["data"])),
        forma_pagamento=t["forma_pagamento"],
        cartao_nome=t.get("cartao_nome"),
        qtd_parcelas=t.get("qtd_parcelas"),
        parcela_atual=t.get("parcela_atual"),
        observacao=t.get("observacao"),
        created_at=_ts(t.get("created_at") or datetime.now().isoformat()),
        updated_at=_ts(t.get("updated_at") or datetime.now().isoformat()),
    )


def calculate_dashboard(
    transactions: Iterable[Dict[str, Any]],
    *,
    categories: Optional[Iterable[Dict[str, Any]]] = None,
) -> DashboardResponse:
    """Calcula métricas do dashboard de uma lista já filtrada.

    Recebe dicionários do tipo Transaction (com pelo menos: id, tipo, descricao,
    valor, data, forma_pagamento, category_id, categoria_nome ou categoria).
    """

    income = _ZERO
    expenses = _ZERO
    count = 0
    maior_rec: Optional[Decimal] = None
    maior_rec_desc: Optional[str] = None
    maior_des: Optional[Decimal] = None
    maior_des_desc: Optional[str] = None

    inc_by_cat: Dict[str, Decimal] = defaultdict(lambda: _ZERO)
    exp_by_cat: Dict[str, Decimal] = defaultdict(lambda: _ZERO)
    exp_by_pag: Dict[str, Decimal] = defaultdict(lambda: _ZERO)

    series_daily: Dict[str, Tuple[Decimal, Decimal]] = {}

    rows: List[TransactionResponse] = []
    now_default = datetime.now().astimezone()

    cat_names: Dict[str, str] = {}
    if categories:
        for c in categories:
            cat_names[str(c["id"])] = c["nome"]

    for t in transactions:
        tipo = t["tipo"]
        valor = _to_decimal(t["valor"])
        cat_id = str(t["category_id"])
        categoria_nome = (
            t.get("categoria_nome")
            or (
                t.get("category", {}).get("nome")
                if isinstance(t.get("category"), dict)
                else None
            )
            or cat_names.get(cat_id)
            or "Sem categoria"
        )
        data_obj = (
            t["data"] if isinstance(t["data"], date) else _parse_iso_date(str(t["data"]))
        )
        data_key = data_obj.isoformat()
        count += 1

        if tipo == TransactionType.INCOME.value:
            income += valor
            inc_by_cat[categoria_nome] += valor
            if maior_rec is None or valor > maior_rec:
                maior_rec = valor
                maior_rec_desc = t["descricao"]
            inc_daily = series_daily.get(data_key, (_ZERO, _ZERO))[0]
            exp_daily = series_daily.get(data_key, (_ZERO, _ZERO))[1]
            series_daily[data_key] = (inc_daily + valor, exp_daily)
        elif tipo == TransactionType.EXPENSE.value:
            expenses += valor
            exp_by_cat[categoria_nome] += valor
            exp_by_pag[t["forma_pagamento"]] += valor
            if maior_des is None or valor > maior_des:
                maior_des = valor
                maior_des_desc = t["descricao"]
            inc_daily = series_daily.get(data_key, (_ZERO, _ZERO))[0]
            exp_daily = series_daily.get(data_key, (_ZERO, _ZERO))[1]
            series_daily[data_key] = (inc_daily, exp_daily + valor)

        rows.append(
            TransactionResponse(
                **{
                    **{k: v for k, v in t.items() if k not in ("categoria_nome", "valor", "data", "created_at", "updated_at")},
                    "valor": valor,
                    "data": data_obj,
                    "categoria_nome": categoria_nome,
                    "created_at": t.get("created_at") or now_default,
                    "updated_at": t.get("updated_at") or now_default,
                }
            )
        )

    income = _q(income)
    expenses = _q(expenses)
    balance = _q(income - expenses)

    def _items(d: Dict[str, Decimal]) -> List[BreakdownItem]:
        return [
            BreakdownItem(name=k, total=_q(v))
            for k, v in sorted(d.items(), key=lambda kv: (-kv[1], kv[0]))
            if v > 0
        ]

    sorted_series: List[SeriesPoint] = []
    for k in sorted(series_daily.keys()):
        i, e = series_daily[k]
        sorted_series.append(SeriesPoint(label=k, income=_q(i), expenses=_q(e)))

    rows.sort(key=lambda r: (r.data, r.created_at), reverse=True)
    ultimas = rows[:10]

    return DashboardResponse(
        income=income,
        expenses=expenses,
        balance=balance,
        transaction_count=count,
        maior_receita=_q(maior_rec) if maior_rec is not None else None,
        maior_receita_descricao=maior_rec_desc,
        maior_despesa=_q(maior_des) if maior_des is not None else None,
        maior_despesa_descricao=maior_des_desc,
        income_by_category=_items(inc_by_cat),
        expenses_by_category=_items(exp_by_cat),
        expenses_by_payment_method=_items(exp_by_pag),
        series=sorted_series,
        ultimas_movimentacoes=ultimas,
    )
