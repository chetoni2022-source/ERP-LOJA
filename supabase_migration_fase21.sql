-- =====================================================
-- Migration Fase 21: Multi-Tenancy & Profit Tracking
-- =====================================================

-- 1. Fix Store Settings for Multi-Tenancy
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- If there's an existing row without user_id, it might be the "demo" which should be linked to the first admin or deleted. 
-- For safety, we'll just allow each user to have their own.
DROP POLICY IF EXISTS "Public Store Settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admin Update Store Settings" ON public.store_settings;

CREATE POLICY "Users can manage their own store settings" 
ON public.store_settings 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 2. Add Profit Tracking fields to Products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS other_costs DECIMAL(10,2) DEFAULT 0;

-- 3. Add Profit Tracking to Sales (freeze unit cost at time of sale)
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS unit_cost_at_sale DECIMAL(10,2) DEFAULT 0;

-- 4. Enforce RLS on all tables that might be missing it
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own products" ON public.products;
CREATE POLICY "Users can manage their own products" 
ON public.products FOR ALL TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own sales" ON public.sales;
CREATE POLICY "Users can manage their own sales" 
ON public.sales FOR ALL TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.catalogs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own catalogs" ON public.catalogs;
CREATE POLICY "Users can manage their own catalogs" 
ON public.catalogs FOR ALL TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Catalog Items (Access based on Catalog ownership)
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own catalog items" ON public.catalog_items;
CREATE POLICY "Users can manage their own catalog items" 
ON public.catalog_items FOR ALL TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.catalogs 
        WHERE catalogs.id = catalog_items.catalog_id 
        AND catalogs.user_id = auth.uid()
    )
);

-- 5. Team Management
CREATE TABLE IF NOT EXISTS public.team_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'sales',
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(email, invited_by)
);

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own invites" ON public.team_invites;
CREATE POLICY "Users can manage their own invites" 
ON public.team_invites FOR ALL TO authenticated 
USING (auth.uid() = invited_by) 
WITH CHECK (auth.uid() = invited_by);

-- Ensure Profiles are scoped or have RLS (Simple owner-based for now)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can see themselves" ON public.profiles;
CREATE POLICY "Users can see themselves" ON public.profiles FOR SELECT USING (auth.uid() = id);
-- Note: Team members visibility should be added here later.
