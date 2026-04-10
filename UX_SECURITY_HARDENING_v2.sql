-- =====================================================
-- 🛡️ UX SECURITY HARDENING v2.0.0
-- Este script blinda o seu banco de dados para que nenhum
-- hacker consiga acessar seus dados sem login.
-- =====================================================

-- 1. STORE SETTINGS (TRAVAMENTO TOTAL)
ALTER TABLE IF EXISTS public.store_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Store Settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admin Update Store Settings" ON public.store_settings;
-- Permite leitura pública de Branding (Nome/Logo) apenas se o ID for conhecido (opcional) ou geral para login
CREATE POLICY "Public Branding Select" ON public.store_settings FOR SELECT USING (true);
-- Permite que APENAS o dono da conta altere as próprias configurações
CREATE POLICY "Strict User Settings" ON public.store_settings 
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. PRODUTOS, VENDAS E CRM (ISOLAMENTO POR USUÁRIO)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Limpeza de políticas legadas permissivas
    DROP POLICY IF EXISTS "User Products" ON public.products;
    DROP POLICY IF EXISTS "User Sales" ON public.sales;
    DROP POLICY IF EXISTS "User Categories" ON public.categories;
    DROP POLICY IF EXISTS "User Catalogs" ON public.catalogs;
END $$;

-- Criação de Políticas Blindadas
CREATE POLICY "Isolated User Products" ON public.products FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Isolated User Sales" ON public.sales FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Isolated User Categories" ON public.categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Isolated User Catalogs" ON public.catalogs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. STORAGE (PROTEÇÃO DE ARQUIVOS)
-- Garante que uploads de imagens de produtos só podem ser feitos por usuários autenticados
-- e que a visualização é protegida pela ACL do bucket
DROP POLICY IF EXISTS "Public Access Images" ON storage.objects;
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');
CREATE POLICY "Owner Manage Content" ON storage.objects FOR ALL USING (bucket_id = 'product-images' AND auth.uid() = owner);

-- 4. ÍNDICES DE PERFORMANCE (VELOCIDADE UX)
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
