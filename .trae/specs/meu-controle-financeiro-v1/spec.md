# Especificação: Meu Controle Financeiro (V1)

## 1. Problema

Usuário individual precisa registrar, de forma centralizada e permanente, todas as movimentações financeiras pessoais (receitas e despesas) e analisá-las por período, categoria e forma de pagamento, com dashboard consolidado, filtros flexíveis e deploy em nuvem pronto para uso diário.

## 2. Usuários

- **Usuário final**: Pessoa física que opera o sistema sozinha (V1 sem autenticação multi-usuário, todas as operações são permitidas no frontend; a segurança vem do isolamento da instância Vercel + Supabase e do não vazamento de `SUPABASE_SERVICE_ROLE_KEY`).

## 3. Objetivos

- Persistir 100% das movimentações em banco PostgreSQL (Supabase) usando `NUMERIC` para valores monetários.
- Oferecer três telas navegáveis: **Dashboard**, **Lançamentos**, **Novo Lançamento**.
- Permitir filtrar dashboard e lançamentos por mês/ano ou por período personalizado (data inicial / final), tipo, categoria e forma de pagamento.
- Apresentar métricas essenciais: Receitas, Despesas, Saldo, quantidade de lançamentos, maior receita, maior despesa, distribuições por categoria e por forma de pagamento.
- Criar, editar e excluir lançamentos com validações e confirmação de exclusão.
- Quando a forma de pagamento for `Cartão de crédito`, armazenar nome do cartão, quantidade de parcelas e parcela atual, com estrutura extensível para futuro módulo de faturas.
- Projeto pronto para deploy na Vercel (FastAPI serverless) com variáveis de ambiente para Supabase.
- Testes básicos com pytest cobrindo criação, validação, filtros, atualização, exclusão e cálculo de saldo.

## 4. Não Objetivos (V1)

- Autenticação/autorização multi-usuário com login/senha.
- Gestão avançada de faturas de cartão de crédito, fechamento, vencimento e múltiplos cartões (apenas armazenamento estruturado).
- Orçamentos, metas, alertas, integração bancária ou importação de extratos.
- APIs públicas, SDKs ou documentação OpenAPI avançada (além do que o FastAPI gera automaticamente).

## 5. Requisitos Funcionais

### 5.1 Stack e Infraestrutura
- FR1: Backend Python 3.12+ com FastAPI, Pydantic, supabase-py.
- FR2: Frontend HTML5 + CSS3 + JS puro, responsivo, Tailwind via CDN, Chart.js via CDN.
- FR3: Deploy na Vercel com `vercel.json`, entrypoint compatível e rotas `/api/*` e assets estáticos servidos corretamente.
- FR4: `.env.example` e `.gitignore`; `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` **nunca** aparecem hardcoded.

### 5.2 Banco de Dados (Supabase)
- FR5: Arquivo `supabase/schema.sql` idempotente (DROP IF EXISTS / CREATE) contendo:
  - `categories` (id UUID PK, tipo [RECEITA/DESPESA], nome, slug unique por tipo, created_at).
  - `transactions` (id UUID PK, tipo, descrição, category_id FK, valor NUMERIC(15,2) positivo, data DATE, forma_pagamento, cartao_nome, qtd_parcelas INT, parcela_atual INT, observacao TEXT, created_at, updated_at).
  - Constraints: CHECK em valor > 0, CHECK em tipo, CHECK em forma_pagamento, FK com ON DELETE RESTRICT.
  - Índices em (data), (tipo), (category_id), (forma_pagamento).
  - Seed de categorias iniciais (as listadas no item 3 do pedido).
- FR6: Tipos monetários nunca usam `FLOAT` / `REAL`.

### 5.3 API (Rotas públicas)
- FR7: `GET /api/categories` — retorna categorias agrupadas por tipo.
- FR8: `GET /api/transactions` — lista paginável, aceita filtros: start_date, end_date, type, category, payment_method.
- FR9: `POST /api/transactions` — cria lançamento com validações.
- FR10: `PUT /api/transactions/{id}` — atualiza lançamento.
- FR11: `DELETE /api/transactions/{id}` — remove lançamento (backend não confirma, frontend sim).
- FR12: `GET /api/dashboard?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD[&type=&category=&payment_method=]` — retorna:
  - income, expenses, balance (NUMERIC arredondado para 2 casas), transaction_count.
  - maior_receita, maior_despesa.
  - expenses_by_category: [{category, total}].
  - income_by_category: [{category, total}].
  - expenses_by_payment_method: [{method, total}].
  - series (receitas x despesas por dia, opcional por semana/mês).
  - ultimas_movimentacoes: últimas 10 ordenadas por data DESC, id DESC.
- FR13: Todas as datas são ISO (YYYY-MM-DD) na API; formatação BR só ocorre no frontend.
- FR14: Valores monetários trafegam como strings ou números decimais; JSON aceita number com 2 casas, backend converte em `Decimal`.

