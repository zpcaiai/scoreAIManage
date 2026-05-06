import { NextRequest, NextResponse } from 'next/server';

// 标准化分数：用Z-score消除不同考试总分/均分差异
function zScore(score: number, avg: number, std: number): number {
  if (std === 0) return 0;
  return parseFloat(((score - avg) / std).toFixed(4));
}

// 基于Z-score序列的动态分类（≥3次有效）
function classifyStudent(zScores: number[]): { label: string; color: string; desc: string } {
  if (zScores.length < 2) return { label: '数据不足', color: 'gray', desc: '需要至少2次考试数据' };
  const diffs = zScores.slice(1).map((z, i) => z - zScores[i]);
  const pos = diffs.filter(d => d > 0.1).length;
  const neg = diffs.filter(d => d < -0.1).length;
  const total = diffs.length;
  if (pos >= total * 0.6) return { label: '持续进步', color: 'green', desc: '相对排位持续上升，值得表扬鼓励' };
  if (neg >= total * 0.6) return { label: '退步预警', color: 'red', desc: '相对排位持续下滑，需重点关注' };
  if (pos + neg >= total * 0.7) return { label: '波动较大', color: 'orange', desc: '成绩起伏明显，需稳定学习状态' };
  return { label: '成绩稳定', color: 'blue', desc: '成绩较稳定，可适当激励突破' };
}

