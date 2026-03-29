-- =====================================================
-- MIGRAÇÃO FASE 17 — Execute no Supabase SQL Editor
-- =====================================================

-- Tabela de Clientes
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User Customers" ON customers;
CREATE POLICY "User Customers" ON customers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Tabela de Movimentação de Estoque
CREATE TABLE IF NOT EXISTS product_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
  quantity INTEGER NOT NULL,
  reason TEXT,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE product_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User Movements" ON product_movements;
CREATE POLICY "User Movements" ON product_movements FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Colunas novas em tabelas existentes (seguro rodar mesmo com tabelas existentes)
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS monthly_goal DECIMAL(10,2) DEFAULT 0;
