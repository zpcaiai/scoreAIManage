import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-middleware';
import { DataAccessLayer } from '@/lib/database';
import { AuditLogger } from '@/lib/error-handler';
import { UserRole } from '@/lib/auth';

let _da: DataAccessLayer | null = null;
function getDA() { if (!_da) _da = new DataAccessLayer(); return _da; }

// POST /api/grades/batch - Batch create grades
export const POST = apiHandler(
  async (request, { user, validatedData }) => {
    const { grades } = validatedData;
    
    // Batch create grades
    const createdGrades = await getDA().createGrades(grades);
    
    // Audit logging
    AuditLogger.log(
      'BATCH_CREATE',
      'grades',
      'batch',
      user!.id,
      { 
        count: grades.length,
        created: createdGrades.map(g => ({ grade_id: g.grade_id, student_id: g.student_id, subject_id: g.subject_id }))
      }
    );
    
    return NextResponse.json({
      success: true,
      data: createdGrades,
      count: createdGrades.length,
      message: `Successfully created ${createdGrades.length} grades`
    }, { status: 201 });
  },
  {
    requireAuth: true,
    requiredRole: UserRole.TEACHER,
    validator: (data: any) => {
      const errors: string[] = [];
      
      if (!data.grades || !Array.isArray(data.grades)) {
        errors.push('Grades must be an array');
      } else {
        data.grades.forEach((grade: any, index: number) => {
          if (!grade.student_id) errors.push(`Grade ${index + 1}: student_id is required`);
          if (!grade.subject_id) errors.push(`Grade ${index + 1}: subject_id is required`);
          if (!grade.exam_id) errors.push(`Grade ${index + 1}: exam_id is required`);
          if (typeof grade.score !== 'number' || grade.score < 0 || grade.score > 150) {
            errors.push(`Grade ${index + 1}: score must be a number between 0 and 150`);
          }
        });
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        sanitized: data
      };
    }
  }
);
