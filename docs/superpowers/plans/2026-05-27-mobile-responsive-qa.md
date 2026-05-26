# Mobile Responsive QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ปรับ Frontend ของ Asset Management System ให้ใช้งานบนมือถือได้จริง โดยไม่เปลี่ยน Business Logic, API contract หรือ workflow เดิม

**Architecture:** แก้แบบ incremental จาก shared responsive primitives ก่อน แล้วไล่ไปยัง mobile field workflows และ data-heavy pages. Desktop layout ต้องคงพฤติกรรมเดิม ส่วน mobile ใช้ pattern เดียวกันทั้งระบบ: safe shell, stacked forms, contained table scroll หรือ mobile card list, action rows ที่แตะง่าย และ preview scale ที่แยกจาก print CSS.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS utilities, lucide-react, existing shared UI helpers in `src/lib/design-system.ts`, existing components under `src/components/ui`.

---

## Scope Guard

- ห้าม rewrite หน้าใหม่ทั้งก้อน
- ห้ามเปลี่ยน Business Logic
- ห้ามเปลี่ยน API contract ยกเว้นพบ layout bug ที่จำเป็นจริง และต้องแยก commit
- ห้ามลบ workflow เดิม
- ห้ามเปลี่ยนขนาด print จริงของ asset label ถ้าแก้แค่ preview
- ให้ commit แยกตามเฟสหรือหัวข้อย่อย เพื่อ review ง่าย

## Routes To QA

ทดสอบด้วย viewport `375x812`, `390x844`, `414x896`, `768x1024`

- `/th/dashboard`
- `/th/assets`
- `/th/assets/new`
- `/th/assets/{id}`
- `/th/asset-management/scan`
- `/th/asset-management/labels`
- `/th/asset-management/checkout`
- `/th/asset-management/checkin`
- `/th/asset-management/transfer`
- `/th/audit/rounds`
- `/th/audit/rounds/{id}`
- `/th/audit/rounds/{id}/scan`
- `/th/audit/findings`
- `/th/maintenance`
- `/th/maintenance/{id}`
- `/th/disposal`
- `/th/disposal/{id}`
- `/th/reports`
- `/th/work-center`
- `/th/admin/settings`
- `/th/admin/readiness`

## File Map

### Shared foundation

- Modify: `src/lib/design-system.ts`
- Modify: `src/components/ui/content-panel.tsx`
- Modify: `src/components/ui/filter-panel.tsx`
- Modify: `src/components/ui/mobile-action-bar.tsx`
- Create if repeated table conversion is needed: `src/components/ui/mobile-record-card.tsx`

### Shell and navigation

- Modify: `src/app/[locale]/(dashboard)/layout.tsx`
- Modify: `src/components/layout/topbar.tsx`
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/components/layout/global-search.tsx`

### Field workflows

- Modify: `src/components/ui/scanner-text-input.tsx`
- Modify: `src/components/assets/asset-scan-search-tool.tsx`
- Modify: `src/components/audit/audit-scan-form.tsx`
- Modify: `src/components/assets/asset-form.tsx`
- Modify: `src/components/assets/asset-batch-form.tsx`
- Modify: checkout/checkin/transfer route components found under `src/app/[locale]/(dashboard)/asset-management`

### Label preview

- Modify: `src/components/assets/asset-label-print.tsx`
- Modify: `src/components/assets/asset-label-batch-tool.tsx`
- Inspect only: `src/lib/asset-label-template.ts`
- Inspect only: `src/app/[locale]/(print)/assets/labels/page.tsx`
- Inspect only: `src/app/[locale]/(print)/assets/[id]/label/page.tsx`

### Data-heavy pages

- Modify: `src/components/assets/asset-register-table.tsx`
- Modify: `src/app/[locale]/(dashboard)/audit/findings/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/maintenance/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/disposal/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/disposal/[id]/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/reports/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/work-center/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/admin/settings/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/admin/readiness/page.tsx`
- Modify as needed: `src/components/admin/system-settings-form.tsx`

---

## Phase 1: Mobile Foundation And Shell

**Goal:** ทำให้ layout หลักและ shared components ไม่ดันหน้าจอล้นขวา ก่อนแตะหน้าเฉพาะทาง

**Expected commit:** `Improve mobile responsive foundation`

### Task 1.1: Baseline QA Snapshot

**Files:**
- Read: all routes listed in "Routes To QA"
- No code change

- [ ] Start or confirm dev server on `http://localhost:3000`.

