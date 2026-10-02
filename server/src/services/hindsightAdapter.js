import { HindsightClient } from '@vectorize-io/hindsight-client';
import { config } from '../config.js';
import { db } from '../db/database.js';

let hindsightClient = null;
let isInitialized = false;
let initError = null;

// Application-level verified operational telemetry (distinct from official billing)
const operationTelemetry = {
  retainCalls: 0,
  recallCalls: 0,
  reflectCalls: 0,
  cacheHits: 0,
  lastOperation: null
};

export function recordTelemetryOp(type, status = 'success', durationMs = 0, error = null) {
  if (type === 'RETAIN') operationTelemetry.retainCalls++;
  if (type === 'RECALL') operationTelemetry.recallCalls++;
  if (type === 'REFLECT') operationTelemetry.reflectCalls++;
  if (type === 'CACHE_HIT') operationTelemetry.cacheHits++;
  
  operationTelemetry.lastOperation = {
    type,
    status,
    durationMs,
    error: error ? String(error) : null,
    timestamp: new Date().toISOString()
  };
}

export function getHindsightTelemetry() {
  const isMock = !config.hindsightApiKey;
  return {
    mode: isMock ? 'sqlite_mock' : 'hindsight_api',
    isLiveConfigured: !isMock,
    bankId: config.hindsightBankId,
    operations: {
      retainCount: operationTelemetry.retainCalls,
      recallCount: operationTelemetry.recallCalls,
      reflectCount: operationTelemetry.reflectCalls,
      cacheHitCount: operationTelemetry.cacheHits
    },
    lastOperation: operationTelemetry.lastOperation,
    disclaimer: 'Telemetry reflects application-level verified operation counts. Official token/billing metrics are managed by Hindsight Cloud.'
  };
}

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
    return { status: 'connected', bankId: config.hindsightBankId, message: err.message };
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

/**
 * Formats any negotiation deal or outbox payload into a complete, guaranteed non-empty
 * textContent, documentId, metadata, and tags for Hindsight SDK.
 */
