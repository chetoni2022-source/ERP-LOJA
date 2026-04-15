import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  ClipboardList, 
  Package, 
  MessageSquare, 
  Settings, 
  LogOut,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: ClipboardList, label: 'Ordens de Serviço', path: '/admin/os' },
  { icon: Users, label: 'Clientes', path: '/admin/clientes' },
  { icon: Car, label: 'Veículos', path: '/admin/veiculos' },
  { icon: Package, label: 'Produtos/Serviços', path: '/admin/catalogo' },
  { icon: Settings, label: 'Configurações', path: '/admin/config' },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-white overflow-hidden font-sans">
      {/* ── Mobile Header ────────────────────────────────── */}
      <header className="md:hidden fixed top-0 w-full h-16 glass z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center glow-primary">
            <Car size={20} className="text-white" />
          </div>
          <span className="font-black text-xl tracking-tighter uppercase italic">TMC<span className="text-primary">AR</span></span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-white/70 hover:text-white transition-colors">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* ── Desktop Sidebar ──────────────────────────────── */}
      <aside 
        className={cn(
          "hidden md:flex flex-col h-full glass border-r border-white/5 transition-all duration-500 ease-apple relative z-40",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        {/* Logo Section */}
        <div className="p-6 flex items-center gap-3 shrink-0">
          <motion.div 
            layout
            className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 overflow-hidden"
          >
            <img src="/src/assets/logo.png" alt="TMC AR" className="w-full h-full object-contain" />
          </motion.div>
          {isSidebarOpen && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-black text-2xl tracking-tighter uppercase italic"
            >
              TMC<span className="text-primary">AR</span>
            </motion.span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative",
                  isActive 
                    ? "bg-primary text-white glow-primary" 
                    : "text-white/50 hover:text-white hover:bg-white/5"
                )}
                title={!isSidebarOpen ? item.label : undefined}
              >
                <item.icon size={20} className={cn("shrink-0 transition-transform group-hover:scale-110", isActive && "text-white")} />
                {isSidebarOpen && (
                  <span className="font-bold text-sm tracking-tight">{item.label}</span>
                )}
                {isActive && isSidebarOpen && (
                  <motion.div 
                    layoutId="active-pill"
                    className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_white]"
                  />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User / Footer */}
        <div className="p-4 border-t border-white/5 space-y-2">
          <button 
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/50 hover:text-red-500 hover:bg-red-500/10 transition-all group"
            onClick={() => {/* handle logout */}}
          >
            <LogOut size={20} className="shrink-0 transition-transform group-hover:-translate-x-1" />
            {isSidebarOpen && <span className="font-bold text-sm">Sair do Sistema</span>}
          </button>
          
          <button 
            onClick={toggleSidebar}
            className="w-full hidden md:flex items-center justify-center py-2 text-white/20 hover:text-white/50 transition-colors"
          >
            <ChevronRight className={cn("transition-transform duration-500", isSidebarOpen ? "rotate-180" : "rotate-0")} size={18} />
          </button>
        </div>
      </aside>

      {/* ── Mobile Sidebar (Overlay) ─────────────────────── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] md:hidden"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[280px] glass z-[70] md:hidden flex flex-col p-6 shadow-2xl shadow-primary/10"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden">
                    <img src="/src/assets/logo.png" alt="TMC AR" className="w-full h-full object-contain" />
                  </div>
                  <span className="font-black text-2xl tracking-tighter uppercase italic">TMC<span className="text-primary">AR</span></span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-white/50"><X size={24} /></button>
              </div>

              <nav className="flex-1 space-y-3">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300",
                        isActive 
                          ? "bg-primary text-white glow-primary" 
                          : "text-white/50 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <item.icon size={22} className="shrink-0" />
                      <span className="font-bold text-lg tracking-tight">{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>

              <div className="pt-6 border-t border-white/5">
                <button className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-all font-bold text-lg">
                  <LogOut size={22} />
                  Sair
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content Area ───────────────────────────── */}
      <main className="flex-1 h-full overflow-y-auto overflow-x-hidden pt-16 md:pt-0 pb-10">
        <div className="max-w-7xl mx-auto px-6 py-8 md:py-12 animate-spring">
          {children}
        </div>
      </main>

      {/* ── Background Glows ────────────────────────────── */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full -z-10 pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 blur-[120px] rounded-full -z-10 pointer-events-none" />
    </div>
  );
}
