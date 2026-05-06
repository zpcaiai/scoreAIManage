"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/auth-client";
import { useAuthenticatedApi } from "@/contexts/AuthContext";
import { validateStudentData } from "@/lib/validation";

interface Student {
  student_id: string;
  student_number: string;
  student_name: string;
  class_id: string;
  class_name: string;
  seat_number: number;
  gender: "male" | "female";
  birth_date: string;
  enrollment_date: string;
  phone: string;
  parent_name: string;
  parent_phone: string;
}

interface Class {
  class_id: string;
  class_name: string;
}

interface StudentManagerProps {
  onDataChange?: () => void;
}

export default function StudentManager({ onDataChange }: StudentManagerProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [formData, setFormData] = useState({
    student_number: "",
    student_name: "",
    class_id: "",
    seat_number: 1,
    gender: "male" as "male" | "female",
    birth_date: "",
    enrollment_date: "",
    phone: "",
    parent_name: "",
    parent_phone: ""
  });
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { authenticatedRequest } = useAuthenticatedApi();

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await authenticatedRequest(() => apiClient.getStudents());
      
      if (response) {
        setStudents(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('获取学生数据失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await authenticatedRequest(() => apiClient.getClasses());
      
      if (response) {
        setClasses(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      setError('获取班级数据失败');
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      // Validate form data
      const validation = validateStudentData(formData);
      if (!validation.isValid) {
        setError(validation.errors.join(', '));
        return;
      }
      
      let response;
      if (editingStudent) {
        response = await authenticatedRequest(() => 
          apiClient.updateStudent(editingStudent.student_id, validation.sanitized)
        );
      } else {
        response = await authenticatedRequest(() => 
          apiClient.createStudent(validation.sanitized)
        );
      }
      
      if (response) {
        await fetchStudents();
        setFormData({
          student_number: '',
          student_name: '',
          class_id: '',
          seat_number: 1,
          gender: 'male',
          birth_date: '',
          enrollment_date: '',
          phone: '',
          parent_name: '',
          parent_phone: ''
        });
        setEditingStudent(null);
        setIsFormOpen(false);
        setSuccess(editingStudent ? '学生信息更新成功' : '学生添加成功');
      }
    } catch (error) {
      console.error('Error saving student:', error);
      setError(editingStudent ? '更新学生信息失败' : '添加学生失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      student_number: student.student_number,
      student_name: student.student_name,
      class_id: student.class_id,
      seat_number: student.seat_number,
      gender: student.gender,
      birth_date: student.birth_date,
      enrollment_date: student.enrollment_date,
      phone: student.phone,
      parent_name: student.parent_name,
      parent_phone: student.parent_phone
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (studentId: string) => {
    if (!confirm('确定要删除这个学生吗？')) return;
    
    try {
      setError('');
      const response = await authenticatedRequest(() => 
        apiClient.deleteStudent(studentId)
      );
      
      if (response) {
        await fetchStudents();
        setSuccess('学生删除成功');
      }
    } catch (error) {
      console.error('Error deleting student:', error);
      setError('删除学生失败');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 space-y-3 sm:space-y-0">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">学生管理</h2>
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors text-sm w-full sm:w-auto"
        >
          添加学生
        </button>
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {isFormOpen && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium mb-4">
            {editingStudent ? '编辑学生' : '添加学生'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                学号 *
              </label>
              <input
                type="text"
                required
                value={formData.student_number}
                onChange={(e) => setFormData({...formData, student_number: e.target.value})}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                aria-label="学号"
                placeholder="请输入学号"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                姓名 *
              </label>
              <input
                type="text"
                required
                value={formData.student_name}
                onChange={(e) => setFormData({...formData, student_name: e.target.value})}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                aria-label="姓名"
                placeholder="请输入姓名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                班级 *
              </label>
              <select
                required
                value={formData.class_id}
                onChange={(e) => setFormData({...formData, class_id: e.target.value})}
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
                座号 *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.seat_number}
                onChange={(e) => setFormData({...formData, seat_number: parseInt(e.target.value)})}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                aria-label="座号"
                placeholder="请输入座号"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                性别 *
              </label>
              <select
                required
                value={formData.gender}
                onChange={(e) => setFormData({...formData, gender: e.target.value as 'male' | 'female'})}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                aria-label="选择性别"
              >
                <option value="male">男</option>
                <option value="female">女</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                出生日期
              </label>
              <input
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                aria-label="出生日期"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                入学日期 *
              </label>
              <input
                type="date"
                required
                value={formData.enrollment_date}
                onChange={(e) => setFormData({...formData, enrollment_date: e.target.value})}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                aria-label="入学日期"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                联系电话
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                aria-label="联系电话"
                placeholder="请输入联系电话"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                家长姓名
              </label>
              <input
                type="text"
                value={formData.parent_name}
                onChange={(e) => setFormData({...formData, parent_name: e.target.value})}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                aria-label="家长姓名"
                placeholder="请输入家长姓名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                家长电话
              </label>
              <input
                type="tel"
                value={formData.parent_phone}
                onChange={(e) => setFormData({...formData, parent_phone: e.target.value})}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                aria-label="家长电话"
                placeholder="请输入家长电话"
              />
            </div>
            <div className="col-span-2 flex space-x-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '保存中...' : (editingStudent ? '更新' : '添加')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingStudent(null);
                  setFormData({
                    student_number: '',
                    student_name: '',
                    class_id: '',
                    seat_number: 1,
                    gender: 'male',
                    birth_date: '',
                    enrollment_date: '',
                    phone: '',
                    parent_name: '',
                    parent_phone: ''
                  });
                  setError('');
                  setSuccess('');
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3">
        {students.map((student) => (
          <div key={student.student_id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{student.student_name}</h3>
                <p className="text-sm text-gray-500">学号: {student.student_number}</p>
                <p className="text-sm text-gray-500">{student.class_name} · 座号{student.seat_number}</p>
                <p className="text-sm text-gray-500">性别: {student.gender === 'male' ? '男' : '女'}</p>
                {student.birth_date && (
                  <p className="text-sm text-gray-500">出生: {student.birth_date}</p>
                )}
                {student.phone && (
                  <p className="text-sm text-gray-500">电话: {student.phone}</p>
                )}
              </div>
            </div>
            <div className="flex space-x-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => handleEdit(student)}
                className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded text-sm hover:bg-blue-100 transition-colors"
              >
                编辑
              </button>
              <button
                onClick={() => handleDelete(student.student_id)}
                className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded text-sm hover:bg-red-100 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        ))}
        
        {students.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            暂无学生数据
          </div>
        )}
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
                性别
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                出生日期
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                联系电话
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
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
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {student.gender === 'male' ? '男' : '女'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {student.birth_date || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {student.phone || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit(student)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(student.student_id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {students.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            暂无学生数据
          </div>
        )}
      </div>
    </div>
  );
}
