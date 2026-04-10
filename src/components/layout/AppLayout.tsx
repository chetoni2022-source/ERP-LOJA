import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, PackageSearch, BadgeDollarSign, Settings, LogOut,
  PanelLeftClose, PanelLeftOpen, Store, Link as LinkIcon, Tags, Menu, X,
  Users, UserCircle2, Calculator, ShieldCheck
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { supabase, getProxyUrl } from '../../lib/supabase';
import { Button } from '../ui';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

const navItems = [
  { icon: LayoutDashboard, label: 'Painel Geral', path: '/dashboard' },
  { icon: PackageSearch, label: 'Gestão de Estoque', path: '/inventory' },
  { icon: Calculator, label: 'Lucratividade', path: '/inventory/analytics' },
  { icon: Tags, label: 'Categorias', path: '/categories' },
  { icon: BadgeDollarSign, label: 'Fluxo de Vendas', path: '/sales' },
  { icon: UserCircle2, label: 'Base de Clientes', path: '/customers' },
  { icon: LinkIcon, label: 'Catálogos Digitais', path: '/catalogs' },
  { icon: Users, label: 'Equipe Admin', path: '/team' },
  { icon: Settings, label: 'Configurações', path: '/settings' },
];

const bottomNavItems = [
  { icon: LayoutDashboard, label: 'Início', path: '/dashboard' },
  { icon: PackageSearch, label: 'Estoque', path: '/inventory' },
  { icon: BadgeDollarSign, label: 'Vendas', path: '/sales' },
  { icon: Menu, label: 'Mais', path: '__menu__' },
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
  }>({ 
    name: 'Laris ERP', 
    logo: null
  });

  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      const { data } = await supabase.from('store_settings')
        .select('store_name, logo_url, favicon_url')
        .eq('user_id', user.id)
        .limit(1).maybeSingle();

      if (data) {
        const proxyLogo = getProxyUrl(data.logo_url);
        setBrand({ 
          name: data.store_name || 'Laris ERP', 
          logo: proxyLogo
        });
        if (data.store_name) document.title = data.store_name + ' | Professional ERP';
      }
    };
    fetchSettings();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden relative w-full text-foreground selection:bg-primary/30 selection:text-white">
      
      {/* ── Mobile Top Bar ────────────────────────────────── */}
      <header className="md:hidden flex items-center justify-between px-6 h-16 shrink-0 glass-card !rounded-none border-x-0 border-t-0 z-40 fixed top-0 w-full">
          <div className="flex items-center gap-3">
          {brand.logo ? (
            <img src={brand.logo} alt="Logo" crossOrigin="anonymous" className="h-8 w-auto max-w-[100px] object-contain" />
          ) : (
            <Store className="h-6 w-6 text-primary" />
          )}
          <span className="font-black text-sm tracking-tight">{brand.name}</span>
        </div>
        <div className="bg-primary/10 p-2 rounded-full border border-primary/20">
          <UserCircle2 size={18} className="text-primary" />
        </div>
      </header>

      {/* ── Sidebar (Desktop) ─────────────────────────────── */}
      <aside className={cn(
        'hidden md:flex flex-col glass-card !rounded-none border-y-0 border-l-0 transition-all duration-500 z-50 overflow-hidden relative',
        collapsed ? 'w-20' : 'w-72'
      )}>
        {/* Decorative Aura Spot in Sidebar */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/10 blur-[60px] pointer-events-none" />

        {/* Branding Container */}
        <div className="p-8 pb-6 flex items-center justify-center min-h-[120px] relative">
          {!collapsed ? (
            <div className="w-full animate-in fade-in slide-in-from-left duration-700">
               {brand.logo ? (
                 <img src={brand.logo} alt="Logo" className="max-h-16 w-auto max-w-full mx-auto" />
               ) : (
                 <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/5 shadow-2xl">
                    <Store className="text-primary" size={24} />
                    <span className="font-black text-lg tracking-tighter">{brand.name}</span>
                 </div>
               )}
            </div>
          ) : (
            <Store size={24} className="text-primary animate-pulse" />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 group',
                isActive
                  ? 'bg-primary text-white shadow-[0_10px_20px_-5px_rgba(233,30,140,0.3)]'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-white'
              )}
            >
              <item.icon size={18} className={cn('shrink-0 transition-transform duration-300 group-hover:scale-110')} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-6 border-t border-white/5 space-y-3">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 w-full text-sm font-bold text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
          >
            <LogOut size={18} />
            {!collapsed && <span>Encerrar Sessão</span>}
          </button>
          
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex justify-center py-2 text-white/20 hover:text-white transition-colors"
          >
            {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
          </button>
        </div>
      </aside>

      {/* ── Mobile Sidebar Drawer ─────────────────────────── */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] md:hidden" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-[80%] glass-card !rounded-l-3xl !rounded-r-none z-[70] md:hidden animate-in slide-in-from-right duration-500 overflow-y-auto p-8 shadow-2xl">
             <div className="flex items-center justify-between mb-10">
                <span className="font-black text-xl uppercase tracking-tighter">Menu Global</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 bg-white/5 rounded-full"><X size={20}/></button>
             </div>
             <div className="space-y-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) => cn(
                      'flex items-center gap-4 p-4 rounded-2xl text-[13px] font-black uppercase tracking-widest transition-all',
                      isActive ? 'bg-primary text-white' : 'text-white/40'
                    )}
                  >
                    <item.icon size={20} />
                    {item.label}
                  </NavLink>
                ))}
             </div>
             <div className="mt-12 pt-8 border-t border-white/5">
                <button onClick={handleSignOut} className="flex items-center gap-3 text-red-400 p-4 font-black uppercase tracking-widest text-[13px]">
                   <LogOut size={20} /> Sair do Sistema
                </button>
             </div>
          </div>
        </>
      )}

      {/* ── Main Workspace ────────────────────────────────── */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto pt-20 md:pt-10 pb-20 md:pb-10 px-6 md:px-12 w-full relative z-10">
        <div className="max-w-7xl mx-auto min-h-full">
           {children}
        </div>

        {/* Internal Trust Footer (Desktop) */}
        <div className="hidden md:flex items-center justify-between mt-20 opacity-20 border-t border-white/5 pt-10">
           <div className="flex items-center gap-3">
              <ShieldCheck size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Professional Enterprise Edition v2.0.0</span>
           </div>
           <span className="text-[10px] font-black uppercase tracking-[0.2em]">{brand.name} @ 2026</span>
        </div>
      </main>

      {/* ── Bottom Nav (Mobile Only) ──────────────────────── */}
      <nav className="md:hidden fixed bottom-6 left-6 right-6 z-50 glass-card !rounded-3xl border-white/10 h-16 flex items-stretch shadow-2xl safe-area-inset-bottom">
        {bottomNavItems.map((item) => {
          const isActive = item.path !== '__menu__' && location.pathname.startsWith(item.path);
          const isMenu = item.path === '__menu__';
          return (
            <button
              key={item.path}
              onClick={() => isMenu ? setMobileMenuOpen(true) : navigate(item.path)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 transition-all',
                isActive ? 'text-primary scale-110' : 'text-white/30'
              )}
            >
              <item.icon size={22} className={cn(isActive ? 'drop-shadow-[0_0_10px_rgba(233,30,140,0.5)]' : '')} />
              <span className="text-[9px] font-black uppercase tracking-wider">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
