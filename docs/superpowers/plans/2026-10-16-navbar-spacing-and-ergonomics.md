# Navbar Spacing & Touch Ergonomics Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the spatial padding, margin symmetry, and touch target sizes across the desktop user navigation controls and mobile drawer navigation in TimberGuard.

**Architecture:** Maintain zero-runtime-cost CSS utility classes via Tailwind CSS and native React TSX component structure. Eliminate compounded margin anomalies (`ml-2` inside a `gap-3` flex parent), expand compact interactive button hit areas from 28px to 32px+, and increase mobile drawer link heights from 36px to 40px for WCAG touch ergonomics.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript 5, Tailwind CSS, Node.js Native Test Runner (`node:test` + `node:assert`).

**Spec:** Section 2 and Recommendations of the Navbar Padding & Margin Evaluation.

## Global Constraints

- **Single Source of Truth (SSOT):** Do not introduce inline custom styles or arbitrary pixel hacks where standard Tailwind spacing tokens (`p-2`, `py-2.5`) apply cleanly.
- **Visual Invariants:** Do not alter the outer header height (`h-16`, 64px) or the horizontal gutter alignment (`max-w-[1600px] px-4 md:px-6 lg:px-8`).
- **Regression Invariants:** All existing 107 tests in `npm test` must continue to pass without regression.
- **Language Standard:** Code, commit messages, and documentation must strictly remain in English.

---

### Task 1: Normalize Spacing and Click Target on UserNav Logout Action

**Files:**
- Modify: `src/components/layout/UserNav.tsx:42-49`
- Test: `test/navbar.test.ts`

**Interfaces:**
- Consumes: `useAuth()` hook from `src/hooks/useAuth.ts`, `LogOut` icon from `lucide-react`.
- Produces: Normalized logout button styling with balanced symmetrical margin and `32x32px` desktop hit target.

- [x] **Step 1: Write unit test asserting UserNav component structure and class tokens**

Add a test in `test/navbar.test.ts` to verify UserNav styling conventions:

```typescript
  await t.test('UserNav logout button uses normalized padding and eliminates redundant margin', () => {
    // Assert file contents to prevent regression of compounded spacing
    const fs = require('node:fs');
    const path = require('node:path');
    const userNavContent = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/layout/UserNav.tsx'),
      'utf-8'
    );

    // Button should use p-2 for 32x32px hit target and NOT contain redundant ml-2
    assert.match(userNavContent, /className="[^"]*p-2 text-gray-400[^"]*"/);
    assert.doesNotMatch(userNavContent, /className="[^"]*ml-2[^"]*"/);
  });
```

- [x] **Step 2: Run test to verify it fails**

Run:
```bash
node --test test/navbar.test.ts
```
Expected: FAIL with assertion matching failure (`UserNav.tsx` currently contains `ml-2 p-1.5`).

- [x] **Step 3: Update `UserNav.tsx` logout button classes**

Modify `src/components/layout/UserNav.tsx` lines 42-49:

```tsx
      <button
        onClick={logout}
        title="Keluar dari akun (退出)"
        className="p-2 text-gray-400 hover:text-[#ed1c24] hover:bg-rose-50 rounded-xl transition cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
      </button>
```

- [x] **Step 4: Run test to verify it passes**

Run:
```bash
node --test test/navbar.test.ts
```
Expected: PASS with 4/4 subtests passing.

- [x] **Step 5: Commit**

```bash
git add src/components/layout/UserNav.tsx test/navbar.test.ts
git commit -m "fix(nav): normalize UserNav logout button spacing and increase click target"
```

---

### Task 2: Enhance Touch Target Ergonomics in Mobile Drawer Navigation

**Files:**
- Modify: `src/components/layout/Navbar.tsx:136-155`
- Test: `test/navbar.test.ts`

**Interfaces:**
- Consumes: `NAV_ITEMS` from `src/components/layout/nav-config.ts`.
- Produces: Improved touch target height (40px) for mobile drawer links via `py-2.5`.

- [x] **Step 1: Write unit test asserting mobile drawer link ergonomics**

Add a test in `test/navbar.test.ts`:

```typescript
  await t.test('Navbar mobile drawer links conform to 40px touch ergonomic height', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const navbarContent = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/layout/Navbar.tsx'),
      'utf-8'
    );

    // Mobile links must use py-2.5 to provide optimal 40px touch height
    assert.match(navbarContent, /px-3 py-2\.5 rounded-lg text-sm/);
  });
```

- [x] **Step 2: Run test to verify it fails**

Run:
```bash
node --test test/navbar.test.ts
```
Expected: FAIL (`Navbar.tsx` currently contains `px-3 py-2`).

- [x] **Step 3: Update `Navbar.tsx` mobile drawer link padding**

Modify `src/components/layout/Navbar.tsx` around line 140:

```tsx
              <a
                key={item.id}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.id)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200'
                    : 'text-slate-600 hover:bg-slate-50 font-medium'
                }`}
              >
```

- [x] **Step 4: Run test to verify it passes**

Run:
```bash
node --test test/navbar.test.ts
```
Expected: PASS with 5/5 subtests passing.

- [x] **Step 5: Commit**

```bash
git add src/components/layout/Navbar.tsx test/navbar.test.ts
git commit -m "fix(nav): enhance mobile drawer navigation touch target height"
```

---

### Task 3: Full Suite Regression Verification & Production Build Validation

**Files:**
- Test: All test suites in `test/*.test.ts` and `test/**/*.test.ts`

- [x] **Step 1: Run complete test suite**

Run:
```bash
npm test
```
Expected: All tests pass with 0 failures.

- [x] **Step 2: Run TypeScript typecheck**

Run:
```bash
npx tsc --noEmit
```
Expected: 0 type errors.

- [x] **Step 3: Run Next.js production build**

Run:
```bash
npm run build
```
Expected: Successful Next.js build compilation without warnings or errors.
