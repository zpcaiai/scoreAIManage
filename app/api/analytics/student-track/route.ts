import { NextRequest, NextResponse } from 'next/server';

// 标准化分数 Z-score
function zScore(score: number, avg: number, std: number): number {
  if (std === 0) return 0;
  return parseFloat(((score - avg) / std).toFixed(4));
}

// 自动分类标签
function classifyStudent(scores: number[]): { label: string; color: string; desc: string } {
  if (scores.length < 2) return { label: '数据不足', color: 'gray', desc: '需要至少2次考试数据' };
  const diffs = scores.slice(1).map((s, i) => s - scores[i]);
  const positiveCount = diffs.filter(d => d > 2).length;
  const negativeCount = diffs.filter(d => d < -2).length;
  const total = diffs.length;

  if (positiveCount >= total * 0.6) return { label: '持续进步', color: 'green', desc: '成绩持续上升，值得表扬鼓励' };
  if (negativeCount >= total * 0.6) return { label: '退步预警', color: 'red', desc: '成绩持续下滑，需要重点关注' };
  if (positiveCount + negativeCount >= total * 0.7) return { label: '波动较大', color: 'orange', desc: '成绩起伏明显，需稳定学习状态' };
  return { label: '成绩稳定', color: 'blue', desc: '成绩较稳定，可适当激励突破' };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId') || 'c0';
    const studentId = searchParams.get('studentId');

    // 模拟考试列表
    const exams = [
      { id: 'e1', name: '第一次月考' },
      { id: 'e2', name: '第二次月考' },
      { id: 'e3', name: '期中考试' },
      { id: 'e4', name: '第三次月考' },
      { id: 'e5', name: '期末考试' },
    ];

    // 模拟班级学生成绩数据
    const studentCount = 45;
    const students = Array.from({ length: studentCount }, (_, i) => {
      // 生成各类型学生
      const type = i % 4; // 0进步 1退步 2波动 3稳定
      const baseScore = 80 + Math.random() * 30;
      const scores = exams.map((_, ei) => {
        let delta = 0;
        if (type === 0) delta = ei * 2 + (Math.random() - 0.3) * 5;  // 进步
        if (type === 1) delta = -ei * 2 + (Math.random() - 0.7) * 5; // 退步
        if (type === 2) delta = Math.sin(ei) * 15 + (Math.random() - 0.5) * 8; // 波动
        if (type === 3) delta = (Math.random() - 0.5) * 6;            // 稳定
        return Math.min(150, Math.max(30, parseFloat((baseScore + delta).toFixed(1))));
      });
      return { id: `s_${i}`, name: `学生${i + 1}`, scores };
    });

    // 计算每次考试的班级平均分和标准差
    const examStats = exams.map((exam, ei) => {
      const allScores = students.map(s => s.scores[ei]);
      const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
      const std = Math.sqrt(allScores.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / allScores.length);
      return { ...exam, avg: parseFloat(avg.toFixed(2)), std: parseFloat(std.toFixed(2)) };
    });

    // 为每个学生计算排名、标准化分数、分类
    const studentAnalysis = students.map(student => {
      const examRecords = exams.map((exam, ei) => {
        const score = student.scores[ei];
        const stat = examStats[ei];
        // 计算排名
        const rank = students.filter(s => s.scores[ei] > score).length + 1;
        return {
          exam_id: exam.id,
          exam_name: exam.name,
          score,
          rank,
          rank_change: ei > 0
            ? students.filter(s => s.scores[ei - 1] > student.scores[ei - 1]).length + 1 - rank
            : 0,
          z_score: zScore(score, stat.avg, stat.std),
          class_avg: stat.avg,
        };
      });

      const scoreList = examRecords.map(r => r.score);
      const classification = classifyStudent(scoreList);
      const firstRank = examRecords[0].rank;
      const lastRank = examRecords[examRecords.length - 1].rank;
      const rankImprovement = firstRank - lastRank; // 正数为进步

      // 生成个性化建议
      let advice = '';
      if (classification.label === '持续进步') {
        advice = `${student.name}进步明显，名次提升${rankImprovement}名，建议保持当前学习节奏，可挑战更高目标。`;
      } else if (classification.label === '退步预警') {
        advice = `${student.name}成绩下滑，名次下降${Math.abs(rankImprovement)}名，建议教师主动约谈，了解原因并制定补救计划。`;
      } else if (classification.label === '波动较大') {
        advice = `${student.name}成绩起伏较大，建议帮助其建立稳定的学习习惯，关注心理状态。`;
      } else {
        advice = `${student.name}成绩稳定，建议适当激励，设定进步目标以突破瓶颈。`;
      }

      return {
        student_id: student.id,
        student_name: student.name,
        classification,
        rank_improvement: rankImprovement,
        score_improvement: parseFloat((scoreList[scoreList.length - 1] - scoreList[0]).toFixed(1)),
        current_rank: lastRank,
        exam_records: examRecords,
        advice,
        // 图表数据
        chart_data: examRecords.map(r => ({
          name: r.exam_name,
          score: r.score,
          rank: r.rank,
          班级均分: r.class_avg,
        })),
      };
    });

    // 分类汇总（教师视图）
    const byLabel = {
      '持续进步': studentAnalysis.filter(s => s.classification.label === '持续进步'),
      '退步预警': studentAnalysis.filter(s => s.classification.label === '退步预警'),
      '波动较大': studentAnalysis.filter(s => s.classification.label === '波动较大'),
      '成绩稳定': studentAnalysis.filter(s => s.classification.label === '成绩稳定'),
    };

    const result: any = {
      success: true,
      class_id: classId,
      exam_stats: examStats,
      summary: {
        total: studentAnalysis.length,
        improving: byLabel['持续进步'].length,
        declining: byLabel['退步预警'].length,
        volatile: byLabel['波动较大'].length,
        stable: byLabel['成绩稳定'].length,
      },
      priority_list: {
        need_attention: byLabel['退步预警'].map(s => ({ name: s.student_name, rank: s.current_rank, advice: s.advice })),
        need_encouragement: byLabel['持续进步'].slice(0, 5).map(s => ({ name: s.student_name, improvement: s.rank_improvement })),
        need_stability: byLabel['波动较大'].map(s => ({ name: s.student_name, advice: s.advice })),
      },
      by_label: byLabel,
    };

    // 单个学生详情
    if (studentId) {
      const detail = studentAnalysis.find(s => s.student_id === studentId);
      result.student_detail = detail || null;
    } else {
      result.all_students = studentAnalysis;
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
