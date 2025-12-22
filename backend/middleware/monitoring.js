const { query } = require('../config/database');
const fs = require('fs').promises;
const os = require('os');

// Application metrics storage
let metrics = {
  requests: {
    total: 0,
    success: 0,
    errors: 0,
    responseTimeSum: 0,
    averageResponseTime: 0
  },
  database: {
    queries: 0,
    errors: 0,
    connectionPool: 0
  },
  users: {
    active: 0,
    total: 0,
    newRegistrations: 0
  },
  system: {
    uptime: 0,
    memoryUsage: {},
    cpuUsage: 0
  }
};

// Track request metrics
const trackRequest = (responseTime, success = true) => {
  metrics.requests.total += 1;
  metrics.requests.responseTimeSum += responseTime;
  metrics.requests.averageResponseTime = metrics.requests.responseTimeSum / metrics.requests.total;
  
  if (success) {
    metrics.requests.success += 1;
  } else {
    metrics.requests.errors += 1;
  }
};

// Track database metrics
const trackDatabaseQuery = (success = true) => {
  metrics.database.queries += 1;
  if (!success) {
    metrics.database.errors += 1;
  }
};

// Metrics middleware
const metricsMiddleware = (req, res, next) => {
  if (!process.env.METRICS_ENABLED === 'true') {
    return next();
  }

  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const success = res.statusCode < 400;
    trackRequest(responseTime, success);
  });
  
  next();
};

// System health check
const getSystemHealth = async () => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {}
  };

  // Database health check
  try {
    const dbStart = Date.now();
    await query('SELECT 1 as health_check');
    const dbResponseTime = Date.now() - dbStart;
    
    health.checks.database = {
      status: 'healthy',
      responseTime: `${dbResponseTime}ms`
    };
  } catch (error) {
    health.checks.database = {
      status: 'unhealthy',
      error: error.message
    };
    health.status = 'unhealthy';
  }

  // Memory check
  const memoryUsage = process.memoryUsage();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const memoryUsagePercent = ((totalMemory - freeMemory) / totalMemory * 100).toFixed(2);

  health.checks.memory = {
    status: memoryUsagePercent < 90 ? 'healthy' : 'warning',
    usage: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
      systemUsagePercent: `${memoryUsagePercent}%`
    }
  };

  if (memoryUsagePercent > 90) {
    health.status = 'warning';
  }

  // Disk space check (if log directory is accessible)
  try {
    const logDir = process.env.LOG_FILE ? require('path').dirname(process.env.LOG_FILE) : '/var/log/tdil';
    const stats = await fs.stat(logDir);
    
    health.checks.storage = {
      status: 'healthy',
      logDirectory: logDir,
      accessible: true
    };
  } catch (error) {
    health.checks.storage = {
      status: 'warning',
      error: 'Log directory not accessible',
      accessible: false
    };
  }

  // Load average check (Unix systems)
  try {
    const loadAvg = os.loadavg();
    const cpuCount = os.cpus().length;
    const loadPercent = (loadAvg[0] / cpuCount * 100).toFixed(2);

    health.checks.cpu = {
      status: loadPercent < 80 ? 'healthy' : 'warning',
      loadAverage: {
        '1min': loadAvg[0].toFixed(2),
        '5min': loadAvg[1].toFixed(2),
        '15min': loadAvg[2].toFixed(2)
      },
      cpuCount,
      loadPercent: `${loadPercent}%`
    };

    if (loadPercent > 80) {
      health.status = 'warning';
    }
  } catch (error) {
    health.checks.cpu = {
      status: 'unknown',
      error: 'CPU metrics not available'
    };
  }

  return health;
};

// Detailed metrics endpoint
const getDetailedMetrics = async () => {
  try {
    // Update user metrics (using database-agnostic syntax)
    const userStats = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = $1 THEN 1 END) as active
      FROM users
    `, [true]);

    if (userStats.length > 0) {
      metrics.users.total = parseInt(userStats[0].total);
      metrics.users.active = parseInt(userStats[0].active);
      metrics.users.newRegistrations = parseInt(userStats[0].new_today);
    }

    // System metrics
    metrics.system.uptime = process.uptime();
    metrics.system.memoryUsage = process.memoryUsage();
    
    // Add system information
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuCount: os.cpus().length,
      hostname: os.hostname()
    };

    return {
      metrics,
      system: systemInfo,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting detailed metrics:', error);
    return {
      error: 'Failed to retrieve metrics',
      timestamp: new Date().toISOString()
    };
  }
};

// Performance monitoring for database queries
const monitorDatabaseQuery = async (queryFn, queryText, params = []) => {
  const start = Date.now();
  try {
    const result = await queryFn(queryText, params);
    const duration = Date.now() - start;
    
    trackDatabaseQuery(true);
    
    // Log slow queries
    if (duration > 1000) { // Queries taking more than 1 second
      console.warn('Slow query detected', {
        duration: `${duration}ms`,
        query: queryText.substring(0, 100),
        params: params.length > 0 ? 'with params' : 'no params'
      });
    }
    
    return result;
  } catch (error) {
    trackDatabaseQuery(false);
    throw error;
  }
};

// Application readiness check
const getReadinessCheck = async () => {
  const checks = {
    database: false,
    migrations: false,
    essential_data: false
  };

  try {
    // Database connectivity
    await query('SELECT 1');
    checks.database = true;

    // Check if migrations table exists and has entries
    const migrationCheck = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'migrations'
    `);
    
    if (migrationCheck.length > 0 && parseInt(migrationCheck[0].count) > 0) {
      const migrationCount = await query('SELECT COUNT(*) as count FROM migrations');
      checks.migrations = parseInt(migrationCount[0].count) > 0;
    }

    // Check if essential data exists (at least one admin user)
    const adminCheck = await query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE userType = $1 AND is_active = true
    `, ['admin']);
    checks.essential_data = parseInt(adminCheck[0].count) > 0;

  } catch (error) {
    console.error('Readiness check failed:', error);
  }

  const isReady = Object.values(checks).every(check => check === true);
  
  return {
    ready: isReady,
    checks,
    timestamp: new Date().toISOString()
  };
};

// Liveness check (simpler than health check)
const getLivenessCheck = () => {
  return {
    alive: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    pid: process.pid
  };
};

// Reset metrics (for testing or periodic reset)
const resetMetrics = () => {
  metrics = {
    requests: {
      total: 0,
      success: 0,
      errors: 0,
      responseTimeSum: 0,
      averageResponseTime: 0
    },
    database: {
      queries: 0,
      errors: 0,
      connectionPool: 0
    },
    users: {
      active: 0,
      total: 0,
      newRegistrations: 0
    },
    system: {
      uptime: 0,
      memoryUsage: {},
      cpuUsage: 0
    }
  };
  
  return { message: 'Metrics reset successfully' };
};

// Middleware to authenticate health check requests
const authenticateHealthCheck = (req, res, next) => {
  const token = req.headers['x-health-token'] || req.query.token;
  const expectedToken = process.env.HEALTH_CHECK_TOKEN;
  
  // If no token is configured, allow access (for development)
  if (!expectedToken) {
    return next();
  }
  
  if (!token || token !== expectedToken) {
    return res.status(401).json({
      error: 'Unauthorized health check access',
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

module.exports = {
  metricsMiddleware,
  getSystemHealth,
  getDetailedMetrics,
  getReadinessCheck,
  getLivenessCheck,
  monitorDatabaseQuery,
  resetMetrics,
  authenticateHealthCheck,
  trackRequest,
  trackDatabaseQuery
};
