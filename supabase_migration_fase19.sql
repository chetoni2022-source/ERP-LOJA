-- =====================================================
-- MIGRAÇÃO FASE 19 — Catálogos 2.0
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Coluna para cores personalizadas (JSON) na tabela de catálogos
ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS custom_colors JSONB;

-- 2. Tabela de link entre catálogos e categorias
CREATE TABLE IF NOT EXISTS catalog_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  catalog_id UUID REFERENCES catalogs(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE catalog_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User CatalogCategories" ON catalog_categories;
CREATE POLICY "User CatalogCategories" ON catalog_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM catalogs WHERE id = catalog_categories.catalog_id AND user_id = auth.uid())
  );
