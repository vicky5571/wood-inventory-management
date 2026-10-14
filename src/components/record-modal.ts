import type { WoodReceivingRecord } from '../types/index.ts';
import { computeRecordCalculations } from '../utils/timber-calc.ts';

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function openRecordModal(
  container: HTMLElement,
  initialRecord: WoodReceivingRecord | null,
  onSave: (record: WoodReceivingRecord) => void
): void {
  const isEdit = initialRecord !== null;
  const recordId = initialRecord?.id || `rec-${Date.now()}`;

  container.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-dialog">
        <h2 style="margin-bottom: 1rem; color: var(--wood-text-main);">
          ${isEdit ? 'Edit Penerimaan Kayu (编辑入库)' : 'Input Penerimaan Kayu Baru (新增木材入库)'}
        </h2>
        <form id="record-form">
          <!-- Dokumen & Pengiriman -->
          <fieldset class="form-fieldset">
            <legend class="form-legend">1. Dokumen & Pengiriman (发货单据与物流)</legend>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Tanggal Penerimaan <span>(到货日期) *</span></label>
                <input class="input-control" type="date" name="receiptDate" value="${escapeHtml(initialRecord?.receiptDate || new Date().toISOString().slice(0, 10))}" required />
              </div>
              <div class="form-group">
                <label class="form-label">No. Polisi Truk <span>(车牌号) *</span></label>
                <input class="input-control" type="text" name="truckPlateNumber" value="${escapeHtml(initialRecord?.truckPlateNumber || '')}" placeholder="e.g. B 1234 CD" required />
              </div>
              <div class="form-group">
                <label class="form-label">SKSHHK / DKP <span>(送货单号) *</span></label>
                <input class="input-control" type="text" name="forestryDocNumber" value="${escapeHtml(initialRecord?.forestryDocNumber || '')}" placeholder="e.g. SKSHHK-2026-..." required />
              </div>
              <div class="form-group">
                <label class="form-label">No. Kontrak <span>(合同编号)</span></label>
                <input class="input-control" type="text" name="contractNumber" value="${escapeHtml(initialRecord?.contractNumber || '')}" placeholder="e.g. CTR-01" />
              </div>
              <div class="form-group">
                <label class="form-label">Supplier / Pemilik <span>(供应商) *</span></label>
                <input class="input-control" type="text" name="supplierName" value="${escapeHtml(initialRecord?.supplierName || '')}" placeholder="Nama PT / Koperasi" required />
              </div>
            </div>
          </fieldset>

          <!-- Spesifikasi Kayu & Lokasi -->
          <fieldset class="form-fieldset">
            <legend class="form-legend">2. Spesifikasi Kayu & Lokasi Gudang (材种与批号)</legend>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Jenis Kayu <span>(树种) *</span></label>
                <input class="input-control" type="text" name="woodSpecies" value="${escapeHtml(initialRecord?.woodSpecies || '')}" placeholder="Teak / Merbau / Sengon" required />
              </div>
              <div class="form-group">
                <label class="form-label">Panjang Kayu (m) <span>(长度)</span></label>
                <input class="input-control" type="number" step="0.1" name="woodLengthM" value="${initialRecord?.woodLengthM ?? 4.0}" />
              </div>
              <div class="form-group">
                <label class="form-label">Nomer Kavling <span>(进厂批号) *</span></label>
                <input class="input-control" type="text" name="kavlingNumber" value="${escapeHtml(initialRecord?.kavlingNumber || 'KAV-01')}" required />
              </div>
              <div class="form-group">
                <label class="form-label">TPK / Lokasi Lapangan <span>(场地)</span></label>
                <input class="input-control" type="text" name="storageYard" value="${escapeHtml(initialRecord?.storageYard || 'TPK-1')}" />
              </div>
            </div>
          </fieldset>

          <!-- Pengukuran Fisik / Tally -->
          <fieldset class="form-fieldset">
            <legend class="form-legend">3. Pengukuran Batang & Volume (送货 vs 检尺)</legend>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Batang Surat Jalan <span>(送货根数)</span></label>
                <input class="input-control" type="number" name="deliveredPieces" value="${initialRecord?.deliveredPieces ?? 0}" />
              </div>
              <div class="form-group">
                <label class="form-label">Volume Surat Jalan m³ <span>(送货立方)</span></label>
                <input class="input-control" type="number" step="0.01" name="deliveredVolumeM3" value="${initialRecord?.deliveredVolumeM3 ?? 0}" />
              </div>
              <div class="form-group">
                <label class="form-label">Batang Tally <span>(检尺根数) *</span></label>
                <input class="input-control" type="number" name="tallyPieces" value="${initialRecord?.tallyPieces ?? 0}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Volume Tally m³ <span>(检尺立方) *</span></label>
                <input class="input-control" type="number" step="0.01" name="tallyVolumeM3" value="${initialRecord?.tallyVolumeM3 ?? 0}" required />
              </div>
            </div>
          </fieldset>

          <!-- Keuangan & Pajak -->
          <fieldset class="form-fieldset">
            <legend class="form-legend">4. Harga Kayu, Ongkir & Pajak (货款、运费与税金)</legend>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Harga Kayu / m³ <span>(均价)</span></label>
                <input class="input-control" type="number" name="timberPricePerM3" value="${initialRecord?.timberPricePerM3 ?? 0}" />
              </div>
              <div class="form-group">
                <label class="form-label">PPh Kayu (%) <span>(税率 0.5% / 1.5%)</span></label>
                <input class="input-control" type="number" step="0.1" name="timberPphRate" value="${initialRecord?.timberPphRate ?? 0.5}" />
              </div>
              <div class="form-group">
                <label class="form-label">Ongkos Kirim / m³ <span>(运费单价)</span></label>
                <input class="input-control" type="number" name="freightRatePerM3" value="${initialRecord?.freightRatePerM3 ?? 0}" />
              </div>
              <div class="form-group">
                <label class="form-label">Potongan PPh Ongkir (Rp) <span>(运费税)</span></label>
                <input class="input-control" type="number" name="freightPphAmount" value="${initialRecord?.freightPphAmount ?? 0}" />
              </div>
              <div class="form-group">
                <label class="form-label">Broker / Komisi (Rp) <span>(中介费)</span></label>
                <input class="input-control" type="number" name="brokerFee" value="${initialRecord?.brokerFee ?? 0}" />
              </div>
            </div>

            <!-- Dynamic Live Calculation Preview -->
            <div id="live-calculation-summary" style="margin-top: 1rem; padding: 0.75rem; background: #f8fafc; border-radius: var(--radius-sm); font-size: 0.8125rem;">
            </div>
          </fieldset>

          <div class="modal-actions">
            <button type="button" id="btn-modal-cancel" class="btn btn-secondary">Batal (取消)</button>
            <button type="submit" class="btn btn-primary">Simpan Data (保存入库)</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const form = container.querySelector('#record-form') as HTMLFormElement;
  const summaryBox = container.querySelector('#live-calculation-summary') as HTMLElement;

  const extractFormValues = () => {
    const data = new FormData(form);
    const tallyVol = parseFloat(data.get('tallyVolumeM3') as string) || 0;
    const delVol = parseFloat(data.get('deliveredVolumeM3') as string) || 0;
    const tallyPcs = parseInt(data.get('tallyPieces') as string, 10) || 0;
    const delPcs = parseInt(data.get('deliveredPieces') as string, 10) || 0;
    const timberPrice = parseFloat(data.get('timberPricePerM3') as string) || 0;
    const timberPph = parseFloat(data.get('timberPphRate') as string) || 0;
    const freightRate = parseFloat(data.get('freightRatePerM3') as string) || 0;
    const freightPph = parseFloat(data.get('freightPphAmount') as string) || 0;
    const broker = parseFloat(data.get('brokerFee') as string) || 0;

    const calc = computeRecordCalculations({
      tallyVolumeM3: Math.max(0, tallyVol),
      deliveredVolumeM3: Math.max(0, delVol),
      tallyPieces: Math.max(0, tallyPcs),
      deliveredPieces: Math.max(0, delPcs),
      timberPricePerM3: Math.max(0, timberPrice),
      timberPphRate: Math.max(0, timberPph),
      freightRatePerM3: Math.max(0, freightRate),
      freightPphAmount: Math.max(0, freightPph),
      brokerFee: Math.max(0, broker),
    });

    return { data, tallyVol, delVol, tallyPcs, delPcs, timberPrice, timberPph, freightRate, freightPph, broker, calc };
  };

  const updateLivePreview = () => {
    const { calc } = extractFormValues();
    summaryBox.innerHTML = `
      <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:0.5rem;">
        <div>Selisih Vol: <strong>${calc.volumeDiscrepancyM3 >= 0 ? '+' : ''}${calc.volumeDiscrepancyM3.toFixed(2)} m³</strong></div>
        <div>Net Kayu: <strong>${formatRupiah(calc.timberNetPayable)}</strong></div>
        <div>Net Ongkir: <strong>${formatRupiah(calc.freightNetPayable)}</strong></div>
        <div>Total Yang Harus Dibayar: <strong style="color:var(--wood-primary); font-size:1rem;">${formatRupiah(calc.grandNetPayable)}</strong></div>
      </div>
    `;
  };

  form.addEventListener('input', updateLivePreview);
  updateLivePreview();

  container.querySelector('#btn-modal-cancel')?.addEventListener('click', () => {
    container.innerHTML = '';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const { data, tallyVol, delVol, tallyPcs, delPcs, timberPrice, timberPph, freightRate, freightPph, broker, calc } = extractFormValues();

    const fullRecord: WoodReceivingRecord = {
      id: recordId,
      receiptDate: (data.get('receiptDate') as string) || new Date().toISOString().slice(0, 10),
      docDate: (data.get('docDate') as string) || initialRecord?.docDate || undefined,
      truckPlateNumber: (data.get('truckPlateNumber') as string) || '',
      forestryDocNumber: (data.get('forestryDocNumber') as string) || '',
      receiptNumber: (data.get('receiptNumber') as string) || initialRecord?.receiptNumber || `KW-${Date.now().toString().slice(-4)}`,
      contractNumber: (data.get('contractNumber') as string) || '',
      supplierName: (data.get('supplierName') as string) || '',
      woodSpecies: (data.get('woodSpecies') as string) || '',
      woodLengthM: parseFloat(data.get('woodLengthM') as string) || 0,
      kavlingNumber: (data.get('kavlingNumber') as string) || 'KAV-01',
      storageYard: (data.get('storageYard') as string) || 'TPK-1',
      deliveredPieces: delPcs,
      deliveredVolumeM3: delVol,
      tallyPieces: tallyPcs,
      tallyVolumeM3: tallyVol,
      timberPricePerM3: timberPrice,
      timberGrossTotal: calc.timberGrossTotal,
      timberPphRate: timberPph,
      timberPphAmount: calc.timberPphAmount,
      timberNetPayable: calc.timberNetPayable,
      freightRatePerM3: freightRate,
      freightGrossTotal: calc.freightGrossTotal,
      freightPphAmount: freightPph,
      freightNetPayable: calc.freightNetPayable,
      brokerFee: broker,
      grandNetPayable: calc.grandNetPayable,
      createdAt: initialRecord?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(fullRecord);
    container.innerHTML = '';
  });
}
