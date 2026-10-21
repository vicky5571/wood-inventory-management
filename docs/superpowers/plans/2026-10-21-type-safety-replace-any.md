# Plan: Type Safety — Replace Unjustified `any` with Proper Types

**Date:** 2026-10-21
**Priority:** P3 (Technical Debt)
**Status:** DRAFT
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
- [ ] Create `src/utils/error-message.ts`:
  - Export `extractErrorMessage(err: unknown, fallback?: string): string`
  - Handle: `Error` instance, string, object with `message` property, other
- [ ] Create `test/error-message.test.ts`:
  - [ ] `new Error('X')` → returns `'X'`
  - [ ] String error `'oops'` → returns `'oops'`
  - [ ] `{ message: 'bad' }` → returns `'bad'`
  - [ ] `null` → returns fallback
  - [ ] `undefined` → returns fallback
  - [ ] Object without message → returns fallback
- [ ] Run `node --test test/error-message.test.ts` → 0 failures

### Phase 2: Classify Each `any` Occurrence
- [ ] Create working document `docs/tmp/any-classification.md` (git-ignored) listing all 46 occurrences with:
  - File + line number
  - Current `any` usage context
  - Chosen strategy (A/B/C)
  - Target type OR justification comment
- [ ] Review classification before Phase 3 starts
- [ ] Delete working document after Phase 6 (or move to `docs/adr/` if any decision warrants permanent record)

### Phase 3: Supabase Persistence Fixes (Strategy A)
- [ ] `src/persistence/supabase/master-data-supabase.ts` (8 occurrences):
  - Define `AppSettingsRow`, `SupabaseStorageYardRow`, `SupabaseStorageLotRow` interfaces
  - Replace `supabaseFetch<any[]>` with typed variants
  - Replace `r.field` accesses implicitly (TypeScript narrows automatically)
- [ ] `src/persistence/supabase/supabase-record-store.ts` (3 occurrences):
  - Define `SupabaseRecordRow`, `SupabaseManifestRow` interfaces
- [ ] `src/persistence/supabase/supabase-broker-store.ts` (2 occurrences):
  - Define `SupabaseBrokerRow` interface
- [ ] `src/persistence/supabase/supabase-payment-form-store.ts` (4 occurrences):
  - Define `SupabasePaymentFormRow` interface
- [ ] Run `npm run build:check` after each file → 0 errors incremental

### Phase 4: SQLite Persistence Fixes (Strategy A)
- [ ] `src/persistence/sqlite/storage-locations-db.ts` (7 occurrences):
  - Define `SqliteStorageYardRow`, `SqliteStorageLotRow` interfaces
- [ ] `src/persistence/sqlite/payment-form-queries.ts` (4 occurrences):
  - Define `SqlitePaymentFormRow`, `SqlitePaymentFormWithLinesRow` interfaces
- [ ] `src/persistence/sqlite/migrate-json.ts` (2 occurrences):
  - Define `LegacyJsonRecord`, `LegacyJsonManifest` interfaces
- [ ] `src/persistence/server-master-data-bridge.ts` (2 occurrences):
  - Determine shape and type appropriately
- [ ] Run `npm run build:check` → 0 errors

### Phase 5: Hooks and UI Catch Blocks (Strategy B)
- [ ] `src/hooks/usePaymentForms.ts` (4 occurrences):
  - Replace `catch (err: any)` with `catch (err: unknown)` + `extractErrorMessage(err)`
  - Import `extractErrorMessage` from `src/utils/error-message`
- [ ] `src/components/payment-forms/GenerateFormsModal.tsx` (1 occurrence)
- [ ] `src/components/payment-forms/IssueFormModal.tsx` (1 occurrence)
- [ ] `src/components/payment-forms/MarkPaidModal.tsx` (1 occurrence)
- [ ] `src/components/payment-forms/VoidFormModal.tsx` (2 occurrences)
- [ ] `src/components/contracts/ContractToolbar.tsx` (1 occurrence)
- [ ] Verify each: catch is `unknown`, error message via helper
- [ ] Run `npm run build:check` → 0 errors

### Phase 6: Edge Cases — Record Draft & IndexedDB
- [ ] `src/utils/record-draft.ts` (2 occurrences):
  - Analyze: JSON parse result → use `unknown` + type guard
  - If complex, add typed parser `parseRecordDraft(raw: unknown): RecordDraftState | null`
- [ ] `src/persistence/indexed-db-adapter.ts` (2 occurrences):
  - Analyze: IndexedDB `IDBRequest<any>` is legitimate per `lib.dom.d.ts`
  - Likely Strategy C: retain with `@ts-expect-error: IDBRequest result is DOM-level any; validated via type guard`
  - OR properly type the specific result via explicit generic

### Phase 7: Verification
- [ ] Run full `npm test` → 0 failures (regression check)
- [ ] Run `npm run build:check` → 0 TypeScript errors
- [ ] Run `node scripts/drift-check.ts` → verify `UNJUSTIFIED_ANY` count drops to 0
- [ ] Regenerate baseline: `node scripts/drift-check.ts --write-baseline`
- [ ] Verify `drift-baseline.json`:
  - `UNJUSTIFIED_ANY` key absent OR `0`
  - `totalCount` reduced by 46 from current (68 → 22)
- [ ] Manual smoke test:
  - [ ] Login → settings → verify settings fields display correctly (tests AppSettingsRow fix)
  - [ ] Receiving record CRUD → verify save/edit/delete work (tests SupabaseRecordRow / SqliteRecordRow fixes)
  - [ ] Payment form generation → verify forms create successfully (tests payment form fixes)
  - [ ] Trigger an error (e.g. network offline, invalid input) → verify error toast displays correct message (tests catch block fixes)

### Phase 8: Documentation
- [ ] Update `docs/SESSION_STATE.md`:
  - Move "Pre-existing Drift Violations" section to reflect new counts
  - Note that `UNJUSTIFIED_ANY` category resolved
- [ ] Update `CHANGELOG.md` under `[Unreleased]`:
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
