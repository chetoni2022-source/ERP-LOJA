-- Adicionar coluna de imposto global para cálculos de rentabilidade
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS global_tax_pct NUMERIC DEFAULT 0.0;

-- Atualizar registros existentes com 0% por padrão
UPDATE store_settings SET 
  global_tax_pct = COALESCE(global_tax_pct, 0.0);
