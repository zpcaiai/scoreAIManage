/**
 * 数据访问控制和权限验证系统
 * 实施细粒度的数据访问控制策略
 */

import { UserRole } from './auth';
import { AuditLogger } from './error-handler';
import { SensitiveOperationValidator } from './security-middleware';

// 权限类型
export enum Permission {
  // 用户管理
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  
  // 学生管理
  STUDENT_CREATE = 'student:create',
  STUDENT_READ = 'student:read',
  STUDENT_UPDATE = 'student:update',
  STUDENT_DELETE = 'student:delete',
  
  // 班级管理
  CLASS_CREATE = 'class:create',
  CLASS_READ = 'class:read',
  CLASS_UPDATE = 'class:update',
  CLASS_DELETE = 'class:delete',
  
  // 成绩管理
  GRADE_CREATE = 'grade:create',
  GRADE_READ = 'grade:read',
  GRADE_UPDATE = 'grade:update',
  GRADE_DELETE = 'grade:delete',
  GRADE_EXPORT = 'grade:export',
  
  // 统计分析
  STATISTICS_VIEW = 'statistics:view',
  STATISTICS_EXPORT = 'statistics:export',
  
  // 系统管理
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_BACKUP = 'system:backup',
  SYSTEM_MONITOR = 'system:monitor',
  
  // 数据导出
  DATA_EXPORT = 'data:export',
  DATA_IMPORT = 'data:import'
}

// 资源类型
export enum ResourceType {
  USER = 'user',
  STUDENT = 'student',
  CLASS = 'class',
  GRADE = 'grade',
  SUBJECT = 'subject',
  EXAM = 'exam',
  STATISTICS = 'statistics',
  SYSTEM = 'system'
}

// 访问控制策略
interface AccessPolicy {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  conditions?: AccessCondition[];
  effect: 'allow' | 'deny';
  priority: number;
}

// 访问条件
interface AccessCondition {
  type: 'time' | 'location' | 'ip' | 'device' | 'data_sensitivity';
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value: any;
}

// 访问请求
interface AccessRequest {
  userId: string;
  userRole: UserRole;
  resource: ResourceType;
  action: Permission;
  resourceId?: string;
  context?: any;
}

// 访问决策
interface AccessDecision {
  allowed: boolean;
  reason?: string;
  conditions?: string[];
  requiresMFA?: boolean;
  expiresAt?: number;
}

export class AccessControlSystem {
  private static instance: AccessControlSystem;
  private policies: Map<string, AccessPolicy> = new Map();
  private rolePermissions: Map<UserRole, Set<Permission>> = new Map();
  private userPermissions: Map<string, Set<Permission>> = new Map();
  private resourceOwners: Map<string, string> = new Map(); // resourceId -> userId
  
  static getInstance(): AccessControlSystem {
    if (!AccessControlSystem.instance) {
      AccessControlSystem.instance = new AccessControlSystem();
      AccessControlSystem.instance.initializeDefaultPolicies();
    }
    return AccessControlSystem.instance;
  }
  
  // 检查访问权限
  async checkAccess(request: AccessRequest): Promise<AccessDecision> {
    const startTime = Date.now();
    
    try {
      // 记录访问请求
      AuditLogger.logSecurity('ACCESS_REQUEST', request.userId, {
        resource: request.resource,
        action: request.action,
        resourceId: request.resourceId
      });
      
      // 1. 检查基本权限
      const hasBasicPermission = this.checkBasicPermission(request.userRole, request.action);
      if (!hasBasicPermission) {
        return this.createDenialDecision('Insufficient role permissions');
      }
      
      // 2. 检查用户特定权限
      const hasUserPermission = this.checkUserPermission(request.userId, request.action);
      if (!hasUserPermission) {
        return this.createDenialDecision('User lacks required permission');
      }
      
      // 3. 检查资源所有权
      if (request.resourceId && !this.checkResourceOwnership(request.userId, request.resourceId)) {
        // 如果不是资源所有者，检查是否有管理权限
        if (!this.hasAdminPermission(request.userRole)) {
          return this.createDenialDecision('Access denied: not resource owner');
        }
      }
      
      // 4. 检查访问策略
      const policyDecision = await this.evaluatePolicies(request);
      if (!policyDecision.allowed) {
        return policyDecision;
      }
      
      // 5. 检查数据敏感性
      const sensitivityCheck = this.checkDataSensitivity(request);
      if (!sensitivityCheck.allowed) {
        return sensitivityCheck;
      }
      
      // 6. 检查时间和位置限制
      const contextCheck = this.checkAccessContext(request);
      if (!contextCheck.allowed) {
        return contextCheck;
      }
      
      // 记录成功访问
      const decision = this.createAllowDecision();
      
      AuditLogger.logSecurity('ACCESS_GRANTED', request.userId, {
        resource: request.resource,
        action: request.action,
        resourceId: request.resourceId,
        duration: Date.now() - startTime
      });
      
      return decision;
      
    } catch (error) {
      AuditLogger.logSecurity('ACCESS_CHECK_ERROR', request.userId, {
        error: error instanceof Error ? error.message : String(error),
        resource: request.resource,
        action: request.action
      });
      
      return this.createDenialDecision('Access check failed');
    }
  }
  
