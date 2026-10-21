# Design Spec: Business Foundation & Financial Operations (Retrospective)

**Document:** `docs/superpowers/specs/2026-10-17-business-foundation-and-financial-operations-design.md`
**Date:** 2026-10-17 (retrospectively documented 2026-10-21)
**Status:** Shipped — Retrospectively Documented
**Related Plan:** `docs/superpowers/plans/2026-10-17-business-foundation-and-financial-operations.md`

> **Note on Retrospective Specs:** This spec was created after implementation to satisfy the Spec-Plan pairing invariant. Design detail lives in the paired plan file.

---

## 1. Executive Summary

Established core financial calculation primitives for timber receiving records: timber payment with PPh tax, freight payment, broker fee, discrepancy classification, and aggregate dashboard metrics.

## 2. Decision Captured

- All financial calculations are **pure stateless functions** in `src/utils/timber-calc.ts`.
- Volume stored canonical in cubic meters (m³); conversion helpers for board feet when needed.
- PPh (Indonesian withholding tax) rates applied per record; defaults in `AppSettings`.
- Discrepancy classification: `match` / `surplus` / `shortage` based on tally vs delivered (later evolved to 4-level severity in Spec `discrepancy-alarm-design`).
- Dashboard metrics aggregated via single-pass O(n) reduce.

## 3. Shipped Artifacts

- `src/utils/timber-calc.ts` — calculateTimberPayment, calculateFreightPayment, computeRecordCalculations, aggregateDashboardMetrics, classifyDiscrepancy, calculateCubicFromCentimeters, calculateRoundLogVolumeM3
- `src/types/index.ts` — PaymentCalculationResult, RecordCalculationInput/Output, DashboardMetrics
- `test/timber-calc.test.ts` — comprehensive pure logic coverage
- `AppSettings` fields: defaultTimberPphRate, defaultFreightPphRate, defaultBrokerFee, acceptableDiscrepancyThresholdPct

## 4. References

- Plan: `docs/superpowers/plans/2026-10-17-business-foundation-and-financial-operations.md`
- Superseded (partially): Discrepancy severity model later evolved in `2026-10-21-discrepancy-alarm-design.md`
