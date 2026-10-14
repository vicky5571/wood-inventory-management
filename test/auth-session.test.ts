import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionToken, verifySessionToken, COOKIE_NAME } from '../src/auth/session.ts';
import type { AuthUser } from '../src/types/index.ts';

const mockUser: AuthUser = {
  id: 'usr-manager-01',
  email: 'manager@timber.id',
  name: 'Budi Santoso',
  roleLevel: 1,
  title: 'Operations Manager',
};

test('Session Token Management Suite', async (t) => {
  await t.test('COOKIE_NAME is wood_session', () => {
    assert.equal(COOKIE_NAME, 'wood_session');
  });

  await t.test('creates and verifies valid session token', () => {
    const token = createSessionToken(mockUser, 3600);
    assert.ok(token.includes('.'));
    const verified = verifySessionToken(token);
    assert.ok(verified);
    assert.equal(verified.email, 'manager@timber.id');
    assert.equal(verified.roleLevel, 1);
  });

  await t.test('rejects tampered token payload', () => {
    const token = createSessionToken(mockUser, 3600);
    const [payloadB64, sig] = token.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(payloadB64, 'base64url').toString()), roleLevel: 1 })
    ).toString('base64url');
    // Change signature slightly
    const tamperedToken = `${tamperedPayload}.${sig.slice(0, -2)}aa`;
    assert.equal(verifySessionToken(tamperedToken), null);
  });

  await t.test('rejects expired token', () => {
    // TTL -10 seconds (already expired)
    const token = createSessionToken(mockUser, -10);
    assert.equal(verifySessionToken(token), null);
  });

  await t.test('returns null on null or empty input', () => {
    assert.equal(verifySessionToken(null), null);
    assert.equal(verifySessionToken(''), null);
    assert.equal(verifySessionToken('invalid-format'), null);
  });
});
