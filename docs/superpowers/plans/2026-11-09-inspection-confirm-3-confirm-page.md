# ยืนยันผลตรวจ plan 3 of 5: the round's confirm page

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/[locale]/audit/rounds/[id]/confirm` lists the round's assets still `Under Inspection` in five tabs. Staff
with `asset:edit` tick rows in พร้อมยืนยัน and confirm them in bulk through plan 2's route, with a reason. Anyone who
can view the round can read the page.

**Architecture:**
- A server page reads the rows with plan 2's `loadRoundInspectionRows` and passes plain data to one client component.
- The client component holds the selection, the confirm dialog and the result notice, and calls
  `POST /api/audit-rounds/[id]/confirm-results`.
- A pure page model owns the tab parsing, the counts, the select-all cap and the dialog summary.
- The damaged and not-found actions are plan 4. In this plan their tabs list rows read-only.

**Tech Stack:** Next 16 app router (server page + client component), next-intl, shared UI in `src/components/ui/`,
`node --test`, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-09-inspection-confirm-design.md` §4, §5 (dialog and answer), §9, §10.

**Ruling from plan 2's final review:** the page is gated `audit:view` (the round page's gate), not `asset:edit`.
Without `asset:edit` there are no ticks, no bar and no buttons, only a notice.

## Global Constraints

**Words:**
- Thai follows `docs/19_THAI_GLOSSARY.md`: ที่ตั้ง, ผู้ถือครอง, หาไม่พบ, รายการไม่ตรงทะเบียน, ยืนยันผลตรวจ.
- Add messages only through `node scripts/messages-edit.mjs`, in a new namespace `inspectionConfirmPage`.
- English uses ICU plurals for number arguments, Thai uses `{x, number}`. Update `tests/i18n-plural-count.test.ts`.

**Reuse, do not rebuild:**
- `ContentPanel`, `PageHeader` / `PageBackLink`, `DataTable*`, `TabNav`, `StatusBadge`, `DesktopSelectionBar`,
  `AccessibleDialog`, `ActionEmptyState`, `Nil`.
- The field-error pattern of `src/components/assets/asset-status-correction-dialog.tsx` (FIELD_IDS, validate, focus the
  first error, server `fieldErrors`).
- The result badge `auditRoundResultBadge` and its labels from the round page (`auditRound.*` keys).
- `formatCount`, `formatDate`.

**Phone:**
- Below md, rows are cards. A card carries the same tick when the viewer can confirm.
- The selection bar on the phone is a `md:hidden` sticky bar at the same bottom offset `DesktopSelectionBar` uses. It
  sits above the Mobile Field Navigation.
- Targets are at least 44px below md (`min-h-11 md:min-h-0`).

**Limits and routes:**
- Select-all takes at most `INSPECTION_CONFIRM_MAX_ASSETS` (500) of the tab. When it caps, it says so.
- **Gate:** `requirePagePermission(locale, "audit", "view")`.
- **The confirm control:** `canConfirm = hasPermission(user, "asset", "edit")`.
- **Round not found or inactive:** `notFound()`.
- **Cancelled round:** the page shows a notice and no rows.

**Process:**
- Source pins must be CRLF-safe.
- Never touch the untracked paths `.codex/`, `.impeccable/config.json`, `.impeccable/critique/`, `.playwright-mcp/`,
  `.superpowers/brainstorm/`, `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`.
- No Playwright runs, no `next build`, no database commands by implementers.
- Read `node_modules/next/dist/docs/` for page `params`/`searchParams` (they are Promises).
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Interfaces from plan 2** (on the branch):
- `src/lib/inspection-confirm-rules.ts`: `inspectionConfirmTabs`, `InspectionConfirmTab`,
  `INSPECTION_CONFIRM_MAX_ASSETS`, `InspectionTargetStatusName`.
- `src/lib/inspection-confirm-data.ts`:
  - `loadRoundInspectionRows(db, auditRoundId, assetIds?) → InspectionRow[]`;
  - `InspectionRow` fields: `auditItemId`, `assetId`, `assetTag`, `assetName`, `auditStatus`, `auditResult`,
    `scannedAt`, `conditionName`, `conditionNameTh`, `ownershipType`, `custodianId`, `custodianName`, `locationName`,
    `tab`, `handovers`, `pendingFindingIds`, `targetStatusName`.
