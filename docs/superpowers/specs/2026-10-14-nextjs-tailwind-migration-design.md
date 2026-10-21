# Design Spec: Next.js + Tailwind CSS Migration (Retrospective)

**Document:** `docs/superpowers/specs/2026-10-14-nextjs-tailwind-migration-design.md`
**Date:** 2026-10-14 (retrospectively documented 2026-10-21)
**Status:** Shipped — Retrospectively Documented
**Related Plan:** `docs/superpowers/plans/2026-10-14-nextjs-tailwind-migration.md`

> **Note on Retrospective Specs:** This spec was created after implementation to satisfy the Spec-Plan pairing invariant. Design detail lives in the paired plan file. For architectural rationale on this project's framework choices, see ADR-0001.

---

## 1. Executive Summary

Migrated the Wood Stock Management prototype from vanilla ESM + static HTML into a Next.js 15 App Router application with React 19 and Tailwind CSS 3.4 for styling.

## 2. Decision Captured

- Framework: **Next.js 15 App Router** (not Pages Router) for file-based routing and React Server Components support.
- Styling: **Tailwind CSS 3.4** with CSS Custom Properties for design tokens (timber palette, dimensional grids, typography).
- Build target: Node.js 22+ native ESM with TypeScript type-stripping.
- Zero external state management library (React state + hooks only).

## 3. Shipped Artifacts

- `app/` directory with App Router pages (`/`, `/ledger`, `/tally`, `/sales`, etc.)
- `tailwind.config.ts` + `postcss.config.mjs`
- `app/globals.css` with design token definitions
- Component tree under `src/components/`

## 4. References

- Plan: `docs/superpowers/plans/2026-10-14-nextjs-tailwind-migration.md`
- Architecture: `docs/architecture-system-invariants.md` Section 1.1
