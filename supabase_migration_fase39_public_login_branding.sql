-- Fase 39: branding publico e seguro para tela de login multiempresa.
-- Expoe apenas campos nao sensiveis necessarios para white-label antes do login.

begin;

alter table public.tenant_branding
  add column if not exists login_bg_color text default '#000000',
  add column if not exists login_bg_mode text default 'image';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tenant_branding_login_bg_mode_check'
  ) then
    alter table public.tenant_branding
      add constraint tenant_branding_login_bg_mode_check
      check (login_bg_mode in ('image', 'color', 'gradient'));
  end if;
end $$;

create or replace view public.tenant_login_branding as
select
  t.id as tenant_id,
  t.slug as tenant_slug,
  t.name as tenant_name,
  tb.store_name,
  tb.logo_url,
  tb.favicon_url,
  tb.login_bg_url,
  tb.login_bg_color,
  tb.login_bg_mode,
  tb.primary_color,
  tb.whatsapp_number,
  greatest(coalesce(tb.updated_at, t.created_at), t.created_at) as updated_at
from public.tenants t
left join public.tenant_branding tb on tb.tenant_id = t.id
where t.status in ('active', 'trial');

comment on view public.tenant_login_branding is
  'Public, non-sensitive branding fields used to render tenant-specific login screens before authentication.';

grant select on public.tenant_login_branding to anon, authenticated;

commit;
