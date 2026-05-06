import { NextRequest, NextResponse } from 'next/server';

// Error types
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  DUPLICATE_ERROR = 'DUPLICATE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

// Custom error class
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: any;

  constructor(
    message: string,
    type: ErrorType,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: any
  ) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Logger utility
export class Logger {
  private static log(level: string, message: string, meta?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      meta,
      environment: process.env.NODE_ENV || 'development'
    };

    // In production, send to logging service
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(logEntry));
    } else {
      console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
      if (meta) console.log('Meta:', meta);
    }
  }

  static info(message: string, meta?: any) {
    this.log('info', message, meta);
  }

  static warn(message: string, meta?: any) {
    this.log('warn', message, meta);
  }

  static error(message: string, error?: Error | any, meta?: any) {
    this.log('error', message, { 
      error: error?.message || error, 
      stack: error?.stack,
      ...meta 
    });
  }

  static debug(message: string, meta?: any) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, meta);
    }
  }

  static security(message: string, meta?: any) {
    this.log('security', message, {
      ...meta,
      timestamp: new Date().toISOString(),
      ip: meta?.ip || 'unknown',
      userAgent: meta?.userAgent || 'unknown'
    });
  }
}

// Audit logging for data changes
export class AuditLogger {
  static log(
    action: string,
    entity: string,
    entityId: string,
    userId: string,
    changes?: any,
    meta?: any
  ) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action,
      entity,
      entityId,
      userId,
      changes,
      meta,
      environment: process.env.NODE_ENV || 'development'
    };

    Logger.info(`AUDIT: ${action} on ${entity} ${entityId}`, auditEntry);

    // In production, store in secure audit database
    if (process.env.NODE_ENV === 'production') {
      // TODO: Implement secure audit log storage
    }
  }

  static logSecurity(
    eventType: string,
    identifier: string,
    details?: any
  ) {
    const securityEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      identifier,
      details,
      environment: process.env.NODE_ENV || 'development'
    };

    Logger.security(`SECURITY: ${eventType} from ${identifier}`, securityEntry);

    // In production, store in secure security log database
    if (process.env.NODE_ENV === 'production') {
      // TODO: Implement secure security log storage
    }
  }
}

// Error handler middleware
export function handleApiError(error: any, request?: NextRequest): NextResponse {
  Logger.error('API Error occurred', error, {
    url: request?.url,
    method: request?.method,
    userAgent: request?.headers.get('user-agent'),
    ip: request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip')
  });

  // Handle validation errors
  if (error.type === ErrorType.VALIDATION_ERROR) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation Error',
        message: error.message,
        details: error.context?.errors || []
      },
      { status: 400 }
    );
  }

  // Handle authentication errors
  if (error.type === ErrorType.AUTHENTICATION_ERROR) {
    Logger.security('Authentication failed', {
      url: request?.url,
      userAgent: request?.headers.get('user-agent')
    });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Authentication Error',
        message: 'Please provide valid authentication credentials'
      },
      { status: 401 }
    );
  }

  // Handle authorization errors
  if (error.type === ErrorType.AUTHORIZATION_ERROR) {
    Logger.security('Authorization failed', {
      url: request?.url,
      userAgent: request?.headers.get('user-agent')
    });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Authorization Error',
        message: 'You do not have permission to perform this action'
      },
      { status: 403 }
    );
  }

  // Handle not found errors
  if (error.type === ErrorType.NOT_FOUND_ERROR) {
    return NextResponse.json(
      {
        success: false,
        error: 'Not Found',
        message: error.message
      },
      { status: 404 }
    );
  }

  // Handle duplicate errors
  if (error.type === ErrorType.DUPLICATE_ERROR) {
    return NextResponse.json(
      {
        success: false,
        error: 'Duplicate Entry',
        message: error.message
      },
      { status: 409 }
    );
  }

  // Handle rate limit errors
  if (error.type === ErrorType.RATE_LIMIT_ERROR) {
    return NextResponse.json(
      {
        success: false,
        error: 'Rate Limit Exceeded',
        message: 'Too many requests. Please try again later.'
      },
      { status: 429 }
    );
  }

  // Handle database errors
  if (error.type === ErrorType.DATABASE_ERROR) {
    Logger.error('Database error occurred', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Database Error',
        message: 'An error occurred while processing your request'
      },
      { status: 500 }
    );
  }

  // Handle all other errors
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return NextResponse.json(
    {
      success: false,
      error: 'Internal Server Error',
      message: isDevelopment ? error.message : 'An unexpected error occurred',
      ...(isDevelopment && { stack: error.stack, context: error.context })
    },
    { status: error.statusCode || 500 }
  );
}

// Validation error helper
export function createValidationError(errors: string[], context?: any): AppError {
  return new AppError(
    'Validation failed',
    ErrorType.VALIDATION_ERROR,
    400,
    true,
    { errors, ...context }
  );
}

// Authentication error helper
export function createAuthenticationError(message: string = 'Authentication required'): AppError {
  return new AppError(message, ErrorType.AUTHENTICATION_ERROR, 401);
}

// Authorization error helper
export function createAuthorizationError(message: string = 'Insufficient permissions'): AppError {
  return new AppError(message, ErrorType.AUTHORIZATION_ERROR, 403);
}

// Not found error helper
export function createNotFoundError(entity: string, id?: string): AppError {
  const message = id ? `${entity} with id ${id} not found` : `${entity} not found`;
  return new AppError(message, ErrorType.NOT_FOUND_ERROR, 404);
}

// Duplicate error helper
export function createDuplicateError(entity: string, field: string, value: string): AppError {
  return new AppError(
    `${entity} with ${field} '${value}' already exists`,
    ErrorType.DUPLICATE_ERROR,
    409
  );
}

// Database error helper
export function createDatabaseError(message: string, originalError?: any): AppError {
  return new AppError(
    message,
    ErrorType.DATABASE_ERROR,
    500,
    true,
    { originalError: originalError?.message }
  );
}

// Rate limit error helper
export function createRateLimitError(limit: number, windowMs: number): AppError {
  return new AppError(
    `Rate limit exceeded. Maximum ${limit} requests per ${windowMs}ms allowed.`,
    ErrorType.RATE_LIMIT_ERROR,
    429
  );
}
