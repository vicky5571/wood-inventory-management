# Design Spec: Sales Analytics on Ringkasan (Retrospective)

**Document:** `docs/superpowers/specs/2026-10-18-sales-analytics-ringkasan-design.md`
**Date:** 2026-10-18 (retrospectively documented 2026-10-21)
**Status:** Shipped — Retrospectively Documented
**Related Plan:** `docs/superpowers/plans/2026-10-18-sales-analytics-ringkasan.md`

> **Note on Retrospective Specs:** This spec was created after implementation to satisfy the Spec-Plan pairing invariant. Design detail lives in the paired plan file.

---

## 1. Executive Summary

Added executive sales insights and timber inventory flow analysis charts to the Ringkasan (运营概况) dashboard — customer sales ranking, inventory flow (inbound vs outbound over time), and financial outlay breakdown.

## 2. Decision Captured

- Charting library: **Chart.js 4** (versus Recharts/D3) — single CDN-free dependency with good tree-shaking.
- Chart data computation isolated in `src/components/analytics/*-chart-helpers.ts` modules.
- Charts implement in-place updates to avoid re-render performance issues (later refined in `2026-10-20-chart-rerender-optimization-design.md`).
- Options A (customer sales) and B (inventory flow) shipped together as a cohesive dashboard section.

## 3. Shipped Artifacts

- `src/components/analytics/` — chart-helpers.ts, sales-chart-helpers.ts, CustomerSalesChart, InventoryFlowChart, SupplierRankingChart, VolumeTrendChart, SpeciesDonutChart, FinancialOutlayBreakdown
- Dashboard integration in `app/page.tsx` (Ringkasan)

## 4. References

- Plan: `docs/superpowers/plans/2026-10-18-sales-analytics-ringkasan.md`
- Superseded (performance): `docs/superpowers/specs/2026-10-20-chart-rerender-optimization-design.md`
