import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-middleware';
import { generateToken, User, UserRole, DEFAULT_PERMISSIONS } from '@/lib/auth';
import { validateString } from '@/lib/validation';
import { Logger, AuditLogger } from '@/lib/error-handler';

// Mock user database - In production, use real database with hashed passwords
const mockUsers = [
  {
    id: 'admin-1',
    username: 'admin',
    password: 'admin123', // In production, use hashed passwords
    role: UserRole.ADMIN,
    permissions: DEFAULT_PERMISSIONS[UserRole.ADMIN]
  },
  {
    id: 'teacher-1',
    username: 'teacher',
    password: 'teacher123',
    role: UserRole.TEACHER,
    permissions: DEFAULT_PERMISSIONS[UserRole.TEACHER]
  },
  {
    id: 'student-1',
    username: 'student',
    password: 'student123',
    role: UserRole.STUDENT,
    permissions: DEFAULT_PERMISSIONS[UserRole.STUDENT]
  }
];

// POST /api/auth/login - User login
export const POST = apiHandler(
  async (request, { validatedData }) => {
    const { username, password } = validatedData;
    
    // Find user by username
    const user = mockUsers.find(u => u.username === username);
    
    if (!user) {
      Logger.security('Login attempt with invalid username', { username });
      throw new Error('Invalid credentials');
    }
    
    // In production, use proper password hashing (bcrypt, argon2, etc.)
    if (user.password !== password) {
      Logger.security('Login attempt with invalid password', { username, userId: user.id });
      throw new Error('Invalid credentials');
    }
    
    // Generate JWT token
    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions
    });
    
    // Audit logging
    AuditLogger.log(
      'LOGIN',
      'user',
      user.id,
      user.id,
      { username, role: user.role }
    );
    
    Logger.info('User logged in successfully', { 
      userId: user.id, 
      username: user.username, 
      role: user.role 
    });
    
    // Return user info and token (exclude password)
    const { password: _, ...userInfo } = user;
    
    return NextResponse.json({
      success: true,
      data: {
        user: userInfo,
        token,
        expiresIn: '24h'
      },
      message: 'Login successful'
    });
  },
  {
    requireAuth: false, // Login doesn't require authentication
    rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 login attempts per 15 minutes
    validator: (data: any) => {
      const errors: string[] = [];
      const sanitized: any = {};
      
      const usernameResult = validateString(data.username, 50);
      if (!usernameResult.sanitized) {
        errors.push('Username is required');
      } else {
        sanitized.username = usernameResult.sanitized;
      }
      
      const passwordResult = validateString(data.password, 255);
      if (!passwordResult.sanitized) {
        errors.push('Password is required');
      } else {
        sanitized.password = passwordResult.sanitized;
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        sanitized
      };
    }
  }
);
