import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-middleware';
import { validateStudentData } from '@/lib/validation';
import { DataAccessLayer } from '@/lib/database';
import { AuditLogger, createNotFoundError } from '@/lib/error-handler';
import { UserRole } from '@/lib/auth';

const dataAccess = new DataAccessLayer();

// GET /api/students/[studentId] - Get a specific student
export const GET = apiHandler(
  async (request, { user, params }) => {
    const studentId = params.studentId;
    const student = await dataAccess.getStudentById(studentId);
    
    if (!student) {
      throw createNotFoundError('Student', studentId);
    }
    
    // Students can only view their own data
    if (user!.role === UserRole.STUDENT && user!.id !== studentId) {
      throw new Error('Access denied: You can only view your own data');
    }
    
    return NextResponse.json({
      success: true,
      data: student
    });
  },
  {
    requireAuth: true,
    requiredRole: UserRole.STUDENT
  }
);

// PUT /api/students/[studentId] - Update a student
export const PUT = apiHandler(
  async (request, { user, validatedData, params }) => {
    const studentId = params.studentId;
    const existingStudent = await dataAccess.getStudentById(studentId);
    
    if (!existingStudent) {
      throw createNotFoundError('Student', studentId);
    }
    
    // Students can only update their own data (limited fields)
    if (user!.role === UserRole.STUDENT && user!.id !== studentId) {
      throw new Error('Access denied: You can only update your own data');
    }
    
    const updatedStudent = await dataAccess.updateStudent(studentId, validatedData);
    
    // Audit logging
    AuditLogger.log(
      'UPDATE',
      'student',
      studentId,
      user!.id,
      { 
        before: existingStudent,
        after: updatedStudent,
        changes: validatedData
      }
    );
    
    return NextResponse.json({
      success: true,
      data: updatedStudent,
      message: 'Student updated successfully'
    });
  },
  {
    requireAuth: true,
    requiredRole: UserRole.TEACHER,
    validator: validateStudentData
  }
);

// DELETE /api/students/[studentId] - Delete a student
export const DELETE = apiHandler(
  async (request, { user, params }) => {
    const studentId = params.studentId;
    const existingStudent = await dataAccess.getStudentById(studentId);
    
    if (!existingStudent) {
      throw createNotFoundError('Student', studentId);
    }
    
    const deleted = await dataAccess.deleteStudent(studentId);
    
    if (!deleted) {
      throw createNotFoundError('Student', studentId);
    }
    
    // Audit logging
    AuditLogger.log(
      'DELETE',
      'student',
      studentId,
      user!.id,
      { deleted: existingStudent }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Student deleted successfully'
    });
  },
  {
    requireAuth: true,
    requiredRole: UserRole.ADMIN
  }
);
