-- 20261027000000_price_database_and_report_periods.sql
-- Timber Price Database & Report Period Closing System
-- Spec: docs/superpowers/price-database-spec.md
-- Plan: docs/superpowers/price-database-impl.md

-- 1. Create timber_price_entries table
CREATE TABLE IF NOT EXISTS public.timber_price_entries (
  id               TEXT PRIMARY KEY,
  tenant_id        TEXT NOT NULL DEFAULT 'default-tenant',
  wood_species     TEXT NOT NULL,
  supplier_id      TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name    TEXT,
  effective_from   DATE NOT NULL,
  effective_to     DATE,
  price_per_m3     NUMERIC NOT NULL CHECK (price_per_m3 >= 0),
  timber_pph_rate  NUMERIC NOT NULL DEFAULT 0.5 CHECK (timber_pph_rate >= 0),
  notes            TEXT,
  created_by       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_tpe_species_date
  ON public.timber_price_entries(wood_species, effective_from DESC);

CREATE INDEX IF NOT EXISTS idx_tpe_supplier
  ON public.timber_price_entries(supplier_id);

ALTER TABLE public.timber_price_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read and write access on timber_price_entries" ON public.timber_price_entries;
CREATE POLICY "Allow public read and write access on timber_price_entries"
  ON public.timber_price_entries FOR ALL USING (true) WITH CHECK (true);

-- 2. Create report_periods table
CREATE TABLE IF NOT EXISTS public.report_periods (
  id                    TEXT PRIMARY KEY,
  tenant_id             TEXT NOT NULL DEFAULT 'default-tenant',
  name                  TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'REOPENED')),
  start_date            DATE NOT NULL,
  end_date              DATE NOT NULL,
  closed_at             TIMESTAMPTZ,
  closed_by             TEXT,
  total_records         INTEGER,
  total_volume_m3       NUMERIC,
  total_net_payable_idr NUMERIC,
  price_snapshot_ids    JSONB,
  reopened_at           TIMESTAMPTZ,
  reopened_by           TEXT,
  reopen_reason         TEXT,
  notes                 TEXT,
  created_by            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_report_periods_dates
  ON public.report_periods(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_report_periods_status
  ON public.report_periods(status);

ALTER TABLE public.report_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read and write access on report_periods" ON public.report_periods;
CREATE POLICY "Allow public read and write access on report_periods"
  ON public.report_periods FOR ALL USING (true) WITH CHECK (true);

-- 3. Add columns to receiving_items for locking & period link
ALTER TABLE public.receiving_items
  ADD COLUMN IF NOT EXISTS report_period_id TEXT REFERENCES public.report_periods(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS price_entry_id TEXT REFERENCES public.timber_price_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_receiving_items_period ON public.receiving_items(report_period_id);
CREATE INDEX IF NOT EXISTS idx_receiving_items_price ON public.receiving_items(price_entry_id);

-- 4. Refresh Views to include is_locked, report_period_id, and price_entry_id
DROP VIEW IF EXISTS public.v_buku_besar_flat CASCADE;

CREATE OR REPLACE VIEW public.v_buku_besar_flat AS
SELECT
  CASE 
    WHEN (SELECT COUNT(*) FROM receiving_items ri WHERE ri.manifest_id = m.id) = 1 
    THEN m.id 
    ELSE m.id || '_' || i.id 
  END AS id,
  m.id AS manifest_id,
  i.id AS item_id,
  m.tenant_id,
  m.receipt_date AS "receiptDate",
  m.doc_date AS "docDate",
  m.truck_plate_number AS "truckPlateNumber",
  m.forestry_doc_number AS "forestryDocNumber",
  m.receipt_number AS "receiptNumber",
  m.contract_number AS "contractNumber",
  sup.name AS "supplierName",
  m.broker_id AS "brokerId",
  f.species_name AS "woodSpecies",
  i.wood_length_m AS "woodLengthM",
  COALESCE(f.kavling_number, '') AS "kavlingNumber",
  COALESCE(f.storage_yard, '') AS "storageYard",
  i.delivered_pieces AS "deliveredPieces",
  i.delivered_volume_m3 AS "deliveredVolumeM3",
  i.tally_pieces AS "tallyPieces",
  i.tally_volume_m3 AS "tallyVolumeM3",
  i.timber_price_per_m3 AS "timberPricePerM3",
  f.timber_gross_total AS "timberGrossTotal",
  i.timber_pph_rate AS "timberPphRate",
  f.timber_pph_amount AS "timberPphAmount",
  f.timber_net_payable AS "timberNetPayable",
  m.freight_rate_per_m3 AS "freightRatePerM3",
  ROUND((i.tally_volume_m3 * m.freight_rate_per_m3)::numeric, 2) AS "freightGrossTotal",
  ROUND(((i.tally_volume_m3 * m.freight_rate_per_m3) * (m.freight_pph_rate / 100.0))::numeric, 2) AS "freightPphAmount",
  ROUND(((i.tally_volume_m3 * m.freight_rate_per_m3) - ((i.tally_volume_m3 * m.freight_rate_per_m3) * (m.freight_pph_rate / 100.0)))::numeric, 2) AS "freightNetPayable",
  CASE 
    WHEN COALESCE((SELECT SUM(ri.tally_volume_m3) FROM receiving_items ri WHERE ri.manifest_id = m.id), 0) > 0 
    THEN ROUND((m.broker_fee * (i.tally_volume_m3 / (SELECT SUM(ri.tally_volume_m3) FROM receiving_items ri WHERE ri.manifest_id = m.id)))::numeric, 2)
    WHEN i.item_sequence = 1 THEN m.broker_fee
    ELSE 0.0
  END AS "brokerFee",
  CASE
    WHEN f.timber_net_payable IS NULL THEN NULL
    ELSE ROUND((f.timber_net_payable + ((i.tally_volume_m3 * m.freight_rate_per_m3) - ((i.tally_volume_m3 * m.freight_rate_per_m3) * (m.freight_pph_rate / 100.0))) + CASE 
      WHEN COALESCE((SELECT SUM(ri.tally_volume_m3) FROM receiving_items ri WHERE ri.manifest_id = m.id), 0) > 0 
      THEN ROUND((m.broker_fee * (i.tally_volume_m3 / (SELECT SUM(ri.tally_volume_m3) FROM receiving_items ri WHERE ri.manifest_id = m.id)))::numeric, 2)
      WHEN i.item_sequence = 1 THEN m.broker_fee
      ELSE 0.0
    END)::numeric, 2)
  END AS "grandNetPayable",
  m.payment_status AS "paymentStatus",
  COALESCE(i.payment_form_id, m.payment_form_id) AS "paymentFormId",
  i.report_period_id AS "reportPeriodId",
  i.price_entry_id AS "priceEntryId",
  COALESCE(i.is_locked, FALSE) AS "isLocked",
  m.invoice_number AS "invoiceNumber",
  m.payment_date AS "paymentDate",
  m.payment_notes AS "paymentNotes",
  m.created_at AS "createdAt",
  m.updated_at AS "updatedAt"
FROM receiving_manifests m
JOIN suppliers sup ON m.supplier_id = sup.id
JOIN receiving_items i ON m.id = i.manifest_id
JOIN v_receiving_item_financials f ON i.id = f.item_id;

-- 5. Seed initial standard timber prices
INSERT INTO public.timber_price_entries
  (id, tenant_id, wood_species, supplier_id, supplier_name, effective_from, effective_to, price_per_m3, timber_pph_rate, notes, created_by)
VALUES
  ('TPE-JATI-STD-2026', 'default-tenant', 'Jati / Teak (柚木)', NULL, NULL, '2026-01-01', NULL, 4500000, 0.5, 'Tarif patokan standar log Jati umum 2026', 'Sistem (Seeder)'),
  ('TPE-JATI-RBL-2026', 'default-tenant', 'Jati / Teak (柚木)', 'SPL-001', 'Perum Perhutani KPH Randublatung', '2026-07-01', NULL, 4800000, 0.5, 'Kontrak lelang kayu Jati AIII KPH Randublatung Q3-Q4 2026', 'Sistem (Seeder)'),
  ('TPE-JATI-MNT-2026', 'default-tenant', 'Jati / Teak (柚木)', 'SPL-002', 'Perum Perhutani KPH Mantingan', '2026-07-01', NULL, 4700000, 0.5, 'Kontrak kayu Jati Mantingan bersertifikat FSC Q3-Q4 2026', 'Sistem (Seeder)'),
  ('TPE-MRB-STD-2026', 'default-tenant', 'Merbau (菠萝格)', NULL, NULL, '2026-01-01', NULL, 3800000, 0.5, 'Patokan standar log Merbau Papua / Maluku 2026', 'Sistem (Seeder)'),
  ('TPE-MRB-HLN-2026', 'default-tenant', 'Merbau (菠萝格)', 'SPL-004', 'PT Hutan Lestari Nusantara', '2026-07-01', NULL, 3950000, 0.5, 'Kontrak pasokan Merbau log luar pulau Q3-Q4 2026', 'Sistem (Seeder)'),
  ('TPE-MHN-STD-2026', 'default-tenant', 'Mahoni (桃花心木)', NULL, NULL, '2026-01-01', NULL, 2800000, 0.5, 'Patokan harga kayu Mahoni perkebunan rakyat', 'Sistem (Seeder)'),
  ('TPE-MER-STD-2026', 'default-tenant', 'Meranti (柳安木)', NULL, NULL, '2026-01-01', NULL, 2600000, 0.5, 'Patokan harga kayu Meranti merah komersial', 'Sistem (Seeder)'),
  ('TPE-KRG-STD-2026', 'default-tenant', 'Keruing (克鲁)', NULL, NULL, '2026-01-01', NULL, 2400000, 0.5, 'Patokan harga kayu Keruing konstruksi', 'Sistem (Seeder)'),
  ('TPE-PNS-STD-2026', 'default-tenant', 'Pinus / Pine (松木)', NULL, NULL, '2026-01-01', NULL, 1600000, 0.5, 'Patokan kayu jarum Pinus Merkusii', 'Sistem (Seeder)'),
  ('TPE-SGN-STD-2026', 'default-tenant', 'Sengon / Albasia (南洋楹)', NULL, NULL, '2026-01-01', NULL, 950000, 0.5, 'Patokan kayu lunak Sengon / Albasia', 'Sistem (Seeder)'),
  ('TPE-JBN-STD-2026', 'default-tenant', 'Jabon (白楝)', NULL, NULL, '2026-01-01', NULL, 850000, 0.5, 'Patokan kayu Jabon industri veneer/blockboard', 'Sistem (Seeder)')
ON CONFLICT (id) DO UPDATE SET
  wood_species    = EXCLUDED.wood_species,
  supplier_id     = EXCLUDED.supplier_id,
  supplier_name   = EXCLUDED.supplier_name,
  effective_from  = EXCLUDED.effective_from,
  effective_to    = EXCLUDED.effective_to,
  price_per_m3    = EXCLUDED.price_per_m3,
  timber_pph_rate = EXCLUDED.timber_pph_rate,
  notes           = EXCLUDED.notes,
  updated_at      = timezone('utc'::text, now());

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
