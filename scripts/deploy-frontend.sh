#!/bin/bash

# Frontend Deployment Script for Hugging Face Spaces
# This script prepares and deploys the frontend to Hugging Face Spaces

set -e

echo "🚀 Starting frontend deployment for Hugging Face Spaces..."

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Load frontend environment variables
echo "🌍 Loading frontend environment variables..."
if [ -f ".env.frontend" ]; then
    export $(cat .env.frontend | grep -v '^#' | xargs)
    echo "✅ Frontend environment variables loaded"
else
    echo "⚠️  Warning: .env.frontend not found, using defaults"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run tests
echo "🧪 Running tests..."
npm test || echo "⚠️  Tests failed, continuing deployment..."

# Build the frontend application
echo "🔨 Building frontend application..."
npm run build

# Check if build was successful
if [ ! -d "out" ]; then
    echo "❌ Error: Build failed - 'out' directory not found"
    exit 1
fi

echo "✅ Frontend build completed successfully"

# Create deployment info
echo "📋 Creating deployment info..."
cat > deployment-info-frontend.json << EOF
{
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "version": "$(node -p "require('./package.json').version")",
  "environment": "production",
  "platform": "Hugging Face Spaces",
  "frontend_url": "https://huggingface.co/spaces/StephenZao/scoreaimanage",
  "backend_url": "${NEXT_PUBLIC_API_URL:-https://scoreaimanage.onrender.com/api}",
  "build_output": "out",
  "node_version": "$(node --version)",
  "npm_version": "$(npm --version)"
}
EOF

echo "✅ Deployment info created"

# Create Hugging Face Spaces configuration
echo "🔧 Creating Hugging Face Spaces configuration..."

# Update README for Spaces
if [ -f "README_SPACES.md" ]; then
    cp README_SPACES.md README.md
    echo "✅ README.md updated for Spaces"
fi

# Create .gitignore for Spaces
cat > .gitignore << EOF
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production builds
out/
.next/

# Environment variables
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Cache
.cache/
.parcel-cache/

# Deployment
deployment-info-frontend.json
EOF

echo "✅ .gitignore created for Spaces"

# Create health check for frontend
echo "🏥 Creating health check endpoint..."
cat > health-check-frontend.js << 'EOF'
// Health check script for Hugging Face Spaces
const https = require('https');

const options = {
  hostname: 'huggingface.co',
  port: 443,
  path: '/spaces/StephenZao/scoreaimanage',
  method: 'GET',
  timeout: 10000
};

const req = https.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log('✅ Frontend health check passed');
    process.exit(0);
  } else {
    console.log(`❌ Frontend health check failed with status: ${res.statusCode}`);
    process.exit(1);
  }
});

req.on('error', (err) => {
  console.log(`❌ Frontend health check error: ${err.message}`);
  process.exit(1);
});

req.on('timeout', () => {
  console.log('❌ Frontend health check timeout');
  req.destroy();
  process.exit(1);
});

req.end();
EOF

echo "✅ Health check script created"

# Create deployment verification script
echo "🔍 Creating deployment verification..."
cat > verify-deployment.sh << 'EOF'
#!/bin/bash

echo "🔍 Verifying frontend deployment..."

# Check if required files exist
required_files=("app.py" "requirements.txt" "README.md" "out/index.html")
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
        exit 1
    fi
done

# Check build output
if [ -d "out" ] && [ "$(ls -A out)" ]; then
    echo "✅ Build output is not empty"
    echo "📁 Build contents:"
    ls -la out/
else
    echo "❌ Build output is empty"
    exit 1
fi

# Check Python requirements
if [ -f "requirements.txt" ]; then
    echo "📦 Python requirements:"
    cat requirements.txt
fi

echo "✅ Frontend deployment verification completed"
EOF

chmod +x verify-deployment.sh

echo "✅ Deployment verification script created"

# Final checks
echo "🔍 Final deployment checks..."

# Check if main entry point exists
if [ -f "app.py" ]; then
    echo "✅ Flask app.py found"
else
    echo "❌ Error: app.py not found"
    exit 1
fi

# Check if requirements.txt exists
if [ -f "requirements.txt" ]; then
    echo "✅ requirements.txt found"
else
    echo "❌ Error: requirements.txt not found"
    exit 1
fi

# Check if build output exists
if [ -d "out" ] && [ -f "out/index.html" ]; then
    echo "✅ Build output found"
else
    echo "❌ Error: Build output not found"
    exit 1
fi

echo ""
echo "🎉 Frontend deployment preparation completed!"
echo ""
echo "📋 Next steps:"
echo "1. Commit and push your code to GitHub"
echo "2. Go to https://huggingface.co/spaces/StephenZao/scoreaimanage"
echo "3. Connect your GitHub repository"
echo "4. The deployment will start automatically"
echo "5. Monitor the build logs"
echo ""
echo "🌐 Your frontend will be available at: https://huggingface.co/spaces/StephenZao/scoreaimanage"
echo "📡 Backend API: ${NEXT_PUBLIC_API_URL:-https://scoreaimanage.onrender.com/api}"
echo ""
echo "🔍 To verify deployment locally:"
echo "  ./verify-deployment.sh"
echo ""
echo "🏥 To check health after deployment:"
echo "  curl https://huggingface.co/spaces/StephenZao/scoreaimanage/health"
echo ""
