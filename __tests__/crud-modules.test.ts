import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { PostgreSQLDatabase, DatabaseManager, DataAccessLayer } from '@/lib/database'

describe('All Modules CRUD Tests', () => {
  let db: PostgreSQLDatabase
  let dataAccess: DataAccessLayer

  beforeEach(() => {
    jest.clearAllMocks()
    ;(PostgreSQLDatabase as any).instance = null
    ;(DatabaseManager as any).instance = null

    // Create mock database instance
    db = PostgreSQLDatabase.getInstance()
    ;(db as any).connected = true
    
    // Mock the query method
    ;(db.query as jest.Mock) = jest.fn().mockResolvedValue({
      rows: [],
      rowCount: 0
    })

    // Mock DatabaseManager
    const mockManager = {
      getDatabase: () => db
    }
    jest.spyOn(DatabaseManager, 'getInstance').mockReturnValue(mockManager as any)
    
    dataAccess = new DataAccessLayer()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  // ==========================================
  // 1. Classes Module CRUD
  // ==========================================
  describe('Classes Module', () => {
    it('Create Class', async () => {
      const newClass = { class_name: 'Test Class', grade_level: 1, academic_year: '2024', class_teacher: 'Mr. Smith' }
      ;(db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ class_id: 1, ...newClass }], rowCount: 1 })
      
      const result = await dataAccess.createClass(newClass)
      
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO classes'),
        expect.arrayContaining(['Test Class', 1, '2024', 'Mr. Smith'])
      )
      expect(result.class_id).toBe(1)
    })

    it('Read Classes', async () => {
      ;(db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ class_id: 1, class_name: 'Test Class' }], rowCount: 1 })
      
      const result = await dataAccess.getClasses({ grade_level: 1 })
      
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('WHERE grade_level = $1'), [1])
      expect(result).toHaveLength(1)
    })

    it('Update Class', async () => {
      ;(db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ class_id: 1, class_teacher: 'Ms. Jane' }], rowCount: 1 })
      
      const result = await dataAccess.updateClass('1', { class_teacher: 'Ms. Jane' })
      
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE classes SET'),
        expect.arrayContaining(['Ms. Jane', '1'])
      )
      expect(result.class_teacher).toBe('Ms. Jane')
    })

    it('Delete Class', async () => {
      ;(db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 })
      
      const result = await dataAccess.deleteClass('1')
      
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM classes WHERE class_id = $1'), ['1'])
      expect(result).toBe(true)
    })
  })

  // ==========================================
  // 2. Students Module CRUD
  // ==========================================
  describe('Students Module', () => {
    it('Create Student', async () => {
      const newStudent = { student_number: 'S001', student_name: 'John', class_id: 1, seat_number: 1, gender: 'Male' }
      ;(db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ student_id: 1, ...newStudent }], rowCount: 1 })
      
      const result = await dataAccess.createStudent(newStudent)
      
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO students'),
        expect.arrayContaining(['S001', 'John', 1, 1, 'Male'])
      )
      expect(result.student_id).toBe(1)
    })

    it('Read Students', async () => {
      ;(db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ student_id: 1, student_name: 'John' }], rowCount: 1 })
      
      const result = await dataAccess.getStudents({ class_id: 1 })
      
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('WHERE s.class_id = $1'), [1])
      expect(result).toHaveLength(1)
    })

    it('Update Student', async () => {
      ;(db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ student_id: 1, student_name: 'John Doe' }], rowCount: 1 })
      
      const result = await dataAccess.updateStudent('1', { student_name: 'John Doe' })
      
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE students SET'),
        expect.arrayContaining(['John Doe', '1'])
      )
      expect(result.student_name).toBe('John Doe')
    })

    it('Delete Student', async () => {
      ;(db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 })
      
      const result = await dataAccess.deleteStudent('1')
      
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM students WHERE student_id = $1'), ['1'])
      expect(result).toBe(true)
    })
  })

  // ==========================================
  // 3. Subjects Module CRUD
  // ==========================================
  describe('Subjects Module', () => {
    it('Create Subject', async () => {
      const newSubject = { subject_name: 'Math', full_score: 150, is_compulsory: true }
      ;(db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ subject_id: 1, ...newSubject }], rowCount: 1 })
      
      const result = await dataAccess.createSubject(newSubject)
      
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO subjects'),
        expect.arrayContaining(['Math', 150, true])
      )
      expect(result.subject_id).toBe(1)
    })

    it('Read Subjects', async () => {
      ;(db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ subject_id: 1, subject_name: 'Math' }], rowCount: 1 })
      
      const result = await dataAccess.getSubjects()
      
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM subjects ORDER BY subject_code'))
      expect(result).toHaveLength(1)
    })

    it('Update Subject', async () => {
      ;(db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ subject_id: 1, full_score: 100 }], rowCount: 1 })
      
      const result = await dataAccess.updateSubject('1', { full_score: 100 })
      
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE subjects SET'),
        expect.arrayContaining([100, '1'])
      )
      expect(result.full_score).toBe(100)
    })

    it('Delete Subject', async () => {
      ;(db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 })
      
      const result = await dataAccess.deleteSubject('1')
      
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM subjects WHERE subject_id = $1'), ['1'])
      expect(result).toBe(true)
    })
  })

  // ==========================================
  // 4. Exams Module CRUD
  // ==========================================
  describe('Exams Module', () => {
    it('Create Exam', async () => {
      const newExam = { exam_name: 'Midterm', exam_date: '2024-05-01', academic_year: '2024', semester: 'Spring' }
      ;(db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ exam_id: 1, ...newExam }], rowCount: 1 })
      
      const result = await dataAccess.createExam(newExam)
      
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO exams'),
        expect.arrayContaining(['Midterm', '2024-05-01', '2024', 'Spring'])
      )
      expect(result.exam_id).toBe(1)
    })

    it('Read Exams', async () => {
      ;(db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ exam_id: 1, exam_name: 'Midterm' }], rowCount: 1 })
      
      const result = await dataAccess.getExams()
      
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM exams ORDER BY start_date DESC'))
      expect(result).toHaveLength(1)
    })

    it('Update Exam', async () => {
      ;(db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ exam_id: 1, exam_name: 'Final' }], rowCount: 1 })
      
      const result = await dataAccess.updateExam('1', { exam_name: 'Final' })
      
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE exams SET'),
        expect.arrayContaining(['Final', '1'])
      )
      expect(result.exam_name).toBe('Final')
    })

    it('Delete Exam', async () => {
      ;(db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 })
      
      const result = await dataAccess.deleteExam('1')
      
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM exams WHERE exam_id = $1'), ['1'])
      expect(result).toBe(true)
    })
  })

  // ==========================================
  // 5. Grades Module CRUD
  // ==========================================
  describe('Grades Module', () => {
    it('Create Grade', async () => {
      const newGrade = { student_id: 1, subject_id: 1, exam_id: 1, score: 95.5 }
      ;(db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ grade_id: 1, ...newGrade }], rowCount: 1 })
      
      const result = await dataAccess.createGrade(newGrade)
      
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO grades'),
        expect.arrayContaining([1, 1, 1, 95.5])
      )
      expect(result.grade_id).toBe(1)
    })

    it('Read Grades', async () => {
      ;(db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ grade_id: 1, score: 95.5 }], rowCount: 1 })
      
      const result = await dataAccess.getGrades({ exam_id: 1 })
      
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('WHERE e.exam_id = $1'), [1])
      expect(result).toHaveLength(1)
    })

    it('Update Grade', async () => {
      ;(db.query as jest.Mock).mockResolvedValueOnce({ rows: [{ grade_id: 1, score: 100 }], rowCount: 1 })
      
      const result = await dataAccess.updateGrade('1', { score: 100 })
      
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE grades SET'),
        expect.arrayContaining([100, '1'])
      )
      expect(result.score).toBe(100)
    })

    it('Delete Grade', async () => {
      ;(db.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 })
      
      const result = await dataAccess.deleteGrade('1')
      
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM grades WHERE grade_id = $1'), ['1'])
      expect(result).toBe(true)
    })
  })
})
