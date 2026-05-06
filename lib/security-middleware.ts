/**
 * 增强安全中间件
 * 实施全面的安全防护措施
 */

import { NextRequest, NextResponse } from 'next/server';
import { SECURITY_CONFIG, SecurityLevel, SecurityEventType, SensitiveOperation } from './security-config';
import { AuditLogger } from './error-handler';
import { encrypt, decrypt } from './encryption';

// 安全监控器
export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private securityEvents: Map<string, number[]> = new Map();
  private blockedIPs: Set<string> = new Set();
  
  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }
  
  // 记录安全事件
  logSecurityEvent(eventType: string, identifier: string, severity: SecurityLevel = SecurityLevel.MEDIUM) {
    const key = `${eventType}:${identifier}`;
    const now = Date.now();
    
    if (!this.securityEvents.has(key)) {
      this.securityEvents.set(key, []);
    }
    
    const events = this.securityEvents.get(key)!;
    events.push(now);
    
    // 清理过期事件 (1小时前)
    const oneHourAgo = now - 60 * 60 * 1000;
    const validEvents = events.filter(time => time > oneHourAgo);
    this.securityEvents.set(key, validEvents);
    
    // 检查是否超过阈值
    this.checkThresholds(eventType, identifier, validEvents.length, severity);
  }
  
  // 检查安全阈值
  private checkThresholds(eventType: string, identifier: string, count: number, severity: SecurityLevel) {
    const thresholds = SECURITY_CONFIG.MONITORING.ALERT_THRESHOLDS;
    
    let threshold = 0;
    let alertMessage = '';
    
    switch (eventType) {
      case 'LOGIN_FAILED':
        threshold = thresholds.FAILED_LOGIN_ATTEMPTS;
        alertMessage = `多次登录失败: ${identifier}`;
        break;
      case 'SUSPICIOUS_REQUEST':
        threshold = thresholds.SUSPICIOUS_REQUESTS_PER_MINUTE;
        alertMessage = `可疑请求频率: ${identifier}`;
        break;
      case 'DATA_EXPORT':
        threshold = thresholds.DATA_EXPORT_PER_HOUR;
        alertMessage = `频繁数据导出: ${identifier}`;
        break;
      case 'BULK_OPERATION':
        threshold = thresholds.BULK_OPERATIONS_PER_HOUR;
        alertMessage = `频繁批量操作: ${identifier}`;
        break;
    }
    
    if (count >= threshold) {
      this.triggerSecurityAlert(alertMessage, eventType, identifier, severity);
      
      // 对于严重事件，临时阻止IP
      if (severity === SecurityLevel.HIGH || severity === SecurityLevel.CRITICAL) {
        this.blockIP(identifier, 60 * 60 * 1000); // 阻止1小时
      }
    }
  }
  
  // 触发安全告警
  private triggerSecurityAlert(message: string, eventType: string, identifier: string, severity: SecurityLevel) {
    AuditLogger.logSecurity(
      eventType,
      identifier,
      { message, severity, timestamp: new Date().toISOString() }
    );
    
    // 这里可以集成邮件、短信或其他告警方式
    console.warn(`🚨 SECURITY ALERT [${severity.toUpperCase()}]: ${message}`);
  }
  
  // 阻止IP访问
  blockIP(ip: string, duration: number) {
    this.blockedIPs.add(ip);
    setTimeout(() => {
      this.blockedIPs.delete(ip);
    }, duration);
    
    AuditLogger.logSecurity('IP_BLOCKED', ip, { duration, timestamp: new Date().toISOString() });
  }
  
  // 检查IP是否被阻止
  isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }
}

// 数据脱敏工具
export class DataMasking {
  // 脱敏敏感数据
  static maskSensitiveData(data: any, operation: string = 'read'): any {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    const sensitiveFields = SECURITY_CONFIG.DATA_PROTECTION.SENSITIVE_FIELDS;
    const maskingRules = SECURITY_CONFIG.DATA_PROTECTION.MASKING_RULES;
    
    const masked = { ...data };
    
    for (const field of sensitiveFields) {
      if (masked[field]) {
        masked[field] = this.maskField(masked[field], field);
      }
    }
    
    return masked;
  }
  
  // 脱敏单个字段
  private static maskField(value: string, fieldType: string): string {
    const rules = SECURITY_CONFIG.DATA_PROTECTION.MASKING_RULES;
    
    switch (fieldType) {
      case 'phone':
        return this.maskPhone(value, rules.phone);
      case 'email':
        return this.maskEmail(value, rules.email);
      case 'id_number':
        return this.maskIdNumber(value, rules.id_number);
      default:
        return value.substring(0, 2) + '****' + value.substring(value.length - 2);
    }
  }
  
  private static maskPhone(phone: string, rule: any): string {
    return phone.substring(0, rule.show) + rule.mask + phone.substring(phone.length - rule.showLast);
  }
  
  private static maskEmail(email: string, rule: any): string {
    const [username, domain] = email.split('@');
    const maskedUsername = username.substring(0, rule.showFirst) + rule.mask;
    return rule.domain ? maskedUsername + '@' + domain : maskedUsername;
  }
  
  private static maskIdNumber(idNumber: string, rule: any): string {
    return idNumber.substring(0, rule.show) + rule.mask;
  }
}

