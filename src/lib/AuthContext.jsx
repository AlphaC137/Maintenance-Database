import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [appPublicSettings] = useState({ id: 'local_app', public_settings: {} });

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
      setPendingApproval(false);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const login = async (email, password) => {
    const loggedInUser = await base44.auth.loginViaEmailPassword(email, password);
    setUser(loggedInUser);
    setIsAuthenticated(true);
    setPendingApproval(false);
    return loggedInUser;
  };

  const register = async (email, password, fullName) => {
    const result = await base44.auth.register({ email, password, full_name: fullName });
    if (result?.pending) {
      setPendingApproval(true);
    }
    return result;
  };

  const checkAppState = async () => {
    await checkUserAuth();
  };

  const logout = (shouldRedirect = false) => {
    base44.auth.logout(shouldRedirect ? window.location.origin : null);
    setUser(null);
    setIsAuthenticated(false);
    setPendingApproval(false);
  };

  const navigateToLogin = () => {
    checkUserAuth();
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      pendingApproval,
      login,
      register,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
