# Page group 4, plan 1: the asset register Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the asset register (`/[locale]/assets`) to board AR-Register / AR-Register-Phone so a person's machines can be found and told apart without opening a row, and make the register's bulk update a data correction that follows the department rule.

**Architecture:** The list keeps its server page and its query module; the rows gain the department, the branch and the open handover's due date; one merged "ทรัพย์สิน" column replaces the tag and name columns. A new `statusGroup=other` list parameter drives the "สถานะอื่น" tab. Saved views are a pure client module over localStorage. `POST /api/assets/bulk-update` adopts bulk-move's refusal, claim and retry shape plus the transfer department rule, and writes new correction movement types that plan 2 (the edit page) reuses.

**Tech Stack:** Next.js 16 App Router (read `node_modules/next/dist/docs/` before touching routing APIs), React 19, next-intl (Thai first), Prisma 7 on SQL Server, zod 4, `node --test` with source and module-swap tests, Playwright in 4 projects.

**Spec:** `docs/superpowers/specs/2026-11-01-page-group-4-register-form-design.md` (§2 decisions 1-3 and 11, §5, §6, §15 calls 1-7 and 23, §17, Appendix A "Register"). Recon with file:line: session scratchpad `g4/recon/register.md` and `g4/recon/critic.md`.

## Global Constraints

- Branch `feat/group4-register` from `master` `476188e0`. No push. No schema change, no migration, no database command, no build, no dev server in implementer tasks.
- Never read `.env*`. Do not touch the untracked paths `.codex/`, `.impeccable/config.json`, `.impeccable/critique/`, `.playwright-mcp/`, `.superpowers/brainstorm/`, `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`.
- Shared parts and tokens only (DESIGN.md): no hex/rgba in tsx, no `dark:`, no `/NN` tints. Both themes.
- Pickers keep "code - name" labels (spec §5, call 1); rows show the name first.
- Words follow `docs/19_THAI_GLOSSARY.md`; messages change only through `node scripts/messages-edit.mjs <change file>`, change files in `C:/Users/Eltross/AppData/Local/Temp/claude/D--Antigravity-asset-system/f250ea8d-3040-422b-ad7a-15dd9aed94b9/scratchpad/g4/msg/`. Thai and English for every key.
- CRLF files keep CRLF (never `sed -i` one); no stray blank lines.
- Every guard that pins a changed file (`tests/list-frame-guards.test.ts`, `tests/visual-foundation-guards.test.ts`, `tests/form-migration-guards.test.ts`, the sweep tests) is updated in the same task with exact counts.
- Before each commit: the focused tests, `npm test`, `npx tsc --noEmit`, `npm run lint` (0 errors). Each commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Stable E2E hooks stay unless a task names the change: `[data-asset-status-tabs]`, `[data-asset-mobile-list]`, `[data-asset-mobile-row]`, `[data-asset-desktop-table]`, `[data-asset-register-summary]`, the row ⋯ name "การดำเนินการของ {assetTag}", the checkbox `aria-label={assetTag}`, `#asset-bulk-location`, `#asset-bulk-custodian`, `#asset-bulk-reason`.

## Rulings made while planning

- **P1-R1 (spec §6.6 said "the transfer verdict"):** the bulk update is a correction (decision 11), so it refuses what bulk-move refuses (an id no longer active, an outstanding component, License, an open handover, a status that cannot take the change) and **not** the transfer's condition block: correcting who holds a broken asset must stay possible. The status code for a holder change on a status that cannot take one is worded "asset.transactionReasonStatusNotTransferable", for a room change "asset.transactionReasonWrittenOff".
- **P1-R2:** `statusGroup=other` is "status name not in the five tab names" (`assetRegisterStatusTabs`), resolved in `buildAssetWhere` with no status lookup. When `statusId` is also set, `statusId` wins and `statusGroup` is dropped by the parser.
- **P1-R3:** column widths: `asset` 280 (the flexible one), `currentLocation` 180, `custodian` 200; the operations preset is 44 + 280 + 180 + 200 + 132 + 96 + 172 = 1,104 px, under the 1,117 px a 1440 screen leaves.
- **P1-R4:** a stored column list with `assetTag` or `name` maps to `asset` (once, in place of the first of them); it is not reset to all.
- **P1-R5:** the bulk update's batch reference is `crypto.randomUUID()`, shared by the asset movements and the component syncs of one save; the `referenceType` stays `"bulk_update"`.
- **P1-R6:** the new movement types `register_location_correction`, `register_custodian_correction`, `register_department_correction` are added to `ASSET_MOVEMENT_LABELLED_TYPES` here (52 types), labelled "แก้ไขข้อมูลที่ตั้ง", "แก้ไขข้อมูลผู้ถือครอง", "แก้ไขข้อมูลแผนก", counted under the history chip "แก้ไขข้อมูล". `bulk_location_update` and `bulk_custodian_update` keep their labels for old rows but are no longer written.

