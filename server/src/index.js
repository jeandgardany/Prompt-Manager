import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import agentsRouter from './routes/agents.js';
import promptsRouter from './routes/prompts.js';
import testRouter from './routes/test.js';
import modelsRouter from './routes/models.js';
import dualRunResultsRouter from './routes/dualRunResults.js';
import judgeCriteriaRouter from './routes/judgeCriteria.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/agents', agentsRouter);
app.use('/api/prompts', promptsRouter);
app.use('/api/test', testRouter);
app.use('/api/models', modelsRouter);
app.use('/api/dual-runs', dualRunResultsRouter);
app.use('/api/judge-criteria', judgeCriteriaRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`\n🚀 Prompt Manager API running on http://localhost:${PORT}`);
  console.log(`   LM Studio: ${process.env.LM_STUDIO_URL}`);
  console.log(`   GLM API: ${process.env.GLM_API_URL}`);
  console.log('');
});

// Aumentar o timeout para 10 minutos (600000ms)
// A execução sequencial de modelos pesados no LM Studio precisa de bastante tempo
server.setTimeout(600000);
