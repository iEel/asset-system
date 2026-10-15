# UI Round 4 · Phase 2B List Pages and Page Frames · Plan 2B-5 (admin, reports, dashboard, notifications and the guard lock) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the last 2B pages onto the phase 2B primitives: the admin roles, system log, storage, approvals, approval history, readiness, settings header and access-denied pages, the notification center, my assets, the reports (filters, view tabs, list, four views, page), the dashboard and the work center; page the system log, the approval history and my assets on the server; delete the helpers that lost their last caller; then lock the 2B guards (`BUDGETS = KEEP`, one R7 test). Workflows, data and validation stay the same.

**Architecture:**
- **No new primitive.** The pages use what plans 2B-1 to 2B-4 built: `PageHeader`, `PageBackLink`, `DataTable` and its parts, `TableEmptyRow`, `Pagination` with `parseListPage`, the filter parts (`FilterSelect`, `FilterChipList`, `FilterFormActions`), `RowActions`, `TabNav`, `StatStrip`, `KeyValueList`, `ContentPanel`, `Nil`/`orNil`, `formatCount`, `formatMoney`.
- **One file = one commit.** Tasks 1–16 each move one file (Tasks 5, 6, 12, 13 and 16 hold several commits, one per file) and lower that file's rows in `tests/list-frame-guards.test.ts` (LFG) and `tests/visual-foundation-guards.test.ts` (VFG), and add it to `MIGRATED_LIST_FILES` (and, for the two filter forms, `MIGRATED_FILTER_FILES`), so old patterns cannot come back.
- **Deletions with their last caller.** `ColumnHeader` goes in Task 16 after Task 1 drops its last caller; `ReportHeader`, `ReportActiveFilters` and `c/ui/metric-card.tsx` go in Task 13 with the reports page; `MasterDataHeader`, `MasterDataPagination`, `SortableColumnHeader` in Task 16. `getTableShellClasses` and `getActionButtonClasses` lose their last caller here but stay, marked `@deprecated`, for 2D (spec §10.4 table D keeps `tests/design-system.test.ts:44`).
- **The lock (Task 17).** VFG R7 becomes one `assertWithinBudget` test on every line with the one row left (`asset-import-preview-panel.tsx`, 2D); LFG `BUDGETS` equals `KEEP` with test L9; the four `KEEP` rows 2C plan 4 emptied are deleted.
- **Pipeline (spec B7, §8.1–8.2):** this plan runs in the main checkout beside 2C plan 5 in the worktree `.worktrees/ui-phase2c-plan5`. They share no code file. Whichever finishes second rebases onto `master` in its last task.
- **Controller tasks:** Task 0 (base check, before screenshots), Task 18 (verify, production build, dev-app check) and Task 20 (verify numbers, rebase if needed, wiki, memory). Task 19 writes the repo docs, the last of 2B.

**Tech Stack:** Next.js 16.4 App Router · React 19 · Tailwind CSS 4.2.4 · class-variance-authority 0.7.1 · tailwind-merge 3.5 (through `cn()`) · radix-ui · next-intl 4 · Prisma 7 (read-only `count` / `findMany` / `groupBy` for paging) · `node --test` with Node 24 type stripping.

**Spec:** `docs/superpowers/specs/2026-10-12-ui-phase2b-design.md`, with section files in `docs/superpowers/specs/2026-10-12-ui-phase2b/` (`00-decisions.md`, `00-synthesis.md`, `03-primitives.md` … `09-guards-tests.md`; this plan is `08-plans.md` §8.9, with §5.9 for the paged lists, §6 for the report filters and §9.3–9.5 for the lock).
- **Spec §10 (rulings I1–I34) overrides the section files wherever they conflict.** This plan already applies them; when a task and a section file disagree, the task wins.
- The plan's files are those of spec §8.9 plus `src/lib/approval-decision-log.ts` and its test (Task 5, spec §5.9.2 row 2 and §10.4 table B). Its line numbers are from `d38a0ee`; this plan recounted them at `6835bdf`.

## Global Constraints

- **Git:**
  - Work on branch `feat/ui-phase2b-plan5` in the main checkout `D:/Antigravity/asset-system` (from `master` `6835bdf`, which holds plans 2B-1 to 2B-4 and 2C plans 1–4).
  - Never run `git checkout`, `git switch`, `git reset`, `git stash`, `git rebase` or `git clean`, and never touch `master`. Never touch the worktree `.worktrees/ui-phase2c-plan5` (2C plan 5 may run there at the same time).
  - Commit only the files your task names. One file is one commit unless the task groups files on purpose.
  - End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Next.js 16.4** is not the Next.js in your training data. Read `node_modules/next/dist/docs/` before using an API you have not seen in this repo.
- **Line endings:**
  - `git config core.autocrlf` is `true`. Most `src/` and `tests/` files are CRLF in the working tree; several are LF.
  - Before you edit a file, run `git ls-files --eol <file>` and keep what it uses. Edit with exact-string replacement; never normalize a file. New files are LF.
  - Tests that read source files strip `\r` (`.replace(/\r\n/g, "\n")`) before multi-line regexes. A test that reads a CRLF file without stripping must not get a new regex with `\n` (spec §9.6).
- **Tests:**
  - `npm test` runs `node scripts/run-tests.mjs` over `tests/**/*.test.{ts,mjs,js}` with Node 24 type stripping. Run one file with `node --test tests/<file>.test.ts`.
  - Modules that tests import use relative `.ts` imports (no `@/`) and erasable TypeScript only. Tests cannot import `.tsx`; they check `.tsx` by reading the source text.
  - Use the shared helpers in `tests/helpers/source-files.ts`.
- **Baseline before Task 1** (HEAD `6835bdf`, or this plan's commit on top of it, which changes only `docs/`):
  - `npm test`: 1980 tests, 1979 pass, 0 fail, 1 skipped.
  - `npx tsc --noEmit`: clean.
  - `npm run lint`: 0 errors and 146 warnings, all under `.agents/`.
  - Task 0 re-checks these numbers. The dry run ends at 2003 tests (2002 pass, 1 skipped).
- **Every task ends with all of these green:** `npm test` (0 fail) · `npx tsc --noEmit` · `npm run lint` (0 errors, no new warnings in `src/` or `tests/`). Report any failure by name.
- **The guard scripts** (`<temp>` is the implementer's temp folder the controller names in the dispatch; never commit these files):
  - `node <temp>/p2b1-precheck.mjs --file <path>` prints one file's live count, budget, `KEEP` and seed per guard, and the `p2b-budget.mjs` arguments `ID=<budget>:<live>`. `node <temp>/p2b1-precheck.mjs --budgets` compares every budget row with the live counts.
  - `node <temp>/p2b-budget.mjs <path> ID=from:to ... [--migrated] [--dry-run]` lowers rows of LFG `BUDGETS` and VFG `TABLE_HEADER_FILLS` by file, never raises a number, never touches `KEEP`, and with `--migrated` adds the path to `MIGRATED_LIST_FILES`.
  - Before editing a file, its `live` equals its `budget`. After editing, compare the printed `args` with the task's Expected, then run `p2b-budget.mjs`.
  - Task 1 saves `p2b5-append.mjs`, `p2b5-tw-probe.mjs` and `p2b5-t1-precheck.mjs`; Task 9 saves `p2b5-t9-precheck.mjs`; Task 14 saves `p2b5-t14-precheck.mjs`; later tasks name the task that saved a helper. `<temp>` sits under the linted tree: helpers are ESM `.mjs`, code fragments `.txt` (never a `.cjs` with `require`).
  - Shell heredocs and `node -e` drop backslashes: write regex-bearing text with a file-writing tool or a script file. When you copy a block from a task, copy only the lines between its fences.
- **Off limits:**
  - Do not run `npm ci`, `npm install`, `npm run build`, the dev server, `npx shadcn …`, or anything against a database.
  - Do not read or print `.env` or `.env.prod-admin`.
  - Leave the untracked paths alone: `.codex/`, `.impeccable/critique/`, `.playwright-mcp/`, `.superpowers/brainstorm/`, `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`, and `.worktrees/`.
  - Do not run skill helper scripts (for example the impeccable launcher); they make network calls.
- **No new tokens (2A I21).** No task adds a custom property to `:root`, `@theme inline` or `@theme`, and no task edits `tests/design-tokens-contrast.test.ts`. Never write `rounded-[…]`. Every new class must compile with Tailwind 4.2.4 against `src/app/globals.css`.
- **2C fences (spec §8.3, §8.11, and the pair rulings below):**
  - Never edit `tests/form-migration-guards.test.ts` (FMG, 2C's). Never rename, move or delete a file in its `BATCH_FILES`, and keep it green.
  - Never touch 2C plan 5's files: the four O11 pages (`D/assets/[id]/page.tsx`, `D/maintenance/[id]/page.tsx`, `D/disposal/[id]/page.tsx`, `D/audit/rounds/[id]/page.tsx`), `c/ui/mobile-action-bar.tsx`, `c/disposal/disposal-mobile-action-bar.tsx`, `c/disposal/disposal-workflow-stepper.tsx`, `c/ui/confirm-dialog.tsx`, `c/ui/alert-dialog.tsx`, `c/maintenance/maintenance-attachments.tsx`, `c/admin/system-settings-form.tsx`, `c/admin/IntegrationClientManager.tsx`, `D/admin/integrations/page.tsx`, `D/disposal/page.tsx`, `c/disposal/disposal-bulk-approval.tsx`, `c/disposal/disposal-bulk-execution.tsx`, `c/master-data/supplier-form.tsx`; nor `D/admin/data-quality/page.tsx`, `c/notifications/notification-center-actions.tsx` or `c/reports/report-preset-controls.tsx` (2C plan 4's, done).
  - In `src/lib/design-system.ts` never touch `getMobileSafeBottomPaddingClasses` (it stays for 2D with its pin `tests/audit-scan-search-ui.test.ts:188`).
  - In `D/admin/settings/page.tsx` change the header only; keep `buildLdapSyncHistoryItems` and `ldapSyncHistory={ldapSyncHistory}` (`tests/system-log-history.test.ts:73-74`).
  - Test files read by both plans: edit none of `asset-label-print-ui`, `audit-round-cancellation`, `audit-scan-search-ui`, `confirm-dialog-ui`, `field-primitives`, `performance-route-instrumentation`, `settings-depreciation-policy-ui`, `settings-ldap-role-ui`, `system-log-history`, `visual-consistency-ui`. In `tests/list-pages-ui.test.ts`, add at the end only (2C plan 5 changes its `:343`).
  - Never run a formatter on 2C files.
- **Look (B2, B3, §4–§6):** `h1` weight 600 through `PageHeader`; header buttons switch at `md`; tables have a white 13/500 header without capitals and scroll inside their shell (never the page) at 375; number tiles are one flat `StatStrip`, never a status fill; empty values are `Nil` ("—"); the view switches are `TabNav` links (Ctrl+click and no-JavaScript still work, I10).
- **Validation and behavior:** keep every `required`, toast, `disabled` gate, filter and permission check. The paged lists keep their filters across pages and their counts equal the old totals (B4). No validation UX changes (V track).
- **Server:** no schema, migration, API, dependency or index. The new queries are read-only `count` / `findMany` / `groupBy` in `page.tsx` or `src/lib/approval-decision-log.ts`, wrapped in `withPerformanceTiming`.
- **Messages:** edit `messages/th.json` and `messages/en.json` only through `node scripts/messages-edit.mjs <changes.json>`, run from the repo root, with the JSON kept in your temp folder. Thai follows `docs/19_THAI_GLOSSARY.md` and must pass `tests/thai-glossary.test.ts`; every key exists in both files. The new keys are `systemLogPage.empty`, `systemLogPage.emptyFiltered` (Task 2), `notifications.type_info`, `type_warning`, `type_danger`, `type_success` (Task 7) and `workCenter.viewNavigation` (Task 15); Task 2 also changes the value of `systemLogPage.subtitle` (ruling below). If a task finds another string it must add, stop and ask the controller.
- **Deploy:** no task deploys. The user decided on 2026-10-12 to deploy once after all of phase 2 (B9).

## Rulings of this plan

- **Guard totals after this plan = `KEEP`** (spec §10.4 table C column 2B-5, lowered by what 2C plan 4 already did; Task 17 prints them): R7 1 row (`asset-import-preview-panel.tsx`, 2D) · LH1 4 · LB1 7 · LP1 4 · LT1 5 · LV1 5 · LV2 68 · LV3 6 · LS1 5 · LK1 1 · LN1 2 · LN2 1 · LH2, LF1, LT2, LT3, LT4, LT5, LS2 and LR1 0 · R1 `{}` · R2 10. `MIGRATED_LIST_FILES` 99 and `MIGRATED_FILTER_FILES` 13 (all 10 filter forms of `src/app`, I34). Each page task adds its own file to those lists; Task 17 adds what is left and the L9 test.
- **Pipeline with 2C plan 5 (spec §8.2, I29):** the shared non-code files are `DESIGN.md`, `tests/visual-foundation-guards.test.ts` (2C plan 5 edits the bars' line `:91`, this plan the R7 lock and the `MetricCard` pins `:2`, `:64`, `:90`: keep both on rebase), `tests/list-pages-ui.test.ts` (2C plan 5 edits `:343`, this plan appends), `messages/*.json`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md` and `docs/11_FEATURE_LIST.md`. If 2C plan 5 merges first, the controller rebases this branch in Task 20 Step 2 and resolves them by the rules there; the LFG rows 2C plan 5 lowered (the O11 pages' LP1, the repair page's LB1) are then lowered to the live counts. A conflict in any other file means a fence leaked: stop.
- **Pair rulings (both plans):** P1 `src/lib/design-system.ts` is this plan's; `getMobileSafeBottomPaddingClasses` and its pin stay for 2D. P2 `D/admin/settings/page.tsx` is this plan's (header only); 2C plan 5 changes the settings tabs inside `system-settings-form.tsx`. `src/lib/approval-decision-log.ts` and `tests/approval-decision-log.test.ts` are this plan's (no 2C plan 5 file reads them).
- **Accepted from the drafts (spec silent or departed on purpose):**
  - Task 2: `systemLogPage.subtitle` said "…ล่าสุด 100 รายการ", which is false once the log pages; it becomes "ตรวจสอบประวัติการแก้ไขข้อมูลในระบบ" / "Review the audit trail of changes in the system". `buildSystemLogFilterHref` stays as it is (a 2C plan 5 file reads it and a test nobody edits pins it); the page appends `pageSize`, so the URLs stay the same.
  - Tasks 2, 5, 8: the paged queries run inside `withPerformanceTiming` with the new labels `admin-logs.list-data` and `approval-history.list-data`; logs, history and my assets get their own `list-pages-ui` tests instead of `B4_LISTS` lines (their `Promise.all` does not fit that regex).
  - Task 1: the role permission matrix has no empty row (its module list is a constant, and tsc rejects the check). Header buttons switch at `md`, not §5.6's `lg` (I1, R-h).
  - Task 3: `storage-archive-button.tsx` is not touched (2D). Task 6: access-denied gets no header (§4.4.7); its two links take `buttonVariants` lg and drop `font-mono`.
  - Task 8: the my-assets `returnTo` (§5.9.2 row 9) needs files outside this plan (`D/my-assets/[id]/page.tsx`, `src/lib/operational-return-navigation.ts`, the pin `tests/list-pages-ui.test.ts:570`); it goes to 2D (a person rarely holds more than 25 assets). Task 8 also deletes VFG `const D` (it lost its last use; lint would warn).
  - Task 9 and Task 12's accounting commit carry the one or two page lines they need to compile (`hasActiveFilters`, the `tCommon`/`baht` label), as plan 2B-1 Task 20 did.
  - Task 12: money tiles stack below 640px and the accounting money strips stay two per row from `lg`, so 28px amounts are not clipped; money column heads are `${label} (${baht})` from existing keys; the cross-scope number boxes become `StatStrip` (the idle box stays a link, pinned); catalog and operations buttons, pills and dashed empty boxes stay for 2D. A `StatStrip` value is a string, so an unknown accounting ratio reads a typed "—" (2D adds an empty-value label to `StatStripItem`).
  - Task 13: VFG `:90` uses `\bshadow-(?:sm|md|lg|xl|2xl)\b` (the spec's `\bshadow-` matches `StatStrip`'s own inset line); `activeTabRef` stays in `report-view-tabs.tsx`, filled in the effect, so `report-controls-ui:19-27` passes unedited (table D).
  - Task 14 turns the dashboard's 13th `toLocaleString` (a date) into `formatDateTime` and keeps its cards; Task 15 splits the work center's metrics into strips of at most four cells, so each stays readable at 1024px.
  - Task 16 edits pins outside table A that the deletions force: `list-primitives-ui :64-71`, `:318`; `asset-register-filter-ui :127`, `:134` (now read the gap on `D/assets/page.tsx`).
  - Task 17 keeps the name `TABLE_HEADER_FILLS` (so `p2b-budget.mjs` and `--budgets` still work in 2D) and adds `role-permission-form.tsx` to `MIGRATED_LIST_FILES`; L9 ignores empty guard objects and does not compare against live counts, so a 2C plan 5 change cannot fail it.
  - The reports skeleton (`page-skeleton.tsx`, not this plan's) puts two tiles side by side below 640px while the page stacks them: 2D.

## Review Focus

1. **An admin who filters the system log or the approval history and pages through it** must keep the filters on every page, and the counts must equal the old totals (B4). Pinned by Tasks 2, 5 and 8's `list-pages-ui` tests and `tests/approval-decision-log.test.ts`; checked on the production build in Task 18 Step 4.
2. **A user on a phone at 375 who opens storage, logs or a report list** must scroll the table inside its shell, never the page. Pinned by the `DataTable` scroll shell and Task 3's `storage-archive-ui` edit; checked at 375 in Task 18 Step 4.
3. **A user who opens a report view with large money totals** must read every amount in full at 1024px and 375px. Task 12's accounting test pins the strips and `formatMoney`; the widths themselves are checked in Task 18 Step 4 at 1440, 1024, 768 and 375.
4. **A user who Ctrl+clicks a work-center or report view tab, or has JavaScript off,** must still reach the view (the tabs are links, I10). Pinned by Task 15's and Task 10's `TabNav` tests and `list-pages-ui`; checked in Task 18 Step 4.
5. **A user with a permission gap who lands on access denied, or an employee on the dashboard,** must see the same page as before (`<ActionEmptyState … tone="permission"`, `shouldUseEmployeeHome(user)`). Pinned by `tests/asset-register-ux.test.ts:80` and `tests/permission-aware-navigation.test.ts:98`, both left unedited.

## File structure

| File | What changes | Task |
|---|---|---|
| `D/admin/roles/page.tsx` | `PageHeader`, `StatStrip`, `DataTable`, `RowActions`; drops the last `ColumnHeader` caller | 1 |
| `D/admin/logs/page.tsx` (+ `systemLogPage.*`) | server paging (B4), quick filters on `TabNav`, `DataTable`, empty rows | 2 |
| `D/admin/storage/page.tsx` | three `DataTable`s that scroll sideways, `StatStrip`, `formatCount`; drops the last `getTableShellClasses` caller | 3 |
| `D/admin/approvals/page.tsx`, `D/admin/approvals/history/page.tsx`, `src/lib/approval-decision-log.ts` | `TabNav`, server paging with counts from `groupBy`, the left-arrow back link | 4, 5 |
| `D/admin/readiness/page.tsx`, `D/admin/settings/page.tsx` (header only), `D/access-denied/page.tsx` | `PageHeader`, `StatStrip`; the access-denied links | 6 |
| `D/notifications/page.tsx` (+ `notifications.type_*`) | `PageHeader`, `StatStrip`, the type in words | 7 |
| `D/my-assets/page.tsx` | the shared `PageHeader` (I14), server paging, `StatStrip`, `DataTable` | 8 |
| `c/reports/report-filter-panel.tsx`, `report-view-tabs.tsx`, `responsive-report-list.tsx` | `FilterSelect` and the filter parts, `Button`; `TabNav` in the scrolling wrapper; `DataTable` from `md` | 9, 10, 11 |
| `c/reports/reports-{overview,catalog,operations,accounting}-view.tsx` | `MetricCard` → `StatStrip`, `formatCount`, `formatMoney`, `tag` | 12 |
| `D/reports/page.tsx`, `c/reports/report-header.tsx` (deleted), `report-active-filters.tsx` (deleted), `c/ui/metric-card.tsx` (deleted) | `PageHeader`, `FilterChipList`, `StatStrip`; VFG `:2`, `:64`, `:90` | 13 |
| `D/dashboard/page.tsx`, `D/work-center/page.tsx` (+ `workCenter.viewNavigation`) | `PageHeader`, `TabNav` view switch, `StatStrip` | 14, 15 |
| `c/master-data/master-data-layout.tsx`, `src/lib/design-system.ts` | delete the helpers with no caller; mark `getTableShellClasses` and `getActionButtonClasses` `@deprecated` | 16 |
| `tests/visual-foundation-guards.test.ts`, `tests/list-frame-guards.test.ts` | the lock: one R7 test, `BUDGETS = KEEP` (L9) | 17 |
| `DESIGN.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md`, `docs/11_FEATURE_LIST.md`, `docs/03_DATABASE.md`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md` | the last 2B docs and the 2D hand-off | 19 |

---

### Task 0: Base check, guard scripts and before screenshots (controller runs this task, not an implementer)

**Files:**
- Create then delete: `.claude/launch.json` (only if no dev server is running; never committed)
- Create (git-ignored): `<temp>/p2b1-precheck.mjs`, `<temp>/p2b-budget.mjs`, where `<temp>` is the `codex-temp/` folder of this plan's SDD workspace (`.superpowers/sdd/<plan workspace>/codex-temp/`)
- Evidence: `.superpowers/sdd/screenshots/ui-phase2b-plan5/before/` (git-ignored)

**Interfaces:**
- Consumes: HEAD before Task 1.
- Produces: the base check, the baseline numbers, the two guard scripts every later task runs, the ids and the before images Task 18 compares against.

- [ ] **Step 1: Check the base.**

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2b-plan5`

Run: `git merge-base --is-ancestor 6835bdf HEAD && git diff --quiet 6835bdf HEAD -- src tests messages scripts prisma && echo BASE-OK`
Expected: `BASE-OK`

Run: `git log --oneline -1 master`
Expected: `6835bdf docs(ui): record phase 2C plan 4 verify results` (plans 2B-4 and 2C-4 are merged; spec §8.10 row 2).

Run: `git worktree list`
Expected: the main checkout, and `.worktrees/ui-phase2c-plan5` on `feat/ui-phase2c-plan5` once 2C plan 5 has started (spec §8.10 row 7). Run `git diff --name-only master...feat/ui-phase2c-plan5` when that branch has commits: every path must be one of 2C plan 5's files, its tests, FMG, or the shared non-code files of the Rulings. A path of this plan means a fence leaked: stop.

If `BASE-OK` does not print, code changed after `6835bdf`. Run each task's precheck before dispatching it, update the task text where a count or snippet differs, and record a ruling in the ledger.

- [ ] **Step 2: Baseline.** Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: 1980 tests (1979 pass, 0 fail, 1 skipped); tsc clean; lint 0 errors and 146 warnings, all under `.agents/`. Record the numbers in the ledger.

- [ ] **Step 3: Save the two guard scripts.** They are the ones plan 2B-1 Task 1 defined; copy them out of the merged plan text without changing a byte:

````bash
node -e '
const fs = require("fs")
const lines = fs.readFileSync("docs/superpowers/plans/2026-10-12-ui-phase2b-plan1.md", "utf8").replace(/\r\n/g, "\n").split("\n")
function grab(marker) {
  const at = lines.findIndex((line) => line.startsWith(marker))
  let start = at; while (!lines[start].startsWith("```")) start--
  let end = at; while (!lines[end].startsWith("```")) end++
  return lines.slice(start + 1, end).join("\n") + "\n"
}
fs.mkdirSync(process.argv[1], { recursive: true })
fs.writeFileSync(process.argv[1] + "/p2b1-precheck.mjs", grab("// p2b1-precheck.mjs"))
fs.writeFileSync(process.argv[1] + "/p2b-budget.mjs", grab("// p2b-budget.mjs"))
' "<temp>"
````

Expected: `<temp>/p2b1-precheck.mjs` (343 lines) and `<temp>/p2b-budget.mjs` (168 lines).

- [ ] **Step 4: Recount.** Run `node <temp>/p2b1-precheck.mjs --budgets`. Expected: `budgets hold: no live count is over its row`; R7 `TABLE_HEADER_FILLS 9 in 6 rows · live 9 in 6 files`; every guard shows `slack 0` except the four rows 2C plan 4 emptied: `LH1 … 18 in 18 rows · live 16 in 16 files · slack 2` (`assets/asset-label-batch-tool.tsx`, `assets/asset-scan-search-tool.tsx`), `LT1 … 23 in 7 rows · live 21 in 6 files · slack 1` (`admin/role-permission-form.tsx`) and `LV1 … 15 in 4 rows · live 12 in 3 files · slack 1` (`admin/IntegrationClientManager.tsx`). Task 17 removes those rows. Then run `node <temp>/p2b1-precheck.mjs --file <path>` for each file of Tasks 1–16 and check that the `live` column equals the task's precheck Expected. On any difference, stop and update that task before dispatching it.

- [ ] **Step 5: Confirm the dev database.** Read the `.env` keys `DATABASE_URL` and `DB_USER` without printing secrets. The database must be `asset_management_dev` and the user `asset_dev`. If not, stop.

- [ ] **Step 6: Open the app.**
  - If the user's dev server answers on `http://localhost:3000` (the main checkout), use it. 2C plan 5's servers run from the worktree on 3100/3101; never use those for this plan.
  - Otherwise create `.claude/launch.json` (`runtimeExecutable: "npm"`, `runtimeArgs: ["run", "dev"]`, `port: 3000`) and run `preview_start`.
  - Log in with the seed admin from `prisma/seed.ts`; do not echo the password.

- [ ] **Step 7: Pick ids and states.** Record in the ledger:
  - a role with users (`/th/admin/roles`), and whether the roles table can be empty on dev (it cannot be emptied; the empty row is checked by its test only)
  - a system-log filter that returns more than one page (`/th/admin/logs`), one with an expandable `<details>` row, and one filter that returns nothing
  - `/th/admin/storage`: whether each of its three tables has rows
  - `/th/admin/approvals` with each chip, `/th/admin/approvals/history` with more than one page if the dev data has it
  - a notification of each type (`info`, `warning`, `danger`, `success`) if the dev data has them
  - `/th/my-assets` (if the seed admin holds no asset, record it; the page is then checked for a person in Task 18)
  - each `/th/reports` view (overview, accounting, operations, catalog), one with active filters
  - `/th/dashboard` and `/th/work-center` in both views

- [ ] **Step 8: Before screenshots.** Save to `.superpowers/sdd/screenshots/ui-phase2b-plan5/before/` as `<view>-<width>.png`, full page plus the `main` scroll area scrolled to its bottom:
  - `/th/admin/roles`, `/th/admin/logs`, `/th/admin/storage`, `/th/admin/approvals`, `/th/admin/approvals/history`, `/th/notifications`, `/th/my-assets`, `/th/dashboard`, `/th/work-center` (both views) at 1440 and 375
  - `/th/admin/readiness`, `/th/admin/settings`, `/th/access-denied` at 1440
  - every `/th/reports` view at 1440, 768 and 375, and its filter panel open
  - Save nothing in any form. Open no dialog past its first screen.

- [ ] **Step 9: Clean up.** Stop any server you started and delete `.claude/launch.json`. Keep every helper script outside the repo except the two guard scripts in `<temp>`. `git status --short` must show only the untracked paths in Global Constraints. No commit in this task.

---

### Task 1: `D/admin/roles/page.tsx` · PageHeader, one StatStrip, the role list and the permission matrix on DataTable, edit through RowActions (plus the helper scripts of Tasks 1–8)

Spec §8.9 row 1, §5.6 row `admin/roles`, §4.4.6 row `D/admin/roles/page.tsx`, §5.1, §5.8 row "ตารางล้วน" (B6), §10.2 I5, rulings R-d, R-h, R-p, R-q and controller rulings (a), (b) and (e). One file, one commit. The page and its tests are CRLF: exact-string replacements only. This task also saves the three helper scripts Tasks 2–8 reuse.

Rulings this task applies:
- **§4.4.6, I1, R-h:** the hand-written title block (`:84-98`) becomes `PageHeader` with `title={t("title")}`, `meta={t("subtitle")}` and, when `canExport`, "ส่งออกรายงานตรวจสอบสิทธิ์" as `buttonVariants({ variant: "outline", size: "md" })` with `Download` (it was `h-10` hand-written; R-h puts header buttons at `md`, so §5.6's "`size="lg"`" gives way). LH1 1 → 0.
- **§5.6, R-d:** the three `RoleAuditCard` boxes (tone fills, `toLocaleString("th-TH")`) become one `StatStrip` with `formatCount`; each card's detail line is the cell's `foot` (and its `footTitle`, because the strip cuts a long foot), and "บทบาทปิดใช้งานแต่ยังมีผู้ใช้" sets `attention` when it is above 0 (it was the one conditional `danger` fill). `RoleAuditCard` and `roleAuditToneClass` go. LS1 1 → 0.
- **§5.6, §5.8 (B6), I3:** both tables become `DataTable framed={false}` inside `ContentPanel divided flush className="overflow-hidden"` (the section with its own title bar becomes the shared panel head; no frame in a frame), each with `caption` = the panel title and `scrollHint={tCommon("tableScrollHint")}`. The heads are `DataTableHead` (white, 13/500, no capitals; `ColumnHeader` of `master-data-layout.tsx` loses its last caller, Task 16 deletes it). VFG R7 2 → 0.
- **§5.6, B5, I5:** "แก้ไข" in each role row (`h-8` hand-written) becomes `RowActions` with `next` = edit only and `groups={[]}`: roles have no delete API (`src/app/api/admin/roles/[id]/route.ts` has `PUT` only), so `RowActions` draws its fixed ⋯ slot empty, exactly like the user list of plan 2B-1. The actions column is pinned right with a hidden label. The row stays a `ClickableTableRow` to the edit page.
- **§5.6 "ไม่มีทั้ง 2 ตาราง → เพิ่ม TableEmptyRow":** the role list gets `TableEmptyRow colSpan={7}` with `tCommon("noData")`. The permission matrix renders the fixed 25 modules of `permissionModules` (a constant), so it can never be empty and gets no empty row (a departure from §5.6: a check on a constant 25-item list is dead code, and TypeScript rejects `permissionModules.length === 0` as a comparison that cannot be true).
- **§5.6, R-n, R-p:** role keys and module keys are `tag`; an empty description is `orNil`; a matrix cell with no role is `<Nil />` (it was a typed `-` in a span); the user and permission counts are `formatCount` in `numeric` cells. LV2 1 → 0. The matrix rows are `DataTableRow` (they had only a hover).
- **R-q, 2D:** the floating "เพิ่มบทบาท" button (`:242-250`, `shadow-lg`, VFG R2 1) and the role pills (`ActiveBadge`, the system and protected pills, the success pills of the matrix) stay as they are.
- **Spec §10.3, I15:** 2B does not touch the page again, so it joins `MIGRATED_LIST_FILES` (every counter 0; VFG R2 keeps its own row).

What users will see on `/th/admin/roles`:
- The title is 600; the export button is 36px from md and 44px on phones.
- The three tinted boxes are one flat strip (two columns below 1024px, the third cell spans the row); the inactive-roles cell shows its help line in amber with an icon when such roles exist.
- Both tables sit flush in their panels under a 56px panel head, with the white 13px header without capitals, about 46px rows, keys in monospace, and a scroll hint above a table only while it overflows (the matrix is 7 columns and overflows on phones and tablets).
- Each role row has "แก้ไข" in a fixed 120px slot (44px tall on phones), pinned to the right edge while the table scrolls; clicking the row still opens the role.
- An empty matrix cell shows "—" ("ไม่มีข้อมูล" to a screen reader). The floating add button is unchanged.

Not in this task: the floating button and the pills (2D) · `master-data-layout.tsx` (Task 16 deletes `ColumnHeader`) · `c/admin/role-permission-form.tsx` (2C plan 4 file; its R7 and LT1 `KEEP` rows are Task 17's) · docs (Task 19). Do not run a formatter.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/admin/roles/page.tsx` (`i/lf w/crlf`; 3 exact replacements)
- Modify: `tests/list-pages-ui.test.ts` (`i/lf w/crlf`; one block appended with `p2b5-append.mjs`)
- Modify: `tests/list-frame-guards.test.ts`, `tests/visual-foundation-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only, never committed: `p2b5-t1-precheck.mjs`, `p2b5-append.mjs`, `p2b5-tw-probe.mjs` (Tasks 2–8 reuse all three; any later task of this plan may reuse the last two by name), `t01-pages-block.ts`

**Must keep passing without edits:**
- `tests/list-pages-ui.test.ts` (every test before this task's block) · `tests/list-primitives-ui.test.ts` · `tests/row-actions-ui.test.ts`
- VFG `R2 only floating layers, camera controls and paper previews cast a shadow` (the roles row `1 // floating add button shadow-lg (2D)` stays) · `tests/form-migration-guards.test.ts`

**Interfaces:**
- Consumes:
  - 2B-1: `PageHeader({ title, meta?, actions?, back?, breadcrumbs?, compactOnMobile?, className? })` from `@/components/ui/page-header`; `StatStrip({ items: readonly StatStripItem[], className? })` with `StatStripItem = { key; label; value: string; unit?; foot?: React.ReactNode; footTitle?; href?; current?; scroll?; attention? }` from `@/components/ui/stat-strip`; `ContentPanel({ title?, description?, actions?, children, className?, divided: true, flush? })` from `@/components/ui/content-panel`; `DataTable({ children, caption?, framed? (true), layout?, minWidth?, scrollHint?, footer?, className?, …<div> props })`, `DataTableHeader`, `DataTableBody`, `DataTableHead({ align?: "left" | "right", sort?, sticky?: "left" | "right", hideLabel? })`, `DataTableRow`, `DataTableCell({ align?, numeric?, sticky?, className? })`, `TableEmptyRow({ colSpan, children })` from `@/components/ui/data-table`; `RowActions({ code, name?, menuLabel, next?, groups, deleteAction?, openerRef?, menu?, className? })` from `@/components/ui/row-actions` (client; `next` with `href` is data a server page can pass).
  - 2A: `Nil`, `orNil(value, label?)` from `@/components/ui/nil`; `formatCount(value: number): string` from `@/lib/display-format`; `buttonVariants({ variant?, size? })` from `@/components/ui/button-variants`; `ClickableTableRow({ href, label })` (unchanged import).
  - Task 0: `<temp>/p2b1-precheck.mjs` (`--file`, `--budgets`) and `<temp>/p2b-budget.mjs`.
- Produces:
  - The page without `ColumnHeader`, `RoleAuditCard` and `roleAuditToneClass`; in `MIGRATED_LIST_FILES`; its rows gone from LFG `BUDGETS` and VFG `TABLE_HEADER_FILLS`. `ColumnHeader` of `c/master-data/master-data-layout.tsx` has no caller left (Task 16).
  - The test `roles: PageHeader, one StatStrip, and the role list and permission matrix on DataTable, with edit through RowActions (spec 2B §5.6)` in `tests/list-pages-ui.test.ts`.
  - In the temp folder: `p2b5-t1-precheck.mjs <1-8>`, `p2b5-append.mjs <block file> <test file>` (keeps the test file's CRLF or LF; prints `appended <block> to <test> (CRLF)`), `p2b5-tw-probe.mjs <file> …` (prints `checked N classes, missing M`; `SHOW=a,b` prints compiled rules).

| guard | `D/admin/roles/page.tsx` before → after | plan total (budget) before → after |
|---|---|---|
| VFG R7 | 2 → – | 9 in 6 rows → 7 in 5 |
| VFG R2 | 1 → 1 (the floating button, 2D) | 10 in 9 rows, unchanged |
| LFG LH1 | 1 → – | 18 → 17 (live 16 → 15) |
| LFG LV2 | 1 → – | 73 → 72 |
| LFG LS1 | 1 → – | 14 → 13 |
| `MIGRATED_LIST_FILES` | – → joins | 77 → 78 |

- [ ] **Step 1: Check what this task builds on (and save the three helper scripts)**

Save these three scripts in your temp folder (never in the repo). `p2b5-append.mjs` is plan 2B-4's `p2b4-append.mjs` under the 2B-5 name, byte for byte otherwise. `p2b5-tw-probe.mjs` is plan 2B-4's `p2b4-tw-probe.mjs` under the 2B-5 name with one change: the tokens it skips are gathered in `notClass`, which adds three kinds of non-class strings that the files of this plan hold after a `, ` or a `? ` (a `className=` that the `", "` of `item.roleLabels.join(", ")` runs into on the approval page, the PWA file names of the readiness page, and the `"th-TH"` / `"en-US"` of the notification page's date format); without it those files report false misses.

`p2b5-t1-precheck.mjs`:

```js
// p2b5-t1-precheck.mjs: run from the repo root before Task 1, 2, 3, 4, 5, 6, 7 or 8 of plan 2B-5.
// Usage: node p2b5-t1-precheck.mjs <1-8>. Reads only; writes nothing. Never commit this file.
// Confirms that the 2B-1 primitives and the 2A parts these eight tasks use are there with the API the tasks quote, that
// the keys they read exist in th and en, that the earlier tasks of the group are in and this task's change is not, and
// that each file this task edits still holds the 6835bdf text the old snippets quote (a hash of its text with \r
// stripped; no other task of the plan and no file of 2C plan 5 edits these).
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"

const task = Number(process.argv[2])
if (![1, 2, 3, 4, 5, 6, 7, 8].includes(task)) {
  console.error("usage: node p2b5-t1-precheck.mjs <1-8>")
  process.exit(2)
}
const D = "src/app/[locale]/(dashboard)/"
const C = "src/components/"
const raw = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "")
const read = (path) => raw(path).replace(/\r\n/g, "\n")
const eol = (path) => {
  const text = raw(path)
  const crlf = (text.match(/\r\n/g) ?? []).length
  const lf = (text.match(/\n/g) ?? []).length
  return lf === 0 ? "missing" : crlf === lf ? "CRLF" : crlf === 0 ? "LF" : "mixed"
}
const hash = (path) => createHash("sha256").update(read(path)).digest("hex").slice(0, 16)
const ui = (name) => read(`${C}ui/${name}`)
const exports = (path, names) => names.every((name) => new RegExp(`export (?:async )?(?:function|const|type) ${name}\\b`).test(read(path)))
const messages = (locale) => JSON.parse(read(`messages/${locale}.json`))
const lfg = read("tests/list-frame-guards.test.ts")
const migratedBlock = lfg.match(/const MIGRATED_LIST_FILES: string\[\] = \[([\s\S]*?)\n\]/)?.[1] ?? ""
const migrated = (path) => migratedBlock.includes(path.startsWith(D) ? "`${D}" + path.slice(D.length) + "`" : "`${C}" + path.slice(C.length) + "`")

const ROLES = `${D}admin/roles/page.tsx`
const LOGS = `${D}admin/logs/page.tsx`
const STORAGE = `${D}admin/storage/page.tsx`
const APPROVALS = `${D}admin/approvals/page.tsx`
const HISTORY = `${D}admin/approvals/history/page.tsx`
const DECISION_LOG = "src/lib/approval-decision-log.ts"
const READINESS = `${D}admin/readiness/page.tsx`
const SETTINGS = `${D}admin/settings/page.tsx`
const ACCESS_DENIED = `${D}access-denied/page.tsx`
const NOTIFICATIONS = `${D}notifications/page.tsx`
const MY_ASSETS = `${D}my-assets/page.tsx`
// The files each task edits, with their CR-stripped text hash at 6835bdf (messages, list-pages-ui, LFG and VFG are
// edited by several tasks of the group and are not hashed).
const UNCHANGED = {
  1: { [ROLES]: "d2dcf24150383e83" },
  2: { [LOGS]: "81c229905308e172", "tests/list-filters-ui.test.ts": "44acef8c69583b68" },
  3: { [STORAGE]: "ae06aded7d170176", "tests/storage-archive-ui.test.ts": "2f9d35149d0105f7" },
  4: { [APPROVALS]: "c340c3b2d069e624" },
  5: { [HISTORY]: "04ffe42383894ba8", [DECISION_LOG]: "b4be612ebf605f0e", "tests/approval-decision-log.test.ts": "11921d7a046decb0" },
  6: { [READINESS]: "a154d34e4b78b447", [SETTINGS]: "93e275abe5371b9a", [ACCESS_DENIED]: "9ee1c5596e3218af" },
  7: { [NOTIFICATIONS]: "1698c4446ef790c1" },
  8: { [MY_ASSETS]: "f2103b3207891e9c" },
}
// What each task leaves behind, so the next task can see it is in (and a task can see it has not run yet).
const DONE = {
  1: () => read(ROLES).includes("<RowActions") && migrated(ROLES),
  2: () => read(LOGS).includes("<TabNav") && migrated(LOGS),
  3: () => read(STORAGE).includes("<StatStrip") && migrated(STORAGE),
  4: () => read(APPROVALS).includes("<TabNav") && migrated(APPROVALS),
  5: () => read(DECISION_LOG).includes("export function buildApprovalDecisionLogWhere") && read(HISTORY).includes("summarizeApprovalDecisionCounts(decisionCounts)") && migrated(HISTORY),
  6: () => [READINESS, SETTINGS, ACCESS_DENIED].every((path) => migrated(path)) && read(READINESS).includes("<StatStrip"),
  7: () => read(NOTIFICATIONS).includes("<StatStrip") && migrated(NOTIFICATIONS),
  8: () => read(MY_ASSETS).includes("<StatStrip") && migrated(MY_ASSETS),
}
// The keys the eight tasks read, by namespace (the new ones of Tasks 2 and 7 are written by those tasks).
const KEYS = {
  common: ["edit", "status", "active", "inactive", "actions", "noData", "noValue", "tableScrollHint", "moreActionsFor", "pagination", "previous", "next", "pageOf", "showingRange", "pageSizeLabel", "rowsPerPage"],
  adminRolesPage: ["title", "subtitle", "exportAudit", "systemRoleCount", "systemRoleCountDetail", "highRiskRoleCount", "highRiskRoleCountDetail", "inactiveRoleWithUsers", "inactiveRoleWithUsersDetail", "roleSummary", "permissionMatrix", "permissionMatrixSubtitle", "role", "description", "users", "permissions", "type", "module", "systemRole", "customRole", "protectedRole"],
  systemLogPage: ["title", "subtitle", "quickFilters", "quickFilterAll", "module", "action", "filter", "date", "user", "record", "detail", "viewDetails", "field", "before", "after", "remark"],
  storagePage: ["title", "subtitle", "activeFiles", "inactiveFiles", "totalSize", "totalSizeHelp", "largeFiles", "largeFilesHelp", "reviewNeeded", "reviewNeededHelp", "filesystemDryRun", "filesystemDryRunHelp", "matchedFiles", "orphanFiles", "missingFiles", "dryRunAction", "file", "size", "action", "emptyDryRunActions", "moduleBreakdown", "moduleBreakdownHelp", "module", "fileCount", "emptyReview", "emptyLargeFiles", "uploadedAt"],
  approvalInboxPage: ["title", "subtitle", "openDecisionHistory", "openPolicySettings", "total", "disposal", "audit", "manageRoles", "queueTitle", "queueDescription", "filteredCount", "requestedBy", "requestedAt"],
  approvalHistoryPage: ["title", "subtitle", "backToInbox", "total", "approved", "rejected", "closed", "moduleFilter", "decisionFilter", "timelineTitle", "timelineDescription", "filteredCount", "emptyTitle", "emptyDescription"],
  productionReadinessPage: ["title", "subtitle", "summaryTotal", "summaryPass", "summaryWarning", "summaryFail", "value"],
  systemSettingsPage: ["title", "subtitle"],
  accessDeniedPage: ["title", "description", "requestedPermission", "backDashboard", "openWorkCenter"],
  notifications: ["centerTitle", "centerSubtitle", "openWorkCenter", "active", "read", "snoozed", "assigned", "empty", "deliveredDigestTitle", "deliveredDigestSubtitle", "deliveredDigestEmpty"],
  myAssets: ["title", "subtitle", "summary", "list", "total", "ready", "needsAttention", "missingPhoto", "openWorkCenter", "noLinkedEmployeeTitle", "noLinkedEmployeeHelp", "emptyTitle", "emptyHelp", "openDetail"],
}

const pageHeader = ui("page-header.tsx")
const dataTable = ui("data-table.tsx")
const statStrip = ui("stat-strip.tsx")
const tabNav = ui("tab-nav.tsx")
const checks = {
  "2B-1: PageHeader with title, meta, actions and back; PageBackLink with href and label":
    /export function PageHeader\(\{ title, meta, actions, back, breadcrumbs, compactOnMobile = false, className \}: PageHeaderProps\)/.test(pageHeader) &&
    /export function PageBackLink\(\{ href, label, onClick, className \}: PageBackLinkProps\)/.test(pageHeader),
  "2B-1: DataTable (framed, caption, scrollHint, footer) and its parts, TableEmptyRow with colSpan":
    exports(`${C}ui/data-table.tsx`, ["DataTable", "DataTableHeader", "DataTableBody", "DataTableHead", "DataTableRow", "DataTableCell", "DataTableFoot", "TableEmptyRow"]) &&
    ["framed?: boolean", "caption?: string", "scrollHint?: string", "footer?: React.ReactNode", 'align?: "left" | "right"', "numeric?: boolean", 'sticky?: "left" | "right"', "hideLabel?: boolean", "{ colSpan: number }"].every((text) => dataTable.includes(text)),
  "2B-1: Pagination with page sizes, and the B4 helpers": /pageSizes\?: readonly PaginationPageSize\[\]/.test(ui("pagination.tsx")) &&
    exports("src/lib/list-pagination.ts", ["LIST_PAGE_SIZES", "parseListPage", "listPageWindow", "lastListPage", "appendListPage"]) && exports("src/lib/master-data-query.ts", ["paginationRange"]),
  "2B-1: TabNav with aria-label, items (key, label, href, count), current and className":
    /export function TabNav\(\{ "aria-label": ariaLabel, items, current, scroll, onSelect, linkClassName, className, \.\.\.navProps \}: TabNavProps\)/.test(tabNav) && /count\?: string/.test(tabNav),
  "2B-1: StatStrip items with foot, footTitle and attention, and a className":
    ["value: string", "foot?: React.ReactNode", "footTitle?: string", "attention?: boolean"].every((text) => statStrip.includes(text)) &&
    /\{ items, className \}: \{ items: readonly StatStripItem\[\]; className\?: string \}/.test(statStrip),
  "2B-1: RowActions with code, name, menuLabel, next and groups": /export function RowActions\(\{\n\s+code,\n\s+name,\n\s+menuLabel,\n\s+next,\n\s+groups,/.test(ui("row-actions.tsx")),
  "2B-1: ContentPanel divided and flush; FilterPanel and FilterFormActions": /\{ divided: true; flush\?: boolean \}/.test(ui("content-panel.tsx")) &&
    exports(`${C}ui/filter-panel.tsx`, ["FilterPanel", "FilterFormActions"]),
  "2A: Field, Input, EmptyNote (padded), Nil, orNil, ActionEmptyState (tone), StatusBadge, ClickableTableRow":
    /function Field\(\{ label,/.test(ui("field.tsx")) && /function Input\(/.test(ui("input.tsx")) && /padded\?: boolean/.test(ui("empty-note.tsx")) &&
    exports(`${C}ui/nil.tsx`, ["Nil", "orNil"]) && /tone\?: ActionEmptyStateTone/.test(ui("action-empty-state.tsx")) && exports(`${C}ui/status-badge.tsx`, ["StatusBadge"]) &&
    /export function ClickableTableRow\(\{\s*href,\s*label,/.test(ui("clickable-table-row.tsx")),
  "2A: formatCount, buttonVariants md and lg, withPerformanceTiming": exports("src/lib/display-format.ts", ["formatCount"]) &&
    /md: sizeMd,/.test(ui("button-variants.ts")) && /lg: sizeLg,/.test(ui("button-variants.ts")) && exports("src/lib/performance-timing.ts", ["withPerformanceTiming"]),
  "the keys these tasks read exist in th and en": ["th", "en"].every((locale) => {
    const all = messages(locale)
    return Object.entries(KEYS).every(([namespace, keys]) => keys.every((key) => typeof all[namespace]?.[key] === "string"))
  }),
  ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7].filter((number) => number < task).map((number) => [`Task ${number} is in`, DONE[number]()])),
  [`Task ${task} has not run yet`]: !DONE[task](),
  ...Object.fromEntries(Object.entries(UNCHANGED[task]).map(([path, expected]) => [`${path} is unchanged since 6835bdf (hash ${expected})`, hash(path) === expected])),
}

let missing = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok     " : "MISSING"} ${name}`)
  if (!ok) missing += 1
}
for (const path of Object.keys(UNCHANGED[task])) {
  console.log(`info    ${path}: ${eol(path)}${hash(path) === UNCHANGED[task][path] ? "" : ` · hash now ${hash(path)}`}`)
}
if (missing > 0) {
  console.error(`ABORT: ${missing} precondition(s) failed. Do not start Task ${task}; report which.`)
  process.exit(1)
}
console.log(`preconditions hold for Task ${task}`)
```

`p2b5-append.mjs`:

```js
// p2b5-append.mjs: run from the repo root. Usage: node <temp>/p2b5-append.mjs <block file> <test file>
// Appends the block after one blank line, in the test file's own line endings (most test files are CRLF in the working
// tree), and ends the file with one line break. Never commit this file.
import { readFileSync, writeFileSync } from "node:fs"

const [block, target] = process.argv.slice(2)
const current = readFileSync(target, "utf8")
const crlf = (current.match(/\r\n/g) ?? []).length
const lf = (current.match(/\n/g) ?? []).length
if (crlf > 0 && crlf !== lf) throw new Error(`${target} has mixed line endings: stop and report`)
const eol = crlf > 0 ? "\r\n" : "\n"
const text = readFileSync(block, "utf8").replace(/\r\n/g, "\n").replace(/\n*$/, "").replace(/\n/g, eol)
writeFileSync(target, current.replace(/(?:\r?\n)*$/, eol + eol) + text + eol)
console.log(`appended ${block} to ${target} (${eol === "\r\n" ? "CRLF" : "LF"})`)
```

`p2b5-tw-probe.mjs`:

```js
// p2b5-tw-probe.mjs: run from the repo root. Usage: node <temp>/p2b5-tw-probe.mjs <file> [<file> ...]
// Compiles every class of the class strings in the given files with the repo's Tailwind (@tailwindcss/node) against
// src/app/globals.css, in memory, and lists any class that produces no CSS. Reads only; writes nothing. Never commit.
// SHOW=a,b prints the compiled rule of the named classes. Never taken for a class: a lone "-" (a typed dash that R-n
// keeps), a token that ends in "=" (the className= a ", " join string runs into), a file name (the PWA files of the
// readiness page) and a locale tag (the th-TH and en-US of a date format).
import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()
const require = createRequire(resolve(root, "package.json"))
const { compile } = require("@tailwindcss/node")
const compiler = await compile(readFileSync(resolve(root, "src/app/globals.css"), "utf8"), { base: root, onDependency() {} })

// Class strings: className="…" (and a …ClassName="…" prop such as linkClassName), a …Classes constant, the first string
// in cn(…), and any other string with a "-" or ":" in it after &&, ?, :, or a comma (the other strings inside cn() and
// the sticky maps).
const STRING = /(className=|ClassName=|Classes = |cn\(|&& |\? |: |, )"([^"]*)"/g
const takes = (lead, text) => /^(?:className=|ClassName=|Classes = |cn\()$/.test(lead) || /[-:]/.test(text)
const MARKERS = new Set(["group", "group/row"]) // they name a group and emit no CSS of their own
const notClass = (token) => token === "-" || token.endsWith("=") || /\.(?:png|ico|svg|js|html)$/.test(token) || /^[a-z]{2}-[A-Z]{2}$/.test(token)
const classes = new Set()
for (const file of process.argv.slice(2)) {
  for (const [, lead, text] of readFileSync(file, "utf8").matchAll(STRING)) {
    if (!takes(lead, text)) continue
    for (const token of text.split(/\s+/)) if (/^[a-z!\[-]/.test(token) && !/[(){};]/.test(token) && !notClass(token)) classes.add(token)
  }
}
const css = compiler.build([...classes])
const utilities = css.slice(css.indexOf("@layer utilities"))
const escape = (name) => name.replace(/[^a-zA-Z0-9_-]/g, (char) => "\\" + char)
const missing = [...classes].filter((name) => !MARKERS.has(name) && !utilities.includes("." + escape(name)))
console.log(`checked ${classes.size} classes, missing ${missing.length}${missing.length ? ": " + missing.join(" ") : ""}`)
for (const name of process.env.SHOW ? process.env.SHOW.split(",") : []) {
  const at = utilities.indexOf("." + escape(name))
  if (at === -1) { console.log(`no rule for ${name}`); continue }
  let end = utilities.indexOf("{", at)
  for (let depth = 0; end < utilities.length; end += 1) {
    if (utilities[end] === "{") depth += 1
    else if (utilities[end] === "}" && --depth === 0) break
  }
  console.log(`${name} -> ${utilities.slice(at, end + 1).replace(/\s+/g, " ")}`)
}
process.exit(missing.length ? 1 : 0)
```

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2b-plan5`

Run: `git status --short src tests messages` then `node <temp>/p2b5-t1-precheck.mjs 1`
Expected: `git status` prints nothing. The script prints (exit 0):
```
ok      2B-1: PageHeader with title, meta, actions and back; PageBackLink with href and label
ok      2B-1: DataTable (framed, caption, scrollHint, footer) and its parts, TableEmptyRow with colSpan
ok      2B-1: Pagination with page sizes, and the B4 helpers
ok      2B-1: TabNav with aria-label, items (key, label, href, count), current and className
ok      2B-1: StatStrip items with foot, footTitle and attention, and a className
ok      2B-1: RowActions with code, name, menuLabel, next and groups
ok      2B-1: ContentPanel divided and flush; FilterPanel and FilterFormActions
ok      2A: Field, Input, EmptyNote (padded), Nil, orNil, ActionEmptyState (tone), StatusBadge, ClickableTableRow
ok      2A: formatCount, buttonVariants md and lg, withPerformanceTiming
ok      the keys these tasks read exist in th and en
ok      Task 1 has not run yet
ok      src/app/[locale]/(dashboard)/admin/roles/page.tsx is unchanged since 6835bdf (hash d2dcf24150383e83)
info    src/app/[locale]/(dashboard)/admin/roles/page.tsx: CRLF
preconditions hold for Task 1
```
On any `MISSING` line, stop and report it. A `hash now` line means the file changed after `6835bdf` (2C plan 5 does not edit it), so the old snippets below may not match: report it, do not guess.

Run: `node <temp>/p2b1-precheck.mjs --file "D/admin/roles/page.tsx"`
Expected (after the `info`/`ok` header lines; exit 0):
```
file    src/app/[locale]/(dashboard)/admin/roles/page.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
R7         2       2     0     2
R2         1       –     –     1
LH1        1       1     0     1
LV2        1       1     0     1
LS1        1       1     0     1
args    R7=2:2 LH1=1:1 LV2=1:1 LS1=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol "src/app/[[]locale]/(dashboard)/admin/roles/page.tsx" tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: `i/lf w/crlf` for all four. Keep them CRLF.

- [ ] **Step 2: Write the failing test (`tests/list-pages-ui.test.ts`, CRLF; it strips `\r` before matching, so its regexes may hold `\n`)**

Save this block as `<temp>/t01-pages-block.ts`:

```ts
// Plan 2B-5 Task 1 (spec 2B §5.6 row admin/roles, §4.4.6, R-d, R-q): the role list and the permission matrix on the
// list primitives. Edit is the row's only command, so RowActions draws no ⋯; the floating create button stays for 2D.
test("roles: PageHeader, one StatStrip, and the role list and permission matrix on DataTable, with edit through RowActions (spec 2B §5.6)", () => {
  const source = read(`${D}admin/roles/page.tsx`)
  for (const part of ["<PageHeader", "<StatStrip", "<DataTableHeader>", "<DataTableBody>", "<TableEmptyRow colSpan={7}>", "<ClickableTableRow", "<DataTableRow", "<RowActions"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /<div className="space-y-6">\n\s+<PageHeader\n\s+title=\{t\("title"\)\}\n\s+meta=\{t\("subtitle"\)\}/)
  assert.match(source, /<Link href="\/api\/admin\/roles\/export" className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.equal(source.match(/<ContentPanel divided flush className="overflow-hidden"/g)?.length, 2)
  assert.equal(source.match(/<DataTable framed=\{false\} caption=\{t\("(?:roleSummary|permissionMatrix)"\)\} scrollHint=\{tCommon\("tableScrollHint"\)\}>/g)?.length, 2, "both tables sit flush in their panel and scroll sideways with the hint (B6)")
  assert.match(source, /next=\{\{ label: tCommon\("edit"\), href: editHref, icon: <Pencil aria-hidden="true" \/> \}\}\n\s+groups=\{\[\]\}\n\s+\/>/, "edit is the only command: no ⋯ (spec 2B §5.6)")
  assert.match(source, /menuLabel=\{tCommon\("moreActionsFor", \{ code: role\.name \}\)\}/)
  assert.match(source, /<DataTableHead align="right" sticky="right" hideLabel>\{tCommon\("actions"\)\}<\/DataTableHead>/)
  assert.match(source, /attention: inactiveRolesWithUsers\.length > 0,/, "inactive roles that still have users need action (R-d)")
  assert.match(source, /className="fixed bottom-6 right-6 [^"]*shadow-lg/, "R-q: phase 2D moves the floating create button")
  assert.doesNotMatch(source, /\bColumnHeader\b|function RoleAuditCard\b|<thead\b|<th\b|toLocaleString\(|font-mono|"-"|>-</)
})
```

Run: `node <temp>/p2b5-append.mjs <temp>/t01-pages-block.ts tests/list-pages-ui.test.ts`
Expected: `appended <temp>/t01-pages-block.ts to tests/list-pages-ui.test.ts (CRLF)`

Run: `node --test tests/list-pages-ui.test.ts`
Expected: FAIL, `tests 35 · pass 34 · fail 1` (one test more than the 34 at `6835bdf`):
- `roles: PageHeader, one StatStrip, and the role list and permission matrix on DataTable, with edit through RowActions (spec 2B §5.6)`: `no <PageHeader`

- [ ] **Step 3: Lower the guard rows of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs "D/admin/roles/page.tsx" R7=2:0 LH1=1:0 LV2=1:0 LS1=1:0 --migrated`
Expected (exit 0):
```
R7: 2 -> 0 (row deleted)
LH1: 1 -> 0 (row deleted)
LV2: 1 -> 0 (row deleted)
LS1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/admin/roles/page.tsx
```

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 42 · fail 5`. Each failure lists only `src/app/[locale]/(dashboard)/admin/roles/page.tsx`:
- `LH1 page titles (<h1>) come from PageHeader` (`LH1: 16 in 16 files. …`, `: 1 > 0`) · `LV2 empty values on screen are Nil or orNil, not a typed "-"` (`73 in 23`, `1 > 0`) · `LS1 number tiles come from StatStrip, not a local tile function` (`14 in 12`, `1 > 0`)
- `L0 a file 2B is done with keeps only what KEEP allows, and every row names a real file and a known guard`: `LH1 …/admin/roles/page.tsx: 1 > 0`, `LV2 …: 1 > 0`, `LS1 …: 1 > 0` (the page is now in `MIGRATED_LIST_FILES`)
- VFG `R7 interim: table-header fills wait for DataTable (2B), file by file`: `9 matches in 6 files; over budget:` and `src/app/[locale]/(dashboard)/admin/roles/page.tsx: 2 > 0`

- [ ] **Step 4: Move the page onto the primitives (`src/app/[locale]/(dashboard)/admin/roles/page.tsx`, CRLF)**

Three exact replacements, top to bottom. Make all three before you compile.

(1) Imports `:1-8`. `Edit` gives way to `Pencil` (the next-step icon of every row action), `ShieldAlert` goes with `RoleAuditCard`, `ColumnHeader` goes; `Check`, `Plus` and `ShieldCheck` stay (matrix pills, floating button, protected pill). Replace:

```tsx
import Link from "next/link"
import { Check, Download, Edit, Plus, ShieldAlert, ShieldCheck } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { ActiveBadge, ColumnHeader } from "@/components/master-data/master-data-layout"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
```

with:

```tsx
import Link from "next/link"
import { Check, Download, Pencil, Plus, ShieldCheck } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { formatCount } from "@/lib/display-format"
import { ActiveBadge } from "@/components/master-data/master-data-layout"
import { buttonVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow, TableEmptyRow } from "@/components/ui/data-table"
import { Nil, orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { RowActions } from "@/components/ui/row-actions"
import { StatStrip } from "@/components/ui/stat-strip"
```

(2) The page body `:82-240` (from `  return (` through the matrix section; the floating button `:242-250` below it stays byte for byte). Replace:

```tsx
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {canExport ? (
          <Link
            href="/api/admin/roles/export"
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Download className="h-4 w-4" />
            {t("exportAudit")}
          </Link>
        ) : null}
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <RoleAuditCard
          label={t("systemRoleCount")}
          value={systemRoles.length}
          detail={t("systemRoleCountDetail")}
          tone="primary"
        />
        <RoleAuditCard
          label={t("highRiskRoleCount")}
          value={highRiskRoles.length}
          detail={t("highRiskRoleCountDetail")}
          tone="warning"
        />
        <RoleAuditCard
          label={t("inactiveRoleWithUsers")}
          value={inactiveRolesWithUsers.length}
          detail={t("inactiveRoleWithUsersDetail")}
          tone={inactiveRolesWithUsers.length > 0 ? "danger" : "muted"}
        />
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-foreground">{t("roleSummary")}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <ColumnHeader>{t("role")}</ColumnHeader>
                <ColumnHeader>{t("description")}</ColumnHeader>
                <ColumnHeader align="right">{t("users")}</ColumnHeader>
                <ColumnHeader align="right">{t("permissions")}</ColumnHeader>
                <ColumnHeader>{t("type")}</ColumnHeader>
                <ColumnHeader>{tCommon("status")}</ColumnHeader>
                <ColumnHeader>{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {roles.map((role) => (
                <ClickableTableRow
                  key={role.id}
                  href={`/${locale}/admin/roles/${role.id}/edit`}
                  label={`${tCommon("edit")}: ${role.displayNameTh || role.displayName}`}
                >
                  <td className="min-w-64 px-4 py-3">
                    <div className="font-medium text-foreground">{role.displayNameTh || role.displayName}</div>
                    <div className="mt-1 font-mono text-xs text-muted-foreground">{role.name}</div>
                  </td>
                  <td className="min-w-64 px-4 py-3 text-muted-foreground">{role.description ?? "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-foreground">{role._count.userRoles}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-foreground">{role._count.rolePermissions}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${role.isSystem ? "bg-info-soft text-info" : "bg-muted text-muted-foreground"}`}>
                      {role.isSystem ? t("systemRole") : t("customRole")}
                    </span>
                    {role.name === "system_admin" ? (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-1 text-xs font-medium text-warning">
                        <ShieldCheck className="h-3 w-3" />
                        {t("protectedRole")}
                      </span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {role.isActive ? (
                      <ActiveBadge label={tCommon("active")} />
                    ) : (
                      <span className="inline-flex rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                        {tCommon("inactive")}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link
                      href={`/${locale}/admin/roles/${role.id}/edit`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-medium transition-colors hover:bg-accent"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      {tCommon("edit")}
                    </Link>
                  </td>
                </ClickableTableRow>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-foreground">{t("permissionMatrix")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("permissionMatrixSubtitle")}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <ColumnHeader>{t("module")}</ColumnHeader>
                {permissionActions.map((action) => (
                  <ColumnHeader key={action}>{t(`actions.${action}`)}</ColumnHeader>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {permissionModules.map((moduleName) => (
                <tr key={moduleName} className="hover:bg-row-hover">
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="font-medium text-foreground">{t(`modules.${moduleName}`)}</div>
                    <div className="mt-1 font-mono text-xs text-muted-foreground">{moduleName}</div>
                  </td>
                  {permissionActions.map((action) => {
                    const permissionKey = `${moduleName}:${action}`
                    const assignedRoles = roles.filter((role) => rolePermissions.get(role.id)?.has(permissionKey))

                    return (
                      <td key={permissionKey} className="min-w-44 px-4 py-3 align-top">
                        {assignedRoles.length === 0 ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {assignedRoles.map((role) => (
                              <span
                                key={role.id}
                                className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-1 text-xs font-medium text-success"
                                title={role.displayName}
                              >
                                <Check className="h-3 w-3" />
                                {role.displayNameTh || role.displayName}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
```

with:

```tsx
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          canExport ? (
            <Link href="/api/admin/roles/export" className={buttonVariants({ variant: "outline", size: "md" })}>
              <Download aria-hidden="true" />
              {t("exportAudit")}
            </Link>
          ) : undefined
        }
      />

      <StatStrip
        items={[
          { key: "systemRoles", label: t("systemRoleCount"), value: formatCount(systemRoles.length), foot: t("systemRoleCountDetail"), footTitle: t("systemRoleCountDetail") },
          { key: "highRiskRoles", label: t("highRiskRoleCount"), value: formatCount(highRiskRoles.length), foot: t("highRiskRoleCountDetail"), footTitle: t("highRiskRoleCountDetail") },
          {
            key: "inactiveRolesWithUsers",
            label: t("inactiveRoleWithUsers"),
            value: formatCount(inactiveRolesWithUsers.length),
            foot: t("inactiveRoleWithUsersDetail"),
            footTitle: t("inactiveRoleWithUsersDetail"),
            attention: inactiveRolesWithUsers.length > 0,
          },
        ]}
      />

      <ContentPanel divided flush className="overflow-hidden" title={t("roleSummary")}>
        <DataTable framed={false} caption={t("roleSummary")} scrollHint={tCommon("tableScrollHint")}>
          <DataTableHeader>
            <tr>
              <DataTableHead>{t("role")}</DataTableHead>
              <DataTableHead>{t("description")}</DataTableHead>
              <DataTableHead align="right">{t("users")}</DataTableHead>
              <DataTableHead align="right">{t("permissions")}</DataTableHead>
              <DataTableHead>{t("type")}</DataTableHead>
              <DataTableHead>{tCommon("status")}</DataTableHead>
              <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {roles.length === 0 ? (
              <TableEmptyRow colSpan={7}>{tCommon("noData")}</TableEmptyRow>
            ) : (
              roles.map((role) => {
                const roleName = role.displayNameTh || role.displayName
                const editHref = `/${locale}/admin/roles/${role.id}/edit`
                return (
                  <ClickableTableRow key={role.id} href={editHref} label={`${tCommon("edit")}: ${roleName}`}>
                    <DataTableCell className="min-w-64">
                      <div className="font-medium text-foreground">{roleName}</div>
                      <div className="mt-1 text-xs text-muted-foreground"><span className="tag">{role.name}</span></div>
                    </DataTableCell>
                    <DataTableCell className="min-w-64 text-muted-foreground">{orNil(role.description)}</DataTableCell>
                    <DataTableCell numeric className="font-medium text-foreground">{formatCount(role._count.userRoles)}</DataTableCell>
                    <DataTableCell numeric className="font-medium text-foreground">{formatCount(role._count.rolePermissions)}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${role.isSystem ? "bg-info-soft text-info" : "bg-muted text-muted-foreground"}`}>
                        {role.isSystem ? t("systemRole") : t("customRole")}
                      </span>
                      {role.name === "system_admin" ? (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-1 text-xs font-medium text-warning">
                          <ShieldCheck className="h-3 w-3" />
                          {t("protectedRole")}
                        </span>
                      ) : null}
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      {role.isActive ? (
                        <ActiveBadge label={tCommon("active")} />
                      ) : (
                        <span className="inline-flex rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                          {tCommon("inactive")}
                        </span>
                      )}
                    </DataTableCell>
                    <DataTableCell align="right" sticky="right">
                      <RowActions
                        code={role.name}
                        name={roleName}
                        menuLabel={tCommon("moreActionsFor", { code: role.name })}
                        next={{ label: tCommon("edit"), href: editHref, icon: <Pencil aria-hidden="true" /> }}
                        groups={[]}
                      />
                    </DataTableCell>
                  </ClickableTableRow>
                )
              })
            )}
          </DataTableBody>
        </DataTable>
      </ContentPanel>

      <ContentPanel divided flush className="overflow-hidden" title={t("permissionMatrix")} description={t("permissionMatrixSubtitle")}>
        <DataTable framed={false} caption={t("permissionMatrix")} scrollHint={tCommon("tableScrollHint")}>
          <DataTableHeader>
            <tr>
              <DataTableHead>{t("module")}</DataTableHead>
              {permissionActions.map((action) => (
                <DataTableHead key={action}>{t(`actions.${action}`)}</DataTableHead>
              ))}
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {permissionModules.map((moduleName) => (
              <DataTableRow key={moduleName}>
                <DataTableCell className="whitespace-nowrap">
                  <div className="font-medium text-foreground">{t(`modules.${moduleName}`)}</div>
                  <div className="mt-1 text-xs text-muted-foreground"><span className="tag">{moduleName}</span></div>
                </DataTableCell>
                {permissionActions.map((action) => {
                  const permissionKey = `${moduleName}:${action}`
                  const assignedRoles = roles.filter((role) => rolePermissions.get(role.id)?.has(permissionKey))

                  return (
                    <DataTableCell key={permissionKey} className="min-w-44">
                      {assignedRoles.length === 0 ? (
                        <Nil />
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {assignedRoles.map((role) => (
                            <span
                              key={role.id}
                              className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-1 text-xs font-medium text-success"
                              title={role.displayName}
                            >
                              <Check className="h-3 w-3" />
                              {role.displayNameTh || role.displayName}
                            </span>
                          ))}
                        </div>
                      )}
                    </DataTableCell>
                  )
                })}
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </ContentPanel>
```

(3) `RoleAuditCard` and `roleAuditToneClass` (`:253-285`, the closing brace of the page function above them stays). Replace:

```tsx
}

function RoleAuditCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: number
  detail: string
  tone: "primary" | "warning" | "danger" | "muted"
}) {
  return (
    <div className={`rounded-lg border p-4 ${roleAuditToneClass(tone)}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value.toLocaleString("th-TH")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <ShieldAlert className="h-5 w-5 shrink-0 text-current" />
      </div>
    </div>
  )
}

function roleAuditToneClass(tone: "primary" | "warning" | "danger" | "muted") {
  if (tone === "primary") return "border-primary-border bg-primary-soft text-primary"
  if (tone === "warning") return "border-warning-border bg-warning-soft text-warning"
  if (tone === "danger") return "border-danger-border bg-danger-soft text-danger"
  return "border-border bg-surface text-muted-foreground"
}
```

with:

```tsx
}
```

Check: `grep -nE 'ColumnHeader|RoleAuditCard|<thead|<th |font-mono|toLocaleString|"-"|>-<' "src/app/[locale]/(dashboard)/admin/roles/page.tsx"` prints nothing (exit 1); `grep -n 'shadow-lg' …` prints the one floating-button line.

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-primitives-ui.test.ts tests/row-actions-ui.test.ts`
Expected: PASS, `tests 132 · pass 132 · fail 0` (list-pages-ui 35 · list-frame-guards 21 · visual-foundation-guards 26 · form-migration-guards 23 · list-primitives-ui 19 · row-actions-ui 8).

Run: `node <temp>/p2b1-precheck.mjs --file "D/admin/roles/page.tsx"`
Expected (exit 0):
```
file    src/app/[locale]/(dashboard)/admin/roles/page.tsx (CRLF) · in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
R7         0       0     0     2
R2         1       –     –     1
LH1        0       0     0     1
LV2        0       0     0     1
LS1        0       0     0     1
args    (no row holds this file)
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b5-tw-probe.mjs "src/app/[locale]/(dashboard)/admin/roles/page.tsx"`
Expected: `checked 44 classes, missing 0` (exit 0).

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `tests 1981 · pass 1980 · fail 0 · skipped 1` (one test more than the baseline of 1980).
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors and the 146 warnings under `.agents/`; `npx eslint "src/app/[locale]/(dashboard)/admin/roles/page.tsx" tests/list-pages-ui.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 4 files: the page 146 insertions and 186 deletions, `tests/list-pages-ui.test.ts` 19 and 0, `tests/list-frame-guards.test.ts` 1 and 3 (the `MIGRATED_LIST_FILES` line in; the LH1, LV2 and LS1 rows out), `tests/visual-foundation-guards.test.ts` 0 and 1 (the R7 row). The page stays CRLF (`245 245` from `node -e "const s=require('fs').readFileSync(process.argv[1],'utf8');console.log((s.match(/\r\n/g)||[]).length,(s.match(/\n/g)||[]).length)" "src/app/[locale]/(dashboard)/admin/roles/page.tsx"`), and so does the test (`594 594`). A file that shows every line changed was normalized: restore its line endings before you commit.

- [ ] **Step 8: Commit**

```bash
git add "src/app/[locale]/(dashboard)/admin/roles/page.tsx" tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): roles and the permission matrix on PageHeader, StatStrip, DataTable and RowActions (2B-5 task 1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 18, spec §8.9 row `/th/admin/roles`):** at 1440 and 375: the header and the export button; the strip (two columns at 375, the third cell full width; the amber foot only when an inactive role still has users); both panels flush with the white header; at 375 both tables scroll inside their panel with the hint and the page itself does not scroll sideways; "แก้ไข" stays pinned while the role table scrolls; a row click and the "แก้ไข" link both open the role; Tab reaches the row, then "แก้ไข" (no ⋯ stop); the floating "เพิ่มบทบาท" still sits bottom right (2D); an empty matrix cell reads "ไม่มีข้อมูล" with NVDA.

---

### Task 2: `D/admin/logs/page.tsx` · real pages instead of the newest 100 (B4), the quick filters on TabNav, the filter form on the shared fields, and a DataTable whose change table in `<details>` still opens

Spec §8.9 row 2, §5.6 row `admin/logs`, §5.9.1, §5.9.2 row 1, §6.5 row 9, §6.13 table B items 5–6, §10.2 (keys `systemLogPage.empty`, `systemLogPage.emptyFiltered`), §10.4 table B row `list-pages-ui` (`<TabNav` of logs), I21, I34, rulings B4, R-g and controller rulings (a), (b), (c) and (e). One file, one commit (the page, its messages and its tests). The page and its tests are CRLF: exact-string replacements only.

Rulings this task applies:
- **B4, §5.9.1, §5.9.2 row 1:** the page reads `page` and `pageSize` with `parseListPage`; `listPageWindow` gives `skip`/`take` in place of `take: 100`; `prisma.systemLog.count({ where })` runs in the same `Promise.all`; `orderBy` becomes `[{ createdAt: "desc" }, { id: "asc" }]`. The `where` (module and action equal to the filters, as before) is one typed `Prisma.SystemLogWhereInput` shared by both calls. No index is added (B4); `IX_system_logs_createdAt` and `IX_system_logs_module_action_createdAt` cover the order and the filters.
- **§5.9.1 "เวลา query", §10.7 item 3:** `system_logs` grows with every action and an unfiltered `count` scans its index, so the pair runs inside `withPerformanceTiming("admin-logs.list-data", …)` (logged only with `PERFORMANCE_TIMING=1`). Plan 2B-2 measured its counts by navigation timing only; this is the one list the spec marks "สูง". `tests/performance-route-instrumentation.test.ts` is not edited (nobody edits it while 2C plan 5 runs, spec §8.3); Task 19 lists the label in the docs.
- **I21:** past the last page the page redirects to the last page with the same filters and page size.
- **§5.9.2 row 1 (departure in the means, not the URLs):** the spec gives `buildSystemLogFilterHref` (`src/lib/system-log-history.ts:78-88`) a third argument `{ pageSize }`. That lib file is read by `c/admin/system-settings-form.tsx` (2C plan 5's file) and pinned by `tests/system-log-history.test.ts:21-24`, which nobody edits while 2C plan 5 runs; it is not one of the 25 files of spec §8.9 either. So the lib stays as it is and the page appends the page size to its result (`quickFilterHref`): the same URLs, with the default page size left out, so every default link reads as before.
- **R-g, §5.6, §6.5 row 9:** the quick-filter chips (`:66-80`, hand-written `min-h-9` links) become `TabNav` without counts, named `t("quickFilters")` (the visible caption above the chips goes; the name stays for screen readers), with `current={activeQuickFilter}` (a custom module or action matches no tab, as before). It stays in the filter panel. `systemLogQuickFilters` stays imported and used (`tests/system-log-history.test.ts:77`).
- **§6.5 row 9, §6.4, I23:** the section becomes `FilterPanel`; the two raw `<input>`s with hand-written labels become `Field` + `Input` (`lg`, 40px from md, 44px below); the hand-written submit becomes `FilterFormActions submitLabel={t("filter")}` without `clear` (the "ทั้งหมด" tab clears the filters); the form gets `role="search"` and, when the page size is not 25, a hidden `pageSize` so a new filter keeps it. The page joins `MIGRATED_FILTER_FILES` (`tests/list-filters-ui.test.ts` item 5); with it the list holds the 10 `src/app` filter files of I34.
- **§5.6, §5.12, I3:** the table is a framed `DataTable` with `caption={t("title")}`, `scrollHint` and `Pagination` in its footer (`total > 0` only); the local `Head` (`uppercase`, LT1 1) goes; rows are `DataTableRow` (they had only a hover); the record link in its cell stays. The small table of changes inside `<details>` stays a small table with no fill and no capitals (§5.12), so it still opens and reads the same. VFG R7 1 → 0, LH1 1 → 0, LT1 1 → 0.
- **§10.2, §5.11:** the table had no empty row. It gets `TableEmptyRow colSpan={6}` with the new key `systemLogPage.empty` ("ยังไม่มีบันทึกระบบ") or, while a module or action filter is set, `systemLogPage.emptyFiltered` ("ไม่พบบันทึกที่ตรงกับตัวกรอง").
- **Copy that B4 makes untrue (open issue in the plan's Rulings):** `systemLogPage.subtitle` reads "ตรวจสอบประวัติการแก้ไขล่าสุด 100 รายการ" / "Review latest 100 audit trail entries"; after this task the page shows every entry, page by page. The change file sets it to "ตรวจสอบประวัติการแก้ไขข้อมูลในระบบ" / "Review the audit trail of changes in the system" (glossary: ประวัติการแก้ไข). This is the one value outside spec §10.2's table; the controller confirms the wording with the user before dispatch, and if the user declines, the two `subtitle` lines leave the change file, the `subtitle` assertion leaves the test block, and the expected message counts below drop to 2 per locale.
- **Spec §10.3, I15:** 2B does not touch the page again, so it joins `MIGRATED_LIST_FILES` (every counter 0).

What users will see on `/th/admin/logs`:
- The title is 600 and the help line no longer promises the newest 100 entries.
- The quick filters are underline tabs (44px tall on phones) in the filter panel; the module and action fields have the shared look with their labels above, and "กรอง" fills the row on phones.
- The table has the white 13px header without capitals and about 46px rows; under it "1–25 จาก N รายการ · หน้า 1 จาก M" with 25/50/100 and ก่อนหน้า/ถัดไป. Older entries are reachable for the first time (the list stopped at 100). A filter keeps the page size and starts at page 1.
- An empty list says "ยังไม่มีบันทึกระบบ", or "ไม่พบบันทึกที่ตรงกับตัวกรอง" while a filter is on. "ดูรายละเอียด" still opens the small table of changes.

Not in this task: `src/lib/system-log-history.ts` (unchanged) · `c/admin/system-settings-form.tsx` (2C plan 5) · `B4_LISTS` of `tests/list-pages-ui.test.ts` (the timed `Promise.all` does not fit its regex; this page gets its own test, as plan 2B-2 did for rounds and PM) · docs (Task 19). Do not run a formatter.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/admin/logs/page.tsx` (`i/lf w/crlf`; 5 exact replacements)
- Modify: `messages/th.json`, `messages/en.json` (`i/lf w/crlf`; through `node scripts/messages-edit.mjs` only: 2 new keys and 1 changed value per locale)
- Modify: `tests/list-pages-ui.test.ts` (`i/lf w/crlf`; one block appended with `p2b5-append.mjs`) · `tests/list-filters-ui.test.ts` (`i/lf w/crlf`; 1 exact replacement)
- Modify: `tests/list-frame-guards.test.ts`, `tests/visual-foundation-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only, never committed: `t02-pages-block.ts`, `t02-messages.json`

**Must keep passing without edits:**
- `tests/system-log-history.test.ts` (`:21-24` the two-argument `buildSystemLogFilterHref`; `:77` `systemLogQuickFilters` in the page) · `tests/list-pagination.test.ts` · `tests/thai-glossary.test.ts`
- `tests/list-filters-ui.test.ts` items 2, 6, 7, 8 · `tests/list-primitives-ui.test.ts` · `tests/form-migration-guards.test.ts`

**Interfaces:**
- Consumes: what Task 1 consumes, plus `FilterPanel({ title?, description?, children, className? })` and `FilterFormActions({ submitLabel, clear?, className? })` from `@/components/ui/filter-panel`; `Field({ label, … children })` from `@/components/ui/field`; `Input({ fieldSize? ("lg"), type?, … })` from `@/components/ui/input`; `TabNav({ "aria-label", items: { key, label, href, count?, icon? }[], current, scroll?, linkClassName?, className? })` from `@/components/ui/tab-nav`; `Pagination({ page, totalPages, previousHref, nextHref, labels, pageSize?, pageSizes? })` from `@/components/ui/pagination`; `LIST_PAGE_SIZES`, `parseListPage`, `listPageWindow`, `lastListPage`, `appendListPage` from `@/lib/list-pagination`; `paginationRange` from `@/lib/master-data-query`; `withPerformanceTiming(label, operation)` from `@/lib/performance-timing`; `type Prisma` from `@prisma/client`; Task 1's `p2b5-t1-precheck.mjs`, `p2b5-append.mjs`, `p2b5-tw-probe.mjs`.
- Produces:
  - The page in `MIGRATED_LIST_FILES` and in `MIGRATED_FILTER_FILES`; its rows gone from LFG `BUDGETS` and VFG `TABLE_HEADER_FILLS`; the timing label `admin-logs.list-data` (Task 19 lists it beside the other labels in DH "Operational Notes").
  - `systemLogPage.empty`, `systemLogPage.emptyFiltered` in both message files; `systemLogPage.subtitle` without "100".
  - The test `system log: real pages counted in the same timed Promise.all, TabNav quick filters, shared filter fields and a DataTable (spec 2B §5.6, §5.9.2 row 1)`.

| guard | `D/admin/logs/page.tsx` before → after | plan total (budget) before → after |
|---|---|---|
| VFG R7 | 1 → – | 7 in 5 rows → 6 in 4 |
| LFG LH1 | 1 → – | 17 → 16 (live 15 → 14) |
| LFG LT1 | 1 → – | 23 → 22 (live 21 → 20) |
| `MIGRATED_LIST_FILES` · `MIGRATED_FILTER_FILES` | – → joins both | 78 → 79 · 11 → 12 |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b5-t1-precheck.mjs 2`
Expected: `git status` prints nothing. The script prints (exit 0) the ten `ok` lines for the primitives and the keys (as in Task 1), then:
```
ok      Task 1 is in
ok      Task 2 has not run yet
ok      src/app/[locale]/(dashboard)/admin/logs/page.tsx is unchanged since 6835bdf (hash 81c229905308e172)
ok      tests/list-filters-ui.test.ts is unchanged since 6835bdf (hash 44acef8c69583b68)
info    src/app/[locale]/(dashboard)/admin/logs/page.tsx: CRLF
info    tests/list-filters-ui.test.ts: CRLF
preconditions hold for Task 2
```

Run: `node <temp>/p2b1-precheck.mjs --file "D/admin/logs/page.tsx"`
Expected (exit 0):
```
file    src/app/[locale]/(dashboard)/admin/logs/page.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
R7         1       1     0     1
LH1        1       1     0     1
LT1        1       1     0     1
args    R7=1:1 LH1=1:1 LT1=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol "src/app/[[]locale]/(dashboard)/admin/logs/page.tsx" tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts messages/th.json messages/en.json`
Expected: `i/lf w/crlf` for all seven.

- [ ] **Step 2: Write the failing tests**

(a) `tests/list-filters-ui.test.ts` (CRLF): put the page in `MIGRATED_FILTER_FILES`. Replace (`:34-35`):

```ts
  "src/components/admin/asset-state-review-workspace.tsx",
]
```

with:

```ts
  "src/components/admin/asset-state-review-workspace.tsx",
  "src/app/[locale]/(dashboard)/admin/logs/page.tsx",
]
```

(b) `tests/list-pages-ui.test.ts` (CRLF; it strips `\r`): save this block as `<temp>/t02-pages-block.ts`:

```ts
// Plan 2B-5 Task 2 (spec 2B §5.6 row admin/logs, §5.9.2 row 1, §6.5 row 9, B4): the system log pages for real (it
// stopped at the newest 100 entries), its quick filters are TabNav, its filter form uses the shared fields, and the
// table is a DataTable whose small table of changes inside <details> still opens.
test("system log: real pages counted in the same timed Promise.all, TabNav quick filters, shared filter fields and a DataTable (spec 2B §5.6, §5.9.2 row 1)", () => {
  const source = read(`${D}admin/logs/page.tsx`)
  for (const part of ["<PageHeader", "<FilterPanel>", '<form role="search"', "<FilterFormActions", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<DataTableRow", "<TableEmptyRow colSpan={6}>", "<Pagination", "<details"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /<TabNav\n\s+aria-label=\{t\("quickFilters"\)\}/)
  assert.match(source, /const listPage = parseListPage\(\{ page: rawFilters\.page, pageSize: rawFilters\.pageSize \}\)/)
  assert.match(source, /const \{ skip, take \} = listPageWindow\(listPage\)/)
  assert.match(source, /await withPerformanceTiming\("admin-logs\.list-data", \(\) => Promise\.all\(\[\n\s+prisma\.systemLog\.findMany\(\{[\s\S]*?orderBy: \[\{ createdAt: "desc" \}, \{ id: "asc" \}\],\n\s+skip,\n\s+take,\n\s+\}\),\n\s+prisma\.systemLog\.count\(\{ where \}\),\n\s+\]\)\)/, "findMany and count in one timed Promise.all, the old order plus id")
  assert.doesNotMatch(source, /\btake: \d+/, "no fixed number of rows")
  assert.match(source, /^import \{ redirect \} from "next\/navigation"$/m)
  assert.match(source, /const lastPage = lastListPage\(total, listPage\.pageSize\)\n\s+if \(logs\.length === 0 && total > 0 && listPage\.page > lastPage\) \{\n\s+redirect\(/)
  assert.match(source, /appendListPage\(new URLSearchParams\(query\), \{ pageSize: listPage\.pageSize \}\)/, "a quick filter goes back to page 1 and keeps the page size")
  assert.match(source, /\{listPage\.pageSize !== LIST_PAGE_SIZES\[0\] \? <input type="hidden" name="pageSize" value=\{listPage\.pageSize\} \/> : null\}/, "the filter form keeps the page size")
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: listHref\(\{ pageSize: value \}\) \}\)\)\}/)
  assert.match(source, /\{hasFilters \? t\("emptyFiltered"\) : t\("empty"\)\}/)
  assert.doesNotMatch(source, /function Head\b|<thead className=|\buppercase\b|<label\b/)
  for (const locale of ["th", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { systemLogPage: Record<string, unknown> }
    for (const key of ["empty", "emptyFiltered"]) assert.equal(typeof messages.systemLogPage[key], "string", `${locale}: systemLogPage.${key}`)
    assert.doesNotMatch(String(messages.systemLogPage.subtitle), /100/, `${locale}: the subtitle no longer promises the newest 100 entries`)
  }
})
```

Run: `node <temp>/p2b5-append.mjs <temp>/t02-pages-block.ts tests/list-pages-ui.test.ts`
Expected: `appended <temp>/t02-pages-block.ts to tests/list-pages-ui.test.ts (CRLF)`

Run: `node --test tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts`
Expected: FAIL, `tests 41 · pass 39 · fail 2` (list-pages-ui 36 · list-filters-ui 5):
- `migrated filter forms use Field, SearchField and FilterSelect only, and every form is a search landmark (item 5)`: `src/app/[locale]/(dashboard)/admin/logs/page.tsx: only hidden inputs may stay raw`
- `system log: real pages counted in the same timed Promise.all, TabNav quick filters, shared filter fields and a DataTable (spec 2B §5.6, §5.9.2 row 1)`: `no <PageHeader`

- [ ] **Step 3: The message keys**

Save this file as `<temp>/t02-messages.json` (UTF-8):

```json
{
  "set": {
    "th": {
      "systemLogPage.subtitle": "ตรวจสอบประวัติการแก้ไขข้อมูลในระบบ",
      "systemLogPage.empty": "ยังไม่มีบันทึกระบบ",
      "systemLogPage.emptyFiltered": "ไม่พบบันทึกที่ตรงกับตัวกรอง"
    },
    "en": {
      "systemLogPage.subtitle": "Review the audit trail of changes in the system",
      "systemLogPage.empty": "No system log entries yet",
      "systemLogPage.emptyFiltered": "No entries match the filters"
    }
  }
}
```

Run from the repo root: `node scripts/messages-edit.mjs <temp>/t02-messages.json`
Expected: `messages updated: 3 th, 3 en, 0 deleted`. `git diff --numstat messages` shows `4 2` for each file (`subtitle` changed in place; the comma after the last key of `systemLogPage`, `field_response_nextCursor`; the two new last keys). Both files stay CRLF (`4314 4314`).

Run: `node --test tests/thai-glossary.test.ts`
Expected: PASS, `tests 3 · pass 3 · fail 0`.

- [ ] **Step 4: Lower the guard rows of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs "D/admin/logs/page.tsx" R7=1:0 LH1=1:0 LT1=1:0 --migrated`
Expected (exit 0):
```
R7: 1 -> 0 (row deleted)
LH1: 1 -> 0 (row deleted)
LT1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/admin/logs/page.tsx
```

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 43 · fail 4`, each naming only `src/app/[locale]/(dashboard)/admin/logs/page.tsx`: `LH1 …` (`LH1: 15 in 15 files`, `1 > 0`) · `LT1 table headers have no solid muted or accent fill and no capitals` (`21 in 6`, `1 > 0`) · `L0 …` (`LH1 …: 1 > 0`, `LT1 …: 1 > 0`) · VFG `R7 interim: …` (`7 matches in 5 files; over budget:` and `…/admin/logs/page.tsx: 1 > 0`).

- [ ] **Step 5: Move the page onto the primitives and the paged query (`src/app/[locale]/(dashboard)/admin/logs/page.tsx`, CRLF)**

Five exact replacements, top to bottom. Make all five before you compile.

(1) Imports and the props type `:1-19` (`type React` goes with `Head`; the paging helpers, the timing and the primitives come in; `searchParams` gains `page` and `pageSize`). Replace:

```tsx
import Link from "next/link"
import type React from "react"
import { getMessages, getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import {
  buildSystemLogFilterHref,
  resolveSystemLogQuickFilter,
  systemLogQuickFilters,
  type SystemLogQuickFilterKey,
} from "@/lib/system-log-history"
import { buildSystemLogRecordLabels } from "@/lib/system-log-record-labels"
import { buildSystemLogPresentation } from "@/lib/system-log-presenter"
import { formatDateTime } from "@/lib/utils"

type LogsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ module?: string | string[]; action?: string | string[] }>
}
```

with:

```tsx
import Link from "next/link"
import { redirect } from "next/navigation"
import type { Prisma } from "@prisma/client"
import { getMessages, getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, appendListPage, lastListPage, listPageWindow, parseListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { withPerformanceTiming } from "@/lib/performance-timing"
import {
  buildSystemLogFilterHref,
  resolveSystemLogQuickFilter,
  systemLogQuickFilters,
  type SystemLogQuickFilterKey,
} from "@/lib/system-log-history"
import { buildSystemLogRecordLabels } from "@/lib/system-log-record-labels"
import { buildSystemLogPresentation } from "@/lib/system-log-presenter"
import { formatDateTime } from "@/lib/utils"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow, TableEmptyRow } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { TabNav } from "@/components/ui/tab-nav"

type LogsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ module?: string | string[]; action?: string | string[]; page?: string | string[]; pageSize?: string | string[] }>
}
```

(2) `:29` (the pagination labels are common words). Replace:

```tsx
  const t = await getTranslations("systemLogPage")
```

with:

```tsx
  const t = await getTranslations("systemLogPage")
  const tCommon = await getTranslations("common")
```

(3) The query `:35-43` (the newest 100 rows) becomes the page window, the count and the redirect past the last page; the link builders come first, because the redirect uses `listHref`. Replace:

```tsx
  const logs = await prisma.systemLog.findMany({
    where: {
      ...(filters.module ? { module: filters.module } : {}),
      ...(filters.action ? { action: filters.action } : {}),
    },
    include: { user: { select: { username: true, displayName: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  })
```

with:

```tsx
  const listPage = parseListPage({ page: rawFilters.page, pageSize: rawFilters.pageSize })
  const basePath = `/${locale}/admin/logs`
  // The list URL keeps the module and action filters; the default page and page size stay out of it (spec 2B B4).
  const listHref = (next: { page?: number; pageSize?: number }) => {
    const query = new URLSearchParams()
    if (filters.module) query.set("module", filters.module)
    if (filters.action) query.set("action", filters.action)
    const search = appendListPage(query, next).toString()
    return search ? `${basePath}?${search}` : basePath
  }
  // A quick filter goes back to page 1 and keeps the page size; buildSystemLogFilterHref itself stays as it is.
  const quickFilterHref = (key: SystemLogQuickFilterKey) => {
    const [path, query = ""] = buildSystemLogFilterHref(locale, key).split("?")
    const search = appendListPage(new URLSearchParams(query), { pageSize: listPage.pageSize }).toString()
    return search ? `${path}?${search}` : path
  }

  const where: Prisma.SystemLogWhereInput = {
    ...(filters.module ? { module: filters.module } : {}),
    ...(filters.action ? { action: filters.action } : {}),
  }
  const { skip, take } = listPageWindow(listPage)
  // Real pages instead of the newest 100 (spec 2B §5.9.2 row 1). The count runs on a table that grows with every
  // action, so the pair is timed (PERFORMANCE_TIMING=1); 2B adds no index (B4, spec §10.7 item 3).
  const [logs, total] = await withPerformanceTiming("admin-logs.list-data", () => Promise.all([
    prisma.systemLog.findMany({
      where,
      include: { user: { select: { username: true, displayName: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip,
      take,
    }),
    prisma.systemLog.count({ where }),
  ]))
  // A page past the last one (an old link, or a filter that now finds fewer entries) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listPage.pageSize)
  if (logs.length === 0 && total > 0 && listPage.page > lastPage) {
    redirect(listHref({ page: lastPage, pageSize: listPage.pageSize }))
  }
  const { start, end, totalPages } = paginationRange(listPage.page, listPage.pageSize, total)
```

(4) `:50-54`: one more line under the quick filters, for the empty row. Replace:

```tsx
  const activeQuickFilter = resolveSystemLogQuickFilter(filters)
  const quickFilters: Array<{ key: SystemLogQuickFilterKey; labelKey: string }> = [
    { key: "all", labelKey: "quickFilterAll" },
    ...systemLogQuickFilters.map((filter) => ({ key: filter.key, labelKey: filter.labelKey })),
  ]
```

with:

```tsx
  const activeQuickFilter = resolveSystemLogQuickFilter(filters)
  const quickFilters: Array<{ key: SystemLogQuickFilterKey; labelKey: string }> = [
    { key: "all", labelKey: "quickFilterAll" },
    ...systemLogQuickFilters.map((filter) => ({ key: filter.key, labelKey: filter.labelKey })),
  ]
  const hasFilters = Boolean(filters.module || filters.action)
```

(5) The page body and the local `Head` `:56-179` (`getSearchParam` below stays). The cells of the six columns keep their content and classes; the `<details>` block moves two spaces left, byte for byte otherwise. Replace:

```tsx
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <section className="rounded-lg border border-border bg-surface p-4">
        <div className="mb-4">
          <div className="mb-2 text-xs font-medium text-muted-foreground">{t("quickFilters")}</div>
          <div className="flex flex-wrap gap-2">
            {quickFilters.map((filter) => (
              <Link
                key={filter.key}
                href={buildSystemLogFilterHref(locale, filter.key)}
                className={`inline-flex min-h-9 items-center rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeQuickFilter === filter.key
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {t(filter.labelKey)}
              </Link>
            ))}
          </div>
        </div>
        <form className="grid grid-cols-1 gap-3 md:grid-cols-4" action={`/${locale}/admin/logs`}>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("module")}</span>
            <input name="module" defaultValue={filters.module ?? ""} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("action")}</span>
            <input name="action" defaultValue={filters.action ?? ""} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
          </label>
          <button type="submit" className="h-10 self-end rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover">
            {t("filter")}
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <Head>{t("date")}</Head>
                <Head>{t("user")}</Head>
                <Head>{t("module")}</Head>
                <Head>{t("action")}</Head>
                <Head>{t("record")}</Head>
                <Head>{t("detail")}</Head>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayLogs.map((log) => (
                <tr key={log.id} className="hover:bg-row-hover">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(log.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-foreground">{log.userLabel}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{log.moduleLabel}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-foreground">{log.actionLabel}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {log.href ? (
                      <Link href={log.href} className="font-medium text-primary hover:underline">
                        {log.recordLabel}
                      </Link>
                    ) : (
                      log.recordLabel
                    )}
                  </td>
                  <td className="min-w-[28rem] px-4 py-3 text-muted-foreground">
                    <div className="space-y-2">
                      <p className="font-medium text-foreground">{log.summary}</p>
                      {(log.changes.length > 0 || log.remark) ? (
                        <details className="group">
                          <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
                            {t("viewDetails")}
                          </summary>
                          <div className="mt-2 space-y-2 rounded-md border border-border bg-background p-3">
                            {log.changes.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-xs">
                                  <thead>
                                    <tr className="text-muted-foreground">
                                      <th className="pb-1 pr-3 text-left font-medium">{t("field")}</th>
                                      <th className="pb-1 pr-3 text-left font-medium">{t("before")}</th>
                                      <th className="pb-1 text-left font-medium">{t("after")}</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border">
                                    {log.changes.map((change, index) => (
                                      <tr key={`${log.id}-${change.field}-${index}`}>
                                        <td className="py-1.5 pr-3 text-foreground">{change.field}</td>
                                        <td className="py-1.5 pr-3">{change.before}</td>
                                        <td className="py-1.5 text-foreground">{change.after}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : null}
                            {log.remark ? (
                              <p className="text-xs">
                                <span className="font-medium text-foreground">{t("remark")}:</span> {log.remark}
                              </p>
                            ) : null}
                          </div>
                        </details>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Head({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{children}</th>
}
```

with:

```tsx
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} meta={t("subtitle")} />

      <FilterPanel>
        <TabNav
          aria-label={t("quickFilters")}
          items={quickFilters.map((filter) => ({ key: filter.key, label: t(filter.labelKey), href: quickFilterHref(filter.key) }))}
          current={activeQuickFilter}
          className="mb-4"
        />
        <form role="search" className="grid grid-cols-1 gap-3 md:grid-cols-4" action={basePath}>
          {listPage.pageSize !== LIST_PAGE_SIZES[0] ? <input type="hidden" name="pageSize" value={listPage.pageSize} /> : null}
          <Field label={t("module")}>
            <Input name="module" defaultValue={filters.module ?? ""} />
          </Field>
          <Field label={t("action")}>
            <Input name="action" defaultValue={filters.action ?? ""} />
          </Field>
          <FilterFormActions submitLabel={t("filter")} />
        </form>
      </FilterPanel>

      <DataTable
        caption={t("title")}
        scrollHint={tCommon("tableScrollHint")}
        footer={
          total > 0 ? (
            <Pagination
              page={listPage.page}
              totalPages={totalPages}
              previousHref={listHref({ page: listPage.page - 1, pageSize: listPage.pageSize })}
              nextHref={listHref({ page: listPage.page + 1, pageSize: listPage.pageSize })}
              pageSize={listPage.pageSize}
              pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: listHref({ pageSize: value }) }))}
              labels={{
                navigation: tCommon("pagination"),
                previous: tCommon("previous"),
                next: tCommon("next"),
                pageOf: tCommon("pageOf", { page: listPage.page, total: totalPages }),
                range: tCommon("showingRange", { from: formatCount(start), to: formatCount(end), total: formatCount(total) }),
                pageSizeGroup: tCommon("pageSizeLabel"),
                rowsPerPage: tCommon("rowsPerPage"),
              }}
            />
          ) : undefined
        }
      >
        <DataTableHeader>
          <tr>
            <DataTableHead>{t("date")}</DataTableHead>
            <DataTableHead>{t("user")}</DataTableHead>
            <DataTableHead>{t("module")}</DataTableHead>
            <DataTableHead>{t("action")}</DataTableHead>
            <DataTableHead>{t("record")}</DataTableHead>
            <DataTableHead>{t("detail")}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {displayLogs.length === 0 ? (
            <TableEmptyRow colSpan={6}>{hasFilters ? t("emptyFiltered") : t("empty")}</TableEmptyRow>
          ) : (
            displayLogs.map((log) => (
              <DataTableRow key={log.id}>
                <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(log.createdAt)}</DataTableCell>
                <DataTableCell className="whitespace-nowrap text-foreground">{log.userLabel}</DataTableCell>
                <DataTableCell className="whitespace-nowrap text-muted-foreground">{log.moduleLabel}</DataTableCell>
                <DataTableCell className="whitespace-nowrap text-foreground">{log.actionLabel}</DataTableCell>
                <DataTableCell className="whitespace-nowrap text-muted-foreground">
                  {log.href ? (
                    <Link href={log.href} className="font-medium text-primary hover:underline">
                      {log.recordLabel}
                    </Link>
                  ) : (
                    log.recordLabel
                  )}
                </DataTableCell>
                <DataTableCell className="min-w-[28rem] text-muted-foreground">
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">{log.summary}</p>
                    {(log.changes.length > 0 || log.remark) ? (
                      <details className="group">
                        <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
                          {t("viewDetails")}
                        </summary>
                        <div className="mt-2 space-y-2 rounded-md border border-border bg-background p-3">
                          {log.changes.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-xs">
                                <thead>
                                  <tr className="text-muted-foreground">
                                    <th className="pb-1 pr-3 text-left font-medium">{t("field")}</th>
                                    <th className="pb-1 pr-3 text-left font-medium">{t("before")}</th>
                                    <th className="pb-1 text-left font-medium">{t("after")}</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {log.changes.map((change, index) => (
                                    <tr key={`${log.id}-${change.field}-${index}`}>
                                      <td className="py-1.5 pr-3 text-foreground">{change.field}</td>
                                      <td className="py-1.5 pr-3">{change.before}</td>
                                      <td className="py-1.5 text-foreground">{change.after}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : null}
                          {log.remark ? (
                            <p className="text-xs">
                              <span className="font-medium text-foreground">{t("remark")}:</span> {log.remark}
                            </p>
                          ) : null}
                        </div>
                      </details>
                    ) : null}
                  </div>
                </DataTableCell>
              </DataTableRow>
            ))
          )}
        </DataTableBody>
      </DataTable>
    </div>
  )
}
```

Check: `grep -nE 'take: [0-9]|<h1|bg-muted/|uppercase|function Head|<label' "src/app/[locale]/(dashboard)/admin/logs/page.tsx"` prints nothing (exit 1); `grep -c '<table' …` prints `1` (the change table in `<details>`).

- [ ] **Step 6: Run the tests for this task**

Run: `node --test tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/system-log-history.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-primitives-ui.test.ts tests/list-pagination.test.ts tests/thai-glossary.test.ts`
Expected: PASS, `tests 145 · pass 145 · fail 0` (list-pages-ui 36 · list-filters-ui 5 · system-log-history 3 · list-frame-guards 21 · visual-foundation-guards 26 · form-migration-guards 23 · list-primitives-ui 19 · list-pagination 9 · thai-glossary 3).

Run: `node <temp>/p2b1-precheck.mjs --file "D/admin/logs/page.tsx"`
Expected (exit 0): `· in MIGRATED_LIST_FILES`, the rows `R7 0 0 0 1`, `LH1 0 0 0 1`, `LT1 0 0 0 1` and `args    (no row holds this file)`.

- [ ] **Step 7: Prove every class compiles**

Run: `node <temp>/p2b5-tw-probe.mjs "src/app/[locale]/(dashboard)/admin/logs/page.tsx"`
Expected: `checked 31 classes, missing 0` (exit 0).

- [ ] **Step 8: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` `tests 1982 · pass 1981 · fail 0 · skipped 1`; tsc no errors (the `Prisma.SystemLogWhereInput` constant and the tuple through `withPerformanceTiming` compile); lint 0 errors and the 146 warnings under `.agents/` (`npx eslint "src/app/[locale]/(dashboard)/admin/logs/page.tsx" tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts` prints nothing).

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 7 files: the page 173 insertions and 126 deletions, `messages/th.json` and `messages/en.json` 4 and 2 each, `tests/list-filters-ui.test.ts` 1 and 0, `tests/list-frame-guards.test.ts` 1 and 2, `tests/list-pages-ui.test.ts` 27 and 0, `tests/visual-foundation-guards.test.ts` 0 and 1. The page stays CRLF (`230 230`).

- [ ] **Step 9: Commit**

```bash
git add "src/app/[locale]/(dashboard)/admin/logs/page.tsx" messages/th.json messages/en.json tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): system log paged on the server, its quick filters on TabNav and its table on DataTable (2B-5 task 2, B4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 7 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 18, spec §8.9 row `/th/admin/logs`):** at 1440 and 375: the footer total is above 100 when the dev database has more entries (it stopped at 100); `?pageSize=50&page=2` keeps both while a quick filter goes to page 1 with `pageSize=50`; `?page=999` lands on the last page; the module/action form keeps the page size; "ดูรายละเอียด" opens and closes the change table inside the scrolling table; at 375 the table scrolls inside its frame with the hint and the page does not scroll sideways; the empty texts (a module that does not exist: "ไม่พบบันทึกที่ตรงกับตัวกรอง"); with `PERFORMANCE_TIMING=1` on the production server the log shows `admin-logs.list-data`: record its time unfiltered and with one quick filter in DH (spec §10.6 row 2B-5 `docs/03_DATABASE.md`); no index (B4).

---

### Task 3: `D/admin/storage/page.tsx` · three DataTables that scroll sideways instead of `getTableShellClasses()` (bug §5.10 #6), two StatStrips, counts through `formatCount`, every module code as its label

Spec §8.9 row 3, §5.6 row `admin/storage`, §5.1, §5.7, §5.8 row "ตารางที่ไม่มีรายการมือถือแต่ไม่อยู่ใน B6", §5.10 #6 and #10, §5.12 (the 10/20/10 caps stay), §10.4 table A row 2B-5 (`storage-archive-ui.test.ts:16`), rulings R-d, R-n, R-p and controller rulings (a), (b) and (e). One file, one commit. The page and its tests are CRLF: exact-string replacements only.

Rulings this task applies:
- **§5.10 #6, B6:** the three tables sat in `getTableShellClasses()` (`overflow-hidden`, `:97`, `:153`, `:248`), so on a phone their right columns were cut off with no way to scroll. Each becomes `DataTable framed={false} className="mt-4"` (they sit in padded panels, so no frame in a frame: DS "Detail pages" rule), with `caption` = the panel title and `scrollHint={tCommon("tableScrollHint")}`; its own scroller is `overflow-x-auto`. The hand-written `th` (`uppercase`, LT1 11) become `DataTableHead` (`align="right"` for size, action, file count and upload date); rows are `DataTableRow`. The page no longer calls `getTableShellClasses()` (its last caller; Task 16 deletes it with `tests/design-system.test.ts`) nor `getEmptyStateClasses()` (helper stays for 2D). VFG R7 3 → 0.
- **§5.6, LT3:** the two hand-written empty rows (`<td colSpan={4}>`, `:110`, `:261`) become `TableEmptyRow` with the same texts; the module table had none and gets `TableEmptyRow colSpan={3}` with `tCommon("noData")`. The review list's boxed empty state (`getEmptyStateClasses()`) becomes `EmptyNote`. LT3 2 → 0.
- **§5.6, R-d, LS1:** the four tinted `SummaryCard`s become one `StatStrip`: active files (foot: the inactive count), total size (`formatStorageSize`, its unit stays in the value: §5.1 "ขนาดไฟล์คงหน่วยในเซลล์"), large files (foot: the 10 MB rule), needs review (foot and `footTitle`: what it counts; `attention` when above 0). The three tinted dry-run boxes (`:82-95`) become a second `StatStrip` under the dry-run heading. `SummaryCard` and its icons go.
- **§5.7, LV1:** the seven bare `toLocaleString()` (`:70`, `:72`, `:73`, `:84`, `:88`, `:92`, `:166`) are `formatCount`; size cells are `numeric` (right, one line, tabular figures). LV1 7 → 0.
- **§5.10 #10, R-n, R-p:** the review list printed the raw module code (`{item.module}`, `:219`); it now reads `moduleLabel(item.module, t)` like the two tables, and the reference id is a `tag`. A missing path is `orNil(item.filePath)` (it was `|| "-"`, `:223`). LV2 1 → 0.
- **Not in this task (departure from §5.6, the archive button):** §5.6 moves `StorageArchiveButton` to `Button variant="outline" size="sm" busy` inside `c/admin/storage-archive-button.tsx`. That file is not one of the 25 files of spec §8.9 (the plan's fence with 2C plan 5), so it stays for 2D; the page renders it where it was. The 10 / 20 / 10 caps of the three lists stay (§5.12).
- **Spec §10.3, I15:** 2B does not touch the page again, so it joins `MIGRATED_LIST_FILES` (every counter 0).

What users will see on `/th/admin/storage`:
- The title is 600; the four tinted boxes are one flat strip of numbers with their help lines (needs review in amber with an icon when above 0); the dry-run counts are a second strip under their heading.
- The three tables have the white 13px header without capitals and scroll sideways on a phone with the hint above them (before, their right columns were cut off); sizes and counts are right-aligned.
- The review list names each module in words (it showed `asset`, `maintenance` …) and shows "—" for a missing path. The archive button looks as before.

Not in this task: `c/admin/storage-archive-button.tsx` (2D) · `src/lib/design-system.ts` (Task 16) · `src/lib/storage-governance.ts` · docs (Task 19). Do not run a formatter.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/admin/storage/page.tsx` (`i/lf w/crlf`; 6 exact replacements)
- Modify: `tests/storage-archive-ui.test.ts` (`i/lf w/crlf`; 1 exact replacement, spec §10.4 table A) · `tests/list-pages-ui.test.ts` (`i/lf w/crlf`; one block appended)
- Modify: `tests/list-frame-guards.test.ts`, `tests/visual-foundation-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only, never committed: `t03-pages-block.ts`

**Must keep passing without edits:**
- `tests/storage-archive-ui.test.ts:9-15`, `:17-29` (the archive button only for orphan files, after `action.action === "archive_orphan_file"` and `canArchiveStorageFiles`, before `t("archiveUnavailable")`), `:31-39` (every `t("…")` of the page is a `storagePage` key; `tCommon` is not read by it), `:41-48`, `:50-65`
- `tests/design-system.test.ts` (`getTableShellClasses` and `getEmptyStateClasses` stay until Task 16 and 2D) · `tests/form-migration-guards.test.ts`

**Interfaces:**
- Consumes: what Task 1 consumes, plus `EmptyNote({ tone?, icon?, padded?, … })` from `@/components/ui/empty-note`; `formatStorageSize` (unchanged import); Task 1's scripts.
- Produces: the page without `SummaryCard`, `getTableShellClasses()` and `getEmptyStateClasses()`; in `MIGRATED_LIST_FILES`; `getTableShellClasses` has no caller left in `src` (Task 16); the test `storage: PageHeader, two StatStrips and three DataTables that scroll sideways, with every module code as its label (spec 2B §5.6, §5.10 #6, #10)`.

| guard | `D/admin/storage/page.tsx` before → after | plan total (budget) before → after |
|---|---|---|
| VFG R7 | 3 → – | 6 in 4 rows → 3 in 3 |
| LFG LH1 · LT1 · LT3 | 1 · 11 · 2 → – | 16 → 15 · 22 → 11 · 2 → 0 (BUDGETS.LT3 empty) |
| LFG LV1 · LV2 · LS1 | 7 · 1 · 1 → – | 15 → 8 · 72 → 71 · 13 → 12 |
| `MIGRATED_LIST_FILES` | – → joins | 79 → 80 |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b5-t1-precheck.mjs 3`
Expected: `git status` prints nothing. The script prints (exit 0) the ten `ok` lines for the primitives and the keys, then:
```
ok      Task 1 is in
ok      Task 2 is in
ok      Task 3 has not run yet
ok      src/app/[locale]/(dashboard)/admin/storage/page.tsx is unchanged since 6835bdf (hash ae06aded7d170176)
ok      tests/storage-archive-ui.test.ts is unchanged since 6835bdf (hash 2f9d35149d0105f7)
info    src/app/[locale]/(dashboard)/admin/storage/page.tsx: CRLF
info    tests/storage-archive-ui.test.ts: CRLF
preconditions hold for Task 3
```

Run: `node <temp>/p2b1-precheck.mjs --file "D/admin/storage/page.tsx"`
Expected (exit 0):
```
file    src/app/[locale]/(dashboard)/admin/storage/page.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
R7         3       3     0     3
LH1        1       1     0     1
LT1       11      11     0    11
LT3        2       2     0     2
LV1        7       7     0     7
LV2        1       1     0     1
LS1        1       1     0     1
args    R7=3:3 LH1=1:1 LT1=11:11 LT3=2:2 LV1=7:7 LV2=1:1 LS1=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol "src/app/[[]locale]/(dashboard)/admin/storage/page.tsx" tests/storage-archive-ui.test.ts tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: `i/lf w/crlf` for all five.

- [ ] **Step 2: Write the failing tests**

(a) `tests/storage-archive-ui.test.ts:16` (CRLF, read raw; spec §10.4 table A). Replace:

```ts
  assert.match(source, /<th[^>]*>\{t\("action"\)\}<\/th>/)
```

with:

```ts
  assert.match(source, /<DataTableHead\b[^>]*>\{t\("action"\)\}<\/DataTableHead>/)
```

(b) `tests/list-pages-ui.test.ts`: save this block as `<temp>/t03-pages-block.ts`:

```ts
// Plan 2B-5 Task 3 (spec 2B §5.6 row admin/storage, bugs §5.10 #6 and #10, R-d): the three storage tables scroll
// sideways inside their DataTable shell (getTableShellClasses() clipped them with overflow-hidden), the tiles are two
// StatStrips with no tone fill, counts go through formatCount, and every module code reads as its label.
test("storage: PageHeader, two StatStrips and three DataTables that scroll sideways, with every module code as its label (spec 2B §5.6, §5.10 #6, #10)", () => {
  const source = read(`${D}admin/storage/page.tsx`)
  for (const part of ["<PageHeader", "<DataTableHeader>", "<DataTableBody>", "<DataTableRow", "<TableEmptyRow colSpan={4}>", "<TableEmptyRow colSpan={3}>", "<EmptyNote>"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.equal(source.match(/<StatStrip\b/g)?.length, 2, "the summary and the dry-run counts")
  assert.equal(source.match(/<DataTable framed=\{false\} className="mt-4" caption=\{(?:t\("(?:filesystemDryRun|moduleBreakdown)"\)|title)\} scrollHint=\{(?:tCommon\("tableScrollHint"\)|scrollHint)\}>/g)?.length, 3, "three tables in padded panels, flush, with the scroll hint (B6)")
  assert.match(source, /attention: reviewNeededCount > 0,/)
  assert.match(source, /\{moduleLabel\(item\.module, t\)\} · <span className="tag">\{item\.referenceId\}<\/span>/, "bug §5.10 #10: the review list names the module, not its code")
  assert.match(source, /\{orNil\(item\.filePath\)\}/)
  assert.equal(source.match(/<StorageArchiveButton relativePath=\{action\.relativePath\} \/>/g)?.length, 1)
  assert.doesNotMatch(source, /getTableShellClasses|getEmptyStateClasses|function SummaryCard\b|<thead\b|<th\b|<td colSpan|toLocaleString\(|"-"|\buppercase\b/)
})
```

Run: `node <temp>/p2b5-append.mjs <temp>/t03-pages-block.ts tests/list-pages-ui.test.ts`
Expected: `appended <temp>/t03-pages-block.ts to tests/list-pages-ui.test.ts (CRLF)`

Run: `node --test tests/list-pages-ui.test.ts tests/storage-archive-ui.test.ts`
Expected: FAIL, `tests 41 · pass 39 · fail 2` (list-pages-ui 37 · storage-archive-ui 4):
- `storage: PageHeader, two StatStrips and three DataTables that scroll sideways, with every module code as its label (spec 2B §5.6, §5.10 #6, #10)`: `no <PageHeader`
- `storage page uses the archive button only for orphan file actions`: the input did not match the regular expression `/<DataTableHead\b[^>]*>\{t\("action"\)\}<\/DataTableHead>/`

- [ ] **Step 3: Lower the guard rows of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs "D/admin/storage/page.tsx" R7=3:0 LH1=1:0 LT1=11:0 LT3=2:0 LV1=7:0 LV2=1:0 LS1=1:0 --migrated`
Expected (exit 0):
```
R7: 3 -> 0 (row deleted)
LH1: 1 -> 0 (row deleted)
LT1: 11 -> 0 (row deleted)
LT3: 2 -> 0 (row deleted)
LV1: 7 -> 0 (row deleted)
LV2: 1 -> 0 (row deleted)
LS1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/admin/storage/page.tsx
```
`BUDGETS.LT3` is now `{\n  },` (its only row was this page's; the `// 2B-5` line went with it).

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 39 · fail 8`, each naming only `src/app/[locale]/(dashboard)/admin/storage/page.tsx`: `LH1 …` (`LH1: 14 in 14 files`, `1 > 0`) · `LT1 …` (`20 in 5`, `11 > 0`) · `LT3 empty table rows are TableEmptyRow, not a hand-written <td colSpan>` (`2 in 1`, `2 > 0`) · `LV1 numbers on screen go through formatCount or formatMoney, not a bare toLocaleString()` (`12 in 3`, `7 > 0`) · `LV2 …` (`72 in 22`, `1 > 0`) · `LS1 …` (`13 in 11`, `1 > 0`) · `L0 …` (the six lines `LH1 …: 1 > 0` … `LS1 …: 1 > 0`) · VFG `R7 interim: …` (`6 matches in 4 files; over budget:` and `…/admin/storage/page.tsx: 3 > 0`).

- [ ] **Step 4: Move the page onto the primitives (`src/app/[locale]/(dashboard)/admin/storage/page.tsx`, CRLF)**

Six exact replacements, top to bottom. Make all six before you compile.

(1) Imports `:1-17` (`type React` and the four summary icons go with `SummaryCard`; `FolderOpen` stays for the module panel). Replace:

```tsx
import type React from "react"
import { AlertTriangle, Database, FileArchive, FolderOpen, HardDrive } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { hasPermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { formatDateTime } from "@/lib/utils"
import { getEmptyStateClasses, getPanelClasses, getTableShellClasses } from "@/lib/design-system"
import {
  buildStorageGovernanceDryRun,
  formatStorageSize,
  scanUploadDirectory,
  summarizeStorageGovernance,
} from "@/lib/storage-governance"
import { getUploadRoot } from "@/lib/uploads"
import { StorageArchiveButton } from "@/components/admin/storage-archive-button"
import { StatusBadge } from "@/components/ui/status-badge"
```

with:

```tsx
import { FolderOpen } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { hasPermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { formatDateTime } from "@/lib/utils"
import { formatCount } from "@/lib/display-format"
import { getPanelClasses } from "@/lib/design-system"
import {
  buildStorageGovernanceDryRun,
  formatStorageSize,
  scanUploadDirectory,
  summarizeStorageGovernance,
} from "@/lib/storage-governance"
import { getUploadRoot } from "@/lib/uploads"
import { StorageArchiveButton } from "@/components/admin/storage-archive-button"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow, TableEmptyRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
```

(2) `:29`. Replace:

```tsx
  const t = await getTranslations("storagePage")
```

with:

```tsx
  const t = await getTranslations("storagePage")
  const tCommon = await getTranslations("common")
```

(3) `:58-60`: the review count gets a name, for the strip and its `attention`. Replace:

```tsx
  const reviewItems = attachments
    .filter((attachment) => attachment.isActive && (!attachment.filePath?.trim() || pathCounts.get(normalizePath(attachment.filePath))! > 1))
    .slice(0, 20)
```

with:

```tsx
  const reviewItems = attachments
    .filter((attachment) => attachment.isActive && (!attachment.filePath?.trim() || pathCounts.get(normalizePath(attachment.filePath))! > 1))
    .slice(0, 20)
  const reviewNeededCount = summary.duplicatePathCount + summary.missingPathCount + dryRun.orphanFiles.length + dryRun.missingFiles.length
```

(4) The page body `:62-187`. The cell contents of the dry-run table keep their text and the archive-button condition byte for byte; the module panel keeps its icon box. Replace:

```tsx
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <SummaryCard label={t("activeFiles")} value={summary.activeFiles.toLocaleString()} detail={t("inactiveFiles", { count: summary.inactiveFiles })} tone="primary" icon={<FileArchive className="h-5 w-5" />} />
        <SummaryCard label={t("totalSize")} value={formatStorageSize(summary.totalBytes)} detail={t("totalSizeHelp")} tone="success" icon={<HardDrive className="h-5 w-5" />} />
        <SummaryCard label={t("largeFiles")} value={summary.largeFileCount.toLocaleString()} detail={t("largeFilesHelp")} tone="warning" icon={<AlertTriangle className="h-5 w-5" />} />
        <SummaryCard label={t("reviewNeeded")} value={(summary.duplicatePathCount + summary.missingPathCount + dryRun.orphanFiles.length + dryRun.missingFiles.length).toLocaleString()} detail={t("reviewNeededHelp")} tone="danger" icon={<Database className="h-5 w-5" />} />
      </section>

      <section className={`${getPanelClasses()} p-5`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-semibold text-foreground">{t("filesystemDryRun")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("filesystemDryRunHelp")}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-md border border-border bg-background px-3 py-2">
              <div className="font-semibold text-foreground">{dryRun.matchedFiles.length.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{t("matchedFiles")}</div>
            </div>
            <div className="rounded-md border border-warning-border bg-warning-soft px-3 py-2">
              <div className="font-semibold text-foreground">{dryRun.orphanFiles.length.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{t("orphanFiles")}</div>
            </div>
            <div className="rounded-md border border-danger-border bg-danger-soft px-3 py-2">
              <div className="font-semibold text-foreground">{dryRun.missingFiles.length.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{t("missingFiles")}</div>
            </div>
          </div>
        </div>
        <div className={`mt-4 ${getTableShellClasses()}`}>
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("dryRunAction")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("file")}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("size")}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {dryRun.actions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">{t("emptyDryRunActions")}</td>
                </tr>
              ) : (
                dryRun.actions.slice(0, 10).map((action, index) => (
                  <tr key={`${action.action}-${index}`} className="hover:bg-row-hover">
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={action.action === "archive_orphan_file" ? t("archiveOrphanFile") : t("reviewMissingDbFile")}
                        tone={action.action === "archive_orphan_file" ? "warning" : "danger"}
                      />
                    </td>
                    <td className="break-all px-4 py-3 text-muted-foreground">
                      {action.action === "archive_orphan_file" ? action.relativePath : action.filePath}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {formatStorageSize(action.action === "archive_orphan_file" ? action.sizeBytes : action.expectedSizeBytes)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {action.action === "archive_orphan_file" && canArchiveStorageFiles ? (
                        <StorageArchiveButton relativePath={action.relativePath} />
                      ) : (
                        <span className="text-xs text-muted-foreground">{t("archiveUnavailable")}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={`${getPanelClasses()} p-5`}>
          <div className="flex items-start gap-3">
            <div className="rounded-md border border-primary-border bg-primary-soft p-2 text-primary">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">{t("moduleBreakdown")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("moduleBreakdownHelp")}</p>
            </div>
          </div>
          <div className={`mt-4 ${getTableShellClasses()}`}>
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("module")}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("fileCount")}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("size")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {summary.byModule.map((item) => (
                  <tr key={item.module} className="hover:bg-row-hover">
                    <td className="px-4 py-3 font-medium text-foreground">{moduleLabel(item.module, t)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{item.count.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatStorageSize(item.totalBytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <StorageReviewList
          title={t("reviewList")}
          description={t("reviewListHelp")}
          items={reviewItems}
          pathCounts={pathCounts}
          t={t}
        />
      </section>

      <StorageFileList title={t("largestFiles")} description={t("largestFilesHelp")} items={largeFiles} t={t} />
    </div>
  )
}
```

with:

```tsx
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} meta={t("subtitle")} />

      <StatStrip
        items={[
          { key: "activeFiles", label: t("activeFiles"), value: formatCount(summary.activeFiles), foot: t("inactiveFiles", { count: summary.inactiveFiles }) },
          { key: "totalSize", label: t("totalSize"), value: formatStorageSize(summary.totalBytes), foot: t("totalSizeHelp") },
          { key: "largeFiles", label: t("largeFiles"), value: formatCount(summary.largeFileCount), foot: t("largeFilesHelp") },
          {
            key: "reviewNeeded",
            label: t("reviewNeeded"),
            value: formatCount(reviewNeededCount),
            foot: t("reviewNeededHelp"),
            footTitle: t("reviewNeededHelp"),
            attention: reviewNeededCount > 0,
          },
        ]}
      />

      <section className={`${getPanelClasses()} p-5`}>
        <h2 className="font-semibold text-foreground">{t("filesystemDryRun")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("filesystemDryRunHelp")}</p>
        <StatStrip
          className="mt-4"
          items={[
            { key: "matchedFiles", label: t("matchedFiles"), value: formatCount(dryRun.matchedFiles.length) },
            { key: "orphanFiles", label: t("orphanFiles"), value: formatCount(dryRun.orphanFiles.length) },
            { key: "missingFiles", label: t("missingFiles"), value: formatCount(dryRun.missingFiles.length) },
          ]}
        />
        <DataTable framed={false} className="mt-4" caption={t("filesystemDryRun")} scrollHint={tCommon("tableScrollHint")}>
          <DataTableHeader>
            <tr>
              <DataTableHead>{t("dryRunAction")}</DataTableHead>
              <DataTableHead>{t("file")}</DataTableHead>
              <DataTableHead align="right">{t("size")}</DataTableHead>
              <DataTableHead align="right">{t("action")}</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {dryRun.actions.length === 0 ? (
              <TableEmptyRow colSpan={4}>{t("emptyDryRunActions")}</TableEmptyRow>
            ) : (
              dryRun.actions.slice(0, 10).map((action, index) => (
                <DataTableRow key={`${action.action}-${index}`}>
                  <DataTableCell>
                    <StatusBadge
                      label={action.action === "archive_orphan_file" ? t("archiveOrphanFile") : t("reviewMissingDbFile")}
                      tone={action.action === "archive_orphan_file" ? "warning" : "danger"}
                    />
                  </DataTableCell>
                  <DataTableCell className="break-all text-muted-foreground">
                    {action.action === "archive_orphan_file" ? action.relativePath : action.filePath}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">
                    {formatStorageSize(action.action === "archive_orphan_file" ? action.sizeBytes : action.expectedSizeBytes)}
                  </DataTableCell>
                  <DataTableCell align="right">
                    {action.action === "archive_orphan_file" && canArchiveStorageFiles ? (
                      <StorageArchiveButton relativePath={action.relativePath} />
                    ) : (
                      <span className="text-xs text-muted-foreground">{t("archiveUnavailable")}</span>
                    )}
                  </DataTableCell>
                </DataTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={`${getPanelClasses()} p-5`}>
          <div className="flex items-start gap-3">
            <div className="rounded-md border border-primary-border bg-primary-soft p-2 text-primary">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">{t("moduleBreakdown")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("moduleBreakdownHelp")}</p>
            </div>
          </div>
          <DataTable framed={false} className="mt-4" caption={t("moduleBreakdown")} scrollHint={tCommon("tableScrollHint")}>
            <DataTableHeader>
              <tr>
                <DataTableHead>{t("module")}</DataTableHead>
                <DataTableHead align="right">{t("fileCount")}</DataTableHead>
                <DataTableHead align="right">{t("size")}</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {summary.byModule.length === 0 ? (
                <TableEmptyRow colSpan={3}>{tCommon("noData")}</TableEmptyRow>
              ) : (
                summary.byModule.map((item) => (
                  <DataTableRow key={item.module}>
                    <DataTableCell className="font-medium text-foreground">{moduleLabel(item.module, t)}</DataTableCell>
                    <DataTableCell numeric className="text-muted-foreground">{formatCount(item.count)}</DataTableCell>
                    <DataTableCell numeric className="text-muted-foreground">{formatStorageSize(item.totalBytes)}</DataTableCell>
                  </DataTableRow>
                ))
              )}
            </DataTableBody>
          </DataTable>
        </div>

        <StorageReviewList
          title={t("reviewList")}
          description={t("reviewListHelp")}
          items={reviewItems}
          pathCounts={pathCounts}
          t={t}
        />
      </section>

      <StorageFileList title={t("largestFiles")} description={t("largestFilesHelp")} items={largeFiles} scrollHint={tCommon("tableScrollHint")} t={t} />
    </div>
  )
}
```

(5) The review list `:206-224` inside `StorageReviewList`. Replace:

```tsx
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className={getEmptyStateClasses()}>
            {t("emptyReview")}
          </div>
        ) : (
          items.map((item) => {
            const duplicate = item.filePath?.trim() ? pathCounts.get(normalizePath(item.filePath))! > 1 : false
            return (
              <div key={item.id} className="rounded-md border border-border bg-background p-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{item.originalName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.module} · {item.referenceId}</div>
                  </div>
                  <StatusBadge label={duplicate ? t("duplicatePath") : t("missingPath")} tone={duplicate ? "warning" : "danger"} />
                </div>
                <div className="mt-2 break-all text-xs text-muted-foreground">{item.filePath || "-"}</div>
              </div>
```

with:

```tsx
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <EmptyNote>{t("emptyReview")}</EmptyNote>
        ) : (
          items.map((item) => {
            const duplicate = item.filePath?.trim() ? pathCounts.get(normalizePath(item.filePath))! > 1 : false
            return (
              <div key={item.id} className="rounded-md border border-border bg-background p-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{item.originalName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{moduleLabel(item.module, t)} · <span className="tag">{item.referenceId}</span></div>
                  </div>
                  <StatusBadge label={duplicate ? t("duplicatePath") : t("missingPath")} tone={duplicate ? "warning" : "danger"} />
                </div>
                <div className="mt-2 break-all text-xs text-muted-foreground">{orNil(item.filePath)}</div>
              </div>
```

(6) `StorageFileList` and `SummaryCard` `:233-314` (the list takes the scroll hint as a prop; `SummaryCard` goes; `StorageAttachmentItem` below stays). Replace:

```tsx
function StorageFileList({
  title,
  description,
  items,
  t,
}: {
  title: string
  description: string
  items: StorageAttachmentItem[]
  t: Awaited<ReturnType<typeof getTranslations>>
}) {
  return (
    <section className={`${getPanelClasses()} p-5`}>
      <h2 className="font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className={`mt-4 ${getTableShellClasses()}`}>
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("file")}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("module")}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("size")}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("uploadedAt")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">{t("emptyLargeFiles")}</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-row-hover">
                  <td className="max-w-sm truncate px-4 py-3 font-medium text-foreground">{item.originalName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{moduleLabel(item.module, t)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatStorageSize(item.fileSize)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatDateTime(item.uploadedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function SummaryCard({
  label,
  value,
  detail,
  tone,
  icon,
}: {
  label: string
  value: string
  detail: string
  tone: "primary" | "success" | "warning" | "danger"
  icon: React.ReactNode
}) {
  const toneClass =
    tone === "danger"
      ? "border-danger-border bg-danger-soft text-danger"
      : tone === "warning"
        ? "border-warning-border bg-warning-soft text-warning"
        : tone === "success"
          ? "border-success-border bg-success-soft text-success"
          : "border-primary-border bg-primary-soft text-primary"

  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">{label}</div>
          <div className="mt-4 text-3xl font-bold text-foreground">{value}</div>
          <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
        </div>
        <div>{icon}</div>
      </div>
    </div>
  )
}
```

with:

```tsx
function StorageFileList({
  title,
  description,
  items,
  scrollHint,
  t,
}: {
  title: string
  description: string
  items: StorageAttachmentItem[]
  scrollHint: string
  t: Awaited<ReturnType<typeof getTranslations>>
}) {
  return (
    <section className={`${getPanelClasses()} p-5`}>
      <h2 className="font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <DataTable framed={false} className="mt-4" caption={title} scrollHint={scrollHint}>
        <DataTableHeader>
          <tr>
            <DataTableHead>{t("file")}</DataTableHead>
            <DataTableHead>{t("module")}</DataTableHead>
            <DataTableHead align="right">{t("size")}</DataTableHead>
            <DataTableHead align="right">{t("uploadedAt")}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {items.length === 0 ? (
            <TableEmptyRow colSpan={4}>{t("emptyLargeFiles")}</TableEmptyRow>
          ) : (
            items.map((item) => (
              <DataTableRow key={item.id}>
                <DataTableCell className="max-w-sm truncate font-medium text-foreground">{item.originalName}</DataTableCell>
                <DataTableCell className="text-muted-foreground">{moduleLabel(item.module, t)}</DataTableCell>
                <DataTableCell numeric className="text-muted-foreground">{formatStorageSize(item.fileSize)}</DataTableCell>
                <DataTableCell align="right" className="whitespace-nowrap text-muted-foreground">{formatDateTime(item.uploadedAt)}</DataTableCell>
              </DataTableRow>
            ))
          )}
        </DataTableBody>
      </DataTable>
    </section>
  )
}
```

Check: `grep -nE 'getTableShellClasses|getEmptyStateClasses|SummaryCard|<thead|<th |<td colSpan|toLocaleString|"-"|uppercase' "src/app/[locale]/(dashboard)/admin/storage/page.tsx"` prints nothing (exit 1).

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/list-pages-ui.test.ts tests/storage-archive-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-primitives-ui.test.ts tests/design-system.test.ts`
Expected: PASS, `tests 143 · pass 143 · fail 0` (list-pages-ui 37 · storage-archive-ui 4 · list-frame-guards 21 · visual-foundation-guards 26 · form-migration-guards 23 · list-primitives-ui 19 · design-system 13).

Run: `node <temp>/p2b1-precheck.mjs --file "D/admin/storage/page.tsx"`
Expected (exit 0): `· in MIGRATED_LIST_FILES`, every row `0 0 0 <seed>` (R7 seed 3, LH1 1, LT1 11, LT3 2, LV1 7, LV2 1, LS1 1) and `args    (no row holds this file)`.

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b5-tw-probe.mjs "src/app/[locale]/(dashboard)/admin/storage/page.tsx"`
Expected: `checked 40 classes, missing 0` (exit 0).

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` `tests 1983 · pass 1982 · fail 0 · skipped 1`; tsc no errors; lint 0 errors and the 146 warnings under `.agents/` (`npx eslint "src/app/[locale]/(dashboard)/admin/storage/page.tsx" tests/list-pages-ui.test.ts tests/storage-archive-ui.test.ts` prints nothing).

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 5 files: the page 127 insertions and 166 deletions, `tests/list-frame-guards.test.ts` 1 and 8 (the `MIGRATED_LIST_FILES` line in; the LH1, LT1, LT3 (with its `// 2B-5` line), LV1, LV2 and LS1 rows out), `tests/list-pages-ui.test.ts` 17 and 0, `tests/storage-archive-ui.test.ts` 1 and 1, `tests/visual-foundation-guards.test.ts` 0 and 1. The page stays CRLF (`312 312`).

- [ ] **Step 8: Commit**

```bash
git add "src/app/[locale]/(dashboard)/admin/storage/page.tsx" tests/storage-archive-ui.test.ts tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): storage tables on DataTable that scroll sideways, tiles on StatStrip, module codes as labels (2B-5 task 3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 5 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 18, spec §8.9 row `/th/admin/storage`):** at 1440 and 375: at 375 each of the three tables scrolls sideways inside its panel (the hint shows while it overflows; the action column with "ควร Archive" or "ตรวจสอบเท่านั้น" is reachable), and the page itself does not scroll sideways; the two strips (2 + 2, then 2 + 1 with the last cell spanning); the review list names modules in Thai; open the archive confirm of an orphan file and cancel it (nothing archived); Tab reaches each overflowing table's scroller.

---

### Task 4: `D/admin/approvals/page.tsx` · the module chips on TabNav, one StatStrip, the queue in a divided panel, and a row that is one link (bug §5.10 #3)

Spec §8.9 row 4, §5.6 row `admin/approvals`, §4.4.6 row `D/admin/approvals/page.tsx`, §5.10 #3, §10.4 table B row `list-pages-ui` (`<TabNav` of approvals), rulings R-d, R-g, R-h, R-n, R-p and controller rulings (a), (b) and (e). One file, one commit. The page and its test are CRLF: exact-string replacements only.

Rulings this task applies:
- **§4.4.6, I1, R-h:** the title block becomes `PageHeader` (`title`, `meta={t("subtitle")}`); its two links (`h-10` hand-written) become `buttonVariants({ variant: "outline", size: "md" })`, "ประวัติการตัดสินใจ" with `History` first and "ตั้งค่านโยบายอนุมัติ" last (R-h puts header buttons at `md`; §5.6's "`lg`" was written for the old header). "จัดการสิทธิ์บทบาท" in the approver panel (`h-9`) becomes the same `md` outline button with `Users`. LH1 1 → 0.
- **§5.6, R-d:** the three tinted `SummaryCard`s (`danger`/`warning`/`success` fills by count) become one `StatStrip` of `formatCount` values. The tab row below carries the same counts as links, so the strip cells are not links. `SummaryCard` and `summaryClass` go. LS1 1 → 0.
- **R-g, §5.6:** the module chips (`FilterChip`, `:144-152`, def `:185-209`, `toLocaleString("th-TH")` counts) become `TabNav` links with `count: formatCount(…)`, named `t("queueTitle")` (the panel they filter; no new key), `current={activeFilter}`. `FilterChip` goes (its name also blocked the shared `FilterChipItem` type name, spec §3.10).
- **§5.6, I3:** the queue section (a hand-made title bar with `border-b`) becomes `ContentPanel divided flush className="overflow-hidden"` with `title`, `description` and the filtered count in `actions` (`formatCount`); the tab row sits under the panel head with `className="px-4 md:px-5"` like the disposal queue of plan 2B-2. The rows stay one link each (§5.8: "การ์ดหรือแถวทุกขนาดจอ … เปลี่ยนแค่ของข้างใน"); the empty state stays `ActionEmptyState`. The queue is not paged (spec §5.6 "ไม่แบ่งหน้า"; its caps are §5.12's).
- **§5.10 #3:** each row is a link that held a `div` drawn as a button (`:248`); the action label is now `<span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary">` with a `ChevronRight`, no frame, so a row reads as one link and shows no second button.
- **R-n, R-p:** an empty requester is `orNil` (it was `|| "-"`, `:243`); the permission key of each approver card is a `tag` (it was `font-mono`, `:334`). LV2 1 → 0. The policy boxes, the approver cards and the row pills stay (2D, spec §5.1 "ป้ายที่เขียนเอง").
- **Spec §10.3, I15:** 2B does not touch the page again, so it joins `MIGRATED_LIST_FILES` (every counter 0).

What users will see on `/th/admin/approvals`:
- The title is 600 with two 36px outline buttons (44px on phones); the three tinted boxes are one flat strip of numbers.
- The decision queue sits in a panel with a 56px head (title, help and "N รายการ"); under it the modules are underline tabs with their counts (the current one in primary), 44px tall on phones.
- Each queue row is one link ending in the action words with an arrow, not a bordered button inside the link. An empty requester reads "—".

Not in this task: `src/lib/approval-inbox-query.ts` (its caps, §5.12) · the policy and approver boxes, the pills (2D) · the history page (Task 5) · docs (Task 19). Do not run a formatter.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/admin/approvals/page.tsx` (`i/lf w/crlf`; 9 exact replacements)
- Modify: `tests/list-pages-ui.test.ts` (`i/lf w/crlf`; one block appended)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only; the page has no VFG row)
- Temp folder only, never committed: `t04-pages-block.ts`

**Must keep passing without edits:** `tests/approval-inbox.test.ts` · `tests/approval-inbox-filter.test.ts` · `tests/approval-aging.test.ts` · `tests/notification-summary.test.ts` · `tests/list-primitives-ui.test.ts` · `tests/form-migration-guards.test.ts`

**Interfaces:**
- Consumes: what Tasks 1–2 consume (`PageHeader`, `StatStrip`, `ContentPanel`, `TabNav`, `orNil`, `formatCount`, `buttonVariants`); `ActionEmptyState` (unchanged import); Task 1's scripts.
- Produces: the page without `FilterChip`, `SummaryCard` and `summaryClass`; in `MIGRATED_LIST_FILES`; the test `approval inbox: PageHeader, one StatStrip, the queue in a divided panel with TabNav, and rows that are one link (spec 2B §5.6, §5.10 #3)`.

| guard | `D/admin/approvals/page.tsx` before → after | plan total (budget) before → after |
|---|---|---|
| LFG LH1 · LV2 · LS1 | 1 · 1 · 1 → – | 15 → 14 · 71 → 70 · 12 → 11 |
| `MIGRATED_LIST_FILES` | – → joins | 80 → 81 |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b5-t1-precheck.mjs 4`
Expected: `git status` prints nothing. The script prints (exit 0) the ten `ok` lines for the primitives and the keys, then:
```
ok      Task 1 is in
ok      Task 2 is in
ok      Task 3 is in
ok      Task 4 has not run yet
ok      src/app/[locale]/(dashboard)/admin/approvals/page.tsx is unchanged since 6835bdf (hash c340c3b2d069e624)
info    src/app/[locale]/(dashboard)/admin/approvals/page.tsx: CRLF
preconditions hold for Task 4
```

Run: `node <temp>/p2b1-precheck.mjs --file "D/admin/approvals/page.tsx"`
Expected (exit 0):
```
file    src/app/[locale]/(dashboard)/admin/approvals/page.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LH1        1       1     0     1
LV2        1       1     0     1
LS1        1       1     0     1
args    LH1=1:1 LV2=1:1 LS1=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol "src/app/[[]locale]/(dashboard)/admin/approvals/page.tsx" tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf w/crlf` for all three.

- [ ] **Step 2: Write the failing test (`tests/list-pages-ui.test.ts`)**

Save this block as `<temp>/t04-pages-block.ts`:

```ts
// Plan 2B-5 Task 4 (spec 2B §5.6 row admin/approvals, §4.4.6, bug §5.10 #3, R-d, R-g): the approval inbox. The
// module chips are TabNav links with counts, the tinted SummaryCards are one StatStrip, and a row is one link whose
// action reads as words with an arrow, not as a button inside the link.
test("approval inbox: PageHeader, one StatStrip, the queue in a divided panel with TabNav, and rows that are one link (spec 2B §5.6, §5.10 #3)", () => {
  const source = read(`${D}admin/approvals/page.tsx`)
  for (const part of ["<PageHeader", "<StatStrip", "<ContentPanel", "<TabNav", "<ApprovalInboxRow", "<ActionEmptyState"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.equal(source.match(/className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}/g)?.length, 3, "history and policy in the header, manage roles in its panel")
  assert.match(source, /<TabNav\n\s+aria-label=\{t\("queueTitle"\)\}\n\s+items=\{filterOptions\.map\(\(filter\) => \(\{\n\s+key: filter\.key,\n\s+label: filter\.label,\n\s+count: formatCount\(filter\.count\),/)
  assert.match(source, /current=\{activeFilter\}/)
  assert.match(source, /<span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary">\n\s+\{item\.actionLabel\}\n\s+<ChevronRight aria-hidden="true" className="size-4" \/>/, "bug §5.10 #3: no button look inside the row link")
  assert.match(source, /\{orNil\(item\.requestedBy\)\}/)
  assert.match(source, /<span className="tag">\{item\.permissionKey\}<\/span>/)
  assert.doesNotMatch(source, /function (?:FilterChip|SummaryCard|summaryClass)\b|toLocaleString\(|font-mono|"-"|<h1\b/)
})
```

Run: `node <temp>/p2b5-append.mjs <temp>/t04-pages-block.ts tests/list-pages-ui.test.ts`
Expected: `appended <temp>/t04-pages-block.ts to tests/list-pages-ui.test.ts (CRLF)`

Run: `node --test tests/list-pages-ui.test.ts`
Expected: FAIL, `tests 38 · pass 37 · fail 1`: `approval inbox: PageHeader, one StatStrip, the queue in a divided panel with TabNav, and rows that are one link (spec 2B §5.6, §5.10 #3)`: `no <PageHeader`

- [ ] **Step 3: Lower the guard rows of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs "D/admin/approvals/page.tsx" LH1=1:0 LV2=1:0 LS1=1:0 --migrated`
Expected (exit 0):
```
LH1: 1 -> 0 (row deleted)
LV2: 1 -> 0 (row deleted)
LS1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/admin/approvals/page.tsx
```

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 43 · fail 4`, each naming only `src/app/[locale]/(dashboard)/admin/approvals/page.tsx`: `LH1 …` (`LH1: 13 in 13 files`, `1 > 0`) · `LV2 …` (`71 in 21`, `1 > 0`) · `LS1 …` (`12 in 10`, `1 > 0`) · `L0 …` (`LH1 …: 1 > 0`, `LV2 …: 1 > 0`, `LS1 …: 1 > 0`).

- [ ] **Step 4: Move the page onto the primitives (`src/app/[locale]/(dashboard)/admin/approvals/page.tsx`, CRLF)**

Nine exact replacements, top to bottom. Make all nine before you compile.

(1) Imports `:1-14` (`ChevronRight` and the primitives come in; `FileCheck2` stays for the empty state). Replace:

```tsx
import Link from "next/link"
import type React from "react"
import { notFound, redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, CheckCircle2, ClipboardCheck, FileCheck2, History, ShieldCheck, Trash2, Users } from "lucide-react"
import { getSessionUser } from "@/lib/auth-utils"
import type { ApprovalInboxItem } from "@/lib/approval-inbox"
import { getApprovalAgeStatus, sortApprovalInboxItemsByAge } from "@/lib/approval-aging"
import { approvalInboxFilters, filterApprovalInboxItems, parseApprovalInboxFilter, type ApprovalInboxFilter } from "@/lib/approval-inbox-filter"
import { getApprovalInboxSnapshot } from "@/lib/approval-inbox-query"
import { buildApprovalPermissionMatrix, type ApprovalPermissionMatrixItem } from "@/lib/approval-permission-matrix"
import { getApprovalPermissionMatrixUsers } from "@/lib/approval-permission-matrix-query"
import { formatDateTime } from "@/lib/utils"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
```

with:

```tsx
import Link from "next/link"
import type React from "react"
import { notFound, redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, CheckCircle2, ChevronRight, ClipboardCheck, FileCheck2, History, ShieldCheck, Trash2, Users } from "lucide-react"
import { getSessionUser } from "@/lib/auth-utils"
import type { ApprovalInboxItem } from "@/lib/approval-inbox"
import { getApprovalAgeStatus, sortApprovalInboxItemsByAge } from "@/lib/approval-aging"
import { approvalInboxFilters, filterApprovalInboxItems, parseApprovalInboxFilter, type ApprovalInboxFilter } from "@/lib/approval-inbox-filter"
import { getApprovalInboxSnapshot } from "@/lib/approval-inbox-query"
import { buildApprovalPermissionMatrix, type ApprovalPermissionMatrixItem } from "@/lib/approval-permission-matrix"
import { getApprovalPermissionMatrixUsers } from "@/lib/approval-permission-matrix-query"
import { formatCount } from "@/lib/display-format"
import { formatDateTime } from "@/lib/utils"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { TabNav } from "@/components/ui/tab-nav"
```

(2) The title block and the summary boxes `:47-73`. Replace:

```tsx
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${locale}/admin/approvals/history`}
            className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            <History className="h-4 w-4" />
            {t("openDecisionHistory")}
          </Link>
          <Link
            href={`/${locale}/admin/settings`}
            className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            {t("openPolicySettings")}
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <SummaryCard label={t("total")} value={summary.total} tone={summary.total > 0 ? "danger" : "success"} />
        <SummaryCard label={t("disposal")} value={summary.disposal} tone={summary.disposal > 0 ? "danger" : "muted"} />
        <SummaryCard label={t("audit")} value={summary.audit} tone={summary.audit > 0 ? "warning" : "muted"} />
      </section>
```

with:

```tsx
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <>
            <Link href={`/${locale}/admin/approvals/history`} className={buttonVariants({ variant: "outline", size: "md" })}>
              <History aria-hidden="true" />
              {t("openDecisionHistory")}
            </Link>
            <Link href={`/${locale}/admin/settings`} className={buttonVariants({ variant: "outline", size: "md" })}>
              {t("openPolicySettings")}
            </Link>
          </>
        }
      />

      <StatStrip
        items={[
          { key: "total", label: t("total"), value: formatCount(summary.total) },
          { key: "disposal", label: t("disposal"), value: formatCount(summary.disposal) },
          { key: "audit", label: t("audit"), value: formatCount(summary.audit) },
        ]}
      />
```

(3) "จัดการสิทธิ์บทบาท" `:104-110`. Replace:

```tsx
          <Link
            href={`/${locale}/admin/roles`}
            className="inline-flex h-9 w-fit items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Users className="h-4 w-4" />
            {t("manageRoles")}
          </Link>
```

with:

```tsx
          <Link href={`/${locale}/admin/roles`} className={buttonVariants({ variant: "outline", size: "md" })}>
            <Users aria-hidden="true" />
            {t("manageRoles")}
          </Link>
```

(4) The queue section, the end of the page function and `FilterChip` `:133-209`. The `ApprovalInboxRow` call keeps its props byte for byte, two spaces deeper. Replace:

```tsx
      <section className="rounded-lg border border-border bg-surface">
        <div className="border-b border-border p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-semibold text-foreground">{t("queueTitle")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("queueDescription")}</p>
            </div>
            <div className="text-sm font-medium text-muted-foreground">{t("filteredCount", { count: filteredItems.length })}</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {filterOptions.map((filter) => (
              <FilterChip
                key={filter.key}
                href={filter.key === "all" ? `/${locale}/admin/approvals` : `/${locale}/admin/approvals?module=${filter.key}`}
                active={activeFilter === filter.key}
                label={filter.label}
                count={filter.count}
              />
            ))}
          </div>
        </div>
        {filteredItems.length === 0 ? (
          <div className="p-5">
            <ActionEmptyState
              icon={<FileCheck2 className="h-6 w-6" />}
              title={items.length === 0 ? t("emptyTitle") : t("emptyFilterTitle")}
              description={items.length === 0 ? t("emptyDescription") : t("emptyFilterDescription")}
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredItems.map((item) => (
              <ApprovalInboxRow
                key={item.id}
                item={item}
                locale={locale}
                slaDays={policy.slaDays}
                labels={{
                  requestedBy: t("requestedBy"),
                  requestedAt: t("requestedAt"),
                  waitingDays: (days) => t("waitingDays", { days }),
                  overdueDays: (days) => t("overdueDays", { days }),
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function FilterChip({
  href,
  active,
  label,
  count,
}: {
  href: string
  active: boolean
  label: string
  count: number
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors ${
        active
          ? "border-primary bg-primary-soft text-primary"
          : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      <span>{label}</span>
      <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-foreground">{count.toLocaleString("th-TH")}</span>
    </Link>
  )
}
```

with:

```tsx
      <ContentPanel
        divided
        flush
        className="overflow-hidden"
        title={t("queueTitle")}
        description={t("queueDescription")}
        actions={<span className="text-sm font-medium text-muted-foreground num">{t("filteredCount", { count: formatCount(filteredItems.length) })}</span>}
      >
        <TabNav
          aria-label={t("queueTitle")}
          items={filterOptions.map((filter) => ({
            key: filter.key,
            label: filter.label,
            count: formatCount(filter.count),
            href: filter.key === "all" ? `/${locale}/admin/approvals` : `/${locale}/admin/approvals?module=${filter.key}`,
          }))}
          current={activeFilter}
          className="px-4 md:px-5"
        />
        {filteredItems.length === 0 ? (
          <div className="p-4 md:p-5">
            <ActionEmptyState
              icon={<FileCheck2 className="h-6 w-6" />}
              title={items.length === 0 ? t("emptyTitle") : t("emptyFilterTitle")}
              description={items.length === 0 ? t("emptyDescription") : t("emptyFilterDescription")}
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredItems.map((item) => (
              <ApprovalInboxRow
                key={item.id}
                item={item}
                locale={locale}
                slaDays={policy.slaDays}
                labels={{
                  requestedBy: t("requestedBy"),
                  requestedAt: t("requestedAt"),
                  waitingDays: (days) => t("waitingDays", { days }),
                  overdueDays: (days) => t("overdueDays", { days }),
                }}
              />
            ))}
          </div>
        )}
      </ContentPanel>
    </div>
  )
}
```

(5) The requester `:243`. Replace:

```tsx
              <span>{labels.requestedBy}: {item.requestedBy || "-"}</span>
```

with:

```tsx
              <span>{labels.requestedBy}: {orNil(item.requestedBy)}</span>
```

(6) The button-looking `div` inside the row link `:248-250` (bug §5.10 #3). Replace:

```tsx
        <div className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground">
          {item.actionLabel}
        </div>
```

with:

```tsx
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
          {item.actionLabel}
          <ChevronRight aria-hidden="true" className="size-4" />
        </span>
```

(7) `SummaryCard` `:254-276` (the closing brace of `ApprovalInboxRow` above it stays). Replace:

```tsx
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "danger" | "warning" | "success" | "muted"
}) {
  return (
    <div className={`rounded-lg border p-4 ${summaryClass(tone)}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value.toLocaleString("th-TH")}</p>
        </div>
        <FileCheck2 className="h-5 w-5 text-current" />
      </div>
    </div>
  )
}
```

with:

```tsx
}
```

(8) The permission key `:334`. Replace:

```tsx
          <div className="mt-1 font-mono text-xs text-foreground">{item.permissionKey}</div>
```

with:

```tsx
          <div className="mt-1 text-xs text-foreground"><span className="tag">{item.permissionKey}</span></div>
```

(9) `summaryClass` `:388-395` (the closing brace of `pillClass` above it stays). Replace:

```tsx
}

function summaryClass(tone: "danger" | "warning" | "success" | "muted") {
  if (tone === "danger") return "border-danger-border bg-danger-soft text-danger"
  if (tone === "warning") return "border-warning-border bg-warning-soft text-warning"
  if (tone === "success") return "border-success-border bg-success-soft text-success"
  return "border-border bg-surface text-muted-foreground"
}
```

with:

```tsx
}
```

Check: `grep -nE 'FilterChip|SummaryCard|summaryClass|toLocaleString|font-mono|"-"|<h1' "src/app/[locale]/(dashboard)/admin/approvals/page.tsx"` prints nothing (exit 1).

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/list-pages-ui.test.ts tests/approval-inbox.test.ts tests/approval-inbox-filter.test.ts tests/approval-aging.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-primitives-ui.test.ts`
Expected: PASS, `tests 133 · pass 133 · fail 0` (list-pages-ui 38 · approval-inbox 2 · approval-inbox-filter 2 · approval-aging 2 · list-frame-guards 21 · visual-foundation-guards 26 · form-migration-guards 23 · list-primitives-ui 19).

Run: `node <temp>/p2b1-precheck.mjs --file "D/admin/approvals/page.tsx"`
Expected (exit 0): `· in MIGRATED_LIST_FILES`, rows `LH1 0 0 0 1`, `LV2 0 0 0 1`, `LS1 0 0 0 1`, `args    (no row holds this file)`.

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b5-tw-probe.mjs "src/app/[locale]/(dashboard)/admin/approvals/page.tsx"`
Expected: `checked 76 classes, missing 0` (exit 0). (Plan 2B-4's probe reported `className=` here, from the `", "` of `item.roleLabels.join(", ")`; Task 1 Step 1 explains the change.)

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` `tests 1984 · pass 1983 · fail 0 · skipped 1`; tsc no errors; lint 0 errors and the 146 warnings under `.agents/` (`npx eslint "src/app/[locale]/(dashboard)/admin/approvals/page.tsx" tests/list-pages-ui.test.ts` prints nothing).

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 3 files: the page 58 insertions and 114 deletions, `tests/list-frame-guards.test.ts` 1 and 3, `tests/list-pages-ui.test.ts` 17 and 0. The page stays CRLF (`356 356`).

- [ ] **Step 8: Commit**

```bash
git add "src/app/[locale]/(dashboard)/admin/approvals/page.tsx" tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): approval inbox on PageHeader, StatStrip and a divided panel with TabNav; a queue row is one link (2B-5 task 4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 18, spec §8.9 row `/th/admin/approvals`):** at 1440 and 375: the tabs are links (Ctrl+click opens a new tab; the current one has `aria-current="page"` and the primary count); a row reads as one link in NVDA (its title, then the action words) and Tab stops once per row; at 375 the tab row scrolls if it must and the page does not scroll sideways; the header buttons wrap under the title below md.

---

### Task 5: `D/admin/approvals/history/page.tsx` · real pages and full counts from the database instead of the newest 150 (B4), two TabNav rows, and a back button that points left (B2) (two commits: the where clause in `src/lib/approval-decision-log.ts`, then the page)

Spec §8.9 row 4, §5.6 row `admin/approvals/history`, §5.9.2 row 2, §5.9.3 "history", §5.14 (`tests/approval-decision-log.test.ts` "มีหรือสร้าง"), §10.4 table B rows `approval-decision-log` and `list-pages-ui` (`<TabNav` of approvals ×2), §4.4.6 row `D/admin/approvals/history/page.tsx`, §4.5.2 #31, §4.5.3 (`FileCheck2` → `ArrowLeft`), I21, rulings B2, B4, R-d, R-g and controller rulings (a), (b) and (e). Two commits, one per code file: Steps 1–6 the lib with its test, Steps 7–13 the page. Every file is CRLF: exact-string replacements only.

Rulings this task applies:
- **§5.9.2 row 2, §5.14 (commit 1):** the page's `getAllowedDecisionWhere` (`:327-337`, the modules a user may see) moves into `src/lib/approval-decision-log.ts` as `buildApprovalDecisionLogWhere({ access, canSeeRepairCloseHistory, module, decision })`: the same OR of `{ module, action: { in } }`, now also cut by the module and decision tabs, from one table of module × decision → actions (`approvalDecisionActions`) that matches `getApprovalDecision` (`:107-120`) row for row. `summarizeApprovalDecisionCounts(rows)` folds a `systemLog.groupBy({ by: ["module", "action"] })` into the shape of `summarizeApprovalDecisionLog`. The test proves both: for every permission (2 × 2 × 2) and every tab (4 × 5), the where clause finds exactly the rows the decision log keeps, and the folded counts equal the item counts. An empty `OR` finds nothing, as the list showed nothing before (a module tab the user may not see).
- **Not one of the 25 files of spec §8.9 (the controller confirms the fence):** `src/lib/approval-decision-log.ts` and `tests/approval-decision-log.test.ts` are outside spec §8.9's table but named by §5.9.2 row 2 and §10.4 table B for 2B-5; no file of 2C plan 5 reads or edits them (2C spec §8.3 row 2C-5).
- **B4, §5.9.1, §5.9.3 (commit 2):** the page reads `page` and `pageSize` with `parseListPage`; one `Promise.all` runs the page of rows (`where` = the allowed decisions of the chosen tabs, `orderBy: [{ createdAt: "desc" }, { id: "asc" }]`, `skip`/`take`), its `count({ where })`, and the `groupBy` over every allowed decision for the strip and the tab counts, which become full totals (they counted the newest 150 rows; spec §5.9.3: staff see larger numbers once there are more than 150). The trio runs inside `withPerformanceTiming("approval-history.list-data", …)` (spec §5.9.1 "เวลา query"). `buildSystemLogRecordLabels` reads only the rows of the page. `filterApprovalDecisionLogItems` leaves the page (the where clause filters; the lib keeps the function for its tests). No index: `IX_system_logs_module_action_createdAt` covers each branch of the OR.
- **I21:** past the last page the page redirects to the last page with the same tabs and page size.
- **§5.9.2 row 2 "buildFilterHref … คง pageSize ไม่ส่ง page":** `buildFilterHref` gains a last argument `listPage` and writes it through `appendListPage`; a tab passes `{ pageSize }` (page 1, same page size), the pager passes page and size, and the defaults stay out of the URL, so every default link reads as before.
- **R-g, §5.6:** the two `FilterGroup` rows of chips (`FilterChip`, `toLocaleString("th-TH")` counts) become two `TabNav` rows with `formatCount` counts, each named by its group label (`t("moduleFilter")`, `t("decisionFilter")`), which also stays visible above its row as a 13px label, because both rows start with "ทั้งหมด". `FilterGroup` stays as a thin wrapper (like `QuickFilterBar`, I20); `FilterChip` goes.
- **§4.4.6, §4.5.2 #31, B2:** the title block becomes `PageHeader` with `back={<PageBackLink href={`/${locale}/admin/approvals`} label={t("backToInbox")} />}`; the hand-written `h-10` link with the wrong `FileCheck2` icon (`:79-85`) goes, and `FileCheck2` leaves the imports. LH1 1 → 0.
- **§5.6, R-d:** the four tinted `SummaryCard`s become one `StatStrip` of full totals (`formatCount`). `SummaryCard` and `summaryClass` go. LS1 1 → 0.
- **§5.6, §5.8, §5.12:** the decision timeline becomes `ContentPanel divided flush className="overflow-hidden"` with the filtered total in `actions`, the decision rows as they were (the small change table in `<details>` stays, like the system log's), and `Pagination` in `DataTableFoot` at the end of the panel (`total > 0`), as the PM list of plan 2B-2 does.
- **Spec §10.3, I15:** 2B does not touch the page again, so it joins `MIGRATED_LIST_FILES` (every counter 0).

What users will see on `/th/admin/approvals/history`:
- "กลับไปงานรออนุมัติ" is the outline button with a left arrow (it showed a document icon), a 44px icon button on phones.
- The strip and the counts on the tabs count every decision the user may see (they counted the newest 150). The two filter rows are underline tabs with their counts.
- The timeline pages for real: 25 per page with 25/50/100, the range and "หน้า x จาก y"; a tab keeps the page size and starts at page 1. Older decisions are reachable for the first time.

Not in this task: the inbox page (Task 4) · `src/lib/approval-inbox-query.ts` · the decision row pills and icons (2D) · docs (Task 19). Do not run a formatter.

**Files:**
- Modify (commit 1): `src/lib/approval-decision-log.ts` (`i/lf w/crlf`; 2 exact replacements) · `tests/approval-decision-log.test.ts` (`i/lf w/crlf`; 1 exact replacement, one block appended)
- Modify (commit 2): `src/app/[locale]/(dashboard)/admin/approvals/history/page.tsx` (`i/lf w/crlf`; 5 exact replacements) · `tests/list-pages-ui.test.ts` (`i/lf w/crlf`; one block appended) · `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only; the page has no VFG row)
- Temp folder only, never committed: `t05-decision-block.ts`, `t05-pages-block.ts`

**Must keep passing without edits:** `tests/approval-decision-log.test.ts:39-129` (the three tests before this task's block) · `tests/approval-inbox.test.ts` · `tests/list-primitives-ui.test.ts` · `tests/form-migration-guards.test.ts`

**Interfaces:**
- Consumes: what Tasks 1–2 consume, plus `PageBackLink({ href, label })` and `DataTableFoot` (2B-1); `getApprovalDecision`, `getApprovalDecisionModule` (module-private in the lib, used by the new functions); `type Prisma` from `@prisma/client` (type-only in the lib, so the test still imports it under Node type stripping).
- Produces:
  - `src/lib/approval-decision-log.ts`: `export type ApprovalDecisionAccess = { canApproveDisposal: boolean; canApproveAudit: boolean }`, `export type ApprovalDecisionCountRow = { module: string; action: string; _count: { _all: number } }`, `export function buildApprovalDecisionLogWhere({ access, canSeeRepairCloseHistory, module, decision }): Prisma.SystemLogWhereInput`, `export function summarizeApprovalDecisionCounts(rows: readonly ApprovalDecisionCountRow[])` (the shape of `summarizeApprovalDecisionLog`).
  - The page without `getAllowedDecisionWhere`, `FilterChip`, `SummaryCard`, `summaryClass` and `FileCheck2`; in `MIGRATED_LIST_FILES`; the timing label `approval-history.list-data` (Task 19 lists it); the tests `the decision where clause finds the rows the decision log shows, for every permission and tab (spec 2B §5.9.2 row 2)`, `the decision counts folded from a groupBy equal the counts of the decision items (spec 2B §5.9.3)` and `approval history: real pages and full counts from the database, two TabNav rows and a back link that points left (spec 2B §5.6, §5.9.2 row 2)`.

| guard | `D/admin/approvals/history/page.tsx` before → after | plan total (budget) before → after |
|---|---|---|
| LFG LH1 · LS1 | 1 · 1 → – | 14 → 13 · 11 → 10 |
| `MIGRATED_LIST_FILES` | – → joins | 81 → 82 |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b5-t1-precheck.mjs 5`
Expected: `git status` prints nothing. The script prints (exit 0) the ten `ok` lines for the primitives and the keys, then:
```
ok      Task 1 is in
ok      Task 2 is in
ok      Task 3 is in
ok      Task 4 is in
ok      Task 5 has not run yet
ok      src/app/[locale]/(dashboard)/admin/approvals/history/page.tsx is unchanged since 6835bdf (hash 04ffe42383894ba8)
ok      src/lib/approval-decision-log.ts is unchanged since 6835bdf (hash b4be612ebf605f0e)
ok      tests/approval-decision-log.test.ts is unchanged since 6835bdf (hash 11921d7a046decb0)
info    src/app/[locale]/(dashboard)/admin/approvals/history/page.tsx: CRLF
info    src/lib/approval-decision-log.ts: CRLF
info    tests/approval-decision-log.test.ts: CRLF
preconditions hold for Task 5
```

Run: `node <temp>/p2b1-precheck.mjs --file "D/admin/approvals/history/page.tsx"`
Expected (exit 0):
```
file    src/app/[locale]/(dashboard)/admin/approvals/history/page.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LH1        1       1     0     1
LS1        1       1     0     1
args    LH1=1:1 LS1=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol "src/app/[[]locale]/(dashboard)/admin/approvals/history/page.tsx" src/lib/approval-decision-log.ts tests/approval-decision-log.test.ts tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf w/crlf` for all five.

- [ ] **Step 2: Write the failing tests of the lib (`tests/approval-decision-log.test.ts`, CRLF; it imports the lib, it does not read source text)**

(a) The import `:4-9`. Replace:

```ts
import {
  buildApprovalDecisionLogItems,
  filterApprovalDecisionLogItems,
  summarizeApprovalDecisionLog,
  type ApprovalDecisionLogSource,
} from "../src/lib/approval-decision-log.ts"
```

with:

```ts
import {
  approvalDecisionFilters,
  approvalDecisionModuleFilters,
  buildApprovalDecisionLogItems,
  buildApprovalDecisionLogWhere,
  filterApprovalDecisionLogItems,
  summarizeApprovalDecisionCounts,
  summarizeApprovalDecisionLog,
  type ApprovalDecisionCountRow,
  type ApprovalDecisionLogSource,
} from "../src/lib/approval-decision-log.ts"
```

(b) Save this block as `<temp>/t05-decision-block.ts` (it uses the file's own `labels`, `t` and `makeLog`; `makeLog` is a function declaration, so the block can call it above its line):

```ts
// Plan 2B-5 Task 5 (spec 2B §5.9.2 row 2, §5.14, §10.4 table B): the decision history pages and counts in the
// database. The where clause must find exactly the rows the decision log shows, for every permission and every tab,
// and the counts folded from a groupBy must equal the counts of the decision items themselves.
const decisionPairs = [
  ["disposal", "approve"], ["disposal", "reject"], ["disposal", "execute"], ["disposal", "execute_historical_without_evidence"], ["disposal", "create"],
  ["maintenance", "close"], ["maintenance", "update_status"],
  ["audit", "approve_finding"], ["audit", "reject_finding"], ["audit", "close"], ["audit", "approve"],
  ["asset", "close"],
] as const
const decisionLogs = decisionPairs.map(([moduleName, action], index) => makeLog({ id: `log-${index}`, module: moduleName, action, recordId: "unknown", createdAt: new Date(Date.UTC(2026, 4, 1, 0, index)) }))

function matchesWhere(log: { module: string; action: string }, where: ReturnType<typeof buildApprovalDecisionLogWhere>) {
  assert.ok(Array.isArray(where.OR), "one OR of { module, action: { in } } conditions")
  return (where.OR as Array<{ module: string; action: { in: string[] } }>).some((condition) => condition.module === log.module && condition.action.in.includes(log.action))
}

test("the decision where clause finds the rows the decision log shows, for every permission and tab (spec 2B §5.9.2 row 2)", () => {
  for (const canApproveDisposal of [true, false]) {
    for (const canApproveAudit of [true, false]) {
      for (const canSeeRepairCloseHistory of [true, false]) {
        for (const moduleFilter of approvalDecisionModuleFilters) {
          for (const decision of approvalDecisionFilters) {
            const where = buildApprovalDecisionLogWhere({ access: { canApproveDisposal, canApproveAudit }, canSeeRepairCloseHistory, module: moduleFilter, decision })
            const found = decisionLogs.filter((log) => matchesWhere(log, where)).map((log) => log.id).sort()
            const visible = decisionLogs.filter((log) => (log.module !== "disposal" || canApproveDisposal) && (log.module !== "audit" || canApproveAudit) && (log.module !== "maintenance" || canSeeRepairCloseHistory))
            const shown = filterApprovalDecisionLogItems(buildApprovalDecisionLogItems(visible, labels, "th", t), moduleFilter, decision).map((item) => item.id).sort()
            assert.deepEqual(found, shown, JSON.stringify({ canApproveDisposal, canApproveAudit, canSeeRepairCloseHistory, moduleFilter, decision }))
          }
        }
      }
    }
  }
})

test("the decision counts folded from a groupBy equal the counts of the decision items (spec 2B §5.9.3)", () => {
  const logs = [...decisionLogs, ...decisionLogs.slice(0, 7).map((log) => ({ ...log, id: `${log.id}-again` }))]
  const rows = new Map<string, ApprovalDecisionCountRow>()
  for (const log of logs) {
    const row = rows.get(`${log.module}:${log.action}`) ?? { module: log.module, action: log.action, _count: { _all: 0 } }
    row._count._all += 1
    rows.set(`${log.module}:${log.action}`, row)
  }
  assert.deepEqual(summarizeApprovalDecisionCounts([...rows.values()]), summarizeApprovalDecisionLog(buildApprovalDecisionLogItems(logs, labels, "th", t)))
})
```

Run: `node <temp>/p2b5-append.mjs <temp>/t05-decision-block.ts tests/approval-decision-log.test.ts`
Expected: `appended <temp>/t05-decision-block.ts to tests/approval-decision-log.test.ts (CRLF)`

Run: `node --test tests/approval-decision-log.test.ts`
Expected: FAIL, `tests 1 · pass 0 · fail 1`: the file does not load, `SyntaxError: The requested module '../src/lib/approval-decision-log.ts' does not provide an export named 'buildApprovalDecisionLogWhere'`.

- [ ] **Step 3: Add the where clause and the folded counts (`src/lib/approval-decision-log.ts`, CRLF)**

(1) The import `:1-6`. Replace:

```ts
import {
  buildSystemLogPresentation,
  type SystemLogChange,
  type SystemLogPresenterInput,
  type SystemLogRecordLabels,
} from "./system-log-presenter.ts"
```

with:

```ts
import type { Prisma } from "@prisma/client"
import {
  buildSystemLogPresentation,
  type SystemLogChange,
  type SystemLogPresenterInput,
  type SystemLogRecordLabels,
} from "./system-log-presenter.ts"
```

(2) Between `filterApprovalDecisionLogItems` and `isApprovalDecisionLog` (`:101-105`). Replace:

```ts
}

export function isApprovalDecisionLog(log: Pick<ApprovalDecisionLogSource, "module" | "action">) {
  return Boolean(getApprovalDecision(log) && getApprovalDecisionModule(log))
}
```

with:

```ts
}

export type ApprovalDecisionAccess = { canApproveDisposal: boolean; canApproveAudit: boolean }

export type ApprovalDecisionCountRow = { module: string; action: string; _count: { _all: number } }

// The actions of each decision by module: the table getApprovalDecision reads, written once more as data so the
// database can page and count the decision history (spec 2B §5.9.2 row 2). The test checks the two agree.
const approvalDecisionActions: Record<ApprovalDecisionLogItem["module"], Partial<Record<ApprovalDecision, readonly string[]>>> = {
  disposal: { approve: ["approve"], reject: ["reject"], execute: ["execute", "execute_historical_without_evidence"] },
  maintenance: { close: ["close"] },
  audit: { approve: ["approve_finding"], reject: ["reject_finding"], close: ["close"] },
}

// The decisions a user may see, cut by the module and decision tabs, as one where clause: the rows it finds are the
// rows buildApprovalDecisionLogItems keeps, so the page and its counts come from the database, not from the newest
// 150 rows. Old repair-close decisions (their approval was retired in 2026-10) show to whoever can edit maintenance.
// An empty OR finds nothing, as the list showed nothing before.
export function buildApprovalDecisionLogWhere({
  access,
  canSeeRepairCloseHistory,
  module: moduleFilter,
  decision: decisionFilter,
}: {
  access: ApprovalDecisionAccess
  canSeeRepairCloseHistory: boolean
  module: ApprovalDecisionModuleFilter
  decision: ApprovalDecisionFilter
}): Prisma.SystemLogWhereInput {
  const allowed: Record<ApprovalDecisionLogItem["module"], boolean> = {
    disposal: access.canApproveDisposal,
    maintenance: canSeeRepairCloseHistory,
    audit: access.canApproveAudit,
  }
  const conditions: Prisma.SystemLogWhereInput[] = []
  for (const decisionModule of ["disposal", "maintenance", "audit"] as const) {
    if (!allowed[decisionModule] || (moduleFilter !== "all" && moduleFilter !== decisionModule)) continue
    const actions = Object.entries(approvalDecisionActions[decisionModule])
      .filter(([decision]) => decisionFilter === "all" || decision === decisionFilter)
      .flatMap(([, moduleActions]) => moduleActions ?? [])
    if (actions.length > 0) conditions.push({ module: decisionModule, action: { in: actions } })
  }
  return { OR: conditions }
}

// The summary of summarizeApprovalDecisionLog, folded from a systemLog.groupBy by module and action over every
// decision the user may see, so the strip and the tab counts are full totals (spec 2B §5.9.3).
export function summarizeApprovalDecisionCounts(rows: readonly ApprovalDecisionCountRow[]) {
  const summary = { total: 0, disposal: 0, maintenance: 0, audit: 0, approve: 0, reject: 0, close: 0, execute: 0 }
  for (const row of rows) {
    const decision = getApprovalDecision(row)
    const decisionModule = getApprovalDecisionModule(row)
    if (!decision || !decisionModule) continue
    summary.total += row._count._all
    summary[decisionModule] += row._count._all
    summary[decision] += row._count._all
  }
  return summary
}

export function isApprovalDecisionLog(log: Pick<ApprovalDecisionLogSource, "module" | "action">) {
  return Boolean(getApprovalDecision(log) && getApprovalDecisionModule(log))
}
```

- [ ] **Step 4: Run the tests of the lib**

Run: `node --test tests/approval-decision-log.test.ts tests/approval-inbox.test.ts`
Expected: PASS, `tests 7 · pass 7 · fail 0` (approval-decision-log 5 · approval-inbox 2).

- [ ] **Step 5: Full verification of the lib**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` `tests 1986 · pass 1985 · fail 0 · skipped 1` (two tests more than after Task 4); tsc no errors; lint 0 errors and the 146 warnings under `.agents/` (`npx eslint src/lib/approval-decision-log.ts tests/approval-decision-log.test.ts` prints nothing; the block names no variable `module`, which `@next/next/no-assign-module-variable` rejects).

Run: `git diff --stat`
Expected: 2 files: `src/lib/approval-decision-log.ts` 59 insertions and 0 deletions, `tests/approval-decision-log.test.ts` 50 and 0. Both stay CRLF (`190 190`, `198 198`).

- [ ] **Step 6: Commit the lib**

```bash
git add src/lib/approval-decision-log.ts tests/approval-decision-log.test.ts
git commit -m "feat(approvals): the decision history where clause and its counts from a groupBy, matched to the decision log (2B-5 task 5, B4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 2 files in the commit. `git status --short src tests messages` prints nothing.

- [ ] **Step 7: Write the failing test of the page (`tests/list-pages-ui.test.ts`)**

Save this block as `<temp>/t05-pages-block.ts`:

```ts
// Plan 2B-5 Task 5 (spec 2B §5.6 row admin/approvals/history, §5.9.2 row 2, §4.5.2 #31, B2, B4): the decision
// history pages in the database (it stopped at the newest 150 rows and counted only those), its two filter rows are
// TabNav with full counts, the strip counts every decision, and the back button points left.
test("approval history: real pages and full counts from the database, two TabNav rows and a back link that points left (spec 2B §5.6, §5.9.2 row 2)", () => {
  const source = read(`${D}admin/approvals/history/page.tsx`)
  for (const part of ["<PageHeader", "<StatStrip", "<ContentPanel", "<DataTableFoot>", "<Pagination", "<DecisionRow"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /back=\{<PageBackLink href=\{`\/\$\{locale\}\/admin\/approvals`\} label=\{t\("backToInbox"\)\} \/>\}/, "B2: the back button is the left arrow, not FileCheck2")
  assert.match(source, /const listPage = parseListPage\(\{ page: query\.page, pageSize: query\.pageSize \}\)/)
  assert.match(source, /const allowedWhere = buildApprovalDecisionLogWhere\(\{ \.\.\.decisionAccess, module: "all", decision: "all" \}\)/)
  assert.match(source, /const where = buildApprovalDecisionLogWhere\(\{ \.\.\.decisionAccess, module: activeModule, decision: activeDecision \}\)/)
  assert.match(source, /await withPerformanceTiming\("approval-history\.list-data", \(\) => Promise\.all\(\[\n\s+prisma\.systemLog\.findMany\(\{[\s\S]*?orderBy: \[\{ createdAt: "desc" \}, \{ id: "asc" \}\],\n\s+skip,\n\s+take,\n\s+\}\),\n\s+prisma\.systemLog\.count\(\{ where \}\),\n\s+prisma\.systemLog\.groupBy\(\{ by: \["module", "action"\], where: allowedWhere, _count: \{ _all: true \} \}\),\n\s+\]\)\)/)
  assert.match(source, /const summary = summarizeApprovalDecisionCounts\(decisionCounts\)/, "the strip and the tab counts are full totals (spec 2B §5.9.3)")
  assert.doesNotMatch(source, /\btake: \d+|filterApprovalDecisionLogItems|getAllowedDecisionWhere/, "no fixed number of rows and no filter in JS")
  assert.match(source, /^import \{ notFound, redirect \} from "next\/navigation"$/m)
  assert.match(source, /const lastPage = lastListPage\(total, listPage\.pageSize\)\n\s+if \(logs\.length === 0 && total > 0 && listPage\.page > lastPage\) \{\n\s+redirect\(/)
  assert.match(source, /const queryString = appendListPage\(query, listPage\)\.toString\(\)/)
  assert.match(source, /href: buildFilterHref\(locale, activeModule, activeDecision, param, option\.key, \{ pageSize \}\)/, "a tab goes back to page 1 and keeps the page size")
  assert.equal(source.match(/pageSize=\{listPage\.pageSize\}/g)?.length, 3, "both filter rows and the Pagination get the page size")
  assert.match(source, /<TabNav\n\s+aria-label=\{label\}/)
  assert.doesNotMatch(source, /\bFileCheck2\b|function (?:FilterChip|SummaryCard|summaryClass)\b|toLocaleString\(|<h1\b/)
})
```

Run: `node <temp>/p2b5-append.mjs <temp>/t05-pages-block.ts tests/list-pages-ui.test.ts`
Expected: `appended <temp>/t05-pages-block.ts to tests/list-pages-ui.test.ts (CRLF)`

Run: `node --test tests/list-pages-ui.test.ts`
Expected: FAIL, `tests 39 · pass 38 · fail 1`: `approval history: real pages and full counts from the database, two TabNav rows and a back link that points left (spec 2B §5.6, §5.9.2 row 2)`: `no <PageHeader`

- [ ] **Step 8: Lower the guard rows of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs "D/admin/approvals/history/page.tsx" LH1=1:0 LS1=1:0 --migrated`
Expected (exit 0):
```
LH1: 1 -> 0 (row deleted)
LS1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/admin/approvals/history/page.tsx
```

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 44 · fail 3`, each naming only `src/app/[locale]/(dashboard)/admin/approvals/history/page.tsx`: `LH1 …` (`LH1: 12 in 12 files`, `1 > 0`) · `LS1 …` (`11 in 9`, `1 > 0`) · `L0 …` (`LH1 …: 1 > 0`, `LS1 …: 1 > 0`).

- [ ] **Step 9: Move the page onto the primitives and the paged query (`src/app/[locale]/(dashboard)/admin/approvals/history/page.tsx`, CRLF)**

Five exact replacements, top to bottom. Make all five before you compile.

(1) Imports and the props type `:1-30` (`type Prisma`, `FileCheck2`, `filterApprovalDecisionLogItems` and `summarizeApprovalDecisionLog` go; `type React` stays for the icon helpers). Replace:

```tsx
import Link from "next/link"
import type React from "react"
import type { Prisma } from "@prisma/client"
import { notFound, redirect } from "next/navigation"
import { getMessages, getTranslations } from "next-intl/server"
import { CheckCircle2, ClipboardList, FileCheck2, History, RotateCcw, XCircle } from "lucide-react"
import { getSessionUser, hasPermission } from "@/lib/auth-utils"
import {
  approvalDecisionFilters,
  approvalDecisionModuleFilters,
  buildApprovalDecisionLogItems,
  filterApprovalDecisionLogItems,
  parseApprovalDecisionFilter,
  parseApprovalDecisionModuleFilter,
  summarizeApprovalDecisionLog,
  type ApprovalDecision,
  type ApprovalDecisionFilter,
  type ApprovalDecisionLogItem,
  type ApprovalDecisionModuleFilter,
} from "@/lib/approval-decision-log"
import { getApprovalInboxAccess } from "@/lib/approval-inbox-query"
import { prisma } from "@/lib/db"
import { buildSystemLogRecordLabels } from "@/lib/system-log-record-labels"
import { formatDateTime } from "@/lib/utils"
import { ActionEmptyState } from "@/components/ui/action-empty-state"

type ApprovalHistoryPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ module?: string | string[]; decision?: string | string[] }>
}
```

with:

```tsx
import Link from "next/link"
import type React from "react"
import { notFound, redirect } from "next/navigation"
import { getMessages, getTranslations } from "next-intl/server"
import { CheckCircle2, ClipboardList, History, RotateCcw, XCircle } from "lucide-react"
import { getSessionUser, hasPermission } from "@/lib/auth-utils"
import {
  approvalDecisionFilters,
  approvalDecisionModuleFilters,
  buildApprovalDecisionLogItems,
  buildApprovalDecisionLogWhere,
  parseApprovalDecisionFilter,
  parseApprovalDecisionModuleFilter,
  summarizeApprovalDecisionCounts,
  type ApprovalDecision,
  type ApprovalDecisionFilter,
  type ApprovalDecisionLogItem,
  type ApprovalDecisionModuleFilter,
} from "@/lib/approval-decision-log"
import { getApprovalInboxAccess } from "@/lib/approval-inbox-query"
import { prisma } from "@/lib/db"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, appendListPage, lastListPage, listPageWindow, parseListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { buildSystemLogRecordLabels } from "@/lib/system-log-record-labels"
import { formatDateTime } from "@/lib/utils"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTableFoot } from "@/components/ui/data-table"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { StatStrip } from "@/components/ui/stat-strip"
import { TabNav } from "@/components/ui/tab-nav"

type ApprovalHistoryPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ module?: string | string[]; decision?: string | string[]; page?: string | string[]; pageSize?: string | string[] }>
}
```

(2) The data `:41-70`: the newest 150 rows and the counts taken from them become the page window, the count, the `groupBy` and the redirect. Replace:

```tsx
  const t = await getTranslations("approvalHistoryPage")
  const messages = await getMessages()
  const systemLogMessages = messages.systemLogPage && typeof messages.systemLogPage === "object"
    ? messages.systemLogPage as Record<string, string>
    : {}
  const translateLog = (key: string) => systemLogMessages[key.replaceAll(".", "_")] ?? key

  const logs = await prisma.systemLog.findMany({
    where: { OR: getAllowedDecisionWhere(access, hasPermission(user, "maintenance", "edit")) },
    include: { user: { select: { username: true, displayName: true } } },
    orderBy: { createdAt: "desc" },
    take: 150,
  })
  const recordLabels = await buildSystemLogRecordLabels(logs)
  const items = buildApprovalDecisionLogItems(logs, recordLabels, locale, translateLog)
  const summary = summarizeApprovalDecisionLog(items)
  const activeModule = parseApprovalDecisionModuleFilter(query.module)
  const activeDecision = parseApprovalDecisionFilter(query.decision)
  const filteredItems = filterApprovalDecisionLogItems(items, activeModule, activeDecision)

  const moduleOptions = approvalDecisionModuleFilters.map((filter) => ({
    key: filter,
    label: t(`filter_module_${filter}`),
    count: filter === "all" ? summary.total : summary[filter],
  }))
  const decisionOptions = approvalDecisionFilters.map((filter) => ({
    key: filter,
    label: t(`filter_decision_${filter}`),
    count: filter === "all" ? summary.total : summary[filter],
  }))
```

with:

```tsx
  const t = await getTranslations("approvalHistoryPage")
  const tCommon = await getTranslations("common")
  const messages = await getMessages()
  const systemLogMessages = messages.systemLogPage && typeof messages.systemLogPage === "object"
    ? messages.systemLogPage as Record<string, string>
    : {}
  const translateLog = (key: string) => systemLogMessages[key.replaceAll(".", "_")] ?? key

  const activeModule = parseApprovalDecisionModuleFilter(query.module)
  const activeDecision = parseApprovalDecisionFilter(query.decision)
  const listPage = parseListPage({ page: query.page, pageSize: query.pageSize })
  // The list URL keeps both tabs; the default page and page size stay out of it (spec 2B B4).
  const listHref = (next: { page?: number; pageSize?: number }) => buildFilterHref(locale, activeModule, activeDecision, "module", activeModule, next)
  const decisionAccess = { access, canSeeRepairCloseHistory: hasPermission(user, "maintenance", "edit") }
  // Every decision this user may see (the strip and the tab counts), and the decisions of the chosen tabs (the list):
  // full totals and real pages instead of the newest 150 rows (spec 2B §5.9.2 row 2, §5.9.3).
  const allowedWhere = buildApprovalDecisionLogWhere({ ...decisionAccess, module: "all", decision: "all" })
  const where = buildApprovalDecisionLogWhere({ ...decisionAccess, module: activeModule, decision: activeDecision })
  const { skip, take } = listPageWindow(listPage)
  const [logs, total, decisionCounts] = await withPerformanceTiming("approval-history.list-data", () => Promise.all([
    prisma.systemLog.findMany({
      where,
      include: { user: { select: { username: true, displayName: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip,
      take,
    }),
    prisma.systemLog.count({ where }),
    prisma.systemLog.groupBy({ by: ["module", "action"], where: allowedWhere, _count: { _all: true } }),
  ]))
  // A page past the last one (an old link, or a tab with fewer decisions) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listPage.pageSize)
  if (logs.length === 0 && total > 0 && listPage.page > lastPage) {
    redirect(listHref({ page: lastPage, pageSize: listPage.pageSize }))
  }
  const { start, end, totalPages } = paginationRange(listPage.page, listPage.pageSize, total)
  const recordLabels = await buildSystemLogRecordLabels(logs)
  const items = buildApprovalDecisionLogItems(logs, recordLabels, locale, translateLog)
  const summary = summarizeApprovalDecisionCounts(decisionCounts)

  const moduleOptions = approvalDecisionModuleFilters.map((filter) => ({
    key: filter,
    label: t(`filter_module_${filter}`),
    count: filter === "all" ? summary.total : summary[filter],
  }))
  const decisionOptions = approvalDecisionFilters.map((filter) => ({
    key: filter,
    label: t(`filter_decision_${filter}`),
    count: filter === "all" ? summary.total : summary[filter],
  }))
```

(3) The page body, `FilterGroup` and `FilterChip` `:72-206` (`DecisionRow` below stays byte for byte). Replace:

```tsx
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link
          href={`/${locale}/admin/approvals`}
          className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
        >
          <FileCheck2 className="h-4 w-4" />
          {t("backToInbox")}
        </Link>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <SummaryCard label={t("total")} value={summary.total} tone={summary.total > 0 ? "primary" : "muted"} icon={<History className="h-5 w-5" />} />
        <SummaryCard label={t("approved")} value={summary.approve} tone="success" icon={<CheckCircle2 className="h-5 w-5" />} />
        <SummaryCard label={t("rejected")} value={summary.reject} tone="danger" icon={<XCircle className="h-5 w-5" />} />
        <SummaryCard label={t("closed")} value={summary.close + summary.execute} tone="warning" icon={<ClipboardList className="h-5 w-5" />} />
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-semibold text-foreground">{t("filterTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("filterDescription")}</p>
          </div>
          <FilterGroup
            label={t("moduleFilter")}
            options={moduleOptions}
            activeModule={activeModule}
            activeDecision={activeDecision}
            locale={locale}
            param="module"
          />
          <FilterGroup
            label={t("decisionFilter")}
            options={decisionOptions}
            activeModule={activeModule}
            activeDecision={activeDecision}
            locale={locale}
            param="decision"
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex flex-col gap-2 border-b border-border p-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-semibold text-foreground">{t("timelineTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("timelineDescription")}</p>
          </div>
          <div className="text-sm font-medium text-muted-foreground">{t("filteredCount", { count: filteredItems.length })}</div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-5">
            <ActionEmptyState
              icon={<History className="h-6 w-6" />}
              title={t("emptyTitle")}
              description={t("emptyDescription")}
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredItems.map((item) => (
              <DecisionRow key={item.id} item={item} labels={{ actor: t("actor"), decidedAt: t("decidedAt"), viewDetails: t("viewDetails"), remark: t("remark"), field: t("field"), before: t("before"), after: t("after") }} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function FilterGroup({
  label,
  options,
  activeModule,
  activeDecision,
  locale,
  param,
}: {
  label: string
  options: Array<{ key: ApprovalDecisionModuleFilter | ApprovalDecisionFilter; label: string; count: number }>
  activeModule: ApprovalDecisionModuleFilter
  activeDecision: ApprovalDecisionFilter
  locale: string
  param: "module" | "decision"
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <FilterChip
            key={option.key}
            href={buildFilterHref(locale, activeModule, activeDecision, param, option.key)}
            active={param === "module" ? activeModule === option.key : activeDecision === option.key}
            label={option.label}
            count={option.count}
          />
        ))}
      </div>
    </div>
  )
}

function FilterChip({
  href,
  active,
  label,
  count,
}: {
  href: string
  active: boolean
  label: string
  count: number
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors ${
        active
          ? "border-primary bg-primary-soft text-primary"
          : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      <span>{label}</span>
      <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-foreground">{count.toLocaleString("th-TH")}</span>
    </Link>
  )
}
```

with:

```tsx
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        back={<PageBackLink href={`/${locale}/admin/approvals`} label={t("backToInbox")} />}
      />

      <StatStrip
        items={[
          { key: "total", label: t("total"), value: formatCount(summary.total) },
          { key: "approved", label: t("approved"), value: formatCount(summary.approve) },
          { key: "rejected", label: t("rejected"), value: formatCount(summary.reject) },
          { key: "closed", label: t("closed"), value: formatCount(summary.close + summary.execute) },
        ]}
      />

      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-semibold text-foreground">{t("filterTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("filterDescription")}</p>
          </div>
          <FilterGroup
            label={t("moduleFilter")}
            options={moduleOptions}
            activeModule={activeModule}
            activeDecision={activeDecision}
            locale={locale}
            param="module"
            pageSize={listPage.pageSize}
          />
          <FilterGroup
            label={t("decisionFilter")}
            options={decisionOptions}
            activeModule={activeModule}
            activeDecision={activeDecision}
            locale={locale}
            param="decision"
            pageSize={listPage.pageSize}
          />
        </div>
      </section>

      <ContentPanel
        divided
        flush
        className="overflow-hidden"
        title={t("timelineTitle")}
        description={t("timelineDescription")}
        actions={<span className="text-sm font-medium text-muted-foreground num">{t("filteredCount", { count: formatCount(total) })}</span>}
      >
        {items.length === 0 ? (
          <div className="p-4 md:p-5">
            <ActionEmptyState
              icon={<History className="h-6 w-6" />}
              title={t("emptyTitle")}
              description={t("emptyDescription")}
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => (
              <DecisionRow key={item.id} item={item} labels={{ actor: t("actor"), decidedAt: t("decidedAt"), viewDetails: t("viewDetails"), remark: t("remark"), field: t("field"), before: t("before"), after: t("after") }} />
            ))}
          </div>
        )}
        {total > 0 ? (
          <DataTableFoot>
            <Pagination
              page={listPage.page}
              totalPages={totalPages}
              previousHref={listHref({ page: listPage.page - 1, pageSize: listPage.pageSize })}
              nextHref={listHref({ page: listPage.page + 1, pageSize: listPage.pageSize })}
              pageSize={listPage.pageSize}
              pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: listHref({ pageSize: value }) }))}
              labels={{
                navigation: tCommon("pagination"),
                previous: tCommon("previous"),
                next: tCommon("next"),
                pageOf: tCommon("pageOf", { page: listPage.page, total: totalPages }),
                range: tCommon("showingRange", { from: formatCount(start), to: formatCount(end), total: formatCount(total) }),
                pageSizeGroup: tCommon("pageSizeLabel"),
                rowsPerPage: tCommon("rowsPerPage"),
              }}
            />
          </DataTableFoot>
        ) : null}
      </ContentPanel>
    </div>
  )
}

// A label over the row of tab links of one filter. A tab goes back to page 1 and keeps the page size (spec 2B B4).
function FilterGroup({
  label,
  options,
  activeModule,
  activeDecision,
  locale,
  param,
  pageSize,
}: {
  label: string
  options: Array<{ key: ApprovalDecisionModuleFilter | ApprovalDecisionFilter; label: string; count: number }>
  activeModule: ApprovalDecisionModuleFilter
  activeDecision: ApprovalDecisionFilter
  locale: string
  param: "module" | "decision"
  pageSize: number
}) {
  return (
    <div>
      <div className="mb-1 text-meta font-medium text-muted-foreground">{label}</div>
      <TabNav
        aria-label={label}
        items={options.map((option) => ({
          key: option.key,
          label: option.label,
          count: formatCount(option.count),
          href: buildFilterHref(locale, activeModule, activeDecision, param, option.key, { pageSize }),
        }))}
        current={param === "module" ? activeModule : activeDecision}
      />
    </div>
  )
}
```

(4) `SummaryCard`, `buildFilterHref` and `getAllowedDecisionWhere` `:285-337` (the closing brace of `DecisionRow` above them stays; `buildFilterHref` takes the page). Replace:

```tsx
}

function SummaryCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string
  value: number
  tone: "primary" | "success" | "danger" | "warning" | "muted"
  icon: React.ReactNode
}) {
  return (
    <div className={`rounded-lg border p-4 ${summaryClass(tone)}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value.toLocaleString("th-TH")}</p>
        </div>
        {icon}
      </div>
    </div>
  )
}

function buildFilterHref(
  locale: string,
  activeModule: ApprovalDecisionModuleFilter,
  activeDecision: ApprovalDecisionFilter,
  param: "module" | "decision",
  value: ApprovalDecisionModuleFilter | ApprovalDecisionFilter
) {
  const moduleFilterValue = param === "module" ? value : activeModule
  const decision = param === "decision" ? value : activeDecision
  const query = new URLSearchParams()
  if (moduleFilterValue !== "all") query.set("module", moduleFilterValue)
  if (decision !== "all") query.set("decision", decision)
  const queryString = query.toString()
  return `/${locale}/admin/approvals/history${queryString ? `?${queryString}` : ""}`
}

function getAllowedDecisionWhere(
  access: ReturnType<typeof getApprovalInboxAccess>,
  canSeeRepairCloseHistory: boolean
): Prisma.SystemLogWhereInput[] {
  const conditions: Prisma.SystemLogWhereInput[] = []
  if (access.canApproveDisposal) conditions.push({ module: "disposal", action: { in: ["approve", "reject", "execute", "execute_historical_without_evidence"] } })
  // Repair close approvals were retired in 2026-10; their old decisions stay searchable here.
  if (canSeeRepairCloseHistory) conditions.push({ module: "maintenance", action: "close" })
  if (access.canApproveAudit) conditions.push({ module: "audit", action: { in: ["approve_finding", "reject_finding", "close"] } })
  return conditions
}
```

with:

```tsx
}

function buildFilterHref(
  locale: string,
  activeModule: ApprovalDecisionModuleFilter,
  activeDecision: ApprovalDecisionFilter,
  param: "module" | "decision",
  value: ApprovalDecisionModuleFilter | ApprovalDecisionFilter,
  listPage: { page?: number; pageSize?: number },
) {
  const moduleFilterValue = param === "module" ? value : activeModule
  const decision = param === "decision" ? value : activeDecision
  const query = new URLSearchParams()
  if (moduleFilterValue !== "all") query.set("module", moduleFilterValue)
  if (decision !== "all") query.set("decision", decision)
  const queryString = appendListPage(query, listPage).toString()
  return `/${locale}/admin/approvals/history${queryString ? `?${queryString}` : ""}`
}
```

(5) `summaryClass` `:358-366` (the closing brace of `decisionPillClass` above it stays). Replace:

```tsx
}

function summaryClass(tone: "primary" | "success" | "danger" | "warning" | "muted") {
  if (tone === "primary") return "border-primary-border bg-primary-soft text-primary"
  if (tone === "success") return "border-success-border bg-success-soft text-success"
  if (tone === "danger") return "border-danger-border bg-danger-soft text-danger"
  if (tone === "warning") return "border-warning-border bg-warning-soft text-warning"
  return "border-border bg-surface text-muted-foreground"
}
```

with:

```tsx
}
```

Check: `grep -nE 'take: [0-9]|FileCheck2|FilterChip|SummaryCard|summaryClass|getAllowedDecisionWhere|filterApprovalDecisionLogItems|toLocaleString|<h1' "src/app/[locale]/(dashboard)/admin/approvals/history/page.tsx"` prints nothing (exit 1).

- [ ] **Step 10: Run the tests for the page**

Run: `node --test tests/list-pages-ui.test.ts tests/approval-decision-log.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-primitives-ui.test.ts`
Expected: PASS, `tests 133 · pass 133 · fail 0` (list-pages-ui 39 · approval-decision-log 5 · list-frame-guards 21 · visual-foundation-guards 26 · form-migration-guards 23 · list-primitives-ui 19).

Run: `node <temp>/p2b1-precheck.mjs --file "D/admin/approvals/history/page.tsx"`
Expected (exit 0): `· in MIGRATED_LIST_FILES`, rows `LH1 0 0 0 1`, `LS1 0 0 0 1`, `args    (no row holds this file)`.

- [ ] **Step 11: Prove every class compiles**

Run: `node <temp>/p2b5-tw-probe.mjs "src/app/[locale]/(dashboard)/admin/approvals/history/page.tsx"`
Expected: `checked 60 classes, missing 0` (exit 0).

- [ ] **Step 12: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` `tests 1987 · pass 1986 · fail 0 · skipped 1`; tsc no errors (the `groupBy` rows fit `ApprovalDecisionCountRow`; the three-item tuple goes through `withPerformanceTiming`); lint 0 errors and the 146 warnings under `.agents/` (`npx eslint "src/app/[locale]/(dashboard)/admin/approvals/history/page.tsx" tests/list-pages-ui.test.ts` prints nothing).

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 3 files: the page 109 insertions and 131 deletions, `tests/list-frame-guards.test.ts` 1 and 2, `tests/list-pages-ui.test.ts` 24 and 0. The page stays CRLF (`344 344`).

- [ ] **Step 13: Commit the page**

```bash
git add "src/app/[locale]/(dashboard)/admin/approvals/history/page.tsx" tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): approval history paged on the server with full counts, its filters on TabNav and a left-arrow back link (2B-5 task 5, B4, B2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 18, spec §8.9 row `/th/admin/approvals/history`):** at 1440 and 375: the strip and the "ทั้งหมด" count equal the decision count of the dev database (read-only `SELECT` on `system_logs` grouped by module and action with the allowed pairs, `asset_management_dev` only), not 150 at most; a decision tab keeps `pageSize=50` and drops `page`; `?page=999` lands on the last page; the back button reads "กลับไปงานรออนุมัติ", points left and is a 44px icon button at 375; "ดูรายละเอียด" still opens; with `PERFORMANCE_TIMING=1` the log shows `approval-history.list-data` (record it next to `admin-logs.list-data`).

---

### Task 6: `D/admin/readiness/page.tsx`, `D/admin/settings/page.tsx` (header only) and `D/access-denied/page.tsx` · PageHeader and one StatStrip; the access-denied links on the shared button look (three commits, one per file)

Spec §8.9 row 5, §4.4.6 row `D/admin/{logs, readiness, settings, storage}`, §4.4.7 row `D/access-denied/page.tsx` ("ไม่มีหัว · เป็นกล่องว่างกลางจอ"), §5.6 "หน้าสรุป" row `D/admin/readiness/page.tsx`, §5.1 row "ปุ่มระดับหน้าเขียน class เอง", §8.3 test table rows 2B-5∥2C-4 and 2B-5∥2C-5, rulings R-b, R-d, R-p, controller ruling P2 and controller rulings (a), (b) and (e). Three commits: Steps 2–7 the readiness page, Steps 8–13 the settings page, Steps 14–19 the access-denied page. Every file is CRLF: exact-string replacements only.

Rulings this task applies:
- **Readiness (§4.4.6, §5.6, R-d, R-p):** the title block becomes `PageHeader` (`title`, `meta={t("subtitle")}`); the four tinted `SummaryCard`s (`toLocaleString("th-TH")`) become one `StatStrip` of `formatCount` values (no foot lines: the page has no help text for them, and `attention` only colors a foot); `SummaryCard`, `summaryClass`, `type React` and the `Rocket` icon go. The detected value of a check (`font-mono text-xs`) is a `tag` inside its `break-all text-xs` line. The check cards, their status pills and their action links (`getSafeActionLinkClasses`, `getResponsiveActionRowClasses`) stay (2D). LH1 1 → 0, LS1 1 → 0.
- **Settings (§8.9 row 5 "หัว `:56` เท่านั้น", P2):** only the title block (`:55-58`) becomes `PageHeader title={t("title")} meta={t("subtitle")}`. `buildLdapSyncHistoryItems`, `ldapSyncHistory={ldapSyncHistory}` (`tests/system-log-history.test.ts:73-74`), the role query (`tests/settings-ldap-role-ui.test.ts:9-11`), the label keys the form reads (`tests/asset-label-print-ui.test.ts:58-61`, `tests/settings-depreciation-policy-ui.test.ts:13`) and `c/admin/system-settings-form.tsx` with its tab row (O7, 2C plan 5) stay untouched. LH1 1 → 0.
- **Access denied (§4.4.7, §5.1, R-b, R-p):** the page has no header: it is the permission empty state in the middle of the screen, and stays `<ActionEmptyState … tone="permission"` (`tests/asset-register-ux.test.ts:80`, `tests/system-state-views.test.ts:13`). What 2B changes is the two hand-written links (`bg-primary px-4 …`, `border-border … hover:bg-accent`): they become `buttonVariants({ size: "lg" })` and `buttonVariants({ variant: "outline", size: "lg" })` (they were 44px at every width; `lg` is 44 below md and 40 from md, the default page-button size of R-b), with their indentation fixed. The required-permission sentence drops `font-mono` (R-p: a code inside one translated sentence stays text in 2B, and the Thai words of the sentence fell back from Plex Mono); its box stays (2D owns boxes outside lists). The page has no guard row; it joins `MIGRATED_LIST_FILES` so L0 holds it at 0.
- **Spec §10.3, I15:** 2B does not touch the three files again, so each joins `MIGRATED_LIST_FILES` in its commit.

What users will see:
- `/th/admin/readiness`: the title is 600; the four tinted boxes are one flat strip of numbers; each check's detected value is in monospace. The check cards are unchanged.
- `/th/admin/settings`: the title is 600 with the help line under it; the form and its tabs are unchanged (2C plan 5 changes the tab row).
- `/th/access-denied`: the two buttons have the shared look (40px from md, 44px on phones); the permission sentence is in the normal font.

Not in this task: `c/admin/system-settings-form.tsx` (2C plan 5, O7) · the readiness check cards (2D) · docs (Task 19). Do not run a formatter.

**Files:**
- Modify (commit 1): `src/app/[locale]/(dashboard)/admin/readiness/page.tsx` (`i/lf w/crlf`; 5 exact replacements)
- Modify (commit 2): `src/app/[locale]/(dashboard)/admin/settings/page.tsx` (`i/lf w/crlf`; 2 exact replacements)
- Modify (commit 3): `src/app/[locale]/(dashboard)/access-denied/page.tsx` (`i/lf w/crlf`; 2 exact replacements)
- Modify (each commit): `tests/list-pages-ui.test.ts` (`i/lf w/crlf`; one block appended) · `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only; none of the three has a VFG row)
- Temp folder only, never committed: `t06a-pages-block.ts`, `t06b-pages-block.ts`, `t06c-pages-block.ts`

**Must keep passing without edits:**
- `tests/system-log-history.test.ts:66-84` · `tests/asset-label-print-ui.test.ts:36-61` · `tests/settings-depreciation-policy-ui.test.ts` · `tests/settings-ldap-role-ui.test.ts` · `tests/settings-tab-persistence-ui.test.ts` (nobody edits them while 2C plan 5 runs, spec §8.3)
- `tests/asset-register-ux.test.ts:74-83` · `tests/system-state-views.test.ts` · `tests/permission-aware-navigation.test.ts` · `tests/production-readiness.test.ts` · `tests/form-migration-guards.test.ts` (GL2: `admin/settings` stays a focus route)

**Interfaces:**
- Consumes: `PageHeader`, `StatStrip`, `formatCount`, `buttonVariants` (Tasks 1–5); `ActionEmptyState` (unchanged import); Task 1's scripts.
- Produces: the three files in `MIGRATED_LIST_FILES`; the tests `readiness: PageHeader, one StatStrip, and each detected value as a code (spec 2B §4.4.6, §5.6)`, `settings: the header is PageHeader and the page still hands the form its LDAP sync history (spec 2B §4.4.6)` and `access denied: the permission empty state with its two links on the shared button look (spec 2B §4.4.7)`.

| guard | readiness · settings · access-denied before → after | plan total (budget) before → after |
|---|---|---|
| LFG LH1 | 1 · 1 · – → – | 13 → 11 (live 11 → 9) |
| LFG LS1 | 1 · – · – → – | 10 → 9 |
| `MIGRATED_LIST_FILES` | – → all three join | 82 → 85 |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b5-t1-precheck.mjs 6`
Expected: `git status` prints nothing. The script prints (exit 0) the ten `ok` lines for the primitives and the keys, then:
```
ok      Task 1 is in
ok      Task 2 is in
ok      Task 3 is in
ok      Task 4 is in
ok      Task 5 is in
ok      Task 6 has not run yet
ok      src/app/[locale]/(dashboard)/admin/readiness/page.tsx is unchanged since 6835bdf (hash a154d34e4b78b447)
ok      src/app/[locale]/(dashboard)/admin/settings/page.tsx is unchanged since 6835bdf (hash 93e275abe5371b9a)
ok      src/app/[locale]/(dashboard)/access-denied/page.tsx is unchanged since 6835bdf (hash 9ee1c5596e3218af)
info    src/app/[locale]/(dashboard)/admin/readiness/page.tsx: CRLF
info    src/app/[locale]/(dashboard)/admin/settings/page.tsx: CRLF
info    src/app/[locale]/(dashboard)/access-denied/page.tsx: CRLF
preconditions hold for Task 6
```

Run, one after the other: `node <temp>/p2b1-precheck.mjs --file "D/admin/readiness/page.tsx"`, `… --file "D/admin/settings/page.tsx"`, `… --file "D/access-denied/page.tsx"`
Expected (exit 0 each), after the header lines: readiness `not in MIGRATED_LIST_FILES` with rows `LH1 1 1 0 1`, `LS1 1 1 0 1` and `args    LH1=1:1 LS1=1:1`; settings with `LH1 1 1 0 1` and `args    LH1=1:1`; access-denied with no row and `args    (no row holds this file)`.

Run: `git ls-files --eol "src/app/[[]locale]/(dashboard)/admin/readiness/page.tsx" "src/app/[[]locale]/(dashboard)/admin/settings/page.tsx" "src/app/[[]locale]/(dashboard)/access-denied/page.tsx" tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf w/crlf` for all five.

- [ ] **Step 2: Readiness · write the failing test**

Save this block as `<temp>/t06a-pages-block.ts`:

```ts
// Plan 2B-5 Task 6 (spec 2B §4.4.6, §5.6 "หน้าสรุป" row readiness, R-d, R-p): the readiness header is PageHeader, the
// four tinted SummaryCards are one StatStrip, and the detected value of a check reads as a code. The check cards stay.
test("readiness: PageHeader, one StatStrip, and each detected value as a code (spec 2B §4.4.6, §5.6)", () => {
  const source = read(`${D}admin/readiness/page.tsx`)
  assert.match(source, /<div className="space-y-6">\n\s+<PageHeader title=\{t\("title"\)\} meta=\{t\("subtitle"\)\} \/>\n\n\s+<StatStrip\n/)
  assert.equal(source.match(/value: formatCount\(summary\.(?:total|pass|warning|fail)\)/g)?.length, 4)
  assert.match(source, /<span className="tag">\{check\.value\}<\/span>/)
  assert.doesNotMatch(source, /<h1\b|function (?:SummaryCard|summaryClass)\b|toLocaleString\(|font-mono/)
})
```

Run: `node <temp>/p2b5-append.mjs <temp>/t06a-pages-block.ts tests/list-pages-ui.test.ts`, then `node --test tests/list-pages-ui.test.ts`
Expected: `appended … (CRLF)`; FAIL, `tests 40 · pass 39 · fail 1`: `readiness: PageHeader, one StatStrip, and each detected value as a code (spec 2B §4.4.6, §5.6)`: the input did not match the regular expression `/<div className="space-y-6">\n\s+<PageHeader title=\{t\("title"\)\} meta=\{t\("subtitle"\)\} \/>\n\n\s+<StatStrip\n/`

- [ ] **Step 3: Readiness · lower the guard rows (the failing guards)**

Run: `node <temp>/p2b-budget.mjs "D/admin/readiness/page.tsx" LH1=1:0 LS1=1:0 --migrated`
Expected (exit 0): `LH1: 1 -> 0 (row deleted)`, `LS1: 1 -> 0 (row deleted)`, `MIGRATED_LIST_FILES: added`, `written: src/app/[locale]/(dashboard)/admin/readiness/page.tsx`.

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 44 · fail 3`, each naming only `src/app/[locale]/(dashboard)/admin/readiness/page.tsx`: `LH1 …` (`LH1: 11 in 11 files`, `1 > 0`) · `LS1 …` (`10 in 8`, `1 > 0`) · `L0 …` (`LH1 …: 1 > 0`, `LS1 …: 1 > 0`).

- [ ] **Step 4: Readiness · the header and the strip (`src/app/[locale]/(dashboard)/admin/readiness/page.tsx`, CRLF)**

Five exact replacements, top to bottom.

(1) Imports `:1-18`. Replace:

```tsx
import Link from "next/link"
import { existsSync } from "node:fs"
import { join } from "node:path"
import type React from "react"
import { AlertTriangle, ArrowRight, CheckCircle2, Database, Rocket, ShieldCheck, XCircle } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { getApprovalPermissionMatrixUsers } from "@/lib/approval-permission-matrix-query"
import { buildApprovalPermissionMatrix } from "@/lib/approval-permission-matrix"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { buildProductionReadinessChecks, summarizeProductionReadiness, type ProductionReadinessCheck } from "@/lib/production-readiness"
import { getResponsiveActionRowClasses, getSafeActionLinkClasses } from "@/lib/design-system"
import {
  ldapSyncLastStatusKey,
  notificationDigestLastStatusKey,
  systemSettingDefaults,
} from "@/lib/system-setting-defaults"
import { parseWorkflowApprovalPolicy } from "@/lib/workflow-approval"
```

with:

```tsx
import Link from "next/link"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { AlertTriangle, ArrowRight, CheckCircle2, Database, ShieldCheck, XCircle } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { getApprovalPermissionMatrixUsers } from "@/lib/approval-permission-matrix-query"
import { buildApprovalPermissionMatrix } from "@/lib/approval-permission-matrix"
import { prisma } from "@/lib/db"
import { formatCount } from "@/lib/display-format"
import { requirePagePermission } from "@/lib/page-auth"
import { buildProductionReadinessChecks, summarizeProductionReadiness, type ProductionReadinessCheck } from "@/lib/production-readiness"
import { getResponsiveActionRowClasses, getSafeActionLinkClasses } from "@/lib/design-system"
import {
  ldapSyncLastStatusKey,
  notificationDigestLastStatusKey,
  systemSettingDefaults,
} from "@/lib/system-setting-defaults"
import { parseWorkflowApprovalPolicy } from "@/lib/workflow-approval"
import { PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
```

(2) The title block and the boxes `:75-87`. Replace:

```tsx
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <SummaryCard label={t("summaryTotal")} value={summary.total} tone="primary" icon={<Rocket className="h-5 w-5" />} />
        <SummaryCard label={t("summaryPass")} value={summary.pass} tone="success" icon={<CheckCircle2 className="h-5 w-5" />} />
        <SummaryCard label={t("summaryWarning")} value={summary.warning} tone="warning" icon={<AlertTriangle className="h-5 w-5" />} />
        <SummaryCard label={t("summaryFail")} value={summary.fail} tone="danger" icon={<XCircle className="h-5 w-5" />} />
      </section>
```

with:

```tsx
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} meta={t("subtitle")} />

      <StatStrip
        items={[
          { key: "total", label: t("summaryTotal"), value: formatCount(summary.total) },
          { key: "pass", label: t("summaryPass"), value: formatCount(summary.pass) },
          { key: "warning", label: t("summaryWarning"), value: formatCount(summary.warning) },
          { key: "fail", label: t("summaryFail"), value: formatCount(summary.fail) },
        ]}
      />
```

(3) `SummaryCard` `:130-154` (the closing brace of the page function stays). Replace:

```tsx
}

function SummaryCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string
  value: number
  tone: "primary" | "success" | "warning" | "danger"
  icon: React.ReactNode
}) {
  return (
    <div className={`rounded-lg border p-4 ${summaryClass(tone)}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value.toLocaleString("th-TH")}</p>
        </div>
        {icon}
      </div>
    </div>
  )
}
```

with:

```tsx
}
```

(4) The detected value `:186`. Replace:

```tsx
          <div className="mt-1 break-all font-mono text-xs text-foreground">{check.value}</div>
```

with:

```tsx
          <div className="mt-1 break-all text-xs text-foreground"><span className="tag">{check.value}</span></div>
```

(5) `summaryClass` `:258-265` (the closing brace of `statusPillClass` stays). Replace:

```tsx
}

function summaryClass(tone: "primary" | "success" | "warning" | "danger") {
  if (tone === "success") return "border-success-border bg-success-soft text-success"
  if (tone === "warning") return "border-warning-border bg-warning-soft text-warning"
  if (tone === "danger") return "border-danger-border bg-danger-soft text-danger"
  return "border-primary-border bg-primary-soft text-primary"
}
```

with:

```tsx
}
```

- [ ] **Step 5: Readiness · run the tests and the probe**

Run: `node --test tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/production-readiness.test.ts`
Expected: PASS, `tests 114 · pass 114 · fail 0` (list-pages-ui 40 · list-frame-guards 21 · visual-foundation-guards 26 · form-migration-guards 23 · production-readiness 4).

Run: `node <temp>/p2b5-tw-probe.mjs "src/app/[locale]/(dashboard)/admin/readiness/page.tsx"`
Expected: `checked 41 classes, missing 0` (exit 0; plan 2B-4's probe took the PWA file names `apple-icon.png` … `maskable-512.png` for classes).

- [ ] **Step 6: Readiness · full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` `tests 1988 · pass 1987 · fail 0 · skipped 1`; tsc no errors; lint 0 errors and the 146 warnings under `.agents/`. `git diff --stat`: 3 files: the page 14 insertions and 44 deletions, `tests/list-frame-guards.test.ts` 1 and 2, `tests/list-pages-ui.test.ts` 10 and 0. The page stays CRLF (`235 235`).

- [ ] **Step 7: Readiness · commit**

```bash
git add "src/app/[locale]/(dashboard)/admin/readiness/page.tsx" tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): production readiness on PageHeader and StatStrip, detected values as codes (2B-5 task 6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit.

- [ ] **Step 8: Settings · write the failing test**

Save this block as `<temp>/t06b-pages-block.ts`:

```ts
// Plan 2B-5 Task 6 (spec 2B §4.4.6, §8.9 row 5): only the settings header changes. The form, its tab row (O7, 2C plan 5)
// and the LDAP sync history the page hands it stay as they are (tests/system-log-history.test.ts:73-74).
test("settings: the header is PageHeader and the page still hands the form its LDAP sync history (spec 2B §4.4.6)", () => {
  const source = read(`${D}admin/settings/page.tsx`)
  assert.match(source, /<div className="space-y-6">\n\s+<PageHeader title=\{t\("title"\)\} meta=\{t\("subtitle"\)\} \/>\n\n\s+<SystemSettingsForm\n/)
  assert.match(source, /const ldapSyncHistory = buildLdapSyncHistoryItems\(ldapSyncLogs\)/)
  assert.match(source, /ldapSyncHistory=\{ldapSyncHistory\}/)
  assert.doesNotMatch(source, /<h1\b/)
})
```

Run: `node <temp>/p2b5-append.mjs <temp>/t06b-pages-block.ts tests/list-pages-ui.test.ts`, then `node --test tests/list-pages-ui.test.ts`
Expected: FAIL, `tests 41 · pass 40 · fail 1`: `settings: the header is PageHeader and the page still hands the form its LDAP sync history (spec 2B §4.4.6)`: the input did not match the regular expression `/<div className="space-y-6">\n\s+<PageHeader title=\{t\("title"\)\} meta=\{t\("subtitle"\)\} \/>\n\n\s+<SystemSettingsForm\n/`

- [ ] **Step 9: Settings · lower the guard row (the failing guards)**

Run: `node <temp>/p2b-budget.mjs "D/admin/settings/page.tsx" LH1=1:0 --migrated`
Expected (exit 0): `LH1: 1 -> 0 (row deleted)`, `MIGRATED_LIST_FILES: added`, `written: src/app/[locale]/(dashboard)/admin/settings/page.tsx`.

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 45 · fail 2`: `LH1 …` (`LH1: 10 in 10 files`, `…/admin/settings/page.tsx: 1 > 0`) · `L0 …` (`LH1 …/admin/settings/page.tsx: 1 > 0`).

- [ ] **Step 10: Settings · the header only (`src/app/[locale]/(dashboard)/admin/settings/page.tsx`, CRLF)**

(1) The import of the form `:4`. Replace:

```tsx
import { SystemSettingsForm } from "@/components/admin/system-settings-form"
```

with:

```tsx
import { SystemSettingsForm } from "@/components/admin/system-settings-form"
import { PageHeader } from "@/components/ui/page-header"
```

(2) The title block `:55-58`. Replace:

```tsx
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
```

with:

```tsx
      <PageHeader title={t("title")} meta={t("subtitle")} />
```

Nothing else in the file changes.

- [ ] **Step 11: Settings · run the tests and the probe**

Run: `node --test tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/system-log-history.test.ts tests/asset-label-print-ui.test.ts tests/settings-depreciation-policy-ui.test.ts tests/settings-ldap-role-ui.test.ts tests/settings-tab-persistence-ui.test.ts`
Expected: PASS, `tests 136 · pass 136 · fail 0` (list-pages-ui 41 · list-frame-guards 21 · visual-foundation-guards 26 · form-migration-guards 23 · system-log-history 3 · asset-label-print-ui 14 · settings-depreciation-policy-ui 6 · settings-ldap-role-ui 1 · settings-tab-persistence-ui 1).

Run: `node <temp>/p2b5-tw-probe.mjs "src/app/[locale]/(dashboard)/admin/settings/page.tsx"`
Expected: `checked 1 classes, missing 0` (exit 0).

- [ ] **Step 12: Settings · full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` `tests 1989 · pass 1988 · fail 0 · skipped 1`; tsc no errors; lint 0 errors and the 146 warnings under `.agents/`. `git diff --stat`: 3 files: the page 2 insertions and 4 deletions, `tests/list-frame-guards.test.ts` 1 and 1, `tests/list-pages-ui.test.ts` 10 and 0. The page stays CRLF (`364 364`).

- [ ] **Step 13: Settings · commit**

```bash
git add "src/app/[locale]/(dashboard)/admin/settings/page.tsx" tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): system settings header on PageHeader (2B-5 task 6, header only)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit.

- [ ] **Step 14: Access denied · write the failing test**

Save this block as `<temp>/t06c-pages-block.ts`:

```ts
// Plan 2B-5 Task 6 (spec 2B §4.4.7, §5.1 row "page buttons", R-b, R-p): the access-denied page has no header; it is
// the permission empty state in the middle of the screen. Its two links take the shared button look, and the required
// permission is one translated sentence, so it is not set in the code font (Thai words in Plex Mono fall back).
test("access denied: the permission empty state with its two links on the shared button look (spec 2B §4.4.7)", () => {
  const source = read(`${D}access-denied/page.tsx`)
  assert.match(source, /<ActionEmptyState\n\s+tone="permission"/)
  assert.match(source, /<Link href=\{`\/\$\{locale\}\/dashboard`\} className=\{buttonVariants\(\{ size: "lg" \}\)\}>/)
  assert.match(source, /<Link href=\{`\/\$\{locale\}\/work-center`\} className=\{buttonVariants\(\{ variant: "outline", size: "lg" \}\)\}>/)
  assert.doesNotMatch(source, /font-mono|\bbg-primary\b|hover:bg-accent|<h1\b/)
})
```

Run: `node <temp>/p2b5-append.mjs <temp>/t06c-pages-block.ts tests/list-pages-ui.test.ts`, then `node --test tests/list-pages-ui.test.ts`
Expected: FAIL, `tests 42 · pass 41 · fail 1`: `access denied: the permission empty state with its two links on the shared button look (spec 2B §4.4.7)`: the input did not match the regular expression `/<Link href=\{`\/\$\{locale\}\/dashboard`\} className=\{buttonVariants\(\{ size: "lg" \}\)\}>/` (the `tone="permission"` line already passes).

- [ ] **Step 15: Access denied · join `MIGRATED_LIST_FILES` (no guard row to lower)**

Run: `node <temp>/p2b-budget.mjs "D/access-denied/page.tsx" --migrated`
Expected (exit 0): `MIGRATED_LIST_FILES: added` and `written: src/app/[locale]/(dashboard)/access-denied/page.tsx`. `node --test tests/list-frame-guards.test.ts` still passes (`tests 21 · pass 21`): the page has no count on any guard.

- [ ] **Step 16: Access denied · the two links (`src/app/[locale]/(dashboard)/access-denied/page.tsx`, CRLF)**

(1) Imports `:3`. Replace:

```tsx
import { ActionEmptyState } from "@/components/ui/action-empty-state"
```

with:

```tsx
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
```

(2) The details and the actions `:26-46`. Replace:

```tsx
          details={permission ? (
            <p className="rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground">
              {t("requestedPermission", { permission })}
            </p>
          ) : null}
          action={(
            <div className="flex flex-col justify-center gap-2 sm:flex-row">
          <Link
            href={`/${locale}/dashboard`}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t("backDashboard")}
          </Link>
          <Link
            href={`/${locale}/work-center`}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t("openWorkCenter")}
          </Link>
            </div>
          )}
```

with:

```tsx
          details={permission ? (
            <p className="rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
              {t("requestedPermission", { permission })}
            </p>
          ) : null}
          action={(
            <div className="flex flex-col justify-center gap-2 sm:flex-row">
              <Link href={`/${locale}/dashboard`} className={buttonVariants({ size: "lg" })}>
                {t("backDashboard")}
              </Link>
              <Link href={`/${locale}/work-center`} className={buttonVariants({ variant: "outline", size: "lg" })}>
                {t("openWorkCenter")}
              </Link>
            </div>
          )}
```

- [ ] **Step 17: Access denied · run the tests and the probe**

Run: `node --test tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/asset-register-ux.test.ts tests/system-state-views.test.ts tests/permission-aware-navigation.test.ts`
Expected: PASS, `tests 139 · pass 139 · fail 0` (list-pages-ui 42 · list-frame-guards 21 · visual-foundation-guards 26 · form-migration-guards 23 · asset-register-ux 20 · system-state-views 1 · permission-aware-navigation 6).

Run: `node <temp>/p2b5-tw-probe.mjs "src/app/[locale]/(dashboard)/access-denied/page.tsx"`
Expected: `checked 16 classes, missing 0` (exit 0).

- [ ] **Step 18: Access denied · full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` `tests 1990 · pass 1989 · fail 0 · skipped 1`; tsc no errors; lint 0 errors and the 146 warnings under `.agents/`. `git diff --stat`: 3 files: the page 8 insertions and 13 deletions, `tests/list-frame-guards.test.ts` 1 and 0, `tests/list-pages-ui.test.ts` 11 and 0. The page stays CRLF (`46 46`).

- [ ] **Step 19: Access denied · commit**

```bash
git add "src/app/[locale]/(dashboard)/access-denied/page.tsx" tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): access-denied links on the shared button look, the permission sentence out of the code font (2B-5 task 6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 18, spec §8.9 row `/th/admin/readiness` · `/th/admin/settings` · `/th/access-denied`):** at 1440: the readiness title and strip; the settings title over the unchanged form (its tab row is 2C plan 5's); `/th/access-denied?module=setting&action=view` shows the permission state centered, the sentence "สิทธิ์ที่ต้องใช้: setting:view" in the normal font, "กลับแดชบอร์ด" (primary) and "เปิดศูนย์งาน" (outline) at 40px; at 375 they stack at 44px.

---

### Task 7: `D/notifications/page.tsx` · the notification type in Thai words (bug §5.10 #1), PageHeader, one StatStrip and the shared StatusBadge (never `notification-center-actions.tsx`)

Spec §8.9 row 6, §5.6 row `notifications`, §5.10 #1, §5.11, §10.2 (keys `notifications.type_info`, `type_warning`, `type_danger`, `type_success`), §8.11 row 9 (O17), §4.4.6 row `D/notifications/page.tsx`, `docs/19_THAI_GLOSSARY.md` (a status code without a translation shows as it is), rulings R-d, R-n and controller rulings (a), (c) and (e). One file, one commit (the page, its messages and its test). The page and its test are CRLF: exact-string replacements only.

Rulings this task applies:
- **§5.10 #1, §10.2:** a delivered notification showed its raw type (`warning`, `danger`, `info`) in a hand-made pill (`:127`, `notificationToneClass`). It is now the shared `StatusBadge` with `label={t.has(`type_${notification.type}`) ? t(`type_${notification.type}`) : notification.type}` and `tone={notification.type}` (the four types are `StatusTone`s; `prisma/schema.prisma` `Notification.type`); an unknown type shows as it is. The four keys come in through `scripts/messages-edit.mjs` with the copy of §10.2: ทั่วไป · ควรติดตาม · เร่งด่วน · เรียบร้อย / General · Needs attention · Urgent · Done. `notificationToneClass` goes.
- **§5.6, LN2:** the local `StatusBadge` (`:156-158`, a grey pill; its name shadows the shared component) goes; "อ่านแล้ว" and "เลื่อนเตือน" are the shared `StatusBadge` with `tone="muted"`. LN2 1 → 0.
- **§5.6, R-d:** the four tinted `SummaryCard`s become one `StatStrip` of `formatCount` values; `SummaryCard`, `summaryClass`, `type ReactNode` and the four icons go. LS1 1 → 0.
- **§4.4.6, I1:** the title block becomes `PageHeader` (`title={t("centerTitle")}`, `meta={t("centerSubtitle")}`) with "เปิดศูนย์งานค้าง" as `buttonVariants({ variant: "outline", size: "md" })` (it was `h-10`). LH1 1 → 0.
- **§5.6, DS (no fading):** a muted item faded its whole card with `opacity-70` (`:76`, so its buttons faded too); its title is `text-muted-foreground` instead, and the card keeps full ink.
- **§5.6, §5.7:** the item count `toLocaleString(locale …)` (`:81`) is `formatCount`; its tone pill (`toneClass`) stays (2D owns the hand-made pills, §5.1). The two dashed empty boxes become `EmptyNote padded`.
- **O17, §8.11 row 9:** `NotificationCenterActions` is placed as before with the same labels; `c/notifications/notification-center-actions.tsx` (2C plan 4's file) is never edited.
- **Spec §10.3, I15:** 2B does not touch the page again, so it joins `MIGRATED_LIST_FILES` (every counter 0).

What users will see on `/th/notifications`:
- The title is 600 with a 36px outline "เปิดศูนย์งานค้าง" (44px on phones); the four tinted boxes are one flat strip of numbers.
- A delivered digest shows its type as "ทั่วไป", "ควรติดตาม", "เร่งด่วน" or "เรียบร้อย" in a status badge with its color dot (it showed `warning`, `danger`, `info`).
- A muted item keeps its card and buttons at full strength; only its title turns grey. "อ่านแล้ว" and "เลื่อนเตือน" are the shared grey badges.
- An empty list is a quiet line of text, not a dashed box.

Not in this task: `c/notifications/notification-center-actions.tsx` (2C plan 4, O17) · the count tone pill (2D) · the `take: 10` of delivered digests (§5.12, not a B4 list) · docs (Task 19). Do not run a formatter.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/notifications/page.tsx` (`i/lf w/crlf`; 5 exact replacements)
- Modify: `messages/th.json`, `messages/en.json` (`i/lf w/crlf`; through `node scripts/messages-edit.mjs` only: 4 new keys per locale)
- Modify: `tests/list-pages-ui.test.ts` (`i/lf w/crlf`; one block appended) · `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only; the page has no VFG row)
- Temp folder only, never committed: `t07-pages-block.ts`, `t07-messages.json`

**Must keep passing without edits:** `tests/notification-topbar-behavior.test.ts` (it reads `notification-center-actions.tsx`) · `tests/notification-center.test.ts` · `tests/thai-glossary.test.ts` · VFG `no caller passes a database color to StatusBadge` (more than 40 call sites; the page now renders the shared one in 4 places, none with `color=`) · `tests/form-migration-guards.test.ts`

**Interfaces:**
- Consumes: `PageHeader`, `StatStrip`, `formatCount`, `buttonVariants` (Tasks 1–6); `EmptyNote` (Task 3); `StatusBadge({ label, status?, tone?: StatusTone | string, className? })` from `@/components/ui/status-badge`; `t.has(key)` of next-intl 4 (as `D/audit/findings/page.tsx:232` uses it); Task 1's scripts.
- Produces: `notifications.type_info`, `type_warning`, `type_danger`, `type_success` in both message files; the page without `SummaryCard`, the local `StatusBadge`, `notificationToneClass` and `summaryClass`; in `MIGRATED_LIST_FILES`; the test `notifications: PageHeader, one StatStrip, the shared StatusBadge, and each delivered type in words (spec 2B §5.6, §5.10 #1)`.

| guard | `D/notifications/page.tsx` before → after | plan total (budget) before → after |
|---|---|---|
| LFG LH1 · LS1 · LN2 | 1 · 1 · 1 → – | 11 → 10 · 9 → 8 · 5 → 4 |
| `MIGRATED_LIST_FILES` | – → joins | 85 → 86 |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b5-t1-precheck.mjs 7`
Expected: `git status` prints nothing. The script prints (exit 0) the ten `ok` lines for the primitives and the keys, then `ok      Task 1 is in` … `ok      Task 6 is in`, `ok      Task 7 has not run yet`, `ok      src/app/[locale]/(dashboard)/notifications/page.tsx is unchanged since 6835bdf (hash 1698c4446ef790c1)`, `info    src/app/[locale]/(dashboard)/notifications/page.tsx: CRLF` and `preconditions hold for Task 7`.

Run: `node <temp>/p2b1-precheck.mjs --file D/notifications/page.tsx`
Expected (exit 0):
```
file    src/app/[locale]/(dashboard)/notifications/page.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LH1        1       1     0     1
LS1        1       1     0     1
LN2        1       1     0     1
args    LH1=1:1 LS1=1:1 LN2=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol "src/app/[[]locale]/(dashboard)/notifications/page.tsx" tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts messages/th.json messages/en.json`
Expected: `i/lf w/crlf` for all five.

- [ ] **Step 2: Write the failing test (`tests/list-pages-ui.test.ts`)**

Save this block as `<temp>/t07-pages-block.ts`:

```ts
// Plan 2B-5 Task 7 (spec 2B §5.6 row notifications, bug §5.10 #1, R-d, O17): the notification center. A delivered
// notification shows its type in Thai words (it showed warning, danger or info), the local StatusBadge and the tinted
// SummaryCards give way to the shared parts, and a muted item greys its title instead of fading the whole card.
// notification-center-actions.tsx (2C plan 4, O17) is placed as before and never edited here.
test("notifications: PageHeader, one StatStrip, the shared StatusBadge, and each delivered type in words (spec 2B §5.6, §5.10 #1)", () => {
  const source = read(`${D}notifications/page.tsx`)
  for (const part of ["<PageHeader", "<StatStrip", "<NotificationCenterActions", "<EmptyNote padded>{t(\"empty\")}</EmptyNote>", "<EmptyNote padded>{t(\"deliveredDigestEmpty\")}</EmptyNote>"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /^import \{ StatusBadge \} from "@\/components\/ui\/status-badge"$/m)
  assert.match(source, /<StatusBadge label=\{t\.has\(`type_\$\{notification\.type\}`\) \? t\(`type_\$\{notification\.type\}`\) : notification\.type\} tone=\{notification\.type\} \/>/, "bug §5.10 #1: the type in words, an unknown type as it is")
  assert.match(source, /<h2 className=\{item\.isSuppressed \? "font-semibold text-muted-foreground" : "font-semibold text-foreground"\}>/)
  assert.match(source, /\{formatCount\(item\.count\)\}/)
  assert.match(source, /<Link href=\{`\/\$\{locale\}\/work-center`\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.doesNotMatch(source, /function (?:SummaryCard|StatusBadge|notificationToneClass|summaryClass)\b|opacity-70|toLocaleString\(|border-dashed|<h1\b/)
  for (const locale of ["th", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { notifications: Record<string, unknown> }
    for (const type of ["info", "warning", "danger", "success"]) assert.equal(typeof messages.notifications[`type_${type}`], "string", `${locale}: notifications.type_${type}`)
  }
})
```

Run: `node <temp>/p2b5-append.mjs <temp>/t07-pages-block.ts tests/list-pages-ui.test.ts`, then `node --test tests/list-pages-ui.test.ts`
Expected: `appended … (CRLF)`; FAIL, `tests 43 · pass 42 · fail 1`: `notifications: PageHeader, one StatStrip, the shared StatusBadge, and each delivered type in words (spec 2B §5.6, §5.10 #1)`: `no <PageHeader`

- [ ] **Step 3: The message keys**

Save this file as `<temp>/t07-messages.json` (UTF-8):

```json
{
  "set": {
    "th": {
      "notifications.type_info": "ทั่วไป",
      "notifications.type_warning": "ควรติดตาม",
      "notifications.type_danger": "เร่งด่วน",
      "notifications.type_success": "เรียบร้อย"
    },
    "en": {
      "notifications.type_info": "General",
      "notifications.type_warning": "Needs attention",
      "notifications.type_danger": "Urgent",
      "notifications.type_success": "Done"
    }
  }
}
```

Run from the repo root: `node scripts/messages-edit.mjs <temp>/t07-messages.json`
Expected: `messages updated: 4 th, 4 en, 0 deleted`. `git diff --numstat messages` shows `5 1` for each file (the comma after the last key of `notifications`, `deliveredDigestEmpty`, and the four new last keys). Both files stay CRLF (`4318 4318`).

Run: `node --test tests/thai-glossary.test.ts`
Expected: PASS, `tests 3 · pass 3 · fail 0`.

- [ ] **Step 4: Lower the guard rows of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs D/notifications/page.tsx LH1=1:0 LS1=1:0 LN2=1:0 --migrated`
Expected (exit 0): `LH1: 1 -> 0 (row deleted)`, `LS1: 1 -> 0 (row deleted)`, `LN2: 1 -> 0 (row deleted)`, `MIGRATED_LIST_FILES: added`, `written: src/app/[locale]/(dashboard)/notifications/page.tsx`.

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 43 · fail 4`, each naming only `src/app/[locale]/(dashboard)/notifications/page.tsx`: `LH1 …` (`LH1: 9 in 9 files`, `1 > 0`) · `LS1 …` (`9 in 7`, `1 > 0`) · `LN2 no local function takes the name of a shared component` (`5 in 5`, `1 > 0`) · `L0 …` (`LH1 …: 1 > 0`, `LS1 …: 1 > 0`, `LN2 …: 1 > 0`).

- [ ] **Step 5: Move the page onto the primitives (`src/app/[locale]/(dashboard)/notifications/page.tsx`, CRLF)**

Five exact replacements, top to bottom. Make all five before you compile.

(1) Imports `:1-8`. Replace:

```tsx
import Link from "next/link"
import type { ReactNode } from "react"
import { Bell, CheckCircle2, Clock3, UserRound } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { requireAuth } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { getNotificationCenter } from "@/lib/notification-summary"
import { NotificationCenterActions } from "@/components/notifications/notification-center-actions"
```

with:

```tsx
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { requireAuth } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { formatCount } from "@/lib/display-format"
import { getNotificationCenter } from "@/lib/notification-summary"
import { NotificationCenterActions } from "@/components/notifications/notification-center-actions"
import { buttonVariants } from "@/components/ui/button-variants"
import { EmptyNote } from "@/components/ui/empty-note"
import { PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
```

(2) The title, the boxes and the head of each center item `:47-84` (the rest of the item and `NotificationCenterActions` below stay byte for byte). Replace:

```tsx
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("centerTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("centerSubtitle")}</p>
        </div>
        <Link
          href={`/${locale}/work-center`}
          className="inline-flex h-10 w-fit items-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
        >
          {t("openWorkCenter")}
        </Link>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <SummaryCard icon={<Bell className="h-5 w-5" />} label={t("active")} value={activeItems.length} tone="primary" />
        <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label={t("read")} value={readItems.length} tone="success" />
        <SummaryCard icon={<Clock3 className="h-5 w-5" />} label={t("snoozed")} value={snoozedItems.length} tone="warning" />
        <SummaryCard icon={<UserRound className="h-5 w-5" />} label={t("assigned")} value={assignedItems.length} tone="muted" />
      </section>

      <section className="space-y-3">
        {center.items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
            {t("empty")}
          </div>
        ) : (
          center.items.map((item) => (
            <article key={item.key} className={`rounded-lg border bg-surface p-4 ${item.isSuppressed ? "opacity-70" : ""}`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-foreground">{t(item.key)}</h2>
                    <span className={toneClass(item.tone)}>{item.count.toLocaleString(locale === "th" ? "th-TH" : "en-US")}</span>
                    {item.isRead ? <StatusBadge>{t("read")}</StatusBadge> : null}
                    {item.isSnoozed ? <StatusBadge>{t("snoozed")}</StatusBadge> : null}
                  </div>
```

with:

```tsx
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("centerTitle")}
        meta={t("centerSubtitle")}
        actions={
          <Link href={`/${locale}/work-center`} className={buttonVariants({ variant: "outline", size: "md" })}>
            {t("openWorkCenter")}
          </Link>
        }
      />

      <StatStrip
        items={[
          { key: "active", label: t("active"), value: formatCount(activeItems.length) },
          { key: "read", label: t("read"), value: formatCount(readItems.length) },
          { key: "snoozed", label: t("snoozed"), value: formatCount(snoozedItems.length) },
          { key: "assigned", label: t("assigned"), value: formatCount(assignedItems.length) },
        ]}
      />

      <section className="space-y-3">
        {center.items.length === 0 ? (
          <EmptyNote padded>{t("empty")}</EmptyNote>
        ) : (
          center.items.map((item) => (
            <article key={item.key} className="rounded-lg border bg-surface p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className={item.isSuppressed ? "font-semibold text-muted-foreground" : "font-semibold text-foreground"}>{t(item.key)}</h2>
                    <span className={toneClass(item.tone)}>{formatCount(item.count)}</span>
                    {item.isRead ? <StatusBadge label={t("read")} tone="muted" /> : null}
                    {item.isSnoozed ? <StatusBadge label={t("snoozed")} tone="muted" /> : null}
                  </div>
```

(3) The delivered digests `:111-137`. Replace:

```tsx
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("deliveredDigestTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("deliveredDigestSubtitle")}</p>
        </div>
        {deliveredNotifications.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-sm text-muted-foreground">
            {t("deliveredDigestEmpty")}
          </div>
        ) : (
          deliveredNotifications.map((notification) => (
            <article key={notification.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{notification.title}</h3>
                    <span className={notificationToneClass(notification.type)}>{notification.type}</span>
                    {notification.isRead ? <StatusBadge>{t("read")}</StatusBadge> : null}
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{notification.message}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDate(notification.createdAt.toISOString(), locale)}</span>
              </div>
            </article>
          ))
        )}
      </section>
```

with:

```tsx
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("deliveredDigestTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("deliveredDigestSubtitle")}</p>
        </div>
        {deliveredNotifications.length === 0 ? (
          <EmptyNote padded>{t("deliveredDigestEmpty")}</EmptyNote>
        ) : (
          deliveredNotifications.map((notification) => (
            <article key={notification.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{notification.title}</h3>
                    <StatusBadge label={t.has(`type_${notification.type}`) ? t(`type_${notification.type}`) : notification.type} tone={notification.type} />
                    {notification.isRead ? <StatusBadge label={t("read")} tone="muted" /> : null}
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{notification.message}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDate(notification.createdAt.toISOString(), locale)}</span>
              </div>
            </article>
          ))
        )}
      </section>
```

(4) `SummaryCard` and the local `StatusBadge` `:140-158` (the closing brace of the page function stays; `toneClass` below stays). Replace:

```tsx
}

function SummaryCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone: "primary" | "success" | "warning" | "muted" }) {
  return (
    <div className={`rounded-lg border p-4 ${summaryClass(tone)}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value.toLocaleString("th-TH")}</p>
        </div>
        {icon}
      </div>
    </div>
  )
}

function StatusBadge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{children}</span>
}
```

with:

```tsx
}
```

(5) `notificationToneClass` and `summaryClass` `:164-178` (the closing brace of `toneClass` stays; `formatDate` below stays). Replace:

```tsx
}

function notificationToneClass(tone: string) {
  if (tone === "danger") return "rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger"
  if (tone === "warning") return "rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning"
  if (tone === "success") return "rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success"
  return "rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary"
}

function summaryClass(tone: "primary" | "success" | "warning" | "muted") {
  if (tone === "primary") return "border-primary-border bg-primary-soft text-primary"
  if (tone === "success") return "border-success-border bg-success-soft text-success"
  if (tone === "warning") return "border-warning-border bg-warning-soft text-warning"
  return "border-border bg-surface text-muted-foreground"
}
```

with:

```tsx
}
```

Check: `grep -nE 'SummaryCard|function StatusBadge|notificationToneClass|summaryClass|opacity-70|border-dashed|toLocaleString|<h1' "src/app/[locale]/(dashboard)/notifications/page.tsx"` prints nothing (exit 1); `git diff --stat src/components` prints nothing.

- [ ] **Step 6: Run the tests for this task**

Run: `node --test tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/notification-topbar-behavior.test.ts tests/notification-center.test.ts tests/thai-glossary.test.ts`
Expected: PASS, `tests 124 · pass 124 · fail 0` (list-pages-ui 43 · list-frame-guards 21 · visual-foundation-guards 26 · form-migration-guards 23 · notification-topbar-behavior 5 · notification-center 3 · thai-glossary 3).

Run: `node <temp>/p2b1-precheck.mjs --file D/notifications/page.tsx`
Expected (exit 0): `· in MIGRATED_LIST_FILES`, rows `LH1 0 0 0 1`, `LS1 0 0 0 1`, `LN2 0 0 0 1`, `args    (no row holds this file)`.

- [ ] **Step 7: Prove every class compiles**

Run: `node <temp>/p2b5-tw-probe.mjs "src/app/[locale]/(dashboard)/notifications/page.tsx"`
Expected: `checked 27 classes, missing 0` (exit 0; plan 2B-4's probe took the `"th-TH"` and `"en-US"` of `formatDate` for classes).

- [ ] **Step 8: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` `tests 1991 · pass 1990 · fail 0 · skipped 1`; tsc no errors; lint 0 errors and the 146 warnings under `.agents/` (`npx eslint "src/app/[locale]/(dashboard)/notifications/page.tsx" tests/list-pages-ui.test.ts` prints nothing).

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 5 files: `messages/th.json` and `messages/en.json` 5 insertions and 1 deletion each, the page 32 and 65, `tests/list-frame-guards.test.ts` 1 and 3, `tests/list-pages-ui.test.ts` 21 and 0. The page stays CRLF (`152 152`).

- [ ] **Step 9: Commit**

```bash
git add "src/app/[locale]/(dashboard)/notifications/page.tsx" messages/th.json messages/en.json tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): notification center on PageHeader, StatStrip and the shared StatusBadge, with each notification type in words (2B-5 task 7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 5 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 18, spec §8.9 row `/th/notifications`):** at 1440 and 375: each delivered digest's type in Thai (read-only `SELECT DISTINCT type FROM notifications` on `asset_management_dev` names the types to look for; a type outside the four shows as it is); a muted item's card and buttons at full strength with a grey title; the strip; the assignee select of `NotificationCenterActions` as 2C plan 4 left it (open it, choose nothing); one English pass (General · Needs attention · Urgent · Done).

---

### Task 8: `D/my-assets/page.tsx` · the shared PageHeader in place of the local one (I14), real pages with a full-total summary (B4), one StatStrip, and the table on DataTable with rows that open the asset

Spec §8.9 row 7, §5.6 row `my-assets`, §5.9.2 row 9, §5.9.3 "my-assets", §4.4.6 row `D/my-assets/page.tsx`, §10.2 I14, §8.3 test table row 2B-5∥2C-5 (`visual-consistency-ui.test.ts:23-34`), §9.4 note "LH2 และ LN2 `D/my-assets/page.tsx`", rulings B4, I21, R-d, R-h, R-n, R-p and controller rulings (a), (b) and (e). One file, one commit. The page and its tests are CRLF: exact-string replacements only.

Rulings this task applies:
- **I14, R-h:** the file-local `function PageHeader` (`:163-170`, called at `:50` and `:89`) and its call sites give way to the shared `PageHeader` in this one commit (the local name shadowed the shared one; LH2 and LN2 count it). The page header takes `meta={t("subtitle")}` and "เปิดศูนย์งานค้าง" as `buttonVariants({ variant: "outline", size: "md" })` (it was `getSafeActionLinkClasses("secondary")`); the account without an employee gets the same header without the button, as before. LH1 1 → 0, LH2 1 → 0, LN2 1 → 0.
- **B4, §5.9.2 row 9:** the list had no limit. The page reads `page` and `pageSize` with `parseListPage`; one `Promise.all` runs the page of rows (`orderBy` the old `[{ status: { sortOrder: "asc" } }, { updatedAt: "desc" }]` plus `{ id: "asc" }`, `skip`/`take`), `asset.count({ where })`, and a light read of every one of the person's assets (the status name and one photo id) that feeds `summarizeMyAssets`, so the four totals stay full totals (§5.9.3). The photo filter is one constant (`myAssetPhotoWhere`) for the list select and the light read. `buildMyAssetsWhere({ employeeId: user.employeeId })` stays literal (`tests/my-assets-route-ui.test.ts:8-9`). No index: `IX_assets_isActive_custodianId` covers the where.
- **I21:** past the last page the page redirects to the last page with the same page size.
- **Not in this task (departure from §5.9.2 row 9's `returnTo`):** the spec also lets `buildMyAssetDetailHref` carry `returnTo` and `D/my-assets/[id]/page.tsx` read it through a new `"my-assets"` section of `src/lib/operational-return-navigation.ts`. Neither file is one of the 25 files of spec §8.9; the detail page left 2B in plan 2B-4 (it is in `MIGRATED_LIST_FILES`, and `tests/list-pages-ui.test.ts:570` pins its back link to `/${locale}/my-assets`). So the detail page's "กลับไปทรัพย์สินของฉัน" still lands on page 1; the open issue proposes 2D (a person holds few assets, so a second page is rare).
- **§5.6, R-d:** the four tinted `Metric` boxes become one `StatStrip` of `formatCount` values inside the existing `<section aria-label={t("summary")}>` (the strip's `<dl>` takes no name of its own). `Metric` goes. LS1 1 → 0.
- **§5.6, §5.8, I3:** the list panel becomes `ContentPanel divided flush className="overflow-hidden"`; the phone cards stay (`getMobileCardListClasses()` with `p-3`, as the disposal queue of plan 2B-2); the table becomes `DataTable framed={false} className={getDesktopTableOnlyClasses()}` with `caption` and `scrollHint`; the local `Head` (`uppercase`) goes; each row is a `ClickableTableRow` to the asset (it had only a hover), with the link in its first cell kept (§5.6 "คงลิงก์ในเซลล์"); `Pagination` sits in `DataTableFoot` under both. VFG R7 1 → 0, LT1 1 → 0.
- **§5.6:** the two boxed empty states (`getEmptyStateClasses()`, `:52`, `:104`) become `ActionEmptyState` without a frame: `tone="permission"` for the account without an employee (it drew a warning `ShieldAlert`), the `PackageCheck` icon for an empty list. The phone card's open link becomes `cn(buttonVariants({ variant: "outline" }), "mt-4 w-full")`.
- **R-n, R-p:** an empty serial is `Nil` (it was `|| "-"` in the table and the card, `:136`, `:233`); the asset tag is `tag font-medium`; the serial, category, location, company and branch codes are `tag`. `MobileField` takes a `React.ReactNode` value. LV2 2 → 0.
- **§8.3 (visual-consistency-ui):** `import { StatusBadge } from "@/components/ui/status-badge"` and both `tone={getAssetStateTone(asset.status.name)}` / `condition.name` stay; `getAssetStateTone` stays imported. `getEmptyStateClasses`, `getResponsiveTableScrollClasses` (this page was its last caller) and `getSafeActionLinkClasses` leave the import; the helpers stay in `src/lib/design-system.ts` (2D; Task 16 deletes only `getTableShellClasses`).
- **VFG ruling (b):** this task deletes the last `${D}` row of `TABLE_HEADER_FILLS`, so the `const D` above it (`:253` at `6835bdf`, unmoved by Tasks 1–7) loses its last use and `npm run lint` would report a new warning in `tests/` (`'D' is assigned a value but never used`). The line goes in this commit by one exact replacement; it belongs to the R7 rows, the part of VFG this plan may edit.
- **Spec §10.3, I15:** 2B does not touch the page again, so it joins `MIGRATED_LIST_FILES` (every counter 0).

What users will see on `/th/my-assets` (an account linked to an employee):
- The title is 600 with a 36px outline "เปิดศูนย์งานค้าง"; the four tinted boxes are one flat strip that still counts every asset the person holds.
- The list sits in a panel with a 56px head; on a computer the table has the white 13px header without capitals, a row click opens the asset, and codes are in monospace; on a phone the cards stay, with a 44px "ดูรายละเอียด".
- 25 assets per page by default with 25/50/100, the range and "หน้า x จาก y" under both the cards and the table (before, every asset showed on one page). An empty serial reads "—".
- An account without an employee sees the orange permission state with no box around it.

Not in this task: `D/my-assets/[id]/page.tsx` and `src/lib/operational-return-navigation.ts` (`returnTo`, open issue) · `src/lib/my-assets.ts` · `src/lib/design-system.ts` (Task 16) · docs (Task 19). Do not run a formatter.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/my-assets/page.tsx` (`i/lf w/crlf`; 7 exact replacements)
- Modify: `tests/list-pages-ui.test.ts` (`i/lf w/crlf`; one block appended)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only) · `tests/visual-foundation-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs`, then 1 exact replacement)
- Temp folder only, never committed: `t08-pages-block.ts`

**Must keep passing without edits:**
- `tests/my-assets-route-ui.test.ts:5-33` (`buildMyAssetsWhere\(\{ employeeId: user\.employeeId \}\)`, `custodianId`, no `requirePagePermission(locale, "asset", "view")`, no `purchasePrice|supplier|fixedAssetCode`; `buildMyAssetDetailHref`, `openDetail`, `href={href}`) · `tests/visual-consistency-ui.test.ts:23-34` (nobody edits it while 2C plan 5 runs) · `tests/my-assets.test.ts`
- `tests/mobile-field-navigation.test.ts` (`/th/my-assets` keeps the bottom navigation) · `tests/permission-aware-navigation.test.ts:78`, `:99` · `tests/form-migration-guards.test.ts`

**Interfaces:**
- Consumes: what Tasks 1–7 consume (`PageHeader`, `StatStrip`, `ContentPanel`, `DataTable` and its parts with `DataTableFoot`, `Pagination`, the B4 helpers, `Nil`, `formatCount`, `buttonVariants`, `ActionEmptyState` with `tone`); `getAssetStateTone`, `getDesktopTableOnlyClasses`, `getMobileCardListClasses` from `@/lib/design-system`; `cn` from `@/lib/utils`; Task 1's scripts.
- Produces: the page without the local `PageHeader`, `Metric` and `Head`; in `MIGRATED_LIST_FILES`; VFG `TABLE_HEADER_FILLS` with no `${D}` row and no `const D`; the test `my assets: the shared PageHeader, real pages with a full-total summary, one StatStrip and a DataTable of rows that open the asset (spec 2B §5.6, §5.9.2 row 9)`.

| guard | `D/my-assets/page.tsx` before → after | plan total (budget) before → after |
|---|---|---|
| VFG R7 | 1 → – | 3 in 3 rows → 2 in 2 (`responsive-report-list.tsx` 1, Task 11; `asset-import-preview-panel.tsx` 1, 2D) |
| LFG LH1 · LH2 · LT1 | 1 · 1 · 1 → – | 10 → 9 · 5 → 4 · 11 → 10 |
| LFG LV2 · LS1 · LN2 | 2 · 1 · 1 → – | 70 → 68 · 8 → 7 · 4 → 3 |
| `MIGRATED_LIST_FILES` | – → joins | 86 → 87 |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b5-t1-precheck.mjs 8`
Expected: `git status` prints nothing. The script prints (exit 0) the ten `ok` lines for the primitives and the keys, then `ok      Task 1 is in` … `ok      Task 7 is in`, `ok      Task 8 has not run yet`, `ok      src/app/[locale]/(dashboard)/my-assets/page.tsx is unchanged since 6835bdf (hash f2103b3207891e9c)`, `info    src/app/[locale]/(dashboard)/my-assets/page.tsx: CRLF` and `preconditions hold for Task 8`.

Run: `node <temp>/p2b1-precheck.mjs --file D/my-assets/page.tsx`
Expected (exit 0):
```
file    src/app/[locale]/(dashboard)/my-assets/page.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
R7         1       1     0     1
LH1        1       1     0     1
LH2        1       1     0     1
LT1        1       1     0     1
LV2        2       2     0     2
LS1        1       1     0     1
LN2        1       1     0     1
args    R7=1:1 LH1=1:1 LH2=1:1 LT1=1:1 LV2=2:2 LS1=1:1 LN2=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol "src/app/[[]locale]/(dashboard)/my-assets/page.tsx" tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: `i/lf w/crlf` for all four.

- [ ] **Step 2: Write the failing test (`tests/list-pages-ui.test.ts`)**

Save this block as `<temp>/t08-pages-block.ts`:

```ts
// Plan 2B-5 Task 8 (spec 2B §5.6 row my-assets, §5.9.2 row 9, I14, B4, R-d, R-p): My Assets on the shared PageHeader
// (the local PageHeader goes in the same commit), real pages with the summary still counting every asset, the four
// tinted Metric boxes as one StatStrip, and the table on DataTable whose rows open the asset.
test("my assets: the shared PageHeader, real pages with a full-total summary, one StatStrip and a DataTable of rows that open the asset (spec 2B §5.6, §5.9.2 row 9)", () => {
  const source = read(`${D}my-assets/page.tsx`)
  for (const part of ["<StatStrip", "<ContentPanel divided flush", "<DataTable framed={false}", "<DataTableHeader>", "<DataTableBody>", "<ClickableTableRow", "<DataTableFoot>", "<Pagination", '<ActionEmptyState tone="permission"']) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /^import \{ PageHeader \} from "@\/components\/ui\/page-header"$/m)
  assert.equal(source.match(/<PageHeader\b/g)?.length, 2, "the page and the account without an employee")
  assert.match(source, /const listPage = parseListPage\(\{ page, pageSize \}\)/)
  assert.match(source, /const \[assets, total, summaryAssets\] = await Promise\.all\(\[\n\s+prisma\.asset\.findMany\(\{\n\s+where,\n\s+select: myAssetSelect,\n\s+orderBy: \[\{ status: \{ sortOrder: "asc" \} \}, \{ updatedAt: "desc" \}, \{ id: "asc" \}\],\n\s+skip,\n\s+take,\n\s+\}\),\n\s+prisma\.asset\.count\(\{ where \}\),\n/, "the page, the count and the summary read in one Promise.all; the old order plus id")
  assert.match(source, /const summary = summarizeMyAssets\(\n\s+summaryAssets\.map\(/, "the summary counts every asset, not the page")
  assert.equal(source.match(/\btake: \d+/g)?.length, 2, "no fixed number of rows: only one photo per asset, in the list and in the summary")
  assert.match(source, /^import \{ redirect \} from "next\/navigation"$/m)
  assert.match(source, /const lastPage = lastListPage\(total, listPage\.pageSize\)\n\s+if \(assets\.length === 0 && total > 0 && listPage\.page > lastPage\) \{\n\s+redirect\(/)
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: listHref\(\{ pageSize: value \}\) \}\)\)\}/)
  assert.match(source, /<ClickableTableRow key=\{asset\.id\} href=\{href\} label=\{`\$\{labels\.openDetail\}: \$\{asset\.assetTag\}`\}>/)
  assert.match(source, /<Link href=\{`\/\$\{locale\}\/work-center\?view=mine`\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.match(source, /<span className="tag font-medium">\{asset\.assetTag\}<\/span>/)
  assert.doesNotMatch(source, /function (?:PageHeader|Metric|Head)\b|<thead\b|<th\b|getEmptyStateClasses|getResponsiveTableScrollClasses|getSafeActionLinkClasses|toLocaleString\(|"-"|<h1\b/)
})
```

Run: `node <temp>/p2b5-append.mjs <temp>/t08-pages-block.ts tests/list-pages-ui.test.ts`, then `node --test tests/list-pages-ui.test.ts`
Expected: `appended … (CRLF)`; FAIL, `tests 44 · pass 43 · fail 1`: `my assets: the shared PageHeader, real pages with a full-total summary, one StatStrip and a DataTable of rows that open the asset (spec 2B §5.6, §5.9.2 row 9)`: `no <StatStrip`

- [ ] **Step 3: Lower the guard rows of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs D/my-assets/page.tsx R7=1:0 LH1=1:0 LH2=1:0 LT1=1:0 LV2=2:0 LS1=1:0 LN2=1:0 --migrated`
Expected (exit 0):
```
R7: 1 -> 0 (row deleted)
LH1: 1 -> 0 (row deleted)
LH2: 1 -> 0 (row deleted)
LT1: 1 -> 0 (row deleted)
LV2: 2 -> 0 (row deleted)
LS1: 1 -> 0 (row deleted)
LN2: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/my-assets/page.tsx
```

Then `tests/visual-foundation-guards.test.ts` (CRLF; the R7 rows, ruling (b)): the `const D` above `TABLE_HEADER_FILLS` has no use left. Replace:

```ts
const D = "src/app/[locale]/(dashboard)/"
const TABLE_HEADER_FILLS: Record<string, number> = {
```

with:

```ts
const TABLE_HEADER_FILLS: Record<string, number> = {
```

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 39 · fail 8`, each naming only `src/app/[locale]/(dashboard)/my-assets/page.tsx`: `LH1 …` (`LH1: 8 in 8 files`, `1 > 0`) · `LH2 MasterDataHeader, ReportHeader and local PageHeader functions give way to PageHeader` (`5 in 4`, `1 > 0`) · `LT1 …` (`9 in 4`, `1 > 0`) · `LV2 …` (`70 in 20`, `2 > 0`) · `LS1 …` (`8 in 6`, `1 > 0`) · `LN2 …` (`4 in 4`, `1 > 0`) · `L0 …` (the six lines `LH1 …: 1 > 0` … `LN2 …: 1 > 0`) · VFG `R7 interim: …` (`3 matches in 3 files; over budget:` and `…/my-assets/page.tsx: 1 > 0`).

- [ ] **Step 4: Move the page onto the primitives and the paged query (`src/app/[locale]/(dashboard)/my-assets/page.tsx`, CRLF)**

Seven exact replacements, top to bottom. Make all seven before you compile.

(1) Imports and the props type `:1-17` (the `StatusBadge` import line stays byte for byte, `tests/visual-consistency-ui.test.ts:29`). Replace:

```tsx
import Image from "next/image"
import Link from "next/link"
import type React from "react"
import type { Prisma } from "@prisma/client"
import { PackageCheck, ShieldAlert } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { ContentPanel } from "@/components/ui/content-panel"
import { StatusBadge } from "@/components/ui/status-badge"
import { getAssetStateTone, getDesktopTableOnlyClasses, getEmptyStateClasses, getMobileCardListClasses, getResponsiveTableScrollClasses, getSafeActionLinkClasses } from "@/lib/design-system"
import { getSessionUser } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { buildMyAssetsWhere, summarizeMyAssets } from "@/lib/my-assets"
import { formatDateTime } from "@/lib/utils"

type MyAssetsPageProps = {
  params: Promise<{ locale: string }>
}
```

with:

```tsx
import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import type React from "react"
import type { Prisma } from "@prisma/client"
import { PackageCheck } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader } from "@/components/ui/data-table"
import { Nil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { getAssetStateTone, getDesktopTableOnlyClasses, getMobileCardListClasses } from "@/lib/design-system"
import { getSessionUser } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, appendListPage, lastListPage, listPageWindow, parseListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { buildMyAssetsWhere, summarizeMyAssets } from "@/lib/my-assets"
import { cn, formatDateTime } from "@/lib/utils"

type MyAssetsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string | string[]; pageSize?: string | string[] }>
}
```

(2) The select `:19-38`: the photo filter becomes one constant the light summary read shares. Replace:

```tsx
const myAssetSelect = {
  id: true,
  assetTag: true,
  name: true,
  serialNumber: true,
  updatedAt: true,
  custodianId: true,
  category: { select: { code: true, name: true } },
  company: { select: { code: true } },
  branch: { select: { code: true } },
  currentLocation: { select: { code: true, name: true } },
  status: { select: { name: true, nameTh: true, colorCode: true } },
  condition: { select: { name: true, nameTh: true, colorCode: true } },
  attachments: {
    where: { module: "asset", fileType: { startsWith: "image/" }, isActive: true },
    select: { id: true, originalName: true },
    orderBy: { uploadedAt: "desc" },
    take: 1,
  },
} satisfies Prisma.AssetSelect
```

with:

```tsx
// An asset's photo: its newest active image. The list and the summary read it the same way.
const myAssetPhotoWhere = { module: "asset", fileType: { startsWith: "image/" }, isActive: true } satisfies Prisma.AttachmentWhereInput

const myAssetSelect = {
  id: true,
  assetTag: true,
  name: true,
  serialNumber: true,
  updatedAt: true,
  custodianId: true,
  category: { select: { code: true, name: true } },
  company: { select: { code: true } },
  branch: { select: { code: true } },
  currentLocation: { select: { code: true, name: true } },
  status: { select: { name: true, nameTh: true, colorCode: true } },
  condition: { select: { name: true, nameTh: true, colorCode: true } },
  attachments: {
    where: myAssetPhotoWhere,
    select: { id: true, originalName: true },
    orderBy: { uploadedAt: "desc" },
    take: 1,
  },
} satisfies Prisma.AssetSelect
```

(3) The page function, the local `PageHeader`, `Metric` and `Head` `:42-190` (`type MyAssetRow` above and `AssetIdentity` below stay). Replace:

```tsx
export default async function MyAssetsPage({ params }: MyAssetsPageProps) {
  const { locale } = await params
  const user = await getSessionUser()
  const t = await getTranslations("myAssets")

  if (!user?.employeeId) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <ContentPanel>
          <div className={getEmptyStateClasses()}>
            <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-warning" />
            <div className="font-medium text-foreground">{t("noLinkedEmployeeTitle")}</div>
            <p className="mt-1">{t("noLinkedEmployeeHelp")}</p>
          </div>
        </ContentPanel>
      </div>
    )
  }

  const assets = await prisma.asset.findMany({
    // buildMyAssetsWhere scopes to custodianId server-side.
    where: buildMyAssetsWhere({ employeeId: user.employeeId }),
    select: myAssetSelect,
    orderBy: [{ status: { sortOrder: "asc" } }, { updatedAt: "desc" }],
  })
  const labels = {
    asset: t("asset"),
    serialNumber: t("serialNumber"),
    status: t("status"),
    condition: t("condition"),
    location: t("location"),
    companyBranch: t("companyBranch"),
    category: t("category"),
    updatedAt: t("updatedAt"),
    openDetail: t("openDetail"),
  }
  const summary = summarizeMyAssets(
    assets.map((asset) => ({
      statusName: asset.status.name,
      hasPhoto: asset.attachments.length > 0,
    })),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <Link href={`/${locale}/work-center?view=mine`} className={getSafeActionLinkClasses("secondary")}>
          {t("openWorkCenter")}
        </Link>
      </div>

      <section aria-label={t("summary")} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label={t("total")} value={summary.total} tone="neutral" />
        <Metric label={t("ready")} value={summary.ready} tone="success" />
        <Metric label={t("needsAttention")} value={summary.needsAttention} tone="warning" />
        <Metric label={t("missingPhoto")} value={summary.missingPhoto} tone="muted" />
      </section>

      <ContentPanel title={t("list")}>
        {assets.length === 0 ? (
          <div className={getEmptyStateClasses()}>
            <PackageCheck className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <div className="font-medium text-foreground">{t("emptyTitle")}</div>
            <p className="mt-1">{t("emptyHelp")}</p>
          </div>
        ) : (
          <>
            <div className={getMobileCardListClasses()}>
              {assets.map((asset) => (
                <MobileAssetCard key={asset.id} labels={labels} asset={asset} href={buildMyAssetDetailHref(locale, asset.id)} />
              ))}
            </div>
            <div className={getDesktopTableOnlyClasses()}>
              <div className={getResponsiveTableScrollClasses()}>
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <Head>{labels.asset}</Head>
                      <Head>{labels.serialNumber}</Head>
                      <Head>{labels.status}</Head>
                      <Head>{labels.condition}</Head>
                      <Head>{labels.location}</Head>
                      <Head>{labels.companyBranch}</Head>
                      <Head>{labels.updatedAt}</Head>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {assets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-row-hover">
                        <td className="px-4 py-3">
                          <AssetIdentity asset={asset} href={buildMyAssetDetailHref(locale, asset.id)} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{asset.serialNumber || "-"}</td>
                        <td className="px-4 py-3">
                          <StatusBadge label={asset.status.nameTh} tone={getAssetStateTone(asset.status.name)} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge label={asset.condition.nameTh} tone={getAssetStateTone(asset.condition.name)} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {asset.currentLocation.code} - {asset.currentLocation.name}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {asset.company.code} / {asset.branch.code}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(asset.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </ContentPanel>
    </div>
  )
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header>
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </header>
  )
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "neutral" | "success" | "warning" | "muted" }) {
  const toneClass = {
    neutral: "border-border bg-surface",
    success: "border-success-border bg-success-soft",
    warning: "border-warning-border bg-warning-soft",
    muted: "border-border bg-background",
  }[tone]

  return (
    <div className={`rounded-lg border px-4 py-3 ${toneClass}`}>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-foreground">{value.toLocaleString("th-TH")}</div>
    </div>
  )
}

function Head({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{children}</th>
}
```

with:

```tsx
export default async function MyAssetsPage({ params, searchParams }: MyAssetsPageProps) {
  const { locale } = await params
  const { page, pageSize } = await searchParams
  const user = await getSessionUser()
  const t = await getTranslations("myAssets")
  const tCommon = await getTranslations("common")

  if (!user?.employeeId) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} meta={t("subtitle")} />
        <ContentPanel>
          <ActionEmptyState tone="permission" title={t("noLinkedEmployeeTitle")} description={t("noLinkedEmployeeHelp")} />
        </ContentPanel>
      </div>
    )
  }

  const listPage = parseListPage({ page, pageSize })
  const basePath = `/${locale}/my-assets`
  // The list URL with its page and page size; the defaults stay out of it, so page 1 keeps today's URL (spec 2B B4).
  const listHref = (next: { page?: number; pageSize?: number }) => {
    const query = appendListPage(new URLSearchParams(), next).toString()
    return query ? `${basePath}?${query}` : basePath
  }
  // buildMyAssetsWhere scopes to custodianId server-side.
  const where = buildMyAssetsWhere({ employeeId: user.employeeId })
  const { skip, take } = listPageWindow(listPage)
  // One round trip: the page of assets, the count of all of them, and a light read of every one (its status name and
  // one photo id) for the summary, which stays a full total (spec 2B §5.9.2 row 9).
  const [assets, total, summaryAssets] = await Promise.all([
    prisma.asset.findMany({
      where,
      select: myAssetSelect,
      orderBy: [{ status: { sortOrder: "asc" } }, { updatedAt: "desc" }, { id: "asc" }],
      skip,
      take,
    }),
    prisma.asset.count({ where }),
    prisma.asset.findMany({
      where,
      select: { status: { select: { name: true } }, attachments: { where: myAssetPhotoWhere, select: { id: true }, take: 1 } },
    }),
  ])
  // A page past the last one (an old link, or an asset handed back since) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listPage.pageSize)
  if (assets.length === 0 && total > 0 && listPage.page > lastPage) {
    redirect(listHref({ page: lastPage, pageSize: listPage.pageSize }))
  }
  const { start, end, totalPages } = paginationRange(listPage.page, listPage.pageSize, total)
  const labels = {
    asset: t("asset"),
    serialNumber: t("serialNumber"),
    status: t("status"),
    condition: t("condition"),
    location: t("location"),
    companyBranch: t("companyBranch"),
    category: t("category"),
    updatedAt: t("updatedAt"),
    openDetail: t("openDetail"),
  }
  const summary = summarizeMyAssets(
    summaryAssets.map((asset) => ({
      statusName: asset.status.name,
      hasPhoto: asset.attachments.length > 0,
    })),
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <Link href={`/${locale}/work-center?view=mine`} className={buttonVariants({ variant: "outline", size: "md" })}>
            {t("openWorkCenter")}
          </Link>
        }
      />

      <section aria-label={t("summary")}>
        <StatStrip
          items={[
            { key: "total", label: t("total"), value: formatCount(summary.total) },
            { key: "ready", label: t("ready"), value: formatCount(summary.ready) },
            { key: "needsAttention", label: t("needsAttention"), value: formatCount(summary.needsAttention) },
            { key: "missingPhoto", label: t("missingPhoto"), value: formatCount(summary.missingPhoto) },
          ]}
        />
      </section>

      <ContentPanel divided flush className="overflow-hidden" title={t("list")}>
        {total === 0 ? (
          <ActionEmptyState icon={<PackageCheck />} title={t("emptyTitle")} description={t("emptyHelp")} />
        ) : (
          <>
            <div className={`${getMobileCardListClasses()} p-3`}>
              {assets.map((asset) => (
                <MobileAssetCard key={asset.id} labels={labels} asset={asset} href={buildMyAssetDetailHref(locale, asset.id)} />
              ))}
            </div>
            <DataTable framed={false} className={getDesktopTableOnlyClasses()} caption={t("list")} scrollHint={tCommon("tableScrollHint")}>
              <DataTableHeader>
                <tr>
                  <DataTableHead>{labels.asset}</DataTableHead>
                  <DataTableHead>{labels.serialNumber}</DataTableHead>
                  <DataTableHead>{labels.status}</DataTableHead>
                  <DataTableHead>{labels.condition}</DataTableHead>
                  <DataTableHead>{labels.location}</DataTableHead>
                  <DataTableHead>{labels.companyBranch}</DataTableHead>
                  <DataTableHead>{labels.updatedAt}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {assets.map((asset) => {
                  const href = buildMyAssetDetailHref(locale, asset.id)
                  return (
                    <ClickableTableRow key={asset.id} href={href} label={`${labels.openDetail}: ${asset.assetTag}`}>
                      <DataTableCell>
                        <AssetIdentity asset={asset} href={href} />
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-muted-foreground">{asset.serialNumber ? <span className="tag">{asset.serialNumber}</span> : <Nil />}</DataTableCell>
                      <DataTableCell>
                        <StatusBadge label={asset.status.nameTh} tone={getAssetStateTone(asset.status.name)} />
                      </DataTableCell>
                      <DataTableCell>
                        <StatusBadge label={asset.condition.nameTh} tone={getAssetStateTone(asset.condition.name)} />
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-muted-foreground">
                        <span className="tag">{asset.currentLocation.code}</span> - {asset.currentLocation.name}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-muted-foreground">
                        <span className="tag">{asset.company.code}</span> / <span className="tag">{asset.branch.code}</span>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(asset.updatedAt)}</DataTableCell>
                    </ClickableTableRow>
                  )
                })}
              </DataTableBody>
            </DataTable>
            <DataTableFoot>
              <Pagination
                page={listPage.page}
                totalPages={totalPages}
                previousHref={listHref({ page: listPage.page - 1, pageSize: listPage.pageSize })}
                nextHref={listHref({ page: listPage.page + 1, pageSize: listPage.pageSize })}
                pageSize={listPage.pageSize}
                pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: listHref({ pageSize: value }) }))}
                labels={{
                  navigation: tCommon("pagination"),
                  previous: tCommon("previous"),
                  next: tCommon("next"),
                  pageOf: tCommon("pageOf", { page: listPage.page, total: totalPages }),
                  range: tCommon("showingRange", { from: formatCount(start), to: formatCount(end), total: formatCount(total) }),
                  pageSizeGroup: tCommon("pageSizeLabel"),
                  rowsPerPage: tCommon("rowsPerPage"),
                }}
              />
            </DataTableFoot>
          </>
        )}
      </ContentPanel>
    </div>
  )
}
```

(4) The identity text in `AssetIdentity` `:211-215`. Replace:

```tsx
        <div className="font-semibold text-foreground">{asset.assetTag}</div>
        <div className="truncate text-sm text-foreground">{asset.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {asset.category.code} - {asset.category.name}
        </div>
```

with:

```tsx
        <div className="text-foreground"><span className="tag font-medium">{asset.assetTag}</span></div>
        <div className="truncate text-sm text-foreground">{asset.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          <span className="tag">{asset.category.code}</span> - {asset.category.name}
        </div>
```

(5) The four text fields of `MobileAssetCard` `:233-236`. Replace:

```tsx
        <MobileField label={labels.serialNumber} value={asset.serialNumber || "-"} />
        <MobileField label={labels.category} value={`${asset.category.code} - ${asset.category.name}`} />
        <MobileField label={labels.location} value={`${asset.currentLocation.code} - ${asset.currentLocation.name}`} />
        <MobileField label={labels.companyBranch} value={`${asset.company.code} / ${asset.branch.code}`} />
```

with:

```tsx
        <MobileField label={labels.serialNumber} value={asset.serialNumber ? <span className="tag">{asset.serialNumber}</span> : <Nil />} />
        <MobileField label={labels.category} value={<><span className="tag">{asset.category.code}</span> - {asset.category.name}</>} />
        <MobileField label={labels.location} value={<><span className="tag">{asset.currentLocation.code}</span> - {asset.currentLocation.name}</>} />
        <MobileField label={labels.companyBranch} value={<><span className="tag">{asset.company.code}</span> / <span className="tag">{asset.branch.code}</span></>} />
```

(6) The card's open link `:247-249`. Replace:

```tsx
      <Link href={href} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent">
        {labels.openDetail}
      </Link>
```

with:

```tsx
      <Link href={href} className={cn(buttonVariants({ variant: "outline" }), "mt-4 w-full")}>
        {labels.openDetail}
      </Link>
```

(7) `MobileField` takes a node `:258`. Replace:

```tsx
function MobileField({ label, value }: { label: string; value: string }) {
```

with:

```tsx
function MobileField({ label, value }: { label: string; value: React.ReactNode }) {
```

Check: `grep -nE 'function (PageHeader|Metric|Head)\b|<thead|<th |getEmptyStateClasses|getResponsiveTableScrollClasses|getSafeActionLinkClasses|toLocaleString|"-"|<h1' "src/app/[locale]/(dashboard)/my-assets/page.tsx"` prints nothing (exit 1).

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/my-assets-route-ui.test.ts tests/my-assets.test.ts tests/visual-consistency-ui.test.ts tests/mobile-field-navigation.test.ts tests/permission-aware-navigation.test.ts`
Expected: PASS, `tests 137 · pass 137 · fail 0` (list-pages-ui 44 · list-frame-guards 21 · visual-foundation-guards 26 · form-migration-guards 23 · my-assets-route-ui 4 · my-assets 3 · visual-consistency-ui 3 · mobile-field-navigation 7 · permission-aware-navigation 6).

Run: `node <temp>/p2b1-precheck.mjs --file D/my-assets/page.tsx`
Expected (exit 0): `· in MIGRATED_LIST_FILES`, every row `0 0 0 <seed>` (R7 1, LH1 1, LH2 1, LT1 1, LV2 2, LS1 1, LN2 1) and `args    (no row holds this file)`.

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b5-tw-probe.mjs "src/app/[locale]/(dashboard)/my-assets/page.tsx"`
Expected: `checked 41 classes, missing 0` (exit 0).

- [ ] **Step 7: Full verification, and the guard state after Tasks 1–8**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` `tests 1992 · pass 1991 · fail 0 · skipped 1` (twelve tests more than the 1980 of `6835bdf`: Tasks 1–4 one each, Task 5 three, Task 6 three, Tasks 7–8 one each); tsc no errors (the three-item tuple of `Promise.all` and the `satisfies Prisma.AttachmentWhereInput` constant compile); `npm run lint` 0 errors and the 146 warnings under `.agents/` (without the VFG replacement of Step 3 it would be 147, the new one in `tests/visual-foundation-guards.test.ts`).

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 4 files: the page 146 insertions and 114 deletions, `tests/list-frame-guards.test.ts` 1 and 7, `tests/list-pages-ui.test.ts` 23 and 0, `tests/visual-foundation-guards.test.ts` 0 and 2 (the R7 row and `const D`). The page stays CRLF (`297 297`).

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected (exit 0): `budgets hold: no live count is over its row`, with `R7  TABLE_HEADER_FILLS   2 in  2 rows · live   2 in  2 files` · `LH1 BUDGETS.LH1  9 in  9 rows · live  7 in  7 files · slack 2` (the `KEEP` rows of `asset-label-batch-tool.tsx` and `asset-scan-search-tool.tsx`, live 0 since 2C plan 4; Task 17 lowers them) · `LH2  4 in 3` · `LT1 10 in 4 rows · live 8 in 3 files · slack 1` (`role-permission-form.tsx` 2, live 0; Task 17) · `LT3 0 in 0` · `LV1 8 in 3 rows · live 5 in 2 files · slack 1` (`IntegrationClientManager.tsx` 3, live 0; Task 17) · `LV2 68 in 19` · `LS1 7 in 5` · `LN2 3 in 3`; the other guards as at `6835bdf`. `MIGRATED_LIST_FILES` holds 87 files: the 77 of `6835bdf`, then `D/admin/roles/page.tsx`, `D/admin/logs/page.tsx`, `D/admin/storage/page.tsx`, `D/admin/approvals/page.tsx`, `D/admin/approvals/history/page.tsx`, `D/admin/readiness/page.tsx`, `D/admin/settings/page.tsx`, `D/access-denied/page.tsx`, `D/notifications/page.tsx`, `D/my-assets/page.tsx` in commit order.

- [ ] **Step 8: Commit**

```bash
git add "src/app/[locale]/(dashboard)/my-assets/page.tsx" tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): my assets on the shared PageHeader, paged on the server with a full-total StatStrip and a DataTable (2B-5 task 8, B4, I14)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 18, spec §8.9 row `/th/my-assets`):** the seed admin has no employee (DH 2B-4 "Still open"), so at 1440 and 375 it shows the permission state with no box; with an account linked to an employee who holds assets (or, if none exists on the dev database, list it for the person's check before the deploy): the strip totals equal the person's asset count, a row click and the cell link open `/th/my-assets/<id>`, `?pageSize=25&page=2` (more than 25 assets) and `?page=99` land on the last page, the phone cards and the pager at 375 with no sideways page scroll; "กลับไปทรัพย์สินของฉัน" on the detail page returns to page 1 (the open issue).

---

### Task 9: `c/reports/report-filter-panel.tsx` · the report filters on `Field` + `SearchField`, six `FilterSelect` and `FilterFormActions`, and "clear filters" only while a filter is on (plus the precheck script of Tasks 9–13)

Spec §8.9 row 8 (`report-filter-panel.tsx`: `ReportSelect` → `FilterSelect` · `ActionButton` → `Button`), §6.5 table row 12 and "ส่วนต่างของแต่ละหน้า" row 12, §6.2 6-ก, 6-จ and 6-ง, §6.4, §6.13 table B items 5 and 6, §10.2 I6 and I34, §10.4 table C column 2B-5 (LF1 → 0), §8.11 row 18 and controller rulings (a), (c), (d) and (e). One commit with two code files: the panel, and the one attribute of the page that feeds its new required prop (§6.5 row 12 names that page line; see "Departure"). Every file is CRLF: exact-string replacements only. This task also saves the precheck script Tasks 10–13 reuse.

Rulings this task applies:
- **§6.5 row 12, I6:** the search box is `<Field label={labels.search}>` + `SearchField` (the magnifier icon, 40px from md, 44px with 16px text below); the six `ReportSelect`s are `FilterSelect label=… name=… defaultValue=… allLabel={labels.all} options=…` in the same order (the `""` option first, as `ReportSelect` had); `function ReportSelect` goes. LF1 1 → 0, the last row of LF1.
- **§6.2 6-จ, §6.4, §6.13 item 6:** the two buttons are `FilterFormActions` (`size="lg"` submit, outline `lg` clear link, one row at `md:col-span-2 xl:col-span-3` as before). "ล้างตัวกรอง" shows only while a filter is on: `clear={hasActiveFilters ? { href: …, label: labels.clear } : undefined}`, its href unchanged (`buildReportHref(locale, activeView, parseAssetListParams({}))`).
- **§6.5 row 12:** `hasActiveFilters` is a new required prop of `ReportFilterPanelProps`; the page passes its own `hasActiveFilters` (`activeFilters.length > 0`, page `:190`), so a URL-only scope (brand, model, custodian, supplier, data quality, cross scope, activity) also shows the clear link, which removes it with the rest.
- **§6.2 6-ข, 6-ง, 6-ช:** `FilterPanel` stays the frame with its `title`, `description` and `className="p-5"`; the form stays a GET form with its grid (`grid-cols-1` / `md:grid-cols-2` / `xl:grid-cols-3`) and the hidden `view` and seven URL-only inputs (`tests/reports-adaptive-ui.test.ts:22-33`), and gets `role="search"` (§6.13 item 5).
- **§8.11 row 18:** `ActionButton` and `getActionButtonClasses` lose this caller but stay (2D deletes them): `ActionButton`'s last caller is `D/error.tsx:30`; `getActionButtonClasses` has none (Task 16 updates its comment `src/lib/design-system.ts:93`). `getFieldControlClasses` keeps its two audit-scan callers (O20).
- **§6.13 item 5, I34:** the panel joins `MIGRATED_FILTER_FILES` of `tests/list-filters-ui.test.ts`, as every page commit of 2B-1 and 2B-2 added its file; Task 17 only checks that the list is complete. It also joins `MIGRATED_LIST_FILES` (2B is done with it; every counter 0).
- **Departure (one file = one commit):** the page's one new line (`hasActiveFilters={hasActiveFilters}`) rides in this commit, because the prop is required and a commit without it does not compile; plan 2B-1 Task 20 paired a list page with its component the same way. Task 13 moves the rest of the page.

What users will see on `/th/reports` (every view): the filter labels are 13px dark text above their fields (they were 12px grey); the search box has a magnifier; the six lists have the chevron of every select; fields are 40px from md and 44px on phones with 16px text; "ใช้ตัวกรอง" is the 40px primary button, and "ล้างตัวกรอง" appears beside it only while a filter (or a scope from a drill-down link) is on.

Not in this task: the chips under the panel and the page header (Task 13) · `report-preset-controls.tsx` (2C plan 4's, done) · `ActionButton` itself (2D) · docs (Task 19). Do not run a formatter.

**Files:**
- Modify: `src/components/reports/report-filter-panel.tsx` (`i/lf w/crlf`; 3 exact replacements)
- Modify: `src/app/[locale]/(dashboard)/reports/page.tsx` (`i/lf w/crlf`; 1 exact replacement, one attribute)
- Modify: `tests/list-filters-ui.test.ts` (`i/lf w/crlf`; 1 exact replacement, 1 appended block)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only, never committed: `p2b5-t9-precheck.mjs` (Tasks 10–13 reuse it), `t09-filters-block.ts`

**Must keep passing without edits:**
- `tests/reports-adaptive-ui.test.ts:13-33` (the order of the `data-report-*` wrappers, `name="view" value={activeView}`, the three grid classes, the seven hidden `name="…" value={filters.…}` inputs; I18) · `tests/reports-localization.test.ts` (every `t("…")` of the page in th and en) · `tests/report-active-filters.test.ts`
- `tests/list-primitives-ui.test.ts` (the `FilterSelect`, `FilterChipList` and `FilterFormActions` strings) · `tests/field-primitives.test.ts` · `tests/design-system.test.ts:39-40`, `:186-191` (`getActionButtonClasses` stays for 2D) · `tests/form-migration-guards.test.ts` (never edited by 2B) · `tests/visual-foundation-guards.test.ts`

**Interfaces:**
- Consumes:
  - 2B-1: `FilterSelect({ label: string, options?: readonly { value, label }[], allLabel?: string, fieldSize? = "lg", hideLabel?, labelAction?, className?, …<select> props })` from `@/components/ui/filter-select`; `FilterPanel({ title?, description?, children, className? })` and `FilterFormActions({ submitLabel: string, clear?: { href: string; label: string }, className? })` from `@/components/ui/filter-panel` (both server-safe).
  - 2A: `Field({ label, hideLabel?, required?, hint?, error?, id?, className?, labelAction?, children })` from `@/components/ui/field`; `SearchField({ fieldSize?, loading?, trailing?, className?, …<input> props })` from `@/components/ui/search-field` (no `onClear` on a server page).
  - Task 0: `<temp>/p2b1-precheck.mjs` (`--file`, `--budgets`) and `<temp>/p2b-budget.mjs`. Task 1: `<temp>/p2b5-append.mjs <block file> <test file>` (keeps the test file's CRLF or LF; prints `appended <block> to <test> (CRLF)`) and `<temp>/p2b5-tw-probe.mjs <file> …` (prints `checked N classes, missing M`; `SHOW=a,b` prints compiled rules). The probe counts in Tasks 9–13 are those of Task 1's script (plan 2B-4's `p2b4-tw-probe.mjs` plus its `notClass` filter).
- Produces:
  - `ReportFilterPanelProps.hasActiveFilters: boolean` (required); the page passes it. `ReportFilterOption`, `ReportFilterOptions`, `ReportFilterLabels` and the component name are unchanged.
  - The panel in `MIGRATED_LIST_FILES` and in `MIGRATED_FILTER_FILES`; LFG `BUDGETS.LF1` empty (`{}`); the test `the report filters are Field + SearchField, six FilterSelect and FilterFormActions (2B §6.5 row 12)` in `tests/list-filters-ui.test.ts`.
  - `<temp>/p2b5-t9-precheck.mjs <9|10|11|12|13>` (Tasks 10–13 run it in their Step 1).
  - For Task 16 and 2D: `getActionButtonClasses` has no caller left; `ActionButton`'s one caller left is `D/error.tsx:30`.

| guard | `c/reports/report-filter-panel.tsx` before → after | plan total (budget) before → after |
|---|---|---|
| LFG LF1 | 1 → – | 1 in 1 row → 0 (`LF1: {}`) |
| `MIGRATED_LIST_FILES` | – → joins | +1 |
| `MIGRATED_FILTER_FILES` (`tests/list-filters-ui.test.ts`) | – → joins | +1 |

- [ ] **Step 1: Check what this task builds on (and save the precheck script)**

Save this script in your temp folder (never in the repo). Tasks 10–13 reuse it. Its hashes are the text of each file with `\r` stripped: the `6835bdf` text, or the text the earlier tasks of this group leave (the page after Tasks 9 and 12, the two report tests after Tasks 10, 11 and 12); plan 2B-5 Tasks 1–8 and 2C plan 5 edit none of these files.

`p2b5-t9-precheck.mjs`:

```js
// p2b5-t9-precheck.mjs: run from the repo root before Task 9, 10, 11, 12 or 13 of plan 2B-5 (the reports group).
// Usage: node p2b5-t9-precheck.mjs <9|10|11|12|13>. Reads only; writes nothing. Never commit this file.
// Confirms that the 2A and 2B-1 parts these five tasks use are there with the API the tasks quote, that the keys they
// read exist in th and en, that the earlier tasks of the group are in and this task's change is not, that each file this
// task edits still holds the text the old snippets quote (a hash of its text with \r stripped: the 6835bdf text, or the
// text an earlier task of this group left), and that the lines it replaces in the test files other tasks also edit are
// there exactly once.
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"

const task = Number(process.argv[2])
if (![9, 10, 11, 12, 13].includes(task)) {
  console.error("usage: node p2b5-t9-precheck.mjs <9|10|11|12|13>")
  process.exit(2)
}
const D = "src/app/[locale]/(dashboard)/"
const C = "src/components/"
const raw = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "")
const read = (path) => raw(path).replace(/\r\n/g, "\n")
const eol = (path) => {
  const text = raw(path)
  const crlf = (text.match(/\r\n/g) ?? []).length
  const lf = (text.match(/\n/g) ?? []).length
  return lf === 0 ? "missing" : crlf === lf ? "CRLF" : crlf === 0 ? "LF" : "mixed"
}
const hash = (path) => createHash("sha256").update(read(path)).digest("hex").slice(0, 16)
const ui = (name) => read(`${C}ui/${name}`)
const exports = (path, names) => names.every((name) => new RegExp(`export (?:function|const|type) ${name}\\b`).test(read(path)))
const messages = (locale) => JSON.parse(read(`messages/${locale}.json`))
const lfg = read("tests/list-frame-guards.test.ts")
const migratedBlock = lfg.match(/const MIGRATED_LIST_FILES: string\[\] = \[([\s\S]*?)\n\]/)?.[1] ?? ""
const migrated = (path) => migratedBlock.includes(path.startsWith(D) ? "`${D}" + path.slice(D.length) + "`" : "`${C}" + path.slice(C.length) + "`")
const once = (path, text) => read(path).split(text).length === 2

const PAGE = `${D}reports/page.tsx`
const PANEL = `${C}reports/report-filter-panel.tsx`
const TABS = `${C}reports/report-view-tabs.tsx`
const LIST = `${C}reports/responsive-report-list.tsx`
const OVERVIEW = `${C}reports/reports-overview-view.tsx`
const CATALOG = `${C}reports/reports-catalog-view.tsx`
const OPERATIONS = `${C}reports/reports-operations-view.tsx`
const ACCOUNTING = `${C}reports/reports-accounting-view.tsx`
const HEADER = `${C}reports/report-header.tsx`
const CHIPS = `${C}reports/report-active-filters.tsx`
const METRIC_CARD = `${C}ui/metric-card.tsx`
const CONTROLS_TEST = "tests/report-controls-ui.test.ts"
const ADAPTIVE_TEST = "tests/reports-adaptive-ui.test.ts"
const VFG = "tests/visual-foundation-guards.test.ts"

// The files each task edits, with their CR-stripped text hash before the task (6835bdf, or after an earlier task of
// this group: the page after Task 9 and after Task 12, the two report tests after Tasks 10, 11 and 12). Plan 2B-5 Tasks
// 1-8 and 14-16 edit none of them, and 2C plan 5 none at all.
const UNCHANGED = {
  9: { [PANEL]: "d47d971eb6aec7d2", [PAGE]: "5e663e1319053358" },
  10: { [TABS]: "b804efeacd5944ac", [CONTROLS_TEST]: "4ef9c1b47948dba2" },
  11: { [LIST]: "336987cb99a10338", [ADAPTIVE_TEST]: "4722fb5d6784f31e" },
  12: {
    [OVERVIEW]: "c0eb941d870abc71",
    [CATALOG]: "1d7083b111a6e1d5",
    [OPERATIONS]: "f9375bf061c86b51",
    [ACCOUNTING]: "25c50a4501ed4430",
    [PAGE]: "80e360958a81f0de",
    [ADAPTIVE_TEST]: "ca5ac4c50ea556ff",
  },
  13: {
    [PAGE]: "05147bc926036f13",
    [HEADER]: "410a46de79160181",
    [CHIPS]: "2120fa05fc29554b",
    [METRIC_CARD]: "b7638d207dd522f9",
    [CONTROLS_TEST]: "d07d87e722823200",
    [ADAPTIVE_TEST]: "1ccf80297b53a032",
  },
}
// The lines a task replaces in a test file that other tasks of the plan edit too (their own rows or blocks).
const ONCE = {
  9: { "tests/list-filters-ui.test.ts": ['  "src/components/master-data/master-data-layout.tsx",\n'] },
  13: {
    [VFG]: [
      'import { readFileSync } from "node:fs"\n',
      '  assert.match(read("src/components/ui/metric-card.tsx"), /cn\\("num mt-2 font-bold"/)\n',
      '  assert.match(read("src/components/ui/metric-card.tsx"), /cn\\("rounded-lg border p-5", toneClasses\\.container, className\\)/)\n',
    ],
  },
}
// What each task leaves behind, so the next task can see it is in (and a task can see it has not run yet).
const DONE = {
  9: () => read(PANEL).includes("<FilterFormActions") && migrated(PANEL),
  10: () => read(TABS).includes("<TabNav") && migrated(TABS),
  11: () => read(LIST).includes("<DataTable") && migrated(LIST),
  12: () => read(ACCOUNTING).includes("<StatStrip") && migrated(ACCOUNTING),
  13: () => !existsSync(METRIC_CARD) && migrated(PAGE),
}
// The keys the five tasks read, by namespace.
const KEYS = {
  common: ["baht", "noValue"],
  reportsPage: ["title", "subtitle", "viewNavigation", "filterTitle", "filterHelp", "search", "searchPlaceholder", "all", "applyFilters", "clearFilters", "activeFilters", "clearActiveFilter", "totalAssets", "totalValue", "exportAssetOverview", "exportAssetRegister", "catalogItems", "previewTitle", "crossScopePreviewTitle"],
}

const tabNav = ui("tab-nav.tsx")
const dataTable = ui("data-table.tsx")
const statStrip = ui("stat-strip.tsx")
const checks = {
  "2B-1: FilterSelect (label, options, allLabel, fieldSize lg), FilterFormActions (submitLabel, clear), Field and SearchField":
    /export function FilterSelect\(\{ label, options, allLabel, fieldSize = "lg", hideLabel, labelAction, className, children, \.\.\.selectProps \}: FilterSelectProps\)/.test(ui("filter-select.tsx")) &&
    /export function FilterFormActions\(\{ submitLabel, clear, className \}: FilterFormActionsProps\)/.test(ui("filter-panel.tsx")) &&
    /export \{ Field\b/.test(ui("field.tsx")) && /export \{ SearchField \}/.test(ui("search-field.tsx")),
  "2B-1: TabNav passes ...navProps to <nav> and takes linkClassName":
    /\.\.\.navProps \}: TabNavProps\)/.test(tabNav) && /\{\.\.\.navProps\}/.test(tabNav) && /linkClassName\?: string/.test(tabNav) && /aria-current=\{selected \? "page" : undefined\}/.test(tabNav),
  "2B-1: DataTable (framed, caption, div props) and its parts; DataTableHead align; DataTableCell numeric; EmptyNote padded":
    exports(`${C}ui/data-table.tsx`, ["DataTable", "DataTableHeader", "DataTableBody", "DataTableHead", "DataTableRow", "DataTableCell"]) &&
    /export type DataTableProps = Omit<React\.ComponentProps<"div">, "children">/.test(dataTable) && /framed\?: boolean/.test(dataTable) && /caption\?: string/.test(dataTable) &&
    /align\?: "left" \| "right"/.test(dataTable) && /numeric\?: boolean/.test(dataTable) && /padded\?: boolean/.test(ui("empty-note.tsx")),
  "2B-1: StatStrip with value, unit, href and className; FilterChipList; PageHeader with title, meta and actions":
    exports(`${C}ui/stat-strip.tsx`, ["StatStrip", "StatStripItem"]) &&
    ["value: string", "unit?: string", "href?: string"].every((text) => statStrip.includes(text)) && statStrip.includes('"text-metric num text-foreground"') &&
    /\{ items, className \}: \{ items: readonly StatStripItem\[\]; className\?: string \}/.test(statStrip) &&
    /export function FilterChipList\(\{ chips, label, removeLabel, clearAll, className \}: FilterChipListProps\)/.test(ui("filter-chips.tsx")) &&
    /export function PageHeader\(\{ title, meta, actions, back, breadcrumbs, compactOnMobile = false, className \}: PageHeaderProps\)/.test(ui("page-header.tsx")),
  "2A: Nil and orNil, formatCount, formatMoney, buttonVariants size md":
    exports(`${C}ui/nil.tsx`, ["Nil", "orNil"]) && exports("src/lib/display-format.ts", ["formatCount", "formatMoney"]) && /md: sizeMd,/.test(ui("button-variants.ts")),
  "the keys the five tasks read exist in th and en": ["th", "en"].every((locale) => {
    const all = messages(locale)
    return Object.entries(KEYS).every(([namespace, keys]) => keys.every((key) => typeof all[namespace]?.[key] === "string"))
  }),
  ...Object.fromEntries([9, 10, 11, 12].filter((number) => number < task).map((number) => [`Task ${number} is in`, DONE[number]()])),
  [`Task ${task} has not run yet`]: !DONE[task](),
  ...Object.fromEntries(Object.entries(UNCHANGED[task]).map(([path, expected]) => [`${path} holds the text this task starts from (hash ${expected})`, hash(path) === expected])),
  ...Object.fromEntries(Object.entries(ONCE[task] ?? {}).map(([path, lines]) => [`${path} holds the ${lines.length === 1 ? "line" : `${lines.length} lines`} this task replaces, once each`, lines.every((line) => once(path, line))])),
}

let missing = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok     " : "MISSING"} ${name}`)
  if (!ok) missing += 1
}
for (const path of [...Object.keys(UNCHANGED[task]), ...Object.keys(ONCE[task] ?? {})]) {
  const expected = UNCHANGED[task][path]
  console.log(`info    ${path}: ${eol(path)}${expected && hash(path) !== expected ? ` · hash now ${hash(path)}` : ""}`)
}
if (missing > 0) {
  console.error(`ABORT: ${missing} precondition(s) failed. Do not start Task ${task}; report which.`)
  process.exit(1)
}
console.log(`preconditions hold for Task ${task}`)
```

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2b-plan5`

Run: `git status --short src tests messages` then `node <temp>/p2b5-t9-precheck.mjs 9`
Expected: `git status` prints nothing. The script prints (exit 0):
```
ok      2B-1: FilterSelect (label, options, allLabel, fieldSize lg), FilterFormActions (submitLabel, clear), Field and SearchField
ok      2B-1: TabNav passes ...navProps to <nav> and takes linkClassName
ok      2B-1: DataTable (framed, caption, div props) and its parts; DataTableHead align; DataTableCell numeric; EmptyNote padded
ok      2B-1: StatStrip with value, unit, href and className; FilterChipList; PageHeader with title, meta and actions
ok      2A: Nil and orNil, formatCount, formatMoney, buttonVariants size md
ok      the keys the five tasks read exist in th and en
ok      Task 9 has not run yet
ok      src/components/reports/report-filter-panel.tsx holds the text this task starts from (hash d47d971eb6aec7d2)
ok      src/app/[locale]/(dashboard)/reports/page.tsx holds the text this task starts from (hash 5e663e1319053358)
ok      tests/list-filters-ui.test.ts holds the line this task replaces, once each
info    src/components/reports/report-filter-panel.tsx: CRLF
info    src/app/[locale]/(dashboard)/reports/page.tsx: CRLF
info    tests/list-filters-ui.test.ts: CRLF
preconditions hold for Task 9
```
On any `MISSING` line, stop and report it. A `hash now` line means the file changed after `6835bdf`, so the old snippets below may not match: report it, do not guess.

Run: `node <temp>/p2b1-precheck.mjs --file c/reports/report-filter-panel.tsx`
Expected (after the `info`/`ok` header lines; exit 0):
```
file    src/components/reports/report-filter-panel.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LF1        1       1     0     1
args    LF1=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol src/components/reports/report-filter-panel.tsx "src/app/[[]locale]/(dashboard)/reports/page.tsx" tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf w/crlf` for all four. Keep them CRLF.

- [ ] **Step 2: Write the failing tests (`tests/list-filters-ui.test.ts`, CRLF; it strips `\r` before matching, so its regexes may hold `\n`)**

(a) §6.13 item 5: the panel joins `MIGRATED_FILTER_FILES` (`:24`). Replace:

```ts
  "src/components/master-data/master-data-layout.tsx",
```

with:

```ts
  "src/components/master-data/master-data-layout.tsx",
  "src/components/reports/report-filter-panel.tsx",
```

(b) Save this block as `<temp>/t09-filters-block.ts`:

```ts
// Plan 2B-5 Task 9 (spec 2B §6.5 row 12, §6.2 6-จ, I6): the report filter panel keeps its FilterPanel, its grid, the
// hidden view and the URL-only scopes, and moves onto Field + SearchField, FilterSelect and FilterFormActions. The page
// tells it whether any filter is on, so "clear filters" shows only then. ActionButton itself stays for 2D.
test("the report filters are Field + SearchField, six FilterSelect and FilterFormActions (2B §6.5 row 12)", () => {
  const panel = read("src/components/reports/report-filter-panel.tsx")
  assert.match(panel, /<FilterPanel title=\{labels\.title\} description=\{labels\.help\} className="p-5">/)
  assert.match(panel, /<form role="search" action=\{`\/\$\{locale\}\/reports`\} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">/)
  assert.match(panel, /<Field label=\{labels\.search\}>\n\s+<SearchField name="search" defaultValue=\{filters\.search\} placeholder=\{labels\.searchPlaceholder\} \/>/)
  for (const [name, options] of [["companyId", "companies"], ["branchId", "branches"], ["categoryId", "categories"], ["statusId", "statuses"], ["conditionId", "conditions"], ["ownershipType", "ownershipTypes"]]) {
    assert.match(panel, new RegExp(`<FilterSelect label=\\{labels\\.\\w+\\} name="${name}" defaultValue=\\{filters\\.${name}\\} allLabel=\\{labels\\.all\\} options=\\{options\\.${options}\\} />`), name)
  }
  assert.match(panel, /<FilterFormActions\n\s+className="md:col-span-2 xl:col-span-3"\n\s+submitLabel=\{labels\.apply\}\n\s+clear=\{hasActiveFilters \? \{ href: buildReportHref\(locale, activeView, parseAssetListParams\(\{\}\)\), label: labels\.clear \} : undefined\}/)
  assert.doesNotMatch(panel, /ActionButton|getActionButtonClasses|getFieldControlClasses|<label\b|<select\b/)
  const page = read("src/app/[locale]/(dashboard)/reports/page.tsx")
  assert.match(page, /<ReportFilterPanel\n(?:\s+\w+=\{\w+\}\n)*\s+hasActiveFilters=\{hasActiveFilters\}\n/, "the page passes whether a filter is on")
})
```

Run: `node <temp>/p2b5-append.mjs <temp>/t09-filters-block.ts tests/list-filters-ui.test.ts`
Expected: `appended <temp>/t09-filters-block.ts to tests/list-filters-ui.test.ts (CRLF)`

Run: `node --test tests/list-filters-ui.test.ts`
Expected: FAIL, `tests 6 · pass 4 · fail 2` (one test more than before this step; Tasks 1–8 add no test to this file, Task 2 only adds its page to `MIGRATED_FILTER_FILES`):
- `migrated filter forms use Field, SearchField and FilterSelect only, and every form is a search landmark (item 5)`: `src/components/reports/report-filter-panel.tsx: a raw select or textarea`
- `the report filters are Field + SearchField, six FilterSelect and FilterFormActions (2B §6.5 row 12)`: the input did not match the regular expression `/<form role="search" action=\{`\/\$\{locale\}\/reports`\} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">/`

- [ ] **Step 3: Lower the guard row of the file (the failing guards)**

Run: `node <temp>/p2b-budget.mjs c/reports/report-filter-panel.tsx LF1=1:0 --migrated`
Expected (exit 0):
```
LF1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/components/reports/report-filter-panel.tsx
```

Run: `node --test tests/list-frame-guards.test.ts`
Expected: FAIL, `tests 21 · pass 19 · fail 2`:
- `LF1 list filters use the shared FilterSelect, not a local select helper`: `LF1: 1 in 1 files. …` with the one line `src/components/reports/report-filter-panel.tsx: 1 > 0`
- `L0 …`: the one line `LF1 src/components/reports/report-filter-panel.tsx: 1 > 0`

- [ ] **Step 4: Move the panel onto the shared filter parts (`src/components/reports/report-filter-panel.tsx` and one attribute of the page, CRLF)**

Four exact replacements: (1)–(3) in the panel, top to bottom, (4) in the page.

(1) Imports (`:1-5`): `Link`, `ActionButton`, `getActionButtonClasses` and `getFieldControlClasses` go (`FilterFormActions` draws both buttons). Replace:

```tsx
import Link from "next/link"
import { ActionButton } from "@/components/ui/action-button"
import { FilterPanel } from "@/components/ui/filter-panel"
import { getActionButtonClasses, getFieldControlClasses } from "@/lib/design-system"
import { parseAssetListParams } from "@/lib/asset-list-query"
```

with:

```tsx
import { Field } from "@/components/ui/field"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
import { FilterSelect } from "@/components/ui/filter-select"
import { SearchField } from "@/components/ui/search-field"
import { parseAssetListParams } from "@/lib/asset-list-query"
```

(2) The props, the comment over the component and the form tag (`:43-49`). Replace:

```tsx
  labels: ReportFilterLabels
}

export function ReportFilterPanel({ locale, activeView, filters, options, labels }: ReportFilterPanelProps) {
  return (
    <FilterPanel title={labels.title} description={labels.help} className="p-5">
      <form action={`/${locale}/reports`} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
```

with:

```tsx
  labels: ReportFilterLabels
  // Any report filter is on, the URL-only scopes included (the page's chip list): "clear filters" shows only then.
  hasActiveFilters: boolean
}

// The report filters on the shared parts (spec 2B §6.5 row 12): Field + SearchField, six FilterSelect at 40px with the
// "all" option first, and FilterFormActions. A GET form: the view and the URL-only scopes ride along as hidden inputs.
export function ReportFilterPanel({ locale, activeView, filters, options, labels, hasActiveFilters }: ReportFilterPanelProps) {
  return (
    <FilterPanel title={labels.title} description={labels.help} className="p-5">
      <form role="search" action={`/${locale}/reports`} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
```

(3) The fields, the buttons and `function ReportSelect` (`:58-116`, to the end of the file). Replace:

```tsx
        <label>
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{labels.search}</span>
          <input
            type="search"
            name="search"
            defaultValue={filters.search}
            placeholder={labels.searchPlaceholder}
            className={getFieldControlClasses()}
          />
        </label>
        <ReportSelect name="companyId" label={labels.company} value={filters.companyId} options={options.companies} allLabel={labels.all} />
        <ReportSelect name="branchId" label={labels.branch} value={filters.branchId} options={options.branches} allLabel={labels.all} />
        <ReportSelect name="categoryId" label={labels.category} value={filters.categoryId} options={options.categories} allLabel={labels.all} />
        <ReportSelect name="statusId" label={labels.status} value={filters.statusId} options={options.statuses} allLabel={labels.all} />
        <ReportSelect name="conditionId" label={labels.condition} value={filters.conditionId} options={options.conditions} allLabel={labels.all} />
        <ReportSelect name="ownershipType" label={labels.ownershipType} value={filters.ownershipType} options={options.ownershipTypes} allLabel={labels.all} />
        <div className="flex min-w-0 flex-col gap-2 self-end md:col-span-2 md:flex-row md:flex-wrap xl:col-span-3">
          <ActionButton type="submit" variant="primary" className="min-h-11 w-full md:h-10 md:min-h-0 md:w-auto">
            {labels.apply}
          </ActionButton>
          <Link
            href={buildReportHref(locale, activeView, parseAssetListParams({}))}
            className={`${getActionButtonClasses("secondary")} min-h-11 w-full md:h-10 md:min-h-0 md:w-auto`}
          >
            {labels.clear}
          </Link>
        </div>
      </form>
    </FilterPanel>
  )
}

function ReportSelect({
  name,
  label,
  value,
  options,
  allLabel,
}: {
  name: string
  label: string
  value: string
  options: ReportFilterOption[]
  allLabel: string
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <select name={name} defaultValue={value} className={getFieldControlClasses()}>
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
```

with:

```tsx
        <Field label={labels.search}>
          <SearchField name="search" defaultValue={filters.search} placeholder={labels.searchPlaceholder} />
        </Field>
        <FilterSelect label={labels.company} name="companyId" defaultValue={filters.companyId} allLabel={labels.all} options={options.companies} />
        <FilterSelect label={labels.branch} name="branchId" defaultValue={filters.branchId} allLabel={labels.all} options={options.branches} />
        <FilterSelect label={labels.category} name="categoryId" defaultValue={filters.categoryId} allLabel={labels.all} options={options.categories} />
        <FilterSelect label={labels.status} name="statusId" defaultValue={filters.statusId} allLabel={labels.all} options={options.statuses} />
        <FilterSelect label={labels.condition} name="conditionId" defaultValue={filters.conditionId} allLabel={labels.all} options={options.conditions} />
        <FilterSelect label={labels.ownershipType} name="ownershipType" defaultValue={filters.ownershipType} allLabel={labels.all} options={options.ownershipTypes} />
        <FilterFormActions
          className="md:col-span-2 xl:col-span-3"
          submitLabel={labels.apply}
          clear={hasActiveFilters ? { href: buildReportHref(locale, activeView, parseAssetListParams({})), label: labels.clear } : undefined}
        />
      </form>
    </FilterPanel>
  )
}
```

(4) The page passes whether a filter is on (`src/app/[locale]/(dashboard)/reports/page.tsx:733-736`, inside `<ReportFilterPanel`). Replace:

```tsx
          filters={filters}
          options={filterOptions}
          labels={{
            title: t("filterTitle"),
```

with:

```tsx
          filters={filters}
          options={filterOptions}
          hasActiveFilters={hasActiveFilters}
          labels={{
            title: t("filterTitle"),
```

Check: `grep -nE 'ReportSelect|ActionButton|getActionButtonClasses|getFieldControlClasses|<label|<select' src/components/reports/report-filter-panel.tsx` prints nothing (exit 1).

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/reports-adaptive-ui.test.ts tests/reports-localization.test.ts tests/report-active-filters.test.ts tests/list-primitives-ui.test.ts tests/field-primitives.test.ts tests/form-migration-guards.test.ts tests/design-system.test.ts`
Expected: PASS, `tests 145 · pass 145 · fail 0` (list-filters-ui 6 · list-frame-guards 21 · visual-foundation-guards 26 · reports-adaptive-ui 14 · reports-localization 4 · report-active-filters 3 · list-primitives-ui 19 · field-primitives 16 · form-migration-guards 23 · design-system 13).

Run: `node <temp>/p2b1-precheck.mjs --file c/reports/report-filter-panel.tsx`
Expected (exit 0):
```
file    src/components/reports/report-filter-panel.tsx (CRLF) · in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LF1        0       0     0     1
args    (no row holds this file)
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b5-tw-probe.mjs src/components/reports/report-filter-panel.tsx`
Expected: `checked 8 classes, missing 0` (exit 0). No class is new to `src`.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `tests 1993 · pass 1992 · fail 0 · skipped 1` (one test more than the 1992 after Task 8).
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors and the 146 warnings under `.agents/`; `npx eslint src/components/reports/report-filter-panel.tsx "src/app/[locale]/(dashboard)/reports/page.tsx" tests/list-filters-ui.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 4 files: the panel 24 insertions and 61 deletions, the page 1 and 0, `tests/list-filters-ui.test.ts` 18 and 0, `tests/list-frame-guards.test.ts` 1 and 2 (the `MIGRATED_LIST_FILES` line in; the LF1 row and its `// 2B-5` line out). CRLF counts (`node -e "const s=require('fs').readFileSync(process.argv[1],'utf8');console.log((s.match(/\r\n/g)||[]).length,(s.match(/\n/g)||[]).length)" <file>`): the panel `79 79`, the page `799 799`. A file that shows every line changed was normalized: restore its line endings before you commit.

- [ ] **Step 8: Commit**

```bash
git add src/components/reports/report-filter-panel.tsx "src/app/[locale]/(dashboard)/reports/page.tsx" tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): report filters on Field, SearchField, FilterSelect and FilterFormActions, clear only while a filter is on (2B-5 task 9)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 18, spec §8.9 row `/th/reports`):** at 1440, 768 and 375 on each view: labels 13px dark above their fields; 40px fields from md, 44px with 16px text at 375 (no zoom on focus in iOS); the selects show the chevron; Enter in the search box and "ใช้ตัวกรอง" both filter and keep the view (`?view=accounting` stays) and the URL-only scopes (open the report from a data-quality drill-down: the scope survives "ใช้ตัวกรอง"); with no filter there is one button; with any filter (or only a drill-down scope) "ล้างตัวกรอง" appears and returns to the unfiltered view. Tab order: search → six selects → ใช้ตัวกรอง → ล้างตัวกรอง. NVDA reads each field by its label; the form is a search landmark.

---

### Task 10: `c/reports/report-view-tabs.tsx` · the client wrapper keeps the scrolling and renders the shared `TabNav` (I9)

Spec §8.9 row 8 (`report-view-tabs.tsx` keeps the client wrapper that owns the scroll and wraps `TabNav`), §10.2 I9, §3.12 "จุดเรียก" row `ReportViewTabs`, §5.1 row "แถวแท็บ" (B3(5)), §9.9 item 11, §10.4 table A row 2B-5 (`report-controls-ui.test.ts:13-17`), table D (`report-controls-ui.test.ts:19-27`), §10.4 table C (LN1) and controller rulings (a) and (e). One file, one commit. The component and its test are CRLF: exact-string replacements only.

Rulings this task applies:
- **I9:** the file stays the `"use client"` wrapper that owns the scrolling and renders `TabNav`, passing `ref={tabsRef}`, `data-report-tabs`, `className="snap-x snap-mandatory"` (the snap row) and `linkClassName="snap-start"` (every link). `TabNav` sets `aria-current="page"` and the underline, so the hand-written links, their boxed look, the `Check` icon and the `aria-current` go. LN1 1 → 0.
- **Table D (`report-controls-ui.test.ts:19-27` unchanged):** below md a direct link to a later view still brings its tab into the row with the same `scrollTo({ left: … })`. A single `Link` ref cannot reach the current tab any more, so the effect finds it in the row (`tabs?.querySelector('[aria-current="page"]')`) and keeps it in `activeTabRef`, the name `:22` reads.
- **Table A `report-controls-ui.test.ts:13-17`:** the non-color indicator is now `TabNav`'s: `aria-current` and the 2px inset underline in `ui/tab-nav.tsx`; the test reads them there. One test is appended for the wrapper.
- **`MIGRATED_LIST_FILES` (the rule of plans 2B-1 to 2B-4):** 2B does not touch this file again, so it joins `MIGRATED_LIST_FILES` (every counter 0).

What users will see on `/th/reports`: the four views (ภาพรวม · บัญชี · การปฏิบัติงาน · คลังรายงาน) are the underline row of the other pages: the current view in ink at weight 600 with a 2px primary line, the others muted, no boxes and no check icon. On phones the row still scrolls sideways with snapping, a direct link to a later view brings its tab into view, and targets stay 44px; from md the row is 40px.

Not in this task: the page that renders it (Task 13; the page keeps its `<div data-report-tabs>` wrapper) · `c/ui/tab-nav.tsx` (2B-1's) · docs (Task 19). Do not run a formatter.

**Files:**
- Modify: `src/components/reports/report-view-tabs.tsx` (`i/lf w/crlf`; 2 exact replacements)
- Modify: `tests/report-controls-ui.test.ts` (`i/lf w/crlf`; 1 exact replacement, 1 appended block)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only: `t10-tabs-block.ts`

**Must keep passing without edits:**
- `tests/report-controls-ui.test.ts:8-11` (Task 13 deletes it with `report-active-filters.tsx`) and `:19-27` (`^"use client"`, `useEffect`, `activeTabRef`, `scrollTo({ … left:`, `snap-x`, `snap-mandatory`, `snap-start`)
- `tests/reports-adaptive-ui.test.ts:13-20` (`data-report-tabs` comes first in the page) · `tests/list-primitives-ui.test.ts` (the `TabNav` strings) · `tests/visual-foundation-guards.test.ts:143-152` · `tests/loading-boundaries.test.ts` · `tests/form-migration-guards.test.ts`

**Interfaces:**
- Consumes:
  - 2B-1: `TabNav({ "aria-label": string, items: readonly TabNavItem[], current: string, scroll?, onSelect?, linkClassName?: string, className?: string, ...navProps })` from `@/components/ui/tab-nav`, with `TabNavItem = { key: string; label: ReactNode; href: string; count?: string; icon?: ReactNode }`; `...navProps` reaches `<nav>` (`ref`, `data-*`).
  - `reportViews` (`readonly ["overview", "accounting", "operations", "catalog"]`) and `buildReportHref(locale, view, filters)` from `@/lib/report-view` (unchanged).
  - Task 9's `<temp>/p2b5-t9-precheck.mjs`; Task 1's `<temp>/p2b5-append.mjs` and `<temp>/p2b5-tw-probe.mjs`; Task 0's guard scripts.
- Produces: `ReportViewTabs` with the same props (`locale`, `activeView`, `filters`, `labels`, `navigationLabel`; the page call does not change); the file in `MIGRATED_LIST_FILES`; LFG `BUDGETS.LN1` without its row; the test `report view tabs wrap the shared TabNav and keep their own scrolling (spec 2B I9)`.

| guard | `c/reports/report-view-tabs.tsx` before → after | plan total (budget) before → after |
|---|---|---|
| LFG LN1 | 1 → – | 4 in 3 rows → 3 in 2 (the brands `KEEP` 2 and `D/work-center/page.tsx` 1, Task 15's) |
| `MIGRATED_LIST_FILES` | – → joins | +1 |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b5-t9-precheck.mjs 10`
Expected: `git status` prints nothing. The script prints the six `ok` lines of the shared parts and the keys (as in Task 9 Step 1), then (exit 0):
```
ok      Task 9 is in
ok      Task 10 has not run yet
ok      src/components/reports/report-view-tabs.tsx holds the text this task starts from (hash b804efeacd5944ac)
ok      tests/report-controls-ui.test.ts holds the text this task starts from (hash 4ef9c1b47948dba2)
info    src/components/reports/report-view-tabs.tsx: CRLF
info    tests/report-controls-ui.test.ts: CRLF
preconditions hold for Task 10
```

Run: `node <temp>/p2b1-precheck.mjs --file c/reports/report-view-tabs.tsx`
Expected (after the header lines; exit 0):
```
file    src/components/reports/report-view-tabs.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LN1        1       1     0     1
args    LN1=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol src/components/reports/report-view-tabs.tsx tests/report-controls-ui.test.ts`
Expected: `i/lf w/crlf` for both.

- [ ] **Step 2: Write the failing tests (`tests/report-controls-ui.test.ts`, CRLF, read raw)**

(a) Table A `:13-17`. Replace:

```ts
test("the active report tab has a non-color indicator", () => {
  assert.match(viewTabsSource, /import \{ Check \} from "lucide-react"/)
  assert.match(viewTabsSource, /isActive \? <Check aria-hidden="true"/)
  assert.match(viewTabsSource, /aria-current=\{isActive \? "page" : undefined\}/)
})
```

with:

```ts
test("the active report tab has a non-color indicator", () => {
  // The tabs are the shared TabNav (spec 2B I9, table A): its current link has aria-current="page" and a 2px underline
  // drawn as an inset shadow, a shape and not only a color, so the wrapper sets neither.
  const tabNavSource = readFileSync(new URL("../src/components/ui/tab-nav.tsx", import.meta.url), "utf8")
  assert.match(viewTabsSource, /<TabNav\b/)
  assert.match(tabNavSource, /shadow-\[inset_0_-2px_0_var\(--primary\)\]/)
  assert.match(tabNavSource, /aria-current=\{selected \? "page" : undefined\}/)
  assert.doesNotMatch(viewTabsSource, /aria-current=\{|<Link\b|\bCheck\b/)
})
```

(b) Save this block as `<temp>/t10-tabs-block.ts`:

```ts
// Plan 2B-5 Task 10 (spec 2B I9, §8.9 row 8, B3(5)): the report views are the shared TabNav, underlined at every width
// and 44px on phones. This client wrapper keeps the scrolling: the nav ref, the snap row, snap-start on every link and
// the effect that brings the current tab into view below md. This file reads the source raw (CRLF): no line breaks here.
test("report view tabs wrap the shared TabNav and keep their own scrolling (spec 2B I9)", () => {
  assert.match(viewTabsSource, /import \{ TabNav \} from "@\/components\/ui\/tab-nav"/)
  assert.match(viewTabsSource, /<TabNav\s+ref=\{tabsRef\}\s+data-report-tabs\s+aria-label=\{navigationLabel\}\s+current=\{activeView\}\s+className="snap-x snap-mandatory"\s+linkClassName="snap-start"/)
  assert.match(viewTabsSource, /items=\{reportViews\.map\(\(view\) => \(\{ key: view, label: labels\[view\], href: buildReportHref\(locale, view, filters\) \}\)\)\}/)
  assert.match(viewTabsSource, /tabs\?\.querySelector<HTMLElement>\('\[aria-current="page"\]'\)/)
})
```

Run: `node <temp>/p2b5-append.mjs <temp>/t10-tabs-block.ts tests/report-controls-ui.test.ts`
Expected: `appended <temp>/t10-tabs-block.ts to tests/report-controls-ui.test.ts (CRLF)`

Run: `node --test tests/report-controls-ui.test.ts`
Expected: FAIL, `tests 4 · pass 2 · fail 2` (one test more than before this step):
- `the active report tab has a non-color indicator`: the input did not match the regular expression `/<TabNav\b/`
- `report view tabs wrap the shared TabNav and keep their own scrolling (spec 2B I9)`: the input did not match the regular expression `/import \{ TabNav \} from "@\/components\/ui\/tab-nav"/`

- [ ] **Step 3: Lower the guard row of the file (the failing guards)**

Run: `node <temp>/p2b-budget.mjs c/reports/report-view-tabs.tsx LN1=1:0 --migrated`
Expected (exit 0):
```
LN1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/components/reports/report-view-tabs.tsx
```

Run: `node --test tests/list-frame-guards.test.ts`
Expected: FAIL, `tests 21 · pass 19 · fail 2`:
- `LN1 aria-current="page" is set by TabNav, StatStrip, Pagination and the menus, not by hand`: `LN1: 4 in 3 files. …` with the one line `src/components/reports/report-view-tabs.tsx: 1 > 0`
- `L0 …`: the one line `LN1 src/components/reports/report-view-tabs.tsx: 1 > 0`

- [ ] **Step 4: Render `TabNav` from the wrapper (`src/components/reports/report-view-tabs.tsx`, CRLF)**

Two exact replacements.

(1) Imports (`:3-6`): `Link` and `Check` go. Replace:

```tsx
import { useEffect, useRef } from "react"
import Link from "next/link"
import { Check } from "lucide-react"
import { parseAssetListParams } from "@/lib/asset-list-query"
```

with:

```tsx
import { useEffect, useRef } from "react"
import { TabNav } from "@/components/ui/tab-nav"
import { parseAssetListParams } from "@/lib/asset-list-query"
```

(2) The component (`:17-56`, to the end of the file). Replace:

```tsx
export function ReportViewTabs({ locale, activeView, filters, labels, navigationLabel }: ReportViewTabsProps) {
  const tabsRef = useRef<HTMLElement>(null)
  const activeTabRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    const tabs = tabsRef.current
    const activeTab = activeTabRef.current
    if (!tabs || !activeTab || window.matchMedia("(min-width: 768px)").matches) return

    const tabsRect = tabs.getBoundingClientRect()
    const activeRect = activeTab.getBoundingClientRect()
    const isFullyVisible = activeRect.left >= tabsRect.left && activeRect.right <= tabsRect.right
    if (isFullyVisible) return

    tabs.scrollTo({
      left: tabs.scrollLeft + activeRect.left - tabsRect.left,
      behavior: "auto",
    })
  }, [activeView])

  return (
    <nav ref={tabsRef} data-report-tabs aria-label={navigationLabel} className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
      {reportViews.map((view) => {
        const isActive = view === activeView
        return (
          <Link
            key={view}
            ref={isActive ? activeTabRef : undefined}
            href={buildReportHref(locale, view, filters)}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex min-h-11 shrink-0 snap-start items-center justify-center rounded-md border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isActive ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-muted-foreground hover:bg-accent hover:text-foreground"}`}
          >
            {isActive ? <Check aria-hidden="true" className="mr-1.5 h-4 w-4" /> : null}
            {labels[view]}
          </Link>
        )
      })}
    </nav>
  )
}
```

with:

```tsx
// The client wrapper that owns the scrolling of the shared TabNav (spec 2B I9): the row snaps link by link, and below
// md a direct link to a later view brings its tab into the row. TabNav draws the underline and sets aria-current.
export function ReportViewTabs({ locale, activeView, filters, labels, navigationLabel }: ReportViewTabsProps) {
  const tabsRef = useRef<HTMLElement>(null)
  // TabNav renders the links, so the current one is looked up in the row after each view change.
  const activeTabRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const tabs = tabsRef.current
    activeTabRef.current = tabs?.querySelector<HTMLElement>('[aria-current="page"]') ?? null
    const activeTab = activeTabRef.current
    if (!tabs || !activeTab || window.matchMedia("(min-width: 768px)").matches) return

    const tabsRect = tabs.getBoundingClientRect()
    const activeRect = activeTab.getBoundingClientRect()
    const isFullyVisible = activeRect.left >= tabsRect.left && activeRect.right <= tabsRect.right
    if (isFullyVisible) return

    tabs.scrollTo({
      left: tabs.scrollLeft + activeRect.left - tabsRect.left,
      behavior: "auto",
    })
  }, [activeView])

  return (
    <TabNav
      ref={tabsRef}
      data-report-tabs
      aria-label={navigationLabel}
      current={activeView}
      className="snap-x snap-mandatory"
      linkClassName="snap-start"
      items={reportViews.map((view) => ({ key: view, label: labels[view], href: buildReportHref(locale, view, filters) }))}
    />
  )
}
```

Check: `grep -nE 'aria-current=\{|<Link\b|\bCheck\b|isActive' src/components/reports/report-view-tabs.tsx` prints nothing (exit 1).

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/report-controls-ui.test.ts tests/reports-adaptive-ui.test.ts tests/list-primitives-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/loading-boundaries.test.ts`
Expected: PASS, `tests 111 · pass 111 · fail 0` (report-controls-ui 4 · reports-adaptive-ui 14 · list-primitives-ui 19 · list-frame-guards 21 · visual-foundation-guards 26 · form-migration-guards 23 · loading-boundaries 4).

Run: `node <temp>/p2b1-precheck.mjs --file c/reports/report-view-tabs.tsx`
Expected (exit 0):
```
file    src/components/reports/report-view-tabs.tsx (CRLF) · in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LN1        0       0     0     1
args    (no row holds this file)
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

- [ ] **Step 6: Prove every class compiles**

Run: `SHOW=snap-x,snap-mandatory,snap-start node <temp>/p2b5-tw-probe.mjs src/components/reports/report-view-tabs.tsx`
Expected (exit 0):
```
checked 3 classes, missing 0
snap-x -> .snap-x { scroll-snap-type: x var(--tw-scroll-snap-strictness); }
snap-mandatory -> .snap-mandatory { --tw-scroll-snap-strictness: mandatory; }
snap-start -> .snap-start { scroll-snap-align: start; }
```
The probe reads `linkClassName="snap-start"` through its `ClassName=` lead. No class is new to `src`.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `tests 1994 · pass 1993 · fail 0 · skipped 1` (one test more than the 1993 after Task 9).
- `npx tsc --noEmit`: no errors (`useRef<HTMLElement>(null)` fits the `ref` that `TabNav` passes to `<nav>`; `data-report-tabs` is a `data-*` attribute, which TypeScript takes on a component).
- `npm run lint`: 0 errors, no new warning; `npx eslint src/components/reports/report-view-tabs.tsx tests/report-controls-ui.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 3 files: the component 15 insertions and 20 deletions, `tests/report-controls-ui.test.ts` 17 and 3, `tests/list-frame-guards.test.ts` 1 and 1 (the `MIGRATED_LIST_FILES` line in; the LN1 row out; its `// 2B-5` line stays over the work-center row). CRLF counts: the component `51 51`, the test `41 41`.

- [ ] **Step 8: Commit**

```bash
git add src/components/reports/report-view-tabs.tsx tests/report-controls-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): report view tabs render the shared TabNav from their scrolling client wrapper (2B-5 task 10)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 18, spec §8.9 row `/th/reports` "แท็บมุมมองเป็น TabNav"):** at 1440, 768 and 375: the four views are an underline row; the current one has the 2px line and weight 600 and is announced as the current page; the filters in the URL ride along when you switch views. At 375 open `/th/reports?view=catalog` directly: the row scrolls so "คลังรายงาน" is in view; swiping snaps tab by tab; each tab is 44px tall and nothing scrolls the page sideways. Keyboard: Tab reaches each tab, the focus ring sits inside the row. Forced colors: the current tab keeps its bottom border.

---

### Task 11: `c/reports/responsive-report-list.tsx` · the desktop table of the wide report lists on `DataTable`, an `EmptyNote` when empty

Spec §8.9 row 8 (`responsive-report-list.tsx` R7), §5.6 row "`D/reports/page.tsx` + `c/reports/*`" (`ResponsiveReportList` inside is `DataTable` + the empty `:24` → `EmptyNote`), §5.1 rows "กรอบตาราง", "`<thead …>`" and "เซลล์", §5.7, §5.8 (the mobile cards stay), §9.2.1 row 2B-5, §10.4 table A row 2B-5 (`reports-adaptive-ui.test.ts:88`), table C (R7, LT1) and controller rulings (a), (b) and (e). One file, one commit. The component and its test are CRLF: exact-string replacements only.

Rulings this task applies:
- **§5.6, §5.1, I3:** from md the list is `DataTable framed={false}` (the panel or box around it is the frame: the overview section, the two accounting boxes and the cross-scope box), with `DataTableHeader`/`DataTableHead` (white 13/500 head in sentence case, `scope="col"`), `DataTableBody`, `DataTableRow` and `DataTableCell` (`p-3`, 16/20px gutters at the first and last column). `data-report-desktop-table` and `hidden md:block` stay on the frame (`tests/reports-adaptive-ui.test.ts:84-85`). The `bg-muted/40` head and its `uppercase` go: VFG R7 1 → 0, LT1 1 → 0.
- **§5.6 ("แถวว่าง `:24` → `EmptyNote`"):** an empty list is one `EmptyNote padded` line (13/20 faint, 16×20 padding) instead of the centred `p-6` text.
- **§5.7 (numbers on the right):** a column may say `numeric: true`; its head is `align="right"` and its cell `numeric` (right, one line, `num`). Task 12 sets it on the accounting money, ratio and count columns.
- **§3.4 (`caption`):** an optional `caption` names the table for screen readers; Task 12 passes each panel's title. No `scrollHint`: the panels that hold these tables scroll them as before, and the hint would need a key the views do not get (the mobile cards take over below md).
- **§5.8:** the mobile cards (`data-report-mobile-list`, the two-column `<dl>`) are unchanged (`tests/reports-adaptive-ui.test.ts:86-87`, `:89`, `:96-100`).
- **`MIGRATED_LIST_FILES` (the rule of plans 2B-1 to 2B-4):** 2B does not touch this file again, so it joins `MIGRATED_LIST_FILES` (every counter 0).
- **Additive API:** `numeric` and `caption` are optional, so the four callers compile unchanged until Task 12 sets them.

What users will see on `/th/reports` from 768px (the overview preview, the accounting risk and book-value tables, the cross-scope preview): the table head is white with 13px grey words in sentence case (it was a grey band with small capitals); rows are about 46px with soft lines, a light fill on hover; the first and last columns line up with the panel title. An empty table reads as one faint line. Below 768px the cards are unchanged.

Not in this task: the columns' content, `numeric` and `caption` at the call sites (Task 12) · docs (Task 19). Do not run a formatter.

**Files:**
- Modify: `src/components/reports/responsive-report-list.tsx` (`i/lf w/crlf`; 2 exact replacements)
- Modify: `tests/reports-adaptive-ui.test.ts` (`i/lf w/crlf`; 1 exact replacement, 1 appended block)
- Modify: `tests/list-frame-guards.test.ts`, `tests/visual-foundation-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only: `t11-list-block.ts`

**Must keep passing without edits:**
- `tests/reports-adaptive-ui.test.ts:84-87`, `:89`, `:91-93` (the desktop and mobile hooks, `<dl`, the counts of `<ResponsiveReportList` per view), `:96-100` (`mobileClassName?: string`, the `<dl className="…grid-cols-2…">`, `cn("min-w-0", column.mobileClassName)`) and `:102-111`
- `tests/report-table-key.test.ts` (`rowKey={(asset) => asset.id}`) · `tests/report-idle-activity.test.ts` · `tests/report-controls-ui.test.ts`
- `tests/list-primitives-ui.test.ts` (the `DataTable` strings) · `tests/form-migration-guards.test.ts`

**Interfaces:**
- Consumes:
  - 2B-1: `DataTable({ children, caption?: string, framed?: boolean (true), layout?, minWidth?, scrollHint?, footer?, className?, …<div> props })`, `DataTableHeader`, `DataTableBody`, `DataTableHead({ align?: "left" | "right", sort?, sticky?, hideLabel?, … })`, `DataTableRow`, `DataTableCell({ align?, numeric?: boolean, sticky?, className?, … })` from `@/components/ui/data-table`; `EmptyNote({ tone?, icon?, padded?, className?, … })` from `@/components/ui/empty-note` (all server-safe).
  - Task 9's `<temp>/p2b5-t9-precheck.mjs`; Task 1's `<temp>/p2b5-append.mjs`, `<temp>/p2b5-tw-probe.mjs`; Task 0's guard scripts.
- Produces:
  - `ResponsiveReportColumn<Row>.numeric?: boolean` and the `caption?: string` prop of `ResponsiveReportList` (Task 12 uses both); the rest of the API unchanged.
  - The file in `MIGRATED_LIST_FILES`, without rows in LFG `BUDGETS.LT1` and VFG `TABLE_HEADER_FILLS`; the test `wide report lists render the shared DataTable from md and one EmptyNote line when empty (spec 2B §5.6)`.
  - For Task 17: `TABLE_HEADER_FILLS` holds only `"src/components/assets/asset-import-preview-panel.tsx": 1` (its "2C plan 4 or 2D" group) once Tasks 1–3 and 8 have removed theirs.

| guard | `c/reports/responsive-report-list.tsx` before → after | plan total (budget) before → after |
|---|---|---|
| VFG R7 | 1 → – | 2 in 2 rows → 1 in 1 (after Tasks 1–3 and 8; the import panel's row stays) |
| LFG LT1 | 1 → – | live 8 in 3 files → 7 in 2 (after Tasks 2, 3 and 8: `master-data-layout.tsx` 2, Task 16's, and the import panel's `KEEP` 5) |
| `MIGRATED_LIST_FILES` | – → joins | +1 |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b5-t9-precheck.mjs 11`
Expected: `git status` prints nothing. The script prints the six `ok` lines of the shared parts and the keys, then (exit 0):
```
ok      Task 9 is in
ok      Task 10 is in
ok      Task 11 has not run yet
ok      src/components/reports/responsive-report-list.tsx holds the text this task starts from (hash 336987cb99a10338)
ok      tests/reports-adaptive-ui.test.ts holds the text this task starts from (hash 4722fb5d6784f31e)
info    src/components/reports/responsive-report-list.tsx: CRLF
info    tests/reports-adaptive-ui.test.ts: CRLF
preconditions hold for Task 11
```

Run: `node <temp>/p2b1-precheck.mjs --file c/reports/responsive-report-list.tsx`
Expected (after the header lines; exit 0):
```
file    src/components/reports/responsive-report-list.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
R7         1       1     0     1
LT1        1       1     0     1
args    R7=1:1 LT1=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol src/components/reports/responsive-report-list.tsx tests/reports-adaptive-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: `i/lf w/crlf` for all four.

- [ ] **Step 2: Write the failing tests (`tests/reports-adaptive-ui.test.ts`, CRLF, read raw)**

(a) Table A `:88`. Replace:

```ts
  assert.match(responsiveList, /<th/)
```

with:

```ts
  assert.match(responsiveList, /<DataTableHead\b/)
```

(b) Save this block as `<temp>/t11-list-block.ts`:

```ts
// Plan 2B-5 Task 11 (spec 2B §5.6 row reports, §3.4, B3): from md the wide report lists are the shared DataTable with
// no frame of its own (the panel around it is the frame), a caption, white 13px heads in sentence case and numbers on
// the right; an empty list is one EmptyNote line. This file reads the sources raw (CRLF): no line breaks here.
test("wide report lists render the shared DataTable from md and one EmptyNote line when empty (spec 2B §5.6)", () => {
  assert.match(responsiveList, /<DataTable data-report-desktop-table framed=\{false\} caption=\{caption\} className="hidden md:block">/)
  assert.match(responsiveList, /<DataTableHead key=\{column\.key\} align=\{column\.numeric \? "right" : "left"\}>/)
  assert.match(responsiveList, /<DataTableCell key=\{column\.key\} numeric=\{column\.numeric\} className=\{column\.className\}>/)
  assert.match(responsiveList, /return <EmptyNote padded>\{emptyLabel\}<\/EmptyNote>/)
  assert.doesNotMatch(responsiveList, /<table\b|<thead\b|<th\b|<td\b|uppercase|bg-muted/)
})
```

Run: `node <temp>/p2b5-append.mjs <temp>/t11-list-block.ts tests/reports-adaptive-ui.test.ts`
Expected: `appended <temp>/t11-list-block.ts to tests/reports-adaptive-ui.test.ts (CRLF)`

Run: `node --test tests/reports-adaptive-ui.test.ts`
Expected: FAIL, `tests 15 · pass 13 · fail 2` (one test more than before this step):
- `wide report datasets have mutually exclusive table and mobile list hooks`: the input did not match the regular expression `/<DataTableHead\b/`
- `wide report lists render the shared DataTable from md and one EmptyNote line when empty (spec 2B §5.6)`: the input did not match the regular expression `/<DataTable data-report-desktop-table framed=\{false\} caption=\{caption\} className="hidden md:block">/`

- [ ] **Step 3: Lower the guard rows of the file (the failing guards)**

Run: `node <temp>/p2b-budget.mjs c/reports/responsive-report-list.tsx R7=1:0 LT1=1:0 --migrated`
Expected (exit 0):
```
R7: 1 -> 0 (row deleted)
LT1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/components/reports/responsive-report-list.tsx
```

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 44 · fail 3`, each naming only `src/components/reports/responsive-report-list.tsx`:
- `LT1 table headers have no solid muted or accent fill and no capitals`: `LT1: 8 in 3 files. …` (the simulation without Tasks 1–8 prints `21 in 6`) with the one line `src/components/reports/responsive-report-list.tsx: 1 > 0`
- `L0 …`: the one line `LT1 src/components/reports/responsive-report-list.tsx: 1 > 0`
- VFG `R7 interim: table-header fills wait for DataTable (2B), file by file`: `2 matches in 2 files; over budget:` (simulation: `9 matches in 6 files`) and `src/components/reports/responsive-report-list.tsx: 1 > 0`

- [ ] **Step 4: Move the desktop table onto `DataTable` (`src/components/reports/responsive-report-list.tsx`, CRLF)**

Two exact replacements.

(1) Imports, the column type and the props, through the empty state (`:1-25`). Replace:

```tsx
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type ResponsiveReportColumn<Row> = {
  key: string
  label: string
  render: (row: Row) => ReactNode
  className?: string
  mobileClassName?: string
}

export function ResponsiveReportList<Row>({
  rows,
  rowKey,
  columns,
  emptyLabel,
}: {
  rows: Row[]
  rowKey: (row: Row) => string
  columns: ResponsiveReportColumn<Row>[]
  emptyLabel: string
}) {
  if (rows.length === 0) {
    return <div className="p-6 text-center text-sm text-muted-foreground">{emptyLabel}</div>
  }
```

with:

```tsx
import type { ReactNode } from "react"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { cn } from "@/lib/utils"

export type ResponsiveReportColumn<Row> = {
  key: string
  label: string
  render: (row: Row) => ReactNode
  className?: string
  mobileClassName?: string
  // A count or an amount: the head and the cell sit on the right, on one line, with tabular figures (spec 2B §5.7).
  numeric?: boolean
}

// Wide report rows (spec 2B §5.6): the shared DataTable from md, without a frame of its own because the panel around
// it is the frame, and two-column cards below md. caption names the table for screen readers (the panel's title).
export function ResponsiveReportList<Row>({
  rows,
  rowKey,
  columns,
  emptyLabel,
  caption,
}: {
  rows: Row[]
  rowKey: (row: Row) => string
  columns: ResponsiveReportColumn<Row>[]
  emptyLabel: string
  caption?: string
}) {
  if (rows.length === 0) {
    return <EmptyNote padded>{emptyLabel}</EmptyNote>
  }
```

(2) The desktop table (`:27-56`). Replace:

```tsx
  return (
    <>
      <div data-report-desktop-table className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/40">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-4 py-3", column.className)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
```

with:

```tsx
  return (
    <>
      <DataTable data-report-desktop-table framed={false} caption={caption} className="hidden md:block">
        <DataTableHeader>
          <tr>
            {columns.map((column) => (
              <DataTableHead key={column.key} align={column.numeric ? "right" : "left"}>
                {column.label}
              </DataTableHead>
            ))}
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {rows.map((row) => (
            <DataTableRow key={rowKey(row)}>
              {columns.map((column) => (
                <DataTableCell key={column.key} numeric={column.numeric} className={column.className}>
                  {column.render(row)}
                </DataTableCell>
              ))}
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
```

Check: `grep -nE '<table|<thead|<th\b|<td\b|uppercase|bg-muted' src/components/reports/responsive-report-list.tsx` prints nothing (exit 1).

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/reports-adaptive-ui.test.ts tests/report-table-key.test.ts tests/report-idle-activity.test.ts tests/report-controls-ui.test.ts tests/list-primitives-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `tests 115 · pass 115 · fail 0` (reports-adaptive-ui 15 · report-table-key 5 · report-idle-activity 2 · report-controls-ui 4 · list-primitives-ui 19 · list-frame-guards 21 · visual-foundation-guards 26 · form-migration-guards 23).

Run: `node <temp>/p2b1-precheck.mjs --file c/reports/responsive-report-list.tsx`
Expected (exit 0):
```
file    src/components/reports/responsive-report-list.tsx (CRLF) · in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
R7         0       0     0     1
LT1        0       0     0     1
args    (no row holds this file)
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b5-tw-probe.mjs src/components/reports/responsive-report-list.tsx`
Expected: `checked 24 classes, missing 0` (exit 0). No class is new to `src`.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `tests 1995 · pass 1994 · fail 0 · skipped 1` (one test more than the 1994 after Task 10).
- `npx tsc --noEmit`: no errors (`data-report-desktop-table` reaches the frame `<div>` through `DataTable`'s div props).
- `npm run lint`: 0 errors, no new warning; `npx eslint src/components/reports/responsive-report-list.tsx tests/reports-adaptive-ui.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 4 files: the component 29 insertions and 27 deletions, `tests/reports-adaptive-ui.test.ts` 12 and 1, `tests/list-frame-guards.test.ts` 1 and 2 (the `MIGRATED_LIST_FILES` line in; the LT1 row and the `// 2B-5` line it was the last row of out), `tests/visual-foundation-guards.test.ts` 0 and 2 (the row and its `// 2B-5` line). The simulation without Tasks 1–8 shows 1 and 1, and 0 and 1, because the other 2B-5 rows still sit under those comments there. CRLF counts: the component `76 76`, the test `166 166`.

- [ ] **Step 8: Commit**

```bash
git add src/components/reports/responsive-report-list.tsx tests/reports-adaptive-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): wide report lists on DataTable from md, one EmptyNote line when empty (2B-5 task 11)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 18, spec §8.9 row `/th/reports`):** checked with Task 12's views (the tables only show their final columns then): at 1440 and 768, the overview preview, the two accounting tables and the cross-scope preview have the white 13px head in sentence case, about 46px rows, soft row lines, a light fill on hover and gutters in line with the box title; at 768 a wide table scrolls inside its box and the page does not; at 375 the cards are unchanged. A filter that matches nothing shows one faint line in each table's place. NVDA reads each table by its caption (the box title).

---

### Task 12: The four report views · `MetricCard` and the hand-made number boxes become `StatStrip`, counts and money go through `formatCount` and `formatMoney`, codes are tags (four commits, one per file)

Spec §8.9 row 8 (`MetricCard` 14 sites: page 2 · accounting 10 · catalog 1 · operations 1 → `StatStrip`, R-d), §5.6 row "`D/reports/page.tsx` + `c/reports/*`", §5.1 rows "`toLocaleString()`…", "รหัส" (R-p) and "กล่องตัวเลขสรุป", §5.7 (money heads "(บาท)", numbers on the right), §3.13, §9.4.1–9.4.2 rows of the three views (LS2 10 · 1 · 1, LV3 9), §10.4 table C (LS2 15 → 0 with Task 13, LV3 → 6), §10.4 table A row 2B-5 (`reports-adaptive-ui.test.ts:143` only "if the buttons change": they do not, see below) and controller rulings (a), (c) and (e). Four commits in the order of the controller's list: overview, catalog, operations, accounting. Every file is CRLF: exact-string replacements only. The accounting commit also carries two lines of the page (its new `baht` label; see "Departure").

Rulings this task applies:
- **R-d, §3.13:** every number tile is a `StatStrip` cell: no status fill, the value in `text-metric num` (28px), labels 13/20. The catalog's one `MetricCard`, the operations' four data-quality `MetricCard`s and the four hand-made cross-scope boxes (`text-2xl font-bold` numbers in bordered links) become strips; the cells that were links stay links (`href`), with the same drill-down hrefs (`tests/reports-adaptive-ui.test.ts:137-149`, `tests/report-table-key.test.ts:27-34` keep `dataQuality: "…"`, `buildAssetQueryString(filters,` and `crossScope.cards`). The accounting view's ten `MetricCard`s are two strips. LS2: catalog 1, operations 1, accounting 10 → 0.
- **Money tiles never clip (spec silent; plan 2B-4 Task 6 met the same):** a money value in 28px needs about 230px ("12,345,678.00 บาท"). The accounting strips take `moneyStripClasses` (`max-sm:grid-cols-1 lg:grid-flow-row lg:grid-cols-2 lg:grid-rows-none`): one tile a row below 640px and two a row from there, also from lg, where four in a row would leave about 130px a tile at 1024px. Their tile counts are even (4 and 6), so StatStrip's "lone last cell spans the row" rule never meets the one-column phone grid.
- **§5.1, DS:515:** counts go through `formatCount` with `num`; money through `formatMoney` (two decimals): a tile carries `unit: labels.baht` ("บาท"), a table cell the number only with "(บาท)" in its column head (§5.7). LV3: accounting 9 → 0. The ratio stays a percent (`Intl` percent, Thai digits); a ratio with nothing to compare with (`null`) is `Nil` in a table cell and a written-out "—" in a tile, because `StatStripItem.value` is a string.
- **§5.7, §5.6:** the accounting tables set `numeric: true` on their money, ratio and count columns (Task 11's column flag: head and cell on the right, one line, `num`) and pass their box title as `caption`; the overview and cross-scope previews pass theirs too.
- **R-p:** the asset codes the views render by themselves are `<span className="tag font-medium">` inside their links (the overview preview, the operations data-quality list and the cross-scope preview). The codes inside composed strings (`assetTag - name` built by the page) stay text in 2B (§5.1 row "รหัส").
- **§5.6 ("แถวว่าง → EmptyNote"):** the overview and operations breakdown lists show their empty line as `EmptyNote` (13/20 faint, no frame), like Task 11's tables.
- **Kept on purpose:** the operations idle box stays a `<Link href={idleAssetsHref}>` (`tests/report-idle-activity.test.ts:19`), only its number becomes `formatCount` in `text-metric num`; its warning fill is a callout (2D). The hand-written action links of the catalog and operations views (run now, open report, export, open the data-quality rules, open asset, fix data), the "not allowed" chips, the issue, flag and permission pills and the two dashed empty boxes stay as they are: buttons, pills and empty boxes are 2D's (spec §8.11 row 18, A:60-70). So `tests/reports-adaptive-ui.test.ts:143` (`min-h-11` in the operations view) stays unedited, as table A allows.
- **`MIGRATED_LIST_FILES` (the rule of plans 2B-1 to 2B-4):** 2B does not touch the four views again, so each joins `MIGRATED_LIST_FILES` in its commit (every counter 0).
- **Departure (one file = one commit; ruling (c), no new key):** the accounting money heads need "บาท" and the view gets its words from the page. The view's labels gain `baht: string` and its commit adds two page lines: `const tCommon = await getTranslations("common")` and `baht: tCommon("baht")` (the existing `common.baht`). The heads are built in the view as `` `${label} (${unit})` `` ("ค่าซ่อม (บาท)", "Repair cost (THB)"), the pattern of the existing `asset.purchasePriceBaht` and `repairRecord.cost`, with no new message key.

What users will see on `/th/reports`:
- ภาพรวม: counts in the six breakdown cards read "1,234" in tabular figures; asset codes in the preview are monospace; an empty breakdown is one faint line.
- คลังรายงาน: "รายการในคลังรายงาน" is one flat tile (at most 384px wide from 640px) instead of a bordered card.
- การปฏิบัติงาน: the four data-quality numbers and the four cross-scope numbers are two flat strips (two columns below 1024px, one row from there); each tile still opens the register with its filter, a chevron shows on hover; the idle-asset number uses the same 28px metric figures; codes are monospace.
- บัญชี: the cost totals and the accounting totals are two flat strips, two tiles a row (one a row on phones); money reads "12,345.67 บาท" instead of "฿12,345.67"; the tables' money heads read "ค่าซ่อม (บาท)", "ราคาซื้อ (บาท)", "มูลค่าตามบัญชี (บาท)", "ค่าเสื่อมสะสม (บาท)" with plain numbers right-aligned below; an unknown price or ratio reads "—" (screen readers: "ไม่มีข้อมูล").

Not in this task: the page's header, chips and shared numbers (Task 13) · `report-preset-controls.tsx` (2C plan 4's) · the 2D items above · docs (Task 19). Do not run a formatter.

**Files:**
- Modify (commit 1): `src/components/reports/reports-overview-view.tsx` (`i/lf w/crlf`; 4 exact replacements)
- Modify (commit 2): `src/components/reports/reports-catalog-view.tsx` (`i/lf w/crlf`; 2 exact replacements)
- Modify (commit 3): `src/components/reports/reports-operations-view.tsx` (`i/lf w/crlf`; 8 exact replacements)
- Modify (commit 4): `src/components/reports/reports-accounting-view.tsx` (`i/lf w/crlf`; 9 exact replacements) and `src/app/[locale]/(dashboard)/reports/page.tsx` (`i/lf w/crlf`; 2 exact replacements, one line added by each)
- Modify (every commit): `tests/reports-adaptive-ui.test.ts` (`i/lf w/crlf`; one appended block per commit), `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only: `t12a-block.ts`, `t12b-block.ts`, `t12c-block.ts`, `t12d-block.ts`

**Must keep passing without edits:**
- `tests/reports-adaptive-ui.test.ts:67-74` (`hasMatchingAssets: boolean`, `selectReportEmptyCopy`, three `hasMatchingAssets={totalAssets > 0}` in the page), `:76-81` (the catalog row keys), `:91-93` (one, two and one `<ResponsiveReportList`), `:102-111` (`mobileClassName: "col-span-2"` twice in the overview and the accounting view, and in the cross-scope asset column), `:113-123` (the cross-scope asset link class string), `:125-135` (the data-quality code link class string), `:137-149` (the four `dataQuality: "…"`, `activity: "idle_180d"`, `buildAssetQueryString(filters,`, `min-h-11`), `:151-155`
- `tests/report-table-key.test.ts` (`rows.map((row) =>` and `key={row.key}` in the overview, `rowKey={(asset) => asset.id}` once, twice and once, `crossScope.cards`, `CrossScopePreviewTable`, `row.href`, `min-h-11`) · `tests/report-idle-activity.test.ts` (`<Link href={idleAssetsHref}`) · `tests/reports-localization.test.ts` (the catalog's four labels in order; every `t("…")` of the page) · `tests/report-presets.test.ts` · `tests/report-query-scope.test.ts` · `tests/performance-route-instrumentation.test.ts`
- `tests/design-system.test.ts` · `tests/list-primitives-ui.test.ts` (the `StatStrip` strings) · `tests/visual-foundation-guards.test.ts:185-203` (`text-metric` with `num`; `tag` with no weight above 500) · `tests/form-migration-guards.test.ts`

**Interfaces:**
- Consumes:
  - 2B-1: `StatStrip({ items: readonly StatStripItem[], className?: string })` with `StatStripItem = { key: string; label: string; value: string; unit?: string; foot?; footTitle?; href?: string; current?; scroll?; attention? }` from `@/components/ui/stat-strip` (two columns below lg, a lone last cell spans its row; `className` goes through `cn()`, so `lg:grid-cols-2` replaces its `lg:grid-cols-none`); `EmptyNote` from `@/components/ui/empty-note`.
  - 2A: `formatCount(value: number): string`, `formatMoney(value: number): string` and `formatMoney(value: number | null | undefined): string | null` from `@/lib/display-format`; `orNil(value, label?)` from `@/components/ui/nil`.
  - Task 11: `ResponsiveReportColumn.numeric?: boolean` and `ResponsiveReportList`'s `caption?: string`.
  - Task 9's `<temp>/p2b5-t9-precheck.mjs`; Task 1's `<temp>/p2b5-append.mjs`, `<temp>/p2b5-tw-probe.mjs`; Task 0's guard scripts.
- Produces:
  - `ReportsAccountingLabels.baht: string` (required); the page passes `tCommon("baht")` and has `const tCommon = await getTranslations("common")` (Task 13 uses it for the shared total).
  - No view imports `@/components/ui/metric-card`; the page is its last caller (Task 13 deletes it). `getMetricCardToneClasses` still has `metric-card.tsx` as its one caller until then.
  - The four views in `MIGRATED_LIST_FILES`; LFG `BUDGETS.LS2` without the three view rows, `BUDGETS.LV3` without the accounting row; four tests in `tests/reports-adaptive-ui.test.ts`.

| guard | before → after | plan total (budget) before → after |
|---|---|---|
| LFG LS2 | catalog 1 · operations 1 · accounting 10 → – | 15 in 5 rows → 3 in 2 (the page 2, Task 13's; `D/work-center/page.tsx` 1, Task 15's) |
| LFG LV3 | accounting 9 → – | 16 in 4 rows → 7 in 3 (the page 1, Task 13's; the two print pages' `KEEP` 6) |
| `MIGRATED_LIST_FILES` | the four views join | +4 |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b5-t9-precheck.mjs 12`
Expected: `git status` prints nothing. The script prints the six `ok` lines of the shared parts and the keys, then (exit 0):
```
ok      Task 9 is in
ok      Task 10 is in
ok      Task 11 is in
ok      Task 12 has not run yet
ok      src/components/reports/reports-overview-view.tsx holds the text this task starts from (hash c0eb941d870abc71)
ok      src/components/reports/reports-catalog-view.tsx holds the text this task starts from (hash 1d7083b111a6e1d5)
ok      src/components/reports/reports-operations-view.tsx holds the text this task starts from (hash f9375bf061c86b51)
ok      src/components/reports/reports-accounting-view.tsx holds the text this task starts from (hash 25c50a4501ed4430)
ok      src/app/[locale]/(dashboard)/reports/page.tsx holds the text this task starts from (hash 80e360958a81f0de)
ok      tests/reports-adaptive-ui.test.ts holds the text this task starts from (hash ca5ac4c50ea556ff)
info    src/components/reports/reports-overview-view.tsx: CRLF
info    src/components/reports/reports-catalog-view.tsx: CRLF
info    src/components/reports/reports-operations-view.tsx: CRLF
info    src/components/reports/reports-accounting-view.tsx: CRLF
info    src/app/[locale]/(dashboard)/reports/page.tsx: CRLF
info    tests/reports-adaptive-ui.test.ts: CRLF
preconditions hold for Task 12
```

Run: `node <temp>/p2b1-precheck.mjs --file <view>` for the four views.
Expected (after the header lines; exit 0 each): `c/reports/reports-overview-view.tsx`: `args    (no row holds this file)` · `c/reports/reports-catalog-view.tsx`: `LS2        1       1     0     1` and `args    LS2=1:1` · `c/reports/reports-operations-view.tsx`: `LS2        1       1     0     1` and `args    LS2=1:1` · `c/reports/reports-accounting-view.tsx`: `LV3        9       9     0     9`, `LS2       10      10     0    10` and `args    LV3=9:9 LS2=10:10`. Each prints `(CRLF) · not in MIGRATED_LIST_FILES`.

Run: `git ls-files --eol src/components/reports/reports-overview-view.tsx src/components/reports/reports-catalog-view.tsx src/components/reports/reports-operations-view.tsx src/components/reports/reports-accounting-view.tsx "src/app/[[]locale]/(dashboard)/reports/page.tsx" tests/reports-adaptive-ui.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf w/crlf` for all seven.

Every commit below runs the same set of tests in its "run" step:

`node --test tests/reports-adaptive-ui.test.ts tests/report-table-key.test.ts tests/report-idle-activity.test.ts tests/reports-localization.test.ts tests/report-presets.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts`

(report-table-key 5 · report-idle-activity 2 · reports-localization 4 · report-presets 9 · list-frame-guards 21 · visual-foundation-guards 26 · form-migration-guards 23 = 90, plus reports-adaptive-ui, which grows by one test a commit.)

#### Commit 1 of 4: `c/reports/reports-overview-view.tsx`

- [ ] **Step 2: Write the failing test (`tests/reports-adaptive-ui.test.ts`, CRLF, read raw)**

Save this block as `<temp>/t12a-block.ts`:

```ts
// Plan 2B-5 Task 12 (spec 2B §5.6, §5.1, R-p): the overview counts go through formatCount with tabular figures, the
// asset code is a tag, the preview table is named by its panel title, and an empty breakdown is one EmptyNote line.
test("the report overview formats its counts and codes and names its preview table (spec 2B §5.6)", () => {
  assert.match(overviewView, /caption=\{labels\.previewTitle\}/)
  assert.match(overviewView, /<span className="tag font-medium">\{asset\.assetTag\}<\/span>/)
  assert.match(overviewView, /<span className="font-semibold text-foreground num">\{formatCount\(row\.count\)\}<\/span>/)
  assert.match(overviewView, /<EmptyNote>\{emptyLabel\}<\/EmptyNote>/)
  assert.doesNotMatch(overviewView, /toLocaleString/)
})
```

Run: `node <temp>/p2b5-append.mjs <temp>/t12a-block.ts tests/reports-adaptive-ui.test.ts`
Expected: `appended <temp>/t12a-block.ts to tests/reports-adaptive-ui.test.ts (CRLF)`

Run: `node --test tests/reports-adaptive-ui.test.ts`
Expected: FAIL, `tests 16 · pass 15 · fail 1`: `the report overview formats its counts and codes and names its preview table (spec 2B §5.6)`: the input did not match the regular expression `/caption=\{labels\.previewTitle\}/`

- [ ] **Step 3: Add the file to `MIGRATED_LIST_FILES`**

The overview has no guard row (it renders no `MetricCard`); 2B is done with it after this commit.

Run: `node <temp>/p2b-budget.mjs c/reports/reports-overview-view.tsx --migrated`
Expected (exit 0):
```
MIGRATED_LIST_FILES: added
written: src/components/reports/reports-overview-view.tsx
```
`node --test tests/list-frame-guards.test.ts` still passes (`tests 21 · pass 21`): the file has nothing L0 would count.

- [ ] **Step 4: Move the overview (`src/components/reports/reports-overview-view.tsx`, CRLF)**

Four exact replacements, top to bottom.

(1) Imports (`:1-3`). Replace:

```tsx
import Link from "next/link"
import { ResponsiveReportList } from "@/components/reports/responsive-report-list"
import { selectReportEmptyCopy } from "@/lib/report-empty-state"
```

with:

```tsx
import Link from "next/link"
import { ResponsiveReportList } from "@/components/reports/responsive-report-list"
import { EmptyNote } from "@/components/ui/empty-note"
import { formatCount } from "@/lib/display-format"
import { selectReportEmptyCopy } from "@/lib/report-empty-state"
```

(2) The preview table gets its caption (`:84-87`). Replace:

```tsx
        <ResponsiveReportList
          rows={previewRows}
          rowKey={(asset) => asset.id}
          emptyLabel={emptyLabel}
```

with:

```tsx
        <ResponsiveReportList
          rows={previewRows}
          rowKey={(asset) => asset.id}
          emptyLabel={emptyLabel}
          caption={labels.previewTitle}
```

(3) The preview's asset code (`:99-100`). Replace:

```tsx
                  {asset.assetTag}
                </Link>
```

with:

```tsx
                  <span className="tag font-medium">{asset.assetTag}</span>
                </Link>
```

(4) The breakdown card's empty line and count (`:137-146`, in `function ReportTable`). Replace:

```tsx
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">{emptyLabel}</div>
        ) : (
          rows.map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-muted-foreground">{row.label}</span>
              <span className="font-semibold text-foreground">{row.count.toLocaleString("th-TH")}</span>
            </div>
          ))
        )}
```

with:

```tsx
        {rows.length === 0 ? (
          <EmptyNote>{emptyLabel}</EmptyNote>
        ) : (
          rows.map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-muted-foreground">{row.label}</span>
              <span className="font-semibold text-foreground num">{formatCount(row.count)}</span>
            </div>
          ))
        )}
```

- [ ] **Step 5: Run the tests, prove the classes, full verification and commit**

Run the set above. Expected: PASS, `tests 106 · pass 106 · fail 0` (reports-adaptive-ui 16).

Run: `node <temp>/p2b1-precheck.mjs --file c/reports/reports-overview-view.tsx`
Expected: `(CRLF) · in MIGRATED_LIST_FILES` and `args    (no row holds this file)` (exit 0).

Run: `node <temp>/p2b5-tw-probe.mjs src/components/reports/reports-overview-view.tsx`
Expected: `checked 48 classes, missing 0` (exit 0).

Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: `tests 1996 · pass 1995 · fail 0 · skipped 1` (one test more than the 1995 after Task 11); tsc clean; lint 0 errors, no new warning (`npx eslint src/components/reports/reports-overview-view.tsx tests/reports-adaptive-ui.test.ts` prints nothing).

Run: `git diff --stat`. Expected: 3 files: the view 6 insertions and 3 deletions, `tests/reports-adaptive-ui.test.ts` 10 and 0, `tests/list-frame-guards.test.ts` 1 and 0. CRLF counts: the view `153 153`, the test `176 176`.

```bash
git add src/components/reports/reports-overview-view.tsx tests/reports-adaptive-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): report overview counts through formatCount, codes as tags, a named preview table (2B-5 task 12)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit; `git status --short src tests messages` prints nothing.

#### Commit 2 of 4: `c/reports/reports-catalog-view.tsx`

- [ ] **Step 6: Write the failing test**

Save this block as `<temp>/t12b-block.ts`:

```ts
// Plan 2B-5 Task 12 (spec 2B §5.6, R-d): the catalog's one number is a StatStrip cell, at most 384px wide from sm (the
// old card took half the row), and its count goes through formatCount.
test("the report catalog shows its item count on StatStrip (spec 2B §5.6, R-d)", () => {
  assert.match(catalogView, /<StatStrip className="sm:max-w-sm" items=\{\[\{ key: "catalogItems", label: labels\.catalogItems, value: formatCount\(reportCount\) \}\]\} \/>/)
  assert.doesNotMatch(catalogView, /MetricCard|toLocaleString/)
})
```

Run: `node <temp>/p2b5-append.mjs <temp>/t12b-block.ts tests/reports-adaptive-ui.test.ts`
Expected: `appended <temp>/t12b-block.ts to tests/reports-adaptive-ui.test.ts (CRLF)`

Run: `node --test tests/reports-adaptive-ui.test.ts`
Expected: FAIL, `tests 17 · pass 16 · fail 1`: `the report catalog shows its item count on StatStrip (spec 2B §5.6, R-d)`: the input did not match the regular expression `/<StatStrip className="sm:max-w-sm" items=\{\[\{ key: "catalogItems", label: labels\.catalogItems, value: formatCount\(reportCount\) \}\]\} \/>/`

- [ ] **Step 7: Lower the guard row (the failing guards)**

Run: `node <temp>/p2b-budget.mjs c/reports/reports-catalog-view.tsx LS2=1:0 --migrated`
Expected (exit 0): `LS2: 1 -> 0 (row deleted)`, `MIGRATED_LIST_FILES: added`, `written: src/components/reports/reports-catalog-view.tsx`.

Run: `node --test tests/list-frame-guards.test.ts`
Expected: FAIL, `tests 21 · pass 19 · fail 2`: `LS2 MetricCard gives way to StatStrip` (`LS2: 15 in 5 files. …`, the one line `src/components/reports/reports-catalog-view.tsx: 1 > 0`) and `L0 …` (the one line `LS2 src/components/reports/reports-catalog-view.tsx: 1 > 0`).

- [ ] **Step 8: Move the catalog (`src/components/reports/reports-catalog-view.tsx`, CRLF)**

Two exact replacements.

(1) Imports (`:4-5`). Replace:

```tsx
import { ReportPresetControls } from "@/components/reports/report-preset-controls"
import { MetricCard } from "@/components/ui/metric-card"
```

with:

```tsx
import { ReportPresetControls } from "@/components/reports/report-preset-controls"
import { StatStrip } from "@/components/ui/stat-strip"
import { formatCount } from "@/lib/display-format"
```

(2) The count tile (`:93-95`). Replace:

```tsx
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MetricCard label={labels.catalogItems} value={reportCount.toLocaleString("th-TH")} />
      </div>
```

with:

```tsx
      <StatStrip className="sm:max-w-sm" items={[{ key: "catalogItems", label: labels.catalogItems, value: formatCount(reportCount) }]} />
```

- [ ] **Step 9: Run the tests, prove the classes, full verification and commit**

Run the set above. Expected: PASS, `tests 107 · pass 107 · fail 0` (reports-adaptive-ui 17).

Run: `node <temp>/p2b1-precheck.mjs --file c/reports/reports-catalog-view.tsx`
Expected: `(CRLF) · in MIGRATED_LIST_FILES`, `LS2        0       0     0     1`, `args    (no row holds this file)` (exit 0).

Run: `SHOW=sm:max-w-sm node <temp>/p2b5-tw-probe.mjs src/components/reports/reports-catalog-view.tsx`
Expected (exit 0):
```
checked 74 classes, missing 0
sm:max-w-sm -> .sm\:max-w-sm { @media (width >= 40rem) { max-width: var(--container-sm); } }
```

Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: `tests 1997 · pass 1996 · fail 0 · skipped 1` (one test more than the 1996 after commit 1); tsc clean; lint 0 errors, no new warning.

Run: `git diff --stat`. Expected: 3 files: the view 3 insertions and 4 deletions, the test 7 and 0, `tests/list-frame-guards.test.ts` 1 and 1. CRLF counts: the view `228 228`, the test `183 183`.

```bash
git add src/components/reports/reports-catalog-view.tsx tests/reports-adaptive-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): report catalog count on StatStrip (2B-5 task 12)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit; `git status --short src tests messages` prints nothing.

#### Commit 3 of 4: `c/reports/reports-operations-view.tsx`

- [ ] **Step 10: Write the failing test**

Save this block as `<temp>/t12c-block.ts`:

```ts
// Plan 2B-5 Task 12 (spec 2B §5.6, §5.1, R-d, R-p): the four data-quality counts and the four cross-scope counts are
// linked StatStrip cells (each still opens the register with its filter), the idle count is a metric number, the codes
// are tags and the counts go through formatCount. The idle box stays a link (tests/report-idle-activity.test.ts).
test("report operations put the data-quality and cross-scope counts on linked StatStrips (spec 2B §5.6, R-d)", () => {
  assert.match(operationsView, /<StatStrip items=\{dataQualityCards\.map\(\(card\) => \(\{ key: card\.key, label: card\.label, value: formatCount\(card\.value\), href: card\.href \}\)\)\} \/>/)
  assert.match(operationsView, /<StatStrip items=\{crossScope\.cards\.map\(\(card\) => \(\{ key: card\.key, label: card\.label, value: formatCount\(card\.value\), href: card\.href \}\)\)\} \/>/)
  assert.match(operationsView, /caption=\{labels\.crossScopePreviewTitle\}/)
  assert.equal(operationsView.match(/<span className="tag font-medium">\{asset\.assetTag\}<\/span>/g)?.length, 2)
  assert.match(operationsView, /<div className="mt-2 text-metric num text-foreground">\{formatCount\(insights\.idleAssetsCount\)\}<\/div>/)
  assert.doesNotMatch(operationsView, /MetricCard|toLocaleString|text-2xl font-bold/)
})
```

Run: `node <temp>/p2b5-append.mjs <temp>/t12c-block.ts tests/reports-adaptive-ui.test.ts`
Expected: `appended <temp>/t12c-block.ts to tests/reports-adaptive-ui.test.ts (CRLF)`

Run: `node --test tests/reports-adaptive-ui.test.ts`
Expected: FAIL, `tests 18 · pass 17 · fail 1`: `report operations put the data-quality and cross-scope counts on linked StatStrips (spec 2B §5.6, R-d)`: the input did not match the regular expression `/<StatStrip items=\{dataQualityCards\.map\(\(card\) => \(\{ key: card\.key, label: card\.label, value: formatCount\(card\.value\), href: card\.href \}\)\)\} \/>/`

- [ ] **Step 11: Lower the guard row (the failing guards)**

Run: `node <temp>/p2b-budget.mjs c/reports/reports-operations-view.tsx LS2=1:0 --migrated`
Expected (exit 0): `LS2: 1 -> 0 (row deleted)`, `MIGRATED_LIST_FILES: added`, `written: src/components/reports/reports-operations-view.tsx`.

Run: `node --test tests/list-frame-guards.test.ts`
Expected: FAIL, `tests 21 · pass 19 · fail 2`: `LS2 …` (`LS2: 14 in 4 files. …`, the one line `src/components/reports/reports-operations-view.tsx: 1 > 0`) and `L0 …` (the one line `LS2 src/components/reports/reports-operations-view.tsx: 1 > 0`).

- [ ] **Step 12: Move the operations view (`src/components/reports/reports-operations-view.tsx`, CRLF)**

Eight exact replacements, top to bottom.

(1) Imports (`:3-9`): `MetricCard` goes; `EmptyNote`, `StatStrip` and `formatCount` come in. Replace:

```tsx
import { ResponsiveReportList } from "@/components/reports/responsive-report-list"
import { MetricCard } from "@/components/ui/metric-card"
import { buildAssetQueryString } from "@/lib/asset-list-query"
import type { parseAssetListParams } from "@/lib/asset-list-query"
import type { AssetCrossScopeSummaryRow } from "@/lib/asset-cross-scope"
import { getAssetCrossScopeFlagLabels } from "@/lib/asset-cross-scope-filter"
import { selectReportEmptyCopy } from "@/lib/report-empty-state"
```

with:

```tsx
import { ResponsiveReportList } from "@/components/reports/responsive-report-list"
import { EmptyNote } from "@/components/ui/empty-note"
import { StatStrip } from "@/components/ui/stat-strip"
import { buildAssetQueryString } from "@/lib/asset-list-query"
import type { parseAssetListParams } from "@/lib/asset-list-query"
import type { AssetCrossScopeSummaryRow } from "@/lib/asset-cross-scope"
import { getAssetCrossScopeFlagLabels } from "@/lib/asset-cross-scope-filter"
import { formatCount } from "@/lib/display-format"
import { selectReportEmptyCopy } from "@/lib/report-empty-state"
```

(2) The four data-quality tiles (`:142-152`). Replace:

```tsx
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {dataQualityCards.map((card) => (
            <Link
              key={card.key}
              href={card.href}
              className="block min-h-11 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <MetricCard label={card.label} value={card.value.toLocaleString("th-TH")} className="h-full transition-colors hover:bg-accent" compact />
            </Link>
          ))}
        </div>
```

with:

```tsx
        <StatStrip items={dataQualityCards.map((card) => ({ key: card.key, label: card.label, value: formatCount(card.value), href: card.href }))} />
```

(3) The four cross-scope boxes (`:171-178`). Replace:

```tsx
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {crossScope.cards.map((card) => (
            <Link key={card.key} href={card.href} className="min-h-11 rounded-md border border-border bg-background p-4 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <div className="text-sm text-muted-foreground">{card.label}</div>
              <div className="mt-2 text-2xl font-bold text-foreground">{card.value.toLocaleString("th-TH")}</div>
            </Link>
          ))}
        </div>
```

with:

```tsx
        <StatStrip items={crossScope.cards.map((card) => ({ key: card.key, label: card.label, value: formatCount(card.value), href: card.href }))} />
```

(4) The data-quality row's asset code (`:203-205`; the link's class string is pinned by `tests/reports-adaptive-ui.test.ts:125-135` and stays). Replace:

```tsx
                      <Link href={`/${locale}/assets/${asset.id}`} className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline md:min-h-0">
                        {asset.assetTag}
                      </Link>
```

with:

```tsx
                      <Link href={`/${locale}/assets/${asset.id}`} className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline md:min-h-0">
                        <span className="tag font-medium">{asset.assetTag}</span>
                      </Link>
```

(5) The idle-asset number (`:245`; the box stays a `<Link href={idleAssetsHref}>`). Replace:

```tsx
              <div className="mt-2 text-2xl font-bold text-foreground">{insights.idleAssetsCount.toLocaleString("th-TH")}</div>
```

with:

```tsx
              <div className="mt-2 text-metric num text-foreground">{formatCount(insights.idleAssetsCount)}</div>
```

(6) The cross-scope preview gets its caption (`:268-271`). Replace:

```tsx
      <ResponsiveReportList
        rows={rows}
        rowKey={(asset) => asset.id}
        emptyLabel={emptyLabel}
```

with:

```tsx
      <ResponsiveReportList
        rows={rows}
        rowKey={(asset) => asset.id}
        emptyLabel={emptyLabel}
        caption={labels.crossScopePreviewTitle}
```

(7) The cross-scope preview's asset code (`:284-286`; the link's class string, pinned by `tests/reports-adaptive-ui.test.ts:113-123`, stays). Replace:

```tsx
                  {asset.assetTag}
                </Link>
                <div className="text-xs font-normal text-muted-foreground md:mt-1">{asset.name}</div>
```

with:

```tsx
                  <span className="tag font-medium">{asset.assetTag}</span>
                </Link>
                <div className="text-xs font-normal text-muted-foreground md:mt-1">{asset.name}</div>
```

(8) The insight card's empty line and count (`:346-353`, in `function ReportTable`). Replace:

```tsx
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">{emptyLabel}</div>
        ) : (
          rows.map((row) => {
            const content = (
              <>
                <span className="truncate text-muted-foreground">{row.label}</span>
                <span className="font-semibold text-foreground">{row.count.toLocaleString("th-TH")}</span>
```

with:

```tsx
        {rows.length === 0 ? (
          <EmptyNote>{emptyLabel}</EmptyNote>
        ) : (
          rows.map((row) => {
            const content = (
              <>
                <span className="truncate text-muted-foreground">{row.label}</span>
                <span className="font-semibold text-foreground num">{formatCount(row.count)}</span>
```

Check: `grep -nE 'MetricCard|toLocaleString|text-2xl font-bold' src/components/reports/reports-operations-view.tsx` prints nothing (exit 1).

- [ ] **Step 13: Run the tests, prove the classes, full verification and commit**

Run the set above. Expected: PASS, `tests 108 · pass 108 · fail 0` (reports-adaptive-ui 18).

Run: `node <temp>/p2b1-precheck.mjs --file c/reports/reports-operations-view.tsx`
Expected: `(CRLF) · in MIGRATED_LIST_FILES`, `LS2        0       0     0     1`, `args    (no row holds this file)` (exit 0).

Run: `node <temp>/p2b5-tw-probe.mjs src/components/reports/reports-operations-view.tsx`
Expected: `checked 91 classes, missing 0` (exit 0). No class is new to `src`.

Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: `tests 1998 · pass 1997 · fail 0 · skipped 1` (one test more than the 1997 after commit 2); tsc clean; lint 0 errors, no new warning (`Link` is still imported and used).

Run: `git diff --stat`. Expected: 3 files: the view 11 insertions and 25 deletions, the test 12 and 0, `tests/list-frame-guards.test.ts` 1 and 1. CRLF counts: the view `361 361`, the test `195 195`.

```bash
git add src/components/reports/reports-operations-view.tsx tests/reports-adaptive-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): report operations counts on linked StatStrips, codes as tags (2B-5 task 12)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit; `git status --short src tests messages` prints nothing.

#### Commit 4 of 4: `c/reports/reports-accounting-view.tsx` (and the page's `baht` label)

- [ ] **Step 14: Write the failing test**

Save this block as `<temp>/t12d-block.ts`:

```ts
// Plan 2B-5 Task 12 (spec 2B §5.6, §5.7, R-d): the ten accounting cards are two StatStrips, money in formatMoney with
// "บาท" as the unit, never more than two tiles a row; the two tables put "(บาท)" in their money heads, numbers on the
// right, and an unknown price or ratio is Nil. The page hands the view common.baht.
test("report accounting puts its totals on StatStrip and its money through formatMoney (spec 2B §5.6, §5.7, R-d)", () => {
  assert.equal(accountingView.match(/<StatStrip\b/g)?.length, 2)
  assert.equal(accountingView.match(/className=\{moneyStripClasses\}/g)?.length, 2)
  assert.match(accountingView, /const moneyStripClasses = "max-sm:grid-cols-1 lg:grid-flow-row lg:grid-cols-2 lg:grid-rows-none"/)
  assert.equal(accountingView.match(/unit: labels\.baht \}/g)?.length, 5)
  assert.match(accountingView, /repairCost: moneyHead\(labels\.repairCost, labels\.baht\)/)
  assert.match(accountingView, /render: \(asset\) => orNil\(formatMoney\(asset\.purchasePrice\)\)/)
  assert.equal(accountingView.match(/numeric: true/g)?.length, 9)
  assert.equal(accountingView.match(/caption=\{title\}/g)?.length, 2)
  assert.doesNotMatch(accountingView, /MetricCard|formatCurrency|toLocaleString|"-"/)
  assert.match(page, /baht: tCommon\("baht"\)/)
})
```

Run: `node <temp>/p2b5-append.mjs <temp>/t12d-block.ts tests/reports-adaptive-ui.test.ts`
Expected: `appended <temp>/t12d-block.ts to tests/reports-adaptive-ui.test.ts (CRLF)`

Run: `node --test tests/reports-adaptive-ui.test.ts`
Expected: FAIL, `tests 19 · pass 18 · fail 1`: `report accounting puts its totals on StatStrip and its money through formatMoney (spec 2B §5.6, §5.7, R-d)`: `Expected values to be strictly equal` (`actual: undefined`, `expected: 2`, the count of `<StatStrip`).

- [ ] **Step 15: Lower the guard rows (the failing guards)**

Run: `node <temp>/p2b-budget.mjs c/reports/reports-accounting-view.tsx LV3=9:0 LS2=10:0 --migrated`
Expected (exit 0):
```
LV3: 9 -> 0 (row deleted)
LS2: 10 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/components/reports/reports-accounting-view.tsx
```

Run: `node --test tests/list-frame-guards.test.ts`
Expected: FAIL, `tests 21 · pass 18 · fail 3`: `LV3 money on screen goes through formatMoney, not formatCurrency` (`LV3: 16 in 4 files. …`, `src/components/reports/reports-accounting-view.tsx: 9 > 0`), `LS2 …` (`LS2: 13 in 3 files. …`, `…/reports-accounting-view.tsx: 10 > 0`) and `L0 …` (`LV3 …/reports-accounting-view.tsx: 9 > 0` and `LS2 …/reports-accounting-view.tsx: 10 > 0`).

- [ ] **Step 16: Move the accounting view (`src/components/reports/reports-accounting-view.tsx`, CRLF) and give it "บาท" (`src/app/[locale]/(dashboard)/reports/page.tsx`, CRLF)**

Eleven exact replacements: (1)–(9) in the view, top to bottom, (10)–(11) in the page.

(1) Imports (`:1-8`): `MetricCard` and `formatCurrency` go. Replace:

```tsx
import Link from "next/link"
import { ResponsiveReportList } from "@/components/reports/responsive-report-list"
import { ContentPanel } from "@/components/ui/content-panel"
import { MetricCard } from "@/components/ui/metric-card"
import type { DepreciationSummary, DepreciableAsset } from "@/lib/asset-depreciation"
import type { CostExposureAsset, CostInsightSummary } from "@/lib/cost-insights"
import { selectReportEmptyCopy } from "@/lib/report-empty-state"
import { formatCurrency } from "@/lib/utils"
```

with:

```tsx
import Link from "next/link"
import { ResponsiveReportList } from "@/components/reports/responsive-report-list"
import { ContentPanel } from "@/components/ui/content-panel"
import { orNil } from "@/components/ui/nil"
import { StatStrip } from "@/components/ui/stat-strip"
import type { DepreciationSummary, DepreciableAsset } from "@/lib/asset-depreciation"
import type { CostExposureAsset, CostInsightSummary } from "@/lib/cost-insights"
import { formatCount, formatMoney } from "@/lib/display-format"
import { selectReportEmptyCopy } from "@/lib/report-empty-state"
```

(2) The `baht` label and the money-strip classes (`:37-40`). Replace:

```tsx
  noAssets: string
}

export type ReportsAccountingViewProps = {
```

with:

```tsx
  noAssets: string
  // common.baht: the unit of the money tiles and of the money column heads.
  baht: string
}

// A money tile in the 28px metric size needs about 230px ("12,345,678.00 บาท"): one tile a row below sm and two a row
// from sm. Four in a row would leave about 130px a tile at 1024px, so these strips never take StatStrip's one-row lg.
const moneyStripClasses = "max-sm:grid-cols-1 lg:grid-flow-row lg:grid-cols-2 lg:grid-rows-none"

export type ReportsAccountingViewProps = {
```

(3) The cost tiles (`:62-67`). Replace:

```tsx
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label={labels.totalRepair} value={formatCurrency(costInsights.totalRepairCost)} compact />
          <MetricCard label={labels.repairRatio} value={formatPercent(costInsights.repairToPurchaseRatio)} compact />
          <MetricCard label={labels.missingPrice} value={costInsights.missingPurchasePriceCount.toLocaleString("th-TH")} compact />
          <MetricCard label={labels.highValueAssets} value={costInsights.highValueAssetCount.toLocaleString("th-TH")} compact />
        </div>
```

with:

```tsx
        <StatStrip
          className={moneyStripClasses}
          items={[
            { key: "totalRepair", label: labels.totalRepair, value: formatMoney(costInsights.totalRepairCost), unit: labels.baht },
            // No purchase value to compare with: the ratio has no value. A tile takes text, so the dash is written out.
            { key: "repairRatio", label: labels.repairRatio, value: formatPercent(costInsights.repairToPurchaseRatio) ?? "—" },
            { key: "missingPrice", label: labels.missingPrice, value: formatCount(costInsights.missingPurchasePriceCount) },
            { key: "highValueAssets", label: labels.highValueAssets, value: formatCount(costInsights.highValueAssetCount) },
          ]}
        />
```

(4) The risk table's money heads (`:74-75`). Replace:

```tsx
            repairCost: labels.repairCost,
            purchasePrice: labels.purchasePrice,
```

with:

```tsx
            repairCost: moneyHead(labels.repairCost, labels.baht),
            purchasePrice: moneyHead(labels.purchasePrice, labels.baht),
```

(5) The accounting tiles (`:89-96`). Replace:

```tsx
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard label={labels.acquisitionCost} value={formatCurrency(depreciationSummary.totalAcquisitionCost)} compact />
          <MetricCard label={labels.residualValue} value={formatCurrency(depreciationSummary.totalResidualValue)} compact />
          <MetricCard label={labels.accumulatedDepreciation} value={formatCurrency(depreciationSummary.totalAccumulatedDepreciation)} compact />
          <MetricCard label={labels.netBookValue} value={formatCurrency(depreciationSummary.totalNetBookValue)} compact />
          <MetricCard label={labels.fullyDepreciated} value={depreciationSummary.fullyDepreciatedCount.toLocaleString("th-TH")} compact />
          <MetricCard label={labels.missingInfo} value={depreciationSummary.missingAccountingInfoCount.toLocaleString("th-TH")} compact />
        </div>
```

with:

```tsx
        <StatStrip
          className={moneyStripClasses}
          items={[
            { key: "acquisitionCost", label: labels.acquisitionCost, value: formatMoney(depreciationSummary.totalAcquisitionCost), unit: labels.baht },
            { key: "residualValue", label: labels.residualValue, value: formatMoney(depreciationSummary.totalResidualValue), unit: labels.baht },
            { key: "accumulatedDepreciation", label: labels.accumulatedDepreciation, value: formatMoney(depreciationSummary.totalAccumulatedDepreciation), unit: labels.baht },
            { key: "netBookValue", label: labels.netBookValue, value: formatMoney(depreciationSummary.totalNetBookValue), unit: labels.baht },
            { key: "fullyDepreciated", label: labels.fullyDepreciated, value: formatCount(depreciationSummary.fullyDepreciatedCount) },
            { key: "missingInfo", label: labels.missingInfo, value: formatCount(depreciationSummary.missingAccountingInfoCount) },
          ]}
        />
```

(6) The book-value table's money heads (`:103-104`). Replace:

```tsx
            bookValue: labels.bookValue,
            accumulated: labels.accumulatedDepreciation,
```

with:

```tsx
            bookValue: moneyHead(labels.bookValue, labels.baht),
            accumulated: moneyHead(labels.accumulatedDepreciation, labels.baht),
```

(7) The risk table's columns and caption (`:161-166`, in `function CostExposureTable`). Replace:

```tsx
          { key: "repairCost", label: labels.repairCost, className: "whitespace-nowrap text-muted-foreground", render: (asset) => formatCurrency(asset.repairCost) },
          { key: "purchasePrice", label: labels.purchasePrice, className: "whitespace-nowrap text-muted-foreground", render: (asset) => formatCurrency(asset.purchasePrice) },
          { key: "ratio", label: labels.ratio, className: "whitespace-nowrap text-muted-foreground", render: (asset) => formatPercent(asset.repairToPurchaseRatio) },
          { key: "repairCount", label: labels.repairCount, className: "whitespace-nowrap text-muted-foreground", render: (asset) => asset.repairCount.toLocaleString("th-TH") },
        ]}
      />
```

with:

```tsx
          { key: "repairCost", label: labels.repairCost, numeric: true, className: "text-muted-foreground", render: (asset) => formatMoney(asset.repairCost) },
          { key: "purchasePrice", label: labels.purchasePrice, numeric: true, className: "text-muted-foreground", render: (asset) => orNil(formatMoney(asset.purchasePrice)) },
          { key: "ratio", label: labels.ratio, numeric: true, className: "text-muted-foreground", render: (asset) => orNil(formatPercent(asset.repairToPurchaseRatio)) },
          { key: "repairCount", label: labels.repairCount, numeric: true, className: "text-muted-foreground", render: (asset) => formatCount(asset.repairCount) },
        ]}
        caption={title}
      />
```

(8) The book-value table's columns and caption (`:212-218`, in `function DepreciationTable`). Replace:

```tsx
          { key: "bookValue", label: labels.bookValue, className: "whitespace-nowrap text-muted-foreground", render: (asset) => formatCurrency(asset.netBookValue) },
          { key: "accumulated", label: labels.accumulated, className: "whitespace-nowrap text-muted-foreground", render: (asset) => formatCurrency(asset.accumulatedDepreciation) },
          { key: "ratio", label: labels.ratio, className: "whitespace-nowrap text-muted-foreground", render: (asset) => formatPercent(asset.depreciatedRatio) },
          { key: "usefulLife", label: labels.usefulLife, className: "whitespace-nowrap text-muted-foreground", render: (asset) => asset.usefulLifeMonths.toLocaleString("th-TH") },
          { key: "ageMonths", label: labels.ageMonths, className: "whitespace-nowrap text-muted-foreground", render: (asset) => asset.ageMonths.toLocaleString("th-TH") },
        ]}
      />
```

with:

```tsx
          { key: "bookValue", label: labels.bookValue, numeric: true, className: "text-muted-foreground", render: (asset) => formatMoney(asset.netBookValue) },
          { key: "accumulated", label: labels.accumulated, numeric: true, className: "text-muted-foreground", render: (asset) => formatMoney(asset.accumulatedDepreciation) },
          { key: "ratio", label: labels.ratio, numeric: true, className: "text-muted-foreground", render: (asset) => formatPercent(asset.depreciatedRatio) },
          { key: "usefulLife", label: labels.usefulLife, numeric: true, className: "text-muted-foreground", render: (asset) => formatCount(asset.usefulLifeMonths) },
          { key: "ageMonths", label: labels.ageMonths, numeric: true, className: "text-muted-foreground", render: (asset) => formatCount(asset.ageMonths) },
        ]}
        caption={title}
      />
```

(9) `formatPercent` returns `null` for no value, and the money-head helper (`:223-229`, to the end of the file). Replace:

```tsx
function formatPercent(value: number | null) {
  if (value == null) return "-"
  return new Intl.NumberFormat("th-TH", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value)
}
```

with:

```tsx
// A share of the whole, in Thai digits like formatCount. null means there is nothing to compare with: no value.
function formatPercent(value: number | null): string | null {
  if (value == null) return null
  return new Intl.NumberFormat("th-TH", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value)
}

// A money column names its unit in the head, "ค่าซ่อม (บาท)", and its cells hold the number only (spec 2B §5.7).
function moneyHead(label: string, unit: string) {
  return `${label} (${unit})`
}
```

(10) The page reads the shared words (`src/app/[locale]/(dashboard)/reports/page.tsx:51`). Replace:

```tsx
  const tAsset = await getTranslations("asset")
```

with:

```tsx
  const tAsset = await getTranslations("asset")
  const tCommon = await getTranslations("common")
```

(11) The page hands the view "บาท" (`:381` before (10), `:382` after it; the last line of the accounting labels). Replace:

```tsx
              noAssets: t("accountingNoAssets"),
```

with:

```tsx
              noAssets: t("accountingNoAssets"),
              baht: tCommon("baht"),
```

Check: `grep -nE 'MetricCard|formatCurrency|toLocaleString|"-"' src/components/reports/reports-accounting-view.tsx` prints nothing (exit 1). `tCommon("baht")` is not a `t("…")` call, so `tests/reports-localization.test.ts:30-38` does not look for it under `reportsPage`.

- [ ] **Step 17: Run the tests, prove the classes, full verification and commit**

Run the set above. Expected: PASS, `tests 109 · pass 109 · fail 0` (reports-adaptive-ui 19). Also run `node --test tests/report-query-scope.test.ts tests/performance-route-instrumentation.test.ts tests/design-system.test.ts`: PASS, `tests 18 · pass 18` (4 · 1 · 13).

Run: `node <temp>/p2b1-precheck.mjs --file c/reports/reports-accounting-view.tsx`
Expected: `(CRLF) · in MIGRATED_LIST_FILES`, `LV3        0       0     0     9`, `LS2        0       0     0    10`, `args    (no row holds this file)` (exit 0). `node <temp>/p2b1-precheck.mjs --file D/reports/page.tsx` still prints `LH2 2 · LV3 1 · LS2 2` (Task 13's).

Run: `SHOW=max-sm:grid-cols-1,lg:grid-flow-row,lg:grid-cols-2,lg:grid-rows-none node <temp>/p2b5-tw-probe.mjs src/components/reports/reports-accounting-view.tsx`
Expected (exit 0):
```
checked 31 classes, missing 0
max-sm:grid-cols-1 -> .max-sm\:grid-cols-1 { @media (width < 40rem) { grid-template-columns: repeat(1, minmax(0, 1fr)); } }
lg:grid-flow-row -> .lg\:grid-flow-row { @media (width >= 64rem) { grid-auto-flow: row; } }
lg:grid-cols-2 -> .lg\:grid-cols-2 { @media (width >= 64rem) { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
lg:grid-rows-none -> .lg\:grid-rows-none { @media (width >= 64rem) { grid-template-rows: none; } }
```
`cn()` (tailwind-merge) drops StatStrip's `lg:grid-flow-col`, `lg:grid-cols-none` and `lg:grid-rows-[repeat(3,auto)]` for these three; `lg:auto-cols-fr` stays and does nothing with explicit columns.

Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: `tests 1999 · pass 1998 · fail 0 · skipped 1` (one test more than the 1998 after commit 3); tsc clean (`formatMoney(asset.purchasePrice)` takes the `number | null` overload, `formatPercent` returns `string | null`, both `ReactNode`); lint 0 errors, no new warning (`npx eslint src/components/reports/reports-accounting-view.tsx "src/app/[locale]/(dashboard)/reports/page.tsx"` prints nothing).

Run: `git diff --stat`. Expected: 4 files: the view 53 insertions and 31 deletions, the page 2 and 0, the test 16 and 0, `tests/list-frame-guards.test.ts` 1 and 2 (the `MIGRATED_LIST_FILES` line in; the LV3 and LS2 rows out; both `// 2B-5` lines stay over the page's rows). CRLF counts: the view `251 251`, the page `801 801`, the test `211 211`.

```bash
git add src/components/reports/reports-accounting-view.tsx "src/app/[locale]/(dashboard)/reports/page.tsx" tests/reports-adaptive-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): report accounting totals on StatStrip, money through formatMoney with the unit in the head (2B-5 task 12)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit; `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 18, spec §8.9 row `/th/reports` "StatStrip แทนกล่องตัวเลข"):** at 1440, 1024, 768 and 375 on each view, with a filter that keeps a few hundred assets and with the largest totals the dev data has:
- การปฏิบัติงาน: two strips of four (two by two below 1024, one row from 1024); each tile opens `/th/assets` with its filter (Ctrl+click opens a new tab); the chevron shows on hover and keyboard focus, and the focus ring sits on the whole tile; the idle box opens its drill-down; codes are monospace and still open the asset.
- บัญชี: no amount is cut at 1024 (two tiles a row) or 375 (one a row); "บาท" follows each amount; the table heads read "(บาท)" and the numbers line up on the right; an asset with no purchase price shows "—" in its price and ratio cells.
- คลังรายงาน: one tile, no wider than 384px from 640px. ภาพรวม: the six breakdown cards' counts are tabular; an empty breakdown is a faint line.
- Nothing scrolls the page sideways at 375; the strips stay inside their panels. NVDA reads each tile's label, then its value (and unit); a "—" tile reads the dash (record it if NVDA reads nothing useful; 2D can give StatStrip a Nil label).

---

### Task 13: `D/reports/page.tsx` on `PageHeader`, `FilterChipList` and `StatStrip`; delete `ReportHeader`, `ReportActiveFilters` and `MetricCard` with their last caller

Spec §8.9 row 8 (`D/reports/page.tsx` · `report-header.tsx` · `report-active-filters.tsx` deleted with the chips' clear link (I24) · `c/ui/metric-card.tsx`), §4.4.6 row `D/reports/page.tsx:719` (`ReportHeader` → `PageHeader`; the register export (outline `Download`) before the overview export (primary `Download`), K8), §4.3.3 rules 3 and 5, §4.6.1 rule 1 (root `space-y-6`), §6.5 "รายงาน: ชิป" and 6-ซ, §10.2 I24, §5.6 (`formatCurrency` `:764` → `formatMoney`), R-d, R-h, §9.2.3 rows `:64` and `:90`, §10.4 table A row 2B-5 (VFG `:64`, `:90` with `existsSync` at `:2`; `report-controls-ui.test.ts:5`, `:8-11`), table C and controller rulings (a), (b), (c) and (e). One commit: the page and the three files whose last caller it was (the controller's "the deletion with the last caller"), with the pins that read those files, because a test that reads a deleted file at load time cannot run at all. The page and the tests are CRLF: exact-string replacements only.

Rulings this task applies:
- **§4.4.6, I1, R-h:** `ReportHeader` (its own `h1` at weight 700, its own button look) becomes `<PageHeader title={t("title")} meta={t("subtitle")} actions={headerActions} />`. The actions are two `md` buttons with `Download`: "ส่งออกทะเบียนทรัพย์สิน" (outline) first, "ส่งออกรายงานภาพรวม" (primary) last (K8, §4.3.3 rule 5; they were the other way round), each shown only with its permission as before (`canAssetExport`, `canReportExport`); with neither, the header has no button row. LH2 page 2 → 0; `report-header.tsx` (LH1 1, LH2 1) is deleted.
- **Departure (spec silent):** the two export buttons are plain `<a href>`, as every export button plan 2B-2 moved (`D/audit/findings/page.tsx:293`, `D/disposal/page.tsx:330`, `D/maintenance/page.tsx:236`): they download a file from an API route, so there is nothing for `next/link` to navigate to or prefetch. The hrefs are unchanged.
- **§6.5 "รายงาน: ชิป", 6-ซ, I24:** `<ReportActiveFilters …>` becomes `<FilterChipList chips={activeFilters} label={t("activeFilters")} removeLabel={t("clearActiveFilter")} />` in the same `<div data-report-active-filters>` (`tests/reports-adaptive-ui.test.ts:13-20` keeps the order). The chips' own "ล้างตัวกรอง" link goes: the panel above has the same link (Task 9). The blue band (`bg-primary-soft` box) goes; each chip is 36px from md (44px on phones), 8px corners, named "ล้างตัวกรอง: <filter>" as before. `ReportActiveFilterDescriptor` (`key`, `label`, `href`) is a `FilterChipItem`; `src/lib/report-active-filters.ts` is unchanged. `report-active-filters.tsx` is deleted.
- **R-d, §5.6, DS:515:** the two shared numbers are one `StatStrip`: "ทรัพย์สินทั้งหมด" through `formatCount`, "มูลค่ารวม" through `formatMoney` with `unit: tCommon("baht")` ("12,345,678.00 บาท"; it was "฿12,345,678.00"), one tile a row below 640px (`max-sm:grid-cols-1`) so the amount is never cut. LS2 page 2 → 0, LV3 page 1 → 0. `metric-card.tsx` has no caller left and is deleted; `getMetricCardToneClasses` (`src/lib/design-system.ts`) keeps no caller and stays for 2D (`tests/design-system.test.ts:25-31` pins it).
- **§4.6.1 rule 1:** the root becomes `space-y-6` (24px between blocks, it was 20px), matching `ReportsPageSkeleton`'s `gap-6`.
- **§9.2.3, table A (VFG `:64`, `:90`, `:2`):** `:64` reads the metric figure class in `ui/stat-strip.tsx`; `:90` checks that `metric-card.tsx` is gone and that `StatStrip` has no status fill and no drop shadow; `existsSync` joins the import at `:2`. **Departure:** the spec's `:90` text uses `/…|\bshadow-/`, which matches StatStrip's own current-cell line `shadow-[inset_0_-2px_0_var(--primary)]` and would fail; the test uses the drop-shadow sizes `\bshadow-(?:sm|md|lg|xl|2xl)\b` (the sizes VFG R2 counts).
- **Table A (`report-controls-ui.test.ts:5`, `:8-11`):** the variable that read `report-active-filters.tsx` and its 44px test go with the file; the chip's 44px rule (`min-h-11` with `md:h-9 md:min-h-0`) is pinned in `tests/list-primitives-ui.test.ts` (`FilterChipList …`, I16).
- **`MIGRATED_LIST_FILES` (the rule of plans 2B-1 to 2B-4):** 2B does not touch the page again, so it joins `MIGRATED_LIST_FILES` (every counter 0). The three deleted files lose their rows (a row must name a real file, L0) and never join the list.
- **`c/ui/page-skeleton.tsx` is not touched** (not one of the 25 files): `ReportsPageSkeleton` already draws the header → tabs → filter panel → two-tile strip → view of this page (plan 2B-4 Task 9). It shows the two tiles side by side below 640px, where the page now stacks them (see the open question in the hand-off).

What users will see on `/th/reports`:
- The title "รายงาน" at weight 600 with the subtitle under it; from 768px the two export buttons sit right of the title at 36px, the outline "ส่งออกทะเบียนทรัพย์สิน" first and the blue "ส่งออกรายงานภาพรวม" last; on phones they wrap under the title at 44px.
- The active filters are chips without the blue band and without a second "ล้างตัวกรอง" (the panel's one is right above).
- "ทรัพย์สินทั้งหมด" and "มูลค่ารวม" are one flat strip (stacked on phones), money with "บาท" after it.
- The page breathes a little more: 24px between blocks.

Not in this task: `MasterDataHeader` and the other `master-data-layout.tsx` helpers, `getTableShellClasses` (Task 16) · the VFG R7 lock and LFG `BUDGETS = KEEP` (Task 17) · `ActionButton`, `getActionButtonClasses`, `getMetricCardToneClasses` (2D) · `c/ui/page-skeleton.tsx` · docs (Task 19). Do not run a formatter.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/reports/page.tsx` (`i/lf w/crlf`; 7 exact replacements)
- Delete: `src/components/reports/report-header.tsx`, `src/components/reports/report-active-filters.tsx`, `src/components/ui/metric-card.tsx` (`git rm`)
- Modify: `tests/visual-foundation-guards.test.ts` (`i/lf w/crlf`; 3 exact replacements: `:2`, `:64`, `:90`)
- Modify: `tests/report-controls-ui.test.ts` (`i/lf w/crlf`; 1 exact replacement, `:5-13`)
- Modify: `tests/reports-adaptive-ui.test.ts` (`i/lf w/crlf`; 1 exact replacement at `:2`, 1 appended block)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only: `t13-block.ts`

**Must keep passing without edits:**
- `tests/reports-adaptive-ui.test.ts:13-20` (the five `data-report-*` wrappers in order), `:35-49`, `:51-65`, `:67-74` (three `hasMatchingAssets={totalAssets > 0}`), `:137-155` (the page's operations and cross-scope pins) · `tests/reports-localization.test.ts` (every `t("…")` of the page exists in th and en: `activeFilters` and `clearActiveFilter` do) · `tests/report-presets.test.ts:35-38` (`currentQuery={buildReportQueryString(activeView, filters)}`) · `tests/report-query-scope.test.ts` · `tests/report-table-key.test.ts` · `tests/report-idle-activity.test.ts` · `tests/report-active-filters.test.ts` · `tests/performance-route-instrumentation.test.ts` (the five `reports.*` timing labels)
- `tests/report-controls-ui.test.ts:13-27` (Task 10's) · `tests/loading-boundaries.test.ts` and `tests/page-loading-skeleton.test.ts` (`ReportsPageSkeleton` unchanged) · `tests/design-system.test.ts:25-46` (`getMetricCardToneClasses`, `getActionButtonClasses` stay for 2D)
- `tests/list-primitives-ui.test.ts` (the `PageHeader`, `FilterChipList`, `StatStrip` strings) · `tests/list-filters-ui.test.ts` · `tests/form-migration-guards.test.ts` · VFG outside `:2`, `:64`, `:90`

**Interfaces:**
- Consumes:
  - 2B-1: `PageHeader({ title: ReactNode, meta?: ReactNode, actions?: ReactNode, back?, breadcrumbs?, compactOnMobile?, className? })` from `@/components/ui/page-header` (no margin of its own; no button row when `back` and `actions` are empty); `FilterChipList({ chips: readonly FilterChipItem[], label: string, removeLabel: string, clearAll?, className? })` with `FilterChipItem = { key: string; label: string; href: string; mobileOnly?: boolean }` from `@/components/ui/filter-chips` (renders nothing without chips); `StatStrip` as in Task 12.
  - 2A: `buttonVariants({ variant?, size? })` from `@/components/ui/button-variants`; `formatCount`, `formatMoney(value, { unit? })` from `@/lib/display-format`.
  - Task 9: the page already passes `hasActiveFilters` to `ReportFilterPanel`. Task 12: the page already has `const tCommon = await getTranslations("common")`. Tasks 10–12: no view and no other component imports `metric-card`, `report-header` or `report-active-filters`.
  - Task 9's `<temp>/p2b5-t9-precheck.mjs`; Task 1's `<temp>/p2b5-append.mjs`, `<temp>/p2b5-tw-probe.mjs`; Task 0's guard scripts.
- Produces:
  - The page in `MIGRATED_LIST_FILES`; no LFG row names the page or `report-header.tsx`; LS2 left with `D/work-center/page.tsx` 1 (Task 15), LV3 with its `KEEP` 6 (the two print pages), LH2 with `master-data-layout.tsx` 1 (Task 16).
  - VFG pins on `ui/stat-strip.tsx` at `:64` and `:90`; `existsSync` imported in VFG and in `tests/reports-adaptive-ui.test.ts`; the test `the reports page frames its views with PageHeader, FilterChipList and StatStrip (spec 2B §4.4.6, I24)`.
  - For Task 19 (DH, `DESIGN.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md`): `MetricCard`, `ReportHeader` and `ReportActiveFilters` are gone; the reports page and its views are on `PageHeader`, `TabNav`, `FilterSelect`/`FilterFormActions`, `FilterChipList`, `StatStrip` and `DataTable`; the hand-offs of Tasks 9–13 (below).

| guard / pin | before → after | plan total (budget) before → after |
|---|---|---|
| LFG LH1 | `report-header.tsx` 1 → – (deleted) | live 7 in 7 files → 6 in 6 (after Tasks 1–8; simulation 16 → 15) |
| LFG LH2 | page 2 · `report-header.tsx` 1 → – | live 4 in 3 files → 1 in 1 (`master-data-layout.tsx`, Task 16's; simulation 5 → 2) |
| LFG LV3 | page 1 → – | 7 in 3 rows → 6 in 2 (the print pages' `KEEP`) |
| LFG LS2 | page 2 → – | 3 in 2 rows → 1 in 1 (`D/work-center/page.tsx`, Task 15's) |
| `MIGRATED_LIST_FILES` | the page joins | +1 |
| VFG `:64`, `:90` | `metric-card.tsx` → `stat-strip.tsx` and `existsSync` | tests 26 → 26 |
| test files | `report-controls-ui` 4 → 3 tests, `reports-adaptive-ui` 19 → 20 | suite ±0 |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b5-t9-precheck.mjs 13`
Expected: `git status` prints nothing. The script prints the six `ok` lines of the shared parts and the keys, then (exit 0):
```
ok      Task 9 is in
ok      Task 10 is in
ok      Task 11 is in
ok      Task 12 is in
ok      Task 13 has not run yet
ok      src/app/[locale]/(dashboard)/reports/page.tsx holds the text this task starts from (hash 05147bc926036f13)
ok      src/components/reports/report-header.tsx holds the text this task starts from (hash 410a46de79160181)
ok      src/components/reports/report-active-filters.tsx holds the text this task starts from (hash 2120fa05fc29554b)
ok      src/components/ui/metric-card.tsx holds the text this task starts from (hash b7638d207dd522f9)
ok      tests/report-controls-ui.test.ts holds the text this task starts from (hash d07d87e722823200)
ok      tests/reports-adaptive-ui.test.ts holds the text this task starts from (hash 1ccf80297b53a032)
ok      tests/visual-foundation-guards.test.ts holds the 3 lines this task replaces, once each
info    src/app/[locale]/(dashboard)/reports/page.tsx: CRLF
info    src/components/reports/report-header.tsx: CRLF
info    src/components/reports/report-active-filters.tsx: CRLF
info    src/components/ui/metric-card.tsx: CRLF
info    tests/report-controls-ui.test.ts: CRLF
info    tests/reports-adaptive-ui.test.ts: CRLF
info    tests/visual-foundation-guards.test.ts: CRLF
preconditions hold for Task 13
```

Run: `grep -rln "ui/metric-card\|reports/report-header\|reports/report-active-filters" src tests`
Expected: `src/app/[locale]/(dashboard)/reports/page.tsx`, `tests/list-frame-guards.test.ts`, `tests/report-controls-ui.test.ts` and `tests/visual-foundation-guards.test.ts` only (the page imports all three; LFG holds the two rows of `report-header.tsx`; the two other tests read two of them).

Run: `node <temp>/p2b1-precheck.mjs --file D/reports/page.tsx` then `node <temp>/p2b1-precheck.mjs --file c/reports/report-header.tsx`
Expected (after the header lines; exit 0 each):
```
file    src/app/[locale]/(dashboard)/reports/page.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LH2        2       2     0     2
LV3        1       1     0     1
LS2        2       2     0     2
args    LH2=2:2 LV3=1:1 LS2=2:2
```
```
file    src/components/reports/report-header.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LH1        1       1     0     1
LH2        1       1     0     1
args    LH1=1:1 LH2=1:1
```

Run: `git ls-files --eol "src/app/[[]locale]/(dashboard)/reports/page.tsx" tests/visual-foundation-guards.test.ts tests/report-controls-ui.test.ts tests/reports-adaptive-ui.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf w/crlf` for all five.

- [ ] **Step 2: Write the failing tests**

(a) `tests/visual-foundation-guards.test.ts` (CRLF; it strips `\r` before matching). Three exact replacements.

`:2`. Replace:

```ts
import { readFileSync } from "node:fs"
```

with:

```ts
import { existsSync, readFileSync } from "node:fs"
```

`:64` (table A, §9.2.3). Replace:

```ts
  assert.match(read("src/components/ui/metric-card.tsx"), /cn\("num mt-2 font-bold"/)
```

with:

```ts
  assert.match(read("src/components/ui/stat-strip.tsx"), /"text-metric num text-foreground"/)
```

`:90` (table A, §9.2.3; the shadow pattern is this plan's, see the rulings). Replace:

```ts
  assert.match(read("src/components/ui/metric-card.tsx"), /cn\("rounded-lg border p-5", toneClasses\.container, className\)/)
```

with:

```ts
  // MetricCard and its tone fills are gone (spec 2B R-d): number tiles are StatStrip, one flat frame with no status fill
  // and no drop shadow. Its current cell's 2px line is an inset shadow, which the size list below does not match.
  assert.equal(existsSync("src/components/ui/metric-card.tsx"), false)
  assert.doesNotMatch(read("src/components/ui/stat-strip.tsx"), /\bbg-(?:success|warning|danger|info)-soft\b|\bshadow-(?:sm|md|lg|xl|2xl)\b/)
```

(b) `tests/report-controls-ui.test.ts` (CRLF, read raw), table A `:5`, `:8-11`: the variable and the test that read `report-active-filters.tsx` go (`:5-13`). Replace:

```ts
const activeFiltersSource = readFileSync(new URL("../src/components/reports/report-active-filters.tsx", import.meta.url), "utf8")
const viewTabsSource = readFileSync(new URL("../src/components/reports/report-view-tabs.tsx", import.meta.url), "utf8")

test("report filter actions stay at least 44px tall below the md breakpoint", () => {
  assert.doesNotMatch(activeFiltersSource, /sm:min-h-9/)
  assert.match(activeFiltersSource, /md:min-h-9/)
})

test("the active report tab has a non-color indicator", () => {
```

with:

```ts
const viewTabsSource = readFileSync(new URL("../src/components/reports/report-view-tabs.tsx", import.meta.url), "utf8")

test("the active report tab has a non-color indicator", () => {
```

(c) `tests/reports-adaptive-ui.test.ts` (CRLF, read raw). `:2`. Replace:

```ts
import { readFileSync } from "node:fs"
```

with:

```ts
import { existsSync, readFileSync } from "node:fs"
```

Then save this block as `<temp>/t13-block.ts` (`\b` in a regex: write it with a file-writing tool, never through `node -e` or a heredoc, which turn `\b` into a backspace):

```ts
// Plan 2B-5 Task 13 (spec 2B §4.4.6, §6.5 "รายงาน: ชิป", I24, R-d): the reports page is a PageHeader with the register
// export before the overview export (the primary one last), its active filters are a FilterChipList with no clear-all
// link of its own (the filter panel has one), and its two shared numbers are a StatStrip. ReportHeader,
// ReportActiveFilters and MetricCard lost their last caller and are gone. Raw CRLF read: no line breaks in these regexes.
test("the reports page frames its views with PageHeader, FilterChipList and StatStrip (spec 2B §4.4.6, I24)", () => {
  assert.match(page, /<div className="space-y-6" data-report-page>\s*<PageHeader title=\{t\("title"\)\} meta=\{t\("subtitle"\)\} actions=\{headerActions\} \/>/)
  const actionsAt = page.indexOf("const headerActions")
  const registerAt = page.indexOf('{t("exportAssetRegister")}', actionsAt)
  const overviewAt = page.indexOf('{t("exportAssetOverview")}', actionsAt)
  assert.ok(actionsAt > -1 && registerAt > actionsAt && overviewAt > registerAt, "the outline register export comes before the primary overview export (K8)")
  assert.match(page, /<a href=\{"\/api\/assets\/export\?" \+ exportQuery\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.match(page, /<a href=\{"\/api\/reports\/assets-overview\/export\?" \+ exportQuery\} className=\{buttonVariants\(\{ size: "md" \}\)\}>/)
  assert.match(page, /<div data-report-active-filters>\s*<FilterChipList chips=\{activeFilters\} label=\{t\("activeFilters"\)\} removeLabel=\{t\("clearActiveFilter"\)\} \/>/)
  assert.match(page, /\{ key: "totalAssets", label: t\("totalAssets"\), value: formatCount\(totalAssets\) \}/)
  assert.match(page, /\{ key: "totalValue", label: t\("totalValue"\), value: formatMoney\(totalPurchaseValue\), unit: tCommon\("baht"\) \}/)
  assert.doesNotMatch(page, /\bReportHeader\b|\bReportActiveFilters\b|\bMetricCard\b|formatCurrency|toLocaleString|clearAllHref/)
  for (const path of ["src/components/reports/report-header.tsx", "src/components/reports/report-active-filters.tsx", "src/components/ui/metric-card.tsx"]) {
    assert.equal(existsSync(path), false, `${path} has no caller left`)
  }
})
```

Run: `node <temp>/p2b5-append.mjs <temp>/t13-block.ts tests/reports-adaptive-ui.test.ts`
Expected: `appended <temp>/t13-block.ts to tests/reports-adaptive-ui.test.ts (CRLF)`

Run: `node --test tests/visual-foundation-guards.test.ts tests/report-controls-ui.test.ts tests/reports-adaptive-ui.test.ts`
Expected: FAIL, `tests 49 · pass 47 · fail 2` (visual-foundation-guards 26 · report-controls-ui 3, one test fewer · reports-adaptive-ui 20, one more):
- VFG `panels and bottom action bars are flat`: `Expected values to be strictly equal` (`actual: true`, `expected: false`: `metric-card.tsx` still exists)
- `the reports page frames its views with PageHeader, FilterChipList and StatStrip (spec 2B §4.4.6, I24)`: the input did not match the regular expression `/<div className="space-y-6" data-report-page>\s*<PageHeader title=\{t\("title"\)\} meta=\{t\("subtitle"\)\} actions=\{headerActions\} \/>/`

`line heights are ratios, and Thai pages get room for stacked marks` already passes: `ui/stat-strip.tsx` has held `"text-metric num text-foreground"` since plan 2B-1.

- [ ] **Step 3: Lower the guard rows of the page and of the file this task deletes (the failing guards)**

Run: `node <temp>/p2b-budget.mjs D/reports/page.tsx LH2=2:0 LV3=1:0 LS2=2:0 --migrated`
Expected (exit 0):
```
LH2: 2 -> 0 (row deleted)
LV3: 1 -> 0 (row deleted)
LS2: 2 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/reports/page.tsx
```

Run: `node <temp>/p2b-budget.mjs c/reports/report-header.tsx LH1=1:0 LH2=1:0`
Expected (exit 0; no `--migrated`: the file is deleted in Step 4 and never joins the list):
```
LH1: 1 -> 0 (row deleted)
LH2: 1 -> 0 (row deleted)
written: src/components/reports/report-header.tsx
```

Run: `node --test tests/list-frame-guards.test.ts`
Expected: FAIL, `tests 21 · pass 16 · fail 5`, each naming only the page or `report-header.tsx`:
- `LH1 page titles (<h1>) come from PageHeader`: `LH1: 7 in 7 files. …` (the simulation without Tasks 1–8 prints `16 in 16`) with `src/components/reports/report-header.tsx: 1 > 0`
- `LH2 MasterDataHeader, ReportHeader and local PageHeader functions give way to PageHeader`: `LH2: 4 in 3 files. …` (simulation `5 in 4`) with `src/app/[locale]/(dashboard)/reports/page.tsx: 2 > 0` and `src/components/reports/report-header.tsx: 1 > 0`
- `LV3 money on screen goes through formatMoney, not formatCurrency`: `LV3: 7 in 3 files. …` with `src/app/[locale]/(dashboard)/reports/page.tsx: 1 > 0`
- `LS2 MetricCard gives way to StatStrip`: `LS2: 3 in 2 files. …` with `src/app/[locale]/(dashboard)/reports/page.tsx: 2 > 0`
- `L0 …`: `LH2 …/reports/page.tsx: 2 > 0`, `LV3 …/reports/page.tsx: 1 > 0`, `LS2 …/reports/page.tsx: 2 > 0`

- [ ] **Step 4: Move the page and delete the three files (`src/app/[locale]/(dashboard)/reports/page.tsx`, CRLF)**

Seven exact replacements, top to bottom, then the deletions. Make all seven before you compile.

(1) The icon import (`:1-2`): `Download` joins. Replace:

```tsx
import type React from "react"
import { ClipboardCheck, DatabaseZap, FileSpreadsheet, ShieldCheck, Trash2, Wrench } from "lucide-react"
```

with:

```tsx
import type React from "react"
import { ClipboardCheck, DatabaseZap, Download, FileSpreadsheet, ShieldCheck, Trash2, Wrench } from "lucide-react"
```

(2) `formatCurrency` goes (`:7`). Replace:

```tsx
import { formatCurrency } from "@/lib/utils"
```

with:

```tsx
import { formatCount, formatMoney } from "@/lib/display-format"
```

(3) The component imports (`:14-18`). Replace:

```tsx
import { MetricCard } from "@/components/ui/metric-card"
import { ReportActiveFilters } from "@/components/reports/report-active-filters"
import { ReportFilterPanel, type ReportFilterOptions as ReportFilterPanelOptions } from "@/components/reports/report-filter-panel"
import { ReportHeader, type ReportHeaderAction } from "@/components/reports/report-header"
import { ReportViewTabs } from "@/components/reports/report-view-tabs"
```

with:

```tsx
import { buttonVariants } from "@/components/ui/button-variants"
import { FilterChipList } from "@/components/ui/filter-chips"
import { PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { ReportFilterPanel, type ReportFilterOptions as ReportFilterPanelOptions } from "@/components/reports/report-filter-panel"
import { ReportViewTabs } from "@/components/reports/report-view-tabs"
```

(4) `buildReportHref` has no use left in the page (it built the chips' clear-all href; the panel builds its own) (`:24`). Replace:

```tsx
import { buildReportHref, buildReportQueryString, parseReportView, type ReportView } from "@/lib/report-view"
```

with:

```tsx
import { buildReportQueryString, parseReportView, type ReportView } from "@/lib/report-view"
```

(5) The header's buttons (`:192-199`; `:191-198` at `6835bdf`, one line lower since Task 12's `tCommon`). Replace:

```tsx
  const headerActions: ReportHeaderAction[] = [
    ...(canReportExport
      ? [{ href: "/api/reports/assets-overview/export?" + exportQuery, label: t("exportAssetOverview"), variant: "primary" as const }]
      : []),
    ...(canAssetExport
      ? [{ href: "/api/assets/export?" + exportQuery, label: t("exportAssetRegister"), variant: "secondary" as const }]
      : []),
  ]
```

with:

```tsx
  // The header's buttons (spec 2B §4.4.6, K8): the register export (outline) first, the overview export (primary)
  // last. Plain links to the export routes, like the other export buttons of 2B: a download, not a page to prefetch.
  const headerActions =
    canAssetExport || canReportExport ? (
      <>
        {canAssetExport ? (
          <a href={"/api/assets/export?" + exportQuery} className={buttonVariants({ variant: "outline", size: "md" })}>
            <Download aria-hidden="true" />
            {t("exportAssetRegister")}
          </a>
        ) : null}
        {canReportExport ? (
          <a href={"/api/reports/assets-overview/export?" + exportQuery} className={buttonVariants({ size: "md" })}>
            <Download aria-hidden="true" />
            {t("exportAssetOverview")}
          </a>
        ) : null}
      </>
    ) : undefined
```

(6) The root and the header (`:719-721`). Replace:

```tsx
  return (
    <div className="space-y-5" data-report-page>
      <ReportHeader title={t("title")} subtitle={t("subtitle")} actions={headerActions} />
```

with:

```tsx
  return (
    <div className="space-y-6" data-report-page>
      <PageHeader title={t("title")} meta={t("subtitle")} actions={headerActions} />
```

(7) The chips and the shared numbers (`:755-768`). Replace:

```tsx
      {activeFilters.length > 0 ? (
        <div data-report-active-filters>
          <ReportActiveFilters
            filters={activeFilters}
            clearAllHref={buildReportHref(locale, activeView, parseAssetListParams({}))}
            clearLabel={t("clearFilters")}
            removeLabel={t("clearActiveFilter")}
          />
        </div>
      ) : null}
      <div data-report-shared-metrics className="grid grid-cols-2 gap-3">
        <MetricCard label={t("totalAssets")} value={totalAssets.toLocaleString("th-TH")} />
        <MetricCard label={t("totalValue")} value={formatCurrency(totalPurchaseValue)} />
      </div>
```

with:

```tsx
      {activeFilters.length > 0 ? (
        <div data-report-active-filters>
          <FilterChipList chips={activeFilters} label={t("activeFilters")} removeLabel={t("clearActiveFilter")} />
        </div>
      ) : null}
      <div data-report-shared-metrics>
        {/* A total in the 28px metric size needs about 230px: one tile a row below sm. */}
        <StatStrip
          className="max-sm:grid-cols-1"
          items={[
            { key: "totalAssets", label: t("totalAssets"), value: formatCount(totalAssets) },
            { key: "totalValue", label: t("totalValue"), value: formatMoney(totalPurchaseValue), unit: tCommon("baht") },
          ]}
        />
      </div>
```

Then delete the three files that have no caller left:

Run: `git rm src/components/reports/report-header.tsx src/components/reports/report-active-filters.tsx src/components/ui/metric-card.tsx`
Expected: three `rm '…'` lines.

Check: `grep -rn "ui/metric-card\|reports/report-header\|reports/report-active-filters" src tests` prints only `tests/visual-foundation-guards.test.ts:92` (the `existsSync` check) and the path list of this task's test in `tests/reports-adaptive-ui.test.ts`; nothing under `src`. (`MetricCard` still names the work-center page's own tile function, `D/work-center/page.tsx:436`, `:597`: Task 15's.)

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/reports-adaptive-ui.test.ts tests/report-controls-ui.test.ts tests/reports-localization.test.ts tests/report-presets.test.ts tests/report-query-scope.test.ts tests/report-table-key.test.ts tests/report-idle-activity.test.ts tests/report-active-filters.test.ts tests/performance-route-instrumentation.test.ts tests/loading-boundaries.test.ts tests/page-loading-skeleton.test.ts tests/design-system.test.ts tests/list-primitives-ui.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `tests 165 · pass 165 · fail 0` (reports-adaptive-ui 20 · report-controls-ui 3 · reports-localization 4 · report-presets 9 · report-query-scope 4 · report-table-key 5 · report-idle-activity 2 · report-active-filters 3 · performance-route-instrumentation 1 · loading-boundaries 4 · page-loading-skeleton 2 · design-system 13 · list-primitives-ui 19 · list-filters-ui 6 · list-frame-guards 21 · visual-foundation-guards 26 · form-migration-guards 23; Tasks 1–8 add no test to list-filters-ui).

Run: `node <temp>/p2b1-precheck.mjs --file D/reports/page.tsx`
Expected (exit 0):
```
file    src/app/[locale]/(dashboard)/reports/page.tsx (CRLF) · in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LH2        0       0     0     2
LV3        0       0     0     1
LS2        0       0     0     2
args    (no row holds this file)
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```
`node <temp>/p2b1-precheck.mjs --file c/reports/report-header.tsx` now ends with `ABORT: src/components/reports/report-header.tsx is no such file` (expected: the file is gone).

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected: `budgets hold: no live count is over its row`; `LF1 … 0 in 0 rows`, `LS2 … 1 in 1 rows · live 1 in 1 files`, `LV3 … 6 in 2 rows · live 6 in 2 files`, every guard of this task's rows at `slack 0`. The slack of the three rows 2C plan 4 emptied (`LH1` ×2, `LT1`, `LV1`) is Task 17's.

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b5-tw-probe.mjs "src/app/[locale]/(dashboard)/reports/page.tsx"`
Expected: `checked 14 classes, missing 10: asset-overview maintenance-follow-up disposal-follow-up audit-findings asset-register cross-scope-assets data-quality audit-findings-pdf role-permission-audit system-logs` (exit 1). The ten names are the `key: "…"` values of the catalog rows, which the probe's `: "…"` lead takes for classes; the same ten print at `6835bdf` (`checked 16 classes, missing 10`). No real class is missing; `max-sm:grid-cols-1` is Task 12's.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `tests 1999 · pass 1998 · fail 0 · skipped 1`, the same count as after Task 12 (one test appended, one deleted).
- `npx tsc --noEmit`: no errors (`headerActions` is a `ReactNode` or `undefined`; `activeFilters` is a `ReportActiveFilterDescriptor[]`, which `readonly FilterChipItem[]` takes).
- `npm run lint`: 0 errors and the 146 warnings under `.agents/`; `npx eslint "src/app/[locale]/(dashboard)/reports/page.tsx" tests/reports-adaptive-ui.test.ts tests/report-controls-ui.test.ts tests/visual-foundation-guards.test.ts` prints nothing.

Run: `git status --short` then `git diff --cached --stat` after `git add` of the four edited files (Step 8's list).
Expected: 8 paths: the page 38 insertions and 25 deletions; `report-active-filters.tsx` 0 and 36, `report-header.tsx` 0 and 43, `metric-card.tsx` 0 and 23 (deleted); `tests/reports-adaptive-ui.test.ts` 22 and 1; `tests/report-controls-ui.test.ts` 0 and 6; `tests/visual-foundation-guards.test.ts` 6 and 3; `tests/list-frame-guards.test.ts` 1 and 7 (the `MIGRATED_LIST_FILES` line in; five rows out, and the `// 2B-5` lines of LH2 and LV3 that no row follows any more; the simulation without Tasks 1–8 shows 1 and 6, because Task 8's `my-assets` row still sits under LH2's). CRLF counts: the page `814 814`, `tests/reports-adaptive-ui.test.ts` `232 232`, `tests/report-controls-ui.test.ts` `35 35`.

- [ ] **Step 8: Commit**

```bash
git add "src/app/[locale]/(dashboard)/reports/page.tsx" tests/visual-foundation-guards.test.ts tests/report-controls-ui.test.ts tests/reports-adaptive-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): reports page on PageHeader, FilterChipList and StatStrip; delete ReportHeader, ReportActiveFilters and MetricCard with their last caller (2B-5 task 13)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 8 files in the commit (`git show --stat HEAD`: 5 modified, 3 deleted). `git status --short src tests messages` prints nothing.

**Hand-offs of Tasks 9–13 (Task 19 writes them into DH):**
- To 2D: `ActionButton`'s last caller is `D/error.tsx:30`; `getActionButtonClasses` and `getMetricCardToneClasses` have no caller (their pins `tests/design-system.test.ts:8`, `:13`, `:26-31`, `:39-40` and `:186-191` go with them); the hand-written action links of the catalog and operations views, the "not allowed" chips, the issue, flag and permission pills, the two dashed empty boxes and the idle box's warning fill; a `StatStrip` value that is empty is a written-out "—" (one tile: the accounting repair ratio when no asset has a purchase price): a `Nil` label on `StatStripItem` would let screen readers say "ไม่มีข้อมูล".
- To 2D or a ruling: `ReportsPageSkeleton`'s `MetricGridSkeleton count={2}` keeps two tiles side by side below 640px, where the page stacks them (`max-sm:grid-cols-1`); `c/ui/page-skeleton.tsx` is not a 2B-5 file.
- To phase 3: the mobile cards of `ResponsiveReportList` keep their `text-xs leading-4` labels (§5.8, B6).
- If 2C plan 5 merged first and changed VFG `:91-93` (the two mobile bars' loop under `:90`), the rebase keeps both sides (spec §8.2).

**For the dev-app check (Task 18, spec §8.9 rows `/th/reports` and "หลัง rebase"):** at 1440, 768 and 375 on each view, as the seed admin and as a user with `report:view` but without `report:export` and `asset:view` (if the dev data has one): the header has the title at 600, the subtitle under it, and only the export buttons the user may use, outline before primary; at 375 they wrap under the title and nothing scrolls sideways. With filters on (one from the panel, one from a drill-down scope) the chips have no blue band and no second "ล้างตัวกรอง"; each chip removes only its filter; Tab reaches each chip, the ring is offset like a button's. "ทรัพย์สินทั้งหมด" and "มูลค่ารวม" are one strip, stacked at 375, money with "บาท". Pressing an export button downloads the file (nothing else: the page does not navigate). Compare with the before images: only these changes. After a rebase onto 2C plan 5: the catalog's preset controls (2C plan 4's `report-preset-controls.tsx`) still render and open a preset the browser already holds; save none.

---

### Task 14: `D/dashboard/page.tsx` · the title on `PageHeader`, the blocks 24px apart and every count through `formatCount` (plus the precheck script of Tasks 14–17)

Spec §8.9 row 9, §4.4.6 row `D/dashboard/page.tsx:326`, §4.6.1 rule 1, §5.6 row `D/dashboard/page.tsx`, §4.7 (the dashboard skeleton), §8.3 test table rows 2B-5∥2C-3 and 2B-5∥2C-4, §10.4 table C column 2B-5 and controller rulings (a), (b) and (e). One file, one commit. The page is CRLF: exact-string replacements only. This task also saves the precheck script that Tasks 15–17 reuse.

Rulings this task applies:
- **§4.4.6, I1:** the hand-written `<h1 className="mb-6 text-2xl font-bold …">` (`:326`) becomes `<PageHeader title={t("title")} />`: no meta, no buttons, no back link, so the title is 24/600. LH1 1 → 0.
- **§4.6.1 rule 1:** the bare root `<div>` (`:325`) becomes `<div className="space-y-6">` and the top-level blocks lose their own margins in the same commit: the h1's `mb-6` (`:326`), the KPI grid's `mb-8` (`:329`) and the three sections' `mb-8` (`:349`, `:380`, `:416`). The blocks were 32px apart; now 24px, like every page 2B moved. The `mb-4` inside the sections stays.
- **§5.6 (`toLocaleString("th-TH")` ×13 → `formatCount` + `num`):** the twelve counts (the seven KPI cards `:192-198`, the action cards `:370`, the cross-scope cards `:399`, the status overview `:449`, the trend card's two numbers `:526`, `:528`) go through `formatCount`, and the five number elements (`:339`, `:370`, `:399`, `:449`, `:526`) get `num` (tabular figures). The thirteenth is not a count: the activity time `:623` (`new Date(log.createdAt).toLocaleString("th-TH")`) becomes `formatDateTime(log.createdAt)`, the date-and-time format the system log page uses (it drops the seconds). LV1 does not count `toLocaleString("th-TH")`, so no guard row moves for these.
- **Kept on purpose (spec §8.3 rows 2B-5∥2C-3 and 2B-5∥2C-4, table D):** `shouldUseEmployeeHome(user)` and the redirect to `/my-assets` (`tests/permission-aware-navigation.test.ts:93-104`); `auditRoundOperationalWhere` in the urgent-work count (`tests/audit-round-cancellation.test.ts:124-142`); the seven `withPerformanceTiming` labels (`tests/performance-route-instrumentation.test.ts:6-16`); the cross-scope names `tests/dashboard-cross-scope.test.ts:8-22` reads.
- **Not changed (spec silent, or another phase):** the KPI, action, trend and status-overview cards stay cards (spec §3.13 does not list them for `StatStrip`; their tone fills are 2D's, with the other boxes outside lists); the warning pills of the cross-scope rows (2D, pills); the two `=== "-"` and `!== "-"` comparisons `:616-617` (they compare the presenter's text from `src/lib`, which R-n keeps; nothing on screen shows a typed "-"). The dashboard skeleton (`DashboardPageSkeleton`) already draws a header with no meta and no buttons, the blocks in this order and `gap-6`, so spec §4.7's "change the skeleton in the same commit if the page's shape changes" does not apply.
- **Ruling (f) of plan 2B-4, kept here:** 2B does not touch the page again, so it joins `MIGRATED_LIST_FILES` (every counter 0).

What users will see on `/th/dashboard`:
- The title "แดชบอร์ด" is 24px at weight 600 (it was bold). The cards, sections and the two-column block below it sit 24px apart (they were 32px).
- Every number reads the same as before ("1,234"), in tabular figures, so the KPI numbers line up.
- An activity's time reads "15/10/2569 14:30" (no seconds), like the system log page.
- Nothing else moves: the same cards, colors, links and order.

Not in this task: the work center (Task 15) · the dashboard skeleton (no change needed, above) · the cards' tone fills and the cross-scope pills (2D) · docs (Task 19). Do not run a formatter.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/dashboard/page.tsx` (`i/lf w/crlf`; 13 exact replacements)
- Modify: `tests/list-pages-ui.test.ts` (`i/lf w/crlf`; one block appended with `p2b5-append.mjs`)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only, never committed: `p2b5-t14-precheck.mjs` (Tasks 15–17 reuse it), `t14-pages-block.ts`

**Must keep passing without edits:**
- `tests/permission-aware-navigation.test.ts` (`shouldUseEmployeeHome(user)`, the `/my-assets` redirect) · `tests/audit-round-cancellation.test.ts` (`auditRoundOperationalWhere`) · `tests/performance-route-instrumentation.test.ts` (the seven `dashboard.*` labels) · `tests/dashboard-cross-scope.test.ts` · `tests/loading-boundaries.test.ts` · `tests/page-loading-skeleton.test.ts`
- `tests/visual-foundation-guards.test.ts` (no row of this page) · `tests/form-migration-guards.test.ts` · `tests/list-primitives-ui.test.ts`

**Interfaces:**
- Consumes:
  - 2B-1: `PageHeader({ title: ReactNode, meta?, actions?, back?, breadcrumbs?, compactOnMobile?, className? })` from `@/components/ui/page-header` (server-safe; no margin of its own).
  - 2A: `formatCount(value: number): string` from `@/lib/display-format` (th-TH grouping, no decimals); `formatDateTime(date: Date | string | null | undefined): string` from `@/lib/utils`.
  - Task 0: `<temp>/p2b1-precheck.mjs` (`--file`, `--budgets`), `<temp>/p2b-budget.mjs`. Task 1: `<temp>/p2b5-append.mjs <block file> <test file>` (keeps the test file's CRLF or LF; prints `appended <block> to <test> (CRLF)`), `<temp>/p2b5-tw-probe.mjs <file> …` (prints `checked N classes, missing M`).
- Produces:
  - The page with `PageHeader`, a `space-y-6` root and `formatCount`; in `MIGRATED_LIST_FILES`; its LH1 row gone from LFG `BUDGETS`.
  - The test `the dashboard: PageHeader, blocks 24px apart and every count through formatCount (spec 2B §4.4.6, §4.6.1, §5.6)` in `tests/list-pages-ui.test.ts`.
  - `<temp>/p2b5-t14-precheck.mjs <14|15|16|16b|17>` (Tasks 15–17 run it in their Step 1; `16b` is the second commit of Task 16).

| guard | `D/dashboard/page.tsx` before → after | plan total (budget) before → after |
|---|---|---|
| LFG LH1 | 1 → – | 8 in 8 rows → 7 in 7 rows (live 6 → 5) |
| `MIGRATED_LIST_FILES` | – → joins | +1 |

The "before" totals are the counts after Tasks 1–13 (controller ruling (a)): LH1 holds this page, the work center (Task 15) and the six `KEEP` rows, two of which (`c/assets/asset-label-batch-tool.tsx`, `c/assets/asset-scan-search-tool.tsx`) are already at live 0 since 2C plan 4; Task 17 deletes those two.

- [ ] **Step 1: Check what this task builds on (and save the precheck script)**

Save this script in your temp folder (never in the repo). Tasks 15, 16 and 17 reuse it.

`p2b5-t14-precheck.mjs`:

```js
// p2b5-t14-precheck.mjs: run from the repo root before Task 14, 15, 16, 16b (the second commit of Task 16) or 17 of
// plan 2B-5. Usage: node p2b5-t14-precheck.mjs <14|15|16|16b|17>. Reads only; writes nothing. Never commit this file.
// Confirms the shared parts these tasks use (with the API the tasks quote) and the keys they read, that Tasks 1–13 left
// what these tasks build on, that the earlier steps of this group are in and this one is not, that each file this step
// edits still holds its 6835bdf text (a hash of its text with \r stripped; no other task of the plan and no file of
// 2C plan 5 edits these), and that the text this step replaces in a shared test file is there exactly once.
import { createHash } from "node:crypto"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

const STEPS = ["14", "15", "16", "16b", "17"]
const step = process.argv[2]
if (!STEPS.includes(step)) {
  console.error("usage: node p2b5-t14-precheck.mjs <14|15|16|16b|17>")
  process.exit(2)
}
const D = "src/app/[locale]/(dashboard)/"
const C = "src/components/"
const raw = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "")
const read = (path) => raw(path).replace(/\r\n/g, "\n")
const eol = (path) => {
  const text = raw(path)
  const crlf = (text.match(/\r\n/g) ?? []).length
  const lf = (text.match(/\n/g) ?? []).length
  return lf === 0 ? "missing" : crlf === lf ? "CRLF" : crlf === 0 ? "LF" : "mixed"
}
const hash = (path) => createHash("sha256").update(read(path)).digest("hex").slice(0, 16)
const ui = (name) => read(`${C}ui/${name}`)
const exports = (path, names) => names.every((name) => new RegExp(`export (?:function|const|type) ${name}\\b`).test(read(path)))
const messages = (locale) => JSON.parse(read(`messages/${locale}.json`))
const once = (path, text) => read(path).split(text).length === 2
const lfg = read("tests/list-frame-guards.test.ts")
const migratedBlock = lfg.match(/const MIGRATED_LIST_FILES: string\[\] = \[([\s\S]*?)\n\]/)?.[1] ?? ""
const migrated = (path) => migratedBlock.includes(path.startsWith(D) ? "`${D}" + path.slice(D.length) + "`" : "`${C}" + path.slice(C.length) + "`")
const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name).split("\\").join("/")
    if (entry.isDirectory()) walk(path, out)
    else if (/\.(?:ts|tsx)$/.test(path)) out.push(path)
  }
  return out
}
const srcFiles = walk("src")
const callers = (pattern, owner) => srcFiles.filter((path) => path !== owner && pattern.test(read(path)))

const DASHBOARD = `${D}dashboard/page.tsx`
const WORK_CENTER = `${D}work-center/page.tsx`
const LAYOUT = `${C}master-data/master-data-layout.tsx`
const DESIGN_SYSTEM = "src/lib/design-system.ts"
// The files of Tasks 1–13 that stay (spec §8.9 rows 1–8) and the three that Task 13 deletes.
const EARLIER = [
  `${D}admin/roles/page.tsx`, `${D}admin/logs/page.tsx`, `${D}admin/storage/page.tsx`, `${D}admin/approvals/page.tsx`,
  `${D}admin/approvals/history/page.tsx`, `${D}admin/readiness/page.tsx`, `${D}admin/settings/page.tsx`, `${D}access-denied/page.tsx`,
  `${D}notifications/page.tsx`, `${D}my-assets/page.tsx`, `${C}reports/report-filter-panel.tsx`, `${C}reports/report-view-tabs.tsx`,
  `${C}reports/responsive-report-list.tsx`, `${C}reports/reports-overview-view.tsx`, `${C}reports/reports-catalog-view.tsx`,
  `${C}reports/reports-operations-view.tsx`, `${C}reports/reports-accounting-view.tsx`, `${D}reports/page.tsx`,
]
const DELETED = [`${C}reports/report-header.tsx`, `${C}reports/report-active-filters.tsx`, `${C}ui/metric-card.tsx`]

// The files each step edits, with their CR-stripped text hash at 6835bdf.
const UNCHANGED = {
  14: { [DASHBOARD]: "89d24675163e75f7" },
  15: { [WORK_CENTER]: "91d913f0d170aa22" },
  16: { [LAYOUT]: "8caf7ba933199fab", "tests/asset-register-filter-ui.test.ts": "deb6747fd9d6a39c" },
  "16b": { [DESIGN_SYSTEM]: "ea3e47a9d60ed0e8", "tests/design-system.test.ts": "a1e8b130a09ee31c" },
  17: {},
}
// What each step leaves behind, so the next one can see it is in (and a step can see it has not run yet).
const DONE = {
  14: () => read(DASHBOARD).includes('<PageHeader title={t("title")} />') && migrated(DASHBOARD),
  15: () => read(WORK_CENTER).includes('aria-label={t("viewNavigation")}') && migrated(WORK_CENTER),
  16: () => !read(LAYOUT).includes("export function MasterDataHeader") && migrated(LAYOUT),
  "16b": () => read(DESIGN_SYSTEM).includes("No caller since phase 2B plan 5"),
  17: () => lfg.includes('test("L9 every 2B budget equals KEEP'),
}
// The text a step replaces in a test file other tasks of the plan may also edit: there exactly once.
const ONCE = {
  16: [
    ["tests/list-primitives-ui.test.ts", 'test("MasterDataHeader is a thin wrapper of PageHeader until its last callers move (I2)", () => {\n'],
    ["tests/list-primitives-ui.test.ts", '  assert.match(source, /import \\{ Button, buttonVariants \\} from "@\\/components\\/ui\\/button"/)\n'],
  ],
  17: [
    ["tests/visual-foundation-guards.test.ts", "const TABLE_HEADER_LINE = /<th(?:ead)?\\b/\n"],
    ["tests/visual-foundation-guards.test.ts", '  // 2C plan 4 or 2D (2C batch 4 files, R-e)\n  "src/components/assets/asset-import-preview-panel.tsx": 1,\n}\n'],
    ["tests/list-frame-guards.test.ts", "    [`${C}assets/asset-scan-search-tool.tsx`]: 1, // 2C plan 4 moves it onto PageHeader (I13)\n    [`${C}assets/asset-label-batch-tool.tsx`]: 1, // 2C plan 4 moves it onto PageHeader (I13)\n"],
    ["tests/list-frame-guards.test.ts", "    [`${C}admin/role-permission-form.tsx`]: 2, // 2C batch 4 (R-e)\n"],
    ["tests/list-frame-guards.test.ts", "    [`${C}admin/IntegrationClientManager.tsx`]: 3, // R-f, 2C plan 4\n"],
    ["tests/list-frame-guards.test.ts", "// Phase 2B list-frame guards (spec 2B §9.3, rulings I11, I14 and I15). BUDGETS start at the d38a0ee counts\n"],
    ["tests/list-frame-guards.test.ts", "// ---- Budgets at d38a0ee (spec §10.4 table C, per file as spec §9.4.1–9.4.2). Groups name the first 2B plan that\n"],
    ["tests/list-frame-guards.test.ts", "// to these numbers. 2C plan 4 or 2D empties the rest; phase 2D sets every budget to {}. Change a row only with a spec ruling.\n"],
  ],
}

const pageHeader = ui("page-header.tsx")
const tabNav = ui("tab-nav.tsx")
const statStrip = ui("stat-strip.tsx")
const checks = {
  "2B-1: PageHeader with title, meta, actions, back and breadcrumbs":
    /export function PageHeader\(\{ title, meta, actions, back, breadcrumbs, compactOnMobile = false, className \}: PageHeaderProps\)/.test(pageHeader),
  "2B-1: TabNav with aria-label, items and current; TabNavItem with key, label and href":
    exports(`${C}ui/tab-nav.tsx`, ["TabNav", "TabNavItem"]) && /"aria-label": string/.test(tabNav) && /items: readonly TabNavItem\[\]/.test(tabNav) &&
    /current: string/.test(tabNav) && /key: string\n\s+label: React\.ReactNode\n\s+href: string/.test(tabNav),
  "2B-1: StatStrip with value, foot, footTitle, href and attention":
    exports(`${C}ui/stat-strip.tsx`, ["StatStrip", "StatStripItem"]) &&
    ["value: string", "foot?: React.ReactNode", "footTitle?: string", "href?: string", "attention?: boolean"].every((text) => statStrip.includes(text)) &&
    /\{ items, className \}: \{ items: readonly StatStripItem\[\]; className\?: string \}/.test(statStrip),
  "2A: formatCount in src/lib/display-format.ts, formatDateTime in src/lib/utils.ts, Button in ui/button":
    exports("src/lib/display-format.ts", ["formatCount"]) && /export function formatDateTime\(/.test(read("src/lib/utils.ts")) && /export \{[^}]*\bButton\b/.test(ui("button.tsx")),
  "the keys these tasks read exist in th and en": ["th", "en"].every((locale) => {
    const { dashboard, workCenter } = messages(locale)
    return typeof dashboard?.title === "string" &&
      ["title", "subtitle", "urgent", "allFollowUps", "allWork", "myWork", "allWorkDetail", "myWorkDetail", "myWorkUnavailable", "focusNavigation",
        "focusPriority", "approvalInbox", "assetDataTitle", "maintenanceTitle", "auditTitle", "disposalTitle"].every((key) => typeof workCenter?.[key] === "string")
  }),
  "Tasks 1–13 are in: their files are in MIGRATED_LIST_FILES and the three deleted files are gone":
    EARLIER.every(migrated) && DELETED.every((path) => !existsSync(path)),
  ...Object.fromEntries(STEPS.slice(0, STEPS.indexOf(step)).map((earlier) => [`Task ${earlier === "16b" ? "16 (design-system.ts)" : earlier} is in`, DONE[earlier]()])),
  [`Task ${step === "16b" ? "16 (design-system.ts)" : step} has not run yet`]: !DONE[step](),
  ...(step === "15" ? { "workCenter.viewNavigation is not in th or en yet": ["th", "en"].every((locale) => messages(locale).workCenter?.viewNavigation === undefined) } : {}),
  ...(step === "16" ? { "MasterDataHeader, ColumnHeader, SortableColumnHeader and MasterDataPagination have no caller left": callers(/\b(?:MasterDataHeader|ColumnHeader|SortableColumnHeader|MasterDataPagination)\b/, LAYOUT).length === 0 } : {}),
  ...(step === "16b" ? { "getTableShellClasses and getActionButtonClasses have no caller left in src": callers(/\bget(?:TableShell|ActionButton)Classes\b/, DESIGN_SYSTEM).length === 0 } : {}),
  ...(step === "17" ? { "the logs page (Task 2) and the report filter panel (Task 9) are in MIGRATED_FILTER_FILES": [`${D}admin/logs/page.tsx`, `${C}reports/report-filter-panel.tsx`].every((path) => read("tests/list-filters-ui.test.ts").includes(`"${path}"`)) } : {}),
  ...Object.fromEntries(Object.entries(UNCHANGED[step]).map(([path, expected]) => [`${path} is unchanged since 6835bdf (hash ${expected})`, hash(path) === expected])),
  ...Object.fromEntries((ONCE[step] ?? []).map(([path, text]) => [`${path} holds the text this step replaces, once: ${JSON.stringify(text.split("\n")[0])}`, once(path, text)])),
}

let missing = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok     " : "MISSING"} ${name}`)
  if (!ok) missing += 1
}
for (const path of [...new Set([...Object.keys(UNCHANGED[step]), ...(ONCE[step] ?? []).map(([path]) => path)])]) {
  const expected = UNCHANGED[step][path]
  console.log(`info    ${path}: ${eol(path)}${expected && hash(path) !== expected ? ` · hash now ${hash(path)}` : ""}`)
}
if (missing > 0) {
  console.error(`ABORT: ${missing} precondition(s) failed. Do not start Task ${step}; report which.`)
  process.exit(1)
}
console.log(`preconditions hold for Task ${step}`)
```

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2b-plan5`

Run: `git status --short src tests messages` then `node <temp>/p2b5-t14-precheck.mjs 14`
Expected: `git status` prints nothing. The script prints (exit 0):
```
ok      2B-1: PageHeader with title, meta, actions, back and breadcrumbs
ok      2B-1: TabNav with aria-label, items and current; TabNavItem with key, label and href
ok      2B-1: StatStrip with value, foot, footTitle, href and attention
ok      2A: formatCount in src/lib/display-format.ts, formatDateTime in src/lib/utils.ts, Button in ui/button
ok      the keys these tasks read exist in th and en
ok      Tasks 1–13 are in: their files are in MIGRATED_LIST_FILES and the three deleted files are gone
ok      Task 14 has not run yet
ok      src/app/[locale]/(dashboard)/dashboard/page.tsx is unchanged since 6835bdf (hash 89d24675163e75f7)
info    src/app/[locale]/(dashboard)/dashboard/page.tsx: CRLF
preconditions hold for Task 14
```
On any `MISSING` line, stop and report it. A `hash now` line means the file changed after 6835bdf, so the old snippets below may not match: report it, do not guess. "Tasks 1–13 are in" lists the 18 files of Tasks 1–13 that stay; if it is `MISSING`, an earlier task did not add its file to `MIGRATED_LIST_FILES` or did not delete `report-header.tsx`, `report-active-filters.tsx` or `ui/metric-card.tsx`: report it.

Run: `node <temp>/p2b1-precheck.mjs --file D/dashboard/page.tsx`
Expected (after the `info`/`ok` header lines; exit 0):
```
file    src/app/[locale]/(dashboard)/dashboard/page.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LH1        1       1     0     1
args    LH1=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol "src/app/[[]locale]/(dashboard)/dashboard/page.tsx" tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf w/crlf` for all three. Keep them CRLF.

- [ ] **Step 2: Write the failing test (`tests/list-pages-ui.test.ts`, CRLF; it strips `\r` before matching, so its regexes may hold `\n`)**

Save this block as `<temp>/t14-pages-block.ts`:

```ts
// Plan 2B-5 Task 14 (spec 2B §4.4.6, §4.6.1 rule 1, §5.6): the dashboard title is PageHeader with no meta and no buttons,
// the root spaces the blocks 24px apart (the top-level mb-6 and mb-8 are gone) and every count reads through formatCount.
// The employee-home redirect (permission-aware-navigation) and the cancelled-round filter (audit-round-cancellation) stay.
test("the dashboard: PageHeader, blocks 24px apart and every count through formatCount (spec 2B §4.4.6, §4.6.1, §5.6)", () => {
  const source = read(`${D}dashboard/page.tsx`)
  assert.match(source, /return \(\n {4}<div className="space-y-6">\n {6}<PageHeader title=\{t\("title"\)\} \/>\n/)
  assert.equal(source.match(/\bformatCount\(/g)?.length, 12, "seven KPI cards, the action cards, the cross-scope cards, the status overview and the trend's two numbers")
  assert.match(source, /meta: formatDateTime\(log\.createdAt\),/)
  assert.doesNotMatch(source, /<h1\b|toLocaleString\(|className="mb-[68] /)
  assert.match(source, /if \(user && shouldUseEmployeeHome\(user\)\) \{\n\s+redirect\(`\/\$\{locale\}\/my-assets`\)/)
  assert.match(source, /auditRound: \{ isActive: true, status: auditRoundOperationalWhere \}/)
})
```

Run: `node <temp>/p2b5-append.mjs <temp>/t14-pages-block.ts tests/list-pages-ui.test.ts`
Expected: `appended <temp>/t14-pages-block.ts to tests/list-pages-ui.test.ts (CRLF)`

Run: `node --test --test-name-pattern="the dashboard: PageHeader" tests/list-pages-ui.test.ts`
Expected: FAIL, `tests 1 · pass 0 · fail 1`: the input did not match the regular expression `/return \(\n {4}<div className="space-y-6">\n {6}<PageHeader title=\{t\("title"\)\} \/>\n/` (the page still opens with a bare `<div>` and an `<h1>`).

- [ ] **Step 3: Lower the guard row of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs D/dashboard/page.tsx LH1=1:0 --migrated`
Expected (exit 0):
```
LH1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/dashboard/page.tsx
```

Run: `node --test tests/list-frame-guards.test.ts`
Expected: FAIL, `tests 21 · pass 19 · fail 2`, each naming only `src/app/[locale]/(dashboard)/dashboard/page.tsx` (with the page's count before the code change):
- `LH1 page titles (<h1>) come from PageHeader`: `LH1: 6 in 6 files. …` and `src/app/[locale]/(dashboard)/dashboard/page.tsx: 1 > 0`
- `L0 a file 2B is done with keeps only what KEEP allows, and every row names a real file and a known guard`: `LH1 src/app/[locale]/(dashboard)/dashboard/page.tsx: 1 > 0` (the page is now in `MIGRATED_LIST_FILES`)

(`6 in 6 files` is the live LH1 count after Task 13: this page, the work center and the four live `KEEP` rows.)

- [ ] **Step 4: Move the page onto the shared frame (`src/app/[locale]/(dashboard)/dashboard/page.tsx`, CRLF)**

Thirteen exact replacements, top to bottom. Make all of them before you compile: (1) imports what the others use.

(1) Imports `:34-35`. Replace:

```tsx
import { cn } from "@/lib/utils"
import { withPerformanceTiming } from "@/lib/performance-timing"
```

with:

```tsx
import { cn, formatDateTime } from "@/lib/utils"
import { formatCount } from "@/lib/display-format"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { PageHeader } from "@/components/ui/page-header"
```

(2) The seven KPI values `:192-198`. Replace:

```tsx
    { label: t("totalAssets"), value: totalAssets.toLocaleString("th-TH"), icon: <Package size={24} />, color: "text-primary", href: `/${locale}/assets` },
    { label: t("inUse"), value: inUse.toLocaleString("th-TH"), icon: <Monitor size={24} />, color: "text-success", href: `/${locale}/assets` },
    { label: t("readyToDeploy"), value: ready.toLocaleString("th-TH"), icon: <Shield size={24} />, color: "text-info", href: `/${locale}/assets` },
    { label: t("pendingRepair"), value: pendingRepair.toLocaleString("th-TH"), icon: <Wrench size={24} />, color: "text-warning", href: repairStatusMetrics.pendingRepair.href },
    { label: t("underMaintenance"), value: underMaintenance.toLocaleString("th-TH"), icon: <Wrench size={24} />, color: "text-danger", href: repairStatusMetrics.underMaintenance.href },
    { label: t("warrantyExpiring"), value: warrantyExpiring.toLocaleString("th-TH"), icon: <AlertTriangle size={24} />, color: "text-danger", href: `/${locale}/assets` },
    { label: t("crossScopeAssets"), value: crossScopeTotal.toLocaleString("th-TH"), icon: <AlertTriangle size={24} />, color: "text-warning", href: crossScopeAssetsHref },
```

with:

```tsx
    { label: t("totalAssets"), value: formatCount(totalAssets), icon: <Package size={24} />, color: "text-primary", href: `/${locale}/assets` },
    { label: t("inUse"), value: formatCount(inUse), icon: <Monitor size={24} />, color: "text-success", href: `/${locale}/assets` },
    { label: t("readyToDeploy"), value: formatCount(ready), icon: <Shield size={24} />, color: "text-info", href: `/${locale}/assets` },
    { label: t("pendingRepair"), value: formatCount(pendingRepair), icon: <Wrench size={24} />, color: "text-warning", href: repairStatusMetrics.pendingRepair.href },
    { label: t("underMaintenance"), value: formatCount(underMaintenance), icon: <Wrench size={24} />, color: "text-danger", href: repairStatusMetrics.underMaintenance.href },
    { label: t("warrantyExpiring"), value: formatCount(warrantyExpiring), icon: <AlertTriangle size={24} />, color: "text-danger", href: `/${locale}/assets` },
    { label: t("crossScopeAssets"), value: formatCount(crossScopeTotal), icon: <AlertTriangle size={24} />, color: "text-warning", href: crossScopeAssetsHref },
```

(3) The root, the title and the KPI grid `:325-329` (§4.6.1 rule 1). Replace:

```tsx
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">{t("title")}</h1>

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7">
```

with:

```tsx
    <div className="space-y-6">
      <PageHeader title={t("title")} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7">
```

(4) The KPI number `:339`. Replace:

```tsx
                <p className="mt-1 text-3xl font-bold text-foreground">
```

with:

```tsx
                <p className="num mt-1 text-3xl font-bold text-foreground">
```

(5) The action-card section `:349-350` (the next line tells it from the other two sections). Replace:

```tsx
      <section className="mb-8 rounded-lg border border-border bg-surface p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
```

with:

```tsx
      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
```

(6) The action-card number `:370`. Replace:

```tsx
                  <p className="mt-2 text-3xl font-bold text-foreground">{card.value.toLocaleString("th-TH")}</p>
```

with:

```tsx
                  <p className="num mt-2 text-3xl font-bold text-foreground">{formatCount(card.value)}</p>
```

(7) The cross-scope section `:380-381`. Replace:

```tsx
      <section className="mb-8 rounded-lg border border-border bg-surface p-5">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
```

with:

```tsx
      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
```

(8) The cross-scope number `:399`. Replace:

```tsx
              <div className="mt-2 text-2xl font-bold text-foreground">{card.value.toLocaleString("th-TH")}</div>
```

with:

```tsx
              <div className="num mt-2 text-2xl font-bold text-foreground">{formatCount(card.value)}</div>
```

(9) The monthly-trend section `:416-417`. Replace:

```tsx
      <section className="mb-8 rounded-lg border border-border bg-surface p-5">
        <div className="mb-4">
```

with:

```tsx
      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="mb-4">
```

(10) The status-overview number `:449`. Replace:

```tsx
                <span className="text-lg font-bold text-foreground">{item.value.toLocaleString("th-TH")}</span>
```

with:

```tsx
                <span className="num text-lg font-bold text-foreground">{formatCount(item.value)}</span>
```

(11) The trend number `:526`. Replace:

```tsx
          <p className="mt-2 text-3xl font-bold text-foreground">{current.toLocaleString("th-TH")}</p>
```

with:

```tsx
          <p className="num mt-2 text-3xl font-bold text-foreground">{formatCount(current)}</p>
```

(12) The trend's last month `:528`. Replace:

```tsx
            {currentLabel} · {previousLabel}: {previous.toLocaleString("th-TH")}
```

with:

```tsx
            {currentLabel} · {previousLabel}: {formatCount(previous)}
```

(13) The activity time `:623`. Replace:

```tsx
    meta: new Date(log.createdAt).toLocaleString("th-TH"),
```

with:

```tsx
    meta: formatDateTime(log.createdAt),
```

Check: `grep -c 'toLocaleString' "src/app/[locale]/(dashboard)/dashboard/page.tsx"` prints `0`; `grep -c 'formatCount(' …` prints `12`; `grep -n 'className="mb-[68] ' …` prints nothing.

- [ ] **Step 5: Run the tests for this task**

Run: `node --test --test-name-pattern="the dashboard: PageHeader" tests/list-pages-ui.test.ts`
Expected: PASS, `tests 1 · pass 1 · fail 0`.

Run: `node --test tests/permission-aware-navigation.test.ts tests/audit-round-cancellation.test.ts tests/performance-route-instrumentation.test.ts tests/dashboard-cross-scope.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `tests 88 · pass 88 · fail 0` (`permission-aware-navigation` 6 · `audit-round-cancellation` 9 · `performance-route-instrumentation` 1 · `dashboard-cross-scope` 2 · `list-frame-guards` 21 · `visual-foundation-guards` 26 · `form-migration-guards` 23). `tests/loading-boundaries.test.ts` and `tests/page-loading-skeleton.test.ts` run in Step 7 with the full suite (Task 13 leaves both unchanged).

Run: `node <temp>/p2b1-precheck.mjs --file D/dashboard/page.tsx`
Expected (exit 0):
```
file    src/app/[locale]/(dashboard)/dashboard/page.tsx (CRLF) · in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LH1        0       0     0     1
args    (no row holds this file)
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b5-tw-probe.mjs "src/app/[locale]/(dashboard)/dashboard/page.tsx"`
Expected: `checked 99 classes, missing 0` (exit 0). `num` and `space-y-6` are the only classes this task adds; both are in `src` already (`num` is `@utility num` of `globals.css`).

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `tests 2000 · pass 1999 · fail 0 · skipped 1` (one test more than the 1999 after Task 13).
- `npx tsc --noEmit`: no errors (`formatDateTime` takes the `Date` of `SystemLogPresentation.createdAt`).
- `npm run lint`: 0 errors and the 146 warnings under `.agents/`; `npx eslint "src/app/[locale]/(dashboard)/dashboard/page.tsx" tests/list-pages-ui.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 3 files: the page 23 insertions and 21 deletions, `tests/list-pages-ui.test.ts` 13 insertions, `tests/list-frame-guards.test.ts` 1 insertion and 1 deletion (the `MIGRATED_LIST_FILES` line in, the LH1 row out). `node -e "const s=require('fs').readFileSync(process.argv[1],'utf8');console.log((s.match(/\r\n/g)||[]).length,(s.match(/\n/g)||[]).length)" "src/app/[locale]/(dashboard)/dashboard/page.tsx"` prints `628 628` (CRLF throughout). A file that shows every line changed was normalized: restore its line endings before you commit.

- [ ] **Step 8: Commit**

```bash
git add "src/app/[locale]/(dashboard)/dashboard/page.tsx" tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): dashboard title on PageHeader, blocks 24px apart, counts through formatCount (2B-5 task 14)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 18, spec §8.9 dev-check row `/th/dashboard`):** at 1440, 1024, 768 and 375 against the before images: the title at 600 with nothing beside it; every block 24px apart; the numbers as before, the KPI numbers lined up; an activity time without seconds; no sideways page scroll at 375. A seed admin with `asset:view` only (an employee home) still lands on `/th/my-assets`. Throttled, the skeleton has the page's shape (title, strip, panel, two columns) at full width.

---

### Task 15: `D/work-center/page.tsx` · `PageHeader`, the all / mine switch and the queues on `TabNav`, the numbers on `StatStrip` (and the key `workCenter.viewNavigation`)

Spec §8.9 row 9, §10.2 I10 and the message table row 2B-5 (`workCenter.viewNavigation`), §4.4.6 row `D/work-center/page.tsx:360-369`, §5.6 row `D/work-center/page.tsx`, §3.12 (TabNav call sites, row "สลับ งานทั้งหมด/งานของฉัน"), §3.13 (`MetricCard` local `:597` → `StatStrip`), §5.11, §8.3 test table row 2B-5∥2C-3, §10.4 table C column 2B-5 and controller rulings (a), (c) and (e). One file and its message key, one commit. The page is CRLF: exact-string replacements only.

Rulings this task applies:
- **§4.4.6, I1:** the hand-written title block (`:360-364`) becomes `<PageHeader title={t("title")} meta={t("subtitle")} />`; the two `SummaryPill`s (`:366-367`) leave the header and become a `StatStrip` right under it ("เร่งด่วน", "งานที่ต้องติดตาม"). LH1 1 → 0.
- **I10, R-g:** the all / mine switch (`WorkCenterViewLink` ×2, `:372-385`, in the bordered box `:371`) changes the URL (`buildWorkCenterHref`), so it is a `TabNav` of two links named `aria-label={t("viewNavigation")}` (new key `workCenter.viewNavigation` "มุมมองงาน" / "Work view", spec §10.2), not `Segmented`; no client component, so Ctrl+click and no-JavaScript keep working. The two hrefs are the expressions of today, byte for byte. The sentence under the switch (`:386-390`) stays, with its classes; it moves out of the bordered box (`:371`), which goes with the segmented look.
- **§5.6 ("แถบโฟกัส → TabNav ไม่มีตัวนับ"):** the queue links (`WorkCenterFocusLink` ×6, `:393-432`, `aria-label={t("focusNavigation")}`, which set `aria-current` by hand) are a second `TabNav` with no counts; the approvals item still shows only when the inbox is visible. LN1 1 → 0.
- **§5.6, §3.13, R-d:** the metric cards (`MetricCard`, a local function with a shared component's name, `:597`) become `StatStrip` cells: the label, the count through `formatCount`, the whole cell a link to the same queue, the card's sentence as the foot line (`footTitle` gives the cut text in full), and `attention` (the warning foot line with its icon) when the count is above 0 and the old tone was `danger` or `warning`; no tone fill. The icons go (a `StatStrip` cell has none), and with them the `icon` field of `WorkCenterMetric` and nine lucide imports; `toneClass` loses its only caller. LS1 2 → 0, LS2 1 → 0, LN2 1 → 0.
- **Departure (spec silent on more than five cells):** `StatStrip` is one row from `lg`, and the overview has up to eight metrics, which would leave each cell about 90px wide at 1024px (a 28px "1,234" does not fit). The file-local `splitStatRows` cuts the metrics into rows of at most four, as even as they split (8 → 4 + 4, 7 → 4 + 3, 6 → 3 + 3, 5 → 3 + 2), one `StatStrip` per row, 12px apart. Below `lg` each row is two columns, a lone last cell spanning the row (the primitive's rule). This follows the supplier page of plan 2B-4, which split its cells over two strips for the same reason (DESIGN.md "Detail pages").
- **§5.6 (`toLocaleString("th-TH")` `:606`, `:619`, `:733`):** the first two go with `MetricCard` and `SummaryPill`; the count pill of each data-quality group (`:733`) reads `formatCount` and gets `num`. The pill itself stays (pills are 2D's).
- **Kept on purpose (spec §8.3 row 2B-5∥2C-3):** `auditRoundOperationalWhere` in the four audit queries (`tests/audit-round-cancellation.test.ts:124-142`); the queries, `buildWorkCenterHref`, the follow-up panels, `DataQualityFixGroups`, `FollowUpItem` and `EmptyState` (2D: boxes outside lists).
- **Ruling (c):** the one new key is §10.2's `workCenter.viewNavigation`, added with `node scripts/messages-edit.mjs`; every other word is an existing key.
- **Ruling (f) of plan 2B-4, kept here:** 2B does not touch the page again, so it joins `MIGRATED_LIST_FILES` (every counter 0).

What users will see on `/th/work-center`:
- The title at 600 with the page's sentence under it, then one framed strip with "เร่งด่วน" and "งานที่ต้องติดตาม" (no red or blue fill).
- "งานทั้งหมด / งานของฉัน" is an underlined tab row (it was a pill toggle with a solid blue chip); the sentence under it explains the chosen view, as before. Ctrl+click opens a view in a new tab.
- The queue links ("งานเร่งด่วน", "งานรออนุมัติ", "ทะเบียนทรัพย์สินที่ควรเติมข้อมูล" …) are a second underlined tab row; on a phone it scrolls sideways inside itself.
- The metric cards are framed strips of up to four numbers per row, without colored fills or icons. Each number still opens its queue; its sentence is the gray line under it (cut with "…", in full on hover), amber with a warning icon when the count needs action.
- The follow-up panels below are unchanged.

Not in this task: the panels, the follow-up rows and the empty boxes (2D) · the dashboard (Task 14) · docs (Task 19). Do not run a formatter.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/work-center/page.tsx` (`i/lf w/crlf`; 7 exact replacements)
- Modify: `messages/th.json`, `messages/en.json` (`i/lf w/crlf`; through `node scripts/messages-edit.mjs` only)
- Modify: `tests/list-pages-ui.test.ts` (`i/lf w/crlf`; one block appended with `p2b5-append.mjs`)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only, never committed: `t15-messages.json`, `t15-pages-block.ts`

**Must keep passing without edits:**
- `tests/audit-round-cancellation.test.ts` (`auditRoundOperationalWhere`) · `tests/work-center-view.test.ts` · `tests/work-center-metrics.test.ts` · `tests/app-icon.test.ts`
- `tests/messages-parity.test.ts` · `tests/thai-glossary.test.ts`
- `tests/visual-foundation-guards.test.ts` (no row of this page) · `tests/form-migration-guards.test.ts`

**Interfaces:**
- Consumes:
  - 2B-1: `PageHeader({ title, meta?, … })` from `@/components/ui/page-header`; `TabNav({ "aria-label": string, items: readonly TabNavItem[], current: string, scroll?, onSelect?, linkClassName?, className?, …<nav> props })` with `TabNavItem = { key: string; label: ReactNode; href: string; count?: string; icon?: ReactNode }` from `@/components/ui/tab-nav` (server-safe; links with `aria-current="page"` on the current item); `StatStrip({ items: readonly StatStripItem[], className? })` with `StatStripItem = { key: string; label: string; value: string; unit?; foot?: ReactNode; footTitle?: string; href?: string; current?; scroll?; attention?: boolean }` from `@/components/ui/stat-strip`.
  - 2A: `formatCount(value: number): string` from `@/lib/display-format`.
  - `scripts/messages-edit.mjs <changes.json>` (`{ "set": { "th": { "ns.key": "text" }, "en": { … } } }`; prints `messages updated: N th, N en, N deleted`).
  - Task 14: `<temp>/p2b5-t14-precheck.mjs`. Task 0: `<temp>/p2b1-precheck.mjs`, `<temp>/p2b-budget.mjs`. Task 1: `<temp>/p2b5-append.mjs`, `<temp>/p2b5-tw-probe.mjs`.
- Produces:
  - `workCenter.viewNavigation` in `messages/th.json` ("มุมมองงาน") and `messages/en.json` ("Work view"), the last key of `workCenter`.
  - The page on `PageHeader`, two `TabNav`s and `StatStrip`, with the file-local `splitStatRows<T>(items: readonly T[], most = 4): T[][]`; in `MIGRATED_LIST_FILES`; its rows gone from LFG `BUDGETS`.
  - The test `the work center: PageHeader, a summary StatStrip, the view switch and the queues on TabNav, metric rows of at most four (spec 2B I10, §5.6)` in `tests/list-pages-ui.test.ts`.

| guard | `D/work-center/page.tsx` before → after | plan total (budget) before → after |
|---|---|---|
| LFG LH1 | 1 → – | 7 in 7 rows → 6 in 6 (live 5 → 4) |
| LFG LS1 | 2 → – | 7 in 5 rows → 5 in 4 |
| LFG LS2 | 1 → – | 1 in 1 row → 0 |
| LFG LN1 | 1 → – | 3 in 2 rows → 2 in 1 |
| LFG LN2 | 1 → – | 3 in 3 rows → 2 in 2 (`master-data-layout.tsx` is Task 16's) |
| `MIGRATED_LIST_FILES` | – → joins | +1 |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b5-t14-precheck.mjs 15`
Expected: `git status` prints nothing. The script prints (exit 0):
```
ok      2B-1: PageHeader with title, meta, actions, back and breadcrumbs
ok      2B-1: TabNav with aria-label, items and current; TabNavItem with key, label and href
ok      2B-1: StatStrip with value, foot, footTitle, href and attention
ok      2A: formatCount in src/lib/display-format.ts, formatDateTime in src/lib/utils.ts, Button in ui/button
ok      the keys these tasks read exist in th and en
ok      Tasks 1–13 are in: their files are in MIGRATED_LIST_FILES and the three deleted files are gone
ok      Task 14 is in
ok      Task 15 has not run yet
ok      workCenter.viewNavigation is not in th or en yet
ok      src/app/[locale]/(dashboard)/work-center/page.tsx is unchanged since 6835bdf (hash 91d913f0d170aa22)
info    src/app/[locale]/(dashboard)/work-center/page.tsx: CRLF
preconditions hold for Task 15
```
On any `MISSING` line, stop and report it. A `hash now` line means the file changed after 6835bdf: report it, do not guess.

Run: `node <temp>/p2b1-precheck.mjs --file D/work-center/page.tsx`
Expected (after the `info`/`ok` header lines; exit 0):
```
file    src/app/[locale]/(dashboard)/work-center/page.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LH1        1       1     0     1
LS1        2       2     0     2
LS2        1       1     0     1
LN1        1       1     0     1
LN2        1       1     0     1
args    LH1=1:1 LS1=2:2 LS2=1:1 LN1=1:1 LN2=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol "src/app/[[]locale]/(dashboard)/work-center/page.tsx" messages/th.json messages/en.json tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf w/crlf` for all five. Keep them CRLF (`messages-edit.mjs` keeps each file's line ending).

- [ ] **Step 2: Write the failing test (`tests/list-pages-ui.test.ts`, CRLF; it strips `\r` before matching, so its regexes may hold `\n`)**

Save this block as `<temp>/t15-pages-block.ts`:

```ts
// Plan 2B-5 Task 15 (spec 2B I10, §4.4.6, §5.6): the work center on the shared frame. "งานทั้งหมด / งานของฉัน" changes
// the URL, so it is a TabNav of two links named by workCenter.viewNavigation (R-g, not Segmented), and the sentence under
// it stays. The queue links are a second TabNav; the two summary numbers are a StatStrip under the header and the metrics
// StatStrips of at most four cells. The cancelled-round filter stays (audit-round-cancellation).
test("the work center: PageHeader, a summary StatStrip, the view switch and the queues on TabNav, metric rows of at most four (spec 2B I10, §5.6)", () => {
  const source = read(`${D}work-center/page.tsx`)
  assert.match(source, /<PageHeader title=\{t\("title"\)\} meta=\{t\("subtitle"\)\} \/>/)
  assert.equal(source.match(/<TabNav\b/g)?.length, 2, "the view switch and the queue links")
  assert.match(source, /<TabNav\n\s+aria-label=\{t\("viewNavigation"\)\}\n\s+current=\{workCenterParams\.view\}/)
  assert.match(source, /\{ key: "all", label: t\("allWork"\), href: buildWorkCenterHref\(locale, workCenterParams, \{ view: "all", panel: workCenterParams\.panel \}\) \}/)
  assert.match(source, /\{ key: "mine", label: t\("myWork"\), href: buildWorkCenterHref\(locale, workCenterParams, \{ view: "mine", panel: workCenterParams\.panel \}\) \}/)
  assert.match(source, /<p className="text-xs text-warning">\{t\("myWorkUnavailable"\)\}<\/p>/, "the sentence under the switch stays (I10)")
  assert.match(source, /<p className="text-xs text-muted-foreground">\{isMineView \? t\("myWorkDetail"\) : t\("allWorkDetail"\)\}<\/p>/)
  assert.match(source, /<TabNav\n\s+aria-label=\{t\("focusNavigation"\)\}\n\s+current=\{workCenterParams\.panel\}/)
  assert.equal(source.match(/<StatStrip\b/g)?.length, 2, "the summary strip and the metric rows")
  assert.match(source, /attention: metric\.value > 0 && \(metric\.tone === "danger" \|\| metric\.tone === "warning"\)/)
  assert.match(source, /function splitStatRows<T>\(items: readonly T\[\], most = 4\): T\[\]\[\] \{/)
  assert.match(source, /status: auditRoundOperationalWhere/)
  assert.doesNotMatch(source, /function (?:MetricCard|SummaryPill|WorkCenterViewLink|WorkCenterFocusLink|toneClass)\b|<h1\b|aria-current=|toLocaleString\(|<Segmented\b|"use client"/)
  for (const locale of ["th", "en"] as const) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { workCenter: Record<string, unknown> }
    assert.equal(typeof messages.workCenter.viewNavigation, "string", `${locale}: workCenter.viewNavigation`)
  }
})
```

Run: `node <temp>/p2b5-append.mjs <temp>/t15-pages-block.ts tests/list-pages-ui.test.ts`
Expected: `appended <temp>/t15-pages-block.ts to tests/list-pages-ui.test.ts (CRLF)`

Run: `node --test --test-name-pattern="the work center: PageHeader" tests/list-pages-ui.test.ts`
Expected: FAIL, `tests 1 · pass 0 · fail 1`: the input did not match the regular expression `/<PageHeader title=\{t\("title"\)\} meta=\{t\("subtitle"\)\} \/>/`.

- [ ] **Step 3: Lower the guard rows of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs D/work-center/page.tsx LH1=1:0 LS1=2:0 LS2=1:0 LN1=1:0 LN2=1:0 --migrated`
Expected (exit 0):
```
LH1: 1 -> 0 (row deleted)
LS1: 2 -> 0 (row deleted)
LS2: 1 -> 0 (row deleted)
LN1: 1 -> 0 (row deleted)
LN2: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/work-center/page.tsx
```

Run: `node --test tests/list-frame-guards.test.ts`
Expected: FAIL, `tests 21 · pass 15 · fail 6`, each naming only `src/app/[locale]/(dashboard)/work-center/page.tsx` (with the page's count before the code change; the totals are those after Task 14):
- `LH1 page titles (<h1>) come from PageHeader` (`LH1: 5 in 5 files. …`, `…/work-center/page.tsx: 1 > 0`) · `LS1 number tiles come from StatStrip, not a local tile function` (`7 in 5`, `2 > 0`) · `LS2 MetricCard gives way to StatStrip` (`1 in 1`, `1 > 0`)
- `LN1 aria-current="page" is set by TabNav, StatStrip, Pagination and the menus, not by hand` (`3 in 2`, `1 > 0`) · `LN2 no local function takes the name of a shared component` (`3 in 3`, `1 > 0`)
- `L0 a file 2B is done with keeps only what KEEP allows, and every row names a real file and a known guard`: `LH1 …: 1 > 0`, `LS1 …: 2 > 0`, `LS2 …: 1 > 0`, `LN1 …: 1 > 0`, `LN2 …: 1 > 0` for the page (now in `MIGRATED_LIST_FILES`)

- [ ] **Step 4: Add the key (`messages/th.json`, `messages/en.json`, CRLF)**

Save this file as `<temp>/t15-messages.json`:

```json
{
  "set": {
    "th": { "workCenter.viewNavigation": "มุมมองงาน" },
    "en": { "workCenter.viewNavigation": "Work view" }
  }
}
```

Run: `node scripts/messages-edit.mjs <temp>/t15-messages.json`
Expected: `messages updated: 1 th, 1 en, 0 deleted`. `git diff messages` shows, in each file, only the last line of `workCenter` gaining a comma (`"disposalStatus_approved": "อนุมัติแล้ว",` / `"disposalStatus_approved": "Approved",`) and one new line after it (`"viewNavigation": "มุมมองงาน"` / `"viewNavigation": "Work view"`).

- [ ] **Step 5: Move the page onto the shared frame (`src/app/[locale]/(dashboard)/work-center/page.tsx`, CRLF)**

Seven exact replacements, top to bottom. Make all of them before you compile: (1) imports what (4) and (6) use, and (3) and (5) remove what used the dropped imports.

(1) Imports `:5-16`: the metric icons go with the metric cards; `ArrowRight` stays (the follow-up panels). Replace:

```tsx
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  Clock,
  FileCheck2,
  FileWarning,
  Package,
  ShieldAlert,
  Trash2,
  Wrench,
} from "lucide-react"
```

with:

```tsx
import { ArrowRight } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatStrip, type StatStripItem } from "@/components/ui/stat-strip"
import { TabNav } from "@/components/ui/tab-nav"
import { formatCount } from "@/lib/display-format"
```

(2) The metric type `:51-53`: a `StatStrip` cell has no icon. Replace:

```tsx
  tone: "danger" | "warning" | "primary" | "success" | "muted"
  icon: React.ReactNode
}
```

with:

```tsx
  tone: "danger" | "warning" | "primary" | "success" | "muted"
}
```

(3) The eleven metrics `:234-334` lose their `icon` line; everything else in each entry stays. Replace:

```tsx
  const metricMap: Record<WorkCenterMetricKey, WorkCenterMetric> = {
    approvalInbox: {
      key: "approvalInbox",
      label: t("approvalInbox"),
      value: approvalInboxCounts.total,
      detail: t("approvalInboxDetail"),
      href: `/${locale}/admin/approvals`,
      tone: approvalInboxCounts.total > 0 ? "danger" : "primary",
      icon: <FileCheck2 className="h-5 w-5" />,
    },
    missingCustodian: {
      key: "missingCustodian",
      label: t("missingCustodian"),
      value: missingCustodian,
      detail: t("missingCustodianDetail"),
      href: `/${locale}/assets`,
      tone: "warning",
      icon: <Package className="h-5 w-5" />,
    },
    missingSerial: {
      key: "missingSerial",
      label: t("missingSerial"),
      value: missingSerial,
      detail: t("missingSerialDetail"),
      href: `/${locale}/assets`,
      tone: "muted",
      icon: <FileWarning className="h-5 w-5" />,
    },
    missingPhoto: {
      key: "missingPhoto",
      label: t("missingPhoto"),
      value: missingPhoto,
      detail: t("missingPhotoDetail"),
      href: `/${locale}/assets`,
      tone: "muted",
      icon: <ShieldAlert className="h-5 w-5" />,
    },
    openRepairs: {
      key: "openRepairs",
      label: t("openRepairs"),
      value: openRepairs,
      detail: t("openRepairsDetail"),
      href: `/${locale}/maintenance?status=in_progress`,
      tone: openRepairs > 0 ? "warning" : "muted",
      icon: <Wrench className="h-5 w-5" />,
    },
    duePm: {
      key: "duePm",
      label: t("duePm"),
      value: duePm,
      detail: t("duePmDetail"),
      href: `/${locale}/maintenance#pm-due`,
      tone: duePm > 0 ? "warning" : "muted",
      icon: <Clock className="h-5 w-5" />,
    },
    pendingAuditFindings: {
      key: "pendingAuditFindings",
      label: t("pendingAuditFindings"),
      value: pendingAuditFindings,
      detail: t("pendingAuditFindingsDetail"),
      href: `/${locale}/audit/findings?status=pending`,
      tone: "danger",
      icon: <ClipboardCheck className="h-5 w-5" />,
    },
    openAuditActions: {
      key: "openAuditActions",
      label: t("openAuditActions"),
      value: openAuditActions,
      detail: t("openAuditActionsDetail"),
      href: `/${locale}/audit/findings?status=all`,
      tone: "warning",
      icon: <AlertTriangle className="h-5 w-5" />,
    },
    pendingAuditItems: {
      key: "pendingAuditItems",
      label: t("pendingAuditItems"),
      value: pendingAuditItems,
      detail: t("pendingAuditItemsDetail"),
      href: `/${locale}/audit/rounds`,
      tone: "primary",
      icon: <ClipboardCheck className="h-5 w-5" />,
    },
    pendingDisposals: {
      key: "pendingDisposals",
      label: t("pendingDisposals"),
      value: pendingDisposals,
      detail: t("pendingDisposalsDetail"),
      href: `/${locale}/disposal?status=pending`,
      tone: "danger",
      icon: <Trash2 className="h-5 w-5" />,
    },
    approvedDisposals: {
      key: "approvedDisposals",
      label: t("approvedDisposals"),
      value: approvedDisposals,
      detail: t("approvedDisposalsDetail"),
      href: `/${locale}/disposal?status=approved`,
      tone: "warning",
      icon: <Trash2 className="h-5 w-5" />,
    },
  }
```

with:

```tsx
  const metricMap: Record<WorkCenterMetricKey, WorkCenterMetric> = {
    approvalInbox: {
      key: "approvalInbox",
      label: t("approvalInbox"),
      value: approvalInboxCounts.total,
      detail: t("approvalInboxDetail"),
      href: `/${locale}/admin/approvals`,
      tone: approvalInboxCounts.total > 0 ? "danger" : "primary",
    },
    missingCustodian: {
      key: "missingCustodian",
      label: t("missingCustodian"),
      value: missingCustodian,
      detail: t("missingCustodianDetail"),
      href: `/${locale}/assets`,
      tone: "warning",
    },
    missingSerial: {
      key: "missingSerial",
      label: t("missingSerial"),
      value: missingSerial,
      detail: t("missingSerialDetail"),
      href: `/${locale}/assets`,
      tone: "muted",
    },
    missingPhoto: {
      key: "missingPhoto",
      label: t("missingPhoto"),
      value: missingPhoto,
      detail: t("missingPhotoDetail"),
      href: `/${locale}/assets`,
      tone: "muted",
    },
    openRepairs: {
      key: "openRepairs",
      label: t("openRepairs"),
      value: openRepairs,
      detail: t("openRepairsDetail"),
      href: `/${locale}/maintenance?status=in_progress`,
      tone: openRepairs > 0 ? "warning" : "muted",
    },
    duePm: {
      key: "duePm",
      label: t("duePm"),
      value: duePm,
      detail: t("duePmDetail"),
      href: `/${locale}/maintenance#pm-due`,
      tone: duePm > 0 ? "warning" : "muted",
    },
    pendingAuditFindings: {
      key: "pendingAuditFindings",
      label: t("pendingAuditFindings"),
      value: pendingAuditFindings,
      detail: t("pendingAuditFindingsDetail"),
      href: `/${locale}/audit/findings?status=pending`,
      tone: "danger",
    },
    openAuditActions: {
      key: "openAuditActions",
      label: t("openAuditActions"),
      value: openAuditActions,
      detail: t("openAuditActionsDetail"),
      href: `/${locale}/audit/findings?status=all`,
      tone: "warning",
    },
    pendingAuditItems: {
      key: "pendingAuditItems",
      label: t("pendingAuditItems"),
      value: pendingAuditItems,
      detail: t("pendingAuditItemsDetail"),
      href: `/${locale}/audit/rounds`,
      tone: "primary",
    },
    pendingDisposals: {
      key: "pendingDisposals",
      label: t("pendingDisposals"),
      value: pendingDisposals,
      detail: t("pendingDisposalsDetail"),
      href: `/${locale}/disposal?status=pending`,
      tone: "danger",
    },
    approvedDisposals: {
      key: "approvedDisposals",
      label: t("approvedDisposals"),
      value: approvedDisposals,
      detail: t("approvedDisposalsDetail"),
      href: `/${locale}/disposal?status=approved`,
      tone: "warning",
    },
  }
```

(4) The page frame `:358-438`: the header, the two summary numbers, the view switch, the queue links and the metrics. The follow-up panels after `:438` stay. Replace:

```tsx
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
          <SummaryPill label={t("urgent")} value={urgentCount} tone="danger" />
          <SummaryPill label={t("allFollowUps")} value={followUpCount} tone="primary" />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-2 rounded-md border border-border bg-background p-1 sm:inline-flex">
          <WorkCenterViewLink
            href={buildWorkCenterHref(locale, workCenterParams, { view: "all", panel: workCenterParams.panel })}
            active={workCenterParams.view === "all"}
          >
            {t("allWork")}
          </WorkCenterViewLink>
          <WorkCenterViewLink
            href={buildWorkCenterHref(locale, workCenterParams, { view: "mine", panel: workCenterParams.panel })}
            active={workCenterParams.view === "mine"}
          >
            {t("myWork")}
          </WorkCenterViewLink>
        </div>
        {isMineView && !userScope.enabled ? (
          <p className="text-xs text-warning">{t("myWorkUnavailable")}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{isMineView ? t("myWorkDetail") : t("allWorkDetail")}</p>
        )}
      </div>

      <nav aria-label={t("focusNavigation")} className="flex flex-wrap gap-2">
        <WorkCenterFocusLink
          href={buildWorkCenterHref(locale, workCenterParams, { panel: "overview" })}
          active={workCenterParams.panel === "overview"}
        >
          {t("focusPriority")}
        </WorkCenterFocusLink>
        {approvalInboxVisible ? (
          <WorkCenterFocusLink
            href={buildWorkCenterHref(locale, workCenterParams, { panel: "approvals" })}
            active={workCenterParams.panel === "approvals"}
          >
            {t("approvalInbox")}
          </WorkCenterFocusLink>
        ) : null}
        <WorkCenterFocusLink
          href={buildWorkCenterHref(locale, workCenterParams, { panel: "assets" })}
          active={workCenterParams.panel === "assets"}
        >
          {t("assetDataTitle")}
        </WorkCenterFocusLink>
        <WorkCenterFocusLink
          href={buildWorkCenterHref(locale, workCenterParams, { panel: "maintenance" })}
          active={workCenterParams.panel === "maintenance"}
        >
          {t("maintenanceTitle")}
        </WorkCenterFocusLink>
        <WorkCenterFocusLink
          href={buildWorkCenterHref(locale, workCenterParams, { panel: "audit" })}
          active={workCenterParams.panel === "audit"}
        >
          {t("auditTitle")}
        </WorkCenterFocusLink>
        <WorkCenterFocusLink
          href={buildWorkCenterHref(locale, workCenterParams, { panel: "disposal" })}
          active={workCenterParams.panel === "disposal"}
        >
          {t("disposalTitle")}
        </WorkCenterFocusLink>
      </nav>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.key} metric={metric} />
        ))}
      </section>
```

with:

```tsx
  // One cell per metric: the number, the queue it opens, its sentence as the foot line, and the warning foot when a
  // count that needs action is above 0 (R-d: no tone fill). StatStrip is one row from lg, so the cells go in rows of
  // at most four: eight cells in one row would leave each about 90px at 1024px.
  const metricRows = splitStatRows(
    metrics.map((metric): StatStripItem => ({
      key: metric.key,
      label: metric.label,
      value: formatCount(metric.value),
      href: metric.href,
      foot: metric.detail,
      footTitle: metric.detail,
      attention: metric.value > 0 && (metric.tone === "danger" || metric.tone === "warning"),
    })),
  )

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} meta={t("subtitle")} />

      <StatStrip
        items={[
          { key: "urgent", label: t("urgent"), value: formatCount(urgentCount) },
          { key: "allFollowUps", label: t("allFollowUps"), value: formatCount(followUpCount) },
        ]}
      />

      <div className="space-y-2">
        <TabNav
          aria-label={t("viewNavigation")}
          current={workCenterParams.view}
          items={[
            { key: "all", label: t("allWork"), href: buildWorkCenterHref(locale, workCenterParams, { view: "all", panel: workCenterParams.panel }) },
            { key: "mine", label: t("myWork"), href: buildWorkCenterHref(locale, workCenterParams, { view: "mine", panel: workCenterParams.panel }) },
          ]}
        />
        {isMineView && !userScope.enabled ? (
          <p className="text-xs text-warning">{t("myWorkUnavailable")}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{isMineView ? t("myWorkDetail") : t("allWorkDetail")}</p>
        )}
      </div>

      <TabNav
        aria-label={t("focusNavigation")}
        current={workCenterParams.panel}
        items={[
          { key: "overview", label: t("focusPriority"), href: buildWorkCenterHref(locale, workCenterParams, { panel: "overview" }) },
          ...(approvalInboxVisible ? [{ key: "approvals", label: t("approvalInbox"), href: buildWorkCenterHref(locale, workCenterParams, { panel: "approvals" }) }] : []),
          { key: "assets", label: t("assetDataTitle"), href: buildWorkCenterHref(locale, workCenterParams, { panel: "assets" }) },
          { key: "maintenance", label: t("maintenanceTitle"), href: buildWorkCenterHref(locale, workCenterParams, { panel: "maintenance" }) },
          { key: "audit", label: t("auditTitle"), href: buildWorkCenterHref(locale, workCenterParams, { panel: "audit" }) },
          { key: "disposal", label: t("disposalTitle"), href: buildWorkCenterHref(locale, workCenterParams, { panel: "disposal" }) },
        ]}
      />

      {metricRows.length > 0 ? (
        <div className="space-y-3">
          {metricRows.map((row) => (
            <StatStrip key={row[0].key} items={row} />
          ))}
        </div>
      ) : null}
```

(5) The four local link and tile functions `:597-651` (`MetricCard` and `SummaryPill` are guard LS1, `MetricCard` also LN2; `WorkCenterFocusLink` set `aria-current` by hand, guard LN1) give way to the row splitter. Replace:

```tsx
function MetricCard({ metric }: { metric: WorkCenterMetric }) {
  return (
    <Link
      href={metric.href}
      className={`rounded-lg border p-4 transition-colors hover:bg-accent ${toneClass(metric.tone)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{metric.label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{metric.value.toLocaleString("th-TH")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
        </div>
        <div className="shrink-0 text-current">{metric.icon}</div>
      </div>
    </Link>
  )
}

function SummaryPill({ label, value, tone }: { label: string; value: number; tone: "danger" | "primary" }) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${tone === "danger" ? "border-danger-border bg-danger-soft" : "border-primary-border bg-primary-soft"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value.toLocaleString("th-TH")}</p>
    </div>
  )
}

function WorkCenterViewLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center justify-center rounded px-3 py-1.5 text-center text-sm font-medium transition-colors sm:min-h-0 ${
        active ? "bg-primary text-white" : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  )
}

function WorkCenterFocusLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-11 items-center justify-center rounded-md border px-3 text-center text-xs font-medium transition-colors sm:min-h-0 sm:h-9 ${
        active
          ? "border-primary bg-primary text-white"
          : "border-border bg-surface text-muted-foreground hover:border-primary-border hover:bg-accent hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  )
}
```

with:

```tsx
// Rows of at most `most` cells, as even as they split: 8 → 4 + 4, 7 → 4 + 3, 6 → 3 + 3, 5 → 3 + 2.
function splitStatRows<T>(items: readonly T[], most = 4): T[][] {
  const rowCount = Math.ceil(items.length / most)
  const perRow = Math.ceil(items.length / rowCount)
  return Array.from({ length: rowCount }, (_, index) => items.slice(index * perRow, (index + 1) * perRow))
}
```

(6) The count in each data-quality group `:732-734` (§5.6). Replace:

```tsx
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
                {group.count.toLocaleString("th-TH")}
              </span>
```

with:

```tsx
              <span className="num rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
                {formatCount(group.count)}
              </span>
```

(7) `toneClass` `:890-896` had one caller, the old `MetricCard`. Replace:

```tsx
function applyWorkCenterScope<T>(where: T, active: boolean, scopeWhere: T): T {
  if (!active) return where
  return { AND: [where, scopeWhere] } as T
}

function toneClass(tone: WorkCenterMetric["tone"]) {
  if (tone === "danger") return "border-danger-border bg-danger-soft text-danger"
  if (tone === "warning") return "border-warning-border bg-warning-soft text-warning"
  if (tone === "primary") return "border-primary-border bg-primary-soft text-primary"
  if (tone === "success") return "border-success-border bg-success-soft text-success"
  return "border-border bg-surface text-muted-foreground"
}
```

with:

```tsx
function applyWorkCenterScope<T>(where: T, active: boolean, scopeWhere: T): T {
  if (!active) return where
  return { AND: [where, scopeWhere] } as T
}
```

Check: `grep -c 'toLocaleString\|aria-current\|<h1' "src/app/[locale]/(dashboard)/work-center/page.tsx"` prints `0`; `grep -c '<TabNav' …` prints `2`; `grep -c '<StatStrip' …` prints `2`.

- [ ] **Step 6: Run the tests for this task**

Run: `node --test --test-name-pattern="the work center: PageHeader" tests/list-pages-ui.test.ts`
Expected: PASS, `tests 1 · pass 1 · fail 0`.

Run: `node --test tests/audit-round-cancellation.test.ts tests/work-center-view.test.ts tests/work-center-metrics.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `tests 94 · pass 94 · fail 0` (`audit-round-cancellation` 9 · `work-center-view` 6 · `work-center-metrics` 3 · `messages-parity` 3 · `thai-glossary` 3 · `list-frame-guards` 21 · `visual-foundation-guards` 26 · `form-migration-guards` 23).

Run: `node <temp>/p2b1-precheck.mjs --file D/work-center/page.tsx`
Expected (exit 0):
```
file    src/app/[locale]/(dashboard)/work-center/page.tsx (CRLF) · in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LH1        0       0     0     1
LS1        0       0     0     2
LS2        0       0     0     1
LN1        0       0     0     1
LN2        0       0     0     1
args    (no row holds this file)
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

- [ ] **Step 7: Prove every class compiles**

Run: `node <temp>/p2b5-tw-probe.mjs "src/app/[locale]/(dashboard)/work-center/page.tsx"`
Expected: `checked 69 classes, missing 0` (exit 0). The only class this task adds is `num` on the group count; `space-y-2` and `space-y-3` are in `src` already.

- [ ] **Step 8: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `tests 2001 · pass 2000 · fail 0 · skipped 1` (one test more than the 2000 after Task 14).
- `npx tsc --noEmit`: no errors (the `StatStripItem` return type of the metric mapper; `splitStatRows` is generic).
- `npm run lint`: 0 errors and the 146 warnings under `.agents/`; `npx eslint "src/app/[locale]/(dashboard)/work-center/page.tsx" tests/list-pages-ui.test.ts` prints nothing (no unused import or function is left: `toneClass`, the nine icons and `React.ReactNode` in the metric type are gone, `Link` and `React` are still used by the panels).

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 5 files: the page 65 insertions and 160 deletions, `messages/th.json` and `messages/en.json` 2 insertions and 1 deletion each, `tests/list-pages-ui.test.ts` 25 insertions, `tests/list-frame-guards.test.ts` 1 insertion and 10 deletions (the `MIGRATED_LIST_FILES` line in; the five rows out, with the five `// 2B-5` group lines that headed only them). `node -e "const s=require('fs').readFileSync(process.argv[1],'utf8');console.log((s.match(/\r\n/g)||[]).length,(s.match(/\n/g)||[]).length)" "src/app/[locale]/(dashboard)/work-center/page.tsx"` prints `801 801` (CRLF throughout); the same check on the two message files prints `4319 4319` each. A file that shows every line changed was normalized: restore its line endings before you commit.

- [ ] **Step 9: Commit**

```bash
git add "src/app/[locale]/(dashboard)/work-center/page.tsx" messages/th.json messages/en.json tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): work center on PageHeader, TabNav for the view switch and the queues, StatStrip numbers (2B-5 task 15)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 5 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 18, spec §8.9 dev-check row `/th/work-center`, I10):** at 1440, 1024, 768 and 375, as the seed admin and as a user with no employee link: the title at 600 and its sentence; the two-cell strip; "งานทั้งหมด / งานของฉัน" as underlined tabs, the chosen one marked, Ctrl+click opens the other view in a new tab, and with JavaScript off a click still changes the view; the sentence under it ("บัญชีนี้ยังไม่ได้ผูกพนักงาน …" in amber for the unlinked user on "งานของฉัน"); the queue row scrolls inside itself at 375 with no page scroll; each focus panel (`?panel=assets`, `maintenance`, `audit`, `disposal`, `approvals`) shows its metric row(s) of at most four, the overview two rows; at 1024 every number fits its cell; a count above 0 that needs action has the amber foot line with the icon; each cell opens its queue. NVDA: the two tab rows read "มุมมองงาน" and "เลือกคิวงานที่ต้องติดตาม" as navigation, the current item as current page; a strip reads label then value.

---

### Task 16: `c/master-data/master-data-layout.tsx` loses its old header, column headers and pager; `src/lib/design-system.ts` marks its two caller-less helpers for 2D (two commits)

Spec §8.9 row 10, §8.13 #6, §10.3 bullet 2B-5 ("ลบ `MasterDataHeader`, `MasterDataPagination`, `SortableColumnHeader`, `ColumnHeader`"), §4.4.4 (no caller of `MasterDataHeader` after 2B-3), §10.6 row 2B-5 (`src/lib/design-system.ts:93` comment) with §6's checklist row "`src/lib/design-system.ts:93`", §10.4 table D (spec §9.6 row 2B-5: `tests/design-system.test.ts:25-46` passes unedited), §5.10 #6, §8.3 test table row 2B-5∥2C-5 and controller rulings (a), (b) and P1. Two files, one commit each (Part A, Part B). Both files and the tests they touch are CRLF: exact-string replacements only.

Rulings this task applies:
- **R-h, §8.13 #6 (Part A):** `MasterDataHeader` (no caller since plan 2B-3), `ColumnHeader`, `SortableColumnHeader` and `MasterDataPagination` (no caller once Task 1 moved `D/admin/roles/page.tsx` onto `DataTableHead`) are deleted, with the imports only they used (`Link`, three icons, `buttonVariants`, `PageHeader`, the three names of `@/lib/master-data-query`). `MasterDataSearch` (six pages) and `ActiveBadge` (nine pages; a pill, 2D) stay, byte for byte. LH2 1 → 0, LT1 2 → 0, LT2 1 → 0, LT4 1 → 0, LT5 2 → 0, LN2 1 → 0; the file joins `MIGRATED_LIST_FILES` (2B is done with it).
- **Tests that read the deleted wrapper (Part A; departure: spec table A has no 2B-5 row for them, because the deletion is spec §10.3's):** `tests/list-primitives-ui.test.ts:64-71` pinned the thin wrapper "until its last callers move (I2)"; it becomes the test that the file exports only `MasterDataSearch` and `ActiveBadge` (the failing test first). `:318` in the `MasterDataSearch` test pins the import `{ Button, buttonVariants }`, and `buttonVariants` was the deleted header's: the pin reads `{ Button }`. `tests/asset-register-filter-ui.test.ts:127`, `:134` read the wrapper's `compactOnMobile ? "mb-4 md:mb-6" : "mb-6"`; the same 16px / 24px gap now lives on the wrapper's last caller, `D/assets/page.tsx` (`className="mb-4 md:mb-6"` beside `compactOnMobile`, plan 2B-3), so the pin reads it there. Spec §8.3 names neither test for the 2B-5∥2C-5 pair, so 2C plan 5 does not edit them.
- **Part B, spec §10 over the dispatch (departure from the controller's Task 16 line, see the note at the end of this task):** spec §10.4 table D adopts §9.6, whose row 2B-5 keeps `tests/design-system.test.ts:25-46` unedited ("`getTableShellClasses`, `getEmptyStateClasses`, `getMetricCardToneClasses`, `getActionButtonClasses` คงไว้ให้ 2D ลบ"); §5.10 #6 and §3 (`03-primitives.md:286`, `:982`) say the same for `getTableShellClasses`. Only §8.9 row 10, a section file, says to delete it. So Part B deletes nothing: it marks `getTableShellClasses` (no caller since Task 3) `@deprecated`, and rewrites the `:93` comment of `getActionButtonClasses` (no caller since Task 9) to say so (spec §10.6 row 2B-5). A new test fails if either helper gets a caller again.
- **P1 and spec §8.3 row 2B-5∥2C-5:** `getMobileSafeBottomPaddingClasses` (`src/lib/design-system.ts:112-114`, pinned by `tests/audit-scan-search-ui.test.ts:188`) stays untouched for 2D; `getMetricCardToneClasses` stays although `ui/metric-card.tsx` is gone (Task 13; `tests/design-system.test.ts:26-32`, 2D).
- **Ruling (b):** no VFG line changes in this task.

What users will see: nothing. No page renders the deleted helpers, and Part B changes comments only.

Not in this task: `ActiveBadge` and `MasterDataSearch` (stay) · `master-data-delete-button.tsx` (no caller, `tests/confirm-dialog-ui.test.ts:36`, 2D) · `getEmptyStateClasses`, `getResponsiveTableScrollClasses`, `getMobileCardListClasses`, `getDesktopTableOnlyClasses`, `getSafeActionLinkClasses` (2D) · docs (Task 19). Do not run a formatter.

**Files:**
- Part A (commit 1):
  - Modify: `src/components/master-data/master-data-layout.tsx` (`i/lf w/crlf`; 3 exact replacements)
  - Modify: `tests/list-primitives-ui.test.ts` (`i/lf w/crlf`; 2 exact replacements)
  - Modify: `tests/asset-register-filter-ui.test.ts` (`i/lf w/crlf`; 2 exact replacements)
  - Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Part B (commit 2):
  - Modify: `src/lib/design-system.ts` (`i/lf w/crlf`; 2 exact replacements)
  - Modify: `tests/design-system.test.ts` (`i/lf w/crlf`; 2 exact replacements, 1 appended block)
  - Temp folder only, never committed: `t16-design-system-block.ts`

**Must keep passing without edits:**
- Part A: `tests/list-primitives-ui.test.ts` (every other test; in `MasterDataSearch is a frameless search toolbar …` only the import pin `:318` changes) · `tests/list-filters-ui.test.ts` (the layout is in `MIGRATED_FILTER_FILES`) · `tests/master-data-workspace.test.ts` · `tests/supplier-adaptive-ui.test.ts` · `tests/audit-pending-mobile-ux.test.ts` · `tests/operational-return-navigation.test.ts` · `tests/list-pages-ui.test.ts` · `tests/visual-foundation-guards.test.ts` · `tests/form-migration-guards.test.ts`
- Part B: `tests/design-system.test.ts:1-191` as edited only in its imports (spec table D: `:25-46` unedited) · `tests/audit-scan-search-ui.test.ts` (`:188` pins `getMobileSafeBottomPaddingClasses`; 2C plan 5's file to edit, not 2B's)

**Interfaces:**
- Consumes: Task 1 (`D/admin/roles/page.tsx` no longer imports `ColumnHeader`), Task 3 (`D/admin/storage/page.tsx` no longer calls `getTableShellClasses`), Task 9 (`c/reports/report-filter-panel.tsx` no longer calls `getActionButtonClasses`); `readSourceFiles(root: string): SourceFile[]` from `tests/helpers/source-files.ts`; Task 14's precheck; Task 0's guard scripts; Task 1's `p2b5-append.mjs` and `p2b5-tw-probe.mjs`.
- Produces:
  - `master-data-layout.tsx` exporting `MasterDataSearch` and `ActiveBadge` only; in `MIGRATED_LIST_FILES`; its six rows gone from LFG `BUDGETS`.
  - The tests `master-data-layout keeps only MasterDataSearch and ActiveBadge: the old header, column headers and pager are gone (R-h)` (`list-primitives-ui`) and `getTableShellClasses and getActionButtonClasses have no caller left and say that phase 2D deletes them` (`design-system`).

| guard | `c/master-data/master-data-layout.tsx` before → after | plan total (budget) before → after |
|---|---|---|
| LFG LH2 | 1 → – | 1 in 1 row → 0 |
| LFG LT1 | 2 → – | 9 in 3 rows → 7 in 2 (live 7 → 5; the `role-permission-form.tsx` row is at live 0, Task 17) |
| LFG LT2 · LT4 · LT5 | 1 · 1 · 2 → – | 1 · 1 · 2 → 0 · 0 · 0 |
| LFG LN2 | 1 → – | 2 in 2 rows → 1 in 1 |
| `MIGRATED_LIST_FILES` | – → joins | +1 (98 after this task) |

#### Part A · `c/master-data/master-data-layout.tsx` (commit 1)

- [ ] **Step 1: Check what this part builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b5-t14-precheck.mjs 16`
Expected: `git status` prints nothing. The script prints (exit 0):
```
ok      2B-1: PageHeader with title, meta, actions, back and breadcrumbs
ok      2B-1: TabNav with aria-label, items and current; TabNavItem with key, label and href
ok      2B-1: StatStrip with value, foot, footTitle, href and attention
ok      2A: formatCount in src/lib/display-format.ts, formatDateTime in src/lib/utils.ts, Button in ui/button
ok      the keys these tasks read exist in th and en
ok      Tasks 1–13 are in: their files are in MIGRATED_LIST_FILES and the three deleted files are gone
ok      Task 14 is in
ok      Task 15 is in
ok      Task 16 has not run yet
ok      MasterDataHeader, ColumnHeader, SortableColumnHeader and MasterDataPagination have no caller left
ok      src/components/master-data/master-data-layout.tsx is unchanged since 6835bdf (hash 8caf7ba933199fab)
ok      tests/asset-register-filter-ui.test.ts is unchanged since 6835bdf (hash deb6747fd9d6a39c)
ok      tests/list-primitives-ui.test.ts holds the text this step replaces, once: "test(\"MasterDataHeader is a thin wrapper of PageHeader until its last callers move (I2)\", () => {"
ok      tests/list-primitives-ui.test.ts holds the text this step replaces, once: "  assert.match(source, /import \\{ Button, buttonVariants \\} from \"@\\/components\\/ui\\/button\"/)"
info    src/components/master-data/master-data-layout.tsx: CRLF
info    tests/asset-register-filter-ui.test.ts: CRLF
info    tests/list-primitives-ui.test.ts: CRLF
preconditions hold for Task 16
```
On any `MISSING` line, stop and report it. "… have no caller left" `MISSING` means a page still uses one of the four helpers (`grep -rn "MasterDataHeader\|ColumnHeader\|SortableColumnHeader\|MasterDataPagination" src` names it): stop, the task that owns that page is not done. A `hash now` line means the file changed after 6835bdf: report it, do not guess.

Run: `node <temp>/p2b1-precheck.mjs --file c/master-data/master-data-layout.tsx`
Expected (after the `info`/`ok` header lines; exit 0):
```
file    src/components/master-data/master-data-layout.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LH1        0       0     0     1
LH2        1       1     0     1
LT1        2       2     0     2
LT2        1       1     0     1
LT4        1       1     0     1
LT5        2       2     0     2
LN2        1       1     0     1
args    LH2=1:1 LT1=2:2 LT2=1:1 LT4=1:1 LT5=2:2 LN2=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol src/components/master-data/master-data-layout.tsx tests/list-primitives-ui.test.ts tests/asset-register-filter-ui.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf w/crlf` for all four. Keep them CRLF.

- [ ] **Step 2: Write the failing test and move the register pin (both test files strip `\r` before matching, so their regexes may hold `\n`)**

(a) `tests/list-primitives-ui.test.ts:64-71`: the wrapper test becomes the test that the old helpers are gone. Replace:

```ts
test("MasterDataHeader is a thin wrapper of PageHeader until its last callers move (I2)", () => {
  const layout = read("src/components/master-data/master-data-layout.tsx")
  assert.match(layout, /import \{ Button, buttonVariants \} from "@\/components\/ui\/button"/)
  assert.match(layout, /import \{ PageHeader \} from "@\/components\/ui\/page-header"/)
  assert.match(layout, /<PageHeader\n\s+title=\{title\}\n\s+meta=\{subtitle\}\n\s+compactOnMobile=\{compactOnMobile\}\n/)
  assert.match(layout, /<Link href=\{createHref\} className=\{buttonVariants\(\{ size: "md" \}\)\}>\n\s+<Plus aria-hidden="true" \/>\n\s+\{createLabel\}\n\s+<\/Link>/)
  assert.doesNotMatch(layout, /<h1\b|\bfont-bold\b/)
})
```

with:

```ts
// Plan 2B-5 Task 16 (spec 2B R-h, §8.9 row 10, §8.13 #6): every caller moved onto PageHeader, DataTableHead and Pagination,
// so the old master-data helpers go. MasterDataSearch (six pages) and ActiveBadge (a pill, 2D) stay.
test("master-data-layout keeps only MasterDataSearch and ActiveBadge: the old header, column headers and pager are gone (R-h)", () => {
  const layout = read("src/components/master-data/master-data-layout.tsx")
  assert.deepEqual([...layout.matchAll(/^export function (\w+)/gm)].map((match) => match[1]), ["MasterDataSearch", "ActiveBadge"])
  assert.match(layout, /^import \{ Button \} from "@\/components\/ui\/button"$/m)
  assert.doesNotMatch(layout, /\bMasterDataHeader\b|\bColumnHeader\b|\bSortableColumnHeader\b|\bMasterDataPagination\b|from "next\/link"|from "lucide-react"|master-data-query|<h1\b|\buppercase\b|\bopacity-50\b/)
})
```

(b) `tests/list-primitives-ui.test.ts:318`, in `MasterDataSearch is a frameless search toolbar …`: the layout no longer imports `buttonVariants` (only the deleted header used it). Replace:

```ts
  assert.match(source, /import \{ Button, buttonVariants \} from "@\/components\/ui\/button"/)
```

with:

```ts
  assert.match(source, /import \{ Button \} from "@\/components\/ui\/button"/)
```

(c) `tests/asset-register-filter-ui.test.ts:127`: the test no longer reads the layout. Replace:

```ts
  const header = read("src/components/ui/page-header.tsx")
  const layout = read("src/components/master-data/master-data-layout.tsx")
```

with:

```ts
  const header = read("src/components/ui/page-header.tsx")
```

(d) `tests/asset-register-filter-ui.test.ts:134`: the gap under the compact header now lives on the register page, its one caller. Replace:

```ts
  assert.match(layout, /compactOnMobile \? "mb-4 md:mb-6" : "mb-6"/)
```

with:

```ts
  assert.match(page(), /<PageHeader\n\s+compactOnMobile\n\s+className="mb-4 md:mb-6"/, "the register keeps 16px / 24px under its compact header (spec 2B §4.6.1 rule 3)")
```

Run: `node --test --test-name-pattern="master-data-layout keeps only|MasterDataSearch is a frameless" tests/list-primitives-ui.test.ts`
Expected: FAIL, `tests 2 · pass 0 · fail 2`:
- `master-data-layout keeps only MasterDataSearch and ActiveBadge: …`: `Expected values to be strictly deep-equal`, the actual list `[ 'MasterDataHeader', 'MasterDataSearch', 'ColumnHeader', 'SortableColumnHeader', 'MasterDataPagination', 'ActiveBadge' ]` against `[ 'MasterDataSearch', 'ActiveBadge' ]`
- `MasterDataSearch is a frameless search toolbar on SearchField and Button, with its props unchanged (2B §6.3.5, I8)`: the input did not match the regular expression `/import \{ Button \} from "@\/components\/ui\/button"/`

Run: `node --test tests/asset-register-filter-ui.test.ts`
Expected: PASS, `tests 12 · pass 12 · fail 0` (the moved pin reads `D/assets/page.tsx`, which already has the gap).

- [ ] **Step 3: Lower the guard rows of the file (the failing guards)**

Run: `node <temp>/p2b-budget.mjs c/master-data/master-data-layout.tsx LH2=1:0 LT1=2:0 LT2=1:0 LT4=1:0 LT5=2:0 LN2=1:0 --migrated`
Expected (exit 0):
```
LH2: 1 -> 0 (row deleted)
LT1: 2 -> 0 (row deleted)
LT2: 1 -> 0 (row deleted)
LT4: 1 -> 0 (row deleted)
LT5: 2 -> 0 (row deleted)
LN2: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/components/master-data/master-data-layout.tsx
```

Run: `node --test tests/list-frame-guards.test.ts`
Expected: FAIL, `tests 21 · pass 14 · fail 7`, each naming only `src/components/master-data/master-data-layout.tsx` (with the file's count before the code change; the totals are those after Task 15):
- `LH2 MasterDataHeader, ReportHeader and local PageHeader functions give way to PageHeader` (`LH2: 1 in 1 files. …`, `…/master-data-layout.tsx: 1 > 0`) · `LT1 table headers have no solid muted or accent fill and no capitals` (`7 in 2`, `2 > 0`) · `LT2 sortable column headers come from DataTableHead with aria-sort, not a local helper` (`1 in 1`, `1 > 0`)
- `LT4 page links come from Pagination, not a local …Pagination that draws its own` (`1 in 1`, `1 > 0`) · `LT5 nothing looks disabled through opacity with pointer-events-none or cursor-not-allowed` (`2 in 1`, `2 > 0`) · `LN2 no local function takes the name of a shared component` (`2 in 2`, `1 > 0`)
- `L0 a file 2B is done with keeps only what KEEP allows, and every row names a real file and a known guard`: the six lines `LH2 …: 1 > 0`, `LT1 …: 2 > 0`, `LT2 …: 1 > 0`, `LT4 …: 1 > 0`, `LT5 …: 2 > 0`, `LN2 …: 1 > 0` of the file

- [ ] **Step 4: Delete the four helpers (`src/components/master-data/master-data-layout.tsx`, CRLF)**

Three exact replacements, top to bottom.

(1) Imports `:1-6`: only `MasterDataSearch` (`Button`, `SearchField`) and `ActiveBadge` (a span) are left. Replace:

```tsx
import Link from "next/link"
import { ArrowDown, ArrowUp, Plus } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { SearchField } from "@/components/ui/search-field"
import { buildMasterDataQueryString, paginationRange, type MasterDataListState } from "@/lib/master-data-query"
```

with:

```tsx
import { Button } from "@/components/ui/button"
import { SearchField } from "@/components/ui/search-field"
```

(2) `MasterDataHeader` `:8-42` (no caller since plan 2B-3). Replace:

```tsx
export function MasterDataHeader({
  title,
  subtitle,
  createHref,
  createLabel,
  actions,
  compactOnMobile = false,
}: {
  title: string
  subtitle: string
  createHref: string
  createLabel: string
  actions?: React.ReactNode
  compactOnMobile?: boolean
}) {
  // A thin wrapper of PageHeader (spec 2B I2, R-h): the 11 callers get the new header now, and each page plan
  // replaces its call with PageHeader. Plan 2B-5 deletes this function after the asset register (2B-3) moves.
  return (
    <PageHeader
      title={title}
      meta={subtitle}
      compactOnMobile={compactOnMobile}
      className={compactOnMobile ? "mb-4 md:mb-6" : "mb-6"}
      actions={
        <>
          {actions}
          <Link href={createHref} className={buttonVariants({ size: "md" })}>
            <Plus aria-hidden="true" />
            {createLabel}
          </Link>
        </>
      }
    />
  )
}

export function MasterDataSearch({
```

with:

```tsx
export function MasterDataSearch({
```

(3) `ColumnHeader` `:71-88`, `SortableColumnHeader` `:90-117` and `MasterDataPagination` `:119-182` (their last caller, `D/admin/roles/page.tsx`, moved to `DataTableHead` in Task 1). Replace:

```tsx
export function ColumnHeader({
  children,
  align = "left",
}: {
  children: React.ReactNode
  align?: "left" | "right"
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-normal text-muted-foreground ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  )
}

export function SortableColumnHeader<TSort extends string>({
  children,
  field,
  current,
  basePath,
  align = "left",
}: {
  children: React.ReactNode
  field: TSort
  current: MasterDataListState<TSort>
  basePath: string
  align?: "left" | "right"
}) {
  const active = current.sort === field
  const nextDirection = active && current.direction === "asc" ? "desc" : "asc"
  const href = `${basePath}?${buildMasterDataQueryString(current, { sort: field, direction: nextDirection, page: 1 })}`

  return (
    <th scope="col" className={`px-4 py-3 text-xs font-semibold uppercase tracking-normal text-muted-foreground ${align === "right" ? "text-right" : "text-left"}`}>
      <Link href={href} className={`inline-flex items-center gap-1 hover:text-primary ${align === "right" ? "justify-end" : ""}`}>
        {children}
        {active ? (
          current.direction === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
        ) : null}
      </Link>
    </th>
  )
}

export function MasterDataPagination<TSort extends string>({
  current,
  total,
  basePath,
  labels,
}: {
  current: MasterDataListState<TSort>
  total: number
  basePath: string
  labels: {
    rowsPerPage: string
    page: string
    of: string
    previous: string
    next: string
  }
}) {
  const { start, end, totalPages } = paginationRange(current.page, current.pageSize, total)
  const previousPage = Math.max(1, current.page - 1)
  const nextPage = Math.min(totalPages, current.page + 1)

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div>
        {start}-{end} {labels.of} {total}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span>{labels.rowsPerPage}</span>
        {[25, 50, 100].map((pageSize) => (
          <Link
            key={pageSize}
            href={`${basePath}?${buildMasterDataQueryString(current, { pageSize, page: 1 })}`}
            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 transition-colors ${
              current.pageSize === pageSize ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface hover:bg-accent"
            }`}
          >
            {pageSize}
          </Link>
        ))}
        <span className="px-2">
          {labels.page} {current.page} {labels.of} {totalPages}
        </span>
        <Link
          href={`${basePath}?${buildMasterDataQueryString(current, { page: previousPage })}`}
          aria-disabled={current.page <= 1}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${
            current.page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-accent"
          }`}
        >
          {labels.previous}
        </Link>
        <Link
          href={`${basePath}?${buildMasterDataQueryString(current, { page: nextPage })}`}
          aria-disabled={current.page >= totalPages}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${
            current.page >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-accent"
          }`}
        >
          {labels.next}
        </Link>
      </div>
    </div>
  )
}

export function ActiveBadge({ label }: { label: string }) {
```

with:

```tsx
export function ActiveBadge({ label }: { label: string }) {
```

Check: the file is 37 lines: the two imports, a blank line, `MasterDataSearch` (`:4-29`), a blank line and `ActiveBadge` (`:31-37`). `grep -rn "MasterDataHeader\|ColumnHeader\|SortableColumnHeader\|MasterDataPagination" src` prints nothing.

- [ ] **Step 5: Run the tests for this part**

Run: `node --test --test-name-pattern="master-data-layout keeps only|MasterDataSearch is a frameless" tests/list-primitives-ui.test.ts`
Expected: PASS, `tests 2 · pass 2 · fail 0`.

Run: `node --test --test-name-pattern="item 5|item 6" tests/list-filters-ui.test.ts`
Expected: PASS, `tests 2 · pass 2 · fail 0` (the layout's search form is still a search landmark with only hidden raw inputs).

Run: `node --test tests/asset-register-filter-ui.test.ts tests/master-data-workspace.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `tests 83 · pass 83 · fail 0` (`asset-register-filter-ui` 12 · `master-data-workspace` 1 · `list-frame-guards` 21 · `visual-foundation-guards` 26 · `form-migration-guards` 23).

Run: `node <temp>/p2b1-precheck.mjs --file c/master-data/master-data-layout.tsx`
Expected (exit 0):
```
file    src/components/master-data/master-data-layout.tsx (CRLF) · in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LH1        0       0     0     1
LH2        0       0     0     1
LT1        0       0     0     2
LT2        0       0     0     1
LT4        0       0     0     1
LT5        0       0     0     2
LN2        0       0     0     1
args    (no row holds this file)
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b5-tw-probe.mjs src/components/master-data/master-data-layout.tsx`
Expected: `checked 17 classes, missing 0` (exit 0). No class is added.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `tests 2001 · pass 2000 · fail 0 · skipped 1` (the same count as after Task 15: one test rewritten, none added).
- `npx tsc --noEmit`: no errors (no import of the four helpers is left anywhere).
- `npm run lint`: 0 errors and the 146 warnings under `.agents/`; `npx eslint src/components/master-data/master-data-layout.tsx tests/list-primitives-ui.test.ts tests/asset-register-filter-ui.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 4 files: `src/components/master-data/master-data-layout.tsx` 1 insertion and 154 deletions, `tests/list-primitives-ui.test.ts` 7 and 7, `tests/asset-register-filter-ui.test.ts` 1 and 2, `tests/list-frame-guards.test.ts` 1 insertion and 11 deletions (the `MIGRATED_LIST_FILES` line in; the six rows out, with the five `// 2B-1` group lines that headed only them: LH2, LT2, LT4, LT5, LN2; the LT1 group keeps `role-permission-form.tsx`). `node -e "const s=require('fs').readFileSync(process.argv[1],'utf8');console.log((s.match(/\r\n/g)||[]).length,(s.match(/\n/g)||[]).length)" src/components/master-data/master-data-layout.tsx` prints `37 37` (CRLF throughout). A file that shows every line changed was normalized: restore its line endings before you commit.

- [ ] **Step 8: Commit Part A**

```bash
git add src/components/master-data/master-data-layout.tsx tests/list-primitives-ui.test.ts tests/asset-register-filter-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "refactor(ui): delete MasterDataHeader, ColumnHeader, SortableColumnHeader and MasterDataPagination; master-data-layout keeps the search and the badge (2B-5 task 16)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

#### Part B · `src/lib/design-system.ts` (commit 2)

- [ ] **Step 9: Check what this part builds on**

Run: `node <temp>/p2b5-t14-precheck.mjs 16b`
Expected (exit 0):
```
ok      2B-1: PageHeader with title, meta, actions, back and breadcrumbs
ok      2B-1: TabNav with aria-label, items and current; TabNavItem with key, label and href
ok      2B-1: StatStrip with value, foot, footTitle, href and attention
ok      2A: formatCount in src/lib/display-format.ts, formatDateTime in src/lib/utils.ts, Button in ui/button
ok      the keys these tasks read exist in th and en
ok      Tasks 1–13 are in: their files are in MIGRATED_LIST_FILES and the three deleted files are gone
ok      Task 14 is in
ok      Task 15 is in
ok      Task 16 is in
ok      Task 16 (design-system.ts) has not run yet
ok      getTableShellClasses and getActionButtonClasses have no caller left in src
ok      src/lib/design-system.ts is unchanged since 6835bdf (hash ea3e47a9d60ed0e8)
ok      tests/design-system.test.ts is unchanged since 6835bdf (hash a1e8b130a09ee31c)
info    src/lib/design-system.ts: CRLF
info    tests/design-system.test.ts: CRLF
preconditions hold for Task 16b
```
On any `MISSING` line, stop and report it ("… no caller left in src" `MISSING`: Task 3 or Task 9 is not done).

Run: `git ls-files --eol src/lib/design-system.ts tests/design-system.test.ts`
Expected: `i/lf w/crlf` for both. Keep them CRLF.

- [ ] **Step 10: Write the failing test (`tests/design-system.test.ts`, CRLF; the new test strips `\r` itself)**

(a) The imports of `tests/design-system.test.ts:1-2`. Replace:

```ts
import assert from "node:assert/strict"
import test from "node:test"
```

with:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
```

(b) `tests/design-system.test.ts:5`. Replace:

```ts
import { cn } from "../src/lib/utils.ts"
```

with:

```ts
import { cn } from "../src/lib/utils.ts"
import { readSourceFiles } from "./helpers/source-files.ts"
```

(c) Save this block as `<temp>/t16-design-system-block.ts`:

```ts
// Plan 2B-5 Task 16 (spec 2B §10.6 row 2B-5, §5.10 #6, §10.4 table D): the storage tables moved onto DataTable (Task 3)
// and the report filter panel onto Button (Task 9), so nothing in src calls these two helpers. They stay, with their pins
// above, until phase 2D deletes them; their comments say so, and a new caller fails here.
test("getTableShellClasses and getActionButtonClasses have no caller left and say that phase 2D deletes them", () => {
  const callers = readSourceFiles("src").filter((file) => file.path !== "src/lib/design-system.ts" && /\bget(?:TableShell|ActionButton)Classes\b/.test(file.source))
  assert.deepEqual(callers.map((file) => file.path), [])
  const source = readFileSync("src/lib/design-system.ts", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /\/\*\* @deprecated No caller since phase 2B plan 5 [^\n]*\*\/\nexport function getTableShellClasses\(\)/)
  assert.match(source, /\/\*\* @deprecated Use `buttonVariants` [^\n]*No caller since phase 2B plan 5[^\n]*\*\/\nexport function getActionButtonClasses\(/)
})
```

Run: `node <temp>/p2b5-append.mjs <temp>/t16-design-system-block.ts tests/design-system.test.ts`
Expected: `appended <temp>/t16-design-system-block.ts to tests/design-system.test.ts (CRLF)`

Run: `node --test tests/design-system.test.ts`
Expected: FAIL, `tests 14 · pass 13 · fail 1`: `getTableShellClasses and getActionButtonClasses have no caller left and say that phase 2D deletes them`: the input did not match the regular expression `/\/\*\* @deprecated No caller since phase 2B plan 5 [^\n]*\*\/\nexport function getTableShellClasses\(\)/` (the caller check before it passes: Tasks 3 and 9 removed the callers).

- [ ] **Step 11: Mark the two helpers (`src/lib/design-system.ts`, CRLF)**

(1) `getTableShellClasses` `:55-57`. Replace:

```ts
export function getTableShellClasses() {
  return "overflow-hidden rounded-md border border-border"
}
```

with:

```ts
/** @deprecated No caller since phase 2B plan 5 (the storage tables are DataTable, which scrolls sideways). Phase 2D deletes it with its pin in tests/design-system.test.ts. */
export function getTableShellClasses() {
  return "overflow-hidden rounded-md border border-border"
}
```

(2) The `getActionButtonClasses` comment `:93` (spec §10.6 row 2B-5, §6 "`design-system.ts:93`"). Replace:

```ts
/** @deprecated Use `buttonVariants` from `components/ui/button-variants.ts`. Phase 2D moves its one caller and deletes it. */
```

with:

```ts
/** @deprecated Use `buttonVariants` from `components/ui/button-variants.ts`. No caller since phase 2B plan 5 (the report filter panel uses Button); phase 2D deletes it. */
```

- [ ] **Step 12: Run the tests and verify**

Run: `node --test tests/design-system.test.ts tests/audit-scan-search-ui.test.ts`
Expected: PASS, `tests 30 · pass 30 · fail 0` (`design-system` 14 · `audit-scan-search-ui` 16).

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `tests 2002 · pass 2001 · fail 0 · skipped 1` (one test more than the 2001 after Part A).
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors and the 146 warnings under `.agents/`; `npx eslint src/lib/design-system.ts tests/design-system.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 2 files: `src/lib/design-system.ts` 2 insertions and 1 deletion, `tests/design-system.test.ts` 13 insertions. The CRLF check prints `115 115` for `src/lib/design-system.ts` and `204 204` for the test.

- [ ] **Step 13: Commit Part B**

```bash
git add src/lib/design-system.ts tests/design-system.test.ts
git commit -m "docs(ui): getTableShellClasses and getActionButtonClasses have no caller since plan 2B-5; phase 2D deletes them (2B-5 task 16)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 2 files in the commit. `git status --short src tests messages` prints nothing.

**Note for the controller (not a step):** the dispatch for this task said "delete `getTableShellClasses` … with `tests/design-system.test.ts`". This task keeps it, because spec §10.4 table D (through §9.6 row 2B-5), §5.10 #6 and §3 keep it for 2D, and ruling (a) keeps every table D pin. If you rule for deletion instead, Part B changes in four places, all exact: in `src/lib/design-system.ts` delete `:55-58` (the function and the blank line after it) instead of marking it; in `tests/design-system.test.ts` delete the import line `:15` (`  getTableShellClasses,`) and the assertion `:44` (`  assert.match(getTableShellClasses(), /overflow-hidden/)`); in the appended block, the first `assert.match` becomes `assert.doesNotMatch(source, /\bgetTableShellClasses\b/)`. The counts stay the same (14 tests in the file).

**For the dev-app check (Task 18):** nothing on screen; the pages that used `MasterDataSearch` (`/th/admin/users`, `/th/master-data/departments`, `/th/audit/findings`, `/th/audit/rounds`, `/th/audit/rounds/<id>`, `…/pending`) still show their search toolbar, and the master-data lists their "ใช้งาน" badge.

---

### Task 17: The guard lock · VFG R7 one test on every line, LFG `BUDGETS = KEEP` with test L9, the migrated lists complete, and the guard state after plan 2B-5

Spec §8.15 row 2B-5, §9.2.2 ("2B-5 งานล็อก"), §9.8 bullet "2B-5 งานล็อก", §10.3 bullet 2B-5 ("ล็อก VFG R7 … และ LFG (`BUDGETS = KEEP` + test L9)"), I15, I34, §6.13 table B item 5 ("2B-5 (+2)"), §5.14 and §9.10 #3 (the link rows LN1 cannot see), §10.4 table C column "2B-5 = KEEP", §8.3 test table row 2B-5∥2C-5 and controller rulings (a), (b) and (d). One commit, test files only. Every file is CRLF: `p2b-budget.mjs`, `p2b5-append.mjs` and exact-string replacements only.

Rulings this task applies:
- **Ruling (a), recount at the lock:** the totals of spec table C column 2B-5 (= `KEEP`, counted at d38a0ee) less what 2C plan 4 already did: it moved the headers of the label batch tool and the scan tool onto `PageHeader` (LH1 1 + 1 → 0), made the role permission table header white (LT1 2 → 0, and its R7 row) and put the integration usage numbers through `formatCount` (LV1 3 → 0, and its R7 row). Those four `KEEP` rows sit above a live count of 0 since `a667f6f` (DEVELOPER_HANDOFF.md, 2C plan 4, "Guards"); this task deletes them from `BUDGETS` (with `p2b-budget.mjs`) and from `KEEP` (by hand), never raises one. After the lock: R7 1 in 1 file · LH1 4 · LH2 0 · LB1 7 · LP1 4 · LF1 0 · LT1 5 · LT2 0 · LT3 0 · LT4 0 · LT5 0 · LV1 5 · LV2 68 · LV3 6 · LS1 5 · LS2 0 · LK1 1 · LN1 2 · LN2 1 · LR1 0. Against table C: R7 3 → 1, LH1 6 → 4, LT1 7 → 5 and LV1 8 → 5 are lower by exactly 2C plan 4's work; every other number equals table C. No total breaks a table D pin or a 2C fence.
- **§9.2.2, §8.15 row 2B-5 (VFG R7):** the `<th`-line filter (`TABLE_HEADER_LINE`, `:235` at 6835bdf) and the interim test go; one test, `R7 neutral fills are opaque tokens, table headers included`, checks every line against a budget. The budget is the one row left after 2C plan 4: `asset-import-preview-panel.tsx` 1, whose header DEVELOPER_HANDOFF.md (2C plan 4, "Handed on to 2D") gives to 2D. **Departure (spec §9.2.2 writes the budget inline):** the object keeps its name `TABLE_HEADER_FILLS`, because `p2b-budget.mjs` and `p2b1-precheck.mjs --budgets` read that name; with it, the controller can still lower rows in Task 20 if 2C plan 5 merges first, and 2D can run the same scripts. The unused `const D` of VFG is already gone: Task 8 deleted it with the last `${D}` row.
- **§9.8, I15 (LFG):** a new test `L9 every 2B budget equals KEEP, so phase 2D only empties KEEP` compares `BUDGETS` with `KEEP` after dropping the guards whose object is empty (`LH2`, `LF1`, `LT2`–`LT5`, `LS2`, `LR1` are `{}` in `BUDGETS` and absent from `KEEP`). It does not compare `KEEP` with the live counts: a budget is a ceiling, so a 2C plan 5 change that lowers a live count (LP1, LB1) must not fail 2B's guards.
- **§9.8 ("`MIGRATED_LIST_FILES` มีทุกไฟล์ของ 2B ที่มีค่าที่ HEAD"):** after Task 16 the list holds the 77 files of 6835bdf and the 21 files of Tasks 1–16 that still exist (`src/lib/design-system.ts` is not screen code, and the three files Task 13 deleted cannot be listed). This task adds `c/admin/role-permission-form.tsx` (plan 2B-1 moved its header; its other rows were `KEEP` rows of 2C batch 4, now 0), so L0 holds it at 0: 99 files. Every other file with a d38a0ee count that is not in the list is a `KEEP`-only file of 2C, 2D, the print pages or phase 3, or an R2-only file.
- **I34, §6.13 table B item 5:** `MIGRATED_FILTER_FILES` already holds `D/admin/logs/page.tsx` and `c/reports/report-filter-panel.tsx`: Task 2 and Task 9 added each in the commit that moved its fields (the rule of plans 2B-1 to 2B-4), so this task does not edit `tests/list-filters-ui.test.ts`; its precheck confirms both are listed. With them every one of the ten `src/app` files that had a raw filter field at d38a0ee (the seven master-data lists, disposal, maintenance, logs) is in the list, and so are the three component filter files (13 entries). Item 5 then checks that their forms are search landmarks with only hidden raw inputs, and item 6 that "ล้างตัวกรอง" shows only while a filter is on.
- **§5.14, §9.10 #3 (`tests/list-pages-ui.test.ts`):** guard LN1 counts only a hand-set `aria-current="page"`, so it never saw the four link rows of plan 2B-5 that had none: the log quick filters, the approval inbox chips, the history filter groups and the work-center switch. One appended test names the four files and asserts `<TabNav`. The B4 lines of `B4_LISTS` belong to the page tasks (the list's own comment: "one line each" by the commit that moves the page); this task adds none.
- **Comments:** the LFG header, the `BUDGETS` heading and the `KEEP` heading say the lock is in place. The other comments of `BUDGETS` and `KEEP` stay as they are (the stale line numbers and "2C plan 4" on the integration manager and import preview rows are DEVELOPER_HANDOFF.md items for 2D).
- **Ruling (d), fences:** FMG is not edited. No 2C plan 5 file and no file of 2B-5's Tasks 1–16 changes here.
- **No failing test first for VFG and `list-pages-ui`:** the R7 test drops a filter and checks a budget the live code already meets, and the four `<TabNav` rows exist since Tasks 2, 4, 5 and 15; both pass at once. L9 is written red first (Step 3).

What users will see: nothing (test files only).

Not in this task: docs (Task 19) · the verify, production build and dev-app check (Task 18) · `FMG` · setting any budget to `{}` (2D).

**Files:**
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; `p2b-budget.mjs` ×4, one appended block, 6 exact replacements)
- Modify: `tests/visual-foundation-guards.test.ts` (`i/lf w/crlf`; 1 exact replacement)
- Read only: `tests/list-filters-ui.test.ts` (Tasks 2 and 9 completed `MIGRATED_FILTER_FILES`; items 5 and 6 run in Step 7)
- Modify: `tests/list-pages-ui.test.ts` (`i/lf w/crlf`; one appended block)
- Temp folder only, never committed: `t17-l9-block.ts`, `t17-pages-block.ts`

**Must keep passing without edits:**
- `tests/form-migration-guards.test.ts` (2C's) · every LFG guard and L0 · every other VFG test (R1 `{}`, R2 10 in 9 rows, the pins Task 13 edited)
- `tests/list-filters-ui.test.ts` (not edited) · every test of `tests/list-pages-ui.test.ts` the earlier tasks wrote

**Interfaces:**
- Consumes: Tasks 1–16 committed (each lowered its own rows and joined `MIGRATED_LIST_FILES`); Task 14's precheck; Task 0's guard scripts; Task 1's `p2b5-append.mjs`.
- Produces: the lock: VFG R7 one test over every line with `TABLE_HEADER_FILLS` = `{ asset-import-preview-panel.tsx: 1 }`; LFG `BUDGETS` equal to `KEEP` (L9), 99 `MIGRATED_LIST_FILES`; 13 `MIGRATED_FILTER_FILES` (unchanged here: Tasks 2 and 9 added the last two); the test `plan 2B-5: the link rows guard LN1 cannot see are TabNav (spec 2B §5.14, §9.10 #3)`; the guard state after plan 2B-5 (Step 8), which Task 19 writes into DEVELOPER_HANDOFF.md, DESIGN.md `:498` and the changelog.

| guard | rows this task changes | plan total (budget) before → after |
|---|---|---|
| VFG R7 | the `<th` filter and the interim test → one test | 1 in 1 row → 1 in 1 row (one test, every line) |
| LFG LH1 | `asset-label-batch-tool.tsx` 1, `asset-scan-search-tool.tsx` 1 → – (`BUDGETS` and `KEEP`) | 6 in 6 rows → 4 in 4 (live 4) |
| LFG LT1 | `role-permission-form.tsx` 2 → – | 7 in 2 rows → 5 in 1 (live 5) |
| LFG LV1 | `IntegrationClientManager.tsx` 3 → – | 8 in 3 rows → 5 in 2 (live 5) |
| `MIGRATED_LIST_FILES` | + `c/admin/role-permission-form.tsx` | 98 → 99 |
| `MIGRATED_FILTER_FILES` | none (logs: Task 2; report filter panel: Task 9) | 13 → 13 |

- [ ] **Step 1: Check what the lock builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b5-t14-precheck.mjs 17`
Expected: `git status` prints nothing. The script prints (exit 0):
```
ok      2B-1: PageHeader with title, meta, actions, back and breadcrumbs
ok      2B-1: TabNav with aria-label, items and current; TabNavItem with key, label and href
ok      2B-1: StatStrip with value, foot, footTitle, href and attention
ok      2A: formatCount in src/lib/display-format.ts, formatDateTime in src/lib/utils.ts, Button in ui/button
ok      the keys these tasks read exist in th and en
ok      Tasks 1–13 are in: their files are in MIGRATED_LIST_FILES and the three deleted files are gone
ok      Task 14 is in
ok      Task 15 is in
ok      Task 16 is in
ok      Task 16 (design-system.ts) is in
ok      Task 17 has not run yet
ok      the logs page (Task 2) and the report filter panel (Task 9) are in MIGRATED_FILTER_FILES
ok      tests/visual-foundation-guards.test.ts holds the text this step replaces, once: "const TABLE_HEADER_LINE = /<th(?:ead)?\\b/"
ok      tests/visual-foundation-guards.test.ts holds the text this step replaces, once: "  // 2C plan 4 or 2D (2C batch 4 files, R-e)"
ok      tests/list-frame-guards.test.ts holds the text this step replaces, once: "    [`${C}assets/asset-scan-search-tool.tsx`]: 1, // 2C plan 4 moves it onto PageHeader (I13)"
ok      tests/list-frame-guards.test.ts holds the text this step replaces, once: "    [`${C}admin/role-permission-form.tsx`]: 2, // 2C batch 4 (R-e)"
ok      tests/list-frame-guards.test.ts holds the text this step replaces, once: "    [`${C}admin/IntegrationClientManager.tsx`]: 3, // R-f, 2C plan 4"
ok      tests/list-frame-guards.test.ts holds the text this step replaces, once: "// Phase 2B list-frame guards (spec 2B §9.3, rulings I11, I14 and I15). BUDGETS start at the d38a0ee counts"
ok      tests/list-frame-guards.test.ts holds the text this step replaces, once: "// ---- Budgets at d38a0ee (spec §10.4 table C, per file as spec §9.4.1–9.4.2). Groups name the first 2B plan that"
ok      tests/list-frame-guards.test.ts holds the text this step replaces, once: "// to these numbers. 2C plan 4 or 2D empties the rest; phase 2D sets every budget to {}. Change a row only with a spec ruling."
info    tests/visual-foundation-guards.test.ts: CRLF
info    tests/list-frame-guards.test.ts: CRLF
preconditions hold for Task 17
```
On any `MISSING` line, stop and report it.

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected (exit 0; after the `info` lines, which end with `info    tests/list-frame-guards.test.ts: there · BUDGETS 19 guards · KEEP 11 guards · MIGRATED_LIST_FILES 98 files`):
```
ok      R7  TABLE_HEADER_FILLS   1 in  1 rows · live   1 in  1 files · over 0 · slack 0
ok      LH1 BUDGETS.LH1          6 in  6 rows · live   4 in  4 files · over 0 · slack 2
          slack c/assets/asset-label-batch-tool.tsx: budget 1 > live 0
          slack c/assets/asset-scan-search-tool.tsx: budget 1 > live 0
ok      LH2 BUDGETS.LH2          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
ok      LB1 BUDGETS.LB1          7 in  7 rows · live   7 in  7 files · over 0 · slack 0
ok      LP1 BUDGETS.LP1          4 in  4 rows · live   4 in  4 files · over 0 · slack 0
ok      LF1 BUDGETS.LF1          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
ok      LT1 BUDGETS.LT1          7 in  2 rows · live   5 in  1 files · over 0 · slack 1
          slack c/admin/role-permission-form.tsx: budget 2 > live 0
ok      LT2 BUDGETS.LT2          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
ok      LT3 BUDGETS.LT3          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
ok      LT4 BUDGETS.LT4          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
ok      LT5 BUDGETS.LT5          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
ok      LV1 BUDGETS.LV1          8 in  3 rows · live   5 in  2 files · over 0 · slack 1
          slack c/admin/IntegrationClientManager.tsx: budget 3 > live 0
ok      LV2 BUDGETS.LV2         68 in 19 rows · live  68 in 19 files · over 0 · slack 0
ok      LV3 BUDGETS.LV3          6 in  2 rows · live   6 in  2 files · over 0 · slack 0
ok      LS1 BUDGETS.LS1          5 in  4 rows · live   5 in  4 files · over 0 · slack 0
ok      LS2 BUDGETS.LS2          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
ok      LK1 BUDGETS.LK1          1 in  1 rows · live   1 in  1 files · over 0 · slack 0
ok      LN1 BUDGETS.LN1          2 in  1 rows · live   2 in  1 files · over 0 · slack 0
ok      LN2 BUDGETS.LN2          1 in  1 rows · live   1 in  1 files · over 0 · slack 0
ok      LR1 BUDGETS.LR1          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
budgets hold: no live count is over its row
```
Every row is `slack 0` except the four `KEEP` rows 2C plan 4 emptied. Any other `slack` or `OVER` line names a file of Tasks 1–16 that did not lower its rows or moved a site back: stop and report it; do not lower or raise a number here.

Run: `git ls-files --eol tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/list-pages-ui.test.ts`
Expected: `i/lf w/crlf` for all three. Keep them CRLF.

- [ ] **Step 2: Delete the four rows 2C plan 4 emptied from `BUDGETS` (and list the role permission form)**

Run, one after the other:
```bash
node <temp>/p2b-budget.mjs c/assets/asset-label-batch-tool.tsx LH1=1:0 LV1=1:1 LV2=6:6
node <temp>/p2b-budget.mjs c/assets/asset-scan-search-tool.tsx LH1=1:0
node <temp>/p2b-budget.mjs c/admin/role-permission-form.tsx LT1=2:0 --migrated
node <temp>/p2b-budget.mjs c/admin/IntegrationClientManager.tsx LV1=3:0 LS1=2:2 LN2=1:1
```
Expected (exit 0 each):
```
LH1: 1 -> 0 (row deleted)
LV1: 1 kept
LV2: 6 kept
written: src/components/assets/asset-label-batch-tool.tsx
LH1: 1 -> 0 (row deleted)
written: src/components/assets/asset-scan-search-tool.tsx
LT1: 2 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/components/admin/role-permission-form.tsx
LV1: 3 -> 0 (row deleted)
LS1: 2 kept
LN2: 1 kept
written: src/components/admin/IntegrationClientManager.tsx
```
`git diff tests/list-frame-guards.test.ts` shows 1 insertion (the `MIGRATED_LIST_FILES` line) and 5 deletions: the two LH1 rows, the LT1 row with its `// 2B-1` line, the LV1 row.

Run: `node --test tests/list-frame-guards.test.ts`
Expected: PASS, `tests 21 · pass 21 · fail 0` (a lower budget that equals the live count, and L0 holds the role permission form at 0).

- [ ] **Step 3: Write the failing lock test L9 (`tests/list-frame-guards.test.ts`, CRLF)**

Save this block as `<temp>/t17-l9-block.ts`:

```ts
// The lock of phase 2B (spec 2B §9.8, I15; plan 2B-5 Task 17): every budget row is a KEEP row with the same number, so
// phase 2D only has to empty KEEP and widen the guards to all of src. A row whose count reaches 0 is deleted from both
// tables, never kept at 0 and never raised. An empty guard object ({}) counts as no rows.
test("L9 every 2B budget equals KEEP, so phase 2D only empties KEEP", () => {
  const rows = (table: Record<string, Record<string, number>>) => Object.fromEntries(Object.entries(table).filter(([, budget]) => Object.keys(budget).length > 0))
  assert.deepEqual(rows(BUDGETS), rows(KEEP))
})
```

Run: `node <temp>/p2b5-append.mjs <temp>/t17-l9-block.ts tests/list-frame-guards.test.ts`
Expected: `appended <temp>/t17-l9-block.ts to tests/list-frame-guards.test.ts (CRLF)`

Run: `node --test --test-name-pattern="L9 every 2B budget" tests/list-frame-guards.test.ts`
Expected: FAIL, `tests 1 · pass 0 · fail 1`: `Expected values to be strictly deep-equal`, and the diff marks four rows that only the expected side (`KEEP`) has: `- 'src/components/assets/asset-label-batch-tool.tsx': 1` and `- 'src/components/assets/asset-scan-search-tool.tsx': 1` under `LH1`, `- 'src/components/admin/role-permission-form.tsx': 2` under `LT1`, `- 'src/components/admin/IntegrationClientManager.tsx': 3` under `LV1`.

- [ ] **Step 4: Delete the same four rows from `KEEP` (`tests/list-frame-guards.test.ts`, CRLF)**

Three exact replacements in the `KEEP` object (`:371-444` at 6835bdf, `:319-392` after Step 2).

(a) `KEEP.LH1`: the label batch tool and the scan tool have used `PageHeader` since 2C plan 4. Replace:

```ts
    [`${C}audit/audit-scan-header.tsx`]: 1, // field scan header, its own variant
    [`${C}assets/asset-scan-search-tool.tsx`]: 1, // 2C plan 4 moves it onto PageHeader (I13)
    [`${C}assets/asset-label-batch-tool.tsx`]: 1, // 2C plan 4 moves it onto PageHeader (I13)
```

with:

```ts
    [`${C}audit/audit-scan-header.tsx`]: 1, // field scan header, its own variant
```

(b) `KEEP.LT1`: the role permission table header is white since 2C plan 4. Replace:

```ts
    [`${C}admin/role-permission-form.tsx`]: 2, // 2C batch 4 (R-e)
    [`${C}assets/asset-import-preview-panel.tsx`]: 5, // 2C batch 4 (R-e, O13)
```

with:

```ts
    [`${C}assets/asset-import-preview-panel.tsx`]: 5, // 2C batch 4 (R-e, O13)
```

(c) `KEEP.LV1`: the integration usage numbers go through `formatCount` since 2C plan 4. Replace:

```ts
    [`${C}admin/IntegrationClientManager.tsx`]: 3, // R-f, 2C plan 4
    [`${C}assets/asset-import-preview-panel.tsx`]: 4, // R-f, 2C plan 4
```

with:

```ts
    [`${C}assets/asset-import-preview-panel.tsx`]: 4, // R-f, 2C plan 4
```

Run: `node --test tests/list-frame-guards.test.ts`
Expected: PASS, `tests 22 · pass 22 · fail 0` (the 21 tests of before and L9).

- [ ] **Step 5: Lock VFG R7 (`tests/visual-foundation-guards.test.ts`, CRLF)**

(a) `tests/visual-foundation-guards.test.ts`, from `NEUTRAL_FILL_OPACITY` (`:234` at 6835bdf; the line stays) to the end of the interim test (`:268` at 6835bdf; Tasks 1, 2, 3, 8 and 11 have deleted the five `// 2B-5` rows and their group line since, and Task 8 the `const D` above them). Replace:

```ts
const NEUTRAL_FILL_OPACITY = /(?<![\w-])(?:[\w\-\[\]=&\/]+:)*(?:bg-(?:muted|accent)|border-border)\/\d+/g
const TABLE_HEADER_LINE = /<th(?:ead)?\b/

test("R7 neutral fills are opaque tokens outside table headers", () => {
  const css = globals()
  assert.match(css, /--row-hover: #[0-9A-F]{6};/)
  assert.match(css, /--border-soft: #[0-9A-F]{6};/)
  assert.match(css, /--color-row-hover: var\(--row-hover\);/, "without this line Tailwind drops bg-row-hover without an error")
  assert.match(css, /--color-border-soft: var\(--border-soft\);/, "without this line Tailwind drops border-border-soft without an error")
  const outsideTableHeaders = sources.map((file) => ({
    path: file.path,
    source: file.source.split("\n").filter((line) => !TABLE_HEADER_LINE.test(line)).join("\n"),
  }))
  assert.deepEqual(findMatches(outsideTableHeaders, NEUTRAL_FILL_OPACITY), [])
})

// R7 per file: the table-header fills (bg-muted/NN, bg-accent/NN, border-border/NN) at d38a0ee, all on <thead lines.
// The commit that moves a table onto DataTable deletes its row; never raise one. Phase 2B plan 5 drops the <th line
// filter above and keeps one test with the rows of the 2C batch 4 files; 2C plan 4 or 2D empties those.
const TABLE_HEADER_FILLS: Record<string, number> = {
  // 2C plan 4 or 2D (2C batch 4 files, R-e)
  "src/components/assets/asset-import-preview-panel.tsx": 1,
}

test("R7 interim: table-header fills wait for DataTable (2B), file by file", () => {
  // A file missing from TABLE_HEADER_FILLS may have none. The commit that moves a table onto DataTable deletes its row.
  assertWithinBudget(NEUTRAL_FILL_OPACITY, TABLE_HEADER_FILLS)
})
```

with:

```ts
const NEUTRAL_FILL_OPACITY = /(?<![\w-])(?:[\w\-\[\]=&\/]+:)*(?:bg-(?:muted|accent)|border-border)\/\d+/g

// R7, locked by phase 2B plan 5 (spec 2B §9.2.2): every neutral fill is an opaque token, table headers included; the
// <th line filter of plans 2B-1 to 2B-4 is gone. The budget keeps its name, which the guard scripts of the 2B plans
// read, and one row: the header of the import preview table, a 2C batch 4 file that 2D moves (DEVELOPER_HANDOFF.md,
// 2C plan 4); then the budget is {}. Lower a number in the task that removes a site; never raise one.
const TABLE_HEADER_FILLS: Record<string, number> = {
  "src/components/assets/asset-import-preview-panel.tsx": 1, // the import preview table header (2D)
}

test("R7 neutral fills are opaque tokens, table headers included", () => {
  const css = globals()
  assert.match(css, /--row-hover: #[0-9A-F]{6};/)
  assert.match(css, /--border-soft: #[0-9A-F]{6};/)
  assert.match(css, /--color-row-hover: var\(--row-hover\);/, "without this line Tailwind drops bg-row-hover without an error")
  assert.match(css, /--color-border-soft: var\(--border-soft\);/, "without this line Tailwind drops border-border-soft without an error")
  assertWithinBudget(NEUTRAL_FILL_OPACITY, TABLE_HEADER_FILLS)
})
```

Run: `node --test tests/visual-foundation-guards.test.ts`
Expected: PASS, `tests 25 · pass 25 · fail 0` (two R7 tests became one).

Check: `grep -n "TABLE_HEADER_LINE\|R7 interim\|^const D = " tests/visual-foundation-guards.test.ts` prints nothing; `node <temp>/p2b-budget.mjs c/assets/asset-import-preview-panel.tsx R7=1:1 LT1=5:5 LV1=4:4 LV2=2:2 LS1=1:1 --dry-run` prints the five `kept` lines and `dry run: src/components/assets/asset-import-preview-panel.tsx, nothing written` (the scripts still read the budget).

- [ ] **Step 6: Say in LFG that the lock is in place (`tests/list-frame-guards.test.ts`, CRLF)**

Three exact replacements (at 6835bdf `:15-19`, `:185-187` and `:369-370`; after Steps 2–5 `:15-19`, `:207-209` and `:317-318`).

(a) The file header `:15-19`. Replace:

```ts
// Phase 2B list-frame guards (spec 2B §9.3, rulings I11, I14 and I15). BUDGETS start at the d38a0ee counts
// (spec §10.4 table C) and only go down: the commit that moves a site lowers that file's rows, deleting rows that
// reach 0, and adds the file to MIGRATED_LIST_FILES once 2B is done with it. A file missing from a budget may have
// none; a listed file may have at most its number. Never raise a number. Phase 2B plan 5 sets BUDGETS to KEEP;
// phase 2D widens the guards to all of src and sets every budget to {}. 2C never needs to edit this file.
```

with:

```ts
// Phase 2B list-frame guards (spec 2B §9.3, rulings I11, I14 and I15). BUDGETS started at the d38a0ee counts
// (spec §10.4 table C) and only went down: the commit that moved a site lowered that file's rows, deleting rows that
// reached 0, and added the file to MIGRATED_LIST_FILES once 2B was done with it. A file missing from a budget may have
// none; a listed file may have at most its number. Never raise a number. Since phase 2B plan 5, BUDGETS equals KEEP
// (test L9); phase 2D widens the guards to all of src and sets every budget to {}. 2C never needs to edit this file.
```

(b) The heading of `BUDGETS` `:185-187`. Replace:

```ts
// ---- Budgets at d38a0ee (spec §10.4 table C, per file as spec §9.4.1–9.4.2). Groups name the first 2B plan that
// edits the file (spec §8.5–8.9, I12); "→ n (KEEP)" = what stays after 2B, and why. The LB1 rows marked 0 → 1 are the
// only two rows above the d38a0ee count (spec §9.4.1 note "LB1 0→1").
```

with:

```ts
// ---- Budgets, locked to KEEP since plan 2B-5 (test L9). They started at the d38a0ee counts (spec §10.4 table C, per
// file as spec §9.4.1–9.4.2); groups name the first 2B plan that edited the file (spec §8.5–8.9, I12); "→ n (KEEP)" =
// what stays after 2B, and why. The LB1 rows marked 0 → 1 were the only two rows above the d38a0ee count.
```

(c) The heading of `KEEP` `:369-370`. Replace:

```ts
// What may stay after phase 2B, with the reason (spec §9.4.3, I11, I14). L0 holds every file of MIGRATED_LIST_FILES
// to these numbers. 2C plan 4 or 2D empties the rest; phase 2D sets every budget to {}. Change a row only with a spec ruling.
```

with:

```ts
// What may stay after phase 2B, with the reason (spec §9.4.3, I11, I14). L0 holds every file of MIGRATED_LIST_FILES
// to these numbers and L9 holds BUDGETS to them. 2C plan 4 emptied four rows (LH1 of the label batch and scan tools,
// LT1 of the role permission form, LV1 of the integration manager) and plan 2B-5 deleted them; phase 2D empties the
// rest and sets every budget to {}. Change a row only with a spec ruling.
```

- [ ] **Step 7: Check the filter list and name the four link rows (`tests/list-pages-ui.test.ts`, CRLF; it strips `\r` before matching)**

(a) `tests/list-filters-ui.test.ts` is not edited: `MIGRATED_FILTER_FILES` has 13 entries, the logs page (Task 2) and the report filter panel (Task 9) among them, so items 5 and 6 already check both (run below).

(b) Save this block as `<temp>/t17-pages-block.ts`:

```ts
// Plan 2B-5 Task 17 (spec 2B §5.14, §9.10 #3, I10, I16): guard LN1 counts only aria-current="page" set by hand, so it
// never saw the link rows that had no aria-current at all. The four of plan 2B-5 are named here: the log quick
// filters, the approval inbox chips, the history filter groups and the work-center switch are TabNav.
test("plan 2B-5: the link rows guard LN1 cannot see are TabNav (spec 2B §5.14, §9.10 #3)", () => {
  for (const path of [`${D}admin/logs/page.tsx`, `${D}admin/approvals/page.tsx`, `${D}admin/approvals/history/page.tsx`, `${D}work-center/page.tsx`]) {
    assert.match(read(path), /<TabNav\b/, `${path}: no <TabNav`)
  }
})
```

Run: `node <temp>/p2b5-append.mjs <temp>/t17-pages-block.ts tests/list-pages-ui.test.ts`
Expected: `appended <temp>/t17-pages-block.ts to tests/list-pages-ui.test.ts (CRLF)`

Run: `node --test --test-name-pattern="item 5|item 6" tests/list-filters-ui.test.ts` then `node --test --test-name-pattern="plan 2B-5: the link rows" tests/list-pages-ui.test.ts`
Expected: PASS, `tests 2 · pass 2 · fail 0`, then PASS, `tests 1 · pass 1 · fail 0`. If item 5 fails on the logs page or the report filter panel, Task 2 or Task 9 left a raw field, an old label class or a `<form>` without `role="search"` (spec §6.2 "6-ช", §6 rows 9 and 12): stop and report it; do not take the path out of the list.

- [ ] **Step 8: The guard state after plan 2B-5**

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `tests 70 · pass 70 · fail 0` (`list-frame-guards` 22 · `visual-foundation-guards` 25 · `form-migration-guards` 23).

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected (exit 0; the `info` lines end with `info    VFG R7: per file, TABLE_HEADER_FILLS 1 in 1 rows` and `info    tests/list-frame-guards.test.ts: there · BUDGETS 19 guards · KEEP 11 guards · MIGRATED_LIST_FILES 99 files`):
```
ok      R7  TABLE_HEADER_FILLS   1 in  1 rows · live   1 in  1 files · over 0 · slack 0
ok      LH1 BUDGETS.LH1          4 in  4 rows · live   4 in  4 files · over 0 · slack 0
ok      LH2 BUDGETS.LH2          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
ok      LB1 BUDGETS.LB1          7 in  7 rows · live   7 in  7 files · over 0 · slack 0
ok      LP1 BUDGETS.LP1          4 in  4 rows · live   4 in  4 files · over 0 · slack 0
ok      LF1 BUDGETS.LF1          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
ok      LT1 BUDGETS.LT1          5 in  1 rows · live   5 in  1 files · over 0 · slack 0
ok      LT2 BUDGETS.LT2          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
ok      LT3 BUDGETS.LT3          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
ok      LT4 BUDGETS.LT4          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
ok      LT5 BUDGETS.LT5          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
ok      LV1 BUDGETS.LV1          5 in  2 rows · live   5 in  2 files · over 0 · slack 0
ok      LV2 BUDGETS.LV2         68 in 19 rows · live  68 in 19 files · over 0 · slack 0
ok      LV3 BUDGETS.LV3          6 in  2 rows · live   6 in  2 files · over 0 · slack 0
ok      LS1 BUDGETS.LS1          5 in  4 rows · live   5 in  4 files · over 0 · slack 0
ok      LS2 BUDGETS.LS2          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
ok      LK1 BUDGETS.LK1          1 in  1 rows · live   1 in  1 files · over 0 · slack 0
ok      LN1 BUDGETS.LN1          2 in  1 rows · live   2 in  1 files · over 0 · slack 0
ok      LN2 BUDGETS.LN2          1 in  1 rows · live   1 in  1 files · over 0 · slack 0
ok      LR1 BUDGETS.LR1          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
budgets hold: no live count is over its row
```

Every row is `slack 0`, and every `BUDGETS` row is a `KEEP` row (L9). The state after plan 2B-5 (controller ruling (a); against spec §10.4 table C column 2B-5):
- VFG: R1 `{}` (0) · R7 one test over every line, `TABLE_HEADER_FILLS` 1 in 1 row (the import preview header, 2D; table C 3/3, less the two tables 2C plan 4 moved) · R2 10 in 9 rows (unchanged in 2B; the two floating create buttons are 2D's, the register's bulk-action bar phase 3's).
- LFG `BUDGETS` = `KEEP`: LH1 4 (login page, the A4 print page, the label print page, the field scan header) · LH2 0 · LB1 7 · LP1 4 (the four O11 pages, 2C plan 5) · LF1 0 · LT1 5 (import preview) · LT2 0 · LT3 0 · LT4 0 · LT5 0 · LV1 5 (import preview 4, label batch tool 1) · LV2 68 in 19 files · LV3 6 (two print pages) · LS1 5 in 4 files · LS2 0 · LK1 1 · LN1 2 (the brand picker, I11) · LN2 1 (the integration manager's local `StatusBadge`) · LR1 0. Equal to table C except LH1 6 → 4, LT1 7 → 5 and LV1 8 → 5 (2C plan 4).
- `MIGRATED_LIST_FILES`: 99 (the 77 of 6835bdf, the 21 files of Tasks 1–16 in commit order, `c/admin/role-permission-form.tsx`). `MIGRATED_FILTER_FILES`: 13 (all ten `src/app` filter files of d38a0ee and three components, I34). FMG is untouched and green (23).

If a number differs, the `over` or `slack` line names the file: stop and report it; do not lower or raise a number here.

- [ ] **Step 9: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `tests 2003 · pass 2002 · fail 0 · skipped 1` (one test more than the 2002 after Task 16: L9 and the `list-pages-ui` test in, the two R7 tests of VFG now one).
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors and the 146 warnings under `.agents/`; `npx eslint tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/list-filters-ui.test.ts tests/list-pages-ui.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 3 files, no file under `src` or `messages`: `tests/list-frame-guards.test.ts` 20 insertions and 18 deletions, `tests/visual-foundation-guards.test.ts` 9 and 19 (Task 8 already deleted the `const D` line), `tests/list-pages-ui.test.ts` 9 insertions. For each of the three, `node -e "const s=require('fs').readFileSync(process.argv[1],'utf8');console.log((s.match(/\r\n/g)||[]).length,(s.match(/\n/g)||[]).length)" <file>` prints two equal numbers (CRLF throughout): `452 452`, `307 307` and `801 801`. A file that shows every line changed was normalized: restore its line endings before you commit.

- [ ] **Step 10: Commit**

```bash
git add tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/list-pages-ui.test.ts
git commit -m "test(ui): lock the 2B guards: one R7 test on every line, BUDGETS equal KEEP (L9), the migrated lists complete (2B-5 task 17)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For Task 20 (rebase, if 2C plan 5 merged first):** VFG and LFG conflict only if 2C plan 5 edited the same lines; 2C plan 5 never edits LFG (spec §9.8), and its VFG lines (the action bars, `:91-93` at 6835bdf) are not in the R7 block. After the rebase, run `node <temp>/p2b1-precheck.mjs --budgets`: where 2C plan 5 lowered a live count (LP1 of the four O11 pages, LB1 of `D/audit/rounds/[id]` and `D/maintenance/[id]` if a bar drops its back item), the row shows `slack`. Per ruling (a), delete each such row from `BUDGETS` with `p2b-budget.mjs <path> ID=1:0` and from `KEEP` by an exact replacement in the same commit, so L9 stays green; never raise a row. LH1 4 and the other totals of Step 8 then change only by those rows.

---

### Task 18: Verify, production build and dev-app check (controller runs this task, not an implementer)

**Files:**
- Create then delete: `.claude/launch.json` (temporary; never committed)
- Evidence: `.superpowers/sdd/screenshots/ui-phase2b-plan5/after/` (git-ignored)
- Modify: only files needed to fix problems found here. Each fix gets its own small commit, with a test where one is possible, through an implementer and the normal review.

**Interfaces:**
- Consumes: Tasks 1–17 committed; the Task 0 ids and before images.
- Produces: the after images and `.superpowers/sdd/<plan workspace>/task-18-findings.md`, which Task 19 turns into the "Dev-app check" bullets.

- [ ] **Step 1: Full verify.** Run `npm run verify` (lint, tests, build). Record the test count and the build page count for Task 20. Run `node <temp>/p2b1-precheck.mjs --budgets`: every guard holds with `BUDGETS` equal to `KEEP` (Task 17), no slack, and R7 at the rows Task 17 states.

- [ ] **Step 2: Production server.** Confirm the dev database (Task 0 Step 5). Create `.claude/launch.json` with `runtimeExecutable: "node"`, `runtimeArgs: ["node_modules/next/dist/bin/next", "start", "-p", "3001"]`, `port: 3001`, `autoPort: false`, and start it with `preview_start` from the main checkout. Log in with the seed admin; do not echo the password. Prefer `waitUntil: "load"` plus a short wait over `networkidle`. Playwright scripts run inline (`browser_run_code_unsafe` with `code`); if one must be a file, put it under `.playwright-mcp/` and delete it right after the run (`.playwright-mcp/` is linted).

- [ ] **Step 3: Writes nothing.** Approve, reject, save, archive and delete nothing; open dialogs only to their first screen and close them with cancel, the X or Esc. Count POST, PUT, PATCH and DELETE requests while doing so: 0 (read-only lookups the pages already send are listed by path).

- [ ] **Step 4: Screens.** Take every Task 0 view again under the same name in `after/` and compare (height, wrapping, truncation, lost color or shape). Then walk spec §8.9's dev-check table, in Thai plus one English pass at 1440, at 100% and 200% zoom (200% = a 720×450 viewport):
  - **`/th/admin/roles`, `/logs`, `/storage` at 1440 and 375:** `PageHeader` · the tables on the `DataTable` look (white header, no capitals) · roles has its row actions and an empty row in code · logs pages through the server instead of the cap of 100, with the filters kept across pages, and the nested `<details>` table still opens · the three storage tables scroll sideways inside their shell, the page does not.
  - **`/th/admin/approvals` and `/history` at 1440 and 375:** the chips are `TabNav` · history pages through the server instead of the cap of 150 · the back icon is the left arrow.
  - **`/th/admin/readiness`, `/th/admin/settings`, `/th/access-denied` at 1440:** the new header · the settings tab row is 2C plan 5's (unchanged by this plan).
  - **`/th/notifications` and `/th/my-assets` at 1440 and 375:** the notification type reads in Thai · my-assets pages and uses the shared header.
  - **`/th/reports`, every view, at 1440, 1024, 768 and 375:** every money amount reads in full · `StatStrip` instead of the metric boxes · the view tabs are `TabNav` and keep their scroll · the filters are `FilterSelect` · the submit is a `Button` · the active-filter chips have no clear links (I24) · the preset controls of 2C plan 4 unchanged.
  - **`/th/dashboard` and `/th/work-center` at 1440 and 375:** the view switch is an underlined `TabNav` of links (Ctrl+click opens a new tab; it works without JavaScript, I10) · the number boxes · the cancelled-round filter unchanged.
  - **No horizontal page scroll at 375** on any page of this plan.

- [ ] **Step 5: Keyboard.** Tab order on each page follows the visual order; `TabNav` items take Tab and show the focus ring; the current tab reads as current; `Pagination` links take Tab; Esc closes every dialog and returns focus to its trigger.

- [ ] **Step 6: axe.** Inject `node_modules/axe-core/axe.min.js` with `page.addScriptTag({ path })` and run `axe.run(main, { runOnly: ["color-contrast", "label", "aria-valid-attr-value", "aria-required-attr", "button-name", "nested-interactive"] })` on each page of Step 4 at 1440 and 375. Expected: 0 violations.

- [ ] **Step 7: Forced colors and reduced motion.** With Playwright `emulateMedia`: the selected `TabNav` item keeps its underline, focus rings visible, table and `StatStrip` lines visible. Reduced motion: nothing animates that did not before.

- [ ] **Step 8: Load time and counts.** Load `/th/admin/logs` and `/th/admin/approvals/history` five times each on the production server and record the median `responseEnd`; a page clearly slower than before is recorded in the findings (the new counts are read-only, spec B4). For `docs/03_DATABASE.md` if Task 19 needs it: the time of the system-log count on the dev database (`asset_management_dev`, a SELECT only).

- [ ] **Step 9: NVDA and real devices.** If NVDA is not available to you, list these checks for the user and do not mark them done: `TabNav` reads the current item · `Pagination` reads the page · an empty table reads its empty row · `StatStrip` reads label then value. Real iPhone and iPad: the report tabs scroll; the tables scroll inside their shells. `/th/my-assets` with an account that holds assets, if the seed admin holds none. Add them to the open manual checks; all of them must be done before the one phase-2 deploy.

- [ ] **Step 10: Findings report.** Write `task-18-findings.md` in the plan workspace, in the shape Task 19 fills its markers from:
  - **Fixes made:** commit + one line each, or "none".
  - **Checked and passed:** what was checked, where and at which widths, with the results.
  - **Load time:** the two paginated pages before → after.
  - **Found but not caused by plan 2B-5.**
  - **Accepted mixes.**
  - **Still needs a person:** the Step 9 list and anything else not checked.

- [ ] **Step 11: Clean up.** Stop the server and delete `.claude/launch.json` and every helper script you put under the repo (`.playwright-mcp/` and `.superpowers/sdd/` are linted). `git status --short` must show no stray files.

---

### Task 19: Repo documentation for plan 2B-5, the last plan of phase 2B (the controller adds the verify numbers, the rebase and the wiki in Task 20)

Spec §10.6 row 2B-5 (`DESIGN.md` `:301` · `:375` · `:459` · `:498` "R7 locked, the rows left" · `:516` "the numbers left" · `:534` "the final list"; `src/lib/design-system.ts:93` is Task 16's; `docs/03_DATABASE.md` "2B adds no index · the `count` time of `system_logs` on dev"; the handoff "Deferred": 2D, the V track and the person checks of every plan), §8.14 row 2B-5, and the checklists of §3.20, §5.13, §6.12 and §9.11 that name 2B-5. Those line numbers are from `d38a0ee`; the numbers below are recounted at `6835bdf` (Tasks 1–18 do not touch these files). Six files change, all CRLF in the working tree (`i/lf w/crlf`): edit them with exact-string replacement, keep the endings, never run a formatter, and match on the quoted strings, not on line numbers.

Rulings made in this task:
- **What goes where (spec §10.6 row 2B-5, §8.14 row 2B-5):**
  - `DESIGN.md` (18 replacements). The final 2B texts:
    - The R7 lock: the Token Contrast Rule (`:266`, two places: "outside table headers" and the guard's new name), Background (`:434`) and the R7 sentence of §5 Data Tables (`:519`, spec `:498`): table headers are white, R7 checks every line, one fill is left.
    - Titles, codes and buttons: Display (`:284`, the four `h1` LH1 keeps), `tag` (`:301`, spec `:301`), Legacy (`:374`, `ActionButton`'s one call site), Hand-written buttons (`:375`, spec `:375`) and a new **Page header** sub-bullet after `:512` (the old headers are gone; export buttons are plain links).
    - The number and tab rules this plan applies: `num` (`:300`), Border (`:436`) and `StatStrip` (`:440`; `MetricCard` is gone, money and long strips), Link tabs (`:514`; every link row of the pages 2B moved), and Pages on the server (`:538`; the last three B4 lists).
    - The filters and the numbers left: the Migration bullet of Inputs (`:464`, spec `:459`), Empty Values and Numbers (`:562`, spec `:516`), the Do list (`:580`, spec `:534`, the final list) and one new Don't bullet after `:601` that names the list-frame guards. §8.14 and §10.6 give no section for the guard file; the Don't list is where `DESIGN.md` already says what not to write.
  - `docs/14_UI_UX_DESIGN_SYSTEM.md` (5 replacements, to match `DESIGN.md`): the Shared Components rows `TabNav` (`:73`) and `StatStrip` (`:81`), the guard paragraph (`:97`), the Reports registry row (`:111`, which now points to the 2B spec, as plan 2B-4 did for Asset Detail) and the 2B registry row (`:118`).
  - `docs/11_FEATURE_LIST.md` (3 replacements): the feature rows this plan changes, spec §5.13: My Assets (`:56`), Approvals (`:280`) and System logs (`:285`). Notifications (`:286`), Reports workspace (`:244`), Work Center (`:55`) and Dashboard (`:54`) stay true.
  - `docs/03_DATABASE.md` (1 replacement): a bullet at the end of Operational Notes (`:140`), required by spec §10.6 row 2B-5 and §5.13: no index, the counts are read-only, and the measured time of the system log count.
  - `DEVELOPER_HANDOFF.md` (6 replacements): one pointer in each older bullet this plan made stale (`:69` the timing labels, `:256` `MasterDataHeader`, `:321` the R7 guard of the 2A section, spec §9.11 row `DH:321`, `:343` the 2B line of the 2A "Deferred" list), the 2B plan 4 "Next" line (`:725`, as plan 2B-4 rewrote the 2B plan 3 one), and the new section before `## Open Go-Live Decisions` (`:784`) with the "Deferred" hand-off (2D, the V track, the checks for a person) and "2D may start once 2C plan 5 also merges".
  - `docs/99_CHANGELOG.md` (2 replacements): the date block `## <today>` on top (the newest block at `6835bdf` is `## 2026-10-14`) and the Thai entry under it, shaped like the 2B-4 entry.
  - `.impeccable/design.json`: **no change** (spec §10.6 row 2B-5 names none, and no entry describes a deleted component: there is no `MetricCard` or report-header entry).
  - **Left as they are:** `DESIGN.md:321`, `:433` and `:435` (Elevation, Corner Style and Shadow Strategy say "metric cards" and "compact tables": the dashboard's KPI cards are still flat bordered cards, and the 2C form tables keep their `rounded-md` shells) · `DESIGN.md:412`, `:484` and `:620` (the confirm dialog, the `Steps` users and the bottom space: 2C plan 5 changes those and writes them) · `DESIGN.md:467` (the `MasterDataSearch` toolbar is still true) · `DEVELOPER_HANDOFF.md:502`, `:542` and `:636` (plan 2B-1 to 2B-3 history, still true) · `DEVELOPER_HANDOFF.md:714` (the 2B plan 4 hand-off that gave `getMobileSafeBottomPaddingClasses` to 2C plan 5: controller ruling P1 keeps it for 2D, and the new section says so; the old line stays so that 2C plan 5's docs can mark that hand-off without a same-line conflict) · `DEVELOPER_HANDOFF.md:782` (the "Next" line of 2C plan 4, which 2C plan 5's docs update) · `DEVELOPER_HANDOFF.md:345` and `:446` (the older 2D lists; the new "Deferred" bullet points to them) · `docs/07_UAT_CHECKLIST.md` (spec §10.6 row 2B-5 names no UAT section; the checks for a person go to the handoff) · `docs/08_PRODUCTION_READINESS.md:66` (it lists the dashboard's labels only; `DEVELOPER_HANDOFF.md:69` and `docs/03_DATABASE.md` name the two new ones).
- **The line numbers handed to 2D** (the helpers without a caller, the floating buttons, the pins) are those in the files after Tasks 1–17, checked on a copy of `6835bdf` with the code of Tasks 1–17. The check script recomputes each from the files, so a Task 18 fix that moved a line fails the check and prints the fragment to write. 2C plan 5 edits `tests/audit-scan-search-ui.test.ts` (spec §8.3), so Task 20 re-runs the script after a rebase.
- **The guard numbers** are not typed into the check script: it reads `TABLE_HEADER_FILLS` from VFG, `BUDGETS` and `MIGRATED_LIST_FILES` from LFG and `MIGRATED_FILTER_FILES` from `tests/list-filters-ui.test.ts`, and builds the sentences the docs must hold. After Task 17 they are spec §10.4 table C column 2B-5 less what 2C plan 4 did (controller ruling (a), Task 17 Step 8). If Task 20 lowers rows after a rebase (2C plan 5 emptying LP1 or LB1 rows), its re-run prints the merged sentences and Task 20 writes them.
- **The findings markers** come from `.superpowers/sdd/<plan workspace>/task-18-findings.md` (Task 18 Step 10): `<from task-18-findings.md>` four times in English (the handoff's load-time line, "Dev-app check (Task 18)", "Still open", and the count time in `docs/03_DATABASE.md`) and `<จาก task-18-findings.md>` once in the changelog. Each is written in the shape of the 2B plan 4 bullets: what was checked, where and at which widths, the results, the fixes with their commits or "none", accepted mixes, existing issues not caused by 2B-5, and what still needs a person. The load-time marker takes the "Load time" lines of the findings (`/th/admin/logs` and `/th/admin/approvals/history`, before → after); the `docs/03_DATABASE.md` marker takes the measured time of the system-log `count` on `asset_management_dev` (Task 18 Step 8; if Task 18 did not measure it, write "not measured in plan 2B-5; measure before the deploy" and add that to "Still open"). Task 20 adds its verify bullet directly above "Dev-app check (Task 18)" and "ตรวจบนแอป (Task 18)".
- **Dates:** the handoff heading and the changelog date use the day this task runs (`<today>`). The newest date block of the changelog at `6835bdf` is `## 2026-10-14`; on any later day a new block goes on top with the `---` separator the file uses (Step 9 (1)).
- **The plan file name:** the docs link `docs/superpowers/plans/2026-10-15-ui-phase2b-plan5.md`. If the controller saved plan 2B-5 under another name, replace that path everywhere in this task (the check script's `PLAN` included) before Step 2.
- **Departures and open issues of Tasks 1–17 that the docs describe.** The text below follows the tasks as drafted and the open issues as proposed. If the controller ruled otherwise, change these places before Step 2:
  - Task 16 deletes `getTableShellClasses` (the controller follows spec §8.9 row 10 instead of table D): in Step 8 (6), in the bullet of `c/master-data/master-data-layout.tsx`, replace "`getTableShellClasses` (no caller since the storage page moved) is marked `@deprecated`" with "`getTableShellClasses` (no caller since the storage page moved) is deleted with its pin in `tests/design-system.test.ts`" and "2D deletes both." with "2D deletes it."; in the Deferred helpers bullet delete "`getTableShellClasses` `:56` (`@deprecated` since plan 2B-5), " (the script then prints the fragment without it, with `getResponsiveTableScrollClasses`, `getEmptyStateClasses`, `getActionButtonClasses` and `getMobileSafeBottomPaddingClasses` 5 lines higher: write the printed numbers in both Deferred bullets); in Step 9 delete "`getTableShellClasses` " from "ส่งต่อ". The script detects the deletion by itself (its `info` line says "deleted").
  - The user declines Task 2's new `systemLogPage.subtitle`: in Step 8 (6) delete the sentence that starts "Changed: `systemLogPage.subtitle` reads"; in Step 9 delete " · แก้ค่า `systemLogPage.subtitle` เป็น "ตรวจสอบประวัติการแก้ไขข้อมูลในระบบ" (เดิมเขียนว่าล่าสุด 100 รายการ)"; in Step 1 the messages numstat is `10 3` per file. The script detects it (its `info` line says "unchanged").
  - Task 8 carries `returnTo` after all (open issue 3 not deferred): in Step 8 (6) delete " The detail page's back link still lands on page 1 (2D, below)." and the open point that starts "the back link of `/my-assets/<id>` returns to page 1", and in the check script delete the last entry of `handedOn` (the `tests/list-pages-ui.test.ts` pin); in Step 9 delete " · `returnTo` ของหน้ารายละเอียดทรัพย์สินของฉัน".
  - Task 13's skeleton or Task 12's empty tile value fixed inside this plan: delete the open point that names `ReportsPageSkeleton` or `StatStripItem.value` in Step 8 (6), and its words in Step 9 "ส่งต่อ".
  - Task 15 with one strip instead of strips of at most four: in Step 4 (10) delete ", and more than four numbers split into strips of at most four (the work center)", in Step 5 (2) delete ", and more than four numbers in strips of at most four", in Step 8 (6) replace "in strips of at most four (`splitStatRows`)" with "in one strip", in Step 9 delete " · ศูนย์แจ้งเตือนงานค้าง: ตัวเลขเรียงแถวละไม่เกิน 4 ช่อง"; in check 3 drop `"function splitStatRows<T>(items: readonly T[], most = 4)", `.
  - `MIGRATED_FILTER_FILES` gets the logs page from Task 2 and `c/reports/report-filter-panel.tsx` from Task 9; Task 17 only checks them (13 entries). The script counts unique entries; if the count it prints is not 13, write the printed number.
- **Rebase (Task 20 Step 2, spec I29):** `DESIGN.md`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md` and `docs/11_FEATURE_LIST.md` follow Task 20's rules; `docs/03_DATABASE.md` and `.impeccable/design.json` are not 2C plan 5's. Same-line conflicts are likely in `DESIGN.md:375` (2C plan 5 may mark the repair attachment delete dialog done), `:580` (2C plan 5 may add `ActionBar` to the Do list), `docs/14_UI_UX_DESIGN_SYSTEM.md:97` (its own pieces), the insertion point before `## Open Go-Live Decisions` (both new sections; the one that merged first stays above) and the changelog's `## <today>` block (one heading, the entry of the branch that merged second on top). After the rebase, Task 20 re-runs `<temp>/check-docs-2b5.mjs`.

**Files:**
- Modify: `DESIGN.md` (`i/lf w/crlf`; 18 replacements): §2 Token Contrast Rule (`:266`, 2) · §3 Display (`:284`), `num` (`:300`), `tag` (`:301`) · §5 Buttons, Legacy (`:374`) and Hand-written buttons (`:375`) · §5 Cards / Containers, Background (`:434`), Border (`:436`), `StatStrip` (`:440`) · §5 Inputs, Migration (`:464`) · §5 Navigation, Page header (`:512`) and Link tabs (`:514`) · §5 Data Tables (`:519`) and Pages on the server (`:538`) · §5 Empty Values and Numbers (`:562`) · §6 Do (`:580`) and Don't (`:601`)
- Modify: `docs/14_UI_UX_DESIGN_SYSTEM.md` (`i/lf w/crlf`; 5 replacements): Shared Components (`:73`, `:81`, `:97`) · Current-Surface Registry (`:111`, `:118`)
- Modify: `docs/11_FEATURE_LIST.md` (`i/lf w/crlf`; 3 replacements): `:56`, `:280`, `:285`
- Modify: `docs/03_DATABASE.md` (`i/lf w/crlf`; 1 replacement): Operational Notes (`:140`)
- Modify: `DEVELOPER_HANDOFF.md` (`i/lf w/crlf`; 6 replacements): `:69`, `:256`, `:321`, `:343`, `:725`, and a new section before `## Open Go-Live Decisions` (`:784`)
- Modify: `docs/99_CHANGELOG.md` (`i/lf w/crlf`; 2 replacements): a new date block above `## 2026-10-14` (`:7`) and the 2B-5 entry in it
- Not changed: `.impeccable/design.json` (see the rulings) · `docs/07_UAT_CHECKLIST.md` · `src/`, `tests/`, `messages/` · the wiki (Task 20)
- Temp folder only, never committed: `<temp>/check-docs-2b5.mjs`

**Interfaces:**
- Consumes: Tasks 1–18 committed; `.superpowers/sdd/<plan workspace>/task-18-findings.md` (dev-app check, load times, the count time, still open); the guard totals of Task 17 Step 8 (`node <temp>/p2b1-precheck.mjs --budgets`).
- Produces:
  - `DEVELOPER_HANDOFF.md` section `## UI Round 4 Phase 2B Plan 5 Admin, Reports, Dashboard, Notifications and the Guard Lock (<today>)` with a `- Dev-app check (Task 18):` bullet; `docs/99_CHANGELOG.md` entry `### หน้าผู้ดูแลระบบ รายงาน แดชบอร์ด การแจ้งเตือน และการล็อก guard (UI รอบ 4 เฟส 2B plan 5)` with a `- **ตรวจบนแอป (Task 18):**` bullet. Task 20 adds its verify bullet directly above each.
  - The "Deferred" hand-off that phase 2D, the V track and the deploy read (spec §10.6 row 2B-5): the guards to empty, the helpers without a caller with their line numbers and pins, the buttons and boxes 2B left, the open points of this plan, and the checks for a person.
  - The final 2B texts of `DESIGN.md` and `docs/14_UI_UX_DESIGN_SYSTEM.md` (the R7 lock, the guards that hold what is left, the component list) that phase 2D and phase 3 start from.
  - `<temp>/check-docs-2b5.mjs`, which Task 20 re-runs after a rebase.

- [ ] **Step 1: Check the base**

Run: `git diff --quiet 6835bdf HEAD -- DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md docs/11_FEATURE_LIST.md docs/03_DATABASE.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md .impeccable/design.json && echo DOCS-UNCHANGED`
Expected: `DOCS-UNCHANGED` (Tasks 1–18 did not touch them; if a Task 18 fix did, re-read the quoted strings below against the file).

Run: `git diff --numstat 6835bdf HEAD -- messages`
Expected: `11	4	messages/en.json` and `11	4	messages/th.json` (Tasks 2, 7 and 15: the seven keys of spec §10.2 and the `systemLogPage.subtitle` value; `10	3` each if the user declined the subtitle, see the rulings).

Run: `git ls-files --eol DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md docs/11_FEATURE_LIST.md docs/03_DATABASE.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md .impeccable/design.json`
Expected: `i/lf    w/crlf` for all seven.

Run: `ls docs/superpowers/plans/2026-10-15-ui-phase2b-plan5.md .superpowers/sdd/*/task-18-findings.md`
Expected: both exist (the docs link the plan; the findings fill the markers). If the plan has another name, see the rulings.

Run: `git status --short src tests messages`
Expected: nothing.

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected (exit 0; Node may print a `MODULE_TYPELESS_PACKAGE_JSON` warning on stderr, ignore it): the info lines end with `info    VFG R7: per file, TABLE_HEADER_FILLS 1 in 1 rows` and `info    tests/list-frame-guards.test.ts: there · BUDGETS 19 guards · KEEP 11 guards · MIGRATED_LIST_FILES 99 files`, then `budgets hold: no live count is over its row` and these totals, every one `slack 0`:
```
ok      R7  TABLE_HEADER_FILLS   1 in  1 rows · live   1 in  1 files · over 0 · slack 0
ok      LH1 BUDGETS.LH1          4 in  4 rows · live   4 in  4 files · over 0 · slack 0
ok      LH2 BUDGETS.LH2          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
ok      LB1 BUDGETS.LB1          7 in  7 rows · live   7 in  7 files · over 0 · slack 0
ok      LP1 BUDGETS.LP1          4 in  4 rows · live   4 in  4 files · over 0 · slack 0
ok      LF1 BUDGETS.LF1          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
ok      LT1 BUDGETS.LT1          5 in  1 rows · live   5 in  1 files · over 0 · slack 0
ok      LT2 BUDGETS.LT2          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
ok      LT3 BUDGETS.LT3          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
ok      LT4 BUDGETS.LT4          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
ok      LT5 BUDGETS.LT5          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
ok      LV1 BUDGETS.LV1          5 in  2 rows · live   5 in  2 files · over 0 · slack 0
ok      LV2 BUDGETS.LV2         68 in 19 rows · live  68 in 19 files · over 0 · slack 0
ok      LV3 BUDGETS.LV3          6 in  2 rows · live   6 in  2 files · over 0 · slack 0
ok      LS1 BUDGETS.LS1          5 in  4 rows · live   5 in  4 files · over 0 · slack 0
ok      LS2 BUDGETS.LS2          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
ok      LK1 BUDGETS.LK1          1 in  1 rows · live   1 in  1 files · over 0 · slack 0
ok      LN1 BUDGETS.LN1          2 in  1 rows · live   2 in  1 files · over 0 · slack 0
ok      LN2 BUDGETS.LN2          1 in  1 rows · live   1 in  1 files · over 0 · slack 0
ok      LR1 BUDGETS.LR1          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
```
These are the numbers the check script reads from the guard files and Steps 4, 8 and 9 write. If a total differs, the script of Step 2 still builds the right sentences from the files: write the ones it prints in Step 3 and say so in the task report.

Run: `node -e "console.log(new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }))"`
Expected: a date such as `2026-10-15`. This is `<today>` in Steps 8 and 9: replace every `<today>` below with it.

- [ ] **Step 2: Write the check script (it fails first).** Save as `check-docs-2b5.mjs` in your temp folder (with a file-writing tool: the script holds backslashes, which a shell heredoc drops):

```js
// check-docs-2b5.mjs: run from the repo root. Checks the plan 2B-5 docs edits of Task 19, the code facts they state,
// the guard numbers they quote (read from the guard files, not typed here), and that the line numbers the handoff gives
// phase 2D are the ones in the files now. Reads only. Never commit this file.
import { existsSync, readFileSync, readdirSync } from "node:fs"

const PLAN = "docs/superpowers/plans/2026-10-15-ui-phase2b-plan5.md"
const files = ["DESIGN.md", "docs/14_UI_UX_DESIGN_SYSTEM.md", "docs/11_FEATURE_LIST.md", "docs/03_DATABASE.md", "DEVELOPER_HANDOFF.md", "docs/99_CHANGELOG.md", ".impeccable/design.json"]
const raw = Object.fromEntries(files.map((path) => [path, readFileSync(path, "utf8")]))
const text = Object.fromEntries(files.map((path) => [path, raw[path].replace(/\r\n/g, "\n")]))
const count = (path, literal) => text[path].split(literal).length - 1
const once = (path, ...literals) => literals.every((literal) => count(path, literal) === 1)
const none = (path, ...literals) => literals.every((literal) => count(path, literal) === 0)
const before = (path, first, second) => {
  const at = text[path].indexOf(first)
  return at >= 0 && at < text[path].indexOf(second)
}
// One "## " section: from its heading to the next "## " heading.
const section = (path, heading) => {
  const at = text[path].indexOf(heading)
  if (at < 0) return ""
  const end = text[path].indexOf("\n## ", at + heading.length)
  return text[path].slice(at, end < 0 ? undefined : end)
}
const HANDOFF = "## UI Round 4 Phase 2B Plan 5 Admin, Reports, Dashboard, Notifications and the Guard Lock ("
const ENTRY = "### หน้าผู้ดูแลระบบ รายงาน แดชบอร์ด การแจ้งเตือน และการล็อก guard (UI รอบ 4 เฟส 2B plan 5)"
const handoff = section("DEVELOPER_HANDOFF.md", HANDOFF)
const log = text["docs/99_CHANGELOG.md"]
const entryAt = log.indexOf(`\n${ENTRY}\n`)
const entryEnd = entryAt < 0 ? -1 : log.slice(entryAt + ENTRY.length + 2).search(/\n### |\n---\n/)
const entry = entryAt < 0 ? "" : log.slice(entryAt, entryEnd < 0 ? undefined : entryAt + ENTRY.length + 2 + entryEnd)

// The code facts the docs state (after Tasks 1–17).
const C = "src/components/"
const D = "src/app/[locale]/(dashboard)/"
const source = (path) => (existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : "")
const has = (path, ...literals) => literals.every((literal) => source(path).includes(literal))
const lacks = (path, ...literals) => literals.every((literal) => !source(path).includes(literal))
const srcFiles = readdirSync("src", { recursive: true })
  .map((path) => `src/${String(path).replace(/\\/g, "/")}`)
  .filter((path) => /\.(?:ts|tsx)$/.test(path))
const callers = (name, ...except) => srcFiles.filter((path) => !except.includes(path) && new RegExp(`\\b${name}\\b`).test(source(path)))
const DS = "src/lib/design-system.ts"
const SHELL_KEPT = has(DS, "export function getTableShellClasses()") // Task 16 Part B keeps it @deprecated (see the rulings)
const ROLES = `${D}admin/roles/page.tsx`
const LOGS = `${D}admin/logs/page.tsx`
const STORAGE = `${D}admin/storage/page.tsx`
const APPROVALS = `${D}admin/approvals/page.tsx`
const HISTORY = `${D}admin/approvals/history/page.tsx`
const READINESS = `${D}admin/readiness/page.tsx`
const SETTINGS = `${D}admin/settings/page.tsx`
const DENIED = `${D}access-denied/page.tsx`
const NOTIFICATIONS = `${D}notifications/page.tsx`
const MY_ASSETS = `${D}my-assets/page.tsx`
const REPORTS = `${D}reports/page.tsx`
const DASHBOARD = `${D}dashboard/page.tsx`
const WORK = `${D}work-center/page.tsx`
const R = `${C}reports/`
const SCREEN_FILES = [ROLES, LOGS, STORAGE, APPROVALS, HISTORY, READINESS, SETTINGS, DENIED, NOTIFICATIONS, MY_ASSETS, REPORTS, DASHBOARD, WORK, ...["report-filter-panel", "report-view-tabs", "responsive-report-list", "reports-overview-view", "reports-catalog-view", "reports-operations-view", "reports-accounting-view"].map((name) => `${R}${name}.tsx`), `${C}master-data/master-data-layout.tsx`]
const messages = Object.fromEntries(["th", "en"].map((locale) => [locale, JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))]))
const NEW_KEYS = {
  "notifications.type_info": ["ทั่วไป", "General"],
  "notifications.type_warning": ["ควรติดตาม", "Needs attention"],
  "notifications.type_danger": ["เร่งด่วน", "Urgent"],
  "notifications.type_success": ["เรียบร้อย", "Done"],
  "systemLogPage.empty": ["ยังไม่มีบันทึกระบบ", "No system log entries yet"],
  "systemLogPage.emptyFiltered": ["ไม่พบบันทึกที่ตรงกับตัวกรอง", "No entries match the filters"],
  "workCenter.viewNavigation": ["มุมมองงาน", "Work view"],
}
const message = (locale, key) => key.split(".").reduce((node, part) => node?.[part], messages[locale])
// Task 2's open issue: the user confirms the new subtitle or the change file drops it. The docs follow what is there.
const SUBTITLE_CHANGED = message("th", "systemLogPage.subtitle") === "ตรวจสอบประวัติการแก้ไขข้อมูลในระบบ" && message("en", "systemLogPage.subtitle") === "Review the audit trail of changes in the system"
const lfg = source("tests/list-frame-guards.test.ts")
const vfg = source("tests/visual-foundation-guards.test.ts")
const facts = {
  "ReportHeader, ReportActiveFilters and MetricCard are deleted; master-data-layout.tsx exports only MasterDataSearch and ActiveBadge":
    !existsSync(`${R}report-header.tsx`) && !existsSync(`${R}report-active-filters.tsx`) && !existsSync(`${C}ui/metric-card.tsx`) &&
    JSON.stringify([...source(`${C}master-data/master-data-layout.tsx`).matchAll(/^export function (\w+)/gm)].map((match) => match[1])) === '["MasterDataSearch","ActiveBadge"]',
  "four h1 are left outside PageHeader: the login page, the two print pages and the field scan header":
    JSON.stringify(srcFiles.filter((path) => path !== `${C}ui/page-header.tsx` && /<h1\b/.test(source(path))).sort()) ===
      JSON.stringify(["src/app/[locale]/(auth)/login/page.tsx", `${C}asset-operations/operation-document-print.tsx`, `${C}assets/asset-label-print.tsx`, `${C}audit/audit-scan-header.tsx`].sort()),
  "the system log, the approval history and my assets page on the server; the two admin lists are timed":
    has(LOGS, "parseListPage(", 'withPerformanceTiming("admin-logs.list-data"', "prisma.systemLog.count({ where })", "<TabNav", 'role="search"', "<TableEmptyRow") && lacks(LOGS, "take: 100") &&
    has(HISTORY, "parseListPage(", 'withPerformanceTiming("approval-history.list-data"', "buildApprovalDecisionLogWhere(", "prisma.systemLog.groupBy(", "<PageBackLink") && lacks(HISTORY, "take: 150", "FileCheck2") &&
    has(MY_ASSETS, "parseListPage(", "prisma.asset.count({ where })", '<PageHeader title={t("title")}') && lacks(MY_ASSETS, "function PageHeader("),
  "the approval history's where clause and counts live in src/lib/approval-decision-log.ts":
    has("src/lib/approval-decision-log.ts", "export function buildApprovalDecisionLogWhere(", "export function summarizeApprovalDecisionCounts("),
  "the notification type reads through the type_ keys; the messages of this plan are the spec §10.2 words":
    has(NOTIFICATIONS, "t.has(`type_${notification.type}`)") &&
    Object.entries(NEW_KEYS).every(([key, [th, en]]) => message("th", key) === th && message("en", key) === en),
  "the work center: two TabNav rows (the switch named by workCenter.viewNavigation), StatStrip rows of at most four, no local MetricCard":
    has(WORK, 'aria-label={t("viewNavigation")}', 'aria-label={t("focusNavigation")}', "function splitStatRows<T>(items: readonly T[], most = 4)", "auditRoundOperationalWhere") &&
    lacks(WORK, "WorkCenterViewLink", "function MetricCard("),
  "the reports: PageHeader with the outline export first, FilterChipList, StatStrip, the view tabs in their client wrapper, money strips one tile a row below sm":
    has(REPORTS, '<PageHeader title={t("title")} meta={t("subtitle")} actions={headerActions} />', "<FilterChipList", '<div className="space-y-6" data-report-page>', 'className="max-sm:grid-cols-1"') &&
    source(REPORTS).indexOf('buttonVariants({ variant: "outline", size: "md" })') < source(REPORTS).indexOf('buttonVariants({ size: "md" })') &&
    has(`${R}report-view-tabs.tsx`, '"use client"', "<TabNav", 'linkClassName="snap-start"', "data-report-tabs") &&
    has(`${R}reports-accounting-view.tsx`, 'const moneyStripClasses = "max-sm:grid-cols-1 lg:grid-flow-row lg:grid-cols-2 lg:grid-rows-none"') &&
    (source(`${R}report-filter-panel.tsx`).match(/<FilterSelect\b/g) ?? []).length === 6 && has(`${R}report-filter-panel.tsx`, "<SearchField", "<FilterFormActions", 'role="search"') &&
    lacks(`${R}report-filter-panel.tsx`, "ActionButton", "getActionButtonClasses", "function ReportSelect"),
  "the dashboard keeps shouldUseEmployeeHome and the cancelled-round filter; the storage tables are DataTable; the settings page changed its header only":
    has(DASHBOARD, '<PageHeader title={t("title")} />', "shouldUseEmployeeHome(user)", "auditRoundOperationalWhere", "formatDateTime(log.createdAt)") &&
    (source(STORAGE).match(/<DataTable\b/g) ?? []).length === 3 && has(STORAGE, "<StorageArchiveButton") && lacks(STORAGE, "getTableShellClasses") &&
    has(SETTINGS, "<PageHeader", "buildLdapSyncHistoryItems", "ldapSyncHistory={ldapSyncHistory}") && has(DENIED, 'tone="permission"', 'buttonVariants({ size: "lg" })'),
  "ActionButton's one call site is error.tsx; six design-system helpers have no caller; AssetDeleteButton has none":
    JSON.stringify(callers("ActionButton", `${C}ui/action-button.tsx`, DS)) === JSON.stringify([`${D}error.tsx`]) &&
    ["getActionButtonClasses", "getTableShellClasses", "getResponsiveTableScrollClasses", "getEmptyStateClasses", "getMetricCardToneClasses", "getMobileSafeBottomPaddingClasses"].every((name) => callers(name, DS).length === 0) &&
    JSON.stringify(callers("MasterDataDeleteButton", `${C}master-data/master-data-delete-button.tsx`)) === JSON.stringify([`${C}master-data/asset-delete-button.tsx`]) &&
    callers("AssetDeleteButton", `${C}master-data/asset-delete-button.tsx`).length === 0 &&
    has(DS, "No caller since phase 2B plan 5 (the report filter panel uses Button); phase 2D deletes it."),
  "no file this plan moved writes font-mono; the two floating create buttons are still there (2D)":
    SCREEN_FILES.every((path) => lacks(path, "font-mono")) && has(ROLES, "fixed bottom-6 right-6") && has(`${D}admin/users/page.tsx`, "fixed bottom-6 right-6"),
  "the lock is in: test L9, one R7 test over every line":
    lfg.includes('test("L9 every 2B budget equals KEEP, so phase 2D only empties KEEP"') &&
    vfg.includes('test("R7 neutral fills are opaque tokens, table headers included"') && !vfg.includes("TABLE_HEADER_LINE") && !vfg.includes("R7 interim"),
}
const missingFacts = Object.entries(facts).filter(([, ok]) => !ok).map(([name]) => name)

// The guard numbers the docs quote, read from the guard files (spec §10.4 table C column 2B-5, less what 2C plan 4 did).
const block = (all, head) => {
  const at = all.indexOf(head)
  return at < 0 ? "" : all.slice(at, all.indexOf("\n}\n", at))
}
const ROW = /^\s+(?:\[`[^`]+`\]|"[^"]+"): (\d+),/
const r7Rows = block(vfg, "const TABLE_HEADER_FILLS: Record<").split("\n").filter((line) => ROW.test(line))
const r7 = { total: r7Rows.reduce((sum, line) => sum + Number(ROW.exec(line)[1]), 0), files: r7Rows.length }
const r7OnlyImportPreview = r7Rows.length === 1 && r7Rows[0].includes("asset-import-preview-panel.tsx")
const budgets = {}
let guard
for (const line of block(lfg, "const BUDGETS: Record<").split("\n")) {
  const head = /^ {2}(L[A-Z]\d): \{/.exec(line)
  if (head) {
    guard = head[1]
    budgets[guard] = 0
    continue
  }
  const row = ROW.exec(line)
  if (row && guard) budgets[guard] += Number(row[1])
}
const GUARDS = ["LH1", "LH2", "LB1", "LP1", "LF1", "LT1", "LT2", "LT3", "LT4", "LT5", "LV1", "LV2", "LV3", "LS1", "LS2", "LK1", "LN1", "LN2", "LR1"]
const kept = GUARDS.filter((id) => budgets[id] > 0)
const empty = GUARDS.filter((id) => !(budgets[id] > 0))
const andList = (items) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`)
const keptList = kept.map((id) => `${id} ${budgets[id]}`).join(" · ")
const migratedBlock = lfg.match(/const MIGRATED_LIST_FILES: string\[\] = \[([\s\S]*?)\n\]/)?.[1] ?? ""
const migrated = migratedBlock.split("\n").filter((line) => /^\s+[`"]/.test(line)).length
const filterBlock = source("tests/list-filters-ui.test.ts").match(/const MIGRATED_FILTER_FILES = \[([\s\S]*?)\n\]/)?.[1] ?? ""
const filterFiles = new Set(filterBlock.split("\n").map((line) => line.trim()).filter((line) => line.startsWith('"'))).size
const fills = (n) => `${n} ${n === 1 ? "fill" : "fills"}`
const inFiles = (n) => `${n} ${n === 1 ? "file" : "files"}`
const liveGuards = {
  "DESIGN.md": [
    `Since plan 2B-5, guard R7 checks every line, table headers included, against \`TABLE_HEADER_FILLS\`, which keeps ${fills(r7.total)} in ${inFiles(r7.files)}: the import preview table header, which phase 2D moves.`,
    `\`tests/list-filters-ui.test.ts\` holds ${filterFiles} filter files to the shared fields (\`MIGRATED_FILTER_FILES\`:`,
    `After plan 2B-5 (the lock), guard LV2 counts ${budgets.LV2} typed \`"-"\`, LV1 ${budgets.LV1} bare \`toLocaleString()\` calls and LV3 ${budgets.LV3} \`formatCurrency(\` calls, every one a \`KEEP\` row for phase 2D (73, 15 and 16 after plan 2B-4;`,
  ],
  "DEVELOPER_HANDOFF.md": [
    `\`TABLE_HEADER_FILLS\` keeps ${fills(r7.total)} in ${inFiles(r7.files)}, the import preview header, for 2D; it was 44 → 29 → 17 → 11 → 9 → ${r7.total} over 2B plans 1–4, 2C plan 4 and 2B plan 5)`,
  ],
  handoff: [
    `  - VFG: R7 is one test over every line, \`R7 neutral fills are opaque tokens, table headers included\`; \`TABLE_HEADER_FILLS\` keeps ${fills(r7.total)} in ${inFiles(r7.files)} (\`assets/asset-import-preview-panel.tsx\`, the import preview header, 2D).`,
    `  - LFG after this plan (every budget equals its \`KEEP\` row): ${keptList}; ${andList(empty)} are empty.`,
    `  - \`MIGRATED_LIST_FILES\` holds ${migrated} files: the 77 of \`6835bdf\`, ${migrated - 78} files of this plan and \`c/admin/role-permission-form.tsx\`. \`MIGRATED_FILTER_FILES\` (\`tests/list-filters-ui.test.ts\`) holds ${filterFiles}:`,
  ],
  "docs/99_CHANGELOG.md": [
    `\`TABLE_HEADER_FILLS\` เหลือ ${r7.total} จุดใน ${r7.files} ไฟล์`,
    `LFG \`BUDGETS\` เท่ากับ \`KEEP\` (test ใหม่ L9): ${keptList} (${empty.join(" · ")} ว่าง)`,
    `\`MIGRATED_LIST_FILES\` ${migrated} ไฟล์ · \`MIGRATED_FILTER_FILES\` ${filterFiles} ไฟล์`,
  ],
}
const guardScope = { "DESIGN.md": text["DESIGN.md"], "DEVELOPER_HANDOFF.md": text["DEVELOPER_HANDOFF.md"], handoff, "docs/99_CHANGELOG.md": entry }
const missingGuards = Object.entries(liveGuards).flatMap(([scope, fragments]) => fragments.filter((fragment) => !guardScope[scope].includes(fragment)).map((fragment) => `${scope}: ${fragment}`))

// The line numbers the handoff gives phase 2D, recomputed from the files.
const lines = (path) => source(path).split("\n")
const lineOf = (path, test, from = 0) => {
  const rows = lines(path)
  for (let index = from; index < rows.length; index += 1) if (test(rows[index])) return index + 1
  return 0
}
const fn = (name) => lineOf(DS, (row) => row.startsWith(`export function ${name}(`))
const padding = fn("getMobileSafeBottomPaddingClasses")
const tone = (row) => row.includes("getMetricCardToneClasses(")
const toneFirst = lineOf("tests/design-system.test.ts", (row) => tone(row) && row.trimStart().startsWith("assert"))
const toneLast = lines("tests/design-system.test.ts").reduce((last, row, index) => (tone(row) && row.trimStart().startsWith("assert") ? index + 1 : last), 0)
const helpers = [`\`getActionButtonClasses\` \`:${fn("getActionButtonClasses")}\``]
if (SHELL_KEPT) helpers.push(`\`getTableShellClasses\` \`:${fn("getTableShellClasses")}\` (\`@deprecated\` since plan 2B-5)`)
helpers.push(`\`getResponsiveTableScrollClasses\` \`:${fn("getResponsiveTableScrollClasses")}\``, `\`getEmptyStateClasses\` \`:${fn("getEmptyStateClasses")}\``)
const handedOn = [
  `Helpers that no screen calls any more, in \`src/lib/design-system.ts\`: ${helpers.join(", ")} and \`getMetricCardToneClasses\` \`:${fn("getMetricCardToneClasses")}\`, all pinned in \`tests/design-system.test.ts\` (\`getMetricCardToneClasses\` at \`:${toneFirst}-${toneLast}\`); and \`ActionButton\`, whose one call site is the retry button \`src/app/[locale]/(dashboard)/error.tsx:${lineOf(`${D}error.tsx`, (row) => row.includes("<ActionButton"))}\`.`,
  `\`getMobileSafeBottomPaddingClasses()\` \`src/lib/design-system.ts:${padding}-${lineOf(DS, (row) => row === "}", padding)}\` and its pin \`tests/audit-scan-search-ui.test.ts:${lineOf("tests/audit-scan-search-ui.test.ts", (row) => row.includes("assert.match(designSystem, /pb-"))}\``,
  `with the pin \`tests/confirm-dialog-ui.test.ts:${lineOf("tests/confirm-dialog-ui.test.ts", (row) => row.includes("master-data-delete-button.tsx"))}\``,
  `the two floating create buttons \`D/admin/roles/page.tsx:${lineOf(ROLES, (row) => row.includes("fixed bottom-6 right-6"))}\` and \`D/admin/users/page.tsx:${lineOf(`${D}admin/users/page.tsx`, (row) => row.includes("fixed bottom-6 right-6"))}\``,
  `the pin \`tests/list-pages-ui.test.ts:${lineOf("tests/list-pages-ui.test.ts", (row) => row.includes("backToList"))}\``,
]
const missingHandedOn = handedOn.filter((fragment) => !handoff.includes(fragment))

// The newest date block of the changelog: from the first "## yyyy-mm-dd" heading to the "---" after it.
const newest = /\n## \d{4}-\d{2}-\d{2}\n/.exec(log)
const newestEnd = newest ? log.indexOf("\n---\n", newest.index) : -1
const newestBlock = newest ? log.slice(newest.index, newestEnd < 0 ? undefined : newestEnd) : ""
const SUBTITLE_EN = "Changed: `systemLogPage.subtitle` reads"
const SUBTITLE_TH = "แก้ค่า `systemLogPage.subtitle`"

const checks = [
  ["every file is CRLF only", files.every((path) => !/(^|[^\r])\n/.test(raw[path]))],
  ["no <today> or findings marker is left", files.every((path) => none(path, "<today>", "<from task-18-findings.md>", "<จาก task-18-findings.md>"))],
  ["the code facts the docs state hold (after Tasks 1–17)", missingFacts.length === 0],
  [
    "the plan file the docs link exists",
    existsSync(PLAN) &&
      count("docs/14_UI_UX_DESIGN_SYSTEM.md", `](superpowers/plans/${PLAN.slice("docs/superpowers/plans/".length)})`) === 2 &&
      handoff.includes(`plan \`${PLAN}\``) &&
      once("docs/99_CHANGELOG.md", `plan \`${PLAN}\``),
  ],
  [
    "DESIGN.md: the R7 lock (Token Contrast Rule, Background, Data Tables)",
    once(
      "DESIGN.md",
      "never `bg-muted/NN` or `bg-accent/NN`, table headers included. Faint text is AA",
      "`R7 neutral fills are opaque tokens, table headers included` in `tests/visual-foundation-guards.test.ts` block new tints.",
      "a solid token (never `bg-muted/NN` or `bg-accent/NN`). Empty states",
      "Table headers are white with no fill and no capitals (B3). Since plan 2B-5, guard R7",
      "11 after plan 2B-4 and 9 after 2C plan 4, which took the role permission and integration client tables onto the white 13/500 header (R-e); a table that moves deletes its row.",
    ) && none("DESIGN.md", "outside table headers", "keep a budget per file (`TABLE_HEADER_FILLS`, guard R7)") && r7OnlyImportPreview,
  ],
  [
    "DESIGN.md: titles, tags and buttons (Display, tag, Legacy, Hand-written buttons, Page header)",
    once(
      "DESIGN.md",
      "four `h1` stay outside it on purpose (guard LH1 `KEEP`): the login page (phase 3, with its frame), the two print pages (700) and the field scan header (`AuditScanHeader`).",
      "Phase 2B put the codes of the pages it moved in `tag` (lists, detail pages, reports and the admin pages).",
      "since plan 2B-5 the one call site left is the retry button of `src/app/[locale]/(dashboard)/error.tsx` (`getActionButtonClasses` has none), and phase 2D moves it to `Button` and deletes both.",
      "keep their own classes until the last 2C batch and 2D move them (phase 2B moved the header, filter, row and pager buttons of every page it moved;",
      "  - The old headers are gone since plan 2B-5: `MasterDataHeader`, `ReportHeader` and the local `PageHeader` of the my-assets page (guard LH2 is empty).",
    ) &&
      none("DESIGN.md", "Pages that a later 2B plan moves", "about 79 code call sites", "their last 3 call sites", "keep their own classes until 2B,") &&
      before("DESIGN.md", "`AuditScanHeader` stays the field-scan exception.\n  - The old headers are gone since plan 2B-5", "- **Back button** (`PageBackLink`"),
  ],
  [
    "DESIGN.md: StatStrip, TabNav and the list rules (num, Border, StatStrip, Link tabs, Pages on the server)",
    once(
      "DESIGN.md",
      "numbers that must line up, such as `StatStrip` values. Every `table`",
      "Tinted boxes (the dashboard's action cards and the callouts phase 2D moves) use `border-{tone}-border`; `MetricCard` and its tone fills are gone since plan 2B-5.",
      "Since plan 2B-5 it is the one number tile of the lists, the detail pages, the reports and the work center (`MetricCard` is deleted; guard LS2 is empty):",
      "Since plan 2B-5 every row of view or filter links on the pages 2B moved is a `TabNav`:",
      "Since plan 2B-5 all nine lists of spec B4 page on the server:",
      "(`admin-logs.list-data`, `approval-history.list-data`, logged with `PERFORMANCE_TIMING=1`).",
    ) && none("DESIGN.md", "until plan 2B-5 removes it", "MetricCard tones"),
  ],
  [
    "DESIGN.md: filters, numbers, Do and Don't",
    once(
      "DESIGN.md",
      "plan 2B-3 the asset register's toolbar and filter sheet, and plan 2B-5 the system log and the report filters.",
      "a raw field in a filter form outside the list has no guard until 2D (spec 2B I34).",
      "`ContentPanel divided`, `Nil`, `formatCount` and `formatMoney`, the loading skeletons of `page-skeleton.tsx`, and the panel and mobile card list helpers.",
      "- **Don't** write a page title, table head, sort header, empty row, pager, filter select, number box or label and value helper of your own,",
    ) &&
      none("DESIGN.md", "plans 2B-3 to 2B-5 move the rest", "After plan 2B-4, guard LV2", "the panel, table shell and mobile card list helpers") &&
      before("DESIGN.md", "when it renders inside another form.\n- **Don't** write a page title", "## 7. Documentation Governance"),
  ],
  [
    "docs/14: the TabNav and StatStrip rows, the guard paragraph, the Reports and 2B registry rows",
    once(
      "docs/14_UI_UX_DESIGN_SYSTEM.md",
      "a row that must keep its own scroll stays a small client wrapper that passes `ref`, `onScroll` and `linkClassName` (the asset views, the report views) |",
      "| Counts above a list, a report or a work queue | `StatStrip` (the only number tile; `MetricCard` is gone) |",
      "phase 2B moved the list pages and page frames onto them (complete since plan 2B-5)",
      "since plan 2B-5 the list-frame budgets equal what may stay after 2B (`KEEP`, test L9) and R7 checks every line",
      "| Reports | No focused specification of its own; its header, filter panel, view tabs, number strips and tables follow the list primitives of",
      "sequences plan 2B-5 (the admin, report, dashboard, work-center, notification and my-assets pages, and the guard lock), the last plan of phase 2B. |",
    ) && none("docs/14_UI_UX_DESIGN_SYSTEM.md", "plan 2B-5 follows (spec §10.3)", "phases 2B to 2D move the hand-written controls onto them", "| Counts above a list | `StatStrip` |"),
  ],
  [
    "docs/11 and docs/03: the three paged rows and the pagination-count note",
    once(
      "docs/11_FEATURE_LIST.md",
      "| My Assets | `/my-assets` employee self-service asset list, 25/50/100 per page with totals over every asset the person holds |",
      "the history pages on the server (25/50/100; it showed the newest 150)",
      "quick filters as tabs and 25/50/100 pages on the server (it showed the newest 100) |",
    ) &&
      once(
        "docs/03_DATABASE.md",
        "- Phase 2B (UI round 4) added no index, table or column. Its server pagination only reads:",
        "`IX_system_logs_createdAt` serves the order, `IX_system_logs_module_action_createdAt` the module and action filters",
        "`admin-logs.list-data` and `approval-history.list-data`",
      ),
  ],
  [
    "handoff: the timing labels, the MasterDataHeader and R7 bullets, the 2B deferred line and the 2B-4 Next line",
    once(
      "DEVELOPER_HANDOFF.md",
      "since phase 2B plan 5 the admin labels `admin-logs.list-data` (the system log's page of rows and its count) and `approval-history.list-data`",
      "had no caller left, and plan 2B-5 deleted it with `ColumnHeader`, `SortableColumnHeader` and `MasterDataPagination`.",
      "(R1, R2 and, since 2B plan 5, R7 use `assertWithinBudget`, built on `countMatchesByFile` in `tests/helpers/source-files.ts`; R3 uses `findMatches`)",
      "plans 2B-2 to 2B-5 did the rest, and phase 2B is complete since plan 2B-5 (its section lists what moves on to 2D).",
      "- Next: 2B plan 5 (below: admin, reports, dashboard and notifications, and the guard lock) in the main checkout and 2C plan 5 in the worktree `.worktrees/ui-phase2c-plan5` beside it",
    ) &&
      none("DEVELOPER_HANDOFF.md", "until plan 2B-5 deletes it", "R7 neutral fills outside table headers", "- Next: merge this branch; then 2B plan 5 (admin, reports, dashboard and notifications, and the guard lock)"),
  ],
  [
    "handoff: the 2B-5 section before Open Go-Live Decisions, with its bullets",
    count("DEVELOPER_HANDOFF.md", HANDOFF) === 1 &&
      before("DEVELOPER_HANDOFF.md", "## UI Round 4 Phase 2C Plan 4 Admin, Asset and Login Forms and Dialogs (", HANDOFF) &&
      before("DEVELOPER_HANDOFF.md", HANDOFF, "## Open Go-Live Decisions") &&
      [
        "- **Phase 2B is complete.**",
        "- **Deploy:**",
        "- **Real pages for the last three lists (B4, spec §5.9):**",
        "- **What changed, file by file:**",
        "- **Messages:**",
        "- **Guards (the lock of phase 2B):**",
        "- **Tests:**",
        "- **Risks:**",
        "- **Deferred** (phase 2B is done; spec §10.6 row 2B-5):",
        "  - **2D** starts once this branch and 2C plan 5 have both merged",
        "  - **V track**",
        "  - **Checks for a person**",
        "- Dev-app check (Task 18):",
        "- Still open, for a person before the one phase-2 deploy:",
        "- Next: merge this branch;",
      ].every((literal) => handoff.split(literal).length === 2) &&
      (SUBTITLE_CHANGED ? handoff.split(SUBTITLE_EN).length === 2 : !handoff.includes(SUBTITLE_EN)),
  ],
  ["handoff: the 2D lines are the live ones", missingHandedOn.length === 0],
  ["the guard numbers in DESIGN.md, the handoff and the changelog are the ones the guard files hold", missingGuards.length === 0],
  [
    "changelog: the 2B-5 entry in the newest date block, above the 2C plan 4 entry",
    once("docs/99_CHANGELOG.md", ENTRY) &&
      entry.split("- **ตรวจบนแอป (Task 18):**").length === 2 &&
      newestBlock.includes(`\n${ENTRY}\n`) &&
      before("docs/99_CHANGELOG.md", ENTRY, "### ฟอร์มและ dialog ชุดที่เหลือของผู้ดูแลระบบ ทรัพย์สิน และหน้าเข้าสู่ระบบ (UI รอบ 4 เฟส 2C plan 4)") &&
      (SUBTITLE_CHANGED ? entry.split(SUBTITLE_TH).length === 2 : !entry.includes(SUBTITLE_TH)),
  ],
]
let failed = 0
checks.forEach(([name, ok], index) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${String(index + 1).padStart(2)} ${name}`)
  if (!ok) failed += 1
})
console.log(`info getTableShellClasses ${SHELL_KEPT ? "kept (@deprecated)" : "deleted"} · systemLogPage.subtitle ${SUBTITLE_CHANGED ? "changed" : "unchanged"}`)
if (missingFacts.length) console.log(`these code facts do not hold:\n${missingFacts.join("\n")}`)
if (missingHandedOn.length) console.log(`the handoff section lacks these live fragments:\n${missingHandedOn.join("\n")}`)
if (missingGuards.length) console.log(`these guard fragments are missing:\n${missingGuards.join("\n")}`)
process.exit(failed ? 1 : 0)
```

- [ ] **Step 3: Run it**

Run: `node <temp>/check-docs-2b5.mjs`
Expected: exit 1 (ignore a `MODULE_TYPELESS_PACKAGE_JSON` warning on stderr). Checks 1–3 print `ok` (the files are CRLF, no marker yet, and the code of Tasks 1–17 says what the docs will say); checks 4–15 print `FAIL`; then the `info` line and these two lists:
```
info getTableShellClasses kept (@deprecated) · systemLogPage.subtitle changed
the handoff section lacks these live fragments:
Helpers that no screen calls any more, in `src/lib/design-system.ts`: `getActionButtonClasses` `:95`, `getTableShellClasses` `:56` (`@deprecated` since plan 2B-5), `getResponsiveTableScrollClasses` `:60`, `getEmptyStateClasses` `:72` and `getMetricCardToneClasses` `:32`, all pinned in `tests/design-system.test.ts` (`getMetricCardToneClasses` at `:29-33`); and `ActionButton`, whose one call site is the retry button `src/app/[locale]/(dashboard)/error.tsx:30`.
`getMobileSafeBottomPaddingClasses()` `src/lib/design-system.ts:113-115` and its pin `tests/audit-scan-search-ui.test.ts:188`
with the pin `tests/confirm-dialog-ui.test.ts:36`
the two floating create buttons `D/admin/roles/page.tsx:237` and `D/admin/users/page.tsx:208`
the pin `tests/list-pages-ui.test.ts:570`
these guard fragments are missing:
DESIGN.md: Since plan 2B-5, guard R7 checks every line, table headers included, against `TABLE_HEADER_FILLS`, which keeps 1 fill in 1 file: the import preview table header, which phase 2D moves.
DESIGN.md: `tests/list-filters-ui.test.ts` holds 13 filter files to the shared fields (`MIGRATED_FILTER_FILES`:
DESIGN.md: After plan 2B-5 (the lock), guard LV2 counts 68 typed `"-"`, LV1 5 bare `toLocaleString()` calls and LV3 6 `formatCurrency(` calls, every one a `KEEP` row for phase 2D (73, 15 and 16 after plan 2B-4;
DEVELOPER_HANDOFF.md: `TABLE_HEADER_FILLS` keeps 1 fill in 1 file, the import preview header, for 2D; it was 44 → 29 → 17 → 11 → 9 → 1 over 2B plans 1–4, 2C plan 4 and 2B plan 5)
handoff:   - VFG: R7 is one test over every line, `R7 neutral fills are opaque tokens, table headers included`; `TABLE_HEADER_FILLS` keeps 1 fill in 1 file (`assets/asset-import-preview-panel.tsx`, the import preview header, 2D).
handoff:   - LFG after this plan (every budget equals its `KEEP` row): LH1 4 · LB1 7 · LP1 4 · LT1 5 · LV1 5 · LV2 68 · LV3 6 · LS1 5 · LK1 1 · LN1 2 · LN2 1; LH2, LF1, LT2, LT3, LT4, LT5, LS2 and LR1 are empty.
handoff:   - `MIGRATED_LIST_FILES` holds 99 files: the 77 of `6835bdf`, 21 files of this plan and `c/admin/role-permission-form.tsx`. `MIGRATED_FILTER_FILES` (`tests/list-filters-ui.test.ts`) holds 13:
docs/99_CHANGELOG.md: `TABLE_HEADER_FILLS` เหลือ 1 จุดใน 1 ไฟล์
docs/99_CHANGELOG.md: LFG `BUDGETS` เท่ากับ `KEEP` (test ใหม่ L9): LH1 4 · LB1 7 · LP1 4 · LT1 5 · LV1 5 · LV2 68 · LV3 6 · LS1 5 · LK1 1 · LN1 2 · LN2 1 (LH2 · LF1 · LT2 · LT3 · LT4 · LT5 · LS2 · LR1 ว่าง)
docs/99_CHANGELOG.md: `MIGRATED_LIST_FILES` 99 ไฟล์ · `MIGRATED_FILTER_FILES` 13 ไฟล์
```
These are the fragments Steps 4, 8 and 9 write. If check 3 fails, the script prints the code facts that do not hold: a task left the code different from what the docs say, so find which and stop. If a fragment differs from the text below (a Task 18 fix moved a line, or a total differs), use the printed fragment in Steps 4, 8 and 9 instead of the text below and say so in the task report.

- [ ] **Step 4: `DESIGN.md` (18 replacements)**

(1) §2 The Token Contrast Rule, neutral fills (`:266`). Replace:

```
never `bg-muted/NN` or `bg-accent/NN` outside table headers. Faint text is AA
```

with:

```
never `bg-muted/NN` or `bg-accent/NN`, table headers included. Faint text is AA
```

(2) The same paragraph, the guard's name (Task 17 renamed the test). Replace:

```
`R7 neutral fills are opaque tokens outside table headers` in
```

with:

```
`R7 neutral fills are opaque tokens, table headers included` in
```

(3) §3 Display (`:284`). Replace:

```
Pages that a later 2B plan moves still draw their own 700 `h1` until then (guard LH1 counts them).
```

with:

```
Since phase 2B every page title of the dashboard shell is built this way; four `h1` stay outside it on purpose (guard LH1 `KEEP`): the login page (phase 3, with its frame), the two print pages (700) and the field scan header (`AuditScanHeader`).
```

(4) §3 Utilities, `num` (`:300`). Replace:

```
such as `StatStrip` values (and `MetricCard` values until plan 2B-5 removes it).
```

with:

```
such as `StatStrip` values.
```

(5) §3 Utilities, `tag` (`:301`, spec `:301`). Replace:

```
First user: breadcrumb codes (`code: true`); about 79 code call sites move to it in phase 2B.
```

with:

```
First user: breadcrumb codes (`code: true`). Phase 2B put the codes of the pages it moved in `tag` (lists, detail pages, reports and the admin pages). Codes still in `font-mono` (forms and settings, the component parts of the asset pages, the integration manager and the label print page) and codes inside a translated sentence or a string a page builds (`assetTag - name`) wait for phase 2D.
```

(6) §5 Buttons, Legacy (`:374`). Replace:

```
phase 2D moves their last 3 call sites (`src/app/[locale]/(dashboard)/error.tsx` and `reports/report-filter-panel.tsx`) to `Button` and deletes them.
```

with:

```
since plan 2B-5 the one call site left is the retry button of `src/app/[locale]/(dashboard)/error.tsx` (`getActionButtonClasses` has none), and phase 2D moves it to `Button` and deletes both.
```

(7) §5 Buttons, Hand-written buttons (`:375`, spec `:375`). Replace:

```
- **Hand-written buttons** keep their own classes until 2B, the later 2C batches and 2D move them;
```

with:

```
- **Hand-written buttons** keep their own classes until the last 2C batch and 2D move them (phase 2B moved the header, filter, row and pager buttons of every page it moved; the action links of the report cards, the readiness checks and the work-center panels, the storage archive button and the two floating create buttons are 2D's);
```

(8) §5 Cards / Containers, Background (`:434`). Replace:

```
a solid token (never `bg-muted/NN` or `bg-accent/NN` outside table headers).
```

with:

```
a solid token (never `bg-muted/NN` or `bg-accent/NN`).
```

(9) §5 Cards / Containers, Border (`:436`). Replace:

```
MetricCard tones and tinted boxes use `border-{tone}-border`.
```

with:

```
Tinted boxes (the dashboard's action cards and the callouts phase 2D moves) use `border-{tone}-border`; `MetricCard` and its tone fills are gone since plan 2B-5.
```

(10) §5 Cards / Containers, the end of the `StatStrip` bullet (`:440`). Replace:

```
a cell that needs action has a warning foot line with its icon (guards LS1, LS2).
```

with:

```
a cell that needs action has a warning foot line with its icon (guards LS1, LS2). Since plan 2B-5 it is the one number tile of the lists, the detail pages, the reports and the work center (`MetricCard` is deleted; guard LS2 is empty): a strip of money is one tile a row below `sm` (`max-sm:grid-cols-1`; the accounting strips keep two a row from `lg`), and more than four numbers split into strips of at most four (the work center), so a 28px value is never cut. A cell links where the old tile linked (the report drill-downs, the work-center queues).
```

(11) §5 Inputs / Fields, Migration (`:464`, spec `:459`). Replace:

```
and plans 2B-3 to 2B-5 move the rest.
```

with:

```
plan 2B-3 the asset register's toolbar and filter sheet, and plan 2B-5 the system log and the report filters. `tests/list-filters-ui.test.ts` holds 13 filter files to the shared fields (`MIGRATED_FILTER_FILES`: every `src/app` page that had a raw filter field, the master-data search, the report filter panel and the data-quality review queue); a raw field in a filter form outside the list has no guard until 2D (spec 2B I34).
```

(12) §5 Navigation, **Page header**, a sub-bullet after its last one (`:512`). Replace:

```
  - The header has no outer margin: a page root uses `space-y-6`, and a form or tool passes `className="mb-6"`. `AuditScanHeader` stays the field-scan exception.
```

with:

```
  - The header has no outer margin: a page root uses `space-y-6`, and a form or tool passes `className="mb-6"`. `AuditScanHeader` stays the field-scan exception.
  - The old headers are gone since plan 2B-5: `MasterDataHeader`, `ReportHeader` and the local `PageHeader` of the my-assets page (guard LH2 is empty). A header button that downloads a file from an API route is a plain `<a href>` with `buttonVariants` (the two exports of the reports page, the outline one first, K8).
```

(13) §5 Navigation, the end of **Link tabs** (`:514`). Replace:

```
State that does not change the URL uses `Segmented` instead.
```

with:

```
State that does not change the URL uses `Segmented` instead. Since plan 2B-5 every row of view or filter links on the pages 2B moved is a `TabNav`: the report views (inside the client wrapper `ReportViewTabs`, which keeps the scroll and the snap, I9), the work center's all / mine switch (named "มุมมองงาน", `workCenter.viewNavigation`; links, so Ctrl+click and no JavaScript still work, I10) and its queue row, the quick filters of the system log, and the module and decision rows of the approval pages, each row named by its label.
```

(14) §5 Data Tables, the R7 sentence (`:519`, spec `:498`). Replace:

```
Table-header fills (`bg-muted/NN`) keep a budget per file (`TABLE_HEADER_FILLS`, guard R7): 44 at the start of 2B, 29 after plan 2B-1, 17 after plans 2B-2 and 2B-3, 11 after plan 2B-4, and 2C plan 4 deleted the rows of the role permission and integration client tables, which took the white 13/500 header (R-e); the commit that moves a table deletes its row.
```

with:

```
Table headers are white with no fill and no capitals (B3). Since plan 2B-5, guard R7 checks every line, table headers included, against `TABLE_HEADER_FILLS`, which keeps 1 fill in 1 file: the import preview table header, which phase 2D moves. The budget was 44 at the start of 2B, 29 after plan 2B-1, 17 after plans 2B-2 and 2B-3, 11 after plan 2B-4 and 9 after 2C plan 4, which took the role permission and integration client tables onto the white 13/500 header (R-e); a table that moves deletes its row.
```

(15) §5 Data Tables, **Pages on the server** (`:538`). Replace:

```
the findings list takes its total from the strip count when the queue is one the strip counts.
```

with:

```
the findings list takes its total from the strip count when the queue is one the strip counts. Since plan 2B-5 all nine lists of spec B4 page on the server: the system log (it stopped at the newest 100), the approval history (the newest 150) and my assets (no pages at all) were the last. The approval history filters in the database (`buildApprovalDecisionLogWhere`, `src/lib/approval-decision-log.ts`) and counts its strip and its tabs with one read-only `groupBy` over every decision the user may see; my assets reads a light list of the person's assets for its four totals. Both admin lists time their queries (`admin-logs.list-data`, `approval-history.list-data`, logged with `PERFORMANCE_TIMING=1`).
```

(16) §5 Empty Values and Numbers (`:562`, spec `:516`). Replace:

```
After plan 2B-4, guard LV2 counts 73 typed `"-"`, LV1 15 bare `toLocaleString()` calls and LV3 16 `formatCurrency(` calls on screens (97, 19 and 35 after plan 2B-3; 98, 19 and 36 after plan 2B-2; 113, 20 and 42 after plan 2B-1).
```

with:

```
After plan 2B-5 (the lock), guard LV2 counts 68 typed `"-"`, LV1 5 bare `toLocaleString()` calls and LV3 6 `formatCurrency(` calls, every one a `KEEP` row for phase 2D (73, 15 and 16 after plan 2B-4; 97, 19 and 35 after plan 2B-3; 98, 19 and 36 after plan 2B-2; 113, 20 and 42 after plan 2B-1).
```

(17) §6 Do, the end of its first bullet (`:580`, spec `:534`). Replace:

```
`ContentPanel divided`, and the panel, table shell and mobile card list helpers.
```

with:

```
`ContentPanel divided`, `Nil`, `formatCount` and `formatMoney`, the loading skeletons of `page-skeleton.tsx`, and the panel and mobile card list helpers.
```

(18) §6 Don't, a bullet after its last one (`:601`). Replace:

```
or give a dialog its own `<form>` when it renders inside another form.
```

with:

```
or give a dialog its own `<form>` when it renders inside another form.
- **Don't** write a page title, table head, sort header, empty row, pager, filter select, number box or label and value helper of your own, or bring back `MetricCard`, `ReportHeader` or `MasterDataHeader`: since plan 2B-5 the list-frame guards (`tests/list-frame-guards.test.ts`, LH1 to LR1) hold what is left to its `KEEP` row, and phase 2D empties them.
```

Leave the rest of `DESIGN.md` as it is (see the rulings).

- [ ] **Step 5: `docs/14_UI_UX_DESIGN_SYSTEM.md` (5 replacements)**

(1) Shared Components, the `TabNav` row (`:73`). Replace the whole line:

```
| Tabs that change the URL | `TabNav` | `aria-label` names the row; counts through `formatCount`; state that does not change the URL uses `Segmented` |
```

with:

```
| Tabs that change the URL | `TabNav` | `aria-label` names the row; counts through `formatCount`; state that does not change the URL uses `Segmented`; a row that must keep its own scroll stays a small client wrapper that passes `ref`, `onScroll` and `linkClassName` (the asset views, the report views) |
```

(2) Shared Components, the `StatStrip` row (`:81`). Replace the whole line:

```
| Counts above a list | `StatStrip` | values already formatted and counted over the whole filtered list; no tone fill; a cell that filters takes `href`, the cell of the filter in use `current`, and a count that needs action `attention` |
```

with:

```
| Counts above a list, a report or a work queue | `StatStrip` (the only number tile; `MetricCard` is gone) | values already formatted and counted over the whole filtered list; no tone fill; a cell that filters takes `href`, the cell of the filter in use `current`, and a count that needs action `attention`; money one tile a row below `sm`, and more than four numbers in strips of at most four |
```

(3) The paragraph under the table (`:97`). Replace:

```
phases 2B to 2D move the hand-written controls onto them. The ratchet guards in `tests/visual-foundation-guards.test.ts`, for forms and dialogs `tests/form-migration-guards.test.ts`, and for list pages and page frames `tests/list-frame-guards.test.ts` let their per-file budgets go down, never up.
```

with:

```
phase 2B moved the list pages and page frames onto them (complete since plan 2B-5), and the last 2C batch and phase 2D move the rest. The ratchet guards in `tests/visual-foundation-guards.test.ts`, for forms and dialogs `tests/form-migration-guards.test.ts`, and for list pages and page frames `tests/list-frame-guards.test.ts` let their per-file budgets go down, never up; since plan 2B-5 the list-frame budgets equal what may stay after 2B (`KEEP`, test L9) and R7 checks every line, and phase 2D sets every budget to `{}`.
```

(4) Current-Surface Registry, the Reports row (`:111`). Replace the whole line:

```
| Reports | No focused current specification; [`DESIGN.md`](../DESIGN.md) and this guide govern. A focused specification is required before material route-behavior changes. | [`2026-07-10-module-ux-roadmap.md`](superpowers/plans/2026-07-10-module-ux-roadmap.md) provides supporting implementation guidance. |
```

with:

```
| Reports | No focused specification of its own; its header, filter panel, view tabs, number strips and tables follow the list primitives of [`2026-10-12-ui-phase2b-design.md`](superpowers/specs/2026-10-12-ui-phase2b-design.md) §4.4.6, §5.6 and §6.5, and [`DESIGN.md`](../DESIGN.md) and this guide govern. A focused specification is required before material route-behavior changes. | [`2026-07-10-module-ux-roadmap.md`](superpowers/plans/2026-07-10-module-ux-roadmap.md) provides supporting implementation guidance; [`2026-10-15-ui-phase2b-plan5.md`](superpowers/plans/2026-10-15-ui-phase2b-plan5.md) records its move onto the 2B primitives. |
```

(5) Current-Surface Registry, the last cell of the 2B spec row (`:118`). Replace:

```
plan 2B-5 follows (spec §10.3). |
```

with:

```
[`2026-10-15-ui-phase2b-plan5.md`](superpowers/plans/2026-10-15-ui-phase2b-plan5.md) sequences plan 2B-5 (the admin, report, dashboard, work-center, notification and my-assets pages, and the guard lock), the last plan of phase 2B. |
```

The other Shared Components rows need no change: `PageHeader`, `DataTable`, `Pagination`, `FilterSelect`, `FilterFormActions` and `FilterChipList` already say how these pages use them.

- [ ] **Step 6: `docs/11_FEATURE_LIST.md` (3 replacements)**

(1) My Assets (`:56`). Replace the whole line:

```
| My Assets | `/my-assets` employee self-service asset list |
```

with:

```
| My Assets | `/my-assets` employee self-service asset list, 25/50/100 per page with totals over every asset the person holds |
```

(2) Approvals (`:280`). Replace the whole line:

```
| Approvals | Approval inbox/history for workflow-controlled operations |
```

with:

```
| Approvals | Approval inbox/history for workflow-controlled operations; the history pages on the server (25/50/100; it showed the newest 150) and its module and decision counts cover every decision the user may see |
```

(3) System logs (`:285`). Replace the whole line:

```
| System logs | Readable system log presentation with record labels and before/after summaries |
```

with:

```
| System logs | Readable system log presentation with record labels and before/after summaries; quick filters as tabs and 25/50/100 pages on the server (it showed the newest 100) |
```

- [ ] **Step 7: `docs/03_DATABASE.md` (1 replacement)**

Operational Notes, a bullet after its last one (`:140`, the last line of the file). Replace:

```
- Guarded test-data cleanup exists for trial data and run-number reset, but it requires explicit flags and environment confirmation.
```

with the block below. Write the `<from task-18-findings.md>` marker with the count time of the findings (see the rulings); no marker may stay.

```
- Guarded test-data cleanup exists for trial data and run-number reset, but it requires explicit flags and environment confirmation.
- Phase 2B (UI round 4) added no index, table or column. Its server pagination only reads: each paged list runs its `count` (the approval history also a `groupBy`) in the same `Promise.all` as its `findMany`. `system_logs` grows with every action, so the unfiltered count of `/admin/logs` reads a whole index (`IX_system_logs_createdAt` serves the order, `IX_system_logs_module_action_createdAt` the module and action filters and the decisions of the approval history). Measured on `asset_management_dev`: <from task-18-findings.md>. The two pages log their query time as `admin-logs.list-data` and `approval-history.list-data` when `PERFORMANCE_TIMING=1`; if they slow down on Production, record it and add an index only through a reviewed manual migration, not in a UI plan.
```

- [ ] **Step 8: `DEVELOPER_HANDOFF.md` (6 replacements)**

(1) Current Production Readiness Status, the timing labels (`:69`). Replace:

```
Audit labels `audit-rounds.initial-data`, `audit-rounds.progress-data`, `audit-scan.initial-data`, and `audit-scan.checklist-data`.
```

with:

```
Audit labels `audit-rounds.initial-data`, `audit-rounds.progress-data`, `audit-scan.initial-data`, and `audit-scan.checklist-data`; and since phase 2B plan 5 the admin labels `admin-logs.list-data` (the system log's page of rows and its count) and `approval-history.list-data` (the approval history's rows, count and decision totals).
```

(2) Asset Register Redesign, `MasterDataHeader` (`:256`). Replace:

```
has no caller left until plan 2B-5 deletes it.
```

with:

```
had no caller left, and plan 2B-5 deleted it with `ColumnHeader`, `SortableColumnHeader` and `MasterDataPagination`.
```

(3) Phase 2A, the ratchet guards (`:321`, spec §9.11 row `DH:321`). Replace:

```
(R1 and R2 use `assertWithinBudget`, built on `countMatchesByFile` in `tests/helpers/source-files.ts`; R7 calls `countMatchesByFile` and `findMatches` directly, R3 `findMatches`): R1 tone opacity (none: the budget is `{}` since 2B plan 2, when the selected tab's count chip of `audit/rounds/page.tsx` went with `TabNav`), R7 neutral fills outside table headers (none; table-header fills have a budget per file since 2B plan 1, `TABLE_HEADER_FILLS`, 44 → 29 → 17 after 2B plan 2)
```

with:

```
(R1, R2 and, since 2B plan 5, R7 use `assertWithinBudget`, built on `countMatchesByFile` in `tests/helpers/source-files.ts`; R3 uses `findMatches`): R1 tone opacity (none: the budget is `{}` since 2B plan 2, when the selected tab's count chip of `audit/rounds/page.tsx` went with `TabNav`), R7 neutral fills (one test over every line, table headers included, since 2B plan 5; `TABLE_HEADER_FILLS` keeps 1 fill in 1 file, the import preview header, for 2D; it was 44 → 29 → 17 → 11 → 9 → 1 over 2B plans 1–4, 2C plan 4 and 2B plan 5)
```

(4) Phase 2A, the 2B line of "Deferred" (`:343`). Replace:

```
plans 2B-2 to 2B-5 do the rest.
```

with:

```
plans 2B-2 to 2B-5 did the rest, and phase 2B is complete since plan 2B-5 (its section lists what moves on to 2D).
```

(5) The 2B plan 4 "Next" line (`:725`). Replace the whole line:

```
- Next: merge this branch; then 2B plan 5 (admin, reports, dashboard and notifications, and the guard lock) in the main checkout, and 2C plan 5 in the worktree once 2C plan 4 has merged too (spec §8.1–8.2), then 2D and the V track.
```

with:

```
- Next: 2B plan 5 (below: admin, reports, dashboard and notifications, and the guard lock) in the main checkout and 2C plan 5 in the worktree `.worktrees/ui-phase2c-plan5` beside it (spec §8.1–8.2), then 2D and the V track.
```

(6) The new section, before `## Open Go-Live Decisions` (`:784`; after the 2C plan 4 section, whose lines stay as they are). Replace `<today>` with the date of Step 1. Write the four `<from task-18-findings.md>` markers from `task-18-findings.md` in the shape of the 2B plan 4 section's bullets: the load-time marker as one sentence (the two pages, before → after, the range of the samples); "Dev-app check (Task 18)" as one paragraph (what was checked and where, at which widths and zoom, the results, fixes with their commits or "none", accepted mixes, existing issues not caused by 2B-5); "Still open" as nested bullets when it has more than two items: the line then ends at "deploy:", and its last nested bullet is `  - Complete these, together with the open checks of phase 1, 2A, 2C plans 1–4 (and 2C plan 5 once it merges) and 2B plans 1–4 above.` (as in the 2B plan 4 section). If Step 3 printed other fragments, use them in the "Guards" and "Deferred" bullets. Replace:

```
## Open Go-Live Decisions
```

with:

```
## UI Round 4 Phase 2B Plan 5 Admin, Reports, Dashboard, Notifications and the Guard Lock (<today>)

- Branch `feat/ui-phase2b-plan5` (from `master` `6835bdf`: 2A, 2C plans 1–4 and 2B plans 1–4 merged, not deployed), in the main checkout beside 2C plan 5 in `.worktrees/ui-phase2c-plan5`. Spec `docs/superpowers/specs/2026-10-12-ui-phase2b-design.md` (its §10 rulings I1–I34 override the section files in `docs/superpowers/specs/2026-10-12-ui-phase2b/`; this plan's files are §8.9) · plan `docs/superpowers/plans/2026-10-15-ui-phase2b-plan5.md` · canonical values in `DESIGN.md`.
  - Plan 2B-5, the last plan of phase 2B, moves the 25 files of spec §8.9 onto the 2B-1 primitives: `/admin/roles`, `/admin/logs`, `/admin/storage`, `/admin/approvals`, `/admin/approvals/history`, `/admin/readiness`, the header of `/admin/settings`, `/access-denied`, `/notifications`, `/my-assets`, the reports page with its filter panel, view tabs, wide-list table and four views, the dashboard and the work center. It deletes `ReportHeader`, `ReportActiveFilters`, `MetricCard` and the old helpers of `master-data-layout.tsx`, and locks the guards. One commit per file; the history page's where clause in `src/lib/approval-decision-log.ts` is a commit of its own (with `tests/approval-decision-log.test.ts`), and each deleted file went in the commit of its last caller.
  - No new primitive, schema, migration, API, RBAC, dependency, index or token. Three lists get read-only queries for their pages (below); seven message keys are new.
- **Phase 2B is complete.** 2D may start once this branch and 2C plan 5 have both merged (spec B7, §8.1); the V track follows 2D (I31), then the one deploy of phase 2.
- **Deploy:** none, as for 2B plans 1–4: one deploy after all of phase 2; `ab1b873` stays the rollback point (no schema change).
- **Real pages for the last three lists (B4, spec §5.9):** each reads `page` and `pageSize` with `parseListPage` (25 by default; 25/50/100), takes `listPageWindow`, counts in the same `Promise.all` with the old `orderBy` plus `{ id: "asc" }`, and redirects a page past the end to the last page with the same filters and page size.
  - `/admin/logs` (it stopped at the newest 100): `systemLog.count({ where })`; the filters keep the page size. `buildSystemLogFilterHref` (`src/lib/system-log-history.ts`) is unchanged: the page adds the page size to the quick-filter links, so the default links read as before.
  - `/admin/approvals/history` (it stopped at the newest 150): the decisions a user may see moved into `buildApprovalDecisionLogWhere` (`src/lib/approval-decision-log.ts`; `tests/approval-decision-log.test.ts` proves it keeps exactly the rows of the old filter for every permission and tab); one window of rows, its `count` and a `groupBy` over every allowed decision (`summarizeApprovalDecisionCounts`), so the strip and the tab counts are full totals. The tabs keep the page size and start at page 1.
  - `/my-assets` (no pages): one window of rows, `asset.count` and a light read of every asset the person holds (the status and one photo id) for the four totals. The detail page's back link still lands on page 1 (2D, below).
  - The two admin lists run inside `withPerformanceTiming` (`admin-logs.list-data`, `approval-history.list-data`). Load time on the production build (median `responseEnd`, before → after): <from task-18-findings.md>.
- **What changed, file by file:**
  - `D/admin/roles/page.tsx`: `PageHeader` with the export as an outline `md` button; the three tinted boxes are one `StatStrip` (`attention` while an inactive role still has users); the role list and the permission matrix are `DataTable framed={false}` in `ContentPanel divided flush`, keys in `tag`, counts through `formatCount`, an empty matrix cell `Nil`; each role row has "แก้ไข" through `RowActions` (`next` only, `groups={[]}`: roles have no delete API), pinned right; the role list has an empty row (the matrix lists a fixed module list and cannot be empty). The floating "เพิ่มบทบาท" button and the pills stay (2D).
  - `D/admin/logs/page.tsx`: the quick filters are a `TabNav` in `FilterPanel` (`systemLogQuickFilters` kept); the module and action fields are `Field` + `Input` with `FilterFormActions` in a `role="search"` form that keeps the page size; the table is a framed `DataTable` with `Pagination` and an empty row (`systemLogPage.empty`, `systemLogPage.emptyFiltered` while a filter is on); the small change table in `<details>` still opens.
  - `D/admin/storage/page.tsx`: the three tables are `DataTable framed={false}` that scroll sideways on phones (inside `getTableShellClasses()` their right columns were cut off, spec §5.10 #6), each with a `TableEmptyRow`; the tinted boxes are two `StatStrip`s; the seven bare `toLocaleString()` are `formatCount`; the review list names each module in words and shows `Nil` for a missing path. `StorageArchiveButton` is placed as before (2D).
  - `D/admin/approvals/page.tsx`: `PageHeader` with two outline `md` buttons; one `StatStrip`; the queue in `ContentPanel divided flush` with the module chips as a `TabNav` with counts (the local `FilterChip` is gone); each row is one link that ends in its action words and a chevron, with no button drawn inside the link (spec §5.10 #3).
  - `src/lib/approval-decision-log.ts` and `D/admin/approvals/history/page.tsx`: the where clause and the folded counts (above); `PageHeader` with `PageBackLink` "กลับไปงานรออนุมัติ" (the `FileCheck2` icon is gone, B2); one `StatStrip` of full totals; the module and decision rows are two `TabNav`s, each named by its visible label; the timeline in `ContentPanel divided flush` with `Pagination`.
  - `D/admin/readiness/page.tsx`, `D/admin/settings/page.tsx` and `D/access-denied/page.tsx` (one commit each): readiness on `PageHeader` with one `StatStrip` and the detected values in `tag` (the check cards unchanged); settings changed its title block only (`buildLdapSyncHistoryItems`, `ldapSyncHistory={ldapSyncHistory}` and the form with its tab row are as they were, O7 is 2C plan 5's); access denied keeps no header (`ActionEmptyState tone="permission"`), its two links are `buttonVariants` `lg`, and the permission sentence lost `font-mono`.
  - `D/notifications/page.tsx`: `PageHeader`; one `StatStrip`; a delivered digest's type is the shared `StatusBadge` with the type in Thai words (`notifications.type_*`; an unknown type shows as it is, spec §5.10 #1); "อ่านแล้ว" and "เลื่อนเตือน" are muted badges (the local `StatusBadge` is gone); a muted item no longer fades its whole card (`opacity-70`); the empty lists are `EmptyNote`. `notification-center-actions.tsx` (2C plan 4's) is placed as before.
  - `D/my-assets/page.tsx`: the shared `PageHeader` replaced the file-local one in the same commit (I14); one `StatStrip`; the phone cards stay, and the table is `DataTable framed={false}` whose rows open the asset; codes in `tag`, an empty serial `Nil`; the account without an employee sees `ActionEmptyState tone="permission"`. `getAssetStateTone` and the shared `StatusBadge` stay (`tests/visual-consistency-ui.test.ts`).
  - `c/reports/report-filter-panel.tsx`: `Field` + `SearchField`, six `FilterSelect`s (`ReportSelect` is gone; LF1 is empty) and `FilterFormActions`, whose "ล้างตัวกรอง" shows only while a filter or a drill-down scope is on (the page passes `hasActiveFilters`); `role="search"`; `ActionButton` left the file.
  - `c/reports/report-view-tabs.tsx`: still the client wrapper that owns the scroll (I9); it renders `TabNav` with the snap row and finds the current tab by its `aria-current` to bring it into view.
  - `c/reports/responsive-report-list.tsx`: from `md` a `DataTable framed={false}` with optional `numeric` columns and a `caption`; an empty list is one `EmptyNote` line; the phone cards stay.
  - The four views, one commit each: every number tile is a `StatStrip` (catalog 1, operations 2, accounting 2 money strips), and the drill-down cells keep their hrefs; counts through `formatCount`, money through `formatMoney` with "บาท" on tiles and "(บาท)" in the accounting table heads (built from the label and `common.baht`, no new key); codes in `tag`; empty breakdowns `EmptyNote`.
  - `D/reports/page.tsx`: `PageHeader` with the two exports as plain `<a>` `md` buttons, the outline one first (K8); `FilterChipList` without the chips' own clear link (I24); one `StatStrip` (the total value reads "12,345,678.00 บาท", one tile a row below `sm`); a `space-y-6` root. `report-header.tsx`, `report-active-filters.tsx` and `ui/metric-card.tsx` were deleted in this commit, their last caller's; `getMetricCardToneClasses` stays (2D).
  - `D/dashboard/page.tsx`: `PageHeader` (title only), a `space-y-6` root (the blocks were 32px apart), every count through `formatCount` with `num`, the activity time through `formatDateTime`; the cards stay cards. `shouldUseEmployeeHome(user)` and `auditRoundOperationalWhere` stay.
  - `D/work-center/page.tsx`: `PageHeader` with a `StatStrip` of the two summary counts; the all / mine switch is a `TabNav` of two links named by `workCenter.viewNavigation` (I10; the sentence under it stays), and the queue links are a second `TabNav`; the local `MetricCard`s are `StatStrip` cells in strips of at most four (`splitStatRows`), each a link to its queue with its sentence as the foot line. The panels below are unchanged.
  - `c/master-data/master-data-layout.tsx` and `src/lib/design-system.ts`, one commit each: `MasterDataHeader`, `ColumnHeader`, `SortableColumnHeader` and `MasterDataPagination` are deleted, and `MasterDataSearch` and `ActiveBadge` stay; `getTableShellClasses` (no caller since the storage page moved) is marked `@deprecated`, and the `@deprecated` comment of `getActionButtonClasses` (no caller since the report filter panel moved) now says so; 2D deletes both.
- **Messages:** new `notifications.type_info`, `type_warning`, `type_danger` and `type_success` ("ทั่วไป", "ควรติดตาม", "เร่งด่วน", "เรียบร้อย" / "General", "Needs attention", "Urgent", "Done"), `systemLogPage.empty` ("ยังไม่มีบันทึกระบบ"), `systemLogPage.emptyFiltered` ("ไม่พบบันทึกที่ตรงกับตัวกรอง") and `workCenter.viewNavigation` ("มุมมองงาน" / "Work view"), the words of spec §10.2. Changed: `systemLogPage.subtitle` reads "ตรวจสอบประวัติการแก้ไขข้อมูลในระบบ" / "Review the audit trail of changes in the system" (it promised the newest 100 entries). Every other word reuses an existing key.
- **Guards (the lock of phase 2B):**
  - VFG: R7 is one test over every line, `R7 neutral fills are opaque tokens, table headers included`; `TABLE_HEADER_FILLS` keeps 1 fill in 1 file (`assets/asset-import-preview-panel.tsx`, the import preview header, 2D). The name stays, because the guard scripts of the 2B plans read it. R1 `{}` · R2 10 in 9 files, unchanged (the two floating create buttons are 2D's, the register's bulk-action bar phase 3's). `:64` and `:90` read `ui/stat-strip.tsx`, and `:90` checks that `ui/metric-card.tsx` is gone.
  - LFG after this plan (every budget equals its `KEEP` row): LH1 4 · LB1 7 · LP1 4 · LT1 5 · LV1 5 · LV2 68 · LV3 6 · LS1 5 · LK1 1 · LN1 2 · LN2 1; LH2, LF1, LT2, LT3, LT4, LT5, LS2 and LR1 are empty. The new test L9 holds `BUDGETS` equal to `KEEP`, so 2D only empties `KEEP` and widens the guards to all of `src`. The four `KEEP` rows 2C plan 4 emptied (LH1 of the label batch and scan tools, LT1 of the role permission form, LV1 of the integration manager) were deleted, never raised. Against spec §10.4 table C column 2B-5, LH1 6 → 4, LT1 7 → 5, LV1 8 → 5 and R7 3 → 1 are lower by exactly what 2C plan 4 did; every other total is table C's.
  - `MIGRATED_LIST_FILES` holds 99 files: the 77 of `6835bdf`, 21 files of this plan and `c/admin/role-permission-form.tsx`. `MIGRATED_FILTER_FILES` (`tests/list-filters-ui.test.ts`) holds 13: every `src/app` page that had a raw filter field (I34), the master-data search, the report filter panel and the data-quality review queue. A raw field in a filter form outside that list has no guard until 2D (I34).
  - `tests/form-migration-guards.test.ts` is not edited (2C's).
- **Tests:** no new file; 23 new tests (1,980 → 2,003): `list-pages-ui` +13 (the ten pages of Tasks 1–8, the dashboard, the work center, and the four link rows that guard LN1 cannot see), `reports-adaptive-ui` +6, `approval-decision-log` +2, `list-filters-ui` +1, `design-system` +1 and `list-frame-guards` +1 (L9); VFG has one test fewer (the two R7 tests are one). Edited pins (spec §10.4 table A row 2B-5): VFG `:2`, `:64`, `:90` and the R7 block, `storage-archive-ui:16`, `report-controls-ui:5`, `:8-11` and `:13-17`, and `reports-adaptive-ui:2` and `:88`. Edited because the deleted `master-data-layout.tsx` helpers were their subject (not in table A): `list-primitives-ui:64-71` and `:318`, `asset-register-filter-ui:127` and `:134`.
- **Risks:**
  - The approval history's strip and tab counts are full totals now, so staff see larger numbers once there are more than 150 decisions (spec §5.9.3, §10.7 item 12).
  - `system_logs` grows with every action, and an unfiltered count reads a whole index; the load time is above and the count time in `docs/03_DATABASE.md`. No index was added (B4).
  - Many admin and report pages change at once for staff: flat number strips instead of tinted boxes, money with "บาท" instead of "฿", underline tabs instead of chips and pills, and the dashboard 8px tighter between blocks.
- **Deferred** (phase 2B is done; spec §10.6 row 2B-5):
  - **2D** starts once this branch and 2C plan 5 have both merged (spec B7, §8.1). From 2B it takes:
    - The guards: empty every `KEEP` row and set every budget to `{}` (LFG, VFG R7 and R2, and 2C's FMG), and widen LFG to all of `src`, which also closes the gap of I34. The `KEEP` rows and their reasons are in `tests/list-frame-guards.test.ts`; the comments of its integration manager and import preview rows still name old line numbers and "2C plan 4".
    - Helpers that no screen calls any more, in `src/lib/design-system.ts`: `getActionButtonClasses` `:95`, `getTableShellClasses` `:56` (`@deprecated` since plan 2B-5), `getResponsiveTableScrollClasses` `:60`, `getEmptyStateClasses` `:72` and `getMetricCardToneClasses` `:32`, all pinned in `tests/design-system.test.ts` (`getMetricCardToneClasses` at `:29-33`); and `ActionButton`, whose one call site is the retry button `src/app/[locale]/(dashboard)/error.tsx:30`.
    - `getMobileSafeBottomPaddingClasses()` `src/lib/design-system.ts:113-115` and its pin `tests/audit-scan-search-ui.test.ts:188`: they stay for 2D by controller ruling P1 of the 2B-5 ∥ 2C-5 pair (`src/lib/design-system.ts` was plan 2B-5's file), not 2C plan 5 as the 2B plan 4 section planned.
    - `MasterDataDeleteButton` and its one wrapper `AssetDeleteButton` (`src/components/master-data/asset-delete-button.tsx`, no caller since plan 2B-3), with the pin `tests/confirm-dialog-ui.test.ts:36`; `ActiveBadge` of `master-data-layout.tsx` (a pill on nine pages).
    - The buttons and boxes 2B left as they were: the two floating create buttons `D/admin/roles/page.tsx:237` and `D/admin/users/page.tsx:208` (VFG R2, R-q); `c/admin/storage-archive-button.tsx` (to `Button variant="outline" size="sm" busy`, spec §5.6; not one of spec §8.9's files); the action links, pills and dashed empty boxes of the report catalog and operations views, and the warning fill of the idle box; the readiness check cards with their pills and links (`getSafeActionLinkClasses`, `getResponsiveActionRowClasses`); the approval policy boxes, approver cards and row pills; the role pills; the notification count pill; the dashboard's KPI, action, trend and status cards with their tone fills, and the cross-scope pills; the work center's follow-up panels, rows and empty boxes; the access-denied permission box.
    - Open points of this plan: `ReportsPageSkeleton` (`c/ui/page-skeleton.tsx`) draws the reports page's two tiles side by side below 640px, where the page now stacks them; `StatStripItem.value` is a string, so a tile with no value (the accounting repair ratio without a purchase value) shows a written "—" that a screen reader reads as a dash, not "ไม่มีข้อมูล" (`StatStrip` needs an empty-value label); the back link of `/my-assets/<id>` returns to page 1 (spec §5.9.2 row 9 needs `src/lib/operational-return-navigation.ts`, `D/my-assets/[id]/page.tsx` and the pin `tests/list-pages-ui.test.ts:570`, none of them this plan's files); `buildSystemLogFilterHref` takes no page size (the page adds it; spec §5.9.2 row 1, pinned by `tests/system-log-history.test.ts:21-24`); `tests/performance-route-instrumentation.test.ts` does not pin the two new timing labels.
    - The older 2D lists stay where they are: "Deferred" of the 2A section, "Handed on, later (2D)" of the 2B plan 4 section and "Handed on to 2D and the V track" of the 2C plan 4 section.
  - **V track** after 2D (I31): the validation UX that 2B and 2C left as it was (spec 2C §4 ruling 17: errors under fields, the three server-enforced fields that show the star without `required`, the date `min` of the label batch tool), then the one deploy.
  - **Checks for a person**, all before the one phase-2 deploy: the "Still open" lists of the 2B plan 1 to 4 sections and of this section, with those of phase 1, 2A and 2C plans 1–5 (NVDA, real iPhone and iPad, the data the dev database lacks, the thermal label test-print of phase 1); then `npm run verify` and a production build on the merged `master`, and the user's approval (spec §8.12).
- Dev-app check (Task 18): <from task-18-findings.md>
- Before/after screenshots: `.superpowers/sdd/screenshots/ui-phase2b-plan5/before/` and `after/` (git-ignored, on the development machine only).
- Still open, for a person before the one phase-2 deploy: <from task-18-findings.md>
- Next: merge this branch; 2D (its own spec) once 2C plan 5 has merged too (spec B7, §8.1), then the V track and the one deploy of phase 2.

## Open Go-Live Decisions
```

Replace the four `<from task-18-findings.md>` markers with the text from the findings; no marker may stay.

- [ ] **Step 9: `docs/99_CHANGELOG.md` (2 replacements)**

(1) A new date block on top (the newest block at `6835bdf` is `## 2026-10-14`; if `<today>` is `2026-10-14`, skip this and put the entry above the 2C plan 4 entry). Replace the line:

```
## 2026-10-14
```

with:

```
## <today>

---

## 2026-10-14
```

(2) The entry, directly under the `## <today>` heading. Replace:

```
## <today>
```

with the block below. Write the "ตรวจบนแอป (Task 18)" bullet from `task-18-findings.md`, in Thai, in the shape of the 2B plan 4 entry's bullet, with the two load times (before → after) and the list of checks still for a person in it.

```
## <today>

### หน้าผู้ดูแลระบบ รายงาน แดชบอร์ด การแจ้งเตือน และการล็อก guard (UI รอบ 4 เฟส 2B plan 5)

Branch `feat/ui-phase2b-plan5` (จาก `master` `6835bdf` ทำคู่กับ 2C plan 5 ใน worktree) · design `docs/superpowers/specs/2026-10-12-ui-phase2b-design.md` (ข้อ 10 ใช้แทนไฟล์ส่วน ไฟล์ของ plan นี้อยู่ข้อ 8.9) · plan `docs/superpowers/plans/2026-10-15-ui-phase2b-plan5.md` · ค่าทั้งหมดอยู่ใน `DESIGN.md`

- **ขอบเขต:** plan สุดท้ายของ 2B · 25 ไฟล์ตามสเปกข้อ 8.9 ไฟล์ละ 1 commit: หน้าสิทธิ์การใช้งาน ประวัติระบบ พื้นที่จัดเก็บไฟล์ งานรออนุมัติ ประวัติการตัดสินใจอนุมัติ ความพร้อมใช้งานจริง หัวหน้าตั้งค่าระบบ หน้าไม่มีสิทธิ์ ศูนย์แจ้งเตือน ทรัพย์สินของฉัน หน้ารายงาน (แผงตัวกรอง แท็บมุมมอง ตาราง และ 4 มุมมอง) แดชบอร์ด ศูนย์แจ้งเตือนงานค้าง และตัวช่วยเก่าใน `master-data-layout.tsx` · ลบ `ReportHeader` `ReportActiveFilters` และ `MetricCard` พร้อมผู้เรียกตัวสุดท้าย · ล็อก guard · ไม่มีของกลางใหม่ ไม่เปลี่ยนขั้นตอนงาน ไม่แตะ schema ไม่เพิ่ม API ไม่เพิ่ม index ไม่เพิ่ม token
- **แบ่งหน้าจริง 3 รายการสุดท้าย (B4):** ประวัติระบบ (เดิมหยุดที่ 100 รายการล่าสุด) ประวัติการตัดสินใจอนุมัติ (เดิม 150) และทรัพย์สินของฉัน (เดิมไม่แบ่งหน้า) แสดงหน้าละ 25 เลือก 25/50/100 ได้ ท้ายตารางมี "1–25 จาก N รายการ · หน้า 1 จาก M" · ตัวกรองคงขนาดหน้าและกลับไปหน้า 1 หน้าที่เกินพาไปหน้าสุดท้าย · ตัวเลขสรุปและตัวนับบนแท็บของประวัติการตัดสินใจอนุมัตินับทุกรายการที่ผู้ใช้เห็นได้ (เดิมนับแค่ 150 รายการล่าสุด ตัวเลขจึงมากขึ้นเมื่อมีเกิน 150) · ทรัพย์สินของฉันยังนับยอดเต็มทั้ง 4 ช่อง · query นับอ่านอย่างเดียว ไม่เพิ่ม index
- **หัวหน้าและปุ่ม:** หัวเรื่องทุกหน้าของ plan นี้เป็นหัวหน้าแบบกลาง น้ำหนัก 600 ปุ่มบนหัวสูง 36 (มือถือ 44) · ประวัติการตัดสินใจอนุมัติ: "กลับไปงานรออนุมัติ" เป็นปุ่มลูกศรซ้าย (เดิมเป็นรูปเอกสาร) · รายงาน: ปุ่มส่งออกทะเบียน (ปุ่มขอบ) อยู่ก่อนปุ่มส่งออกรายงานภาพรวม (สีหลัก) · หน้าไม่มีสิทธิ์: 2 ปุ่มแบบกลาง ประโยคสิทธิ์ใช้ตัวอักษรปกติ
- **กล่องตัวเลข:** กล่องสีของหน้าสิทธิ์การใช้งาน พื้นที่จัดเก็บไฟล์ งานรออนุมัติ ประวัติการตัดสินใจ ความพร้อมใช้งานจริง ศูนย์แจ้งเตือน ทรัพย์สินของฉัน รายงาน และศูนย์แจ้งเตือนงานค้างเป็นแถบตัวเลขแบบเดียวไม่มีพื้นสี สิ่งที่ต้องติดตามขึ้นบรรทัดสีเตือนพร้อมไอคอน · ลบ `MetricCard` · เงินในรายงานเป็น "12,345.67 บาท" แทน "฿12,345.67" ช่องเงินบนมือถืออยู่ช่องละแถว · ศูนย์แจ้งเตือนงานค้าง: ตัวเลขเรียงแถวละไม่เกิน 4 ช่อง ไม่มีไอคอนและพื้นสี แตะแล้วยังเปิดคิวเดิม
- **ตาราง:** หน้าสิทธิ์การใช้งาน (2 ตาราง) ประวัติระบบ พื้นที่จัดเก็บไฟล์ (3 ตาราง) ทรัพย์สินของฉัน และตารางรายงานบนจอใหญ่: หัวตารางพื้นขาว 13px ไม่ใช้ตัวพิมพ์ใหญ่ แถวราว 46px รหัสเป็นตัว monospace ตัวเลขชิดขวา · พื้นที่จัดเก็บไฟล์: 3 ตารางเลื่อนแนวนอนได้บนมือถือ (เดิมคอลัมน์ขวาถูกตัดหาย) รายการตรวจทานบอกชื่อโมดูลเป็นคำ · หน้าสิทธิ์การใช้งาน: "แก้ไข" อยู่ในช่อง 120px ค้างขวาตอนเลื่อน และตารางบทบาทมีแถวว่าง · ประวัติระบบที่ไม่มีข้อมูลเขียน "ยังไม่มีบันทึกระบบ" หรือ "ไม่พบบันทึกที่ตรงกับตัวกรอง" ตารางการเปลี่ยนแปลงใน "ดูรายละเอียด" ยังเปิดได้ · ทรัพย์สินของฉัน: คลิกแถวเปิดทรัพย์สิน การ์ดบนมือถือคงเดิม · ตารางรายงานที่ไม่มีข้อมูลเป็นบรรทัดจาง · หัวคอลัมน์เงินของบัญชีมี "(บาท)"
- **แท็บและตัวกรอง:** ตัวกรองด่วนของประวัติระบบ ชิปโมดูลของงานรออนุมัติ 2 แถวของประวัติการตัดสินใจ มุมมองของรายงาน และ "งานทั้งหมด/งานของฉัน" กับแถวคิวของศูนย์แจ้งเตือนงานค้างเป็นแท็บเส้นใต้ (เป็นลิงก์ Ctrl+คลิกเปิดแท็บใหม่ได้) · แท็บรายงานบนมือถือยังเลื่อนและหยุดตรงแท็บได้ · ตัวกรองของรายงาน: ป้าย 13px ช่องค้นหามีแว่นขยาย select แบบกลาง สูง 40 (มือถือ 44) "ล้างตัวกรอง" ขึ้นเฉพาะตอนมีตัวกรอง ชิปตัวกรองไม่มีแถบสีฟ้าและไม่มีลิงก์ล้างซ้ำ · ตัวกรองของประวัติระบบเป็นช่องแบบกลาง
- **อื่น ๆ:** ศูนย์แจ้งเตือนแสดงชนิดเป็นคำไทย ("ทั่วไป" "ควรติดตาม" "เร่งด่วน" "เรียบร้อย" เดิมแสดง `warning` `danger` `info`) รายการที่ปิดเสียงไม่จางทั้งการ์ด · แดชบอร์ด: หัวเรื่อง 600 ระยะระหว่างกลุ่ม 24px (เดิม 32) เวลาในกิจกรรมไม่มีวินาที ตัวเลขเรียงตรงหลัก · งานรออนุมัติ: แต่ละแถวเป็นลิงก์เดียว ไม่มีกรอบปุ่มซ้อนในลิงก์
- **ข้อความ:** เพิ่ม 7 key ตามสเปกข้อ 10.2 (`notifications.type_info` `type_warning` `type_danger` `type_success` · `systemLogPage.empty` `emptyFiltered` · `workCenter.viewNavigation` "มุมมองงาน") · แก้ค่า `systemLogPage.subtitle` เป็น "ตรวจสอบประวัติการแก้ไขข้อมูลในระบบ" (เดิมเขียนว่าล่าสุด 100 รายการ)
- **guard (ล็อกของ 2B):** VFG R7 เหลือ test เดียวที่ตรวจทุกบรรทัดรวมหัวตาราง `TABLE_HEADER_FILLS` เหลือ 1 จุดใน 1 ไฟล์ (หัวตารางแผงนำเข้า ให้ 2D) · R1 `{}` · R2 10 คงเดิม · LFG `BUDGETS` เท่ากับ `KEEP` (test ใหม่ L9): LH1 4 · LB1 7 · LP1 4 · LT1 5 · LV1 5 · LV2 68 · LV3 6 · LS1 5 · LK1 1 · LN1 2 · LN2 1 (LH2 · LF1 · LT2 · LT3 · LT4 · LT5 · LS2 · LR1 ว่าง) · ลบแถว `KEEP` 4 แถวที่ 2C plan 4 ทำให้เป็น 0 แล้ว ไม่เพิ่มแถวไหน · `MIGRATED_LIST_FILES` 99 ไฟล์ · `MIGRATED_FILTER_FILES` 13 ไฟล์ · ไม่แก้ `form-migration-guards`
- **test:** ไม่มีไฟล์ใหม่ · เพิ่ม 23 test (`list-pages-ui` 13 · `reports-adaptive-ui` 6 · `approval-decision-log` 2 · `list-filters-ui` 1 · `design-system` 1 · `list-frame-guards` 1) และ R7 ของ `visual-foundation-guards` รวมเหลือ test เดียว · แก้ pin ตามสเปกข้อ 10.4 ตาราง A แถว 2B-5 และ pin ที่อ่านตัวช่วยที่ถูกลบ (`list-primitives-ui` `asset-register-filter-ui`)
- **ความเสี่ยง:** ตัวเลขของประวัติการตัดสินใจอนุมัติมากขึ้นเพราะนับยอดเต็ม · การนับ `system_logs` โดยไม่กรองอ่านทั้ง index (เวลาที่วัดอยู่ใน `docs/03_DATABASE.md`) · พนักงานเห็นกล่องตัวเลขไม่มีสีและเงินไม่มี "฿" ในหลายหน้าพร้อมกัน
- **ส่งต่อ:** 2D (ตั้ง `KEEP` และทุก budget เป็น `{}` · ลบ `ActionButton` (เหลือที่ `error.tsx`) `getActionButtonClasses` `getTableShellClasses` `getResponsiveTableScrollClasses` `getEmptyStateClasses` `getMetricCardToneClasses` `getMobileSafeBottomPaddingClasses` และ `MasterDataDeleteButton` · ปุ่มลอย 2 ปุ่ม · ปุ่มเก็บไฟล์ · pill กล่องแจ้ง และกล่องว่างที่เหลือ · skeleton ของรายงานบนมือถือ · ชื่อของค่าว่างใน `StatStrip` · `returnTo` ของหน้ารายละเอียดทรัพย์สินของฉัน) · งาน V หลัง 2D · งานตรวจด้วยคนของทุก plan ก่อน deploy
- **deploy:** ไม่ deploy ใน 2B · deploy ครั้งเดียวหลังเฟส 2 ทั้งหมดและผู้ใช้ตรวจเครื่องจริง · ถอยกลับไป `ab1b873` ได้เพราะไม่มี schema เปลี่ยน
- **ตรวจบนแอป (Task 18):** <จาก task-18-findings.md>
- ภาพก่อน/หลัง: `.superpowers/sdd/screenshots/ui-phase2b-plan5/before/` และ `after/` (git ignore อยู่บนเครื่องพัฒนา)
- ต่อไป: merge · 2D เริ่มเมื่อ 2C plan 5 merge แล้วด้วย (สเปก B7 ข้อ 8.1) · แล้วงาน V · deploy ครั้งเดียวตอนจบเฟส 2
```

Replace the `<จาก task-18-findings.md>` marker with the text from the findings, and every `<today>` with the date; no marker may stay.

- [ ] **Step 10: `.impeccable/design.json`: no change**

No component entry changes in 2B-5 (spec §10.6 row 2B-5 names none; the file has no entry for `MetricCard`, `ReportHeader` or `MasterDataHeader`): leave the file and its `generatedAt` as they are.

Run: `git diff --quiet 6835bdf -- .impeccable/design.json && echo DESIGN-JSON-UNCHANGED`
Expected: `DESIGN-JSON-UNCHANGED`.

- [ ] **Step 11: Check**

Run: `node <temp>/check-docs-2b5.mjs`
Expected: 15 `ok` lines, the `info` line, exit 0, and none of the three lists ("code facts", "live fragments", "guard fragments").

Run: `grep -n "<from task-18\|<จาก task-18\|<today>" DESIGN.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md docs/14_UI_UX_DESIGN_SYSTEM.md docs/11_FEATURE_LIST.md docs/03_DATABASE.md .impeccable/design.json`
Expected: nothing.

Run: `git diff --numstat`
Expected: exactly the six files, each with a small numstat: `DESIGN.md` `17 15` (15 lines changed; one new line each for the Page header sub-bullet and the Don't bullet), `docs/14_UI_UX_DESIGN_SYSTEM.md` `5 5`, `docs/11_FEATURE_LIST.md` `3 3`, `docs/03_DATABASE.md` `1 0`, `DEVELOPER_HANDOFF.md` `61 5` with one line per marker (each nested "Still open" bullet adds one: `64 5` with two items and the closing "Complete these" bullet), `docs/99_CHANGELOG.md` `25 0` (4 lines for the date block, 21 for the entry). A file that shows every line changed was normalized: restore its line endings.

Run: `node -e "for (const f of process.argv.slice(1)) { const s = require('fs').readFileSync(f, 'utf8'); console.log(f, (s.match(/\r\n/g) || []).length, (s.match(/\n/g) || []).length) }" DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md docs/11_FEATURE_LIST.md docs/03_DATABASE.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md`
Expected: the two numbers equal on every line (CRLF throughout).

Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: all green, with the test count Task 18 ended with (`tests 2003 · pass 2002 · fail 0 · skipped 1` when Task 18 added no test: `6835bdf`'s 1980 plus Tasks 1–8 +12, Tasks 9–13 +7 and Tasks 14–17 +4); tsc prints nothing; lint `0 errors, 146 warnings`, every one under `.agents/`. `tests/audit-round-cancellation.test.ts` reads the handoff, the changelog and the feature list; no other test reads these six files. If Task 18 added tests, also change "23 new tests (1,980 → 2,003)" in Step 8 (6) and "เพิ่ม 23 test" in Step 9 to the new totals before you commit.

- [ ] **Step 12: Commit**

```bash
git add DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md docs/11_FEATURE_LIST.md docs/03_DATABASE.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md
git commit -m "docs(ui): phase 2B plan 5 admin, reports and dashboard pages, the guard lock and the 2D hand-off in DESIGN.md, handoff, feature list, database notes, design-system index and changelog

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 6 files in the commit (`git show --stat HEAD`). `git status --short` prints only the untracked paths of Global Constraints.

---

### Task 20: Final verification, rebase if needed, wiki and memory (controller runs this task)

**Files:**
- Modify: `docs/99_CHANGELOG.md`, `DEVELOPER_HANDOFF.md` (verify numbers)
- Modify (vault `D:\Obsidian\Eltross`): `AssetSystem/ams-status.md`, `AssetSystem/ams-log.md`, `AssetSystem/ams-open-questions.md`
- Modify (auto-memory): `review-2026-10-priorities.md`

**Interfaces:**
- Consumes: Tasks 1–19 committed.
- Produces: the branch ready for superpowers:finishing-a-development-branch.

- [ ] **Step 1: Verify.**
  - Run `npm run verify` and record the test count and the build page count.
  - If it passed, add one bullet to the 2B-5 entry in `docs/99_CHANGELOG.md`, directly above its "ตรวจบนแอป (Task 18)" bullet: `` `npm run verify` ผ่าน (test N · ผ่าน N · ข้าม 1 · build X/X หน้า) ``.
  - Add the same numbers to the 2B-5 section of `DEVELOPER_HANDOFF.md`, directly above its "Dev-app check (Task 18)" bullet: ``- Verification: `npm run verify` passes (tests N · pass N · skipped 1 · build X/X pages).``
  - Both files are CRLF: insert with an exact-string edit that writes `\r\n` (a Node script; `sed -i` in Git Bash writes LF).
  - Run `npm test` again (`tests/audit-round-cancellation.test.ts` reads both files).
  - Commit both files with `docs(ui): record phase 2B plan 5 verify results` and the Co-Authored-By line.

- [ ] **Step 2: Rebase if 2C plan 5 merged first (spec §8.2).** Both plans share one repository, so `master` is already local. Run `git merge-base --is-ancestor master HEAD && echo UP-TO-DATE`.
  - If it prints `UP-TO-DATE`, skip to Step 3.
  - Otherwise `master` moved (2C plan 5 merged). Run `git rebase master` and resolve conflicts by spec §8.2:
    - `DESIGN.md`: keep both sides; where both touched the same line, write it so it matches the code after both merges.
    - `tests/visual-foundation-guards.test.ts`: keep both sides; a budget row both lowered takes the lower number; never raise. 2C plan 5 edits the mobile action bar pins; this plan the R7 lock and the `MetricCard` pins.
    - `messages/th.json`, `messages/en.json`: take `master`'s version, then re-run each change file of this plan (`node scripts/messages-edit.mjs <temp>/<change file>`) in task order.
    - `DEVELOPER_HANDOFF.md` (chronological: the section that merged first stays above), `docs/99_CHANGELOG.md` (newest entry on top under its date), `docs/14_UI_UX_DESIGN_SYSTEM.md`, `docs/11_FEATURE_LIST.md`: keep both sides; adjacent table rows keep each side's own row.
    - A conflict in any other file means a fence leaked: abort the rebase (`git rebase --abort`), find the commit that touched the other plan's file, and stop to report.
  - After the rebase: the LFG lock may now be above live counts 2C plan 5 lowered (the four O11 pages' LP1 and LB1 rows): lower those `KEEP`/`BUDGETS` rows to the live counts in a new commit (never raise); run `node <temp>/check-docs-2b5.mjs` (Task 19) and, if it prints other fragments, update the text it names (new commit); then `npm run verify`, `node <temp>/p2b1-precheck.mjs --budgets`, the production build, and the dev-app rows "หลัง rebase" of spec §8.9 (2C-5: `/th/admin/settings` tab row, `/th/admin/integrations`) at 1440 and 375. Update the verify numbers of Step 1 if they changed (new commit).

- [ ] **Step 3: Wiki.** Read `AssetSystem/_schema/ams-wiki-schema.md` first, then:
  - `ams-status.md`: the 2B row says plan 2B-5 (the last 2B plan) is built on `feat/ui-phase2b-plan5` with the verify numbers, not merged, not deployed, and that 2D may start once both 2B-5 and 2C plan 5 have merged. Fix any sentence the row now contradicts (rule 8).
  - `ams-log.md`: an entry at the top of `## <today>`.
  - `ams-open-questions.md`: the 2B-5 checks for a person from Task 18 Step 9 (one new numbered item, also added to the list in item 27) · anything Task 18 recorded as found but not caused by 2B-5.
  - Run `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` from `D:\Obsidian\Eltross`.
  - Commit only those three files with an `ingest:` message. Other sessions have uncommitted changes in the vault; never stage them.

- [ ] **Step 4: Memory.** Update `review-2026-10-priorities.md`: 2B-5 built on `feat/ui-phase2b-plan5`, not merged, not deployed; the state of 2C plan 5; next: the merge choice, then 2D (its spec) once both have merged, then the V track.

- [ ] **Step 5:** Use superpowers:finishing-a-development-branch. For a local merge while the main checkout holds this branch, fast-forward `master` first (`git fetch . feat/ui-phase2b-plan5:master`), then `git checkout master`, so no file changes under the user's dev server.

