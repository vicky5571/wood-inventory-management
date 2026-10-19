'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import Chart from 'chart.js/auto';
import type { WoodReceivingRecord } from '@/src/types';
import { prepareSpeciesDonutData } from './chart-helpers';
import { PieChart } from 'lucide-react';

export function SpeciesDonutChart({ records }: { records: WoodReceivingRecord[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const donutData = useMemo(() => prepareSpeciesDonutData(records), [records]);
  const totalVolume = useMemo(() => donutData.values.reduce((a, b) => a + b, 0), [donutData]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const { labels, values, colors } = donutData;
    if (labels.length === 0) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.data.labels = labels;
      chartInstanceRef.current.data.datasets[0].data = values;
      chartInstanceRef.current.data.datasets[0].backgroundColor = colors;
      chartInstanceRef.current.update('none');
      return;
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartInstanceRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderColor: '#ffffff',
            borderWidth: 2,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              pointStyle: 'circle',
              font: { size: 11, family: 'inherit' },
              color: '#334155',
              padding: 12,
              generateLabels: (chart) => {
                const data = chart.data;
                if (!data.labels?.length || !data.datasets.length) return [];
                const dataset = data.datasets[0];
                return data.labels.map((label, i) => {
                  const val = dataset.data[i] as number;
                  const pct = totalVolume > 0 ? ((val / totalVolume) * 100).toFixed(1) : '0';
                  return {
                    text: `${label} (${pct}%)`,
                    fillStyle: (dataset.backgroundColor as string[])[i],
                    strokeStyle: '#fff',
                    lineWidth: 1,
                    index: i,
                  };
                });
              },
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
                const val = context.parsed;
                const pct = totalVolume > 0 ? ((val / totalVolume) * 100).toFixed(1) : '0';
                return ` ${val.toFixed(2)} m³ (${pct}%)`;
              },
            },
          },
        },
      },
    });

    return () => {
      chartInstanceRef.current?.destroy();
      chartInstanceRef.current = null;
    };
  }, [donutData, totalVolume]);

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#101828] uppercase tracking-wider">
              Komposisi Spesies Kayu (树种立方占比)
            </h3>
            <p className="text-[11px] text-gray-500">
              Distribusi volume kayu terverifikasi berdasarkan varietas
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-gray-700 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
          {totalVolume.toFixed(2)} m³ Total
        </span>
      </div>

      <div className="h-64 w-full relative flex items-center justify-center">
        <canvas ref={canvasRef} />
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pr-36">
          <span className="text-xl font-bold font-mono text-[#101828]">{totalVolume.toFixed(1)}</span>
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Total m³</span>
        </div>
      </div>
    </div>
  );
}
