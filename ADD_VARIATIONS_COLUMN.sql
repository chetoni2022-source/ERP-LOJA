-- SQL Migration para habilitar Variações de Produtos (Tamanhos, Cores e Modelos)
-- Rode este arquivo na seção SQL Editor do seu projeto Supabase.

-- Tentar adicionar a coluna de variações na tabela existente
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS variations JSONB DEFAULT '[]'::jsonb;

-- Criar um índice para otimização de busca se o catálogo basear-se muito em leitura de JSON (opcional)
-- CREATE INDEX IF NOT EXISTS idx_products_variations ON public.products USING GIN (variations);

-- Atualiza o cache do postgREST do Supabase para refletir a nova coluna imediatamente
NOTIFY pgrst, 'reload schema';
