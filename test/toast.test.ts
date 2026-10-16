/**
 * test/toast.test.ts
 *
 * Unit tests for the headless toast store and notification management.
 * Verifies subscription reactivity, auto-dismiss timers, helper methods,
 * and SSOT type conformance.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { toastStore, toast } from '../src/utils/toast-store.ts';
import type { ToastItem, ToastType } from '../src/types/index.ts';

test('Toast Store & Notification Management Suite', async (t) => {
  t.beforeEach(() => {
    toastStore.clearToasts();
  });

  await t.test('initializes with empty toasts list', () => {
    assert.deepStrictEqual(toastStore.getToasts(), []);
  });

  await t.test('toast.success creates success toast with title and description', () => {
    const id = toast.success('Penerimaan Disimpan', 'Truk: B 1234 CD');
    assert.ok(typeof id === 'string' && id.length > 0);

    const toasts = toastStore.getToasts();
    assert.strictEqual(toasts.length, 1);
    assert.strictEqual(toasts[0].id, id);
    assert.strictEqual(toasts[0].type, 'success');
    assert.strictEqual(toasts[0].title, 'Penerimaan Disimpan');
    assert.strictEqual(toasts[0].description, 'Truk: B 1234 CD');
  });

  await t.test('toast helpers create correct toast types (error, info, warning)', () => {
    toast.error('Gagal Menyimpan', 'Validasi gagal');
    toast.info('Info Sistem', 'Sinkronisasi selesai');
    toast.warning('Peringatan Selisih', 'Volume defisit terdeteksi');

    const toasts = toastStore.getToasts();
    assert.strictEqual(toasts.length, 3);
    assert.strictEqual(toasts[0].type, 'error');
    assert.strictEqual(toasts[1].type, 'info');
    assert.strictEqual(toasts[2].type, 'warning');
  });

  await t.test('removeToast removes target item by id', () => {
    const id1 = toast.success('Item 1');
    const id2 = toast.success('Item 2');
    assert.strictEqual(toastStore.getToasts().length, 2);

    toastStore.removeToast(id1);
    const remaining = toastStore.getToasts();
    assert.strictEqual(remaining.length, 1);
    assert.strictEqual(remaining[0].id, id2);
  });

  await t.test('clearToasts removes all active toasts', () => {
    toast.success('Toast A');
    toast.info('Toast B');
    assert.strictEqual(toastStore.getToasts().length, 2);

    toastStore.clearToasts();
    assert.strictEqual(toastStore.getToasts().length, 0);
  });

  await t.test('subscribers are notified on toast changes', () => {
    let callCount = 0;
    const unsubscribe = toastStore.subscribe(() => {
      callCount++;
    });

    toast.success('Pemberitahuan');
    assert.strictEqual(callCount, 1);

    toastStore.clearToasts();
    assert.strictEqual(callCount, 2);

    unsubscribe();
    toast.info('Ignored update');
    assert.strictEqual(callCount, 2);
  });

  await t.test('auto-dismiss removes toast after duration expires', async () => {
    toast.success('Auto dismiss toast', 'Short duration', 50);
    assert.strictEqual(toastStore.getToasts().length, 1);

    await new Promise((resolve) => setTimeout(resolve, 80));
    assert.strictEqual(toastStore.getToasts().length, 0);
  });

  await t.test('supports interactive action buttons such as Undo', () => {
    let actionTriggered = false;
    const id = toast.warning('Data Dihapus', 'Truk B 1234 CD', 5000, {
      label: 'Urungkan (Undo)',
      onClick: () => {
        actionTriggered = true;
      },
    });

    const toasts = toastStore.getToasts();
    assert.strictEqual(toasts.length, 1);
    assert.strictEqual(toasts[0].id, id);
    assert.ok(toasts[0].action);
    assert.strictEqual(toasts[0].action?.label, 'Urungkan (Undo)');

    toasts[0].action?.onClick();
    assert.strictEqual(actionTriggered, true);
  });
});
