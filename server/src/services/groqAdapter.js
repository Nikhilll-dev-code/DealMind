import { Groq } from 'groq-sdk';
import { config } from '../config.js';

let groqClient = null;

// Global model cooldown registry: modelName -> { until: timestamp, reason: string, waitSec: number, rateLimitType: string }
const modelCooldowns = new Map();

// Concurrency queue to prevent simultaneous burst requests exceeding TPM limits
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 2;
const requestQueue = [];

function acquireQueueSlot() {
  return new Promise((resolve) => {
    if (activeRequests < MAX_CONCURRENT_REQUESTS) {
      activeRequests++;
      resolve();
    } else {
      requestQueue.push(resolve);
    }
  });
}

function releaseQueueSlot() {
  activeRequests = Math.max(0, activeRequests - 1);
  if (requestQueue.length > 0) {
    activeRequests++;
    const next = requestQueue.shift();
    next();
  }
}

export function getGroqClient() {
  if (!config.groqApiKey) return null;
  if (!groqClient) {
    try {
      groqClient = new Groq({ apiKey: config.groqApiKey });
    } catch (err) {
      console.error('[Groq Adapter] Client instantiation failed:', err.message);
    }
  }
  return groqClient;
}

// Configured model routing priority and model-specific quotas
export const MODEL_SPECS = {
  'openai/gpt-oss-120b': {
    id: 'openai/gpt-oss-120b',
    displayName: 'GPT-OSS 120B (Primary Reasoning)',
    maxInputTokens: 6000,
    maxOutputTokens: 1024,
    tpmLimit: 8000,
    itpmLimit: 30000,
    tpdLimit: 200000,
    rpmLimit: 30
  },
  'qwen/qwen3.8-27b': {
    id: 'qwen/qwen3.8-27b',
    displayName: 'Qwen 3.8 27B (High Throughput Failover)',
    maxInputTokens: 4800, // Safe headroom below 7,000 ITPM limit
    maxOutputTokens: 900, // Safe headroom below 1,000 OTPM limit
    tpmLimit: 7000,
    itpmLimit: 7000,
    tpdLimit: 500000,
    rpmLimit: 30
  },
  'openai/gpt-oss-20b': {
    id: 'openai/gpt-oss-20b',
    displayName: 'GPT-OSS 20B (Lightweight Fallback)',
    maxInputTokens: 4500, // Safe headroom below 8,000 TPM limit
    maxOutputTokens: 1024,
    tpmLimit: 8000,
    itpmLimit: 8000,
    tpdLimit: 500000,
    rpmLimit: 30
  }
};

export const CONFIGURED_MODELS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b'
];

/**
 * Fast and accurate token estimation (~3.8 chars per token plus structured message overhead)
 */
export function estimateTokens(contentOrMessages) {
  if (!contentOrMessages) return 0;
  if (typeof contentOrMessages === 'string') {
    return Math.ceil(contentOrMessages.length / 3.8) + 1;
  }
  if (Array.isArray(contentOrMessages)) {
    let total = 0;
    for (const msg of contentOrMessages) {
      total += 4; // per-message structural framing overhead
      if (typeof msg.content === 'string') {
        total += Math.ceil(msg.content.length / 3.8);
      }
      if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
        for (const tc of msg.tool_calls) {
          total += 10;
          if (tc.function?.name) total += Math.ceil(tc.function.name.length / 3.8);
          if (tc.function?.arguments) total += Math.ceil(tc.function.arguments.length / 3.8);
        }
      }
    }
    return total;
  }
  if (typeof contentOrMessages === 'object') {
    return Math.ceil(JSON.stringify(contentOrMessages).length / 3.8);
  }
  return 0;
}

/**
 * Model-Specific Context Compactor: Trims & compacts messages to guarantee fitting within a target model's input budget.
 */
export function compactMessagesForModel(messages, modelName = 'openai/gpt-oss-120b') {
  const spec = MODEL_SPECS[modelName] || MODEL_SPECS['openai/gpt-oss-120b'];
  const maxInput = spec.maxInputTokens || 5000;

  let currentEstimate = estimateTokens(messages);
  if (currentEstimate <= maxInput) {
    return messages;
  }

  // Clone messages deeply
  const compacted = JSON.parse(JSON.stringify(messages));

  // Step 1: Compact any tool message payloads exceeding 500 characters
  for (const msg of compacted) {
    if (msg.role === 'tool' && typeof msg.content === 'string' && msg.content.length > 400) {
      // Truncate to core summary
      msg.content = msg.content.slice(0, 380) + '... [evidence summarized for token budget]';
    }
  }

  currentEstimate = estimateTokens(compacted);
  if (currentEstimate <= maxInput) {
    return compacted;
  }

  // Step 2: If still oversized, retain system prompt, user prompt, and the latest 2 tool interactions
  const systemMsg = compacted.find(m => m.role === 'system');
  const userMsg = compacted.find(m => m.role === 'user');
  const otherMsgs = compacted.filter(m => m.role !== 'system' && m.role !== 'user');

  const pruned = [];
  if (systemMsg) pruned.push(systemMsg);
  if (userMsg) pruned.push(userMsg);

  // Keep latest 4 non-system/user messages
  const recentOthers = otherMsgs.slice(-4);
  pruned.push(...recentOthers);

  return pruned;
}

