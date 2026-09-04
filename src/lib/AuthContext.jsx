import React, { createContext, useState, useContext, useEffect } from 'react';
import {
  getCurrentUser,
  getStoredSession,
  signOut,
  storeSession,
  supabaseConfigured,
} from '@/lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings] = useState(null);

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    const session = getStoredSession();

    if (!session?.access_token) {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return;
    }

    try {
      const currentUser = await getCurrentUser(session.access_token);
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error) {
      storeSession(null);
      setUser(null);
      setIsAuthenticated(false);
      if (supabaseConfigured && (error.status === 401 || error.status === 403)) {
        setAuthError({ type: 'auth_required', message: 'Your session has expired. Please log in again.' });
      }
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const logout = async () => {
    const session = getStoredSession();
    try {
      await signOut(session?.access_token);
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      storeSession(null);
      setUser(null);
      setIsAuthenticated(false);
      window.location.href = '/SafeSpace-school-project-/';
    }
  };

  const navigateToLogin = () => {
    const returnTo = window.location.href;
    window.location.href = `/SafeSpace-school-project-/login?returnTo=${encodeURIComponent(returnTo)}`;
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
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState: checkUserAuth,
      supabaseConfigured,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
