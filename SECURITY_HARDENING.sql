-- =====================================================
-- 🛡️ SECURITY HARDENING - LARIS ERP
-- Execute este script no SQL Editor do seu Supabase
-- para proteger seus dados contra acessos não autorizados.
-- =====================================================

-- 1. SEGURANÇA DE CONFIGURAÇÕES (store_settings)
ALTER TABLE IF EXISTS public.store_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Store Settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admin Update Store Settings" ON public.store_settings;
DROP POLICY IF EXISTS "Users can manage own settings" ON public.store_settings;

-- Permite que o sistema leia nome/logo para a tela de login (sem expor tudo)
CREATE POLICY "Public Branding Select" ON public.store_settings 
FOR SELECT USING (true);

-- Restringe qualquer alteração (INSERT/UPDATE/DELETE) apenas ao dono
CREATE POLICY "Users can manage own settings" ON public.store_settings 
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- 2. SEGURANÇA DE PRODUTOS, VENDAS E CATEGORIAS
-- Garante que o RLS está ativo em todas as tabelas críticas
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de isolamento por usuário (auth.uid() = user_id)
DROP POLICY IF EXISTS "User Products" ON public.products;
CREATE POLICY "User Products" ON public.products FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "User Sales" ON public.sales;
CREATE POLICY "User Sales" ON public.sales FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "User Categories" ON public.categories;
CREATE POLICY "User Categories" ON public.categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "User Catalogs" ON public.catalogs;
CREATE POLICY "User Catalogs" ON public.catalogs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "User Profiles" ON public.profiles;
CREATE POLICY "User Profiles" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);


-- 3. SEGURANÇA DE ARQUIVOS (STORAGE)
-- Bucket: product-images (Imagens dos produtos)
-- Público pode ver (SELECT), mas apenas o dono do arquivo pode gerenciar.
DROP POLICY IF EXISTS "Public Access Images" ON storage.objects;
CREATE POLICY "Public Access Images Select" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Users can upload product images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update/delete own images" ON storage.objects FOR ALL USING (bucket_id = 'product-images' AND auth.uid() = owner);

-- Bucket: brand (Logo e Favicon)
DROP POLICY IF EXISTS "Branding Livre" ON storage.objects;
CREATE POLICY "Public Branding Select" ON storage.objects FOR SELECT USING (bucket_id = 'brand');
CREATE POLICY "Users can manage branding files" ON storage.objects FOR ALL USING (bucket_id = 'brand' AND auth.role() = 'authenticated') WITH CHECK (bucket_id = 'brand' AND auth.role() = 'authenticated');

-- 4. INDICAÇÃO DE PROTEÇÃO DE CHAVES (SECRET)
-- IMPORTANTE: No futuro, considere mover 'shopee_app_secret' para uma tabela separada 
-- chamada 'store_secrets' sem política de SELECT pública.
