# Plano de Implementação: Meu Controle Financeiro (V1)

Cada tarefa abaixo possui TR (Test Requirements) locais do tipo `rule` ou `rubric` e seu status inicial `pending`.

---

## Task 1: Estrutura base do projeto e arquivos de infraestrutura

**Prioridade**: high
**Status**: pending
**Cobre AC**: AC-R10, AC-R13, AC-U4
**Dependências**: nenhuma

### Descrição
Criar estrutura de pastas e arquivos base na raiz:
- `api/index.py` (entrypoint FastAPI para Vercel)
- `app/__init__.py`, `app/models/__init__.py`, `app/routes/__init__.py`, `app/services/__init__.py`, `app/schemas/__init__.py`, `app/database/__init__.py`
- `static/css/`, `static/js/`
- `templates/`
- `supabase/`
- `tests/`
- `.gitignore`, `.env.example`, `requirements.txt`, `vercel.json`
- `README.md` (primeiro esqueleto)

### TRs
- TR1-R1 (rule): `.gitignore` contém `.env`, `__pycache__/`, `.pytest_cache`, `.venv/`, `.vercel/`. **Evidence**: `grep -F '.env' .gitignore` ok.
- TR1-R2 (rule): `.env.example` contém `SUPABASE_URL=` e `SUPABASE_SERVICE_ROLE_KEY=`. **Evidence**: arquivo lido diretamente.
- TR1-R3 (rule): `requirements.txt` lista `fastapi`, `uvicorn`, `supabase`, `pydantic`, `python-multipart`, `pytest`, `python-dotenv`. **Evidence**: `cat requirements.txt`.
- TR1-R4 (rule): `vercel.json` existe e contém rewrite para `/api/:path*` apontando para `api/index.py`. **Evidence**: arquivo lido diretamente.

---

## Task 2: Schema SQL do Supabase

**Prioridade**: high
**Status**: pending
**Cobre AC**: AC-R1, AC-R2
**Dependências**: Task 1

### Descrição
Gerar `supabase/schema.sql` 100% copiável para SQL Editor:
- `categories`: id UUID PK, tipo VARCHAR(10) CHECK IN ('RECEITA','DESPESA'), nome, slug, created_at timestamptz. UNIQUE(tipo, slug).
- `transactions`: id UUID PK, tipo, descricao, category_id UUID FK, valor NUMERIC(15,2) CHECK > 0, data DATE, forma_pagamento, cartao_nome, qtd_parcelas INT CHECK >= 1, parcela_atual INT, observacao, created_at, updated_at.
- CHECK em forma_pagamento IN (PIX, Dinheiro, Débito, Cartão de crédito, Transferência, Boleto, Outro).
- FK `category_id` → `categories(id)` ON DELETE RESTRICT.
- Índices: `idx_tx_data`, `idx_tx_tipo`, `idx_tx_category`, `idx_tx_pagamento`.
- Seed com as categorias obrigatórias.

### TRs
- TR2-R1 (rule): Arquivo cria `categories` e `transactions` com `NUMERIC(15,2)` em `valor`. **Evidence**: ler schema.sql.
- TR2-R2 (rule): Seed contém Salário, Freelance, Venda, Reembolso, Outras receitas e 12 despesas listadas em AC-R2. **Evidence**: contar seeds.
- TR2-R3 (rule): 4 índices criados. **Evidence**: 4 CREATE INDEX.
- TR2-R4 (rule): CHECK(valor > 0) e FK existem. **Evidence**: ler schema.sql.

---

## Task 3: Camada de acesso a dados / Supabase client + lógica pura (services)

**Prioridade**: high
**Status**: pending
**Cobre AC**: AC-R3, AC-R7, NFR1, AC-U3
**Dependências**: Task 1, Task 2

### Descrição
Criar:
- `app/database/supabase_client.py` — lê `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` de env (dotenv). Não loga secrets.
- `app/schemas/transaction.py` — Pydantic v2 schemas: `TransactionCreate`, `TransactionUpdate`, `TransactionResponse`, `DashboardResponse` (income, expenses, balance, transaction_count, breakdowns). `Enum`s: `TransactionType`, `PaymentMethod`.
- `app/services/finance.py` — lógica pura (sem depender do cliente Supabase) com funções: `calculate_dashboard(transactions, filters?)`, `validate_transaction(payload, categories_list)`.
- `app/models/repository_protocol.py` — TypedDict / Protocol para abstrair repositório.
- `app/services/transactions_repo.py` — implementa o repositório via `supabase-py` (também deixa uma implementação in-memory para testes).

