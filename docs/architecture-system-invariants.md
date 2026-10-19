# System Architecture & Core Invariants

**System:** Wood & Timber Inventory Management System  
**Repository:** `wood-inventory-management`  
**Architecture Classification:** Lightweight Modular Web Application (Zero-Build-Friction ESM)  
**Date Established:** 2026-10-13  

---

## 1. System Overview & Architectural Invariants

### 1.1 Runtime & Framework Profile
- **Runtime Environment:** Node.js `v26.8.1` with native TypeScript execution and type stripping.
- **Module Format:** ECMAScript Modules (`"type": "module"` in `package.json`).
- **Framework Strategy:** Next.js 15 (App Router) with React 19 and Native ESM Core. Server routes execute with zero-friction native Node.js APIs (`node:sqlite`).
- **Styling Architecture:** Tailwind CSS 3.4 combined with CSS Custom Properties (Design Tokens for timber palettes, dimensional grids, spacing, typography, and dark-mode themes defined in `app/globals.css`).
- **Persistence & Database Strategy:** Optimistic LocalStorage / IndexedDB client state synced via Next.js API Routes to dual-mode backend storage: Supabase PostgREST for production cloud synchronization and Node.js native `node:sqlite` for serverless local persistence.
- **Test Harness:** Node.js native test runner (`node:test` + `node:assert/strict`), executing test suites in under 15ms per run.

### 1.2 Architectural Boundaries & Structural Rules
1. **Single Source of Truth (SSOT):**
   All domain entities, interfaces, enums, and data contracts MUST reside in and be imported from `src/types/index.ts`. No duplicate inline interfaces or ad-hoc types across application modules.
2. **God File Prevention (<250 Lines Limit):**
   No single module or component may exceed 250 lines of code. Coordinator files must delegate domain logic to pure calculators (`src/utils/timber-calc.ts`) and persistence adapters (`src/persistence/storage.ts`).
3. **Stateless Calculators & Pure Helpers:**
   Dimensional conversions (board feet, cubic meters, weight estimates) and SKU formatting are pure, stateless functions with deterministic outcomes and non-negative boundary verification.

---

## 2. Entity & Data Scoping Matrix

To ensure data integrity, tenant isolation, and regulatory traceability in lumber processing, the domain models are split into two distinct tiers: **Global Master Data** and **Tenant-Scoped Operational Work Items**.

| Entity | Scoping Boundary | Storage Layer | Cascade & Lifecycle Rules | SSOT Interface Reference |
| :--- | :--- | :--- | :--- | :--- |
| **`WoodSpecies`** | Global Master Data (Shared across tenants) | System Catalog / Cache | **RESTRICT ON DELETE**. Cannot be deleted if active `WoodItem` instances refer to its species code. | `WoodSpecies` in `src/types/index.ts` |
| **`WarehouseLocation`** | Tenant Scoped (`tenantId`) | Tenant Database / LocalStorage | **SOFT DELETE ONLY**. Contains zones, aisles, and bays. Depleted racks retain historical records. | `WarehouseLocation` in `src/types/index.ts` |
| **`WoodItem`** | Tenant Scoped (`tenantId`) | Primary Storage / IndexedDB | **STATE MACHINE CASCADING**. Status: `IN_STOCK` → `RESERVED` → `DEPLETED`. Never hard deleted if transactions exist. | `WoodItem` in `src/types/index.ts` |
| **`InventoryBatch`** | Tenant Scoped (`tenantId`) | Primary Storage / IndexedDB | **CONSISTENCY LOCK**. `PENDING_INSPECTION` → `ACCEPTED` → `PROCESSED`. Links supplier shipments to discrete items. | `InventoryBatch` in `src/types/index.ts` |
| **`InventoryTransaction`**| Tenant Scoped (`tenantId`) | Append-Only Ledger | **IMMUTABLE LEDGER**. Never modified or deleted. Captures receipt, movement, cycle counts, and scrap write-offs. | `InventoryTransaction` in `src/types/index.ts` |

---

## 3. Persistence Architecture & Offline-First Discipline

```text
┌────────────────────────────────────────────────────────┐
│                   User Interface (UI)                  │
└───────────────────────────┬────────────────────────────┘
                            │ Optimistic Mutation
                            ▼
┌────────────────────────────────────────────────────────┐
│               Client In-Memory Reactive State          │
└─────────────┬────────────────────────────┬─────────────┘
              │ Local Write                │ REST API Call
              ▼                            ▼
┌───────────────────────────┐    ┌───────────────────────────────────┐
│     LocalStorage /        │    │    Next.js API Route Handlers     │
│  IndexedDB Cache Storage  │    │ (/api/records, /api/sales, etc.)  │
└───────────────────────────┘    └─────────────────┬─────────────────┘
                                                   │ Dual-Mode Backend
                                                   ▼
                                 ┌───────────────────────────────────┐
                                 │  Supabase PostgREST / node:sqlite │
                                 └───────────────────────────────────┘
```

### 3.1 Persistence Tier Responsibilities
1. **Optimistic Local Execution:**
   Every user action (e.g., recording inbound lumber, updating moisture levels, recording wood sales) updates reactive client state immediately with instant UI feedback.
2. **Resilient Local Storage Fallback:**
   The `StorageAdapter` pattern (`src/persistence/storage.ts`) wraps `window.localStorage` / `IndexedDB` with an automatic fallback to `MemoryStorageAdapter` for server-side evaluation, automated unit tests, and restricted environments.
3. **Remote Reconciliation & Conflict Resolution:**
   Mutations are queued for synchronization with the Next.js API route handlers. Timestamp-based versioning (`updatedAt`) and transaction sequences prevent race conditions and duplicate volume deductions. Dual-mode server persistence bridges between Supabase cloud PostgreSQL and native `node:sqlite` embedded tables.

---

## 4. Test Execution Loop & Zero-Delay Baseline

- **Test Command:** `node --test`
- **Targeted Single-File Command:** `node --test <path-to-test-file>`
- **Observed Execution Time:** ~180 ms total process execution (<12 ms test suite execution).
- **Invariants Verification:** All pull requests, automated agents, and refactoring tasks must execute tests and confirm `0 failures` before asserting task completion.
