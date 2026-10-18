# Instant Optimistic Navigation & Workspace Skeleton Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate perceived navigation lag between client-side pages by shifting the sidebar active highlight immediately (0ms) and rendering the skeleton loader in the workspace while the target page bundle and components resolve.

**Architecture:** A lightweight React `NavigationContext` provides single-source-of-truth tracking for `targetHref`. Clicking any sidebar navigation link instantly sets `targetHref`, highlights the destination route in the sidebar, and instructs `AppLayout` to display `<Loading />` (the root Suspense skeleton loader) inside the workspace container until Next.js updates `pathname`.

**Tech Stack:** Next.js 15.1.0, React 19, TypeScript, Node.js Test Runner (`node:test`, `node:assert/strict`).

**Spec:** [`docs/superpowers/specs/2026-10-18-instant-optimistic-navigation-design.md`](file:///Users/mac/Web%20Development/wood-inventory-management/docs/superpowers/specs/2026-10-18-instant-optimistic-navigation-design.md)

## Global Constraints
- **Strict LOC Limit**: All coordinator and layout components (`Sidebar.tsx`, `AppLayout.tsx`, `NavigationContext.tsx`) must strictly remain under 250 lines of code.
- **English-Only Standard**: All source code, comments, plans, and commit messages must strictly remain in English.
- **Zero External Dependencies**: Use standard React 19 primitives (`createContext`, `useContext`, `useState`, `useEffect`, `useCallback`) and `next/navigation`.
- **Resilience**: Safety timeout of 6000ms to guarantee optimistic loading states self-heal if navigation stalls.

---

### Task 1: NavigationContext & Custom Hook

**Files:**
- Create: `src/context/NavigationContext.tsx`
- Test: `test/navigation-context.test.ts`

**Interfaces:**
- Consumes: `useRouter`, `usePathname` from `next/navigation`
- Produces:
  ```typescript
  export interface NavigationContextValue {
    targetHref: string | null;
    isNavigating: boolean;
    navigateTo: (href: string) => void;
  }
  export function NavigationProvider({ children }: { children: React.ReactNode }): React.ReactElement;
  export function useNavigation(): NavigationContextValue;
  ```

- [ ] **Step 1: Write the failing unit test for `NavigationContext`**

Create `test/navigation-context.test.ts`:
```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('NavigationContext Architecture & Contract Suite', async (t) => {
  const contextFilePath = path.resolve(process.cwd(), 'src/context/NavigationContext.tsx');

  await t.test('src/context/NavigationContext.tsx exists and conforms to complexity budget (< 150 LOC)', () => {
    assert.ok(fs.existsSync(contextFilePath), 'NavigationContext.tsx must exist');
    const content = fs.readFileSync(contextFilePath, 'utf-8');
    const lineCount = content.split('\n').length;
    assert.ok(lineCount < 150, `NavigationContext.tsx has ${lineCount} lines, expected < 150`);
  });

  await t.test('exports NavigationProvider and useNavigation hook', () => {
    const content = fs.readFileSync(contextFilePath, 'utf-8');
    assert.match(content, /export\s+function\s+NavigationProvider\b/);
    assert.match(content, /export\s+function\s+useNavigation\b/);
    assert.match(content, /export\s+interface\s+NavigationContextValue\b/);
  });

  await t.test('implements targetHref, isNavigating, navigateTo, and safety timeout', () => {
    const content = fs.readFileSync(contextFilePath, 'utf-8');
    assert.match(content, /targetHref/);
    assert.match(content, /isNavigating/);
    assert.match(content, /navigateTo/);
    assert.match(content, /router\.push/);
    assert.match(content, /6000|SAFETY_TIMEOUT_MS/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/navigation-context.test.ts`
Expected: FAIL (file does not exist).

- [ ] **Step 3: Implement `src/context/NavigationContext.tsx`**

Write `src/context/NavigationContext.tsx`:
```typescript
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export interface NavigationContextValue {
  targetHref: string | null;
  isNavigating: boolean;
  navigateTo: (href: string) => void;
}

const NavigationContext = createContext<NavigationContextValue>({
  targetHref: null,
  isNavigating: false,
  navigateTo: () => {},
});

const SAFETY_TIMEOUT_MS = 6000;

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [targetHref, setTargetHref] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear pending target when destination pathname is reached
  useEffect(() => {
    setTargetHref(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [pathname]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const navigateTo = useCallback(
    (href: string) => {
      // Ignore navigation if already on the requested page or already transitioning to it
      if (href === pathname || href === targetHref) {
        return;
      }

      setTargetHref(href);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Safety timeout: reset targetHref if transition takes longer than 6 seconds
      timeoutRef.current = setTimeout(() => {
        setTargetHref(null);
      }, SAFETY_TIMEOUT_MS);

      // Trigger Next.js router transition in parallel
      router.push(href);
    },
    [pathname, targetHref, router]
  );

  const value: NavigationContextValue = {
    targetHref,
    isNavigating: Boolean(targetHref && targetHref !== pathname),
    navigateTo,
  };

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): NavigationContextValue {
  return useContext(NavigationContext);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/navigation-context.test.ts`
Expected: PASS (3/3 tests pass).

- [ ] **Step 5: Commit Task 1**

```bash
git add src/context/NavigationContext.tsx test/navigation-context.test.ts
git commit -m "feat(navigation): add NavigationContext and useNavigation hook"
```

---

### Task 2: Integrate NavigationProvider & Workspace Skeleton in AppLayout

**Files:**
- Modify: `src/components/layout/AppLayout.tsx:1-29`
- Test: `test/app-layout-navigation.test.ts`

**Interfaces:**
- Consumes: `NavigationProvider`, `useNavigation` from `@/src/context/NavigationContext`
- Consumes: `Loading` from `@/app/loading`
- Produces: `AppLayout` wrapper that renders `<Loading />` inside `<main>` whenever `targetHref && targetHref !== pathname`.

- [ ] **Step 1: Write the failing unit test for `AppLayout` navigation integration**

Create `test/app-layout-navigation.test.ts`:
```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('AppLayout Optimistic Navigation Suite', async (t) => {
  const layoutFilePath = path.resolve(process.cwd(), 'src/components/layout/AppLayout.tsx');

  await t.test('AppLayout.tsx imports NavigationProvider, useNavigation, and Loading skeleton', () => {
    const content = fs.readFileSync(layoutFilePath, 'utf-8');
    assert.match(content, /NavigationProvider/);
    assert.match(content, /useNavigation/);
    assert.match(content, /import\s+Loading\s+from\s+['"]@\/app\/loading['"]/);
  });

  await t.test('AppLayout conditionally displays Loading skeleton when targetHref is pending', () => {
    const content = fs.readFileSync(layoutFilePath, 'utf-8');
    assert.match(content, /targetHref/);
    assert.match(content, /<Loading\s*\/>/);
  });

  await t.test('AppLayout conforms to coordinator complexity budget (< 250 LOC)', () => {
    const content = fs.readFileSync(layoutFilePath, 'utf-8');
    const lineCount = content.split('\n').length;
    assert.ok(lineCount < 250, `AppLayout.tsx has ${lineCount} lines, expected < 250`);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/app-layout-navigation.test.ts`
Expected: FAIL (AppLayout does not yet import NavigationProvider).

- [ ] **Step 3: Update `src/components/layout/AppLayout.tsx`**

Modify `src/components/layout/AppLayout.tsx`:
```tsx
'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { NavigationProvider, useNavigation } from '@/src/context/NavigationContext';
import Loading from '@/app/loading';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { targetHref } = useNavigation();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <main className="min-h-screen">{children}</main>;
  }

  const isTransitionPending = Boolean(targetHref && targetHref !== pathname);

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f4f6]">
      {/* Sidebar Navigation (Desktop docked & Mobile slide-out drawer) */}
      <Sidebar />

      {/* Main Content Workspace with Desktop Sidebar Offset */}
      <div className="flex-1 min-w-0 lg:pl-64 flex flex-col min-h-screen transition-all duration-300">
        <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6">
          {isTransitionPending ? <Loading /> : children}
        </main>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavigationProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </NavigationProvider>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/app-layout-navigation.test.ts`
Expected: PASS (3/3 tests pass).

- [ ] **Step 5: Commit Task 2**

```bash
git add src/components/layout/AppLayout.tsx test/app-layout-navigation.test.ts
git commit -m "feat(layout): mount NavigationProvider and instant skeleton loader in AppLayout"
```

---

### Task 3: Integrate Optimistic Active State in Sidebar

**Files:**
- Modify: `src/components/layout/Sidebar.tsx:30-108`
- Test: `test/sidebar.test.ts`

**Interfaces:**
- Consumes: `useNavigation` from `@/src/context/NavigationContext`
- Produces:
  - `effectivePath = targetHref || pathname` for immediate 0ms active indicator shift
  - `navigateTo(item.href)` click handler on all nav items

- [ ] **Step 1: Write additional assertions in `test/sidebar.test.ts`**

Update `test/sidebar.test.ts` to assert:
```typescript
  await t.test('Sidebar integrates useNavigation for 0ms optimistic active highlighting', () => {
    const sidebarPath = path.resolve(process.cwd(), 'src/components/layout/Sidebar.tsx');
    const content = fs.readFileSync(sidebarPath, 'utf-8');
    assert.match(content, /useNavigation/);
    assert.match(content, /targetHref/);
    assert.match(content, /navigateTo/);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/sidebar.test.ts`
Expected: FAIL (`useNavigation` not yet imported in Sidebar).

- [ ] **Step 3: Update `src/components/layout/Sidebar.tsx`**

Integrate `useNavigation` in `src/components/layout/Sidebar.tsx`:
- Import `useNavigation` from `@/src/context/NavigationContext`.
- Read `{ targetHref, navigateTo } = useNavigation()`.
- Compute `const effectivePath = targetHref || pathname;`.
- Use `isNavItemActive(item.href, effectivePath)` for active styling.
- Intercept click with `onClick={(e) => { e.preventDefault(); setIsMobileOpen(false); navigateTo(item.href); }}`.
- Verify line count remains < 250 LOC.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/sidebar.test.ts`
Expected: PASS (all tests pass).

- [ ] **Step 5: Commit Task 3**

```bash
git add src/components/layout/Sidebar.tsx test/sidebar.test.ts
git commit -m "feat(sidebar): integrate optimistic navigation active tab highlighting"
```

---

### Task 4: Full Verification & Build Check

**Files:**
- All touched files

- [ ] **Step 1: Run production build verification**

Run: `npm run build:check`
Expected: Exit code 0, 15/15 static and dynamic pages generated with 0 errors.

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: All tests pass (0 failures).

- [ ] **Step 3: Verify line count invariant on all modified files**

Run:
```bash
wc -l src/context/NavigationContext.tsx src/components/layout/AppLayout.tsx src/components/layout/Sidebar.tsx app/loading.tsx
```
Expected: All files under 250 lines.
