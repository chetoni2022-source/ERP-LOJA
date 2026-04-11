import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import { useAuthStore } from './stores/authStore';
import { supabase } from './lib/supabase';
import { AppLayout } from './components/layout/AppLayout';

// Lazy load all pages
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
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin h-7 w-7 border-[3px] border-primary border-t-transparent rounded-full" />
  </div>
);

/**
 * Persists the Layout and Session state across navigations.
 * This fixes the "white screen" bug when using the browser back button.
 */
function DashboardLayout() {
  const { user, loading } = useAuthStore();
  
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  
  return (
    <AppLayout>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </AppLayout>
  );
}

export default function App() {
  const { setUser, loading } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  if (loading) return <PageLoader />;

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/c/:id" element={<CatalogPublicView />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected Routes (Persisted Layout) */}
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/inventory/analytics" element={<UnitEconomicsPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/sales" element={<SalesPage />} />
              <Route path="/catalogs" element={<CatalogBuilderPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/customers" element={<CustomersPage />} />
            </Route>

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}
