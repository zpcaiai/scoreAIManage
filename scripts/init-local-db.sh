#!/bin/bash

# 本地数据库初始化脚本
# 连接信息：localhost:5431, postgres/postgres/postgres

echo "开始初始化本地数据库..."

# 创建 scoreAI 数据库
PGPASSWORD=postgres psql -h localhost -p 5431 -U postgres -d postgres -c "DROP DATABASE IF EXISTS scoreAI;"
PGPASSWORD=postgres psql -h localhost -p 5431 -U postgres -d postgres -c "CREATE DATABASE scoreAI;"

echo "数据库 scoreAI 创建成功"

# 执行数据库模式初始化
PGPASSWORD=postgres psql -h localhost -p 5431 -U postgres -d scoreAI -f database_schema_postgresql.sql

echo "数据库表结构创建完成"

echo "本地数据库初始化完成"
