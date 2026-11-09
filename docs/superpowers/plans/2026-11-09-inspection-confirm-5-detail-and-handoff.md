# ยืนยันผลตรวจ plan 5 of 5: the asset detail notice and dialog, and the findings hand-off

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- An asset stuck in `Under Inspection` shows a notice on its detail page.
  - If it is in an audit round, the notice links to that round's confirm page.
  - If it is in no round, a dialog confirms its status, holder and location in one step, with a reason and history.
- The findings page, filtered to a round, tells staff when the next step is ยืนยันผลตรวจ.

**Architecture:**
- **Data helper:** picks the round for an asset.
- **Route:** a single-asset route writes status, holder, location and department in one transaction, with the same
  history shapes the app already writes.
- **Detail page:** swaps the old status-correction entry for the new notice, for `Under Inspection` only.
- **Findings page:** gains one banner.

**Tech Stack:** Next 16, Prisma 7 / SQL Server, zod, next-intl, `node --test`, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-09-inspection-confirm-design.md` §7 (single asset), §8 (hand-off banner), §9.

## Global Constraints

**Choosing the round** (spec §7, builder check):
- Consider the asset's audit items in rounds that are not cancelled, and active.
- Among rounds where the asset's tab (`classifyInspectionItem`) is `ready`, `damaged` or `notFound`, take the newest by
  `startDate`.
- Otherwise take the newest such round, whatever the tab.
- No round → the dialog.

**The dialog**, for assets in no round (agreed 2026-10-28):
- **สถานะ:** พร้อมใช้งาน or ใช้งานอยู่. ใช้งานอยู่ needs a holder.
  - The default is the rule's target, `inspectionTargetStatusName({ ownershipType, custodianId, handovers }, "confirm")`.
- **Open handover:**
  - **Clear** (permanent or temporary only): holder and location are locked and shown read-only. The status is the
    rule's target (`In Use` or `Checked Out`) and cannot be changed. The dialog says why.
  - **Unclear** (null target): the dialog shows the `handoverUnclear` reason and no submit.
- **ผู้ถือครอง:** the employee `SearchableSelect` the asset form uses, prefilled, clearable.
- **ที่ตั้ง:** the location `SearchableSelect` the asset form uses, prefilled, required.
- **เหตุผล:** required, 3–500 characters after trim.

**The route `POST /api/assets/[id]/confirm-inspection`:**
- **Permission:** `requirePermission(user, "asset", "edit")`.
- **Body:** `{ statusName: "Ready" | "In Use", custodianId: string | null, locationId: string, reason: string }`.
- **Refusals:**
  - **400 with `fieldErrors`:** not `Under Inspection` (`statusName`); in a non-cancelled round (`statusName`, message
    "ยืนยันผลตรวจในรอบตรวจนับ"); `In Use` without a holder (`custodianId`); an open handover that does not match the
    rule (`statusName`); a holder change while a handover is open (`custodianId`); an inactive employee or location.
  - **409:** the asset changed meanwhile. Use a conditional update on `statusId` being `Under Inspection`.
- **Writes, in one Serializable transaction:**
  - `statusId`, `custodianId`, `currentLocationId`;
  - the department through `getRegisterDepartment` (`src/lib/asset-department-rule.ts`). Pass the inputs the asset
    edit route passes; read that route to mirror them.
  - `updatedBy`.
- **Movements, one per changed field:**
  - `location_change` and `custodian_change` (plus a department change if the edit route writes one), with
    `referenceType: "asset"`, `referenceId: assetId`, the reason, and remark `"Inspection confirmed"`;
  - `status_correction` for the status.
  - Mirror `src/app/api/assets/[id]/status-correction/route.ts` and the shapes `component-return/route.ts` writes.
- **System log:** one `logAudit({ action: "correct_status", module: "asset" })` after the transaction. Its `newValue`
  holds the status, holder, location, department and reason.

**Detail page:**
- For an `Under Inspection` asset, `statusCorrection` is not offered: the old Ready-only entry is hidden. Every other
  protected status keeps it.
- **The notice:** "ครุภัณฑ์นี้ค้างสถานะอยู่ระหว่างตรวจสอบ", shown in the overview where notices sit.
  - **With a round:** a link "ยืนยันผลตรวจในรอบ {auditNo}" to `/${locale}/audit/rounds/${id}/confirm?tab=<tab>`, plus
    `returnTo` the asset page, built with `appendOperationalReturnTo`.
  - **Without one:** a button "ยืนยันผลตรวจ" with `asset:edit`. Without the permission, the notice has no action.

**Findings banner:**
- On `/audit/findings` with a `roundId` filter, when that round has 0 pending findings and its
  `countRoundUnconfirmedAssets` is above 0, show an info `Notice`:
  "พิจารณารายการของรอบ {auditNo} ครบแล้ว · ขั้นต่อไป: ยืนยันผลตรวจ {count, number} ชิ้น".
  - It has a link "ไปยืนยันผลตรวจ" to the round's confirm page with `returnTo`.
- Unfiltered: no banner.
- The wording uses **พิจารณา**, as the glossary requires, not "อนุมัติ" (plan 3 ruling).

**Process:**
- Add messages only through `node scripts/messages-edit.mjs`. ICU plural English, Thai `{x, number}`. Update
  `tests/i18n-plural-count.test.ts`.
- Source pins must be CRLF-safe.
- Never touch `.codex/`, `.impeccable/config.json`, `.impeccable/critique/`, `.playwright-mcp/`,
  `.superpowers/brainstorm/`, `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`, or
  the untracked `docs/superpowers/specs/2026-11-09-consumables-design.md`, which belongs to another piece of work.
- No Playwright, `next build` or DB commands by implementers.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Interfaces on the branch:**
- `src/lib/inspection-confirm-rules.ts`: `classifyInspectionItem`, `inspectionTargetStatusName`,
  `INSPECTION_STATUS_NAME`.
- `src/lib/inspection-confirm-data.ts`: `countRoundUnconfirmedAssets`, `loadRoundInspectionRows` and the open-handover
  read.
- The confirm page reads `?tab=` and `returnTo` (plan 3).

## Review Focus

1. **Two rounds hold the asset, and the newest cannot act.** The link goes to the older actionable round. Task 1 tests
   the choice.
2. **An asset with an open loan.** The dialog locks the holder and status to ถูกยืม, and the route refuses anything
   else. Task 1 tests the route rule.
3. **The asset is added to a round while the dialog is open.** The route refuses ("ยืนยันผลตรวจในรอบตรวจนับ"), so the
   round's flow stays the only one. Task 1 tests it.
4. **A personal asset confirmed as พร้อมใช้งาน with a holder kept.** Allowed (the user's choice), and the department
   follows the holder per `getRegisterDepartment`. Task 1 tests the department.
5. **A viewer without `asset:edit`.** The notice shows, with no button. Task 2 pins it.

---

### Task 1: Round choice, schema, service and route

**Files:**
- Modify: `src/lib/inspection-confirm-data.ts`. Add
  `findAssetInspectionRound(db, assetId): Promise<{ roundId: string; auditNo: string; tab: InspectionConfirmTab } | null>`.
- Create: `src/lib/validations/asset-confirm-inspection.ts`, `src/lib/asset-confirm-inspection-service.ts`,
  `src/app/api/assets/[id]/confirm-inspection/route.ts`
- Modify: `src/lib/api-error-catalog.ts`, `messages/*.json` (`apiErrors.*` for new texts)
- Modify: `tests/asset-movement-labels.test.ts` WRITERS, if the service writes movements (it does)
- Test: `tests/asset-confirm-inspection.test.ts`

**The service:**
- Expose a pure `assetConfirmInspectionErrors(input, context): Record<field, code>` for the rule checks, so they test
  without a DB.
- `context` holds `{ statusName, inRound, handovers, ownershipType, currentCustodianId, employeeActive, locationActive }`.

- [ ] **Step 1: Write the failing tests:**
  - **The round choice** (pure helper; extract `pickInspectionRound(items)` and test it):
    - two rounds, the newer `awaitingReview` and the older `ready` → the older;
    - both `awaitingReview` → the newer;
    - none → `null`;
    - a cancelled round is ignored.
  - **Rule checks:**
    - `In Use` without a holder → `custodianId`;
    - in a round → `statusName`;
    - not under inspection → `statusName`;
    - an open temporary loan with `Ready` → `statusName`;
    - an open handover with a changed holder → `custodianId`;
    - valid input → `{}`.
  - **The schema:** a reason of 2 characters is refused; `statusName: "Checked Out"` is refused from the body (the
    server computes it for an open loan); `locationId` is required.
  - **Source pins:**
    - the route has `requirePermission(user, "asset", "edit")`;
    - Serializable;
    - the status update is conditional on `Under Inspection`;
    - `getRegisterDepartment(`;
    - movement types `status_correction`, `location_change`, `custodian_change`;
    - `logAudit(` with `correct_status` after the transaction.
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement.**
  - With an open clear handover the body's `statusName` is ignored, and the server writes the rule's target.
  - Document that on the route.
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit`.
- [ ] **Step 5: Commit:** `feat(assets): confirm-inspection route for an asset in no round — status, holder, location
  in one step (inspection-confirm plan 5 task 1)`.

---

### Task 2: The detail page notice and dialog

**Files:**
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`. Hide `statusCorrection` for `Under Inspection`, and
  read `findAssetInspectionRound` and the dialog's options.
- Create: `src/components/assets/detail/asset-inspection-notice.tsx` (server-safe wrapper) and
  `src/components/assets/asset-confirm-inspection-dialog.tsx` (client)
- Modify: `src/components/assets/detail/asset-overview.tsx`, to place the notice where the overview's notices sit
- Modify: `messages/*.json` (`asset.*` or a new `assetInspectionNotice` namespace)
- Test: `tests/asset-confirm-inspection-ui.test.ts`

**Messages:**

| Key | th | en |
|---|---|---|
| `title` | ครุภัณฑ์นี้ค้างสถานะอยู่ระหว่างตรวจสอบ | This asset is still under inspection |
| `roundLink` | ยืนยันผลตรวจในรอบ {auditNo} | Confirm in round {auditNo} |
| `button` | ยืนยันผลตรวจ | Confirm result |
| `dialogTitle` | ยืนยันผลตรวจ {assetTag} | Confirm {assetTag} |
| `status` | สถานะ | Status |
| `holder` | ผู้ถือครอง | Holder |
| `location` | ที่ตั้ง | Location |
| `reason` | เหตุผล | Reason |
| `reasonPlaceholder` | เช่น ตรวจสอบแล้ว ของอยู่ที่ห้องนี้ | e.g. checked, it is in this room |
| `handoverLocked` | มีใบส่งมอบหรือใบยืมเปิดอยู่ ผู้ถือครองและสถานะเป็นไปตามใบนั้น | An open handover sets the holder and status |
| `handoverUnclear` | ใบส่งมอบหรือใบยืมไม่ชัด ต้องแก้ในหน้าคุณภาพข้อมูลก่อน | The handover is unclear; fix it in Data quality first |
| `inUseNeedsHolder` | ใช้งานอยู่ต้องมีผู้ถือครอง | In use needs a holder |
| `submit` | ยืนยันผลตรวจ | Confirm |
| `cancel` | ยกเลิก | Cancel |
| `success` | ยืนยันผลตรวจแล้ว | Result confirmed |
| `errorFallback` | ยืนยันไม่สำเร็จ ลองอีกครั้ง | Could not confirm. Try again. |

**The dialog:**
- Follow `src/components/assets/asset-status-correction-dialog.tsx`:
  - FIELD_IDS, client validation, errors under the field, focus the first error;
  - server `fieldErrors`;
  - `busy` lock;
  - focus returns to the opener.
- **Status:** a `NativeSelect` or segmented control with พร้อมใช้งาน / ใช้งานอยู่ (Thai names from the page).
- **On 200:** `router.refresh()` and the success notice. The notice then disappears, because the asset is no longer
  `Under Inspection`. Put the success line in the page's existing feedback place: read how the correction dialog shows
  success.

- [ ] **Step 1: Write the failing pins:**
  - **page:**
    - it hides `statusCorrection` when the status name is `Under Inspection`;
    - it calls `findAssetInspectionRound(`;
    - the link adds `tab=` and `returnTo`;
    - the button requires `canEditAsset`;
  - **dialog:**
    - it posts to `/api/assets/${assetId}/confirm-inspection`;
    - it has `busy`;
    - the locked fields carry `aria-describedby` to `handoverLocked`;
    - with an unclear handover it renders no submit;
    - the `inUseNeedsHolder` check is client-side.
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit`.
- [ ] **Step 5: Commit:** `feat(assets): the detail page's ยืนยันผลตรวจ notice links the round or opens the one-step
  dialog (inspection-confirm plan 5 task 2)`.

---

### Task 3: The findings page hand-off banner

**Files:**
- Modify: `src/app/[locale]/(dashboard)/audit/findings/page.tsx` (or its page data)
- Modify: `messages/*.json`: `auditFinding.handoffConfirm` and `auditFinding.handoffConfirmLink`
- Test: extend `tests/audit-findings-page-ui.test.ts`

**Messages:**

| Key | th | en |
|---|---|---|
| `handoffConfirm` | พิจารณารายการของรอบ {auditNo} ครบแล้ว · ขั้นต่อไป: ยืนยันผลตรวจ {count, number} ชิ้น | ICU plural |
| `handoffConfirmLink` | ไปยืนยันผลตรวจ | Confirm results |

- [ ] **Step 1: Write the failing pins:**
  - the banner renders only when the filter has a `roundId`, the round's pending findings count is 0, and
    `countRoundUnconfirmedAssets(` is above 0;
  - the link goes to `/audit/rounds/${roundId}/confirm` with `returnTo` the current findings URL.
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement.** Read the round's pending count with the same where the page's tab counts use. Do not add a
  second definition.
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit`.
- [ ] **Step 5: Commit:** `feat(audit): the findings page names ยืนยันผลตรวจ as the next step once a round's decisions
  are done (inspection-confirm plan 5 task 3)`.

---

### Task 4: E2E

**Files:**
- Create: `e2e/audit/inspection-detail.spec.ts` and words (or extend `inspection-confirm-words.ts`)

**Story** (desktop-light and phone-light):
- **Setup:**
  - Create two run assets: one in a run round (walked, found) and one in no round.
  - Mark both `Under Inspection` with `markUnderInspection`, the one allowed DB-write helper.
- **Asset in the round:**
  - The detail page shows the notice and the link "ยืนยันผลตรวจในรอบ <auditNo>".
  - The link opens the confirm page on the พร้อมยืนยัน tab.
  - The old "แก้ไขสถานะ" entry is not offered.
- **Asset in no round:**
  - The dialog: choose ใช้งานอยู่ without a holder → the error under ผู้ถือครอง.
  - Pick a run employee and a run location, give a reason, and confirm.
  - The status reads ใช้งานอยู่, the holder and location are shown, and the history has the rows.
- **Findings banner:**
  - For the round, after its findings are decided (none in this setup), open `/audit/findings?roundId=<id>` while an
    asset is unconfirmed. The banner shows with its link.
  - If the round has no findings at all, the filtered page still shows the banner. Confirm this matches the page's
    behaviour.

- [ ] **Step 1: Write the spec and words.** Copy the words from `messages/th.json`.
- [ ] **Step 2: Run** `npm test` (the e2e pins).
- [ ] **Step 3: Commit:** `test(audit): E2E for the detail page notice, the one-step dialog and the findings hand-off
  (inspection-confirm plan 5 task 4)`.

---

## Controller steps after Task 4 (not for implementers)

- **Build:** `(npx next build || npx next build)`, then probe the dev DB.
- **E2E:** `npx playwright test e2e/audit e2e/asset-detail e2e/cross-cutting --reporter=line`.
- **Look step:**
  - the notice with a round and without one;
  - the dialog, including its locked state;
  - the banner.
- **Final review:** whole-branch, 3 lenses, then one fix wave.
- **Wrap-up:**
  - docs;
  - the morning-style report of rulings;
  - ask the user for the merge go.
