// Input validation and sanitization utilities

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitized?: any;
}

// Sanitize string input
export function sanitizeString(input: string, maxLength: number = 255): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, maxLength);
}

// Export a simple string validator for login
export function validateString(input: string, maxLength: number = 255): { isValid: boolean; errors: string[]; sanitized?: string } {
  const errors: string[] = [];
  const sanitized = sanitizeString(input, maxLength);
  
  if (!sanitized) {
    errors.push('This field is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}

// Validate Chinese name
export function validateChineseName(name: string): ValidationResult {
  const errors: string[] = [];
  const sanitized = sanitizeString(name, 50);
  
  if (!sanitized) {
    errors.push('姓名不能为空');
  } else if (!/^[\u4e00-\u9fa5]{2,10}$/.test(sanitized)) {
    errors.push('姓名必须是2-10个中文字符');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}

// Validate student number
export function validateStudentNumber(number: string): ValidationResult {
  const errors: string[] = [];
  const sanitized = sanitizeString(number, 20);
  
  if (!sanitized) {
    errors.push('学号不能为空');
  } else if (!/^[0-9]{8,20}$/.test(sanitized)) {
    errors.push('学号必须是8-20位数字');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}

// Validate phone number
export function validatePhoneNumber(phone: string): ValidationResult {
  const errors: string[] = [];
  const sanitized = sanitizeString(phone, 20);
  
  if (sanitized && !/^1[3-9][0-9]{9}$/.test(sanitized)) {
    errors.push('请输入有效的手机号码');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: sanitized || null
  };
}

// Validate class name
export function validateClassName(name: string): ValidationResult {
  const errors: string[] = [];
  const sanitized = sanitizeString(name, 50);
  
  if (!sanitized) {
    errors.push('班级名称不能为空');
  } else if (!/^[\u4e00-\u9fa50-9()（）]+$/.test(sanitized)) {
    errors.push('班级名称只能包含中文、数字和括号');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}

// Validate grade/score
export function validateScore(score: string | number, maxScore: number = 150): ValidationResult {
  const errors: string[] = [];
  const numScore = typeof score === 'string' ? parseFloat(score) : score;
  
  if (isNaN(numScore) || numScore < 0 || numScore > maxScore) {
    errors.push(`分数必须在0-${maxScore}之间`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: numScore
  };
}

// Validate grade level
export function validateGradeLevel(level: string | number): ValidationResult {
  const errors: string[] = [];
  const numLevel = typeof level === 'string' ? parseInt(level) : level;
  
  if (isNaN(numLevel) || numLevel < 1 || numLevel > 12) {
    errors.push('年级必须在1-12之间');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: numLevel
  };
}

// Validate seat number
export function validateSeatNumber(seat: string | number): ValidationResult {
  const errors: string[] = [];
  const numSeat = typeof seat === 'string' ? parseInt(seat) : seat;
  
  if (isNaN(numSeat) || numSeat < 1 || numSeat > 99) {
    errors.push('座号必须在1-99之间');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: numSeat
  };
}

// Validate academic year
export function validateAcademicYear(year: string): ValidationResult {
  const errors: string[] = [];
  const sanitized = sanitizeString(year, 20);
  
  if (!sanitized) {
    errors.push('学年不能为空');
  } else if (!/^[0-9]{4}-[0-9]{4}$/.test(sanitized)) {
    errors.push('学年格式必须为YYYY-YYYY');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}

// Validate date
export function validateDate(date: string): ValidationResult {
  const errors: string[] = [];
  const sanitized = sanitizeString(date, 20);
  
  if (sanitized) {
    const dateObj = new Date(sanitized);
    if (isNaN(dateObj.getTime())) {
      errors.push('请输入有效的日期');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: sanitized || null
  };
}

// Validate gender
export function validateGender(gender: string): ValidationResult {
  const errors: string[] = [];
  const sanitized = sanitizeString(gender, 10);
  
  if (sanitized && !['male', 'female'].includes(sanitized)) {
    errors.push('性别必须是male或female');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: sanitized || null
  };
}

// Comprehensive validation for student data
export function validateStudentData(data: any): ValidationResult {
  const allErrors: string[] = [];
  const sanitized: any = {};
  
  // Validate required fields
  const studentNumberResult = validateStudentNumber(data.student_number);
  if (!studentNumberResult.isValid) {
    allErrors.push(...studentNumberResult.errors);
  } else {
    sanitized.student_number = studentNumberResult.sanitized;
  }
  
  const nameResult = validateChineseName(data.student_name);
  if (!nameResult.isValid) {
    allErrors.push(...nameResult.errors);
  } else {
    sanitized.student_name = nameResult.sanitized;
  }
  
  const classResult = validateClassName(data.class_name);
  if (!classResult.isValid) {
    allErrors.push(...classResult.errors);
  } else {
    sanitized.class_name = classResult.sanitized;
  }
  
  const seatResult = validateSeatNumber(data.seat_number);
  if (!seatResult.isValid) {
    allErrors.push(...seatResult.errors);
  } else {
    sanitized.seat_number = seatResult.sanitized;
  }
  
  const genderResult = validateGender(data.gender);
  if (!genderResult.isValid) {
    allErrors.push(...genderResult.errors);
  } else {
    sanitized.gender = genderResult.sanitized;
  }
  
  const enrollmentResult = validateDate(data.enrollment_date);
  if (!enrollmentResult.isValid) {
    allErrors.push(...enrollmentResult.errors);
  } else {
    sanitized.enrollment_date = enrollmentResult.sanitized;
  }
  
  // Validate optional fields
  const phoneResult = validatePhoneNumber(data.phone);
  if (!phoneResult.isValid) {
    allErrors.push(...phoneResult.errors);
  } else {
    sanitized.phone = phoneResult.sanitized;
  }
  
  const birthResult = validateDate(data.birth_date);
  if (!birthResult.isValid) {
    allErrors.push(...birthResult.errors);
  } else {
    sanitized.birth_date = birthResult.sanitized;
  }
  
  sanitized.parent_name = sanitizeString(data.parent_name, 50);
  sanitized.parent_phone = sanitizeString(data.parent_phone, 20);
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    sanitized
  };
}

// Comprehensive validation for class data
export function validateClassData(data: any): ValidationResult {
  const allErrors: string[] = [];
  const sanitized: any = {};
  
  const nameResult = validateClassName(data.class_name);
  if (!nameResult.isValid) {
    allErrors.push(...nameResult.errors);
  } else {
    sanitized.class_name = nameResult.sanitized;
  }
  
  const gradeResult = validateGradeLevel(data.grade_level);
  if (!gradeResult.isValid) {
    allErrors.push(...gradeResult.errors);
  } else {
    sanitized.grade_level = gradeResult.sanitized;
  }
  
  const yearResult = validateAcademicYear(data.academic_year);
  if (!yearResult.isValid) {
    allErrors.push(...yearResult.errors);
  } else {
    sanitized.academic_year = yearResult.sanitized;
  }
  
  sanitized.class_teacher = sanitizeString(data.class_teacher, 50);
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    sanitized
  };
}
