import express from 'express';
import { db, normalizeCustomerId, resetTenantDemoData } from '../db/database.js';
import { analyzeNegotiation, simulateWhatIf, analyzeCounteroffer } from '../services/agentOrchestrator.js';
import { detectNegotiationPatterns } from '../services/patternEngine.js';
import { 
  retainNegotiationMemory, 
  recallNegotiationMemories, 
  reflectNegotiationSynthesis, 
  getHindsightStatus, 
  getHindsightCloudExplorerData, 
  syncHindsightOutbox,
  formatNegotiationMemoryPayload,
  retryOutboxEvent,
  getHindsightTelemetry
} from '../services/hindsightAdapter.js';
import { getGroqStatus } from '../services/groqAdapter.js';
import { evaluateConfidenceAndConflict, buildEvidenceConflictMatrix } from '../services/confidenceEngine.js';
import { calculateDealEconomics, buildStrategyLabEconomics, buildGiveGetRecommendations } from '../services/economicsEngine.js';
import { createRateLimiter, getRedisStatus, tokenBudgetManager } from '../services/redisAdapter.js';
import { listPendingApprovals, processApprovalDecision, getApprovalByDealId } from '../services/approvalEngine.js';
import { checkpointManager } from '../services/checkpointManager.js';
import { registerUser, authenticateUser, getUserById } from '../services/authService.js';
import { requireAuth, requireRole, requireTenantAccess, optionalAuth, requirePermission, PERMISSIONS, hasPermission } from '../middleware/authMiddleware.js';

export const router = express.Router();

// Active SSE client subscriptions map: sessionId -> Set of res objects
const sseSubscribers = new Map();
// SSE Event replay buffer: sessionId -> Array of { seqId, type, data, timestamp }
const sseEventBuffers = new Map();
const MAX_BUFFER_EVENTS = 50;

// Apply Rate Limiters
const generalLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 120, prefix: 'general' });
const aiAnalysisLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 30, prefix: 'ai_analysis' });
const authLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 20, prefix: 'auth' });

router.use(generalLimiter);

// ── 1. AUTHENTICATION ROUTES ────────────────────────────────────────

// POST /api/auth/register
router.post('/auth/register', authLimiter, async (req, res) => {
  try {
    const { email, password, displayName, tenantId } = req.body;
    // Role is intentionally excluded from the public registration body.
    // All self-registered users start as SALESPERSON to prevent privilege escalation.
    // ADMIN/MANAGER roles must be assigned by a tenant ADMIN via user management.
    const result = await registerUser({ email, password, displayName, role: 'SALESPERSON', tenantId });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message, code: 'REGISTRATION_FAILED' });
  }
});


// POST /api/auth/login
router.post('/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authenticateUser({ email, password });
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message, code: 'AUTH_FAILED' });
  }
});

// POST /api/auth/logout
router.post('/auth/logout', (req, res) => {
  // Stateless JWT logout (client discards token)
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/auth/me', requireAuth, (req, res) => {
  const user = getUserById(req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user });
});

// ── 2. SYSTEM HEALTH & METRICS ──────────────────────────────────────

// GET /api/health
router.get('/health', optionalAuth, (req, res) => {
  const isPrivileged = req.user && hasPermission(req.user.role, PERMISSIONS.INFRASTRUCTURE_VIEW);

  if (!isPrivileged) {
    // Sanitized basic status for unauthenticated or Salesperson sessions
    return res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        connected: true
      }
    });
  }

  // Full administrative telemetry for MANAGER / ADMIN roles only
  const hindsightStatus = getHindsightStatus();
  const groqStatus = getGroqStatus();
  const redisStatus = getRedisStatus();
  const tokenMetrics = tokenBudgetManager.getBudgetMetrics();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: {
      connected: true,
      path: './data/dealmind.sqlite'
    },
    hindsight: hindsightStatus,
    groq: groqStatus,
    redis: redisStatus,
    tokenMetrics
  });
});

// ── 3. SSE EXECUTION TRACE STREAMING ────────────────────────────────

