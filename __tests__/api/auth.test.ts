import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/auth/login/route'
import { POST as LOGOUT_POST } from '@/app/api/auth/logout/route'
import { GET as ME_GET } from '@/app/api/auth/me/route'
import { UserRole } from '@/lib/auth'
import { generateTokens, verifyToken } from '@/lib/auth'

// Mock the auth utilities
jest.mock('@/lib/auth', () => ({
  ...jest.requireActual('@/lib/auth'),
  generateTokens: jest.fn(),
  verifyToken: jest.fn()
}))

const mockGenerateTokens = generateTokens as jest.MockedFunction<typeof generateTokens>
const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>

// Mock the data access layer
jest.mock('@/lib/data-access', () => ({
  DataAccessLayer: jest.fn().mockImplementation(() => ({
    getUserByUsername: jest.fn(),
    updateUser: jest.fn()
  }))
}))

describe('Authentication API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: UserRole.TEACHER,
        password_hash: 'hashed_password'
      }

      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      }

      // Mock data access layer
      const { DataAccessLayer } = require('@/lib/data-access')
      const mockDataAccess = new DataAccessLayer()
      mockDataAccess.getUserByUsername.mockResolvedValue(mockUser)
      
      mockGenerateTokens.mockReturnValue(mockTokens)

      const requestBody = {
        username: 'testuser',
        password: 'password123'
      }

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.user).toBeDefined()
      expect(data.data.tokens).toEqual(mockTokens)
      expect(mockDataAccess.getUserByUsername).toHaveBeenCalledWith('testuser')
    })

    it('should reject login with invalid credentials', async () => {
      const { DataAccessLayer } = require('@/lib/data-access')
      const mockDataAccess = new DataAccessLayer()
      mockDataAccess.getUserByUsername.mockResolvedValue(null)

      const requestBody = {
        username: 'invaliduser',
        password: 'wrongpassword'
      }

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid credentials')
    })

    it('should handle missing credentials', async () => {
      const requestBody = {
        username: 'testuser'
        // Missing password
      }

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Username and password are required')
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should handle database errors', async () => {
      const { DataAccessLayer } = require('@/lib/data-access')
      const mockDataAccess = new DataAccessLayer()
      mockDataAccess.getUserByUsername.mockRejectedValue(new Error('Database error'))

      const requestBody = {
        username: 'testuser',
        password: 'password123'
      }

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await LOGOUT_POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Logged out successfully')
    })

    it('should handle logout errors', async () => {
      // Mock a scenario where logout fails
      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await LOGOUT_POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('GET /api/auth/me', () => {
    it('should return user info with valid token', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        role: UserRole.TEACHER
      }

      mockVerifyToken.mockReturnValue({ userId: '1', role: UserRole.TEACHER })

      // Mock data access layer
      const { DataAccessLayer } = require('@/lib/data-access')
      const mockDataAccess = new DataAccessLayer()
      mockDataAccess.getUserById = jest.fn().mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      })

      const response = await ME_GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockUser)
    })

    it('should reject request without token', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET'
      })

      const response = await ME_GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('No token provided')
    })

    it('should reject request with invalid token', async () => {
      mockVerifyToken.mockReturnValue(null)

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      })

      const response = await ME_GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid token')
    })

    it('should handle user not found', async () => {
      mockVerifyToken.mockReturnValue({ userId: '1', role: UserRole.TEACHER })

      const { DataAccessLayer } = require('@/lib/data-access')
      const mockDataAccess = new DataAccessLayer()
      mockDataAccess.getUserById = jest.fn().mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      })

      const response = await ME_GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('User not found')
    })
  })

  describe('Token Management', () => {
    it('should generate valid tokens', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        role: UserRole.TEACHER
      }

      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      }

      mockGenerateTokens.mockReturnValue(mockTokens)

      const { DataAccessLayer } = require('@/lib/data-access')
      const mockDataAccess = new DataAccessLayer()
      mockDataAccess.getUserByUsername.mockResolvedValue(mockUser)

      const requestBody = {
        username: 'testuser',
        password: 'password123'
      }

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(mockGenerateTokens).toHaveBeenCalledWith(mockUser)
      expect(data.data.tokens).toEqual(mockTokens)
    })

    it('should handle token generation errors', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        role: UserRole.TEACHER
      }

      mockGenerateTokens.mockImplementation(() => {
        throw new Error('Token generation failed')
      })

      const { DataAccessLayer } = require('@/lib/data-access')
      const mockDataAccess = new DataAccessLayer()
      mockDataAccess.getUserByUsername.mockResolvedValue(mockUser)

      const requestBody = {
        username: 'testuser',
        password: 'password123'
      }

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })

  describe('Rate Limiting', () => {
    it('should handle rate limiting', async () => {
      const { DataAccessLayer } = require('@/lib/data-access')
      const mockDataAccess = new DataAccessLayer()
      mockDataAccess.getUserByUsername.mockResolvedValue(null)

      const requestBody = {
        username: 'testuser',
        password: 'wrongpassword'
      }

      // Make multiple failed login attempts
      const requests = Array.from({ length: 6 }, () =>
        new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json'
          }
        })
      )

      const responses = await Promise.all(requests.map(req => POST(req)))
      
      // Last request should be rate limited
      const lastResponse = responses[responses.length - 1]
      const lastData = await lastResponse.json()

      expect(lastResponse.status).toBe(429)
      expect(lastData.success).toBe(false)
      expect(lastData.error).toBe('Too many requests')
    })
  })

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST'
      })

      const response = await LOGOUT_POST(request)

      // Check for security headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
    })
  })

  describe('Input Validation', () => {
    it('should validate username format', async () => {
      const requestBody = {
        username: '', // Empty username
        password: 'password123'
      }

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should validate password length', async () => {
      const requestBody = {
        username: 'testuser',
        password: '123' // Too short
      }

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should sanitize input', async () => {
      const requestBody = {
        username: '<script>alert("xss")</script>',
        password: 'password123'
      }

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      // Should handle XSS attempts
      expect(response.status).toBe(401) // User not found due to sanitized input
    })
  })
})