Run:

```powershell
curl.exe -I http://localhost:3000/th/dashboard
```

Expected: HTTP status is `200`, `302`, or authenticated redirect that still proves the server is reachable.

- [ ] For each route and viewport, check body overflow with browser console:

```js
({
  width: window.innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
  overflowing: document.documentElement.scrollWidth > window.innerWidth,
})
```

Expected: record every route where `overflowing` is `true`.

- [ ] Capture screenshots for the worst pages into `output/mobile-qa/`.

Expected: at least one screenshot each for a shell page, a table page, a form page, a scanner page, and a label preview page.

### Task 1.2: Add Shared Responsive Helpers

**Files:**
- Modify: `src/lib/design-system.ts`

- [ ] Add helpers that can be reused without changing workflow logic.

Implementation shape:

```ts
export function getResponsiveActionRowClasses() {
  return "flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
}

export function getResponsiveTableScrollClasses() {
  return "w-full max-w-full overflow-x-auto overscroll-x-contain rounded-md border border-border"
}

export function getMobileCardListClasses() {
  return "grid gap-3 md:hidden"
}

export function getDesktopTableOnlyClasses() {
  return "hidden md:block"
}

export function getMobileSafeBottomPaddingClasses() {
  return "pb-24 sm:pb-0"
}

export function getTouchIconButtonClasses() {
  return "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
}
```

Expected: helpers are additive and do not break existing imports.

### Task 1.3: Make Shared Panels Mobile-safe

**Files:**
- Modify: `src/components/ui/content-panel.tsx`
- Modify: `src/components/ui/filter-panel.tsx`
- Modify: `src/components/ui/mobile-action-bar.tsx`

- [ ] Reduce mobile padding and force `min-w-0` on panel containers.
- [ ] Ensure panel actions use `w-full` on mobile and wrap on `sm`.
- [ ] Ensure `MobileActionBar` labels truncate safely and do not hide the last field by requiring caller pages to add bottom padding where it appears.

Expected: panels do not create horizontal overflow at `375px`.

### Task 1.4: Fix Dashboard Shell, Topbar, Sidebar

