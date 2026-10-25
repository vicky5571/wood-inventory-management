-- ============================================================================
-- CONSOLIDATED SYNC SCRIPT FOR SUPABASE
-- Run this in Supabase Dashboard -> SQL Editor
-- Creates all missing tables, columns, views, and RLS policies idempotently
-- ============================================================================

-- 1. App Settings Table
CREATE TABLE IF NOT EXISTS public.app_settings (
  tenant_id TEXT PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  default_timber_pph_rate NUMERIC NOT NULL DEFAULT 0.5 CHECK (default_timber_pph_rate >= 0),
  default_freight_pph_rate NUMERIC NOT NULL DEFAULT 2.0 CHECK (default_freight_pph_rate >= 0),
  default_broker_fee NUMERIC NOT NULL DEFAULT 250000 CHECK (default_broker_fee >= 0),
  acceptable_discrepancy_threshold_pct NUMERIC NOT NULL DEFAULT 2.0 CHECK (acceptable_discrepancy_threshold_pct >= 0),
  discrepancy_alarm_volume_m3 NUMERIC NOT NULL DEFAULT 1.5 CHECK (discrepancy_alarm_volume_m3 > 0),
  discrepancy_alarm_percent NUMERIC NOT NULL DEFAULT 2.0 CHECK (discrepancy_alarm_percent > 0),
  yard_name TEXT NOT NULL DEFAULT 'TPK-01 Utama (Central Yard)',
  yard_code TEXT NOT NULL DEFAULT 'TPK-01',
  company_name TEXT NOT NULL DEFAULT 'PT. BRILLIANT JAYA WOOD INDUSTRY',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read and write access on app_settings" ON public.app_settings;
CREATE POLICY "Allow public read and write access on app_settings"
  ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

-- Ensure default tenant app_settings row exists
INSERT INTO public.app_settings (tenant_id)
VALUES ('default-tenant')
ON CONFLICT (tenant_id) DO NOTHING;

-- 2. Activity Audit Logs Table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  action TEXT NOT NULL,
  entity_id TEXT,
  entity_summary TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  operator_role TEXT NOT NULL,
  metadata_json TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(tenant_id, action);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read and write access on activity_logs" ON public.activity_logs;
CREATE POLICY "Allow public read and write access on activity_logs"
  ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);

