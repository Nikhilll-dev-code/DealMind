import express from 'express';
import { db } from '../db/database.js';
import { requireAuth, requirePermission, PERMISSIONS } from '../middleware/authMiddleware.js';
import { getGuardrails, saveGuardrails } from '../services/guardrailEngine.js';
import { validateDataset, importDataset, listDatasetImports } from '../services/datasetEngine.js';
import { registerUser } from '../services/authService.js';

export const governanceRouter = express.Router();

// ── COMPANY USER MANAGEMENT (spec §6) ───────────────────────────────

// GET /api/users — list tenant users (no credentials)
governanceRouter.get('/users', requireAuth, requirePermission(PERMISSIONS.USERS_MANAGE), (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, tenant_id, email, display_name, role, status, created_at
      FROM users WHERE tenant_id = ? ORDER BY created_at ASC
    `).all(req.user.tenantId);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'USERS_LIST_ERROR' });
  }
});

// POST /api/users — create an internal user (admin only, controlled)
governanceRouter.post('/users', requireAuth, requirePermission(PERMISSIONS.USERS_MANAGE), async (req, res) => {
  try {
    const { email, password, displayName, role } = req.body || {};
    const normalizedRole = String(role || '').toUpperCase();
    // Two-Role spec §3/§91: only SALES REPRESENTATIVE and ADMIN are supported.
    if (!['ADMIN', 'SALESPERSON'].includes(normalizedRole)) {
      return res.status(400).json({ error: 'Role must be SALESPERSON (Sales Representative) or ADMIN.', code: 'VALIDATION_ERROR' });
    }
    const result = await registerUser({
      email, password, displayName, role: normalizedRole, tenantId: req.user.tenantId
    });
    res.status(201).json({ user: result.user });
  } catch (err) {
    res.status(400).json({ error: err.message, code: 'USER_CREATE_ERROR' });
  }
});

// PATCH /api/users/:id/status — enable/disable a user
governanceRouter.patch('/users/:id/status', requireAuth, requirePermission(PERMISSIONS.USERS_MANAGE), (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['ACTIVE', 'DISABLED'].includes(String(status).toUpperCase())) {
      return res.status(400).json({ error: 'Status must be ACTIVE or DISABLED.', code: 'VALIDATION_ERROR' });
    }
    if (req.params.id === req.user.userId) {
      return res.status(400).json({ error: 'You cannot change your own account status.', code: 'SELF_ACTION_BLOCKED' });
    }
    const info = db.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ? AND tenant_id = ?')
      .run(String(status).toUpperCase(), new Date().toISOString(), req.params.id, req.user.tenantId);
    if (info.changes === 0) return res.status(404).json({ error: 'User not found.', code: 'NOT_FOUND' });
    const user = db.prepare('SELECT id, tenant_id, email, display_name, role, status, created_at FROM users WHERE id = ?').get(req.params.id);
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ error: err.message, code: 'USER_STATUS_ERROR' });
  }
});

// ── COMPANY GUARDRAILS (spec §6, §9) ────────────────────────────────

// GET /api/guardrails
governanceRouter.get('/guardrails', requireAuth, requirePermission(PERMISSIONS.GUARDRAILS_VIEW), (req, res) => {
  try {
    res.json(getGuardrails(req.user.tenantId));
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'GUARDRAILS_READ_ERROR' });
  }
});

// PUT /api/guardrails
governanceRouter.put('/guardrails', requireAuth, requirePermission(PERMISSIONS.GUARDRAILS_MANAGE), (req, res) => {
  try {
    const updated = saveGuardrails(req.user.tenantId, req.body || {}, req.user.displayName || req.user.userId);
    res.json({ success: true, guardrails: updated });
  } catch (err) {
    res.status(400).json({ error: err.message, code: 'GUARDRAILS_UPDATE_ERROR' });
  }
});

// ── DATASET INTELLIGENCE (spec §7) ──────────────────────────────────

// POST /api/dataset/validate — validate + preview WITHOUT importing
governanceRouter.post('/dataset/validate', requireAuth, requirePermission(PERMISSIONS.DATASET_MANAGE), (req, res) => {
  try {
    const { content, format = 'json' } = req.body || {};
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Dataset content is required.', code: 'VALIDATION_ERROR' });
    }
    const report = validateDataset(content, format);
    // Strip the full record list from the response payload size
    const { records, ...safe } = report;
    res.json(safe);
  } catch (err) {
    res.status(400).json({ error: err.message, code: 'DATASET_VALIDATE_ERROR' });
  }
});

// POST /api/dataset/import — validate then import only valid rows
governanceRouter.post('/dataset/import', requireAuth, requirePermission(PERMISSIONS.DATASET_MANAGE), (req, res) => {
  try {
    const { content, format = 'auto', filename = 'dataset', replaceExisting = true } = req.body || {};
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Dataset content is required.', code: 'VALIDATION_ERROR' });
    }
    const result = importDataset({
      content,
      format,
      filename,
      tenantId: req.user.tenantId,
      importedBy: req.user.displayName || req.user.userId,
      replaceExisting: replaceExisting !== false
    });
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message, code: 'DATASET_IMPORT_ERROR' });
  }
});

// GET /api/dataset/imports — import history
governanceRouter.get('/dataset/imports', requireAuth, requirePermission(PERMISSIONS.DATASET_VIEW), (req, res) => {
  try {
    res.json(listDatasetImports(req.user.tenantId));
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'DATASET_HISTORY_ERROR' });
  }
});
