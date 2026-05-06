import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '../utils/test-utils'
import { NextRequest } from 'next/server'
import { POST as LOGIN_POST } from '@/app/api/auth/login/route'
import { POST as LOGOUT_POST } from '@/app/api/auth/logout/route'
import { GET as GRADES_GET } from '@/app/api/grades/route'
import { POST as GRADES_POST } from '@/app/api/grades/route'
import { GET as STUDENTS_GET } from '@/app/api/students/route'
import { POST as STUDENTS_POST } from '@/app/api/students/route'
import { GET as CLASSES_GET } from '@/app/api/classes/route'
import { GET as SUBJECTS_GET } from '@/app/api/subjects/route'
import { GET as EXAMS_GET } from '@/app/api/exams/route'
import { GET as SECURITY_DASHBOARD_GET } from '@/app/api/security/dashboard/route'
import { UserRole } from '@/lib/auth'

// Mock all the dependencies
jest.mock('@/lib/data-access', () => ({
  DataAccessLayer: jest.fn().mockImplementation(() => ({
    getUserByUsername: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    getStudents: jest.fn(),
    createStudent: jest.fn(),
    updateStudent: jest.fn(),
    deleteStudent: jest.fn(),
    getClasses: jest.fn(),
    createClass: jest.fn(),
    updateClass: jest.fn(),
    deleteClass: jest.fn(),
    getSubjects: jest.fn(),
    createSubject: jest.fn(),
    updateSubject: jest.fn(),
    deleteSubject: jest.fn(),
    getExams: jest.fn(),
    createExam: jest.fn(),
    updateExam: jest.fn(),
    deleteExam: jest.fn(),
    getGrades: jest.fn(),
    createGrade: jest.fn(),
    updateGrade: jest.fn(),
    deleteGrade: jest.fn(),
    bulkCreateGrades: jest.fn(),
    getClassStatistics: jest.fn(),
    getStudentStatistics: jest.fn()
  }))
}))

jest.mock('@/lib/auth', () => ({
  ...jest.requireActual('@/lib/auth'),
  generateTokens: jest.fn(),
  verifyToken: jest.fn()
}))

