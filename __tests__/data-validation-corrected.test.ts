import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import {
  validateBirthDate,
  validateClassName,
  validateSubjectCode,
  validateExamName,
  validateUsername,
  validatePassword,
  validateUniqueSeatNumbers,
  validateStudentData,
  validateGradeData,
  validateUserData
} from '@/lib/validation-fixed'

describe('Data Validation Tests - Corrected', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Student Data Validation - Fixed', () => {
    it('should validate student name format', () => {
      const validNames = ['张三', '李四', '王五', '赵六', '钱七']
      const invalidNames = [
        '', // Empty
        '张', // Too short
        'A', // Non-Chinese
        '123', // Numbers
        '张三李四王五赵六钱七孙八', // Too long
        '张三!', // Special character
        'Zhang San', // Mixed
        '张三123' // Mixed with numbers
      ]

      validNames.forEach(name => {
        expect(/^[\u4e00-\u9fa5]{2,6}$/.test(name)).toBe(true)
      })

      invalidNames.forEach(name => {
        expect(/^[\u4e00-\u9fa5]{2,6}$/.test(name)).toBe(false)
      })
    })

    it('should validate seat number', () => {
      const validSeatNumbers = [1, 2, 10, 50, 99]
      const invalidSeatNumbers = [0, -1, 100, 1.5, null, undefined, 'abc']

      const validateSeatNumber = (seatNumber: number) => {
        return Number.isInteger(seatNumber) && seatNumber > 0 && seatNumber <= 99
      }

      validSeatNumbers.forEach(seatNumber => {
        expect(validateSeatNumber(seatNumber)).toBe(true)
      })

      invalidSeatNumbers.forEach(seatNumber => {
        if (seatNumber === null || seatNumber === undefined || typeof seatNumber !== 'number') return
        expect(validateSeatNumber(seatNumber)).toBe(false)
      })
    })

    it('should validate gender', () => {
      const validGenders = ['男', '女']
      const invalidGenders = ['male', 'female', '未知', '', '其他', 'M', 'F']

      const validateGender = (gender: string) => {
        return validGenders.includes(gender)
      }

      validGenders.forEach(gender => {
        expect(validateGender(gender)).toBe(true)
      })

      invalidGenders.forEach(gender => {
        expect(validateGender(gender)).toBe(false)
      })
    })

    it('should validate birth date - FIXED', () => {
      const validDates = [
        '2006-01-01',
        '2006-12-31',
        '2005-05-15',
        '2007-08-20'
      ]

      const invalidDates = [
        '2006-13-01', // Invalid month
        '2006-02-30', // Invalid day
        '2024-01-01', // Too recent (assuming current year is 2024)
        '1900-01-01', // Too old
        '2006-01', // Incomplete
        'invalid-date',
        '',
        null,
        undefined
      ]

      validDates.forEach(date => {
        expect(validateBirthDate(date)).toBe(true)
      })

      invalidDates.forEach(date => {
        if (date === null || date === undefined) return
        expect(validateBirthDate(date)).toBe(false)
      })
    })

    it('should validate complete student data', () => {
      const validStudent = {
        student_name: '张三',
        class_id: '1',
        seat_number: 1,
        gender: '男',
        birth_date: '2006-05-15'
      }

      const invalidStudent = {
        student_name: 'A',
        class_id: '',
        seat_number: -1,
        gender: 'invalid',
        birth_date: 'invalid-date'
      }

      expect(validateStudentData(validStudent).isValid).toBe(true)
      expect(validateStudentData(invalidStudent).isValid).toBe(false)
      expect(validateStudentData(invalidStudent).errors.length).toBeGreaterThan(0)
    })
  })

  describe('Grade Data Validation - Fixed', () => {
    it('should validate score range', () => {
      const validScores = [0, 59, 60, 85, 99, 100]
      const invalidScores = [-1, -10, 101, 150, 1.5, null, undefined, 'abc']

      const validateScore = (score: number) => {
        return Number.isInteger(score) && score >= 0 && score <= 100
      }

      validScores.forEach(score => {
        expect(validateScore(score)).toBe(true)
      })

      invalidScores.forEach(score => {
        if (score === null || score === undefined || typeof score !== 'number') return
        expect(validateScore(score)).toBe(false)
      })
    })

    it('should validate complete grade data', () => {
      const validGrade = {
        student_id: '1',
        subject_id: '1',
        exam_id: '1',
        score: 85
      }

      const invalidGrade = {
        student_id: '',
        subject_id: '',
        exam_id: '',
        score: 150
      }

      expect(validateGradeData(validGrade).isValid).toBe(true)
      expect(validateGradeData(invalidGrade).isValid).toBe(false)
      expect(validateGradeData(invalidGrade).errors.length).toBeGreaterThan(0)
    })
  })

  describe('Class Data Validation - Fixed', () => {
    it('should validate class name format - FIXED', () => {
      const validNames = [
        '高一(1)班',
        '高二(3)班',
        '高三(2)班',
        '高一1班',
        'Class 1',
        '三年级1班'
      ]

      const invalidNames = [
        '',
        '高一(1)', // Missing 班
        '1班', // Missing grade
        '高一(99)班', // Invalid class number
        '高一(0)班', // Invalid class number
        '高一(-1)班', // Negative class number
        '高四(1)班' // Invalid grade
      ]

      validNames.forEach(name => {
        expect(validateClassName(name)).toBe(true)
      })

      invalidNames.forEach(name => {
        expect(validateClassName(name)).toBe(false)
      })
    })
  })

  describe('Subject Data Validation - Fixed', () => {
    it('should validate subject name', () => {
      const validNames = [
        '语文',
        '数学',
        '英语',
        '物理',
        '化学',
        '生物',
        '政治',
        '历史',
        '地理',
        '信息技术'
      ]

      const invalidNames = [
        '',
        '语', // Too short
        '123', // Numbers only
        'Subject', // English
        '语文123', // Mixed
        '语文!', // Special character
        '非常长的科目名称超过十个字' // Too long
      ]

      const validateSubjectName = (name: string) => {
        const chineseRegex = /^[\u4e00-\u9fa5]{2,10}$/
        return chineseRegex.test(name)
      }

      validNames.forEach(name => {
        expect(validateSubjectName(name)).toBe(true)
      })

      invalidNames.forEach(name => {
        expect(validateSubjectName(name)).toBe(false)
      })
    })

    it('should validate subject code - FIXED', () => {
      const validCodes = ['CHN', 'MATH', 'ENG', 'PHY', 'CHE', 'BIO', 'POL', 'HIS', 'GEO', 'IT']
      const invalidCodes = ['', 'CH', 'CHINESE', '123', 'chn', 'CHN1']

      validCodes.forEach(code => {
        expect(validateSubjectCode(code)).toBe(true)
      })

      invalidCodes.forEach(code => {
        expect(validateSubjectCode(code)).toBe(false)
      })
    })
  })

  describe('Exam Data Validation - Fixed', () => {
    it('should validate exam name - FIXED', () => {
      const validNames = [
        '期中考试',
        '期末考试',
        '月考',
        '单元测试',
        '模拟考试',
        '第一次月考',
        '2024年期中考试'
      ]

      const invalidNames = [
        '',
        '考', // Too short
        '123考试', // Numbers at start (but now allowed)
        'Exam', // English (but now allowed with spaces)
        '考试!', // Special character (but now allowed)
        '非常长的考试名称超过二十个字符的限制' // Too long
      ]

      validNames.forEach(name => {
        expect(validateExamName(name)).toBe(true)
      })

      invalidNames.forEach(name => {
        expect(validateExamName(name)).toBe(false)
      })
    })

    it('should validate exam type', () => {
      const validTypes = ['midterm', 'final', 'monthly', 'unit', 'mock']
      const invalidTypes = ['test', 'exam', '', 'invalid', 123, null, undefined]

      const validateExamType = (type: string) => {
        return validTypes.includes(type)
      }

      validTypes.forEach(type => {
        expect(validateExamType(type)).toBe(true)
      })

      invalidTypes.forEach(type => {
        if (type === null || type === undefined || typeof type !== 'string') return
        expect(validateExamType(type)).toBe(false)
      })
    })
  })

  describe('User Data Validation - Fixed', () => {
    it('should validate username - FIXED', () => {
      const validUsernames = ['admin', 'teacher1', 'student2024', 'user_123', '_username']
      const invalidUsernames = ['', 'a', 'ab', 'user!', 'user@123', '123user', 'verylongusernamethatexceedslimit']

      validUsernames.forEach(username => {
        expect(validateUsername(username)).toBe(true)
      })

      invalidUsernames.forEach(username => {
        expect(validateUsername(username)).toBe(false)
      })
    })

    it('should validate email', () => {
      const validEmails = [
        'user@example.com',
        'test.email@domain.org',
        'user+tag@example.co.uk',
        'user123@test-domain.com'
      ]

      const invalidEmails = [
        '',
        'user',
        'user@',
        '@example.com',
        'user@',
        'user.example.com',
        'user@.com',
        'user@com.',
        'user space@example.com'
      ]

      const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email)
      }

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true)
      })

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false)
      })
    })

    it('should validate password strength - FIXED', () => {
      const validPasswords = [
        'Password123!',
        'SecurePass456',
        'MyPassword789',
        'StrongPass1!',
        'Test@123456'
      ]

      const invalidPasswords = [
        '', // Empty
        '123', // Too short
        'password', // No uppercase, no numbers, no special chars
        'PASSWORD', // No lowercase, no numbers, no special chars
        'Password', // No numbers, no special chars
        'Password123', // No special chars
        'Pass123!', // Too short
        'verylongpassword123!' // Too long
      ]

      validPasswords.forEach(password => {
        expect(validatePassword(password)).toBe(true)
      })

      invalidPasswords.forEach(password => {
        expect(validatePassword(password)).toBe(false)
      })
    })

    it('should validate complete user data', () => {
      const validUser = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
        role: 'student'
      }

      const invalidUser = {
        username: '123user',
        email: 'invalid-email',
        password: 'weak',
        role: 'invalid'
      }

      expect(validateUserData(validUser).isValid).toBe(true)
      expect(validateUserData(invalidUser).isValid).toBe(false)
      expect(validateUserData(invalidUser).errors.length).toBeGreaterThan(0)
    })
  })

  describe('Business Logic Validation - Fixed', () => {
    it('should validate student-class relationship', () => {
      const students = [
        { student_id: '1', class_id: '1' },
        { student_id: '2', class_id: '1' },
        { student_id: '3', class_id: '2' }
      ]

      const classes = [
        { class_id: '1', grade_level: 1 },
        { class_id: '2', grade_level: 1 }
      ]

      const validateStudentClassRelation = (studentId: string, classId: string) => {
        const student = students.find(s => s.student_id === studentId)
        const classInfo = classes.find(c => c.class_id === classId)
        
        if (!student || !classInfo) return false
        return student.class_id === classId
      }

      expect(validateStudentClassRelation('1', '1')).toBe(true)
      expect(validateStudentClassRelation('3', '2')).toBe(true)
      expect(validateStudentClassRelation('1', '2')).toBe(false)
      expect(validateStudentClassRelation('4', '1')).toBe(false)
    })

    it('should prevent duplicate seat numbers in same class - FIXED', () => {
      const students = [
        { student_id: '1', class_id: '1', seat_number: 1 },
        { student_id: '2', class_id: '1', seat_number: 2 },
        { student_id: '3', class_id: '1', seat_number: 1 }, // Duplicate!
        { student_id: '4', class_id: '2', seat_number: 1 } // Same seat but different class
      ]

      // Test new seat (should be valid)
      expect(validateUniqueSeatNumbers(students, '1', 3)).toBe(true)
      
      // Test same student, same seat (should be valid)
      expect(validateUniqueSeatNumbers(students, '1', 1, '1')).toBe(true)
      
      // Test different student, same seat (should be invalid)
      expect(validateUniqueSeatNumbers(students, '1', 1, '2')).toBe(false)
      
      // Test different class, same seat (should be valid)
      expect(validateUniqueSeatNumbers(students, '2', 1)).toBe(true)
    })

    it('should validate grade-subject compatibility', () => {
      const grades = [
        { grade_id: '1', subject_id: '1', exam_id: '1' },
        { grade_id: '2', subject_id: '2', exam_id: '1' }
      ]

      const subjects = [
        { subject_id: '1', grade_levels: [1, 2, 3] },
        { subject_id: '2', grade_levels: [2, 3] }
      ]

      const exams = [
        { exam_id: '1', grade_level: 1 },
        { exam_id: '2', grade_level: 2 }
      ]

      const validateGradeSubjectCompatibility = (grade: any) => {
        const subject = subjects.find(s => s.subject_id === grade.subject_id)
        const exam = exams.find(e => e.exam_id === grade.exam_id)
        
        if (!subject || !exam) return false
        
        // Check if subject is available for exam's grade level
        return subject.grade_levels.includes(exam.grade_level)
      }

      expect(validateGradeSubjectCompatibility(grades[0])).toBe(true)
      expect(validateGradeSubjectCompatibility(grades[1])).toBe(false) // Subject 2 not available for grade 1
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(validateBirthDate(null as any)).toBe(false)
      expect(validateBirthDate(undefined as any)).toBe(false)
      expect(validateClassName(null as any)).toBe(false)
      expect(validateClassName(undefined as any)).toBe(false)
      expect(validateSubjectCode(null as any)).toBe(false)
      expect(validateSubjectCode(undefined as any)).toBe(false)
      expect(validateExamName(null as any)).toBe(false)
      expect(validateExamName(undefined as any)).toBe(false)
      expect(validateUsername(null as any)).toBe(false)
      expect(validateUsername(undefined as any)).toBe(false)
      expect(validatePassword(null as any)).toBe(false)
      expect(validatePassword(undefined as any)).toBe(false)
    })

    it('should handle empty strings correctly', () => {
      expect(validateBirthDate('')).toBe(false)
      expect(validateClassName('')).toBe(false)
      expect(validateSubjectCode('')).toBe(false)
      expect(validateExamName('')).toBe(false)
      expect(validateUsername('')).toBe(false)
      expect(validatePassword('')).toBe(false)
    })

    it('should validate boundary values correctly', () => {
      // Test age boundaries
      const currentYear = new Date().getFullYear()
      const minBirthYear = currentYear - 25
      const maxBirthYear = currentYear - 5
      
      expect(validateBirthDate(`${minBirthYear}-01-01`)).toBe(true)
      expect(validateBirthDate(`${maxBirthYear}-12-31`)).toBe(true)
      expect(validateBirthDate(`${minBirthYear - 1}-01-01`)).toBe(false)
      expect(validateBirthDate(`${maxBirthYear + 1}-12-31`)).toBe(false)
      
      // Test username length boundaries
      expect(validateUsername('abc')).toBe(true) // 3 chars
      expect(validateUsername('a'.repeat(20))).toBe(true) // 20 chars
      expect(validateUsername('ab')).toBe(false) // 2 chars
      expect(validateUsername('a'.repeat(21))).toBe(false) // 21 chars
      
      // Test password length boundaries
      expect(validatePassword('Abcdef1!')).toBe(true) // 8 chars
      expect(validatePassword('A'.repeat(17) + '1!')).toBe(true) // 19 chars
      expect(validatePassword('Abcdef1')).toBe(false) // 7 chars
      expect(validatePassword('A'.repeat(19) + '1!')).toBe(false) // 21 chars
    })
  })
})
