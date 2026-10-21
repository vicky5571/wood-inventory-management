-- 20261021000005_production_sorting.sql
-- Sawmill Production Records & Stock Sorting Redistribution Records

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
