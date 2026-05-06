/**
 * 安全配置中心
 * 定义系统的所有安全相关配置和策略
 */

export const SECURITY_CONFIG = {
  // JWT配置
  JWT: {
    SECRET: process.env.JWT_SECRET || 'your-super-secure-jwt-secret-key-change-in-production',
    ACCESS_TOKEN_EXPIRES_IN: '15m',
    REFRESH_TOKEN_EXPIRES_IN: '7d',
    ALGORITHM: 'HS256',
    ISSUER: 'score-management-system',
    AUDIENCE: 'score-management-users'
  },

  // 数据加密配置
  ENCRYPTION: {
    ALGORITHM: 'aes-256-gcm',
    KEY_LENGTH: 32,
    IV_LENGTH: 16,
    TAG_LENGTH: 16,
    SECRET_KEY: process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key'
  },

  // API安全配置
  API_SECURITY: {
    // 速率限制 (每分钟请求数)
    RATE_LIMITS: {
      PUBLIC: 10,      // 公开接口
      AUTHENTICATED: 100,  // 认证用户
      ADMIN: 500,      // 管理员
      BULK_OPERATIONS: 20   // 批量操作
    },
    
    // 请求大小限制
    MAX_REQUEST_SIZE: '10mb',
    
    // CORS配置
    CORS_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    
    // 安全头部
    SECURITY_HEADERS: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  },

  // 数据验证配置
  VALIDATION: {
    // 密码策略
    PASSWORD_POLICY: {
      MIN_LENGTH: 8,
      MAX_LENGTH: 128,
      REQUIRE_UPPERCASE: true,
      REQUIRE_LOWERCASE: true,
      REQUIRE_NUMBERS: true,
      REQUIRE_SPECIAL_CHARS: true,
      FORBIDDEN_PATTERNS: ['password', '123456', 'admin', 'user']
    },
    
    // 输入验证
    INPUT_SANITIZATION: {
      MAX_STRING_LENGTH: 1000,
      ALLOWED_HTML_TAGS: [],
      SANITIZE_EMAILS: true,
      SANITIZE_URLS: true
    }
  },

  // 会话安全配置
  SESSION_SECURITY: {
    COOKIE_SETTINGS: {
      HTTP_ONLY: true,
      SECURE: process.env.NODE_ENV === 'production',
      SAME_SITE: 'strict',
      MAX_AGE: 24 * 60 * 60 * 1000 // 24小时
    },
    
    // 会话管理
    MAX_CONCURRENT_SESSIONS: 3,
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30分钟
    IDLE_TIMEOUT: 15 * 60 * 1000     // 15分钟无操作
  },

  // 审计和日志配置
  AUDIT: {
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    LOG_RETENTION_DAYS: 90,
    AUDIT_SENSITIVE_OPERATIONS: true,
    LOG_REQUEST_RESPONSE: false,
    LOG_USER_ACTIONS: true,
    LOG_SECURITY_EVENTS: true
  },

  // 数据保护配置
  DATA_PROTECTION: {
    // 敏感数据字段
    SENSITIVE_FIELDS: [
      'password', 'phone', 'parent_phone', 'email', 
      'address', 'id_number', 'bank_account'
    ],
    
    // 数据脱敏规则
    MASKING_RULES: {
      phone: { show: 3, mask: '****', showLast: 4 },
      email: { showFirst: 2, mask: '***', domain: true },
      id_number: { show: 6, mask: '********' }
    },
    
    // 数据备份配置
    BACKUP: {
      ENCRYPTION_ENABLED: true,
      RETENTION_DAYS: 30,
      AUTO_BACKUP_INTERVAL: '0 2 * * *', // 每天凌晨2点
      BACKUP_LOCATION: process.env.BACKUP_LOCATION || './backups'
    }
  },

  // 网络安全配置
  NETWORK_SECURITY: {
    // IP白名单 (可选)
    IP_WHITELIST: process.env.IP_WHITELIST?.split(',') || [],
    
    // VPN/代理检测
    DETECT_VPN_PROXY: false,
    
    // 地理位置限制 (可选)
    GEO_RESTRICTION: {
      ENABLED: false,
      ALLOWED_COUNTRIES: ['CN']
    }
  },

  // 监控和告警配置
  MONITORING: {
    // 安全事件监控
    SECURITY_EVENTS: [
      'LOGIN_FAILED',
      'LOGIN_SUCCESS',
      'PASSWORD_CHANGE',
      'ROLE_CHANGE',
      'DATA_EXPORT',
      'BULK_DELETE',
      'PRIVILEGE_ESCALATION',
      'SUSPICIOUS_ACTIVITY'
    ],
    
    // 告警阈值
    ALERT_THRESHOLDS: {
      FAILED_LOGIN_ATTEMPTS: 5,
      SUSPICIOUS_REQUESTS_PER_MINUTE: 100,
      DATA_EXPORT_PER_HOUR: 10,
      BULK_OPERATIONS_PER_HOUR: 5
    }
  }
};

// 安全级别枚举
export enum SecurityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// 安全事件类型
export enum SecurityEventType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  SYSTEM_CONFIG = 'system_config',
  NETWORK_SECURITY = 'network_security'
}

// 敏感操作类型
export enum SensitiveOperation {
  USER_CREATE = 'user_create',
  USER_DELETE = 'user_delete',
  ROLE_CHANGE = 'role_change',
  GRADE_MODIFY = 'grade_modify',
  BULK_EXPORT = 'bulk_export',
  SYSTEM_CONFIG = 'system_config',
  PASSWORD_RESET = 'password_reset'
}
