-- ============================================================
-- MIGRAÇÃO: ERP LARIS → SAAS MULTI-TENANT
-- Execute no SQL Editor do Supabase (https://app.supabase.com)
-- Rode TUDO de uma vez ou seção por seção na ordem abaixo
-- ============================================================

-- ── SEÇÃO 1: TABELA DE TENANTS (Empresas Clientes) ──────────
CREATE TABLE IF NOT EXISTS public.tenants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,          -- ex: 'laris', 'bijou-eco'
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
  owner_email     text,
  last_accessed_at timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ── SEÇÃO 2: BRANDING POR TENANT ────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenant_branding (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  store_name      text,
  logo_url        text,
  favicon_url     text,
  login_bg_url    text,
  primary_color   text DEFAULT '#a855f7',    -- cor primária em hex
  whatsapp_number text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(tenant_id)
);

-- ── SEÇÃO 3: CRIAR TENANT PADRÃO (Laris Acessórios) ─────────
-- Isso garante que seus dados atuais sejam vinculados corretamente
INSERT INTO public.tenants (name, slug, status, owner_email)
VALUES ('Laris Acessórios', 'laris', 'active', 'cheto@laris.com')
ON CONFLICT (slug) DO NOTHING;

-- Salvar o UUID do tenant Laris para usar nas migrações abaixo
-- (Se precisar consultar: SELECT id FROM tenants WHERE slug = 'laris')

-- ── SEÇÃO 4: ADICIONAR tenant_id NAS TABELAS EXISTENTES ─────

-- Tabela: profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id),
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- Atualizar profiles existentes com o tenant Laris
UPDATE public.profiles
SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'laris')
WHERE tenant_id IS NULL;

-- Tabela: products
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

UPDATE public.products
SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'laris')
WHERE tenant_id IS NULL;

-- Tabela: sales
ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

UPDATE public.sales
SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'laris')
WHERE tenant_id IS NULL;

-- Tabela: customers
ALTER TABLE public.customers 
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

UPDATE public.customers
SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'laris')
WHERE tenant_id IS NULL;

-- Tabela: categories
ALTER TABLE public.categories 
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

UPDATE public.categories
SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'laris')
WHERE tenant_id IS NULL;

-- Tabela: catalogs (se existir)
ALTER TABLE public.catalogs 
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

UPDATE public.catalogs
SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'laris')
WHERE tenant_id IS NULL;

-- Tabela: store_settings
ALTER TABLE public.store_settings 
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

UPDATE public.store_settings
SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'laris')
WHERE tenant_id IS NULL;

-- ── SEÇÃO 5: FUNÇÃO HELPER PARA PEGAR tenant_id DO USUÁRIO LOGADO ──
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ── SEÇÃO 6: POLÍTICAS RLS (Isolamento Automático de Dados) ──
-- Habilitar RLS nas tabelas
ALTER TABLE public.products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_branding ENABLE ROW LEVEL SECURITY;

-- REMOVER políticas antigas (limpeza para evitar erros de duplicata)
DROP POLICY IF EXISTS "Users can see own products" ON public.products;
DROP POLICY IF EXISTS "tenant_products_all" ON public.products;

DROP POLICY IF EXISTS "Users can see own sales" ON public.sales;
DROP POLICY IF EXISTS "tenant_sales_all" ON public.sales;

DROP POLICY IF EXISTS "Users can see own customers" ON public.customers;
DROP POLICY IF EXISTS "tenant_customers_all" ON public.customers;

DROP POLICY IF EXISTS "Users can see own categories" ON public.categories;
DROP POLICY IF EXISTS "tenant_categories_all" ON public.categories;

DROP POLICY IF EXISTS "Users can see own catalogs" ON public.catalogs;
DROP POLICY IF EXISTS "tenant_catalogs_all" ON public.catalogs;

DROP POLICY IF EXISTS "Users can see own store_settings" ON public.store_settings;
DROP POLICY IF EXISTS "tenant_store_settings_all" ON public.store_settings;

DROP POLICY IF EXISTS "tenant_profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "tenant_profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "tenant_profiles_update" ON public.profiles;

DROP POLICY IF EXISTS "tenant_self_select" ON public.tenants;
DROP POLICY IF EXISTS "super_admin_tenants_all" ON public.tenants;

