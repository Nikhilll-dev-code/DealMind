import { db, normalizeCustomerId } from '../db/database.js';

export function calculateBaseConfidence(wins, losses) {
  const total = wins + losses;
  if (total < 3) {
    return 'LOW';
  }
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  if (winRate >= 70) {
    return 'HIGH';
  } else if (winRate >= 40) {
    return 'MEDIUM';
  } else {
    return 'LOW';
  }
}

/**
 * Assign evidence tier based on independent deal sample sizes
 */
export function getEvidenceTier(sampleSize) {
  if (sampleSize <= 0) {
    return {
      label: 'No historical evidence',
      tier: 'NONE',
      description: 'Zero comparable negotiations found in knowledge bank.'
    };
  }
  if (sampleSize === 1) {
    return {
      label: 'Preliminary evidence',
      tier: 'PRELIMINARY',
      description: 'Single observation available; preliminary indication only. Over-generalization guarded.'
    };
  }
  if (sampleSize <= 4) {
    return {
      label: 'Emerging pattern',
      tier: 'EMERGING',
      description: 'Small cluster of 2–4 comparable deals. Useful pattern with moderate variance.'
    };
  }
  return {
    label: 'Established pattern',
    tier: 'ESTABLISHED',
    description: '5+ validated historical deals showing statistically consistent outcomes.'
  };
}

export function evaluateConfidenceAndConflict(customerName, segment, options = {}) {
  const normalizedId = normalizeCustomerId(customerName);
  const tenantId = options.tenantId || 'tenant_default';

  // Fetch customer episodes for this specific tenant
  const customerRows = db.prepare(`
    SELECT * FROM negotiations WHERE tenant_id = ? AND customer_id = ? AND outcome IN ('WON', 'LOST')
  `).all(tenantId, normalizedId);

  // Fetch segment episodes for this specific tenant
  const segmentRows = db.prepare(`
    SELECT * FROM negotiations WHERE tenant_id = ? AND segment = ? AND outcome IN ('WON', 'LOST')
  `).all(tenantId, segment);

  const customerWins = customerRows.filter(r => r.outcome === 'WON').length;
  const customerLosses = customerRows.filter(r => r.outcome === 'LOST').length;
  const customerTotal = customerWins + customerLosses;
  const customerWinRate = customerTotal > 0 ? Math.round((customerWins / customerTotal) * 100) : 0;

  const segmentWins = segmentRows.filter(r => r.outcome === 'WON').length;
  const segmentLosses = segmentRows.filter(r => r.outcome === 'LOST').length;
  const segmentTotal = segmentWins + segmentLosses;
  const segmentWinRate = segmentTotal > 0 ? Math.round((segmentWins / segmentTotal) * 100) : 0;

  let primaryScope = 'customer';
  let primaryWins = customerWins;
  let primaryLosses = customerLosses;
  let primaryTotal = customerTotal;
  let primaryWinRate = customerWinRate;

  // If customer has 0 history, scope is unestablished (customer evidence tier is NONE)
  if (customerTotal === 0) {
    primaryScope = segmentTotal > 0 ? 'segment_fallback' : 'none';
    primaryWins = 0;
    primaryLosses = 0;
    primaryTotal = 0;
    primaryWinRate = 0;
  } else if (customerTotal === 1) {
    primaryScope = 'customer';
    primaryWins = customerWins;
    primaryLosses = customerLosses;
    primaryTotal = 1;
    primaryWinRate = customerWinRate;
  } else {
    primaryScope = 'customer';
    primaryWins = customerWins;
    primaryLosses = customerLosses;
    primaryTotal = customerTotal;
    primaryWinRate = customerWinRate;
  }

  let baseConfidence = calculateBaseConfidence(primaryWins, primaryLosses);

  // Conflict and contradiction detection
  let conflictDetected = false;
  let conflictReason = null;

  if (customerTotal >= 1 && segmentTotal >= 2) {
    const customerWinningDiscountAvg = customerRows.filter(r => r.outcome === 'WON')
      .reduce((acc, r) => acc + r.concession_percent, 0) / (customerWins || 1);

    const segmentWinningDiscountAvg = segmentRows.filter(r => r.outcome === 'WON')
      .reduce((acc, r) => acc + r.concession_percent, 0) / (segmentWins || 1);

    // Conflict between customer win pattern (low discount + support) and segment win pattern (high direct discount)
    if (customerWinningDiscountAvg <= 10 && segmentWinningDiscountAvg >= 15) {
      conflictDetected = true;
      conflictReason = `Customer history (${customerWins}/${customerTotal} wins) favors low discounts (avg ${Math.round(customerWinningDiscountAvg)}%) + support packages, whereas overall segment averages larger direct discounts (${Math.round(segmentWinningDiscountAvg)}%). Confidence is capped at MEDIUM.`;
    }
  }

  // Contradictory outcome detection within customer history (mixed wins/losses at same concession)
  if (customerWins > 0 && customerLosses > 0 && !conflictDetected) {
    const mixedOutcomes = customerRows.some(r1 => 
      customerRows.some(r2 => 
        r1.outcome !== r2.outcome && Math.abs(r1.concession_percent - r2.concession_percent) <= 3
      )
    );
    if (mixedOutcomes && baseConfidence === 'HIGH') {
      conflictDetected = true;
      conflictReason = `Customer has mixed outcomes (${customerWins} WON vs ${customerLosses} LOST) at similar discount ranges. Guardrail applied.`;
    }
  }

  let finalConfidence = baseConfidence;
  if (conflictDetected && finalConfidence === 'HIGH') {
    finalConfidence = 'MEDIUM';
  }

  // Guardrails: 0 or 1 customer deals can NEVER have HIGH or MEDIUM confidence for customer
  if (customerTotal <= 1) {
    finalConfidence = 'LOW';
    baseConfidence = 'LOW';
  }

  const evidenceTier = getEvidenceTier(customerTotal);

  return {
    customerStats: {
      customer: customerName,
      customerId: normalizedId,
      total: customerTotal,
      wins: customerWins,
      losses: customerLosses,
      winRate: customerWinRate
    },
    segmentStats: {
      segment,
      total: segmentTotal,
      wins: segmentWins,
      losses: segmentLosses,
      winRate: segmentWinRate
    },
    primaryScope,
    sampleSize: primaryTotal,
    sampleWins: primaryWins,
    sampleLosses: primaryLosses,
    winRate: primaryWinRate,
    evidenceTier,
    baseConfidence,
    conflictDetected,
    conflictReason,
    finalConfidence,
    confidenceCapApplied: conflictDetected ? 'MEDIUM' : null
  };
}

