-- Fase 35: team invites carry tenant context and can be accepted by the invited email.
-- This keeps invites scoped by RLS while allowing a newly signed-in invited user
-- to read only the invite addressed to their own JWT email.

ALTER TABLE public.team_invites
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

UPDATE public.team_invites ti
SET tenant_id = p.tenant_id
FROM public.profiles p
WHERE ti.invited_by = p.id
  AND ti.tenant_id IS NULL
  AND p.tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_team_invites_tenant_id
ON public.team_invites(tenant_id);

CREATE INDEX IF NOT EXISTS idx_team_invites_lower_email
ON public.team_invites((lower(email)));

DROP POLICY IF EXISTS "Invitees can view their own invite" ON public.team_invites;
CREATE POLICY "Invitees can view their own invite"
ON public.team_invites
FOR SELECT
TO authenticated
USING (lower(email) = lower((auth.jwt() ->> 'email')));
