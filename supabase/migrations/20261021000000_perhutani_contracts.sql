-- ==============================================================================
-- Migration: 20261021000000_perhutani_contracts.sql
-- Description: Perhutani procurement contracts, sortimen line items, and kwitansi receipts.
-- ==============================================================================

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

-- RLS
ALTER TABLE public.perhutani_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_sortiment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users on contracts"
ON public.perhutani_contracts FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users on sortiment items"
ON public.contract_sortiment_items FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users on receipts"
ON public.contract_receipts FOR ALL USING (true) WITH CHECK (true);
