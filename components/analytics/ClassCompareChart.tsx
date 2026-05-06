"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";

const CLASS_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

interface SubjectData {
  subject: string; avg: number; max: number; min: number;
  pass_rate: number; excellent_rate: number; std_dev: number;
}
interface ClassRanking {
  class_id: string; class_name: string; rank: number;
  overall_avg: number; pass_rate: number; subject_data: SubjectData[];
}
interface WeakDetail { subject: string; my_avg: number; best_avg: number; gap: number }
interface StrengthItem {
  class_name: string; rank: number; overall_avg: number;
  strengths: string[]; weaknesses: string[];
  weak_details: WeakDetail[]; gap_to_first: number;
  action_items: string[]; suggestion: string;
}

export default function ClassCompareChart() {
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'subject' | 'radar' | 'rank' | 'strength'>('subject');

  useEffect(() => {
    fetch("/api/analytics/class-compare")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400">加载中...</div>;
  if (!data) return null;

  const ranking: ClassRanking[] = data.class_ranking;
  const classNames: string[] = ranking.map(c => c.class_name);
  const subjectChart: any[] = data.subject_compare_chart;
  const strength: StrengthItem[] = data.strength_analysis;

  // 雷达图数据：归一化到0-100
  const radarData = subjectChart.map(row => {
    const vals = classNames.map(n => row[n] ?? 0);
    const maxVal = Math.max(...vals) || 1;
    const entry: any = { subject: row.subject };
    classNames.forEach(n => { entry[n] = parseFloat(((row[n] ?? 0) / maxVal * 100).toFixed(1)); });
    return entry;
  });

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-800">班级层面 — 各科目横向对比</h2>

      {/* Tab 切换 */}
      <div className="flex gap-2 border-b pb-2 flex-wrap">
        {[
          { key: 'subject', label: '科目均分对比' },
          { key: 'radar',   label: '综合雷达图' },
          { key: 'rank',    label: '班级排名' },
          { key: 'strength', label: '优劣势分析' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setViewMode(tab.key as any)}
            className={`px-4 py-1.5 text-sm rounded-t font-medium ${viewMode === tab.key ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-blue-600'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 科目均分横向对比柱形图 */}
      {viewMode === 'subject' && (
        <div>
          <p className="text-xs text-gray-400 mb-2">各班各科目平均分（横轴为科目，每组对应一个班级）</p>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={subjectChart} margin={{ left: 0, right: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis domain={[60, 100]} />
              <Tooltip />
              <Legend />
              {classNames.map((cls, i) => (
                <Bar key={cls} dataKey={cls} fill={CLASS_COLORS[i % CLASS_COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 综合雷达图 */}
      {viewMode === 'radar' && (
        <div>
          <p className="text-xs text-gray-400 mb-2">各班综合能力雷达（同科目内相对归一化，越靠外越强）</p>
          <ResponsiveContainer width="100%" height={360}>
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
              <Tooltip />
              <Legend />
              {classNames.map((cls, i) => (
                <Radar key={cls} name={cls} dataKey={cls}
                  stroke={CLASS_COLORS[i % CLASS_COLORS.length]}
                  fill={CLASS_COLORS[i % CLASS_COLORS.length]} fillOpacity={0.1} />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 班级排名表 */}
      {viewMode === 'rank' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border px-3 py-2 text-center">排名</th>
                <th className="border px-3 py-2 text-left">班级</th>
                <th className="border px-3 py-2 text-right">综合均分</th>
                <th className="border px-3 py-2 text-right">及格率</th>
                {subjectChart.slice(0, 5).map(s => (
                  <th key={s.subject} className="border px-2 py-2 text-right text-xs">{s.subject}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranking.map((cls, i) => (
                <tr key={cls.class_id} className={i === 0 ? 'bg-green-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border px-3 py-2 text-center font-bold text-blue-600">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : cls.rank}
                  </td>
                  <td className="border px-3 py-2 font-medium">{cls.class_name}</td>
                  <td className="border px-3 py-2 text-right font-bold text-blue-600">{cls.overall_avg}</td>
                  <td className="border px-3 py-2 text-right">{cls.pass_rate}%</td>
                  {subjectChart.slice(0, 5).map(s => (
                    <td key={s.subject} className="border px-2 py-2 text-right text-xs">{s[cls.class_name] ?? '-'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 优劣势精细化分析 */}
      {viewMode === 'strength' && (
        <div className="space-y-4">
          {strength.map((cls, i) => (
            <div key={i} className={`p-4 rounded-lg border-l-4 ${i === 0 ? 'border-green-400 bg-green-50' : 'border-blue-300 bg-blue-50'}`}>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-bold text-gray-800">#{cls.rank} {cls.class_name}</span>
                <span className="text-sm text-blue-600 font-medium">均分 {cls.overall_avg}</span>
                {cls.gap_to_first > 0 && (
                  <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">↓距第一 {cls.gap_to_first} 分</span>
                )}
              </div>

              {/* 强势/薄弱科目 */}
              <div className="flex flex-wrap gap-3 mb-3 text-sm">
                <div>
                  <span className="text-gray-500 text-xs">强势：</span>
                  {cls.strengths.map(s => (
                    <span key={s} className="ml-1 px-2 py-0.5 bg-green-200 text-green-800 rounded-full text-xs">{s}</span>
                  ))}
                </div>
                <div>
                  <span className="text-gray-500 text-xs">薄弱：</span>
                  {cls.weaknesses.map(s => (
                    <span key={s} className="ml-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">{s}</span>
                  ))}
                </div>
              </div>

              {/* 薄弱科目具体差距表 */}
              {cls.weak_details && cls.weak_details.length > 0 && cls.rank > 1 && (
                <div className="mb-3 overflow-x-auto">
                  <table className="text-xs border-collapse w-full max-w-sm">
                    <thead>
                      <tr className="bg-white/60">
                        <th className="border px-2 py-1 text-left">薄弱科目</th>
                        <th className="border px-2 py-1 text-right">本班均分</th>
                        <th className="border px-2 py-1 text-right">第一名均分</th>
                        <th className="border px-2 py-1 text-right">差距</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cls.weak_details.map((d: WeakDetail) => (
                        <tr key={d.subject} className="bg-white/40">
                          <td className="border px-2 py-1 font-medium">{d.subject}</td>
                          <td className="border px-2 py-1 text-right">{d.my_avg}</td>
                          <td className="border px-2 py-1 text-right text-green-700">{d.best_avg}</td>
                          <td className={`border px-2 py-1 text-right font-bold ${d.gap > 5 ? 'text-red-600' : 'text-amber-600'}`}>
                            -{d.gap}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 可操作建议 */}
              <p className="text-sm text-gray-700 mb-1">{cls.suggestion}</p>
              {cls.action_items && cls.action_items.length > 0 && (
                <div className="mt-2 space-y-1">
                  {cls.action_items.map((a: string, ai: number) => (
                    <div key={ai} className="flex items-start gap-1 text-xs text-gray-600">
                      <span className="text-blue-500 mt-0.5 flex-shrink-0">▶</span>
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
