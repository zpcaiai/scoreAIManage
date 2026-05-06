import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-middleware';
import { DataAccessLayer } from '@/lib/database';
import { AuditLogger } from '@/lib/error-handler';
import { UserRole } from '@/lib/auth';

let _da: DataAccessLayer | null = null;
function getDA() { if (!_da) _da = new DataAccessLayer(); return _da; }

// GET /api/grades - Get grades with optional filters
export const GET = apiHandler(
  async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const examId = searchParams.get('examId');
    const studentId = searchParams.get('studentId');
    
    // Build filters
    const filters: any = {};
    if (classId) filters.student_class_id = classId;
    if (examId) filters.exam_id = examId;
    if (studentId) filters.student_id = studentId;
    
    // Students can only view their own grades
    if (user!.role === UserRole.STUDENT) {
      filters.student_id = user!.id;
    }
    
    const grades = await getDA().getGrades(filters);
    
    // If class and exam are specified, calculate rankings
    if (classId && examId && grades.length > 0) {
      const studentGrades = new Map<string, any[]>();
      
      // Group grades by student
      grades.forEach(grade => {
        if (!studentGrades.has(grade.student_id)) {
          studentGrades.set(grade.student_id, []);
        }
        studentGrades.get(grade.student_id)!.push(grade);
      });
      
      // Calculate totals and rankings
      const results: any[] = [];
      
      studentGrades.forEach((studentGradeList, studentId) => {
        const tenSubjectsTotal = studentGradeList.reduce((sum: number, g: any) => sum + g.score, 0);
        const threeSubjectsTotal = studentGradeList
          .filter((g: any) => ['1', '2', '3'].includes(g.subject_id))
          .reduce((sum: number, g: any) => sum + g.score, 0);
        
        results.push({
          ...studentGradeList[0],
          ten_subjects_total: tenSubjectsTotal,
          three_subjects_total: threeSubjectsTotal
        });
      });
      
      // Sort and assign rankings
      results.sort((a, b) => b.ten_subjects_total - a.ten_subjects_total);
      results.forEach((result, index) => {
        result.ten_subjects_rank = index + 1;
      });
      
      results.sort((a, b) => b.three_subjects_total - a.three_subjects_total);
      results.forEach((result, index) => {
        result.three_subjects_rank = index + 1;
      });
      
      return NextResponse.json({
        success: true,
        data: results,
        count: results.length
      });
    }
    
    return NextResponse.json({
      success: true,
      data: grades,
      count: grades.length
    });
  },
  {
    requireAuth: true,
    requiredRole: UserRole.STUDENT
  }
);

// POST /api/grades - Create a new grade
export const POST = apiHandler(
  async (request, { user, validatedData }) => {
    const newGrade = await getDA().createGrade(validatedData);
    
    // Audit logging
    AuditLogger.log(
      'CREATE',
      'grade',
      newGrade.grade_id,
      user!.id,
      { created: newGrade }
    );
    
    return NextResponse.json({
      success: true,
      data: newGrade,
      message: 'Grade created successfully'
    }, { status: 201 });
  },
  {
    requireAuth: true,
    requiredRole: UserRole.TEACHER
  }
);