  // 检查批量访问权限
  async checkBatchAccess(requests: AccessRequest[]): Promise<Map<string, AccessDecision>> {
    const decisions = new Map<string, AccessDecision>();
    
    for (const request of requests) {
      const requestKey = `${request.userId}:${request.resource}:${request.action}:${request.resourceId || 'all'}`;
      decisions.set(requestKey, await this.checkAccess(request));
    }
    
    return decisions;
  }
  
  // 添加权限策略
  addPolicy(policy: AccessPolicy): void {
    this.policies.set(policy.id, policy);
    
    AuditLogger.logSecurity('POLICY_ADDED', 'system', {
      policyId: policy.id,
      policyName: policy.name,
      permissions: policy.permissions
    });
  }
  
  // 移除权限策略
  removePolicy(policyId: string): void {
    this.policies.delete(policyId);
    
    AuditLogger.logSecurity('POLICY_REMOVED', 'system', {
      policyId: policyId
    });
  }
  
  // 为用户分配权限
  grantUserPermission(userId: string, permission: Permission): void {
    if (!this.userPermissions.has(userId)) {
      this.userPermissions.set(userId, new Set());
    }
    this.userPermissions.get(userId)!.add(permission);
    
    AuditLogger.logSecurity('PERMISSION_GRANTED', userId, {
      permission
    });
  }
  
  // 撤销用户权限
  revokeUserPermission(userId: string, permission: Permission): void {
    const permissions = this.userPermissions.get(userId);
    if (permissions) {
      permissions.delete(permission);
      
      AuditLogger.logSecurity('PERMISSION_REVOKED', userId, {
        permission
      });
    }
  }
  
  // 设置资源所有者
  setResourceOwner(resourceId: string, userId: string): void {
    this.resourceOwners.set(resourceId, userId);
    
    AuditLogger.logSecurity('RESOURCE_OWNER_SET', userId, {
      resourceId
    });
  }
  
  // 获取用户权限
  getUserPermissions(userId: string): Permission[] {
    const rolePermissions = this.rolePermissions.get(this.getUserRole(userId)) || new Set();
    const userSpecificPermissions = this.userPermissions.get(userId) || new Set();
    
    const allPermissions = new Set<Permission>();
    rolePermissions.forEach(p => allPermissions.add(p));
    userSpecificPermissions.forEach(p => allPermissions.add(p));
    
    return Array.from(allPermissions);
  }
  
  // 获取角色权限
  getRolePermissions(role: UserRole): Permission[] {
    return Array.from(this.rolePermissions.get(role) || new Set());
  }
  
  // 检查基本权限
  private checkBasicPermission(role: UserRole, permission: Permission): boolean {
    const rolePerms = this.rolePermissions.get(role);
    return rolePerms ? rolePerms.has(permission) : false;
  }
  
  // 检查用户权限
  private checkUserPermission(userId: string, permission: Permission): boolean {
    const userPerms = this.userPermissions.get(userId);
    return userPerms ? userPerms.has(permission) : false;
  }
  
  // 检查资源所有权
  private checkResourceOwnership(userId: string, resourceId: string): boolean {
    return this.resourceOwners.get(resourceId) === userId;
  }
  
  // 检查管理员权限
  private hasAdminPermission(role: UserRole): boolean {
    return role === UserRole.ADMIN;
  }
  
  // 评估访问策略
  private async evaluatePolicies(request: AccessRequest): Promise<AccessDecision> {
    const applicablePolicies = Array.from(this.policies.values())
      .filter(policy => policy.permissions.includes(request.action))
      .sort((a, b) => b.priority - a.priority);
    
    for (const policy of applicablePolicies) {
      const conditionsMet = await this.evaluateConditions(policy.conditions || [], request);
      
      if (conditionsMet) {
        if (policy.effect === 'deny') {
          return this.createDenialDecision(`Denied by policy: ${policy.name}`);
        } else {
          return this.createAllowDecision();
        }
      }
    }
    
    return this.createAllowDecision(); // 默认允许
  }
  
