-- ======================================================================
-- Meu Controle Financeiro - V1
-- Schema SQL para Supabase (PostgreSQL)
-- Execute este arquivo inteiro no SQL Editor do Supabase.
-- Idempotente: apaga e recria tabelas; se tiver dados, faça backup antes.
-- ======================================================================

-- ----------------------------------------------------------------------
-- 1. Remove tabelas na ordem correta (FK primeiro)
-- ----------------------------------------------------------------------
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;

-- ----------------------------------------------------------------------
-- 2. Tabela: categories
-- ----------------------------------------------------------------------
CREATE TABLE public.categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo        VARCHAR(10) NOT NULL CHECK (tipo IN ('RECEITA', 'DESPESA')),
    nome        VARCHAR(80) NOT NULL,
    slug        VARCHAR(80) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tipo, slug)
);

-- ----------------------------------------------------------------------
-- 3. Tabela: transactions
-- ----------------------------------------------------------------------
CREATE TABLE public.transactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo                VARCHAR(10) NOT NULL CHECK (tipo IN ('RECEITA', 'DESPESA')),
    descricao           VARCHAR(255) NOT NULL CHECK (char_length(trim(descricao)) > 0),
    category_id         UUID NOT NULL REFERENCES public.categories (id) ON DELETE RESTRICT,
    valor               NUMERIC(15,2) NOT NULL CHECK (valor > 0),
    data                DATE NOT NULL,
    forma_pagamento     VARCHAR(30) NOT NULL CHECK (forma_pagamento IN (
                            'PIX', 'Dinheiro', 'Débito', 'Cartão de crédito',
                            'Transferência', 'Boleto', 'Outro'
                        )),
    cartao_nome         VARCHAR(80),
    qtd_parcelas        INTEGER CHECK (qtd_parcelas IS NULL OR qtd_parcelas >= 1),
    parcela_atual       INTEGER CHECK (parcela_atual IS NULL OR parcela_atual >= 1),
    observacao          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CHECK adicional: se forma_pagamento = Cartão de crédito / Empréstimo, parcela_atual <= qtd_parcelas
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS tx_parcela_check;
ALTER TABLE public.transactions
ADD CONSTRAINT tx_parcela_check
CHECK (
    (forma_pagamento <> 'Cartão de crédito' AND forma_pagamento <> 'Empréstimo')
    OR qtd_parcelas IS NULL
    OR parcela_atual IS NULL
    OR parcela_atual <= qtd_parcelas
);

-- ----------------------------------------------------------------------
-- 4. Índices
-- ----------------------------------------------------------------------
CREATE INDEX idx_tx_data       ON public.transactions (data);
CREATE INDEX idx_tx_tipo       ON public.transactions (tipo);
CREATE INDEX idx_tx_category   ON public.transactions (category_id);
CREATE INDEX idx_tx_pagamento  ON public.transactions (forma_pagamento);

-- ----------------------------------------------------------------------
-- 5. Trigger: updated_at
-- ----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql VOLATILE;

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON public.transactions;

CREATE TRIGGER trg_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------
-- 6. Seed - Categorias de RECEITA
-- ----------------------------------------------------------------------
INSERT INTO public.categories (tipo, nome, slug) VALUES
    ('RECEITA', 'Salário',      'salario'),
    ('RECEITA', 'Freelance',    'freelance'),
    ('RECEITA', 'Venda',        'venda'),
    ('RECEITA', 'Reembolso',    'reembolso'),
    ('RECEITA', 'Outras receitas', 'outras-receitas');

-- ----------------------------------------------------------------------
-- 7. Seed - Categorias de DESPESA
-- ----------------------------------------------------------------------
INSERT INTO public.categories (tipo, nome, slug) VALUES
    ('DESPESA', 'Alimentação',  'alimentacao'),
    ('DESPESA', 'Mercado',      'mercado'),
    ('DESPESA', 'Transporte',   'transporte'),
    ('DESPESA', 'Moradia',      'moradia'),
    ('DESPESA', 'Saúde',        'saude'),
    ('DESPESA', 'Academia',     'academia'),
    ('DESPESA', 'Lazer',        'lazer'),
    ('DESPESA', 'Assinaturas',  'assinaturas'),
    ('DESPESA', 'Compras',      'compras'),
    ('DESPESA', 'Educação',     'educacao'),
    ('DESPESA', 'Impostos',     'impostos'),
    ('DESPESA', 'Outros',       'outros');

-- Categorias adicionais (execute mesmo se já tiver rodado o seed inicial):
INSERT INTO public.categories (tipo, nome, slug) VALUES ('DESPESA', 'Empréstimo / Financiamento', 'emprestimo-financiamento')
ON CONFLICT (tipo, slug) DO NOTHING;
INSERT INTO public.categories (tipo, nome, slug) VALUES ('DESPESA', 'Juros / Taxas bancárias', 'juros-taxas')
ON CONFLICT (tipo, slug) DO NOTHING;
