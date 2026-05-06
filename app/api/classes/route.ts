import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-middleware';
import { validateClassData } from '@/lib/validation';
import { DataAccessLayer } from '@/lib/database';
import { AuditLogger } from '@/lib/error-handler';
import { UserRole } from '@/lib/auth';

let _da: DataAccessLayer | null = null;
function getDA() { if (!_da) _da = new DataAccessLayer(); return _da; }

// GET /api/classes - Get all classes
export const GET = apiHandler(
  async (request, { user }) => {
    const classes = await getDA().getClasses();
    
    return NextResponse.json({
      success: true,
      data: classes,
      count: classes.length
    });
  },
  {
    requireAuth: true,
    requiredRole: UserRole.STUDENT
  }
);

// POST /api/classes - Create a new class
export const POST = apiHandler(
  async (request, { user, validatedData }) => {
    const newClass = await getDA().createClass(validatedData);
    
    // Audit logging
    AuditLogger.log(
      'CREATE',
      'class',
      newClass.class_id,
      user!.id,
      { created: newClass }
    );
    
    return NextResponse.json({
      success: true,
      data: newClass,
      message: 'Class created successfully'
    }, { status: 201 });
  },
  {
    requireAuth: true,
    requiredRole: UserRole.ADMIN,
    validator: validateClassData
  }
);
