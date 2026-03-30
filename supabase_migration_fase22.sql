-- Adicionar coluna de custos adicionais (JSONB) para flexibilidade total
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS additional_costs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS additional_costs JSONB DEFAULT '[]'::jsonb;

-- Garantir que a tabela de convites seja acessível
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own invites" ON public.team_invites;
CREATE POLICY "Users can manage their own invites" ON public.team_invites FOR ALL TO authenticated USING (auth.uid() = invited_by) WITH CHECK (auth.uid() = invited_by);

-- Refresh schema cache
COMMENT ON TABLE public.products IS 'Produtos com suporte a custos dinâmicos v2.2';
