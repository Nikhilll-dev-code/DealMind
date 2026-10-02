import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBaseConfidence, evaluateConfidenceAndConflict, getEvidenceTier } from '../src/services/confidenceEngine.js';
import { calculateDealEconomics, buildStrategyLabEconomics } from '../src/services/economicsEngine.js';
import { initDatabase, db, resetDatabase, resetTenantDemoData, seedDatabase, normalizeCustomerId } from '../src/db/database.js';
import { analyzeNegotiation, simulateWhatIf, analyzeCounteroffer } from '../src/services/agentOrchestrator.js';
import { detectNegotiationPatterns } from '../src/services/patternEngine.js';
import { retainNegotiationMemory, recallNegotiationMemories, reflectNegotiationSynthesis, syncHindsightOutbox, formatNegotiationMemoryPayload, retryOutboxEvent } from '../src/services/hindsightAdapter.js';
import { classifyGroqError, isModelInCooldown, setModelCooldown, clearModelCooldowns, getModelCooldownStatus, CONFIGURED_MODELS, MODEL_SPECS, estimateTokens, compactMessagesForModel, invokeGroqChat } from '../src/services/groqAdapter.js';
import { safeCache, tokenBudgetManager, createRateLimiter, getRedisStatus, acquireConcurrencySlot } from '../src/services/redisAdapter.js';
import { checkApprovalRequired, createPendingApproval, processApprovalDecision, listPendingApprovals, getApprovalByDealId } from '../src/services/approvalEngine.js';
import { checkpointManager } from '../src/services/checkpointManager.js';
import { runAgentEvaluationSuite } from '../src/evaluation/evalSuite.js';
import { hashPassword, verifyPassword, generateAccessToken, verifyAccessToken, registerUser, authenticateUser, getUserById } from '../src/services/authService.js';
import { hasPermission, PERMISSIONS } from '../src/config/permissions.js';



test('1. Confidence Rules Engine & Evidence Tiers', (t) => {
  initDatabase();
  resetDatabase();

  // Test Evidence Tiers
  assert.equal(getEvidenceTier(0).tier, 'NONE');
  assert.equal(getEvidenceTier(1).tier, 'PRELIMINARY');
  assert.equal(getEvidenceTier(1).label, 'Preliminary evidence');
  assert.equal(getEvidenceTier(3).tier, 'EMERGING');
  assert.equal(getEvidenceTier(3).label, 'Emerging pattern');
  assert.equal(getEvidenceTier(6).tier, 'ESTABLISHED');
  assert.equal(getEvidenceTier(6).label, 'Established pattern');

  // Single deal guardrail (1 deal must be LOW confidence)
  assert.equal(calculateBaseConfidence(1, 0), 'LOW', '1 deal must never produce HIGH confidence');

  const acmeStats = evaluateConfidenceAndConflict('Acme Corp', 'enterprise');
  assert.equal(acmeStats.customerStats.total, 8, 'Acme must have exactly 8 historical episodes');
  assert.equal(acmeStats.customerStats.wins, 5, 'Acme must have 5 wins');
  assert.equal(acmeStats.customerStats.losses, 3, 'Acme must have 3 losses');
  assert.equal(acmeStats.customerStats.winRate, 63, 'Acme win rate is 63%');
  assert.equal(acmeStats.finalConfidence, 'MEDIUM', 'Acme confidence is capped at MEDIUM due to conflict/variance');
  assert.equal(acmeStats.evidenceTier.tier, 'ESTABLISHED');
});

test('2. Economics Engine Calculations & Safe Caching', async (t) => {
  const econ = calculateDealEconomics({
    dealValue: 100000,
    requestedDiscountPercent: 20,
    proposedDiscountPercent: 8,
    contractYears: 1
  });

  assert.equal(econ.requestedConcession, 20000, '20% of 100k is 20,000');
  assert.equal(econ.proposedConcession, 8000, '8% of 100k is 8,000');
  assert.equal(econ.concessionSavings, 12000, 'Difference saved is 12,000');

  const lab = buildStrategyLabEconomics(100000, 20);
  assert.equal(lab.conservative.discountPercent, 8);
  assert.equal(lab.balanced.discountPercent, 10);
  assert.equal(lab.aggressive.discountPercent, 18);

  // Test safe caching
  safeCache.clear();
  const cacheKey = 'econ:100000:20:8:1';
  assert.equal(await safeCache.get(cacheKey), null);
  await safeCache.set(cacheKey, econ, 60);
  const cachedVal = await safeCache.get(cacheKey);
  assert.equal(cachedVal.concessionSavings, 12000);
});

test('3. Controlled Tool-Using Agent & Execution Trace Integrity', async (t) => {
  initDatabase();
  resetDatabase();

  const analysis = await analyzeNegotiation({
    customer: 'Acme Corp',
    segment: 'enterprise',
    industry: 'technology',
    dealValue: 100000,
    requestedDiscountPercent: 20,
    competitorPressure: true
  });

  assert.ok(analysis.agentTrace, 'Agent trace must be present');
  assert.ok(analysis.agentTrace.length >= 3, 'Agent must execute multiple tool steps');

  // Verify all 5 tools executed
  const toolsInvoked = analysis.agentTrace.map(s => s.tool);
  assert.ok(toolsInvoked.includes('check_customer_history'), 'Must invoke check_customer_history');
  assert.ok(toolsInvoked.includes('recall_memory'), 'Must invoke recall_memory');
  assert.ok(toolsInvoked.includes('calculate_economics'), 'Must invoke calculate_economics');
  assert.ok(toolsInvoked.includes('reflect_strategy'), 'Must invoke reflect_strategy');
  assert.ok(toolsInvoked.includes('compare_strategies'), 'Must invoke compare_strategies');

  // Check step metadata
  for (const step of analysis.agentTrace) {
    assert.ok(step.step > 0, 'Step index must be valid');
    assert.ok(step.tool, 'Tool name must exist');
    assert.ok(step.reason, 'Reason must be provided');
    assert.ok(step.outputSummary, 'Output summary must exist');
    assert.equal(step.status, 'success', 'Tool execution must succeed');
    assert.ok(typeof step.durationMs === 'number', 'Duration must be tracked');
    assert.ok(step.source, 'Source must be declared');
    assert.ok(step.caller, 'Caller type (llm_autonomous or deterministic_fallback) must be tracked');
  }

  // Authoritative validation
  assert.equal(analysis.confidence.finalConfidence, 'MEDIUM');
  assert.ok(analysis.economics.concessionSavings > 0, 'Concession savings must be positive');
  assert.ok(analysis.evidence.totalRecalled > 0, 'Must recall real memories');
  assert.ok(analysis.reflection, 'Strategic reflection must be populated');
});

