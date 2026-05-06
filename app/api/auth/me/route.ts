import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-middleware';

// GET /api/auth/me - Get current authenticated user
export const GET = apiHandler(
  async (request: NextRequest, { user }) => {
    return NextResponse.json({
      success: true,
      data: user,
      message: 'User retrieved successfully'
    });
  },
  {
    requireAuth: true
  }
);
