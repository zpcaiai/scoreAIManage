"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
const CLASS_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

interface SegItem { label: string; count: number; rate: number }
interface ClassData {
  class_id: string; class_name: string; avg: number; max: number; min: number;
  count: number; segments: SegItem[]; sorted_scores: number[];
}
interface SubjectData {
  subject: string; class_data: ClassData[];
  chart_data: any[]; best_class: string; worst_class: string; gap: number;
}

export default function SubjectSegmentChart() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'segment' | 'curve' | 'avg' | 'suggest'>('segment');

  const subjects = ['all', '语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理', '信息'];

  useEffect(() => {
    const url = selectedSubject === 'all'
      ? '/api/analytics/subject-segments'
      : `/api/analytics/subject-segments?subject=${encodeURIComponent(selectedSubject)}`;
    setLoading(true);
    fetch(url).then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, [selectedSubject]);

  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400">加载中...</div>;
  if (!data) return null;
  if (data.success === false) return <div className="flex items-center justify-center h-48 text-red-500">获取数据失败：{data.message || data.error || '无权访问'}</div>;
  if (!data.by_subject) return <div className="flex items-center justify-center h-48 text-gray-400">暂无数据</div>;

  const subjectList: SubjectData[] = data.by_subject;
  const classNames: string[] = data.classes;

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-800">年级层面 — 科目×班级分数段下钻</h2>

      {/* 科目选择 */}
      <div className="flex flex-wrap gap-2">
        {subjects.map(s => (
          <button key={s}
            onClick={() => setSelectedSubject(s)}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
              selectedSubject === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'
            }`}
          >{s === 'all' ? '全部科目' : s}</button>
        ))}
      </div>

      {/* 视图切换 */}
      <div className="flex gap-2 border-b pb-2">
        {[
          { key: 'segment', label: '分数段分布' },
          { key: 'curve',   label: '分布曲线' },
          { key: 'avg',     label: '均分对比' },
          { key: 'suggest', label: '向优秀班学习' },
        ].map(tab => (
          <button key={tab.key}
            onClick={() => setViewMode(tab.key as any)}
            className={`px-4 py-1.5 text-sm rounded-t font-medium ${
              viewMode === tab.key ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-blue-600'
            }`}
          >{tab.label}</button>
        ))}
      </div>

      {/* 分布曲线：各班级从高到低展示 */}
      {viewMode === 'curve' && (
        <div className="space-y-6">
          {subjectList.map(sub => {
            // 每个班级分数从高到低排序，用序号作为 X轴（最多取50点）
            const maxLen = Math.min(50, Math.max(...sub.class_data.map(c => c.sorted_scores.length)));
            const step = Math.max(1, Math.floor(Math.max(...sub.class_data.map(c => c.sorted_scores.length)) / maxLen));
            const curveData = Array.from({ length: maxLen }, (_, i) => {
              const srcIdx = i * step;
              const pt: any = { rank: srcIdx + 1 };
              sub.class_data.forEach(cls => {
                pt[cls.class_name] = cls.sorted_scores[srcIdx] ?? null;
              });
              return pt;
            });
            return (
              <div key={sub.subject} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-800">{sub.subject} — 各班成绩分布曲线（从高到低）</h3>
                  <span className="text-xs text-gray-400">全部学生成绩从高到低排列（最多取样50点）</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={curveData} margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="rank" label={{ value: '名次', position: 'insideBottomRight', offset: -5 }} tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip formatter={(v: any) => [`${v}分`]} />
                    <Legend />
                    {sub.class_data.map((cls, i) => (
                      <Line key={cls.class_id} type="monotone" dataKey={cls.class_name}
                        stroke={CLASS_COLORS[i % CLASS_COLORS.length]} strokeWidth={2}
                        dot={false} connectNulls />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      )}

      {/* 分数段分布 */}
      {viewMode === 'segment' && (
        <div className="space-y-6">
          {subjectList.map(sub => (
            <div key={sub.subject} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">{sub.subject}</h3>
                <span className="text-xs text-gray-400">班级均分差距 {sub.gap} 分</span>
              </div>
              {/* 各班分数段横向对比柱形图（比率%） */}
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sub.chart_data} layout="vertical" margin={{ left: 90 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" unit="%" domain={[0, 100]} />
                  <YAxis type="category" dataKey="segment" tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => `${v}%`} />
                  <Legend />
                  {classNames.map((cls, i) => (
                    <Bar key={cls} dataKey={cls} fill={CLASS_COLORS[i % CLASS_COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
              {/* 详细数据表 */}
              <table className="w-full text-xs mt-3 border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border px-2 py-1 text-left">班级</th>
                    <th className="border px-2 py-1 text-right">均分</th>
                    <th className="border px-2 py-1 text-right">最高</th>
                    <th className="border px-2 py-1 text-right">最低</th>
                    {sub.class_data[0]?.segments.map(seg => (
                      <th key={seg.label} className="border px-2 py-1 text-right">{seg.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sub.class_data.map((cls, ri) => (
                    <tr key={cls.class_id} className={ri === 0 ? 'bg-green-50' : ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border px-2 py-1 font-medium">{cls.class_name}{ri === 0 ? ' 🥇' : ''}</td>
                      <td className="border px-2 py-1 text-right font-bold text-blue-600">{cls.avg}</td>
                      <td className="border px-2 py-1 text-right text-green-600">{cls.max}</td>
                      <td className="border px-2 py-1 text-right text-red-500">{cls.min}</td>
                      {cls.segments.map(seg => (
                        <td key={seg.label} className="border px-2 py-1 text-right">
                          {seg.count}人 <span className="text-gray-400">({seg.rate}%)</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* 均分对比柱形图 */}
      {viewMode === 'avg' && (
        <div className="space-y-6">
          {subjectList.map(sub => (
            <div key={sub.subject} className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">{sub.subject} — 各班均分（从高到低）</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={sub.class_data.map(c => ({ name: c.class_name, 均分: c.avg, 最高分: c.max, 最低分: c.min }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[60, 150]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="均分" fill="#3b82f6" />
                  <Bar dataKey="最高分" fill="#10b981" />
                  <Bar dataKey="最低分" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}

      {/* 向优秀班学习建议 */}
      {viewMode === 'suggest' && (
        <div className="space-y-3">
          {data.suggestions.map((s: any, i: number) => (
            <div key={i} className={`p-4 rounded-lg border-l-4 ${
              s.suggestion.includes('差距较大') ? 'border-orange-400 bg-orange-50' : 'border-green-400 bg-green-50'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-gray-700">{s.subject}</span>
                {s.suggestion.includes('差距较大') && <span className="text-xs bg-orange-200 text-orange-700 px-2 py-0.5 rounded-full">需改进</span>}
              </div>
              <p className="text-sm text-gray-600">{s.suggestion}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
