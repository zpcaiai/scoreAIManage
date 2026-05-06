// Client-side authentication utilities
export interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'teacher' | 'student';
  permissions: string[];
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: AuthUser;
    token: string;
    expiresIn: string;
  };
  message: string;
}

// Secure API client with authentication
export class SecureApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
  }

  setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const url = `${this.baseURL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Add CSRF token if available
    if (typeof window !== 'undefined') {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // Include cookies for CSRF protection
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle authentication errors
        if (response.status === 401) {
          this.clearToken();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          throw new Error('Authentication required');
        }

        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const response = await this.request<{ success: boolean; data: AuthUser }>('/auth/me');
      return response.success ? response.data : null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  // Generic CRUD operations
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // Specific API methods
  async getClasses(): Promise<any> {
    return this.get('/classes');
  }

  async createClass(data: any): Promise<any> {
    return this.post('/classes', data);
  }

  async updateClass(id: string, data: any): Promise<any> {
    return this.put(`/classes/${id}`, data);
  }

  async deleteClass(id: string): Promise<any> {
    return this.delete(`/classes/${id}`);
  }

  async getStudents(classId?: string): Promise<any> {
    const endpoint = classId ? `/students?classId=${classId}` : '/students';
    return this.get(endpoint);
  }

  async createStudent(data: any): Promise<any> {
    return this.post('/students', data);
  }

  async updateStudent(id: string, data: any): Promise<any> {
    return this.put(`/students/${id}`, data);
  }

  async deleteStudent(id: string): Promise<any> {
    return this.delete(`/students/${id}`);
  }

  async getGrades(filters?: any): Promise<any> {
    const params = new URLSearchParams(filters).toString();
    const endpoint = params ? `/grades?${params}` : '/grades';
    return this.get(endpoint);
  }

  async createGrade(data: any): Promise<any> {
    return this.post('/grades', data);
  }

  async updateGrade(id: string, data: any): Promise<any> {
    return this.put(`/grades/${id}`, data);
  }

  async deleteGrade(id: string): Promise<any> {
    return this.delete(`/grades/${id}`);
  }

  async batchCreateGrades(grades: any[]): Promise<any> {
    return this.post('/grades/batch', { grades });
  }

  async getSubjects(): Promise<any> {
    return this.get('/subjects');
  }

  async getExams(): Promise<any> {
    return this.get('/exams');
  }

  async getClassStatistics(examId: string): Promise<any> {
    return this.get(`/statistics/class?examId=${examId}`);
  }

  async getSubjectStatistics(examId: string): Promise<any> {
    return this.get(`/statistics/subject?examId=${examId}`);
  }

  async getTopStudents(examId: string): Promise<any> {
    return this.get(`/statistics/top?examId=${examId}`);
  }
}

// Create singleton instance
export const apiClient = new SecureApiClient();

// Authentication utilities
export const authUtils = {
  // Check if user has specific permission
  hasPermission(user: AuthUser | null, permission: string): boolean {
    if (!user) return false;
    return user.permissions.includes(permission) || user.role === 'admin';
  },

  // Check if user has specific role or higher
  hasRole(user: AuthUser | null, requiredRole: 'admin' | 'teacher' | 'student'): boolean {
    if (!user) return false;
    
    const roleHierarchy = {
      admin: 3,
      teacher: 2,
      student: 1
    };
    
    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  },

  // Get user display name
  getDisplayName(user: AuthUser | null): string {
    if (!user) return 'Guest';
    return user.username;
  },

  // Check if token is expired (basic check)
  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch {
      return true; // If we can't parse, assume it's expired
    }
  },

  // Refresh token if needed
  async refreshTokenIfNeeded(): Promise<boolean> {
    const token = apiClient.getToken();
    if (!token || this.isTokenExpired(token)) {
      try {
        const currentUser = await apiClient.getCurrentUser();
        if (currentUser) {
          return true;
        } else {
          apiClient.clearToken();
          return false;
        }
      } catch {
        apiClient.clearToken();
        return false;
      }
    }
    return true;
  }
};

// Request interceptor for automatic token refresh
export function setupRequestInterceptor(): void {
  if (typeof window === 'undefined') return;

  // Override fetch to add authentication headers
  const originalFetch = window.fetch;
  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const token = apiClient.getToken();
    
    if (token && input.toString().startsWith('/api/')) {
      init = init || {};
      init.headers = {
        ...init.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    try {
      const response = await originalFetch(input, init);
      
      // Handle 401 responses
      if (response.status === 401) {
        apiClient.clearToken();
        window.location.href = '/login';
      }
      
      return response;
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  };
}
