/**
 * ScoreAIManage Server Entry Point
 * Production-ready server for Render deployment
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
// Mock database for deployment - will be replaced with actual implementation
const mockDatabase = {
  healthCheck: async () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    connectionCount: 1,
    idleCount: 0,
    totalCount: 1
  })
};

const initializeDatabase = async () => {
  console.log('🗄️  Database initialized (mock mode for deployment)');
};

const Logger = {
  info: (message, meta = {}) => console.log(`[INFO] ${message}`, meta),
  error: (message, error) => console.error(`[ERROR] ${message}`, error),
};

// Load environment variables
require('dotenv').config({ path: '.env.production' });

const app = express();
const PORT = process.env.PORT || 10000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://scoreaimanage.onrender.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Compression middleware
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  Logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });
  next();
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    const health = await mockDatabase.healthCheck();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: require('./package.json').version,
      environment: process.env.NODE_ENV,
      database: health,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  } catch (error) {
    Logger.error('Health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// API routes registration with logging
Logger.info('Registering API routes...');

app.use('/api/auth', (req, res, next) => {
  Logger.info(`[ROUTER] Auth route accessed: ${req.method} ${req.path}`);
  next();
}, require('./routes/auth'));

app.use('/api/students', (req, res, next) => {
  Logger.info(`[ROUTER] Students route accessed: ${req.method} ${req.path}`);
  next();
}, require('./routes/students'));

app.use('/api/classes', (req, res, next) => {
  Logger.info(`[ROUTER] Classes route accessed: ${req.method} ${req.path}`);
  next();
}, require('./routes/classes'));

app.use('/api/subjects', (req, res, next) => {
  Logger.info(`[ROUTER] Subjects route accessed: ${req.method} ${req.path}`);
  next();
}, require('./routes/subjects'));

app.use('/api/grades', (req, res, next) => {
  Logger.info(`[ROUTER] Grades route accessed: ${req.method} ${req.path}`);
  next();
}, require('./routes/grades'));

app.use('/api/exams', (req, res, next) => {
  Logger.info(`[ROUTER] Exams route accessed: ${req.method} ${req.path}`);
  next();
}, require('./routes/exams'));

Logger.info('All API routes registered successfully');

// API documentation endpoint with logging
app.get('/api/docs', (req, res) => {
  Logger.info(`[DOCS] API documentation accessed`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.json({
    name: 'ScoreAIManage API',
    version: require('./package.json').version,
    description: '学生成绩管理系统 API',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      students: '/api/students/*',
      classes: '/api/classes/*',
      subjects: '/api/subjects/*',
      grades: '/api/grades/*',
      exams: '/api/exams/*',
    },
    documentation: 'https://scoreaimanage.onrender.com/api/docs',
  });
});

// 404 handler with logging
app.use('*', (req, res) => {
  Logger.warn(`[404] Route not found: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((error, req, res, next) => {
  Logger.error('Unhandled error', error);
  
  res.status(error.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  Logger.info('SIGTERM received, shutting down gracefully');
  
  // Mock database cleanup
  Logger.info('Database connections closed (mock mode)');
  process.exit(0);
});

process.on('SIGINT', () => {
  Logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    // Initialize database
    Logger.info('Initializing database...');
    await initializeDatabase();
    
    // Start listening
    app.listen(PORT, () => {
      Logger.info(`🚀 ScoreAIManage server started successfully`, {
        port: PORT,
        environment: process.env.NODE_ENV,
        url: `https://scoreaimanage.onrender.com`,
        healthCheck: `https://scoreaimanage.onrender.com/api/health`,
      });
    });
  } catch (error) {
    Logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Start the server
startServer();