- **The route's answer:**
  - 200 `{ confirmed, byStatus }`;
  - 409 `{ code: "INSPECTION_CONFIRM_CHANGED", error, blocked: [{ assetId, assetTag, code }] }`, where `code` is one of
    `notInRound`, `notUnderInspection`, `notScanned`, `awaitingReview`, `wrongTab`, `handoverUnclear`;
  - 400 with `fieldErrors` for the reason.

## Review Focus

1. **The page is opened by someone who cannot confirm** (an IT head with `audit:approve` only). They see the rows and a
   notice, no ticks. Task 2 pins it.
2. **A tab is longer than 500.** Select-all takes 500 and says "เลือกให้ 500 ชิ้นแรก". Task 1 pins the cap.
3. **A 409 after another person confirmed or a finding moved.** The page shows which tags and why, refreshes, and
   keeps the dialog closed. Task 3 pins the mapping of every blocked code to a message.
4. **A row whose handover is unclear** (`targetStatusName === null`). Its tick is disabled with the reason beside it.
   Select-all skips it. Task 1 pins the skip.
5. **The last rows are confirmed.** The page shows the empty state with a link back to the round (step 4). Task 2 pins
   it.

---

### Task 1: Page model `src/lib/inspection-confirm-page-model.ts`

**Files:** Create `src/lib/inspection-confirm-page-model.ts` (pure, client-safe, relative `.ts` imports);
Test `tests/inspection-confirm-page-model.test.ts`.

**Interfaces — Produces:**

```ts
export type InspectionPageRow = {
  assetId: string; assetTag: string; assetName: string
  auditStatus: string; auditResult: string | null; scannedAt: string | null   // ISO, serialisable
  conditionNameTh: string | null; locationName: string | null; custodianName: string | null
  tab: InspectionConfirmTab
  targetStatusName: InspectionTargetStatusName | null
  firstPendingFindingId: string | null
}
export function toInspectionPageRow(row: InspectionRow): InspectionPageRow
export function inspectionTabCounts(rows: readonly InspectionPageRow[]): Record<InspectionConfirmTab, number>
export function parseInspectionTab(value: string | undefined, counts: Record<InspectionConfirmTab, number>): InspectionConfirmTab
// a valid ?tab= wins; else the first non-empty tab in inspectionConfirmTabs order; else "ready"
export function isInspectionRowSelectable(row: InspectionPageRow): boolean   // tab "ready" and targetStatusName !== null
export function selectAllInspectionRows(rows: readonly InspectionPageRow[], max?: number): { ids: string[]; capped: boolean }
// selectable rows of the given list, in order, at most max (default INSPECTION_CONFIRM_MAX_ASSETS)
export function inspectionSelectionSummary(rows: readonly InspectionPageRow[], selected: ReadonlySet<string>): Partial<Record<InspectionTargetStatusName, number>>
export const inspectionBlockedMessageKeys: Readonly<Record<"notInRound" | "notUnderInspection" | "notScanned" | "awaitingReview" | "wrongTab" | "handoverUnclear", string>>
// values are keys in inspectionConfirmPage, e.g. "blocked_awaitingReview"
```

`toInspectionPageRow` imports `InspectionRow` as a type only. The page model must not import Prisma.

- [ ] **Step 1: Write the failing tests:**
  - **"counts and the default tab":**
    - rows in `awaitingReview` and `notScanned` only → default `awaitingReview`;
    - `?tab=notFound` with 0 rows still returns `notFound`;
    - `?tab=bogus` → the default.
  - **"select-all skips unclear handovers and caps at 500":**
    - 3 ready rows, one with a null target → 2 ids, `capped: false`;
    - 501 selectable rows → 500 ids, `capped: true`;
    - with `max: 2` → 2 ids, `capped: true`.
  - **"the dialog summary counts by target status":** 2 `In Use` and 1 `Ready` selected → `{ "In Use": 2, "Ready": 1 }`.
  - **"every refusal code has a message key, and each key exists in both message files":** the key set equals the six
    codes. Every value exists in `messages/th.json` and `messages/en.json` under `inspectionConfirmPage`.
  - **"the row is serialisable":** `toInspectionPageRow` turns a `Date` into an ISO string, `null` into `null`, and
    `pendingFindingIds[0]` into `firstPendingFindingId`.
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement, and add the messages** (`inspectionConfirmPage.*`, th / en):

