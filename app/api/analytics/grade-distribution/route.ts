import { NextRequest, NextResponse } from 'next/server';
import { fetchGradesForExam } from '@/lib/analytics-db';

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return parseFloat((sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower)).toFixed(2));
}

function stdDev(nums: number[]): number {
  if (nums.length === 0) return 0;
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return Math.sqrt(nums.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / nums.length);
}

// 得分率分数段（消除不同科目/考试总分差异）
function scoreSegments(scores: number[], fullScore: number) {
  const pcts = scores.map(s => (s / fullScore) * 100);
  return [
    { label: '≥90%(优秀)', min: 90, max: Infinity },
    { label: '75-89%(良好)', min: 75, max: 90 },
    { label: '60-74%(及格)', min: 60, max: 75 },
    { label: '<60%(待提高)', min: 0, max: 60 },
  ].map(seg => {
    const cnt = pcts.filter(p => p >= seg.min && p < seg.max).length;
    return { label: seg.label, count: cnt, rate: pcts.length ? parseFloat(((cnt / pcts.length) * 100).toFixed(1)) : 0 };
  });
}

// Mock fallback（无数据库时使用）
function buildMock() {
  const rows: { class_id: string; class_name: string; score: number; full_score: number }[] = [];
  ['高一(1)班','高一(2)班','高一(3)班','高二(1)班','高二(2)班'].forEach((cls, ci) => {
    for (let i = 0; i < 45; i++) {
      rows.push({ class_id: `c${ci}`, class_name: cls, score: Math.min(150, Math.max(0, parseFloat((65 + ci * 3 + Math.random() * 25).toFixed(1)))), full_score: 150 });
    }
  });
  return rows;
}

function analyseClasses(rows: { class_id: string; class_name: string; score: number; full_score: number }[]) {
  const map = new Map<string, { name: string; scores: number[]; full: number }>();
  rows.forEach(r => {
    if (!map.has(r.class_id)) map.set(r.class_id, { name: r.class_name, scores: [], full: r.full_score });
    map.get(r.class_id)!.scores.push(r.score);
  });
  return Array.from(map.entries()).map(([id, d]) => {
    const sorted = [...d.scores].sort((a, b) => a - b);
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    return {
      class_id: id, class_name: d.name, count: sorted.length,
      avg: parseFloat(avg.toFixed(2)),
      max: sorted[sorted.length - 1], min: sorted[0],
      std_dev: parseFloat(stdDev(sorted).toFixed(2)),
      q1: percentile(sorted, 25), q2: percentile(sorted, 50), q3: percentile(sorted, 75),
      p20: percentile(sorted, 20), p80: percentile(sorted, 80),
      pass_rate: parseFloat(((sorted.filter(s => (s / d.full) * 100 >= 60).length / sorted.length) * 100).toFixed(1)),
      excellent_rate: parseFloat(((sorted.filter(s => (s / d.full) * 100 >= 90).length / sorted.length) * 100).toFixed(1)),
      segments: scoreSegments(sorted, d.full),
    };
  }).sort((a, b) => b.avg - a.avg);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const examType   = searchParams.get('examType')    || 'midterm';
    const semester   = searchParams.get('semester')    || '第一学期';
    const academicYear = searchParams.get('academicYear') || '2024-2025';
    const subjectFilter = searchParams.get('subjectId');

    let rows: { class_id: string; class_name: string; score: number; full_score: number }[];
    let dataSource = 'database';

    try {
      const dbRows = await fetchGradesForExam(examType, semester, academicYear);
      if (dbRows.length === 0) throw new Error('empty');
      const filtered = subjectFilter
        ? dbRows.filter(r => String(r.subject_id) === subjectFilter)
        : dbRows;
      rows = filtered.map(r => ({
        class_id: String(r.class_id),
        class_name: r.class_name,
        score: Number(r.score),
        full_score: Number(r.full_score),
      }));
    } catch {
      rows = buildMock();
      dataSource = 'mock';
    }

    const classAnalysis = analyseClasses(rows);
    const suggestions = classAnalysis.map((cls, idx) => ({
      class_name: cls.class_name,
      rank: idx + 1,
      suggestion: idx === 0
        ? `${cls.class_name}年级第一，均分${cls.avg}，优秀率${cls.excellent_rate}%，继续保持并分享经验。`
        : `${cls.class_name}落后第一名${(classAnalysis[0].avg - cls.avg).toFixed(1)}分，建议重点关注后20%学生，向${classAnalysis[0].class_name}学习。`,
    }));

    return NextResponse.json({ success: true, data_source: dataSource, class_analysis: classAnalysis, suggestions, generated_at: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
