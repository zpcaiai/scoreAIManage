"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// 页面日志工具
const logPage = (action: string, details?: any) => {
  console.log(`[PAGE] StudentReport - ${new Date().toISOString()} - ${action}`, details);
};

const labelColors: Record<string, string> = {
  '持续进步': 'bg-green-100 text-green-700 border-green-300',
  '退步预警': 'bg-red-100 text-red-700 border-red-300',
  '波动较大': 'bg-orange-100 text-orange-700 border-orange-300',
  '成绩稳定': 'bg-blue-100 text-blue-700 border-blue-300',
};

export default function StudentReportPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('c0_s0');
  const [classId, setClassId] = useState<string>('c0');
  const [allStudents, setAllStudents] = useState<any[]>([]);

  // 页面加载日志
  useEffect(() => {
    logPage('PAGE_LOADED');
  }, []);

  useEffect(() => {
    logPage('FETCH_STUDENTS', { classId });
    setLoading(true);
    fetch(`/api/analytics/student-track?classId=${classId}`)
      .then(r => r.json())
      .then(d => {
        logPage('STUDENTS_FETCHED', { classId, count: d.all_students?.length || 0 });
        setAllStudents(d.all_students || []);
        const first = d.all_students?.[0];
        if (first) {
          logPage('AUTO_SELECT_FIRST_STUDENT', { studentId: first.student_id });
          setSelectedId(first.student_id);
        }
        setLoading(false);
      })
      .catch(err => {
        logPage('FETCH_ERROR', { classId, error: err.message });
        setLoading(false);
      });
  }, [classId]);

  // 班级变更日志
  const handleClassChange = (newClassId: string) => {
    logPage('CLASS_CHANGED', { from: classId, to: newClassId });
    setClassId(newClassId);
  };

  // 学生变更日志
  const handleStudentChange = (newStudentId: string) => {
    const student = allStudents.find(s => s.student_id === newStudentId);
    logPage('STUDENT_CHANGED', { studentId: newStudentId, name: student?.student_name });
    setSelectedId(newStudentId);
  };

  const student = allStudents.find(s => s.student_id === selectedId);

  const classes = [
    { id: 'c0', name: '高一(1)班' },
    { id: 'c1', name: '高一(2)班' },
    { id: 'c2', name: '高一(3)班' },
    { id: 'c3', name: '高一(4)班' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* 页头 */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h1 className="text-2xl font-bold text-gray-900">学生个人成长报告</h1>
          <p className="text-gray-400 text-sm mt-1">多次考试进步轨迹 · 班级/年级双维度名次 · 个性化建议</p>
          <div className="flex flex-wrap gap-3 mt-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">选择班级</label>
              <select value={classId} onChange={e => handleClassChange(e.target.value)}
                aria-label="选择班级" className="border rounded px-3 py-1.5 text-sm">
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">选择学生</label>
              <select value={selectedId} onChange={e => handleStudentChange(e.target.value)}
                aria-label="选择学生" className="border rounded px-3 py-1.5 text-sm min-w-[160px]">
                {allStudents.map(s => (
                  <option key={s.student_id} value={s.student_id}>{s.student_name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading && <div className="text-center py-10 text-gray-400">加载中...</div>}

        {student && (
          <>
            {/* 综合卡片 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl shadow p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{student.current_class_rank}</div>
                <div className="text-xs text-gray-500 mt-1">班级排名</div>
                <div className={`text-sm font-medium mt-1 ${student.class_rank_improvement > 0 ? 'text-green-500' : student.class_rank_improvement < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                  {student.class_rank_improvement > 0 ? `↑${student.class_rank_improvement}名` : student.class_rank_improvement < 0 ? `↓${Math.abs(student.class_rank_improvement)}名` : '持平'}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">{student.current_grade_rank}</div>
                <div className="text-xs text-gray-500 mt-1">年级排名</div>
                <div className={`text-sm font-medium mt-1 ${student.grade_rank_improvement > 0 ? 'text-green-500' : student.grade_rank_improvement < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                  {student.grade_rank_improvement > 0 ? `↑${student.grade_rank_improvement}名` : student.grade_rank_improvement < 0 ? `↓${Math.abs(student.grade_rank_improvement)}名` : '持平'}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow p-4 text-center">
                <div className={`text-3xl font-bold ${student.score_pct_improvement > 0 ? 'text-green-600' : student.score_pct_improvement < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                  {student.score_pct_improvement > 0 ? `+${student.score_pct_improvement}` : student.score_pct_improvement}%
                </div>
                <div className="text-xs text-gray-500 mt-1">得分率变化</div>
                <div className="text-xs text-gray-400 mt-1">（标准化，可跨试卷比较）</div>
              </div>
              <div className="bg-white rounded-xl shadow p-4 text-center">
                <div className={`text-sm font-bold px-3 py-2 rounded-full inline-block border ${labelColors[student.classification.label]}`}>
                  {student.classification.label}
                </div>
                <div className="text-xs text-gray-400 mt-2">{student.classification.desc}</div>
              </div>
            </div>

            {/* 个性化建议 */}
            <div className="bg-white rounded-xl shadow p-5">
              <h3 className="font-semibold text-gray-700 mb-2">💡 个性化学习建议</h3>
              <p className="text-gray-700 text-sm leading-relaxed">{student.advice}</p>
            </div>

            {/* 图表：得分率 + 排名趋势 */}
            <div className="bg-white rounded-xl shadow p-5">
              <h3 className="font-semibold text-gray-700 mb-4">📈 历次考试进步轨迹</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-gray-400 mb-2">得分率（标准化，可跨不同总分考试比较）</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={student.chart_data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis domain={[40, 100]} unit="%" />
                      <Tooltip formatter={(v: any) => `${v}%`} />
                      <Legend />
                      <Line type="monotone" dataKey="得分率" stroke="#3b82f6" strokeWidth={2} dot={{ r: 5 }} />
                      <Line type="monotone" dataKey="班级均分率" stroke="#10b981" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                      <Line type="monotone" dataKey="年级均分率" stroke="#9ca3af" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-2">名次变化（值越小越好）</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={student.chart_data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis reversed />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="班级排名" stroke="#f59e0b" strokeWidth={2} dot={{ r: 5 }} />
                      <Line type="monotone" dataKey="年级排名" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 每次考试详情表 */}
            <div className="bg-white rounded-xl shadow p-5">
              <h3 className="font-semibold text-gray-700 mb-3">📋 历次考试详情</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border px-3 py-2 text-left">考试</th>
                      <th className="border px-3 py-2 text-right">得分/总分</th>
                      <th className="border px-3 py-2 text-right">得分率</th>
                      <th className="border px-3 py-2 text-right">班级排名</th>
                      <th className="border px-3 py-2 text-right">名次变化</th>
                      <th className="border px-3 py-2 text-right">年级排名</th>
                      <th className="border px-3 py-2 text-right">年级变化</th>
                    </tr>
                  </thead>
                  <tbody>
                    {student.exam_records.map((r: any, i: number) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border px-3 py-2">{r.exam_name}</td>
                        <td className="border px-3 py-2 text-right font-medium">{r.score}/{r.total_score}</td>
                        <td className="border px-3 py-2 text-right text-blue-600">{r.score_pct}%</td>
                        <td className="border px-3 py-2 text-right">{r.class_rank}名</td>
                        <td className={`border px-3 py-2 text-right font-medium ${r.class_rank_change > 0 ? 'text-green-600' : r.class_rank_change < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                          {r.class_rank_change > 0 ? `↑${r.class_rank_change}` : r.class_rank_change < 0 ? `↓${Math.abs(r.class_rank_change)}` : '—'}
                        </td>
                        <td className="border px-3 py-2 text-right">{r.grade_rank}名</td>
                        <td className={`border px-3 py-2 text-right font-medium ${r.grade_rank_change > 0 ? 'text-green-600' : r.grade_rank_change < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                          {r.grade_rank_change > 0 ? `↑${r.grade_rank_change}` : r.grade_rank_change < 0 ? `↓${Math.abs(r.grade_rank_change)}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