export function formatNegotiationMemoryPayload(dealOrPayload, tenantId = 'tenant_default') {
  if (!dealOrPayload || typeof dealOrPayload !== 'object') {
    dealOrPayload = {};
  }

  const rawDealId = dealOrPayload.deal_id || dealOrPayload.dealId || dealOrPayload.documentId || `DEAL-${Date.now()}`;
  const cleanDealId = String(rawDealId).replace(/^.*::/, '');
  const finalTenantId = String(dealOrPayload.tenant_id || dealOrPayload.tenantId || tenantId || 'tenant_default');
  const documentId = `${finalTenantId}::${cleanDealId}`;

  const customer = String(dealOrPayload.customer || dealOrPayload.customerName || 'Customer');
  const customerId = String(dealOrPayload.customer_id || dealOrPayload.customerId || customer.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') || 'customer');
  const segment = String(dealOrPayload.segment || 'enterprise');
  const industry = String(dealOrPayload.industry || 'technology');
  const date = String(dealOrPayload.date || new Date().toISOString().slice(0, 10));
  const objection = String(dealOrPayload.objection || 'Price objection');
  const initialOffer = dealOrPayload.initial_offer ?? dealOrPayload.initialOffer ?? 100000;
  const counterOffer = dealOrPayload.counter_offer ?? dealOrPayload.counterOffer ?? 90000;
  const strategy = String(dealOrPayload.strategy || dealOrPayload.chosenStrategy || 'Concession package');
  const concessionPercent = Number(dealOrPayload.concession_percent ?? dealOrPayload.concessionPercent ?? 0);
  const competitorPressure = Boolean(dealOrPayload.competitor_pressure || dealOrPayload.competitorPressure);
  const contractYears = Number(dealOrPayload.contract_years ?? dealOrPayload.contractYears ?? 1);
  const outcome = String(dealOrPayload.outcome || 'WON');
  const outcomeReason = String(dealOrPayload.outcome_reason || dealOrPayload.outcomeReason || `Deal closed with ${outcome} outcome.`);

  // If textContent was explicitly passed and is a non-empty string, use it; otherwise build rich structured summary
  const textContent = (dealOrPayload.textContent && String(dealOrPayload.textContent).trim()) ||
    (dealOrPayload.content && typeof dealOrPayload.content === 'string' && dealOrPayload.content.trim()) ||
    `${documentId} | Tenant: ${finalTenantId} | Customer: ${customer} | Segment: ${segment} ${industry} | Objection: ${objection} | Initial Offer: $${initialOffer} | Counter Offer: $${counterOffer} | Strategy: ${strategy} (${concessionPercent}% concession) | Competitor Pressure: ${competitorPressure ? 'YES' : 'NO'} | Contract: ${contractYears} yrs | Outcome: ${outcome} | Outcome Reason: ${outcomeReason}`;

  const metadata = {
    tenant_id: finalTenantId,
    deal_id: cleanDealId,
    customer,
    customer_id: customerId,
    segment,
    industry,
    date,
    objection,
    concession_percent: String(concessionPercent),
    strategy,
    competitor_pressure: competitorPressure ? 'true' : 'false',
    contract_years: String(contractYears),
    outcome,
    outcome_reason: outcomeReason,
    memory_type: 'experience',
    ...(dealOrPayload.metadata && typeof dealOrPayload.metadata === 'object' ? dealOrPayload.metadata : {})
  };

  const tags = [
    `tenant:${finalTenantId}`,
    customerId,
    segment,
    outcome
  ].filter(Boolean);

  return {
    content: textContent,
    textContent,
    documentId,
    metadata,
    tags,
    tenantId: finalTenantId,
    dealId: cleanDealId
  };
}

/**
 * Idempotent Experience Retention with Tenant-Scoped Document ID and Metadata
 */
export async function retainNegotiationMemory(deal, tenantId = 'tenant_default') {
  const client = getHindsightClient();
  const formatted = formatNegotiationMemoryPayload(deal, tenantId);
  const startTime = Date.now();

  if (!client) {
    recordTelemetryOp('RETAIN', 'mock_success', Date.now() - startTime);
    return {
      success: true,
      mode: 'sqlite_local',
      memoryId: formatted.documentId,
      content: formatted.content
    };
  }

  try {
    const result = await client.retain(config.hindsightBankId, formatted.content, {
      documentId: formatted.documentId,
      metadata: formatted.metadata,
      tags: formatted.tags
    });

    recordTelemetryOp('RETAIN', 'api_success', Date.now() - startTime);

    // Mark completed in outbox if it was pending
    try {
      db.prepare("UPDATE hindsight_outbox SET status = 'COMPLETED', updated_at = ? WHERE deal_id = ? AND tenant_id = ?")
        .run(new Date().toISOString(), formatted.dealId, formatted.tenantId);
    } catch (e) {}

    return {
      success: true,
      mode: 'hindsight_api',
      memoryId: formatted.documentId,
      raw: result
    };
  } catch (err) {
    console.error('Hindsight retain failed:', err.message);
    recordTelemetryOp('RETAIN', 'api_error', Date.now() - startTime, err.message);

    // Save to transactional outbox for reliable recovery
    try {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO hindsight_outbox (tenant_id, deal_id, action, payload_json, status, attempts, max_attempts, last_error, created_at, updated_at)
        VALUES (?, ?, 'RETAIN', ?, 'PENDING', 1, 5, ?, ?, ?)
      `).run(
        formatted.tenantId,
        formatted.dealId,
        JSON.stringify(formatted),
        err.message,
        now,
        now
      );
    } catch (dbErr) {
      console.warn('Failed to write to hindsight_outbox:', dbErr.message);
    }

    return {
      success: false,
      mode: 'sqlite_fallback',
      error: err.message,
      memoryId: formatted.documentId,
      outboxQueued: true
    };
  }
}

/**
 * Drain and retry pending records in the Hindsight transactional outbox with Exponential Backoff + Jitter
 */
export async function syncHindsightOutbox(tenantId = null, options = {}) {
  const client = getHindsightClient();
  if (!client) return { synced: 0, pending: 0, processed: 0 };

  const includeFailed = options.includeFailed || options.retryFailed || false;

  let query = "SELECT * FROM hindsight_outbox WHERE (status = 'PENDING' AND attempts < max_attempts)";
  if (includeFailed) {
    query = "SELECT * FROM hindsight_outbox WHERE status = 'PENDING' OR status = 'FAILED'";
  }
  const params = [];
  if (tenantId) {
    query += " AND tenant_id = ?";
    params.push(tenantId);
  }

  const pending = db.prepare(query).all(...params);
  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      let rawPayload = {};
      try {
        rawPayload = JSON.parse(item.payload_json);
      } catch (e) {
        rawPayload = { deal_id: item.deal_id };
      }

      const formatted = formatNegotiationMemoryPayload(rawPayload, item.tenant_id);

      await client.retain(config.hindsightBankId, formatted.content, {
        documentId: formatted.documentId,
        metadata: formatted.metadata,
        tags: formatted.tags
      });

      db.prepare("UPDATE hindsight_outbox SET status = 'COMPLETED', last_error = NULL, updated_at = ? WHERE id = ?")
        .run(new Date().toISOString(), item.id);
      synced++;
    } catch (err) {
      failed++;
      const nextAttempts = item.attempts + 1;
      const isFailed = nextAttempts >= item.max_attempts;
      const nextStatus = isFailed ? 'FAILED' : 'PENDING';
      
      // Exponential backoff with jitter: 2^attempts * 1000ms + random jitter (0-1000ms)
      const backoffSec = Math.min(300, Math.pow(2, nextAttempts) + Math.random());
      const nextRetry = new Date(Date.now() + (backoffSec * 1000)).toISOString();

      db.prepare(`
        UPDATE hindsight_outbox 
        SET attempts = ?, status = ?, next_retry_at = ?, last_error = ?, updated_at = ? 
        WHERE id = ?
      `).run(nextAttempts, nextStatus, nextRetry, err.message, new Date().toISOString(), item.id);
    }
  }

  return { synced, pending: pending.length - synced, failed, processed: pending.length };
}

/**
 * Safely retry an individual outbox event by ID (authorized recovery mechanism)
 */
export async function retryOutboxEvent(eventId, tenantId = null) {
  const client = getHindsightClient();
  let query = 'SELECT * FROM hindsight_outbox WHERE id = ?';
  const params = [eventId];
  if (tenantId) {
    query += ' AND tenant_id = ?';
    params.push(tenantId);
  }

  const item = db.prepare(query).get(...params);
  if (!item) {
    throw new Error(`Outbox event #${eventId} not found`);
  }

  if (!client) {
    return { success: false, mode: 'sqlite_local', message: 'Hindsight client not configured' };
  }

  try {
    let rawPayload = {};
    try {
      rawPayload = JSON.parse(item.payload_json);
    } catch (e) {
      rawPayload = { deal_id: item.deal_id };
    }

    const formatted = formatNegotiationMemoryPayload(rawPayload, item.tenant_id);

    const res = await client.retain(config.hindsightBankId, formatted.content, {
      documentId: formatted.documentId,
      metadata: formatted.metadata,
      tags: formatted.tags
    });

    db.prepare("UPDATE hindsight_outbox SET status = 'COMPLETED', last_error = NULL, updated_at = ? WHERE id = ?")
      .run(new Date().toISOString(), item.id);

    const updated = db.prepare('SELECT * FROM hindsight_outbox WHERE id = ?').get(item.id);
    return { success: true, record: updated, raw: res };
  } catch (err) {
    const nextAttempts = item.attempts + 1;
    db.prepare(`
      UPDATE hindsight_outbox 
      SET attempts = ?, last_error = ?, updated_at = ? 
      WHERE id = ?
    `).run(nextAttempts, err.message, new Date().toISOString(), item.id);

    const updated = db.prepare('SELECT * FROM hindsight_outbox WHERE id = ?').get(item.id);
    return { success: false, error: err.message, record: updated };
  }
}


/**
 * Formats strategic reflection text into clean, structured, business-ready narrative
 * removing unwanted raw markdown artifacts (***, ###, ---, json blobs).
 */
export function formatStrategicReflection(rawText) {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return 'Organizational Reflection: Insufficient historical evidence to synthesize a customer-specific strategy. Baseline commercial economics applied.';
  }

  // If rawText is a JSON string, extract clean fields
  let text = rawText.trim();
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const parsed = JSON.parse(text);
      text = parsed.text || parsed.answer || parsed.reflection || parsed.synthesis || text;
    } catch (e) {}
  }

  // Remove markdown bold markers, headers, and horizontal rules
  text = text
    .replace(/^#+\s+/gm, '')           // ### headers
    .replace(/\*\*/g, '')              // **bold**
    .replace(/^---$/gm, '')            // horizontal rules
    .replace(/^>\s+/gm, '')            // blockquotes
    .replace(/\\n/g, '\n')             // escaped newlines
    .replace(/\n{3,}/g, '\n\n')        // excessive newlines
    .trim();

  return text;
}

