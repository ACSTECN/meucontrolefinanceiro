from __future__ import annotations

from decimal import Decimal

from app.services.finance import apply_date_filters, calculate_dashboard


def test_calculate_dashboard_balance(sample_transactions, sample_categories):
    filtered = apply_date_filters(
        sample_transactions,
        start_date="2026-09-01",
        end_date="2026-09-30",
    )
    dash = calculate_dashboard(filtered, categories=sample_categories)
    # Receitas: 5000; Despesas de setembro: 1500 + 700 + 120 = 2320
    assert dash.income == Decimal("5000.00")
    assert dash.expenses == Decimal("2320.00")
    assert dash.balance == Decimal("2680.00")
    assert dash.transaction_count == 4


def test_period_filter_excludes_outside(sample_transactions):
    """Testa que filtros de período excluem corretamente um lançamento de agosto."""
    sept = apply_date_filters(
        sample_transactions, start_date="2026-09-01", end_date="2026-09-30"
    )
    ids_sept = {t["id"] for t in sept}
    assert "44444444-4444-4444-4444-444444444444" not in {str(i) for i in ids_sept}
    assert len(sept) == 4

    aug = apply_date_filters(
        sample_transactions, start_date="2026-08-01", end_date="2026-08-31"
    )
    assert len(aug) == 1
    assert str(aug[0]["id"]) == "44444444-4444-4444-4444-444444444444"


def test_breakdowns_and_largest(sample_transactions, sample_categories):
    filtered = apply_date_filters(
        sample_transactions, start_date="2026-09-01", end_date="2026-09-30"
    )
    dash = calculate_dashboard(filtered, categories=sample_categories)
    # Categorias de despesa em setembro: Moradia (1500), Alimentação (700 + 120 = 820)
    exp_names = {b.name for b in dash.expenses_by_category}
    assert {"Moradia", "Alimentação"} <= exp_names
    by_name = {b.name: b.total for b in dash.expenses_by_category}
    assert by_name["Moradia"] == Decimal("1500.00")
    assert by_name["Alimentação"] == Decimal("820.00")

    # Maior receita = 5000; maior despesa = 1500
    assert dash.maior_receita == Decimal("5000.00")
    assert dash.maior_despesa == Decimal("1500.00")
    assert dash.maior_receita_descricao == "Salário setembro"
    assert dash.maior_despesa_descricao == "Aluguel setembro"

    # Pagamento: PIX (1500) + Cartão (700) + Débito (120)
    pay = {b.name: b.total for b in dash.expenses_by_payment_method}
    assert pay.get("PIX") == Decimal("1500.00")
    assert pay.get("Cartão de crédito") == Decimal("700.00")
    assert pay.get("Débito") == Decimal("120.00")
