import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-middleware';
import { DataAccessLayer } from '@/lib/database';
import { AuditLogger } from '@/lib/error-handler';
import { UserRole } from '@/lib/auth';

const dataAccess = new DataAccessLayer();

// GET /api/export/grades - Export grades data
export const GET = apiHandler(
  async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const classId = searchParams.get('classId');
    const examId = searchParams.get('examId');
    
    // Build filters
    const filters: any = {};
    if (classId) filters.student_class_id = classId;
    if (examId) filters.exam_id = examId;
    
    // Get data
    const [grades, students, subjects, exams, classes] = await Promise.all([
      dataAccess.getGrades(filters),
      dataAccess.getStudents(),
      dataAccess.getSubjects(),
      dataAccess.getExams(),
      dataAccess.getClasses()
    ]);
    
    // Create lookup maps
    const studentMap = new Map(students.map(s => [s.student_id, s]));
    const subjectMap = new Map(subjects.map(s => [s.subject_id, s]));
    const examMap = new Map(exams.map(e => [e.exam_id, e]));
    const classMap = new Map(classes.map(c => [c.class_id, c]));
    
    // Enrich grades with related data
    const enrichedGrades = grades.map(grade => {
      const student = studentMap.get(grade.student_id);
      const subject = subjectMap.get(grade.subject_id);
      const exam = examMap.get(grade.exam_id);
      const cls = student ? classMap.get(student.class_id) : null;
      
      return {
        ...grade,
        student_name: student?.student_name || '',
        student_number: student?.student_number || '',
        class_name: cls?.class_name || '',
        subject_name: subject?.subject_name || '',
        subject_code: subject?.subject_code || '',
        exam_name: exam?.exam_name || '',
        exam_type: exam?.exam_type || ''
      };
    });
    
    // Audit logging
    AuditLogger.log(
      'EXPORT',
      'grades',
      'bulk',
      user!.id,
      { 
        format,
        filters,
        count: enrichedGrades.length
      }
    );
    
    if (format === 'csv') {
      // Generate CSV
      const headers = [
        '学生姓名', '学号', '班级', '科目', '科目代码', 
        '考试名称', '分数', '学期', '学年'
      ];
      
      const csvRows = [
        headers.join(','),
        ...enrichedGrades.map(grade => [
          grade.student_name,
          grade.student_number,
          grade.class_name,
          grade.subject_name,
          grade.subject_code,
          grade.exam_name,
          grade.score,
          grade.semester,
          grade.academic_year
        ].join(','))
      ];
      
      const csvContent = csvRows.join('\n');
      
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="grades_export_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }
    
    // Default JSON format
    return NextResponse.json({
      success: true,
      data: {
        grades: enrichedGrades,
        metadata: {
          exported_at: new Date().toISOString(),
          exported_by: user!.username,
          total_records: enrichedGrades.length,
          filters
        }
      }
    });
  },
  {
    requireAuth: true,
    requiredRole: UserRole.TEACHER
  }
);
