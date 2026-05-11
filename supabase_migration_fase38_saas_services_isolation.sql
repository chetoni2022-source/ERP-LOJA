-- Fase 38: SaaS multiempresa, servicos, uso e isolamento por tenant.
-- Execute no Supabase SQL Editor ou via MCP.

begin;

create schema if not exists app_private;

grant usage on schema app_private to anon, authenticated;

create or replace function app_private.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.tenant_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1
$$;

create or replace function app_private.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
  limit 1
$$;

create or replace function app_private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(app_private.current_user_role() = 'super_admin', false)
$$;

create or replace function app_private.can_access_tenant(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    app_private.is_super_admin()
    or exists (
      select 1
      from public.tenants t
      where t.id = target_tenant_id
        and t.status in ('active', 'trial')
        and target_tenant_id = app_private.current_tenant_id()
    )
$$;

grant execute on function app_private.current_tenant_id() to authenticated;
grant execute on function app_private.current_user_role() to authenticated;
grant execute on function app_private.is_super_admin() to authenticated;
grant execute on function app_private.can_access_tenant(uuid) to authenticated;

alter table public.tenants
  add column if not exists last_accessed_at timestamptz;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  cost_price numeric(10,2),
  duration_minutes integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sales
  add column if not exists service_id uuid references public.services(id) on delete set null,
  add column if not exists sale_type text not null default 'product';

alter table public.product_movements
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

create table if not exists public.tenant_usage_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null default 'page_view',
  route text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

with fallback_tenant as (
  select id from public.tenants order by created_at limit 1
)
update public.products p
set tenant_id = coalesce(p.tenant_id, pr.tenant_id, (select id from fallback_tenant))
from public.profiles pr
where p.user_id = pr.id
  and p.tenant_id is null;

with fallback_tenant as (
  select id from public.tenants order by created_at limit 1
)
update public.categories c
set tenant_id = coalesce(c.tenant_id, pr.tenant_id, (select id from fallback_tenant))
from public.profiles pr
where c.user_id = pr.id
  and c.tenant_id is null;

with fallback_tenant as (
  select id from public.tenants order by created_at limit 1
)
update public.customers c
set tenant_id = coalesce(c.tenant_id, pr.tenant_id, (select id from fallback_tenant))
from public.profiles pr
where c.user_id = pr.id
  and c.tenant_id is null;

with fallback_tenant as (
  select id from public.tenants order by created_at limit 1
)
update public.sales s
set tenant_id = coalesce(s.tenant_id, pr.tenant_id, (select id from fallback_tenant)),
    sale_type = case when s.service_id is not null then 'service' else 'product' end
from public.profiles pr
where s.user_id = pr.id
  and s.tenant_id is null;

with fallback_tenant as (
  select id from public.tenants order by created_at limit 1
)
update public.catalogs c
set tenant_id = coalesce(c.tenant_id, pr.tenant_id, (select id from fallback_tenant))
from public.profiles pr
where c.user_id = pr.id
  and c.tenant_id is null;

update public.product_movements pm
set tenant_id = p.tenant_id
from public.products p
where pm.product_id = p.id
  and pm.tenant_id is null;

create index if not exists idx_services_tenant_id on public.services(tenant_id);
create index if not exists idx_services_user_id on public.services(user_id);
create index if not exists idx_sales_service_id on public.sales(service_id);
create index if not exists idx_product_movements_tenant_id on public.product_movements(tenant_id);
create index if not exists idx_tenant_usage_events_tenant_created on public.tenant_usage_events(tenant_id, created_at desc);
create index if not exists idx_tenants_last_accessed_at on public.tenants(last_accessed_at desc);

create or replace function app_private.touch_tenant_last_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tenants
  set last_accessed_at = now(), updated_at = now()
  where id = new.tenant_id;
  return new;
end;
$$;

drop trigger if exists tr_touch_tenant_usage on public.tenant_usage_events;
create trigger tr_touch_tenant_usage
after insert on public.tenant_usage_events
for each row execute function app_private.touch_tenant_last_access();

grant execute on function app_private.touch_tenant_last_access() to authenticated;

alter table public.services enable row level security;
alter table public.tenant_usage_events enable row level security;
alter table public.product_movements enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.customers enable row level security;
alter table public.categories enable row level security;
alter table public.catalogs enable row level security;
alter table public.catalog_items enable row level security;
alter table public.catalog_categories enable row level security;
alter table public.store_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_branding enable row level security;
alter table public.team_invites enable row level security;

grant select, insert, update, delete on public.services to authenticated;
grant select, insert on public.tenant_usage_events to authenticated;
grant select, insert, update, delete on public.product_movements to authenticated;

-- Remove permissive legacy policies.
drop policy if exists "Acesso publico aos produtos" on public.products;
drop policy if exists "Acesso público aos produtos" on public.products;
drop policy if exists "User Products" on public.products;
drop policy if exists "Users can manage their own products" on public.products;
drop policy if exists "tenant_products_all" on public.products;
drop policy if exists "super_admin_products_all" on public.products;

drop policy if exists "User Sales" on public.sales;
drop policy if exists "Users can manage their own sales" on public.sales;
drop policy if exists "tenant_sales_all" on public.sales;
drop policy if exists "super_admin_sales_all" on public.sales;

drop policy if exists "User Customers" on public.customers;
drop policy if exists "tenant_customers_all" on public.customers;
drop policy if exists "super_admin_customers_all" on public.customers;

drop policy if exists "Acesso publico as categorias" on public.categories;
drop policy if exists "Acesso público às categorias" on public.categories;
drop policy if exists "User Categories" on public.categories;
drop policy if exists "tenant_categories_all" on public.categories;
drop policy if exists "super_admin_categories_all" on public.categories;

drop policy if exists "Acesso publico aos catalogos" on public.catalogs;
drop policy if exists "Acesso público aos catálogos" on public.catalogs;
drop policy if exists "User Catalogs" on public.catalogs;
drop policy if exists "Users can manage their own catalogs" on public.catalogs;
drop policy if exists "tenant_catalogs_all" on public.catalogs;
drop policy if exists "super_admin_catalogs_all" on public.catalogs;

drop policy if exists "Acesso publico aos itens dos catalogos" on public.catalog_items;
drop policy if exists "Acesso público aos itens dos catálogos" on public.catalog_items;
drop policy if exists "Users can manage their own catalog items" on public.catalog_items;

drop policy if exists "Users can manage their own catalog categories" on public.catalog_categories;
drop policy if exists "Acesso publico as categorias dos catalogos" on public.catalog_categories;
drop policy if exists "Acesso público às categorias dos catálogos" on public.catalog_categories;

drop policy if exists "Acesso publico as configuracoes da loja" on public.store_settings;
drop policy if exists "Acesso público às configurações da loja" on public.store_settings;
drop policy if exists "Public Branding Select" on public.store_settings;
drop policy if exists "Users can manage own settings" on public.store_settings;
drop policy if exists "Users can manage their own store settings" on public.store_settings;
drop policy if exists "tenant_store_settings_all" on public.store_settings;
drop policy if exists "super_admin_store_settings_all" on public.store_settings;

drop policy if exists "User Profiles" on public.profiles;
drop policy if exists "Users can see themselves" on public.profiles;
drop policy if exists "tenant_profiles_select" on public.profiles;
drop policy if exists "tenant_profiles_insert" on public.profiles;
drop policy if exists "tenant_profiles_update" on public.profiles;

drop policy if exists "tenant_self_select" on public.tenants;
drop policy if exists "super_admin_tenants_all" on public.tenants;

drop policy if exists "branding_public_read" on public.tenant_branding;
drop policy if exists "branding_tenant_write" on public.tenant_branding;
drop policy if exists "super_admin_branding_all" on public.tenant_branding;

drop policy if exists "Invitees can view their own invite" on public.team_invites;
drop policy if exists "Users can manage their own invites" on public.team_invites;

drop policy if exists "User Movements" on public.product_movements;

-- Tenant-owned private tables.
create policy "tenant_products_select" on public.products
  for select to authenticated
  using (app_private.can_access_tenant(tenant_id));
create policy "tenant_products_insert" on public.products
  for insert to authenticated
  with check (app_private.can_access_tenant(tenant_id) and (app_private.is_super_admin() or user_id = auth.uid()));
create policy "tenant_products_update" on public.products
  for update to authenticated
  using (app_private.can_access_tenant(tenant_id))
  with check (app_private.can_access_tenant(tenant_id) and (app_private.is_super_admin() or user_id = auth.uid()));
create policy "tenant_products_delete" on public.products
  for delete to authenticated
  using (app_private.can_access_tenant(tenant_id));

create policy "tenant_services_select" on public.services
  for select to authenticated
  using (app_private.can_access_tenant(tenant_id));
create policy "tenant_services_insert" on public.services
  for insert to authenticated
  with check (app_private.can_access_tenant(tenant_id) and (app_private.is_super_admin() or user_id = auth.uid()));
create policy "tenant_services_update" on public.services
  for update to authenticated
  using (app_private.can_access_tenant(tenant_id))
  with check (app_private.can_access_tenant(tenant_id) and (app_private.is_super_admin() or user_id = auth.uid()));
create policy "tenant_services_delete" on public.services
  for delete to authenticated
  using (app_private.can_access_tenant(tenant_id));

create policy "tenant_sales_select" on public.sales
  for select to authenticated
  using (app_private.can_access_tenant(tenant_id));
create policy "tenant_sales_insert" on public.sales
  for insert to authenticated
  with check (app_private.can_access_tenant(tenant_id) and (app_private.is_super_admin() or user_id = auth.uid()));
create policy "tenant_sales_update" on public.sales
  for update to authenticated
  using (app_private.can_access_tenant(tenant_id))
  with check (app_private.can_access_tenant(tenant_id) and (app_private.is_super_admin() or user_id = auth.uid()));
create policy "tenant_sales_delete" on public.sales
  for delete to authenticated
  using (app_private.can_access_tenant(tenant_id));

create policy "tenant_customers_all" on public.customers
  for all to authenticated
  using (app_private.can_access_tenant(tenant_id))
  with check (app_private.can_access_tenant(tenant_id) and (app_private.is_super_admin() or user_id = auth.uid()));

create policy "tenant_categories_all" on public.categories
  for all to authenticated
  using (app_private.can_access_tenant(tenant_id))
  with check (app_private.can_access_tenant(tenant_id) and (app_private.is_super_admin() or user_id = auth.uid()));

create policy "tenant_catalogs_all" on public.catalogs
  for all to authenticated
  using (app_private.can_access_tenant(tenant_id))
  with check (app_private.can_access_tenant(tenant_id) and (app_private.is_super_admin() or user_id = auth.uid()));

create policy "tenant_catalog_items_all" on public.catalog_items
  for all to authenticated
  using (
    exists (
      select 1 from public.catalogs c
      where c.id = catalog_items.catalog_id
        and app_private.can_access_tenant(c.tenant_id)
    )
  )
  with check (
    exists (
      select 1 from public.catalogs c
      where c.id = catalog_items.catalog_id
        and app_private.can_access_tenant(c.tenant_id)
    )
  );

create policy "tenant_catalog_categories_all" on public.catalog_categories
  for all to authenticated
  using (
    exists (
      select 1 from public.catalogs c
      where c.id = catalog_categories.catalog_id
        and app_private.can_access_tenant(c.tenant_id)
    )
  )
  with check (
    exists (
      select 1 from public.catalogs c
      where c.id = catalog_categories.catalog_id
        and app_private.can_access_tenant(c.tenant_id)
    )
  );

create policy "tenant_store_settings_all" on public.store_settings
  for all to authenticated
  using (app_private.can_access_tenant(tenant_id))
  with check (app_private.can_access_tenant(tenant_id));

create policy "tenant_product_movements_all" on public.product_movements
  for all to authenticated
  using (app_private.can_access_tenant(tenant_id))
  with check (app_private.can_access_tenant(tenant_id) and (app_private.is_super_admin() or user_id = auth.uid()));

create policy "tenant_usage_events_select" on public.tenant_usage_events
  for select to authenticated
  using (app_private.can_access_tenant(tenant_id));
create policy "tenant_usage_events_insert" on public.tenant_usage_events
  for insert to authenticated
  with check (app_private.can_access_tenant(tenant_id) and (app_private.is_super_admin() or user_id = auth.uid()));

-- Auth, tenants and branding.
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or app_private.is_super_admin()
    or tenant_id = app_private.current_tenant_id()
  );
