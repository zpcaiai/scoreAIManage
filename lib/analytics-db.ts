/**
 * Analytics Data Access Layer
 * Wraps PostgreSQL queries for all analytics APIs.
 * Falls back to mock data when DATABASE_URL is absent (dev / static build).
 */
import { Pool } from 'pg';

// ─── connection pool (lazy) ────────────────────────────────────────────────
let _pool: Pool | null = null;
function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 3000,
    });
  }
  return _pool;
}

async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const pool = getPool();
  if (!pool) throw new Error('NO_DB');
  const { rows } = await pool.query(sql, params);
  return rows as T[];
}

// ─── types ──────────────────────────────────────────────────────────────────
export interface DbExam {
  exam_id: number;
  exam_name: string;
  exam_type: string;
  semester: string;
  academic_year: string;
  start_date: string;
}

export interface DbClass {
  class_id: number;
  class_name: string;
  grade_level: number;
}

export interface DbSubject {
  subject_id: number;
  subject_name: string;
  full_score: number;
}

export interface DbGradeRow {
  student_id: number;
  student_name: string;
  class_id: number;
  class_name: string;
  subject_id: number;
  subject_name: string;
  full_score: number;
  score: number;
  exam_id: number;
  exam_name: string;
  exam_type: string;
  semester: string;
  academic_year: string;
}

export interface DbSummaryRow {
  student_id: number;
  student_name: string;
  class_id: number;
  class_name: string;
  exam_type: string;
  semester: string;
  academic_year: string;
  ten_subjects_total: number;
  ten_subjects_rank: number;   // grade rank
  class_rank_ten_subjects: number; // class rank
}

// ─── queries ─────────────────────────────────────────────────────────────────

/** All exams, newest first */
export async function fetchExams(): Promise<DbExam[]> {
  return query<DbExam>(`
    SELECT exam_id, exam_name, exam_type, semester, academic_year,
           start_date::text
    FROM exams
    WHERE is_active = true
    ORDER BY start_date DESC
  `);
}

/** All classes for a grade_level (optional) */
export async function fetchClasses(gradeLevel?: number): Promise<DbClass[]> {
  if (gradeLevel) {
    return query<DbClass>(
      `SELECT class_id, class_name, grade_level FROM classes WHERE grade_level = $1 ORDER BY class_name`,
      [gradeLevel]
    );
  }
  return query<DbClass>(`SELECT class_id, class_name, grade_level FROM classes ORDER BY class_name`);
}

/** All subjects */
export async function fetchSubjects(): Promise<DbSubject[]> {
  return query<DbSubject>(`SELECT subject_id, subject_name, full_score FROM subjects WHERE is_active = true ORDER BY subject_id`);
}

/**
 * Grade rows for a specific exam (identified by exam_type + semester + academic_year).
 * Joins students, classes, subjects.
 */
export async function fetchGradesForExam(
  examType: string,
  semester: string,
  academicYear: string
): Promise<DbGradeRow[]> {
  return query<DbGradeRow>(`
    SELECT
      s.student_id,
      s.student_name,
      s.class_id,
      c.class_name,
      sub.subject_id,
      sub.subject_name,
      sub.full_score,
      g.score,
      e.exam_id,
      e.exam_name,
      g.exam_type,
      g.semester,
      g.academic_year
    FROM grades g
    JOIN students   s   ON g.student_id  = s.student_id
    JOIN classes    c   ON s.class_id    = c.class_id
    JOIN subjects   sub ON g.subject_id  = sub.subject_id
    JOIN exams      e   ON e.exam_type   = g.exam_type
                       AND e.semester     = g.semester
                       AND e.academic_year= g.academic_year
    WHERE g.exam_type    = $1
      AND g.semester     = $2
      AND g.academic_year= $3
      AND s.is_active    = true
    ORDER BY c.class_name, s.student_id, sub.subject_id
  `, [examType, semester, academicYear]);
}

/**
 * Grade summaries (total + rank) for a specific exam.
 * Used by student-track and grade-distribution.
 */
export async function fetchSummariesForExam(
  examType: string,
  semester: string,
  academicYear: string
): Promise<DbSummaryRow[]> {
  return query<DbSummaryRow>(`
    SELECT
      gs.student_id,
      s.student_name,
      s.class_id,
      c.class_name,
      gs.exam_type,
      gs.semester,
      gs.academic_year,
      gs.ten_subjects_total,
      gs.ten_subjects_rank,
      gs.class_rank_ten_subjects
    FROM grade_summaries gs
    JOIN students s ON gs.student_id = s.student_id
    JOIN classes  c ON s.class_id    = c.class_id
    WHERE gs.exam_type     = $1
      AND gs.semester      = $2
      AND gs.academic_year = $3
      AND s.is_active      = true
    ORDER BY gs.ten_subjects_rank ASC
  `, [examType, semester, academicYear]);
}

/**
 * All summaries for a single class across multiple exams — for trend analysis.
 */
export async function fetchClassTrend(classId: number, limit = 10): Promise<DbSummaryRow[]> {
  return query<DbSummaryRow>(`
    SELECT
      gs.student_id,
      s.student_name,
      s.class_id,
      c.class_name,
      gs.exam_type,
      gs.semester,
      gs.academic_year,
      gs.ten_subjects_total,
      gs.ten_subjects_rank,
      gs.class_rank_ten_subjects,
      e.start_date
    FROM grade_summaries gs
    JOIN students s ON gs.student_id = s.student_id
    JOIN classes  c ON s.class_id    = c.class_id
    JOIN exams    e ON e.exam_type   = gs.exam_type
                   AND e.semester    = gs.semester
                   AND e.academic_year = gs.academic_year
    WHERE s.class_id = $1
      AND s.is_active = true
    ORDER BY e.start_date ASC
    LIMIT $2
  `, [classId, limit * 45]); // limit exams * ~45 students per class
}

/**
 * Per-subject scores for a class in one exam — for subject segment analysis.
 */
export async function fetchSubjectScoresForClass(
  classId: number,
  examType: string,
  semester: string,
  academicYear: string
): Promise<DbGradeRow[]> {
  return query<DbGradeRow>(`
    SELECT
      s.student_id,
      s.student_name,
      s.class_id,
      c.class_name,
      sub.subject_id,
      sub.subject_name,
      sub.full_score,
      g.score
    FROM grades g
    JOIN students  s   ON g.student_id  = s.student_id
    JOIN classes   c   ON s.class_id    = c.class_id
    JOIN subjects  sub ON g.subject_id  = sub.subject_id
    WHERE s.class_id    = $1
      AND g.exam_type   = $2
      AND g.semester    = $3
      AND g.academic_year = $4
      AND s.is_active   = true
    ORDER BY sub.subject_id, s.student_id
  `, [classId, examType, semester, academicYear]);
}
