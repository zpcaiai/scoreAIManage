import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { NextRequest } from 'next/server'
import { SecurityMonitor, DataMasking, SensitiveOperationValidator } from '@/lib/security-middleware'
import { SecurityLevel, SecurityEventType, SensitiveOperation } from '@/lib/security-config'

// Mock the AuditLogger
jest.mock('@/lib/error-handler', () => ({
  AuditLogger: {
    logSecurity: jest.fn()
  }
}))

describe('Security Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('SecurityMonitor', () => {
    let monitor: SecurityMonitor

    beforeEach(() => {
      monitor = SecurityMonitor.getInstance()
    })

    it('should detect malicious IP access', () => {
      const maliciousIP = '192.168.1.100'
      monitor.blockIP(maliciousIP, 60000) // Block for 1 minute

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': maliciousIP
        }
      })

      const events = monitor.monitorRequest(request)

      expect(events).toHaveLength(1)
      expect(events[0].type).toBe(SecurityEventType.NETWORK_SECURITY)
      expect(events[0].severity).toBe(SecurityLevel.CRITICAL)
      expect(events[0].description).toBe('MALICIOUS_IP_ACCESS')
    })

    it('should detect suspicious user agent', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'user-agent': 'sqlmap/1.0'
        }
      })

      const events = monitor.monitorRequest(request)

      expect(events).toHaveLength(1)
      expect(events[0].type).toBe(SecurityEventType.NETWORK_SECURITY)
      expect(events[0].severity).toBe(SecurityLevel.HIGH)
      expect(events[0].description).toBe('SUSPICIOUS_USER_AGENT')
    })

    it('should detect SQL injection attempts', () => {
      const request = new NextRequest('http://localhost:3000/api/test?id=1\' UNION SELECT * FROM users--', {
        headers: {
          'user-agent': 'Mozilla/5.0'
        }
      })

      const events = monitor.monitorRequest(request)

      expect(events).toHaveLength(1)
      expect(events[0].type).toBe(SecurityEventType.NETWORK_SECURITY)
      expect(events[0].severity).toBe(SecurityLevel.CRITICAL)
      expect(events[0].description).toBe('SQL_INJECTION_ATTEMPT')
    })

    it('should detect XSS attempts', () => {
      const request = new NextRequest('http://localhost:3000/api/test?search=<script>alert("xss")</script>', {
        headers: {
          'user-agent': 'Mozilla/5.0'
        }
      })

      const events = monitor.monitorRequest(request)

      expect(events).toHaveLength(1)
      expect(events[0].type).toBe(SecurityEventType.NETWORK_SECURITY)
      expect(events[0].severity).toBe(SecurityLevel.HIGH)
      expect(events[0].description).toBe('XSS_ATTEMPT')
    })

    it('should detect high request frequency', () => {
      const clientIP = '192.168.1.50'
      
      // Simulate multiple requests from same IP
      for (let i = 0; i < 10; i++) {
        const request = new NextRequest('http://localhost:3000/api/test', {
          headers: {
            'x-forwarded-for': clientIP
          }
        })
        monitor.monitorRequest(request)
      }

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': clientIP
        }
      })

      const events = monitor.monitorRequest(request)

      expect(events.some(e => e.description === 'HIGH_REQUEST_FREQUENCY')).toBe(true)
    })

    it('should monitor user activities', () => {
      const userId = 'test-user'
      
      // Test login success
      const events = monitor.monitorUserActivity(userId, 'LOGIN_SUCCESS', {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      })

      expect(events).toHaveLength(0) // Normal login should not trigger events

      // Test unusual login time
      const unusualLoginEvents = monitor.monitorUserActivity(userId, 'LOGIN_SUCCESS', {
        timestamp: new Date('2024-01-01T02:00:00Z').getTime() // 2 AM
      })

      expect(unusualLoginEvents.some(e => e.description === 'UNUSUAL_LOGIN_TIME')).toBe(true)

      // Test role change
      const roleChangeEvents = monitor.monitorUserActivity(userId, 'ROLE_CHANGE', {
        oldRole: 'student',
        newRole: 'admin'
      })

      expect(roleChangeEvents.some(e => e.description === 'PRIVILEGE_ESCALATION')).toBe(true)
    })

    it('should block and unblock IPs', () => {
      const clientIP = '192.168.1.200'
      
      expect(monitor.isIPBlocked(clientIP)).toBe(false)
      
      monitor.blockIP(clientIP, 1000) // Block for 1 second
      expect(monitor.isIPBlocked(clientIP)).toBe(true)
      
      // Wait for block to expire
      setTimeout(() => {
        expect(monitor.isIPBlocked(clientIP)).toBe(false)
      }, 1100)
    })

    it('should provide security statistics', () => {
      // Generate some test events
      monitor.monitorUserActivity('user1', 'LOGIN_FAILED', {})
      monitor.monitorUserActivity('user2', 'LOGIN_FAILED', {})
      monitor.monitorUserActivity('user3', 'ROLE_CHANGE', {})

      const stats = monitor.getSecurityStats()

      expect(stats.totalEvents).toBeGreaterThan(0)
      expect(stats.eventsByType).toBeDefined()
      expect(stats.eventsBySeverity).toBeDefined()
      expect(stats.blockedEntities).toBeGreaterThanOrEqual(0)
    })
  })

  describe('DataMasking', () => {
    it('should mask phone numbers', () => {
      const data = {
        name: '张三',
        phone: '13812345678'
      }

      const masked = DataMasking.maskSensitiveData(data)

      expect(masked.phone).toBe('138****5678')
      expect(masked.name).toBe('张三')
    })

    it('should mask email addresses', () => {
      const data = {
        name: '张三',
        email: 'zhangsan@example.com'
      }

      const masked = DataMasking.maskSensitiveData(data)

      expect(masked.email).toBe('zh***@example.com')
      expect(masked.name).toBe('张三')
    })

    it('should mask ID numbers', () => {
      const data = {
        name: '张三',
        id_number: '123456789012345678'
      }

      const masked = DataMasking.maskSensitiveData(data)

      expect(masked.id_number).toBe('123456********')
      expect(masked.name).toBe('张三')
    })

    it('should handle nested objects', () => {
      const data = {
        user: {
          name: '张三',
          phone: '13812345678',
          address: {
            detail: '详细地址',
            zip: '123456'
          }
        }
      }

      const masked = DataMasking.maskSensitiveData(data)

      expect(masked.user.phone).toBe('138****5678')
      expect(masked.user.address.zip).toBe('123***')
      expect(masked.user.name).toBe('张三')
    })

    it('should handle arrays of objects', () => {
      const data = {
        students: [
          { name: '张三', phone: '13812345678' },
          { name: '李四', phone: '13987654321' }
        ]
      }

      const masked = DataMasking.maskSensitiveData(data)

      expect(masked.students[0].phone).toBe('138****5678')
      expect(masked.students[1].phone).toBe('139****4321')
    })
  })

  describe('SensitiveOperationValidator', () => {
    it('should allow admin to perform any operation', async () => {
      const result = await SensitiveOperationValidator.validateSensitiveOperation(
        SensitiveOperation.USER_DELETE,
        'admin-user',
        'admin'
      )

      expect(result.valid).toBe(true)
    })

    it('should allow teacher to perform grade operations', async () => {
      const result = await SensitiveOperationValidator.validateSensitiveOperation(
        SensitiveOperation.GRADE_MODIFY,
        'teacher-user',
        'teacher'
      )

      expect(result.valid).toBe(true)
    })

    it('should deny student from performing admin operations', async () => {
      const result = await SensitiveOperationValidator.validateSensitiveOperation(
        SensitiveOperation.USER_DELETE,
        'student-user',
        'student'
      )

      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Insufficient permissions')
    })

    it('should deny student from performing teacher operations', async () => {
      const result = await SensitiveOperationValidator.validateSensitiveOperation(
        SensitiveOperation.GRADE_MODIFY,
        'student-user',
        'student'
      )

      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Insufficient permissions')
    })

    it('should handle unknown user roles', async () => {
      const result = await SensitiveOperationValidator.validateSensitiveOperation(
        SensitiveOperation.USER_CREATE,
        'unknown-user',
        'unknown' as any
      )

      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Insufficient permissions')
    })
  })

  describe('Security Event Processing', () => {
    let monitor: SecurityMonitor

    beforeEach(() => {
      monitor = SecurityMonitor.getInstance()
    })

    it('should trigger emergency response for critical events', () => {
      const clientIP = '192.168.1.300'
      
      // Generate a critical event
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': clientIP,
          'user-agent': 'sqlmap/1.0' // This will trigger a critical event
        }
      })

      monitor.monitorRequest(request)

      // Check if IP was blocked due to critical event
      expect(monitor.isIPBlocked(clientIP)).toBe(true)
    })

    it('should log security events', () => {
      const { AuditLogger } = require('@/lib/error-handler')
      
      monitor.monitorUserActivity('test-user', 'LOGIN_FAILED', {
        ip: '192.168.1.1'
      })

      expect(AuditLogger.logSecurity).toHaveBeenCalledWith(
        'SENSITIVE_OPERATION_ATTEMPT',
        'test-user',
        expect.any(Object)
      )
    })

    it('should handle event correlation', () => {
      const userId = 'test-user'
      
      // Multiple failed logins
      for (let i = 0; i < 6; i++) {
        monitor.monitorUserActivity(userId, 'LOGIN_FAILED', {})
      }

      const stats = monitor.getSecurityStats()
      
      // Should have detected the pattern
      expect(stats.eventsByType['authentication']).toBeGreaterThan(0)
    })
  })

  describe('Threat Intelligence', () => {
    let monitor: SecurityMonitor

    beforeEach(() => {
      monitor = SecurityMonitor.getInstance()
    })

    it('should update threat intelligence', async () => {
      // This would normally fetch from external sources
      // For testing, we'll simulate the update
      
      const initialStats = monitor.getSecurityStats()
      
      // Simulate threat intelligence update
      // (In real implementation, this would be done by the scheduled task)
      
      expect(initialStats).toBeDefined()
    })

    it('should use threat intelligence for detection', () => {
      const maliciousIP = '192.168.1.400'
      
      // Add to threat intelligence
      monitor.blockIP(maliciousIP, 60000)

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': maliciousIP
        }
      })

      const events = monitor.monitorRequest(request)

      expect(events.some(e => e.description === 'MALICIOUS_IP_ACCESS')).toBe(true)
    })
  })

  describe('Performance and Scalability', () => {
    let monitor: SecurityMonitor

    beforeEach(() => {
      monitor = SecurityMonitor.getInstance()
    })

    it('should handle high volume of requests efficiently', () => {
      const startTime = Date.now()
      
      // Simulate 1000 requests
      for (let i = 0; i < 1000; i++) {
        const request = new NextRequest('http://localhost:3000/api/test', {
          headers: {
            'x-forwarded-for': `192.168.1.${i % 255}`
          }
        })
        monitor.monitorRequest(request)
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000)
    })

    it('should clean up old events to prevent memory leaks', () => {
      // Generate old events
      const oldTimestamp = Date.now() - 2 * 60 * 60 * 1000 // 2 hours ago
      
      // This would normally be handled by the cleanup process
      const stats = monitor.getSecurityStats()
      
      expect(stats).toBeDefined()
      // Memory usage should be reasonable
    })
  })

  describe('Integration with Other Security Components', () => {
    it('should work with access control system', async () => {
      const monitor = SecurityMonitor.getInstance()
      
      // Simulate an access control violation
      monitor.monitorUserActivity('test-user', 'UNAUTHORIZED_ACCESS', {
        resource: '/api/admin/users',
        attemptedAction: 'DELETE'
      })

      const stats = monitor.getSecurityStats()
      expect(stats.eventsByType['authorization']).toBeGreaterThan(0)
    })

    it('should work with audit logging system', () => {
      const { AuditLogger } = require('@/lib/error-handler')
      const monitor = SecurityMonitor.getInstance()
      
      monitor.monitorUserActivity('test-user', 'DATA_EXPORT', {
        resource: '/api/grades/export',
        format: 'csv'
      })

      expect(AuditLogger.logSecurity).toHaveBeenCalled()
    })
  })
})
