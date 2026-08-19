import React, { createContext, useContext, useState, useEffect } from 'react';
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

  const [loading, setLoading] = useState(false);

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

  const logout = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setUser(null);
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
        loading,
        login,
        logout
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
