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

interface AuthState {
  user: User | null;
  profile: any | null;
  loading: boolean;
  branding: TenantBranding | null;
  previewTenantId: string | null;
  setUser: (user: User | null) => void;
  loadProfile: (userId: string, overrideTenantId?: string) => Promise<void>;
  setPreviewTenant: (tenantId: string | null) => void;
  signOut: () => Promise<void>;
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
      get().loadProfile(user.id);
    } else {
      localStorage.removeItem('previewTenantId');
      set({ profile: null, branding: null, previewTenantId: null });
    }
  },

  loadProfile: async (userId: string, overrideTenantId?: string) => {
    try {
      // Try to update last login timestamp (may fail if profile not created yet)
      await supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, full_name, tenant_id')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) {
        let finalTenantId = profileData.tenant_id;

        // Se for admin/super_admin e não tiver tenant_id, busca o tenant master 'laris'
        if ((profileData.role === 'super_admin' || profileData.role === 'admin') && !finalTenantId) {
          const { data: larisTenant } = await supabase
            .from('tenants')
            .select('id')
            .eq('slug', 'laris')
            .maybeSingle();
          
          if (larisTenant) {
            finalTenantId = larisTenant.id;
            // Opcional: Atualiza o perfil no banco para não ter que buscar toda vez
            await supabase.from('profiles').update({ tenant_id: larisTenant.id }).eq('id', userId);
          }
        }

        set({ profile: { ...profileData, tenant_id: finalTenantId } });

        // Update tenant last accessed timestamp
        if (finalTenantId) {
          await supabase
            .from('tenants')
            .update({ last_accessed_at: new Date().toISOString() })
            .eq('id', finalTenantId);
        }

        // Determine which tenant ID to use (actual or preview)
        const activeTenantId = overrideTenantId || get().previewTenantId || finalTenantId;

        // Load tenant branding
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

          if (brandingData && tenantData) {
            const branding: TenantBranding = {
              tenantId: activeTenantId,
              tenantSlug: tenantData.slug,
              storeName: brandingData.store_name || tenantData.name,
              logoUrl: brandingData.logo_url,
              faviconUrl: brandingData.favicon_url,
              loginBgUrl: brandingData.login_bg_url,
              primaryColor: brandingData.primary_color || '#a855f7',
              whatsappNumber: brandingData.whatsapp_number,
            };
            set({ branding });

            // Apply favicon dynamically
            if (brandingData.favicon_url) {
              let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
              if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
              link.href = brandingData.favicon_url;
            }
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
      get().loadProfile(user.id, tenantId || undefined);
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, branding: null });
  },
}));