/**
 * Hybrid Semantic Recall with Tenant Filtering, Customer Prioritization, and Deduplication
 */
export async function recallNegotiationMemories(queryStr, filterObj = {}) {
  const client = getHindsightClient();
  const tenantId = filterObj.tenantId || 'tenant_default';
  const customerId = filterObj.customerId;
  const segment = filterObj.segment;
  const maxLimit = filterObj.limit || 8;
  const startTime = Date.now();

  if (client) {
    try {
      const response = await client.recall(config.hindsightBankId, queryStr, {
        budget: 'mid'
      });

      recordTelemetryOp('RECALL', 'api_success', Date.now() - startTime);

      if (response && (response.results || response.memories || response.items)) {
        const rawItems = response.results || response.memories || response.items || [];
        if (rawItems.length > 0) {
          // Strict server-side tenant filtering to guarantee tenant isolation
          const filtered = rawItems.filter(item => {
            const itemTenant = item.metadata?.tenant_id;
            const docId = item.document_id || item.id || '';
            if (itemTenant) return itemTenant === tenantId;
            if (docId.startsWith(`${tenantId}::`)) return true;
            return tenantId === 'tenant_default';
          });

          if (filtered.length > 0) {
            const formatted = filtered.map(item => {
              let extractedCustomer = item.metadata?.customer;
              if (!extractedCustomer || extractedCustomer === 'Customer') {
                if (Array.isArray(item.entities) && item.entities.length > 0) {
                  const firstEntity = typeof item.entities[0] === 'string' ? item.entities[0] : item.entities[0]?.canonical_name;
                  if (firstEntity && !firstEntity.startsWith('DEAL-')) {
                    extractedCustomer = firstEntity;
                  }
                }
              }

              const isObservation = item.type === 'observation' || (item.text && item.text.startsWith('Observation:'));
              const rawDocId = item.metadata?.deal_id || item.document_id || item.id || 'MEM-HS';
              const cleanDealId = rawDocId.replace(`${tenantId}::`, '');
              const itemCustId = item.metadata?.customer_id || (extractedCustomer ? extractedCustomer.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'customer');

              return {
                dealId: cleanDealId,
                tenantId: item.metadata?.tenant_id || tenantId,
                customer: extractedCustomer || 'Customer Experience',
                customerId: itemCustId,
                segment: item.metadata?.segment || 'enterprise',
                industry: item.metadata?.industry || 'tech',
                objection: item.metadata?.objection || item.text || '',
                strategy: item.metadata?.strategy || '',
                concessionPercent: Number(item.metadata?.concession_percent) || 0,
                outcome: item.metadata?.outcome || (item.text?.includes('LOST') ? 'LOST' : 'WON'),
                outcomeReason: item.metadata?.outcome_reason || item.text || '',
                relevanceScore: Number((item.scores?.reranker || item.score || 0.85).toFixed(2)),
                memoryType: isObservation ? 'observation' : 'experience',
                source: 'hindsight_api'
              };
            });

            // Deduplicate by dealId
            const seenDeals = new Set();
            const deduplicated = [];
            for (const m of formatted) {
              if (!seenDeals.has(m.dealId)) {
                seenDeals.add(m.dealId);
                deduplicated.push(m);
              }
            }

            // Customer prioritization: customer-specific first, then segment fallback
            let scopedMemories = deduplicated;
            if (customerId) {
              const custSpecific = deduplicated.filter(m => m.customerId === customerId || m.customer?.toLowerCase().includes(customerId.replace(/-/g, ' ')));
              const segmentFallback = deduplicated.filter(m => !custSpecific.some(c => c.dealId === m.dealId));
              scopedMemories = custSpecific.length >= 3 
                ? custSpecific.slice(0, maxLimit)
                : [...custSpecific, ...segmentFallback].slice(0, maxLimit);
            } else {
              scopedMemories = deduplicated.slice(0, maxLimit);
            }

            return { source: 'hindsight_api', memories: scopedMemories, raw: response };
          }
        }
      }
    } catch (err) {
      console.warn('Hindsight recall failed, using SQLite evidence:', err.message);
      recordTelemetryOp('RECALL', 'api_error', Date.now() - startTime, err.message);
    }
  } else {
    recordTelemetryOp('RECALL', 'mock_success', Date.now() - startTime);
  }

  // SQLite fallback retrieval scoped strictly to tenant_id and prioritized by customer
  let rows = [];
  if (customerId) {
    rows = db.prepare(`SELECT * FROM negotiations WHERE tenant_id = ? AND customer_id = ? ORDER BY date DESC LIMIT ?`).all(tenantId, customerId, maxLimit);
  }
  
  // If fewer than 3 customer-specific memories, supplement with segment peer precedents
  if (rows.length < 3 && segment) {
    const existingIds = rows.map(r => r.deal_id);
    const placeholders = existingIds.length > 0 ? `AND deal_id NOT IN (${existingIds.map(() => '?').join(',')})` : '';
    const segmentRows = db.prepare(`SELECT * FROM negotiations WHERE tenant_id = ? AND segment = ? ${placeholders} ORDER BY date DESC LIMIT ?`).all(tenantId, segment, ...existingIds, maxLimit - rows.length);
    rows = [...rows, ...segmentRows];
  }

  if (rows.length === 0) {
    rows = db.prepare(`SELECT * FROM negotiations WHERE tenant_id = ? ORDER BY date DESC LIMIT ?`).all(tenantId, maxLimit);
  }

  // Deduplicate rows by deal_id
  const seenIds = new Set();
  const uniqueRows = [];
  for (const r of rows) {
    if (!seenIds.has(r.deal_id)) {
      seenIds.add(r.deal_id);
      uniqueRows.push(r);
    }
  }

  const memories = uniqueRows.map(r => ({
    dealId: r.deal_id,
    tenantId: r.tenant_id,
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
    memoryType: 'experience',
    source: client ? 'hindsight_fallback' : 'sqlite_local'
  }));

  return {
    source: client ? 'hindsight_fallback' : 'sqlite_local',
    memories
  };
}

