# Page group 1: the asset detail page (canvas B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/[locale]/assets/[id]` as canvas B: a header with the next step and "อื่น ๆ" and a fact strip, five linkable tabs (ภาพรวม, ประวัติ, ส่วนควบ, ไฟล์, ซ่อม / PM), previous/next within a register search, and a sticky phone bar. Every action comes from one rule that the register uses too.

**Architecture:**
- **Shared rules first (Tasks 1-4):** one action rule (`src/lib/asset-actions.ts`), the register's stable order, its location filter and the neighbours, one history (`src/lib/asset-history*.ts`) with an Excel export, and photos that load small and fail gracefully.
- **Shared parts (Tasks 5-7):** the fact strip, ActionBar's more slot, and the tab names with the data per tab.
- **The page (Task 8):** the page splits into parts under `src/components/assets/detail/`. Task 8 builds the frame and the overview.
- **The other tabs and the close (Tasks 9-13):** Tasks 9-12 each replace one tab's interim sections. Task 13 rewrites the E2E steps and the docs.

**Tech Stack:** Next.js 16.4 App Router (server pages, client islands), React 19, next-intl, Prisma 7 on SQL Server (read-only additions; no schema change, no migration), Tailwind 4 tokens, exceljs, `node --test`, Playwright E2E.

**Spec:** `docs/superpowers/specs/2026-10-25-page-group-1-dashboard-detail-login-design.md`:
- §7 (the asset detail), §5 (rules for all three pages), §9 (the register's `id` tie-break and `locationId` filter, the attachments routes, the fact strip, ActionBar's more slot), §10 (asset detail E2E) and §11.
- This is the third and last plan of page group 1, after the login and the dashboard (both merged).

**Branch:** `feat/group1-asset-detail`, from `master` `f6368e19`.

**Dry run:** none. The user agreed on 2026-10-26.

**E2E runs (the user's cadence, 2026-10-26):**
- **Checkpoint after Task 1:** the action rule changes the register's row actions. Run only these (R41):
  - `e2e/transactions`, `e2e/assets` and `e2e/smoke`;
  - the register steps: `e2e/cross-cutting/field-errors.spec.ts`, `e2e/cross-cutting/roles.spec.ts`, `e2e/shell/shell.spec.ts`, `e2e/shell/session.spec.ts` and `e2e/dashboard/dashboard.spec.ts`.
- **After Task 13:** run the whole suite once. This run also closes page group 1.

## Task order and what each needs

| Task | Needs | Touches |
|---|---|---|
| 1 One action rule | — | `asset-actions.ts`, register rows, `row-actions` |
| 2 Register order, location filter, neighbours | — | `asset-list-query.ts`, chips, view memory, neighbours libs |
| 3 One history + Excel | — | history libs, `asset-movement-documents.ts`, `dashboard-recent.ts`, export route |
| 4 Photos | — | attachments routes, `AssetPhotoFrame`, allow-list |
| 5 FactStrip | — | `ui/fact-strip.tsx`, DESIGN.md |
| 6 ActionBar more | — | `ui/action-bar.tsx`, `ui/row-actions.tsx`, DESIGN.md |
| 7 Tabs, views, counts | 3 | `asset-detail-view.ts`, `asset-detail-data.ts`, `asset-detail-counts.ts`, tabs, page (interim) |
| 8A Status correction dialog | — | the correction button and dialog |
| 8B Frame rules and read | 1, 2, 3, 7 | detail frame libs |
| 8C Page frame and overview | 1-8B | the page, `components/assets/detail/*`, skeleton, ~26 pin files |
| 9 History tab | 3, 8C | history tab, `DataTableGroupRow` |
| 10 Components tab | 3, 8C, 9 | map, install/remove history |
| 11 Files tab | 4, 8C | files tab, uploads, evidence |
| 12 Repair / PM tab | 8C | repair stats, table, PM plans |
| 13 E2E and docs | 1-12 | `e2e/**` steps for the detail, docs |

## Global Constraints

- **Words:**
  - Follow `docs/19_THAI_GLOSSARY.md`. Edit messages only through `node scripts/messages-edit.mjs`, th and en together.
  - One word for one thing: "บันทึกซ่อม", "ที่ตั้ง", "แผนก", "เอกสารจัดซื้อ", "ไม่มีผู้ถือครอง", "รูปประจำรุ่น" (R30-R33). No "ตรวจทาน".
- **Colour and shared parts:**
  - As in the dashboard plan: no hex or rgba in tsx, no `dark:`, no `/NN` tints, no `shadow-*` outside the allowed parts.
  - Status colours appear only where DESIGN.md allows (the fact strip's audit result is a `StatusBadge`).
  - A new part lives in `src/components/ui/`, has a DESIGN.md section and a name that passes LS1, LK1 and LN2.
- **Access:**
  - The page stays readable with `asset:view`.
  - Every write control needs its permission (`asset:edit`, `asset:create`, `maintenance:create`, `disposal:create`). The viewer E2E finds none.
  - A document or evidence link shows only to a person whose permission opens it.
- **Actions:**
  - An action is offered only when its API accepts it, and an unavailable one shows its reason (spec §7.1).
  - The register and the detail render the same primary and the same transaction items.
- **Photos:**
  - The page loads card-size thumbnails (`/thumbnail?size=card`), never an original, except when a person opens one.
  - Only thumbnailable images are shown as photos.
- **Same commit:**
  - The skeleton changes with the page shape.
  - Source pins change with the code they pin.
  - EXEMPT rows keep exact counts, with reasons.
  - Before each commit, every task also runs `npm test` (the whole unit suite) and `npx tsc --noEmit`, whatever its own run step names.
  - A pin that fails there but is not on the task's list gets rewritten in the same commit, and the report names it. Task lists are written against master, so they can miss a pin that an earlier task moved.
- **Dates:** days are Bangkok days, years are Buddhist-era in Thai, and `formatAssetDetailDate` is the one short-date formatter of the strip, the overview and the history (R37).
- **Data:**
  - No schema change, no migration.
  - Every tab count equals the rows its tab lists (one where builder each).
  - One exception: the components count uses `assetDetailComponentLinkWhere`, which means installed, not removed, either side. It equals the page's current components plus `installedInLinks`, and those are what Task 10 renders (R58).
- **E2E:**
  - Any context that signs a user in starts with an empty storage state.
  - Steps scope to the test's own records: the dev data grows run by run.
- **Commits:** every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **An open loan whose asset went to repair.** The primary is "ดูงานซ่อม", never a "รับคืน" that the return API would refuse. *Pinned in Task 1, in two tests:*
   - *"the primary is the first rule that applies": its rule-4 block, for Pending Repair and Under Maintenance;*
   - *"the transactions are the ownership type's others…".*
2. **A register search sorted by a column where many assets tie or are empty** (the same created time, no purchase date). "3 / 24" and previous/next stay stable across visits. *Pinned in Task 2: the `id` tie-break and `pickAssetNeighbours`.*
3. **An old bookmark (`?view=custody`, `operations`, `audit`) or a junk value (`?view=__proto__`).** It opens the matching new tab (history with the ตรวจนับ chip for `audit`), or the overview, and never crashes. *Pinned in Task 7, "a ?view= value opens its tab".*
4. **A photo whose file is not on this server** (the dev copy of Production paths). The thumbnail and the original answer 404, never 500, and the card says "โหลดรูปไม่ได้" with the upload link for editors only. *Pinned in Task 4: the route tests and "an empty card and a photo that fails say so".*
5. **A history event whose document page the person cannot open** (a viewer without `maintenance:view` or `disposal:view`). There is no link and no code, and the rest of the row still reads. The history Excel leaves that code out too (R52). *Pinned in:*
   - *Task 9: "a document links only for those who may open its page" (the access map) and "each event becomes a row with its own label … and a document only where the person may open it" (the row);*
   - *Task 3: the export route's permission pins.*

## Decisions taken while planning (the user did not make these; check them)

- **The register follows the same action rule.** A row's next button can now read "ดูงานซ่อม", "ดูคำขอตัดจำหน่าย", "จัดการส่วนควบ" or "ผูก License". A Ready asset with an old-style custodian shows "รับคืน".
  - A viewer's rows lose their ⋯, which held only unavailable items.
  - Transfers of stock, shared and component assets follow the API: a location move is allowed in any status but Disposed or Retired.
- **The phone bar** holds the primary, "บันทึกซ่อม" and "การดำเนินการอื่น". "พิมพ์ป้าย" and "แก้ไข" sit in the sheet.
  - From the scan page, the bar holds "สแกนรายการถัดไป" (wide), the primary and the sheet.
  - The header's buttons hide on the phone.
- **The overview's photo card** links its "อัปโหลดรูป" (desktop) / "ถ่ายรูป" (phone) to the files tab, where the camera input is, instead of a camera input in the card (§7.5 / the board).
- **Words:**
  - "เอกสารจัดซื้อ" (the app's word) instead of the spec's "เอกสารการซื้อ".
  - "แผนกที่ดูแล" / "แผนกที่ใช้" instead of "หน่วยงาน…".
  - "ไม่มีผู้ถือครอง" and "รูปประจำรุ่น" stay the existing words.
- **Where the links go back to:**
  - The repair and disposal pages go back only to their own lists (`normalizeOperationalReturnTo`). So "ดูงานซ่อม", "ดูคำขอตัดจำหน่าย", "บันทึกซ่อม" and "ขอตัดจำหน่าย" carry no returnTo.
  - Spec §7.1's "every href carries returnTo" holds for the asset's own pages: checkout, checkin, transfer, components and edit.
  - The components manager now also accepts the register as its returnTo (R53).
- **The fact strip:**
  - The audit result is a status badge, in the round page's words and tones ("พบตรง" green, "ไม่พบ" red, the rest grey, R54).
  - A pending item in an open round shows "รอตรวจในรอบ AUD-…".
  - The personal cell's department is the custodian's own department.
- **The middle crumb** ("ผลค้นหา …" / "ผลการกรอง") is text. "ทะเบียนทรัพย์สิน" is the link back.
- **The history tab:**
  - The column with the event's own words is headed "รายการ". "ประเภท" is the chip word, as in the Excel.
  - Chips show only categories with events.
  - The phone has no period select and no export.
  - Over 500 events, a notice points at the export.
  - The Excel's dates are ISO (Gregorian) in both languages, as every export of the app writes them (`toExcelDate`). §5's Buddhist year applies to dates on screen.
- **What leaves:**
  - The QR panel (the label page holds it).
  - The follow-up panel (its items moved to their own places).
  - The data-health panel, but not all of it (the user's choice, 2026-10-26, R59). Its items stay as one quiet line at the top of ภาพรวม, for `asset:edit` only and only while something is missing: "ข้อมูลยังไม่ครบ 2 รายการ: Serial Number · แผนกที่ใช้". Each item links to where it is fixed. The items and their checks are today's, and their words are the app's own field words.
  - The activity and evidence drawers (the history and files tabs replace them).
  - The handover cards (their evidence is in the files tab's "หลักฐานจากงานอื่น").
- **The files tab:**
  - The photo-type select goes: checklist tiles name each photo.
  - Photos can be deleted too, by an editor, with the destructive confirm.
  - HEIC files are listed as documents.
  - "เอกสารจัดซื้อ" keeps today's component as is. Spec §7.7 lists an amount and an unlink, but today's section shows no amount and has no unlink. It keeps the per-file delete, now for `asset:edit` only. Showing the amount (`totalAmount` through `formatMoney`) is a small addition if wanted.
- **The components tab:** each install/remove link row holds one note.
  - The remove API keeps the install's reason when the removal gives none.
  - So a removal without its own reason shows the install's note.
- **The repair tab:**
  - "ซ่อมมาแล้ว N ครั้ง" leaves out cancelled and PM records, and its foot says so. The tab count is every record in the table.
  - "ตั้งรอบ PM" is hidden for Disposed and Retired assets.
- **E2E:** no E2E role has `employee:view`, so the custodian's link to the employee page is a UAT line. The E2E checks the fallback link, the register by custodian.

---

### Task 1: One action rule for the register and the detail

The register's row and the asset page will offer the same next step, with the same words and the same reasons, from one pure rule (spec §7.1). This task builds the rule and moves the register onto it. The asset page keeps its old quick actions until Task 8 moves it onto the rule, so `getAssetRegisterTransactionActions` stays until then (its only caller left is the asset page, pinned by `tests/asset-register-transactions.test.ts:179-184`).

**Files:**
- Create: `src/lib/asset-actions.ts` (pure: relative `.ts` imports only, no `@/`, no `prisma`)
- Create: `src/components/assets/asset-action-icons.ts` (server-safe, no `"use client"`)
- Modify: `src/lib/asset-operation-policy.ts:44` (a comment above `getAssetRegisterTransactionActions`), `:126-133` (`getRowNextAction` removed)
- Modify: `src/components/assets/asset-register-row-actions.tsx:1-99` (rewritten onto the rule)
- Modify: `src/components/assets/asset-register-table.tsx:46` (import), `:76` (row type), `:717` (prop)
- Modify: `src/components/assets/asset-register-mobile-list.tsx:81` (prop)
- Modify: `src/app/[locale]/(dashboard)/assets/page.tsx:31-35` (imports), `:171-201` (two queries), `:208-214` (maps), `:284-303` (row actions), `:334` (row field)
- Modify: `src/lib/asset-return-navigation.ts:27-33` (the component manager also accepts the register path, R53)
- Modify: `DESIGN.md:635` (the register's rows)
- Modify: `messages/th.json`, `messages/en.json` (through `scripts/messages-edit.mjs`)
- Test:
  - `tests/asset-actions.test.ts` (new)
  - `tests/asset-return-navigation.test.ts:62` (test renamed), new test after `:75` (the register returnTo, R53)
  - `tests/asset-component-manager.test.ts:5` (test renamed; its asserts stay)
  - `tests/asset-register-transactions.test.ts:201-202` (pin moves to the rule) and a new test
  - `tests/asset-register-table-ui.test.ts:10-32` (`:16`, `:17`, `:29` rewritten, test renamed), `:219-227` (`:222` rewritten)
  - `tests/dropdown-menus-ui.test.ts:41`
  - `tests/asset-register-view-model.test.ts:8` (import removed), `:161-177` (the `getRowNextAction` test removed: `tests/asset-actions.test.ts` covers the primary)

**Interfaces:**
- Consumes:
  - `src/lib/asset-lifecycle-policy.ts`: `getAssetLifecycleTransitionError(operation, statusName)` (`"checkout"`, `"assign_custodian"`, `"move_scope"`), `getCheckinHandoverStatusError(mode, statusName)`, `isLegacyReturnEligible({ statusName, custodianId, hasOpenCheckout, hasActiveMaintenance })`, `normalizeAssetStateName(value)`.
  - `src/lib/asset-operation-policy.ts`: `buildAssetRegisterTransactionHref(locale, assetId, action, returnTo, checkoutId?)` (unchanged).
  - `src/lib/asset-return-navigation.ts`: `appendReturnTo(href, returnTo)`.
  - `src/lib/repair-record-policy.ts`: `getRepairRecordCreateEffect(asset, input)`, `openRepairRecordWhere`.
  - `src/lib/asset-ownership.ts`: `type AssetOwnershipType`, `normalizeAssetOwnershipType`.
  - `src/components/ui/row-actions.tsx`: `RowActions`, `type RowActionItem` (unchanged).
- Produces, in `src/lib/asset-actions.ts`:
  - `type AssetOwnershipKind = AssetOwnershipType` (the real `ownershipType` values: `"personal" | "shared" | "stock" | "component" | "software_license"`; callers map with `normalizeAssetOwnershipType`).
  - `const assetActionKeys = ["checkout", "checkin", "transfer", "viewRepair", "recordRepair", "viewDisposal", "manageComponents", "bindLicense", "renewLicense"] as const` and `type AssetActionKey = (typeof assetActionKeys)[number]`.
  - `type AssetAction = { key: AssetActionKey; labelKey: string; href: string | null; enabled: boolean; reasonKey: string | null }`. `labelKey` and `reasonKey` are full message keys (`asset.quickIssueFromStock`, `asset.transactionReasonStatusNotReady`), and every consumer reads them through the root translator (`getTranslations()` on the server, `useTranslations()` in a client part), as the dashboard reads `assetMovementLabelKey`. An unavailable action has `href: null` and a `reasonKey`; an available one has an `href` and `reasonKey: null`.
  - `type AssetPrimaryAction = AssetAction & { enabled: true; href: string; reasonKey: null }` and `type AssetActionSet = { primary: AssetPrimaryAction | null; transactions: AssetAction[] }` (the skeleton's return shape, with the primary narrowed: a primary is always an action that can run now).
  - `type AssetActionInput = { locale: string; assetId: string; statusName: string; ownership: AssetOwnershipKind; custodianId: string | null; openCheckoutId: string | null; openCheckoutHandoverMode: string | null; openRepairId: string | null; openDisposalId: string | null; returnTo: string; can: { assetEdit: boolean; maintenanceCreate: boolean; maintenanceView: boolean; disposalView: boolean } }`. `statusName` is the status's `name` ("Ready", "In Use", …). `openCheckoutId`/`openCheckoutHandoverMode` come from the open checkout (`isReturned: false, transactionStatus: "active"`), `openRepairId` from `openRepairRecordWhere`, `openDisposalId` from `openDisposalRequestWhere`, each from a dedicated query, never from a view-limited relation (spec §7.1). `custodianId` and `openCheckoutHandoverMode` replace the skeleton's `legacyReturnEligible`: the rule asks `isLegacyReturnEligible` and `getCheckinHandoverStatusError` itself, so no caller passes a stale flag.
  - `getAssetActions(input: AssetActionInput): AssetActionSet`.
  - `getAssetRecordRepairAction(input: AssetActionInput): AssetPrimaryAction | null`: "บันทึกซ่อม" when the repair rule accepts some record now (an unfinished or a finished one, either path of `getRepairRecordCreateEffect`) and the person has `maintenance:create`, else `null`. Its href carries no `returnTo`: the repair form goes back only to the repair list (`normalizeOperationalReturnTo(locale, "maintenance", …)`, `maintenance/new/page.tsx:19`). This is the single rule of "บันทึกซ่อม": rule 5's primary and the pinned button both come from it. Task 8 pins it beside the primary (spec §7.1 "Pinned beside the primary"), and leaves it out when `primary?.key === "recordRepair"`.
  - `openDisposalRequestWhere: { isActive: true; requestStatus: { in: string[] } }` = `{ isActive: true, requestStatus: { in: ["pending", "approved"] } }`, the open request the disposal API refuses a second of (`src/app/api/disposal-requests/route.ts:68-73`).
  - `firstIdByAssetId(rows: ReadonlyArray<{ id: string; assetId: string }>): Map<string, string>`: the first row per asset wins (callers order newest first).
- Produces, in `src/lib/asset-return-navigation.ts`: `normalizeAssetComponentManagerReturnTo(locale, assetId, value)` (signature unchanged) also keeps a register returnTo: pathname exactly `/${locale}/assets`, with its query and hash (R53). Every other value still falls back as today.
- Produces, in `src/components/assets/asset-action-icons.ts`: `assetActionIcons: Record<AssetActionKey, LucideIcon>` (checkout `PackageCheck`, checkin `Undo2`, transfer `ArrowRightLeft`, viewRepair `Wrench`, recordRepair `Wrench`, viewDisposal `Archive`, manageComponents `Puzzle`, bindLicense `KeyRound`, renewLicense `RefreshCw`). Task 8 uses the same map for "อื่น ๆ", the pinned buttons and the phone bar.
- Produces, in `src/components/assets/asset-register-row-actions.tsx`: the prop `transactions: AssetRegisterRowTransaction[]` becomes `actions: AssetActionSet`; `type AssetRegisterRowTransaction` is removed. `AssetRegisterRow.transactions` becomes `AssetRegisterRow.actions: AssetActionSet`.
- For Task 8: the asset page calls `getAssetActions({ locale, assetId: asset.id, statusName: asset.status.name, ownership: normalizeAssetOwnershipType(asset.ownershipType), custodianId: asset.custodianId, openCheckoutId, openCheckoutHandoverMode, openRepairId, openDisposalId, returnTo: currentAssetDetailHref, can })` with the three ids from dedicated queries, renders `primary` last in the header and first in the phone bar, puts `transactions` at the top of "อื่น ๆ", and reads every `labelKey` and `reasonKey` through the root translator. A Pending Disposal asset with no open request has no primary; Task 8's "ขอตัดจำหน่าย" (in "อื่น ๆ", `disposal:create`, `getDisposalAssetEligibilityError` plus no open request, unavailable with the first `disposalPage.readinessBlockers.*` words, no `returnTo`) is not part of this rule. Task 8 then deletes `getAssetRegisterTransactionActions` with its tests in `tests/asset-register-transactions.test.ts` (`:33-115`, `:140-153`, the page pin `:179-184`, and the `getActions` half `:187-199` of the test at `:186`, whose words half `:201-208`, pointed at the rule by this task, stays), keeping `:117-138` (hrefs) and `:155-177` (legacy return); and when it deletes `getOwnershipLifecycle` it keeps every key this rule reads (`asset.quickIssueFromStock`, `asset.quickTemporaryHandover`, `asset.quickMoveStock`, `asset.quickRelocateShared`, `asset.quickMoveComponent`, `asset.quickAssignLicense`, `asset.quickRenewLicense`, `asset.quickMaintenance`; the words test below fails if one goes).

- [ ] **Step 1: Add the messages**

Through `node scripts/messages-edit.mjs`, set these keys, and delete `asset.transactionReasonPermission` (after this task nothing shows it: an action the person may not take is left out, spec §7.1, so a viewer's register rows lose their ⋯). Glossary: ตัดจำหน่าย, งานซ่อม as the dashboard's "ดูงานซ่อม", the status names "ตัดจำหน่ายแล้ว" and "ปลดระวาง" as the seed writes them; the sentence shapes are those of `asset.transactionReasonStatusNotTransferable` and `asset.transactionReasonOpenCheckout`.

| Key | th | en |
|---|---|---|
| `asset.actionViewRepair` | ดูงานซ่อม | View repair |
| `asset.actionViewDisposal` | ดูคำขอตัดจำหน่าย | View disposal request |
| `asset.transactionReasonWrittenOff` | ย้ายไม่ได้เมื่อสถานะเป็น ตัดจำหน่ายแล้ว หรือ ปลดระวาง | A disposed or retired asset cannot be moved |
| `asset.transactionReasonOpenCheckoutHandover` | มีการส่งมอบค้างอยู่ รับคืนก่อนจึงส่งมอบใหม่ได้ | A handover is open: return the asset before handing it over again |

Every other word is an existing key, which Task 8 keeps when it deletes `getOwnershipLifecycle`: `asset.rowActionCheckout` ส่งมอบ, `asset.quickIssueFromStock` เบิกจากคลัง, `asset.quickTemporaryHandover` ยืมใช้ชั่วคราว, `asset.rowActionCheckin` รับคืน, `asset.rowActionTransfer` โอนย้าย, `asset.quickMoveStock` ย้ายคลัง/ตำแหน่ง, `asset.quickRelocateShared` ย้ายจุดติดตั้ง, `asset.quickMoveComponent` ย้ายชิ้นส่วน, `asset.manageComponents` จัดการส่วนควบ, `asset.quickAssignLicense` ผูก License, `asset.quickRenewLicense` ต่ออายุ License, `asset.quickMaintenance` บันทึกซ่อม, and the reasons `asset.transactionReasonStatusNotReady`, `asset.transactionReasonNoReturnRecord`, `asset.transactionReasonActiveMaintenance`, `asset.transactionReasonStatusNotReturnable`, `asset.transactionReasonStatusNotTransferable`, `asset.transactionReasonOpenCheckout`. A stock "เบิกจากคลัง" or shared "ยืมใช้ชั่วคราว" outside Ready reads `asset.transactionReasonStatusNotReady`, and a non-personal move blocked by a handover reads `asset.transactionReasonOpenCheckout`.

- [ ] **Step 2: Write the failing tests**

`tests/asset-actions.test.ts` (new):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  firstIdByAssetId,
  getAssetActions,
  getAssetRecordRepairAction,
  openDisposalRequestWhere,
  type AssetAction,
  type AssetActionInput,
  type AssetOwnershipKind,
} from "../src/lib/asset-actions.ts"
import { getAssetLifecycleTransitionError, getCheckinHandoverStatusError, isLegacyReturnEligible } from "../src/lib/asset-lifecycle-policy.ts"

const base: AssetActionInput = {
  locale: "th",
  assetId: "a-1",
  statusName: "Ready",
  ownership: "personal",
  custodianId: null,
  openCheckoutId: null,
  openCheckoutHandoverMode: null,
  openRepairId: null,
  openDisposalId: null,
  returnTo: "/th/assets?search=nb&page=1&pageSize=25",
  can: { assetEdit: true, maintenanceCreate: true, maintenanceView: true, disposalView: true },
}
const actions = (overrides: Partial<AssetActionInput>) => getAssetActions({ ...base, ...overrides })
const brief = (action: AssetAction | null | undefined) => (action ? [action.key, action.labelKey, action.enabled, action.reasonKey] : null)
const all = (overrides: Partial<AssetActionInput>) => {
  const set = actions(overrides)
  return [...(set.primary ? [set.primary] : []), ...set.transactions]
}
// Every status the seed holds (prisma/seed.ts:17-30).
const statuses = ["Draft", "Ready", "In Use", "Reserved", "Checked Out", "In Transit", "Pending Repair", "Under Inspection", "Lost", "Missing", "Under Maintenance", "Pending Disposal", "Disposed", "Retired"]
// labelKey and reasonKey are full message keys, read through the root translator.
const message = (locale: "th" | "en", key: string): unknown =>
  key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")))

test("labels follow the ownership type on both pages, and a licence has its own two edits (group 1 spec §7.1)", () => {
  const labels = (ownership: AssetOwnershipKind) =>
    Object.fromEntries(all({ ownership, statusName: "Disposed" }).map((action) => [action.key, action.labelKey]))
  assert.deepEqual(labels("personal"), { checkout: "asset.rowActionCheckout", checkin: "asset.rowActionCheckin", transfer: "asset.rowActionTransfer" })
  assert.deepEqual(labels("stock"), { checkout: "asset.quickIssueFromStock", checkin: "asset.rowActionCheckin", transfer: "asset.quickMoveStock" })
  assert.deepEqual(labels("shared"), { checkout: "asset.quickTemporaryHandover", checkin: "asset.rowActionCheckin", transfer: "asset.quickRelocateShared" })
  assert.deepEqual(labels("component"), { manageComponents: "asset.manageComponents", transfer: "asset.quickMoveComponent" })
  assert.deepEqual(labels("software_license"), { bindLicense: "asset.quickAssignLicense", renewLicense: "asset.quickRenewLicense" })
})

test("the primary is the first rule that applies (group 1 spec §7.1, rules 1-7)", () => {
  // 1. An open checkout whose return the API accepts, or a legacy custodian the return rule accepts.
  assert.deepEqual(brief(actions({ statusName: "Checked Out", custodianId: "e-1", openCheckoutId: "co-1", openCheckoutHandoverMode: "temporary_loan" }).primary), ["checkin", "asset.rowActionCheckin", true, null])
  assert.deepEqual(brief(actions({ statusName: "In Use", custodianId: "e-1", openCheckoutId: "co-1", openCheckoutHandoverMode: "permanent_assignment" }).primary), ["checkin", "asset.rowActionCheckin", true, null])
  assert.deepEqual(brief(actions({ statusName: "In Use", custodianId: "e-1" }).primary), ["checkin", "asset.rowActionCheckin", true, null])
  // A Ready asset with a legacy custodian: the return comes first (today's register offered ส่งมอบ there).
  assert.deepEqual(brief(actions({ custodianId: "e-1" }).primary), ["checkin", "asset.rowActionCheckin", true, null])
  assert.deepEqual(brief(actions({ ownership: "stock", statusName: "Checked Out", custodianId: "e-1", openCheckoutId: "co-1", openCheckoutHandoverMode: "temporary_loan" }).primary), ["checkin", "asset.rowActionCheckin", true, null])
  // 2. A component manages its components and a licence binds, whatever the status.
  assert.deepEqual(brief(actions({ ownership: "component", statusName: "Pending Repair", openRepairId: "r-1" }).primary), ["manageComponents", "asset.manageComponents", true, null])
  assert.deepEqual(brief(actions({ ownership: "software_license", statusName: "In Use", custodianId: "e-1" }).primary), ["bindLicense", "asset.quickAssignLicense", true, null])
  // 3. Ready: the checkout label (personal, stock), or ย้ายจุดติดตั้ง (shared).
  assert.deepEqual(brief(actions({}).primary), ["checkout", "asset.rowActionCheckout", true, null])
  assert.deepEqual(brief(actions({ ownership: "stock" }).primary), ["checkout", "asset.quickIssueFromStock", true, null])
  assert.deepEqual(brief(actions({ ownership: "shared" }).primary), ["transfer", "asset.quickRelocateShared", true, null])
  // 4. Pending Repair or Under Maintenance with an open repair record: the record.
  for (const statusName of ["Pending Repair", "Under Maintenance"]) {
    assert.deepEqual(brief(actions({ statusName, openRepairId: "r-1" }).primary), ["viewRepair", "asset.actionViewRepair", true, null], statusName)
    // A loan that went to repair: the return waits for the repair, so the record comes first.
    assert.deepEqual(brief(actions({ statusName, custodianId: "e-1", openCheckoutId: "co-1", openCheckoutHandoverMode: "temporary_loan", openRepairId: "r-1" }).primary), ["viewRepair", "asset.actionViewRepair", true, null], statusName)
  }
  // 5. Pending Repair without a record: บันทึกซ่อม.
  assert.deepEqual(brief(actions({ statusName: "Pending Repair" }).primary), ["recordRepair", "asset.quickMaintenance", true, null])
  // 6. Pending Disposal: the open request; without one there is nothing to open.
  assert.deepEqual(brief(actions({ statusName: "Pending Disposal", openDisposalId: "d-1" }).primary), ["viewDisposal", "asset.actionViewDisposal", true, null])
  assert.equal(actions({ statusName: "Pending Disposal" }).primary, null)
  // 7. Otherwise no primary. Reserved and In Transit too: a checkout starts only from Ready (asset-lifecycle-policy.ts:58), and a return without a checkout needs a custodian (:171).
  for (const statusName of ["Draft", "In Use", "Reserved", "In Transit", "Under Maintenance", "Under Inspection", "Lost", "Missing", "Disposed", "Retired"]) {
    assert.equal(actions({ statusName }).primary, null, statusName)
  }
})

test("the transactions are the ownership type's others: available first, then unavailable with the register's reasons (group 1 spec §7.1)", () => {
  assert.deepEqual(actions({}).transactions.map(brief), [
    ["transfer", "asset.rowActionTransfer", true, null],
    ["checkin", "asset.rowActionCheckin", false, "asset.transactionReasonNoReturnRecord"],
  ])
  const handedOver = actions({ statusName: "In Use", custodianId: "e-1", openCheckoutId: "co-1", openCheckoutHandoverMode: "permanent_assignment" })
  assert.deepEqual(handedOver.transactions.map(brief), [
    ["checkout", "asset.rowActionCheckout", false, "asset.transactionReasonStatusNotReady"],
    ["transfer", "asset.rowActionTransfer", false, "asset.transactionReasonOpenCheckout"],
  ])
  // A loan that went to repair cannot be returned until the repair closes; the record is the next step.
  const repair = actions({ statusName: "Pending Repair", custodianId: "e-1", openCheckoutId: "co-1", openCheckoutHandoverMode: "temporary_loan", openRepairId: "r-1" })
  assert.equal(repair.primary?.key, "viewRepair")
  assert.deepEqual(repair.transactions.map(brief), [
    ["checkout", "asset.rowActionCheckout", false, "asset.transactionReasonStatusNotReady"],
    ["checkin", "asset.rowActionCheckin", false, "asset.transactionReasonActiveMaintenance"],
    ["transfer", "asset.rowActionTransfer", false, "asset.transactionReasonStatusNotTransferable"],
  ])
  assert.deepEqual(brief(actions({ statusName: "Lost", custodianId: "e-1" }).transactions.find((action) => action.key === "checkin")), ["checkin", "asset.rowActionCheckin", false, "asset.transactionReasonStatusNotReturnable"])
  const stockOut = actions({ ownership: "stock", statusName: "Checked Out", custodianId: "e-1", openCheckoutId: "co-1", openCheckoutHandoverMode: "temporary_loan" })
  assert.deepEqual(stockOut.transactions.map(brief), [
    ["checkout", "asset.quickIssueFromStock", false, "asset.transactionReasonStatusNotReady"],
    ["transfer", "asset.quickMoveStock", false, "asset.transactionReasonOpenCheckout"],
  ])
  // A shared asset waiting for repair can still be moved: a move without a custodian is accepted in that status.
  const sharedRepair = actions({ ownership: "shared", statusName: "Pending Repair" })
  assert.equal(sharedRepair.primary?.key, "recordRepair")
  assert.deepEqual(sharedRepair.transactions.map(brief), [
    ["transfer", "asset.quickRelocateShared", true, null],
    ["checkout", "asset.quickTemporaryHandover", false, "asset.transactionReasonStatusNotReady"],
    ["checkin", "asset.rowActionCheckin", false, "asset.transactionReasonNoReturnRecord"],
  ])
  assert.deepEqual(actions({ ownership: "software_license" }).transactions.map(brief), [["renewLicense", "asset.quickRenewLicense", true, null]])
  assert.deepEqual(actions({ ownership: "component", statusName: "Retired" }).transactions.map(brief), [["transfer", "asset.quickMoveComponent", false, "asset.transactionReasonWrittenOff"]])
  // The primary never repeats in the transactions, and only an unavailable action lacks a link.
  for (const statusName of statuses) {
    for (const ownership of ["personal", "stock", "shared", "component", "software_license"] as const) {
      const set = actions({ ownership, statusName, custodianId: "e-1" })
      assert.ok(!set.transactions.some((action) => action.key === set.primary?.key), `${ownership} ${statusName}`)
      for (const action of all({ ownership, statusName, custodianId: "e-1" })) assert.equal(action.href === null, !action.enabled, `${ownership} ${statusName} ${action.key}`)
    }
  }
})

test("a transfer is offered exactly when the transfer API accepts it (group 1 spec §7.1 \"Transfers follow the API exactly\")", () => {
  for (const ownership of ["personal", "stock", "shared", "component"] as const) {
    for (const statusName of statuses) {
      for (const openCheckoutId of [null, "co-1"]) {
        const transfer = all({ ownership, statusName, custodianId: "e-1", openCheckoutId, openCheckoutHandoverMode: openCheckoutId ? "temporary_loan" : null }).find((action) => action.key === "transfer")!
        // api/assets/[id]/transfer: a custodian (personal) is assign_custodian, a move without one is move_scope; then the open checkout.
        const statusError = getAssetLifecycleTransitionError(ownership === "personal" ? "assign_custodian" : "move_scope", statusName)
        const where = `${ownership} ${statusName} ${openCheckoutId}`
        assert.equal(transfer.enabled, statusError === null && openCheckoutId === null, where)
        assert.equal(
          transfer.reasonKey,
          statusError ? (ownership === "personal" ? "asset.transactionReasonStatusNotTransferable" : "asset.transactionReasonWrittenOff") : openCheckoutId ? "asset.transactionReasonOpenCheckout" : null,
          where,
        )
      }
    }
  }
})

test("a checkout and a return are offered exactly when their APIs accept them", () => {
  for (const ownership of ["personal", "stock", "shared"] as const) {
    for (const statusName of statuses) {
      for (const mode of [null, "temporary_loan", "permanent_assignment"] as const) {
        for (const openRepairId of [null, "r-1"]) {
          for (const custodianId of [null, "e-1"]) {
            const openCheckoutId = mode ? "co-1" : null
            const list = all({ ownership, statusName, custodianId, openCheckoutId, openCheckoutHandoverMode: mode, openRepairId })
            const checkout = list.find((action) => action.key === "checkout")!
            const checkin = list.find((action) => action.key === "checkin")!
            const where = `${ownership} ${statusName} ${mode} ${openRepairId} ${custodianId}`
            // api/assets/[id]/checkout: Ready, then no open checkout.
            assert.equal(checkout.enabled, getAssetLifecycleTransitionError("checkout", statusName) === null && openCheckoutId === null, where)
            if (getAssetLifecycleTransitionError("checkout", statusName) === null && openCheckoutId) assert.equal(checkout.reasonKey, "asset.transactionReasonOpenCheckoutHandover", where)
            // api/assets/[id]/checkin against the open checkout, or api/assets/[id]/legacy-checkout.
            const returnAccepted = (openCheckoutId !== null && getCheckinHandoverStatusError(mode, statusName) === null && openRepairId === null)
              || isLegacyReturnEligible({ statusName, custodianId, hasOpenCheckout: openCheckoutId !== null, hasActiveMaintenance: openRepairId !== null })
            assert.equal(checkin.enabled, returnAccepted, where)
          }
        }
      }
    }
  }
})

test("an action the person may not take is left out, never shown as unavailable (group 1 spec §7.1)", () => {
  const viewer = { assetEdit: false, maintenanceCreate: false, maintenanceView: true, disposalView: true }
  assert.deepEqual(actions({ can: viewer }), { primary: null, transactions: [] })
  assert.deepEqual(actions({ can: viewer, statusName: "In Use", custodianId: "e-1" }), { primary: null, transactions: [] })
  assert.deepEqual(actions({ can: viewer, ownership: "software_license" }), { primary: null, transactions: [] })
  assert.equal(actions({ can: viewer, statusName: "Pending Repair", openRepairId: "r-1" }).primary?.key, "viewRepair")
  assert.equal(actions({ can: { ...viewer, maintenanceView: false }, statusName: "Pending Repair", openRepairId: "r-1" }).primary, null)
  assert.equal(actions({ can: viewer, statusName: "Pending Repair" }).primary, null, "บันทึกซ่อม needs maintenance:create")
  assert.equal(actions({ can: { ...viewer, disposalView: false }, statusName: "Pending Disposal", openDisposalId: "d-1" }).primary, null)
  // A component without asset:edit falls through to the status rules.
  assert.equal(actions({ can: viewer, ownership: "component", statusName: "Pending Repair", openRepairId: "r-1" }).primary?.key, "viewRepair")
})

test("the asset's own pages carry returnTo, the repair and disposal pages none, and a return opens the open handover itself (group 1 spec §7.1)", () => {
  const rt = `returnTo=${encodeURIComponent(base.returnTo)}`
  assert.equal(actions({}).primary?.href, `/th/asset-management/checkout?assetId=a-1&${rt}`)
  assert.equal(actions({}).transactions[0].href, `/th/asset-management/transfer?assetId=a-1&${rt}`)
  assert.equal(actions({ statusName: "Checked Out", custodianId: "e-1", openCheckoutId: "co-1", openCheckoutHandoverMode: "temporary_loan" }).primary?.href, `/th/asset-management/checkin?checkoutId=co-1&${rt}`)
  assert.equal(actions({ statusName: "In Use", custodianId: "e-1" }).primary?.href, `/th/asset-management/checkin?assetId=a-1&${rt}`)
  // The repair and disposal pages go back only to their own lists (normalizeOperationalReturnTo), so their links carry no returnTo.
  assert.equal(actions({ statusName: "Pending Repair", openRepairId: "r-1" }).primary?.href, "/th/maintenance/r-1")
  assert.equal(actions({ statusName: "Pending Repair" }).primary?.href, "/th/maintenance/new?assetId=a-1")
  assert.equal(actions({ statusName: "Pending Disposal", openDisposalId: "d-1" }).primary?.href, "/th/disposal/d-1")
  assert.equal(actions({ ownership: "component" }).primary?.href, `/th/assets/a-1/components?${rt}`)
  const licence = actions({ ownership: "software_license" })
  assert.equal(licence.primary?.href, `/th/assets/a-1/edit?${rt}`)
  assert.equal(licence.transactions[0].href, `/th/assets/a-1/edit?${rt}#asset-warranty-end`)
})

test("บันทึกซ่อม beside the primary follows the one repair rule and maintenance:create, with no returnTo (group 1 spec §7.1)", () => {
  assert.deepEqual(getAssetRecordRepairAction(base), { key: "recordRepair", labelKey: "asset.quickMaintenance", href: "/th/maintenance/new?assetId=a-1", enabled: true, reasonKey: null })
  // Rule 5's primary and the pinned button are the same action.
  assert.deepEqual(actions({ statusName: "Pending Repair" }).primary, getAssetRecordRepairAction({ ...base, statusName: "Pending Repair" }))
  // repair-record-policy.ts: a finished repair of a loaned asset is accepted, an unfinished one is not.
  assert.equal(getAssetRecordRepairAction({ ...base, statusName: "Checked Out", openCheckoutId: "co-1", openCheckoutHandoverMode: "temporary_loan" })?.key, "recordRepair")
  assert.equal(getAssetRecordRepairAction({ ...base, statusName: "Under Maintenance", openRepairId: "r-1" }), null, "one open record per asset")
  for (const statusName of ["Disposed", "Retired"]) assert.equal(getAssetRecordRepairAction({ ...base, statusName }), null, statusName)
  assert.equal(getAssetRecordRepairAction({ ...base, can: { ...base.can, maintenanceCreate: false } }), null)
})

test("the register reads the open records of its rows with these helpers", () => {
  assert.deepEqual(openDisposalRequestWhere, { isActive: true, requestStatus: { in: ["pending", "approved"] } })
  assert.deepEqual([...firstIdByAssetId([{ id: "r-2", assetId: "a" }, { id: "r-1", assetId: "a" }, { id: "r-3", assetId: "b" }])], [["a", "r-2"], ["b", "r-3"]])
})

test("the action words are the spec's, and every key the rule names exists in Thai and English (group 1 spec §5, §7.1)", () => {
  assert.deepEqual(
    ["asset.rowActionCheckout", "asset.quickIssueFromStock", "asset.quickTemporaryHandover", "asset.rowActionCheckin", "asset.rowActionTransfer", "asset.quickMoveStock", "asset.quickRelocateShared", "asset.quickMoveComponent", "asset.manageComponents", "asset.quickAssignLicense", "asset.quickRenewLicense", "asset.quickMaintenance", "asset.actionViewRepair", "asset.actionViewDisposal"].map((key) => message("th", key)),
    ["ส่งมอบ", "เบิกจากคลัง", "ยืมใช้ชั่วคราว", "รับคืน", "โอนย้าย", "ย้ายคลัง/ตำแหน่ง", "ย้ายจุดติดตั้ง", "ย้ายชิ้นส่วน", "จัดการส่วนควบ", "ผูก License", "ต่ออายุ License", "บันทึกซ่อม", "ดูงานซ่อม", "ดูคำขอตัดจำหน่าย"],
  )
  assert.equal(message("th", "asset.transactionReasonWrittenOff"), "ย้ายไม่ได้เมื่อสถานะเป็น ตัดจำหน่ายแล้ว หรือ ปลดระวาง")
  assert.equal(message("th", "asset.transactionReasonOpenCheckoutHandover"), "มีการส่งมอบค้างอยู่ รับคืนก่อนจึงส่งมอบใหม่ได้")
  assert.equal(message("th", "asset.transactionReasonPermission"), undefined, "nobody is shown an action they may not take")
  assert.equal(message("en", "asset.transactionReasonPermission"), undefined)
  const keys = new Set<string>()
  for (const ownership of ["personal", "stock", "shared", "component", "software_license"] as const) {
    for (const statusName of statuses) {
      for (const openCheckoutId of [null, "co-1"]) {
        const input = { ownership, statusName, custodianId: "e-1", openCheckoutId, openCheckoutHandoverMode: openCheckoutId ? "temporary_loan" : null, openRepairId: statusName === "Under Maintenance" ? "r-1" : null, openDisposalId: "d-1" }
        for (const action of [...all(input), getAssetRecordRepairAction({ ...base, ...input })]) {
          if (!action) continue
          keys.add(action.labelKey)
          if (action.reasonKey) keys.add(action.reasonKey)
        }
      }
    }
  }
  for (const key of keys) {
    assert.match(key, /^asset\.\w+$/, `${key} is a full key`)
    assert.equal(typeof message("th", key), "string", `th ${key}`)
    assert.equal(typeof message("en", key), "string", `en ${key}`)
  }
})
```

`tests/asset-register-transactions.test.ts`:
- `:201-202` become `const rule = readFileSync("src/lib/asset-actions.ts", "utf8").replace(/\r/g, "")` and `assert.match(rule, /"asset\.transactionReasonOpenCheckout"/)` (the reason moved from the register wrapper into the rule, as a full key).
- Add:

```ts
test("the register's rows ask the shared action rule, with the open repair and disposal of the rows shown (group 1 spec §7.1)", () => {
  const register = readFileSync("src/app/[locale]/(dashboard)/assets/page.tsx", "utf8").replace(/\r/g, "")
  assert.match(register, /const actions = getAssetActions\(\{/)
  assert.match(register, /returnTo: registerReturnHref,\n\s+can: actionPermissions,/)
  assert.match(register, /prisma\.maintenanceTicket\.findMany\(\{\s*where: \{ \.\.\.openRepairRecordWhere, assetId: \{ in: assetIds \} \},\s*select: \{ id: true, assetId: true \},\s*orderBy: \{ reportedDate: "desc" \},?\s*\}\)/)
  assert.match(register, /prisma\.disposalRequest\.findMany\(\{\s*where: \{ \.\.\.openDisposalRequestWhere, assetId: \{ in: assetIds \} \},\s*select: \{ id: true, assetId: true \},\s*orderBy: \{ requestDate: "desc" \},?\s*\}\)/)
  assert.match(register, /maintenanceView: hasPermission\(user, "maintenance", "view"\)/)
  assert.match(register, /disposalView: hasPermission\(user, "disposal", "view"\)/)
  assert.doesNotMatch(register, /getAssetRegisterTransactionActions|getRowNextAction|buildAssetRegisterTransactionHref/)
  const policy = readFileSync("src/lib/asset-operation-policy.ts", "utf8")
  assert.doesNotMatch(policy, /export function getRowNextAction/)
  const rule = readFileSync("src/lib/asset-actions.ts", "utf8")
  assert.doesNotMatch(rule, /from "@\/|from "@prisma\/client"|\bprisma\./, "the rule stays pure: relative imports, no database")
})
```

`tests/asset-register-table-ui.test.ts`:
- The test at `:10` is renamed "row actions show the shared rule's primary as the next step and its other transactions in ⋯ (group 1 spec §7.1)".
- `:16` becomes `assert.match(source, /const transactionItems: RowActionItem\[\] = \[\.\.\.\(variant === "mobile" && actions\.primary \? \[actions\.primary\] : \[\]\), \.\.\.actions\.transactions\]\.map\(toItem\)/, "a phone row has no next-step slot, so the primary leads its sheet")`.
- `:17` becomes `assert.doesNotMatch(source, /getRowNextAction|asset-operation-policy|transactionLabelKeys|reasonLabelKeys/, "the words and the reasons come from the rule")`, followed by `assert.match(source, /const tAll = useTranslations\(\)/, "the rule's keys are full keys, read through the root translator")`.
- `:29` becomes `assert.match(source, /reason: action\.reasonKey \? tAll\(action\.reasonKey\) : ""/)`.
- `:222` becomes `assert.match(source, /next=\{variant === "desktop" \? \(primary \? \{ label: tAll\(primary\.labelKey\), href: primary\.href, icon: icon\(primary\.key\), onNavigate \} : null\) : undefined\}/, "a desktop row without a next step keeps the empty 120px slot, so ⋯ lines up")`.

`tests/dropdown-menus-ui.test.ts:41` becomes `assert.match(wrapper, /kind: "unavailable"[\s\S]*?reason: action\.reasonKey \? tAll\(action\.reasonKey\) : ""/)`.

`tests/asset-register-view-model.test.ts`: delete the import at `:8` and the test at `:161-177` ("the next-step button prefers handover, then return, else nothing"); the primary's order is now tested in `tests/asset-actions.test.ts`.

`tests/asset-return-navigation.test.ts` (R53):
- The test at `:62` is renamed "component manager returns to the asset detail that opened it, never to another asset or site" (its cases stay).
- Add after `:75`:

```ts
test("the component manager also returns to the register that opened it, with its query (group 1 spec §7.1)", () => {
  // Compared with the fallback itself, so the fallback's view name is not this test's concern.
  const fallback = normalizeAssetComponentManagerReturnTo("th", "a-1", undefined)
  assert.match(fallback, /^\/th\/assets\/a-1\?view=/)
  assert.equal(normalizeAssetComponentManagerReturnTo("th", "a-1", "/th/assets?search=nb&page=2&pageSize=25"), "/th/assets?search=nb&page=2&pageSize=25")
  assert.equal(normalizeAssetComponentManagerReturnTo("th", "a-1", "/th/assets/other-id"), fallback)
  assert.equal(normalizeAssetComponentManagerReturnTo("th", "a-1", "/en/assets?search=nb"), fallback)
  assert.equal(normalizeAssetComponentManagerReturnTo("th", "a-1", "https://evil.example/th/assets?search=nb"), fallback)
})
```

`tests/asset-component-manager.test.ts:5`: the test is renamed "component manager accepts a return path to its own asset detail or to the register" (R53). Its three asserts stay.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test tests/asset-actions.test.ts tests/asset-register-transactions.test.ts tests/asset-register-table-ui.test.ts tests/dropdown-menus-ui.test.ts tests/asset-return-navigation.test.ts`
Expected: FAIL. `src/lib/asset-actions.ts` does not exist (import error), the register page still calls `getAssetRegisterTransactionActions` and `getRowNextAction` is still exported, the row-actions pins miss `actions.primary`, `toItem`, `tAll` and `action.reasonKey`, and the component manager still drops a register returnTo.

- [ ] **Step 4: Implement**

- **`src/lib/asset-actions.ts`** (relative imports: `./asset-lifecycle-policy.ts`, `./asset-operation-policy.ts`, `./asset-return-navigation.ts`, `./repair-record-policy.ts`, and `import type { AssetOwnershipType } from "./asset-ownership.ts"`). The exports in Interfaces. The label table is the spec's (exact copy):

  ```ts
  // Group 1 spec §7.1: the words follow the ownership type, on the register and the asset page alike. Full message keys, read through the root translator.
  const ownershipActions: Record<AssetOwnershipKind, ReadonlyArray<readonly [AssetActionKey, string]>> = {
    personal: [["checkout", "asset.rowActionCheckout"], ["checkin", "asset.rowActionCheckin"], ["transfer", "asset.rowActionTransfer"]],
    stock: [["checkout", "asset.quickIssueFromStock"], ["checkin", "asset.rowActionCheckin"], ["transfer", "asset.quickMoveStock"]],
    shared: [["checkout", "asset.quickTemporaryHandover"], ["checkin", "asset.rowActionCheckin"], ["transfer", "asset.quickRelocateShared"]],
    component: [["manageComponents", "asset.manageComponents"], ["transfer", "asset.quickMoveComponent"]],
    software_license: [["bindLicense", "asset.quickAssignLicense"], ["renewLicense", "asset.quickRenewLicense"]],
  }
  ```

  Each action of the table needs `can.assetEdit` (its API or page needs `asset:edit`); without it the action is left out. Statuses compare through `normalizeAssetStateName`. Each check runs in the API's own order:
  - **checkout:** `getAssetLifecycleTransitionError("checkout", statusName)` → `asset.transactionReasonStatusNotReady`; else an open checkout → `asset.transactionReasonOpenCheckoutHandover`; else `buildAssetRegisterTransactionHref(locale, assetId, "checkout", returnTo)`.
  - **checkin:** the register's rule of today (`asset-operation-policy.ts:68-92`): an open checkout with `getCheckinHandoverStatusError(openCheckoutHandoverMode, statusName) === null` and no open repair → `buildAssetRegisterTransactionHref(..., "checkin", returnTo, openCheckoutId)`; else `isLegacyReturnEligible({ statusName, custodianId, hasOpenCheckout: Boolean(openCheckoutId), hasActiveMaintenance: Boolean(openRepairId) })` → the same with no checkout id (`?assetId=`); else an open repair → `asset.transactionReasonActiveMaintenance`; else no custodian → `asset.transactionReasonNoReturnRecord`; else `asset.transactionReasonStatusNotReturnable`.
  - **transfer:** operation `"assign_custodian"` for personal, `"move_scope"` for the others (`api/assets/[id]/transfer/route.ts:42-44`); a status error → `asset.transactionReasonStatusNotTransferable` (personal) or `asset.transactionReasonWrittenOff` (the others); else an open checkout → `asset.transactionReasonOpenCheckout`; else the transfer href.
  - **manageComponents** → ``appendReturnTo(`/${locale}/assets/${encodeURIComponent(assetId)}/components`, returnTo)``; **bindLicense** → ``appendReturnTo(`/${locale}/assets/${encodeURIComponent(assetId)}/edit`, returnTo)``; **renewLicense** → the same plus `#asset-warranty-end` (the warranty end field of the form, `asset-form.tsx:1386`). Always available: their pages and the edit and components APIs check no status.
  - **viewRepair** (`can.maintenanceView`, an open repair) → `` `/${locale}/maintenance/${encodeURIComponent(openRepairId)}` ``; **viewDisposal** (`can.disposalView`, an open request) → `` `/${locale}/disposal/${encodeURIComponent(openDisposalId)}` ``. No `returnTo`: both pages go back only to their own lists (`normalizeOperationalReturnTo`, `maintenance/[id]/page.tsx:104`, `disposal/[id]/page.tsx:144`).
  - **`getAssetRecordRepairAction`:** `can.maintenanceCreate`, and `getRepairRecordCreateEffect({ statusName, ownershipType: ownership, custodianId, hasActiveCheckout: Boolean(openCheckoutId), hasOpenRecord: Boolean(openRepairId) }, { done, outcome: "usable" }).error === null` for `done` false or true (some record the form can save is accepted) → `` `/${locale}/maintenance/new?assetId=${encodeURIComponent(assetId)}` ``, with no `returnTo` (the repair form accepts only the repair list, `maintenance/new/page.tsx:19`).
  - **`getAssetActions`:** build the ownership type's actions in table order. The primary is the first of: (1) checkin when available; (2) manageComponents or bindLicense when present; (3) status Ready: checkout (personal, stock) or transfer (shared) when available; (4) Pending Repair or Under Maintenance: viewRepair when present; (5) Pending Repair without an open repair: `getAssetRecordRepairAction(input)`; (6) Pending Disposal: viewDisposal when present; (7) `null`. `transactions` are the table's actions without the primary's key, the available ones first, each group in table order.
- **`src/components/assets/asset-action-icons.ts`:** the map in Interfaces, typed `Record<AssetActionKey, LucideIcon>` (`import type { AssetActionKey } from "@/lib/asset-actions"`), so tsc fails when a key has no icon.
- **`src/lib/asset-operation-policy.ts`:** remove `getRowNextAction` (`:126-133`). Above `getAssetRegisterTransactionActions` (`:44`) add `// Only the asset page still asks this; group 1 detail plan Task 8 moves the page onto getAssetActions (asset-actions.ts) and deletes it.`
- **`src/components/assets/asset-register-row-actions.tsx`:** imports `type { AssetAction, AssetActionKey, AssetActionSet } from "@/lib/asset-actions"` and `assetActionIcons`; drops `transactionIcons`, `transactionLabelKeys`, `reasonLabelKeys`, `reasonOf`, `AssetRegisterRowTransaction` and the policy import. The prop `transactions` becomes `actions: AssetActionSet`. `t` (`asset`) and `tCommon` stay for the menu's own words; the rule's full keys go through a root translator. The pinned lines:

  ```tsx
  const tAll = useTranslations()
  const { primary } = actions
  const icon = (key: AssetActionKey, className?: string) => {
    const Icon = assetActionIcons[key]
    return <Icon className={className} aria-hidden="true" />
  }
  // An action that cannot run now stays in the menu as "unavailable": arrow keys reach it, it reads its reason, and it does nothing.
  const toItem = (action: AssetAction): RowActionItem =>
    action.enabled && action.href
      ? { kind: "link", key: action.key, label: tAll(action.labelKey), href: action.href, icon: icon(action.key, "text-primary"), onNavigate }
      : { kind: "unavailable", key: action.key, label: tAll(action.labelKey), reason: action.reasonKey ? tAll(action.reasonKey) : "", icon: icon(action.key) }
  // A phone row has no next-step slot, so the primary leads the sheet (group 1 spec §7.1).
  const transactionItems: RowActionItem[] = [...(variant === "mobile" && actions.primary ? [actions.primary] : []), ...actions.transactions].map(toItem)
  ```

  and `next={variant === "desktop" ? (primary ? { label: tAll(primary.labelKey), href: primary.href, icon: icon(primary.key), onNavigate } : null) : undefined}`. The record items, the groups, `deleteAction` and the comment's last sentence stay; the comment's rule sentence becomes "The rule (`src/lib/asset-actions.ts`, shared with the asset page) decides the next step, the other transactions, their words and their reasons; this file adds edit, clone and delete by permission."
- **`src/components/assets/asset-register-table.tsx`:** `:46` imports `type AssetActionSet` from `@/lib/asset-actions` instead of `AssetRegisterTransaction`; `:76` becomes `actions: AssetActionSet`; `:717` becomes `actions={asset.actions}`. **`asset-register-mobile-list.tsx:81`:** `actions={asset.actions}`.
- **`src/app/[locale]/(dashboard)/assets/page.tsx`:**
  - Imports: `firstIdByAssetId, getAssetActions, openDisposalRequestWhere` from `@/lib/asset-actions` replace the `asset-operation-policy` import (`:31-34`).
  - The second `Promise.all` (`:171`) becomes `[modelPhotos, openCheckouts, openRepairRecords, openDisposalRequests]`: the repair query (`:195-200`) selects `{ id: true, assetId: true }` with `orderBy: { reportedDate: "desc" }`, and a disposal query follows it with the same shape (`where: { ...openDisposalRequestWhere, assetId: { in: assetIds } }`, `select: { id: true, assetId: true }`, `orderBy: { requestDate: "desc" }`, `Promise.resolve([])` when `assetIds` is empty). One query each, for the rows of the page shown.
  - `:214` becomes `const openRepairIdByAssetId = firstIdByAssetId(openRepairRecords)` and `const openDisposalIdByAssetId = firstIdByAssetId(openDisposalRequests)`, then `const actionPermissions = { assetEdit: canEditAssets, maintenanceCreate: hasPermission(user, "maintenance", "create"), maintenanceView: hasPermission(user, "maintenance", "view"), disposalView: hasPermission(user, "disposal", "view") }`.
  - The row (`:285-303`): `const actions = getAssetActions({ locale, assetId: asset.id, statusName: asset.status.name, ownership: normalizeAssetOwnershipType(asset.ownershipType), custodianId: asset.custodianId, openCheckoutId: openCheckout?.id ?? null, openCheckoutHandoverMode: openCheckout?.handoverMode ?? null, openRepairId: openRepairIdByAssetId.get(asset.id) ?? null, openDisposalId: openDisposalIdByAssetId.get(asset.id) ?? null, returnTo: registerReturnHref, can: actionPermissions })`, one property per line with `returnTo` and `can` last, as the pin reads; `:334` `transactions,` becomes `actions,`.
- **`src/lib/asset-return-navigation.ts`** (`normalizeAssetComponentManagerReturnTo`, R53): after `const fallback` (`:27`, unchanged) add `` const registerPath = `/${locale}/assets` ``, and `:33` becomes `if (url.origin !== "http://asset.local" || (url.pathname !== allowedPath && url.pathname !== registerPath)) return fallback`. A row's "จัดการส่วนควบ" carries the register's `returnTo`, and the manager (`assets/[id]/components/page.tsx:19`) now comes back to that list with its query and hash; another asset, another locale and an off-site URL still fall back. Task 7 later changes only the fallback's view name (`:27`, `?view=custody` → `?view=components`), so its edit still applies.
- **`DESIGN.md:635`** becomes: "- **Rows:** `RowActions` (owner choice ช1) through `AssetRegisterRowActions`, from the one action rule the asset page shares (`src/lib/asset-actions.ts`, group 1 spec §7.1): a fixed 120px next-step button that is the rule's primary (for example "ส่งมอบ", "รับคืน", "ดูงานซ่อม"), or an empty slot when nothing is next, then ⋯ in a fixed slot that holds the other transactions of the ownership type (available first, unavailable ones explaining why), then edit and clone; on phones, where a row has no next-step slot, the primary leads ⋯. An action the person may not take is left out. "ลบ" comes last and only with delete permission. The ⋯ menu is a `DropdownMenu` on desktop and a bottom `Sheet` titled with the asset tag on phones. Clicking a row opens the detail page."
- **E2E:** no step changes. No spec clicks a register row's next step or ⋯ (`grep -rn "การดำเนินการของ\|menuitem" e2e`: only the audit round's pending rows and the asset page's cancel). The register is visited by `bulk-move.spec.ts:80-83`, `register-asset.spec.ts:86-88`, `licence.spec.ts:62-64`, `field-errors.spec.ts:24-50`, `shell.spec.ts:216,248`, `session.spec.ts:69-112` and `dashboard.spec.ts:206-266`, which wait for the list or read its count and chips. The viewer's write-control check (`roles.spec.ts:33-46` on `/th/assets?search=…`) still finds none: a viewer now gets no transactions at all and its rows lose ⋯ (`RowActions` draws none with no item and no delete, `ui/row-actions.tsx:89-90`), where today it got three unavailable ones without links. After this task the controller runs the E2E checkpoint of the affected specs only: `e2e/transactions`, `e2e/assets`, `e2e/smoke`, and the register steps named here (`e2e/cross-cutting/field-errors.spec.ts`, `e2e/cross-cutting/roles.spec.ts`, `e2e/shell/shell.spec.ts`, `e2e/shell/session.spec.ts`, `e2e/dashboard/dashboard.spec.ts`). Long next-step words in the 120px slot ("ดูคำขอตัดจำหน่าย", "ย้ายคลัง/ตำแหน่ง") truncate visually with the accessible name whole; the controller looks at them in its look step after Task 13.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test tests/asset-actions.test.ts tests/asset-register-transactions.test.ts tests/asset-register-table-ui.test.ts tests/dropdown-menus-ui.test.ts tests/asset-register-view-model.test.ts tests/asset-return-navigation.test.ts tests/asset-component-manager.test.ts tests/asset-clone-ui.test.ts tests/open-repair-filter.test.ts tests/asset-transaction-cancellation-routes.test.ts tests/legacy-checkin-flow.test.ts tests/thai-page-english-copy.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts && npx tsc --noEmit`
Expected: PASS. The asset page's pin (`asset-register-transactions.test.ts:179-184`) still holds, because the page keeps `getAssetRegisterTransactionActions` until Task 8; tsc is clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/asset-actions.ts src/components/assets/asset-action-icons.ts src/lib/asset-operation-policy.ts src/components/assets/asset-register-row-actions.tsx src/components/assets/asset-register-table.tsx src/components/assets/asset-register-mobile-list.tsx "src/app/[locale]/(dashboard)/assets/page.tsx" src/lib/asset-return-navigation.ts DESIGN.md messages/th.json messages/en.json tests/asset-actions.test.ts tests/asset-register-transactions.test.ts tests/asset-register-table-ui.test.ts tests/dropdown-menus-ui.test.ts tests/asset-register-view-model.test.ts tests/asset-return-navigation.test.ts tests/asset-component-manager.test.ts
git commit -m "feat(register): the row's next step and ⋯ come from one action rule the asset page will share, with the open repair and disposal of the rows shown (group 1 asset detail task 1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Register order, the location filter and previous/next

**Amendment (controller, R45):** `AssetRegisterViewMemory` (`src/components/assets/asset-register-view-memory.tsx`) does not save a view while a link-only value (`custodianState` or `locationId`) is in the URL, so coming back from an asset opened in a location or custodian list never replaces the person's saved view (`buildAssetQueryString` drops `exact`). Add a source pin for the condition in this task's tests.

The register gains a stable order (`id` as the tie-break, so "3 / 24" means the same row on both pages), a `locationId` filter with its chip (the fact strip's ที่ตั้ง cell links to it), and the pure and server helpers Task 8 needs for the middle crumb and previous/next (spec §7.2). The asset page itself does not change here.

**Files:**
- Create: `src/lib/asset-neighbours-rules.ts` (pure: relative `.ts` imports only)
- Create: `src/lib/asset-neighbours.ts` (server)
- Modify: `src/lib/asset-list-query.ts:16-36` (`locationId` param), `:54-74` (parse), `:84-101` (`currentLocationId`), `:159-161` (`buildAssetOrderBy`), `:170` (query keys)
- Modify: `src/lib/asset-list-where-options.ts` (adds `buildAssetRegisterWhere`)
- Modify: `src/lib/asset-register-chips.ts:10-13` (names), `:14-31` (labels), after `:60` (the location chip), `:67-87` (clear all)
- Modify: `src/components/assets/asset-register-table.tsx:105-125` (filters type), `:476-493` (`hasActiveFilters`)
- Modify: `src/components/assets/asset-register-view-memory.tsx:25-27` (the link-only guard after the exact-link return, R45)
- Modify: `src/app/[locale]/(dashboard)/assets/page.tsx:1` (the `Prisma` type import goes), `:7-14` (imports), `:27` (cross-scope import goes), `:61-63` (one line), `:232-235` (`selectedLocation`), `:236-283` (chip name and label). Line numbers are master's; Task 1 moved the lines after `:171`.
- Modify: `messages/th.json`, `messages/en.json` (through `scripts/messages-edit.mjs`)
- Test:
  - `tests/asset-list-query.test.ts` (import, two new tests)
  - `tests/asset-register-view-model.test.ts:47-64` (`chipLabels`), `:71` (`chipsFor` names), new test
  - `tests/asset-register-filter-ui.test.ts:16-17` (pins move to the where helper), `:26-36` (two pins added), `:183` (link-only list)
  - `tests/asset-register-view-memory.test.ts` (new test after `:42`: `locationId` arrives on an exact link and is never saved)
  - `tests/asset-register-ux.test.ts` (new test after `:78`: the component's link-only guard, R45)
  - `tests/asset-neighbours.test.ts` (new)

**Interfaces:**
- Consumes: `parseAssetListParams`, `buildAssetStatusCountWhere`, `type AssetListFilters` (`src/lib/asset-list-query.ts`); `getAssetWhereOptions` (`src/lib/asset-list-where-options.ts`); `applyAssetCrossScopeFilter` (`src/lib/asset-cross-scope.ts`); `withPerformanceTiming` (`src/lib/performance-timing.ts`); `buildAssetRegisterClearAllHref` (`src/lib/asset-register-chips.ts`, test only); `buildExactAssetRegisterHref` (`src/lib/asset-register-view-memory.ts`, unchanged: the only builder of a `locationId` link).
- Produces:
  - `src/lib/asset-list-query.ts`: `AssetListParams.locationId?: string`; `AssetListFilters.locationId: string` (trimmed, `""` when absent); `buildAssetWhere` adds `currentLocationId` when set; `buildAssetOrderBy(filters: AssetListFilters): Prisma.AssetOrderByWithRelationInput[]` returning `[{ [filters.sort]: filters.direction }, { id: filters.direction }]`; the query string carries `locationId` right after `custodianState`.
  - `src/lib/asset-list-where-options.ts`: `buildAssetRegisterWhere(filters: AssetListFilters): Promise<{ statusCountWhere: Prisma.AssetWhereInput; where: Prisma.AssetWhereInput }>`, the register's own where (its filters with the settings' windows, the cross-scope narrowing, then the status), used by the register page and by `getAssetNeighbours`.
  - `src/lib/asset-register-chips.ts`: `names.location`, `labels.location`; the chip `{ key: "location", label: "ที่ตั้ง: <name>", mobileOnly: false }`.
  - `src/lib/asset-neighbours-rules.ts`: `type AssetNeighbours = { index: number; total: number; previousId: string | null; nextId: string | null }` (`index` is the 1-based position, the "3" of "3 / 24"); `parseRegisterReturnTo(raw: string | string[] | undefined, locale: string): URLSearchParams | null`; `buildRegisterCrumbLabel(params: URLSearchParams): { kind: "search"; text: string } | { kind: "filters" } | null`; `pickAssetNeighbours(ids: readonly string[], assetId: string): AssetNeighbours | null`.
  - `src/lib/asset-neighbours.ts`: `getAssetNeighbours(params: URLSearchParams, assetId: string): Promise<AssetNeighbours | null>`, timed as `asset-detail.neighbours`.
  - For Task 8: read `const registerParams = parseRegisterReturnTo(rawSearchParams.returnTo, locale)` before `normalizeAssetReturnTo`; when it is not `null`, `getAssetNeighbours(registerParams, asset.id)` (in the page's parallel round) and `buildRegisterCrumbLabel(registerParams)`. The middle crumb is text, not a link: `asset.registerCrumbSearch` (th `ผลค้นหา "{search}"`, en `Search results for "{search}"`, ASCII quotes) for `{ kind: "search" }`, `asset.registerCrumbFilters` ("ผลการกรอง" / "Filtered results") for `{ kind: "filters" }`; Task 8 adds the two keys. The previous and next links keep `returnTo` unchanged: ``appendReturnTo(`/${locale}/assets/${encodeURIComponent(id)}`, returnToHref)``, icon links named "รายการก่อนหน้า" and "รายการถัดไป" (Task 8's words). The fact strip's ที่ตั้ง cell, when the asset has a location, links `buildExactAssetRegisterHref(locale, { locationId: asset.currentLocationId })`: `exact=1` keeps the link away from the view memory (it neither restores nor overwrites the saved view), so the register shows exactly that list and its chip.

- [ ] **Step 1: Add the chip's word**

Through `node scripts/messages-edit.mjs`, set in the `asset` namespace (glossary: ที่ตั้ง):

| Key | th | en |
|---|---|---|
| `location` | ที่ตั้ง | Location |

- [ ] **Step 2: Write the failing tests**

`tests/asset-list-query.test.ts`: add `buildAssetOrderBy` to the import from `../src/lib/asset-list-query.ts`, and add:

```ts
test("the register sorts by its column, then by id in the same direction, so previous and next are stable (group 1 spec §7.2)", () => {
  assert.deepEqual(buildAssetOrderBy(parseAssetListParams({})), [{ createdAt: "desc" }, { id: "desc" }])
  assert.deepEqual(buildAssetOrderBy(parseAssetListParams({ sort: "assetTag", direction: "asc" })), [{ assetTag: "asc" }, { id: "asc" }])
  assert.deepEqual(buildAssetOrderBy(parseAssetListParams({ sort: "purchasePrice", direction: "desc" })), [{ purchasePrice: "desc" }, { id: "desc" }])
  assert.deepEqual(buildAssetOrderBy(parseAssetListParams({ sort: "id; DROP", direction: "up" })), [{ createdAt: "desc" }, { id: "desc" }])
})

test("locationId lists the assets at that location and keeps its place in the query string (group 1 spec §7.4, §9)", () => {
  const filters = parseAssetListParams({ locationId: " loc-1 ", custodianState: "assigned" })
  assert.equal(filters.locationId, "loc-1")
  assert.equal(buildAssetWhere(filters).currentLocationId, "loc-1")
  assert.equal("currentLocationId" in buildAssetWhere(parseAssetListParams({})), false)
  assert.equal(buildAssetQueryString(filters), "custodianState=assigned&locationId=loc-1&sort=createdAt&direction=desc&page=1&pageSize=25")
  assert.equal(parseAssetListParams(new URLSearchParams(buildAssetQueryString(filters))).locationId, "loc-1")
})
```

`tests/asset-register-view-model.test.ts`:
- `chipLabels` (`:47-64`) gains `location: "ที่ตั้ง",` after `custodian`.
- `chipsFor`'s names (`:71`) gain `location: "L-01 - ห้อง IT ชั้น 3"`.
- Add:

```ts
test("locationId gets the chip ที่ตั้ง: <name> at every width, and removing it or clearing all drops it (group 1 spec §7.4)", () => {
  const chips = chipsFor("locationId=loc-1&custodianState=assigned")
  assert.deepEqual(chips.map((chip) => [chip.key, chip.label, chip.mobileOnly]), [
    ["custodianState", "มีผู้ถือครอง", false],
    ["location", "ที่ตั้ง: L-01 - ห้อง IT ชั้น 3", false],
  ])
  const withoutLocation = paramsOf(chips[1].href)
  assert.equal(withoutLocation.get("locationId"), null)
  assert.equal(withoutLocation.get("custodianState"), "assigned")
  const [raw] = buildAssetRegisterChips({ basePath: "/th/assets", filters: filters("locationId=loc-404"), tabStatusIds: [], names: {}, labels: chipLabels })
  assert.equal(raw.label, "ที่ตั้ง: loc-404")
  assert.equal(paramsOf(buildAssetRegisterClearAllHref("/th/assets", filters("locationId=loc-1"))).get("locationId"), null)
})
```

`tests/asset-register-filter-ui.test.ts`:
- `:16-17` become:

```ts
  assert.match(source, /const \{ statusCountWhere, where \} = await buildAssetRegisterWhere\(filters\)/)
  const registerWhere = read("src/lib/asset-list-where-options.ts")
  assert.match(registerWhere, /const whereOptions = await getAssetWhereOptions\(filters\)\n\s+const statusCountWhere = await applyAssetCrossScopeFilter\(buildAssetStatusCountWhere\(filters, whereOptions\), filters\.crossScope\)/)
  assert.match(registerWhere, /filters\.statusId \? \{ AND: \[statusCountWhere, \{ statusId: filters\.statusId \}\] \} : statusCountWhere/)
```

  (`:18`, the `groupBy` on `statusCountWhere`, stays.)
- In the test at `:26` add:

```ts
  assert.match(source, /location: selectedLocation \? `\$\{selectedLocation\.code\} - \$\{selectedLocation\.name\}` : undefined,/)
  assert.match(source, /location: t\("location"\),/)
```
- `:183` becomes `assert.doesNotMatch(sheet(), /licenseExpiry|returnDue|custodianState|locationId/, "link-only values: the filter sheet offers no chip for them")`.

`tests/asset-register-view-memory.test.ts`, after the exact-link test (`:36-42`), a guard that passes already and fails if `locationId` joins the saved view:

```ts
test("locationId arrives only on an exact link and is never saved as the view (group 1 spec §7.4)", () => {
  const href = buildExactAssetRegisterHref("th", { locationId: "loc-1" })
  assert.equal(href, "/th/assets?locationId=loc-1&exact=1")
  assert.equal(isExactAssetRegisterLink(new URL(href, "http://asset.local").searchParams), true)
  assert.equal(hasExplicitAssetRegisterView(new URLSearchParams("locationId=loc-1")), false)
  assert.equal(getPersistedAssetRegisterView(new URLSearchParams("locationId=loc-1&search=a")).toString(), "search=a")
})
```

`tests/asset-register-ux.test.ts`, after the exact-link test (`:74-78`), the R45 pin (`registerViewMemorySource` keeps `\r`, so the lines are joined by `\s+`):

```ts
test("a link-only value (custodianState, locationId) never overwrites the saved view (group 1 spec §7.4)", () => {
  const source = registerViewMemorySource()

  // A row's returnTo drops exact=1, so the way back from an asset opened in a location list must not save that list as the view.
  assert.match(source, /if \(isExactAssetRegisterLink\(current\)\) return\s+if \(current\.get\("custodianState"\) \|\| current\.get\("locationId"\)\) return/)
})
```

`tests/asset-neighbours.test.ts` (new):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { buildRegisterCrumbLabel, parseRegisterReturnTo, pickAssetNeighbours } from "../src/lib/asset-neighbours-rules.ts"
import { parseAssetListParams } from "../src/lib/asset-list-query.ts"
import { buildAssetRegisterClearAllHref } from "../src/lib/asset-register-chips.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("only a register address gives previous and next; opened directly, from the scan page or any other page gives none (group 1 spec §7.2)", () => {
  for (const raw of [undefined, "", [], "/th/asset-management/scan", "/th/assets/asset-2", "/th/assets/asset-2?view=history", "/th/dashboard", "/en/assets?search=nb", "https://evil.example/th/assets?search=nb", "//evil.example/th/assets"]) {
    assert.equal(parseRegisterReturnTo(raw, "th"), null, String(raw))
  }
  // The plain register is told apart from "opened directly": it gives the whole list.
  assert.equal(parseRegisterReturnTo("/th/assets", "th")?.toString(), "")
  assert.equal(parseRegisterReturnTo("/th/assets?search=notebook&page=2&pageSize=25", "th")?.get("search"), "notebook")
  assert.equal(parseRegisterReturnTo(["/th/assets?search=a", "/th/dashboard"], "th")?.get("search"), "a")
  assert.equal(parseRegisterReturnTo("/en/assets?locationId=l-1", "en")?.get("locationId"), "l-1")
})

test("the middle crumb names the search, else says the list is filtered, else is left out (group 1 spec §7.2)", () => {
  const crumb = (query: string) => buildRegisterCrumbLabel(new URLSearchParams(query))
  assert.deepEqual(crumb("search=notebook&statusId=s-1&page=2"), { kind: "search", text: "notebook" })
  assert.deepEqual(crumb("statusId=s-1"), { kind: "filters" })
  assert.equal(crumb("search=%20%20"), null, "a blank search is no search")
  assert.equal(crumb("sort=name&direction=asc&page=3&pageSize=50"), null, "the order, the page and the page size are not filters")
  assert.equal(crumb("dataQuality=bogus&ownershipType=bogus"), null, "a value the register ignores is not a filter")
  // Every filter the register can clear is a filter here, and a cleared list has none.
  const everyFilter = "companyId=c&branchId=b&categoryId=k&brandId=br&modelId=m&statusId=s&conditionId=co&ownershipType=stock&custodianId=e&custodianState=assigned&locationId=l&supplierId=sp&dataQuality=serial&crossScope=all&activity=idle_180d"
  for (const pair of everyFilter.split("&")) assert.deepEqual(crumb(pair), { kind: "filters" }, pair)
  const cleared = buildAssetRegisterClearAllHref("/th/assets", parseAssetListParams(new URLSearchParams(everyFilter)))
  assert.equal(crumb(cleared.slice(cleared.indexOf("?") + 1)), null)
})

test("previous and next follow the list's order; the first has no previous, the last no next, an asset outside the list none (group 1 spec §7.2)", () => {
  const ids = ["a", "b", "c"]
  assert.deepEqual(pickAssetNeighbours(ids, "a"), { index: 1, total: 3, previousId: null, nextId: "b" })
  assert.deepEqual(pickAssetNeighbours(ids, "b"), { index: 2, total: 3, previousId: "a", nextId: "c" })
  assert.deepEqual(pickAssetNeighbours(ids, "c"), { index: 3, total: 3, previousId: "b", nextId: null })
  assert.deepEqual(pickAssetNeighbours(["a"], "a"), { index: 1, total: 1, previousId: null, nextId: null })
  assert.equal(pickAssetNeighbours(ids, "z"), null)
  assert.equal(pickAssetNeighbours([], "a"), null)
})

test("the neighbours read the register's own where and order, ids only (group 1 spec §7.2)", () => {
  const source = read("src/lib/asset-neighbours.ts")
  assert.match(source, /const filters = parseAssetListParams\(params\)/)
  assert.match(source, /const \{ where \} = await buildAssetRegisterWhere\(filters\)/)
  assert.match(source, /prisma\.asset\.findMany\(\{\s*where,\s*orderBy: buildAssetOrderBy\(filters\),\s*select: \{ id: true \},?\s*\}\)/)
  assert.match(source, /return pickAssetNeighbours\(rows\.map\(\(row\) => row\.id\), assetId\)/)
  assert.match(source, /withPerformanceTiming\(\s*"asset-detail\.neighbours"/)
  assert.doesNotMatch(source, /include:|skip:|take:/, "never whole rows")
  assert.doesNotMatch(read("src/lib/asset-neighbours-rules.ts"), /from "@\/|\bprisma\./, "the rules stay pure")
  const register = read("src/app/[locale]/(dashboard)/assets/page.tsx")
  assert.match(register, /orderBy: buildAssetOrderBy\(filters\),/)
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test tests/asset-list-query.test.ts tests/asset-register-view-model.test.ts tests/asset-register-filter-ui.test.ts tests/asset-neighbours.test.ts tests/asset-register-view-memory.test.ts tests/asset-register-ux.test.ts`
Expected: FAIL. `buildAssetOrderBy` returns one object, `locationId` is not parsed, the chip is missing, `src/lib/asset-neighbours-rules.ts` does not exist (import error), the page still builds its where inline, and `AssetRegisterViewMemory` has no link-only guard (the R45 pin). The view-memory guard in `tests/asset-register-view-memory.test.ts` already passes.

- [ ] **Step 4: Implement**

- **`src/lib/asset-list-query.ts`:**
  - `AssetListParams` gains `locationId?: string` after `custodianState`; the parse adds `locationId: String(getValue("locationId") ?? "").trim(),` after `custodianState`.
  - `buildAssetWhere` adds `...(filters.locationId ? { currentLocationId: filters.locationId } : {}),` after the `custodianId` line. The asset's own location, not the locations under it: the list then holds exactly the assets the fact strip names.
  - `buildAssetOrderBy` returns `Prisma.AssetOrderByWithRelationInput[]`: `[{ [filters.sort]: filters.direction }, { id: filters.direction }]`, with a comment: "`id` breaks ties, so the register and the asset page's previous / next read one order (group 1 spec §7.2)". The register page, `api/assets/route.ts:39` and `api/assets/export/route.ts:56` call it unchanged.
  - The key list (`:170`) gains `"locationId"` right after `"custodianState"`.
  - `locationId` is link-only, like `custodianState`: it is not in the filter sheet and not added to the saved view's keys (`asset-register-view-memory.ts:1-18`). Every link to it is built with `buildExactAssetRegisterHref(locale, { locationId })`, whose `exact=1` makes `AssetRegisterViewMemory` leave the saved view alone on arrival (`asset-register-view-memory.tsx:25`). That alone is not enough: a row's `returnTo` comes from `buildAssetQueryString`, which drops `exact` and always writes `sort`, `direction` and `pageSize` (saved keys), so the way back from an asset would overwrite the saved view. The component gains the guard below (R45).
- **`src/components/assets/asset-register-view-memory.tsx`** (R45): right after `if (isExactAssetRegisterLink(current)) return` (`:25`), on the next line:

  ```ts
      if (current.get("custodianState") || current.get("locationId")) return // link-only values: never saved as the view (R45)
  ```

  A URL with a link-only value is not empty, so `:33` already skips the restore; the guard stops the save.
- **`src/lib/asset-list-where-options.ts`:** imports `type { Prisma } from "@prisma/client"`, `applyAssetCrossScopeFilter` from `@/lib/asset-cross-scope` and `buildAssetStatusCountWhere` from `@/lib/asset-list-query`, and adds the register page's three lines as they are, so its pins move here with them:

  ```ts
  // The register's own list: its filters with the settings' windows, the cross-scope narrowing, then the status. The
  // register page and the asset page's previous / next (asset-neighbours.ts) read this one where (group 1 spec §7.2).
  export async function buildAssetRegisterWhere(filters: AssetListFilters): Promise<{ statusCountWhere: Prisma.AssetWhereInput; where: Prisma.AssetWhereInput }> {
    const whereOptions = await getAssetWhereOptions(filters)
    const statusCountWhere = await applyAssetCrossScopeFilter(buildAssetStatusCountWhere(filters, whereOptions), filters.crossScope)
    const where: Prisma.AssetWhereInput = filters.statusId ? { AND: [statusCountWhere, { statusId: filters.statusId }] } : statusCountWhere
    return { statusCountWhere, where }
  }
  ```
- **`src/lib/asset-register-chips.ts`:** the names union gains `"location"`, `labels` gains `location: string`; after the `custodianState` chip: `if (filters.locationId) add("location", named(labels.location, names.location, filters.locationId), { locationId: "" })` (every width: the filter sheet has no location, so the chip is the only place that shows it); `buildAssetRegisterClearAllHref` clears `locationId: ""` after `custodianState`.
- **`src/components/assets/asset-register-table.tsx`:** the `filters` prop type gains `locationId: string` after `custodianState`, and `hasActiveFilters` gains `filters.locationId ||` after `filters.custodianState ||`, so an empty location list says "no results", not "no assets".
- **`src/app/[locale]/(dashboard)/assets/page.tsx`:**
  - `:61-63` become `const { statusCountWhere, where } = await buildAssetRegisterWhere(filters)`; import `buildAssetRegisterWhere` from `@/lib/asset-list-where-options` instead of `getAssetWhereOptions`; drop the now unused `buildAssetStatusCountWhere`, `applyAssetCrossScopeFilter` and `type Prisma` imports.
  - After `selectedCustodian` (`:235`): `const selectedLocation = locations.find((location) => location.id === filters.locationId)` (the page already loads every active location for the bulk form, `:124-128`, so the chip costs no query).
  - Names: ``location: selectedLocation ? `${selectedLocation.code} - ${selectedLocation.name}` : undefined,`` after `custodian`; labels: `location: t("location"),` after `custodian`.
- **`src/lib/asset-neighbours-rules.ts`** (imports `parseAssetListParams` from `./asset-list-query.ts` only):
  - `parseRegisterReturnTo`: the first value of an array; empty → `null`; `new URL(raw, "http://asset.local")` (a throw → `null`); the origin must stay `http://asset.local` and the pathname must equal `/${locale}/assets`, else `null`; returns `url.searchParams`. It reads the raw value, before `normalizeAssetReturnTo` turns a missing one into `/th/assets`.
  - `buildRegisterCrumbLabel`: parse the params; a search → `{ kind: "search", text: filters.search }`; else any of `companyId, branchId, categoryId, brandId, modelId, statusId, conditionId, ownershipType, custodianId, custodianState, locationId, supplierId, dataQuality, crossScope, activity` set → `{ kind: "filters" }`; else `null`. The order, the page and the page size are not filters.
  - `pickAssetNeighbours`: the position of `assetId` in `ids` (`-1` → `null`), `index` = position + 1, `total` = `ids.length`, and the ids on either side or `null`.
- **`src/lib/asset-neighbours.ts`** (server; imports `prisma` from `@/lib/db`, `withPerformanceTiming`, `buildAssetOrderBy` and `parseAssetListParams` from `@/lib/asset-list-query`, `buildAssetRegisterWhere`, and `pickAssetNeighbours` with its type). It reads every id of the list in the register's order, one query of ids only (about 2,000 short strings for the unfiltered register), and finds the asset among them:

  ```ts
  export async function getAssetNeighbours(params: URLSearchParams, assetId: string): Promise<AssetNeighbours | null> {
    const filters = parseAssetListParams(params)
    return withPerformanceTiming(
      "asset-detail.neighbours",
      async () => {
        const { where } = await buildAssetRegisterWhere(filters)
        const rows = await prisma.asset.findMany({
          where,
          orderBy: buildAssetOrderBy(filters),
          select: { id: true },
        })
        return pickAssetNeighbours(rows.map((row) => row.id), assetId)
      },
      { route: "/assets/[id]" },
    )
  }
  ```
- **E2E:** no step changes. The `id` tie-break only orders rows that tie on the sort column, and no spec reads the order of tied rows; `locationId` is new (Task 13 adds the fact strip's step to it).

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test tests/asset-list-query.test.ts tests/asset-register-view-model.test.ts tests/asset-register-filter-ui.test.ts tests/asset-neighbours.test.ts tests/asset-register-filters.test.ts tests/asset-register-ux.test.ts tests/asset-register-view-memory.test.ts tests/asset-return-navigation.test.ts tests/asset-register-transactions.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts && npx tsc --noEmit`
Expected: PASS. Every existing query-string pin holds, because `locationId` is written only when set; tsc is clean (the routes accept the `orderBy` array).

- [ ] **Step 6: Commit**

```bash
git add src/lib/asset-list-query.ts src/lib/asset-list-where-options.ts src/lib/asset-register-chips.ts src/lib/asset-neighbours-rules.ts src/lib/asset-neighbours.ts src/components/assets/asset-register-table.tsx src/components/assets/asset-register-view-memory.tsx "src/app/[locale]/(dashboard)/assets/page.tsx" messages/th.json messages/en.json tests/asset-list-query.test.ts tests/asset-register-view-model.test.ts tests/asset-register-filter-ui.test.ts tests/asset-register-view-memory.test.ts tests/asset-register-ux.test.ts tests/asset-neighbours.test.ts
git commit -m "feat(register): a stable order with id as the tie-break, the locationId filter and its chip, and the register's own previous / next for the asset page (group 1 asset detail task 2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: One history of the asset

**Amendment (controller, R50):** also export `getLatestAssetHistory(assetId: string, locale: string, take: number): Promise<AssetHistoryEvent[]>` from `src/lib/asset-history.ts`: the newest `take` events through the same sources, merge rules and document reader, without computing `total` or `counts` (the overview's latest three; the tab count comes from `getAssetHistoryCounts`, R11). It and `getAssetHistory` share one private loader (Step 5), so the file's `Promise.all` count stays 3; `tests/asset-history.test.ts` pins its signature and that it delegates to the loader.

**Files:**
- Create: `src/lib/asset-history-rules.ts` (pure; tests import it, so only relative `.ts` imports and type-only Prisma)
- Create: `src/lib/asset-history.ts` (server, prisma, `next-intl/server`)
- Create: `src/lib/asset-movement-documents.ts` (server, `@/lib/db`: the document reader of `src/lib/dashboard-recent.ts:35-86`, moved out and shared by the dashboard's feed, the history and Task 10's install/remove table, R13)
- Create: `src/app/api/assets/[id]/history/export/route.ts`
- Modify: `src/lib/asset-movement-labels.ts:83` (one exported type, `AssetMovementReference`, after `AssetMovementReferenceLookup`)
- Modify: `src/lib/dashboard-recent.ts:35-98` (the reads :35-86 go; it calls the shared reader; its output is unchanged)
- Modify: `src/lib/movement-labels.ts:61` (one export after `getMovementDisplayLabels` (:48-61); `buildMovementLookup` (:76-126) and the rest are unchanged, so the maintenance and disposal pages keep their labels)
- Modify: `src/lib/rbac-route-matrix.ts:82` (one entry after the `assets/[id]/status-correction` entry, :78-82)
- Modify: `messages/th.json`, `messages/en.json` (a new `asset.history` block, only through `node scripts/messages-edit.mjs`)
- Test (new): `tests/asset-history-rules.test.ts` (behaviour), `tests/asset-history.test.ts` (source pins on the server file and the route, as `tests/dashboard-overview.test.ts` does for the dashboard's server reads)
- Test (modified, with the change it pins): `tests/dashboard-overview.test.ts:50-62` (the recent feed's seven `findMany`s now live in the shared reader; the test is rewritten and a second one pins the reader, Step 1).
- The asset detail page does not change in this task: Task 8 shows the latest 3 events from `getLatestAssetHistory`, Task 9 replaces the old timeline. So these pins stay as they are until Task 9 removes the code they read: `tests/e2e-fixes.test.ts:156-162` (FX10, the page's `transfersById` and TR- link) and `:183-196` (FX11, the page's `knownMovementTypeKeys`). Task 9 moves them (R17: FX10 then pins `buildAssetMovementDocumentHref(` in `src/lib/asset-history.ts`, which this task's Step 5 calls).
- Re-run unchanged (checked by grep; nothing they pin changes):
  - `tests/asset-movement-labels.test.ts` (dashboard Task 8): the writers list stays 24 and the written types stay 47, because no new or changed src file writes an `AssetMovement` or holds a `movementType: "…"` literal (Step 4 says how).
  - `tests/dashboard-page.test.ts:216` (`canViewAssets ? getRecentAssetEvents(5) : Promise.resolve([])`): `getRecentAssetEvents` keeps its signature and output.
  - `tests/maintenance-history-labels.test.ts` (imports `getMaintenanceMovementLabel` from `movement-labels.ts`, unchanged).
  - `tests/rbac-route-matrix.test.ts` (the new route is a matrix entry with `requireAuth(` and `"asset", "view"`).
  - `tests/list-frame-guards.test.ts`: no new LV2 site; the new files write no `"-"` after `||`, `??` or `:` (a missing side reads "ไม่มี").
  - `tests/messages-parity.test.ts`, `tests/thai-glossary.test.ts`.

**Interfaces:**
- Consumes:
  - From dashboard Task 8 (`src/lib/asset-movement-labels.ts`, on master): `assetMovementLabelKey(movementType: string): string` (:75), `type AssetMovementDocumentKind` (:79), `type AssetMovementDocument` (:81), `type AssetMovementReferenceLookup` (:83), `assetMovementReferenceLookup(referenceType: string | null)` (:96), `buildAssetMovementDocumentHref(locale: string, document: AssetMovementDocument): string` (:102), `ASSET_MOVEMENT_DOCUMENT_PERMISSION` (:120, the export route's filter, R52), `ASSET_MOVEMENT_LABELLED_TYPES` (:6, tests only), `ASSET_MOVEMENT_MIRROR_TYPES` (:59, the feed's filter, unchanged).
  - From dashboard Task 1: `bangkokDayDiff(from: Date, to: Date): number` (`src/lib/waiting-work-rules.ts:51`). Existing: `getBangkokDateKey(date: Date): string` (`src/lib/preventive-maintenance.ts:50`), `getAuditRoundItemStatusLabelKey` / `getAuditRoundItemResultLabelKey` (`src/lib/audit-round-result-filters.ts:80,84`), `getAuditItemStatusLabelKey` (`src/lib/audit-item-status-labels.ts:20`), all pure.
  - Existing: `createWorkbook`, `styleWorksheetHeader`, `workbookResponse` (`src/lib/asset-excel.ts:64,72,93`); `requireAuth`, `requirePermission`, `hasPermission` (`src/lib/auth-utils.ts`); `errorResponse` (`src/lib/api-response.ts`).
- Produces (for Tasks 7, 8, 9, 10 and 13):
  - In `src/lib/asset-movement-labels.ts`: `type AssetMovementReference = { referenceType: string | null; referenceId: string | null }`.
  - In `src/lib/asset-movement-documents.ts` (R13): `resolveAssetMovementDocuments(references: readonly AssetMovementReference[]): Promise<(reference: AssetMovementReference) => AssetMovementDocument | null>`, each movement's document (number, id, kind), read once per kind present. The dashboard's feed and `getAssetHistory` use it here; Task 10's install/remove table consumes it and does not move it again.
  - In `src/lib/asset-history-rules.ts`:
    - `type AssetHistoryCategory = "checkout" | "checkin" | "transfer" | "audit" | "repair" | "disposal" | "component" | "edit"`.
    - `ASSET_HISTORY_CATEGORIES: readonly AssetHistoryCategory[]`: the chips after ทั้งหมด, in the spec's order (ส่งมอบ, รับคืน, โอนย้าย, ตรวจนับ, ซ่อม, ตัดจำหน่าย, ส่วนควบ, แก้ไขข้อมูล).
    - `assetHistoryCategory(movementType: string): AssetHistoryCategory`.
    - `type AssetHistoryEvent = { id: string; at: Date; category: AssetHistoryCategory; labelKey: string; detail: string | null; actor: string | null; document: { code: string; href: string; kind: AssetMovementDocumentKind } | null }`. `labelKey` is a full message key (`asset.movementTypes.<type>`, or `asset.history.auditScan` for a scan without a movement), so the page and the export translate it with a root `getTranslations()`, as the dashboard's feed does (R2). Every event with a document carries its `href`; the history reads no user. The page shows a document's code and link only when the person has `ASSET_MOVEMENT_DOCUMENT_PERMISSION[kind]`, and neither without it (the dashboard's rule, R12; Tasks 8 and 9 apply it on the page, and this task's export route before its rows, Step 5, R52).
    - `type AssetHistoryCounts = { total: number; counts: Record<AssetHistoryCategory, number> }` (R11's shape); `type AssetHistory = AssetHistoryCounts & { events: AssetHistoryEvent[]; capped: boolean }`.
    - `ASSET_HISTORY_DEFAULT_LIMIT = 500`, `ASSET_HISTORY_EXPORT_LIMIT = 5000`.
    - `ASSET_HISTORY_REASON_TYPES: ReadonlySet<string>` (the 18 types whose `reason` a person typed).
    - `type AssetHistoryField = "location" | "custodian" | "department" | "status" | "condition" | "branch" | "component" | "parent" | "role" | "slot"`.
    - `type AssetHistoryLabels = { fields: Record<AssetHistoryField, string>; none: string; unknownRecord: string; ownershipTypes: Readonly<Record<string, string>>; returnedFrom: (name: string) => string; repairDays: (days: number) => string }`.
    - `type AssetHistoryMovementInput = { movementType: string; fromValue: string | null; toValue: string | null; reason: string | null; checkout: { destination: string | null; handoverMode: string | null } | null; checkin: { returnBy: string } | null; repair: { problem: string; resolution: string | null; reportedDate: Date; returnDate: Date | null; repairStatus: string; hasCloseMovement: boolean } | null }`.
    - `assetHistoryMovementDetail(input: AssetHistoryMovementInput, lookup: ReadonlyMap<string, string>, labels: AssetHistoryLabels): string | null` (merge rule: a repair record's close details go into its movements).
    - `movementChangeText(fromValue: string | null, toValue: string | null, lookup: ReadonlyMap<string, string>, labels: AssetHistoryLabels): string | null`.
    - `assetHistoryLookupIds(values: readonly (string | null)[]): string[]`.
    - `type AssetHistoryAuditItem = { id: string; lastScanAt: Date | null; findingIds: readonly string[] }`; `auditItemsWithoutMovement<T extends AssetHistoryAuditItem>(items: readonly T[], movements: readonly { referenceType: string | null; referenceId: string | null; performedAt: Date }[]): T[]` (merge rule: audit items only for scans that wrote no movement).
    - `auditItemResultKey(auditStatus: string, auditResult: string | null): string | null` (a full message key).
    - `countAssetHistory(movementCounts: readonly { movementType: string; count: number }[], auditEvents: number): AssetHistoryCounts`.
    - `orderAssetHistory(events: readonly AssetHistoryEvent[], limit: number): AssetHistoryEvent[]`.
    - `assetHistoryActorLabel(user: { username: string; displayName: string; email: string | null; employee: { code: string; fullNameTh: string } | null }): string`.
    - `formatAssetHistoryDateTime(at: Date): string` (the Excel's cell only; the page's dates are Task 8B's `formatAssetDetailDate`, R37); `ASSET_HISTORY_EXCEL_COLUMNS` (6 columns: `key`, `headerKey`, `width`); `assetHistoryExcelRow(event: AssetHistoryEvent, t: (key: string) => string): { at: string; type: string; event: string; detail: string; actor: string; document: string }`.
    - `buildAssetHistoryExportFilename(assetTag: string, now: Date): string`. The "ส่งออก Excel" link is Task 9's `buildAssetHistoryExportHref(locale, assetId)` (R15), which adds the `?locale=` this route reads; this task builds no href for it.
  - In `src/lib/asset-history.ts`:
    - `getAssetHistory(assetId: string, locale: string, options?: { limit?: number }): Promise<AssetHistory>`: newest first, at most `limit` (default 500) events, `total` and `counts` over every event, `capped` when `total > events.length`. Task 9 reads it with the default. Task 8 reads `getLatestAssetHistory(asset.id, locale, 3)` instead (R50; the overview never loads a whole history).
    - `getLatestAssetHistory(assetId: string, locale: string, take: number): Promise<AssetHistoryEvent[]>` (R50): the same newest `take` events as `getAssetHistory` with `limit: take`, through the same loader, without the `groupBy`, `total` or `counts`.
    - `getAssetHistoryCounts(assetId: string): Promise<AssetHistoryCounts>` (that is, `Promise<{ total: number; counts: Record<AssetHistoryCategory, number> }>`, R11): the same `total` and `counts` from the same sources and merge rules, without loading events. Task 7's `getAssetDetailCounts` (`src/lib/asset-detail-counts.ts`, R22) takes `history` from it. The tab count, the "ทั้งหมด" chip and the overview's "ดูประวัติทั้งหมด N รายการ" are all this `total`.
    - Re-exports `type AssetHistory`, `type AssetHistoryEvent`, `type AssetHistoryCategory`.
  - In `src/lib/movement-labels.ts`: `getMovementValueLookup(ids: string[]): Promise<Map<string, string>>` (the existing id lookup: locations, statuses, conditions, departments, employees, assets, companies, branches, keyed by lower-case id).
  - The route `GET /api/assets/[id]/history/export?locale=th|en`: an `.xlsx` of every event (newest first, at most 5,000, 6 columns, Bangkok times, R15), `asset:view`. A document's code is written only for a kind the downloader may open (`ASSET_MOVEMENT_DOCUMENT_PERMISSION`, R52), as the page shows it (R12).
  - Messages in the one namespace `asset.history` (R14): `asset.history.types.*` (the eight chip words) and `asset.history.columns.*` (the table head) for Task 9, which adds the tab's own words under `asset.history.*`; "ทั้งหมด" stays `asset.movementFilters.all`.

- [ ] **Step 1: Write the failing tests**

`tests/asset-history-rules.test.ts`:

```ts
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { ASSET_MOVEMENT_LABELLED_TYPES } from "../src/lib/asset-movement-labels.ts"
import {
  ASSET_HISTORY_CATEGORIES,
  ASSET_HISTORY_DEFAULT_LIMIT,
  ASSET_HISTORY_EXCEL_COLUMNS,
  ASSET_HISTORY_EXPORT_LIMIT,
  ASSET_HISTORY_REASON_TYPES,
  assetHistoryActorLabel,
  assetHistoryCategory,
  assetHistoryExcelRow,
  assetHistoryLookupIds,
  assetHistoryMovementDetail,
  auditItemResultKey,
  auditItemsWithoutMovement,
  buildAssetHistoryExportFilename,
  countAssetHistory,
  formatAssetHistoryDateTime,
  movementChangeText,
  orderAssetHistory,
  type AssetHistoryCategory,
  type AssetHistoryEvent,
  type AssetHistoryLabels,
  type AssetHistoryMovementInput,
} from "../src/lib/asset-history-rules.ts"

const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
const fill = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key]))
const h = th.asset.history
const labels: AssetHistoryLabels = {
  fields: h.fields,
  none: h.none,
  unknownRecord: h.unknownRecord,
  ownershipTypes: { personal: th.asset.ownershipType_personal, stock: th.asset.ownershipType_stock },
  returnedFrom: (name) => fill(h.returnedFrom, { name }),
  repairDays: (days) => fill(h.repairDays, { days }),
}
const noLookup = new Map<string, string>()
const movement = (input: Partial<AssetHistoryMovementInput> & { movementType: string }): AssetHistoryMovementInput => ({
  fromValue: null, toValue: null, reason: null, checkout: null, checkin: null, repair: null, ...input,
})

test("the chips, and the chip of every movement type: a cancel and a component's copy count with their transaction (spec §7.6)", () => {
  assert.deepEqual(ASSET_HISTORY_CATEGORIES, ["checkout", "checkin", "transfer", "audit", "repair", "disposal", "component", "edit"])
  const expected: Record<AssetHistoryCategory, string[]> = {
    checkout: ["checkout", "checkout_cancel", "parent_checkout_sync"],
    checkin: ["checkin", "checkin_cancel", "parent_checkin_sync"],
    transfer: ["transfer", "transfer_cancel", "parent_transfer_sync", "bulk_location_move", "parent_bulk_move_sync"],
    audit: ["audit_correction", "audit_location_correction", "audit_custodian_correction", "audit_department_correction", "audit_condition_correction", "parent_audit_finding_sync", "parent_audit_confirmation_sync"],
    repair: ["maintenance_create", "maintenance_close", "maintenance_cancel", "maintenance_status_update", "maintenance_pm_create"],
    disposal: ["disposal_request", "disposal_approve", "disposal_reject", "disposal_execute"],
    component: ["component_install", "component_remove", "installed_in_parent", "removed_from_parent"],
    edit: ["create", "import", "batch_create", "location_change", "custodian_change", "status_change", "condition_change", "department_change", "ownership_type_change", "license_total_seats_change", "license_used_seats_change", "license_assigned_asset_change", "bulk_location_update", "bulk_custodian_update", "status_correction", "state_review_resolution", "parent_register_update_sync", "parent_bulk_update_sync"],
  }
  assert.deepEqual(Object.values(expected).flat().sort(), [...ASSET_MOVEMENT_LABELLED_TYPES].sort(), "every labelled type has exactly one chip")
  for (const [category, types] of Object.entries(expected)) {
    for (const type of types) assert.equal(assetHistoryCategory(type), category, type)
  }
  assert.equal(assetHistoryCategory("something_new"), "edit", "a type without a label still has a chip")
  assert.equal(assetHistoryCategory(""), "edit")
})

test("the counts per chip add up to the total; the scans that wrote no movement count as ตรวจนับ", () => {
  const { total, counts } = countAssetHistory(
    [
      { movementType: "checkout", count: 3 },
      { movementType: "checkout_cancel", count: 1 },
      { movementType: "checkin", count: 2 },
      { movementType: "maintenance_create", count: 2 },
      { movementType: "maintenance_close", count: 1 },
      { movementType: "audit_location_correction", count: 1 },
      { movementType: "create", count: 1 },
      { movementType: "something_new", count: 1 },
    ],
    2,
  )
  assert.deepEqual(counts, { checkout: 4, checkin: 2, transfer: 0, audit: 3, repair: 3, disposal: 0, component: 0, edit: 2 })
  assert.equal(total, 14)
  assert.deepEqual(countAssetHistory([], 0), { total: 0, counts: { checkout: 0, checkin: 0, transfer: 0, audit: 0, repair: 0, disposal: 0, component: 0, edit: 0 } })
})

test("an audit item is an event only when its scan wrote no movement (spec §7.6)", () => {
  const at = (iso: string) => new Date(iso)
  const items = [
    { id: "i-corrected", lastScanAt: at("2026-10-12T10:05:00Z"), findingIds: ["f1"] },
    { id: "i-reviewed-later", lastScanAt: at("2026-10-12T11:00:00Z"), findingIds: ["f2"] },
    { id: "i-matched", lastScanAt: at("2026-10-12T12:00:00Z"), findingIds: [] },
    { id: "i-marked-not-found", lastScanAt: null, findingIds: ["f3"] },
    { id: "i-scan-reference", lastScanAt: at("2026-10-12T13:00:00Z"), findingIds: [] },
  ]
  const movements = [
    // The scan corrected the register itself: its movement carries the scan's own time.
    { referenceType: "audit_finding", referenceId: "f1", performedAt: at("2026-10-12T10:05:00Z") },
    // A finding approved days later is a second event; the scan stays one.
    { referenceType: "audit_finding", referenceId: "f2", performedAt: at("2026-10-15T09:00:00Z") },
    { referenceType: "audit_finding", referenceId: "f3", performedAt: at("2026-10-15T09:00:00Z") },
    { referenceType: "audit_scan", referenceId: "i-scan-reference", performedAt: at("2026-10-12T13:00:00Z") },
    // Another item's finding at the same time is not this item's.
    { referenceType: "audit_finding", referenceId: "f-other", performedAt: at("2026-10-12T12:00:00Z") },
  ]
  assert.deepEqual(auditItemsWithoutMovement(items, movements).map((item) => item.id), ["i-reviewed-later", "i-matched", "i-marked-not-found"])
  assert.equal(auditItemResultKey("scanned", "found"), "auditRound.found")
  assert.equal(auditItemResultKey("scanned", "confirmed_with_parent"), "auditRound.confirmedWithParent")
  assert.equal(auditItemResultKey("reviewed", "not_found"), "auditRound.notFound")
  assert.equal(auditItemResultKey("reviewed", "mismatch"), "auditRound.mismatch")
  assert.equal(auditItemResultKey("scanned", null), "auditRound.scanned")
  assert.equal(auditItemResultKey("reconciled", null), "auditFinding.itemStatus_reconciled")
  assert.equal(auditItemResultKey("odd", "strange"), null)
})

test("a repair's close details join its movements; the record is never a row of its own (spec §7.6)", () => {
  // Typed from the input, so a change below may set `resolution` or `returnDate` to null (tsc checks tests/).
  const record: NonNullable<AssetHistoryMovementInput["repair"]> = {
    problem: "จอกะพริบ",
    resolution: "เปลี่ยนสายแพจอ",
    reportedDate: new Date("2026-08-02T04:00:00Z"),
    returnDate: new Date("2026-08-15T07:30:00Z"),
    repairStatus: "closed",
    hasCloseMovement: true,
  }
  const lookup = new Map([["st-use", "ใช้งานอยู่"], ["st-repair", "อยู่ระหว่างซ่อม"]])
  const repair = (movementType: string, changes: Partial<typeof record> = {}, reason: string | null = null) =>
    assetHistoryMovementDetail(movement({ movementType, fromValue: "st-use", toValue: "st-repair", reason, repair: { ...record, ...changes } }), lookup, labels)
  assert.equal(repair("maintenance_create", {}, "จอกะพริบ"), "จอกะพริบ")
  assert.equal(repair("maintenance_close", {}, "เปลี่ยนสายแพจอ"), "เปลี่ยนสายแพจอ · ใช้เวลา 13 วัน")
  // Recorded as done in one save (208 of 878 records on dev): one movement, which carries the close details.
  assert.equal(repair("maintenance_create", { returnDate: record.reportedDate, hasCloseMovement: false }), "จอกะพริบ · เปลี่ยนสายแพจอ")
  assert.equal(repair("maintenance_create", { repairStatus: "in_progress", resolution: null, returnDate: null, hasCloseMovement: false }), "จอกะพริบ")
  assert.equal(repair("maintenance_cancel", {}, "บันทึกผิดเครื่อง"), "บันทึกผิดเครื่อง")
  // 23:30 on 2 Aug to 00:30 on 4 Aug in Bangkok is 2 days, whatever the UTC dates say.
  assert.equal(repair("maintenance_close", { reportedDate: new Date("2026-08-02T16:30:00Z"), returnDate: new Date("2026-08-03T17:30:00Z"), resolution: null }), "ใช้เวลา 2 วัน")
  // The record is gone (never on dev): the status change shows instead.
  assert.equal(assetHistoryMovementDetail(movement({ movementType: "maintenance_create", fromValue: "st-use", toValue: "st-repair" }), lookup, labels), "ใช้งานอยู่ → อยู่ระหว่างซ่อม")
})

test("a change reads as before → after in words, never a raw key or id (spec §4)", () => {
  const lookup = new Map([
    ["loc-a", "BN-01 - สาขาบางนา"],
    ["loc-b", "HQ-01 - สำนักงานใหญ่"],
    ["emp-1", "E001 - สมชาย ใจดี"],
    ["st-ready", "พร้อมใช้งาน"],
    ["st-use", "ใช้งานอยู่"],
  ])
  // A transfer's snapshots: the fields that changed, in a fixed order.
  assert.equal(
    movementChangeText(
      JSON.stringify({ locationId: "loc-a", custodianId: null, departmentId: null, statusId: "st-ready" }),
      JSON.stringify({ locationId: "loc-b", custodianId: "emp-1", departmentId: null, statusId: "st-ready" }),
      lookup,
      labels,
    ),
    "ที่ตั้ง: BN-01 - สาขาบางนา → HQ-01 - สำนักงานใหญ่ · ผู้ถือครอง: ไม่มี → E001 - สมชาย ใจดี",
  )
  // The keys of a cancel and a component sync read in Thai; a key the history does not know is left out.
  assert.equal(
    movementChangeText(JSON.stringify({ currentLocationId: "loc-b", internalFlag: "x" }), JSON.stringify({ currentLocationId: "loc-a", internalFlag: "y" }), lookup, labels),
    "ที่ตั้ง: HQ-01 - สำนักงานใหญ่ → BN-01 - สาขาบางนา",
  )
  // A component install has only its new side, and the id beside the tag is not shown.
  assert.equal(
    movementChangeText(null, JSON.stringify({ componentAssetId: "c-1", componentAssetTag: "GRL-RAM-26-0003", componentRole: "RAM", slotNo: null }), lookup, labels),
    "ส่วนควบ: GRL-RAM-26-0003 · บทบาท: RAM",
  )
  // Plain values: an id through the lookup, an ownership code through its label, a number as it is.
  assert.equal(movementChangeText("st-ready", "st-use", lookup, labels), "พร้อมใช้งาน → ใช้งานอยู่")
  assert.equal(movementChangeText("personal", "stock", lookup, labels), `${th.asset.ownershipType_personal} → ${th.asset.ownershipType_stock}`)
  assert.equal(movementChangeText("5", "6", lookup, labels), "5 → 6")
  assert.equal(movementChangeText(null, "loc-a", lookup, labels), "BN-01 - สาขาบางนา", "a registration names where it was put")
  // An id with no record left is never printed.
  assert.equal(movementChangeText("9B2F3C1E-0000-4000-8000-000000000001", null, lookup, labels), "ไม่พบรายการอ้างอิง")
  assert.equal(movementChangeText(null, null, lookup, labels), null)
  // The ids to look up, from plain values and snapshots alike, once each and in lower case.
  assert.deepEqual(
    assetHistoryLookupIds([JSON.stringify({ locationId: "9B2F3C1E-0000-4000-8000-000000000001", componentAssetTag: "GRL-RAM-26-0003" }), "9b2f3c1e-0000-4000-8000-000000000001", "e1c0ffee-0000-4000-8000-000000000002", null, "personal"]),
    ["9b2f3c1e-0000-4000-8000-000000000001", "e1c0ffee-0000-4000-8000-000000000002"],
  )
})

test("a handover names who received it and how, a return who gave it back, and only a person's own reason is shown", () => {
  const destination = "E001 - สมชาย ใจดี"
  assert.equal(
    assetHistoryMovementDetail(movement({ movementType: "checkout", reason: "Asset checkout", checkout: { destination, handoverMode: th.asset.handoverPermanentAssignment } }), noLookup, labels),
    "E001 - สมชาย ใจดี · มอบหมายใช้งานประจำ",
  )
  assert.equal(assetHistoryMovementDetail(movement({ movementType: "checkout", checkout: { destination, handoverMode: null } }), noLookup, labels), destination)
  assert.equal(assetHistoryMovementDetail(movement({ movementType: "checkin", reason: "Asset checkin", checkin: { returnBy: destination } }), noLookup, labels), "จาก E001 - สมชาย ใจดี")
  assert.equal(assetHistoryMovementDetail(movement({ movementType: "transfer_cancel", reason: "เลือกผู้รับผิด" }), noLookup, labels), "เลือกผู้รับผิด")
  assert.equal(assetHistoryMovementDetail(movement({ movementType: "create", reason: "Initial asset registration" }), noLookup, labels), null)
  assert.deepEqual([...ASSET_HISTORY_REASON_TYPES].sort(), [
    "bulk_custodian_update", "bulk_location_move", "bulk_location_update", "checkin_cancel", "checkout_cancel", "component_install",
    "component_remove", "disposal_approve", "disposal_execute", "disposal_reject", "disposal_request", "installed_in_parent",
    "maintenance_cancel", "removed_from_parent", "state_review_resolution", "status_correction", "transfer", "transfer_cancel",
  ])
  // The types whose reason the system writes in English ("Asset checkout", "Audit scan correction", "Parent asset register update", …).
  for (const type of ["create", "import", "batch_create", "checkout", "checkin", "location_change", "audit_correction", "audit_location_correction", "audit_department_correction", "parent_register_update_sync", "parent_audit_confirmation_sync", "maintenance_create", "maintenance_close"]) {
    assert.equal(ASSET_HISTORY_REASON_TYPES.has(type), false, type)
  }
  assert.equal(assetHistoryActorLabel({ username: "it01", displayName: "IT One", email: null, employee: { code: "E009", fullNameTh: "ช่าง ไอที" } }), "E009 - ช่าง ไอที")
  assert.equal(assetHistoryActorLabel({ username: "it01", displayName: "IT One", email: null, employee: null }), "IT One (it01)")
  assert.equal(assetHistoryActorLabel({ username: "it01", displayName: "", email: "it01@example.com", employee: null }), "it01@example.com")
})

test("newest first, a fixed order for events at the same instant, and the cap", () => {
  const event = (id: string, iso: string): AssetHistoryEvent => ({ id, at: new Date(iso), category: "edit", labelKey: "asset.movementTypes.create", detail: null, actor: null, document: null })
  const events = [event("a", "2026-10-01T00:00:00Z"), event("b", "2026-10-02T00:00:00Z"), event("c", "2026-10-02T00:00:00Z"), event("d", "2026-09-30T00:00:00Z")]
  assert.deepEqual(orderAssetHistory(events, 500).map((item) => item.id), ["c", "b", "a", "d"])
  assert.deepEqual(orderAssetHistory(events, 2).map((item) => item.id), ["c", "b"])
  assert.equal(events[0].id, "a", "the input is not reordered")
  assert.equal(ASSET_HISTORY_DEFAULT_LIMIT, 500)
  assert.equal(ASSET_HISTORY_EXPORT_LIMIT, 5000)
})

test("the Excel row: the Bangkok date and time, the chip word, the event, the detail, who recorded it and the document (spec §7.6)", () => {
  assert.equal(formatAssetHistoryDateTime(new Date("2026-10-25T07:05:00Z")), "2026-10-25 14:05")
  assert.equal(formatAssetHistoryDateTime(new Date("2026-12-31T17:30:00Z")), "2027-01-01 00:30")
  const t = (key: string) => key.split(".").reduce((value, part) => value[part], th) as unknown as string
  assert.deepEqual(ASSET_HISTORY_EXCEL_COLUMNS.map((column) => [column.key, t(column.headerKey)]), [
    ["at", "วันที่ เวลา"], ["type", "ประเภท"], ["event", "รายการ"], ["detail", "รายละเอียด"], ["actor", "ผู้บันทึก"], ["document", "เอกสาร"],
  ])
  assert.deepEqual(
    assetHistoryExcelRow({
      id: "m1",
      at: new Date("2026-08-15T07:30:00Z"),
      category: "repair",
      labelKey: "asset.movementTypes.maintenance_close",
      detail: "เปลี่ยนสายแพจอ · ใช้เวลา 13 วัน",
      actor: "E009 - ช่าง ไอที",
      document: { kind: "repair", code: "MT-20260802-0001", href: "/th/maintenance/t1" },
    }, t),
    { at: "2026-08-15 14:30", type: "ซ่อม", event: "ซ่อมเสร็จ", detail: "เปลี่ยนสายแพจอ · ใช้เวลา 13 วัน", actor: "E009 - ช่าง ไอที", document: "MT-20260802-0001" },
  )
  // No document, or one the downloader may not open (the route passes it as null, R52): an empty cell.
  assert.deepEqual(
    assetHistoryExcelRow({ id: "audit-i1", at: new Date("2026-10-12T10:05:00Z"), category: "audit", labelKey: "asset.history.auditScan", detail: "พบตรง", actor: null, document: null }, t),
    { at: "2026-10-12 17:05", type: "ตรวจนับ", event: "ตรวจนับ", detail: "พบตรง", actor: "", document: "" },
  )
  assert.equal(buildAssetHistoryExportFilename("GRL-COM-26-0017", new Date("2026-10-25T17:30:00Z")), "asset-history-GRL-COM-26-0017-2026-10-26.xlsx")
  assert.equal(buildAssetHistoryExportFilename("ทดสอบ/01", new Date("2026-10-25T03:00:00Z")), "asset-history-______01-2026-10-25.xlsx")
})
```

`tests/asset-history.test.ts` (the server file and the route read prisma, so these are source pins):

```ts
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { rbacRoutePermissionMatrix } from "../src/lib/rbac-route-matrix.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const ROUTE = "src/app/api/assets/[id]/history/export/route.ts"

test("the history rules are pure and count days with the waiting work's Bangkok helper (node --test imports them)", () => {
  const source = read("src/lib/asset-history-rules.ts")
  assert.doesNotMatch(source, /from "@\//)
  assert.doesNotMatch(source, /^import (?!type )[^\n]*from "@prisma\/client"/m)
  assert.doesNotMatch(source, /prisma\./)
  assert.match(source, /import \{[^}]*\bbangkokDayDiff\b[^}]*\} from "\.\/waiting-work-rules\.ts"/)
  assert.match(source, /from "\.\/asset-movement-labels\.ts"/)
  // tests/asset-movement-labels.test.ts counts every `movementType: "…"` literal in src as a written type (47).
  assert.doesNotMatch(source, /movementType:\s*"/)
})

test("one history: the movements as its spine, the scans that wrote no movement, the repair records merged in; reads in rounds, never a write (spec §7.6)", () => {
  const source = read("src/lib/asset-history.ts")
  assert.match(source, /export async function getAssetHistory\(assetId: string, locale: string, options\?: \{ limit\?: number \}\): Promise<AssetHistory>/)
  assert.match(source, /export async function getAssetHistoryCounts\(assetId: string\): Promise<AssetHistoryCounts>/)
  assert.match(source, /export async function getLatestAssetHistory\(assetId: string, locale: string, take: number\): Promise<AssetHistoryEvent\[\]>/)
  // The overview's latest events come from the history's own loader: the same sources, merge rules and order (R50).
  assert.ok(source.includes("return (await loadAssetHistory(assetId, locale, take, false)).events"), "getLatestAssetHistory delegates to the shared loader")
  assert.match(source, /prisma\.assetMovement\.findMany\(\{\n\s*where: \{ assetId \},\n\s*orderBy: \[\{ performedAt: "desc" \}, \{ id: "desc" \}\],\n\s*take: limit,/)
  assert.match(source, /prisma\.assetMovement\.groupBy\(\{\n\s*by: \["movementType"\],\n\s*where: \{ assetId \},/)
  assert.match(source, /prisma\.auditItem\.findMany\(\{\n\s*where: \{ assetId, auditStatus: \{ not: "pending" \} \},/)
  assert.match(source, /where: \{ assetId, referenceType: \{ in: \["audit_finding", "audit_scan"\] \} \}/)
  for (const call of [
    "auditItemsWithoutMovement(",
    "countAssetHistory(",
    "orderAssetHistory(",
    "assetHistoryMovementDetail(",
    "assetHistoryCategory(",
    "assetMovementLabelKey(",
    "assetMovementReferenceLookup(",
    "resolveAssetMovementDocuments(movements)",
    "buildAssetMovementDocumentHref(locale, ",
    "getMovementValueLookup(",
    "getTranslations({ locale })",
  ]) assert.ok(source.includes(call), call)
  // The documents' numbers come from the shared reader (R13); this file reads only what the detail column needs.
  assert.match(source, /^import \{ resolveAssetMovementDocuments \} from "@\/lib\/asset-movement-documents"$/m)
  assert.doesNotMatch(source, /prisma\.(?:assetTransfer|disposalRequest|auditFinding)\./)
  assert.doesNotMatch(source, /documentNo: true|repairNo: true/)
  // A repair record is read through its movement's reference only; a component's events are its movements.
  assert.match(source, /prisma\.maintenanceTicket\.findMany\(\{ where: \{ id: \{ in: /)
  assert.doesNotMatch(source, /prisma\.assetComponent\b/)
  assert.doesNotMatch(source, /maintenanceTicket\.findMany\(\{\s*where: \{ assetId/)
  assert.equal(source.match(/await Promise\.all\(\[/g)?.length, 3, "the audit inputs, the movements, then the documents and the people")
  assert.doesNotMatch(source, /\.(create|update|upsert|delete)(Many)?\(/)
  assert.doesNotMatch(source, /movementType:\s*"/)
  assert.match(read("src/lib/movement-labels.ts"), /export async function getMovementValueLookup\(ids: string\[\]\): Promise<Map<string, string>>/)
})

test("the history's Excel: every event of one asset, with asset:view, in the page's language (spec §7.6)", () => {
  const route = read(ROUTE)
  assert.match(route, /const user = await requireAuth\(\)\n\s*requirePermission\(user, "asset", "view"\)/)
  assert.match(route, /const locale = request\.nextUrl\.searchParams\.get\("locale"\) === "en" \? "en" : "th"/)
  assert.match(route, /prisma\.asset\.findFirst\(\{ where: \{ id, isActive: true \}, select: \{ assetTag: true \} \}\)/)
  assert.match(route, /return NextResponse\.json\(\{ error: "Asset not found" \}, \{ status: 404 \}\)/)
  for (const call of [
    "getAssetHistory(id, locale, { limit: ASSET_HISTORY_EXPORT_LIMIT })",
    "getTranslations({ locale })",
    "createWorkbook()",
    "workbook.addWorksheet(t(\"asset.history.exportSheet\"))",
    "ASSET_HISTORY_EXCEL_COLUMNS.map(",
    "assetHistoryExcelRow(event, t)",
    // A document's code only for a kind the downloader may open, as the page shows it (R52).
    "hasPermission(",
    "ASSET_MOVEMENT_DOCUMENT_PERMISSION[",
    "styleWorksheetHeader(worksheet)",
    "workbookResponse(buffer, buildAssetHistoryExportFilename(asset.assetTag, new Date()))",
    "return errorResponse(error)",
  ]) assert.ok(route.includes(call), call)
  assert.deepEqual(rbacRoutePermissionMatrix.find((entry) => entry.filePath === ROUTE)?.checks, [{ module: "asset", action: "view" }])
})
```

`tests/dashboard-overview.test.ts:50-62` (the feed's pin) is replaced by these two tests (R13; Task 10 drafted the same two and now consumes them):

```ts
test("the recent feed reads asset movements only, without the mirror rows (spec §6.8)", () => {
  const source = read("src/lib/dashboard-recent.ts")
  assert.match(source, /export async function getRecentAssetEvents\(take: number\): Promise<RecentAssetEvent\[\]>/)
  assert.match(source, /prisma\.assetMovement\.findMany\(\{/)
  assert.match(source, /movementType: \{ notIn: \[\.\.\.ASSET_MOVEMENT_MIRROR_TYPES\] \}/)
  assert.match(source, /asset: \{ isActive: true \}/)
  assert.match(source, /orderBy: \[\{ performedAt: "desc" \}, \{ id: "desc" \}\]/)
  assert.match(source, /const documentOf = await resolveAssetMovementDocuments\(movements\)/)
  assert.doesNotMatch(source, /prisma\.(?:assetCheckout|assetCheckin|assetTransfer|maintenanceTicket|disposalRequest|auditFinding|auditItem)\./)
  assert.doesNotMatch(source, /systemLog|\.(create|update|upsert|delete)(Many)?\(/)
})

test("a movement's documents are read once per kind present, never per row (group 1 asset detail task 3)", () => {
  const source = read("src/lib/asset-movement-documents.ts")
  assert.match(source, /export async function resolveAssetMovementDocuments\(references: readonly AssetMovementReference\[\]\): Promise<\(reference: AssetMovementReference\) => AssetMovementDocument \| null>/)
  assert.match(source, /assetMovementReferenceLookup\(/)
  for (const model of ["assetCheckout", "assetCheckin", "assetTransfer", "maintenanceTicket", "disposalRequest", "auditFinding", "auditItem"]) {
    assert.equal(source.match(new RegExp(`prisma\\.${model}\\.findMany\\(`, "g"))?.length, 1, model)
  }
  assert.equal(source.match(/await Promise\.all\(\[/g)?.length, 1, "one round of reads")
  assert.doesNotMatch(source, /\.(create|update|upsert|delete)(Many)?\(/)
  assert.match(read("src/lib/asset-movement-labels.ts"), /export type AssetMovementReference = \{ referenceType: string \| null; referenceId: string \| null \}/)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/asset-history-rules.test.ts tests/asset-history.test.ts tests/dashboard-overview.test.ts`
Expected: FAIL.
- The first file cannot find `../src/lib/asset-history-rules.ts`.
- The second fails with `ENOENT` on `src/lib/asset-history-rules.ts`, `src/lib/asset-history.ts` and the route, and finds no `getMovementValueLookup` and no matrix entry for the route.
- The third fails on `dashboard-recent.ts` (no `resolveAssetMovementDocuments`, its own seven `findMany`s) and with `ENOENT` on `src/lib/asset-movement-documents.ts`; its other three tests pass.

- [ ] **Step 3: Add the history's words**

Write this change file outside the repo, in the session scratchpad, then run `node scripts/messages-edit.mjs <file>`. The run sets 30 keys in th and 30 in en. Every Thai value passes `tests/thai-glossary.test.ts` (no ตรวจทาน, no อยู่ที่, no แจ้งซ่อม, no Asset/Audit/Location in th). The keys sit in the one namespace `asset.history` (R14). The chip words are the spec's (§7.6); "แผนก" is the app's one word for a department (R30) and the movement labels' ("เปลี่ยนแผนก", "แก้แผนกตามผลตรวจนับ"); "บทบาท" and "ช่อง/ตำแหน่ง" are the words `movement-labels.ts` already prints for the same snapshot keys; "ผู้บันทึก" is the spec's column.

| Key `asset.history.*` | th | en |
|---|---|---|
| `types.checkout` | ส่งมอบ | Handover |
| `types.checkin` | รับคืน | Return |
| `types.transfer` | โอนย้าย | Transfer |
| `types.audit` | ตรวจนับ | Audit |
| `types.repair` | ซ่อม | Repair |
| `types.disposal` | ตัดจำหน่าย | Disposal |
| `types.component` | ส่วนควบ | Component |
| `types.edit` | แก้ไขข้อมูล | Record edit |
| `auditScan` | ตรวจนับ | Audit count |
| `fields.location` | ที่ตั้ง | Location |
| `fields.custodian` | ผู้ถือครอง | Custodian |
| `fields.department` | แผนก | Department |
| `fields.status` | สถานะ | Status |
| `fields.condition` | สภาพ | Condition |
| `fields.branch` | สาขา | Branch |
| `fields.component` | ส่วนควบ | Component |
| `fields.parent` | ทรัพย์สินหลัก | Parent asset |
| `fields.role` | บทบาท | Role |
| `fields.slot` | ช่อง/ตำแหน่ง | Slot |
| `none` | ไม่มี | None |
| `unknownRecord` | ไม่พบรายการอ้างอิง | Record not found |
| `returnedFrom` | จาก {name} | From {name} |
| `repairDays` | ใช้เวลา {days} วัน | Took {days} days |
| `columns.at` | วันที่ เวลา | Date and time |
| `columns.type` | ประเภท | Type |
| `columns.event` | รายการ | Event |
| `columns.detail` | รายละเอียด | Details |
| `columns.actor` | ผู้บันทึก | Recorded by |
| `columns.document` | เอกสาร | Document |
| `exportSheet` | ประวัติ | History |

- [ ] **Step 4: Implement the pure rules** in `src/lib/asset-history-rules.ts`

Imports only: `{ bangkokDayDiff } from "./waiting-work-rules.ts"`, `{ getBangkokDateKey } from "./preventive-maintenance.ts"`, `{ getAuditRoundItemResultLabelKey, getAuditRoundItemStatusLabelKey } from "./audit-round-result-filters.ts"`, `{ getAuditItemStatusLabelKey } from "./audit-item-status-labels.ts"` and `type { AssetMovementDocumentKind } from "./asset-movement-labels.ts"`. All five are pure (a type-only `@prisma/client` import at most).

Never write a `movementType: "…"` literal in this file or in `asset-history.ts`, and never start an array literal with a `"…_change"` string: `tests/asset-movement-labels.test.ts` reads both shapes in src as written types and pins them at 47. The category table is a `Record` of type-name arrays; a test of a type uses `movement.movementType === "…"`.

- **`assetHistoryCategory`:** a `Map` built from one table of the seven non-edit chips, exactly the lists the first test pins (cancels and a component's `parent_*_sync` copy with their transaction; `bulk_location_move` and `parent_bulk_move_sync` with โอนย้าย). Anything not in the table, an unknown type included, is `"edit"`, so the edit list is never written out.
- **`ASSET_HISTORY_REASON_TYPES`:** the 18 types the test pins. These are the writers whose `reason` is a person's own words (`input.reason`, a cancel reason, an approval or execution remark, a state-review reason). Every other writer stores a fixed English sentence ("Asset checkout", "Initial asset registration", "Audit scan correction", "Parent asset register update"), which never shows (spec §4).
- **`movementChangeText`:**
  - A value that starts with `{` and parses to an object is a snapshot (transfers, cancels, component installs and removals, component syncs). When either side is one, treat a missing side as `{}` and walk the fields in this order, each with its keys: location (`locationId`, `currentLocationId`), custodian (`custodianId`), department (`departmentId`), status (`statusId`), condition (`conditionId`), branch (`branchId`), component (`componentAssetTag`), parent (`parentAssetTag`), role (`componentRole`), slot (`slotNo`). Any other key (`componentAssetId`, `parentAssetId`, anything new) is left out.
    - A key on both sides with the same raw value is skipped; with different values it reads `"<field>: <before> → <after>"`, a missing value as `labels.none`.
    - A key on one side only reads `"<field>: <value>"` when the value is not empty.
    - Parts join with `" · "`; no part gives `null`.
  - Otherwise both are plain values: `"<before> → <after>"`, or the one that is there, or `null`.
  - A value reads, in order: `lookup.get(value.toLowerCase())`, then `labels.ownershipTypes[value]`, then `labels.unknownRecord` when the value is a UUID, else the value itself (numbers of seats, a tag).
- **`assetHistoryLookupIds`:** every UUID found anywhere in the values (`/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi`), lower-case, once each, in first-seen order.
- **`assetHistoryMovementDetail`:** parts in this order, joined with `" · "`, `null` when none.
  1. The main part:
     - `checkout` with a `checkout` input that has a destination or a mode: the destination, then the mode.
     - `checkin` with a `checkin` input: `labels.returnedFrom(returnBy)`.
     - `maintenance_create` or `maintenance_pm_create` with a `repair` input: the problem; then, when `repairStatus === "closed"` and `!hasCloseMovement` (recorded as done in one save), the close parts.
     - `maintenance_close` with a `repair` input: the close parts.
     - `maintenance_cancel` or `maintenance_status_update` with a `repair` input: no main part.
     - Anything else, or a record that is missing: `movementChangeText(fromValue, toValue, lookup, labels)`.
     - The close parts: the trimmed `resolution` when it is not empty, then `labels.repairDays(days)` with `days = bangkokDayDiff(reportedDate, returnDate)` when `returnDate` is set and `days >= 1`.
  2. The trimmed `reason`, when the type is in `ASSET_HISTORY_REASON_TYPES` and it is not already a part.
- **`auditItemsWithoutMovement`:** keeps an item unless a movement of the same instant (`performedAt.getTime() === lastScanAt.getTime()`) references it: `referenceType === "audit_finding"` with a `referenceId` in `findingIds`, or `referenceType === "audit_scan"` with `referenceId === id`. The scan route stamps a correction with the scan's own time (`audit-rounds/[id]/scan/route.ts:587`, `performedAt: scannedAt`, the same value as `lastScanAt` at :390, :460); an approval later is a separate event. An item without `lastScanAt` (marked not found, `audit-items/[id]/mark-not-found/route.ts:68-77`) is always kept. The input order is kept.
- **`auditItemResultKey`:** the page's `formatAuditState` (`assets/[id]/page.tsx:673-681`) as keys: `auditRound.<getAuditRoundItemResultLabelKey(result)>`, else `auditRound.<getAuditRoundItemStatusLabelKey(status)>`, else `auditFinding.<getAuditItemStatusLabelKey(status)>`, else `null` (the caller then shows the stored code as it is, the glossary's rule for a code without a label).
- **`countAssetHistory`:** every chip at 0, each group's count added to its type's chip, `auditEvents` added to `audit`; `total` is the sum.
- **`orderAssetHistory`:** a new array, `at` descending, then `id` descending (a stable order across loads); then the first `limit`.
- **`assetHistoryActorLabel`:** the rule of `getTransactionOperatorLabel` (`src/lib/transaction-operator-label.ts:12-15`): the employee's code and Thai name, else `displayName (username)`, else the email or the username.
- **`formatAssetHistoryDateTime`:** `YYYY-MM-DD HH:mm` in Bangkok (UTC+7, no daylight saving), Gregorian, as the register export writes dates (`toExcelDate`, ISO). The Excel's only; no page calls it (R37).
- **`ASSET_HISTORY_EXCEL_COLUMNS`:** `as const`, in the order the test pins: `at` (width 18), `type` (14), `event` (28), `detail` (60), `actor` (28), `document` (20), each with `headerKey` `asset.history.columns.<key>`.
- **`assetHistoryExcelRow`:** `at` formatted; `type` = ``t(`asset.history.types.${category}`)``; `event` = `t(labelKey)`; `detail`, `actor` and the document's `code`, each `""` when missing. It reads no user: the route passes `document: null` for a kind the downloader may not open (Step 5, R52).
- **`buildAssetHistoryExportFilename`:** `` `asset-history-${assetTag with every character outside [A-Za-z0-9._-] replaced by "_"}-${getBangkokDateKey(now)}.xlsx` `` (the header is `filename="…"`, ASCII only).
- The types and constants of the Interfaces block.

- [ ] **Step 5: Implement the reads and the export**

**`getMovementValueLookup`** in `src/lib/movement-labels.ts`, after `getMovementDisplayLabels`: `export async function getMovementValueLookup(ids: string[]): Promise<Map<string, string>>` returns `buildMovementLookup` of the lower-cased ids (an empty map for none). The labels are today's: `code - name` for locations, departments, employees, companies and branches, `assetTag - name` for assets, `nameTh` for statuses and conditions.

**The shared document reader (R13):**
- **`src/lib/asset-movement-labels.ts`**, after `AssetMovementReferenceLookup` (:83): `export type AssetMovementReference = { referenceType: string | null; referenceId: string | null }`.
- **`src/lib/asset-movement-documents.ts`** (`@/lib/db`; a head comment: each movement's document, read once per kind present, for the dashboard's feed, the asset's history and its install/remove table; it never writes): `resolveAssetMovementDocuments(references)` is `dashboard-recent.ts:35-86` moved as it is.
  - Group the ids by `assetMovementReferenceLookup(referenceType)`.
  - Read only the kinds present, in one `Promise.all`, one `findMany` each, with today's selects (`id` and `documentNo` / `repairNo` / `disposalNo`; a finding's and an audit item's `auditRound { id, auditNo }`).
  - A checkout or check-in without a `documentNo` has no document (legacy backfills). A finding or an audit item becomes its round (`kind: "auditRound"`).
  - Return `(reference) => document | null`. An empty list, or one with no known reference, reads nothing.
- **`src/lib/dashboard-recent.ts`:** the imports keep `ASSET_MOVEMENT_MIRROR_TYPES` and `type AssetMovementDocument` and gain `resolveAssetMovementDocuments` (`@/lib/asset-movement-documents`); after the movements, `const documentOf = await resolveAssetMovementDocuments(movements)`, then `document: documentOf(movement)` in the map (:88-98). Its output is unchanged, so `tests/dashboard-page.test.ts` and the dashboard E2E are not touched.

**`src/lib/asset-history.ts`** (imports through `@/lib/...`):
- A module-private `readAuditInputs(assetId: string, withGroups: boolean)` makes one `await Promise.all([...])` of three reads:
  1. `withGroups ? prisma.assetMovement.groupBy({ by: ["movementType"], where: { assetId }, _count: { _all: true } }) : Promise.resolve([])` (only the counts need the groups).
  2. `prisma.auditItem.findMany({ where: { assetId, auditStatus: { not: "pending" } }, select: { id, auditStatus, auditResult, lastScanAt, updatedAt, scannedBy, auditRound: { select: { id, auditNo } }, findings: { select: { id: true } } } })`. A pending item has no result yet; the fact strip's "รอตรวจในรอบ …" is Task 8's.
  3. `prisma.assetMovement.findMany({ where: { assetId, referenceType: { in: ["audit_finding", "audit_scan"] } }, select: { referenceType, referenceId, performedAt } })`: every audit movement, not only the loaded ones, so the count never depends on the limit.
  - It returns the groups and `auditItemsWithoutMovement(items with findingIds, references)`.
- **`getAssetHistoryCounts(assetId)`:** `readAuditInputs(assetId, true)`, then `countAssetHistory(groups mapped to { movementType, count: _count._all }, auditItems.length)`.
- A module-private `loadAssetHistory(assetId: string, locale: string, limit: number, withGroups: boolean)` holds the two rounds of the events and returns `{ events, groups, auditItems }`:
  1. One `await Promise.all([...])`: `prisma.assetMovement.findMany({ where: { assetId }, orderBy: [{ performedAt: "desc" }, { id: "desc" }], take: limit, select: { id, movementType, fromValue, toValue, reason, referenceType, referenceId, performedBy, performedAt } })`, `readAuditInputs(assetId, withGroups)` and `getTranslations({ locale })` (root, untyped like the dashboard's `tAll`).
  2. Pick the ids of the checkouts, check-ins and repair records the loaded movements reference (`assetMovementReferenceLookup(referenceType)` is `"checkout"`, `"checkin"` or `"repair"`), and collect the user ids (`performedBy`, and `scannedBy` of the audit items). Then one `await Promise.all([...])` of `resolveAssetMovementDocuments(movements)` (every document: number, id, kind) and the reads the detail column needs, each only when it has ids, each `findMany({ where: { id: { in: ids } }, select })`:
     - `assetCheckout`: `id, checkoutType, handoverMode, custodian { code, fullNameTh }, departmentId, locationId, parentAssetId`;
     - `assetCheckin`: `id, returnBy, returnByEmployee { code, fullNameTh }`;
     - `maintenanceTicket`: `id, problem, resolution, reportedDate, returnDate, repairStatus`;
     - `user`: `id, username, displayName, email, employee { code, fullNameTh }`.
     - The document numbers are never selected here (the shared reader's), so the three record kinds are read twice by id in the same round; at most `limit` ids each.
  3. `const lookup = await getMovementValueLookup(assetHistoryLookupIds([...every from/to value, ...the checkouts' departmentId, locationId, parentAssetId]))`.
  4. The labels: `fields` from `asset.history.fields.*`; `none`; `unknownRecord`; `ownershipTypes` from `asset.ownershipType_<type>` for `personal`, `shared`, `stock`, `component`, `software_license`; `returnedFrom` and `repairDays` through `t` with `{ name }` and `{ days }`.
  5. One event per loaded movement: `id` = the movement's id; `at` = `performedAt`; `category` = `assetHistoryCategory`; `labelKey` = `assetMovementLabelKey`; `actor` = the user's `assetHistoryActorLabel`, else `performedBy` as stored; `detail` = `assetHistoryMovementDetail` with:
     - `checkout`: the destination of the page's `getCheckoutDestination` (`assets/[id]/page.tsx:2389-2408`): the custodian's `code - fullNameTh` for `checkoutType === "user"`, else the lookup's label of the department, location or parent asset; the mode `t("asset.handoverPermanentAssignment")` for `permanent_assignment`, `t("asset.handoverTemporaryLoan")` for `temporary_loan`, else `null` (a legacy row says nothing about its mode);
     - `checkin`: `returnBy` = the employee's `code - fullNameTh`, else the stored `returnBy`;
     - `repair`: the record's fields and `hasCloseMovement` = some loaded movement with `movementType === "maintenance_close"` and this `referenceId` (a close is always newer than its record's create, so it is loaded whenever the create is).
     - `document` = `documentOf(movement)` from the shared reader, then `{ code, kind, href: buildAssetMovementDocumentHref(locale, document) }`; no document, or a missing record, gives `null`. A component movement's `referenceId` is its `AssetComponent` row, which the reader does not know (its `referenceType` has no lookup), so it has no document here (Task 10 links the install's reference).
  6. One event per audit item that `readAuditInputs` kept: `id` = `` `audit-${item.id}` ``; `at` = `lastScanAt ?? updatedAt`; `category` = `"audit"`; `labelKey` = `"asset.history.auditScan"`; `detail` = `t(auditItemResultKey(...))`, else the stored `auditResult ?? auditStatus`; `actor` = the scanner's label (`scannedBy`), else `null`; `document` = the round (`{ kind: "auditRound", id, code: auditNo }` with its href, from the item's own `auditRound` select).
  7. Return `{ events: orderAssetHistory([...movement events, ...audit events], limit), groups, auditItems }`. All audit items are loaded (at most 7 per asset on dev), so the newest `limit` events overall are among them and the newest `limit` movements.
- **`getAssetHistory(assetId, locale, options)`:** `limit = options?.limit ?? ASSET_HISTORY_DEFAULT_LIMIT`; `loadAssetHistory(assetId, locale, limit, true)`, then `total` and `counts` from `countAssetHistory` of its groups and audit items, as `getAssetHistoryCounts` does. Return `{ events, total, counts, capped: total > events.length }`.
- **`getLatestAssetHistory(assetId, locale, take)`** (R50): `return (await loadAssetHistory(assetId, locale, take, false)).events`: no `groupBy`, no counts.
- So the file has three `await Promise.all([` (the pin): `readAuditInputs`, then the loader's two rounds. None of the three exported functions makes a round of its own.
- No `withPerformanceTiming` inside the lib: the page wraps the call in its own labels (Task 7's counts, Task 8's overview read, Task 9's `asset-detail.history-tab`, R24). No write, no `AssetComponent` read, no ticket list by `assetId`: a repair and a component install are history through their movements only (spec §7.6), and dev has no repair record and no component link without one (SELECT on `asset_management_dev`, 2026-10-26: 0 of 878 records, 0 of 365 links).

**`src/app/api/assets/[id]/history/export/route.ts`:**

```ts
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "view")
    const { id } = await context.params
    const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "th"
    const asset = await prisma.asset.findFirst({ where: { id, isActive: true }, select: { assetTag: true } })
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    const [{ events }, t] = await Promise.all([getAssetHistory(id, locale, { limit: ASSET_HISTORY_EXPORT_LIMIT }), getTranslations({ locale })])
    // A document's code only for a kind the downloader may open, as the page shows it (R52).
    const canOpen = (kind: AssetMovementDocumentKind) => hasPermission(user, ASSET_MOVEMENT_DOCUMENT_PERMISSION[kind].module, "view")
    const visible = events.map((event) => ({ ...event, document: event.document && canOpen(event.document.kind) ? event.document : null }))
    const workbook = createWorkbook()
    const worksheet = workbook.addWorksheet(t("asset.history.exportSheet"))
    worksheet.columns = ASSET_HISTORY_EXCEL_COLUMNS.map((column) => ({ header: t(column.headerKey), key: column.key, width: column.width }))
    worksheet.addRows(visible.map((event) => assetHistoryExcelRow(event, t)))
    styleWorksheetHeader(worksheet)
    const buffer = await workbook.xlsx.writeBuffer()
    return workbookResponse(buffer, buildAssetHistoryExportFilename(asset.assetTag, new Date()))
  } catch (error) {
    return errorResponse(error)
  }
}
```

"Asset not found" is already in the API error catalog (`src/lib/api-error-catalog.ts:17`). The locale is read as the search API reads it (`src/app/api/search/route.ts:48`). The route imports `hasPermission` beside `requireAuth` and `requirePermission` (`@/lib/auth-utils`), and `ASSET_MOVEMENT_DOCUMENT_PERMISSION` and `type AssetMovementDocumentKind` from `@/lib/asset-movement-labels`; `assetHistoryExcelRow` stays pure.

**`src/lib/rbac-route-matrix.ts`**, after the status-correction entry (:78-82):

```ts
  {
    filePath: "src/app/api/assets/[id]/history/export/route.ts",
    label: "Asset history export",
    checks: [{ module: "asset", action: "view" }],
  },
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `node --test tests/asset-history-rules.test.ts tests/asset-history.test.ts tests/dashboard-overview.test.ts tests/dashboard-page.test.ts tests/asset-movement-labels.test.ts tests/maintenance-history-labels.test.ts tests/rbac-route-matrix.test.ts tests/list-frame-guards.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts tests/e2e-fixes.test.ts && npx tsc --noEmit && npx eslint src/lib/asset-history-rules.ts src/lib/asset-history.ts src/lib/asset-movement-documents.ts src/lib/asset-movement-labels.ts src/lib/dashboard-recent.ts src/lib/movement-labels.ts src/lib/rbac-route-matrix.ts "src/app/api/assets/[id]/history/export/route.ts"`
Expected: PASS, every test.
- `tests/asset-movement-labels.test.ts` still finds 24 writers and 47 written types.
- `tests/dashboard-overview.test.ts` reads the feed through the shared reader, and the reader with one `findMany` per kind.
- tsc is clean; eslint reports nothing.

- [ ] **Step 7: Commit**

```bash
git add src/lib/asset-history-rules.ts src/lib/asset-history.ts src/lib/asset-movement-documents.ts src/lib/asset-movement-labels.ts src/lib/dashboard-recent.ts "src/app/api/assets/[id]/history/export/route.ts" src/lib/movement-labels.ts src/lib/rbac-route-matrix.ts messages/th.json messages/en.json tests/asset-history-rules.test.ts tests/asset-history.test.ts tests/dashboard-overview.test.ts
git commit -m "feat(asset-detail): one history of the asset from its movements and the scans that changed nothing, with its Excel export and one shared reader of a movement's document (group 1 asset detail task 3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Photos that load small and fail gracefully

**Files:**
- Modify: `src/lib/attachment-thumbnail.ts`: the size constant :1, `buildThumbnailETag` :12-15, `thumbnailUrl` :37-39
- Modify: `src/app/api/attachments/[id]/thumbnail/route.ts`: the uploads import :7, the thumbnail import :9-16, the tag :42, the resize :59-63; the local `isMissingFileError` :76-78 goes (it moves to `uploads.ts`)
- Modify: `src/app/api/attachments/[id]/route.ts`: the uploads import :7 and the read :29-30 of `GET`; `DELETE` (:50-82) is unchanged
- Modify: `src/lib/uploads.ts`: the comment above `OutsideUploadRootError` :43-45; `isMissingFileError` after `isOutsideUploadRootError` (:53-55)
- Create: `src/components/assets/asset-photo-frame.tsx` (client)
- Modify: `e2e/support/allow-list.ts:20-37` (the two thumbnail entries accept `?size=card`)
- Modify: `DESIGN.md:638` (the Thumbnails line)
- Modify: `messages/th.json`, `messages/en.json` (`asset.photoFrame`, only through `node scripts/messages-edit.mjs`)
- Test (new): `tests/attachment-original-route.test.ts` (the route run with mocked modules, as `tests/attachment-thumbnail-route.test.ts` does), `tests/asset-photo-frame.test.ts` (source pins)
- Test (modified, with the change they pin):
  - `tests/attachment-thumbnail.test.ts`: one new test (the card size); the import list gains `attachmentCardThumbnailSize` and `attachmentThumbnailSizeFor`. The existing tests stay: the default tag stays `"att-1-96"` and `thumbnailUrl("att-1")` stays without a query.
  - `tests/attachment-thumbnail-route.test.ts:37-40`: the `@/lib/uploads` mock gains `export function isMissingFileError(error) { return Boolean(error && error.code === "ENOENT") }` (the route now imports it from there). `:84-89`: `get(headers, query = "")` appends `query` to the URL. Two new tests after :146.
  - `tests/dark-mode-p.test.ts:151`: `images.length` 19 → **20** ("every <img> and next/image in src"); `:157-158`: the stage count 15 → **16** and its comment "The stage is on the 16 images only, …". `NOT_UPLOADS` (:141-146) is unchanged: the new image carries the stage (in both of its branches, one `<img>` in the source). Later tasks move both numbers from these with their own removals (R29: Task 8 → 18 / 14; Task 11 states its own).
  - `tests/visual-foundation-guards.test.ts`, N3's `RAW_BUTTON_EXEMPT`, a new row after :373 (the list is alphabetical): `"src/components/assets/asset-photo-frame.tsx": { count: 1, kind: "permanent", why: "the card photo is the control that opens the original in the preview dialog", ruling: "2D-3 R5, group 1 asset detail task 4" },`. The phase 3 rows (:458-471) are unchanged.
  - `tests/e2e-fixes.test.ts:117` (FX8, R28): the allow-list pin becomes, with its reason as a comment above it, `// The asset page's photo card loads the same route with ?size=card (group 1 asset detail task 4): the one query the entry accepts, still five entries.` then `assert.match(allow, /id: "foreign-attachment-thumbnail",\n\s*kind: "response",\n\s*url: \/\\\/api\\\/attachments\\\/\[0-9a-f-\]\{36\}\\\/thumbnail\(\?:\\\?size=card\)\?\$\/,\n\s*status: \[404\],/)` (checked against the new entry's text while planning). The route pin :114-116 holds as it is: the thumbnail route keeps the same `if` line, with `isMissingFileError` imported.
  - `tests/e2e-transactions.test.ts:62-80` (TX1): the classify case gains the card URL (below).
- Re-run unchanged (checked by grep):
  - `tests/asset-register-building-blocks-ui.test.ts:28-40` (`src={thumbnailUrl(photo.id)}` in `asset-thumbnail.tsx`: the default needs no change there).
  - `tests/my-assets-attachment-permission.test.ts:17-29` (`await assertCanViewAttachment(user, attachment)` in both routes; the `DELETE` block).
  - `tests/security-headers.test.ts:35-39` (`"X-Content-Type-Options": "nosniff"`, `"Cache-Control": "private, no-store"`), `tests/repair-record-routes.test.ts:175-179`, `tests/rbac-route-matrix.test.ts` (`src/lib/rbac-route-matrix.ts:88-101`: both routes keep their snippets).
  - `tests/e2e-suite.test.ts:291-296` (the allow-list stays at five entries, each reviewed with a reason of 40 characters or more), `tests/e2e-audit.test.ts:149-155`, `tests/e2e-cross-cutting.test.ts:165-180`.
  - `tests/api-error-catalog.test.ts` ("Attachment file not found" is `attachmentFileNotFound`, `src/lib/api-error-catalog.ts:48`).
  - `tests/asset-photo-gallery.test.ts:23-28` reads the page's `function SidebarPhotoCard` and `h-32`; the page does not change here, so it stays until Task 8 replaces that card with `AssetPhotoFrame`.
- No E2E step changes in this task: no page renders `AssetPhotoFrame` yet. Task 8 does, and the register-asset step's `main img[src*="/api/attachments/"]` (`e2e/transactions/register-asset.spec.ts:97-99`) still matches `…/thumbnail?size=card`.
- **For the plan's "Decisions taken while planning" (R26):** the overview's photo card offers a link to the files tab, labelled "อัปโหลดรูป" from `md` and "ถ่ายรูป" below it, instead of spec §7.5's in-place camera input. The camera input lives on the files tab (Task 11).

**Interfaces:**
- Produces (for Task 8's รูป card and Task 11's files tab):
  - In `src/lib/attachment-thumbnail.ts`: `attachmentCardThumbnailSize = 480`; `attachmentThumbnailSizeFor(raw: string | null): number` (480 for `"card"`, else `attachmentThumbnailSize`, 96); `buildThumbnailETag(attachmentId: string, size: number = attachmentThumbnailSize): string`; `thumbnailUrl(attachmentId: string, size?: "card"): string`.
  - In `src/lib/uploads.ts`: `isMissingFileError(error: unknown): boolean`.
  - `GET /api/attachments/<id>/thumbnail?size=card`: a WebP that fits 480×480, never enlarged, cached as the 96px one, with its own tag `"<id>-480"`. Any other `size` value, or none, is the 96px thumbnail.
  - `GET /api/attachments/<id>` answers 404 `{ error: "Attachment file not found" }` for a file that is gone or outside this server's upload folder, as the thumbnail route does (`tests/e2e-fixes.test.ts:108-118`).
  - `AssetPhotoFrame({ attachmentId, alt, label, canUpload, uploadHref, previewable = true, className }: { attachmentId: string | null; alt: string; label?: string; canUpload: boolean; uploadHref?: string; previewable?: boolean; className?: string })` in `src/components/assets/asset-photo-frame.tsx` (R26). The caller passes:
    - `attachmentId` only for an image the thumbnail route can render (`isThumbnailable(fileType)`, R27; HEIC and SVG are listed as documents);
    - `alt` = what the photo shows (the asset's name);
    - `label` = a caption, for the model photo `asset.modelPhoto` "รูปประจำรุ่น" (R27);
    - `canUpload` = `asset:edit`, and `uploadHref` = where a photo is added (Task 8: the files tab). The upload is a link, only with both;
    - `previewable` (default `true`): the image is the raw `<button>` that opens the original in `AttachmentPreviewDialog`. Task 11's tiles pass `previewable={false}` (and `canUpload={false}`) inside their own preview button, so the frame then renders no button, link or dialog;
    - `className` for size: the frame fills its parent's box, and its image, empty state and failure all sit in that box.
- Consumes: `AttachmentPreviewDialog` (`src/components/ui/attachment-preview-dialog.tsx`), `ActionEmptyState` (`src/components/ui/action-empty-state.tsx`, client-safe; its `action` slot, :17), `buttonVariants` (`@/components/ui/button-variants`), `cn` (`@/lib/utils`), `asset.download` ("ดาวน์โหลด", existing).

- [ ] **Step 1: Write the failing tests**

`tests/attachment-thumbnail.test.ts`, one new test (and the two new names in its import list):

```ts
test("a photo card asks for the 480px rendition under its own tag; any other size is the 96px default (group 1 asset detail task 4)", () => {
  assert.equal(attachmentCardThumbnailSize, 480)
  assert.equal(attachmentThumbnailSizeFor("card"), 480)
  for (const raw of [null, "", "CARD", "96", "480", "huge"]) assert.equal(attachmentThumbnailSizeFor(raw), 96, String(raw))
  assert.equal(buildThumbnailETag("att-1", 480), '"att-1-480"')
  assert.equal(buildThumbnailETag("att-1"), '"att-1-96"', "the list thumbnail keeps its tag, so browsers keep their cached copies")
  assert.equal(thumbnailUrl("att-1", "card"), "/api/attachments/att-1/thumbnail?size=card")
  assert.equal(thumbnailUrl("a b", "card"), "/api/attachments/a%20b/thumbnail?size=card")
  assert.equal(thumbnailUrl("att-1"), "/api/attachments/att-1/thumbnail")
})
```

`tests/attachment-thumbnail-route.test.ts`: the mock line and `get` as listed under Files, then after :146:

```ts
test("?size=card gives a WebP that fits 480px, under its own tag (spec §7.5)", async () => {
  const response = await get({}, "?size=card")

  assert.equal(response.status, 200)
  assert.equal(response.headers.get("content-type"), "image/webp")
  assert.equal(response.headers.get("cache-control"), "private, max-age=604800, immutable")
  assert.equal(response.headers.get("etag"), '"att-1-480"')
  const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata()
  assert.equal(metadata.format, "webp")
  assert.equal(metadata.width, 480)
  assert.equal(metadata.height, 360)
})

test("each size answers only its own tag, and an unknown size is the 96px thumbnail", async () => {
  state.attachment = attachment({ filePath: join(dir, "gone.png") })
  assert.equal((await get({ "If-None-Match": '"att-1-480"' }, "?size=card")).status, 304)
  assert.equal((await get({ "If-None-Match": '"att-1-96"' }, "?size=card")).status, 404, "the 96px tag does not stand for the card, so the file is read, and it is gone")
  assert.equal((await get({ "If-None-Match": '"att-1-96"' }, "?size=huge")).status, 304)
})
```

`tests/attachment-original-route.test.ts` (its five route tests were run while planning against a copy of the planned route, all passing, and against today's route, where the missing-file and outside cases answer 500):

```ts
import assert from "node:assert/strict"
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import * as nodeModule from "node:module"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

type OriginalAttachment = {
  id: string
  module: string
  assetId: string | null
  referenceId: string
  filePath: string
  fileType: string
  fileSize: number
  originalName: string
}

const state: { allowed: boolean; attachment: OriginalAttachment | null } = { allowed: true, attachment: null }
Object.assign(globalThis, { __originalRouteState: state })

// The route's own modules are mocked as tests/attachment-thumbnail-route.test.ts does; a path under /outside/ stands
// for a file in another server's upload folder (the dev database is a copy of Production).
const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() { return { id: "user-1", roles: [], permissions: [], employeeId: "emp-1" } }
    export function hasPermission() { return globalThis.__originalRouteState.allowed }
  `],
  ["@/lib/uploads", `
    export function assertSafeUploadPath(filePath) {
      if (filePath.startsWith("/outside/")) throw Object.assign(new Error("outside"), { outside: true })
      return filePath
    }
    export function isOutsideUploadRootError(error) { return Boolean(error && error.outside) }
    export function isMissingFileError(error) { return Boolean(error && error.code === "ENOENT") }
  `],
  ["@/lib/db", `
    const state = () => globalThis.__originalRouteState
    export const prisma = {
      attachment: { findFirst: async () => state().attachment },
      asset: { findFirst: async () => null },
    }
  `],
])

const registerHooks = (nodeModule as unknown as {
  registerHooks(options: {
    resolve(specifier: string, context: unknown, nextResolve: (specifier: string, context: unknown) => unknown): unknown
  }): void
}).registerHooks

registerHooks({
  resolve(specifier, context, nextResolve) {
    const source = mockedModuleSources.get(specifier)
    if (source !== undefined) {
      return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`, shortCircuit: true }
    }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})

type OriginalRoute = { GET(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> }
const route = await import(pathToFileURL("src/app/api/attachments/[id]/route.ts").href) as OriginalRoute

const dir = mkdtempSync(join(tmpdir(), "asset-original-"))
const pngPath = join(dir, "photo.png")
writeFileSync(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))

function attachment(overrides: Partial<OriginalAttachment> = {}): OriginalAttachment {
  return { id: "att-1", module: "asset", assetId: "asset-1", referenceId: "asset-1", filePath: pngPath, fileType: "image/png", fileSize: 8, originalName: "รูป 1.png", ...overrides }
}

// The route reads ?inline=1 from nextUrl, which a plain Request does not have.
function get(query = "") {
  const url = `http://localhost/api/attachments/att-1${query}`
  return route.GET(Object.assign(new Request(url), { nextUrl: new URL(url) }), { params: Promise.resolve({ id: "att-1" }) })
}

beforeEach(() => {
  state.allowed = true
  state.attachment = attachment()
})

test("an unknown attachment is not found", async () => {
  state.attachment = null
  const response = await get()
  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), { error: "Attachment not found" })
})

test("a file missing on disk is not found, not a 500 (spec §7.5)", async () => {
  state.attachment = attachment({ filePath: join(dir, "gone.png") })
  const response = await get("?inline=1")
  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), { error: "Attachment file not found" })
})

test("a file outside this server's upload folder is not found, as the thumbnail route answers (FX8)", async () => {
  state.attachment = attachment({ filePath: "/outside/uploads/photo.png" })
  const response = await get("?inline=1")
  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), { error: "Attachment file not found" })
})

test("a person without the module's permission is refused before the file is read", async () => {
  state.allowed = false
  state.attachment = attachment({ filePath: join(dir, "gone.png") })
  assert.equal((await get()).status, 403)
})

test("a file that is there is served inline on request and as a download otherwise, never cached or sniffed", async () => {
  const inline = await get("?inline=1")
  assert.equal(inline.status, 200)
  assert.equal(inline.headers.get("content-type"), "image/png")
  assert.equal(inline.headers.get("content-disposition"), `inline; filename*=UTF-8''${encodeURIComponent("รูป 1.png")}`)
  assert.equal(inline.headers.get("x-content-type-options"), "nosniff")
  assert.equal(inline.headers.get("cache-control"), "private, no-store")
  assert.equal(Buffer.from(await inline.arrayBuffer()).length, 8)
  assert.match((await get()).headers.get("content-disposition") ?? "", /^attachment; /)
})

test("both file routes read a missing or foreign file with one shared check (spec §7.5, FX8)", async () => {
  const { isMissingFileError } = await import("../src/lib/uploads.ts")
  assert.equal(isMissingFileError(Object.assign(new Error("gone"), { code: "ENOENT" })), true)
  assert.equal(isMissingFileError(new Error("ENOENT")), false)
  assert.equal(isMissingFileError(null), false)
  for (const path of ["src/app/api/attachments/[id]/route.ts", "src/app/api/attachments/[id]/thumbnail/route.ts"]) {
    const source = readFileSync(path, "utf8").replace(/\r\n/g, "\n")
    assert.match(source, /import \{ assertSafeUploadPath, isMissingFileError, isOutsideUploadRootError \} from "@\/lib\/uploads"/, path)
    assert.match(source, /if \(isMissingFileError\(error\) \|\| isOutsideUploadRootError\(error\)\) \{\n\s*return NextResponse\.json\(\{ error: "Attachment file not found" \}, \{ status: 404 \}\)/, path)
    assert.doesNotMatch(source, /function isMissingFileError/, path)
  }
})
```

`tests/asset-photo-frame.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 1 asset detail task 4 (spec 2026-10-25 §7.5, addition 5): the photo card loads a card-size WebP from the
// thumbnail route, never the original, shows a placeholder when the image fails, and offers the upload to an editor.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const FRAME = "src/components/assets/asset-photo-frame.tsx"
const words = (locale: "th" | "en") => JSON.parse(read(`messages/${locale}.json`)).asset.photoFrame as Record<string, string>

test("the photo card loads the card-size thumbnail, and only a person's click opens the original (spec §7.5)", () => {
  const source = read(FRAME)
  assert.match(source, /^"use client"\n/)
  assert.match(source, /export function AssetPhotoFrame\(\{ attachmentId, alt, label, canUpload, uploadHref, previewable = true, className \}: \{ attachmentId: string \| null; alt: string; label\?: string; canUpload: boolean; uploadHref\?: string; previewable\?: boolean; className\?: string \}\)/)
  assert.equal(source.match(/<img\b/g)?.length, 1, "one image, in both the previewable and the plain frame")
  assert.match(source, /src=\{thumbnailUrl\(attachmentId, "card"\)\}/)
  assert.match(source, /onError=\{\(\) => setFailed\(true\)\}/)
  assert.equal(source.match(/\bbg-image-stage\b/g)?.length, 1, "the stage is on the image element only (dark mode P-R1)")
  assert.equal(source.match(/<AttachmentPreviewDialog\b/g)?.length, 1)
  assert.equal(source.match(/\?inline=1/g)?.length, 1, "the original is the preview dialog's source, read only once it opens")
  assert.match(source, /src=\{`\/api\/attachments\/\$\{attachmentId\}\?inline=1`\}/)
  assert.match(source, /downloadHref=\{`\/api\/attachments\/\$\{attachmentId\}`\}/)
  assert.equal(source.match(/<button\b/g)?.length, 1, "the image is the control (its N3 row)")
  assert.doesNotMatch(source, /next\/image|unoptimized/)
})

test("inside another control the frame is a plain picture: no button, no dialog (R26, Task 11's tiles)", () => {
  const source = read(FRAME)
  assert.match(source, /\{previewable \? \(\s*<button type="button"/)
  assert.match(source, /\{previewable \? \(\s*<AttachmentPreviewDialog\b/)
  // The frame fills its parent's box; the caller sizes it.
  assert.equal(source.match(/className=\{cn\("flex h-full w-full min-w-0 flex-col gap-2", className\)\}/g)?.length, 1)
  assert.doesNotMatch(source, /(?<![-\w])h-(?:\d+|\[[^\]]+\])/, "no height of its own (min-h-0 and max-h-full are not one)")
})

test("an empty card and a photo that fails say so, and offer the upload link to an editor only (spec §7.5, addition 5, R26)", () => {
  const source = read(FRAME)
  assert.equal(source.match(/<ActionEmptyState\b/g)?.length, 2)
  assert.match(source, /title=\{t\("photoFrame\.emptyTitle"\)\}/)
  assert.match(source, /description=\{t\("photoFrame\.emptyHelp"\)\}/)
  assert.match(source, /title=\{t\("photoFrame\.loadFailed"\)\}/)
  assert.equal(source.match(/tone="error"/g)?.length, 1)
  // A link to the files tab: "อัปโหลดรูป" from md, "ถ่ายรูป" below it (the camera input is the files tab's).
  assert.match(source, /const upload = canUpload && uploadHref \? \(\s*<Link href=\{uploadHref\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.match(source, /<span className="max-md:hidden">\{t\("photoFrame\.upload"\)\}<\/span>/)
  assert.match(source, /<span className="md:hidden">\{t\("photoFrame\.takePhoto"\)\}<\/span>/)
  assert.equal(source.match(/action=\{upload\}/g)?.length, 2)
  assert.doesNotMatch(source, /<input\b|capture=/, "no camera input in the card")
})

test("the photo card's words, th and en together", () => {
  assert.deepEqual(words("th"), {
    emptyTitle: "ยังไม่มีรูป",
    emptyHelp: "รูปช่วยให้หาเจอตอนเดินตรวจนับ",
    loadFailed: "โหลดรูปไม่ได้",
    upload: "อัปโหลดรูป",
    takePhoto: "ถ่ายรูป",
    open: "เปิดรูป {name} ขนาดเต็ม",
  })
  assert.deepEqual(words("en"), {
    emptyTitle: "No photo yet",
    emptyHelp: "A photo helps people find it during an audit count",
    loadFailed: "The photo could not be loaded",
    upload: "Upload a photo",
    takePhoto: "Take a photo",
    open: "Open the full-size photo of {name}",
  })
})
```

The guard pins as listed under Files: `tests/dark-mode-p.test.ts` (20 and 16), the N3 row, FX8's allow-list regex. And `tests/e2e-transactions.test.ts:62-80` becomes:

```ts
  // The thumbnails (the shared allow-list, ruling TX-R9): the register's 96px ones and the asset page's photo card
  // (?size=card, group 1 asset detail task 4). A 404 (a file outside this server's upload folder, FX8) or a cancelled
  // image of /api/attachments/<id>/thumbnail passes; another size, or the same answer of the attachment itself, does not.
  const core = await import("../e2e/support/measure-core.ts")
  const { ALLOW_LIST } = await import("../e2e/support/allow-list.ts")
  const register = "http://localhost:3100/th/assets"
  const detail = "http://localhost:3100/th/assets/23f49e63-83eb-44fb-ba55-4f77bef5b552"
  const attachment = "http://localhost:3100/api/attachments/23f49e63-83eb-44fb-ba55-4f77bef5b552"
  const classified = core.classify(
    {
      console: [],
      responses: [
        { method: "GET", url: `${attachment}/thumbnail`, status: 404, resourceType: "image", pageUrl: register },
        { method: "GET", url: `${attachment}/thumbnail?size=card`, status: 404, resourceType: "image", pageUrl: detail },
        { method: "GET", url: `${attachment}/thumbnail?size=huge`, status: 404, resourceType: "image", pageUrl: detail },
        { method: "GET", url: attachment, status: 404, resourceType: "image", pageUrl: register },
      ],
      failures: [
        { method: "GET", url: `${attachment}/thumbnail`, errorText: "net::ERR_ABORTED", resourceType: "image", pageUrl: register },
        { method: "GET", url: `${attachment}/thumbnail?size=card`, errorText: "net::ERR_ABORTED", resourceType: "image", pageUrl: detail },
      ],
    },
    ALLOW_LIST,
    [],
  )
  assert.deepEqual(classified.allowed.map((item) => item.id), ["foreign-attachment-thumbnail", "foreign-attachment-thumbnail", "thumbnail-cancelled-on-leave", "thumbnail-cancelled-on-leave"])
  assert.deepEqual(classified.unexpectedResponses.map((response) => response.url), [`${attachment}/thumbnail?size=huge`, attachment])
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/attachment-thumbnail.test.ts tests/attachment-thumbnail-route.test.ts tests/attachment-original-route.test.ts tests/asset-photo-frame.test.ts tests/dark-mode-p.test.ts tests/visual-foundation-guards.test.ts tests/e2e-fixes.test.ts tests/e2e-transactions.test.ts`
Expected: FAIL.
- `attachmentCardThumbnailSize` and `attachmentThumbnailSizeFor` are not exported; the card request answers a 96×72 image under `"att-1-96"`.
- The original route answers 500 for the missing file and for the outside path, and `uploads.ts` has no `isMissingFileError`.
- `ENOENT` on `asset-photo-frame.tsx`; `asset.photoFrame` is undefined.
- dark-mode-p counts 19 and 15; N3 finds no `asset-photo-frame.tsx`, so its row is "fewer than its EXEMPT count 1".
- FX8's regex and TX1's card cases fail on today's allow-list.

- [ ] **Step 3: Add the photo card's words**

Write this change file outside the repo, in the session scratchpad, then run `node scripts/messages-edit.mjs <file>`. The run sets 6 keys in th and 6 in en. The Thai is the spec's (§7.5) and the board's; "ถ่ายรูป" is the phone's label of the same upload link (R26) and the word the app's drop zones already use ("ถ่ายรูปหรือลากรูปทรัพย์สินมาวางที่นี่"); it passes the glossary test.

| Key `asset.photoFrame.*` | th | en |
|---|---|---|
| `emptyTitle` | ยังไม่มีรูป | No photo yet |
| `emptyHelp` | รูปช่วยให้หาเจอตอนเดินตรวจนับ | A photo helps people find it during an audit count |
| `loadFailed` | โหลดรูปไม่ได้ | The photo could not be loaded |
| `upload` | อัปโหลดรูป | Upload a photo |
| `takePhoto` | ถ่ายรูป | Take a photo |
| `open` | เปิดรูป {name} ขนาดเต็ม | Open the full-size photo of {name} |

- [ ] **Step 4: The card size and the 404**

- **`src/lib/attachment-thumbnail.ts`:**
  - After `attachmentThumbnailSize` (:1): `export const attachmentCardThumbnailSize = 480`, and `attachmentThumbnailSizeFor(raw)`: exactly `"card"` gives 480, anything else 96.
  - `buildThumbnailETag(attachmentId: string, size: number = attachmentThumbnailSize)` returns `` `"${attachmentId}-${size}"` ``; its comment says the tag depends on the id and the size.
  - `thumbnailUrl(attachmentId: string, size?: "card")` appends `?size=card` only for the card.
- **`src/lib/uploads.ts`**, after `isOutsideUploadRootError` (:53-55): `export function isMissingFileError(error: unknown): boolean`, the thumbnail route's own check (:76-78) moved here: `typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"`. The comment above `OutsideUploadRootError` (:43-45) is no longer true of the download route, and becomes:

  ```ts
  // A stored path outside this server's upload folder (a row another server wrote, or a Production path in a copy of its
  // database) is refused, as a path traversal is, with an error of its own: both file routes, the thumbnail (the E2E
  // suite's M7) and the original (group 1 asset detail task 4), answer "not found" for it rather than 500, through
  // isOutsideUploadRootError and isMissingFileError.
  ```
- **The thumbnail route:**
  - :7 becomes `import { assertSafeUploadPath, isMissingFileError, isOutsideUploadRootError } from "@/lib/uploads"`; the local function (:76-78) goes.
  - The thumbnail import (:9-16) replaces `attachmentThumbnailSize` with `attachmentThumbnailSizeFor` (the route no longer reads the constant, and an unused import fails "eslint reports nothing").
  - `const size = attachmentThumbnailSizeFor(new URL(request.url).searchParams.get("size"))` before the tag. It reads `request.url`, not `request.nextUrl`, so the route test's plain `Request` reaches it.
  - :42 `buildThumbnailETag(attachment.id, size)`; :61 `.resize(size, size, { fit: "inside", withoutEnlargement: true })`. Quality, headers and the 304, 404, 415 and 422 answers are unchanged.
- **The original route (`GET` only):** :7 becomes the same three-name import. :29-30 (`const safePath = …; const file = await readFile(safePath)`) become the thumbnail route's block (its :47-55):

  ```ts
      let file: Buffer
      try {
        file = await readFile(assertSafeUploadPath(attachment.filePath))
      } catch (error) {
        if (isMissingFileError(error) || isOutsideUploadRootError(error)) {
          return NextResponse.json({ error: "Attachment file not found" }, { status: 404 })
        }
        throw error
      }
  ```

  The headers, the permission check before the read and `DELETE` stay as they are.

- [ ] **Step 5: The photo frame** `src/components/assets/asset-photo-frame.tsx`

- `"use client"`. Imports: `useState`; `Link` from `next/link` (as `ActionEmptyState` links); `ImageIcon`, `ImageOff` from `lucide-react`; `useTranslations`; `ActionEmptyState`; `AttachmentPreviewDialog`; `buttonVariants` from `@/components/ui/button-variants`; `thumbnailUrl` from `@/lib/attachment-thumbnail`; `cn` from `@/lib/utils`.
- Props as in **Interfaces**, `previewable` defaulting to `true`.
- `const t = useTranslations("asset")`, `const [failed, setFailed] = useState(false)`, `const [open, setOpen] = useState(false)`.
- `upload` is the link the test pins, only when `canUpload && uploadHref` (else `null`): `<Link href={uploadHref} className={buttonVariants({ variant: "outline", size: "md" })}>` holding `<span className="max-md:hidden">{t("photoFrame.upload")}</span>` and `<span className="md:hidden">{t("photoFrame.takePhoto")}</span>` (R26). It is the outline variant, so the page header's primary stays the page's one primary. N3's own rule: a command on a link is `buttonVariants` on a link. The camera input is the files tab's (Task 11), never this card's.
- Every state sits in one root, `<div className={cn("flex h-full w-full min-w-0 flex-col gap-2", className)}>`, so the caller's size holds for each. The frame sets no height of its own.
- No `attachmentId`: `<ActionEmptyState icon={<ImageIcon />} title={t("photoFrame.emptyTitle")} description={t("photoFrame.emptyHelp")} action={upload} />` (DESIGN "Which one": a title, a description or a button).
- `failed`: `<ActionEmptyState tone="error" icon={<ImageOff />} title={t("photoFrame.loadFailed")} action={upload} />`. The placeholder holds no image, so it never carries the stage.
- Otherwise:
  - `const image = <img src={thumbnailUrl(attachmentId, "card")} alt="" width={480} height={360} decoding="async" onError={() => setFailed(true)} className="max-h-full w-full object-contain bg-image-stage" />`, the file's one `<img>`, with the `eslint-disable-next-line @next/next/no-img-element` comment `asset-thumbnail.tsx` uses ("already resized by the thumbnail route"). No `loading="lazy"`: on the phone the card is the first thing on the overview.
  - The image box takes the root's space above the caption: `flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-md border border-border bg-muted`.
  - `{previewable ? (<button type="button" onClick={() => setOpen(true)} aria-label={t("photoFrame.open", { name: alt })} className={cn(<the box>, "transition-colors hover:border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}>{image}</button>) : (<div className={<the box>}>{image}</div>)}`. The button is the N3 row; `alt=""` because the button names the image, as the register's thumbnail does. Without `previewable` the frame sits inside the caller's own control (Task 11's tile), which names it.
  - Under it, `label` when given, as `text-meta text-muted-foreground`.
  - `{previewable ? (<AttachmentPreviewDialog open={open} onOpenChange={setOpen} title={alt} subtitle={label} kind="image" src={`/api/attachments/${attachmentId}?inline=1`} alt={alt} downloadHref={`/api/attachments/${attachmentId}`} downloadLabel={t("download")} />) : null}`. Radix renders the dialog's image only while it is open, so the original loads only when the person asks.
- `bg-image-stage` appears once in the file (no comment names it: `tests/dark-mode-p.test.ts` counts every occurrence in src).

- [ ] **Step 6: The allow-list and DESIGN.md**

- **`e2e/support/allow-list.ts`:** both thumbnail entries (:20-28 `foreign-attachment-thumbnail`, :29-37 `thumbnail-cancelled-on-leave`) take `url: /\/api\/attachments\/[0-9a-f-]{36}\/thumbnail(?:\?size=card)?$/,` (checked while planning: the 96px and card URLs match; `?size=huge`, the original and `?inline=1` do not). Each `reason` gains a sentence, and `reviewed` becomes the commit's date:
  - `foreign-attachment-thumbnail`: " The asset page's photo card loads the same route with ?size=card (group 1 asset detail task 4), the only query the entry accepts, so a foreign photo there is the same 404."
  - `thumbnail-cancelled-on-leave`: " The asset page's photo card (?size=card) is the same kind of image."
- **`DESIGN.md:638`** becomes: "- **Thumbnails:** list images come from `/api/attachments/{id}/thumbnail` (96px WebP, cached); never load original files in a list. A photo card on a detail page takes `?size=card` (a WebP of at most 480px, cached under its own tag) through `AssetPhotoFrame`, which fills the box its caller sizes, shows "โหลดรูปไม่ได้" with the upload link for an editor when the image fails ("อัปโหลดรูป" from `md`, "ถ่ายรูป" below it, to where the photos are added), and opens the original only when the person asks (the preview dialog; `previewable={false}` inside a control of its own). Callers pass only an image the thumbnail route renders (`isThumbnailable`); HEIC and SVG are documents. The original file's route answers 404, as the thumbnail route does, for a file that is gone or outside this server's upload folder."

- [ ] **Step 7: Run the tests to verify they pass**

Run: `node --test tests/attachment-thumbnail.test.ts tests/attachment-thumbnail-route.test.ts tests/attachment-original-route.test.ts tests/asset-photo-frame.test.ts tests/dark-mode-p.test.ts tests/visual-foundation-guards.test.ts tests/e2e-fixes.test.ts tests/e2e-transactions.test.ts tests/e2e-suite.test.ts tests/e2e-audit.test.ts tests/e2e-cross-cutting.test.ts tests/asset-register-building-blocks-ui.test.ts tests/my-assets-attachment-permission.test.ts tests/security-headers.test.ts tests/repair-record-routes.test.ts tests/rbac-route-matrix.test.ts tests/api-error-catalog.test.ts tests/asset-photo-gallery.test.ts tests/list-frame-guards.test.ts tests/ui-overlay-guards.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts && npx tsc --noEmit && npx eslint src/lib/attachment-thumbnail.ts src/lib/uploads.ts "src/app/api/attachments/[id]/route.ts" "src/app/api/attachments/[id]/thumbnail/route.ts" src/components/assets/asset-photo-frame.tsx e2e/support/allow-list.ts`
Expected: PASS, every test.
- dark-mode-p reads 20 images and 16 stages; N3 finds `asset-photo-frame.tsx` at 1.
- The allow-list still has five entries.
- tsc is clean; eslint reports nothing.

- [ ] **Step 8: Commit**

```bash
git add src/lib/attachment-thumbnail.ts src/lib/uploads.ts "src/app/api/attachments/[id]/route.ts" "src/app/api/attachments/[id]/thumbnail/route.ts" src/components/assets/asset-photo-frame.tsx e2e/support/allow-list.ts DESIGN.md messages/th.json messages/en.json tests/attachment-thumbnail.test.ts tests/attachment-thumbnail-route.test.ts tests/attachment-original-route.test.ts tests/asset-photo-frame.test.ts tests/dark-mode-p.test.ts tests/visual-foundation-guards.test.ts tests/e2e-fixes.test.ts tests/e2e-transactions.test.ts
git commit -m "feat(attachments): a card-size photo from the thumbnail route, a 404 for a missing original, and a photo frame that fails gracefully (group 1 asset detail task 4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: FactStrip, the fact strip (a shared part)

**Files:**
- Create: `src/components/ui/fact-strip.tsx`
- Create: `tests/fact-strip.test.ts`
- Modify: `tests/list-frame-guards.test.ts:67` (`UI_NAME` gains `FactStrip`) and `:132` (the LN2 owners gain `fact-strip`)
- Modify: `DESIGN.md` (lines on master f6368e19): `:478` (Corner Style), a new bullet after `:484` (`KeyValueList`), `:486` (Detail pages)
- Modify: `docs/14_UI_UX_DESIGN_SYSTEM.md`: a new row after `:85` (the `KeyValueList` row)
- Modify: `.impeccable/design.json`: a new component object after `:496` (the end of the Key Value List object)
- Re-run unchanged: `tests/visual-foundation-guards.test.ts`, `tests/ui-overlay-guards.test.ts`, `tests/phase2d-docs.test.ts` (the design.json font stack and the 40px rule), `tests/dark-mode-docs.test.ts` (no "light only", no "white frame" prose), `tests/stat-strip-note-meter.test.ts` (its DESIGN slice runs from the `StatStrip` bullet to Detail pages; the new bullet sits before `StatStrip`, outside it), `tests/data-bars.test.ts` (the Corner Style sentence on `rounded-xs` stays).
- Guard rows: none moves. The part holds no `<button>`, no raw colour, no shadow, no `/NN` tint, no status ink and no `aria-current`; `FactStrip` matches neither `LOCAL_STAT_TILE` (LS1) nor `LOCAL_KEY_VALUE` (LK1). LN2 gains the name and its owner in this task, so a later local `function FactStrip` fails the guard.

**Interfaces:**
- Produces (for Task 8):
  - `export type FactStripItem = { key: string; label: string; value: React.ReactNode; sub?: React.ReactNode }`
  - `FactStrip({ label, items, className }: { label: string; items: readonly FactStripItem[]; className?: string })` in `src/components/ui/fact-strip.tsx`, server-safe. `label` names the strip: a `section aria-label={label}` around the `dl` (Task 8 passes `t("factStripLabel")`, `asset.factStripLabel` "ข้อมูลสำคัญของทรัพย์สิน" / "Key facts", R19). The `dl` carries `data-slot="fact-strip"` and each cell, a `div` around its `dt` and `dd`s, `data-slot="fact"` (R18). At most four items are drawn. `value` and `sub` are any server-safe node: text, a `Link` with `linkVariants({ size: "inherit" })`, a `StatusBadge`, a `tag` code. There is no tone prop: a state (the latest count's result, in the round page's words "พบตรง", "รายการไม่ตรง", "ไม่พบ") is a `StatusBadge` value (R19). An empty `value` shows `Nil`. `className` goes on the `section` (Task 8 passes `className="max-md:hidden"` on every tab but the overview, spec §7.4, R19).
- Consumes: `orNil` (`src/components/ui/nil.tsx`).

- [ ] **Step 1: Write the failing tests**

`tests/list-frame-guards.test.ts`:
- :67, `UI_NAME`: add `FactStrip` after `StatStrip`: `/\bfunction (?:StatusBadge|MetricCard|ColumnHeader|PageHeader|Pagination|DataTable|TabNav|StatStrip|FactStrip|KeyValueList|RowActions|TableEmptyRow|EmptyNote|Nil)\b/g`.
- :131, the comment above the LN2 owners: "StatStrip, StatusBadge, TabNav." becomes "StatStrip, FactStrip, StatusBadge, TabNav."
- :132, the LN2 owners: add `"fact-strip"` after `"empty-note"`: `["data-table", "empty-note", "fact-strip", "key-value-list", "nil", "page-header", "pagination", "row-actions", "stat-strip", "status-badge", "tab-nav"]`.
- Until the part exists, `L0` fails ("OWNERS.LN2: src/components/ui/fact-strip.tsx is no such file").

`tests/fact-strip.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 1 asset detail task 5 (spec 2026-10-25 §7.4, §5 "Shared parts first"): FactStrip, up to four facts of one
// record side by side under its tabs. Server-safe; one dl in the StatStrip frame inside a section the label names; a
// cell is a faint label, the value in ink at 500 and an optional faint sub-line, lined up across the cells (subgrid).
// Values are words, never Metric numbers; a state is a StatusBadge the caller passes, never colored text (The Where
// Color Lives Rule). Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const STRIP = "src/components/ui/fact-strip.tsx"

test("FactStrip: up to four facts in one framed dl inside a section named by its label, server-safe (spec §7.4)", () => {
  const source = read(STRIP)
  assert.match(source, /^import type React from "react"$/m)
  assert.match(source, /^import \{ orNil \} from "@\/components\/ui\/nil"$/m)
  assert.match(source, /export type FactStripItem = \{ key: string; label: string; value: React\.ReactNode; sub\?: React\.ReactNode \}/)
  assert.match(source, /export function FactStrip\(\{ label, items, className \}: \{ label: string; items: readonly FactStripItem\[\]; className\?: string \}\)/)
  assert.match(source, /<section aria-label=\{label\} className=\{className\}>\n\s+<dl data-slot="fact-strip" className=\{factStripClasses\}>/)
  assert.equal(
    source.match(/const factStripClasses = "([^"]+)"/)?.[1],
    "grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border max-md:[&>:last-child:nth-child(odd)]:col-span-2 md:auto-cols-fr md:grid-flow-col md:grid-cols-none md:grid-rows-[repeat(3,auto)]",
  )
  assert.equal(source.match(/const factClasses = "([^"]+)"/)?.[1], "row-span-3 grid min-w-0 grid-rows-subgrid content-start gap-y-0.5 bg-surface px-4 py-3")
  assert.match(source, /\{items\.slice\(0, 4\)\.map\(\(item\) => \(\n\s+<div key=\{item\.key\} data-slot="fact" className=\{factClasses\}>/)
  assert.match(source, /<dt className="text-meta text-faint-foreground">\{item\.label\}<\/dt>/)
  assert.match(source, /<dd className="min-w-0 break-words text-sm font-medium text-foreground">\{orNil\(item\.value\)\}<\/dd>/)
  assert.match(source, /\{item\.sub \? <dd className="min-w-0 break-words text-meta text-faint-foreground">\{item\.sub\}<\/dd> : null\}/)
  assert.doesNotMatch(
    source,
    /"use client"|\buse[A-Z]\w*\(|text-metric|text-count|\btext-(?:success|warning|danger|info)\b|\bbg-(?:success|warning|danger|info)|\btone\??:|aria-current|\bshadow-|\b(?:bg|text|border)-[\w-]+\/\d+|\bdark:|<h[1-6]\b|aria-labelledby/,
    "server-safe; words, not Metric; no tone prop, status ink or fill (a state is the caller's StatusBadge); no tint, shadow or heading of its own",
  )
})

test("DESIGN.md, docs/14 and design.json describe FactStrip (group 1 asset detail task 5)", () => {
  const design = read("DESIGN.md")
  const kv = design.indexOf("\n- **`KeyValueList`**")
  const facts = design.indexOf("\n- **`FactStrip`** (`src/components/ui/fact-strip.tsx`, server-safe;")
  const stats = design.indexOf("\n- **`StatStrip`**")
  assert.ok(kv !== -1 && facts > kv && stats > facts, "§5 Cards / Containers: FactStrip between KeyValueList and StatStrip")
  const bullet = design.slice(facts, stats)
  for (const phrase of [
    "up to four facts of one record side by side, under a detail page's tabs",
    "two columns below `md`, one row from `md`",
    "The value is words, never a number tile",
    "`linkVariants({ size: \"inherit\" })`",
    "A value that is a state is a `StatusBadge`",
    "never colored text (The Where Color Lives Rule); the part has no tone of its own",
    "a `section` named by its `label` around the `dl`",
    "Guards LS1, LK1 and LN2",
  ]) assert.ok(bullet.includes(phrase), phrase)
  assert.ok(design.includes("`DataTable` frames, `StatStrip`, `FactStrip`, metric cards"), "Corner Style")
  const detail = design.slice(design.indexOf("\n- **Detail pages**"), design.indexOf("\n### Inputs / Fields"))
  assert.ok(detail.includes("A record's few headline facts sit in one `FactStrip` under its tabs"), "Detail pages")
  const index = read("docs/14_UI_UX_DESIGN_SYSTEM.md")
  const kvRow = index.indexOf("\n| Label and value pairs | `KeyValueList` |")
  const factRow = index.indexOf("\n| Up to four facts of a record side by side, under its tabs | `FactStrip` |")
  assert.ok(kvRow !== -1 && factRow > kvRow && factRow < index.indexOf("\n| A panel with a head row |"), "docs/14: the FactStrip row follows KeyValueList")
  assert.ok(index.slice(factRow, index.indexOf("\n", factRow + 1)).includes("a state is a `StatusBadge`, never colored text"))
  type Component = { name: string; kind: string; refersTo: string; description: string; html: string; css: string }
  const json = JSON.parse(read(".impeccable/design.json")) as { components: Component[] }
  const names = json.components.map((entry) => entry.name)
  assert.equal(names.indexOf("Fact Strip"), names.indexOf("Key Value List") + 1)
  const fact = json.components.find((entry) => entry.name === "Fact Strip")
  assert.equal(fact?.kind, "card")
  assert.equal(fact?.refersTo, "fact-strip")
  assert.match(fact?.description ?? "", /^FactStrip: up to four facts of one record side by side under a detail page's tabs/)
  assert.match(fact?.description ?? "", /a state is a status badge, never colored text/)
  assert.match(fact?.html ?? "", /^<section class="ds-facts" aria-label="[^"]+"><dl>/)
  assert.match(fact?.css ?? "", /"IBM Plex Sans", "Noto Sans Thai Looped", system-ui, sans-serif/)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/fact-strip.test.ts tests/list-frame-guards.test.ts`
Expected: FAIL. `tests/fact-strip.test.ts` cannot read `src/components/ui/fact-strip.tsx` (ENOENT) and DESIGN.md has no `FactStrip` bullet; `L0` names the missing owner file.

- [ ] **Step 3: Implement the part and its docs**

- **`src/components/ui/fact-strip.tsx`** (no directive, no hook):
  - Imports: `import type React from "react"` and `orNil` from `@/components/ui/nil` (the pinned markup merges no classes, so no `cn`).
  - `factStripClasses` and `factClasses` exactly as the test pins them, each under one comment: the strip is the `StatStrip` frame (12px corners, 1px `border` lines through `gap-px` on `bg-border`, no fill), two columns below `md` where a last cell left alone fills its row, one row of equal cells from `md`; every cell spans the three rows (label, value, sub-line) as a subgrid, so the rows line up across the cells, and a cell without a sub-line keeps an empty third row.
  - The markup is what the test pins (R18, the `StatStrip` slots: `stat-strip` on its `dl`, `stat` on its cells): `<section aria-label={label} className={className}>`, then `<dl data-slot="fact-strip" className={factStripClasses}>`, then `items.slice(0, 4).map(...)` of `<div key={item.key} data-slot="fact" className={factClasses}>` with the `dt`, the value `dd` (`orNil(item.value)`) and the optional sub `dd`.
  - A comment above the function: what it is for (up to four facts of one record under its tabs, spec §7.4), that a `dl` takes no name of its own so the `section` carries `label`, that a fifth item is not drawn, that the caller passes links (`linkVariants({ size: "inherit" })`) and states (`StatusBadge`), never colored text, and that numbers belong in `StatStrip`.
- **`DESIGN.md`:**
  - :478 (Corner Style): "`DataTable` frames, `StatStrip`, metric cards" becomes "`DataTable` frames, `StatStrip`, `FactStrip`, metric cards".
  - After :484 (the `KeyValueList` bullet), a new bullet:

    > - **`FactStrip`** (`src/components/ui/fact-strip.tsx`, server-safe; group 1 asset detail, spec `docs/superpowers/specs/2026-10-25-page-group-1-dashboard-detail-login-design.md` §7.4): up to four facts of one record side by side, under a detail page's tabs (the asset page: who holds it or what it belongs to, where it is, its latest count, its warranty). One 12px frame with 1px lines between the cells and no fill, as `StatStrip`: two columns below `md`, one row from `md`, and below `md` a last cell left alone fills its row. A cell is a 13px faint label, the value in 14px ink at weight 500 and an optional 13px faint sub-line, and the three rows line up across the cells (subgrid). The value is words, never a number tile: a count goes in `StatStrip` (Metric is for numbers only) and a group of facts in `KeyValueList`. The value may be a text link to the record it names, and the sub-line may hold one to the next place to look, both `linkVariants({ size: "inherit" })`. A value that is a state is a `StatusBadge` (the latest count's result, in the audit round page's words and tone), never colored text (The Where Color Lives Rule); the part has no tone of its own. An empty value shows `Nil`. The strip is a `section` named by its `label` around the `dl` (a `dl` takes no name of its own), and a fifth item is not drawn. Guards LS1, LK1 and LN2: no local tile or label-and-value helper stands in for it, and no local function takes its name.

  - :486 (Detail pages): after "the facts are `KeyValueList`s, one per group, inside the panel or section they belong to." insert " A record's few headline facts sit in one `FactStrip` under its tabs (the asset page, group 1)."
- **`docs/14_UI_UX_DESIGN_SYSTEM.md`**, after :85:

  ```
  | Up to four facts of a record side by side, under its tabs | `FactStrip` | `label` names the strip (a `section` around the `dl`); each item a `label`, a `value` and an optional `sub`, words not numbers (a count is `StatStrip`); a link in either is `linkVariants({ size: "inherit" })`; a state is a `StatusBadge`, never colored text; two columns below `md`, one row from `md`; four items at most |
  ```

- **`.impeccable/design.json`**, after the Key Value List object (:489-496), two-space JSON edited in place:

  ```json
      {
        "name": "Fact Strip",
        "kind": "card",
        "refersTo": "fact-strip",
        "description": "FactStrip: up to four facts of one record side by side under a detail page's tabs, in one 12px frame with 1px lines between the cells and no fill. A cell is a 13px faint label, the value in 14px ink at weight 500 and an optional faint 13px sub-line, lined up across the cells. Values are words, never number tiles; either line may hold a text link, and a state is a status badge, never colored text. Two columns below 768px, one row from 768px. The strip is a section named by its label around a dl.",
        "html": "<section class=\"ds-facts\" aria-label=\"ข้อมูลสำคัญของทรัพย์สิน\"><dl><div class=\"ds-fact\"><dt>ผู้ถือครอง</dt><dd class=\"ds-fact-value\"><a href=\"#\">สมชาย ใจดี</a></dd><dd class=\"ds-fact-sub\">แผนกบัญชี · ถือมาแล้ว 46 วัน</dd></div><div class=\"ds-fact\"><dt>ที่ตั้ง</dt><dd class=\"ds-fact-value\"><a href=\"#\">สำนักงานใหญ่</a></dd><dd class=\"ds-fact-sub\">อาคาร A ชั้น 3</dd></div><div class=\"ds-fact\"><dt>ตรวจนับล่าสุด</dt><dd class=\"ds-fact-value\"><span class=\"ds-fact-badge\">พบตรง</span></dd><dd class=\"ds-fact-sub\">12 ต.ค. 2569 · <a href=\"#\">AUD-2026-0003</a></dd></div><div class=\"ds-fact\"><dt>ประกัน</dt><dd class=\"ds-fact-value\">ไม่ทราบ</dd><dd class=\"ds-fact-sub\"><a href=\"#\">บันทึกข้อมูลการซื้อ</a></dd></div></dl></section>",
        "css": ".ds-facts { font-family: \"IBM Plex Sans\", \"Noto Sans Thai Looped\", system-ui, sans-serif; } .ds-facts dl { margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px; overflow: hidden; border: 1px solid #D7DEE8; border-radius: 12px; background: #D7DEE8; } .ds-facts dl > :last-child:nth-child(odd) { grid-column: span 2; } .ds-fact { min-width: 0; display: grid; align-content: start; gap: 2px; padding: 12px 16px; background: #FFFFFF; } .ds-fact dt { font-size: 13px; line-height: 1.5385; color: #56677F; } .ds-fact dd { margin: 0; min-width: 0; overflow-wrap: break-word; } .ds-fact-value { font-size: 14px; line-height: 1.5714; font-weight: 500; color: #0B1D35; } .ds-fact-sub { font-size: 13px; line-height: 1.5385; color: #56677F; } .ds-fact a { color: #1E4F94; text-decoration: underline transparent; text-underline-offset: 3px; } .ds-fact a:hover, .ds-fact a:focus-visible { text-decoration-color: currentColor; } .ds-fact a:focus-visible { outline: 2px solid #10858D; outline-offset: 2px; } .ds-fact-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; line-height: 1.5385; color: #3C4F6B; } .ds-fact-badge::before { content: \"\"; width: 6px; height: 6px; border-radius: 9999px; background: #1D7A35; } @media (min-width: 768px) { .ds-facts dl { grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); } .ds-facts dl > :last-child:nth-child(odd) { grid-column: auto; } }"
      },
  ```

- No caller until Task 8; the first visual check is the controller's look step after Task 13's E2E (both themes, 1440 and 390).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/fact-strip.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/ui-overlay-guards.test.ts tests/phase2d-docs.test.ts tests/dark-mode-docs.test.ts tests/stat-strip-note-meter.test.ts tests/data-bars.test.ts tests/v-track-final.test.ts && npx tsc --noEmit && npx eslint src/components/ui/fact-strip.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/fact-strip.tsx tests/fact-strip.test.ts tests/list-frame-guards.test.ts DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md .impeccable/design.json
git commit -m "feat(ui): FactStrip, up to four facts of a record under its tabs (group 1 asset detail task 5)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: ActionBar's more slot

**Files:**
- Modify: `src/components/ui/action-bar.tsx`: the imports :1-5, a new type after `ActionBarLink` (:7-13), the comment :23-28, `ActionBar` :29-68 (its props :29-37, `visibleActions` :38, the link row :49, the link class :51, after the map :63)
- Modify: `src/components/ui/row-actions.tsx`: `RowActionsProps` :42-52, the destructure :69-79, the trigger :210-214
- Modify: `tests/mobile-action-bar.test.ts`: `:34-35` (rewritten) and two new tests after :40
- Modify: `tests/row-actions-ui.test.ts`: `:16-19` and `:57-59` (rewritten)
- Modify: `DESIGN.md` (lines on master f6368e19; Task 5 adds one line above both, so they are :625 and :708 after it): :624 (the ⋯ of `RowActions`) and :707 (`ActionBar`: the sentence "The ⋯ layout of the mockup waits for phase 3." goes)
- Modify: `docs/14_UI_UX_DESIGN_SYSTEM.md`: the `RowActions` row (`| A next step and more actions in a table row |`) and the `ActionBar` row (`| A phone action bar on a detail page |`), found by their text (Task 5 adds a row above the `ActionBar` row)
- Modify: `.impeccable/design.json`: the `description` of the `"Row Actions"` entry, found by its name (Task 5 adds the Fact Strip object above it)
- Re-run unchanged: `tests/operations-sweep-ui.test.ts:14-21` (the bar's classes and `buttonVariants({ variant: action.primary ? "default" : "outline", size: "sm" })` stay as substrings), `tests/audit-scan-search-ui.test.ts:193-199`, `tests/disposal-detail-workspace.test.ts:40-48`, `tests/asset-register-table-ui.test.ts:10-30` (`size="icon-sm"` stays), `tests/dropdown-menus-ui.test.ts:27-43`, `tests/dead-code-cleanup.test.ts:33`, `tests/visual-foundation-guards.test.ts` (N3: `row-actions.tsx` is an owner; `action-bar.tsx` gains no `<button>` and no `backdrop-blur|bg-surface/95|shadow-md`).
- Guard rows: none moves. `action-bar.tsx` keeps its one fixed-bottom class string (GL1 row, count 1, `tests/form-migration-guards.test.ts:157`); the sheet's own classes live in `sheet.tsx`. The three other pages that render `ActionBar` (`maintenance/[id]`, `disposal/[id]`, `audit/rounds/[id]`) pass no `more` and keep today's grid.

**Interfaces:**
- Produces (for Task 8):
  - `export type ActionBarMore = { label: string; code: string; name?: string; groups: readonly RowActionGroup[]; openerRef?: React.RefObject<HTMLElement | null> }` in `src/components/ui/action-bar.tsx`. `label` names ⋯ ("การดำเนินการอื่น", the caller's message); `code` and `name` title the sheet as the register's phone sheet does (the asset tag in `tag`, the asset name under it); `groups` are `RowActions` groups (`kind: "link"` and `kind: "unavailable"` with `reason` from a server caller; `kind: "action"` with `onSelect` only from a client caller, which then passes `openerRef` so its dialog returns focus to ⋯).
  - `ActionBar({ label, actions, primaryAction, more }: { label: string; actions: readonly ActionBarLink[]; primaryAction?: React.ReactNode; more?: ActionBarMore })`. ⋯ shows only while a group holds an item; it is then the last control of the row, the row is a flex row (R20), and ⋯ takes one link's place (three links, two under a `primaryAction`); in that row a `primary` link is twice as wide as an outline one. With `actions` empty the bar holds ⋯ alone at the row's end (R21: the viewer's bar, whose sheet holds "พิมพ์ป้าย"). Task 8's bar uses at most two links (R21: the rule's primary, wide, and "บันทึกซ่อม" when pinned; in the scan-return case "สแกนรายการถัดไป", wide, and the rule's primary, outline).
  - `RowActionsProps.triggerVariant?: "ghost" | "outline"` (default `"ghost"`; every existing caller unchanged).
- Consumes: `RowActions`, `type RowActionGroup` (`src/components/ui/row-actions.tsx`).

- [ ] **Step 1: Write the failing tests**

`tests/row-actions-ui.test.ts`:
- :16-19 becomes:

  ```ts
  assert.deepEqual(
    props.split("\n").map((line) => line.trim().split(":")[0]),
    ["code", "name?", "menuLabel", "next?", "groups", "deleteAction?", "openerRef?", "menu?", "triggerVariant?", "className?"],
  )
  assert.match(props, /triggerVariant\?: "ghost" \| "outline"/)
  ```

- :57-59: the test's name becomes "⋯ is an icon-sm button (ghost, or outline in an ActionBar), a menu from md and a bottom sheet below, and leaves its place empty when there is nothing to show", and its first assertion becomes:

  ```ts
  assert.match(source, /<Button ref=\{triggerRef\} variant=\{triggerVariant\} size="icon-sm" aria-label=\{menuLabel\} title=\{menuLabel\}>\s*<MoreHorizontal aria-hidden="true" \/>\s*<\/Button>/)
  assert.match(source, /\n  menu = "auto",\n  triggerVariant = "ghost",\n/, "ghost unless the caller asks")
  ```

`tests/mobile-action-bar.test.ts`:
- :34 becomes `assert.match(source, /const visibleActions = actions\.slice\(0, \(primaryAction \? 3 : 4\) - \(moreSlot \? 1 : 0\)\)/)`.
- :35 becomes `assert.match(source, /const className = cn\(buttonVariants\(\{ variant: action\.primary \? "default" : "outline", size: "sm" \}\), "min-w-0 px-2", moreSlot && \(action\.primary \? "flex-2" : "flex-1"\)\)/)`.
- After :40, two tests:

```ts
// Group 1 asset detail task 6 (spec 2026-10-25 §7.8): ActionBar's more slot, which DESIGN.md left to phase 3. With a
// group that holds an item, the row is one line: the links, a primary one twice as wide as an outline one, then the ⋯ of
// RowActions as an outline button named by more.label, which always opens RowActions' bottom sheet (the record's code
// as its title), where an unavailable item reads its reason. ⋯ takes one link's place, and stands alone when there is no
// link (a viewer's bar). The bar stays server-safe: it renders the client RowActions and holds no hook of its own.
test("ActionBar: an optional more slot, the last button of its row, opens RowActions' bottom sheet (spec §7.8)", () => {
  const source = readFileSync("src/components/ui/action-bar.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /^import \{ RowActions, type RowActionGroup \} from "@\/components\/ui\/row-actions"$/m)
  assert.match(source, /export type ActionBarMore = \{\n  label: string\n  code: string\n  name\?: string\n  groups: readonly RowActionGroup\[\]\n  openerRef\?: React\.RefObject<HTMLElement \| null>\n\}/)
  assert.match(source, /\n  primaryAction\?: React\.ReactNode\n  more\?: ActionBarMore\n\}\) \{/)
  assert.match(source, /const moreSlot = more\?\.groups\.some\(\(group\) => group\.items\.length > 0\) \? more : null/)
  assert.match(source, /<div className=\{moreSlot \? "flex min-w-0 justify-end gap-2" : cn\("grid min-w-0 gap-2", getMobileActionGridClass\(visibleActions\.length\)\)\}>/)
  assert.match(
    source,
    /\{moreSlot \? (?:\(\n\s+)?<RowActions code=\{moreSlot\.code\} name=\{moreSlot\.name\} menuLabel=\{moreSlot\.label\} groups=\{moreSlot\.groups\} openerRef=\{moreSlot\.openerRef\} menu="sheet" triggerVariant="outline" className="shrink-0" \/>(?:\n\s+\))? : null\}/,
  )
  assert.ok(source.indexOf("<RowActions ") > source.indexOf("visibleActions.map("), "⋯ is the last control of the row")
  assert.equal(source.match(/<RowActions /g)?.length, 1)
  assert.doesNotMatch(source, /\breturn null\b/, "no early return: a bar of ⋯ alone (the viewer's) still draws")
})

test("DESIGN.md, docs/14 and design.json describe ActionBar's more slot and the outline ⋯ (group 1 asset detail task 6)", () => {
  const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
  const design = read("DESIGN.md")
  const bar = design.slice(design.indexOf("\n- **`ActionBar`**"), design.indexOf("\n- **Bottom space:**"))
  assert.ok(!bar.includes("waits for phase 3"), "the ⋯ no longer waits for phase 3")
  for (const phrase of [
    "A bar may end in ⋯ through `more`",
    "an `outline` `icon-sm` button (44px) named by `more.label`",
    "always opens the `RowActions` bottom sheet",
    "each unavailable one with its reason",
    "`more.openerRef`",
    "at most three links and ⋯ (two links under a `primaryAction`)",
    "twice the width of an outline one",
    "A bar may hold ⋯ alone",
  ]) assert.ok(bar.includes(phrase), phrase)
  assert.ok(design.includes("⋯ is a `ghost` `icon-sm` button (`triggerVariant=\"outline\"` for the ⋯ of an `ActionBar`, beside the bar's outline links) named"), "RowActions")
  const index = read("docs/14_UI_UX_DESIGN_SYSTEM.md")
  const row = (start: string) => index.slice(index.indexOf(start), index.indexOf("\n", index.indexOf(start) + 1))
  assert.ok(row("\n| A phone action bar on a detail page | `ActionBar`").includes("`more` ends the row with ⋯"))
  assert.ok(row("\n| A next step and more actions in a table row | `RowActions`").includes("`triggerVariant=\"outline\"` only for the ⋯ of an `ActionBar`'s `more`"))
  const json = JSON.parse(read(".impeccable/design.json")) as { components: Array<{ name: string; description: string }> }
  assert.match(json.components.find((entry) => entry.name === "Row Actions")?.description ?? "", /In a phone ActionBar the same ⋯ is an outline icon button that always opens the bottom sheet\.$/)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/mobile-action-bar.test.ts tests/row-actions-ui.test.ts`
Expected: FAIL. `ActionBarMore`, `moreSlot` and `triggerVariant` are not in the sources, `RowActionsProps` lists no `triggerVariant?`, and DESIGN.md still says "The ⋯ layout of the mockup waits for phase 3."

- [ ] **Step 3: Implement the slot**

- **`src/components/ui/row-actions.tsx`:**
  - `RowActionsProps` (:42-52): `triggerVariant?: "ghost" | "outline"` after `menu?: …` (no comment inside the type: the props test splits its lines).
  - The destructure (:69-79): `triggerVariant = "ghost",` after `menu = "auto",`.
  - The trigger (:210-214): `variant="ghost"` becomes `variant={triggerVariant}`; nothing else in the file changes.
  - The file's head comment gains one sentence: the ⋯ is `ghost` in a row and `outline` in an `ActionBar` (its `more` slot), beside the bar's outline links.
- **`src/components/ui/action-bar.tsx`** (still no directive and no hook):
  - Import `{ RowActions, type RowActionGroup }` from `@/components/ui/row-actions` (the line the test pins).
  - After `ActionBarLink`, the exported `ActionBarMore` type exactly as pinned, under a comment: the ⋯ of the bar opens `RowActions`' bottom sheet; `code` and `name` title the sheet as on the register; `kind: "action"` items and `openerRef` come only from a client caller, whose dialog returns focus to ⋯.
  - The props gain `more?: ActionBarMore` after `primaryAction` (the destructure gains `more`).
  - Before `visibleActions`: `const moreSlot = more?.groups.some((group) => group.items.length > 0) ? more : null` (an empty sheet is never offered); `visibleActions` becomes `actions.slice(0, (primaryAction ? 3 : 4) - (moreSlot ? 1 : 0))`.
  - The link row (:49) becomes the pinned `<div className={moreSlot ? "flex min-w-0 justify-end gap-2" : cn("grid min-w-0 gap-2", getMobileActionGridClass(visibleActions.length))}>`; the link class (:51) the pinned `cn(…, "min-w-0 px-2", moreSlot && (action.primary ? "flex-2" : "flex-1"))`. Without `more` both strings are today's, so the three other pages render as before.
  - After the map (:63), inside the row: the pinned `{moreSlot ? <RowActions … menu="sheet" triggerVariant="outline" className="shrink-0" /> : null}`. `next` is not passed, so `RowActions` draws ⋯ alone (44 × 44px below `md`: `icon-sm` is `min-h-11 min-w-11`, the height of the `sm` links).
  - The comment above `ActionBar` (:23-28) gains: with `more` the row is a flex row that ends in ⋯, which takes one link's place, and a primary link grows twice as much as an outline one, so the next step stays the widest button (canvas B-AssetDetail-Phone: the wide "รับคืน", then "บันทึกซ่อม", then ⋯); with no link, ⋯ stands alone at the row's end (a person who may only read). Nothing returns early: an empty `actions` with `more` still draws the bar (R21: everyone on the asset page gets it).
- **`DESIGN.md`:**
  - :624: "⋯ is a `ghost` `icon-sm` button named" becomes "⋯ is a `ghost` `icon-sm` button (`triggerVariant="outline"` for the ⋯ of an `ActionBar`, beside the bar's outline links) named".
  - :707: the last sentence "The ⋯ layout of the mockup waits for phase 3." becomes:

    > A bar may end in ⋯ through `more` (group 1 asset detail, spec `docs/superpowers/specs/2026-10-25-page-group-1-dashboard-detail-login-design.md` §7.8): the trigger of `RowActions` as an `outline` `icon-sm` button (44px) named by `more.label` ("การดำเนินการอื่น"), which always opens the `RowActions` bottom sheet, titled with the record's code (`more.code`, its name under it), with the other actions in groups and each unavailable one with its reason; a dialog that an item opens returns focus to ⋯ through `more.openerRef`. ⋯ shows only while a group holds an item, and the row is then one line of at most three links and ⋯ (two links under a `primaryAction`), where a `primary` link takes twice the width of an outline one (`flex-2` and `flex-1`), so the next step stays the widest button. A bar may hold ⋯ alone, at the end of its row, when every action the person may take is in the sheet (the asset page's viewer, whose sheet holds "พิมพ์ป้าย").

- **`docs/14_UI_UX_DESIGN_SYSTEM.md`**, each text inserted before the row's closing ` |`:
  - The `ActionBar` row (`| A phone action bar on a detail page |`):

    ```
    ; `more` ends the row with ⋯ (`RowActions`' bottom sheet, its trigger `outline`, named by `more.label`), which takes one link's place, and a `primary` link is then twice as wide as an outline one
    ```

  - The `RowActions` row (`| A next step and more actions in a table row |`):

    ```
    ; `triggerVariant="outline"` only for the ⋯ of an `ActionBar`'s `more`
    ```
- **`.impeccable/design.json`:** the `"Row Actions"` entry (found by its name), append to its `description`: " In a phone ActionBar the same ⋯ is an outline icon button that always opens the bottom sheet."
- No caller until Task 8 and no message: the label is the caller's (Task 8 adds "การดำเนินการอื่น").

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/mobile-action-bar.test.ts tests/row-actions-ui.test.ts tests/operations-sweep-ui.test.ts tests/audit-scan-search-ui.test.ts tests/disposal-detail-workspace.test.ts tests/asset-register-table-ui.test.ts tests/dropdown-menus-ui.test.ts tests/dead-code-cleanup.test.ts tests/form-migration-guards.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts tests/ui-overlay-guards.test.ts tests/phase2d-docs.test.ts tests/dark-mode-docs.test.ts && npx tsc --noEmit && npx eslint src/components/ui/action-bar.tsx src/components/ui/row-actions.tsx`
Expected: PASS. tsc: `ActionBarMore.openerRef` is the `RefObject<HTMLElement | null>` that `RowActionsProps.openerRef` takes, and `variant={triggerVariant}` is a `buttonVariants` variant.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/action-bar.tsx src/components/ui/row-actions.tsx tests/mobile-action-bar.test.ts tests/row-actions-ui.test.ts DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md .impeccable/design.json
git commit -m "feat(ui): ActionBar can end in ⋯, which opens the RowActions bottom sheet (group 1 asset detail task 6)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: The tabs, the view names and the data per tab

The view names change in the pure helpers, and the page follows in the same commit: the `AssetDetailView` union types the tab labels and counts, so the page cannot keep the old names. The page keeps its sections as they are and shows them under the new tabs until Tasks 8-12 replace them: ภาพรวม = overview, specs, purchase, notes (with today's side column); ประวัติ = movement and audit; ส่วนควบ = ownership, components, handover; ไฟล์ = photos; ซ่อม / PM = maintenance. Old links keep working (`custody`, `operations`, `audit`). The load per tab here is interim (R24): Tasks 9-12 each replace their tab's load with their own loader (timing labels `asset-detail.history-tab`, `asset-detail.components-tab`, `asset-detail.files-tab`, `asset-detail.maintenance-tab`). The tab counts are final: the history count is Task 3's `getAssetHistoryCounts` total (R11), and the other three count through the `where` their tab lists with (the components count matches the links Task 10 renders instead, R58).

**Files:**
- Modify: `src/lib/asset-detail-view.ts` (the whole file, :1-81)
- Modify: `src/lib/asset-detail-data.ts` (the whole file, :1-40: the policy per view, the `AssetDetailCounts` type and three `where` builders; still pure)
- Create: `src/lib/asset-detail-counts.ts` (server: `getAssetDetailCounts`; the history count is Task 3's `getAssetHistoryCounts(assetId).total`, R11; Task 7 does not touch `src/lib/asset-history.ts` or `src/lib/asset-history-rules.ts`)
- Modify: `src/lib/asset-return-navigation.ts:27` (the component manager's fallback)
- Modify: `src/components/assets/asset-detail-tabs.tsx:69` (a count of 0 shows)
- Modify: `src/components/ui/page-skeleton.tsx:203` (`AssetDetailPageSkeleton`: five tabs)
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx` (master f6368e19): the imports :67 and after :72, :128, the first round :140-261, :484, :730-733, :735-736 (a `photosHref` after `sectionHref`), :746, :752, :754, the tabs :1024-1037, the two photo cards :1601-1614, `SidebarPhotoCard` :2239-2289
- Modify: `src/app/[locale]/(dashboard)/reports/page.tsx`: the imports (:1-29) and `getDataQualityIssues` :808-818
- Modify: `messages/th.json`, `messages/en.json` (through `scripts/messages-edit.mjs`)
- Modify: `DESIGN.md:486` (on master f6368e19; :487 after Task 5): the Detail pages bullet's last sentence
- Tests rewritten in this task (each pin the change breaks):
  - `tests/asset-detail-view.test.ts` (the whole file: the views, `resolveAssetDetailView`, hrefs, sections, the reports' links, the page's wiring)
  - `tests/asset-detail-data-boundaries.test.ts:7-30` (the policy per new view) and a new test for the `where` builders; :32-58 unchanged
  - `tests/asset-return-navigation.test.ts:62-75` (`?view=components`)
  - `tests/asset-component-manager.test.ts:10` (`?view=components`)
  - `tests/asset-detail-ux.test.ts:67-79` (the tab messages) and `:102-112` (the tab counts)
  - `tests/asset-detail-tabs.test.ts:32` (a count of 0 shows)
  - `tests/operations-sweep-ui.test.ts:26` (the import line) and `:35` (`#photos` joins the anchors the page may not write as a literal)
- Create: `tests/asset-detail-counts.test.ts`
- Re-run unchanged: `tests/asset-detail-anchor-layout.test.ts` (the sections and their order stay), `tests/asset-photo-gallery.test.ts:23-29` (`function SidebarPhotoCard`, `h-32`), `tests/e2e-fixes.test.ts:79-91` (no `createHealthItem(…, editHref)`), `tests/performance-route-instrumentation.test.ts` (the three labels stay; the counts join the `asset-detail.initial-data` round), `tests/page-loading-skeleton.test.ts`, `tests/loading-boundaries.test.ts`, `tests/warranty-filter-counts.test.ts:32`, `tests/reports-adaptive-ui.test.ts`, `tests/messages-parity.test.ts`, `tests/thai-glossary.test.ts`, `tests/list-frame-guards.test.ts` (LV2 page row stays 4: no `"-"` added), `tests/dark-mode-p.test.ts` (stays at Task 4's 20 images / 16 stages: no image added or removed, R29), `tests/e2e-transactions.test.ts:201` (the E2E helper keeps `"operations"`, which now opens ประวัติ; Task 13 renames it).
- E2E: no step changes in this task. `visitAssetPage(…, "operations")` opens ประวัติ, which still renders the movement timeline (cancel.spec.ts:77-81, transfer.spec.ts:94-98); the overview keeps `#overview` with the licence seats, the purchase section with the document number and the side photo card's `<img>` (register-asset.spec.ts:93-99, licence.spec.ts:71-73).

**Interfaces:**
- Produces:
  - `src/lib/asset-detail-view.ts` (pure; relative imports only):
    - `assetDetailViews = ["overview", "history", "components", "files", "maintenance"] as const`, `type AssetDetailView`.
    - `resolveAssetDetailView(raw: string | string[] | undefined): { view: AssetDetailView; historyType: AssetHistoryCategory | null }`: a new name opens its tab; `custody` → components, `operations` → history, `audit` → history with `historyType: "audit"`; anything else → overview. The old names sit in a `Map` (R22). It does not read `?type=`: Task 9 does, and an explicit `?type=` wins over the `audit` mapping (R17).
    - `buildAssetDetailViewHref(locale: string, assetId: string, view: AssetDetailView, returnTo?: string | null): string`: `/${locale}/assets/<id>?view=<view>[&returnTo=…]`, with no `#anchor`.
    - `buildAssetDetailSectionHref(locale: string, assetId: string, currentView: AssetDetailView | null, sectionId: AssetDetailSectionId, returnTo?: string | null): string`: `#<section>` when `currentView` renders it, else its tab's URL with `#<section>`; `null` = a link from another page (the reports).
    - `type AssetDetailSectionId` (unchanged), `getAssetDetailViewSectionIds`, `isAssetDetailSectionVisible` (the sections per tab above). `parseAssetDetailView` is removed (its only caller was the page).
  - `src/lib/asset-detail-data.ts` (pure; Prisma for types only):
    - `getAssetDetailLoadPolicy(view: AssetDetailView): AssetDetailLoadPolicy` (the type is unchanged; interim until each of Tasks 9-12 owns its tab's loader, R24).
    - `type AssetDetailCounts = { history: number; components: number; files: number; repairs: number }`.
    - `ASSET_DETAIL_FILE_MODULES = ["asset", "asset_purchase"] as const`; `assetDetailFileWhere(assetId: string): Prisma.AttachmentWhereInput`; `assetDetailComponentLinkWhere(assetId: string): Prisma.AssetComponentWhereInput`; `assetRepairRecordWhere(assetId: string): Prisma.MaintenanceTicketWhereInput`. Tasks 11 and 12 list with `assetDetailFileWhere` and `assetRepairRecordWhere`, so their tab shows the number its count says (R24: the files loader has no cap; the repairs count is every active record, the table's rows). The components count (installed, not removed, either side; `assetDetailComponentLinkWhere`) equals the page's current components plus `installedInLinks`, which Task 10 renders (R58).
  - `src/lib/asset-detail-counts.ts` (server, R22): `getAssetDetailCounts(assetId: string): Promise<AssetDetailCounts>`, one round: `getAssetHistoryCounts(assetId)` and three counts. `history` is `getAssetHistoryCounts`' `total` (R11), the same number as the history tab's "ทั้งหมด" chip and the overview's "ดูประวัติทั้งหมด N รายการ" (Task 8 reads it for the tabs and that link).
  - `normalizeAssetComponentManagerReturnTo(locale, assetId, value)`: the fallback becomes `/${locale}/assets/<id>?view=components`; the page's own link to the manager carries `buildAssetDetailViewHref(locale, id, "components", returnToHref)`, so the manager returns to the components tab with the detail's own `returnTo` (R22).
  - `AssetDetailTabs`: a tab with `count: 0` shows "0"; a tab without a count shows none (ภาพรวม).
- Consumes: `type AssetHistoryCategory` (`src/lib/asset-history-rules.ts`, Task 3); `getAssetHistoryCounts(assetId: string): Promise<{ total: number; counts: Record<AssetHistoryCategory, number> }>` (`src/lib/asset-history.ts`, Task 3, R11).

- [ ] **Step 1: Add the tab names**

Write this change file in the session scratchpad, then run `node scripts/messages-edit.mjs <file>` (6 keys set in th and in en, 3 deleted). Glossary: ส่วนควบ as it is; "ซ่อม / PM" keeps PM as written in §2.3 (a tab label, not the full heading "บำรุงรักษาตามรอบ (PM)"); nothing here matches a retired word. The nav name follows the board (`aria-label="ส่วนของทรัพย์สิน"`).

| Key | th | en |
|---|---|---|
| `asset.detailViews.label` | ส่วนของทรัพย์สิน | Asset sections |
| `asset.detailViews.overview` | ภาพรวม | Overview |
| `asset.detailViews.history` | ประวัติ | History |
| `asset.detailViews.components` | ส่วนควบ | Components |
| `asset.detailViews.files` | ไฟล์ | Files |
| `asset.detailViews.maintenance` | ซ่อม / PM | Repair / PM |

Delete: `asset.detailViews.custody`, `asset.detailViews.operations`, `asset.detailViews.audit` (their only reader is the page's tab labels, rewritten in Step 4).

- [ ] **Step 2: Write the failing tests**

`tests/asset-detail-view.test.ts` (the whole file):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  assetDetailViews,
  buildAssetDetailSectionHref,
  buildAssetDetailViewHref,
  getAssetDetailViewSectionIds,
  isAssetDetailSectionVisible,
  resolveAssetDetailView,
} from "../src/lib/asset-detail-view.ts"

// Group 1 asset detail task 7 (spec 2026-10-25 §7.3): five tabs as TabNav links that keep ?view=, the old names
// still open their new tab (audit with the ตรวจนับ chip), and a section link opens the tab that shows it. Until Tasks
// 8-12 the page shows today's sections under the new tabs. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const overview = { view: "overview", historyType: null }

test("the five tabs in order, and a ?view= value opens its tab: the new names, the three old ones, else the overview", () => {
  assert.deepEqual([...assetDetailViews], ["overview", "history", "components", "files", "maintenance"])
  for (const view of assetDetailViews) assert.deepEqual(resolveAssetDetailView(view), { view, historyType: null })
  assert.deepEqual(resolveAssetDetailView("custody"), { view: "components", historyType: null })
  assert.deepEqual(resolveAssetDetailView("operations"), { view: "history", historyType: null })
  assert.deepEqual(resolveAssetDetailView("audit"), { view: "history", historyType: "audit" })
  assert.deepEqual(resolveAssetDetailView(["audit", "overview"]), { view: "history", historyType: "audit" }, "the first value counts")
  for (const raw of [undefined, "", [], "unknown", "History", "photos", "constructor", "toString", "__proto__"]) {
    assert.deepEqual(resolveAssetDetailView(raw as string | string[] | undefined), overview, String(raw))
  }
})

test("a tab link keeps returnTo and carries no anchor, so the header, the tabs and the facts stay in view", () => {
  assert.equal(
    buildAssetDetailViewHref("th", "asset id/1", "history", "/th/assets?status=ready"),
    "/th/assets/asset%20id%2F1?view=history&returnTo=%2Fth%2Fassets%3Fstatus%3Dready",
  )
  assert.equal(buildAssetDetailViewHref("th", "a1", "overview"), "/th/assets/a1?view=overview")
  assert.equal(buildAssetDetailViewHref("en", "a1", "files", "  "), "/en/assets/a1?view=files")
})

test("each section belongs to exactly one tab: today's sections under the new tabs until Tasks 8-12", () => {
  assert.deepEqual(getAssetDetailViewSectionIds("overview"), ["overview", "specs", "purchase", "notes"])
  assert.deepEqual(getAssetDetailViewSectionIds("history"), ["movement", "audit"])
  assert.deepEqual(getAssetDetailViewSectionIds("components"), ["ownership", "components", "handover"])
  assert.deepEqual(getAssetDetailViewSectionIds("files"), ["photos"])
  assert.deepEqual(getAssetDetailViewSectionIds("maintenance"), ["maintenance"])
  const all = assetDetailViews.flatMap((view) => getAssetDetailViewSectionIds(view))
  assert.deepEqual([...all].sort(), ["audit", "components", "handover", "maintenance", "movement", "notes", "overview", "ownership", "photos", "purchase", "specs"])
  assert.equal(isAssetDetailSectionVisible("components", "components"), true)
  assert.equal(isAssetDetailSectionVisible("overview", "photos"), false)
  assert.equal(isAssetDetailSectionVisible("history", "audit"), true)
  assert.equal(isAssetDetailSectionVisible("maintenance", "movement"), false)
})

// Wiki open question 43 (plan 2D-4), on the new tabs: "#id" in the tab that renders the section, else that tab's URL
// with the same returnTo and the section as the anchor. A link from another page (currentView null) always opens the tab.
test("a section link stays in place on its tab and otherwise opens the tab that shows it (spec §7.3: #photos → files, #purchase → overview)", () => {
  assert.equal(buildAssetDetailSectionHref("th", "asset id/1", "overview", "purchase", "/th/assets"), "#purchase")
  assert.equal(buildAssetDetailSectionHref("th", "asset id/1", "components", "components", "/th/assets"), "#components")
  assert.equal(buildAssetDetailSectionHref("th", "a1", "files", "photos"), "#photos")
  assert.equal(
    buildAssetDetailSectionHref("th", "asset id/1", "overview", "ownership", "/th/assets?status=ready"),
    "/th/assets/asset%20id%2F1?view=components&returnTo=%2Fth%2Fassets%3Fstatus%3Dready#ownership",
  )
  assert.equal(buildAssetDetailSectionHref("th", "a1", "overview", "audit"), "/th/assets/a1?view=history#audit")
  assert.equal(buildAssetDetailSectionHref("th", "a1", "overview", "maintenance", ""), "/th/assets/a1?view=maintenance#maintenance")
  assert.equal(buildAssetDetailSectionHref("th", "a1", "overview", "photos", "/th/assets"), "/th/assets/a1?view=files&returnTo=%2Fth%2Fassets#photos")
  assert.equal(buildAssetDetailSectionHref("th", "a1", "history", "purchase", "/th/assets"), "/th/assets/a1?view=overview&returnTo=%2Fth%2Fassets#purchase")
  assert.equal(buildAssetDetailSectionHref("th", "a1", null, "photos"), "/th/assets/a1?view=files#photos")
  assert.equal(buildAssetDetailSectionHref("th", "a1", null, "purchase"), "/th/assets/a1?view=overview#purchase")
})

test("the reports' photo and warranty issues open the files tab and the purchase rows (spec §7.3)", () => {
  const reports = read("src/app/[locale]/(dashboard)/reports/page.tsx")
  assert.match(reports, /^import \{ buildAssetDetailSectionHref \} from "@\/lib\/asset-detail-view"$/m)
  assert.match(reports, /issues\.push\(\{ label: t\("missingPhoto"\), href: buildAssetDetailSectionHref\(locale, asset\.id, null, "photos"\) \}\)/)
  assert.match(reports, /issues\.push\(\{ label: t\("warrantyExpiring"\), href: buildAssetDetailSectionHref\(locale, asset\.id, null, "purchase"\) \}\)/)
  assert.doesNotMatch(reports, /\bdetailHref\b|"#photos"|"#purchase"/)
})

test("the asset page resolves its tab, counts its tabs in the first round of reads, and links photos to the files tab", () => {
  const page = read("src/app/[locale]/(dashboard)/assets/[id]/page.tsx")
  assert.match(page, /^import \{ buildAssetDetailSectionHref, buildAssetDetailViewHref, isAssetDetailSectionVisible, resolveAssetDetailView, type AssetDetailSectionId \} from "@\/lib\/asset-detail-view"$/m)
  assert.match(page, /^import \{ getAssetDetailCounts \} from "@\/lib\/asset-detail-counts"$/m)
  assert.match(page, /const \{ view: assetDetailView \} = resolveAssetDetailView\(rawSearchParams\.view\)/)
  assert.match(page, /const \[rawAsset, qrBaseUrlSetting, readyStatus, detailCounts\] = await withPerformanceTiming\(\n\s+"asset-detail\.initial-data",/)
  assert.match(page, /\n\s+getAssetDetailCounts\(id\),\n\s+\]\),\n\s+\{ route: "\/assets\/\[id\]", locale \}/)
  assert.match(page, /labels=\{\{\n\s+overview: t\("detailViews\.overview"\),\n\s+history: t\("detailViews\.history"\),\n\s+components: t\("detailViews\.components"\),\n\s+files: t\("detailViews\.files"\),\n\s+maintenance: t\("detailViews\.maintenance"\),\n\s+\}\}/)
  assert.match(page, /const componentsManagerHref = appendReturnTo\(`\/\$\{locale\}\/assets\/\$\{asset\.id\}\/components`, buildAssetDetailViewHref\(locale, asset\.id, "components", returnToHref\)\)/)
  assert.match(page, /const photosHref = sectionHref\("photos"\)/)
  assert.equal(page.match(/\bphotosHref\b/g)?.length, 7, "declared once; the photo checks of data health (four) and the two photo cards")
  assert.match(page, /function SidebarPhotoCard\(\{[\s\S]*?galleryHref,[\s\S]*?galleryHref: string[\s\S]*?\}\) \{/)
  assert.equal(page.match(/href=\{galleryHref\}/g)?.length, 2)
  assert.equal(page.match(/galleryHref=\{photosHref\}/g)?.length, 2)
  assert.doesNotMatch(page, /parseAssetDetailView|\?view=(?:custody|operations|audit)\b|["`]#photos["`]|detailViews\.(?:custody|operations|audit)\b/)
  const skeleton = read("src/components/ui/page-skeleton.tsx")
  const detail = skeleton.slice(skeleton.indexOf("export function AssetDetailPageSkeleton()"), skeleton.indexOf("export function ReportsPageSkeleton()"))
  assert.match(detail, /<TabNavSkeleton count=\{5\} \/>/, "the skeleton's tab row follows the page (DESIGN.md: same commit)")
  const design = read("DESIGN.md")
  assert.ok(design.includes("The asset page's five tabs (ภาพรวม, ประวัติ, ส่วนควบ, ไฟล์, ซ่อม / PM; `?view=overview|history|components|files|maintenance`"), "DESIGN.md Detail pages")
})
```

`tests/asset-detail-data-boundaries.test.ts`: the import at :5 becomes `import { assetDetailComponentLinkWhere, assetDetailFileWhere, assetRepairRecordWhere, getAssetDetailLoadPolicy } from "../src/lib/asset-detail-data.ts"`; :7-30 become:

```ts
// Group 1 asset detail task 7 (spec §7.3): each tab loads the rows today's sections need there and no more; the
// overview never loads a whole history. This policy is interim: the history and maintenance limits are the old
// operations and audit views', and Tasks 9-12 each replace their tab's load with their own loader (R24); nothing
// renders the disposal requests or the findings, so they stay at one row.
test("asset detail load policy: one row per relation on the overview and the files tab, more only where a tab lists them", () => {
  const preview = { movementLimit: 1, checkoutLimit: 1, maintenanceLimit: 1, auditItemLimit: 1, auditFindingLimit: 1, disposalLimit: 1, assignedLicenseLimit: 1 }
  assert.deepEqual(getAssetDetailLoadPolicy("overview"), preview)
  assert.deepEqual(getAssetDetailLoadPolicy("files"), preview)
  assert.deepEqual(getAssetDetailLoadPolicy("history"), { ...preview, movementLimit: 20, checkoutLimit: 10, maintenanceLimit: 10, auditItemLimit: 10 })
  assert.deepEqual(getAssetDetailLoadPolicy("components"), { ...preview, checkoutLimit: 10, assignedLicenseLimit: 50 })
  assert.deepEqual(getAssetDetailLoadPolicy("maintenance"), { ...preview, maintenanceLimit: 10 })
})

test("a tab's count and the records the tab lists share one where: the asset's files, its current component links both ways, its repair records (spec §7.3)", () => {
  assert.deepEqual(assetDetailFileWhere("a1"), { assetId: "a1", isActive: true, module: { in: ["asset", "asset_purchase"] } })
  assert.deepEqual(assetDetailComponentLinkWhere("a1"), { status: "installed", removedAt: null, OR: [{ parentAssetId: "a1" }, { componentAssetId: "a1" }] })
  assert.deepEqual(assetRepairRecordWhere("a1"), { assetId: "a1", isActive: true })
})
```

`tests/asset-detail-counts.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 1 asset detail task 7 (spec §7.3): the tab counts, "ประวัติ N · ส่วนควบ N · ไฟล์ N · ซ่อม / PM N", in one
// round, each through the where its tab lists with; history is the total of Task 3's getAssetHistoryCounts (R11), the
// number the history tab's "ทั้งหมด" chip and the overview's "ดูประวัติทั้งหมด N รายการ" show. This file reads no
// rows of its own. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("getAssetDetailCounts: the history total and three counts in one Promise.all, each through its tab's where", () => {
  const source = read("src/lib/asset-detail-counts.ts")
  assert.match(source, /^import \{ prisma \} from "@\/lib\/db"$/m)
  assert.match(source, /^import \{ getAssetHistoryCounts \} from "@\/lib\/asset-history"$/m)
  assert.match(source, /^import \{ assetDetailComponentLinkWhere, assetDetailFileWhere, assetRepairRecordWhere, type AssetDetailCounts \} from "@\/lib\/asset-detail-data"$/m)
  assert.match(source, /export async function getAssetDetailCounts\(assetId: string\): Promise<AssetDetailCounts> \{/)
  assert.match(
    source,
    /const \[history, components, files, repairs\] = await Promise\.all\(\[\n\s+getAssetHistoryCounts\(assetId\),\n\s+prisma\.assetComponent\.count\(\{ where: assetDetailComponentLinkWhere\(assetId\) \}\),\n\s+prisma\.attachment\.count\(\{ where: assetDetailFileWhere\(assetId\) \}\),\n\s+prisma\.maintenanceTicket\.count\(\{ where: assetRepairRecordWhere\(assetId\) \}\),\n\s+\]\)/,
  )
  assert.match(source, /return \{ history: history\.total, components, files, repairs \}/)
  assert.doesNotMatch(source, /findMany|findFirst|include:|countAssetHistoryEvents|assetHistory\w*Where/, "counts only; the history count is Task 3's, not a second reading of its sources")
})
```

`tests/asset-return-navigation.test.ts:62-75`: every `?view=custody` in the three expected values becomes `?view=components`, and the first call's argument becomes `"/th/assets/asset%20id%2F1?view=components"` (a return to the components tab is kept as it is). The test at :21-27 stays: an old `?view=custody#components` return target is still an allowed asset path.

`tests/asset-component-manager.test.ts:10`: `assert.match(source, /const fallback = `\$\{allowedPath\}\?view=components`/)`.

`tests/asset-detail-ux.test.ts`:
- :67-79 becomes:

  ```ts
  test("asset detail makes component management discoverable from the components tab and More", () => {
    const source = assetDetailSource()
    const thaiMessages = JSON.parse(readFileSync("messages/th.json", "utf8"))
    const englishMessages = JSON.parse(readFileSync("messages/en.json", "utf8"))
    const menuSource = readFileSync("src/components/assets/asset-detail-action-menu.tsx", "utf8")

    assert.match(source, /manageHref=\{componentsManagerHref\}/)
    assert.match(source, /\{ key: "components" as const, href: componentsManagerHref, label: t\("manageComponents"\) \}/)
    assert.match(menuSource, /<Link href=\{link\.href\}>/)
    assert.deepEqual(thaiMessages.asset.detailViews, { label: "ส่วนของทรัพย์สิน", overview: "ภาพรวม", history: "ประวัติ", components: "ส่วนควบ", files: "ไฟล์", maintenance: "ซ่อม / PM" })
    assert.deepEqual(englishMessages.asset.detailViews, { label: "Asset sections", overview: "Overview", history: "History", components: "Components", files: "Files", maintenance: "Repair / PM" })
  })
  ```

- :102-112 becomes:

  ```ts
  test("asset detail tabs count history, components, files and repairs, and warn on a missing component serial", () => {
    const source = assetDetailSource()
    const tabsSource = readFileSync("src/components/assets/asset-detail-tabs.tsx", "utf8")

    assert.match(source, /const componentMissingSerialCount = currentComponentsForPanel\.filter\(\(component\) => !component\.componentAsset\.serialNumber\)\.length/)
    assert.match(source, /indicators=\{\{\s*history: \{ count: detailCounts\.history \},\s*components: \{ count: detailCounts\.components, hasWarning: componentMissingSerialCount > 0 \},\s*files: \{ count: detailCounts\.files \},\s*maintenance: \{ count: detailCounts\.repairs \},?\s*\}\}/)
    assert.doesNotMatch(source, /componentRelationshipCount/)
    assert.match(tabsSource, /AlertTriangle/)
    assert.match(tabsSource, /indicator\?\.count/)
    assert.match(tabsSource, /warningLabel/)
  })
  ```

`tests/asset-detail-tabs.test.ts:32`: `assert.match(source, /count: indicator\?\.count === undefined \? undefined : formatCount\(indicator\.count\)/)` (the board's "ไฟล์ 0": a zero is a count).

`tests/operations-sweep-ui.test.ts`:
- :26: `parseAssetDetailView` becomes `resolveAssetDetailView` in the pinned import line.
- :35: `/["`]#(?:ownership|components|handover|movement|maintenance|audit)["`]|\bstatusHref\b/` becomes `/["`]#(?:ownership|components|handover|movement|maintenance|audit|photos)["`]|\bstatusHref\b/`, and the comment above it: "Only sections of the overview tab stay plain "#id" links: they render on the overview only; photos is on the files tab since group 1."

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test tests/asset-detail-view.test.ts tests/asset-detail-data-boundaries.test.ts tests/asset-detail-counts.test.ts tests/asset-return-navigation.test.ts tests/asset-component-manager.test.ts tests/asset-detail-ux.test.ts tests/asset-detail-tabs.test.ts tests/operations-sweep-ui.test.ts`
Expected: FAIL. `asset-detail-view.test.ts` and `asset-detail-data-boundaries.test.ts` stop at the import (`resolveAssetDetailView` and `assetDetailFileWhere` are not exported); `asset-detail-counts.ts` does not exist; the fallback is still `?view=custody`; the page still reads `parseAssetDetailView` and the old tab keys.

- [ ] **Step 4: Implement**

- **`src/lib/asset-detail-view.ts`:**
  - `import type { AssetHistoryCategory } from "./asset-history-rules.ts"` (type only, so `AssetDetailTabs`, a client module, still imports it).
  - `assetDetailViews` and the section map as the tests pin them; `assetDetailViewAnchor` goes (tab links carry no anchor).
  - The old names in a `Map` (a plain object would answer `constructor`):

    ```ts
    // ?view= values from before group 1 (bookmarks, old component-manager returns, the E2E helper) open their new tab.
    const legacyAssetDetailViews = new Map<string, { view: AssetDetailView; historyType: AssetHistoryCategory | null }>([
      ["custody", { view: "components", historyType: null }],
      ["operations", { view: "history", historyType: null }],
      ["audit", { view: "history", historyType: "audit" }],
    ])

    export function resolveAssetDetailView(raw: string | string[] | undefined): { view: AssetDetailView; historyType: AssetHistoryCategory | null } {
      const value = Array.isArray(raw) ? raw[0] : raw
      if (value && (assetDetailViews as readonly string[]).includes(value)) return { view: value as AssetDetailView, historyType: null }
      const legacy = value ? legacyAssetDetailViews.get(value) : undefined
      return legacy ? { ...legacy } : { view: "overview", historyType: null }
    }
    ```

  - `buildAssetDetailUrl(locale, assetId, view, anchor: string | null, returnTo?)` appends `#${anchor}` only when given; `buildAssetDetailViewHref` passes `null`; `buildAssetDetailSectionHref` takes `currentView: AssetDetailView | null` and returns `#${sectionId}` only when `currentView` is set and renders it. The comment above it keeps the wiki 43 sentence and adds that `null` is a link from another page.
  - `parseAssetDetailView` is deleted.
- **`src/lib/asset-detail-data.ts`:** `import type { Prisma } from "@prisma/client"` beside the existing type import. `getAssetDetailLoadPolicy` returns the five policies the test pins (`history`, `components` and `maintenance` from `previewPolicy` with the pinned overrides; `overview` and `files` the preview). Then `AssetDetailCounts`, `ASSET_DETAIL_FILE_MODULES` and the three builders exactly as the test pins their results, each under a one-line comment naming the tab that lists with it (Task 11 files, Task 12 repairs; the components builder counts the links Task 10 renders from the page's own reads, R58). The file stays pure: relative imports only, no `prisma` client, no `@/`.
- **`src/lib/asset-detail-counts.ts`** (new, server, R22): imports `prisma` (`@/lib/db`), `getAssetHistoryCounts` (`@/lib/asset-history`, Task 3) and the three builders and `type AssetDetailCounts` (`@/lib/asset-detail-data`), the lines the test pins; `getAssetDetailCounts` is the pinned `Promise.all` and return (`history: history.total`, R11). A head comment: the counts of the four tabs that have one (ภาพรวม has none), each through the `where` its tab lists with (components: the links Task 10 renders, R58), the history through Task 3's own count (its sources and merge rules), in one round; it never writes and reads no rows of its own.
- **`src/lib/asset-return-navigation.ts:27`:** `const fallback = \`${allowedPath}?view=components\``.
- **`src/components/assets/asset-detail-tabs.tsx:69`:** `count: indicator?.count === undefined ? undefined : formatCount(indicator.count)`.
- **`src/components/ui/page-skeleton.tsx:203`:** `<TabNavSkeleton count={5} />` (the rest of the skeleton is Task 8's).
- **`src/app/[locale]/(dashboard)/assets/[id]/page.tsx`:**
  - :67: the import line the test pins (`resolveAssetDetailView` for `parseAssetDetailView`); after :72: `import { getAssetDetailCounts } from "@/lib/asset-detail-counts"`.
  - :128: `const { view: assetDetailView } = resolveAssetDetailView(rawSearchParams.view)` (the history chip is Task 9's).
  - :140: the destructure gains `detailCounts`, and the `Promise.all` of `asset-detail.initial-data` gains `getAssetDetailCounts(id),` as its last entry (one round, no new timing label).
  - :484: `componentRelationshipCount` goes (the tab takes `detailCounts.components`, the same links counted by the database).
  - :730-733: `const componentsManagerHref = appendReturnTo(\`/${locale}/assets/${asset.id}/components\`, buildAssetDetailViewHref(locale, asset.id, "components", returnToHref))`: the manager returns to the components tab and the detail keeps its own `returnTo` (the register's search survives the round trip).
  - After :735 (`sectionHref`): `const photosHref = sectionHref("photos")`. :746 (both `"#photos"`), :752 and :754: `photosHref`. These data-health links render on the overview, and the photos section is on the files tab now.
  - :1024-1037: `labels` as the test pins; `indicators` as `tests/asset-detail-ux.test.ts` pins (history, components with the serial warning, files, maintenance from `detailCounts`).
  - :1601-1614: both `<SidebarPhotoCard …>` gain `galleryHref={photosHref}`.
  - :2239-2289, `SidebarPhotoCard`: a `galleryHref` prop (`galleryHref: string` in its type) and `href={galleryHref}` on its two links (:2256, :2282); nothing else changes.
- **`src/app/[locale]/(dashboard)/reports/page.tsx`:** import `buildAssetDetailSectionHref` from `@/lib/asset-detail-view`; in `getDataQualityIssues` the two pushes take the pinned hrefs and `const detailHref` (:809) goes.
- **`DESIGN.md:486`** (Detail pages), its last sentence "The asset page's view tabs are `TabNav`, rendered by the client wrapper `AssetDetailTabs`, which keeps the sideways scroll and the snap (`linkClassName="snap-start"`), brings the current tab into view and shows the edge cue." becomes:

  > The asset page's five tabs (ภาพรวม, ประวัติ, ส่วนควบ, ไฟล์, ซ่อม / PM; `?view=overview|history|components|files|maintenance`, and the old `custody`, `operations` and `audit` still open their new tab; group 1) are `TabNav`, rendered by the client wrapper `AssetDetailTabs`, which keeps the sideways scroll and the snap (`linkClassName="snap-start"`), brings the current tab into view and shows the edge cue. A tab's count is the number of records its tab lists (`getAssetDetailCounts`, 0 included); a tab link keeps `returnTo` and carries no `#anchor`, so the header, the tabs and the facts stay in view, while a link to a section on another tab opens that tab at the section (`buildAssetDetailSectionHref`).

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test tests/asset-detail-view.test.ts tests/asset-detail-data-boundaries.test.ts tests/asset-detail-counts.test.ts tests/asset-return-navigation.test.ts tests/asset-component-manager.test.ts tests/asset-detail-ux.test.ts tests/asset-detail-tabs.test.ts tests/operations-sweep-ui.test.ts tests/asset-detail-anchor-layout.test.ts tests/asset-photo-gallery.test.ts tests/e2e-fixes.test.ts tests/e2e-transactions.test.ts tests/performance-route-instrumentation.test.ts tests/page-loading-skeleton.test.ts tests/loading-boundaries.test.ts tests/warranty-filter-counts.test.ts tests/reports-adaptive-ui.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts tests/list-frame-guards.test.ts tests/dark-mode-p.test.ts && npx tsc --noEmit && npx eslint src/lib/asset-detail-view.ts src/lib/asset-detail-data.ts src/lib/asset-detail-counts.ts src/lib/asset-return-navigation.ts src/components/assets/asset-detail-tabs.tsx src/components/ui/page-skeleton.tsx "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" "src/app/[locale]/(dashboard)/reports/page.tsx"`
Expected: PASS. tsc: `getAssetHistoryCounts(assetId)` resolves to `{ total; counts }`, so `history.total` is the `number` `AssetDetailCounts.history` takes.

- [ ] **Step 6: Commit**

```bash
git add src/lib/asset-detail-view.ts src/lib/asset-detail-data.ts src/lib/asset-detail-counts.ts src/lib/asset-return-navigation.ts src/components/assets/asset-detail-tabs.tsx src/components/ui/page-skeleton.tsx "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" "src/app/[locale]/(dashboard)/reports/page.tsx" messages/th.json messages/en.json DESIGN.md tests/asset-detail-view.test.ts tests/asset-detail-data-boundaries.test.ts tests/asset-detail-counts.test.ts tests/asset-return-navigation.test.ts tests/asset-component-manager.test.ts tests/asset-detail-ux.test.ts tests/asset-detail-tabs.test.ts tests/operations-sweep-ui.test.ts
git commit -m "feat(assets): the detail's five tabs, their view names and counts, and the rows each tab loads (group 1 asset detail task 7)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8A: The status correction opens as a dialog its owner can open

**P** below is `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`; its line numbers are master f6368e19's. Tasks 1 and 7 touch the page first, so find each span by its quoted code.

**Files:**
- Create: `src/components/assets/asset-status-correction-dialog.tsx`
- Delete: `src/components/assets/asset-status-correction-button.tsx`
- Modify: P:47 (the import) and P:1085-1102 (the quick-actions panel renders the dialog with its own trigger; 8C moves it into "อื่น ๆ")
- Test (rewritten pins):
  - `tests/asset-status-correction-ui.test.ts` (whole file)
  - `tests/assets-sweep-ui.test.ts:27-35`
  - `tests/v-track2-a.test.ts:270-282`
  - `tests/validation-guards.test.ts:23,103` (the path, same count: V_SCOPE stays 51)
  - `tests/dead-code-cleanup.test.ts:55` (the path)
  - `tests/asset-operation-status-policy.test.ts:98-107`
  - Unchanged and still passing: `tests/v-track-final.test.ts:161` (reads the test file's name, which stays), `tests/form-migration-guards.test.ts` GD2-GD6 (the new dialog uses the footer part, Cancel first, and `accessibleDialogFormClasses` on its form).

**Interfaces:**
- Consumes: `AccessibleDialog`, `AccessibleDialogBody`, `AccessibleDialogFooter`, `AccessibleDialogCancel`, `accessibleDialogFormClasses` (`src/components/ui/accessible-dialog.tsx`), `useFieldErrors`, `useValidationMessage`, the validation rules, as today.
- Produces (8C uses them):
  - `export type AssetStatusCorrectionLabels = { button: string; title: string; description: string; reason: string; reasonPlaceholder: string; cancel: string; submit: string; errorFallback: string }` (today's `labels` shape, unchanged)
  - `export type AssetStatusCorrectionDialogHandle = { open: () => void }`
  - `export function AssetStatusCorrectionDialog({ assetId, readyStatusId, labels, ref, hideTrigger = false, returnFocusRef }: { assetId: string; readyStatusId: string; labels: AssetStatusCorrectionLabels; ref?: Ref<AssetStatusCorrectionDialogHandle>; hideTrigger?: boolean; returnFocusRef?: RefObject<HTMLElement | null> })`, the same owner contract as `TransactionCancelDialog` (`transaction-cancel-dialog.tsx:76-89`).

- [ ] **Step 1: Write the failing tests**

`tests/asset-status-correction-ui.test.ts`, whole file:

```ts
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

// Group 1 asset detail task 8A (spec 2026-10-25 §7.1 "แก้ไขสถานะ" in "อื่น ๆ"; DESIGN.md "Menus never contain dialogs"): the
// status correction is a dialog rendered outside any menu. Its owner opens it through its handle, or its own outline
// trigger shows; the reason is a shared field checked on save (v-track A5), and the submit shows busy.
test("the status correction is a dialog its owner opens, with the reason under its field and a busy submit (group 1 asset detail task 8A)", () => {
  assert.equal(existsSync("src/components/assets/asset-status-correction-button.tsx"), false)
  const source = read("src/components/assets/asset-status-correction-dialog.tsx")
  assert.match(source, /^"use client"/)
  assert.match(source, /useImperativeHandle\(ref, \(\) => \(\{ open: openDialog \}\)\)/)
  assert.match(source, /\{hideTrigger \? null : \(\s*<Button variant="outline" onClick=\{openDialog\}>\s*<RotateCcw className="text-warning" aria-hidden="true" \/>\s*\{labels\.button\}\s*<\/Button>\s*\)\}/)
  assert.match(source, /<AccessibleDialog\s+open=\{open\}\s+title=\{labels\.title\}\s+description=\{labels\.description\}\s+busy=\{isSubmitting\}\s+initialFocusRef=\{reasonRef\}\s+returnFocusRef=\{returnFocusRef\}\s+onClose=\{closeDialog\}\s*>/)
  assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate className=\{accessibleDialogFormClasses\}>/)
  assert.match(source, /<Field\s+label=\{labels\.reason\}\s+required\s+error=\{fieldErrors\.errors\.reason \? validationMessage\(fieldErrors\.errors\.reason, \{ min: 5, max: 500 \}\) : undefined\}\s*>\s*<Textarea\s+ref=\{reasonRef\}\s+id="asset-status-correction-reason"/)
  assert.match(source, /<AccessibleDialogFooter>\s*<AccessibleDialogCancel>\{labels\.cancel\}<\/AccessibleDialogCancel>\s*<Button type="submit" busy=\{isSubmitting\}>\s*\{labels\.submit\}\s*<\/Button>\s*<\/AccessibleDialogFooter>/)
  // A refusal that names no field keeps this line under the field (spec §4.1.3).
  assert.match(source, /\{error \? <p className="mt-2 text-sm text-danger"><ApiErrorText error=\{error\} \/><\/p> : null\}/)
  assert.doesNotMatch(source, /<button\b|<textarea|<label\b|aria-expanded|aria-controls|useId|panelId|<Notice\b|labels\.submitting|disabled:opacity|bg-warning-soft/)
})
```

`tests/assets-sweep-ui.test.ts:27-35` becomes the test named `"status correction: a dialog with the dialog parts, the description in the dialog head, no panel of its own (group 1 asset detail task 8A)"`:
```ts
const source = read(`${C}assets/asset-status-correction-dialog.tsx`)
assert.match(source, /import \{ AccessibleDialog, AccessibleDialogBody, AccessibleDialogCancel, AccessibleDialogFooter, accessibleDialogFormClasses \} from "@\/components\/ui\/accessible-dialog"/)
assert.match(source, /description=\{labels\.description\}/)
assert.doesNotMatch(source, /rounded-md border border-border bg-background p-4|border-warning-border|<Notice tone="neutral"/)
```

`tests/v-track2-a.test.ts:270-282`, the test keeps its name; its body reads `${C}assets/asset-status-correction-dialog.tsx`, keeps `assertMovedForm(source, { ids: { reason: "asset-status-correction-reason" } })`, the `check("reason", …)` line, `<Button type="submit" busy={isSubmitting}>`, the no-`disabled={` line, the `applyServer` line and the error line, and replaces the two `<form …>` / `<Field …>` regexes with:
```ts
assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate className=\{accessibleDialogFormClasses\}>/)
assert.match(source, /<Field\s+label=\{labels\.reason\}\s+required\s+error=\{fieldErrors\.errors\.reason \? validationMessage\(fieldErrors\.errors\.reason, \{ min: 5, max: 500 \}\) : undefined\}\s*>/)
```

`tests/validation-guards.test.ts:23` and `:103`: `asset-status-correction-button.tsx` → `asset-status-correction-dialog.tsx` (count 1, same place in both lists). `tests/dead-code-cleanup.test.ts:55`: the same path change.

`tests/asset-operation-status-policy.test.ts:98-107`, the test keeps its name:
```ts
const pageSource = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8")
const componentSource = readFileSync("src/components/assets/asset-status-correction-dialog.tsx", "utf8")
assert.match(pageSource, /AssetStatusCorrectionDialog/)
assert.match(pageSource, /canCorrectAssetStatus/)
assert.match(componentSource, /\/api\/assets\/\$\{assetId\}\/status-correction/)
assert.match(componentSource, /minLength\(values\.reason, 5\)/)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/asset-status-correction-ui.test.ts tests/assets-sweep-ui.test.ts tests/v-track2-a.test.ts tests/validation-guards.test.ts tests/dead-code-cleanup.test.ts tests/asset-operation-status-policy.test.ts`
Expected: FAIL. `asset-status-correction-dialog.tsx` does not exist and the button file still does.

- [ ] **Step 3: Implement**

`git mv src/components/assets/asset-status-correction-button.tsx src/components/assets/asset-status-correction-dialog.tsx`, then in it:
- Keep `FIELD_IDS`, `FIELD_ORDER`, `validate()`, the fetch, `fieldErrors.applyServer` and the error line exactly as today.
- `openDialog()`: clears the error and the field errors, then opens. `closeDialog()`: closes, clears the error and the field errors (today's Cancel handler). On success: close, clear the reason, `router.refresh()`.
- `useImperativeHandle(ref, () => ({ open: openDialog }))`; a `reasonRef` on the `Textarea` is the dialog's `initialFocusRef`.
- Markup as pinned: the optional outline trigger, then `AccessibleDialog` with the title and description (the neutral Notice and the `useId` panel go: the dialog head carries the description), a `<form … className={accessibleDialogFormClasses}>` holding `AccessibleDialogBody` (the `Field` without `className="mt-3"`, the `Textarea` with its id, placeholder and `min-h-24`, then the error line) and `AccessibleDialogFooter` (Cancel, then the busy submit).

P:47 imports `AssetStatusCorrectionDialog` from the new path; P:1087 `<AssetStatusCorrectionButton` becomes `<AssetStatusCorrectionDialog` with the same props (it shows its own trigger, so the quick-actions panel works as before).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS (GD2-GD6 see one dialog with its footer, Cancel first, the form's classes), tsc clean, lint 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/assets/asset-status-correction-dialog.tsx "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" tests/asset-status-correction-ui.test.ts tests/assets-sweep-ui.test.ts tests/v-track2-a.test.ts tests/validation-guards.test.ts tests/dead-code-cleanup.test.ts tests/asset-operation-status-policy.test.ts
git commit -m "refactor(assets): the status correction is a dialog its owner can open, so อื่น ๆ can hold it (group 1 asset detail task 8A)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
(`git mv` already staged the deletion.)

---

### Task 8B: The frame's rules and its one read (fact strip, disposal offer, อื่น ๆ)

**P** below is `src/app/[locale]/(dashboard)/assets/[id]/page.tsx` (lines of master f6368e19; find spans by their quoted code).

**Files:**
- Create: `src/lib/asset-detail-frame-rules.ts` (pure; relative `.ts` imports only; `import type` from Task 1's `./asset-actions.ts` and `./disposal-readiness.ts`)
- Create: `src/lib/asset-detail-frame.ts` (server; `prisma`)
- Test (new): `tests/asset-detail-frame.test.ts`

**Interfaces:**
- Consumes:
  - Task 1: `type AssetOwnershipKind` (`src/lib/asset-actions.ts`). The pinned "บันทึกซ่อม" is Task 1's own `getAssetRecordRepairAction` (R4), which 8C calls; 8B has no repair rule of its own.
  - Task 2: `buildExactAssetRegisterHref(locale, { locationId })` builds the ที่ตั้ง link (R9; `exact=1` keeps it out of the view memory).
  - Existing: `bangkokDayDiff` (`src/lib/waiting-work-rules.ts:51`), `buildExactAssetRegisterHref` (`src/lib/asset-register-view-memory.ts:28`), `getAuditRoundItemResultLabelKey` (`src/lib/audit-round-result-filters.ts:84`), `getDisposalAssetEligibilityError` (`src/lib/disposal-policy.ts:62`), `type DisposalReadinessBlocker`, `disposalReadinessAssetSelect`, `getDisposalReadinessBlockersForAsset` (`src/lib/disposal-readiness.ts`), `openRepairRecordWhere` (`src/lib/repair-record-policy.ts:12`), `auditRoundOperationalWhere`, `auditRoundCoverageWhere` (`src/lib/audit-round-status.ts:4-5`).
- Produces, in `src/lib/asset-detail-frame-rules.ts`:
  - `type AssetHolderCell = { kind: "custodian"; employeeId: string; name: string; department: string | null; heldDays: number | null } | { kind: "noCustodian" } | { kind: "department"; label: "managing" | "using"; department: string | null } | { kind: "parent"; parent: { id: string; assetTag: string; name: string } | null } | { kind: "seats"; used: number; total: number | null }`
  - `describeAssetHolder(input: { ownership: AssetOwnershipKind; custodian: { id: string; code: string; fullNameTh: string; department: string | null } | null; department: string | null; parent: { id: string; assetTag: string; name: string } | null; seats: { used: number | null; total: number | null }; openCheckoutDate: Date | null; now: Date }): AssetHolderCell`
  - `type AuditRoundRef = { id: string; auditNo: string }`
  - `type AssetAuditCell = { kind: "result"; result: string; labelKey: string | null; tone: "success" | "danger" | "muted"; at: Date; round: AuditRoundRef } | { kind: "pending"; round: AuditRoundRef } | { kind: "never" }`
  - `describeAssetAudit(latest: { auditResult: string; at: Date; round: AuditRoundRef } | null, pending: { round: AuditRoundRef } | null): AssetAuditCell`
  - `type AssetWarrantyCell = { kind: "until"; date: Date } | { kind: "expired"; date: Date } | { kind: "unknown" }`
  - `describeAssetWarranty(warrantyEndDate: Date | null, now: Date): AssetWarrantyCell`
  - `formatAssetDetailDate(date: Date, locale: string): string` ("12 ม.ค. 2570" / "12 Jan 2027", Bangkok, Buddhist year in Thai, always with the year). R37: the one date formatter of the fact strip, the overview's latest rows and Task 9's history tab.
  - `buildCustodianHref(locale: string, employeeId: string, canViewEmployee: boolean): string`
  - `buildLocationRegisterHref(locale: string, locationId: string): string` (Task 2's `locationId` filter through `buildExactAssetRegisterHref(locale, { locationId })`, R9)
  - `getDisposalRequestOffer(input: { canCreate: boolean; status: { name: string; nameTh?: string | null }; openDisposalId: string | null; blockers: readonly DisposalReadinessBlocker[] }): { blocker: DisposalReadinessBlocker | null } | null`
  - `type AssetDetailDialogKey = "correctStatus" | "cancelLatest"`
  - `type AssetDetailMoreItem = { kind: "link"; key: string; label: string; href: string; phoneOnly?: true } | { kind: "unavailable"; key: string; label: string; reason: string } | { kind: "dialog"; key: AssetDetailDialogKey; label: string }`
  - `type AssetDetailMoreGroup = { key: "transactions" | "asset"; items: AssetDetailMoreItem[] }`
  - `type AssetDetailMoreTransaction = { key: string; label: string; href: string | null; enabled: boolean; reason: string | null }` (Task 1's `AssetAction` with its full `labelKey` / `reasonKey` already translated by the page through the root translator, R2; never the primary, R3)
  - `buildAssetDetailMoreGroups(input: { primaryKey: string | null; transactions: readonly AssetDetailMoreTransaction[]; recordRepair: { label: string; href: string } | null; disposal: { label: string; href: string; reason: string | null } | null; correctStatus: string | null; cancelLatest: string | null; manageComponents: { label: string; href: string } | null; clone: { label: string; href: string } | null; edit: { label: string; href: string } | null; printLabel: { label: string; href: string } }): AssetDetailMoreGroup[]`
  - `withoutPhoneOnly(groups: readonly AssetDetailMoreGroup[]): AssetDetailMoreGroup[]`
  - R59, the overview's "ข้อมูลยังไม่ครบ" line (today's data-health items, P:736-759, as a pure rule):
    - `type AssetDataGapKey = "serial" | "licenseKey" | "photo" | "checklist" | "purchaseDocument" | "responsibility" | "licenseSeats" | "warranty" | "licenseExpiry"`
    - `type AssetDataGap = { key: AssetDataGapKey; labelKey: string; target: "edit" | "files" | "purchaseDocuments"; anchor: string | null; count?: number }`. `labelKey` is a full message key, read with the root translator (R2). `anchor` is a field id of the edit form.
    - `listAssetDataGaps(input: { ownership: AssetOwnershipKind; hasSerial: boolean; hasResponsibility: boolean; hasPrimaryPhoto: boolean; missingChecklistCount: number; hasPurchaseDocument: boolean; hasWarrantyEnd: boolean; hasLicenseSeats: boolean }): AssetDataGap[]`
- Produces, in `src/lib/asset-detail-frame.ts`:
  - `type AssetDetailFrame = { openCheckout: { id: string; checkoutDate: Date; handoverMode: string | null } | null; openRepairId: string | null; openDisposalId: string | null; latestAuditResult: { auditResult: string; at: Date; round: AuditRoundRef } | null; pendingAudit: { round: AuditRoundRef } | null; latestHandover: { id: string; documentNo: string | null } | null; disposalBlockers: DisposalReadinessBlocker[] }`
  - `getAssetDetailFrame(assetId: string): Promise<AssetDetailFrame>`

- [ ] **Step 1: Write the failing tests**

`tests/asset-detail-frame.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  buildAssetDetailMoreGroups,
  buildCustodianHref,
  buildLocationRegisterHref,
  describeAssetAudit,
  describeAssetHolder,
  describeAssetWarranty,
  formatAssetDetailDate,
  getDisposalRequestOffer,
  listAssetDataGaps,
  withoutPhoneOnly,
  type AssetDataGap,
  type AssetHolderCell,
} from "../src/lib/asset-detail-frame-rules.ts"
import type { AssetOwnershipKind } from "../src/lib/asset-actions.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const now = new Date("2026-10-26T03:00:00Z") // 10:00 in Bangkok
const heldDays = (cell: AssetHolderCell) => (cell.kind === "custodian" ? cell.heldDays : undefined)

test("the first fact follows the ownership type, and ถือมาแล้ว counts Bangkok days from the open handover (spec §7.4)", () => {
  const base = { custodian: null, department: null, parent: null, seats: { used: null, total: null }, openCheckoutDate: null, now }
  const custodian = { id: "e1", code: "E001", fullNameTh: "สมชาย ใจดี", department: "ACC - ฝ่ายบัญชี" }
  assert.deepEqual(
    describeAssetHolder({ ...base, ownership: "personal", custodian, openCheckoutDate: new Date("2026-09-09T18:00:00Z") }),
    { kind: "custodian", employeeId: "e1", name: "สมชาย ใจดี", department: "ACC - ฝ่ายบัญชี", heldDays: 46 },
  )
  assert.equal(heldDays(describeAssetHolder({ ...base, ownership: "personal", custodian, openCheckoutDate: new Date("2026-10-25T16:59:00Z") })), 1, "23:59 yesterday in Bangkok")
  assert.equal(heldDays(describeAssetHolder({ ...base, ownership: "personal", custodian, openCheckoutDate: new Date("2026-10-25T17:00:00Z") })), 0, "00:00 today in Bangkok")
  assert.equal(heldDays(describeAssetHolder({ ...base, ownership: "personal", custodian })), null, "an imported custodian with no open handover has no count")
  assert.deepEqual(describeAssetHolder({ ...base, ownership: "personal" }), { kind: "noCustodian" })
  assert.deepEqual(describeAssetHolder({ ...base, ownership: "stock", department: "IT - ฝ่ายไอที" }), { kind: "department", label: "managing", department: "IT - ฝ่ายไอที" })
  assert.deepEqual(describeAssetHolder({ ...base, ownership: "shared", custodian }), { kind: "department", label: "using", department: null })
  const parent = { id: "p1", assetTag: "GRL-COM-26-0017", name: "Notebook Lenovo" }
  assert.deepEqual(describeAssetHolder({ ...base, ownership: "component", parent }), { kind: "parent", parent })
  assert.deepEqual(describeAssetHolder({ ...base, ownership: "component" }), { kind: "parent", parent: null })
  assert.deepEqual(describeAssetHolder({ ...base, ownership: "software_license", seats: { used: 2, total: 5 } }), { kind: "seats", used: 2, total: 5 })
  assert.deepEqual(describeAssetHolder({ ...base, ownership: "software_license" }), { kind: "seats", used: 0, total: null })
})

test("ตรวจนับล่าสุด: waiting in an open round first, else the latest result with its badge tone, else never (spec §7.4)", () => {
  const r1 = { id: "r1", auditNo: "AUD-2026-0003" }
  const r2 = { id: "r2", auditNo: "AUD-2026-0007" }
  const at = new Date("2026-10-12T10:05:00Z")
  assert.deepEqual(describeAssetAudit({ auditResult: "found", at, round: r1 }, { round: r2 }), { kind: "pending", round: r2 })
  assert.deepEqual(describeAssetAudit({ auditResult: "found", at, round: r1 }, null), { kind: "result", result: "found", labelKey: "found", tone: "success", at, round: r1 })
  const tones = ["confirmed_with_parent", "mismatch", "out_of_scope", "not_found", "legacy_code"].map((auditResult) => {
    const cell = describeAssetAudit({ auditResult, at, round: r1 }, null)
    return cell.kind === "result" ? [cell.labelKey, cell.tone] : null
  })
  // The round page's item badge tones (audit/rounds/[id]/page.tsx:364, R54).
  assert.deepEqual(tones, [["confirmedWithParent", "success"], ["mismatch", "muted"], ["outOfScope", "muted"], ["notFound", "danger"], [null, "muted"]])
  assert.deepEqual(describeAssetAudit(null, null), { kind: "never" })
})

test("ประกัน: until the end day, ended after it, unknown without a date, in Bangkok days (spec §7.4)", () => {
  assert.deepEqual(describeAssetWarranty(null, now), { kind: "unknown" })
  const later = new Date("2027-01-12T00:00:00Z")
  assert.deepEqual(describeAssetWarranty(later, now), { kind: "until", date: later })
  const today = new Date("2026-10-25T17:00:00Z") // 00:00 on 26 Oct in Bangkok
  assert.deepEqual(describeAssetWarranty(today, now), { kind: "until", date: today }, "the end day is still covered")
  const yesterday = new Date("2026-10-25T16:59:00Z") // 23:59 on 25 Oct in Bangkok
  assert.deepEqual(describeAssetWarranty(yesterday, now), { kind: "expired", date: yesterday })
})

test("a detail date: day, short month and year in Bangkok, Buddhist in Thai", () => {
  assert.equal(formatAssetDetailDate(new Date("2027-01-12T00:00:00Z"), "th"), "12 ม.ค. 2570")
  assert.equal(formatAssetDetailDate(new Date("2026-10-12T10:00:00Z"), "th"), "12 ต.ค. 2569")
  assert.equal(formatAssetDetailDate(new Date("2026-12-31T17:30:00Z"), "th"), "1 ม.ค. 2570", "already the new year in Bangkok")
  assert.equal(formatAssetDetailDate(new Date("2027-01-12T00:00:00Z"), "en"), "12 Jan 2027")
})

test("the fact strip's links: the employee page with employee:view, else the register by custodian; the register by location (spec §7.4)", () => {
  assert.equal(buildCustodianHref("th", "e 1", true), "/th/master-data/employees/e%201")
  assert.equal(buildCustodianHref("th", "e1", false), "/th/assets?custodianId=e1&exact=1")
  assert.equal(buildLocationRegisterHref("en", "loc/1"), "/en/assets?locationId=loc%2F1&exact=1")
})

test("ขอตัดจำหน่าย: offered when the status allows and nothing is open, unavailable with the API's first blocker (spec §7.1)", () => {
  const base = { canCreate: true, status: { name: "Ready" }, openDisposalId: null, blockers: [] }
  assert.deepEqual(getDisposalRequestOffer(base), { blocker: null })
  assert.deepEqual(getDisposalRequestOffer({ ...base, status: { name: "In Use" }, blockers: ["open_checkout", "operational_audit"] }), { blocker: "open_checkout" })
  assert.deepEqual(getDisposalRequestOffer({ ...base, status: { name: "Pending Disposal" } }), { blocker: null }, "a repair closed to Pending Disposal before anyone asked")
  for (const name of ["Pending Repair", "Under Maintenance", "Lost", "Missing", "Disposed", "Retired"]) assert.equal(getDisposalRequestOffer({ ...base, status: { name } }), null, name)
  assert.equal(getDisposalRequestOffer({ ...base, openDisposalId: "d1" }), null)
  assert.equal(getDisposalRequestOffer({ ...base, canCreate: false }), null)
})

test("อื่น ๆ: the other transactions, then the page's own items in the spec's order; the phone adds แก้ไข and พิมพ์ป้าย last (spec §7.1, §7.8; R21)", () => {
  const groups = buildAssetDetailMoreGroups({
    primaryKey: "checkin",
    // Task 1's transactions never hold the primary (R3).
    transactions: [
      { key: "checkout", label: "ส่งมอบ", href: null, enabled: false, reason: "ส่งมอบได้เมื่อสถานะเป็น พร้อมใช้งาน เท่านั้น" },
      { key: "transfer", label: "โอนย้าย", href: null, enabled: false, reason: "มีการส่งมอบค้างอยู่" },
    ],
    recordRepair: null,
    disposal: { label: "ขอตัดจำหน่าย", href: "/th/disposal/new?assetId=a1", reason: "ยังไม่ได้รับคืนจากผู้ถือครอง" },
    correctStatus: "แก้ไขสถานะ",
    cancelLatest: "ยกเลิกรายการล่าสุด",
    manageComponents: { label: "จัดการส่วนควบ", href: "/th/assets/a1/components" },
    clone: { label: "คัดลอกเป็นรายการใหม่", href: "/th/assets/new?cloneFrom=a1" },
    edit: { label: "แก้ไข", href: "/th/assets/a1/edit" },
    printLabel: { label: "พิมพ์ป้าย", href: "/th/assets/a1/label" },
  })
  assert.deepEqual(groups, [
    { key: "transactions", items: [
      { kind: "unavailable", key: "checkout", label: "ส่งมอบ", reason: "ส่งมอบได้เมื่อสถานะเป็น พร้อมใช้งาน เท่านั้น" },
      { kind: "unavailable", key: "transfer", label: "โอนย้าย", reason: "มีการส่งมอบค้างอยู่" },
    ] },
    { key: "asset", items: [
      { kind: "unavailable", key: "requestDisposal", label: "ขอตัดจำหน่าย", reason: "ยังไม่ได้รับคืนจากผู้ถือครอง" },
      { kind: "dialog", key: "correctStatus", label: "แก้ไขสถานะ" },
      { kind: "dialog", key: "cancelLatest", label: "ยกเลิกรายการล่าสุด" },
      { kind: "link", key: "manageComponents", label: "จัดการส่วนควบ", href: "/th/assets/a1/components" },
      { kind: "link", key: "clone", label: "คัดลอกเป็นรายการใหม่", href: "/th/assets/new?cloneFrom=a1" },
      { kind: "link", key: "edit", label: "แก้ไข", href: "/th/assets/a1/edit", phoneOnly: true },
      { kind: "link", key: "printLabel", label: "พิมพ์ป้าย", href: "/th/assets/a1/label", phoneOnly: true },
    ] },
  ])
  const desktop = withoutPhoneOnly(groups)
  assert.deepEqual(desktop[1].items.map((item) => item.key), ["requestDisposal", "correctStatus", "cancelLatest", "manageComponents", "clone"])
})

test("อื่น ๆ: an available transaction is a link before the unavailable ones, a page item never repeats the primary, the scan return's บันทึกซ่อม is a phone item, and an empty group is left out", () => {
  const groups = buildAssetDetailMoreGroups({
    primaryKey: "manageComponents",
    transactions: [
      { key: "checkin", label: "รับคืน", href: null, enabled: false, reason: "ไม่มีรายการส่งมอบให้รับคืน" },
      { key: "transfer", label: "ย้ายชิ้นส่วน", href: "/th/asset-management/transfer?assetId=a1", enabled: true, reason: null },
    ],
    // From the scan page the phone bar holds สแกนรายการถัดไป and the primary, so บันทึกซ่อม moves into the sheet (R21).
    recordRepair: { label: "บันทึกซ่อม", href: "/th/maintenance/new?assetId=a1" },
    disposal: null, correctStatus: null, cancelLatest: null,
    manageComponents: { label: "จัดการส่วนควบ", href: "/th/assets/a1/components" },
    clone: null, edit: null,
    printLabel: { label: "พิมพ์ป้าย", href: "/th/assets/a1/label" },
  })
  assert.deepEqual(groups.map((group) => [group.key, group.items.map((item) => `${item.kind}:${item.key}`)]), [
    ["transactions", ["link:transfer", "unavailable:checkin"]],
    ["asset", ["link:recordRepair", "link:printLabel"]],
  ])
  assert.equal(groups[1].items[0].kind === "link" && groups[1].items[0].phoneOnly, true, "the desktop pins บันทึกซ่อม in the header")
  assert.deepEqual(withoutPhoneOnly(groups).map((group) => group.key), ["transactions"], "a group left with only phone items goes on the desktop")
  const viewer = buildAssetDetailMoreGroups({ primaryKey: null, transactions: [], recordRepair: null, disposal: null, correctStatus: null, cancelLatest: null, manageComponents: null, clone: null, edit: null, printLabel: { label: "พิมพ์ป้าย", href: "/th/assets/a1/label" } })
  assert.deepEqual(withoutPhoneOnly(viewer), [], "a viewer's desktop has no อื่น ๆ")
})

test("ข้อมูลยังไม่ครบ: today's data-health items by ownership type, in their order, each with the place it is fixed (R59)", () => {
  const complete = { hasSerial: true, hasResponsibility: true, hasPrimaryPhoto: true, missingChecklistCount: 0, hasPurchaseDocument: true, hasWarrantyEnd: true, hasLicenseSeats: true }
  for (const ownership of ["personal", "shared", "stock", "component", "software_license"] as const) assert.deepEqual(listAssetDataGaps({ ownership, ...complete }), [], ownership)

  const bare = { hasSerial: false, hasResponsibility: false, hasPrimaryPhoto: false, missingChecklistCount: 2, hasPurchaseDocument: false, hasWarrantyEnd: false, hasLicenseSeats: false }
  const brief = (gaps: AssetDataGap[]) => gaps.map((gap) => [gap.key, gap.labelKey, gap.target, gap.anchor, gap.count ?? null])
  // The order of today's panel (P:744-759); the labels are the app's own words for each field.
  assert.deepEqual(brief(listAssetDataGaps({ ownership: "shared", ...bare })), [
    ["serial", "asset.serialNumber", "edit", "asset-serial-number", null],
    ["photo", "asset.primaryAssetPhoto", "files", null, null],
    ["checklist", "asset.dataHealthChecklistMissing", "files", null, 2],
    ["purchaseDocument", "asset.purchaseDocuments", "purchaseDocuments", null, null],
    ["responsibility", "assetDetail.usingDepartment", "edit", "asset-department", null],
    ["warranty", "asset.dataGapWarranty", "edit", "asset-warranty-end", null],
  ])
  // A licence has no photo or checklist (P:736-743); its key is the serial field, its expiry the warranty field.
  assert.deepEqual(brief(listAssetDataGaps({ ownership: "software_license", ...bare })), [
    ["licenseKey", "asset.licenseKey", "edit", "asset-serial-number", null],
    ["responsibility", "asset.licenseAssignee", "edit", "asset-custodian", null],
    ["licenseSeats", "asset.licenseTotalSeats", "edit", "asset-license-total-seats", null],
    ["purchaseDocument", "asset.purchaseDocuments", "purchaseDocuments", null, null],
    ["licenseExpiry", "asset.dataGapLicenseExpiry", "edit", "asset-warranty-end", null],
  ])
  // Who is responsible follows the ownership type (hasAssetResponsibility, src/lib/asset-ownership.ts), in the fact strip's words (R30).
  const responsibility = (ownership: AssetOwnershipKind) => listAssetDataGaps({ ownership, ...complete, hasResponsibility: false }).map((gap) => [gap.labelKey, gap.anchor])
  assert.deepEqual(responsibility("personal"), [["asset.custodian", "asset-custodian"]])
  assert.deepEqual(responsibility("stock"), [["assetDetail.managingDepartment", "asset-department"]])
  assert.deepEqual(responsibility("shared"), [["assetDetail.usingDepartment", "asset-department"]])
  assert.deepEqual(responsibility("component"), [["asset.parentAsset", null]])
  // A checklist with nothing missing, or a category without one, is complete.
  assert.deepEqual(listAssetDataGaps({ ownership: "personal", ...complete, missingChecklistCount: 0 }), [])
})

test("the frame reads one row or one count per question, in one round, with the API's own definitions (spec §5 Performance, §7.1)", () => {
  const source = read("src/lib/asset-detail-frame.ts")
  assert.match(source, /export async function getAssetDetailFrame\(assetId: string\): Promise<AssetDetailFrame>/)
  assert.equal(source.match(/await Promise\.all\(\[/g)?.length, 1)
  assert.match(source, /prisma\.assetCheckout\.findFirst\(\{\s*where: \{ assetId, isReturned: false, transactionStatus: "active" \}/)
  assert.match(source, /prisma\.maintenanceTicket\.findFirst\(\{\s*where: \{ assetId, \.\.\.openRepairRecordWhere \}/)
  // The disposal API's own "open request" (src/app/api/disposal-requests/route.ts:68-73).
  assert.match(source, /where: \{ assetId, isActive: true, requestStatus: \{ in: \["pending", "approved"\] \} \}/)
  assert.match(source, /where: \{ assetId, auditStatus: "pending", auditRound: \{ isActive: true, status: auditRoundOperationalWhere \} \}/)
  assert.match(source, /where: \{ assetId, auditResult: \{ not: null \}, auditRound: \{ isActive: true, status: auditRoundCoverageWhere \} \}/)
  assert.match(source, /select: disposalReadinessAssetSelect/)
  assert.match(source, /disposalBlockers: readiness \? getDisposalReadinessBlockersForAsset\(readiness\) : \[\]/)
  assert.doesNotMatch(source, /findMany\(|"use client"/)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/asset-detail-frame.test.ts`
Expected: FAIL: `../src/lib/asset-detail-frame-rules.ts` is not found.

- [ ] **Step 3: Implement the rules**

`src/lib/asset-detail-frame-rules.ts` (relative imports: `./waiting-work-rules.ts`, `./asset-register-view-memory.ts`, `./audit-round-result-filters.ts`, `./disposal-policy.ts`; `import type` from `./asset-actions.ts` and `./disposal-readiness.ts`):
- `describeAssetHolder`: personal → the custodian (`name` = `fullNameTh`, `heldDays` = `Math.max(0, bangkokDayDiff(openCheckoutDate, now))` when there is an open checkout date, else `null`), or `noCustodian`; stock → `managing`, shared → `using` (the department; a custodian is ignored); component → `parent`; software_license → `seats` with `used ?? 0`.
- `describeAssetAudit`: `pending` when `pending` is given; else the latest result: `labelKey` = `getAuditRoundItemResultLabelKey(result)`, `tone` found / confirmed_with_parent → `success`, not_found → `danger`, anything else (mismatch, out_of_scope, an unknown code) → `muted`, the round page's item badge (`audit/rounds/[id]/page.tsx:364`, R54); else `never`.
- `describeAssetWarranty`: `null` → `unknown`; `bangkokDayDiff(now, end) >= 0` → `until`, else `expired`.
- `formatAssetDetailDate`: `Intl.DateTimeFormat(locale === "th" ? "th-TH-u-ca-buddhist" : "en-GB", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" })`.
- `buildCustodianHref`: `/${locale}/master-data/employees/${encodeURIComponent(id)}` when `canViewEmployee`, else `buildExactAssetRegisterHref(locale, { custodianId })`. `buildLocationRegisterHref`: `buildExactAssetRegisterHref(locale, { locationId })`.
- `getDisposalRequestOffer` (R5): `null` without `canCreate`, with an open request, or when `getDisposalAssetEligibilityError(status)` is not null; else `{ blocker: blockers[0] ?? null }` (the API refuses on any blocker, `disposal-requests/route.ts:79-83`).
- `buildAssetDetailMoreGroups`: the transactions as Task 1 gives them (they never hold the primary, R3): the enabled ones that have an `href` as links (in their order), then the disabled ones as `unavailable` with their reason (an enabled one without `href` is left out). Then the page's items in this order, each only when given and never the primary's key (a component's primary may be `manageComponents`): `recordRepair` (`phoneOnly: true`; the page gives it only from the scan page, where the phone bar has no room for it, R21), `requestDisposal` (a link, or `unavailable` when it has a reason), `correctStatus` and `cancelLatest` (`dialog`), `manageComponents`, `clone`, `edit` (`phoneOnly: true`), `printLabel` (`phoneOnly: true`), so "แก้ไข" and "พิมพ์ป้าย" end the sheet (R21). A group without items is left out.
- `withoutPhoneOnly`: each group without its `phoneOnly` items; groups left empty are dropped.
- `listAssetDataGaps` (R59): today's data-health items (P:736-759), keeping only the ones not done, in today's order. Each item gets the label key and anchor the test pins.
  - A licence: licenseKey, responsibility, licenseSeats, purchaseDocument, licenseExpiry.
  - Anything else: serial, photo, checklist (with `count`, only when `missingChecklistCount > 0`), purchaseDocument, responsibility, warranty.
  - The responsibility label and anchor follow the ownership type: personal is `asset.custodian` / `asset-custodian`; stock is `assetDetail.managingDepartment` / `asset-department`; shared is `assetDetail.usingDepartment` / `asset-department`; component is `asset.parentAsset` with no anchor (the link is set from the parent's components manager, so the edit form opens at its top, as today); software_license is `asset.licenseAssignee` / `asset-custodian`.
  - The anchors are the edit form's field ids (`asset-form.tsx`: `asset-serial-number` :1081, `asset-department` :1150, `asset-custodian` :1162, `asset-license-total-seats` :1198, `asset-warranty-end` :1386). The rule builds no href: the page does (Task 8C).

- [ ] **Step 4: Implement the read**

`src/lib/asset-detail-frame.ts`: one `await Promise.all([...])` of seven reads, each a single `findFirst` / `findUnique` with a `select` of what the type needs, written with the `where` literals the test pins:
1. the open checkout (`isReturned: false, transactionStatus: "active"`, newest `checkoutDate` first; `id`, `checkoutDate`, `handoverMode`);
2. the open repair record (`openRepairRecordWhere`; `id`);
3. the open disposal request (`id`);
4. the pending audit item in an operational round (`auditRound: { select: { id, auditNo } }`);
5. the latest audit result (`orderBy: [{ lastScanAt: "desc" }, { updatedAt: "desc" }]`; `at` = `lastScanAt ?? updatedAt`);
6. the latest handover that is not voided (`where: { assetId, transactionStatus: "active" }`, newest `checkoutDate`; `id`, `documentNo`);
7. `prisma.asset.findUnique({ where: { id: assetId }, select: disposalReadinessAssetSelect })` as `readiness`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test tests/asset-detail-frame.test.ts && npx tsc --noEmit && npm run lint`
Expected: PASS, tsc clean, lint 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/asset-detail-frame-rules.ts src/lib/asset-detail-frame.ts tests/asset-detail-frame.test.ts
git commit -m "feat(assets): the asset page's frame rules (first fact, last audit, warranty, disposal offer, อื่น ๆ order, data gaps) and its one read (group 1 asset detail task 8B)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8C: The page frame and the overview

**P** below is `src/app/[locale]/(dashboard)/assets/[id]/page.tsx` (lines of master f6368e19; find spans by their quoted code).

**Amendments (controller):** R47: the overview's รูป card sizes `AssetPhotoFrame` through its `className` (`"aspect-[4/3] w-full"`, the board's box), because the frame fills its parent and has no height of its own; the empty, failed and photo states keep that box. R50: the overview's ความเคลื่อนไหวล่าสุด reads `getLatestAssetHistory(asset.id, locale, 3)` (Task 3), never `getAssetHistory`, so one overview load counts the history once (through `getAssetDetailCounts`).

**Files:**
- Modify: **P** (whole render and the reads it needs; master spans: imports 1-83; the reads 121-263; the evidence index 327-353; the evidence data 401-456; the action, follow-up, health, lifecycle, QR, evidence and activity blocks 692-925; the render 927-1618; `getOwnershipLifecycle`, `ActivitySummaryPanel`, `ActivitySummaryLink`, `QuickAction` 1622-1860; `SidebarPhotoCard` 2239-2289; `buildEvidenceItems` 2338-2352; `isPreviewableImage` 2381-2383; `getWarrantyStatusLabel` 2705-2713)
- Create:
  - `src/components/assets/detail/asset-detail-header.tsx` (server)
  - `src/components/assets/detail/asset-detail-actions.tsx` (client)
  - `src/components/assets/detail/asset-detail-fact-strip.tsx` (server)
  - `src/components/assets/detail/asset-overview.tsx` (server)
- Delete (no caller left): `src/components/assets/asset-detail-action-menu.tsx`, `src/components/ui/activity-drawer.tsx`, `src/components/assets/asset-evidence-drawer.tsx`, `src/components/assets/asset-qr-code.tsx`, `src/components/assets/asset-component-context-banner.tsx`
- Modify: `src/lib/asset-detail-format.ts:6-8,17-28` (delete `createHealthItem` and `getWarrantyState`; their only caller was P)
- Modify: `src/lib/asset-operation-policy.ts:44-106` (R6: delete `getAssetRegisterTransactionActions`, Task 1's comment above it, and the types and imports only it used; `buildAssetRegisterTransactionHref` and `getAssetOperationStatusError` stay)
- Modify: `src/lib/asset-detail-view.ts` (R23, Task 7's section map: `AssetDetailSectionId` drops `"specs"`, `"notes"` and `"ownership"` and gains `"purchase-documents"`; overview `["overview", "purchase"]`, components `["components", "handover"]`, files `["photos", "purchase-documents"]`)
- Modify: `src/components/assets/asset-form.tsx:1366` (wrap the purchase `Section` in `<div id="purchase" className="scroll-mt-24">`, the anchor of "บันทึกข้อมูลการซื้อ" and "เพิ่มข้อมูล"; `Section` itself is unchanged, so `tests/assets-sweep-ui.test.ts:136` and `tests/asset-forms-ui.test.ts:145` still pass)
- Modify: `src/components/ui/page-skeleton.tsx:15-16,43-48,197-225` (`meta="identity"`; `AssetDetailPageSkeleton`)
- Modify: `DESIGN.md`, two phrases found by their text (Page header :568, Loading skeletons :711)
- Modify: `messages/th.json`, `messages/en.json` (through `node scripts/messages-edit.mjs`)
- Test (new): `tests/asset-detail-page.test.ts`
- Test (rewritten pins, this task; the code they pin changes here):
  - `tests/asset-detail-ux.test.ts` (whole file)
  - `tests/asset-detail-anchor-layout.test.ts` (whole file)
  - `tests/asset-detail-data-boundaries.test.ts:45-58`
  - `tests/asset-photo-gallery.test.ts:23-42`
  - `tests/asset-register-transactions.test.ts:8-29` (the module type's `getAssetRegisterTransactionActions?` member), `:33-115`, `:140-153`, `:186-200` (deleted with the function, R6 and Task 1's note 10), `:179-184`; `:117-138` (hrefs) and `:155-177` (legacy return) stay
  - `tests/asset-return-navigation.test.ts:41-48`
  - `tests/asset-scan-return-navigation.test.ts:18-24`
  - `tests/asset-status-help-ui.test.ts:33-35` (the three `assetDetailSource()` asserts)
  - `tests/asset-transaction-cancellation-ui.test.ts:38-41`
  - `tests/asset-operation-status-policy.test.ts:98-107` (8A's version)
  - `tests/assets-sweep-ui.test.ts:13-25,70-83,99-133`
  - `tests/breadcrumbs-ui.test.ts:46-57`
  - `tests/dead-code-cleanup.test.ts` (one test added)
  - `tests/dropdown-menus-ui.test.ts:7-19`
  - `tests/e2e-fixes.test.ts:35-44` (FX2), `:79-91` (FX6, the detail lines)
  - `tests/mobile-action-bar.test.ts`, the K23 test "the four detail pages use ActionBar…" (the `assets/[id]` entry)
  - `tests/operations-sweep-ui.test.ts:24-38`
  - `tests/performance-route-instrumentation.test.ts:14-21`
  - `tests/phase2d-final-ui.test.ts:24-30`
  - `tests/visual-consistency-ui.test.ts:24-33`
  - `tests/page-loading-skeleton.test.ts:50,54,58-59`
  - `tests/dark-mode-p.test.ts:151,158`
  - `tests/sheet-drawers-ui.test.ts:32-45,62-82` (the drawers' tests go with the drawers)
  - `tests/asset-detail-format.test.ts:7,17-24` (`getWarrantyState` goes)
  - `tests/asset-detail-view.test.ts` (Task 7's version: the section-map test, the section-link test and the page-wiring test)
  - `tests/audit-component-scan-ui.test.ts:96` (a comment names the deleted menu; it now says `asset-detail-actions`)
- Pins that stay until a later task (the code they pin stays in **P** unchanged here):
  - Task 9 (history): `tests/e2e-fixes.test.ts:156-162` (FX10, the TR- link in the old timeline), `:183-196` (FX11, `knownMovementTypeKeys`); `tests/audit-item-status-labels.test.ts:76-79` (`formatAuditState`); `tests/assets-sweep-ui.test.ts:87-97` (the movement timeline); `tests/list-frame-guards.test.ts:163` (LV2 stays 4: two `"-"` in the relationship summaries, two in `getMovementSummary`; this task adds none)
  - Task 10 (components): `tests/asset-relationship-map-ui.test.ts:15-67`; `tests/asset-handover-presentation.test.ts:9-14` (the handover cards stay in the components tab until Tasks 10 and 11); the `AssetComponentsSummary` test of `tests/asset-detail-ux.test.ts` (kept as it is in the rewrite)
  - Task 12 (repair / PM): `tests/open-repair-filter.test.ts:20-25` (`maintenanceHref`, `maintenancePlanId`)
  - Tasks 9-12 (they drop the relations): `tests/asset-detail-data-boundaries.test.ts:32-43` (the page still applies every `loadPolicy.*Limit` to the old sections' relations)
  - Task 7 (unchanged here): `tests/asset-detail-data-boundaries.test.ts:7-30`, `tests/asset-detail-tabs.test.ts`, `tests/asset-detail-counts.test.ts`, the rest of `tests/asset-detail-view.test.ts`, `tests/asset-component-manager.test.ts`, and Task 7's tab-count test of `tests/asset-detail-ux.test.ts` (kept as it is in the rewrite)
  - Unchanged and still passing: `tests/e2e-fixes.test.ts:198-208` (FX12: the cancel block and `originalOperator: latestTransactionOperator,` stay in **P**), `tests/loading-boundaries.test.ts:6,40` (`loading.tsx` still renders `AssetDetailPageSkeleton`), the audit-label, component-summary, edit-page and eager-load tests of `tests/asset-detail-ux.test.ts`
  - Not this page: `tests/my-assets-detail.test.ts`, `tests/operational-return-navigation.test.ts:157`, `tests/list-pages-ui.test.ts:642`

**Interfaces:**
- Consumes:
  - Task 1 (R1-R4): `getAssetActions(input: AssetActionInput): AssetActionSet` (`{ primary: AssetPrimaryAction | null; transactions: AssetAction[] }`: the primary can always run now and has an `href`; `transactions` never repeat it), `getAssetRecordRepairAction(input: AssetActionInput): AssetPrimaryAction | null` (the pinned "บันทึกซ่อม": `maintenance:create`, any record the repair form can save, no `returnTo`), `type AssetActionInput` (`locale`, `assetId`, `statusName`, `ownership`, `custodianId`, `openCheckoutId`, `openCheckoutHandoverMode`, `openRepairId`, `openDisposalId`, `returnTo`, `can`; no `legacyReturnEligible`: the rule asks `isLegacyReturnEligible` and `getCheckinHandoverStatusError` itself), `type AssetOwnershipKind` (the page passes `normalizeAssetOwnershipType(asset.ownershipType)`, whose union is the same five values). `labelKey` / `reasonKey` are full message keys (`asset.quickIssueFromStock`, `asset.transactionReasonStatusNotReady`), read with `getTranslations()` (no namespace).
  - Task 2: `parseRegisterReturnTo(raw, locale)`, `buildRegisterCrumbLabel(params)` (`src/lib/asset-neighbours-rules.ts`); `getAssetNeighbours(params, assetId)` (`src/lib/asset-neighbours.ts`), whose `index` is the 1-based position ("3 / 24", R8); `buildExactAssetRegisterHref(locale, { locationId })` (R9); the message `asset.location` "ที่ตั้ง" (Task 2's chip word, reused as the fact's label).
  - Task 3: `getLatestAssetHistory(assetId: string, locale: string, take: number): Promise<AssetHistoryEvent[]>` (R50), `type AssetHistoryEvent` (`document: { code; href; kind: AssetMovementDocumentKind } | null`, every event with its href, R12); the messages `asset.history.columns.event | detail | document` (R14, R56).
  - Task 4: `AssetPhotoFrame({ attachmentId, alt, label, canUpload, uploadHref, previewable, className })` (R26; the overview leaves `previewable` at its default `true`, so the photo opens `AttachmentPreviewDialog`); `isThumbnailable` (`src/lib/attachment-thumbnail.ts:6`, R27).
  - Task 5: `FactStrip({ label, items, className })`, `type FactStripItem` (R18).
  - Task 6: `ActionBar`'s `more?: ActionBarMore` = `{ label: string; code: string; name?: string; groups: readonly RowActionGroup[]; openerRef?: RefObject<HTMLElement | null> }` (R20).
  - Task 7: `assetDetailViews`, `type AssetDetailView`, `resolveAssetDetailView(raw)`, `buildAssetDetailViewHref(locale, assetId, view, returnTo)`, `buildAssetDetailSectionHref(locale, assetId, currentView, sectionId, returnTo)` (`currentView` may be `null`), `isAssetDetailSectionVisible(view, sectionId)`, `getAssetDetailLoadPolicy(view)`; `getAssetDetailCounts(assetId)` (`src/lib/asset-detail-counts.ts`, R22), which Task 7 already reads in the `asset-detail.initial-data` round as `detailCounts` (its `history` is Task 3's `getAssetHistoryCounts` total, R11); `componentsManagerHref` and `photosHref` as Task 7 left them in **P** (the manager returns to `?view=components` with the detail's own `returnTo`, R22); the tab labels `asset.detailViews.<view>`; sections `movement` and `audit` show on history, `components` and `handover` on components, `photos` on files, `maintenance` on maintenance.
  - Task 8A: `AssetStatusCorrectionDialog`, `type AssetStatusCorrectionDialogHandle`, `type AssetStatusCorrectionLabels`.
  - Task 8B: every name it produces.
  - Existing: `TransactionCancelDialog` (`hideTrigger`, `returnFocusRef`, handle), `canCorrectAssetStatus`, `ASSET_MOVEMENT_DOCUMENT_PERMISSION`, `type AssetMovementDocumentKind`, `appendReturnTo`, `normalizeAssetReturnTo`, `parseModelSpecs`, `maskLicenseKey`, `PageHeader`, `PageBackLink`, `StatusBadge`, `AssetStateHelpPopover`, `KeyValueList`, `ContentPanel`, `ContentPanelRows`, `DataTable*`, `EmptyNote`, `DropdownMenu*` (`unavailable`, `DropdownMenuItemText`, `DropdownMenuItemDescription`), `buttonVariants`, `linkVariants`.
- Produces:
  - `AssetDetailHeader`, `type AssetDetailNeighbours = { position: number; total: number; previousHref: string | null; nextHref: string | null }` (`asset-detail-header.tsx`)
  - `AssetDetailActions`, `type AssetDetailActionLink = { key: string; label: string; href: string }` (`asset-detail-actions.tsx`)
  - `AssetDetailFactStrip` (`asset-detail-fact-strip.tsx`), `AssetOverview`, `type AssetOverviewDetails` (`asset-overview.tsx`)
  - For Tasks 9-12 (R25): **P** keeps the old sections its tab tasks replace, each under its `isAssetDetailSectionVisible(assetDetailView, …)` guard: `#movement` and `#audit` (history, Task 9), `#components` and `#handover` (components; the handover cards stay until Task 11 removes them), `#photos` and the interim `<section id="purchase-documents">` with today's `AssetPurchaseDocuments` (files, Task 11, whose "เอกสารจัดซื้อ" keeps the id, R23/R31), `#maintenance` (Task 12). `#ownership`, `#specs` and `#notes` are gone; `#overview` and `#purchase` live in the overview's "ข้อมูลทรัพย์สิน" (R23). `resolveAssetDetailView`'s `historyType` is read by Task 9.
  - For Task 9: the message `asset.history.columns.date` "วันที่" / "Date" (a date-only column head, added here beside Task 3's `columns.*`, R14).
  - For Task 13, the markup: `data-testid="asset-identity-summary"` on the meta row (code, status badge, S/N); the desktop "อื่น ๆ" button (text `อื่น ๆ`), the phone "การดำเนินการอื่น" (the bar's more button, Task 6); `data-asset-action={key}` on the primary, the pinned links and every desktop "อื่น ๆ" item, so the E2E can compare the keys with the register row's; the middle crumb's text `ผลค้นหา "<search>"` or "ผลการกรอง" (not a link, R10); the previous/next links named "รายการก่อนหน้า" / "รายการถัดไป" with the visible "3 / 24" and the hidden "รายการที่ 3 จาก 24" (R33); the back link "กลับไปผลค้นหา" when opened from the register (R33); `id="overview"` on "ข้อมูลทรัพย์สิน" (the "เอกสารจัดซื้อ" row's document numbers are in it, R31) and `id="purchase"` on its purchase rows (R23); the recent table's caption "ความเคลื่อนไหวล่าสุด"; the fact strip as the region "ข้อมูลสำคัญของทรัพย์สิน" (R19) with its values (custodian name or "ไม่มีผู้ถือครอง", R32; "แผนกที่ดูแล" / "แผนกที่ใช้", R30; location name; licence seats).

- [ ] **Step 1: Add the messages**

Write a change file outside the repo and run `node scripts/messages-edit.mjs <file>`.

In the `asset` namespace (R10, R14, R19):

| Key | th | en |
|---|---|---|
| `asset.registerCrumbSearch` | ผลค้นหา "{search}" | Search results for "{search}" |
| `asset.registerCrumbFilters` | ผลการกรอง | Filtered results |
| `asset.factStripLabel` | ข้อมูลสำคัญของทรัพย์สิน | Key facts |
| `asset.history.columns.date` | วันที่ | Date |
| `asset.dataGapsTitle` | ข้อมูลยังไม่ครบ {count} รายการ: | Missing details ({count}): |
| `asset.dataGapWarranty` | วันหมดประกัน | Warranty end date |
| `asset.dataGapLicenseExpiry` | วันหมดอายุ License | License expiry date |

The three `dataGap*` keys are R59's line. Its other labels reuse the app's own words, as Task 8B's rule names them: `asset.serialNumber`, `asset.licenseKey`, `asset.primaryAssetPhoto`, `asset.dataHealthChecklistMissing` ("รูปที่ต้องถ่ายขาด {count} รายการ"), `asset.purchaseDocuments`, `asset.custodian`, `asset.licenseAssignee`, `asset.parentAsset`, `asset.licenseTotalSeats`, `assetDetail.managingDepartment` and `assetDetail.usingDepartment`. `asset.warrantyEnd` "หมดประกัน" is not reused, because in a list of missing details it would read as "the warranty has ended".

The crumb's quotes are ASCII `"` (R10; ICU treats only `'` specially). A status tab counts as a filter (Task 2's `buildRegisterCrumbLabel`). `asset.history.columns.date` is the date-only head of the overview's recent table (the board's "วันที่"); Task 3's `columns.at` "วันที่ เวลา" heads the history tab, which shows the time too.

New namespace `assetDetail`:

| Key | th | en |
|---|---|---|
| `backToResults` | กลับไปผลค้นหา | Back to results |
| `neighbourNav` | รายการในผลค้นหา | Items in the results |
| `neighbourPrevious` | รายการก่อนหน้า | Previous item |
| `neighbourNext` | รายการถัดไป | Next item |
| `neighbourPosition` | {position} / {total} | {position} / {total} |
| `neighbourPositionLabel` | รายการที่ {position} จาก {total} | Item {position} of {total} |
| `serialPrefix` | S/N | S/N |
| `more` | อื่น ๆ | More |
| `moreActions` | การดำเนินการอื่น | More actions |
| `cancelLatest` | ยกเลิกรายการล่าสุด | Cancel the latest transaction |
| `requestDisposal` | ขอตัดจำหน่าย | Request disposal |
| `managingDepartment` | แผนกที่ดูแล | Managing department |
| `usingDepartment` | แผนกที่ใช้ | Using department |
| `componentOf` | เป็นส่วนควบของ | Component of |
| `seats` | ที่นั่ง | Seats |
| `heldFor` | ถือมาแล้ว {days} วัน | Held for {days} days |
| `lastAudit` | ตรวจนับล่าสุด | Last audit |
| `auditPendingIn` | รอตรวจในรอบ | Waiting in round |
| `auditNever` | ยังไม่เคยตรวจนับ | Never audited |
| `warranty` | ประกัน | Warranty |
| `warrantyUntil` | ถึง {date} | Until {date} |
| `warrantyEnded` | หมดแล้วเมื่อ {date} | Ended {date} |
| `warrantyUnknown` | ไม่ทราบ | Unknown |
| `addPurchaseDetails` | บันทึกข้อมูลการซื้อ | Add purchase details |
| `detailsTitle` | ข้อมูลทรัพย์สิน | Asset details |
| `ownerCompany` | บริษัทเจ้าของรหัส | Owner company |
| `brandModel` | ยี่ห้อ / รุ่น | Brand / model |
| `registeredAt` | ลงทะเบียน | Registered |
| `latestHandover` | ใบส่งมอบล่าสุด | Latest handover |
| `purchaseEmpty` | ยังไม่มีข้อมูลการซื้อ: ราคา ผู้ขาย วันหมดประกัน | No purchase details yet: price, supplier, warranty end |
| `purchaseAdd` | เพิ่มข้อมูล | Add details |
| `photoTitle` | รูป | Photo |
| `recentTitle` | ความเคลื่อนไหวล่าสุด | Recent activity |
| `recentAll` | ดูประวัติทั้งหมด {count} รายการ | View all {count} events |
| `recentEmpty` | ยังไม่มีความเคลื่อนไหว | No activity yet |
| `componentsTitle` | อุปกรณ์ส่วนควบ | Components |
| `componentsManage` | จัดการ | Manage |
| `componentsEmpty` | ไม่มีส่วนควบ | No components |
| `componentsMore` | ดูทั้งหมด {count} รายการ | View all {count} |

Reused as they are (one word for one thing, spec §5): `asset.title` "ทะเบียนทรัพย์สิน", `asset.custodian` "ผู้ถือครอง", `asset.noCustodian` "ไม่มีผู้ถือครอง" (no custodian in the fact strip, R32), `asset.location` "ที่ตั้ง" (Task 2's chip word, the fact's label), `asset.modelPhoto` "รูปประจำรุ่น" (the model photo's caption, R27), `asset.purchaseDocuments` "เอกสารจัดซื้อ" (the "ข้อมูลทรัพย์สิน" row, R31), `asset.history.columns.event | detail | document` "รายการ" / "รายละเอียด" / "เอกสาร" (Task 3, R14; "รายการ" heads the event's own label, as on the history tab, R56), `asset.licenseSeatSummary` "ใช้แล้ว {used}/{total} คงเหลือ {remaining}", `asset.licensePool`, `asset.category`, `asset.assetOwnerBranch` "สาขาเจ้าของรหัส", `asset.serialNumber`, `asset.licenseKey`, `asset.condition`, `asset.ownershipType` and `ownershipType_*`, `asset.department` "แผนก", `asset.homeLocation`, `asset.licenseAssignedAsset`, `asset.remark`, `asset.purchaseWarranty`, `asset.purchasePrice`, `asset.purchaseDate`, `asset.supplier`, `asset.warrantyStart`, `asset.warrantyEnd`, `asset.poNumber`, `asset.invoiceNumber`, `asset.fixedAssetCode`, `asset.printLabel` "พิมพ์ป้าย", `asset.quickMaintenance` "บันทึกซ่อม" (the label key of Task 1's `getAssetRecordRepairAction`), `asset.statusCorrectionButton` "แก้ไขสถานะ", `asset.manageComponents`, `asset.cloneAsset`, `asset.scanNext`, `asset.backToScan`, `brandModel.structuredSpecs`, `brandModel.specNotes`, `common.edit`, `common.back`, `common.actions`, `common.baht`, `auditRound.found | confirmedWithParent | notFound | mismatch | outOfScope` (the round page's words, R19), `disposalPage.readinessBlockers.*` (the disposal item's reason, R5).

Delete in both locales (their only reader was the code this task removes; run `grep -rn "<key>" src e2e` for each before the change file, and keep any key that still has a reader):
- `asset.activitySummaryTitle`, `activitySummaryHelp`, `activityFollowUp`, `activityLatestEvent`, `activityOpenHandover`, `activityOpenMaintenance`, `activityWarranty`, `activityDataHealth`, `activityAuditFinding`, `activityDrawerTitle`, `activityDrawerOpen` (not `activityIdle180d`: the register's filter)
- every `asset.dataHealth*` key except `dataHealthChecklistMissing` (21; R59's line reuses that one)
- `asset.quickActions`, `quickActionsHelp`, `quickActionsSoftwareHelp`, `quickActionsStockHelp`, `quickActionsSharedHelp`, `quickActionsComponentHelp`
- the `asset.quick*` action labels that `src/lib/asset-actions.ts` does not read (R2; on master their only reader is **P**): `quickCheckout`, `quickCheckin`, `quickTransfer`, `quickAudit`, `quickLatestDocument`, `quickAssignedDevice`, `quickAuditLicense`, `quickLicenseIssue`, `quickManageComponent`. `grep -n '"asset\.<key>"' src/lib/asset-actions.ts` for each first, and keep any key the rule names. The `asset.quickFilter*` keys are the register's and stay.
- `asset.lifecycle{Personal,Software,Stock,Shared,Component}{Title,Description}` (10; `getOwnershipLifecycle` goes, R2)
- `asset.stockStatus`, `stockAvailable`, `sharedStatus`, `sharedInstalled`, `assetAvailable`
- `asset.qrCode`, `qrCodeTitle`, `viewPhotoGallery`, `detailMoreActions`, `componentContextTitle`, `componentContextOpenParent` (`primaryAssetPhoto` stays: R59's line reads it)
- `asset.detailSections.overview`, `overviewSubtitle`, `ownershipSubtitle`, `specsSubtitle`, `purchaseSubtitle`, `notesSubtitle`, `evidence`

Kept on purpose: every key `src/lib/asset-actions.ts` reads (R2: `rowActionCheckout`, `rowActionCheckin`, `rowActionTransfer`, `quickIssueFromStock`, `quickTemporaryHandover`, `quickMoveStock`, `quickRelocateShared`, `quickMoveComponent`, `quickAssignLicense`, `quickRenewLicense`, `quickMaintenance`, `manageComponents`, `actionViewRepair`, `actionViewDisposal` and the `transactionReason*` reasons, as Task 1 lists them), and the `asset.evidence*` words (Task 11's "หลักฐานจากงานอื่น").

Glossary (`docs/19_THAI_GLOSSARY.md`, `tests/thai-glossary.test.ts`): "ที่ตั้ง" (never "อยู่ที่"), "บันทึกซ่อม" (never "แจ้งซ่อม"), "ผู้ถือครอง" in full ("ถือมาแล้ว" holds no "ผู้ถือ"), "แผนก" for a department everywhere (R30, never "หน่วยงาน"), "เอกสารจัดซื้อ" (R31, never "เอกสารการซื้อ" or "เอกสารซื้อ"), "ตรวจนับ", "ส่วนควบ", "ตัดจำหน่าย", "หมวดหมู่"; "S/N" and "License" are kept terms; no "ตรวจทาน"; no English word in a th value other than S/N.

Decision (R26, a deviation from spec §7.5's in-place camera input; the plan's decisions record it): the overview's photo panel offers a link to the files tab, "อัปโหลดรูป" from `md` and "ถ่ายรูป" below it (Task 4's frame draws both words); the camera input lives on the files tab (Task 11).

- [ ] **Step 2: Write the failing tests**

`tests/asset-detail-page.test.ts`:

```ts
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const page = () => read("src/app/[locale]/(dashboard)/assets/[id]/page.tsx")
const DETAIL = "src/components/assets/detail/"
const part = (name: string) => read(`${DETAIL}${name}.tsx`)

test("the page composes the parts and reads the frame in one round of parallel queries (spec §5 Performance, §7)", () => {
  const source = page()
  assert.match(source, /const registerParams = parseRegisterReturnTo\(rawSearchParams\.returnTo, locale\)/)
  assert.match(source, /const \{ view: assetDetailView \} = resolveAssetDetailView\(rawSearchParams\.view\)/)
  // Task 7 counts the tabs in the first round (detailCounts); the QR setting read is gone.
  assert.match(source, /const \[rawAsset, readyStatus, detailCounts\] = await withPerformanceTiming\(\s*"asset-detail\.initial-data",/)
  assert.match(source, /"asset-detail\.frame-data",\s*\(\) => Promise\.all\(\[\s*getAssetDetailFrame\(asset\.id\),\s*registerParams \? getAssetNeighbours\(registerParams, asset\.id\) : Promise\.resolve\(null\),\s*assetDetailView === "overview" \? getLatestAssetHistory\(asset\.id, locale, 3\) : Promise\.resolve\(null\),\s*\]\)/)
  assert.equal(source.match(/getAssetDetailCounts\(/g)?.length, 1, "the tab counts are read once, in Task 7's round")
  for (const name of ["AssetDetailHeader", "AssetDetailActions", "AssetDetailFactStrip", "AssetOverview"]) assert.match(source, new RegExp(`<${name}\\b`), name)
  assert.match(source, /className=\{assetDetailView === "overview" \? undefined : "max-md:hidden"\}/, "the strip on every desktop tab, on the phone's overview only (§7.4, R19)")
  assert.ok(source.indexOf("<AssetDetailTabs") < source.indexOf("<AssetDetailFactStrip"), "the strip sits under the tabs")
  assert.doesNotMatch(source, /AssetQrCode|buildAssetQrValue|assetQrPublicBaseUrlKey|AssetComponentContextBanner|AssetDetailActionMenu|SidebarPhotoCard|ActivitySummaryPanel|getOwnershipLifecycle|QuickAction|healthFixHref|evidenceDrawerItems|activityDrawerItems/)
})

test("the actions: the shared rule's primary and pinned บันทึกซ่อม, อื่น ๆ in the spec's order, the phone bar with its more slot (spec §7.1, §7.8)", () => {
  const source = page()
  // R1: the rule asks isLegacyReturnEligible and getCheckinHandoverStatusError itself from these two fields.
  assert.match(source, /custodianId: asset\.custodianId,\s*openCheckoutId: frame\.openCheckout\?\.id \?\? null,\s*openCheckoutHandoverMode: frame\.openCheckout\?\.handoverMode \?\? null,/)
  assert.match(source, /can: \{ assetEdit: canEditAsset, maintenanceCreate: canCreateMaintenance, maintenanceView: canViewMaintenance, disposalView: canViewDisposal \},/)
  assert.match(source, /const assetActions = getAssetActions\(actionInput\)/)
  assert.match(source, /const recordRepairAction = assetActions\.primary\?\.key === "recordRepair" \? null : getAssetRecordRepairAction\(actionInput\)/, "Task 1's one repair rule, never beside a primary that already says บันทึกซ่อม (R4)")
  assert.match(source, /recordRepair: isAssetScanReturn && recordRepair \? \{ label: recordRepair\.label, href: recordRepair\.href \} : null,/, "from the scan page บันทึกซ่อม moves into the sheet (R21)")
  assert.doesNotMatch(source, /isLegacyReturnEligible|legacyReturnEligible|canPinRepairRecord/)
  assert.match(source, /getDisposalRequestOffer\(\{ canCreate: canCreateDisposal, status: asset\.status, openDisposalId: frame\.openDisposalId, blockers: frame\.disposalBlockers \}\)/)
  assert.match(source, /reason: disposalOffer\.blocker \? tDisposal\(`readinessBlockers\.\$\{disposalOffer\.blocker\}`\) : null/)
  assert.match(source, /statusCorrection=\{statusCorrection\}/)
  const actions = part("asset-detail-actions")
  assert.match(actions, /^"use client"/)
  const desktop = actions.slice(actions.indexOf('<div className="hidden md:flex'), actions.indexOf("<ActionBar"))
  const order = ["<DropdownMenu", "{printLabel.label}", "{recordRepair.label}", "{primary.label}"].map((text) => desktop.indexOf(text))
  assert.ok(order.every((at, index) => at > -1 && (index === 0 || at > order[index - 1])), `DESIGN order: อื่น ๆ, the pinned links, the primary last (${order.join()})`)
  assert.match(desktop, /\{desktopGroups\.length > 0 \? \(/, "no อื่น ๆ when it would be empty (the viewer)")
  assert.match(desktop, /<DropdownMenuItem key=\{item\.key\} unavailable data-asset-action=\{item\.key\}>\s*<DropdownMenuItemText>\s*\{item\.label\}\s*<DropdownMenuItemDescription>\{item\.reason\}<\/DropdownMenuItemDescription>/)
  // R20, R21: everyone gets the bar (the viewer's holds only การดำเนินการอื่น, whose sheet has พิมพ์ป้าย); the sheet is titled with the code and name.
  assert.match(actions, /<ActionBar\s+label=\{tCommon\("actions"\)\}\s+actions=\{barActions\}\s+more=\{\{ label: t\("moreActions"\), code: asset\.assetTag, name: asset\.name, groups: phoneGroups, openerRef: moreTriggerRef \}\}\s*\/>/)
  assert.match(actions, /\.\.\.\(scanNext \? \[\{ \.\.\.scanNext, icon: <ScanLine className="h-4 w-4" \/>, primary: true \}\] : \[\]\),\s*\.\.\.\(primary \? \[\{ \.\.\.primary, primary: !scanNext \}\] : \[\]\),\s*\.\.\.\(recordRepair && !scanNext \? \[\{ \.\.\.recordRepair, icon: <Wrench className="h-4 w-4" \/> \}\] : \[\]\),/, "the rule's primary (wide) and บันทึกซ่อม; from the scan page สแกนรายการถัดไป (wide) and the primary (§7.8, R21)")
  assert.doesNotMatch(actions, /barActions\.length > 0|disabled[=:]|aria-disabled|fixed inset-0/)
})

test("the header: the trail with the search crumb as text, previous / next keeping returnTo, no edit button (spec §7.2; R8, R10)", () => {
  const source = page()
  assert.match(source, /const crumb = registerParams \? buildRegisterCrumbLabel\(registerParams\) : null/)
  assert.match(source, /crumbLabel=\{crumb \? \(crumb\.kind === "search" \? t\("registerCrumbSearch", \{ search: crumb\.text \}\) : t\("registerCrumbFilters"\)\) : null\}/)
  assert.match(source, /position: neighbours\.index,/, "Task 2's index is the 1-based position (R8)")
  assert.match(source, /previousHref: neighbours\.previousId \? appendReturnTo\(`\/\$\{locale\}\/assets\/\$\{encodeURIComponent\(neighbours\.previousId\)\}`, returnToHref\) : null,/)
  assert.match(source, /nextHref: neighbours\.nextId \? appendReturnTo\(`\/\$\{locale\}\/assets\/\$\{encodeURIComponent\(neighbours\.nextId\)\}`, returnToHref\) : null,/)
  const header = part("asset-detail-header")
  assert.match(header, /<nav aria-label=\{t\("neighbourNav"\)\}/)
  assert.match(header, /aria-label=\{t\("neighbourPrevious"\)\}[^>]*className=\{cn\(buttonVariants\(\{ variant: "outline", size: "icon" \}\), "max-md:hidden"\)\}/, "the phone shows only next (B-AssetDetail-Phone)")
  assert.match(header, /aria-label=\{t\("neighbourNext"\)\}/)
  assert.match(header, /<span aria-hidden="true" className="num px-1 text-meta text-muted-foreground">\{t\("neighbourPosition", \{ position, total \}\)\}<\/span>\s*<span className="sr-only">\{t\("neighbourPositionLabel", \{ position, total \}\)\}<\/span>/)
  assert.match(header, /actions=\{\s*<>\s*\{neighbours \? <AssetNeighbourNav neighbours=\{neighbours\} \/> : null\}\s*\{actions\}\s*<\/>\s*\}/, "previous / next right after the back link")
  assert.doesNotMatch(header, /hidden md:inline-flex|ArrowLeft|aria-current/)
})

test("the fact strip: four facts, each linking onward only for those who may open the page (spec §7.4; R18, R19, R30, R32)", () => {
  const strip = part("asset-detail-fact-strip")
  assert.match(strip, /<FactStrip label=\{tAsset\("factStripLabel"\)\} items=\{\[holderItem, locationItem, auditItem, warrantyItem\]\} className=\{className\} \/>/)
  assert.match(strip, /tAsset\("noCustodian"\)/, "one word for no custodian (R32)")
  assert.match(strip, /tAsset\("location"\)/)
  assert.match(strip, /t\("managingDepartment"\)/)
  assert.match(strip, /t\("usingDepartment"\)/)
  assert.match(strip, /buildCustodianHref\(locale, holder\.employeeId, canViewEmployee\)/)
  assert.match(strip, /buildLocationRegisterHref\(locale, location\.id\)/)
  assert.match(strip, /t\("heldFor", \{ days: formatCount\(holder\.heldDays\) \}\)/)
  assert.match(strip, /<StatusBadge label=\{audit\.labelKey \? tAudit\(audit\.labelKey\) : audit\.result\} tone=\{audit\.tone\} \/>/, "a result is a badge: status colour lives in badges (DESIGN.md Where Color Lives)")
  assert.match(strip, /canViewAudit \? \(/)
  assert.match(strip, /purchaseEditHref \? \(/, "บันทึกข้อมูลการซื้อ only with asset:edit")
  assert.doesNotMatch(strip, /text-(?:success|warning|danger)\b|"-"/)
})

test("the overview: the photo first on the phone, ข้อมูลทรัพย์สิน with id overview, the latest three events, the components (spec §7.5)", () => {
  const overview = part("asset-overview")
  assert.match(overview, /<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">\s*<div className="min-w-0 lg:col-span-4 lg:col-start-9 lg:row-start-1">/)
  assert.match(overview, /<div id="overview" className="min-w-0 scroll-mt-24 lg:col-span-8 lg:col-start-1 lg:row-start-1">/)
  // R26, R27, R47: Task 4's frame (previewable by default) in the board's 4:3 box, the model photo captioned with the app's one word.
  assert.match(overview, /<AssetPhotoFrame\s+attachmentId=\{photo\.attachmentId\}\s+alt=\{photo\.alt\}\s+label=\{photo\.isModelPhoto \? tAsset\("modelPhoto"\) : undefined\}\s+canUpload=\{canEdit\}\s+uploadHref=\{photo\.uploadHref\}\s+className="aspect-\[4\/3\] w-full"\s*\/>/)
  assert.doesNotMatch(overview, /\/api\/attachments|<img\b|inline=1/, "the photo loads through the card-size thumbnail (§7.5)")
  assert.match(overview, /<StatusBadge label=\{details\.condition\.nameTh\} tone=\{getAssetStateTone\(details\.condition\.name\)\} \/>\s*<AssetStateHelpPopover \{\.\.\.conditionHelp\} \/>/)
  assert.match(overview, /\{ key: "remark", label: tAsset\("remark"\), value: details\.remark \}/)
  // R23: the reports' warranty link lands on the purchase rows; R31: the row is เอกสารจัดซื้อ.
  assert.match(overview, /<div id="purchase" className="scroll-mt-24">\s*<h3\b/)
  assert.match(overview, /label: tAsset\("purchaseDocuments"\)/)
  assert.match(overview, /href=\{details\.purchase\.documentsHref\}/, "each purchase document number links to the files tab's เอกสารจัดซื้อ")
  assert.match(overview, /<DataTable framed=\{false\} className="hidden md:block" caption=\{t\("recentTitle"\)\}>/)
  for (const column of ["date", "event", "detail", "document"]) assert.match(overview, new RegExp(`tAsset\\("history\\.columns\\.${column}"\\)`), column)
  assert.match(overview, /<ContentPanelRows className="md:hidden">/)
  assert.match(overview, /t\("recentAll", \{ count: formatCount\(recent\.total\) \}\)/)
  // R12: a document shows, linked, only to those who may open it; otherwise no link and no code (the dashboard's rule).
  assert.match(overview, /event\.document && documentAccess\[event\.document\.kind\] \? \(/)
  assert.doesNotMatch(overview, /as AssetMovementDocumentKind/)
  assert.match(overview, /tAll\(event\.labelKey\)/)
  // Every write control needs asset:edit; the viewer E2E (roles.spec.ts) finds none.
  assert.match(overview, /actions=\{canEdit \? \(\s*<Link href=\{editHref\}/)
  // R55 (spec §7.5): with no purchase facts, only asset:edit reads the prompt and เพิ่มข้อมูล; everyone else reads the empty rows.
  assert.match(overview, /\{purchaseRows\.length > 0 \|\| !canEdit \? \(\s*<KeyValueList items=\{purchaseRows\.length > 0 \? purchaseRows : emptyPurchaseRows\} \/>\s*\) : \(\s*<>\s*<EmptyNote>\{t\("purchaseEmpty"\)\}<\/EmptyNote>\s*<Link href=\{purchaseEditHref\}/)
  for (const key of ["purchasePrice", "purchaseDate", "supplier", "warrantyEnd"]) assert.match(overview, new RegExp(`\\{ key: "${key}", label: tAsset\\("${key}"\\), value: <Nil \\/> \\}`), key)
  assert.match(overview, /components\.manageHref \? \(/)
  assert.equal(overview.match(/<ContentPanel divided\b/g)?.length, 4)
  assert.equal(overview.match(/<KeyValueList\b/g)?.length, 3, "the facts, the specs and the purchase rows: one list per group")
  assert.doesNotMatch(overview, /"-"|toLocaleString|text-(?:success|warning|danger)\b|border-dashed|bg-\w+-soft/)
})

test("ข้อมูลยังไม่ครบ: one quiet line on the overview, for asset:edit only, each gap a link to where it is fixed (R59)", () => {
  const source = page()
  assert.match(source, /const dataGaps = canEditAsset\s*\?\s*listAssetDataGaps\(\{/)
  assert.match(source, /missingChecklistCount: getMissingPhotoChecklistLabels\(photoChecklist, assetAttachments\)\.length,/)
  assert.match(source, /hasResponsibility: hasAssetResponsibility\(asset\),/)
  assert.match(source, /const dataGapHref = \(gap: AssetDataGap\) =>/)
  const overview = part("asset-overview")
  assert.match(overview, /\{dataGaps\.length > 0 \? \(\s*<Notice tone="neutral" data-slot="asset-data-gaps">/)
  assert.match(overview, /tAsset\("dataGapsTitle", \{ count: formatCount\(dataGaps\.length\) \}\)/)
  assert.match(overview, /<Link href=\{gap\.href\} className=\{linkVariants\(\{ size: "inherit" \}\)\}>\{gap\.label\}<\/Link>/)
  const th = JSON.parse(read("messages/th.json")), en = JSON.parse(read("messages/en.json"))
  assert.deepEqual([th.asset.dataGapsTitle, th.asset.dataGapWarranty, th.asset.dataGapLicenseExpiry], ["ข้อมูลยังไม่ครบ {count} รายการ:", "วันหมดประกัน", "วันหมดอายุ License"])
  assert.deepEqual([en.asset.dataGapsTitle, en.asset.dataGapWarranty, en.asset.dataGapLicenseExpiry], ["Missing details ({count}):", "Warranty end date", "License expiry date"])
  // The rule's other labels are the app's own words (Task 8B), kept on purpose.
  assert.equal(th.asset.dataHealthChecklistMissing, "รูปที่ต้องถ่ายขาด {count} รายการ")
  assert.equal(typeof th.asset.primaryAssetPhoto, "string")
})

test("the edit form holds the purchase anchor the strip and the prompt open (spec §7.4)", () => {
  assert.match(read("src/components/assets/asset-form.tsx"), /<div id="purchase" className="scroll-mt-24">\s*<Section title=\{t\("purchaseWarranty"\)\}>/)
  assert.match(page(), /const purchaseEditHref = `\$\{editHref\}#purchase`/)
})

test("the files tab keeps today's purchase documents under the anchor ข้อมูลทรัพย์สิน links, until Task 11", () => {
  const source = page()
  assert.match(source, /\{isAssetDetailSectionVisible\(assetDetailView, "purchase-documents"\) \? \(\s*<section id="purchase-documents" className=\{cn\(getPanelClasses\(\), "scroll-mt-24 p-4 sm:p-5"\)\}>\s*<AssetPurchaseDocuments documents=\{purchaseDocuments\} legacyAttachments=\{legacyPurchaseDocuments\} \/>/)
  assert.match(source, /documentsHref: sectionHref\("purchase-documents"\)/)
})

test("the words of the asset page (spec §7, docs/19_THAI_GLOSSARY.md; R10, R19, R27, R30-R33)", () => {
  const th = JSON.parse(read("messages/th.json")), en = JSON.parse(read("messages/en.json"))
  const thai: Record<string, string> = {
    backToResults: "กลับไปผลค้นหา", neighbourPrevious: "รายการก่อนหน้า", neighbourNext: "รายการถัดไป", more: "อื่น ๆ", moreActions: "การดำเนินการอื่น",
    cancelLatest: "ยกเลิกรายการล่าสุด", requestDisposal: "ขอตัดจำหน่าย", managingDepartment: "แผนกที่ดูแล", usingDepartment: "แผนกที่ใช้",
    componentOf: "เป็นส่วนควบของ", seats: "ที่นั่ง", heldFor: "ถือมาแล้ว {days} วัน", lastAudit: "ตรวจนับล่าสุด", auditNever: "ยังไม่เคยตรวจนับ", warrantyUntil: "ถึง {date}",
    warrantyEnded: "หมดแล้วเมื่อ {date}", warrantyUnknown: "ไม่ทราบ", addPurchaseDetails: "บันทึกข้อมูลการซื้อ", detailsTitle: "ข้อมูลทรัพย์สิน",
    ownerCompany: "บริษัทเจ้าของรหัส", brandModel: "ยี่ห้อ / รุ่น", latestHandover: "ใบส่งมอบล่าสุด", purchaseEmpty: "ยังไม่มีข้อมูลการซื้อ: ราคา ผู้ขาย วันหมดประกัน",
    purchaseAdd: "เพิ่มข้อมูล", photoTitle: "รูป", recentTitle: "ความเคลื่อนไหวล่าสุด", recentAll: "ดูประวัติทั้งหมด {count} รายการ",
    componentsTitle: "อุปกรณ์ส่วนควบ", componentsManage: "จัดการ", componentsEmpty: "ไม่มีส่วนควบ",
  }
  for (const [key, value] of Object.entries(thai)) assert.equal(th.assetDetail[key], value, `th assetDetail.${key}`)
  for (const key of Object.keys(th.assetDetail)) assert.equal(typeof en.assetDetail[key], "string", `en assetDetail.${key}`)
  for (const key of ["crumbSearch", "crumbFilters", "factsLabel", "noCustodianYet", "location", "purchaseDocumentsRow", "modelPhotoLabel", "columnDate"]) assert.equal(th.assetDetail[key], undefined, `assetDetail.${key}: one word for one thing`)
  assert.equal(th.asset.registerCrumbSearch, 'ผลค้นหา "{search}"')
  assert.equal(en.asset.registerCrumbSearch, 'Search results for "{search}"')
  assert.deepEqual([th.asset.registerCrumbFilters, en.asset.registerCrumbFilters], ["ผลการกรอง", "Filtered results"])
  assert.deepEqual([th.asset.factStripLabel, en.asset.factStripLabel], ["ข้อมูลสำคัญของทรัพย์สิน", "Key facts"])
  assert.deepEqual([th.asset.history.columns.date, en.asset.history.columns.date], ["วันที่", "Date"])
  assert.equal(th.asset.noCustodian, "ไม่มีผู้ถือครอง")
  assert.equal(th.asset.modelPhoto, "รูปประจำรุ่น")
  assert.equal(th.asset.purchaseDocuments, "เอกสารจัดซื้อ")
  assert.equal(th.asset.quickMaintenance, "บันทึกซ่อม", "the pinned repair link's name (repair-record.spec.ts:102)")
  for (const key of ["activitySummaryTitle", "dataHealthTitle", "quickActions", "quickCheckout", "quickAudit", "lifecyclePersonalTitle", "qrCode", "qrCodeTitle", "detailMoreActions", "componentContextTitle"]) assert.equal(th.asset[key], undefined, `asset.${key} is gone`)
  for (const key of ["quickIssueFromStock", "quickMoveStock", "quickAssignLicense"]) assert.equal(typeof th.asset[key], "string", `asset.${key}: the shared rule reads it (R2)`)
  assert.equal(typeof th.asset.activityIdle180d, "string", "the register's idle filter keeps its word")
})

test("the skeleton has the page's shape: the trail and the identity line, five tabs, the four facts, the 8 + 4 grid (DESIGN.md Loading skeletons)", () => {
  const source = read("src/components/ui/page-skeleton.tsx")
  const detail = source.slice(source.indexOf("export function AssetDetailPageSkeleton()"), source.indexOf("export function ReportsPageSkeleton()"))
  assert.match(detail, /<PageHeaderSkeleton crumbs meta="identity" \/>/)
  assert.match(detail, /<TabNavSkeleton count=\{5\} \/>/)
  assert.match(detail, /<MetricGridSkeleton count=\{4\} foot \/>/)
  assert.deepEqual([...detail.matchAll(/<DividedPanelSkeleton rows=\{(\d+)\} className="([^"]+)" \/>/g)].map((match) => `${match[1]} ${match[2]}`), [
    "2 lg:col-span-4 lg:col-start-9 lg:row-start-1",
    "6 lg:col-span-8 lg:col-start-1 lg:row-start-1",
    "3 lg:col-span-8",
    "3 lg:col-span-4",
  ])
  assert.doesNotMatch(detail, /280px|count=\{6\}|meta="badges"/)
  assert.match(source, /meta\?: "text" \| "identity" \| "none"/)
  assert.ok(!existsSync("src/components/assets/asset-detail-action-menu.tsx"))
})
```

Rewrite the pins named in **Files**:

- `tests/asset-detail-ux.test.ts`, whole file (the read helper becomes `const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")`, `assetDetailSource = () => read(page)`, `const DETAIL = "src/components/assets/detail/"`). Kept unchanged: `"asset detail localizes audit activity and avoids duplicated activity titles"`, `"asset detail exposes a read-only component summary and manager link"`, `"asset edit does not mount another component installation editor"`, `"asset detail avoids eager component inventory and bounds preview relations"`, and Task 7's `"asset detail tabs count history, components, files and repairs, and warn on a missing component serial"` (its `detailCounts.*` indicators and the absent `componentRelationshipCount` hold after this task). Task 7's `"asset detail makes component management discoverable from the components tab and More"` reads the deleted `asset-detail-action-menu.tsx` and becomes the component-management test below. The others become:
  ```ts
  test("asset detail renders one tab navigation; the overview tab is canvas B and the other tabs keep their sections until their tasks (group 1 asset detail task 8)", () => {
    const source = assetDetailSource()
    assert.match(source, /<AssetDetailTabs\b/)
    assert.match(source, /\{assetDetailView === "overview" \? \(\s*<AssetOverview\b/)
    assert.match(source, /isAssetDetailSectionVisible\(assetDetailView, "components"\)/)
    assert.doesNotMatch(source, /isAssetDetailSectionVisible\(assetDetailView, "(?:overview|specs|ownership|purchase|notes)"\)|sectionLinks\.map/)
  })

  test("asset detail asks the shared action rule and builds อื่น ๆ from it (spec §7.1)", () => {
    const source = assetDetailSource()
    assert.match(source, /hasPermission\(user, "asset", "edit"\)/)
    assert.match(source, /const actionInput: AssetActionInput = \{/)
    assert.match(source, /returnTo: currentAssetDetailHref,/)
    assert.match(source, /const assetActions = getAssetActions\(actionInput\)/)
    assert.match(source, /const moreGroups = buildAssetDetailMoreGroups\(\{/)
    assert.match(source, /label: tAll\(action\.labelKey\)/, "full message keys through the root translator (R2)")
    assert.doesNotMatch(source, /mobileActionCandidates|getAssetRegisterTransactionActions/)
  })

  test("asset detail's back link says where it returns (spec §7.2)", () => {
    assert.match(assetDetailSource(), /backLabel=\{isAssetScanReturn \? t\("backToScan"\) : registerParams \? tDetail\("backToResults"\) : tCommon\("back"\)\}/)
  })

  test("asset detail's meta row is the code, the status badge with its help and the S/N, with the identity test id; location and custodian are facts of the strip (spec §7.2, §7.4)", () => {
    const header = read(`${DETAIL}asset-detail-header.tsx`)
    assert.match(header, /<span data-testid="asset-identity-summary" className="contents">\s*<span className="tag">\{asset\.assetTag\}<\/span>/)
    assert.match(header, /<StatusBadge label=\{asset\.status\.nameTh\} tone=\{getAssetStateTone\(asset\.status\.name\)\} \/>/)
    assert.match(header, /\{t\("serialPrefix"\)\} <span className="tag">\{asset\.serialNumber\}<\/span>/)
    assert.doesNotMatch(header, /condition|MapPin|PackageCheck|<SummaryCard/)
  })

  test("asset detail has no follow-up panel, data health, quick actions or QR panel: their places are the primary, the tab counts, the strip and the empty prompts (spec §7.9)", () => {
    const source = assetDetailSource()
    assert.doesNotMatch(source, /activityFollowUpItems|asset-data-health-details|dataHealthItems|t\("quickActions"\)|lifecycle\.|qrValue/)
  })

  test("asset detail reaches component management from the components tab and อื่น ๆ (spec §7.1, §7.7)", () => {
    const source = assetDetailSource()
    const thaiMessages = JSON.parse(read("messages/th.json"))
    const englishMessages = JSON.parse(read("messages/en.json"))
    assert.match(source, /manageHref=\{componentsManagerHref\}/)
    assert.match(source, /manageComponents: canEditAsset \? \{ label: t\("manageComponents"\), href: componentsManagerHref \} : null,/)
    // componentsManagerHref is Task 7's (the manager returns to ?view=components with the detail's own returnTo, R22), pinned in tests/asset-detail-view.test.ts.
    assert.deepEqual(thaiMessages.asset.detailViews, { label: "ส่วนของทรัพย์สิน", overview: "ภาพรวม", history: "ประวัติ", components: "ส่วนควบ", files: "ไฟล์", maintenance: "ซ่อม / PM" })
    assert.deepEqual(englishMessages.asset.detailViews, { label: "Asset sections", overview: "Overview", history: "History", components: "Components", files: "Files", maintenance: "Repair / PM" })
  })

  test("a component names its parent in the strip's first fact, not in a banner (spec §7.4, §7.9)", () => {
    const source = assetDetailSource()
    assert.doesNotMatch(source, /AssetComponentContextBanner/)
    assert.match(source, /parent: installedInLinksForPanel\[0\]\?\.parentAsset \?\? null,/)
    assert.match(source, /parentHref=\{installedInLinksForPanel\[0\]\?\.parentHref \?\? null\}/)
    assert.match(read(`${DETAIL}asset-detail-fact-strip.tsx`), /t\("componentOf"\)/)
  })

  test("asset component parent links preserve context", () => {
    const source = assetDetailSource()
    const summarySource = read("src/components/assets/asset-components-summary.tsx")
    assert.match(source, /const currentAssetDetailHref = buildAssetDetailViewHref\(locale, asset\.id, assetDetailView, returnToHref\)/)
    assert.match(source, /parentHref: appendReturnTo\(`\/\$\{locale\}\/assets\/\$\{component\.parentAsset\.id\}`, currentAssetDetailHref\)/)
    assert.match(source, /href: link\.parentHref/)
    assert.match(summarySource, /parentHref: string/)
    assert.match(summarySource, /roleLabel: string/)
    assert.match(summarySource, /slotLabel: string/)
  })

  test("asset detail header is PageHeader with the trail, the name, the back link and the actions; the old sections keep their shared parts (spec §7.2; spec 2B §4.4.5)", () => {
    const source = assetDetailSource()
    const header = read(`${DETAIL}asset-detail-header.tsx`)
    assert.match(header, /import \{ PageBackLink, PageHeader \} from "@\/components\/ui\/page-header"/)
    assert.match(header, /breadcrumbs=\{\[\s*\{ label: tAsset\("title"\), href: returnToHref \},\s*\.\.\.\(crumbLabel \? \[\{ label: crumbLabel \}\] : \[\]\),\s*\{ label: asset\.assetTag, code: true \},\s*\]\}\s*title=\{asset\.name\}/)
    assert.match(header, /back=\{<PageBackLink href=\{returnToHref\} label=\{backLabel\} \/>\}/)
    assert.doesNotMatch(source + header, /<h1\b|<thead\b|<Breadcrumbs\b|<ArrowLeft\b|formatCurrency|function (?:Info|SummaryStrip)\b|opacity-70|hidden md:inline-flex/)
    assert.match(source, /<div className=\{`space-y-6 \$\{actionBarPagePadding\.single\}`\}>/, "room for the ActionBar (2C plan 5, O11)")
    assert.equal(source.match(/<DataTable framed=\{false\} caption=/g)?.length, 2, "the repair and audit tables, until Tasks 9 and 12")
    assert.match(source, /tone=\{getRepairRecordStatusTone\(ticket\.repairStatus\)\}/)
    assert.equal(source.match(/<StatStrip\b/g)?.length, 2)
    assert.equal(source.match(/<KeyValueList\b/g)?.length, 3, "the two handover cards and the movement snapshot, until Tasks 9-11")
  })
  ```
- `tests/asset-detail-anchor-layout.test.ts`, whole file:
  ```ts
  test("the remark is a row of ข้อมูลทรัพย์สิน, which keeps the overview and purchase anchors; the repair and audit sections keep their ids until their tabs are rebuilt (group 1 asset detail task 8, R23)", () => {
    const source = read("src/app/[locale]/(dashboard)/assets/[id]/page.tsx")
    const overview = read("src/components/assets/detail/asset-overview.tsx")
    assert.doesNotMatch(source, /<section id="(?:overview|specs|ownership|purchase|notes)"/)
    assert.match(overview, /<div id="overview" className="min-w-0 scroll-mt-24/)
    assert.match(overview, /<div id="purchase" className="scroll-mt-24">/, "the reports' warranty link lands on the purchase rows")
    assert.match(overview, /\{ key: "remark", label: tAsset\("remark"\), value: details\.remark \}/)
    assert.notEqual(source.indexOf('<section id="maintenance"'), -1)
    assert.notEqual(source.indexOf('<section id="audit"'), -1)
    assert.match(source, /isAssetDetailSectionVisible\(assetDetailView, "maintenance"\)/)
    assert.match(source, /isAssetDetailSectionVisible\(assetDetailView, "audit"\)/)
    assert.doesNotMatch(source, /sectionLinks\.map/)
  })
  ```
- `tests/asset-detail-data-boundaries.test.ts:45-58`, the test named `"the handover evidence keeps its complete checkout index; the drawer's repair, finding and disposal evidence queries are gone (group 1 asset detail task 8)"`:
  ```ts
  assert.match(source, /asset-detail\.evidence-references/)
  assert.match(source, /prisma\.assetCheckout\.findMany\([\s\S]*?select: \{ id: true, checkins: \{ select: \{ id: true \} \} \}/)
  assert.match(source, /evidenceCheckoutReferences\.flatMap\(\(checkout\) => checkout\.checkins\.map/)
  assert.doesNotMatch(source, /evidenceMaintenanceTicketIds|evidenceAuditFindingIds|evidenceDisposalRequestIds|module: "maintenance"|module: "audit_finding"|module: "disposal"/)
  ```
- `tests/asset-photo-gallery.test.ts:23-42` (import `existsSync`):
  ```ts
  test("the overview's photo is the card-size frame of the newest image the thumbnail route renders: no sidebar card (spec §7.5, R27)", () => {
    const source = read("src/app/[locale]/(dashboard)/assets/[id]/page.tsx")
    assert.doesNotMatch(source, /function SidebarPhotoCard|fetchPriority="high"|isPreviewableImage/)
    assert.match(source, /const primaryAssetPhoto = assetAttachments\.find\(\(attachment\) => isThumbnailable\(attachment\.fileType\)\)/, "รูปหลัก: the newest thumbnailable module asset image (Task 11's tiles use the same rule)")
    assert.match(source, /const primaryModelPhoto = modelPhotos\.find\(\(attachment\) => isThumbnailable\(attachment\.fileType\)\)/, "HEIC and SVG are documents, never the frame's image")
    assert.match(source, /attachmentId: primaryAssetPhoto\?\.id \?\? primaryModelPhoto\?\.id \?\? null,/)
    assert.match(source, /isModelPhoto: !primaryAssetPhoto && Boolean\(primaryModelPhoto\),/)
  })

  test("no evidence drawer: the files tab shows the evidence (spec §7.7, §7.9)", () => {
    const source = read("src/app/[locale]/(dashboard)/assets/[id]/page.tsx")
    assert.equal(existsSync("src/components/assets/asset-evidence-drawer.tsx"), false)
    assert.doesNotMatch(source, /evidenceDrawerItems|allEvidenceItems|<section id="evidence"|<SummaryPill/)
  })
  ```
- `tests/asset-register-transactions.test.ts` (R6; Task 1's note 10):
  - `:179-184`, the test named `"the asset page asks the shared action rule, and the register's old helper is gone (spec §7.1)"`: `assert.match(source, /getAssetActions\(actionInput\)/)`, `assert.doesNotMatch(source, /getAssetRegisterTransactionActions|getOwnershipLifecycle|disabled: !activeCheckout/)` and `assert.equal("getAssetRegisterTransactionActions" in operationPolicy, false)`.
  - Delete the tests at `:33-97` and `:99-115` (the old helper's actions and its viewer case; `tests/asset-actions.test.ts` covers them on the rule), `:140-153` (the permanent-handover return) and, in the test at `:186`, its first part `:187-200` (the old helper's transfer cases). That test keeps Task 1's rule pin (`"transactionReasonOpenCheckout"` in `src/lib/asset-actions.ts`) and the two message lines, renamed `"the open handover's transfer reason lives in the shared rule and keeps its words (user decision 2026-10-21 Y2)"`.
  - `:8-29`: the module type loses its `getAssetRegisterTransactionActions?` member; `buildAssetRegisterTransactionHref?` stays for `:117-138`. `:155-177` (legacy return) stays as it is.
- `tests/asset-return-navigation.test.ts:41-48`, same name:
  ```ts
  const source = read page; const header = readFileSync("src/components/assets/detail/asset-detail-header.tsx", "utf8")
  assert.match(source, /searchParams: Promise<\{ returnTo\?: string \| string\[\]; view\?: string \| string\[\] \}>/)
  assert.match(source, /normalizeAssetReturnTo\(locale, rawSearchParams\.returnTo\)/)
  assert.match(source, /parseRegisterReturnTo\(rawSearchParams\.returnTo, locale\)/, "the raw returnTo tells 'opened directly' from 'the plain register' (§7.2)")
  assert.match(header, /<PageBackLink href=\{returnToHref\}/)
  assert.match(source, /appendReturnTo\(`\/\$\{locale\}\/assets\/\$\{asset\.id\}\/edit`, returnToHref\)/)
  ```
- `tests/asset-scan-return-navigation.test.ts:18-24`, same name:
  ```ts
  assert.match(source, /const isAssetScanReturn = returnToHref === scanReturnHref/)
  assert.match(source, /scanNext=\{isAssetScanReturn \? \{ key: "scanNext", label: t\("scanNext"\), href: scanReturnHref \} : null\}/)
  assert.match(readFileSync("src/components/assets/detail/asset-detail-actions.tsx", "utf8"), /<ScanLine className="h-4 w-4" \/>/)
  ```
- `tests/asset-status-help-ui.test.ts`, the test named `"asset form, detail, and register expose status and condition help"`, its three `assetDetailSource()` asserts (:33-35): the page keeps `assetStatusHelp` and `assetConditionHelp` (:34-35 stay); the `AssetStateHelpPopover` one (:33) becomes two reads of the parts (the file has no `read` helper): `assert.match(readFileSync("src/components/assets/detail/asset-detail-header.tsx", "utf8"), /<AssetStateHelpPopover \{\.\.\.statusHelp\} \/>/)` and `assert.match(readFileSync("src/components/assets/detail/asset-overview.tsx", "utf8"), /<AssetStateHelpPopover \{\.\.\.conditionHelp\} \/>/)`.
- `tests/asset-transaction-cancellation-ui.test.ts:38-41`: the file read becomes `src/components/assets/detail/asset-detail-actions.tsx`; the regex `/<TransactionCancelDialog ref=\{cancelDialogRef\}/` stays. The page entry of the loop still matches `cancelTransaction={` and `transactionStatus === "active"` (the cancel block stays in **P**, passed to `AssetDetailActions`).
- `tests/asset-operation-status-policy.test.ts:98-107` (8A's version): the page assertions become `assert.match(pageSource, /canCorrectAssetStatus\(asset\.status\)/)` and `assert.match(pageSource, /statusCorrection=\{statusCorrection\}/)`; add `assert.match(readFileSync("src/components/assets/detail/asset-detail-actions.tsx", "utf8"), /<AssetStatusCorrectionDialog ref=\{correctionDialogRef\} hideTrigger returnFocusRef=\{returnFocusRef\}/)`; the dialog-file lines stay.
- `tests/assets-sweep-ui.test.ts`: delete the tests `"activity drawer: …"` (:13-18), `"QR code: …"` (:20-25) and `"evidence drawer: …"` (:99-107); in the test `"components summary and context banner: …"` (:70-84) delete its five `banner` lines (`const banner = read(…)` through the banner's `assert.doesNotMatch`, :79-83; the closing `})` stays) and rename it `"components summary: a ContentPanel, codes as tag, text links, a warning StatusBadge and EmptyNote (spec 2D D7, D9, M33)"`. The page test `"asset page: panels, notices, chips, text links, the disabled QuickAction (M12) and no typed dash (M32 b) on the shared parts …"` (:111-133) becomes `"asset page: the sections the later tabs replace keep the panel classes; the overview's panels are ContentPanels in the detail parts (spec 2D §3.3; group 1 asset detail task 8)"`:
  ```ts
  const source = read(`${D}assets/[id]/page.tsx`)
  assert.equal(source.match(/className=\{cn\(getPanelClasses\(\), "scroll-mt-24 p-4 sm:p-5"\)\}/g)?.length, 5, "handover, movement, maintenance, audit and the files tab's purchase documents")
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 1, "the relationship map")
  assert.match(source, /<Notice tone="warning" className="mb-4">\n\s+\{t\("maintenanceReplacementWarning"\)\}\n\s+<\/Notice>/)
  assert.match(source, /<Notice tone="neutral" className="mt-4">\{noteLabel\}<\/Notice>/)
  assert.match(source, /<Chip>\{t\("latestTransaction"\)\}<\/Chip>/)
  assert.match(source, /<Chip>\{t\("maintenancePmBadge"\)\}<\/Chip>/)
  assert.match(source, /<Chip>\{roleLabel\}<\/Chip>/)
  assert.equal(source.match(/className=\{buttonVariants\(\{ variant: "outline", size: "sm" \}\)\}/g)?.length, 4)
  assert.match(source, /<Link href=\{`\/\$\{locale\}\/maintenance\/\$\{ticket\.id\}`\} className=\{linkVariants\(\{ size: "inherit" \}\)\}>/)
  assert.match(source, /return labels\.parentAssets\.get\(checkout\.parentAssetId\) \?\? checkout\.parentAssetId\n\s+return null\n\}/)
  assert.match(source, /if \(!snapshot\) return null\n/)
  assert.equal(source.match(/filterLabel: tCommon\("filter"\),/g)?.length, 1, "the movement timeline's; the evidence drawer's went")
  assert.match(source, /<div className="font-mono text-sm font-medium leading-5 text-foreground \[overflow-wrap:anywhere\]">\{relationshipAsset\.assetTag\}<\/div>/)
  const banned = /\b(?:bg|text|border)-(?:amber|emerald)-\d|border-dashed|uppercase|rounded-full (?:bg|px)-|bg-surface\/\d|primary-soft|info-soft|warning-soft|hover:underline|hover:bg-accent|font-semibold leading-5|focus:outline-none|scale-\[|return "-"|\bh-8\b|md:h-10|text-lg|text-info|\btext-xs\b|toLocaleString/
  for (const file of [source, ...["asset-detail-header", "asset-detail-actions", "asset-detail-fact-strip", "asset-overview"].map((name) => read(`${C}assets/detail/${name}.tsx`))]) assert.doesNotMatch(file, banned)
  ```
- `tests/breadcrumbs-ui.test.ts:46-57`: the `lastCode` entry `"assets/[id]/page.tsx": "asset.assetTag"` becomes `"src/components/assets/detail/asset-detail-header.tsx": "asset.assetTag"`, and the lookup reads `sites.find((candidate) => candidate.path === (file.startsWith("src/") ? file : base + file))` (the same in its `assert.ok` message). The site count stays 11 and the code count 8: the trail moved, it was not added, and its spread middle crumb holds no `code`.
- `tests/dead-code-cleanup.test.ts`, one test added:
  ```ts
  test("the asset page's drawers, QR panel, parent banner, old ⋯ menu and data-health helpers are gone (group 1 asset detail task 8)", () => {
    for (const path of [`${C}ui/activity-drawer.tsx`, `${C}assets/asset-evidence-drawer.tsx`, `${C}assets/asset-qr-code.tsx`, `${C}assets/asset-component-context-banner.tsx`, `${C}assets/asset-detail-action-menu.tsx`]) assert.equal(existsSync(path), false, path)
    for (const name of ["createHealthItem", "getWarrantyState"]) assert.equal(name in assetDetailFormat, false, name)
  })
  ```
- `tests/dropdown-menus-ui.test.ts:7-19`, the test named `"asset detail's อื่น ๆ owns its dialogs outside the menu and returns focus to whatever opened them"`:
  ```ts
  const menu = read("src/components/assets/detail/asset-detail-actions.tsx")
  assert.match(menu, /<DropdownMenu modal=\{false\}>/)
  assert.match(menu, /onCloseAutoFocus=\{\(event\) => \{[\s\S]*?openingDialogRef\.current/)
  assert.equal(menu.match(/returnFocusRef=\{returnFocusRef\}/g)?.length, 2)
  assert.match(menu, /<\/DropdownMenu>[\s\S]*<ActionBar\b[\s\S]*\{cancelTransaction \? \(?\s*<TransactionCancelDialog/)
  assert.doesNotMatch(menu, /fixed inset-0|children/)
  const page = read("src/app/[locale]/(dashboard)/assets/[id]/page.tsx")
  assert.match(page, /<AssetDetailActions\b[\s\S]*?\/>/)
  assert.doesNotMatch(page, /<\/AssetDetailActions>/)
  ```
- `tests/e2e-fixes.test.ts:35-44` (FX2; import `existsSync`), the test named `"the asset page's QR code left the overview: พิมพ์ป้าย opens the label page that holds it (e2e fix task FX2: TX-A2, AR2, M6; group 1 asset detail task 8)"`: `assert.equal(existsSync("src/components/assets/asset-qr-code.tsx"), false)`, `assert.doesNotMatch(read(P), /AssetQrCode|buildAssetQrValue/)`, `assert.equal(messages("th").asset.qrCodeTitle, undefined)`, `assert.match(read("src/components/assets/detail/asset-detail-actions.tsx"), /<Link href=\{printLabel\.href\}/)`, and the three `test.fail` marker checks as they are. `:79-91` (FX6): the two `detail` lines become `assert.doesNotMatch(detail, /healthFixHref|createHealthItem/)` and `assert.match(read("src/components/assets/detail/asset-overview.tsx"), /actions=\{canEdit \? \(\s*<Link href=\{editHref\}/)`; the register and rounds lines stay.
- `tests/mobile-action-bar.test.ts`, the K23 test `"the four detail pages use ActionBar with its page padding, and the two old bars are gone (K23, O11)"` and the comment above it (:42-68 on master; Task 6's two new tests sit above them): the comment says the asset page's bar lives in its client part (group 1). The `pages` entry `"assets/[id]"` keeps its root regex; the loop's import and `<ActionBar` checks run over `maintenance/[id]`, `disposal/[id]` and `audit/rounds/[id]` only, and the asset page gets its own lines:
  ```ts
  const asset = pages["assets/[id]"][0]
  assert.match(asset, /^import \{ actionBarPagePadding \} from "@\/components\/ui\/action-bar"$/m)
  const assetActions = readFileSync("src/components/assets/detail/asset-detail-actions.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(assetActions, /^import \{ ActionBar, type ActionBarLink \} from "@\/components\/ui\/action-bar"$/m)
  assert.match(assetActions, /<ActionBar\s+label=\{tCommon\("actions"\)\}/)
  assert.doesNotMatch(asset + assetActions, /MobileActionBar|\bpb-(?:24|36)\b/)
  ```
- `tests/operations-sweep-ui.test.ts:24-38`, the test named `"asset page: a link to a section another tab shows opens that tab (wiki 43, spec 2D §3.4; group 1 asset detail task 8)"`:
  ```ts
  assert.match(source, /import \{ buildAssetDetailSectionHref, buildAssetDetailViewHref, isAssetDetailSectionVisible, resolveAssetDetailView, type AssetDetailSectionId \} from "@\/lib\/asset-detail-view"/)
  assert.match(source, /const sectionHref = \(sectionId: AssetDetailSectionId\) => buildAssetDetailSectionHref\(locale, asset\.id, assetDetailView, sectionId, returnToHref\)/)
  assert.match(source, /const photosHref = sectionHref\("photos"\)/)
  assert.match(source, /uploadHref: photosHref,/, "the overview's upload link opens the files tab (R26)")
  assert.match(source, /documentsHref: sectionHref\("purchase-documents"\)/)
  assert.doesNotMatch(source, /["`]#(?:ownership|components|handover|movement|maintenance|audit|photos|purchase-documents)["`]|\bstatusHref\b/)
  ```
- `tests/performance-route-instrumentation.test.ts:14-21`: the asset page's labels become `["asset-detail.initial-data", "asset-detail.frame-data", "asset-detail.evidence-data", "asset-detail.operation-data"]`.
- `tests/phase2d-final-ui.test.ts:24-30`: the callers become `[`${C}assets/asset-form.tsx`, 2]`, `[`${C}assets/asset-register-filter-sheet.tsx`, 2]`, `[`${C}assets/detail/asset-detail-header.tsx`, 1]` (the status), `[`${C}assets/detail/asset-overview.tsx`, 1]` (the condition, in ข้อมูลทรัพย์สิน), `[`${C}assets/asset-register-table.tsx`, 1]`; the comment names "the asset page's header and its ข้อมูลทรัพย์สิน".
- `tests/visual-consistency-ui.test.ts:24-33`: the loop runs over `myAssets` and `myAssetDetail` only; the asset page's lines become `assert.match(header, /import \{ StatusBadge \} from "@\/components\/ui\/status-badge"/)`, `assert.match(header, /tone=\{getAssetStateTone\(asset\.status\.name\)\}/)`, `assert.match(overview, /tone=\{getAssetStateTone\(details\.condition\.name\)\}/)` and `assert.doesNotMatch(header + overview, /status-pill|function StatusPill|function StatusBadge/)` (`header`, `overview` = the two parts).
- `tests/page-loading-skeleton.test.ts:50` → `assert.match(source, /<PageHeaderSkeleton crumbs meta="identity" \/>/, "the asset page: crumbs, then the code, the status badge and the S/N")`; `:54` → `assert.match(source, /<MetricGridSkeleton count=\{4\} foot \/>/)`; `:58-59` keep the `h-24 w-24` check (the new shape is pinned in `tests/asset-detail-page.test.ts`).
- `tests/dark-mode-p.test.ts:151,158` (R29): from Task 4's 20 images / 16 stages to 18 / 14. Two of each go here (`SidebarPhotoCard`'s `<img>` at P:2262 and the evidence drawer's at `asset-evidence-drawer.tsx:125`); the overview's photo is Task 4's frame and adds none. The comment at :157 says "the 14 images".
- `tests/sheet-drawers-ui.test.ts`: delete four tests whole, each with its comment through its closing `})` (their files are gone; `tests/dead-code-cleanup.test.ts` pins the deletion): `"activity and evidence drawers are Radix sheets that can be opened from outside"` (:32-41), `"evidence drawer keeps its wide panel"` (:43-45), `"the evidence drawer uses the sheet header, its description and EmptyNote when a filter is empty (2C batch 4)"` (:62-71) and `"the activity drawer uses the sheet header and X, and EmptyNote for an empty list (2C batch 4)"` (:73-82).
- `tests/asset-detail-format.test.ts`: drop `getWarrantyState` from the import (:7) and delete its test (:17-24).
- `tests/asset-detail-view.test.ts` (Task 7's whole-file version; R23):
  - The section-map test becomes `"each section belongs to exactly one tab: ข้อมูลทรัพย์สิน keeps the overview and purchase anchors, the files tab holds the interim purchase documents (group 1 asset detail task 8)"`:
    ```ts
    assert.deepEqual(getAssetDetailViewSectionIds("overview"), ["overview", "purchase"])
    assert.deepEqual(getAssetDetailViewSectionIds("history"), ["movement", "audit"])
    assert.deepEqual(getAssetDetailViewSectionIds("components"), ["components", "handover"])
    assert.deepEqual(getAssetDetailViewSectionIds("files"), ["photos", "purchase-documents"])
    assert.deepEqual(getAssetDetailViewSectionIds("maintenance"), ["maintenance"])
    const all = assetDetailViews.flatMap((view) => getAssetDetailViewSectionIds(view))
    assert.deepEqual([...all].sort(), ["audit", "components", "handover", "maintenance", "movement", "overview", "photos", "purchase", "purchase-documents"])
    ```
    and its four `isAssetDetailSectionVisible` lines as Task 7 wrote them.
  - The section-link test: the `ownership` assertion becomes `assert.equal(buildAssetDetailSectionHref("th", "asset id/1", "overview", "handover", "/th/assets?status=ready"), "/th/assets/asset%20id%2F1?view=components&returnTo=%2Fth%2Fassets%3Fstatus%3Dready#handover")`, and it gains `assert.equal(buildAssetDetailSectionHref("th", "a1", "files", "purchase-documents"), "#purchase-documents")` and `assert.equal(buildAssetDetailSectionHref("th", "a1", "overview", "purchase-documents", "/th/assets"), "/th/assets/a1?view=files&returnTo=%2Fth%2Fassets#purchase-documents")`. The `#purchase` lines stay (the reports' warranty link, R23).
  - The page-wiring test: `const \[rawAsset, qrBaseUrlSetting, readyStatus, detailCounts\]` becomes `const \[rawAsset, readyStatus, detailCounts\]` (the QR setting read goes); the `photosHref` count, `function SidebarPhotoCard(…)`, `href={galleryHref}` and `galleryHref={photosHref}` lines become `assert.match(page, /uploadHref: photosHref,/)` and `assert.doesNotMatch(page, /SidebarPhotoCard|galleryHref/)`; its other lines stay.
- `tests/audit-component-scan-ui.test.ts:96`: the comment's "(as asset-detail-action-menu)" becomes "(as asset-detail-actions)".

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test tests/asset-detail-page.test.ts tests/asset-detail-ux.test.ts tests/asset-detail-anchor-layout.test.ts tests/asset-detail-data-boundaries.test.ts tests/asset-photo-gallery.test.ts tests/asset-register-transactions.test.ts tests/asset-return-navigation.test.ts tests/asset-scan-return-navigation.test.ts tests/asset-status-help-ui.test.ts tests/asset-transaction-cancellation-ui.test.ts tests/asset-operation-status-policy.test.ts tests/assets-sweep-ui.test.ts tests/breadcrumbs-ui.test.ts tests/dead-code-cleanup.test.ts tests/dropdown-menus-ui.test.ts tests/e2e-fixes.test.ts tests/mobile-action-bar.test.ts tests/operations-sweep-ui.test.ts tests/performance-route-instrumentation.test.ts tests/phase2d-final-ui.test.ts tests/visual-consistency-ui.test.ts tests/page-loading-skeleton.test.ts tests/dark-mode-p.test.ts tests/asset-detail-format.test.ts tests/asset-detail-view.test.ts`
Expected: FAIL. The `detail/` parts do not exist, the page still renders the old header, quick actions and side column, the deleted files still exist, and the skeleton has the old shape.

- [ ] **Step 4: Build the parts**

Read `node_modules/next/dist/docs/` for server and client component props of this Next version first. All four parts use tokens only (no hex, no `dark:`, no `/NN` tints, no shadow).

`asset-detail-header.tsx` (server, no directive; `useTranslations("assetDetail")` and `useTranslations("asset")` as `Breadcrumbs` does):
- Props: `{ asset: { assetTag: string; name: string; serialNumber: string | null; status: { name: string; nameTh: string } }; returnToHref: string; backLabel: string; crumbLabel: string | null; neighbours: AssetDetailNeighbours | null; statusHelp: { title: string; description: string; items: string[] }; actions: ReactNode }`.
- `PageHeader` with the `breadcrumbs` literal as pinned (the middle crumb is text with no `href`, R10: the first crumb already returns to `returnToHref`, spec §7.2), `title={asset.name}`, the meta as pinned (the test-id span wraps the tag, the status badge with `AssetStateHelpPopover {...statusHelp}`, and "S/N" with the serial in `tag` when `serialNumber` is set), `back={<PageBackLink href={returnToHref} label={backLabel} />}`, and `actions` = the neighbour nav (when given) then `actions`, as pinned.
- `AssetNeighbourNav` (local): the `<nav>` as pinned; the two links are `outline` `icon` buttons (44px below md, 36px from md) with `ChevronLeft` / `ChevronRight` (`aria-hidden`), `aria-label` and `title` ("รายการก่อนหน้า" / "รายการถัดไป", R33); the previous link is `max-md:hidden` (R35); each link renders only when its href is set (spec §7.2: the first item has no previous link, the last no next link; no disabled stand-in), while the visible "k / N" and its sr-only label always show while `neighbours` is given; `position` and `total` go through `formatCount`. The links keep `returnTo` unchanged (R8), so a neighbour opens on its overview with the same trail.

`asset-detail-actions.tsx` (client; the header's client part, which renders the fixed `ActionBar`, R35):
- Props: `{ asset: { assetTag: string; name: string }; primary: AssetDetailActionLink | null; printLabel: AssetDetailActionLink; recordRepair: AssetDetailActionLink | null; scanNext: AssetDetailActionLink | null; groups: AssetDetailMoreGroup[]; cancelTransaction?: TransactionCancelDialogProps; statusCorrection: { assetId: string; readyStatusId: string; labels: AssetStatusCorrectionLabels } | null }` (`asset` titles the phone sheet, R20).
- Refs: `menuTriggerRef`, `moreTriggerRef` (handed to Task 6's sheet), `returnFocusRef` (set to the opener just before a dialog opens, so focus returns to "อื่น ๆ" or to "การดำเนินการอื่น"), `openingDialogRef` (today's `onCloseAutoFocus` guard), `cancelDialogRef`, `correctionDialogRef`.
- `const desktopGroups = withoutPhoneOnly(groups)`.
- The desktop group `<div className="hidden md:flex md:flex-wrap md:items-center md:gap-2">` (the header's action buttons hide below `md`, R21), in DOM order:
  1. when `desktopGroups.length > 0`: `DropdownMenu modal={false}` whose trigger is `<Button ref={menuTriggerRef} variant="outline" size="md">{t("more")}<ChevronDown aria-hidden="true" /></Button>`; `DropdownMenuContent align="end" className="w-72"` with today's `onCloseAutoFocus`; the groups split by `DropdownMenuSeparator`. A `link` item is `<DropdownMenuItem key={item.key} asChild data-asset-action={item.key}><Link href={item.href}>{item.label}</Link></DropdownMenuItem>`; an `unavailable` item is the pinned `unavailable` item with its reason; a `dialog` item is `<DropdownMenuItem key={item.key} data-asset-action={item.key} variant={item.key === "cancelLatest" ? "destructive" : undefined} onSelect={…}>` whose handler sets `openingDialogRef.current = true` and opens the dialog with `menuTriggerRef.current` as the opener;
  2. `<Link href={printLabel.href} data-asset-action={printLabel.key} className={buttonVariants({ variant: "outline", size: "md" })}>` with `Printer` and `{printLabel.label}`;
  3. when `recordRepair`: the same look with `Wrench` and `{recordRepair.label}`;
  4. when `primary`: `<Link href={primary.href} data-asset-action={primary.key} className={buttonVariants({ size: "md" })}>{primary.label}</Link>` (last, K8).
- `const barActions: ActionBarLink[]`, written as pinned (R21): the scan-next link (`primary: true`, `ScanLine`), then the rule's primary (`primary: !scanNext`, so it is the wide one unless สแกนรายการถัดไป is), then `recordRepair` (`Wrench`) only without `scanNext` (from the scan page it is the sheet's phone-only item, which the page put in `groups`). `phoneGroups: RowActionGroup[]` maps each group's items: `link` → `{ kind: "link", key, label, href }`, `unavailable` → `{ kind: "unavailable", key, label, reason }`, `dialog` → `{ kind: "action", key, label, onSelect, destructive: key === "cancelLatest" }` opening the dialog with `moreTriggerRef.current` as the opener.
- `<ActionBar label={tCommon("actions")} actions={barActions} more={{ label: t("moreActions"), code: asset.assetTag, name: asset.name, groups: phoneGroups, openerRef: moreTriggerRef }} />`, always (R21: everyone gets the bar; "พิมพ์ป้าย" is in every sheet, so the viewer's bar holds only "การดำเนินการอื่น"). `code` and `name` title the sheet as the register's phone sheet does (R20).
- After the bar, outside both menus: `{cancelTransaction ? <TransactionCancelDialog ref={cancelDialogRef} hideTrigger returnFocusRef={returnFocusRef} {...cancelTransaction} /> : null}` and `{statusCorrection ? <AssetStatusCorrectionDialog ref={correctionDialogRef} hideTrigger returnFocusRef={returnFocusRef} {...statusCorrection} /> : null}`.

`asset-detail-fact-strip.tsx` (server; `useTranslations("assetDetail")`, `useTranslations("asset")`, `useTranslations("auditRound")` as `tAudit`):
- Props: `{ locale: string; holder: AssetHolderCell; location: { id: string; name: string; branchName: string | null; parentName: string | null }; audit: AssetAuditCell; warranty: AssetWarrantyCell; parentHref: string | null; canViewEmployee: boolean; canViewAudit: boolean; purchaseEditHref: string | null; className?: string }`.
- Builds `holderItem`, `locationItem`, `auditItem`, `warrantyItem` (each a `FactStripItem`) and renders the pinned `FactStrip` with `label={tAsset("factStripLabel")}` (the region "ข้อมูลสำคัญของทรัพย์สิน", R19) and the caller's `className` (R18, R19: the page passes `"max-md:hidden"` on every tab but the overview). The strip has no tone: status colour is the audit result's `StatusBadge` (R19). Stand-alone links use `cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")`; a code inside a sub-line uses `linkVariants({ size: "inherit" })` and `tag`.
  - holder: `custodian` → label `tAsset("custodian")`, value the name linked to `buildCustodianHref(…)`, sub `[department, heldDays !== null ? t("heldFor", …) : null]` joined with " · " (none when both are empty; the department is the custodian's own, R35); `noCustodian` → the same label and `tAsset("noCustodian")` "ไม่มีผู้ถือครอง" (R32); `department` → `t("managingDepartment")` "แผนกที่ดูแล" / `t("usingDepartment")` "แผนกที่ใช้" (R30) and the department or `<Nil />`; `parent` → `t("componentOf")` and the parent's `tag` and name linked to `parentHref`, or `<Nil />`; `seats` → `t("seats")` and `tAsset("licenseSeatSummary", { used, total, remaining })` through `formatCount` (`remaining` = `Math.max(total - used, 0)`), or `tAsset("licensePool")` when `total` is null.
  - location: `tAsset("location")` (Task 2's "ที่ตั้ง"), the name linked to `buildLocationRegisterHref(locale, location.id)` (`exact=1`, R9), sub `[branchName, parentName]` joined with " · ".
  - audit: `t("lastAudit")`; `result` → the pinned `StatusBadge` in the round page's words ("พบตรง", "รายการไม่ตรง", "ไม่พบ", R19), sub `formatAssetDetailDate(at, locale)` · the round code (a link to `/${locale}/audit/rounds/${round.id}` when `canViewAudit`, else plain `tag`); `pending` → `t("auditPendingIn")` and the round code (linked the same way; it wins over an older result, R35); `never` → `t("auditNever")`.
  - warranty: `t("warranty")`; `until` → `t("warrantyUntil", { date })`, `expired` → `t("warrantyEnded", { date })` (both `formatAssetDetailDate`), `unknown` → `t("warrantyUnknown")` with, when `purchaseEditHref`, the sub-line link `t("addPurchaseDetails")`.

`asset-overview.tsx` (server; `useTranslations("assetDetail")`, `("asset")` as `tAsset`, `("brandModel")`, `("common")`, and `useTranslations()` as `tAll` for the history labels):
- Props: `{ locale: string; canEdit: boolean; editHref: string; purchaseEditHref: string; details: AssetOverviewDetails; conditionHelp: { title: string; description: string; items: string[] }; photo: { attachmentId: string | null; isModelPhoto: boolean; alt: string; uploadHref: string }; recent: { events: AssetHistoryEvent[]; total: number; historyHref: string } | null; documentAccess: Record<AssetMovementDocumentKind, boolean>; components: { children: { id: string; assetTag: string; name: string; href: string }[]; parent: { assetTag: string; name: string; href: string } | null; manageHref: string | null; allHref: string }; dataGaps: { key: string; label: string; href: string }[] }`.
- `type AssetOverviewDetails = { category: { code: string; name: string }; company: { code: string; nameTh: string }; branch: { code: string; name: string }; brandModel: string | null; serial: { isLicenseKey: boolean; value: string | null }; condition: { name: string; nameTh: string }; ownershipType: AssetOwnershipKind; department: { code: string; name: string } | null; homeLocation: { code: string; name: string } | null; licenseDevice: { assetTag: string; name: string; href: string } | null; registeredAt: Date; latestHandover: { code: string; href: string } | null; remark: string | null; specs: { items: { id: string; label: string; value: string }[]; notes: string | null }; purchase: { price: number | null; date: Date | null; supplier: { code: string; name: string } | null; warrantyStart: Date | null; warrantyEnd: Date | null; poNumber: string | null; invoiceNumber: string | null; fixedAssetCode: string | null; documents: { id: string; documentNo: string }[]; documentsHref: string } }`.
- The root is `<div className="space-y-4">`. It holds the data-gap line (R59) and then the grid. The line renders as pinned, `{dataGaps.length > 0 ? (<Notice tone="neutral" data-slot="asset-data-gaps">…</Notice>) : null}`:
  - `neutral` is DESIGN's inline line: no box and no fill, with a muted icon. The line is something to complete, not something to deal with now. It has no live-region role, because it is there when the page loads.
  - Its text is `tAsset("dataGapsTitle", { count: formatCount(dataGaps.length) })` ("ข้อมูลยังไม่ครบ 2 รายการ:").
  - Then each gap follows as `<Link href={gap.href} className={linkVariants({ size: "inherit" })}>{gap.label}</Link>`, separated by " · ", each in a `Fragment` keyed by `gap.key`.
  - The page passes an empty list to anyone without `asset:edit`, so a viewer never sees the line.
- The grid as pinned, in DOM order (the phone's order: รูป first, spec §7.5):
  1. รูป: `<ContentPanel divided title={t("photoTitle")}>` holding the pinned `AssetPhotoFrame` (R26: `previewable` left at `true`, so the image opens the original in `AttachmentPreviewDialog`; `className="aspect-[4/3] w-full"`, the board's box, because the frame fills its parent and has no height of its own, R47; the upload link only with `canUpload`, to the files tab). The model photo's caption is `tAsset("modelPhoto")` "รูปประจำรุ่น" (R27).
  2. `id="overview"`: `<ContentPanel divided title={t("detailsTitle")} actions={canEdit ? (<Link href={editHref} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>{tCommon("edit")}</Link>) : undefined}>`, holding three groups:
     - the facts `KeyValueList`: หมวดหมู่ (`tag` code - name), `t("ownerCompany")`, `tAsset("assetOwnerBranch")`, `t("brandModel")`, the serial (`tAsset("licenseKey")` with `maskLicenseKey` for a licence, else `tAsset("serialNumber")`; the value in `tag`), สภาพ (the pinned badge and help), `tAsset("ownershipType")`, then only when set: แผนก, ที่ตั้งประจำ, the licence's device (linked); then `t("registeredAt")` (`formatAssetDetailDate`), `t("latestHandover")` (the HO- code in `tag`, linked), and the pinned remark row;
     - the specs, when there is an item or a note: an `h3` (`text-sm font-semibold text-foreground`) `tBrandModel("structuredSpecs")` and a `KeyValueList` of the items plus `tBrandModel("specNotes")`;
     - the purchase, wrapped in `<div id="purchase" className="scroll-mt-24">` (R23: the reports' warranty link, `buildAssetDetailSectionHref(locale, id, null, "purchase")`, lands here): an `h3` `tAsset("purchaseWarranty")`; `purchaseRows`, the rows that are set: ราคาซื้อ (`formatMoney` with `tCommon("baht")`, in `num`), วันที่ซื้อ, ผู้ขาย (`tag` code - name), เริ่มประกัน, หมดประกัน, เลข PO, เลขใบกำกับ, รหัสทรัพย์สินทางบัญชี, and the row `{ key: "purchaseDocuments", label: tAsset("purchaseDocuments"), … }` ("เอกสารจัดซื้อ", R31; shown whenever a document is linked, R35) listing each document number in `tag` linked to `details.purchase.documentsHref`. One `KeyValueList`, written as pinned (R55, spec §7.5): `{purchaseRows.length > 0 || !canEdit ? (<KeyValueList items={purchaseRows.length > 0 ? purchaseRows : emptyPurchaseRows} />) : (<><EmptyNote>{t("purchaseEmpty")}</EmptyNote><Link href={purchaseEditHref} className={buttonVariants({ variant: "outline", size: "sm" })}>{t("purchaseAdd")}</Link></>)}` (no dashed box, guard N2). So with no purchase fact and no linked document, `canEdit` reads the prompt and "เพิ่มข้อมูล", and everyone else reads `emptyPurchaseRows`: ราคาซื้อ, วันที่ซื้อ, ผู้ขาย and หมดประกัน, each `{ key: "<key>", label: tAsset("<key>"), value: <Nil /> }` (`purchasePrice`, `purchaseDate`, `supplier`, `warrantyEnd`; `Nil` from `src/components/ui/nil.tsx`, whose props are `label?` and `className?`; with no `label` a screen reader says `common.noValue` "ไม่มีข้อมูล").
  3. ความเคลื่อนไหวล่าสุด (when `recent` is given, i.e. on the overview): `<ContentPanel divided flush title={t("recentTitle")} actions={…the pinned recentAll link to recent.historyHref…}>`; empty → `<EmptyNote padded>{t("recentEmpty")}</EmptyNote>`; otherwise the pinned desktop `DataTable`, its head `tAsset("history.columns.date")`, `("history.columns.event")`, `("history.columns.detail")`, `("history.columns.document")` (R14; "รายการ" heads the event's own label, R56), its rows: วันที่ in `num` through `formatAssetDetailDate` (R37), the event's own label `tAll(event.labelKey)` (R17), `event.detail` or `<Nil />`, and the document as `{event.document && documentAccess[event.document.kind] ? (<Link href={event.document.href} className={linkVariants({ size: "inherit" })}><span className="tag">{event.document.code}</span></Link>) : <Nil />}` (R12: without the document page's permission there is no link and no code, the dashboard's rule); and the pinned phone rows (a meta line "date · รายการ", the date and the event's own label, then the detail and the document under the same rule).
  4. อุปกรณ์ส่วนควบ: `<ContentPanel divided flush title={t("componentsTitle")} actions={components.manageHref ? (…link t("componentsManage")…) : undefined}>` ("จัดการ" only with `asset:edit`, R35); the parent line (`t("componentOf")` and the parent's `tag` and name, linked) when there is a parent; up to five children in `ContentPanelRows` (the name, then the `tag` under it, each a link); "ดูทั้งหมด N รายการ" (`t("componentsMore")`, to `components.allHref`) when more than five; `<EmptyNote padded>{t("componentsEmpty")}</EmptyNote>` when neither.

- [ ] **Step 5: Rebuild the page**

In **P**:
1. **Who and what.** Keep the props type and `requirePagePermission`. Add `canCreateMaintenance`, `canViewMaintenance`, `canCreateDisposal`, `canViewDisposal`, `canViewEmployee`, `canViewAudit` (each `hasPermission(user, "<module>", "<action>")`). `const { view: assetDetailView } = resolveAssetDetailView(rawSearchParams.view)`, `const registerParams = parseRegisterReturnTo(rawSearchParams.returnTo, locale)` (pinned lines), `returnToHref` and the scan return as today. `const now = new Date()`. Translations: add `tDetail = await getTranslations("assetDetail")`, `tDisposal = await getTranslations("disposalPage")`, `tAll = await getTranslations()` (Task 1's full keys, R2). The middle crumb and the strip's label are `asset.*` keys, read with the page's `t` (R10, R19).
2. **Initial read** (`asset-detail.initial-data`): the `findFirst` include as Task 7 left it, with `custodian: { select: { code: true, fullNameTh: true, email: true, department: { select: { code: true, name: true } } } }` and `currentLocation: { select: { id: true, code: true, name: true, branch: { select: { name: true } }, parent: { select: { name: true } } } }`; the QR setting read goes, so the round is the pinned `const [rawAsset, readyStatus, detailCounts]` (Task 7's `getAssetDetailCounts(id)` stays its last entry, R22; nothing else reads the counts).
3. **The frame round**, right after `notFound()`, as pinned (`asset-detail.frame-data`: the frame, the neighbours and, on the overview only, the latest three events).
4. **Kept as they are:** the latest-transaction block (P:277-325), the evidence index reduced to the checkout query (P:327-353 under the same label), the photo checklist, model photos and licence device (P:380-394), the component panels (P:395-485), the purchase documents (P:486-507), the evidence data reduced to the purchase-document attachments, the component attachments and users (P:401-456, label kept, its meta object drops the three removed counts), the operation data, transfers, movement items, `formatAuditState`, `unifiedTimelineItems`, the maintenance and audit summaries and `movementTimelineItemsForClient`.
5. **Removed:** `activeCheckout`, `latestCheckout`, `warrantyState`, `checklistMissingLabels` and `hasPurchaseDocuments` (both now inline inputs of `listAssetDataGaps`, R59), `responsibilityHealthLabel`, `healthFixHref`, `dataHealth*`, the `getAssetRegisterTransactionActions` call and the transaction hrefs, `assignedAssetHref`, `latestDocumentHref`, `lifecycle`, `mobileActionCandidates`, `mobileActions`, `activeCheckoutDestination`, `latestActivityItem`, the follow-up candidates, `qrValue`, the evidence and activity drawer items; the local functions named in **Files** (`isPreviewableImage` with them); the imports nothing uses (lint lists them). `maintenanceHref` stays while the old `#maintenance` section reads it (Task 12).
6. **Built here:**
   - `photosHref` and `componentsManagerHref` as Task 7 left them (R22: the manager returns to `?view=components` with the detail's own `returnTo`); `const purchaseEditHref = `${editHref}#purchase`` (pinned); `printLabelHref = `/${locale}/assets/${asset.id}/label``.
   - The photo (R27): `primaryAssetPhoto` and `primaryModelPhoto` pick the first `isThumbnailable(attachment.fileType)` attachment (pinned; newest first as read), in place of today's `isPreviewableImage`, so HEIC and SVG never reach the frame.
   - `const actionInput: AssetActionInput = { locale, assetId: asset.id, statusName: asset.status.name, ownership: ownershipType, custodianId: asset.custodianId, openCheckoutId: frame.openCheckout?.id ?? null, openCheckoutHandoverMode: frame.openCheckout?.handoverMode ?? null, openRepairId: frame.openRepairId, openDisposalId: frame.openDisposalId, returnTo: currentAssetDetailHref, can: { … } }` (the pinned lines; R1), `const assetActions = getAssetActions(actionInput)` and `const recordRepairAction = assetActions.primary?.key === "recordRepair" ? null : getAssetRecordRepairAction(actionInput)` (pinned; R4).
   - The links for the actions part: `primary = assetActions.primary ? { key: assetActions.primary.key, label: tAll(assetActions.primary.labelKey), href: assetActions.primary.href } : null` (a primary always runs now, R3), `recordRepair = recordRepairAction ? { key: "recordRepair", label: tAll(recordRepairAction.labelKey), href: recordRepairAction.href } : null` (its href carries no `returnTo`, R4).
   - The data gaps (R59, pinned lines):
     - `const dataGaps = canEditAsset ? listAssetDataGaps({ … }) : []`, one property per line. The inputs:
       - `ownership: ownershipType`
       - `hasSerial: Boolean(asset.serialNumber)`
       - `hasResponsibility: hasAssetResponsibility(asset),`
       - `hasPrimaryPhoto: Boolean(primaryAssetPhoto)`
       - `missingChecklistCount: getMissingPhotoChecklistLabels(photoChecklist, assetAttachments).length,`
       - `hasPurchaseDocument: purchaseDocuments.length > 0 || legacyPurchaseDocuments.length > 0`
       - `hasWarrantyEnd: Boolean(asset.warrantyEndDate)`
       - `hasLicenseSeats: asset.licenseTotalSeats != null`

       These are today's checks (P:736-759).
     - `const dataGapHref = (gap: AssetDataGap) =>`: `photosHref` for `files`, `sectionHref("purchase-documents")` for `purchaseDocuments`, else `` `${editHref}${gap.anchor ? `#${gap.anchor}` : ""}` ``. The hash goes after `editHref`'s query, as `purchaseEditHref` does.
     - The overview gets `dataGaps.map((gap) => ({ key: gap.key, label: tAll(gap.labelKey, gap.count === undefined ? undefined : { count: formatCount(gap.count) }), href: dataGapHref(gap) }))`.
     - `hasAssetResponsibility` and `getMissingPhotoChecklistLabels` keep their imports.
   - `disposalOffer` (pinned; R5), `cancelTransaction` (today's object, P:963-976), `statusCorrection` (`canEditAsset && readyStatus && canCorrectAssetStatus(asset.status) ? { assetId: asset.id, readyStatusId: readyStatus.id, labels: {…today's eight labels…} } : null`).
   - `moreGroups = buildAssetDetailMoreGroups({ … })`: `primaryKey: assetActions.primary?.key ?? null`; `transactions: assetActions.transactions.map((action) => ({ key: action.key, label: tAll(action.labelKey), href: action.href, enabled: action.enabled, reason: action.reasonKey ? tAll(action.reasonKey) : null }))`; the pinned `recordRepair` line (only from the scan page, R21); the disposal item `` `/${locale}/disposal/new?assetId=${encodedAssetId}` `` (no `returnTo`, R5) with the pinned reason; `correctStatus: statusCorrection ? t("statusCorrectionButton") : null`; `cancelLatest: cancelTransaction ? tDetail("cancelLatest") : null`; the pinned `manageComponents` line; `clone` with `asset:create`; `edit` with `asset:edit`; `printLabel`.
7. **Render**, inside the pinned root:
   - `<AssetDetailHeader … />` with `backLabel` and `crumbLabel` as pinned (`t("registerCrumbSearch", { search })` / `t("registerCrumbFilters")`, R10), `neighbours` from Task 2's result (`position: neighbours.index`, 1-based, R8; `total`; the pinned `previousHref` / `nextHref`, `returnTo` unchanged), `serialNumber: ownershipType === "software_license" ? null : asset.serialNumber` (no licence key in the meta row, R35), `statusHelp={assetStatusHelp}`, and `actions={<AssetDetailActions asset={{ assetTag: asset.assetTag, name: asset.name }} primary={primary} printLabel={{ key: "printLabel", label: t("printLabel"), href: printLabelHref }} recordRepair={recordRepair} scanNext={isAssetScanReturn ? { key: "scanNext", label: t("scanNext"), href: scanReturnHref } : null} groups={moreGroups} cancelTransaction={cancelTransaction} statusCorrection={statusCorrection} />}` (the `scanNext` prop written as pinned).
   - `<AssetDetailTabs … />` with Task 7's labels and Task 7's `detailCounts` indicators, unchanged.
   - `<AssetDetailFactStrip … className={assetDetailView === "overview" ? undefined : "max-md:hidden"} />` (pinned; R19: the phone shows the strip on the overview only): `holder={describeAssetHolder({ ownership: ownershipType, custodian: asset.custodian ? { id: asset.custodianId!, code, fullNameTh, department: department ? `${code} - ${name}` : null } : null, department: asset.department ? `${code} - ${name}` : null, parent: installedInLinksForPanel[0]?.parentAsset ?? null, seats: { used: asset.licenseUsedSeats, total: asset.licenseTotalSeats }, openCheckoutDate: frame.openCheckout?.checkoutDate ?? null, now })}` (the `parent` line written as pinned), `location`, `audit={describeAssetAudit(frame.latestAuditResult, frame.pendingAudit)}`, `warranty={describeAssetWarranty(asset.warrantyEndDate, now)}`, the pinned `parentHref`, the two view permissions and `purchaseEditHref={canEditAsset ? purchaseEditHref : null}`.
   - `{assetDetailView === "overview" ? (<AssetOverview … />) : null}` with `details` from the asset (`brandModel` = brand and model names joined with " / ", or `null`; `latestHandover` from `frame.latestHandover` as `{ code: documentNo ?? id, href: `/${locale}/asset-management/checkouts/${id}` }`; `specs` = `parseModelSpecs(asset.model?.specs)`; `purchase.documents` from `purchaseDocuments`, `documentsHref: sectionHref("purchase-documents")` as pinned), the pinned `photo` lines with `alt: asset.name` and `uploadHref: photosHref` (the files tab, R26), `recent = recentHistory ? { events: recentHistory, total: detailCounts.history, historyHref: buildAssetDetailViewHref(locale, asset.id, "history", returnToHref) } : null`, `documentAccess` (`hasPermission(user, ASSET_MOVEMENT_DOCUMENT_PERMISSION[kind].module, "view")` for each of the six kinds), and `components` (the current components' assets linked to `` `/${locale}/assets/${encodeURIComponent(id)}` `` with no `returnTo`, as the relationship map's child links and Task 10's install table, R38; the parent from `installedInLinksForPanel[0]` with its existing `parentHref`, `manageHref: canEditAsset ? buildAssetDetailViewHref(locale, asset.id, "components", returnToHref) : null`, `allHref` the same URL), and `dataGaps` as built above (R59).
   - Then `<div className="space-y-6">` with the old sections under their guards, unchanged (R25): `#components` and `#handover`, `#movement`, the pinned interim `#purchase-documents` section, `#photos`, `#maintenance`, `#audit`. The old `<section>`s `#overview`, `#specs`, `#ownership`, `#purchase` and `#notes` (their facts are in "ข้อมูลทรัพย์สิน" and the strip; `id="overview"` and `id="purchase"` move into `AssetOverview`, R23), the follow-up and quick-actions panels, the component banner, the page-level `ActionBar` and the `aside` (QR, model photo, asset photo) go.
8. `src/lib/asset-detail-view.ts` (R23, same commit as the sections): `AssetDetailSectionId` loses `"specs"`, `"notes"` and `"ownership"` and gains `"purchase-documents"`; the section map becomes overview `["overview", "purchase"]`, history `["movement", "audit"]`, components `["components", "handover"]`, files `["photos", "purchase-documents"]`, maintenance `["maintenance"]` (pinned in `tests/asset-detail-view.test.ts`). No link outside the page names the three removed ids (`grep -rn '"ownership")\|"specs")\|"notes")' src`: on master it finds the page's data-health lines and old section guards, which this task deletes, and three unrelated hits that stay: `asset-form.tsx:1108` `t("ownership")`, `master-data/brands/page.tsx:474` `t("specs")` and `maintenance-plan-form.tsx:211` `fieldErrors.message("notes")`).
   `src/lib/asset-operation-policy.ts` (R6): delete `getAssetRegisterTransactionActions` with Task 1's comment above it; delete `AssetRegisterTransaction` and `AssetRegisterTransactionReason` when `grep -rn` finds no other reader after Task 1 (`AssetRegisterTransactionAction` stays: `buildAssetRegisterTransactionHref` takes it); drop the `getCheckinHandoverStatusError` and `isLegacyReturnEligible` imports if nothing else in the file uses them (lint says).
9. `src/lib/asset-detail-format.ts`: delete `createHealthItem` and `getWarrantyState`. Keep `getMissingPhotoChecklistLabels`: R59's line calls it, and so does Task 11's photo checklist.
10. Delete the five component files named in **Files**.

- [ ] **Step 6: The skeleton, the form anchor and DESIGN.md**

`src/components/ui/page-skeleton.tsx`: the `meta` option `"badges"` becomes `"identity"` (comment: "the code, one status badge and the S/N (the asset page)"), drawn as three blocks `h-5 w-28`, `h-5.5 w-20 rounded-control`, `h-5 w-24`. `AssetDetailPageSkeleton`, with its comment "the trail and the identity line, the five tabs, the four facts with their sub-lines, then the overview on 12 columns from lg (photo 4 beside details 8, then recent 8 and components 4); the photo comes first below lg":

```tsx
<div aria-busy="true" className="flex w-full flex-col gap-6">
  <PageHeaderSkeleton crumbs meta="identity" />
  <TabNavSkeleton count={5} />
  <MetricGridSkeleton count={4} foot />
  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
    <DividedPanelSkeleton rows={2} className="lg:col-span-4 lg:col-start-9 lg:row-start-1" />
    <DividedPanelSkeleton rows={6} className="lg:col-span-8 lg:col-start-1 lg:row-start-1" />
    <DividedPanelSkeleton rows={3} className="lg:col-span-8" />
    <DividedPanelSkeleton rows={3} className="lg:col-span-4" />
  </div>
</div>
```

`src/components/assets/asset-form.tsx:1366`: `<div id="purchase" className="scroll-mt-24">` around the purchase `Section` (pinned).

`DESIGN.md` (by text):
- Page header, the detail-pages bullet (:568): "the meta row holds the code, the status badges (with their help buttons on the asset page) and the facts a person checks first, such as the asset's location and custodian or an employee's position and e-mail" becomes "the meta row holds the code, the status badges and the facts a person checks first, such as an employee's position and e-mail; the asset page's meta row is its code, its status badge with its help button and its S/N, and its custodian, location, last audit and warranty are the fact strip under its tabs (page group 1)"; and "On the asset page "แก้ไข" is hidden below `md` (`hidden md:inline-flex`; phones reach it in ⋯)" becomes "On the asset page the previous and next links follow the back link, "อื่น ๆ", "พิมพ์ป้าย", "บันทึกซ่อม" and the next step sit in a `hidden md:flex` group (phones reach them in the page's own action bar), and "แก้ไข" is the link of its "ข้อมูลทรัพย์สิน" panel".
- Loading skeletons (:711): "(crumbs and two badges on the asset page, …" becomes "(crumbs, the code, one status badge and the S/N on the asset page, …".

`docs/14_UI_UX_DESIGN_SYSTEM.md:30` (the Asset Detail row) is Task 13's, with the round's docs.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: every unit test passes (the guards read all of `src`: LH1 no `<h1>`, LB1 no hand-placed `ArrowLeft`, LN1 no hand-written `aria-current`, LS1/LK1/LN2 no local tile or label names, LV1 no bare `toLocaleString`, LV2 the page's row still 4, N1 no raw colour, N2 no dashed line, N3 no raw `<button>`, R3 no text under 12px, the overlay guards no `fixed inset-0` outside `ui/` and no `dark:`; `tests/thai-glossary.test.ts` and `tests/messages-parity.test.ts` pass), tsc is clean, lint has no errors.

- [ ] **Step 8: Commit**

```bash
git add "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" src/components/assets/detail src/lib/asset-detail-view.ts src/lib/asset-detail-format.ts src/lib/asset-operation-policy.ts src/components/assets/asset-form.tsx src/components/ui/page-skeleton.tsx DESIGN.md messages/th.json messages/en.json tests/asset-detail-page.test.ts tests/asset-detail-ux.test.ts tests/asset-detail-anchor-layout.test.ts tests/asset-detail-data-boundaries.test.ts tests/asset-photo-gallery.test.ts tests/asset-register-transactions.test.ts tests/asset-return-navigation.test.ts tests/asset-scan-return-navigation.test.ts tests/asset-status-help-ui.test.ts tests/asset-transaction-cancellation-ui.test.ts tests/asset-operation-status-policy.test.ts tests/assets-sweep-ui.test.ts tests/breadcrumbs-ui.test.ts tests/dead-code-cleanup.test.ts tests/dropdown-menus-ui.test.ts tests/e2e-fixes.test.ts tests/mobile-action-bar.test.ts tests/operations-sweep-ui.test.ts tests/performance-route-instrumentation.test.ts tests/phase2d-final-ui.test.ts tests/visual-consistency-ui.test.ts tests/page-loading-skeleton.test.ts tests/dark-mode-p.test.ts tests/sheet-drawers-ui.test.ts tests/asset-detail-format.test.ts tests/asset-detail-view.test.ts tests/audit-component-scan-ui.test.ts
git rm src/components/assets/asset-detail-action-menu.tsx src/components/ui/activity-drawer.tsx src/components/assets/asset-evidence-drawer.tsx src/components/assets/asset-qr-code.tsx src/components/assets/asset-component-context-banner.tsx
git commit -m "feat(assets): canvas B asset page frame: header with the search trail and previous/next, อื่น ๆ and the phone bar from the shared rule, the fact strip, and the overview tab (group 1 asset detail task 8C)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 9 (the controller, after Task 13's E2E run; not the implementer): look at the page**

With the E2E run's build still in place, start `next start` on a free port with `AUTH_URL` / `NEXTAUTH_URL` set to it and `SESSION_IDLE_SECONDS=10800`, sign in through the run's IT staff and viewer states (`authStateFile(<runId>, "itStaff" | "viewer")`), and screenshot one personal asset in use, one stock asset, one component and one licence at 1440×900 and 390×844, in light and dark, opened from a register search (`returnTo` with `search=`) and directly. Compare the header (trail, "3 / 24", the button order), "อื่น ๆ" open (unavailable items with their reasons), the fact strip, the overview's four panels and the phone bar with its sheet against `B-AssetDetail.dc.html` and `B-AssetDetail-Phone.dc.html`. Also look at: the photo frame's placeholder for an asset whose file lives in another checkout (a `/thumbnail` 404, which the allow-list permits), its upload link ("อัปโหลดรูป" from `md`, "ถ่ายรูป" below, R26), the strip at 768 and 1024 and its absence on the phone's other tabs (R19), the phone bar from the scan page ("สแกนรายการถัดไป", the primary, "การดำเนินการอื่น" with "บันทึกซ่อม" in the sheet, R21), and focus returning to "อื่น ๆ" / "การดำเนินการอื่น" after the cancel and correction dialogs close. What differs goes to the implementer as one fix round (`fix(assets): … (group 1 asset detail task 8C fix 1)`), reviewed like any other. Delete the screenshots after the report; never commit them.

**E2E steps this task changes (Task 13 rewrites them; until then the suite is red on these lines only):**
- `e2e/transactions/handover.spec.ts:91,194`: "ส่งมอบ" is no longer a disabled header button. Open "อื่น ๆ" (the phone: "การดำเนินการอื่น") and expect the item "ส่งมอบ" with `aria-disabled="true"` and its reason "ส่งมอบได้เมื่อสถานะเป็น พร้อมใช้งาน เท่านั้น" (Task 1's `asset.transactionReasonStatusNotReady`).
- `e2e/transactions/transfer.spec.ts:34`: a Ready personal asset's primary is "ส่งมอบ"; "โอนย้าย" is a menu item of "อื่น ๆ" (a link item on the phone sheet). `:95-99`: the TR- link is in the overview's "ความเคลื่อนไหวล่าสุด" and in the history tab (Task 7's `history` instead of `operations`).
- `e2e/transactions/cancel.spec.ts:33`: the button "การดำเนินการเพิ่มเติม" becomes "อื่น ๆ" (the phone: "การดำเนินการอื่น", whose sheet row is a button); the item reads "ยกเลิกรายการล่าสุด", which `name: "ยกเลิกรายการ"` still matches. `:77-81`: the history tab instead of `operations` (the old timeline until Task 9).
- `e2e/assets/licence.spec.ts:73`: the seats left `#overview` for the fact strip; the step reads the region `page.getByRole("region", { name: "ข้อมูลสำคัญของทรัพย์สิน" })` (R19) containing "ใช้แล้ว 2/5 คงเหลือ 3".
- Unchanged and still met: `register-asset.spec.ts:93-99` (the document number is the "เอกสารจัดซื้อ" row of "ข้อมูลทรัพย์สิน", R31; the photo is an `<img>` under `/api/attachments/…/thumbnail`), `desk-delivery.spec.ts:32-33` (the phone bar's first link "ส่งมอบ"), `repair-record.spec.ts:101-102` (the pinned link "บันทึกซ่อม"), `return.spec.ts`, `bulk-move.spec.ts:91-92` and `transfer.spec.ts:73-75` (the room and the receiver are in the fact strip inside `main`), `roles.spec.ts:39-57` (no write control for the viewer; its M6 comment about the QR code goes stale), `findings.spec.ts:10-16` and `repair-record.spec.ts:142-149` (no QR `svg` left to fail axe).

---

### Task 9: The history tab

**Amendments (controller):** R46: import `type AssetHistoryCounts` and `ASSET_HISTORY_CATEGORIES` from Task 3's `src/lib/asset-history-rules.ts` instead of declaring copies in `src/lib/asset-history-view.ts`. R49: the table's head for the event's own label is `asset.history.columns.event` "รายการ" (the Excel's word for the same column), not "ประเภท"; "ประเภท" stays the chip word, as in the Excel.

**Files:**
- Create: `src/lib/asset-history-view.ts` (pure and client-safe: relative `.ts` imports only, no `@/`, no `prisma`; the client panel imports it)
- Create: `src/components/assets/asset-history-panel.tsx` (client: the chips, the period select, the table, the phone cards, "แสดงเพิ่ม")
- Create: `src/components/assets/detail/asset-history-tab.tsx` (server: builds the rows, the panel frame and the export link)
- Delete: `src/components/assets/asset-movement-timeline.tsx` (its only caller is the page's old `#movement` section)
- Modify: `src/components/ui/data-table.tsx:124-126` (`DataTableGroupRow` after `DataTableRow`)
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`. Master f6368e19 lines; Task 8 leaves these parts as they are, so find them by name:
  - :87 (the `searchParams` type gains `type`)
  - imports :58 (`getMovementDisplayLabels`), :60 (`AssetMovementTimeline`), :76-83 (`compactMovementDetails`, `formatMovementType` leave the `asset-detail-format` import)
  - :90-107 (`MovementCustodyDetail`, `MovementTimelineItem`)
  - :512-519, :547-564, :585-588 (the movement actors and employees, their reads in `asset-detail.operation-data` and their label maps; `checkoutsById`, `checkinsById`)
  - :589-672 (`transferIds`, `transfersById`, `movementLabels`, `movementTimelineItems`)
  - :682-689, :889-894 (`unifiedTimelineItems`, `latestMovement`, `movementTimelineItemsForClient`)
  - :1407-1448 (the `#movement` section) and :1535-1590 (the `#audit` section). Both are on the history tab after Task 8 (R25)
  - :721 and :768-772 (`latestAuditItem` and `auditSummary`, read only by `#audit` once Task 8 removed the follow-up panel), :137-138 and :673-681 (`tAudit`, `tFinding`, `formatAuditState`)
  - :158-161 and :220-226 (the main read's `movements` and `auditItems` relations with their `take: loadPolicy.*Limit`), plus `auditFindings` (:227-233) and `disposalRequests` (:234-238) when no reader of them is left
  - :2426-2443, :2475-2695, :2730-2759 (`getMovementTitle`, `getMovementSummary`, `getMovementTone`, `getMovementCategory`, the four `build…TimelineItems`, `knownMovementTypeKeys`)
- Modify: `src/lib/asset-detail-view.ts` (Task 7's version): `"movement"` and `"audit"` leave `AssetDetailSectionId` and the section map, and the history tab has no section (R23, R25; Task 7's rule that the task that drops a section edits the union and the map in the same commit)
- Modify: `src/lib/asset-detail-data.ts` (Task 7's version): the history view's interim policy goes, so the history view loads the preview, and the limits whose relation goes (`movementLimit`, `auditItemLimit`, and `auditFindingLimit` / `disposalLimit` with theirs) leave `AssetDetailLoadPolicy` (R24)
- Modify: `src/lib/asset-detail-format.ts:52-65` (`compactMovementDetails` and its `MovementDetailLike` type go, only when `grep -rn compactMovementDetails src` finds no other caller after this task; `formatMovementType` stays, because the disposal page uses it)
- Modify: `DESIGN.md:609` (one bullet after **Empty** in Data Tables), `docs/14_UI_UX_DESIGN_SYSTEM.md:77` (the "A list table" row), `.impeccable/design.json:461` (the "Data Table" description)
- Modify: `messages/th.json`, `messages/en.json` (only through `node scripts/messages-edit.mjs`)
- Test:
  - `tests/asset-history-view.test.ts` (new, behaviour)
  - `tests/asset-history-ui.test.ts` (new, source pins)
  - the pins in Step 1's table: `tests/e2e-fixes.test.ts:1-4,156-162,183-196`, `tests/assets-sweep-ui.test.ts:86-97` and the page test (master :110-133, Task 8's version), `tests/asset-detail-ux.test.ts:57-65` and the header test (master :160-179, Task 8's version), `tests/audit-item-status-labels.test.ts:76-79`, `tests/asset-detail-anchor-layout.test.ts` (Task 8's version), `tests/list-frame-guards.test.ts:163`, `tests/asset-detail-format.test.ts:4-9,39-51`, `tests/performance-route-instrumentation.test.ts:14-21` (Task 8's version), `tests/asset-return-navigation.test.ts:44`, `tests/asset-detail-data-boundaries.test.ts` (Task 7's policy test and master :32-43), `tests/asset-detail-view.test.ts` (Task 7's version, with Task 8's `purchase-documents`: the section map and the page-wiring test) and `tests/asset-detail-page.test.ts` (Task 8C's first test)
- No skeleton change. `AssetDetailPageSkeleton` draws the frame and the overview (Task 8), and a tab's content has no skeleton of its own.
- No E2E file changes here (Task 13 owns them). The steps this task moves under them are listed in Step 7.
- No schema change.

**Interfaces:**
- Consumes:
  - Task 3 (`src/lib/asset-history-rules.ts`, pure):
    - `type AssetHistoryCategory = "checkout" | "checkin" | "transfer" | "audit" | "repair" | "disposal" | "component" | "edit"`
    - `ASSET_HISTORY_CATEGORIES: readonly AssetHistoryCategory[]` (the chips after ทั้งหมด, in spec §7.6's order; Task 3 pins it)
    - `type AssetHistoryEvent = { id: string; at: Date; category: AssetHistoryCategory; labelKey: string; detail: string | null; actor: string | null; document: { code: string; href: string; kind: AssetMovementDocumentKind } | null }` (R12: the kind is typed, and every document carries its href; `labelKey` is a full key, R2)
    - `type AssetHistoryCounts = { total: number; counts: Record<AssetHistoryCategory, number> }` and `type AssetHistory = AssetHistoryCounts & { events: AssetHistoryEvent[]; capped: boolean }`
    - `assetHistoryCategory(movementType: string): AssetHistoryCategory`, used by the FX11 pin.
  - Task 3 (`src/lib/asset-history.ts`, server): `getAssetHistory(assetId: string, locale: string, options?: { limit?: number }): Promise<AssetHistory>`. The events are newest first, at most 500, and `total` and `counts` cover every event, from the same sources and merge rules as `getAssetHistoryCounts`, so the tab count, the "ทั้งหมด" chip and the overview's "ดูประวัติทั้งหมด N รายการ" say one number (R11).
  - Task 3: the route `GET /api/assets/[id]/history/export?locale=th|en`, gated by `asset:view` (6 columns, at most 5,000 rows, Bangkok times; R15).
  - Task 3's messages (R14): `asset.history.types.*` (the eight chip words) and `asset.history.columns.*` (`at`, `type`, `event`, `detail`, `actor`, `document`). "ทั้งหมด" is the existing `asset.movementFilters.all`.
  - Task 7:
    - `resolveAssetDetailView(raw): { view: AssetDetailView; historyType: AssetHistoryCategory | null }` and the view `"history"` (`src/lib/asset-detail-view.ts`). Tab links carry no `#anchor` (R22).
    - `type AssetDetailSectionId` and its section map, where the history tab holds `"movement"` and `"audit"` until this task.
    - `getAssetDetailLoadPolicy(view)` (`src/lib/asset-detail-data.ts`), whose history policy is interim (R24).
  - Task 8:
    - the page frame, with the history tab still rendering the old `#movement` and `#audit` sections (R25). It also provides `user`, `asset`, `locale` and `rawSearchParams`;
    - the overview's document access record, which this task turns into the one `documentAccess` below;
    - Task 8B's `formatAssetDetailDate(date: Date, locale: string): string` (`src/lib/asset-detail-frame-rules.ts`, pure: "12 ต.ค. 2569"), the one date formatter of the history tab (R37).
  - Dashboard plan:
    - `ASSET_MOVEMENT_DOCUMENT_PERMISSION` and `type AssetMovementDocumentKind` (`src/lib/asset-movement-labels.ts`)
    - `assetMovementLabelKey` and `buildAssetMovementDocumentHref`, used by the FX10 and FX11 pins
    - `getBangkokDateKey(date)` (`src/lib/preventive-maintenance.ts:50`, client-safe)
    - `formatCount` (`src/lib/display-format.ts`)
  - Shared parts: `ChoiceChip` (radio, `detail` count), `FilterSelect` (controlled, `fieldSize="md"`), `DataTable` / `DataTableHeader` / `DataTableHead` / `DataTableBody` / `DataTableRow` / `DataTableCell` / `TableEmptyRow`, `ContentPanel divided flush`, `ContentPanelRows`, `EmptyNote`, `Notice`, `Nil`, `Button`, `buttonVariants`, `linkVariants`.
- Produces:
  - In `src/lib/asset-history-view.ts` (Task 10 uses `assetDocumentAccess` through the page's `documentAccess`):
    - `ASSET_HISTORY_PAGE_SIZE = 50`
    - `type AssetHistoryPeriod = "all" | "year"`
    - `type AssetHistoryRow = { id: string; category: AssetHistoryCategory; label: string; atIso: string; when: string; monthKey: string; monthLabel: string; recent: boolean; detail: string | null; actor: string | null; document: { code: string; href: string } | null }`
    - `parseAssetHistoryType(raw: string | string[] | undefined): AssetHistoryCategory | null`
    - `assetDocumentAccess(can: (module: string, action: "view") => boolean): Record<AssetMovementDocumentKind, boolean>`
    - `assetHistoryPeriodStart(now: Date): Date`
    - `formatHistoryTime(at: Date): string` ("17:05", Bangkok, 24-hour; the date beside it is `formatAssetDetailDate`, R37)
    - `formatHistoryMonth(at: Date, locale: string): string` ("ตุลาคม 2569", the month group heading)
    - `buildAssetHistoryRows(events: readonly AssetHistoryEvent[], options: { locale: string; now: Date; access: Record<AssetMovementDocumentKind, boolean>; label: (key: string) => string }): AssetHistoryRow[]`
    - `filterAssetHistoryRows<T extends Pick<AssetHistoryRow, "category" | "recent">>(rows: readonly T[], type: AssetHistoryCategory | "all", period: AssetHistoryPeriod): T[]`
    - `assetHistoryChipCounts(rows: readonly Pick<AssetHistoryRow, "category" | "recent">[], period: AssetHistoryPeriod, server: AssetHistoryCounts): AssetHistoryCounts`
    - `visibleAssetHistoryChips(counts: Record<AssetHistoryCategory, number>, initialType: AssetHistoryCategory | null): AssetHistoryCategory[]`
    - `groupAssetHistoryByMonth<T extends Pick<AssetHistoryRow, "monthKey" | "monthLabel">>(rows: readonly T[]): { monthKey: string; monthLabel: string; rows: T[] }[]`
    - `pageAssetHistoryRows<T>(rows: readonly T[], visible: number): { shown: T[]; remaining: number }`
    - `buildAssetHistoryExportHref(locale: string, assetId: string): string` (R15: it adds the `?locale=` Task 3's route reads)
  - In `src/components/ui/data-table.tsx`: `DataTableGroupRow({ colSpan, className, children }: { colSpan: number; className?: string; children: React.ReactNode })`.
  - `AssetHistoryPanel({ rows, total, counts, capped, initialType }: { rows: AssetHistoryRow[]; total: number; counts: Record<AssetHistoryCategory, number>; capped: boolean; initialType: AssetHistoryCategory | null })` (client).
  - `AssetHistoryTab({ assetId, locale, history, initialType, documentAccess }: { assetId: string; locale: string; history: AssetHistory; initialType: AssetHistoryCategory | null; documentAccess: Record<AssetMovementDocumentKind, boolean> })` (async server component).
  - In the page: `const documentAccess = assetDocumentAccess((module, action) => hasPermission(user, module, action))`, the one record of the overview (Task 8), this tab and the components tab (Task 10). It follows `ASSET_MOVEMENT_DOCUMENT_PERMISSION[kind]` (R12).
  - For Task 13: the panel's names. The chips are radios named by their category label ("ทั้งหมด" first), with the count read as their description. The select is "ช่วงเวลา", the export link is "ส่งออก Excel" (desktop only), and the more button is "แสดงเพิ่ม (เหลือ N รายการ)". `?type=repair` chooses ซ่อม even with `?view=audit` (R17). Every document link appears twice in the DOM: in the desktop table (`hidden md:block`) and in the phone cards (`md:hidden`).

- [ ] **Step 1: Write the failing tests**

Create `tests/asset-history-view.test.ts`:

```ts
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import type { AssetHistoryEvent } from "../src/lib/asset-history-rules.ts"
import {
  ASSET_HISTORY_PAGE_SIZE,
  assetDocumentAccess,
  assetHistoryChipCounts,
  assetHistoryPeriodStart,
  buildAssetHistoryExportHref,
  buildAssetHistoryRows,
  filterAssetHistoryRows,
  formatHistoryMonth,
  formatHistoryTime,
  groupAssetHistoryByMonth,
  pageAssetHistoryRows,
  parseAssetHistoryType,
  visibleAssetHistoryChips,
} from "../src/lib/asset-history-view.ts"

const at = (iso: string) => new Date(iso)
const now = at("2026-10-26T05:00:00Z") // noon on 26 Oct in Bangkok
const access = { checkout: true, checkin: true, transfer: true, repair: false, disposal: false, auditRound: true }
const events: AssetHistoryEvent[] = [
  { id: "e3", at: at("2026-10-12T10:05:00Z"), category: "audit", labelKey: "asset.movementTypes.audit_correction", detail: "ตรงตามทะเบียน", actor: "IT01 - ผู้ตรวจ", document: { code: "AUD-2026-0003", href: "/th/audit/rounds/r1", kind: "auditRound" } },
  { id: "e2", at: at("2025-10-25T17:00:00Z"), category: "checkout", labelKey: "asset.movementTypes.checkout", detail: null, actor: null, document: { code: "HO-2025-0001", href: "/th/asset-management/checkouts/c1", kind: "checkout" } },
  { id: "e1", at: at("2025-10-25T16:59:00Z"), category: "repair", labelKey: "asset.movementTypes.maintenance_close", detail: "เปลี่ยนจอ", actor: "IT02 - ช่าง", document: { code: "MT-20251025-0001", href: "/th/maintenance/t1", kind: "repair" } },
]
const rows = buildAssetHistoryRows(events, { locale: "th", now, access, label: (key) => `<${key}>` })
const zero = { checkout: 0, checkin: 0, transfer: 0, audit: 0, repair: 0, disposal: 0, component: 0, edit: 0 }
const server = { total: 3, counts: { ...zero, checkout: 1, audit: 1, repair: 1 } }

test("the page size, and ?type= read only as a known category (spec §7.6; the chips' order is Task 3's ASSET_HISTORY_CATEGORIES)", () => {
  assert.equal(ASSET_HISTORY_PAGE_SIZE, 50)
  assert.equal(parseAssetHistoryType("audit"), "audit")
  assert.equal(parseAssetHistoryType(["repair", "audit"]), "repair")
  for (const raw of [undefined, "", "all", "bogus", "toString", ["x"]]) assert.equal(parseAssetHistoryType(raw), null, String(raw))
})

test("a document links only for those who may open its page (spec §7.6; the dashboard's rule)", () => {
  const asked: string[] = []
  const result = assetDocumentAccess((module, action) => {
    asked.push(`${module}:${action}`)
    return module === "asset" || module === "audit"
  })
  assert.deepEqual(result, { checkout: true, checkin: true, transfer: true, repair: false, disposal: false, auditRound: true })
  assert.ok(asked.every((entry) => entry.endsWith(":view")))
})

test("times and months in Bangkok with the Buddhist year in Thai; 12 เดือนล่าสุด starts on the same Bangkok date a year back", () => {
  assert.equal(formatHistoryTime(at("2026-10-12T10:05:00Z")), "17:05")
  assert.equal(formatHistoryTime(at("2025-10-25T17:00:00Z")), "00:00", "midnight in Bangkok, 24-hour")
  assert.equal(formatHistoryMonth(at("2026-10-12T10:05:00Z"), "th"), "ตุลาคม 2569")
  assert.equal(formatHistoryMonth(at("2026-10-12T10:05:00Z"), "en"), "October 2026")
  assert.equal(formatHistoryMonth(at("2026-09-30T17:30:00Z"), "th"), "ตุลาคม 2569", "00:30 on 1 Oct in Bangkok")
  assert.equal(assetHistoryPeriodStart(now).toISOString(), "2025-10-25T17:00:00.000Z")
  assert.equal(assetHistoryPeriodStart(at("2026-10-25T17:30:00Z")).toISOString(), "2025-10-25T17:00:00.000Z", "00:30 on 26 Oct")
  assert.equal(assetHistoryPeriodStart(at("2026-10-25T16:30:00Z")).toISOString(), "2025-10-24T17:00:00.000Z", "23:30 on 25 Oct")
  assert.equal(assetHistoryPeriodStart(at("2028-02-29T03:00:00Z")).toISOString(), "2027-02-27T17:00:00.000Z", "29 Feb counts from 28 Feb")
})

test("each event becomes a row with its own label, the detail page's date and the Bangkok time, its month, and a document only where the person may open it (spec §7.6; R12, R37)", () => {
  assert.deepEqual(rows, [
    { id: "e3", category: "audit", label: "<asset.movementTypes.audit_correction>", atIso: "2026-10-12T10:05:00.000Z", when: "12 ต.ค. 2569 · 17:05", monthKey: "2026-10", monthLabel: "ตุลาคม 2569", recent: true, detail: "ตรงตามทะเบียน", actor: "IT01 - ผู้ตรวจ", document: { code: "AUD-2026-0003", href: "/th/audit/rounds/r1" } },
    { id: "e2", category: "checkout", label: "<asset.movementTypes.checkout>", atIso: "2025-10-25T17:00:00.000Z", when: "26 ต.ค. 2568 · 00:00", monthKey: "2025-10", monthLabel: "ตุลาคม 2568", recent: true, detail: null, actor: null, document: { code: "HO-2025-0001", href: "/th/asset-management/checkouts/c1" } },
    { id: "e1", category: "repair", label: "<asset.movementTypes.maintenance_close>", atIso: "2025-10-25T16:59:00.000Z", when: "25 ต.ค. 2568 · 23:59", monthKey: "2025-10", monthLabel: "ตุลาคม 2568", recent: false, detail: "เปลี่ยนจอ", actor: "IT02 - ช่าง", document: null },
  ])
  const [en] = buildAssetHistoryRows([events[0]], { locale: "en", now, access, label: (key) => key })
  assert.deepEqual([en.when, en.monthLabel], ["12 Oct 2026 · 17:05", "October 2026"])
  const [edge] = buildAssetHistoryRows([{ ...events[1], id: "edge", at: at("2026-09-30T17:30:00Z") }], { locale: "th", now, access, label: (key) => key })
  assert.deepEqual([edge.monthKey, edge.when], ["2026-10", "1 ต.ค. 2569 · 00:30"], "the Bangkok month and date, not the UTC ones")
  const [denied] = buildAssetHistoryRows([events[1]], { locale: "th", now, access: { ...access, checkout: false }, label: (key) => key })
  assert.equal(denied.document, null, "no permission: neither the link nor the code (R12, the dashboard's rule)")
})

test("a chip and the period filter in place; counts follow the period; months group in order; 50 at a time (spec §7.6)", () => {
  assert.deepEqual(filterAssetHistoryRows(rows, "all", "all").map((row) => row.id), ["e3", "e2", "e1"])
  assert.deepEqual(filterAssetHistoryRows(rows, "checkout", "all").map((row) => row.id), ["e2"])
  assert.deepEqual(filterAssetHistoryRows(rows, "all", "year").map((row) => row.id), ["e3", "e2"])
  assert.deepEqual(filterAssetHistoryRows(rows, "repair", "year"), [])
  assert.equal(rows.length, 3, "the input is not changed")
  assert.deepEqual(assetHistoryChipCounts(rows, "all", server), server, "ทั้งหมด uses the server's counts over every event")
  assert.deepEqual(assetHistoryChipCounts(rows, "year", server), { total: 2, counts: { ...zero, checkout: 1, audit: 1 } })
  assert.deepEqual(visibleAssetHistoryChips(server.counts, null), ["checkout", "audit", "repair"])
  assert.deepEqual(visibleAssetHistoryChips(server.counts, "disposal"), ["checkout", "audit", "repair", "disposal"], "the ?type= chip shows even at zero")
  assert.deepEqual(groupAssetHistoryByMonth(rows), [
    { monthKey: "2026-10", monthLabel: "ตุลาคม 2569", rows: [rows[0]] },
    { monthKey: "2025-10", monthLabel: "ตุลาคม 2568", rows: [rows[1], rows[2]] },
  ])
  assert.deepEqual(groupAssetHistoryByMonth([]), [])
  const many = Array.from({ length: 120 }, (_, index) => index)
  assert.deepEqual([pageAssetHistoryRows(many, 50).shown.length, pageAssetHistoryRows(many, 50).remaining], [50, 70])
  assert.deepEqual([pageAssetHistoryRows(many, 150).shown.length, pageAssetHistoryRows(many, 150).remaining], [120, 0])
  assert.equal(buildAssetHistoryExportHref("th", "asset id/1"), "/api/assets/asset%20id%2F1/history/export?locale=th")
  assert.equal(buildAssetHistoryExportHref("en", "a1"), "/api/assets/a1/history/export?locale=en", "the Excel speaks the page's language (R15)")
})

test("the history view rules are client-safe: relative imports, no database", () => {
  const source = readFileSync("src/lib/asset-history-view.ts", "utf8")
  assert.doesNotMatch(source, /from "@\//)
  assert.doesNotMatch(source, /^import (?!type\b)[^\n]*from "@prisma\/client"/m)
  assert.doesNotMatch(source, /\bprisma\./)
})
```

Create `tests/asset-history-ui.test.ts`:

```ts
import test from "node:test"
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PANEL = "src/components/assets/asset-history-panel.tsx"
const TAB = "src/components/assets/detail/asset-history-tab.tsx"
const PAGE = "src/app/[locale]/(dashboard)/assets/[id]/page.tsx"
const assetWords = (locale: "th" | "en") => JSON.parse(read(`messages/${locale}.json`)).asset

test("the history panel: radio chips with counts that filter in place, the period select, a month-grouped table, phone cards and 50 rows at a time (spec §7.6)", () => {
  const source = read(PANEL)
  assert.ok(source.startsWith('"use client"'))
  assert.match(source, /const t = useTranslations\("asset"\)/)
  assert.match(source, /const tCommon = useTranslations\("common"\)/)
  assert.match(source, /<fieldset className="min-w-0">\n\s+<legend className="sr-only">\{t\("history\.typeLegend"\)\}<\/legend>/)
  assert.match(source, /<ChoiceChip\s[\s\S]*?type="radio"[\s\S]*?detail=\{formatCount\(/)
  assert.match(source, /label=\{t\("movementFilters\.all"\)\}/, "ทั้งหมด is the existing word (R14)")
  assert.match(source, /label=\{t\(`history\.types\.\$\{category\}`\)\}/)
  assert.match(source, /visibleAssetHistoryChips\(counts, initialType\)/)
  assert.match(source, /<FilterSelect\s[\s\S]*?label=\{t\("history\.period"\)\}[\s\S]*?fieldSize="md"/)
  assert.match(source, /<DataTable framed=\{false\} className="hidden md:block" caption=\{t\("history\.title"\)\} scrollHint=\{tCommon\("tableScrollHint"\)\}>/)
  for (const column of ["at", "event", "detail", "actor", "document"]) assert.ok(source.includes(`t("history.columns.${column}")`), column)
  assert.doesNotMatch(source, /t\("history\.columns\.type"\)/, "the event's own label is headed รายการ (R49); ประเภท is the chip word")
  assert.match(source, /<DataTableGroupRow colSpan=\{5\}>\{group\.monthLabel\}<\/DataTableGroupRow>/)
  assert.match(source, /<TableEmptyRow colSpan=\{5\}>\{t\("history\.emptyFiltered"\)\}<\/TableEmptyRow>/)
  assert.match(source, /<time dateTime=\{row\.atIso\}>/)
  assert.equal(source.match(/<Link href=\{row\.document\.href\}/g)?.length, 2, "the table's code and the phone card")
  assert.match(source, /<div className="md:hidden">/)
  assert.match(source, /pageAssetHistoryRows\(/)
  assert.match(source, /<Button variant="outline"[\s\S]*?\{t\("history\.showMore", \{ count: formatCount\(remaining\) \}\)\}/)
  assert.match(source, /aria-live="polite"/)
  assert.doesNotMatch(source, /historyTab|useRouter|router\.|window\.history|useSearchParams|<button\b|"-"|toLocaleString|formatDateTime|new Date\(/, "a chip never navigates, and dates come from the server")
})

test("the history tab: rows built on the server in Bangkok time, the panel inside a divided panel, the export for the desktop (spec §7.6)", () => {
  const source = read(TAB)
  assert.doesNotMatch(source, /"use client"/)
  assert.match(source, /export async function AssetHistoryTab\(/)
  assert.match(source, /buildAssetHistoryRows\(history\.events, \{ locale, now: new Date\(\), access: documentAccess, label: \(key\) => tAll\(key\) \}\)/)
  assert.match(source, /<ContentPanel\s+divided\s+flush\s+title=\{t\("history\.title"\)\}/)
  assert.match(source, /<a href=\{buildAssetHistoryExportHref\(locale, assetId\)\} download className=\{cn\(buttonVariants\(\{ variant: "outline", size: "md" \}\), "max-md:hidden"\)\}>/)
  assert.match(source, /<AssetHistoryPanel rows=\{rows\} total=\{history\.total\} counts=\{history\.counts\} capped=\{history\.capped\} initialType=\{initialType\} \/>/)
  assert.doesNotMatch(source, /\bid=/, "a tab link carries no anchor, and the history has no section id (R22)")
})

test("the page loads the whole history only on its tab, and the old timeline is gone (spec §7.6, §7.9)", () => {
  const source = read(PAGE)
  assert.match(source, /withPerformanceTiming\("asset-detail\.history-tab", \(\) => getAssetHistory\(asset\.id, locale\)/)
  assert.match(source, /const documentAccess = assetDocumentAccess\(\(module, action\) => hasPermission\(user, module, action\)\)/)
  assert.doesNotMatch(source, /ASSET_MOVEMENT_DOCUMENT_PERMISSION/, "one access record for the overview and the tabs")
  assert.match(source, /parseAssetHistoryType\(rawSearchParams\.type\) \?\? historyType/, "an explicit ?type= wins over view=audit (R17)")
  assert.match(source, /<AssetHistoryTab\b/)
  assert.doesNotMatch(source, /AssetMovementTimeline|knownMovementTypeKeys|getMovement(?:Title|Summary|Tone|Category)\b|build(?:Purchase|Component|Maintenance|Audit)TimelineItems|unifiedTimelineItems|getMovementDisplayLabels|id="movement"|id="audit"|formatAuditState|latestAuditItem|loadPolicy\.(?:movement|auditItem)Limit/)
  assert.equal(existsSync("src/components/assets/asset-movement-timeline.tsx"), false)
})

test("a month group row is a rowgroup header with no fill and no capitals, and the docs say so (DESIGN.md Data Tables)", () => {
  const table = read("src/components/ui/data-table.tsx")
  assert.match(table, /export function DataTableGroupRow\(\{ colSpan, className, children \}: \{ colSpan: number; className\?: string; children: React\.ReactNode \}\)/)
  assert.match(table, /<tr data-slot="data-table-group-row">\n\s+<th scope="rowgroup" colSpan=\{colSpan\} className=\{cn\(dataTableGroupHeadClasses, className\)\}>/)
  const classes = table.match(/const dataTableGroupHeadClasses = "([^"]+)"/)?.[1] ?? ""
  assert.match(classes, /first:pl-4/)
  assert.doesNotMatch(classes, /\bbg-|uppercase/)
  assert.ok(read("DESIGN.md").includes("- **Group rows:** `DataTableGroupRow`"))
  assert.ok(read("docs/14_UI_UX_DESIGN_SYSTEM.md").includes("`DataTableGroupRow`"))
  assert.ok(read(".impeccable/design.json").includes("DataTableGroupRow"))
})

test("the history tab's words, in the one asset.history namespace (spec §7.6; R14; glossary)", () => {
  const th = assetWords("th")
  const en = assetWords("en")
  assert.equal("historyTab" in th, false)
  assert.equal(th.movementFilters.all, "ทั้งหมด")
  assert.deepEqual(th.history.types, { checkout: "ส่งมอบ", checkin: "รับคืน", transfer: "โอนย้าย", audit: "ตรวจนับ", repair: "ซ่อม", disposal: "ตัดจำหน่าย", component: "ส่วนควบ", edit: "แก้ไขข้อมูล" })
  assert.deepEqual(["at", "event", "detail", "actor", "document"].map((key) => th.history.columns[key]), ["วันที่ เวลา", "รายการ", "รายละเอียด", "ผู้บันทึก", "เอกสาร"])
  assert.equal(th.history.title, "ประวัติทั้งหมด")
  assert.equal(th.history.period, "ช่วงเวลา")
  assert.equal(th.history.periodYear, "12 เดือนล่าสุด")
  assert.equal(th.history.export, "ส่งออก Excel")
  assert.equal(th.history.showMore, "แสดงเพิ่ม (เหลือ {count} รายการ)")
  assert.equal(en.history.showMore, "Show more ({count} left)")
})
```

Rewrite these pins in the same commit. Each "today" is master's text unless the row names Task 7's or Task 8's version; where an earlier task rewrote a pin, apply the change to that version.

| Pin | Today | After this task |
|---|---|---|
| `tests/e2e-fixes.test.ts:1-4` | node imports only | adds `import { assetMovementLabelKey, buildAssetMovementDocumentHref } from "../src/lib/asset-movement-labels.ts"` and `import { assetHistoryCategory } from "../src/lib/asset-history-rules.ts"` |
| `tests/e2e-fixes.test.ts:156-162` (FX10) | the page's `transferIds` query and its TR- detail | the code below |
| `tests/e2e-fixes.test.ts:183-196` (FX11) | the cancels in the page's `knownMovementTypeKeys` | the code below |
| `tests/assets-sweep-ui.test.ts:86-97` | the timeline file's markup | deleted with the file. Its rules move to `tests/asset-history-ui.test.ts`: radio `ChoiceChip`s in a `fieldset` with an sr-only legend, an empty row or note, text links, no `<button>` and no `"-"` |
| `tests/assets-sweep-ui.test.ts`, the page test (master :110-133, Task 8's version) | the panel classes ×5, "handover, movement, maintenance, audit and the files tab's purchase documents" | ×3, "handover, maintenance and the files tab's purchase documents" (R25: `#movement` and `#audit` were both on the history tab) |
| the same test | `filterLabel: tCommon("filter"),` ×1, "the movement timeline's" (Task 8's version) | `assert.doesNotMatch(source, /filterLabel: tCommon\("filter"\)/)` |
| `tests/asset-detail-ux.test.ts`, the header test (master :160-179, Task 8's version) | 2 `<DataTable framed={false} caption=`, "the repair and audit tables, until Tasks 9 and 12" | 1, "the repair table, until Task 12" |
| the same test | 2 `<StatStrip` | 1 (the `#audit` strip goes; the repair strip stays until Task 12) |
| the same test | 3 `<KeyValueList`, "the two handover cards and the movement snapshot, until Tasks 9-11" | 2, "the two handover cards, until Task 11" |
| `tests/asset-detail-ux.test.ts:57-65` ("asset detail localizes audit activity…", kept by Task 8) | the page imports the two audit-round label helpers and `getTranslations("auditRound")` | the page's last audit labels go with `#audit` and the timeline (Task 8's ตรวจนับล่าสุด cell labels through `describeAssetAudit` in its own part). The two helper `match` lines read `src/lib/asset-history-rules.ts` (Task 3's `auditItemResultKey`, the history's audit words); the `getTranslations("auditRound")` line reads `src/components/assets/detail/asset-detail-fact-strip.tsx` as `/Translations\("auditRound"\)/`; the two `doesNotMatch` lines stay on the page, plus `assert.doesNotMatch(source, /formatAuditState|tFinding\b/)` |
| `tests/audit-item-status-labels.test.ts:76-79` ("asset page audit history labels reviewed and reconciled items…") | `getAuditItemStatusLabelKey\(status\)` in the page | the `match` reads `src/lib/asset-history-rules.ts` as `/getAuditItemStatusLabelKey\(/` (Task 3 labels a reconciled item `auditFinding.itemStatus_reconciled` and tests it); the `doesNotMatch` stays on the page |
| `tests/asset-detail-anchor-layout.test.ts` (Task 8's version) | `<section id="audit"` exists and `isAssetDetailSectionVisible(assetDetailView, "audit")` | both `audit` lines are deleted, and the test is renamed "the remark is a row of ข้อมูลทรัพย์สิน; the repair section keeps its id until its tab is rebuilt (group 1 asset detail task 9)" |
| `tests/list-frame-guards.test.ts:163` | LV2 `assets/[id]/page.tsx` count 4: "…the parent's tag in the two relationship summaries and the from and to values of the history sentence" (Task 8 keeps 4) | count 2, why "translated-sentence arguments: the parent's tag in the two relationship summaries" (the two of `getMovementSummary` go) |
| `tests/asset-detail-format.test.ts:5,39-51` | imports and tests `compactMovementDetails` | deleted with the function, when no caller is left |
| `tests/performance-route-instrumentation.test.ts:14-21` (Task 8's version) | `asset-detail.initial-data`, `frame-data`, `evidence-data`, `operation-data` | adds `"asset-detail.history-tab"` (R24). `asset-detail.operation-data` stays: the handover reads are still under it until Task 11 |
| `tests/asset-return-navigation.test.ts:44` (Task 8's version) | `searchParams: Promise<\{ returnTo…; view… \}>` | the same type with `; type\?: string \| string\[\]` before ` \}>` |
| `tests/asset-detail-data-boundaries.test.ts`, Task 7's policy test | `getAssetDetailLoadPolicy("history")` is `{ ...preview, movementLimit: 20, checkoutLimit: 10, maintenanceLimit: 10, auditItemLimit: 10 }` | `assert.deepEqual(getAssetDetailLoadPolicy("history"), preview)` (R24: the tab's own loader replaces the interim policy). `preview` loses `movementLimit` and `auditItemLimit`, and `auditFindingLimit` / `disposalLimit` too when their relations go; the comment above the test says Task 9 replaced the history limits |
| `tests/asset-detail-data-boundaries.test.ts:32-43` ("asset detail page applies the active-view load policy…") | a `take: loadPolicy.*Limit` line per relation | the `movementLimit` and `auditItemLimit` lines go, and the `auditFindingLimit` / `disposalLimit` lines with their relations |
| `tests/asset-detail-view.test.ts` (Task 7's version, with Task 8's `purchase-documents`) | the history tab holds `["movement", "audit"]` | `assert.deepEqual(getAssetDetailViewSectionIds("history"), [])`; the sorted list of every section loses `"audit"` and `"movement"`; the lines `isAssetDetailSectionVisible("history", "audit")`, `isAssetDetailSectionVisible("maintenance", "movement")` and `buildAssetDetailSectionHref("th", "a1", "overview", "audit")` are deleted (the `maintenance` line keeps the cross-tab case) |
| `tests/asset-detail-view.test.ts`, Task 7's "the asset page resolves its tab, counts its tabs in the first round of reads, and links photos to the files tab" (Task 8's version) | `/const \{ view: assetDetailView \} = resolveAssetDetailView\(rawSearchParams\.view\)/` | `/const \{ view: assetDetailView, historyType \} = resolveAssetDetailView\(rawSearchParams\.view\)/` (the initial chip, Step 6) |
| `tests/asset-detail-page.test.ts`, Task 8C's "the page composes the parts and reads the frame in one round of parallel queries (spec §5 Performance, §7)" | the same `const \{ view: assetDetailView \}` regex | the same `historyType` regex as the row above |

FX10, after:

```ts
test("a transfer's TR- document is reached from the asset's history (e2e fix task FX10: TX-A4)", () => {
  // Group 1 asset detail task 9: getAssetHistory (task 3) gives a transfer its TR- document, and the history tab links it.
  assert.equal(buildAssetMovementDocumentHref("th", { kind: "transfer", id: "t1", code: "TR-2026-0001" }), "/th/asset-management/transfers/t1")
  assert.match(read("src/lib/asset-history.ts"), /buildAssetMovementDocumentHref\(/)
  assert.equal(read("src/components/assets/asset-history-panel.tsx").match(/<Link href=\{row\.document\.href\}/g)?.length, 2)
  assert.ok(!read("e2e/transactions/transfer.spec.ts").includes(`test.fail(true, "TX-A4: `))
})
```

FX11, after:

```ts
test("a cancel in the asset's history reads in Thai (e2e fix task FX11: TX-A5)", () => {
  // Group 1 asset detail task 9: every movement type is labelled through assetMovementLabelKey, and a cancel counts with
  // its own transaction's type (spec §7.6).
  const th = messages("th").asset.movementTypes as Record<string, string>
  const en = messages("en").asset.movementTypes as Record<string, string>
  for (const [type, category] of [["checkout_cancel", "checkout"], ["checkin_cancel", "checkin"], ["transfer_cancel", "transfer"]] as const) {
    assert.equal(assetMovementLabelKey(type), `asset.movementTypes.${type}`, type)
    assert.equal(assetHistoryCategory(type), category, type)
    assert.ok(th[type] && en[type], type)
  }
  assert.equal(th.checkout_cancel, "ยกเลิกการส่งมอบ")
  assert.equal(th.checkin_cancel, "ยกเลิกการรับคืน")
  assert.equal(th.transfer_cancel, "ยกเลิกการโอนย้าย")
  assert.ok(!read("e2e/transactions/cancel.spec.ts").includes(`test.fail(true, "TX-A5: `))
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/asset-history-view.test.ts tests/asset-history-ui.test.ts tests/e2e-fixes.test.ts tests/assets-sweep-ui.test.ts tests/asset-detail-ux.test.ts tests/audit-item-status-labels.test.ts tests/asset-detail-anchor-layout.test.ts tests/list-frame-guards.test.ts tests/performance-route-instrumentation.test.ts tests/asset-return-navigation.test.ts tests/asset-detail-data-boundaries.test.ts tests/asset-detail-view.test.ts tests/asset-detail-page.test.ts`
Expected: FAIL.
- `asset-history-view` cannot find `../src/lib/asset-history-view.ts`.
- `asset-history-ui` fails with `ENOENT` on the panel and the tab, on the missing `DataTableGroupRow`, and on the missing `asset.history.title`.
- FX10 fails on the missing panel file. FX11 passes already, because Task 3 shipped `assetHistoryCategory`.
- The page counts, the LV2 row, the timing label, the `searchParams` type and the audit-label pins fail, because the page still holds the old sections. The history policy and the section ids fail, because Task 7's interim values are still there.
- The two `resolveAssetDetailView` pins fail, because the page still takes only `view` from it.

- [ ] **Step 3: Add the messages**

Write the change file in the session scratchpad and run `node scripts/messages-edit.mjs <file>`. It sets 10 keys in th and 10 in en, all in Task 3's `asset.history` namespace (R14: one namespace; there is no `asset.historyTab`).

| Key `asset.history.*` | th | en |
|---|---|---|
| `title` | ประวัติทั้งหมด | All history |
| `typeLegend` | ประเภทเหตุการณ์ | Event type |
| `period` | ช่วงเวลา | Period |
| `periodYear` | 12 เดือนล่าสุด | Last 12 months |
| `export` | ส่งออก Excel | Export to Excel |
| `range` | แสดง {shown} จาก {total} รายการ | Showing {shown} of {total} |
| `showMore` | แสดงเพิ่ม (เหลือ {count} รายการ) | Show more ({count} left) |
| `empty` | ยังไม่มีประวัติของทรัพย์สินนี้ | This asset has no history yet |
| `emptyFiltered` | ไม่มีรายการในประเภทและช่วงเวลาที่เลือก | No events of this type in this period |
| `capped` | แสดง {shown} รายการล่าสุดจาก {total} รายการ ส่งออก Excel เพื่อดูรายการที่เก่ากว่า | Showing the latest {shown} of {total} events. Export to Excel to see older ones. |

- Reused, not added (R14):
  - the chip words are Task 3's `asset.history.types.*`;
  - the table head is Task 3's `asset.history.columns.at`, `event`, `detail`, `actor` and `document` (spec §7.6's five columns; the event's own label is headed `columns.event` "รายการ", R49; the Excel's sixth, `columns.type` "ประเภท", is not shown here, because the chips name the category, R17);
  - "ทั้งหมด" is `asset.movementFilters.all`, for the first chip and for the period select's first option.
- None of the new keys collides with Task 3's (`types`, `columns`, `fields`, `auditScan`, `none`, `unknownRecord`, `returnedFrom`, `repairDays`, `exportSheet`).
- `capped` says "older ones", not "all", because the Excel stops at 5,000 events (R15).
- The words were checked against `docs/19_THAI_GLOSSARY.md` and every rule of `tests/thai-glossary.test.ts`. "Excel" is a kept term. "ประเภท" names a kind, as the glossary allows.
- No old key is deleted. `asset.movementSnapshot`, `asset.movementHistory` and `asset.timeline*` lose their reader here (`asset.movementFilters` keeps one in `all`), but no guard counts unused keys, and Task 8 may reuse `asset.latestMovement`.

- [ ] **Step 4: Implement the pure helpers** (`src/lib/asset-history-view.ts`)

Imports: `{ ASSET_HISTORY_CATEGORIES, type AssetHistoryCategory, type AssetHistoryCounts, type AssetHistoryEvent }` from `./asset-history-rules.ts` (Task 3), `{ ASSET_MOVEMENT_DOCUMENT_PERMISSION, type AssetMovementDocumentKind }` from `./asset-movement-labels.ts`, `{ getBangkokDateKey }` from `./preventive-maintenance.ts` and `{ formatAssetDetailDate }` from `./asset-detail-frame-rules.ts` (Task 8B). All four are client-safe: relative `.ts` imports down to modules with type-only Prisma (checked on master for the existing ones: `waiting-work-rules`, `audit-round-result-filters`, `audit-item-status-labels`, `repair-record-policy`, `asset-lifecycle-policy`, `preventive-maintenance`).

- **`parseAssetHistoryType`:** takes the first array item, then accepts only a member of `ASSET_HISTORY_CATEGORIES` (a `Set`, so `"toString"` is not one).
- **`assetDocumentAccess`:** `can(permission.module, "view")` for each entry of `ASSET_MOVEMENT_DOCUMENT_PERMISSION`. These are the document pages' own `requirePagePermission`s, the dashboard's rule (R12).
- **`assetHistoryPeriodStart`:**
  - Take the Bangkok date of `now` with `getBangkokDateKey`, and step back one year. 29 Feb becomes 28 Feb.
  - Return `new Date(\`${date}T00:00:00.000+07:00\`)`.
  - An event is recent when `at >= start`.
- **The time and the month** (the date itself is Task 8B's `formatAssetDetailDate`, the one date formatter of the history tab, R37):
  - `formatHistoryTime`: `Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })`, the same digits in both languages.
  - `formatHistoryMonth`: `Intl.DateTimeFormat(locale === "th" ? "th-TH-u-ca-buddhist" : "en-GB", { timeZone: "Asia/Bangkok", month: "long", year: "numeric" })`, the month group's heading.
- **`buildAssetHistoryRows`:** one row per event, in the events' order.
  - `label = options.label(event.labelKey)`, `atIso = at.toISOString()`.
  - `when = \`${formatAssetDetailDate(at, locale)} · ${formatHistoryTime(at)}\``: the board's "date · time", with the year that `formatAssetDetailDate` always prints.
  - `monthKey = getBangkokDateKey(at).slice(0, 7)`, `monthLabel = formatHistoryMonth`.
  - `recent = at >= assetHistoryPeriodStart(now)`.
  - `document = event.document && access[event.document.kind] ? { code, href } : null`. A person who may not open the page sees neither the link nor the code, as on the dashboard's ล่าสุด (R12).
- **`filterAssetHistoryRows`:** a new array. `type === "all"` or the same category, and `period === "all"` or `recent`.
- **`assetHistoryChipCounts`:**
  - `period === "all"` returns `server` itself, because the events the page holds stop at 500.
  - `"year"` counts the rows that are `recent`.
- **`visibleAssetHistoryChips`:** in `ASSET_HISTORY_CATEGORIES` order, the categories with `counts[category] > 0`, plus `initialType` (R17).
- **`groupAssetHistoryByMonth`:** runs of the same `monthKey`, in order.
- **`pageAssetHistoryRows`:** `shown = rows.slice(0, visible)`, `remaining = Math.max(rows.length - visible, 0)`.
- **`buildAssetHistoryExportHref`:** `` `/api/assets/${encodeURIComponent(assetId)}/history/export?locale=${encodeURIComponent(locale)}` `` (R15). All events, unfiltered (spec §7.6).

- [ ] **Step 5: The group row and its docs**

`src/components/ui/data-table.tsx`, after `DataTableRow`:
- A private `const dataTableGroupHeadClasses`: 13/20 semibold ink in sentence case on the panel colour, with no fill and no capitals (LT1, R7). It has a `border-soft` line under it and the first column's gutters (`first:pl-4 last:pr-4 md:first:pl-5 md:last:pr-5`). The exact classes are the builder's, within DESIGN.md.
- `DataTableGroupRow` renders `<tr data-slot="data-table-group-row">` around `<th scope="rowgroup" colSpan={colSpan} className={cn(dataTableGroupHeadClasses, className)}>{children}</th>`. It has no hover fill. It goes at the head of each group's own `DataTableBody`.
- LT3 counts only `<td colSpan>`, so nothing changes there. `tests/list-primitives-ui.test.ts:76-101` still passes: no hook, no banned class.

The docs:
- DESIGN.md:609, a new bullet after **Empty**: `- **Group rows:** \`DataTableGroupRow\` heads a group of rows inside its own \`DataTableBody\`: a \`<th scope="rowgroup" colSpan>\` in 13/20 semibold ink on the panel color, with no fill and no capitals and the first column's gutters (the asset history groups its events by month). A list that grows in place shows "แสดงเพิ่ม (เหลือ N รายการ)" as an outline button under the table, with the range in a polite live line, instead of \`Pagination\`: its rows are already on the page (the asset history, 50 at a time).`
- docs/14:77, the "A list table" row's notes: append `; a grouped history heads each \`DataTableBody\` with \`DataTableGroupRow\``.
- design.json:461, the "Data Table" description: append ` A grouped history heads each group's body with DataTableGroupRow, a rowgroup header with no fill.`

- [ ] **Step 6: The panel, the tab and the page**

**`AssetHistoryPanel`** (`src/components/assets/asset-history-panel.tsx`, `"use client"`): `useTranslations("asset")` as `t` and `useTranslations("common")` as `tCommon`.
- **State:**
  - `type`: `AssetHistoryCategory | "all"`, starting at `initialType ?? "all"`.
  - `period`: `AssetHistoryPeriod`, starting at `"all"`.
  - `visible`: starting at `ASSET_HISTORY_PAGE_SIZE`.
  - Choosing a chip or a period resets `visible`. Nothing touches the URL: "choosing does not navigate" (spec §7.6).
- **No history at all** (`rows.length === 0`): only `<EmptyNote padded>{t("history.empty")}</EmptyNote>`.
- **Toolbar** (a padded strip with a `border-soft` line under it):
  - `<fieldset className="min-w-0">`, then `<legend className="sr-only">{t("history.typeLegend")}</legend>`, then a wrapping row of radio `ChoiceChip`s.
  - The chips share one `name` from `useId`. The first is "ทั้งหมด" (`label={t("movementFilters.all")}`, R14), then `visibleAssetHistoryChips(counts, initialType)`.
  - Each chip has `label={t(\`history.types.${category}\`)}` and `detail={formatCount(…)}`, from `assetHistoryChipCounts(rows, period, { total, counts })`.
  - Beside the chips: `<FilterSelect label={t("history.period")} fieldSize="md" className="max-md:hidden" value={period} onChange={…} options={[{ value: "all", label: t("movementFilters.all") }, { value: "year", label: t("history.periodYear") }]} />`. There is no period on the phone (spec §7.6: chips, month headings, cards; R17).
- **Capped** (`capped`, over 500 events, R17): `<Notice tone="info">` with `t("history.capped", { shown: formatCount(rows.length), total: formatCount(total) })`.
- **The rows:** `filtered = filterAssetHistoryRows(rows, type, period)`, `{ shown, remaining } = pageAssetHistoryRows(filtered, visible)` and `groups = groupAssetHistoryByMonth(shown)`.
- **Desktop:** `<DataTable framed={false} className="hidden md:block" caption={t("history.title")} scrollHint={tCommon("tableScrollHint")}>`.
  - The head row has five `DataTableHead`s, Task 3's words: `t("history.columns.at")`, `t("history.columns.event")`, `t("history.columns.detail")`, `t("history.columns.actor")`, `t("history.columns.document")`.
  - Empty filter: one `DataTableBody` with `<TableEmptyRow colSpan={5}>{t("history.emptyFiltered")}</TableEmptyRow>`.
  - Otherwise one `DataTableBody` per group: `<DataTableGroupRow colSpan={5}>{group.monthLabel}</DataTableGroupRow>`, then one `DataTableRow` per row:
    - `<time dateTime={row.atIso}>{row.when}</time>` (`num`, no wrap);
    - `row.label` in ink, the event's own label under the รายการ head (R17, R49);
    - `orNil(row.detail)` and `orNil(row.actor)`, muted;
    - the document as `<Link href={row.document.href} className={linkVariants({ size: "inherit" })}><span className="tag">{row.document.code}</span></Link>`, or `<Nil />`.
- **Phone:** `<div className="md:hidden">`, one block per group:
  - an `<h3>` with the month, then `ContentPanelRows` with one `<li>` per row;
  - with a document the person may open, the whole card is `<Link href={row.document.href} …>` with the row hover and the inset focus ring, at least 56px (R17);
  - without one, the same content as a plain card;
  - the card reads "`label` · `when`", then the detail, then "`actor` · `code`";
  - empty filter: `<EmptyNote padded>{t("history.emptyFiltered")}</EmptyNote>`.
- **Foot** (both widths):
  - `<p aria-live="polite" tabIndex={-1} ref={…}>` holding `t("history.range", { shown: formatCount(shown.length), total: formatCount(filtered.length) })`.
  - While `remaining > 0`: `<Button variant="outline" onClick={…}>{t("history.showMore", { count: formatCount(remaining) })}</Button>`, which adds `ASSET_HISTORY_PAGE_SIZE` to `visible`.
  - When a click shows the last rows, the button unmounts, so focus moves to the range line instead of falling to `<body>`.

**`AssetHistoryTab`** (`src/components/assets/detail/asset-history-tab.tsx`, async server):
- `const t = await getTranslations("asset")` and `const tAll = await getTranslations()`. Task 3's `labelKey` is a full key (R2), as `assetMovementLabelKey` returns.
- `const rows = buildAssetHistoryRows(history.events, { locale, now: new Date(), access: documentAccess, label: (key) => tAll(key) })`.
- The tab is `<ContentPanel divided flush title={t("history.title")} actions={…}>` with no wrapper id: a tab link carries no `#anchor` (R22), and the history has no section id after this task.
- `actions`, when `history.total > 0`: `<a href={buildAssetHistoryExportHref(locale, assetId)} download className={cn(buttonVariants({ variant: "outline", size: "md" }), "max-md:hidden")}><FileDown aria-hidden="true" />{t("history.export")}</a>`. This is the register export's form of link (`asset-register-export-menu.tsx:22`). `asset:view` is the page's own gate, and the route checks it again.
- Then `<AssetHistoryPanel rows={rows} total={history.total} counts={history.counts} capped={history.capped} initialType={initialType} />`.

**The page:**
- **`searchParams`:** gains `type?: string | string[]`.
- **The initial chip:** change the page's `const { view: assetDetailView } = resolveAssetDetailView(rawSearchParams.view)` to `const { view: assetDetailView, historyType } = resolveAssetDetailView(rawSearchParams.view)`, then `const initialHistoryType = parseAssetHistoryType(rawSearchParams.type) ?? historyType`. Here `historyType` is Task 7's, from the old `?view=audit`; an explicit `?type=` wins over it (R17).
- **Access:** `const documentAccess = assetDocumentAccess((module, action) => hasPermission(user, module, action))`, once, beside `canEditAsset`. Task 8's overview reads the same record: its inline build over `ASSET_MOVEMENT_DOCUMENT_PERMISSION` becomes this call, and the import of `ASSET_MOVEMENT_DOCUMENT_PERMISSION` leaves the page.
- **The tab's loader (R24), on the history view only:** `const history = await withPerformanceTiming("asset-detail.history-tab", () => getAssetHistory(asset.id, locale), { route: "/assets/[id]", locale })`. No other view reads the whole history (the overview's latest 3 are Task 8's).
- **The interim load goes (R24):**
  - in `src/lib/asset-detail-data.ts`, `getAssetDetailLoadPolicy("history")` returns the preview policy;
  - the main read's `movements` and `auditItems` lose their last readers here, so they go with `movementLimit` and `auditItemLimit` (in the page and in `AssetDetailLoadPolicy`);
  - `auditFindings` and `disposalRequests` (nothing renders them, Task 7's note) go with their limits too, when tsc and lint find no reader.
- **The sections go (R23, R25):** `"movement"` and `"audit"` leave `AssetDetailSectionId` and the section map in `src/lib/asset-detail-view.ts`; the history view's list is `[]`. After Task 8 no `sectionHref("movement")` or `sectionHref("audit")` is left: their callers were the follow-up and activity panels (P:809, :838, :882), which Task 8 deleted.
- **Render:** under `assetDetailView === "history"`, `<AssetHistoryTab assetId={asset.id} locale={locale} history={history} initialType={initialHistoryType} documentAccess={documentAccess} />` replaces the old `#movement` and `#audit` sections and their `isAssetDetailSectionVisible` guards. The ตรวจนับ chip and the fact strip replace the audit view (spec §7.9).
- **Delete what only the old timeline and these sections read:**
  - the parts named in **Files**;
  - `componentHistory` / `componentHistoryForPanel` and the `installedByLabel` / `removedByLabel` fields with the `componentUsers` read, when no other reader is left (the evidence attachments stay for Task 11);
  - `formatAuditState`, `tAudit`, `tFinding`, `latestAuditItem`, `auditSummary` and the two audit-round label imports and `getAuditItemStatusLabelKey` (Task 8's ตรวจนับล่าสุด cell labels through `describeAssetAudit` in its own part);
  - every import, type and relation of the main read whose last reader goes.

  tsc and `npm run lint` (no-unused-vars) find what is left. Each symbol whose last reader goes is removed, with the pin that names it (Step 1's table).
- **Kept:** `getCheckoutDestination`, `getAssetHandoverModeLabel` and the `asset-detail.operation-data` reads of handover attachments, departments, locations and parent assets. `#handover` still uses them until Task 11 (`tests/asset-handover-presentation.test.ts:9-15` and the page test's outline `sm` count and `getCheckoutDestination` line in `tests/assets-sweep-ui.test.ts` are unchanged).

Delete `src/components/assets/asset-movement-timeline.tsx`.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `node --test tests/asset-history-view.test.ts tests/asset-history-ui.test.ts tests/asset-history-rules.test.ts tests/e2e-fixes.test.ts tests/assets-sweep-ui.test.ts tests/asset-detail-ux.test.ts tests/audit-item-status-labels.test.ts tests/asset-detail-anchor-layout.test.ts tests/asset-detail-data-boundaries.test.ts tests/asset-detail-view.test.ts tests/asset-detail-page.test.ts tests/asset-detail-format.test.ts tests/list-frame-guards.test.ts tests/list-primitives-ui.test.ts tests/performance-route-instrumentation.test.ts tests/asset-return-navigation.test.ts tests/asset-handover-presentation.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts tests/dark-mode-docs.test.ts tests/phase2d-docs.test.ts && npm test && npx tsc --noEmit && npm run lint`
Expected: PASS. tsc is clean and lint reports 0 errors.

E2E steps this task moves under them, for Task 13 (not edited here):
- `e2e/transactions/cancel.spec.ts:77-83` opens `view=operations`, which now lands on this tab. The cancel's row reads "ยกเลิกการส่งมอบ", which still matches `/ยกเลิก.*ส่งมอบ/`. `main` still contains "ส่งมอบทรัพย์สิน", the checkout's own label in the รายการ column. But `.first()` can pick the copy hidden at that width, so the step must take the visible one.
- `e2e/transactions/transfer.spec.ts:93-99` now finds every TR- link twice. Its `> 0` still holds for the IT staff, who may open transfers (R12: without `ASSET_MOVEMENT_DOCUMENT_PERMISSION.transfer`, no code shows).

- [ ] **Step 8: Commit**

```bash
git add src/lib/asset-history-view.ts src/components/assets/asset-history-panel.tsx src/components/assets/detail/asset-history-tab.tsx src/components/assets/asset-movement-timeline.tsx src/components/ui/data-table.tsx "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" src/lib/asset-detail-view.ts src/lib/asset-detail-data.ts src/lib/asset-detail-format.ts DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md .impeccable/design.json messages/th.json messages/en.json tests/asset-history-view.test.ts tests/asset-history-ui.test.ts tests/e2e-fixes.test.ts tests/assets-sweep-ui.test.ts tests/asset-detail-ux.test.ts tests/audit-item-status-labels.test.ts tests/asset-detail-anchor-layout.test.ts tests/list-frame-guards.test.ts tests/asset-detail-format.test.ts tests/performance-route-instrumentation.test.ts tests/asset-return-navigation.test.ts tests/asset-detail-data-boundaries.test.ts tests/asset-detail-view.test.ts tests/asset-detail-page.test.ts
git commit -m "feat(asset-detail): one history with type chips, the period, month groups, 50 at a time and the Excel export (group 1 asset detail task 9)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Leave out of `git add` any listed test file that this task did not change. The deleted timeline file is staged by its path.

- [ ] **Step 9 (the controller, after Task 13's E2E run; not the implementer): look at the tab**

In the session of Task 8's look (the run's build and `next start`, the IT staff's state), screenshot `/th/assets/<an asset with history>?view=history` at 1440×900 and 390×844, in light and dark.
- Compare it with `B-Detail-history.dc.html` and `B-Detail-history-Phone.dc.html`: the chips and their counts, the period and the export on the desktop only, the month group rows, the phone cards and "แสดงเพิ่ม".
- Open `?view=audit` too. The ตรวจนับ chip must be chosen. `?view=audit&type=repair` must choose ซ่อม (R17).
- The date column reads "12 ต.ค. 2569 · 17:05", the date as in the fact strip and the overview (R37).

What differs goes to the implementer as one fix round, `fix(asset-detail): … (group 1 asset detail task 9 fix 1)`. Delete the screenshots after the report, and never commit them.

---

### Task 10: The components tab

**Amendment (controller, R51):** the install/remove table's dates use `formatAssetDetailDate` (Task 8B), as drafted, matching the history tab's dates for the same events.

**Files:**
- Create: `src/components/assets/detail/asset-relationship-map.tsx` (server-safe, no directive). It takes `AssetRelationshipMap` and its parts out of the page as they are, plus an `actions` slot. From the page (master): `RelationshipLink` :119, :1862-2237 (`AssetRelationshipMap` through `getRelationshipCardClass`) and `RelationshipState` / `RelationshipCardVariant` :2194-2195.
- Create: `src/components/assets/detail/asset-components-tab.tsx` (async server: the map's labels, the manage link and the install/remove history)
- Create: `src/lib/asset-component-history-rules.ts` (pure; relative `.ts` imports only)
- Create: `src/lib/asset-component-history.ts` (server)
- Not here (R13): the shared document reader `src/lib/asset-movement-documents.ts`, the `AssetMovementReference` type and the switch of `src/lib/dashboard-recent.ts` to it are Task 3's. This task consumes them.
- Delete: `src/components/assets/asset-components-summary.tsx` (its only caller is the page)
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`. Master lines; find them by name after Task 8 and Task 9:
  - :53 (`AssetComponentsSummary`) and :69 (`splitRelationshipPreview`) imports, plus the lucide icons only the map used
  - :1178-1257 (the `#components` block becomes `<AssetComponentsTab … />` under the same view guard)
  - :1862-2237 (moved out)
  - :2697-2703 (`formatLicenseRelationshipRole` moves to the tab)
  - `#ownership` (:1156-1176) is not here: Task 8 removed it (R23, R25)
- Modify: `messages/th.json`, `messages/en.json` (only through `node scripts/messages-edit.mjs`)
- Test:
  - `tests/asset-component-history-rules.test.ts` (new, behaviour)
  - `tests/asset-components-tab-ui.test.ts` (new, source pins)
  - the pins in Step 1's table: `tests/asset-relationship-map-ui.test.ts:15-45`, `tests/assets-sweep-ui.test.ts` (both components summary tests, which go with the file, and the page test, Task 8's versions), `tests/asset-detail-ux.test.ts` (three tests, Task 8's versions), `tests/list-frame-guards.test.ts:163`, `tests/performance-route-instrumentation.test.ts:14-21` (Task 9's version)
- **`#handover` stays where Task 8 put it, after the two new panels** (R25). Task 11 replaces it with "หลักฐานจากงานอื่น". Removing it here would hide the handover photos until then.
- No skeleton change (a tab's content has none), no schema change, no E2E change.

**Interfaces:**
- Consumes:
  - Task 3 (R13):
    - `resolveAssetMovementDocuments(references: readonly AssetMovementReference[]): Promise<(reference: AssetMovementReference) => AssetMovementDocument | null>` (`src/lib/asset-movement-documents.ts`), each reference's document (number, id, kind), read once per kind present;
    - `type AssetMovementReference = { referenceType: string | null; referenceId: string | null }` (`src/lib/asset-movement-labels.ts`).
  - Task 8B: `formatAssetDetailDate(date: Date, locale: string): string` (`src/lib/asset-detail-frame-rules.ts`), the detail page's one date formatter (R37).
  - Task 9: the page's `documentAccess: Record<AssetMovementDocumentKind, boolean>` (`assetDocumentAccess`, R12).
  - Task 7: the view `"components"` and its section id `"components"`. The page's `componentsManagerHref` returns to `?view=components` with the detail's own `returnTo` (R22).
  - Task 8: the page's components render site and what it already loads:
    - `installedInLinksForPanel`, with each `parentHref` carrying `returnTo` (the map's parent links, as today);
    - `currentComponentsForPanel`, `licenseAssignedAsset`, `asset.assignedLicenses` and `asset.custodian`;
    - `canEditAsset` and `componentsManagerHref`.
  - Dashboard plan (`src/lib/asset-movement-labels.ts`): `assetMovementLabelKey`, `buildAssetMovementDocumentHref`, `type AssetMovementDocument`, `type AssetMovementDocumentKind`.
  - Shared parts: `ContentPanel` (both kinds), `ContentPanelRows`, `DataTable` parts, `EmptyNote`, `Nil`, `buttonVariants`, `linkVariants`.
- Produces:
  - In `src/lib/asset-component-history-rules.ts`:
    - `type AssetComponentHistoryAsset = { id: string; assetTag: string; name: string; isActive: boolean }`
    - `type AssetComponentLinkRow = AssetMovementReference & { id: string; parentAssetId: string; componentAssetId: string; installedAt: Date; removedAt: Date | null; reason: string | null; parentAsset: AssetComponentHistoryAsset; componentAsset: AssetComponentHistoryAsset }`
    - `type AssetComponentHistoryKind = "component_install" | "component_remove" | "installed_in_parent" | "removed_from_parent"`. These are the movement types, so `assetMovementLabelKey(kind)` labels them.
    - `type AssetComponentHistoryEvent = { id: string; at: Date; kind: AssetComponentHistoryKind; other: AssetComponentHistoryAsset; reason: string | null; document: AssetMovementDocument | null }`
    - `buildAssetComponentHistory(rows: readonly AssetComponentLinkRow[], assetId: string, documentOf: (reference: AssetMovementReference) => AssetMovementDocument | null): AssetComponentHistoryEvent[]`
    - `assetComponentHistoryColumn(events: readonly Pick<AssetComponentHistoryEvent, "kind">[]): "component" | "parent" | "related"`
  - In `src/lib/asset-component-history.ts`: `getAssetComponentHistory(assetId: string): Promise<AssetComponentHistoryEvent[]>`.
  - In `src/components/assets/detail/asset-relationship-map.tsx`:
    - `type RelationshipLink = { id: string; href: string; label: string; role: string }`
    - `AssetRelationshipMap(props)`, with today's props (P:1862-1926) plus `actions?: React.ReactNode`.
  - In `src/components/assets/detail/asset-components-tab.tsx`:
    - `type AssetRelationshipAsset = { id: string; href: string; assetTag: string; name: string; role: string; slotNo: string | null }`
    - `AssetComponentsTab({ locale, asset, parents, components, licenseDevice, assignedLicenses, manageHref, history, documentAccess }: { locale: string; asset: { id: string; assetTag: string; name: string; custodianName: string | null }; parents: AssetRelationshipAsset[]; components: AssetRelationshipAsset[]; licenseDevice: { id: string; assetTag: string; name: string } | null; assignedLicenses: { id: string; assetTag: string; name: string; licenseUsedSeats: number | null; licenseTotalSeats: number | null }[]; manageHref: string | null; history: AssetComponentHistoryEvent[]; documentAccess: Record<AssetMovementDocumentKind, boolean> })`. It is an async server component.

- [ ] **Step 1: Write the failing tests**

Create `tests/asset-component-history-rules.test.ts`:

```ts
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  assetComponentHistoryColumn,
  buildAssetComponentHistory,
  type AssetComponentLinkRow,
} from "../src/lib/asset-component-history-rules.ts"

const at = (iso: string) => new Date(iso)
const asset = (id: string, assetTag: string, name: string, isActive = true) => ({ id, assetTag, name, isActive })
const A = asset("A", "GRL-COM-26-0017", "Notebook")
const C1 = asset("C1", "GRL-COM-26-0017-03", "RAM 8GB DDR5")
const C2 = asset("C2", "GRL-COM-26-0017-02", "Mouse ไร้สาย", false)
const P = asset("P", "GRL-NVR-26-0001", "NVR")
const P2 = asset("P2", "GRL-NVR-25-0004", "NVR เดิม")
const link = (row: Partial<AssetComponentLinkRow> & Pick<AssetComponentLinkRow, "id" | "parentAsset" | "componentAsset" | "installedAt">): AssetComponentLinkRow => ({
  parentAssetId: row.parentAsset.id,
  componentAssetId: row.componentAsset.id,
  removedAt: null,
  reason: null,
  referenceType: null,
  referenceId: null,
  ...row,
})
const repair = { kind: "repair" as const, id: "t1", code: "MT-20260802-0001" }
const documentOf = ({ referenceType, referenceId }: { referenceType: string | null; referenceId: string | null }) =>
  referenceType === "maintenance" && referenceId === "t1" ? repair : null

const rows = [
  link({ id: "l2", parentAsset: A, componentAsset: C2, installedAt: at("2026-01-10T03:00:00Z") }),
  link({ id: "l1", parentAsset: A, componentAsset: C1, installedAt: at("2026-01-10T03:00:00Z"), removedAt: at("2026-08-02T04:00:00Z"), reason: "ระหว่างงานซ่อม", referenceType: "maintenance", referenceId: "t1" }),
  link({ id: "l3", parentAsset: P, componentAsset: A, installedAt: at("2026-03-01T02:00:00Z"), reason: "ติดตั้งตอนสร้างทรัพย์สิน", referenceType: "asset_component", referenceId: "l3" }),
  link({ id: "l4", parentAsset: P2, componentAsset: A, installedAt: at("2025-05-01T02:00:00Z"), removedAt: at("2025-12-01T02:00:00Z"), reason: "ย้ายไปเครื่องใหม่" }),
  link({ id: "stray", parentAsset: P, componentAsset: C1, installedAt: at("2026-02-01T02:00:00Z") }),
]

test("install and remove events from both sides, newest first; a row's one reason and reference belong to its latest event (spec §7.7)", () => {
  assert.deepEqual(buildAssetComponentHistory(rows, "A", documentOf), [
    { id: "l1:remove", at: at("2026-08-02T04:00:00Z"), kind: "component_remove", other: C1, reason: "ระหว่างงานซ่อม", document: repair },
    { id: "l3:install", at: at("2026-03-01T02:00:00Z"), kind: "installed_in_parent", other: P, reason: "ติดตั้งตอนสร้างทรัพย์สิน", document: null },
    { id: "l1:install", at: at("2026-01-10T03:00:00Z"), kind: "component_install", other: C1, reason: null, document: null },
    { id: "l2:install", at: at("2026-01-10T03:00:00Z"), kind: "component_install", other: C2, reason: null, document: null },
    { id: "l4:remove", at: at("2025-12-01T02:00:00Z"), kind: "removed_from_parent", other: P2, reason: "ย้ายไปเครื่องใหม่", document: null },
    { id: "l4:install", at: at("2025-05-01T02:00:00Z"), kind: "installed_in_parent", other: P2, reason: null, document: null },
  ])
  const same = link({ id: "l5", parentAsset: A, componentAsset: C1, installedAt: at("2026-04-01T02:00:00Z"), removedAt: at("2026-04-01T02:00:00Z") })
  assert.deepEqual(buildAssetComponentHistory([same], "A", documentOf).map((event) => event.id), ["l5:remove", "l5:install"], "at one instant the removal reads first")
  assert.deepEqual(buildAssetComponentHistory([], "A", documentOf), [])
})

test("the third column names what the rows hold: components, a parent, or both (spec §7.7)", () => {
  assert.equal(assetComponentHistoryColumn([{ kind: "component_install" }, { kind: "component_remove" }]), "component")
  assert.equal(assetComponentHistoryColumn([{ kind: "installed_in_parent" }, { kind: "removed_from_parent" }]), "parent")
  assert.equal(assetComponentHistoryColumn([{ kind: "component_install" }, { kind: "installed_in_parent" }]), "related")
  assert.equal(assetComponentHistoryColumn([]), "component")
})

test("the component history rules are pure", () => {
  const source = readFileSync("src/lib/asset-component-history-rules.ts", "utf8")
  assert.doesNotMatch(source, /from "@\//)
  assert.doesNotMatch(source, /\bprisma\./)
})
```

Create `tests/asset-components-tab-ui.test.ts`:

```ts
import test from "node:test"
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const MAP = "src/components/assets/detail/asset-relationship-map.tsx"
const TAB = "src/components/assets/detail/asset-components-tab.tsx"
const PAGE = "src/app/[locale]/(dashboard)/assets/[id]/page.tsx"

test("the relationship map moved as it was, with an actions slot (spec §7.7, plan 2D-2 R2/R3)", () => {
  const map = read(MAP)
  assert.doesNotMatch(map, /"use client"|getTranslations|useTranslations/, "server-safe; the labels come from the tab")
  assert.match(map, /export function AssetRelationshipMap\(/)
  assert.match(map, /export type RelationshipLink = \{ id: string; href: string; label: string; role: string \}/)
  assert.match(map, /<ContentPanel title=\{title\} description=\{subtitle\} actions=\{actions\}>/)
  assert.match(map, /<Notice tone="neutral" className="mt-4">\{noteLabel\}<\/Notice>/)
  assert.match(map, /<Chip>\{roleLabel\}<\/Chip>/)
  assert.match(map, /<div className="font-mono text-sm font-medium leading-5 text-foreground \[overflow-wrap:anywhere\]">\{relationshipAsset\.assetTag\}<\/div>/, "a tag that must wrap keeps font-mono at 500 (2D-2 R3)")
  assert.doesNotMatch(map, /getRelationship(?:Summary|Badge|Icon)Class|uppercase|border-dashed|hover:underline|primary-soft|\btext-xs\b|"-"/)
})

test("the components tab: the map with the custodian on the current card and the manager link for editors, then the install and remove history (spec §7.7)", () => {
  const tab = read(TAB)
  assert.doesNotMatch(tab, /"use client"/)
  assert.match(tab, /export async function AssetComponentsTab\(/)
  assert.match(tab, /<div id="components" className="scroll-mt-24 space-y-6">/)
  assert.match(tab, /currentMetaLabel=\{t\("custodian"\)\}/)
  assert.match(tab, /currentMetaValue=\{asset\.custodianName \?\? t\("noCustodian"\)\}/)
  assert.doesNotMatch(tab, /currentMetaLabel=\{t\("category"\)\}/)
  assert.match(tab, /manageHref \? \(\s*<Link href=\{manageHref\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>\s*<PackagePlus aria-hidden="true" \/>\s*\{t\("manageComponents"\)\}/)
  assert.match(tab, /t\("componentsTab\.roleWithSlot", \{ role: \w+\.role, slot: \w+\.slotNo \}\)/)
  assert.equal(tab.match(/\?\? "-"/g)?.length, 2, "only the parent's tag in the two relationship summaries (LV2 row)")
  assert.match(tab, /<ContentPanel divided flush title=\{t\("componentsTab\.historyTitle"\)\}>/)
  assert.match(tab, /<EmptyNote padded>\{t\("componentsTab\.historyEmpty"\)\}<\/EmptyNote>/)
  assert.match(tab, /<DataTable framed=\{false\} className="hidden md:block" caption=\{t\("componentsTab\.historyTitle"\)\} scrollHint=\{tCommon\("tableScrollHint"\)\}>/)
  assert.match(tab, /<ContentPanelRows className="md:hidden">/)
  assert.match(tab, /assetComponentHistoryColumn\(history\)/)
  assert.match(tab, /formatAssetDetailDate\(event\.at, locale\)/, "the detail page's one date formatter (R37)")
  assert.match(tab, /tAll\(assetMovementLabelKey\(event\.kind\)\)/)
  assert.match(tab, /event\.other\.isActive \?/)
  assert.match(tab, /event\.document && documentAccess\[event\.document\.kind\]/)
  assert.match(tab, /buildAssetMovementDocumentHref\(locale, event\.document\)/)
})

test("the history reads both sides of every link once, and its documents once per kind (spec §5 Performance)", () => {
  const history = read("src/lib/asset-component-history.ts")
  assert.match(history, /export async function getAssetComponentHistory\(assetId: string\): Promise<AssetComponentHistoryEvent\[\]>/)
  assert.match(history, /prisma\.assetComponent\.findMany\(\{\s*where: \{ OR: \[\{ parentAssetId: assetId \}, \{ componentAssetId: assetId \}\] \}/)
  assert.match(history, /const documentOf = await resolveAssetMovementDocuments\(rows\)/)
  assert.match(history, /return buildAssetComponentHistory\(rows, assetId, documentOf\)/)
  assert.doesNotMatch(history, /\.(create|update|upsert|delete)(Many)?\(/)
})

test("the page passes what it loaded, gates the manager link, and keeps no summary panel (spec §7.7, §7.9)", () => {
  const page = read(PAGE)
  assert.match(page, /<AssetComponentsTab\b/)
  assert.match(page, /manageHref=\{canEditAsset \? componentsManagerHref : null\}/)
  assert.match(page, /custodianName: asset\.custodian\?\.fullNameTh \?\? null/)
  assert.match(page, /withPerformanceTiming\("asset-detail\.components-tab", \(\) => getAssetComponentHistory\(asset\.id\)/)
  assert.doesNotMatch(page, /AssetComponentsSummary|function AssetRelationshipMap|function RelationshipAssetCard|formatLicenseRelationshipRole/)
  assert.equal(existsSync("src/components/assets/asset-components-summary.tsx"), false)
})

test("the components tab's words (spec §7.7; glossary)", () => {
  const th = JSON.parse(read("messages/th.json")).asset
  assert.equal(th.custodian, "ผู้ถือครอง")
  assert.deepEqual(th.componentsTab, {
    historyTitle: "ประวัติการติดตั้ง / ถอด",
    columnDate: "วันที่",
    columnEvent: "เหตุการณ์",
    columnComponent: "ส่วนควบ",
    columnParent: "ทรัพย์สินหลัก",
    columnRelated: "ทรัพย์สินที่เกี่ยวข้อง",
    columnNote: "หมายเหตุ",
    historyEmpty: "ยังไม่เคยติดตั้งหรือถอดส่วนควบ",
    roleWithSlot: "{role} · ช่อง {slot}",
  })
})
```

Rewrite these pins in the same commit. Where Task 8 or Task 9 already changed one, apply the change to their version.

| Pin | Today | After this task |
|---|---|---|
| `tests/asset-relationship-map-ui.test.ts:15-31` | reads the page | reads the map (`map`) and the tab (`tab`), as below |
| `tests/asset-relationship-map-ui.test.ts:33-45` | slices the page from `function RelationshipAssetCard` to `function RelationshipLinkList` | the same slice of the map file, with the same five assertions |
| `tests/assets-sweep-ui.test.ts`, "components summary: a ContentPanel, codes as tag, text links, a warning StatusBadge and EmptyNote …" (master :70-84; Task 8 deleted its banner lines with the banner, R36) | the summary's ContentPanel, button, warning badge, EmptyNote and tags | the whole test goes with the summary file |
| `tests/assets-sweep-ui.test.ts`, "components summary: on a phone the serial goes under the component instead of squeezing its name (plan 2D-3 Task 20 fix)" (master :277-282) | reads the summary file: the row's phone classes and its `SN:` line | the whole test goes with the summary file (the serial line leaves with the summary; the map's cards and the install/remove table replace it) |
| `tests/assets-sweep-ui.test.ts`, the page test (Task 8's version, then Task 9's) | `<ContentPanel\b` ×1, "the relationship map" | `assert.doesNotMatch(source, /<ContentPanel\b/)`: the map's panel moves to the map file. The panel-class count (3 after Task 9) is unchanged: `#ownership` went in Task 8 (R25) |
| the same test | the map's `<Notice tone="neutral" className="mt-4">{noteLabel}</Notice>`, `<Chip>{roleLabel}</Chip>` and font-mono tag in the page | deleted here. They are pinned on the map file in `tests/asset-components-tab-ui.test.ts` |
| `tests/asset-detail-ux.test.ts`, "asset detail reaches component management from the components tab and อื่น ๆ" (Task 8's version) | `manageHref=\{componentsManagerHref\}` | `assert.match(source, /manageHref=\{canEditAsset \? componentsManagerHref : null\}/)` |
| `tests/asset-detail-ux.test.ts`, "asset detail exposes a read-only component summary and manager link" (master :80-86, kept by Task 8) | the page renders `AssetComponentsSummary` | the code below |
| `tests/asset-detail-ux.test.ts`, "asset component parent links preserve context" (Task 8's version) | `summarySource` has `parentHref`, `roleLabel`, `slotLabel` | the `summarySource` lines are deleted with the file. The page's `parentHref: appendReturnTo(…currentAssetDetailHref)` and `href: link.parentHref` lines stay: the page still builds `parents` from `installedInLinksForPanel` |
| `tests/list-frame-guards.test.ts:163` | LV2 page row (2 after Task 9) | deleted when the page's count reaches 0. A new row is added: ``[`${C}assets/detail/asset-components-tab.tsx`]: { count: 2, kind: "permanent", why: "translated-sentence arguments: the parent's tag in the two relationship summaries", ruling: "2B R-n" }`` |
| `tests/performance-route-instrumentation.test.ts:14-21` (Task 9's version) | — | adds `"asset-detail.components-tab"` (R24) |

`tests/asset-relationship-map-ui.test.ts:15-31`, after:

```ts
test("asset detail relationship map has explicit role summary and relationship lanes", () => {
  const map = readFileSync("src/components/assets/detail/asset-relationship-map.tsx", "utf8")
  const tab = readFileSync("src/components/assets/detail/asset-components-tab.tsx", "utf8")

  assert.match(map, /getRelationshipState\(/)
  assert.match(map, /RelationshipSummaryBadge/)
  assert.match(tab, /relationshipParentLane/)
  assert.match(tab, /relationshipCurrentViewing/)
  assert.match(tab, /relationshipComponentsCount/)
  assert.match(map, /RelationshipEmptyState/)
  assert.match(tab, /relationshipNoParentHelp/)
  assert.match(tab, /relationshipNoComponentsHelp/)
  assert.match(map, /md:grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1\.1fr\)_auto_minmax\(0,1fr\)\]/)
  assert.match(map, /ArrowDown/)
  assert.match(map, /splitRelationshipPreview\(childLinks\)/)
  assert.match(map, /<details/)
  assert.match(tab, /relationshipMoreItems/)
})
```

`tests/asset-detail-ux.test.ts`, "asset detail exposes a read-only component summary and manager link", after (import `existsSync` too):

```ts
test("asset detail's components tab is the relationship map with the manager link, without the summary panel", () => {
  const source = assetDetailSource()

  assert.match(source, /<AssetComponentsTab\b/)
  assert.match(source, /assets\/\$\{asset\.id\}\/components/)
  assert.doesNotMatch(source, /AssetComponentsSummary|<AssetComponentsPanel/)
  assert.equal(existsSync("src/components/assets/asset-components-summary.tsx"), false)
})
```

`tests/dashboard-overview.test.ts` is not touched here: Task 3 rewrote its feed pin and pinned the shared reader (R13).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/asset-component-history-rules.test.ts tests/asset-components-tab-ui.test.ts tests/asset-relationship-map-ui.test.ts tests/assets-sweep-ui.test.ts tests/asset-detail-ux.test.ts tests/list-frame-guards.test.ts tests/performance-route-instrumentation.test.ts`
Expected: FAIL.
- The rules test cannot find `../src/lib/asset-component-history-rules.ts`.
- The UI tests fail with `ENOENT` on the map, the tab and `asset-component-history.ts`.
- The page still renders the summary and the map.
- The LV2 rows and the timing label do not match yet.

- [ ] **Step 3: Add the messages**

Run `node scripts/messages-edit.mjs <file>` with a change file in the scratchpad. It sets 9 keys in th and 9 in en, under `asset.componentsTab`.

| Key `asset.componentsTab.*` | th | en |
|---|---|---|
| `historyTitle` | ประวัติการติดตั้ง / ถอด | Install and remove history |
| `columnDate` | วันที่ | Date |
| `columnEvent` | เหตุการณ์ | Event |
| `columnComponent` | ส่วนควบ | Component |
| `columnParent` | ทรัพย์สินหลัก | Parent asset |
| `columnRelated` | ทรัพย์สินที่เกี่ยวข้อง | Related asset |
| `columnNote` | หมายเหตุ | Note |
| `historyEmpty` | ยังไม่เคยติดตั้งหรือถอดส่วนควบ | No component has been installed or removed yet |
| `roleWithSlot` | {role} · ช่อง {slot} | {role} · slot {slot} |

- The event names are the movement labels already in `asset.movementTypes`: "ติดตั้งส่วนควบ", "ถอดส่วนควบ", "ถูกติดตั้งเป็นส่วนควบ" and "ถูกถอดจากทรัพย์สินหลัก".
- The current card's label is `asset.custodian` "ผู้ถือครอง", and its empty value is `asset.noCustodian` "ไม่มีผู้ถือครอง".
- The words were checked against `docs/19_THAI_GLOSSARY.md` and `tests/thai-glossary.test.ts`.
- The summary's keys are not deleted: `componentSummaryHelp`, `currentComponents`, `noCurrentComponents`, `installedInParent` and `componentMissingSerial` (Task 7 or 8 may use the last one for the tab's warning).

- [ ] **Step 4: The history rules and their read**

The document reader is Task 3's `resolveAssetMovementDocuments` (`src/lib/asset-movement-documents.ts`, R13), already used by the dashboard's feed and `getAssetHistory`. It reads only the kinds present, one `findMany` each, and an empty list or one with no known reference reads nothing. This task calls it and moves nothing.

- **`buildAssetComponentHistory`** (`src/lib/asset-component-history-rules.ts`; imports types only, `AssetMovementDocument` and Task 3's `AssetMovementReference`, from `./asset-movement-labels.ts`). For each row whose `parentAssetId` or `componentAssetId` is `assetId` (other rows are skipped):
  - `parentSide = row.parentAssetId === assetId`, `other = parentSide ? row.componentAsset : row.parentAsset`.
  - `latest` is the removal when `removedAt` is set, else the installation. The row keeps one `reason` and one reference. The remove API keeps the install's reason and reference when the removal gives none (`?? existing.*`, `components/[componentId]/route.ts:44-46`), so the row's one reason is the removal's when given, else the install's. They go on `latest`.
  - A removal made without its own reason therefore shows the install's note, as the link row holds it.
  - The installation is `{ id: \`${row.id}:install\`, at: installedAt, kind: parentSide ? "component_install" : "installed_in_parent", other }`.
  - The removal, only with `removedAt`, is `{ id: \`${row.id}:remove\`, at: removedAt, kind: parentSide ? "component_remove" : "removed_from_parent", other }`.
  - `latest` gets `reason` and `document: documentOf(row)`. The other event gets `reason: null, document: null`.
  - Sort by `at` descending. Ties go removal first, then by row id ascending.
- **`assetComponentHistoryColumn`:** `"related"` when both sides occur, `"parent"` when only `installed_in_parent` / `removed_from_parent` occur, else `"component"`.
- **`getAssetComponentHistory`** (`src/lib/asset-component-history.ts`):
  - `prisma.assetComponent.findMany({ where: { OR: [{ parentAssetId: assetId }, { componentAssetId: assetId }] }, select: { id, parentAssetId, componentAssetId, installedAt, removedAt, reason, referenceType, referenceId, parentAsset: { select: { id, assetTag, name, isActive } }, componentAsset: { select: { id, assetTag, name, isActive } } } })`, with no `take`. The dev data holds at most 7 links per parent, 2.1 on average (SELECT, 2026-10-26).
  - `const documentOf = await resolveAssetMovementDocuments(rows)` (Task 3's, imported from `@/lib/asset-movement-documents`), then `return buildAssetComponentHistory(rows, assetId, documentOf)`.

- [ ] **Step 5: The map, the tab and the page**

**`src/components/assets/detail/asset-relationship-map.tsx`:**
- The page's map, lanes, connector, summary line, empty state, card and link list, with their helpers and types, moved without change. Their imports move with them.
- One addition: an optional `actions?: React.ReactNode` prop, passed to `<ContentPanel title={title} description={subtitle} actions={actions}>`.

**`AssetComponentsTab`:**
- `getTranslations("asset")` as `t`, `getTranslations("common")` as `tCommon`, and `getTranslations()` as `tAll`, for the movement keys.
- **The links:** built from the props, with the call site of P:1199-1254 moved here as it is:
  - each parent and component becomes a `RelationshipLink` with `label: \`${assetTag} - ${name}\``;
  - `role` is `slotNo ? t("componentsTab.roleWithSlot", { role: item.role, slot: item.slotNo }) : item.role`. The slot of the deleted summary moves into the role chip;
  - the licence links (`/${locale}/assets/${id}`), with `formatLicenseRelationshipRole` moved from the page;
  - the summaries with `parents[0]?.assetTag ?? "-"`, the two `"-"` of the new LV2 row.
- **Markup:** `<div id="components" className="scroll-mt-24 space-y-6">`, holding:
  - **The map,** with `currentMetaLabel={t("custodian")}` and `currentMetaValue={asset.custodianName ?? t("noCustodian")}` (spec §7.7, the board's "ผู้ถือครอง : …").
    - `actions={manageHref ? (<Link href={manageHref} className={buttonVariants({ variant: "outline", size: "md" })}><PackagePlus aria-hidden="true" />{t("manageComponents")}</Link>) : undefined}`. It is outline because the header holds the page's primary.
    - The map always renders, including the standalone state with its own sentence and the two empty lanes. Today it is skipped when there is no relation.
  - **`<ContentPanel divided flush title={t("componentsTab.historyTitle")}>`:**
    - With no events: `<EmptyNote padded>{t("componentsTab.historyEmpty")}</EmptyNote>`.
    - Otherwise, a desktop `<DataTable framed={false} className="hidden md:block" caption={t("componentsTab.historyTitle")} scrollHint={tCommon("tableScrollHint")}>` and a phone `<ContentPanelRows className="md:hidden">`, as the board.
    - The columns are `columnDate`, `columnEvent`, the third head from `assetComponentHistoryColumn(history)` (`columnComponent` / `columnParent` / `columnRelated`), and `columnNote`.
    - Each event shows:
      - `formatAssetDetailDate(event.at, locale)` (Task 8B, R37), as `num`, no wrap;
      - `tAll(assetMovementLabelKey(event.kind))`;
      - `event.other.isActive ?` a `linkVariants({ size: "inherit" })` link to `/${locale}/assets/${event.other.id}` showing the `tag`, then the name. An inactive asset (its page answers 404) shows the same text without a link;
      - the note: `event.reason`, then, when `event.document && documentAccess[event.document.kind]`, a link to `buildAssetMovementDocumentHref(locale, event.document)` showing `event.document.code` as a `tag`. Without the permission there is neither link nor code (R12);
      - `<Nil />` when there is neither.
    - The phone item reads "date · event", then the asset, then the note.

**The page:**
- **The tab's loader (R24), on the components view only:** `const componentHistory = await withPerformanceTiming("asset-detail.components-tab", () => getAssetComponentHistory(asset.id), { route: "/assets/[id]", locale })`.
- **Task 7's interim components policy stays as it is** (`checkoutLimit: 10`, `assignedLicenseLimit: 50`): the first serves `#handover` until Task 11, the second the map's licence lane. The map's links (`installedInLinksForPanel`, `currentComponentsForPanel`) stay in the main read, because the fact strip and the overview's "อุปกรณ์ส่วนควบ" read them on every tab.
- **Render:** `<AssetComponentsTab … />` replaces the `#components` block, under the guard Task 8 gave it. Its props:
  - `asset={{ id: asset.id, assetTag: asset.assetTag, name: asset.name, custodianName: asset.custodian?.fullNameTh ?? null }}`;
  - `parents`: `installedInLinksForPanel.map((link) => ({ id: link.id, href: link.parentHref, assetTag: link.parentAsset.assetTag, name: link.parentAsset.name, role: link.componentRole, slotNo: link.slotNo }))`;
  - `components`: from `currentComponentsForPanel`, with `href: \`/${locale}/assets/${component.componentAsset.id}\``;
  - `licenseDevice={licenseAssignedAsset}` and `assignedLicenses={asset.assignedLicenses}`;
  - `manageHref={canEditAsset ? componentsManagerHref : null}`;
  - `history={componentHistory}` and `documentAccess={documentAccess}` (Task 9).
- **Delete:**
  - the moved code;
  - the summary's import, then the summary file;
  - imports that are left unused (lint).
  - `#ownership` is not here: Task 8 removed it with its section id (R23, R25).
- **Kept:**
  - `#handover` stays rendered on this tab after the two panels until Task 11 (R25). The page test's count of 4 outline `sm` buttons and the handover pins are unchanged.
  - The section id `"components"` stays (Task 7's map), on the tab's wrapper.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `node --test tests/asset-component-history-rules.test.ts tests/asset-components-tab-ui.test.ts tests/asset-relationship-map-ui.test.ts tests/assets-sweep-ui.test.ts tests/asset-detail-ux.test.ts tests/list-frame-guards.test.ts tests/asset-movement-labels.test.ts tests/dashboard-overview.test.ts tests/performance-route-instrumentation.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts && npm test && npx tsc --noEmit && npm run lint`
Expected: PASS. tsc is clean and lint reports 0 errors. `tests/asset-movement-labels.test.ts` still counts 47 written types (the new files hold `kind:` values, never a `movementType: "…"` literal), and `tests/dashboard-overview.test.ts` passes unchanged (Task 3's reader is called, not changed).

- [ ] **Step 7: Commit**

```bash
git add src/components/assets/detail/asset-relationship-map.tsx src/components/assets/detail/asset-components-tab.tsx src/lib/asset-component-history-rules.ts src/lib/asset-component-history.ts src/components/assets/asset-components-summary.tsx "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" messages/th.json messages/en.json tests/asset-component-history-rules.test.ts tests/asset-components-tab-ui.test.ts tests/asset-relationship-map-ui.test.ts tests/assets-sweep-ui.test.ts tests/asset-detail-ux.test.ts tests/list-frame-guards.test.ts tests/performance-route-instrumentation.test.ts
git commit -m "feat(asset-detail): the components tab, with the relationship map, its custodian and manager link, and the install and remove history (group 1 asset detail task 10)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

The deleted summary file is staged by its path.

- [ ] **Step 8 (the controller, after Task 13's E2E run; not the implementer): look at the tab**

In the session of Task 9's look, screenshot `?view=components` at 1440×900 and 390×844, in light and dark, for three assets:
- a parent with components (with a removed one, if the dev data has one: there are 7 removed links on dev);
- a component;
- an asset with no relation.

Compare with `B-Detail-components.dc.html` and `B-Detail-components-Phone.dc.html`: the map with "ผู้ถือครอง : …", "จัดการส่วนควบ" for IT staff and none for the viewer, the history table and the phone list. What differs goes to the implementer as one fix round, `fix(asset-detail): … (group 1 asset detail task 10 fix 1)`. Delete the screenshots after the report.

---

### Task 11: The files tab

**Amendment (controller, R48):** the files tab's camera zone reads Task 4's `asset.photoFrame.takePhoto` "ถ่ายรูป"; do not add `asset.filesTab.takePhoto` (one key for one word). Drop its row from the messages table and its assertion.

The files tab (`?view=files`, Task 7) holds three sections, in this order: "รูปและไฟล์แนบ" (the asset's own photos and files, modules `asset` and `asset_purchase`, with uploads and deletes for `asset:edit`, and the phone's "ถ่ายรูป" camera input that the overview's photo link opens: R26 puts the camera input here, a deviation from §7.5's in-place input recorded in the plan's decisions), "เอกสารจัดซื้อ" (today's linked purchase documents; the app's existing word, a deviation from the spec's "เอกสารการซื้อ" recorded in the plan's decisions, R31) and "หลักฐานจากงานอื่น" (read-only evidence from handovers, returns, components, repairs, findings and disposals, each linked to its document). It replaces the interim files tab Task 8C left (the old `#photos` panel and the interim `#purchase-documents` section, R25) and the handover cards with their evidence grid that Tasks 8C-10 left in the components tab (R25; spec §7.7, §7.9 rows "Handover cards with evidence" and "Activity and evidence drawers").

**Files:**
- Create: `src/lib/asset-files-rules.ts` (pure; relative `.ts` imports only)
- Create: `src/lib/asset-files-data.ts` (server; the files tab's one loader)
- Create: `src/components/assets/detail/asset-files-tab.tsx` (server component)
- Modify: `src/components/assets/asset-attachments.tsx` (whole file, master f6368e19 1-453)
- Modify: `src/components/assets/asset-purchase-documents.tsx`: the props :37-43, the wrapper :73-74 and its closing :108, the legacy cards :100-105, `AttachmentCard` :112-149
- Modify: `src/lib/asset-detail-format.ts:30-44,66-87` (`matchPhotoChecklistLabel`, and one private `legacyPhotoLabelCounts` that both readers use)
- Modify: `src/lib/asset-detail-view.ts` (as Tasks 7 and 8C left it): `"handover"` leaves `AssetDetailSectionId` and the components view's section list (nothing renders `#handover` after this task; R23). `"photos"` and `"purchase-documents"` stay, on the files view.
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx` (as Tasks 8C-10 left it; master f6368e19 lines name the parts, delete the ones still present):
  - imports :46 (`AssetAttachments`), :56 (`AssetPurchaseDocuments`); the files tab's body
  - the evidence reference round `asset-detail.evidence-references` :327-348 and its id lists :349-353
  - `getCategoryPhotoChecklist(asset.categoryId)` in :380-381 is not deleted but narrowed. It becomes `canEditAsset && assetDetailView === "overview" ? getCategoryPhotoChecklist(asset.categoryId) : Promise.resolve([])`: R59's "ข้อมูลยังไม่ครบ" line (Task 8C) counts the missing checklist photos, and the files tab reads its own copy through the loader. The model photo and licence reads of that `Promise.all` stay for the overview.
  - from the `asset-detail.evidence-data` round :401-456: `purchaseDocumentAttachments`, `componentAttachments`, `maintenanceAttachments`, `auditFindingAttachments`, `disposalAttachments`; `componentAttachmentsByReference` :458-464 and the `attachments:` field of the three component maps :469, :475, :482; `purchaseDocumentAttachmentsByReferenceId` :486-492. `legacyPurchaseDocuments` (:506) stays: R59's `hasPurchaseDocument` reads it, and it only filters the page's own attachments, with no read of its own. `purchaseDocuments` (:493-505) stays for the overview's "เอกสารจัดซื้อ" row (Task 8C, R31) but becomes `asset.purchaseDocumentLinks.map((link) => ({ id: link.purchaseDocument.id, documentNo: link.purchaseDocument.documentNo }))` (the loader builds the files tab's full documents with their files)
  - from the `asset-detail.operation-data` round (:520-574): the checkout and check-in attachment query :523-534; `operationAttachmentsByReference` :575-581
  - the `#handover` section :1289-1405; `EvidenceLinks` :2291-2336, `buildEvidenceItems` :2338-2352 (if Task 8C left it), `HandoverEvidenceGrid` :2354-2379, `getCheckoutDestination` :2389-2408 and `getAssetHandoverModeLabel` :2445-2452, with the reads only they used (`checkoutDepartments`, `checkoutLocations`, `checkoutParentAssets` and their label maps :582-584, when nothing else reads them)
- Modify: `messages/th.json`, `messages/en.json` (through `node scripts/messages-edit.mjs`)
- No skeleton change: the tab body streams inside Task 8C's frame, whose `AssetDetailPageSkeleton` is the route's
- Test (new): `tests/asset-files-rules.test.ts`, `tests/asset-files-tab-ui.test.ts`
- Test (rewritten pins):
  - `tests/asset-forms-ui.test.ts:129-141` ("asset photos: the photo-type select … (K20)")
  - `tests/assets-sweep-ui.test.ts:43-52` ("asset purchase documents …"), `:54-68` ("asset photos …"), and in "asset page: panels, notices…" (master :111-133, as Tasks 8C, 9 and 10 left it): the `<Chip>{t("latestTransaction")}</Chip>` line (:121) and the `getCheckoutDestination` line (:127) go; the `buttonVariants({ variant: "outline", size: "sm" })` count line (:124) becomes `assert.doesNotMatch(source, /className=\{buttonVariants\(\{ variant: "outline", size: "sm" \}\)\}/)` (all four were the handover cards' document links); the `getPanelClasses(), "scroll-mt-24 p-4 sm:p-5"` section count (:114) becomes 1, "maintenance" (`#handover` and Task 8C's interim `#purchase-documents` section both go)
  - `tests/file-evidence-ui.test.ts:184-197` ("each checklist photo box …")
  - `tests/visual-foundation-guards.test.ts:371` (N3 row of `asset-attachments.tsx`: 3 → 1)
  - `tests/dark-mode-p.test.ts:151,157-158` (R29): from Task 8C's **18** images and **14** stages (Tasks 9 and 10 add and remove none), this task removes the three next/image tags of `asset-attachments.tsx` (:187, :343, :382) and `EvidenceLinks`' `<img>` (page.tsx :2320), each on the stage; the tiles' image is `AssetPhotoFrame`'s and the evidence's is `AssetThumbnail`'s, already counted. `images.length` becomes **14**, the stage count **10**, and the comment at :157 reads "The stage is on the 10 images only, …". `NOT_UPLOADS` is unchanged.
  - `tests/asset-handover-presentation.test.ts:5,9-14`: the first test ("asset detail and timeline present handover mode with legacy fallback") and the `detailSource` read go. The handover mode stays on the HO- document, which tests 2 and 3 of the file still pin; the detail page links that document from the history (Task 9) and from the evidence group below
  - `tests/asset-detail-ux.test.ts` (as Tasks 8C, 9 and 10 left it): the `<KeyValueList\b` count line (master :175) becomes `assert.doesNotMatch(source, /<KeyValueList\b/)` (the handover cards' two lists were the last two); the `attachments:\s*\{[\s\S]*?take: 20` line (master :144) stays only while the page still reads that relation for the รูป card (Task 8C), else it goes
  - `tests/asset-detail-data-boundaries.test.ts:45-58`, Task 8C's version ("the handover evidence keeps its complete checkout index; the drawer's repair, finding and disposal evidence queries are gone (group 1 asset detail task 8)"), which pins only the page's checkout and check-in reference read: this task moves that read into `src/lib/asset-files-data.ts` and adds the repair, finding and disposal reference reads that "หลักฐานจากงานอื่น" needs (their three `can.*` reads are pinned in `tests/asset-files-tab-ui.test.ts`). The test becomes:

    ```ts
    test("the files loader keeps the complete checkout and check-in index; the page reads no evidence references (group 1 asset detail task 11)", () => {
      const loader = readFileSync("src/lib/asset-files-data.ts", "utf8")
      const page = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8")
      assert.match(loader, /prisma\.assetCheckout\.findMany\(\{\s*where: \{ assetId: asset\.id \},\s*select: \{ id: true, documentNo: true, checkins: \{ select: \{ id: true, documentNo: true \} \} \}/)
      assert.match(loader, /checkouts\.flatMap\(\(checkout\) => checkout\.checkins\.map/)
      assert.doesNotMatch(page, /asset-detail\.evidence-references|evidenceCheckoutReferences/)
    })
    ```
  - `tests/asset-detail-view.test.ts` (as Tasks 7 and 8C left it): `getAssetDetailViewSectionIds("components")` loses `"handover"` (`["components"]`, once Task 8C has removed `"ownership"`, R23), and the sorted list of every section id loses `"handover"`; the section-link test's `handover` line (Task 8C's) becomes `assert.equal(buildAssetDetailSectionHref("th", "asset id/1", "overview", "components", "/th/assets?status=ready"), "/th/assets/asset%20id%2F1?view=components&returnTo=%2Fth%2Fassets%3Fstatus%3Dready#components")` (the cross-tab case on a section that still exists; `"handover"` no longer type-checks)
  - `tests/asset-detail-page.test.ts` (Task 8C's file): the test "the files tab keeps today's purchase documents under the anchor ข้อมูลทรัพย์สิน links, until Task 11" keeps only its `documentsHref` line. Its section and `legacyAttachments` assertion goes: `tests/asset-files-tab-ui.test.ts` pins the new `<div id="purchase-documents">`. It becomes:

    ```ts
    test("ข้อมูลทรัพย์สิน links the files tab's เอกสารจัดซื้อ (group 1 asset detail task 11)", () => {
      const source = page()
      assert.match(source, /documentsHref: sectionHref\("purchase-documents"\)/)
    })
    ```
  - `tests/performance-route-instrumentation.test.ts:15-20`: the asset-detail labels are the ones page.tsx writes after this task: add `"asset-detail.files-tab"` (R24's naming, as Tasks 9 and 10 add `asset-detail.history-tab` and `asset-detail.components-tab`); `"asset-detail.evidence-data"` and `"asset-detail.operation-data"` stay only while the page still writes them (Tasks 9 and 10 may still read component users and checkout labels there)
  - Unchanged and still passing: `tests/attachment-preview-dialog-ui.test.ts:16-22` (the photo preview stays `<AttachmentPreviewDialog`), `tests/confirm-dialog-ui.test.ts:24-36` (both files keep `tCommon("deletedSuccess")` and `tone: "destructive"`), `tests/asset-photo-gallery.test.ts:7-21` (the gallery toggle still uses `getAssetPhotoGalleryState`), `tests/asset-detail-format.test.ts`, `tests/form-migration-guards.test.ts` (GB3, GB4, GF8: see Step 5).

**Interfaces:**
- Consumes:
  - Task 4 (with R26): `AssetPhotoFrame({ attachmentId, alt, label, canUpload, uploadHref, previewable, className })` (`src/components/assets/asset-photo-frame.tsx`; the card-size image from `/api/attachments/${id}/thumbnail?size=card`, the "โหลดรูปไม่ได้" placeholder on error; it fills its parent's box; `previewable` defaults to `true`). The tile passes `canUpload={false}` and `previewable={false}` and nests it in its own preview button, so the frame renders no button, no link and no dialog there (R26). Callers pass only an image `isThumbnailable` accepts (R27).
  - Task 7: `resolveAssetDetailView(raw).view === "files"`; `buildAssetDetailViewHref(locale, assetId, "components", returnTo)` (no `#anchor`, R22) for the component evidence links; `assetDetailFileWhere(assetId: string): Prisma.AttachmentWhereInput` (`src/lib/asset-detail-data.ts`), the where `getAssetDetailCounts(assetId).files` (`src/lib/asset-detail-counts.ts`, R22) counts with, so the tab lists the rows its count says (R24); the section id `photos`.
  - Task 8C: the section id `purchase-documents` (R23) and the page's `assetDetailView`, `returnToHref`, `canEditAsset`, `canViewMaintenance`, `canViewAudit`, `canViewDisposal`.
  - Dashboard plan: `buildAssetMovementDocumentHref(locale, { kind, id, code })`, `type AssetMovementDocumentKind` and `ASSET_MOVEMENT_DOCUMENT_PERMISSION` (`src/lib/asset-movement-labels.ts`).
  - Existing: `isThumbnailable` (`src/lib/attachment-thumbnail.ts`), `getMissingPhotoChecklistLabels` (`src/lib/asset-detail-format.ts`), `getCategoryPhotoChecklist`, `getAssetPhotoGalleryState`, `formatFileSize`, `MAX_UPLOAD_BYTES` (`src/lib/uploads.ts`), `isUnauthorizedError` (`src/lib/api-error-catalog.ts`), `useApiError`, `useConfirm`, `FileDropzone`, `FileQueueList`, `Field`, `AttachmentPreviewDialog`, `AssetThumbnail` (`preview={false}`), `ContentPanel`, `ContentPanelRows`, `EmptyNote`, `StatusBadge`, `Chip`, `Button`, `buttonVariants`, `linkVariants`, `formatCount`, `formatDate`.
- Produces:
  - `src/lib/asset-detail-format.ts`: `matchPhotoChecklistLabel(photoChecklist: readonly string[], attachment: { originalName: string }): string | null`: the first checklist label the file's name starts with (`"<label> - "`, the upload route's naming), with the legacy fallback `getMissingPhotoChecklistLabels` already uses.
  - `src/lib/asset-files-rules.ts`:
    - `type AssetFileRecord = { id: string; module: string; originalName: string; fileType: string; fileSize: number; uploadedAt: Date }`
    - `type AssetFilePhoto = AssetFileRecord & { label: string | null; primary: boolean }`
    - `type AssetFileGroups = { photos: AssetFilePhoto[]; documents: AssetFileRecord[]; missingChecklistLabels: string[] }`
    - `groupAssetFiles(files: readonly AssetFileRecord[], photoChecklist: readonly string[]): AssetFileGroups`
    - `type AssetEvidenceKind = "checkout" | "checkin" | "componentInstall" | "componentRemove" | "repair" | "finding" | "disposal"`
    - `ASSET_EVIDENCE_MODULES: Readonly<Record<string, { kind: AssetEvidenceKind; labelKey: string | null }>>` (label keys in the `asset` namespace)
    - `type AssetEvidenceSource = { checkouts: { id: string; documentNo: string | null; checkins: { id: string; documentNo: string | null }[] }[]; components: { id: string; otherAssetTag: string }[]; repairs: { id: string; repairNo: string }[]; findings: { id: string; auditRoundId: string; auditNo: string }[]; disposals: { id: string; disposalNo: string }[] }`
    - `type AssetEvidenceFile = { id: string; name: string; fileType: string; labelKey: string | null; uploadedAt: Date }`
    - `type AssetEvidenceGroup = { key: string; kind: AssetEvidenceKind; code: string; href: string; at: Date; files: AssetEvidenceFile[] }`
    - `buildAssetEvidenceGroups(source: AssetEvidenceSource, files: readonly (AssetFileRecord & { referenceId: string })[], options: { locale: string; componentsHref: string }): AssetEvidenceGroup[]`
  - `src/lib/asset-files-data.ts`:
    - `type AssetEvidenceAccess = { maintenanceView: boolean; auditView: boolean; disposalView: boolean }` (the `repair`, `auditRound` and `disposal` rows of `ASSET_MOVEMENT_DOCUMENT_PERMISSION`; `checkout` and `checkin` need `asset:view`, which every reader of the page holds, so the evidence follows R12's rule: a document the person may not open shows neither its link nor its code, and here not its files either)
    - `type AssetFilesTabData = AssetFileGroups & { purchaseDocuments: <the documents prop of AssetPurchaseDocuments>; evidence: AssetEvidenceGroup[] }`
    - `getAssetFilesTabData(asset: { id: string; categoryId: string }, options: { locale: string; componentsHref: string; can: AssetEvidenceAccess }): Promise<AssetFilesTabData>`
  - UI: `AssetAttachments({ assetId, photos, documents, missingChecklistLabels, canEdit }: { assetId: string; photos: readonly AssetFilePhoto[]; documents: readonly AssetFileRecord[]; missingChecklistLabels: readonly string[]; canEdit: boolean })` (client); `AssetPurchaseDocuments({ documents, canEdit })` (client; `legacyAttachments` goes); `AssetFilesTab({ locale, assetId, data, canEdit }: { locale: string; assetId: string; data: AssetFilesTabData; canEdit: boolean })` (server).
  - For Task 13: no E2E step of spec §10 visits this tab; Task 13 adds its four-project axe visit on a test asset with a photo (R43). The viewer finds no upload zone, no "ถ่ายรูป", no "อัปโหลด N ไฟล์" and no delete here (R42). The tab's words for Task 13's list (R44): "รูปและไฟล์แนบ", "เอกสารจัดซื้อ", "หลักฐานจากงานอื่น", "ถ่ายรูป".

- [ ] **Step 1: Check the starting point**

Run: `git grep -n "AssetEvidenceDrawer\|evidenceDrawerItems\|allEvidenceItems" -- src` and `git grep -n "<section id=\"handover\"\|function HandoverEvidenceGrid" -- "src/app/[locale]/(dashboard)/assets/[id]/page.tsx"`
Expected: the first prints nothing (Task 8C removed the drawers and their data, R36; the search leaves out `tests`, where Task 8C's `doesNotMatch` pins in `tests/asset-detail-page.test.ts` and `tests/asset-photo-gallery.test.ts` name them); the second prints the `#handover` section and its grid, which Tasks 8C-10 kept in the components tab for this task (R25). If the first prints anything, stop and report it to the controller: it is Task 8C's.

- [ ] **Step 2: Add the files tab's messages**

Write a change file outside the repo and run `node scripts/messages-edit.mjs <file>`. Set in `asset` (nested under `filesTab`):

| Key | th | en |
|---|---|---|
| `filesTab.title` | รูปและไฟล์แนบ | Photos and attachments |
| `filesTab.empty` | ยังไม่มีไฟล์ | No files yet |
| `filesTab.photos` | รูป · {count} | Photos · {count} |
| `filesTab.documents` | เอกสาร · {count} | Documents · {count} |
| `filesTab.primaryPhoto` | รูปหลัก | Main photo |
| `filesTab.openPhoto` | ดูรูป {name} | View photo {name} |
| `filesTab.downloadNamed` | ดาวน์โหลด {name} | Download {name} |
| `filesTab.deleteNamed` | ลบ {name} | Delete {name} |
| `filesTab.dropDescription` | รูปหรือเอกสาร ไฟล์ละไม่เกิน {size} MB · เลือกได้หลายไฟล์ | Photos or documents, up to {size} MB each · several at once |
| `filesTab.takePhoto` | ถ่ายรูป | Take a photo |
| `filesTab.takePhotoHint` | เปิดกล้องเพื่อถ่ายรูปทรัพย์สิน | Opens the camera to photograph the asset |
| `filesTab.upload` | อัปโหลด {count} ไฟล์ | Upload {count} files |
| `filesTab.uploadProgress` | กำลังอัปโหลด {done} จาก {total} ไฟล์ | Uploading {done} of {total} files |
| `filesTab.uploadDone` | อัปโหลดแล้ว {count} ไฟล์ | {count} files uploaded |
| `filesTab.uploadFailed` | อัปโหลดไม่สำเร็จ {count} ไฟล์ ไฟล์เหล่านี้ยังอยู่ในรายการ | {count} files did not upload and stay in the list |
| `filesTab.evidenceTitle` | หลักฐานจากงานอื่น | Evidence from other work |
| `filesTab.evidenceHelp` | รูปและลายเซ็นจากการส่งมอบ รับคืน ส่วนควบ งานซ่อม ตรวจนับ และตัดจำหน่าย ดูได้อย่างเดียว แก้ไขที่เอกสารต้นทาง | Photos and signatures from handovers, returns, components, repairs, audits and disposals. Read-only: change them on their own document. |
| `filesTab.evidenceEmpty` | ยังไม่มีหลักฐานจากงานอื่น | No evidence from other work yet |
| `filesTab.evidenceKinds.checkout` | ส่งมอบ | Handover |
| `filesTab.evidenceKinds.checkin` | รับคืน | Return |
| `filesTab.evidenceKinds.componentInstall` | ติดตั้งส่วนควบ | Component installed |
| `filesTab.evidenceKinds.componentRemove` | ถอดส่วนควบ | Component removed |
| `filesTab.evidenceKinds.repair` | ซ่อม | Repair |
| `filesTab.evidenceKinds.finding` | รายการไม่ตรง | Discrepancy |
| `filesTab.evidenceKinds.disposal` | ตัดจำหน่าย | Disposal |
| `filesTab.componentInstallPhoto` | รูปตอนติดตั้ง | Photo at installation |
| `filesTab.componentRemovePhoto` | รูปตอนถอด | Photo at removal |

The section "เอกสารจัดซื้อ" keeps `asset.purchaseDocuments` ("เอกสารจัดซื้อ" / "Purchase Documents"; R31: the app's one word, no key with the spec's "เอกสารการซื้อ"); the missing checklist tile keeps `asset.photoChecklistPending`, `dropAssetPhotoTitle`, `checklistPhotoDescription`, `dropAssetPhotoHint`; the free drop zone keeps `dropFileTitle` and `dropFileHint`; the handover file captions keep `checkoutPhotoBefore`, `receiverSignature`, `checkinPhotoAfter`, `returnSignature`, `receiveSignature`.

Delete, in both locales, each of these keys that is still present and that no file under `src` reads after Step 5 (`git grep -n -e 't("<key>"' -e '"asset.<key>"' -- src`, `<key>` being the part after `asset.`, prints nothing for it: R2's action rule names its keys in full, so a bare `t(` search is not enough; Task 8C may already have removed some): `asset.photoGalleryPreviewHelp`, `asset.photoFileCount`, `asset.otherAttachments`, `asset.photoType`, `asset.latestTransaction`, `asset.openHandoverDocument`, `asset.openReturnDocument`, `asset.noEvidence`, `asset.handoverActive`, `asset.handoverTo`, `asset.handoverPermanentAssignment`, `asset.handoverTemporaryLoan`, `asset.detailSections.handover`, `asset.detailSections.handoverSubtitle`. (`asset.handoverModeLegacy`, `asset.handoverMode`, `asset.viewEvidence` and `asset.handoverReturned` have other readers and stay.)

Glossary (`docs/19_THAI_GLOSSARY.md`, `tests/thai-glossary.test.ts`): "รายการไม่ตรง" (not Finding), "ส่วนควบ", "ตัดจำหน่าย", "ตรวจนับ"; no "อยู่ที่", no "ตรวจทาน", no "แจ้งซ่อม"; "MB" is a unit; no other English word in a th value.

- [ ] **Step 3: Write the failing tests**

`tests/asset-files-rules.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { matchPhotoChecklistLabel } from "../src/lib/asset-detail-format.ts"
import { ASSET_EVIDENCE_MODULES, buildAssetEvidenceGroups, groupAssetFiles, type AssetEvidenceSource, type AssetFileRecord } from "../src/lib/asset-files-rules.ts"

// Group 1 asset detail task 11 (spec 2026-10-25 §7.7): the files tab. Photos are the asset's own thumbnailable images,
// the main photo first, then the category checklist's order, then the newest; everything else of modules asset and
// asset_purchase is a document. The evidence from other work is grouped by its document, newest first.
const at = (day: number) => new Date(Date.UTC(2026, 9, day, 3))
const file = (id: string, module: string, originalName: string, fileType: string, day: number): AssetFileRecord => ({ id, module, originalName, fileType, fileSize: 2048, uploadedAt: at(day) })
const checklist = ["ด้านหน้า", "ป้ายรหัส", "Serial number"]

test("a file matches the first checklist label its name starts with, as the upload route names it", () => {
  assert.equal(matchPhotoChecklistLabel(checklist, { originalName: "ป้ายรหัส - IMG_2.jpg" }), "ป้ายรหัส")
  assert.equal(matchPhotoChecklistLabel(checklist, { originalName: "Serial number - sn.png" }), "Serial number")
  // The route replaces \ / : * ? " < > | with a space; the label comes back as the checklist wrote it.
  assert.equal(matchPhotoChecklistLabel(["ป้าย/รหัส"], { originalName: "ป้าย รหัส - x.jpg" }), "ป้าย/รหัส")
  assert.equal(matchPhotoChecklistLabel(checklist, { originalName: "IMG_9.png" }), null)
  assert.equal(matchPhotoChecklistLabel([], { originalName: "ด้านหน้า - a.jpg" }), null)
})

test("photos: the main photo first, then the checklist's order, then the newest; other files are documents (spec §7.7)", () => {
  const files = [
    file("f7", "asset", "ป้ายรหัส - IMG_1.jpg", "image/jpeg", 8),
    file("f1", "asset", "ป้ายรหัส - IMG_2.jpg", "image/jpeg", 20),
    file("f2", "asset", "IMG_9.png", "image/png", 19),
    file("f3", "asset_purchase", "ใบกำกับ INV-7 - scan.jpg", "image/jpeg", 18),
    file("f4", "asset", "ด้านหน้า - front.heic", "image/heic", 17),
    file("f5", "asset", "quote.pdf", "application/pdf", 16),
    file("f8", "asset", "logo.svg", "image/svg+xml", 15),
    file("f6", "asset", "ด้านหน้า - old.jpg", "image/jpeg", 10),
  ]
  const groups = groupAssetFiles(files, checklist)
  assert.deepEqual(groups.photos.map((photo) => [photo.id, photo.label, photo.primary]), [
    ["f1", "ป้ายรหัส", true],
    ["f6", "ด้านหน้า", false],
    ["f7", "ป้ายรหัส", false],
    ["f2", null, false],
  ])
  // An asset_purchase file is a document even when it is an image; a HEIC or SVG image cannot be thumbnailed (415),
  // so it is one too (R27): "รูปหลัก" is the newest thumbnailable asset image, the rule of the overview's รูป card.
  assert.deepEqual(groups.documents.map((document) => document.id), ["f3", "f4", "f5", "f8"])
  // The HEIC front photo still fills its checklist item, as today's data health counts it.
  assert.deepEqual(groups.missingChecklistLabels, ["Serial number"])
  assert.deepEqual(groupAssetFiles([], []), { photos: [], documents: [], missingChecklistLabels: [] })
  assert.deepEqual(groupAssetFiles([file("h", "asset", "a.heic", "image/heic", 1)], ["ด้านหน้า"]).photos, [], "no thumbnailable image: no main photo")
})

test("evidence from other work: one group per document, its files in the module order, newest group first (spec §7.7)", () => {
  const source: AssetEvidenceSource = {
    checkouts: [
      { id: "co1", documentNo: "HO-2026-0001", checkins: [{ id: "ci1", documentNo: "RT-2026-0001" }] },
      { id: "co2", documentNo: null, checkins: [] },
    ],
    components: [{ id: "ac1", otherAssetTag: "GRL-RAM-26-0003" }],
    repairs: [{ id: "mt1", repairNo: "MR-2026-0031" }],
    findings: [{ id: "fd1", auditRoundId: "ar1", auditNo: "AUD-2026-0003" }],
    disposals: [],
  }
  const evidence = [
    { ...file("e1", "checkout_receiver_signature", "sign.png", "image/png", 2), referenceId: "co1" },
    { ...file("e2", "checkout_photo_before", "before.jpg", "image/jpeg", 3), referenceId: "co1" },
    { ...file("e3", "checkin_return_signature", "return.png", "image/png", 9), referenceId: "ci1" },
    { ...file("e4", "asset_component_remove", "ram.jpg", "image/jpeg", 5), referenceId: "ac1" },
    { ...file("e10", "asset_component_install", "ram-in.jpg", "image/jpeg", 4), referenceId: "ac1" },
    { ...file("e5", "maintenance", "invoice.pdf", "application/pdf", 7), referenceId: "mt1" },
    { ...file("e6", "audit_finding", "shelf.jpg", "image/jpeg", 12), referenceId: "fd1" },
    // A disposal request the person may not open is not in the source, so its file is left out.
    { ...file("e7", "disposal", "quote.pdf", "application/pdf", 13), referenceId: "dr9" },
    { ...file("e8", "checkout_photo_before", "old.jpg", "image/jpeg", 1), referenceId: "co2" },
    // The asset's own files are not evidence from other work.
    { ...file("e9", "asset", "x.jpg", "image/jpeg", 14), referenceId: "a1" },
  ]
  const groups = buildAssetEvidenceGroups(source, evidence, { locale: "th", componentsHref: "/th/assets/a1?view=components" })
  assert.deepEqual(groups.map((group) => [group.key, group.kind, group.code, group.href]), [
    ["finding:fd1", "finding", "AUD-2026-0003", "/th/audit/rounds/ar1"],
    ["checkin:ci1", "checkin", "RT-2026-0001", "/th/asset-management/checkins/ci1"],
    ["repair:mt1", "repair", "MR-2026-0031", "/th/maintenance/mt1"],
    ["componentRemove:ac1", "componentRemove", "GRL-RAM-26-0003", "/th/assets/a1?view=components"],
    ["componentInstall:ac1", "componentInstall", "GRL-RAM-26-0003", "/th/assets/a1?view=components"],
    ["checkout:co1", "checkout", "HO-2026-0001", "/th/asset-management/checkouts/co1"],
    // A handover without a document number shows its id, as the handover card did.
    ["checkout:co2", "checkout", "co2", "/th/asset-management/checkouts/co2"],
  ])
  assert.deepEqual(groups.find((group) => group.key === "checkout:co1")?.files.map((entry) => [entry.id, entry.labelKey]), [["e2", "checkoutPhotoBefore"], ["e1", "receiverSignature"]])
  assert.deepEqual(groups.find((group) => group.key === "repair:mt1")?.files.map((entry) => [entry.id, entry.labelKey, entry.name]), [["e5", null, "invoice.pdf"]])
  assert.equal(groups[0].at.getTime(), at(12).getTime())
  assert.equal(groups.find((group) => group.key === "checkout:co1")?.at.getTime(), at(3).getTime(), "a group's time is its newest file")
})

test("the evidence modules are the ones the drawer and the handover cards showed, and each label is a Thai message", () => {
  assert.deepEqual(Object.keys(ASSET_EVIDENCE_MODULES), [
    "checkout_photo_before",
    "checkout_receiver_signature",
    "checkin_photo_after",
    "checkin_return_signature",
    "checkin_receive_signature",
    "asset_component_install",
    "asset_component_remove",
    "maintenance",
    "audit_finding",
    "disposal",
  ])
  const asset = (JSON.parse(readFileSync("messages/th.json", "utf8")) as { asset: Record<string, unknown> }).asset
  for (const [module, { labelKey }] of Object.entries(ASSET_EVIDENCE_MODULES)) {
    if (!labelKey) continue
    const value = labelKey.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], asset)
    assert.equal(typeof value, "string", `${module}: asset.${labelKey}`)
  }
})
```

`tests/asset-files-tab-ui.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 1 asset detail task 11 (spec 2026-10-25 §7.7, §7.9): the files tab. Uploads and deletes only for asset:edit
// (the attachments POST and DELETE need it), photos through the card-size thumbnail (AssetPhotoFrame) and the original
// only when a person opens it, and the evidence from other work read-only. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const FILES = "src/components/assets/asset-attachments.tsx"
const TAB = "src/components/assets/detail/asset-files-tab.tsx"
const PAGE = "src/app/[locale]/(dashboard)/assets/[id]/page.tsx"

test("asset files: every write control is an editor's, and the upload takes several files into a queue (spec §7.7)", () => {
  const source = read(FILES)
  assert.match(source, /\bcanEdit: boolean\b/)
  assert.match(source, /\{canEdit \? <AssetFileUpload assetId=\{assetId\} \/> : null\}/)
  assert.match(source, /\{canEdit \? missingChecklistLabels\.map\(/)
  assert.equal(source.match(/onDelete=\{canEdit \? \(\) => handleDelete\((?:photo|document)\) : undefined\}/g)?.length, 2)
  // The free drop zone: several files, queued in FileQueueList, sent by one button.
  assert.match(source, /onFilesChange=\{addFiles\}/)
  assert.match(source, /\n\s+multiple\n/)
  assert.match(source, /<FileQueueList\b/)
  assert.match(source, /<Button busy=\{uploading\} onClick=\{uploadQueued\}>/)
  assert.match(source, /description=\{t\("filesTab\.dropDescription", \{ size: formatCount\(MAX_UPLOAD_BYTES \/ \(1024 \* 1024\)\) \}\)\}/)
  // The phone's camera zone and each missing checklist photo open the rear camera.
  assert.equal(source.match(/capture="environment"/g)?.length, 2)
  assert.match(source, /<div className="md:hidden">\n\s+<FileDropzone\b/)
  assert.match(source, /if \(isUnauthorizedError\(error\)\)/, "a lapsed session goes to the login, as useApiError does")
})

test("asset files: a photo is the card-size frame, its original opens only in the preview, and a document is a row (spec §7.5, §7.7)", () => {
  const source = read(FILES)
  // The tile's own button opens the preview, so the frame inside it is not previewable: no button in a button (R26).
  assert.match(source, /<AssetPhotoFrame attachmentId=\{photo\.id\} alt=\{photo\.originalName\} canUpload=\{false\} previewable=\{false\} \/>/)
  assert.doesNotMatch(source, /from "next\/image"|<Image\b|<img\b/, "no image of its own: AssetPhotoFrame loads the thumbnail")
  assert.match(source, /src=\{preview \? `\/api\/attachments\/\$\{preview\.id\}\?inline=1` : ""\}/)
  assert.match(source, /href=\{`\/api\/attachments\/\$\{document\.id\}`\}/)
  assert.match(source, /aria-label=\{t\("filesTab\.downloadNamed", \{ name: document\.originalName \}\)\}/)
  assert.match(source, /aria-label=\{t\("filesTab\.deleteNamed", \{ name \}\)\}/)
  assert.match(source, /confirm\(\{ title: tCommon\("deleteConfirm"\), description: file\.originalName, confirmLabel: tCommon\("delete"\), tone: "destructive" \}\)/)
})

test("the files tab: the asset's files, the purchase documents and the read-only evidence, each in its own panel", () => {
  const tab = read(TAB)
  assert.doesNotMatch(tab, /"use client"/)
  assert.match(tab, /<div id="photos" className="scroll-mt-24">\n\s+<AssetAttachments assetId=\{assetId\} photos=\{data\.photos\} documents=\{data\.documents\} missingChecklistLabels=\{data\.missingChecklistLabels\} canEdit=\{canEdit\} \/>/)
  assert.match(tab, /<div id="purchase-documents" className="scroll-mt-24">\n\s+<AssetPurchaseDocuments documents=\{data\.purchaseDocuments\} canEdit=\{canEdit\} \/>/)
  assert.match(tab, /<ContentPanel divided flush title=\{t\("filesTab\.evidenceTitle"\)\} description=\{t\("filesTab\.evidenceHelp"\)\}>/)
  assert.match(tab, /<EmptyNote padded>\{t\("filesTab\.evidenceEmpty"\)\}<\/EmptyNote>/)
  assert.match(tab, /href=\{`\/api\/attachments\/\$\{file\.id\}\?inline=1`\} target="_blank" rel="noreferrer"/)
  assert.match(tab, /<AssetThumbnail photo=\{\{ id: file\.id, alt: "", fileType: file\.fileType \}\} assetTag=\{group\.code\} assetName=\{caption\} size=\{44\} preview=\{false\} \/>/)
  assert.match(tab, /<Link href=\{group\.href\} className=\{linkVariants\(\{ size: "inherit" \}\)\}>/)
  const evidence = tab.slice(tab.indexOf('t("filesTab.evidenceTitle")'))
  assert.doesNotMatch(evidence, /<Button\b|<FileDropzone\b|\bcanEdit\b|"DELETE"/, "the evidence is read-only")
})

test("the files loader: the asset's own files uncapped, and the evidence of the work the person may open", () => {
  const loader = read("src/lib/asset-files-data.ts")
  // The files count's where (Task 7): the tab lists exactly the rows its count says (R24).
  assert.match(loader, /prisma\.attachment\.findMany\(\{\n\s+where: assetDetailFileWhere\(asset\.id\),/)
  assert.match(loader, /can\.maintenanceView\s*\?\s*prisma\.maintenanceTicket\.findMany\(/)
  assert.match(loader, /can\.auditView\s*\?\s*prisma\.auditFinding\.findMany\(/)
  assert.match(loader, /can\.disposalView\s*\?\s*prisma\.disposalRequest\.findMany\(/)
  assert.match(loader, /OR: \[\{ parentAssetId: asset\.id \}, \{ componentAssetId: asset\.id \}\]/)
  assert.match(loader, /Object\.entries\(ASSET_EVIDENCE_MODULES\)/)
  assert.match(loader, /groupAssetFiles\(/)
  assert.match(loader, /buildAssetEvidenceGroups\(/)
  assert.doesNotMatch(loader, /\btake:/)
})

test("the page loads the files tab's data only on that tab, and the old files, handover and evidence parts are gone", () => {
  const page = read(PAGE)
  assert.match(page, /assetDetailView === "files"\s*\?\s*await withPerformanceTiming\(\s*"asset-detail\.files-tab",\s*\(\) =>\s*getAssetFilesTabData\(/)
  assert.match(page, /can: \{ maintenanceView: canViewMaintenance, auditView: canViewAudit, disposalView: canViewDisposal \}/)
  assert.match(page, /<AssetFilesTab locale=\{locale\} assetId=\{asset\.id\} data=\{filesData\} canEdit=\{canEditAsset\} \/>/)
  assert.doesNotMatch(page, /<AssetAttachments\b|<AssetPurchaseDocuments\b|<section id="handover"|function (?:HandoverEvidenceGrid|EvidenceLinks|buildEvidenceItems|getCheckoutDestination|getAssetHandoverModeLabel)\b|asset-detail\.evidence-references/)
  // R59: the page reads the checklist only for the overview's ข้อมูลยังไม่ครบ line; the files tab reads its own through the loader.
  assert.match(page, /canEditAsset && assetDetailView === "overview" \? getCategoryPhotoChecklist\(asset\.categoryId\) : Promise\.resolve\(\[\]\)/)
})

test("the files tab's words, in Thai and English (group 1 spec §7.7)", () => {
  const filesTab = (locale: string) => (JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { asset: { filesTab: Record<string, unknown> } }).asset.filesTab
  assert.equal(filesTab("th").title, "รูปและไฟล์แนบ")
  assert.equal(filesTab("th").evidenceTitle, "หลักฐานจากงานอื่น")
  assert.equal(filesTab("th").takePhoto, "ถ่ายรูป")
  assert.equal(filesTab("en").title, "Photos and attachments")
  assert.deepEqual(Object.keys(filesTab("th").evidenceKinds as object).sort(), ["checkin", "checkout", "componentInstall", "componentRemove", "disposal", "finding", "repair"])
  // The purchase section keeps the app's one word (R31), not the spec's "เอกสารการซื้อ".
  const asset = (JSON.parse(readFileSync("messages/th.json", "utf8")) as { asset: Record<string, unknown> }).asset
  assert.equal(asset.purchaseDocuments, "เอกสารจัดซื้อ")
  assert.doesNotMatch(JSON.stringify(filesTab("th")), /เอกสารการซื้อ/)
})
```

Rewrite the pins (each replaces the test named; the rest of each file is unchanged):

- `tests/asset-forms-ui.test.ts:129-141` becomes:

  ```ts
  test("asset files: the delete icons are busy danger buttons, and only an editor gets them (K20, group 1 asset detail task 11)", () => {
    const source = read("src/components/assets/asset-attachments.tsx")
    assert.equal(source.match(/variant="danger"\s+size="icon-sm"/g)?.length, 2)
    assert.equal(source.match(/busy=\{deleting\}/g)?.length, 2)
    assert.match(source, /deleting=\{deletingId === photo\.id\}/)
    assert.match(source, /deleting=\{deletingId === document\.id\}/)
    // The photo-type select and its state go; the checklist label still reaches the route as the photoLabel field.
    assert.doesNotMatch(source, /Loader2|<select\b|<NativeSelect\b|\bsetPhotoLabel\b|value=\{photoLabel\}/)
    assert.match(source, /formData\.append\("photoLabel", label\)/)
    assert.doesNotMatch(source, /closeLabel=/, "the preview dialog's X already reads ปิด by default")
  })
  ```

- `tests/assets-sweep-ui.test.ts:43-52` becomes:

  ```ts
  test("asset purchase documents: a ContentPanel, EmptyNote, the number as a tag, Nil for an empty line, the shared buttons, and delete only for an editor (spec 2D M21, M29, M33; group 1 §7.7)", () => {
    const source = read(`${C}assets/asset-purchase-documents.tsx`)
    assert.match(source, /<ContentPanel title=\{t\("purchaseDocuments"\)\}>/)
    assert.match(source, /<EmptyNote>\{tCommon\("noData"\)\}<\/EmptyNote>/)
    assert.match(source, / · <span className="tag">\{document\.documentNo\}<\/span>/)
    assert.match(source, /\{orNil\(\n\s+\[document\.supplierName,/)
    assert.match(source, /className=\{cn\(buttonVariants\(\{ variant: "outline", size: "sm" \}\), "flex-1"\)\}/)
    assert.match(source, /onDelete=\{canEdit \? handleDelete : undefined\}/)
    assert.match(source, /\{onDelete \? \(\n\s+<Button\n\s+variant="danger"\n\s+size="icon-sm"\n\s+onClick=\{\(\) => onDelete\(attachment\.id\)\}\n\s+busy=\{deletingId === attachment\.id\}/)
    assert.doesNotMatch(source, /legacyAttachments|<h3\b|<button\b|Loader2|disabled:opacity|border-dashed|"-"|text-primary|bg-surface|hover:bg-accent|\bh-8\b/)
  })
  ```

- `tests/assets-sweep-ui.test.ts:54-68` becomes:

  ```ts
  test("asset files: one divided panel, a muted badge on a missing checklist photo, the main photo's Chip, the shared buttons and EmptyNote, no box in a box (spec 2D D9, M21, M22, M29; group 1 §7.7)", () => {
    const source = read(`${C}assets/asset-attachments.tsx`)
    assert.match(source, /<ContentPanel divided title=\{t\("filesTab\.title"\)\}>/)
    assert.match(source, /<EmptyNote>\{t\("filesTab\.empty"\)\}<\/EmptyNote>/)
    assert.match(source, /<h3 className="mb-3 text-sm font-semibold text-foreground">\{t\("filesTab\.photos", \{ count: formatCount\(photos\.length\) \}\)\}<\/h3>/)
    assert.match(source, /<h3 className="mb-3 text-sm font-semibold text-foreground">\{t\("filesTab\.documents", \{ count: formatCount\(documents\.length\) \}\)\}<\/h3>/)
    assert.match(source, /<StatusBadge label=\{t\("photoChecklistPending"\)\} tone="muted" \/>/)
    assert.match(source, /<Chip>\{t\("filesTab\.primaryPhoto"\)\}<\/Chip>/)
    assert.match(source, /<Button variant="outline" aria-expanded=\{expanded\} className="mt-3 w-full sm:w-auto" onClick=\{onClick\}>/)
    // The photo that opens its preview stays a raw button: an image is the control (plan 2D-3 R5, the N3 EXEMPT row).
    assert.equal(source.match(/<button\b/g)?.length, 1)
    assert.equal(source.match(/focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/g)?.length, 1)
    assert.doesNotMatch(source, /rounded-full|border-dashed|hover:bg-accent|focus:outline-none|focus:ring|text-primary|text-success|CheckCircle2|\bh-8\b|\bh-9\b|text-xs|rounded-lg|bg-surface/)
  })
  ```

- `tests/file-evidence-ui.test.ts:184-197` becomes (the two message assertions of the old test stay as they are, at its end):

  ```ts
  test("each missing checklist photo is a camera drop zone named by its checklist item that says up front when the photo uploads; the free zone queues several files (call sites 3 and 4)", () => {
    const source = readFileSync("src/components/assets/asset-attachments.tsx", "utf8").replace(/\r\n/g, "\n")
    const box = source.match(/<Field label=\{label\} hideLabel>\n\s*<FileDropzone[\s\S]*?\/>\n\s*<\/Field>/)?.[0]
    assert.ok(box, "a missing checklist item's FileDropzone sits in <Field label={label} hideLabel>")
    assert.match(box, /capture="environment"/)
    assert.match(box, /description=\{uploadingLabel === label \? t\("uploading"\) : t\("checklistPhotoDescription"\)\}/)
    assert.doesNotMatch(box, /\shint=/)
    // The free zone (call site 4) is multiple: the queue shows what was chosen, so it has no single-file hint.
    assert.doesNotMatch(source, /t\("dropFileSelected"\)/)
    for (const [locale, text] of [["th", "รูปจะอัปโหลดทันทีที่เลือก"], ["en", "The photo uploads as soon as you choose it."]]) {
      const asset = (JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { asset: Record<string, unknown> }).asset
      assert.equal(asset.checklistPhotoDescription, text, locale)
    }
  })
  ```

- `tests/visual-foundation-guards.test.ts:371`: `"src/components/assets/asset-attachments.tsx": { count: 1, kind: "permanent", why: "the photo is the control: a photo of the files tab opens its preview", ruling: "2D-3 R5; group 1 asset detail task 11" },`
- `tests/dark-mode-p.test.ts:151,157-158` (14 and 10), `tests/asset-handover-presentation.test.ts`, `tests/assets-sweep-ui.test.ts` "asset page", `tests/asset-detail-ux.test.ts`, `tests/asset-detail-data-boundaries.test.ts`, `tests/asset-detail-view.test.ts`, `tests/asset-detail-page.test.ts`, `tests/performance-route-instrumentation.test.ts`: as listed under **Files**.

- [ ] **Step 4: Run the tests to verify they fail**

Run: `node --test tests/asset-files-rules.test.ts tests/asset-files-tab-ui.test.ts tests/asset-forms-ui.test.ts tests/assets-sweep-ui.test.ts tests/file-evidence-ui.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL. `asset-files-rules.test.ts` stops at its import (`asset-files-rules.ts` does not exist and `asset-detail-format.ts` has no `matchPhotoChecklistLabel`); the source pins fail on today's `asset-attachments.tsx` (three raw buttons, the photo-type select, `next/image`), `asset-purchase-documents.tsx` (its `<h3>`, `legacyAttachments`, an ungated delete) and the missing `asset-files-tab.tsx` and `asset-files-data.ts`.

- [ ] **Step 5: Implement the files tab**

- **`src/lib/asset-detail-format.ts`:** a private `legacyPhotoLabelCounts(photoChecklist)` holds the count `getMissingPhotoChecklistLabels` builds today (:35-39), and both readers use it. Add `matchPhotoChecklistLabel(photoChecklist, attachment)`: the first label for which the private `attachmentMatchesPhotoLabel` (:66-78) holds, else `null`. Nothing else changes.
- **`src/lib/asset-files-rules.ts`** (no `@/`; imports `isThumbnailable` from `./attachment-thumbnail.ts`, `getMissingPhotoChecklistLabels` and `matchPhotoChecklistLabel` from `./asset-detail-format.ts`, `buildAssetMovementDocumentHref` from `./asset-movement-labels.ts`):
  - `groupAssetFiles`: sort a copy newest first (`uploadedAt` desc, then `id`). A photo is a `module: "asset"` file that `isThumbnailable`; every other file is a document, in that order. Each photo's `label` is `matchPhotoChecklistLabel(photoChecklist, photo)`. `primary` marks the first photo (the newest thumbnailable `module: "asset"` image, R27's "รูปหลัก", the rule Task 8C's รูป card uses too; HEIC and SVG are documents). Order: the main photo, then the labelled photos in the checklist's order (newest first within a label), then the unlabelled ones newest first. `missingChecklistLabels = getMissingPhotoChecklistLabels([...photoChecklist], <the module "asset" files>)` (today's rule: any image fills its label).
  - `ASSET_EVIDENCE_MODULES`, in this order (the order is also each group's file order): `checkout_photo_before` → `{ kind: "checkout", labelKey: "checkoutPhotoBefore" }`, `checkout_receiver_signature` → `checkout`, `"receiverSignature"`, `checkin_photo_after` → `checkin`, `"checkinPhotoAfter"`, `checkin_return_signature` → `checkin`, `"returnSignature"`, `checkin_receive_signature` → `checkin`, `"receiveSignature"`, `asset_component_install` → `componentInstall`, `"filesTab.componentInstallPhoto"`, `asset_component_remove` → `componentRemove`, `"filesTab.componentRemovePhoto"`, `maintenance` → `repair`, `null`, `audit_finding` → `finding`, `null`, `disposal` → `disposal`, `null` (a `null` label shows the file's name).
  - `buildAssetEvidenceGroups`: a file whose module is not in `ASSET_EVIDENCE_MODULES`, or whose `referenceId` is not a record of its kind in `source`, is left out. Group key `${kind}:${referenceId}` (a component link with install and remove photos makes two groups). The document: a checkout `{ kind: "checkout", id, code: documentNo ?? id }`, a check-in likewise with `"checkin"`, a repair `"repair"` with `repairNo`, a disposal `"disposal"` with `disposalNo`, a finding `{ kind: "auditRound", id: auditRoundId, code: auditNo }`, each through `buildAssetMovementDocumentHref(options.locale, …)`; a component group has `code: otherAssetTag` and `href: options.componentsHref`. `at` is the newest file's `uploadedAt`; groups newest first, then by key; files in the module order above, then oldest first. A file is `{ id, name: originalName, fileType, labelKey, uploadedAt }`.
- **`src/lib/asset-files-data.ts`** (server; header comment: "The files tab's reads (group 1 spec §7.7): the asset's own files uncapped, its purchase documents, and the evidence of the work the person may open (the file route refuses the rest). Read only."):
  - Round 1 in one `Promise.all`:
    - the asset's files: `prisma.attachment.findMany({` + `where: assetDetailFileWhere(asset.id),` (Task 7's builder from `@/lib/asset-detail-data`, the where of the files count) + `orderBy: [{ uploadedAt: "desc" }, { id: "desc" }], select: { id: true, module: true, originalName: true, fileType: true, fileSize: true, uploadedAt: true } })` (no `take`: the files count is these rows, R24);
    - `getCategoryPhotoChecklist(asset.categoryId)`;
    - the purchase document links: today's `purchaseDocumentLinks` read (page.tsx :182-191) as `prisma.purchaseDocumentAsset.findMany({ where: { assetId: asset.id }, orderBy: { linkedAt: "desc" }, include: { purchaseDocument: { include: { supplier: { select: { code: true, name: true } } } } } })`;
    - `prisma.assetCheckout.findMany({ where: { assetId: asset.id }, select: { id: true, documentNo: true, checkins: { select: { id: true, documentNo: true } } } })`;
    - `prisma.assetComponent.findMany({ where: { OR: [{ parentAssetId: asset.id }, { componentAssetId: asset.id }] }, select: { id: true, parentAssetId: true, parentAsset: { select: { assetTag: true } }, componentAsset: { select: { assetTag: true } } } })` (`otherAssetTag` is the child's tag when this asset is the parent, else the parent's; every link, removed ones too, so a removed part's photos stay);
    - `can.maintenanceView ? prisma.maintenanceTicket.findMany({ where: { assetId: asset.id, isActive: true }, select: { id: true, repairNo: true } }) : []`;
    - `can.auditView ? prisma.auditFinding.findMany({ where: { assetId: asset.id }, select: { id: true, auditRound: { select: { id: true, auditNo: true } } } }) : []`;
    - `can.disposalView ? prisma.disposalRequest.findMany({ where: { assetId: asset.id, isActive: true }, select: { id: true, disposalNo: true } }) : []`.
  - Round 2, one read of every other file, skipped when the `OR` is empty:

    ```ts
    const referenceIds: Record<AssetEvidenceKind, string[]> = {
      checkout: checkouts.map((checkout) => checkout.id),
      checkin: checkouts.flatMap((checkout) => checkout.checkins.map((checkin) => checkin.id)),
      componentInstall: components.map((component) => component.id),
      componentRemove: components.map((component) => component.id),
      repair: repairs.map((repair) => repair.id),
      finding: findings.map((finding) => finding.id),
      disposal: disposals.map((disposal) => disposal.id),
    }
    const or = [
      ...(purchaseDocumentIds.length > 0 ? [{ module: "purchase_document", referenceId: { in: purchaseDocumentIds } }] : []),
      ...Object.entries(ASSET_EVIDENCE_MODULES).flatMap(([module, { kind }]) =>
        referenceIds[kind].length > 0 ? [{ module, referenceId: { in: referenceIds[kind] } }] : [],
      ),
    ]
    ```

    `prisma.attachment.findMany({ where: { isActive: true, OR: or }, orderBy: { uploadedAt: "desc" }, select: { id, module, referenceId, originalName, fileType, fileSize, uploadedAt } })`.
  - Returns `{ ...groupAssetFiles(files, checklist), purchaseDocuments, evidence: buildAssetEvidenceGroups(source, evidenceFiles, { locale, componentsHref }) }`. `purchaseDocuments` is today's mapping (page.tsx :493-505), each with its `purchase_document` files (:486-492), in the shape `AssetPurchaseDocuments` takes.
- **`src/components/assets/asset-attachments.tsx`** (client; the whole file is rewritten):
  - Props as in **Interfaces**. Imports drop `next/image`, `NativeSelect`, `cn` (if unused) and gain `AssetPhotoFrame`, `Chip`, `FileQueueList`, `formatCount`, `formatDate` (`@/lib/utils`), `MAX_UPLOAD_BYTES`, `isUnauthorizedError`, `Upload` and `FileText` (lucide).
  - A module-level `postAssetAttachment(assetId: string, file: File, label: string, fallbackError: string): Promise<void>`: today's `uploadAttachment` body (:109-123), `photoLabel` only when `label` is not empty (`if (label) formData.append("photoLabel", label)`, as pinned: the field `src/app/api/assets/[id]/attachments/route.ts:35` reads).
  - `AssetAttachments`: state `deletingId`, `preview: AssetFilePhoto | null`, `showAllPhotos`, `uploadingLabel: string | null`. `handleDelete(file: { id: string; originalName: string })` is today's (:125-146) with `confirm({ title: tCommon("deleteConfirm"), description: file.originalName, confirmLabel: tCommon("delete"), tone: "destructive" })` exactly as the test pins. `handleChecklistUpload(label, file)` is today's (:95-107) through `postAssetAttachment`, setting `uploadingLabel`.
  - Render `<ContentPanel divided title={t("filesTab.title")}>` holding, in order:
    1. `{canEdit ? <AssetFileUpload assetId={assetId} /> : null}`;
    2. `<EmptyNote>{t("filesTab.empty")}</EmptyNote>` when `photos` and `documents` are both empty;
    3. from `lg`, a 12-column grid when both photos (or an editor's missing tiles) and documents show: photos in 7 columns, documents in 5 (the board's split); otherwise each block takes the full width;
    4. the photos block, when `photos.length > 0 || (canEdit && missingChecklistLabels.length > 0)`: the pinned `<h3 className="mb-3 text-sm font-semibold text-foreground">{t("filesTab.photos", { count: formatCount(photos.length) })}</h3>`, then `<ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">` of `getAssetPhotoGalleryState(photos, showAllPhotos).visibleItems` as `<PhotoTile photo={photo} onOpen={() => setPreview(photo)} onDelete={canEdit ? () => handleDelete(photo) : undefined} deleting={deletingId === photo.id} />`, then `{canEdit ? missingChecklistLabels.map((label) => (…)) : null}`: each an `<li>` with the label (`text-sm font-medium text-foreground`), `<StatusBadge label={t("photoChecklistPending")} tone="muted" />`, and today's checklist drop zone (:227-238) as `<Field label={label} hideLabel>` + `<FileDropzone file={null} onFileChange={(file) => handleChecklistUpload(label, file)} disabled={uploadingLabel === label} accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif" capture="environment" title={t("dropAssetPhotoTitle")} description={uploadingLabel === label ? t("uploading") : t("checklistPhotoDescription")} browseLabel={t("dropAssetPhotoHint")} />`; then today's `GalleryToggle` (:412-430, unchanged) when the gallery overflows;
    5. the documents block, when `documents.length > 0`: the pinned `<h3>` with `t("filesTab.documents", { count: formatCount(documents.length) })`, then `<ul className="divide-y divide-border-soft">` of `<DocumentRow document={document} onDelete={canEdit ? () => handleDelete(document) : undefined} deleting={deletingId === document.id} />`;
    6. `<AttachmentPreviewDialog open={preview !== null} … title={preview?.label ?? preview?.originalName ?? ""} subtitle={preview?.originalName} kind="image" src={preview ? \`/api/attachments/${preview.id}?inline=1\` : ""} alt={preview?.originalName} downloadHref={preview ? \`/api/attachments/${preview.id}\` : undefined} downloadLabel={t("download")} />` (the original, only when a person opens it).
  - `PhotoTile({ photo, onOpen, onDelete, deleting })`: an `<li className="min-w-0">` with the file's one raw `<button type="button" onClick={onOpen} aria-label={t("filesTab.openPhoto", { name: photo.label ?? photo.originalName })} className="relative block aspect-[4/3] w-full overflow-hidden rounded-md border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">` around the pinned `<AssetPhotoFrame attachmentId={photo.id} alt={photo.originalName} canUpload={false} previewable={false} />` (R26: the frame fills the button's box and renders no button or dialog of its own; no `className` is needed); under it a line with `{photo.primary ? <Chip>{t("filesTab.primaryPhoto")}</Chip> : null}`, the name (`photo.label ?? photo.originalName`, `truncate text-sm text-foreground`) and, when `onDelete`, `<Button variant="danger" size="icon-sm" onClick={onDelete} busy={deleting} aria-label={t("filesTab.deleteNamed", { name })} title={t("filesTab.deleteNamed", { name })}><Trash2 aria-hidden="true" /></Button>` (`const name = photo.label ?? photo.originalName`). The button's comment: "The photo is the control that opens the original (plan 2D-3 R5, the N3 EXEMPT row)."
  - `DocumentRow({ document, onDelete, deleting })`: an `<li className="flex min-h-11 items-center gap-3 py-2">` with `<FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />`, the name (`truncate text-sm text-foreground`) over `{formatFileSize(document.fileSize)} · {formatDate(document.uploadedAt)}` (`text-meta text-muted-foreground`), the download link `<a href={\`/api/attachments/${document.id}\`} aria-label={t("filesTab.downloadNamed", { name: document.originalName })} title={…same…} className={buttonVariants({ variant: "outline", size: "icon-sm" })}><Download aria-hidden="true" /></a>` and, when `onDelete`, the danger `icon-sm` delete as in `PhotoTile` with `name = document.originalName`.
  - `AssetFileUpload({ assetId })` (local, client): state `queue: { key: string; file: File; error: string | null }[]`, `uploading`, `progress: { done: number; total: number } | null`; `addFiles(next: File[])` appends (a running counter makes the keys); `removeQueued(key)`.
    - On the phone, first `<div className="md:hidden">` + `<FileDropzone file={null} onFileChange={(file) => { if (file) addFiles([file]) }} disabled={uploading} accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment" title={t("filesTab.takePhoto")} browseLabel={t("filesTab.takePhotoHint")} />` + `</div>`.
    - Then the free zone: `<FileDropzone` with `file={null}`, `onFileChange={(file) => { if (file) addFiles([file]) }}`, `onFilesChange={addFiles}`, `disabled={uploading}`, `multiple` (its own line), `title={t("dropFileTitle")}`, `description={t("filesTab.dropDescription", { size: formatCount(MAX_UPLOAD_BYTES / (1024 * 1024)) })}`, `browseLabel={t("dropFileHint")}` and no `accept` (the server's list decides, as today).
    - `<FileQueueList items={queue.map((item) => ({ id: item.key, name: item.file.name, detail: item.error ?? formatFileSize(item.file.size) }))} disabled={uploading} onRemove={removeQueued} />`.
    - When the queue holds files: a right-aligned row with `{progress ? <span role="status" className="text-meta text-muted-foreground">{t("filesTab.uploadProgress", { done: formatCount(progress.done), total: formatCount(progress.total) })}</span> : null}` and `<Button busy={uploading} onClick={uploadQueued}>` + `<Upload aria-hidden="true" />` + `{t("filesTab.upload", { count: formatCount(queue.length) })}`.
    - `uploadQueued` (the algorithm): for each queued file in order, `postAssetAttachment(assetId, file, "", tCommon("error"))`; a success leaves the queue; a failure whose error `isUnauthorizedError` calls `apiError.toast(error)` (the session-expired login) and stops; any other failure stays in the queue with `apiError.describe(error).message` as its `error`. Afterwards: `toast.success(t("filesTab.uploadDone", { count }))` and `router.refresh()` when any file went up; `toast.error(t("filesTab.uploadFailed", { count }))` when any stayed. The route takes one file per request, so the files go one after another.
  - The busy rules hold: no `disabled` repeats `uploading` on the same tag as `busy={uploading}` (GB4), and no busy button's label reads its busy value (GB3).
- **`src/components/assets/asset-purchase-documents.tsx`:** props become `{ documents: PurchaseDocument[]; canEdit: boolean }` (`legacyAttachments` goes: those `asset_purchase` files are documents of "รูปและไฟล์แนบ" now). The wrapper `<div className="mt-5 border-t border-border pt-5">` and its `<h3>` (:73-74) become `<ContentPanel title={t("purchaseDocuments")}>` (its closing at :108 follows); `hasDocuments` is `documents.length > 0`; the legacy cards and their comment (:100-105) go. `AttachmentCard` takes `onDelete?: (id: string) => void` instead of the required one, the caller passes `onDelete={canEdit ? handleDelete : undefined}`, and the delete `Button` (:136-145, unchanged) sits in `{onDelete ? ( … ) : null}`. Everything else (the type label, the tag, `orNil`, the download link) stays as it is.
- **`src/components/assets/detail/asset-files-tab.tsx`** (server; `const t = await getTranslations("asset")`):
  - `<div className="space-y-6">` holding `<div id="photos" className="scroll-mt-24">` + the pinned `<AssetAttachments … />`, then `<div id="purchase-documents" className="scroll-mt-24">` + the pinned `<AssetPurchaseDocuments … />`, then the evidence panel.
  - The evidence: the pinned `<ContentPanel divided flush …>`; `data.evidence.length === 0` → the pinned `<EmptyNote padded>`; else `<ContentPanelRows>` with one `<li key={group.key} className="grid gap-2">` per group:
    - a line (`flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-sm`): `<span className="font-medium text-foreground">{t(\`filesTab.evidenceKinds.${group.kind}\`)}</span>`, the pinned `<Link href={group.href} …><span className="tag">{group.code}</span></Link>`, `<span className="text-meta text-muted-foreground">{formatDate(group.at)}</span>` (the app's `formatDate`, R37; `formatAssetDetailDate` stays the frame's and the history's);
    - `<ul className="flex flex-wrap gap-3">` of its files: `const caption = file.labelKey ? t(file.labelKey) : file.name`; an `<li>` with `<a href={\`/api/attachments/${file.id}?inline=1\`} target="_blank" rel="noreferrer" className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 max-w-60 items-center gap-2 text-sm md:min-h-0")}>` holding, for `isThumbnailable(file.fileType)`, the pinned `<AssetThumbnail … preview={false} />` (its 96px thumbnail, the list rule DESIGN.md:638, with the placeholder on error), else `<span className="flex size-11 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"><FileText className="size-4" aria-hidden="true" /></span>`, then `<span className="truncate">{caption}</span>`.
  - No write control in this file outside the two client parts.
- **`src/lib/asset-detail-view.ts`:** `"handover"` leaves `AssetDetailSectionId` and the components view's list (R23); `npx tsc --noEmit` finds any `sectionHref("handover")` left (Task 8C replaced the lifecycle's).
- **`page.tsx`:**
  - Import `getAssetFilesTabData` (`@/lib/asset-files-data`) and `AssetFilesTab` (`@/components/assets/detail/asset-files-tab`).
  - On the files view only (this task owns the tab's loader; Task 7's per-view load was interim, R24): `const filesData = assetDetailView === "files" ? await withPerformanceTiming("asset-detail.files-tab", () => getAssetFilesTabData({ id: asset.id, categoryId: asset.categoryId }, { locale, componentsHref: buildAssetDetailViewHref(locale, asset.id, "components", returnToHref), can: { maintenanceView: canViewMaintenance, auditView: canViewAudit, disposalView: canViewDisposal } }), { route: "/assets/[id]", locale }) : null` (`assetDetailView`, `returnToHref`, `canEditAsset` and the three `canView*` as the page names them after Task 8C).
  - The files tab's body (Task 8C's interim `#photos` and `#purchase-documents` sections, R25) becomes `{filesData ? <AssetFilesTab locale={locale} assetId={asset.id} data={filesData} canEdit={canEditAsset} /> : null}`.
  - Delete the parts listed under **Files** that are still there, and every import, read and helper only they used: `npx tsc --noEmit` and `npx eslint "src/app/[locale]/(dashboard)/assets/[id]/page.tsx"` (no-unused-vars) list what is left over. The `#handover` cards' documents stay reachable: the history's HO-/RT- links (Task 9) and the evidence groups' links above.
- Run `node scripts/messages-edit.mjs` with the deletions of Step 2 now that the code is final.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `node --test tests/asset-files-rules.test.ts tests/asset-files-tab-ui.test.ts tests/asset-detail-format.test.ts tests/asset-photo-gallery.test.ts tests/asset-forms-ui.test.ts tests/assets-sweep-ui.test.ts tests/attachment-preview-dialog-ui.test.ts tests/confirm-dialog-ui.test.ts tests/file-evidence-ui.test.ts tests/asset-handover-presentation.test.ts tests/asset-detail-ux.test.ts tests/asset-detail-view.test.ts tests/asset-detail-data-boundaries.test.ts tests/asset-detail-page.test.ts tests/performance-route-instrumentation.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts tests/form-migration-guards.test.ts tests/ui-overlay-guards.test.ts tests/dark-mode-p.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts tests/dead-code-cleanup.test.ts && npx tsc --noEmit && npx eslint src/lib/asset-files-rules.ts src/lib/asset-files-data.ts src/lib/asset-detail-format.ts src/lib/asset-detail-view.ts src/components/assets/asset-attachments.tsx src/components/assets/asset-purchase-documents.tsx src/components/assets/detail/asset-files-tab.tsx "src/app/[locale]/(dashboard)/assets/[id]/page.tsx"`
Expected: PASS. The N3 row reads 1; dark-mode-p reads 14 images and 10 stages, with no new `<img>`/`Image` (the tiles' image is `AssetPhotoFrame`'s, the evidence's is `AssetThumbnail`'s); no `<td colSpan>`, no typed `"-"`, no status ink outside `ui/`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/asset-files-rules.ts src/lib/asset-files-data.ts src/lib/asset-detail-format.ts src/lib/asset-detail-view.ts src/components/assets/asset-attachments.tsx src/components/assets/asset-purchase-documents.tsx src/components/assets/detail/asset-files-tab.tsx "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" messages/th.json messages/en.json tests/asset-files-rules.test.ts tests/asset-files-tab-ui.test.ts tests/asset-forms-ui.test.ts tests/assets-sweep-ui.test.ts tests/file-evidence-ui.test.ts tests/visual-foundation-guards.test.ts tests/dark-mode-p.test.ts tests/asset-handover-presentation.test.ts tests/asset-detail-ux.test.ts tests/asset-detail-view.test.ts tests/asset-detail-data-boundaries.test.ts tests/asset-detail-page.test.ts tests/performance-route-instrumentation.test.ts
git commit -m "feat(assets): the files tab holds the asset's photos and files, its purchase documents and the evidence from other work (group 1 asset detail task 11)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: The repair / PM tab

The repair / PM tab (`?view=maintenance`, Task 7) opens with a StatStrip of three numbers ("ซ่อมมาแล้ว N ครั้ง", "เวลาที่ไม่ได้ใช้งานเพราะซ่อม N วัน", "ค่าใช้จ่ายซ่อมรวม N บาท"), then today's replacement Notice, the repair table with "บันทึกซ่อม" by Task 1's one rule (`getAssetRecordRepairAction`, R4), and "บำรุงรักษาตามรอบ (PM)" with the asset's plans, loaded for the first time, and "ตั้งรอบ PM" for `maintenance:create` (spec §7.7). It replaces today's `#maintenance` section, which Task 8C left in this tab (R25).

**Files:**
- Create: `src/lib/asset-repair-rules.ts` (pure; relative `.ts` imports only)
- Create: `src/lib/asset-maintenance-data.ts` (server)
- Create: `src/components/assets/detail/asset-maintenance-tab.tsx` (server component)
- Modify: `src/lib/preventive-maintenance.ts:97` (`maintenancePlanStateOrder` is exported)
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx` (as Tasks 8C-11 left it; master f6368e19 lines): the `#maintenance` section :1457-1533; `openMaintenanceCount`, `latestMaintenanceTicket`, `totalMaintenanceCost`, `maintenanceReplacementWarning` :715-720 and `maintenanceSummary` :763-767 where still present; `maintenanceHref` :790 (after Task 8C its last reader is the `#maintenance` empty state's `actionHref` :1488; the tab's "บันทึกซ่อม" href is Task 1's rule's, R4); the `maintenanceTickets` relation :212-219 when nothing else reads it after this task (Task 8C reads the open repair through its own query, Task 9's history through `getAssetHistory`)
- Modify: `src/lib/asset-detail-data.ts` (as Tasks 7 and 9 left it): when the relation goes, `maintenanceLimit` leaves `AssetDetailLoadPolicy`, `previewPolicy` and every view's policy (Task 7's per-view load was interim; this task owns the tab's loader, R24). `assetRepairRecordWhere` stays: the count and this tab's loader share it.
- Modify: `messages/th.json`, `messages/en.json` (through `node scripts/messages-edit.mjs`)
- No skeleton change: the tab body streams inside Task 8C's frame, whose `AssetDetailPageSkeleton` is the route's
- Test (new): `tests/asset-repair-rules.test.ts`, `tests/asset-maintenance-tab-ui.test.ts`
- Test (rewritten pins):
  - `tests/open-repair-filter.test.ts:20-25`: `assert.match(detail, /maintenancePlanId/)` (:24) reads `src/components/assets/detail/asset-maintenance-tab.tsx` instead of the page; the `maintenanceHref` line (:22) is rewritten to `assert.doesNotMatch(detail, /const maintenanceHref\b/)` plus `assert.match(readFileSync("src/lib/asset-actions.ts", "utf8"), /maintenance\/new\?assetId=/)` (R4 moved the repair link onto Task 1's rule); the `isPreventiveMaintenanceTicket` line (:23) stays on the page
  - `tests/asset-detail-ux.test.ts` (as Tasks 8C-11 left it): the `<DataTable framed=\{false\} caption=` and `<StatStrip\b` count lines in the page (master :172, :174; 1 each after Task 9) become `assert.doesNotMatch(source, /<DataTable framed=\{false\} caption=/)` and `assert.doesNotMatch(source, /<StatStrip\b/)` (the tab's table and strip live in its own file); the `tone=\{getRepairRecordStatusTone\(ticket\.repairStatus\)\}` line (master :173) goes (the tab test pins `repair.repairStatus`)
  - `tests/assets-sweep-ui.test.ts` "asset page: panels, notices…" (master :111-133, as Tasks 8C, 9, 10 and 11 left it): the replacement Notice line (:117), the `<Chip>{t("maintenancePmBadge")}</Chip>` line (:122) and the repair link line (:125) go (the tab test pins them in their new place), and the `getPanelClasses(), "scroll-mt-24 p-4 sm:p-5"` count line (1 after Task 11, `#maintenance`) becomes `assert.doesNotMatch(source, /getPanelClasses\(\), "scroll-mt-24 p-4 sm:p-5"/)`
  - `tests/asset-detail-anchor-layout.test.ts` (as Task 8C left it): the `<section id="maintenance"` and `isAssetDetailSectionVisible(assetDetailView, "maintenance")` assertions (master :10, :14, :16, :19) go; the file goes when nothing is left in it
  - `tests/performance-route-instrumentation.test.ts:15-20`: the asset-detail list gains `"asset-detail.maintenance-tab"` (R24's naming)
  - `tests/asset-detail-data-boundaries.test.ts` (as Tasks 7 and 9 left it), when the relation goes: `maintenanceLimit` leaves the pinned `preview` object and every policy that names it (the maintenance policy becomes `preview` itself: `assert.deepEqual(getAssetDetailLoadPolicy("maintenance"), preview)`), and the page pin `take: loadPolicy\.maintenanceLimit` goes; the `assetRepairRecordWhere("a1")` assertion stays
  - Unchanged and still passing: `tests/maintenance-history-labels.test.ts`, `tests/preventive-maintenance.test.ts`, `tests/list-pagination.test.ts` and `tests/pm-plans-ui.test.ts` (the PM list's own order still reads `maintenancePlanStateOrder`; only `export` is added).

**Interfaces:**
- Consumes:
  - Task 1 (with R2-R4): `type AssetPrimaryAction = AssetAction & { enabled: true; href: string; reasonKey: null }` and `getAssetRecordRepairAction(input: AssetActionInput): AssetPrimaryAction | null` (`src/lib/asset-actions.ts`): "บันทึกซ่อม" when some record the repair form can save is accepted now and the person has `maintenance:create`, else `null`; its `href` is `/${locale}/maintenance/new?assetId=…` with no `returnTo` (R4), its `labelKey` a full key (`asset.quickMaintenance`, R2). The page passes the rule's own answer for the page's `AssetActionInput`, not the header's pin, which Task 8C hides when the primary already is "บันทึกซ่อม".
  - Task 7: `resolveAssetDetailView(raw).view === "maintenance"`; `assetRepairRecordWhere(assetId: string): Prisma.MaintenanceTicketWhereInput` (`src/lib/asset-detail-data.ts`, `{ assetId, isActive: true }`), the where `getAssetDetailCounts(assetId).repairs` (`src/lib/asset-detail-counts.ts`, R22) counts with: every active record, the rows of this tab's table (R24). The loader lists with the same builder.
  - Task 8C: the page's `assetDetailView`, `now`, `canCreateMaintenance`, `canViewMaintenance` and the `AssetActionInput` it gives `getAssetActions`.
  - Dashboard plan: `bangkokDayDiff(from: Date, to: Date): number` (`src/lib/waiting-work-rules.ts`).
  - Existing: `isOpenRepairStatus`, `toRepairRecordStatus`, `getRepairRecordStatusTone` (`src/lib/repair-record-policy.ts`), `getMaintenancePlanDueState`, `maintenancePlanStateOrder` (`src/lib/preventive-maintenance.ts`), `CLOSED_AUDIT_STATUS_NAMES` (`src/lib/audit-round-scope.ts`), `StatStrip`, `Notice`, `ContentPanel`, `ContentPanelRows`, `DataTable*`, `DataTableRow`, `ClickableTableRow`, `Chip`, `StatusBadge`, `EmptyNote`, `Nil`, `buttonVariants`, `linkVariants`, `formatCount`, `formatMoney`, `formatDate`.
- Produces:
  - `src/lib/asset-repair-rules.ts`:
    - `type AssetRepairTicket = { id: string; repairStatus: string; maintenancePlanId: string | null; reportedDate: Date; returnDate: Date | null; repairCost: number | null }`
    - `type AssetRepairRow = AssetRepairTicket & { repairNo: string; problem: string; resolution: string | null; repairer: string | null }`
    - `type AssetPmPlanRow = { id: string; planNo: string; title: string; frequency: string; nextDueDate: Date; planState: string; vendor: { code: string; name: string } | null }`
    - `repairDays(ticket: Pick<AssetRepairTicket, "repairStatus" | "reportedDate" | "returnDate">, now: Date): number | null`
    - `type AssetRepairSummary = { repairCount: number; excludedCount: number; downtimeDays: number; hasOpenRepair: boolean; totalCost: number; replacementWarning: boolean }`
    - `summarizeAssetRepairs(tickets: readonly AssetRepairTicket[], purchasePrice: number | null, now: Date): AssetRepairSummary`
    - `formatRepairPeriod(from: Date, to: Date | null, locale: string): string`
    - `orderAssetPmPlans<T extends { id: string; planState: string; nextDueDate: Date }>(plans: readonly T[]): T[]`
    - `canSetUpPm(statusName: string, canCreate: boolean): boolean`
  - `src/lib/asset-maintenance-data.ts`: `getAssetMaintenanceTabData(assetId: string): Promise<{ repairs: AssetRepairRow[]; plans: AssetPmPlanRow[] }>`
  - `src/components/assets/detail/asset-maintenance-tab.tsx`: `AssetMaintenanceTab({ locale, assetId, repairs, plans, purchasePrice, now, recordRepair, canViewRepairs, canCreatePlan }: { locale: string; assetId: string; repairs: readonly AssetRepairRow[]; plans: readonly AssetPmPlanRow[]; purchasePrice: number | null; now: Date; recordRepair: AssetPrimaryAction | null; canViewRepairs: boolean; canCreatePlan: boolean })` (server, async).
  - For Task 13: on `?view=maintenance` the link "บันทึกซ่อม" shows twice for a person with `maintenance:create` (the header's pin, or the primary on a Pending Repair asset, and this tab's), so a step there scopes it to the tab. No spec §10 step visits this tab; Task 13 adds its four-project axe visit on a test asset with a repair (R43). The viewer finds neither "บันทึกซ่อม" nor "ตั้งรอบ PM" here (R42). The tab's words for Task 13's list (R44): "ซ่อมมาแล้ว", "บำรุงรักษาตามรอบ (PM)", "ตั้งรอบ PM".

- [ ] **Step 1: Add the tab's messages**

Through `node scripts/messages-edit.mjs`, set in `asset` (nested under `repairTab`):

| Key | th | en |
|---|---|---|
| `repairTab.repairCount` | ซ่อมมาแล้ว | Repaired |
| `repairTab.timesUnit` | ครั้ง | times |
| `repairTab.downtime` | เวลาที่ไม่ได้ใช้งานเพราะซ่อม | Out of use for repairs |
| `repairTab.daysUnit` | วัน | days |
| `repairTab.cost` | ค่าใช้จ่ายซ่อมรวม | Total repair cost |
| `repairTab.excludedFoot` | ไม่รวม PM และที่ยกเลิก {count} รายการ | PM and cancelled left out: {count} |
| `repairTab.openFoot` | นับงานที่ยังไม่ปิดถึงวันนี้ | Open repairs count up to today |
| `repairTab.repairsTitle` | งานซ่อม | Repairs |
| `repairTab.workColumn` | อาการ / สิ่งที่ทำ | Problem / work done |
| `repairTab.periodColumn` | เปิด – ปิด | Opened – closed |
| `repairTab.repairerColumn` | ผู้ซ่อม | Repaired by |
| `repairTab.costColumn` | ค่าใช้จ่าย (บาท) | Cost (THB) |
| `repairTab.days` | {days} วัน | {days} days |
| `repairTab.openDays` | ยังไม่ปิด · {days} วัน | Still open · {days} days |
| `repairTab.pmTitle` | บำรุงรักษาตามรอบ (PM) | Preventive maintenance (PM) |
| `repairTab.pmEmpty` | ยังไม่ได้ตั้งรอบ PM สำหรับทรัพย์สินนี้ เช่น ทำความสะอาดและตรวจแบตเตอรี่ทุก 6 เดือน | No PM plan for this asset yet, for example cleaning and a battery check every 6 months |
| `repairTab.pmSetup` | ตั้งรอบ PM | Set up PM |

Kept, not new: the repair number column `maintenancePage.repairNo` ("เลขที่ใบซ่อม"), the statuses `maintenancePage.statuses.*`, the PM words `maintenancePage.pmNextDueDate`, `pmExternalProvider`, `pmNoExternalProvider`, `pmFrequencies.*`, `pmPlanStates.*`, `pmDueState.*`, the empty repairs line `asset.noMaintenanceTitle` ("ยังไม่มีประวัติซ่อม"), `asset.maintenancePmBadge`, `asset.maintenanceReplacementWarning`, `common.baht`, `common.status`.

Delete, in both locales, each of these keys still present that no file under `src` reads after Step 4 (`git grep -n -e 't("<key>"' -e '"asset.<key>"' -- src`, `<key>` being the part after `asset.`, prints nothing: R2's action rule names its keys in full): `asset.openMaintenance`, `asset.totalMaintenance`, `asset.maintenanceTotalCost`, `asset.openMaintenanceCount`, `asset.latestMaintenanceSummary`, `asset.noMaintenanceHelp`, `asset.detailSections.maintenanceSubtitle`.

Glossary: "บันทึกซ่อม" stays the repair word (the button reads Task 1's `asset.quickMaintenance` through the root `getTranslations()`, R2); "บำรุงรักษาตามรอบ (PM)" is the glossary's heading for PM (§2.3); PM a kept term; no "แจ้งซ่อม", "อยู่ที่" or "ตรวจทาน".

- [ ] **Step 2: Write the failing tests**

`tests/asset-repair-rules.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { canSetUpPm, formatRepairPeriod, orderAssetPmPlans, repairDays, summarizeAssetRepairs, type AssetRepairTicket } from "../src/lib/asset-repair-rules.ts"

// Group 1 asset detail task 12 (spec 2026-10-25 §7.7): the repair / PM tab's numbers. A repair is an active record that
// is neither cancelled nor a PM visit; its days run in Bangkok from the report to the return, or to today while open.
// 26 Oct 2026, 10:00 in Bangkok.
const now = new Date("2026-10-26T03:00:00.000Z")
const ticket = (id: string, over: Partial<AssetRepairTicket>): AssetRepairTicket => ({
  id,
  repairStatus: "closed",
  maintenancePlanId: null,
  reportedDate: new Date("2026-08-02T02:00:00.000Z"),
  returnDate: new Date("2026-08-15T09:00:00.000Z"),
  repairCost: null,
  ...over,
})

test("repairDays: Bangkok days from the report to the return, to today while open, none for a cancel", () => {
  assert.equal(repairDays(ticket("t1", {}), now), 13)
  // Reported 21 Oct 03:00 in Bangkok (20 Oct in UTC): 5 days by today.
  assert.equal(repairDays(ticket("t2", { repairStatus: "in_progress", reportedDate: new Date("2026-10-20T20:00:00.000Z"), returnDate: null }), now), 5)
  // An old-workflow status is still open (isOpenRepairStatus); 23:59 on the 25th is yesterday, 00:00 on the 26th today.
  assert.equal(repairDays(ticket("t3", { repairStatus: "waiting_parts", reportedDate: new Date("2026-10-25T16:59:00.000Z"), returnDate: null }), now), 1)
  assert.equal(repairDays(ticket("t4", { repairStatus: "in_progress", reportedDate: new Date("2026-10-25T17:00:00.000Z"), returnDate: null }), now), 0)
  assert.equal(repairDays(ticket("t5", { repairStatus: "cancelled", returnDate: null }), now), null)
  assert.equal(repairDays(ticket("t6", { returnDate: null }), now), null, "a closed record without a return date")
  assert.equal(repairDays(ticket("t7", { returnDate: new Date("2026-08-02T05:00:00.000Z") }), now), 0, "recorded as done the day it was reported")
})

test("the strip: repairs that are neither PM nor cancelled, their days and their cost; the notice at 3 repairs or half the price (spec §7.7)", () => {
  const tickets = [
    ticket("t1", { repairCost: 1500 }),
    ticket("t2", { repairStatus: "in_progress", reportedDate: new Date("2026-10-20T20:00:00.000Z"), returnDate: null }),
    ticket("t3", { repairStatus: "cancelled", returnDate: null, repairCost: 999 }),
    ticket("t4", { maintenancePlanId: "plan-1", repairCost: 300 }),
  ]
  assert.deepEqual(summarizeAssetRepairs(tickets, 2800, now), { repairCount: 2, excludedCount: 2, downtimeDays: 18, hasOpenRepair: true, totalCost: 1500, replacementWarning: true })
  assert.equal(summarizeAssetRepairs(tickets, 4000, now).replacementWarning, false)
  assert.equal(summarizeAssetRepairs(tickets, null, now).replacementWarning, false, "no price: only the count rule")
  assert.equal(summarizeAssetRepairs(tickets, 0, now).replacementWarning, false)
  const three = [ticket("a", {}), ticket("b", {}), ticket("c", {})]
  assert.deepEqual(summarizeAssetRepairs(three, null, now), { repairCount: 3, excludedCount: 0, downtimeDays: 39, hasOpenRepair: false, totalCost: 0, replacementWarning: true })
  assert.deepEqual(summarizeAssetRepairs([], 1000, now), { repairCount: 0, excludedCount: 0, downtimeDays: 0, hasOpenRepair: false, totalCost: 0, replacementWarning: false })
})

test("formatRepairPeriod: one month and one year written once, Bangkok days, Buddhist years in Thai", () => {
  const d = (iso: string) => new Date(iso)
  assert.equal(formatRepairPeriod(d("2026-08-02T03:00:00Z"), d("2026-08-15T03:00:00Z"), "th"), "2 – 15 ส.ค. 2569")
  assert.equal(formatRepairPeriod(d("2026-07-30T03:00:00Z"), d("2026-08-15T03:00:00Z"), "th"), "30 ก.ค. – 15 ส.ค. 2569")
  assert.equal(formatRepairPeriod(d("2026-12-30T03:00:00Z"), d("2027-01-03T03:00:00Z"), "th"), "30 ธ.ค. 2569 – 3 ม.ค. 2570")
  assert.equal(formatRepairPeriod(d("2026-08-02T03:00:00Z"), d("2026-08-02T10:00:00Z"), "th"), "2 ส.ค. 2569")
  assert.equal(formatRepairPeriod(d("2026-08-01T18:30:00Z"), null, "th"), "2 ส.ค. 2569")
  assert.equal(formatRepairPeriod(d("2026-08-01T16:59:00Z"), d("2026-08-01T17:00:00Z"), "th"), "1 – 2 ส.ค. 2569")
  assert.equal(formatRepairPeriod(d("2026-08-02T03:00:00Z"), d("2026-08-15T03:00:00Z"), "en"), "2 – 15 Aug 2026")
})

test("PM plans: active, then paused, then ended, each by next due date; a written-off asset gets no new plan", () => {
  const plan = (id: string, planState: string, due: string) => ({ id, planState, nextDueDate: new Date(due) })
  const plans = [plan("p1", "ended", "2026-01-01"), plan("p2", "active", "2026-12-01"), plan("p3", "paused", "2026-11-01"), plan("p4", "active", "2026-11-15")]
  assert.deepEqual(orderAssetPmPlans(plans).map((entry) => entry.id), ["p4", "p2", "p3", "p1"])
  assert.equal(canSetUpPm("In Use", true), true)
  assert.equal(canSetUpPm("Disposed", true), false)
  assert.equal(canSetUpPm("Retired", true), false)
  assert.equal(canSetUpPm("Ready", false), false)
})
```

`tests/asset-maintenance-tab-ui.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 1 asset detail task 12 (spec 2026-10-25 §7.7): the repair / PM tab. The strip sits at the top level, never in a
// panel; a repair links only for a person who may open it; บันทึกซ่อม is the action rule's (Task 1, R4: shown only when it
// can run now) and ตั้งรอบ PM needs maintenance:create, so the viewer finds no write link (spec §10). Sources are read with
// LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const TAB = "src/components/assets/detail/asset-maintenance-tab.tsx"

test("the repair tab: three numbers, the replacement notice, the repairs and the PM plans (spec §7.7)", () => {
  const source = read(TAB)
  assert.doesNotMatch(source, /"use client"/)
  assert.match(source, /<div id="maintenance" className="scroll-mt-24 space-y-6">\n\s+<StatStrip\b/)
  assert.match(source, /const summary = summarizeAssetRepairs\(repairs, purchasePrice, now\)/)
  for (const key of ["repairs", "downtime", "cost"]) assert.ok(source.includes(`key: "${key}"`), key)
  assert.match(source, /value: formatCount\(summary\.repairCount\), unit: t\("repairTab\.timesUnit"\)/)
  assert.match(source, /value: formatCount\(summary\.downtimeDays\), unit: t\("repairTab\.daysUnit"\)/)
  assert.match(source, /value: formatMoney\(summary\.totalCost\), unit: tCommon\("baht"\)/)
  assert.match(source, /\{summary\.replacementWarning \? <Notice tone="warning">\{t\("maintenanceReplacementWarning"\)\}<\/Notice> : null\}/)
  assert.match(source, /<ContentPanel divided flush title=\{t\("repairTab\.repairsTitle"\)\}/)
  assert.match(source, /<DataTable framed=\{false\} caption=\{t\("repairTab\.repairsTitle"\)\} scrollHint=\{tCommon\("tableScrollHint"\)\}>/)
  assert.match(source, /<Chip>\{t\("maintenancePmBadge"\)\}<\/Chip>/)
  assert.match(source, /maintenancePlanId/)
  assert.match(source, /tone=\{getRepairRecordStatusTone\(repair\.repairStatus\)\}/)
  assert.match(source, /formatRepairPeriod\(repair\.reportedDate, repair\.returnDate, locale\)/)
  assert.match(source, /<ContentPanel divided flush title=\{t\("repairTab\.pmTitle"\)\}/)
  assert.match(source, /<EmptyNote padded>\{t\("repairTab\.pmEmpty"\)\}<\/EmptyNote>/)
  assert.match(source, /<EmptyNote padded>\{t\("noMaintenanceTitle"\)\}<\/EmptyNote>/)
  assert.match(source, /<ContentPanelRows className="md:hidden">/, "the phone gets one row per repair")
})

test("the repair tab: links and write controls follow their permission (spec §7.1, §10 viewer)", () => {
  const source = read(TAB)
  assert.match(source, /canViewRepairs \?\s*\(?\s*<ClickableTableRow/)
  assert.match(source, /<DataTableRow key=\{repair\.id\}>/)
  // The rule's answer is an action that can run now or nothing (R3, R4); its words are full keys read at the root (R2).
  assert.match(source, /actions=\{\s*recordRepair \? \(?\s*<Link href=\{recordRepair\.href\}/)
  assert.match(source, /\{tAll\(recordRepair\.labelKey\)\}/)
  assert.match(source, /const tAll = await getTranslations\(\)/)
  assert.doesNotMatch(source, /reasonKey|recordRepair\?\.enabled/)
  assert.match(source, /canCreatePlan \?/)
  assert.match(source, /href=\{`\/\$\{locale\}\/maintenance\/pm\/new\?assetId=\$\{encodeURIComponent\(assetId\)\}`\}/)
  assert.equal(source.match(/\/maintenance\/new\b/g), null, "the record-repair href is the action rule's, never written here")
})

test("the loader reads every active repair, newest first, and every PM plan of the asset", () => {
  const loader = read("src/lib/asset-maintenance-data.ts")
  // The repairs count's where (Task 7): the table lists exactly the rows the tab count says (R24).
  assert.match(loader, /prisma\.maintenanceTicket\.findMany\(\{\n\s+where: assetRepairRecordWhere\(assetId\),/)
  assert.match(loader, /orderBy: \[\{ reportedDate: "desc" \}, \{ createdAt: "desc" \}\]/)
  assert.match(loader, /prisma\.maintenancePlan\.findMany\(\{\n\s+where: \{ assetId \},/)
  assert.match(loader, /orderAssetPmPlans\(/)
  assert.doesNotMatch(loader, /\btake:/)
})

test("the page loads the repair tab's data only on that tab", () => {
  const page = read("src/app/[locale]/(dashboard)/assets/[id]/page.tsx")
  assert.match(page, /assetDetailView === "maintenance"\s*\?\s*await withPerformanceTiming\(\s*"asset-detail\.maintenance-tab",\s*\(\) =>\s*getAssetMaintenanceTabData\(asset\.id\)/)
  assert.match(page, /<AssetMaintenanceTab\b/)
  assert.match(page, /recordRepair=\{getAssetRecordRepairAction\(actionInput\)\}/, "the rule's own answer, not the header's pin")
  assert.match(page, /canCreatePlan=\{canSetUpPm\(asset\.status\.name, canCreateMaintenance\)\}/)
  assert.match(page, /canViewRepairs=\{canViewMaintenance\}/)
  assert.doesNotMatch(page, /<section id="maintenance"|maintenanceReplacementWarning|totalMaintenanceCost/)
})

test("the repair tab's words, in Thai and English (group 1 spec §7.7)", () => {
  const repairTab = (locale: string) => (JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { asset: { repairTab: Record<string, string> } }).asset.repairTab
  assert.equal(repairTab("th").repairCount, "ซ่อมมาแล้ว")
  assert.equal(repairTab("th").downtime, "เวลาที่ไม่ได้ใช้งานเพราะซ่อม")
  assert.equal(repairTab("th").cost, "ค่าใช้จ่ายซ่อมรวม")
  assert.equal(repairTab("th").pmTitle, "บำรุงรักษาตามรอบ (PM)")
  assert.equal(repairTab("th").pmSetup, "ตั้งรอบ PM")
  assert.equal(repairTab("en").pmSetup, "Set up PM")
})
```

Rewrite the pins named under **Files**: `tests/open-repair-filter.test.ts:24` becomes `assert.match(readFileSync("src/components/assets/detail/asset-maintenance-tab.tsx", "utf8"), /maintenancePlanId/)`; its :22 line becomes the two lines given there; the page's DataTable/StatStrip counts, its Notice, PM chip and repair link lines, the anchor-layout assertions, the timing label and the load-policy lines as listed there.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test tests/asset-repair-rules.test.ts tests/asset-maintenance-tab-ui.test.ts`
Expected: FAIL. `asset-repair-rules.test.ts` stops at its import (`asset-repair-rules.ts` does not exist); the UI test cannot read `asset-maintenance-tab.tsx` and `asset-maintenance-data.ts`, and the page still holds `<section id="maintenance"`.

- [ ] **Step 4: Implement the tab**

- **`src/lib/preventive-maintenance.ts:97`:** `export const maintenancePlanStateOrder = …` (the value and `planStatePageSlices` unchanged).
- **`src/lib/asset-repair-rules.ts`** (no `@/`; imports `bangkokDayDiff` from `./waiting-work-rules.ts`, `isOpenRepairStatus` from `./repair-record-policy.ts`, `maintenancePlanStateOrder` from `./preventive-maintenance.ts`, `CLOSED_AUDIT_STATUS_NAMES` from `./audit-round-scope.ts`):
  - `repairDays`: `cancelled` → `null`; open (`isOpenRepairStatus`) → `Math.max(0, bangkokDayDiff(reportedDate, now))`; otherwise `returnDate ? Math.max(0, bangkokDayDiff(reportedDate, returnDate)) : null`.
  - `summarizeAssetRepairs`: the repairs are the tickets with `repairStatus !== "cancelled"` and `maintenancePlanId === null`; `excludedCount = tickets.length - repairCount`; `downtimeDays` sums `repairDays(…) ?? 0` over them; `hasOpenRepair` when one is open; `totalCost` sums `repairCost ?? 0`; `replacementWarning = repairCount >= 3 || (purchasePrice != null && purchasePrice > 0 && totalCost >= purchasePrice * 0.5)` (today's rule, page.tsx :718-720, over these repairs).
  - `formatRepairPeriod` (the algorithm): read the day, the short month and the year of each date through one `Intl.DateTimeFormat(locale === "th" ? "th-TH-u-ca-buddhist" : "en-GB", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" }).formatToParts`; `to` null or the same Bangkok day → `"<d> <m> <y>"`; the same month and year → `"<d1> – <d2> <m> <y>"`; the same year → `"<d1> <m1> – <d2> <m2> <y>"`; else `"<d1> <m1> <y1> – <d2> <m2> <y2>"` (a space, an en dash, a space). Not `formatRange`, whose spacing differs by locale and ICU version.
  - `orderAssetPmPlans`: a sorted copy: the state's rank in `maintenancePlanStateOrder` (an unknown state last), then `nextDueDate`, then `id`.
  - `canSetUpPm(statusName, canCreate)`: `canCreate && !(CLOSED_AUDIT_STATUS_NAMES as readonly string[]).includes(statusName)` (the due-PM queue never lists a written-off asset's plan, `buildDuePmPlanWhere`).
- **`src/lib/asset-maintenance-data.ts`** (server; header: "The repair / PM tab's reads (group 1 spec §7.7): every active repair record of the asset and every PM plan, in one round. Read only."): one `Promise.all` of
  - `prisma.maintenanceTicket.findMany({` + `where: assetRepairRecordWhere(assetId),` (Task 7's builder from `@/lib/asset-detail-data`, `{ assetId, isActive: true }`) + `orderBy: [{ reportedDate: "desc" }, { createdAt: "desc" }],` + `select: { id: true, repairNo: true, repairStatus: true, maintenancePlanId: true, reportedDate: true, returnDate: true, repairCost: true, problem: true, resolution: true, vendor: { select: { name: true } }, assignedTo: { select: { fullNameTh: true } } } })` (no `take`: the strip sums every record, and the tab count counts the same rows, R24);
  - `prisma.maintenancePlan.findMany({` + `where: { assetId },` + `select: { id: true, planNo: true, title: true, frequency: true, nextDueDate: true, planState: true, vendor: { select: { code: true, name: true } } } })` (every state: an ended plan is the asset's history).
  - Map a ticket to `AssetRepairRow` with `repairCost: ticket.repairCost == null ? null : Number(ticket.repairCost)` and `repairer: ticket.vendor?.name ?? ticket.assignedTo?.fullNameTh ?? null`; return `{ repairs, plans: orderAssetPmPlans(plans) }`.
- **`src/components/assets/detail/asset-maintenance-tab.tsx`** (server, async; `t = await getTranslations("asset")`, `tMaintenance = await getTranslations("maintenancePage")`, `tCommon = await getTranslations("common")`, and the pinned `const tAll = await getTranslations()` for the action's full keys, R2; dates through the app's `formatDate` and `formatRepairPeriod`, not `formatAssetDetailDate`, R37):
  - `const summary = summarizeAssetRepairs(repairs, purchasePrice, now)`.
  - The root is the pinned `<div id="maintenance" className="scroll-mt-24 space-y-6">` (`#maintenance` links land here, Task 7), and its first child the `StatStrip`, outside any panel:
    - `{ key: "repairs", label: t("repairTab.repairCount"), value: formatCount(summary.repairCount), unit: t("repairTab.timesUnit"), foot: summary.excludedCount > 0 ? t("repairTab.excludedFoot", { count: formatCount(summary.excludedCount) }) : undefined }` (R24: the strip leaves out cancelled and PM records, which the tab count includes, and its foot names them whenever there are any);
    - `{ key: "downtime", label: t("repairTab.downtime"), value: formatCount(summary.downtimeDays), unit: t("repairTab.daysUnit"), foot: summary.hasOpenRepair ? t("repairTab.openFoot") : undefined }`;
    - `{ key: "cost", label: t("repairTab.cost"), value: formatMoney(summary.totalCost), unit: tCommon("baht") }` (the third cell spans the strip below `lg`, the room a money value needs, DESIGN.md "Detail pages").
  - Then the pinned replacement Notice.
  - The repairs panel: `<ContentPanel divided flush title={t("repairTab.repairsTitle")} actions={…}>`. The actions, as pinned: `recordRepair ? <Link href={recordRepair.href} className={buttonVariants({ variant: "outline", size: "sm" })}><Wrench aria-hidden="true" />{tAll(recordRepair.labelKey)}</Link> : undefined`. `getAssetRecordRepairAction` answers only an action that can run now (R3, R4), so there is no unavailable state here: without `maintenance:create`, with an open repair record (the table shows it) or on a Disposed or Retired asset the panel has no action.
    - No repairs: the pinned `<EmptyNote padded>{t("noMaintenanceTitle")}</EmptyNote>`.
    - From `md`, `<div className="hidden md:block">` + the pinned `DataTable` with the heads `tMaintenance("repairNo")`, `t("repairTab.workColumn")`, `t("repairTab.periodColumn")`, `t("repairTab.repairerColumn")`, `<DataTableHead align="right">{t("repairTab.costColumn")}</DataTableHead>`, `tCommon("status")`. A row is `canViewRepairs ? <ClickableTableRow key={repair.id} href={\`/${locale}/maintenance/${repair.id}\`} label={\`${tCommon("view")}: ${repair.repairNo}\`}> … </ClickableTableRow> : <DataTableRow key={repair.id}> … </DataTableRow>`, its cells:
      - the number: with `canViewRepairs`, `<Link href={\`/${locale}/maintenance/${repair.id}\`} className={linkVariants({ size: "inherit" })}><span className="tag">{repair.repairNo}</span></Link>`, else the `tag` alone;
      - the work (`min-w-72`): `{repair.maintenancePlanId ? <Chip>{t("maintenancePmBadge")}</Chip> : null}` and `repair.problem` on a line, `repair.resolution` (when set) under it in `text-muted-foreground`;
      - the period (`whitespace-nowrap`): `formatRepairPeriod(repair.reportedDate, repair.returnDate, locale)`, then on a `text-meta text-muted-foreground` line `const days = repairDays(repair, now)`: open → `t("repairTab.openDays", { days: formatCount(days) })`, `days !== null` → `t("repairTab.days", { days: formatCount(days) })`, else nothing;
      - the repairer: `orNil(repair.repairer)`;
      - the cost: `<DataTableCell numeric>{orNil(formatMoney(repair.repairCost))}</DataTableCell>`;
      - the status: `<StatusBadge label={tMaintenance(\`statuses.${toRepairRecordStatus(repair.repairStatus)}\`)} tone={getRepairRecordStatusTone(repair.repairStatus)} />`.
    - Below `md`, the pinned `<ContentPanelRows className="md:hidden">`: one `<li>` per repair, the whole row a link when `canViewRepairs` (a `Link` with `block`), holding the number (`tag`) and the status badge on one line, `problem · resolution`, then `period · days · repairer · cost บาท` in `text-meta text-muted-foreground` (the board's phone card).
  - The PM panel: `<ContentPanel divided flush title={t("repairTab.pmTitle")} actions={canCreatePlan ? <Link href={\`/${locale}/maintenance/pm/new?assetId=${encodeURIComponent(assetId)}\`} className={buttonVariants({ variant: "outline", size: "sm" })}>{t("repairTab.pmSetup")}</Link> : undefined}>` (no `returnTo`: `/maintenance/pm/new` takes none and returns to `/maintenance/pm` after saving; the maintenance pages are a non-goal, spec §4). No plans: the pinned `EmptyNote padded`. Else `<ContentPanelRows>`, one `<li>` per plan in the PM list's layout (`src/app/[locale]/(dashboard)/maintenance/pm/page.tsx:107-125`) without the asset and without the actions: the title, `<span className="tag">{plan.planNo}</span>`; `tMaintenance("pmNextDueDate")`: `formatDate(plan.nextDueDate)` and the provider line (`pmExternalProvider` with the vendor's `tag` code and name, or `pmNoExternalProvider`); the due badge for an active plan (`getMaintenancePlanDueState(plan.nextDueDate, now)`, tones as the PM list's: danger, warning, primary), `<Chip>{tMaintenance(\`pmFrequencies.${plan.frequency}\`)}</Chip>`, and the state badge (success, warning, muted).
- **`page.tsx`:**
  - Import `getAssetMaintenanceTabData` (`@/lib/asset-maintenance-data`), `canSetUpPm` (`@/lib/asset-repair-rules`) and `AssetMaintenanceTab` (`@/components/assets/detail/asset-maintenance-tab`); `getAssetRecordRepairAction` (`@/lib/asset-actions`) is already imported for the header's pin (Task 8C, R4).
  - The `AssetActionInput` the page gives `getAssetActions` is the const `actionInput` that Task 8C declares (pinned, do not rename).
  - On the maintenance view only (this task owns the tab's loader; Task 7's per-view load was interim, R24): `const maintenanceData = assetDetailView === "maintenance" ? await withPerformanceTiming("asset-detail.maintenance-tab", () => getAssetMaintenanceTabData(asset.id), { route: "/assets/[id]", locale }) : null`.
  - The tab's body (today's `#maintenance` section, which Task 8C kept here, R25) becomes `{maintenanceData ? <AssetMaintenanceTab locale={locale} assetId={asset.id} repairs={maintenanceData.repairs} plans={maintenanceData.plans} purchasePrice={asset.purchasePrice == null ? null : Number(asset.purchasePrice)} now={now} recordRepair={getAssetRecordRepairAction(actionInput)} canViewRepairs={canViewMaintenance} canCreatePlan={canSetUpPm(asset.status.name, canCreateMaintenance)} /> : null}`. `recordRepair` is the rule's own answer, not the header's pin, which hides when the primary already is "บันทึกซ่อม" (R4); `now`, `canViewMaintenance` and `canCreateMaintenance` are Task 8C's (`now` one `new Date()` per render).
  - Delete the parts listed under **Files** that are still there; `npx tsc --noEmit` and `npx eslint` (no-unused-vars) list the imports and reads left over (`ActionEmptyState`, `ClickableTableRow`, `toRepairRecordStatus`, `getRepairRecordStatusTone`, `tMaintenance`… when nothing else in the page reads them). When the page no longer reads `asset.maintenanceTickets`, the relation goes from the asset read, and `maintenanceLimit` from `AssetDetailLoadPolicy` and every policy in `src/lib/asset-detail-data.ts` (R24).
- Run `node scripts/messages-edit.mjs` with the deletions of Step 1 now that the code is final.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test tests/asset-repair-rules.test.ts tests/asset-maintenance-tab-ui.test.ts tests/open-repair-filter.test.ts tests/asset-detail-ux.test.ts tests/assets-sweep-ui.test.ts tests/asset-detail-anchor-layout.test.ts tests/asset-detail-data-boundaries.test.ts tests/performance-route-instrumentation.test.ts tests/maintenance-history-labels.test.ts tests/preventive-maintenance.test.ts tests/list-pagination.test.ts tests/pm-plans-ui.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts tests/form-migration-guards.test.ts tests/ui-overlay-guards.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts && npx tsc --noEmit && npx eslint src/lib/asset-repair-rules.ts src/lib/asset-maintenance-data.ts src/lib/preventive-maintenance.ts src/components/assets/detail/asset-maintenance-tab.tsx "src/app/[locale]/(dashboard)/assets/[id]/page.tsx"`
Expected: PASS. No guard row moves: no raw `<button>`, no `<td colSpan>` (the empty state is an `EmptyNote` outside the table), no typed `"-"` (`orNil`), no status ink outside `ui/`, the StatStrip outside any panel.

- [ ] **Step 6: Commit**

```bash
git add src/lib/asset-repair-rules.ts src/lib/asset-maintenance-data.ts src/lib/preventive-maintenance.ts src/lib/asset-detail-data.ts src/components/assets/detail/asset-maintenance-tab.tsx "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" messages/th.json messages/en.json tests/asset-repair-rules.test.ts tests/asset-maintenance-tab-ui.test.ts tests/open-repair-filter.test.ts tests/asset-detail-ux.test.ts tests/assets-sweep-ui.test.ts tests/asset-detail-anchor-layout.test.ts tests/asset-detail-data-boundaries.test.ts tests/performance-route-instrumentation.test.ts
git commit -m "feat(assets): the repair / PM tab sums the asset's repairs and lists its PM plans (group 1 asset detail task 12)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(`git add` of `tests/asset-detail-anchor-layout.test.ts` becomes `git rm` when the file goes.)

---

### Task 13: E2E steps and the round's docs

**Files:**
- Create:
  - `e2e/asset-detail/detail-words.ts`
  - `e2e/asset-detail/detail-steps.ts`
  - `e2e/asset-detail/asset-detail.spec.ts`
  - `tests/e2e-asset-detail.test.ts`
- Modify (line numbers on master `f6368e19`; Tasks 1-12 do not touch these files, re-check before editing):
  - `e2e/transactions/tx-support.ts:83-104` (`handoverByApi` takes an optional handover date) and `:250-252` (`visitAssetPage`'s view names)
  - `e2e/transactions/handover.spec.ts:8-21` (imports), `:30-33`, `:87-91`, `:146` (the test takes `e2eDevice`), `:187` (comment), `:193-194`
  - `e2e/transactions/return.spec.ts:7-22` (imports), `:35-37`
  - `e2e/transactions/transfer.spec.ts:6-18` (imports), `:27` (the test takes `e2eDevice`), `:33-34`, `:86-100`
  - `e2e/transactions/cancel.spec.ts:6-16` (imports), `:25` (the test takes `e2eDevice`), `:32-34`, `:76-81`
  - `e2e/transactions/desk-delivery.spec.ts:8-22` (imports), `:32-33`
  - `e2e/transactions/register-asset.spec.ts:93-99`
  - `e2e/assets/licence.spec.ts:9` (one import line added after it), `:73`
  - `e2e/repair/repair-record.spec.ts:99-103`
  - `e2e/cross-cutting/roles.spec.ts:6-9` (imports) and one new test after `:57` in "the viewer"
  - `tests/e2e-transactions.test.ts:201` (the cancel's history view)
  - `tests/e2e-review.test.ts:138` (the licence's seats)
  - `docs/99_CHANGELOG.md:7-9` (the new entry, newest first)
  - `docs/07_UAT_CHECKLIST.md:44`, `:76-84`, `:103-104` (rewritten) and a new `## Asset Detail B UAT (…)` section between `:361` and `## Sign-Off` (`:363`)
  - `docs/06_WORKFLOWS.md:49`, `:56-60` (the detail's old tabs, drawers and "More actions")
  - `DEVELOPER_HANDOFF.md:3` (`> Last updated:`), `:69` (timing labels), one bullet after `:1198`
  - `docs/14_UI_UX_DESIGN_SYSTEM.md:30` (Adaptive Presentation row) and the "Asset Detail and components" row of the Current-Surface Registry (`:118` on master; Task 5 adds the Fact Strip row elsewhere in the file, so find the row by its name)
- Unchanged and still passing:
  - `e2e/transactions/bulk-move.spec.ts:91-92` and the "main contains the room" checks of `return.spec.ts:88`, `transfer.spec.ts:74-75`, `handover.spec.ts:89`: the fact strip's ที่ตั้ง and ผู้ถือครอง cells hold the room and the custodian on the overview at both widths (spec §7.4).
  - The `asset-identity-summary` checks (`handover.spec.ts:88`, `return.spec.ts:87,130`, `cancel.spec.ts:66`, `register-asset.spec.ts:95`): the testid stays on the meta row with the status badge (spec §7.2).
  - `e2e/transactions/findings.spec.ts:10-16` (TX-A2), `e2e/repair/repair-record.spec.ts:142-149` (AR2), `e2e/cross-cutting/roles.spec.ts:51-57` (M6): they still run axe on the asset page; with the QR panel gone (Task 8) the `svg-img-alt` check passes with nothing to check. Their titles are pinned (`tests/e2e-repair.test.ts:53`), so they stay as they are.
  - The suite guards: `tests/e2e-suite.test.ts:313-332` (no spec imports `@playwright/test`; `detail-steps.ts` is not a spec), `tests/e2e-review.test.ts:20-128` (no hazard, no `DELETE`, no settings page: the steps never delete, upload one photo and record one repair through the app's own routes, and only download the export), `tests/e2e-transactions.test.ts:115-123` (the arrival waits per file keep their counts: handover 2, return 1, transfer 1, desk-delivery 1, findings 1), `tests/e2e-fixes.test.ts` as Tasks 4, 8 and 9 left it (FX8's allow-list pin with Task 4's `?size=card` entries, R28; FX2 rewritten by Task 8, R36; FX10 and FX11 moved by Task 9, R17; FX12), `tests/e2e-cross-cutting.test.ts` EM2, `tests/e2e-repair.test.ts` ER1-ER3.
  - `e2e/support/allow-list.ts`: Task 4 widened its two thumbnail entries for `?size=card` (R28); this task widens nothing.
  - The docs pins `tests/shell-docs.test.ts`, `tests/e2e-docs.test.ts`, `tests/v-track-docs.test.ts`, `tests/dark-mode-docs.test.ts`, `tests/phase2d-docs.test.ts`, `tests/audit-round-cancellation.test.ts:144-157` (each entry keeps its date heading; no template marker is written).
- No message changes: every word the steps read is a value Tasks 1-12 put in `messages/th.json` (the guard test below checks each).

**Interfaces:**
- Consumes (the markup and routes of Tasks 1-12, as the spec and the skeleton name them):
  - Task 1 (R3): the register row's next button is `getAssetActions().primary` inside its `RowActions` (`[data-slot="row-actions"]`, the desktop table only: `asset-register-row-actions.tsx` passes `next` for the desktop variant), and its ⋯ (`menuLabel` "การดำเนินการของ {assetTag}", a dropdown in the table, a bottom sheet in the phone list) starts with `transactions`, led by the primary on the phone only, where the row has no next-step slot; `transactions` never repeat the primary, and the primary is always an action that can run now; the detail's primary and the top of "อื่น ๆ" are the same items, unavailable ones as `DropdownMenuItem unavailable` with `DropdownMenuItemDescription` (the sheet renders them as `li > div[aria-disabled="true"]` with the same description slot); the reasons are the `asset.transactionReason*` sentences (full keys, R2); hrefs from `buildAssetRegisterTransactionHref` (selection key first, then `returnTo` = the page the person is on).
  - Task 2 (R8-R10): the register's `locationId` filter (the asset's own location only, link-only) with its chip "ที่ตั้ง: <code> - <name>" in the "ตัวกรองที่ใช้อยู่" group at every width; previous / next from `getAssetNeighbours` with the `id` tie-break and a 1-based `index`, their links keeping `returnTo` unchanged; the middle crumb from `buildRegisterCrumbLabel`, in Task 8's words `asset.registerCrumbSearch` ('ผลค้นหา "{search}"', ASCII quotes) or `asset.registerCrumbFilters` ("ผลการกรอง"), text and not a link.
  - Task 3 (R11, R15): `GET /api/assets/[id]/history/export?locale=th` (an `.xlsx` of one sheet: a header row of 6 columns, then every event, at most 5,000); `getAssetHistoryCounts().total`, the one number behind the tab's count, the "ทั้งหมด" chip and the overview's "ดูประวัติทั้งหมด N รายการ"; `AssetHistoryCategory` values for `?type=` (`transfer`).
  - Task 4 (R26, R28): the รูป card's `<img>` from `/api/attachments/<id>/thumbnail?size=card`, inside the raw `<button>` that opens `AttachmentPreviewDialog`; the allow-list's two thumbnail entries accept `?size=card`.
  - Task 5 (R18): `FactStrip` renders a `section aria-label={label}` around a `dl` with `data-slot="fact-strip"`, and `data-slot="fact"` on each cell (a `div` holding the cell's `dt` and `dd`s), as StatStrip marks `stat-strip` and `stat` (the guard test pins both attributes in `src/components/ui/fact-strip.tsx`).
  - Task 6 (R20): `ActionBar`'s `more` slot: the last control of `[data-slot="action-bar"]`, `RowActions`' ⋯ named by `more.label` ("การดำเนินการอื่น") that always opens `RowActions`' bottom sheet (`role="dialog"`).
  - Task 7 (R22): `assetDetailViews = ["overview", "history", "components", "files", "maintenance"]` from `src/lib/asset-detail-view.ts` (pure, relative imports); `?view=operations` opens the history tab; `TabNav` marks the current tab `aria-current="page"` inside `[data-slot="tab-nav"]`, each tab with its count (0 shown), its link without `#anchor`.
  - Task 8 (8B and 8C, R19, R21, R31-R33, R35): `PageHeader` actions in DESIGN order (`PageBackLink`, then previous / next when the page came from the register, the text button "อื่น ๆ", the pinned "พิมพ์ป้าย" and "บันทึกซ่อม", the primary link last) inside `[data-slot="page-header-actions"]`, every action button hidden below `md` (spec §7.8's phone header); "อื่น ๆ" not drawn when it would be empty (the viewer's desktop); the counter "k / N" and the icon links "รายการก่อนหน้า" / "รายการถัดไป" (previous hidden below `md`); `PageBackLink` "กลับไปผลค้นหา" from the register, "กลับไปสแกน" from the scan page, "กลับ" otherwise; `id="overview"` on "ข้อมูลทรัพย์สิน" with the "เอกสารจัดซื้อ" row whenever a purchase document is linked, each number a link to `?view=files`; the "ความเคลื่อนไหวล่าสุด" `section` with the link "ดูประวัติทั้งหมด {count} รายการ" and one row (`tbody tr` or `li`) per event; the fact strip, the region "ข้อมูลสำคัญของทรัพย์สิน" (`asset.factStripLabel`; hidden below `md` on every tab but the overview), with the cells "ผู้ถือครอง" (the name links `buildExactAssetRegisterHref(locale, { custodianId })` without `employee:view`; "ไม่มีผู้ถือครอง" when there is none; the sub-line holds "ถือมาแล้ว {days} วัน"), "ที่ตั้ง" (the location name links `buildExactAssetRegisterHref(locale, { locationId })`), "ตรวจนับล่าสุด" ("รอตรวจในรอบ" followed by the round code as a link; a result as a `StatusBadge` in the round page's words "พบตรง", "รายการไม่ตรง", "ไม่พบ"), "ประกัน" ("ไม่ทราบ" with the link "บันทึกข้อมูลการซื้อ" to the edit form's purchase anchor for `asset:edit`), licence "ที่นั่ง"; "จัดการ" on "อุปกรณ์ส่วนควบ" for `asset:edit` only; the รูป card's upload link "อัปโหลดรูป" (from `md`) / "ถ่ายรูป" (below it) to the files tab, for `asset:edit` only; the phone bar, rendered for everyone, holds exactly the primary (wide), "บันทึกซ่อม" when pinned, then "การดำเนินการอื่น", whose sheet ends with "แก้ไข" and "พิมพ์ป้าย"; from the scan page "สแกนรายการถัดไป" (wide), the primary, then "การดำเนินการอื่น" ("บันทึกซ่อม" moves into the sheet); the viewer's bar holds only "การดำเนินการอื่น", its sheet only "พิมพ์ป้าย".
  - Task 9 (R14, R15, R17): the chips are `ChoiceChip type="radio"` named by their `asset.history.types.*` word with the count as `detail`, shown only for categories with events (plus the one `?type=` chose); the document column links each event's HO-/RT-/TR- by its number for a person with `ASSET_MOVEMENT_DOCUMENT_PERMISSION[kind]` (R12; IT staff hold `asset:view`), and the phone's event card is one link to the same document; "ส่งออก Excel" is a download link to `buildAssetHistoryExportHref(locale, assetId)` on the desktop only (the phone has no period and no export).
  - Task 11 (R31, R39): the files tab's section "เอกสารจัดซื้อ" (`asset.purchaseDocuments`) lists the linked purchase document numbers; the photos as tiles from the thumbnail route; no file input for a person without `asset:edit`.
  - Task 12 (R40): the repair table's number links the record for `maintenance:view`; "ตั้งรอบ PM" only for `maintenance:create`, never on a Disposed or Retired asset.
  - Existing helpers: `createTxAsset`, `readAssetMasters`, `ensureSecondLocation`, `expectReachable`, `record`, `visit`, `PHOTO_FIXTURE` (`e2e/transactions/tx-support.ts`); `txAssetTag`, `bangkokDate` (`e2e/transactions/tx-plan.ts`); `createRoom`, `createAssets`, `readAssetChoices`, `recordPrefix` (`e2e/disposal/disposal-support.ts`); `fillTemplate`, `templatePattern` (`e2e/shell/shell-words.ts`); `registerAssetsAsItStaff` (`e2e/cross-cutting/support/records.ts`); `downloadBy`, `openWorkbook` (`e2e/cross-cutting/support/files.ts`); `writeControls` (`e2e/cross-cutting/support/roles-ui.ts`); `isWriteLink` (`e2e/cross-cutting/support/refusals.ts`); `POST /api/assets/[id]/attachments` (multipart `file`, `asset:edit`) and `POST /api/maintenance-tickets` (`repairRecordCreateSchema`, `maintenance:create`).
- Produces:
  - `e2e/transactions/tx-support.ts`: `handoverByApi(page: Page, assetId: string, custodianId: string, conditionId: string, checkoutDate: string = bangkokDate()): Promise<{ id: string; documentNo: string }>`; `visitAssetPage(measure: Measure, assetId: string, label: string, testInfo: TestInfo, view?: "history" | "components" | "files" | "maintenance")`.
  - `e2e/asset-detail/detail-words.ts` (plain data, no imports): `DETAIL_WORDS`, `DETAIL_VIEWS`, `PERSONAL_TRANSACTIONS`, `VIEWER_ABSENT_CONTROLS`.
  - `e2e/asset-detail/detail-steps.ts`: `type MenuEntry = { label: string; reason: string | null; available: boolean }`; `primaryAction(page: Page, device: E2eDevice): Locator`; `controlNames(row: Locator): Promise<string[]>`; `openMoreActions(page: Page, device: E2eDevice): Promise<Locator>`; `openMoreActionsIfShown(page: Page, device: E2eDevice): Promise<Locator | null>`; `openRowActions(page: Page, device: E2eDevice, assetTag: string): Promise<Locator>`; `registerNext(page: Page, assetTag: string): Locator`; `menuItem(container: Locator, name: string | RegExp): Locator`; `readMenuEntries(container: Locator): Promise<MenuEntry[]>`; `transactionPrefix(entries: readonly MenuEntry[], labels: readonly string[], primary: string): MenuEntry[]`; `factCell(page: Page, label: string): Locator`; `numberIn(text: string): number`; `historyChip(page: Page, label: string): Locator`; `chipCount(page: Page, label: string): Promise<number>`; `currentTab(page: Page): Locator`; `allHistoryLink(page: Page): Locator`; `latestPanel(page: Page): Locator`; `shownDocuments(scope: Locator, codes: readonly string[]): Promise<string[]>`; `registerRows(page: Page): Promise<{ id: string; href: string }[]>`; `detailWriteControls(page: Page): Promise<string[]>`; `returnByApi(page: Page, assetId: string, checkoutId: string, returnedBy: { id: string; fullNameTh: string }, masters: { readyStatusId: string; goodConditionId: string }): Promise<{ id: string; documentNo: string }>`; `transferByApi(page: Page, assetId: string, toLocationId: string, toCustodianId: string, reason: string): Promise<{ id: string; documentNo: string }>`; `uploadPhotoByApi(page: Page, assetId: string): Promise<{ id: string }>`; `recordRepairByApi(page: Page, assetId: string, reportedById: string, problem: string): Promise<{ id: string; repairNo: string }>`; and the re-exported types `Locator`, `Page`.

- [ ] **Step 1: Write the guard test and rewrite the two pins, so they fail**

`tests/e2e-asset-detail.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// The asset detail's E2E steps (plan docs/superpowers/plans/2026-10-26-group1-asset-detail.md, Task 13; spec 2026-10-25
// §10): what they stand on — the app's own words, the register's reasons, the page's view names, the suite's fixtures
// and users, the round cancelled after — and the transaction, licence, repair and roles steps that now read the canvas
// B page. Reads strip \r (the working tree may be CRLF).
const read = (f: string) => readFileSync(f, "utf8").replace(/\r/g, "")
const values = (node: unknown): string[] => typeof node === "string" ? [node] : node && typeof node === "object" ? Object.values(node).flatMap(values) : []
// A words-file template and a th.json value are the same text whatever their placeholders are named.
const shape = (text: string) => text.replace(/\{\w+\}/g, "{}")

test("the asset detail steps read the app's own words, the register's reasons and the page's view names (group 1 asset detail task 13)", async () => {
  const { DETAIL_WORDS, DETAIL_VIEWS, PERSONAL_TRANSACTIONS, VIEWER_ABSENT_CONTROLS } = await import("../e2e/asset-detail/detail-words.ts")
  const { assetDetailViews } = await import("../src/lib/asset-detail-view.ts")
  const th = JSON.parse(read("messages/th.json"))
  const shapes = new Set(values(th).map(shape))
  for (const [name, text] of Object.entries(DETAIL_WORDS)) assert.ok(shapes.has(shape(text)), `${name}: "${text}" is a value of messages/th.json`)
  for (const text of [...PERSONAL_TRANSACTIONS, ...VIEWER_ABSENT_CONTROLS]) assert.ok(shapes.has(text), `"${text}" is a value of messages/th.json`)
  // The reasons are the register's own sentences (spec §7.1 reuses the asset.transactionReason* keys).
  assert.equal(DETAIL_WORDS.reasonStatusNotReady, th.asset.transactionReasonStatusNotReady)
  assert.equal(DETAIL_WORDS.reasonOpenCheckout, th.asset.transactionReasonOpenCheckout)
  // The keys the rulings name for the header's crumb and the fact strip (R10, R19), and one word for one thing (spec §5):
  // a purchase document is the app's "เอกสารจัดซื้อ" (R31).
  assert.equal(DETAIL_WORDS.searchCrumb, th.asset.registerCrumbSearch)
  assert.equal(DETAIL_WORDS.filtersCrumb, th.asset.registerCrumbFilters)
  assert.equal(DETAIL_WORDS.factStrip, th.asset.factStripLabel)
  assert.equal(DETAIL_WORDS.purchaseDocuments, th.asset.purchaseDocuments)
  assert.ok(!JSON.stringify(DETAIL_WORDS).includes("เอกสารการซื้อ"), "not the spec's เอกสารการซื้อ")
  // The overview's "จัดการ" needs asset:edit (R35), so the viewer never sees it (R42).
  assert.ok((VIEWER_ABSENT_CONTROLS as readonly string[]).includes("จัดการ"))
  // The tabs' view names (spec §7.3); visitAssetPage takes every one but the overview, the page without ?view=.
  assert.deepEqual([...DETAIL_VIEWS], [...assetDetailViews])
  const support = read("e2e/transactions/tx-support.ts")
  const union = /export async function visitAssetPage\([^)]*view\?: ([^)]*)\)/.exec(support)?.[1] ?? ""
  assert.deepEqual([...union.matchAll(/"(\w+)"/g)].map((match) => match[1]), assetDetailViews.filter((view) => view !== "overview"))
  // The fact strip's cells are found as the shared part marks them, as StatStrip marks its own.
  const factStrip = read("src/components/ui/fact-strip.tsx")
  assert.ok(factStrip.includes(`data-slot="fact-strip"`) && factStrip.includes(`data-slot="fact"`), "FactStrip marks its strip and its cells")
})

test("the asset detail spec walks the five steps through the suite's fixtures, compares the page with the register, and cancels its round (group 1 asset detail task 13)", () => {
  const spec = read("e2e/asset-detail/asset-detail.spec.ts")
  assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`))
  for (const user of ["itStaff", "itHead"]) assert.ok(spec.split("\n").some((line) => line.trim() === `asUser("${user}")`), user)
  assert.ok(!spec.split("\n").some((line) => line.trim() === "runPhoneOnWebKit()"), "the phone on Chromium")
  assert.doesNotMatch(spec, /measure\.(visit|recordPage)\(/, "measured through tx-support's visit and record (the settle and the known findings)")
  assert.ok(spec.includes("expect(detailTransactions).toEqual(registerTransactions)"), "(1) the detail's อื่น ๆ against the register's ⋯")
  assert.ok(spec.includes("expect(detailTransactions).toEqual(expected)"), "(1) with the reasons")
  assert.ok(spec.includes(`await expect(latestPanel(page).locator("tbody tr, li").filter({ visible: true })).toHaveCount(3)`), "(2) the overview shows the latest 3")
  assert.ok(spec.includes(`expect(page.url(), "choosing a chip does not navigate").toBe(historyUrl)`), "(2) the chips filter in place")
  assert.ok(spec.includes("fillTemplate(DETAIL_WORDS.heldDays, { days: heldDays })"), "(3) ถือมาแล้ว from the handover's date")
  assert.match(spec, /\} finally \{\n\s+const cancelled = await page\.request\.patch\(`\/api\/audit-rounds\/\$\{round\.id\}`, \{ data: \{ action: "cancel"/, "(3) the round is cancelled whatever happens")
  assert.ok(spec.includes(`await expect(main).toContainText("1 / 3")`) && spec.includes(`await expect(main).not.toContainText("1 / 3")`), "(4) the counter from the register, none opened directly")
  assert.ok(spec.includes(`expect(sheet[0], "the export's 6 columns").toHaveLength(6)`) && spec.includes(`expect(sheet.length - 1, "every event").toBe(total)`), "(2) the Excel holds every event (R15)")
  assert.ok(spec.includes("expect(await controlNames(bar)).toEqual([DETAIL_WORDS.scanNext, DETAIL_WORDS.checkout, DETAIL_WORDS.moreActions])"), "(5) the scan return leads the bar (R21)")
  assert.ok(spec.includes("expect(sheetItems.slice(-2)).toEqual([DETAIL_WORDS.edit, DETAIL_WORDS.printLabel])"), "(5) แก้ไข and พิมพ์ป้าย end the phone's sheet, in Task 8B's order (R21)")
  // R43: the files tab and the repair tab, axe included, on an asset of the test's own with a photo and a repair.
  for (const view of ["files", "maintenance"]) assert.match(spec, new RegExp(`await visitAssetPage\\(measure, asset\\.id, "[^"]+", testInfo, "${view}"\\)`), view)
  assert.ok(spec.includes("await uploadPhotoByApi(page, asset.id)") && spec.includes("await recordRepairByApi(page, asset.id, "), "(R43) a photo and a repair")
})

test("the transaction, licence, repair and roles steps read the canvas B page (group 1 asset detail task 13)", () => {
  const handover = read("e2e/transactions/handover.spec.ts")
  assert.ok(!handover.includes("toBeDisabled()"), "an action that cannot run is an item with its reason, not a disabled button")
  assert.equal(handover.split(`toContainEqual({ label: "ส่งมอบ", reason: "ส่งมอบได้เมื่อสถานะเป็น พร้อมใช้งาน เท่านั้น", available: false })`).length - 1, 2)
  assert.ok(handover.includes(`await expect(primary).toHaveAccessibleName("ส่งมอบ")`))
  assert.ok(read("e2e/transactions/return.spec.ts").includes(`await expect(primary).toHaveAccessibleName("รับคืน")`))
  const transfer = read("e2e/transactions/transfer.spec.ts")
  assert.ok(transfer.includes(`await menuItem(await openMoreActions(page, e2eDevice), "โอนย้าย").click()`))
  assert.ok(transfer.includes(`for (const view of [undefined, "history"] as const)`))
  const cancel = read("e2e/transactions/cancel.spec.ts")
  assert.ok(cancel.includes("await menuItem(await openMoreActions(page, e2eDevice), /^ยกเลิกรายการ/).click()"))
  assert.ok(!cancel.includes("การดำเนินการเพิ่มเติม"), "the ⋯ of before B")
  assert.ok(read("e2e/transactions/desk-delivery.spec.ts").includes(`const primary = primaryAction(page, "phone")`))
  const register = read("e2e/transactions/register-asset.spec.ts")
  assert.ok(register.includes(`page.locator('main img[src*="/api/attachments/"][src*="/thumbnail?size=card"]')`), "the card size, never the original")
  assert.ok(register.includes(`page.locator("#overview").getByRole("link", { name: documentNo })`), "the purchase document in ข้อมูลทรัพย์สิน")
  assert.ok(register.includes(`getByRole("heading", { name: "เอกสารจัดซื้อ", exact: true })`) && !register.includes("เอกสารการซื้อ"), "the app's one word for it (R31)")
  assert.ok(read("e2e/repair/repair-record.spec.ts").includes(`getByRole("link", { name: "บันทึกซ่อม", exact: true }).filter({ visible: true }).first().click()`))
  const roles = read("e2e/cross-cutting/roles.spec.ts")
  assert.ok(roles.includes(`test("the viewer's asset page offers no write control on any tab (group 1 asset detail)"`))
  assert.ok(roles.includes(`toEqual([DETAIL_WORDS.moreActions])`), "the viewer's phone bar holds only การดำเนินการอื่น (R21)")
})
```

Rewrite the two pins of the steps this task changes:
- `tests/e2e-transactions.test.ts:201` becomes `assert.match(spec, /await visitAssetPage\(measure, asset\.id, "asset history after the cancel", testInfo, "history"\)/)` (the history tab replaces `view=operations`, spec §7.3).
- `tests/e2e-review.test.ts:138` becomes `assert.match(spec, /await expect\(factCell\(page, DETAIL_WORDS\.seatsCell\)\)\.toContainText\("ใช้แล้ว 2\/5 คงเหลือ 3"\)/)` (the seats are the fact strip's first cell, spec §7.4 and §7.9; `:140`'s tx-support import line stays as it is, the new imports are lines of their own; `:145`'s `licenseSeatSummary` copy stays).

Run: `node --test tests/e2e-asset-detail.test.ts tests/e2e-transactions.test.ts tests/e2e-review.test.ts`
Expected: FAIL. `../e2e/asset-detail/detail-words.ts` is not found; TX6 finds `"operations"`; LC1 finds `#overview`.

- [ ] **Step 2: Write the words and the steps; follow tx-support**

`e2e/asset-detail/detail-words.ts`:

```ts
// The words the asset detail's checks read on screen, as the app writes them in messages/th.json
// (tests/e2e-asset-detail.test.ts checks every value is one of th.json's, whatever its placeholders are named). Plain
// data, no imports, so the node test can load it.
export const DETAIL_WORDS = {
  // The actions (spec §7.1, §7.8, R21): "อื่น ๆ" on the desktop, its ⋯ in the phone's bar, the personal labels, and
  // the sheet's last two items on the phone. The cancel is matched by its "ยกเลิกรายการ" prefix (R42).
  more: "อื่น ๆ", moreActions: "การดำเนินการอื่น",
  checkout: "ส่งมอบ", checkin: "รับคืน", transfer: "โอนย้าย", recordRepair: "บันทึกซ่อม", printLabel: "พิมพ์ป้าย", edit: "แก้ไข",
  cancelLatest: "ยกเลิกรายการ", scanNext: "สแกนรายการถัดไป",
  reasonStatusNotReady: "ส่งมอบได้เมื่อสถานะเป็น พร้อมใช้งาน เท่านั้น", reasonOpenCheckout: "มีการส่งมอบค้างอยู่ รับคืนก่อนจึงโอนย้ายได้",
  rowActionsMenu: "การดำเนินการของ {assetTag}",
  // The header (spec §7.2, R10, R33): the middle crumb is asset.registerCrumbSearch or asset.registerCrumbFilters.
  back: "กลับ", backToResults: "กลับไปผลค้นหา", backToScan: "กลับไปสแกน",
  breadcrumb: "เส้นทางหน้า", register: "ทะเบียนทรัพย์สิน", searchCrumb: 'ผลค้นหา "{search}"', filtersCrumb: "ผลการกรอง",
  previous: "รายการก่อนหน้า", next: "รายการถัดไป",
  // The fact strip (spec §7.4, R19: the region asset.factStripLabel). The pending audit reads "รอตรวจในรอบ" and then
  // the round's code as a link (Task 8's words).
  factStrip: "ข้อมูลสำคัญของทรัพย์สิน",
  custodianCell: "ผู้ถือครอง", locationCell: "ที่ตั้ง", auditCell: "ตรวจนับล่าสุด", warrantyCell: "ประกัน", seatsCell: "ที่นั่ง",
  heldDays: "ถือมาแล้ว {days} วัน", auditPending: "รอตรวจในรอบ", warrantyUnknown: "ไม่ทราบ", addPurchase: "บันทึกข้อมูลการซื้อ",
  // The overview, the history and the files (spec §7.5-§7.7), and the register's chip group. A purchase document is
  // the app's "เอกสารจัดซื้อ" (R31). The disposal chip is one a fresh asset has no event for (R17).
  purchaseDocuments: "เอกสารจัดซื้อ", allHistory: "ดูประวัติทั้งหมด {count} รายการ", historyTab: "ประวัติ", chipAll: "ทั้งหมด",
  disposalChip: "ตัดจำหน่าย", exportExcel: "ส่งออก Excel", activeFilters: "ตัวกรองที่ใช้อยู่",
  // The documents' titles.
  handoverDocument: "ใบส่งมอบทรัพย์สิน", returnDocument: "ใบรับคืนทรัพย์สิน", transferDocument: "โอนย้ายทรัพย์สิน",
} as const

// The tabs' view names (src/lib/asset-detail-view.ts assetDetailViews, spec §7.3).
export const DETAIL_VIEWS = ["overview", "history", "components", "files", "maintenance"] as const

// A personal asset's transactions in the rule's order (spec §7.1's table).
export const PERSONAL_TRANSACTIONS = ["ส่งมอบ", "รับคืน", "โอนย้าย"] as const

// What a person without asset:edit, asset:create, maintenance:create or disposal:create never sees on the asset page
// as a link or a button (spec §7.1, §7.5, §7.7; anti-goal "a write control visible to a person without the permission";
// "จัดการ" on "อุปกรณ์ส่วนควบ" needs asset:edit, R35; "อัปโหลดรูป" / "ถ่ายรูป" are the รูป card's upload link, R26).
export const VIEWER_ABSENT_CONTROLS = [
  "ส่งมอบ", "รับคืน", "โอนย้าย", "บันทึกซ่อม", "แก้ไข", "เพิ่มข้อมูล", "บันทึกข้อมูลการซื้อ", "อัปโหลดรูป", "ถ่ายรูป",
  "จัดการ", "จัดการส่วนควบ", "ตั้งรอบ PM", "ขอตัดจำหน่าย", "แก้ไขสถานะ", "ยกเลิกรายการ", "คัดลอกเป็นรายการใหม่",
] as const
```

`e2e/asset-detail/detail-steps.ts`:

```ts
// The asset detail as a person reads it (src/app/[locale]/(dashboard)/assets/[id]/page.tsx, page group 1, spec §7):
// the primary action, "อื่น ๆ" and its items, the fact strip, the history's chips and document links, previous / next,
// and the register row's next button and ⋯ for the same asset. The transactions a step sets up go through the app's
// own APIs, with the bodies the forms post.
import { readFileSync } from "node:fs"
import type { Locator, Page } from "@playwright/test"
import { expect } from "../support/fixtures.ts"
import type { E2eDevice } from "../support/matrix.ts"
import { readRunData } from "../support/state.ts"
import { fillTemplate, templatePattern } from "../shell/shell-words.ts"
import { bangkokDate } from "../transactions/tx-plan.ts"
import { PHOTO_FIXTURE } from "../transactions/tx-support.ts"
import { DETAIL_WORDS, VIEWER_ABSENT_CONTROLS } from "./detail-words.ts"

// The spec files take the browser types from here: they import nothing from @playwright/test.
export type { Locator, Page }

// One item of "อื่น ๆ" or of a register row's ⋯ as a person reads it: its words, the reason an unavailable item gives,
// and whether choosing it does anything.
export type MenuEntry = { label: string; reason: string | null; available: boolean }

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// The primary action (spec §7.2, §7.8, R21): the header's last link on the desktop (DESIGN order: back, อื่น ๆ, the
// pinned buttons, the primary last), the bottom bar's first link on the phone (outside the scan return, where
// "สแกนรายการถัดไป" leads and the primary comes second).
export function primaryAction(page: Page, device: E2eDevice): Locator {
  return device === "desktop"
    ? page.locator('[data-slot="page-header-actions"]').getByRole("link").filter({ visible: true }).last()
    : page.locator('[data-slot="action-bar"]').getByRole("link").first()
}

// The names of a row's links and buttons (the header's buttons, the bottom bar) in their order on screen.
export async function controlNames(row: Locator): Promise<string[]> {
  return row.locator("a, button").evaluateAll((nodes) =>
    nodes
      .filter((node) => node.checkVisibility())
      .map((node) => (node.getAttribute("aria-label") ?? node.textContent ?? "").replace(/\s+/g, " ").trim()),
  )
}

const moreTrigger = (page: Page, device: E2eDevice): Locator =>
  page.getByRole("button", { name: device === "desktop" ? DETAIL_WORDS.more : DETAIL_WORDS.moreActions, exact: true }).filter({ visible: true }).first()

async function openedMenu(page: Page, device: E2eDevice): Promise<Locator> {
  const menu = device === "desktop" ? page.getByRole("menu") : page.getByRole("dialog").filter({ visible: true }).last()
  await expect(menu).toBeVisible()
  return menu
}

// "อื่น ๆ" opened (spec §7.1, §7.8): its menu on the desktop, the bottom sheet behind "การดำเนินการอื่น" on the phone.
export async function openMoreActions(page: Page, device: E2eDevice): Promise<Locator> {
  await moreTrigger(page, device).click()
  return openedMenu(page, device)
}

// The same for a person who may have nothing there: null when the page shows no "อื่น ๆ".
export async function openMoreActionsIfShown(page: Page, device: E2eDevice): Promise<Locator | null> {
  if ((await moreTrigger(page, device).count()) === 0) return null
  return openMoreActions(page, device)
}

// A register row's ⋯ for one asset (src/components/assets/asset-register-row-actions.tsx): the dropdown in the
// table, the bottom sheet in the phone list.
export async function openRowActions(page: Page, device: E2eDevice, assetTag: string): Promise<Locator> {
  await page.getByRole("button", { name: fillTemplate(DETAIL_WORDS.rowActionsMenu, { assetTag }), exact: true }).filter({ visible: true }).first().click()
  return openedMenu(page, device)
}

// A register row's next button (the desktop table only): the one link of the row's actions.
export function registerNext(page: Page, assetTag: string): Locator {
  return page
    .locator('[data-slot="row-actions"]')
    .filter({ visible: true })
    .filter({ has: page.getByRole("button", { name: fillTemplate(DETAIL_WORDS.rowActionsMenu, { assetTag }), exact: true }) })
    .getByRole("link")
    .first()
}

// An item of an open menu or sheet by its words: a menu item on the desktop, a link or a button in the sheet.
export function menuItem(container: Locator, name: string | RegExp): Locator {
  const options = typeof name === "string" ? { name, exact: true } : { name }
  return container.getByRole("menuitem", options).or(container.getByRole("link", options)).or(container.getByRole("button", options)).first()
}

// Every item of an open menu or sheet, in order. Group labels and separators are not items; an unavailable item is
// aria-disabled and reads its reason on its second line (DropdownMenuItemDescription, in the menu and in the sheet).
export async function readMenuEntries(container: Locator): Promise<MenuEntry[]> {
  return container.locator('[role="menuitem"], li > a, li > button, li > [aria-disabled="true"]').evaluateAll((nodes) =>
    nodes.map((node) => {
      const description = node.querySelector('[data-slot="dropdown-menu-item-description"]')
      const reason = description?.textContent?.replace(/\s+/g, " ").trim() || null
      const words = (node.textContent ?? "").replace(description?.textContent ?? "", "")
      return { label: words.replace(/\s+/g, " ").trim(), reason, available: node.getAttribute("aria-disabled") !== "true" }
    }),
  )
}

// The transaction items a menu starts with (spec §7.1: the register's ⋯ and the detail's "อื่น ๆ" both start with
// them), less the primary's own: `transactions` never repeat the primary, but the register's ⋯ leads with it on the
// phone, where the row has no next-step slot (R3).
export function transactionPrefix(entries: readonly MenuEntry[], labels: readonly string[], primary: string): MenuEntry[] {
  const lead: MenuEntry[] = []
  for (const entry of entries) {
    if (!labels.includes(entry.label)) break
    lead.push(entry)
  }
  return lead.filter((entry) => entry.label !== primary)
}

// A cell of the fact strip (spec §7.4, src/components/ui/fact-strip.tsx) by its label: the region named
// "ข้อมูลสำคัญของทรัพย์สิน" (R18, R19), shown on every desktop tab and on the phone's overview only.
export function factCell(page: Page, label: string): Locator {
  return page
    .getByRole("main")
    .getByRole("region", { name: DETAIL_WORDS.factStrip, exact: true })
    .filter({ visible: true })
    .locator('[data-slot="fact-strip"] [data-slot="fact"]')
    .filter({ has: page.getByRole("term").filter({ hasText: new RegExp(`^${escapeRegExp(label)}$`) }) })
}

// The first number of a text as the page formats it: a tab's or a chip's count, "ดูประวัติทั้งหมด 12 รายการ".
export function numberIn(text: string): number {
  const match = /\d[\d,]*/.exec(text)
  if (!match) throw new Error(`no number in "${text}"`)
  return Number(match[0].replaceAll(",", ""))
}

// The history's type chips (spec §7.6): radio ChoiceChips named by their type, each with its count beside the name.
export const historyChip = (page: Page, label: string): Locator => page.getByRole("main").getByRole("radio", { name: label, exact: true })
export async function chipCount(page: Page, label: string): Promise<number> {
  const chip = page.getByRole("main").locator('[data-slot="choice-chip"]').filter({ has: page.getByRole("radio", { name: label, exact: true }) })
  return numberIn(await chip.innerText())
}

// The tab the page is on (TabNav marks it aria-current).
export const currentTab = (page: Page): Locator => page.getByRole("main").locator('[data-slot="tab-nav"] a[aria-current="page"]')

// The overview's ความเคลื่อนไหวล่าสุด (spec §7.5): the panel whose link opens the whole history.
export const allHistoryLink = (page: Page): Locator => page.getByRole("link", { name: templatePattern(DETAIL_WORDS.allHistory, { count: "[\\d,]+" }) })
export const latestPanel = (page: Page): Locator => page.getByRole("main").locator("section").filter({ has: allHistoryLink(page) }).last()

// Which of the named documents a part of the page links, as a person sees it (the desktop table or the phone's cards).
export async function shownDocuments(scope: Locator, codes: readonly string[]): Promise<string[]> {
  const shown: string[] = []
  for (const code of codes) if ((await scope.getByRole("link", { name: code }).filter({ visible: true }).count()) > 0) shown.push(code)
  return shown
}

// The register page's assets in their order on screen, each with the link its row opens (returnTo included). Read
// from the phone list at every width: on the desktop the table's rows are clickable <tr>s with no link
// (ClickableTableRow), and the phone list, always rendered in the table's order, is only hidden from md.
export async function registerRows(page: Page): Promise<{ id: string; href: string }[]> {
  const hrefs = await page.locator('[data-asset-mobile-list] a[href*="returnTo="]').evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""))
  const rows: { id: string; href: string }[] = []
  for (const href of hrefs) {
    const id = /^\/th\/assets\/([^/?#]+)\?/.exec(href)?.[1]
    if (id && id !== "new" && !rows.some((row) => row.id === id)) rows.push({ id, href })
  }
  return rows
}

// The page's write words a person who may not write must not see as a link or a button (VIEWER_ABSENT_CONTROLS).
export async function detailWriteControls(page: Page): Promise<string[]> {
  const main = page.getByRole("main")
  const found: string[] = []
  for (const name of VIEWER_ABSENT_CONTROLS) {
    const controls = main.getByRole("link", { name, exact: true }).or(main.getByRole("button", { name, exact: true })).filter({ visible: true })
    if ((await controls.count()) > 0) found.push(`control ${name}`)
  }
  return found
}

// A return of a handover through the checkin API, Ready in the run's room: every key of the return form's body
// (foundation note N3: the schema reads a missing optional key as missing).
export async function returnByApi(page: Page, assetId: string, checkoutId: string, returnedBy: { id: string; fullNameTh: string }, masters: { readyStatusId: string; goodConditionId: string }) {
  const data = readRunData()
  const response = await page.request.post(`/api/assets/${assetId}/checkin`, {
    data: {
      checkoutId,
      returnDate: bangkokDate(),
      returnBy: returnedBy.fullNameTh,
      returnByEmployeeId: returnedBy.id,
      receiveBy: data.employees.itStaff.fullNameTh,
      receiveByEmployeeId: data.employees.itStaff.id,
      conditionAfter: masters.goodConditionId,
      missingAccessories: "",
      damageNote: "",
      nextStatusId: masters.readyStatusId,
      nextLocationId: data.locationId,
      remark: "E2E asset detail return",
      maintenanceReportedById: "",
      maintenanceProblem: "",
    },
  })
  expect(response.status(), `POST /api/assets/${assetId}/checkin: ${(await response.text()).slice(0, 300)}`).toBe(201)
  return (await response.json()) as { id: string; documentNo: string }
}

// A transfer through the transfer API to a room and a custodian (the transfer form's body).
export async function transferByApi(page: Page, assetId: string, toLocationId: string, toCustodianId: string, reason: string) {
  const response = await page.request.post(`/api/assets/${assetId}/transfer`, { data: { toLocationId, toCustodianId, toDepartmentId: "", reason, remark: "" } })
  expect(response.status(), `POST /api/assets/${assetId}/transfer: ${(await response.text()).slice(0, 300)}`).toBe(201)
  return (await response.json()) as { id: string; documentNo: string }
}

// The suite's photo as the asset's own photo (module "asset"), through the upload route the files tab posts to.
export async function uploadPhotoByApi(page: Page, assetId: string) {
  const response = await page.request.post(`/api/assets/${assetId}/attachments`, {
    multipart: { file: { name: "photo.png", mimeType: "image/png", buffer: readFileSync(PHOTO_FIXTURE) } },
  })
  expect(response.status(), `POST /api/assets/${assetId}/attachments: ${(await response.text()).slice(0, 300)}`).toBe(201)
  return (await response.json()) as { id: string }
}

// A repair done in one save, the asset usable after it (its status unchanged), through the repair form's route and
// with every key of its body.
export async function recordRepairByApi(page: Page, assetId: string, reportedById: string, problem: string) {
  const response = await page.request.post("/api/maintenance-tickets", {
    data: {
      assetId,
      maintenancePlanId: null,
      problem,
      reportedDate: bangkokDate(),
      done: true,
      outcome: "usable",
      reportedById,
      vendorId: null,
      repairCost: 1500,
      invoiceNo: null,
      remark: "E2E asset detail repair",
    },
  })
  expect(response.status(), `POST /api/maintenance-tickets: ${(await response.text()).slice(0, 300)}`).toBe(201)
  return (await response.json()) as { id: string; repairNo: string }
}
```

`e2e/transactions/tx-support.ts`:
- `:83-104` `handoverByApi` gains a fifth parameter `checkoutDate = bangkokDate()` and sends `checkoutDate` in its body instead of `bangkokDate()`; the comment above it reads "A permanent handover through the checkout API (the form's own route, JSON body), on the date given (today by default), for the workflows that start from an asset already handed over (return, cancel, the asset detail's fact strip)." Every caller today passes four arguments and keeps today's date.
- `:250-252` the view type becomes `view?: "history" | "components" | "files" | "maintenance"` (Task 7's names; the overview is the page without `?view=`). The body is unchanged.

- [ ] **Step 3: Write the spec**

`e2e/asset-detail/asset-detail.spec.ts`:

```ts
// The asset detail of page group 1 (spec docs/superpowers/specs/2026-10-25-page-group-1-dashboard-detail-login-design.md
// §10): (1) the detail's primary and the transactions at the top of "อื่น ๆ" are the register row's next button and the
// top of its ⋯, reasons included; (2) the history's chips filter it, the overview shows the latest 3, and the HO-, RT-
// and TR- links open; (3) the fact strip's cells open the register by custodian (no E2E role holds employee:view) and
// by location, and the round, and "ถือมาแล้ว N วัน" counts from the handover's date; (4) from a register search the
// page shows "k / N" and its links keep returnTo, and opened directly it shows neither; (5) the primary is the header's
// last button on the desktop and sits in the bottom bar on every tab on the phone. Beside them (R43), the files tab and
// the repair tab, axe included, on an asset with a photo and a repair. Every asset is the test's own, made through the
// app's APIs, so the dev data's counts never matter.
import { asUser, expect, test } from "../support/fixtures.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { downloadBy, openWorkbook } from "../cross-cutting/support/files.ts"
import { createAssets, createRoom, readAssetChoices, recordPrefix } from "../disposal/disposal-support.ts"
import { fillTemplate } from "../shell/shell-words.ts"
import { bangkokDate, txAssetTag } from "../transactions/tx-plan.ts"
import { createTxAsset, ensureSecondLocation, expectReachable, handoverByApi, readAssetMasters, record, visit, visitAssetPage } from "../transactions/tx-support.ts"
import { DETAIL_VIEWS, DETAIL_WORDS, PERSONAL_TRANSACTIONS } from "./detail-words.ts"
import {
  allHistoryLink, chipCount, controlNames, currentTab, factCell, historyChip, latestPanel, numberIn, openMoreActions, openRowActions,
  primaryAction, readMenuEntries, recordRepairByApi, registerNext, registerRows, returnByApi, shownDocuments, transactionPrefix,
  transferByApi, uploadPhotoByApi, type Locator,
} from "./detail-steps.ts"

test.describe("IT staff", () => {
  asUser("itStaff")

  test("the detail's primary and the top of อื่น ๆ are the register row's next button and the top of its ⋯, reasons included (spec §10 (1))", async ({ page, measure, e2eDevice }, testInfo) => {
    const receiver = readRunData().employees.receiver1
    const masters = await readAssetMasters(page)
    const asset = await createTxAsset(page, masters, testInfo.project.name, "AD1", "โน้ตบุ๊กกฎการดำเนินการ")
    const handover = await handoverByApi(page, asset.id, receiver.id, masters.goodConditionId)
    // In Use with an open handover: รับคืน is the primary (spec §7.1 rule 1); ส่งมอบ and โอนย้าย wait for it, each with
    // the register's own reason.
    const expected = [
      { label: DETAIL_WORDS.checkout, reason: DETAIL_WORDS.reasonStatusNotReady, available: false },
      { label: DETAIL_WORDS.transfer, reason: DETAIL_WORDS.reasonOpenCheckout, available: false },
    ]
    // Where a link goes: the form, the handover it returns, and the page it comes back to.
    const target = (href: string) => {
      const url = new URL(href, page.url())
      return { path: url.pathname, checkoutId: url.searchParams.get("checkoutId"), back: new URL(url.searchParams.get("returnTo") ?? "/", page.url()).pathname }
    }

    // The register, searched to this one asset: its row's next button (the desktop table has one) and its ⋯.
    await visit(measure, `/th/assets?search=${encodeURIComponent(asset.assetTag)}`, "register, the asset searched", testInfo)
    let registerTarget: ReturnType<typeof target> | null = null
    if (e2eDevice === "desktop") {
      const next = registerNext(page, asset.assetTag)
      await expect(next).toHaveAccessibleName(`${DETAIL_WORDS.checkin} ${asset.assetTag}`)
      registerTarget = target((await next.getAttribute("href")) ?? "")
    }
    const registerMenu = await openRowActions(page, e2eDevice, asset.assetTag)
    const registerTransactions = transactionPrefix(await readMenuEntries(registerMenu), PERSONAL_TRANSACTIONS, DETAIL_WORDS.checkin)
    await record(measure, "register, the row's actions open", testInfo)
    await page.keyboard.press("Escape")

    // The asset's page: the same primary and the same items.
    await visitAssetPage(measure, asset.id, "asset with an open handover", testInfo)
    const primary = primaryAction(page, e2eDevice)
    await expect(primary).toHaveAccessibleName(DETAIL_WORDS.checkin)
    const detailTarget = target((await primary.getAttribute("href")) ?? "")
    const detailMenu = await openMoreActions(page, e2eDevice)
    const detailTransactions = transactionPrefix(await readMenuEntries(detailMenu), PERSONAL_TRANSACTIONS, DETAIL_WORDS.checkin)
    await record(measure, "asset page, อื่น ๆ open", testInfo)

    expect(detailTransactions).toEqual(registerTransactions)
    expect(detailTransactions).toEqual(expected)
    // Both open the return of the same handover, each coming back to the page the person is on (spec §7.1).
    expect(detailTarget).toEqual({ path: "/th/asset-management/checkin", checkoutId: handover.id, back: `/th/assets/${asset.id}` })
    if (registerTarget) expect(registerTarget).toEqual({ path: "/th/asset-management/checkin", checkoutId: handover.id, back: "/th/assets" })
  })

  test("the history's chips filter it, the overview shows the latest 3, and the HO-, RT- and TR- links open (spec §10 (2))", async ({ page, measure, e2eDevice }, testInfo) => {
    test.setTimeout(180_000)
    const data = readRunData()
    const room = await ensureSecondLocation()
    const masters = await readAssetMasters(page)
    const asset = await createTxAsset(page, masters, testInfo.project.name, "AD2", "โน้ตบุ๊กประวัติ")
    // Three transactions after the registration, each with its document: a handover, its return and a transfer.
    const handover = await handoverByApi(page, asset.id, data.employees.receiver1.id, masters.goodConditionId)
    const checkin = await returnByApi(page, asset.id, handover.id, data.employees.receiver1, masters)
    const transfer = await transferByApi(page, asset.id, room.id, data.employees.receiver2.id, `${asset.assetTag} ย้ายตามประวัติ`)
    const docs = [
      { chip: DETAIL_WORDS.checkout, code: handover.documentNo, path: `/th/asset-management/checkouts/${handover.id}`, title: DETAIL_WORDS.handoverDocument },
      { chip: DETAIL_WORDS.checkin, code: checkin.documentNo, path: `/th/asset-management/checkins/${checkin.id}`, title: DETAIL_WORDS.returnDocument },
      { chip: DETAIL_WORDS.transfer, code: transfer.documentNo, path: `/th/asset-management/transfers/${transfer.id}`, title: DETAIL_WORDS.transferDocument },
    ]
    const codes = docs.map((doc) => doc.code)
    const main = page.getByRole("main")

    // The overview: ความเคลื่อนไหวล่าสุด holds the latest three events, the three transactions (the registration came
    // first), and its link counts every event.
    await visitAssetPage(measure, asset.id, "asset with three transactions", testInfo)
    const allHistory = allHistoryLink(page).filter({ visible: true }).first()
    const total = numberIn(await allHistory.innerText())
    expect(total, "the registration and the three transactions at least").toBeGreaterThanOrEqual(4)
    expect(await shownDocuments(latestPanel(page), codes)).toEqual(codes)
    await expect(latestPanel(page).locator("tbody tr, li").filter({ visible: true })).toHaveCount(3)

    // The history tab: its count, ทั้งหมด and the overview's link agree, and every document is there.
    await allHistory.click()
    await page.waitForURL((url) => url.pathname === `/th/assets/${asset.id}` && url.searchParams.get("view") === "history")
    await record(measure, "the asset's history", testInfo)
    await expect(currentTab(page)).toContainText(DETAIL_WORDS.historyTab)
    expect(numberIn(await currentTab(page).innerText()), "the tab's count").toBe(total)
    expect(await chipCount(page, DETAIL_WORDS.chipAll), "ทั้งหมด").toBe(total)
    expect(await shownDocuments(main, codes)).toEqual(codes)
    // Chips show only for the categories with events (R17): no disposal here.
    await expect(historyChip(page, DETAIL_WORDS.disposalChip)).toHaveCount(0)
    // Each type's chip shows its own transaction and counts it; choosing one does not navigate (spec §7.6).
    const historyUrl = page.url()
    for (const doc of docs) {
      await historyChip(page, doc.chip).check()
      expect(await chipCount(page, doc.chip), doc.chip).toBe(1)
      expect(await shownDocuments(main, codes), doc.chip).toEqual([doc.code])
      expect(page.url(), "choosing a chip does not navigate").toBe(historyUrl)
    }
    await historyChip(page, DETAIL_WORDS.chipAll).check()
    expect(await shownDocuments(main, codes)).toEqual(codes)
    // The desktop offers the Excel export of every event in the page's language (asset:view, R15): one sheet, a header
    // row of 6 columns, then one row per event. The phone has no export (R17).
    const exportLink = main.getByRole("link", { name: DETAIL_WORDS.exportExcel, exact: true }).filter({ visible: true })
    if (e2eDevice === "desktop") {
      const href = new URL((await exportLink.getAttribute("href")) ?? "", page.url())
      expect([href.pathname, href.searchParams.get("locale")], "the export of this asset, in Thai").toEqual([`/api/assets/${asset.id}/history/export`, "th"])
      const { bytes } = await downloadBy(page, () => exportLink.click(), "asset-history", (name) => testInfo.outputPath(name))
      const [sheet] = Object.values(await openWorkbook(bytes))
      expect(sheet[0], "the export's 6 columns").toHaveLength(6)
      expect(sheet.length - 1, "every event").toBe(total)
    } else {
      await expect(exportLink).toHaveCount(0)
    }
    // Each document opens from its event (the document column on the desktop, the event's card on the phone).
    for (const doc of docs) {
      await visitAssetPage(measure, asset.id, `the asset's history, to its ${doc.chip}`, testInfo, "history")
      await main.getByRole("link", { name: doc.code }).filter({ visible: true }).first().click()
      await page.waitForURL((url) => url.pathname === doc.path)
      await expect(page.getByRole("heading", { level: 1, name: doc.title })).toBeVisible()
      await expect(page.getByText(doc.code, { exact: true }).first()).toBeVisible()
      await record(measure, `${doc.chip}: its document from the history`, testInfo)
    }
    // ?type= chooses the first chip, and an old link still opens the history (spec §7.3, §7.6).
    await visit(measure, `/th/assets/${asset.id}?view=history&type=transfer`, "the asset's history, its transfers", testInfo)
    await expect(historyChip(page, DETAIL_WORDS.transfer)).toBeChecked()
    expect(await shownDocuments(main, codes)).toEqual([transfer.documentNo])
    await visit(measure, `/th/assets/${asset.id}?view=operations`, "the asset's history from an old link", testInfo)
    await expect(currentTab(page)).toContainText(DETAIL_WORDS.historyTab)
  })

  test("from a register search the page shows k / N and its links keep returnTo; opened directly it shows neither (spec §10 (4))", async ({ page, measure, e2eDevice }, testInfo) => {
    const { runId } = readRunState()
    const masters = await readAssetMasters(page)
    for (const key of ["NAV1", "NAV2", "NAV3"]) await createTxAsset(page, masters, testInfo.project.name, key, "โน้ตบุ๊กก่อนหน้าถัดไป")
    // The tag rule applied to "NAV" is the three tags' common start: the search finds them and nothing else.
    const search = txAssetTag(runId, testInfo.project.name, "NAV")
    await visit(measure, `/th/assets?search=${encodeURIComponent(search)}`, "register, three assets searched", testInfo)
    const rows = await registerRows(page)
    expect(rows).toHaveLength(3)
    const returnTo = new URL(rows[0].href, page.url()).searchParams.get("returnTo") ?? ""
    expect(new URL(returnTo, page.url()).searchParams.get("search")).toBe(search)
    const main = page.getByRole("main")
    const crumbs = page.getByRole("navigation", { name: DETAIL_WORDS.breadcrumb })
    const searchCrumb = fillTemplate(DETAIL_WORDS.searchCrumb, { search })
    const previous = main.getByRole("link", { name: DETAIL_WORDS.previous, exact: true }).filter({ visible: true })
    const next = main.getByRole("link", { name: DETAIL_WORDS.next, exact: true }).filter({ visible: true })
    // A neighbour's link opens that asset and keeps the search.
    const opens = async (link: Locator, id: string) => {
      const url = new URL((await link.getAttribute("href")) ?? "", page.url())
      expect([url.pathname, url.searchParams.get("returnTo")], "the neighbour, with the search kept").toEqual([`/th/assets/${id}`, returnTo])
    }

    // The first, as the register opens it: 1 / 3, a next link and no previous one; the search's crumb (text, not a
    // link: the register's crumb already goes back, R10) and the back link to it (spec §7.2, R33).
    await visit(measure, rows[0].href, "the first asset of the search", testInfo)
    await expect(main).toContainText("1 / 3")
    await expect(previous).toHaveCount(0)
    await opens(next, rows[1].id)
    await expect(crumbs).toContainText(searchCrumb)
    await expect(crumbs.getByRole("link", { name: searchCrumb })).toHaveCount(0)
    await expect(crumbs.getByRole("link", { name: DETAIL_WORDS.register, exact: true })).toHaveAttribute("href", returnTo)
    await expect(main.getByRole("link", { name: DETAIL_WORDS.backToResults })).toHaveAttribute("href", returnTo)
    // The second, by the next link: next on both widths, previous on the desktop (the phone shows next only, §7.8).
    await next.click()
    await page.waitForURL((url) => url.pathname === `/th/assets/${rows[1].id}`)
    await record(measure, "the second asset of the search", testInfo)
    await expect(main).toContainText("2 / 3")
    if (e2eDevice === "desktop") await opens(previous, rows[0].id)
    await opens(next, rows[2].id)
    // The last: no next link.
    await next.click()
    await page.waitForURL((url) => url.pathname === `/th/assets/${rows[2].id}`)
    await record(measure, "the last asset of the search", testInfo)
    await expect(main).toContainText("3 / 3")
    await expect(next).toHaveCount(0)
    // Opened directly: no counter, no neighbours, no middle crumb.
    await visitAssetPage(measure, rows[0].id, "the first asset opened directly", testInfo)
    await expect(main).not.toContainText("1 / 3")
    await expect(previous).toHaveCount(0)
    await expect(next).toHaveCount(0)
    await expect(crumbs).not.toContainText(searchCrumb)
    await expect(crumbs).not.toContainText(DETAIL_WORDS.filtersCrumb)
  })

  test("the primary is the header's last button on the desktop, and on the phone it sits in the bottom bar on every tab, after สแกนรายการถัดไป from the scan page (spec §10 (5))", async ({ page, measure, e2eDevice }, testInfo) => {
    const masters = await readAssetMasters(page)
    const asset = await createTxAsset(page, masters, testInfo.project.name, "AD5", "โน้ตบุ๊กแถบล่าง")
    const bar = page.locator('[data-slot="action-bar"]')
    await visitAssetPage(measure, asset.id, "a Ready asset", testInfo)
    if (e2eDevice === "desktop") {
      // DESIGN order (spec §7.2): back, อื่น ๆ, the pinned พิมพ์ป้าย and บันทึกซ่อม, the primary last; no bottom bar.
      expect(await controlNames(page.locator('[data-slot="page-header-actions"]'))).toEqual([DETAIL_WORDS.back, DETAIL_WORDS.more, DETAIL_WORDS.printLabel, DETAIL_WORDS.recordRepair, DETAIL_WORDS.checkout])
      await expect(bar).toBeHidden()
      return
    }
    // The phone, on every tab: exactly the primary first and wide, the pinned บันทึกซ่อม, then การดำเนินการอื่น (spec
    // §7.8, R21).
    for (const view of DETAIL_VIEWS) {
      if (view !== "overview") await visitAssetPage(measure, asset.id, `a Ready asset, ${view}`, testInfo, view)
      expect(await controlNames(bar), view).toEqual([DETAIL_WORDS.checkout, DETAIL_WORDS.recordRepair, DETAIL_WORDS.moreActions])
      await expectReachable(primaryAction(page, "phone"))
    }
    // The header's buttons are hidden on the phone, so แก้ไข and พิมพ์ป้าย end the bar's sheet, in the order
    // buildAssetDetailMoreGroups gives them (Task 8B, R21).
    const sheetItems = (await readMenuEntries(await openMoreActions(page, "phone"))).map((entry) => entry.label)
    expect(sheetItems.slice(-2)).toEqual([DETAIL_WORDS.edit, DETAIL_WORDS.printLabel])
    await page.keyboard.press("Escape")
    // From the scan page exactly the next scan (wide), the rule's primary, then การดำเนินการอื่น; บันทึกซ่อม moves into
    // the sheet (spec §7.8, today's field flow, R21).
    await visit(measure, `/th/assets/${asset.id}?returnTo=${encodeURIComponent("/th/asset-management/scan")}`, "a Ready asset from the scan page", testInfo)
    expect(await controlNames(bar)).toEqual([DETAIL_WORDS.scanNext, DETAIL_WORDS.checkout, DETAIL_WORDS.moreActions])
    await expect(bar.getByRole("link", { name: DETAIL_WORDS.scanNext })).toHaveAttribute("href", /^\/th\/asset-management\/scan(?:[?#]|$)/)
    await expect(page.getByRole("main").getByRole("link", { name: DETAIL_WORDS.backToScan })).toBeVisible()
  })

  // R43: no step of §10 opens these two tabs with content, so each is visited once, axe included (tx-support's visit),
  // in all four projects, on an asset of the test's own with a photo and a repair.
  test("the files tab and the repair tab pass the page checks on an asset with a photo and a repair (group 1 asset detail)", async ({ page, measure }, testInfo) => {
    const masters = await readAssetMasters(page)
    const asset = await createTxAsset(page, masters, testInfo.project.name, "AD6", "โน้ตบุ๊กไฟล์และงานซ่อม")
    await uploadPhotoByApi(page, asset.id)
    const repair = await recordRepairByApi(page, asset.id, readRunData().employees.itStaff.id, `${asset.assetTag} จอกะพริบ`)
    const main = page.getByRole("main")

    // ไฟล์: the photo is a tile from the thumbnail route, and it loads.
    await visitAssetPage(measure, asset.id, "asset files with a photo", testInfo, "files")
    const tile = main.locator('img[src*="/api/attachments/"][src*="/thumbnail"]').filter({ visible: true }).first()
    await expect(tile).toBeVisible()
    expect(await tile.evaluate((image) => (image as HTMLImageElement).naturalWidth), "the tile loads").toBeGreaterThan(0)

    // ซ่อม / PM: the repair's row, its number shown.
    await visitAssetPage(measure, asset.id, "asset repairs with a repair", testInfo, "maintenance")
    await expect(main.getByText(repair.repairNo, { exact: true }).filter({ visible: true }).first()).toBeVisible()
  })
})

test.describe("the IT head", () => {
  asUser("itHead")

  // The IT head, because the round this test opens is cancelled at the end, which needs audit:approve.
  test("the fact strip's cells open the register by custodian and by location and the round, and ถือมาแล้ว counts from the handover's date (spec §10 (3))", async ({ page, measure }, testInfo) => {
    test.setTimeout(180_000)
    const receiver = readRunData().employees.receiver1
    const choices = await readAssetChoices(page, measure)
    const prefix = recordPrefix(testInfo, "ADF")
    // A room of the test's own, so the round below reaches this asset alone and the register by location lists it alone.
    const roomName = `${prefix} ห้องทดสอบหน้ารายละเอียด`
    const roomId = await createRoom(`${prefix}-ROOM`, roomName)
    const [asset] = await createAssets(page, choices, roomId, [`${prefix}-1`])
    // Handed over 46 days ago: the custodian's cell counts the Bangkok days from the handover's own date.
    const handedOverOn = bangkokDate(-46)
    await handoverByApi(page, asset.id, receiver.id, choices.conditionId, handedOverOn)
    const heldDays = Math.round((Date.parse(bangkokDate()) - Date.parse(handedOverOn)) / 86_400_000)
    // A round over the room, due in a week (the dashboard's one-day round, due today, still wins its pick): the asset
    // waits in it.
    const opened = await page.request.post("/api/audit-rounds", {
      data: {
        name: `${prefix} รอบทดสอบหน้ารายละเอียด`,
        auditYear: Number(bangkokDate().slice(0, 4)),
        scopeCompanyId: null,
        scopeBranchId: null,
        scopeDepartmentId: null,
        scopeLocationId: roomId,
        scopeCategoryId: null,
        scopeCustodianId: null,
        scopeStatusId: null,
        scopeConditionId: null,
        includeClosedAssets: false,
        riskPreset: "all",
        sampleRate: 100,
        startDate: bangkokDate(),
        endDate: bangkokDate(7),
        status: "open",
      },
    })
    expect(opened.status(), await opened.text()).toBe(201)
    const round = (await opened.json()) as { id: string; auditNo: string }
    try {
      await visitAssetPage(measure, asset.id, "asset with its fact strip", testInfo)
      const custodian = factCell(page, DETAIL_WORDS.custodianCell)
      await expect(custodian).toContainText(receiver.fullNameTh)
      await expect(custodian).toContainText(fillTemplate(DETAIL_WORDS.heldDays, { days: heldDays }))
      // ประกัน: no warranty date, and the IT head (asset:edit) is offered the edit form's purchase section.
      const warranty = factCell(page, DETAIL_WORDS.warrantyCell)
      await expect(warranty).toContainText(DETAIL_WORDS.warrantyUnknown)
      const purchase = new URL((await warranty.getByRole("link", { name: DETAIL_WORDS.addPurchase }).getAttribute("href")) ?? "", page.url())
      expect([purchase.pathname, purchase.hash.length > 1], "the edit form, at its purchase section").toEqual([`/th/assets/${asset.id}/edit`, true])
      // ตรวจนับล่าสุด: waiting in the round (the pending state wins, R35), whose code is the link that opens it.
      const audit = factCell(page, DETAIL_WORDS.auditCell)
      await expect(audit).toContainText(DETAIL_WORDS.auditPending)
      await audit.getByRole("link", { name: round.auditNo, exact: true }).click()
      await page.waitForURL((url) => url.pathname === `/th/audit/rounds/${round.id}`)
      await record(measure, "the round from the fact strip", testInfo)
      await expect(page.getByRole("main")).toContainText(round.auditNo)

      // ที่ตั้ง: the register by the asset's location, with its chip, holds the room's one asset. The link is exact
      // (`exact=1`), so the register's remembered view never adds to it (R9).
      await visitAssetPage(measure, asset.id, "asset, to its location", testInfo)
      await factCell(page, DETAIL_WORDS.locationCell).getByRole("link", { name: roomName }).click()
      await page.waitForURL((url) => url.pathname === "/th/assets" && url.searchParams.get("locationId") === roomId && url.searchParams.get("exact") === "1")
      await record(measure, "the register by the asset's location", testInfo)
      await expect(page.getByRole("group", { name: DETAIL_WORDS.activeFilters }).filter({ visible: true })).toContainText(`${DETAIL_WORDS.locationCell}: ${prefix}-ROOM - ${roomName}`)
      await expect(page.getByRole("main")).toContainText("จาก 1 รายการ")
      await expect(page.getByRole("main").getByText(asset.assetTag, { exact: true }).filter({ visible: true }).first()).toBeVisible()

      // ผู้ถือครอง: without employee:view the name opens the register by custodian, with its chip.
      await visitAssetPage(measure, asset.id, "asset, to its custodian", testInfo)
      await custodian.getByRole("link", { name: receiver.fullNameTh }).click()
      await page.waitForURL((url) => url.pathname === "/th/assets" && url.searchParams.get("custodianId") === receiver.id && url.searchParams.get("exact") === "1")
      await record(measure, "the register by the asset's custodian", testInfo)
      await expect(page.getByRole("group", { name: DETAIL_WORDS.activeFilters }).filter({ visible: true })).toContainText(receiver.fullNameTh)
    } finally {
      const cancelled = await page.request.patch(`/api/audit-rounds/${round.id}`, { data: { action: "cancel", reason: `${prefix} ปิดรอบทดสอบหน้ารายละเอียด` } })
      expect(cancelled.ok(), await cancelled.text()).toBe(true)
    }
  })
})
```

Notes on the spec:
- **(1) What is compared.** Both menus start with the transactions of the rule (spec §7.1); `transactionPrefix` reads them from the top and drops the primary's own label: `transactions` never repeat the primary, but the register's ⋯ leads with it on the phone, whose row has no next button (`asset-register-row-actions.tsx` passes `next` for the desktop variant only; R3). The expected pair is the rule's output for an In Use personal asset with an open handover: `status_not_ready` for ส่งมอบ and `open_checkout` for โอนย้าย, the sentences `getAssetRegisterTransactionActions` gives today (`src/lib/asset-operation-policy.ts:95-104`).
- **(2) The latest 3.** The registration writes a `create` movement (`src/app/api/assets/route.ts:105-108`) before the three transactions, so the latest three events are the three with documents; each route writes one movement (`checkout/route.ts:161`, `checkin/route.ts:202`, `transfer/route.ts:115`; the `parent_*_sync` ones are for components). The test does not assert the total is 4: the registration counts as แก้ไขข้อมูล (R16) and Task 3 may add events from other sources; it asserts the three counts agree, as `getAssetHistoryCounts().total` is all three (R11), and that the Excel holds that many rows under its 6-column header (R15). The document links show because IT staff hold `asset:view`, the permission of HO-, RT- and TR- (`ASSET_MOVEMENT_DOCUMENT_PERMISSION`, `src/lib/asset-movement-labels.ts:120-127`; R12).
- **(3) The custodian's link.** No E2E role holds `employee:view` (`e2e/support/run-plan.ts:12-27`), so the name opens the register by `custodianId`; the employee page is a UAT line (R42). Both register links carry `exact=1` (`buildExactAssetRegisterHref`, `src/lib/asset-register-view-memory.ts:28-32`; R9). The pending audit reads "รอตรวจในรอบ" and then the round's code as its own link (R35). The handover is dated 46 days back: `assetCheckoutSchema` takes any date (`src/lib/validations/asset-operations.ts:20`).
- **(4) The order.** The steps read the register's own order off its page and follow the detail's links, so they never assume the register's default sort; three tags made within milliseconds are ordered by the `id` tie-break when their sort values meet (Task 2).
- **(5) The phone's bar.** `expectReachable` checks the primary is on top and in view on each tab; the bar is fixed, so no scroll hides it. The bar's names are compared whole (R21), in the scan return too.
- **(R43) The files and repair tabs.** The photo goes up through `POST /api/assets/[id]/attachments` (the route the files tab posts to, `asset:edit`, module `asset`), the repair through `POST /api/maintenance-tickets` with the repair form's body (`src/components/maintenance/repair-record-form.tsx:154-169`): done in one save, outcome usable, so a Ready asset stays Ready (`getRepairRecordCreateEffect`, `src/lib/repair-record-policy.ts:53-73`). `visitAssetPage` runs axe on each tab; the photo's tile is checked after, so its image has loaded.

- [ ] **Step 4: Change the steps that read the old page**

Each change below replaces the lines named; everything else in the file stays.

`e2e/transactions/handover.spec.ts` (add `import { openMoreActions, primaryAction, readMenuEntries } from "../asset-detail/detail-steps.ts"` after the tx-support import):
- `:30-33`:
  ```ts
  // From the asset page's primary action (spec §7.1: a Ready personal asset's is ส่งมอบ), as IT staff start a handover.
  await visitAssetPage(measure, asset.id, "asset before the handover", testInfo)
  const primary = primaryAction(page, e2eDevice)
  await expect(primary).toHaveAccessibleName("ส่งมอบ")
  await primary.click()
  ```
- `:90-91`:
  ```ts
  // The handover waits for the return now: รับคืน is the primary, and ส่งมอบ sits in "อื่น ๆ" with its reason (spec §7.1).
  await expect(primaryAction(page, e2eDevice)).toHaveAccessibleName("รับคืน")
  expect(await readMenuEntries(await openMoreActions(page, e2eDevice))).toContainEqual({ label: "ส่งมอบ", reason: "ส่งมอบได้เมื่อสถานะเป็น พร้อมใช้งาน เท่านั้น", available: false })
  await record(measure, "asset after the handover, อื่น ๆ open", testInfo)
  ```
- `:146`: the test takes `{ page, measure, e2eDevice }`.
- `:193-194`:
  ```ts
  await visitAssetPage(measure, asset.id, "asset handed over", testInfo)
  await expect(primaryAction(page, e2eDevice)).toHaveAccessibleName("รับคืน")
  expect(await readMenuEntries(await openMoreActions(page, e2eDevice))).toContainEqual({ label: "ส่งมอบ", reason: "ส่งมอบได้เมื่อสถานะเป็น พร้อมใช้งาน เท่านั้น", available: false })
  ```
  The comment at `:187` reads "A fresh form no longer offers the asset, and its page offers the handover only as an unavailable item with its reason."

`e2e/transactions/return.spec.ts` (add `import { primaryAction } from "../asset-detail/detail-steps.ts"`), `:35-37`:
```ts
// From the asset page's primary action (spec §7.1: an open handover's is รับคืน).
await visitAssetPage(measure, asset.id, "asset handed over", testInfo)
const primary = primaryAction(page, e2eDevice)
await expect(primary).toHaveAccessibleName("รับคืน")
await primary.click()
```

`e2e/transactions/transfer.spec.ts` (add `import { menuItem, openMoreActions, primaryAction } from "../asset-detail/detail-steps.ts"`):
- `:27`: the test takes `{ page, measure, e2eDevice }`.
- `:33-34`:
  ```ts
  await visitAssetPage(measure, asset.id, "asset before the transfer", testInfo)
  // A Ready asset's primary is ส่งมอบ; its transfer is in "อื่น ๆ" (spec §7.1).
  await expect(primaryAction(page, e2eDevice)).toHaveAccessibleName("ส่งมอบ")
  await menuItem(await openMoreActions(page, e2eDevice), "โอนย้าย").click()
  ```
- `:86-100` (the comment and the TX-A4 test, its closing `})` included):
  ```ts
  // Finding TX-A4: no page linked to /asset-management/transfers/<id>, so a person could not open the TR- document they
  // had just made.
  test("the TR- document opens from the asset page (finding TX-A4)", async ({ page, measure }, testInfo) => {
    // TX-A4 fixed (FX10): this test keeps the TR- document linked from the asset's history.
    const transfer = transfers.get(testInfo.project.name)
    expect(transfer, "the transfer test ran first").toBeTruthy()
    if (!transfer) return
    // The overview's ความเคลื่อนไหวล่าสุด and the history tab both link it (spec §7.5, §7.6).
    for (const view of [undefined, "history"] as const) {
      await visitAssetPage(measure, transfer.assetId, `asset after the transfer (${view ?? "overview"})`, testInfo, view)
      expect(await page.locator(`a[href*="/asset-management/transfers/${transfer.transferId}"]`).count(), `links to the TR- document (${view ?? "overview"})`).toBeGreaterThan(0)
    }
  })
  ```

`e2e/transactions/cancel.spec.ts` (add `import { menuItem, openMoreActions } from "../asset-detail/detail-steps.ts"`):
- `:25`: the test takes `{ page, measure, e2eDevice }`.
- `:32-34`:
  ```ts
  await visitAssetPage(measure, asset.id, "asset handed over by mistake", testInfo)
  // "อื่น ๆ" (on the phone, "การดำเนินการอื่น" in the bottom bar) holds the cancel of the latest transaction (spec §7.1).
  await menuItem(await openMoreActions(page, e2eDevice), /^ยกเลิกรายการ/).click()
  ```
- `:76-81`:
  ```ts
  // The history tab keeps the handover, by its HO- document, and the cancel that undid it.
  await visitAssetPage(measure, asset.id, "asset history after the cancel", testInfo, "history")
  const history = page.getByRole("main")
  await expect(history.getByRole("link", { name: handover.documentNo }).filter({ visible: true }).first()).toBeVisible()
  const cancelEntry = history.getByText(/Checkout Cancel|ยกเลิก.*ส่งมอบ/).filter({ visible: true }).first()
  await expect(cancelEntry).toBeVisible()
  ```

`e2e/transactions/desk-delivery.spec.ts` (add `import { primaryAction } from "../asset-detail/detail-steps.ts"`), `:32-33`:
```ts
await visitAssetPage(measure, asset.id, "asset on the phone", testInfo)
// The primary sits in the bottom bar: a link named ส่งมอบ (spec §7.8).
const primary = primaryAction(page, "phone")
await expect(primary).toHaveAccessibleName("ส่งมอบ")
await primary.tap()
```

`e2e/transactions/register-asset.spec.ts:96-99`:
```ts
// The photo card loads the card size from the thumbnail route, never the original file (spec §7.5).
const photo = page.locator('main img[src*="/api/attachments/"][src*="/thumbnail?size=card"]').first()
await expect(photo).toBeVisible()
expect(await photo.evaluate((image) => (image as HTMLImageElement).naturalWidth), "the photo loads").toBeGreaterThan(0)
// ข้อมูลทรัพย์สิน's "เอกสารจัดซื้อ" row names the purchase document, which opens the files tab's เอกสารจัดซื้อ
// (spec §7.5, §7.7; the app's one word for it, R31).
const purchaseDocument = page.locator("#overview").getByRole("link", { name: documentNo })
await expect(purchaseDocument).toBeVisible()
await purchaseDocument.click()
await page.waitForURL((url) => url.pathname === `/th/assets/${asset.id}` && url.searchParams.get("view") === "files")
await record(measure, "the new asset's files", testInfo)
await expect(page.getByRole("main").getByRole("heading", { name: "เอกสารจัดซื้อ", exact: true })).toBeVisible()
await expect(page.getByRole("main")).toContainText(documentNo)
```
The photo is checked before the page is left, so its image has loaded (no cancelled request).

`e2e/assets/licence.spec.ts`: after `:9` add `import { factCell } from "../asset-detail/detail-steps.ts"` and `import { DETAIL_WORDS } from "../asset-detail/detail-words.ts"`; `:73` becomes
```ts
// The seats are the fact strip's first cell (spec §7.4, §7.9).
await expect(factCell(page, DETAIL_WORDS.seatsCell)).toContainText("ใช้แล้ว 2/5 คงเหลือ 3")
```

`e2e/repair/repair-record.spec.ts:99-103` (`:101`'s `page.goto` line stays as it is, `tests/e2e-repair.test.ts:52` pins it):
```ts
// From the asset's own page: its "บันทึกซ่อม" (beside the primary: the header on the desktop, the bottom bar on the
// phone) opens the form with the asset chosen. The page is opened without its axe check here (finding AR2 has its own
// test below); its console and requests are still measured.
await page.goto(`/th/assets/${asset.id}`)
await page.getByRole("main").getByRole("link", { name: "บันทึกซ่อม", exact: true }).filter({ visible: true }).first().click()
await page.waitForURL((url) => url.pathname === "/th/maintenance/new" && url.searchParams.get("assetId") === asset.id)
```

`e2e/cross-cutting/roles.spec.ts`: `:7` imports `isWriteLink` too; add `import { controlNames, detailWriteControls, openMoreActionsIfShown, readMenuEntries } from "../asset-detail/detail-steps.ts"` and `import { DETAIL_VIEWS, DETAIL_WORDS } from "../asset-detail/detail-words.ts"`; after the M6 test (`:57`), in "the viewer":
```ts
  // Page group 1 (spec §7.1, §10): no tab of an asset's page offers the viewer a write control: no create, edit or
  // transaction link, none of the page's write words ("จัดการ" included, R35), no file to upload. Everyone gets the
  // phone's bar, and the viewer's holds only "การดำเนินการอื่น", whose sheet holds only "พิมพ์ป้าย" (R21); the
  // desktop draws no empty "อื่น ๆ". An action the person may not take is left out, never shown as unavailable.
  test("the viewer's asset page offers no write control on any tab (group 1 asset detail)", async ({ page, measure, browser, e2eDevice }, testInfo) => {
    const desk = await registerAssetsAsItStaff(browser, testInfo, [{ slug: "ROLE5", name: "แท็บอ่านอย่างเดียว", ownershipType: "personal" }])
    await desk.close()
    const asset = desk.assets[0]
    const offered: string[] = []
    for (const view of DETAIL_VIEWS) {
      await measure.visit(`/th/assets/${asset.id}${view === "overview" ? "" : `?view=${view}`}`, `asset page, ${view} (viewer)`)
      for (const control of [...(await writeControls(page)), ...(await detailWriteControls(page))]) offered.push(`${view}: ${control}`)
      if ((await page.getByRole("main").locator('input[type="file"]').count()) > 0) offered.push(`${view}: a file input`)
      if (e2eDevice === "phone") expect(await controlNames(page.locator('[data-slot="action-bar"]')), `${view}: the viewer's bar`).toEqual([DETAIL_WORDS.moreActions])
      const more = await openMoreActionsIfShown(page, e2eDevice)
      if (!more) continue
      for (const entry of await readMenuEntries(more)) {
        if (!entry.available) offered.push(`${view}: ${entry.label}, unavailable`)
        else if (entry.label !== DETAIL_WORDS.printLabel) offered.push(`${view}: ${entry.label}`)
      }
      for (const href of await more.locator("a[href]").evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""))) {
        if (isWriteLink(href)) offered.push(`${view}: link ${href.split("?")[0]}`)
      }
      await page.keyboard.press("Escape")
    }
    expect(offered).toEqual([])
  })
```

Run: `node --test tests/e2e-asset-detail.test.ts tests/e2e-transactions.test.ts tests/e2e-review.test.ts tests/e2e-cross-cutting.test.ts tests/e2e-repair.test.ts tests/e2e-suite.test.ts tests/e2e-fixes.test.ts`
Expected: PASS.

- [ ] **Step 5: Update the docs**

No marker of any template (`<today>`, `<N>`, `<commit>`, `<run id>`, `<plan file>` …) is written: the docs tests fail on them. Write the real commit date and the real base commit.

- `docs/99_CHANGELOG.md`: a `### รายละเอียดทรัพย์สินแบบ B (กลุ่มหน้าแรก งานที่ 3)` entry at the top, newest first: the first `###` under `## 2026-10-26` (above the dashboard entry) when the commit is on that date, else under a new `## <the commit date>` heading above it. It holds:
  - `Branch \`feat/group1-asset-detail\` (จาก \`master\` \`<the branch's base commit>\`) · spec \`docs/superpowers/specs/2026-10-25-page-group-1-dashboard-detail-login-design.md\` · plan \`docs/superpowers/plans/2026-10-26-group1-asset-detail.md\`` with the real base commit written in;
  - **ที่เปลี่ยน:** หน้ารายละเอียดทรัพย์สินตาม canvas B · หัวหน้า: เส้นทางหน้ามี "ผลค้นหา "…"" หรือ "ผลการกรอง" (เป็นข้อความ ไม่ใช่ลิงก์) เมื่อเปิดจากทะเบียน และ "k / N" กับลิงก์ "รายการก่อนหน้า" / "รายการถัดไป" ที่เก็บผลค้นหาไว้ (เปิดตรงหรือจากหน้าสแกนไม่แสดง บนมือถือแสดงเฉพาะถัดไป) · ปุ่มกลับ "กลับไปผลค้นหา" / "กลับไปสแกน" · แถวรหัส สถานะ และ S/N · ปุ่มเรียง กลับ อื่น ๆ พิมพ์ป้าย บันทึกซ่อม แล้วปุ่มหลัก · แท็บ ภาพรวม ประวัติ ส่วนควบ ไฟล์ ซ่อม / PM พร้อมจำนวน แสดง 0 ด้วย (`?view=overview|history|components|files|maintenance` ลิงก์เดิม `custody` `operations` `audit` ยังเปิดได้) · แถบข้อมูลสำคัญของทรัพย์สิน 4 ช่องที่ลิงก์ต่อได้ (ผู้ถือครองกับ "ถือมาแล้ว N วัน" หรือ "ไม่มีผู้ถือครอง" แผนกที่ดูแลหรือแผนกที่ใช้ ทรัพย์สินหลักของส่วนควบ หรือที่นั่งของ License · ที่ตั้ง · ตรวจนับล่าสุด · ประกัน) บนมือถือแสดงเฉพาะแท็บภาพรวม · ภาพรวม: ข้อมูลทรัพย์สิน (รวมสเปก แผนก ที่ตั้งประจำ ข้อมูลการซื้อ และเอกสารจัดซื้อ) รูปขนาดการ์ด (กดดูรูปเต็ม โหลดไม่ได้แสดง "โหลดรูปไม่ได้" ไม่มีรูปของตัวเองแสดง "รูปประจำรุ่น" ผู้แก้ไขได้ลิงก์ "อัปโหลดรูป" / "ถ่ายรูป" ไปแท็บไฟล์) ความเคลื่อนไหวล่าสุด 3 รายการ และอุปกรณ์ส่วนควบ · ประวัติเดียวของทรัพย์สิน ชิปตามประเภทพร้อมจำนวน ช่วงเวลา ทีละ 50 รายการ และส่งออก Excel 6 คอลัมน์ทุกเหตุการณ์ (สูงสุด 5,000 รายการ) เป็นภาษาของหน้า · ส่วนควบมีประวัติการติดตั้ง / ถอด · ไฟล์: รูปและไฟล์แนบ (หลายไฟล์ ถ่ายรูปบนมือถือ) เอกสารจัดซื้อ และหลักฐานจากงานอื่น · ซ่อม / PM: จำนวนครั้ง (ไม่นับที่ยกเลิกและ PM) เวลาที่ไม่ได้ใช้งานเพราะซ่อม ค่าใช้จ่ายซ่อมรวม ตารางงานซ่อม และรอบ PM · มือถือมีแถบล่างทุกแท็บสำหรับทุกคน (ปุ่มหลัก บันทึกซ่อม การดำเนินการอื่น ซึ่งมี แก้ไข และ พิมพ์ป้าย อยู่ท้ายรายการ) · เอา QR แผงสิ่งที่ต้องติดตาม คำสั่งด่วน การ์ดรูปประจำรุ่น แบนเนอร์ส่วนควบ และ drawer ประวัติกับหลักฐานออก แต่ละอย่างมีที่ใหม่ตาม spec §7.9 · ต่างจาก spec: ลิงก์อัปโหลดรูปบนภาพรวมพาไปแท็บไฟล์ซึ่งมีกล้อง แทนช่องเลือกไฟล์ในการ์ด และใช้คำ "เอกสารจัดซื้อ" ของระบบแทน "เอกสารการซื้อ";
  - **กฎการดำเนินการเดียว:** ปุ่มหลักและรายการธุรกรรมใน "อื่น ๆ" มาจาก `getAssetActions` (`src/lib/asset-actions.ts`) เดียวกับปุ่มถัดไปและ ⋯ ของแถวในทะเบียน · ชื่อปุ่มตามประเภทการถือครอง · ปุ่มหลักเป็นสิ่งที่ทำได้ทันทีเสมอ และไม่ซ้ำในรายการ (⋯ ของทะเบียนบนมือถือขึ้นต้นด้วยปุ่มหลัก) · รายการที่ทำตอนนี้ไม่ได้อยู่ใน "อื่น ๆ" พร้อมเหตุผล ไม่ใช่ปุ่มที่กดไม่ได้ · "บันทึกซ่อม" ที่ปักไว้ตามกฎเดียวของงานซ่อม · "ขอตัดจำหน่าย" ใน "อื่น ๆ" เมื่อยังไม่มีคำขอ ถ้ายังขอไม่ได้แสดงเหตุผลข้อแรก · โอนย้ายตามที่ API รับจริง · รายการที่คนไม่มีสิทธิ์ไม่แสดงเลย (ผู้ดูข้อมูลไม่เห็น ⋯ ในแถวทะเบียน) · ลิงก์ธุรกรรมส่ง `returnTo` ของหน้าที่อยู่;
  - **ส่วนกลางและนอกหน้า:** `FactStrip` · ช่อง "การดำเนินการอื่น" ของ `ActionBar` · thumbnail `?size=card` · ไฟล์ต้นฉบับที่ไม่มีตอบ 404 แทน 500 · ทะเบียนเรียงด้วย `id` ต่อท้าย และตัวกรอง `locationId` (ที่ตั้งของทรัพย์สินเอง เปิดจากลิงก์เท่านั้น) พร้อมชิป "ที่ตั้ง: …" ทุกขนาดจอ · `GET /api/assets/[id]/history/export?locale=` · ตัวอ่านเอกสารของความเคลื่อนไหว `src/lib/asset-movement-documents.ts` ที่แดชบอร์ดกับประวัติใช้ร่วมกัน;
  - **E2E:** `e2e/asset-detail/asset-detail.spec.ts` ตรวจ (1) ปุ่มหลักและรายการธุรกรรมใน "อื่น ๆ" ตรงกับปุ่มถัดไปและ ⋯ ของแถวในทะเบียน รวมเหตุผล (2) ชิปกรองประวัติ ภาพรวมแสดง 3 รายการล่าสุด ลิงก์ HO- RT- TR- เปิดได้ และไฟล์ Excel มี 6 คอลัมน์ครบทุกเหตุการณ์ (3) ช่องของแถบข้อมูลสำคัญเปิดทะเบียนตามผู้ถือครองและตามที่ตั้ง (`exact=1`) และรอบตรวจนับ "ถือมาแล้ว N วัน" นับจากวันส่งมอบ แล้วยกเลิกรอบทุกครั้ง (4) เปิดจากผลค้นหาในทะเบียนแสดง "k / N" และลิงก์ถัดไปเก็บ `returnTo` เปิดตรงไม่แสดง (5) ปุ่มหลักเป็นปุ่มสุดท้ายของหัวหน้าบนคอม และแถบล่างทุกแท็บบนมือถือมีครบตามลำดับ จากหน้าสแกนคือ "สแกนรายการถัดไป" ปุ่มหลัก แล้ว "การดำเนินการอื่น" · แท็บไฟล์และแท็บซ่อม / PM ของทรัพย์สินที่มีรูปและงานซ่อมผ่านการตรวจ axe ทั้ง 4 โปรเจกต์ · ขั้นที่เปลี่ยนตามหน้าใหม่: ส่งมอบ รับคืน โอนย้าย ยกเลิกรายการ ส่งถึงโต๊ะ ลงทะเบียน License บันทึกซ่อม · ผู้ดูข้อมูลไม่เห็นปุ่มเขียนในทั้ง 5 แท็บ และแถบล่างมีแค่ "การดำเนินการอื่น" กับ "พิมพ์ป้าย" · ผลการรันเขียนภายหลัง ไม่อยู่ใน commit นี้;
  - **deploy:** ไม่ deploy · ไม่มี migration.
- `docs/07_UAT_CHECKLIST.md`, the asset-detail lines of "asset_admin / IT Staff" (each stays a `- [ ]` item):
  - `:44` "From Asset Detail > More actions, cancel …" becomes "From Asset Detail > "อื่น ๆ" (on the phone "การดำเนินการอื่น" in the bottom bar), cancel …"; the rest of the line stays.
  - `:76` becomes: "On Asset Detail, open old links: `#photos` and `#purchase` from reports land on the ไฟล์ tab and on "ข้อมูลทรัพย์สิน"; `?view=custody`, `?view=operations` and `?view=audit` land on the ส่วนควบ tab, the ประวัติ tab, and the ประวัติ tab with the ตรวจนับ chip chosen."
  - `:77` becomes: "On Asset Detail, switch between ภาพรวม, ประวัติ, ส่วนควบ, ไฟล์ and ซ่อม / PM; confirm one tab row, each tab's count with 0 shown (history events, components plus parent, files, active repair records), and that the URL keeps `?view=` and `returnTo` with no `#` anchor. Run checkout, check-in, and transfer once each and confirm a review dialog shows the asset, destination/counterpart, resulting status, and evidence summary before the existing save request is sent."
  - `:78` becomes: "On Asset Detail mobile, confirm the sticky bottom bar on every tab, for every person, holds exactly the primary action (wide), "บันทึกซ่อม" when the repair rule allows it, and "การดำเนินการอื่น", whose bottom sheet lists the "อื่น ๆ" items, each unavailable one with its reason, and ends with "แก้ไข" and "พิมพ์ป้าย"; from the scan page the bar holds "สแกนรายการถัดไป" (wide), the primary, then "การดำเนินการอื่น" ("บันทึกซ่อม" moves into the sheet); a viewer's bar holds only "การดำเนินการอื่น", with "พิมพ์ป้าย"."
  - `:79` becomes: "On Asset Detail at 390px, confirm the first viewport shows the back link, the tag (with "k / N" and the next link when opened from the register), the status badge, the name and the tabs, then the fact strip and the รูป card first. Confirm the icon-only Back action has an accessible name and the bottom bar's items fill it without an empty column."
  - `:80`: "switch all four tabs" becomes "switch all five tabs"; the rest stays.
  - `:81` becomes: "On Asset Detail Overview, confirm the follow-up panel and the data-health checklist are gone and each signal has its place: an open handover is the primary "รับคืน", an open repair the ซ่อม / PM count and the primary "ดูงานซ่อม", the warranty the ประกัน cell, the last count the ตรวจนับล่าสุด cell, a missing photo and missing purchase data their prompts (editors only). Confirm the audit result is a status badge in the round page's words ("พบตรง", "รายการไม่ตรง", "ไม่พบ"), never a raw value such as `pending`."
  - `:82`: "On Asset Detail `การถือครอง`" becomes "On the Asset Detail ส่วนควบ tab", and after "child-component meaning." add "The current card reads "ผู้ถือครอง : …"."; the rest stays.
  - `:83` becomes: "Switch Asset Detail between its five tabs and confirm each loads its own data only. On the ไฟล์ tab, confirm "หลักฐานจากงานอื่น" lists the handover signatures and photos, the component install and remove photos, and the repair, finding and disposal evidence, each linked to its document; the activity and evidence drawers are gone."
  - `:84`: "From Asset Detail `การถือครอง`" becomes "From the Asset Detail ส่วนควบ tab", and "returning goes to the same asset custody tab" becomes "returning goes to the same asset's ส่วนควบ tab (`?view=components`)"; the rest stays.
  - `:103` becomes: "On Asset Detail, confirm the รูป card shows the asset's main photo (the newest image the thumbnail route can render) at card size from the thumbnail route (else the model photo labelled "รูปประจำรุ่น", else "ยังไม่มีรูป รูปช่วยให้หาเจอตอนเดินตรวจนับ"), a click opens the preview of the original, and a missing file shows "โหลดรูปไม่ได้"; for editors only, the card links to the ไฟล์ tab as "อัปโหลดรูป" (on the phone "ถ่ายรูป"). On the ไฟล์ tab, preview, download, and delete of photos and documents (editors, through the confirm) stay available."
  - `:104` becomes: "On Asset Detail, confirm "อื่น ๆ" holds no activity or evidence drawer: the ประวัติ tab is the place for event history and the ไฟล์ tab for files."
- `docs/07_UAT_CHECKLIST.md`: add `## Asset Detail B UAT (<the commit date>)` after "Dashboard B UAT" and before "Sign-Off", with the line "The automated suite covers the asset detail in all four projects (`e2e/asset-detail/`, with the transaction, licence, repair and roles steps). A person still checks:" and these items:
  - The primary action and the top of "อื่น ๆ" equal the register row's next button and the top of its ⋯ (on the phone the ⋯ leads with the primary, as the row has no next button) for one asset of each kind: a Ready personal asset (ส่งมอบ), a Ready asset still held by a legacy custodian (รับคืน), stock (เบิกจากคลัง), shared (ย้ายจุดติดตั้ง), a component (จัดการส่วนควบ), a licence (ผูก License), Pending Repair with and without a repair record (ดูงานซ่อม, บันทึกซ่อม), Pending Disposal with an open request (ดูคำขอตัดจำหน่าย), Pending Disposal without one (no primary; "ขอตัดจำหน่าย" in "อื่น ๆ"), and Lost or Disposed (no primary). The primary never repeats in the list. Each unavailable item reads its reason ("ขอตัดจำหน่าย" the first readiness blocker); each available one opens a form whose save the API accepts (a stock asset in Pending Repair can move; a personal one cannot be handed to a custodian). The pinned "บันทึกซ่อม" shows whenever the repair form could save a record, except when the primary already is "บันทึกซ่อม".
  - With `employee:view`, the custodian's name opens the employee page (no E2E role holds it; without it the name opens the register by custodian); an asset with no custodian reads "ไม่มีผู้ถือครอง"; ที่ตั้ง opens the register with the chip "ที่ตั้ง: …" at every width, whatever view the register remembered; ตรวจนับล่าสุด shows a status badge "พบตรง", "รายการไม่ตรง" or "ไม่พบ" with the date and the round, "รอตรวจในรอบ AUD-…" with the round's code a link, or "ยังไม่เคยตรวจนับ"; ประกัน reads "ถึง …", "หมดแล้วเมื่อ …" or "ไม่ทราบ", and "บันทึกข้อมูลการซื้อ" (editors) lands on the purchase section of the edit form; dates read in the Buddhist era with a short Thai month.
  - Previous / next over a long search (24 results or more, across register pages) and after filters without a search (the crumb reads "ผลการกรอง"); none from the scan page or a direct link.
  - The history of a long-lived asset copied from Production: every type in Thai, the chip counts add up to ทั้งหมด, month rows, "12 เดือนล่าสุด", "แสดงเพิ่ม (เหลือ N รายการ)", and "ส่งออก Excel" opens in Excel with every event and its type.
  - A photo whose file is missing shows "โหลดรูปไม่ได้" and, for an editor, the link "อัปโหลดรูป" ("ถ่ายรูป" on the phone) to the ไฟล์ tab (the suite cannot force a missing file); an asset with no photo of its own shows its model's labelled "รูปประจำรุ่น".
  - As an editor, an asset with a gap (for example no Serial Number, no photo, or a checklist photo still missing) shows the line "ข้อมูลยังไม่ครบ N รายการ:" at the top of ภาพรวม (R59). Each item is a link: the Serial Number opens the edit form at its field, a photo item the ไฟล์ tab, เอกสารจัดซื้อ the files tab's เอกสารจัดซื้อ, and the department or custodian their field. A complete asset shows no line, and a viewer never sees it.
  - The ไฟล์ tab: photos as tiles under their checklist labels, several files in one upload ("อัปโหลด N ไฟล์"), "ถ่ายรูป" on a real phone, a HEIC or SVG file listed as a document, delete of a photo or a document through the confirm (the suite never deletes), เอกสารจัดซื้อ as before, หลักฐานจากงานอื่น linking each file to its document and showing only what the person may view.
  - The ซ่อม / PM tab: the three numbers against the asset's repair records ("ซ่อมมาแล้ว N ครั้ง" leaves out cancelled and PM records and its foot says so; the tab's count holds every active record), the replacement notice at 3 repairs or half the price, the repair number a link only with `maintenance:view`, the asset's PM plans in every state, "ตั้งรอบ PM" only with `maintenance:create` and never on a Disposed or Retired asset.
  - NVDA and VoiceOver: each "อื่น ๆ" item reads its reason; the phone sheet keeps focus inside and returns it to "การดำเนินการอื่น"; the tabs read their counts; the fact strip reads as terms and values.
  - Both themes on a real monitor and phone; the bottom bar clears the home indicator.
  - An English pass of the new messages.
- `docs/06_WORKFLOWS.md`:
  - `:49`: "from Asset Detail's **More actions** menu" becomes "from Asset Detail's **อื่น ๆ** menu (on the phone, **การดำเนินการอื่น** in the bottom bar)".
  - `:56` becomes: "- Asset Detail's ประวัติ tab shows one history of the asset (`AssetMovement` as the spine, audit scans that changed nothing, repair close details merged into the repair events), with type chips and their counts, a period select, 50 rows at a time and an Excel export of every event (6 columns, at most 5,000 rows, in the page's language); the overview shows the latest 3."
  - `:57` becomes: "- Asset Detail's รูป card shows the main photo at card size from the thumbnail route (else the model photo labelled รูปประจำรุ่น); a click opens the preview, and editors get a link to the ไฟล์ tab to add one. The ไฟล์ tab holds the asset's photos and documents, the linked purchase documents (เอกสารจัดซื้อ) and, read-only, the evidence from other work (handover signatures and photos, component install and remove photos, repair, finding and disposal evidence), each linked to its document."
  - `:58`: "Asset Detail relationship map shows" becomes "Asset Detail's ส่วนควบ tab keeps the relationship map, which shows"; the rest stays.
  - `:59` becomes: "- Asset Detail offers one URL-backed tab row: ภาพรวม · ประวัติ · ส่วนควบ · ไฟล์ · ซ่อม / PM (`?view=overview|history|components|files|maintenance`; the old `custody`, `operations` and `audit` open the ส่วนควบ tab, the ประวัติ tab, and the ประวัติ tab with ตรวจนับ chosen). The primary action and the top of "อื่น ๆ" come from the same rule as the register row (`getAssetActions`): an action that cannot run now shows its reason, and an action the person has no permission for is left out. Before checkout, check-in, or transfer saves, the same existing payload is shown in a focused review dialog so the operator can verify the asset, people/location, resulting status, and evidence before confirming."
  - `:60`: "open `การถือครอง` then `จัดการส่วนควบ`" becomes "open the ส่วนควบ tab (`?view=components`) then `จัดการส่วนควบ`", and "It returns to the same asset's custody tab" becomes "It returns to the same asset's ส่วนควบ tab" (Task 7, R22); the rest stays.
- `DEVELOPER_HANDOFF.md`:
  - After the "Page group 1, the dashboard" bullet (`:1198`), one bullet: "Page group 1, the asset detail (<the commit date>, branch `feat/group1-asset-detail`, not deployed, no migration; plan `docs/superpowers/plans/2026-10-26-group1-asset-detail.md`): canvas B; one action rule `getAssetActions` (`src/lib/asset-actions.ts`) gives the register row's next button and ⋯ and the detail's primary and "อื่น ๆ" (labels by ownership type, a primary that can always run now and never repeats in the list, unavailable items with their reasons, transfers only as the API accepts them, nothing a person may not do), and `getAssetRecordRepairAction` the pinned "บันทึกซ่อม"; previous / next from the register's own where (`buildAssetRegisterWhere`, shared with the register) and order with the `id` tie-break (`getAssetNeighbours`), shown only when the raw `returnTo` is a register URL; one history (`getAssetHistory`, `getLatestAssetHistory` and `getAssetHistoryCounts`, `src/lib/asset-history.ts`, with the movement documents read by `src/lib/asset-movement-documents.ts`, which the dashboard shares) for the overview's latest 3, the history tab's chips and `GET /api/assets/[id]/history/export?locale=`; `FactStrip`; ActionBar's more slot; the thumbnail route's `?size=card` and the original route's 404 for a missing file; the register's link-only `locationId` filter; the overview's "ข้อมูลยังไม่ครบ" line for `asset:edit` (`listAssetDataGaps`, R59); tabs `overview | history | components | files | maintenance` with the old view names mapped. E2E: `e2e/asset-detail/`. UAT: `docs/07_UAT_CHECKLIST.md` "Asset Detail B UAT"." Write the real date. Move `> Last updated:` (`:3`) to that date when it is later.
  - `:69`, the timing labels: "Current labels include `dashboard.initial-data` plus Dashboard subgroups `dashboard.kpi-counts`, `dashboard.recent-activity`, `dashboard.urgent-work`, `dashboard.approval-inbox`, `dashboard.cross-scope`, and `dashboard.monthly-trends`" becomes "Current labels include `dashboard.initial-data` plus Dashboard subgroups `dashboard.waiting-work`, `dashboard.recent-activity`, `dashboard.overview`, and `dashboard.waiting-ages`" (the dashboard plan changed them and `docs/08_PRODUCTION_READINESS.md:66` already says so), and "Asset Detail labels `asset-detail.initial-data`, `asset-detail.relationship-data`, `asset-detail.evidence-data`, `asset-detail.operation-data`" names the asset-detail labels `tests/performance-route-instrumentation.test.ts` lists for `assets/[id]/page.tsx` after Task 12, in its order, copied from that test (R24: among them the four tab loaders `asset-detail.history-tab`, `asset-detail.components-tab`, `asset-detail.files-tab` and `asset-detail.maintenance-tab`).
- `docs/08_PRODUCTION_READINESS.md`: unchanged. Its timing line (`:66`) names only the dashboard's labels.
- `docs/14_UI_UX_DESIGN_SYSTEM.md`:
  - `:30` becomes `| Asset Detail | The primary beside "อื่น ๆ", the fact strip, link tabs with counts, one history with type chips, the files and repair tabs | Compact identity, the fact strip and the photo first on the overview, a sticky bottom bar with the primary and "การดำเนินการอื่น" |`.
  - The "Asset Detail and components" registry row: at the end of its second cell add "; canvas B: [\`2026-10-25-page-group-1-dashboard-detail-login-design.md\`](superpowers/specs/2026-10-25-page-group-1-dashboard-detail-login-design.md) §7 (one action rule with the register, the fact strip, the tabs ภาพรวม · ประวัติ · ส่วนควบ · ไฟล์ · ซ่อม / PM, one history, previous / next from the register, the phone's sticky primary)", and at the end of its third cell add "; [\`2026-10-26-group1-asset-detail.md\`](superpowers/plans/2026-10-26-group1-asset-detail.md) rebuilds it as canvas B (page group 1)."

- [ ] **Step 6: Run the source tests**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS, the whole unit suite, including `tests/e2e-asset-detail.test.ts`, the two rewritten pins, and the docs pins (the shell, E2E, V-track, dark-mode, 2D and audit-cancellation entries keep their places; the new changelog entry sits above the dashboard's).

- [ ] **Step 7: Commit**

```bash
git add e2e/asset-detail/detail-words.ts e2e/asset-detail/detail-steps.ts e2e/asset-detail/asset-detail.spec.ts tests/e2e-asset-detail.test.ts e2e/transactions/tx-support.ts e2e/transactions/handover.spec.ts e2e/transactions/return.spec.ts e2e/transactions/transfer.spec.ts e2e/transactions/cancel.spec.ts e2e/transactions/desk-delivery.spec.ts e2e/transactions/register-asset.spec.ts e2e/assets/licence.spec.ts e2e/repair/repair-record.spec.ts e2e/cross-cutting/roles.spec.ts tests/e2e-transactions.test.ts tests/e2e-review.test.ts docs/99_CHANGELOG.md docs/07_UAT_CHECKLIST.md docs/06_WORKFLOWS.md DEVELOPER_HANDOFF.md docs/14_UI_UX_DESIGN_SYSTEM.md
git commit -m "test(e2e): the asset detail steps compare its actions with the register, walk its history, fact strip and previous/next, and the docs record the round (group 1 asset detail task 13)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8 (the controller, not the implementer): the two E2E runs of the plan (R41, the user's decision 2026-10-26)**

Both need the VPN, `scratchpad/stay-awake.ps1` and a clean build. Before each, the controller probes the database (`scratchpad/e2e-plan/tools/select-e2e-counts.cjs`) and runs `rm -rf .next && npm run build`.

The checkpoint, already run after Task 1 (named here so the plan holds both runs): the affected specs only.
Run: `npx playwright test e2e/transactions e2e/assets e2e/smoke` plus the register steps Task 1 names
Expected: every test passes in all four projects (desk-delivery and the phone-only steps skip on the desktop). After Task 1 the detail page is still today's, so the transaction steps this task rewrites still pass there as they were; between Task 7 and this task they are not run.

The final run, after this commit: the WHOLE suite once, which closes page group 1 (spec §11).
Run: `npx playwright test`
Expected: every test passes in all four projects, including `e2e/asset-detail` and every step this task changed.

The E2E result goes into the changelog entry and the handoff bullet, and the AssetSystem wiki is updated, by the controller afterwards on `feat/group1-asset-detail` (as for the login and the dashboard). The controller's look step then checks the register's 120px next-step slot with its long words ("ดูคำขอตัดจำหน่าย", "ย้ายคลัง/ตำแหน่ง", R7).

---

## Appendix: planning rulings R1–R59

The tasks cite these as "R<n>". They were settled while the plan was drafted (2026-10-26) and bind every task. R45-R51 are written into the tasks they change ("Amendment" lines under the task headings).

### The action rule (Task 1) and its consumers

- **R1 Inputs.** `AssetActionInput` drops `legacyReturnEligible` and adds `custodianId: string | null` and `openCheckoutHandoverMode: string | null`. The rule asks `isLegacyReturnEligible` and `getCheckinHandoverStatusError` itself. Task 8 passes the two fields.
- **R2 Keys.** `labelKey` and `reasonKey` are FULL message keys (for example `asset.quickIssueFromStock`, `asset.transactionReasonStatusNotReady`). Every consumer reads them through the root `getTranslations()`. Task 8 deletes `getOwnershipLifecycle` but keeps every message key the rule reads.
- **R3 Shape of the result.**
  - `transactions` never repeat the primary.
  - The register's ⋯ leads with the primary on the phone only, where there is no next-step slot.
  - The primary is always an action that can run now (`AssetPrimaryAction`, enabled, with an href).
  - A legacy-custodian Ready asset's primary is "รับคืน" (the spec order).
  - A Pending Disposal asset with no open request has no primary. "ขอตัดจำหน่าย" sits in "อื่น ๆ".
- **R4 "บันทึกซ่อม".** The pinned button follows Task 1's single rule, `getAssetRecordRepairAction` (any record the repair form can save). It needs `maintenance:create` and is hidden when the primary already is "บันทึกซ่อม". It has no `returnTo`: the repair form accepts only maintenance paths.
- **R5 "ขอตัดจำหน่าย".** Shown with `disposal:create` when `getDisposalAssetEligibilityError` passes and no request is open. When the readiness check would refuse, it shows as unavailable, with the first blocker's existing words (`disposalPage.readinessBlockers.*`). It has no `returnTo`.
- **R6 Words that stay.** `getAssetRegisterTransactionActions` stays until Task 8 deletes it, together with its tests, as Task 1's note 10 lists. `getRowNextAction` goes in Task 1. `asset.transactionReasonPermission` is deleted; a viewer's register rows lose their ⋯.
- **R7 The register's look.** Long next-step words in the register's 120px slot ("ดูคำขอตัดจำหน่าย", "ย้ายคลัง/ตำแหน่ง") are checked in the controller's look step after Task 13.

### Register, location, neighbours (Task 2)

- **R8** Task 2 owns these:
  - `buildAssetRegisterWhere` moves into `asset-list-where-options.ts`, and the register and the neighbours share it.
  - `getAssetNeighbours` reads every id of the list in one ids-only query and returns a **1-based** `index`, with the pure `pickAssetNeighbours`.
  - Previous and next keep `returnTo` unchanged.
- **R9** `locationId` matches the asset's own location only.
  - It is link-only: not in the filter sheet and not saved in the view.
  - Its chip shows at every width.
  - Every link to it (the fact strip's ที่ตั้ง) is built with `buildExactAssetRegisterHref(locale, { locationId })`, so `exact=1` keeps it from the view memory.
- **R10 The middle crumb's words.** `asset.registerCrumbSearch` is th `ผลค้นหา "{search}"` (ASCII quotes) / en `Search results for "{search}"`. `asset.registerCrumbFilters` is "ผลการกรอง" / "Filtered results". A status tab counts as a filter. The middle crumb is text, not a link. Task 8 adds these two keys.

### History (Task 3) and its tab (Task 9)

- **R11 Counts.** Task 3 exports `getAssetHistoryCounts(assetId: string): Promise<{ total: number; counts: Record<AssetHistoryCategory, number> }>`, with the same sources and merge rules as `getAssetHistory`. Task 7's `getAssetDetailCounts` takes `history` from it. Task 7 drops its own `countAssetHistoryEvents` and the assumed builder names. The tab count, the "ทั้งหมด" chip and the overview's "ดูประวัติทั้งหมด N รายการ" are all this `total`.
- **R12 Events.** `AssetHistoryEvent.document.kind` is `AssetMovementDocumentKind`. `getAssetHistory` takes no user; every event carries its href. The page shows a document only with `ASSET_MOVEMENT_DOCUMENT_PERMISSION[kind]`; without it, there is no link and no code (the dashboard's rule).
- **R13 Shared document reader.** Task 3 creates `src/lib/asset-movement-documents.ts`, the shared reader of each movement's document (number, id, kind). It moves the reads out of `src/lib/dashboard-recent.ts`, which then uses it, and `getAssetHistory` uses it too. Task 10 consumes it and drops its own move.
- **R14 The namespace.** One message namespace, `asset.history`: `asset.history.types.*` (the eight chips), `asset.history.columns.*` (the table head) and `asset.history.*` for the tab's own words. Task 9 drops `asset.historyTab`. "ทั้งหมด" is `asset.movementFilters.all`.
- **R15 Export.** Task 3's export route reads `?locale=`. Task 9's `buildAssetHistoryExportHref(locale, assetId)` adds it. The Excel has 6 columns, at most 5,000 rows, and Bangkok times.
- **R16 Task 3's choices that stand:**
  - The chip mapping: registration and register edits count as แก้ไขข้อมูล; bulk moves as โอนย้าย; a component's mirror rows count with the parent's transaction.
  - Purchase documents are not timeline events.
  - A repair done in one save has one event carrying its close details.
  - The audit events rule of note 4.
  - The `movement-labels.ts` lookup export.
- **R17 Task 9's choices that stand:**
  - The type column shows the event's own label.
  - Chips appear only for categories with events, plus the one `?type=` chose. An explicit `?type=` wins over the old `view=audit` mapping.
  - Over 500 events, a Notice appears.
  - The "12 เดือนล่าสุด" rule.
  - The phone has no period and no export.
  - The new `DataTableGroupRow` in `ui/data-table.tsx`, with its DESIGN, docs/14 and design.json lines in Task 9.
  - FX10 and FX11 move as Task 9 drafts (FX10 now pins `buildAssetMovementDocumentHref(` in `src/lib/asset-history.ts`).
  - The phone event card is one link to the event's document when the person may see it, else a plain card.

### Fact strip, ActionBar, views (Tasks 5-7)

- **R18 FactStrip markup.**
  - `FactStrip({ label, items, className })` is a `section aria-label={label}` around the `dl`, with an optional `className`.
  - It renders `data-slot="fact-strip"` on the `dl` and `data-slot="fact"` on each cell, a `div` around its `dt` and `dd`s.
  - It exports `type FactStripItem`.
  - It joins LN2.
  - It goes to one row at `md`. Values are weight 500. It draws the first four items.
- **R19 FactStrip use.** It has no tone prop: the audit result is a `StatusBadge` value, in the round page's words ("พบตรง", "รายการไม่ตรง", "ไม่พบ"). Task 8 hides the strip below `md` on every tab but the overview, through `className="max-md:hidden"`. The label message is `asset.factStripLabel`, "ข้อมูลสำคัญของทรัพย์สิน" / "Key facts" (Task 8).
- **R20 ActionBar's `more`.** `more?: { label: string; code: string; name?: string; groups: readonly RowActionGroup[]; openerRef?: RefObject<HTMLElement | null> }`. `RowActions` gains `triggerVariant`. The bar becomes a flex row when it has `more`.
- **R21 The phone bar holds exactly:**
  - The rule's primary (wide), "บันทึกซ่อม" when pinned, then "การดำเนินการอื่น".
  - "พิมพ์ป้าย" and "แก้ไข" are the last items of the sheet.
  - In the scan-return case: "สแกนรายการถัดไป" (wide), the rule's primary, then "การดำเนินการอื่น". "บันทึกซ่อม" moves into the sheet there.
  - Everyone gets the bar; the viewer's holds only "การดำเนินการอื่น", with "พิมพ์ป้าย".
  - The header's action buttons hide below `md`.
- **R22 Counts and views.**
  - `getAssetDetailCounts` lives in the new server file `src/lib/asset-detail-counts.ts`. The pure `asset-detail-data.ts` keeps the where builders.
  - Tab counts show 0, as the board does. Task 7 changes `AssetDetailTabs` and its pin.
  - Tab links carry no `#anchor`. `buildAssetDetailSectionHref`'s `currentView` may be `null`.
  - The component manager returns to `?view=components` with the detail's own `returnTo`.
  - `resolveAssetDetailView` uses a Map.
- **R23 Section ids.**
  - Task 8 keeps `id="overview"` on "ข้อมูลทรัพย์สิน" and `id="purchase"` on its purchase rows (the reports' warranty link lands there).
  - Task 8 removes `#specs`, `#notes` and `#ownership`, and edits `AssetDetailSectionId` and the section map in the same commit.
  - Task 8 adds `"purchase-documents"`: the interim section on the files tab, which Task 11 keeps.
  - Task 11 keeps `id="photos"` on "รูปและไฟล์แนบ" and drops `"handover"`.
- **R24 Loading per tab.**
  - Task 7's per-view load is interim. Tasks 9-12 each own their tab's loader, with the timing labels `asset-detail.history-tab`, `asset-detail.components-tab`, `asset-detail.files-tab` and `asset-detail.maintenance-tab` (one naming pattern; Task 11's `files-data`/`maintenance-data` become these).
  - The files loader has no cap (the files count is its rows).
  - The repairs tab count counts every active record (the table's rows). The strip's "ซ่อมมาแล้ว N ครั้ง" leaves out cancelled and PM records, and its foot says so.
- **R25 What shows on which tab between tasks.**
  - After Task 7, the overview's "รูปและไฟล์แนบ" sits on the files tab.
  - After Task 8:
    - the history tab shows the old `#movement` and `#audit` until Task 9;
    - the components tab shows `#components` and `#handover` (the handover cards stay until Task 11 removes them);
    - `#ownership` is already gone;
    - the files tab shows "รูปและไฟล์แนบ" plus the interim `#purchase-documents`;
    - the maintenance tab shows today's `#maintenance` until Task 12.
  - Tasks 9-12 remove the leftovers "wherever they now are".

### Photos (Task 4) and their callers

- **R26 `AssetPhotoFrame`.**
  - It gains `previewable?: boolean` (default `true`). When true, the image is the raw `<button>` that opens `AttachmentPreviewDialog`, with an N3 row of count 1 (permanent). Task 11's tiles pass `previewable={false}` inside their own preview button.
  - It gains `className` for size; it fills its parent's box.
  - The upload control is a link to `uploadHref`, only with `canUpload`. The overview's link goes to the files tab, labelled "อัปโหลดรูป" from `md` and "ถ่ายรูป" below it. The camera input lives on the files tab. This is a deviation from §7.5's in-place input; record it in the plan's decisions.
- **R27 Images the thumbnail route can render.**
  - Callers pass only a thumbnailable image (`isThumbnailable`). HEIC and SVG are listed as documents.
  - "รูปหลัก" is the newest thumbnailable `module: "asset"` image, the same rule in Task 8's card and Task 11's tiles.
  - The model photo's caption reuses `asset.modelPhoto`, "รูปประจำรุ่น" (one word for one thing).
- **R28 The allow-list.** Task 4 widens the two thumbnail allow-list entries to accept `/thumbnail` with an optional `?size=card` (still five entries). It updates FX8's pin with the reason. Task 13 does not widen anything.
- **R29 Image counts in `tests/dark-mode-p.test.ts`.** Each task states its own result from the previous task's numbers: Task 4 → 20 images / 16 stages; Task 8 → 18 / 14; Task 11 states its own.

### Words (one word for one thing, spec §5)

- **R30** A department is "แผนก" everywhere. The fact strip's first-cell labels for stock and shared are "แผนกที่ดูแล" and "แผนกที่ใช้", not "หน่วยงาน…".
- **R31** A purchase document is "เอกสารจัดซื้อ", the app's existing word, everywhere: the files tab's section title, the "ข้อมูลทรัพย์สิน" row, Task 13's words. This is a deviation from the spec's "เอกสารการซื้อ"; record it.
- **R32** No custodian reads `asset.noCustodian`, "ไม่มีผู้ถือครอง", in the fact strip and on the map's card.
- **R33** Previous and next are icon links named "รายการก่อนหน้า" and "รายการถัดไป". The back link from the register reads "กลับไปผลค้นหา".

### Overview and page (Task 8)

- **R34** Task 8 is split into 8A (the status correction dialog), 8B (the frame's rules and read) and 8C (the page), as drafted.
- **R35** These Task 8 choices stand:
  - Previous and next sit in the header's button row after the back link; previous hides below `md`.
  - The personal cell's department is the custodian's own.
  - "ถือมาแล้ว 0 วัน" on the handover day.
  - The audit pending state ("รอตรวจในรอบ AUD-…") wins and links the round code.
  - "ข้อมูลทรัพย์สิน" keeps every row in use, including "ประเภทการถือครอง".
  - The "เอกสารจัดซื้อ" row shows whenever a purchase document is linked, even with no other purchase field.
  - "จัดการ" on "อุปกรณ์ส่วนควบ" needs `asset:edit`.
  - The overview DOM order is the phone's.
  - "ใบส่งมอบล่าสุด" is the newest active handover.
  - The licence key does not show in the meta row.
  - The fixed ActionBar is rendered by the header's client part.
- **R36 Deletions.** Task 8 deletes what has no caller left: `ActivityDrawer`, `AssetEvidenceDrawer`, `AssetQrCode`, `AssetComponentContextBanner`, `AssetDetailActionMenu`, `createHealthItem` and `getWarrantyState`. It rewrites their pins, including FX2 (`tests/e2e-fixes.test.ts:35-44`) and the evidence drawer pins Task 11 expects gone.
- **R37 Date formatter.** `formatAssetDetailDate` (Task 8B: short Thai month, Buddhist-era year, Bangkok) is the one date formatter of the fact strip, the overview's latest rows and the history tab (Task 9). Tasks 11 and 12 keep the app's `formatDate` for table dates, and the repair period form.

### Components, files, repair (Tasks 10-12)

- **R38 Task 10's choices that stand:**
  - `AssetComponentsSummary` is deleted; the slot goes into the role chip.
  - The map always renders.
  - The install/remove table reads both sides.
  - The reference link appears only when set.
  - Links carry no `returnTo`.
  - "จัดการส่วนควบ" is an outline button.
- **R39 Task 11's choices that stand:**
  - `AssetPurchaseDocuments` loses `legacyAttachments`, kept as is plus `canEdit` on delete.
  - The model photo leaves the files tab.
  - The photo-type select goes, and checklist tiles take its place.
  - Upload goes through FileQueueList and "อัปโหลด N ไฟล์".
  - Photos can be deleted too.
  - HEIC files are listed as documents.
  - Evidence is filtered by permission, and its links follow note 15.
  - Evidence thumbnails reuse `AssetThumbnail`.
  - Phone document rows keep two icon buttons.
- **R40 Task 12's choices that stand:**
  - Downtime and cost as in notes 23-24.
  - One "อาการ / สิ่งที่ทำ" column.
  - The repair number links only with `maintenance:view`.
  - "ตั้งรอบ PM" is hidden for Disposed and Retired.
  - PM plans show in every state, with no link.
  - Empty states are `EmptyNote`.

### E2E and docs (Task 13), and the run plan

- **R41 The run plan (the user's decision, 2026-10-26).**
  - After Task 1, the controller runs a checkpoint of the affected specs only: `e2e/transactions`, `e2e/assets`, `e2e/smoke`, and the register steps.
  - At the end, the controller runs the WHOLE suite once, which closes page group 1.
  - Task 13's Step "run" names both.
- **R42 Task 13's choices that stand:**
  - Step (3) checks the custodian's fallback link; the employee page is a UAT line, because no E2E role has `employee:view`.
  - Step (3) runs as the IT head with a round due in a week, cancelled in `finally`.
  - `handoverByApi` gains an optional date.
  - The return and repair-record phone steps change.
  - docs/06 lines are updated.
  - The branch is `feat/group1-asset-detail`.
  - The cancel item is matched by its "ยกเลิกรายการ" prefix.
  - The viewer test covers the five tabs, and "จัดการ" is among the controls absent for the viewer (R35).
- **R43** Task 13 adds a four-project axe visit of the files tab and the repair tab, each on a test asset with a photo and a repair.
- **R44** Task 13's words list follows R10, R19, R26, R31, R33 and Task 8's final keys. It must hold "เอกสารจัดซื้อ", not "เอกสารการซื้อ".

### Final amendments

- **R45** The register's view memory does not save while `custodianState` or `locationId` is in the URL (Task 2).
- **R46** Task 9 imports `AssetHistoryCounts` and `ASSET_HISTORY_CATEGORIES` from Task 3.
- **R47** The overview's photo card sizes `AssetPhotoFrame` through `className` (Task 8C).
- **R48** One key for "ถ่ายรูป": `asset.photoFrame.takePhoto` (Task 4); Task 11 reuses it.
- **R49** The history table's event column is headed "รายการ" (`asset.history.columns.event`).
- **R50** `getLatestAssetHistory` (Task 3) serves the overview's latest three; the history is counted once per load.
- **R51** The install/remove table's dates use `formatAssetDetailDate`.

### Cross-check rulings (2026-10-26)

A four-lens cross-check of the assembled plan found 45 points. The tasks carry the fixes. These rulings change behaviour:

- **R52** The history Excel leaves out a document code that the downloader may not open (`ASSET_MOVEMENT_DOCUMENT_PERMISSION`), as the page does (R12) (Task 3).
- **R53** `normalizeAssetComponentManagerReturnTo` also accepts the register path `/<locale>/assets` with its query. So "จัดการส่วนควบ" from a register row comes back to that search (spec §7.1) (Task 1).
- **R54** The fact strip's audit badge takes the round page's item tones: found and confirmed_with_parent are success, not_found is danger, the rest are muted (Task 8B).
- **R55** With no purchase facts, only `asset:edit` sees the "ยังไม่มีข้อมูลการซื้อ" note and "เพิ่มข้อมูล". Others see the purchase rows as `<Nil />` (spec §7.5) (Task 8C).
- **R56** R49 applies to the overview too: its latest-events table heads the event label "รายการ" (`asset.history.columns.event`) (Task 8C).
- **R57** The phone sheet ends with "แก้ไข" and then "พิมพ์ป้าย", in 8B's order. Task 13 asserts that order.
- **R58** The components count is the one tab count without its own list builder. It equals the current components plus `installedInLinks` (Task 7, Global Constraints).

### The user's choice after review (2026-10-26)

- **R59** The data-health panel is not dropped whole. Today's items (P:736-759), with their checks, become one quiet line at the top of ภาพรวม: a `neutral` `Notice`, "ข้อมูลยังไม่ครบ N รายการ:" followed by each missing item as a link to where it is fixed (the edit form at its field, the files tab, or its เอกสารจัดซื้อ). It shows only with `asset:edit` and only while something is missing.
  - Task 8B's `listAssetDataGaps` is the rule.
  - Task 8C draws the line and keeps `asset.primaryAssetPhoto` and `asset.dataHealthChecklistMissing`. It adds three words: `asset.dataGapsTitle`, `dataGapWarranty` and `dataGapLicenseExpiry`.
  - Task 11 keeps the page's checklist read for this line, on the overview only.
  - The reason: a field visit is when a serial or a photo can be added, and the register's data-quality filters serve the desk.
