-- 20261021000004_payment_forms.sql
-- Weekly Payment Form (Sabtu-Jumat AP Batches Grouped per Supplier x Species x Contract)

CREATE TABLE IF NOT EXISTS payment_forms (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  form_number TEXT NOT NULL,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  wood_species TEXT NOT NULL,
  contract_number TEXT NOT NULL DEFAULT '',
  record_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  item_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_payment_forms_tenant_number UNIQUE (tenant_id, form_number)
);

-- Foreign Key additions to receiving tables
ALTER TABLE receiving_manifests
  ADD COLUMN IF NOT EXISTS payment_form_id TEXT REFERENCES payment_forms(id) ON DELETE SET NULL;

ALTER TABLE receiving_items
  ADD COLUMN IF NOT EXISTS payment_form_id TEXT REFERENCES payment_forms(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_forms_tenant_week ON payment_forms(tenant_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_payment_forms_status ON payment_forms(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_manifests_payment_form ON receiving_manifests(payment_form_id);
CREATE INDEX IF NOT EXISTS idx_items_payment_form ON receiving_items(payment_form_id);

-- Enable RLS
ALTER TABLE payment_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read and write access on payment_forms" ON payment_forms
  FOR ALL USING (true) WITH CHECK (true);
