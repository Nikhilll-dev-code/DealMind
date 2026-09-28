import express from 'express';
import { db, normalizeCustomerId, resetDatabase } from '../db/database.js';
import { getHindsightStatus, retainNegotiationMemory, recallNegotiationMemories, reflectNegotiationSynthesis } from '../services/hindsightAdapter.js';
import { getGroqStatus } from '../services/groqAdapter.js';
import { evaluateConfidenceAndConflict } from '../services/confidenceEngine.js';
import { analyzeNegotiation, analyzeCounteroffer, simulateWhatIf } from '../services/agentOrchestrator.js';

export const router = express.Router();

// 1. GET /api/health
router.get('/health', (req, res) => {
  const hindsight = getHindsightStatus();
  const groq = getGroqStatus();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: { connected: true, path: db.name },
    hindsight,
    groq
  });
});

// 2. POST /api/negotiations/analyze
router.post('/negotiations/analyze', async (req, res) => {
  try {
    const analysis = await analyzeNegotiation(req.body);
    res.json(analysis);
  } catch (err) {
    console.error('Analyze error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. GET /api/negotiations
router.get('/negotiations', (req, res) => {
  try {
    const rows = db.prepare(`SELECT * FROM negotiations ORDER BY id DESC`).all();
    const formatted = rows.map(r => ({
      id: r.id,
      dealId: r.deal_id,
      customer: r.customer,
      customerId: r.customer_id,
      segment: r.segment,
      industry: r.industry,
      date: r.date,
      objection: r.objection,
      initialOffer: r.initial_offer,
      counterOffer: r.counter_offer,
      requestedDiscountPercent: r.requested_discount_percent,
      strategy: r.strategy,
      concessionPercent: r.concession_percent,
      competitorPressure: Boolean(r.competitor_pressure),
      contractYears: r.contract_years,
      outcome: r.outcome,
      outcomeReason: r.outcome_reason,
      chosenStrategy: r.chosen_strategy,
      createdAt: r.created_at
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. POST /api/negotiations (Create new negotiation)
router.post('/negotiations', (req, res) => {
  try {
    const {
      customer, segment, industry, objection, initialOffer, counterOffer,
      requestedDiscountPercent, strategy, concessionPercent, competitorPressure, contractYears
    } = req.body;

    const count = db.prepare('SELECT COUNT(*) as count FROM negotiations').get().count;
    const dealId = req.body.dealId || `DEAL-${String(count + 1).padStart(3, '0')}`;
    const customerId = normalizeCustomerId(customer || 'Acme Corp');
    const now = new Date().toISOString();
    const dateStr = req.body.date || now.split('T')[0];

    db.prepare(`
      INSERT INTO negotiations (
        deal_id, customer, customer_id, segment, industry, date, objection,
        initial_offer, counter_offer, requested_discount_percent, strategy,
        concession_percent, competitor_pressure, contract_years, outcome, outcome_reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', '', ?)
    `).run(
      dealId,
      customer || 'Acme Corp',
      customerId,
      segment || 'enterprise',
      industry || 'technology',
      dateStr,
      objection || 'Price is too high',
      Number(initialOffer) || 100000,
      Number(counterOffer) || 80000,
      Number(requestedDiscountPercent) || 20,
      strategy || '8% discount + premium support',
      Number(concessionPercent) || 8,
      competitorPressure ? 1 : 0,
      Number(contractYears) || 1,
      now
    );

    const created = db.prepare('SELECT * FROM negotiations WHERE deal_id = ?').get(dealId);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. GET /api/negotiations/:id
router.get('/negotiations/:id', (req, res) => {
  try {
    const dealId = req.params.id;
    const deal = db.prepare('SELECT * FROM negotiations WHERE deal_id = ? OR id = ?').get(dealId, dealId);
    if (!deal) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }
    res.json(deal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. POST /api/negotiations/:id/outcome (Record outcome & Retain in Hindsight & Update Learning Timeline)
router.post('/negotiations/:id/outcome', async (req, res) => {
  try {
    const dealId = req.params.id;
    const { outcome, chosenStrategy, outcomeReason, notes } = req.body;

    const deal = db.prepare('SELECT * FROM negotiations WHERE deal_id = ? OR id = ?').get(dealId, dealId);
    if (!deal) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    // Capture stats BEFORE recording
    const beforeStats = evaluateConfidenceAndConflict(deal.customer, deal.segment);

    // Update SQLite deal record
    const reasonText = outcomeReason || notes || `Outcome recorded as ${outcome} using ${chosenStrategy || deal.strategy}.`;
    db.prepare(`
      UPDATE negotiations
      SET outcome = ?, chosen_strategy = ?, outcome_reason = ?
      WHERE id = ?
    `).run(outcome || 'WON', chosenStrategy || deal.strategy, reasonText, deal.id);

    const updatedDeal = db.prepare('SELECT * FROM negotiations WHERE id = ?').get(deal.id);

    // Retain in Hindsight memory
    const retainResult = await retainNegotiationMemory(updatedDeal);

    // Capture stats AFTER recording
    const afterStats = evaluateConfidenceAndConflict(deal.customer, deal.segment);

    // Log to learning timeline
    const now = new Date().toISOString();
    const eventType = outcome === 'WON' ? 'DEAL_WON' : 'DEAL_LOST';
    const memoryText = `Retained [${updatedDeal.deal_id}] ${updatedDeal.customer}: ${outcome} with ${chosenStrategy || updatedDeal.strategy}.`;

    db.prepare(`
      INSERT INTO learning_timeline (
        deal_id, customer, date, event_type,
        before_wins, before_losses, before_confidence,
        after_wins, after_losses, after_confidence,
        memory_retained, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
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

    res.json({
      success: true,
      deal: updatedDeal,
      beforeStats,
      afterStats,
      retainResult,
      learningUpdated: true
    });
  } catch (err) {
    console.error('Outcome error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 7. GET /api/negotiations/:id/evidence
router.get('/negotiations/:id/evidence', async (req, res) => {
  try {
    const dealId = req.params.id;
    const deal = db.prepare('SELECT * FROM negotiations WHERE deal_id = ? OR id = ?').get(dealId, dealId);
    const customer = deal ? deal.customer : 'Acme Corp';
    const segment = deal ? deal.segment : 'enterprise';

    const recallResult = await recallNegotiationMemories(`${customer} ${segment} deal evidence`, {
      customerId: normalizeCustomerId(customer),
      segment
    });
    res.json(recallResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. POST /api/negotiations/:id/counteroffer
router.post('/negotiations/:id/counteroffer', async (req, res) => {
  try {
    const dealId = req.params.id;
    const { newCounterOffer, notes } = req.body;
    const result = await analyzeCounteroffer(dealId, newCounterOffer, notes);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. POST /api/negotiations/:id/simulate
router.post('/negotiations/:id/simulate', async (req, res) => {
  try {
    const dealId = req.params.id;
    const result = await simulateWhatIf(dealId, req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. GET /api/customers/:id/history
router.get('/customers/:id/history', async (req, res) => {
  try {
    const rawId = req.params.id;
    const normalizedId = normalizeCustomerId(rawId);

    const deals = db.prepare(`SELECT * FROM negotiations WHERE customer_id = ? OR customer LIKE ? ORDER BY date DESC`).all(normalizedId, `%${rawId}%`);

    const stats = evaluateConfidenceAndConflict(deals[0]?.customer || rawId, deals[0]?.segment || 'enterprise');

    const recallResult = await recallNegotiationMemories(`${rawId} history memories`, { customerId: normalizedId });

    res.json({
      customerId: normalizedId,
      customerName: deals[0]?.customer || rawId,
      totalDeals: deals.length,
      deals,
      stats,
      memories: recallResult.memories
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. GET /api/customers
router.get('/customers', (req, res) => {
  try {
    const customers = db.prepare(`
      SELECT customer_id, customer, segment, industry,
             COUNT(*) as total_deals,
             SUM(CASE WHEN outcome = 'WON' THEN 1 ELSE 0 END) as wins,
             SUM(CASE WHEN outcome = 'LOST' THEN 1 ELSE 0 END) as losses
      FROM negotiations
      GROUP BY customer_id
    `).all();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. POST /api/memory/retain
router.post('/memory/retain', async (req, res) => {
  try {
    const result = await retainNegotiationMemory(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 13. POST /api/memory/recall
router.post('/memory/recall', async (req, res) => {
  try {
    const { query, customer, segment } = req.body;
    const result = await recallNegotiationMemories(query || 'B2B sales negotiations', {
      customerId: customer ? normalizeCustomerId(customer) : undefined,
      segment
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 14. GET /api/memory/explorer
router.get('/memory/explorer', async (req, res) => {
  try {
    const search = req.query.q || '';
    const customer = req.query.customer || '';
    const outcome = req.query.outcome || '';

    let query = `SELECT * FROM negotiations WHERE 1=1`;
    const params = [];

    if (search) {
      query += ` AND (customer LIKE ? OR objection LIKE ? OR strategy LIKE ? OR outcome_reason LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (customer) {
      query += ` AND customer_id = ?`;
      params.push(normalizeCustomerId(customer));
    }
    if (outcome) {
      query += ` AND outcome = ?`;
      params.push(outcome);
    }

    query += ` ORDER BY date DESC`;

    const rows = db.prepare(query).all(...params);
    const hindsightStatus = getHindsightStatus();

    res.json({
      status: hindsightStatus,
      count: rows.length,
      memories: rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 15. GET /api/learning/timeline
router.get('/learning/timeline', (req, res) => {
  try {
    const events = db.prepare(`SELECT * FROM learning_timeline ORDER BY id DESC`).all();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 16. POST /api/demo/reset
router.post('/demo/reset', (req, res) => {
  try {
    resetDatabase();
    res.json({ success: true, message: 'Database reset to initial 12 seed episodes.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