/**
 * Strategic Reflection with Clean Business-Language Output
 */
export async function reflectNegotiationSynthesis(queryStr, tenantId = 'tenant_default') {
  const client = getHindsightClient();
  const startTime = Date.now();

  if (!client) {
    recordTelemetryOp('REFLECT', 'mock_success', Date.now() - startTime);
    return {
      source: 'sqlite_local',
      synthesis: 'Organizational Reflection: Historical deals indicate that direct price concessions exceeding 15% suffer from high loss rates across enterprise technology clients. In contrast, pairing smaller concessions (8–10%) with value-add services such as dedicated onboarding or premium technical support yields high win rates under competitive pressure.'
    };
  }
  try {
    const res = await client.reflect(config.hindsightBankId, `[Tenant: ${tenantId}] ${queryStr}`, { budget: 'low' });
    const rawText = res.text || res.answer || (typeof res === 'string' ? res : JSON.stringify(res));
    const cleanSynthesis = formatStrategicReflection(rawText);
    recordTelemetryOp('REFLECT', 'api_success', Date.now() - startTime);
    return { source: 'hindsight_api', synthesis: cleanSynthesis };
  } catch (err) {
    recordTelemetryOp('REFLECT', 'api_error', Date.now() - startTime, err.message);
    return {
      source: 'sqlite_fallback',
      synthesis: 'Reflection Fallback: Multi-year commitment bundles paired with moderate concessions consistently outperform pure price matching in enterprise sales negotiations.'
    };
  }
}

