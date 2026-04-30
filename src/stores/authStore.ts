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
  previewTenantId: null,

  setUser: (user) => {
    set({ user, loading: false });
    if (user) {
      get().loadProfile(user.id);
    } else {
      set({ profile: null, branding: null });
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
        set({ profile: profileData });

        // Determine which tenant ID to use (actual or preview)
        const activeTenantId = overrideTenantId || get().previewTenantId || profileData.tenant_id;

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
