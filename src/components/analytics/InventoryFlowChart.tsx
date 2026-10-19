'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import Chart from 'chart.js/auto';
import type { WoodReceivingRecord, WoodSalesRecord } from '@/src/types/index';
import { prepareInventoryFlowData } from './sales-chart-helpers';
import { ArrowLeftRight } from 'lucide-react';

export interface InventoryFlowChartProps {
  inboundRecords: WoodReceivingRecord[];
  salesRecords: WoodSalesRecord[];
}

export function InventoryFlowChart({ inboundRecords, salesRecords }: InventoryFlowChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const flowData = useMemo(
    () => prepareInventoryFlowData(inboundRecords, salesRecords),
    [inboundRecords, salesRecords]
  );

  useEffect(() => {
    if (!canvasRef.current) return;
    const { labels, inboundVolumes, outboundVolumes, netVolumes } = flowData;
    if (labels.length === 0) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.data.labels = labels;
      chartInstanceRef.current.data.datasets[0].data = inboundVolumes;
      chartInstanceRef.current.data.datasets[1].data = outboundVolumes;
      chartInstanceRef.current.data.datasets[2].data = netVolumes;
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
            type: 'bar',
            label: 'Kayu Masuk / 入库 (m³)',
            data: inboundVolumes,
            backgroundColor: '#10b981', // emerald-500
            borderRadius: 6,
            barPercentage: 0.6,
          },
          {
            type: 'bar',
            label: 'Kayu Keluar / 出库 (m³)',
            data: outboundVolumes,
            backgroundColor: '#f59e0b', // amber-500
            borderRadius: 6,
            barPercentage: 0.6,
          },
          {
            type: 'line',
            label: 'Arus Bersih / 净变化 (m³)',
            data: netVolumes,
            borderColor: '#2563eb', // blue-600
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 3,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 10, font: { size: 10, weight: 'bold' } },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw} m³`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 } },
          },
          y: {
            beginAtZero: true,
            ticks: {
              font: { size: 10 },
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
  }, [flowData]);

  const isEmpty = (inboundRecords?.length || 0) === 0 && (salesRecords?.length || 0) === 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
            <ArrowLeftRight className="w-4 h-4 text-emerald-600" />
            <span>Arus Inventaris: Masuk vs. Keluar (库存进出流水)</span>
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Perbandingan volume kubikasi penerimaan log vs. pengeluaran penjualan (m³)
          </p>
        </div>
      </div>

      <div className="relative h-64 w-full flex items-center justify-center">
        {isEmpty ? (
          <p className="text-xs text-gray-400">Belum ada data transaksi inventaris.</p>
        ) : (
          <canvas ref={canvasRef} />
        )}
      </div>
    </div>
  );
}
