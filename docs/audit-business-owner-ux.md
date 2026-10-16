# Diagnostic & UX Audit — Wood Inventory Management (Business Owner Perspective)

**Target View / Subsystem:** Ledger Receiving Flow & Executive Dashboard  
**Scope Files:**
- [RecordModal.tsx](file:///Users/mac/Web%20Development/wood-inventory-management/src/components/ledger/RecordModal.tsx) (512 lines, receiving record creation & editing modal)
- [TallyDimensionCalculator.tsx](file:///Users/mac/Web%20Development/wood-inventory-management/src/components/ledger/TallyDimensionCalculator.tsx) (162 lines, physical dimension tally calculator)
- [Toolbar.tsx](file:///Users/mac/Web%20Development/wood-inventory-management/src/components/ledger/Toolbar.tsx) (87 lines, search, filter, and record action toolbar)
- [RecordTable.tsx](file:///Users/mac/Web%20Development/wood-inventory-management/src/components/ledger/RecordTable.tsx) (234 lines, multi-column ledger receiving grid)
- [KpiCards.tsx](file:///Users/mac/Web%20Development/wood-inventory-management/src/components/dashboard/KpiCards.tsx) (105 lines, executive KPI metric cards)

**Audit Date:** 2026-10-16  
**Overall Verdict:** The platform provides a sleek, cohesive dark aesthetic and solid real-time calculation logic, but suffers from significant operational friction for business owners and yard managers: a dense 19+ field single-step modal without auto-save/draft resilience, no date-range filtering, unexplained discrepancy logic, missing financial/business KPIs, and lack of critical feedback mechanisms (no toast confirmations, dangerous unconfirmed actions).

---

## 1. Executive Summary & Defect Scorecard

| Priority | Category | Finding | Impact | Reference |
| :--- | :--- | :--- | :--- | :--- |
| **P0** | Resilience / UX | Single-shot 19+ field modal without draft persistence | In-yard interruptions wipe unsubmitted truck deliveries | [RecordModal.tsx:L60-L101](file:///Users/mac/Web%20Development/wood-inventory-management/src/components/ledger/RecordModal.tsx#L60-L101) |
| **P0** | Domain Integrity | Missing client-side boundary and negative number validation | Zero volume, negative prices, or typos corrupt ledger integrity | [RecordModal.tsx:L87-L95](file:///Users/mac/Web%20Development/wood-inventory-management/src/components/ledger/RecordModal.tsx#L87-L95) |
| **P0** | Usability / Filtering | Date range filtering missing from Toolbar UI | Owners cannot isolate weekly or monthly batches/cash outlays | [Toolbar.tsx:L40-L86](file:///Users/mac/Web%20Development/wood-inventory-management/src/components/ledger/Toolbar.tsx#L40-L86) |
| **P1** | Data Standardization | Free-text timber species input field | RESOLVED: Replaced with SpeciesCombobox supporting curated varieties & custom entry | [RecordModal.tsx:L245-L255](file:///Users/mac/Web%20Development/wood-inventory-management/src/components/ledger/RecordModal.tsx#L245-L255) |
| **P1** | User Feedback | Silent modal dismissal on submission without toast feedback | RESOLVED: Immediate non-blocking toast notification confirming plate, volume, and species on save/update | [RecordModal.tsx:L87-L115](file:///Users/mac/Web%20Development/wood-inventory-management/src/components/ledger/RecordModal.tsx#L87-L115) |
| **P1** | Data Safety | Unforgiving record deletion with zero undo window | RESOLVED: Soft-delete with immediate 5-second undo toast & position restoration | [RecordTable.tsx:L190-L196](file:///Users/mac/Web%20Development/wood-inventory-management/src/components/ledger/RecordTable.tsx#L190-L196) |
| **P1** | Information Architecture | 14 unprioritized table columns require horizontal scroll | Crucial discrepancy and totals pushed off-screen on laptops | [RecordTable.tsx:L45-L68](file:///Users/mac/Web%20Development/wood-inventory-management/src/components/ledger/RecordTable.tsx#L45-L68) |
| **P2** | Workflow Friction | Tally dimension calculator hidden in collapsed accordion | Users manually calculate volume off-app; unit confusion (cm vs m) | [TallyDimensionCalculator.tsx:L40-L75](file:///Users/mac/Web%20Development/wood-inventory-management/src/components/ledger/TallyDimensionCalculator.tsx#L40-L75) |
| **P2** | Executive Analytics | Volume-only KPIs with missing business metrics | No average cost/m³, discrepancy rates, or supplier exposure | [KpiCards.tsx:L32-L78](file:///Users/mac/Web%20Development/wood-inventory-management/src/components/dashboard/KpiCards.tsx#L32-L78) |
| **P2** | Operational Safety | "Reset Demo" button prominently styled next to primary CTA | Risk of inadvertent demo wipe during normal warehouse operations | [Toolbar.tsx:L76-L84](file:///Users/mac/Web%20Development/wood-inventory-management/src/components/ledger/Toolbar.tsx#L76-L84) |
| **P3** | Domain Guidance | Unexplained "Surplus/Deficit" discrepancy badges | Owners unsure whether shortfall is normal shrinkage or vendor fraud | [RecordTable.tsx:L129-L141](file:///Users/mac/Web%20Development/wood-inventory-management/src/components/ledger/RecordTable.tsx#L129-L141) |
| **P3** | Tax & Accounting Clarity | Inconsistent tax input modes (fixed IDR vs rate %) without PPh context | Operators unsure whether PPh 22, 23, or final tax applies | [RecordModal.tsx:L360-L395](file:///Users/mac/Web%20Development/wood-inventory-management/src/components/ledger/RecordModal.tsx#L360-L395) |
| **P3** | Factory Utility | Missing printable ledger view / PDF export | Cannot provide physical receiving receipts to drivers or foremen | [RecordTable.tsx](file:///Users/mac/Web%20Development/wood-inventory-management/src/components/ledger/RecordTable.tsx) |

---

## 2. In-Depth Confusing Steps & Friction Points

### 2.1 Wall of Form Fields Without Progressive Disclosure
The "Input Penerimaan Kayu Baru" modal crams 4 dense phases into a single continuous scrolling container:
1. **Documents & Delivery** (Date, Plate, Supplier, Driver, SKSHHK, Contract Number)
2. **Wood Specs & Kavling** (Kavling Batch, Species, Wood Quality, Wood Length)
3. **Physical Measurement — Delivered vs Tally** (Delivered Logs, Delivered Volume, Tally Logs, Tally Volume + Calculator)
4. **Pricing, Freight & Tax** (Timber Price/m³, PPh Rate %, Freight Rate/m³, Freight PPh IDR, Broker Commission)

**Business Owner Friction:**
- Sawmill receiving takes place in noisy, outdoor environments. An operator entering measurements is interrupted frequently. Closing the modal or refreshing completely destroys entered data.
- The real-time reconciliation banner is anchored at the bottom of the scroll container; users adjusting prices or tally numbers at the top cannot see the bottom-line calculation update without scrolling back and forth.

### 2.2 Unclear Discrepancy Reconciliation Workflow
In timber log operations, discrepancies between the delivery note (*Surat Jalan*) and the yard check (*Tally Fisik / 检尺*) determine supplier billing deductions and transport dispute claims.
- The UI places "Batang Surat Jalan" alongside "Batang Tally Fisik" without clear contextual cues.
- The discrepancy indicator displays green (surplus) or red (deficit), but fails to explain business implications:
  - Is a 2% volume difference within acceptable natural shrinkage tolerance?
  - Does the invoice calculate payable amounts based on *Delivered* or *Tally* volume?

### 2.3 Unit Mismatch & Disconnected Dimension Calculator
- `TallyDimensionCalculator` prompts for Thickness (T), Width (L), and Length (P) in **centimeters (cm)**.
- In contrast, the parent modal's `woodLengthM` is defined in **meters (m)**.
- The calculator assumes homogeneous log dimensions across the batch. In practice, timber batches contain variable girths.
- There is no reactive synchronization: editing calculated volumes directly in the input breaks any tie with the calculator values.

### 2.4 High-Risk Destructive Actions in Prime Real Estate
- The `Reset Demo` button is positioned directly adjacent to `Input Penerimaan` (the primary business CTA) in [Toolbar.tsx](file:///Users/mac/Web%20Development/wood-inventory-management/src/components/ledger/Toolbar.tsx#L76-L84).
- Ledger deletions rely on standard browser `confirm()` with immediate non-reversible localStorage mutation, risking accidental data destruction in operational contexts.

---

## 3. Layout Cascade & Viewport Architecture

```text
div.flex.h-screen.w-screen.overflow-hidden
├─ aside.sidebar (Desktop navigation)
└─ main.flex-1.flex.flex-col.h-full.overflow-hidden
   ├─ header.navbar (Tenant, Role badge, Quick actions)
   └─ div.flex-1.overflow-y-auto.p-6
      ├─ section.kpi-cards (Volume-heavy, missing financial ratios)
      ├─ section.toolbar (Search + species filter; 🔴 missing date pickers)
      └─ div.table-container.overflow-x-auto
         └─ table (14 columns 🔴 mandatory horizontal scroll, no sticky date/actions)
```

---

## 4. Prioritized Remediation Roadmap

### Phase 1: Data Resilience & Immediate Usability (P0)
- [ ] **Auto-Draft Persistence:** Persist partially entered records to `localStorage` key `wood_receiving_draft` with auto-restore and "Clear Draft" button.
- [ ] **Input Validation:** Enforce positive numbers for quantities/rates, validate required document numbers, and provide clear inline error highlights.
- [ ] **Date-Range Filtering:** Expose `startDate` and `endDate` pickers in `Toolbar.tsx` wiring into the existing `RecordFilterCriteria`.

### Phase 2: Workflow Refinement & Data Standardization (P1)
- [x] **Species Combobox (Done):** Replaced free-text input with `SpeciesCombobox` component, backed by curated tropical timber varieties (`timber-species.ts`) and dynamic record learning with custom entry support.
- [x] **Save Feedback (Done):** Added non-blocking toast notification system (`Toast.tsx`, `toast-store.ts`) triggered immediately on modal submission with truck plate, tally volume, and timber species breakdown.
- [x] **Undo Support (Done):** Implemented soft-delete in `useWoodRecords.ts` and `RecordTable.tsx` with non-blocking 5-second undo toast (`Urungkan (撤销)` action) restoring original item index and persistent storage.
- [ ] **Table Ergonomics:** Make the Date/ID column sticky on the left, make Actions sticky on the right, and add responsive column toggling.

### Phase 3: Financial Analytics & Physical Utility (P2 - P3)
- [ ] **Business-Oriented KPI Metrics:** Introduce average cost/m³ (`Rp/m³`), total discrepancy volume rate (`%`), and pending supplier balance.
- [ ] **Relocate Demo Reset:** Move `Reset Demo` to user profile menu or settings view with secondary confirmation modal.
- [ ] **Print/Export Engine:** Provide clean print stylesheet (`@media print`) and CSV/PDF export for yard delivery receipts.
