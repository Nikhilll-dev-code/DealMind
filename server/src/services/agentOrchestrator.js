import { recallNegotiationMemories } from './hindsightAdapter.js';
import { evaluateConfidenceAndConflict } from './confidenceEngine.js';
import { calculateDealEconomics, buildStrategyLabEconomics } from './economicsEngine.js';
import { detectNegotiationPatterns } from './patternEngine.js';
import { synthesizeNegotiationRecommendation } from './groqAdapter.js';
import { db, normalizeCustomerId } from '../db/database.js';

export async function analyzeNegotiation(input = {}) {
  const customer = (input.customer || 'Acme Corp').trim();
  const customerId = normalizeCustomerId(customer);
  const segment = (input.segment || 'enterprise').toLowerCase();
  const industry = (input.industry || 'technology').toLowerCase();
  const dealValue = Math.max(1, Number(input.dealValue) || 100000);
  const objection = input.objection || 'Price is too high';
  const initialOffer = Math.max(1, Number(input.initialOffer) || dealValue);
  const counterOffer = Number(input.counterOffer) || Math.round(dealValue * 0.8);
  const requestedDiscountPercent = Math.min(99, Math.max(0, Number(input.requestedDiscountPercent) || 20));
  const competitorPressure = Boolean(input.competitorPressure);
  const contractYears = Math.max(1, Number(input.contractYears) || 1);

  const queryStr = `${customer} ${segment} ${industry} negotiation ${objection} discount ${requestedDiscountPercent}% competitor ${competitorPressure ? 'yes' : 'no'}`;

  // 1. Memory recall via Hindsight
  const recallResult = await recallNegotiationMemories(queryStr, { customerId, segment });
  const memories = recallResult.memories || [];

  // 2. Confidence & Conflict Engine
  const confidenceData = evaluateConfidenceAndConflict(customer, segment);

  // If no memories were found at all, adjust confidence and message
  if (memories.length === 0 && confidenceData.sampleSize === 0) {
    confidenceData.finalConfidence = 'LOW';
    confidenceData.baseConfidence = 'LOW';
    confidenceData.conflictReason = 'No comparable historical memory found for this customer or segment.';
  }

  // 3. Economics Engine (Dynamic for user dealValue and requested discount %)
  const proposedDiscount = Math.max(1, Math.round(requestedDiscountPercent * 0.4)); // e.g. 8% for 20%
  const economicsData = calculateDealEconomics({
    dealValue,
    requestedDiscountPercent,
    proposedDiscountPercent: proposedDiscount,
    contractYears
  });

  const strategyLab = buildStrategyLabEconomics(dealValue, requestedDiscountPercent);

  // 4. Pattern Engine
  const patterns = detectNegotiationPatterns(customer, segment);

  // 5. Groq / Deterministic Synthesis
  const synthesis = await synthesizeNegotiationRecommendation({
    deal: { customer, segment, industry, dealValue, objection, requestedDiscountPercent, competitorPressure, contractYears },
    memories,
    confidenceData,
    economicsData,
    patterns
  });

  return {
    deal: {
      customer,
      customerId,
      segment,
      industry,
      dealValue,
      objection,
      initialOffer,
      counterOffer,
      requestedDiscountPercent,
      competitorPressure,
      contractYears
    },
    recommendation: {
      headline: synthesis.headline,
      primaryText: synthesis.primaryRecommendation,
      keyTakeaways: synthesis.keyTakeaways,
      counterofferSuggestion: synthesis.counterofferSuggestion
    },
    strategyOptions: strategyLab,
    confidence: confidenceData,
    economics: economicsData,
    evidence: {
      source: recallResult.source,
      totalRecalled: memories.length,
      memories
    },
    patterns,
    conflicts: {
      detected: confidenceData.conflictDetected,
      reason: confidenceData.conflictReason,
      capApplied: confidenceData.confidenceCapApplied
    },
    memoryStatus: recallResult.source.includes('api') ? 'connected' : 'fallback',
    reasoningMode: synthesis.reasoningMode
  };
}

export async function analyzeCounteroffer(dealId, newCounterOffer, notes = '') {
  let deal = db.prepare('SELECT * FROM negotiations WHERE deal_id = ?').get(dealId);
  if (!deal) {
    deal = {
      deal_id: dealId || 'DEAL-NEW',
      customer: 'New Customer',
      customer_id: 'new-customer',
      segment: 'enterprise',
      industry: 'technology',
      initial_offer: 100000,
      objection: 'Price is too high',
      concession_percent: 20,
      competitor_pressure: 1,
      contract_years: 1
    };
  }

  const initialOffer = deal.initial_offer || 100000;
  const newCounter = Number(newCounterOffer) || 85000;
  const effectiveDiscountPercent = Math.max(0, Math.round(((initialOffer - newCounter) / initialOffer) * 100));

  const analysis = await analyzeNegotiation({
    customer: deal.customer,
    segment: deal.segment,
    industry: deal.industry,
    dealValue: initialOffer,
    objection: deal.objection,
    initialOffer,
    counterOffer: newCounter,
    requestedDiscountPercent: effectiveDiscountPercent,
    competitorPressure: Boolean(deal.competitor_pressure),
    contractYears: deal.contract_years
  });

  return {
    dealId: deal.deal_id,
    newCounterOffer: newCounter,
    effectiveDiscountPercent,
    previousCounterOffer: deal.counter_offer,
    suggestedResponse: analysis.recommendation.counterofferSuggestion,
    analysis
  };
}

export async function simulateWhatIf(dealId, scenarioInput = {}) {
  const dealValue = Math.max(1, Number(scenarioInput.dealValue) || 100000);
  const discountPercent = Math.min(99, Math.max(0, Number(scenarioInput.discountPercent) || 10));
  const contractYears = Math.max(1, Number(scenarioInput.contractYears) || 1);
  const includeSupport = Boolean(scenarioInput.includeSupport);
  const competitorPressure = Boolean(scenarioInput.competitorPressure);

  const customer = scenarioInput.customer || 'Acme Corp';
  const segment = scenarioInput.segment || 'enterprise';

  const requestedDiscountPercent = Number(scenarioInput.requestedDiscountPercent) || 20;

  const economics = calculateDealEconomics({
    dealValue,
    requestedDiscountPercent,
    proposedDiscountPercent: discountPercent,
    contractYears,
    supportAddonCost: includeSupport ? Math.round(dealValue * 0.02) : 0
  });

  const queryStr = `${customer} ${segment} ${discountPercent}% discount support ${includeSupport ? 'yes' : 'no'}`;
  const recallResult = await recallNegotiationMemories(queryStr, { customerId: normalizeCustomerId(customer), segment });

  return {
    scenarioInput,
    economics,
    evidenceContext: recallResult.memories.slice(0, 3),
    deterministicOutcome: {
      concessionSavings: economics.concessionSavings,
      netRevenue: economics.netRevenueProposed,
      effectiveNetValue: economics.effectiveNetValue
    }
  };
}
