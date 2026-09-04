import React, { createContext, useState, useContext, useEffect } from 'react';
import {
  clearAuthHash,
  getAuthTokensFromUrl,
  getCurrentUser,
  getStoredSession,
  refreshSession,
  signOut,
  storeSession,
  supabaseConfigured,
} from '@/lib/supabaseClient';

const AuthContext = createContext();
const APP_PREFIX = '/SafeSpace-school-project-';

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

    try {
      // Supabase implicit OAuth/password-recovery redirects return tokens in the URL hash.
      const urlSession = getAuthTokensFromUrl();
      if (urlSession?.access_token) {
        storeSession(urlSession);
        clearAuthHash();

        const authReturnTo = sessionStorage.getItem('safespace_auth_return_to');
        if (authReturnTo) sessionStorage.removeItem('safespace_auth_return_to');
        if (authReturnTo && window.location.pathname.endsWith('/login')) {
          window.location.href = authReturnTo;
          return;
        }
      }

      let session = getStoredSession();
      if (!session?.access_token) {
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      // Refresh shortly before expiry so users stay signed in between visits.
      const expiresAt = Number(session.expires_at || 0);
      if (session.refresh_token && expiresAt && expiresAt < Math.floor(Date.now() / 1000) + 60) {
        session = await refreshSession(session.refresh_token);
        storeSession(session);
      }

      const currentUser = await getCurrentUser(session.access_token);
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error) {
      storeSession(null);
      setUser(null);
      setIsAuthenticated(false);
      if (supabaseConfigured) {
        setAuthError({
          type: 'auth_required',
          message: 'Your session has expired. Please log in again.',
        });
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
      window.location.href = `${APP_PREFIX}/`;
    }
  };

  const navigateToLogin = () => {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    sessionStorage.setItem('safespace_auth_return_to', returnTo || '/');
    window.location.href = `${APP_PREFIX}/login?returnTo=${encodeURIComponent(returnTo || '/')}`;
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
