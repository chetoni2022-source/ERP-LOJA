-- =====================================================
-- SCRIPT DE CORREÇÃO: COLUNAS FALTANTES (LARIS ERP - V2)
-- Instruções: Copie este código e execute no SQL Editor do seu Supabase Dashboard.
-- =====================================================

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sku TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS supplier_link TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS shopee_price NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tiktok_price NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS media_assets JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS ean VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS weight_g INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS length_cm INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS width_cm INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS height_cm INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS additional_costs JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS variations JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS shopee_item_id TEXT DEFAULT NULL;

-- Força a atualização do cache do PostgREST para o ERP reconhecer as colunas imediatamente
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