### 5.4 Validações
- FR15: Valor > 0 (rejeita zero e negativo).
- FR16: Descrição não vazia e não só espaços.
- FR17: Data válida e não futura? (Permitir datas futuras é razoável para agendamento; V1 permite qualquer data).
- FR18: Tipo exato: `RECEITA` ou `DESPESA`.
- FR19: Categoria deve existir na tabela `categories` e ser do mesmo tipo informado.
- FR20: Forma de pagamento dentre os valores permitidos.
- FR21: Se forma_pagamento == `Cartão de crédito`:
  - `cartao_nome` opcional mas recomendado;
  - `qtd_parcelas` >= 1 (padrão 1 se não informado);
  - `parcela_atual` entre 1 e qtd_parcelas.
- FR22: Edição e exclusão só ocorrem para IDs existentes.
- FR23: Erros são retornados como JSON `{ "detail": "...", "errors": [...] }` com status 4xx / 5xx.

### 5.5 Páginas / Frontend
- FR24: **Menu de navegação** (desktop lateral / mobile hambúrguer) com Dashboard, Lançamentos, Novo Lançamento e título "Meu Controle Financeiro".
- FR25: **Dashboard**:
  - Filtros: mês (select nomes), ano, data inicial, data final, tipo, categoria, forma de pagamento. Botão "Aplicar" e "Mês atual".
  - Cards: Receitas (verde), Despesas (vermelha), Saldo (cor conforme sinal), Qtde de lançamentos, Maior receita, Maior despesa.
  - Gráfico de barras empilhadas ou duplas: receitas x despesas por dia/semana.
  - Gráfico de pizza/rosca: despesas por categoria e receitas por categoria.
  - Gráfico de barras: despesas por forma de pagamento.
  - Últimas movimentações em tabela/resumo.
- FR26: **Lançamentos** (tabela):
  - Colunas: Data, Descrição, Categoria, Tipo, Forma de pagamento, Valor, Ações (editar/excluir).
  - Linhas de RECEITA em verde claro, DESPESA em vermelho claro.
  - Valores em `R$ 1.234,56`, datas em `DD/MM/AAAA`.
  - Filtros idênticos ao dashboard, persistidos entre telas via query string ou localStorage.
  - Confirmação de exclusão em modal/confirm nativo.
- FR27: **Novo Lançamento** (formulário):
  - Campos: Tipo (radio/select), Descrição, Categoria (select dinâmico por tipo), Valor (mascara BRL), Data, Forma de pagamento, Cartão (visível quando cartão), Parcelas, Parcela atual, Observação.
  - Botão "SALVAR LANÇAMENTO".
  - Feedback de sucesso/erro com toast/mensagem fixa.
  - Após salvar: limpa formulário e opcionalmente mostra link "Ver lançamentos".
- FR28: **Editar Lançamento**: mesma tela/form de novo, mas com dados pré-carregados via `?id=...` ou rota `/editar?id=...`, endpoint PUT.
- FR29: Totalmente responsivo: breakpoints em sm (640), md (768), lg (1024). Tabela em carrossel/cards empilhados no mobile (< 640px).
- FR30: Nenhum secret em HTML/JS; frontend chama apenas endpoints locais `/api/*`.

### 5.6 Testes
- FR31: Separar lógica de negócio em `app/services` puros (sem dependência de Supabase) com dependência injetável de repositório, para rodar pytest sem banco.
- FR32: Testes cobrindo:
  - Criação de lançamento (campos obrigatórios).
  - Validação de valor <= 0 e descrição vazia.
  - Cálculo de saldo (income - expenses) correto para um conjunto de movimentações.
  - Filtros por período (start/end) excluem corretamente fora do intervalo.
  - Atualização de lançamento persiste campos alterados.
  - Exclusão remove lançamento existente e falha para ID inexistente.
- FR33: Rodar testes com `pytest` e reportar sucesso; o comando `pytest` deve sair exit code 0.

### 5.7 Deploy e Git
- FR34: `requirements.txt` com FastAPI, uvicorn, supabase, pydantic[email] opcional, python-multipart, pytest.
- FR35: `vercel.json` com `rewrites` apontando `api/index.py` como handler para `/api/:path*` e assets do `static/` e `templates/` (se SSR de páginas for feito por rota).
- FR36: `.env.example` com `SUPABASE_URL=`, `SUPABASE_SERVICE_ROLE_KEY=`.
- FR37: `.gitignore` cobre `.env`, `__pycache__/`, `.pytest_cache`, `.venv/`, `node_modules/`, `.vercel/`.
- FR38: `README.md` completo e passo-a-passo execução sem ambiguidades.
- FR39: Repositório preparado para commit inicial com mensagem `feat: cria sistema inicial de controle financeiro`. Se push falhar por permissão, entregar o comando `git push origin main`.

