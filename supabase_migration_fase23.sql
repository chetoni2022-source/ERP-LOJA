-- Add lead_sources column to store_settings
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS lead_sources TEXT[] DEFAULT '{"WhatsApp", "Instagram", "Ads", "Indicação", "Loja"}';