| Key | th | en |
|---|---|---|
| `title` | ยืนยันผลตรวจ | Confirm audit results |
| `eyebrow` | รอบ {auditNo} · ขั้นที่ 3 จาก 4 | Round {auditNo} · step 3 of 4 |
| `lead` | ปลดสถานะ อยู่ระหว่างตรวจสอบ ตามผลตรวจนับ | Release assets under inspection by the audit result |
| `crumbAudit` | ตรวจนับ | Audit |
| `crumbRounds` | รอบตรวจนับ | Audit rounds |
| `backToRound` | กลับไปรอบตรวจนับ | Back to the round |
| `tab_ready` | พร้อมยืนยัน | Ready to confirm |
| `tab_awaitingReview` | รออนุมัติ | Awaiting a decision |
| `tab_damaged` | สภาพเสียหาย | Damaged |
| `tab_notFound` | ไม่พบ | Not found |
| `tab_notScanned` | ยังไม่ได้ตรวจนับ | Not checked yet |
| `col_asset` | ครุภัณฑ์ | Asset |
| `col_result` | ผลตรวจนับ | Audit result |
| `col_location` | ที่ตั้ง | Location |
| `col_holder` | ผู้ถือครอง | Holder |
| `col_target` | จะตั้งสถานะเป็น | Will become |
| `noHolder` | ไม่มี | None |
| `handoverUnclear` | ใบส่งมอบหรือใบยืมไม่ชัด ต้องแก้ในหน้าคุณภาพข้อมูลก่อน | The handover is unclear; fix it in Data quality first |
| `awaitingReviewBanner` | ชิ้นเหล่านี้รออนุมัติรายการไม่ตรงทะเบียนก่อน | These wait for a discrepancy decision first |
| `awaitingReviewLink` | ไปอนุมัติรายการไม่ตรงทะเบียน | Go to the discrepancies |
| `openFinding` | เปิดรายการไม่ตรงทะเบียน | Open the discrepancy |
| `notScannedBanner` | ชิ้นเหล่านี้ยังไม่ได้ตรวจนับในรอบนี้ | These have not been checked in this round |
| `notScannedLink` | ไปรายการที่ยังไม่ได้ตรวจ | Go to the items left |
| `laterTabNote` | การดำเนินการของกลุ่มนี้จะมาในขั้นถัดไปของงาน | Actions for this tab come in a later step |
| `noEditNotice` | ต้องมีสิทธิ์แก้ไขทรัพย์สินจึงจะยืนยันผลได้ | You need asset edit permission to confirm |
| `cancelledNotice` | รอบตรวจนับนี้ถูกยกเลิกแล้ว ไม่มีอะไรต้องยืนยัน | This round was cancelled; nothing to confirm |
| `emptyTitle` | ยืนยันผลตรวจครบแล้ว | All audit results confirmed |
| `emptyBody` | ไม่มีครุภัณฑ์ในรอบนี้ที่ค้างสถานะอยู่ระหว่างตรวจสอบ | No asset of this round is still under inspection |
| `emptyTabTitle` | ไม่มีรายการในกลุ่มนี้ | Nothing in this tab |
| `selectAll` | เลือกทั้งหมดในกลุ่มนี้ | Select all in this tab |
| `selectedCount` | เลือก {count, number} ชิ้น | ICU plural, "{count} selected" |
| `selectionSummary` | ใช้งานอยู่ {inUse, number} · พร้อมใช้งาน {ready, number} · ถูกยืม {checkedOut, number} | In use {inUse} · Ready {ready} · Checked out {checkedOut} |
| `cappedNotice` | เลือกให้ {max, number} ชิ้นแรก ยืนยันชุดนี้แล้วเลือกต่อ | Selected the first {max}; confirm these, then select more |
| `clear` | ล้าง | Clear |
| `confirmOpen` | ยืนยันผลตรวจ… | Confirm results… |
| `dialogTitle` | ยืนยันผลตรวจ {count, number} ชิ้น | ICU plural |
| `dialogLineInUse` | ตั้งเป็น ใช้งานอยู่ | Set to In use |
| `dialogLineReady` | ตั้งเป็น พร้อมใช้งาน | Set to Ready |
| `dialogLineCheckedOut` | ตั้งเป็น ถูกยืม | Set to Checked out |
| `reason` | เหตุผล | Reason |
| `reasonDefault` | ยืนยันตามผลตรวจนับรอบ {auditNo} | Confirmed by audit round {auditNo} |
| `historyNote` | บันทึกลงประวัติของแต่ละชิ้น | Saved to each asset's history |
| `cancel` | ยกเลิก | Cancel |
| `submit` | ยืนยัน {count, number} ชิ้น | ICU plural |
| `successNotice` | ยืนยันผลตรวจแล้ว {count, number} ชิ้น | ICU plural |
| `changedNotice` | บางชิ้นเปลี่ยนไปแล้ว โหลดใหม่และลองอีกครั้ง | Some assets changed. Reload and try again. |
| `blocked_notInRound` | ไม่อยู่ในรอบนี้ | Not in this round |
| `blocked_notUnderInspection` | ไม่ได้อยู่ระหว่างตรวจสอบแล้ว | No longer under inspection |
| `blocked_notScanned` | ยังไม่ได้ตรวจนับ | Not checked yet |
| `blocked_awaitingReview` | รออนุมัติรายการไม่ตรงทะเบียน | Waiting for a discrepancy decision |
| `blocked_wrongTab` | ผลตรวจเปลี่ยนไปแล้ว | The audit result changed |
| `blocked_handoverUnclear` | ใบส่งมอบหรือใบยืมไม่ชัด | The handover is unclear |
| `errorFallback` | ยืนยันไม่สำเร็จ ลองอีกครั้ง | Could not confirm. Try again. |