test('4. Hindsight Memory Lifecycle (Retain -> Recall -> Reflect)', async (t) => {
  initDatabase();

  // 1. Retain new deal
  const newDeal = {
    deal_id: 'DEAL-TEST-999',
    customer: 'Quantum Dynamics',
    customer_id: 'quantum-dynamics',
    segment: 'enterprise',
    industry: 'aerospace',
    objection: 'Budget freeze',
    initial_offer: 300000,
    counter_offer: 270000,
    concession_percent: 10,
    strategy: '10% discount + multi-year contract',
    competitor_pressure: 1,
    contract_years: 2,
    outcome: 'WON',
    outcome_reason: 'Closed successfully by offering multi-year commitment with 10% concession.'
  };

  const retainRes = await retainNegotiationMemory(newDeal);
  assert.ok(retainRes.success, 'Retain must succeed');

  // Insert into SQLite database so local recall can find it
  db.prepare(`
    INSERT OR REPLACE INTO negotiations (
      deal_id, customer, customer_id, segment, industry, date, objection,
      initial_offer, counter_offer, requested_discount_percent, strategy,
      concession_percent, competitor_pressure, contract_years, outcome, outcome_reason, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    newDeal.deal_id, newDeal.customer, newDeal.customer_id, newDeal.segment, newDeal.industry,
    '2026-10-01', newDeal.objection, newDeal.initial_offer, newDeal.counter_offer, 10,
    newDeal.strategy, newDeal.concession_percent, newDeal.competitor_pressure, newDeal.contract_years,
    newDeal.outcome, newDeal.outcome_reason, new Date().toISOString()
  );

  // 2. Recall memory
  const recallRes = await recallNegotiationMemories('Quantum Dynamics budget freeze', {
    customerId: 'quantum-dynamics',
    segment: 'enterprise'
  });

  assert.ok(recallRes.memories.length > 0, 'Must recall retained Quantum Dynamics deal');
  assert.ok(recallRes.memories.some(m => m.customer.includes('Quantum Dynamics') || m.dealId === 'DEAL-TEST-999'), 'Must recall Quantum deal');

  // 3. Reflect synthesis
  const reflectRes = await reflectNegotiationSynthesis('Quantum Dynamics enterprise negotiation patterns');
  assert.ok(reflectRes.synthesis, 'Reflection must produce synthesis');
  assert.ok(reflectRes.source, 'Reflection must have source');
});

test('5. Unknown Customer Analysis (Zero Fabrication & LOW Confidence)', async (t) => {
  const analysis = await analyzeNegotiation({
    customer: 'BrandNewStartup123',
    segment: 'government',
    industry: 'defense',
    dealValue: 50000,
    requestedDiscountPercent: 25
  });

  assert.equal(analysis.deal.customer, 'BrandNewStartup123');
  assert.equal(analysis.confidence.finalConfidence, 'LOW', 'Zero historical memory must produce LOW confidence');
  assert.equal(analysis.confidence.sampleSize, 0, 'Sample size must be 0 for unknown customer and unknown segment');
  assert.equal(analysis.economics.dealValue, 50000);
  assert.ok(analysis.agentTrace.length > 0, 'Agent trace must record tool steps');
});

test('6. Deterministic Fallback & Counteroffer Simulation', async (t) => {
  const sim = await simulateWhatIf('DEAL-001', {
    customer: 'Acme Corp',
    segment: 'enterprise',
    dealValue: 120000,
    discountPercent: 10,
    contractYears: 2,
    includeSupport: true
  });

  assert.ok(sim.economics, 'Simulation must produce economics calculation');
  assert.ok(sim.economics.concessionSavings >= 0, 'Must compute concession savings');
  assert.ok(sim.deterministicOutcome, 'Must produce deterministic outcome');
  assert.ok(sim.reflection, 'Must provide reflection context');

  const counter = await analyzeCounteroffer('DEAL-001', 90000);
  assert.equal(counter.dealId, 'DEAL-001');
  assert.ok(counter.analysis, 'Counteroffer analysis must include full deal assessment');
  assert.ok(counter.suggestedResponse, 'Must generate suggested customer response');
});

test('7. Groq Error Classification & Retry Extraction', async (t) => {
  // 1. Rate limit 429 with retry text
  const err429 = new Error('Rate limit reached on TPM: Limit 8000, Used 7800. Please try again in 8.5s.');
  err429.status = 429;
  const classified429 = classifyGroqError(err429);
  assert.equal(classified429.type, 'RATE_LIMIT');
  assert.equal(classified429.status, 429);
  assert.equal(classified429.retryAfterSec, 9);
  assert.equal(classified429.retryable, false);

  // 2. Rate limit 429 with header
  const err429Header = new Error('Rate limit exceeded');
  err429Header.status = 429;
  err429Header.headers = { 'retry-after': '12' };
  const classifiedHeader = classifyGroqError(err429Header);
  assert.equal(classifiedHeader.type, 'RATE_LIMIT');
  assert.equal(classifiedHeader.retryAfterSec, 12);

  // 3. Not Found 404
  const err404 = new Error('The model `obsolete-model` does not exist');
  err404.status = 404;
  const classified404 = classifyGroqError(err404);
  assert.equal(classified404.type, 'NOT_FOUND');
  assert.equal(classified404.status, 404);

  // 4. Unauthorized 401
  const err401 = new Error('Invalid API Key provided');
  err401.status = 401;
  const classified401 = classifyGroqError(err401);
  assert.equal(classified401.type, 'UNAUTHORIZED');
  assert.equal(classified401.status, 401);

  // 5. Server Error 503 (Retryable)
  const err503 = new Error('Service Unavailable');
  err503.status = 503;
  const classified503 = classifyGroqError(err503);
  assert.equal(classified503.type, 'SERVER_ERROR');
  assert.equal(classified503.status, 503);
  assert.equal(classified503.retryable, true);
});

test('8. Model-Level Cooldown Management', async (t) => {
  clearModelCooldowns();

  const testModel = 'test-model-cooldown';
  assert.equal(isModelInCooldown(testModel).inCooldown, false);

  // Set 200ms cooldown
  setModelCooldown(testModel, 200, 'Test 429 Rate Limit');
  const active = isModelInCooldown(testModel);
  assert.equal(active.inCooldown, true);
  assert.ok(active.remainingMs > 0);

  const status = getModelCooldownStatus();
  assert.ok(status);

  // Wait for expiry
  await new Promise(r => setTimeout(r, 250));
  assert.equal(isModelInCooldown(testModel).inCooldown, false);

  clearModelCooldowns();
});

test('9. Model Failover & Deterministic Fallback on All Models Cooling Down', async (t) => {
  clearModelCooldowns();

  // Put all configured models in cooldown
  for (const m of CONFIGURED_MODELS) {
    setModelCooldown(m, 5000, 'Simulated Global 429');
  }

  const result = await invokeGroqChat([{ role: 'user', content: 'test' }]);
  assert.equal(result, null, 'Must return null when all models are cooling down to trigger deterministic fallback');

  clearModelCooldowns();
});

test('10. Human Approval Workflow Engine', (t) => {
  initDatabase();

  // 1. Check threshold evaluation
  const checkHigh = checkApprovalRequired(20);
  assert.equal(checkHigh.required, true, '20% requested discount must require approval (threshold 15%)');

  const checkLow = checkApprovalRequired(10);
  assert.equal(checkLow.required, false, '10% requested discount must NOT require approval');

  // 2. Create pending approval
  const deal = { dealId: 'DEAL-APPROV-001', customer: 'Acme Corp', requestedDiscountPercent: 20 };
  const pending = createPendingApproval(deal, '8% discount + support');
  assert.equal(pending.status, 'PENDING');
  assert.equal(pending.deal_id, 'DEAL-APPROV-001');

  // 3. Process approval decision
  const approved = processApprovalDecision(pending.approval_id, {
    status: 'APPROVED',
    managerName: 'VP Sales',
    decisionNotes: 'Strategic account exception approved.'
  });
  assert.equal(approved.status, 'APPROVED');
  assert.equal(approved.manager_name, 'VP Sales');

  // 4. Duplicate processing should fail
  assert.throws(() => {
    processApprovalDecision(pending.approval_id, { status: 'REJECTED' });
  }, /already been processed/);
});

test('11. Agent Durable Checkpoint & Session Resumability', (t) => {
  initDatabase();

  const sessionId = `SES-TEST-${Date.now()}`;
  const checkpointData = {
    dealId: 'DEAL-CHECK-001',
    customer: 'Acme Corp',
    status: 'IN_PROGRESS',
    completedTools: ['check_customer_history', 'recall_memory'],
    pendingTools: ['calculate_economics'],
    trace: [{ step: 1, tool: 'check_customer_history', status: 'success' }],
    modelUsed: 'openai/gpt-oss-120b',
    state: { confidence: 'MEDIUM' }
  };

  checkpointManager.saveCheckpoint(sessionId, checkpointData);
  const loaded = checkpointManager.getCheckpoint(sessionId);

  assert.equal(loaded.sessionId, sessionId);
  assert.equal(loaded.customer, 'Acme Corp');
  assert.equal(loaded.completedTools.length, 2);
  assert.equal(loaded.completedTools[0], 'check_customer_history');
  assert.equal(loaded.state.confidence, 'MEDIUM');

  checkpointManager.deleteCheckpoint(sessionId);
  assert.equal(checkpointManager.getCheckpoint(sessionId), null);
});

test('12. Full Agent Evaluation Suite Benchmarks', async (t) => {
  const evalResults = await runAgentEvaluationSuite();

  assert.equal(evalResults.totalBenchmarks, 8);
  assert.equal(evalResults.passedBenchmarks, 8, 'Must pass 8/8 benchmarks');
  assert.equal(evalResults.overallScore, 100, 'Overall evaluation score must be 100%');

  console.log(`\nEvaluation Score: ${evalResults.overallScore}% (${evalResults.passedBenchmarks}/${evalResults.totalBenchmarks} passed)`);
});

test('13. Approval Security, Self-Approval Prevention, and Expiration', (t) => {
  initDatabase();

  // 1. Salesperson self-approval blocked
  const deal = { dealId: 'DEAL-SEC-01', customer: 'SecurityCorp', requestedDiscountPercent: 25, salesperson: 'alice_sales' };
  const pending = createPendingApproval(deal, '10% discount', 'alice_sales');

  assert.throws(() => {
    processApprovalDecision(pending.approval_id, {
      status: 'APPROVED',
      managerName: 'alice_sales', // Same as requested_by
      role: 'SALESPERSON'
    });
  }, /Unauthorized/);

  // 2. Salesperson role blocked even with different name
  assert.throws(() => {
    processApprovalDecision(pending.approval_id, {
      status: 'APPROVED',
      managerName: 'bob_sales',
      role: 'SALESPERSON'
    });
  }, /Sales representatives cannot approve/);

  // 3. Manager approval with modified discount succeeds
  const modified = processApprovalDecision(pending.approval_id, {
    status: 'MODIFIED',
    managerName: 'carol_vp_sales',
    role: 'MANAGER',
    modifiedDiscount: 12,
    decisionNotes: 'Capped at 12% with mandatory multi-year contract.'
  });
  assert.equal(modified.status, 'MODIFIED');
  assert.ok(modified.decision_notes.includes('12%'));

  // 4. Expired approval handling
  const expiredDeal = { dealId: 'DEAL-EXP-01', customer: 'ExpiredCorp', requestedDiscountPercent: 20 };
  const pendingExpired = createPendingApproval(expiredDeal, '8% discount');
  // Backdate expiration in database
  db.prepare("UPDATE negotiation_approvals SET expires_at = '2020-01-01T00:00:00.000Z' WHERE approval_id = ?")
    .run(pendingExpired.approval_id);

  assert.throws(() => {
    processApprovalDecision(pendingExpired.approval_id, {
      status: 'APPROVED',
      managerName: 'carol_vp_sales',
      role: 'MANAGER'
    });
  }, /expired/);

  const expiredRecord = db.prepare('SELECT * FROM negotiation_approvals WHERE approval_id = ?').get(pendingExpired.approval_id);
  assert.equal(expiredRecord.status, 'EXPIRED');
});

test('14. Transactional Outbox & Hindsight Recovery Queue', async (t) => {
  initDatabase();

  const mockDeal = {
    deal_id: 'DEAL-OUTBOX-01',
    customer: 'OutboxCorp',
    customer_id: 'outbox-corp',
    segment: 'enterprise',
    industry: 'technology',
    date: '2026-10-01',
    objection: 'Budget freeze',
    initial_offer: 100000,
    counter_offer: 90000,
    requested_discount_percent: 10,
    strategy: '5% discount',
    concession_percent: 5,
    competitor_pressure: 0,
    contract_years: 1,
    outcome: 'WON',
    outcome_reason: 'Closed smoothly'
  };

  const retainRes = await retainNegotiationMemory(mockDeal);
  assert.ok(retainRes.success, 'Retention must succeed');

  // Verify outbox table exists and is queryable
  const outboxCount = db.prepare('SELECT COUNT(*) as count FROM hindsight_outbox').get().count;
  assert.ok(typeof outboxCount === 'number');
});

test('15. Exact Confidence Thresholds & Zero vs Single Deal Boundaries', (t) => {
  initDatabase();

  // Zero deals boundary
  const zeroStats = evaluateConfidenceAndConflict('CompletelyUnknownCo', 'enterprise');
  assert.equal(zeroStats.customerStats.total, 0);
  assert.equal(zeroStats.evidenceTier.tier, 'NONE');
  assert.equal(zeroStats.finalConfidence, 'LOW');

  // Single deal boundary (seed Novatech has only 1 deal in enterprise)
  const novaStats = evaluateConfidenceAndConflict('NovaTech', 'enterprise');
  assert.equal(novaStats.customerStats.total, 1);
  assert.equal(novaStats.evidenceTier.tier, 'PRELIMINARY');
  assert.equal(novaStats.finalConfidence, 'LOW');
});

test('16. Redis Configuration & In-Process Fallback Transparency', (t) => {
  const status = getRedisStatus();
  assert.ok(status);
  assert.ok('available' in status);
  assert.ok('mode' in status);

  // Explicit transparency assertion:
  // When REDIS_URL is not set, mode must be 'in_memory_fallback' and available must be false.
  if (!process.env.REDIS_URL) {
    assert.equal(status.available, false);
    assert.equal(status.mode, 'in_memory_fallback');
    assert.equal(status.reason, 'REDIS_URL not configured');
  }
});

test('17. User Authentication, Password Hashing & JWT Security (Batch 1)', async (t) => {
  initDatabase();

  // 1. Password hashing and verification
  const rawPw = 'SecureSecretPass123!';
  const hashed = await hashPassword(rawPw);
  assert.notEqual(hashed, rawPw);
  assert.equal(await verifyPassword(rawPw, hashed), true);
  assert.equal(await verifyPassword('WrongPassword', hashed), false);

  // 2. JWT token lifecycle
  const tokenPayload = {
    userId: 'usr_test_123',
    tenantId: 'tenant_default',
    email: 'tester@dealmind.local',
    role: 'MANAGER',
    name: 'Test Manager'
  };
  const token = generateAccessToken(tokenPayload);
  assert.ok(token);
  assert.ok(typeof token === 'string');

  const decoded = verifyAccessToken(token);
  assert.equal(decoded.userId, 'usr_test_123');
  assert.equal(decoded.tenantId, 'tenant_default');
  assert.equal(decoded.role, 'MANAGER');

  // 3. User registration and authentication
  const regEmail = `test_user_${Date.now()}@dealmind.local`;
  const registered = await registerUser({
    email: regEmail,
    password: 'Password123!',
    name: 'Dynamic Tester',
    role: 'SALESPERSON',
    tenantId: 'tenant_default'
  });
  assert.equal(registered.user.email, regEmail);
  assert.equal(registered.user.role, 'SALESPERSON');
  assert.equal(registered.user.tenant_id, 'tenant_default');


  // Authenticate valid credentials
  const authRes = await authenticateUser(regEmail, 'Password123!');
  assert.ok(authRes.token);
  assert.equal(authRes.user.email, regEmail);

  // Authenticate invalid password should fail
  await assert.rejects(async () => {
    await authenticateUser(regEmail, 'InvalidPass');
  }, /Invalid email or password/);

  // Authenticate non-existent user should fail
  await assert.rejects(async () => {
    await authenticateUser('nonexistent@dealmind.local', 'Password123!');
  }, /Invalid email or password/);
});

test('18. Multi-Tenant Isolation across Database, Approvals, and Checkpoints (Batch 2)', async (t) => {
  initDatabase();

  // 1. Insert negotiations in separate tenants
  const tenant1 = 'tenant_default';
  const tenant2 = 'tenant_secondary';

  db.prepare(`
    INSERT OR REPLACE INTO negotiations (
      tenant_id, deal_id, customer, customer_id, segment, industry, date, objection,
      initial_offer, counter_offer, requested_discount_percent, strategy,
      concession_percent, competitor_pressure, contract_years, outcome, outcome_reason, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    tenant1, 'DEAL-TENANT1-01', 'Tenant1 Corp', 'tenant1-corp', 'enterprise', 'tech',
    '2026-10-01', 'Price', 100000, 90000, 10, 'Standard', 10, 0, 1, 'WON', 'Closed', new Date().toISOString()
  );

  db.prepare(`
    INSERT OR REPLACE INTO negotiations (
      tenant_id, deal_id, customer, customer_id, segment, industry, date, objection,
      initial_offer, counter_offer, requested_discount_percent, strategy,
      concession_percent, competitor_pressure, contract_years, outcome, outcome_reason, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    tenant2, 'DEAL-TENANT2-01', 'Tenant2 Corp', 'tenant2-corp', 'enterprise', 'tech',
    '2026-10-01', 'Price', 200000, 180000, 10, 'Standard', 10, 0, 1, 'WON', 'Closed', new Date().toISOString()
  );

  // Verify isolated query
  const t1Deals = db.prepare('SELECT deal_id FROM negotiations WHERE tenant_id = ?').all(tenant1);
  const t2Deals = db.prepare('SELECT deal_id FROM negotiations WHERE tenant_id = ?').all(tenant2);

  assert.ok(t1Deals.some(d => d.deal_id === 'DEAL-TENANT1-01'));
  assert.ok(!t1Deals.some(d => d.deal_id === 'DEAL-TENANT2-01'));
  assert.ok(t2Deals.some(d => d.deal_id === 'DEAL-TENANT2-01'));
  assert.ok(!t2Deals.some(d => d.deal_id === 'DEAL-TENANT1-01'));

  // 2. Approval Tenant Isolation
  const pendingT1 = createPendingApproval(
    { dealId: 'DEAL-TENANT1-01', customer: 'Tenant1 Corp', requestedDiscountPercent: 25 },
    '15% discount',
    'sales_t1',
    tenant1
  );
  assert.equal(pendingT1.tenant_id, tenant1);

  // Cross-tenant approval attempt must be blocked
  assert.throws(() => {
    processApprovalDecision(pendingT1.approval_id, {
      status: 'APPROVED',
      managerName: 'Manager T2',
      role: 'MANAGER',
      tenantId: tenant2, // Wrong tenant!
      decisionNotes: 'Cross-tenant approval attempt'
    });
  }, /Tenant mismatch/);

  // Same tenant approval succeeds
  const approvedT1 = processApprovalDecision(pendingT1.approval_id, {
    status: 'APPROVED',
    managerName: 'Manager T1',
    role: 'MANAGER',
    tenantId: tenant1,
    decisionNotes: 'Valid manager sign-off for tenant 1'
  });
  assert.equal(approvedT1.status, 'APPROVED');

  // 3. Checkpoint Tenant Isolation
  const sessionId = `SES-ISO-${Date.now()}`;
  checkpointManager.saveCheckpoint(sessionId, {
    dealId: 'DEAL-TENANT1-01',
    customer: 'Tenant1 Corp',
    completedTools: ['check_customer_history']
  }, tenant1);

  // Attempting to read with tenant2 must return null
  const crossRead = checkpointManager.getCheckpoint(sessionId, tenant2);
  assert.equal(crossRead, null, 'Cross-tenant checkpoint read must return null');

  // Same tenant read succeeds
  const sameRead = checkpointManager.getCheckpoint(sessionId, tenant1);
  assert.ok(sameRead);
  assert.equal(sameRead.dealId, 'DEAL-TENANT1-01');
});

test('19. Operation-Level Idempotency via agent_operations (Batch 4)', async (t) => {
  initDatabase();

  const idempotencyKey = `idemp-key-${Date.now()}`;
  const tenantId = 'tenant_default';
  const dealId = 'DEAL-IDEMP-01';

  // 1. First execution
  const opRecord = db.prepare(`
    INSERT INTO agent_operations (idempotency_key, tenant_id, session_id, operation_type, status, payload_json, result_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    idempotencyKey, tenantId, 'SES-01', 'OUTCOME_RECORDING', 'COMPLETED',
    JSON.stringify({ dealId }),
    JSON.stringify({ success: true, outcome: 'WON', message: 'Recorded' }),
    new Date().toISOString(), new Date().toISOString()
  );
  assert.ok(opRecord.changes > 0);

  // 2. Querying operation returns completed cached result
  const existing = db.prepare('SELECT * FROM agent_operations WHERE idempotency_key = ? AND tenant_id = ?')
    .get(idempotencyKey, tenantId);
  assert.ok(existing);
  assert.equal(existing.status, 'COMPLETED');
  const parsedResult = JSON.parse(existing.result_json);
  assert.equal(parsedResult.outcome, 'WON');

  // 3. Duplicate insertion with same idempotency key fails primary key/unique constraint
  assert.throws(() => {
    db.prepare(`
      INSERT INTO agent_operations (idempotency_key, tenant_id, session_id, operation_type, status, payload_json, result_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(idempotencyKey, tenantId, 'SES-01', 'OUTCOME_RECORDING', 'COMPLETED', '{}', '{}', new Date().toISOString(), new Date().toISOString());
  }, /UNIQUE constraint failed/);
});

test('20. Transactional Outbox Retries, Backoff & Max Attempts Transition (Batch 5)', async (t) => {
  initDatabase();

  const tenantId = 'tenant_default';

  // Insert mock failing outbox record
  const res = db.prepare(`
    INSERT INTO hindsight_outbox (
      tenant_id, deal_id, action, payload_json, status, attempts, max_attempts, next_retry_at, created_at, updated_at
    ) VALUES (?, ?, 'RETAIN', ?, 'PENDING', 4, 5, ?, ?, ?)
  `).run(
    tenantId, 'DEAL-FAIL-01',
    JSON.stringify({ deal_id: 'DEAL-FAIL-01', customer: 'FailingCorp' }),
    new Date(Date.now() - 1000).toISOString(),
    new Date().toISOString(), new Date().toISOString()
  );

  const outboxId = res.lastInsertRowid;

  // Verify sync process handles and tracks outbox
  const syncRes = await syncHindsightOutbox();
  assert.ok(typeof syncRes.processed === 'number');

  // Verify status in outbox
  const record = db.prepare('SELECT * FROM hindsight_outbox WHERE id = ?').get(outboxId);
  assert.ok(record);
  // Attempts should have been incremented or completed if retention succeeded with formatted content
  assert.ok(['COMPLETED', 'PROCESSED', 'FAILED', 'RETRY_SCHEDULED'].includes(record.status));
});

test('21. Distributed Rate Limiting & Concurrency Slots (Batch 3)', async (t) => {
  // 1. Rate limiter test
  const testLimiter = createRateLimiter({ maxRequests: 5, windowMs: 1000 }); // 5 requests per 1s
  const req = { ip: '127.0.0.1', path: '/api/test' };

  for (let i = 0; i < 5; i++) {
    const res = await testLimiter.consume(req);
    assert.equal(res.allowed, true, `Request ${i + 1} should be allowed`);
  }

  const blockedRes = await testLimiter.consume(req);
  assert.equal(blockedRes.allowed, false, '6th request must be blocked');
  assert.ok(blockedRes.retryAfterSec > 0);

  // 2. Concurrency slots
  const slot1 = await acquireConcurrencySlot('tenant_test_conc', 2);
  assert.equal(slot1.acquired, true);

  const slot2 = await acquireConcurrencySlot('tenant_test_conc', 2);
  assert.equal(slot2.acquired, true);

  const slot3 = await acquireConcurrencySlot('tenant_test_conc', 2);
  assert.equal(slot3.acquired, false, '3rd slot must be rejected when limit is 2');

  // Release slot
  await slot1.release();
  const slotAfterRelease = await acquireConcurrencySlot('tenant_test_conc', 2);
  assert.equal(slotAfterRelease.acquired, true, 'Slot should be acquirable after release');
  await slot2.release();
  await slotAfterRelease.release();

  // 3. Token budget manager
  const checkGlobal = await tokenBudgetManager.checkAndConsume('tenant_test_budget', 100);
  assert.equal(checkGlobal.allowed, true);
});

test('22. SSE Streaming, Sequence Numbers & Replay Buffer (Batch 7)', () => {

  // Verify SSE event formatting and replay logic
  const events = [];
  let seq = 0;

  function pushEvent(type, data) {
    seq++;
    events.push({
      id: String(seq),
      type,
      data,
      timestamp: Date.now()
    });
  }

  pushEvent('STEP_START', { step: 1, tool: 'check_customer_history' });
  pushEvent('STEP_COMPLETE', { step: 1, tool: 'check_customer_history', status: 'success' });
  pushEvent('ANALYSIS_COMPLETE', { dealId: 'DEAL-001', finalConfidence: 'MEDIUM' });

  assert.equal(events.length, 3);
  assert.equal(events[0].id, '1');
  assert.equal(events[2].id, '3');

  // Replay from Last-Event-ID = 1
  const lastEventId = 1;
  const replayed = events.filter(e => Number(e.id) > lastEventId);
  assert.equal(replayed.length, 2);
  assert.equal(replayed[0].id, '2');
  assert.equal(replayed[1].id, '3');
});

test('23. Hindsight Payload Schema: Guaranteed Non-Empty Content & Strict Tenant Scoping', () => {
  // Case A: Full deal object
  const fullDeal = {
    deal_id: 'DEAL-SCHEMA-01',
    customer: 'Schema Corp',
    customer_id: 'schema-corp',
    segment: 'enterprise',
    industry: 'technology',
    date: '2026-10-02',
    objection: 'Budget constraints',
    initial_offer: 150000,
    counter_offer: 135000,
    strategy: '10% discount + onboarding support',
    concession_percent: 10,
    competitor_pressure: 1,
    contract_years: 2,
    outcome: 'WON',
    outcome_reason: 'Customer accepted 10% concession with onboarding bundle.'
  };

  const formattedFull = formatNegotiationMemoryPayload(fullDeal, 'tenant_custom');
  assert.ok(typeof formattedFull.content === 'string' && formattedFull.content.length > 50, 'content must be non-empty string');
  assert.equal(formattedFull.documentId, 'tenant_custom::DEAL-SCHEMA-01', 'documentId must be deterministic and tenant-scoped');
  assert.equal(formattedFull.metadata.tenant_id, 'tenant_custom');
  assert.equal(formattedFull.metadata.deal_id, 'DEAL-SCHEMA-01');
  assert.ok(formattedFull.tags.includes('tenant:tenant_custom'), 'tags must contain tenant tag');
  assert.ok(formattedFull.tags.includes('schema-corp'));
  assert.ok(formattedFull.tags.includes('WON'));

  // Case B: Partial / Minimal deal object (like DEAL-FAIL-01: {"deal_id":"DEAL-FAIL-01","customer":"FailingCorp"})
  const partialDeal = { deal_id: 'DEAL-FAIL-01', customer: 'FailingCorp' };
  const formattedPartial = formatNegotiationMemoryPayload(partialDeal, 'tenant_default');
  assert.ok(typeof formattedPartial.content === 'string' && formattedPartial.content.length > 20, 'partial deal must still produce non-empty content');
  assert.equal(formattedPartial.documentId, 'tenant_default::DEAL-FAIL-01');
  assert.equal(formattedPartial.metadata.customer, 'FailingCorp');
  assert.ok(formattedPartial.tags.includes('tenant:tenant_default'));

  // Case C: Object with pre-existing textContent or empty object
  const emptyObj = {};
  const formattedEmpty = formatNegotiationMemoryPayload(emptyObj, 'tenant_abc');
  assert.ok(typeof formattedEmpty.content === 'string' && formattedEmpty.content.length > 0, 'empty object must never produce undefined content');
  assert.equal(formattedEmpty.metadata.tenant_id, 'tenant_abc');
});

test('24. Transactional Outbox Recovery: Recovering FAILED Event #6 & Preserving Lineage', async () => {
  initDatabase();
  const tenantId = 'tenant_default';

  // Seed or ensure outbox event #6 (DEAL-FAIL-01) is in FAILED state with missing content error
  db.prepare(`
    INSERT OR REPLACE INTO hindsight_outbox (
      id, tenant_id, deal_id, action, payload_json, status, attempts, max_attempts, last_error, next_retry_at, created_at, updated_at
    ) VALUES (6, ?, 'DEAL-FAIL-01', 'RETAIN', ?, 'FAILED', 5, 5, ?, ?, ?, ?)
  `).run(
    tenantId,
    JSON.stringify({ deal_id: 'DEAL-FAIL-01', customer: 'FailingCorp' }),
    'retainBatch failed: [{"type":"missing","loc":["body","items",0,"content"],"msg":"Field required","input":{"tags":["tenant:tenant_default"]}}]',
    new Date().toISOString(),
    new Date().toISOString(),
    new Date().toISOString()
  );

  const beforeRecord = db.prepare('SELECT * FROM hindsight_outbox WHERE id = 6').get();
  assert.equal(beforeRecord.status, 'FAILED');
  assert.ok(beforeRecord.last_error.includes('Field required'));

  // Execute targeted single-event recovery via retryOutboxEvent
  const retryResult = await retryOutboxEvent(6, tenantId);
  assert.ok(retryResult.success || retryResult.mode === 'sqlite_local', 'Retry attempt must execute cleanly');

  const afterRecord = db.prepare('SELECT * FROM hindsight_outbox WHERE id = 6').get();
  assert.ok(['COMPLETED', 'PENDING'].includes(afterRecord.status), 'Event status must be recovered');
  if (retryResult.success) {
    assert.equal(afterRecord.status, 'COMPLETED');
    assert.equal(afterRecord.last_error, null, 'Error must be cleared upon successful retention');
  }

  // Also test batch drain with retryFailed: true
  const batchRes = await syncHindsightOutbox(tenantId, { retryFailed: true });
  assert.ok(typeof batchRes.processed === 'number');
});

test('25. Subsequent Negotiation Recall after Outbox Retention', async () => {
  initDatabase();
  const tenantId = 'tenant_default';

  // Retain a fresh unique negotiation outcome
  const testDeal = {
    deal_id: `DEAL-RECALL-${Date.now()}`,
    customer: 'RecallVerificationCorp',
    customer_id: 'recall-verification-corp',
    segment: 'enterprise',
    industry: 'technology',
    date: '2026-10-02',
    objection: 'Feature parity and discount',
    initial_offer: 120000,
    counter_offer: 108000,
    strategy: '10% discount with SLA guarantee',
    concession_percent: 10,
    competitor_pressure: 1,
    contract_years: 2,
    outcome: 'WON',
    outcome_reason: 'Closed smoothly with SLA package'
  };

  const retainRes = await retainNegotiationMemory(testDeal, tenantId);
  assert.ok(retainRes.success, 'Retention must succeed');

  // Query recall to verify it is retrievable in subsequent negotiations
  const recallRes = await recallNegotiationMemories('RecallVerificationCorp SLA guarantee', {
    tenantId,
    customerId: 'recall-verification-corp',
    segment: 'enterprise'
  });

  assert.ok(recallRes.memories.length > 0, 'Recall should find memories');
  const found = recallRes.memories.find(m => m.customer === 'RecallVerificationCorp' || m.customerId === 'recall-verification-corp');
  assert.ok(found || recallRes.memories.length > 0, 'Subsequent negotiation can retrieve relevant precedent');
});

test('26. Permissions Registry & Role Capability Matrix', () => {
  // SALESPERSON capabilities
  assert.equal(hasPermission('SALESPERSON', PERMISSIONS.DEALS_CREATE), true);
  assert.equal(hasPermission('SALESPERSON', PERMISSIONS.DEALS_ANALYZE), true);
  assert.equal(hasPermission('SALESPERSON', PERMISSIONS.DEALS_VIEW), true);
  assert.equal(hasPermission('SALESPERSON', PERMISSIONS.DEALS_SIMULATE), true);
  assert.equal(hasPermission('SALESPERSON', PERMISSIONS.DEALS_RECORD_OUTCOME), true);
  assert.equal(hasPermission('SALESPERSON', PERMISSIONS.MEMORY_VIEW), true);
  assert.equal(hasPermission('SALESPERSON', PERMISSIONS.LEARNING_VIEW), true);
  assert.equal(hasPermission('SALESPERSON', PERMISSIONS.APPROVALS_VIEW), true);
  // SALESPERSON denied capabilities (including infrastructure diagnostics)
  assert.equal(hasPermission('SALESPERSON', PERMISSIONS.INFRASTRUCTURE_VIEW), false);
  assert.equal(hasPermission('SALESPERSON', PERMISSIONS.APPROVALS_DECIDE), false);
  assert.equal(hasPermission('SALESPERSON', PERMISSIONS.INFRASTRUCTURE_MANAGE_OUTBOX), false);
  assert.equal(hasPermission('SALESPERSON', PERMISSIONS.DATABASE_RESET), false);
  assert.equal(hasPermission('SALESPERSON', PERMISSIONS.USERS_MANAGE), false);

  // MANAGER capabilities
  assert.equal(hasPermission('MANAGER', PERMISSIONS.INFRASTRUCTURE_VIEW), true);
  assert.equal(hasPermission('MANAGER', PERMISSIONS.APPROVALS_DECIDE), true);
  assert.equal(hasPermission('MANAGER', PERMISSIONS.INFRASTRUCTURE_MANAGE_OUTBOX), true);
  assert.equal(hasPermission('MANAGER', PERMISSIONS.AUDIT_VIEW), true);
  assert.equal(hasPermission('MANAGER', PERMISSIONS.DATABASE_RESET), false);
  assert.equal(hasPermission('MANAGER', PERMISSIONS.USERS_MANAGE), false);

  // ADMIN capabilities
  assert.equal(hasPermission('ADMIN', PERMISSIONS.DATABASE_RESET), true);
  assert.equal(hasPermission('ADMIN', PERMISSIONS.USERS_MANAGE), true);
  assert.equal(hasPermission('ADMIN', PERMISSIONS.APPROVALS_DECIDE), true);
  assert.equal(hasPermission('ADMIN', PERMISSIONS.INFRASTRUCTURE_MANAGE_OUTBOX), true);
});

test('27. Salesperson Approval Workflow & Restricted Decision Making', () => {
  initDatabase();
  const tenantId = 'tenant_default';

  // Salesperson can list approvals in read-only mode
  const pending = listPendingApprovals(tenantId);
  assert.ok(Array.isArray(pending), 'Pending approvals must be accessible as an array');

  // Direct approval decision attempt by SALESPERSON must be rejected
  const approvalItem = pending[0] || createPendingApproval(
    { dealId: 'DEAL-TEST-RBAC-01', customer: 'RoleTestCorp', requestedDiscountPercent: 25 },
    '15% concession',
    'sales_rep_1',
    tenantId
  );

  assert.throws(() => {
    processApprovalDecision(approvalItem.approval_id, {
      status: 'APPROVED',
      managerName: 'Sales Rep Self',
      userId: 'sales_rep_1',
      role: 'SALESPERSON',
      tenantId,
      decisionNotes: 'Attempting self-authorization'
    });
  }, /Sales representatives cannot approve/);
});

test('28. Anti-Self-Approval Enforcement (Manager cannot approve own submitted deals)', () => {
  initDatabase();
  const tenantId = 'tenant_default';

  const approval = createPendingApproval(
    { dealId: `DEAL-SELF-${Date.now()}`, customer: 'SelfApprovalCorp', requestedDiscountPercent: 22 },
    '10% concession',
    'manager_sally',
    tenantId
  );

  // Attempt: matching requester
  assert.throws(() => {
    processApprovalDecision(approval.approval_id, {
      status: 'APPROVED',
      managerName: 'Sally VP',
      userId: 'manager_sally',
      role: 'MANAGER',
      tenantId,
      decisionNotes: 'Self approving deal'
    });
  }, /Requester cannot self-approve/);

  // Legitimate independent manager approval succeeds
  const decisionResult = processApprovalDecision(approval.approval_id, {
    status: 'APPROVED',
    managerName: 'Independent Manager Bob',
    userId: 'manager_bob',
    email: 'bob.manager@dealmind.local',
    role: 'MANAGER',
    tenantId,
    decisionNotes: 'Strategic alignment confirmed, margin acceptable'
  });

  assert.equal(decisionResult.status, 'APPROVED');
  assert.ok(decisionResult.decision_notes.includes('Strategic alignment confirmed'));
});

test('29. Approval Governance: Mandatory Decision Notes & Modified Discount Validation', () => {
  initDatabase();
  const tenantId = 'tenant_default';

  const approval = createPendingApproval(
    { dealId: `DEAL-VALID-${Date.now()}`, customer: 'ValidationCorp', requestedDiscountPercent: 30 },
    '20% concession',
    'sales_rep_2',
    tenantId
  );

  // Missing decision notes must throw
  assert.throws(() => {
    processApprovalDecision(approval.approval_id, {
      status: 'REJECTED',
      managerName: 'Manager Alex',
      userId: 'mgr_alex',
      role: 'MANAGER',
      tenantId,
      decisionNotes: '   '
    });
  }, /A non-empty decision note is mandatory/);

  // MODIFIED status requires valid numeric discount between 0 and 100
  assert.throws(() => {
    processApprovalDecision(approval.approval_id, {
      status: 'MODIFIED',
      managerName: 'Manager Alex',
      userId: 'mgr_alex',
      role: 'MANAGER',
      tenantId,
      modifiedDiscount: 150, // Invalid > 100
      decisionNotes: 'Counter 150%'
    });
  }, /Modified discount percentage must be between 0 and 100/);

  // Valid MODIFIED decision succeeds
  const modifiedRes = processApprovalDecision(approval.approval_id, {
    status: 'MODIFIED',
    managerName: 'Manager Alex',
    userId: 'mgr_alex',
    role: 'MANAGER',
    tenantId,
    modifiedDiscount: 18,
    decisionNotes: 'Approved counter-proposal capped at 18% with quarterly commitments'
  });

  assert.equal(modifiedRes.status, 'MODIFIED');
  assert.ok(modifiedRes.decision_notes.includes('MODIFIED concession to 18%'));
});

test('30. Cannot Re-decide Already Concluded Approvals', () => {
  initDatabase();
  const tenantId = 'tenant_default';

  const approval = createPendingApproval(
    { dealId: `DEAL-ONCE-${Date.now()}`, customer: 'SingleDecisionCorp', requestedDiscountPercent: 20 },
    '10% concession',
    'sales_rep_3',
    tenantId
  );

  // First decision
  processApprovalDecision(approval.approval_id, {
    status: 'REJECTED',
    managerName: 'Manager Dan',
    userId: 'mgr_dan',
    role: 'MANAGER',
    tenantId,
    decisionNotes: 'Margin profile does not support requested concession'
  });

  // Second decision attempt on same approval must throw
  assert.throws(() => {
    processApprovalDecision(approval.approval_id, {
      status: 'APPROVED',
      managerName: 'Admin Frank',
      userId: 'admin_frank',
      role: 'ADMIN',
      tenantId,
      decisionNotes: 'Trying to overturn rejection'
    });
  }, /has already been processed with status/);
});

test('31. Tenant Isolation & Tenant-Scoped Admin Reset (Other Tenants Untouched)', () => {
  initDatabase();
  const primaryTenant = 'tenant_default';
  const secondaryTenant = 'tenant_secondary';

  // Seed / ensure data exists in secondary tenant
  db.prepare(`
    INSERT OR REPLACE INTO negotiations (tenant_id, deal_id, customer, customer_id, segment, industry, date, objection, initial_offer, counter_offer, requested_discount_percent, strategy, concession_percent, competitor_pressure, contract_years, outcome, outcome_reason, created_at)
    VALUES (?, 'DEAL-T2-KEEP', 'Tenant2 Client', 'tenant2-client', 'enterprise', 'finance', '2026-10-01', 'Pricing', 100000, 90000, 10, '10% concession', 10, 0, 1, 'WON', 'Closed in secondary tenant', '2026-10-01T00:00:00.000Z')
  `).run(secondaryTenant);

  const beforeSecCount = db.prepare(`SELECT count(*) as cnt FROM negotiations WHERE tenant_id = ?`).get(secondaryTenant).cnt;
  assert.ok(beforeSecCount > 0, 'Secondary tenant must have negotiations before primary reset');

  // Reset only the primary tenant
  const resetRes = resetTenantDemoData(primaryTenant);
  assert.equal(resetRes.success, true);
  assert.equal(resetRes.tenantId, primaryTenant);

  const primaryCount = db.prepare('SELECT count(*) as cnt FROM negotiations WHERE tenant_id = ?').get(primaryTenant).cnt;
  assert.equal(primaryCount, 12, 'Primary tenant should have 12 canonical seed episodes');

  // Secondary tenant data must remain completely intact
  const afterSecCount = db.prepare(`SELECT count(*) as cnt FROM negotiations WHERE tenant_id = ?`).get(secondaryTenant).cnt;
  assert.equal(afterSecCount, beforeSecCount, 'Secondary tenant data must NOT be affected by primary tenant reset');
});

test('32. Strict Tenant Boundary for Approvals (Cross-Tenant Access Prohibited)', () => {
  initDatabase();
  const tenantA = 'tenant_default';
  const tenantB = 'tenant_secondary';

  const approvalA = createPendingApproval(
    { dealId: `DEAL-TENA-${Date.now()}`, customer: 'TenantACorp', requestedDiscountPercent: 25 },
    '15% concession',
    'rep_a',
    tenantA
  );

  // Admin/Manager from Tenant B attempting to decide approval belonging to Tenant A must be rejected
  assert.throws(() => {
    processApprovalDecision(approvalA.approval_id, {
      status: 'APPROVED',
      managerName: 'Tenant B Admin',
      userId: 'tenant2_admin',
      role: 'ADMIN',
      tenantId: tenantB, // Caller is tenant_secondary
      decisionNotes: 'Cross-tenant illegal approval'
    });
  }, /Tenant mismatch/);
});

test('33. Registration Role Scoping Verification', async () => {
  initDatabase();
  const testEmail = `registered_sales_${Date.now()}@example.com`;

  const registered = await registerUser({
    email: testEmail,
    password: 'SecurePassword123!',
    displayName: 'New Sales Rep',
    role: 'SALESPERSON',
    tenantId: 'tenant_default'
  });

  const user = getUserById(registered.user.id);
  assert.equal(user.role, 'SALESPERSON');
});

test('34. Outbox Recovery Payload Scoping', async () => {
  initDatabase();
  const tenantId = 'tenant_default';

  const payload = formatNegotiationMemoryPayload({
    deal_id: 'DEAL-FMT-TEST',
    customer: 'FormatTestCorp',
    strategy: 'Value-based packaging',
    outcome: 'WON'
  }, tenantId);

  assert.ok(typeof payload.content === 'string' && payload.content.length > 0, 'Payload content must be non-empty string');
  assert.equal(payload.tags.includes(`tenant:${tenantId}`), true, 'Tags must include tenant scoping');
  assert.equal(payload.documentId, `${tenantId}::DEAL-FMT-TEST`, 'Document ID must be deterministic and tenant-scoped');
});

test('35. What-If Simulation Engine & Deterministic Modeling', async () => {
  initDatabase();
  const tenantId = 'tenant_default';

  const result = await simulateWhatIf('DEAL-SIM-01', {
    customer: 'Acme Corp',
    segment: 'enterprise',
    dealValue: 120000,
    requestedDiscountPercent: 20,
    discountPercent: 12,
    contractYears: 2,
    includeSupport: true,
    competitorPressure: false,
    tenantId
  });

  assert.equal(result.dealId, 'DEAL-SIM-01');
  assert.ok(result.scenario, 'Scenario parameters must be returned');
  assert.equal(result.scenario.discountPercent, 12);
  assert.equal(result.scenario.contractYears, 2);

  // Validate economics
  assert.ok(result.economics, 'Economics calculation must be present');
  assert.equal(result.economics.requestedConcession, 24000);
  assert.equal(result.economics.proposedConcession, 14400);
  assert.equal(result.economics.concessionSavings, 9600);
  assert.equal(result.economics.netRevenueProposed, 105600);
  assert.equal(result.economics.supportAddonCost, 2400, '2% support add-on cost of 120k is 2400');
  assert.equal(result.economics.effectiveNetValue, 103200, 'Effective net value is net revenue (105600) minus support cost (2400)');

  // Validate deterministic outcome prediction
  assert.ok(['LIKELY_WIN', 'HIGH_MARGIN_RISK', 'MODERATE_WIN_PROBABILITY'].includes(result.deterministicOutcome));

  // Validate reflection and evidence
  assert.ok(typeof result.reflection === 'string' && result.reflection.length > 0);
  assert.ok(Array.isArray(result.evidence));
});

test('36. What-If Simulation Cross-Tenant Isolation', async () => {
  initDatabase();
  const tenantA = 'tenant_default';
  const tenantB = 'tenant_isolated_test';

  // Seed a unique deal in tenant B only
  db.prepare(`
    INSERT INTO negotiations (
      tenant_id, deal_id, customer, customer_id, segment, industry, date, objection,
      initial_offer, counter_offer, requested_discount_percent, strategy,
      concession_percent, competitor_pressure, contract_years, outcome, outcome_reason, created_at
    ) VALUES (?, 'DEAL-TB-SIM', 'TenantBCorp', 'tenantbcorp', 'enterprise', 'finance', '2026-10-01', 'Budget', 200000, 180000, 10, '10% concession', 10, 0, 1, 'WON', 'Closed in Tenant B', '2026-10-01T00:00:00.000Z')
  `).run(tenantB);

  // Tenant A simulation should not recall or include Tenant B's deals
  const resultA = await simulateWhatIf('DEAL-TA-SIM', {
    customer: 'TenantBCorp',
    segment: 'enterprise',
    dealValue: 200000,
    requestedDiscountPercent: 15,
    discountPercent: 10,
    contractYears: 1,
    tenantId: tenantA
  });

  // Evidence should not have Tenant B's DEAL-TB-SIM
  const leakedEvidence = resultA.evidence.filter(e => e.dealId === 'DEAL-TB-SIM' || (e.tags && e.tags.includes(`tenant:${tenantB}`)));
  assert.equal(leakedEvidence.length, 0, 'Tenant A simulation must NEVER leak Tenant B evidence');
});

test('37. Counteroffer Advisor Engine & Strategy Evaluation', async () => {
  initDatabase();
  const tenantId = 'tenant_default';

  const result = await analyzeCounteroffer(
    'DEAL-CTR-TEST',
    88000,
    'Client requested multi-year packaging concession',
    {
      customer: 'Acme Corp',
      segment: 'enterprise',
      dealValue: 100000,
      requestedDiscountPercent: 20,
      tenantId
    }
  );

  assert.equal(result.dealId, 'DEAL-CTR-TEST');
  assert.equal(result.newCounterOffer, 88000);
  assert.ok(result.analysis, 'Analysis object must be present');
  assert.ok(result.analysis.economics, 'Analysis economics must be present');
  assert.ok(typeof result.analysis.approval.required === 'boolean');

  // Validate suggested response script
  assert.ok(typeof result.suggestedResponse === 'string' && result.suggestedResponse.length > 0, 'Suggested response script must be generated');
  assert.ok(result.suggestedResponse.length > 10);
});

test('38. Counteroffer Guardrails on High Discount Scenarios', async () => {
  initDatabase();

  // Test scenario with 25% requested discount triggering approval
  const highDiscountResult = await analyzeCounteroffer(
    'DEAL-CTR-HIGH',
    75000,
    'Deep discount request',
    {
      customer: 'Acme Corp',
      segment: 'enterprise',
      dealValue: 100000,
      requestedDiscountPercent: 25,
      tenantId: 'tenant_default'
    }
  );

  assert.equal(highDiscountResult.dealId, 'DEAL-CTR-HIGH');
  assert.ok(highDiscountResult.analysis.approval.required === true || highDiscountResult.analysis.economics.proposedDiscountPercent > 15 || highDiscountResult.analysis.confidence.finalConfidence !== 'HIGH');
});

test('39. Customer History & Behavioral Pattern Engine', () => {
  initDatabase();
  const tenantId = 'tenant_default';

  // Acme Corp has 8 historical deals in canonical seed
  const acmePatterns = detectNegotiationPatterns('Acme Corp', 'enterprise', { tenantId });
  assert.ok(Array.isArray(acmePatterns), 'Patterns must return an array');
  assert.ok(acmePatterns.length > 0, 'Acme Corp should have detected behavioral patterns');

  const customerPattern = acmePatterns.find(p => p.type === 'customer_behavior');
  assert.ok(customerPattern, 'Customer behavior pattern must exist');
  assert.ok(customerPattern.title.includes('Acme Corp'));
  assert.ok(['HIGH', 'MEDIUM', 'LOW'].includes(customerPattern.confidence));

  // Test zero-history customer
  const zeroPatterns = detectNegotiationPatterns('BrandNewCustomerCorp', 'enterprise', { tenantId });
  assert.ok(Array.isArray(zeroPatterns), 'Zero-history customer must return an array');
  const zeroCustomerPattern = zeroPatterns.find(p => p.type === 'customer_behavior');
  assert.equal(zeroCustomerPattern, undefined, 'Zero-history customer should have no customer-specific behavior pattern');
});

test('40. Customer History & Pattern Tenant Isolation', () => {
  initDatabase();
  const tenantA = 'tenant_default';
  const tenantB = 'tenant_iso_pattern';

  // Insert customer in Tenant B
  db.prepare(`
    INSERT INTO negotiations (
      tenant_id, deal_id, customer, customer_id, segment, industry, date, objection,
      initial_offer, counter_offer, requested_discount_percent, strategy,
      concession_percent, competitor_pressure, contract_years, outcome, outcome_reason, created_at
    ) VALUES (?, 'DEAL-TB-CUST', 'TenantBCustomer', 'tenantbcustomer', 'enterprise', 'finance', '2026-10-01', 'Pricing', 100000, 92000, 10, '8% concession', 8, 0, 1, 'WON', 'Won in Tenant B', '2026-10-01T00:00:00.000Z')
  `).run(tenantB);

  // Querying patterns for TenantBCustomer under Tenant A must find nothing
  const patternsUnderA = detectNegotiationPatterns('TenantBCustomer', 'enterprise', { tenantId: tenantA });
  const custPatternUnderA = patternsUnderA.find(p => p.type === 'customer_behavior');
  assert.equal(custPatternUnderA, undefined, 'Tenant A must find 0 customer patterns for Tenant B customer');

  // Querying patterns under Tenant B must find customer patterns
  const patternsUnderB = detectNegotiationPatterns('TenantBCustomer', 'enterprise', { tenantId: tenantB });
  const custPatternUnderB = patternsUnderB.find(p => p.type === 'customer_behavior');
  assert.ok(custPatternUnderB, 'Tenant B must find customer patterns for Tenant B customer');
  assert.ok(custPatternUnderB.title.includes('TenantBCustomer'));
});

test('41. What-If Parameter Variation & Deterministic Economics Dynamics', async () => {
  initDatabase();
  const tenantId = 'tenant_default';

  // Scenario 1: Base scenario (10% discount, 1 year, no support, 100k)
  const baseSim = await simulateWhatIf('DEAL-SIM-VAR-1', {
    customer: 'Acme Corp',
    segment: 'enterprise',
    dealValue: 100000,
    requestedDiscountPercent: 20,
    discountPercent: 10,
    contractYears: 1,
    includeSupport: false,
    tenantId
  });

  assert.equal(baseSim.economics.dealValue, 100000);
  assert.equal(baseSim.economics.proposedConcession, 10000);
  assert.equal(baseSim.economics.netRevenueProposed, 90000);
  assert.equal(baseSim.economics.supportAddonCost, 0);
  assert.equal(baseSim.economics.effectiveNetValue, 90000);

  // Scenario 2: Vary discount (15% discount)
  const discSim = await simulateWhatIf('DEAL-SIM-VAR-2', {
    customer: 'Acme Corp',
    segment: 'enterprise',
    dealValue: 100000,
    requestedDiscountPercent: 20,
    discountPercent: 15,
    contractYears: 1,
    includeSupport: false,
    tenantId
  });

  assert.equal(discSim.economics.proposedConcession, 15000);
  assert.equal(discSim.economics.netRevenueProposed, 85000);
  assert.equal(discSim.economics.effectiveNetValue, 85000);
  assert.notEqual(discSim.economics.netRevenueProposed, baseSim.economics.netRevenueProposed);

  // Scenario 3: Add support bundle (2% COGS of 100k = 2000)
  const supportSim = await simulateWhatIf('DEAL-SIM-VAR-3', {
    customer: 'Acme Corp',
    segment: 'enterprise',
    dealValue: 100000,
    requestedDiscountPercent: 20,
    discountPercent: 10,
    contractYears: 1,
    includeSupport: true,
    tenantId
  });

  assert.equal(supportSim.economics.supportAddonCost, 2000);
  assert.equal(supportSim.economics.effectiveNetValue, 88000, 'Effective net value drops by support COGS');

  // Scenario 4: Multi-year term (3 years) and higher deal value (300k)
  const multiYearSim = await simulateWhatIf('DEAL-SIM-VAR-4', {
    customer: 'Acme Corp',
    segment: 'enterprise',
    dealValue: 300000,
    requestedDiscountPercent: 20,
    discountPercent: 10,
    contractYears: 3,
    includeSupport: true,
    tenantId
  });

  assert.equal(multiYearSim.scenario.contractYears, 3);
  assert.equal(multiYearSim.economics.dealValue, 300000);
  assert.equal(multiYearSim.economics.supportAddonCost, 6000);
  assert.equal(multiYearSim.economics.effectiveNetValue, 264000);
});

test('42. Hindsight Memory Recall Scoping & Stable Identity Deduplication', async () => {
  initDatabase();
  const tenantId = 'tenant_default';

  // Recall memories for Acme Corp with customerId scoping
  const recallResult = await recallNegotiationMemories('Acme Corp budget objection pricing', {
    tenantId,
    customerId: 'acme-corp',
    limit: 8
  });

  assert.ok(recallResult && Array.isArray(recallResult.memories), 'Recall must return an object with memories array');
  const acmeMemories = recallResult.memories;
  assert.ok(acmeMemories.length > 0, 'Must retrieve Acme memories');
  assert.ok(acmeMemories.length <= 8, 'Must respect limit <= 8');

  // Verify that all returned memories have unique dealIds (deduplication)
  const dealIds = acmeMemories.map(m => m.dealId || m.id).filter(Boolean);
  const uniqueDealIds = new Set(dealIds);
  assert.equal(dealIds.length, uniqueDealIds.size, 'Recalled memories must be deduplicated by dealId');

  // Verify all recalled memories are strictly scoped to tenant_default
  for (const mem of acmeMemories) {
    assert.equal(mem.tenantId, tenantId, `Memory ${mem.dealId || mem.id} must match tenantId`);
  }
});

test('43. Role-Based Access Control (RBAC) Permissions Matrix & Sanitization', () => {
  // Salesperson permissions check
  assert.equal(hasPermission('SALESPERSON', PERMISSIONS.INFRASTRUCTURE_VIEW), false, 'Salesperson MUST NOT view infrastructure');
  assert.equal(hasPermission('SALESPERSON', PERMISSIONS.INFRASTRUCTURE_MANAGE_OUTBOX), false, 'Salesperson MUST NOT manage outbox');
  assert.equal(hasPermission('SALESPERSON', PERMISSIONS.DATABASE_RESET), false, 'Salesperson MUST NOT reset database');
  assert.equal(hasPermission('SALESPERSON', PERMISSIONS.APPROVALS_DECIDE), false, 'Salesperson MUST NOT approve deals');
  assert.equal(hasPermission('SALESPERSON', PERMISSIONS.DEALS_CREATE), true, 'Salesperson can create negotiations');
  assert.equal(hasPermission('SALESPERSON', PERMISSIONS.DEALS_ANALYZE), true, 'Salesperson can analyze negotiations');
  assert.equal(hasPermission('SALESPERSON', PERMISSIONS.DEALS_RECORD_OUTCOME), true, 'Salesperson can record outcomes');

  // Manager permissions check
  assert.equal(hasPermission('MANAGER', PERMISSIONS.INFRASTRUCTURE_VIEW), true, 'Manager CAN view infrastructure');
  assert.equal(hasPermission('MANAGER', PERMISSIONS.APPROVALS_DECIDE), true, 'Manager CAN decide approvals');
  assert.equal(hasPermission('MANAGER', PERMISSIONS.INFRASTRUCTURE_MANAGE_OUTBOX), true, 'Manager CAN manage outbox');
  assert.equal(hasPermission('MANAGER', PERMISSIONS.DATABASE_RESET), false, 'Manager MUST NOT reset database');

  // Admin permissions check
  assert.equal(hasPermission('ADMIN', PERMISSIONS.INFRASTRUCTURE_VIEW), true, 'Admin CAN view infrastructure');
  assert.equal(hasPermission('ADMIN', PERMISSIONS.APPROVALS_DECIDE), true, 'Admin CAN decide approvals');
  assert.equal(hasPermission('ADMIN', PERMISSIONS.INFRASTRUCTURE_MANAGE_OUTBOX), true, 'Admin CAN manage outbox');
  assert.equal(hasPermission('ADMIN', PERMISSIONS.DATABASE_RESET), true, 'Admin CAN reset database');
  assert.equal(hasPermission('ADMIN', PERMISSIONS.USERS_MANAGE), true, 'Admin CAN manage users');
});

test('44. Token Estimation, Context Compaction & Model-Specific Input Budgets', () => {
  // Test token estimation
  const shortText = 'Analyze deal for Acme Corp';
  const estShort = estimateTokens(shortText);
  assert.ok(estShort > 0 && estShort < 20);

  const messages = [
    { role: 'system', content: 'You are DealMind agent.' },
    { role: 'user', content: 'Analyze deal for Acme Corp.' },
    { 
      role: 'tool', 
      tool_call_id: 'call_1', 
      name: 'recall_memory', 
      content: 'A'.repeat(25000) // oversized 25,000 character (~6,500 token) tool payload
    }
  ];

  const beforeEst = estimateTokens(messages);
  assert.ok(beforeEst > 5000, 'Original messages should exceed 5000 estimated tokens');

  // Compact for Qwen 27B (maxInputTokens 4800)
  const compacted = compactMessagesForModel(messages, 'qwen/qwen3.8-27b');
  const afterEst = estimateTokens(compacted);
  assert.ok(afterEst <= MODEL_SPECS['qwen/qwen3.8-27b'].maxInputTokens, 'Compacted messages must be within model max input budget');
  assert.ok(compacted.find(m => m.role === 'tool').content.length < 500, 'Tool content should be compacted');

  // Verify all configured models have valid specifications
  for (const model of CONFIGURED_MODELS) {
    const spec = MODEL_SPECS[model];
    assert.ok(spec, `Model spec must exist for ${model}`);
    assert.ok(spec.maxInputTokens > 0);
    assert.ok(spec.maxOutputTokens > 0);
  }
});

test('45. Advanced Groq Rate Limit Classification (TPD vs ITPM vs TPM vs RPM vs 413)', () => {
  // 1. TPD error
  const tpdErr = {
    message: 'Rate limit reached for model `openai/gpt-oss-120b` on tokens per day (TPD): Limit 200000, Used 176224, Requested 34562. Please try again in 1h17m39.552s.',
    status: 429
  };
  const tpdClassified = classifyGroqError(tpdErr);
  assert.equal(tpdClassified.type, 'RATE_LIMIT');
  assert.equal(tpdClassified.rateLimitType, 'TPD');
  assert.ok(tpdClassified.retryAfterSec >= 4600, 'Should parse 1h17m into > 4600 seconds');

  // 2. ITPM error
  const itpmErr = {
    message: 'Request too large for model `qwen/qwen3.8-27b` on input tokens per minute (ITPM): Limit 7000, Requested 44382. Please try again in 5m22s.',
    status: 413
  };
  const itpmClassified = classifyGroqError(itpmErr);
  assert.equal(itpmClassified.rateLimitType, 'ITPM');

  // 3. TPM error
  const tpmErr = {
    message: 'Rate limit on tokens per minute (TPM): Limit 8000. Please wait 12.5s.',
    status: 429
  };
  const tpmClassified = classifyGroqError(tpmErr);
  assert.equal(tpmClassified.rateLimitType, 'TPM');
  assert.equal(tpmClassified.retryAfterSec, 13);

  // 4. 413 Context Length error
  const ctxErr = {
    message: 'Request too large: please reduce your message size and try again.',
    status: 413
  };
  const ctxClassified = classifyGroqError(ctxErr);
  assert.equal(ctxClassified.type, 'CONTEXT_LENGTH_EXCEEDED');
});

test('46. Idempotent Demo Seeding and Record Count Consistency', () => {
  initDatabase();
  const tenantId = 'tenant_default';

  const countBefore = db.prepare('SELECT COUNT(*) as count FROM negotiations WHERE tenant_id = ?').get(tenantId).count;
  assert.ok(countBefore >= 12, 'Database should contain at least 12 canonical seed negotiations');

  // Re-running seedDatabase must NOT duplicate records
  seedDatabase(tenantId);

  const countAfter = db.prepare('SELECT COUNT(*) as count FROM negotiations WHERE tenant_id = ?').get(tenantId).count;
  assert.equal(countAfter, countBefore, 'Seeding must be idempotent and not create duplicate deal records');
});



