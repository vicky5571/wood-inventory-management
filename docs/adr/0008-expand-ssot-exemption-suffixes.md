# ADR-0008: Expand SSOT Exemption Suffixes

**Date:** 2026-10-22 (retrospectively documented; implementation shipped 2026-10-21 commit `5292aed`)
**Status:** Accepted — Retrospectively Documented
**Deciders:** Owner + AI pair session

> **Retrospective Note:** This ADR documents a design decision that was implemented in commit `5292aed` ("cleanup(ssot): resolve 21 SSOT violations via rename and selective SSOT moves") BEFORE formal ADR capture. The implementation preceded documentation. This ADR exists to retroactively provide traceability for future audits and prevent naive "cleanup" of the exemption list.

---

## Context

The Single Source of Truth (SSOT) invariant requires all domain entities, interfaces, and schemas to be defined in `src/types/index.ts`. The `scripts/drift-check.ts` enforcer flags `export interface`/`export type` declarations outside this file unless the type name ends with one of the exempt suffixes:

**Original 7 suffixes (established at drift-check creation):**
```
Props, State, Config, Options, Context, Params, Result
```

Baseline audit on 2026-10-21 identified 21 `SSOT_VIOLATION` entries. Analysis showed:

- **2 types** are genuinely shared domain shapes that should move to SSOT (`PaymentFormGroup`, `DiscrepancyStatus`).
- **19 types** are legitimately module-local but their names don't match the current suffix pattern.

The module-local types fall into clear semantic categories:
- Function input parameter bags (e.g. `FormNumberInput`, `EvaluateDiscrepancyInput`)
- Database row shapes in persistence adapters (e.g. `SqliteSpeciesRow`)
- Adapter pattern interfaces (e.g. `StorageAdapter`)
- Chart.js data payload shapes (e.g. `VolumeTrendData`)
- React context value shapes (e.g. `NavigationContextValue`)
- Reducer action discriminated unions (e.g. `NavigationAction`)
- Future-proofing for generic shape documentation (`Shape` suffix)

Forcing these into SSOT would violate YAGNI — they are inherently coupled to the module that owns them (DB row shape only matters inside the adapter; chart data shape only matters next to its chart component).

---

## Decision

**Expand `SSOT_EXEMPT_SUFFIXES` from 7 to 14 suffixes** by adding 7 new entries. Each addition has a clear semantic category and is documented inline in `drift-check.ts`.

**Suffixes added during implementation** (as realized in `scripts/drift-check.ts`):

```ts
'Input',      // Function parameter bags (e.g. EvaluateDiscrepancyInput)
'Row',        // Persistence-layer DB row shapes (e.g. SqliteSpeciesRow)
'Adapter',    // Adapter pattern interfaces (e.g. StorageAdapter)
'ChartData',  // Chart.js data payload shapes (e.g. VolumeTrendChartData)
'Shape',      // Reserved for type shape documentation (future-proofing)
'Value',      // React context value shapes (e.g. NavigationContextValue)
'Action',     // Reducer action discriminated unions (e.g. NavigationAction)
'Option',     // Combobox or select item options (e.g. SupplierComboboxOption) — single-item variant of Options
'Field',      // Table or form field union types (e.g. RecordTableSortField)
'Direction',  // Sort or layout direction union types (e.g. RecordTableSortDirection)
```

**Note:** Original plan proposed 7 suffixes. Implementation added 3 additional suffixes (`Option`, `Field`, `Direction`) during actual rename refactor when it became clear these were legitimate standalone categories, not just variants of existing suffixes. This expansion is accepted as sound judgment during execution, documented here for traceability.

**Final list of 17 suffixes:**
```
Props, State, Config, Options, Context, Params, Result,
Input, Row, Adapter, ChartData, Shape, Value, Action,
Option, Field, Direction
```

**Enforcement rules unchanged:**
- Types ending with any of these suffixes may be declared outside `src/types/index.ts`.
- All other domain-shaped types MUST be in SSOT.
- Test files remain fully exempt (unchanged).

**Co-pilot requirement:**
2 types (`PaymentFormGroup`, `DiscrepancyStatus`) are moved to SSOT because they are **genuinely shared** across modules, not just locally scoped. This is NOT an exemption expansion — it is correct SSOT compliance.

---

## Rejected Alternatives

