import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists with safe fallback if configured path is not writable
let activeSqlitePath = config.sqlitePath;
try {
  const dbDir = path.dirname(activeSqlitePath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
} catch (err) {
  console.warn(`[Database] Cannot write to ${config.sqlitePath} (${err.message}). Falling back to local data directory.`);
  activeSqlitePath = path.join(__dirname, '../../data/dealmind.sqlite');
  const fallbackDir = path.dirname(activeSqlitePath);
  if (!fs.existsSync(fallbackDir)) {
    fs.mkdirSync(fallbackDir, { recursive: true });
  }
}

let dbInstance;
try {
  dbInstance = new Database(activeSqlitePath);
} catch (err) {
  console.warn(`[Database] Failed opening ${activeSqlitePath} (${err.message}). Falling back to internal data directory.`);
  activeSqlitePath = path.join(__dirname, '../data/dealmind.sqlite');
  const fallbackDir = path.dirname(activeSqlitePath);
  if (!fs.existsSync(fallbackDir)) {
    fs.mkdirSync(fallbackDir, { recursive: true });
  }
  dbInstance = new Database(activeSqlitePath);
}

export const db = dbInstance;

// Enable WAL mode for high concurrency
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
  // 1. Create core tables with tenant support
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL, -- ADMIN, MANAGER, SALESPERSON
      status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, DISABLED
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS negotiations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL DEFAULT 'tenant_default',
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
      customer_user_id TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guardrails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL DEFAULT 'tenant_default',
      max_discount_percent REAL NOT NULL DEFAULT 25,
      manager_approval_threshold REAL NOT NULL DEFAULT 15,
      min_contract_years INTEGER NOT NULL DEFAULT 1,
      max_contract_years INTEGER NOT NULL DEFAULT 5,
      require_support_bundle_above REAL NOT NULL DEFAULT 10,
      escalation_message TEXT NOT NULL DEFAULT 'This request exceeds approved negotiation limits and has been escalated to a company manager for review.',
      updated_at TEXT NOT NULL,
      updated_by TEXT,
      UNIQUE(tenant_id)
    );

    CREATE TABLE IF NOT EXISTS dataset_imports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL DEFAULT 'tenant_default',
      import_id TEXT UNIQUE NOT NULL,
      filename TEXT NOT NULL,
      format TEXT NOT NULL DEFAULT 'json',
      total_rows INTEGER NOT NULL DEFAULT 0,
      valid_rows INTEGER NOT NULL DEFAULT 0,
      invalid_rows INTEGER NOT NULL DEFAULT 0,
      duplicate_rows INTEGER NOT NULL DEFAULT 0,
      imported_rows INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'VALIDATED',
      errors_json TEXT NOT NULL DEFAULT '[]',
      warnings_json TEXT NOT NULL DEFAULT '[]',
      imported_by TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS learning_timeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL DEFAULT 'tenant_default',
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

    CREATE TABLE IF NOT EXISTS negotiation_approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL DEFAULT 'tenant_default',
      approval_id TEXT UNIQUE NOT NULL,
      deal_id TEXT NOT NULL,
      customer TEXT NOT NULL,
      requested_discount REAL NOT NULL,
      threshold_discount REAL NOT NULL,
      proposed_strategy TEXT NOT NULL,
      status TEXT NOT NULL, -- PENDING, APPROVED, REJECTED, MODIFIED, EXPIRED
      requested_by TEXT,
      manager_name TEXT,
      reason TEXT,
      decision_notes TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_checkpoints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL DEFAULT 'tenant_default',
      session_id TEXT UNIQUE NOT NULL,
      deal_id TEXT,
      customer TEXT NOT NULL,
      status TEXT NOT NULL, -- IN_PROGRESS, COMPLETED, FAILED, PAUSED_APPROVAL
      completed_tools TEXT NOT NULL, -- JSON array
      pending_tools TEXT NOT NULL, -- JSON array
      completed_operations TEXT NOT NULL DEFAULT '[]', -- JSON array of operation IDs
      trace TEXT NOT NULL, -- JSON array
      model_used TEXT,
      state_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hindsight_outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL DEFAULT 'tenant_default',
      deal_id TEXT NOT NULL,
      action TEXT NOT NULL, -- RETAIN
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL, -- PENDING, COMPLETED, FAILED
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 5,
      next_retry_at TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_operations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL DEFAULT 'tenant_default',
      session_id TEXT,
      idempotency_key TEXT UNIQUE NOT NULL,
      operation_type TEXT NOT NULL, -- OUTCOME_RECORDING, APPROVAL_CREATE, APPROVAL_DECISION, MEMORY_RETENTION
      status TEXT NOT NULL, -- PENDING, COMPLETED, FAILED
      payload_json TEXT,
      result_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 2. Dynamic schema migrations for existing databases (adds tenant_id and missing columns if not present)
  runMigrations();

  // 3. Create indexes for tenant-scoped query performance AFTER columns are guaranteed to exist
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_negotiations_tenant ON negotiations(tenant_id, customer_id);
    CREATE INDEX IF NOT EXISTS idx_negotiations_owner ON negotiations(tenant_id, customer_user_id, status);
    CREATE INDEX IF NOT EXISTS idx_dataset_imports_tenant ON dataset_imports(tenant_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_approvals_tenant ON negotiation_approvals(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_checkpoints_tenant ON agent_checkpoints(tenant_id, session_id);
    CREATE INDEX IF NOT EXISTS idx_outbox_tenant ON hindsight_outbox(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_timeline_tenant ON learning_timeline(tenant_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_operations_tenant ON agent_operations(tenant_id, idempotency_key);
  `);

  // 4. Ensure default tenants and seed users exist
  seedTenantsAndUsers();

  // 5. Check seed status for negotiations
  const count = db.prepare('SELECT COUNT(*) as count FROM negotiations').get().count;
  if (count === 0) {
    seedDatabase();
  }
}


function runMigrations() {
  const tablesWithTenant = [
    'negotiations',
    'learning_timeline',
    'negotiation_approvals',
    'agent_checkpoints',
    'hindsight_outbox',
    'agent_operations'
  ];

  for (const table of tablesWithTenant) {
    try {
      const tableInfo = db.prepare(`PRAGMA table_info(${table})`).all();
      const hasTenant = tableInfo.some(col => col.name === 'tenant_id');
      if (!hasTenant) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'tenant_default'`);
      }
    } catch (e) {}
  }

  // Ensure requested_by exists in negotiation_approvals
  try {
    const tableInfo = db.prepare("PRAGMA table_info(negotiation_approvals)").all();
    const hasRequestedBy = tableInfo.some(col => col.name === 'requested_by');
    if (!hasRequestedBy) {
      db.exec("ALTER TABLE negotiation_approvals ADD COLUMN requested_by TEXT");
    }
  } catch (e) {}

  // Ensure completed_operations exists in agent_checkpoints
  try {
    const tableInfo = db.prepare("PRAGMA table_info(agent_checkpoints)").all();
    const hasCompletedOps = tableInfo.some(col => col.name === 'completed_operations');
    if (!hasCompletedOps) {
      db.exec("ALTER TABLE agent_checkpoints ADD COLUMN completed_operations TEXT NOT NULL DEFAULT '[]'");
    }
  } catch (e) {}

  // Ensure customer ownership + lifecycle status exist on negotiations (spec §5, §17)
  try {
    const tableInfo = db.prepare("PRAGMA table_info(negotiations)").all();
    if (!tableInfo.some(col => col.name === 'customer_user_id')) {
      db.exec("ALTER TABLE negotiations ADD COLUMN customer_user_id TEXT");
    }
    if (!tableInfo.some(col => col.name === 'status')) {
      db.exec("ALTER TABLE negotiations ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE'");
    }
  } catch (e) {}

  // Ensure max_attempts, next_retry_at, last_error exist in hindsight_outbox
  try {
    const tableInfo = db.prepare("PRAGMA table_info(hindsight_outbox)").all();
    if (!tableInfo.some(col => col.name === 'max_attempts')) {
      db.exec("ALTER TABLE hindsight_outbox ADD COLUMN max_attempts INTEGER NOT NULL DEFAULT 5");
    }
    if (!tableInfo.some(col => col.name === 'next_retry_at')) {
      db.exec("ALTER TABLE hindsight_outbox ADD COLUMN next_retry_at TEXT");
    }
    if (!tableInfo.some(col => col.name === 'last_error')) {
      db.exec("ALTER TABLE hindsight_outbox ADD COLUMN last_error TEXT");
    }
    if (!tableInfo.some(col => col.name === 'action')) {
      db.exec("ALTER TABLE hindsight_outbox ADD COLUMN action TEXT NOT NULL DEFAULT 'RETAIN'");
    }
  } catch (e) {}
}


