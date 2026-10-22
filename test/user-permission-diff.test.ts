import test from 'node:test';
import assert from 'node:assert/strict';
import { diffPermissions } from '../src/utils/user-permission-diff.ts';

test('diffPermissions Suite (Spec C)', async (t) => {
  await t.test('1. diffPermissions(undefined, undefined) returns []', () => {
    assert.deepEqual(diffPermissions(undefined, undefined), []);
  });

  await t.test('2. diffPermissions({}, {}) returns []', () => {
    assert.deepEqual(diffPermissions({}, {}), []);
  });

  await t.test('3. diffPermissions({ tallyCreate: true }, { tallyCreate: true }) returns [] (no-op)', () => {
    assert.deepEqual(
      diffPermissions({ tallyCreate: true }, { tallyCreate: true }),
      []
    );
  });

  await t.test('4. diffPermissions(undefined, { tallyCreate: true }) returns ["granted: tallyCreate"]', () => {
    assert.deepEqual(
      diffPermissions(undefined, { tallyCreate: true }),
      ['granted: tallyCreate']
    );
  });

  await t.test('5. diffPermissions({ tallyCreate: true }, undefined) returns ["revoked: tallyCreate"]', () => {
    assert.deepEqual(
      diffPermissions({ tallyCreate: true }, undefined),
      ['revoked: tallyCreate']
    );
  });

  await t.test('6. diffPermissions({ tallyCreate: true }, { tallyCreate: false }) returns ["tallyCreate: true → false"]', () => {
    assert.deepEqual(
      diffPermissions({ tallyCreate: true }, { tallyCreate: false }),
      ['tallyCreate: true → false']
    );
  });

  await t.test('7. diffPermissions({ tallyCreate: true }, {}) returns ["revoked: tallyCreate"]', () => {
    assert.deepEqual(
      diffPermissions({ tallyCreate: true }, {}),
      ['revoked: tallyCreate']
    );
  });
});

