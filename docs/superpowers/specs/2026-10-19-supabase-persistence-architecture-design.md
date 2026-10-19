# Supabase Persistence Architecture Specification

- **Date:** 2026-10-19
- **Status:** Approved
- **Subsystem:** Server Persistence & Cloud Synchronization Bridge
- **Authors:** Senior Software Engineer (Pair Programmer)

---

## 1. Problem Statement & Root Cause

The web application deployed to Vercel allows users to input receiving and sales records, but data does not appear in Supabase tables (`receiving_items`, `receiving_manifests`, `sales_records`).

### Diagnostic Analysis
1. The schema migration (`supabase/migrations/20261019000000_init_wood_inventory.sql`) was applied in Supabase, successfully establishing the 8 relational tables and 3 calculation views.
2. However, the application API routes (`/api/records`, `/api/sales`, `/api/storage-locations`) are hard-coded to local SQLite (`src/persistence/server-record-store.ts` and `src/persistence/sales-store.ts`).
3. Inputs on the website write exclusively to `/tmp/wood_inventory.db` on the Vercel serverless container and to `localStorage` in the user's browser. No HTTP requests are dispatched to Supabase.
4. Master data (`tenants`, `wood_species`, `storage_yards`, `storage_lots`, `suppliers`) has not been seeded in Supabase, meaning foreign key constraints would fail if child records were inserted without parent entities.

---

## 2. Architectural Objectives

1. **Direct Supabase Cloud Persistence**:
   When `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are present, server route handlers MUST read from and write directly to Supabase.
2. **Resilient Local Fallback**:
   If Supabase credentials are not configured or if the cloud API is unreachable, the system must seamlessly fall back to local `SqliteRecordStore` (`data/wood_inventory.db` or `/tmp/wood_inventory.db`) and in-memory storage.
3. **Zero-Dependency Native PostgREST Client**:
   In strict adherence to `AGENTS.md` ("Standard library and native platform features precede new dependencies"), implement the Supabase communication layer using native Node.js 26 `fetch` targeting the PostgREST REST API. Avoid adding `@supabase/supabase-js` or other third-party dependencies to preserve zero-overhead cold starts.
4. **Automated Seeding Engine**:
   Provide a deterministic script (`scripts/seed-supabase.ts` / `npm run db:seed:supabase`) that validates master entities and seeds canonical data into Supabase idempotently.

---

## 3. Data Mapping & Schema Contracts

### Inbound Receiving Flow
- **Parent Manifest (`receiving_manifests`)**:
  `id`, `tenant_id` (`default-tenant`), `manifest_number`, `receipt_date`, `doc_date`, `truck_plate_number`, `forestry_doc_number`, `receipt_number`, `contract_number`, `supplier_id`, `freight_rate_per_m3`, `freight_pph_rate`, `broker_fee`, `payment_status`, `invoice_number`, `payment_date`, `payment_notes`.
- **Line Items (`receiving_items`)**:
  `id`, `manifest_id`, `tenant_id`, `item_sequence`, `species_id`, `lot_id`, `wood_length_m`, `delivered_pieces`, `delivered_volume_m3`, `tally_pieces`, `tally_volume_m3`, `timber_price_per_m3`, `timber_pph_rate`, `notes`.
- **Query Projection**:
  Reads originate from `v_buku_besar_flat` via `GET /rest/v1/v_buku_besar_flat?select=*&order=receiptDate.desc,id.asc`, returning the exact `WoodReceivingRecord` shape expected by frontend components.

### Outbound Sales Flow
- **Sales Table (`sales_records`)**:
  `id`, `sale_date`, `delivery_order_number`, `truck_plate_number`, `driver_name`, `customer_name`, `storage_yard`, `kavling_number`, `wood_species`, `pieces`, `volume_m3`, `price_per_m3`, `total_price`, `payment_status`, `invoice_number`, `notes`.
- **Query Projection**:
  Reads originate from `sales_records` via `GET /rest/v1/sales_records?select=*&order=sale_date.desc,created_at.desc`, mapped cleanly to `WoodSalesRecord`.

---

## 4. Subsystem Architecture

```
[ Frontend: React / Next.js Client ]
             │
             ▼
[ Next.js API Route Handlers: /api/records, /api/sales, /api/storage-locations ]
             │
             ├── If SUPABASE_URL & SUPABASE_KEY configured:
             │    ▼
             │   [ SupabaseRecordStore / SupabaseSalesStore ]
             │    │ (Native fetch HTTP client)
             │    ▼
             │   [ Supabase Cloud: PostgREST API (PostgreSQL) ]
             │
             └── Fallback (Offline / Tests / Unconfigured):
                  ▼
                 [ SqliteRecordStore / FileRecordStore ]
                  ▼
                 [ Local SQLite: data/wood_inventory.db or /tmp ]
```

---

## 5. Security & Invariant Rules

1. **Authentication Scoping**: `SUPABASE_SERVICE_ROLE_KEY` is restricted to server-side route handlers. Never expose the service role key to the browser client or in client-side bundles.
2. **Idempotent Master Seeding**: Species, suppliers, yards, and lots must resolve dynamically by code/name so foreign key references do not violate database constraints.
3. **Non-Breaking Existing Tests**: All 501 existing tests using SQLite / mock adapters must continue to pass with 0 regressions.
