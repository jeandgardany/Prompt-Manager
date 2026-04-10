import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import agentsRouter from './routes/agents.js';
import promptsRouter from './routes/prompts.js';
import testRouter from './routes/test.js';
import modelsRouter from './routes/models.js';
import dualRunResultsRouter from './routes/dualRunResults.js';
import judgeCriteriaRouter from './routes/judgeCriteria.js';
import { validateJson, sanitizeInput } from './middleware/validate.js';

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Rate limiting — general: 200 req/15min, LLM routes: 30 req/15min
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health',
  message: { error: 'Too many requests, please try again later.' },
});

const llmLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many LLM requests, please try again later.' },
});

// CORS configuration - restrictive by default
const corsOptions = {
  origin: (origin, callback) => {
    // Allowed origins
    const allowed = [
      `http://localhost:${PORT}`,
      `http://127.0.0.1:${PORT}`,
      `http://localhost:5173`, // Vite default
      `http://127.0.0.1:5173`,
      ...(process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()) || []),
    ];

    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // Check if origin is allowed
    if (allowed.includes(origin)) return callback(null, true);

    // In development, allow all origins (for testing)
    if (process.env.NODE_ENV !== 'production') return callback(null, true);

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-API-Key'],
};

// API Key authentication middleware (optional, enabled via API_KEY_REQUIRED=true)
const apiKeyAuth = (req, res, next) => {
  // Skip if not required
  if (!process.env.API_KEY_REQUIRED || process.env.API_KEY_REQUIRED === 'false') {
    return next();
  }

  const key = req.headers['x-api-key'];
  const validKey = process.env.API_KEY;

  if (!key || !validKey || key !== validKey) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }

  next();
};

// Security warning for exposed servers
if (HOST === '0.0.0.0') {
  console.warn('╔════════════════════════════════════════════════════════════╗');
  console.warn('║  ⚠️  WARNING: Server exposed on 0.0.0.0                       ║');
  console.warn('║  Network access is enabled. For security, set:             ║');
  console.warn('║    API_KEY_REQUIRED=true                                     ║');
  console.warn('║    API_KEY=your-secret-key                                  ║');
  console.warn('╚════════════════════════════════════════════════════════════╝');
}

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Disable for API compatibility
}));
app.use(cors(corsOptions));
app.use(generalLimiter);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(validateJson);
app.use(sanitizeInput);

// Health check (no auth required)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    security: {
      apiKeyRequired: process.env.API_KEY_REQUIRED === 'true',
      allowedOrigins: process.env.ALLOWED_ORIGINS || 'localhost only',
    },
  });
});

// Apply API key auth to all /api routes
app.use('/api', apiKeyAuth);

// Routes
app.use('/api/agents', agentsRouter);
app.use('/api/prompts', promptsRouter);
app.use('/api/test', llmLimiter, testRouter);
app.use('/api/models', modelsRouter);
app.use('/api/dual-runs', dualRunResultsRouter);
app.use('/api/judge-criteria', judgeCriteriaRouter);

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({ error: 'Internal server error' });
  }

  res.status(500).json({
    error: err.message || 'Internal server error',
    ...(err.latencyMs && { latencyMs: err.latencyMs }),
  });
});

const server = app.listen(PORT, HOST, () => {
  const binding = HOST === '0.0.0.0' ? `http://0.0.0.0:${PORT}` : `http://localhost:${PORT}`;
  console.log(`\n🚀 Prompt Manager API running on ${binding}`);
  console.log(`   LM Studio: ${process.env.LM_STUDIO_URL}`);
  console.log(`   GLM API: ${process.env.GLM_API_URL}`);
  console.log(`   Security: API Key ${process.env.API_KEY_REQUIRED === 'true' ? 'REQUIRED' : 'disabled'}`);
  console.log('');
});

// Aumentar o timeout para 10 minutos (600000ms)
// A execução sequencial de modelos pesados no LM Studio precisa de bastante tempo
server.setTimeout(600000);
