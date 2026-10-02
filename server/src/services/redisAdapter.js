import Redis from 'ioredis';
import { config } from '../config.js';

let redisClient = null;
let isRedisConnected = false;
let redisInitAttempted = false;
let lastSuccessfulPing = null;
let reconnectCount = 0;
let lastError = null;

// In-process fallbacks
const inMemoryStore = new Map();
const inMemoryRateLimits = new Map();
const inMemoryConcurrencyLocks = new Map();
const inMemoryTokenBudgets = {
  globalEstimated: 0,
  globalActual: 0,
  tenantUsage: {},
  modelUsage: {}
};

/**
 * Initialize Redis connection if configured
 */
export function getRedisClient() {
  if (!config.redisUrl) return null;
  if (!redisClient && !redisInitAttempted) {
    redisInitAttempted = true;
    try {
      redisClient = new Redis(config.redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        lazyConnect: true,
        retryStrategy(times) {
          reconnectCount++;
          if (times > 3) return null; // Stop reconnecting after 3 attempts
          return Math.min(times * 100, 1000);
        }
      });

      redisClient.on('connect', () => {
        isRedisConnected = true;
        lastSuccessfulPing = new Date().toISOString();
        console.log('[Redis Adapter] Connected to Redis server.');
      });

      redisClient.on('error', (err) => {
        isRedisConnected = false;
        lastError = err.message;
        console.warn(`[Redis Adapter] Connection error: ${err.message}. Using in-process fallback.`);
      });

      redisClient.connect().then(() => {
        isRedisConnected = true;
        lastSuccessfulPing = new Date().toISOString();
      }).catch((err) => {
        isRedisConnected = false;
        lastError = err.message;
        console.warn(`[Redis Adapter] Connection failed: ${err.message}. Operating in fallback mode.`);
      });
    } catch (err) {
      isRedisConnected = false;
      lastError = err.message;
      console.warn(`[Redis Adapter] Initialization failed: ${err.message}`);
    }
  }
  return isRedisConnected ? redisClient : null;
}

export function getRedisStatus() {
  if (!config.redisUrl) {
    return {
      available: false,
      status: 'disabled',
      mode: 'in_memory_fallback',
      reason: 'REDIS_URL not configured'
    };
  }
  return {
    available: isRedisConnected,
    status: isRedisConnected ? 'connected' : 'fallback',
    mode: isRedisConnected ? 'redis_distributed' : 'in_memory_fallback',
    lastPing: lastSuccessfulPing,
    reconnectAttempts: reconnectCount,
    lastError: lastError || null
  };
}

/**
 * Redis & In-Process Rate Limiter Middleware with Tenant Scoping
 */