create policy "profiles_insert" on public.profiles
  for insert to authenticated
  with check (
    id = auth.uid()
    and (
      tenant_id is null
      or exists (
        select 1 from public.team_invites ti
        where ti.tenant_id = profiles.tenant_id
          and lower(ti.email) = lower(auth.jwt() ->> 'email')
      )
      or exists (
        select 1 from public.tenants t
        where t.id = profiles.tenant_id
          and lower(t.owner_email) = lower(auth.jwt() ->> 'email')
      )
      or app_private.is_super_admin()
    )
  );
create policy "profiles_update" on public.profiles
  for update to authenticated
  using (
    id = auth.uid()
    or app_private.is_super_admin()
    or (tenant_id = app_private.current_tenant_id() and app_private.current_user_role() = 'admin')
  )
  with check (
    app_private.is_super_admin()
    or (
      tenant_id = app_private.current_tenant_id()
      and coalesce(role, '') <> 'super_admin'
      and (
        id = auth.uid()
        or app_private.current_user_role() = 'admin'
      )
    )
  );

create policy "tenants_select" on public.tenants
  for select to authenticated
  using (id = app_private.current_tenant_id() or app_private.is_super_admin());
create policy "tenants_super_admin_insert" on public.tenants
  for insert to authenticated
  with check (app_private.is_super_admin());
