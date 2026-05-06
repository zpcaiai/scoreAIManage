-- 学生成绩管理系统 - 示例数据和常用查询
-- Student Grade Management System - Sample Data and Common Queries

-- 插入示例学生数据
INSERT INTO students (student_number, student_name, class_id, seat_number, gender, birth_date, enrollment_date, phone, parent_name, parent_phone) VALUES
('202401001', '张三', 1, 1, 'male', '2008-05-15', '2024-09-01', '13800138001', '张父', '13800138002'),
('202401002', '李四', 1, 2, 'female', '2008-07-22', '2024-09-01', '13800138003', '李母', '13800138004'),
('202401003', '王五', 1, 3, 'male', '2008-03-10', '2024-09-01', '13800138005', '王父', '13800138006'),
('202401004', '赵六', 1, 4, 'female', '2008-11-28', '2024-09-01', '13800138007', '赵母', '13800138008'),
('202401005', '钱七', 2, 1, 'male', '2008-09-14', '2024-09-01', '13800138009', '钱父', '13800138010');

-- 插入示例成绩数据 (2024年期中考试)
INSERT INTO grades (student_id, subject_id, exam_type, exam_date, score, semester, academic_year, remarks) VALUES
-- 张三的成绩
(1, 1, 'midterm', '2024-11-01', 135.00, '第一学期', '2024-2025', '语文成绩优秀'),
(1, 2, 'midterm', '2024-11-02', 142.00, '第一学期', '2024-2025', '数学成绩优秀'),
(1, 3, 'midterm', '2024-11-03', 128.00, '第一学期', '2024-2025', '外语成绩良好'),
(1, 4, 'midterm', '2024-11-04', 95.00, '第一学期', '2024-2025', '物理成绩优秀'),
(1, 5, 'midterm', '2024-11-04', 88.00, '第一学期', '2024-2025', '化学成绩良好'),
(1, 6, 'midterm', '2024-11-05', 92.00, '第一学期', '2024-2025', '政治成绩优秀'),
(1, 7, 'midterm', '2024-11-05', 85.00, '第一学期', '2024-2025', '历史成绩良好'),
(1, 8, 'midterm', '2024-11-05', 90.00, '第一学期', '2024-2025', '地理成绩优秀'),
(1, 9, 'midterm', '2024-11-05', 87.00, '第一学期', '2024-2025', '生物成绩良好'),
(1, 10, 'midterm', '2024-11-05', 95.00, '第一学期', '2024-2025', '信息科技成绩优秀'),

-- 李四的成绩
(2, 1, 'midterm', '2024-11-01', 125.00, '第一学期', '2024-2025', '语文成绩良好'),
(2, 2, 'midterm', '2024-11-02', 138.00, '第一学期', '2024-2025', '数学成绩优秀'),
(2, 3, 'midterm', '2024-11-03', 135.00, '第一学期', '2024-2025', '外语成绩优秀'),
(2, 4, 'midterm', '2024-11-04', 88.00, '第一学期', '2024-2025', '物理成绩良好'),
(2, 5, 'midterm', '2024-11-04', 92.00, '第一学期', '2024-2025', '化学成绩优秀'),
(2, 6, 'midterm', '2024-11-05', 87.00, '第一学期', '2024-2025', '政治成绩良好'),
(2, 7, 'midterm', '2024-11-05', 90.00, '第一学期', '2024-2025', '历史成绩优秀'),
(2, 8, 'midterm', '2024-11-05', 85.00, '第一学期', '2024-2025', '地理成绩良好'),
(2, 9, 'midterm', '2024-11-05', 88.00, '第一学期', '2024-2025', '生物成绩良好'),
(2, 10, 'midterm', '2024-11-05', 92.00, '第一学期', '2024-2025', '信息科技成绩优秀');

-- 计算并插入成绩汇总数据
INSERT INTO grade_summaries (student_id, semester, academic_year, exam_type, ten_subjects_total, three_subjects_total) VALUES
(1, '第一学期', '2024-2025', 'midterm', 1037.00, 405.00),
(2, '第一学期', '2024-2025', 'midterm', 1032.00, 398.00);

-- ==================== 常用查询示例 ====================

-- 1. 查询学生成绩表 (类似图片中的表格格式)
-- Query student grades table (similar to the format in the image)
SELECT 
    c.class_name AS '班级',
    s.seat_number AS '座号',
    s.student_name AS '姓名',
    COALESCE(ten_total.ten_subjects_total, 0) AS '十门总分',
    COALESCE(ten_total.ten_subjects_rank, 0) AS '十门年次',
    COALESCE(chinese.score, 0) AS '语文成绩',
    COALESCE(math.score, 0) AS '数学成绩',
    COALESCE(english.score, 0) AS '外语成绩',
    COALESCE(three_total.three_subjects_total, 0) AS '三总',
    COALESCE(physics.score, 0) AS '物理成绩',
    COALESCE(chemistry.score, 0) AS '化学成绩',
    COALESCE(politics.score, 0) AS '政治成绩',
    COALESCE(history.score, 0) AS '历史成绩',
    COALESCE(geography.score, 0) AS '地理成绩',
    COALESCE(biology.score, 0) AS '生物成绩',
    COALESCE(it.score, 0) AS '信息科技成绩'
