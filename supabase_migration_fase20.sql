-- Create team_invites table
CREATE TABLE IF NOT EXISTS public.team_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'sales',
    invited_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Policies for team_invites
CREATE POLICY "Admins can manage invites" 
ON public.team_invites 
FOR ALL 
TO authenticated 
USING (
    EXISTS ( SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin' )
);

CREATE POLICY "Anyone can see their own invite" 
ON public.team_invites 
FOR SELECT 
TO public 
USING (email = auth.jwt()->>'email');
