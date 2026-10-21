# ADR-0001: Dual-Mode Persistence (SQLite Local + Supabase Cloud)

**Date:** 2026-10-18 (retrospectively documented 2026-10-21)
**Status:** Accepted
**Deciders:** Owner + AI pair session

---

## Context

The system must function in two very different operational contexts:

1. **Yard operations** often happen in locations with intermittent or no internet connectivity (log yards in remote forestry areas).
2. **Finance and management** access the system from offices with reliable connections and expect multi-user data sharing.

Pure cloud-only persistence would make yard operations impossible during outages. Pure local-only would prevent multi-user coordination.

Node.js 22+ ships with native `node:sqlite`, eliminating the need for external SQLite dependencies.

---

## Decision

Implement **dual-mode persistence**:

- **Local tier:** `node:sqlite` (server-side) + `IndexedDB`/`LocalStorage` (browser) for offline-first client state.
- **Cloud tier:** Supabase PostgREST for multi-user shared state.
- **Sync model:** Optimistic client-side writes propagate to cloud via Next.js API routes in the background.

```ts
// Persistence facade pattern
interface RecordStore {
  list(filter: FilterCriteria): Promise<WoodReceivingRecord[]>;
  create(input: CreateInput): Promise<WoodReceivingRecord>;
  update(id: string, patch: UpdatePatch): Promise<WoodReceivingRecord>;
  delete(id: string): Promise<void>;
}

// Two implementations:
// - src/persistence/sqlite/record-queries.ts
// - src/persistence/supabase/supabase-record-store.ts
```

---

## Rejected Alternatives

### Alternative A: Supabase-only (cloud-first)
**Rejected because:** Yard operations lose all functionality during connection outages. Operators cannot record truck arrivals or tally measurements, which is unacceptable for the primary business workflow.

### Alternative B: SQLite-only (local-first, single machine)
**Rejected because:** Multi-user access requires sharing files or running a local server everyone connects to. Does not scale beyond single-location operations. No real-time collaboration.

### Alternative C: PouchDB / CouchDB with sync
**Rejected because:** Adds non-trivial dependency surface, replication semantics are complex, and conflict resolution semantics do not match the project's append-only ledger model. Supabase already provides the cloud tier we need; `node:sqlite` is standard-library for the local tier.

### Alternative D: IndexedDB + custom sync protocol
**Rejected because:** Reinventing synchronization. Supabase's PostgREST + optimistic client state is simpler and uses off-the-shelf standards.

---

## Consequences

### Positive
- Yard operators can work fully offline; sync happens when connectivity returns.
- Zero external dependencies for local tier (`node:sqlite` is Node.js stdlib).
- Supabase handles auth, RLS, and multi-user coordination out of the box.
- Clear separation of concerns via `RecordStore` facade — swapping persistence backends is localized.

### Negative / Trade-offs
- Must maintain two schema definitions in parallel (SQLite DDL + Supabase SQL migrations).
- Conflict resolution logic must handle timestamp-based reconciliation.
- Developers must be aware that failures in cloud sync should not block local operations.
- Tests must cover both persistence paths OR rely on a shared abstraction tested at the facade layer.

### Follow-up Obligations
- Any new entity (contracts, brokers, payment forms, etc.) MUST implement both SQLite and Supabase stores.
- Migration files MUST be created in both `src/persistence/sqlite/migrations.ts` AND `supabase/migrations/*.sql`.
- Field name / type changes must be mirrored across both.

---

## References

- Spec: `docs/superpowers/specs/2026-10-18-relational-database-architecture-design.md`
- Spec: `docs/superpowers/specs/2026-10-19-supabase-persistence-architecture-design.md`
- Architecture: `docs/architecture-system-invariants.md` Section 3