create policy "tenants_super_admin_update" on public.tenants
  for update to authenticated
  using (app_private.is_super_admin())
  with check (app_private.is_super_admin());
create policy "tenants_super_admin_delete" on public.tenants
  for delete to authenticated
  using (app_private.is_super_admin());

create policy "tenant_branding_public_select" on public.tenant_branding
  for select to anon, authenticated
  using (true);
create policy "tenant_branding_insert" on public.tenant_branding
  for insert to authenticated
  with check (app_private.can_access_tenant(tenant_id));
create policy "tenant_branding_update" on public.tenant_branding
  for update to authenticated
  using (app_private.can_access_tenant(tenant_id))
  with check (app_private.can_access_tenant(tenant_id));
create policy "tenant_branding_delete" on public.tenant_branding
  for delete to authenticated
  using (app_private.is_super_admin());

create policy "team_invites_select" on public.team_invites
  for select to authenticated
  using (
    app_private.is_super_admin()
    or tenant_id = app_private.current_tenant_id()
    or lower(email) = lower(auth.jwt() ->> 'email')
  );
create policy "team_invites_insert" on public.team_invites
  for insert to authenticated
  with check (
    app_private.is_super_admin()
    or (tenant_id = app_private.current_tenant_id() and app_private.current_user_role() = 'admin')
  );