- [ ] **Step 4: Run** the new test, `tests/thai-glossary.test.ts`, `tests/i18n-plural-count.test.ts` and
  `npx tsc --noEmit`. All must pass.
- [ ] **Step 5: Commit:** `feat(audit): confirm page model and words (inspection-confirm plan 3 task 1)`.

---

### Task 2: The server page and the read-only list

**Files:**
- Create: `src/app/[locale]/(dashboard)/audit/rounds/[id]/confirm/page.tsx`
- Create: `src/components/audit/inspection-confirm/inspection-confirm-workspace.tsx` (client)
- Create: `src/components/audit/inspection-confirm/inspection-row.tsx` (table row + phone card)
- Test: `tests/inspection-confirm-page-ui.test.ts`

**Interfaces:**
- Consumes Task 1's model and plan 2's data read.
- Produces: `InspectionConfirmWorkspace` with props
  `{ locale, roundId, auditNo, tab, counts, rows, canConfirm, statusLabels: Record<InspectionTargetStatusName, string>, links: { round, pendingFindings, pendingItems } }`.
  Task 3 adds the selection and the dialog inside it.

**The server page:**
- `requirePagePermission(locale, "audit", "view")`.
- Read the round (`id`, `auditNo`, `status`, `isActive`). If it is not found or inactive, call `notFound()`.
- **Cancelled round:** render the header and the `cancelledNotice` only.
- **Rows:** `loadRoundInspectionRows(prisma, id)` mapped with `toInspectionPageRow`. Then counts, tab and the rows of
  that tab.
- **`statusLabels`:** each target name's `nameTh` from `assetStatus`, by `name`. Read once.
- **Links:**
  - `round`: `/${locale}/audit/rounds/${id}`;
  - `pendingFindings`: `/${locale}/audit/findings?status=pending&roundId=${id}`;
  - `pendingItems`: the round page's existing pending list href. Read how the round page builds `pendingHref`.
- **Header:**
  - breadcrumbs ตรวจนับ › รอบตรวจนับ › `auditNo` (linked to the round) › ยืนยันผลตรวจ;
  - the eyebrow, the title and the lead;
  - `PageBackLink` to the round.

**The workspace (read-only part):**
- **Tabs:** `TabNav` with the five tabs, each label with its count (`num`). The links keep `?tab=`.
- **No rows at all:** `ActionEmptyState` with `emptyTitle` / `emptyBody` and a link `backToRound`. No tabs.
- **Empty tab:** `emptyTabTitle`.
- **Desktop table columns:** tick (Task 3) · ครุภัณฑ์ · ผลตรวจนับ · ที่ตั้ง · ผู้ถือครอง · จะตั้งสถานะเป็น.
  - ครุภัณฑ์: the tag links to `/${locale}/assets/${assetId}`, with the name under it.
  - ผลตรวจนับ: the result badge from `auditRoundResultBadge`, the scanned date and the condition (Thai).
  - ผู้ถือครอง: `noHolder` when empty.
  - จะตั้งสถานะเป็น: a `StatusBadge` with `statusLabels[target]`. When the target is null, the `handoverUnclear` text
    in the warning tone.
