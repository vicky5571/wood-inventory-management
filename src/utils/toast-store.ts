/**
 * src/utils/toast-store.ts
 *
 * Headless, reactive toast notification store.
 * Independent of React UI, fully testable in Node.js test runner,
 * and compatible with React 19's useSyncExternalStore.
 */

import type { ToastItem, ToastType, ToastAction } from '../types/index.ts';

class ToastStore {
  private toasts: ToastItem[] = [];
  private listeners: Set<() => void> = new Set();
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  public getToasts(): ToastItem[] {
    return this.toasts;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public addToast(
    toastInput: Omit<ToastItem, 'id'> | string,
    defaultType: ToastType = 'info',
    durationMs: number = 4000
  ): string {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    let item: ToastItem;
    if (typeof toastInput === 'string') {
      item = {
        id,
        type: defaultType,
        title: toastInput,
        durationMs,
      };
    } else {
      item = {
        ...toastInput,
        id,
        durationMs: toastInput.durationMs !== undefined ? toastInput.durationMs : durationMs,
      };
    }

    // Append toast item
    this.toasts = [...this.toasts, item];
    this.notify();

    if (item.durationMs && item.durationMs > 0) {
      const timer = setTimeout(() => {
        this.removeToast(id);
      }, item.durationMs);
      this.timers.set(id, timer);
    }

    return id;
  }

  public removeToast(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    const prevLen = this.toasts.length;
    this.toasts = this.toasts.filter((t) => t.id !== id);
    if (this.toasts.length !== prevLen) {
      this.notify();
    }
  }

  public clearToasts(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.toasts = [];
    this.notify();
  }
}

export const toastStore = new ToastStore();

export const toast = {
  success(title: string, description?: string, durationMs?: number, action?: ToastAction): string {
    return toastStore.addToast({ type: 'success', title, description, durationMs, action }, 'success', durationMs ?? 4000);
  },
  error(title: string, description?: string, durationMs?: number, action?: ToastAction): string {
    return toastStore.addToast({ type: 'error', title, description, durationMs, action }, 'error', durationMs ?? 5000);
  },
  info(title: string, description?: string, durationMs?: number, action?: ToastAction): string {
    return toastStore.addToast({ type: 'info', title, description, durationMs, action }, 'info', durationMs ?? 4000);
  },
  warning(title: string, description?: string, durationMs?: number, action?: ToastAction): string {
    return toastStore.addToast({ type: 'warning', title, description, durationMs, action }, 'warning', durationMs ?? 4500);
  },
  show(options: Omit<ToastItem, 'id'>): string {
    return toastStore.addToast(options, options.type, options.durationMs ?? 4000);
  },
  remove(id: string): void {
    toastStore.removeToast(id);
  },
  clear(): void {
    toastStore.clearToasts();
  },
};