**Files:**
- Modify: `src/app/[locale]/(dashboard)/layout.tsx`
- Modify: `src/components/layout/topbar.tsx`
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/components/layout/global-search.tsx`

- [ ] Add `max-w-full` and `min-w-0` to the shell content regions that contain children.
- [ ] Topbar mobile rule: menu button, global search trigger, scan/search/notification/user controls must remain tappable and not overlap.
- [ ] Popovers must use mobile-safe width such as `w-[calc(100vw-2rem)] max-w-80`.
- [ ] Sidebar menu items should have at least `min-h-11` on mobile.
- [ ] Global search dialog/panel must not exceed viewport width.

Expected: `/th/dashboard` has no body horizontal scroll at 375px and topbar controls remain usable.

### Task 1.5: Verify Phase 1

Run:

```powershell
npm run lint
```

Expected: command exits `0`.

Run targeted manual QA:

```js
document.documentElement.scrollWidth <= window.innerWidth
```

Expected: `true` for `/th/dashboard`, `/th/assets`, `/th/admin/settings` at 375px.

---

## Phase 2: Mobile Field Workflows

**Goal:** ทำให้หน้าที่ใช้มือถือหน้างานใช้งานได้จริงก่อน เพราะเป็น workflow ที่มีผลกับ scan, audit, evidence และการจัดการทรัพย์สิน

**Expected commits:**
- `Improve mobile scanner workflows`
- `Improve mobile asset forms`

### Task 2.1: Improve QR Scanner Layout

**Files:**
- Modify: `src/components/ui/scanner-text-input.tsx`
- Modify: `src/components/assets/asset-scan-search-tool.tsx`
- Modify: `src/components/audit/audit-scan-form.tsx`

- [ ] Scanner box must fit within the viewport width with `max-w-full`.
- [ ] Use a QR box size around `min(viewport width - 48px, 320px)` for mobile.
- [ ] Manual input fallback must be visible without scrolling past multiple dense controls.
- [ ] Start/stop/save/retry actions must stack on mobile and wrap on tablet.
- [ ] Result cards must use `min-w-0`, `break-words`, and readable spacing.
- [ ] Offline queue/sync banner must not cover scanner or save action.

Expected: `/th/asset-management/scan` and `/th/audit/rounds/{id}/scan` fit at 375px without horizontal page scroll.

### Task 2.2: Improve Asset Create And Batch Create Forms

**Files:**
- Modify: `src/components/assets/asset-form.tsx`
- Modify: `src/components/assets/asset-batch-form.tsx`

- [ ] Form grids must be one column below `sm`, two columns only when there is enough width.
- [ ] Searchable dropdown containers must use `min-w-0` and viewport-safe popup width.
- [ ] Bottom save controls must stack on mobile.
- [ ] Batch table must not force body overflow. Use mobile row cards for per-item fields if the current table remains too wide.
- [ ] Keep the current batch workflow: shared fields stay shared, per-item fields remain only fields that vary per row.

Expected: `/th/assets/new` can create single or batch assets on mobile without fields wider than screen.

### Task 2.3: Improve Checkout, Checkin, Transfer Forms

**Files:**
- Inspect and modify route components under `src/app/[locale]/(dashboard)/asset-management/checkout`
- Inspect and modify route components under `src/app/[locale]/(dashboard)/asset-management/checkin`
- Inspect and modify route components under `src/app/[locale]/(dashboard)/asset-management/transfer`

- [ ] Keep existing form submission logic.
- [ ] Stack search, selected asset summary, responsible person/location fields, and action buttons on mobile.
- [ ] Make confirmation/summary sections readable with `break-words`.
- [ ] Ensure primary action remains visible after validation errors.

Expected: all three pages can be completed at 375px with no horizontal body scroll.

### Task 2.4: Improve Asset Detail Mobile Actions

**Files:**
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`
- Modify as needed: detail child components under `src/components/assets`

- [ ] Quick actions must wrap or move into `MobileActionBar`.
- [ ] Summary cards must collapse to one column.
- [ ] Timelines and ownership/handover sections must use readable card/list layout on mobile.
- [ ] Long asset codes, serial numbers, PO numbers, and URLs must use `break-words`.

Expected: `/th/assets/{id}` is readable on mobile and quick actions do not require retyping asset number.

### Task 2.5: Verify Phase 2

Run:

```powershell
npm run lint
```

Expected: command exits `0`.

Manual QA:
- `/th/assets/new`
- `/th/assets/{id}`
- `/th/asset-management/scan`
- `/th/asset-management/checkout`
- `/th/asset-management/checkin`
- `/th/asset-management/transfer`
- `/th/audit/rounds/{id}/scan`

Expected: no body horizontal scroll, primary mobile workflows remain usable.

---

## Phase 3: Tables, Lists, And Data-heavy Pages

**Goal:** แก้หน้าที่มีตาราง/รายการเยอะให้มือถืออ่านและกดได้ โดยไม่ทำให้ desktop table พัง

**Expected commits:**
- `Improve mobile asset and audit tables`
- `Improve mobile maintenance and disposal pages`
- `Improve mobile reports and work center pages`

### Task 3.1: Asset Register Mobile Card List

**Files:**
- Modify: `src/components/assets/asset-register-table.tsx`

- [ ] Keep desktop table for `md` and above.
- [ ] Add mobile card list for below `md`.
- [ ] Each card must show: asset code, asset name, status, current location, holder/custodian, key action link.
- [ ] Long values must wrap.
- [ ] Bulk actions must remain accessible without squeezing buttons into one row.

Expected: `/th/assets` does not horizontally scroll at 375px.

### Task 3.2: Audit Rounds And Findings

