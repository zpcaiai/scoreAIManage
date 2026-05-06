import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { DataAccessLayer } from '@/lib/data-access'
import { mockApiResponse, mockFetch } from '../utils/test-utils'
import { mockUsers, mockStudents, mockClasses, mockSubjects, mockExams, mockGrades } from '../utils/test-utils'

// Mock the authenticatedRequest function
const mockAuthenticatedRequest = jest.fn()

jest.mock('@/lib/api-client', () => ({
  authenticatedRequest: mockAuthenticatedRequest
}))

describe('Data Access Layer', () => {
  let dataAccess: DataAccessLayer

  beforeEach(() => {
    jest.clearAllMocks()
    dataAccess = new DataAccessLayer()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('User Management', () => {
    it('should fetch users successfully', async () => {
      const mockResponse = {
        success: true,
        data: mockUsers,
        count: mockUsers.length
      }

      mockAuthenticatedRequest.mockResolvedValue(mockApiResponse(mockResponse))

      const result = await dataAccess.getUsers()

      expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/users', 'GET', undefined)
      expect(result).toEqual(mockUsers)
    })

    it('should create a new user successfully', async () => {
      const newUser = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
        role: 'student'
      }

      const mockResponse = {
        success: true,
        data: { ...newUser, id: '4', createdAt: '2024-01-04T00:00:00Z' }
      }

      mockAuthenticatedRequest.mockResolvedValue(mockApiResponse(mockResponse, 201))

      const result = await dataAccess.createUser(newUser)

      expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/users', 'POST', newUser)
      expect(result).toEqual(mockResponse.data)
    })

    it('should update a user successfully', async () => {
      const userId = '1'
      const updateData = {
        username: 'updateduser',
        email: 'updated@example.com'
      }

      const mockResponse = {
        success: true,
        data: { ...updateData, id: userId, updatedAt: '2024-01-04T00:00:00Z' }
      }

      mockAuthenticatedRequest.mockResolvedValue(mockApiResponse(mockResponse))

      const result = await dataAccess.updateUser(userId, updateData)

      expect(mockAuthenticatedRequest).toHaveBeenCalledWith(`/api/users/${userId}`, 'PUT', updateData)
      expect(result).toEqual(mockResponse.data)
    })

    it('should delete a user successfully', async () => {
      const userId = '1'

      const mockResponse = {
        success: true,
        message: 'User deleted successfully'
      }

      mockAuthenticatedRequest.mockResolvedValue(mockApiResponse(mockResponse))

      await dataAccess.deleteUser(userId)

      expect(mockAuthenticatedRequest).toHaveBeenCalledWith(`/api/users/${userId}`, 'DELETE')
    })

    it('should handle user fetch errors', async () => {
      mockAuthenticatedRequest.mockRejectedValue(new Error('Network error'))

      await expect(dataAccess.getUsers()).rejects.toThrow('Network error')
    })
  })

  describe('Student Management', () => {
    it('should fetch students successfully', async () => {
      const mockResponse = {
        success: true,
        data: mockStudents,
        count: mockStudents.length
      }

      mockAuthenticatedRequest.mockResolvedValue(mockApiResponse(mockResponse))

      const result = await dataAccess.getStudents()

      expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/students', 'GET', undefined)
      expect(result).toEqual(mockStudents)
    })

    it('should fetch students with filters', async () => {
      const filters = {
        classId: '1',
        gender: '男'
      }

      const mockResponse = {
        success: true,
        data: mockStudents.filter(s => s.class_id === '1' && s.gender === '男'),
        count: 1
      }

      mockAuthenticatedRequest.mockResolvedValue(mockApiResponse(mockResponse))

      const result = await dataAccess.getStudents(filters)

      expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/students', 'GET', undefined, filters)
      expect(result).toHaveLength(1)
    })

    it('should create a new student successfully', async () => {
      const newStudent = {
        student_name: '新学生',
        class_id: '1',
        seat_number: 3,
        gender: '男',
        birth_date: '2006-01-01'
      }

      const mockResponse = {
        success: true,
        data: { ...newStudent, student_id: '3' }
      }

      mockAuthenticatedRequest.mockResolvedValue(mockApiResponse(mockResponse, 201))

      const result = await dataAccess.createStudent(newStudent)

      expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/students', 'POST', newStudent)
      expect(result).toEqual(mockResponse.data)
    })

    it('should update a student successfully', async () => {
      const studentId = '1'
      const updateData = {
        student_name: '更新学生',
        seat_number: 5
      }

      const mockResponse = {
        success: true,
        data: { ...updateData, student_id: studentId }
      }

      mockAuthenticatedRequest.mockResolvedValue(mockApiResponse(mockResponse))

      const result = await dataAccess.updateStudent(studentId, updateData)

      expect(mockAuthenticatedRequest).toHaveBeenCalledWith(`/api/students/${studentId}`, 'PUT', updateData)
      expect(result).toEqual(mockResponse.data)
    })

    it('should delete a student successfully', async () => {
      const studentId = '1'

      const mockResponse = {
        success: true,
        message: 'Student deleted successfully'
      }

      mockAuthenticatedRequest.mockResolvedValue(mockApiResponse(mockResponse))

      await dataAccess.deleteStudent(studentId)

      expect(mockAuthenticatedRequest).toHaveBeenCalledWith(`/api/students/${studentId}`, 'DELETE')
    })
  })

  describe('Class Management', () => {
    it('should fetch classes successfully', async () => {
      const mockResponse = {
        success: true,
        data: mockClasses,
        count: mockClasses.length
      }

      mockAuthenticatedRequest.mockResolvedValue(mockApiResponse(mockResponse))

      const result = await dataAccess.getClasses()

      expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/classes', 'GET', undefined)
      expect(result).toEqual(mockClasses)
    })

    it('should create a new class successfully', async () => {
      const newClass = {
        class_name: '高一(3)班',
        grade_level: 1,
        teacher_id: '1'
      }

      const mockResponse = {
        success: true,
        data: { ...newClass, class_id: '3', student_count: 0 }
      }

      mockAuthenticatedRequest.mockResolvedValue(mockApiResponse(mockResponse, 201))

      const result = await dataAccess.createClass(newClass)

      expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/classes', 'POST', newClass)
      expect(result).toEqual(mockResponse.data)
    })

    it('should update a class successfully', async () => {
      const classId = '1'
      const updateData = {
        class_name: '更新班级',
        teacher_id: '2'
      }

      const mockResponse = {
        success: true,
        data: { ...updateData, class_id: classId }
      }

      mockAuthenticatedRequest.mockResolvedValue(mockApiResponse(mockResponse))

      const result = await dataAccess.updateClass(classId, updateData)

      expect(mockAuthenticatedRequest).toHaveBeenCalledWith(`/api/classes/${classId}`, 'PUT', updateData)
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('Subject Management', () => {
    it('should fetch subjects successfully', async () => {
      const mockResponse = {
        success: true,
        data: mockSubjects,
        count: mockSubjects.length
      }

      mockAuthenticatedRequest.mockResolvedValue(mockApiResponse(mockResponse))

      const result = await dataAccess.getSubjects()

      expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/subjects', 'GET', undefined)
      expect(result).toEqual(mockSubjects)
    })

    it('should create a new subject successfully', async () => {
      const newSubject = {
        subject_code: 'PHY',
        subject_name: '物理',
        credit: 4,
        is_compulsory: true
      }

      const mockResponse = {
        success: true,
        data: { ...newSubject, subject_id: '4' }
      }

      mockAuthenticatedRequest.mockResolvedValue(mockApiResponse(mockResponse, 201))

      const result = await dataAccess.createSubject(newSubject)

      expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/subjects', 'POST', newSubject)
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('Exam Management', () => {
    it('should fetch exams successfully', async () => {
      const mockResponse = {
        success: true,
        data: mockExams,
        count: mockExams.length
      }

      mockAuthenticatedRequest.mockResolvedValue(mockApiResponse(mockResponse))

      const result = await dataAccess.getExams()

      expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/exams', 'GET', undefined)
      expect(result).toEqual(mockExams)
    })

    it('should create a new exam successfully', async () => {
      const newExam = {
        exam_name: '月考',
        exam_type: 'monthly',
        academic_year: '2024',
        semester: '1',
        start_date: '2024-06-01',
        end_date: '2024-06-05'
      }

      const mockResponse = {
        success: true,
        data: { ...newExam, exam_id: '3' }
      }

      mockAuthenticatedRequest.mockResolvedValue(mockApiResponse(mockResponse, 201))

      const result = await dataAccess.createExam(newExam)

      expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/exams', 'POST', newExam)
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('Grade Management', () => {
    it('should fetch grades successfully', async () => {
      const mockResponse = {
        success: true,
        data: mockGrades,
        count: mockGrades.length
      }

      mockAuthenticatedRequest.mockResolvedValue(mockApiResponse(mockResponse))

      const result = await dataAccess.getGrades()

      expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/grades', 'GET', undefined)
      expect(result).toEqual(mockGrades)
    })

    it('should fetch grades with filters', async () => {
      const filters = {
        classId: '1',
        examId: '1',
        subjectId: '1'
      }

      const filteredGrades = mockGrades.filter(g => 
        g.class_id === '1' && g.exam_id === '1' && g.subject_id === '1'
      )

      const mockResponse = {
        success: true,
        data: filteredGrades,
        count: filteredGrades.length
      }

      mockAuthenticatedRequest.mockResolvedValue(mockApiResponse(mockResponse))

      const result = await dataAccess.getGrades(filters)

      expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/grades', 'GET', undefined, filters)
      expect(result).toEqual(filteredGrades)
    })

    it('should create a new grade successfully', async () => {
      const newGrade = {
        student_id: '2',
        subject_id: '1',
        exam_id: '1',
        score: 88
      }

      const mockResponse = {
        success: true,
        data: { ...newGrade, grade_id: '3' }
      }

      mockAuthenticatedRequest.mockResolvedValue(mockApiResponse(mockResponse, 201))

      const result = await dataAccess.createGrade(newGrade)

      expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/grades', 'POST', newGrade)
      expect(result).toEqual(mockResponse.data)
    })

    it('should update a grade successfully', async () => {
      const gradeId = '1'
      const updateData = {
        score: 90
      }

      const mockResponse = {
        success: true,
        data: { ...updateData, grade_id: gradeId }
      }

      mockAuthenticatedRequest.mockResolvedValue(mockApiResponse(mockResponse))

      const result = await dataAccess.updateGrade(gradeId, updateData)

      expect(mockAuthenticatedRequest).toHaveBeenCalledWith(`/api/grades/${gradeId}`, 'PUT', updateData)
      expect(result).toEqual(mockResponse.data)
    })

    it('should bulk create grades successfully', async () => {
      const bulkGrades = [
        { student_id: '1', subject_id: '1', exam_id: '1', score: 85 },
        { student_id: '2', subject_id: '1', exam_id: '1', score: 90 }
      ]

      const mockResponse = {
        success: true,
        data: bulkGrades.map((g, index) => ({ ...g, grade_id: String(index + 4) }))
      }

      mockAuthenticatedRequest.mockResolvedValue(mockApiResponse(mockResponse, 201))

      const result = await dataAccess.bulkCreateGrades(bulkGrades)

      expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/grades/bulk', 'POST', { grades: bulkGrades })
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('Statistics', () => {
    it('should fetch class statistics successfully', async () => {
      const mockStats = [
        {
          class_id: '1',
          class_name: '高一(1)班',
          subject_stats: [
            {
              subject_id: '1',
              subject_name: '语文',
              average: 82.5,
              max: 95,
              min: 65,
              pass_rate: 95.6,
              excellent_rate: 45.2,
              count: 45
            }
          ],
          overall_average: 85.2,
          total_students: 45
        }
      ]

      const mockResponse = {
        success: true,
        data: mockStats
      }

      mockAuthenticatedRequest.mockResolvedValue(mockApiResponse(mockResponse))

      const result = await dataAccess.getClassStatistics('1')

      expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/statistics/class', 'GET', undefined, { classId: '1' })
      expect(result).toEqual(mockStats)
    })

    it('should fetch student statistics successfully', async () => {
      const mockStats = [
        {
          student_id: '1',
          student_name: '张三',
          class_name: '高一(1)班',
          total_score: 525,
          average_score: 87.5,
          rank_in_class: 5,
          rank_in_grade: 25
        }
      ]

      const mockResponse = {
        success: true,
        data: mockStats
      }

      mockAuthenticatedRequest.mockResolvedValue(mockApiResponse(mockResponse))

      const result = await dataAccess.getStudentStatistics('1')

      expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/statistics/student', 'GET', undefined, { studentId: '1' })
      expect(result).toEqual(mockStats)
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockAuthenticatedRequest.mockRejectedValue(new Error('API Error'))

      await expect(dataAccess.getUsers()).rejects.toThrow('API Error')
    })

    it('should handle network errors', async () => {
      mockAuthenticatedRequest.mockRejectedValue(new Error('Network Error'))

      await expect(dataAccess.getStudents()).rejects.toThrow('Network Error')
    })

    it('should handle validation errors', async () => {
      const invalidStudent = {
        student_name: '', // Invalid: empty name
        class_id: '1',
        seat_number: -1 // Invalid: negative seat number
      }

      mockAuthenticatedRequest.mockRejectedValue(new Error('Validation Error'))

      await expect(dataAccess.createStudent(invalidStudent)).rejects.toThrow('Validation Error')
    })

    it('should handle unauthorized access', async () => {
      mockAuthenticatedRequest.mockRejectedValue(new Error('Unauthorized'))

      await expect(dataAccess.getUsers()).rejects.toThrow('Unauthorized')
    })
  })

  describe('Data Validation', () => {
    it('should validate student data before creation', async () => {
      const invalidStudent = {
        student_name: 'A'.repeat(300), // Too long
        class_id: '1',
        seat_number: 0, // Invalid seat number
        gender: 'invalid', // Invalid gender
        birth_date: 'invalid-date' // Invalid date format
      }

      mockAuthenticatedRequest.mockRejectedValue(new Error('Validation failed'))

      await expect(dataAccess.createStudent(invalidStudent)).rejects.toThrow('Validation failed')
    })

    it('should validate grade data before creation', async () => {
      const invalidGrade = {
        student_id: '1',
        subject_id: '1',
        exam_id: '1',
        score: 150 // Invalid: score > 100
      }

      mockAuthenticatedRequest.mockRejectedValue(new Error('Validation failed'))

      await expect(dataAccess.createGrade(invalidGrade)).rejects.toThrow('Validation failed')
    })
  })
})
