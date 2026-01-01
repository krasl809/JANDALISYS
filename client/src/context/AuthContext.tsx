import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
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

  const loadUserFromStorage = () => {
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

      const userData = {
        id: userId,
        name: userName,
        email: userEmail,
        role: userRole,
        permissions: permissions
      };
      
      if (import.meta.env.DEV) {
        console.log('Loading user from storage:', userData);
      }
      setUser(userData);
      setIsAuthenticated(true);
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
    setIsLoading(false);
  };

  // التحقق من التوكن المحفوظ عند بدء التطبيق
  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const refreshUser = () => {
    console.log('Refreshing user data from localStorage...');
    loadUserFromStorage();
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    // Note: Actual login logic is in Login.tsx component using api.post
    // This context mainly holds the state after login is successful
    console.warn("Context login function called - normally handled in Login component");
    return false;
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);

    // مسح البيانات من localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_permissions');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) {
      if (import.meta.env.DEV) {
        console.log('No user found for permission check:', permission);
      }
      return false;
    }
    if (user.role === 'admin') {
      if (import.meta.env.DEV) {
        console.log('Admin user has permission:', permission);
      }
      return true; // Admin always has access
    }
    const hasPerm = user.permissions.includes(permission);
    if (import.meta.env.DEV) {
      console.log('Permission check:', { user: user.email, permission, hasPerm, userPermissions: user.permissions });
    }
    return hasPerm;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, isAuthenticated, isLoading, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};