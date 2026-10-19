import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePath,
  isRouteReached,
  resolveNavigationIntent,
  resolvePathnameChange,
} from '../src/context/navigation-state.ts';

test('Navigation State & Preemptive Routing Suite', async (t) => {
  await t.test('normalizePath strips query parameters and hashes cleanly', () => {
    assert.equal(normalizePath('/sales?filter=recent'), '/sales');
    assert.equal(normalizePath('/suppliers#section-pic'), '/suppliers');
    assert.equal(normalizePath('/ledger?page=2#summary'), '/ledger');
    assert.equal(normalizePath(''), null);
    assert.equal(normalizePath(null), null);
    assert.equal(normalizePath('/'), '/');
  });

  await t.test('isRouteReached correctly matches exact and sub-routes', () => {
    assert.equal(isRouteReached('/', '/'), true);
    assert.equal(isRouteReached('/suppliers', '/'), false);
    assert.equal(isRouteReached('/sales', '/sales'), true);
    assert.equal(isRouteReached('/suppliers', '/sales'), false);
    assert.equal(isRouteReached('/sales/invoices/123', '/sales'), true);
  });

  await t.test('resolveNavigationIntent ignores clicks to current page when idle (NOOP)', () => {
    const intent = resolveNavigationIntent('/ledger', null, '/ledger');
    assert.deepEqual(intent, { type: 'NOOP' });
  });

  await t.test('resolveNavigationIntent ignores duplicate clicks to active target (NOOP)', () => {
    const intent = resolveNavigationIntent('/', '/suppliers', '/suppliers');
    assert.deepEqual(intent, { type: 'NOOP' });
  });

  await t.test('resolveNavigationIntent initiates navigation when starting from idle', () => {
    const intent = resolveNavigationIntent('/', null, '/suppliers');
    assert.deepEqual(intent, { type: 'NAVIGATE', targetHref: '/suppliers' });
  });

  await t.test('resolveNavigationIntent preempts in-flight route when clicking a different page', () => {
    // User accidentally clicked /suppliers, then immediately clicks /sales while skeleton is active
    const intent = resolveNavigationIntent('/', '/suppliers', '/sales');
    assert.deepEqual(intent, { type: 'NAVIGATE', targetHref: '/sales' });
  });

  await t.test('resolveNavigationIntent cancels pending route when clicking current page', () => {
    // User accidentally clicked /suppliers while on /ledger, then clicks /ledger to abort
    const intent = resolveNavigationIntent('/ledger', '/suppliers', '/ledger');
    assert.deepEqual(intent, { type: 'CANCEL' });
  });

  await t.test('resolvePathnameChange does NOT clear target when intermediate route resolves', () => {
    // User on / clicked /suppliers then preempted with /sales.
    // Next.js commits intermediate route /suppliers first.
    const result = resolvePathnameChange('/suppliers', '/sales');
    assert.equal(result.isTargetReached, false);
    assert.equal(result.targetHref, '/sales');
  });

  await t.test('resolvePathnameChange clears target when true destination is reached', () => {
    // Destination /sales finally commits.
    const result = resolvePathnameChange('/sales', '/sales');
    assert.equal(result.isTargetReached, true);
    assert.equal(result.targetHref, null);
  });

  await t.test('resolvePathnameChange returns idle when targetHref is null', () => {
    const result = resolvePathnameChange('/sales', null);
    assert.equal(result.isTargetReached, false);
    assert.equal(result.targetHref, null);
  });
});
