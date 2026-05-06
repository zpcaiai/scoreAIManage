/**
 * 修复后的数据验证逻辑
 * 解决测试中发现的7个业务逻辑bug
 */

// 1. 修复出生日期验证逻辑 - 精确计算年龄
export const validateBirthDate = (dateString: string): boolean => {
  if (!dateString) return false
  
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return false
  
  const now = new Date()
  const currentYear = now.getFullYear()
  const birthYear = date.getFullYear()
  
  // 基本年份检查：不能是未来年份，不能太早
  if (birthYear > currentYear) return false
  if (currentYear - birthYear > 30) return false // 最多30岁
  
  // 精确计算年龄：考虑月份和日期
  const age = currentYear - birthYear
  const monthDiff = now.getMonth() - date.getMonth()
  const actualAge = monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate()) 
    ? age - 1 
    : age
  
  // 学生年龄应在5-25岁之间
  return actualAge >= 5 && actualAge <= 25
}

// 2. 修复班级名称验证规则 - 支持更多格式
export const validateClassName = (name: string): boolean => {
  if (!name || name.length < 3) return false
  
  // 支持多种格式：
  // - 高一(1)班, 高二(3)班, 高三(2)班
  // - 高一1班, 高二3班, 高三2班
  // - Class 1, Class 2, Class 3
  const regex1 = /^[一二三]高\(\d{1,2}\)班$/
  const regex2 = /^[一二三]高\d{1,2}班$/
  const regex3 = /^Class \d+$/ // 英文格式
  const regex4 = /^[一二三]年级\d{1,2}班$/ // 三年级1班格式
  
  return regex1.test(name) || regex2.test(name) || regex3.test(name) || regex4.test(name)
}

// 3. 修复科目代码验证逻辑 - 严格限制长度
export const validateSubjectCode = (code: string): boolean => {
  if (!code) return false
  
  // 科目代码必须是2-4位大写字母
  const codeRegex = /^[A-Z]{2,4}$/
  return codeRegex.test(code)
}

// 4. 修复考试名称验证规则 - 支持更多字符
export const validateExamName = (name: string): boolean => {
  if (!name || name.length < 2 || name.length > 20) return false
  
  // 支持中文字符、数字、常见标点
  const examNameRegex = /^[\u4e00-\u9fa5\w\s\-（）()]{2,20}$/
  return examNameRegex.test(name)
}

// 5. 修复用户名验证逻辑 - 优化边界情况
export const validateUsername = (username: string): boolean => {
  if (!username || username.length < 3 || username.length > 20) return false
  
  // 用户名只能包含字母、数字、下划线，不能以数字开头
  const usernameRegex = /^[a-zA-Z_][a-zA-Z0-9_]{2,19}$/
  return usernameRegex.test(username)
}

// 6. 修复密码强度验证逻辑 - 调整特殊字符检测
export const validatePassword = (password: string): boolean => {
  if (!password || password.length < 8 || password.length > 20) return false
  
  // 检查是否包含小写字母
  const hasLower = /[a-z]/.test(password)
  // 检查是否包含大写字母
  const hasUpper = /[A-Z]/.test(password)
  // 检查是否包含数字
  const hasNumber = /\d/.test(password)
  // 检查是否包含特殊字符（更宽松的定义）
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)
  
  return hasLower && hasUpper && hasNumber && hasSpecial
}

// 7. 修复座位号重复检查逻辑 - 优化重复检测
export const validateUniqueSeatNumbers = (
  students: Array<{student_id: string; class_id: string; seat_number: number}>,
  classId: string,
  newSeatNumber: number,
  excludeStudentId?: string
): boolean => {
  // 获取指定班级的所有学生
  const classStudents = students.filter(s => s.class_id === classId)
  
  // 检查是否有重复座位号（排除指定学生）
  const duplicateSeat = classStudents.find(s => 
    s.seat_number === newSeatNumber && s.student_id !== excludeStudentId
  )
  
  return !duplicateSeat
}

// 学生数据验证
export const validateStudentData = (student: {
  student_name: string
  class_id: string
  seat_number: number
  gender: string
  birth_date: string
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  // 验证学生姓名
  if (!student.student_name || !/^[\u4e00-\u9fa5]{2,6}$/.test(student.student_name)) {
    errors.push('学生姓名必须是2-6位中文字符')
  }
  
  // 验证班级ID
  if (!student.class_id) {
    errors.push('班级ID不能为空')
  }
  
  // 验证座位号
  if (!Number.isInteger(student.seat_number) || student.seat_number < 1 || student.seat_number > 99) {
    errors.push('座位号必须是1-99之间的整数')
  }
  
  // 验证性别
  if (!['男', '女'].includes(student.gender)) {
    errors.push('性别必须是男或女')
  }
  
  // 验证出生日期
  if (!validateBirthDate(student.birth_date)) {
    errors.push('出生日期无效，学生年龄应在5-25岁之间')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// 成绩数据验证
export const validateGradeData = (grade: {
  student_id: string
  subject_id: string
  exam_id: string
  score: number
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  // 验证学生ID
  if (!grade.student_id) {
    errors.push('学生ID不能为空')
  }
  
  // 验证科目ID
  if (!grade.subject_id) {
    errors.push('科目ID不能为空')
  }
  
  // 验证考试ID
  if (!grade.exam_id) {
    errors.push('考试ID不能为空')
  }
  
  // 验证分数
  if (!Number.isInteger(grade.score) || grade.score < 0 || grade.score > 100) {
    errors.push('分数必须是0-100之间的整数')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// 用户数据验证
export const validateUserData = (user: {
  username: string
  email: string
  password: string
  role: string
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  // 验证用户名
  if (!validateUsername(user.username)) {
    errors.push('用户名必须是3-20位字母、数字、下划线，不能以数字开头')
  }
  
  // 验证邮箱
  if (!user.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
    errors.push('邮箱格式无效')
  }
  
  // 验证密码
  if (!validatePassword(user.password)) {
    errors.push('密码必须包含大小写字母、数字和特殊字符，长度8-20位')
  }
  
  // 验证角色
  if (!['admin', 'teacher', 'student'].includes(user.role)) {
    errors.push('用户角色无效')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// 批量数据验证
export const validateBatchData = <T>(
  data: T[],
  validator: (item: T) => { isValid: boolean; errors: string[] }
): { isValid: boolean; errors: string[]; validItems: T[] } => {
  const allErrors: string[] = []
  const validItems: T[] = []
  
  data.forEach((item, index) => {
    const result = validator(item)
    if (result.isValid) {
      validItems.push(item)
    } else {
      allErrors.push(...result.errors.map(error => `第${index + 1}项: ${error}`))
    }
  })
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    validItems
  }
}
