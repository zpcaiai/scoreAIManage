"use client";

import { useState, useEffect } from "react";

interface ClassStats {
  class_name: string;
  student_count: number;
  avg_ten_subjects: number;
  avg_three_subjects: number;
  max_ten_subjects: number;
  min_ten_subjects: number;
}

interface SubjectStats {
  subject_name: string;
  exam_count: number;
  avg_score: number;
  max_score: number;
  min_score: number;
  std_deviation: number;
}

interface TopStudent {
  student_name: string;
  class_name: string;
  ten_subjects_total: number;
  ten_subjects_rank: number;
  three_subjects_total: number;
}

interface StatisticsProps {
  refreshTrigger: number;
}

export default function Statistics({ refreshTrigger }: StatisticsProps) {
  const [classStats, setClassStats] = useState<ClassStats[]>([]);
  const [subjectStats, setSubjectStats] = useState<SubjectStats[]>([]);
  const [topStudents, setTopStudents] = useState<TopStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState('');
  const [exams, setExams] = useState<Array<{exam_id: string, exam_name: string}>>([]);

  const fetchExams = async () => {
    try {
      const response = await fetch('/api/exams');
      const data = await response.json();
      setExams(data);
      if (data.length > 0) {
        setSelectedExam(data[0].exam_id);
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
    }
  };

  const fetchStatistics = async () => {
    if (!selectedExam) return;
    
    setLoading(true);
    try {
      const [classRes, subjectRes, topRes] = await Promise.all([
        fetch(`/api/statistics/class?examId=${selectedExam}`),
        fetch(`/api/statistics/subject?examId=${selectedExam}`),
        fetch(`/api/statistics/top?examId=${selectedExam}`)
      ]);

      const classData = await classRes.json();
      const subjectData = await subjectRes.json();
      const topData = await topRes.json();

      setClassStats(classData);
      setSubjectStats(subjectData);
      setTopStudents(topData);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      fetchStatistics();
    }
  }, [selectedExam, refreshTrigger]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          选择考试
        </label>
        <select
          value={selectedExam}
          onChange={(e) => setSelectedExam(e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          aria-label="选择考试"
        >
          {exams.map((exam) => (
            <option key={exam.exam_id} value={exam.exam_id}>
              {exam.exam_name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-6">
        {/* 班级统计 */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">班级统计</h3>
          
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3">
            {classStats.map((stats, index) => (
              <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-gray-900">{stats.class_name}</h4>
                  <span className="text-sm text-gray-500">{stats.student_count}人</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">十门平均:</span>
                    <span className="ml-1 font-medium">{stats.avg_ten_subjects.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">三门平均:</span>
                    <span className="ml-1 font-medium">{stats.avg_three_subjects.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">最高分:</span>
                    <span className="ml-1 font-semibold text-green-600">{stats.max_ten_subjects}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">最低分:</span>
                    <span className="ml-1 font-semibold text-red-600">{stats.min_ten_subjects}</span>
                  </div>
                </div>
              </div>
            ))}
            {classStats.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                暂无数据
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    班级
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    人数
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    十门平均分
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    三门平均分
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    最高分
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    最低分
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classStats.map((stats, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                      {stats.class_name}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {stats.student_count}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {stats.avg_ten_subjects.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {stats.avg_three_subjects.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-sm text-green-600 font-semibold">
                      {stats.max_ten_subjects}
                    </td>
                    <td className="px-4 py-2 text-sm text-red-600">
                      {stats.min_ten_subjects}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {classStats.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                暂无数据
              </div>
            )}
          </div>
        </div>

        {/* 科目统计 */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">科目统计</h3>
          
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3">
            {subjectStats.map((stats, index) => (
              <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-gray-900">{stats.subject_name}</h4>
                  <span className="text-sm text-gray-500">{stats.exam_count}人</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">平均分:</span>
                    <span className="ml-1 font-medium">{stats.avg_score.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">最高分:</span>
                    <span className="ml-1 font-semibold text-green-600">{stats.max_score}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">最低分:</span>
                    <span className="ml-1 font-semibold text-red-600">{stats.min_score}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">标准差:</span>
                    <span className="ml-1 font-medium">{stats.std_deviation.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
            {subjectStats.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                暂无数据
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    科目
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    考试人数
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    平均分
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    最高分
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    最低分
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    标准差
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subjectStats.map((stats, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                      {stats.subject_name}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {stats.exam_count}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {stats.avg_score.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-sm text-green-600 font-semibold">
                      {stats.max_score}
                    </td>
                    <td className="px-4 py-2 text-sm text-red-600">
                      {stats.min_score}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {stats.std_deviation.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {subjectStats.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                暂无数据
              </div>
            )}
          </div>
        </div>

        {/* 成绩排名前10名 */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">成绩排名前10名</h3>
          
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3">
            {topStudents.map((student, index) => (
              <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full mr-3 ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <h4 className="font-semibold text-gray-900">{student.student_name}</h4>
                      <p className="text-sm text-gray-500">{student.class_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">{student.ten_subjects_total}</div>
                    <div className="text-xs text-gray-500">十门总分</div>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">十门排名: {student.ten_subjects_rank}</span>
                  <span className="text-gray-500">三门总分: {student.three_subjects_total}</span>
                </div>
              </div>
            ))}
            {topStudents.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                暂无数据
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    排名
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    姓名
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    班级
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    十门总分
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    十门排名
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    三门总分
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topStudents.map((student, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {student.student_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {student.class_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      {student.ten_subjects_total}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {student.ten_subjects_rank}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {student.three_subjects_total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {topStudents.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                暂无数据
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
