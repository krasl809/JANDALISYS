import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  avatar?: string;
}

interface AuthContextProps {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadUserFromStorage = React.useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem('access_token');
    const userId = localStorage.getItem('user_id');
    const userRole = localStorage.getItem('user_role');
    const userEmail = localStorage.getItem('user_email') || 'user@example.com';
    const userName = localStorage.getItem('user_name') || 'User';
    const savedPermissions = localStorage.getItem('user_permissions');

    if (token && userId && userRole) {
      let permissions: string[] = [];
      try {
        permissions = savedPermissions ? JSON.parse(savedPermissions) : [];
      } catch (e) {
        console.error("Failed to parse permissions", e);
      }

      // Try to refresh permissions from backend if we have a token
      try {
        // We use a dynamic import or require to avoid circular dependency if api service uses useAuth
        const api = (await import('../services/api')).default;
        const response = await api.get(`rbac/user-permissions/${userId}`);
        if (response.data && Array.isArray(response.data)) {
          permissions = response.data;
          localStorage.setItem('user_permissions', JSON.stringify(permissions));
        }
      } catch (error) {
        console.warn("Could not refresh permissions from backend, using cached ones", error);
      }

      const userData = {
        id: userId,
        name: userName,
        email: userEmail,
        role: userRole,
        permissions: permissions
      };
      
      if (import.meta.env.DEV) {
        console.log('Loading user with permissions:', userData);
      }
      setUser(userData);
      setIsAuthenticated(true);
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
    setIsLoading(false);
  }, []);

  // التحقق من التوكن المحفوظ عند بدء التطبيق
  useEffect(() => {
    loadUserFromStorage();
  }, [loadUserFromStorage]);

  const refreshUser = React.useCallback(() => {
    if (import.meta.env.DEV) {
      console.log('Refreshing user data from localStorage...');
    }
    loadUserFromStorage();
  }, []);

  const login = React.useCallback(async (_email: string, _password: string): Promise<boolean> => {
    // Note: Actual login logic is in Login.tsx component using api.post
    // This context mainly holds the state after login is successful
    console.warn("Context login function called - normally handled in Login component");
    return false;
  }, []);

  const logout = React.useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);

    // مسح البيانات من localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_permissions');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
  }, []);

  const hasPermission = React.useCallback((permission: string): boolean => {
    if (!user) {
      return false;
    }
    if (user.role === 'admin') {
      return true; // Admin always has access
    }
    return user.permissions.includes(permission);
  }, [user]);

  const value = React.useMemo(() => ({
    user,
    login,
    logout,
    refreshUser,
    isAuthenticated,
    isLoading,
    hasPermission
  }), [user, login, logout, refreshUser, isAuthenticated, isLoading, hasPermission]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};