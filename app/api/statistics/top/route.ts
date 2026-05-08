import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-middleware';
import { DataAccessLayer } from '@/lib/database';
import { UserRole } from '@/lib/auth';

let _da: DataAccessLayer | null = null;
function getDA() { if (!_da) _da = new DataAccessLayer(); return _da; }

export const GET = apiHandler(
  async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    
    if (!examId) {
      throw new Error('Exam ID is required');
    }
    
    const grades = await getDA().getGrades({ exam_id: examId });
    
    // Group grades by student
    const studentTotals = new Map<string, {
      student_id: string;
      student_name: string;
      class_name: string;
      ten_subjects_total: number;
      three_subjects_total: number;
    }>();
    
    grades.forEach(g => {
      if (!studentTotals.has(g.student_id)) {
        studentTotals.set(g.student_id, {
          student_id: g.student_id,
          student_name: g.student_name,
          class_name: g.class_name,
          ten_subjects_total: 0,
          three_subjects_total: 0
        });
      }
      
      const student = studentTotals.get(g.student_id)!;
      const score = Number(g.score) || 0;
      
      student.ten_subjects_total += score;
      
      // Assume subject_id 1, 2, 3 or CHN, MATH, ENG are the main 3
      if (['1', '2', '3', 'CHN', 'MATH', 'ENG'].includes(String(g.subject_id))) {
        student.three_subjects_total += score;
      }
    });
    
    const studentScores = Array.from(studentTotals.values());
    
    // 按十门总分排序
    studentScores.sort((a, b) => b.ten_subjects_total - a.ten_subjects_total);
    
    // 添加排名
    const rankedStudents = studentScores.map((student, index) => ({
      ...student,
      ten_subjects_rank: index + 1
    }));
    
    // 返回前10名
    const topStudents = rankedStudents.slice(0, 10);
    
    return NextResponse.json({
      success: true,
      data: topStudents,
      count: topStudents.length
    });
  },
  {
    requireAuth: true,
    requiredRole: UserRole.TEACHER
  }
);
