import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBaseConfidence, evaluateConfidenceAndConflict } from '../src/services/confidenceEngine.js';
import { calculateDealEconomics, buildStrategyLabEconomics } from '../src/services/economicsEngine.js';
import { initDatabase, db, resetDatabase } from '../src/db/database.js';

test('Confidence Rules Engine', (t) => {
  // Rule 1: Base Confidence thresholds
  assert.equal(calculateBaseConfidence(1, 1), 'LOW', 'sample < 3 should be LOW');
  assert.equal(calculateBaseConfidence(2, 0), 'LOW', 'sample < 3 should be LOW');
  assert.equal(calculateBaseConfidence(3, 0), 'HIGH', 'sample >= 3 & 100% win rate should be HIGH');
  assert.equal(calculateBaseConfidence(7, 3), 'HIGH', 'sample >= 3 & 70% win rate should be HIGH');
  assert.equal(calculateBaseConfidence(5, 3), 'MEDIUM', 'sample >= 3 & 62.5% win rate should be MEDIUM');
  assert.equal(calculateBaseConfidence(1, 3), 'LOW', 'sample >= 3 & 25% win rate should be LOW');

  // Rule 2 & 3: Acme seed data evaluation
  initDatabase();
  resetDatabase();

  const acmeStats = evaluateConfidenceAndConflict('Acme Corp', 'enterprise');
  assert.equal(acmeStats.customerStats.total, 8, 'Acme must have exactly 8 historical episodes');
  assert.equal(acmeStats.customerStats.wins, 5, 'Acme must have 5 wins');
  assert.equal(acmeStats.customerStats.losses, 3, 'Acme must have 3 losses');
  assert.equal(acmeStats.customerStats.winRate, 63, 'Acme win rate is 62.5% round to 63');
  assert.equal(acmeStats.finalConfidence, 'MEDIUM', 'Base confidence for Acme is MEDIUM');
});

test('Economics Engine Calculations', (t) => {
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
});
