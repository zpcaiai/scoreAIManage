# 学生成绩管理系统数据库设计文档
# Student Grade Management System Database Documentation

## 概述 (Overview)

本数据库设计用于存储和管理学生成绩信息，支持多学年、多学期、多科目的成绩管理和统计分析。

This database design is used to store and manage student grade information, supporting multi-academic year, multi-semester, and multi-subject grade management and statistical analysis.

## 数据库架构 (Database Architecture)

### 核心表结构 (Core Table Structure)

#### 1. 班级表 (classes)
存储班级基本信息。

| 字段名 | 类型 | 约束 | 描述 |
|--------|------|------|------|
| class_id | INT | PRIMARY KEY, AUTO_INCREMENT | 班级ID |
| class_name | VARCHAR(50) | NOT NULL, UNIQUE | 班级名称 |
| grade_level | INT | NOT NULL | 年级 |
| academic_year | VARCHAR(20) | NOT NULL | 学年 |
| class_teacher | VARCHAR(50) | | 班主任 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

#### 2. 科目表 (subjects)
存储科目信息。

| 字段名 | 类型 | 约束 | 描述 |
|--------|------|------|------|
| subject_id | INT | PRIMARY KEY, AUTO_INCREMENT | 科目ID |
| subject_code | VARCHAR(10) | NOT NULL, UNIQUE | 科目代码 |
| subject_name | VARCHAR(50) | NOT NULL | 科目名称 |
| subject_type | ENUM('core', 'elective') | DEFAULT 'core' | 科目类型 |
| full_score | DECIMAL(5,2) | DEFAULT 100.00 | 满分 |
| is_active | BOOLEAN | DEFAULT TRUE | 是否启用 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

#### 3. 学生表 (students)
存储学生基本信息。

| 字段名 | 类型 | 约束 | 描述 |
|--------|------|------|------|
| student_id | INT | PRIMARY KEY, AUTO_INCREMENT | 学生ID |
| student_number | VARCHAR(20) | NOT NULL, UNIQUE | 学号 |
| student_name | VARCHAR(50) | NOT NULL | 学生姓名 |
| class_id | INT | NOT NULL, FOREIGN KEY | 班级ID |
| seat_number | INT | NOT NULL | 座号 |
| gender | ENUM('male', 'female') | NOT NULL | 性别 |
| birth_date | DATE | | 出生日期 |
| enrollment_date | DATE | NOT NULL | 入学日期 |
| phone | VARCHAR(20) | | 联系电话 |
| address | TEXT | | 家庭地址 |
| parent_name | VARCHAR(50) | | 家长姓名 |
| parent_phone | VARCHAR(20) | | 家长电话 |
| is_active | BOOLEAN | DEFAULT TRUE | 是否在读 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

#### 4. 成绩表 (grades)
存储学生各科目成绩。

| 字段名 | 类型 | 约束 | 描述 |
|--------|------|------|------|
| grade_id | INT | PRIMARY KEY, AUTO_INCREMENT | 成绩ID |
| student_id | INT | NOT NULL, FOREIGN KEY | 学生ID |
| subject_id | INT | NOT NULL, FOREIGN KEY | 科目ID |
| exam_type | ENUM('midterm', 'final', 'monthly', 'quiz') | NOT NULL | 考试类型 |
| exam_date | DATE | NOT NULL | 考试日期 |
| score | DECIMAL(5,2) | NOT NULL | 成绩 |
| semester | VARCHAR(20) | NOT NULL | 学期 |
| academic_year | VARCHAR(20) | NOT NULL | 学年 |
| remarks | TEXT | | 备注 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

#### 5. 成绩汇总表 (grade_summaries)
存储计算后的总分和排名信息。

| 字段名 | 类型 | 约束 | 描述 |
|--------|------|------|------|
| summary_id | INT | PRIMARY KEY, AUTO_INCREMENT | 汇总ID |
| student_id | INT | NOT NULL, FOREIGN KEY | 学生ID |
| semester | VARCHAR(20) | NOT NULL | 学期 |
| academic_year | VARCHAR(20) | NOT NULL | 学年 |
| exam_type | ENUM('midterm', 'final', 'monthly', 'quiz') | NOT NULL | 考试类型 |
| ten_subjects_total | DECIMAL(6,2) | DEFAULT 0.00 | 十门总分 |
| ten_subjects_rank | INT | DEFAULT 0 | 十门年次排名 |
| three_subjects_total | DECIMAL(6,2) | DEFAULT 0.00 | 三门总分 |
| three_subjects_rank | INT | DEFAULT 0 | 三门年次排名 |
| class_rank_ten_subjects | INT | DEFAULT 0 | 班级十门排名 |
| class_rank_three_subjects | INT | DEFAULT 0 | 班级三门排名 |
| calculated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 计算时间 |

