const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { env } = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth.routes');
const submissionRoutes = require('./routes/submission.routes');
const draftRoutes = require('./routes/draft.routes');
const approvalRoutes = require('./routes/approval.routes');
const mediaRoutes    = require('./routes/media.routes');

const app = express();

// ============================================
// Middleware
// ============================================
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Support multiple allowed origins (comma-separated) or single URL
const allowedOrigins = (env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin ${origin} not allowed`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Always serve AI-generated images (stored locally regardless of storage mode)
app.use(
  '/api/v1/files/ai-generated',
  express.static(path.join(__dirname, '..', 'uploads', 'ai-generated'))
);

// Serve other local files API (only when USE_LOCAL_STORAGE is set)
if (env.USE_LOCAL_STORAGE) {
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
  app.get('/api/v1/files/:key(*)', (req, res) => {
    const filePath = path.join(__dirname, '..', 'uploads', decodeURIComponent(req.params.key));
    res.sendFile(filePath, (err) => {
      if (err) {
        res.status(404).json({ success: false, error: 'File not found' });
      }
    });
  });
}
// ============================================
// Health Check
// ============================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AMA API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// ============================================
// API Routes
// ============================================
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/submissions', submissionRoutes);
app.use('/api/v1/drafts', draftRoutes);
app.use('/api/v1/approvals', approvalRoutes);
app.use('/api/v1/media',     mediaRoutes);

// Serve local files API
if (env.USE_LOCAL_STORAGE) {
  app.get('/api/v1/files/:key(*)', (req, res) => {
    const filePath = path.join(__dirname, '..', 'uploads', decodeURIComponent(req.params.key));
    res.sendFile(filePath, (err) => {
      if (err) {
        res.status(404).json({ success: false, error: 'File not found' });
      }
    });
  });
}

// ============================================
// 404 Handler
// ============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
});

// ============================================
// Error Handler
// ============================================
app.use(errorHandler);

module.exports = app;