// 生成建议文字
function genAdvice(name: string, label: string, classRankImprove: number, gradeRankImprove: number): string {
  const classDir = classRankImprove > 0 ? `班级名次提升${classRankImprove}名` : classRankImprove < 0 ? `班级名次下降${Math.abs(classRankImprove)}名` : '班级名次持平';
  const gradeDir = gradeRankImprove > 0 ? `年级名次提升${gradeRankImprove}名` : gradeRankImprove < 0 ? `年级名次下降${Math.abs(gradeRankImprove)}名` : '年级名次持平';
  if (label === '持续进步') return `${name}进步明显（${classDir}，${gradeDir}），建议保持节奏，挑战更高目标。`;
  if (label === '退步预警') return `${name}成绩下滑（${classDir}，${gradeDir}），建议教师主动约谈，了解原因并制定补救计划。`;
  if (label === '波动较大') return `${name}成绩起伏较大，建议帮助建立稳定的学习习惯，关注心理状态。`;
  return `${name}成绩稳定（${classDir}，${gradeDir}），建议适当激励，设定目标突破瓶颈。`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId') || 'c0';
    const studentId = searchParams.get('studentId');

    const exams = [
      { id: 'e1', name: '第一次月考', total_score: 750 },
      { id: 'e2', name: '第二次月考', total_score: 750 },
      { id: 'e3', name: '期中考试',   total_score: 800 },
      { id: 'e4', name: '第三次月考', total_score: 750 },
      { id: 'e5', name: '期末考试',   total_score: 800 },
    ];

    // 模拟全年级4个班 × 45人的数据
    const classes = [
      { id: 'c0', name: '高一(1)班', baseDelta: 3 },
      { id: 'c1', name: '高一(2)班', baseDelta: 0 },
      { id: 'c2', name: '高一(3)班', baseDelta: -2 },
      { id: 'c3', name: '高一(4)班', baseDelta: -4 },
    ];

    // 生成全年级所有学生数据
    const allStudents: { id: string; name: string; class_id: string; class_name: string; scores: number[] }[] = [];
    classes.forEach(cls => {
      for (let i = 0; i < 45; i++) {
        const type = i % 4;
        const baseScore = 420 + cls.baseDelta * 5 + Math.random() * 80;
        const scores = exams.map((exam, ei) => {
          // 按总分比例缩放基准分
          const scaledBase = baseScore * (exam.total_score / 750);
          let delta = 0;
          if (type === 0) delta = ei * 3 + (Math.random() - 0.3) * 8;
          if (type === 1) delta = -ei * 3 + (Math.random() - 0.7) * 8;
          if (type === 2) delta = Math.sin(ei * 1.2) * 20 + (Math.random() - 0.5) * 10;
          if (type === 3) delta = (Math.random() - 0.5) * 10;
          return Math.min(exam.total_score, Math.max(0, parseFloat((scaledBase + delta).toFixed(1))));
        });
        allStudents.push({ id: `${cls.id}_s${i}`, name: `${cls.name}学生${i + 1}`, class_id: cls.id, class_name: cls.name, scores });
      }
    });

    // 目标班级学生
    const targetStudents = allStudents.filter(s => s.class_id === classId);

    // 每次考试的统计（班级 + 年级）
    const examStats = exams.map((exam, ei) => {
      const classScores = targetStudents.map(s => s.scores[ei]);
      const gradeScores = allStudents.map(s => s.scores[ei]);
      const classAvg = classScores.reduce((a, b) => a + b, 0) / classScores.length;
      const gradeAvg = gradeScores.reduce((a, b) => a + b, 0) / gradeScores.length;
      const classStd = Math.sqrt(classScores.reduce((a, b) => a + Math.pow(b - classAvg, 2), 0) / classScores.length);
      const gradeStd = Math.sqrt(gradeScores.reduce((a, b) => a + Math.pow(b - gradeAvg, 2), 0) / gradeScores.length);
      return {
        ...exam,
        class_avg: parseFloat(classAvg.toFixed(2)),
        class_std: parseFloat(classStd.toFixed(2)),
        grade_avg: parseFloat(gradeAvg.toFixed(2)),
        grade_std: parseFloat(gradeStd.toFixed(2)),
        class_size: classScores.length,
        grade_size: gradeScores.length,
      };
    });

    // 分析目标班级每个学生
    const studentAnalysis = targetStudents.map(student => {
      const examRecords = exams.map((exam, ei) => {
        const score = student.scores[ei];
        const stat = examStats[ei];

        // 班级排名
        const classRank = targetStudents.filter(s => s.scores[ei] > score).length + 1;
        const prevClassRank = ei > 0
          ? targetStudents.filter(s => s.scores[ei - 1] > student.scores[ei - 1]).length + 1
          : classRank;

        // 年级排名
        const gradeRank = allStudents.filter(s => s.scores[ei] > score).length + 1;
        const prevGradeRank = ei > 0
          ? allStudents.filter(s => s.scores[ei - 1] > student.scores[ei - 1]).length + 1
          : gradeRank;

        // 标准化分数（消除不同总分影响）
        const classZ = zScore(score, stat.class_avg, stat.class_std);
        const gradeZ = zScore(score, stat.grade_avg, stat.grade_std);

        return {
          exam_id: exam.id,
          exam_name: exam.name,
          total_score: exam.total_score,
          score,
          score_pct: parseFloat(((score / exam.total_score) * 100).toFixed(1)),
          class_rank: classRank,
          class_rank_change: prevClassRank - classRank,  // 正数=进步
          grade_rank: gradeRank,
          grade_rank_change: prevGradeRank - gradeRank,  // 正数=进步
          class_z: classZ,
          grade_z: gradeZ,
          class_avg: stat.class_avg,
          grade_avg: stat.grade_avg,
        };
      });

      const zScores = examRecords.map(r => r.grade_z);
      const classification = classifyStudent(zScores);

      const firstRecord = examRecords[0];
      const lastRecord = examRecords[examRecords.length - 1];
      const classRankImprove = firstRecord.class_rank - lastRecord.class_rank;
      const gradeRankImprove = firstRecord.grade_rank - lastRecord.grade_rank;
      const scoreImprove = parseFloat((
        lastRecord.score_pct - firstRecord.score_pct
      ).toFixed(1)); // 百分比进步（消除总分差异）

      return {
        student_id: student.id,
        student_name: student.name,
        class_name: student.class_name,
        classification,
        // 双维度名次进步
        class_rank_improvement: classRankImprove,
        grade_rank_improvement: gradeRankImprove,
        score_pct_improvement: scoreImprove,
        current_class_rank: lastRecord.class_rank,
        current_grade_rank: lastRecord.grade_rank,
        exam_records: examRecords,
        advice: genAdvice(student.name, classification.label, classRankImprove, gradeRankImprove),
        // 图表数据（双Y轴：分数% + 双名次）
        chart_data: examRecords.map(r => ({
          name: r.exam_name,
          得分率: r.score_pct,
          班级排名: r.class_rank,
          年级排名: r.grade_rank,
          班级均分率: parseFloat(((r.class_avg / r.total_score) * 100).toFixed(1)),
          年级均分率: parseFloat(((r.grade_avg / r.total_score) * 100).toFixed(1)),
        })),
      };
    });

    const byLabel: Record<string, typeof studentAnalysis> = {
      '持续进步': studentAnalysis.filter(s => s.classification.label === '持续进步'),
      '退步预警': studentAnalysis.filter(s => s.classification.label === '退步预警'),
      '波动较大': studentAnalysis.filter(s => s.classification.label === '波动较大'),
      '成绩稳定': studentAnalysis.filter(s => s.classification.label === '成绩稳定'),
    };

    const result: any = {
      success: true,
      class_id: classId,
      class_name: classes.find(c => c.id === classId)?.name || classId,
      grade_total_students: allStudents.length,
      exam_stats: examStats,
      summary: {
        total: studentAnalysis.length,
        improving: byLabel['持续进步'].length,
        declining: byLabel['退步预警'].length,
        volatile: byLabel['波动较大'].length,
        stable: byLabel['成绩稳定'].length,
      },
      priority_list: {
        need_attention: byLabel['退步预警'].map(s => ({
          name: s.student_name,
          class_rank: s.current_class_rank,
          grade_rank: s.current_grade_rank,
          class_rank_change: s.class_rank_improvement,
          grade_rank_change: s.grade_rank_improvement,
          advice: s.advice,
        })),
        need_encouragement: byLabel['持续进步'].slice(0, 5).map(s => ({
          name: s.student_name,
          class_rank_improvement: s.class_rank_improvement,
          grade_rank_improvement: s.grade_rank_improvement,
        })),
        need_stability: byLabel['波动较大'].map(s => ({
          name: s.student_name,
          advice: s.advice,
        })),
      },
      by_label: byLabel,
    };

    if (studentId) {
      result.student_detail = studentAnalysis.find(s => s.student_id === studentId) || null;
    } else {
      result.all_students = studentAnalysis;
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
