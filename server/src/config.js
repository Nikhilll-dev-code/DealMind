import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory or parent directory if available
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  port: process.env.PORT || 5000,
  hindsightBaseUrl: process.env.HINDSIGHT_BASE_URL || 'https://api.hindsight.vectorize.io',
  hindsightApiKey: process.env.HINDSIGHT_API_KEY || '',
  hindsightBankId: process.env.HINDSIGHT_BANK_ID || 'dealmind',
  groqApiKey: process.env.GROQ_API_KEY || '',
  sqlitePath: process.env.SQLITE_PATH || path.join(__dirname, '../data/dealmind.sqlite')
};
