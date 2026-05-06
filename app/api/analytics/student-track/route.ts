import { NextRequest, NextResponse } from 'next/server';
import { fetchSummariesForExam, fetchClasses } from '@/lib/analytics-db';

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

// ── shared result builder ────────────────────────────────────────────────
function buildResult(classId: string, className: string, gradeTotalStudents: number, examStats: any[], studentAnalysis: any[], studentId: string | null, dataSource: string) {
  const byLabel: Record<string, typeof studentAnalysis> = {
    '持续进步': studentAnalysis.filter(s => s.classification.label === '持续进步'),
    '退步预警': studentAnalysis.filter(s => s.classification.label === '退步预警'),
    '波动较大': studentAnalysis.filter(s => s.classification.label === '波动较大'),
    '成绩稳定': studentAnalysis.filter(s => s.classification.label === '成绩稳定'),
  };
  const result: any = {
    success: true, data_source: dataSource,
    class_id: classId, class_name: className,
    grade_total_students: gradeTotalStudents,
    exam_stats: examStats,
    summary: { total: studentAnalysis.length, improving: byLabel['持续进步'].length, declining: byLabel['退步预警'].length, volatile: byLabel['波动较大'].length, stable: byLabel['成绩稳定'].length },
    priority_list: {
      need_attention: byLabel['退步预警'].map(s => ({ name: s.student_name, class_rank: s.current_class_rank, grade_rank: s.current_grade_rank, class_rank_change: s.class_rank_improvement, grade_rank_change: s.grade_rank_improvement, advice: s.advice })),
      need_encouragement: byLabel['持续进步'].slice(0, 5).map(s => ({ name: s.student_name, class_rank_improvement: s.class_rank_improvement, grade_rank_improvement: s.grade_rank_improvement })),
      need_stability: byLabel['波动较大'].map(s => ({ name: s.student_name, advice: s.advice })),
    },
    by_label: byLabel,
  };
  if (studentId) result.student_detail = studentAnalysis.find((s: any) => String(s.student_id) === studentId) || null;
  else result.all_students = studentAnalysis;
  return result;
}

