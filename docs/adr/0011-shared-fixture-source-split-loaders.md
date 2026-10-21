# ADR-0011: Shared Fixture Source with Backend-Specific Loaders

**Date:** 2026-10-22
**Status:** Accepted
**Deciders:** Owner + AI pair session

---

## Context

Project uses dual-mode persistence (ADR-0001): SQLite local + Supabase cloud. Both backends need seed data for development, demo, and testing.

Three architectural options for seeder design:

- **A) Single unified seeder, backend auto-detected** — one script, one target
- **B) Shared fixture data, split loaders per backend** — one source of fixtures, two loaders
- **C) Fully independent seeders per backend** — current state, with duplicated data

Current state (option C) causes:
- `scripts/seed-supabase.ts` defines its own `SEED_SPECIES`, `SEED_YARDS`, `SEED_LOTS` arrays
- `src/persistence/seed-data.ts` defines separate `SEED_WOOD_RECORDS`, `SEED_SUPPLIERS`
- Risk of divergence: SQLite seeder references different supplier IDs than Supabase seeder
- Adding a new entity requires updating fixtures in both places

7 new feature modules shipped recently (contracts, payment forms, pending pricing, production, sorting, brokers, discrepancy alarm) — none have seed data yet. Doubling the work by duplicating across both seeders is unacceptable.

---

## Decision

**Adopt Option B: shared fixture source with backend-specific loaders.**

- All fixture data lives in `src/persistence/seed/` as pure TypeScript constants.
- Two loader scripts (`scripts/seed-db.ts` for SQLite, `scripts/seed-supabase.ts` for Supabase) import the same fixtures but implement upsert logic specific to each backend's API.
- Fixture validation (`validateFixtureConsistency()`) runs in both loaders before any write — single source of correctness.

```
src/persistence/seed/           ← Fixture definitions (shared)
├── fixtures.ts                 ← Barrel export
├── fixtures-master-data.ts
├── fixtures-contracts.ts
├── fixtures-receiving.ts
├── fixtures-sales.ts
├── fixtures-production.ts
├── fixtures-payment-forms.ts
└── fixtures-helpers.ts         ← Shared validation + utilities

scripts/
├── seed-db.ts                  ← SQLite loader
└── seed-supabase.ts            ← Supabase loader
```

Both loaders consume the same fixtures but differ in:
- Write mechanism (SQLite prepared statements vs PostgREST HTTP)
- Idempotency implementation (`ON CONFLICT DO UPDATE` vs `Prefer: resolution=merge-duplicates`)
- Transaction boundaries (SQLite `db.transaction()` vs sequential HTTP calls)
- Error handling (SQLite throws synchronously vs HTTP error response parsing)

---

## Rejected Alternatives

### Alternative A: Single unified seeder with backend auto-detection
**Rejected because:**
- Backend selection via env var creates runtime branching inside loader logic, obscuring both paths.
- Testing requires mocking backend selection — adds complexity.
- The write mechanisms are fundamentally different (sync SQL vs async HTTP) — unifying them creates lowest-common-denominator API that fits neither well.
- Developers running `npm run db:seed` expect SQLite; `npm run db:seed:supabase` expects Supabase. Explicit intent via separate scripts is clearer.

### Alternative C: Fully independent seeders (current state)
**Rejected because:**
- Current pain point. Duplication causes divergence.
- Adding entities requires parallel edits in 2 places.
- No single-source validation possible.

### Alternative D: Database-agnostic ORM-based seeder
**Rejected because:**
- Project explicitly avoids ORMs (zero external dependencies for data layer — see ADR-0001).
- Introducing an ORM for seeding alone would violate the dependency principle.
- Native SQLite / PostgREST APIs are stable and adequate.

### Alternative E: Fixtures as JSON files, loaders as parsers
**Rejected because:**
- Loses TypeScript type safety on fixture data (JSON parsing to typed objects requires validation layer anyway).
- Harder to maintain FK references (JSON strings vs TS string literals with autocomplete).
- Comments impossible in strict JSON (JSONC not standard).
- TypeScript constants give compile-time FK validation via string literal types where applicable.

---

## Consequences

### Positive
- **Single source of truth** for fixture data — change supplier name once, both seeders reflect it.
- **Type-safe fixtures** — `SEED_SUPPLIERS: Supplier[]` enforces SSOT type constraints.
- **FK validation runs once** — `validateFixtureConsistency()` guards both backends.
- **Clear separation of concerns** — fixtures (what) vs loaders (how).
- **Minimal duplication** — only backend-specific upsert logic differs.
- **Easy to extend** — new entity: add fixture file + add loader call in each script.
- **Testable fixtures** — fixture validation has dedicated test suite (`test/seed-fixtures.test.ts`).

### Negative / Trade-offs
- **Loaders still need to maintain parallel upsert order** — SQLite and Supabase loaders both encode the FK dependency order. If order changes (e.g., new table dependency), both scripts update.
  - Mitigation: Order is documented in spec Section 3.3 as single source.
- **Fixture files large** — hand-crafted 130+ records produce ~1,500+ LOC fixture code.
  - Mitigation: Split by entity domain (7 files, each ~200-400 LOC) for maintainability. All under 500 LOC each.
- **No partial seeding** — both loaders always process all fixtures.
  - Mitigation: Idempotent upsert means reruns are cheap; selective seeding adds CLI complexity not justified by current needs.
- **Supabase 2-pass logic duplicated from SQLite** — payment form circular FK requires same 2-pass pattern in both loaders.
  - Mitigation: Pattern documented. If it proliferates, extract shared `upsert2Pass()` utility.

### Follow-up Obligations
- **Any new entity type requires fixture addition** to appropriate `fixtures-*.ts` file.
- **Any new entity type requires loader call addition** in both `seed-db.ts` and `seed-supabase.ts`.
- **Validation function must grow** with each new entity type to check its FK references.
- **If 3rd backend introduced** (unlikely but possible), create new loader script consuming same fixtures. Fixtures layer unchanged.

---

## References

- Spec: `docs/superpowers/specs/2026-10-22-database-seeder-rewrite-design.md`
- Plan: `docs/superpowers/plans/2026-10-22-database-seeder-rewrite.md`
- Related:
  - ADR-0001 (Dual-mode persistence — the parent architecture this ADR complements)
  - All entity type specs (fixture data must conform to shipped entity schemas)
