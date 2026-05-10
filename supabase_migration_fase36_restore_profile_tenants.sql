-- Fase 36: restore tenant links for existing profiles.
-- Some profiles were left without tenant_id while their products/settings
-- already belonged to the Laris tenant, which made the ERP hide inventory
-- and fail branding saves with "empresa nao identificada".

WITH product_tenants AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    tenant_id
  FROM public.products
  WHERE user_id IS NOT NULL
    AND tenant_id IS NOT NULL
  ORDER BY user_id, created_at DESC
),
settings_tenants AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    tenant_id
  FROM public.store_settings
  WHERE user_id IS NOT NULL
    AND tenant_id IS NOT NULL
  ORDER BY user_id
),
fallback_laris AS (
  SELECT id AS tenant_id
  FROM public.tenants
  WHERE status = 'active'
    AND (slug IN ('laris', 'laris-acess-rios') OR name ILIKE 'Laris%')
  ORDER BY name
  LIMIT 1
),
profile_targets AS (
  SELECT
    p.id,
    COALESCE(pt.tenant_id, st.tenant_id, fl.tenant_id) AS tenant_id
  FROM public.profiles p
  CROSS JOIN fallback_laris fl
  LEFT JOIN product_tenants pt ON pt.user_id = p.id
  LEFT JOIN settings_tenants st ON st.user_id = p.id
  WHERE p.tenant_id IS NULL
    AND COALESCE(pt.tenant_id, st.tenant_id, fl.tenant_id) IS NOT NULL
    AND (
      pt.tenant_id IS NOT NULL
      OR st.tenant_id IS NOT NULL
      OR p.role IN ('admin', 'super_admin')
    )
)
UPDATE public.profiles p
SET tenant_id = profile_targets.tenant_id
FROM profile_targets
WHERE p.id = profile_targets.id;
