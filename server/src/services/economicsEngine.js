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
