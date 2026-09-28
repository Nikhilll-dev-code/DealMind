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

export function evaluateConfidenceAndConflict(customerName, segment) {
  const normalizedId = normalizeCustomerId(customerName);

  // Fetch customer episodes
  const customerRows = db.prepare(`
    SELECT * FROM negotiations WHERE customer_id = ? AND outcome IN ('WON', 'LOST')
  `).all(normalizedId);

  // Fetch segment episodes
  const segmentRows = db.prepare(`
    SELECT * FROM negotiations WHERE segment = ? AND outcome IN ('WON', 'LOST')
  `).all(segment);

  const customerWins = customerRows.filter(r => r.outcome === 'WON').length;
  const customerLosses = customerRows.filter(r => r.outcome === 'LOST').length;
  const customerTotal = customerWins + customerLosses;
  const customerWinRate = customerTotal > 0 ? Math.round((customerWins / customerTotal) * 100) : 0;

  const segmentWins = segmentRows.filter(r => r.outcome === 'WON').length;
  const segmentLosses = segmentRows.filter(r => r.outcome === 'LOST').length;
  const segmentTotal = segmentWins + segmentLosses;
  const segmentWinRate = segmentTotal > 0 ? Math.round((segmentWins / segmentTotal) * 100) : 0;

  let primaryScope = 'segment';
  let primaryWins = segmentWins;
  let primaryLosses = segmentLosses;
  let primaryTotal = segmentTotal;
  let primaryWinRate = segmentWinRate;

  // Rule: If customer-specific comparable evidence >= 2, prioritize customer evidence
  if (customerTotal >= 2) {
    primaryScope = 'customer';
    primaryWins = customerWins;
    primaryLosses = customerLosses;
    primaryTotal = customerTotal;
    primaryWinRate = customerWinRate;
  }

  let baseConfidence = calculateBaseConfidence(primaryWins, primaryLosses);

  // Rule: Conflict detection
  // Compare customer winning strategy vs segment winning strategy
  let conflictDetected = false;
  let conflictReason = null;

  if (customerTotal >= 2 && segmentTotal >= 3) {
    // Analyze winning strategy patterns for customer vs segment
    const customerWinningDiscountAvg = customerRows.filter(r => r.outcome === 'WON')
      .reduce((acc, r) => acc + r.concession_percent, 0) / (customerWins || 1);

    const customerLosingDiscountAvg = customerRows.filter(r => r.outcome === 'LOST')
      .reduce((acc, r) => acc + r.concession_percent, 0) / (customerLosses || 1);

    const segmentWinningDiscountAvg = segmentRows.filter(r => r.outcome === 'WON')
      .reduce((acc, r) => acc + r.concession_percent, 0) / (segmentWins || 1);

    // If customer wins occur at low discounts (<=10%) with support, but segment wins occur at high direct discounts (>=15%)
    const customerPrefersSupportOverDiscount = customerWinningDiscountAvg <= 11 && customerLosingDiscountAvg >= 14;
    const segmentPrefersDirectDiscount = segmentWinningDiscountAvg >= 14;

    if (customerPrefersSupportOverDiscount && segmentPrefersDirectDiscount) {
      conflictDetected = true;
      conflictReason = `Customer history (${customerWins}/${customerTotal} wins) shows winning deals require small discounts (avg ${Math.round(customerWinningDiscountAvg)}%) + support packages, whereas overall segment deals favor larger direct discounts (avg ${Math.round(segmentWinningDiscountAvg)}%). Confidence is capped at MEDIUM.`;
    }
  }

  let finalConfidence = baseConfidence;
  if (conflictDetected && (finalConfidence === 'HIGH')) {
    finalConfidence = 'MEDIUM';
  }

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
    baseConfidence,
    conflictDetected,
    conflictReason,
    finalConfidence,
    confidenceCapApplied: conflictDetected ? 'MEDIUM' : null
  };
}
