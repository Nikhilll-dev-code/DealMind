import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory or parent directory if available
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dealmind-dev-jwt-secret-key-32-chars-min-2026',
  jwtExpiresIn: process.env.JWT_ACCESS_TOKEN_TTL || '8h',
  hindsightBaseUrl: process.env.HINDSIGHT_BASE_URL || 'https://api.hindsight.vectorize.io',
  hindsightApiKey: process.env.HINDSIGHT_API_KEY || '',
  hindsightBankId: process.env.HINDSIGHT_BANK_ID || 'dealmind',
  groqApiKey: process.env.GROQ_API_KEY || '',
  redisUrl: process.env.REDIS_URL || '',
  sqlitePath: process.env.SQLITE_PATH || path.join(__dirname, '../data/dealmind.sqlite'),
  managerApprovalThreshold: Number(process.env.MANAGER_APPROVAL_THRESHOLD) || 15, // Discounts > 15% require manager approval
  tokenBudgetGlobal: Number(process.env.TOKEN_BUDGET_GLOBAL) || 100000,
  tokenBudgetPerTenant: Number(process.env.TOKEN_BUDGET_PER_TENANT) || 25000,
  maxConcurrentTurns: Number(process.env.MAX_CONCURRENT_TURNS) || 2,
  defaultTenantId: 'tenant_default'
};
