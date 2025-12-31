const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const cron = require('node-cron');

// Load environment configuration
dotenv.config();

// Import custom middleware and utilities
const { initChat } = require('./backend/sockets/chatSocket');
const { initDatabase } = require('./backend/config/database');
const { 
  logger, 
  requestLogger, 
  errorHandler, 
  notFoundHandler, 
  gracefulShutdown 
} = require('./backend/middleware/errorHandler');
const {
  metricsMiddleware,
  getSystemHealth,
  getDetailedMetrics,
  getReadinessCheck,
  getLivenessCheck,
  authenticateHealthCheck
} = require('./backend/middleware/monitoring');
const { authRateLimit, cleanupExpiredSessions } = require('./backend/middleware/enhancedAuthMiddleware');

// Create Express app
const app = express();
const server = http.createServer(app);

// Initialize database on startup
const initializeDatabase = async () => {
  try {
    // DISABLED: Overly aggressive nuclear reset was preventing user persistence
    // This was eliminating demo data but also wiping real users
    logger.info('🔄 Database initialization - preserving existing users...');
    
    // SECOND: Initialize database with correct schema
    await initDatabase();
    logger.info('✅ Database initialized successfully');
    
    logger.info('🎉 Database ready for production use');
    
  } catch (error) {
    logger.error('Database initialization failed', { error: error.message });
    process.exit(1);
  }
};

// Initialize database
initializeDatabase();

// Trust proxy when behind nginx/load balancer
app.set('trust proxy', process.env.TRUST_PROXY === 'true' || 1);

// Socket.io configuration with enhanced security
const socketOrigins = process.env.SOCKET_CORS_ORIGIN ? 
  process.env.SOCKET_CORS_ORIGIN.split(',') : 
  ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

const io = new Server(server, {
  cors: {
    origin: socketOrigins,
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Import API routes
const authRoutes = require('./backend/routes/authRoutes');
const memberRoutes = require('./backend/routes/memberRoutes');
const pointsRoutes = require('./backend/routes/pointsRoutes');
const messageRoutes = require('./backend/routes/messageRoutes');
const rewardRoutes = require('./backend/routes/rewardRoutes');
const announcementRoutes = require('./backend/routes/announcementRoutes');
const eventRoutes = require('./backend/routes/eventRoutes');
const activityRoutes = require('./backend/routes/activityRoutes');
const leaderboardRoutes = require('./backend/routes/leaderboardRoutes');
const adminRoutes = require('./backend/routes/adminRoutes');
const statsRoutes = require('./backend/routes/statsRoutes');
const inviteRoutes = require('./backend/routes/inviteRoutes');
const connectionRoutes = require('./backend/routes/connectionRoutes');

// Security middleware configuration
const helmetOptions = process.env.NODE_ENV === 'production' ? {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "ws:"],
      upgradeInsecureRequests: null, // Disable HTTPS upgrade for HTTP server
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
} : {
  contentSecurityPolicy: false
};

app.use(helmet(helmetOptions));

// Enable compression if configured
if (process.env.COMPRESSION_ENABLED === 'true') {
  app.use(compression());
}

// Request logging middleware
if (process.env.ENABLE_ACCESS_LOG === 'true') {
  app.use(requestLogger);
}

// Metrics collection middleware
if (process.env.METRICS_ENABLED === 'true') {
  app.use(metricsMiddleware);
}

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path.startsWith('/api/health') || req.path.startsWith('/health');
  },
  // Disable trust proxy validation to allow running behind nginx
  validate: { trustProxy: false }
});

// Apply rate limiting conditionally
if (process.env.NODE_ENV === 'production') {
  app.use('/api/', generalLimiter);
}

// CORS configuration with enhanced security
const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
  process.env.ALLOWED_ORIGINS.split(',') : 
  [
    'http://localhost:3099',
    'http://localhost:4099',
    'http://localhost:5000',
    'http://localhost:5001',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
    'https://tdilapp.onrender.com',
    'http://104.131.63.244:5001',
    process.env.FRONTEND_URL
  ].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Health-Token']
}));

// Body parsing middleware with size limits
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB
app.use(express.json({ limit: maxFileSize }));
app.use(express.urlencoded({ extended: true, limit: maxFileSize }));

// Serve static files from frontend build
const frontendPath = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, 'public') 
  : path.join(__dirname, 'tdil-frontend/dist');
app.use(express.static(frontendPath, {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
  etag: true,
  lastModified: true
}));

// Health check routes (with authentication for detailed checks)
app.get('/health', getLivenessCheck);
app.get('/api/health', async (req, res) => {
  try {
    const health = await getSystemHealth();
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/health/ready', async (req, res) => {
  try {
    const readiness = await getReadinessCheck();
    res.status(readiness.ready ? 200 : 503).json(readiness);
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: 'Readiness check failed',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/metrics', authenticateHealthCheck, async (req, res) => {
  try {
    const metrics = await getDetailedMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      timestamp: new Date().toISOString()
    });
  }
});

// Authentication routes with enhanced rate limiting (only in production)
if (process.env.NODE_ENV === 'production') {
  app.use('/api/auth', authRateLimit, authRoutes);
} else {
  app.use('/api/auth', authRoutes);
}

// API routes
app.use('/api/members', memberRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/connections', connectionRoutes);

// API info endpoint for development
app.get('/api', (req, res) => {
  res.json({
    message: 'tDIL Backend API is running 🚀',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend for all non-API routes
app.get('*', (req, res) => {
  const indexPath = process.env.NODE_ENV === 'production' 
    ? path.join(__dirname, 'public', 'index.html')
    : path.join(__dirname, 'tdil-frontend/dist', 'index.html');
  res.sendFile(indexPath);
});

// Initialize Socket.IO with authentication
initChat(io);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Setup periodic cleanup tasks
if (process.env.NODE_ENV === 'production') {
  // Clean up expired sessions every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await cleanupExpiredSessions();
      logger.info('Periodic session cleanup completed');
    } catch (error) {
      logger.error('Session cleanup failed', { error: error.message });
    }
  });
  
  logger.info('Periodic cleanup tasks scheduled');
}

// Setup graceful shutdown
gracefulShutdown(server);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 tDIL Server started on port ${PORT}`, {
    environment: process.env.NODE_ENV,
    nodeVersion: process.version,
    port: PORT
  });
});

// Handle server startup errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use`);
  } else {
    logger.error('Server startup error', { error: error.message });
  }
  process.exit(1);
});