export function seedTenantsAndUsers() {
  const now = new Date().toISOString();

  // Seed default tenant
  db.prepare(`
    INSERT OR IGNORE INTO tenants (id, name, slug, created_at)
    VALUES ('tenant_default', 'Acme Global Org', 'acme-global', ?)
  `).run(now);

  // Seed secondary tenant for isolation tests
  db.prepare(`
    INSERT OR IGNORE INTO tenants (id, name, slug, created_at)
    VALUES ('tenant_secondary', 'Beta Corp', 'beta-corp', ?)
  `).run(now);

  // Seed users with pre-computed bcrypt hashes (password: Password123!)
  // bcrypt hash for "Password123!" with salt rounds 10
  // Two-Role spec §2/§3: only SALES REPRESENTATIVE and ADMIN are seeded/usable.
  // The legacy MANAGER seed row is retained but downgraded to SALESPERSON so old
  // local databases do not break, while no Manager account remains usable.
  const defaultPasswordHash = bcrypt.hashSync('Password123!', 10);

  const usersToSeed = [
    {
      id: 'USR-ADMIN-01',
      tenant_id: 'tenant_default',
      email: 'admin@dealmind.local',
      display_name: 'System Admin',
      role: 'ADMIN'
    },
    {
      id: 'USR-MGR-01',
      tenant_id: 'tenant_default',
      email: 'manager@dealmind.local',
      display_name: 'Sarah Account Exec',
      role: 'SALESPERSON'
    },
    {
      id: 'USR-SALES-01',
      tenant_id: 'tenant_default',
      email: 'sales@dealmind.local',
      display_name: 'Alex Sales Rep',
      role: 'SALESPERSON'
    },
    {
      id: 'USR-CUST-01',
      tenant_id: 'tenant_default',
      email: 'customer@dealmind.local',
      display_name: 'Jordan Buyer',
      role: 'CUSTOMER'
    },
    {
      id: 'USR-TENANT2-ADMIN',
      tenant_id: 'tenant_secondary',
      email: 'tenant2_admin@dealmind.local',
      display_name: 'Beta Org Admin',
      role: 'ADMIN'
    }
  ];

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, tenant_id, email, password_hash, display_name, role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
  `);

  for (const u of usersToSeed) {
    insertUser.run(u.id, u.tenant_id, u.email, defaultPasswordHash, u.display_name, u.role, now, now);
  }
}

export function seedDatabase(tenantId = 'tenant_default') {
  const seedPath = path.join(__dirname, '../../seed/negotiations.json');
  if (!fs.existsSync(seedPath)) {
    console.warn('Seed file not found at', seedPath);
    return;
  }

  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const checkStmt = db.prepare('SELECT deal_id FROM negotiations WHERE tenant_id = ? AND deal_id = ?');
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO negotiations (
      tenant_id, deal_id, customer, customer_id, segment, industry, date, objection,
      initial_offer, counter_offer, requested_discount_percent, strategy,
      concession_percent, competitor_pressure, contract_years, outcome, outcome_reason, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const now = new Date().toISOString();
  let newlyInserted = 0;
  let alreadyPresent = 0;

  db.transaction(() => {
    for (const item of seedData) {
      const exists = checkStmt.get(tenantId, item.dealId);
      if (exists) {
        alreadyPresent++;
      } else {
        newlyInserted++;
      }
      insertStmt.run(
        tenantId,
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

    // Seed baseline learning timeline evolution milestones if timeline is empty
    const timelineCheck = db.prepare('SELECT COUNT(*) as count FROM learning_timeline WHERE tenant_id = ?').get(tenantId);
    if (!timelineCheck || timelineCheck.count === 0) {
      const insertTimeline = db.prepare(`
        INSERT INTO learning_timeline (
          tenant_id, deal_id, customer, date, event_type, before_wins, before_losses, before_confidence, after_wins, after_losses, after_confidence, memory_retained, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const baselineEvents = [
        {
          deal_id: 'DEAL-003',
          customer: 'Acme Corp',
          date: '2026-02-21',
          event_type: 'OUTCOME_RETAINED',
          before_wins: 0,
          before_losses: 2,
          before_confidence: 'LOW (0.35)',
          after_wins: 1,
          after_losses: 2,
          after_confidence: 'CALIBRATED_MEDIUM (0.58)',
          memory_retained: 'Retained [DEAL-003] Acme Corp: WON with 8% discount + premium support package. Replaced direct price drop.',
          timestamp: '2026-02-21 16:45:00'
        },
        {
          deal_id: 'DEAL-005',
          customer: 'Acme Corp',
          date: '2026-03-19',
          event_type: 'OUTCOME_RETAINED',
          before_wins: 1,
          before_losses: 3,
          before_confidence: 'CALIBRATED_MEDIUM (0.58)',
          after_wins: 2,
          after_losses: 3,
          after_confidence: 'HIGH (0.74)',
          memory_retained: 'Retained [DEAL-005] Acme Corp: WON with 2-year commitment and premium onboarding package.',
          timestamp: '2026-03-19 14:10:00'
        },
        {
          deal_id: 'DEAL-008',
          customer: 'Acme Corp',
          date: '2026-06-18',
          event_type: 'OUTCOME_RETAINED',
          before_wins: 4,
          before_losses: 3,
          before_confidence: 'HIGH (0.74)',
          after_wins: 5,
          after_losses: 3,
          after_confidence: 'HIGH_STATISTICAL (0.85)',
          memory_retained: 'Retained [DEAL-008] Acme Corp: WON with 3-year term & tier-1 support ($144,000 net). Solidified customer precedent.',
          timestamp: '2026-06-18 11:30:00'
        },
        {
          deal_id: 'DEAL-011',
          customer: 'BrightWorks',
          date: '2026-04-27',
          event_type: 'OUTCOME_RETAINED',
          before_wins: 6,
          before_losses: 4,
          before_confidence: 'CALIBRATED_MEDIUM (0.64)',
          after_wins: 7,
          after_losses: 4,
          after_confidence: 'HIGH (0.79)',
          memory_retained: 'Retained [DEAL-011] BrightWorks: WON with 7% discount + implementation support. Expanded mid-market precedent.',
          timestamp: '2026-04-27 15:20:00'
        }
      ];

      for (const evt of baselineEvents) {
        insertTimeline.run(
          tenantId,
          evt.deal_id,
          evt.customer,
          evt.date,
          evt.event_type,
          evt.before_wins,
          evt.before_losses,
          evt.before_confidence,
          evt.after_wins,
          evt.after_losses,
          evt.after_confidence,
          evt.memory_retained,
          evt.timestamp
        );
      }
    }
  })();
  if (newlyInserted > 0) {
    console.log(`[DB Seeder] Seeded ${newlyInserted} new negotiation episodes (${alreadyPresent} existing) into SQLite for ${tenantId}.`);
  }
}

