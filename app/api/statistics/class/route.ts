import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-middleware';
import { DataAccessLayer } from '@/lib/database';
import { UserRole } from '@/lib/auth';

let _da: DataAccessLayer | null = null;
function getDA() { if (!_da) _da = new DataAccessLayer(); return _da; }

// GET /api/statistics/class - Get class statistics
export const GET = apiHandler(
  async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    
    if (!examId) {
      throw new Error('Exam ID is required');
    }
    
    // Get all grades for the exam
    const grades = await getDA().getGrades({ exam_id: examId });
    const classes = await getDA().getClasses();
    
    // Calculate statistics for each class
    const classStats = classes.map(cls => {
      const classGrades = grades.filter(g => {
        // In a real system, we'd join through students to get class
        // For now, we'll use a simplified approach
        return true; // This would be filtered by student->class relationship
      });
      
      const subjectScores = new Map<string, number[]>();
      
      classGrades.forEach(grade => {
        if (!subjectScores.has(grade.subject_id)) {
          subjectScores.set(grade.subject_id, []);
        }
        subjectScores.get(grade.subject_id)!.push(grade.score);
      });
      
      const subjectStats: any[] = [];
      let totalSum = 0;
      let totalCount = 0;
      
      subjectScores.forEach((scores, subjectId) => {
        const avg = scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length;
        const max = Math.max(...scores);
        const min = Math.min(...scores);
        const passCount = scores.filter((score: number) => score >= 60).length;
        const excellentCount = scores.filter((score: number) => score >= 90).length;
        
        subjectStats.push({
          subject_id: subjectId,
          average: parseFloat(avg.toFixed(2)),
          max,
          min,
          pass_rate: parseFloat(((passCount / scores.length) * 100).toFixed(2)),
          excellent_rate: parseFloat(((excellentCount / scores.length) * 100).toFixed(2)),
          count: scores.length
        });
        
        totalSum += avg;
        totalCount++;
      });
      
      return {
        class_id: cls.class_id,
        class_name: cls.class_name,
        subject_stats: subjectStats,
        overall_average: totalCount > 0 ? parseFloat((totalSum / totalCount).toFixed(2)) : 0,
        total_students: classGrades.length
      };
    });
    
    return NextResponse.json({
      success: true,
      data: classStats,
      count: classStats.length
    });
  },
  {
    requireAuth: true,
    requiredRole: UserRole.TEACHER
  }
);
