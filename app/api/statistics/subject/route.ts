import { NextRequest, NextResponse } from 'next/server';

// 模拟数据库存储 - 在实际应用中应该使用真实数据库
const subjects = [
  { subject_id: '1', subject_code: 'CHN', subject_name: '语文' },
  { subject_id: '2', subject_code: 'MATH', subject_name: '数学' },
  { subject_id: '3', subject_code: 'ENG', subject_name: '外语' },
  { subject_id: '4', subject_code: 'PHY', subject_name: '物理' },
  { subject_id: '5', subject_code: 'CHE', subject_name: '化学' },
  { subject_id: '6', subject_code: 'POL', subject_name: '政治' },
  { subject_id: '7', subject_code: 'HIS', subject_name: '历史' },
  { subject_id: '8', subject_code: 'GEO', subject_name: '地理' },
  { subject_id: '9', subject_code: 'BIO', subject_name: '生物' },
  { subject_id: '10', subject_code: 'IT', subject_name: '信息科技' }
];

const grades = [
  // 张三的成绩
  { grade_id: '1', student_id: '1', subject_id: '1', exam_id: '1', score: 135.00 },
  { grade_id: '2', student_id: '1', subject_id: '2', exam_id: '1', score: 142.00 },
  { grade_id: '3', student_id: '1', subject_id: '3', exam_id: '1', score: 128.00 },
  { grade_id: '4', student_id: '1', subject_id: '4', exam_id: '1', score: 95.00 },
  { grade_id: '5', student_id: '1', subject_id: '5', exam_id: '1', score: 88.00 },
  { grade_id: '6', student_id: '1', subject_id: '6', exam_id: '1', score: 92.00 },
  { grade_id: '7', student_id: '1', subject_id: '7', exam_id: '1', score: 85.00 },
  { grade_id: '8', student_id: '1', subject_id: '8', exam_id: '1', score: 90.00 },
  { grade_id: '9', student_id: '1', subject_id: '9', exam_id: '1', score: 87.00 },
  { grade_id: '10', student_id: '1', subject_id: '10', exam_id: '1', score: 95.00 },
  
  // 李四的成绩
  { grade_id: '11', student_id: '2', subject_id: '1', exam_id: '1', score: 125.00 },
  { grade_id: '12', student_id: '2', subject_id: '2', exam_id: '1', score: 138.00 },
  { grade_id: '13', student_id: '2', subject_id: '3', exam_id: '1', score: 135.00 },
  { grade_id: '14', student_id: '2', subject_id: '4', exam_id: '1', score: 88.00 },
  { grade_id: '15', student_id: '2', subject_id: '5', exam_id: '1', score: 92.00 },
  { grade_id: '16', student_id: '2', subject_id: '6', exam_id: '1', score: 87.00 },
  { grade_id: '17', student_id: '2', subject_id: '7', exam_id: '1', score: 90.00 },
  { grade_id: '18', student_id: '2', subject_id: '8', exam_id: '1', score: 85.00 },
  { grade_id: '19', student_id: '2', subject_id: '9', exam_id: '1', score: 88.00 },
  { grade_id: '20', student_id: '2', subject_id: '10', exam_id: '1', score: 92.00 }
];

// 计算标准差
function calculateStandardDeviation(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
  const avgSquaredDiff = squaredDifferences.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const examId = searchParams.get('examId');
  
  if (!examId) {
    return NextResponse.json({ error: 'Exam ID is required' }, { status: 400 });
  }
  
  const subjectStats = [];
  
  for (const subject of subjects) {
    // 获取该科目在该考试中的所有成绩
    const subjectGrades = grades.filter(g => 
      g.subject_id === subject.subject_id && g.exam_id === examId
    );
    
    if (subjectGrades.length === 0) continue;
    
    const scores = subjectGrades.map(g => g.score);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const stdDeviation = calculateStandardDeviation(scores);
    
    subjectStats.push({
      subject_name: subject.subject_name,
      exam_count: subjectGrades.length,
      avg_score: Math.round(avgScore * 100) / 100,
      max_score: maxScore,
      min_score: minScore,
      std_deviation: Math.round(stdDeviation * 100) / 100
    });
  }
  
  return NextResponse.json(subjectStats);
}
