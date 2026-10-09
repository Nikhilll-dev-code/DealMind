import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { initDatabase } from './db/database.js';
import { initHindsight } from './services/hindsightAdapter.js';
import { router as apiRouter } from './routes/api.js';
import { customerRouter } from './routes/customerApi.js';
import { governanceRouter } from './routes/governanceApi.js';

const app = express();

app.use(cors());
app.use(express.json());

// Initialize SQLite database & seed data
initDatabase();

// Attempt Hindsight initialization
initHindsight().then(res => {
  console.log('Hindsight init result:', res);
}).catch(err => {
  console.warn('Hindsight init warning:', err.message);
});

// API routes
app.use('/api', apiRouter);
app.use('/api', customerRouter);
app.use('/api', governanceRouter);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'DealMind API Server',
    version: '1.0.0',
    documentation: '/api/health'
  });
});

app.listen(config.port, () => {
  console.log(`==================================================`);
  console.log(` DealMind API Server running on port ${config.port}`);
  console.log(` Health check: http://localhost:${config.port}/api/health`);
  console.log(`==================================================`);
});