## Review Focus

1. A column set stored before this plan (`["assetTag","name","currentLocation","custodian","status","condition"]` in `asset-register-columns:v1`) opens as the operations preset with the merged column, not as "all" (Task 2 test).
2. A bulk update giving one holder to a held บุคคล asset and a ส่วนกลาง asset: the บุคคล one takes the holder's department and a department correction row; the ส่วนกลาง one keeps its department and gets none (Task 7 test).
3. A room-only bulk update of a held บุคคล asset whose department differs from its holder's: the department becomes the holder's, with a department correction row (Task 7 test).
4. A saved-views value that is not JSON, not an array, or holds 15 views, or a view whose query has unknown keys: the row shows at most 12 valid views and never throws (Task 6 test).
5. A dashboard link `?statusId=<Pending Disposal id>&exact=1`: the สถานะอื่น tab is current and the list shows only that status (Task 1 test).

---

### Task 1: The "สถานะอื่น" tab, `statusGroup=other` and the sum line

**Files:**
- Modify: `src/lib/asset-list-query.ts` (params, parse, where, status-count where, query string)
- Modify: `src/lib/asset-register-status-tabs.ts`
- Modify: `src/lib/asset-register-view-memory.ts:1-18` (persist `statusGroup`)
- Modify: `src/app/[locale]/(dashboard)/assets/page.tsx:242-254, 375-384` (the tab and the sum line)
- Modify: `src/components/assets/asset-register-status-tabs.tsx` (sum line under the tabs)
- Test: `tests/asset-list-query.test.ts`, `tests/asset-register-view-model.test.ts`, `tests/asset-register-view-memory.test.ts`

**Interfaces:**
- Produces: `AssetListParams.statusGroup?: string`; parsed `statusGroup: "" | "other"`; `buildStatusTabs(...)` returns tabs including `{ key: "other", statusId: "", count, active }` and `otherBreakdown: Array<{ statusId: string; nameTh: string; count: number }>` (other statuses, count desc); `buildStatusSumLine(tabs, otherBreakdown): { terms: number[]; total: number; other: { count: number; top: Array<{ label: string; count: number }>; rest: number } }` (top 3 named, the rest summed).
- `AssetRegisterStatusTab["key"]` gains `"other"`; the tab's href carries `statusGroup=other` and no `statusId`.

- [ ] **Step 1: Write the failing tests**
  - `parseAssetListParams({ statusGroup: "other" }).statusGroup === "other"`; any other value → `""`; with `statusId: "s1", statusGroup: "other"` → `statusGroup === ""`.
  - `buildAssetWhere(parse({ statusGroup: "other" }))` contains `status: { name: { notIn: ["Ready","In Use","Checked Out","Pending Repair","Under Maintenance"] } }`; `buildAssetStatusCountWhere` drops it; `buildAssetQueryString` writes `statusGroup=other`.
  - `buildStatusTabs` with counts Ready 126, In Use 611, Checked Out 27, Pending Repair 6, Under Maintenance 9, Pending Disposal 21, Under Inspection 18, Missing 11, Retired 7, Lost 6 → other tab count 63, `otherBreakdown[0]` is Pending Disposal 21; `active` true for `statusGroup: "other"` and for `statusId` = the Pending Disposal id (Review Focus 5).
  - `buildStatusSumLine` → `terms [126,611,27,6,9,63]`, `total 842`, `other.top` 21/18/11, `other.rest 13`.
  - `getPersistedAssetRegisterView(new URLSearchParams("statusGroup=other"))` keeps it.
