# ScoreAIManage 部署指南

## 🚀 Render 云平台部署

### 部署概览

**部署地址**: https://scoreaimanage.onrender.com  
**平台**: Render.com  
**数据库**: PostgreSQL  
**运行时**: Node.js 18  

---

## 📋 部署前准备

### 1. 环境要求
- Node.js 18+
- PostgreSQL 15+
- Git 仓库
- Render.com 账户

### 2. 项目结构
```
scoreAIManage/
├── server.js                 # Express 服务器入口
├── package.json              # 项目依赖配置
├── render.yaml              # Render 部署配置
├── Dockerfile               # Docker 容器配置
├── .env.production          # 生产环境变量
├── scripts/
│   └── deploy.sh            # 部署脚本
├── routes/                  # API 路由
│   ├── auth.js
│   ├── students.js
│   ├── classes.js
│   ├── subjects.js
│   ├── grades.js
│   └── exams.js
└── lib/
    └── database.ts          # 数据库连接
```

---

## 🔧 部署步骤

### 步骤 1: 推送代码到 GitHub

```bash
# 添加所有文件到 Git
git add .

# 提交代码
git commit -m "Add Render deployment configuration"

# 推送到 GitHub
git push origin main
```

### 步骤 2: 配置 Render 服务

#### 2.1 创建 Web 服务
1. 登录 [Render.com](https://render.com)
2. 点击 "New +" → "Web Service"
3. 连接 GitHub 仓库
4. 选择 `scoreAIManage` 项目
5. 配置以下设置：
   - **Name**: `scoreaimanage-api`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

#### 2.2 配置 PostgreSQL 数据库
1. 点击 "New +" → "PostgreSQL"
2. 配置数据库：
   - **Name**: `scoreaimanage-db`
   - **Database Name**: `scoremanage`
   - **User**: `scoremanage_user`
   - **Instance Type**: `Free`

### 步骤 3: 配置环境变量

在 Render 仪表板中添加以下环境变量：

```bash
# 数据库配置
DATABASE_HOST=your-postgres-host.render.com
DATABASE_PORT=5432
DATABASE_NAME=scoremanage
DATABASE_USER=scoremanage_user
DATABASE_PASSWORD=your-secure-password
DATABASE_URL=postgresql://scoremanage_user:password@host:5432/scoremanage
DATABASE_SSL=true

# 应用配置
NODE_ENV=production
PORT=10000
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_EXPIRES_IN=24h

# API 配置
API_BASE_URL=https://scoreaimanage.onrender.com/api
ALLOWED_ORIGINS=https://scoreaimanage.onrender.com

# 安全配置
ENABLE_STRICT_TRANSPORT_SECURITY=true
ENABLE_CONTENT_SECURITY_POLICY=true

# 日志配置
LOG_LEVEL=info
ENABLE_AUDIT_LOGGING=true
```

### 步骤 4: 数据库初始化

连接到 PostgreSQL 数据库并执行初始化脚本：

```sql
-- 执行数据库结构
\i database_schema_postgresql.sql

-- 创建应用用户
CREATE USER scoremanage_user WITH PASSWORD 'your_secure_password';

-- 授权
GRANT CONNECT ON DATABASE scoremanage TO scoremanage_user;
GRANT USAGE ON SCHEMA public TO scoremanage_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO scoremanage_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO scoremanage_user;
```

---

## 🏥 健康检查

### 健康检查端点
- **URL**: `https://scoreaimanage.onrender.com/api/health`
- **方法**: GET
- **响应示例**:

```json
{
  "status": "healthy",
  "timestamp": "2026-05-06T06:45:00.000Z",
  "version": "0.1.0",
  "environment": "production",
  "database": {
    "status": "healthy",
    "connectionCount": 1,
    "idleCount": 0,
    "totalCount": 1
  },
  "uptime": 3600.123,
  "memory": {
    "rss": 50331648,
    "heapTotal": 20971520,
    "heapUsed": 15728640,
    "external": 1048576
  }
}
```

---

## 📊 API 端点

### 基础端点
- **健康检查**: `GET /api/health`
- **API 文档**: `GET /api/docs`

### 认证端点
- **登录**: `POST /api/auth/login`
- **登出**: `POST /api/auth/logout`
- **用户信息**: `GET /api/auth/profile`

### 数据管理端点
- **学生**: `/api/students/*`
- **班级**: `/api/classes/*`
- **科目**: `/api/subjects/*`
- **成绩**: `/api/grades/*`
- **考试**: `/api/exams/*`

---

## 🔒 安全配置

### 已实施的安全措施
- **HTTPS**: 强制 SSL/TLS
- **CORS**: 跨域请求控制
- **Helmet**: 安全头设置
- **Rate Limiting**: API 请求限制
- **Input Validation**: 输入数据验证
- **Error Handling**: 安全错误响应

### 安全头设置
```javascript
{
  "Content-Security-Policy": "default-src 'self'",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
}
```

---

## 📈 监控和日志

### 日志配置
- **级别**: info
- **格式**: 结构化 JSON
- **输出**: 控制台 + 文件
- **审计**: 启用

### 监控指标
- **响应时间**
- **错误率**
- **数据库连接状态**
- **内存使用情况**
- **请求频率**

---

## 🔄 自动部署

### 自动部署配置
- **触发条件**: 推送到 main 分支
- **构建流程**: 
  1. 安装依赖 (`npm install`)
  2. 运行测试 (`npm test`)
  3. 构建应用 (`npm run build`)
  4. 启动服务 (`npm start`)

### 部署状态检查
```bash
# 检查部署状态
curl https://scoreaimanage.onrender.com/api/health

# 检查日志
# 在 Render 仪表板中查看 Logs 标签页
```

---

## 🚨 故障排除

### 常见问题

#### 1. 数据库连接失败
**症状**: 健康检查返回 503 错误
**解决方案**:
- 检查数据库环境变量
- 验证数据库连接字符串
- 确认数据库服务状态

#### 2. 应用启动失败
**症状**: 服务无法启动
**解决方案**:
- 检查 package.json 中的 start 脚本
- 查看构建日志
- 验证所有依赖已安装

#### 3. 内存不足
**症状**: 应用频繁重启
**解决方案**:
- 监控内存使用情况
- 优化数据库查询
- 考虑升级实例类型

### 调试命令
```bash
# 本地测试
npm start

# 运行测试
npm test

# 检查依赖
npm ls

# 查看日志
tail -f logs/app.log
```

---

## 📚 维护指南

### 定期维护任务
- **每周**: 检查日志和错误报告
- **每月**: 更新依赖包
- **每季度**: 备份数据库
- **每年**: 安全审计

### 性能优化
- 监控数据库查询性能
- 优化 API 响应时间
- 实施缓存策略
- 考虑 CDN 使用

---

## 🎯 部署成功验证

### 验证清单
- [ ] 应用成功启动
- [ ] 健康检查返回 200
- [ ] 数据库连接正常
- [ ] API 端点响应正确
- [ ] 安全配置生效
- [ ] 日志记录正常
- [ ] 自动部署工作

### 最终确认
```bash
# 验证部署
curl -X GET https://scoreaimanage.onrender.com/api/health

# 预期响应
{
  "status": "healthy",
  "timestamp": "2026-05-06T06:45:00.000Z",
  "version": "0.1.0",
  "environment": "production"
}
```

---

## 📞 技术支持

### 联系方式
- **文档**: 本部署指南
- **日志**: Render 仪表板
- **监控**: 健康检查端点
- **问题**: GitHub Issues

### 相关资源
- [Render 官方文档](https://render.com/docs)
- [Node.js 部署指南](https://nodejs.org/en/docs/)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)

---

**部署状态**: ✅ 就绪  
**访问地址**: https://scoreaimanage.onrender.com  
**最后更新**: 2026年5月6日  

*本指南由 Cascade AI 自动生成，确保部署过程完整准确。*
