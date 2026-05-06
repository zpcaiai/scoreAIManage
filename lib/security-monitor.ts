/**
 * 安全监控和入侵检测系统
 * 实时监控系统安全状态，检测异常行为
 */

import { NextRequest } from 'next/server';
import { SECURITY_CONFIG, SecurityLevel, SecurityEventType } from './security-config';
import { AuditLogger } from './error-handler';

// 安全事件类型
export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecurityLevel;
  timestamp: number;
  source: string;
  description: string;
  details: any;
  resolved: boolean;
}

// 威胁情报
export interface ThreatIntelligence {
  maliciousIPs: Set<string>;
  suspiciousPatterns: RegExp[];
  knownAttackSignatures: string[];
  vulnerabilityDatabase: Map<string, any>;
}

// 异常检测规则
export interface AnomalyRule {
  id: string;
  name: string;
  description: string;
  condition: (data: any) => boolean;
  severity: SecurityLevel;
  action: 'alert' | 'block' | 'quarantine';
}

export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private events: SecurityEvent[] = [];
  private activeThreats: Map<string, any> = new Map();
  private anomalyRules: AnomalyRule[] = [];
  private blockedEntities: Set<string> = new Set();
  private threatIntelligence: ThreatIntelligence;
  
  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }
  
  constructor() {
    this.threatIntelligence = {
      maliciousIPs: new Set(),
      suspiciousPatterns: [
        /union.*select/i,
        /drop.*table/i,
        /insert.*into/i,
        /update.*set/i,
        /delete.*from/i,
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi
      ],
      knownAttackSignatures: [],
      vulnerabilityDatabase: new Map()
    };
    
    this.initializeAnomalyRules();
    this.startThreatIntelligenceUpdates();
  }
  
  // 监控HTTP请求
  monitorRequest(request: NextRequest, userId?: string): SecurityEvent[] {
    const events: SecurityEvent[] = [];
    const clientIP = this.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';
    const url = request.url;
    
    // 检查恶意IP
    if (this.threatIntelligence.maliciousIPs.has(clientIP)) {
      events.push(this.createSecurityEvent(
        SecurityEventType.NETWORK_SECURITY,
        SecurityLevel.CRITICAL,
        'MALICIOUS_IP_ACCESS',
        clientIP,
        { url, userAgent }
      ));
    }
    
    // 检查可疑User-Agent
    if (this.isSuspiciousUserAgent(userAgent)) {
      events.push(this.createSecurityEvent(
        SecurityEventType.NETWORK_SECURITY,
        SecurityLevel.HIGH,
        'SUSPICIOUS_USER_AGENT',
        clientIP,
        { userAgent, url }
      ));
    }
    
    // 检查SQL注入尝试
    const urlParams = new URL(url).searchParams;
    const params: Array<[string, string]> = [];
    urlParams.forEach((value, key) => params.push([key, value]));
    
    for (const [key, value] of params) {
      if (this.detectSQLInjection(value)) {
        events.push(this.createSecurityEvent(
          SecurityEventType.NETWORK_SECURITY,
          SecurityLevel.CRITICAL,
          'SQL_INJECTION_ATTEMPT',
          clientIP,
          { url, parameter: key, value }
        ));
      }
    }
    
    // 检查XSS尝试
    for (const [key, value] of params) {
      if (this.detectXSS(value)) {
        events.push(this.createSecurityEvent(
          SecurityEventType.NETWORK_SECURITY,
          SecurityLevel.HIGH,
          'XSS_ATTEMPT',
          clientIP,
          { url, parameter: key, value }
        ));
      }
    }
    
    // 检查异常请求频率
    const requestFrequency = this.getRequestFrequency(clientIP);
    if (requestFrequency > SECURITY_CONFIG.MONITORING.ALERT_THRESHOLDS.SUSPICIOUS_REQUESTS_PER_MINUTE) {
      events.push(this.createSecurityEvent(
        SecurityEventType.NETWORK_SECURITY,
        SecurityLevel.HIGH,
        'HIGH_REQUEST_FREQUENCY',
        clientIP,
        { frequency: requestFrequency, url }
      ));
    }
    
    // 处理检测到的事件
    for (const event of events) {
      this.handleSecurityEvent(event);
    }
    
    return events;
  }
  
  // 监控用户行为
  monitorUserActivity(userId: string, action: string, details: any): SecurityEvent[] {
    const events: SecurityEvent[] = [];
    
    // 检查异常登录时间
    if (action === 'LOGIN_SUCCESS') {
      const hour = new Date().getHours();
      if (hour < 6 || hour > 22) {
        events.push(this.createSecurityEvent(
          SecurityEventType.AUTHENTICATION,
          SecurityLevel.MEDIUM,
          'UNUSUAL_LOGIN_TIME',
          userId,
          { time: new Date().toISOString(), ...details }
        ));
      }
    }
    
    // 检查权限提升
    if (action === 'ROLE_CHANGE') {
      events.push(this.createSecurityEvent(
        SecurityEventType.AUTHORIZATION,
        SecurityLevel.HIGH,
        'PRIVILEGE_ESCALATION',
        userId,
        details
      ));
    }
    
    // 检查批量数据操作
    if (action.includes('BULK_')) {
      events.push(this.createSecurityEvent(
        SecurityEventType.DATA_MODIFICATION,
        SecurityLevel.MEDIUM,
        'BULK_OPERATION',
        userId,
        { action, ...details }
      ));
    }
    
    // 检查数据导出
    if (action === 'DATA_EXPORT') {
      events.push(this.createSecurityEvent(
        SecurityEventType.DATA_ACCESS,
        SecurityLevel.MEDIUM,
        'DATA_EXPORT',
        userId,
        details
      ));
    }
    
    // 处理检测到的事件
    for (const event of events) {
      this.handleSecurityEvent(event);
    }
    
    return events;
  }
  
  // 监控系统资源
  monitorSystemResources(): SecurityEvent[] {
    const events: SecurityEvent[] = [];
    
    // 检查内存使用率
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    if (memoryUsagePercent > 90) {
      events.push(this.createSecurityEvent(
        SecurityEventType.SYSTEM_CONFIG,
        SecurityLevel.HIGH,
        'HIGH_MEMORY_USAGE',
        'system',
        { usage: memoryUsagePercent }
      ));
    }
    
    // 检查磁盘空间
    // 这里应该实现实际的磁盘空间检查
    
    // 检查CPU使用率
    // 这里应该实现实际的CPU使用率检查
    
    return events;
  }
  
  // 运行异常检测规则
  runAnomalyDetection(): SecurityEvent[] {
    const events: SecurityEvent[] = [];
    
    for (const rule of this.anomalyRules) {
      try {
        const data = this.collectRuleData(rule.id);
        if (rule.condition(data)) {
          events.push(this.createSecurityEvent(
            SecurityEventType.SYSTEM_CONFIG,
            rule.severity,
            rule.name,
            'system',
            { ruleId: rule.id, data }
          ));
        }
      } catch (error) {
        console.error(`Error running anomaly rule ${rule.id}:`, error);
      }
    }
    
    return events;
  }
  
  // 处理安全事件
  private handleSecurityEvent(event: SecurityEvent): void {
    this.events.push(event);
    
    // 记录到审计日志
    AuditLogger.logSecurity(event.type, event.source, {
      eventId: event.id,
      severity: event.severity,
      description: event.description,
      details: event.details
    });
    
    // 根据严重程度执行相应动作
    switch (event.severity) {
      case SecurityLevel.CRITICAL:
        this.blockEntity(event.source);
        this.triggerEmergencyResponse(event);
        break;
      case SecurityLevel.HIGH:
        this.blockEntity(event.source, 60 * 60 * 1000); // 阻止1小时
        this.triggerAlert(event);
        break;
      case SecurityLevel.MEDIUM:
        this.triggerAlert(event);
        break;
      case SecurityLevel.LOW:
        this.logEvent(event);
        break;
    }
  }
  
  // 阻止实体访问
  blockEntity(entityId: string, duration?: number): void {
    this.blockedEntities.add(entityId);
    
    if (duration) {
      setTimeout(() => {
        this.blockedEntities.delete(entityId);
      }, duration);
    }
    
    AuditLogger.logSecurity('ENTITY_BLOCKED', 'system', {
      entityId,
      duration,
      timestamp: new Date().toISOString()
    });
  }
  
  // 检查实体是否被阻止
  isEntityBlocked(entityId: string): boolean {
    return this.blockedEntities.has(entityId);
  }
  
  // 获取安全事件
  getSecurityEvents(limit: number = 100, offset: number = 0): SecurityEvent[] {
    return this.events
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(offset, offset + limit);
  }
  
  // 获取安全统计
  getSecurityStats(): any {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    const last7d = now - 7 * 24 * 60 * 60 * 1000;
    
    const recentEvents = this.events.filter(e => e.timestamp > last24h);
    const weeklyEvents = this.events.filter(e => e.timestamp > last7d);
    
    return {
      totalEvents: this.events.length,
      last24h: recentEvents.length,
      last7d: weeklyEvents.length,
      criticalEvents: this.events.filter(e => e.severity === SecurityLevel.CRITICAL).length,
      blockedEntities: this.blockedEntities.size,
      activeThreats: this.activeThreats.size,
      eventsByType: this.groupEventsByType(recentEvents),
      eventsBySeverity: this.groupEventsBySeverity(recentEvents)
    };
  }
  
  // 创建安全事件
  private createSecurityEvent(
    type: SecurityEventType,
    severity: SecurityLevel,
    description: string,
    source: string,
    details: any
  ): SecurityEvent {
    return {
      id: this.generateEventId(),
      type,
      severity,
      timestamp: Date.now(),
      source,
      description,
      details,
      resolved: false
    };
  }
  
  // 获取客户端IP
  private getClientIP(request: NextRequest): string {
    return request.ip || 
           request.headers.get('x-forwarded-for')?.split(',')[0] || 
           request.headers.get('x-real-ip') || 
           'unknown';
  }
  
  // 检测可疑User-Agent
  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i, /crawler/i, /scanner/i, /sqlmap/i, /nikto/i, /nmap/i,
      /curl/i, /wget/i, /python/i, /perl/i, /java/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }
  
  // 检测SQL注入
  private detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /union.*select/i,
      /drop.*table/i,
      /insert.*into/i,
      /update.*set/i,
      /delete.*from/i,
      /exec.*\(/i,
      /script.*>/i,
      /--/,
      /\/\*/,
      /\*\//
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  }
  
  // 检测XSS
  private detectXSS(input: string): boolean {
    return this.threatIntelligence.suspiciousPatterns.some(pattern => pattern.test(input));
  }
  
  // 获取请求频率
  private getRequestFrequency(clientIP: string): number {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    
    // 这里应该实现实际的请求频率统计
    // 简化实现，返回模拟数据
    return Math.floor(Math.random() * 200);
  }
  
  // 初始化异常检测规则
  private initializeAnomalyRules(): void {
    this.anomalyRules = [
      {
        id: 'multiple_failed_logins',
        name: 'MULTIPLE_FAILED_LOGINS',
        description: 'Multiple failed login attempts from same IP',
        condition: (data) => data.failedLogins > 5,
        severity: SecurityLevel.HIGH,
        action: 'block'
      },
      {
        id: 'rapid_account_creation',
        name: 'RAPID_ACCOUNT_CREATION',
        description: 'Multiple accounts created in short time',
        condition: (data) => data.accountsCreated > 10,
        severity: SecurityLevel.MEDIUM,
        action: 'alert'
      },
      {
        id: 'unusual_data_access',
        name: 'UNUSUAL_DATA_ACCESS',
        description: 'Access to unusual data patterns',
        condition: (data) => data.unusualAccessScore > 0.8,
        severity: SecurityLevel.MEDIUM,
        action: 'alert'
      },
      {
        id: 'privilege_escalation',
        name: 'PRIVILEGE_ESCALATION',
        description: 'Sudden privilege escalation',
        condition: (data) => data.privilegeChanged && data.timeSinceAccountCreation < 24 * 60 * 60 * 1000,
        severity: SecurityLevel.HIGH,
        action: 'block'
      }
    ];
  }
  
  // 收集规则数据
  private collectRuleData(ruleId: string): any {
    // 这里应该实现实际的数据收集逻辑
    switch (ruleId) {
      case 'multiple_failed_logins':
        return { failedLogins: Math.floor(Math.random() * 10) };
      case 'rapid_account_creation':
        return { accountsCreated: Math.floor(Math.random() * 20) };
      case 'unusual_data_access':
        return { unusualAccessScore: Math.random() };
      case 'privilege_escalation':
        return { 
          privilegeChanged: Math.random() > 0.5,
          timeSinceAccountCreation: Math.random() * 48 * 60 * 60 * 1000
        };
      default:
        return {};
    }
  }
  
  // 启动威胁情报更新
  private startThreatIntelligenceUpdates(): void {
    // 每小时更新威胁情报
    setInterval(() => {
      this.updateThreatIntelligence();
    }, 60 * 60 * 1000);
  }
  
  // 更新威胁情报
  private async updateThreatIntelligence(): Promise<void> {
    try {
      // 这里应该从威胁情报源获取最新数据
      // 例如：恶意IP列表、漏洞数据库等
      
      // 模拟更新恶意IP列表
      const newMaliciousIPs = await this.fetchMaliciousIPs();
      newMaliciousIPs.forEach(ip => {
        this.threatIntelligence.maliciousIPs.add(ip);
      });
      
      // 更新漏洞数据库
      await this.updateVulnerabilityDatabase();
      
    } catch (error) {
      console.error('Failed to update threat intelligence:', error);
    }
  }
  
  // 获取恶意IP列表
  private async fetchMaliciousIPs(): Promise<string[]> {
    // 这里应该从威胁情报源获取恶意IP列表
    // 简化实现，返回空数组
    return [];
  }
  
  // 更新漏洞数据库
  private async updateVulnerabilityDatabase(): Promise<void> {
    // 这里应该从漏洞数据库获取最新信息
  }
  
  // 触发告警
  private triggerAlert(event: SecurityEvent): void {
    console.warn(`🚨 SECURITY ALERT [${event.severity.toUpperCase()}]: ${event.description}`);
    
    // 这里可以集成邮件、短信、Slack等告警方式
    // 例如：发送邮件给安全管理员
  }
  
  // 触发应急响应
  private triggerEmergencyResponse(event: SecurityEvent): void {
    console.error(`🚨🚨 EMERGENCY RESPONSE ACTIVATED: ${event.description}`);
    
    // 执行应急响应措施
    // 1. 阻止所有来自威胁源的访问
    // 2. 通知安全团队
    // 3. 启动事件响应流程
    // 4. 保存现场证据
  }
  
  // 记录事件
  private logEvent(event: SecurityEvent): void {
    console.info(`Security Event [${event.severity}]: ${event.description}`);
  }
  
  // 按类型分组事件
  private groupEventsByType(events: SecurityEvent[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    events.forEach(event => {
      grouped[event.type] = (grouped[event.type] || 0) + 1;
    });
    return grouped;
  }
  
  // 按严重程度分组事件
  private groupEventsBySeverity(events: SecurityEvent[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    events.forEach(event => {
      grouped[event.severity] = (grouped[event.severity] || 0) + 1;
    });
    return grouped;
  }
  
  // 生成事件ID
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}

// 安全仪表板数据
export class SecurityDashboard {
  private monitor: SecurityMonitor;
  
  constructor() {
    this.monitor = SecurityMonitor.getInstance();
  }
  
  // 获取仪表板数据
  getDashboardData(): any {
    const stats = this.monitor.getSecurityStats();
    const recentEvents = this.monitor.getSecurityEvents(10);
    
    return {
      overview: {
        totalEvents: stats.totalEvents,
        criticalAlerts: stats.criticalEvents,
        blockedEntities: stats.blockedEntities,
        systemStatus: this.getSystemStatus(stats)
      },
      charts: {
        eventsByType: stats.eventsByType,
        eventsBySeverity: stats.eventsBySeverity,
        timeline: this.getEventTimeline()
      },
      recentEvents: recentEvents.map(event => ({
        id: event.id,
        type: event.type,
        severity: event.severity,
        description: event.description,
        timestamp: new Date(event.timestamp).toISOString()
      })),
      threats: {
        activeThreats: stats.activeThreats,
        threatLevel: this.calculateThreatLevel(stats)
      }
    };
  }
  
  // 获取系统状态
  private getSystemStatus(stats: any): 'healthy' | 'warning' | 'critical' {
    if (stats.criticalEvents > 0) {
      return 'critical';
    }
    if (stats.last24h > 50) {
      return 'warning';
    }
    return 'healthy';
  }
  
  // 获取事件时间线
  private getEventTimeline(): any[] {
    const now = Date.now();
    const timeline = [];
    
    for (let i = 23; i >= 0; i--) {
      const hourStart = now - i * 60 * 60 * 1000;
      const hourEnd = hourStart + 60 * 60 * 1000;
      
      const eventsInHour = this.monitor.getSecurityEvents()
        .filter(e => e.timestamp >= hourStart && e.timestamp < hourStart + 60 * 60 * 1000);
      
      timeline.push({
        hour: new Date(hourStart).getHours(),
        events: eventsInHour.length,
        critical: eventsInHour.filter(e => e.severity === SecurityLevel.CRITICAL).length
      });
    }
    
    return timeline;
  }
  
  // 计算威胁等级
  private calculateThreatLevel(stats: any): 'low' | 'medium' | 'high' | 'critical' {
    const criticalScore = stats.criticalEvents * 10;
    const hourlyScore = stats.last24h / 24;
    const totalScore = criticalScore + hourlyScore;
    
    if (totalScore > 50) return 'critical';
    if (totalScore > 20) return 'high';
    if (totalScore > 5) return 'medium';
    return 'low';
  }
}