/**
 * Cooldown management utilities
 */
export function isModelInCooldown(model) {
  const cd = modelCooldowns.get(model);
  if (!cd) return { inCooldown: false, remainingMs: 0 };
  const now = Date.now();
  if (now >= cd.until) {
    modelCooldowns.delete(model);
    return { inCooldown: false, remainingMs: 0 };
  }
  return { 
    inCooldown: true, 
    remainingMs: cd.until - now, 
    reason: cd.reason, 
    waitSec: cd.waitSec,
    rateLimitType: cd.rateLimitType || 'RATE_LIMIT'
  };
}

export function setModelCooldown(model, durationMs, reason = 'Rate limited (429)', rateLimitType = 'RATE_LIMIT') {
  const waitSec = Math.ceil(durationMs / 1000);
  modelCooldowns.set(model, {
    until: Date.now() + durationMs,
    reason,
    waitSec,
    rateLimitType
  });
}

export function clearModelCooldowns() {
  modelCooldowns.clear();
}

export function getModelCooldownStatus() {
  const status = {};
  for (const model of CONFIGURED_MODELS) {
    const cd = isModelInCooldown(model);
    status[model] = cd.inCooldown
      ? { 
          status: 'cooling_down', 
          remainingSec: Math.ceil(cd.remainingMs / 1000), 
          reason: cd.reason,
          rateLimitType: cd.rateLimitType
        }
      : { status: 'available' };
  }
  return status;
}

/**
 * Explicit Error Classification distinguishing TPD, ITPM, TPM, RPM, 413, 401, 404, 5xx
 */