**Files:**
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/audit/findings/page.tsx`
- Modify as needed: `src/components/audit/audit-findings-batch-actions.tsx`
- Modify as needed: `src/components/audit/audit-finding-review-actions.tsx`

- [ ] Round list and finding list should use mobile cards or contained table scroll.
- [ ] Batch action bars must stack on mobile.
- [ ] Finding status, severity, location, asset, reviewer actions must remain visible.
- [ ] Audit progress bar must fit `375px` without clipping labels.

Expected: audit reviewer can review and act on findings from mobile.

### Task 3.3: Maintenance Pages

**Files:**
- Modify: `src/app/[locale]/(dashboard)/maintenance/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx`
- Modify as needed: `src/components/maintenance/maintenance-ticket-form.tsx`
- Modify as needed: `src/components/maintenance/maintenance-plan-form.tsx`
- Modify as needed: `src/components/maintenance/maintenance-attachments.tsx`

- [ ] Main maintenance tabs/view selector must fit mobile.
- [ ] Filter bar must stack into one column below `sm`.
- [ ] Ticket and PM plan lists must not force body overflow.
- [ ] Ticket/PM forms must stack fields and preserve attachment upload usability.
- [ ] Action buttons for close/generate/print must wrap or stack.

Expected: `/th/maintenance` and `/th/maintenance/{id}` are usable at 375px.

### Task 3.4: Disposal Pages

**Files:**
- Modify: `src/app/[locale]/(dashboard)/disposal/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/disposal/[id]/page.tsx`
- Modify as needed: `src/components/disposal/disposal-request-form.tsx`
- Modify as needed: `src/components/disposal/disposal-attachments.tsx`
- Modify as needed: `src/components/disposal/disposal-decision-button.tsx`
- Modify as needed: `src/components/disposal/disposal-execution-button.tsx`

- [ ] Disposal filter bar must stack on mobile.
- [ ] Disposal list must use mobile cards or contained table scroll.
- [ ] Decision/execution action groups must stack on mobile.
- [ ] Evidence upload and attachment previews must fit mobile.

Expected: disposal request and approval workflow remains usable on mobile.

### Task 3.5: Reports And Work Center

**Files:**
- Modify: `src/app/[locale]/(dashboard)/reports/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/work-center/page.tsx`

- [ ] Report filters must stack below `sm`.
- [ ] Report preview tables must scroll inside their container only.
- [ ] Chart containers must have responsive min height and not overflow.
- [ ] Work Center panels must collapse into one column and action cards must not squeeze buttons.

Expected: reports and work center do not create page-level horizontal scroll.

### Task 3.6: Admin Settings And Readiness

**Files:**
- Modify: `src/app/[locale]/(dashboard)/admin/settings/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/admin/readiness/page.tsx`
- Modify: `src/components/admin/system-settings-form.tsx`

- [ ] Settings tabs must scroll inside their own container if too wide.
- [ ] Settings section cards must use one-column forms on mobile.
- [ ] Readiness checklist tables/cards must fit mobile.
- [ ] Long env names, route names, URLs, and tokens must wrap.

Expected: admin pages can be reviewed and configured from tablet/mobile without layout break.

### Task 3.7: Verify Phase 3

Run:

```powershell
npm run lint
```

Expected: command exits `0`.

Manual QA all routes listed in "Routes To QA" with `375px` and `768px`.

Expected: no route has body-level horizontal overflow.

---

## Phase 4: Label Preview And Print Screen

**Goal:** ให้หน้า preview label ดูได้บนมือถือ โดยไม่เปลี่ยนขนาด print จริงที่ใช้กับ Brother tape

**Expected commit:** `Improve mobile label preview`

### Task 4.1: Separate Preview Scale From Print Size

**Files:**
- Modify: `src/components/assets/asset-label-print.tsx`
- Modify: `src/components/assets/asset-label-batch-tool.tsx`
- Inspect only: `src/lib/asset-label-template.ts`

- [ ] Keep print CSS using configured tape size.
- [ ] Apply preview scale only to screen preview container.
- [ ] Preview container must use `max-w-full overflow-x-auto`.
- [ ] Print/back/settings actions must wrap or stack on mobile.
- [ ] Keep Brother guidance visible but concise on mobile.

Expected: `/th/asset-management/labels` preview is readable on mobile and print dimensions remain unchanged.

### Task 4.2: Verify Phase 4

Manual QA:
- `/th/asset-management/labels`
- print route preview under `/th/assets/{id}/label` or equivalent print route

Expected: screen preview does not overflow body; `@media print` still uses configured label dimensions.

---

## Phase 5: Accessibility, Touch UX, And Regression Pass

**Goal:** ตรวจให้ mobile UX ใช้งานด้วยนิ้วจริงได้ และไม่ทำให้ desktop เสีย

**Expected commit:** `Polish mobile accessibility and responsive QA`

### Task 5.1: Touch Target And Focus Pass

**Files:**
- Modify files changed in phases 1-4 only

- [ ] Icon-only buttons must have `aria-label`.
- [ ] Primary tappable controls must be at least `44px` high or wide on mobile.
- [ ] `focus-visible` must remain visible on buttons, links, inputs, selects, and dialogs.
- [ ] Error text must wrap and not push layout wider than viewport.

Expected: key controls meet basic mobile accessibility expectations.

### Task 5.2: Desktop Regression Pass

Manual QA at desktop width:
- `/th/dashboard`
- `/th/assets`
- `/th/assets/new`
- `/th/maintenance`
- `/th/audit/findings`
- `/th/admin/settings`

Expected: desktop table layouts and form grids still look like operational dashboard UI, not oversized mobile cards.

### Task 5.3: Full Verification

Run:

```powershell
npm run lint
```

Expected: exits `0`.

Run:

```powershell
npm test
```

Expected: exits `0`.

Run:

```powershell
npm run build
```

Expected: exits `0`.

Run:

```powershell
npm run verify
```

Expected: exits `0`.

### Task 5.4: Documentation And Handoff Update

**Files:**
- Modify: `DEVELOPER_HANDOFF.md`
- Modify if useful: `docs/99_CHANGELOG.md`

- [ ] Add a short Mobile Responsive QA entry listing changed areas.
- [ ] Record manual QA routes and viewport sizes.
- [ ] Record known items that require real mobile device testing: camera permission, barcode/QR scan, file upload/camera capture, Brother print dialog.

Expected: next developer understands what was improved and what still needs real-device validation.

---

## Recommended Execution Order

1. Phase 1: foundation and shell
2. Phase 2.1: scanner workflows
3. Phase 2.2-2.4: forms and asset detail
4. Phase 3.1-3.2: asset and audit data-heavy pages
5. Phase 3.3-3.6: maintenance, disposal, reports, work center, admin
6. Phase 4: label preview
7. Phase 5: accessibility, verification, handoff

## Phase-by-Phase Execution Protocol

ทุกเฟสต้องปิดงานด้วยขั้นตอนเดียวกัน เพื่อให้ตรวจย้อนหลังง่ายและไม่ปล่อยงานค้าง:

1. ทำ QA ก่อนแก้ โดยดู route ที่เกี่ยวข้องใน viewport `375px`, `390px`, `414px`, และ `768px`
2. แก้เฉพาะ layout/responsive/touch/accessibility ของเฟสนั้น
3. รัน `npm run lint` อย่างน้อยทุกเฟส
4. ถ้าเฟสนั้นแตะ form, scan, หรือ table logic ให้รัน `npm test` เพิ่ม
5. อัพเดท `DEVELOPER_HANDOFF.md` ด้วยหัวข้อสั้น ๆ ว่าเฟสนั้นแก้อะไร, route ไหนที่ตรวจ, และมีจุดไหนต้องทดสอบบนมือถือจริง
6. ตรวจ `git diff --check`
7. Commit ด้วยข้อความเฉพาะเฟส
8. Push ไป `origin master`
9. เริ่มเฟสถัดไปหลัง push สำเร็จเท่านั้น

## Execution Timeline

### Milestone 1: Phase 1 - Mobile Foundation And Shell

**Scope:** shared UI helpers, dashboard layout shell, topbar, sidebar, global search, shared panel/action-row behavior

**QA routes:** `/th/dashboard`, `/th/assets`, `/th/admin/settings`

**Verification:**

```powershell
npm run lint
git diff --check
```

**Handoff update:** เพิ่ม entry ว่า mobile foundation ปรับ shared helpers/shell/navigation อะไรบ้าง

**Commit message:**

```text
Improve mobile responsive foundation
```

**Push:**

```powershell
git push origin master
```

### Milestone 2: Phase 2 - Field Workflows

**Scope:** QR scan, audit scan, asset create, batch create, checkout, checkin, transfer, asset detail mobile actions

**QA routes:** `/th/assets/new`, `/th/assets/{id}`, `/th/asset-management/scan`, `/th/asset-management/checkout`, `/th/asset-management/checkin`, `/th/asset-management/transfer`, `/th/audit/rounds/{id}/scan`

**Verification:**

```powershell
npm run lint
npm test
git diff --check
```

**Handoff update:** ระบุ scanner/manual fallback, mobile form behavior, batch create behavior, และ route ที่ต้องทดสอบด้วยมือถือจริง

**Commit message:**

```text
Improve mobile field workflows
```

**Push:**

```powershell
git push origin master
```

### Milestone 3: Phase 3 - Data-heavy Pages

**Scope:** asset register, audit rounds/findings, maintenance, disposal, reports, work center, admin readiness/settings

**QA routes:** `/th/assets`, `/th/audit/rounds`, `/th/audit/rounds/{id}`, `/th/audit/findings`, `/th/maintenance`, `/th/maintenance/{id}`, `/th/disposal`, `/th/disposal/{id}`, `/th/reports`, `/th/work-center`, `/th/admin/settings`, `/th/admin/readiness`

**Verification:**

```powershell
npm run lint
npm test
git diff --check
```

**Handoff update:** ระบุว่าหน้าไหนใช้ mobile card list, หน้าไหนใช้ contained table scroll, และ desktop regression ที่ตรวจแล้ว

**Commit message:**

```text
Improve mobile data-heavy pages
```

**Push:**

```powershell
git push origin master
```

### Milestone 4: Phase 4 - Label Preview

**Scope:** label preview scaling, mobile action row, Brother guidance on preview screen only

**QA routes:** `/th/asset-management/labels`, label print routes under `/th/assets/.../label`

**Verification:**

```powershell
npm run lint
git diff --check
```

**Print safety check:** ยืนยันว่า screen preview scale แยกจาก `@media print` และไม่ได้เปลี่ยน tape size จริง

**Handoff update:** ระบุว่า preview mobile-safe แต่ print size ยังอ้างอิง settings/template เดิม

**Commit message:**

```text
Improve mobile label preview
```

**Push:**

```powershell
git push origin master
```

### Milestone 5: Phase 5 - Accessibility, Regression, Final Verification

**Scope:** touch target, aria-label, focus-visible, desktop regression, full build verification

**QA routes:** ทุก route ในรายการ Routes To QA

**Verification:**

```powershell
npm run lint
npm test
npm run build
npm run verify
git diff --check
```

**Handoff update:** สรุปผล Mobile Responsive QA ทั้งหมด, route ที่ตรวจ, viewport ที่ใช้, และ manual test gaps เช่น camera permission, real QR scan, file upload, Brother print dialog

**Commit message:**

```text
Complete mobile responsive QA pass
```

**Push:**

```powershell
git push origin master
```

## Completion Criteria

- No audited route has body-level horizontal scroll at `375px`.
- Scanner and audit scan workflows are usable on a phone-sized viewport.
- Asset creation, batch creation, checkout, checkin, and transfer forms fit mobile.
- Data-heavy pages either use mobile cards or table-contained horizontal scroll.
- Label preview is mobile-friendly while print CSS remains governed by configured label size.
- `npm run lint`, `npm test`, `npm run build`, and `npm run verify` pass.
- `DEVELOPER_HANDOFF.md` records the responsive QA changes and manual test gaps.

## Execution Options

1. **Subagent-Driven (recommended):** Dispatch one focused implementation worker per phase, review between phases, then commit each phase.
2. **Inline Execution:** Execute this plan in the current session with checkpoints after each phase.

For this repository, inline execution is acceptable if commits are kept small. Subagent-driven execution is better if the current workspace has many uncommitted changes or the QA surface becomes too large.
