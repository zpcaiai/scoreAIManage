import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { PostgreSQLDatabase, DatabaseManager, DataAccessLayer } from '@/lib/database'

// Mock环境变量
process.env.DATABASE_HOST = 'localhost'
process.env.DATABASE_PORT = '5432'
process.env.DATABASE_NAME = 'test_scoremanage'
process.env.DATABASE_USER = 'postgres'
process.env.DATABASE_PASSWORD = 'password'

describe('PostgreSQL Database Tests', () => {
  let db: PostgreSQLDatabase
  let dataAccess: DataAccessLayer

  beforeEach(() => {
    jest.clearAllMocks()
    // 重置单例实例
    ;(PostgreSQLDatabase as any).instance = null
    ;(DatabaseManager as any).instance = null
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Database Connection', () => {
    it('should create database instance', () => {
      db = PostgreSQLDatabase.getInstance()
      expect(db).toBeInstanceOf(PostgreSQLDatabase)
    })

    it('should use singleton pattern', () => {
      const db1 = PostgreSQLDatabase.getInstance()
      const db2 = PostgreSQLDatabase.getInstance()
      expect(db1).toBe(db2)
    })

    it('should handle connection failure gracefully', async () => {
      db = PostgreSQLDatabase.getInstance()
      
      // Mock连接失败
      const mockConnect = jest.spyOn(db, 'connect').mockRejectedValue(new Error('Connection failed'))
      
      await expect(db.connect()).rejects.toThrow('Connection failed')
      mockConnect.mockRestore()
    })
  })

  describe('Database Manager', () => {
    it('should create manager instance', () => {
      const manager = DatabaseManager.getInstance()
      expect(manager).toBeInstanceOf(DatabaseManager)
    })

    it('should use singleton pattern', () => {
      const manager1 = DatabaseManager.getInstance()
      const manager2 = DatabaseManager.getInstance()
      expect(manager1).toBe(manager2)
    })
  })

  describe('Data Access Layer', () => {
    beforeEach(() => {
      // 创建模拟的数据库实例
      db = PostgreSQLDatabase.getInstance()
      ;(db as any).connected = true
      
      // Mock query方法
      ;(db.query as jest.Mock) = jest.fn().mockResolvedValue({
        rows: [
          { class_id: 1, class_name: '高一(1)班' },
          { class_id: 2, class_name: '高一(2)班' }
        ],
        rowCount: 2
      })

      // Mock DatabaseManager
      const mockManager = {
        getDatabase: () => db
      }
      jest.spyOn(DatabaseManager, 'getInstance').mockReturnValue(mockManager as any)
      
      dataAccess = new DataAccessLayer()
    })

    it('should query classes successfully', async () => {
      const classes = await dataAccess.getClasses()
      expect(classes).toHaveLength(2)
      expect(classes[0].class_name).toBe('高一(1)班')
    })

    it('should query classes with filters', async () => {
      const classes = await dataAccess.getClasses({ grade_level: 1 })
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE grade_level = $1'),
        [1]
      )
    })

    it('should get class by id', async () => {
      ;(db.query as jest.Mock) = jest.fn().mockResolvedValue({
        rows: [{ class_id: 1, class_name: '高一(1)班' }],
        rowCount: 1
      })

      const classData = await dataAccess.getClassById('1')
      expect(classData).toEqual({ class_id: 1, class_name: '高一(1)班' })
      expect(db.query).toHaveBeenCalledWith('SELECT * FROM classes WHERE class_id = $1', ['1'])
    })

    it('should return null for non-existent class', async () => {
      ;(db.query as jest.Mock) = jest.fn().mockResolvedValue({
        rows: [],
        rowCount: 0
      })

      const classData = await dataAccess.getClassById('999')
      expect(classData).toBeNull()
    })

    it('should create new class', async () => {
      const newClass = {
        class_name: '高三(1)班',
        grade_level: 3,
        academic_year: '2024-2025',
        class_teacher: '赵老师'
      }

      ;(db.query as jest.Mock) = jest.fn().mockResolvedValue({
        rows: [{ class_id: 3, ...newClass }],
        rowCount: 1
      })

      const result = await dataAccess.createClass(newClass)
      expect(result.class_id).toBe(3)
      expect(result.class_name).toBe('高三(1)班')
    })

    it('should update existing class', async () => {
      const updateData = { class_teacher: '新老师' }
      
      ;(db.query as jest.Mock) = jest.fn().mockResolvedValue({
        rows: [{ class_id: 1, class_teacher: '新老师' }],
        rowCount: 1
      })

      const result = await dataAccess.updateClass('1', updateData)
      expect(result.class_teacher).toBe('新老师')
    })

    it('should delete class', async () => {
      ;(db.query as jest.Mock) = jest.fn().mockResolvedValue({
        rowCount: 1
      })

      const result = await dataAccess.deleteClass('1')
      expect(result).toBe(true)
    })

    it('should handle delete non-existent class', async () => {
      ;(db.query as jest.Mock) = jest.fn().mockResolvedValue({
        rowCount: 0
      })

      const result = await dataAccess.deleteClass('999')
      expect(result).toBe(false)
    })
  })

  describe('Student Operations', () => {
    beforeEach(() => {
      db = PostgreSQLDatabase.getInstance()
      ;(db as any).connected = true
      
      ;(db.query as jest.Mock) = jest.fn().mockResolvedValue({
        rows: [
          { 
            student_id: 1, 
            student_name: '张三', 
            class_name: '高一(1)班' 
          }
        ],
        rowCount: 1
      })

      const mockManager = {
        getDatabase: () => db
      }
      jest.spyOn(DatabaseManager, 'getInstance').mockReturnValue(mockManager as any)
      
      dataAccess = new DataAccessLayer()
    })

    it('should get students with class names', async () => {
      const students = await dataAccess.getStudents()
      expect(students).toHaveLength(1)
      expect(students[0].student_name).toBe('张三')
      expect(students[0].class_name).toBe('高一(1)班')
    })

    it('should get student by id', async () => {
      const student = await dataAccess.getStudentById('1')
      expect(student.student_name).toBe('张三')
    })

    it('should create new student', async () => {
      const newStudent = {
        student_number: '202401001',
        student_name: '李四',
        class_id: 1,
        seat_number: 2,
        gender: '女',
        birth_date: '2008-07-22',
        enrollment_date: '2024-09-01'
      }

      ;(db.query as jest.Mock) = jest.fn().mockResolvedValue({
        rows: [{ student_id: 2, ...newStudent }],
        rowCount: 1
      })

      const result = await dataAccess.createStudent(newStudent)
      expect(result.student_id).toBe(2)
      expect(result.student_name).toBe('李四')
    })
  })

  describe('Grade Operations', () => {
    beforeEach(() => {
      db = PostgreSQLDatabase.getInstance()
      ;(db as any).connected = true
      
      ;(db.query as jest.Mock) = jest.fn().mockResolvedValue({
        rows: [
          { 
            grade_id: 1,
            student_name: '张三',
            subject_name: '数学',
            class_name: '高一(1)班',
            score: 95.5
          }
        ],
        rowCount: 1
      })

      const mockManager = {
        getDatabase: () => db
      }
      jest.spyOn(DatabaseManager, 'getInstance').mockReturnValue(mockManager as any)
      
      dataAccess = new DataAccessLayer()
    })

    it('should get grades with student and subject info', async () => {
      const grades = await dataAccess.getGrades()
      expect(grades).toHaveLength(1)
      expect(grades[0].student_name).toBe('张三')
      expect(grades[0].subject_name).toBe('数学')
    })

    it('should create new grade', async () => {
      const newGrade = {
        student_id: 1,
        subject_id: 2,
        exam_type: 'midterm',
        exam_date: '2024-11-01',
        score: 88.0,
        semester: '第一学期',
        academic_year: '2024-2025'
      }

      ;(db.query as jest.Mock) = jest.fn().mockResolvedValue({
        rows: [{ grade_id: 2, ...newGrade }],
        rowCount: 1
      })

      const result = await dataAccess.createGrade(newGrade)
      expect(result.grade_id).toBe(2)
      expect(result.score).toBe(88.0)
    })

    it('should create grades in batch', async () => {
      const grades = [
        { student_id: 1, subject_id: 1, score: 90.0 },
        { student_id: 1, subject_id: 2, score: 85.0 }
      ]

      const mockClient = {
        query: jest.fn().mockResolvedValue({
          rows: [{ grade_id: 1, ...grades[0] }],
          rowCount: 1
        }),
        release: jest.fn()
      } as any

      ;(db.getClient as jest.Mock) = jest.fn().mockResolvedValue(mockClient)
      ;(db.transaction as jest.Mock) = jest.fn().mockImplementation(async (callback) => {
        return await callback(mockClient)
      })

      const results = await dataAccess.createGrades(grades)
      expect(results).toHaveLength(2)
    })
  })

  describe('Health Check', () => {
    it('should return healthy status when connected', async () => {
      db = PostgreSQLDatabase.getInstance()
      ;(db as any).connected = true
      
      ;(db.query as jest.Mock) = jest.fn().mockResolvedValue({
        rows: [{ timestamp: '2024-01-01T00:00:00.000Z' }],
        rowCount: 1
      })

      const health = await db.healthCheck()
      expect(health.status).toBe('healthy')
      expect(health.timestamp).toBe('2024-01-01T00:00:00.000Z')
    })

    it('should return unhealthy status when disconnected', async () => {
      db = PostgreSQLDatabase.getInstance()
      ;(db as any).connected = false
      
      ;(db.query as jest.Mock) = jest.fn().mockRejectedValue(new Error('Connection failed'))

      const health = await db.healthCheck()
      expect(health.status).toBe('unhealthy')
      expect(health.connectionCount).toBe(0)
    })
  })

  describe('Transaction Support', () => {
    it('should handle successful transaction', async () => {
      db = PostgreSQLDatabase.getInstance()
      ;(db as any).connected = true

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      }

      ;(db.getClient as jest.Mock) = jest.fn().mockResolvedValue(mockClient)

      const result = await db.transaction(async (client) => {
        await client.query('BEGIN')
        await client.query('INSERT INTO test VALUES (1)')
        return 'success'
      })

      expect(result).toBe('success')
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN')
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT')
    })

    it('should rollback on transaction failure', async () => {
      db = PostgreSQLDatabase.getInstance()
      ;(db as any).connected = true

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      }

      ;(db.getClient as jest.Mock) = jest.fn().mockResolvedValue(mockClient)

      await expect(db.transaction(async (client) => {
        await client.query('BEGIN')
        throw new Error('Transaction failed')
      })).rejects.toThrow('Transaction failed')

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK')
    })
  })
})