- [ ] **Step 2: Run** `node --test tests/asset-list-query.test.ts tests/asset-register-view-model.test.ts tests/asset-register-view-memory.test.ts` — expect FAIL on the new cases.
- [ ] **Step 3: Implement** the parameter through parse/where/count/query string (P1-R2), the other tab and breakdown in `buildStatusTabs` (keep `otherStatusActive`; tests assert it), `buildStatusSumLine`, the view-memory key, and the page: the tab labelled `asset.quickFilterOther` "สถานะอื่น" / "Other statuses", and under the tabs one `text-meta text-muted-foreground num` line keyed `asset.statusSumLine` "{terms} = {total} · สถานะอื่น {other} = {breakdown}" (terms joined " + "; breakdown "<nameTh> <n> + … + อื่น ๆ <rest>", "อื่น ๆ" only when rest > 0; numbers through `formatCount`). The export route reads `buildAssetWhere`, so it follows with no change — add one assertion that `src/app/api/assets/export/route.ts` still builds its where from `parseAssetListParams` + `buildAssetRegisterWhere` or `buildAssetWhere`.
- [ ] **Step 4: Run** the focused tests, then `npm test`, `npx tsc --noEmit`, `npm run lint`.
- [ ] **Step 5: Commit** `feat(register): a สถานะอื่น tab (statusGroup=other) and a sum line under the status tabs (group 4 plan 1)`

### Task 2: Rows: one ทรัพย์สิน column, holder with department, room with branch, the due date

**Files:**
- Modify: `src/lib/asset-register-columns.ts`
- Modify: `src/app/[locale]/(dashboard)/assets/page.tsx:66-92, 188-192, 311-350`
- Modify: `src/components/assets/asset-register-table.tsx:62-77, 600-711`
- Create: `src/lib/asset-register-row-rules.ts` (pure)
- Test: `tests/asset-register-columns.test.ts` (create), `tests/asset-register-row-rules.test.ts` (create), `tests/asset-register-table-ui.test.ts`, `tests/asset-register-view-model.test.ts:177-191`, `tests/asset-register-ux.test.ts`

