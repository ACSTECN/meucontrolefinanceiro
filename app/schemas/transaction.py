from __future__ import annotations

import enum
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


class TransactionType(str, enum.Enum):
    INCOME = "RECEITA"
    EXPENSE = "DESPESA"


class PaymentMethod(str, enum.Enum):
    PIX = "PIX"
    DINHEIRO = "Dinheiro"
    DEBITO = "Débito"
    CREDITO = "Cartão de crédito"
    TRANSFERENCIA = "Transferência"
    BOLETO = "Boleto"
    OUTRO = "Outro"


PAYMENT_METHODS_CREDITO = {PaymentMethod.CREDITO, PaymentMethod.CREDITO.value}


class CategorySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tipo: str
    nome: str
    slug: str
    created_at: Optional[datetime] = None


_TRANSACTION_DESCRIPTION = "Descrição não pode ser vazia"


def _to_decimal(v) -> Optional[Decimal]:
    if v is None:
        return None
    if isinstance(v, Decimal):
        return v
    try:
        d = Decimal(str(v))
    except Exception as exc:
        raise ValueError(f"Valor inválido: {v}") from exc
    return d.quantize(Decimal("0.01"))


class TransactionCreate(BaseModel):
    tipo: str
    descricao: str
    category_id: UUID
    valor: Decimal
    data: date
    forma_pagamento: str
    cartao_nome: Optional[str] = None
    qtd_parcelas: Optional[int] = Field(None, ge=1)
    parcela_atual: Optional[int] = Field(None, ge=1)
    observacao: Optional[str] = None

    @field_validator("descricao")
    @classmethod
    def _descricao_nao_vazia(cls, v: str) -> str:
        if not isinstance(v, str) or not v.strip():
            raise ValueError(_TRANSACTION_DESCRIPTION)
        return v.strip()

    @field_validator("tipo")
    @classmethod
    def _tipo_valido(cls, v: str) -> str:
        if v not in (TransactionType.INCOME.value, TransactionType.EXPENSE.value):
            raise ValueError(
                "Tipo inválido. Use RECEITA ou DESPESA."
            )
        return v

    @field_validator("valor")
    @classmethod
    def _valor_positivo(cls, v) -> Decimal:
        d = _to_decimal(v)
        if d is None:
            raise ValueError("Valor é obrigatório")
        if d <= Decimal("0"):
            raise ValueError("Valor deve ser maior que zero")
        return d

    @field_validator("forma_pagamento")
    @classmethod
    def _forma_pagamento_valida(cls, v: str) -> str:
        valid = {m.value for m in PaymentMethod}
        if v not in valid:
            raise ValueError(
                f"Forma de pagamento inválida. Válidas: {sorted(valid)}"
            )
        return v

    @field_validator("qtd_parcelas", "parcela_atual", mode="before")
    @classmethod
    def _coerce_int(cls, v):
        if v is None or v == "":
            return None
        try:
            return int(v)
        except Exception as exc:
            raise ValueError("Valor numérico inválido") from exc

    @model_validator(mode="after")
    def _cartao_check(self) -> "TransactionCreate":
        eh_credito = self.forma_pagamento == PaymentMethod.CREDITO.value
        if eh_credito:
            if self.qtd_parcelas is None:
                self.qtd_parcelas = 1
            if self.parcela_atual is None:
                self.parcela_atual = 1
            if self.parcela_atual > self.qtd_parcelas:
                raise ValueError(
                    "Parcela atual não pode ser maior que a quantidade de parcelas"
                )
        return self


class TransactionUpdate(BaseModel):
    tipo: Optional[str] = None
    descricao: Optional[str] = None
    category_id: Optional[UUID] = None
    valor: Optional[Decimal] = None
    data: Optional[date] = None
    forma_pagamento: Optional[str] = None
    cartao_nome: Optional[str] = None
    qtd_parcelas: Optional[int] = Field(None, ge=1)
    parcela_atual: Optional[int] = Field(None, ge=1)
    observacao: Optional[str] = None

    @field_validator("descricao")
    @classmethod
    def _descricao_nao_vazia(cls, v):
        if v is None:
            return v
        if not isinstance(v, str) or not v.strip():
            raise ValueError(_TRANSACTION_DESCRIPTION)
        return v.strip()

    @field_validator("tipo")
    @classmethod
    def _tipo_valido(cls, v):
        if v is None:
            return v
        if v not in (TransactionType.INCOME.value, TransactionType.EXPENSE.value):
            raise ValueError("Tipo inválido. Use RECEITA ou DESPESA.")
        return v

    @field_validator("valor")
    @classmethod
    def _valor_positivo(cls, v):
        if v is None:
            return v
        d = _to_decimal(v)
        if d is None:
            return None
        if d <= Decimal("0"):
            raise ValueError("Valor deve ser maior que zero")
        return d

    @field_validator("forma_pagamento")
    @classmethod
    def _forma_pagamento_valida(cls, v):
        if v is None:
            return v
        valid = {m.value for m in PaymentMethod}
        if v not in valid:
            raise ValueError(f"Forma de pagamento inválida. Válidas: {sorted(valid)}")
        return v

    @field_validator("qtd_parcelas", "parcela_atual", mode="before")
    @classmethod
    def _coerce_int(cls, v):
        if v is None or v == "":
            return None
        try:
            return int(v)
        except Exception as exc:
            raise ValueError("Valor numérico inválido") from exc


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tipo: str
    descricao: str
    category_id: UUID
    categoria_nome: Optional[str] = None
    valor: Decimal
    data: date
    forma_pagamento: str
    cartao_nome: Optional[str] = None
    qtd_parcelas: Optional[int] = None
    parcela_atual: Optional[int] = None
    observacao: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class BreakdownItem(BaseModel):
    name: str
    total: Decimal


class SeriesPoint(BaseModel):
    label: str
    income: Decimal
    expenses: Decimal


class DashboardResponse(BaseModel):
    income: Decimal
    expenses: Decimal
    balance: Decimal
    transaction_count: int
    maior_receita: Optional[Decimal] = None
    maior_receita_descricao: Optional[str] = None
    maior_despesa: Optional[Decimal] = None
    maior_despesa_descricao: Optional[str] = None
    income_by_category: List[BreakdownItem]
    expenses_by_category: List[BreakdownItem]
    expenses_by_payment_method: List[BreakdownItem]
    series: List[SeriesPoint]
    ultimas_movimentacoes: List[TransactionResponse]
