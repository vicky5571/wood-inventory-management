import React from 'react';

/**
 * Root Loading Skeleton (app/loading.tsx)
 *
 * Automatically mounted by Next.js App Router inside a React Suspense
 * boundary whenever client-side route navigation occurs. Provides instant visual
 * feedback when switching pages from the sidebar before route payload finishes.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Memuat data halaman..."
      className="flex flex-col gap-6 w-full animate-in fade-in duration-150"
    >
      <span className="sr-only">Memuat halaman... (正在加载页面)</span>

      {/* 1. Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/80">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-gray-200 animate-pulse" />
            <div className="w-56 h-6 rounded-lg bg-gray-200 animate-pulse" />
          </div>
          <div className="w-80 max-w-full h-3.5 rounded bg-gray-200/70 animate-pulse" />
        </div>

        <div className="flex items-center gap-2">
          <div className="w-28 h-9 rounded-xl bg-gray-200 animate-pulse" />
          <div className="w-24 h-9 rounded-xl bg-gray-200/80 animate-pulse" />
        </div>
      </div>

      {/* 2. KPI / Metrics Summary Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="p-4 rounded-2xl bg-white border border-gray-200/70 shadow-2xs flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-24 h-3.5 rounded bg-gray-200/80 animate-pulse" />
              <div className="w-7 h-7 rounded-lg bg-gray-100 animate-pulse" />
            </div>
            <div className="w-32 h-7 rounded-lg bg-gray-200 animate-pulse mt-1" />
            <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
              <div className="w-16 h-3 rounded bg-gray-100 animate-pulse" />
              <div className="w-20 h-3 rounded bg-gray-100 animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* 3. Main Data Card & Table/Chart Workspace Skeleton */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs flex flex-col gap-4">
        {/* Toolbar Placeholder */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="w-full h-9 rounded-xl bg-gray-100 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20 h-8 rounded-lg bg-gray-100 animate-pulse" />
            <div className="w-24 h-8 rounded-lg bg-gray-100 animate-pulse" />
          </div>
        </div>

        {/* Content Table / Grid Rows Placeholder */}
        <div className="flex flex-col gap-2.5 pt-1">
          {/* Table Header Placeholder */}
          <div className="h-9 rounded-xl bg-gray-100/80 animate-pulse w-full" />

          {/* Table Row Placeholders */}
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div
              key={row}
              className="h-12 rounded-xl bg-gray-50/80 border border-gray-100 px-4 flex items-center justify-between gap-4"
            >
              <div className="w-24 h-4 rounded bg-gray-200/70 animate-pulse" />
              <div className="w-36 h-4 rounded bg-gray-200/60 animate-pulse hidden sm:block" />
              <div className="w-28 h-4 rounded bg-gray-200/60 animate-pulse" />
              <div className="w-20 h-4 rounded bg-gray-200/70 animate-pulse" />
              <div className="w-16 h-6 rounded-md bg-gray-200/50 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
