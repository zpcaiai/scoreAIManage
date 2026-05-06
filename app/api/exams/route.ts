import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-middleware';
import { DataAccessLayer } from '@/lib/database';
import { UserRole } from '@/lib/auth';

const dataAccess = new DataAccessLayer();

// GET /api/exams - Get all exams
export const GET = apiHandler(
  async (request, { user }) => {
    const exams = await dataAccess.getExams();
    
    return NextResponse.json({
      success: true,
      data: exams,
      count: exams.length
    });
  },
  {
    requireAuth: true,
    requiredRole: UserRole.STUDENT
  }
);
