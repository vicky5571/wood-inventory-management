# Design Spec: Safe Search Haystack Expansion (Retrospective)

**Document:** `docs/superpowers/specs/2026-10-17-safe-search-haystack-expansion-design.md`
**Date:** 2026-10-17 (retrospectively documented 2026-10-21)
**Status:** Shipped — Retrospectively Documented
**Related Plan:** `docs/superpowers/plans/2026-10-17-safe-search-haystack-expansion.md`

> **Note on Retrospective Specs:** This spec was created after implementation to satisfy the Spec-Plan pairing invariant. Design detail lives in the paired plan file.

---

## 1. Executive Summary

Expanded the ledger search haystack to safely cover additional fields (invoice numbers, contract numbers, forestry doc numbers, receipt numbers, supplier names) with null-safe field access and false-positive guards.

## 2. Decision Captured

- Search is substring match, case-insensitive, applied across multiple fields.
- Field access guards against `undefined`/`null` via `fieldContains()` helper.
- Date fields excluded from text search to prevent false matches (e.g. "10" matching all October dates).
- Centralized search logic in `src/utils/record-search.ts` to avoid duplication across UI and API layers.

## 3. Shipped Artifacts

- `src/utils/record-search.ts` — fieldContains, matchesRecord functions
- Integration points: ledger toolbar, API query handlers (SQLite + Supabase)
- `src/persistence/in-memory-pagination.ts` — in-memory fallback uses same search logic

## 4. References

- Plan: `docs/superpowers/plans/2026-10-17-safe-search-haystack-expansion.md`
