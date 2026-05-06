import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-middleware';
import { validateClassData } from '@/lib/validation';
import { DataAccessLayer } from '@/lib/database';
import { AuditLogger, createNotFoundError } from '@/lib/error-handler';
import { UserRole } from '@/lib/auth';

const dataAccess = new DataAccessLayer();

// GET /api/classes/[classId] - Get a specific class
export const GET = apiHandler(
  async (request, { user, params }) => {
    const classId = params.classId;
    const classData = await dataAccess.getClassById(classId);
    
    if (!classData) {
      throw createNotFoundError('Class', classId);
    }
    
    return NextResponse.json({
      success: true,
      data: classData
    });
  },
  {
    requireAuth: true,
    requiredRole: UserRole.STUDENT
  }
);

// PUT /api/classes/[classId] - Update a class
export const PUT = apiHandler(
  async (request, { user, validatedData, params }) => {
    const classId = params.classId;
    const existingClass = await dataAccess.getClassById(classId);
    
    if (!existingClass) {
      throw createNotFoundError('Class', classId);
    }
    
    const updatedClass = await dataAccess.updateClass(classId, validatedData);
    
    // Audit logging
    AuditLogger.log(
      'UPDATE',
      'class',
      classId,
      user!.id,
      { 
        before: existingClass,
        after: updatedClass,
        changes: validatedData
      }
    );
    
    return NextResponse.json({
      success: true,
      data: updatedClass,
      message: 'Class updated successfully'
    });
  },
  {
    requireAuth: true,
    requiredRole: UserRole.ADMIN,
    validator: validateClassData
  }
);

// DELETE /api/classes/[classId] - Delete a class
export const DELETE = apiHandler(
  async (request, { user, params }) => {
    const classId = params.classId;
    const existingClass = await dataAccess.getClassById(classId);
    
    if (!existingClass) {
      throw createNotFoundError('Class', classId);
    }
    
    const deleted = await dataAccess.deleteClass(classId);
    
    if (!deleted) {
      throw createNotFoundError('Class', classId);
    }
    
    // Audit logging
    AuditLogger.log(
      'DELETE',
      'class',
      classId,
      user!.id,
      { deleted: existingClass }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Class deleted successfully'
    });
  },
  {
    requireAuth: true,
    requiredRole: UserRole.ADMIN
  }
);
