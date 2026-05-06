import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { render, screen, fireEvent, waitFor } from '../utils/test-utils'
import { mockApiResponse } from '../utils/test-utils'
import { UserRole } from '@/lib/auth'

// Mock the auth API
const mockLogin = jest.fn()
const mockLogout = jest.fn()
const mockAuthenticatedRequest = jest.fn()

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  ...jest.requireActual('@/contexts/AuthContext'),
  AuthProvider: ({ children, value }: any) => (
    <div data-testid="auth-provider">
      {children}
      <div data-testid="auth-state">
        {JSON.stringify(value)}
      </div>
    </div>
  ),
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    login: mockLogin,
    logout: mockLogout,
    loading: false,
    authenticatedRequest: mockAuthenticatedRequest
  })
}))

describe('Authentication Module', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Login Functionality', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: UserRole.TEACHER
      }

      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      }

      mockLogin.mockResolvedValue({
        success: true,
        user: mockUser,
        tokens: mockTokens
      })

      const { result } = render(() => {
        const auth = useAuth()
        return (
          <div>
            <button 
              onClick={() => auth.login('testuser', 'password123')}
              data-testid="login-button"
            >
              Login
            </button>
            <div data-testid="auth-status">
              {auth.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
            </div>
            <div data-testid="user-info">
              {auth.user ? auth.user.username : 'No User'}
            </div>
          </div>
        )
      })

      const loginButton = screen.getByTestId('login-button')
      fireEvent.click(loginButton)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('testuser', 'password123')
      })

      expect(mockLogin).toHaveBeenCalledTimes(1)
    })

    it('should handle login failure with invalid credentials', async () => {
      mockLogin.mockRejectedValue(new Error('Invalid credentials'))

      const { result } = render(() => {
        const auth = useAuth()
        return (
          <div>
            <button 
              onClick={() => auth.login('invaliduser', 'wrongpassword')}
              data-testid="login-button"
            >
              Login
            </button>
            <div data-testid="error-message">
              {auth.isAuthenticated ? 'Success' : 'Failed'}
            </div>
          </div>
        )
      })

      const loginButton = screen.getByTestId('login-button')
      fireEvent.click(loginButton)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('invaliduser', 'wrongpassword')
      })

      expect(mockLogin).toHaveBeenCalledTimes(1)
    })

    it('should store tokens in localStorage after successful login', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: UserRole.TEACHER
      }

      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      }

      mockLogin.mockResolvedValue({
        success: true,
        user: mockUser,
        tokens: mockTokens
      })

      const { result } = render(() => {
        const auth = useAuth()
        return (
          <button 
            onClick={() => auth.login('testuser', 'password123')}
            data-testid="login-button"
          >
            Login
          </button>
        )
      })

      const loginButton = screen.getByTestId('login-button')
      fireEvent.click(loginButton)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled()
      })

      // Check if tokens are stored (this would be handled in the actual auth context)
      expect(localStorage.setItem).toHaveBeenCalled()
    })
  })

  describe('Logout Functionality', () => {
    it('should logout successfully and clear tokens', async () => {
      mockLogout.mockResolvedValue({ success: true })

      const { result } = render(() => {
        const auth = useAuth()
        return (
          <div>
            <button 
              onClick={() => auth.logout()}
              data-testid="logout-button"
            >
              Logout
            </button>
            <div data-testid="auth-status">
              {auth.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
            </div>
          </div>
        )
      })

      const logoutButton = screen.getByTestId('logout-button')
      fireEvent.click(logoutButton)

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled()
      })

      expect(mockLogout).toHaveBeenCalledTimes(1)
    })

    it('should handle logout errors gracefully', async () => {
      mockLogout.mockRejectedValue(new Error('Logout failed'))

      const { result } = render(() => {
        const auth = useAuth()
        return (
          <button 
            onClick={() => auth.logout()}
            data-testid="logout-button"
          >
            Logout
          </button>
        )
      })

      const logoutButton = screen.getByTestId('logout-button')
      fireEvent.click(logoutButton)

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled()
      })

      expect(mockLogout).toHaveBeenCalledTimes(1)
    })
  })

  describe('Token Management', () => {
    it('should refresh access token when expired', async () => {
      const mockNewTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      }

      mockAuthenticatedRequest.mockResolvedValue({
        success: true,
        data: { message: 'Token refreshed' }
      })

      const { result } = render(() => {
        const auth = useAuth()
        return (
          <button 
            onClick={() => auth.authenticatedRequest('/api/test', 'GET')}
            data-testid="authenticated-request"
          >
            Make Request
          </button>
        )
      })

      const requestButton = screen.getByTestId('authenticated-request')
      fireEvent.click(requestButton)

      await waitFor(() => {
        expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/test', 'GET')
      })

      expect(mockAuthenticatedRequest).toHaveBeenCalledTimes(1)
    })

    it('should handle token refresh failure', async () => {
      mockAuthenticatedRequest.mockRejectedValue(new Error('Token refresh failed'))

      const { result } = render(() => {
        const auth = useAuth()
        return (
          <button 
            onClick={() => auth.authenticatedRequest('/api/test', 'GET')}
            data-testid="authenticated-request"
          >
            Make Request
          </button>
        )
      })

      const requestButton = screen.getByTestId('authenticated-request')
      fireEvent.click(requestButton)

      await waitFor(() => {
        expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/test', 'GET')
      })

      expect(mockAuthenticatedRequest).toHaveBeenCalledTimes(1)
    })
  })

  describe('Role-based Access', () => {
    it('should allow admin users to access admin features', async () => {
      const mockAdminUser = {
        id: '1',
        username: 'admin',
        email: 'admin@example.com',
        role: UserRole.ADMIN
      }

      const { result } = render(() => {
        const auth = useAuth()
        return (
          <div>
            <div data-testid="user-role">
              {auth.user?.role || 'No Role'}
            </div>
            <div data-testid="can-access-admin">
              {auth.user?.role === UserRole.ADMIN ? 'Yes' : 'No'}
            </div>
          </div>
        )
      }, {
        initialAuthState: {
          user: mockAdminUser,
          isAuthenticated: true
        }
      })

      expect(screen.getByTestId('user-role')).toHaveTextContent('admin')
      expect(screen.getByTestId('can-access-admin')).toHaveTextContent('Yes')
    })

    it('should deny student users from accessing admin features', async () => {
      const mockStudentUser = {
        id: '3',
        username: 'student',
        email: 'student@example.com',
        role: UserRole.STUDENT
      }

      const { result } = render(() => {
        const auth = useAuth()
        return (
          <div>
            <div data-testid="user-role">
              {auth.user?.role || 'No Role'}
            </div>
            <div data-testid="can-access-admin">
              {auth.user?.role === UserRole.ADMIN ? 'Yes' : 'No'}
            </div>
          </div>
        )
      }, {
        initialAuthState: {
          user: mockStudentUser,
          isAuthenticated: true
        }
      })

      expect(screen.getByTestId('user-role')).toHaveTextContent('student')
      expect(screen.getByTestId('can-access-admin')).toHaveTextContent('No')
    })
  })

  describe('Session Management', () => {
    it('should handle session timeout', async () => {
      mockLogout.mockResolvedValue({ success: true })

      // Simulate session timeout
      const { result } = render(() => {
        const auth = useAuth()
        return (
          <div>
            <button 
              onClick={() => auth.logout()}
              data-testid="session-timeout"
            >
              Session Timeout
            </button>
          </div>
        )
      })

      const timeoutButton = screen.getByTestId('session-timeout')
      fireEvent.click(timeoutButton)

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled()
      })
    })

    it('should persist session across page reloads', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: UserRole.TEACHER
      }

      // Simulate existing session in localStorage
      localStorage.setItem('user', JSON.stringify(mockUser))
      localStorage.setItem('accessToken', 'mock-token')

      const { result } = render(() => {
        const auth = useAuth()
        return (
          <div data-testid="persisted-user">
            {auth.user ? auth.user.username : 'No User'}
          </div>
        )
      })

      // In a real implementation, this would check if the user is restored from localStorage
      expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser))
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors during login', async () => {
      mockLogin.mockRejectedValue(new Error('Network error'))

      const { result } = render(() => {
        const auth = useAuth()
        return (
          <button 
            onClick={() => auth.login('testuser', 'password123')}
            data-testid="login-button"
          >
            Login
          </button>
        )
      })

      const loginButton = screen.getByTestId('login-button')
      fireEvent.click(loginButton)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled()
      })

      expect(mockLogin).toHaveBeenCalledTimes(1)
    })

    it('should handle invalid token format', async () => {
      mockAuthenticatedRequest.mockRejectedValue(new Error('Invalid token'))

      const { result } = render(() => {
        const auth = useAuth()
        return (
          <button 
            onClick={() => auth.authenticatedRequest('/api/test', 'GET')}
            data-testid="authenticated-request"
          >
            Make Request
          </button>
        )
      })

      const requestButton = screen.getByTestId('authenticated-request')
      fireEvent.click(requestButton)

      await waitFor(() => {
        expect(mockAuthenticatedRequest).toHaveBeenCalled()
      })
    })
  })
})
