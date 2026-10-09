import express from 'express';
import { db, normalizeCustomerId } from '../db/database.js';
import { requireAuth, requirePermission, PERMISSIONS } from '../middleware/authMiddleware.js';
import { analyzeNegotiation, analyzeCounteroffer } from '../services/agentOrchestrator.js';
import { checkGuardrails, getGuardrails } from '../services/guardrailEngine.js';
import { calculateDealEconomics } from '../services/economicsEngine.js';
import { retainNegotiationMemory } from '../services/hindsightAdapter.js';
import { recordAgreementTransaction } from '../services/agreementService.js';

export const customerRouter = express.Router();

// Every route here is customer-scoped and requires authentication.
customerRouter.use(requireAuth);
customerRouter.use(requirePermission(PERMISSIONS.DEALS_VIEW));

/** Fetch a deal only if it belongs to the authenticated customer (spec §17). */
function getOwnedDeal(dealId, user) {
  return db.prepare(`
    SELECT * FROM negotiations
    WHERE (deal_id = ? OR CAST(id AS TEXT) = ?) AND tenant_id = ? AND customer_user_id = ?
  `).get(dealId, dealId, user.tenantId, user.userId);
}

// GET /api/customer/overview
customerRouter.get('/customer/overview', (req, res) => {
  try {
    const { tenantId, userId } = req.user;
    const active = db.prepare(`
      SELECT * FROM negotiations
      WHERE tenant_id = ? AND customer_user_id = ? AND status IN ('ACTIVE', 'ESCALATED')
      ORDER BY created_at DESC
    `).all(tenantId, userId);

    const agreements = db.prepare(`
      SELECT * FROM negotiations
      WHERE tenant_id = ? AND customer_user_id = ? AND (status = 'AGREEMENT' OR outcome = 'WON')
      ORDER BY created_at DESC LIMIT 10
    `).all(tenantId, userId);

    const won = agreements.length;
    const totalClosed = db.prepare(`
      SELECT COUNT(*) AS c FROM negotiations
      WHERE tenant_id = ? AND customer_user_id = ? AND outcome IN ('WON', 'LOST')
    `).get(tenantId, userId).c;

    res.json({
      activeNegotiations: active,
      agreements,
      metrics: {
        activeCount: active.length,
        agreementsCount: won,
        winRate: totalClosed > 0 ? Math.round((won / totalClosed) * 100) : 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'CUSTOMER_OVERVIEW_ERROR' });
  }
});

// GET /api/customer/negotiations
customerRouter.get('/customer/negotiations', (req, res) => {
  try {
    const deals = db.prepare(`
      SELECT * FROM negotiations
      WHERE tenant_id = ? AND customer_user_id = ?
      ORDER BY created_at DESC LIMIT 100
    `).all(req.user.tenantId, req.user.userId);
    res.json(deals);
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'CUSTOMER_LIST_ERROR' });
  }
});

// GET /api/customer/negotiations/:id — return the deal for the workspace
customerRouter.get('/customer/negotiations/:id', (req, res) => {
  try {
    const deal = getOwnedDeal(req.params.id, req.user);
    if (!deal) return res.status(404).json({ error: 'Negotiation not found for this customer.', code: 'NOT_FOUND' });
    res.json(deal);
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'CUSTOMER_DEAL_ERROR' });
  }
});

// GET /api/customer/agreements
customerRouter.get('/customer/agreements', (req, res) => {
  try {
    const deals = db.prepare(`
      SELECT * FROM negotiations
      WHERE tenant_id = ? AND customer_user_id = ? AND (status = 'AGREEMENT' OR outcome = 'WON')
      ORDER BY created_at DESC LIMIT 100
    `).all(req.user.tenantId, req.user.userId);
    res.json(deals);
  } catch (err) {
    res.status(500).json({ error: err.message, code: 'CUSTOMER_AGREEMENTS_ERROR' });
  }
});

