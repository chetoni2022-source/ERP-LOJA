-- Migração: Simulador de Lucros e Taxas de Marketplace
-- Esta migração adiciona chaves de configuração de impostos para Shopee e TikTok Shop.

ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS shopee_commission_pct NUMERIC DEFAULT 20.0,
ADD COLUMN IF NOT EXISTS shopee_fixed_fee NUMERIC DEFAULT 4.0,
ADD COLUMN IF NOT EXISTS shopee_commission_cap NUMERIC DEFAULT 100.0,
ADD COLUMN IF NOT EXISTS tiktok_commission_pct NUMERIC DEFAULT 15.0,
ADD COLUMN IF NOT EXISTS tiktok_fixed_fee NUMERIC DEFAULT 4.0,
ADD COLUMN IF NOT EXISTS tiktok_commission_cap NUMERIC DEFAULT 100.0;

-- Atualizar registros existentes com valores padrão brasileiros
UPDATE store_settings SET 
  shopee_commission_pct = COALESCE(shopee_commission_pct, 20.0),
  shopee_fixed_fee = COALESCE(shopee_fixed_fee, 4.0),
  shopee_commission_cap = COALESCE(shopee_commission_cap, 100.0),
  tiktok_commission_pct = COALESCE(tiktok_commission_pct, 15.0),
  tiktok_fixed_fee = COALESCE(tiktok_fixed_fee, 4.0),
  tiktok_commission_cap = COALESCE(tiktok_commission_cap, 100.0);
