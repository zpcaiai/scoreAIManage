"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { apiClient } from '@/lib/auth-client';
import { useAuthenticatedApi } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';

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

interface ExcelGradeRow {
  student_number?: string;
  student_name?: string;
  subject_name?: string;
  exam_name?: string;
  score?: number | string;
  [key: string]: any;
}

type InputMode = 'single' | 'batch' | 'excel';

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
  const [inputMode, setInputMode] = useState<InputMode>('batch');
  const [singleFormData, setSingleFormData] = useState({
    student_id: '',
    subject_id: '',
    exam_id: '',
    score: '',
    semester: '第一学期',
    academic_year: '2024-2025'
  });
  const [excelData, setExcelData] = useState<ExcelGradeRow[]>([]);
  const [excelPreview, setExcelPreview] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const classesData = data.success ? data.data : (Array.isArray(data) ? data : []);
      setClasses(classesData);
      if (classesData.length > 0 && !selectedClass) {
        setSelectedClass(classesData[0].class_id);
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
      const studentsData = data.success ? data.data : (Array.isArray(data) ? data : []);
      setStudents(studentsData);
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
      const result = await response.json();
      const gradesData = result.success ? result.data : (Array.isArray(result) ? result : []);
      
      const existingGrades: {[key: string]: string} = {};
      gradesData.forEach((grade: any) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass]);

  useEffect(() => {
    if (selectedExam && selectedSubject) {
      fetchExistingGrades();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // 单条成绩录入
  const handleSingleSubmit = async () => {
    if (!singleFormData.student_id || !singleFormData.subject_id || !singleFormData.exam_id || !singleFormData.score) {
      alert('请填写完整的成绩信息');
      return;
    }

    const score = parseFloat(singleFormData.score);
    if (isNaN(score) || score < 0 || score > 150) {
      alert('成绩必须是0-150之间的数字');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: singleFormData.student_id,
          subject_id: singleFormData.subject_id,
          exam_id: singleFormData.exam_id,
          score: score,
          semester: singleFormData.semester,
          academic_year: singleFormData.academic_year
        }),
      });

      if (response.ok) {
        alert('成绩录入成功！');
        setSingleFormData({
          student_id: '',
          subject_id: '',
          exam_id: '',
          score: '',
          semester: '第一学期',
          academic_year: '2024-2025'
        });
        onDataChange();
      } else {
        const errorData = await response.json();
        alert(errorData.message || '成绩录入失败，请重试');
      }
    } catch (error) {
      console.error('Error creating grade:', error);
      alert('成绩录入失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Excel文件处理
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadProgress(0);
    setImportErrors([]);

    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        setUploadProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: ExcelGradeRow[] = XLSX.utils.sheet_to_json(firstSheet);

        if (jsonData.length === 0) {
          setImportErrors(['Excel文件为空或格式不正确']);
          return;
        }

        // 验证和映射数据
        const errors: string[] = [];
        const validatedData = jsonData.map((row, index) => {
          const rowNum = index + 2; // Excel行号从2开始（考虑表头）
          const issues: string[] = [];

          // 检查必要字段
          if (!row.student_number && !row.student_name) {
            issues.push(`第${rowNum}行: 缺少学号或姓名`);
          }
          if (!row.subject_name && !row.subject_id) {
            issues.push(`第${rowNum}行: 缺少科目信息`);
          }
          if (!row.exam_name && !row.exam_id) {
            issues.push(`第${rowNum}行: 缺少考试信息`);
          }
          if (row.score === undefined || row.score === null || row.score === '') {
            issues.push(`第${rowNum}行: 缺少成绩`);
          } else {
            const score = parseFloat(String(row.score));
            if (isNaN(score) || score < 0 || score > 150) {
              issues.push(`第${rowNum}行: 成绩格式不正确(${row.score})，应为0-150之间的数字`);
            }
          }

          if (issues.length > 0) {
            errors.push(...issues);
          }

          return row;
        });

        if (errors.length > 0) {
          setImportErrors(errors);
        }

        setExcelData(validatedData);
        setExcelPreview(true);
        setUploadProgress(100);
      } catch (error) {
        console.error('Error parsing Excel:', error);
        setImportErrors(['Excel文件解析失败，请检查文件格式']);
      }
    };

    reader.onerror = () => {
      setImportErrors(['文件读取失败']);
    };

    reader.readAsBinaryString(file);
  }, []);

  // Excel数据导入
  const handleExcelImport = async () => {
    if (excelData.length === 0) {
      alert('没有可导入的数据');
      return;
    }

    setIsSubmitting(true);
    const errors: string[] = [];
    const successCount = { value: 0 };

    try {
      // 创建查找映射
      const studentMap = new Map(students.map(s => [s.student_number, s.student_id]));
      const studentNameMap = new Map(students.map(s => [s.student_name, s.student_id]));
      const subjectMap = new Map(subjects.map(s => [s.subject_name, s.subject_id]));
      const examMap = new Map(exams.map(e => [e.exam_name, e.exam_id]));

      const gradesToCreate = [];

      for (let i = 0; i < excelData.length; i++) {
        const row = excelData[i];
        const rowNum = i + 2;

        // 查找学生ID
        let studentId = row.student_number ? studentMap.get(String(row.student_number)) : null;
        if (!studentId && row.student_name) {
          studentId = studentNameMap.get(String(row.student_name));
        }

        if (!studentId) {
          errors.push(`第${rowNum}行: 未找到学生 (${row.student_number || ''} ${row.student_name || ''})`);
          continue;
        }

        // 查找科目ID
        const subjectId = row.subject_name ? subjectMap.get(String(row.subject_name)) : 
                         (row.subject_id || selectedSubject);
        if (!subjectId) {
          errors.push(`第${rowNum}行: 未找到科目 (${row.subject_name || row.subject_id || ''})`);
          continue;
        }

        // 查找考试ID
        const examId = row.exam_name ? examMap.get(String(row.exam_name)) : 
                      (row.exam_id || selectedExam);
        if (!examId) {
          errors.push(`第${rowNum}行: 未找到考试 (${row.exam_name || row.exam_id || ''})`);
          continue;
        }

        const score = parseFloat(String(row.score));
        if (isNaN(score) || score < 0 || score > 150) {
          errors.push(`第${rowNum}行: 成绩格式不正确 (${row.score})`);
          continue;
        }

        gradesToCreate.push({
          student_id: studentId,
          subject_id: subjectId,
          exam_id: examId,
          score: score
        });
      }

      if (gradesToCreate.length === 0) {
        setImportErrors(errors);
        setIsSubmitting(false);
        return;
      }

      // 批量创建成绩
      const response = await fetch('/api/grades/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grades: gradesToCreate }),
      });

      if (response.ok) {
        const result = await response.json();
        successCount.value = result.count || gradesToCreate.length;
        
        if (errors.length > 0) {
          setImportErrors(errors);
          alert(`导入完成：成功 ${successCount.value} 条，失败 ${errors.length} 条`);
        } else {
          alert(`成功导入 ${successCount.value} 条成绩记录！`);
          setExcelData([]);
          setExcelPreview(false);
        }
        onDataChange();
      } else {
        const errorData = await response.json();
        alert(errorData.message || '批量导入失败');
      }
    } catch (error) {
      console.error('Error importing grades:', error);
      alert('导入过程中发生错误');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 下载Excel模板
  const downloadTemplate = () => {
    const template = [
      {
        student_number: '202401001',
        student_name: '张三',
        subject_name: '语文',
        exam_name: '2024年期中考试',
        score: 135
      },
      {
        student_number: '202401001',
        student_name: '张三',
        subject_name: '数学',
        exam_name: '2024年期中考试',
        score: 142
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '成绩导入模板');
    
    // 设置列宽
    ws['!cols'] = [
      { wch: 15 }, // student_number
      { wch: 10 }, // student_name
      { wch: 12 }, // subject_name
      { wch: 18 }, // exam_name
      { wch: 8 }   // score
    ];

    XLSX.writeFile(wb, '成绩导入模板.xlsx');
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

  // 渲染录入模式切换
  const renderModeSelector = () => (
    <div className="mb-6 border-b border-gray-200">
      <nav className="flex space-x-4" aria-label="Tabs">
        <button
          onClick={() => setInputMode('batch')}
          className={`py-2 px-4 font-medium text-sm border-b-2 ${
            inputMode === 'batch'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          批量录入
        </button>
        <button
          onClick={() => setInputMode('single')}
          className={`py-2 px-4 font-medium text-sm border-b-2 ${
            inputMode === 'single'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          单条录入
        </button>
        <button
          onClick={() => setInputMode('excel')}
          className={`py-2 px-4 font-medium text-sm border-b-2 ${
            inputMode === 'excel'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Excel导入
        </button>
      </nav>
    </div>
  );

  // 渲染批量录入
  const renderBatchMode = () => (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 space-y-3 sm:space-y-0">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">批量成绩录入</h2>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学号</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">班级</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">座号</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">成绩</th>
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
    </>
  );

  // 渲染单条录入
  const renderSingleMode = () => (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 space-y-3 sm:space-y-0">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">单条成绩录入</h2>
        <button
          onClick={handleSingleSubmit}
          disabled={isSubmitting}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-300 text-sm w-full sm:w-auto"
        >
          {isSubmitting ? '保存中...' : '保存成绩'}
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 学生选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" id="class-label">
              选择班级 <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSingleFormData(prev => ({ ...prev, student_id: '' }));
              }}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              aria-labelledby="class-label"
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
            <label className="block text-sm font-medium text-gray-700 mb-2" id="student-label">
              选择学生 <span className="text-red-500">*</span>
            </label>
            <select
              value={singleFormData.student_id}
              onChange={(e) => setSingleFormData(prev => ({ ...prev, student_id: e.target.value }))}
              disabled={!selectedClass}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              aria-labelledby="student-label"
            >
              <option value="">{selectedClass ? '选择学生' : '请先选择班级'}</option>
              {students.map((student) => (
                <option key={student.student_id} value={student.student_id}>
                  {student.student_name} ({student.student_number}) - 座号{student.seat_number}
                </option>
              ))}
            </select>
          </div>

          {/* 考试选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" id="exam-label">
              选择考试 <span className="text-red-500">*</span>
            </label>
            <select
              value={singleFormData.exam_id}
              onChange={(e) => setSingleFormData(prev => ({ ...prev, exam_id: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              aria-labelledby="exam-label"
            >
              <option value="">选择考试</option>
              {exams.map((exam) => (
                <option key={exam.exam_id} value={exam.exam_id}>
                  {exam.exam_name}
                </option>
              ))}
            </select>
          </div>

          {/* 科目选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" id="subject-label">
              选择科目 <span className="text-red-500">*</span>
            </label>
            <select
              value={singleFormData.subject_id}
              onChange={(e) => setSingleFormData(prev => ({ ...prev, subject_id: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              aria-labelledby="subject-label"
            >
              <option value="">选择科目</option>
              {subjects.map((subject) => (
                <option key={subject.subject_id} value={subject.subject_id}>
                  {subject.subject_name} (满分: {subject.full_score})
                </option>
              ))}
            </select>
          </div>

          {/* 成绩输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              成绩 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              max="150"
              step="0.5"
              value={singleFormData.score}
              onChange={(e) => setSingleFormData(prev => ({ ...prev, score: e.target.value }))}
              placeholder="请输入成绩"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 学年 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" id="academic-year-label">
              学年
            </label>
            <input
              type="text"
              value={singleFormData.academic_year}
              onChange={(e) => setSingleFormData(prev => ({ ...prev, academic_year: e.target.value }))}
              placeholder="请输入学年，如：2024-2025"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              aria-labelledby="academic-year-label"
            />
          </div>

          {/* 学期 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" id="semester-label">
              学期
            </label>
            <select
              value={singleFormData.semester}
              onChange={(e) => setSingleFormData(prev => ({ ...prev, semester: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              aria-labelledby="semester-label"
            >
              <option value="第一学期">第一学期</option>
              <option value="第二学期">第二学期</option>
            </select>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>提示：</strong> 带 <span className="text-red-500">*</span> 号的字段为必填项
          </p>
        </div>
      </div>
    </>
  );

  // 渲染Excel导入
  const renderExcelMode = () => (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 space-y-3 sm:space-y-0">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Excel成绩导入</h2>
        <button
          onClick={downloadTemplate}
          className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors text-sm w-full sm:w-auto"
        >
          下载导入模板
        </button>
      </div>

      {/* 文件上传区域 */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            id="excel-upload"
          />
          <label
            htmlFor="excel-upload"
            className="cursor-pointer inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            选择Excel文件
          </label>
          <p className="mt-2 text-sm text-gray-500">
            支持 .xlsx 和 .xls 格式，文件大小不超过 10MB
          </p>
        </div>

        {/* 上传进度 */}
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>上传进度</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {importErrors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-red-800 font-medium mb-2">
            发现 {importErrors.length} 个问题：
          </h4>
          <ul className="text-sm text-red-700 space-y-1 max-h-40 overflow-y-auto">
            {importErrors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Excel数据预览 */}
      {excelPreview && excelData.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">
              数据预览 (共 {excelData.length} 条记录)
            </h3>
            <div className="space-x-2">
              <button
                onClick={() => {
                  setExcelData([]);
                  setExcelPreview(false);
                  setImportErrors([]);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleExcelImport}
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-600 disabled:bg-gray-300"
              >
                {isSubmitting ? '导入中...' : '确认导入'}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">学号</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">科目</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">考试</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">成绩</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {excelData.slice(0, 50).map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {row.student_number || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {row.student_name || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {row.subject_name || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {row.exam_name || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {row.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {excelData.length > 50 && (
              <p className="p-4 text-sm text-gray-500 text-center">
                仅显示前50条，共 {excelData.length} 条记录
              </p>
            )}
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="mt-6 bg-blue-50 p-4 rounded-lg">
        <h4 className="text-blue-800 font-medium mb-2">使用说明</h4>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>点击&quot;下载导入模板&quot;获取标准Excel格式</li>
          <li>按照模板格式填写学生成绩数据</li>
          <li>支持通过学号或姓名识别学生</li>
          <li>支持通过科目名称或考试名称匹配</li>
          <li>上传Excel文件后系统会预览数据，确认无误后点击&quot;确认导入&quot;</li>
        </ol>
      </div>
    </>
  );

  return (
    <div>
      {renderModeSelector()}
      {inputMode === 'batch' && renderBatchMode()}
      {inputMode === 'single' && renderSingleMode()}
      {inputMode === 'excel' && renderExcelMode()}
    </div>
  );
}