// GET /api/negotiations/stream/:sessionId
router.get('/negotiations/stream/:sessionId', optionalAuth, (req, res) => {
  const { sessionId } = req.params;
  const lastEventId = Number(req.headers['last-event-id'] || req.query.lastEventId || 0);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  if (!sseSubscribers.has(sessionId)) {
    sseSubscribers.set(sessionId, new Set());
  }
  sseSubscribers.get(sessionId).add(res);

  // Send initial connection event
  res.write(`id: 0\nevent: connected\ndata: ${JSON.stringify({ sessionId, status: 'listening', reconnected: lastEventId > 0 })}\n\n`);

  // Replay buffered events missed during disconnection
  const buffer = sseEventBuffers.get(sessionId) || [];
  for (const evt of buffer) {
    if (evt.seqId > lastEventId) {
      res.write(`id: ${evt.seqId}\nevent: ${evt.type}\ndata: ${JSON.stringify(evt)}\n\n`);
    }
  }

  req.on('close', () => {
    const subs = sseSubscribers.get(sessionId);
    if (subs) {
      subs.delete(res);
      if (subs.size === 0) sseSubscribers.delete(sessionId);
    }
  });
});

let globalEventSeq = 1;
function broadcastSSE(sessionId, eventObj) {
  const seqId = globalEventSeq++;
  const fullEvent = { seqId, ...eventObj };

  // Circular buffer for session recovery
  if (!sseEventBuffers.has(sessionId)) {
    sseEventBuffers.set(sessionId, []);
  }
  const buffer = sseEventBuffers.get(sessionId);
  buffer.push(fullEvent);
  if (buffer.length > MAX_BUFFER_EVENTS) {
    buffer.shift();
  }

  const subs = sseSubscribers.get(sessionId);
  if (subs && subs.size > 0) {
    const payload = `id: ${seqId}\nevent: ${eventObj.type}\ndata: ${JSON.stringify(fullEvent)}\n\n`;
    for (const clientRes of subs) {
      clientRes.write(payload);
    }
  }
}

// ── 4. NEGOTIATION WORKSPACE & ANALYSIS ─────────────────────────────

