'use client';

import React, { useSyncExternalStore } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X, Undo2 } from 'lucide-react';
import { toastStore, toast } from '@/src/utils/toast-store';
import type { ToastItem, ToastType } from '@/src/types';

const TYPE_CONFIG: Record<
  ToastType,
  {
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
    iconBg: string;
    border: string;
    barColor: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    iconColor: 'text-[#00bb7f]',
    iconBg: 'bg-[#00bb7f]/10',
    border: 'border-emerald-200/80',
    barColor: 'bg-[#00bb7f]',
  },
  error: {
    icon: AlertCircle,
    iconColor: 'text-[#ed1c24]',
    iconBg: 'bg-[#ed1c24]/10',
    border: 'border-red-200/80',
    barColor: 'bg-[#ed1c24]',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-[#b38600]',
    iconBg: 'bg-[#ffc908]/20',
    border: 'border-amber-200/80',
    barColor: 'bg-[#ffc908]',
  },
  info: {
    icon: Info,
    iconColor: 'text-[#101828]',
    iconBg: 'bg-gray-100',
    border: 'border-gray-200/90',
    barColor: 'bg-[#101828]',
  },
};

export function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.info;
  const IconComponent = config.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto relative flex items-start gap-3 w-full max-w-sm sm:max-w-md bg-white/95 backdrop-blur-md rounded-xl p-3.5 shadow-xl border ${config.border} transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-3`}
    >
      {/* Accent Indicator Bar */}
      <div className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full ${config.barColor}`} />

      {/* Icon Badge */}
      <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${config.iconBg} ${config.iconColor} ml-1`}>
        <IconComponent className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-1">
        <h4 className="text-xs font-bold text-[#101828] tracking-tight leading-tight">
          {item.title}
        </h4>
        {item.description && (
          <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed break-words font-medium">
            {item.description}
          </p>
        )}
        {item.action && (
          <div className="mt-2.5">
            <button
              type="button"
              onClick={() => {
                item.action?.onClick();
                onDismiss(item.id);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#101828] text-white hover:bg-[#1f2937] active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5 text-[#ffc908]" />
              <span>{item.action.label}</span>
            </button>
          </div>
        )}
      </div>

      {/* Close Button */}
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Tutup notifikasi"
        className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

const EMPTY_TOASTS: ToastItem[] = [];

const subscribeToasts = (callback: () => void) => toastStore.subscribe(callback);
const getToastsSnapshot = () => toastStore.getToasts();
const getToastsServerSnapshot = () => EMPTY_TOASTS;

export function ToastContainer() {
  const toasts = useSyncExternalStore(
    subscribeToasts,
    getToastsSnapshot,
    getToastsServerSnapshot
  );

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-5 right-5 sm:right-6 z-[100] flex flex-col gap-2.5 pointer-events-none max-w-sm sm:max-w-md w-full"
      aria-live="polite"
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={(id) => toast.remove(id)} />
      ))}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastContainer />
    </>
  );
}

export function useToast() {
  return {
    toast,
    success: toast.success,
    error: toast.error,
    info: toast.info,
    warning: toast.warning,
    remove: toast.remove,
    clear: toast.clear,
  };
}
