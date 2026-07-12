import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useToast } from './ToastContext';

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  role: 'Admin' | 'Asset Manager' | 'Department Head' | 'Employee';
  is_active: boolean;
  department_id: number | null;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Set default axios configuration
axios.defaults.baseURL = 'http://localhost:8000/api/v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('assetflow_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const { showToast } = useToast();

  const logout = useCallback(() => {
    localStorage.removeItem('assetflow_token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    showToast('Logged out successfully', 'info');
  }, [showToast]);

  const refreshUser = useCallback(async () => {
    const currentToken = localStorage.getItem('assetflow_token');
    if (!currentToken) {
      setLoading(false);
      return;
    }

    axios.defaults.headers.common['Authorization'] = `Bearer ${currentToken}`;
    try {
      const response = await axios.get<UserProfile>('/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Session validation failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  const login = useCallback(async (newToken: string) => {
    localStorage.setItem('assetflow_token', newToken);
    setToken(newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setLoading(true);
    try {
      const response = await axios.get<UserProfile>('/auth/me');
      setUser(response.data);
      showToast(`Welcome back, ${response.data.full_name}!`, 'success');
    } catch (error) {
      console.error('Profile fetch failed after login:', error);
      logout();
      throw error;
    } finally {
      setLoading(false);
    }
  }, [logout, showToast]);

  // Set up axios token on mount and interceptors
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      refreshUser();
    } else {
      setLoading(false);
    }

    // Interceptor to catch 401s
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [token, refreshUser, logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
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
export default axios;
