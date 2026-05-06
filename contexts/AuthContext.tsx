'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient, AuthUser, authUtils } from '@/lib/auth-client';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: 'admin' | 'teacher' | 'student') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize authentication state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = apiClient.getToken();
        
        if (storedToken) {
          // Check if token is still valid
          if (!authUtils.isTokenExpired(storedToken)) {
            setToken(storedToken);
            
            // Get current user
            const currentUser = await apiClient.getCurrentUser();
            if (currentUser) {
              setUser(currentUser);
            } else {
              // Token is invalid, clear it
              apiClient.clearToken();
              setToken(null);
            }
          } else {
            // Token is expired, clear it
            apiClient.clearToken();
            setToken(null);
          }
        }
      } catch (error) {
        console.error('Failed to initialize authentication:', error);
        apiClient.clearToken();
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await apiClient.login({ username, password });
      
      if (response.success) {
        setUser(response.data.user);
        setToken(response.data.token);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
      setToken(null);
      apiClient.clearToken();
    }
  };

  const hasPermission = (permission: string): boolean => {
    return authUtils.hasPermission(user, permission);
  };

  const hasRole = (role: 'admin' | 'teacher' | 'student'): boolean => {
    return authUtils.hasRole(user, role);
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    hasPermission,
    hasRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// Higher-order component for protected routes
interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'teacher' | 'student';
  requiredPermission?: string;
  fallback?: ReactNode;
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  requiredPermission,
  fallback 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasRole, hasPermission } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // Redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null;
  }

  // Check role requirements
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">访问被拒绝</h2>
          <p className="text-gray-600">您没有权限访问此页面</p>
        </div>
      </div>
    );
  }

  // Check permission requirements
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">访问被拒绝</h2>
          <p className="text-gray-600">您没有执行此操作的权限</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Hook for API calls with automatic authentication
export function useAuthenticatedApi() {
  const { isAuthenticated, logout } = useAuth();

  const authenticatedRequest = async <T,>(
    requestFn: () => Promise<T>
  ): Promise<T | null> => {
    if (!isAuthenticated) {
      return null;
    }

    try {
      return await requestFn();
    } catch (error) {
      console.error('Authenticated request failed:', error);
      
      // If it's an authentication error, logout
      if (error instanceof Error && error.message.includes('Authentication required')) {
        await logout();
      }
      
      throw error;
    }
  };

  return {
    apiClient,
    authenticatedRequest
  };
}
