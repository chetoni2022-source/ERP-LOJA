-- Migração Fase 27: Shopee Hub Sales Markers

-- Atualiza a tabela de vendas para diferenciar canais e tarifas da Shopee
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS origin VARCHAR(50) DEFAULT 'erp',
ADD COLUMN IF NOT EXISTS shopee_order_id VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS shopee_fee_pct NUMERIC DEFAULT 0;

-- Atualizar histórico antigo para constarem como 'erp' nativamente
UPDATE sales SET origin = 'erp' WHERE origin IS NULL;
