import { db, normalizeCustomerId } from '../db/database.js';

export function detectNegotiationPatterns(customerName, segment, options = {}) {
  const normalizedId = normalizeCustomerId(customerName);
  const tenantId = options.tenantId || options.tenant_id || 'tenant_default';

  const customerDeals = db.prepare(`SELECT * FROM negotiations WHERE customer_id = ? AND tenant_id = ?`).all(normalizedId, tenantId);
  const segmentDeals = db.prepare(`SELECT * FROM negotiations WHERE segment = ? AND tenant_id = ?`).all(segment, tenantId);

  const patterns = [];

  // Customer specific patterns
  if (customerDeals.length > 0) {
    const wins = customerDeals.filter(d => d.outcome === 'WON');
    const losses = customerDeals.filter(d => d.outcome === 'LOST');

    // Pattern 1: Concession percentage threshold for customer
    const winDiscounts = wins.map(w => w.concession_percent);
    const lossDiscounts = losses.map(l => l.concession_percent);

    const avgWinDiscount = winDiscounts.length > 0 ? (winDiscounts.reduce((a, b) => a + b, 0) / winDiscounts.length).toFixed(1) : 'N/A';
    const avgLossDiscount = lossDiscounts.length > 0 ? (lossDiscounts.reduce((a, b) => a + b, 0) / lossDiscounts.length).toFixed(1) : 'N/A';

    patterns.push({
      type: 'customer_behavior',
      title: `${customerName} Concession Threshold`,
      description: `For ${customerName}, winning deals averaged an ${avgWinDiscount}% concession, whereas losing deals averaged an ${avgLossDiscount}% concession.`,
      stat: `Win avg: ${avgWinDiscount}% vs Loss avg: ${avgLossDiscount}%`,
      confidence: customerDeals.length >= 3 ? 'HIGH' : 'MEDIUM'
    });

    // Pattern 2: Support inclusion pattern
    const winsWithSupport = wins.filter(w => w.strategy.toLowerCase().includes('support'));
    const lossesWithSupport = losses.filter(l => l.strategy.toLowerCase().includes('support'));

    if (winsWithSupport.length > 0 || lossesWithSupport.length > 0) {
      const supportWinRate = Math.round((winsWithSupport.length / (winsWithSupport.length + lossesWithSupport.length || 1)) * 100);
      patterns.push({
        type: 'strategy_effectiveness',
        title: 'Support Package Impact',
        description: `Including a premium support package in negotiations with ${customerName} resulted in a ${supportWinRate}% win rate (${winsWithSupport.length}/${winsWithSupport.length + lossesWithSupport.length} deals).`,
        stat: `${supportWinRate}% Win Rate with Support`,
        confidence: 'HIGH'
      });
    }

    // Pattern 3: Competitor Pressure pattern
    const dealsWithComp = customerDeals.filter(d => d.competitor_pressure === 1);
    const compWins = dealsWithComp.filter(d => d.outcome === 'WON');
    if (dealsWithComp.length > 0) {
      patterns.push({
        type: 'competitor_insight',
        title: 'Competitor Pressure Response',
        description: `Under competitor pressure, ${customerName} closed ${compWins.length} of ${dealsWithComp.length} deals when value-add support was offered instead of matching price drops.`,
        stat: `${compWins.length}/${dealsWithComp.length} Closed Under Pressure`,
        confidence: 'MEDIUM'
      });
    }
  }

  // Segment level patterns
  if (segmentDeals.length > 0) {
    const segWins = segmentDeals.filter(d => d.outcome === 'WON');
    const segLosses = segmentDeals.filter(d => d.outcome === 'LOST');
    const segWinRate = Math.round((segWins.length / segmentDeals.length) * 100);

    patterns.push({
      type: 'segment_benchmark',
      title: `${segment.toUpperCase()} Segment Baseline`,
      description: `Across the ${segment} segment (${segmentDeals.length} historical deals), the overall win rate is ${segWinRate}%.`,
      stat: `${segWinRate}% Segment Win Rate`,
      confidence: segmentDeals.length >= 5 ? 'HIGH' : 'MEDIUM'
    });
  }

  return patterns;
}
