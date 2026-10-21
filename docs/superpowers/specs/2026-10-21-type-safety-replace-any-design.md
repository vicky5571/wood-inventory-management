# Design Spec: Replace Unjustified `any` with Proper Types

**Document:** `docs/superpowers/specs/2026-10-21-type-safety-replace-any-design.md`
**Date:** 2026-10-21
**Status:** Approved & Shipped
**Related Plan:** `docs/superpowers/plans/2026-10-21-type-safety-replace-any.md`
**Architecture:** Eliminate 46 unjustified `any` usages from the codebase by applying one of three strategies per occurrence: (1) replace with proper domain type, (2) replace with `unknown` + type guard, (3) retain `any` with explicit `@ts-expect-error` + justification comment. Zero runtime behavior change.

---

## 1. Executive Summary & Problem Statement

### 1.1 Context
The `drift-check.ts` script flags 46 occurrences of `any` type usage without `@ts-expect-error` justification. These are concentrated in:

- **Persistence adapters** (SQLite + Supabase stores) — 28 occurrences
- **Hooks for recently-shipped features** (`usePaymentForms.ts`) — 4 occurrences
- **UI modal components** (payment-forms, contracts) — 7 occurrences
- **Utilities and bridges** — 7 occurrences

### 1.2 Why This Matters
- `any` disables TypeScript's type checker for that expression. Field name typos, missing properties, wrong return types all slip through compile to runtime failures.
- Project invariant per `AGENTS.md`: **"Introduce `any` type without explicit `@ts-expect-error` justification"** is explicitly prohibited.
- As the codebase grows (7 new modules shipped recently), untyped boundaries create cascading uncertainty — downstream code relies on inferred shapes that may not match actual runtime data.

### 1.3 Client/Business Impact
None directly. This is pure code quality work. However, type regressions at persistence boundaries have caused silent data loss / wrong field reads in similar codebases historically.

### 1.4 Core Objectives
1. **Zero runtime behavior change.** All 46 fixes are compile-time only.
2. **Apply correct strategy per occurrence** — not blanket replacement.
3. **Document retained `any` cases** with explicit justification so future audits know they are intentional.
4. **Add missing persistence row interfaces** to `src/types/index.ts` for SSOT compliance where applicable.
5. **Verify zero regression** via existing test suite + build check.

---

## 2. Three-Strategy Decision Framework

Each `any` occurrence falls into exactly one category. The strategy is deterministic based on context:

### Strategy A — Replace with Proper Domain Type
**When:**
- Fetching API data with known shape (e.g. `supabaseFetch<any[]>` where the response schema is documented).
- Hook state typed as `any[]` where the array shape is already defined in SSOT.
- Function parameter typed as `any` where caller passes a known SSOT type.

**How:**
```ts
// Before
const rows = await supabaseFetch<any[]>('/app_settings?select=*');
const r = rows[0];
return { defaultTimberPphRate: Number(r.default_timber_pph_rate), ... };

// After
interface AppSettingsRow {
  default_timber_pph_rate: number | string | null;
  default_freight_pph_rate: number | string | null;
  default_broker_fee: number | string | null;
  acceptable_discrepancy_threshold_pct: number | string | null;
  discrepancy_alarm_volume_m3: number | string | null;
  discrepancy_alarm_percent: number | string | null;
  yard_name: string;
  yard_code: string;
}

const rows = await supabaseFetch<AppSettingsRow[]>('/app_settings?select=*');
const r = rows[0];
return { defaultTimberPphRate: Number(r.default_timber_pph_rate), ... };
```

**Where row interfaces go:**
- **Persistence-local** (e.g. `SupabaseXxxRow`) — co-located with adapter in `src/persistence/supabase/` or `src/persistence/sqlite/` with `Row` suffix. The expanded SSOT exemption (planned in `cleanup-ssot-violations-rename.md`) covers these.
- **Shared** — if the row shape mirrors an existing SSOT entity 1:1, use the SSOT type directly.

### Strategy B — Replace with `unknown` + Type Guard
**When:**
- `catch (err: any)` blocks — error type is genuinely unknown at compile time.
- Parsing JSON or user input where runtime validation is needed.
- Any case where the shape is not statically determinable.

**How:**
```ts
// Before
try {
  await doSomething();
} catch (err: any) {
  setError(err.message || 'Unknown error');
}

// After
try {
  await doSomething();
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  setError(message || 'Unknown error');
}
```

**Reusable helper** for catch blocks (add to `src/utils/error-message.ts`):
```ts
export function extractErrorMessage(err: unknown, fallback = 'Terjadi kesalahan'): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return fallback;
}
```

### Strategy C — Retain `any` with Justification
**When:**
- Interop with a third-party API that genuinely returns dynamic shape (rare in this project — Supabase stored procedures, if any).
- Legacy code slated for removal where fixing is more risk than benefit.

**How:**
```ts
// @ts-expect-error: Supabase RPC returns dynamic shape determined by SQL function
const result: any = await supabase.rpc('legacy_report_proc');
```

**Approval required:** Each retained `any` must be reviewed and have a one-sentence justification. Avoid as default escape hatch.

---

