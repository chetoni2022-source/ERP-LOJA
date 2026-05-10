import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface TenantBranding {
  tenantId: string;
  tenantSlug: string;
  storeName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  loginBgUrl: string | null;
  primaryColor: string;
  whatsappNumber: string | null;
}

interface UserProfile {
  role: string | null;
  full_name: string | null;
  tenant_id: string | null;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  branding: TenantBranding | null;
  previewTenantId: string | null;
  setUser: (user: User | null) => void;
  loadProfile: (userId: string, overrideTenantId?: string, email?: string | null) => Promise<void>;
  setPreviewTenant: (tenantId: string | null) => void;
  signOut: () => Promise<void>;
}

async function resolveTenantForUser(userId: string, role?: string | null, email?: string | null) {
  const { data: productTenant } = await supabase
    .from('products')
    .select('tenant_id')
    .eq('user_id', userId)
    .not('tenant_id', 'is', null)
    .limit(1)
    .maybeSingle();

  if (productTenant?.tenant_id) return productTenant.tenant_id as string;

  const { data: settingsTenant } = await supabase
    .from('store_settings')
    .select('tenant_id')
    .eq('user_id', userId)
    .not('tenant_id', 'is', null)
    .limit(1)
    .maybeSingle();

  if (settingsTenant?.tenant_id) return settingsTenant.tenant_id as string;

  if (email) {
    const { data: inviteTenant } = await supabase
      .from('team_invites')
      .select('tenant_id')
      .eq('email', email.toLowerCase())
      .not('tenant_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inviteTenant?.tenant_id) return inviteTenant.tenant_id as string;
  }

  if (role === 'super_admin' || role === 'admin') {
    const { data: larisTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('status', 'active')
      .or('slug.eq.laris,slug.eq.laris-acess-rios,name.ilike.Laris%')
      .limit(1)
      .maybeSingle();

    if (larisTenant?.id) return larisTenant.id as string;
  }

  return null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  profile: null,
  branding: null,
  previewTenantId: localStorage.getItem('previewTenantId'),

  setUser: (user) => {
    set({ user, loading: false });
    if (user) {
      get().loadProfile(user.id, undefined, user.email);
    } else {
      localStorage.removeItem('previewTenantId');
      set({ profile: null, branding: null, previewTenantId: null });
    }
  },

  loadProfile: async (userId: string, overrideTenantId?: string, email?: string | null) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, full_name, tenant_id')
        .eq('id', userId)
        .maybeSingle<UserProfile>();

      if (!profileData) return;

      let finalTenantId = profileData.tenant_id;

      if (!finalTenantId) {
        finalTenantId = await resolveTenantForUser(userId, profileData.role, email);
        if (finalTenantId) {
          await supabase.from('profiles').update({ tenant_id: finalTenantId }).eq('id', userId);
        }
      }

      set({ profile: { ...profileData, tenant_id: finalTenantId } });

      const activeTenantId = overrideTenantId || get().previewTenantId || finalTenantId;

      if (activeTenantId) {
        const { data: brandingData } = await supabase
          .from('tenant_branding')
          .select('*')
          .eq('tenant_id', activeTenantId)
          .maybeSingle();

        const { data: tenantData } = await supabase
          .from('tenants')
          .select('slug, name')
          .eq('id', activeTenantId)
          .maybeSingle();

        if (tenantData) {
          const branding: TenantBranding = {
            tenantId: activeTenantId,
            tenantSlug: tenantData.slug,
            storeName: brandingData?.store_name || tenantData.name,
            logoUrl: brandingData?.logo_url ?? null,
            faviconUrl: brandingData?.favicon_url ?? null,
            loginBgUrl: brandingData?.login_bg_url ?? null,
            primaryColor: brandingData?.primary_color || '#a855f7',
            whatsappNumber: brandingData?.whatsapp_number ?? null,
          };
          set({ branding });

          if (brandingData?.favicon_url) {
            let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            if (!link) {
              link = document.createElement('link');
              link.rel = 'icon';
              document.head.appendChild(link);
            }
            link.href = brandingData.favicon_url;
          }
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  },

  setPreviewTenant: (tenantId) => {
    if (tenantId) {
      localStorage.setItem('previewTenantId', tenantId);
    } else {
      localStorage.removeItem('previewTenantId');
    }
    set({ previewTenantId: tenantId });
    const user = get().user;
    if (user) {
      get().loadProfile(user.id, tenantId || undefined, user.email);
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, branding: null });
  },
}));
