import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import PendingApproval from '@/pages/PendingApproval';

const Spinner = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
  </div>
);

export default function ProtectedRoute() {
  const { isAuthenticated, isLoadingAuth, authChecked, pendingApproval, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authChecked && !isLoadingAuth && !isAuthenticated && !pendingApproval) {
      navigate('/login', { replace: true });
    }
  }, [authChecked, isLoadingAuth, isAuthenticated, pendingApproval, navigate]);

  if (isLoadingAuth || !authChecked) {
    return <Spinner />;
  }

  // User is registered but pending approval
  if (pendingApproval || user?.status === 'pending') {
    return <PendingApproval />;
  }

  if (!isAuthenticated) {
    return <Spinner />;
  }

  return <Outlet />;
}
