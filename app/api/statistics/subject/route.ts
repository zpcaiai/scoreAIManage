import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-middleware';
import { DataAccessLayer } from '@/lib/database';
import { UserRole } from '@/lib/auth';

let _da: DataAccessLayer | null = null;
function getDA() { if (!_da) _da = new DataAccessLayer(); return _da; }

// 计算标准差
function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
  const avgSquaredDiff = squaredDifferences.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

export const GET = apiHandler(
  async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    
    if (!examId) {
      throw new Error('Exam ID is required');
    }
    
    const grades = await getDA().getGrades({ exam_id: examId });
    
    // Group grades by subject_name
    const subjectGroups = new Map<string, number[]>();
    
    grades.forEach(g => {
      if (!subjectGroups.has(g.subject_name)) {
        subjectGroups.set(g.subject_name, []);
      }
      subjectGroups.get(g.subject_name)!.push(Number(g.score) || 0);
    });
    
    const subjectStats: any[] = [];
    
    subjectGroups.forEach((scores, subject_name) => {
      const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);
      const stdDeviation = calculateStandardDeviation(scores);
      
      subjectStats.push({
        subject_name,
        exam_count: scores.length,
        avg_score: Math.round(avgScore * 100) / 100,
        max_score: maxScore,
        min_score: minScore,
        std_deviation: Math.round(stdDeviation * 100) / 100
      });
    });
    
    return NextResponse.json({
      success: true,
      data: subjectStats,
      count: subjectStats.length
    });
  },
  {
    requireAuth: true,
    requiredRole: UserRole.TEACHER
  }
);
