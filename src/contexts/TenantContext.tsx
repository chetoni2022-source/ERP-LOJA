import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAuthStore, TenantBranding } from '../stores/authStore';

// Apply primary color as CSS custom property so all components pick it up
function applyPrimaryColor(hex: string) {
  // Convert hex to HSL for Tailwind/CSS variable compatibility
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);
  const hsl = `${hDeg} ${sPct}% ${lPct}%`;

  document.documentElement.style.setProperty('--primary', hsl);
  document.documentElement.style.setProperty('--ring', hsl);
}

interface TenantContextValue {
  branding: TenantBranding | null;
  isSuperAdmin: boolean;
  tenantId: string | null;
}

const TenantContext = createContext<TenantContextValue>({
  branding: null,
  isSuperAdmin: false,
  tenantId: null,
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const { branding, profile, previewTenantId } = useAuthStore();

  const isSuperAdmin = profile?.role === 'super_admin';
  const tenantId = previewTenantId || profile?.tenant_id || null;

  useEffect(() => {
    if (branding?.primaryColor) {
      try {
        applyPrimaryColor(branding.primaryColor);
      } catch {
        // ignore invalid colors
      }
    }
  }, [branding?.primaryColor]);

  return (
    <TenantContext.Provider value={{ branding, isSuperAdmin, tenantId }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