## 6. Requisitos Não Funcionais

- NFR1 (Segurança): `SUPABASE_SERVICE_ROLE_KEY` é lida apenas em `app/database/supabase_client.py` ou equivalente; nunca trafega para o navegador e não aparece em templates.
- NFR2 (Performance): Dashboard calcula agregados em Python com base em lista já filtrada (para V1 é aceitável; índices no banco garantem que a leitura inicial seja rápida).
- NFR3 (Confiabilidade): Erros de rede no frontend mostram mensagens amigáveis e não quebram a tela; 5xx do backend retornam 500 e não stacktrace em produção.
- NFR4 (Portabilidade): Código roda localmente com `uvicorn api.index:app --reload` ou `vercel dev`.
- NFR5 (Qualidade): Formatação consistente (PEP 8 razoável), imports organizados.
- NFR6 (Responsividade): Lighthouse mobile viewport (375px) não exibe overflow horizontal e cards se empilham.

## 7. Restrições e Dependências

- Supabase criado previamente pelo usuário; URL e service role key gerados no painel.
- `schema.sql` deve ser executado manualmente no SQL Editor do Supabase antes do primeiro uso.
- Python 3.12+ e pip disponíveis na máquina local.
- Conta Vercel (gratuita funciona) para deploy.

## 8. Premissas

- V1 single-tenant: uma instância Vercel + um projeto Supabase = um usuário.
- Sem autenticação: segurança por segredo da instância (frontend acessa só `/api/*` que roda no mesmo domínio).
- Categorias iniciais são seedadas no SQL; o usuário pode inserir mais manualmente no SQL Editor ou em versão futura via tela administrativa.

## 9. Critérios de Aceitação (AC)

### Regras (acerta/erra)

- AC-R1: Arquivo `supabase/schema.sql` existe, cria `categories` e `transactions` com UUID PK, timestamps, `NUMERIC(15,2)`, constraints e índices listados em FR5.
- AC-R2: Seed SQL contém pelo menos 5 categorias de RECEITA e 12 de DESPESA listadas no pedido (Salário, Freelance, Venda, Reembolso, Outras receitas; Alimentação, Mercado, Transporte, Moradia, Saúde, Academia, Lazer, Assinaturas, Compras, Educação, Impostos, Outros).
- AC-R3: Endpoints `/api/transactions` e `/api/dashboard` existem e aceitam `start_date`, `end_date` em formato ISO.
- AC-R4: `POST /api/transactions` com `valor <= 0` retorna 422 e não cria registro.
- AC-R5: `POST /api/transactions` com `descricao` vazia retorna 422.
- AC-R6: `POST /api/transactions` com `tipo` inválido retorna 422.
- AC-R7: Dashboard calcula `balance = income - expenses` corretamente para dados de entrada conhecíveis.
- AC-R8: Exclusão em frontend exige confirmação (confirm nativo ou modal OK/Cancelar).
- AC-R9: `Cartão de crédito` armazena `cartao_nome`, `qtd_parcelas`, `parcela_atual`; retorna corretamente no GET e PUT.
- AC-R10: `.env` está em `.gitignore`.
- AC-R11: Busca textual por `SUPABASE_SERVICE_ROLE_KEY` em `static/`, `templates/` retorna zero ocorrências.
- AC-R12: pytest executa ao menos 6 testes (criação, validação, saldo, filtros, atualização, exclusão) e todos passam.
- AC-R13: `requirements.txt`, `vercel.json`, `.env.example`, `README.md`, `.gitignore` existem na raiz.
- AC-R14: Frontend exibe valores formatados `R$ 1.234,56` e datas `DD/MM/AAAA` nas telas de dashboard e lançamentos.
- AC-R15: Cores de receita (verde) e despesa (vermelho) diferenciam linhas da tabela em lançamentos.

### Rubricas (0-2, threshold >= 1)

- AC-U1 (Interface Dashboard): Visual de app financeiro profissional, 3 colunas de cards no desktop, empilhado no mobile, gráficos visíveis. 0=vazio/bruto, 1=aceitável, 2=polido. (threshold=1)
- AC-U2 (Responsividade): Em viewport 375px largura, navegação hambúrguer/tabs, cards empilhados, sem overflow horizontal. 0=quebra, 1=funciona, 2=polido. (threshold=1)
- AC-U3 (Qualidade do código backend): Rotas finas, serviços separados, schemas Pydantic centralizados. 0=tudo em um arquivo, 1=separação razoável, 2=bom design. (threshold=1)
- AC-U4 (README): Passo-a-passo executa do zero sem ambiguidades. 0=faltam passos críticos, 1=completo, 2=excelente. (threshold=1)
- AC-U5 (Tratamento de erros UX): Mensagens amigáveis em tela em caso de erro de rede/validação; loading states. 0=silêncio/quebra, 1=aceitável, 2=delight. (threshold=1)
