'use client';

import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import type { WoodReceivingRecord } from '@/src/types';
import { prepareVolumeTrendData } from './chart-helpers';
import { TrendingUp } from 'lucide-react';

export function VolumeTrendChart({ records }: { records: WoodReceivingRecord[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Destroy existing instance to avoid canvas reuse error
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const { labels, deliveredVolumes, tallyVolumes } = prepareVolumeTrendData(records);

    if (labels.length === 0) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Volume Tally / 检尺立方 (m³)',
            data: tallyVolumes,
            borderColor: '#b45309', // Amber-700
            backgroundColor: 'rgba(180, 83, 9, 0.1)',
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointBackgroundColor: '#b45309',
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            label: 'Surat Jalan / 送货立方 (m³)',
            data: deliveredVolumes,
            borderColor: '#94a3b8', // Slate-400
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            tension: 0.35,
            borderWidth: 2,
            pointBackgroundColor: '#94a3b8',
            pointRadius: 3,
            pointHoverRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
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
            titleFont: { size: 12, weight: 600 },
            bodyFont: { size: 11 },
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
            grid: { color: 'rgba(241, 245, 249, 0.8)' },
            ticks: { font: { size: 10 }, color: '#64748b' },
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
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [records]);

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#101828] uppercase tracking-wider">
              Tren Arus Masuk Volume Kayu (入库立方趋势)
            </h3>
            <p className="text-[11px] text-gray-500">
              Perbandingan kubikasi Surat Jalan vs Tally Fisik per tanggal kedatangan
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
