import '@testing-library/jest-dom'
import { configure } from '@testing-library/react'

// Polyfill for Request/Response in Node.js environment
import { TextEncoder, TextDecoder } from 'util'
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Simple fetch mock
global.fetch = jest.fn()

// Mock Request/Response globally
global.Request = class Request {
  constructor(input, init) {
    this.url = input
    this.method = init?.method || 'GET'
    this.headers = init?.headers || {}
    this.body = init?.body
  }
}

global.Response = class Response {
  constructor(body, init) {
    this.body = body
    this.status = init?.status || 200
    this.statusText = init?.statusText || 'OK'
    this.headers = init?.headers || {}
  }
  
  static json(data) {
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  async json() {
    return JSON.parse(this.body)
  }
}

// Configure testing library
configure({ testIdAttribute: 'data-testid' })

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: '',
      asPath: '',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars'

// Mock crypto for Node.js environment
Object.defineProperty(global, 'crypto', {
  value: {
    randomBytes: jest.fn(() => ({
      toString: jest.fn(() => 'mock-random-string')
    })),
    createHash: jest.fn(() => ({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn(() => 'mock-hash')
    })),
    createHmac: jest.fn(() => ({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn(() => 'mock-hmac')
    }))
  }
})

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.sessionStorage = sessionStorageMock

// Mock fetch
global.fetch = jest.fn()

// Setup test environment
beforeAll(() => {
  // Additional setup if needed
})

// Reset mocks after each test
afterEach(() => {
  jest.clearAllMocks()
})

// Cleanup after all tests
afterAll(() => {
  // Additional cleanup if needed
})

// Suppress console warnings in tests
const originalWarn = console.warn
const originalError = console.error

beforeAll(() => {
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('componentWillReceiveProps')
    ) {
      return
    }
    originalWarn(...args)
  }
  
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is deprecated') ||
       args[0].includes('Warning: `ReactDOMTestUtils.act`'))
    ) {
      return
    }
    originalError(...args)
  }
})

afterAll(() => {
  console.warn = originalWarn
  console.error = originalError
})
