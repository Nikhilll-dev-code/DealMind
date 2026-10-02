import { db } from '../db/database.js';

// Pre-compile queries for high-performance execution
const getDealStmt = db.prepare(`SELECT * FROM negotiations WHERE (deal_id = ? OR id = ?) AND tenant_id = ?`);
const getApprovalStmt = db.prepare(`SELECT * FROM negotiation_approvals WHERE deal_id = ? AND tenant_id = ? ORDER BY created_at DESC LIMIT 1`);
const getCompletedDealsStmt = db.prepare(`SELECT * FROM negotiations WHERE tenant_id = ? AND outcome IN ('WON', 'LOST') ORDER BY date DESC`);
const getAllTenantApprovalsStmt = db.prepare(`SELECT * FROM negotiation_approvals WHERE tenant_id = ? ORDER BY created_at DESC`);

/**
 * FEATURE E: Negotiation Decision Drift & Outcome Attribution Engine
 * Tracks the 4-stage lifecycle: AI Proposed -> Manager Decided -> Rep Executed -> Final Outcome.
 * Strictly adheres to observational analysis without unfounded causal claims.
 */
export function analyzeDecisionDrift(dealId, tenantId = 'tenant_default', preloadedApproval = null) {
  const deal = getDealStmt.get(dealId, dealId, tenantId);

  if (!deal) {
    return null;
  }

  const approval = preloadedApproval !== undefined ? preloadedApproval : getApprovalStmt.get(deal.deal_id, tenantId);

  // Extract AI recommendation baseline
  const requestedDiscount = Number(deal.requested_discount_percent) || 20;
  const aiProposedDiscount = Math.max(1, Math.round(requestedDiscount * 0.4));
  const aiStrategy = deal.strategy || '8% Discount + Premium Support';

  // Extract Manager Decision
  let managerStatus = 'NOT_REQUIRED';
  let managerApprovedDiscount = aiProposedDiscount;
  let managerNotes = 'No manager escalation required (discount within standard limits).';
  let managerName = null;
  let managerTimestamp = null;

  if (approval) {
    managerStatus = approval.status;
    managerNotes = approval.decision_notes || approval.reason || '';
    managerName = approval.manager_name;
    managerTimestamp = approval.updated_at;

    if (approval.status === 'APPROVED') {
      managerApprovedDiscount = approval.requested_discount;
    } else if (approval.status === 'MODIFIED') {
      const match = (approval.decision_notes || '').match(/(\d+(\.\d+)?)%/);
      managerApprovedDiscount = match ? Number(match[1]) : 10;
    } else if (approval.status === 'REJECTED') {
      managerApprovedDiscount = aiProposedDiscount;
    }
  }

  // Extract Salesperson Actual Concession
  const actualConcession = Number(deal.concession_percent) || 0;
  const chosenStrategy = deal.chosen_strategy || deal.strategy || 'Standard concession';

  // Compute Drift Metrics
  const aiToManagerDrift = managerApprovedDiscount - aiProposedDiscount;
  const managerToActualDrift = actualConcession - managerApprovedDiscount;
  const totalConcessionDrift = actualConcession - aiProposedDiscount;
  const strategyDeviated = chosenStrategy.toLowerCase() !== aiStrategy.toLowerCase();

  // Attribution Narrative
  let driftSummary = '';
  if (!approval) {
    driftSummary = `AI recommended ${aiProposedDiscount}% concession. Sales rep granted ${actualConcession}% final concession. Final outcome: ${deal.outcome}.`;
  } else if (approval.status === 'APPROVED') {
    driftSummary = `AI recommended ${aiProposedDiscount}%, customer requested ${approval.requested_discount}%. Manager approved ${approval.requested_discount}%. Sales rep executed ${actualConcession}% concession. Outcome: ${deal.outcome}.`;
  } else if (approval.status === 'MODIFIED') {
    driftSummary = `Manager modified requested concession to ${managerApprovedDiscount}%. Sales rep executed ${actualConcession}%. Outcome: ${deal.outcome}.`;
  } else {
    driftSummary = `Manager rejected concession. Sales rep offered ${actualConcession}%. Outcome: ${deal.outcome}.`;
  }

  return {
    dealId: deal.deal_id,
    customer: deal.customer,
    tenantId,
    dealValue: deal.initial_offer,
    stages: {
      step1_aiRecommendation: {
        stage: 'AI Recommendation',
        proposedDiscountPercent: aiProposedDiscount,
        proposedStrategy: aiStrategy,
        recommendedAt: deal.created_at
      },
      step2_managerGovernance: {
        stage: 'Manager Approval / Governance',
        status: managerStatus,
        approvedDiscountPercent: managerApprovedDiscount,
        managerName: managerName || 'N/A',
        decisionNotes: managerNotes,
        decidedAt: managerTimestamp
      },
      step3_salespersonExecution: {
        stage: 'Salesperson Final Concession',
        actualConcessionPercent: actualConcession,
        chosenStrategy: chosenStrategy,
        executedAt: deal.date
      },
      step4_recordedOutcome: {
        stage: 'Recorded Customer Outcome',
        outcome: deal.outcome,
        outcomeReason: deal.outcome_reason || 'Deal concluded.'
      }
    },
    driftAnalysis: {
      aiProposedDiscount,
      managerApprovedDiscount,
      actualConcessionPercent: actualConcession,
      aiToManagerDrift,
      managerToActualDrift,
      totalConcessionDrift,
      strategyDeviated,
      driftSummary,
      attributionDisclaimer: 'Attribution reflects recorded decision sequence in DealMind. Correlation does not establish sole causality for win/loss outcomes.'
    }
  };
}