FROM students s
JOIN classes c ON s.class_id = c.class_id
LEFT JOIN grade_summaries ten_total ON s.student_id = ten_total.student_id 
    AND ten_total.semester = '第一学期' 
    AND ten_total.academic_year = '2024-2025'
    AND ten_total.exam_type = 'midterm'
LEFT JOIN grade_summaries three_total ON s.student_id = three_total.student_id 
    AND three_total.semester = '第一学期' 
    AND three_total.academic_year = '2024-2025'
    AND three_total.exam_type = 'midterm'
LEFT JOIN grades chinese ON s.student_id = chinese.student_id 
    AND chinese.subject_id = 1 AND chinese.exam_type = 'midterm'
LEFT JOIN grades math ON s.student_id = math.student_id 
    AND math.subject_id = 2 AND math.exam_type = 'midterm'
LEFT JOIN grades english ON s.student_id = english.student_id 
    AND english.subject_id = 3 AND english.exam_type = 'midterm'
LEFT JOIN grades physics ON s.student_id = physics.student_id 
    AND physics.subject_id = 4 AND physics.exam_type = 'midterm'
LEFT JOIN grades chemistry ON s.student_id = chemistry.student_id 
    AND chemistry.subject_id = 5 AND chemistry.exam_type = 'midterm'
LEFT JOIN grades politics ON s.student_id = politics.student_id 
    AND politics.subject_id = 6 AND politics.exam_type = 'midterm'
LEFT JOIN grades history ON s.student_id = history.student_id 
    AND history.subject_id = 7 AND history.exam_type = 'midterm'
LEFT JOIN grades geography ON s.student_id = geography.student_id 
    AND geography.subject_id = 8 AND geography.exam_type = 'midterm'
LEFT JOIN grades biology ON s.student_id = biology.student_id 
    AND biology.subject_id = 9 AND biology.exam_type = 'midterm'
LEFT JOIN grades it ON s.student_id = it.student_id 
    AND it.subject_id = 10 AND it.exam_type = 'midterm'
WHERE c.class_name = '高一(1)班'
ORDER BY s.seat_number;

-- 2. 计算学生十门总分排名
-- Calculate ranking for ten subjects total score
WITH ten_subjects_scores AS (
    SELECT 
        s.student_id,
        s.student_name,
        c.class_name,
        s.seat_number,
        SUM(g.score) AS total_score,
        ROW_NUMBER() OVER (ORDER BY SUM(g.score) DESC) AS yearly_rank,
        ROW_NUMBER() OVER (PARTITION BY s.class_id ORDER BY SUM(g.score) DESC) AS class_rank
    FROM students s
    JOIN classes c ON s.class_id = c.class_id
    JOIN grades g ON s.student_id = g.student_id
    WHERE g.semester = '第一学期' 
        AND g.academic_year = '2024-2025'
        AND g.exam_type = 'midterm'
    GROUP BY s.student_id, s.student_name, c.class_name, s.seat_number
)
SELECT * FROM ten_subjects_scores ORDER BY yearly_rank;

-- 3. 计算学生三门总分排名 (语文、数学、外语)
-- Calculate ranking for three subjects total score (Chinese, Math, English)
WITH three_subjects_scores AS (
    SELECT 
        s.student_id,
        s.student_name,
        c.class_name,
        s.seat_number,
        SUM(CASE WHEN sub.subject_code IN ('CHN', 'MATH', 'ENG') THEN g.score ELSE 0 END) AS total_score,
        ROW_NUMBER() OVER (ORDER BY SUM(CASE WHEN sub.subject_code IN ('CHN', 'MATH', 'ENG') THEN g.score ELSE 0 END) DESC) AS yearly_rank,
        ROW_NUMBER() OVER (PARTITION BY s.class_id ORDER BY SUM(CASE WHEN sub.subject_code IN ('CHN', 'MATH', 'ENG') THEN g.score ELSE 0 END) DESC) AS class_rank
    FROM students s
    JOIN classes c ON s.class_id = c.class_id
    JOIN grades g ON s.student_id = g.student_id
    JOIN subjects sub ON g.subject_id = sub.subject_id
    WHERE g.semester = '第一学期' 
        AND g.academic_year = '2024-2025'
        AND g.exam_type = 'midterm'
        AND sub.subject_code IN ('CHN', 'MATH', 'ENG')
    GROUP BY s.student_id, s.student_name, c.class_name, s.seat_number
)
SELECT * FROM three_subjects_scores ORDER BY yearly_rank;

