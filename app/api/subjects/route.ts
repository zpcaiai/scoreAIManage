import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-middleware';
import { DataAccessLayer } from '@/lib/database';
import { UserRole } from '@/lib/auth';

const dataAccess = new DataAccessLayer();

// GET /api/subjects - Get all subjects
export const GET = apiHandler(
  async (request, { user }) => {
    const subjects = await dataAccess.getSubjects();
    
    return NextResponse.json({
      success: true,
      data: subjects,
      count: subjects.length
    });
  },
  {
    requireAuth: true,
    requiredRole: UserRole.STUDENT
  }
);