// POST /api/customer/negotiations — start a negotiation
customerRouter.post('/customer/negotiations', requirePermission(PERMISSIONS.DEALS_CREATE), async (req, res) => {
  try {
    const {
      product,
      dealValue,
      requestedDiscountPercent,
      contractYears,
      objection,
      competitorPressure,
      segment,
      industry,
      customer
    } = req.body || {};

    const tenantId = req.user.tenantId;
    const buyerName = customer || req.user.displayName || 'Customer';
    const value = Number(dealValue) || 100000;
    const requestedDiscount = Number(requestedDiscountPercent) || 0;
    const years = Number(contractYears) || 1;

    // Deterministic company guardrail evaluation BEFORE any AI reasoning (spec §9)
    const guardrailCheck = checkGuardrails(
      { requestedDiscountPercent: requestedDiscount, proposedDiscountPercent: requestedDiscount, contractYears: years, includeSupport: false },
      tenantId
    );

    const dealId = `CUST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const customerId = normalizeCustomerId(buyerName);
    const now = new Date().toISOString();

    // Hard breach: refuse + escalate, never call the LLM to "offer" beyond limits
    if (guardrailCheck.mustEscalate) {
      db.prepare(`
        INSERT INTO negotiations (
          tenant_id, deal_id, customer, customer_id, segment, industry, date, objection,
          initial_offer, counter_offer, requested_discount_percent, strategy,
          concession_percent, competitor_pressure, contract_years, outcome, outcome_reason,
          customer_user_id, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, 'ESCALATED', ?)
      `).run(
        tenantId, dealId, buyerName, customerId, segment || 'enterprise', industry || 'technology',
        now.slice(0, 10), objection || 'Requested discount exceeds company limits',
        value, value, requestedDiscount, 'Escalated for company review',
        0, competitorPressure ? 1 : 0, years,
        guardrailCheck.escalationMessage, req.user.userId, now
      );
      const deal = db.prepare('SELECT * FROM negotiations WHERE deal_id = ? AND tenant_id = ?').get(dealId, tenantId);
      return res.status(202).json({
        deal,
        escalated: true,
        guardrails: guardrailCheck,
        message: guardrailCheck.escalationMessage
      });
    }

    const sessionId = `SES-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const analysis = await analyzeNegotiation({
      dealId,
      customer: buyerName,
      segment: segment || 'enterprise',
      industry: industry || 'technology',
      dealValue: value,
      requestedDiscountPercent: requestedDiscount,
      competitorPressure: Boolean(competitorPressure),
      contractYears: years,
      objection: objection || 'Price is too high',
      product: product || null,
      tenantId,
      salesperson: 'DealMind'
    }, { sessionId, tenantId });

    // Derive the enforceable proposed discount from the deterministic economics
    const proposedDiscount = analysis?.economics?.proposedDiscountPercent
      ?? Math.max(1, Math.round(requestedDiscount * 0.4));
    const proposedConcession = calculateDealEconomics({
      dealValue: value,
      requestedDiscountPercent: requestedDiscount,
      proposedDiscountPercent: proposedDiscount,
      contractYears: years
    });

    db.prepare(`
      INSERT INTO negotiations (
        tenant_id, deal_id, customer, customer_id, segment, industry, date, objection,
        initial_offer, counter_offer, requested_discount_percent, strategy,
        concession_percent, competitor_pressure, contract_years, outcome, outcome_reason,
        customer_user_id, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, 'ACTIVE', ?)
    `).run(
      tenantId,
      dealId,
      buyerName,
      customerId,
      segment || 'enterprise',
      industry || 'technology',
      now.slice(0, 10),
      objection || 'Price is too high',
      value,
      proposedConcession.netRevenueProposed,
      requestedDiscount,
      analysis?.recommendation?.headline || 'Value-add concession package',
      proposedDiscount,
      competitorPressure ? 1 : 0,
      years,
      analysis?.recommendation?.primaryText || '',
      req.user.userId,
      now
    );

    const deal = db.prepare('SELECT * FROM negotiations WHERE deal_id = ? AND tenant_id = ?').get(dealId, tenantId);

    res.json({
      deal,
      analysis,
      guardrails: guardrailCheck,
      proposedDiscountPercent: proposedDiscount,
      sessionId
    });
  } catch (err) {
    console.error('Customer negotiation start error:', err);
    res.status(500).json({ error: err.message, code: 'CUSTOMER_NEGOTIATION_ERROR' });
  }
});

