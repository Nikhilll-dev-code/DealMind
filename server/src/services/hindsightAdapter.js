import { HindsightClient } from '@vectorize-io/hindsight-client';
import { config } from '../config.js';
import { db } from '../db/database.js';

let hindsightClient = null;
let isInitialized = false;
let initError = null;

export function getHindsightClient() {
  if (!config.hindsightApiKey) {
    return null;
  }
  if (!hindsightClient) {
    try {
      hindsightClient = new HindsightClient({
        baseUrl: config.hindsightBaseUrl,
        apiKey: config.hindsightApiKey
      });
    } catch (err) {
      console.error('Failed to instantiate HindsightClient:', err);
      initError = err.message;
    }
  }
  return hindsightClient;
}

export async function initHindsight() {
  const client = getHindsightClient();
  if (!client) {
    console.log('Hindsight API key not provided; operating in local database mode.');
    isInitialized = false;
    return { status: 'disabled', message: 'No HINDSIGHT_API_KEY set. Using local database.' };
  }

  try {
    await client.createBank(config.hindsightBankId, {
      name: 'DealMind Negotiation Memory',
      mission: 'Store B2B negotiation episodes and provide evidence-grounded recall for active sales negotiations.'
    });
    isInitialized = true;
    initError = null;
    console.log(`Connected to Hindsight memory bank '${config.hindsightBankId}'.`);
    return { status: 'connected', bankId: config.hindsightBankId };
  } catch (err) {
    console.warn(`Hindsight bank init note (${err.message}). Bank may already exist or API key invalid.`);
    isInitialized = true; // Assume bank exists or API can still respond
    return { status: 'connected_with_warning', message: err.message };
  }
}

export function getHindsightStatus() {
  if (!config.hindsightApiKey) {
    return { available: false, status: 'disabled', reason: 'HINDSIGHT_API_KEY not configured' };
  }
  if (initError) {
    return { available: false, status: 'error', reason: initError };
  }
  return { available: isInitialized, status: isInitialized ? 'connected' : 'initializing', bankId: config.hindsightBankId };
}

export async function retainNegotiationMemory(deal) {
  const client = getHindsightClient();
  const textContent = `${deal.deal_id || deal.dealId} | ${deal.customer} | ${deal.segment} ${deal.industry} | Objection: ${deal.objection} | Initial Offer: $${deal.initial_offer || deal.initialOffer} | Counter Offer: $${deal.counter_offer || deal.counterOffer} | Strategy: ${deal.strategy} (${deal.concession_percent || deal.concessionPercent}% concession) | Competitor Pressure: ${deal.competitor_pressure || deal.competitorPressure ? 'YES' : 'NO'} | Contract: ${deal.contract_years || deal.contractYears} yrs | Outcome: ${deal.outcome} | Reason: ${deal.outcome_reason || deal.outcomeReason}`;

  const documentId = deal.deal_id || deal.dealId;
  const metadata = {
    deal_id: documentId,
    customer: deal.customer,
    customer_id: deal.customer_id || deal.customerId,
    segment: deal.segment,
    industry: deal.industry,
    date: deal.date,
    objection: deal.objection,
    concession_percent: deal.concession_percent || deal.concessionPercent,
    strategy: deal.strategy,
    competitor_pressure: !!(deal.competitor_pressure || deal.competitorPressure),
    contract_years: deal.contract_years || deal.contractYears,
    outcome: deal.outcome,
    outcome_reason: deal.outcome_reason || deal.outcomeReason
  };

  if (!client) {
    return {
      success: true,
      mode: 'sqlite_local',
      memoryId: documentId,
      content: textContent
    };
  }

  try {
    const result = await client.retain(config.hindsightBankId, textContent, {
      documentId,
      metadata,
      tags: [deal.customer_id || deal.customerId, deal.segment, deal.outcome]
    });
    return {
      success: true,
      mode: 'hindsight_api',
      memoryId: documentId,
      raw: result
    };
  } catch (err) {
    console.error('Hindsight retain failed:', err.message);
    return {
      success: false,
      mode: 'sqlite_fallback',
      error: err.message,
      memoryId: documentId
    };
  }
}

export async function recallNegotiationMemories(queryStr, filterObj = {}) {
  const client = getHindsightClient();

  if (client) {
    try {
      const response = await client.recall(config.hindsightBankId, queryStr, {
        budget: 'mid',
        tags: filterObj.tags || undefined
      });

      if (response && (response.results || response.memories || response.items)) {
        const rawItems = response.results || response.memories || response.items || [];
        const formatted = rawItems.map(item => ({
          dealId: item.metadata?.deal_id || item.document_id || item.id || 'MEM-HS',
          customer: item.metadata?.customer || 'Customer',
          customerId: item.metadata?.customer_id || 'customer',
          segment: item.metadata?.segment || 'enterprise',
          industry: item.metadata?.industry || 'tech',
          objection: item.metadata?.objection || item.content || '',
          strategy: item.metadata?.strategy || '',
          concessionPercent: item.metadata?.concession_percent ?? 0,
          outcome: item.metadata?.outcome || 'UNKNOWN',
          outcomeReason: item.metadata?.outcome_reason || item.text || item.content || '',
          relevanceScore: item.score || 0.85,
          source: 'hindsight_api'
        }));
        return { source: 'hindsight_api', memories: formatted, raw: response };
      }
    } catch (err) {
      console.warn('Hindsight recall failed, using SQLite evidence:', err.message);
    }
  }

  // SQLite fallback retrieval
  const customerId = filterObj.customerId;
  const segment = filterObj.segment;

  let rows = [];
  if (customerId) {
    rows = db.prepare(`SELECT * FROM negotiations WHERE customer_id = ? ORDER BY date DESC`).all(customerId);
  }
  if (rows.length === 0 && segment) {
    rows = db.prepare(`SELECT * FROM negotiations WHERE segment = ? ORDER BY date DESC`).all(segment);
  }
  if (rows.length === 0) {
    rows = db.prepare(`SELECT * FROM negotiations ORDER BY date DESC LIMIT 8`).all();
  }

  const memories = rows.map(r => ({
    dealId: r.deal_id,
    customer: r.customer,
    customerId: r.customer_id,
    segment: r.segment,
    industry: r.industry,
    objection: r.objection,
    strategy: r.strategy,
    concessionPercent: r.concession_percent,
    outcome: r.outcome,
    outcomeReason: r.outcome_reason,
    competitorPressure: Boolean(r.competitor_pressure),
    contractYears: r.contract_years,
    date: r.date,
    relevanceScore: r.customer_id === customerId ? 0.95 : 0.75,
    source: client ? 'hindsight_fallback' : 'sqlite_local'
  }));

  return {
    source: client ? 'hindsight_fallback' : 'sqlite_local',
    memories
  };
}

export async function reflectNegotiationSynthesis(queryStr) {
  const client = getHindsightClient();
  if (!client) {
    return { source: 'sqlite_local', synthesis: 'Reflection unavailable without Hindsight API key.' };
  }
  try {
    const res = await client.reflect(config.hindsightBankId, queryStr, { budget: 'low' });
    return { source: 'hindsight_api', synthesis: res.text || res.answer || JSON.stringify(res) };
  } catch (err) {
    return { source: 'error', synthesis: err.message };
  }
}