-- 4. 查询班级成绩统计
-- Query class grade statistics
SELECT 
    c.class_name,
    COUNT(s.student_id) AS student_count,
    ROUND(AVG(ten_total.ten_subjects_total), 2) AS avg_ten_subjects,
    ROUND(AVG(three_total.three_subjects_total), 2) AS avg_three_subjects,
    MAX(ten_total.ten_subjects_total) AS max_ten_subjects,
    MIN(ten_total.ten_subjects_total) AS min_ten_subjects
FROM classes c
LEFT JOIN students s ON c.class_id = s.class_id
LEFT JOIN grade_summaries ten_total ON s.student_id = ten_total.student_id 
    AND ten_total.semester = '第一学期' 
    AND ten_total.academic_year = '2024-2025'
    AND ten_total.exam_type = 'midterm'
LEFT JOIN grade_summaries three_total ON s.student_id = three_total.student_id 
    AND three_total.semester = '第一学期' 
    AND three_total.academic_year = '2024-2025'
    AND three_total.exam_type = 'midterm'
GROUP BY c.class_id, c.class_name
ORDER BY c.class_name;

-- 5. 查询科目成绩分布
-- Query subject grade distribution
SELECT 
    sub.subject_name,
    COUNT(g.grade_id) AS exam_count,
    ROUND(AVG(g.score), 2) AS avg_score,
    MAX(g.score) AS max_score,
    MIN(g.score) AS min_score,
    ROUND(STDDEV(g.score), 2) AS std_deviation
FROM subjects sub
LEFT JOIN grades g ON sub.subject_id = g.subject_id
    AND g.semester = '第一学期' 
    AND g.academic_year = '2024-2025'
    AND g.exam_type = 'midterm'
GROUP BY sub.subject_id, sub.subject_name
ORDER BY sub.subject_name;

-- 6. 更新成绩汇总表的存储过程
-- Stored procedure to update grade summary table
DELIMITER //
CREATE PROCEDURE UpdateGradeSummaries(
    IN p_semester VARCHAR(20),
    IN p_academic_year VARCHAR(20),
    IN p_exam_type ENUM('midterm', 'final', 'monthly', 'quiz')
)
BEGIN
    -- 更新十门总分和排名
    UPDATE grade_summaries gs
    JOIN (
        SELECT 
            student_id,
            SUM(score) AS ten_total,
            ROW_NUMBER() OVER (ORDER BY SUM(score) DESC) AS yearly_rank,
            ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY SUM(score) DESC) AS class_rank
        FROM grades 
        WHERE semester = p_semester 
            AND academic_year = p_academic_year 
            AND exam_type = p_exam_type
        GROUP BY student_id
    ) calc ON gs.student_id = calc.student_id
    SET gs.ten_subjects_total = calc.ten_total,
        gs.ten_subjects_rank = calc.yearly_rank,
        gs.class_rank_ten_subjects = calc.class_rank,
        gs.calculated_at = CURRENT_TIMESTAMP
    WHERE gs.semester = p_semester 
        AND gs.academic_year = p_academic_year 
        AND gs.exam_type = p_exam_type;
    
    -- 更新三门总分和排名
    UPDATE grade_summaries gs
    JOIN (
        SELECT 
            g.student_id,
            SUM(CASE WHEN sub.subject_code IN ('CHN', 'MATH', 'ENG') THEN g.score ELSE 0 END) AS three_total,
            ROW_NUMBER() OVER (ORDER BY SUM(CASE WHEN sub.subject_code IN ('CHN', 'MATH', 'ENG') THEN g.score ELSE 0 END) DESC) AS yearly_rank,
            ROW_NUMBER() OVER (PARTITION BY s.class_id ORDER BY SUM(CASE WHEN sub.subject_code IN ('CHN', 'MATH', 'ENG') THEN g.score ELSE 0 END) DESC) AS class_rank
        FROM grades g
        JOIN subjects sub ON g.subject_id = sub.subject_id
        JOIN students s ON g.student_id = s.student_id
        WHERE g.semester = p_semester 
            AND g.academic_year = p_academic_year 
            AND g.exam_type = p_exam_type
            AND sub.subject_code IN ('CHN', 'MATH', 'ENG')
        GROUP BY g.student_id, s.class_id
    ) calc ON gs.student_id = calc.student_id
    SET gs.three_subjects_total = calc.three_total,
        gs.three_subjects_rank = calc.yearly_rank,
        gs.class_rank_three_subjects = calc.class_rank,
        gs.calculated_at = CURRENT_TIMESTAMP
    WHERE gs.semester = p_semester 
        AND gs.academic_year = p_academic_year 
        AND gs.exam_type = p_exam_type;
END //
DELIMITER ;

-- 调用存储过程更新成绩汇总
-- CALL UpdateGradeSummaries('第一学期', '2024-2025', 'midterm');