/**
 * Safely reset only a specific tenant's demo negotiations back to canonical seed
 */
export function resetTenantDemoData(tenantId = 'tenant_default') {
  db.transaction(() => {
    db.prepare('DELETE FROM negotiations WHERE tenant_id = ?').run(tenantId);
    db.prepare('DELETE FROM learning_timeline WHERE tenant_id = ?').run(tenantId);
    db.prepare('DELETE FROM negotiation_approvals WHERE tenant_id = ?').run(tenantId);
    db.prepare('DELETE FROM agent_checkpoints WHERE tenant_id = ?').run(tenantId);
    db.prepare('DELETE FROM hindsight_outbox WHERE tenant_id = ?').run(tenantId);
    db.prepare('DELETE FROM agent_operations WHERE tenant_id = ?').run(tenantId);
    seedDatabase(tenantId);
  })();
  return { success: true, tenantId, message: `Reset tenant ${tenantId} demo negotiations to canonical seed dataset.` };
}

export function resetDatabase() {
  db.exec(`
    DELETE FROM negotiations;
    DELETE FROM learning_timeline;
    DELETE FROM negotiation_approvals;
    DELETE FROM agent_checkpoints;
    DELETE FROM hindsight_outbox;
    DELETE FROM agent_operations;
    DELETE FROM users;
    DELETE FROM tenants;
  `);
  seedTenantsAndUsers();
  seedDatabase();
}