/**
 * Aggregates decision drift across all completed negotiations in a tenant with batch preloading.
 */
export function getTenantDecisionDriftSummary(tenantId = 'tenant_default') {
  const deals = getCompletedDealsStmt.all(tenantId);

  if (deals.length === 0) {
    return {
      tenantId,
      totalCompletedDeals: 0,
      averageConcessionPercent: 0,
      alignedWithAiCount: 0,
      modifiedByManagerCount: 0,
      repDeviatedCount: 0,
      winRateByAlignment: {
        alignedWithAi: { count: 0, wins: 0, winRate: 0 },
        deviated: { count: 0, wins: 0, winRate: 0 }
      },
      deals: []
    };
  }

  // Pre-load approvals to avoid N+1 queries
  const allApprovals = getAllTenantApprovalsStmt.all(tenantId);
  const approvalMap = new Map();
  for (const app of allApprovals) {
    if (!approvalMap.has(app.deal_id)) {
      approvalMap.set(app.deal_id, app);
    }
  }

  const detailedDeals = deals.map(d => analyzeDecisionDrift(d.deal_id, tenantId, approvalMap.get(d.deal_id) || null)).filter(Boolean);

  const alignedDeals = detailedDeals.filter(d => Math.abs(d.driftAnalysis.totalConcessionDrift) <= 2 && !d.driftAnalysis.strategyDeviated);
  const deviatedDeals = detailedDeals.filter(d => Math.abs(d.driftAnalysis.totalConcessionDrift) > 2 || d.driftAnalysis.strategyDeviated);

  const alignedWins = alignedDeals.filter(d => d.stages.step4_recordedOutcome.outcome === 'WON').length;
  const deviatedWins = deviatedDeals.filter(d => d.stages.step4_recordedOutcome.outcome === 'WON').length;

  const totalConcessions = deals.reduce((acc, d) => acc + d.concession_percent, 0);

  return {
    tenantId,
    totalCompletedDeals: deals.length,
    averageConcessionPercent: Number((totalConcessions / deals.length).toFixed(1)),
    alignedWithAiCount: alignedDeals.length,
    repDeviatedCount: deviatedDeals.length,
    winRateByAlignment: {
      alignedWithAi: {
        count: alignedDeals.length,
        wins: alignedWins,
        winRate: alignedDeals.length > 0 ? Math.round((alignedWins / alignedDeals.length) * 100) : 0
      },
      deviated: {
        count: deviatedDeals.length,
        wins: deviatedWins,
        winRate: deviatedDeals.length > 0 ? Math.round((deviatedWins / deviatedDeals.length) * 100) : 0
      }
    },
    deals: detailedDeals.slice(0, 15) // Top 15 recent drift analyses
  };
}
