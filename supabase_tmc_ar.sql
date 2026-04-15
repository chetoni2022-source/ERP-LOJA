-- TMC AR - MANAGEMENT SYSTEM DDL
-- Branding: Deep Dark (#0A0A0A), Laranja Vibrante (#FF6B00), Azul Neon (#00A8FF)

-- 1. CLEANUP (Optional - only if starting fresh)
-- DROP TABLE IF EXISTS public.pedidos_cliente CASCADE;
-- DROP TABLE IF EXISTS public.itens_os CASCADE;
-- DROP TABLE IF EXISTS public.ordens_servico CASCADE;
-- DROP TABLE IF EXISTS public.produtos CASCADE;
-- DROP TABLE IF EXISTS public.veiculos CASCADE;
-- DROP TABLE IF EXISTS public.clientes CASCADE;

-- 2. TABLES

-- Clientes
CREATE TABLE IF NOT EXISTS public.clientes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome text NOT NULL,
    telefone text NOT NULL,
    email text,
    cpf text,
    created_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);

-- Veículos
CREATE TABLE IF NOT EXISTS public.veiculos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE,
    placa text UNIQUE NOT NULL,
    modelo text NOT NULL,
    marca text NOT NULL,
    cor text,
    ano int,
    km_atual int,
    created_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);

-- Produtos / Serviços do Catálogo
CREATE TABLE IF NOT EXISTS public.produtos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome text NOT NULL,
    descricao text,
    categoria text, -- 'Serviço' / 'Peça' / 'Kit'
    preco numeric(10,2) NOT NULL,
    foto_url text,
    ativo boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);

-- Ordens de Serviço (OS)
CREATE TABLE IF NOT EXISTS public.ordens_servico (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    veiculo_id uuid REFERENCES public.veiculos(id) ON DELETE CASCADE,
    status text DEFAULT 'Aguardando Aprovação',
    -- Campos Técnicos Ar-Condicionado
    pressao_lado_alto numeric, -- bar
    pressao_lado_baixo numeric, -- bar
    temperatura_saida numeric, -- °C
    estado_compressor text,
    estado_filtro text,
    gas_utilizado text, -- R134a / R1234yf
    quantidade_gas numeric, -- g
    observacoes text,
    fotos_urls text[] DEFAULT '{}',
    -- Financeiro
    total numeric(10,2) DEFAULT 0,
    desconto numeric(5,2) DEFAULT 0,
    -- Link Público
    slug text UNIQUE,
    slug_expires_at timestamptz DEFAULT (now() + interval '48 hours'),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);

-- Itens da OS
CREATE TABLE IF NOT EXISTS public.itens_os (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    os_id uuid REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
    produto_id uuid REFERENCES public.produtos(id),
    descricao_avulso text,
    quantidade int DEFAULT 1,
    preco_unitario numeric(10,2) NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Pedidos do Cliente (via link público)
CREATE TABLE IF NOT EXISTS public.pedidos_cliente (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    os_id uuid REFERENCES public.ordens_servico(id),
    itens_selecionados jsonb, -- [{id, qty, price}]
    total numeric(10,2),
    status text DEFAULT 'solicitado',
    cliente_nome text,
    created_at timestamptz DEFAULT now()
);

-- 3. INDICES
CREATE INDEX IF NOT EXISTS idx_veiculos_placa ON public.veiculos(placa);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON public.clientes(nome);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_slug ON public.ordens_servico(slug);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_veiculo ON public.ordens_servico(veiculo_id);

-- 4. RLS POTICIES (Security Hardening)

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_os ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_cliente ENABLE ROW LEVEL SECURITY;

-- Admin Policies (Full access for authenticated staff)
-- Assuming a role or check
CREATE POLICY admin_all_clientes ON public.clientes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY admin_all_veiculos ON public.veiculos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY admin_all_produtos ON public.produtos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY admin_all_os ON public.ordens_servico FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY admin_all_itens_os ON public.itens_os FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY admin_all_pedidos ON public.pedidos_cliente FOR ALL USING (auth.role() = 'authenticated');

-- Public Policies (Anonymous access by slug)
CREATE POLICY public_read_os ON public.ordens_servico FOR SELECT 
USING (
    slug IS NOT NULL 
    AND slug_expires_at > now()
);

CREATE POLICY public_read_itens_os ON public.itens_os FOR SELECT 
USING (
    os_id IN (
        SELECT id FROM public.ordens_servico 
        WHERE slug IS NOT NULL AND slug_expires_at > now()
    )
);

CREATE POLICY public_insert_pedidos ON public.pedidos_cliente FOR INSERT 
WITH CHECK (true); -- We validate in backend/edge but allow insert for confirmation

-- 5. SOFT DELETE VIEW (Optional helper)
CREATE OR REPLACE VIEW public.active_clientes AS SELECT * FROM public.clientes WHERE deleted_at IS NULL;
CREATE OR REPLACE VIEW public.active_veiculos AS SELECT * FROM public.veiculos WHERE deleted_at IS NULL;
CREATE OR REPLACE VIEW public.active_produtos AS SELECT * FROM public.produtos WHERE deleted_at IS NULL;
CREATE OR REPLACE VIEW public.active_os AS SELECT * FROM public.ordens_servico WHERE deleted_at IS NULL;
