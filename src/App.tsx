import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import { useAuthStore } from './stores/authStore';
import { supabase } from './lib/supabase';
import AuthPage from './pages/auth/AuthPage';

import { AppLayout } from './components/layout/AppLayout';
import SettingsPage from './pages/settings/SettingsPage';
import InventoryPage from './pages/inventory/InventoryPage';
import CategoriesPage from './pages/categories/CategoriesPage';
import SalesPage from './pages/sales/SalesPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import CatalogBuilderPage from './pages/catalogs/CatalogBuilderPage';
import CatalogPublicView from './pages/catalogs/CatalogPublicView';
import TeamPage from './pages/team/TeamPage';
import CustomersPage from './pages/customers/CustomersPage';

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
    // 1. Check for team invites
    try {
      const { data: invite } = await supabase
        .from('team_invites')
        .select('role')
        .eq('email', user.email)
        .maybeSingle();

      if (invite) {
        // Update profile role
        await supabase.from('profiles').update({ role: invite.role }).eq('id', user.id);
        // Delete invite
        await supabase.from('team_invites').delete().eq('email', user.email);
        // Refresh page to apply role changes if needed or just notify
        console.log('Joined team with role:', invite.role);
      }
    } catch (err) {
      console.error('Error joining team:', err);
    }

    // 2. Initial Setup Check (handled in AppLayout usually, but can be here too)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={!user ? <AuthPage /> : <Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={user ? <AppLayout><DashboardPage /></AppLayout> : <Navigate to="/auth" replace />} />
          <Route path="/inventory" element={user ? <AppLayout><InventoryPage /></AppLayout> : <Navigate to="/auth" replace />} />
          <Route path="/categories" element={user ? <AppLayout><CategoriesPage /></AppLayout> : <Navigate to="/auth" replace />} />
          <Route path="/sales" element={user ? <AppLayout><SalesPage /></AppLayout> : <Navigate to="/auth" replace />} />
          <Route path="/catalogs" element={user ? <AppLayout><CatalogBuilderPage /></AppLayout> : <Navigate to="/auth" replace />} />
          <Route path="/settings" element={user ? <AppLayout><SettingsPage /></AppLayout> : <Navigate to="/auth" replace />} />
          <Route path="/team" element={user ? <AppLayout><TeamPage /></AppLayout> : <Navigate to="/auth" replace />} />
          <Route path="/customers" element={user ? <AppLayout><CustomersPage /></AppLayout> : <Navigate to="/auth" replace />} />
          <Route path="/c/:id" element={<CatalogPublicView />} />
          <Route path="*" element={<Navigate to={user ? "/dashboard" : "/auth"} replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