export function classifyGroqError(err) {
  const status = err.status || (err.response ? err.response.status : undefined);
  const msg = err.message || '';

  // Helper to parse humanized wait durations e.g., "1h17m39.552s", "12m12.672s", "322s" or header
  let parsedSec = null;
  const headerRetry = err.headers?.['retry-after'] || (err.headers?.get ? err.headers.get('retry-after') : undefined);
  if (headerRetry && !isNaN(Number(headerRetry))) {
    parsedSec = Number(headerRetry);
  } else {
    const hmsMatch = msg.match(/(?:try again in|retry in|wait)\s+(?:(\d+)h)?(?:(\d+)m)?([0-9.]+)s/i);
    if (hmsMatch) {
      const hours = Number(hmsMatch[1] || 0);
      const minutes = Number(hmsMatch[2] || 0);
      const seconds = parseFloat(hmsMatch[3] || 0);
      parsedSec = Math.max(1, Math.ceil((hours * 3600) + (minutes * 60) + seconds));
    } else {
      const secMatch = msg.match(/(?:try again in|retry in|wait)\s+([0-9.]+)\s*s/i);
      if (secMatch && secMatch[1]) {
        parsedSec = Math.max(1, Math.ceil(parseFloat(secMatch[1])));
      }
    }
  }

  if (parsedSec === null || isNaN(parsedSec)) {
    parsedSec = 15;
  }

  // 1. Tokens Per Day (TPD) Quota Exceeded
  if (/tokens per day|tpd|daily/i.test(msg)) {
    return {
      type: 'RATE_LIMIT',
      rateLimitType: 'TPD',
      status: 429,
      retryAfterSec: parsedSec,
      cooldownMs: (parsedSec * 1000) + 1000,
      message: msg,
      retryable: false
    };
  }

  // 2. Input Tokens Per Minute (ITPM) Exceeded
  if (/input tokens per minute|itpm/i.test(msg)) {
    return {
      type: 'RATE_LIMIT',
      rateLimitType: 'ITPM',
      status: 429,
      retryAfterSec: parsedSec,
      cooldownMs: (parsedSec * 1000) + 1000,
      message: msg,
      retryable: false
    };
  }

  // 3. Output Tokens Per Minute (OTPM) Exceeded
  if (/output tokens per minute|otpm/i.test(msg)) {
    return {
      type: 'RATE_LIMIT',
      rateLimitType: 'OTPM',
      status: 429,
      retryAfterSec: parsedSec,
      cooldownMs: (parsedSec * 1000) + 1000,
      message: msg,
      retryable: false
    };
  }

  // 3. Requests Per Minute (RPM) Exceeded
  if (/requests per minute|rpm/i.test(msg)) {
    return {
      type: 'RATE_LIMIT',
      rateLimitType: 'RPM',
      status: 429,
      retryAfterSec: parsedSec,
      cooldownMs: (parsedSec * 1000) + 1000,
      message: msg,
      retryable: false
    };
  }

  // 4. Tokens Per Minute (TPM) Exceeded
  if (status === 429 || /rate[- ]limit|tpm/i.test(msg)) {
    return {
      type: 'RATE_LIMIT',
      rateLimitType: 'TPM',
      status: 429,
      retryAfterSec: parsedSec,
      cooldownMs: (parsedSec * 1000) + 1000,
      message: msg,
      retryable: false
    };
  }

  // 5. Context Length / Request Too Large (HTTP 413)
  if (status === 413 || /request too large|reduce your message size|context length|maximum context/i.test(msg)) {
    return {
      type: 'CONTEXT_LENGTH_EXCEEDED',
      rateLimitType: 'CONTEXT_LENGTH',
      status: 413,
      cooldownMs: 5000, // Short cooldown to allow compacted retry
      message: msg,
      retryable: false
    };
  }

  // 6. Model Not Found / Unsupported (HTTP 404)
  if (status === 404 || /model_not_found|does not exist/i.test(msg)) {
    return {
      type: 'NOT_FOUND',
      status: 404,
      cooldownMs: 3600 * 1000, // 1 hour cooldown
      message: msg,
      retryable: false
    };
  }

  // 7. Authentication / Unauthorized (HTTP 401)
  if (status === 401 || /unauthorized|invalid api key/i.test(msg)) {
    return {
      type: 'UNAUTHORIZED',
      status: 401,
      cooldownMs: 86400 * 1000, // Disable
      message: 'Invalid or unauthorized GROQ_API_KEY',
      retryable: false
    };
  }

  // 8. Bad Request / Tool Schema Error (HTTP 400)
  if (status === 400) {
    return {
      type: 'BAD_REQUEST',
      status: 400,
      cooldownMs: 10 * 1000,
      message: msg,
      retryable: false
    };
  }

  // 9. Server Error / Gateway Timeout (HTTP 5xx)
  if (status >= 500 || /gateway|timeout|econnreset|etimedout/i.test(msg)) {
    return {
      type: 'SERVER_ERROR',
      status: status || 500,
      cooldownMs: 5000,
      message: msg,
      retryable: true
    };
  }

  return {
    type: 'UNKNOWN',
    status: status || 500,
    cooldownMs: 5000,
    message: msg,
    retryable: false
  };
}

export function getGroqStatus() {
  if (!config.groqApiKey) {
    return { available: false, status: 'disabled', reason: 'GROQ_API_KEY not configured' };
  }
  const cooldowns = getModelCooldownStatus();
  const availableModels = CONFIGURED_MODELS.filter(m => !isModelInCooldown(m).inCooldown);
  const activeModel = availableModels[0] || 'all_models_cooling_down';

  return {
    available: true,
    status: availableModels.length > 0 ? 'connected' : 'rate_limited_cooling_down',
    primaryModel: CONFIGURED_MODELS[0],
    activeModel,
    configuredModels: CONFIGURED_MODELS,
    modelSpecs: MODEL_SPECS,
    cooldowns,
    provider: 'groq'
  };
}

// 5 Agent Tool Definitions for Groq Function Calling
export const AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'recall_memory',
      description: 'Search Hindsight organizational memory for relevant historical negotiations.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query for memory recall' },
          customer: { type: 'string', description: 'Customer name' },
          segment: { type: 'string', description: 'Industry segment' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_customer_history',
      description: 'Retrieve verified historical statistics, win rates, sample sizes, and customer vs segment conflict checks.',
      parameters: {
        type: 'object',
        properties: {
          customer: { type: 'string', description: 'Customer name' },
          segment: { type: 'string', description: 'Industry segment' }
        },
        required: ['customer', 'segment']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate_economics',
      description: 'Calculate authoritative deterministic concession economics, revenue retention vs requested discount, and multi-year contract values.',
      parameters: {
        type: 'object',
        properties: {
          deal_value: { type: 'number', description: 'Total deal dollar amount' },
          requested_discount_percent: { type: 'number', description: 'Customer requested discount percentage' },
          proposed_discount_percent: { type: 'number', description: 'Recommended discount percentage' },
          contract_years: { type: 'number', description: 'Length of contract in years' }
        },
        required: ['deal_value', 'requested_discount_percent', 'proposed_discount_percent']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'reflect_strategy',
      description: 'Invoke Hindsight higher-order reflection across accumulated organizational memories to extract strategic patterns and failure modes.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Strategic question for Hindsight reflection' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'compare_strategies',
      description: 'Compare Conservative, Balanced, and Aggressive negotiation packages with deterministic trade-off analysis.',
      parameters: {
        type: 'object',
        properties: {
          deal_value: { type: 'number', description: 'Total deal value' },
          requested_discount_percent: { type: 'number', description: 'Customer requested discount percentage' }
        },
        required: ['deal_value', 'requested_discount_percent']
      }
    }
  }
];

