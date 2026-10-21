# Design Spec: Relational Database Migration (Retrospective)

**Document:** `docs/superpowers/specs/2026-10-18-relational-database-migration-design.md`
**Date:** 2026-10-18 (retrospectively documented 2026-10-21)
**Status:** Shipped — Retrospectively Documented
**Related Plan:** `docs/superpowers/plans/2026-10-18-relational-database-migration.md`

> **Note on Retrospective Specs:** This spec was created after implementation to satisfy the Spec-Plan pairing invariant. Design detail lives in the paired plan file.

---

## 1. Executive Summary

Migrated the server-side persistence from flat JSON file storage to Node.js native `node:sqlite` relational database with proper schema, foreign keys, indices, and SQL views for computed fields.

## 2. Decision Captured

- Backend: `node:sqlite` (Node.js 22+ stdlib, zero external dependency).
- Schema versioning via idempotent `CREATE TABLE IF NOT EXISTS` migrations in `src/persistence/sqlite/migrations.ts`.
- JSON-to-SQLite migration helper (`migrate-json.ts`) for existing deployments.
- Computed fields exposed via SQL views (`receiving_items_calc_view`) rather than denormalized columns — single source of calculation truth.
- Tenant scoping enforced at row level via `tenant_id` column + ON DELETE CASCADE.

## 3. Shipped Artifacts

- `src/persistence/sqlite/migrations.ts` — full DDL
- `src/persistence/sqlite/views-ddl.ts` — computed field views
- `src/persistence/sqlite/migrate-json.ts` — one-time JSON → SQLite migration
- `src/persistence/sqlite/record-queries.ts` — parameterized query layer
- `src/persistence/sqlite/activity-queries.ts` — audit log + settings
- `scripts/seed-db.ts` — seeding script

## 4. References

- Plan: `docs/superpowers/plans/2026-10-18-relational-database-migration.md`
- Related spec: `docs/superpowers/specs/2026-10-18-relational-database-architecture-design.md`
- ADR-0001 (Dual-mode persistence)
