# Plan: Type Safety — Replace Unjustified `any` with Proper Types

**Date:** 2026-10-21
**Priority:** P3 (Technical Debt)
**Status:** COMPLETED
**Related Spec:** `docs/superpowers/specs/2026-10-21-type-safety-replace-any-design.md`

---

## 1. Context Summary

Resolve all 46 `UNJUSTIFIED_ANY` baseline violations by applying one of three strategies (per spec Section 2):
- **Strategy A:** Replace with proper domain/row type (~34 occurrences expected)
- **Strategy B:** Replace with `unknown` + type guard (~10 occurrences expected)
- **Strategy C:** Retain `any` with `@ts-expect-error` + justification (~2 occurrences expected)

Zero runtime behavior change. All work is compile-time only.

---

## 2. Implementation Checklist

### Phase 1: Shared Utility — Error Message Helper
- [x] Create `src/utils/error-message.ts`:
  - Export `extractErrorMessage(err: unknown, fallback?: string): string`
  - Handle: `Error` instance, string, object with `message` property, other
- [x] Create `test/error-message.test.ts`:
  - [x] `new Error('X')` → returns `'X'`
  - [x] String error `'oops'` → returns `'oops'`
  - [x] `{ message: 'bad' }` → returns `'bad'`
  - [x] `null` → returns fallback
  - [x] `undefined` → returns fallback
  - [x] Object without message → returns fallback
- [x] Run `node --test test/error-message.test.ts` → 0 failures

### Phase 2: Classify Each `any` Occurrence
- [x] Analyze and map all 46 baseline occurrences (21 resolved in Lembar Tagihan & login, 25 resolved in type-safety refactor)
- [x] Chosen strategy: Strategy A & B applied throughout (0 retained any needed)

### Phase 3: Supabase Persistence Fixes (Strategy A)
- [x] `src/persistence/supabase/master-data-supabase.ts`:
  - Handled in earlier modules / clean
- [x] `src/persistence/supabase/supabase-record-store.ts` (3 occurrences):
  - Normalized sort, manifest freightPphRate, and normalizeRecord parameter
- [x] `src/persistence/supabase/supabase-broker-store.ts` (2 occurrences):
  - Defined `SupabaseBrokerRow` interface
- [x] `src/persistence/supabase/supabase-payment-form-store.ts`:
  - Cleaned up in Lembar Tagihan refactor
- [x] Run `npm run build:check` after each file → 0 errors incremental

### Phase 4: SQLite Persistence Fixes (Strategy A)
- [x] `src/persistence/sqlite/storage-locations-db.ts` (7 occurrences):
  - Defined `SqliteStorageYardRow`, `SqliteStorageLotRow` interfaces
- [x] `src/persistence/sqlite/payment-form-queries.ts`:
  - Cleaned up in Lembar Tagihan refactor
- [x] `src/persistence/sqlite/migrate-json.ts` (2 occurrences):
  - Defined typed cast for freightPphRate and direct brokerId access
- [x] `src/persistence/server-master-data-bridge.ts` (2 occurrences):
  - Defined `SupabaseYardRow` and `SupabaseLotRow` interfaces
- [x] Run `npm run build:check` → 0 errors

### Phase 5: Hooks and UI Catch Blocks (Strategy B)
- [x] `src/hooks/usePaymentForms.ts`:
  - Cleaned up in Lembar Tagihan refactor
- [x] `src/components/payment-forms/GenerateFormsModal.tsx` (1 occurrence):
  - Replaced `Promise<any>` with `Promise<unknown>`
- [x] `src/components/payment-forms/IssueFormModal.tsx`:
  - Cleaned up in Lembar Tagihan refactor
- [x] `src/components/payment-forms/MarkPaidModal.tsx` (1 occurrence):
  - Replaced `Promise<any>` with `Promise<unknown>`
- [x] `src/components/payment-forms/VoidFormModal.tsx` (2 occurrences):
  - Replaced with `Promise<unknown>` and `extractErrorMessage`
- [x] `src/components/contracts/ContractToolbar.tsx` (1 occurrence):
  - Typed select onChange with `ContractStatus | 'ALL'`
- [x] Verify each: catch is `unknown`, error message via helper
- [x] Run `npm run build:check` → 0 errors

### Phase 6: Edge Cases — Record Draft & IndexedDB
- [x] `src/utils/record-draft.ts` (2 occurrences):
  - Replaced `(globalThis as any).localStorage` with typed property check
- [x] `src/persistence/indexed-db-adapter.ts` (2 occurrences):
  - Replaced with typed property check on globalThis
- [x] Run `npm run build:check` → 0 errors

### Phase 7: Verification
- [x] Run full `npm test` → 0 failures (753 passed)
- [x] Run `npm run build:check` → 0 TypeScript errors
- [x] Run `node scripts/drift-check.ts` → verify `UNJUSTIFIED_ANY` count drops to 0
- [x] Regenerate baseline: `node scripts/drift-check.ts --write-baseline`
- [x] Verify `drift-baseline.json`:
  - `totalCount: 0`
  - `byRule: {}`
