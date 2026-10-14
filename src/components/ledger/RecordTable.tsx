import React from 'react';
import type { WoodReceivingRecord } from '../../types/index.ts';
import { Pencil, Trash2 } from 'lucide-react';

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function RecordTable({
  records,
  onEdit,
  onDelete,
}: {
  records: WoodReceivingRecord[];
  onEdit: (record: WoodReceivingRecord) => void;
  onDelete: (id: string) => void;
}) {
  if (records.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
        <p className="text-sm">Tidak ada data penerimaan kayu yang cocok dengan kriteria pencarian.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <th className="p-3 whitespace-nowrap">Penerimaan<span className="block text-[10px] text-slate-400 font-normal">到货日期</span></th>
              <th className="p-3 whitespace-nowrap">No. Polisi<span className="block text-[10px] text-slate-400 font-normal">车牌号</span></th>
              <th className="p-3 whitespace-nowrap">SKSHHK / DKP<span className="block text-[10px] text-slate-400 font-normal">送货单号</span></th>
              <th className="p-3 whitespace-nowrap">No. Kontrak<span className="block text-[10px] text-slate-400 font-normal">合同编号</span></th>
              <th className="p-3 whitespace-nowrap">Supplier<span className="block text-[10px] text-slate-400 font-normal">供应商</span></th>
              <th className="p-3 whitespace-nowrap">Jenis Kayu<span className="block text-[10px] text-slate-400 font-normal">材种</span></th>
              <th className="p-3 whitespace-nowrap">No. Kav<span className="block text-[10px] text-slate-400 font-normal">进厂批号</span></th>
              <th className="p-3 whitespace-nowrap">Batang (Del / Tally)<span className="block text-[10px] text-slate-400 font-normal">送货/检尺根数</span></th>
              <th className="p-3 whitespace-nowrap">Vol m³ (Del / Tally)<span className="block text-[10px] text-slate-400 font-normal">送货/检尺立方</span></th>
              <th className="p-3 whitespace-nowrap">Selisih Vol<span className="block text-[10px] text-slate-400 font-normal">误差立方</span></th>
              <th className="p-3 whitespace-nowrap">Net Kayu<span className="block text-[10px] text-slate-400 font-normal">木材应付</span></th>
              <th className="p-3 whitespace-nowrap">Net Ongkir<span className="block text-[10px] text-slate-400 font-normal">运费应付</span></th>
              <th className="p-3 whitespace-nowrap">Total Bayar<span className="block text-[10px] text-slate-400 font-normal">应付金额</span></th>
              <th className="p-3 whitespace-nowrap text-center">Aksi<span className="block text-[10px] text-slate-400 font-normal">操作</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((r) => {
              const volDiff = Number((r.tallyVolumeM3 - r.deliveredVolumeM3).toFixed(2));
              const isMatch = Math.abs(volDiff) < 0.001;
              const isSurplus = volDiff > 0;

              return (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-medium whitespace-nowrap">{r.receiptDate}</td>
                  <td className="p-3 whitespace-nowrap">{r.truckPlateNumber}</td>
                  <td className="p-3 font-mono text-slate-700 whitespace-nowrap">{r.forestryDocNumber}</td>
                  <td className="p-3 whitespace-nowrap">{r.contractNumber}</td>
                  <td className="p-3 whitespace-nowrap">{r.supplierName}</td>
                  <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">{r.woodSpecies}</td>
                  <td className="p-3 font-semibold text-amber-700 whitespace-nowrap">{r.kavlingNumber}</td>
                  <td className="p-3 whitespace-nowrap">{r.deliveredPieces} / <strong>{r.tallyPieces}</strong></td>
                  <td className="p-3 whitespace-nowrap">{r.deliveredVolumeM3.toFixed(2)} / <strong>{r.tallyVolumeM3.toFixed(2)}</strong></td>
                  <td className="p-3 whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${isMatch ? 'bg-slate-100 text-slate-700' : isSurplus ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {isMatch ? '0.00' : isSurplus ? `+${volDiff.toFixed(2)}` : volDiff.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">{formatRupiah(r.timberNetPayable)}</td>
                  <td className="p-3 whitespace-nowrap">{formatRupiah(r.freightNetPayable)}</td>
                  <td className="p-3 font-bold text-amber-800 whitespace-nowrap">{formatRupiah(r.grandNetPayable)}</td>
                  <td className="p-3 whitespace-nowrap text-center">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => onEdit(r)}
                        className="p-1 text-slate-500 hover:text-amber-700 hover:bg-slate-100 rounded transition"
                        title="Edit data"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Apakah Anda yakin ingin menghapus data penerimaan ini?')) {
                            onDelete(r.id);
                          }
                        }}
                        className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                        title="Hapus data"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
