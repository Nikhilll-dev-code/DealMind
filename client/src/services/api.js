const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}
export const getHealth = fetchHealth;

export async function analyzeNegotiation(dealData) {
  const res = await fetch(`${API_BASE}/negotiations/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dealData)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to analyze negotiation');
  }
  return res.json();
}

export async function fetchNegotiations() {
  const res = await fetch(`${API_BASE}/negotiations`);
  return res.json();
}
export const getNegotiations = fetchNegotiations;

export async function createNegotiation(dealData) {
  const res = await fetch(`${API_BASE}/negotiations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dealData)
  });
  return res.json();
}

export async function recordOutcome(dealId, outcomeData) {
  const res = await fetch(`${API_BASE}/negotiations/${dealId}/outcome`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(outcomeData)
  });
  return res.json();
}

export async function submitCounteroffer(dealId, newCounterOffer, notes) {
  const res = await fetch(`${API_BASE}/negotiations/${dealId}/counteroffer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newCounterOffer, notes })
  });
  return res.json();
}

export async function simulateWhatIf(dealId, scenarioData) {
  const res = await fetch(`${API_BASE}/negotiations/${dealId}/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scenarioData)
  });
  return res.json();
}

export async function fetchCustomerHistory(customerId) {
  const res = await fetch(`${API_BASE}/customers/${customerId}/history`);
  return res.json();
}

export async function fetchCustomers() {
  const res = await fetch(`${API_BASE}/customers`);
  return res.json();
}

export async function fetchMemoryExplorer(query = '', customer = '', outcome = '') {
  const params = new URLSearchParams({ q: query, customer, outcome });
  const res = await fetch(`${API_BASE}/memory/explorer?${params}`);
  return res.json();
}
export const getMemories = fetchMemoryExplorer;

export async function fetchLearningTimeline() {
  const res = await fetch(`${API_BASE}/learning/timeline`);
  return res.json();
}
export const getLearningTimeline = fetchLearningTimeline;

export async function resetDemoState() {
  const res = await fetch(`${API_BASE}/demo/reset`, { method: 'POST' });
  return res.json();
}
export const resetDemo = resetDemoState;
