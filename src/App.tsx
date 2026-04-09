import { useEffect, lazy, Suspense } from 'react';
import { HashRouter as Router, BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import { useAuthStore } from './stores/authStore';
import { supabase } from './lib/supabase';
import { AppLayout } from './components/layout/AppLayout';

// Lazy load all pages — only downloads what the user needs
const AuthPage = lazy(() => import('./pages/auth/AuthPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const InventoryPage = lazy(() => import('./pages/inventory/InventoryPage'));
const UnitEconomicsPage = lazy(() => import('./pages/inventory/UnitEconomicsPage'));
const CategoriesPage = lazy(() => import('./pages/categories/CategoriesPage'));
const SalesPage = lazy(() => import('./pages/sales/SalesPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const CatalogBuilderPage = lazy(() => import('./pages/catalogs/CatalogBuilderPage'));
const CatalogPublicView = lazy(() => import('./pages/catalogs/CatalogPublicView'));
const TeamPage = lazy(() => import('./pages/team/TeamPage'));
const CustomersPage = lazy(() => import('./pages/customers/CustomersPage'));

// Lightweight fallback spinner
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin h-7 w-7 border-[3px] border-primary border-t-transparent rounded-full" />
  </div>
);

export default function App() {
  const { user, setUser, loading } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) handlePostLogin(session.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN' && session?.user) {
        handlePostLogin(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  async function handlePostLogin(user: any) {
    try {
      const { data: invite } = await supabase
        .from('team_invites')
        .select('role')
        .eq('email', user.email)
        .maybeSingle();

      if (invite) {
        await supabase.from('profiles').update({ role: invite.role }).eq('id', user.id);
        await supabase.from('team_invites').delete().eq('email', user.email);
        console.log('Joined team with role:', invite.role);
      }
    } catch (err) {
      console.error('Error joining team:', err);
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/auth" element={!user ? <AuthPage /> : <Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={user ? <AppLayout><DashboardPage /></AppLayout> : <Navigate to="/auth" replace />} />
            <Route path="/inventory" element={user ? <AppLayout><InventoryPage /></AppLayout> : <Navigate to="/auth" replace />} />
            <Route path="/inventory/analytics" element={user ? <AppLayout><UnitEconomicsPage /></AppLayout> : <Navigate to="/auth" replace />} />
            <Route path="/categories" element={user ? <AppLayout><CategoriesPage /></AppLayout> : <Navigate to="/auth" replace />} />
            <Route path="/sales" element={user ? <AppLayout><SalesPage /></AppLayout> : <Navigate to="/auth" replace />} />
            <Route path="/catalogs" element={user ? <AppLayout><CatalogBuilderPage /></AppLayout> : <Navigate to="/auth" replace />} />
            <Route path="/settings" element={user ? <AppLayout><SettingsPage /></AppLayout> : <Navigate to="/auth" replace />} />
            <Route path="/team" element={user ? <AppLayout><TeamPage /></AppLayout> : <Navigate to="/auth" replace />} />
            <Route path="/customers" element={user ? <AppLayout><CustomersPage /></AppLayout> : <Navigate to="/auth" replace />} />
            <Route path="/c/:id" element={<CatalogPublicView />} />
            <Route path="*" element={<Navigate to={user ? "/dashboard" : "/auth"} replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}