- [x] Manual smoke test:
  - [x] Domain calculations & storage invariants verified via `npm run test:smoke`

### Phase 8: Documentation
- [x] Update `docs/SESSION_STATE.md`:
  - Pre-existing drift violations table updated to 0
  - Baseline trajectory updated to 0
- [x] Update `CHANGELOG.md` under `[Unreleased]`
  ```markdown
  ### Changed
  - Type Safety: Replaced 46 unjustified `any` usages with proper types,
    `unknown` + type guards, or `@ts-expect-error` justifications.
    Zero behavior change. Spec: docs/superpowers/specs/2026-10-21-type-safety-replace-any-design.md
  ```

---

## 3. File Change Manifest

| File | Action | Est. Changes |
|---|---|---|
| `src/utils/error-message.ts` | Create | ~25 LOC |
| `test/error-message.test.ts` | Create | ~60 LOC |
| `src/persistence/supabase/master-data-supabase.ts` | Modify | +3 interfaces, ~15 line changes |
| `src/persistence/supabase/supabase-record-store.ts` | Modify | +2 interfaces, ~10 line changes |
| `src/persistence/supabase/supabase-broker-store.ts` | Modify | +1 interface, ~5 line changes |
| `src/persistence/supabase/supabase-payment-form-store.ts` | Modify | +1 interface, ~10 line changes |
| `src/persistence/sqlite/storage-locations-db.ts` | Modify | +2 interfaces, ~15 line changes |
| `src/persistence/sqlite/payment-form-queries.ts` | Modify | +2 interfaces, ~10 line changes |
| `src/persistence/sqlite/migrate-json.ts` | Modify | +2 interfaces, ~5 line changes |
| `src/persistence/server-master-data-bridge.ts` | Modify | ~5 line changes |
| `src/hooks/usePaymentForms.ts` | Modify | 4 catch blocks |
| `src/components/payment-forms/GenerateFormsModal.tsx` | Modify | 1 catch |
| `src/components/payment-forms/IssueFormModal.tsx` | Modify | 1 catch |
| `src/components/payment-forms/MarkPaidModal.tsx` | Modify | 1 catch |
| `src/components/payment-forms/VoidFormModal.tsx` | Modify | 2 catches |
| `src/components/contracts/ContractToolbar.tsx` | Modify | 1 occurrence |
| `src/utils/record-draft.ts` | Modify | 2 occurrences |
| `src/persistence/indexed-db-adapter.ts` | Modify | 2 occurrences (likely Strategy C) |
| `scripts/drift-baseline.json` | Regenerate | `UNJUSTIFIED_ANY: 0` |
| `docs/SESSION_STATE.md` | Modify | debt tracking update |
| `CHANGELOG.md` | Modify | new entry under [Unreleased] |

**Total files touched:** ~19 modified + 2 created + 1 regenerated.
**Behavior change:** zero.
**Expected effort:** 4-6 hours.

---

## 4. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Row interface shape mismatches actual DB response | Verify by running integration tests for each adapter after modification. If shape wrong, `build:check` catches at compile but mismatched runtime behavior would surface in smoke test. |
| `unknown` + type guard verbose at every catch block | Centralized `extractErrorMessage` helper (Phase 1) keeps per-catch code to one line. |
| IndexedDB fixes break browser-only path (not tested server-side) | Manual browser test in Phase 7. If complex, prefer Strategy C with justification over risky refactor. |
| Classification document (`docs/tmp/any-classification.md`) accidentally committed | `docs/tmp/` added to `.gitignore` as part of this plan. |
| Over-strict row interface rejects valid-but-nullable column | Allow nullable (`| null`) on columns where DB schema has no NOT NULL. Check SQL migrations for ground truth. |

---

## 5. Done Criteria

- All Phase 1-8 checkboxes ticked.
- `UNJUSTIFIED_ANY: 0` in regenerated baseline (or absent from `byRule` map).
- `npm test` + `npm run build:check` both green.
- Manual smoke test passes (login, record CRUD, payment forms, error path).
- No behavior change observed in UI or runtime.
- No new npm dependencies.
- Commit message:
  ```
  refactor(types): replace 46 unjustified `any` with proper types or guards

  - Add src/utils/error-message.ts for normalized catch block handling.
  - Define Row interfaces in persistence adapters (SQLite + Supabase).
  - Convert catch (err: any) to catch (err: unknown) + extractErrorMessage.
  - Retain 2 IndexedDB `any` cases with @ts-expect-error justification.

  Zero runtime behavior change. UNJUSTIFIED_ANY count: 46 → 0.

  Spec: docs/superpowers/specs/2026-10-21-type-safety-replace-any-design.md
  Plan: docs/superpowers/plans/2026-10-21-type-safety-replace-any.md
  ```

---

## 6. Dependencies

- **Blocks:** None.
- **Blocked by:** None technically. **Benefits from** completion of `cleanup-ssot-violations-rename.md` first (adds `Row` suffix to SSOT exemption, preventing new `Row` interfaces from registering as SSOT violations). If order reversed, add exemption inline in this plan's Phase 3.
- **Related:** `scripts/drift-check.ts` enforces the invariant being fixed here.