/**
 * Robust Multi-Model Chat Invocation with Cooldown Routing & Model-Specific Budget Enforcement
 */
export async function invokeGroqChat(rawMessages, options = {}) {
  const groq = getGroqClient();
  if (!groq) return null;

  await acquireQueueSlot();

  try {
    const modelsToTry = options.models || CONFIGURED_MODELS;

    for (let i = 0; i < modelsToTry.length; i++) {
      const model = modelsToTry[i];
      const cd = isModelInCooldown(model);

      if (cd.inCooldown) {
        console.log(`[Groq Router] Skipping ${model} (cooling down for ${Math.ceil(cd.remainingMs / 1000)}s due to ${cd.reason})`);
        continue;
      }

      // Compact messages specifically for this model's token limits
      const messages = compactMessagesForModel(rawMessages, model);
      const estTokens = estimateTokens(messages);

      console.log(`[Groq Router] Invoking model ${model} (candidate ${i + 1}/${modelsToTry.length}, ~${estTokens} input tokens)...`);
      const startTime = Date.now();

      try {
        const spec = MODEL_SPECS[model] || {};
        const maxTokensForModel = Math.min(options.max_tokens || 1024, spec.maxOutputTokens || 1000);

        const response = await groq.chat.completions.create({
          messages,
          model,
          temperature: options.temperature ?? 0.2,
          tools: options.tools || undefined,
          tool_choice: options.tool_choice || undefined,
          response_format: options.response_format || undefined,
          max_tokens: maxTokensForModel
        });

        const elapsedMs = Date.now() - startTime;
        console.log(`[Groq Router] Model ${model} succeeded in ${elapsedMs}ms.`);
        return { response, model, durationMs: elapsedMs, estimatedInputTokens: estTokens };

      } catch (err) {
        const classified = classifyGroqError(err);
        console.warn(`[Groq Router] Model ${model} error [${classified.rateLimitType || classified.type} ${classified.status}]: ${classified.message}`);

        if (classified.type === 'RATE_LIMIT') {
          const reasonStr = `${classified.rateLimitType} rate limit (${classified.retryAfterSec}s wait)`;
          setModelCooldown(model, classified.cooldownMs, reasonStr, classified.rateLimitType);
          console.warn(`[Groq Router] ${model} placed in cooldown for ${classified.retryAfterSec}s. Failing over immediately to next model...`);
          continue;
        }

        if (classified.type === 'CONTEXT_LENGTH_EXCEEDED') {
          setModelCooldown(model, classified.cooldownMs, 'Context length exceeded', 'CONTEXT_LENGTH');
          console.warn(`[Groq Router] ${model} exceeded context limit. Compacting context for next model candidate...`);
          continue;
        }

        if (classified.type === 'NOT_FOUND' || classified.type === 'UNAUTHORIZED' || classified.type === 'BAD_REQUEST') {
          setModelCooldown(model, classified.cooldownMs, classified.type);
          continue;
        }

        if (classified.type === 'SERVER_ERROR' && classified.retryable) {
          try {
            console.log(`[Groq Router] Retrying ${model} after 500ms backoff...`);
            await new Promise((r) => setTimeout(r, 500));
            const retryRes = await groq.chat.completions.create({
              messages,
              model,
              temperature: options.temperature ?? 0.2,
              tools: options.tools || undefined,
              tool_choice: options.tool_choice || undefined,
              max_tokens: options.max_tokens || 1024
            });
            return { response: retryRes, model, durationMs: Date.now() - startTime, estimatedInputTokens: estTokens };
          } catch (retryErr) {
            console.warn(`[Groq Router] Retry failed for ${model}: ${retryErr.message}`);
            setModelCooldown(model, 10000, 'Server error retry failed');
            continue;
          }
        }
      }
    }

    console.warn('[Groq Router] All configured models were rate-limited or unavailable. Activating deterministic fallback.');
    return null;
  } finally {
    releaseQueueSlot();
  }
}
