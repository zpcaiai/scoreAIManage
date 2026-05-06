"use client";

import { useState, useEffect } from "react";
import { apiClient } from '@/lib/auth-client';
import { useAuthenticatedApi } from '@/contexts/AuthContext';

interface Grade {
  grade_id: string;
  student_id: string;
  student_name: string;
  class_name: string;
  subject_id: string;
  subject_name: string;
  exam_id: string;
  exam_name: string;
  score: number;
  semester: string;
  academic_year: string;
}

interface Student {
  student_id: string;
  student_name: string;
  student_number?: string;
  class_name: string;
  seat_number?: number;
}

interface Subject {
  subject_id: string;
  subject_name: string;
  full_score?: number;
}

interface Exam {
  exam_id: string;
  exam_name: string;
}

interface GradeManagerProps {
  onDataChange: () => void;
}

export default function GradeManager({ onDataChange }: GradeManagerProps) {
  const [grades, setGrades] = useState<{[key: string]: string}>({});
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [formData, setFormData] = useState({
    student_id: '',
    subject_id: '',
    exam_id: '',
    score: 0,
    semester: '第一学期',
    academic_year: '2024-2025'
  });
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const { authenticatedRequest } = useAuthenticatedApi();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [gradesData, setGradesData] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [classes, setClasses] = useState<Array<{class_id: string, class_name: string}>>([]);

  const fetchSubjects = async () => {
    try {
      const response = await authenticatedRequest(() => apiClient.getSubjects());
      if (response) {
        setSubjects(response.data || []);
        if (response.data && response.data.length > 0) {
          setSelectedSubject(response.data[0].subject_id);
        }
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setError('获取科目数据失败');
    }
  };

  const fetchExams = async () => {
    try {
      const response = await authenticatedRequest(() => apiClient.getExams());
      if (response) {
        setExams(response.data || []);
        if (response.data && response.data.length > 0) {
          setSelectedExam(response.data[0].exam_id);
        }
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
      setError('获取考试数据失败');
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes');
      const data = await response.json();
      setClasses(data);
      if (data.length > 0 && !selectedClass) {
        setSelectedClass(data[0].class_id);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchStudents = async () => {
    if (!selectedClass) return;
    
    try {
      const response = await fetch(`/api/students?classId=${selectedClass}`);
      const data = await response.json();
      setStudents(data);
      setGrades({});
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingGrades = async () => {
    if (!selectedExam || !selectedSubject) return;
    
    try {
      const response = await fetch(`/api/grades?examId=${selectedExam}&subjectId=${selectedSubject}`);
      const data = await response.json();
      
      const existingGrades: {[key: string]: string} = {};
      data.forEach((grade: any) => {
        existingGrades[grade.student_id] = grade.score.toString();
      });
      setGrades(existingGrades);
    } catch (error) {
      console.error('Error fetching existing grades:', error);
    }
  };

  useEffect(() => {
    fetchSubjects();
    fetchExams();
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedExam && selectedSubject) {
      fetchExistingGrades();
    }
  }, [selectedExam, selectedSubject]);

  const handleGradeChange = (studentId: string, value: string) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: value
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const gradeData = Object.entries(grades).map(([studentId, score]) => ({
        student_id: studentId,
        subject_id: selectedSubject,
        exam_id: selectedExam,
        score: parseFloat(score) || 0
      }));

      const response = await fetch('/api/grades/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ grades: gradeData }),
      });

      if (response.ok) {
        alert('成绩保存成功！');
        onDataChange();
      } else {
        alert('成绩保存失败，请重试');
      }
    } catch (error) {
      console.error('Error saving grades:', error);
      alert('成绩保存失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCurrentSubject = () => {
    return subjects.find(s => s.subject_id === selectedSubject);
  };

  const getCurrentExam = () => {
    return exams.find(e => e.exam_id === selectedExam);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const currentSubject = getCurrentSubject();
  const currentExam = getCurrentExam();

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 space-y-3 sm:space-y-0">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">成绩录入</h2>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !selectedClass || !selectedExam || !selectedSubject}
          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors disabled:bg-gray-300 text-sm w-full sm:w-auto"
        >
          {isSubmitting ? '保存中...' : '保存成绩'}
        </button>
      </div>

      <div className="mb-4 sm:mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择班级
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            aria-label="选择班级"
          >
            <option value="">选择班级</option>
            {classes.map((cls) => (
              <option key={cls.class_id} value={cls.class_id}>
                {cls.class_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择考试
          </label>
          <select
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            aria-label="选择考试"
          >
            <option value="">选择考试</option>
            {exams.map((exam) => (
              <option key={exam.exam_id} value={exam.exam_id}>
                {exam.exam_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择科目
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            aria-label="选择科目"
          >
            <option value="">选择科目</option>
            {subjects.map((subject) => (
              <option key={subject.subject_id} value={subject.subject_id}>
                {subject.subject_name} (满分: {subject.full_score})
              </option>
            ))}
          </select>
        </div>
      </div>

      {currentSubject && currentExam && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>当前录入：</strong>{currentExam.exam_name} - {currentSubject.subject_name} (满分: {currentSubject.full_score})
          </p>
        </div>
      )}

      {students.length > 0 && (
        <>
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3">
            {students.map((student) => (
              <div key={student.student_id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{student.student_name}</h3>
                    <p className="text-sm text-gray-500">{student.student_number}</p>
                    <p className="text-sm text-gray-500">{student.class_name} · 座号{student.seat_number}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <label className="text-sm font-medium text-gray-700">成绩:</label>
                  <input
                    type="number"
                    min="0"
                    max={currentSubject?.full_score || 100}
                    step="0.5"
                    value={grades[student.student_id] || ''}
                    onChange={(e) => handleGradeChange(student.student_id, e.target.value)}
                    placeholder="请输入成绩"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    学号
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    姓名
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    班级
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    座号
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    成绩
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.student_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {student.student_number}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {student.student_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {student.class_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {student.seat_number}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <input
                        type="number"
                        min="0"
                        max={currentSubject?.full_score || 100}
                        step="0.5"
                        value={grades[student.student_id] || ''}
                        onChange={(e) => handleGradeChange(student.student_id, e.target.value)}
                        placeholder="请输入成绩"
                        className="block w-24 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {students.length === 0 && selectedClass && (
        <div className="text-center py-8 text-gray-500">
          该班级暂无学生数据
        </div>
      )}

      {!selectedClass && (
        <div className="text-center py-8 text-gray-500">
          请选择班级开始录入成绩
        </div>
      )}
    </div>
  );
}