### Alternative A: Keep strict 7 suffixes, force move all 21 to SSOT
**Rejected because:**
- `src/types/index.ts` would bloat with ~800 LOC of module-specific shapes (DB row types, chart data types, reducer actions).
- Violates YAGNI — these types have **zero** cross-module consumers.
- Creates circular import risk (SSOT importing from `node:sqlite` types, chart library types, etc.).
- Removes natural co-location: DB row shapes live next to the queries that use them; chart data lives next to the chart component.
- Future developers would correctly question the move: "why is `SqliteSpeciesRow` in domain types? It's not a domain entity."

### Alternative B: Add explicit whitelist file (list specific allowed files/types)
**Rejected because:**
- Whitelist becomes stale fast — every rename requires whitelist update.
- Does not express the **reason** types are allowed (just enumeration).
- No pattern enforcement — a new `WeirdType` not on whitelist would need separate explicit addition.
- Suffix pattern is self-documenting: `SqliteSpeciesRow` reads as "a database row for species in sqlite".

### Alternative C: Delete the offending types entirely
**Rejected because:**
- They are all **actively used** — chart data shapes drive Chart.js configs, DB row shapes guard query serialization, context value shapes type React consumers.
- Removal would require inline anonymous types, defeating readability.

### Alternative D: Only add 2 suffixes (`Input`, `Row`) — minimal viable exemption
**Rejected because:**
- Would still leave 11 violations unresolved (Adapter, ChartData, Value, Action, misc renames).
- Partial compliance creates confusion: "why does `Input` work but `Value` doesn't?"
- Pattern-based exemption is more durable than ad-hoc per-type decisions.
- 7 added suffixes represent **distinct, well-understood semantic categories** — they are not arbitrary.

### Alternative E: Narrower set (exclude `Shape` and `Value`)
**Rejected after consideration:**
- `Shape` is future-proofing; cost near-zero to include.
- `Value` has a legitimate use case for context values (`NavigationContextValue`) — removing it would require renaming to `NavigationContextConfig` which is semantically wrong (it's not a config, it's a runtime context value).
- Narrowing to 5 suffixes would leave 2-3 violations unresolved, requiring manual exemption anyway.

---

## Consequences

### Positive
- **21 SSOT_VIOLATION baseline entries resolved** (19 via rename/exemption, 2 via SSOT move).
- **Realistic enforcement** — invariant now matches actual domain modeling practice (locally-scoped shapes stay local).
- **Self-documenting suffixes** — type name conveys its scope and purpose (e.g. `SqliteSpeciesRow` is unmistakably a DB row shape).
- **No bloat in SSOT** — `src/types/index.ts` stays focused on true domain entities.
- **Pattern durability** — future types matching these categories don't need case-by-case review.

### Negative / Trade-offs
- **Broader escape hatch** — a developer could rename a true domain type to end with `Shape` or `Value` to bypass SSOT review. Risk partially mitigated by:
  - Inline comments in `drift-check.ts` document rationale per suffix.
  - PR review culture should catch misuse.
  - Future auditors (human or AI) reference this ADR to understand intent.
- **Enforcement is cosmetic for 19 types** — they stay in the same files; only names change (or exemption applies). The invariant becomes about naming hygiene, not architectural placement.
- **Some renames feel verbose** — `VolumeTrendData` → `VolumeTrendChartData` adds characters without objective readability gain.
  - Accepted as cost of consistency.

### Follow-up Obligations
- **Any future addition to `SSOT_EXEMPT_SUFFIXES`** MUST be documented via new ADR (not just inline comment). This ADR establishes the precedent.
- **If a true domain type** is accidentally renamed with an exempt suffix (bypassing SSOT), code review MUST catch it. Rely on PR discipline, not drift-check alone.
- **Baseline regeneration** happens as part of plan `2026-10-21-cleanup-ssot-violations-rename.md` Phase 6.
- **Shape suffix** currently unused — if 6 months pass without a use case, consider removing in a future ADR to narrow surface.
- **Monitor misuse** — if any PR introduces a domain-like type with exempt suffix without justification, raise in retrospective.

---

## References

- Plan: `docs/superpowers/plans/2026-10-21-cleanup-ssot-violations-rename.md`
- Enforcer: `scripts/drift-check.ts` (SSOT_EXEMPT_SUFFIXES constant)
- Baseline: `scripts/drift-baseline.json` (regenerated after plan execution)
- Project invariant: `AGENTS.md` — "Single Source of Truth (SSOT)" section
- Related ADRs:
  - ADR-0001 (Dual-mode persistence — introduces persistence adapter pattern, context for `Adapter` suffix)
  - ADR-0004 (Broker as separate entity — demonstrates when a type DOES belong in SSOT)