**Interfaces:**
- Produces: `assetRegisterColumnOrder` = `["asset","category","companyBranch","currentLocation","custodian","ownershipType","status","condition","purchasePrice"]`; presets `operations: ["asset","currentLocation","custodian","status","condition"]`, `accounting: ["asset","companyBranch","category","purchasePrice","status"]`, `audit: ["asset","category","currentLocation","custodian","status","condition"]`; `normalizeAssetRegisterColumns` maps `assetTag`/`name` → `asset` (P1-R4); widths per P1-R3.
- Produces in `asset-register-row-rules.ts`: `needsConditionAttention(conditionValue: string): boolean` (moved from `asset-register-mobile-list.tsx` `needsFieldAttention`'s condition part: fair, poor, damaged, non functional, salvage) and `getRegisterHolderLine(input: { ownership: AssetOwnershipType; custodian: { name: string; departmentName: string | null } | null }): { kind: "holder"; name: string; department: string | null } | { kind: "shared" } | { kind: "none" }`.
- `AssetRegisterRow` gains `location: { name: string; branchName: string }`, `holder: ReturnType<typeof getRegisterHolderLine>`, `dueDate: string | null` (Bangkok date, Buddhist year in Thai, from the open checkout's `expectedReturnDate` when `handoverMode` is the temporary loan). `currentLocation` and `custodian` strings stay for the CSV export.

- [ ] **Step 1: Write the failing tests**
  - columns: stored `["assetTag","name","currentLocation","custodian","status","condition"]` → `["asset","currentLocation","custodian","status","condition"]` and `assetRegisterColumnsMatchPreset(..., operations)` true (Review Focus 1); `getAssetRegisterTableMinWidth(operations) === 1104`.
  - row rules: `needsConditionAttention("Damaged")` true, `("Good")` false; holder line: shared with no custodian → `{kind:"shared"}`, personal with none → `{kind:"none"}`, with custodian → name and department.
  - table source: the merged header labelled `labels.asset` ("ทรัพย์สิน"); the name cell uses `line-clamp-2` with `title`, then `<span className="tag ...">{asset.assetTag}</span>` under it; no `assetRegisterStickyFirstColumnClasses` left in the file; condition renders `StatusBadge` only when `needsConditionAttention`, else plain text; the custodian cell renders the department line and "ส่วนกลาง · ไม่มีผู้ถือครอง" (`asset.holderShared`) / `t("noCustodian")`; the due line `asset.registerDueDate` "คืน {date}".
- [ ] **Step 2: Run** the focused tests — FAIL.
- [ ] **Step 3: Implement.** The page selects `custodian.department.name`, `currentLocation.branch.name` (location's branch; fall back to the asset's branch name when the location has none) and the open checkout's `expectedReturnDate`. The sort on `assetTag` and `name` moves to the merged header (sort by `name`). Keep `aria-label={asset.assetTag}` on the checkbox and the row link label.
- [ ] **Step 4: Run** focused tests, `npm test`, `tsc`, `lint`; update the pins in `tests/asset-register-table-ui.test.ts` (:70, :82, :108, :119) and the presets in `asset-register-view-model.test.ts`/`asset-register-ux.test.ts` to the new keys, naming each changed pin in the report.
- [ ] **Step 5: Commit** `feat(register): one ทรัพย์สิน column with the full name, the holder with the department, the room with the branch and the due date (group 4 plan 1)`

### Task 3: The phone card and the phone lines

**Files:**
- Modify: `src/components/assets/asset-register-mobile-list.tsx`
- Modify: `src/app/[locale]/(dashboard)/assets/page.tsx` (the summary line and the end line props)
- Modify: `src/components/assets/asset-register-table.tsx` (pass the lines to the mobile list)
- Test: `tests/asset-register-table-ui.test.ts:149, 197, 284`

**Interfaces:**
- Consumes: `AssetRegisterRow.holder`, `needsConditionAttention` (Task 2).

- [ ] **Step 1: Write the failing tests** (source pins): in `MobileAssetRow` the `Link` wraps the **name** (`text-sm font-semibold`), then a line with the tag (`tag`), the status `StatusBadge` and the condition badge when `needsConditionAttention`; then one line "<holder name | asset.holderSharedShort "ส่วนกลาง" | asset.noCustodian> · <location.name>"; `needsFieldAttention` no longer exists in the file. The list renders `asset.registerMobileSummary` "{tab} {count} รายการ" above and `asset.registerMobileEnd` "แสดงครบ {shown} จาก {total} รายการ" after the last card only on the last page. `MobileSelectableRow` shows the name first too.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** The status tabs stay `TabNav` links (spec §6.7, call 7).
- [ ] **Step 4: Run** focused tests, `npm test`, `tsc`, `lint`.
- [ ] **Step 5: Commit** `feat(register): the phone card leads with the name and shows the holder and the room (group 4 plan 1)`

### Task 4: Header "ส่งออก / นำเข้า", no import panel, column-set label, search words, page size

**Files:**
- Modify: `src/app/[locale]/(dashboard)/assets/page.tsx:352-365, 459-503`
- Modify: `src/components/assets/asset-register-export-menu.tsx`, `asset-register-column-picker.tsx`, `asset-register-search-field.tsx:90`, `asset-register-table.tsx:512-523, 733-747`
- Test: `tests/asset-register-table-ui.test.ts`, `tests/e2e-fixes.test.ts:77-81`, `tests/asset-register-ux.test.ts:160-194, 280-284`, `tests/phase2d-final-ui.test.ts`, `tests/assets-sweep-ui.test.ts:211-212`

**Interfaces:**
- Produces: `AssetRegisterExportMenu({ exportHref, exportCount, templateHref, importHref })`: trigger "ส่งออก / นำเข้า" (`asset.exportImportMenu`); items ส่งออกตามตัวกรอง ({count} รายการ) (`asset.exportFilteredCount`), ดาวน์โหลดแม่แบบ, นำเข้าจาก Excel (`asset.importFromExcel`, a link to `/{locale}/asset-management/import-export`); template and import only when given (asset:create).

- [ ] **Step 1: Write the failing tests:** the page header's `actions` hold the export menu and the create link "เพิ่มทรัพย์สิน" (`asset.createAsset`); `AssetImportPreviewPanel` is not imported by `assets/page.tsx` (update `tests/e2e-fixes.test.ts:77-81` to assert its absence and its presence on `asset-management/import-export/page.tsx`); the table bar no longer renders `AssetRegisterExportMenu`; the column picker trigger reads `asset.columnSetLabel` "ชุดคอลัมน์: {preset}" (the preset's name, or "กำหนดเอง" `asset.columnSetCustom` when no preset matches); the search placeholder key `asset.searchPlaceholderFields` "ค้นหา รหัส · ชื่อ · Serial · ผู้ถือครอง · ที่ตั้ง"; `Pagination` receives `pageSizes={[10, 25, 50, 100]}`, `pageSize`, and the page-size hrefs; the filter sheet keeps its page size.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** The count is the register's `total`. Remove the import panel's labels block from the page.
- [ ] **Step 4: Run** focused tests, `npm test`, `tsc`, `lint`; `e2e/cross-cutting/support/refusals.ts:110` ("เปิดตัวช่วยนำเข้า" on the register) moves to the import-export page in Task 8.
- [ ] **Step 5: Commit** `feat(register): ส่งออก / นำเข้า in the header, the import panel off the register, the column-set label and the page size in the footer (group 4 plan 1)`

### Task 5: The selection bar

**Files:**
- Modify: `src/components/assets/asset-register-table.tsx:525-556`
- Modify: `DESIGN.md` (§1 and §4 rows that call this bar "phase 3", lines ~206, ~370)
- Test: `tests/asset-register-table-ui.test.ts:177-218, 273`, `tests/visual-foundation-guards.test.ts:266, 463, 123-124`, `tests/form-migration-guards.test.ts:126, 169, 516`

- [ ] **Step 1: Write the failing tests:** on md and up the register renders `DesktopSelectionBar` with `countLabel` = `asset.selectedOnPage` "{count} รายการที่เลือกในหน้านี้", `clearLabel` ล้างรายการที่เลือก, `actions` = a `DropdownMenu` "อื่น ๆ" (`asset.moreActions`) holding อัปเดตที่ตั้ง/ผู้ถือครอง (only `permissions.canEdit`) and ส่งออกรายการที่เลือก, then the primary `Button` "พิมพ์ป้าย {count} รายการ" (`asset.printLabelsCount`); the phone keeps the floating bar (`md:hidden`, same buttons as today); the `data-asset-bulk-bar` hook stays on the phone bar and `data-asset-selection-bar` marks the desktop one. The R2 shadow exemption and the GL1 rows for this bar are removed (exact counts).
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement**, and rewrite the DESIGN.md lines that promised this bar for phase 3 into the rule as built.
- [ ] **Step 4: Run** focused tests, `npm test`, `tsc`, `lint`.
- [ ] **Step 5: Commit** `feat(register): the sticky selection bar with พิมพ์ป้าย and อื่น ๆ (group 4 plan 1)`

### Task 6: Saved views

**Files:**
- Create: `src/lib/asset-register-saved-views.ts` (pure, client-safe)
- Create: `src/components/assets/asset-register-saved-views.tsx` (client)
- Modify: `src/app/[locale]/(dashboard)/assets/page.tsx` (mount under the toolbar), `src/components/assets/asset-register-toolbar.tsx` (phone button)
- Modify: `docs/19_THAI_GLOSSARY.md` (row: มุมมองที่บันทึกไว้)
- Test: `tests/asset-register-saved-views.test.ts` (create), `tests/asset-register-saved-views-ui.test.ts` (create)

**Interfaces:**
- Produces: `assetRegisterSavedViewsKey(locale: string, userId: string): string` → `asset-register-saved-views:v1:<userId>:<locale>`; `type AssetRegisterSavedView = { id: string; name: string; query: string }`; `readSavedViews(raw: string | null): AssetRegisterSavedView[]` (drops invalid entries, unknown query keys removed through `parseAssetListParams` + `buildAssetQueryString` without `page`, names trimmed 1-40 chars, at most `assetRegisterSavedViewsMax = 12`); `addSavedView(views, name, query): { views; error: null | "nameRequired" | "nameTaken" | "full" }`; `renameSavedView`, `deleteSavedView`.

- [ ] **Step 1: Write the failing tests:** Review Focus 4 (not JSON, not array, 15 entries → 12, unknown keys dropped, `locationId` kept, `page` dropped); a duplicate name (case-insensitive, trimmed) → `nameTaken`; a 13th → `full`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** Desktop row under the toolbar: label "มุมมองที่บันทึกไว้:" (`asset.savedViews`), each view a link to `/{locale}/assets?<query>`, the current one (query equal to the page's view query) `aria-current="page"`, each with a ⋯ menu (เปลี่ยนชื่อ, ลบ) and "+ บันทึกมุมมองนี้" (`asset.saveView`) opening an `AccessibleDialog` with one name `Field`. Phone: a "มุมมองที่บันทึกไว้" button beside the filter button opening a `DropdownMenu` of the views (no save on the phone, call 4). The user id comes from the page's session user. Every localStorage access in try/catch.
- [ ] **Step 4: Run** focused tests, `npm test`, `tsc`, `lint`.
- [ ] **Step 5: Commit** `feat(register): named saved views kept in the browser (group 4 plan 1)`

### Task 7: The bulk update is a correction that follows the department rule

**Files:**
- Modify: `src/app/api/assets/bulk-update/route.ts`
- Modify: `src/lib/validations/asset-operations.ts:105-120` (`assetIds` `.max(bulkMoveMaxAssets)`)
- Create: `src/lib/bulk-update-blocked.ts` (codes, order, reason key)
- Modify: `src/lib/asset-movement-labels.ts`, `src/lib/asset-history-rules.ts`, `src/app/[locale]/(dashboard)/disposal/[id]/page.tsx:444-448` (if it lists types)
- Modify: `src/components/assets/asset-register-table.tsx:749-809` (the dialog)
- Modify: `docs/19_THAI_GLOSSARY.md` (row: แก้ไขข้อมูล… = correction, vs เปลี่ยน… = a real move)
- Test: `tests/asset-bulk-update-route.test.ts` (create, module-swap like `tests/checkin-outstanding-components-route.test.ts:94-103`), `tests/asset-bulk-custody-routes.test.ts:172`, `tests/asset-component-sync-routes.test.ts:11-58`, `tests/asset-movement-labels.test.ts:35, 82`, `tests/asset-history-rules.test.ts:57, 194`

**Interfaces:**
- Consumes: `getTransferNextDepartmentId` (`src/lib/asset-department-rule.ts`), `readOutstandingComponentLinks`, `assertNoOutstandingComponentLinks`, `getAssetOperationOwnershipRefusal`, `getBulkCustodyChangeError`, `withDeadlockRetry`, `syncInstalledComponentsWithParent`.
- Produces (plan 2 reuses): movement types `register_location_correction`, `register_custodian_correction`, `register_department_correction` with labels (P1-R6); `bulkUpdateBlockedReasonKey(code: string, changesCustodian: boolean): string | null`.

- [ ] **Step 1: Write the failing route tests:**
  - Review Focus 2 and 3 (department per ownership; room-only on a held บุคคล asset corrects the department; a ส่วนกลาง asset never gets a department row).
  - movements: `register_location_correction` / `register_custodian_correction` / `register_department_correction`, `reason` = input reason, all with one `referenceId` (a UUID, P1-R5) and `referenceType: "bulk_update"`; no `bulk_*_update`, no `department_change`.
  - refusals: one 409 `{ code, error, blocked: [{assetId, assetTag, code}] }` naming every refused asset in order ASSET_NOT_ACTIVE, ASSET_COMPONENT_OUTSTANDING, ASSET_LICENSE_MOVE_NOT_ALLOWED, ASSET_ACTIVE_CHECKOUT_EXISTS, ASSET_STATUS_TRANSFER_NOT_ALLOWED; a เสียหาย asset given a holder is **not** refused (P1-R1).
  - 101 ids → 400 under `assetIds`; an inactive employee → 409 with `fieldErrors: { toCustodianId: ... }` read inside the transaction; an inactive room → `fieldErrors: { toLocationId: "checkoutLocationInactive" }`.
  - status: a holder sets "In Use" only on บุคคล and Stock; a ส่วนกลาง asset keeps its status.
  - claims in id order with `currentLocationId` and `custodianId` in the where; a claim that misses → `ASSET_CHANGED_DURING_OPERATION`; the transaction runs through `withDeadlockRetry` with `{ maxWait: 10_000, timeout: 60_000 }`.
- [ ] **Step 2: Run** `node --test tests/asset-bulk-update-route.test.ts` — FAIL.
- [ ] **Step 3: Implement** the route on bulk-move's shape (read before, one 409, room check before and inside, claims, in-transaction re-reads of outstanding links and open handovers, the employee read with `departmentId` inside the transaction, the department per asset via `getTransferNextDepartmentId` with the current holder's department read for room-only saves, component sync with the new department in `changes`, system logs). Labels: `asset.movementTypes.register_*` th/en; history counts them under the edit chip (`asset-history-rules.ts:44-71` default holds; add a test). The 49 → 52 assert. Dialog: when the chosen holder's department differs for any selected บุคคล/Stock row, a `Notice` line "แผนกจะเปลี่ยนตามผู้ถือครอง: {department} ({count} รายการ)" (`asset.bulkDepartmentFollows`); the title becomes "แก้ไขข้อมูลหลายรายการ" (`asset.bulkCorrectionTitle`) and the reason label "เหตุผลที่แก้" (`asset.correctionReason`); a 409 with `blocked` shows the named list under the form with `bulkUpdateBlockedReasonKey`, and a "นำรายการเหล่านี้ออกจากที่เลือก" button unticks them.
- [ ] **Step 4: Run** focused tests, `npm test`, `tsc`, `lint`.
- [ ] **Step 5: Commit** `fix(bulk-update): a register bulk update is a data correction: it follows the department rule, names every refused asset and writes correction history (group 4 plan 1, decisions 3 and 11)`

### Task 8: E2E and docs

**Files:**
- Create: `e2e/assets/register-find.spec.ts`, `e2e/assets/register-bulk-correction.spec.ts`
- Modify: `e2e/dashboard/dashboard.spec.ts:216-232`, `e2e/asset-detail/detail-steps.ts:63-77, 150-160`, `e2e/asset-detail/asset-detail.spec.ts:45-55`, `e2e/cross-cutting/support/refusals.ts:110`, `e2e/shell/shell.spec.ts:216, 248-255` (only where the change breaks them), the matching `tests/e2e-*.test.ts` pins
- Modify: `docs/06_WORKFLOWS.md` (register and bulk update), `docs/07_UAT_CHECKLIST.md` (a group 4 plan 1 section), `docs/14_*` component rows if they list the register parts, `docs/99_CHANGELOG.md` (a "### กลุ่มหน้า 4 แผน 1: หน้าทะเบียนทรัพย์สิน" block under a new `## 2026-11-0x` heading), `DEVELOPER_HANDOFF.md` (one bullet)

- [ ] **Step 1: Write the specs** (dev DB only; create their own assets through the existing helpers; no master-data change):
  - register-find (desktop and phone): give two run assets to one run employee, search the employee's name, assert both rows show the full name, the tag under it, the holder with the run department, then open one; on the phone assert the card's holder line.
  - the สถานะอื่น tab: a run asset moved to an other status through the existing helpers is listed under it, and the sum line is visible.
  - register-bulk-correction (desktop projects): select a run บุคคล asset and a run ส่วนกลาง asset, correct the holder with a reason, then read both assets back: the บุคคล department is the holder's, the ส่วนกลาง department unchanged; the asset history shows "แก้ไขข้อมูลผู้ถือครอง".
  - saved views (desktop): save "E2E <run>" and reopen it from the row.
- [ ] **Step 2:** Update the broken locators listed above; the viewer refusal list has no new route.
- [ ] **Step 3:** Docs as listed, Thai words per the glossary.
- [ ] **Step 4: Run** `npm test`, `tsc`, `lint` (the controller runs the build and the targeted E2E after this task).
- [ ] **Step 5: Commit** `test(e2e): the register finds a person's assets, the สถานะอื่น tab, the bulk correction and saved views; docs (group 4 plan 1)`
