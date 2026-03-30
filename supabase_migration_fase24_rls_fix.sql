-- =====================================================
-- Migration Fase 24: Fix Public Catalog Access (RLS)
-- =====================================================

-- 1. Enable RLS on all related tables (just in case they aren't)
ALTER TABLE IF EXISTS public.catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.catalog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.store_settings ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing public policies if any (to avoid duplicates)
DROP POLICY IF EXISTS "Acesso público aos catálogos" ON public.catalogs;
DROP POLICY IF EXISTS "Acesso público aos itens dos catálogos" ON public.catalog_items;
DROP POLICY IF EXISTS "Acesso público às categorias dos catálogos" ON public.catalog_categories;
DROP POLICY IF EXISTS "Acesso público aos produtos" ON public.products;
DROP POLICY IF EXISTS "Acesso público às categorias" ON public.categories;
DROP POLICY IF EXISTS "Acesso público às configurações da loja" ON public.store_settings;

-- 3. Create SELECT policies for 'anon' role (public visitors)
CREATE POLICY "Acesso público aos catálogos" ON public.catalogs FOR SELECT TO anon USING (true);
CREATE POLICY "Acesso público aos itens dos catálogos" ON public.catalog_items FOR SELECT TO anon USING (true);
CREATE POLICY "Acesso público às categorias dos catálogos" ON public.catalog_categories FOR SELECT TO anon USING (true);
CREATE POLICY "Acesso público aos produtos" ON public.products FOR SELECT TO anon USING (true);
CREATE POLICY "Acesso público às categorias" ON public.categories FOR SELECT TO anon USING (true);
CREATE POLICY "Acesso público às configurações da loja" ON public.store_settings FOR SELECT TO anon USING (true);
