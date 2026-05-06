"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine
} from "recharts";

interface TrendPoint {
  exam_name: string;
  avg: number;
  max: number;
  min: number;
  pass_rate: number;
}

interface ClassTrendData {
  class_id: string;
  class_name: string;
  trend: TrendPoint[];
  direction: { label: string; color: string; diff: string };
}

export default function ClassTrendChart() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"single" | "compare">("compare");

  useEffect(() => {
    const url = mode === "compare"
      ? "/api/analytics/class-trend?classId=c0&compareClassId=c1"
      : "/api/analytics/class-trend?classId=c0";
    setLoading(true);
    fetch(url).then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, [mode]);

  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400">加载中...</div>;
  if (!data) return null;

  const directionColor = (color: string) => {
    if (color === "green") return "text-green-600 bg-green-50 border-green-200";
    if (color === "red") return "text-red-600 bg-red-50 border-red-200";
    return "text-blue-600 bg-blue-50 border-blue-200";
  };

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">班级层面 — 历次考试趋势</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setMode("single")}
            className={`px-3 py-1.5 text-sm rounded ${mode === "single" ? "bg-blue-600 text-white" : "border text-gray-600"}`}
          >单班趋势</button>
          <button
            onClick={() => setMode("compare")}
            className={`px-3 py-1.5 text-sm rounded ${mode === "compare" ? "bg-blue-600 text-white" : "border text-gray-600"}`}
          >双班对比</button>
        </div>
      </div>

      {/* 趋势方向标签 */}
      <div className="flex gap-3 flex-wrap">
        {[data.main_class, data.compare_class].filter(Boolean).map((cls: ClassTrendData) => (
          <div key={cls.class_id} className={`px-3 py-2 rounded-lg border text-sm font-medium ${directionColor(cls.direction.color)}`}>
            {cls.class_name}：{cls.direction.label}（{cls.direction.diff >= '0' ? '+' : ''}{cls.direction.diff}分）
          </div>
        ))}
      </div>

      {/* 折线图 */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data.chart_data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis domain={[70, 110]} />
          <Tooltip />
          <Legend />
          {mode === "compare" ? (
            <>
              <Line type="monotone" dataKey="主班级" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="对比班级" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
            </>
          ) : (
            <>
              <Line type="monotone" dataKey="平均分" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="最高分" stroke="#10b981" strokeWidth={1} strokeDasharray="4 4" dot={false} />
              <Line type="monotone" dataKey="最低分" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 4" dot={false} />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* 数据表格 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border px-3 py-2 text-left">考试</th>
              <th className="border px-3 py-2 text-right">{data.main_class.class_name} 均分</th>
              {data.compare_class && (
                <th className="border px-3 py-2 text-right">{data.compare_class.class_name} 均分</th>
              )}
              {data.compare_class && <th className="border px-3 py-2 text-right">差距</th>}
            </tr>
          </thead>
          <tbody>
            {data.main_class.trend.map((t: TrendPoint, i: number) => {
              const cmp = data.compare_class?.trend[i];
              const diff = cmp ? parseFloat((t.avg - cmp.avg).toFixed(2)) : null;
              return (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border px-3 py-2">{t.exam_name}</td>
                  <td className="border px-3 py-2 text-right font-medium text-blue-600">{t.avg}</td>
                  {cmp && <td className="border px-3 py-2 text-right font-medium text-amber-600">{cmp.avg}</td>}
                  {diff !== null && (
                    <td className={`border px-3 py-2 text-right font-medium ${diff > 0 ? "text-green-600" : "text-red-500"}`}>
                      {diff > 0 ? "+" : ""}{diff}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
