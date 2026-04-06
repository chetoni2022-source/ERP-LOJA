-- Migração: Evolução da Precificação Omnichannel e Metadados
-- Adiciona colunas para definir preços manuais por plataforma e controle de atualização.

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS shopee_price NUMERIC,
ADD COLUMN IF NOT EXISTS tiktok_price NUMERIC,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Garantir que a coluna global de preço original seja mantida como base (Site/Público)
-- Atualizar registros existentes se necessário (opcional)
UPDATE products SET updated_at = NOW() WHERE updated_at IS NULL;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_products_updated_at ON products;

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
