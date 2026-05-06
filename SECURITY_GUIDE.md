# 学生成绩管理系统 - 安全配置指南

## 🔐 安全架构概述

本系统采用多层安全防护架构，确保学生成绩数据的机密性、完整性和可用性。

### 核心安全组件

1. **身份认证与授权** - JWT令牌认证 + RBAC权限控制
2. **数据加密保护** - AES-256-GCM加密 + 敏感数据脱敏
3. **API安全防护** - 速率限制 + CSRF保护 + 安全头部
4. **访问控制系统** - 细粒度权限控制 + 资源所有权验证
5. **安全监控** - 实时威胁检测 + 异常行为分析
6. **数据备份** - 自动备份 + 加密存储 + 完整性验证
7. **审计日志** - 完整操作记录 + 安全事件追踪

## 🚀 快速安全部署

### 1. 环境变量配置

创建 `.env.local` 文件并配置以下安全参数：

```bash
# JWT安全配置
JWT_SECRET="your-super-secure-jwt-secret-key-min-32-chars"
JWT_ISSUER="score-management-system"
JWT_AUDIENCE="score-management-users"

# 数据加密配置
ENCRYPTION_KEY="your-32-character-encryption-key-here"

# 数据库安全配置
DATABASE_URL="postgresql://username:password@localhost:5432/scoremanagement"
DB_SSL_MODE="require"
DB_SSL_CERT="/path/to/client-cert.pem"
DB_SSL_KEY="/path/to/client-key.pem"

# API安全配置
ALLOWED_ORIGINS="https://yourdomain.com,https://admin.yourdomain.com"
RATE_LIMIT_WINDOW_MS="900000"
API_SECRET_KEY="your-api-secret-key"

# 安全监控配置
LOG_LEVEL="info"
SECURITY_WEBHOOK_URL="https://your-security-monitoring.com/webhook"
ALERT_EMAIL="security-admin@yourdomain.com"

# 备份配置
BACKUP_LOCATION="/secure/backups"
BACKUP_ENCRYPTION_KEY="backup-encryption-key-32-chars"
AUTO_BACKUP_ENABLED="true"

# 网络安全配置
IP_WHITELIST="192.168.1.0/24,10.0.0.0/8"
ENABLE_GEO_RESTRICTION="false"
ALLOWED_COUNTRIES="CN"
```

### 2. 数据库安全配置

