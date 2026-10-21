# Design Spec: Remove Emojis from UI (Retrospective)

**Document:** `docs/superpowers/specs/2026-10-20-remove-emojis-from-ui-design.md`
**Date:** 2026-10-20 (retrospectively documented 2026-10-21)
**Status:** Shipped — Retrospectively Documented
**Related Plan:** `docs/superpowers/plans/2026-10-20-remove-emojis-from-ui.md`

> **Note on Retrospective Specs:** This spec was created after implementation to satisfy the Spec-Plan pairing invariant. Design detail lives in the paired plan file.

---

## 1. Executive Summary

Removed all emoji characters from UI code and replaced them with Lucide React icon components for consistency, accessibility, and i18n neutrality.

## 2. Decision Captured

- Emojis render inconsistently across OS/browser platforms (Apple vs Google vs Microsoft styles differ significantly).
- Emoji sets are not i18n-neutral — some have cultural connotations.
- Lucide React provides stroke-based icons with consistent visual language, color inheritance via `currentColor`, and tree-shaking support.
- Emoji usage flagged by regression test to prevent reintroduction.

## 3. Shipped Artifacts

- All UI components refactored to use Lucide icons.
- `test/emoji-hygiene.test.ts` — regression test scanning source files for emoji code points.
- Documentation updated to reflect Lucide-only icon convention.

## 4. References

- Plan: `docs/superpowers/plans/2026-10-20-remove-emojis-from-ui.md`
- Commit: `0f32c9b`
