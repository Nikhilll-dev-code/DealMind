import { db } from '../db/database.js';
import { config } from '../config.js';
import { calculateDealEconomics } from './economicsEngine.js';

export function checkApprovalRequired(requestedDiscount) {
  const threshold = config.managerApprovalThreshold || 15;
  const numDiscount = Number(requestedDiscount) || 0;
  return {
    required: numDiscount > threshold,
    threshold,
    requestedDiscount: numDiscount,
    reason: numDiscount > threshold 
      ? `Requested discount (${numDiscount}%) exceeds salesperson authorization threshold (${threshold}%). Manager approval required before offering concession.`
      : 'Standard discount within authorized limits.'
  };
}

export function createPendingApproval(deal, proposedStrategy = '', requestedBy = null, tenantId = 'tenant_default') {
  const approvalId = `APP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const threshold = config.managerApprovalThreshold || 15;
  const requestedDiscount = Number(deal.requestedDiscountPercent || deal.requested_discount_percent) || 0;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (24 * 60 * 60 * 1000)).toISOString(); // 24hr expiration
  const finalTenantId = deal.tenantId || deal.tenant_id || tenantId || 'tenant_default';

  db.prepare(`
    INSERT INTO negotiation_approvals (
      tenant_id, approval_id, deal_id, customer, requested_discount, threshold_discount,
      proposed_strategy, status, requested_by, manager_name, reason, decision_notes,
      expires_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    finalTenantId,
    approvalId,
    deal.dealId || deal.deal_id || 'DEAL-NEW',
    deal.customer,
    requestedDiscount,
    threshold,
    proposedStrategy || deal.strategy || '8% discount + support',
    'PENDING',
    requestedBy || deal.salesperson || 'sales_rep',
    null,
    `Discount of ${requestedDiscount}% requires manager sign-off.`,
    null,
    expiresAt,
    now.toISOString(),
    now.toISOString()
  );

  return db.prepare('SELECT * FROM negotiation_approvals WHERE approval_id = ?').get(approvalId);
}

export function processApprovalDecision(approvalId, decisionData = {}) {
  const approval = db.prepare('SELECT * FROM negotiation_approvals WHERE approval_id = ?').get(approvalId);
  if (!approval) {
    throw new Error(`Approval record ${approvalId} not found.`);
  }

  // Strict Tenant Boundary: Caller must belong to the exact same tenant (ADMIN is tenant-scoped)
  const callerTenantId = decisionData.tenantId || 'tenant_default';
  const callerRole = String(decisionData.role || 'MANAGER').toUpperCase();

  if (approval.tenant_id !== callerTenantId) {
    throw new Error(`Forbidden: Tenant mismatch. You cannot approve records for tenant ${approval.tenant_id}.`);
  }

  // Check if already processed (Idempotency & Concurrent Conflict Protection)
  if (approval.status !== 'PENDING') {
    if (decisionData.idempotencyKey) {
      return approval; // Safe return of existing processed state
    }
    throw new Error(`Approval ${approvalId} has already been processed with status: ${approval.status}.`);
  }

  // Check expiration
  if (new Date() > new Date(approval.expires_at)) {
    db.prepare(`UPDATE negotiation_approvals SET status = 'EXPIRED', updated_at = ? WHERE approval_id = ?`)
      .run(new Date().toISOString(), approvalId);
    throw new Error(`Approval request ${approvalId} has expired.`);
  }

  // Role verification: Salespeople cannot approve
  if (callerRole === 'SALESPERSON' || callerRole === 'SALES_REP') {
    throw new Error('Unauthorized: Sales representatives cannot approve concession requests exceeding policy thresholds.');
  }

  const managerName = String(decisionData.managerName || decisionData.displayName || decisionData.userId || 'Sales VP / Deal Desk').trim();
  const requester = String(approval.requested_by || '').trim().toLowerCase();

  // Strict Anti-Self-Approval Rule: Requester cannot approve their own deal (applies to both MANAGER and ADMIN)
  if (requester && (
    managerName.toLowerCase() === requester ||
    (decisionData.userId && String(decisionData.userId).toLowerCase() === requester) ||
    (decisionData.email && String(decisionData.email).toLowerCase() === requester)
  )) {
    throw new Error('Unauthorized: Requester cannot self-approve concession requests exceeding policy thresholds.');
  }

  const validStatuses = ['APPROVED', 'REJECTED', 'MODIFIED'];
  const status = (decisionData.status || 'APPROVED').toUpperCase();
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid approval decision status: ${status}. Must be APPROVED, REJECTED, or MODIFIED.`);
  }

  // Mandatory Decision Notes
  const rawNotes = decisionData.decisionNotes || decisionData.notes || '';
  if (!rawNotes || !String(rawNotes).trim()) {
    throw new Error('Validation error: A non-empty decision note is mandatory when recording an approval decision.');
  }

  let finalNotes = String(rawNotes).trim();
  let recalculatedEconomics = null;

  if (status === 'MODIFIED') {
    if (decisionData.modifiedDiscount === undefined || decisionData.modifiedDiscount === null || isNaN(Number(decisionData.modifiedDiscount))) {
      throw new Error('Validation error: A valid modified discount percentage is required for MODIFIED status.');
    }
    const modDisc = Number(decisionData.modifiedDiscount);
    if (modDisc < 0 || modDisc > 100) {
      throw new Error('Validation error: Modified discount percentage must be between 0 and 100.');
    }
    finalNotes = `MODIFIED concession to ${modDisc}%. ${finalNotes}`;

    // Recalculate economics for modified discount
    const dealRow = db.prepare('SELECT * FROM negotiations WHERE deal_id = ? AND tenant_id = ?').get(approval.deal_id, approval.tenant_id);
    if (dealRow) {
      recalculatedEconomics = calculateDealEconomics({
        dealValue: dealRow.initial_offer || 100000,
        requestedDiscountPercent: approval.requested_discount,
        proposedDiscountPercent: modDisc,
        contractYears: dealRow.contract_years || 1
      });
    }
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE negotiation_approvals
    SET status = ?, manager_name = ?, decision_notes = ?, updated_at = ?
    WHERE approval_id = ?
  `).run(
    status,
    managerName,
    finalNotes,
    now,
    approvalId
  );

  const updatedRecord = db.prepare('SELECT * FROM negotiation_approvals WHERE approval_id = ?').get(approvalId);
  return {
    ...updatedRecord,
    recalculatedEconomics
  };
}

export function getApprovalByDealId(dealId, tenantId = 'tenant_default') {
  return db.prepare('SELECT * FROM negotiation_approvals WHERE deal_id = ? AND tenant_id = ? ORDER BY created_at DESC LIMIT 1').get(dealId, tenantId);
}

export function listPendingApprovals(tenantId = 'tenant_default') {
  return db.prepare("SELECT * FROM negotiation_approvals WHERE status = 'PENDING' AND tenant_id = ? ORDER BY created_at DESC").all(tenantId);
}
