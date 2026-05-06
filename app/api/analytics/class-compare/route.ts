import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');

    const subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理', '信息'];

    const genClassData = (baseDelta: number) =>
      subjects.map(sub => {
        const avg = 85 + baseDelta + (Math.random() - 0.5) * 10;
        return {
          subject: sub,
          avg: parseFloat(avg.toFixed(2)),
          max: parseFloat((avg + 20 + Math.random() * 10).toFixed(1)),
          min: parseFloat((avg - 25 - Math.random() * 10).toFixed(1)),
          pass_rate: parseFloat((55 + baseDelta + Math.random() * 20).toFixed(1)),
          excellent_rate: parseFloat((15 + baseDelta / 2 + Math.random() * 10).toFixed(1)),
          std_dev: parseFloat((12 + Math.random() * 5).toFixed(2)),
        };
      });

    const classes = [
      { id: 'c0', name: '高一(1)班', data: genClassData(3) },
      { id: 'c1', name: '高一(2)班', data: genClassData(0) },
      { id: 'c2', name: '高一(3)班', data: genClassData(-2) },
      { id: 'c3', name: '高二(1)班', data: genClassData(5) },
      { id: 'c4', name: '高二(2)班', data: genClassData(1) },
    ];

    // 年级综合排名
    const classRanking = classes.map(cls => {
      const totalAvg = cls.data.reduce((sum, s) => sum + s.avg, 0) / cls.data.length;
      const totalPassRate = cls.data.reduce((sum, s) => sum + s.pass_rate, 0) / cls.data.length;
      return {
        class_id: cls.id,
        class_name: cls.name,
        overall_avg: parseFloat(totalAvg.toFixed(2)),
        pass_rate: parseFloat(totalPassRate.toFixed(1)),
        subject_data: cls.data,
      };
    }).sort((a, b) => b.overall_avg - a.overall_avg)
      .map((cls, idx) => ({ ...cls, rank: idx + 1 }));

    // 科目维度横向对比图表数据
    const subjectCompareChart = subjects.map((sub, si) => {
      const entry: any = { subject: sub };
      classes.forEach(cls => { entry[cls.name] = cls.data[si].avg; });
      return entry;
    });

    // 各班优势/劣势科目分析
    const strengthAnalysis = classRanking.map(cls => {
      const sorted = [...cls.subject_data].sort((a, b) => b.avg - a.avg);
      const topSubjects = sorted.slice(0, 3).map(s => s.subject);
      const weakSubjects = sorted.slice(-3).map(s => s.subject);
      const bestClass = classRanking[0];
      const gap = bestClass.overall_avg - cls.overall_avg;
      return {
        class_name: cls.class_name,
        rank: cls.rank,
        overall_avg: cls.overall_avg,
        strengths: topSubjects,
        weaknesses: weakSubjects,
        gap_to_first: parseFloat(gap.toFixed(2)),
        suggestion: cls.rank === 1
          ? `${cls.class_name}年级第一，平均分${cls.overall_avg}，强势科目：${topSubjects.join('/')}，可分享教学经验。`
          : `${cls.class_name}距第一名差${gap.toFixed(1)}分，薄弱科目：${weakSubjects.join('/')}，建议向${bestClass.class_name}学习。`,
      };
    });

    return NextResponse.json({
      success: true,
      exam_id: examId,
      class_ranking: classRanking,
      subject_compare_chart: subjectCompareChart,
      strength_analysis: strengthAnalysis,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
