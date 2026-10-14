import type { WoodReceivingRecord } from '@/src/types';
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
  canWrite = true,
  onEdit,
  onDelete,
}: {
  records: WoodReceivingRecord[];
  canWrite?: boolean;
  onEdit: (record: WoodReceivingRecord) => void;
  onDelete: (id: string) => void;
}) {
  if (records.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center text-gray-500 shadow-xs">
        <p className="text-sm">Tidak ada data penerimaan kayu yang cocok dengan kriteria pencarian.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-700 font-semibold">
              <th className="p-3.5 whitespace-nowrap">Penerimaan<span className="block text-[10px] text-gray-400 font-normal">到货日期</span></th>
              <th className="p-3.5 whitespace-nowrap">No. Polisi<span className="block text-[10px] text-gray-400 font-normal">车牌号</span></th>
              <th className="p-3.5 whitespace-nowrap">SKSHHK / DKP<span className="block text-[10px] text-gray-400 font-normal">送货单号</span></th>
              <th className="p-3.5 whitespace-nowrap">No. Kontrak<span className="block text-[10px] text-gray-400 font-normal">合同编号</span></th>
              <th className="p-3.5 whitespace-nowrap">Supplier<span className="block text-[10px] text-gray-400 font-normal">供应商</span></th>
              <th className="p-3.5 whitespace-nowrap">Jenis Kayu<span className="block text-[10px] text-gray-400 font-normal">材种</span></th>
              <th className="p-3.5 whitespace-nowrap">No. Kav<span className="block text-[10px] text-gray-400 font-normal">进厂批号</span></th>
              <th className="p-3.5 whitespace-nowrap font-mono">Batang (Del / Tally)<span className="block text-[10px] text-gray-400 font-sans font-normal">送货/检尺根数</span></th>
              <th className="p-3.5 whitespace-nowrap font-mono">Vol m³ (Del / Tally)<span className="block text-[10px] text-gray-400 font-sans font-normal">送货/检尺立方</span></th>
              <th className="p-3.5 whitespace-nowrap font-mono">Selisih Vol<span className="block text-[10px] text-gray-400 font-sans font-normal">误差立方</span></th>
              <th className="p-3.5 whitespace-nowrap font-mono">Net Kayu<span className="block text-[10px] text-gray-400 font-sans font-normal">木材应付</span></th>
              <th className="p-3.5 whitespace-nowrap font-mono">Net Ongkir<span className="block text-[10px] text-gray-400 font-sans font-normal">运费应付</span></th>
              <th className="p-3.5 whitespace-nowrap font-mono">Total Bayar<span className="block text-[10px] text-gray-400 font-sans font-normal">应付金额</span></th>
              {canWrite && <th className="p-3.5 whitespace-nowrap text-center">Aksi<span className="block text-[10px] text-gray-400 font-normal">操作</span></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.map((r) => {
              const volDiff = Number((r.tallyVolumeM3 - r.deliveredVolumeM3).toFixed(2));
              const isMatch = Math.abs(volDiff) < 0.001;
              const isSurplus = volDiff > 0;

              return (
                <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="p-3.5 font-medium whitespace-nowrap text-gray-900">{r.receiptDate}</td>
                  <td className="p-3.5 whitespace-nowrap font-medium text-gray-800">{r.truckPlateNumber}</td>
                  <td className="p-3.5 font-mono text-gray-600 whitespace-nowrap">{r.forestryDocNumber}</td>
                  <td className="p-3.5 whitespace-nowrap text-gray-600">{r.contractNumber}</td>
                  <td className="p-3.5 whitespace-nowrap font-medium text-gray-900">{r.supplierName}</td>
                  <td className="p-3.5 font-semibold text-gray-900 whitespace-nowrap">{r.woodSpecies}</td>
                  <td className="p-3.5 font-semibold text-[#b38600] whitespace-nowrap">{r.kavlingNumber}</td>
                  <td className="p-3.5 whitespace-nowrap font-mono tabular-nums text-gray-700">
                    {r.deliveredPieces} / <strong className="text-gray-950">{r.tallyPieces}</strong>
                  </td>
                  <td className="p-3.5 whitespace-nowrap font-mono tabular-nums text-gray-700">
                    {r.deliveredVolumeM3.toFixed(2)} / <strong className="text-gray-950">{r.tallyVolumeM3.toFixed(2)}</strong>
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono tabular-nums ${
                        isMatch
                          ? 'bg-gray-100 text-gray-700'
                          : isSurplus
                          ? 'bg-emerald-50 text-[#00bb7f] border border-emerald-200/80'
                          : 'bg-rose-50 text-[#ed1c24] border border-rose-200/80'
                      }`}
                    >
                      {isMatch ? '0.00' : isSurplus ? `+${volDiff.toFixed(2)}` : volDiff.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-3.5 whitespace-nowrap font-mono tabular-nums text-gray-700">{formatRupiah(r.timberNetPayable)}</td>
                  <td className="p-3.5 whitespace-nowrap font-mono tabular-nums text-gray-700">{formatRupiah(r.freightNetPayable)}</td>
                  <td className="p-3.5 font-bold font-mono tabular-nums text-[#101828] whitespace-nowrap">{formatRupiah(r.grandNetPayable)}</td>
                  {canWrite && (
                    <td className="p-3.5 whitespace-nowrap text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => onEdit(r)}
                          className="p-1.5 text-gray-400 hover:text-[#b38600] hover:bg-[#ffc908]/15 rounded-lg transition"
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
                          className="p-1.5 text-gray-400 hover:text-[#ed1c24] hover:bg-rose-50 rounded-lg transition"
                          title="Hapus data"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

