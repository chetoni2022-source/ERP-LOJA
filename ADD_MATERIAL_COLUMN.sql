-- Adicionar coluna material na tabela products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS material text DEFAULT 'Outro';

-- Criar um índice para melhorar a performance de filtragem
CREATE INDEX IF NOT EXISTS idx_products_material ON public.products(material);

-- Comentário para documentação do banco
COMMENT ON COLUMN public.products.material IS 'Tipo de metal do produto (Ouro, Prata, Outro)';
