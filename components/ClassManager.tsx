"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/auth-client";
import { useAuthenticatedApi } from "@/contexts/AuthContext";
import { validateClassData } from "@/lib/validation";

interface Class {
  class_id: string;
  class_name: string;
  grade_level: number;
  academic_year: string;
  class_teacher: string;
}

interface ClassManagerProps {
  onDataChange: () => void;
}

export default function ClassManager({ onDataChange }: ClassManagerProps) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [formData, setFormData] = useState({
    class_name: "",
    grade_level: 1,
    academic_year: "2024-2025",
    class_teacher: "",
  });
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
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

  useEffect(() => {
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      // Validate form data
      const validation = validateClassData(formData);
      if (!validation.isValid) {
        setError(validation.errors.join(', '));
        return;
      }
      
      let response;
      if (editingClass) {
        response = await authenticatedRequest(() => 
          apiClient.updateClass(editingClass.class_id, validation.sanitized)
        );
      } else {
        response = await authenticatedRequest(() => 
          apiClient.createClass(validation.sanitized)
        );
      }
      
      if (response) {
        await fetchClasses();
        setFormData({
          class_name: '',
          grade_level: 1,
          academic_year: '2024-2025',
          class_teacher: ''
        });
        setEditingClass(null);
        setIsFormOpen(false);
        setSuccess(editingClass ? '班级更新成功' : '班级创建成功');
      }
    } catch (error) {
      console.error('Failed to save class:', error);
      setError(editingClass ? '更新班级失败' : '创建班级失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (cls: Class) => {
    setEditingClass(cls);
    setFormData({
      class_name: cls.class_name,
      grade_level: cls.grade_level,
      academic_year: cls.academic_year,
      class_teacher: cls.class_teacher
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (classId: string) => {
    if (!confirm('确定要删除这个班级吗？')) return;
    
    try {
      setError('');
      const response = await authenticatedRequest(() => 
        apiClient.deleteClass(classId)
      );
      
      if (response) {
        await fetchClasses();
        setSuccess('班级删除成功');
      }
    } catch (error) {
      console.error('Failed to delete class:', error);
      setError('删除班级失败');
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
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">班级管理</h2>
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors text-sm w-full sm:w-auto"
        >
          添加班级
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
            {editingClass ? '编辑班级' : '添加班级'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                班级名称
              </label>
              <input
                type="text"
                required
                value={formData.class_name}
                onChange={(e) => setFormData({...formData, class_name: e.target.value})}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                aria-label="班级名称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                年级
              </label>
              <input
                type="number"
                required
                min="1"
                max="12"
                value={formData.grade_level}
                onChange={(e) => setFormData({...formData, grade_level: parseInt(e.target.value)})}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                aria-label="年级"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                学年
              </label>
              <input
                type="text"
                required
                value={formData.academic_year}
                onChange={(e) => setFormData({...formData, academic_year: e.target.value})}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                aria-label="学年"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                班主任
              </label>
              <input
                type="text"
                value={formData.class_teacher}
                onChange={(e) => setFormData({...formData, class_teacher: e.target.value})}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                aria-label="班主任"
              />
            </div>
            <div className="col-span-2 flex space-x-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '保存中...' : (editingClass ? '更新' : '添加')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingClass(null);
                  setFormData({
                    class_name: '',
                    grade_level: 1,
                    academic_year: '2024-2025',
                    class_teacher: ''
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
        {classes.map((cls) => (
          <div key={cls.class_id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-gray-900">{cls.class_name}</h3>
                <p className="text-sm text-gray-500">年级: {cls.grade_level}</p>
                <p className="text-sm text-gray-500">学年: {cls.academic_year}</p>
                {cls.class_teacher && (
                  <p className="text-sm text-gray-500">班主任: {cls.class_teacher}</p>
                )}
              </div>
            </div>
            <div className="flex space-x-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => handleEdit(cls)}
                className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded text-sm hover:bg-blue-100 transition-colors"
              >
                编辑
              </button>
              <button
                onClick={() => handleDelete(cls.class_id)}
                className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded text-sm hover:bg-red-100 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        ))}
        
        {classes.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            暂无班级数据
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                班级名称
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                年级
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                学年
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                班主任
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {classes.map((cls) => (
              <tr key={cls.class_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {cls.class_name}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {cls.grade_level}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {cls.academic_year}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {cls.class_teacher || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit(cls)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(cls.class_id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {classes.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            暂无班级数据
          </div>
        )}
      </div>
    </div>
  );
}