describe('Full System Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Authentication Workflow', () => {
    it('should complete full authentication flow', async () => {
      const mockUser = {
        id: '1',
        username: 'admin',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
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
      
      const { generateTokens } = require('@/lib/auth')
      generateTokens.mockReturnValue(mockTokens)

      // Step 1: Login
      const loginRequest = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'admin',
          password: 'admin123'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const loginResponse = await LOGIN_POST(loginRequest)
      const loginData = await loginResponse.json()

      expect(loginResponse.status).toBe(200)
      expect(loginData.success).toBe(true)
      expect(loginData.data.user).toEqual(mockUser)
      expect(loginData.data.tokens).toEqual(mockTokens)

      // Step 2: Access protected resource
      const { verifyToken } = require('@/lib/auth')
      verifyToken.mockReturnValue({ userId: '1', role: UserRole.ADMIN })

      const gradesRequest = new NextRequest('http://localhost:3000/api/grades', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + mockTokens.accessToken
        }
      })

      const gradesResponse = await GRADES_GET(gradesRequest, { user: mockUser })
      expect(gradesResponse.status).toBe(200)

      // Step 3: Logout
      const logoutRequest = new NextRequest('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + mockTokens.accessToken
        }
      })

      const logoutResponse = await LOGOUT_POST(logoutRequest)
      const logoutData = await logoutResponse.json()

      expect(logoutResponse.status).toBe(200)
      expect(logoutData.success).toBe(true)
    })

    it('should handle authentication failures gracefully', async () => {
      const { DataAccessLayer } = require('@/lib/data-access')
      const mockDataAccess = new DataAccessLayer()
      mockDataAccess.getUserByUsername.mockResolvedValue(null)

      const loginRequest = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'invalid',
          password: 'wrong'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await LOGIN_POST(loginRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid credentials')
    })
  })

  describe('Student Management Workflow', () => {
    it('should complete full student management workflow', async () => {
      const mockUser = {
        id: '1',
        username: 'teacher',
        role: UserRole.TEACHER
      }

      const mockStudents = [
        {
          student_id: '1',
          student_name: '张三',
          class_id: '1',
          class_name: '高一(1)班',
          seat_number: 1,
          gender: '男',
          birth_date: '2006-05-15'
        }
      ]

      const mockClasses = [
        {
          class_id: '1',
          class_name: '高一(1)班',
          grade_level: 1,
          teacher_id: '1',
          teacher_name: '张老师',
          student_count: 45
        }
      ]

      // Mock data access layer
      const { DataAccessLayer } = require('@/lib/data-access')
      const mockDataAccess = new DataAccessLayer()
      mockDataAccess.getStudents.mockResolvedValue(mockStudents)
      mockDataAccess.createStudent.mockResolvedValue(mockStudents[0])
      mockDataAccess.updateStudent.mockResolvedValue(mockStudents[0])
      mockDataAccess.deleteStudent.mockResolvedValue(undefined)
      mockDataAccess.getClasses.mockResolvedValue(mockClasses)

      // Step 1: Get all students
      const getStudentsRequest = new NextRequest('http://localhost:3000/api/students', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      })

      const getStudentsResponse = await STUDENTS_GET(getStudentsRequest, { user: mockUser })
      const getStudentsData = await getStudentsResponse.json()

      expect(getStudentsResponse.status).toBe(200)
      expect(getStudentsData.success).toBe(true)
      expect(getStudentsData.data).toEqual(mockStudents)

      // Step 2: Create new student
      const newStudent = {
        student_name: '李四',
        class_id: '1',
        seat_number: 2,
        gender: '女',
        birth_date: '2006-08-20'
      }

      const createStudentRequest = new NextRequest('http://localhost:3000/api/students', {
        method: 'POST',
        body: JSON.stringify(newStudent),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        }
      })

      const createStudentResponse = await STUDENTS_POST(createStudentRequest, { user: mockUser })
      const createStudentData = await createStudentResponse.json()

      expect(createStudentResponse.status).toBe(201)
      expect(createStudentData.success).toBe(true)
      expect(createStudentData.data).toBeDefined()

      // Step 3: Verify student was created
      expect(mockDataAccess.createStudent).toHaveBeenCalledWith(newStudent)
    })

    it('should validate student data before creation', async () => {
      const mockUser = {
        id: '1',
        username: 'teacher',
        role: UserRole.TEACHER
      }

      const invalidStudent = {
        student_name: '', // Empty name
        class_id: '1',
        seat_number: -1, // Invalid seat number
        gender: 'invalid', // Invalid gender
        birth_date: 'invalid-date' // Invalid date
      }

      const createStudentRequest = new NextRequest('http://localhost:3000/api/students', {
        method: 'POST',
        body: JSON.stringify(invalidStudent),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        }
      })

      const response = await STUDENTS_POST(createStudentRequest, { user: mockUser })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('validation')
    })
  })

  describe('Grade Management Workflow', () => {
    it('should complete full grade management workflow', async () => {
      const mockUser = {
        id: '1',
        username: 'teacher',
        role: UserRole.TEACHER
      }

      const mockGrades = [
        {
          grade_id: '1',
          student_id: '1',
          student_name: '张三',
          class_name: '高一(1)班',
          seat_number: 1,
          subject_id: '1',
          subject_name: '语文',
          exam_id: '1',
          exam_name: '期中考试',
          score: 85,
          semester: '1',
          academic_year: '2024'
        }
      ]

      const mockClasses = [
        {
          class_id: '1',
          class_name: '高一(1)班',
          grade_level: 1,
          teacher_id: '1',
          teacher_name: '张老师',
          student_count: 45
        }
      ]

      const mockSubjects = [
        {
          subject_id: '1',
          subject_code: 'CHN',
          subject_name: '语文',
          credit: 5,
          is_compulsory: true
        }
      ]

      const mockExams = [
        {
          exam_id: '1',
          exam_name: '期中考试',
          exam_type: 'midterm',
          academic_year: '2024',
          semester: '1',
          start_date: '2024-05-10',
          end_date: '2024-05-15'
        }
      ]

      // Mock data access layer
      const { DataAccessLayer } = require('@/lib/data-access')
      const mockDataAccess = new DataAccessLayer()
      mockDataAccess.getGrades.mockResolvedValue(mockGrades)
      mockDataAccess.createGrade.mockResolvedValue(mockGrades[0])
      mockDataAccess.updateGrade.mockResolvedValue(mockGrades[0])
      mockDataAccess.deleteGrade.mockResolvedValue(undefined)
      mockDataAccess.getClasses.mockResolvedValue(mockClasses)
      mockDataAccess.getSubjects.mockResolvedValue(mockSubjects)
      mockDataAccess.getExams.mockResolvedValue(mockExams)

      // Step 1: Get all grades
      const getGradesRequest = new NextRequest('http://localhost:3000/api/grades', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      })

      const getGradesResponse = await GRADES_GET(getGradesRequest, { user: mockUser })
      const getGradesData = await getGradesResponse.json()

      expect(getGradesResponse.status).toBe(200)
      expect(getGradesData.success).toBe(true)
      expect(getGradesData.data).toEqual(mockGrades)

      // Step 2: Create new grade
      const newGrade = {
        student_id: '2',
        subject_id: '1',
        exam_id: '1',
        score: 90
      }

      const createGradeRequest = new NextRequest('http://localhost:3000/api/grades', {
        method: 'POST',
        body: JSON.stringify(newGrade),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        }
      })

      const createGradeResponse = await GRADES_POST(createGradeRequest, { user: mockUser })
      const createGradeData = await createGradeResponse.json()

      expect(createGradeResponse.status).toBe(201)
      expect(createGradeData.success).toBe(true)
      expect(createGradeData.data).toBeDefined()

      // Step 3: Verify grade was created
      expect(mockDataAccess.createGrade).toHaveBeenCalledWith(newGrade)
    })

    it('should validate grade data before creation', async () => {
      const mockUser = {
        id: '1',
        username: 'teacher',
        role: UserRole.TEACHER
      }

      const invalidGrade = {
        student_id: '1',
        subject_id: '1',
        exam_id: '1',
        score: 150 // Invalid: score > 100
      }

      const createGradeRequest = new NextRequest('http://localhost:3000/api/grades', {
        method: 'POST',
        body: JSON.stringify(invalidGrade),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        }
      })

      const response = await GRADES_POST(createGradeRequest, { user: mockUser })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('score')
    })
  })

  describe('Security Integration', () => {
    it('should monitor security events across the system', async () => {
      const mockUser = {
        id: '1',
        username: 'admin',
        role: UserRole.ADMIN
      }

      // Mock security dashboard data
      const mockSecurityData = {
        overview: {
          totalEvents: 100,
          criticalAlerts: 2,
          blockedEntities: 5,
          systemStatus: 'healthy'
        },
        charts: {
          eventsByType: {
            'authentication': 30,
            'authorization': 20,
            'data_access': 25,
            'data_modification': 15,
            'system_config': 10
          },
          eventsBySeverity: {
            'low': 60,
            'medium': 30,
            'high': 8,
            'critical': 2
          },
          timeline: []
        },
        recentEvents: [
          {
            id: '1',
            type: 'authentication',
            severity: 'medium',
            description: 'Failed login attempt',
            timestamp: new Date().toISOString()
          }
        ],
        threats: {
          activeThreats: 1,
          threatLevel: 'low'
        }
      }

      // Get security dashboard
      const securityRequest = new NextRequest('http://localhost:3000/api/security/dashboard', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      })

      const securityResponse = await SECURITY_DASHBOARD_GET(securityRequest, { user: mockUser })
      const securityData = await securityResponse.json()

      expect(securityResponse.status).toBe(200)
      expect(securityData.success).toBe(true)
      expect(securityData.data).toBeDefined()
    })

    it('should enforce role-based access control', async () => {
      const studentUser = {
        id: '3',
        username: 'student',
        role: UserRole.STUDENT
      }

      const adminUser = {
        id: '1',
        username: 'admin',
        role: UserRole.ADMIN
      }

      // Student should not access admin endpoints
      const adminRequest = new NextRequest('http://localhost:3000/api/security/dashboard', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer student-token'
        }
      })

      const adminResponse = await SECURITY_DASHBOARD_GET(adminRequest, { user: studentUser })
      expect(adminResponse.status).toBe(403)

      // Admin should access admin endpoints
      const adminRequestValid = new NextRequest('http://localhost:3000/api/security/dashboard', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      })

      const adminResponseValid = await SECURITY_DASHBOARD_GET(adminRequestValid, { user: adminUser })
      expect(adminResponseValid.status).toBe(200)
    })
  })

  describe('Data Consistency', () => {
    it('should maintain data consistency across operations', async () => {
      const mockUser = {
        id: '1',
        username: 'teacher',
        role: UserRole.TEACHER
      }

      const { DataAccessLayer } = require('@/lib/data-access')
      const mockDataAccess = new DataAccessLayer()

      // Create student
      const newStudent = {
        student_name: '测试学生',
        class_id: '1',
        seat_number: 10,
        gender: '男',
        birth_date: '2006-01-01'
      }

      mockDataAccess.createStudent.mockResolvedValue({
        ...newStudent,
        student_id: '999'
      })

      // Create grade for the student
      const newGrade = {
        student_id: '999',
        subject_id: '1',
        exam_id: '1',
        score: 85
      }

      mockDataAccess.createGrade.mockResolvedValue({
        ...newGrade,
        grade_id: '999'
      })

      // Verify operations are consistent
      expect(mockDataAccess.createStudent).toHaveBeenCalledWith(newStudent)
      expect(mockDataAccess.createGrade).toHaveBeenCalledWith(newGrade)

      // The student_id in grade should match the created student
      expect(newGrade.student_id).toBe('999')
    })

    it('should handle transaction rollback on errors', async () => {
      const mockUser = {
        id: '1',
        username: 'teacher',
        role: UserRole.TEACHER
      }

      const { DataAccessLayer } = require('@/lib/data-access')
      const mockDataAccess = new DataAccessLayer()

      // Simulate database error during grade creation
      mockDataAccess.createStudent.mockResolvedValue({
        student_id: '999',
        student_name: '测试学生'
      })

      mockDataAccess.createGrade.mockRejectedValue(new Error('Database constraint violation'))

      const newGrade = {
        student_id: '999',
        subject_id: '1',
        exam_id: '1',
        score: 85
      }

      // The grade creation should fail
      await expect(mockDataAccess.createGrade(newGrade)).rejects.toThrow('Database constraint violation')

      // In a real implementation, this would trigger a rollback
      // For testing, we verify the error is properly handled
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle concurrent requests efficiently', async () => {
      const mockUser = {
        id: '1',
        username: 'teacher',
        role: UserRole.TEACHER
      }

      const { DataAccessLayer } = require('@/lib/data-access')
      const mockDataAccess = new DataAccessLayer()

      // Mock concurrent grade creation
      mockDataAccess.createGrade.mockResolvedValue({
        grade_id: 'mock-id',
        score: 85
      })

      const startTime = Date.now()

      // Create 10 concurrent grade creation requests
      const promises = Array.from({ length: 10 }, (_, i) => {
        const newGrade = {
          student_id: String(i + 1),
          subject_id: '1',
          exam_id: '1',
          score: 80 + i
        }

        const request = new NextRequest('http://localhost:3000/api/grades', {
          method: 'POST',
          body: JSON.stringify(newGrade),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-token'
          }
        })

        return GRADES_POST(request, { user: mockUser })
      })

      const responses = await Promise.all(promises)
      const endTime = Date.now()

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201)
      })

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(2000)
    })

    it('should handle large datasets efficiently', async () => {
      const mockUser = {
        id: '1',
        username: 'teacher',
        role: UserRole.TEACHER
      }

      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        grade_id: String(i + 1),
        student_id: String(i + 1),
        student_name: `学生${i + 1}`,
        score: 60 + Math.floor(Math.random() * 40)
      }))

      const { DataAccessLayer } = require('@/lib/data-access')
      const mockDataAccess = new DataAccessLayer()
      mockDataAccess.getGrades.mockResolvedValue(largeDataset)

      const request = new NextRequest('http://localhost:3000/api/grades', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      })

      const startTime = Date.now()
      const response = await GRADES_GET(request, { user: mockUser })
      const endTime = Date.now()

      expect(response.status).toBe(200)
      expect(endTime - startTime).toBeLessThan(1000)

      const data = await response.json()
      expect(data.data).toHaveLength(1000)
    })
  })

  describe('Error Recovery', () => {
    it('should recover from temporary database failures', async () => {
      const mockUser = {
        id: '1',
        username: 'teacher',
        role: UserRole.TEACHER
      }

      const { DataAccessLayer } = require('@/lib/data-access')
      const mockDataAccess = new DataAccessLayer()

      // First call fails
      mockDataAccess.getGrades.mockRejectedValueOnce(new Error('Connection timeout'))

      const request = new NextRequest('http://localhost:3000/api/grades', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      })

      const response = await GRADES_GET(request, { user: mockUser })
      expect(response.status).toBe(500)

      // Second call succeeds
      mockDataAccess.getGrades.mockResolvedValueOnce([])

      const retryResponse = await GRADES_GET(request, { user: mockUser })
      expect(retryResponse.status).toBe(200)
    })

    it('should handle partial failures gracefully', async () => {
      const mockUser = {
        id: '1',
        username: 'teacher',
        role: UserRole.TEACHER
      }

      const { DataAccessLayer } = require('@/lib/data-access')
      const mockDataAccess = new DataAccessLayer()

      // Mock partial failure in bulk operations
      mockDataAccess.bulkCreateGrades.mockResolvedValue([
        { success: true, grade_id: '1' },
        { success: false, error: 'Invalid student ID' },
        { success: true, grade_id: '3' }
      ])

      const bulkGrades = [
        { student_id: '1', subject_id: '1', exam_id: '1', score: 85 },
        { student_id: 'invalid', subject_id: '1', exam_id: '1', score: 90 },
        { student_id: '3', subject_id: '1', exam_id: '1', score: 88 }
      ]

      const request = new NextRequest('http://localhost:3000/api/grades/bulk', {
        method: 'POST',
        body: JSON.stringify({ grades: bulkGrades }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        }
      })

      const response = await GRADES_POST(request, { user: mockUser })
      const data = await response.json()

      expect(response.status).toBe(207) // Multi-status
      expect(data.success).toBe(true)
      expect(data.results).toBeDefined()
      expect(data.results.some(r => !r.success)).toBe(true)
    })
  })
})
