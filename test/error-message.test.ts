import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { extractErrorMessage } from '../src/utils/error-message.ts';

describe('extractErrorMessage Utility Suite', () => {
  test('extracts message from standard Error instance', () => {
    const err = new Error('Database connection failed');
    assert.equal(extractErrorMessage(err), 'Database connection failed');
  });

  test('extracts error from raw string value', () => {
    assert.equal(extractErrorMessage('Direct error message'), 'Direct error message');
  });

  test('extracts message from duck-typed object with string message property', () => {
    const errObj = { message: 'Custom API error' };
    assert.equal(extractErrorMessage(errObj), 'Custom API error');
  });

  test('returns default fallback on null or undefined input', () => {
    assert.equal(extractErrorMessage(null), 'Terjadi kesalahan');
    assert.equal(extractErrorMessage(undefined), 'Terjadi kesalahan');
  });

  test('returns custom fallback when specified on non-error objects', () => {
    assert.equal(extractErrorMessage(12345, 'Custom fallback'), 'Custom fallback');
    assert.equal(extractErrorMessage({ status: 500 }, 'Custom fallback'), 'Custom fallback');
  });
});