- **Phone:** the same data in a card.
- **รออนุมัติ tab:**
  - a banner `awaitingReviewBanner` with a link to `links.pendingFindings`;
  - each row has `openFinding` linking to `/${locale}/audit/findings?finding=${firstPendingFindingId}`.
- **ยังไม่ได้ตรวจนับ tab:** a banner with a link to `links.pendingItems`.
- **สภาพเสียหาย and ไม่พบ tabs:** rows read-only, plus the `laterTabNote`. Plan 4 replaces it.
- **`canConfirm` false:** an info notice `noEditNotice` above the table. No tick column.

- [ ] **Step 1: Write the failing source pins** in `tests/inspection-confirm-page-ui.test.ts`:
  - the page calls `requirePagePermission(locale, "audit", "view")`, `hasPermission(user, "asset", "edit")` and
    `loadRoundInspectionRows(prisma,`;
  - it calls `notFound()` for a missing round;
  - it has a cancelled branch with `cancelledNotice`;
  - the workspace renders `ActionEmptyState` when there are no rows at all, with the round link;
  - the tick column appears only when `canConfirm`, and the `noEditNotice` otherwise;
  - the finding link uses `?finding=`;
  - phone cards render below md (`md:hidden`), and the table only from md (`hidden md:block`, or the house pattern —
    read a list page that does this, e.g. `src/app/[locale]/(dashboard)/audit/findings/page.tsx`).
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit`.
- [ ] **Step 5: Commit:** `feat(audit): ยืนยันผลตรวจ page lists the round's assets under inspection in five tabs
  (inspection-confirm plan 3 task 2)`.

---

### Task 3: Selection, the confirm dialog and the result

**Files:**
- Modify: `src/components/audit/inspection-confirm/inspection-confirm-workspace.tsx`
- Create: `src/components/audit/inspection-confirm/inspection-confirm-dialog.tsx`
- Test: extend `tests/inspection-confirm-page-ui.test.ts`

**Behaviour** (พร้อมยืนยัน tab, `canConfirm` only):
- **Ticks:**
  - A tick per selectable row (`isInspectionRowSelectable`).
  - A row with a null target has a disabled tick with `aria-describedby` pointing at its `handoverUnclear` text.
  - The header tick toggles the visible page's selectable rows.
  - A `selectAll` button selects with `selectAllInspectionRows`. When capped, it shows `cappedNotice`.
- **Selection bar:** `DesktopSelectionBar` from md, plus the phone bar below md. It shows `selectedCount`,
  `selectionSummary`, `clear`, and the primary `confirmOpen`.
- **The dialog** (`AccessibleDialog`):
  - title `dialogTitle`;
  - one line per non-zero target count;
  - a `reason` textarea, prefilled with `reasonDefault`. Validate it client-side: required, 3–500 characters after
    trim, as the schema does;
  - `historyNote`;
  - buttons `cancel` and `submit`.
  - While posting, the dialog cannot close (`busy`), and a second submit is ignored.
  - Focus returns to the opener on close.
- **POST** `/api/audit-rounds/${roundId}/confirm-results` with `{ assetIds, reason, outcome: "confirm" }`:
  - **200:** close the dialog, clear the selection, show `successNotice` (polite live region), then `router.refresh()`.
  - **409:** close the dialog, keep the selection only for ids not in `blocked`, then `router.refresh()`. Show
    `changedNotice` with a list "<assetTag>: <blocked_* message>" for each blocked entry; use the id when the tag is
    null.
  - **400 with `fieldErrors.reason`:** show it under the field and focus it.
  - **Anything else:** show the server message through the app's API error helper, or `errorFallback`. Read how
    `asset-status-correction-dialog.tsx` maps errors and do the same.
- **Tab change:** the selection resets, because ids only ever come from the พร้อมยืนยัน tab.

- [ ] **Step 1: Write the failing source pins:**
  - the POST body has `outcome: "confirm"`;
  - a 409 branch reads `blocked` and maps codes through `inspectionBlockedMessageKeys`;
  - `router.refresh()` is called after 200 and after 409;
  - the dialog passes `busy`;
  - the reason default uses `reasonDefault` with `auditNo`;
  - the select-all calls `selectAllInspectionRows(`;
  - the phone bar has `md:hidden` and the desktop bar is `DesktopSelectionBar`.
- [ ] **Step 2: Run, expect failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit`.
- [ ] **Step 5: Commit:** `feat(audit): confirm the ticked assets with a reason; a 409 names what changed
  (inspection-confirm plan 3 task 3)`.

---

### Task 4: E2E `e2e/audit/inspection-confirm.spec.ts`

> **Waiting on the user** (asked with this plan). Today no app path creates an `Under Inspection` asset: create and
> import accept only Draft and Ready. Two ways:
> - **A (recommended):** a narrow E2E setup helper writes the status `Under Inspection` onto the run's own assets in
>   `asset_management_dev`, through Prisma. The env guard must have confirmed the dev DB and login first. It touches
>   only assets whose tag has the run prefix. This is the suite's first direct DB write; the rule "no direct SQL
>   write" gets one listed exception.
> - **B:** no seeded data. The spec checks only the empty page and the permission notice. The confirm itself is
>   proven by unit tests and by a manual check.
>
> The task text below is option A. With option B, keep only the last two bullets of the spec.

**Files:**
- Create: `e2e/audit/inspection-setup.ts` (option A). It exports
  `markUnderInspection(runId: string, assetIds: string[]): Promise<void>`. It uses the generated Prisma client with the
  same connection the app uses.
  - It refuses unless `databaseTarget(process.env)` is the dev DB and dev login. Use `e2e/support/env-guard.ts`.
  - It refuses unless every asset's tag starts with the run's tag prefix.
- Create: `e2e/audit/inspection-confirm.spec.ts` and `e2e/audit/inspection-confirm-words.ts` (values copied from
  `messages/th.json`).
- Modify: `tests/e2e-review.test.ts` (or whichever guard test lists allowed DB access). Add the one exception: only
  `e2e/audit/inspection-setup.ts` may import the Prisma client.

**Spec (desktop-light and phone-light projects are enough; follow how other specs pick projects):**
- **Setup:**
  - Through the existing audit data helpers (`e2e/audit/audit-data.ts`), create a run round with 3 run assets: one
    personal with a holder, one shared without one, and one that IT staff mark not found.
  - Walk the round so the first two are found, and mark the third not found.
  - Then `markUnderInspection` all three.
- **The IT head opens the round:**
  - the card's step is ยืนยันผลตรวจ;
  - the close button is disabled;
  - the line reads "ยังมี 3 ชิ้นค้างสถานะอยู่ระหว่างตรวจสอบ".
- **The confirm page (IT staff with `asset:edit`):**
  - **Counts:** พร้อมยืนยัน shows 2. The third row sits in รออนุมัติ while its not-found finding waits.
  - **Confirm:** select all → the dialog lines read ใช้งานอยู่ 1 and พร้อมใช้งาน 1 → confirm. The success notice
    appears.
  - **Result:** the asset pages show the statuses ใช้งานอยู่ and พร้อมใช้งาน, and the history row links the round.
- **A viewer without `asset:edit`:** sees the rows and the `noEditNotice`, and no ticks. Use the suite's viewer role.
- **Empty page:** for a round with no `Under Inspection` asset, the page shows `emptyTitle` and the link back.
- **Cleanup:** none needed; the data is run-marked. Do not cancel or close shared rounds.

- [ ] **Step 1: Write the helper, the words and the spec**, and add the guard exception with its test.
- [ ] **Step 2: Run** `npm test`. The controller runs Playwright.
- [ ] **Step 3: Commit:** `test(audit): E2E for ยืนยันผลตรวจ — close refused, bulk confirm, read-only viewer
  (inspection-confirm plan 3 task 4)`.

---

## Controller steps after Task 4 (not for implementers)

- **Build:** `(npx next build || npx next build)`, then probe the dev DB.
- **E2E:** `npx playwright test e2e/audit e2e/cross-cutting --reporter=line`.
- **Look step:** the confirm page at 1440 light/dark, 1024 and 390 light/dark: the tabs, the table and cards, the bar,
  the dialog, the empty state.
- **Final review:** 3 lenses, then one fix wave.
- **Docs:** changelog, handoff, wiki and memory.
