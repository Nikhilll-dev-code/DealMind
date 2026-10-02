export function calculateDealEconomics({
  dealValue = 100000,
  requestedDiscountPercent = 20,
  proposedDiscountPercent = 8,
  contractYears = 1,
  supportAddonCost = 0
}) {
  const dealVal = Number(dealValue) || 100000;
  const reqPercent = Number(requestedDiscountPercent) || 0;
  const propPercent = Number(proposedDiscountPercent) || 0;
  const years = Number(contractYears) || 1;

  const requestedConcession = Math.round((dealVal * reqPercent) / 100);
  const proposedConcession = Math.round((dealVal * propPercent) / 100);
  const netRevenueProposed = dealVal - proposedConcession;
  const netRevenueRequested = dealVal - requestedConcession;

  // Revenue difference retained compared to full requested discount
  const concessionSavings = requestedConcession - proposedConcession;

  // Multi-year total value
  const totalContractValueProposed = netRevenueProposed * years;

  return {
    dealValue: dealVal,
    contractYears: years,
    requestedDiscountPercent: reqPercent,
    requestedConcession,
    netRevenueRequested,
    proposedDiscountPercent: propPercent,
    proposedConcession,
    netRevenueProposed,
    concessionSavings,
    supportAddonCost,
    effectiveNetValue: netRevenueProposed - supportAddonCost,
    formatted: {
      dealValue: `$${dealVal.toLocaleString()}`,
      requestedConcession: `$${requestedConcession.toLocaleString()} (${reqPercent}%)`,
      proposedConcession: `$${proposedConcession.toLocaleString()} (${propPercent}%)`,
      concessionSavings: `$${concessionSavings.toLocaleString()}`,
      netRevenueProposed: `$${netRevenueProposed.toLocaleString()}`,
      totalContractValue: `$${totalContractValueProposed.toLocaleString()}`
    },
    note: "All economic calculations are deterministic. Concession savings represent potential revenue retained versus the full requested discount."
  };
}

export function buildStrategyLabEconomics(dealValue = 100000, requestedDiscountPercent = 20) {
  const val = Number(dealValue) || 100000;
  const reqPercent = Number(requestedDiscountPercent) || 20;

  // Compute dynamic discount levels relative to requested discount
  const conservativeDiscount = Math.max(1, Math.round(reqPercent * 0.4)); // e.g. 8% for 20%
  const balancedDiscount = Math.max(2, Math.round(reqPercent * 0.5));     // e.g. 10% for 20%
  const aggressiveDiscount = Math.max(3, Math.round(reqPercent * 0.9));   // e.g. 18% for 20%

  const conservative = calculateDealEconomics({
    dealValue: val,
    requestedDiscountPercent: reqPercent,
    proposedDiscountPercent: conservativeDiscount,
    contractYears: 1,
    supportAddonCost: Math.round(val * 0.02)
  });

  const balanced = calculateDealEconomics({
    dealValue: val,
    requestedDiscountPercent: reqPercent,
    proposedDiscountPercent: balancedDiscount,
    contractYears: 2,
    supportAddonCost: Math.round(val * 0.025)
  });

  const aggressive = calculateDealEconomics({
    dealValue: val,
    requestedDiscountPercent: reqPercent,
    proposedDiscountPercent: aggressiveDiscount,
    contractYears: 1,
    supportAddonCost: 0
  });

  return {
    conservative: {
      name: "Conservative / Support-First",
      discountPercent: conservativeDiscount,
      concessionValue: conservative.proposedConcession,
      concessionSavings: conservative.concessionSavings,
      netRevenue: conservative.netRevenueProposed,
      package: `${conservativeDiscount}% Discount + Premium Support Package`,
      tradeoffs: "Protects price integrity and brand value. Bundles dedicated support to resolve service risk without deep price cuts.",
      evidenceSupport: "Strong historical support when value-add packages are offered over direct price cuts.",
      risk: "Customer may push back if price is their sole decision criteria."
    },
    balanced: {
      name: "Balanced / Two-Year Commitment",
      discountPercent: balancedDiscount,
      concessionValue: balanced.proposedConcession,
      concessionSavings: balanced.concessionSavings,
      netRevenue: balanced.netRevenueProposed,
      package: `${balancedDiscount}% Discount + Premium Support + 2-Year Contract`,
      tradeoffs: "Offers a moderate discount in exchange for a multi-year committed recurring revenue contract.",
      evidenceSupport: "Multi-year commitments with support packages show high historical win rates in enterprise deals.",
      risk: "Requires legal and procurement alignment for multi-year terms."
    },
    aggressive: {
      name: "Aggressive / Price Concession",
      discountPercent: aggressiveDiscount,
      concessionValue: aggressive.proposedConcession,
      concessionSavings: aggressive.concessionSavings,
      netRevenue: aggressive.netRevenueProposed,
      package: `${aggressiveDiscount}% Direct Price Discount (No Support)`,
      tradeoffs: "Meets price drop demand almost fully but sacrifices $"+aggressive.proposedConcession.toLocaleString()+" in revenue without long-term value.",
      evidenceSupport: "Low historical win rate for deep direct price cuts without value-add commitments.",
      risk: "High risk: historical data shows unbundled direct price cuts result in low deal win rates and margin erosion."
    }
  };
}

