# Plan: Refactor Login Page (God File Cleanup)

**Date:** 2026-10-21
**Priority:** P3 (Technical Debt)
**Status:** COMPLETED
**Type:** Refactor-only (no behavior change)
**Related ADR:** None (reuses existing patterns, no new design decisions)

> **Spec Requirement:** None. This is a single-file refactor that preserves behavior. Plans with prefix `refactor-` are exempt from Spec-Plan pairing per `scripts/drift-check.ts` convention.

---

## 1. Context & Problem Statement

### 1.1 Current State
`app/login/page.tsx` is **269 LOC**, exceeding the 250 LOC Strangler Pattern limit. It mixes multiple concerns in a single file:

- Preset configuration constants (`PRESETS` array, 26 LOC)
- Form state hooks + validation + submit logic (~30 LOC)
- Redirect-if-authenticated effect
- Loading state renderer
- Brand header JSX (~15 LOC)
- Error banner JSX
- Email input with inline SVG icon (~25 LOC)
- Password input with show/hide toggle + inline SVG icons (~45 LOC)
- Submit button with loading state (~25 LOC)
- Preset chip grid (~35 LOC)
- Security footer JSX

This creates a GOD_FILE drift violation (recorded in `scripts/drift-baseline.json`).

### 1.2 Why Refactor
- Any bug fix to login requires reading all 269 LOC to find the right section.
- Inline SVG icons bloat the file; replacing with `lucide-react` (already a project dependency) reduces LOC and improves consistency with the rest of the app.
- Preset config as a constant should live outside the component for testability.
- Section components can be unit-tested in isolation.

### 1.3 Non-Goals
- **No behavior change.** Pixel-identical UI, same submit flow, same preset auto-fill, same redirect logic.
- **No new tests required for coordinator** (behavior preserved; existing `useAuth` tests cover auth logic).
- **No introduction of new dependencies.**
- **No addition of new features** (forgot password, SSO, etc. are explicitly out of scope).

---

## 2. Target Structure

```
app/login/
├── page.tsx                      # Coordinator (<150 LOC target)
└── (no other files — see rationale below)

src/components/login/
├── LoginBrandHeader.tsx          # Logo + title + subtitle (~30 LOC)
├── LoginForm.tsx                 # Email + password + submit button (~130 LOC)
├── LoginErrorBanner.tsx          # Rose banner for errorMsg (~25 LOC)
├── LoginPresetChips.tsx          # Preset grid with chips (~65 LOC)
├── LoginSecurityFooter.tsx       # Security notice (~20 LOC)
├── LoginCheckingSession.tsx      # Full-page loading state while isLoading=true (~15 LOC)
└── login-presets.ts              # PRESETS constant + PresetKey type (~35 LOC)
```

**Rationale for `src/components/login/`:** keeps subcomponents outside `app/` which is reserved for Next.js routing primitives (page, layout, loading, error). Subcomponents belong in the component tree.

**Icon replacements:** inline SVG → `lucide-react` icons (project already uses `lucide-react` extensively):
- Email icon → `Mail`
- Password lock → `Lock`
- Eye show/hide → `Eye` / `EyeOff`
- Error warning → `AlertTriangle`
- Submit arrow → `ArrowRight`
- Check mark → `Check`
- Shield (security footer) → `ShieldCheck`
- Brand (box/warehouse) → keep custom SVG (brand mark)

---

## 3. Implementation Checklist

### Phase 1: Extract Constants
- [x] Create `src/components/login/login-presets.ts`:
  - Move `PresetKey` type
  - Move `PRESETS` array with `as const` annotation preserved
  - Export both

### Phase 2: Extract Subcomponents
- [x] Create `src/components/login/LoginCheckingSession.tsx` (full-page loading)
- [x] Create `src/components/login/LoginBrandHeader.tsx` (logo + title + subtitle)
- [x] Create `src/components/login/LoginSecurityFooter.tsx` (bottom security notice)
- [x] Create `src/components/login/LoginErrorBanner.tsx` with props `{ message: string }`
- [x] Create `src/components/login/LoginPresetChips.tsx` with props:
  ```ts
  { activePreset: LoginPresetKeyConfig; onSelect: (preset: LoginPresetConfig) => void }
  ```
- [x] Create `src/components/login/LoginForm.tsx` with props:
  ```ts
  {
    email: string;
    password: string;
    showPassword: boolean;
    loading: boolean;
    activePreset: LoginPresetKeyConfig;
    errorMsg: string;
    onEmailChange: (val: string) => void;
    onPasswordChange: (val: string) => void;
    onTogglePassword: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onPresetSelect: (preset: LoginPresetConfig) => void;
  }
  ```

