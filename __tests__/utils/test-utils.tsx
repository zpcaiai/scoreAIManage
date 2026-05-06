import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'

// Create a test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
})

// Custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialAuthState?: {
    user: any
    isAuthenticated: boolean
  }
  queryClient?: QueryClient
}

const AllTheProviders = ({ 
  children, 
  initialAuthState,
  queryClient 
}: { 
  children: React.ReactNode
  initialAuthState?: { user: any; isAuthenticated: boolean }
  queryClient?: QueryClient
}) => {
  const testQueryClient = queryClient || createTestQueryClient()
  
  const mockAuthValue = {
    user: initialAuthState?.user || null,
    isAuthenticated: initialAuthState?.isAuthenticated || false,
    login: jest.fn(),
    logout: jest.fn(),
    loading: false,
    authenticatedRequest: jest.fn()
  }

  return (
    <QueryClientProvider client={testQueryClient}>
      <AuthProvider value={mockAuthValue}>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  )
}

const customRender = (
  ui: ReactElement,
  {
    initialAuthState,
    queryClient,
    ...renderOptions
  }: CustomRenderOptions = {}
) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AllTheProviders initialAuthState={initialAuthState} queryClient={queryClient}>
      {children}
    </AllTheProviders>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Mock user data
export const mockUsers = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    username: 'teacher1',
    email: 'teacher1@example.com',
    role: 'teacher',
    createdAt: '2024-01-02T00:00:00Z'
  },
  {
    id: '3',
    username: 'student1',
    email: 'student1@example.com',
    role: 'student',
    createdAt: '2024-01-03T00:00:00Z'
  }
]

// Mock student data
export const mockStudents = [
  {
    student_id: '1',
    student_name: '张三',
    class_id: '1',
    class_name: '高一(1)班',
    seat_number: 1,
    gender: '男',
    birth_date: '2006-05-15'
  },
  {
    student_id: '2',
    student_name: '李四',
    class_id: '1',
    class_name: '高一(1)班',
    seat_number: 2,
    gender: '女',
    birth_date: '2006-08-20'
  }
]

// Mock class data
export const mockClasses = [
  {
    class_id: '1',
    class_name: '高一(1)班',
    grade_level: 1,
    teacher_id: '1',
    teacher_name: '张老师',
    student_count: 45
  },
  {
    class_id: '2',
    class_name: '高一(2)班',
    grade_level: 1,
    teacher_id: '2',
    teacher_name: '李老师',
    student_count: 44
  }
]

// Mock subject data
export const mockSubjects = [
  {
    subject_id: '1',
    subject_code: 'CHN',
    subject_name: '语文',
    credit: 5,
    is_compulsory: true
  },
  {
    subject_id: '2',
    subject_code: 'MATH',
    subject_name: '数学',
    credit: 5,
    is_compulsory: true
  },
  {
    subject_id: '3',
    subject_code: 'ENG',
    subject_name: '英语',
    credit: 4,
    is_compulsory: true
  }
]

// Mock exam data
export const mockExams = [
  {
    exam_id: '1',
    exam_name: '期中考试',
    exam_type: 'midterm',
    academic_year: '2024',
    semester: '1',
    start_date: '2024-05-10',
    end_date: '2024-05-15'
  },
  {
    exam_id: '2',
    exam_name: '期末考试',
    exam_type: 'final',
    academic_year: '2024',
    semester: '1',
    start_date: '2024-07-05',
    end_date: '2024-07-10'
  }
]

// Mock grade data
export const mockGrades = [
  {
    grade_id: '1',
    student_id: '1',
    student_name: '张三',
    class_name: '高一(1)班',
    seat_number: 1,
    subject_id: '1',
    subject_name: '语文',
    exam_id: '1',
    exam_name: '期中考试',
    score: 85,
    semester: '1',
    academic_year: '2024'
  },
  {
    grade_id: '2',
    student_id: '1',
    student_name: '张三',
    class_name: '高一(1)班',
    seat_number: 1,
    subject_id: '2',
    subject_name: '数学',
    exam_id: '1',
    exam_name: '期中考试',
    score: 92,
    semester: '1',
    academic_year: '2024'
  }
]

// Helper function to wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Helper function to mock API responses
export const mockApiResponse = (data: any, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data))
  })
}

// Helper function to mock fetch
export const mockFetch = (response: any, status = 200) => {
  global.fetch = jest.fn().mockResolvedValue(mockApiResponse(response, status))
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render }
export { default as userEvent } from '@testing-library/user-event'
