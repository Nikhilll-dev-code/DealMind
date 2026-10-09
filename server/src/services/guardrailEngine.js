import { db } from '../db/database.js';
import { config } from '../config.js';

/**
 * Company Guardrails Engine (spec §9)
 *
 * Deterministic, server-side company limits. These values are the source of
 * truth for what may be offered. LLM output can never override them — any
 * request above the configured ceiling is refused/escalated here in code.
 */

const DEFAULT_GUARDRAILS = {
  max_discount_percent: 25,
  manager_approval_threshold: config.managerApprovalThreshold || 15,
  min_contract_years: 1,
  max_contract_years: 5,
  require_support_bundle_above: 10,
  escalation_message:
    'This request exceeds approved negotiation limits and has been escalated to a company manager for review.'
};

export function getGuardrails(tenantId = 'tenant_default') {
  try {
    const row = db.prepare('SELECT * FROM guardrails WHERE tenant_id = ?').get(tenantId);
    if (row) return row;
  } catch (e) {
    // table may not exist on older DBs until initDatabase runs
  }
  return { tenant_id: tenantId, ...DEFAULT_GUARDRAILS, updated_at: null, updated_by: null };
}

export function saveGuardrails(tenantId = 'tenant_default', updates = {}, updatedBy = null) {
  const current = getGuardrails(tenantId);
  const merged = {
    max_discount_percent: clampNumber(updates.max_discount_percent, current.max_discount_percent, 0, 100),
    manager_approval_threshold: clampNumber(updates.manager_approval_threshold, current.manager_approval_threshold, 0, 100),
    min_contract_years: clampNumber(updates.min_contract_years, current.min_contract_years, 1, 20),
    max_contract_years: clampNumber(updates.max_contract_years, current.max_contract_years, 1, 20),
    require_support_bundle_above: clampNumber(updates.require_support_bundle_above, current.require_support_bundle_above, 0, 100),
    escalation_message: typeof updates.escalation_message === 'string' && updates.escalation_message.trim()
      ? updates.escalation_message.trim().slice(0, 500)
      : current.escalation_message
  };

  // Integrity: min term cannot exceed max term
  if (merged.min_contract_years > merged.max_contract_years) {
    merged.min_contract_years = merged.max_contract_years;
  }

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO guardrails (
      tenant_id, max_discount_percent, manager_approval_threshold,
      min_contract_years, max_contract_years, require_support_bundle_above,
      escalation_message, updated_at, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(tenant_id) DO UPDATE SET
      max_discount_percent = excluded.max_discount_percent,
      manager_approval_threshold = excluded.manager_approval_threshold,
      min_contract_years = excluded.min_contract_years,
      max_contract_years = excluded.max_contract_years,
      require_support_bundle_above = excluded.require_support_bundle_above,
      escalation_message = excluded.escalation_message,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by
  `).run(
    tenantId,
    merged.max_discount_percent,
    merged.manager_approval_threshold,
    merged.min_contract_years,
    merged.max_contract_years,
    merged.require_support_bundle_above,
    merged.escalation_message,
    now,
    updatedBy
  );

  return getGuardrails(tenantId);
}

/**
 * Evaluate a proposed negotiation request against company guardrails.
 * Deterministic — no LLM involvement.
 */
export function checkGuardrails({ requestedDiscountPercent = 0, proposedDiscountPercent = null, contractYears = 1, includeSupport = false }, tenantId = 'tenant_default') {
  const g = getGuardrails(tenantId);
  const requested = Number(requestedDiscountPercent) || 0;
  const proposed = proposedDiscountPercent === null ? requested : Number(proposedDiscountPercent) || 0;
  const years = Number(contractYears) || 1;

  const violations = [];
  const warnings = [];

  // Hard ceiling — cannot be bypassed
  const hardBreach = requested > g.max_discount_percent;
  if (hardBreach) {
    violations.push(
      `Requested discount ${requested}% exceeds the company maximum of ${g.max_discount_percent}%.`
    );
  }

  if (years < g.min_contract_years) {
    violations.push(`Contract term ${years}yr is below the minimum of ${g.min_contract_years}yr.`);
  }
  if (years > g.max_contract_years) {
    violations.push(`Contract term ${years}yr exceeds the maximum of ${g.max_contract_years}yr.`);
  }

  // Soft conditions
  const requiresApproval = proposed > g.manager_approval_threshold;
  if (requiresApproval) {
    warnings.push(
      `Proposed discount ${proposed}% requires manager approval (threshold ${g.manager_approval_threshold}%).`
    );
  }
  if (proposed > g.require_support_bundle_above && !includeSupport) {
    warnings.push(
      `Discounts above ${g.require_support_bundle_above}% should be paired with a value-add support bundle.`
    );
  }

  return {
    tenantId,
    allowed: !hardBreach,
    requiresApproval,
    mustEscalate: hardBreach,
    ceiling: g.max_discount_percent,
    approvalThreshold: g.manager_approval_threshold,
    requestedDiscountPercent: requested,
    proposedDiscountPercent: proposed,
    violations,
    warnings,
    escalationMessage: hardBreach ? g.escalation_message : null,
    guardrails: g
  };
}

/**
 * Clamp a requested discount to the enforced ceiling. Returns the enforceable
 * discount the system may actually offer, plus the raw request.
 */
export function enforceDiscountCeiling(requestedDiscountPercent, tenantId = 'tenant_default') {
  const g = getGuardrails(tenantId);
  const requested = Number(requestedDiscountPercent) || 0;
  return {
    requested,
    enforceable: Math.min(requested, g.max_discount_percent),
    ceiling: g.max_discount_percent,
    clamped: requested > g.max_discount_percent
  };
}

function clampNumber(value, fallback, min, max) {
  const n = Number(value);
  if (isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
