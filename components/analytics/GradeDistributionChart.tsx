"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer
} from "recharts";

interface ClassAnalysis {
  class_id: string;
  class_name: string;
  count: number;
  avg: number;
  max: number;
  min: number;
  std_dev: number;
  q1: number;
  q2: number;
  q3: number;
  pass_rate: number;
  excellent_rate: number;
  segments: { label: string; count: number; rate: number }[];
}

interface Suggestion {
  class_name: string;
  rank: number;
  suggestion: string;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function GradeDistributionChart() {
  const [data, setData] = useState<{ class_analysis: ClassAnalysis[]; suggestions: Suggestion[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"bar" | "quantile" | "segment" | "suggest">("bar");

  useEffect(() => {
    fetch("/api/analytics/grade-distribution")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400">加载中...</div>;
  if (!data) return <div className="text-red-500 p-4">数据加载失败</div>;

  const avgChartData = data.class_analysis.map(c => ({
    name: c.class_name,
    平均分: c.avg,
    最高分: c.max,
    最低分: c.min,
    标准差: c.std_dev,
  }));

  const quantileData = data.class_analysis.map(c => ({
    name: c.class_name,
    Q1: c.q1,
    Q2中位数: c.q2,
    Q3: c.q3,
    优秀率: c.excellent_rate,
    及格率: c.pass_rate,
  }));

  const tabs = [
    { key: "bar", label: "均分对比" },
    { key: "quantile", label: "分位数" },
    { key: "segment", label: "分数段" },
    { key: "suggest", label: "教师建议" },
  ] as const;

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-800">年级层面 — 宏观对比分析</h2>

      {/* Tab 切换 */}
      <div className="flex gap-2 border-b pb-2">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-1.5 rounded-t text-sm font-medium transition-colors ${
              activeTab === t.key ? "bg-blue-600 text-white" : "text-gray-500 hover:text-blue-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 均分柱形图 */}
      {activeTab === "bar" && (
        <div>
          <p className="text-sm text-gray-500 mb-3">各班级平均分、最高分、最低分横向对比（从高到低排序）</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={avgChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[40, 160]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="平均分" fill="#3b82f6" />
              <Bar dataKey="最高分" fill="#10b981" />
              <Bar dataKey="最低分" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
          {/* 统计表格 */}
          <table className="w-full text-sm mt-4 border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border px-3 py-2 text-left">班级</th>
                <th className="border px-3 py-2 text-right">平均分</th>
                <th className="border px-3 py-2 text-right">最高分</th>
                <th className="border px-3 py-2 text-right">最低分</th>
                <th className="border px-3 py-2 text-right">标准差</th>
                <th className="border px-3 py-2 text-right">及格率</th>
              </tr>
            </thead>
            <tbody>
              {data.class_analysis.map((c, i) => (
                <tr key={c.class_id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border px-3 py-2 font-medium">{c.class_name}</td>
                  <td className="border px-3 py-2 text-right text-blue-600 font-bold">{c.avg}</td>
                  <td className="border px-3 py-2 text-right text-green-600">{c.max}</td>
                  <td className="border px-3 py-2 text-right text-red-500">{c.min}</td>
                  <td className="border px-3 py-2 text-right text-gray-500">{c.std_dev}</td>
                  <td className="border px-3 py-2 text-right">{c.pass_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 分位数分析 */}
      {activeTab === "quantile" && (
        <div>
          <p className="text-sm text-gray-500 mb-3">四分位数分析：Q1(25%)、中位数(50%)、Q3(75%)</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={quantileData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[50, 155]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Q1" stroke="#ef4444" strokeWidth={2} dot />
              <Line type="monotone" dataKey="Q2中位数" stroke="#3b82f6" strokeWidth={2} dot />
              <Line type="monotone" dataKey="Q3" stroke="#10b981" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 分数段分布 */}
      {activeTab === "segment" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">各班级分数段人数分布</p>
          {data.class_analysis.map(cls => (
            <div key={cls.class_id} className="border rounded-lg p-4">
              <h4 className="font-semibold text-gray-700 mb-2">{cls.class_name}（共{cls.count}人）</h4>
              <div className="flex gap-2 flex-wrap">
                {cls.segments.map(seg => (
                  <div key={seg.label} className="flex-1 min-w-[120px] bg-gray-50 rounded p-3 text-center border">
                    <div className="text-xs text-gray-500">{seg.label}</div>
                    <div className="text-2xl font-bold text-blue-600">{seg.count}</div>
                    <div className="text-sm text-gray-400">{seg.rate}%</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 教师建议 */}
      {activeTab === "suggest" && (
        <div className="space-y-3">
          {data.suggestions.map((s, i) => (
            <div key={i} className={`p-4 rounded-lg border-l-4 ${
              i === 0 ? "border-green-500 bg-green-50" :
              i === 1 ? "border-blue-500 bg-blue-50" :
              "border-yellow-500 bg-yellow-50"
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  i === 0 ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-700"
                }`}>第{s.rank}名</span>
                <span className="font-semibold text-gray-800">{s.class_name}</span>
              </div>
              <p className="text-sm text-gray-600">{s.suggestion}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
