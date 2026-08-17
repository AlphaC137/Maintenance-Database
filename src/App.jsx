import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import Layout from '@/components/Layout';
import ThemeProvider from '@/components/ThemeProvider';
import Dashboard from '@/pages/Dashboard';
import Sites from '@/pages/Sites';
import SiteDetail from '@/pages/SiteDetail';
import Platforms from '@/pages/Platforms';
import Reports from '@/pages/Reports';
import AuditLogPage from '@/pages/AuditLogPage';
import SettingsPage from '@/pages/Settings';
import Clients from '@/pages/Clients';
import ProtectedRoute from '@/components/ProtectedRoute';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return (
        <div className="fixed inset-0 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Redirecting to login…</p>
        </div>
      );
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={
        <ProtectedRoute unauthenticatedElement={
          <div className="fixed inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Redirecting to login…</p>
          </div>
        } />
      }>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sites" element={<Sites />} />
          <Route path="/sites/:id" element={<SiteDetail />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/platforms" element={<Platforms />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/audit" element={<AuditLogPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <ThemeProvider>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        </ThemeProvider>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App