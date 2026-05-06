import { setupServer } from 'msw/node'
import { rest } from 'msw'

// Mock API handlers
export const handlers = [
  // Auth endpoints
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          user: {
            id: 'test-user-id',
            username: 'testuser',
            email: 'test@example.com',
            role: 'teacher'
          },
          tokens: {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token'
          }
        }
      })
    )
  }),

  rest.post('/api/auth/logout', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Logged out successfully'
      })
    )
  }),

  rest.get('/api/auth/me', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          id: 'test-user-id',
          username: 'testuser',
          email: 'test@example.com',
          role: 'teacher'
        }
      })
    )
  }),

  // Users endpoints
  rest.get('/api/users', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: [
          {
            id: '1',
            username: 'admin',
            email: 'admin@example.com',
            role: 'admin',
            createdAt: '2024-01-01T00:00:00Z'
          },
          {
            id: '2',
            username: 'teacher1',
            email: 'teacher1@example.com',
            role: 'teacher',
            createdAt: '2024-01-02T00:00:00Z'
          }
        ],
        count: 2
      })
    )
  }),

  rest.post('/api/users', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: {
          id: '3',
          username: 'newuser',
          email: 'newuser@example.com',
          role: 'student',
          createdAt: '2024-01-03T00:00:00Z'
        }
      })
    )
  }),

  // Students endpoints
  rest.get('/api/students', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: [
          {
            student_id: '1',
            student_name: '张三',
            class_id: '1',
            class_name: '高一(1)班',
            seat_number: 1,
            gender: '男',
            birth_date: '2006-05-15'
          },
          {
            student_id: '2',
            student_name: '李四',
            class_id: '1',
            class_name: '高一(1)班',
            seat_number: 2,
            gender: '女',
            birth_date: '2006-08-20'
          }
        ],
        count: 2
      })
    )
  }),

  rest.post('/api/students', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: {
          student_id: '3',
          student_name: '王五',
          class_id: '2',
          class_name: '高一(2)班',
          seat_number: 1,
          gender: '男',
          birth_date: '2006-03-10'
        }
      })
    )
  }),

  // Classes endpoints
  rest.get('/api/classes', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: [
          {
            class_id: '1',
            class_name: '高一(1)班',
            grade_level: 1,
            teacher_id: '1',
            teacher_name: '张老师',
            student_count: 45
          },
          {
            class_id: '2',
            class_name: '高一(2)班',
            grade_level: 1,
            teacher_id: '2',
            teacher_name: '李老师',
            student_count: 44
          }
        ],
        count: 2
      })
    )
  }),

  // Subjects endpoints
  rest.get('/api/subjects', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: [
          {
            subject_id: '1',
            subject_code: 'CHN',
            subject_name: '语文',
            credit: 5,
            is_compulsory: true
          },
          {
            subject_id: '2',
            subject_code: 'MATH',
            subject_name: '数学',
            credit: 5,
            is_compulsory: true
          },
          {
            subject_id: '3',
            subject_code: 'ENG',
            subject_name: '英语',
            credit: 4,
            is_compulsory: true
          }
        ],
        count: 3
      })
    )
  }),

  // Exams endpoints
  rest.get('/api/exams', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: [
          {
            exam_id: '1',
            exam_name: '期中考试',
            exam_type: 'midterm',
            academic_year: '2024',
            semester: '1',
            start_date: '2024-05-10',
            end_date: '2024-05-15'
          },
          {
            exam_id: '2',
            exam_name: '期末考试',
            exam_type: 'final',
            academic_year: '2024',
            semester: '1',
            start_date: '2024-07-05',
            end_date: '2024-07-10'
          }
        ],
        count: 2
      })
    )
  }),

  // Grades endpoints
  rest.get('/api/grades', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: [
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
          },
          {
            grade_id: '2',
            student_id: '1',
            student_name: '张三',
            class_name: '高一(1)班',
            seat_number: 1,
            subject_id: '2',
            subject_name: '数学',
            exam_id: '1',
            exam_name: '期中考试',
            score: 92,
            semester: '1',
            academic_year: '2024'
          }
        ],
        count: 2
      })
    )
  }),

  rest.post('/api/grades', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: {
          grade_id: '3',
          student_id: '2',
          subject_id: '1',
          exam_id: '1',
          score: 88,
          semester: '1',
          academic_year: '2024'
        }
      })
    )
  }),

  // Statistics endpoints
  rest.get('/api/statistics/class', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: [
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
      })
    )
  }),

  rest.get('/api/statistics/student', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: [
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
      })
    )
  }),

  // Security dashboard endpoint
  rest.get('/api/security/dashboard', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          overview: {
            totalEvents: 125,
            criticalAlerts: 2,
            blockedEntities: 5,
            systemStatus: 'healthy'
          },
          charts: {
            eventsByType: {
              'authentication': 45,
              'authorization': 30,
              'data_access': 25,
              'data_modification': 15,
              'system_config': 10
            },
            eventsBySeverity: {
              'low': 80,
              'medium': 35,
              'high': 8,
              'critical': 2
            },
            timeline: Array.from({ length: 24 }, (_, i) => ({
              hour: i,
              events: Math.floor(Math.random() * 10),
              critical: Math.floor(Math.random() * 2)
            }))
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
      })
    )
  }),

  // Error handlers
  rest.get('/api/error-test', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({
        success: false,
        error: 'Internal server error',
        message: 'Test error for error handling'
      })
    )
  }),

  // Unauthorized handler
  rest.get('/api/unauthorized', (req, res, ctx) => {
    return res(
      ctx.status(401),
      ctx.json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      })
    )
  })
]

// Create server
export const server = setupServer(...handlers)
