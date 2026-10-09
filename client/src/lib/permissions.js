/**
 * Client-side mirror of the server RBAC registry (server/src/config/permissions.js).
 * Used only to hide/disable navigation; every request is still authorized server-side.
 */

export const PERMISSIONS = {
  DEALS_CREATE: 'deals:create',
  DEALS_ANALYZE: 'deals:analyze',
  DEALS_VIEW: 'deals:view',
  DEALS_SIMULATE: 'deals:simulate',
  DEALS_RECORD_OUTCOME: 'deals:record_outcome',
  MEMORY_VIEW: 'memory:view',
  LEARNING_VIEW: 'learning:view',
  APPROVALS_VIEW: 'approvals:view',
  APPROVALS_DECIDE: 'approvals:decide',
  INFRASTRUCTURE_VIEW: 'infrastructure:view',
  INFRASTRUCTURE_MANAGE_OUTBOX: 'infrastructure:manage_outbox',
  DATASET_VIEW: 'dataset:view',
  DATASET_MANAGE: 'dataset:manage',
  GUARDRAILS_VIEW: 'guardrails:view',
  GUARDRAILS_MANAGE: 'guardrails:manage',
  ANALYTICS_VIEW: 'analytics:view',
  DATABASE_RESET: 'database:reset',
  USERS_MANAGE: 'users:manage',
  AUDIT_VIEW: 'audit:view'
};

const CUSTOMER_PERMISSIONS = [
  PERMISSIONS.DEALS_CREATE,
  PERMISSIONS.DEALS_ANALYZE,
  PERMISSIONS.DEALS_VIEW,
  PERMISSIONS.DEALS_SIMULATE,
  PERMISSIONS.DEALS_RECORD_OUTCOME
];

const SALESPERSON_PERMISSIONS = [
  ...CUSTOMER_PERMISSIONS,
  PERMISSIONS.MEMORY_VIEW,
  PERMISSIONS.LEARNING_VIEW,
  PERMISSIONS.APPROVALS_VIEW
];

// Two-Role spec §2/§3: Admin holds all organizational authority (including approvals).
// There is no Manager role.
const ADMIN_PERMISSIONS = [
  ...SALESPERSON_PERMISSIONS,
  PERMISSIONS.APPROVALS_DECIDE,
  PERMISSIONS.INFRASTRUCTURE_VIEW,
  PERMISSIONS.INFRASTRUCTURE_MANAGE_OUTBOX,
  PERMISSIONS.DATASET_VIEW,
  PERMISSIONS.DATASET_MANAGE,
  PERMISSIONS.GUARDRAILS_VIEW,
  PERMISSIONS.GUARDRAILS_MANAGE,
  PERMISSIONS.ANALYTICS_VIEW,
  PERMISSIONS.AUDIT_VIEW,
  PERMISSIONS.DATABASE_RESET,
  PERMISSIONS.USERS_MANAGE
];

const ROLE_PERMISSIONS_MAP = {
  CUSTOMER: new Set(CUSTOMER_PERMISSIONS),
  SALESPERSON: new Set(SALESPERSON_PERMISSIONS),
  SALES_REP: new Set(SALESPERSON_PERMISSIONS),
  // Legacy alias only: no Manager capabilities remain (spec §3).
  MANAGER: new Set(SALESPERSON_PERMISSIONS),
  ADMIN: new Set(ADMIN_PERMISSIONS)
};

export function hasPermission(role, permission) {
  if (!role || !permission) return false;
  const set = ROLE_PERMISSIONS_MAP[String(role).toUpperCase()];
  return set ? set.has(permission) : false;
}

/**
 * Role family for hard application separation (Two-Role spec §4, §18).
 * ADMIN -> admin console; CUSTOMER -> legacy customer app; otherwise Sales Rep workspace.
 */
export function getRoleFamily(role) {
  const normalized = String(role || '').toUpperCase();
  if (normalized === 'ADMIN') return 'ADMIN';
  if (normalized === 'CUSTOMER') return 'CUSTOMER';
  return 'SALES';
}
