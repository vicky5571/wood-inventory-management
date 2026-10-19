# Supabase Database Migration & Seeder

This directory contains the PostgreSQL schema migration and canonical seed dataset for the **Wood & Timber Inventory Management System**.

---

## Files

1. **`supabase/migrations/20261019000000_init_wood_inventory.sql`**
   - **8 Relational Tables**: `tenants`, `wood_species`, `storage_yards`, `storage_lots`, `suppliers`, `receiving_manifests`, `receiving_items`, `sales_records`.
   - **3 Analytical Views**:
     - `v_receiving_item_financials`: Tally line items with volume discrepancies, timber gross, PPh 22 tax deductions, and net payables.
     - `v_receiving_manifest_summaries`: Aggregated inbound shipments, total volumes, freight net, broker fees, and grand net payables.
     - `v_buku_besar_flat`: Flattened multi-item ledger view matching the frontend table contract.
   - **Row Level Security (RLS)**: Enabled on all tables with permissive read/write policies for `anon` and `authenticated` roles.

2. **`supabase/seed.sql`**
   - **Idempotent Seeder**: Safe to execute repeatedly (`ON CONFLICT` resolution).
   - Populates:
     - 1 Workspace Tenant (`default-tenant`)
     - 13 Curated Timber Species (Teak, Merbau, Bengkirai, Kamper, Mahoni, Sengon, Sonokeling, Ulin, Pinus, Meranti, Keruing, Kapur, Kayu Karet)
     - 4 Storage Yards (`TPK-Timur`, `TPK-Utara`, `TPK-Barat`, `TPK-Selatan`)
     - Storage Lots (`KAV-01` through `KAV-08`, etc.)
     - 4 Registered Suppliers (`PT Wana Lestari Abadi`, `CV Papua Rimba Sejahtera`, `PT Kayu Makmur Nusantara`, `Koperasi Hutan Lestari`)
     - 4 Inbound Manifests & Tally Breakdown Line Items (`rec-2026-10-01` to `rec-2026-10-04`)
     - 5 Outbound Sales Records (`sls-2026-10-04` to `sls-2026-10-15`)

---

## How to Apply

### Method 1: Supabase Web Dashboard (SQL Editor)
1. Open your project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** in the left sidebar.
3. Paste the contents of `supabase/migrations/20261019000000_init_wood_inventory.sql` and click **Run**.
4. Paste the contents of `supabase/seed.sql` and click **Run**.

### Method 2: Supabase CLI (Local Development)
If using the Supabase CLI:
```bash
# Start local Supabase container
supabase start

# Reset and seed database automatically
supabase db reset
```
`supabase db reset` will automatically execute all migrations in `supabase/migrations/` followed by `supabase/seed.sql`.