-- 3. Brokers Master Table
CREATE TABLE IF NOT EXISTS public.brokers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  default_commission_per_m3 NUMERIC CHECK (default_commission_per_m3 IS NULL OR default_commission_per_m3 >= 0),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);
CREATE INDEX IF NOT EXISTS idx_brokers_tenant_status ON public.brokers(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_brokers_name ON public.brokers(tenant_id, name);
ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read and write access on brokers" ON public.brokers;
CREATE POLICY "Allow public read and write access on brokers"
  ON public.brokers FOR ALL USING (true) WITH CHECK (true);

-- Link broker_id to receiving_manifests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'receiving_manifests' AND column_name = 'broker_id'
  ) THEN
    ALTER TABLE public.receiving_manifests ADD COLUMN broker_id TEXT REFERENCES public.brokers(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_manifests_broker ON public.receiving_manifests(tenant_id, broker_id);
  END IF;
END $$;

-- 4. Perhutani Contracts
CREATE TABLE IF NOT EXISTS public.perhutani_contracts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant' REFERENCES public.tenants(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL,
  contract_date DATE NOT NULL,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE NOT NULL,
  kph_origin TEXT NOT NULL,
  po_number TEXT,
  total_contract_value_idr NUMERIC(15, 2) NOT NULL DEFAULT 0.0 CHECK (total_contract_value_idr >= 0),
  total_purchased_volume_m3 NUMERIC(12, 4) NOT NULL DEFAULT 0.0 CHECK (total_purchased_volume_m3 >= 0),
  total_purchased_pieces INTEGER NOT NULL DEFAULT 0 CHECK (total_purchased_pieces >= 0),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'FULFILLED', 'EXPIRED', 'CANCELLED')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_tenant_contract_number UNIQUE (tenant_id, contract_number)
);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_date ON public.perhutani_contracts(tenant_id, contract_date DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.perhutani_contracts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON public.perhutani_contracts(tenant_id, effective_end_date);
ALTER TABLE public.perhutani_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users on contracts" ON public.perhutani_contracts;
CREATE POLICY "Enable all for authenticated users on contracts"
  ON public.perhutani_contracts FOR ALL USING (true) WITH CHECK (true);

-- Sortiment items
CREATE TABLE IF NOT EXISTS public.contract_sortiment_items (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES public.perhutani_contracts(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant' REFERENCES public.tenants(id) ON DELETE CASCADE,
  item_sequence INTEGER NOT NULL DEFAULT 1,
  wood_species TEXT NOT NULL,
  grade TEXT NOT NULL,
  wood_length_m NUMERIC(6, 2),
  volume_m3 NUMERIC(12, 4) NOT NULL CHECK (volume_m3 >= 0),
  pieces INTEGER,
  price_per_m3 NUMERIC(15, 2) NOT NULL DEFAULT 0.0,
  subtotal_idr NUMERIC(15, 2) NOT NULL DEFAULT 0.0,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_sortiment_contract_id ON public.contract_sortiment_items(contract_id);
ALTER TABLE public.contract_sortiment_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users on sortiment items" ON public.contract_sortiment_items;
CREATE POLICY "Enable all for authenticated users on sortiment items"
  ON public.contract_sortiment_items FOR ALL USING (true) WITH CHECK (true);

-- Contract receipts (Kwitansi)
CREATE TABLE IF NOT EXISTS public.contract_receipts (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES public.perhutani_contracts(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant' REFERENCES public.tenants(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL,
  receipt_date DATE NOT NULL,
  amount_idr NUMERIC(15, 2) NOT NULL DEFAULT 0.0 CHECK (amount_idr >= 0),
  covered_volume_m3 NUMERIC(12, 4) NOT NULL DEFAULT 0.0 CHECK (covered_volume_m3 >= 0),
  covered_pieces INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_tenant_receipt_number UNIQUE (tenant_id, receipt_number)
);
CREATE INDEX IF NOT EXISTS idx_receipts_contract_id ON public.contract_receipts(contract_id);
ALTER TABLE public.contract_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users on receipts" ON public.contract_receipts;
CREATE POLICY "Enable all for authenticated users on receipts"
  ON public.contract_receipts FOR ALL USING (true) WITH CHECK (true);

-- 5. Nullable Pricing Support for receiving_items & Updated Views
ALTER TABLE public.receiving_items ALTER COLUMN timber_price_per_m3 DROP NOT NULL;
ALTER TABLE public.receiving_items ALTER COLUMN timber_price_per_m3 DROP DEFAULT;
ALTER TABLE public.receiving_items DROP CONSTRAINT IF EXISTS receiving_items_timber_price_per_m3_check;
ALTER TABLE public.receiving_items ADD CONSTRAINT receiving_items_timber_price_per_m3_check
  CHECK (timber_price_per_m3 IS NULL OR timber_price_per_m3 >= 0);

DROP VIEW IF EXISTS public.v_buku_besar_flat CASCADE;
DROP VIEW IF EXISTS public.v_receiving_manifest_summaries CASCADE;
DROP VIEW IF EXISTS public.v_receiving_item_financials CASCADE;

CREATE VIEW public.v_receiving_item_financials AS
SELECT
  i.id AS item_id,
  i.manifest_id,
  i.tenant_id,
  i.item_sequence,
  i.species_id,
  s.common_name AS species_name,
  i.lot_id,
  l.lot_code AS kavling_number,
  y.name AS storage_yard,
  i.wood_length_m,
  i.delivered_pieces,
  i.delivered_volume_m3,
  i.tally_pieces,
  i.tally_volume_m3,
  (i.tally_pieces - i.delivered_pieces) AS piece_discrepancy,
  ROUND((i.tally_volume_m3 - i.delivered_volume_m3)::numeric, 4) AS volume_discrepancy_m3,
  i.timber_price_per_m3,
  CASE WHEN i.timber_price_per_m3 IS NULL THEN NULL
       ELSE ROUND((i.tally_volume_m3 * i.timber_price_per_m3)::numeric, 2) END AS timber_gross_total,
  i.timber_pph_rate,
  CASE WHEN i.timber_price_per_m3 IS NULL THEN NULL
       ELSE ROUND(((i.tally_volume_m3 * i.timber_price_per_m3) * (i.timber_pph_rate / 100.0))::numeric, 2) END AS timber_pph_amount,
  CASE WHEN i.timber_price_per_m3 IS NULL THEN NULL
       ELSE ROUND(((i.tally_volume_m3 * i.timber_price_per_m3) - ((i.tally_volume_m3 * i.timber_price_per_m3) * (i.timber_pph_rate / 100.0)))::numeric, 2) END AS timber_net_payable
FROM public.receiving_items i
JOIN public.wood_species s ON i.species_id = s.id
LEFT JOIN public.storage_lots l ON i.lot_id = l.id
LEFT JOIN public.storage_yards y ON l.yard_id = y.id;

CREATE VIEW public.v_receiving_manifest_summaries AS
SELECT
  m.id AS manifest_id,
  m.tenant_id,
  m.manifest_number,
  m.receipt_date,
  m.doc_date,
  m.truck_plate_number,
  m.forestry_doc_number,
  m.receipt_number,
  m.contract_number,
  m.supplier_id,
  m.broker_id,
  sup.name AS supplier_name,
  COUNT(i.id) AS total_line_items,
  COALESCE(SUM(i.delivered_pieces), 0) AS total_delivered_pieces,
  COALESCE(ROUND(SUM(i.delivered_volume_m3)::numeric, 4), 0.0) AS total_delivered_volume_m3,
  COALESCE(SUM(i.tally_pieces), 0) AS total_tally_pieces,
  COALESCE(ROUND(SUM(i.tally_volume_m3)::numeric, 4), 0.0) AS total_tally_volume_m3,
  CASE WHEN COUNT(CASE WHEN i.timber_price_per_m3 IS NULL THEN 1 END) > 0 THEN NULL
       ELSE COALESCE(SUM(f.timber_gross_total), 0.0) END AS total_timber_gross,
  CASE WHEN COUNT(CASE WHEN i.timber_price_per_m3 IS NULL THEN 1 END) > 0 THEN NULL
       ELSE COALESCE(SUM(f.timber_pph_amount), 0.0) END AS total_timber_pph,
  CASE WHEN COUNT(CASE WHEN i.timber_price_per_m3 IS NULL THEN 1 END) > 0 THEN NULL
       ELSE COALESCE(SUM(f.timber_net_payable), 0.0) END AS total_timber_net,
  m.freight_rate_per_m3,
  ROUND((COALESCE(SUM(i.tally_volume_m3), 0.0) * m.freight_rate_per_m3)::numeric, 2) AS freight_gross_total,
  m.freight_pph_rate,
  ROUND(((COALESCE(SUM(i.tally_volume_m3), 0.0) * m.freight_rate_per_m3) * (m.freight_pph_rate / 100.0))::numeric, 2) AS freight_pph_amount,
  ROUND(((COALESCE(SUM(i.tally_volume_m3), 0.0) * m.freight_rate_per_m3) - ((COALESCE(SUM(i.tally_volume_m3), 0.0) * m.freight_rate_per_m3) * (m.freight_pph_rate / 100.0)))::numeric, 2) AS freight_net_payable,
  m.broker_fee,
  CASE WHEN COUNT(CASE WHEN i.timber_price_per_m3 IS NULL THEN 1 END) > 0 THEN NULL
       ELSE ROUND((COALESCE(SUM(f.timber_net_payable), 0.0) + ((COALESCE(SUM(i.tally_volume_m3), 0.0) * m.freight_rate_per_m3) - ((COALESCE(SUM(i.tally_volume_m3), 0.0) * m.freight_rate_per_m3) * (m.freight_pph_rate / 100.0))) + m.broker_fee)::numeric, 2) END AS grand_net_payable,
  m.payment_status,
  m.invoice_number,
  m.payment_date,
  m.payment_notes,
  m.created_at,
  m.updated_at
FROM public.receiving_manifests m
JOIN public.suppliers sup ON m.supplier_id = sup.id
LEFT JOIN public.receiving_items i ON m.id = i.manifest_id
LEFT JOIN public.v_receiving_item_financials f ON i.id = f.item_id
GROUP BY m.id, sup.name;

CREATE VIEW public.v_buku_besar_flat AS
SELECT
  CASE 
    WHEN (SELECT COUNT(*) FROM public.receiving_items ri WHERE ri.manifest_id = m.id) = 1 
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
    WHEN COALESCE((SELECT SUM(ri.tally_volume_m3) FROM public.receiving_items ri WHERE ri.manifest_id = m.id), 0) > 0 
    THEN ROUND((m.broker_fee * (i.tally_volume_m3 / (SELECT SUM(ri.tally_volume_m3) FROM public.receiving_items ri WHERE ri.manifest_id = m.id)))::numeric, 2)
    WHEN i.item_sequence = 1 THEN m.broker_fee
    ELSE 0.0
  END AS "brokerFee",
  CASE
    WHEN f.timber_net_payable IS NULL THEN NULL
    ELSE ROUND((f.timber_net_payable + ((i.tally_volume_m3 * m.freight_rate_per_m3) - ((i.tally_volume_m3 * m.freight_rate_per_m3) * (m.freight_pph_rate / 100.0))) + CASE 
      WHEN COALESCE((SELECT SUM(ri.tally_volume_m3) FROM public.receiving_items ri WHERE ri.manifest_id = m.id), 0) > 0 
      THEN ROUND((m.broker_fee * (i.tally_volume_m3 / (SELECT SUM(ri.tally_volume_m3) FROM public.receiving_items ri WHERE ri.manifest_id = m.id)))::numeric, 2)
      WHEN i.item_sequence = 1 THEN m.broker_fee
      ELSE 0.0
    END)::numeric, 2)
  END AS "grandNetPayable",
  m.payment_status AS "paymentStatus",
  m.invoice_number AS "invoiceNumber",
  m.payment_date AS "paymentDate",
  m.payment_notes AS "paymentNotes",
  m.created_at AS "createdAt",
  m.updated_at AS "updatedAt"
FROM public.receiving_manifests m
JOIN public.suppliers sup ON m.supplier_id = sup.id
JOIN public.receiving_items i ON m.id = i.manifest_id
JOIN public.v_receiving_item_financials f ON i.id = f.item_id;

-- 6. Payment Forms (Lembar Tagihan)
CREATE TABLE IF NOT EXISTS public.payment_forms (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  preprinted_number TEXT NOT NULL DEFAULT '',
  issue_date DATE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
  wood_species TEXT NOT NULL,
  contract_number TEXT NOT NULL DEFAULT '',
  record_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  item_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount_idr NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
  terbilang TEXT NOT NULL DEFAULT '',
  total_tally_volume_m3 NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
  total_tally_pieces INTEGER NOT NULL DEFAULT 0,
  total_timber_gross_idr NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
  total_timber_pph_idr NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
  total_timber_net_idr NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ISSUED', 'PAID', 'VOID')),
  issued_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  invoice_number TEXT,
  payment_date DATE,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Foreign Key additions to receiving tables
ALTER TABLE public.receiving_manifests
  ADD COLUMN IF NOT EXISTS payment_form_id TEXT REFERENCES public.payment_forms(id) ON DELETE SET NULL;

ALTER TABLE public.receiving_items
  ADD COLUMN IF NOT EXISTS payment_form_id TEXT REFERENCES public.payment_forms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payment_forms_tenant_week ON public.payment_forms(tenant_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_payment_forms_status ON public.payment_forms(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_manifests_payment_form ON public.receiving_manifests(payment_form_id);
CREATE INDEX IF NOT EXISTS idx_items_payment_form ON public.receiving_items(payment_form_id);

ALTER TABLE public.payment_forms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read and write access on payment_forms" ON public.payment_forms;
CREATE POLICY "Allow public read and write access on payment_forms"
  ON public.payment_forms FOR ALL USING (true) WITH CHECK (true);

-- Payment Form Lines
CREATE TABLE IF NOT EXISTS public.payment_form_lines (
  id TEXT PRIMARY KEY,
  payment_form_id TEXT NOT NULL REFERENCES public.payment_forms(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  item_sequence INTEGER NOT NULL DEFAULT 1,
  kategori TEXT NOT NULL DEFAULT '',
  konten TEXT NOT NULL DEFAULT '',
  tujuan TEXT NOT NULL DEFAULT '',
  harga_satuan_idr NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
  jumlah NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
  unit TEXT NOT NULL DEFAULT 'm³' CHECK (unit IN ('m³', 'batang', 'rit', 'lain-lain')),
  total_idr NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
  source_record_id TEXT REFERENCES public.receiving_manifests(id) ON DELETE SET NULL,
  source_item_id TEXT REFERENCES public.receiving_items(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_form_lines_form ON public.payment_form_lines(payment_form_id);
ALTER TABLE public.payment_form_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read and write access on payment_form_lines" ON public.payment_form_lines;
CREATE POLICY "Allow public read and write access on payment_form_lines"
  ON public.payment_form_lines FOR ALL USING (true) WITH CHECK (true);

-- 7. Sawmill Production Records & Stock Sorting
CREATE TABLE IF NOT EXISTS public.sawmill_production_records (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  production_date DATE NOT NULL,
  shift TEXT CHECK (shift IS NULL OR shift IN ('PAGI','SIANG','MALAM')),
  source_storage_yard TEXT NOT NULL,
  source_kavling_number TEXT NOT NULL,
  input_species TEXT NOT NULL,
  input_volume_m3 NUMERIC(12, 4) NOT NULL CHECK (input_volume_m3 > 0),
  input_pieces INTEGER NOT NULL CHECK (input_pieces > 0),
  output_product TEXT NOT NULL,
  output_volume_m3 NUMERIC(12, 4) NOT NULL CHECK (output_volume_m3 >= 0),
  output_pieces INTEGER NOT NULL CHECK (output_pieces >= 0),
  operator_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_production_tenant_date ON public.sawmill_production_records(tenant_id, production_date);
CREATE INDEX IF NOT EXISTS idx_production_source_lot ON public.sawmill_production_records(tenant_id, source_storage_yard, source_kavling_number);
ALTER TABLE public.sawmill_production_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read and write access on sawmill_production_records" ON public.sawmill_production_records;
CREATE POLICY "Allow public read and write access on sawmill_production_records"
  ON public.sawmill_production_records FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.stock_sorting_records (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  sorting_date DATE NOT NULL,
  species TEXT NOT NULL,
  source_storage_yard TEXT NOT NULL,
  source_kavling_number TEXT NOT NULL,
  target_storage_yard TEXT NOT NULL,
  target_kavling_number TEXT NOT NULL,
  volume_m3 NUMERIC(12, 4) NOT NULL CHECK (volume_m3 > 0),
  pieces INTEGER NOT NULL CHECK (pieces > 0),
  reason TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_sorting_distinct_lots CHECK (NOT (source_storage_yard = target_storage_yard AND source_kavling_number = target_kavling_number))
);
CREATE INDEX IF NOT EXISTS idx_sorting_tenant_date ON public.stock_sorting_records(tenant_id, sorting_date);
CREATE INDEX IF NOT EXISTS idx_sorting_source_lot ON public.stock_sorting_records(tenant_id, source_storage_yard, source_kavling_number);
CREATE INDEX IF NOT EXISTS idx_sorting_target_lot ON public.stock_sorting_records(tenant_id, target_storage_yard, target_kavling_number);
ALTER TABLE public.stock_sorting_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read and write access on stock_sorting_records" ON public.stock_sorting_records;
CREATE POLICY "Allow public read and write access on stock_sorting_records"
  ON public.stock_sorting_records FOR ALL USING (true) WITH CHECK (true);

-- 8. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
