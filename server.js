const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const { initChat } = require('./backend/sockets/chatSocket');
const { initDatabase, insertSampleData } = require('./backend/config/database');

// Configs
dotenv.config();

// Initialize database
initDatabase().then(() => {
  insertSampleData().catch(console.error);
}).catch(console.error);

// Create app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Import routes
const authRoutes = require('./backend/routes/authRoutes');
const memberRoutes = require('./backend/routes/memberRoutes');
const pointsRoutes = require('./backend/routes/pointsRoutes');
const messageRoutes = require('./backend/routes/messageRoutes');
const rewardRoutes = require('./backend/routes/rewardRoutes');
const announcementRoutes = require('./backend/routes/announcementRoutes');
const eventRoutes = require('./backend/routes/eventRoutes');
const activityRoutes = require('./backend/routes/activityRoutes');
const leaderboardRoutes = require('./backend/routes/leaderboardRoutes');

// Security and performance middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development, configure for production
}));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // limit each IP to 1000 requests per windowMs (increased for development)
  message: 'Too many requests from this IP, please try again later.',
});

// Only apply rate limiting in production
if (process.env.NODE_ENV === 'production') {
  app.use('/api/', limiter);
}

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from frontend build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
}

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  // Serve frontend for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
} else {
  // Test route for development
  app.get('/', (req, res) => {
    res.send('tDIL Backend is running 🚀');
  });
}

// Socket.io test
io.on('connection', (socket) => {
  console.log(`⚡: ${socket.id} user connected`);
  socket.on('disconnect', () => {
    console.log('🔥: A user disconnected');
  });
});

initChat(io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