// GET /api/customer/negotiations/:id
customerRouter.get('/customer/negotiations/:id', (req, res) => {
  try {
    const deal = getOwnedDeal(req.params.id, req.user);
    if (!deal) return res.status(404).json({ error: 'Negotiation not found for this customer.', code: 'NOT_FOUND' });
    res.json(deal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customer/negotiations/:id/counteroffer
customerRouter.post('/customer/negotiations/:id/counteroffer', requirePermission(PERMISSIONS.DEALS_ANALYZE), async (req, res) => {
  try {
    const deal = getOwnedDeal(req.params.id, req.user);
    if (!deal) return res.status(404).json({ error: 'Negotiation not found for this customer.', code: 'NOT_FOUND' });
    if (deal.status === 'AGREEMENT') {
      return res.status(409).json({ error: 'This negotiation is already agreed.', code: 'ALREADY_AGREED' });
    }

    const { newCounterOffer, notes } = req.body || {};
    const counterAmount = Number(newCounterOffer);
    if (isNaN(counterAmount) || counterAmount <= 0) {
      return res.status(400).json({ error: 'A valid positive counteroffer amount is required.', code: 'VALIDATION_ERROR' });
    }
    if (counterAmount > deal.initial_offer) {
      return res.status(400).json({ error: 'Counteroffer cannot exceed the initial offer amount.', code: 'VALIDATION_ERROR' });
    }

    // Derive the discount the counteroffer implies and enforce the ceiling
    const impliedDiscount = ((deal.initial_offer - counterAmount) / deal.initial_offer) * 100;
    const guardrailCheck = checkGuardrails(
      { requestedDiscountPercent: impliedDiscount, proposedDiscountPercent: impliedDiscount, contractYears: deal.contract_years, includeSupport: false },
      req.user.tenantId
    );

    if (guardrailCheck.mustEscalate) {
      db.prepare("UPDATE negotiations SET status = 'ESCALATED', outcome_reason = ? WHERE id = ? AND tenant_id = ?")
        .run(guardrailCheck.escalationMessage, deal.id, req.user.tenantId);
      return res.status(202).json({
        escalated: true,
        guardrails: guardrailCheck,
        message: guardrailCheck.escalationMessage
      });
    }

    const counterResult = await analyzeCounteroffer(
      deal.deal_id,
      counterAmount,
      notes || '',
      {
        customer: deal.customer,
        segment: deal.segment,
        dealValue: deal.initial_offer,
        requestedDiscountPercent: impliedDiscount,
        tenantId: req.user.tenantId
      }
    );

    db.prepare(`
      UPDATE negotiations
      SET counter_offer = ?, concession_percent = ?, requested_discount_percent = ?, outcome_reason = ?
      WHERE id = ? AND tenant_id = ?
    `).run(
      counterAmount,
      Math.round(impliedDiscount * 100) / 100,
      deal.requested_discount_percent,
      counterResult.suggestedResponse || notes || 'Counteroffer evaluated.',
      deal.id,
      req.user.tenantId
    );

    const updated = db.prepare('SELECT * FROM negotiations WHERE id = ? AND tenant_id = ?').get(deal.id, req.user.tenantId);

    res.json({
      deal: updated,
      counterResult,
      guardrails: guardrailCheck,
      suggestedResponse: counterResult.suggestedResponse
    });
  } catch (err) {
    console.error('Customer counteroffer error:', err);
    res.status(500).json({ error: err.message, code: 'CUSTOMER_COUNTEROFFER_ERROR' });
  }
});

// POST /api/customer/negotiations/:id/accept — reach agreement
customerRouter.post('/customer/negotiations/:id/accept', requirePermission(PERMISSIONS.DEALS_RECORD_OUTCOME), async (req, res) => {
  try {
    const deal = getOwnedDeal(req.params.id, req.user);
    if (!deal) return res.status(404).json({ error: 'Negotiation not found for this customer.', code: 'NOT_FOUND' });
    if (deal.status === 'AGREEMENT') {
      return res.json({ success: true, alreadyAgreed: true, deal });
    }

    const chosenStrategy = req.body?.chosenStrategy || deal.strategy;
    const { updatedDeal, beforeStats, afterStats } = recordAgreementTransaction(deal, {
      outcome: 'WON',
      chosenStrategy,
      outcomeReason: req.body?.notes || `Agreement reached at $${Number(deal.counter_offer).toLocaleString()} (${deal.concession_percent}% concession).`,
      tenantId: req.user.tenantId,
      finalStatus: 'AGREEMENT'
    });

    // Retain as new organizational memory (spec §5, §8)
    const retainResult = await retainNegotiationMemory(updatedDeal, req.user.tenantId);

    res.json({
      success: true,
      deal: updatedDeal,
      beforeStats,
      afterStats,
      retainResult,
      learningUpdated: true
    });
  } catch (err) {
    console.error('Customer accept error:', err);
    res.status(500).json({ error: err.message, code: 'CUSTOMER_ACCEPT_ERROR' });
  }
});

// GET /api/customer/guardrails — read-only view of the ceilings the customer must respect
customerRouter.get('/customer/guardrails', (req, res) => {
  try {
    res.json(getGuardrails(req.user.tenantId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
