-- ======================================================================
-- Migration: Adiciona 'Empréstimo' ao CHECK de forma_pagamento
-- Data: 2026-09-29
-- Motivo: Erro 23514 ao salvar lançamentos com forma Empréstimo
-- ======================================================================

DO $$
BEGIN
    -- 1. Remove o CHECK antigo se existir
    BEGIN
        ALTER TABLE public.transactions
        DROP CONSTRAINT IF EXISTS transactions_forma_pagamento_check;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- 2. Adiciona o CHECK novo incluindo 'Empréstimo'
    ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_forma_pagamento_check
    CHECK (
        forma_pagamento IN (
            'PIX', 'Dinheiro', 'Débito', 'Cartão de crédito',
            'Empréstimo', 'Transferência', 'Boleto', 'Outro'
        )
    );
END $$;
