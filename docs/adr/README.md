# Architecture Decision Records (ADR)

This directory contains Architecture Decision Records — short documents capturing non-obvious design choices, their rationale, and consequences.

## When to Write an ADR

Create a new ADR when you make a decision that:
- Is NOT explicitly covered by an existing spec
- Rejects an obvious or commonly-used alternative
- Has long-term consequences on how the system evolves
- Future maintainers (human or AI) might question or try to "fix"

**Rule of thumb:** If someone 6 months from now might ask "why did we do this instead of X?", write an ADR.

## When NOT to Write an ADR

- Trivial implementation choices (variable naming, local refactoring).
- Decisions explicitly specified in a spec file.
- Experimental/temporary code that will be removed soon.

## Naming Convention

`NNNN-<kebab-case-slug>.md` where `NNNN` is a monotonically increasing 4-digit number.

Examples:
- `0001-dual-mode-persistence-sqlite-and-supabase.md`
- `0002-null-vs-zero-for-pending-price.md`

## File Format

Use `template.md` as the starting point for every new ADR.

## Status Values

- **Proposed** — Under discussion, not yet decided.
- **Accepted** — Decision taken, in effect.
- **Deprecated** — No longer recommended but may still exist in codebase.
- **Superseded by ADR-NNNN** — Replaced by a newer decision.

## Index

| ADR | Title | Status |
|---|---|---|
| 0001 | Dual-Mode Persistence (SQLite Local + Supabase Cloud) | Accepted |
| 0002 | NULL vs Zero Sentinel for Pending Timber Price | Accepted |
| 0003 | Loose String-Match Linkage for Contract-Record Association | Accepted |
| 0004 | Broker as Separate Entity (Not Supplier Subtype) | Accepted |
| 0005 | Free-Text Autocomplete Over Master Catalog for Production Products | Accepted |
| 0006 | Pre-printed Form Number — Manual User Input (Not Auto-Generated) | Accepted |
| 0007 | Terbilang (Amount-in-Words) — Zero-Dependency Internal Implementation | Accepted |