  // 评估访问条件
  private async evaluateConditions(conditions: AccessCondition[], request: AccessRequest): Promise<boolean> {
    for (const condition of conditions) {
      const result = await this.evaluateCondition(condition, request);
      if (!result) {
        return false;
      }
    }
    return true;
  }
  
  // 评估单个条件
  private async evaluateCondition(condition: AccessCondition, request: AccessRequest): Promise<boolean> {
    const context = request.context || {};
    
    switch (condition.type) {
      case 'time':
        return this.evaluateTimeCondition(condition, context);
      case 'location':
        return this.evaluateLocationCondition(condition, context);
      case 'ip':
        return this.evaluateIPCondition(condition, context);
      case 'device':
        return this.evaluateDeviceCondition(condition, context);
      case 'data_sensitivity':
        return this.evaluateDataSensitivityCondition(condition, context);
      default:
        return true;
    }
  }
  
  // 评估时间条件
  private evaluateTimeCondition(condition: AccessCondition, context: any): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    
    switch (condition.operator) {
      case 'greater_than':
        return currentHour > condition.value;
      case 'less_than':
        return currentHour < condition.value;
      case 'in':
        return condition.value.includes(currentHour);
      case 'not_in':
        return !condition.value.includes(currentHour);
      default:
        return true;
    }
  }
  
  // 评估位置条件
  private evaluateLocationCondition(condition: AccessCondition, context: any): boolean {
    const location = context.location || 'unknown';
    
    switch (condition.operator) {
      case 'equals':
        return location === condition.value;
      case 'not_equals':
        return location !== condition.value;
      case 'in':
        return condition.value.includes(location);
      case 'not_in':
        return !condition.value.includes(location);
      default:
        return true;
    }
  }
  
  // 评估IP条件
  private evaluateIPCondition(condition: AccessCondition, context: any): boolean {
    const ip = context.ip || 'unknown';
    
    switch (condition.operator) {
      case 'equals':
        return ip === condition.value;
      case 'not_equals':
        return ip !== condition.value;
      case 'in':
        return condition.value.includes(ip);
      case 'not_in':
        return !condition.value.includes(ip);
      default:
        return true;
    }
  }
  
  // 评估设备条件
  private evaluateDeviceCondition(condition: AccessCondition, context: any): boolean {
    const device = context.device || 'unknown';
    
    switch (condition.operator) {
      case 'equals':
        return device === condition.value;
      case 'not_equals':
        return device !== condition.value;
      case 'in':
        return condition.value.includes(device);
      case 'not_in':
        return !condition.value.includes(device);
      default:
        return true;
    }
  }
  
  // 评估数据敏感性条件
  private evaluateDataSensitivityCondition(condition: AccessCondition, context: any): boolean {
    const sensitivity = context.dataSensitivity || 'low';
    
    switch (condition.operator) {
      case 'equals':
        return sensitivity === condition.value;
      case 'not_equals':
        return sensitivity !== condition.value;
      case 'in':
        return condition.value.includes(sensitivity);
      case 'not_in':
        return !condition.value.includes(sensitivity);
      default:
        return true;
    }
  }
  
  // 检查数据敏感性
  private checkDataSensitivity(request: AccessRequest): AccessDecision {
    const sensitiveResources = [ResourceType.USER, ResourceType.STUDENT, ResourceType.GRADE];
    
    if (sensitiveResources.includes(request.resource)) {
      // 检查是否需要额外验证
      if (request.userRole === UserRole.STUDENT && request.resource === ResourceType.GRADE) {
        // 学生只能查看自己的成绩
        if (request.resourceId && !this.checkResourceOwnership(request.userId, request.resourceId)) {
          return this.createDenialDecision('Students can only access their own grades');
        }
      }
    }
    
    return this.createAllowDecision();
  }
  
  // 检查访问上下文
  private checkAccessContext(request: AccessRequest): AccessDecision {
    const context = request.context || {};
    
    // 检查访问时间
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      // 非工作时间需要额外验证
      if (request.userRole !== UserRole.ADMIN) {
        return {
          allowed: true,
          requiresMFA: true,
          reason: 'Access outside business hours requires MFA'
        };
      }
    }
    
    return this.createAllowDecision();
  }
  
  // 创建允许决策
  private createAllowDecision(): AccessDecision {
    return {
      allowed: true
    };
  }
  
  // 创建拒绝决策
  private createDenialDecision(reason: string): AccessDecision {
    return {
      allowed: false,
      reason
    };
  }
  
  // 获取用户角色
  private getUserRole(userId: string): UserRole {
    // 这里应该从数据库获取用户角色
    // 简化实现
    return UserRole.STUDENT;
  }
  
  // 初始化默认策略
  private initializeDefaultPolicies(): void {
    // 管理员策略
    this.addPolicy({
      id: 'admin_full_access',
      name: 'Administrator Full Access',
      description: 'Full access for administrators',
      permissions: Object.values(Permission),
      effect: 'allow',
      priority: 100
    });
    
    // 教师策略
    this.addPolicy({
      id: 'teacher_limited_access',
      name: 'Teacher Limited Access',
      description: 'Limited access for teachers',
      permissions: [
        Permission.STUDENT_READ,
        Permission.STUDENT_UPDATE,
        Permission.CLASS_READ,
        Permission.GRADE_CREATE,
        Permission.GRADE_READ,
        Permission.GRADE_UPDATE,
        Permission.GRADE_EXPORT,
        Permission.STATISTICS_VIEW,
        Permission.STATISTICS_EXPORT
      ],
      effect: 'allow',
      priority: 50
    });
    
    // 学生策略
    this.addPolicy({
      id: 'student_restricted_access',
      name: 'Student Restricted Access',
      description: 'Restricted access for students',
      permissions: [
        Permission.CLASS_READ,
        Permission.GRADE_READ,
        Permission.STATISTICS_VIEW
      ],
      effect: 'allow',
      priority: 25
    });
    
    // 非工作时间限制策略
    this.addPolicy({
      id: 'business_hours_only',
      name: 'Business Hours Only',
      description: 'Restrict access to business hours for non-admins',
      permissions: Object.values(Permission),
      conditions: [
        {
          type: 'time',
          operator: 'not_in',
          value: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]
        }
      ],
      effect: 'deny',
      priority: 75
    });
    
    // 初始化角色权限
    this.initializeRolePermissions();
  }
  
  // 初始化角色权限
  private initializeRolePermissions(): void {
    // 管理员权限
    this.rolePermissions.set(UserRole.ADMIN, new Set(Object.values(Permission)));
    
    // 教师权限
    this.rolePermissions.set(UserRole.TEACHER, new Set([
      Permission.STUDENT_READ,
      Permission.STUDENT_UPDATE,
      Permission.CLASS_READ,
      Permission.GRADE_CREATE,
      Permission.GRADE_READ,
      Permission.GRADE_UPDATE,
      Permission.GRADE_EXPORT,
      Permission.STATISTICS_VIEW,
      Permission.STATISTICS_EXPORT
    ]));
    
    // 学生权限
    this.rolePermissions.set(UserRole.STUDENT, new Set([
      Permission.CLASS_READ,
      Permission.GRADE_READ,
      Permission.STATISTICS_VIEW
    ]));
  }
}

