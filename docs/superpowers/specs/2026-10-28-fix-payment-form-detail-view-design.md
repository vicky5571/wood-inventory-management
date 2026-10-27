# Design Spec: Fix Payment Form Detail View Race Condition

**Document:** `docs/superpowers/specs/2026-10-28-fix-payment-form-detail-view-design.md`  
**Date:** 2026-10-28  
**Status:** Accepted — In Progress  
**Related Plan:** `docs/superpowers/plans/2026-10-28-fix-payment-form-detail-view.md`  
**Architecture:** Resolve race condition between `refreshForms()` and `loadFormById()` by introducing `skipListLoad` option in `usePaymentForms` and managing scoped `localLoading` in `PaymentFormDetailView`.

---

## 1. Executive Summary & Problem Statement

### 1.1 Context

When navigating to `/payment-forms/[id]`, users were encountering an intermittent or immediate "Form yang Anda cari tidak tersedia" error screen instead of the loaded detail view.

### 1.2 Root Cause Analysis

1. **Race Condition in `usePaymentForms`:**  
   `usePaymentForms()` ran `refreshForms()` on every component mount, even on detail views. This triggered a concurrent request to `/api/payment-forms` while `loadFormById(id)` triggered a request to `/api/payment-forms/${id}`. Both shared a single `isLoading` boolean.
   When `refreshForms()` completed faster than `loadFormById()`, `isLoading` became `false` while `activeForm` was still `null`. The guard `if (error || !activeForm)` immediately triggered and rendered the error screen before `loadFormById()` could finish.

2. **Silent Null Return:**  
   In `loadFormById()`, when the response was non-successful or data was missing, the function returned `null` without setting an explicit error message via `setError()`, leaving `error` as `null` while `activeForm` remained `null`.

3. **Shared Loading State:**  
   `PaymentFormDetailView` relied on global `isLoading` from the hook instead of tracking its own targeted fetch lifecycle.

---

## 2. Technical Solution & Design

### 2.1 Hook Extension (`src/hooks/usePaymentForms.ts`)

- Accept optional options bag: `opts?: { skipListLoad?: boolean }`.
- In the initial `useEffect`, conditionally invoke `refreshForms()` only when `!opts?.skipListLoad`.
- In `loadFormById()`, if `!(json.success && json.data)`, set `setError('Form tidak dapat dimuat.')` before returning `null`.

### 2.2 Component Isolation (`src/components/payment-forms/PaymentFormDetailView.tsx`)

- Initialize `usePaymentForms(undefined, { skipListLoad: true })`.
- Maintain a local state `const [localLoading, setLocalLoading] = useState(true)`.
- Wrap `loadFormById(formId)` with `.finally(() => setLocalLoading(false))`.
- Update loading guard: `if (localLoading)` to ensure the skeleton or spinner renders until the detail fetch resolves.

---

## 3. Verification Criteria

1. `npm run drift:check` passes with 0 violations.
2. `npm test` passes with 0 failures.
3. `npm run build:check` compiles with 0 errors.
4. Detail view does not flash "tidak tersedia" while loading form by ID.
