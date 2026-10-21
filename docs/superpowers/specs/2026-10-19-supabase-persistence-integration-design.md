# Design Spec: Supabase Persistence Integration (Retrospective)

**Document:** `docs/superpowers/specs/2026-10-19-supabase-persistence-integration-design.md`
**Date:** 2026-10-19 (retrospectively documented 2026-10-21)
**Status:** Shipped — Retrospectively Documented
**Related Plan:** `docs/superpowers/plans/2026-10-19-supabase-persistence-integration.md`

> **Note on Retrospective Specs:** This spec was created after implementation to satisfy the Spec-Plan pairing invariant. Design detail lives in the paired plan file.

---

## 1. Executive Summary

Integrated Supabase (PostgreSQL + PostgREST) as the cloud-tier persistence backend, running in parallel with the local SQLite tier for multi-user access and remote sync. Zero-dependency implementation — direct HTTPS calls to PostgREST API without the Supabase JS SDK.

## 2. Decision Captured

- **Zero npm dependency** — direct `fetch()` calls to Supabase PostgREST endpoints.
- Dual-mode persistence pattern (see ADR-0001): local SQLite + remote Supabase, selected via environment variable `WIM_PERSISTENCE_MODE`.
- Store adapter pattern — SQLite and Supabase stores implement the same interface, enabling easy swapping.
- Supabase migrations in `supabase/migrations/*.sql` mirror SQLite DDL.
- RLS (Row-Level Security) policies enabled on all tables with `tenant_id` scoping.

## 3. Shipped Artifacts

- `src/persistence/supabase/` — supabase-client.ts, supabase-record-store.ts, supabase-supplier-store.ts, master-data-supabase.ts, supabase-storage-locations-store.ts
- `supabase/migrations/*.sql` — parallel schema migrations
- `scripts/seed-supabase.ts` — seed script
- `.env.example` with required Supabase credentials

## 4. References

- Plan: `docs/superpowers/plans/2026-10-19-supabase-persistence-integration.md`
- Related: `docs/superpowers/specs/2026-10-19-supabase-persistence-architecture-design.md`
- ADR-0001 (Dual-mode persistence rationale)