create policy "team_invites_delete" on public.team_invites
  for delete to authenticated
  using (
    app_private.is_super_admin()
    or (tenant_id = app_private.current_tenant_id() and app_private.current_user_role() = 'admin')
  );

-- Public catalog read: public visitors only see data intentionally exposed by a catalog.
create policy "public_catalogs_select" on public.catalogs
  for select to anon
  using (true);
create policy "public_catalog_items_select" on public.catalog_items
  for select to anon
  using (true);
create policy "public_catalog_categories_select" on public.catalog_categories
  for select to anon
  using (true);
create policy "public_catalog_products_select" on public.products
  for select to anon
  using (
    exists (
      select 1
      from public.catalog_items ci
      join public.catalogs c on c.id = ci.catalog_id
      where ci.product_id = products.id
        and c.tenant_id = products.tenant_id
    )
    or exists (
      select 1
      from public.catalog_categories cc
      join public.catalogs c on c.id = cc.catalog_id
      where cc.category_id = products.category_id
        and c.tenant_id = products.tenant_id
    )
  );
create policy "public_catalog_categories_lookup_select" on public.categories
  for select to anon
  using (
    exists (
      select 1
      from public.catalog_categories cc
      join public.catalogs c on c.id = cc.catalog_id
      where cc.category_id = categories.id
        and c.tenant_id = categories.tenant_id
    )
    or exists (
      select 1
      from public.products p
      join public.catalog_items ci on ci.product_id = p.id
      join public.catalogs c on c.id = ci.catalog_id
      where p.category_id = categories.id
        and c.tenant_id = categories.tenant_id
    )
  );

commit;
