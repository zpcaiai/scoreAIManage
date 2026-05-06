import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-middleware';
import { validateStudentData } from '@/lib/validation';
import { DataAccessLayer } from '@/lib/database';
import { AuditLogger } from '@/lib/error-handler';
import { UserRole } from '@/lib/auth';

let _da: DataAccessLayer | null = null;
function getDA() { if (!_da) _da = new DataAccessLayer(); return _da; }

// GET /api/students - Get all students (with optional class filter)
export const GET = apiHandler(
  async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    
    const filters = classId ? { class_id: classId } : undefined;
    const students = await getDA().getStudents(filters);
    
    return NextResponse.json({
      success: true,
      data: students,
      count: students.length,
      filters
    });
  },
  {
    requireAuth: true,
    requiredRole: UserRole.STUDENT
  }
);

// POST /api/students - Create a new student
export const POST = apiHandler(
  async (request, { user, validatedData }) => {
    const newStudent = await getDA().createStudent(validatedData);
    
    // Audit logging
    AuditLogger.log(
      'CREATE',
      'student',
      newStudent.student_id,
      user!.id,
      { created: newStudent }
    );
    
    return NextResponse.json({
      success: true,
      data: newStudent,
      message: 'Student created successfully'
    }, { status: 201 });
  },
  {
    requireAuth: true,
    requiredRole: UserRole.TEACHER,
    validator: validateStudentData
  }
);
