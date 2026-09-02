import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthService } from '../services/api';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

const SESSION_STORAGE_KEY = 'megatrix_auth_session';

export const AuthProvider = ({ children }) => {
  const { addToast } = useToast();
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  const [quota, setQuota] = useState(null);
  const [loading, setLoading] = useState(false);

  const isSuperAdmin = user?.role === 'superadmin';

  // Refresh user data & live GMB quota from backend
  const refreshUser = useCallback(async () => {
    try {
      const res = await AuthService.getMe();
      if (res.data.success) {
        const updatedUser = {
          ...user,
          ...res.data.user
        };
        setUser(updatedUser);
        setQuota(res.data.quota);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedUser));
      }
    } catch (err) {
      // If unauthorized, trigger logout
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
      }
    }
  }, [user]);

  // Sync quota on initial load if user is authenticated
  useEffect(() => {
    if (user?.token) {
      refreshUser();
    }
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await AuthService.login({ email, password });
      if (res.data.success) {
        const userData = {
          ...res.data.user,
          token: res.data.token,
          authenticatedAt: new Date().toISOString()
        };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(userData));
        setUser(userData);
        if (res.data.quota) {
          setQuota(res.data.quota);
        }
        addToast({
          title: 'Authentication Successful',
          message: `Welcome back, ${userData.name}!`,
          type: 'success',
          duration: 3000
        });
        return { success: true };
      }
      return { success: false, message: res.data.message || 'Login failed' };
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Authentication failed. Please check credentials.';
      addToast({
        title: 'Authentication Error',
        message: errorMessage,
        type: 'error',
        duration: 4000
      });
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const res = await AuthService.changePassword({ currentPassword, newPassword });
      if (res.data.success) {
        addToast({
          title: 'Password Changed',
          message: res.data.message || 'Password updated successfully.',
          type: 'success',
          duration: 4000
        });
        return { success: true };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to change password.';
      addToast({
        title: 'Password Change Failed',
        message: errorMessage,
        type: 'error',
        duration: 4000
      });
      return { success: false, message: errorMessage };
    }
  };

  const logout = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setUser(null);
    setQuota(null);
    addToast({
      title: 'Signed Out',
      message: 'You have been securely signed out.',
      type: 'info',
      duration: 3000
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isSuperAdmin,
        quota,
        refreshUser,
        loading,
        login,
        logout,
        changePassword
      }}
    >
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
