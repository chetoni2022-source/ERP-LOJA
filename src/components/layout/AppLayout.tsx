import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, PackageSearch, BadgeDollarSign, Settings, LogOut,
  PanelLeftClose, PanelLeftOpen, Store, Link as LinkIcon, Tags, Menu, X,
  Users, UserCircle2, Calculator, ShieldCheck, BriefcaseBusiness
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useTenant } from '../../contexts/TenantContext';
import { supabase, getProxyUrl } from '../../lib/supabase';
import { Button } from '../ui';
import { Eye, ArrowLeftCircle } from 'lucide-react';

interface StoreSettings {
  store_name: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  logo_width: number | null;
  logo_height: number | null;
  logo_fit: React.CSSProperties['objectFit'] | null;
  logo_position: React.CSSProperties['objectPosition'] | null;
}

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

const navItems = [
  { icon: LayoutDashboard, label: 'Painel', path: '/dashboard' },
  { icon: PackageSearch, label: 'Estoque', path: '/inventory' },
  { icon: BriefcaseBusiness, label: 'Serviços', path: '/services' },
  { icon: Calculator, label: 'Lucros', path: '/inventory/analytics' },
  { icon: Tags, label: 'Categorias', path: '/categories' },
  { icon: BadgeDollarSign, label: 'Vendas', path: '/sales' },
  { icon: UserCircle2, label: 'Clientes', path: '/customers' },
  { icon: LinkIcon, label: 'Catálogos', path: '/catalogs' },
  { icon: Users, label: 'Equipe', path: '/team' },
  { icon: Settings, label: 'Ajustes', path: '/settings' },
];

