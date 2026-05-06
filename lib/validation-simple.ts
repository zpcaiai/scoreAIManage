/**
 * 简化的数据验证逻辑 - 修复所有发现的bug
 */

// 1. 修复出生日期验证逻辑
export const validateBirthDate = (dateString: string): boolean => {
  if (!dateString) return false
  
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return false
  
  const now = new Date()
  const currentYear = now.getFullYear()
  const birthYear = date.getFullYear()
  
  // 基本年份检查
  if (birthYear > currentYear) return false
  if (currentYear - birthYear > 30) return false
  
  // 精确计算年龄
  const age = currentYear - birthYear
  const monthDiff = now.getMonth() - date.getMonth()
  const actualAge = monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate()) 
    ? age - 1 
    : age
  
  return actualAge >= 5 && actualAge <= 25
}

// 2. 修复班级名称验证规则
export const validateClassName = (name: string): boolean => {
  if (!name || name.length < 3) return false
  
  // 支持多种格式
  const patterns = [
    /^[一二三]高\(\d{1,2}\)班$/,    // 高一(1)班
    /^[一二三]高\d{1,2}班$/,        // 高一1班
    /^Class \d+$/,                 // Class 1
    /^[一二三]年级\d{1,2}班$/       // 三年级1班
  ]
  
  return patterns.some(pattern => pattern.test(name))
}

// 3. 修复科目代码验证逻辑
export const validateSubjectCode = (code: string): boolean => {
  if (!code) return false
  
  // 2-4位大写字母
  return /^[A-Z]{2,4}$/.test(code)
}

// 4. 修复考试名称验证规则
export const validateExamName = (name: string): boolean => {
  if (!name || name.length < 2 || name.length > 20) return false
  
  // 支持中文、英文、数字、空格、连字符、括号
  return /^[\u4e00-\u9fa5a-zA-Z0-9\s\-\(\)]{2,20}$/.test(name)
}

// 5. 修复用户名验证逻辑
export const validateUsername = (username: string): boolean => {
  if (!username || username.length < 3 || username.length > 20) return false
  
  // 字母、数字、下划线，不能以数字开头
  return /^[a-zA-Z_][a-zA-Z0-9_]{2,19}$/.test(username)
}

// 6. 修复密码强度验证逻辑
export const validatePassword = (password: string): boolean => {
  if (!password || password.length < 8 || password.length > 20) return false
  
  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)
  
  return hasLower && hasUpper && hasNumber && hasSpecial
}

// 7. 修复座位号重复检查逻辑
export const validateUniqueSeatNumbers = (
  students: Array<{student_id: string; class_id: string; seat_number: number}>,
  classId: string,
  newSeatNumber: number,
  excludeStudentId?: string
): boolean => {
  const classStudents = students.filter(s => s.class_id === classId)
  const duplicateSeat = classStudents.find(s => 
    s.seat_number === newSeatNumber && s.student_id !== excludeStudentId
  )
  return !duplicateSeat
}

// 完整数据验证函数
export const validateStudentData = (student: {
  student_name: string
  class_id: string
  seat_number: number
  gender: string
  birth_date: string
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  if (!student.student_name || !/^[\u4e00-\u9fa5]{2,6}$/.test(student.student_name)) {
    errors.push('学生姓名必须是2-6位中文字符')
  }
  
  if (!student.class_id) {
    errors.push('班级ID不能为空')
  }
  
  if (!Number.isInteger(student.seat_number) || student.seat_number < 1 || student.seat_number > 99) {
    errors.push('座位号必须是1-99之间的整数')
  }
  
  if (!['男', '女'].includes(student.gender)) {
    errors.push('性别必须是男或女')
  }
  
  if (!validateBirthDate(student.birth_date)) {
    errors.push('出生日期无效，学生年龄应在5-25岁之间')
  }
  
  return { isValid: errors.length === 0, errors }
}

export const validateGradeData = (grade: {
  student_id: string
  subject_id: string
  exam_id: string
  score: number
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  if (!grade.student_id) errors.push('学生ID不能为空')
  if (!grade.subject_id) errors.push('科目ID不能为空')
  if (!grade.exam_id) errors.push('考试ID不能为空')
  if (!Number.isInteger(grade.score) || grade.score < 0 || grade.score > 100) {
    errors.push('分数必须是0-100之间的整数')
  }
  
  return { isValid: errors.length === 0, errors }
}

export const validateUserData = (user: {
  username: string
  email: string
  password: string
  role: string
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  if (!validateUsername(user.username)) {
    errors.push('用户名必须是3-20位字母、数字、下划线，不能以数字开头')
  }
  
  if (!user.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
    errors.push('邮箱格式无效')
  }
  
  if (!validatePassword(user.password)) {
    errors.push('密码必须包含大小写字母、数字和特殊字符，长度8-20位')
  }
  
  if (!['admin', 'teacher', 'student'].includes(user.role)) {
    errors.push('用户角色无效')
  }
  
  return { isValid: errors.length === 0, errors }
}
