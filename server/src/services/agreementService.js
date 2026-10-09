import { db } from '../db/database.js';
import { evaluateConfidenceAndConflict } from './confidenceEngine.js';
import { formatNegotiationMemoryPayload } from './hindsightAdapter.js';

/**
 * Atomically record a negotiation outcome/agreement:
 *  1. update the deal
 *  2. enqueue a Hindsight RETAIN outbox event
 *  3. append to the learning timeline
 *
 * Mirrors the guarantees of the existing POST /negotiations/:id/outcome route so
 * the customer flow keeps the same memory-learning lifecycle (spec §5, §8).
 */
export function recordAgreementTransaction(deal, {
  outcome = 'WON',
  chosenStrategy = null,
  outcomeReason = null,
  tenantId = 'tenant_default',
  finalStatus = 'AGREEMENT'
} = {}) {
  const now = new Date().toISOString();
  const eventType = outcome === 'WON' ? 'DEAL_WON' : 'DEAL_LOST';
  const reasonText = outcomeReason || `Outcome recorded as ${outcome} using ${chosenStrategy || deal.strategy}.`;
  const memoryText = `Retained [${deal.deal_id}] ${deal.customer}: ${outcome} with ${chosenStrategy || deal.strategy}.`;

  const beforeStats = evaluateConfidenceAndConflict(deal.customer, deal.segment, { tenantId });

  let updatedDeal = null;
  let afterStats = null;

  db.transaction(() => {
    db.prepare(`
      UPDATE negotiations
      SET outcome = ?, chosen_strategy = ?, outcome_reason = ?, status = ?
      WHERE id = ? AND tenant_id = ?
    `).run(outcome, chosenStrategy || deal.strategy, reasonText, finalStatus, deal.id, tenantId);

    updatedDeal = db.prepare('SELECT * FROM negotiations WHERE id = ? AND tenant_id = ?').get(deal.id, tenantId);
    afterStats = evaluateConfidenceAndConflict(deal.customer, deal.segment, { tenantId });

    const rawPayload = {
      deal_id: updatedDeal.deal_id,
      tenant_id: tenantId,
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

    const formattedOutbox = formatNegotiationMemoryPayload(rawPayload, tenantId);

    db.prepare(`
      INSERT INTO hindsight_outbox (tenant_id, deal_id, action, payload_json, status, attempts, created_at, updated_at)
      VALUES (?, ?, 'RETAIN', ?, 'PENDING', 0, ?, ?)
    `).run(tenantId, updatedDeal.deal_id, JSON.stringify(formattedOutbox), now, now);

    db.prepare('DELETE FROM learning_timeline WHERE deal_id = ? AND tenant_id = ?').run(updatedDeal.deal_id, tenantId);
    db.prepare(`
      INSERT INTO learning_timeline (
        tenant_id, deal_id, customer, date, event_type,
        before_wins, before_losses, before_confidence,
        after_wins, after_losses, after_confidence,
        memory_retained, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tenantId,
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

  return { updatedDeal, beforeStats, afterStats, memoryText };
}
