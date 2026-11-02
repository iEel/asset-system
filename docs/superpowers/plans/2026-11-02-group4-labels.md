# Page group 4, plan 6: labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the labels page to board AR-Labels:
- a queue with mode options, including "ต้องพิมพ์ใหม่", and filter chips;
- an honest "เพิ่มทั้งหมด" with its counts;
- the queue scrolls with the page;
- a numbered print list;
- tape, note and a label-by-label preview on this page;
- a print bar.

The register's "พิมพ์ป้าย N รายการ" opens this page, not the print route.

**Architecture:**
- **The queue API** gains a total, the matching ids up to 100, paging (`skip`), a lookup by ids and the "ต้องพิมพ์ใหม่" mode. Its handler moves into a lib file with an injectable db.
- **A shared label part** sizes itself in mm, so the labels page and the print route draw the same label. One server loader gives both the templates and the resolved QR base.
- **The print route** still records exactly one print per click. It takes tape and note from the URL's hash.

**Tech Stack:** Next.js 16 App Router (read `node_modules/next/dist/docs/` before touching routing APIs), React 19, next-intl (Thai first), Prisma 7 on SQL Server, qrcode.react, zod 4, `node --test`, Playwright in 4 projects.

**Spec:** `docs/superpowers/specs/2026-11-01-page-group-4-register-form-design.md`, sections §5, §6.5, §7.2, §10, §11, §15 calls 9 and 19, §17 and Appendix A "Labels" (the 100-id cap, the test print, the print record and the print route).

**Board:** session scratchpad `artifact-files/182f6683-…/project/AR-Labels.dc.html` (PNG `g4/recon6/AR-Labels.png`).

**Recon with file:line:** session scratchpad `g4/recon6/` (`page.md`, `server.md`, `tests.md`, `critic.md`). The scratchpad is `C:/Users/Eltross/AppData/Local/Temp/claude/D--Antigravity-asset-system/f250ea8d-3040-422b-ad7a-15dd9aed94b9/scratchpad/`.

## Global Constraints

- **Branch and repo:**
  - Branch `feat/group4-labels` from `master` `1f2a2cbd`. No push.
  - No schema change, no migration and no database command.
  - Implementer tasks run no build, no dev server and no E2E. `npx playwright test --list` is fine.
- **Files to leave alone:**
  - Never read `.env*`.
  - Do not touch the untracked paths `.codex/`, `.impeccable/config.json`, `.impeccable/critique/`, `.playwright-mcp/`, `.superpowers/brainstorm/` and `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`.
- **Parts and tokens:**
  - Use only shared parts and tokens (DESIGN.md): `PageHeader`, `ContentPanel`, `Segmented`, `NativeSelect`, `DesktopSelectionBar`, `StatusBadge`, `Notice`, `EmptyNote`, `SearchField`, `Field`, `Textarea`/`Input`, `DropdownMenu`, `Popover`.
  - No hex or rgba in tsx, no `dark:`, no `/NN` tints and no raw controls. Both themes.
  - The label preview and the print sheet stay light. The label itself is black on white.
- **Names first:** rows show the name first, then "tag · holder or ส่วนกลาง · room". Pickers keep "code - name" (spec §5).
- **Words:**
  - Add glossary rows to `docs/19_THAI_GLOSSARY.md` before a word is used: ดวง, ต้องพิมพ์ใหม่, อยู่ในรายการพิมพ์, ป้ายเดิม.
  - Change messages only through `node scripts/messages-edit.mjs <change file>`. Change files go in `<scratchpad>/g4/msg/p6-*.json`.
  - Give every message in Thai and English. In en, plurals use ICU plural with the raw number. In th, use `{count, number}`.
