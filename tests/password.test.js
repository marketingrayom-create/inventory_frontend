import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pendingPasswordRules } from '../src/utils/password.js';

test('password hints disappear as each requirement is met and return after deletion', () => {
  assert.equal(pendingPasswordRules('').length, 5);
  assert.equal(pendingPasswordRules('A').length, 4);
  assert.equal(pendingPasswordRules('Aa').length, 3);
  assert.equal(pendingPasswordRules('Aa1').length, 2);
  assert.equal(pendingPasswordRules('Aa1!').length, 1);
  assert.deepEqual(pendingPasswordRules('Aa1!abcd'), []);
  assert.equal(pendingPasswordRules('Aa1abcd').length, 2);
});
test('enforces length bounds, case, number and non-whitespace special character', () => {
  assert.deepEqual(pendingPasswordRules('Aa1!abcdefgh'), []);
  for (const value of ['Aa1!abcdefghi', 'aa1!abcd', 'AA1!ABCD', 'Aaaa!abc', 'Aa1 abcd']) {
    assert.equal(pendingPasswordRules(value).length, 1, value);
  }
});