DROP POLICY IF EXISTS "branding_public_read" ON public.tenant_branding;
DROP POLICY IF EXISTS "branding_tenant_write" ON public.tenant_branding;
DROP POLICY IF EXISTS "super_admin_branding_all" ON public.tenant_branding;

-- POLICIES: products
CREATE POLICY "tenant_products_all" ON public.products
  FOR ALL USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "super_admin_products_all" ON public.products
  FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');

-- POLICIES: sales
CREATE POLICY "tenant_sales_all" ON public.sales
  FOR ALL USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "super_admin_sales_all" ON public.sales
  FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');

-- POLICIES: customers
CREATE POLICY "tenant_customers_all" ON public.customers
  FOR ALL USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "super_admin_customers_all" ON public.customers
  FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');

-- POLICIES: categories
CREATE POLICY "tenant_categories_all" ON public.categories
  FOR ALL USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "super_admin_categories_all" ON public.categories
  FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');

-- POLICIES: catalogs
CREATE POLICY "tenant_catalogs_all" ON public.catalogs
  FOR ALL USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "super_admin_catalogs_all" ON public.catalogs
  FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');

-- POLICIES: store_settings
CREATE POLICY "tenant_store_settings_all" ON public.store_settings
  FOR ALL USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "super_admin_store_settings_all" ON public.store_settings
  FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');

-- POLICIES: profiles (cada usuário vê só o próprio perfil, admin vê todos do tenant)
CREATE POLICY "tenant_profiles_select" ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
    OR tenant_id = public.get_user_tenant_id()
  );

CREATE POLICY "tenant_profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (true);  -- Permite cadastro (o código define o tenant)

CREATE POLICY "tenant_profiles_update" ON public.profiles
  FOR UPDATE USING (id = auth.uid() OR tenant_id = public.get_user_tenant_id());

-- POLICIES: tenants (cada usuário vê apenas o seu tenant)
CREATE POLICY "tenant_self_select" ON public.tenants
  FOR SELECT USING (
    id = public.get_user_tenant_id()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Super admin pode ver e editar todos os tenants
CREATE POLICY "super_admin_tenants_all" ON public.tenants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- POLICIES: tenant_branding (pública para leitura na tela de login, privada para escrita)
CREATE POLICY "branding_public_read" ON public.tenant_branding
  FOR SELECT USING (true);  -- qualquer um pode ler o branding (necessário para tela de login)

CREATE POLICY "branding_tenant_write" ON public.tenant_branding
  FOR ALL USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "super_admin_branding_all" ON public.tenant_branding
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ── SEÇÃO 7: PROMOVER O SEU USUÁRIO PARA SUPER ADMIN ────────
-- IMPORTANTE: Substitua 'SEU_EMAIL_AQUI' pelo seu e-mail de login
-- Rode essa linha SEPARADAMENTE após o restante
-- UPDATE public.profiles SET role = 'super_admin' WHERE id = (
--   SELECT id FROM auth.users WHERE email = 'SEU_EMAIL_AQUI'
-- );

-- ── SEÇÃO 8: ÍNDICES DE PERFORMANCE ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_tenant_id    ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_tenant_id       ON public.sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id   ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_categories_tenant_id  ON public.categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id    ON public.profiles(tenant_id);

-- ── SEÇÃO 9: FUNÇÃO PARA ATUALIZAR ÚLTIMO ACESSO DA EMPRESA ──
CREATE OR REPLACE FUNCTION public.update_tenant_last_access()
RETURNS trigger AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN
    UPDATE public.tenants 
    SET last_accessed_at = now() 
    WHERE id = NEW.tenant_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar acesso sempre que um usuário logar (detectado por update no profile)
DROP TRIGGER IF EXISTS tr_update_tenant_access ON public.profiles;
CREATE TRIGGER tr_update_tenant_access
  AFTER UPDATE OF last_login_at ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tenant_last_access();

-- ── CONCLUÍDO ────────────────────────────────────────────────
-- Após rodar este script:
-- 1. Edite a linha na SEÇÃO 7 com seu e-mail e execute-a
-- 2. Seus dados da Laris já estarão no tenant 'laris'
-- 3. Novos tenants criados pelo Super Admin terão dados completamente isolados