/**
 * FEATURE C: Evidence Conflict and Agreement Matrix Engine
 * Groups retrieved negotiation memories into structured supporting, contradicting,
 * mixed, and customer-vs-segment matrices with transparent conflict explanations.
 */
export function buildEvidenceConflictMatrix(dealContext, memories = [], confidenceData = null) {
  const customer = dealContext.customer || 'Customer';
  const customerId = dealContext.customerId || normalizeCustomerId(customer);
  const segment = dealContext.segment || 'enterprise';
  const requestedDiscount = Number(dealContext.requestedDiscountPercent || dealContext.requested_discount_percent || 20);

  const supporting = [];
  const contradicting = [];
  const mixed = [];
  const customerSpecific = [];
  const segmentLevel = [];

  const rawMemories = Array.isArray(memories) ? memories : (memories?.memories || []);

  rawMemories.forEach(mem => {
    const isCustomer = mem.customerId === customerId || (mem.customer && mem.customer.toLowerCase() === customer.toLowerCase());
    const concession = Number(mem.concessionPercent ?? mem.concession_percent ?? 0);
    const outcome = String(mem.outcome || '').toUpperCase();
    const strategy = String(mem.strategy || '').toLowerCase();

    const formattedMem = {
      dealId: mem.dealId || mem.deal_id || 'MEM',
      customer: mem.customer || 'Customer',
      isCustomerSpecific: isCustomer,
      segment: mem.segment || segment,
      concessionPercent: concession,
      outcome: outcome,
      strategy: mem.strategy || 'Standard strategy',
      outcomeReason: mem.outcomeReason || mem.outcome_reason || '',
      relevanceScore: typeof mem.relevanceScore === 'number' ? mem.relevanceScore : (isCustomer ? 0.95 : 0.75),
      source: mem.source || 'hindsight_memory',
      memoryType: mem.memoryType || 'experience'
    };

    if (isCustomer) {
      customerSpecific.push(formattedMem);
    } else {
      segmentLevel.push(formattedMem);
    }

    // Classification based on outcome & strategy alignment:
    // 1. Supporting: WON outcomes with moderate discount (<= 15%) or bundling support
    if (outcome === 'WON') {
      if (concession <= 15 || strategy.includes('support') || strategy.includes('commit') || strategy.includes('value')) {
        supporting.push({
          ...formattedMem,
          alignment: 'SUPPORTS',
          alignmentReason: `Won at ${concession}% concession${strategy.includes('support') ? ' with value-add support' : ''}. Supports controlled counteroffer.`
        });
      } else {
        mixed.push({
          ...formattedMem,
          alignment: 'MIXED',
          alignmentReason: `Won with deep concession (${concession}%). Demonstrates high-discount willingness but carries margin erosion risk.`
        });
      }
    } else if (outcome === 'LOST') {
      // 2. Contradicting: LOST outcomes, especially where deep discounts failed or competitor price wars failed
      contradicting.push({
        ...formattedMem,
        alignment: 'CONTRADICTS',
        alignmentReason: `Lost deal with ${concession}% discount. Proves that direct price cuts without value packaging do not guarantee closing.`
      });
    } else {
      mixed.push({
        ...formattedMem,
        alignment: 'INCONCLUSIVE',
        alignmentReason: `Pending or non-standard outcome (${outcome}). Inconclusive evidence.`
      });
    }
  });

  // Calculate conflict state
  const hasConflict = (supporting.length > 0 && contradicting.length > 0) || 
    (confidenceData?.conflictDetected) ||
    (customerSpecific.some(c => c.outcome === 'WON' && c.concessionPercent <= 10) && segmentLevel.some(s => s.outcome === 'WON' && s.concessionPercent > 15));

  let alignmentCategory = 'INSUFFICIENT_EVIDENCE';
  if (rawMemories.length === 0) {
    alignmentCategory = 'ZERO_EVIDENCE';
  } else if (contradicting.length > supporting.length) {
    alignmentCategory = 'HIGH_CONFLICT';
  } else if (hasConflict) {
    alignmentCategory = 'MODERATE_CONFLICT';
  } else if (supporting.length > 0 && contradicting.length === 0) {
    alignmentCategory = 'STRONG_ALIGNMENT';
  } else {
    alignmentCategory = 'MIXED_EVIDENCE';
  }

  // Generate transparent conflict explanation
  let conflictExplanation = '';
  if (rawMemories.length === 0) {
    conflictExplanation = `No historical negotiation episodes exist in Hindsight memory for ${customer} or ${segment} segment. Recommendations rely on calibrated baseline economics.`;
  } else if (hasConflict) {
    const custAvg = customerSpecific.length > 0
      ? (customerSpecific.reduce((a, b) => a + b.concessionPercent, 0) / customerSpecific.length).toFixed(1)
      : 'N/A';
    conflictExplanation = `Historical evidence presents mixed precedents: ${supporting.length} winning deals support controlled concessions (avg ${custAvg}%), while ${contradicting.length} lost episodes show risk when matching high customer discounts. Confidence is capped at MEDIUM.`;
  } else {
    conflictExplanation = `Historical evidence strongly aligns: ${supporting.length} past negotiation episodes demonstrate consistent success with value-add packaging and controlled discounts.`;
  }

  return {
    customer,
    segment,
    alignmentCategory,
    hasConflict,
    conflictExplanation,
    metrics: {
      totalEvidence: rawMemories.length,
      supportingCount: supporting.length,
      contradictingCount: contradicting.length,
      mixedCount: mixed.length,
      customerSpecificCount: customerSpecific.length,
      segmentLevelCount: segmentLevel.length
    },
    supportingPrecedents: supporting,
    contradictingPrecedents: contradicting,
    mixedPrecedents: mixed,
    customerSpecificEvidence: customerSpecific,
    segmentLevelEvidence: segmentLevel,
    confidenceCap: hasConflict ? 'MEDIUM' : null
  };
}