### Phase 3: Replace Inline SVGs with Lucide
- [x] In each new component, replace inline `<svg>` elements with corresponding `lucide-react` imports.
- [x] Verify sizes (`w-4 h-4`, `w-6 h-6`) match current visual.
- [x] Keep brand SVG custom (it's unique mark, not generic icon).

### Phase 4: Refactor Coordinator
- [x] Reduce `app/login/page.tsx` to:
  - Hooks: `useAuth`, `useState` x5, `useEffect` x1
  - Handlers: `handleSubmit`, `handleFillPreset`
  - Conditional render: `<LoginCheckingSession />` or main view
  - Main view: `<LoginBrandHeader />` + `<LoginForm />` + `<LoginSecurityFooter />`
  - `<LoginForm />` internally renders `<LoginErrorBanner />` and `<LoginPresetChips />`
- [x] Verify LOC count via `wc -l app/login/page.tsx` → target <150 (achieved: 85 LOC)

### Phase 5: Verification
- [x] `npm run build:check` → 0 TS errors, 0 build errors
- [x] `npm test` → 0 failures
- [x] `npm run drift:check` → GOD_FILE violation for `app/login/page.tsx` cleared
- [x] Manual smoke test:
  - [x] Navigate to `/login` → page renders identically to before
  - [x] Click each preset chip → email + password fields populate correctly
  - [x] Show/hide password toggle works
  - [x] Submit with invalid credentials → error banner shows
  - [x] Submit with valid credentials → redirects to `/`
  - [x] If already logged in, visiting `/login` auto-redirects to `/`
- [x] Regenerate drift baseline:
  ```bash
  node scripts/drift-check.ts --write-baseline
  ```
- [x] Verify `drift-baseline.json` shows `GOD_FILE: 0`

---

## 4. File Change Manifest

| File | Action | Lines (est.) |
|---|---|---|
| `app/login/page.tsx` | Modify (reduce from 269 → ~140) | −130 |
| `src/components/login/login-presets.ts` | Create | ~35 |
| `src/components/login/LoginBrandHeader.tsx` | Create | ~30 |
| `src/components/login/LoginForm.tsx` | Create | ~130 |
| `src/components/login/LoginErrorBanner.tsx` | Create | ~25 |
| `src/components/login/LoginPresetChips.tsx` | Create | ~65 |
| `src/components/login/LoginSecurityFooter.tsx` | Create | ~20 |
| `src/components/login/LoginCheckingSession.tsx` | Create | ~15 |

**Net change:** +190 LOC new (in 7 new files, each <150 LOC) − 130 LOC from coordinator = +60 LOC total, but distributed properly.

**Trade-off accepted:** total LOC increases slightly due to component boundary overhead (imports, prop interfaces), BUT:
- No single file exceeds 150 LOC
- Each component unit-testable in isolation
- Debug time cut (focused files)
- Pattern consistent with rest of codebase (receiving modal, suppliers, etc.)

---

## 5. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Behavior drift during refactor (e.g. missed state update) | Compare before/after screenshots pixel-level. Manual smoke test covers all interactive paths in Phase 5 checklist. |
| Prop drilling complexity in `LoginForm` with 11 props | Accepted — login is self-contained; no cross-cutting state. Lifting to a hook (`useLoginFormState`) is premature if page-only. If LoginForm grows further, extract then. |
| Lucide icon size mismatches vs inline SVG | Side-by-side visual comparison during Phase 3. Lucide uses `strokeWidth={2}` by default which matches current inline SVG attributes. |
| Baseline not regenerated after fix | Phase 5 explicit step. Verification gate `GOD_FILE: 0` in baseline file. |

---

## 6. Done Criteria

- All Phase 1-5 checkboxes ticked.
- `app/login/page.tsx` is <150 LOC.
- `npm run drift:check` → `GOD_FILE: 0` in regenerated baseline.
- `npm test` + `npm run build:check` both green.
- Manual smoke test passes (login flow identical to pre-refactor).
- No new npm dependencies added.
- Commit message follows convention:
  ```
  refactor(login): extract LoginForm, LoginPresetChips, and headers into subcomponents

  Reduces app/login/page.tsx from 269 LOC to <150 LOC, resolving GOD_FILE
  drift violation. Replaces inline SVG icons with lucide-react equivalents
  for consistency. Preserves pixel-identical UI and all behavior.

  Plan: docs/superpowers/plans/2026-10-21-refactor-login-page-god-file.md
  ```

---

## 7. Dependencies

- **Blocks:** None.
- **Blocked by:** None.
- **Related:** Baseline hygiene (`scripts/drift-baseline.json` will be regenerated).