## 3. Classification of All 46 Occurrences

Based on file-level scan, classification distribution (precise per-line classification in Plan Phase 2):

| Category | File Group | Count | Strategy |
|---|---|---|---|
| Supabase row fetch (dynamic shape) | `master-data-supabase.ts` | 8 | A (add row interfaces) |
| SQLite row fetch | `storage-locations-db.ts` | 7 | A (add row interfaces) |
| Payment form Supabase/SQLite | `supabase-payment-form-store.ts`, `payment-form-queries.ts` | 8 | A (row interfaces) |
| Record store rows | `supabase-record-store.ts` | 3 | A |
| Broker store rows | `supabase-broker-store.ts` | 2 | A |
| Catch block errors | `usePaymentForms.ts` | 4 | B (unknown + extractErrorMessage) |
| Modal event handlers / props | `payment-forms/*Modal.tsx`, `contracts/ContractToolbar.tsx` | 7 | A or B (per-case) |
| Record draft parsing | `record-draft.ts` | 2 | B (unknown + JSON validation) |
| JSON migration bridge | `migrate-json.ts`, `server-master-data-bridge.ts` | 4 | A (define migration input shapes) |
| IndexedDB adapter | `indexed-db-adapter.ts` | 2 | A or C (IndexedDB APIs are legitimately typed as any in older versions) |

**Expected final distribution:**
- Strategy A: ~34 occurrences
- Strategy B: ~10 occurrences
- Strategy C (justified): ~2 occurrences (IndexedDB adapter edge cases)

---

## 4. New SSOT & Utility Additions

### 4.1 `src/utils/error-message.ts` (New File)
```ts
/**
 * Normalizes unknown error values into a user-facing string.
 * Prefer this over `err.message` on `any`-typed catches.
 */
export function extractErrorMessage(err: unknown, fallback = 'Terjadi kesalahan'): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return fallback;
}
```

### 4.2 Persistence Row Interfaces
Each adapter file gets its own `*Row` interface(s) for Supabase/SQLite query results. Example:
```ts
// src/persistence/supabase/master-data-supabase.ts
interface AppSettingsRow {
  default_timber_pph_rate: number | string | null;
  // ...
}

interface SupabaseStorageYardRow { ... }
interface SupabaseStorageLotRow { ... }
```

These stay **module-local** (not moved to `src/types/index.ts`) because:
- They describe wire-format row shapes, not domain entities.
- Only the adapter cares about them; consumers get mapped domain types.
- SSOT exemption suffix `Row` (added in `cleanup-ssot-violations-rename.md`) covers them.

### 4.3 Migration Input Types
```ts
// src/persistence/sqlite/migrate-json.ts
interface LegacyJsonRecord { ... }
interface LegacyJsonManifest { ... }
```

---

## 5. Non-Goals

- **No new runtime behavior.** Type-level changes only.
- **No new unit tests** required for coordinator (behavior preserved; existing suite catches regressions).
- **No refactor beyond typing fix.** Resist urge to restructure adapter code during this cleanup.
- **No eslint rules changes.** Drift check handles enforcement.
- **Not fixing legacy `any` in test files.** Tests have an exemption in drift-check (confirmed by current baseline — zero test file violations).

---

## 6. Acceptance Criteria

1. All 46 `UNJUSTIFIED_ANY` violations in `drift-baseline.json` resolved.
2. Regenerated baseline shows `UNJUSTIFIED_ANY: 0`.
3. `npm test` → 0 failures (regression check).
4. `npm run build:check` → 0 TypeScript errors (type correctness check).
5. New `src/utils/error-message.ts` exists with unit test.
6. Each retained `any` (Strategy C) has `@ts-expect-error: <justification>` comment on the preceding line.
7. No new npm dependencies added.

---

## 7. Verification Checklist (Grep-Able Audit)

### 7.1 Baseline Count
```bash
grep -c "UNJUSTIFIED_ANY" scripts/drift-baseline.json
# BEFORE fix: 47 (includes category header line)
# AFTER fix: 1 (only the category header remains in baseline-count JSON key)
```

### 7.2 Error Message Helper
```bash
ls src/utils/error-message.ts
grep -c "export function extractErrorMessage" src/utils/error-message.ts
# EXPECT: file exists, 1 export
```

### 7.3 Justified `any` Coverage
```bash
# Every remaining `any` must have @ts-expect-error comment
grep -rn ": any\b\|as any\b\|<any>\|any\[\]" src/ app/ --include="*.ts" --include="*.tsx" | \
  grep -v ".test.ts" | \
  grep -v "// @ts-expect-error"
# EXPECT: zero output (all remaining any-usage justified OR no remaining anys)
```

### 7.4 Overall Gate
```bash
npm run drift:check && npm test && npm run build:check
# EXPECT: all pass; baseline UNJUSTIFIED_ANY count: 0
```

---

## 8. Dependencies

- **Blocks:** None.
- **Blocked by:** None (independent of other cleanup plans).
- **Related:**
  - `cleanup-ssot-violations-rename.md` — provides `Row` suffix exemption that `*Row` interfaces rely on.
  - `scripts/drift-check.ts` — enforces the invariant being satisfied here.