// 增强的安全中间件
export function enhancedSecurityMiddleware(request: NextRequest) {
  const securityMonitor = SecurityMonitor.getInstance();
  const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  
  // 检查IP是否被阻止
  if (securityMonitor.isIPBlocked(clientIP)) {
    AuditLogger.logSecurity('BLOCKED_ACCESS_ATTEMPT', clientIP, {
      url: request.url,
      userAgent: request.headers.get('user-agent')
    });
    
    return NextResponse.json(
      { error: 'Access temporarily blocked due to security concerns' },
      { status: 429 }
    );
  }
  
  // 检查请求大小
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB
    return NextResponse.json(
      { error: 'Request too large' },
      { status: 413 }
    );
  }
  
  // 检查可疑的User-Agent
  const userAgent = request.headers.get('user-agent') || '';
  const suspiciousPatterns = [
    /bot/i, /crawler/i, /scanner/i, /sqlmap/i, /nikto/i, /nmap/i
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
    securityMonitor.logSecurityEvent('SUSPICIOUS_USER_AGENT', clientIP, SecurityLevel.HIGH);
    
    // 对于可疑请求，增加验证
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
  
  // 添加安全头部
  const response = NextResponse.next();
  
  Object.entries(SECURITY_CONFIG.API_SECURITY.SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

// 敏感操作验证器
export class SensitiveOperationValidator {
  // 验证敏感操作权限
  static async validateSensitiveOperation(
    operation: SensitiveOperation,
    userId: string,
    userRole: string,
    context: any = {}
  ): Promise<{ valid: boolean; reason?: string }> {
    
    // 记录敏感操作尝试
    AuditLogger.logSecurity('SENSITIVE_OPERATION_ATTEMPT', userId, {
      operation,
      userRole,
      context,
      timestamp: new Date().toISOString()
    });
    
    // 检查用户权限
    if (!this.hasPermission(operation, userRole)) {
      return { valid: false, reason: 'Insufficient permissions' };
    }
    
    // 检查操作频率
    const securityMonitor = SecurityMonitor.getInstance();
    const operationKey = `${operation}:${userId}`;
    
    // 这里可以添加更多验证逻辑，如二次验证、审批流程等
    
    return { valid: true };
  }
  
  // 检查权限
  private static hasPermission(operation: SensitiveOperation, userRole: string): boolean {
    const adminOps: SensitiveOperation[] = [
      SensitiveOperation.USER_CREATE,
      SensitiveOperation.USER_DELETE,
      SensitiveOperation.ROLE_CHANGE,
      SensitiveOperation.GRADE_MODIFY,
      SensitiveOperation.BULK_EXPORT,
      SensitiveOperation.SYSTEM_CONFIG,
      SensitiveOperation.PASSWORD_RESET
    ];
    
    const teacherOps: SensitiveOperation[] = [
      SensitiveOperation.GRADE_MODIFY,
      SensitiveOperation.BULK_EXPORT
    ];
    
    const studentOps: SensitiveOperation[] = [];
    
    switch (userRole) {
      case 'admin':
        return adminOps.includes(operation);
      case 'teacher':
        return teacherOps.includes(operation);
      case 'student':
        return studentOps.includes(operation);
      default:
        return false;
    }
  }
}

// 数据完整性验证器
export class DataIntegrityValidator {
  // 生成数据哈希
  static generateHash(data: any): string {
    const crypto = require('crypto');
    const dataString = JSON.stringify(data);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }
  
  // 验证数据完整性
  static verifyIntegrity(data: any, expectedHash: string): boolean {
    const actualHash = this.generateHash(data);
    return actualHash === expectedHash;
  }
  
  // 为敏感数据添加完整性签名
  static signData(data: any): { data: any; signature: string; timestamp: number } {
    const signature = this.generateHash(data);
    return {
      data,
      signature,
      timestamp: Date.now()
    };
  }
  
  // 验证签名数据
  static verifySignedData(signedData: { data: any; signature: string; timestamp: number }): boolean {
    const { data, signature, timestamp } = signedData;
    
    // 检查时间戳 (防止重放攻击)
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5分钟
    
    if (now - timestamp > maxAge) {
      return false;
    }
    
    return this.verifyIntegrity(data, signature);
  }
}

// 安全上下文提供器
export class SecurityContext {
  private static instance: SecurityContext;
  private currentContext: Map<string, any> = new Map();
  
  static getInstance(): SecurityContext {
    if (!SecurityContext.instance) {
      SecurityContext.instance = new SecurityContext();
    }
    return SecurityContext.instance;
  }
  
  // 设置安全上下文
  setContext(requestId: string, context: any) {
    this.currentContext.set(requestId, {
      ...context,
      timestamp: Date.now()
    });
  }
  
  // 获取安全上下文
  getContext(requestId: string): any {
    return this.currentContext.get(requestId);
  }
  
  // 清理过期上下文
  cleanup() {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30分钟
    
    const keysToDelete: string[] = [];
    this.currentContext.forEach((context, key) => {
      if (now - context.timestamp > maxAge) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.currentContext.delete(key));
  }
}

// 定期清理任务
setInterval(() => {
  SecurityContext.getInstance().cleanup();
}, 5 * 60 * 1000); // 每5分钟清理一次
