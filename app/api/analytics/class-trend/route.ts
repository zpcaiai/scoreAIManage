import { NextRequest, NextResponse } from 'next/server';
import { fetchClassTrend, fetchClasses } from '@/lib/analytics-db';

function trendDirection(avgs: number[]) {
  if (avgs.length < 2) return { label: '数据不足', color: 'gray', diff: '0' };
  const diff = avgs[avgs.length - 1] - avgs[0];
  if (diff > 3)  return { label: '持续上升', color: 'green', diff: `+${diff.toFixed(1)}` };
  if (diff < -3) return { label: '有所下降', color: 'red',   diff: diff.toFixed(1) };
  return { label: '基本稳定', color: 'blue', diff: diff.toFixed(1) };
}

// Build trend from DB summary rows grouped by exam
function buildTrendFromRows(rows: any[]) {
  // Group by exam key
  const examMap = new Map<string, { exam_name: string; scores: number[] }>();
  rows.forEach(r => {
    const key = `${r.exam_type}|${r.semester}|${r.academic_year}`;
    const name = `${r.exam_type === 'midterm' ? '期中' : r.exam_type === 'final' ? '期末' : '月考'}(${r.semester})`;
    if (!examMap.has(key)) examMap.set(key, { exam_name: name, scores: [] });
    examMap.get(key)!.scores.push(Number(r.ten_subjects_total));
  });
  return Array.from(examMap.entries()).map(([, d]) => {
    const sorted = [...d.scores].sort((a, b) => a - b);
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    return {
      exam_name: d.exam_name,
      avg: parseFloat(avg.toFixed(2)),
      max: sorted[sorted.length - 1],
      min: sorted[0],
      pass_rate: parseFloat(((sorted.filter(s => s >= 450).length / sorted.length) * 100).toFixed(1)),
    };
  });
}

// Mock fallback
function mockTrend(base: number, noise: number) {
  return ['第一次月考','第二次月考','期中考试','第三次月考','期末考试'].map((name, i) => ({
    exam_name: name,
    avg: parseFloat((base + i * noise + (Math.random() - 0.5) * 4).toFixed(2)),
    max: parseFloat((base + i * noise + 100 + Math.random() * 20).toFixed(2)),
    min: parseFloat((base + i * noise - 80 - Math.random() * 20).toFixed(2)),
    pass_rate: parseFloat((60 + i * 2 + (Math.random() - 0.5) * 5).toFixed(1)),
  }));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classIdParam        = searchParams.get('classId') || '1';
    const compareClassIdParam = searchParams.get('compareClassId');

    let mainTrend: any[], compareTrend: any[] | null = null;
    let mainClassName = `班级${classIdParam}`, compareClassName = '';
    let dataSource = 'database';

    try {
      const classes = await fetchClasses();
      const mainClass   = classes.find(c => String(c.class_id) === classIdParam) || classes[0];
      const compareClass = compareClassIdParam ? classes.find(c => String(c.class_id) === compareClassIdParam) : null;
      if (!mainClass) throw new Error('no class');

      mainClassName = mainClass.class_name;
      const mainRows = await fetchClassTrend(mainClass.class_id);
      if (mainRows.length === 0) throw new Error('empty');
      mainTrend = buildTrendFromRows(mainRows);

      if (compareClass) {
        compareClassName = compareClass.class_name;
        const cmpRows = await fetchClassTrend(compareClass.class_id);
        compareTrend = buildTrendFromRows(cmpRows);
      }
    } catch {
      dataSource = 'mock';
      mainTrend    = mockTrend(530, 8);
      if (compareClassIdParam) compareTrend = mockTrend(510, 10);
    }

    const result: any = {
      success: true,
      data_source: dataSource,
      main_class: { class_id: classIdParam, class_name: mainClassName, trend: mainTrend, direction: trendDirection(mainTrend.map(t => t.avg)) },
    };

    if (compareTrend) {
      result.compare_class = { class_id: compareClassIdParam, class_name: compareClassName || `班级${compareClassIdParam}`, trend: compareTrend, direction: trendDirection(compareTrend.map(t => t.avg)) };
      result.chart_data = mainTrend.map((t, i) => ({ name: t.exam_name, [mainClassName]: t.avg, [compareClassName || '对比班级']: compareTrend![i]?.avg }));
    } else {
      result.chart_data = mainTrend.map(t => ({ name: t.exam_name, 平均分: t.avg, 最高分: t.max, 最低分: t.min }));
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
