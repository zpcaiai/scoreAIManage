import { NextRequest, NextResponse } from 'next/server';

const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理', '信息'];
const CLASSES = [
  { id: 'c0', name: '高一(1)班', delta: 3 },
  { id: 'c1', name: '高一(2)班', delta: 0 },
  { id: 'c2', name: '高一(3)班', delta: -2 },
  { id: 'c3', name: '高一(4)班', delta: -4 },
];
const SUBJECT_TOTAL = 150;

function segments(scores: number[]) {
  const sorted = [...scores].sort((a, b) => b - a); // 从高到低
  const t = SUBJECT_TOTAL;
  return {
    sorted_scores: sorted,
    '≥135(优秀)': { count: sorted.filter(s => s >= 135).length, rate: 0 },
    '120-134(良好)': { count: sorted.filter(s => s >= 120 && s < 135).length, rate: 0 },
    '90-119(及格)': { count: sorted.filter(s => s >= 90 && s < 120).length, rate: 0 },
    '<90(待提高)': { count: sorted.filter(s => s < 90).length, rate: 0 },
    avg: parseFloat((sorted.reduce((a, b) => a + b, 0) / sorted.length).toFixed(2)),
    max: sorted[0],
    min: sorted[sorted.length - 1],
    count: sorted.length,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectFilter = searchParams.get('subject'); // null = 全部科目

    // 生成模拟数据：班级 × 科目 × 45人
    const rawData: Record<string, Record<string, number[]>> = {};
    CLASSES.forEach(cls => {
      rawData[cls.id] = {};
      SUBJECTS.forEach((sub, si) => {
        rawData[cls.id][sub] = Array.from({ length: 45 }, () => {
          const base = 90 + cls.delta + (si % 3) * 3;
          return Math.min(150, Math.max(30, parseFloat((base + (Math.random() - 0.5) * 40).toFixed(1))));
        });
      });
    });

    const targetSubjects = subjectFilter ? [subjectFilter] : SUBJECTS;

    // 按科目 → 班级 整理，班级按均分从高到低排序
    const bySubject = targetSubjects.map(sub => {
      const classData = CLASSES.map(cls => {
        const scores = rawData[cls.id][sub] || [];
        const seg = segments(scores);
        // 计算比率
        const segs = [
          { label: '≥135(优秀)', count: seg['≥135(优秀)'].count },
          { label: '120-134(良好)', count: seg['120-134(良好)'].count },
          { label: '90-119(及格)', count: seg['90-119(及格)'].count },
          { label: '<90(待提高)', count: seg['<90(待提高)'].count },
        ].map(s => ({ ...s, rate: parseFloat(((s.count / scores.length) * 100).toFixed(1)) }));

        return {
          class_id: cls.id,
          class_name: cls.name,
          avg: seg.avg,
          max: seg.max,
          min: seg.min,
          count: seg.count,
          segments: segs,
          sorted_scores: seg.sorted_scores.slice(0, 10), // 前10名展示
        };
      }).sort((a, b) => b.avg - a.avg); // 班级从高到低

      // 柱形图数据（按分数段对比各班）
      const chartData = ['≥135(优秀)', '120-134(良好)', '90-119(及格)', '<90(待提高)'].map(seg => {
        const entry: any = { segment: seg };
        classData.forEach(cls => {
          entry[cls.class_name] = cls.segments.find(s => s.label === seg)?.rate || 0;
        });
        return entry;
      });

      return {
        subject: sub,
        class_data: classData,
        chart_data: chartData,
        // 年级整体均分排名（用于建议）
        best_class: classData[0].class_name,
        worst_class: classData[classData.length - 1].class_name,
        gap: parseFloat((classData[0].avg - classData[classData.length - 1].avg).toFixed(2)),
      };
    });

    // 综合建议：每科目最差班级向最优班学习
    const suggestions = bySubject.map(sub => ({
      subject: sub.subject,
      suggestion: sub.gap > 5
        ? `${sub.subject}科目班级差距较大(${sub.gap}分)，${sub.worst_class}建议向${sub.best_class}学习教学方法，重点提升<90分段学生。`
        : `${sub.subject}各班差距较小(${sub.gap}分)，整体均衡，继续保持。`,
    }));

    return NextResponse.json({
      success: true,
      subjects: targetSubjects,
      classes: CLASSES.map(c => c.name),
      by_subject: bySubject,
      suggestions,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
