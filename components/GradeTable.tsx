"use client";

import { useState, useEffect } from "react";
import { apiClient } from '@/lib/auth-client';
import { useAuthenticatedApi } from '@/contexts/AuthContext';

interface Grade {
  grade_id: string;
  student_id: string;
  student_name: string;
  class_name: string;
  seat_number: number;
  subject_id: string;
  subject_name: string;
  exam_id: string;
  exam_name: string;
  score: number;
  semester: string;
  academic_year: string;
  ten_subjects_total?: number;
  ten_subjects_rank?: number;
  three_subjects_total?: number;
  three_subjects_rank?: number;
  chinese_score?: number;
  math_score?: number;
  english_score?: number;
  physics_score?: number;
  chemistry_score?: number;
  politics_score?: number;
  history_score?: number;
  geography_score?: number;
  biology_score?: number;
  it_score?: number;
}

interface Class {
  class_id: string;
  class_name: string;
}

interface Exam {
  exam_id: string;
  exam_name: string;
}

export default function GradeTable() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { authenticatedRequest } = useAuthenticatedApi();

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await authenticatedRequest(() => apiClient.getClasses());
      
      if (response) {
        setClasses(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error);
      setError('获取班级数据失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchExams = async () => {
    try {
      setError('');
      const response = await authenticatedRequest(() => apiClient.getExams());
      
      if (response) {
        setExams(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch exams:', error);
      setError('获取考试数据失败');
    }
  };

  const fetchGrades = async () => {
    if (!selectedClass || !selectedExam) return;
    
    try {
      setError('');
      const response = await authenticatedRequest(() => 
        apiClient.getGrades({ classId: selectedClass, examId: selectedExam })
      );
      
      if (response) {
        setGrades(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch grades:', error);
      setError('获取成绩数据失败');
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchExams();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedExam) {
      fetchGrades();
    }
  }, [selectedClass, selectedExam]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 sm:mb-6 grid grid-cols-1 sm:flex sm:space-x-4 gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择班级
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            aria-label="选择班级"
          >
            {classes.map((cls) => (
              <option key={cls.class_id} value={cls.class_id}>
                {cls.class_name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择考试
          </label>
          <select
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            aria-label="选择考试"
          >
            {exams.map((exam) => (
              <option key={exam.exam_id} value={exam.exam_id}>
                {exam.exam_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden">
        {grades.map((grade, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg mb-3 p-4 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{grade.student_name}</h3>
                <p className="text-sm text-gray-500">{grade.class_name} · 座号{grade.seat_number}</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600">{grade.ten_subjects_total}</div>
                <div className="text-xs text-gray-500">十门总分</div>
                <div className="text-sm text-gray-900 mt-1">排名: {grade.ten_subjects_rank}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">语文:</span>
                <span className="ml-1 font-medium">{grade.chinese_score}</span>
              </div>
              <div>
                <span className="text-gray-500">数学:</span>
                <span className="ml-1 font-medium">{grade.math_score}</span>
              </div>
              <div>
                <span className="text-gray-500">外语:</span>
                <span className="ml-1 font-medium">{grade.english_score}</span>
              </div>
              <div>
                <span className="text-gray-500">三总:</span>
                <span className="ml-1 font-semibold text-green-600">{grade.three_subjects_total}</span>
              </div>
              <div>
                <span className="text-gray-500">物理:</span>
                <span className="ml-1 font-medium">{grade.physics_score}</span>
              </div>
              <div>
                <span className="text-gray-500">化学:</span>
                <span className="ml-1 font-medium">{grade.chemistry_score}</span>
              </div>
              <div>
                <span className="text-gray-500">政治:</span>
                <span className="ml-1 font-medium">{grade.politics_score}</span>
              </div>
              <div>
                <span className="text-gray-500">历史:</span>
                <span className="ml-1 font-medium">{grade.history_score}</span>
              </div>
              <div>
                <span className="text-gray-500">地理:</span>
                <span className="ml-1 font-medium">{grade.geography_score}</span>
              </div>
              <div>
                <span className="text-gray-500">生物:</span>
                <span className="ml-1 font-medium">{grade.biology_score}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">信息科技:</span>
                <span className="ml-1 font-medium">{grade.it_score}</span>
              </div>
            </div>
          </div>
        ))}
        
        {grades.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            暂无成绩数据
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                班级
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                座号
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                姓名
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                十门总分
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                十门年次
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                语文成绩
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                数学成绩
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                外语成绩
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                三总
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                物理成绩
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                化学成绩
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                政治成绩
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                历史成绩
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                地理成绩
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                生物成绩
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                信息科技成绩
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {grades.map((grade, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {grade.class_name}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {grade.seat_number}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {grade.student_name}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold">
                  {grade.ten_subjects_total}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {grade.ten_subjects_rank}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {grade.chinese_score}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {grade.math_score}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {grade.english_score}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold">
                  {grade.three_subjects_total}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {grade.physics_score}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {grade.chemistry_score}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {grade.politics_score}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {grade.history_score}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {grade.geography_score}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {grade.biology_score}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {grade.it_score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {grades.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            暂无成绩数据
          </div>
        )}
      </div>
    </div>
  );
}
