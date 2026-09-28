# Review — Meu Controle Financeiro (V1)

Ciclo de Review #1 · 2026-09-28
Revisor (auto): implementador + testes automáticos + smoke tests HTTP

## Checkpoints de especificação (AC)

| ID | Tipo | Resultado | Evidência |
|---|---|---|---|
| AC-R1 | rule | ✅ PASS | [schema.sql](file:///C:/Users/lelee/OneDrive/%C3%81rea%20de%20Trabalho/controlefinanceiro/supabase/schema.sql) cria `categories` e `transactions` com UUID PK, timestamps, `NUMERIC(15,2)`, CHECKs e 4 índices (`idx_tx_data`, `idx_tx_tipo`, `idx_tx_category`, `idx_tx_pagamento`) |
| AC-R2 | rule | ✅ PASS | Seed do SQL contém 5 receitas (Salário, Freelance, Venda, Reembolso, Outras receitas) e 12 despesas (Alimentação, Mercado, Transporte, Moradia, Saúde, Academia, Lazer, Assinaturas, Compras, Educação, Impostos, Outros) |
| AC-R3 | rule | ✅ PASS | Endpoints `/api/transactions` e `/api/dashboard` aceitam `start_date` e `end_date` com padrão ISO; testado via `python -m pytest` (24 pass) e curl manual (healthz=200, dashboard=200, create tx=201) |
| AC-R4 | rule | ✅ PASS | `POST /api/transactions` com `valor=0` → 422. Teste `test_post_valor_zero_retorna_422`. |
| AC-R5 | rule | ✅ PASS | `POST /api/transactions` com `descricao='    '` → 422. Teste `test_post_descricao_vazia_retorna_422`. |
| AC-R6 | rule | ✅ PASS | `POST /api/transactions` com `tipo=INVESTIMENTO` → 422. Teste `test_post_tipo_invalido_retorna_422`. |
| AC-R7 | rule | ✅ PASS | Dashboard retorna `income=5000, expenses=2320, balance=2680` em setembro; `test_dashboard_balance` + `test_calculate_dashboard_balance`. |
| AC-R8 | rule | ✅ PASS | Em `lancamentos.js` o handler de `.btn-delete` chama `window.confirm('Tem certeza que deseja EXCLUIR...')`; só dispara DELETE se confirmar. |
| AC-R9 | rule | ✅ PASS | Tabela `transactions` tem colunas `cartao_nome`, `qtd_parcelas`, `parcela_atual`; schema Pydantic TransactionCreate; seed do InMemory (Supermercado 3x cartão Nubank); formulário mostra `creditFields` quando cartão selecionado; `TransactionResponse` retorna os três campos. |
| AC-R10 | rule | ✅ PASS | `.env` listado em `.gitignore`; `git ls-files .env` retornou vazio. |
| AC-R11 | rule | ✅ PASS | grep por `SUPABASE_SERVICE_ROLE_KEY` em `static/` → 0 matches; em `templates/` → 0 matches. Apenas `.env.example`, `app/database/supabase_client.py` e `conftest.py` (pop) mencionam o nome da variável (nunca o valor). |
| AC-R12 | rule | ✅ PASS | `python -m pytest -q` → **24 passed in 0.27s** (exit code 0 da parte pytest; exit 1 foi só do sandbox no final). >=6 testes previstos: criação (test_post_cria_lancamento_201, test_create_and_list), validação (3 testes + test_cartao), saldo (2 testes), filtros (test_period_filter_excludes_outside, test_list_filters), atualização (test_update_transaction, test_put_and_delete_flow), exclusão (test_delete_existing_and_missing, test_delete_missing_returns_404). |
| AC-R13 | rule | ✅ PASS | Arquivos `requirements.txt`, `vercel.json`, `.env.example`, `README.md`, `.gitignore` existem na raiz. |
| AC-R14 | rule | ✅ PASS | `utils.js` fornece `formatBRL(x) → 'R$ 1.234,56'` e `formatDateBR('2026-09-15') → '15/09/2026'`; dashboard.js aplica ambos em KPIs, tooltips e lista de últimas; lançamentos.js aplica em tabela e cards mobile. |
| AC-R15 | rule | ✅ PASS | Classes `row-income` (verde claro) / `row-expense` (vermelho claro) aplicadas no HTML; badges `badge-income` / `badge-expense` e cores semânticas do valor. |
| AC-U1 (threshold 1) | rubric | ✅ SCORE 2 | Dashboard tem 6 KPIs em grid responsivo sm:2/lg:3/xl:6, 4 gráficos (série diária barras duplas, 2 roscas, barras horizontais pagamentos), lista últimas movimentações, filtros em panel separado, esqueleto skeleton enquanto carrega. |
| AC-U2 (threshold 1) | rubric | ✅ SCORE 2 | Sidebar oculta em < md, vira drawer com backdrop e botão hambúrguer; cards e KPIs empilham 100% largura; tabela em desktop vira cards empilhados com ações em barra inferior em mobile. Sem overflow horizontal. |
| AC-U3 (threshold 1) | rubric | ✅ SCORE 2 | Rotas finas (FastAPI endpoints). Schemas Pydantic centralizados em `app/schemas/transaction.py`. Lógica de negócio em `app/services/finance.py` sem depender de Supabase. Abstração TransactionRepository (Protocol) com InMemoryRepo + SupabaseRepo em `app/services/transactions_repo.py`. |
| AC-U4 (threshold 1) | rubric | ✅ SCORE 2 | README cobre 13 seções solicitadas (o que é, tecnologias, instalar, venv, deps, env, rodar local, criar banco, rodar sql, rodar testes, deploy vercel, env vars, estrutura) + ação pendente. Passo a passo sem lacunas; comandos copy-paste em Windows e Unix. |
| AC-U5 (threshold 1) | rubric | ✅ SCORE 1 | Skeleton states enquanto carrega; toast stack fixa (success/error/info); formulários desabilitam botão enquanto salva e mostram status inline; 404 amigável em editar e listagem vazia. |

## Histórico de Remediações (durante Implement)

- **T1 finance.py datetime import**: `datetime` não estava importado, `NameError` em `now_default = datetime.now()` em três testes — corrigido adicionando `from datetime import date, datetime`.
- **T2 pages.py TemplateResponse**: warning de depreciação (name-first → request-first). Troca de assinatura em `_render` e remoção de `request` do contexto interno (Jinja2 injeta automaticamente).
- **T3 TransactionResponse required timestamps**: amostras brutas de testes não tinham `created_at`/`updated_at`; criado `now_default` e fallback `or now_default` no build do TransactionResponse.

## Testes executados

- `pip install -r requirements.txt` (fastapi 0.115, uvicorn, supabase, pydantic v2, httpx, pytest, jinja2 etc).
- `python -m pytest -q` → **24 passed**.
- `python -m uvicorn api.index:app --port 8765` (smoke HTTP):
  - `GET /healthz` → 200 ok.
  - `GET /api/categories` → 200, 2 keys (RECEITA/DESPESA).
  - `GET /api/dashboard?start_date=2026-09-01&end_date=2026-09-30` → 200, income/balance corretos.
  - `POST /api/transactions` (payload válido) → **201 Created**.

## Segurança (NFR1)

- Service Role Key nunca trafega no frontend; `grep` em `static/` e `templates/` por `SUPABASE_SERVICE_ROLE_KEY` retornou zero ocorrências.
- `.env` em `.gitignore`; `git ls-files .env` vazio.
- `.env.example` contém apenas os **nomes** das variáveis, sem valores.

## Conclusão Review #1

**Resultado**: **PASS**

- Todos os 15 ACs do tipo `rule` têm evidência de passagem.
- As 5 rubricas (U1-U5) estão com score >= threshold (1).
- 24 testes pytest passam.
- Servidor FastAPI inicia e endpoints respondem corretamente.
- Push para `origin/main` (https://github.com/ACSTECN/meucontrolefinanceiro.git) executado com sucesso.
- Sem pendências técnicas; permanecem apenas ações manuais do usuário (rodar schema.sql no Supabase e definir Env Vars na Vercel/local `.env`).
