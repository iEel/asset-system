# Page group 4, plan 4: components and scan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the components page to board AR-Components (header with the parent's facts and a "ติดตั้งส่วนควบ" primary, one table of current and past links, removal from each current row's ⋯ menu with a before/after dialog, Thai role labels, a candidate line that says whether it was installed here before) and the scan page to board AR-Scan-Phone (typed text shows result cards with the matched field, facts, components and next actions; a recent list in the browser).

**Architecture:** Pure libs (`asset-component-roles.ts`, `asset-component-links.ts`, `asset-scan-recent.ts`, `asset-scan-search-rules.ts`) carry the rules; a server loader builds the components table's rows; a new `GET /api/assets/scan-search` copies the asset-operation search pattern (injectable db, ≤ 8 results, the register's batched fact reads for actions). The shared relationship map and `/api/search` are not changed.

**Tech Stack:** Next.js 16 App Router (read `node_modules/next/dist/docs/` before touching routing APIs), React 19, next-intl (Thai first), Prisma 7 on SQL Server, zod 4, `node --test`, Playwright in 4 projects.

**Spec:** `docs/superpowers/specs/2026-11-01-page-group-4-register-form-design.md` (§5, §12, §14, §15 calls 20 and 22, §16.1, §16.2, §17, Appendix A "Components" and "Scan"). Recon with file:line: session scratchpad `g4/recon4/` (`components.md`, `scan.md`, `critic.md`).

## Global Constraints

- Branch `feat/group4-components-scan` from `master` `2ebb4502`. No push. No schema change, no migration, no database command, no build, no dev server, no E2E run in implementer tasks (`npx playwright test --list` is fine).
- Never read `.env*`. Do not touch the untracked paths `.codex/`, `.impeccable/config.json`, `.impeccable/critique/`, `.playwright-mcp/`, `.superpowers/brainstorm/`, `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`.
- Shared parts and tokens only (DESIGN.md): `PageHeader`, `ContentPanel`, `DataTable`, `RowActions`, `KeyValueList`, `StatusBadge`, `Notice`, `AccessibleDialog`, `Field`, `NativeSelect`, `SearchField`/`ScannerTextInput`; no hex/rgba in tsx, no `dark:`, no `/NN` tints, no raw controls. Both themes.
- Rows and results show the name first; pickers keep "code - name" (spec §5); the outstanding line keeps its code-first holder "ค้างคืน · อยู่กับ <code> - <ชื่อ> · RT-…" (`return-components.spec.ts:117`, `:207-209`).
- Words: `docs/19_THAI_GLOSSARY.md` rows before use; messages only through `node scripts/messages-edit.mjs <change file>` (change files in `C:/Users/Eltross/AppData/Local/Temp/claude/D--Antigravity-asset-system/f250ea8d-3040-422b-ad7a-15dd9aed94b9/scratchpad/g4/msg/p4-*.json`); Thai and English; en ICU plural with the raw number, th `{count, number}`.
- Installing does not change the component's holder, room or department (call 20); `src/lib/asset-component-sync.ts` is not touched.
- Every new route: `requirePermission` before any read and parse, an `rbac-route-matrix` entry with its pin; the viewer holds `asset:view`, so the scan route has no refusal row.
- Guards that pin a changed file move in the same task with exact counts (`assets-sweep-ui` `:116-126`, `:185-194`; `form-migration-guards` `:135`, `:175`, `:177`; `validation-guards`; `asset-forms-ui`; `asset-component-manager` tests; `asset-scan-search-tool` tests; recon `critic.md` §4).
- CRLF files keep CRLF. Before each commit: focused tests, `npm test`, `npx tsc --noEmit`, `npm run lint` (0 errors); each commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Stable hooks: the outstanding line text; the scan page's returnTo exactly `/<locale>/asset-management/scan` (the detail page compares with `===`); `scanQueryLabel`; the label page's `scanPlaceholder` (do not change it — the scan page gets its own key).