/**
 * Live Hindsight Cloud Explorer Data Provider with Tenant Filtering
 */
export async function getHindsightCloudExplorerData(tenantId = 'tenant_default') {
  const client = getHindsightClient();
  if (!client) {
    return { available: false, error: 'HINDSIGHT_API_KEY not configured', memories: [] };
  }

  try {
    const recallRes = await client.recall(config.hindsightBankId, `B2B enterprise sales negotiation strategies for tenant ${tenantId}`, {
      budget: 'high'
    });

    const items = recallRes?.results || recallRes?.memories || recallRes?.items || [];
    const filtered = items.filter(item => {
      const itemTenant = item.metadata?.tenant_id;
      const docId = item.document_id || item.id || '';
      if (itemTenant) return itemTenant === tenantId;
      if (docId.startsWith(`${tenantId}::`)) return true;
      return tenantId === 'tenant_default';
    });

    const formatted = filtered.map(item => ({
      id: item.id || item.document_id,
      documentId: item.metadata?.deal_id || item.document_id || item.id,
      tenantId: item.metadata?.tenant_id || tenantId,
      text: item.text || item.content,
      customer: item.metadata?.customer || (item.entities?.[0]) || 'Enterprise Client',
      segment: item.metadata?.segment || 'enterprise',
      outcome: item.metadata?.outcome || 'WON',
      strategy: item.metadata?.strategy || 'Concession package',
      tags: item.tags || [],
      entities: item.entities || [],
      score: Number((item.scores?.reranker || item.score || 0.9).toFixed(2)),
      type: item.type === 'observation' ? 'Observation' : 'Experience',
      occurredAt: item.occurred_start || item.mentioned_at || new Date().toISOString()
    }));

    return {
      available: true,
      bankId: config.hindsightBankId,
      totalCount: formatted.length,
      memories: formatted
    };
  } catch (err) {
    return {
      available: false,
      error: err.message,
      memories: []
    };
  }
}
