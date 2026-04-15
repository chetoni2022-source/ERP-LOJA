import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import { useAuthStore } from './stores/authStore';
import { supabase } from './lib/supabase';
import { AppLayout } from './components/layout/AppLayout';
import { AdminLayout } from './components/layout/AdminLayout';

// TMC AR Pages
const TMCDashboard = lazy(() => import('./pages/admin/Dashboard'));
const TMCPublicCatalog = lazy(() => import('./pages/public/Catalog'));
const TMCCRM = lazy(() => import('./pages/admin/CRM'));
const TMCOSFlow = lazy(() => import('./pages/admin/OSFlow'));

// Lazy load existing pages
const AuthPage = lazy(() => import('./pages/auth/AuthPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const InventoryPage = lazy(() => import('./pages/inventory/InventoryPage'));
const UnitEconomicsPage = lazy(() => import('./pages/inventory/UnitEconomicsPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin h-7 w-7 border-[3px] border-primary border-t-transparent rounded-full" />
  </div>
);

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

// TMC AR Admin Layout Wrapper
function TMCLayout() {
  const { user, loading } = useAuthStore();
  
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  
  return (
    <AdminLayout>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </AdminLayout>
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
    <ThemeProvider defaultTheme="dark" storageKey="tmc-ar-theme">
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/pedido/:slug" element={<TMCPublicCatalog />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* TMC AR Admin Routes */}
            <Route element={<TMCLayout />}>
              <Route path="/admin" element={<TMCDashboard />} />
              <Route path="/admin/os" element={<TMCOSFlow />} />
              <Route path="/admin/clientes" element={<TMCCRM />} />
              <Route path="/admin/veiculos" element={<TMCCRM />} />
              <Route path="/admin/catalogo" element={<div className="text-white">Catalog Management Coming Soon</div>} />
              <Route path="/admin/config" element={<SettingsPage />} />
            </Route>

            {/* Default Redirects */}
            <Route path="/" element={<Navigate to="/admin" replace />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}