```sql
-- 创建专用数据库用户
CREATE USER scoreapp_user WITH PASSWORD 'strong_password_here';
CREATE DATABASE scoremanagement_db OWNER scoreapp_user;

-- 启用行级安全
ALTER DATABASE scoremanagement_db SET row_security = on;

-- 创建审计表
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_timestamp (timestamp),
    INDEX idx_audit_action (action)
);

-- 启用数据库审计
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
    VALUES (current_setting('app.current_user_id', true), TG_OP, TG_TABLE_NAME, NEW.id::text, row_to_json(NEW));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 3. Web服务器安全配置

#### Nginx配置示例

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # SSL配置
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # 安全头部
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'";
    
    # 速率限制
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    # 反向代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 应用安全限制
        limit_req zone=api burst=20 nodelay;
    }
    
    # 静态文件
    location /_next/static/ {
        alias /var/www/scoreapp/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# HTTP重定向到HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## 🔧 安全功能配置

### 1. 身份认证安全

```typescript
// lib/auth-config.ts
export const AUTH_CONFIG = {
  // 密码策略
  PASSWORD_POLICY: {
    MIN_LENGTH: 12,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
    FORBIDDEN_COMMON_PASSWORDS: true,
    EXPIRY_DAYS: 90,
    HISTORY_COUNT: 5
  },
  
  // 多因素认证
  MFA: {
    REQUIRED_FOR_ADMIN: true,
    REQUIRED_FOR_TEACHER: false,
    REQUIRED_FOR_STUDENT: false,
    ISSUER: "ScoreManagement",
    WINDOW_SIZE: 1
  },
  
  // 会话管理
  SESSION: {
    TIMEOUT_MINUTES: 30,
    MAX_CONCURRENT_SESSIONS: 3,
    SECURE_COOKIES: true,
    SAME_SITE_POLICY: 'strict'
  }
};
```

### 2. 数据访问控制

```typescript
// lib/data-security.ts
export const DATA_SECURITY = {
  // 数据分类
  DATA_CLASSIFICATION: {
    PUBLIC: ['class_names', 'subject_names'],
    INTERNAL: ['exam_schedules', 'statistics'],
    CONFIDENTIAL: ['student_grades', 'personal_info'],
    RESTRICTED: ['admin_logs', 'security_events']
  },
  
  // 访问控制
  ACCESS_RULES: {
    students: ['own_grades', 'class_info'],
    teachers: ['class_grades', 'student_info', 'statistics'],
    admins: ['all_data', 'system_config']
  },
  
  // 数据脱敏
  MASKING_RULES: {
    phone: { show: 3, mask: '****', showLast: 4 },
    email: { showFirst: 2, mask: '***', domain: true },
    id_number: { show: 6, mask: '********' }
  }
};
```

### 3. API安全防护

```typescript
// lib/api-security.ts
export const API_SECURITY = {
  // 速率限制
  RATE_LIMITS: {
    '/api/auth/login': { requests: 5, window: '15m' },
    '/api/grades': { requests: 100, window: '1h' },
    '/api/export': { requests: 10, window: '1h' },
    '/api/admin/*': { requests: 500, window: '1h' }
  },
  
  // 输入验证
  INPUT_VALIDATION: {
    MAX_STRING_LENGTH: 1000,
    ALLOWED_HTML_TAGS: [],
    SANITIZE_SQL: true,
    SANITIZE_XSS: true
  },
  
  // CORS配置
  CORS: {
    ORIGINS: ['https://yourdomain.com'],
    METHODS: ['GET', 'POST', 'PUT', 'DELETE'],
    HEADERS: ['Content-Type', 'Authorization'],
    CREDENTIALS: true
  }
};
```

## 🛡️ 安全监控配置

### 1. 安全事件监控

```typescript
// lib/monitoring-config.ts
export const MONITORING_CONFIG = {
  // 监控指标
  METRICS: {
    FAILED_LOGIN_ATTEMPTS: { threshold: 5, window: '5m' },
    SUSPICIOUS_REQUESTS: { threshold: 100, window: '1m' },
    DATA_EXPORT_REQUESTS: { threshold: 10, window: '1h' },
    PRIVILEGE_ESCALATION: { threshold: 1, window: '24h' }
  },
  
  // 告警配置
  ALERTS: {
    EMAIL: 'security@yourdomain.com',
    WEBHOOK: 'https://your-monitoring-system.com/webhook',
    SLACK: '#security-alerts',
    SMS: '+1234567890'
  },
  
  // 自动响应
  AUTO_RESPONSE: {
    BLOCK_IP_ON_CRITICAL: true,
    BLOCK_DURATION: '1h',
    REQUIRE_MFA_ON_SUSPICIOUS: true,
    NOTIFY_ADMIN_IMMEDIATELY: true
  }
};
```

### 2. 日志配置

```typescript
// lib/logging-config.ts
export const LOGGING_CONFIG = {
  // 日志级别
  LEVELS: {
    SECURITY: 'warn',
    ACCESS: 'info',
    ERROR: 'error',
    PERFORMANCE: 'debug'
  },
  
  // 日志格式
  FORMAT: {
    TIMESTAMP: true,
    USER_ID: true,
    SESSION_ID: true,
    IP_ADDRESS: true,
    USER_AGENT: true,
    REQUEST_ID: true
  },
  
  // 日志存储
  STORAGE: {
    RETENTION_DAYS: 90,
    ROTATION_SIZE: '100MB',
    COMPRESSION: true,
    ENCRYPTION: true
  }
};
```

## 🔄 备份和恢复配置

### 1. 自动备份配置

```bash
# 创建备份脚本
#!/bin/bash
# backup.sh

