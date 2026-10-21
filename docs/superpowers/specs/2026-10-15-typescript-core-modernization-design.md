# Design Spec: TypeScript Core Modernization (Retrospective)

**Document:** `docs/superpowers/specs/2026-10-15-typescript-core-modernization-design.md`
**Date:** 2026-10-15 (retrospectively documented 2026-10-21)
**Status:** Shipped — Retrospectively Documented
**Related Plan:** `docs/superpowers/plans/2026-10-15-typescript-core-modernization.md`

> **Note on Retrospective Specs:** This spec was created after implementation to satisfy the Spec-Plan pairing invariant. Design detail lives in the paired plan file.

---

## 1. Executive Summary

Migrated remaining JavaScript modules in `src/` to strict TypeScript, enabling Node.js 22+ native type-stripping without a build step for development.

## 2. Decision Captured

- Target: Node.js 22+ with native TypeScript execution (`node --test`, `node script.ts`).
- No separate transpilation step for development; Next.js handles production builds.
- Strict mode enabled with `exactOptionalPropertyTypes: true`.
- All domain shapes centralized in `src/types/index.ts` (SSOT invariant birth).

## 3. Shipped Artifacts

- `tsconfig.json` with strict config.
- `src/` fully `.ts` / `.tsx`.
- Legacy shadow `.js` files removed (per commit `cb01ff8`).
- All test files use `node:test` native runner, zero Jest/Vitest dependency.

## 4. References

- Plan: `docs/superpowers/plans/2026-10-15-typescript-core-modernization.md`
- Architecture: `docs/architecture-system-invariants.md` Section 1.1
