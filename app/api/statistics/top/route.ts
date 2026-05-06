import { NextRequest, NextResponse } from 'next/server';

// 模拟数据库存储 - 在实际应用中应该使用真实数据库
const students = [
  { student_id: '1', student_name: '张三', class_id: '1', class_name: '高一(1)班' },
  { student_id: '2', student_name: '李四', class_id: '1', class_name: '高一(1)班' },
  { student_id: '3', student_name: '王五', class_id: '2', class_name: '高一(2)班' }
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
  { grade_id: '20', student_id: '2', subject_id: '10', exam_id: '1', score: 92.00 },
  
  // 王五的成绩
  { grade_id: '21', student_id: '3', subject_id: '1', exam_id: '1', score: 130.00 },
  { grade_id: '22', student_id: '3', subject_id: '2', exam_id: '1', score: 140.00 },
  { grade_id: '23', student_id: '3', subject_id: '3', exam_id: '1', score: 132.00 },
  { grade_id: '24', student_id: '3', subject_id: '4', exam_id: '1', score: 92.00 },
  { grade_id: '25', student_id: '3', subject_id: '5', exam_id: '1', score: 90.00 },
  { grade_id: '26', student_id: '3', subject_id: '6', exam_id: '1', score: 89.00 },
  { grade_id: '27', student_id: '3', subject_id: '7', exam_id: '1', score: 88.00 },
  { grade_id: '28', student_id: '3', subject_id: '8', exam_id: '1', score: 91.00 },
  { grade_id: '29', student_id: '3', subject_id: '9', exam_id: '1', score: 86.00 },
  { grade_id: '30', student_id: '3', subject_id: '10', exam_id: '1', score: 94.00 }
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const examId = searchParams.get('examId');
  
  if (!examId) {
    return NextResponse.json({ error: 'Exam ID is required' }, { status: 400 });
  }
  
  // 计算每个学生的总分
  const studentScores = [];
  
  for (const student of students) {
    // 获取该学生在该考试中的所有成绩
    const studentGrades = grades.filter(g => 
      g.student_id === student.student_id && g.exam_id === examId
    );
    
    if (studentGrades.length === 0) continue;
    
    // 计算十门总分
    const tenSubjectsTotal = studentGrades.reduce((sum, g) => sum + g.score, 0);
    
    // 计算三门总分（语文、数学、外语）
    const threeSubjectsTotal = studentGrades
      .filter(g => ['1', '2', '3'].includes(g.subject_id))
      .reduce((sum, g) => sum + g.score, 0);
    
    studentScores.push({
      student_id: student.student_id,
      student_name: student.student_name,
      class_name: student.class_name,
      ten_subjects_total: tenSubjectsTotal,
      three_subjects_total: threeSubjectsTotal
    });
  }
  
  // 按十门总分排序
  studentScores.sort((a, b) => b.ten_subjects_total - a.ten_subjects_total);
  
  // 添加排名
  const rankedStudents = studentScores.map((student, index) => ({
    ...student,
    ten_subjects_rank: index + 1
  }));
  
  // 返回前10名
  const topStudents = rankedStudents.slice(0, 10);
  
  return NextResponse.json(topStudents);
}
