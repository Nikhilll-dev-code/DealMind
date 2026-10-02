import { verifyAccessToken } from '../services/authService.js';
import { hasPermission, PERMISSIONS, getPermissionsForRole } from '../config/permissions.js';

export { PERMISSIONS, hasPermission, getPermissionsForRole };

/**
 * Enforce valid JWT Authentication on protected routes
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      code: 'AUTH_REQUIRED',
      message: 'Authentication token required. Provide valid Bearer token in Authorization header.'
    });
  }

  const token = authHeader.slice(7).trim();
  const claims = verifyAccessToken(token);

  if (!claims) {
    return res.status(401).json({
      error: 'Unauthorized',
      code: 'TOKEN_INVALID_OR_EXPIRED',
      message: 'Access token is invalid, expired, or has an unverified signature.'
    });
  }

  // Populate trusted server-side identity
  req.user = {
    userId: claims.userId,
    email: claims.email,
    displayName: claims.displayName,
    role: String(claims.role || 'SALESPERSON').toUpperCase(),
    tenantId: claims.tenantId || 'tenant_default'
  };

  next();
}

/**
 * Enforce minimum role level for role-gated endpoints
 * @param {string[]} allowedRoles - Array of roles allowed (e.g. ['ADMIN', 'MANAGER'])
 */
export function requireRole(allowedRoles = []) {
  const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());

  return function roleMiddleware(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'AUTH_REQUIRED',
        message: 'Authentication required before evaluating role access.'
      });
    }

    if (!normalizedAllowed.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `Role '${req.user.role}' does not have sufficient authorization. Required: ${allowedRoles.join(' or ')}.`
      });
    }

    next();
  };
}

/**
 * Enforce specific permission for fine-grained authorization
 * @param {string} permission - Permission string from PERMISSIONS registry
 */
export function requirePermission(permission) {
  return function permissionMiddleware(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'AUTH_REQUIRED',
        message: 'Authentication required before evaluating permissions.'
      });
    }

    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        error: 'Forbidden',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredPermission: permission,
        message: `Role '${req.user.role}' does not have permission '${permission}'.`
      });
    }

    next();
  };
}

/**
 * Enforce tenant boundary isolation.
 * Important: ADMIN is a tenant administrator, not a cross-tenant superuser.
 */
export function requireTenantAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      code: 'AUTH_REQUIRED'
    });
  }

  const targetTenantId = req.params?.tenantId || req.query?.tenantId || req.body?.tenantId;

  // Strict tenant boundary: Even ADMIN cannot access or mutate resources of another tenant
  if (targetTenantId && targetTenantId !== req.user.tenantId) {
    return res.status(403).json({
      error: 'Forbidden',
      code: 'TENANT_ACCESS_DENIED',
      message: `Cross-tenant access prohibited. You cannot access resources outside your tenant (${req.user.tenantId}).`
    });
  }

  next();
}

/**
 * Optional Auth middleware: populates req.user if token is present and valid
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const claims = verifyAccessToken(token);
    if (claims) {
      req.user = {
        userId: claims.userId,
        email: claims.email,
        displayName: claims.displayName,
        role: String(claims.role || 'SALESPERSON').toUpperCase(),
        tenantId: claims.tenantId || 'tenant_default'
      };
    }
  }
  next();
}
