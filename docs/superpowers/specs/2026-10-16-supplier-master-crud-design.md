# Design Spec: Supplier Master CRUD & Scorecard (Retrospective)

**Document:** `docs/superpowers/specs/2026-10-16-supplier-master-crud-design.md`
**Date:** 2026-10-16 (retrospectively documented 2026-10-21)
**Status:** Shipped — Retrospectively Documented
**Related Plan:** `docs/superpowers/plans/2026-10-16-supplier-master-crud.md`

> **Note on Retrospective Specs:** This spec was created after implementation to satisfy the Spec-Plan pairing invariant. Design detail lives in the paired plan file.

---

## 1. Executive Summary

Introduced `Supplier` entity as tenant-scoped master data with full CRUD operations and dynamic scorecard metrics (delivery volume, discrepancy rate, status rating) derived from receiving records.

## 2. Decision Captured

- `Supplier` interface in SSOT (`src/types/index.ts:L573-585`).
- `SupplierWithMetrics` extends base entity with derived scorecard fields.
- Status derivation: OPTIMAL / ACCEPTABLE / ATTENTION based on discrepancy rate thresholds.
- Soft-delete via `status: 'INACTIVE'` (preserves historical scorecard integrity).
- Free-text `supplierName` on records continues to work alongside structured `Supplier` entity (loose coupling pattern — same philosophy later formalized in ADR-0003 for contracts).

## 3. Shipped Artifacts

- `src/types/index.ts` — Supplier, SupplierFilterCriteria, SupplierWithMetrics, SupplierStats types
- `src/utils/supplier-metrics.ts` — scorecard aggregation
- `src/hooks/useSuppliers.ts` — optimistic local-first hook
- `src/components/suppliers/` — SupplierCard, SupplierTable, SupplierModal, SupplierStatsGrid
- `src/components/ledger/SupplierCombobox.tsx` — autocomplete combobox for receiving form
- `app/suppliers/page.tsx` — directory view
- `app/api/suppliers/` — CRUD endpoints
- Nav entry: "Pemasok" / 供应商

## 4. References

- Plan: `docs/superpowers/plans/2026-10-16-supplier-master-crud.md`
- Related: ADR-0004 (Broker as separate entity, structurally mirrored from Supplier)