// POST /api/negotiations/analyze
router.post('/negotiations/analyze', aiAnalysisLimiter, optionalAuth, async (req, res) => {
  try {
    const {
      customer,
      segment,
      industry,
      dealValue,
      requestedDiscountPercent,
      competitorPressure,
      contractYears,
      objection,
      sessionId,
      tenantId
    } = req.body;

    if (!customer) {
      return res.status(400).json({ error: 'Customer name is required', code: 'VALIDATION_ERROR' });
    }

    const effectiveTenantId = req.user?.tenantId || tenantId || 'tenant_default';
    const activeSessionId = sessionId || `SES-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const analysis = await analyzeNegotiation(
      {
        customer,
        segment: segment || 'enterprise',
        industry: industry || 'technology',
        dealValue: Number(dealValue) || 100000,
        requestedDiscountPercent: Number(requestedDiscountPercent) || 20,
        competitorPressure: Boolean(competitorPressure),
        contractYears: Number(contractYears) || 1,
        objection: objection || 'Price is too high',
        tenantId: effectiveTenantId,
        salesperson: req.user?.displayName || 'sales_rep'
      },
      {
        sessionId: activeSessionId,
        tenantId: effectiveTenantId,
        onEvent: (evt) => broadcastSSE(activeSessionId, evt)
      }
    );

    res.json(analysis);
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: err.message, code: 'ANALYSIS_ERROR' });
  }
});

// POST /api/negotiations/:id/simulate
router.post('/negotiations/:id/simulate', requireAuth, requirePermission(PERMISSIONS.DEALS_SIMULATE), async (req, res) => {
  try {
    const dealId = req.params.id;
    const tenantId = req.user.tenantId;

    const deal = db.prepare('SELECT * FROM negotiations WHERE (deal_id = ? OR id = ?) AND tenant_id = ?')
      .get(dealId, dealId, tenantId);

    if (!deal) {
      return res.status(404).json({ error: `Negotiation ${dealId} not found in your tenant.`, code: 'NOT_FOUND' });
    }

    const { discountPercent, contractYears, includeSupport, competitorPressure, dealValue } = req.body;

    if (discountPercent !== undefined && discountPercent !== null) {
      const disc = Number(discountPercent);
      if (isNaN(disc) || disc < 0 || disc > 100) {
        return res.status(400).json({ error: 'Valid discount percentage between 0 and 100 is required', code: 'VALIDATION_ERROR' });
      }
    }

    const simulationResult = await simulateWhatIf(deal.deal_id, {
      customer: deal.customer,
      segment: deal.segment,
      dealValue: Number(dealValue) || deal.initial_offer || 100000,
      requestedDiscountPercent: deal.requested_discount_percent || 20,
      discountPercent: discountPercent !== undefined ? Number(discountPercent) : (deal.concession_percent || 10),
      contractYears: Number(contractYears) || deal.contract_years || 1,
      includeSupport: includeSupport !== undefined ? Boolean(includeSupport) : true,
      competitorPressure: competitorPressure !== undefined ? Boolean(competitorPressure) : Boolean(deal.competitor_pressure),
      tenantId
    });

    res.json(simulationResult);
  } catch (err) {
    console.error('Simulation error:', err);
    res.status(500).json({ error: err.message, code: 'SIMULATION_ERROR' });
  }
});

// POST /api/negotiations/:id/counteroffer
router.post('/negotiations/:id/counteroffer', requireAuth, requirePermission(PERMISSIONS.DEALS_ANALYZE), async (req, res) => {
  try {
    const dealId = req.params.id;
    const tenantId = req.user.tenantId;

    const deal = db.prepare('SELECT * FROM negotiations WHERE (deal_id = ? OR id = ?) AND tenant_id = ?')
      .get(dealId, dealId, tenantId);

    if (!deal) {
      return res.status(404).json({ error: `Negotiation ${dealId} not found in your tenant.`, code: 'NOT_FOUND' });
    }

    const { newCounterOffer, notes } = req.body;
    const counterAmount = Number(newCounterOffer);

    if (isNaN(counterAmount) || counterAmount <= 0) {
      return res.status(400).json({ error: 'A valid positive counteroffer amount is required.', code: 'VALIDATION_ERROR' });
    }

    if (deal.initial_offer && counterAmount > deal.initial_offer) {
      return res.status(400).json({ error: 'Counteroffer cannot exceed the initial deal offer amount.', code: 'VALIDATION_ERROR' });
    }

    const counterResult = await analyzeCounteroffer(
      deal.deal_id,
      counterAmount,
      notes || '',
      {
        customer: deal.customer,
        segment: deal.segment,
        dealValue: deal.initial_offer,
        requestedDiscountPercent: deal.requested_discount_percent,
        tenantId
      }
    );

    res.json(counterResult);
  } catch (err) {
    console.error('Counteroffer error:', err);
    res.status(500).json({ error: err.message, code: 'COUNTEROFFER_ERROR' });
  }
});

// POST /api/negotiations/:id/give-get (Feature A: Give-Get Negotiation Intelligence)
router.post('/negotiations/:id/give-get', requireAuth, requirePermission(PERMISSIONS.DEALS_ANALYZE), async (req, res) => {
  try {
    const dealId = req.params.id;
    const tenantId = req.user.tenantId;

    const deal = db.prepare('SELECT * FROM negotiations WHERE (deal_id = ? OR id = ?) AND tenant_id = ?')
      .get(dealId, dealId, tenantId);

    if (!deal) {
      return res.status(404).json({ error: `Negotiation ${dealId} not found in your tenant.`, code: 'NOT_FOUND' });
    }

    const requestedDiscount = req.body.requestedDiscountPercent !== undefined 
      ? Number(req.body.requestedDiscountPercent) 
      : deal.requested_discount_percent;

    if (isNaN(requestedDiscount) || requestedDiscount < 0 || requestedDiscount > 100) {
      return res.status(400).json({ error: 'Valid discount percentage between 0 and 100 is required.', code: 'VALIDATION_ERROR' });
    }

    // Recall memories scoped strictly to tenant
    const memoriesResult = await recallNegotiationMemories(`${deal.customer} ${deal.segment} concession trade-off`, {
      customerId: deal.customer_id,
      segment: deal.segment,
      tenantId
    });

    const giveGet = buildGiveGetRecommendations({
      dealId: deal.deal_id,
      customer: deal.customer,
      segment: deal.segment,
      dealValue: deal.initial_offer,
      requestedDiscountPercent: requestedDiscount
    }, memoriesResult.memories || []);

    res.json(giveGet);
  } catch (err) {
    console.error('Give-Get error:', err);
    res.status(500).json({ error: err.message, code: 'GIVE_GET_ERROR' });
  }
});

// GET /api/customers/:customerId/history
router.get('/customers/:customerId/history', requireAuth, (req, res) => {
  try {
    const rawCustomerId = req.params.customerId;
    const tenantId = req.user.tenantId;
    const normalizedId = normalizeCustomerId(rawCustomerId);

    const deals = db.prepare(`
      SELECT * FROM negotiations 
      WHERE (customer_id = ? OR lower(customer) = ?) AND tenant_id = ?
      ORDER BY date DESC
    `).all(normalizedId, rawCustomerId.toLowerCase(), tenantId);

    const customerName = deals.length > 0 ? deals[0].customer : rawCustomerId;
    const segment = deals.length > 0 ? deals[0].segment : 'enterprise';

    const stats = evaluateConfidenceAndConflict(customerName, segment, { tenantId });
    const patterns = detectNegotiationPatterns(customerName, segment, { tenantId });

    res.json({
      customerId: normalizedId,
      customerName,
      segment,
      deals,
      stats,
      patterns
    });
  } catch (err) {
    console.error('Customer history error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/negotiations/session/:sessionId/checkpoint
router.get('/negotiations/session/:sessionId/checkpoint', optionalAuth, (req, res) => {
  const tenantId = req.user?.tenantId || req.query.tenantId || null;
  const checkpoint = checkpointManager.getCheckpoint(req.params.sessionId, tenantId);
  if (!checkpoint) {
    return res.status(404).json({ error: 'Checkpoint not found', code: 'NOT_FOUND' });
  }
  res.json(checkpoint);
});

// GET /api/negotiations
router.get('/negotiations', optionalAuth, (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.query.tenantId || 'tenant_default';
    const deals = db.prepare(`
      SELECT * FROM negotiations 
      WHERE tenant_id = ?
      ORDER BY date DESC 
      LIMIT 50
    `).all(tenantId);
    res.json(deals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/negotiations
router.post('/negotiations', optionalAuth, (req, res) => {
  try {
    const {
      dealId,
      customer,
      segment,
      industry,
      date,
      objection,
      initialOffer,
      counterOffer,
      requestedDiscountPercent,
      strategy,
      concessionPercent,
      competitorPressure,
      contractYears,
      outcome,
      outcomeReason,
      tenantId
    } = req.body;

    const finalDealId = dealId || `DEAL-${Date.now()}`;
    const effectiveTenantId = req.user?.tenantId || tenantId || 'tenant_default';
    const customerId = normalizeCustomerId(customer);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT OR REPLACE INTO negotiations (
        tenant_id, deal_id, customer, customer_id, segment, industry, date, objection,
        initial_offer, counter_offer, requested_discount_percent, strategy,
        concession_percent, competitor_pressure, contract_years, outcome, outcome_reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      effectiveTenantId,
      finalDealId,
      customer || 'Unknown Customer',
      customerId,
      segment || 'enterprise',
      industry || 'technology',
      date || now.slice(0, 10),
      objection || 'Price',
      Number(initialOffer) || 100000,
      Number(counterOffer) || 90000,
      Number(requestedDiscountPercent) || 20,
      strategy || 'Standard strategy',
      Number(concessionPercent) || 10,
      competitorPressure ? 1 : 0,
      Number(contractYears) || 1,
      outcome || 'PENDING',
      outcomeReason || '',
      now
    );

    const saved = db.prepare('SELECT * FROM negotiations WHERE deal_id = ? AND tenant_id = ?').get(finalDealId, effectiveTenantId);
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/negotiations/:id/outcome (Atomic Transactional Outcome & Outbox Recording)
router.post('/negotiations/:id/outcome', optionalAuth, async (req, res) => {
  try {
    const dealId = req.params.id;
    const { outcome, chosenStrategy, outcomeReason, notes, idempotencyKey } = req.body;
    const effectiveTenantId = req.user?.tenantId || req.body.tenantId || 'tenant_default';

    // Idempotency check via agent_operations table
    if (idempotencyKey) {
      const existingOp = db.prepare('SELECT * FROM agent_operations WHERE idempotency_key = ? AND tenant_id = ?')
        .get(idempotencyKey, effectiveTenantId);
      if (existingOp && existingOp.status === 'COMPLETED') {
        return res.json(JSON.parse(existingOp.result_json));
      }
    }

    const deal = db.prepare('SELECT * FROM negotiations WHERE (deal_id = ? OR id = ?) AND tenant_id = ?')
      .get(dealId, dealId, effectiveTenantId);
    if (!deal) {
      return res.status(404).json({ error: 'Negotiation not found for this tenant', code: 'NOT_FOUND' });
    }

    const beforeStats = evaluateConfidenceAndConflict(deal.customer, deal.segment, { tenantId: effectiveTenantId });
    const reasonText = outcomeReason || notes || `Outcome recorded as ${outcome} using ${chosenStrategy || deal.strategy}.`;
    const now = new Date().toISOString();
    const eventType = outcome === 'WON' ? 'DEAL_WON' : 'DEAL_LOST';
    const memoryText = `Retained [${deal.deal_id}] ${deal.customer}: ${outcome} with ${chosenStrategy || deal.strategy}.`;

    // Atomic SQLite Transaction: Update deal + Record Outbox Event + Update Learning Timeline
    let updatedDeal = null;
    let afterStats = null;

    db.transaction(() => {
      // 1. Update negotiation record
      db.prepare(`
        UPDATE negotiations
        SET outcome = ?, chosen_strategy = ?, outcome_reason = ?
        WHERE id = ? AND tenant_id = ?
      `).run(outcome || 'WON', chosenStrategy || deal.strategy, reasonText, deal.id, effectiveTenantId);

      updatedDeal = db.prepare('SELECT * FROM negotiations WHERE id = ? AND tenant_id = ?').get(deal.id, effectiveTenantId);
      afterStats = evaluateConfidenceAndConflict(deal.customer, deal.segment, { tenantId: effectiveTenantId });

      // 2. Insert into transactional outbox as PENDING with guaranteed non-empty content
      const rawPayload = {
        deal_id: updatedDeal.deal_id,
        tenant_id: effectiveTenantId,
        customer: updatedDeal.customer,
        customer_id: updatedDeal.customer_id,
        segment: updatedDeal.segment,
        industry: updatedDeal.industry,
        date: updatedDeal.date,
        objection: updatedDeal.objection,
        initial_offer: updatedDeal.initial_offer,
        counter_offer: updatedDeal.counter_offer,
        strategy: updatedDeal.strategy,
        concession_percent: updatedDeal.concession_percent,
        competitor_pressure: updatedDeal.competitor_pressure,
        contract_years: updatedDeal.contract_years,
        outcome: updatedDeal.outcome,
        outcome_reason: updatedDeal.outcome_reason
      };

      const formattedOutbox = formatNegotiationMemoryPayload(rawPayload, effectiveTenantId);

      db.prepare(`
        INSERT INTO hindsight_outbox (tenant_id, deal_id, action, payload_json, status, attempts, created_at, updated_at)
        VALUES (?, ?, 'RETAIN', ?, 'PENDING', 0, ?, ?)
      `).run(
        effectiveTenantId,
        updatedDeal.deal_id,
        JSON.stringify(formattedOutbox),
        now,
        now
      );

      // 3. Update learning timeline
      db.prepare('DELETE FROM learning_timeline WHERE deal_id = ? AND tenant_id = ?').run(updatedDeal.deal_id, effectiveTenantId);
      db.prepare(`
        INSERT INTO learning_timeline (
          tenant_id, deal_id, customer, date, event_type,
          before_wins, before_losses, before_confidence,
          after_wins, after_losses, after_confidence,
          memory_retained, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        effectiveTenantId,
        updatedDeal.deal_id,
        updatedDeal.customer,
        updatedDeal.date,
        eventType,
        beforeStats.sampleWins,
        beforeStats.sampleLosses,
        beforeStats.finalConfidence,
        afterStats.sampleWins,
        afterStats.sampleLosses,
        afterStats.finalConfidence,
        memoryText,
        now
      );
    })();

    // Attempt delivery to Hindsight Cloud (and update outbox status)
    const retainResult = await retainNegotiationMemory(updatedDeal, effectiveTenantId);

    const responsePayload = {
      success: true,
      deal: updatedDeal,
      beforeStats,
      afterStats,
      retainResult,
      transactionCommitted: true,
      learningUpdated: true
    };

    // Save operation idempotency result if key provided
    if (idempotencyKey) {
      db.prepare(`
        INSERT OR REPLACE INTO agent_operations (tenant_id, idempotency_key, operation_type, status, payload_json, result_json, created_at, updated_at)
        VALUES (?, ?, 'OUTCOME_RECORDING', 'COMPLETED', ?, ?, ?, ?)
      `).run(
        effectiveTenantId,
        idempotencyKey,
        JSON.stringify({ dealId, outcome, chosenStrategy }),
        JSON.stringify(responsePayload),
        now,
        now
      );
    }

    res.json(responsePayload);
  } catch (err) {
    console.error('Outcome error:', err);
    res.status(500).json({ error: err.message, code: 'OUTCOME_RECORD_ERROR' });
  }
});

