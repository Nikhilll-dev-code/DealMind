import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dbDir = path.dirname(config.sqlitePath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(config.sqlitePath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

export function normalizeCustomerId(name) {
  if (!name) return 'unknown';
  const clean = name.toLowerCase().trim();
  if (clean.includes('acme')) return 'acme-corp';
  if (clean.includes('globex')) return 'globex-inc';
  if (clean.includes('novatech')) return 'novatech';
  if (clean.includes('brightworks')) return 'brightworks';
  if (clean.includes('orion')) return 'orion-systems';
  return clean.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export function initDatabase() {
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS negotiations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deal_id TEXT UNIQUE NOT NULL,
      customer TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      segment TEXT NOT NULL,
      industry TEXT NOT NULL,
      date TEXT NOT NULL,
      objection TEXT NOT NULL,
      initial_offer REAL NOT NULL,
      counter_offer REAL NOT NULL,
      requested_discount_percent REAL NOT NULL,
      strategy TEXT NOT NULL,
      concession_percent REAL NOT NULL,
      competitor_pressure INTEGER NOT NULL,
      contract_years INTEGER NOT NULL,
      outcome TEXT NOT NULL,
      outcome_reason TEXT NOT NULL,
      chosen_strategy TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS learning_timeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deal_id TEXT NOT NULL,
      customer TEXT NOT NULL,
      date TEXT NOT NULL,
      event_type TEXT NOT NULL,
      before_wins INTEGER NOT NULL,
      before_losses INTEGER NOT NULL,
      before_confidence TEXT NOT NULL,
      after_wins INTEGER NOT NULL,
      after_losses INTEGER NOT NULL,
      after_confidence TEXT NOT NULL,
      memory_retained TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );
  `);

  // Check seed status
  const count = db.prepare('SELECT COUNT(*) as count FROM negotiations').get().count;
  if (count === 0) {
    seedDatabase();
  }
}

export function seedDatabase() {
  const seedPath = path.join(__dirname, '../../seed/negotiations.json');
  if (!fs.existsSync(seedPath)) {
    console.warn('Seed file not found at', seedPath);
    return;
  }

  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO negotiations (
      deal_id, customer, customer_id, segment, industry, date, objection,
      initial_offer, counter_offer, requested_discount_percent, strategy,
      concession_percent, competitor_pressure, contract_years, outcome, outcome_reason, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const now = new Date().toISOString();
  db.transaction(() => {
    for (const item of seedData) {
      insertStmt.run(
        item.dealId,
        item.customer,
        item.customerId || normalizeCustomerId(item.customer),
        item.segment,
        item.industry,
        item.date,
        item.objection,
        item.initialOffer,
        item.counterOffer,
        item.requestedDiscountPercent ?? item.concessionPercent ?? 20,
        item.strategy,
        item.concessionPercent ?? 20,
        item.competitorPressure ? 1 : 0,
        item.contractYears,
        item.outcome,
        item.outcomeReason,
        now
      );
    }
  })();
  console.log(`Seeded ${seedData.length} negotiation episodes into SQLite.`);
}

export function resetDatabase() {
  db.exec(`DELETE FROM negotiations; DELETE FROM learning_timeline;`);
  seedDatabase();
}
