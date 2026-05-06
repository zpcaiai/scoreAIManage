import { NextRequest, NextResponse } from 'next/server';
import { fetchGradesForExam, fetchClasses } from '@/lib/analytics-db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const examType    = searchParams.get('examType')     || 'midterm';
    const semester    = searchParams.get('semester')     || '第一学期';
    const academicYear = searchParams.get('academicYear') || '2024-2025';

    // ── DB path ────────────────────────────────────────────────────────
    type ClsEntry = { id: string; name: string; data: { subject: string; avg: number; max: number; min: number; pass_rate: number; excellent_rate: number; std_dev: number }[] };
    let classes: ClsEntry[] = [];
    let dataSource = 'database';

    try {
      const [dbClasses, dbRows] = await Promise.all([
        fetchClasses(),
        fetchGradesForExam(examType, semester, academicYear),
      ]);
      if (dbRows.length === 0) throw new Error('empty');

      // Group by class → subject
      const classSubjectMap = new Map<number, Map<string, number[]>>();
      const classNameMap = new Map<number, string>();
      dbRows.forEach(r => {
        classNameMap.set(r.class_id, r.class_name);
        if (!classSubjectMap.has(r.class_id)) classSubjectMap.set(r.class_id, new Map());
        const subMap = classSubjectMap.get(r.class_id)!;
        if (!subMap.has(r.subject_name)) subMap.set(r.subject_name, []);
        subMap.get(r.subject_name)!.push(Number(r.score));
      });

      classes = Array.from(classSubjectMap.entries()).map(([cid, subMap]) => ({
        id: String(cid),
        name: classNameMap.get(cid) || `班级${cid}`,
        data: Array.from(subMap.entries()).map(([sub, scores]) => {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          const std = Math.sqrt(scores.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / scores.length);
          return {
            subject: sub,
            avg: parseFloat(avg.toFixed(2)),
            max: Math.max(...scores),
            min: Math.min(...scores),
            pass_rate: parseFloat(((scores.filter(s => s >= 60).length / scores.length) * 100).toFixed(1)),
            excellent_rate: parseFloat(((scores.filter(s => s >= 90).length / scores.length) * 100).toFixed(1)),
            std_dev: parseFloat(std.toFixed(2)),
          };
        }),
      }));
    } catch {
      dataSource = 'mock';
      const subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理', '信息'];
      const genClassData = (baseDelta: number) =>
        subjects.map(sub => {
          const avg = 85 + baseDelta + (Math.random() - 0.5) * 10;
          return { subject: sub, avg: parseFloat(avg.toFixed(2)), max: parseFloat((avg + 20 + Math.random() * 10).toFixed(1)), min: parseFloat((avg - 25 - Math.random() * 10).toFixed(1)), pass_rate: parseFloat((55 + baseDelta + Math.random() * 20).toFixed(1)), excellent_rate: parseFloat((15 + baseDelta / 2 + Math.random() * 10).toFixed(1)), std_dev: parseFloat((12 + Math.random() * 5).toFixed(2)) };
        });
      classes = [
        { id: 'c0', name: '高一(1)班', data: genClassData(3) },
        { id: 'c1', name: '高一(2)班', data: genClassData(0) },
        { id: 'c2', name: '高一(3)班', data: genClassData(-2) },
        { id: 'c3', name: '高二(1)班', data: genClassData(5) },
        { id: 'c4', name: '高二(2)班', data: genClassData(1) },
      ];
    }

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

    // 科目维度横向对比图表数据（从 classes 数据中动态提取科目列表）
    const allSubjects = Array.from(new Set(classes.flatMap(c => c.data.map(d => d.subject))));
    const subjectCompareChart = allSubjects.map((sub: string) => {
      const entry: any = { subject: sub };
      classes.forEach(cls => {
        const subData = cls.data.find(d => d.subject === sub);
        entry[cls.name] = subData?.avg ?? null;
      });
      return entry;
    });

    // 各班优势/劣势科目精细化分析
    const strengthAnalysis = classRanking.map(cls => {
      const sorted = [...cls.subject_data].sort((a, b) => b.avg - a.avg);
      const topSubjects = sorted.slice(0, 3).map(s => s.subject);
      const weakSubjects = sorted.slice(-3).map(s => s.subject);
      const bestClass = classRanking[0];
      const gap = bestClass.overall_avg - cls.overall_avg;

      // 每个薄弱科目与第一名的具体差距
      const weakDetails = weakSubjects.map(sub => {
        const myCls = cls.subject_data.find(s => s.subject === sub);
        const bestCls = bestClass.subject_data.find(s => s.subject === sub);
        const diff = bestCls && myCls ? parseFloat((bestCls.avg - myCls.avg).toFixed(1)) : 0;
        return { subject: sub, my_avg: myCls?.avg ?? 0, best_avg: bestCls?.avg ?? 0, gap: diff };
      });

      // 可操作建议（具体到科目 + 措施）
      const actionItems = weakDetails
        .filter(d => d.gap > 2)
        .map(d => `${d.subject}落后${d.gap}分（均分${d.my_avg}→${d.best_avg}），建议增加练习题量并与${bestClass.class_name}${d.subject}教师交流`);

      const suggestion = cls.rank === 1
        ? `${cls.class_name}年级第一（均分${cls.overall_avg}），强势科目${topSubjects.join('/')}，建议分享备课资料和教学方法给其他班级。`
        : [
            `${cls.class_name}综合排名第${cls.rank}，距第一名差${gap.toFixed(1)}分。`,
            `薄弱科目重点攻坚：${weakDetails.map(d => `${d.subject}(差${d.gap}分)`).join('、')}。`,
            actionItems.length > 0 ? `建议措施：${actionItems[0]}。` : '',
          ].filter(Boolean).join('');

      return {
        class_name: cls.class_name,
        rank: cls.rank,
        overall_avg: cls.overall_avg,
        strengths: topSubjects,
        weaknesses: weakSubjects,
        weak_details: weakDetails,
        gap_to_first: parseFloat(gap.toFixed(2)),
        action_items: actionItems,
        suggestion,
      };
    });

    return NextResponse.json({
      success: true,
      data_source: dataSource,
      class_ranking: classRanking,
      subject_compare_chart: subjectCompareChart,
      strength_analysis: strengthAnalysis,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
