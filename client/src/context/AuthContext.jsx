import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, register as apiRegister, logout as apiLogout, getCurrentUser, getAuthToken, setAuthToken } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const initAuth = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.warn('Session restoration failed or expired:', err.message);
      setAuthToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();

    const handleUnauthorized = () => {
      setAuthToken(null);
      setUser(null);
    };

    window.addEventListener('dealmind:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('dealmind:unauthorized', handleUnauthorized);
  }, [initAuth]);

  const login = async (email, password) => {
    setError(null);
    try {
      const res = await apiLogin(email, password);
      setUser(res.user);
      return res.user;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const register = async (userData) => {
    setError(null);
    try {
      const res = await apiRegister(userData);
      setUser(res.user);
      return res.user;
    } catch (err) {
      setError(err.message || 'Registration failed');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
    }
  };

  const hasRole = (allowedRoles = []) => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true; // System Admin possesses all roles
    return allowedRoles.includes(user.role);
  };

  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated,
        role: user?.role || 'SALESPERSON',
        tenantId: user?.tenant_id || 'tenant_default',
        login,
        register,
        logout,
        hasRole,
        refreshUser: initAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
