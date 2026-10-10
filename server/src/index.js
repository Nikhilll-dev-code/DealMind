import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { config } from './config.js';
import { initDatabase } from './db/database.js';
import { initHindsight } from './services/hindsightAdapter.js';
import { router as apiRouter } from './routes/api.js';
import { customerRouter } from './routes/customerApi.js';
import { governanceRouter } from './routes/governanceApi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.join(__dirname, '../../client/dist');

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

// Serve static frontend assets in production if client/dist exists
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // Root route fallback for API-only mode
  app.get('/', (req, res) => {
    res.json({
      name: 'DealMind API Server',
      version: '1.0.0',
      documentation: '/api/health'
    });
  });
}

app.listen(config.port, () => {
  console.log(`==================================================`);
  console.log(` DealMind API Server running on port ${config.port}`);
  console.log(` Health check: http://localhost:${config.port}/api/health`);
  console.log(`==================================================`);
});
