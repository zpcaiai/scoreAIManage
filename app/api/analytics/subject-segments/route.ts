import { NextRequest, NextResponse } from 'next/server';
import { fetchSubjectScoresForClass, fetchClasses, fetchSubjects } from '@/lib/analytics-db';

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
    const subjectFilter = searchParams.get('subject');
    const examType    = searchParams.get('examType')    || 'midterm';
    const semester    = searchParams.get('semester')    || '第一学期';
    const academicYear = searchParams.get('academicYear') || '2024-2025';

    // ── Try database ──────────────────────────────────────────────────
    let rawData: Record<string, Record<string, { scores: number[]; full: number }>> = {};
    let subjectList: string[] = [];
    let classList: { id: string; name: string }[] = [];
    let dataSource = 'database';

    try {
      const dbClasses = await fetchClasses();
      const dbSubjects = await fetchSubjects();
      if (dbClasses.length === 0 || dbSubjects.length === 0) throw new Error('empty');

      subjectList = dbSubjects.map(s => s.subject_name);
      classList = dbClasses.map(c => ({ id: String(c.class_id), name: c.class_name }));

      // Fetch per-class subject scores in parallel
      await Promise.all(dbClasses.map(async cls => {
        const rows = await fetchSubjectScoresForClass(cls.class_id, examType, semester, academicYear);
        rawData[String(cls.class_id)] = {};
        rows.forEach(r => {
          const sub = r.subject_name;
          if (!rawData[String(cls.class_id)][sub]) rawData[String(cls.class_id)][sub] = { scores: [], full: Number(r.full_score) };
          rawData[String(cls.class_id)][sub].scores.push(Number(r.score));
        });
      }));

      // If all empty, fall through to mock
      const hasData = Object.values(rawData).some(cls => Object.values(cls).some(s => s.scores.length > 0));
      if (!hasData) throw new Error('no scores');
    } catch {
      dataSource = 'mock';
      subjectList = SUBJECTS;
      classList = CLASSES.map(c => ({ id: c.id, name: c.name }));
      CLASSES.forEach(cls => {
        rawData[cls.id] = {};
        SUBJECTS.forEach((sub, si) => {
          const fullScore = 150;
          const scores = Array.from({ length: 45 }, () =>
            Math.min(fullScore, Math.max(30, parseFloat((90 + cls.delta + (si % 3) * 3 + (Math.random() - 0.5) * 40).toFixed(1))))
          );
          rawData[cls.id][sub] = { scores, full: fullScore };
        });
      });
    }

    const targetSubjects = subjectFilter ? [subjectFilter] : subjectList;

    // 按科目 → 班级 整理，班级按均分从高到低排序
    const bySubject = targetSubjects.map(sub => {
      const classData = classList.map(cls => {
        const entry = rawData[cls.id]?.[sub];
        const scoreArr: number[] = entry?.scores ?? [];
        const fullScore: number = entry?.full ?? 150;
        const seg = segments(scoreArr);
        // 得分率分数段（标准化，支持不同总分科目）
        const segs = [
          { label: `≥${Math.round(fullScore * 0.9)}(优秀)`, min: fullScore * 0.9 },
          { label: `${Math.round(fullScore * 0.75)}-${Math.round(fullScore * 0.9 - 1)}(良好)`, min: fullScore * 0.75 },
          { label: `${Math.round(fullScore * 0.6)}-${Math.round(fullScore * 0.75 - 1)}(及格)`, min: fullScore * 0.6 },
          { label: `<${Math.round(fullScore * 0.6)}(待提高)`, min: 0 },
        ].map((s, idx, arr) => {
          const max = idx === 0 ? Infinity : arr[idx - 1].min;
          const count = scoreArr.filter(sc => sc >= s.min && sc < max).length;
          return { label: s.label, count, rate: scoreArr.length ? parseFloat(((count / scoreArr.length) * 100).toFixed(1)) : 0 };
        });

        return {
          class_id: cls.id, class_name: cls.name,
          avg: seg.avg, max: seg.max, min: seg.min, count: seg.count,
          segments: segs,
          sorted_scores: seg.sorted_scores.slice(0, 10),
        };
      }).sort((a, b) => b.avg - a.avg);

      // 柱形图数据（按分数段对比各班，使用动态标签）
      const segLabels = classData[0]?.segments.map(s => s.label) ?? [];
      const chartData = segLabels.map(segLabel => {
        const entry: any = { segment: segLabel };
        classData.forEach(cls => {
          entry[cls.class_name] = cls.segments.find(s => s.label === segLabel)?.rate || 0;
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
      data_source: dataSource,
      subjects: targetSubjects,
      classes: classList.map(c => c.name),
      by_subject: bySubject,
      suggestions,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
