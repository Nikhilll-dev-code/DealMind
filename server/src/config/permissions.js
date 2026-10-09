/**
 * DealMind 3.0 Centralized Role-Based Access Control (RBAC) Permissions Registry
 */

export const PERMISSIONS = {
  // Deal & Workspace Operations
  DEALS_CREATE: 'deals:create',
  DEALS_ANALYZE: 'deals:analyze',
  DEALS_VIEW: 'deals:view',
  DEALS_SIMULATE: 'deals:simulate',
  DEALS_RECORD_OUTCOME: 'deals:record_outcome',

  // Memory & Learning
  MEMORY_VIEW: 'memory:view',
  LEARNING_VIEW: 'learning:view',

  // Approval Governance
  APPROVALS_VIEW: 'approvals:view',
  APPROVALS_DECIDE: 'approvals:decide',

  // Infrastructure & Operations
  INFRASTRUCTURE_VIEW: 'infrastructure:view',
  INFRASTRUCTURE_MANAGE_OUTBOX: 'infrastructure:manage_outbox',

  // Dataset Intelligence (spec §7)
  DATASET_VIEW: 'dataset:view',
  DATASET_MANAGE: 'dataset:manage',

  // Company Guardrails (spec §9)
  GUARDRAILS_VIEW: 'guardrails:view',
  GUARDRAILS_MANAGE: 'guardrails:manage',

  // Analytics & Governance (spec §6)
  ANALYTICS_VIEW: 'analytics:view',

  // Tenant Admin & Lifecycle
  DATABASE_RESET: 'database:reset',
  USERS_MANAGE: 'users:manage',
  AUDIT_VIEW: 'audit:view'
};

// Customer permissions: a buyer negotiating directly with DealMind.
// Deliberately excludes memory explorer, dataset, guardrails, analytics,
// infrastructure, approvals, and other customers' data (spec §2, §5).
const CUSTOMER_PERMISSIONS = [
  PERMISSIONS.DEALS_CREATE,
  PERMISSIONS.DEALS_ANALYZE,
  PERMISSIONS.DEALS_VIEW,
  PERMISSIONS.DEALS_SIMULATE,
  PERMISSIONS.DEALS_RECORD_OUTCOME
];

// Base permissions shared by all Sales Representatives (Two-Role spec §2).
const SALESPERSON_PERMISSIONS = [
  PERMISSIONS.DEALS_CREATE,
  PERMISSIONS.DEALS_ANALYZE,
  PERMISSIONS.DEALS_VIEW,
  PERMISSIONS.DEALS_SIMULATE,
  PERMISSIONS.DEALS_RECORD_OUTCOME,
  PERMISSIONS.MEMORY_VIEW,
  PERMISSIONS.LEARNING_VIEW,
  PERMISSIONS.APPROVALS_VIEW
];

// Admin permissions: everything organizational (Two-Role spec §2, §38).
// Admin is now also the approval authority (spec §3, §58) — there is no Manager role.
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

export const ROLE_PERMISSIONS_MAP = {
  CUSTOMER: new Set(CUSTOMER_PERMISSIONS),
  SALESPERSON: new Set(SALESPERSON_PERMISSIONS),
  SALES_REP: new Set(SALESPERSON_PERMISSIONS),
  // MANAGER is kept only as a legacy alias of SALESPERSON so pre-existing tokens
  // and rows do not break; no Manager capabilities remain (Two-Role spec §3, §102).
  MANAGER: new Set(SALESPERSON_PERMISSIONS),
  ADMIN: new Set(ADMIN_PERMISSIONS)
};

/**
 * Role family for hard application separation (DealMind 3.0 Two-Role spec §4, §18).
 * ADMIN  -> Admin console (organizational intelligence/control).
 * CUSTOMER -> legacy customer-negotiation app (kept for compatibility, not primary).
 * everything else (SALESPERSON/MANAGER) -> Sales Representative workspace.
 */
export function getRoleFamily(role) {
  const normalized = String(role || '').toUpperCase();
  if (normalized === 'ADMIN') return 'ADMIN';
  if (normalized === 'CUSTOMER') return 'CUSTOMER';
  return 'SALES';
}

/**
 * Check whether a role possesses a specific permission
 * @param {string} role - User role (e.g. 'SALESPERSON', 'MANAGER', 'ADMIN')
 * @param {string} permission - Permission string (e.g. 'approvals:decide')
 * @returns {boolean}
 */
export function hasPermission(role, permission) {
  if (!role || !permission) return false;
  const normalizedRole = String(role).toUpperCase();
  const permissionsSet = ROLE_PERMISSIONS_MAP[normalizedRole];
  return permissionsSet ? permissionsSet.has(permission) : false;
}

/**
 * Get all permissions assigned to a given role
 * @param {string} role
 * @returns {string[]}
 */
export function getPermissionsForRole(role) {
  if (!role) return [];
  const normalizedRole = String(role).toUpperCase();
  const permissionsSet = ROLE_PERMISSIONS_MAP[normalizedRole];
  return permissionsSet ? Array.from(permissionsSet) : [];
}
