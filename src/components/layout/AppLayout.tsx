import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, PackageSearch, BadgeDollarSign, Settings, LogOut,
  PanelLeftClose, PanelLeftOpen, Store, Link as LinkIcon, Tags, Menu, X,
  Users, UserCircle2
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

const navItems = [
  { icon: LayoutDashboard, label: 'Painel', path: '/dashboard' },
  { icon: PackageSearch, label: 'Estoque', path: '/inventory' },
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
  { icon: BadgeDollarSign, label: 'Vendas', path: '/sales' },
  { icon: UserCircle2, label: 'Clientes', path: '/customers' },
  { icon: Menu, label: 'Menu', path: '__menu__' },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuthStore();
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

  useEffect(() => {
    if (!user) return;

    const fetchSettings = async () => {
      const { data } = await supabase.from('store_settings')
        .select('store_name, logo_url, favicon_url, logo_width, logo_height, logo_fit, logo_position')
        .eq('user_id', user.id)
        .limit(1).maybeSingle();

      if (data) {
        applySettings(data);
      } else {
        resetSettings();
      }
    };

    const applySettings = (data: any) => {
      setBrand({ 
        name: data.store_name || 'Laris ERP', 
        logo: data.logo_url,
        logoW: data.logo_width || 200,
        logoH: data.logo_height || 80,
        logoFit: data.logo_fit || 'contain',
        logoPos: data.logo_position || 'center',
        isDefault: !data.logo_url && (data.store_name === 'Laris Acessórios' || !data.store_name)
      });

      if (data.favicon_url) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
        link.href = `${data.favicon_url}?v=${Date.now()}`;
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

    fetchSettings();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'store_settings',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Realtime settings update:', payload.new);
          if (payload.new) applySettings(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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
    <div className="flex h-screen bg-background overflow-hidden relative w-full">
      {/* ── Mobile Top Bar ────────────────────────────────── */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 shrink-0 bg-card border-b border-border z-30 fixed top-0 w-full shadow-sm">
          <div className="flex items-center gap-3 overflow-hidden h-full py-1">
          {brand.logo ? (
            <img 
              src={brand.logo} 
              alt="Logo" 
              style={{
                height: 'auto',
                maxHeight: 32, // Fixed height for top bar
                width: 'auto',
                maxWidth: 120,
                objectFit: brand.logoFit as any,
                objectPosition: brand.logoPos
              }}
            />
          ) : (
            <Store className="h-5 w-5 text-primary" />
          )}
          <span className="font-black text-sm truncate text-foreground tracking-tight">{brand.name}</span>
        </div>
      </div>

      {/* ── Mobile Overlay ────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in duration-200" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* ── Sidebar (Desktop + Drawer Mobile) ─────────────── */}
      <aside className={cn(
        'flex-col border-r border-border bg-card transition-all duration-300 z-50 shadow-md fixed md:relative h-full',
        collapsed ? 'w-20 hidden md:flex' : 'w-64',
        mobileMenuOpen ? 'flex translate-x-0' : '-translate-x-full md:translate-x-0 md:flex',
      )}>
        {/* Close drawer on mobile */}
        <div className="absolute top-3 right-3 md:hidden z-10">
          <button onClick={() => setMobileMenuOpen(false)} className="p-2 bg-muted/80 rounded-md text-foreground backdrop-blur-sm"><X size={18} /></button>
        </div>

        {/* Branding */}
        <div className="flex items-center justify-center p-4 pt-14 md:pt-4 border-b border-border/40 shrink-0 md:min-h-[88px]">
          {!collapsed ? (
            <div className="w-full flex flex-col items-center justify-center animate-in fade-in duration-300">
              {brand.logo ? (
                <>
                  <img 
                    src={brand.logo} 
                    alt="Logo" 
                    style={{
                      height: 'auto',
                      maxHeight: brand.logoH,
                      width: 'auto',
                      maxWidth: brand.logoW,
                      objectFit: brand.logoFit as any,
                      objectPosition: brand.logoPos
                    }}
                    className="drop-shadow-sm mb-1" 
                  />
                  <span className="font-bold text-[9px] uppercase tracking-widest truncate text-muted-foreground/60">{brand.name}</span>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 text-primary p-2 rounded-xl"><Store size={22} /></div>
                  <span className="font-black text-[16px] tracking-tight truncate text-foreground">{brand.name}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center justify-center w-full">
              {brand.logo ? <img src={brand.logo} alt="Logo" className="h-8 w-auto max-w-[40px] object-contain" /> : <Store size={20} className="text-primary" />}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={19} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border/50 shrink-0 space-y-1.5">
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
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background/50 pt-14 md:pt-0 pb-16 md:pb-0 w-full relative">
        {brand.isDefault && location.pathname !== '/settings' && (
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
      </main>

      {/* ── Bottom Navigation Bar (Mobile Only) ───────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border flex items-stretch h-16 shadow-lg safe-area-inset-bottom">
        {bottomNavItems.map((item) => {
          const isActive = item.path !== '__menu__' && location.pathname === item.path;
          const isMenu = item.path === '__menu__';
          return (
            <button
              key={item.path}
              onClick={() => handleBottomNavClick(item.path)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground',
                isMenu && mobileMenuOpen ? 'text-primary' : undefined
              )}
            >
              <item.icon size={20} className={cn('mb-0.5', isActive ? 'text-primary' : 'text-muted-foreground')} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
