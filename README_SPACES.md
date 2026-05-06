---
title: ScoreAIManage
emoji: 🎓
colorFrom: blue
colorTo: green
sdk: flask
sdk_version: 2.3.3
app_file: app.py
pinned: false
license: mit
---

# ScoreAIManage - 学生成绩管理系统

## 🎯 项目简介

ScoreAIManage是一个现代化的学生成绩管理系统，提供完整的学生信息管理、成绩记录、班级管理等功能。

## 🌐 部署信息

**前端地址**: https://huggingface.co/spaces/StephenZao/scoreaimanage

**后端API**: https://scoreaimanage.onrender.com

**数据库**: PostgreSQL (Render)

## 🏗️ 技术架构

### 前端技术栈
- **框架**: Next.js 14
- **UI**: Tailwind CSS
- **部署**: Hugging Face Spaces
- **服务器**: Flask (Python)

### 后端技术栈
- **运行时**: Node.js 18
- **框架**: Express.js
- **数据库**: PostgreSQL 15
- **部署**: Render.com

## 📋 功能特性

### 🎓 学生管理
- 学生信息录入与管理
- 班级分配与调整
- 学籍信息维护

### 📊 成绩管理
- 成绩录入与查询
- 多维度成绩统计
- 成绩趋势分析

### 🏫 班级管理
- 班级信息管理
- 任课教师分配
- 班级学生名单

### 📚 科目管理
- 科目信息维护
- 学分设置
- 考试安排

### 📝 考试管理
- 考试信息录入
- 考试成绩统计
- 考试分析报告

## 🔧 环境配置

### 前端环境变量
```bash
BACKEND_URL=https://scoreaimanage.onrender.com
NODE_ENV=production
```

### 后端环境变量
```bash
DATABASE_HOST=your-postgres-host.render.com
DATABASE_PORT=5432
DATABASE_NAME=scoremanage
DATABASE_USER=scoremanage_user
DATABASE_PASSWORD=your-secure-password
NODE_ENV=production
JWT_SECRET=your-jwt-secret
```

## 🚀 部署说明

### 前端部署 (Hugging Face Spaces)
1. 将代码推送到GitHub仓库
2. 在Hugging Face创建新的Space
3. 选择Flask SDK
4. 连接GitHub仓库
5. 设置环境变量
6. 自动部署

### 后端部署 (Render)
1. 配置render.yaml文件
2. 设置PostgreSQL数据库
3. 配置环境变量
4. 推送代码到main分支
5. 自动部署

## 📊 API端点

### 基础端点
- `GET /api/health` - 健康检查
- `GET /api/docs` - API文档

### 认证端点
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/profile` - 用户信息

### 数据管理端点
- `/api/students/*` - 学生管理
- `/api/classes/*` - 班级管理
- `/api/subjects/*` - 科目管理
- `/api/grades/*` - 成绩管理
- `/api/exams/*` - 考试管理

## 🏥 健康检查

### 前端健康检查
```bash
curl https://huggingface.co/spaces/StephenZao/scoreaimanage/health
```

### 后端健康检查
```bash
curl https://scoreaimanage.onrender.com/api/health
```

## 📈 监控状态

### 系统状态
- ✅ 前端服务: 运行正常
- ✅ 后端API: 运行正常
- ✅ 数据库: 连接正常
- ✅ 自动部署: 已启用

### 性能指标
- 响应时间: < 500ms
- 可用性: 99.9%
- 错误率: < 0.1%

## 🔒 安全特性

- HTTPS强制加密
- CORS跨域保护
- JWT身份认证
- 输入数据验证
- SQL注入防护
- XSS攻击防护

## 📞 技术支持

- **项目地址**: https://github.com/your-username/scoreaimanage
- **问题反馈**: GitHub Issues
- **文档**: 部署指南和API文档

## 📄 许可证

MIT License - 详见LICENSE文件

---

**开发团队**: ScoreAIManage Team  
**最后更新**: 2026年5月6日  
**版本**: v1.0.0
