-- 学生成绩管理系统数据库设计
-- Student Grade Management System Database Schema

-- 1. 班级表 (Classes Table)
CREATE TABLE classes (
    class_id INT PRIMARY KEY AUTO_INCREMENT,
    class_name VARCHAR(50) NOT NULL UNIQUE,
    grade_level INT NOT NULL COMMENT '年级',
    academic_year VARCHAR(20) NOT NULL COMMENT '学年',
    class_teacher VARCHAR(50) COMMENT '班主任',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. 科目表 (Subjects Table)
CREATE TABLE subjects (
    subject_id INT PRIMARY KEY AUTO_INCREMENT,
    subject_code VARCHAR(10) NOT NULL UNIQUE,
    subject_name VARCHAR(50) NOT NULL,
    subject_type ENUM('core', 'elective') DEFAULT 'core',
    full_score DECIMAL(5,2) DEFAULT 100.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 学生表 (Students Table)
CREATE TABLE students (
    student_id INT PRIMARY KEY AUTO_INCREMENT,
    student_number VARCHAR(20) NOT NULL UNIQUE,
    student_name VARCHAR(50) NOT NULL,
    class_id INT NOT NULL,
    seat_number INT NOT NULL,
    gender ENUM('male', 'female') NOT NULL,
    birth_date DATE,
    enrollment_date DATE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    parent_name VARCHAR(50),
    parent_phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE RESTRICT,
    UNIQUE KEY unique_class_seat (class_id, seat_number),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. 成绩表 (Grades Table)
CREATE TABLE grades (
    grade_id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    exam_type ENUM('midterm', 'final', 'monthly', 'quiz') NOT NULL,
    exam_date DATE NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    semester VARCHAR(20) NOT NULL COMMENT '学期',
    academic_year VARCHAR(20) NOT NULL COMMENT '学年',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE RESTRICT,
    UNIQUE KEY unique_student_subject_exam (student_id, subject_id, exam_type, semester, academic_year)
);

-- 5. 成绩汇总表 (Grade Summary Table) - 用于存储计算后的总分和排名
CREATE TABLE grade_summaries (
    summary_id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    semester VARCHAR(20) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    exam_type ENUM('midterm', 'final', 'monthly', 'quiz') NOT NULL,
    
    -- 十门总分 (Total score for ten subjects)
    ten_subjects_total DECIMAL(6,2) DEFAULT 0.00,
    ten_subjects_rank INT DEFAULT 0 COMMENT '十门年次排名',
    
    -- 三门总分 (Chinese, Math, Foreign Language)
    three_subjects_total DECIMAL(6,2) DEFAULT 0.00,
    three_subjects_rank INT DEFAULT 0 COMMENT '三门年次排名',
    
    -- 班级排名
    class_rank_ten_subjects INT DEFAULT 0,
    class_rank_three_subjects INT DEFAULT 0,
    
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_summary (student_id, semester, academic_year, exam_type)
);

-- 6. 考试信息表 (Exam Information Table)
CREATE TABLE exams (
    exam_id INT PRIMARY KEY AUTO_INCREMENT,
    exam_name VARCHAR(100) NOT NULL,
    exam_type ENUM('midterm', 'final', 'monthly', 'quiz') NOT NULL,
    semester VARCHAR(20) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== 索引设计 ====================
-- Index Design
-- 原则：覆盖高频查询的 WHERE / JOIN / ORDER BY 字段，避免全表扫描

-- ---- classes 表 ----
-- 按年级+学年筛选班级列表
CREATE INDEX idx_classes_grade_year ON classes(grade_level, academic_year);

-- ---- subjects 表 ----
-- 按激活状态过滤科目（subject_code 已有 UNIQUE 索引）
CREATE INDEX idx_subjects_active ON subjects(is_active);

-- ---- students 表 ----
-- JOIN classes 时用到（外键查找）
CREATE INDEX idx_students_class ON students(class_id);
-- 按姓名搜索学生
CREATE INDEX idx_students_name ON students(student_name);
-- 按激活状态+班级过滤在校学生
CREATE INDEX idx_students_active_class ON students(is_active, class_id);

-- ---- grades 表 ----
-- 单学生成绩查询（最常用，覆盖 JOIN grades ON student_id）
CREATE INDEX idx_grades_student ON grades(student_id);
-- 单科目成绩统计
CREATE INDEX idx_grades_subject ON grades(subject_id);
-- 按考试维度聚合（排名计算：semester + academic_year + exam_type）
CREATE INDEX idx_grades_exam_dim ON grades(exam_type, semester, academic_year);
-- 成绩表格查询核心：10 次 LEFT JOIN 均带 (student_id, subject_id, exam_type)
-- 复合覆盖索引，避免回表
CREATE INDEX idx_grades_stu_sub_exam ON grades(student_id, subject_id, exam_type);
-- 按考试日期范围查询
CREATE INDEX idx_grades_exam_date ON grades(exam_date);

-- ---- grade_summaries 表 ----
-- 成绩汇总表高频 JOIN 条件：student_id + semester + academic_year + exam_type
-- （已有 UNIQUE KEY 覆盖，但显式声明提升可读性与优化器提示）
CREATE INDEX idx_summaries_student ON grade_summaries(student_id);
-- 按学期+学年+考试类型查全年级汇总
CREATE INDEX idx_summaries_exam_dim ON grade_summaries(semester, academic_year, exam_type);
-- 十门年次排名排序（ORDER BY ten_subjects_rank）
CREATE INDEX idx_summaries_ten_rank ON grade_summaries(ten_subjects_rank);
-- 三门年次排名排序
CREATE INDEX idx_summaries_three_rank ON grade_summaries(three_subjects_rank);
-- 班级排名查询
CREATE INDEX idx_summaries_class_ten_rank ON grade_summaries(class_rank_ten_subjects);
CREATE INDEX idx_summaries_class_three_rank ON grade_summaries(class_rank_three_subjects);

-- ---- exams 表 ----
-- 按学期+学年筛选考试
CREATE INDEX idx_exams_semester ON exams(semester, academic_year);
-- 按激活状态+考试类型查询当前可用考试
CREATE INDEX idx_exams_active_type ON exams(is_active, exam_type);

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