### TRs
- TR3-R1 (rule): `SUPABASE_SERVICE_ROLE_KEY` aparece **apenas** em `app/database/supabase_client.py` e `.env.example`. **Evidence**: grep no repo.
- TR3-R2 (rule): Schemas Pydantic possuem validação `valor > 0`, `descricao.strip() != ''`. **Evidence**: rodar local com `from app.schemas.transaction import TransactionCreate; TransactionCreate(... valor=0)` → ValidationError.
- TR3-R3 (rule): `calculate_dashboard` retorna balance = income - expenses. **Evidence**: teste unitário cobre em Task 7.
- TR3-R4 (rule): `validate_transaction` rejeita tipo errado e categoria que não bate com tipo. **Evidence**: teste unitário.

---

## Task 4: Rotas FastAPI (transactions, categories, dashboard, páginas SSR)

**Prioridade**: high
**Status**: pending
**Cobre AC**: AC-R3, AC-R4, AC-R5, AC-R6, AC-R7, AC-R9
**Dependências**: Task 3

### Descrição
Criar:
- `app/routes/transactions.py`: `GET/POST/PUT/DELETE` com validações Pydantic; erros mapeados para 422/404/500.
- `app/routes/categories.py`: `GET /api/categories` agrupado por tipo.
- `app/routes/dashboard.py`: `GET /api/dashboard` com query params e retorno completo.
- `app/routes/pages.py`: `GET /`, `/lancamentos`, `/novo`, `/editar` servindo HTML de `templates/` com Jinja2 (ou static, mas com Jinja fica mais fácil de injetar CDN URLs e título).
- `api/index.py` monta tudo com FastAPI e `app.mount('/static', StaticFiles(directory='static'))`.

### TRs
- TR4-R1 (rule): `POST /api/transactions` com valor=0 retorna 422. **Evidence**: rodar uvicorn + curl ou testes em Task 7 com TestClient.
- TR4-R2 (rule): `POST /api/transactions` com descricao='' retorna 422. **Evidence**: idem.
- TR4-R3 (rule): `POST /api/transactions` com tipo='X' retorna 422. **Evidence**: idem.
- TR4-R4 (rule): `GET /api/dashboard?start_date=2026-09-01&end_date=2026-09-30` retorna JSON com income/expenses/balance numéricos. **Evidence**: schema DashboardResponse.
- TR4-R5 (rule): `GET /` retorna 200 com título "Meu Controle Financeiro". **Evidence**: TestClient.

---

## Task 5: Frontend — Template base, CSS, JS utilitário, formatação BRL

**Prioridade**: high
**Status**: pending
**Cobre AC**: AC-R14, AC-R15, AC-U1, AC-U2
**Dependências**: Task 1, Task 4

### Descrição
Criar:
- `templates/base.html` com Tailwind CDN, Chart.js CDN, sidebar + topbar responsiva (mobile → tabs/hambúrguer). Título dinâmico.
- `static/css/app.css` com estilos adicionais (cards, tabela zebrada, badge receita/despesa, modais, toasts).
- `static/js/utils.js` — `formatBRL(n)`, `formatDateBR(iso)`, `parseBRDate`, mascara de input dinheiro, query helpers `getFilterStateFromURL / setFilterStateToURL`.

### TRs
- TR5-R1 (rule): `formatBRL(1234.56)` retorna `R$ 1.234,56`. **Evidence**: console teste ou unitário Node (opcional) ou validação visual na Review.
- TR5-R2 (rule): `formatDateBR('2026-09-15')` retorna `15/09/2026`. **Evidence**: idem.
- TR5-R3 (rule): Menu navega para Dashboard, Lançamentos, Novo Lançamento. **Evidence**: links HTML.
- TR5-U1 (rubric, threshold=1): Layout do Dashboard apresenta 3+ cards empilhados em mobile, 3 colunas em lg. 0=quebra, 1=funciona, 2=polido. **Evidence**: Review visual / screenshot.

---

## Task 6: Frontend — telas Dashboard, Lançamentos, Novo/Editar lançamento

**Prioridade**: high
**Status**: pending
**Cobre AC**: AC-R8, AC-R9, AC-R14, AC-R15, AC-U1, AC-U2, AC-U5
**Dependências**: Task 5

### Descrição
Criar:
- `templates/dashboard.html` (extend base) com filtros, cards (Receitas, Despesas, Saldo, Qtde, Maior Rec, Maior Desp), gráficos (barras receitas x despesas por dia, rosca categorias receita, rosca categorias despesa, barras forma pagamento), últimas movimentações. JS busca `/api/dashboard` com filtros.
- `templates/lancamentos.html` com tabela completa, filtros idênticos, ações editar (link `/editar?id=...`) e excluir com `confirm()` nativo. Classes de linha verde/vermelho por tipo.
- `templates/novo_lancamento.html` com formulário; campos de Cartão aparecem apenas quando `Cartão de crédito` selecionado. Salva via POST, mostra toast, limpa form ou redirect.
- `templates/editar_lancamento.html` = mesmo form de novo, porém carrega dados via `GET /api/transactions/{id}` ao abrir e salva via PUT.
- `static/js/dashboard.js`, `static/js/lancamentos.js`, `static/js/transaction-form.js`.

