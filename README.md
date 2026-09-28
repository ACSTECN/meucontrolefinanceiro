# Meu Controle Financeiro

Sistema web pessoal de controle financeiro (receitas e despesas) com dashboard,
filtros por período, categorias e forma de pagamento. Dados armazenados no
Supabase (PostgreSQL). Deploy na Vercel (FastAPI serverless + frontend HTML/JS
responsivo).

## 2. Tecnologias

| Camada | Ferramenta |
|---|---|
| Backend | Python 3.12+, FastAPI, Pydantic v2, Jinja2 |
| Banco | Supabase / PostgreSQL (NUMERIC para dinheiro, UUIDs) |
| SDK banco | supabase-py |
| Frontend | HTML5, CSS3, JS puro, Tailwind (CDN), Chart.js (CDN) |
| Deploy | Vercel |
| Testes | pytest + httpx (FastAPI TestClient) |
| Infra | Git / GitHub |

## 3. Como instalar

Pré-requisitos:
- Python 3.12+
- pip / venv
- Conta Supabase e projeto criado
- (Opcional) Conta Vercel e CLI instalados

## 4. Como criar o ambiente virtual

Windows (PowerShell):

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

Linux / macOS:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

## 5. Como instalar as dependências

Com o ambiente virtual **ativado**:

```bash
pip install -r requirements.txt
```

## 6. Como configurar `.env`

1. Copie `.env.example` para `.env`:

   ```bash
   cp .env.example .env   # linux/mac
   copy .env.example .env # windows cmd
   ```

2. Abra o painel do Supabase: **Project Settings → API** e cole:
   - `SUPABASE_URL`: Project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: service_role (**somente backend, nunca exponha no navegador**)

## 7. Como executar localmente

```bash
uvicorn api.index:app --reload
```

Abra o navegador em http://127.0.0.1:8000.

## 8. Como criar o banco no Supabase

1. Crie um projeto no [supabase.com](https://supabase.com/dashboard/new).
2. Vá em **SQL Editor → New Query**.
3. Copie todo o conteúdo do arquivo [supabase/schema.sql](supabase/schema.sql).
4. Cole e execute (Run). Ele irá:
   - apagar e recriar as tabelas `categories` e `transactions`;
   - criar constraints, checks e índices;
   - inserir as categorias padrão de RECEITA e DESPESA.

> Dica: se precisar manter dados existentes, ajuste os `DROP TABLE` antes de executar.

## 9. Como executar `schema.sql`

Passo a passo exato:

1. Acesse seu projeto no Supabase.
2. Clique no menu **SQL Editor** (ícone `</>`).
3. Clique em **New Query** para abrir um editor em branco.
4. Abra `supabase/schema.sql` no seu editor local, selecione tudo (`Ctrl+A`), copie (`Ctrl+C`).
5. Cole no SQL Editor do Supabase (`Ctrl+V`).
6. Clique em **Run** (ou aperte `Ctrl+Enter`).
7. Abaixo aparecerá "Success. No rows returned" quando concluído.
8. (Opcional) Vá em **Table Editor** e confira que `categories` contém 17 linhas (5 receitas + 12 despesas).

## 10. Como rodar testes

Os testes usam um repositório **em memória** (não tocam no Supabase).
Com o ambiente virtual ativado:

```bash
python -m pytest -q
```

Espere `6 passed` ou mais.

Para ver detalhes:

```bash
python -m pytest -v
```

## 11. Como fazer deploy na Vercel

1. Instale a CLI (se não tiver): `npm i -g vercel`
2. Na raiz do projeto (pasta com `vercel.json`):

   ```bash
   vercel
   ```

3. Responda as perguntas:
   - "Set up and deploy?" — `Y`
   - "Which scope?" — seu usuário ou time
   - "Link to existing project?" — `N`
   - "What's your project's name?" — `meu-controle-financeiro` (sugestão)
   - "In which directory is your code located?" — `./`
   - "Want to modify these settings?" — `N`

4. Quando terminar, configure as **Environment Variables** no painel da Vercel
   (Project Settings → Environment Variables):

   | Nome da variável | Ambiente(s) | Valor |
   |---|---|---|
   | `SUPABASE_URL` | Production, Preview, Development | Copiar do Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview, Development | Copiar do Supabase (service_role) |

5. Redeploye para pegar as variáveis:

   ```bash
   vercel --prod
   ```

6. Abra a URL fornecida. Pronto.

## 12. Como configurar Environment Variables (resumo)

- **Local**: arquivo `.env` (não commitado) — vide item 6.
- **Vercel**: painel → Project Settings → Environment Variables.
- **Nomes**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — não renomeie.

## 13. Estrutura do projeto

```
meucontrolefinanceiro/
├── api/
│   └── index.py                      # entrypoint FastAPI (Vercel)
├── app/
│   ├── __init__.py
│   ├── database/
│   │   └── supabase_client.py        # cliente supabase (somente service_role)
│   ├── models/
│   │   └── repository_protocol.py    # abstração repositório
│   ├── routes/
│   │   ├── categories.py
│   │   ├── dashboard.py
│   │   ├── pages.py                  # páginas HTML via Jinja2
│   │   └── transactions.py
│   ├── schemas/
│   │   └── transaction.py            # Pydantic v2 (enums, create/update/response)
│   └── services/
│       ├── finance.py                # lógica pura: dashboard e validações
│       └── transactions_repo.py      # implementações: SupabaseRepo + InMemoryRepo
├── static/
│   ├── css/app.css
│   └── js/
│       ├── utils.js
│       ├── dashboard.js
│       ├── lancamentos.js
│       └── transaction-form.js
├── templates/
│   ├── base.html
│   ├── dashboard.html
│   ├── lancamentos.html
│   ├── novo_lancamento.html
│   └── editar_lancamento.html
├── supabase/
│   └── schema.sql                    # executar no SQL Editor
├── tests/
│   ├── conftest.py
│   ├── test_finance_service.py
│   ├── test_repo.py
│   ├── test_validations.py
│   └── test_api.py
├── .env.example
├── .gitignore
├── requirements.txt
├── vercel.json
└── README.md
```

## Ação manual pendente antes do primeiro uso

- [ ] Executar `supabase/schema.sql` no SQL Editor do Supabase (vide item 9).
- [ ] Preencher `.env` local ou as variáveis na Vercel.
