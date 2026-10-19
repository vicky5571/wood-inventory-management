'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import Chart from 'chart.js/auto';
import type { WoodSalesRecord } from '@/src/types/index';
import { prepareCustomerSalesData } from './sales-chart-helpers';
import { Users } from 'lucide-react';

export interface CustomerSalesBarChartProps {
  salesRecords: WoodSalesRecord[];
}

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function CustomerSalesBarChart({ salesRecords }: CustomerSalesBarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const customerData = useMemo(
    () => prepareCustomerSalesData(salesRecords, 5),
    [salesRecords]
  );

  useEffect(() => {
    if (!canvasRef.current) return;
    const { labels, volumes, revenues } = customerData;
    if (labels.length === 0) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.data.labels = labels;
      chartInstanceRef.current.data.datasets[0].data = volumes;
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
            label: 'Volume (m³)',
            data: volumes,
            backgroundColor: '#0284c7', // sky-600
            borderRadius: 6,
            yAxisID: 'yVolume',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterLabel: (ctx) => {
                const revenue = revenues[ctx.dataIndex] || 0;
                return `Total Nilai: ${formatRupiah(revenue)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 } },
          },
          yVolume: {
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
      chartInstanceRef.current?.destroy();
      chartInstanceRef.current = null;
    };
  }, [customerData]);

  const isEmpty = (!salesRecords || salesRecords.length === 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
            <Users className="w-4 h-4 text-sky-600" />
            <span>Peringkat Pembeli Utama (大客户销售榜)</span>
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Top customer berdasarkan total akumulasi volume pembelian kayu (m³) & omzet
          </p>
        </div>
      </div>

      <div className="relative h-64 w-full flex items-center justify-center">
        {isEmpty ? (
          <p className="text-xs text-gray-400">Belum ada data penjualan pelanggan.</p>
        ) : (
          <canvas ref={canvasRef} />
        )}
      </div>
    </div>
  );
}
