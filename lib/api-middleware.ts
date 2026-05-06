import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authorize, UserRole, User } from './auth';
import { Logger, createRateLimitError, handleApiError, AppError, ErrorType } from './error-handler';

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Default rate limits by role
const RATE_LIMITS: Record<UserRole, RateLimitConfig> = {
  [UserRole.ADMIN]: { windowMs: 15 * 60 * 1000, maxRequests: 1000 }, // 1000 requests per 15 minutes
  [UserRole.TEACHER]: { windowMs: 15 * 60 * 1000, maxRequests: 500 }, // 500 requests per 15 minutes
  [UserRole.STUDENT]: { windowMs: 15 * 60 * 1000, maxRequests: 100 } // 100 requests per 15 minutes
};

// Rate limiting middleware
export function rateLimit(config?: Partial<RateLimitConfig>) {
  return async (request: NextRequest, user?: User): Promise<void> => {
    const clientIp = getClientIp(request);
    const key = `rate_limit:${clientIp}:${user?.role || 'anonymous'}`;
    
    const defaultConfig = RATE_LIMITS[user?.role || UserRole.STUDENT];
    const limitConfig: RateLimitConfig = {
      windowMs: config?.windowMs ?? defaultConfig.windowMs,
      maxRequests: config?.maxRequests ?? defaultConfig.maxRequests,
      skipSuccessfulRequests: config?.skipSuccessfulRequests ?? defaultConfig.skipSuccessfulRequests,
      skipFailedRequests: config?.skipFailedRequests ?? defaultConfig.skipFailedRequests
    };
    
    const now = Date.now();
    const windowStart = now - limitConfig.windowMs;
    
    let rateLimitData = rateLimitStore.get(key);
    
    if (!rateLimitData || rateLimitData.resetTime <= now) {
      rateLimitData = { count: 0, resetTime: now + limitConfig.windowMs };
      rateLimitStore.set(key, rateLimitData);
    }
    
    rateLimitData.count++;
    
    if (rateLimitData.count > limitConfig.maxRequests) {
      Logger.security('Rate limit exceeded', {
        ip: clientIp,
        user: user?.username,
        role: user?.role,
        count: rateLimitData.count,
        limit: limitConfig.maxRequests,
        window: limitConfig.windowMs
      });
      
      throw createRateLimitError(limitConfig.maxRequests, limitConfig.windowMs);
    }
    
    // Clean up expired entries
    if (Math.random() < 0.01) { // 1% chance to clean up
      cleanupRateLimitStore();
    }
  };
}

// Clean up expired rate limit entries
function cleanupRateLimitStore(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  rateLimitStore.forEach((data, key) => {
    if (data.resetTime <= now) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => rateLimitStore.delete(key));
}

// Get client IP from request
function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') ||
         request.headers.get('x-real-ip') ||
         request.ip ||
         'unknown';
}

// CORS middleware
export function cors(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin');
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
  
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin || '') ? (origin || '') : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
  };
  
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers });
  }
  
  return null;
}

// Security headers middleware
export function securityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  return response;
}

// Request logging middleware
export function requestLogger(request: NextRequest, user?: User): void {
  const startTime = Date.now();
  const clientIp = getClientIp(request);
  
  Logger.info('API Request', {
    method: request.method,
    url: request.url,
    ip: clientIp,
    userAgent: request.headers.get('user-agent'),
    user: user?.username,
    role: user?.role,
    timestamp: new Date().toISOString()
  });
  
  // Store start time for duration calculation
  (request as any)._startTime = startTime;
}

// Response logging middleware
export function responseLogger(request: NextRequest, response: NextResponse, user?: User): void {
  const startTime = (request as any)._startTime;
  const duration = startTime ? Date.now() - startTime : 0;
  
  Logger.info('API Response', {
    method: request.method,
    url: request.url,
    status: response.status,
    duration: `${duration}ms`,
    user: user?.username,
    role: user?.role,
    timestamp: new Date().toISOString()
  });
}

