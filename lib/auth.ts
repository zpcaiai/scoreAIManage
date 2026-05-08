import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// JWT Secret - In production, this should be stored in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// User roles and permissions
export enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student'
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  permissions: string[];
}

// JWT token generation
export function generateToken(user: User): string {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role,
      permissions: user.permissions 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// JWT token verification
export function verifyToken(token: string): User | null {
  try {
    console.log('[verifyToken] Attempting to verify token');
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log('[verifyToken] Token decoded successfully:', decoded);
    return {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      permissions: decoded.permissions
    };
  } catch (error) {
    console.error('[verifyToken] Token verification failed:', error);
    return null;
  }
}

// Authentication middleware
export function authenticate(request: NextRequest): User | null {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  return verifyToken(token);
}

// Authorization middleware (teacher has access to everything)
export function authorize(user: User, requiredRole: UserRole): boolean {
  // If the user is a teacher, they have full access (since admin is removed)
  if (user.role === UserRole.TEACHER) return true;
  
  // Basic hierarchy if needed in the future
  if (requiredRole === UserRole.STUDENT && (user.role === UserRole.ADMIN || user.role === UserRole.TEACHER)) {
    return true;
  }
  
  return user.role === requiredRole;
}

// Permission check (no admin privilege anymore)
export function hasPermission(user: User, permission: string): boolean {
  return user.permissions.includes(permission);
}

// Default permissions for teacher role (unified admin and teacher)
export const DEFAULT_PERMISSIONS = {
  [UserRole.TEACHER]: [
    'read:classes', 'write:classes', 'delete:classes',
    'read:students', 'write:students', 'delete:students',
    'read:grades', 'write:grades', 'delete:grades',
    'read:statistics', 'export:data', 'manage:users'
  ]
};