/**
 * FEATURE A: Give-Get Negotiation Intelligence Engine
 * Computes reciprocal trade-off packages grounded in historical evidence and business rules.
 */
export function buildGiveGetRecommendations(dealContext, evidenceMemories = []) {
  const dealValue = Number(dealContext.dealValue || dealContext.deal_value || dealContext.initialOffer || dealContext.initial_offer || 100000);
  const requestedDiscountPercent = Number(dealContext.requestedDiscountPercent || dealContext.requested_discount_percent || 20);
  const customer = dealContext.customer || 'Customer';
  const segment = dealContext.segment || 'enterprise';
  const threshold = 15; // Standard manager approval threshold

  // Helper to find supporting or contradicting memories for a topic
  const findEvidence = (keywords = []) => {
    return (evidenceMemories || []).filter(m => {
      const text = `${m.strategy || ''} ${m.outcomeReason || ''} ${m.content || ''} ${m.objection || ''}`.toLowerCase();
      return keywords.some(k => text.includes(k.toLowerCase()));
    });
  };

  const multiYearEvidence = findEvidence(['multi-year', '2-year', '3-year', 'year contract', 'commitment']);
  const upfrontEvidence = findEvidence(['upfront', 'annual billing', 'prepayment', 'prepaid', 'cash flow']);
  const referenceEvidence = findEvidence(['reference', 'case study', 'marketing', 'logo', 'co-marketing']);
  const scopeEvidence = findEvidence(['support', 'onboarding', 'sla', 'scope', 'services']);
  const volumeEvidence = findEvidence(['seats', 'volume', 'tier', 'expansion', 'bundle', 'module']);

  const giveGetOptions = [];

  // Option 1: Multi-Year Term Commitment (Concession in exchange for contract length)
  const opt1Discount = Math.max(2, Math.min(requestedDiscountPercent, 10)); // e.g. 10%
  const opt1Years = 2;
  const opt1Econ = calculateDealEconomics({
    dealValue,
    requestedDiscountPercent,
    proposedDiscountPercent: opt1Discount,
    contractYears: opt1Years
  });
  const opt1HasEvidence = multiYearEvidence.length > 0;
  const opt1WinningEv = multiYearEvidence.filter(e => e.outcome === 'WON');
  giveGetOptions.push({
    id: 'give_get_multi_year',
    title: 'Multi-Year Term Commitment',
    category: 'TERM_COMMITMENT',
    give: {
      concessionPercent: opt1Discount,
      concessionAmount: opt1Econ.proposedConcession,
      description: `${opt1Discount}% price concession on annual software license.`
    },
    get: {
      requirement: '2-Year Contract Lock-in (Annual Upfront)',
      description: `Customer commits to a 24-month agreement, securing guaranteed recurring revenue.`
    },
    financialImpact: {
      annualNetRevenue: opt1Econ.netRevenueProposed,
      totalContractValue: opt1Econ.netRevenueProposed * opt1Years,
      concessionSavings: opt1Econ.concessionSavings,
      formattedTCV: `$${(opt1Econ.netRevenueProposed * opt1Years).toLocaleString()}`,
      formattedAnnual: `$${opt1Econ.netRevenueProposed.toLocaleString()}`,
      formattedSavings: `+$${opt1Econ.concessionSavings.toLocaleString()}`
    },
    evidence: {
      isBacked: opt1HasEvidence,
      sourceIds: multiYearEvidence.map(e => e.dealId || e.deal_id).filter(Boolean),
      sampleCount: multiYearEvidence.length,
      winCount: opt1WinningEv.length,
      evidenceSummary: opt1HasEvidence 
        ? `${opt1WinningEv.length}/${multiYearEvidence.length} past multi-year negotiation episodes closed with WON outcome.`
        : 'Suggested negotiation structure (no customer-specific multi-year precedent in memory).'
    },
    confidence: opt1HasEvidence ? (opt1WinningEv.length >= 2 ? 'HIGH' : 'MEDIUM') : 'SUGGESTED',
    explanation: `Granting a ${opt1Discount}% concession in exchange for a 2-year commitment locks in $${(opt1Econ.netRevenueProposed * opt1Years).toLocaleString()} in total contract value while preserving $${opt1Econ.concessionSavings.toLocaleString()} in annual concession revenue versus the full ${requestedDiscountPercent}% request.`,
    risksAndConditions: 'Requires legal contract term agreement and annual billing commitment.',
    approvalRequired: opt1Discount > threshold,
    approvalThreshold: threshold
  });

  // Option 2: 100% Upfront Annual Prepayment (Concession for cash flow & negative working capital)
  const opt2Discount = Math.max(1, Math.min(requestedDiscountPercent, 8)); // e.g. 8%
  const opt2Econ = calculateDealEconomics({
    dealValue,
    requestedDiscountPercent,
    proposedDiscountPercent: opt2Discount,
    contractYears: 1
  });
  const opt2HasEvidence = upfrontEvidence.length > 0;
  const opt2WinningEv = upfrontEvidence.filter(e => e.outcome === 'WON');
  giveGetOptions.push({
    id: 'give_get_upfront_payment',
    title: 'Upfront Annual Prepayment',
    category: 'PAYMENT_TERMS',
    give: {
      concessionPercent: opt2Discount,
      concessionAmount: opt2Econ.proposedConcession,
      description: `${opt2Discount}% discount against list price.`
    },
    get: {
      requirement: '100% Net-30 Upfront Annual Invoicing',
      description: 'Customer agrees to 100% payment within 30 days of contract signing, eliminating quarterly billing collections.'
    },
    financialImpact: {
      annualNetRevenue: opt2Econ.netRevenueProposed,
      totalContractValue: opt2Econ.netRevenueProposed,
      concessionSavings: opt2Econ.concessionSavings,
      formattedTCV: `$${opt2Econ.netRevenueProposed.toLocaleString()}`,
      formattedAnnual: `$${opt2Econ.netRevenueProposed.toLocaleString()}`,
      formattedSavings: `+$${opt2Econ.concessionSavings.toLocaleString()}`
    },
    evidence: {
      isBacked: opt2HasEvidence,
      sourceIds: upfrontEvidence.map(e => e.dealId || e.deal_id).filter(Boolean),
      sampleCount: upfrontEvidence.length,
      winCount: opt2WinningEv.length,
      evidenceSummary: opt2HasEvidence 
        ? `${opt2WinningEv.length}/${upfrontEvidence.length} past upfront prepayment deals closed successfully.`
        : 'Suggested negotiation structure (working capital acceleration trade-off).'
    },
    confidence: opt2HasEvidence ? 'HIGH' : 'SUGGESTED',
    explanation: `Accelerates cash collection by trading an ${opt2Discount}% concession for immediate 100% upfront payment, improving capital efficiency while retaining $${opt2Econ.concessionSavings.toLocaleString()} versus customer demand.`,
    risksAndConditions: 'Requires procurement sign-off on Net-30 payment terms.',
    approvalRequired: opt2Discount > threshold,
    approvalThreshold: threshold
  });

  // Option 3: Joint Case Study & Referenceability Rights (Concession for marketing assets)
  const opt3Discount = Math.max(1, Math.min(requestedDiscountPercent, 6)); // e.g. 6%
  const opt3Econ = calculateDealEconomics({
    dealValue,
    requestedDiscountPercent,
    proposedDiscountPercent: opt3Discount,
    contractYears: 1
  });
  const opt3HasEvidence = referenceEvidence.length > 0;
  giveGetOptions.push({
    id: 'give_get_case_study',
    title: 'Case Study & Reference Rights',
    category: 'MARKETING_RIGHTS',
    give: {
      concessionPercent: opt3Discount,
      concessionAmount: opt3Econ.proposedConcession,
      description: `${opt3Discount}% marketing co-participation concession.`
    },
    get: {
      requirement: 'Joint Public Case Study + 2 Reference Calls per Quarter',
      description: 'Customer signs co-marketing addendum granting named case study within 90 days of go-live and participating in prospect reference calls.'
    },
    financialImpact: {
      annualNetRevenue: opt3Econ.netRevenueProposed,
      totalContractValue: opt3Econ.netRevenueProposed,
      concessionSavings: opt3Econ.concessionSavings,
      formattedTCV: `$${opt3Econ.netRevenueProposed.toLocaleString()}`,
      formattedAnnual: `$${opt3Econ.netRevenueProposed.toLocaleString()}`,
      formattedSavings: `+$${opt3Econ.concessionSavings.toLocaleString()}`
    },
    evidence: {
      isBacked: opt3HasEvidence,
      sourceIds: referenceEvidence.map(e => e.dealId || e.deal_id).filter(Boolean),
      sampleCount: referenceEvidence.length,
      winCount: referenceEvidence.filter(e => e.outcome === 'WON').length,
      evidenceSummary: opt3HasEvidence
        ? `Historical precedent found: Referenceability commitments leveraged in past enterprise deals.`
        : 'Suggested negotiation option (strategic enterprise marketing value).'
    },
    confidence: opt3HasEvidence ? 'MEDIUM' : 'SUGGESTED',
    explanation: `Leverages a small ${opt3Discount}% discount to acquire enterprise social proof and customer advocacy assets that accelerate future pipeline velocity.`,
    risksAndConditions: 'Customer marketing/legal approval required for naming rights addendum.',
    approvalRequired: opt3Discount > threshold,
    approvalThreshold: threshold
  });

  // Option 4: Volume / Scope Expansion (Concession for higher tier/seat volume)
  const opt4Discount = Math.max(3, Math.min(requestedDiscountPercent, 12)); // e.g. 12%
  const opt4Econ = calculateDealEconomics({
    dealValue: Math.round(dealValue * 1.25), // 25% higher volume
    requestedDiscountPercent,
    proposedDiscountPercent: opt4Discount,
    contractYears: 1
  });
  const opt4HasEvidence = volumeEvidence.length > 0;
  giveGetOptions.push({
    id: 'give_get_volume_expansion',
    title: 'Volume & Scope Expansion',
    category: 'VOLUME_EXPANSION',
    give: {
      concessionPercent: opt4Discount,
      concessionAmount: opt4Econ.proposedConcession,
      description: `${opt4Discount}% tier discount across expanded scope.`
    },
    get: {
      requirement: '+25% Additional Seat Allocation or Secondary Module',
      description: 'Customer expands initial license scope to include 25% more users or an adjacent analytics module.'
    },
    financialImpact: {
      annualNetRevenue: opt4Econ.netRevenueProposed,
      totalContractValue: opt4Econ.netRevenueProposed,
      concessionSavings: opt4Econ.concessionSavings,
      formattedTCV: `$${opt4Econ.netRevenueProposed.toLocaleString()}`,
      formattedAnnual: `$${opt4Econ.netRevenueProposed.toLocaleString()}`,
      formattedSavings: `+$${opt4Econ.concessionSavings.toLocaleString()}`
    },
    evidence: {
      isBacked: opt4HasEvidence,
      sourceIds: volumeEvidence.map(e => e.dealId || e.deal_id).filter(Boolean),
      sampleCount: volumeEvidence.length,
      winCount: volumeEvidence.filter(e => e.outcome === 'WON').length,
      evidenceSummary: opt4HasEvidence
        ? `${volumeEvidence.filter(e => e.outcome === 'WON').length}/${volumeEvidence.length} volume bundle expansion deals closed with WON outcome.`
        : 'Suggested negotiation option (scope enlargement protects absolute gross margin).'
    },
    confidence: opt4HasEvidence ? 'HIGH' : 'SUGGESTED',
    explanation: `Offers a higher ${opt4Discount}% discount but expands total baseline contract scope by 25%, resulting in higher net revenue ($${opt4Econ.netRevenueProposed.toLocaleString()}) than the original un-discounted deal.`,
    risksAndConditions: 'Requires customer business unit demand to absorb expanded seat allocation.',
    approvalRequired: opt4Discount > threshold,
    approvalThreshold: threshold
  });

  // Option 5: SLA / Scope Adjustment (Full requested discount only with reduced support SLA)
  const opt5Discount = requestedDiscountPercent; // Full requested concession
  const opt5Econ = calculateDealEconomics({
    dealValue,
    requestedDiscountPercent,
    proposedDiscountPercent: opt5Discount,
    contractYears: 1
  });
  const opt5HasEvidence = scopeEvidence.length > 0;
  giveGetOptions.push({
    id: 'give_get_reduced_sla',
    title: 'Reduced Support Scope & SLA',
    category: 'SCOPE_ADJUSTMENT',
    give: {
      concessionPercent: opt5Discount,
      concessionAmount: opt5Econ.proposedConcession,
      description: `Full requested ${opt5Discount}% price discount.`
    },
    get: {
      requirement: 'Standard 9x5 Support SLA & Self-Guided Onboarding',
      description: 'Removes dedicated 24/7 technical support manager and in-person onboarding to protect delivery margins.'
    },
    financialImpact: {
      annualNetRevenue: opt5Econ.netRevenueProposed,
      totalContractValue: opt5Econ.netRevenueProposed,
      concessionSavings: 0,
      formattedTCV: `$${opt5Econ.netRevenueProposed.toLocaleString()}`,
      formattedAnnual: `$${opt5Econ.netRevenueProposed.toLocaleString()}`,
      formattedSavings: `$0`
    },
    evidence: {
      isBacked: opt5HasEvidence,
      sourceIds: scopeEvidence.map(e => e.dealId || e.deal_id).filter(Boolean),
      sampleCount: scopeEvidence.length,
      winCount: scopeEvidence.filter(e => e.outcome === 'WON').length,
      evidenceSummary: opt5HasEvidence
        ? `Historical evidence indicates removing premium services protects delivery margin on deep discounts.`
        : 'Suggested negotiation option (margin protection through COGS de-scoping).'
    },
    confidence: opt5HasEvidence ? 'MEDIUM' : 'SUGGESTED',
    explanation: `Allows meeting the customer's exact price target (${opt5Discount}%) by removing non-essential support overhead, ensuring internal delivery margins remain compliant.`,
    risksAndConditions: 'Customer must agree to standard support response times (24h vs 1h SLA).',
    approvalRequired: opt5Discount > threshold,
    approvalThreshold: threshold
  });

  return {
    dealId: dealContext.dealId || dealContext.deal_id,
    customer,
    segment,
    dealValue,
    requestedDiscountPercent,
    recommendations: giveGetOptions,
    summary: {
      totalOptions: giveGetOptions.length,
      evidenceBackedCount: giveGetOptions.filter(o => o.evidence.isBacked).length,
      approvalRequiredCount: giveGetOptions.filter(o => o.approvalRequired).length
    }
  };
}

