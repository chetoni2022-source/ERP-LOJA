begin;

create temp table tmp_store_settings_keep on commit drop as
select
  tenant_id,
  (array_agg(id order by updated_at desc nulls last, id))[1] as keep_id
from public.store_settings
where tenant_id is not null
group by tenant_id
having count(*) > 1;

with merged as (
  select
    k.tenant_id,
    k.keep_id,
    coalesce(tb.store_name, (
      select ss.store_name from public.store_settings ss
      where ss.tenant_id = k.tenant_id and ss.store_name is not null and btrim(ss.store_name) <> ''
      order by ss.updated_at desc nulls last, ss.id
      limit 1
    )) as store_name,
    coalesce(tb.logo_url, (
      select ss.logo_url from public.store_settings ss
      where ss.tenant_id = k.tenant_id and ss.logo_url is not null and btrim(ss.logo_url) <> ''
      order by ss.updated_at desc nulls last, ss.id
      limit 1
    )) as logo_url,
    coalesce(tb.favicon_url, (
      select ss.favicon_url from public.store_settings ss
      where ss.tenant_id = k.tenant_id and ss.favicon_url is not null and btrim(ss.favicon_url) <> ''
      order by ss.updated_at desc nulls last, ss.id
      limit 1
    )) as favicon_url,
    (
      select ss.theme from public.store_settings ss
      where ss.tenant_id = k.tenant_id and ss.theme is not null and btrim(ss.theme) <> ''
      order by ss.updated_at desc nulls last, ss.id
      limit 1
    ) as theme,
    coalesce((
      select ss.monthly_goal from public.store_settings ss
      where ss.tenant_id = k.tenant_id and ss.monthly_goal is not null and ss.monthly_goal > 0
      order by ss.updated_at desc nulls last, ss.id
      limit 1
    ), (
      select ss.monthly_goal from public.store_settings ss
      where ss.tenant_id = k.tenant_id and ss.monthly_goal is not null
      order by ss.updated_at desc nulls last, ss.id
      limit 1
    )) as monthly_goal,
    (
      select ss.logo_width from public.store_settings ss
      where ss.tenant_id = k.tenant_id and ss.logo_width is not null
      order by ss.updated_at desc nulls last, ss.id
      limit 1
    ) as logo_width,
    (
      select ss.logo_height from public.store_settings ss
      where ss.tenant_id = k.tenant_id and ss.logo_height is not null
      order by ss.updated_at desc nulls last, ss.id
      limit 1
    ) as logo_height,
    (
      select ss.logo_fit from public.store_settings ss
      where ss.tenant_id = k.tenant_id and ss.logo_fit is not null and btrim(ss.logo_fit) <> ''
      order by ss.updated_at desc nulls last, ss.id
      limit 1
    ) as logo_fit,
    (
      select ss.logo_position from public.store_settings ss
      where ss.tenant_id = k.tenant_id and ss.logo_position is not null and btrim(ss.logo_position) <> ''
      order by ss.updated_at desc nulls last, ss.id
      limit 1
    ) as logo_position,
    (
      select ss.user_id from public.store_settings ss
      where ss.tenant_id = k.tenant_id and ss.user_id is not null
      order by ss.updated_at desc nulls last, ss.id
      limit 1
    ) as user_id,
    coalesce(tb.whatsapp_number, (
      select ss.whatsapp_number from public.store_settings ss
      where ss.tenant_id = k.tenant_id and ss.whatsapp_number is not null and btrim(ss.whatsapp_number) <> ''
      order by ss.updated_at desc nulls last, ss.id
      limit 1
    )) as whatsapp_number,
    (
      select ss.lead_sources from public.store_settings ss
      where ss.tenant_id = k.tenant_id and ss.lead_sources is not null and array_length(ss.lead_sources, 1) > 0
      order by ss.updated_at desc nulls last, ss.id
      limit 1
    ) as lead_sources,
    (
      select ss.shopee_app_id from public.store_settings ss
      where ss.tenant_id = k.tenant_id and ss.shopee_app_id is not null and btrim(ss.shopee_app_id) <> ''
      order by ss.updated_at desc nulls last, ss.id
      limit 1
    ) as shopee_app_id,
    (
      select ss.shopee_app_secret from public.store_settings ss
      where ss.tenant_id = k.tenant_id and ss.shopee_app_secret is not null and btrim(ss.shopee_app_secret) <> ''
      order by ss.updated_at desc nulls last, ss.id
      limit 1
    ) as shopee_app_secret,
    (
      select ss.shopee_shop_id from public.store_settings ss
      where ss.tenant_id = k.tenant_id and ss.shopee_shop_id is not null and btrim(ss.shopee_shop_id) <> ''
      order by ss.updated_at desc nulls last, ss.id
      limit 1
    ) as shopee_shop_id,
    (
      select ss.shopee_markup_pct from public.store_settings ss
      where ss.tenant_id = k.tenant_id and ss.shopee_markup_pct is not null
      order by ss.updated_at desc nulls last, ss.id
      limit 1
    ) as shopee_markup_pct,
    (
      select ss.shopee_commission_pct from public.store_settings ss
      where ss.tenant_id = k.tenant_id and ss.shopee_commission_pct is not null
      order by ss.updated_at desc nulls last, ss.id
      limit 1
    ) as shopee_commission_pct,
    (
      select ss.shopee_fixed_fee from public.store_settings ss
      where ss.tenant_id = k.tenant_id and ss.shopee_fixed_fee is not null
      order by ss.updated_at desc nulls last, ss.id
      limit 1
    ) as shopee_fixed_fee,
    (
      select ss.shopee_commission_cap from public.store_settings ss
      where ss.tenant_id = k.tenant_id and ss.shopee_commission_cap is not null
      order by ss.updated_at desc nulls last, ss.id
      limit 1
    ) as shopee_commission_cap,
    (
      select ss.tiktok_commission_pct from public.store_settings ss
      where ss.tenant_id = k.tenant_id and ss.tiktok_commission_pct is not null
      order by ss.updated_at desc nulls last, ss.id
      limit 1
    ) as tiktok_commission_pct,
    (
      select ss.tiktok_fixed_fee from public.store_settings ss
      where ss.tenant_id = k.tenant_id and ss.tiktok_fixed_fee is not null
      order by ss.updated_at desc nulls last, ss.id
      limit 1
    ) as tiktok_fixed_fee,
    (
      select ss.tiktok_commission_cap from public.store_settings ss
      where ss.tenant_id = k.tenant_id and ss.tiktok_commission_cap is not null
      order by ss.updated_at desc nulls last, ss.id
      limit 1
    ) as tiktok_commission_cap,
    (
      select ss.tiktok_markup_pct from public.store_settings ss
      where ss.tenant_id = k.tenant_id and ss.tiktok_markup_pct is not null
      order by ss.updated_at desc nulls last, ss.id
      limit 1
    ) as tiktok_markup_pct,
    (
      select ss.global_tax_pct from public.store_settings ss
      where ss.tenant_id = k.tenant_id and ss.global_tax_pct is not null
      order by ss.updated_at desc nulls last, ss.id
      limit 1
    ) as global_tax_pct
  from tmp_store_settings_keep k
  left join public.tenant_branding tb on tb.tenant_id = k.tenant_id
)
update public.store_settings ss
set
  store_name = coalesce(merged.store_name, ss.store_name),
  logo_url = coalesce(merged.logo_url, ss.logo_url),
  favicon_url = coalesce(merged.favicon_url, ss.favicon_url),
  theme = coalesce(merged.theme, ss.theme),
  monthly_goal = coalesce(merged.monthly_goal, ss.monthly_goal),
  logo_width = coalesce(merged.logo_width, ss.logo_width),
  logo_height = coalesce(merged.logo_height, ss.logo_height),
  logo_fit = coalesce(merged.logo_fit, ss.logo_fit),
  logo_position = coalesce(merged.logo_position, ss.logo_position),
  user_id = coalesce(merged.user_id, ss.user_id),
  whatsapp_number = coalesce(merged.whatsapp_number, ss.whatsapp_number),
  lead_sources = coalesce(merged.lead_sources, ss.lead_sources),
  shopee_app_id = coalesce(merged.shopee_app_id, ss.shopee_app_id),
  shopee_app_secret = coalesce(merged.shopee_app_secret, ss.shopee_app_secret),
  shopee_shop_id = coalesce(merged.shopee_shop_id, ss.shopee_shop_id),
  shopee_markup_pct = coalesce(merged.shopee_markup_pct, ss.shopee_markup_pct),
  shopee_commission_pct = coalesce(merged.shopee_commission_pct, ss.shopee_commission_pct),
  shopee_fixed_fee = coalesce(merged.shopee_fixed_fee, ss.shopee_fixed_fee),
  shopee_commission_cap = coalesce(merged.shopee_commission_cap, ss.shopee_commission_cap),
  tiktok_commission_pct = coalesce(merged.tiktok_commission_pct, ss.tiktok_commission_pct),
  tiktok_fixed_fee = coalesce(merged.tiktok_fixed_fee, ss.tiktok_fixed_fee),
  tiktok_commission_cap = coalesce(merged.tiktok_commission_cap, ss.tiktok_commission_cap),
  tiktok_markup_pct = coalesce(merged.tiktok_markup_pct, ss.tiktok_markup_pct),
  global_tax_pct = coalesce(merged.global_tax_pct, ss.global_tax_pct),
  updated_at = now()
from merged
where ss.id = merged.keep_id;

delete from public.store_settings ss
using tmp_store_settings_keep k
where ss.tenant_id = k.tenant_id
  and ss.id <> k.keep_id;

create unique index if not exists store_settings_tenant_id_unique
  on public.store_settings (tenant_id)
  where tenant_id is not null;

commit;
