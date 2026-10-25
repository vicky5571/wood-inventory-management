-- Migration: Add brokers master table and link receiving_manifests
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

ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read and write access on brokers"
  ON public.brokers FOR ALL USING (true) WITH CHECK (true);
