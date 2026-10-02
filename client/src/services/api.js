const API_BASE = '/api';

let authToken = localStorage.getItem('dealmind_jwt_token') || null;

export function setAuthToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem('dealmind_jwt_token', token);
  } else {
    localStorage.removeItem('dealmind_jwt_token');
  }
}

export function getAuthToken() {
  return authToken;
}

/**
 * Enhanced fetch wrapper with automatic JWT Bearer headers and structured error parsing
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  try {
    const res = await fetch(url, config);

    // Handle HTTP 401 Unauthorized (Trigger global auth session expiry)
    if (res.status === 401) {
      if (endpoint !== '/auth/login' && endpoint !== '/auth/register') {
        window.dispatchEvent(new CustomEvent('dealmind:unauthorized'));
      }
    }

    if (!res.ok) {
      let errData = {};
      try {
        errData = await res.json();
      } catch (e) {
        errData = { error: res.statusText, status: res.status };
      }

      const error = new Error(errData.error || errData.message || `Request failed with status ${res.status}`);
      error.code = errData.code || `HTTP_${res.status}`;
      error.status = res.status;
      error.data = errData;
      throw error;
    }

    return await res.json();
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      const netErr = new Error('Network connection failed. Ensure backend server is running on port 5000.');
      netErr.code = 'NETWORK_ERROR';
      throw netErr;
    }
    throw err;
  }
}

// ── 1. AUTHENTICATION & IDENTITY ────────────────────────────────────

export async function login(email, password) {
  const res = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  if (res.token) {
    setAuthToken(res.token);
  }
  return res;
}

export async function register({ email, password, displayName, role, tenantId }) {
  const res = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName, role, tenantId })
  });
  if (res.token) {
    setAuthToken(res.token);
  }
  return res;
}

export async function logout() {
  try {
    await request('/auth/logout', { method: 'POST' });
  } catch (e) {
    // Ignore network failure on logout
  } finally {
    setAuthToken(null);
  }
  return { success: true };
}

export async function getCurrentUser() {
  if (!authToken) return null;
  const res = await request('/auth/me');
  return res.user;
}

// ── 2. SYSTEM OBSERVABILITY & HEALTH ────────────────────────────────

export async function getHealth() {
  return request('/health');
}
export const fetchHealth = getHealth;

// ── 3. NEGOTIATIONS & AGENT WORKSPACE ───────────────────────────────

export async function getNegotiations(tenantId) {
  const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
  return request(`/negotiations${q}`);
}
export const fetchNegotiations = getNegotiations;

export async function analyzeNegotiation(dealData) {
  return request('/negotiations/analyze', {
    method: 'POST',
    body: JSON.stringify(dealData)
  });
}

export async function createNegotiation(dealData) {
  return request('/negotiations', {
    method: 'POST',
    body: JSON.stringify(dealData)
  });
}

export async function recordOutcome(dealId, outcomeData) {
  return request(`/negotiations/${dealId}/outcome`, {
    method: 'POST',
    body: JSON.stringify(outcomeData)
  });
}

export async function submitCounteroffer(dealId, newCounterOffer, notes = '') {
  return request(`/negotiations/${dealId}/counteroffer`, {
    method: 'POST',
    body: JSON.stringify({ newCounterOffer, notes })
  });
}

export async function simulateWhatIf(dealId, scenarioData) {
  return request(`/negotiations/${dealId}/simulate`, {
    method: 'POST',
    body: JSON.stringify(scenarioData)
  });
}

export async function getGiveGetRecommendations(dealId, requestedDiscountPercent = null) {
  return request(`/negotiations/${dealId}/give-get`, {
    method: 'POST',
    body: JSON.stringify({ requestedDiscountPercent })
  });
}

export async function fetchCustomerHistory(customerId) {
  return request(`/customers/${customerId}/history`);
}

export async function fetchSessionCheckpoint(sessionId) {
  return request(`/negotiations/session/${sessionId}/checkpoint`);
}

// ── 4. APPROVAL GOVERNANCE ──────────────────────────────────────────

export async function getApprovals(tenantId) {
  const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
  return request(`/approvals${q}`);
}
export const fetchApprovals = getApprovals;

export async function submitApprovalDecision(approvalId, decisionData) {
  return request(`/approvals/${approvalId}/decision`, {
    method: 'POST',
    body: JSON.stringify(decisionData)
  });
}

// ── 5. HINDSIGHT MEMORY & LEARNING ──────────────────────────────────

export async function getMemoryExplorer(query = '', customer = '', outcome = '') {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (customer) params.set('customer', customer);
  if (outcome) params.set('outcome', outcome);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request(`/memory/explorer${qs}`);
}
export const getMemories = getMemoryExplorer;
export const fetchMemoryExplorer = getMemoryExplorer;

export async function getLearningTimeline(tenantId) {
  const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
  return request(`/learning/timeline${q}`);
}
export const fetchLearningTimeline = getLearningTimeline;

export async function getHindsightOutbox(tenantId) {
  const q = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
  return request(`/hindsight/outbox${q}`);
}

export async function syncHindsightOutbox(tenantId, options = {}) {
  return request('/hindsight/outbox/sync', {
    method: 'POST',
    body: JSON.stringify({ tenantId, ...options })
  });
}

export async function retryOutboxEvent(eventId, tenantId) {
  return request(`/hindsight/outbox/${eventId}/retry`, {
    method: 'POST',
    body: JSON.stringify({ tenantId })
  });
}

export async function getHindsightTelemetry() {
  return request('/hindsight/telemetry');
}

// ── 6. DEMO MANAGEMENT ──────────────────────────────────────────────

export async function resetDemo() {
  return request('/demo/reset', { method: 'POST' });
}
export const resetDemoState = resetDemo;
