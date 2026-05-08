'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiClient, AuthUser, authUtils, decodeTokenPayload, setupRequestInterceptor } from '@/lib/auth-client';

// Initialize the global fetch interceptor to attach Bearer tokens to all API requests
if (typeof window !== 'undefined') {
  setupRequestInterceptor();
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: 'teacher') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize authentication state from stored token (no network call needed)
  useEffect(() => {
    const initAuth = () => {
      try {
        // Try localStorage first, then fall back to cookie value
        let storedToken = apiClient.getToken();

        if (!storedToken && typeof document !== 'undefined') {
          // Read from cookie as fallback (set by server on login response)
          const cookieMatch = document.cookie
            .split('; ')
            .find(row => row.startsWith('auth_token='));
          if (cookieMatch) {
            storedToken = decodeURIComponent(cookieMatch.split('=').slice(1).join('='));
            if (storedToken) {
              // Sync back to localStorage so subsequent API calls work
              apiClient.setToken(storedToken);
            }
          }
        }

        if (storedToken && !authUtils.isTokenExpired(storedToken)) {
          // Decode user info directly from the JWT — no network round-trip,
          // no risk of a 401 causing an unwanted redirect.
          const userFromToken = decodeTokenPayload(storedToken);
          if (userFromToken) {
            setToken(storedToken);
            setUser(userFromToken);
          } else {
            apiClient.clearToken();
          }
        } else {
          // Token missing or expired
          apiClient.clearToken();
        }
      } catch (error) {
        console.error('Failed to initialize authentication:', error);
        apiClient.clearToken();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      console.log('[AuthContext] Starting login for:', username);
      const response = await apiClient.login({ username, password });
      console.log('[AuthContext] Login response:', response);
      
      if (response.success) {
        console.log('[AuthContext] Login successful, setting user and token');
        setUser(response.data.user);
        setToken(response.data.token);
        return true;
      }
      
      console.log('[AuthContext] Login failed: response.success is false');
      return false;
    } catch (error) {
      console.error('[AuthContext] Login error:', error);
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

  const hasRole = (role: 'teacher'): boolean => {
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
  requiredRole?: 'teacher';
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
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      if (!fallback) {
        // Redirect to login, preserving the current path so login can redirect back
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
    }
  }, [isLoading, isAuthenticated, fallback, router, pathname]);

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
    // Show loading while redirect is in progress
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
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
