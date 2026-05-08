import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-middleware';
import { DataAccessLayer } from '@/lib/database';
import { UserRole } from '@/lib/auth';

let _da: DataAccessLayer | null = null;
function getDA() { if (!_da) _da = new DataAccessLayer(); return _da; }

// GET /api/statistics/class - Get class statistics
export const GET = apiHandler(
  async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    
    if (!examId) {
      throw new Error('Exam ID is required');
    }
    
    // Get all grades for the exam
    const grades = await getDA().getGrades({ exam_id: examId });
    // 1. Group grades by student to calculate totals
    const studentTotals = new Map<string, {
      class_name: string;
      ten_total: number;
      three_total: number;
    }>();

    grades.forEach(g => {
      if (!studentTotals.has(g.student_id)) {
        studentTotals.set(g.student_id, {
          class_name: g.class_name,
          ten_total: 0,
          three_total: 0
        });
      }
      const student = studentTotals.get(g.student_id)!;
      const score = Number(g.score) || 0;
      student.ten_total += score;
      // Assume subject_id 1, 2, 3 or CHN, MATH, ENG are the main 3
      if (['1', '2', '3', 'CHN', 'MATH', 'ENG'].includes(String(g.subject_id))) {
        student.three_total += score;
      }
    });

    // 2. Group student totals by class
    const classGroups = new Map<string, Array<{ ten_total: number; three_total: number }>>();
    
    studentTotals.forEach(student => {
      if (!classGroups.has(student.class_name)) {
        classGroups.set(student.class_name, []);
      }
      classGroups.get(student.class_name)!.push(student);
    });

    // 3. Calculate final stats per class
    const classStats = Array.from(classGroups.entries()).map(([class_name, students]) => {
      const student_count = students.length;
      if (student_count === 0) return null;

      const ten_scores = students.map(s => s.ten_total);
      const three_scores = students.map(s => s.three_total);

      const avg_ten_subjects = ten_scores.reduce((a, b) => a + b, 0) / student_count;
      const avg_three_subjects = three_scores.reduce((a, b) => a + b, 0) / student_count;
      const max_ten_subjects = Math.max(...ten_scores);
      const min_ten_subjects = Math.min(...ten_scores);

      return {
        class_name,
        student_count,
        avg_ten_subjects: parseFloat(avg_ten_subjects.toFixed(2)),
        avg_three_subjects: parseFloat(avg_three_subjects.toFixed(2)),
        max_ten_subjects: parseFloat(max_ten_subjects.toFixed(2)),
        min_ten_subjects: parseFloat(min_ten_subjects.toFixed(2))
      };
    }).filter(Boolean);
    
    return NextResponse.json({
      success: true,
      data: classStats,
      count: classStats.length
    });
  },
  {
    requireAuth: true,
    requiredRole: UserRole.TEACHER
  }
);