BACKUP_DIR="/secure/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="scoreapp_backup_$DATE"

# 创建备份目录
mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

# 数据库备份
pg_dump -h localhost -U scoreapp_user -d scoremanagement_db \
  --no-password --format=custom --compress=9 \
  --file="$BACKUP_DIR/$BACKUP_NAME/database.dump"

# 文件备份
tar -czf "$BACKUP_DIR/$BACKUP_NAME/files.tar.gz" \
  /var/www/scoreapp/uploads/

# 加密备份
gpg --symmetric --cipher-algo AES256 \
  --output "$BACKUP_DIR/$BACKUP_NAME/encrypted.gpg" \
  "$BACKUP_DIR/$BACKUP_NAME/database.dump"

# 清理未加密文件
rm "$BACKUP_DIR/$BACKUP_NAME/database.dump"

# 上传到云存储
aws s3 cp "$BACKUP_DIR/$BACKUP_NAME" s3://your-backup-bucket/ \
  --recursive --server-side-encryption AES256

# 清理本地旧备份（保留30天）
find "$BACKUP_DIR" -type d -name "scoreapp_backup_*" \
  -mtime +30 -exec rm -rf {} \;
```

### 2. 恢复流程

```bash
# 恢复脚本
#!/bin/bash
# restore.sh

BACKUP_ID=$1
BACKUP_DIR="/secure/backups/$BACKUP_ID"

if [ -z "$BACKUP_ID" ]; then
    echo "Usage: $0 <backup_id>"
    exit 1
fi

# 下载备份
aws s3 cp "s3://your-backup-bucket/$BACKUP_ID" "$BACKUP_DIR" \
  --recursive

# 解密备份
gpg --decrypt --output "$BACKUP_DIR/database.dump" \
  "$BACKUP_DIR/encrypted.gpg"

# 恢复数据库
pg_restore -h localhost -U scoreapp_user -d scoremanagement_db \
  --clean --if-exists --verbose "$BACKUP_DIR/database.dump"

# 恢复文件
tar -xzf "$BACKUP_DIR/files.tar.gz" -C /var/www/scoreapp/

echo "Restore completed from backup: $BACKUP_ID"
```

## 📊 安全审计清单

### 部署前检查

- [ ] 所有默认密码已更改
- [ ] JWT密钥已设置为强随机值
- [ ] 数据库连接使用SSL
- [ ] API速率限制已配置
- [ ] 安全头部已设置
- [ ] CORS策略已正确配置
- [ ] 备份系统已测试
- [ ] 监控告警已配置
- [ ] 日志记录已启用
- [ ] 防火墙规则已配置

### 定期安全检查

- [ ] 每月更新依赖包
- [ ] 每季度进行安全扫描
- [ ] 每半年进行渗透测试
- [ ] 每年审查安全策略
- [ ] 持续监控安全事件
- [ ] 定期测试备份恢复

### 事件响应计划

1. **检测阶段**
   - 监控系统告警
   - 分析异常行为
   - 确认安全事件

2. **响应阶段**
   - 隔离受影响系统
   - 阻止恶意访问
   - 收集证据

3. **恢复阶段**
   - 修复安全漏洞
   - 恢复正常服务
   - 加强防护措施

4. **总结阶段**
   - 分析事件原因
   - 更新安全策略
   - 改进监控系统

## 🚨 应急响应联系信息

- **安全团队**: security@yourdomain.com
- **系统管理员**: admin@yourdomain.com
- **24小时热线**: +86-xxx-xxxx-xxxx

## 📚 相关文档

- [安全策略文档](./SECURITY_POLICY.md)
- [用户权限指南](./USER_PERMISSIONS.md)
- [数据保护政策](./DATA_PROTECTION.md)
- [事件响应计划](./INCIDENT_RESPONSE.md)

---

**注意**: 本文档包含敏感安全配置信息，请妥善保管，仅限授权人员访问。
