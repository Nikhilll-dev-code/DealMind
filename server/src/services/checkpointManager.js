import { db } from '../db/database.js';

export const checkpointManager = {
  saveCheckpoint(sessionId, data = {}) {
    const now = new Date().toISOString();
    const tenantId = data.tenantId || data.tenant_id || 'tenant_default';
    const completedTools = JSON.stringify(data.completedTools || []);
    const pendingTools = JSON.stringify(data.pendingTools || []);
    const completedOperations = JSON.stringify(data.completedOperations || []);
    const trace = JSON.stringify(data.trace || []);
    const stateJson = JSON.stringify(data.state || {});

    db.prepare(`
      INSERT OR REPLACE INTO agent_checkpoints (
        tenant_id, session_id, deal_id, customer, status, completed_tools, pending_tools,
        completed_operations, trace, model_used, state_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tenantId,
      sessionId,
      data.dealId || null,
      data.customer || 'Unknown',
      data.status || 'IN_PROGRESS',
      completedTools,
      pendingTools,
      completedOperations,
      trace,
      data.modelUsed || null,
      stateJson,
      now,
      now
    );

    return { sessionId, tenantId, status: data.status, savedAt: now };
  },

  getCheckpoint(sessionId, tenantId = null) {
    let row = null;
    if (tenantId) {
      row = db.prepare('SELECT * FROM agent_checkpoints WHERE session_id = ? AND tenant_id = ?').get(sessionId, tenantId);
    } else {
      row = db.prepare('SELECT * FROM agent_checkpoints WHERE session_id = ?').get(sessionId);
    }

    if (!row) return null;
    return {
      sessionId: row.session_id,
      tenantId: row.tenant_id,
      dealId: row.deal_id,
      customer: row.customer,
      status: row.status,
      completedTools: JSON.parse(row.completed_tools || '[]'),
      pendingTools: JSON.parse(row.pending_tools || '[]'),
      completedOperations: JSON.parse(row.completed_operations || '[]'),
      trace: JSON.parse(row.trace || '[]'),
      modelUsed: row.model_used,
      state: JSON.parse(row.state_json || '{}'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  },

  deleteCheckpoint(sessionId, tenantId = null) {
    if (tenantId) {
      db.prepare('DELETE FROM agent_checkpoints WHERE session_id = ? AND tenant_id = ?').run(sessionId, tenantId);
    } else {
      db.prepare('DELETE FROM agent_checkpoints WHERE session_id = ?').run(sessionId);
    }
  }
};
