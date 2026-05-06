"use client";

import { useState } from "react";
import GradeDistributionChart from "@/components/analytics/GradeDistributionChart";
import ClassTrendChart from "@/components/analytics/ClassTrendChart";
import StudentTrackChart from "@/components/analytics/StudentTrackChart";
import SubjectSegmentChart from "@/components/analytics/SubjectSegmentChart";

const tabs = [
  { key: "grade",   label: "📊 年级宏观", desc: "班级横向对比、分位数、分数段分布" },
  { key: "class",   label: "📈 班级中观", desc: "历次考试趋势、双班对比" },
  { key: "student", label: "👤 学生微观", desc: "个人追踪、自动分类、重点名单" },
] as const;

type TabKey = typeof tabs[number]["key"];

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("grade");

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 页头 */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">智能分析驾驶舱</h1>
          <p className="text-gray-500 text-sm mt-1">横向看差距（班与班）→ 纵向看变化（历次考试）→ 个体看轨迹（学生个人）</p>
        </div>

        {/* Tab 导航 */}
        <div className="grid grid-cols-3 gap-3">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                activeTab === tab.key
                  ? "border-blue-500 bg-blue-50 shadow-sm"
                  : "border-gray-200 bg-white hover:border-blue-300"
              }`}
            >
              <div className={`font-semibold text-sm sm:text-base ${activeTab === tab.key ? "text-blue-700" : "text-gray-700"}`}>
                {tab.label}
              </div>
              <div className="text-xs text-gray-400 mt-1 hidden sm:block">{tab.desc}</div>
            </button>
          ))}
        </div>

        {/* 内容区 */}
        <div>
          {activeTab === "grade"   && (
            <div className="space-y-6">
              <GradeDistributionChart />
              <SubjectSegmentChart />
            </div>
          )}
          {activeTab === "class"   && <ClassTrendChart />}
          {activeTab === "student" && <StudentTrackChart />}
        </div>
      </div>
    </div>
  );
}