## Rulings made while planning

- **P4-R1 (E2E and DELETE):** removing a component sends `DELETE /api/assets/<id>/components/<linkId>`, which the E2E suite refuses. The E2E opens ⋯ → ถอดส่วนควบ, checks the dialog and presses **ยกเลิก**; the confirmed removal goes to the UAT checklist and the unit tests. The route stays as it is.
- **P4-R2 (exact tag, spec §14 "as today"):** today only a QR/URL with the asset id opens the asset at once; a typed tag does not (`asset-scan-routing.ts`, pinned). That stays, and in addition **Enter** on typed text whose search has exactly one exact tag or Serial match opens that asset. Typing alone never jumps away.
- **P4-R3 (⋯ placement):** the ⋯ sits on each **current** row of the links table (installed and outstanding), not on the relationship map's cards (the map hides cards past 5 and is shared with the asset page). Editors get "เปิดหน้าทรัพย์สิน" and "ถอดส่วนควบ"; viewers get no ⋯.
- **P4-R4 (role field):** the install form's role becomes a `NativeSelect` of the 8 stored English values (RAM, SSD, HDD, Power Supply, Network Card, Monitor, Adapter, Other) shown with Thai labels; any other stored value (old free text) still shows as stored everywhere.
- **P4-R5 (candidates):** the install candidates read name first (as the purchase-document results), with "<tag> · S/N <serial> · ยังไม่ได้ติดตั้ง" and, when linked to this parent before, "เคยติดตั้งกับเครื่องนี้ · ถอดออก <วันที่>".
- **P4-R6 (words):** the glossary's เครื่อง row is widened to "ส่วนควบของเครื่องนี้" / "เคยติดตั้งกับเครื่องนี้" (this device, not a count); a new row fixes the repair action as **บันทึกซ่อม** (not แจ้งซ่อม; "ใบแจ้งซ่อม" and the record status "แจ้งซ่อม" stay), with a narrow test rule and a key exception for `maintenancePage.statuses.reported`.
- **P4-R7 (scan card):** fields searched and the "ตรงกับ" order: รหัสทรัพย์สิน, Serial, ชื่อ, ผู้ถือครอง (code or name), ที่ตั้ง (code or name), รุ่น. The heading says "พบ n รายการ · ตรงกับ <field>" when every card matched the same field, else "พบ n รายการ" with the field on each card. Actions not available are left out of the card (a phone card), and "เปิดล่าสุด" rows show name and tag only (no status snapshot).
- **P4-R8:** removing an outstanding link replaces its RT- reference (today's route), so that row's document cell loses the RT-; the history keeps it. Accepted.

## Review Focus

1. A parent whose components include an old free-text Thai role ("แรม"): the table and the map show "แรม" as stored, never a blank or an English key (Task 1, Task 3).
2. Removing an **outstanding** link: the dialog reads ค้างคืน → ถอดแล้ว and "n → n รายการ" (outstanding links are not counted), not n−1 (Task 1, Task 3).
3. A scan search for text that matches 30 assets: 8 cards, the heading says "พบ 30 รายการ", the query count stays at 9 reads (Task 4).
4. A viewer on the scan page: cards show no transaction or repair action, only "เปิดรายละเอียดทรัพย์สิน" and พิมพ์ป้าย (Task 4).
5. Browser storage blocked or holding junk under the recent key: the scan page renders, "เปิดล่าสุด" is empty and never throws (Task 1).

---

### Task 1: Words and pure rules

**Files:**
- Create: `src/lib/asset-component-roles.ts`, `src/lib/asset-component-links.ts`, `src/lib/asset-scan-recent.ts`
- Modify: `docs/19_THAI_GLOSSARY.md` (P4-R6 rows), `tests/thai-glossary.test.ts` (the narrow บันทึกซ่อม rule and its key exception)
- Test: `tests/asset-component-roles.test.ts`, `tests/asset-component-links.test.ts`, `tests/asset-scan-recent.test.ts`

**Interfaces:**
- Produces:
  - `COMPONENT_ROLE_VALUES = ["RAM","SSD","HDD","Power Supply","Network Card","Monitor","Adapter","Other"] as const`; `componentRoleLabelKey(stored: string): string | null` → `"componentRoles.ram"` … `"componentRoles.other"` for an exact stored value, `null` otherwise (the caller shows the stored text).
  - `componentCountAfterRemoval(link: { status: "installed" | "outstanding" }, installedCount: number): number`; `lastRemovalByComponent(rows: Array<{ componentAssetId: string; removedAt: Date | null }>): Map<string, Date>` (latest per component).
  - `assetScanRecentKey(userId: string, locale: string): string` = `asset-scan-recent:v1:<userId>:<locale>`; `readAssetScanRecent(storage: Pick<Storage,"getItem"> | null, key): Array<{ id: string; assetTag: string; name: string }>` (≤ 10, drops junk, never throws); `addAssetScanRecent(list, item): list` (newest first, unique by id, ≤ 10); `writeAssetScanRecent(storage, key, list): void` (try/catch).

- [ ] **Step 1: Write the failing tests**: role keys for each of the 8 values; "แรม" → null (Review Focus 1); count after removal installed 2 → 1, outstanding 2 → 2 (Review Focus 2); last removal picks the latest date per component; recent: invalid JSON, a non-array, 15 items, a storage whose `getItem` throws → a valid list ≤ 10 (Review Focus 5); add moves an existing id to the front.
- [ ] **Step 2: Run** `npx tsx --test tests/asset-component-roles.test.ts tests/asset-component-links.test.ts tests/asset-scan-recent.test.ts` — FAIL.
- [ ] **Step 3: Implement** (relative `./x.ts` imports only); glossary rows; the narrow test rule.
- [ ] **Step 4: Run** focused, `npm test`, `npx tsc --noEmit`, `npm run lint`.
- [ ] **Step 5: Commit** `feat(components,scan): role labels, the count after a removal, the last removal per component, the scan's recent list; glossary rows (group 4 plan 4)`

### Task 2: Components data: the candidates' last removal and the page's rows

**Files:**
- Modify: `src/app/api/assets/component-candidates/route.ts` (adds `lastRemovalHere`), `src/app/[locale]/(dashboard)/assets/[id]/components/page.tsx` (header facts, rows)
- Create: `src/lib/asset-component-manager-data.ts` (server loader)
- Test: `tests/component-outstanding-paths.test.ts` (fake db, the new field), `tests/asset-component-manager-data.test.ts` (new)

**Interfaces:**
- Consumes: Task 1 `lastRemovalByComponent`, `componentRoleLabelKey`.
- Produces:
  - Candidates answer rows `{ id, assetTag, name, serialNumber, lastRemovalHere: { removedAt: string } | null }` (one extra read of ≤ 20 ids; select `removedAt` only).
  - `type ComponentLinkRow = { id; componentAsset: { id; assetTag; name; serialNumber: string | null }; role: string /* stored */; slotNo: string | null; state: "installed" | "outstanding" | "removed"; installedOn: string; installedBy: string | null; removedOn: string | null; removedBy: string | null; reason: string | null; document: { code: string; href: string } | null; evidenceCount: number; outstandingLine: string | null }`; `loadComponentManagerRows(db, { parentAssetId, locale, can }): Promise<{ rows: ComponentLinkRow[]; installedCount: number; outstandingCount: number; removedCount: number }>` — dates formatted on the server (Buddhist calendar, Asia/Bangkok, as the asset page), user names through `assetHistoryActorLabel` (fallback the stored value), the document only with its permission (R12), photo counts from the attachments, the outstanding line from `formatOutstandingComponentLine` (unchanged), current rows first, past rows newest first, at most 100 links as today.
  - The page passes `header: { name; assetTag; holder: RegisterHolderLine; room: string | null }` (reuse `getRegisterHolderLine`).

- [ ] **Step 1: Write the failing tests**: candidates answer `lastRemovalHere` for a component removed from this parent and `null` for one removed elsewhere; the loader builds an installed, an outstanding (with its line) and a removed row with names, counts and a document only when allowed.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement**; keep the pinned reads the tests name (recon `components.md` §12).
- [ ] **Step 4: Run** focused, `npm test`, `npx tsc --noEmit`, `npm run lint`.
- [ ] **Step 5: Commit** `feat(components): the candidates say when they were last removed from this parent; the components page's rows with names, documents and photo counts (group 4 plan 4)`

### Task 3: The components page

**Files:**
- Modify: `src/components/assets/asset-component-manager.tsx` (header actions, collapsed install panel, role select, candidate lines, install footer count, the table with ⋯ on current rows, the remove dialog), `page.tsx`
- Modify E2E helpers only if the install steps' ids or names change (`e2e/transactions/tx-support.ts` `installComponentByApi` is API-only)
- Test: `tests/asset-component-manager.test.ts`, `tests/assets-sweep-ui.test.ts`, `tests/asset-forms-ui.test.ts`, the guards (exact counts)

**Interfaces:**
- Consumes: Tasks 1-2.

- [ ] **Step 1: Write the failing tests** (source and pure): the header shows the parent's name, tag, "ผู้ถือครอง <holder> · <room>" and, for `asset:edit`, the primary `asset.componentInstallAction` "ติดตั้งส่วนควบ" that opens the install panel (closed on arrival) and moves focus into it; the panel title `asset.componentInstallPanelStep` "ติดตั้งส่วนควบ ขั้น {step, number} จาก {total, number}"; the role is a `NativeSelect` of the 8 values with Thai labels (P4-R4); a candidate reads name first with `asset.componentCandidateNotInstalled` "ยังไม่ได้ติดตั้ง" and `asset.componentCandidateRemovedHere` "เคยติดตั้งกับเครื่องนี้ · ถอดออก {date}"; the details step's footer `asset.componentCountAfterInstall` "หลังบันทึก: ส่วนควบของเครื่องนี้ {from, number} → {to, number} รายการ"; the table (desktop `DataTable`, phone rows) with columns ส่วนควบ · บทบาท · ช่อง · ติดตั้ง · ถอด · เหตุผล · หลักฐาน, the count line `asset.componentHistoryCount` "{total, number} รายการ · ติดตั้งอยู่ {installed, number} · ถอดแล้ว {removed, number}", "ติดตั้งอยู่" in the ถอด cell of a current row, `<Nil />` for empty cells, the outstanding line in an outstanding row; `RowActions` only on current rows and only for editors (P4-R3) with "เปิดหน้าทรัพย์สิน" and the destructive "ถอดส่วนควบ"; the remove dialog shows "ตอนนี้ | หลังยืนยัน" with "สถานะส่วนควบ: ติดตั้งกับทรัพย์สินหลัก → ถอดแล้ว" (or ค้างคืน → ถอดแล้ว) and "ส่วนควบของเครื่องนี้: {n} → {m} รายการ" from `componentCountAfterRemoval`, the reason (label เหตุผล, the old text as placeholder) and the photo, ยกเลิก and ยืนยันถอดส่วนควบ; focus returns to the ⋯ trigger.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** with the relationship map left as it is (rendered at the top with the parent links the page loads); keep the dialog's pinned ids and footer markup or update the pins exactly; the progressive reveal of past rows stays.
- [ ] **Step 4: Run** focused, `npm test`, `npx tsc --noEmit`, `npm run lint`, `npx playwright test --list`.
- [ ] **Step 5: Commit** `feat(components): the header's install button, one table of current and past links, removal from each current row's menu with a before/after dialog, Thai role labels (group 4 plan 4)`

### Task 4: The scan search route

**Files:**
- Create: `src/lib/asset-scan-search-rules.ts` (client-safe), `src/lib/asset-scan-search.ts` (reads, injectable db), `src/app/api/assets/scan-search/route.ts`
- Modify: `src/lib/rbac-route-matrix.ts`, `tests/rbac-route-matrix.test.ts`
- Test: `tests/asset-scan-search.test.ts`, `tests/asset-scan-search-route.test.ts` (the `asset-operation-search*` tests are the model)

**Interfaces:**
- Produces:
  - `assetScanSearchLimit = 8`, `assetScanSearchPath = "/api/assets/scan-search"`, `parseAssetScanSearch(params): { q: string; locale: "th" | "en" } | { error: "Invalid search" }` (2-100 code points, ≤ 5 words, reusing the asset-operation rules), `buildAssetScanSearchHref`.
  - `type AssetScanMatchField = "tag" | "serial" | "name" | "holder" | "room" | "model"`; `getAssetScanMatch(asset, q, words): { field: AssetScanMatchField; text: string }` (whole `q` first, in P4-R7 order, else the first word's field).
  - `type AssetScanRow = { id; assetTag; name; serialNumber: string | null; href: string; status: { name; label }; condition: { name; label }; holder: RegisterHolderLine; room: { name: string; branchName: string | null } | null; components: { count: number; names: string[] /* ≤ 3 */ }; match: { field; text }; exact: boolean; actions: AssetActionSet; recordRepair: AssetAction | null; printLabelHref: string }`; answer `{ total: number; rows: AssetScanRow[] }`.
  - `searchAssetScan(db, input, can): Promise<…>`: active assets; exact tier (tag or Serial equals `q`), prefix, contains; ≤ 8; `total = count(text)`; facts in one batch (open checkout, open repair, open disposal, outstanding link, installed components) — 4 + 5 reads, no read per row (Review Focus 3); actions from `getAssetActions` (with returnTo `/<locale>/asset-management/scan` and `can` from the user's permissions) plus `getAssetRecordRepairAction`, unavailable actions dropped (P4-R7, Review Focus 4).
  - Route: `requireAuth`, `requirePermission(user, "asset", "view")` before the parse; `{ data }`; `withPerformanceTiming("asset-scan-search", …)`.

- [ ] **Step 1: Write the failing tests**: parse; the match field order (a Serial hit on "SN-77" → serial; a holder name hit → holder); ranking exact > prefix > contains, ≤ 8, total from the count; the fake db records exactly 9 calls for 8 rows; a viewer's `can` gives no transaction and no repair action; route 401/403 before any read, 400 on a 1-character `q`, `{ data }`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement**; `/api/search` stays as it is (call 22).
- [ ] **Step 4: Run** focused, `npm test`, `npx tsc --noEmit`, `npm run lint`.
- [ ] **Step 5: Commit** `feat(scan): GET /api/assets/scan-search with the matched field, the facts and the next actions, at most 8 (group 4 plan 4)`

### Task 5: The scan page

**Files:**
- Modify: `src/components/assets/asset-scan-search-tool.tsx`, `src/app/[locale]/(dashboard)/asset-management/scan/page.tsx` (passes the user id), messages (the scan's own placeholder `assetTools.scanPagePlaceholder` "รหัสทรัพย์สิน, Serial หรือชื่อ", the hint `assetTools.scanHint` "ป้าย QR ยังติดไม่ครบ พิมพ์รหัสบางส่วน, Serial ใต้เครื่อง หรือชื่อแทนได้", the heading, the field words, `assetTools.scanRecent` "เปิดล่าสุด", `assetTools.scanRecentClear` "ล้างรายการ", the action group label "ทำต่อกับทรัพย์สินนี้")
- Test: `tests/asset-scan-search-tool.test.ts`, `tests/assets-sweep-ui.test.ts` (`:185-194`), the guards

**Interfaces:**
- Consumes: Task 1 recent helpers, Task 4 route and types.

- [ ] **Step 1: Write the failing tests**: a QR/URL with an asset id still opens at once (the routing lib unchanged); typed text ≥ 2 characters fetches the scan route (debounced, aborted on change), no fetch on mount; Enter with exactly one `exact` row opens it (P4-R2); the heading "พบ {count} รายการ · ตรงกับ {field}" or per-card fields (P4-R7); a card shows the name, the tag and Serial with the matched words marked (`splitSearchHighlightWords`, the token mark of the operation picker), status and condition badges, "ผู้ถือครอง <name> · <แผนก>", "<room> · <branch>", "ส่วนควบ {count} รายการ · a, b", the link "เปิดรายละเอียดทรัพย์สิน" (with the exact returnTo) and the action links (links, not buttons); opening a card adds it to "เปิดล่าสุด" (≤ 10, per user and locale), "ล้างรายการ" empties it; the hint line under the field; the label page's `scanPlaceholder` untouched.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement**.
- [ ] **Step 4: Run** focused, `npm test`, `npx tsc --noEmit`, `npm run lint`, `npx playwright test --list`.
- [ ] **Step 5: Commit** `feat(scan): result cards with the matched field, facts, components and next actions; Enter opens a single exact match; a recent list (group 4 plan 4)`

### Task 6: E2E and docs

**Files:**
- Create: `e2e/assets/register-components.spec.ts`, `e2e/assets/scan-search.spec.ts`; words in `e2e/assets/register-words.ts` (pinned in `tests/e2e-register.test.ts`); `CreateAssetOptions` gains `serialNumber?` in `e2e/transactions/tx-support.ts` (additive; update its pin)
- Docs: `docs/04_AUTH_RBAC.md` (the scan route), `docs/06_WORKFLOWS.md`, `docs/07_UAT_CHECKLIST.md` (the confirmed removal, P4-R1; Enter on an exact match; the recent list), `docs/14_UI_UX_DESIGN_SYSTEM.md`, `DESIGN.md`, `docs/99_CHANGELOG.md` (`## 2026-11-02` block for plan 4, E2E placeholders), `DEVELOPER_HANDOFF.md` (placeholders)

- [ ] **Step 1: Write the specs** (itStaff): **components, all four projects**: a parent and a component by API; open `/th/assets/<parent>/components`; the header; "ติดตั้งส่วนควบ" opens the panel; search the component, pick it (name first, "ยังไม่ได้ติดตั้ง"), choose a role, review, save; the table's current row with the Thai role and "ติดตั้งอยู่"; ⋯ → ถอดส่วนควบ opens the dialog with "ติดตั้งกับทรัพย์สินหลัก → ถอดแล้ว" and "1 → 0 รายการ"; record it; **ยกเลิก** (never confirm, P4-R1); the row is still installed. **scan, all four projects**: a held asset with a run-unique Serial and an installed component by API; type part of the Serial → one card, "ตรงกับ Serial", the facts, the components line, the action links; open it, go back, "เปิดล่าสุด" lists it, "ล้างรายการ" empties it; Enter on the full tag opens the asset. Record each new state.
- [ ] **Step 2: Run** `npx playwright test --list` on both, `npx tsx --test tests/e2e-register.test.ts tests/e2e-transactions.test.ts`.
- [ ] **Step 3: Write the docs**; E2E results as placeholders.
- [ ] **Step 4: Run** `npm test`, `npx tsc --noEmit`, `npm run lint`.
- [ ] **Step 5: Commit** `test(components,scan): E2E for installing a component and the removal dialog, and for a typed scan card; docs (group 4 plan 4)`

**After Task 6 (controller):** build, then the targeted E2E set on dev, 4 projects: `register-components`, `scan-search`, `return-components`, `asset-detail`, `bulk-move`, `roles`; the look step (components with the panel open and the dialog, scan with cards and the recent list) at 1440, 1024 and 390 in both themes; the final whole-branch review.
