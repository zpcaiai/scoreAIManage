import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'

describe('Data Validation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Student Data Validation', () => {
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

      const validateStudentName = (name) => {
        const chineseRegex = /^[\u4e00-\u9fa5]{2,6}$/
        return chineseRegex.test(name)
      }

      validNames.forEach(name => {
        expect(validateStudentName(name)).toBe(true)
      })

      invalidNames.forEach(name => {
        expect(validateStudentName(name)).toBe(false)
      })
    })

    it('should validate seat number', () => {
      const validSeatNumbers = [1, 2, 10, 50, 99]
      const invalidSeatNumbers = [0, -1, 100, 1.5, null, undefined, 'abc']

      const validateSeatNumber = (seatNumber) => {
        return Number.isInteger(seatNumber) && seatNumber > 0 && seatNumber <= 99
      }

      validSeatNumbers.forEach(seatNumber => {
        expect(validateSeatNumber(seatNumber)).toBe(true)
      })

      invalidSeatNumbers.forEach(seatNumber => {
        expect(validateSeatNumber(seatNumber)).toBe(false)
      })
    })

    it('should validate gender', () => {
      const validGenders = ['男', '女']
      const invalidGenders = ['male', 'female', '未知', '', '其他', 'M', 'F']

      const validateGender = (gender) => {
        return validGenders.includes(gender)
      }

      validGenders.forEach(gender => {
        expect(validateGender(gender)).toBe(true)
      })

      invalidGenders.forEach(gender => {
        expect(validateGender(gender)).toBe(false)
      })
    })

    it('should validate birth date', () => {
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

      const validateBirthDate = (dateString) => {
        if (!dateString) return false
        
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return false
        
        const currentYear = new Date().getFullYear()
        const birthYear = date.getFullYear()
        
        // Should be between 5 and 25 years old
        const age = currentYear - birthYear
        return age >= 5 && age <= 25
      }

      validDates.forEach(date => {
        expect(validateBirthDate(date)).toBe(true)
      })

      invalidDates.forEach(date => {
        expect(validateBirthDate(date)).toBe(false)
      })
    })
  })

  describe('Grade Data Validation', () => {
    it('should validate score range', () => {
      const validScores = [0, 59, 60, 85, 99, 100]
      const invalidScores = [-1, -10, 101, 150, 1.5, null, undefined, 'abc']

      const validateScore = (score) => {
        return Number.isInteger(score) && score >= 0 && score <= 100
      }

      validScores.forEach(score => {
        expect(validateScore(score)).toBe(true)
      })

      invalidScores.forEach(score => {
        expect(validateScore(score)).toBe(false)
      })
    })

    it('should validate grade levels', () => {
      const validGrades = [1, 2, 3]
      const invalidGrades = [0, 4, -1, 1.5, 'abc', null, undefined]

      const validateGradeLevel = (grade) => {
        return Number.isInteger(grade) && grade >= 1 && grade <= 3
      }

      validGrades.forEach(grade => {
        expect(validateGradeLevel(grade)).toBe(true)
      })

      invalidGrades.forEach(grade => {
        expect(validateGradeLevel(grade)).toBe(false)
      })
    })

    it('should validate semester', () => {
      const validSemesters = [1, 2]
      const invalidSemesters = [0, 3, -1, 1.5, 'abc', null, undefined]

      const validateSemester = (semester) => {
        return Number.isInteger(semester) && semester >= 1 && semester <= 2
      }

      validSemesters.forEach(semester => {
        expect(validateSemester(semester)).toBe(true)
      })

      invalidSemesters.forEach(semester => {
        expect(validateSemester(semester)).toBe(false)
      })
    })

    it('should validate academic year', () => {
      const validYears = [2020, 2021, 2022, 2023, 2024]
      const invalidYears = [2019, 2025, -1, 1.5, 'abc', null, undefined]

      const validateAcademicYear = (year) => {
        const currentYear = new Date().getFullYear()
        return Number.isInteger(year) && year >= 2020 && year <= currentYear
      }

      validYears.forEach(year => {
        expect(validateAcademicYear(year)).toBe(true)
      })

      invalidYears.forEach(year => {
        expect(validateAcademicYear(year)).toBe(false)
      })
    })
  })

  describe('Class Data Validation', () => {
    it('should validate class name format', () => {
      const validNames = [
        '高一(1)班',
        '高二(3)班',
        '高三(2)班',
        '高一1班',
        'Class 1'
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

      const validateClassName = (name) => {
        if (!name || name.length < 3) return false
        
        // Check for format like "高一(1)班" or "高一1班"
        const regex1 = /^[一二三]高\(\d{1,2}\)班$/
        const regex2 = /^[一二三]高\d{1,2}班$/
        const regex3 = /^Class \d+$/ // English format
        
        return regex1.test(name) || regex2.test(name) || regex3.test(name)
      }

      validNames.forEach(name => {
        expect(validateClassName(name)).toBe(true)
      })

      invalidNames.forEach(name => {
        expect(validateClassName(name)).toBe(false)
      })
    })

    it('should validate student count', () => {
      const validCounts = [1, 30, 45, 50, 60]
      const invalidCounts = [0, -1, 100, 1.5, 'abc', null, undefined]

      const validateStudentCount = (count) => {
        return Number.isInteger(count) && count > 0 && count <= 80
      }

      validCounts.forEach(count => {
        expect(validateStudentCount(count)).toBe(true)
      })

      invalidCounts.forEach(count => {
        expect(validateStudentCount(count)).toBe(false)
      })
    })
  })

  describe('Subject Data Validation', () => {
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

      const validateSubjectName = (name) => {
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

    it('should validate subject code', () => {
      const validCodes = ['CHN', 'MATH', 'ENG', 'PHY', 'CHE', 'BIO', 'POL', 'HIS', 'GEO', 'IT']
      const invalidCodes = ['', 'CH', 'CHINESE', '123', 'chn', 'CHN1']

      const validateSubjectCode = (code) => {
        const codeRegex = /^[A-Z]{2,4}$/
        return codeRegex.test(code)
      }

      validCodes.forEach(code => {
        expect(validateSubjectCode(code)).toBe(true)
      })

      invalidCodes.forEach(code => {
        expect(validateSubjectCode(code)).toBe(false)
      })
    })

    it('should validate credit hours', () => {
      const validCredits = [1, 2, 3, 4, 5, 6]
      const invalidCredits = [0, -1, 10, 1.5, 'abc', null, undefined]

      const validateCredit = (credit) => {
        return Number.isInteger(credit) && credit > 0 && credit <= 8
      }

      validCredits.forEach(credit => {
        expect(validateCredit(credit)).toBe(true)
      })

      invalidCredits.forEach(credit => {
        expect(validateCredit(credit)).toBe(false)
      })
    })
  })

  describe('Exam Data Validation', () => {
    it('should validate exam name', () => {
      const validNames = [
        '期中考试',
        '期末考试',
        '月考',
        '单元测试',
        '模拟考试'
      ]

      const invalidNames = [
        '',
        '考', // Too short
        '123考试', // Numbers at start
        'Exam', // English
        '考试!', // Special character
        '非常长的考试名称超过十五个字' // Too long
      ]

      const validateExamName = (name) => {
        const chineseRegex = /^[\u4e00-\u9fa5]{2,15}$/
        return chineseRegex.test(name)
      }

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

      const validateExamType = (type) => {
        return validTypes.includes(type)
      }

      validTypes.forEach(type => {
        expect(validateExamType(type)).toBe(true)
      })

      invalidTypes.forEach(type => {
        expect(validateExamType(type)).toBe(false)
      })
    })

    it('should validate exam date range', () => {
      const validRanges = [
        { start: '2024-05-01', end: '2024-05-05' },
        { start: '2024-06-10', end: '2024-06-15' },
        { start: '2024-07-01', end: '2024-07-01' } // Same day
      ]

      const invalidRanges = [
        { start: '2024-05-05', end: '2024-05-01' }, // End before start
        { start: 'invalid-date', end: '2024-05-05' }, // Invalid start
        { start: '2024-05-01', end: 'invalid-date' }, // Invalid end
        { start: '', end: '2024-05-05' }, // Empty start
        { start: '2024-05-01', end: '' }, // Empty end
        { start: null, end: '2024-05-05' }, // Null start
        { start: '2024-05-01', end: null } // Null end
      ]

      const validateExamDateRange = (startDate, endDate) => {
        if (!startDate || !endDate) return false
        
        const start = new Date(startDate)
        const end = new Date(endDate)
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return false
        
        return start <= end
      }

      validRanges.forEach(range => {
        expect(validateExamDateRange(range.start, range.end)).toBe(true)
      })

      invalidRanges.forEach(range => {
        expect(validateExamDateRange(range.start, range.end)).toBe(false)
      })
    })
  })

  describe('User Data Validation', () => {
    it('should validate username', () => {
      const validUsernames = ['admin', 'teacher1', 'student2024', 'user_123']
      const invalidUsernames = ['', 'a', 'ab', 'user!', 'user@123', '123user', 'verylongusernamethatexceedslimit']

      const validateUsername = (username) => {
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
        return usernameRegex.test(username)
      }

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

      const validateEmail = (email) => {
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

    it('should validate password strength', () => {
      const validPasswords = [
        'Password123!',
        'SecurePass456',
        'MyPassword789',
        'StrongPass1!'
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

      const validatePassword = (password) => {
        if (password.length < 8 || password.length > 20) return false
        if (!/[a-z]/.test(password)) return false // Lowercase
        if (!/[A-Z]/.test(password)) return false // Uppercase
        if (!/\d/.test(password)) return false // Numbers
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return false // Special chars
        return true
      }

      validPasswords.forEach(password => {
        expect(validatePassword(password)).toBe(true)
      })

      invalidPasswords.forEach(password => {
        expect(validatePassword(password)).toBe(false)
      })
    })
  })

  describe('Business Logic Validation', () => {
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

      const validateStudentClassRelation = (studentId, classId) => {
        const student = students.find(s => s.student_id === studentId)
        const classInfo = classes.find(c => c.class_id === classId)
        
        return student && classInfo && student.class_id === classId
      }

      expect(validateStudentClassRelation('1', '1')).toBe(true)
      expect(validateStudentClassRelation('3', '2')).toBe(true)
      expect(validateStudentClassRelation('1', '2')).toBe(false)
      expect(validateStudentClassRelation('4', '1')).toBe(false)
    })

    it('should prevent duplicate seat numbers in same class', () => {
      const students = [
        { student_id: '1', class_id: '1', seat_number: 1 },
        { student_id: '2', class_id: '1', seat_number: 2 },
        { student_id: '3', class_id: '1', seat_number: 1 }, // Duplicate!
        { student_id: '4', class_id: '2', seat_number: 1 } // Same seat but different class
      ]

      const validateUniqueSeatNumbers = (classId, newSeatNumber, excludeStudentId = null) => {
        const classStudents = students.filter(s => s.class_id === classId)
        const duplicateSeat = classStudents.find(s => 
          s.seat_number === newSeatNumber && s.student_id !== excludeStudentId
        )
        return !duplicateSeat
      }

      expect(validateUniqueSeatNumbers('1', 3)).toBe(true) // New seat
      expect(validateUniqueSeatNumbers('1', 1, '1')).toBe(true) // Same student, same seat
      expect(validateUniqueSeatNumbers('1', 1, '2')).toBe(false) // Different student, same seat
      expect(validateUniqueSeatNumbers('2', 1)).toBe(true) // Different class, same seat
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

      const validateGradeSubjectCompatibility = (grade) => {
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
})