// Authentication middleware
export function requireAuth(requiredRole?: UserRole) {
  return async (request: NextRequest): Promise<User> => {
    const user = authenticate(request);
    
    if (!user) {
      throw new AppError('Authentication required', ErrorType.AUTHENTICATION_ERROR, 401);
    }
    
    if (requiredRole && !authorize(user, requiredRole)) {
      throw new AppError('Insufficient permissions', ErrorType.AUTHORIZATION_ERROR, 403);
    }
    
    return user;
  };
}

// Input validation middleware
export function validateInput(validator: (data: any) => { isValid: boolean; errors: string[]; sanitized?: any }) {
  return async (request: NextRequest): Promise<any> => {
    try {
      const body = await request.json();
      const result = validator(body);
      
      if (!result.isValid) {
        throw new AppError(
          'Validation failed',
          ErrorType.VALIDATION_ERROR,
          400,
          true,
          { errors: result.errors }
        );
      }
      
      return result.sanitized || body;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Invalid JSON in request body', ErrorType.VALIDATION_ERROR, 400);
    }
  };
}

// API wrapper middleware
export function apiHandler(
  handler: (request: NextRequest, context: { user?: User; validatedData?: any; params?: any }) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean;
    requiredRole?: UserRole;
    rateLimit?: Partial<RateLimitConfig>;
    validator?: (data: any) => { isValid: boolean; errors: string[]; sanitized?: any };
  } = {}
) {
  return async (request: NextRequest, params?: any): Promise<NextResponse> => {
    const startTime = Date.now();
    let user: User | undefined;
    let validatedData: any;
    
    try {
      // CORS check
      const corsResponse = cors(request);
      if (corsResponse) return corsResponse;
      
      // Authentication
      if (options.requireAuth) {
        user = await requireAuth(options.requiredRole)(request);
      }
      
      // Rate limiting
      const rateLimiter = rateLimit(options.rateLimit);
      await rateLimiter(request, user);
      
      // Request logging
      requestLogger(request, user);
      
      // Input validation
      if (options.validator) {
        validatedData = await validateInput(options.validator)(request);
      }
      
      // Execute handler
      const response = await handler(request, { user, validatedData, params });
      
      // Add security headers
      securityHeaders(response);
      
      // Response logging
      responseLogger(request, response, user);
      
      return response;
      
    } catch (error) {
      // Error handling
      const errorResponse = handleApiError(error, request);
      securityHeaders(errorResponse);
      responseLogger(request, errorResponse, user);
      return errorResponse;
    }
  };
}

// CSRF protection (simplified version)
export function csrfProtection(request: NextRequest): void {
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
    return; // Skip CSRF protection for safe methods
  }
  
  const csrfToken = request.headers.get('x-csrf-token');
  const sessionToken = request.headers.get('authorization');
  
  if (!csrfToken || !sessionToken) {
    throw new AppError('CSRF token missing', ErrorType.AUTHENTICATION_ERROR, 403);
  }
  
  // In production, implement proper CSRF token validation
  // For now, we'll just check if both tokens are present
  Logger.security('CSRF check', {
    hasCsrfToken: !!csrfToken,
    hasSessionToken: !!sessionToken
  });
}

// Content type validation
export function validateContentType(request: NextRequest, allowedTypes: string[] = ['application/json']): void {
  const contentType = request.headers.get('content-type');
  
  if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
    throw new AppError(
      `Content-Type must be one of: ${allowedTypes.join(', ')}`,
      ErrorType.VALIDATION_ERROR,
      400
    );
  }
}

// Request size limiting
export function validateRequestSize(request: NextRequest, maxSize: number = 10 * 1024 * 1024): void {
  const contentLength = request.headers.get('content-length');
  
  if (contentLength && parseInt(contentLength) > maxSize) {
    throw new AppError(
      `Request too large. Maximum size is ${maxSize} bytes`,
      ErrorType.VALIDATION_ERROR,
      413
    );
  }
}