// GET /api/learning/timeline
router.get('/learning/timeline', requireAuth, (req, res) => {
  try {
    const tenantId = req.user.tenantId; // trusted JWT only
    const events = db.prepare(`SELECT * FROM learning_timeline WHERE tenant_id = ? ORDER BY timestamp DESC LIMIT 30`).all(tenantId);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 5. HUMAN-IN-THE-LOOP APPROVAL GOVERNANCE ────────────────────────

// GET /api/approvals
router.get('/approvals', requireAuth, (req, res) => {
  try {
    const tenantId = req.user.tenantId; // trusted JWT only
    const approvals = listPendingApprovals(tenantId); // role param removed from approvalEngine
    res.json(approvals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/approvals/:id/decision
router.post('/approvals/:id/decision', requireAuth, requirePermission(PERMISSIONS.APPROVALS_DECIDE), (req, res) => {
  try {
    const approvalId = req.params.id;
    const { status, decisionNotes, modifiedDiscount, idempotencyKey } = req.body;

    // Identity sourced exclusively from verified JWT — no header fallbacks
    const callerRole = req.user.role;
    const callerId = req.user.displayName || req.user.userId;
    const tenantId = req.user.tenantId;

    const updated = processApprovalDecision(approvalId, {
      status,
      managerName: callerId,
      displayName: req.user.displayName,
      userId: req.user.userId,
      email: req.user.email,
      role: callerRole,
      tenantId,
      decisionNotes,
      modifiedDiscount,
      idempotencyKey
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message, code: 'APPROVAL_DECISION_ERROR' });
  }
});

// ── 6. MEMORY EXPLORER & OUTBOX DRAIN ────────────────────────────────

// GET /api/memory/explorer (Tenant-Scoped Unified Cloud + SQLite Explorer)
router.get('/memory/explorer', requireAuth, async (req, res) => {
  try {
    const tenantId = req.user.tenantId; // trusted JWT only
    const search = req.query.search ? req.query.search.trim() : '';

    let structuredDeals = [];
    if (search) {
      const searchPattern = `%${search}%`;
      structuredDeals = db.prepare(`
        SELECT * FROM negotiations 
        WHERE tenant_id = ? 
          AND (customer LIKE ? OR customer_id LIKE ? OR deal_id LIKE ? OR strategy LIKE ? OR objection LIKE ?)
        ORDER BY date DESC LIMIT 50
      `).all(tenantId, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    } else {
      structuredDeals = db.prepare(`SELECT * FROM negotiations WHERE tenant_id = ? ORDER BY date DESC LIMIT 50`).all(tenantId);
    }

    const cloudExplorer = await getHindsightCloudExplorerData(tenantId);

    // Filter cloud memories by search term if provided
    let cloudMemories = cloudExplorer.memories || [];
    if (search) {
      const sLower = search.toLowerCase();
      cloudMemories = cloudMemories.filter(m => 
        (m.customer && m.customer.toLowerCase().includes(sLower)) ||
        (m.text && m.text.toLowerCase().includes(sLower)) ||
        (m.documentId && m.documentId.toLowerCase().includes(sLower)) ||
        (m.strategy && m.strategy.toLowerCase().includes(sLower))
      );
    }

    res.json({
      tenantId,
      structuredDeals,
      cloudMemories,
      cloudStatus: {
        available: cloudExplorer.available,
        bankId: cloudExplorer.bankId,
        totalCount: cloudMemories.length,
        error: cloudExplorer.error
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/hindsight/outbox/sync
router.post('/hindsight/outbox/sync', requireAuth, requirePermission(PERMISSIONS.INFRASTRUCTURE_MANAGE_OUTBOX), async (req, res) => {
  try {
    const tenantId = req.user.tenantId; // trusted JWT only
    const retryFailed = Boolean(req.body?.retryFailed || req.body?.includeFailed);
    const syncResult = await syncHindsightOutbox(tenantId, { retryFailed });
    res.json({ success: true, ...syncResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/hindsight/outbox/:id/retry
router.post('/hindsight/outbox/:id/retry', requireAuth, requirePermission(PERMISSIONS.INFRASTRUCTURE_MANAGE_OUTBOX), async (req, res) => {
  try {
    const tenantId = req.user.tenantId; // trusted JWT only
    const retryResult = await retryOutboxEvent(req.params.id, tenantId);
    if (!retryResult.success && retryResult.message === 'Hindsight client not configured') {
      return res.status(503).json(retryResult);
    }
    res.json(retryResult);
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ error: err.message });
  }
});

// GET /api/hindsight/telemetry (Application-Level Operational Telemetry)
router.get('/hindsight/telemetry', requireAuth, requirePermission(PERMISSIONS.INFRASTRUCTURE_VIEW), (req, res) => {
  try {
    const telemetry = getHindsightTelemetry();
    res.json(telemetry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/hindsight/outbox
router.get('/hindsight/outbox', requireAuth, requirePermission(PERMISSIONS.INFRASTRUCTURE_VIEW), (req, res) => {
  try {
    const tenantId = req.user.tenantId; // trusted JWT only
    const outbox = db.prepare(`SELECT * FROM hindsight_outbox WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50`).all(tenantId);
    res.json(outbox);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 7. DEMO / TENANT RESET ───────────────────────────────────────────

// POST /api/demo/reset — Resets caller's tenant demo data back to canonical seed
router.post('/demo/reset', optionalAuth, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || 'tenant_default'; // tenant-scoped
    const result = resetTenantDemoData(tenantId);
    res.json({
      success: true,
      ...result,
      resetBy: req.user?.userId || 'demo_user',
      tenantId,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'DEMO_RESET_ERROR' });
  }
});
