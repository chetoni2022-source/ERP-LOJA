-- =====================================================
-- Supabase Schema Completo - Laris ERP
-- Execute TUDO no SQL Editor do Supabase
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Store Settings (White-label do ERP)
CREATE TABLE IF NOT EXISTS store_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_name TEXT DEFAULT 'Laris Acessórios',
  logo_url TEXT,
  favicon_url TEXT,
  theme TEXT DEFAULT 'system',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Store Settings" ON store_settings;
DROP POLICY IF EXISTS "Admin Update Store Settings" ON store_settings;
CREATE POLICY "Public Store Settings" ON store_settings FOR SELECT USING (true);
CREATE POLICY "Admin Update Store Settings" ON store_settings FOR ALL USING (true) WITH CHECK (true);

-- 2. Profiles (Gestão de Equipe)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'admin', 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. CATEGORIAS (Nichos/Coleções dos Produtos)
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User Categories" ON categories;
CREATE POLICY "User Categories" ON categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Produtos (Estoque)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  sale_price DECIMAL(10,2),
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- Injeções seguras (caso a tabela já exista sem essas colunas)
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- 5. Vendas (com CRM de Comprador e Origem)
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  customer_name TEXT,
  lead_source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- Injeções seguras de colunas CRM (caso a tabela já exista)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS lead_source TEXT;

-- 6. Catálogos
CREATE TABLE IF NOT EXISTS catalogs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Itens do Catálogo
CREATE TABLE IF NOT EXISTS catalog_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  catalog_id UUID REFERENCES catalogs(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('brand', 'brand', true) ON CONFLICT DO NOTHING;

-- STORAGE POLICIES
DROP POLICY IF EXISTS "Imagens de Produto Livres" ON storage.objects;
DROP POLICY IF EXISTS "Public Access Images" ON storage.objects;
DROP POLICY IF EXISTS "Branding Livre" ON storage.objects;
CREATE POLICY "Public Access Images" ON storage.objects FOR ALL USING (bucket_id = 'product-images') WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "Branding Livre" ON storage.objects FOR ALL USING (bucket_id = 'brand') WITH CHECK (bucket_id = 'brand');
