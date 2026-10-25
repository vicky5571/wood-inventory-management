-- 20261022000000_lembar_tagihan_refactor.sql
-- Refactor Payment Form to Lembar Tagihan (Physical Form Alignment)

-- AppSettings company_name addition
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS company_name TEXT NOT NULL DEFAULT 'PT. BRILLIANT JAYA WOOD INDUSTRY';

-- Payment forms columns update
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_forms' AND column_name = 'form_number'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_forms' AND column_name = 'preprinted_number'
  ) THEN
    ALTER TABLE payment_forms RENAME COLUMN form_number TO preprinted_number;
  END IF;
END $$;

ALTER TABLE payment_forms
  ADD COLUMN IF NOT EXISTS preprinted_number TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS issue_date DATE,
  ADD COLUMN IF NOT EXISTS terbilang TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS total_amount_idr NUMERIC(16, 2) NOT NULL DEFAULT 0.00;

-- Drop obsolete unique constraint on form_number if present
ALTER TABLE payment_forms
  DROP CONSTRAINT IF EXISTS uq_payment_forms_tenant_number;

-- Lines table for 6-column physical form representation
CREATE TABLE IF NOT EXISTS payment_form_lines (
  id TEXT PRIMARY KEY,
  payment_form_id TEXT NOT NULL REFERENCES payment_forms(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_sequence INTEGER NOT NULL DEFAULT 1,
  kategori TEXT NOT NULL DEFAULT '',
  konten TEXT NOT NULL DEFAULT '',
  tujuan TEXT NOT NULL DEFAULT '',
  harga_satuan_idr NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
  jumlah NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
  unit TEXT NOT NULL DEFAULT 'm³' CHECK (unit IN ('m³', 'batang', 'rit', 'lain-lain')),
  total_idr NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
  source_record_id TEXT REFERENCES receiving_manifests(id) ON DELETE SET NULL,
  source_item_id TEXT REFERENCES receiving_items(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_form_lines_form ON payment_form_lines(payment_form_id);

ALTER TABLE payment_form_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read and write access on payment_form_lines" ON payment_form_lines
  FOR ALL USING (true) WITH CHECK (true);
