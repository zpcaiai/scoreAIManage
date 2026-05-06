import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const compareClassId = searchParams.get('compareClassId');

    // 模拟历次考试趋势数据
    const exams = [
      { exam_id: 'e1', exam_name: '第一次月考', date: '2024-09' },
      { exam_id: 'e2', exam_name: '第二次月考', date: '2024-10' },
      { exam_id: 'e3', exam_name: '期中考试',   date: '2024-11' },
      { exam_id: 'e4', exam_name: '第三次月考', date: '2024-12' },
      { exam_id: 'e5', exam_name: '期末考试',   date: '2025-01' },
    ];

    const genTrend = (base: number, noise: number) =>
      exams.map((exam, i) => ({
        exam_id: exam.exam_id,
        exam_name: exam.exam_name,
        date: exam.date,
        avg: parseFloat((base + i * noise + (Math.random() - 0.5) * 4).toFixed(2)),
        max: parseFloat((base + i * noise + 20 + Math.random() * 5).toFixed(2)),
        min: parseFloat((base + i * noise - 20 - Math.random() * 5).toFixed(2)),
        pass_rate: parseFloat((60 + i * 2 + (Math.random() - 0.5) * 5).toFixed(1)),
        excellent_rate: parseFloat((15 + i * 1.5 + (Math.random() - 0.5) * 3).toFixed(1)),
        std_dev: parseFloat((18 + (Math.random() - 0.5) * 3).toFixed(2)),
      }));

    const mainTrend = genTrend(88, 1.5);
    const compareTrend = compareClassId ? genTrend(84, 2.0) : null;

    // 趋势判断
    const trendDirection = (data: typeof mainTrend) => {
      const first = data[0].avg;
      const last = data[data.length - 1].avg;
      const diff = last - first;
      if (diff > 3) return { label: '持续上升', color: 'green', diff: `+${diff.toFixed(1)}` };
      if (diff < -3) return { label: '有所下降', color: 'red', diff: diff.toFixed(1) };
      return { label: '基本稳定', color: 'blue', diff: diff.toFixed(1) };
    };

    const result: any = {
      success: true,
      exams,
      main_class: {
        class_id: classId || 'c0',
        class_name: '高一(1)班',
        trend: mainTrend,
        direction: trendDirection(mainTrend),
      },
    };

    if (compareTrend) {
      result.compare_class = {
        class_id: compareClassId,
        class_name: '高一(2)班',
        trend: compareTrend,
        direction: trendDirection(compareTrend),
      };
      // 合并对比图表数据
      result.chart_data = exams.map((exam, i) => ({
        name: exam.exam_name,
        主班级: mainTrend[i].avg,
        对比班级: compareTrend[i].avg,
      }));
    } else {
      result.chart_data = mainTrend.map(t => ({
        name: t.exam_name,
        平均分: t.avg,
        最高分: t.max,
        最低分: t.min,
      }));
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
