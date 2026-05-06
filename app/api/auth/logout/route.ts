import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-middleware';
import { AuditLogger, Logger } from '@/lib/error-handler';

// POST /api/auth/logout - User logout
export const POST = apiHandler(
  async (request: NextRequest, { user }) => {
    if (user) {
      AuditLogger.log('LOGOUT', 'user', user.id, user.id, { username: user.username });
      Logger.info('User logged out', { userId: user.id, username: user.username });
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    response.cookies.delete('auth_token');

    return response;
  },
  {
    requireAuth: false
  }
);
