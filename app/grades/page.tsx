"use client";

import { useState, useEffect } from "react";
import GradeTable from "@/components/GradeTable";
import ClassManager from "@/components/ClassManager";
import StudentManager from "@/components/StudentManager";
import GradeManager from "@/components/GradeManager";
import Statistics from "@/components/Statistics";
import dynamic from 'next/dynamic';
const AnalyticsPage = dynamic(() => import('@/app/analytics/page'), { ssr: false });
const StudentReportPage = dynamic(() => import('@/app/student-report/page'), { ssr: false });
import { ProtectedRoute, useAuth } from "@/contexts/AuthContext";

// 页面日志工具
const logPage = (action: string, details?: any) => {
  console.log(`[PAGE] Grades - ${new Date().toISOString()} - ${action}`, details);
};

type TabType = 'grades' | 'classes' | 'students' | 'grade-input' | 'statistics' | 'analytics' | 'student-report';

function GradesPageContent() {
  const [activeTab, setActiveTab] = useState<TabType>('grades');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { user, logout, hasRole } = useAuth();

  // 页面加载和标签切换日志
  useEffect(() => {
    logPage('PAGE_LOADED', { user: user?.username, role: user?.role });
  }, [user]);

  useEffect(() => {
    logPage('TAB_CHANGED', { activeTab, user: user?.username });
  }, [activeTab, user]);

  const tabs = [
    { id: 'grades', label: '成绩查询', icon: '📊' },
    { id: 'classes', label: '班级管理', icon: '🏫', requiredRole: 'teacher' as const },
    { id: 'students', label: '学生管理', icon: '👥', requiredRole: 'teacher' as const },
    { id: 'grade-input', label: '成绩录入', icon: '✏️', requiredRole: 'teacher' as const },
    { id: 'statistics', label: '统计分析', icon: '📈' },
    { id: 'analytics', label: '智能分析', icon: '🧠' },
    { id: 'student-report', label: '学生报告', icon: '📊' }
  ];

  const handleDataChange = () => {
    logPage('DATA_CHANGED', { activeTab });
    setRefreshTrigger(prev => prev + 1);
  };

  const handleLogout = () => {
    logPage('LOGOUT', { user: user?.username });
    logout();
  };

  // Filter tabs based on user role
  const accessibleTabs = tabs.filter(tab => 
    !tab.requiredRole || hasRole(tab.requiredRole)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-0">学生成绩管理系统</h1>
            <div className="text-xs sm:text-sm text-gray-500">
              Student Grade Management System
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="bg-white rounded-lg shadow">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 space-y-3 sm:space-y-0">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">学生成绩管理系统</h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                欢迎, {user?.username} ({user?.role === 'admin' ? '管理员' : user?.role === 'teacher' ? '教师' : '学生'})
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors text-sm"
              >
                退出登录
              </button>
            </div>
          </div>

          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto" aria-label="Tabs">
              {accessibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex-shrink-0 py-3 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-1 sm:mr-2">{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.replace('管理', '').replace('查询', '').replace('录入', '').replace('统计分析', '统计')}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-3 sm:p-6">
            {activeTab === 'grades' && (
              <GradeTable refreshTrigger={refreshTrigger} />
            )}
            {activeTab === 'classes' && (
              <ClassManager onDataChange={handleDataChange} />
            )}
            {activeTab === 'students' && (
              <StudentManager onDataChange={handleDataChange} />
            )}
            {activeTab === 'grade-input' && (
              <GradeManager onDataChange={handleDataChange} />
            )}
            {activeTab === 'statistics' && (
              <Statistics refreshTrigger={refreshTrigger} />
            )}
            {activeTab === 'analytics' && (
              <AnalyticsPage />
            )}
            {activeTab === 'student-report' && (
              <StudentReportPage />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GradesPage() {
  return (
    <ProtectedRoute requiredRole="student">
      <GradesPageContent />
    </ProtectedRoute>
  );
}
