'use client';

import { useState, useEffect } from 'react';
import { SecurityMonitor } from '@/lib/security-monitor';

interface SecurityStats {
  totalEvents: number;
  last24h: number;
  last7d: number;
  criticalEvents: number;
  blockedEntities: number;
  activeThreats: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
}

interface SecurityEvent {
  id: string;
  type: string;
  severity: string;
  description: string;
  timestamp: string;
}

interface DashboardData {
  overview: {
    totalEvents: number;
    criticalAlerts: number;
    blockedEntities: number;
    systemStatus: 'healthy' | 'warning' | 'critical';
  };
  charts: {
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    timeline: Array<{ hour: number; events: number; critical: number }>;
  };
  recentEvents: SecurityEvent[];
  threats: {
    activeThreats: number;
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
  };
}

export default function SecurityDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchSecurityData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchSecurityData, 30000); // 30秒刷新
      return () => clearInterval(interval);
    }
  }, [selectedTimeRange, autoRefresh]);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // 模拟API调用
      const response = await fetch('/api/security/dashboard', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch security data');
      }
      
      const data = await response.json();
      setDashboardData(data);
      
    } catch (error) {
      console.error('Error fetching security data:', error);
      setError('获取安全数据失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-blue-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800">{error}</div>
        <button
          onClick={fetchSecurityData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          重试
        </button>
      </div>
    );
  }

  if (!dashboardData) {
    return <div>无数据</div>;
  }

  return (
    <div className="space-y-6">
      {/* 头部控制栏 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <h1 className="text-2xl font-bold text-gray-900">安全监控仪表板</h1>
        
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as '24h' | '7d' | '30d')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="选择时间范围"
          >
            <option value="24h">过去24小时</option>
            <option value="7d">过去7天</option>
            <option value="30d">过去30天</option>
          </select>
          
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-md transition-colors ${
              autoRefresh 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {autoRefresh ? '自动刷新: 开' : '自动刷新: 关'}
          </button>
          
          <button
            onClick={fetchSecurityData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            刷新数据
          </button>
        </div>
      </div>

      {/* 系统状态概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">系统状态</p>
              <p className={`text-2xl font-bold mt-1 px-2 py-1 rounded ${getStatusColor(dashboardData.overview.systemStatus)}`}>
                {dashboardData.overview.systemStatus === 'healthy' ? '正常' : 
                 dashboardData.overview.systemStatus === 'warning' ? '警告' : '严重'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full ${getThreatLevelColor(dashboardData.threats.threatLevel)}`}></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">总事件数</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {dashboardData.overview.totalEvents.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">严重告警</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {dashboardData.overview.criticalAlerts}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">阻止的实体</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {dashboardData.overview.blockedEntities}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 事件类型分布 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">事件类型分布</h2>
          <div className="space-y-3">
            {Object.entries(dashboardData.charts.eventsByType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">{type}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 严重程度分布 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">严重程度分布</h2>
          <div className="space-y-3">
            {Object.entries(dashboardData.charts.eventsBySeverity).map(([severity, count]) => (
              <div key={severity} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${getSeverityColor(severity).replace('text', 'bg')}`}></div>
                  <span className="text-sm text-gray-700 capitalize">{severity}</span>
                </div>
                <span className={`text-sm font-medium ${getSeverityColor(severity)}`}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 威胁等级指示器 */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">威胁等级</h2>
        <div className="flex items-center space-x-4">
          <div className={`w-4 h-4 rounded-full ${getThreatLevelColor(dashboardData.threats.threatLevel)}`}></div>
          <span className="text-lg font-medium capitalize">
            {dashboardData.threats.threatLevel === 'low' ? '低' :
             dashboardData.threats.threatLevel === 'medium' ? '中' :
             dashboardData.threats.threatLevel === 'high' ? '高' : '严重'}
          </span>
          <span className="text-sm text-gray-600">
            当前活跃威胁: {dashboardData.threats.activeThreats}
          </span>
        </div>
      </div>

      {/* 最近安全事件 */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">最近安全事件</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  严重程度
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  描述
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dashboardData.recentEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(event.timestamp).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {event.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${getSeverityColor(event.severity)}`}>
                      {event.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {event.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