// Bottom nav shows only the most important 5 items on mobile
const bottomNavItems = [
  { icon: LayoutDashboard, label: 'Painel', path: '/dashboard' },
  { icon: PackageSearch, label: 'Estoque', path: '/inventory' },
  { icon: BriefcaseBusiness, label: 'Serviços', path: '/services' },
  { icon: BadgeDollarSign, label: 'Vendas', path: '/sales' },
  { icon: Menu, label: 'Menu', path: '__menu__' },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut, previewTenantId, setPreviewTenant, profile } = useAuthStore();
  const { branding: tenantBranding, tenantId } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [brand, setBrand] = useState<{ 
    name: string; 
    logo: string | null;
    logoW: number;
    logoH: number;
    logoFit: string;
    logoPos: string;
    isDefault: boolean;
  }>({ 
    name: 'Laris Acessórios', 
    logo: null,
    logoW: 200,
    logoH: 80,
    logoFit: 'contain',
    logoPos: 'center',
    isDefault: true
  });

  // Se o tenant tiver branding configurado, usa como prioridade
  const effectiveLogo = tenantBranding?.logoUrl ?? brand.logo;
  const effectiveName = tenantBranding?.storeName ?? brand.name;
  const isDefault = !tenantBranding?.logoUrl && brand.isDefault;

  useEffect(() => {
    if (!user) return;

    const applySettings = (data: StoreSettings) => {
      const proxyLogo = getProxyUrl(data.logo_url);
      const proxyFavicon = getProxyUrl(data.favicon_url);

      setBrand({ 
        name: data.store_name || 'Laris ERP', 
        logo: proxyLogo,
        logoW: data.logo_width || 200,
        logoH: data.logo_height || 80,
        logoFit: data.logo_fit || 'contain',
        logoPos: data.logo_position || 'center',
        isDefault: !data.logo_url && (data.store_name === 'Laris Acessórios' || !data.store_name)
      });

      if (proxyFavicon) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
        link.href = `${proxyFavicon}?v=${Date.now()}`;
      }
      if (data.store_name) {
        document.title = data.store_name + ' | Laris ERP';
      }
    };

    const resetSettings = () => {
      setBrand({ 
        name: 'Laris Acessórios', 
        logo: null,
        logoW: 200,
        logoH: 80,
        logoFit: 'contain',
        logoPos: 'center',
        isDefault: true
      });
    };

    const fetchSettings = async () => {
      if (!tenantId) {
        resetSettings();
        return;
      }

      const { data } = await supabase.from('store_settings')
        .select('store_name, logo_url, favicon_url, logo_width, logo_height, logo_fit, logo_position')
        .eq('tenant_id', tenantId)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        applySettings(data);
      } else {
        resetSettings();
      }
    };

    fetchSettings();
    if (!tenantId) return;

    // Subscribe to realtime updates
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'store_settings',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          if (payload.new) applySettings(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, tenantId]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pTenant = params.get('preview_tenant');
    if (pTenant && profile?.role === 'super_admin' && pTenant !== previewTenantId) {
      setPreviewTenant(pTenant);
    }
  }, [location.search, previewTenantId, profile?.role, setPreviewTenant]);

  useEffect(() => {
    if (!user?.id || !tenantId) return;

    const timeout = window.setTimeout(() => {
      supabase.from('tenant_usage_events').insert({
        tenant_id: tenantId,
        user_id: user.id,
        event_type: 'page_view',
        route: location.pathname,
      }).then(({ error }) => {
        if (error) console.warn('Usage event not recorded:', error.message);
      });
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [location.pathname, tenantId, user?.id]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleBottomNavClick = (path: string) => {
    if (path === '__menu__') {
      setMobileMenuOpen(true);
    } else {
      navigate(path);
    }
  };

  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden bg-[#f7f6f3] dark:bg-[#080808]">
      {/* ── Mobile Top Bar ────────────────────────────────── */}
      <div className="fixed top-0 z-30 flex h-14 w-full shrink-0 items-center justify-between border-b border-border/70 bg-card/95 px-4 shadow-sm backdrop-blur md:hidden">
          <div className="flex items-center gap-3 overflow-hidden h-full py-1">
          {effectiveLogo ? (
            <img 
              src={effectiveLogo} 
              alt="Logo" 
              style={{
                height: 'auto',
                maxHeight: 32,
                width: 'auto',
                maxWidth: 120,
                objectFit: brand.logoFit,
                objectPosition: brand.logoPos
              }}
            />
          ) : (
            <Store className="h-5 w-5 text-primary" />
          )}
          <span className="font-black text-sm truncate text-foreground tracking-tight">{effectiveName}</span>
        </div>
      </div>

      {/* ── Mobile Overlay ────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] md:hidden animate-in fade-in duration-300" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* ── Sidebar (Desktop + Drawer Mobile) ─────────────── */}
      <aside className={cn(
        'fixed z-[100] flex-col overflow-hidden border-r border-border/70 bg-card/95 shadow-[16px_0_42px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all duration-500 md:relative h-full',
        collapsed ? 'w-20 hidden md:flex' : 'w-64 max-w-[85vw]',
        mobileMenuOpen ? 'flex translate-x-0' : '-translate-x-full md:translate-x-0 md:flex',
      )}>
        {/* Close drawer on mobile */}
        <div className="absolute top-3 right-3 md:hidden z-10">
          <button onClick={() => setMobileMenuOpen(false)} className="p-2 bg-muted/80 rounded-md text-foreground backdrop-blur-sm"><X size={18} /></button>
        </div>

        {/* Branding */}
        <div className="flex shrink-0 items-center justify-center border-b border-border/50 p-4 pt-14 md:min-h-[88px] md:pt-4">
          {!collapsed ? (
            <div className="w-full flex flex-col items-center justify-center animate-in fade-in duration-1000 group">
              {effectiveLogo ? (
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/10 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                  <NavLink to="/dashboard" className="relative p-1 block">
                    <div className="overflow-hidden transition-all duration-500 group-hover:-translate-y-1">
                      <img 
                        src={effectiveLogo} 
                        alt="Logo" 
                        style={{
                          height: 'auto',
                          maxHeight: brand.logoH,
                          width: 'auto',
                          maxWidth: brand.logoW,
                          objectFit: brand.logoFit,
                          objectPosition: brand.logoPos
                        }}
                        className="rounded-lg"
                      />
                    </div>
                  </NavLink>
                </div>
              ) : (
                <div className="mb-2 flex items-center gap-3 rounded-lg border border-primary/10 bg-primary/10 p-4 shadow-inner transition-all duration-500 group-hover:scale-[1.02] group-hover:bg-primary/15">
                  <div className="text-primary"><Store size={28} className="drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]" /></div>
                  <span className="font-black text-[18px] tracking-tight truncate text-foreground">{effectiveName}</span>
                </div>
              )}
              <div className="mt-2 h-0.5 w-4 bg-primary/20 rounded-full transition-all duration-500 group-hover:w-8 group-hover:bg-primary/40" />
            </div>
          ) : (
            <div className="hidden md:flex items-center justify-center w-full">
              {effectiveLogo ? <img src={effectiveLogo} alt="Logo" className="h-8 w-auto max-w-[40px] object-contain" /> : <Store size={20} className="text-primary" />}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/inventory'}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => cn(
                'group/nav flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-black uppercase tracking-[0.1em] transition-all duration-200',
                isActive
                  ? 'bg-zinc-950 text-white shadow-sm ring-1 ring-zinc-950/5 dark:bg-white dark:text-zinc-950'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={16} className={cn('shrink-0 transition-transform duration-300', !collapsed && 'group-hover/nav:scale-110')} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}

          {/* Super Admin Quick Access */}
          {profile?.role === 'super_admin' && (
            <NavLink
              to="/superadmin-laris"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => cn(
                'mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-black uppercase tracking-[0.1em] transition-all duration-200',
                isActive
                  ? 'bg-zinc-950 text-white shadow-sm ring-1 ring-zinc-950/5 dark:bg-white dark:text-zinc-950'
                  : 'border border-primary/15 bg-primary/10 text-foreground hover:bg-primary/15'
              )}
              title={collapsed ? 'Painel Master' : undefined}
            >
              <ShieldCheck size={16} className="shrink-0" />
              {!collapsed && <span className="truncate">Painel Master</span>}
            </NavLink>
          )}
        </nav>

        {/* Footer */}
        <div className="shrink-0 space-y-1.5 border-t border-border/50 p-3">
          <Button
            className="w-full justify-start text-muted-foreground hover:text-red-500 hover:bg-red-500/10 border-transparent bg-transparent shadow-none font-semibold"
            onClick={handleSignOut}
          >
            <LogOut size={17} className={cn('mr-2', collapsed && 'mr-0')} />
            {!collapsed && 'Sair da Conta'}
          </Button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full hidden md:flex justify-center py-2 text-muted-foreground hover:text-foreground transition-colors hover:bg-muted rounded-md"
          >
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────── */}
      <main className="relative flex w-full max-w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain bg-background/70 pt-14 pb-[calc(4rem+env(safe-area-inset-bottom))] md:max-w-none md:pt-0 md:pb-0">
        {/* Preview Mode Banner */}
        {previewTenantId && profile?.role === 'super_admin' && (
          <div className="bg-blue-600 px-4 py-2 flex items-center justify-between gap-3 text-white z-[60] sticky top-0 md:relative">
            <div className="flex items-center gap-2">
              <Eye size={16} className="animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest">Modo de Visualização: <span className="underline">{effectiveName}</span></span>
            </div>
            <button 
              onClick={() => {
                setPreviewTenant(null);
                navigate('/superadmin-laris');
              }}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
            >
              <ArrowLeftCircle size={14} /> Sair da Empresa
            </button>
          </div>
        )}

        <div className="flex-1 w-full max-w-full overflow-x-hidden">
          {isDefault && location.pathname !== '/settings' && (
          <div className="bg-primary/10 border-b border-primary/20 px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3 animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-3">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-lg shrink-0">
                <Settings size={16} className="animate-spin-slow" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-foreground">Sua plataforma está quase pronta! 🚀</p>
                <p className="text-[11px] text-muted-foreground">Configure o nome da sua empresa e o seu logotipo para começar com estilo profissional.</p>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/settings')}
              className="h-9 px-4 text-xs font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 border-none"
            >
              Configurar Agora
            </Button>
          </div>
          )}
          {children}
        </div>
      </main>

      {/* ── Bottom Navigation Bar (Mobile Only) ───────────── */}
      <nav className="safe-area-inset-bottom fixed right-0 bottom-0 left-0 z-30 flex h-[calc(4rem+env(safe-area-inset-bottom))] items-stretch border-t border-border/70 bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
        {bottomNavItems.map((item) => {
          const isActive = item.path !== '__menu__' && location.pathname === item.path;
          const isMenu = item.path === '__menu__';
          return (
            <button
              key={item.path}
              onClick={() => handleBottomNavClick(item.path)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
                isActive ? 'text-zinc-950 dark:text-white' : 'text-muted-foreground',
                isMenu && mobileMenuOpen ? 'text-zinc-950 dark:text-white' : undefined
              )}
            >
              <item.icon size={20} className={cn('mb-0.5', isActive ? 'text-zinc-950 dark:text-white' : 'text-muted-foreground')} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
