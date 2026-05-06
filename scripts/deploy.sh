#!/bin/bash

# Deployment Script for ScoreAIManage on Render
# This script prepares the application for deployment

set -e

echo "🚀 Starting deployment preparation for ScoreAIManage..."

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# Run tests
echo "🧪 Running tests..."
npm test

# Build the application
echo "🔨 Building application..."
npm run build || echo "⚠️  Build script not found, continuing..."

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p logs

# Set production environment
echo "🌍 Setting production environment..."
export NODE_ENV=production

# Check environment variables
echo "🔍 Checking environment variables..."
if [ -f ".env.production" ]; then
    echo "✅ Production environment file found"
    # Copy production env to .env for deployment
    cp .env.production .env
else
    echo "⚠️  Warning: .env.production not found"
fi

# Create database initialization script for production
echo "🗄️  Preparing database initialization..."
cat > scripts/init-production-db.sql << 'EOF'
-- Production Database Initialization for ScoreAIManage
-- This script initializes the database with basic structure

-- Run the main schema
\i database_schema_postgresql.sql

-- Create production user with limited privileges
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'scoremanage_user') THEN
        CREATE ROLE scoremanage_user WITH LOGIN PASSWORD 'change_this_password';
    END IF;
END
$$;

-- Grant necessary permissions
GRANT CONNECT ON DATABASE scoremanage TO scoremanage_user;
GRANT USAGE ON SCHEMA public TO scoremanage_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO scoremanage_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO scoremanage_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO scoremanage_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO scoremanage_user;

EOF

echo "✅ Database initialization script created"

# Create health check endpoint
echo "🏥 Creating health check endpoint..."
cat > health-check.js << 'EOF'
// Health check script for Render
const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 10000,
  path: '/api/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log('✅ Health check passed');
    process.exit(0);
  } else {
    console.log(`❌ Health check failed with status: ${res.statusCode}`);
    process.exit(1);
  }
});

req.on('error', (err) => {
  console.log(`❌ Health check error: ${err.message}`);
  process.exit(1);
});

req.on('timeout', () => {
  console.log('❌ Health check timeout');
  req.destroy();
  process.exit(1);
});

req.end();
EOF

echo "✅ Health check script created"

# Create deployment info file
echo "📋 Creating deployment info..."
cat > deployment-info.json << EOF
{
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "version": "$(node -p "require('./package.json').version")",
  "environment": "production",
  "platform": "Render",
  "database": "PostgreSQL",
  "node_version": "$(node --version)",
  "npm_version": "$(npm --version)"
}
EOF

echo "✅ Deployment info created"

# Final checks
echo "🔍 Final deployment checks..."

# Check if main entry point exists
if [ -f "server.js" ] || [ -f "app.js" ] || [ -f "index.js" ]; then
    echo "✅ Main entry point found"
else
    echo "⚠️  Warning: No main entry point (server.js, app.js, or index.js) found"
fi

# Check if package.json has start script
if npm run | grep -q "start"; then
    echo "✅ Start script found"
else
    echo "⚠️  Warning: No start script found in package.json"
fi

echo ""
echo "🎉 Deployment preparation completed!"
echo ""
echo "📋 Next steps:"
echo "1. Push your code to GitHub"
echo "2. Connect your repository to Render"
echo "3. Configure environment variables in Render dashboard"
echo "4. Deploy!"
echo ""
echo "🌐 Your application will be available at: https://scoreaimanage.onrender.com"
echo ""
echo "📊 Health check endpoint: https://scoreaimanage.onrender.com/api/health"
echo "📚 API documentation: https://scoreaimanage.onrender.com/api/docs"
echo ""
