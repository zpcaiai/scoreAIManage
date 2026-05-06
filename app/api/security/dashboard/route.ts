import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-middleware';
import { SecurityDashboard } from '@/lib/security-monitor';
import { UserRole } from '@/lib/auth';

// GET /api/security/dashboard - 获取安全仪表板数据
export const GET = apiHandler(
  async (request, { user }) => {
    const dashboard = new SecurityDashboard();
    const dashboardData = dashboard.getDashboardData();
    
    return NextResponse.json({
      success: true,
      data: dashboardData
    });
  },
  {
    requireAuth: true,
    requiredRole: UserRole.ADMIN
  }
);
