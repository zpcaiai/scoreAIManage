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
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      permissions: decoded.permissions
    };
  } catch (error) {
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

// Authorization middleware
export function authorize(user: User, requiredRole: UserRole): boolean {
  const roleHierarchy = {
    [UserRole.ADMIN]: 3,
    [UserRole.TEACHER]: 2,
    [UserRole.STUDENT]: 1
  };
  
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

// Permission check
export function hasPermission(user: User, permission: string): boolean {
  return user.permissions.includes(permission) || user.role === UserRole.ADMIN;
}

// Default permissions for each role
export const DEFAULT_PERMISSIONS = {
  [UserRole.ADMIN]: [
    'read:classes', 'write:classes', 'delete:classes',
    'read:students', 'write:students', 'delete:students',
    'read:grades', 'write:grades', 'delete:grades',
    'read:statistics', 'export:data', 'manage:users'
  ],
  [UserRole.TEACHER]: [
    'read:classes', 'read:students', 'write:students',
    'read:grades', 'write:grades', 'read:statistics'
  ],
  [UserRole.STUDENT]: [
    'read:own:grades', 'read:own:profile'
  ]
};
