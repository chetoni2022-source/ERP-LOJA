-- Migração Fase 28: Hub de Mídias (Shopee/Reels) e Fornecedores

-- Ajuste na tabela de produtos para guardar o nome do fornecedor-chave
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(255) DEFAULT NULL;

-- JSON para guardar os links flexíveis de ativos de mídia
-- Exemplo de estrutura: {"shopee_video": "link", "reels_video": "link"}
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS media_assets JSONB DEFAULT '{}'::jsonb;
