import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';
import { config } from '../config.js';

const SALT_ROUNDS = 10;

export async function hashPassword(password) {
  if (!password || typeof password !== 'string' || password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password, hash) {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(user) {
  const payload = {
    userId: user.userId || user.id,
    email: user.email,
    displayName: user.displayName || user.display_name,
    role: user.role,
    tenantId: user.tenantId || user.tenant_id
  };

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
    issuer: 'dealmind-api',
    audience: 'dealmind-client'
  });
}


export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret, {
      issuer: 'dealmind-api',
      audience: 'dealmind-client'
    });
  } catch (err) {
    return null;
  }
}

export async function registerUser({ email, password, displayName, name, role = 'SALESPERSON', tenantId = config.defaultTenantId }) {
  const finalName = displayName || name;
  if (!email || !password || !finalName) {
    throw new Error('Email, password, and display name are required.');
  }


  const normalizedEmail = email.toLowerCase().trim();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    throw new Error('User with this email already exists.');
  }

  // Ensure tenant exists
  const tenant = db.prepare('SELECT id FROM tenants WHERE id = ?').get(tenantId);
  if (!tenant) {
    throw new Error(`Tenant ${tenantId} not found.`);
  }

  const passwordHash = await hashPassword(password);
  const userId = `USR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();
  const validRole = ['ADMIN', 'MANAGER', 'SALESPERSON'].includes(role.toUpperCase()) ? role.toUpperCase() : 'SALESPERSON';

  db.prepare(`
    INSERT INTO users (id, tenant_id, email, password_hash, display_name, role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
  `).run(userId, tenantId, normalizedEmail, passwordHash, finalName, validRole, now, now);

  const newUser = db.prepare('SELECT id, tenant_id, email, display_name, role, status, created_at FROM users WHERE id = ?').get(userId);
  const token = generateAccessToken(newUser);

  return { user: newUser, token };
}

export async function authenticateUser(emailOrObj, maybePassword) {
  let email, password;
  if (typeof emailOrObj === 'object' && emailOrObj !== null) {
    email = emailOrObj.email;
    password = emailOrObj.password;
  } else {
    email = emailOrObj;
    password = maybePassword;
  }

  if (!email || !password) {
    throw new Error('Email and password are required.');
  }


  const normalizedEmail = email.toLowerCase().trim();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
  if (!user) {
    throw new Error('Invalid email or password.');
  }

  if (user.status !== 'ACTIVE') {
    throw new Error('User account is disabled. Contact your administrator.');
  }

  const isMatch = await verifyPassword(password, user.password_hash);
  if (!isMatch) {
    throw new Error('Invalid email or password.');
  }

  const safeUser = {
    id: user.id,
    tenant_id: user.tenant_id,
    email: user.email,
    display_name: user.display_name,
    role: user.role,
    status: user.status,
    created_at: user.created_at
  };

  const token = generateAccessToken(safeUser);
  return { user: safeUser, token };
}

export function getUserById(userId) {
  return db.prepare('SELECT id, tenant_id, email, display_name, role, status, created_at FROM users WHERE id = ?').get(userId);
}