export function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute
  const maxRequests = options.maxRequests || 60; // 60 requests per minute
  const routePrefix = options.prefix || 'rl:general';

  const rateLimiterMiddleware = async function(req, res, next) {
    const tenantId = req.user?.tenantId || 'tenant_default';

    const identifier = req.user?.userId || req.headers['x-user-id'] || req.ip || 'anonymous';
    const key = `dealmind:${tenantId}:${routePrefix}:${identifier}`;
    const now = Date.now();

    const client = getRedisClient();

    if (client) {
      try {
        const count = await client.incr(key);
        if (count === 1) {
          await client.pexpire(key, windowMs);
        }
        if (count > maxRequests) {
          const ttl = await client.pttl(key);
          res.setHeader('Retry-After', Math.ceil(ttl / 1000));
          return res.status(429).json({
            error: 'Too Many Requests',
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded for ${routePrefix}. Max ${maxRequests} requests per minute.`,
            retryAfterSec: Math.ceil(ttl / 1000),
            limiterMode: 'redis_distributed'
          });
        }
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - count));
        return next();
      } catch (err) {
        // Fallback to in-memory on Redis error
      }
    }

    // In-memory token-bucket / sliding window fallback
    const entry = inMemoryRateLimits.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > entry.resetAt) {
      entry.count = 1;
      entry.resetAt = now + windowMs;
    } else {
      entry.count++;
    }
    inMemoryRateLimits.set(key, entry);

    if (entry.count > maxRequests) {
      const waitSec = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', waitSec);
      return res.status(429).json({
        error: 'Too Many Requests',
        code: 'RATE_LIMIT_EXCEEDED',
        message: `In-process rate limit exceeded for ${routePrefix}. Max ${maxRequests} requests per minute.`,
        retryAfterSec: waitSec,
        limiterMode: 'in_memory_fallback'
      });
    }

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count));
    next();
  };

  rateLimiterMiddleware.consume = async function(req) {
    const tenantId = req.user?.tenantId || 'tenant_default';
    const identifier = req.user?.userId || req.headers?.['x-user-id'] || req.ip || 'anonymous';
    const key = `dealmind:${tenantId}:${routePrefix}:${identifier}`;
    const now = Date.now();

    const client = getRedisClient();
    if (client) {
      try {
        const count = await client.incr(key);
        if (count === 1) {
          await client.pexpire(key, windowMs);
        }
        if (count > maxRequests) {
          const ttl = await client.pttl(key);
          return { allowed: false, count, maxRequests, retryAfterSec: Math.ceil(ttl / 1000) };
        }
        return { allowed: true, count, maxRequests, remaining: maxRequests - count };
      } catch (err) {}
    }

    const entry = inMemoryRateLimits.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > entry.resetAt) {
      entry.count = 1;
      entry.resetAt = now + windowMs;
    } else {
      entry.count++;
    }
    inMemoryRateLimits.set(key, entry);

    if (entry.count > maxRequests) {
      const waitSec = Math.ceil((entry.resetAt - now) / 1000);
      return { allowed: false, count: entry.count, maxRequests, retryAfterSec: waitSec };
    }
    return { allowed: true, count: entry.count, maxRequests, remaining: maxRequests - entry.count };
  };

  return rateLimiterMiddleware;
}


/**
 * Token Budget Manager with Per-Tenant and Global Limits
 */
export const tokenBudgetManager = {
  estimateTokens(text = '') {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  },

  async reserveBudget(estimatedTokens, model = 'openai/gpt-oss-120b', tenantId = 'tenant_default') {
    const client = getRedisClient();
    const globalKey = `dealmind:token_budget:global:${model}`;
    const tenantKey = `dealmind:token_budget:${tenantId}:${model}`;

    if (client) {
      try {
        await client.hincrby(globalKey, 'reserved', estimatedTokens);
        await client.hincrby(tenantKey, 'reserved', estimatedTokens);
        return { success: true, mode: 'redis' };
      } catch (e) {
        // Fallback
      }
    }

    inMemoryTokenBudgets.globalEstimated += estimatedTokens;
    if (!inMemoryTokenBudgets.tenantUsage[tenantId]) {
      inMemoryTokenBudgets.tenantUsage[tenantId] = { reserved: 0, actual: 0 };
    }
    inMemoryTokenBudgets.tenantUsage[tenantId].reserved += estimatedTokens;

    if (!inMemoryTokenBudgets.modelUsage[model]) {
      inMemoryTokenBudgets.modelUsage[model] = { reserved: 0, actual: 0 };
    }
    inMemoryTokenBudgets.modelUsage[model].reserved += estimatedTokens;

    return { success: true, mode: 'in_memory' };
  },

  async reconcileUsage(model, actualUsage = {}, tenantId = 'tenant_default') {
    const totalActual = (actualUsage.prompt_tokens || 0) + (actualUsage.completion_tokens || 0);
    const client = getRedisClient();
    const globalKey = `dealmind:token_budget:global:${model}`;
    const tenantKey = `dealmind:token_budget:${tenantId}:${model}`;

    if (client) {
      try {
        await client.hincrby(globalKey, 'actual', totalActual);
        await client.hincrby(tenantKey, 'actual', totalActual);
        return { totalActual, mode: 'redis' };
      } catch (e) {
        // Fallback
      }
    }

    inMemoryTokenBudgets.globalActual += totalActual;
    if (inMemoryTokenBudgets.tenantUsage[tenantId]) {
      inMemoryTokenBudgets.tenantUsage[tenantId].actual += totalActual;
    }
    if (inMemoryTokenBudgets.modelUsage[model]) {
      inMemoryTokenBudgets.modelUsage[model].actual += totalActual;
    }

    return { totalActual, mode: 'in_memory' };
  },

  getBudgetMetrics(tenantId = 'tenant_default') {
    return {
      mode: isRedisConnected ? 'redis_distributed' : 'in_memory_fallback',
      globalLimit: config.tokenBudgetGlobal,
      tenantLimit: config.tokenBudgetPerTenant,
      globalActual: inMemoryTokenBudgets.globalActual,
      tenantUsage: inMemoryTokenBudgets.tenantUsage[tenantId] || { reserved: 0, actual: 0 }
    };
  },

  async checkAndConsume(tenantId = 'tenant_default', tokensToConsume = 0, model = 'default') {
    const tenantLimit = config.tokenBudgetPerTenant || 500000;
    if (!inMemoryTokenBudgets.tenantUsage[tenantId]) {
      inMemoryTokenBudgets.tenantUsage[tenantId] = { reserved: 0, actual: 0 };
    }
    const tenantUsage = inMemoryTokenBudgets.tenantUsage[tenantId];
    if (tenantUsage.actual + tokensToConsume > tenantLimit) {
      return { allowed: false, reason: 'TENANT_BUDGET_EXCEEDED', tenantId, tenantLimit, consumed: tenantUsage.actual, mode: 'in_memory_fallback' };
    }
    tenantUsage.actual += tokensToConsume;
    inMemoryTokenBudgets.globalActual += tokensToConsume;
    return { allowed: true, tenantId, tenantLimit, consumed: tenantUsage.actual, mode: 'in_memory_fallback' };
  }
};



export async function acquireConcurrencySlot(tenantId = 'tenant_default', sessionId = null, maxSlots = config.maxConcurrentTurns) {
  let actualSessionId = sessionId;
  let actualMaxSlots = maxSlots;

  if (typeof sessionId === 'number') {
    actualMaxSlots = sessionId;
    actualSessionId = `slot_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
  } else if (!actualSessionId) {
    actualSessionId = `slot_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
  }

  const key = `dealmind:${tenantId}:concurrency_slots`;
  const client = getRedisClient();

  if (client) {
    try {
      const current = await client.scard(key);
      if (current >= actualMaxSlots) {
        return { acquired: false, mode: 'redis', activeSlots: current, release: () => releaseConcurrencySlot(tenantId, actualSessionId) };
      }
      await client.sadd(key, actualSessionId);
      await client.expire(key, 120); // 2 minute auto-expiry
      return { acquired: true, mode: 'redis', activeSlots: current + 1, sessionId: actualSessionId, release: () => releaseConcurrencySlot(tenantId, actualSessionId) };
    } catch (e) {
      // Fallback
    }
  }

  // In-process fallback
  const activeSet = inMemoryConcurrencyLocks.get(tenantId) || new Set();
  if (activeSet.size >= actualMaxSlots) {
    return { acquired: false, mode: 'in_memory_fallback', activeSlots: activeSet.size, release: () => releaseConcurrencySlot(tenantId, actualSessionId) };
  }
  activeSet.add(actualSessionId);
  inMemoryConcurrencyLocks.set(tenantId, activeSet);
  return {
    acquired: true,
    mode: 'in_memory_fallback',
    activeSlots: activeSet.size,
    sessionId: actualSessionId,
    release: () => releaseConcurrencySlot(tenantId, actualSessionId)
  };
}


export async function releaseConcurrencySlot(tenantId = 'tenant_default', sessionId = 'default') {
  const key = `dealmind:${tenantId}:concurrency_slots`;
  const client = getRedisClient();

  if (client) {
    try {
      await client.srem(key, sessionId);
      return true;
    } catch (e) {}
  }

  const activeSet = inMemoryConcurrencyLocks.get(tenantId);
  if (activeSet) {
    activeSet.delete(sessionId);
  }
  return true;
}

/**
 * Safe Scoped Caching (for Deterministic Economics Math)
 */
export const safeCache = {
  async get(key, tenantId = 'tenant_default') {
    const fullKey = `dealmind:${tenantId}:cache:${key}`;
    const client = getRedisClient();
    if (client) {
      try {
        const val = await client.get(fullKey);
        return val ? JSON.parse(val) : null;
      } catch (e) {
        // Fallback
      }
    }
    const entry = inMemoryStore.get(fullKey);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      inMemoryStore.delete(fullKey);
      return null;
    }
    return entry.value;
  },

  async set(key, value, ttlSeconds = 300, tenantId = 'tenant_default') {
    const fullKey = `dealmind:${tenantId}:cache:${key}`;
    const client = getRedisClient();
    if (client) {
      try {
        await client.setex(fullKey, ttlSeconds, JSON.stringify(value));
        return true;
      } catch (e) {
        // Fallback
      }
    }
    inMemoryStore.set(fullKey, {
      value,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    });
    return true;
  },

  async del(key, tenantId = 'tenant_default') {
    const fullKey = `dealmind:${tenantId}:cache:${key}`;
    const client = getRedisClient();
    if (client) {
      try {
        await client.del(fullKey);
      } catch (e) {}
    }
    inMemoryStore.delete(fullKey);
  },

  clear() {
    inMemoryStore.clear();
    inMemoryRateLimits.clear();
    inMemoryConcurrencyLocks.clear();
  }
};
