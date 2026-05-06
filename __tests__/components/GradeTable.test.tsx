import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '../utils/test-utils'
import GradeTable from '@/components/GradeTable'
import { mockGrades, mockClasses, mockExams } from '../utils/test-utils'

// Mock the API client
const mockAuthenticatedRequest = jest.fn()

jest.mock('@/lib/api-client', () => ({
  authenticatedRequest: mockAuthenticatedRequest
}))

describe('GradeTable Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render the grade table component', () => {
      render(<GradeTable />)
      
      expect(screen.getByText('成绩管理')).toBeInTheDocument()
      expect(screen.getByTestId('grade-table')).toBeInTheDocument()
    })

    it('should render filter controls', () => {
      render(<GradeTable />)
      
      expect(screen.getByTestId('class-filter')).toBeInTheDocument()
      expect(screen.getByTestId('exam-filter')).toBeInTheDocument()
      expect(screen.getByTestId('search-input')).toBeInTheDocument()
    })

    it('should render data table headers', () => {
      render(<GradeTable />)
      
      expect(screen.getByText('学生姓名')).toBeInTheDocument()
      expect(screen.getByText('班级')).toBeInTheDocument()
      expect(screen.getByText('座位号')).toBeInTheDocument()
      expect(screen.getByText('科目')).toBeInTheDocument()
      expect(screen.getByText('考试')).toBeInTheDocument()
      expect(screen.getByText('成绩')).toBeInTheDocument()
    })
  })

  describe('Data Loading', () => {
    it('should load and display grades data', async () => {
      mockAuthenticatedRequest
        .mockResolvedValueOnce({
          success: true,
          data: mockGrades
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockClasses
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockExams
        })

      render(<GradeTable />)

      await waitFor(() => {
        expect(screen.getByText('张三')).toBeInTheDocument()
        expect(screen.getByText('李四')).toBeInTheDocument()
      })

      expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/grades', 'GET')
      expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/classes', 'GET')
      expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/exams', 'GET')
    })

    it('should show loading state while fetching data', async () => {
      mockAuthenticatedRequest.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true, data: [] }), 100))
      )

      render(<GradeTable />)

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
      }, { timeout: 200 })
    })

    it('should show error message when data loading fails', async () => {
      mockAuthenticatedRequest.mockRejectedValue(new Error('Network error'))

      render(<GradeTable />)

      await waitFor(() => {
        expect(screen.getByText(/加载失败/)).toBeInTheDocument()
        expect(screen.getByTestId('retry-button')).toBeInTheDocument()
      })
    })

    it('should show empty state when no grades data', async () => {
      mockAuthenticatedRequest
        .mockResolvedValueOnce({ success: true, data: [] })
        .mockResolvedValueOnce({ success: true, data: mockClasses })
        .mockResolvedValueOnce({ success: true, data: mockExams })

      render(<GradeTable />)

      await waitFor(() => {
        expect(screen.getByText(/暂无成绩数据/)).toBeInTheDocument()
      })
    })
  })

  describe('Filtering Functionality', () => {
    it('should filter grades by class', async () => {
      mockAuthenticatedRequest
        .mockResolvedValueOnce({ success: true, data: mockGrades })
        .mockResolvedValueOnce({ success: true, data: mockClasses })
        .mockResolvedValueOnce({ success: true, data: mockExams })

      render(<GradeTable />)

      await waitFor(() => {
        expect(screen.getByText('张三')).toBeInTheDocument()
      })

      const classFilter = screen.getByTestId('class-filter')
      fireEvent.change(classFilter, { target: { value: '1' } })

      await waitFor(() => {
        expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/grades', 'GET', undefined, { classId: '1' })
      })
    })

    it('should filter grades by exam', async () => {
      mockAuthenticatedRequest
        .mockResolvedValueOnce({ success: true, data: mockGrades })
        .mockResolvedValueOnce({ success: true, data: mockClasses })
        .mockResolvedValueOnce({ success: true, data: mockExams })

      render(<GradeTable />)

      await waitFor(() => {
        expect(screen.getByText('张三')).toBeInTheDocument()
      })

      const examFilter = screen.getByTestId('exam-filter')
      fireEvent.change(examFilter, { target: { value: '1' } })

      await waitFor(() => {
        expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/grades', 'GET', undefined, { examId: '1' })
      })
    })

    it('should search grades by student name', async () => {
      mockAuthenticatedRequest
        .mockResolvedValueOnce({ success: true, data: mockGrades })
        .mockResolvedValueOnce({ success: true, data: mockClasses })
        .mockResolvedValueOnce({ success: true, data: mockExams })

      render(<GradeTable />)

      await waitFor(() => {
        expect(screen.getByText('张三')).toBeInTheDocument()
      })

      const searchInput = screen.getByTestId('search-input')
      fireEvent.change(searchInput, { target: { value: '张三' } })

      await waitFor(() => {
        expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/grades', 'GET', undefined, { search: '张三' })
      })
    })

    it('should clear filters when reset button is clicked', async () => {
      mockAuthenticatedRequest
        .mockResolvedValueOnce({ success: true, data: mockGrades })
        .mockResolvedValueOnce({ success: true, data: mockClasses })
        .mockResolvedValueOnce({ success: true, data: mockExams })

      render(<GradeTable />)

      await waitFor(() => {
        expect(screen.getByText('张三')).toBeInTheDocument()
      })

      const classFilter = screen.getByTestId('class-filter')
      fireEvent.change(classFilter, { target: { value: '1' } })

      const resetButton = screen.getByTestId('reset-filters')
      fireEvent.click(resetButton)

      await waitFor(() => {
        expect(classFilter).toHaveValue('')
      })
    })
  })

  describe('Grade Operations', () => {
    it('should open add grade dialog when add button is clicked', async () => {
      mockAuthenticatedRequest
        .mockResolvedValueOnce({ success: true, data: mockGrades })
        .mockResolvedValueOnce({ success: true, data: mockClasses })
        .mockResolvedValueOnce({ success: true, data: mockExams })

      render(<GradeTable />)

      await waitFor(() => {
        expect(screen.getByText('张三')).toBeInTheDocument()
      })

      const addButton = screen.getByTestId('add-grade-button')
      fireEvent.click(addButton)

      expect(screen.getByTestId('add-grade-dialog')).toBeInTheDocument()
    })

    it('should add a new grade successfully', async () => {
      const newGrade = {
        student_id: '3',
        subject_id: '1',
        exam_id: '1',
        score: 85
      }

      mockAuthenticatedRequest
        .mockResolvedValueOnce({ success: true, data: mockGrades })
        .mockResolvedValueOnce({ success: true, data: mockClasses })
        .mockResolvedValueOnce({ success: true, data: mockExams })
        .mockResolvedValueOnce({ success: true, data: { ...newGrade, grade_id: '3' } })

      render(<GradeTable />)

      await waitFor(() => {
        expect(screen.getByText('张三')).toBeInTheDocument()
      })

      const addButton = screen.getByTestId('add-grade-button')
      fireEvent.click(addButton)

      const studentSelect = screen.getByTestId('student-select')
      const subjectSelect = screen.getByTestId('subject-select')
      const examSelect = screen.getByTestId('exam-select')
      const scoreInput = screen.getByTestId('score-input')
      const saveButton = screen.getByTestId('save-grade-button')

      fireEvent.change(studentSelect, { target: { value: '3' } })
      fireEvent.change(subjectSelect, { target: { value: '1' } })
      fireEvent.change(examSelect, { target: { value: '1' } })
      fireEvent.change(scoreInput, { target: { value: '85' } })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/grades', 'POST', newGrade)
      })
    })

    it('should edit an existing grade', async () => {
      mockAuthenticatedRequest
        .mockResolvedValueOnce({ success: true, data: mockGrades })
        .mockResolvedValueOnce({ success: true, data: mockClasses })
        .mockResolvedValueOnce({ success: true, data: mockExams })

      render(<GradeTable />)

      await waitFor(() => {
        expect(screen.getByText('张三')).toBeInTheDocument()
      })

      const editButton = screen.getByTestId('edit-grade-1')
      fireEvent.click(editButton)

      expect(screen.getByTestId('edit-grade-dialog')).toBeInTheDocument()

      const scoreInput = screen.getByTestId('score-input')
      fireEvent.change(scoreInput, { target: { value: '90' } })

      const saveButton = screen.getByTestId('save-grade-button')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/grades/1', 'PUT', { score: 90 })
      })
    })

    it('should delete a grade', async () => {
      mockAuthenticatedRequest
        .mockResolvedValueOnce({ success: true, data: mockGrades })
        .mockResolvedValueOnce({ success: true, data: mockClasses })
        .mockResolvedValueOnce({ success: true, data: mockExams })
        .mockResolvedValueOnce({ success: true, message: 'Grade deleted successfully' })

      render(<GradeTable />)

      await waitFor(() => {
        expect(screen.getByText('张三')).toBeInTheDocument()
      })

      const deleteButton = screen.getByTestId('delete-grade-1')
      fireEvent.click(deleteButton)

      // Confirm deletion
      const confirmButton = screen.getByTestId('confirm-delete')
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/grades/1', 'DELETE')
      })
    })
  })

  describe('Data Validation', () => {
    it('should validate score input', async () => {
      mockAuthenticatedRequest
        .mockResolvedValueOnce({ success: true, data: mockGrades })
        .mockResolvedValueOnce({ success: true, data: mockClasses })
        .mockResolvedValueOnce({ success: true, data: mockExams })

      render(<GradeTable />)

      await waitFor(() => {
        expect(screen.getByText('张三')).toBeInTheDocument()
      })

      const addButton = screen.getByTestId('add-grade-button')
      fireEvent.click(addButton)

      const scoreInput = screen.getByTestId('score-input')
      const saveButton = screen.getByTestId('save-grade-button')

      // Test invalid score (negative)
      fireEvent.change(scoreInput, { target: { value: '-5' } })
      fireEvent.click(saveButton)

      expect(screen.getByText(/成绩必须在0-100之间/)).toBeInTheDocument()

      // Test invalid score (over 100)
      fireEvent.change(scoreInput, { target: { value: '150' } })
      fireEvent.click(saveButton)

      expect(screen.getByText(/成绩必须在0-100之间/)).toBeInTheDocument()
    })

    it('should require all fields when adding grade', async () => {
      mockAuthenticatedRequest
        .mockResolvedValueOnce({ success: true, data: mockGrades })
        .mockResolvedValueOnce({ success: true, data: mockClasses })
        .mockResolvedValueOnce({ success: true, data: mockExams })

      render(<GradeTable />)

      await waitFor(() => {
        expect(screen.getByText('张三')).toBeInTheDocument()
      })

      const addButton = screen.getByTestId('add-grade-button')
      fireEvent.click(addButton)

      const saveButton = screen.getByTestId('save-grade-button')
      fireEvent.click(saveButton)

      expect(screen.getByText(/请选择学生/)).toBeInTheDocument()
      expect(screen.getByText(/请选择科目/)).toBeInTheDocument()
      expect(screen.getByText(/请选择考试/)).toBeInTheDocument()
      expect(screen.getByText(/请输入成绩/)).toBeInTheDocument()
    })
  })

  describe('Export Functionality', () => {
    it('should export grades to CSV', async () => {
      mockAuthenticatedRequest
        .mockResolvedValueOnce({ success: true, data: mockGrades })
        .mockResolvedValueOnce({ success: true, data: mockClasses })
        .mockResolvedValueOnce({ success: true, data: mockExams })

      // Mock URL.createObjectURL and download
      global.URL.createObjectURL = jest.fn(() => 'mock-url')
      global.URL.revokeObjectURL = jest.fn()
      
      const mockLink = {
        click: jest.fn(),
        href: '',
        download: ''
      }
      global.document.createElement = jest.fn(() => mockLink)

      render(<GradeTable />)

      await waitFor(() => {
        expect(screen.getByText('张三')).toBeInTheDocument()
      })

      const exportButton = screen.getByTestId('export-csv-button')
      fireEvent.click(exportButton)

      expect(mockLink.click).toHaveBeenCalled()
    })

    it('should export grades to Excel', async () => {
      mockAuthenticatedRequest
        .mockResolvedValueOnce({ success: true, data: mockGrades })
        .mockResolvedValueOnce({ success: true, data: mockClasses })
        .mockResolvedValueOnce({ success: true, data: mockExams })

      global.URL.createObjectURL = jest.fn(() => 'mock-url')
      global.URL.revokeObjectURL = jest.fn()
      
      const mockLink = {
        click: jest.fn(),
        href: '',
        download: ''
      }
      global.document.createElement = jest.fn(() => mockLink)

      render(<GradeTable />)

      await waitFor(() => {
        expect(screen.getByText('张三')).toBeInTheDocument()
      })

      const exportButton = screen.getByTestId('export-excel-button')
      fireEvent.click(exportButton)

      expect(mockLink.click).toHaveBeenCalled()
    })
  })

  describe('Pagination', () => {
    it('should handle pagination correctly', async () => {
      const manyGrades = Array.from({ length: 50 }, (_, i) => ({
        ...mockGrades[0],
        grade_id: String(i + 1),
        student_name: `学生${i + 1}`
      }))

      mockAuthenticatedRequest
        .mockResolvedValueOnce({ success: true, data: manyGrades })
        .mockResolvedValueOnce({ success: true, data: mockClasses })
        .mockResolvedValueOnce({ success: true, data: mockExams })

      render(<GradeTable />)

      await waitFor(() => {
        expect(screen.getByText('学生1')).toBeInTheDocument()
      })

      const nextPageButton = screen.getByTestId('next-page')
      fireEvent.click(nextPageButton)

      await waitFor(() => {
        expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/grades', 'GET', undefined, { page: 2 })
      })
    })

    it('should change page size', async () => {
      mockAuthenticatedRequest
        .mockResolvedValueOnce({ success: true, data: mockGrades })
        .mockResolvedValueOnce({ success: true, data: mockClasses })
        .mockResolvedValueOnce({ success: true, data: mockExams })

      render(<GradeTable />)

      await waitFor(() => {
        expect(screen.getByText('张三')).toBeInTheDocument()
      })

      const pageSizeSelect = screen.getByTestId('page-size-select')
      fireEvent.change(pageSizeSelect, { target: { value: '50' } })

      await waitFor(() => {
        expect(mockAuthenticatedRequest).toHaveBeenCalledWith('/api/grades', 'GET', undefined, { pageSize: 50 })
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockAuthenticatedRequest.mockRejectedValue(new Error('Network error'))

      render(<GradeTable />)

      await waitFor(() => {
        expect(screen.getByText(/加载失败/)).toBeInTheDocument()
        expect(screen.getByTestId('retry-button')).toBeInTheDocument()
      })

      const retryButton = screen.getByTestId('retry-button')
      fireEvent.click(retryButton)

      expect(mockAuthenticatedRequest).toHaveBeenCalledTimes(2)
    })

    it('should handle API errors gracefully', async () => {
      mockAuthenticatedRequest.mockResolvedValue({
        success: false,
        error: 'API Error'
      })

      render(<GradeTable />)

      await waitFor(() => {
        expect(screen.getByText(/API Error/)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<GradeTable />)

      expect(screen.getByRole('table')).toHaveAttribute('aria-label', '成绩表格')
      expect(screen.getByTestId('class-filter')).toHaveAttribute('aria-label', '选择班级')
      expect(screen.getByTestId('exam-filter')).toHaveAttribute('aria-label', '选择考试')
    })

    it('should support keyboard navigation', async () => {
      mockAuthenticatedRequest
        .mockResolvedValueOnce({ success: true, data: mockGrades })
        .mockResolvedValueOnce({ success: true, data: mockClasses })
        .mockResolvedValueOnce({ success: true, data: mockExams })

      render(<GradeTable />)

      await waitFor(() => {
        expect(screen.getByText('张三')).toBeInTheDocument()
      })

      const addButton = screen.getByTestId('add-grade-button')
      addButton.focus()
      
      fireEvent.keyDown(addButton, { key: 'Enter' })
      
      expect(screen.getByTestId('add-grade-dialog')).toBeInTheDocument()
    })
  })
})