- **QR:** stays `/q/a/<assetId>` (`src/lib/asset-qr.ts`). The board's `/a/<tag>` is not used.
- **Permission:** listing the queue and recording a print stay `asset:view` (call 19). Every route calls `requirePermission` before any read or parse, and has an `rbac-route-matrix` row with its pin.
- **Guards:** a guard that pins a changed file moves in the same task, with exact counts. The list is in recon `critic.md` and `tests.md` §1.
- **Commits:**
  - CRLF files keep CRLF.
  - Before each commit, run the focused tests, `npm test`, `npx tsc --noEmit` and `npm run lint` (0 errors).
  - Each commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Stable hooks:**
  - `data-label-queue-row="<assetId>"` on each queue row.
  - `data-label-selected-row="<assetId>"` on each selected row.
  - `data-label-mode="unprinted|printed|recent|reprint"` on the mode options.
  - The add-all button's name follows P6-R3.
  - The print button's name is "พิมพ์ป้าย {count} ดวง".
  - The test print's name is "พิมพ์ทดสอบ 1 ดวง".

## Rulings made while planning

- **P6-R1 (the register's พิมพ์ป้าย, spec §6.5):**
  - The register opens the labels page in the same tab: `/<locale>/asset-management/labels?assetIds=<id,id,…>&from=register`.
  - The line "<n> รายการนี้มาจากที่เลือกในทะเบียนทรัพย์สิน" shows only with `from=register`.
  - The page keeps the incoming order and drops duplicates.
- **P6-R2 (the 100 cap everywhere):**
  - The print route takes at most the first 100 ids.
  - The print list refuses adds past 100 from every source (search, a row, add-all, the incoming ids) and says so in the list's status line.
- **P6-R3 (the add-all number is what will be added, spec §4 anti-goal):**
  - The line reads "ตรงตัวกรอง {a} · อยู่ในรายการพิมพ์แล้ว {b} · จะเพิ่มใหม่ {c}".
  - The button reads:
    - "เพิ่มทั้งหมด {c} รายการ" when b = 0;
    - "เพิ่ม {c} รายการ" when some are already in the list;
    - "เพิ่ม 100 รายการแรก" with "เหลืออีก {a − 100} รายการ" when a > 100;
    - when the list's room (100 − list size) cuts c, the line says so.
  - The add-all ids come from the queue's matching ids (≤ 100, queue order).
- **P6-R4 (filter chips):**
  - `FilterChipList` only renders remove links, so it does not fit. A new shared client part `src/components/ui/filter-menu-chip.tsx` takes its place: a chip trigger plus `DropdownMenu` radio items. The room chip opens a `Popover` with a search box.
  - The chips are บริษัท, สาขา, ที่ตั้ง, หมวดหมู่, สร้างเมื่อ (with the date range inside it) and เรียงคิว.
  - The closed chip shows "<ชื่อตัวกรอง>: <ชื่อ>". Options read "code - name".
  - Avoid the local names `FilterSelect`, `LabeledSelect` and `Filter(` (`tests/list-frame-guards.test.ts:43`).
- **P6-R5 (modes):**
  - Four modes: ยังไม่เคยพิมพ์ · เคยพิมพ์แล้ว · ทั้งหมดล่าสุด · ต้องพิมพ์ใหม่.
  - Desktop (md and up) uses `Segmented`. Below md it uses `NativeSelect` (four Thai options do not fit 343 px).
- **P6-R6 (ต้องพิมพ์ใหม่):**
  - Candidates are the active assets that have a print and an `asset_tag_change` movement.
  - The latest print's `assetTag` is compared with today's tag in code using `!==`, so a change of case counts too.
  - The matches become `id: { in }` in the normal where, capped at 2,000. The page says when the cap is reached.
  - A row shows "ป้ายเดิม <old tag>".
  - Tag changes made before plan 2 have no movement and are not found. That only affects dev; Production prints nothing before this deploy.
- **P6-R7 (paging):** "แสดง {n} จาก {total}" and "แสดงอีก 10 รายการ" use `skip` and append, dropping duplicates by id. Each GET is still at most 100 rows. Every sort ends on `assetTag`, so the order is total.
- **P6-R8 (test print):**
  - It prints the label shown in the preview, as a batch of 1, and records it as today (Appendix A).
  - When the note is empty, the note sent is "พิมพ์ทดสอบ", so the history can tell it apart.
  - That asset leaves "ยังไม่เคยพิมพ์".
- **P6-R9 (tape and note to the print route):**
  - Ids stay in the query, because the server needs them.
  - Tape and note go in the hash (`#tape=18&note=…`). The hash never reaches the server, does not count toward Nginx's request line and stays out of the logs.
  - The print route fills its tape and note from the hash. It neither prints nor records by itself (a reload would record twice).
  - The note is at most 500 characters.
- **P6-R10 (the bar):**
  - From md, `DesktopSelectionBar` is the last child of the page and spans both columns. It shows "{n} ดวงที่จะพิมพ์ · เทป {size}" and the two actions. Its clear button reads "ล้างรายการพิมพ์".
  - The bar shows only when the list has at least one label. With an empty list, the right card says why nothing can print.
  - Below md, the two actions sit inline at the end of the print-list card. There is no fixed bar on the phone (GL1, R2).
- **P6-R11 (row data for every source):**
  - The queue GET returns `rows`, `total` and `ids` (≤ 100, queue order).
  - `?ids=<id,…>` (≤ 100) returns the same row shape for given ids. It serves search adds and the incoming ids, so every row knows its real print state, company and branch codes, ownership and latest printed tag.
- **P6-R12 (search words):**
  - The search gets its own key `assetTools.labelSearchPlaceholder` = "รหัสทรัพย์สิน ชื่อ Serial ผู้ถือครอง หรือที่ตั้ง".
  - `scanPlaceholder` loses its last reader and is removed (spec §10).
- **P6-R13 (a stale page):** after a print in the other tab, the page fetches the queue and the list's print states again when it becomes visible (`visibilitychange`).
- **P6-R14 (cleanup):** `scripts/cleanup-test-data.mjs` deletes the assets' label print rows, then the batches left with no items, before the assets. Otherwise E2E prints block the cleanup through the foreign key.

## Review Focus

1. **An asset re-tagged twice after its last print.** "ต้องพิมพ์ใหม่" lists it once and shows the tag that was printed (Task 1).
2. **Add-all when the list already holds 95 labels and the filter matches 30, 10 of them already listed.** The button adds 5. The line says the list is full. The list ends at 100 (Task 4).
3. **The register sends 100 ids with duplicates.** The page shows each asset once, in the register's order, with the from-register line (Task 5).
4. **A Thai note of 500 characters with 100 ids.** The print URL's query holds only the ids (well under 8 KB). The print route shows the note from the hash (Task 2, Task 5).
5. **A reload of the print route.** It records nothing until the print button is pressed again (Task 2).

---

### Task 1: The queue API

**Files:**
- Create: `src/lib/asset-label-queue.ts`. The handler logic with an injectable db: `listLabelPrintQueue(db, user, params)` and `lookupLabelPrintRows(db, ids)`.
- Modify:
  - `src/lib/asset-label-print-tracking.ts`: mode `reprint`, `skip`, `id: { in }`, and a widened where type.
  - `src/app/api/assets/label-prints/route.ts`: GET calls the lib. POST is unchanged except for using the shared where/limits.
  - `src/lib/rbac-route-matrix.ts`: the `assets/label-prints` row with `asset:view`.
- Test:
  - `tests/asset-label-print-tracking.test.ts`.
  - New `tests/asset-label-queue.test.ts`.
  - `tests/rbac-route-matrix.test.ts`.

**Interfaces:**
- Produces:
  - `type LabelQueueRow = { id, assetTag, name, ownershipType, holder: { code, name } | null, location: { code, name } | null, company: { code, name }, branch: { code, name }, category: { code, name }, lastPrint: { printedAt: string, assetTag: string } | null }`.
  - The GET answer is `{ rows: LabelQueueRow[], total: number, ids: string[], reprintCapped?: boolean }`. `ids` is at most 100, in queue order.
  - The params are `mode`, the 6 filters, `sort`, `pageSize` (1–100) and `skip` (≥ 0). `ids` (≤ 100) switches to the lookup, which returns `{ rows }` in the given order.
  - `LABEL_REPRINT_CANDIDATE_CAP = 2000`.

- [ ] **Step 1: Write the failing tests.**
  - Permission comes before any read.
  - `total` counts all matches. `ids` holds the first 100 in order.
  - `skip: 10` returns rows 11–20.
  - `reprint` with:
    - an asset printed as "A-1" and now "A-2" → included, with `lastPrint.assetTag: "A-1"`;
    - a case-only change "a-1" → "A-1" → included;
    - an asset re-tagged twice → once (Review Focus 1);
    - an asset never printed → excluded.
  - 2,001 candidates → `reprintCapped: true`.
  - The lookup drops unknown and inactive ids, keeps the given order, and refuses more than 100 with 400.
- [ ] **Step 2: Run** `npx tsx --test tests/asset-label-queue.test.ts tests/asset-label-print-tracking.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Use Prisma only. The reprint candidates are `labelPrints: { some: {} }` with `movements: { some: { movementType: "asset_tag_change" } }`, then the latest print per candidate.
- [ ] **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit` and `npm run lint`.
- [ ] **Step 5: Commit** `feat(labels): the queue answers its total, the matching ids, paging, a lookup by ids and the ต้องพิมพ์ใหม่ mode (group 4 plan 6)`

### Task 2: The shared label part, the settings loader and the print route

**Files:**
- Create:
  - `src/components/assets/asset-label-sheet.tsx`. `AssetLabelItem` sizes itself with inline mm from its template; the QR has `title` = the tag. It also has `AssetLabelPreview`, one label scaled inside a light frame.
  - `src/lib/asset-label-print-settings.ts`, server-only. `loadAssetLabelPrintSettings(): Promise<{ templates, defaultTapeSize, qrBaseUrl }>` holds the reads the print route has today.
- Modify:
  - `src/components/assets/asset-label-print.tsx`. It uses the sheet. It reads tape and note from `location.hash`. The global `@page` rule stays here only.
  - `src/app/[locale]/(print)/assets/labels/page.tsx`. It uses the loader, slices to 100 (P6-R2), and its back link goes to the labels page.
  - `src/app/[locale]/(print)/assets/[id]/label/page.tsx`, which uses the loader.
- Test:
  - `tests/asset-label-print-ui.test.ts`: the hash prefill, no auto-record on load (Review Focus 5), the cap and the QR title.
  - The guard rows that move with these files, with exact counts: `tests/dark-mode-p.test.ts:102-130`, `tests/visual-foundation-guards.test.ts`, `tests/list-frame-guards.test.ts:142` and `tests/form-migration-guards.test.ts`.

- [ ] **Step 1: Write the failing tests.** **Step 2: Run** them. Expected: FAIL. **Step 3: Implement** P6-R9. **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit` and `npm run lint`. **Step 5: Commit** `feat(labels): one self-sized label part for the page and the print route, one settings loader, tape and note from the hash, at most 100 labels (group 4 plan 6)`

### Task 3: Words and the filter chip

**Files:**
- Modify:
  - `docs/19_THAI_GLOSSARY.md`.
  - Messages through `scripts/messages-edit.mjs`. Add every new string of P6-R1..R13 and the board's names: "คิวป้าย {count} รายการ", "ตัวกรองคิวป้าย", "ตัวอย่างป้ายเทป {size} ของ {tag}", "ดวงก่อนหน้า", "ดวงถัดไป", "ดวงที่ {i} จาก {n}", "อยู่ในรายการพิมพ์แล้ว: {name}" and "ป้ายเดิม {tag}". Add only new keys; rewording or removing old keys happens in the task that drops their last reader.
- Create: `src/components/ui/filter-menu-chip.tsx` (P6-R4). Add it to the shared-part lists the guards read.
- Test:
  - `tests/thai-glossary.test.ts`.
  - `tests/i18n-plural-count.test.ts`.
  - New `tests/filter-menu-chip.test.ts`: the trigger text, radio items, the search filter in the room chip, keyboard and accessible names.

- [ ] **Step 1: Write the failing tests.** **Step 2: Run** them. Expected: FAIL. **Step 3: Implement.** **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit` and `npm run lint`. **Step 5: Commit** `feat(labels): words for the labels page and a filter chip with a menu (group 4 plan 6)`

### Task 4: The search and the queue

**Files:**
- Modify:
  - `src/components/assets/asset-label-batch-tool.tsx`. If it grows past about 600 lines, split it into `asset-label-queue.tsx` and `asset-label-print-list.tsx`, keeping the tool as the shell.
  - `src/lib/asset-label-queue-rules.ts` (new, pure): `addAllCounts({ matchIds, selectedIds, room }) → { a, b, c, capped, left }` and `labelButtonKey(...)`.
- Scope:
  - The search with its own placeholder (P6-R12). Its rows come through the lookup, so they show their real state.
  - The mode options (P6-R5) and the chips (P6-R4), with "ล้างตัวกรอง" in the head.
  - The add-all box (P6-R3).
  - Rows (name, then "tag · holder or ส่วนกลาง · room", the badge, + / ✓ and the board's names), with "ป้ายเดิม" in the reprint mode.
  - The page scroll, "แสดง n จาก total" and "แสดงอีก 10 รายการ" (P6-R7).
- Test:
  - New `tests/asset-label-queue-rules.test.ts` (Review Focus 2).
  - The pins in `tests/assets-sweep-ui.test.ts:192-217`, `tests/v-track-final.test.ts:61-77`, `tests/v-track2-a.test.ts:339-341`, `tests/list-frame-guards.test.ts:163, 170`, `tests/visual-foundation-guards.test.ts:373`, `tests/form-migration-guards.test.ts:177`, `tests/status-name-api.test.ts:15-20`, `tests/asset-scan-search-tool.test.ts:60-62` and `tests/asset-label-print-ui.test.ts`, with exact counts.

- [ ] **Step 1: Write the failing tests.** **Step 2: Run** them. Expected: FAIL. **Step 3: Implement.** **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit` and `npm run lint`. **Step 5: Commit** `feat(labels): search with real print states, mode options, filter chips, an honest add-all and a queue that pages with the page (group 4 plan 6)`

### Task 5: The print list, settings, preview and the bar

**Files:**
- Modify:
  - The tool, or its print-list part.
  - `src/app/[locale]/(dashboard)/asset-management/labels/page.tsx`. It loads the settings through Task 2's loader, keeps the incoming order without duplicates, and reads `from=register`.
- Scope:
  - The numbered rows with remove, the "{n} ดวง" badge and the order select in the head.
  - The from-register line (P6-R1) and the 100-cap status line (P6-R2).
  - The settings card: tape as `Segmented` from the templates, and the note (≤ 500 characters).
  - The preview, one label at a time with ‹ › and "ดวงที่ i จาก n", using Task 2's `AssetLabelPreview` with the QR from `buildAssetQrValue(qrBaseUrl, id)`.
  - The Brother hint and "QR ที่จะพิมพ์".
  - The bar (P6-R10).
  - Print opens the print route in a new tab: ids in the query, tape and note in the hash (P6-R9). Test print follows P6-R8.
  - The refetch on visibility (P6-R13).
- Test:
  - `tests/asset-label-print-ui.test.ts`: the print URL has ≤ 100 ids in the query and no note in the query (Review Focus 4); the incoming ids are deduped and kept in order (Review Focus 3); the test print sends the shown label and "พิมพ์ทดสอบ".
  - `tests/v-track-final.test.ts:67-74`, `tests/validation-guards.test.ts`, `tests/form-migration-guards.test.ts` (GF5 for the note), `tests/dark-mode-p.test.ts` and `tests/desktop-selection-bar.test.ts`, with exact counts.

- [ ] **Step 1: Write the failing tests.** **Step 2: Run** them. Expected: FAIL. **Step 3: Implement.** **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit` and `npm run lint`. **Step 5: Commit** `feat(labels): a numbered print list, tape, note and a label-by-label preview on the page, and the print bar (group 4 plan 6)`

### Task 6: The register link and the cleanup script

**Files:**
- Modify:
  - `src/components/assets/asset-register-table.tsx:428-434` (P6-R1): a `Link` or `router.push` in the same tab.
  - `scripts/cleanup-test-data.mjs` (P6-R14).
- Test:
  - `tests/asset-register-table-ui.test.ts:289-315` (the new URL).
  - `tests/cleanup-test-data.test.mjs`: a printed asset is cleaned, and its batch goes when it has no item left.

- [ ] **Step 1: Write the failing tests.** **Step 2: Run** them. Expected: FAIL. **Step 3: Implement.** **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit` and `npm run lint`. **Step 5: Commit** `feat(labels): the register's พิมพ์ป้าย opens the labels page; the test-data cleanup removes label prints first (group 4 plan 6)`

### Task 7: E2E

**Files:**
- Create:
  - `e2e/assets/labels.spec.ts`.
  - `e2e/assets/labels-words.ts`, pinned to `messages/th.json`.
- Modify:
  - `e2e/assets/register-bulk-correction.spec.ts:48-53`: the bar now opens the labels page with the from-register line.
  - The pin in `tests/e2e-register.test.ts`.
- **What the spec does (IT staff, each project):**
  - Create 3 run-marked assets (`LB1`–`LB3`) in the run room.
  - Open the labels page. Pick the run room chip and sort newest first. The own assets appear.
  - Check that the add-all line obeys c = min(a, 100) − b. Read a from the page and never pin it, because the run room grows (critic §5.1).
  - Add the 3. Check the numbered list and the preview's tag.
  - **Desktop projects:** press "พิมพ์ป้าย 3 ดวง" and catch the popup with `context.waitForEvent("page")`. Close it, open its URL in the main page with `measure`, and stub `window.print`. Press print there. Wait for the POST and check that it records 3. Back on the labels page, check that the queue's mode เคยพิมพ์แล้ว shows them.
  - **Phone projects:** check the inline actions only (the print path is desktop only; WebKit popups are UAT).
  - Run axe on the page and the print route in both themes.
- **The viewer** sees the page with enabled print actions (call 19) and prints nothing.
- **ต้องพิมพ์ใหม่** is covered by unit tests (Task 1). E2E does not re-tag.

- [ ] **Step 1: Write the failing pins.** **Step 2: Run** them. Expected: FAIL. **Step 3: Implement.** **Step 4: Run** the pins, `npx playwright test --list e2e/assets/labels.spec.ts`, `npm test`, `npx tsc --noEmit` and `npm run lint`. **Step 5: Commit** `test(e2e): the labels page adds and prints run assets (group 4 plan 6)`

### Task 8: Docs, the whole-suite E2E for page group 4, and the look step (controller)

**Docs:**
- `docs/06_WORKFLOWS.md`
- `docs/11_FEATURE_LIST.md`
- `docs/07_UAT_CHECKLIST.md` (printing on a real Brother printer, a reprint after a tag change)
- `docs/04_AUTH_RBAC.md`
- `docs/14_UI_UX_DESIGN_SYSTEM.md` and `DESIGN.md` (the filter chip, the bar, the label part)
- `docs/99_CHANGELOG.md`
- `DEVELOPER_HANDOFF.md`
- The wiki (`ams-` pages, `ams-log.md`, lint)

**E2E:** page group 4 is complete, so the whole suite runs once in 4 projects (VPN probe, keep-awake).

**Look step:** the labels page at 1440, 1024 and phone, in both themes. Capture the queue with chips, the add-all box, the preview, the bar, the print route and the viewer.
