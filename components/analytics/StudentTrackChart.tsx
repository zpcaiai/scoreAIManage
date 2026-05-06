"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine
} from "recharts";

interface StudentSummary {
  student_id: string;
  student_name: string;
  classification: { label: string; color: string; desc: string };
  rank_improvement: number;
  score_improvement: number;
  current_rank: number;
  advice: string;
  chart_data: { name: string; score: number; rank: number; 班级均分: number }[];
}

interface PriorityList {
  need_attention: { name: string; rank: number; advice: string }[];
  need_encouragement: { name: string; improvement: number }[];
  need_stability: { name: string; advice: string }[];
}

const labelColors: Record<string, string> = {
  '持续进步': 'bg-green-100 text-green-700 border-green-300',
  '退步预警': 'bg-red-100 text-red-700 border-red-300',
  '波动较大': 'bg-orange-100 text-orange-700 border-orange-300',
  '成绩稳定': 'bg-blue-100 text-blue-700 border-blue-300',
  '数据不足': 'bg-gray-100 text-gray-600 border-gray-300',
};

export default function StudentTrackChart() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "priority" | "detail">("overview");
  const [filterLabel, setFilterLabel] = useState<string>("all");

  useEffect(() => {
    fetch("/api/analytics/student-track?classId=c0")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400">加载中...</div>;
  if (!data) return null;

  const allStudents: StudentSummary[] = data.all_students || [];
  const priority: PriorityList = data.priority_list;
  const summary = data.summary;

  const filtered = filterLabel === "all"
    ? allStudents
    : allStudents.filter(s => s.classification.label === filterLabel);

  const summaryCards = [
    { label: '持续进步', count: summary.improving, color: 'bg-green-50 border-green-200 text-green-700' },
    { label: '退步预警', count: summary.declining, color: 'bg-red-50 border-red-200 text-red-700' },
    { label: '波动较大', count: summary.volatile, color: 'bg-orange-50 border-orange-200 text-orange-700' },
    { label: '成绩稳定', count: summary.stable, color: 'bg-blue-50 border-blue-200 text-blue-700' },
  ];

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-800">学生层面 — 个人成绩追踪</h2>

      {/* 汇总卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summaryCards.map(card => (
          <button
            key={card.label}
            onClick={() => setFilterLabel(filterLabel === card.label ? "all" : card.label)}
            className={`p-3 rounded-lg border-2 text-center transition-all ${card.color} ${
              filterLabel === card.label ? "ring-2 ring-offset-1 ring-blue-400" : ""
            }`}
          >
            <div className="text-2xl font-bold">{card.count}</div>
            <div className="text-xs mt-1">{card.label}</div>
          </button>
        ))}
      </div>

      {/* Tab */}
      <div className="flex gap-2 border-b pb-2">
        {(["overview", "priority", "detail"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-t text-sm font-medium ${
              activeTab === tab ? "bg-blue-600 text-white" : "text-gray-500 hover:text-blue-600"
            }`}
          >
            {tab === "overview" ? "全班总览" : tab === "priority" ? "重点名单" : "个人详情"}
          </button>
        ))}
      </div>

      {/* 全班总览 */}
      {activeTab === "overview" && (
        <div className="overflow-y-auto max-h-80">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className="border px-3 py-2 text-left">学生</th>
                <th className="border px-3 py-2 text-center">分类</th>
                <th className="border px-3 py-2 text-right">当前排名</th>
                <th className="border px-3 py-2 text-right">名次变化</th>
                <th className="border px-3 py-2 text-right">分数变化</th>
                <th className="border px-3 py-2 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.student_id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border px-3 py-2 font-medium">{s.student_name}</td>
                  <td className="border px-3 py-2 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${labelColors[s.classification.label]}`}>
                      {s.classification.label}
                    </span>
                  </td>
                  <td className="border px-3 py-2 text-right">{s.current_rank}名</td>
                  <td className={`border px-3 py-2 text-right font-medium ${s.rank_improvement > 0 ? "text-green-600" : s.rank_improvement < 0 ? "text-red-500" : "text-gray-400"}`}>
                    {s.rank_improvement > 0 ? `↑${s.rank_improvement}` : s.rank_improvement < 0 ? `↓${Math.abs(s.rank_improvement)}` : "—"}
                  </td>
                  <td className={`border px-3 py-2 text-right font-medium ${s.score_improvement > 0 ? "text-green-600" : s.score_improvement < 0 ? "text-red-500" : "text-gray-400"}`}>
                    {s.score_improvement > 0 ? `+${s.score_improvement}` : s.score_improvement}
                  </td>
                  <td className="border px-3 py-2 text-center">
                    <button
                      onClick={() => { setSelectedStudent(s); setActiveTab("detail"); }}
                      className="text-blue-600 hover:underline text-xs"
                    >查看</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 重点名单 */}
      {activeTab === "priority" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-red-700 mb-2">🚨 需重点关注（退步预警）</h3>
            {priority.need_attention.length === 0
              ? <p className="text-sm text-gray-400">暂无</p>
              : priority.need_attention.map((s, i) => (
                <div key={i} className="bg-red-50 border border-red-200 rounded p-3 mb-2 text-sm">
                  <span className="font-semibold">{s.name}</span>（当前第{s.rank}名）
                  <p className="text-gray-600 mt-1">{s.advice}</p>
                </div>
              ))}
          </div>
          <div>
            <h3 className="font-semibold text-green-700 mb-2">🌟 需激励表扬（持续进步）</h3>
            {priority.need_encouragement.map((s, i) => (
              <div key={i} className="bg-green-50 border border-green-200 rounded p-2 mb-2 text-sm flex justify-between">
                <span className="font-semibold">{s.name}</span>
                <span className="text-green-600">名次提升 ↑{s.improvement}</span>
              </div>
            ))}
          </div>
          <div>
            <h3 className="font-semibold text-orange-700 mb-2">⚡ 需稳定状态（波动较大）</h3>
            {priority.need_stability.map((s, i) => (
              <div key={i} className="bg-orange-50 border border-orange-200 rounded p-3 mb-2 text-sm">
                <span className="font-semibold">{s.name}</span>
                <p className="text-gray-600 mt-1">{s.advice}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 个人详情 */}
      {activeTab === "detail" && selectedStudent && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg">{selectedStudent.student_name}</span>
            <span className={`text-sm px-3 py-1 rounded-full border ${labelColors[selectedStudent.classification.label]}`}>
              {selectedStudent.classification.label}
            </span>
            <span className="text-sm text-gray-500">当前第{selectedStudent.current_rank}名</span>
          </div>
          <p className="text-sm bg-blue-50 border border-blue-200 rounded p-3 text-blue-800">
            💡 {selectedStudent.advice}
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={selectedStudent.chart_data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="score" domain={[60, 155]} orientation="left" />
              <YAxis yAxisId="rank" domain={[1, 50]} orientation="right" reversed />
              <Tooltip />
              <Legend />
              <Line yAxisId="score" type="monotone" dataKey="score" name="个人分数" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              <Line yAxisId="score" type="monotone" dataKey="班级均分" stroke="#9ca3af" strokeWidth={1} strokeDasharray="5 5" dot={false} />
              <Line yAxisId="rank" type="monotone" dataKey="rank" name="班级排名(右轴)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {activeTab === "detail" && !selectedStudent && (
        <p className="text-gray-400 text-sm text-center py-8">请在「全班总览」中点击学生查看详情</p>
      )}
    </div>
  );
}
