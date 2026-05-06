-- 学生成绩管理系统PostgreSQL数据库设计
-- Student Grade Management System PostgreSQL Database Schema

-- 1. 班级表 (Classes Table)
CREATE TABLE classes (
    class_id SERIAL PRIMARY KEY,
    class_name VARCHAR(50) NOT NULL UNIQUE,
    grade_level INTEGER NOT NULL, -- 年级
    academic_year VARCHAR(20) NOT NULL, -- 学年
    class_teacher VARCHAR(50), -- 班主任
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 科目表 (Subjects Table)
CREATE TABLE subjects (
    subject_id SERIAL PRIMARY KEY,
    subject_code VARCHAR(10) NOT NULL UNIQUE,
    subject_name VARCHAR(50) NOT NULL,
    subject_type VARCHAR(20) DEFAULT 'core' CHECK (subject_type IN ('core', 'elective')),
    full_score DECIMAL(5,2) DEFAULT 100.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 学生表 (Students Table)
CREATE TABLE students (
    student_id SERIAL PRIMARY KEY,
    student_number VARCHAR(20) NOT NULL UNIQUE,
    student_name VARCHAR(50) NOT NULL,
    class_id INTEGER NOT NULL,
    seat_number INTEGER NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female', '男', '女')),
    birth_date DATE,
    enrollment_date DATE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    parent_name VARCHAR(50),
    parent_phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE RESTRICT,
    CONSTRAINT unique_class_seat UNIQUE (class_id, seat_number),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 成绩表 (Grades Table)
CREATE TABLE grades (
    grade_id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    exam_type VARCHAR(20) NOT NULL CHECK (exam_type IN ('midterm', 'final', 'monthly', 'quiz')),
    exam_date DATE NOT NULL,
    score DECIMAL(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
    semester VARCHAR(20) NOT NULL, -- 学期
    academic_year VARCHAR(20) NOT NULL, -- 学年
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE RESTRICT,
    CONSTRAINT unique_student_subject_exam UNIQUE (student_id, subject_id, exam_type, semester, academic_year)
);

-- 5. 成绩汇总表 (Grade Summary Table) - 用于存储计算后的总分和排名
CREATE TABLE grade_summaries (
    summary_id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    semester VARCHAR(20) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    exam_type VARCHAR(20) NOT NULL CHECK (exam_type IN ('midterm', 'final', 'monthly', 'quiz')),
    
    -- 十门总分 (Total score for ten subjects)
    ten_subjects_total DECIMAL(6,2) DEFAULT 0.00,
    ten_subjects_rank INTEGER DEFAULT 0, -- 十门年次排名
    
    -- 三门总分 (Chinese, Math, Foreign Language)
    three_subjects_total DECIMAL(6,2) DEFAULT 0.00,
    three_subjects_rank INTEGER DEFAULT 0, -- 三门年次排名
    
    -- 班级排名
    class_rank_ten_subjects INTEGER DEFAULT 0,
    class_rank_three_subjects INTEGER DEFAULT 0,
    
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    CONSTRAINT unique_student_summary UNIQUE (student_id, semester, academic_year, exam_type)
);

-- 6. 考试信息表 (Exam Information Table)
CREATE TABLE exams (
    exam_id SERIAL PRIMARY KEY,
    exam_name VARCHAR(100) NOT NULL,
    exam_type VARCHAR(20) NOT NULL CHECK (exam_type IN ('midterm', 'final', 'monthly', 'quiz')),
    semester VARCHAR(20) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. 用户表 (Users Table) - 用于身份认证
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'teacher', 'student')),
    full_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. 用户会话表 (User Sessions Table) - 用于会话管理
CREATE TABLE user_sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 创建索引以提高查询性能
CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_grades_student ON grades(student_id);
CREATE INDEX idx_grades_subject ON grades(subject_id);
CREATE INDEX idx_grades_exam ON grades(exam_type, semester, academic_year);
CREATE INDEX idx_summaries_student ON grade_summaries(student_id);
CREATE INDEX idx_summaries_rank ON grade_summaries(ten_subjects_rank);
CREATE INDEX idx_exams_semester ON exams(semester, academic_year);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(token_hash);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表创建更新时间触发器
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON grades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入基础数据
-- Insert basic subjects data
INSERT INTO subjects (subject_code, subject_name, subject_type, full_score) VALUES
('CHN', '语文', 'core', 150.00),
('MATH', '数学', 'core', 150.00),
('ENG', '外语', 'core', 150.00),
('PHY', '物理', 'core', 100.00),
('CHE', '化学', 'core', 100.00),
('POL', '政治', 'core', 100.00),
('HIS', '历史', 'core', 100.00),
('GEO', '地理', 'core', 100.00),
('BIO', '生物', 'core', 100.00),
('IT', '信息科技', 'core', 100.00);

-- Insert sample class data
INSERT INTO classes (class_name, grade_level, academic_year, class_teacher) VALUES
('高一(1)班', 1, '2024-2025', '张老师'),
('高一(2)班', 1, '2024-2025', '李老师'),
('高二(1)班', 2, '2024-2025', '王老师'),
('高二(2)班', 2, '2024-2025', '刘老师');

-- Insert sample exam data
INSERT INTO exams (exam_name, exam_type, semester, academic_year, start_date, end_date) VALUES
('2024年期中考试', 'midterm', '第一学期', '2024-2025', '2024-11-01', '2024-11-05'),
('2024年期末考试', 'final', '第一学期', '2024-2025', '2025-01-15', '2025-01-20'),
('2025年期中考试', 'midterm', '第二学期', '2024-2025', '2025-04-15', '2025-04-20');

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, role, full_name) VALUES
('admin', 'admin@school.edu.cn', '$2b$10$rQZ8ZqGQJqKqQqQqQqQqQu', 'admin', '系统管理员');