### TRs
- TR6-R1 (rule): Ao clicar em excluir em Lançamentos, chama `confirm()` e só dispara DELETE se confirmar. **Evidence**: ler JS.
- TR6-R2 (rule): Valores na tabela de lançamentos usam `R$ x.xxx,xx` e datas `DD/MM/AAAA`. **Evidence**: funções de TR5-R1/R2 aplicadas.
- TR6-R3 (rule): Se forma_pagamento != Cartão, inputs de cartão ficam disabled/ocultos. **Evidence**: ler transaction-form.js.
- TR6-R4 (rule): Dashboard chama `/api/dashboard` com query params dos filtros aplicados. **Evidence**: ler dashboard.js.
- TR6-U1 (rubric threshold=1): Qualidade geral UX, feedbacks loading e erros. 0=silêncio, 1=aceitável, 2=polido.

---

## Task 7: Testes pytest (services + API)

**Prioridade**: high
**Status**: pending
**Cobre AC**: AC-R12, AC-R3, AC-R4, AC-R5, AC-R6, AC-R7
**Dependências**: Task 3, Task 4

### Descrição
Criar:
- `tests/conftest.py` — fixtures: `in_memory_repo` (dict-based), `sample_categories`, `sample_transactions`, `client = TestClient(app)` com override de dependência para repo em memória.
- `tests/test_validations.py` — valida valor <= 0, descrição vazia, tipo inválido, categoria errada p/ tipo.
- `tests/test_finance_service.py` — cálculo de income/expenses/balance e filtros por período.
- `tests/test_repo.py` — create, update, delete, list. Delete de ID inexistente → erro.
- `tests/test_api.py` — endpoints via TestClient: 422 para valor 0, 422 para descricao vazia, 201 ao criar, dashboard retorna balance correto.

### TRs
- TR7-R1 (rule): Executar `pytest -q` sai com exit code 0. **Evidence**: log do comando.
- TR7-R2 (rule): Ao menos 6 testes passam (criação, validação, saldo, filtros, atualização, exclusão). **Evidence**: relatório pytest.
- TR7-R3 (rule): Teste de exclusão de ID inexistente levanta erro ou retorna 404/422. **Evidence**: código do teste.

---

## Task 8: README, variáveis de ambiente, organização final

**Prioridade**: high
**Status**: pending
**Cobre AC**: AC-U4, AC-R10, AC-R11, AC-R13
**Dependências**: Tasks 2, 3, 4, 5, 6, 7

### Descrição
- Preencher `README.md` com os 13 itens solicitados.
- Rodar busca textual de secrets: grep `SUPABASE_SERVICE_ROLE_KEY` em `static/`, `templates/`, `.env.example` só.
- Revisar `.gitignore`, `.env.example`, `requirements.txt`, `vercel.json`.
- Adicionar instrução manual: rodar `supabase/schema.sql` no SQL Editor, ativar API do Supabase e colar variáveis na Vercel.

### TRs
- TR8-R1 (rule): README contém seções 1-13 solicitadas (o que é, tecnologias, instalar, venv, deps, env, rodar local, criar banco, rodar sql, rodar testes, deploy vercel, env vars, estrutura). **Evidence**: ler README.md.
- TR8-R2 (rule): grep `SUPABASE_SERVICE_ROLE_KEY` em `static/` e `templates/` retorna vazio. **Evidence**: comando grep.
- TR8-R3 (rule): `.env` em .gitignore. **Evidence**: grep.

---

## Task 9: Verificação final + commit/push

**Prioridade**: medium
**Status**: pending
**Dependências**: Tasks 1-8

### Descrição
- Rodar `python -m pytest` → exit 0.
- Subir uvicorn `uvicorn api.index:app --reload` e carregar `/`, `/lancamentos`, `/novo`, `/api/dashboard`.
- Revisar:
  - [ ] Valores em NUMERIC no SQL.
  - [ ] Nenhum secret vazou.
  - [ ] Responsividade mínima em 375px (simulado).
  - [ ] Filtros por mês/ano e por período.
- Executar `git init` (se ainda não), `git add .`, `git commit -m "feat: cria sistema inicial de controle financeiro"`.
- Se tiver remote configurado e permissão, `git push origin main`. Senão, registrar o comando.

### TRs
- TR9-R1 (rule): pytest exit code 0. **Evidence**: log.
- TR9-R2 (rule): `git status` após commit está limpo (nada para commit). **Evidence**: log.
- TR9-R3 (rule): Nenhum arquivo `.env` commitado (ver `git ls-files .env` vazio). **Evidence**: log git.
