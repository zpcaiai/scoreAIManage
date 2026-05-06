import { NextRequest, NextResponse } from 'next/server';

// 计算分位数
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

// 计算标准差
function stdDev(nums: number[]): number {
  if (nums.length === 0) return 0;
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance = nums.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / nums.length;
  return Math.sqrt(variance);
}

// 基于得分率的分数段（支持不同总分考试）
function scoreSegments(scores: number[], total: number) {
  // 统一转换为得分率百分比，消除总分差异
  const pcts = scores.map(s => (s / total) * 100);
  const segments = [
    { label: '≥90%(优秀)', min: 90, max: Infinity },
    { label: '75-89%(良好)', min: 75, max: 90 },
    { label: '60-74%(及格)', min: 60, max: 75 },
    { label: '<60%(待提高)', min: 0, max: 60 },
  ];
  return segments.map(seg => ({
    label: seg.label,
    count: pcts.filter(p => p >= seg.min && p < seg.max).length,
    rate: pcts.length > 0
      ? parseFloat(((pcts.filter(p => p >= seg.min && p < seg.max).length / pcts.length) * 100).toFixed(1))
      : 0,
  }));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    const subjectId = searchParams.get('subjectId') || 'all';

    // 模拟数据 - 实际应从数据库获取
    const mockGrades: { class_id: string; class_name: string; student_id: string; subject_id: string; score: number; total_score: number }[] = [];
    const classes = ['高一(1)班', '高一(2)班', '高一(3)班', '高二(1)班', '高二(2)班'];
    const subjects = ['语文', '数学', '英语', '物理', '化学'];

    classes.forEach((cls, ci) => {
      for (let i = 0; i < 45; i++) {
        subjects.forEach((sub, si) => {
          const base = 65 + ci * 3 + Math.random() * 25;
          mockGrades.push({
            class_id: `c${ci}`,
            class_name: cls,
            student_id: `s${ci}_${i}`,
            subject_id: `sub${si}`,
            score: Math.min(150, Math.max(0, parseFloat(base.toFixed(1)))),
            total_score: 150,
          });
        });
      }
    });

    const filtered = examId
      ? subjectId !== 'all'
        ? mockGrades.filter(g => g.subject_id === subjectId)
        : mockGrades
      : mockGrades;

    // 按班级分组分析
    const classMap = new Map<string, { name: string; scores: number[] }>();
    filtered.forEach(g => {
      if (!classMap.has(g.class_id)) classMap.set(g.class_id, { name: g.class_name, scores: [] });
      classMap.get(g.class_id)!.scores.push(g.score);
    });

    const classAnalysis = Array.from(classMap.entries()).map(([id, data]) => {
      const sorted = [...data.scores].sort((a, b) => a - b);
      const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      return {
        class_id: id,
        class_name: data.name,
        count: sorted.length,
        avg: parseFloat(avg.toFixed(2)),
        max: sorted[sorted.length - 1],
        min: sorted[0],
        std_dev: parseFloat(stdDev(sorted).toFixed(2)),
        // 四分位
        q1: parseFloat(percentile(sorted, 25).toFixed(2)),
        q2: parseFloat(percentile(sorted, 50).toFixed(2)),
        q3: parseFloat(percentile(sorted, 75).toFixed(2)),
        // 五分位
        p20: parseFloat(percentile(sorted, 20).toFixed(2)),
        p40: parseFloat(percentile(sorted, 40).toFixed(2)),
        p60: parseFloat(percentile(sorted, 60).toFixed(2)),
        p80: parseFloat(percentile(sorted, 80).toFixed(2)),
        pass_rate: parseFloat(((sorted.filter(s => s >= 90).length / sorted.length) * 100).toFixed(1)),
        excellent_rate: parseFloat(((sorted.filter(s => s >= 135).length / sorted.length) * 100).toFixed(1)),
        segments: scoreSegments(sorted, 150),
        // 柱形图数据
        chart_data: sorted.map(score => ({ score })),
      };
    }).sort((a, b) => b.avg - a.avg);

    // 年级整体排名建议
    const suggestions = classAnalysis.map((cls, idx) => {
      const diff = idx > 0 ? (classAnalysis[0].avg - cls.avg).toFixed(1) : '0';
      return {
        class_name: cls.class_name,
        rank: idx + 1,
        suggestion: idx === 0
          ? `${cls.class_name}年级第一，平均分${cls.avg}，继续保持并帮扶其他班级。`
          : `${cls.class_name}落后第一名${diff}分，建议重点关注后20%学生，参考${classAnalysis[0].class_name}教学方法。`,
      };
    });

    return NextResponse.json({
      success: true,
      exam_id: examId,
      subject_id: subjectId,
      class_analysis: classAnalysis,
      suggestions,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
