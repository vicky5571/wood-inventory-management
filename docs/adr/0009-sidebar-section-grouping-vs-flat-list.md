# ADR-0009: Sidebar Section Grouping (Not Flat List, Not Collapsible)

**Date:** 2026-10-22
**Status:** Accepted
**Deciders:** Owner + AI pair session

---

## Context

Sidebar nav grew from 7 items (initial design) to 14 items (after 7 feature modules shipped). Operators report scanning cost — items most used by yard staff (tally, sales, production, sorting) are scattered across the flat list, not clustered.

Three structural options were evaluated:

- **Flat list** (current): all 14 items under 2 broad groups (OPERASIONAL + SISTEM)
- **Grouped with section headers**: items organized into 5 semantic sections, headers non-clickable
- **Collapsible sections**: grouped + user can expand/collapse per section with state persistence

Project context:
- Target user: yard operators + finance + owner
- Device mix: desktop (office) + tablet (yard mobile drawer)
- Expected growth: 2-3 more items likely in next 6 months (Lembar Tagihan sub-views, DPB Rakyat future)
- No current analytics on nav click frequency

---

## Decision

**Grouped sidebar with 5 non-clickable section headers. No collapsible behavior.**

Sections ordered by workflow frequency (per spec Section 2.1):

1. **Dashboard** (1 item) — entry point
2. **Operasi Harian** (5 items) — core daily workflow
3. **Stok & Tagihan** (3 items) — follow-up state
4. **Data Master** (3 items) — periodic setup
5. **Admin** (2 items) — Owner-focused

Section headers use existing uppercase gray-400 style; items retain existing icon-based rendering.

---

## Rejected Alternatives

### Alternative A: Keep flat list, just reorder
**Rejected because:**
- Still exposes 14 items at once, violating Miller's Law (7±2 chunk limit).
- No visual landmarks for muscle memory — users still scan linearly.
- Doesn't scale as items are added (18 items flat would be worse).
- Marginal improvement; cognitive load problem unresolved.

### Alternative B: Collapsible sections with persisted state
**Rejected because:**
- Adds significant state complexity (localStorage per-section, animations, default collapse state decisions).
- One extra click per access to items in collapsed sections — hurts frequent-item flow.
- Risk of operator losing track of features in collapsed sections (hidden = forgotten).
- Over-engineered for current 14-item count.
- Can be added later if count reaches 20+ without breaking current design (NAV_SECTIONS structure already supports it).

### Alternative C: Mega-menu / tabbed secondary nav
**Rejected because:**
- Introduces new interaction pattern inconsistent with current enterprise sidebar.
- Requires rework of mobile drawer flow.
- Doesn't solve the "find the item" problem — just shifts it to tab selection.

### Alternative D: Role-only filtering (no grouping)
**Rejected because:**
- Role filter alone leaves 11-13 items flat for most users — still over cognitive limit.
- Section headers add zero visual cost (uppercase labels inline).
- Grouping + role filter are orthogonal benefits; both applied together.

---

## Consequences

### Positive
- **5 sections × ~3 items average** falls within Miller's Law (7±2 chunk limit).
- **Visual landmarks** (section headers) enable rapid muscle-memory navigation.
- **Scalable** — new items naturally slot into existing sections (operation vs stock vs master data vs admin).
- **No new interaction patterns** — section headers are static text, same click behavior on items.
- **Clear semantic mapping** — "where is tally?" → "operations" is intuitive.
- **Consistent with enterprise app convention** (Figma, Linear, Jira all use this pattern).

### Negative / Trade-offs
- **Vertical space cost** — section headers take ~24px each × 5 = 120px vertical. Still fits in standard sidebar height (desktop + mobile drawer).
- **No user customization** — users can't collapse sections they don't use.
  - Mitigation: role-based filter (ADR-0010) hides irrelevant items entirely for non-Owner roles.
- **Section boundary friction** — if a user disagrees with section placement (e.g., "Produksi should be in Stok & Tagihan"), there's no override. Hard-coded in config.
  - Mitigation: section mapping is a one-time decision based on workflow; changeable via future ADR if feedback shows systematic misalignment.
- **Decision complexity for new items** — future contributor must decide which section a new nav item belongs to.
  - Mitigation: section descriptions in spec Section 2.1 provide guidance.

### Follow-up Obligations
- If nav items grow to 20+, revisit this ADR and consider collapsible (Alternative B).
- If analytics data (future) shows users miss items in a section, consider renaming the section or moving the item.
- When adding future items (DPB Rakyat, Lembar Tagihan sub-pages, etc.), explicitly document which section they belong to in their respective specs.
- Monitor user feedback for 1-2 weeks post-ship; be prepared to adjust section ordering based on observed usage patterns.

---

## References

- Spec: `docs/superpowers/specs/2026-10-22-sidebar-grouping-and-role-filter-design.md`
- Plan: `docs/superpowers/plans/2026-10-22-sidebar-grouping-and-role-filter.md`
- Related: ADR-0010 (Role-based nav filter — complementary decision)
- UX references: Miller's Law (7±2 chunks), Hick's Law (decision time grows with option count)