#### 6. 考试信息表 (exams)
存储考试基本信息。

| 字段名 | 类型 | 约束 | 描述 |
|--------|------|------|------|
| exam_id | INT | PRIMARY KEY, AUTO_INCREMENT | 考试ID |
| exam_name | VARCHAR(100) | NOT NULL | 考试名称 |
| exam_type | ENUM('midterm', 'final', 'monthly', 'quiz') | NOT NULL | 考试类型 |
| semester | VARCHAR(20) | NOT NULL | 学期 |
| academic_year | VARCHAR(20) | NOT NULL | 学年 |
| start_date | DATE | NOT NULL | 开始日期 |
| end_date | DATE | NOT NULL | 结束日期 |
| is_active | BOOLEAN | DEFAULT TRUE | 是否启用 |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

## 关系图 (Relationship Diagram)

```
classes (1) ---------> (N) students
students (1) ---------> (N) grades
subjects (1) --------> (N) grades
students (1) ---------> (N) grade_summaries
exams (1) -----------> (N) grades
```

## 索引设计 (Index Design)

### 主要索引 (Primary Indexes)
- `PRIMARY KEY` on all tables for unique identification
- `UNIQUE KEY` on students (class_id, seat_number) for class seating
- `UNIQUE KEY` on grades (student_id, subject_id, exam_type, semester, academic_year)

### 性能索引 (Performance Indexes)
- `idx_students_class` on students(class_id)
- `idx_grades_student` on grades(student_id)
- `idx_grades_subject` on grades(subject_id)
- `idx_grades_exam` on grades(exam_type, semester, academic_year)
- `idx_summaries_student` on grade_summaries(student_id)
- `idx_summaries_rank` on grade_summaries(ten_subjects_rank)
- `idx_exams_semester` on exams(semester, academic_year)

## 数据完整性 (Data Integrity)

### 外键约束 (Foreign Key Constraints)
- `students.class_id` → `classes.class_id` (RESTRICT)
- `grades.student_id` → `students.student_id` (CASCADE)
- `grades.subject_id` → `subjects.subject_id` (RESTRICT)
- `grade_summaries.student_id` → `students.student_id` (CASCADE)

### 检查约束 (Check Constraints)
- 成绩范围：0 ≤ score ≤ full_score
- 座号在班级内唯一
- 学期格式验证
- 学年格式验证

## 常用查询 (Common Queries)

### 1. 学生成绩表查询
生成类似图片中的成绩表格格式。

### 2. 排名计算
- 十门科目总分排名
- 三门科目（语数英）总分排名
- 班级内排名
- 年级内排名

### 3. 统计分析
- 班级平均分统计
- 科目成绩分布
- 成绩趋势分析

## 性能优化 (Performance Optimization)

### 查询优化
1. 使用适当的索引
2. 避免全表扫描
3. 使用存储过程进行复杂计算
4. 定期更新汇总表

### 数据分区
- 按学年分区历史成绩数据
- 按科目分区大型成绩表

## 扩展性设计 (Scalability Design)

### 水平扩展
- 支持多学年数据
- 支持多校区部署
- 支持分布式查询

### 功能扩展
- 支持新增科目
- 支持不同评分标准
- 支持成绩分析报表
- 支持数据导入导出

## 安全性 (Security)

### 数据保护
- 敏感信息加密存储
- 访问权限控制
- 操作日志记录

### 备份策略
- 定期全量备份
- 增量备份策略
- 灾难恢复方案

## 使用说明 (Usage Instructions)

### 初始化数据库
1. 执行 `database_schema.sql` 创建表结构
2. 执行 `sample_data_queries.sql` 插入示例数据
3. 根据需要调整科目和班级信息

### 维护操作
1. 定期调用存储过程更新成绩汇总
2. 定期备份重要数据
3. 监控数据库性能

### 扩展开发
1. 根据业务需求添加新表
2. 创建自定义视图简化查询
3. 开发报表生成功能
