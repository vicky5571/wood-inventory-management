# Design Spec: Multi-Page Dashboard Expansion (Retrospective)

**Document:** `docs/superpowers/specs/2026-10-16-multi-page-dashboard-expansion-design.md`
**Date:** 2026-10-16 (retrospectively documented 2026-10-21)
**Status:** Shipped — Retrospectively Documented
**Related Plan:** `docs/superpowers/plans/2026-10-16-multi-page-dashboard-expansion.md`

> **Note on Retrospective Specs:** This spec was created after implementation to satisfy the Spec-Plan pairing invariant. Design detail lives in the paired plan file.

---

## 1. Executive Summary

Expanded single-page dashboard into multi-route architecture: separate routes for Ringkasan (analytics), Buku Besar (ledger), Suppliers, Activity, Settings — each a focused coordinator rather than a monolithic view.

## 2. Decision Captured

- Route separation enforces Strangler Pattern (each page coordinator stays <250 LOC).
- Shared layout via `AppLayout.tsx` + `Sidebar.tsx` + `Navbar.tsx`.
- KPI widgets (`KpiCards.tsx`) composable across pages.
- Chart.js adopted for Ringkasan analytics (volume trends, species breakdown, supplier ranking).

## 3. Shipped Artifacts

- `app/page.tsx` (Ringkasan)
- `app/ledger/page.tsx` (Buku Besar)
- `app/suppliers/page.tsx` (Pemasok)
- `app/activity/page.tsx` (Aktivitas)
- `app/settings/page.tsx` (Pengaturan)
- `src/components/analytics/` chart modules
- `src/components/dashboard/KpiCards.tsx`

## 4. References

- Plan: `docs/superpowers/plans/2026-10-16-multi-page-dashboard-expansion.md`
