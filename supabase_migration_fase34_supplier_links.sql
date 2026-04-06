-- Migração Fase 34: Link do Fornecedor na Tabela de Produtos
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS supplier_link TEXT DEFAULT NULL;