// ── DB path: build allStudents from grade_summaries across multiple exams ──
async function loadFromDB(classId: string) {
  const EXAM_DEFS = [
    { exam_type: 'monthly', semester: '第一学期', academic_year: '2024-2025', name: '第一次月考' },
    { exam_type: 'midterm', semester: '第一学期', academic_year: '2024-2025', name: '期中考试' },
    { exam_type: 'monthly', semester: '第二学期', academic_year: '2024-2025', name: '第二次月考' },
    { exam_type: 'final',   semester: '第一学期', academic_year: '2024-2025', name: '期末考试' },
  ];

  const classes = await fetchClasses();
  const targetClass = classes.find(c => String(c.class_id) === classId) || classes[0];
  if (!targetClass) throw new Error('no class');

  // Fetch summaries for each exam
  const examDataList = await Promise.all(
    EXAM_DEFS.map(async ed => {
      const rows = await fetchSummariesForExam(ed.exam_type, ed.semester, ed.academic_year);
      return { ...ed, rows };
    })
  );

  // Filter to exams that have data
  const validExams = examDataList.filter(e => e.rows.length > 0);
  if (validExams.length < 2) throw new Error('insufficient exam data');

  // Build student map: student_id → { name, class, scores[] }
  const studentMap = new Map<number, { name: string; class_id: number; class_name: string; scores: { examName: string; total: number; classRank: number; gradeRank: number }[] }>();

  validExams.forEach(ed => {
    const allScores = ed.rows.map(r => Number(r.ten_subjects_total));
    const allAvg = allScores.reduce((a, b) => a + b, 0) / allScores.length;

    ed.rows.forEach(r => {
      if (!studentMap.has(r.student_id)) {
        studentMap.set(r.student_id, { name: r.student_name, class_id: r.class_id, class_name: r.class_name, scores: [] });
      }
      studentMap.get(r.student_id)!.scores.push({
        examName: ed.name,
        total: Number(r.ten_subjects_total),
        classRank: r.class_rank_ten_subjects,
        gradeRank: r.ten_subjects_rank,
      });
    });
  });

  // Build exam total_score map (use 750 as default since subjects.full_score sum ≈ 750)
  const exams = validExams.map((e, i) => ({ id: `e${i}`, name: e.name, total_score: 750 }));

  // Filter to target class
  const targetStudents = Array.from(studentMap.values())
    .filter(s => String(s.class_id) === classId || s.class_id === targetClass.class_id);
  const allStudents = Array.from(studentMap.values());

  return { exams, targetStudents, allStudents, targetClass };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId') || 'c0';
    const studentId = searchParams.get('studentId');

    // ── Try database first ──────────────────────────────────────────────
    let useDB = false;
    let dbResult: Awaited<ReturnType<typeof loadFromDB>> | null = null;
    try {
      dbResult = await loadFromDB(classId);
      useDB = true;
    } catch { /* fall through to mock */ }

    if (useDB && dbResult) {
      const { exams, targetStudents, allStudents, targetClass } = dbResult;

      const examStats = exams.map((exam, ei) => {
        const classScores = targetStudents.map(s => s.scores[ei]?.total ?? 0).filter(Boolean);
        const gradeScores = allStudents.map(s => s.scores[ei]?.total ?? 0).filter(Boolean);
        const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
        const std = (arr: number[]) => { const a = avg(arr); return Math.sqrt(arr.reduce((s, b) => s + Math.pow(b - a, 2), 0) / (arr.length || 1)); };
        return { ...exam, class_avg: parseFloat(avg(classScores).toFixed(2)), class_std: parseFloat(std(classScores).toFixed(2)), grade_avg: parseFloat(avg(gradeScores).toFixed(2)), grade_std: parseFloat(std(gradeScores).toFixed(2)), class_size: classScores.length, grade_size: gradeScores.length };
      });

      const studentAnalysis = targetStudents.map(student => {
        const examRecords = exams.map((exam, ei) => {
          const rec = student.scores[ei];
          const stat = examStats[ei];
          const score = rec?.total ?? 0;
          return {
            exam_id: exam.id, exam_name: exam.name, total_score: exam.total_score, score,
            score_pct: parseFloat(((score / exam.total_score) * 100).toFixed(1)),
            class_rank: rec?.classRank ?? 0, class_rank_change: ei > 0 ? (student.scores[ei - 1]?.classRank ?? 0) - (rec?.classRank ?? 0) : 0,
            grade_rank: rec?.gradeRank ?? 0, grade_rank_change: ei > 0 ? (student.scores[ei - 1]?.gradeRank ?? 0) - (rec?.gradeRank ?? 0) : 0,
            class_z: zScore(score, stat.class_avg, stat.class_std),
            grade_z: zScore(score, stat.grade_avg, stat.grade_std),
            class_avg: stat.class_avg, grade_avg: stat.grade_avg,
          };
        });
        const classification = classifyStudent(examRecords.map(r => r.grade_z));
        const first = examRecords[0], last = examRecords[examRecords.length - 1];
        const classRI = (first.class_rank || 0) - (last.class_rank || 0);
        const gradeRI = (first.grade_rank || 0) - (last.grade_rank || 0);
        const absScoreImprove = last.total_score === first.total_score
          ? parseFloat((last.score - first.score).toFixed(1)) : null;
        return {
          student_id: student.class_id * 1000 + targetStudents.indexOf(student),
          student_name: student.name, class_name: student.class_name, classification,
          class_rank_improvement: classRI, grade_rank_improvement: gradeRI,
          score_pct_improvement: parseFloat((last.score_pct - first.score_pct).toFixed(1)),
          abs_score_improvement: absScoreImprove,
          current_class_rank: last.class_rank, current_grade_rank: last.grade_rank,
          current_score: last.score, current_total: last.total_score,
          exam_records: examRecords, advice: genAdvice(student.name, classification.label, classRI, gradeRI),
          chart_data: examRecords.map(r => ({ name: r.exam_name, 得分率: r.score_pct, 班级排名: r.class_rank, 年级排名: r.grade_rank, 班级均分率: parseFloat(((r.class_avg / r.total_score) * 100).toFixed(1)), 年级均分率: parseFloat(((r.grade_avg / r.total_score) * 100).toFixed(1)), 原始分: r.score })),
        };
      });

      return NextResponse.json(buildResult(classId, targetClass.class_name, allStudents.length, examStats, studentAnalysis, studentId, 'database'));
    }

    // ── Mock fallback ───────────────────────────────────────────────────
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
      const scorePctImprove = parseFloat((lastRecord.score_pct - firstRecord.score_pct).toFixed(1));
      // 绝对分数进步（同总分才可直接对比，否则用得分率差）
      const absScoreImprove = lastRecord.total_score === firstRecord.total_score
        ? parseFloat((lastRecord.score - firstRecord.score).toFixed(1))
        : null;

      return {
        student_id: student.id,
        student_name: student.name,
        class_name: student.class_name,
        classification,
        class_rank_improvement: classRankImprove,
        grade_rank_improvement: gradeRankImprove,
        score_pct_improvement: scorePctImprove,
        abs_score_improvement: absScoreImprove,
        current_class_rank: lastRecord.class_rank,
        current_grade_rank: lastRecord.grade_rank,
        current_score: lastRecord.score,
        current_total: lastRecord.total_score,
        exam_records: examRecords,
        advice: genAdvice(student.name, classification.label, classRankImprove, gradeRankImprove),
        chart_data: examRecords.map(r => ({
          name: r.exam_name,
          得分率: r.score_pct,
          班级排名: r.class_rank,
          年级排名: r.grade_rank,
          班级均分率: parseFloat(((r.class_avg / r.total_score) * 100).toFixed(1)),
          年级均分率: parseFloat(((r.grade_avg / r.total_score) * 100).toFixed(1)),
          原始分: r.score,
        })),
      };
    });

    const mockClasses = classes as { id: string; name: string; baseDelta: number }[];
    return NextResponse.json(buildResult(classId, mockClasses.find(c => c.id === classId)?.name || classId, allStudents.length, examStats, studentAnalysis, studentId, 'mock'));
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
