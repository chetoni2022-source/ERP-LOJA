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
  profile: { role: string; full_name: string; tenant_id: string | null } | null;
  branding: TenantBranding | null;
  setUser: (user: User | null) => void;
  loadProfile: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  profile: null,
  branding: null,

  setUser: (user) => {
    set({ user, loading: false });
    if (user) {
      get().loadProfile(user.id);
    } else {
      set({ profile: null, branding: null });
    }
  },

  loadProfile: async (userId: string) => {
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

      // If profile doesn't exist yet, create a default one
      if (!profileData) {
        const { data: userData } = await supabase.auth.getUser();
        const email = userData?.user?.email ?? '';
        const fullName = userData?.user?.user_metadata?.full_name ?? email.split('@')[0];
        await supabase.from('profiles').upsert({
          id: userId,
          full_name: fullName,
          role: 'user',
          tenant_id: null,
        }, { onConflict: 'id' });

        // Re-fetch after upsert
        const { data: newProfile } = await supabase
          .from('profiles')
          .select('role, full_name, tenant_id')
          .eq('id', userId)
          .maybeSingle();

        if (newProfile) set({ profile: newProfile });
        return;
      }

      set({ profile: profileData });

      // Load tenant branding only if user belongs to a tenant
      if (profileData.tenant_id) {
        const { data: brandingData } = await supabase
          .from('tenant_branding')
          .select('*')
          .eq('tenant_id', profileData.tenant_id)
          .maybeSingle();

        const { data: tenantData } = await supabase
          .from('tenants')
          .select('slug, name')
          .eq('id', profileData.tenant_id)
          .maybeSingle();

        if (brandingData && tenantData) {
          const branding: TenantBranding = {
            tenantId: profileData.tenant_id,
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
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, branding: null });
  },
}));