// 数据访问控制装饰器
export function RequirePermission(permission: Permission) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const accessControl = AccessControlSystem.getInstance();
      const userId = (this as any).getUserId?.() || args[0]?.userId || 'unknown';
      const userRole = (this as any).getUserRole?.() || args[0]?.userRole || UserRole.STUDENT;
      
      const request: AccessRequest = {
        userId,
        userRole,
        resource: ResourceType.SYSTEM,
        action: permission,
        context: args[0]?.context
      };
      
      const decision = await accessControl.checkAccess(request);
      
      if (!decision.allowed) {
        throw new Error(`Access denied: ${decision.reason}`);
      }
      
      return method.apply(this, args);
    };
  };
}

// 资源访问控制中间件
export function createAccessControlMiddleware(resource: ResourceType, action: Permission) {
  return async (req: any, res: any, next: any) => {
    try {
      const accessControl = AccessControlSystem.getInstance();
      const userId = req.user?.id || 'unknown';
      const userRole = req.user?.role || UserRole.STUDENT;
      
      const request: AccessRequest = {
        userId,
        userRole,
        resource,
        action,
        resourceId: req.params.id,
        context: {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          location: req.headers['x-location']
        }
      };
      
      const decision = await accessControl.checkAccess(request);
      
      if (!decision.allowed) {
        return res.status(403).json({
          error: 'Access denied',
          reason: decision.reason
        });
      }
      
      if (decision.requiresMFA) {
        return res.status(401).json({
          error: 'Multi-factor authentication required',
          requiresMFA: true
        });
      }
      
      next();
      
    } catch (error) {
      console.error('Access control middleware error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  };
}
