'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import Chart from 'chart.js/auto';
import type { WoodReceivingRecord } from '@/src/types';
import { prepareSupplierBarData } from './chart-helpers';
import { Building2 } from 'lucide-react';

export function SupplierBarChart({ records }: { records: WoodReceivingRecord[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const supplierData = useMemo(() => prepareSupplierBarData(records), [records]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const { labels, delivered, tally } = supplierData;
    if (labels.length === 0) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.data.labels = labels;
      chartInstanceRef.current.data.datasets[0].data = tally;
      chartInstanceRef.current.data.datasets[1].data = delivered;
      chartInstanceRef.current.update('none');
      return;
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Tally Fisik / 检尺 (m³)',
            data: tally,
            backgroundColor: '#0284c7', // Sky-600
            borderRadius: 6,
            maxBarThickness: 28,
          },
          {
            label: 'Surat Jalan / 送货 (m³)',
            data: delivered,
            backgroundColor: '#cbd5e1', // Slate-300
            borderRadius: 6,
            maxBarThickness: 28,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 12,
              boxHeight: 12,
              usePointStyle: true,
              pointStyle: 'circle',
              font: { size: 11, family: 'inherit', weight: 500 },
              color: '#475569',
            },
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            padding: 10,
            cornerRadius: 10,
            callbacks: {
              label: (context) => {
                const y = context.parsed.y ?? 0;
                return ` ${context.dataset.label}: ${y.toFixed(2)} m³`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 }, color: '#475569' },
          },
          y: {
            grid: { color: 'rgba(241, 245, 249, 0.8)' },
            ticks: {
              font: { size: 10 },
              color: '#64748b',
              callback: (val) => `${val} m³`,
            },
          },
        },
      },
    });

    return () => {
      chartInstanceRef.current?.destroy();
      chartInstanceRef.current = null;
    };
  }, [supplierData]);

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#101828] uppercase tracking-wider">
              Volume Pasokan per Rekanan (各供应商供货体积)
            </h3>
            <p className="text-[11px] text-gray-500">
              Penerimaan kumulatif dari pemasok utama dan perbandingan fisik
            </p>
          </div>
        </div>
      </div>

      <div className="h-64 w-full relative">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
