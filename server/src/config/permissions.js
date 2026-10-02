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

  // Tenant Admin & Lifecycle
  DATABASE_RESET: 'database:reset',
  USERS_MANAGE: 'users:manage',
  AUDIT_VIEW: 'audit:view'
};

// Base permissions shared by all authenticated sales representatives
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

// Manager permissions: Salesperson capabilities + approval decision authority + outbox management + infrastructure view
const MANAGER_PERMISSIONS = [
  ...SALESPERSON_PERMISSIONS,
  PERMISSIONS.APPROVALS_DECIDE,
  PERMISSIONS.INFRASTRUCTURE_VIEW,
  PERMISSIONS.INFRASTRUCTURE_MANAGE_OUTBOX,
  PERMISSIONS.AUDIT_VIEW
];

// Admin permissions: Manager capabilities + tenant database reset and user management
const ADMIN_PERMISSIONS = [
  ...MANAGER_PERMISSIONS,
  PERMISSIONS.DATABASE_RESET,
  PERMISSIONS.USERS_MANAGE
];

export const ROLE_PERMISSIONS_MAP = {
  SALESPERSON: new Set(SALESPERSON_PERMISSIONS),
  SALES_REP: new Set(SALESPERSON_PERMISSIONS),
  MANAGER: new Set(MANAGER_PERMISSIONS),
  ADMIN: new Set(ADMIN_PERMISSIONS)
};

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
