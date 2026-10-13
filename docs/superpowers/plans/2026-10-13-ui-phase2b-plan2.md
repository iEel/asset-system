# UI Round 4 · Phase 2B List Pages and Page Frames · Plan 2B-2 (disposal, audit, maintenance, data-quality, integrations) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the disposal, audit, maintenance, data-quality and integrations list pages onto the phase 2B primitives that plan 2B-1 built, give five of their lists real pages (B4), and leave the three files that 2C plan 3 shares with this plan in the state 2C plan 3 expects. Workflows, data and validation stay the same.

**Architecture:**
- **No new primitive.** Plan 2B-1 built every list primitive. This plan uses them: `PageHeader`/`PageBackLink`, `DataTable` + `TableEmptyRow`, `Pagination` with `src/lib/list-pagination.ts`, `FilterSelect`, `FilterChipList`, `RowActions`, `TabNav`, `StatStrip`, `KeyValueList`, `ContentPanel`. Two small client wrappers let a server page open a 2C dialog from ⋯ through the dialog's handle (R-m).
- **One file = one commit.** Tasks 1–2 and 6–7 change only the list part of the 2C files (checkbox, toolbar buttons, `busy`, row triggers); their dialogs stay with 2C. Tasks 3–5 and 8–17 move one page each. Every commit lowers its own rows in `tests/list-frame-guards.test.ts` (LFG) and VFG R7, so old patterns cannot come back.
- **Real pages (B4)** for findings, a round's pending items, disposal batches and PM plans, and an in-memory page slice for audit rounds. The queries are read-only (`findMany`, `count`, `groupBy`); `returnTo` carries the page and page size.
- **Controller tasks:** Task 0 (base check, before screenshots, load times), Task 18 (verify, production build, dev-app check) and Task 20 (verify numbers, wiki, memory). Task 19 writes the repo docs.
- **After merge, 2C plan 3 may start** (spec B7, §8.1).

**Tech Stack:** Next.js 16.4 App Router · React 19 · Tailwind CSS 4.2.4 · class-variance-authority 0.7.1 · tailwind-merge 3.5 (through `cn()`) · radix-ui · next-intl 4 · Prisma 7 (read-only queries) · `node --test` with Node 24 type stripping.

**Spec:** `docs/superpowers/specs/2026-10-12-ui-phase2b-design.md`, with section files in `docs/superpowers/specs/2026-10-12-ui-phase2b/` (`00-decisions.md`, `00-synthesis.md`, `03-primitives.md` … `09-guards-tests.md`).
- **Spec §10 (rulings I1–I34) overrides the section files wherever they conflict.** This plan already applies them; when a task and a section file disagree, the task wins.
- The plan's files are those of spec §8.6, plus Task 14 (see Rulings).

## Global Constraints

- **Git:**
  - Work on branch `feat/ui-phase2b-plan2` (from `master` `e3f20ce`, which holds plan 2B-1).
  - Never run `git checkout`, `git switch`, `git reset`, `git stash`, `git rebase` or `git clean`, and never touch `master`.
  - Commit only the files your task names. One page or component file is one commit unless the task groups files on purpose.
  - End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Next.js 16.4** is not the Next.js in your training data. Read `node_modules/next/dist/docs/` before using an API you have not seen in this repo.
- **Line endings:**
  - `git config core.autocrlf` is `true`. Most `src/` and `tests/` files are CRLF in the working tree, including `tests/visual-foundation-guards.test.ts`, `tests/form-migration-guards.test.ts`, `tests/helpers/source-files.ts` and every file plan 2B-1 created (`tests/list-frame-guards.test.ts`, `tests/list-pages-ui.test.ts`, `tests/list-filters-ui.test.ts`, `tests/list-pagination.test.ts`, `src/lib/list-pagination.ts`, the new `src/components/ui/` primitives); several are LF (for example `src/lib/utils.ts`, `src/components/ui/field.tsx`).
  - Before you edit a file, run `git ls-files --eol <file>` and keep what it uses. Edit with exact-string replacement; never normalize a file. New files are LF.
  - Tests that read source files strip `\r` (`.replace(/\r\n/g, "\n")`) before multi-line regexes. A test that reads a CRLF file without stripping must not get a new regex with `\n` (spec §9.6).
- **Tests:**
  - `npm test` runs `node scripts/run-tests.mjs` over `tests/**/*.test.{ts,mjs,js}` with Node 24 type stripping. Run one file with `node --test tests/<file>.test.ts`.
  - Modules that tests import use relative `.ts` imports (no `@/`) and erasable TypeScript only. Tests cannot import `.tsx`; they check `.tsx` by reading the source text.
  - Use the shared helpers in `tests/helpers/source-files.ts` (`readSourceFiles`, `findMatches`, `countMatchesByFile`, the JSX reader).
- **Baseline before Task 1** (HEAD `e3f20ce`):
  - `npm test`: 1894 tests, 1893 pass, 0 fail, 1 skipped.
  - `npx tsc --noEmit`: clean.
  - `npm run lint`: 0 errors and 146 warnings, all under `.agents/`.
  - Task 0 re-checks these numbers.
- **Every task ends with all of these green:** `npm test` (0 fail) · `npx tsc --noEmit` · `npm run lint` (0 errors, no new warnings in `src/` or `tests/`). Report any failure by name.
- **The two guard scripts** (`<temp>` is the implementer's temp folder the controller names in the dispatch; never commit these files):
  - `node <temp>/p2b1-precheck.mjs --file <path>` prints one file's live count, budget, `KEEP` and `d38a0ee` seed per guard, and the `p2b-budget.mjs` arguments `ID=<budget>:<live>`. `node <temp>/p2b1-precheck.mjs --budgets` compares every budget row with the live counts.
  - `node <temp>/p2b-budget.mjs <path> ID=from:to ... [--migrated] [--dry-run]` lowers rows of LFG `BUDGETS` and VFG `TABLE_HEADER_FILLS` by file, never raises a number, never touches `KEEP`, and with `--migrated` adds the path to `MIGRATED_LIST_FILES`. VFG R1 is an inline object; Task 9 edits it by hand.
  - Before editing a file, its `live` equals its `budget`. After editing, compare the printed `args` with the task's Expected, then run `p2b-budget.mjs`.
- **Off limits:**
  - Do not run `npm ci`, `npm install`, `npm run build`, the dev server, `npx shadcn …`, or anything against a database.
  - Do not read or print `.env` or `.env.prod-admin`.
  - Leave the untracked paths alone: `.codex/`, `.impeccable/critique/`, `.playwright-mcp/`, `.superpowers/brainstorm/`, `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`.
  - Do not run skill helper scripts (for example the impeccable launcher); they make network calls.
- **No new tokens (2A I21).** No task adds a custom property to `:root`, `@theme inline` or `@theme`, and no task edits `tests/design-tokens-contrast.test.ts`. Never write `rounded-[…]`. Every new class must compile with Tailwind 4.2.4 against `src/app/globals.css`.
- **2C fences (spec §8.6, §8.11):**
  - Never edit `tests/form-migration-guards.test.ts` (FMG), never rename, move or delete a file listed in its `BATCH_FILES`, and keep it green. 2B may lower counts in the shared files; FMG budgets are ceilings and stay as they are.
  - `c/disposal/disposal-bulk-approval.tsx`, `c/disposal/disposal-bulk-execution.tsx` and `c/audit/audit-findings-batch-actions.tsx` are 2C batch 3 files that 2C plan 3 edits after this plan. Change only their list part (row checkboxes, toolbar buttons, `busy`). Never touch their dialogs, `SharedValueFields` or the `ConfirmTextDialog` they open.
  - `c/audit/audit-finding-review-actions.tsx`: only the two row triggers; its dialogs belong to 2C (O21).
  - `D/audit/rounds/[id]/page.tsx`: never the O11 bottom padding or the `MobileActionBar` other than the back icon in its actions (B2).
  - `D/disposal/page.tsx`: keep the names `bulkApprovalCopy` and `bulkExecutionCopy` (2C plan 5 adds keys there).
  - Never touch the `labels` objects of `DataQualityRuleForm` (`D/admin/data-quality/page.tsx`, 2C plan 4 adds `severity`) and of `IntegrationClientManager` (`D/admin/integrations/page.tsx`, 2C plan 5), nor `c/admin/asset-state-review-dialog.tsx` or `c/admin/IntegrationClientManager.tsx`.
  - Never run a formatter on 2C files.
- **Look (B3):** `h1` weight 600 · table header white, 13px weight 500, faint ink, no uppercase, 12px frame · rows `p-3` (about 46px) · labelled filter panels keep their frame at `lg` 40 (I23) · `TabNav` underline at every width, 44 targets on phones · the "อนุมัติที่เลือก" button uses the primary color, not green (R-c).
- **Validation and behavior:** keep every `required`, toast, `disabled` gate, `returnTo` and confirm step. ⋯ opens a 2C dialog only through the dialog's handle (`open()`, `hideTrigger`, `returnFocusRef`, R-m); a dialog without a handle keeps its button in the cell (I21). No validation UX changes (V track).
- **Server (B4):** five lists get read-only pages in this plan: findings, a round's pending items, disposal batches, PM plans, and audit rounds (sliced in memory, clamp instead of redirect, I21). `findMany` + `count`/`groupBy` in one `Promise.all`, the old `orderBy` plus `{ id: "asc" }`, default page size 25 with 25/50/100, a page past the last one redirects to the last page. Summary boxes keep counting the full set. No schema, migration, API, dependency or index.
- **Messages:** edit `messages/th.json` and `messages/en.json` only through `node scripts/messages-edit.mjs <changes.json>`, run from the repo root, with the JSON kept in your temp folder. Thai follows `docs/19_THAI_GLOSSARY.md` and must pass `tests/thai-glossary.test.ts`; every key exists in both files. The copy of every new key is the table in spec §10.2 (approved by the user 2026-10-12): `repairRecord.activeFilters` · `repairRecord.emptyFilteredTitle` · `repairRecord.emptyFilteredHelp` · the new value of `repairRecord.emptyHelp` (Task 12) · `disposalPage.activeFilterCount` (Task 3) · `auditFinding.activeFilters` (Task 8).
- **Deploy:** no task deploys. The user decided on 2026-10-12 to deploy once after all of phase 2 (B9).

## Rulings of this plan

- **Task 14 is in scope** although spec §8.6 lists 18 files. Spec §10.1 (B4) says `returnTo` carries the page and page size, and §5.9.2 row 6 gives the design for PM. `c/maintenance/maintenance-plan-form.tsx` is a 2C batch 1a file that 2C plan 1 already migrated, and no 2C plan is open during 2B-2 (R-e), so one optional prop is allowed. Cost if wrong: one revertable commit.
- **`normalizeDisposalBatchReturnTo`** lives in `src/lib/operational-return-navigation.ts` (pure, testable through relative imports), with its cases appended to `tests/operational-return-navigation.test.ts`.
- **⋯ items that open a 2C dialog** need a small `"use client"` wrapper, because the pages are server components: `c/disposal/disposal-row-actions.tsx` (Task 3) and `c/audit/audit-pending-row-actions.tsx` (Task 11). They render the dialog button outside the menu with `hideTrigger`, a ref handle and `returnFocusRef={openerRef}`.
- **A component file is deleted only together with its last caller** (`c/disposal/disposal-pagination.tsx` in Task 3, `c/maintenance/maintenance-pagination.tsx` in Task 12).
- **Guard totals after this plan** (spec §10.4 table C, relative to the budgets at `e3f20ce`): R7 29 → 17 · R1 1 → 0 (`{}`) · LH1 34 → 25 · LH2 11 → 7 · LP1 8 → 7 · LF1 3 → 2 · LT3 8 → 3 · LT4 4 → 1 · LT5 9 → 3 · LV1 20 → 19 · LV2 113 → 98 · LV3 42 → 36 · LS1 23 → 17 · LK1 11 → 8 · LN1 12 → 6. LT1 36, LT2 2, LS2 20, LN2 7, LR1 0 and R2 10 do not move.
- **LB1 is the one guard with slack:** its budget is 14 with 12 live, because 2B-1 seeded two `0 → 1` rows for the back icons of two mobile action bars. After this plan the budget is 12 (the rows of the two batch pages go) and the live count 11 (the batch pages lose their `<ArrowLeft`, Task 10 gives `D/audit/rounds/[id]/page.tsx` its one). The remaining slack of 1 is the `D/maintenance/[id]/page.tsx` row that 2B-4 fills; `p2b1-precheck.mjs --budgets` shows it as "slack 1".

## Review Focus

1. **A user who opens ⋯ or the next-step button on a disposal request or a pending audit item** must get the same 2C dialog as before (พิจารณาคำขอ, บันทึกตัดจำหน่ายจริง, หาไม่พบ); cancelling it puts focus back on the button that opened it, and no click or key inside the dialog opens the row behind it. Pinned by the wrapper tests in `tests/list-pages-ui.test.ts` (the handle, `hideTrigger`, `returnFocusRef={openerRef}`, the `<span hidden>` that stops portal events) in Tasks 3 and 11, with `tests/dialog-trigger-handles.test.ts` and `tests/row-actions-ui.test.ts` passing unchanged; checked on the app with cancel only in Task 18.
2. **A user who ticks findings on page 1, then moves to page 2 or changes a filter, and presses "อนุมัติที่เลือก"** must never decide a finding that is not on screen. Pinned by the `key={selectionKey}` test of Task 8 (page, page size and every filter in the key; the disposal queue already resets the same way).
3. **A user who removes the last row of the last page** ("หาไม่พบ" on a round's pending list, deciding the last finding, an old link with `?page=99`) must land on the new last page, not an empty table that says "หน้า 4 จาก 3". Pinned by the redirect-past-the-last-page test of each page in Tasks 3, 4, 8, 10, 11, 12 and 13 and by the clamp test of Task 9 (rounds are cut in memory).
4. **A user who pages through the PM plans** must see every plan exactly once, in today's order (active, paused, ended, each by next due date). Pinned by the three `planStatePageSlices` tests in `tests/list-pagination.test.ts` (Task 13: a page across states, the last page and past the end, an unknown state last).
5. **A user who opens a row from page 2 of a list and comes back** (a batch from the batch list, a round from the round list, a PM plan's edit page, a finding's links) must land on the same page, page size and filters. Pinned by the `normalizeDisposalBatchReturnTo` cases (Task 5), the appended `auditRoundsReturnHref` pin (Task 9), the findings return-href pins (Task 8) and the `"maintenance-pm"` cases (Task 14) in `tests/operational-return-navigation.test.ts`; checked on the app in Task 18.

## File structure

| File | What changes | Task |
|---|---|---|
| `src/components/disposal/disposal-bulk-approval.tsx`, `disposal-bulk-execution.tsx` (2C batch 3) | list part only: row checkboxes, toolbar buttons, `busy` | 1, 2 |
| `src/app/[locale]/(dashboard)/disposal/page.tsx`, `src/components/disposal/disposal-row-actions.tsx` (new), `disposal-pagination.tsx` (deleted) | queue on the primitives, one filter form, ⋯ through the dialog handles | 3 |
| `src/app/[locale]/(dashboard)/disposal/batches/page.tsx`, `batches/[id]/page.tsx`, `src/lib/operational-return-navigation.ts` | batch list with pages (B4), batch page header and back link | 4, 5 |
| `src/components/audit/audit-findings-batch-actions.tsx` (2C batch 3), `audit-finding-review-actions.tsx` (2C 1d) | list part and row triggers | 6, 7 |
| `src/app/[locale]/(dashboard)/audit/findings/page.tsx` | findings with pages (B4), back link (I2), chips (I24) | 8 |
| `src/app/[locale]/(dashboard)/audit/rounds/page.tsx`, `rounds/[id]/page.tsx`, `rounds/[id]/pending/page.tsx`, `src/components/audit/audit-pending-row-actions.tsx` (new) | rounds (in-memory pages, R1 `{}`), round results, pending with pages (B4) | 9–11 |
| `src/app/[locale]/(dashboard)/maintenance/page.tsx`, `src/components/maintenance/maintenance-pagination.tsx` (deleted) | repair list on the primitives, empty-state fix | 12 |
| `src/app/[locale]/(dashboard)/maintenance/pm/page.tsx`, `src/lib/preventive-maintenance.ts` | PM with pages by plan state (B4), back link (I25) | 13 |
| `maintenance/pm/[id]/edit/page.tsx`, `src/components/maintenance/maintenance-plan-form.tsx` (2C 1a), `src/lib/operational-return-navigation.ts` | PM edit keeps the list page | 14 |
| `src/app/[locale]/(dashboard)/admin/data-quality/page.tsx`, `src/components/admin/asset-state-review-workspace.tsx`, `admin/integrations/page.tsx` | headers, `StatStrip`, the review workspace on the primitives | 15–17 |
| `messages/th.json`, `messages/en.json` | 5 new keys and 1 changed value (spec §10.2) | 3, 8, 12 |
| `tests/list-pages-ui.test.ts`, `list-filters-ui`, `list-pagination`, `operational-return-navigation` and the pins of spec §10.4 table A row 2B-2 · `tests/list-frame-guards.test.ts`, `tests/visual-foundation-guards.test.ts` (budgets only) | tests and guards | 1–17 |
| `DESIGN.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md`, `docs/11_FEATURE_LIST.md`, `docs/07_UAT_CHECKLIST.md`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md` | plan 2B-2 docs | 19, 20 |

---


### Task 0: Base check, guard scripts, before screenshots and load times (controller runs this task, not an implementer)

**Files:**
- Create then delete: `.claude/launch.json` (only if no dev server is running; never committed)
- Create (git-ignored): `<temp>/p2b1-precheck.mjs`, `<temp>/p2b-budget.mjs`, where `<temp>` is the `codex-temp/` folder of this plan's SDD workspace (`.superpowers/sdd/<plan workspace>/codex-temp/`)
- Evidence: `.superpowers/sdd/screenshots/ui-phase2b-plan2/before/` (git-ignored)

**Interfaces:**
- Consumes: HEAD before Task 1.
- Produces: the base check, the baseline numbers, the two guard scripts every later task runs, the ids, the before images and the before load times Task 18 compares against.

- [ ] **Step 1: Check the base.**

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2b-plan2`

Run: `git merge-base --is-ancestor e3f20ce HEAD && git diff --quiet e3f20ce HEAD -- src tests messages scripts prisma && echo BASE-OK`
Expected: `BASE-OK`

Run: `git log --oneline -1 master`
Expected: `e3f20ce docs(ui): record phase 2B plan 1 verify results` (plan 2B-1 is merged; spec §8.10 row 2).

Run: `git worktree list`
Expected: one line (the main checkout). No 2C plan is open (spec §8.10 row 7).

If any of these differ, code changed after `e3f20ce`. Run each task's precheck before dispatching it, update the task text where a count or snippet differs, and record a ruling in the ledger.

- [ ] **Step 2: Baseline.** Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: 1894 tests (1893 pass, 0 fail, 1 skipped); tsc clean; lint 0 errors and 146 warnings, all under `.agents/`. Record the numbers in the ledger.

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

- [ ] **Step 4: Recount.** Run `node <temp>/p2b1-precheck.mjs --budgets`. Expected: `budgets hold: no live count is over its row`; every guard shows `slack 0` except `LB1 … 14 in 14 rows · live 12 in 12 files · slack 2` (the two `0 → 1` rows, see Rulings). Then run `node <temp>/p2b1-precheck.mjs --file <path>` for each file of Tasks 1–17 and check that the `live` column equals the task's precheck Expected. On any difference, stop and update that task before dispatching it.

- [ ] **Step 5: Confirm the dev database.** Read the `.env` keys `DATABASE_URL` and `DB_USER` without printing secrets. The database must be `asset_management_dev` and the user `asset_dev`. If not, stop.

- [ ] **Step 6: Open the app.**
  - If the user's dev server answers on `http://localhost:3000`, use it.
  - Otherwise create `.claude/launch.json` (`runtimeExecutable: "npm"`, `runtimeArgs: ["run", "dev"]`, `port: 3000`) and run `preview_start`.
  - Log in with the seed admin from `prisma/seed.ts`; do not echo the password.

- [ ] **Step 7: Pick ids and filters.** Record in the ledger:
  - a disposal request in each step that has one (`/th/disposal?step=…`), and whether one has a batch
  - a disposal batch id, and whether the batch list has more than 25 batches
  - an audit round id with pending items (and its pending count), and a round with results on more than one page
  - a findings filter (round or type) that returns more than 25 rows if one exists
  - a PM plan id in each plan state that exists, and the PM count per state
  - an asset id with repair records (for the "เฉพาะทรัพย์สินนี้" chip on `/th/maintenance?assetId=…`)

- [ ] **Step 8: Before screenshots.** Save to `.superpowers/sdd/screenshots/ui-phase2b-plan2/before/` as `<view>-<width>.png`, full page plus the `main` scroll area scrolled to its bottom:
  - `/th/disposal` (each step tab) at 1440, 768 and 375
  - `/th/disposal/batches` and `/th/disposal/batches/<id>` at 1440 and 375
  - `/th/audit/findings` (no filter and the filter of Step 7) at 1440, 1024 and 375
  - `/th/audit/rounds`, `/th/audit/rounds/<id>` and `/th/audit/rounds/<id>/pending` at 1440, 768 and 375
  - `/th/maintenance` (no filter and `?assetId=<id>`), `/th/maintenance/pm` and `/th/maintenance/pm/<id>/edit` at 1440 and 375
  - `/th/admin/data-quality` and `/th/admin/integrations` at 1440 and 375
  - Save nothing in any form. Open no dialog past its first screen.

- [ ] **Step 9: Before load times.** For the six pages that get a count query or a page slice (`/th/audit/findings`, `/th/audit/rounds`, `/th/audit/rounds/<id>/pending`, `/th/disposal/batches`, `/th/maintenance/pm`, `/th/maintenance`), load each page five times on the dev server and record the median of `performance.getEntriesByType("navigation")[0].responseEnd` (or the `withPerformanceTiming` lines in the server log where the page has them). Task 18 repeats this (spec §8.6 dev-check row "เวลาโหลด").

- [ ] **Step 10: Clean up.** Stop any server you started and delete `.claude/launch.json`. Keep every helper script outside the repo except the two guard scripts in `<temp>`. `git status --short` must show only the untracked paths in Global Constraints. No commit in this task.

---

### Task 1: `c/disposal/disposal-bulk-approval.tsx` · the list part only (a 2C batch 3 file)

Spec §8.6 row 3, §8.11 row 3, §5.1 (rows "ปุ่มระดับหน้าเขียน class เอง" and "`Loader2` ในปุ่ม"), synthesis row 15 (K16: 44px targets for the row checkboxes), §10.4 table A row 2B-2 (`tests/disposal-bulk-approval.test.ts:92`) and controller rulings (e) and (h). One file, one commit. The file is CRLF and belongs to 2C batch 3: 2C plan 3 edits its dialog after this plan merges. Change only the list part, with exact-string replacements, and never run a formatter. Tasks 1 and 2 come before Task 3, which renders these controls.

Rulings this task applies:
- **§8.6 row 3, ruling (h):** the list part only. The two checkboxes (`:456`, `:499`) get `checkboxVariants`, the toolbar buttons (`:421-423`) become `Button`, and the review trigger's spinner (`:424`) becomes `busy`. `DisposalBulkApprovalDialog` and everything below it (`:505-593`) stays byte for byte, with its `Loader2` lines and the `Metric` helper (LFG `KEEP.LS1` 1).
- **Ruling (what "the list part" holds):** the phone selection toggle (`DisposalBulkSelectionToggle`, `:405-408`) and the retry control in the toolbar's error line (`:429`) are list controls as well (2C plan 3 owns only the dialog: 2C spec `05-dialogs.md` row 13), so they move with the toolbar. The toggle becomes `Button variant="outline"`; the retry stays a text button and takes `linkVariants({ size: "inherit" })` instead of its own underline and `disabled:opacity-50` (DESIGN.md: nothing fades through transparency). The retry shows only while `error` is set, and `preview()` clears `error` as it starts, so it is never on screen while busy.
- **FMG GB4:** the trigger gets `busy={busy}` and loses `disabled={busy}`, because `disabled` never repeats the busy condition. `Button` ignores clicks while busy, and `preview()` still returns early while busy. The other toolbar buttons keep `disabled={busy}`; they have no busy state of their own.
- **DESIGN.md checkboxes, K16:** the box draws its own focus outline, so the label's `focus-within:ring` and the input's `focus-visible:ring` classes go. The row box is `checkboxVariants({ size: variant === "mobile" ? "lg" : "md" })`: 16px in the table and 20px on a phone card, as the register will be (spec §7.8.3, §7.9). The select-page box, a bare 20px input today and one of the three small targets of synthesis row 15, gets the same 44px `<label>` as the row box.
- **Sizes (§5.1):** `min-h-11 … sm:h-10` becomes `Button` at its default size (40 from md, 44 below md): `outline` for "เลือกหน้านี้" and "ล้างรายการเลือก", primary for "ตรวจสอบและอนุมัติ".
- **FMG (never edited):** this file's FMG rows are ceilings. After this task GF7 `OLD_MARKUP` counts 1 (budget 3; dialog `:552`) and GB1 `LOADER2` counts 3 (budget 4; dialog `:546`, `:547`, `:559`), the "หลัง 2B-2" column of spec §8.6. The GF5 floors `[0, 1, 0]` hold: the dialog's `maxLength` stays.
- **LFG, ruling (e):** 2B does not touch this file again (spec §8.7–8.9), so it joins `MIGRATED_LIST_FILES`. Its one row, `LS1` 1 (the dialog's `Metric`), equals its `KEEP` row and stays.
- **Test pin (§10.4 table A):** `tests/disposal-bulk-approval.test.ts:92` `/min-h-11 min-w-11/` becomes `/min-h-11 (?:min-)?w-11/` plus `/checkboxVariants\(/`. That file is CRLF and read raw, so the edited line has no `\n`; the appended test strips `\r` itself.

What users will see on `/th/disposal?status=pending` (approvers):
- "เลือกหลายรายการ" (phones), "เลือกหน้านี้", "ล้างรายการเลือก" and "ตรวจสอบและอนุมัติ" are the standard buttons: outline, or primary for the last one; 40px on desktop and 44 on phones. While the server check runs, "ตรวจสอบและอนุมัติ" shows the shared spinner in place of its icon.
- Row boxes are the browser's checkbox in the primary color, 16px in the table and 20px on phone cards. The select-page box in the table header now has a 44px target. Focus shows the standard outline instead of a ring around the box.
- "ลองใหม่" after a failed check looks like the other text links.

Not in this task: the dialog (2C plan 3) · `D/disposal/page.tsx` (Task 3) · messages · docs (Task 19).

**Files:**
- Modify: `src/components/disposal/disposal-bulk-approval.tsx` (CRLF in the working tree, `i/lf w/crlf`; 5 exact replacements)
- Modify: `tests/disposal-bulk-approval.test.ts` (CRLF; 1 exact replacement, 1 appended block)
- Modify: `tests/list-frame-guards.test.ts` (CRLF; through `p2b-budget.mjs` only)
- Temp folder only, never committed: `p2b2-t1-precheck.mjs`, `p2b2-append.mjs`, `p2b2-tw-probe.mjs` (Tasks 2–5 reuse all three; any later task may reuse the last two), `t1-block.ts`

**Must keep passing without edits:**
- the other tests of `tests/disposal-bulk-approval.test.ts`: `:64-73` (exports, preflight, live region, link guard), `:76-87` (the dialog), `:93-94` (blocked reasons), `:97-146` (copy, select-page control with `aria-checked` and `disabled={disabled}`, aborts)
- `tests/disposal-queue-ux.test.ts`, `tests/disposal-bulk-execution-ui.test.ts`, `tests/form-migration-guards.test.ts` (whole file, never edited), `tests/dialog-trigger-handles.test.ts`, `tests/visual-foundation-guards.test.ts`

**Interfaces:**
- Consumes:
  - 2A: `Button` (`variant`, `busy`, `ref`, `onClick`, `disabled`) from `@/components/ui/button`; `linkVariants({ size?: "meta" | "inherit" })` from `@/components/ui/button-variants`; `checkboxVariants({ size?: "md" | "lg" })` from `@/components/ui/field-variants` (plain TS).
  - Task 0: `<temp>/p2b1-precheck.mjs` (`--file`, `--budgets`) and `<temp>/p2b-budget.mjs`, copied there by the controller.
- Produces:
  - Unchanged exports: `DisposalBulkApprovalProvider`, `DisposalBulkSelectionToggle`, `DisposalBulkApprovalToolbar`, `DisposalBulkApprovalSelectPageControl`, `DisposalBulkApprovalCheckbox({ requestId, variant: "desktop" | "mobile" })`, `type DisposalBulkApprovalCopy`, `MAX_DISPOSAL_BULK_APPROVAL_ITEMS`. Task 3 renders them as today.
  - The file imports `Button`, `linkVariants` and `checkboxVariants`; 2C plan 3 builds on these imports.
  - In the temp folder: `p2b2-t1-precheck.mjs <1|2|3|4|5>`, `p2b2-append.mjs <block file> <test file>` (keeps the test file's CRLF or LF), `p2b2-tw-probe.mjs <file> …`.
  - LFG: the file in `MIGRATED_LIST_FILES` (36 files); its `BUDGETS.LS1` row stays 1.

| guard | `c/disposal/disposal-bulk-approval.tsx` before → after |
|---|---|
| LFG | LS1 1 → 1 (= `KEEP`) · joins `MIGRATED_LIST_FILES` |
| FMG (not edited) | GF7 live 3 → 1 (budget 3) · GB1 live 4 → 3 (budget 4) |

- [ ] **Step 1: Check what this task builds on (and save the three helper scripts)**

Save these three scripts in your temp folder (never in the repo). Tasks 2–5 reuse them.

`p2b2-t1-precheck.mjs`:

```js
// p2b2-t1-precheck.mjs: run from the repo root before Task 1, 2, 3, 4 or 5 of plan 2B-2.
// Usage: node p2b2-t1-precheck.mjs <1|2|3|4|5>. Reads only; writes nothing. Never commit this file.
// Confirms that the 2B-1 primitives and the P0 dialog handles this group uses are there, that the earlier tasks of the
// group are in and this task's change is not, and that each file this task edits still holds the e3f20ce text the old
// snippets quote (a hash of its text with \r stripped).
import { createHash } from "node:crypto"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const task = Number(process.argv[2])
if (![1, 2, 3, 4, 5].includes(task)) {
  console.error("usage: node p2b2-t1-precheck.mjs <1|2|3|4|5>")
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
const sourceFiles = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name)
  return statSync(path).isDirectory() ? sourceFiles(path) : /\.(?:ts|tsx)$/.test(name) ? [path.replace(/\\/g, "/")] : []
})
const ui = (name) => read(`${C}ui/${name}`)
const exports = (path, names) => names.every((name) => new RegExp(`export (?:function|const|type) ${name}\\b`).test(read(path)))
const messages = (locale) => JSON.parse(read(`messages/${locale}.json`))
const lfg = read("tests/list-frame-guards.test.ts")
const migratedBlock = lfg.match(/const MIGRATED_LIST_FILES: string\[\] = \[([\s\S]*?)\n\]/)?.[1] ?? ""
const migrated = (path) => migratedBlock.includes(`\`${path.replace(D, "${D}").replace(C, "${C}")}\``)
const pagesTest = read("tests/list-pages-ui.test.ts")

// The files each task edits, with their CR-stripped text hash at e3f20ce (only files no earlier task of this group edits).
const UNCHANGED = {
  1: { [`${C}disposal/disposal-bulk-approval.tsx`]: "00647c6405496443", "tests/disposal-bulk-approval.test.ts": "0402d02ea0188254" },
  2: { [`${C}disposal/disposal-bulk-execution.tsx`]: "a854f866c9550ec6", "tests/disposal-bulk-execution-ui.test.ts": "0290fb03f14c1a53" },
  3: {
    [`${D}disposal/page.tsx`]: "be4203b105634e0b",
    [`${C}disposal/disposal-pagination.tsx`]: "5aef508ddd2e2f25",
    "tests/disposal-route-structure.test.ts": "5d4725b36602da1b",
    "tests/disposal-queue-ux.test.ts": "647041ae093c7a38",
    "tests/list-filters-ui.test.ts": "4c953931850c0026",
    "tests/list-pages-ui.test.ts": "bb035c4c8c4084b6",
  },
  4: { [`${D}disposal/batches/page.tsx`]: "51aeeadda595e3b3" },
  5: {
    [`${D}disposal/batches/[id]/page.tsx`]: "259409c0bb25ecac",
    "src/lib/operational-return-navigation.ts": "c17bd4967b2c838e",
    "tests/operational-return-navigation.test.ts": "07dd576dc205ea54",
  },
}
// What each task leaves behind, so the next task can see it is in (and a task can see it has not run yet).
const DONE = {
  1: () => /^import \{ Button \} from "@\/components\/ui\/button"$/m.test(read(`${C}disposal/disposal-bulk-approval.tsx`)) && migrated(`${C}disposal/disposal-bulk-approval.tsx`),
  2: () => /^import \{ Button \} from "@\/components\/ui\/button"$/m.test(read(`${C}disposal/disposal-bulk-execution.tsx`)) && migrated(`${C}disposal/disposal-bulk-execution.tsx`),
  3: () => read(`${D}disposal/page.tsx`).includes("<TabNav") && existsSync(`${C}disposal/disposal-row-actions.tsx`) && !existsSync(`${C}disposal/disposal-pagination.tsx`),
  4: () => read(`${D}disposal/batches/page.tsx`).includes("parseListPage(") && pagesTest.includes("`${D}disposal/batches/page.tsx`,"),
  5: () => read("src/lib/operational-return-navigation.ts").includes("export function normalizeDisposalBatchReturnTo("),
}

const checks = {
  "2B-1: PageHeader, PageBackLink": exports(`${C}ui/page-header.tsx`, ["PageHeader", "PageBackLink"]),
  "2B-1: DataTable parts, TableEmptyRow, DataTableFoot; sticky on head and cell": exports(`${C}ui/data-table.tsx`, ["DataTable", "DataTableHeader", "DataTableBody", "DataTableHead", "DataTableCell", "DataTableFoot", "TableEmptyRow"]) && /sticky\?: "left" \| "right"/.test(ui("data-table.tsx")),
  "2B-1: Pagination with pageSizes; list-pagination helpers": /pageSizes\?: readonly PaginationPageSize\[\]/.test(ui("pagination.tsx")) && exports("src/lib/list-pagination.ts", ["LIST_PAGE_SIZES", "parseListPage", "listPageWindow", "lastListPage", "appendListPage"]),
  "2B-1: FilterSelect, FilterPanel, FilterFormActions": exports(`${C}ui/filter-select.tsx`, ["FilterSelect"]) && exports(`${C}ui/filter-panel.tsx`, ["FilterPanel", "FilterFormActions"]),
  "2B-1: RowActions with openerRef, menu and an onSelect next step": exports(`${C}ui/row-actions.tsx`, ["RowActions", "RowNextAction", "RowActionItem"]) && /openerRef\?: RefObject<HTMLElement \| null>/.test(ui("row-actions.tsx")) && /\{ label: string; onSelect: \(\) => void; icon\?: ReactNode \}/.test(ui("row-actions.tsx")),
  "2B-1: TabNav, StatStrip, KeyValueList, ContentPanel divided": exports(`${C}ui/tab-nav.tsx`, ["TabNav"]) && exports(`${C}ui/stat-strip.tsx`, ["StatStrip"]) && exports(`${C}ui/key-value-list.tsx`, ["KeyValueList"]) && /\| \{ divided: true; flush\?: boolean \}/.test(ui("content-panel.tsx")),
  "2A: checkboxVariants, linkVariants, Button busy, formatCount, formatMoney, orNil": exports(`${C}ui/field-variants.ts`, ["checkboxVariants"]) && exports(`${C}ui/button-variants.ts`, ["linkVariants"]) && /busy\?: boolean/.test(ui("button.tsx")) && exports("src/lib/display-format.ts", ["formatCount", "formatMoney"]) && exports(`${C}ui/nil.tsx`, ["orNil"]),
  "P0: the decision and execution dialogs open through a handle": ["decision", "execution"].every((name) => /hideTrigger = false/.test(read(`${C}disposal/disposal-${name}-button.tsx`)) && /returnFocusRef\?: RefObject<HTMLElement \| null>/.test(read(`${C}disposal/disposal-${name}-button.tsx`))) && exports(`${C}disposal/disposal-decision-button.tsx`, ["DisposalDecisionButtonHandle"]) && exports(`${C}disposal/disposal-execution-button.tsx`, ["DisposalExecutionButtonHandle"]),
  "the common keys exist in th and en": ["th", "en"].every((locale) => ["view", "back", "actions", "pagination", "pageOf", "previous", "next", "rowsPerPage", "showingRange", "pageSizeLabel", "moreActionsFor", "tableScrollHint", "noData", "baht", "all", "status", "search", "create"].every((key) => typeof messages(locale).common?.[key] === "string")),
  ...Object.fromEntries([1, 2, 3, 4].filter((number) => number < task).map((number) => [`Task ${number} is in`, DONE[number]()])),
  [`Task ${task} has not run yet`]: !DONE[task](),
  ...Object.fromEntries(Object.entries(UNCHANGED[task]).map(([path, expected]) => [`${path} is unchanged since e3f20ce (hash ${expected})`, hash(path) === expected])),
  ...(task === 3
    ? {
        "only the disposal queue imports DisposalPagination": sourceFiles("src").filter((path) => read(path).includes('"@/components/disposal/disposal-pagination"')).join("|") === `${D}disposal/page.tsx`,
        "disposalPage.activeFilterCount is not in th or en yet": ["th", "en"].every((locale) => !("activeFilterCount" in (messages(locale).disposalPage ?? {}))),
      }
    : {}),
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

`p2b2-append.mjs`:

```js
// p2b2-append.mjs: run from the repo root. Usage: node <temp>/p2b2-append.mjs <block file> <test file>
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

`p2b2-tw-probe.mjs` (the 2B-1 probe under a 2B-2 name):

```js
// p2b2-tw-probe.mjs: run from the repo root. Usage: node <temp>/p2b2-tw-probe.mjs <file> [<file> ...]
// Compiles every class of the class strings in the given files with the repo's Tailwind (@tailwindcss/node) against
// src/app/globals.css, in memory, and lists any class that produces no CSS. Reads only; writes nothing. Never commit.
// SHOW=a,b prints the compiled rule of the named classes.
import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()
const require = createRequire(resolve(root, "package.json"))
const { compile } = require("@tailwindcss/node")
const compiler = await compile(readFileSync(resolve(root, "src/app/globals.css"), "utf8"), { base: root, onDependency() {} })

// Class strings: className="…", a …Classes constant, the first string in cn(…), and any other string with a "-" or
// ":" in it after &&, ?, :, or a comma (the other strings inside cn() and the sticky maps).
const STRING = /(className=|Classes = |cn\(|&& |\? |: |, )"([^"]*)"/g
const takes = (lead, text) => /^(?:className=|Classes = |cn\()$/.test(lead) || /[-:]/.test(text)
const MARKERS = new Set(["group", "group/row"]) // they name a group and emit no CSS of their own
const classes = new Set()
for (const file of process.argv.slice(2)) {
  for (const [, lead, text] of readFileSync(file, "utf8").matchAll(STRING)) {
    if (!takes(lead, text)) continue
    for (const token of text.split(/\s+/)) if (/^[a-z!\[-]/.test(token) && !/[(){}]/.test(token)) classes.add(token)
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
Expected: `feat/ui-phase2b-plan2`

Run: `git status --short src tests messages` then `node <temp>/p2b2-t1-precheck.mjs 1`
Expected: `git status` prints nothing. The script prints:
```
ok      2B-1: PageHeader, PageBackLink
ok      2B-1: DataTable parts, TableEmptyRow, DataTableFoot; sticky on head and cell
ok      2B-1: Pagination with pageSizes; list-pagination helpers
ok      2B-1: FilterSelect, FilterPanel, FilterFormActions
ok      2B-1: RowActions with openerRef, menu and an onSelect next step
ok      2B-1: TabNav, StatStrip, KeyValueList, ContentPanel divided
ok      2A: checkboxVariants, linkVariants, Button busy, formatCount, formatMoney, orNil
ok      P0: the decision and execution dialogs open through a handle
ok      the common keys exist in th and en
ok      Task 1 has not run yet
ok      src/components/disposal/disposal-bulk-approval.tsx is unchanged since e3f20ce (hash 00647c6405496443)
ok      tests/disposal-bulk-approval.test.ts is unchanged since e3f20ce (hash 0402d02ea0188254)
info    src/components/disposal/disposal-bulk-approval.tsx: CRLF
info    tests/disposal-bulk-approval.test.ts: CRLF
preconditions hold for Task 1
```
On any `MISSING` line, stop and report it. A `hash now` line means the file changed after `e3f20ce`, so the old snippets below may not match: report it, do not guess.

Run: `node <temp>/p2b1-precheck.mjs --file c/disposal/disposal-bulk-approval.tsx`
Expected (after the `info`/`ok` header lines; exit 0):
```
file    src/components/disposal/disposal-bulk-approval.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LS1        1       1     1     1
args    LS1=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol src/components/disposal/disposal-bulk-approval.tsx tests/disposal-bulk-approval.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf w/crlf` for all three. Keep them CRLF.

- [ ] **Step 2: Write the failing tests (`tests/disposal-bulk-approval.test.ts`, CRLF)**

(a) The pin of §10.4 table A (`:92`). Replace:

```ts
  assert.match(source, /min-h-11 min-w-11/)
  assert.match(source, /blockedCode[\s\S]*?tabIndex=\{0\}/)
```

with:

```ts
  assert.match(source, /min-h-11 (?:min-)?w-11/)
  assert.match(source, /checkboxVariants\(/)
  assert.match(source, /blockedCode[\s\S]*?tabIndex=\{0\}/)
```

(b) Save this block as `<temp>/t1-block.ts`:

```ts
// Plan 2B-2 Task 1 (spec 2B §8.6 row 3, §8.11 row 3): 2B owns only the list part of this 2C batch 3 file. The dialog
// (DisposalBulkApprovalDialog and the helpers below it) stays as it is for 2C plan 3.
test("bulk approval list controls use Button, busy and checkboxVariants, and leave the dialog to 2C (spec 2B §8.6 row 3)", () => {
  const source = readFileSync("src/components/disposal/disposal-bulk-approval.tsx", "utf8").replace(/\r\n/g, "\n")
  const list = source.slice(source.indexOf("export function DisposalBulkSelectionToggle"), source.indexOf("function DisposalBulkApprovalDialog"))
  const dialog = source.slice(source.indexOf("function DisposalBulkApprovalDialog"))

  assert.match(source, /^import \{ Button \} from "@\/components\/ui\/button"$/m)
  assert.match(source, /^import \{ checkboxVariants \} from "@\/components\/ui\/field-variants"$/m)
  assert.match(list, /<Button variant="outline" onClick=\{toggleMode\} disabled=\{busy\} className="md:hidden">/)
  assert.match(list, /<Button variant="outline" onClick=\{selectPage\} disabled=\{busy\}>\{copy\.selectPage\}<\/Button>/)
  assert.match(list, /<Button variant="outline" onClick=\{clear\} disabled=\{busy\}>\{copy\.clearSelection\}<\/Button>/)
  assert.match(list, /<Button ref=\{triggerRef\} onClick=\{\(\) => void preview\(\)\} busy=\{busy\}>/, "the shared spinner while the preview runs; busy, never disabled beside it (FMG GB4)")
  assert.match(list, /className=\{linkVariants\(\{ size: "inherit" \}\)\}>\{copy\.retry\}<\/button>/)
  assert.match(list, /<label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center">\n\s+<input\n\s+ref=\{inputRef\}/, "the select-page box gets a 44px target")
  assert.equal(list.match(/className=\{checkboxVariants\(/g)?.length, 2, "the select-page box and the row box")
  assert.doesNotMatch(list, /<Loader2\b|disabled:opacity-50|rounded border-border|focus-within:ring/)
  // The dialog keeps its buttons and status lines for 2C plan 3 (FMG GF7 and GB1 of this file drop to 1 and 3, as spec §8.6 says).
  assert.equal(dialog.match(/<Loader2\b/g)?.length, 3)
  assert.match(dialog, /<span className="mb-1\.5 block text-sm font-medium text-foreground">\{copy\.sharedRemark\}<\/span>/)
})
```

Run: `node <temp>/p2b2-append.mjs <temp>/t1-block.ts tests/disposal-bulk-approval.test.ts`
Expected: `appended <temp>/t1-block.ts to tests/disposal-bulk-approval.test.ts (CRLF)`

Run: `node --test tests/disposal-bulk-approval.test.ts`
Expected: FAIL, `tests 13 · pass 11 · fail 2`:
- `bulk approval mobile selection uses 44px targets and exposes blocked reasons`: `The input did not match the regular expression /checkboxVariants\(/`
- `bulk approval list controls use Button, busy and checkboxVariants, and leave the dialog to 2C (spec 2B §8.6 row 3)`: `The input did not match the regular expression /^import \{ Button \} from "@\/components\/ui\/button"$/m`

- [ ] **Step 3: Move the list part onto Button, busy and checkboxVariants (`src/components/disposal/disposal-bulk-approval.tsx`, CRLF)**

Five exact replacements, top to bottom. Nothing from `function DisposalBulkApprovalDialog` (`:505`) down changes.

(1) Imports (`:21-22`). `Loader2` stays in the lucide import: the dialog still uses it.

Replace:

```tsx
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
import { useConfirm } from "@/components/ui/confirm-dialog"
```

with:

```tsx
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { checkboxVariants } from "@/components/ui/field-variants"
```

(2) The phone selection toggle (`:405-408`).

Replace:

```tsx
    <button type="button" onClick={toggleMode} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 md:hidden">
      <ListChecks className="h-4 w-4" />
      {active ? copy.cancelSelectionMode : copy.selectionMode}
    </button>
```

with:

```tsx
    <Button variant="outline" onClick={toggleMode} disabled={busy} className="md:hidden">
      <ListChecks aria-hidden="true" />
      {active ? copy.cancelSelectionMode : copy.selectionMode}
    </Button>
```

(3) The toolbar buttons, the spinner and the retry control (`:420-429`).

Replace:

```tsx
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={selectPage} disabled={busy} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 sm:h-10 sm:min-h-0">{copy.selectPage}</button>
        <button type="button" onClick={clear} disabled={busy} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 sm:h-10 sm:min-h-0">{copy.clearSelection}</button>
        <button ref={triggerRef} type="button" onClick={() => void preview()} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 sm:h-10 sm:min-h-0">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4" />}
          {copy.reviewAndApprove}
        </button>
      </div>
      {limitMessage ? <p className="text-xs text-muted-foreground md:col-span-full">{limitMessage}</p> : null}
      {error ? <div className="flex items-center gap-3 text-sm text-danger" role="alert"><span>{error}</span><button type="button" onClick={() => void preview()} disabled={busy} className="font-medium text-primary underline underline-offset-2 disabled:opacity-50">{copy.retry}</button></div> : null}
```

with:

```tsx
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" onClick={selectPage} disabled={busy}>{copy.selectPage}</Button>
        <Button variant="outline" onClick={clear} disabled={busy}>{copy.clearSelection}</Button>
        <Button ref={triggerRef} onClick={() => void preview()} busy={busy}>
          <ListChecks aria-hidden="true" />
          {copy.reviewAndApprove}
        </Button>
      </div>
      {limitMessage ? <p className="text-xs text-muted-foreground md:col-span-full">{limitMessage}</p> : null}
      {error ? <div className="flex items-center gap-3 text-sm text-danger" role="alert"><span>{error}</span><button type="button" onClick={() => void preview()} disabled={busy} className={linkVariants({ size: "inherit" })}>{copy.retry}</button></div> : null}
```

(4) The select-page box (`:447-458`) gets the 44px label.

Replace:

```tsx
  return (
    <input
      ref={inputRef}
      type="checkbox"
      checked={allSelected}
      disabled={disabled}
      onChange={togglePageSelection}
      aria-label={copy.selectPage}
      aria-checked={partiallySelected ? "mixed" : allSelected}
      className="h-5 w-5 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-ring"
    />
  )
```

with:

```tsx
  // The label is the 44px target; the box draws its own focus outline (DESIGN.md, checkboxes and radios).
  return (
    <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
      <input
        ref={inputRef}
        type="checkbox"
        checked={allSelected}
        disabled={disabled}
        onChange={togglePageSelection}
        aria-label={copy.selectPage}
        aria-checked={partiallySelected ? "mixed" : allSelected}
        className={checkboxVariants()}
      />
    </label>
  )
```

(5) The row box (`:492-501`).

Replace:

```tsx
    <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md focus-within:ring-2 focus-within:ring-ring">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={() => toggle(item.requestId)}
        aria-label={label}
        className="h-5 w-5 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
```

with:

```tsx
    <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={() => toggle(item.requestId)}
        aria-label={label}
        className={checkboxVariants({ size: variant === "mobile" ? "lg" : "md" })}
      />
    </label>
```

Check: `git diff -U0 src/components/disposal/disposal-bulk-approval.tsx | grep "^@@"` prints 11 hunk headers and the last one starts at old line `-499`: nothing at or after `-505` (the dialog) changed.

- [ ] **Step 4: Put the file in `MIGRATED_LIST_FILES`**

Run: `node <temp>/p2b-budget.mjs c/disposal/disposal-bulk-approval.tsx LS1=1:1 --migrated`
Expected (exit 0):
```
LS1: 1 kept
MIGRATED_LIST_FILES: added
written: src/components/disposal/disposal-bulk-approval.tsx
```

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/disposal-bulk-approval.test.ts tests/disposal-queue-ux.test.ts tests/disposal-bulk-execution-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/dialog-trigger-handles.test.ts`
Expected: PASS, `tests 105 · pass 105 · fail 0` (disposal-bulk-approval 13, disposal-queue-ux 8, disposal-bulk-execution-ui 9, form-migration-guards 23, list-frame-guards 21, visual-foundation-guards 26, dialog-trigger-handles 5).

Run: `node <temp>/p2b1-precheck.mjs --file c/disposal/disposal-bulk-approval.tsx`
Expected: `· in MIGRATED_LIST_FILES` on the `file` line, the row `LS1        1       1     1     1` and `args    LS1=1:1`; exit 0.

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected: exit 0, `budgets hold: no live count is over its row`, totals unchanged (`R7 TABLE_HEADER_FILLS 29 in 20 rows`, `LH1 BUDGETS.LH1 34 in 34 rows`), and no `slack` line except the two LB1 `0 → 1` rows (`D/audit/rounds/[id]/page.tsx`, `D/maintenance/[id]/page.tsx`).

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b2-tw-probe.mjs src/components/disposal/disposal-bulk-approval.tsx`
Expected: `checked 79 classes, missing 0` (exit 0). No class is new to `src`: the button and checkbox classes come from `Button`, `linkVariants` and `checkboxVariants`.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `tests 1895 · pass 1894 · fail 0 · skipped 1` (one test more than the baseline).
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors and the 146 warnings under `.agents/`; `npx eslint src/components/disposal/disposal-bulk-approval.tsx tests/disposal-bulk-approval.test.ts tests/list-frame-guards.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 3 files: `src/components/disposal/disposal-bulk-approval.tsx` 27 insertions and 21 deletions, `tests/disposal-bulk-approval.test.ts` 24 insertions and 1 deletion, `tests/list-frame-guards.test.ts` 1 insertion. `node -e "const s=require('fs').readFileSync(process.argv[1],'utf8');console.log((s.match(/\r\n/g)||[]).length,(s.match(/\n/g)||[]).length)" src/components/disposal/disposal-bulk-approval.tsx` prints `599 599`, and the same for the test prints `179 179` (CRLF throughout). A file that shows every line changed was normalized: restore its line endings before you commit.

- [ ] **Step 8: Commit**

```bash
git add src/components/disposal/disposal-bulk-approval.tsx tests/disposal-bulk-approval.test.ts tests/list-frame-guards.test.ts
git commit -m "refactor(ui): disposal bulk approval list controls on Button, busy and checkboxVariants (2B-2 task 1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 18, spec §8.6 row `/th/disposal`):** as an approver on `/th/disposal?status=pending` at 1440 and 375: tick two rows, "ตรวจสอบและอนุมัติ" shows the spinner while the check runs, the dialog opens, close it with "ยกเลิก" (never confirm); focus returns to "ตรวจสอบและอนุมัติ". At 375: "เลือกหลายรายการ" turns the phone boxes on (20px, 44px target). The header box selects the page and shows the mixed state.

---

### Task 2: `c/disposal/disposal-bulk-execution.tsx` · the list part only (a 2C batch 3 file)

Spec §8.6 row 4, §8.11 row 3, §5.1, synthesis row 15, §10.4 table A row 2B-2 (`tests/disposal-bulk-execution-ui.test.ts:33`) and controller rulings (e) and (h). One file, one commit. The file is CRLF and belongs to 2C batch 3; Task 1's rules apply. This lists only what differs.

Rulings this task applies:
- **§8.6 row 4, ruling (h):** the list part only: the checkboxes (`:689`, `:738`) get `checkboxVariants`, and the toolbar trigger (`:644`) and its neighbor (`:636`) become `Button`. `BulkExecutionDialog`, `SharedValueFields` and everything below `:744` stay byte for byte (2C plan 3).
- **No busy here:** `openReview` only opens the review dialog (it is not async), so the trigger had no spinner and gets no `busy`. Both toolbar buttons keep `disabled={busy}`.
- **The toggle:** `DisposalBulkExecutionSelectionToggle` (`:597-606`) becomes `Button variant="outline"` and keeps `aria-pressed`, as Task 1 did for its toggle.
- **Checkboxes:** as Task 1: the row box `checkboxVariants({ size: variant === "mobile" ? "lg" : "md" })` in a 44px label without the focus ring; the select-page box `checkboxVariants()` in its existing 44px label.
- **FMG (never edited):** GF7 counts 3 after this task (budget 5; dialog `:872`, `:903`, `:932`), GB1 stays 2 (`:971`, `:993`), GD4 `REVERSE` stays 1, GF5 `[5, 2, 1]` holds: the "หลัง 2B-2" column of spec §8.6.
- **LFG, ruling (e):** the file has no LFG row and 2B does not touch it again, so it joins `MIGRATED_LIST_FILES` with no row to name.
- **Test pin (§10.4 table A):** `tests/disposal-bulk-execution-ui.test.ts:33` `/min-h-11 min-w-11/` becomes `/min-h-11 (?:min-)?w-11/` plus `/checkboxVariants\(/`; that file is CRLF and read raw (no `\n` in the edited line). `:31` (`<footer className="[^"]*sticky bottom-0[^"]*"`) belongs to 2C plan 3 and passes unchanged.

What users will see on `/th/disposal?status=approved` (users who may execute): "เลือกหลายรายการ", "ล้างรายการเลือก" and "ตรวจสอบการดำเนินการ" are the standard outline and primary buttons, 40px on desktop and 44 on phones; the boxes are as in Task 1.

Not in this task: the dialog and `SharedValueFields` (2C plan 3) · the page (Task 3) · messages · docs.

**Files:**
- Modify: `src/components/disposal/disposal-bulk-execution.tsx` (CRLF; 5 exact replacements)
- Modify: `tests/disposal-bulk-execution-ui.test.ts` (CRLF; 1 exact replacement, 1 appended block)
- Modify: `tests/list-frame-guards.test.ts` (CRLF; through `p2b-budget.mjs` only)
- Temp folder only: `t2-block.ts`

**Must keep passing without edits:** the other tests of `tests/disposal-bulk-execution-ui.test.ts` (`:20-32`, `:34`, `:37-178`) · `tests/disposal-bulk-execution-ui-state.test.ts` · `tests/disposal-bulk-execution.test.ts` · Task 1's list in Step 5.

**Interfaces:**
- Consumes: what Task 1 consumes, and Task 1's three temp scripts.
- Produces: unchanged exports (`DisposalBulkExecutionProvider`, `DisposalBulkExecutionSelectionToggle`, `DisposalBulkExecutionToolbar`, `DisposalBulkExecutionSelectPageControl`, `DisposalBulkExecutionCheckbox({ requestId, variant })`, `type DisposalBulkExecutionCopy`); the file imports `Button` and `checkboxVariants`; LFG `MIGRATED_LIST_FILES` 37 files.

| guard | `c/disposal/disposal-bulk-execution.tsx` before → after |
|---|---|
| LFG | no row · joins `MIGRATED_LIST_FILES` |
| FMG (not edited) | GF7 live 5 → 3 (budget 5) · GB1 2 → 2 |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b2-t1-precheck.mjs 2`
Expected: `git status` prints nothing; the nine `ok` lines for the primitives, the handles and the keys, then:
```
ok      Task 1 is in
ok      Task 2 has not run yet
ok      src/components/disposal/disposal-bulk-execution.tsx is unchanged since e3f20ce (hash a854f866c9550ec6)
ok      tests/disposal-bulk-execution-ui.test.ts is unchanged since e3f20ce (hash 0290fb03f14c1a53)
info    src/components/disposal/disposal-bulk-execution.tsx: CRLF
info    tests/disposal-bulk-execution-ui.test.ts: CRLF
preconditions hold for Task 2
```

Run: `node <temp>/p2b1-precheck.mjs --file c/disposal/disposal-bulk-execution.tsx`
Expected (exit 0): the `file` line `(CRLF) · not in MIGRATED_LIST_FILES`, no guard row, and `args    (no row holds this file)`.

Run: `git ls-files --eol src/components/disposal/disposal-bulk-execution.tsx tests/disposal-bulk-execution-ui.test.ts`
Expected: `i/lf w/crlf` for both.

- [ ] **Step 2: Write the failing tests (`tests/disposal-bulk-execution-ui.test.ts`, CRLF)**

(a) The pin of §10.4 table A (`:33`). Replace:

```ts
  assert.match(component, /min-h-11 min-w-11/)
  assert.doesNotMatch(component, /fixed\s+bottom-0/)
```

with:

```ts
  assert.match(component, /min-h-11 (?:min-)?w-11/)
  assert.match(component, /checkboxVariants\(/)
  assert.doesNotMatch(component, /fixed\s+bottom-0/)
```

(b) Save this block as `<temp>/t2-block.ts`, then run `node <temp>/p2b2-append.mjs <temp>/t2-block.ts tests/disposal-bulk-execution-ui.test.ts` (Expected: `appended … (CRLF)`):

```ts
// Plan 2B-2 Task 2 (spec 2B §8.6 row 4, §8.11 row 3): 2B owns only the list part of this 2C batch 3 file. The dialog
// (BulkExecutionDialog, SharedValueFields and the rest below it) stays as it is for 2C plan 3.
test("bulk execution list controls use Button and checkboxVariants, and leave the dialog to 2C (spec 2B §8.6 row 4)", async () => {
  const component = (await source("src/components/disposal/disposal-bulk-execution.tsx")).replace(/\r\n/g, "\n")
  const list = component.slice(component.indexOf("export function DisposalBulkExecutionSelectionToggle"), component.indexOf("function BulkExecutionDialog"))
  const dialog = component.slice(component.indexOf("function BulkExecutionDialog"))

  assert.match(component, /^import \{ Button \} from "@\/components\/ui\/button"$/m)
  assert.match(component, /^import \{ checkboxVariants \} from "@\/components\/ui\/field-variants"$/m)
  assert.match(list, /<Button\n\s+variant="outline"\n\s+onClick=\{\(\) => setSelectionMode\(!selection\.selectionMode\)\}\n\s+disabled=\{busy\}\n\s+aria-pressed=\{selection\.selectionMode\}\n\s+>/)
  assert.match(list, /<Button variant="outline" onClick=\{clear\} disabled=\{busy\}>/)
  assert.match(list, /<Button ref=\{triggerRef\} onClick=\{openReview\} disabled=\{busy\}>/, "opening the review dialog is not async, so the trigger has no busy state")
  assert.equal(list.match(/className=\{checkboxVariants\(/g)?.length, 2, "the select-page box and the row box")
  assert.doesNotMatch(list, /<button\b|disabled:opacity-50|rounded border-border|focus-within:ring/)
  // The dialog keeps its own markup for 2C plan 3 (FMG GF7 of this file drops to 3, GB1 stays 2, as spec §8.6 says).
  assert.equal(dialog.match(/<Loader2\b/g)?.length, 2)
  assert.equal(dialog.match(/\b(?:h-4 w-4|h-5 w-5|h-3\.5 w-3\.5) rounded border-border\b|\baccent-primary\b|mb-1\.5 block text-sm font-medium text-foreground|ml-1 text-danger">\*/g)?.length, 3)
})
```

Run: `node --test tests/disposal-bulk-execution-ui.test.ts`
Expected: FAIL, `tests 10 · pass 8 · fail 2`:
- `bulk execution UI has the required interaction and accessibility contracts`: `The input did not match the regular expression /checkboxVariants\(/`
- `bulk execution list controls use Button and checkboxVariants, and leave the dialog to 2C (spec 2B §8.6 row 4)`: no match for `/^import \{ Button \} from "@\/components\/ui\/button"$/m`

- [ ] **Step 3: Move the list part onto Button and checkboxVariants (`src/components/disposal/disposal-bulk-execution.tsx`, CRLF)**

Five exact replacements, top to bottom. Nothing from `function BulkExecutionDialog` (`:744`) down changes.

(1) Imports (`:40-41`). `Loader2` and `cn` stay (the dialog and the provider use them).

Replace:

```tsx
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
import { useConfirm } from "@/components/ui/confirm-dialog"
```

with:

```tsx
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { checkboxVariants } from "@/components/ui/field-variants"
```

(2) The selection toggle (`:597-606`).

Replace:

```tsx
    <button
      type="button"
      onClick={() => setSelectionMode(!selection.selectionMode)}
      disabled={busy}
      aria-pressed={selection.selectionMode}
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
    >
      <ListChecks className="h-4 w-4" aria-hidden="true" />
      {selection.selectionMode ? copy.cancelSelectionMode : copy.selectionMode}
    </button>
```

with:

```tsx
    <Button
      variant="outline"
      onClick={() => setSelectionMode(!selection.selectionMode)}
      disabled={busy}
      aria-pressed={selection.selectionMode}
    >
      <ListChecks aria-hidden="true" />
      {selection.selectionMode ? copy.cancelSelectionMode : copy.selectionMode}
    </Button>
```

(3) The toolbar buttons (`:636-653`).

Replace:

```tsx
        <button
          type="button"
          onClick={clear}
          disabled={busy}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          {copy.clearSelection}
        </button>
        <button
          ref={triggerRef}
          type="button"
          onClick={openReview}
          disabled={busy}
          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
        >
          <ListChecks className="h-4 w-4" aria-hidden="true" />
          {copy.review}
        </button>
```

with:

```tsx
        <Button variant="outline" onClick={clear} disabled={busy}>
          {copy.clearSelection}
        </Button>
        <Button ref={triggerRef} onClick={openReview} disabled={busy}>
          <ListChecks aria-hidden="true" />
          {copy.review}
        </Button>
```

(4) The select-page box (`:688-690`; the old text also stands in the dialog at `:872` and `:903`, so the replacement starts at the `aria-checked` line, which is unique).

Replace:

```tsx
        aria-checked={partiallySelected ? "mixed" : allSelected}
        className="h-5 w-5 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-ring"
      />
```

with:

```tsx
        aria-checked={partiallySelected ? "mixed" : allSelected}
        className={checkboxVariants()}
      />
```

(5) The row box (`:731-740`).

Replace:

```tsx
    <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md focus-within:ring-2 focus-within:ring-ring">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={() => toggle(item.requestId)}
        aria-label={label}
        className="h-5 w-5 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
```

with:

```tsx
    <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={() => toggle(item.requestId)}
        aria-label={label}
        className={checkboxVariants({ size: variant === "mobile" ? "lg" : "md" })}
      />
    </label>
```

Check: `git diff -U0 src/components/disposal/disposal-bulk-execution.tsx | grep "^@@"` prints 12 hunk headers and the last one starts at old line `-738`: nothing at or after `-744` (the dialog) changed.

- [ ] **Step 4: Put the file in `MIGRATED_LIST_FILES`**

Run: `node <temp>/p2b-budget.mjs c/disposal/disposal-bulk-execution.tsx --migrated`
Expected (exit 0):
```
MIGRATED_LIST_FILES: added
written: src/components/disposal/disposal-bulk-execution.tsx
```

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/disposal-bulk-execution-ui.test.ts tests/disposal-bulk-approval.test.ts tests/disposal-queue-ux.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/dialog-trigger-handles.test.ts`
Expected: PASS, `tests 106 · pass 106 · fail 0` (disposal-bulk-execution-ui 10, then Task 1's files).

Run: `node <temp>/p2b1-precheck.mjs --file c/disposal/disposal-bulk-execution.tsx` then `node <temp>/p2b1-precheck.mjs --budgets`
Expected: `· in MIGRATED_LIST_FILES` and `args    (no row holds this file)`; then exit 0 with the same totals as after Task 1.

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b2-tw-probe.mjs src/components/disposal/disposal-bulk-execution.tsx`
Expected: `checked 96 classes, missing 0`. No class is new to `src`.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` `tests 1896 · pass 1895 · fail 0 · skipped 1`; tsc no errors; lint 0 errors and no new warning (`npx eslint src/components/disposal/disposal-bulk-execution.tsx tests/disposal-bulk-execution-ui.test.ts tests/list-frame-guards.test.ts` prints nothing).

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 3 files: the component 14 insertions and 24 deletions, `tests/disposal-bulk-execution-ui.test.ts` 21 insertions and 1 deletion, `tests/list-frame-guards.test.ts` 1 insertion. The line-ending check prints `1214 1214` for the component and `198 198` for the test.

- [ ] **Step 8: Commit**

```bash
git add src/components/disposal/disposal-bulk-execution.tsx tests/disposal-bulk-execution-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "refactor(ui): disposal bulk execution list controls on Button and checkboxVariants (2B-2 task 2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 18):** as a user who may execute, on `/th/disposal?status=approved` at 1440 and 375: "เลือกหลายรายการ" is pressed while on (`aria-pressed`); tick two rows of one type, a row of another type shows the warning icon with its reason; "ตรวจสอบการดำเนินการ" opens the review dialog; close it with "ยกเลิก" (never confirm) and focus returns to the trigger.

---

### Task 3: `D/disposal/page.tsx` on the list primitives, with the 2C dialogs behind RowActions (and the last caller of `DisposalPagination`)

Spec §5.4 row "disposal", §5.1, §5.7, §5.9.1 (a page past the last one), §5.10 #5 and #11, §6.4, §6.5 row 10 and 6-ฌ, §6.13 table B items 5, 6 and 8, §4.4.3 row `D/disposal/page.tsx`, §3.11 (the R-m owner), §8.6 rows 1–2, §10.2 (`disposalPage.activeFilterCount`), §10.4 table A (`tests/disposal-route-structure.test.ts:10`, `:18`, `:22-26` and `tests/disposal-queue-ux.test.ts:43-51`), rulings I21, I23, I33, R-g, R-h, R-m, R-n, R-p and controller rulings (c), (d), (e), (f) and (h). One page, one commit, together with the new client wrapper, the deleted pager and one message key. The page is CRLF: exact-string replacements only.

Rulings this task applies:
- **R-h, §4.4.3:** `PageHeader` with `title={t("title")}` and `meta={t("subtitle")}`; actions: "ประวัติชุดคำขอ" (`ListChecks`) and "สร้างชุดคำขอตัดจำหน่าย" (`PackagePlus`) as `outline md`, then "เพิ่มใหม่" (`Plus`) primary last, all `Link`s with `buttonVariants({ … size: "md" })`. §5.4 writes `lg` for these three links; R-h, which overrides the section files, puts every header button at `md` (the same ruling as 2B-1 Task 14). The literals `` href={`/${locale}/disposal/new`} `` (`tests/disposal-route-structure.test.ts:13`) and `` `/${locale}/disposal/batches` `` (`tests/disposal-queue-ux.test.ts:13`) stay. The page root becomes `space-y-6`; the execution provider keeps its own `className="space-y-6"` (`tests/disposal-queue-ux.test.ts:52`).
- **§5.10 #5, §6.5 6-ฌ, I23:** one `DisposalFilterForm` (labelled fields at `lg` 40) renders in the phone `<details>` and in `<FilterPanel className="hidden md:block">`, which replaces the hand-written desktop form `:280-318`. The form is the §6.5 code: `role="search"`, the hidden `pageSize`, `Field` + `SearchField`, two `FilterSelect`s with `allLabel={tCommon("all")}` and the options from `disposalStatusFilters` / `disposalTypeFilters` (`src/lib/disposal-query.ts`; the same values and labels as today), two `Field` + `Input type="date"` with the old `min`/`max`, `FilterFormActions` whose "ล้างตัวกรอง" shows only while `hasActiveFilters`, and the date-range alert inside the form. The page-level `dateRangeError` goes; the form computes it. Field ids come from `useId`, so the two copies never share an id, and the hidden copy is `display: none`, so one search landmark shows.
- **§5.10 #5, §10.2, ruling (f):** the phone summary's "ล้างตัวกรอง" label, which only folded the panel, becomes `t("activeFilterCount", { count: activeFilterCount })` ("ใช้ตัวกรอง {count} รายการ" / "{count} filters on") in `text-meta num`; `activeFilterCount` counts the five visible filters. The key goes in through `scripts/messages-edit.mjs`.
- **TabNav (§5.4, R-g):** the stage links (`:332-339`) become `TabNav aria-label={t("stageFilterLabel")}` with `formatCount` counts, keys `stage.status || "all"` and `current={filters.status || "all"}`. The hrefs stay `buildDisposalQueryString(filters, { status: stage.status, page: 1 })` (`tests/disposal-route-structure.test.ts:19`); the phone scroll hint under the tabs stays (§5.4). LN1 1 → 0.
- **Panel and table (§5.1, as `supplier-list-view.tsx` did in 2B-1 Task 20):** the list section becomes `ContentPanel divided flush` (title `requestList`, the `resultRange` line as its description with `formatCount` numbers, and the selection toggle and the export link as its actions; the export is an `outline md` `<a>` because it downloads from the API). The desktop table is therefore `DataTable framed={false}` (no frame in a frame) with `className={getDesktopTableOnlyClasses()}`, a `caption` and `scrollHint` (eight columns can overflow between 768 and 1279). `Pagination` sits once in `DataTableFoot` under both the phone cards and the table (§5.1). R7 `:363` ×2 goes.
- **The checkbox column:** `DataTableHead` and `DataTableCell` with `className="w-12 py-0"`: the 44px label of Tasks 1–2 then sets the header row to 44 and lines up with the first text line of the row. `data-no-row-click` stays on the cell (`tests/disposal-queue-ux.test.ts:37`).
- **The actions column (§5.4, §3.4):** `DataTableHead align="right" sticky="right" hideLabel` and `DataTableCell align="right" sticky="right"`: the primitive draws the pinned column (inner line, row hover, focus fill) that `sticky right-0 … bg-muted/95` drew by hand. **Ruling (pin):** `tests/disposal-queue-ux.test.ts:23` reads the literal `sticky right-0` in the page, and spec §9.6 lists it as "must pass"; the class now comes from the `sticky` prop that spec §3.4 defines, so the line becomes two `sticky="right"` assertions with the same meaning (the actions stay pinned).
- **R-m, ruling (c):** `DisposalNextAction` keeps its segregation and next-step logic and gains an optional `row`. Without `row` (the phone card) it renders the 2C buttons with their own triggers as today; `effectiveEvidenceCount={request.effectiveEvidenceCount}` stays a JSX prop there (`tests/disposal-evidence-exception.test.ts:144`), and the view link becomes `buttonVariants({ variant: "outline", size: "sm" })`. With `row` (the table) it renders the new client wrapper `DisposalRowActions`: the next step is "พิจารณาคำขอ" or "บันทึกตัดจำหน่ายจริง", which open the decision or execution dialog through its handle, or "ดู" to the request; ⋯ holds "เปิดคำขอ" (only when the next step opens a dialog: a "ดู" row's next step already opens the request, and DESIGN.md never puts two commands of one name side by side) and "เปิดใบงานชุด" when the request has a batch. `menuLabel={tCommon("moreActionsFor", { code })}` (I33). The wrapper renders the dialog outside the menu with `hideTrigger`, a `ref` and `returnFocusRef={openerRef}`; `RowActions` puts the button that opened it into `openerRef`, so the dialog gives focus back there. `menu="dropdown"`, because the table shows from md only.
- **The wrapper and portal events:** React sends the clicks and keys of a dialog's portal up the component tree to the `ClickableTableRow`, whose `closest()` check reads the real DOM and would open the request on a click in the dialog's padding (today the 2C buttons sit in the cell the same way). The wrapper renders the dialogs inside an empty `<span hidden>` that stops events coming from outside it, as `RowActions` does for its own menu (`stopPortalClick`). New-file rules: `"use client"`, no `busy`, no `shadow-*`, no `flex-col-reverse`; every LFG and VFG counter of the file is 0, so it needs no row.
- **No icon on the next step:** with the Plex Sans Thai 500 metrics at 13px, "พิจารณาคำขอ" is 79px and "บันทึกตัดจำหน่ายจริง" 115px. The 120px slot leaves 98px for the words alone and 76px beside an icon, so the disposal next steps carry no icon (the ⋯ items keep theirs). "บันทึกตัดจำหน่ายจริง" still cuts to "บันทึกตัดจำหน่าย…" on screen; its accessible name stays whole.
- **Money and empty values (§5.7, R-n):** `getRequestValue(request, tCommon("baht"))` returns `formatMoney(…, { unit })` or `null`: it is a secondary line under the type, not a money column, so it keeps its unit. The table cell and `MobileDisposalField` show a blank through `orNil`; the approver's `: "-"` (LV2) goes. LV3 2 → 0.
- **Codes (R-p):** the request number is `tag font-medium` (the row's own id); asset tags, the requester code and batch numbers are `tag`, each on an inner span (inside a link the tag stays selectable as text).
- **The empty state (§5.1, §5.4):** `disposalEmptyState()` builds one `ActionEmptyState` props object for the phone list and for `TableEmptyRow emptyState`: while a filter is on, "ล้างตัวกรอง" with `actionVariant: "secondary"`; otherwise "สร้างคำขอตัดจำหน่าย" for users who may create. LT3 1 → 0.
- **I21, §5.9.1:** past the last page the page redirects to the same filters on `lastListPage(total, filters.pageSize)`, right after the first `Promise.all` and before the evidence queries; `redirect()` throws `NEXT_REDIRECT` outside any `try` (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md`). `parseDisposalListParams`, `buildDisposalWhere`, `buildDisposalQueryString` and the query do not change: `skip: (filters.page - 1) * filters.pageSize` and `take: filters.pageSize` stay (`tests/disposal-route-structure.test.ts:16-17`).
- **Ruling (d):** `c/disposal/disposal-pagination.tsx` has no other caller (the precheck checks it) and goes in this commit together with its three LFG rows (L0 requires every budget path to exist).
- **Ruling (h):** `bulkApprovalCopy` and `bulkExecutionCopy` (`:185-233`) and the two provider lines stay byte for byte (2C plan 5 adds keys there), and the providers still wrap both filter forms (`tests/disposal-queue-ux.test.ts:40-52`).
- **LFG and VFG, ruling (e):** every row of the page goes to 0 and the page joins `MIGRATED_LIST_FILES` (2B-4 edits `D/disposal/[id]/page.tsx`, not this file).
- **Tests:** §10.4 table A `tests/disposal-route-structure.test.ts:10`, `:18`, `:22-26` and `tests/disposal-queue-ux.test.ts:43-51` (both CRLF and read raw, so no new regex has `\n`); `tests/list-filters-ui.test.ts` gets the page in `MIGRATED_FILTER_FILES` and the item 8 test (§6.13 table B); `tests/list-pages-ui.test.ts` gets two "has" tests, one for the page and one for the wrapper (ruling (j)).

What users will see on `/th/disposal`:
- The title is weight 600; "ประวัติชุดคำขอ", "สร้างชุดคำขอตัดจำหน่าย" and "เพิ่มใหม่" are 36px buttons on desktop (44 on phones), primary last.
- One filter form: labelled 40px fields with the 2A look (44 on phones), the search with its icon; "ล้างตัวกรอง" shows only while a filter is on. On phones the folded panel says "ใช้ตัวกรอง 2 รายการ" instead of a "ล้างตัวกรอง" label that did nothing. Between 768 and 1023px the two dates sit side by side.
- The stage links are tabs with one underline and th-TH counts at every width (44px targets on phones).
- The table header is white, 13px, no capitals; codes are monospace; the money line under the type reads "1,500.00 บาท", and a blank shows "—".
- Each row ends with one next step ("พิจารณาคำขอ", "บันทึกตัดจำหน่ายจริง" or "ดู") and ⋯ with "เปิดคำขอ" and "เปิดใบงานชุด". The next step opens the same dialog as before; closing it puts focus back on the button. The phone cards keep their buttons.
- The footer reads "1–25 จาก N รายการ · หน้า 1 จาก M" with 25/50/100 and words-only buttons; a page number past the end opens the last page.
- A filter that finds nothing shows the empty state with an outline "ล้างตัวกรอง".

Not in this task: `src/lib/disposal-query.ts` and the query (unchanged) · the dialogs and the bulk files (Tasks 1–2, 2C plan 3) · `D/disposal/[id]/page.tsx` (2B-4) · the batch links' `returnTo` from the queue (they keep none; the batch page falls back to the queue, Task 5) · docs (Task 19). Do not run a formatter.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/disposal/page.tsx` (CRLF; 6 exact replacements)
- Create: `src/components/disposal/disposal-row-actions.tsx` (LF, 73 lines)
- Delete: `src/components/disposal/disposal-pagination.tsx` (`git rm`)
- Modify: `messages/th.json`, `messages/en.json` (CRLF; through `node scripts/messages-edit.mjs` only)
- Modify: `tests/list-pages-ui.test.ts` (CRLF; 1 appended block), `tests/list-filters-ui.test.ts` (CRLF; 1 exact replacement, 1 appended block), `tests/disposal-route-structure.test.ts` (CRLF; 3 exact replacements), `tests/disposal-queue-ux.test.ts` (CRLF; 2 exact replacements)
- Modify: `tests/list-frame-guards.test.ts` (CRLF) and `tests/visual-foundation-guards.test.ts` (CRLF), through `p2b-budget.mjs` only
- Temp folder only: `t3-messages.json`, `t3-pages-block.ts`, `t3-filters-block.ts`

**Must keep passing without edits:**
- `tests/disposal-route-structure.test.ts:11-17`, `:19-21`, `:27-38` and the rest of the file · `tests/disposal-queue-ux.test.ts:8-22`, `:24-38`, `:40-42`, `:48-52`, `:55-115`
- `tests/disposal-bulk-execution-ui.test.ts:37-46`, `:77-121`, `:160-178` (the page side of bulk execution, `className="space-y-6"` after the provider, `disposalBulkExecutionErrorCodes.map`) · `tests/disposal-evidence-exception.test.ts:135-145` · `tests/operational-return-navigation.test.ts:34-46` (`const disposalReturnHref = `, `` appendOperationalReturnTo(`/${locale}/disposal/${request.id}`, disposalReturnHref) ``)
- `tests/dialog-trigger-handles.test.ts` (the P0 handles, unchanged) · `tests/row-actions-ui.test.ts` · `tests/list-primitives-ui.test.ts` · `tests/form-migration-guards.test.ts` · `tests/thai-glossary.test.ts` · `tests/messages-parity.test.ts`

**Interfaces:**
- Consumes:
  - 2B-1: `PageHeader({ title, meta, actions })`; `ContentPanel({ divided: true, flush, title, description, actions })`; `DataTable({ framed, caption, scrollHint, className })`, `DataTableHeader`, `DataTableBody`, `DataTableHead({ align, sticky, hideLabel, className })`, `DataTableCell({ align, sticky, className, …td props })`, `DataTableFoot`, `TableEmptyRow({ colSpan, emptyState })`; `Pagination({ page, totalPages, previousHref, nextHref, pageSize, pageSizes, labels })`; `LIST_PAGE_SIZES`, `lastListPage`; `TabNav({ "aria-label", items: { key, label, href, count? }[], current, className })`; `FilterPanel({ className })`, `FilterFormActions({ submitLabel, clear?, className })`; `FilterSelect({ label, name, defaultValue, allLabel, options, className })`; `RowActions({ code, menuLabel, next, groups, openerRef, menu })` with `type RowNextAction` and `type RowActionItem` (the `onSelect` next step and `kind: "link"` items) from `@/components/ui/row-actions`.
  - 2A: `Field`, `SearchField`, `Input` (`type="date"`), `orNil`, `buttonVariants`, `formatCount`, `formatMoney(value, { unit })`.
  - P0: `DisposalDecisionButton` and `DisposalExecutionButton` with `ref?: Ref<…Handle>`, `hideTrigger`, `returnFocusRef`, and `type DisposalDecisionButtonHandle` / `DisposalExecutionButtonHandle = { open: () => void }`.
  - Tasks 1–2: the bulk controls, unchanged API. Next.js 16.4 `redirect` from `next/navigation`.
- Produces:
  - `src/components/disposal/disposal-row-actions.tsx` (`"use client"`): `export function DisposalRowActions({ code, menuLabel, detail, batch, next }: DisposalRowActionsProps)`, `export type DisposalRowActionsProps = { code: string; menuLabel: string; detail: { label: string; href: string }; batch?: { label: string; href: string }; next: DisposalRowNext }`, `export type DisposalRowNext = { kind: "review"; label: string; dialog: <DisposalDecisionButton props without ref, hideTrigger, returnFocusRef> } | { kind: "execute"; label: string; dialog: <DisposalExecutionButton props without them> } | { kind: "view"; label: string }`. The pattern for Task 11's `audit-pending-row-actions.tsx`: the owner holds `openerRef` and the handles, renders `RowActions` with `openerRef` and the dialog with `hideTrigger` and `returnFocusRef={openerRef}` in a `<span hidden>` that stops portal events.
  - Key `disposalPage.activeFilterCount` in both locales.
  - `tests/list-filters-ui.test.ts`: `MIGRATED_FILTER_FILES` ends with `"src/app/[locale]/(dashboard)/disposal/page.tsx",` (Tasks 12 and 16 insert their lines before the `]`); the item 8 test.
  - `tests/list-pages-ui.test.ts`: the two disposal tests at the end of the file (Tasks 4 and 5 append after them).
  - LFG/VFG: no row of `D/disposal/page.tsx` or `c/disposal/disposal-pagination.tsx`; the page in `MIGRATED_LIST_FILES` (38 files).

| guard | before → after |
|---|---|
| VFG R7 | `D/disposal/page.tsx` 2 → – |
| LFG `D/disposal/page.tsx` | LH1 1 · LT3 1 · LV2 1 · LV3 2 · LN1 1 → all – · joins `MIGRATED_LIST_FILES` |
| LFG `c/disposal/disposal-pagination.tsx` | LT4 1 · LT5 2 · LN1 1 → all – (file deleted) |
| totals | R7 29 → 27 · LH1 34 → 33 · LT3 8 → 7 · LT4 4 → 3 · LT5 9 → 7 · LV2 113 → 112 · LV3 42 → 40 · LN1 12 → 10 |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b2-t1-precheck.mjs 3`
Expected: `git status` prints nothing; the script prints:
```
ok      2B-1: PageHeader, PageBackLink
ok      2B-1: DataTable parts, TableEmptyRow, DataTableFoot; sticky on head and cell
ok      2B-1: Pagination with pageSizes; list-pagination helpers
ok      2B-1: FilterSelect, FilterPanel, FilterFormActions
ok      2B-1: RowActions with openerRef, menu and an onSelect next step
ok      2B-1: TabNav, StatStrip, KeyValueList, ContentPanel divided
ok      2A: checkboxVariants, linkVariants, Button busy, formatCount, formatMoney, orNil
ok      P0: the decision and execution dialogs open through a handle
ok      the common keys exist in th and en
ok      Task 1 is in
ok      Task 2 is in
ok      Task 3 has not run yet
ok      src/app/[locale]/(dashboard)/disposal/page.tsx is unchanged since e3f20ce (hash be4203b105634e0b)
ok      src/components/disposal/disposal-pagination.tsx is unchanged since e3f20ce (hash 5aef508ddd2e2f25)
ok      tests/disposal-route-structure.test.ts is unchanged since e3f20ce (hash 5d4725b36602da1b)
ok      tests/disposal-queue-ux.test.ts is unchanged since e3f20ce (hash 647041ae093c7a38)
ok      tests/list-filters-ui.test.ts is unchanged since e3f20ce (hash 4c953931850c0026)
ok      tests/list-pages-ui.test.ts is unchanged since e3f20ce (hash bb035c4c8c4084b6)
ok      only the disposal queue imports DisposalPagination
ok      disposalPage.activeFilterCount is not in th or en yet
info    src/app/[locale]/(dashboard)/disposal/page.tsx: CRLF
info    src/components/disposal/disposal-pagination.tsx: CRLF
info    tests/disposal-route-structure.test.ts: CRLF
info    tests/disposal-queue-ux.test.ts: CRLF
info    tests/list-filters-ui.test.ts: CRLF
info    tests/list-pages-ui.test.ts: CRLF
preconditions hold for Task 3
```

Run: `node <temp>/p2b1-precheck.mjs --file D/disposal/page.tsx` then `node <temp>/p2b1-precheck.mjs --file c/disposal/disposal-pagination.tsx`
Expected (exit 0 both):
```
file    src/app/[locale]/(dashboard)/disposal/page.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
R7         2       2     0     2
LH1        1       1     0     1
LT3        1       1     0     1
LV2        1       1     0     1
LV3        2       2     0     2
LN1        1       1     0     1
args    R7=2:2 LH1=1:1 LT3=1:1 LV2=1:1 LV3=2:2 LN1=1:1
```
```
file    src/components/disposal/disposal-pagination.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LT4        1       1     0     1
LT5        2       2     0     2
LN1        1       1     0     1
args    LT4=1:1 LT5=2:2 LN1=1:1
```

Run: `git ls-files --eol "src/app/[[]locale]/(dashboard)/disposal/page.tsx" src/components/disposal/disposal-pagination.tsx messages/th.json messages/en.json tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/disposal-route-structure.test.ts tests/disposal-queue-ux.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: `i/lf w/crlf` for every file. Keep them CRLF.

- [ ] **Step 2: Write the failing tests**

(a) `tests/list-pages-ui.test.ts` (CRLF; read with `\r` stripped, so its regexes may hold `\n`). Save this block as `<temp>/t3-pages-block.ts` and run `node <temp>/p2b2-append.mjs <temp>/t3-pages-block.ts tests/list-pages-ui.test.ts`:

```ts
// Plan 2B-2 Task 3 (spec 2B §5.4 row "disposal", §5.10 #5, R-m): the disposal queue on the list primitives. The page is a
// server component, so ⋯ opens the 2C decision and execution dialogs through their handles from DisposalRowActions.
test("the disposal queue builds on PageHeader, TabNav, a divided panel, DataTable, one shared Pagination and RowActions (spec 2B §5.4)", () => {
  const source = read(`${D}disposal/page.tsx`)
  for (const part of ["<PageHeader", "<TabNav", "<ContentPanel", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<TableEmptyRow", "<ClickableTableRow", "<DataTableFoot>", "<Pagination", "<DisposalRowActions"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /<div className="space-y-6">/)
  assert.match(source, /<ContentPanel\n\s+divided\n\s+flush\n/, "the table sits flush in the panel: no frame in a frame")
  assert.match(source, /<DataTable framed=\{false\} className=\{getDesktopTableOnlyClasses\(\)\} caption=\{t\("requestList"\)\} scrollHint=\{tCommon\("tableScrollHint"\)\}>/)
  assert.match(source, /aria-label=\{t\("stageFilterLabel"\)\}/)
  assert.match(source, /current=\{filters\.status \|\| "all"\}/)
  assert.match(source, /count: formatCount\(stage\.count\)/)
  assert.match(source, /<DataTableHead align="right" sticky="right" hideLabel>\{tCommon\("actions"\)\}<\/DataTableHead>/)
  assert.match(source, /<DataTableCell align="right" sticky="right">\s*<DisposalNextAction /)
  assert.match(source, /row=\{\{ menuLabel: tCommon\("moreActionsFor", \{ code: request\.disposalNo \}\), batchHref: /)
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(/)
  assert.match(source, /<TableEmptyRow colSpan=\{[^}]+\} emptyState=\{emptyState\} \/>/)
  assert.match(source, /actionVariant: hasActiveFilters \? "secondary" : "primary"/)
  assert.match(source, /formatMoney\(Number\(request\.saleValue\), \{ unit \}\)/)
  assert.match(source, /^import \{ redirect \} from "next\/navigation"$/m)
  assert.match(source, /const lastPage = lastListPage\(total, filters\.pageSize\)\n\s+if \(requests\.length === 0 && total > 0 && filters\.page > lastPage\) \{\n\s+redirect\(`\/\$\{locale\}\/disposal\?\$\{buildDisposalQueryString\(filters, \{ page: lastPage \}\)\}`\)/)
  assert.match(source, /const bulkApprovalCopy: DisposalBulkApprovalCopy = \{/, "2C plan 5 adds keys to bulkApprovalCopy and bulkExecutionCopy")
  assert.match(source, /const bulkExecutionCopy: DisposalBulkExecutionCopy = \{/)
  assert.equal(existsSync(`${C}disposal/disposal-pagination.tsx`), false, "the queue was the last caller of DisposalPagination")
})

test("DisposalRowActions opens the 2C dialogs through their handles and gives focus back to the button that opened them (spec 2B R-m, §3.11)", () => {
  const source = read(`${C}disposal/disposal-row-actions.tsx`)
  assert.match(source, /^"use client"/)
  assert.match(source, /<RowActions\n\s+code=\{code\}/)
  assert.match(source, /openerRef=\{openerRef\}\n\s+menu="dropdown"/)
  assert.match(source, /onSelect: \(\) => decisionRef\.current\?\.open\(\)/)
  assert.match(source, /onSelect: \(\) => executionRef\.current\?\.open\(\)/)
  assert.match(source, /<DisposalDecisionButton \{\.\.\.next\.dialog\} ref=\{decisionRef\} hideTrigger returnFocusRef=\{openerRef\} \/>/)
  assert.match(source, /<DisposalExecutionButton \{\.\.\.next\.dialog\} ref=\{executionRef\} hideTrigger returnFocusRef=\{openerRef\} \/>/)
  assert.match(source, /<span hidden onClick=\{stopPortalEvent\} onKeyDown=\{stopPortalEvent\}>/, "a click or Enter inside a dialog never reaches the row")
  assert.match(source, /if \(!event\.currentTarget\.contains\(event\.target as Node\)\) event\.stopPropagation\(\)/)
  assert.match(source, /\.\.\.\(next\.kind === "view" \? \[\] : \[/, "a view row's next step already opens the request, so ⋯ does not repeat it")
  assert.doesNotMatch(source, /\bbusy\b|shadow-|flex-col-reverse/)
})
```

(b) `tests/list-filters-ui.test.ts` (CRLF; `read` strips `\r`). Add the page to `MIGRATED_FILTER_FILES`. Replace:

```ts
  "src/app/[locale]/(dashboard)/master-data/suppliers/page.tsx",
]
```

with:

```ts
  "src/app/[locale]/(dashboard)/master-data/suppliers/page.tsx",
  "src/app/[locale]/(dashboard)/disposal/page.tsx",
]
```

Then save this block as `<temp>/t3-filters-block.ts` and run `node <temp>/p2b2-append.mjs <temp>/t3-filters-block.ts tests/list-filters-ui.test.ts`:

```ts
// Item 8 (spec 2B §6.13 table B, §5.10 #5): the disposal queue had two filter forms, one per screen size. One
// DisposalFilterForm now renders in both places, and the phone summary counts the filters that are on.
test("the disposal queue renders one DisposalFilterForm in two places and the page has no other form (item 8)", () => {
  const source = read("src/app/[locale]/(dashboard)/disposal/page.tsx")
  assert.equal(source.match(/<DisposalFilterForm locale=\{locale\} filters=\{filters\} hasActiveFilters=\{hasActiveFilters\} t=\{t\} tCommon=\{tCommon\} \/>/g)?.length, 2, "the phone <details> and the desktop FilterPanel")
  assert.match(source, /<FilterPanel className="hidden md:block">\n\s+<DisposalFilterForm /)
  assert.equal(source.match(/<form\b/g)?.length, 1, "one <form> in the file")
  assert.ok(source.indexOf("<form") > source.indexOf("function DisposalFilterForm("), "the one <form> is DisposalFilterForm's")
  assert.match(source, /\{hasActiveFilters \? <span className="text-meta font-normal text-muted-foreground num">\{t\("activeFilterCount", \{ count: activeFilterCount \}\)\}<\/span> : null\}/)
  assert.doesNotMatch(source, />\{t\("clearFilters"\)\}<\/span>/, "the summary label that read clear filters but only folded the panel is gone")
  for (const locale of ["th", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { disposalPage: Record<string, unknown> }
    assert.equal(typeof messages.disposalPage.activeFilterCount, "string", `${locale}: disposalPage.activeFilterCount`)
  }
})
```

(c) `tests/disposal-route-structure.test.ts` (CRLF, read raw: no `\n` in a new regex). Three replacements of §10.4 table A. Replace `:9-10`:

```ts
  const newSource = readFileSync("src/app/[locale]/(dashboard)/disposal/new/page.tsx", "utf8")
  const paginationSource = readFileSync("src/components/disposal/disposal-pagination.tsx", "utf8")
```

with:

```ts
  const newSource = readFileSync("src/app/[locale]/(dashboard)/disposal/new/page.tsx", "utf8")
```

Replace `:18`:

```ts
  assert.match(listSource, /<DisposalPagination/)
```

with:

```ts
  assert.match(listSource, /<Pagination\b/)
```

Replace `:22-26` (the pager's page sizes and step links, now on the page; the Chevron icons are gone with the pager, and `tests/list-primitives-ui.test.ts` pins that the shared `Pagination` has none):

```ts
  assert.match(paginationSource, /\[25, 50, 100\]/)
  assert.match(paginationSource, /buildDisposalQueryString\(filters, \{ pageSize, page: 1 \}\)/)
  assert.match(paginationSource, /ChevronLeft/)
  assert.match(paginationSource, /ChevronRight/)
  assert.match(paginationSource, /aria-current=/)
```

with:

```ts
  assert.match(listSource, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(pageSize\) => \(\{ value: pageSize, href: `\/\$\{locale\}\/disposal\?\$\{buildDisposalQueryString\(filters, \{ pageSize, page: 1 \}\)\}` \}\)\)\}/)
  assert.match(listSource, /buildDisposalQueryString\(filters, \{ page: filters\.page - 1 \}\)/)
  assert.match(listSource, /buildDisposalQueryString\(filters, \{ page: filters\.page \+ 1 \}\)/)
```

(d) `tests/disposal-queue-ux.test.ts` (CRLF, read raw). Replace `:23` (the pin ruling above):

```ts
  assert.match(page, /sticky right-0/)
```

with:

```ts
  assert.match(page, /<DataTableHead align="right" sticky="right" hideLabel>/, "the actions column stays pinned to the right (DataTable sticky, spec 2B §3.4)")
  assert.match(page, /<DataTableCell align="right" sticky="right">/)
```

Replace `:44-47` (§10.4 table A `:43-51`; `:43` and `:48-52` stay):

```ts
  const desktopFilter = page.indexOf('<form className="grid grid-cols-1 gap-3 lg:grid-cols-')
  const providerEnd = page.lastIndexOf("</DisposalBulkApprovalProvider>")

  assert.ok(providerStart >= 0)
```

with:

```ts
  // One DisposalFilterForm renders twice (spec 2B §5.10 #5): the phone <details> copy first, then the desktop FilterPanel copy.
  const desktopFilter = page.indexOf("<DisposalFilterForm", mobileFilter + 1)
  const providerEnd = page.lastIndexOf("</DisposalBulkApprovalProvider>")

  assert.ok(providerStart >= 0)
  assert.ok(mobileFilter >= 0 && desktopFilter > mobileFilter, "two DisposalFilterForm call sites")
```

Run: `node --test tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/disposal-route-structure.test.ts tests/disposal-queue-ux.test.ts`
Expected: FAIL, `tests 40 · pass 33 · fail 7`:
- `disposal queue communicates range, date errors, compact mobile detail, and sticky actions`: `the actions column stays pinned to the right (DataTable sticky, spec 2B §3.4)`
- `bulk approval navigation guard wraps filters as well as the queue`: `two DisposalFilterForm call sites`
- `keeps the disposal list queue-first and puts request creation on its own route`: no match for `/<Pagination\b/`
- `migrated filter forms use Field, SearchField and FilterSelect only, and every form is a search landmark (item 5)`: `src/app/[locale]/(dashboard)/disposal/page.tsx: a raw select or textarea`
- `the disposal queue renders one DisposalFilterForm in two places and the page has no other form (item 8)`: `the phone <details> and the desktop FilterPanel`
- `the disposal queue builds on PageHeader, TabNav, a divided panel, DataTable, one shared Pagination and RowActions (spec 2B §5.4)`: `no <PageHeader`
- `DisposalRowActions opens the 2C dialogs through their handles …`: `ENOENT: no such file or directory, open '…src\components\disposal\disposal-row-actions.tsx'`

- [ ] **Step 3: Add the message key**

Save this file as `<temp>/t3-messages.json` (UTF-8):

```json
{
  "set": {
    "th": { "disposalPage.activeFilterCount": "ใช้ตัวกรอง {count} รายการ" },
    "en": { "disposalPage.activeFilterCount": "{count} filters on" }
  }
}
```

Run from the repo root: `node scripts/messages-edit.mjs <temp>/t3-messages.json`
Expected: `messages updated: 1 th, 1 en, 0 deleted`. `git diff --stat messages` shows 2 insertions and 1 deletion in each file (the comma after `disposalPage.requestEvidenceDescription` and the new last key of `disposalPage`); both files stay CRLF.

- [ ] **Step 4: Lower the guard rows (the failing guards)**

Run: `node <temp>/p2b-budget.mjs D/disposal/page.tsx R7=2:0 LH1=1:0 LT3=1:0 LV2=1:0 LV3=2:0 LN1=1:0 --migrated`
Expected (exit 0):
```
R7: 2 -> 0 (row deleted)
LH1: 1 -> 0 (row deleted)
LT3: 1 -> 0 (row deleted)
LV2: 1 -> 0 (row deleted)
LV3: 2 -> 0 (row deleted)
LN1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/disposal/page.tsx
```

Run: `node <temp>/p2b-budget.mjs c/disposal/disposal-pagination.tsx LT4=1:0 LT5=2:0 LN1=1:0`
Expected (exit 0): `LT4: 1 -> 0 (row deleted)`, `LT5: 2 -> 0 (row deleted)`, `LN1: 1 -> 0 (row deleted)`, `written: src/components/disposal/disposal-pagination.tsx` (no `--migrated`: the file goes in Step 7).

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 38 · fail 9`: LH1 (`LH1: 34 in 34 files`), LT3 (`8 in 7`), LT4 (`4 in 4`), LT5 (`9 in 5`), LV2 (`113 in 35`), LV3 (`42 in 13`) and LN1 (`12 in 10`), each listing only `src/app/[locale]/(dashboard)/disposal/page.tsx` or `src/components/disposal/disposal-pagination.tsx` with `N > 0`; `L0` with the five lines `LH1 …/disposal/page.tsx: 1 > 0` … `LN1 …/disposal/page.tsx: 1 > 0`; VFG `R7 interim: …` with `29 matches in 20 files; over budget:` and `src/app/[locale]/(dashboard)/disposal/page.tsx: 2 > 0`.

- [ ] **Step 5: Move the page onto the primitives (`src/app/[locale]/(dashboard)/disposal/page.tsx`, CRLF)**

Six exact replacements, top to bottom. Make all six before you compile: (1)–(2) import what (3)–(6) use, and (6) rewrites the helpers that (5) calls.

(1) Imports `:1-13`. `formatCurrency`, `ColumnHeader` and `DisposalPagination` go; `redirect`, the display helpers, `LIST_PAGE_SIZES`/`lastListPage` and the wrapper come in. The bulk imports below it (`:14-29`) do not change.

Replace:

```tsx
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { ChevronRight, Download, ListChecks, PackagePlus, Plus, SlidersHorizontal, Trash2 } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { buildDisposalQueryString, buildDisposalWhere, getDisposalDateRangeError, parseDisposalListParams, type DisposalListParams } from "@/lib/disposal-query"
import { paginationRange } from "@/lib/master-data-query"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { ColumnHeader } from "@/components/master-data/master-data-layout"
import { DisposalDecisionButton } from "@/components/disposal/disposal-decision-button"
import { DisposalExecutionButton } from "@/components/disposal/disposal-execution-button"
import { DisposalPagination } from "@/components/disposal/disposal-pagination"
```

with:

```tsx
import type { ComponentProps, ReactNode } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { ChevronRight, Download, ListChecks, PackagePlus, Plus, SlidersHorizontal, Trash2 } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { buildDisposalQueryString, buildDisposalWhere, disposalStatusFilters, disposalTypeFilters, getDisposalDateRangeError, parseDisposalListParams, type DisposalListParams } from "@/lib/disposal-query"
import { formatCount, formatMoney } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { formatDateTime } from "@/lib/utils"
import { DisposalDecisionButton } from "@/components/disposal/disposal-decision-button"
import { DisposalExecutionButton } from "@/components/disposal/disposal-execution-button"
import { DisposalRowActions, type DisposalRowNext } from "@/components/disposal/disposal-row-actions"
```

(2) Imports `:30-33`: the primitives. `appendOperationalReturnTo` and the lib imports below stay.

Replace:

```tsx
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import { getDesktopTableOnlyClasses, getMobileCardListClasses } from "@/lib/design-system"
```

with:

```tsx
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
import { FilterSelect } from "@/components/ui/filter-select"
import { Input } from "@/components/ui/input"
import { orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { SearchField } from "@/components/ui/search-field"
import { StatusBadge } from "@/components/ui/status-badge"
import { TabNav } from "@/components/ui/tab-nav"
import { getDesktopTableOnlyClasses, getMobileCardListClasses } from "@/lib/design-system"
```

(3) The past-the-end redirect, right after the first `Promise.all` (`:106-108`).

Replace:

```tsx
      : Promise.resolve([]),
  ])
  const requestIds = requests.map((request) => request.id)
```

with:

```tsx
      : Promise.resolve([]),
  ])
  // A page past the last one (an old link, or the last request of the last page decided elsewhere) shows the last
  // page, not an empty table that says "หน้า 4 จาก 3" (spec 2B I21, §5.9.1).
  const lastPage = lastListPage(total, filters.pageSize)
  if (requests.length === 0 && total > 0 && filters.page > lastPage) {
    redirect(`/${locale}/disposal?${buildDisposalQueryString(filters, { page: lastPage })}`)
  }
  const requestIds = requests.map((request) => request.id)
```

(4) The values the JSX needs (`:242-244`). `resultRange` and `hasActiveFilters` keep their names (`tests/disposal-queue-ux.test.ts:21`, `:24`).

Replace:

```tsx
  const dateRangeError = getDisposalDateRangeError(filters)
  const resultRange = paginationRange(filters.page, filters.pageSize, total)
  const hasActiveFilters = Boolean(filters.search || filters.status || filters.disposalType || filters.dateFrom || filters.dateTo)
```

with:

```tsx
  const resultRange = paginationRange(filters.page, filters.pageSize, total)
  const hasActiveFilters = Boolean(filters.search || filters.status || filters.disposalType || filters.dateFrom || filters.dateTo)
  // The phone filter summary says how many filters are on (spec 2B §5.10 #5). It used to read "ล้างตัวกรอง" but only folded the panel.
  const activeFilterCount = [filters.search, filters.status, filters.disposalType, filters.dateFrom, filters.dateTo].filter(Boolean).length
  const emptyState = disposalEmptyState({ locale, t, hasActiveFilters, canCreate })
  const nextActionLabels: DisposalNextActionLabels = {
    view: tCommon("view"),
    review: t("reviewRequest"),
    execute: t("executeDisposal"),
    openRequest: t("openRequest"),
    openBatch: t("openBatch"),
  }
```

(5) The page JSX (`:246-386`): header, the two filter places, the panel with the toolbar, the tabs, the phone cards, the table and the pager. The two provider lines are copied as they are.

Replace:

```tsx
  return (
    <div>
      <DisposalBulkApprovalProvider items={bulkItems} selectionKey={`${filters.page}:${filters.pageSize}:${query}`} copy={bulkApprovalCopy}>
      <DisposalBulkExecutionProvider items={bulkExecutionItems} selectionKey={`${filters.page}:${filters.pageSize}:${query}`} copy={bulkExecutionCopy} executionStatuses={executionStatuses} employees={employeeOptions} canUseHistoricalEvidenceException={user.roles.includes("system_admin")} className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Link href={`/${locale}/disposal/batches`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent sm:h-10 sm:min-h-0">
            <ListChecks className="h-4 w-4" />{t("batchHistory")}
          </Link>
          {canCreate ? <>
            <Link href={`/${locale}/disposal/batch/new`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent sm:h-10 sm:min-h-0">
              <PackagePlus className="h-4 w-4" />{t("batchCreateTitle")}
            </Link>
            <Link href={`/${locale}/disposal/new`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover sm:h-10 sm:min-h-0">
              <Plus className="h-4 w-4" />{tCommon("create")}
            </Link>
          </> : null}
        </div>
      </div>

      <details className="group rounded-lg border border-border bg-surface md:hidden" open={hasActiveFilters}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground">
          <span className="inline-flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-primary" />{t("filter")}</span>
          {hasActiveFilters ? <span className="rounded-md bg-primary-soft px-2 py-1 text-xs text-primary">{t("clearFilters")}</span> : null}
        </summary>
        <div className="border-t border-border p-4">
          <DisposalFilterForm locale={locale} filters={filters} t={t} tCommon={tCommon} />
        </div>
      </details>

      <section className="hidden rounded-lg border border-border bg-surface p-4 md:block">
        <form className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,1fr)_160px_160px_160px_160px_auto]" action={`/${locale}/disposal`}>
          <input type="hidden" name="pageSize" value={filters.pageSize} />
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{tCommon("search")}</span>
            <input type="search" name="search" defaultValue={filters.search} placeholder={t("searchPlaceholder")} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{tCommon("status")}</span>
            <select name="status" defaultValue={filters.status} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring">
              <option value="">{tCommon("all")}</option>
              <option value="pending">{t("statuses.pending")}</option>
              <option value="approved">{t("statuses.approved")}</option>
              <option value="disposed">{t("statuses.disposed")}</option>
              <option value="rejected">{t("statuses.rejected")}</option>
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("disposalType")}</span>
            <select name="disposalType" defaultValue={filters.disposalType} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring">
              <option value="">{tCommon("all")}</option>
              {["sell", "donate", "destroy", "lost", "dispose"].map((type) => <option key={type} value={type}>{t(`types.${type}`)}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("dateFrom")}</span>
            <input type="date" name="dateFrom" defaultValue={filters.dateFrom} max={filters.dateTo || undefined} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("dateTo")}</span>
            <input type="date" name="dateTo" defaultValue={filters.dateTo} min={filters.dateFrom || undefined} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
          </label>
          <div className="flex flex-col gap-2 self-end sm:flex-row">
            <button type="submit" className="min-h-11 w-full rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover sm:h-10 sm:min-h-0 sm:w-auto">{t("filter")}</button>
            <Link href={`/${locale}/disposal`} className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent sm:h-10 sm:min-h-0 sm:w-auto">{t("clearFilters")}</Link>
          </div>
        </form>
        {dateRangeError ? <p role="alert" className="mt-3 text-sm font-medium text-danger">{t("invalidDateRange")}</p> : null}
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("requestList")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t("resultRange", { start: resultRange.start, end: resultRange.end, total })}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {bulkApprovalEnabled ? <DisposalBulkSelectionToggle /> : bulkExecutionEnabled ? <DisposalBulkExecutionSelectionToggle /> : null}
            {canExport ? <a href={`/api/disposal-requests/export${query ? `?${query}` : ""}`} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-9 sm:min-h-0 sm:w-fit"><Download className="h-4 w-4" />{t("exportRequests")}</a> : null}
          </div>
        </div>
        {bulkApprovalEnabled ? <DisposalBulkApprovalToolbar /> : bulkExecutionEnabled ? <DisposalBulkExecutionToolbar /> : null}
        <div className="border-b border-border">
          <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-2" aria-label={t("stageFilterLabel")}>
            {stageTabs.map((stage) => (
              <Link key={stage.status || "all"} href={`/${locale}/disposal?${buildDisposalQueryString(filters, { status: stage.status, page: 1 })}`} aria-current={filters.status === stage.status ? "page" : undefined} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border px-3 text-xs font-medium transition-colors sm:h-8 sm:min-h-0 ${filters.status === stage.status ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-muted-foreground hover:bg-accent"}`}>
                <span>{stage.label}</span><span className="rounded-sm bg-muted px-1.5 py-0.5 text-foreground">{stage.count}</span>
              </Link>
            ))}
          </div>
          <div className="flex items-center justify-end gap-1 px-4 pb-2 text-xs text-muted-foreground sm:hidden">{t("stageScrollHint")}<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></div>
        </div>
        <div className={`${getMobileCardListClasses()} p-3`}>
          {requestsWithEvidence.length === 0 ? <DisposalEmptyState locale={locale} t={t} hasActiveFilters={hasActiveFilters} canCreate={canCreate} /> : requestsWithEvidence.map((request) => {
            const stage = getDisposalStage(request.requestStatus)
            const detailHref = appendOperationalReturnTo(`/${locale}/disposal/${request.id}`, disposalReturnHref)
            return (
              <article key={request.id} className="min-w-0 rounded-md border border-border bg-background p-3">
                <div className="flex min-w-0 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2"><Link href={detailHref} className="break-words text-sm font-semibold text-foreground hover:text-primary">{request.disposalNo}</Link>{request.batch ? <Link href={`/${locale}/disposal/batches/${request.batch.id}`} className="text-xs font-medium text-primary hover:underline">{request.batch.batchNo}</Link> : null}</div>
                  <div><div className="break-words text-sm font-medium text-foreground">{request.asset.assetTag}</div><div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{request.asset.name}</div></div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2"><DisposalStageBadge stage={stage} label={stageLabels[stage]} /><StatusBadge label={t(`types.${request.disposalType}`)} tone="muted" /></div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm"><MobileDisposalField label={t("requestedBy")} value={request.requestedBy.fullNameTh} /><MobileDisposalField label={t("requestDate")} value={formatDateTime(request.requestDate)} /></div>
                <details className="mt-3 rounded-md border border-border bg-surface px-3 py-2"><summary className="min-h-9 cursor-pointer text-sm font-medium text-primary">{t("moreDetails")}</summary><dl className="grid gap-3 border-t border-border pt-3 text-sm"><MobileDisposalField label={t("reason")} value={request.reason} /><MobileDisposalField label={t("approver")} value={request.approver ? `${request.approver.code} - ${request.approver.fullNameTh}` : "-"} /><MobileDisposalField label={t("value")} value={getRequestValue(request)} /></dl></details>
                {bulkApprovalEnabled ? <div className="flex min-h-11 items-center justify-end" data-no-row-click><DisposalBulkApprovalCheckbox requestId={request.id} variant="mobile" /></div> : bulkExecutionEnabled ? <div className="flex min-h-11 items-center justify-end" data-no-row-click><DisposalBulkExecutionCheckbox requestId={request.id} variant="mobile" /></div> : null}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap"><DisposalNextAction request={request} href={detailHref} canApprove={canApprove} canExecute={canEdit} canUseHistoricalEvidenceException={user.roles.includes("system_admin")} segregationRequired={workflowPolicy.segregationRequired} actorEmployeeId={user.employeeId} actorUserId={user.id} decisionStatuses={decisionStatuses} executionStatuses={executionStatuses} employees={employeeOptions} viewLabel={tCommon("view")} /></div>
              </article>
            )
          })}
        </div>
        <div className={`${getDesktopTableOnlyClasses()} overflow-x-auto`}>
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40"><tr>{bulkApprovalEnabled ? <th className="w-12 px-4 py-3"><span className="sr-only">{t("bulkSelection")}</span><DisposalBulkApprovalSelectPageControl /></th> : bulkExecutionEnabled ? <th className="w-12 px-4 py-3"><span className="sr-only">{t("bulkExecutionSelection")}</span><DisposalBulkExecutionSelectPageControl /></th> : null}<ColumnHeader>{t("disposalNo")}</ColumnHeader><ColumnHeader>{t("asset")}</ColumnHeader><ColumnHeader>{t("disposalType")}</ColumnHeader><ColumnHeader>{t("requestedBy")}</ColumnHeader><ColumnHeader>{tCommon("status")}</ColumnHeader><ColumnHeader>{t("requestDate")}</ColumnHeader>{canApprove || canEdit ? <th className="sticky right-0 z-10 whitespace-nowrap bg-muted/95 px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{tCommon("actions")}</th> : null}</tr></thead>
            <tbody className="divide-y divide-border">
              {requestsWithEvidence.length === 0 ? <tr><td colSpan={((bulkApprovalEnabled || bulkExecutionEnabled) ? 1 : 0) + (canApprove || canEdit ? 7 : 6)} className="px-4 py-6"><DisposalEmptyState locale={locale} t={t} hasActiveFilters={hasActiveFilters} canCreate={canCreate} /></td></tr> : requestsWithEvidence.map((request) => {
                const stage = getDisposalStage(request.requestStatus)
                const detailHref = appendOperationalReturnTo(`/${locale}/disposal/${request.id}`, disposalReturnHref)
                return <ClickableTableRow key={request.id} href={detailHref} label={`${tCommon("view")}: ${request.disposalNo}`}>
                  {bulkApprovalEnabled ? <td className="w-12 px-4 py-3" data-no-row-click><DisposalBulkApprovalCheckbox requestId={request.id} variant="desktop" /></td> : bulkExecutionEnabled ? <td className="w-12 px-4 py-3" data-no-row-click><DisposalBulkExecutionCheckbox requestId={request.id} variant="desktop" /></td> : null}
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground"><Link href={detailHref} className="hover:text-primary">{request.disposalNo}</Link>{request.batch ? <Link href={`/${locale}/disposal/batches/${request.batch.id}`} className="mt-1 block text-xs text-primary hover:underline">{request.batch.batchNo}</Link> : null}</td>
                  <td className="min-w-56 px-4 py-3"><div className="font-medium text-foreground">{request.asset.assetTag}</div><div className="mt-1 text-xs text-muted-foreground">{request.asset.name}</div></td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground"><div>{t(`types.${request.disposalType}`)}</div><div className="mt-1 text-xs">{getRequestValue(request)}</div></td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{request.requestedBy.code} - {request.requestedBy.fullNameTh}</td>
                  <td className="whitespace-nowrap px-4 py-3"><DisposalStageBadge stage={stage} label={stageLabels[stage]} /></td><td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(request.requestDate)}</td>
                  {canApprove || canEdit ? <td className="sticky right-0 z-10 whitespace-nowrap border-l border-border bg-surface px-4 py-3"><DisposalNextAction request={request} href={detailHref} canApprove={canApprove} canExecute={canEdit} canUseHistoricalEvidenceException={user.roles.includes("system_admin")} segregationRequired={workflowPolicy.segregationRequired} actorEmployeeId={user.employeeId} actorUserId={user.id} decisionStatuses={decisionStatuses} executionStatuses={executionStatuses} employees={employeeOptions} viewLabel={tCommon("view")} /></td> : null}
                </ClickableTableRow>
              })}
            </tbody>
          </table>
        </div>
        <DisposalPagination filters={filters} total={total} basePath={`/${locale}/disposal`} labels={{ rowsPerPage: tCommon("rowsPerPage"), page: tCommon("page"), of: tCommon("of"), previous: tCommon("previous"), next: tCommon("next") }} />
      </section>
      </DisposalBulkExecutionProvider>
      </DisposalBulkApprovalProvider>
    </div>
  )
```

with:

```tsx
  return (
    <div className="space-y-6">
      <DisposalBulkApprovalProvider items={bulkItems} selectionKey={`${filters.page}:${filters.pageSize}:${query}`} copy={bulkApprovalCopy}>
      <DisposalBulkExecutionProvider items={bulkExecutionItems} selectionKey={`${filters.page}:${filters.pageSize}:${query}`} copy={bulkExecutionCopy} executionStatuses={executionStatuses} employees={employeeOptions} canUseHistoricalEvidenceException={user.roles.includes("system_admin")} className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <>
            <Link href={`/${locale}/disposal/batches`} className={buttonVariants({ variant: "outline", size: "md" })}>
              <ListChecks aria-hidden="true" />
              {t("batchHistory")}
            </Link>
            {canCreate ? (
              <>
                <Link href={`/${locale}/disposal/batch/new`} className={buttonVariants({ variant: "outline", size: "md" })}>
                  <PackagePlus aria-hidden="true" />
                  {t("batchCreateTitle")}
                </Link>
                <Link href={`/${locale}/disposal/new`} className={buttonVariants({ size: "md" })}>
                  <Plus aria-hidden="true" />
                  {tCommon("create")}
                </Link>
              </>
            ) : null}
          </>
        }
      />

      <details className="group rounded-lg border border-border bg-surface md:hidden" open={hasActiveFilters}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground">
          <span className="inline-flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-primary" />{t("filter")}</span>
          {hasActiveFilters ? <span className="text-meta font-normal text-muted-foreground num">{t("activeFilterCount", { count: activeFilterCount })}</span> : null}
        </summary>
        <div className="border-t border-border p-4">
          <DisposalFilterForm locale={locale} filters={filters} hasActiveFilters={hasActiveFilters} t={t} tCommon={tCommon} />
        </div>
      </details>

      <FilterPanel className="hidden md:block">
        <DisposalFilterForm locale={locale} filters={filters} hasActiveFilters={hasActiveFilters} t={t} tCommon={tCommon} />
      </FilterPanel>

      <ContentPanel
        divided
        flush
        title={t("requestList")}
        description={t("resultRange", { start: formatCount(resultRange.start), end: formatCount(resultRange.end), total: formatCount(total) })}
        actions={
          bulkApprovalEnabled || bulkExecutionEnabled || canExport ? (
            <>
              {bulkApprovalEnabled ? <DisposalBulkSelectionToggle /> : bulkExecutionEnabled ? <DisposalBulkExecutionSelectionToggle /> : null}
              {canExport ? (
                <a href={`/api/disposal-requests/export${query ? `?${query}` : ""}`} className={buttonVariants({ variant: "outline", size: "md" })}>
                  <Download aria-hidden="true" />
                  {t("exportRequests")}
                </a>
              ) : null}
            </>
          ) : undefined
        }
      >
        {bulkApprovalEnabled ? <DisposalBulkApprovalToolbar /> : bulkExecutionEnabled ? <DisposalBulkExecutionToolbar /> : null}
        <TabNav
          aria-label={t("stageFilterLabel")}
          items={stageTabs.map((stage) => ({
            key: stage.status || "all",
            label: stage.label,
            count: formatCount(stage.count),
            href: `/${locale}/disposal?${buildDisposalQueryString(filters, { status: stage.status, page: 1 })}`,
          }))}
          current={filters.status || "all"}
          className="px-4 md:px-5"
        />
        <div className="flex items-center justify-end gap-1 px-4 pt-2 text-xs text-muted-foreground sm:hidden">{t("stageScrollHint")}<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></div>
        <div className={`${getMobileCardListClasses()} p-3`}>
          {requestsWithEvidence.length === 0 ? <ActionEmptyState {...emptyState} /> : requestsWithEvidence.map((request) => {
            const stage = getDisposalStage(request.requestStatus)
            const detailHref = appendOperationalReturnTo(`/${locale}/disposal/${request.id}`, disposalReturnHref)
            return (
              <article key={request.id} className="min-w-0 rounded-md border border-border bg-background p-3">
                <div className="flex min-w-0 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2"><Link href={detailHref} className="text-sm text-foreground hover:text-primary"><span className="tag font-medium">{request.disposalNo}</span></Link>{request.batch ? <Link href={`/${locale}/disposal/batches/${request.batch.id}`} className="text-xs text-primary hover:underline"><span className="tag">{request.batch.batchNo}</span></Link> : null}</div>
                  <div><div className="text-sm text-foreground"><span className="tag font-medium">{request.asset.assetTag}</span></div><div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{request.asset.name}</div></div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2"><DisposalStageBadge stage={stage} label={stageLabels[stage]} /><StatusBadge label={t(`types.${request.disposalType}`)} tone="muted" /></div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm"><MobileDisposalField label={t("requestedBy")} value={request.requestedBy.fullNameTh} /><MobileDisposalField label={t("requestDate")} value={formatDateTime(request.requestDate)} /></div>
                <details className="mt-3 rounded-md border border-border bg-surface px-3 py-2"><summary className="min-h-9 cursor-pointer text-sm font-medium text-primary">{t("moreDetails")}</summary><dl className="grid gap-3 border-t border-border pt-3 text-sm"><MobileDisposalField label={t("reason")} value={request.reason} /><MobileDisposalField label={t("approver")} value={request.approver ? `${request.approver.code} - ${request.approver.fullNameTh}` : null} /><MobileDisposalField label={t("value")} value={getRequestValue(request, tCommon("baht"))} /></dl></details>
                {bulkApprovalEnabled ? <div className="flex min-h-11 items-center justify-end" data-no-row-click><DisposalBulkApprovalCheckbox requestId={request.id} variant="mobile" /></div> : bulkExecutionEnabled ? <div className="flex min-h-11 items-center justify-end" data-no-row-click><DisposalBulkExecutionCheckbox requestId={request.id} variant="mobile" /></div> : null}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap"><DisposalNextAction request={request} href={detailHref} canApprove={canApprove} canExecute={canEdit} canUseHistoricalEvidenceException={user.roles.includes("system_admin")} segregationRequired={workflowPolicy.segregationRequired} actorEmployeeId={user.employeeId} actorUserId={user.id} decisionStatuses={decisionStatuses} executionStatuses={executionStatuses} employees={employeeOptions} labels={nextActionLabels} /></div>
              </article>
            )
          })}
        </div>
        <DataTable framed={false} className={getDesktopTableOnlyClasses()} caption={t("requestList")} scrollHint={tCommon("tableScrollHint")}>
          <DataTableHeader>
            <tr>
              {bulkApprovalEnabled ? (
                <DataTableHead className="w-12 py-0"><span className="sr-only">{t("bulkSelection")}</span><DisposalBulkApprovalSelectPageControl /></DataTableHead>
              ) : bulkExecutionEnabled ? (
                <DataTableHead className="w-12 py-0"><span className="sr-only">{t("bulkExecutionSelection")}</span><DisposalBulkExecutionSelectPageControl /></DataTableHead>
              ) : null}
              <DataTableHead>{t("disposalNo")}</DataTableHead>
              <DataTableHead>{t("asset")}</DataTableHead>
              <DataTableHead>{t("disposalType")}</DataTableHead>
              <DataTableHead>{t("requestedBy")}</DataTableHead>
              <DataTableHead>{tCommon("status")}</DataTableHead>
              <DataTableHead>{t("requestDate")}</DataTableHead>
              {canApprove || canEdit ? <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead> : null}
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {requestsWithEvidence.length === 0 ? (
              <TableEmptyRow colSpan={((bulkApprovalEnabled || bulkExecutionEnabled) ? 1 : 0) + (canApprove || canEdit ? 7 : 6)} emptyState={emptyState} />
            ) : requestsWithEvidence.map((request) => {
              const stage = getDisposalStage(request.requestStatus)
              const detailHref = appendOperationalReturnTo(`/${locale}/disposal/${request.id}`, disposalReturnHref)
              return (
                <ClickableTableRow key={request.id} href={detailHref} label={`${tCommon("view")}: ${request.disposalNo}`}>
                  {bulkApprovalEnabled ? (
                    <DataTableCell className="w-12 py-0" data-no-row-click><DisposalBulkApprovalCheckbox requestId={request.id} variant="desktop" /></DataTableCell>
                  ) : bulkExecutionEnabled ? (
                    <DataTableCell className="w-12 py-0" data-no-row-click><DisposalBulkExecutionCheckbox requestId={request.id} variant="desktop" /></DataTableCell>
                  ) : null}
                  <DataTableCell className="whitespace-nowrap">
                    <Link href={detailHref} className="text-foreground hover:text-primary"><span className="tag font-medium">{request.disposalNo}</span></Link>
                    {request.batch ? <Link href={`/${locale}/disposal/batches/${request.batch.id}`} className="mt-1 block text-xs text-primary hover:underline"><span className="tag">{request.batch.batchNo}</span></Link> : null}
                  </DataTableCell>
                  <DataTableCell className="min-w-56">
                    <div className="text-foreground"><span className="tag font-medium">{request.asset.assetTag}</span></div>
                    <div className="mt-1 text-xs text-muted-foreground">{request.asset.name}</div>
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-muted-foreground">
                    <div>{t(`types.${request.disposalType}`)}</div>
                    <div className="mt-1 text-xs num">{orNil(getRequestValue(request, tCommon("baht")))}</div>
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-muted-foreground"><span className="tag">{request.requestedBy.code}</span> - {request.requestedBy.fullNameTh}</DataTableCell>
                  <DataTableCell className="whitespace-nowrap"><DisposalStageBadge stage={stage} label={stageLabels[stage]} /></DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(request.requestDate)}</DataTableCell>
                  {canApprove || canEdit ? (
                    <DataTableCell align="right" sticky="right">
                      <DisposalNextAction request={request} href={detailHref} row={{ menuLabel: tCommon("moreActionsFor", { code: request.disposalNo }), batchHref: request.batch ? `/${locale}/disposal/batches/${request.batch.id}` : undefined }} canApprove={canApprove} canExecute={canEdit} canUseHistoricalEvidenceException={user.roles.includes("system_admin")} segregationRequired={workflowPolicy.segregationRequired} actorEmployeeId={user.employeeId} actorUserId={user.id} decisionStatuses={decisionStatuses} executionStatuses={executionStatuses} employees={employeeOptions} labels={nextActionLabels} />
                    </DataTableCell>
                  ) : null}
                </ClickableTableRow>
              )
            })}
          </DataTableBody>
        </DataTable>
        {total > 0 ? (
          <DataTableFoot>
            <Pagination
              page={filters.page}
              totalPages={resultRange.totalPages}
              previousHref={`/${locale}/disposal?${buildDisposalQueryString(filters, { page: filters.page - 1 })}`}
              nextHref={`/${locale}/disposal?${buildDisposalQueryString(filters, { page: filters.page + 1 })}`}
              pageSize={filters.pageSize}
              pageSizes={LIST_PAGE_SIZES.map((pageSize) => ({ value: pageSize, href: `/${locale}/disposal?${buildDisposalQueryString(filters, { pageSize, page: 1 })}` }))}
              labels={{
                navigation: tCommon("pagination"),
                previous: tCommon("previous"),
                next: tCommon("next"),
                pageOf: tCommon("pageOf", { page: filters.page, total: resultRange.totalPages }),
                range: tCommon("showingRange", { from: formatCount(resultRange.start), to: formatCount(resultRange.end), total: formatCount(total) }),
                pageSizeGroup: tCommon("pageSizeLabel"),
                rowsPerPage: tCommon("rowsPerPage"),
              }}
            />
          </DataTableFoot>
        ) : null}
      </ContentPanel>
      </DisposalBulkExecutionProvider>
      </DisposalBulkApprovalProvider>
    </div>
  )
```

(6) The helpers at the end of the file (`:389-439`): the one filter form, the empty state, the stage badge (unchanged), the next step for cards and rows, the money line and the phone field. The file then ends with `MobileDisposalField`'s `}` and one line break.

Replace:

```tsx
function DisposalFilterForm({ locale, filters, t, tCommon }: { locale: string; filters: ReturnType<typeof parseDisposalListParams>; t: Awaited<ReturnType<typeof getTranslations>>; tCommon: Awaited<ReturnType<typeof getTranslations>> }) {
  return <form className="grid grid-cols-1 gap-3" action={`/${locale}/disposal`}>
    <input type="hidden" name="pageSize" value={filters.pageSize} />
    <label><span className="mb-1.5 block text-xs font-medium text-muted-foreground">{tCommon("search")}</span><input type="search" name="search" defaultValue={filters.search} placeholder={t("searchPlaceholder")} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring" /></label>
    <label><span className="mb-1.5 block text-xs font-medium text-muted-foreground">{tCommon("status")}</span><select name="status" defaultValue={filters.status} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm"><option value="">{tCommon("all")}</option><option value="pending">{t("statuses.pending")}</option><option value="approved">{t("statuses.approved")}</option><option value="disposed">{t("statuses.disposed")}</option><option value="rejected">{t("statuses.rejected")}</option></select></label>
    <label><span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("disposalType")}</span><select name="disposalType" defaultValue={filters.disposalType} className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm"><option value="">{tCommon("all")}</option>{["sell", "donate", "destroy", "lost", "dispose"].map((type) => <option key={type} value={type}>{t(`types.${type}`)}</option>)}</select></label>
    <div className="grid grid-cols-2 gap-3">
      <label><span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("dateFrom")}</span><input type="date" name="dateFrom" defaultValue={filters.dateFrom} max={filters.dateTo || undefined} className="min-h-11 w-full min-w-0 rounded-md border border-border bg-background px-2 text-sm" /></label>
      <label><span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("dateTo")}</span><input type="date" name="dateTo" defaultValue={filters.dateTo} min={filters.dateFrom || undefined} className="min-h-11 w-full min-w-0 rounded-md border border-border bg-background px-2 text-sm" /></label>
    </div>
    {getDisposalDateRangeError(filters) ? <p role="alert" className="text-sm font-medium text-danger">{t("invalidDateRange")}</p> : null}
    <div className="grid grid-cols-2 gap-2"><button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-white">{t("filter")}</button><Link href={`/${locale}/disposal`} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium">{t("clearFilters")}</Link></div>
  </form>
}

function DisposalEmptyState({ locale, t, hasActiveFilters, canCreate }: { locale: string; t: Awaited<ReturnType<typeof getTranslations>>; hasActiveFilters: boolean; canCreate: boolean }) {
  const actionHref = hasActiveFilters ? `/${locale}/disposal` : canCreate ? `/${locale}/disposal/new` : undefined
  const actionLabel = hasActiveFilters ? t("clearFilters") : canCreate ? t("createTitle") : undefined
  return <ActionEmptyState icon={<Trash2 className="h-6 w-6" />} title={t(hasActiveFilters ? "emptyTitle" : "emptyUnfilteredTitle")} description={t(hasActiveFilters ? "emptyHelp" : "emptyUnfilteredHelp")} actionHref={actionHref} actionLabel={actionLabel} />
}

function DisposalStageBadge({ stage, label }: { stage: DisposalStage; label: string }) {
  const tone = stage === "complete" ? "success" : stage === "rejected" ? "danger" : stage === "awaiting_execution" ? "info" : "warning"
  return <StatusBadge label={label} tone={tone} />
}

type DisposalActionRequest = { id: string; disposalNo: string; disposalType: string; requestStatus: string; requestedById: string; approverId: string | null; batchId: string | null; createdBy: string; saleValue: { toString(): string } | number | null; salvageValue: { toString(): string } | number | null; effectiveEvidenceCount: number }
type DisposalStatusOption = { id: string; label: string; name: string }
type DisposalEmployeeOption = { id: string; label: string }

function DisposalNextAction({ request, href, canApprove, canExecute, canUseHistoricalEvidenceException, segregationRequired, actorEmployeeId, actorUserId, decisionStatuses, executionStatuses, employees, viewLabel }: { request: DisposalActionRequest; href: string; canApprove: boolean; canExecute: boolean; canUseHistoricalEvidenceException: boolean; segregationRequired: boolean; actorEmployeeId?: string | null; actorUserId: string; decisionStatuses: DisposalStatusOption[]; executionStatuses: DisposalStatusOption[]; employees: DisposalEmployeeOption[]; viewLabel: string }) {
  const canReview = canApprove && getDisposalSegregationError({ action: "approve", segregationRequired, actorEmployeeId, actorUserId, requestedById: request.requestedById, createdByUserId: request.createdBy }) === null
  const canExecuteAction = canExecute && getDisposalSegregationError({ action: "execute", segregationRequired, actorEmployeeId, actorUserId, requestedById: request.requestedById, createdByUserId: request.createdBy, approverId: request.approverId }) === null
  const nextAction = getDisposalNextAction(request.requestStatus, { canApprove: canReview, canExecute: canExecuteAction })
  const defaultSaleValue = request.saleValue != null ? String(request.saleValue) : undefined
  const defaultSalvageValue = request.salvageValue != null ? String(request.salvageValue) : undefined

  if (nextAction === "review" && decisionStatuses.length > 0) return <DisposalDecisionButton requestId={request.id} disposalNo={request.disposalNo} disposalType={request.disposalType} statuses={decisionStatuses} defaultSaleValue={defaultSaleValue} defaultSalvageValue={defaultSalvageValue} />
  if (nextAction === "execute" && executionStatuses.length > 0) return <DisposalExecutionButton requestId={request.id} disposalNo={request.disposalNo} disposalType={request.disposalType} statuses={executionStatuses} employees={filterDisposalExecutorOptions(employees, request.approverId, segregationRequired)} defaultActualSaleValue={defaultSaleValue} defaultActualSalvageValue={defaultSalvageValue} effectiveEvidenceCount={request.effectiveEvidenceCount} canUseHistoricalEvidenceException={canUseHistoricalEvidenceException} />
  return <Link href={href} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-8 sm:min-h-0">{viewLabel}</Link>
}

function getRequestValue(request: DisposalActionRequest) {
  if (request.saleValue != null) return formatCurrency(Number(request.saleValue))
  if (request.salvageValue != null) return formatCurrency(Number(request.salvageValue))
  return "-"
}

function MobileDisposalField({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-md bg-background px-3 py-2"><div className="text-xs font-medium text-muted-foreground">{label}</div><div className="mt-1 break-words text-sm text-foreground">{value}</div></div>
}
```

with:

```tsx
// One form, rendered twice: in the phone <details> and in the desktop FilterPanel (spec 2B §5.10 #5, §6.5 6-ฌ). Field
// ids come from useId, so the two copies never share an id; the hidden copy is display:none, so one search landmark shows.
function DisposalFilterForm({ locale, filters, hasActiveFilters, t, tCommon }: { locale: string; filters: ReturnType<typeof parseDisposalListParams>; hasActiveFilters: boolean; t: Awaited<ReturnType<typeof getTranslations>>; tCommon: Awaited<ReturnType<typeof getTranslations>> }) {
  const dateRangeError = getDisposalDateRangeError(filters)
  return (
    <form role="search" action={`/${locale}/disposal`} className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(220px,1fr)_160px_160px_160px_160px_auto]">
      <input type="hidden" name="pageSize" value={filters.pageSize} />
      <Field label={tCommon("search")} className="col-span-2 lg:col-span-1">
        <SearchField name="search" defaultValue={filters.search} placeholder={t("searchPlaceholder")} />
      </Field>
      <FilterSelect label={tCommon("status")} name="status" defaultValue={filters.status} allLabel={tCommon("all")} options={disposalStatusFilters.map((status) => ({ value: status, label: t(`statuses.${status}`) }))} className="col-span-2 lg:col-span-1" />
      <FilterSelect label={t("disposalType")} name="disposalType" defaultValue={filters.disposalType} allLabel={tCommon("all")} options={disposalTypeFilters.map((type) => ({ value: type, label: t(`types.${type}`) }))} className="col-span-2 lg:col-span-1" />
      <Field label={t("dateFrom")}>
        <Input type="date" name="dateFrom" defaultValue={filters.dateFrom} max={filters.dateTo || undefined} />
      </Field>
      <Field label={t("dateTo")}>
        <Input type="date" name="dateTo" defaultValue={filters.dateTo} min={filters.dateFrom || undefined} />
      </Field>
      <FilterFormActions className="col-span-2 lg:col-span-1" submitLabel={t("filter")} clear={hasActiveFilters ? { href: `/${locale}/disposal`, label: t("clearFilters") } : undefined} />
      {dateRangeError ? <p role="alert" className="col-span-2 text-meta text-danger lg:col-span-6">{t("invalidDateRange")}</p> : null}
    </form>
  )
}

// One empty state for the phone list and the table: while a filter is on, clear filters as an outline button;
// otherwise the create link for users who may create (spec 2B §5.4).
function disposalEmptyState({ locale, t, hasActiveFilters, canCreate }: { locale: string; t: Awaited<ReturnType<typeof getTranslations>>; hasActiveFilters: boolean; canCreate: boolean }): ComponentProps<typeof ActionEmptyState> {
  return {
    icon: <Trash2 />,
    title: t(hasActiveFilters ? "emptyTitle" : "emptyUnfilteredTitle"),
    description: t(hasActiveFilters ? "emptyHelp" : "emptyUnfilteredHelp"),
    actionHref: hasActiveFilters ? `/${locale}/disposal` : canCreate ? `/${locale}/disposal/new` : undefined,
    actionLabel: hasActiveFilters ? t("clearFilters") : canCreate ? t("createTitle") : undefined,
    actionVariant: hasActiveFilters ? "secondary" : "primary",
  }
}

function DisposalStageBadge({ stage, label }: { stage: DisposalStage; label: string }) {
  const tone = stage === "complete" ? "success" : stage === "rejected" ? "danger" : stage === "awaiting_execution" ? "info" : "warning"
  return <StatusBadge label={label} tone={tone} />
}

type DisposalActionRequest = { id: string; disposalNo: string; disposalType: string; requestStatus: string; requestedById: string; approverId: string | null; batchId: string | null; createdBy: string; saleValue: { toString(): string } | number | null; salvageValue: { toString(): string } | number | null; effectiveEvidenceCount: number }
type DisposalStatusOption = { id: string; label: string; name: string }
type DisposalEmployeeOption = { id: string; label: string }
type DisposalNextActionLabels = { view: string; review: string; execute: string; openRequest: string; openBatch: string }

// The request's next step for this user: review or execute when the user may (and segregation allows), otherwise view.
// A phone card shows the 2C buttons with their own triggers. A table row (row given) shows RowActions through
// DisposalRowActions, whose next step opens the same dialogs through their handles, with ⋯ for the request and its
// batch (spec 2B §5.4, R-m).
function DisposalNextAction({ request, href, row, canApprove, canExecute, canUseHistoricalEvidenceException, segregationRequired, actorEmployeeId, actorUserId, decisionStatuses, executionStatuses, employees, labels }: { request: DisposalActionRequest; href: string; row?: { menuLabel: string; batchHref?: string }; canApprove: boolean; canExecute: boolean; canUseHistoricalEvidenceException: boolean; segregationRequired: boolean; actorEmployeeId?: string | null; actorUserId: string; decisionStatuses: DisposalStatusOption[]; executionStatuses: DisposalStatusOption[]; employees: DisposalEmployeeOption[]; labels: DisposalNextActionLabels }) {
  const canReview = canApprove && getDisposalSegregationError({ action: "approve", segregationRequired, actorEmployeeId, actorUserId, requestedById: request.requestedById, createdByUserId: request.createdBy }) === null
  const canExecuteAction = canExecute && getDisposalSegregationError({ action: "execute", segregationRequired, actorEmployeeId, actorUserId, requestedById: request.requestedById, createdByUserId: request.createdBy, approverId: request.approverId }) === null
  const nextAction = getDisposalNextAction(request.requestStatus, { canApprove: canReview, canExecute: canExecuteAction })
  const defaultSaleValue = request.saleValue != null ? String(request.saleValue) : undefined
  const defaultSalvageValue = request.salvageValue != null ? String(request.salvageValue) : undefined
  const review = nextAction === "review" && decisionStatuses.length > 0
  const execute = nextAction === "execute" && executionStatuses.length > 0

  if (row) {
    const next: DisposalRowNext = review
      ? { kind: "review", label: labels.review, dialog: { requestId: request.id, disposalNo: request.disposalNo, disposalType: request.disposalType, statuses: decisionStatuses, defaultSaleValue, defaultSalvageValue } }
      : execute
        ? { kind: "execute", label: labels.execute, dialog: { requestId: request.id, disposalNo: request.disposalNo, disposalType: request.disposalType, statuses: executionStatuses, employees: filterDisposalExecutorOptions(employees, request.approverId, segregationRequired), defaultActualSaleValue: defaultSaleValue, defaultActualSalvageValue: defaultSalvageValue, effectiveEvidenceCount: request.effectiveEvidenceCount, canUseHistoricalEvidenceException } }
        : { kind: "view", label: labels.view }
    return <DisposalRowActions code={request.disposalNo} menuLabel={row.menuLabel} detail={{ label: labels.openRequest, href }} batch={row.batchHref ? { label: labels.openBatch, href: row.batchHref } : undefined} next={next} />
  }
  if (review) return <DisposalDecisionButton requestId={request.id} disposalNo={request.disposalNo} disposalType={request.disposalType} statuses={decisionStatuses} defaultSaleValue={defaultSaleValue} defaultSalvageValue={defaultSalvageValue} />
  if (execute) return <DisposalExecutionButton requestId={request.id} disposalNo={request.disposalNo} disposalType={request.disposalType} statuses={executionStatuses} employees={filterDisposalExecutorOptions(employees, request.approverId, segregationRequired)} defaultActualSaleValue={defaultSaleValue} defaultActualSalvageValue={defaultSalvageValue} effectiveEvidenceCount={request.effectiveEvidenceCount} canUseHistoricalEvidenceException={canUseHistoricalEvidenceException} />
  return <Link href={href} className={buttonVariants({ variant: "outline", size: "sm" })}>{labels.view}</Link>
}

// The money line under the type is a secondary line, not a money column, so it keeps its unit (spec 2B §5.7).
function getRequestValue(request: DisposalActionRequest, unit: string) {
  if (request.saleValue != null) return formatMoney(Number(request.saleValue), { unit })
  if (request.salvageValue != null) return formatMoney(Number(request.salvageValue), { unit })
  return null
}

function MobileDisposalField({ label, value }: { label: string; value: ReactNode }) {
  return <div className="min-w-0 rounded-md bg-background px-3 py-2"><div className="text-xs font-medium text-muted-foreground">{label}</div><div className="mt-1 break-words text-sm text-foreground">{orNil(value)}</div></div>
}
```

Check: `grep -nE '"-"|formatCurrency|ColumnHeader|DisposalPagination|bg-muted/|aria-current|<h1|<table|<thead|<th |<td |<select|type="search"' "src/app/[locale]/(dashboard)/disposal/page.tsx"` prints nothing (exit 1).

- [ ] **Step 6: Create the client wrapper (`src/components/disposal/disposal-row-actions.tsx`, LF)**

```tsx
"use client"

import { useRef, type ComponentProps, type KeyboardEvent, type MouseEvent } from "react"
import { FileText, FolderOpen } from "lucide-react"
import { DisposalDecisionButton, type DisposalDecisionButtonHandle } from "@/components/disposal/disposal-decision-button"
import { DisposalExecutionButton, type DisposalExecutionButtonHandle } from "@/components/disposal/disposal-execution-button"
import { RowActions, type RowActionItem, type RowNextAction } from "@/components/ui/row-actions"

// The props the page hands to the dialog it opens: the dialog's own props, without the three this file sets.
type DisposalDecisionDialogProps = Omit<ComponentProps<typeof DisposalDecisionButton>, "ref" | "hideTrigger" | "returnFocusRef">
type DisposalExecutionDialogProps = Omit<ComponentProps<typeof DisposalExecutionButton>, "ref" | "hideTrigger" | "returnFocusRef">

export type DisposalRowNext =
  | { kind: "review"; label: string; dialog: DisposalDecisionDialogProps }
  | { kind: "execute"; label: string; dialog: DisposalExecutionDialogProps }
  | { kind: "view"; label: string }

export type DisposalRowActionsProps = {
  // The request number: read after the next step and named in the ⋯ label.
  code: string
  menuLabel: string
  // The request page: the next step of a "view" row, else the first item in ⋯.
  detail: { label: string; href: string }
  batch?: { label: string; href: string }
  next: DisposalRowNext
}

// React sends the events of a dialog's portal up the component tree to the table row, which would open the request on a
// click or an Enter inside the dialog. The dialogs sit in this empty hidden span, which stops events that come from
// outside it, as RowActions does for its own menu.
function stopPortalEvent(event: MouseEvent<HTMLSpanElement> | KeyboardEvent<HTMLSpanElement>) {
  if (!event.currentTarget.contains(event.target as Node)) event.stopPropagation()
}

// RowActions for a row of the disposal queue (spec 2B §5.4, R-m). The page is a server component and cannot hold a
// handle, so this client file does: the next step opens the 2C decision or execution dialog through ref.current?.open(),
// the dialog renders outside the menu with hideTrigger, and returnFocusRef={openerRef} gives focus back to the button
// that opened it. The table shows from md only, so the menu is always the dropdown.
export function DisposalRowActions({ code, menuLabel, detail, batch, next }: DisposalRowActionsProps) {
  const openerRef = useRef<HTMLElement | null>(null)
  const decisionRef = useRef<DisposalDecisionButtonHandle | null>(null)
  const executionRef = useRef<DisposalExecutionButtonHandle | null>(null)
  // A "view" row's next step already opens the request, so ⋯ does not repeat it.
  const items: RowActionItem[] = [
    ...(next.kind === "view" ? [] : [{ kind: "link" as const, key: "request", label: detail.label, href: detail.href, icon: <FileText aria-hidden="true" /> }]),
    ...(batch ? [{ kind: "link" as const, key: "batch", label: batch.label, href: batch.href, icon: <FolderOpen aria-hidden="true" /> }] : []),
  ]
  // No icon on the next step: at 13px "พิจารณาคำขอ" is 79px and "บันทึกตัดจำหน่ายจริง" 115px, and the 120px slot leaves
  // 98px for words alone but 76px beside an icon.
  const rowNext: RowNextAction =
    next.kind === "review"
      ? { label: next.label, onSelect: () => decisionRef.current?.open() }
      : next.kind === "execute"
        ? { label: next.label, onSelect: () => executionRef.current?.open() }
        : { label: next.label, href: detail.href }

  return (
    <>
      <RowActions
        code={code}
        menuLabel={menuLabel}
        next={rowNext}
        groups={items.length > 0 ? [{ key: "links", items }] : []}
        openerRef={openerRef}
        menu="dropdown"
      />
      <span hidden onClick={stopPortalEvent} onKeyDown={stopPortalEvent}>
        {next.kind === "review" ? <DisposalDecisionButton {...next.dialog} ref={decisionRef} hideTrigger returnFocusRef={openerRef} /> : null}
        {next.kind === "execute" ? <DisposalExecutionButton {...next.dialog} ref={executionRef} hideTrigger returnFocusRef={openerRef} /> : null}
      </span>
    </>
  )
}
```

- [ ] **Step 7: Delete the pager that has no caller left**

Run: `git rm src/components/disposal/disposal-pagination.tsx`
Expected: `rm 'src/components/disposal/disposal-pagination.tsx'`

Run: `git grep -n "disposal-pagination\|DisposalPagination" -- src tests`
Expected: one line only, the `existsSync` assertion in `tests/list-pages-ui.test.ts` that pins the file is gone.

- [ ] **Step 8: Run the tests for this task**

Run: `node --test tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/disposal-route-structure.test.ts tests/disposal-queue-ux.test.ts tests/disposal-bulk-approval.test.ts tests/disposal-bulk-execution-ui.test.ts tests/disposal-evidence-exception.test.ts tests/operational-return-navigation.test.ts tests/dialog-trigger-handles.test.ts tests/row-actions-ui.test.ts tests/list-primitives-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts`
Expected: PASS, `tests 190 · pass 190 · fail 0` (list-pages-ui 10, list-filters-ui 4, disposal-route-structure 18, disposal-queue-ux 8, disposal-bulk-approval 13, disposal-bulk-execution-ui 10, disposal-evidence-exception 14, operational-return-navigation 6, dialog-trigger-handles 5, row-actions-ui 8, list-primitives-ui 18, list-frame-guards 21, visual-foundation-guards 26, form-migration-guards 23, thai-glossary 3, messages-parity 3).

Run: `node <temp>/p2b1-precheck.mjs --file D/disposal/page.tsx`
Expected: `· in MIGRATED_LIST_FILES`, every guard row `0       0     0     <seed>` and `args    (no row holds this file)`; exit 0.

Run: `node <temp>/p2b1-precheck.mjs --file c/disposal/disposal-row-actions.tsx`
Expected: `(LF) · not in MIGRATED_LIST_FILES`, no guard row, `args    (no row holds this file)`.

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected: exit 0, `budgets hold: no live count is over its row`, with `R7 TABLE_HEADER_FILLS 27 in 19 rows`, `LH1 BUDGETS.LH1 33 in 33 rows`, `LT3 BUDGETS.LT3 7 in 6 rows`, `LT4 BUDGETS.LT4 3 in 3 rows`, `LT5 BUDGETS.LT5 7 in 4 rows`, `LV2 BUDGETS.LV2 112 in 34 rows`, `LV3 BUDGETS.LV3 40 in 12 rows`, `LN1 BUDGETS.LN1 10 in 8 rows`, and no `slack` line except the two LB1 `0 → 1` rows.

- [ ] **Step 9: Prove every class compiles**

Run: `node <temp>/p2b2-tw-probe.mjs "src/app/[locale]/(dashboard)/disposal/page.tsx" src/components/disposal/disposal-row-actions.tsx`
Expected: `checked 72 classes, missing 0`. Two classes are new to `src`, `lg:col-span-1` and `lg:col-span-6` (the filter grid of §6.5); the probe proves they compile. The wrapper has no class string of its own.

- [ ] **Step 10: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `tests 1899 · pass 1898 · fail 0 · skipped 1` (3 more: 2 in `list-pages-ui`, 1 in `list-filters-ui`).
- `npx tsc --noEmit`: no errors (the `DisposalRowNext` dialog objects type-check against the 2C buttons' props).
- `npm run lint`: 0 errors and no new warning; `npx eslint "src/app/[locale]/(dashboard)/disposal/page.tsx" src/components/disposal/disposal-row-actions.tsx tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/disposal-route-structure.test.ts tests/disposal-queue-ux.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- `git diff --stat` (unstaged) shows 9 files: the page 236 insertions and 140 deletions, `messages/en.json` and `messages/th.json` 2 and 1 each, `tests/disposal-queue-ux.test.ts` 5 and 2, `tests/disposal-route-structure.test.ts` 4 and 7, `tests/list-filters-ui.test.ts` 17 insertions, `tests/list-frame-guards.test.ts` 1 and 8, `tests/list-pages-ui.test.ts` 42 insertions, `tests/visual-foundation-guards.test.ts` 1 deletion.
- `git status` also lists `D  src/components/disposal/disposal-pagination.tsx` (staged by `git rm`) and `?? src/components/disposal/disposal-row-actions.tsx` (73 lines, LF).
- The line-ending check prints `535 535` for the page (CRLF throughout). Git may warn that LF will be replaced by CRLF in the new wrapper: leave it LF.

- [ ] **Step 11: Commit**

```bash
git add "src/app/[locale]/(dashboard)/disposal/page.tsx" src/components/disposal/disposal-row-actions.tsx messages/th.json messages/en.json tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/disposal-route-structure.test.ts tests/disposal-queue-ux.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): disposal queue on PageHeader, TabNav, DataTable and RowActions, one filter form (2B-2 task 3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 11 files in the commit, `disposal-pagination.tsx` among them as a deletion and `disposal-row-actions.tsx` as a new file (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 18, spec §8.6 row `/th/disposal`):** at 1440, 1024, 768 and 375:
- the header buttons wrap at 768 and stay in DOM order (history, create batch, create); the TabNav underline and counts at every width, `aria-current="page"` on the stage in use; the scroll hint under the tabs below 640
- one filter form: at 375 in the folded panel ("ใช้ตัวกรอง N รายการ" once a filter is on), from 768 in the framed panel; Enter in the search submits; "ล้างตัวกรอง" only with a filter on; the date alert when "from" is after "to"
- as an approver on "รออนุมัติ": "พิจารณาคำขอ" in a row opens the decision dialog; close it with "ยกเลิก" (never save) and focus is back on "พิจารณาคำขอ"; ⋯ → "เปิดคำขอ" opens the request; on a batched request ⋯ → "เปิดใบงานชุด"; clicking ⋯, a menu item or anywhere inside the open dialog never opens the row; on "อนุมัติแล้ว รอดำเนินการ" the same for "บันทึกตัดจำหน่ายจริง" (it shows cut to "บันทึกตัดจำหน่าย…")
- a viewer without approve or edit sees no actions column; rows still open the request
- the footer range and 25/50/100; `?page=99` lands on the last page; a search that finds nothing shows the empty state with an outline "ล้างตัวกรอง"
- the phone cards keep their dialog buttons (44px) and "ดู"; a missing value reads "—"
- axe on `/th/disposal` with a filter on: no `color-contrast`, `label` or `aria-*` violation; one search landmark in the accessibility tree at 375 and at 1440

---

### Task 4: `D/disposal/batches/page.tsx` on the list primitives, with real pages (B4)

Spec §5.4 row "disposal/batches", §5.9.1, §5.9.2 row 5, §4.4.3 row `D/disposal/batches/page.tsx`, §4.5.2 #21, §5.14 (`list-pages-ui`: `parseListPage`, no `take: \d+`), rulings B4, I21, R-h, R-p and controller rulings (e) and (j). One page, one commit. The page is CRLF. This is the first B4 list of plan 2B-2; it follows 2B-1 Task 17 (departments) and adds `returnTo` on the link to a batch.

Rulings this task applies:
- **B4, §5.9.2 row 5:** the page takes `searchParams` (`page`, `pageSize`) and reads them with `parseListPage`; `listPageWindow` gives `skip`/`take` in place of `take: 100`; `prisma.disposalBatch.count({ where })` runs in the same `Promise.all`; `orderBy` becomes `[{ createdAt: "desc" }, { id: "asc" }]`. The `where` (`{ isActive: true }`) moves into a typed `Prisma.DisposalBatchWhereInput` constant shared by both calls. The index `IX_disposal_batches_isActive_batchStatus_requestDate` covers `isActive`; batches are few, so the risk is low and no index is added.
- **`returnTo` (§5.9.2 row 5):** `listHref(next)` writes only non-default `page` and `pageSize` (`appendListPage`), so page 1 at 25 keeps today's URL. `batchesReturnHref = listHref(listPage)`, and every link to a batch is `appendOperationalReturnTo(`/${locale}/disposal/batches/${id}`, batchesReturnHref)`; Task 5 makes the batch page read it.
- **I21:** past the last page the page redirects to `listHref({ page: lastPage, pageSize })`.
- **R-h, §4.4.3:** `PageHeader` with `title={t("batchHistory")}`, `meta={t("batchHistoryHelp")}`, `back={<PageBackLink href={`/${locale}/disposal`} label={t("backToQueue")} />}` (the text link with `ArrowLeft` at `:31`; LB1 1 → 0) and, once a batch exists, "สร้างชุดคำขอตัดจำหน่าย" (`Plus`) as the primary `md` action (§5.4 writes the default size; R-h puts header buttons at `md`). "once a batch exists" now counts all pages (`total > 0`), not the rows of this page.
- **§5.4:** the empty state stays the `ActionEmptyState` outside the table (it shows only when there is no batch at all). The table is `DataTable framed={false}` inside the existing frame, with a `caption` and `scrollHint`, and `Pagination` in `DataTableFoot` under both the phone cards and the table. Each row is a `ClickableTableRow` to its batch; the "เปิดใบงานชุด" link becomes `RowActions` with the next step only (`groups={[]}`, no ⋯) in the pinned actions column. The batch number is plain text in the row (`tag font-medium text-foreground`, R-p): the row and the next step already open the batch, so the old link in the cell goes. The phone card's open link becomes `buttonVariants({ variant: "outline" })` (44 on phones).
- **"เปิดใบงานชุด" keeps its icon:** 70px at 13px, within the 76px beside an icon (Task 3's measurement).
- **LFG/VFG, ruling (e):** every row goes to 0 (R7 2, LH1 1, LB1 1) and the page joins `MIGRATED_LIST_FILES`.
- **Tests (ruling (j)):** `B4_LISTS` in `tests/list-pages-ui.test.ts` becomes a one-line-per-list array with this page, and a page test checks the back link, `returnTo`, the next-only `RowActions` and the redirect. A later B4 task of this plan whose query fits the `B4_LISTS` test (`parseListPage`, `listPageWindow`, `appendListPage`, `findMany` and `count({ where })` in one `Promise.all`) inserts its line before the `]`; rounds (in-memory slice) and PM (`groupBy` per state) write their own test instead.

What users will see on `/th/disposal/batches`:
- The back button "กลับคิวตัดจำหน่าย" is the outline button with the left arrow (an icon button on phones), and the title is weight 600.
- The list pages for real: 25 batches per page by default with 25/50/100, the range and "หน้า x จาก y". Before, the newest 100 batches showed and older ones could not be reached.
- The table header is white, 13px; rows open their batch; each row has "เปิดใบงานชุด" in a pinned column.
- On a batch page opened from page 2, "กลับ" returns to page 2 of this list (after Task 5).

Not in this task: the batch page (Task 5) · `D/disposal/page.tsx` (Task 3) · messages (no key changes) · docs.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/disposal/batches/page.tsx` (CRLF; 1 exact replacement of `:1-61`, the component; `BatchStatus` `:63-66` stays)
- Modify: `tests/list-pages-ui.test.ts` (CRLF; 1 exact replacement, 1 appended block)
- Modify: `tests/list-frame-guards.test.ts`, `tests/visual-foundation-guards.test.ts` (through `p2b-budget.mjs` only)
- Temp folder only: `t4-pages-block.ts`

**Must keep passing without edits:** `tests/disposal-queue-ux.test.ts:14` (the page exists) · `tests/mobile-field-navigation.test.ts:24` (`/th/disposal/batches` keeps the bottom navigation; FMG GL2) · `tests/list-pagination.test.ts` · the tests of Task 3 Step 8.

**Interfaces:**
- Consumes: what Task 3 consumes, plus `PageBackLink({ href, label })`, `parseListPage`, `listPageWindow`, `appendListPage`, `lastListPage`, `LIST_PAGE_SIZES` from `@/lib/list-pagination`, `paginationRange` from `@/lib/master-data-query`, `appendOperationalReturnTo` from `@/lib/operational-return-navigation`, `type Prisma` from `@prisma/client`, `cn` from `@/lib/utils`.
- Produces:
  - `tests/list-pages-ui.test.ts`: `const B4_LISTS = [` … `]` with one list per line (departments, then this page); a later task whose query fits the test inserts its line before the `]`.
  - The batch link's `returnTo` (`/th/disposal/batches` on page 1 at 25, `/th/disposal/batches?page=2&pageSize=50` otherwise), which Task 5 reads.
  - LFG/VFG: no row of the page; the page in `MIGRATED_LIST_FILES` (39 files).

| guard | `D/disposal/batches/page.tsx` before → after |
|---|---|
| VFG R7 | 2 → – |
| LFG | LH1 1 · LB1 1 → all – · joins `MIGRATED_LIST_FILES` |
| totals | R7 27 → 25 · LH1 33 → 32 · LB1 14 → 13 |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b2-t1-precheck.mjs 4`
Expected: `git status` prints nothing; the nine `ok` lines for the primitives, the handles and the keys, then:
```
ok      Task 1 is in
ok      Task 2 is in
ok      Task 3 is in
ok      Task 4 has not run yet
ok      src/app/[locale]/(dashboard)/disposal/batches/page.tsx is unchanged since e3f20ce (hash 51aeeadda595e3b3)
info    src/app/[locale]/(dashboard)/disposal/batches/page.tsx: CRLF
preconditions hold for Task 4
```

Run: `node <temp>/p2b1-precheck.mjs --file D/disposal/batches/page.tsx`
Expected (exit 0): rows `R7 2 2 0 2`, `LH1 1 1 0 1`, `LB1 1 1 0 1` and `args    R7=2:2 LH1=1:1 LB1=1:1`.

Run: `git ls-files --eol "src/app/[[]locale]/(dashboard)/disposal/batches/page.tsx" tests/list-pages-ui.test.ts`
Expected: `i/lf w/crlf` for both.

- [ ] **Step 2: Write the failing tests (`tests/list-pages-ui.test.ts`, CRLF; `read` strips `\r`)**

(a) Put the page in `B4_LISTS`, one line per list. Replace:

```ts
// B4 (spec 2B §5.9): the lists that now page on the server. Plans 2B-2 and 2B-5 add theirs.
const B4_LISTS = [`${D}master-data/departments/page.tsx`]
```

with:

```ts
// B4 (spec 2B §5.9): the lists that now page on the server. Plans 2B-2 and 2B-5 add theirs, one line each, before the "]".
const B4_LISTS = [
  `${D}master-data/departments/page.tsx`,
  `${D}disposal/batches/page.tsx`,
]
```

(b) Save this block as `<temp>/t4-pages-block.ts` and run `node <temp>/p2b2-append.mjs <temp>/t4-pages-block.ts tests/list-pages-ui.test.ts`:

```ts
// Plan 2B-2 Task 4 (spec 2B §5.4 row "disposal/batches", §5.9.2 row 5, B4): the batch history pages for real, and the
// link to a batch carries the list page, so the batch page's back button returns to it (Task 5 reads it).
test("disposal batches: real pages, the list page in returnTo, and RowActions with the next step only (spec 2B §5.4, §5.9.2 row 5)", () => {
  const source = read(`${D}disposal/batches/page.tsx`)
  for (const part of ["<PageHeader", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<ClickableTableRow", "<RowActions", "<DataTableFoot>", "<Pagination"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /<div className="space-y-6">/)
  assert.match(source, /back=\{<PageBackLink href=\{`\/\$\{locale\}\/disposal`\} label=\{t\("backToQueue"\)\} \/>\}/)
  assert.match(source, /searchParams: Promise<\{ page\?: string \| string\[\]; pageSize\?: string \| string\[\] \}>/)
  assert.match(source, /const batchesReturnHref = listHref\(listPage\)/)
  assert.match(source, /appendOperationalReturnTo\(`\/\$\{locale\}\/disposal\/batches\/\$\{id\}`, batchesReturnHref\)/)
  assert.match(source, /next=\{\{ label: t\("openBatch"\), href, icon: <FolderOpen aria-hidden="true" \/> \}\}\n\s+groups=\{\[\]\}\n\s+\/>/, "one next step and no ⋯: opening the batch is the row's only command")
  assert.doesNotMatch(source, /deleteAction=/)
  assert.match(source, /<DataTableHead align="right" sticky="right" hideLabel>\{tCommon\("actions"\)\}<\/DataTableHead>/)
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: listHref\(\{ pageSize: value \}\) \}\)\)\}/)
  assert.match(source, /^import \{ redirect \} from "next\/navigation"$/m)
  assert.match(source, /const lastPage = lastListPage\(total, listPage\.pageSize\)\n\s+if \(batches\.length === 0 && total > 0 && listPage\.page > lastPage\) \{\n\s+redirect\(/)
  assert.match(source, /canCreate && total > 0 \?/, "the create button in the header shows once a batch exists, counted over all pages")
})
```

Run: `node --test tests/list-pages-ui.test.ts`
Expected: FAIL, `tests 11 · pass 9 · fail 2`:
- `B4 lists read page and pageSize with parseListPage and count the whole list in the same Promise.all (spec 2B §5.9.1)`: message `src/app/[locale]/(dashboard)/disposal/batches/page.tsx` (no `parseListPage(`)
- `disposal batches: real pages, the list page in returnTo, and RowActions with the next step only (spec 2B §5.4, §5.9.2 row 5)`: `no <PageHeader`

- [ ] **Step 3: Lower the guard rows (the failing guards)**

Run: `node <temp>/p2b-budget.mjs D/disposal/batches/page.tsx R7=2:0 LH1=1:0 LB1=1:0 --migrated`
Expected (exit 0):
```
R7: 2 -> 0 (row deleted)
LH1: 1 -> 0 (row deleted)
LB1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/disposal/batches/page.tsx
```

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 43 · fail 4`: LH1 (`LH1: 33 in 33 files`) and LB1 (`LB1: 12 in 12 files`), each listing only `src/app/[locale]/(dashboard)/disposal/batches/page.tsx: 1 > 0`; `L0` with `LH1 …/disposal/batches/page.tsx: 1 > 0` and `LB1 …: 1 > 0`; VFG `R7 interim: …` with `27 matches in 19 files; over budget:` and `src/app/[locale]/(dashboard)/disposal/batches/page.tsx: 2 > 0`.

- [ ] **Step 4: Move the page onto the primitives and the paged query (`src/app/[locale]/(dashboard)/disposal/batches/page.tsx`, CRLF)**

One exact replacement: the imports and the whole page component (`:1-61`). `function BatchStatus` (`:63-66`) stays as it is.

Replace:

```tsx
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { ArrowLeft, FileStack, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { deriveDisposalBatchStatus } from "@/lib/disposal-batch"
import { formatDateTime } from "@/lib/utils"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { StatusBadge } from "@/components/ui/status-badge"

export default async function DisposalBatchHistoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const user = await requirePagePermission(locale, "disposal", "view")
  const canCreate = hasPermission(user, "disposal", "create")
  const [t, tCommon] = await Promise.all([getTranslations("disposalPage"), getTranslations("common")])
  const batches = await prisma.disposalBatch.findMany({
    where: { isActive: true },
    include: {
      requestedBy: { select: { code: true, fullNameTh: true } },
      disposalRequests: { where: { isActive: true }, select: { requestStatus: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={`/${locale}/disposal`} className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-primary hover:underline"><ArrowLeft className="h-4 w-4" />{t("backToQueue")}</Link>
          <h1 className="mt-2 text-2xl font-bold text-foreground">{t("batchHistory")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("batchHistoryHelp")}</p>
        </div>
        {canCreate && batches.length > 0 ? <Link href={`/${locale}/disposal/batch/new`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover"><Plus className="h-4 w-4" />{t("batchCreateTitle")}</Link> : null}
      </header>

      {batches.length === 0 ? (
        <ActionEmptyState icon={<FileStack className="h-6 w-6" />} title={t("batchHistoryEmpty")} description={t("batchHistoryEmptyHelp")} actionHref={canCreate ? `/${locale}/disposal/batch/new` : undefined} actionLabel={canCreate ? t("batchCreateTitle") : undefined} />
      ) : (
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="divide-y divide-border md:hidden">
            {batches.map((batch) => {
              const status = deriveDisposalBatchStatus(batch.disposalRequests.map((request) => request.requestStatus))
              return <article key={batch.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><Link href={`/${locale}/disposal/batches/${batch.id}`} className="text-sm font-semibold text-foreground hover:text-primary">{batch.batchNo}</Link><p className="mt-1 text-xs text-muted-foreground">{t(`types.${batch.disposalType}`)} · {formatDateTime(batch.requestDate)}</p></div><BatchStatus status={status} label={status === "partial" ? t("batchStatuses.partial") : t(`statuses.${status}`)} /></div><div className="mt-3 flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{batch.requestedBy.fullNameTh}</span><span className="font-medium text-foreground">{t("batchItemCount", { count: batch.disposalRequests.length })}</span></div><Link href={`/${locale}/disposal/batches/${batch.id}`} className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border text-sm font-medium hover:bg-accent">{t("openBatch")}</Link></article>
            })}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40 text-left text-xs font-semibold text-muted-foreground"><tr><th className="px-4 py-3">{t("sourceBatch")}</th><th className="px-4 py-3">{t("disposalType")}</th><th className="px-4 py-3">{t("requestedBy")}</th><th className="px-4 py-3">{t("requestDate")}</th><th className="px-4 py-3">{tCommon("status")}</th><th className="sticky right-0 bg-muted/95 px-4 py-3 text-right">{tCommon("actions")}</th></tr></thead>
              <tbody className="divide-y divide-border">{batches.map((batch) => {
                const status = deriveDisposalBatchStatus(batch.disposalRequests.map((request) => request.requestStatus))
                return <tr key={batch.id}><td className="px-4 py-3"><Link href={`/${locale}/disposal/batches/${batch.id}`} className="font-semibold text-foreground hover:text-primary">{batch.batchNo}</Link><div className="mt-1 text-xs text-muted-foreground">{t("batchItemCount", { count: batch.disposalRequests.length })}</div></td><td className="px-4 py-3 text-muted-foreground">{t(`types.${batch.disposalType}`)}</td><td className="px-4 py-3 text-muted-foreground">{batch.requestedBy.code} - {batch.requestedBy.fullNameTh}</td><td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(batch.requestDate)}</td><td className="px-4 py-3"><BatchStatus status={status} label={status === "partial" ? t("batchStatuses.partial") : t(`statuses.${status}`)} /></td><td className="sticky right-0 border-l border-border bg-surface px-4 py-3 text-right"><Link href={`/${locale}/disposal/batches/${batch.id}`} className="inline-flex min-h-9 items-center rounded-md border border-border px-3 font-medium hover:bg-accent">{t("openBatch")}</Link></td></tr>
              })}</tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
```

with:

```tsx
import Link from "next/link"
import { redirect } from "next/navigation"
import type { Prisma } from "@prisma/client"
import { getTranslations } from "next-intl/server"
import { FileStack, FolderOpen, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { deriveDisposalBatchStatus } from "@/lib/disposal-batch"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, appendListPage, lastListPage, listPageWindow, parseListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import { cn, formatDateTime } from "@/lib/utils"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader } from "@/components/ui/data-table"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { StatusBadge } from "@/components/ui/status-badge"

type DisposalBatchHistoryPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string | string[]; pageSize?: string | string[] }>
}

export default async function DisposalBatchHistoryPage({ params, searchParams }: DisposalBatchHistoryPageProps) {
  const { locale } = await params
  const { page, pageSize } = await searchParams
  const user = await requirePagePermission(locale, "disposal", "view")
  const canCreate = hasPermission(user, "disposal", "create")
  const [t, tCommon] = await Promise.all([getTranslations("disposalPage"), getTranslations("common")])
  const listPage = parseListPage({ page, pageSize })
  const basePath = `/${locale}/disposal/batches`
  // The list URL with its page and page size; the defaults stay out of it, so page 1 keeps today's URL (spec 2B B4).
  const listHref = (next: { page?: number; pageSize?: number }) => {
    const query = appendListPage(new URLSearchParams(), next).toString()
    return query ? `${basePath}?${query}` : basePath
  }
  // A batch page's back button comes back here, on the same page and page size (spec 2B §5.9.2 row 5).
  const batchesReturnHref = listHref(listPage)
  const batchHref = (id: string) => appendOperationalReturnTo(`/${locale}/disposal/batches/${id}`, batchesReturnHref)

  const where: Prisma.DisposalBatchWhereInput = { isActive: true }
  const { skip, take } = listPageWindow(listPage)
  const [batches, total] = await Promise.all([
    prisma.disposalBatch.findMany({
      where,
      include: {
        requestedBy: { select: { code: true, fullNameTh: true } },
        disposalRequests: { where: { isActive: true }, select: { requestStatus: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip,
      take,
    }),
    prisma.disposalBatch.count({ where }),
  ])
  // A page past the last one (an old link) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listPage.pageSize)
  if (batches.length === 0 && total > 0 && listPage.page > lastPage) {
    redirect(listHref({ page: lastPage, pageSize: listPage.pageSize }))
  }
  const { start, end, totalPages } = paginationRange(listPage.page, listPage.pageSize, total)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("batchHistory")}
        meta={t("batchHistoryHelp")}
        back={<PageBackLink href={`/${locale}/disposal`} label={t("backToQueue")} />}
        actions={
          canCreate && total > 0 ? (
            <Link href={`/${locale}/disposal/batch/new`} className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden="true" />
              {t("batchCreateTitle")}
            </Link>
          ) : undefined
        }
      />

      {batches.length === 0 ? (
        <ActionEmptyState icon={<FileStack className="h-6 w-6" />} title={t("batchHistoryEmpty")} description={t("batchHistoryEmptyHelp")} actionHref={canCreate ? `/${locale}/disposal/batch/new` : undefined} actionLabel={canCreate ? t("batchCreateTitle") : undefined} />
      ) : (
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="divide-y divide-border md:hidden">
            {batches.map((batch) => {
              const status = deriveDisposalBatchStatus(batch.disposalRequests.map((request) => request.requestStatus))
              const href = batchHref(batch.id)
              return <article key={batch.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><Link href={href} className="text-sm text-foreground hover:text-primary"><span className="tag font-medium">{batch.batchNo}</span></Link><p className="mt-1 text-xs text-muted-foreground">{t(`types.${batch.disposalType}`)} · {formatDateTime(batch.requestDate)}</p></div><BatchStatus status={status} label={status === "partial" ? t("batchStatuses.partial") : t(`statuses.${status}`)} /></div><div className="mt-3 flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{batch.requestedBy.fullNameTh}</span><span className="font-medium text-foreground">{t("batchItemCount", { count: batch.disposalRequests.length })}</span></div><Link href={href} className={cn(buttonVariants({ variant: "outline" }), "mt-3 w-full")}>{t("openBatch")}</Link></article>
            })}
          </div>
          <DataTable framed={false} className="hidden md:block" caption={t("batchHistory")} scrollHint={tCommon("tableScrollHint")}>
            <DataTableHeader>
              <tr>
                <DataTableHead>{t("sourceBatch")}</DataTableHead>
                <DataTableHead>{t("disposalType")}</DataTableHead>
                <DataTableHead>{t("requestedBy")}</DataTableHead>
                <DataTableHead>{t("requestDate")}</DataTableHead>
                <DataTableHead>{tCommon("status")}</DataTableHead>
                <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {batches.map((batch) => {
                const status = deriveDisposalBatchStatus(batch.disposalRequests.map((request) => request.requestStatus))
                const href = batchHref(batch.id)
                return (
                  <ClickableTableRow key={batch.id} href={href} label={`${t("openBatch")}: ${batch.batchNo}`}>
                    <DataTableCell className="whitespace-nowrap">
                      <span className="tag font-medium text-foreground">{batch.batchNo}</span>
                      <div className="mt-1 text-xs text-muted-foreground">{t("batchItemCount", { count: batch.disposalRequests.length })}</div>
                    </DataTableCell>
                    <DataTableCell className="text-muted-foreground">{t(`types.${batch.disposalType}`)}</DataTableCell>
                    <DataTableCell className="text-muted-foreground"><span className="tag">{batch.requestedBy.code}</span> - {batch.requestedBy.fullNameTh}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(batch.requestDate)}</DataTableCell>
                    <DataTableCell><BatchStatus status={status} label={status === "partial" ? t("batchStatuses.partial") : t(`statuses.${status}`)} /></DataTableCell>
                    <DataTableCell align="right" sticky="right">
                      <RowActions
                        code={batch.batchNo}
                        menuLabel={tCommon("moreActionsFor", { code: batch.batchNo })}
                        next={{ label: t("openBatch"), href, icon: <FolderOpen aria-hidden="true" /> }}
                        groups={[]}
                      />
                    </DataTableCell>
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
        </section>
      )}
    </div>
  )
}
```

Check: `grep -nE '"-"|formatCurrency|ArrowLeft|bg-muted/|<h1|<table|<thead|<th |<td |take: [0-9]' "src/app/[locale]/(dashboard)/disposal/batches/page.tsx"` prints nothing (exit 1).

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/list-pages-ui.test.ts tests/disposal-queue-ux.test.ts tests/mobile-field-navigation.test.ts tests/list-pagination.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `tests 102 · pass 102 · fail 0` (list-pages-ui 11, disposal-queue-ux 8, mobile-field-navigation 7, list-pagination 6, list-frame-guards 21, visual-foundation-guards 26, form-migration-guards 23).

Run: `node <temp>/p2b1-precheck.mjs --file D/disposal/batches/page.tsx` then `node <temp>/p2b1-precheck.mjs --budgets`
Expected: `· in MIGRATED_LIST_FILES` and `args    (no row holds this file)`; then exit 0 with `R7 TABLE_HEADER_FILLS 25 in 18 rows`, `LH1 BUDGETS.LH1 32 in 32 rows`, `LB1 BUDGETS.LB1 13 in 13 rows · live 11 in 11 files … slack 2` (the two `0 → 1` rows) and `budgets hold: no live count is over its row`.

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b2-tw-probe.mjs "src/app/[locale]/(dashboard)/disposal/batches/page.tsx"`
Expected: `checked 30 classes, missing 0`. No class is new to `src`.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` `tests 1900 · pass 1899 · fail 0 · skipped 1`; tsc no errors (the `Prisma.DisposalBatchWhereInput` constant and the `searchParams` type compile); lint 0 errors and no new warning (`npx eslint "src/app/[locale]/(dashboard)/disposal/batches/page.tsx" tests/list-pages-ui.test.ts` prints nothing).

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 4 files: the page 124 insertions and 29 deletions, `tests/list-pages-ui.test.ts` 26 and 2, `tests/list-frame-guards.test.ts` 1 and 2, `tests/visual-foundation-guards.test.ts` 1 deletion. The page stays CRLF (`161 161`).

- [ ] **Step 8: Commit**

```bash
git add "src/app/[locale]/(dashboard)/disposal/batches/page.tsx" tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): disposal batch history on DataTable and RowActions, paged on the server (2B-2 task 4, B4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 18, spec §8.6 row `/th/disposal/batches`):** at 1440 and 375: the footer total equals the number of batches before (the list stopped at 100); `?pageSize=25&page=2` (if there are more than 25) → open a batch → the URL carries `returnTo=%2Fth%2Fdisposal%2Fbatches%3Fpage%3D2`; `?page=99` lands on the last page; "กลับคิวตัดจำหน่าย" goes to `/th/disposal`; the empty state shows only when there is no batch; at 375 the cards' "เปิดใบงานชุด" is 44px; note the load time against the Task 0 measurement (one more `count`).

---

### Task 5: `D/disposal/batches/[id]/page.tsx` on the page primitives, with a back button that reads `returnTo` (and `normalizeDisposalBatchReturnTo`)

Spec §5.4 row "disposal/batches/[id]", §5.9.2 row 5, §5.14 (the `normalizeDisposalBatchReturnTo` cases), §4.4.3 row `D/disposal/batches/[id]/page.tsx`, §4.3.3 rule 6 (a record with no name of its own shows its code), §4.5.2 #22, §4.6.3 (`pb-24`), §5.7, rulings R-h, R-n, R-p and controller rulings (b), (e) and (j). One commit for the page, the new pure helper and its tests. The page and `src/lib/operational-return-navigation.ts` are LF; `tests/operational-return-navigation.test.ts` is CRLF and read raw (no `\n` in its new regexes).

Rulings this task applies:
- **Ruling (b), §5.9.2 row 5:** `normalizeDisposalBatchReturnTo(locale, value)` lives in `src/lib/operational-return-navigation.ts` (pure, no imports, so the test imports it with a relative `.ts` path). It reuses `normalizeInternalReturnTo` with the queue `/${locale}/disposal` as the fallback and `/${locale}/disposal/batches` as the one more allowed path: the batch history list with its `page` and `pageSize` comes back, anything else falls back to the queue as today. The queue URL itself, with its filters, also stays valid (it is the fallback path); the queue's batch links carry no `returnTo` yet (Task 3), so they land on the fallback. `normalizeOperationalReturnTo` is not touched (I22; `tests/disposal-route-structure.test.ts:32`, `tests/operational-return-navigation.test.ts:42`).
- **R-h, §4.4.3, §4.3.3 rule 6:** `PageHeader` with `breadcrumbs` (the same two crumbs, now through the prop; `tests/breadcrumbs-ui.test.ts` counts both forms), `title={<span className="tag font-medium">{batch.batchNo}</span>}` (a batch has neither a name nor an asset of its own), `meta` = the status badge, then `t("batchDetailHelp", { count })`, and `back={<PageBackLink href={returnToHref} label={tCommon("back")} />}`. The status badge moves from beside the back button into the meta row. LH1, LB1 → 0.
- **§4.6.3:** the root `space-y-6 pb-24 md:pb-0` becomes `space-y-6`: the page shows the bottom navigation (`tests/mobile-field-navigation.test.ts:25`), and the shell already leaves room for it. LP1 1 → 0.
- **§5.4:** the five `BatchMetric` boxes become one `StatStrip` (`formatCount`; LS1 1 → 0). `BatchInfo` becomes one `KeyValueList` (label column 120px, one column below sm; LK1 1 → 0): type, requester and approver (codes in `tag`, R-p; no approver reads "คิวอนุมัติส่วนกลาง" as today), request date, the sale and salvage values when set, as `formatMoney(…, { unit: tCommon("baht") })` outside a table (§5.7; LV3 2 → 0), and the reason with its line breaks kept (`whitespace-pre-wrap`).
- **§5.4:** the requests table is `DataTable framed={false}` in its panel, with a `caption` and `scrollHint`; each row is a `ClickableTableRow` to its request (`appendOperationalReturnTo(…, batchHref)`, the same URL `RequestLink` built); `RequestLink` becomes `RowActions` with the next step "เปิดคำขอ" (`FileText`, 51px, fits beside the icon) and no ⋯, in the pinned actions column; an empty batch shows `TableEmptyRow` with `tCommon("noData")` in the table and `EmptyNote padded` on phones (both new: the page had no empty row). The phone card's link becomes `buttonVariants({ variant: "outline", size: "sm" })` (44 on phones). R7 2 → 0.
- **Not changed:** the query, `counts`, the shared evidence aside (`DisposalAttachments`), and `batchHref` as the request's `returnTo` (`disposal/[id]` falls back to the queue for it, I22).
- **LFG/VFG, ruling (e):** every row goes to 0 and the page joins `MIGRATED_LIST_FILES` (2B does not touch it again).
- **Tests:** the helper's cases and a page pin are appended to `tests/operational-return-navigation.test.ts` (its import goes at the top); a "has" test for the frame is appended to `tests/list-pages-ui.test.ts` (ruling (j)).

What users will see on `/th/disposal/batches/<id>`:
- The title is the batch code in monospace; the status badge and "ใบงานรวมคำขอตัดจำหน่าย N รายการ" sit under it, also on phones. "กลับ" is the outline button with the left arrow (an icon button on phones) and returns to the batch history page the user came from (with its page and page size), otherwise to the queue as before.
- The five number boxes become one flat strip (two columns below 1024px).
- The shared details are a label and value list; money reads "1,500.00 บาท".
- The table header is white, 13px; rows open their request; "เปิดคำขอ" sits in a pinned column; codes are monospace.
- On phones the page no longer leaves an extra blank band above the bottom navigation.

Not in this task: `D/disposal/[id]/page.tsx` (2B-4) · `disposal-attachments.tsx` · `normalizeOperationalReturnTo` · messages · docs.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/disposal/batches/[id]/page.tsx` (LF, `i/lf w/lf`; 3 exact replacements)
- Modify: `src/lib/operational-return-navigation.ts` (LF; 1 exact replacement)
- Modify: `tests/operational-return-navigation.test.ts` (CRLF; 1 exact replacement, 1 appended block)
- Modify: `tests/list-pages-ui.test.ts` (CRLF; 1 appended block)
- Modify: `tests/list-frame-guards.test.ts`, `tests/visual-foundation-guards.test.ts` (through `p2b-budget.mjs` only)
- Temp folder only: `t5-return-block.ts`, `t5-pages-block.ts`

**Must keep passing without edits:**
- `tests/operational-return-navigation.test.ts:5-98` (the six tests before the appended block; `:13` `url.pathname !== fallback` and `:14` `allowedPaths` still match the helper file)
- `tests/breadcrumbs-ui.test.ts` (11 sites, 8 with a code; `{ label: batch.batchNo, code: true }]}` for this page) · `tests/disposal-batch.test.ts:195-210` (`module: "disposal_batch"`, `disposalRequests`, `DisposalAttachments`) · `tests/mobile-field-navigation.test.ts:25` · `tests/disposal-route-structure.test.ts`

**Interfaces:**
- Consumes: what Task 4 consumes, plus `StatStrip({ items: { key, label, value }[] })`, `KeyValueList({ items: { key?, label, value }[], className })`, `EmptyNote({ padded, children })`; `normalizeInternalReturnTo` (module-private, `src/lib/operational-return-navigation.ts:37-49`).
- Produces:
  - `export function normalizeDisposalBatchReturnTo(locale: string, value: string | string[] | undefined): string` in `src/lib/operational-return-navigation.ts`.
  - `tests/operational-return-navigation.test.ts` imports it at the top: `import { normalizeDisposalBatchReturnTo } from "../src/lib/operational-return-navigation.ts"` after one blank line under the three `node:` imports. Task 14 adds `normalizeOperationalReturnTo` to that import line and appends its `"maintenance-pm"` cases after this task's block.
  - LFG/VFG: no row of the page; the page in `MIGRATED_LIST_FILES` (40 files).

| guard | `D/disposal/batches/[id]/page.tsx` before → after |
|---|---|
| VFG R7 | 2 → – |
| LFG | LH1 1 · LB1 1 · LP1 1 · LV3 2 · LS1 1 · LK1 1 → all – · joins `MIGRATED_LIST_FILES` |
| totals | R7 25 → 23 · LH1 32 → 31 · LB1 13 → 12 · LP1 8 → 7 · LV3 40 → 38 · LS1 23 → 22 · LK1 11 → 10 |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b2-t1-precheck.mjs 5`
Expected: `git status` prints nothing; the nine `ok` lines for the primitives, the handles and the keys, then:
```
ok      Task 1 is in
ok      Task 2 is in
ok      Task 3 is in
ok      Task 4 is in
ok      Task 5 has not run yet
ok      src/app/[locale]/(dashboard)/disposal/batches/[id]/page.tsx is unchanged since e3f20ce (hash 259409c0bb25ecac)
ok      src/lib/operational-return-navigation.ts is unchanged since e3f20ce (hash c17bd4967b2c838e)
ok      tests/operational-return-navigation.test.ts is unchanged since e3f20ce (hash 07dd576dc205ea54)
info    src/app/[locale]/(dashboard)/disposal/batches/[id]/page.tsx: LF
info    src/lib/operational-return-navigation.ts: LF
info    tests/operational-return-navigation.test.ts: CRLF
preconditions hold for Task 5
```

Run: `node <temp>/p2b1-precheck.mjs --file "D/disposal/batches/[id]/page.tsx"`
Expected (exit 0):
```
file    src/app/[locale]/(dashboard)/disposal/batches/[id]/page.tsx (LF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
R7         2       2     0     2
LH1        1       1     0     1
LB1        1       1     0     1
LP1        1       1     0     1
LV3        2       2     0     2
LS1        1       1     0     1
LK1        1       1     0     1
args    R7=2:2 LH1=1:1 LB1=1:1 LP1=1:1 LV3=2:2 LS1=1:1 LK1=1:1
```

Run: `git ls-files --eol "src/app/[[]locale]/(dashboard)/disposal/batches/[[]id]/page.tsx" src/lib/operational-return-navigation.ts tests/operational-return-navigation.test.ts tests/list-pages-ui.test.ts`
Expected: `i/lf w/lf` for the page and the helper file, `i/lf w/crlf` for the two tests. Keep them as they are.

- [ ] **Step 2: Write the failing tests**

(a) `tests/operational-return-navigation.test.ts` (CRLF, read raw). The import, at the top. Replace `:1-3`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
```

with:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { normalizeDisposalBatchReturnTo } from "../src/lib/operational-return-navigation.ts"
```

(b) Save this block as `<temp>/t5-return-block.ts` and run `node <temp>/p2b2-append.mjs <temp>/t5-return-block.ts tests/operational-return-navigation.test.ts`:

```ts
// Plan 2B-2 Task 5 (spec 2B §5.9.2 row 5, §5.14): a disposal batch page goes back to the batch history list it came
// from, on the same page and page size, and to the disposal queue otherwise, as before.
test("normalizeDisposalBatchReturnTo accepts the batch history list and falls back to the disposal queue", () => {
  assert.equal(normalizeDisposalBatchReturnTo("th", "/th/disposal/batches?page=2&pageSize=50"), "/th/disposal/batches?page=2&pageSize=50")
  assert.equal(normalizeDisposalBatchReturnTo("th", "/th/disposal/batches"), "/th/disposal/batches")
  assert.equal(normalizeDisposalBatchReturnTo("th", ["/th/disposal/batches?page=3", "/th/admin"]), "/th/disposal/batches?page=3")
  assert.equal(normalizeDisposalBatchReturnTo("th", "/th/disposal?status=approved&page=1&pageSize=25"), "/th/disposal?status=approved&page=1&pageSize=25", "the queue stays a valid target")
  assert.equal(normalizeDisposalBatchReturnTo("th", undefined), "/th/disposal")
  assert.equal(normalizeDisposalBatchReturnTo("th", ""), "/th/disposal")
  assert.equal(normalizeDisposalBatchReturnTo("th", "/th/disposal/batches/batch-1"), "/th/disposal", "another batch page is not the list")
  assert.equal(normalizeDisposalBatchReturnTo("th", "/en/disposal/batches"), "/th/disposal", "another locale")
  assert.equal(normalizeDisposalBatchReturnTo("th", "https://evil.example/th/disposal/batches"), "/th/disposal")
  assert.equal(normalizeDisposalBatchReturnTo("th", "//evil.example/th/disposal/batches"), "/th/disposal")
})

test("the disposal batch page reads returnTo for its back button", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/disposal/batches/[id]/page.tsx", "utf8")
  assert.match(source, /searchParams: Promise<\{ returnTo\?: string \| string\[\] \}>/)
  assert.match(source, /const returnToHref = normalizeDisposalBatchReturnTo\(locale, rawSearchParams\.returnTo\)/)
  assert.match(source, /back=\{<PageBackLink href=\{returnToHref\} label=\{tCommon\("back"\)\} \/>\}/)
})
```

(c) Save this block as `<temp>/t5-pages-block.ts` and run `node <temp>/p2b2-append.mjs <temp>/t5-pages-block.ts tests/list-pages-ui.test.ts`:

```ts
// Plan 2B-2 Task 5 (spec 2B §5.4 row "disposal/batches/[id]", §4.4.3, §4.6.3): the batch page on the list primitives.
test("the disposal batch page builds on PageHeader, StatStrip, KeyValueList, DataTable and RowActions, with no pb-24 of its own (spec 2B §5.4)", () => {
  const source = read(`${D}disposal/batches/[id]/page.tsx`)
  for (const part of ["<PageHeader", "<PageBackLink", "<StatStrip", "<KeyValueList", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<TableEmptyRow", "<ClickableTableRow", "<RowActions"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /<div className="space-y-6">/, "the shell already leaves room for the bottom bar (spec 2B §4.6.3)")
  assert.doesNotMatch(source, /\bpb-24\b/)
  assert.match(source, /title=\{<span className="tag font-medium">\{batch\.batchNo\}<\/span>\}/, "a batch has no name of its own, so the h1 is its code (spec 2B §4.3.3 rule 6)")
  assert.match(source, /breadcrumbs=\{\[\{ label: t\("title"\), href: `\/\$\{locale\}\/disposal` \}, \{ label: batch\.batchNo, code: true \}\]\}/)
  assert.match(source, /formatMoney\(Number\(batch\.saleValue\), \{ unit: tCommon\("baht"\) \}\)/)
  assert.match(source, /next=\{\{ label: t\("openRequest"\), href: requestHref, icon: <FileText aria-hidden="true" \/> \}\}\n\s+groups=\{\[\]\}\n\s+\/>/, "one next step and no ⋯")
  assert.match(source, /<DataTableHead align="right" sticky="right" hideLabel>\{t\("nextAction"\)\}<\/DataTableHead>/)
  assert.doesNotMatch(source, /function (?:BatchMetric|BatchInfo|RequestLink)\b/)
})
```

Run: `node --test tests/operational-return-navigation.test.ts tests/list-pages-ui.test.ts`
Expected: FAIL, `tests 13 · pass 11 · fail 2`:
- `tests/operational-return-navigation.test.ts` fails as a file: `SyntaxError: The requested module '../src/lib/operational-return-navigation.ts' does not provide an export named 'normalizeDisposalBatchReturnTo'` (none of its tests runs until the helper exists)
- `the disposal batch page builds on PageHeader, StatStrip, KeyValueList, DataTable and RowActions, with no pb-24 of its own (spec 2B §5.4)`: `no <PageHeader`

- [ ] **Step 3: Lower the guard rows (the failing guards)**

Run: `node <temp>/p2b-budget.mjs "D/disposal/batches/[id]/page.tsx" R7=2:0 LH1=1:0 LB1=1:0 LP1=1:0 LV3=2:0 LS1=1:0 LK1=1:0 --migrated`
Expected (exit 0):
```
R7: 2 -> 0 (row deleted)
LH1: 1 -> 0 (row deleted)
LB1: 1 -> 0 (row deleted)
LP1: 1 -> 0 (row deleted)
LV3: 2 -> 0 (row deleted)
LS1: 1 -> 0 (row deleted)
LK1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/disposal/batches/[id]/page.tsx
```

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 39 · fail 8`: LH1 (`LH1: 32 in 32 files`), LB1 (`11 in 11`), LP1 (`8 in 8`), LV3 (`40 in 12`), LS1 (`23 in 20`) and LK1 (`11 in 11`), each listing only `src/app/[locale]/(dashboard)/disposal/batches/[id]/page.tsx` with `N > 0`; `L0` with the same six lines; VFG `R7 interim: …` with `25 matches in 18 files; over budget:` and `…/disposal/batches/[id]/page.tsx: 2 > 0`.

- [ ] **Step 4: Add `normalizeDisposalBatchReturnTo` (`src/lib/operational-return-navigation.ts`, LF)**

Replace `:26-30`:

```ts
export function normalizeAuditRoundWorkflowReturnTo(locale: string, roundId: string, value: ReturnToParam) {
  const fallback = `/${locale}/audit/rounds/${roundId}`
  const scanPath = `/${locale}/audit/rounds/${roundId}/scan`
  return normalizeInternalReturnTo(fallback, value, [scanPath])
}
```

with:

```ts
export function normalizeAuditRoundWorkflowReturnTo(locale: string, roundId: string, value: ReturnToParam) {
  const fallback = `/${locale}/audit/rounds/${roundId}`
  const scanPath = `/${locale}/audit/rounds/${roundId}/scan`
  return normalizeInternalReturnTo(fallback, value, [scanPath])
}

// The back button of a disposal batch page (spec 2B §5.9.2 row 5): the batch history list, with its page and page size,
// when the user came from there; otherwise the disposal queue, as before (a queue URL with its filters stays valid too).
export function normalizeDisposalBatchReturnTo(locale: string, value: ReturnToParam) {
  const fallback = `/${locale}/disposal`
  const batchesPath = `/${locale}/disposal/batches`
  return normalizeInternalReturnTo(fallback, value, [batchesPath])
}
```

- [ ] **Step 5: Move the page onto the primitives (`src/app/[locale]/(dashboard)/disposal/batches/[id]/page.tsx`, LF)**

Three exact replacements. The query (`:19-48`) between (1) and (2) does not change.

(1) Imports, the props type with `searchParams`, and `returnToHref` (`:1-18`).

Replace:

```tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { ArrowLeft, FileText, PackageCheck } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { deriveDisposalBatchStatus } from "@/lib/disposal-batch"
import { DisposalAttachments } from "@/components/disposal/disposal-attachments"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { StatusBadge } from "@/components/ui/status-badge"

export default async function DisposalBatchDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params
  const user = await requirePagePermission(locale, "disposal", "view")
  const canManage = hasPermission(user, "disposal", "create") || hasPermission(user, "disposal", "edit") || hasPermission(user, "disposal", "approve")
  const [t, tCommon] = await Promise.all([getTranslations("disposalPage"), getTranslations("common")])
```

with:

```tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { FileText, PackageCheck } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { formatCount, formatMoney } from "@/lib/display-format"
import { formatDateTime } from "@/lib/utils"
import { deriveDisposalBatchStatus } from "@/lib/disposal-batch"
import { appendOperationalReturnTo, normalizeDisposalBatchReturnTo } from "@/lib/operational-return-navigation"
import { DisposalAttachments } from "@/components/disposal/disposal-attachments"
import { buttonVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { KeyValueList } from "@/components/ui/key-value-list"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { RowActions } from "@/components/ui/row-actions"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"

type DisposalBatchDetailPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function DisposalBatchDetailPage({ params, searchParams }: DisposalBatchDetailPageProps) {
  const { locale, id } = await params
  const rawSearchParams = await searchParams
  const user = await requirePagePermission(locale, "disposal", "view")
  const canManage = hasPermission(user, "disposal", "create") || hasPermission(user, "disposal", "edit") || hasPermission(user, "disposal", "approve")
  const [t, tCommon] = await Promise.all([getTranslations("disposalPage"), getTranslations("common")])
  // Back to the batch history list and its page when the user came from there, else to the disposal queue (spec 2B §5.9.2 row 5).
  const returnToHref = normalizeDisposalBatchReturnTo(locale, rawSearchParams.returnTo)
```

(2) The page JSX (`:49-106`).

Replace:

```tsx
  const batchHref = `/${locale}/disposal/batches/${batch.id}`

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Breadcrumbs items={[{ label: t("title"), href: `/${locale}/disposal` }, { label: batch.batchNo, code: true }]} />
          <h1 className="mt-3 text-2xl font-bold text-foreground">{batch.batchNo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("batchDetailHelp", { count: batch.disposalRequests.length })}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/${locale}/disposal`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium hover:bg-accent"><ArrowLeft className="h-4 w-4" />{tCommon("back")}</Link>
          <StatusBadge label={statusLabel} status={status} />
        </div>
      </div>

      <section className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 xl:grid-cols-5">
        <BatchMetric label={t("batchTotal")} value={batch.disposalRequests.length} />
        <BatchMetric label={t("statuses.pending")} value={counts.pending} />
        <BatchMetric label={t("statuses.approved")} value={counts.approved} />
        <BatchMetric label={t("statuses.disposed")} value={counts.disposed} />
        <BatchMetric label={t("statuses.rejected")} value={counts.rejected} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground"><PackageCheck className="h-5 w-5 text-primary" />{t("batchSharedDetail")}</h2>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <BatchInfo label={t("disposalType")} value={t(`types.${batch.disposalType}`)} />
              <BatchInfo label={t("requestedBy")} value={`${batch.requestedBy.code} - ${batch.requestedBy.fullNameTh}`} />
              <BatchInfo label={t("approver")} value={batch.approver ? `${batch.approver.code} - ${batch.approver.fullNameTh}` : t("centralApprovalQueue")} />
              <BatchInfo label={t("requestDate")} value={formatDateTime(batch.requestDate)} />
              {batch.saleValue != null ? <BatchInfo label={t("saleValue")} value={formatCurrency(Number(batch.saleValue))} /> : null}
              {batch.salvageValue != null ? <BatchInfo label={t("salvageValue")} value={formatCurrency(Number(batch.salvageValue))} /> : null}
            </dl>
            <div className="mt-5 border-t border-border pt-4"><BatchInfo label={t("reason")} value={batch.reason} /></div>
          </section>

          <section className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="border-b border-border px-4 py-3"><h2 className="text-base font-semibold text-foreground">{t("batchChildren")}</h2></div>
            <div className="divide-y divide-border md:hidden">
              {batch.disposalRequests.map((request) => <BatchRequestCard key={request.id} locale={locale} batchHref={batchHref} request={request} statusLabel={t(`statuses.${request.requestStatus}`)} openLabel={t("openRequest")} />)}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">{t("disposalNo")}</th><th className="px-4 py-3">{t("asset")}</th><th className="px-4 py-3">{t("currentLocation")}</th><th className="px-4 py-3">{tCommon("status")}</th><th className="sticky right-0 bg-muted/50 px-4 py-3 text-right">{t("nextAction")}</th></tr></thead>
                <tbody className="divide-y divide-border">{batch.disposalRequests.map((request) => <tr key={request.id}><td className="px-4 py-3 font-medium">{request.disposalNo}</td><td className="px-4 py-3"><div>{request.asset.assetTag}</div><div className="text-xs text-muted-foreground">{request.asset.name}</div></td><td className="px-4 py-3">{request.asset.currentLocation.name}</td><td className="px-4 py-3"><StatusBadge label={t(`statuses.${request.requestStatus}`)} status={request.requestStatus} /></td><td className="sticky right-0 bg-surface px-4 py-3 text-right"><RequestLink locale={locale} requestId={request.id} returnTo={batchHref} label={t("openRequest")} /></td></tr>)}</tbody>
              </table>
            </div>
          </section>
        </div>

        <aside><DisposalAttachments requestId={batch.id} attachments={attachments} canManage={canManage} uploadEndpoint={`/api/disposal-batches/${batch.id}/attachments`} title={t("batchSharedEvidence")} /></aside>
      </div>
    </div>
  )
}
```

with:

```tsx
  const batchHref = `/${locale}/disposal/batches/${batch.id}`

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: t("title"), href: `/${locale}/disposal` }, { label: batch.batchNo, code: true }]}
        title={<span className="tag font-medium">{batch.batchNo}</span>}
        meta={
          <>
            <StatusBadge label={statusLabel} status={status} />
            <span>{t("batchDetailHelp", { count: batch.disposalRequests.length })}</span>
          </>
        }
        back={<PageBackLink href={returnToHref} label={tCommon("back")} />}
      />

      <StatStrip
        items={[
          { key: "total", label: t("batchTotal"), value: formatCount(batch.disposalRequests.length) },
          { key: "pending", label: t("statuses.pending"), value: formatCount(counts.pending) },
          { key: "approved", label: t("statuses.approved"), value: formatCount(counts.approved) },
          { key: "disposed", label: t("statuses.disposed"), value: formatCount(counts.disposed) },
          { key: "rejected", label: t("statuses.rejected"), value: formatCount(counts.rejected) },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-surface p-4 sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground"><PackageCheck className="h-5 w-5 text-primary" />{t("batchSharedDetail")}</h2>
            <KeyValueList
              className="mt-5"
              items={[
                { key: "disposalType", label: t("disposalType"), value: t(`types.${batch.disposalType}`) },
                { key: "requestedBy", label: t("requestedBy"), value: <><span className="tag">{batch.requestedBy.code}</span> - {batch.requestedBy.fullNameTh}</> },
                { key: "approver", label: t("approver"), value: batch.approver ? <><span className="tag">{batch.approver.code}</span> - {batch.approver.fullNameTh}</> : t("centralApprovalQueue") },
                { key: "requestDate", label: t("requestDate"), value: formatDateTime(batch.requestDate) },
                ...(batch.saleValue != null ? [{ key: "saleValue", label: t("saleValue"), value: <span className="num">{formatMoney(Number(batch.saleValue), { unit: tCommon("baht") })}</span> }] : []),
                ...(batch.salvageValue != null ? [{ key: "salvageValue", label: t("salvageValue"), value: <span className="num">{formatMoney(Number(batch.salvageValue), { unit: tCommon("baht") })}</span> }] : []),
                { key: "reason", label: t("reason"), value: <span className="whitespace-pre-wrap">{batch.reason}</span> },
              ]}
            />
          </section>

          <section className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="border-b border-border px-4 py-3"><h2 className="text-base font-semibold text-foreground">{t("batchChildren")}</h2></div>
            <div className="divide-y divide-border md:hidden">
              {batch.disposalRequests.length === 0 ? <EmptyNote padded>{tCommon("noData")}</EmptyNote> : batch.disposalRequests.map((request) => <BatchRequestCard key={request.id} href={appendOperationalReturnTo(`/${locale}/disposal/${request.id}`, batchHref)} request={request} statusLabel={t(`statuses.${request.requestStatus}`)} openLabel={t("openRequest")} />)}
            </div>
            <DataTable framed={false} className="hidden md:block" caption={t("batchChildren")} scrollHint={tCommon("tableScrollHint")}>
              <DataTableHeader>
                <tr>
                  <DataTableHead>{t("disposalNo")}</DataTableHead>
                  <DataTableHead>{t("asset")}</DataTableHead>
                  <DataTableHead>{t("currentLocation")}</DataTableHead>
                  <DataTableHead>{tCommon("status")}</DataTableHead>
                  <DataTableHead align="right" sticky="right" hideLabel>{t("nextAction")}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {batch.disposalRequests.length === 0 ? (
                  <TableEmptyRow colSpan={5}>{tCommon("noData")}</TableEmptyRow>
                ) : batch.disposalRequests.map((request) => {
                  const requestHref = appendOperationalReturnTo(`/${locale}/disposal/${request.id}`, batchHref)
                  return (
                    <ClickableTableRow key={request.id} href={requestHref} label={`${t("openRequest")}: ${request.disposalNo}`}>
                      <DataTableCell className="whitespace-nowrap"><span className="tag font-medium text-foreground">{request.disposalNo}</span></DataTableCell>
                      <DataTableCell>
                        <div className="text-foreground"><span className="tag">{request.asset.assetTag}</span></div>
                        <div className="text-xs text-muted-foreground">{request.asset.name}</div>
                      </DataTableCell>
                      <DataTableCell className="text-muted-foreground">{request.asset.currentLocation.name}</DataTableCell>
                      <DataTableCell><StatusBadge label={t(`statuses.${request.requestStatus}`)} status={request.requestStatus} /></DataTableCell>
                      <DataTableCell align="right" sticky="right">
                        <RowActions
                          code={request.disposalNo}
                          menuLabel={tCommon("moreActionsFor", { code: request.disposalNo })}
                          next={{ label: t("openRequest"), href: requestHref, icon: <FileText aria-hidden="true" /> }}
                          groups={[]}
                        />
                      </DataTableCell>
                    </ClickableTableRow>
                  )
                })}
              </DataTableBody>
            </DataTable>
          </section>
        </div>

        <aside><DisposalAttachments requestId={batch.id} attachments={attachments} canManage={canManage} uploadEndpoint={`/api/disposal-batches/${batch.id}/attachments`} title={t("batchSharedEvidence")} /></aside>
      </div>
    </div>
  )
}
```

(3) The helpers (`:108-111`): `BatchMetric`, `BatchInfo` and `RequestLink` go; `BatchRequestCard` takes the request href and shows its link as a button.

Replace:

```tsx
function BatchMetric({ label, value }: { label: string; value: number }) { return <div className="bg-surface px-4 py-4"><div className="text-xs font-medium text-muted-foreground">{label}</div><div className="mt-1 text-2xl font-semibold text-foreground">{value}</div></div> }
function BatchInfo({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-medium text-muted-foreground">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm font-medium text-foreground">{value}</dd></div> }
function RequestLink({ locale, requestId, returnTo, label }: { locale: string; requestId: string; returnTo: string; label: string }) { return <Link href={`/${locale}/disposal/${requestId}?returnTo=${encodeURIComponent(returnTo)}`} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border px-3 font-medium hover:bg-accent"><FileText className="h-4 w-4" />{label}</Link> }
function BatchRequestCard({ locale, batchHref, request, statusLabel, openLabel }: { locale: string; batchHref: string; request: { id: string; disposalNo: string; requestStatus: string; asset: { assetTag: string; name: string; currentLocation: { name: string }; custodian: { fullNameTh: string } | null } }; statusLabel: string; openLabel: string }) { return <article className="p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-semibold text-foreground">{request.disposalNo}</div><div className="mt-1 text-sm text-foreground">{request.asset.assetTag} · {request.asset.name}</div></div><StatusBadge label={statusLabel} status={request.requestStatus} /></div><div className="mt-2 text-xs text-muted-foreground">{request.asset.currentLocation.name}{request.asset.custodian ? ` · ${request.asset.custodian.fullNameTh}` : ""}</div><div className="mt-3"><RequestLink locale={locale} requestId={request.id} returnTo={batchHref} label={openLabel} /></div></article> }
```

with:

```tsx
function BatchRequestCard({ href, request, statusLabel, openLabel }: { href: string; request: { id: string; disposalNo: string; requestStatus: string; asset: { assetTag: string; name: string; currentLocation: { name: string }; custodian: { fullNameTh: string } | null } }; statusLabel: string; openLabel: string }) {
  return (
    <article className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-foreground"><span className="tag font-medium">{request.disposalNo}</span></div>
          <div className="mt-1 text-sm text-foreground"><span className="tag">{request.asset.assetTag}</span> · {request.asset.name}</div>
        </div>
        <StatusBadge label={statusLabel} status={request.requestStatus} />
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{request.asset.currentLocation.name}{request.asset.custodian ? ` · ${request.asset.custodian.fullNameTh}` : ""}</div>
      <div className="mt-3">
        <Link href={href} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <FileText aria-hidden="true" />
          {openLabel}
        </Link>
      </div>
    </article>
  )
}
```

Check: `grep -nE '"-"|formatCurrency|ArrowLeft|bg-muted/|<h1|<table|<thead|<th |<td |pb-24|function (BatchMetric|BatchInfo|RequestLink)' "src/app/[locale]/(dashboard)/disposal/batches/[id]/page.tsx"` prints nothing (exit 1).

- [ ] **Step 6: Run the tests for this task**

Run: `node --test tests/operational-return-navigation.test.ts tests/list-pages-ui.test.ts tests/breadcrumbs-ui.test.ts tests/disposal-batch.test.ts tests/mobile-field-navigation.test.ts tests/disposal-route-structure.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `tests 131 · pass 131 · fail 0` (operational-return-navigation 8, list-pages-ui 12, breadcrumbs-ui 4, disposal-batch 12, mobile-field-navigation 7, disposal-route-structure 18, list-frame-guards 21, visual-foundation-guards 26, form-migration-guards 23).

Run: `node <temp>/p2b1-precheck.mjs --file "D/disposal/batches/[id]/page.tsx"` then `node <temp>/p2b1-precheck.mjs --budgets`
Expected: `· in MIGRATED_LIST_FILES` and `args    (no row holds this file)`; then exit 0 with `R7 TABLE_HEADER_FILLS 23 in 17 rows`, `LH1 BUDGETS.LH1 31 in 31 rows`, `LB1 BUDGETS.LB1 12 in 12 rows · live 10 in 10 files … slack 2`, `LP1 BUDGETS.LP1 7 in 7 rows`, `LV3 BUDGETS.LV3 38 in 11 rows`, `LS1 BUDGETS.LS1 22 in 19 rows`, `LK1 BUDGETS.LK1 10 in 10 rows` and `budgets hold: no live count is over its row`.

- [ ] **Step 7: Prove every class compiles**

Run: `node <temp>/p2b2-tw-probe.mjs "src/app/[locale]/(dashboard)/disposal/batches/[id]/page.tsx"`
Expected: `checked 43 classes, missing 0`. No class is new to `src`.

- [ ] **Step 8: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` `tests 1903 · pass 1902 · fail 0 · skipped 1` (3 more: 2 in `operational-return-navigation`, 1 in `list-pages-ui`); tsc no errors; lint 0 errors and the 146 warnings under `.agents/` (`npx eslint "src/app/[locale]/(dashboard)/disposal/batches/[id]/page.tsx" src/lib/operational-return-navigation.ts tests/operational-return-navigation.test.ts tests/list-pages-ui.test.ts` prints nothing).

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 6 files: the page 112 insertions and 43 deletions, `src/lib/operational-return-navigation.ts` 8 insertions, `tests/list-frame-guards.test.ts` 1 and 6, `tests/list-pages-ui.test.ts` 16 insertions, `tests/operational-return-navigation.test.ts` 24 insertions, `tests/visual-foundation-guards.test.ts` 1 deletion. The page and the helper stay LF (`0 180` and `0 57`), the return test CRLF (`122 122`).

- [ ] **Step 9: Commit**

```bash
git add "src/app/[locale]/(dashboard)/disposal/batches/[id]/page.tsx" src/lib/operational-return-navigation.ts tests/operational-return-navigation.test.ts tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): disposal batch page on PageHeader, StatStrip, KeyValueList and DataTable; back keeps the list page (2B-2 task 5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 6 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 18, spec §8.6 row `/th/disposal/batches/<id>`):** at 1440 and 375: open a batch from page 2 of the batch history (Task 4) and "กลับ" lands on page 2 with the same page size; open it from a queue row's batch link and "กลับ" lands on `/th/disposal`; edit `returnTo` to another path (`?returnTo=%2Fth%2Fadmin`) and "กลับ" still goes to `/th/disposal`; the h1 is the code in monospace and the status badge shows on phones; the strip is 2 × 2 + 1 below 1024; the details list stacks below 640; money reads "… บาท"; rows open their request (with `returnTo` to this batch, which the request page drops, I22); at 375 nothing hides behind the bottom navigation and there is no extra band above it.

---

### Task 6: `c/audit/audit-findings-batch-actions.tsx` · the list part on `Button`, `busy` and the shared checkbox (R-c)

Spec §10.3 "plan ถัดไป" row 2B-2 ("ส่วนรายการของไฟล์ร่วม 3 ไฟล์ (checkbox, ปุ่ม toolbar, `busy`) ไม่แตะ dialog"), §8.6 row 8 and the FMG table under it, §8.11 row 3, §5.1 rows "ปุ่มระดับหน้า" and "`Loader2` ในปุ่ม", rulings R-b, R-c and controller ruling (h). One file, one commit. The file is CRLF and a 2C batch 3 file (`BATCH_FILES["3"]` in FMG): edit it by exact string, never run a formatter, never rename it. 2C plan 3 edits its dialog after this plan.

Rulings this task applies:
- **R-c:** "อนุมัติที่เลือก" (`:86`, `bg-success`) becomes `Button` `default` (the primary color; there is no `success` variant, and green lives only in status badges, DESIGN.md "The Where Color Lives Rule"). "ปฏิเสธที่เลือก" (`:95`, solid `bg-danger`) becomes `danger` (white with red text and border: "a destructive action placed in a page"; the solid `destructive` is only the confirm button of a dialog). "เลือกทั้งหมด" becomes `outline`.
- **§5.1, R-b:** the three buttons were `min-h-11 … sm:h-9` and become `size="md"` (36px from `md`, 44px below). Their row switches at `md` like the buttons (`sm:flex-row sm:flex-wrap` → `md:`): below 768px they stack full width, as they did below 640px.
- **§5.1 "`Loader2` ในปุ่ม", GB4:** the two hand-written spinners (`:88`, `:97`) become `busy={reviewing === "approve"}` / `busy={reviewing === "reject"}`. The file is `"use client"`. `disabled` keeps every gate except the busy one: `reviewing !== null` becomes "the other decision is running" (`reviewing === "reject"` on approve, `reviewing === "approve"` on reject), so `disabled` never repeats the `busy` expression (DESIGN.md Buttons "Busy"). `selectedCount === 0` and `reviewDialogAction !== null` stay. The leading `Check` / `X` icons stay; `busy` puts the spinner in their place.
- **§8.6 row 8, O5:** the list checkbox (`:113`, `h-4 w-4 rounded border-border …`) becomes `cn(checkboxVariants(), "mt-0.5")`, the 16px native checkbox of 2A (accent color, base focus ring), as in `bulk-move-form.tsx` and `asset-form.tsx`. Its `<label>` row keeps the 44px hit area (`p-3` around a 20px line).
- **§8.11 row 3, ruling (h):** the `<ConfirmTextDialog …>` block (`:124-138`) and the logic above `return` do not change. The panel keeps its frame, heading and `mb-4`: on the findings page (Task 8) `mb-4` beats the page root's `space-y-6`, so the panel sits 16px above the rows it acts on, like the search toolbar above its table.
- **FMG (never edited, ruling (h)):** the rows of this file are ceilings, so they pass with fewer sites: GF7 `OLD_MARKUP` budget 1 → live 0 (the checkbox), GB1 `LOADER2` budget 2 → live 0 (the spinners). 2C plan 3 lowers them when it takes the file (spec §8.6 table "สถานะไฟล์ร่วม").
- **LFG (ruling (e)):** the file has no LFG or R7 row; 2B does not touch it again, so it joins `MIGRATED_LIST_FILES` (`p2b-budget.mjs … --migrated` with no row to lower). L0 then holds every count of the file at 0.
- **Tests (ruling (j)):** the "has" check of the panel goes into `tests/list-pages-ui.test.ts`, appended at the end of the file with its own constant, so it does not depend on what Tasks 3–5 appended.
- **Scripts:** Task 0 copies only `p2b1-precheck.mjs` and `p2b-budget.mjs`. Task 1 Step 1 saved `p2b2-append.mjs` (appends a block in the target's own line endings: `tests/list-pages-ui.test.ts` is CRLF in the working tree now, so plan 2B-1's `p2b1-append.mjs` refuses it) and `p2b2-tw-probe.mjs` (the 2B-1 Tailwind probe under a 2B-2 name). This task and Tasks 7 and 8 reuse both and save no copy of their own (one name, one text).

What users will see on `/th/audit/findings` (users with `audit:approve`, rows "รอพิจารณา" they did not report):
- "อนุมัติที่เลือก" is blue (the primary color) instead of green; "ปฏิเสธที่เลือก" is white with a red border and red text instead of solid red; "เลือกทั้งหมด" is the outline button. All three are 36px tall from 768px and 44px below; below 768px they stack full width (before: below 640px).
- While a decision saves, its button shows the spinner in place of its icon and keeps its label.
- The checkboxes are the shared 16px checkbox (system accent color, the shared focus ring).

Not in this task:
- `ConfirmTextDialog` and the review logic (2C plan 3) · the `<section>` frame, heading and help text · `messages/` (no key changes) · the findings page (Task 8 passes the `key`)
- `tests/form-migration-guards.test.ts` (never edited) · docs (Task 19). Do not run a formatter.

**Files:**
- Modify: `src/components/audit/audit-findings-batch-actions.tsx` (`i/lf w/crlf`; 3 exact replacements)
- Modify: `tests/list-pages-ui.test.ts` (`i/lf w/crlf`; one block appended with `p2b2-append.mjs`)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only, never committed: `t06-pages-block.ts` (the task runs Task 1's `p2b2-append.mjs` and `p2b2-tw-probe.mjs`)

**Must keep passing without edits:**
- `tests/form-migration-guards.test.ts` (23 tests: GF7 and GB1 rows of this file are ceilings; GB4 reads `busy=` against `disabled=`; GD3/GD4 do not see this file's dialog change because there is none)
- `tests/confirm-text-dialog-ui.test.ts` (`:15-23`: `ConfirmTextDialog` in this file, no `window.prompt`)
- `tests/visual-foundation-guards.test.ts`, `tests/list-frame-guards.test.ts` (every other row), `tests/dialog-trigger-handles.test.ts`, `tests/design-tokens-contrast.test.ts`

**Interfaces:**
- Consumes:
  - `Button` from `@/components/ui/button`: `React.ComponentProps<"button">` + `variant?: "default" | "outline" | "ghost" | "danger" | "destructive" | "warning"` + `size?: "sm" | "md" | "lg" | "default" | "icon-sm" | "icon"` + `busy?: boolean` (not with `asChild`); `type` defaults to `"button"`; `busy` sets `aria-busy` and `aria-disabled`, swaps the leading icon for a spinner and ignores clicks.
  - `checkboxVariants({ size?: "md" | "lg" })` from `@/components/ui/field-variants` (LF file, unchanged) and `cn` from `@/lib/utils`.
  - `node <temp>/p2b1-precheck.mjs --file …`, `node <temp>/p2b-budget.mjs …` (Task 0).
  - `node <temp>/p2b2-append.mjs <block file> <test file>` and `node <temp>/p2b2-tw-probe.mjs <file> …` (Task 1 Step 1).
- Produces:
  - `AuditFindingsBatchActions({ findings }: { findings: BatchFinding[] })` with `BatchFinding = { id: string; label: string; detail: string }`: the API does not change (Task 8 only adds a React `key`).
  - LFG: `src/components/audit/audit-findings-batch-actions.tsx` in `MIGRATED_LIST_FILES`, no `BUDGETS` row. Guard totals do not move (see the table).

| guard | `c/audit/audit-findings-batch-actions.tsx` before → after | plan totals after this task |
|---|---|---|
| LFG / VFG | no row → no row · joins `MIGRATED_LIST_FILES` | unchanged from Task 5 (R7 23 · LH1 31 · LH2 11 · LT3 7 · LV2 112 · LS1 22 · LK1 10 · LN1 10 …) |
| FMG (not edited) | GF7 1 → live 0 · GB1 2 → live 0 | — |

- [ ] **Step 1: Check what this task builds on (and the two helper scripts of Task 1)**

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2b-plan2`

Run: `git status --short src tests messages` then `git diff --quiet e3f20ce -- src/components/audit/audit-findings-batch-actions.tsx && echo FILE-AT-BASE`
Expected: `git status` prints nothing; then `FILE-AT-BASE` (the file is as it was at `e3f20ce`, so the old snippets of Step 4 match). If it does not print, stop and report.

Run: `git ls-files --eol src/components/audit/audit-findings-batch-actions.tsx tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf w/crlf` for all three. Keep them CRLF.

Run: `node <temp>/p2b1-precheck.mjs --file c/audit/audit-findings-batch-actions.tsx`
Expected (after the `info`/`ok` header lines; exit 0):
```
file    src/components/audit/audit-findings-batch-actions.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
args    (no row holds this file)
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `ls <temp>/p2b2-append.mjs <temp>/p2b2-tw-probe.mjs`
Expected: both files are there: Task 1 Step 1 saved them. Do not save another copy under either name; if one is missing, save it from Task 1 Step 1 without changing a byte.

Run: `node <temp>/p2b2-tw-probe.mjs src/components/audit/audit-findings-batch-actions.tsx`
Expected: `checked 60 classes, missing 0` (the file at `e3f20ce`).

- [ ] **Step 2: Write the failing test**

Save this block as `<temp>/t06-pages-block.ts`:

```ts
// Plan 2B-2 Tasks 6–8 (spec 2B §5.4 row "audit/findings", §8.6 rows 7–9): the findings list, its batch panel and its
// row triggers. The panel and the triggers are 2C files, so only their list part is checked; their dialogs stay with 2C.
const FINDINGS_BATCH = `${C}audit/audit-findings-batch-actions.tsx`

test("the findings batch panel: shared checkboxes, Button with busy, approve in the primary color and reject as danger (spec 2B R-c, §8.6 row 8)", () => {
  const source = read(FINDINGS_BATCH)
  assert.match(source, /className=\{cn\(checkboxVariants\(\), "mt-0\.5"\)\}/)
  assert.match(source, /<div className="flex min-w-0 flex-col gap-2 md:flex-row md:flex-wrap">\n\s+<Button variant="outline" size="md" onClick=\{toggleAll\}>/)
  assert.match(source, /<Button\n\s+size="md"\n\s+onClick=\{\(\) => openReviewDialog\("approve"\)\}\n\s+busy=\{reviewing === "approve"\}\n\s+disabled=\{selectedCount === 0 \|\| reviewing === "reject" \|\| reviewDialogAction !== null\}\n\s+>/)
  assert.match(source, /<Button\n\s+variant="danger"\n\s+size="md"\n\s+onClick=\{\(\) => openReviewDialog\("reject"\)\}\n\s+busy=\{reviewing === "reject"\}\n\s+disabled=\{selectedCount === 0 \|\| reviewing === "approve" \|\| reviewDialogAction !== null\}\n\s+>/)
  assert.doesNotMatch(source, /<button\b|<Loader2\b|\bbg-success\b|\bbg-danger\b|opacity-50|h-4 w-4 rounded/, "no hand-written button, spinner, green fill or old checkbox is left")
  assert.match(source, /<ConfirmTextDialog\n/, "the confirm dialog stays as it is (2C plan 3)")
})
```

Run: `node <temp>/p2b2-append.mjs <temp>/t06-pages-block.ts tests/list-pages-ui.test.ts`
Expected: `appended <temp>/t06-pages-block.ts to tests/list-pages-ui.test.ts (CRLF)`

Run: `node --test tests/list-pages-ui.test.ts`
Expected: FAIL, `fail 1`, every earlier test passing (the count is 1 more than before this step): `the findings batch panel: shared checkboxes, Button with busy, approve in the primary color and reject as danger (spec 2B R-c, §8.6 row 8)` with `The input did not match the regular expression /className=\{cn\(checkboxVariants\(\), "mt-0\.5"\)\}/` (the file still has the hand-written checkbox).

- [ ] **Step 3: Mark the file done in LFG**

The file has no row to lower; it only joins `MIGRATED_LIST_FILES`.

Run: `node <temp>/p2b-budget.mjs c/audit/audit-findings-batch-actions.tsx --migrated`
Expected (exit 0):
```
MIGRATED_LIST_FILES: added
written: src/components/audit/audit-findings-batch-actions.tsx
```

Run: `node --test tests/list-frame-guards.test.ts`
Expected: PASS, `tests 21 · pass 21 · fail 0` (L0 holds: every count of the file is 0 = `KEEP`).

- [ ] **Step 4: Move the list part onto the shared parts (`src/components/audit/audit-findings-batch-actions.tsx`, CRLF)**

Three exact replacements, top to bottom.

(1) Imports (`:3-9`). `Loader2` goes; `Button`, `checkboxVariants` and `cn` come in.

Replace:

```tsx
import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Check, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { ConfirmTextDialog } from "@/components/ui/confirm-text-dialog"
import { useApiError } from "@/components/ui/use-api-error"
```

with:

```tsx
import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Check, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ConfirmTextDialog } from "@/components/ui/confirm-text-dialog"
import { checkboxVariants } from "@/components/ui/field-variants"
import { useApiError } from "@/components/ui/use-api-error"
import { cn } from "@/lib/utils"
```

(2) The toolbar buttons (`:74-100`).

Replace:

```tsx
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={toggleAll}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-9 sm:min-h-0 sm:w-auto"
          >
            {t("selectAllPending")}
          </button>
          <button
            type="button"
            onClick={() => openReviewDialog("approve")}
            disabled={selectedCount === 0 || reviewing !== null || reviewDialogAction !== null}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-success px-3 text-sm font-medium text-white transition-colors hover:bg-success-hover disabled:opacity-50 sm:h-9 sm:min-h-0 sm:w-auto"
          >
            {reviewing === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {t("approveSelected")}
          </button>
          <button
            type="button"
            onClick={() => openReviewDialog("reject")}
            disabled={selectedCount === 0 || reviewing !== null || reviewDialogAction !== null}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-danger px-3 text-sm font-medium text-white transition-colors hover:bg-danger-hover disabled:opacity-50 sm:h-9 sm:min-h-0 sm:w-auto"
          >
            {reviewing === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            {t("rejectSelected")}
          </button>
        </div>
```

with:

```tsx
        <div className="flex min-w-0 flex-col gap-2 md:flex-row md:flex-wrap">
          <Button variant="outline" size="md" onClick={toggleAll}>
            {t("selectAllPending")}
          </Button>
          <Button
            size="md"
            onClick={() => openReviewDialog("approve")}
            busy={reviewing === "approve"}
            disabled={selectedCount === 0 || reviewing === "reject" || reviewDialogAction !== null}
          >
            <Check aria-hidden="true" />
            {t("approveSelected")}
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={() => openReviewDialog("reject")}
            busy={reviewing === "reject"}
            disabled={selectedCount === 0 || reviewing === "approve" || reviewDialogAction !== null}
          >
            <X aria-hidden="true" />
            {t("rejectSelected")}
          </Button>
        </div>
```

(3) The list checkbox (`:113`).

Replace:

```tsx
                className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-ring"
```

with:

```tsx
                className={cn(checkboxVariants(), "mt-0.5")}
```

Check: `grep -n "Loader2\|<button\|bg-success\|opacity-\|rounded border-border" src/components/audit/audit-findings-batch-actions.tsx` prints nothing.

Check: `git diff -U0 -- src/components/audit/audit-findings-batch-actions.tsx | grep "^@@"` lists hunks at old lines 6–113 only: nothing at or after `:124`, where `<ConfirmTextDialog` starts (2C plan 3).

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/confirm-text-dialog-ui.test.ts tests/dialog-trigger-handles.test.ts`
Expected: PASS, `fail 0`: `list-pages-ui` all (1 more than before Step 2) · `list-frame-guards` 21 · `visual-foundation-guards` 26 · `form-migration-guards` 23 · `confirm-text-dialog-ui` 2 · `dialog-trigger-handles` 5.

Run: `node <temp>/p2b1-precheck.mjs --file c/audit/audit-findings-batch-actions.tsx`
Expected: the `file` line ends `· in MIGRATED_LIST_FILES`, no guard row, `args    (no row holds this file)`; exit 0.

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b2-tw-probe.mjs src/components/audit/audit-findings-batch-actions.tsx`
Expected: `checked 39 classes, missing 0` (exit 0). The new ones (`md:flex-row`, `md:flex-wrap`, `mt-0.5`) are used elsewhere in `src` already; the button and checkbox classes come from `buttonVariants` and `checkboxVariants`.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, and 1 more test than before Step 2 (1 skipped as before).
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, no new warning in `src/` or `tests/` (`npx eslint src/components/audit/audit-findings-batch-actions.tsx tests/list-pages-ui.test.ts` prints nothing).

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- 3 files: `src/components/audit/audit-findings-batch-actions.tsx` 21 insertions and 21 deletions, `tests/list-pages-ui.test.ts` 14 insertions, `tests/list-frame-guards.test.ts` 1 insertion. Nothing else.
- `node -e "const s=require('fs').readFileSync(process.argv[1],'utf8');console.log((s.match(/\r\n/g)||[]).length,(s.match(/\n/g)||[]).length)" src/components/audit/audit-findings-batch-actions.tsx` prints `141 141` (CRLF throughout). A file that shows every line changed was normalized: restore its line endings before you commit.

- [ ] **Step 8: Commit**

```bash
git add src/components/audit/audit-findings-batch-actions.tsx tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): findings batch panel on Button, busy and the shared checkbox (2B-2 task 6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the plan 2B-2 dev-app check (Task 18, spec §8.6 row `/th/audit/findings`):** with an approver account and at least two pending findings reported by someone else: "อนุมัติที่เลือก" blue, "ปฏิเสธที่เลือก" red outline, both disabled until a row is ticked; tick two rows → "ปฏิเสธที่เลือก" → the dialog opens → "ยกเลิก": focus back on the button, nothing decided; 768 and 1440: the three buttons in one row at 36px; 375: stacked at 44px; keyboard: Space ticks a checkbox and the focus ring shows.

---

### Task 7: `c/audit/audit-finding-review-actions.tsx` · the row triggers on `Button size="sm"` (O21)

Spec §5.4 row "audit/findings" column "ปุ่มในแถว" ("trigger ของ `AuditFindingReviewActions` (`:106-138`) → `Button size="sm"` (O21) เพราะ dialog ในไฟล์นั้นไม่มี handle"), §8.6 row 9 and the FMG table under it, §8.11 row 12, §5.1 rows "ปุ่มระดับหน้า" and "`Loader2` ในปุ่ม", rulings I21, R-m and controller ruling (h). One file, one commit. The file is CRLF and a 2C batch 1d file that 2C plan 1 already migrated: its three dialogs (`ReviewDecisionModal` `:181-`, `ActionPlanModal`, `CloseFindingModal`) are 2C's (O21) and do not change.

Rulings this task applies:
- **I21, §5.4:** the dialogs have no `open()` handle, so the triggers stay in the row cell (no ⋯). All four row triggers (`:106-145`: approve, reject, action plan, close) become `Button size="sm"`: 32px from `md`, 44px below, 6px corners, 13px text and 16px icons. §8.6 row 9 cites `:113` and `:123`, the spinner lines of approve and reject; the action-plan and close triggers sit in the same row with the same hand-written look, so they move too, or the row would show two button shapes side by side. Nothing at or after `:147` (where the dialogs are mounted) changes.
- **Variants:** approve `outline` with its `Check` icon (green text is gone: green lives only in status badges, R-c; a solid primary button on every pending row would outweigh the page's own actions, and the dialog's confirm button stays `default`), reject `danger` (red text and border, as before), action plan and close `outline` (as before).
- **GB4:** the two spinners become `busy={reviewing === "approve"}` / `busy={reviewing === "reject"}`; `disabled={reviewing !== null}` becomes "the other decision is running", so `disabled` never repeats the busy expression and the busy button keeps focus.
- **The trigger row** switches at `md` like the buttons (`sm:` → `md:` on its `flex-col … flex-row flex-wrap justify-end`). The `reviewBlocked` note (`:101-103`, a warning box) stays: notices are 2D.
- **R-m (ruling of this plan):** the dialogs render in a portal, but React sends their clicks up the component tree, through this `div`, to the `ClickableTableRow` of the findings table, whose `shouldIgnoreClick` only sees the DOM target inside the portal. A click on a dialog's text, padding or scrim can then open the asset page behind it. The trigger row gets `onClick={stopPortalClick}`, the same 3-line guard as `RowActions` (`c/ui/row-actions.tsx`, "React sends the events of the menu and sheet portals up through this component to the row"): a click whose target is outside the `div` stops there. Clicks on the triggers themselves still bubble and are ignored by the row as before. Not in the spec; Task 18 confirms it on the dev app.
- **FMG (never edited):** GB1 `LOADER2` budget 2 → live 0. GF5 `CONSTRAINT_FLOORS` `[1, 3, 0]` counts the dialogs' fields and does not move. GD2/GD3 see the same three `AccessibleDialog`s with their footers.
- **LFG (ruling (e)):** the file's one row is LV2 3 = `KEEP` (the `|| "-"` of the review dialog, 2D). It stays at 3 and the file joins `MIGRATED_LIST_FILES` (`LV2=3:3 --migrated`).

What users will see on `/th/audit/findings` (users with `audit:edit` or `audit:approve`):
- In each row (and phone card): "อนุมัติ" is an outline button with a check icon (before: green text); "ปฏิเสธ" has a red border (before: red text only); "แผนแก้ไข" and "ปิดรายการไม่ตรง" are the outline button. 32px tall from 768px with 6px corners, 44px below; below 768px they stack full width (before: below 640px).
- While a decision saves, its trigger shows the spinner in place of its icon.
- In the desktop table, a click inside an open dialog or on its scrim no longer opens the asset page behind it.

Not in this task:
- the three dialogs, their forms, labels and the `|| "-"` in `ReviewPreviewField` (2C O21 / 2D) · the `reviewBlocked` note (2D)
- the findings page (Task 8) · `messages/` · docs (Task 19). Do not run a formatter.

**Files:**
- Modify: `src/components/audit/audit-finding-review-actions.tsx` (`i/lf w/crlf`; 4 exact replacements)
- Modify: `tests/list-pages-ui.test.ts` (`i/lf w/crlf`; one block appended with `p2b2-append.mjs`)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only: `t07-pages-block.ts`

**Must keep passing without edits:**
- `tests/form-migration-guards.test.ts` (23 tests; GB1 ceiling, GB4, GF5 floors `[1, 3, 0]`, GD2/GD3 on the three dialogs)
- `tests/audit-finding-resolution.test.ts` (`:28-39`: `ReviewDecisionModal`, `reviewConflictTitle`, `confirmConflict`, no `window.prompt`)
- `tests/ui-overlay-guards.test.ts` (`:51-55`: `<AccessibleDialog`, no `function Modal(` or `fixed inset-0`; the other tests: no `createPortal`, no global listeners)
- `tests/visual-foundation-guards.test.ts`, `tests/list-frame-guards.test.ts` (every other row), `tests/dialog-trigger-handles.test.ts`, `tests/design-tokens-contrast.test.ts`

**Interfaces:**
- Consumes: `Button` from `@/components/ui/button` (already imported by the file; props as in Task 6) · `type MouseEvent as ReactMouseEvent` from `react` · the lucide icons `Check`, `X`, `CalendarClock`, `FileUp` (already imported) · `<temp>/p2b2-tw-probe.mjs` and `<temp>/p2b2-append.mjs` (Task 1 Step 1).
- Produces:
  - `AuditFindingReviewActions(props)`: the props do not change (`findingId`, `assetLabel`, `findingTypeLabel`, `expectedValue?`, `actualValue?`, `reviewStatus`, `actionStatus`, `actionPlan?`, `actionOwnerId?`, `actionDueDate?`, `evidenceCount`, `employees`, `reviewBlocked?`, `reviewBlockedReason?`). Task 8 renders it in the row cell and in the phone card as today.
  - LFG: the file in `MIGRATED_LIST_FILES`, its LV2 row 3 (= `KEEP`).

| guard | `c/audit/audit-finding-review-actions.tsx` before → after | plan totals after this task |
|---|---|---|
| LFG | LV2 3 → 3 (`KEEP`: the review dialog) · joins `MIGRATED_LIST_FILES` | unchanged (LV2 112 …) |
| FMG (not edited) | GB1 2 → live 0 | — |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `git diff --quiet e3f20ce -- src/components/audit/audit-finding-review-actions.tsx && echo FILE-AT-BASE`
Expected: `git status` prints nothing; then `FILE-AT-BASE`. If it does not print, stop and report.

Run: `git ls-files --eol src/components/audit/audit-finding-review-actions.tsx tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf w/crlf` for all three.

Run: `ls <temp>/p2b2-tw-probe.mjs <temp>/p2b2-append.mjs`
Expected: both exist (Task 1 Step 1). If not, save them as Task 1 Step 1 says.

Run: `node <temp>/p2b1-precheck.mjs --file c/audit/audit-finding-review-actions.tsx`
Expected (after the header lines; exit 0):
```
file    src/components/audit/audit-finding-review-actions.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LV2        3       3     3     3
args    LV2=3:3
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

- [ ] **Step 2: Write the failing test**

Save this block as `<temp>/t07-pages-block.ts`:

```ts
// Task 7 (spec 2B §5.4 row "audit/findings", §8.6 row 9, O21): the row triggers of a finding. Its three dialogs have no
// open() handle, so the triggers stay in the row cell (I21) and only become Button sm; the dialogs stay with 2C.
const FINDING_REVIEW = `${C}audit/audit-finding-review-actions.tsx`

test("the finding row triggers are Button sm: approve outline, reject danger, busy while the decision saves, no click through to the row; the dialogs stay (spec 2B §5.4, O21)", () => {
  const source = read(FINDING_REVIEW)
  assert.match(source, /<div className="flex min-w-0 flex-col gap-2 md:flex-row md:flex-wrap md:justify-end" onClick=\{stopPortalClick\}>/, "a click inside a dialog portal does not reach the table row and open the asset")
  assert.match(source, /function stopPortalClick\(event: ReactMouseEvent<HTMLDivElement>\) \{\n\s+if \(!event\.currentTarget\.contains\(event\.target as Node\)\) event\.stopPropagation\(\)\n\}/)
  assert.match(source, /<Button\n\s+variant="outline"\n\s+size="sm"\n\s+onClick=\{\(\) => setReviewModalAction\("approve"\)\}\n\s+busy=\{reviewing === "approve"\}\n\s+disabled=\{reviewing === "reject"\}\n\s+title=\{t\("approve"\)\}\n\s+>\n\s+<Check aria-hidden="true" \/>/)
  assert.match(source, /<Button\n\s+variant="danger"\n\s+size="sm"\n\s+onClick=\{\(\) => setReviewModalAction\("reject"\)\}\n\s+busy=\{reviewing === "reject"\}\n\s+disabled=\{reviewing === "approve"\}\n\s+title=\{t\("reject"\)\}\n\s+>\n\s+<X aria-hidden="true" \/>/)
  assert.match(source, /<Button variant="outline" size="sm" onClick=\{\(\) => setPlanOpen\(true\)\}>\n\s+<CalendarClock aria-hidden="true" \/>/)
  assert.match(source, /<Button variant="outline" size="sm" onClick=\{\(\) => setCloseOpen\(true\)\}>\n\s+<FileUp aria-hidden="true" \/>/)
  assert.doesNotMatch(source, /<button\b|<Loader2\b|\btext-success\b|disabled:opacity-50/, "no hand-written trigger, spinner or green text is left")
  assert.equal(source.match(/<AccessibleDialog\b/g)?.length, 3, "the review, action-plan and close dialogs stay as they are (O21)")
})
```

Run: `node <temp>/p2b2-append.mjs <temp>/t07-pages-block.ts tests/list-pages-ui.test.ts`
Expected: `appended <temp>/t07-pages-block.ts to tests/list-pages-ui.test.ts (CRLF)`

Run: `node --test tests/list-pages-ui.test.ts`
Expected: FAIL, `fail 1`, every earlier test passing (1 more test than before this step): `the finding row triggers are Button sm: approve outline, reject danger, busy while the decision saves, no click through to the row; the dialogs stay (spec 2B §5.4, O21)` with the message `a click inside a dialog portal does not reach the table row and open the asset` (the trigger row has no `onClick` yet).

- [ ] **Step 3: Keep the file's row and mark it done**

Run: `node <temp>/p2b-budget.mjs c/audit/audit-finding-review-actions.tsx LV2=3:3 --migrated`
Expected (exit 0):
```
LV2: 3 kept
MIGRATED_LIST_FILES: added
written: src/components/audit/audit-finding-review-actions.tsx
```

Run: `node --test tests/list-frame-guards.test.ts`
Expected: PASS, `tests 21 · pass 21 · fail 0` (L0: LV2 3 ≤ `KEEP` 3).

- [ ] **Step 4: Move the row triggers onto `Button` (`src/components/audit/audit-finding-review-actions.tsx`, CRLF)**

Four exact replacements, top to bottom.

(1) The React import (`:3`).

Replace:

```tsx
import { useState } from "react"
```

with:

```tsx
import { useState, type MouseEvent as ReactMouseEvent } from "react"
```

(2) The icons (`:6`). `Loader2` goes: `busy` draws the spinner.

Replace:

```tsx
import { AlertTriangle, CalendarClock, Check, FileUp, Loader2, X } from "lucide-react"
```

with:

```tsx
import { AlertTriangle, CalendarClock, Check, FileUp, X } from "lucide-react"
```

(3) The portal guard, after `ReviewConflictPayload` (`:30-33`).

Replace:

```tsx
  findingReportedAt?: string
}

export function AuditFindingReviewActions({
```

with:

```tsx
  findingReportedAt?: string
}

// The three dialogs render in a portal, but React still sends their clicks up through this component to the table row
// (ClickableTableRow on the findings page), which would open the asset. Clicks from outside this element stop here.
function stopPortalClick(event: ReactMouseEvent<HTMLDivElement>) {
  if (!event.currentTarget.contains(event.target as Node)) event.stopPropagation()
}

export function AuditFindingReviewActions({
```

(4) The trigger row (`:98-146`). Everything after `) : null}` of the close trigger (the three `…Modal` mounts) stays.

Replace:

```tsx
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
      {reviewStatus === "pending" ? (
        reviewBlocked ? (
          <div className="max-w-56 rounded-md border border-warning-border bg-warning-soft px-2 py-1 text-left text-xs font-medium text-warning">
            {reviewBlockedReason ?? t("segregationReviewBlocked")}
          </div>
        ) : (
        <>
          <button
            type="button"
            onClick={() => setReviewModalAction("approve")}
            disabled={reviewing !== null}
            title={t("approve")}
            className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium text-success transition-colors hover:bg-success-soft disabled:opacity-50 sm:h-8 sm:min-h-0"
          >
            {reviewing === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {t("approve")}
          </button>
          <button
            type="button"
            onClick={() => setReviewModalAction("reject")}
            disabled={reviewing !== null}
            title={t("reject")}
            className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium text-danger transition-colors hover:bg-danger-soft disabled:opacity-50 sm:h-8 sm:min-h-0"
          >
            {reviewing === "reject" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
            {t("reject")}
          </button>
        </>
        )
      ) : null}
      <button
        type="button"
        onClick={() => setPlanOpen(true)}
        className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-border bg-surface px-2 text-xs font-medium transition-colors hover:bg-accent sm:h-8 sm:min-h-0"
      >
        <CalendarClock className="h-3.5 w-3.5" />
        {t("actionPlan")}
      </button>
      {actionStatus !== "closed" ? (
        <button
          type="button"
          onClick={() => setCloseOpen(true)}
          className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-border bg-surface px-2 text-xs font-medium transition-colors hover:bg-accent sm:h-8 sm:min-h-0"
        >
          <FileUp className="h-3.5 w-3.5" />
          {t("closeFinding")}
        </button>
      ) : null}
```

with:

```tsx
    <div className="flex min-w-0 flex-col gap-2 md:flex-row md:flex-wrap md:justify-end" onClick={stopPortalClick}>
      {reviewStatus === "pending" ? (
        reviewBlocked ? (
          <div className="max-w-56 rounded-md border border-warning-border bg-warning-soft px-2 py-1 text-left text-xs font-medium text-warning">
            {reviewBlockedReason ?? t("segregationReviewBlocked")}
          </div>
        ) : (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReviewModalAction("approve")}
            busy={reviewing === "approve"}
            disabled={reviewing === "reject"}
            title={t("approve")}
          >
            <Check aria-hidden="true" />
            {t("approve")}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setReviewModalAction("reject")}
            busy={reviewing === "reject"}
            disabled={reviewing === "approve"}
            title={t("reject")}
          >
            <X aria-hidden="true" />
            {t("reject")}
          </Button>
        </>
        )
      ) : null}
      <Button variant="outline" size="sm" onClick={() => setPlanOpen(true)}>
        <CalendarClock aria-hidden="true" />
        {t("actionPlan")}
      </Button>
      {actionStatus !== "closed" ? (
        <Button variant="outline" size="sm" onClick={() => setCloseOpen(true)}>
          <FileUp aria-hidden="true" />
          {t("closeFinding")}
        </Button>
      ) : null}
```

Check: `grep -n "Loader2\|<button\|text-success\|opacity-" src/components/audit/audit-finding-review-actions.tsx` prints nothing.

Check: `git diff -U0 -- src/components/audit/audit-finding-review-actions.tsx | grep "^@@"` lists hunks at old lines 3–145 only (the last one `@@ -145 +145 @@`): nothing at or after `:147`, where the dialogs are mounted, and nothing in `function ReviewDecisionModal(` or below.

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/ui-overlay-guards.test.ts tests/audit-finding-resolution.test.ts tests/dialog-trigger-handles.test.ts`
Expected: PASS, `fail 0`: `list-pages-ui` all (1 more than before Step 2) · `list-frame-guards` 21 · `visual-foundation-guards` 26 · `form-migration-guards` 23 · `ui-overlay-guards` 12 · `audit-finding-resolution` 7 · `dialog-trigger-handles` 5.

Run: `node <temp>/p2b1-precheck.mjs --file c/audit/audit-finding-review-actions.tsx`
Expected: `· in MIGRATED_LIST_FILES`, the row `LV2        3       3     3     3`, `args    LV2=3:3`; exit 0.

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b2-tw-probe.mjs src/components/audit/audit-finding-review-actions.tsx`
Expected: `checked 50 classes, missing 0` (exit 0). `md:justify-end` is the only class new to this file; it is used elsewhere in `src`.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, and 1 more test than before Step 2 (1 skipped as before).
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, no new warning (`npx eslint src/components/audit/audit-finding-review-actions.tsx tests/list-pages-ui.test.ts` prints nothing).

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- 3 files: `src/components/audit/audit-finding-review-actions.tsx` 29 insertions and 29 deletions, `tests/list-pages-ui.test.ts` 16 insertions, `tests/list-frame-guards.test.ts` 1 insertion.
- The CRLF check (as in Task 6 Step 7) on the component prints `473 473`.

- [ ] **Step 8: Commit**

```bash
git add src/components/audit/audit-finding-review-actions.tsx tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): finding row triggers on Button sm, and no click through a dialog to the row (2B-2 task 7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 2B-2 dev-app check (Task 18):** `/th/audit/findings` at 1440 with a pending finding reported by someone else: the four triggers in one row, 32px; "อนุมัติ" → the decision dialog opens → click on the dialog's text, then on the scrim: the dialog closes and the page stays on the findings list (before: the asset page could open) → open it again → "ยกเลิก": focus back on "อนุมัติ"; "แผนแก้ไข" → its dialog → close without saving. At 375 in the phone card: the triggers stack at 44px.

---

### Task 8: `D/audit/findings/page.tsx` on the list primitives, with real pages (B4), the back link (I2) and chips for the hidden filters (I24)

Spec §10.3 "plan ถัดไป" row 2B-2, §8.6 row 7, §5.4 row "audit/findings", §5.1 (the shared rules of every list), §5.9.1 and §5.9.2 row 3 (B4), §5.9.3 row "findings", §5.10 row 2 (the `Plus` icon on the way back), §4.4.3 row 1 and §4.5.2 row 19 (header and back link), §6.4 (the `MasterDataSearch` hidden inputs), §6.13 "ชิปของ findings", §10.4 table A row 2B-2 (`operational-return-navigation.test.ts:81-83`), rulings I2, I17, I21, I24, B4, R-c, R-d, R-g, R-n, R-p and controller rulings (e), (f), (i), (j). One page, one commit. The page is CRLF: edit it with exact-string replacement only. Read-only queries only: `findMany`, `count` and `findUnique` in `page.tsx`.

Rulings this task applies:
- **I2, §4.4.3 row 1, §5.10 row 2:** `MasterDataHeader` used its create slot as the way back, so "กลับไปรอบตรวจนับ" was a primary button with a `Plus` icon. The page calls `PageHeader` (`title={t("title")}`, `meta={t("subtitle")}`, no actions) with `` back={<PageBackLink href={`/${locale}/audit/rounds`} label={t("backToRounds")} />} ``: outline with a left arrow, a 44px icon below `md`. LH2 drops by 2 (import and call).
- **B4, §5.9.2 row 3:** `parseListPage({ page, pageSize })` (default 25, sizes 25/50/100); `findMany` takes `skip`/`take` from `listPageWindow` and `orderBy: [{ reportedAt: "desc" }, { id: "asc" }]` (the old order plus `id`, so a finding never shows on two pages); `take: 200` goes. The total costs no extra query when the status is one of the four the strip counts (`pending`, `action_open`, `overdue`, `closed`: those counts use the same `buildAuditFindingWhere` arguments as the list); for `approved`, `rejected`, `exception` and `all` one `prisma.auditFinding.count({ where })` runs in the same `Promise.all`. The list's `where` becomes one constant shared by `findMany` and that count. The evidence query and `buildFindingValueLabels` read only the page's rows (they already took `findings`). The exports (`/api/audit-findings/export`, `…/export-pdf`) do not get `page` and still export the whole filtered set (§5.9.3). No index is added (spec §5.9.2: `reportedAt` has none; the risk is low to medium and Task 18 measures the load time).
- **I21, §5.9.1:** a page past the last one redirects to the same URL at `lastListPage` (after the `Promise.all`, outside any `try`; Next.js 16.4 `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md`: `redirect()` throws `NEXT_REDIRECT`, ends the render and answers 307, or a client-side redirect once the page streams). This is what deciding the last finding of the last page leads to.
- **§5.9.1, `returnTo`, I17:** `buildAuditFindingsHref` gets a fifth parameter `listPage: { page?: number; pageSize?: number } = {}` and writes it with `appendListPage` (page only above 1, pageSize only when not 25), so every default link stays as it is today. `auditFindingsReturnHref` (the `returnTo` of the "เปิดคำขอตัดจำหน่าย" links) carries the page and page size (`disposal/new` still drops it today, I22). Filter links (strip cells, tabs, chips) go back to page 1 and keep the page size (`filterHref`); the page links and page-size links use `pageHref`. `MasterDataSearch` gets the page size as a hidden input when it is not 25, after the existing three. The pins `tests/operational-return-navigation.test.ts:81-83` grow by their new part, nothing removed (I17): `, listPage` in the return href, `, page, pageSize` in the `searchParams` line and the `appendListPage` spread in `hiddenInputs`.
- **§5.9.2 row 3, selection:** `<AuditFindingsBatchActions key={selectionKey} …>` with `selectionKey` = page, page size, status, search, round and type (the shape of the disposal page's `selectionKey`). The panel keeps its selection in its own state (`useState`, `c/audit/audit-findings-batch-actions.tsx:25` after Task 6) and never resets it; the key gives every page and filter a fresh panel, so "อนุมัติที่เลือก" can never decide a finding that is not on screen. The panel already says "ในหน้านี้" (`auditFinding.batchReviewHelp`).
- **R-d, §5.4 "แท็บ · ตัวเลขสรุป":** the four `ResolutionMetric` boxes (tone fills and icons) become one `StatStrip` inside a `<section aria-labelledby>` named by its existing `h2` (a `<dl>` takes no label of its own). Each cell is a link to its queue (`href`, `scroll: false`), `current` on the queue in use (`aria-current="page"`, light blue with a 2px line), `value: formatCount(count)` (was `toLocaleString("th-TH")`), the help text as the foot (cut to one line, so `footTitle` repeats it), and `attention` on "รอพิจารณา" and "เกินกำหนด" when their count is above 0 (the old warning and danger tones). The counts still cover the whole filtered list (B4). The cell type stays as the type `ResolutionMetric` (the function goes; `tests/audit-finding-resolution.test.ts:13` reads the name). LS1 −1, LN1 −1.
- **R-g, §5.4:** the eight queue links become `<TabNav aria-label={t("quickFilters")} items={resolutionFilters} current={status} scroll={false} />` (no counts; `scroll={false}` kept). LN1 −1. The export links become `buttonVariants({ variant: "outline", size: "md" })` (36px from `md`, 44 below) with `aria-hidden` icons.
- **The two sections lose their frames.** The `StatStrip` brings its own frame (a frame in a frame, DESIGN.md), and `TabNav` draws its own underline; the section headings and help texts stay. The `StatusBadge` beside "จัดการรายการไม่ตรง" goes: the queue in use is the current tab and the current strip cell (DESIGN.md: a badge marks a record's state).
- **I24, §6.13 "ชิปของ findings":** `roundId` and `findingType` come from drill-down links (round detail, reports) and have no field on the page. Each gets a chip in `FilterChipList` (`label={t("activeFilters")}`, the new key `auditFinding.activeFilters`), under the tabs: "รอบตรวจ: <auditNo>" (the round from `prisma.auditRound.findUnique({ where: { id: roundId }, select: { auditNo: true } })`, read-only, in the same `Promise.all`; the raw id if no round matches) and "ประเภท: <type label>" (`t.has` guards a value with no message: it then shows as it is, glossary rule). A chip's link is the same list without that one filter (page 1, page size kept). `removeLabel` is the existing `asset.clearDrilldownFilter` ("ล้างตัวกรองนี้"), the words of the register's chips (I7), because `auditFinding` has no clear key and ruling (f) fixes the new keys.
- **§5.4 "ว่าง · แบ่งหน้า", §5.1:** the empty row is `TableEmptyRow` with `emptyState` (the same title, help and "กลับไปรอบตรวจนับ" link, now `actionVariant: "secondary"`, an outline button, because the primary color belongs to the page's main action); the phone list's empty state gets the same variant. `Pagination` sits once under both the phone list and the table, in `DataTableFoot`, only while `total > 0` (the frame and the phone list keep the shape of `supplier-list-view.tsx`: `DataTable framed={false} className="hidden md:block"` inside the shared frame).
- **§5.4 columns, I3:** the table is `DataTable` with `caption={t("title")}` and `scrollHint={tCommon("tableScrollHint")}` (13 columns overflow at most desktop widths; the hint shows only while they do). The 13 heads are `DataTableHead`; the actions head is `align="right" hideLabel`. The actions column is not pinned (the 2B-1 Task 25 fix pins master-data rows of one button and ⋯): this cell holds up to four triggers and "เปิดคำขอตัดจำหน่าย", and a pinned column that wide would cover most of the table at 1024–1440.
- **I21, §5.4 "ปุ่มในแถว":** the row commands stay in the cell, no `RowActions`: `AuditFindingReviewActions` opens three dialogs without an `open()` handle (O21). The cell stacks them right-aligned (`flex flex-col items-end gap-2`). "เปิดคำขอตัดจำหน่าย" (`h-8` warning-colored) becomes `buttonVariants({ variant: "outline", size: "sm" })`; in the phone card it and "ดู" become `buttonVariants({ variant: "outline" })` (44px, full width in the card).
- **R-n, R-p, §5.4 "ตัวเลข · ค่าว่าง · รหัส":** the 7 typed dashes go (LV2 7 → 0): `formatReconcileStatus` returns `orNil(status)` (the call in the table keeps its literal, `tests/audit-item-status-labels.test.ts:54`), the empty asset is `<Nil />`, the empty action owner `<Nil label={t("noActionOwner")} />` ("ยังไม่ระบุผู้รับผิดชอบ"), `FindingComparison` uses `orNil(…)`, and the local `Info` of the phone card becomes one `KeyValueList` (round, type, owner, due date) above the comparison and the evidence (LK1 −1). The 8th dash (`:486`, the cell of a user without edit or approve, which LV2's regex does not count) becomes `<Nil />` too; so does an empty due date (`formatDateTime(null)` returns `"-"` from `src/lib`, which R-n keeps). The round code is `<span className="tag">` inside its link (and in the card). `assetLabel` stays one string (R-p: codes inside a string stay text in 2B).
- **LFG and VFG (I15, ruling (e)):** every row of the page goes to 0 (R7 1 · LH2 2 · LT3 1 · LV2 7 · LS1 1 · LK1 1 · LN1 2) and the page joins `MIGRATED_LIST_FILES`: no later 2B plan lists it (spec §8.7–8.9). The budgets are lowered before the page changes, so the guards fail first.
- **Tests (rulings (i), (j)):** two "has" tests appended to `tests/list-pages-ui.test.ts` (`<PageHeader` with `PageBackLink`, `<StatStrip`, `<TabNav`, `<FilterChipList`, `<DataTable`, `<TableEmptyRow`, `<Pagination`, `parseListPage`, the in-place count, the redirect past the last page, the selection key). The page is not added to `B4_LISTS`: that test wants `findMany` and `count({ where })` as the only two calls of one `Promise.all`, and this list counts conditionally beside six other reads, so it has its own B4 test. The pins of spec §10.4 table A row 2B-2 that this commit breaks are `tests/operational-return-navigation.test.ts:81-83` only (that file reads the page with `\r`, so the new regexes have no `\n`).

What users will see on `/th/audit/findings`:
- The way back to the rounds is an outline button with a left arrow (before: a blue button with a plus); on phones a 44px arrow icon. The title is weight 600.
- The four number boxes become one flat strip: no colored fills or icons; "รอพิจารณา" or "เกินกำหนด" above 0 gets a warning foot line with its icon; the box of the queue in use is light blue with a line under it. Two columns below 1024px. The badge beside "จัดการรายการไม่ตรง" is gone.
- The eight queue links are underline tabs (44px on phones) that keep the scroll position; the export buttons are the outline buttons (36px from 768px).
- Opened from a round or a report, the page shows chips "รอบตรวจ: …" and "ประเภท: …" under the tabs; each removes only its own filter.
- The table: white header 13/500 without capitals, rows about 46px, the round code in monospace, "—" for empty values, the row buttons from Task 7, "เปิดคำขอตัดจำหน่าย" as an outline button (before: orange). The table scrolls sideways with a hint line when it does not fit.
- Pages: 25 findings per page by default, "1–25 จาก N รายการ · หน้า 1 จาก M", 25/50/100 and words-only "ก่อนหน้า"/"ถัดไป". Before, the page showed the first 200 and said nothing. N equals the number in the strip cell of the queue in use. A page number past the end opens the last page. "กลับ" from a disposal request still goes to `/disposal` (I22).
- "อนุมัติที่เลือก" decides only the findings of the page on screen, and moving to another page or queue clears the ticks.
- Phone cards: round, type, owner and due date as a label and value list; "ดู" and "เปิดคำขอตัดจำหน่าย" are 44px outline buttons.
- No finding: the same message, and "กลับไปรอบตรวจนับ" is an outline button.

Not in this task:
- `buildAuditFindingWhere`, `resolveFindingState`, the export routes, `AuditFindingEvidenceList`, `ResolutionStateBadge` and the badge helpers (unchanged) · `DataFreshnessBanner` (its own file, `mb-3`)
- the disposal create page dropping `returnTo` (I22, phase 3) · `c/audit/*` (Tasks 6 and 7) · `MasterDataSearch` (2B-1 Task 12)
- docs (Task 19) · `tests/form-migration-guards.test.ts`. Do not run a formatter.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/audit/findings/page.tsx` (`i/lf w/crlf`; 13 exact replacements)
- Modify: `messages/th.json`, `messages/en.json` (`i/lf w/crlf`; through `node scripts/messages-edit.mjs` only: 1 key)
- Modify: `tests/list-pages-ui.test.ts` (`i/lf w/crlf`; one block appended with `p2b2-append.mjs`)
- Modify: `tests/operational-return-navigation.test.ts` (`i/lf w/crlf`; 1 exact replacement of `:81-83`)
- Modify: `tests/list-frame-guards.test.ts`, `tests/visual-foundation-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only: `t08-pages-block.ts`, `t08-messages.json`

**Must keep passing without edits:**
- `tests/audit-finding-resolution.test.ts` (`:7-16`: `DataFreshnessBanner`, `resolutionSummaryItems`, `resolutionFilters`, `ResolutionMetric` (now the type), `FindingComparison`, `resolveFindingState`; `:117-131`: `roundId?: string`, `findingType?: string`, the two `exportParams.set` lines)
- `tests/audit-item-status-labels.test.ts` (`:47-55`: `getAuditItemStatusLabelKey(status)`, `getAuditItemReconcileStatusLabelKey(status)`, `{formatAuditItemStatus(finding.auditItem.auditStatus)}`, `{formatReconcileStatus(finding.auditItem.reconcileStatus)}`, no `?? "-"`)
- `tests/audit-mobile-flow-completion.test.ts` (`:39-50`: the evidence attachments)
- `tests/disposal-route-structure.test.ts` (`:40-48`: the `/disposal/new?assetId=…sourceType=audit_finding…sourceId=` link on one line and `appendOperationalReturnTo(`)
- `tests/operational-return-navigation.test.ts` (`:84-85`: the disposal link and `auditFindingsReturnHref)`; `:42`, `:54-74` of the other pages)
- `tests/form-migration-guards.test.ts`, `tests/visual-foundation-guards.test.ts` (every other row), `tests/list-primitives-ui.test.ts`, `tests/clickable-table-row-navigation.test.ts`, `tests/dialog-trigger-handles.test.ts`, `tests/thai-glossary.test.ts`, `tests/messages-parity.test.ts`, `tests/design-tokens-contrast.test.ts`

**Interfaces:**
- Consumes:
  - 2B-1: `PageHeader({ title, meta?, actions?, back?, breadcrumbs?, compactOnMobile?, className? })` and `PageBackLink({ href, label, onClick?, className? })` from `@/components/ui/page-header`; `DataTable({ children, caption?, framed?, layout?, minWidth?, scrollHint?, footer?, …div props })`, `DataTableHeader`, `DataTableBody`, `DataTableHead({ align?, sort?, sticky?, hideLabel?, …th props })`, `DataTableCell({ align?, numeric?, sticky?, …td props })`, `DataTableFoot`, `TableEmptyRow({ colSpan } & ({ children; tone? } | { emptyState: ActionEmptyStateProps }))` from `@/components/ui/data-table`; `Pagination({ page, totalPages, previousHref, nextHref, labels: { navigation, previous, next, pageOf, range?, pageSizeGroup?, rowsPerPage? }, pageSize?, pageSizes?: { value, href }[], className? })` from `@/components/ui/pagination`; `StatStrip({ items, className? })` with `StatStripItem = { key; label; value: string; unit?; foot?; footTitle?; href?; current?; scroll?; attention? }` from `@/components/ui/stat-strip`; `TabNav({ "aria-label", items: { key; label; href; count?; icon? }[], current, scroll?, onSelect?, linkClassName?, className?, …nav props })` from `@/components/ui/tab-nav`; `FilterChipList({ chips, label, removeLabel, clearAll?, className? })` and `type FilterChipItem = { key; label; href; mobileOnly? }` from `@/components/ui/filter-chips`; `KeyValueList({ items, className? })` with `KeyValueItem = { key?; label; value; nilLabel? }` from `@/components/ui/key-value-list`; `LIST_PAGE_SIZES`, `parseListPage({ page?, pageSize? }): { page; pageSize }`, `listPageWindow(state): { skip; take }`, `lastListPage(total, pageSize)`, `appendListPage(params, { page?, pageSize? }): URLSearchParams` from `@/lib/list-pagination`; `paginationRange(page, pageSize, total): { start; end; totalPages }` from `@/lib/master-data-query`; `MasterDataSearch({ action, defaultValue, placeholder, submitLabel, hiddenInputs? })` from `@/components/master-data/master-data-layout`; the keys `common.tableScrollHint`, `showingRange`, `pageSizeLabel`, `pagination`, `pageOf`, `previous`, `next`, `rowsPerPage`, `actions`, `view`, `search`.
  - 2A: `Nil({ label?, className? })` and `orNil(value, label?)` from `@/components/ui/nil`; `formatCount` from `@/lib/display-format`; `buttonVariants({ variant?, size? })` from `@/components/ui/button-variants`; `ActionEmptyState({ icon?, title, description?, actionHref?, actionLabel?, actionVariant?: "primary" | "secondary", … })`; the `tag` utility.
  - Tasks 6 and 7: `AuditFindingsBatchActions({ findings })`, `AuditFindingReviewActions(props)` (unchanged APIs); `<temp>/p2b2-tw-probe.mjs`, `<temp>/p2b2-append.mjs` (Task 1 Step 1).
  - next-intl 4.11: `t.has(key): boolean` on the translator of `getTranslations` (`node_modules/use-intl/dist/types/core/createTranslator.d.ts:41`); Next.js 16.4 `redirect` from `next/navigation` (already used in `D/master-data/*/page.tsx`).
  - Existing keys: `auditFinding.backToRounds`, `quickFilters`, `auditRound`, `findingType`, `type_*`, `noActionOwner`, `emptyTitle`, `emptyHelp`; `asset.clearDrilldownFilter`.
- Produces:
  - `messages/{th,en}.json`: `auditFinding.activeFilters` "ตัวกรองที่ใช้อยู่" / "Active filters" (spec §10.2, ruling (f)).
  - In the page (local, not exported): `buildAuditFindingsHref(locale, status, searchText, filters?, listPage?)`, `type ResolutionMetric`, `SUMMARY_STATUSES`.
  - LFG/VFG: no row of the page; the page in `MIGRATED_LIST_FILES`.
  - `tests/list-pages-ui.test.ts`: the two findings tests (the constant `FINDINGS_PAGE`).

| guard | `D/audit/findings/page.tsx` before → after | plan totals after this task (budget) |
|---|---|---|
| VFG R7 | 1 → – | 23 → 22 (16 rows) |
| LFG LH2 | 2 → – | 11 → 9 |
| LFG LT3 | 1 → – | 7 → 6 |
| LFG LV2 | 7 → – | 112 → 105 |
| LFG LS1 | 1 → – | 22 → 21 |
| LFG LK1 | 1 → – | 10 → 9 |
| LFG LN1 | 2 → – | 10 → 8 |
| | joins `MIGRATED_LIST_FILES` | every other guard unchanged (LH1 31 · LB1 12 · LP1 7 · LF1 3 · LT4 3 · LT5 7 · LV1 20 · LV3 38 · LT1 36 · LT2 2 · LS2 20 · LN2 7 · LR1 0 · R1 1 · R2 10) |

The "plan totals" assume Tasks 1–5 as written (R7 29 → 23 and LH1 34 → 31 from the disposal page, the batch list and the batch page; LT3, LV2, LN1 from the disposal page; LS1, LK1 from the batch page). The rows of this file are what this task must move; if a total differs, the difference comes from an earlier task: report it.

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `git diff --quiet e3f20ce -- "src/app/[[]locale]/(dashboard)/audit/findings/page.tsx" && echo FILE-AT-BASE`
Expected: `git status` prints nothing; then `FILE-AT-BASE`. If it does not print, stop and report.

Run: `git log --oneline -2 -- src/components/audit/audit-findings-batch-actions.tsx src/components/audit/audit-finding-review-actions.tsx`
Expected: the commits of Tasks 7 and 6 (`… (2B-2 task 7)`, `… (2B-2 task 6)`).

Run: `grep -cF 'buildAuditFindingsHref\(locale, status, searchText, \{ roundId, findingType \}\)/)' tests/operational-return-navigation.test.ts` and `grep -cF 'findingTypeParam = "" \} = await searchParams/)' tests/operational-return-navigation.test.ts` and `grep -cF '\.\.\.\(findingType \? \{ findingType \} : \{\}\) \}\}/)' tests/operational-return-navigation.test.ts`
Expected: `1`, `1`, `1` (the three pins of `:81-83` as they are at `e3f20ce`; earlier tasks only appended to this file).

Run: `node -e 'for (const l of ["th","en"]) { const m = require("./messages/" + l + ".json"); console.log(l, m.auditFinding.activeFilters === undefined, typeof m.asset.clearDrilldownFilter, typeof m.auditFinding.noActionOwner) }'`
Expected: `th true string string` and `en true string string`.

Run: `git ls-files --eol "src/app/[[]locale]/(dashboard)/audit/findings/page.tsx" messages/th.json messages/en.json tests/list-pages-ui.test.ts tests/operational-return-navigation.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: `i/lf w/crlf` for all seven. Keep them CRLF.

Run: `node <temp>/p2b1-precheck.mjs --file D/audit/findings/page.tsx`
Expected (after the header lines; exit 0):
```
file    src/app/[locale]/(dashboard)/audit/findings/page.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
R7         1       1     0     1
LH2        2       2     0     2
LT3        1       1     0     1
LV2        7       7     0     7
LS1        1       1     0     1
LK1        1       1     0     1
LN1        2       2     0     2
args    R7=1:1 LH2=2:2 LT3=1:1 LV2=7:7 LS1=1:1 LK1=1:1 LN1=2:2
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

- [ ] **Step 2: Write the failing tests**

(a) Save this block as `<temp>/t08-pages-block.ts`:

```ts
// Task 8 (spec 2B §5.4 row "audit/findings", §5.9.2 row 3, §5.10 row 2, I21, I24): the findings list page.
const FINDINGS_PAGE = `${D}audit/findings/page.tsx`

test("findings: PageHeader with a back link, StatStrip, TabNav, chips for the hidden filters, DataTable and the shared Pagination (spec 2B §5.4, I24)", () => {
  const source = read(FINDINGS_PAGE)
  for (const part of ["<PageHeader", "<StatStrip", "<TabNav", "<FilterChipList", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<TableEmptyRow", "<ClickableTableRow", "<KeyValueList", "<DataTableFoot>", "<Pagination"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /<div className="space-y-6">/)
  assert.match(source, /back=\{<PageBackLink href=\{`\/\$\{locale\}\/audit\/rounds`\} label=\{t\("backToRounds"\)\} \/>\}/, "the way back has the left arrow, not the plus of a create button (spec 2B §5.10 row 2)")
  assert.match(source, /<TabNav aria-label=\{t\("quickFilters"\)\} items=\{resolutionFilters\} current=\{status\} scroll=\{false\} \/>/)
  assert.match(source, /current: status === item\.status,\n\s+scroll: false,/, "the strip cell of the filter in use keeps aria-current and the scroll position")
  assert.match(source, /prisma\.auditRound\.findUnique\(\{ where: \{ id: roundId \}, select: \{ auditNo: true \} \}\)/, "the round chip names its round (I24)")
  assert.match(source, /<FilterChipList chips=\{filterChips\} label=\{t\("activeFilters"\)\} removeLabel=\{tAsset\("clearDrilldownFilter"\)\} \/>/)
  assert.match(source, /<AuditFindingsBatchActions key=\{selectionKey\} findings=\{batchReviewFindings\} \/>/, "another page or filter starts the batch selection empty")
  assert.match(source, /<TableEmptyRow\n\s+colSpan=\{13\}\n\s+emptyState=\{\{[\s\S]*?actionVariant: "secondary",/)
  assert.match(source, /<DataTableHead align="right" hideLabel>\{tCommon\("actions"\)\}<\/DataTableHead>/)
  assert.match(source, /<AuditFindingReviewActions\n/, "the row triggers stay in the cell: their dialogs have no open() handle (I21)")
  assert.doesNotMatch(source, /<RowActions\b|<MasterDataHeader\b|<ColumnHeader\b|toLocaleString\(/)
})

test("findings page on the server, count the whole list once and keep the page in returnTo (spec 2B §5.9.2 row 3)", () => {
  const source = read(FINDINGS_PAGE)
  assert.match(source, /const listPage = parseListPage\(\{ page, pageSize \}\)/)
  assert.match(source, /const \{ skip, take \} = listPageWindow\(listPage\)/)
  assert.match(source, /orderBy: \[\{ reportedAt: "desc" \}, \{ id: "asc" \}\],\n\s+skip,\n\s+take,/, "the old order plus id, so no finding shows on two pages")
  assert.doesNotMatch(source, /\btake: \d+/, "no fixed number of rows")
  assert.match(source, /SUMMARY_STATUSES\.has\(status\) \? Promise\.resolve\(null\) : prisma\.auditFinding\.count\(\{ where \}\)/, "one more count only for a status the strip does not count")
  assert.match(source, /const total = summaryCounts\[status\] \?\? otherStatusTotal \?\? 0/)
  assert.match(source, /^import \{ redirect \} from "next\/navigation"$/m)
  assert.match(source, /const lastPage = lastListPage\(\w+, [\w.]+\)\n\s+if \(\w+\.length === 0 && \w+ > 0 && [\w.]+ > lastPage\) \{\n\s+redirect\(/)
  assert.match(source, /appendListPage\(params, listPage\)/, "buildAuditFindingsHref writes page above 1 and pageSize other than 25 only")
  assert.match(source, /buildAuditFindingsHref\(locale, nextStatus, searchText, filters, \{ pageSize: listPage\.pageSize \}\)/, "a filter link goes back to page 1 and keeps the page size")
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: pageHref\(\{ pageSize: value \}\) \}\)\)\}/)
})
```

Run: `node <temp>/p2b2-append.mjs <temp>/t08-pages-block.ts tests/list-pages-ui.test.ts`
Expected: `appended <temp>/t08-pages-block.ts to tests/list-pages-ui.test.ts (CRLF)`

(b) `tests/operational-return-navigation.test.ts` (CRLF; the test reads the page without stripping `\r`, so no `\n` in a regex). Grow the three pins of `:81-83` by their B4 part (I17). Replace:

```ts
  assert.match(source, /const auditFindingsReturnHref = buildAuditFindingsHref\(locale, status, searchText, \{ roundId, findingType \}\)/)
  assert.match(source, /const \{ search = "", status: statusParam = "pending", roundId: roundIdParam = "", findingType: findingTypeParam = "" \} = await searchParams/)
  assert.match(source, /hiddenInputs=\{\{ status, \.\.\.\(roundId \? \{ roundId \} : \{\}\), \.\.\.\(findingType \? \{ findingType \} : \{\}\) \}\}/)
```

with:

```ts
  assert.match(source, /const auditFindingsReturnHref = buildAuditFindingsHref\(locale, status, searchText, \{ roundId, findingType \}, listPage\)/)
  assert.match(source, /const \{ search = "", status: statusParam = "pending", roundId: roundIdParam = "", findingType: findingTypeParam = "", page, pageSize \} = await searchParams/)
  assert.match(source, /hiddenInputs=\{\{ status, \.\.\.\(roundId \? \{ roundId \} : \{\}\), \.\.\.\(findingType \? \{ findingType \} : \{\}\), \.\.\.Object\.fromEntries\(appendListPage\(new URLSearchParams\(\), \{ pageSize: listPage\.pageSize \}\)\) \}\}/)
```

Run: `node --test tests/list-pages-ui.test.ts tests/operational-return-navigation.test.ts`
Expected: FAIL, `fail 3`, every other test passing (`list-pages-ui` has 2 more tests than before this step):
- `findings: PageHeader with a back link, StatStrip, TabNav, chips for the hidden filters, DataTable and the shared Pagination (spec 2B §5.4, I24)`: `no <PageHeader`
- `findings page on the server, count the whole list once and keep the page in returnTo (spec 2B §5.9.2 row 3)`: no match for `/const listPage = parseListPage\(\{ page, pageSize \}\)/`
- `audit findings preserve resolution context for disposal follow-up links`: no match for `/const auditFindingsReturnHref = buildAuditFindingsHref\(locale, status, searchText, \{ roundId, findingType \}, listPage\)/`

- [ ] **Step 3: Lower the guard rows of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs D/audit/findings/page.tsx R7=1:0 LH2=2:0 LT3=1:0 LV2=7:0 LS1=1:0 LK1=1:0 LN1=2:0 --migrated`
Expected (exit 0):
```
R7: 1 -> 0 (row deleted)
LH2: 2 -> 0 (row deleted)
LT3: 1 -> 0 (row deleted)
LV2: 7 -> 0 (row deleted)
LS1: 1 -> 0 (row deleted)
LK1: 1 -> 0 (row deleted)
LN1: 2 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/audit/findings/page.tsx
```

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 39 · fail 8`:
- LFG LH2, LT3, LV2, LS1, LK1 and LN1, each listing only `src/app/[locale]/(dashboard)/audit/findings/page.tsx: N > 0` (2, 1, 7, 1, 1, 2), with the live totals after Tasks 1–5 in the message (`LH2: 11 in 7 files`, `LT3: 7 in 6 files`, `LV2: 112 in 34 files`, `LS1: 22 in 19 files`, `LK1: 10 in 10 files`, `LN1: 10 in 8 files`)
- LFG `L0` with the same 6 lines (`LH2 src/app/[locale]/(dashboard)/audit/findings/page.tsx: 2 > 0` …), because the page is now in `MIGRATED_LIST_FILES`
- VFG `R7 interim: table-header fills wait for DataTable (2B), file by file` with `23 matches in 17 files; over budget:` and the one line `src/app/[locale]/(dashboard)/audit/findings/page.tsx: 1 > 0`

- [ ] **Step 4: The new message**

Save as `<temp>/t08-messages.json`:

```json
{
  "set": {
    "th": { "auditFinding.activeFilters": "ตัวกรองที่ใช้อยู่" },
    "en": { "auditFinding.activeFilters": "Active filters" }
  }
}
```

Run: `node scripts/messages-edit.mjs <temp>/t08-messages.json`
Expected: `messages updated: 1 th, 1 en, 0 deleted`. `git diff --stat messages` shows 2 insertions and 1 deletion per file (the key goes last in `auditFinding`, after `reconcileStatus_reviewed`, which gains a comma).

- [ ] **Step 5: Move the page onto the primitives and the paged query (`src/app/[locale]/(dashboard)/audit/findings/page.tsx`, CRLF)**

Thirteen exact replacements, top to bottom. Make all thirteen before you compile: (1) imports what the others use, and (10) and (13) delete the local helpers that (4)–(9) stop calling.

(1) Imports and the props type (`:1-33`). `ReactNode`, the four summary icons, `ColumnHeader` and `MasterDataHeader` go; `redirect`, the primitives, `formatCount` and the paging helpers come in.

Replace:

```tsx
import Link from "next/link"
import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, CalendarClock, ClipboardCheck, Download, FileText, ListChecks } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { ColumnHeader, MasterDataHeader, MasterDataSearch } from "@/components/master-data/master-data-layout"
import { AuditFindingReviewActions } from "@/components/audit/audit-finding-review-actions"
import { AuditFindingsBatchActions } from "@/components/audit/audit-findings-batch-actions"
import { buildFindingValueLabels, formatFindingValue } from "@/lib/audit-finding-labels"
import { formatDateTime } from "@/lib/utils"
import { formatFileSize } from "@/lib/uploads"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { DataFreshnessBanner } from "@/components/ui/data-freshness-banner"
import { StatusBadge } from "@/components/ui/status-badge"
import { isSameAuditActor } from "@/lib/audit-segregation"
import {
  auditFindingResolutionStatuses,
  buildAuditFindingWhere,
  getAuditFindingToday,
  isOpenAuditFindingActionStatus,
  resolveAuditFindingStatus,
  type AuditFindingResolutionStatus,
} from "@/lib/audit-finding-filters"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import { getAuditItemReconcileStatusLabelKey, getAuditItemStatusLabelKey } from "@/lib/audit-item-status-labels"

type AuditFindingsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; status?: string; roundId?: string; findingType?: string }>
}
```

with:

```tsx
import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Download, FileText } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { MasterDataSearch } from "@/components/master-data/master-data-layout"
import { AuditFindingReviewActions } from "@/components/audit/audit-finding-review-actions"
import { AuditFindingsBatchActions } from "@/components/audit/audit-findings-batch-actions"
import { buildFindingValueLabels, formatFindingValue } from "@/lib/audit-finding-labels"
import { formatDateTime } from "@/lib/utils"
import { formatFileSize } from "@/lib/uploads"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { DataFreshnessBanner } from "@/components/ui/data-freshness-banner"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { FilterChipList, type FilterChipItem } from "@/components/ui/filter-chips"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil, orNil } from "@/components/ui/nil"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { TabNav } from "@/components/ui/tab-nav"
import { isSameAuditActor } from "@/lib/audit-segregation"
import {
  auditFindingResolutionStatuses,
  buildAuditFindingWhere,
  getAuditFindingToday,
  isOpenAuditFindingActionStatus,
  resolveAuditFindingStatus,
  type AuditFindingResolutionStatus,
} from "@/lib/audit-finding-filters"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, appendListPage, lastListPage, listPageWindow, parseListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import { getAuditItemReconcileStatusLabelKey, getAuditItemStatusLabelKey } from "@/lib/audit-item-status-labels"

type AuditFindingsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; status?: string; roundId?: string; findingType?: string; page?: string | string[]; pageSize?: string | string[] }>
}
```

(2) The page state, the paged query with its counts and the round lookup, the redirect and the range (`:43-95`).

Replace:

```tsx
export default async function AuditFindingsPage({ params, searchParams }: AuditFindingsPageProps) {
  const { locale } = await params
  const { search = "", status: statusParam = "pending", roundId: roundIdParam = "", findingType: findingTypeParam = "" } = await searchParams
  const user = await requirePagePermission(locale, "audit", "view")
  const canEdit = hasPermission(user, "audit", "edit")
  const canApprove = hasPermission(user, "audit", "approve")
  const canCreateDisposal = hasPermission(user, "disposal", "create")

  const t = await getTranslations("auditFinding")
  const tCommon = await getTranslations("common")
  const formatAuditItemStatus = (status: string) => {
    const key = getAuditItemStatusLabelKey(status)
    return key ? t(key) : status
  }
  const formatReconcileStatus = (status: string | null) => {
    const key = getAuditItemReconcileStatusLabelKey(status)
    return key ? t(key) : (status ?? "-")
  }
  const pageLoadedAt = new Date()
  const searchText = search.trim()
  const roundId = roundIdParam.trim()
  const findingType = findingTypeParam.trim()
  const status = resolveAuditFindingStatus(statusParam)
  const today = getAuditFindingToday()
  const auditFindingsReturnHref = buildAuditFindingsHref(locale, status, searchText, { roundId, findingType })
  const exportParams = new URLSearchParams()
  if (searchText) exportParams.set("search", searchText)
  if (roundId) exportParams.set("roundId", roundId)
  if (findingType) exportParams.set("findingType", findingType)
  exportParams.set("status", status)
  const [findings, employees, pendingReviewCount, openActionCount, overdueCount, closedCount] = await Promise.all([
    prisma.auditFinding.findMany({
      where: buildAuditFindingWhere({ status, search: searchText, roundId, findingType, now: today }),
      include: {
        auditRound: { select: { id: true, auditNo: true, name: true } },
        auditItem: { select: { auditStatus: true, reconcileStatus: true } },
        asset: { select: { id: true, assetTag: true, name: true } },
      },
      orderBy: { reportedAt: "desc" },
      take: 200,
    }),
    canEdit
      ? prisma.employee.findMany({
          where: { isActive: true },
          select: { id: true, code: true, fullNameTh: true },
          orderBy: { code: "asc" },
        })
      : Promise.resolve([]),
    prisma.auditFinding.count({ where: buildAuditFindingWhere({ status: "pending", search: searchText, roundId, findingType, now: today }) }),
    prisma.auditFinding.count({ where: buildAuditFindingWhere({ status: "action_open", search: searchText, roundId, findingType, now: today }) }),
    prisma.auditFinding.count({ where: buildAuditFindingWhere({ status: "overdue", search: searchText, roundId, findingType, now: today }) }),
    prisma.auditFinding.count({ where: buildAuditFindingWhere({ status: "closed", search: searchText, roundId, findingType, now: today }) }),
  ])
```

with:

```tsx
export default async function AuditFindingsPage({ params, searchParams }: AuditFindingsPageProps) {
  const { locale } = await params
  const { search = "", status: statusParam = "pending", roundId: roundIdParam = "", findingType: findingTypeParam = "", page, pageSize } = await searchParams
  const user = await requirePagePermission(locale, "audit", "view")
  const canEdit = hasPermission(user, "audit", "edit")
  const canApprove = hasPermission(user, "audit", "approve")
  const canCreateDisposal = hasPermission(user, "disposal", "create")

  const t = await getTranslations("auditFinding")
  const tCommon = await getTranslations("common")
  const tAsset = await getTranslations("asset")
  const formatAuditItemStatus = (status: string) => {
    const key = getAuditItemStatusLabelKey(status)
    return key ? t(key) : status
  }
  const formatReconcileStatus = (status: string | null) => {
    const key = getAuditItemReconcileStatusLabelKey(status)
    return key ? t(key) : orNil(status)
  }
  const pageLoadedAt = new Date()
  const searchText = search.trim()
  const roundId = roundIdParam.trim()
  const findingType = findingTypeParam.trim()
  const status = resolveAuditFindingStatus(statusParam)
  const today = getAuditFindingToday()
  const listPage = parseListPage({ page, pageSize })
  const auditFindingsReturnHref = buildAuditFindingsHref(locale, status, searchText, { roundId, findingType }, listPage)
  // This list at another page or page size, with the same filters.
  const pageHref = (next: { page?: number; pageSize?: number }) => buildAuditFindingsHref(locale, status, searchText, { roundId, findingType }, next)
  // A filter link goes back to page 1 and keeps the page size (spec 2B §5.9.1).
  const filterHref = (nextStatus: AuditFindingResolutionStatus, filters: { roundId?: string; findingType?: string } = { roundId, findingType }) =>
    buildAuditFindingsHref(locale, nextStatus, searchText, filters, { pageSize: listPage.pageSize })
  const exportParams = new URLSearchParams()
  if (searchText) exportParams.set("search", searchText)
  if (roundId) exportParams.set("roundId", roundId)
  if (findingType) exportParams.set("findingType", findingType)
  exportParams.set("status", status)
  const where = buildAuditFindingWhere({ status, search: searchText, roundId, findingType, now: today })
  const { skip, take } = listPageWindow(listPage)
  const [findings, employees, pendingReviewCount, openActionCount, overdueCount, closedCount, otherStatusTotal, filterRound] = await Promise.all([
    prisma.auditFinding.findMany({
      where,
      include: {
        auditRound: { select: { id: true, auditNo: true, name: true } },
        auditItem: { select: { auditStatus: true, reconcileStatus: true } },
        asset: { select: { id: true, assetTag: true, name: true } },
      },
      orderBy: [{ reportedAt: "desc" }, { id: "asc" }],
      skip,
      take,
    }),
    canEdit
      ? prisma.employee.findMany({
          where: { isActive: true },
          select: { id: true, code: true, fullNameTh: true },
          orderBy: { code: "asc" },
        })
      : Promise.resolve([]),
    prisma.auditFinding.count({ where: buildAuditFindingWhere({ status: "pending", search: searchText, roundId, findingType, now: today }) }),
    prisma.auditFinding.count({ where: buildAuditFindingWhere({ status: "action_open", search: searchText, roundId, findingType, now: today }) }),
    prisma.auditFinding.count({ where: buildAuditFindingWhere({ status: "overdue", search: searchText, roundId, findingType, now: today }) }),
    prisma.auditFinding.count({ where: buildAuditFindingWhere({ status: "closed", search: searchText, roundId, findingType, now: today }) }),
    // The four counts above already cover the whole list of their status; any other status needs one count of its own.
    SUMMARY_STATUSES.has(status) ? Promise.resolve(null) : prisma.auditFinding.count({ where }),
    // The round chip names the round (spec 2B I24). Read-only, one row.
    roundId ? prisma.auditRound.findUnique({ where: { id: roundId }, select: { auditNo: true } }) : Promise.resolve(null),
  ])
  const summaryCounts: Partial<Record<AuditFindingResolutionStatus, number>> = {
    pending: pendingReviewCount,
    action_open: openActionCount,
    overdue: overdueCount,
    closed: closedCount,
  }
  const total = summaryCounts[status] ?? otherStatusTotal ?? 0
  // A page past the last one (an old link, or the last finding of the last page decided) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listPage.pageSize)
  if (findings.length === 0 && total > 0 && listPage.page > lastPage) {
    redirect(pageHref({ page: lastPage, pageSize: listPage.pageSize }))
  }
  const { start, end, totalPages } = paginationRange(listPage.page, listPage.pageSize, total)
```

(3) The strip items, the tab items, the chips and the selection key (`:153-191`).

Replace:

```tsx
  const resolutionSummaryItems = [
    {
      status: "pending" as const,
      label: t("summaryPendingReview"),
      help: t("summaryPendingReviewHelp"),
      count: pendingReviewCount,
      tone: "warning" as const,
      icon: <AlertTriangle className="h-5 w-5" />,
    },
    {
      status: "action_open" as const,
      label: t("summaryOpenActions"),
      help: t("summaryOpenActionsHelp"),
      count: openActionCount,
      tone: "info" as const,
      icon: <ListChecks className="h-5 w-5" />,
    },
    {
      status: "overdue" as const,
      label: t("summaryOverdue"),
      help: t("summaryOverdueHelp"),
      count: overdueCount,
      tone: "danger" as const,
      icon: <CalendarClock className="h-5 w-5" />,
    },
    {
      status: "closed" as const,
      label: t("summaryClosed"),
      help: t("summaryClosedHelp"),
      count: closedCount,
      tone: "success" as const,
      icon: <ClipboardCheck className="h-5 w-5" />,
    },
  ]
  const resolutionFilters = auditFindingResolutionStatuses.map((item) => ({
    value: item,
    label: resolutionFilterLabels[item],
    href: buildAuditFindingsHref(locale, item, searchText, { roundId, findingType }),
  }))
```

with:

```tsx
  const resolutionSummaryItems: ResolutionMetric[] = [
    {
      status: "pending",
      label: t("summaryPendingReview"),
      help: t("summaryPendingReviewHelp"),
      count: pendingReviewCount,
      attention: pendingReviewCount > 0,
    },
    {
      status: "action_open",
      label: t("summaryOpenActions"),
      help: t("summaryOpenActionsHelp"),
      count: openActionCount,
      attention: false,
    },
    {
      status: "overdue",
      label: t("summaryOverdue"),
      help: t("summaryOverdueHelp"),
      count: overdueCount,
      attention: overdueCount > 0,
    },
    {
      status: "closed",
      label: t("summaryClosed"),
      help: t("summaryClosedHelp"),
      count: closedCount,
      attention: false,
    },
  ]
  const resolutionFilters = auditFindingResolutionStatuses.map((item) => ({
    key: item,
    label: resolutionFilterLabels[item],
    href: filterHref(item),
  }))
  // roundId and findingType come from a drill-down link and have no field on this page, so each shows as a chip that
  // removes only itself (spec 2B I24, DESIGN.md "chips for every active filter that is not visible on screen").
  const findingTypeKey = `type_${findingType}`
  const filterChips: FilterChipItem[] = [
    ...(roundId ? [{ key: "roundId", label: `${t("auditRound")}: ${filterRound?.auditNo ?? roundId}`, href: filterHref(status, { findingType }) }] : []),
    ...(findingType ? [{ key: "findingType", label: `${t("findingType")}: ${t.has(findingTypeKey) ? t(findingTypeKey) : findingType}`, href: filterHref(status, { roundId }) }] : []),
  ]
  // The batch selection belongs to one page of one filter: another page or filter starts with nothing selected.
  const selectionKey = `${listPage.page}:${listPage.pageSize}:${status}:${searchText}:${roundId}:${findingType}`
```

(4) The page root, the header, the strip, the search, the queue tabs with the exports and the chips, the batch panel, and the phone list's empty state (`:193-298`).

Replace:

```tsx
  return (
    <div>
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={`/${locale}/audit/rounds`}
        createLabel={t("backToRounds")}
      />

      <DataFreshnessBanner
        loadedAtIso={pageLoadedAt.toISOString()}
        loadedAtLabel={formatDateTime(pageLoadedAt)}
        labels={{
          freshTitle: t("freshnessFreshTitle"),
          freshHelp: t("freshnessFreshHelp"),
          staleTitle: t("freshnessStaleTitle"),
          staleHelp: t("freshnessStaleHelp"),
          refresh: t("freshnessRefresh"),
          refreshing: t("freshnessRefreshing"),
        }}
      />

      <section className="mb-4 rounded-lg border border-border bg-surface p-4">
        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("resolutionTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("resolutionHelp")}</p>
          </div>
          <StatusBadge label={resolutionFilterLabels[status]} status={status} />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {resolutionSummaryItems.map((item) => (
            <ResolutionMetric
              key={item.status}
              href={buildAuditFindingsHref(locale, item.status, searchText, { roundId, findingType })}
              active={status === item.status}
              label={item.label}
              help={item.help}
              count={item.count}
              tone={item.tone}
              icon={item.icon}
            />
          ))}
        </div>
      </section>

      <MasterDataSearch
        action={`/${locale}/audit/findings`}
        defaultValue={searchText}
        placeholder={tCommon("search")}
        submitLabel={tCommon("search")}
        hiddenInputs={{ status, ...(roundId ? { roundId } : {}), ...(findingType ? { findingType } : {}) }}
      />

      <section className="mb-4 rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("quickFilters")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("quickFiltersHelp")}</p>
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
            <a
              href={`/api/audit-findings/export?${exportParams.toString()}`}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-9 sm:min-h-0 sm:w-fit"
            >
              <Download className="h-4 w-4" />
              {t("exportFindings")}
            </a>
            <a
              href={`/api/audit-findings/export-pdf?${exportParams.toString()}`}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-9 sm:min-h-0 sm:w-fit"
            >
              <FileText className="h-4 w-4" />
              {t("exportFindingsPdf")}
            </a>
          </div>
        </div>
        <div className="mt-3 flex min-w-0 flex-wrap gap-2">
          {resolutionFilters.map((item) => (
            <Link
              key={item.value}
              href={item.href}
              scroll={false}
              aria-current={status === item.value ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-md border px-3 text-sm transition-colors sm:h-9 sm:min-h-0 ${
                status === item.value ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-muted-foreground hover:bg-accent"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      {canApprove ? <AuditFindingsBatchActions findings={batchReviewFindings} /> : null}

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="grid gap-3 p-3 md:hidden">
          {findings.length === 0 ? (
            <ActionEmptyState
              icon={<FileText className="h-6 w-6" />}
              title={t("emptyTitle")}
              description={t("emptyHelp")}
              actionHref={`/${locale}/audit/rounds`}
              actionLabel={t("backToRounds")}
            />
```

with:

```tsx
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        back={<PageBackLink href={`/${locale}/audit/rounds`} label={t("backToRounds")} />}
      />

      <DataFreshnessBanner
        loadedAtIso={pageLoadedAt.toISOString()}
        loadedAtLabel={formatDateTime(pageLoadedAt)}
        labels={{
          freshTitle: t("freshnessFreshTitle"),
          freshHelp: t("freshnessFreshHelp"),
          staleTitle: t("freshnessStaleTitle"),
          staleHelp: t("freshnessStaleHelp"),
          refresh: t("freshnessRefresh"),
          refreshing: t("freshnessRefreshing"),
        }}
      />

      <section aria-labelledby="audit-finding-resolution-title" className="space-y-3">
        <div>
          <h2 id="audit-finding-resolution-title" className="text-base font-semibold text-foreground">{t("resolutionTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("resolutionHelp")}</p>
        </div>
        <StatStrip
          items={resolutionSummaryItems.map((item) => ({
            key: item.status,
            label: item.label,
            value: formatCount(item.count),
            foot: item.help,
            footTitle: item.help,
            href: filterHref(item.status),
            current: status === item.status,
            scroll: false,
            attention: item.attention,
          }))}
        />
      </section>

      <MasterDataSearch
        action={`/${locale}/audit/findings`}
        defaultValue={searchText}
        placeholder={tCommon("search")}
        submitLabel={tCommon("search")}
        hiddenInputs={{ status, ...(roundId ? { roundId } : {}), ...(findingType ? { findingType } : {}), ...Object.fromEntries(appendListPage(new URLSearchParams(), { pageSize: listPage.pageSize })) }}
      />

      <section aria-labelledby="audit-finding-queue-title" className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 id="audit-finding-queue-title" className="text-base font-semibold text-foreground">{t("quickFilters")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("quickFiltersHelp")}</p>
          </div>
          <div className="flex min-w-0 flex-col gap-2 md:flex-row md:flex-wrap">
            <a href={`/api/audit-findings/export?${exportParams.toString()}`} className={buttonVariants({ variant: "outline", size: "md" })}>
              <Download aria-hidden="true" />
              {t("exportFindings")}
            </a>
            <a href={`/api/audit-findings/export-pdf?${exportParams.toString()}`} className={buttonVariants({ variant: "outline", size: "md" })}>
              <FileText aria-hidden="true" />
              {t("exportFindingsPdf")}
            </a>
          </div>
        </div>
        <TabNav aria-label={t("quickFilters")} items={resolutionFilters} current={status} scroll={false} />
        <FilterChipList chips={filterChips} label={t("activeFilters")} removeLabel={tAsset("clearDrilldownFilter")} />
      </section>

      {canApprove ? <AuditFindingsBatchActions key={selectionKey} findings={batchReviewFindings} /> : null}

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="grid gap-3 p-3 md:hidden">
          {findings.length === 0 ? (
            <ActionEmptyState
              icon={<FileText />}
              title={t("emptyTitle")}
              description={t("emptyHelp")}
              actionHref={`/${locale}/audit/rounds`}
              actionLabel={t("backToRounds")}
              actionVariant="secondary"
            />
```

(5) The phone card's details: round and type move into the `KeyValueList` (`:320-322`).

Replace:

```tsx
                  <div className="mt-3 grid gap-2 text-sm">
                    <Info label={t("auditRound")} value={`${finding.auditRound.auditNo} · ${finding.auditRound.name}`} />
                    <Info label={t("findingType")} value={findingTypeLabel} />
```

with:

```tsx
                  <KeyValueList
                    className="mt-3"
                    items={[
                      { key: "auditRound", label: t("auditRound"), value: <><span className="tag">{finding.auditRound.auditNo}</span> · {finding.auditRound.name}</> },
                      { key: "findingType", label: t("findingType"), value: findingTypeLabel },
                      {
                        key: "actionOwner",
                        label: t("actionOwner"),
                        value: finding.actionOwnerId ? (employeeLabelById.get(finding.actionOwnerId) ?? finding.actionOwnerId) : null,
                        nilLabel: t("noActionOwner"),
                      },
                      { key: "actionDueDate", label: t("actionDueDate"), value: finding.actionDueDate ? formatDateTime(finding.actionDueDate) : null },
                    ]}
                  />
                  <div className="mt-3 grid gap-2 text-sm">
```

(6) The phone card: owner and due date are in the list above (`:337-339`).

Replace:

```tsx
                    <Info label={t("actionOwner")} value={finding.actionOwnerId ? (employeeLabelById.get(finding.actionOwnerId) ?? finding.actionOwnerId) : "-"} />
                    <Info label={t("actionDueDate")} value={formatDateTime(finding.actionDueDate)} />
                  </div>
```

with:

```tsx
                  </div>
```

(7) The phone card's "ดู" (`:343`).

Replace:

```tsx
                      className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium"
```

with:

```tsx
                      className={buttonVariants({ variant: "outline" })}
```

(8) The phone card's "เปิดคำขอตัดจำหน่าย" (`:368`).

Replace:

```tsx
                        className="inline-flex min-h-11 items-center justify-center rounded-md border border-warning-border bg-warning-soft px-3 text-sm font-medium text-warning"
```

with:

```tsx
                        className={buttonVariants({ variant: "outline" })}
```

(9) The desktop table and the shared foot (`:379-507`, to the end of the page function).

Replace:

```tsx
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <ColumnHeader>{t("reportedAt")}</ColumnHeader>
                <ColumnHeader>{t("auditRound")}</ColumnHeader>
                <ColumnHeader>{t("asset")}</ColumnHeader>
                <ColumnHeader>{t("findingType")}</ColumnHeader>
                <ColumnHeader>{t("comparison")}</ColumnHeader>
                <ColumnHeader>{t("resolutionState")}</ColumnHeader>
                <ColumnHeader>{t("reviewStatus")}</ColumnHeader>
                <ColumnHeader>{t("actionStatus")}</ColumnHeader>
                <ColumnHeader>{t("actionOwner")}</ColumnHeader>
                <ColumnHeader>{t("actionDueDate")}</ColumnHeader>
                <ColumnHeader>{t("itemStatus")}</ColumnHeader>
                <ColumnHeader>{t("reconcileStatus")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {findings.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-6">
                    <ActionEmptyState
                      icon={<FileText className="h-6 w-6" />}
                      title={t("emptyTitle")}
                      description={t("emptyHelp")}
                      actionHref={`/${locale}/audit/rounds`}
                      actionLabel={t("backToRounds")}
                    />
                  </td>
                </tr>
              ) : (
                findings.map((finding) => {
                  const resolutionState = resolveFindingState(finding, today)
                  const assetLabel = finding.asset ? `${finding.asset.assetTag} - ${finding.asset.name}` : finding.auditRound.auditNo
                  const findingTypeLabel = t(`type_${finding.findingType}`)
                  const expectedValue = formatFindingValue(finding.findingType, finding.expectedValue, valueLabels)
                  const actualValue = formatFindingValue(finding.findingType, finding.actualValue, valueLabels)

                  return (
                    <ClickableTableRow
                      key={finding.id}
                      href={finding.asset ? `/${locale}/assets/${finding.asset.id}` : `/${locale}/audit/rounds/${finding.auditRound.id}`}
                      label={`${tCommon("view")}: ${finding.asset?.assetTag ?? finding.auditRound.auditNo}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(finding.reportedAt)}</td>
                      <td className="min-w-56 px-4 py-3 text-muted-foreground">
                        <Link href={`/${locale}/audit/rounds/${finding.auditRound.id}`} className="text-primary hover:underline">
                          {finding.auditRound.auditNo}
                        </Link>
                        <div className="text-xs text-muted-foreground">{finding.auditRound.name}</div>
                      </td>
                      <td className="min-w-64 px-4 py-3 text-foreground">
                        {finding.asset ? assetLabel : "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{findingTypeLabel}</td>
                      <td className="min-w-80 px-4 py-3">
                        <FindingComparison
                          expectedLabel={t("systemValue")}
                          actualLabel={t("foundValue")}
                          expectedValue={expectedValue}
                          actualValue={actualValue}
                        />
                        <AuditFindingEvidenceList
                          attachments={attachmentsByFindingId.get(finding.id) ?? []}
                          labels={{
                            title: t("evidenceAttachments"),
                            count: t("evidenceAttachmentCount", { count: attachmentCountByFindingId.get(finding.id) ?? 0 }),
                            open: t("openEvidenceAttachment"),
                          }}
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <ResolutionStateBadge state={resolutionState} labels={resolutionStateLabels} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <ReviewStatusBadge status={finding.reviewStatus} label={t(`status_${finding.reviewStatus}`)} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <ActionStatusBadge status={finding.actionStatus} label={t(`actionStatus_${finding.actionStatus}`)} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {finding.actionOwnerId ? (employeeLabelById.get(finding.actionOwnerId) ?? finding.actionOwnerId) : "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(finding.actionDueDate)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatAuditItemStatus(finding.auditItem.auditStatus)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatReconcileStatus(finding.auditItem.reconcileStatus)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {canEdit || canApprove ? (
                          <AuditFindingReviewActions
                            findingId={finding.id}
                            assetLabel={assetLabel}
                            findingTypeLabel={findingTypeLabel}
                            expectedValue={expectedValue}
                            actualValue={actualValue}
                            reviewStatus={finding.reviewStatus}
                            actionStatus={finding.actionStatus}
                            actionPlan={finding.actionPlan}
                            actionOwnerId={finding.actionOwnerId}
                            actionDueDate={finding.actionDueDate}
                            evidenceCount={attachmentCountByFindingId.get(finding.id) ?? 0}
                            employees={employeeOptions}
                            reviewBlocked={isSameAuditActor(user.id, finding.reportedBy)}
                            reviewBlockedReason={t("segregationReviewBlocked")}
                          />
                        ) : (
                          "-"
                        )}
                        {canCreateDisposal && finding.asset ? (
                          <Link
                            href={appendOperationalReturnTo(`/${locale}/disposal/new?assetId=${finding.asset.id}&reason=${encodeURIComponent(`${t("disposalFromFindingReason")} ${finding.auditRound.auditNo}: ${t(`type_${finding.findingType}`)}`)}&sourceType=audit_finding&sourceId=${finding.id}`, auditFindingsReturnHref)}
                            className="ml-2 inline-flex h-8 items-center rounded-md border border-warning-border bg-warning-soft px-2 text-xs font-medium text-warning"
                          >
                            {t("openDisposalRequest")}
                          </Link>
                        ) : null}
                      </td>
                    </ClickableTableRow>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

with:

```tsx
        <DataTable framed={false} className="hidden md:block" caption={t("title")} scrollHint={tCommon("tableScrollHint")}>
          <DataTableHeader>
            <tr>
              <DataTableHead>{t("reportedAt")}</DataTableHead>
              <DataTableHead>{t("auditRound")}</DataTableHead>
              <DataTableHead>{t("asset")}</DataTableHead>
              <DataTableHead>{t("findingType")}</DataTableHead>
              <DataTableHead>{t("comparison")}</DataTableHead>
              <DataTableHead>{t("resolutionState")}</DataTableHead>
              <DataTableHead>{t("reviewStatus")}</DataTableHead>
              <DataTableHead>{t("actionStatus")}</DataTableHead>
              <DataTableHead>{t("actionOwner")}</DataTableHead>
              <DataTableHead>{t("actionDueDate")}</DataTableHead>
              <DataTableHead>{t("itemStatus")}</DataTableHead>
              <DataTableHead>{t("reconcileStatus")}</DataTableHead>
              <DataTableHead align="right" hideLabel>{tCommon("actions")}</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {findings.length === 0 ? (
              <TableEmptyRow
                colSpan={13}
                emptyState={{
                  icon: <FileText />,
                  title: t("emptyTitle"),
                  description: t("emptyHelp"),
                  actionHref: `/${locale}/audit/rounds`,
                  actionLabel: t("backToRounds"),
                  actionVariant: "secondary",
                }}
              />
            ) : (
              findings.map((finding) => {
                const resolutionState = resolveFindingState(finding, today)
                const assetLabel = finding.asset ? `${finding.asset.assetTag} - ${finding.asset.name}` : finding.auditRound.auditNo
                const findingTypeLabel = t(`type_${finding.findingType}`)
                const expectedValue = formatFindingValue(finding.findingType, finding.expectedValue, valueLabels)
                const actualValue = formatFindingValue(finding.findingType, finding.actualValue, valueLabels)

                return (
                  <ClickableTableRow
                    key={finding.id}
                    href={finding.asset ? `/${locale}/assets/${finding.asset.id}` : `/${locale}/audit/rounds/${finding.auditRound.id}`}
                    label={`${tCommon("view")}: ${finding.asset?.assetTag ?? finding.auditRound.auditNo}`}
                  >
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(finding.reportedAt)}</DataTableCell>
                    <DataTableCell className="min-w-56 text-muted-foreground">
                      <Link href={`/${locale}/audit/rounds/${finding.auditRound.id}`} className="text-primary hover:underline">
                        <span className="tag">{finding.auditRound.auditNo}</span>
                      </Link>
                      <div className="text-xs text-muted-foreground">{finding.auditRound.name}</div>
                    </DataTableCell>
                    <DataTableCell className="min-w-64 text-foreground">{finding.asset ? assetLabel : <Nil />}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">{findingTypeLabel}</DataTableCell>
                    <DataTableCell className="min-w-80">
                      <FindingComparison
                        expectedLabel={t("systemValue")}
                        actualLabel={t("foundValue")}
                        expectedValue={expectedValue}
                        actualValue={actualValue}
                      />
                      <AuditFindingEvidenceList
                        attachments={attachmentsByFindingId.get(finding.id) ?? []}
                        labels={{
                          title: t("evidenceAttachments"),
                          count: t("evidenceAttachmentCount", { count: attachmentCountByFindingId.get(finding.id) ?? 0 }),
                          open: t("openEvidenceAttachment"),
                        }}
                      />
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <ResolutionStateBadge state={resolutionState} labels={resolutionStateLabels} />
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <ReviewStatusBadge status={finding.reviewStatus} label={t(`status_${finding.reviewStatus}`)} />
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <ActionStatusBadge status={finding.actionStatus} label={t(`actionStatus_${finding.actionStatus}`)} />
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">
                      {finding.actionOwnerId ? (employeeLabelById.get(finding.actionOwnerId) ?? finding.actionOwnerId) : <Nil label={t("noActionOwner")} />}
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">{finding.actionDueDate ? formatDateTime(finding.actionDueDate) : <Nil />}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatAuditItemStatus(finding.auditItem.auditStatus)}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatReconcileStatus(finding.auditItem.reconcileStatus)}</DataTableCell>
                    <DataTableCell align="right">
                      {/* The triggers stay in the cell, not in ⋯: their dialogs have no open() handle (spec 2B I21, O21). */}
                      <div className="flex flex-col items-end gap-2">
                        {canEdit || canApprove ? (
                          <AuditFindingReviewActions
                            findingId={finding.id}
                            assetLabel={assetLabel}
                            findingTypeLabel={findingTypeLabel}
                            expectedValue={expectedValue}
                            actualValue={actualValue}
                            reviewStatus={finding.reviewStatus}
                            actionStatus={finding.actionStatus}
                            actionPlan={finding.actionPlan}
                            actionOwnerId={finding.actionOwnerId}
                            actionDueDate={finding.actionDueDate}
                            evidenceCount={attachmentCountByFindingId.get(finding.id) ?? 0}
                            employees={employeeOptions}
                            reviewBlocked={isSameAuditActor(user.id, finding.reportedBy)}
                            reviewBlockedReason={t("segregationReviewBlocked")}
                          />
                        ) : (
                          <Nil />
                        )}
                        {canCreateDisposal && finding.asset ? (
                          <Link
                            href={appendOperationalReturnTo(`/${locale}/disposal/new?assetId=${finding.asset.id}&reason=${encodeURIComponent(`${t("disposalFromFindingReason")} ${finding.auditRound.auditNo}: ${t(`type_${finding.findingType}`)}`)}&sourceType=audit_finding&sourceId=${finding.id}`, auditFindingsReturnHref)}
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                          >
                            {t("openDisposalRequest")}
                          </Link>
                        ) : null}
                      </div>
                    </DataTableCell>
                  </ClickableTableRow>
                )
              })
            )}
          </DataTableBody>
        </DataTable>
        {total > 0 ? (
          <DataTableFoot>
            <Pagination
              page={listPage.page}
              totalPages={totalPages}
              previousHref={pageHref({ page: listPage.page - 1, pageSize: listPage.pageSize })}
              nextHref={pageHref({ page: listPage.page + 1, pageSize: listPage.pageSize })}
              pageSize={listPage.pageSize}
              pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: pageHref({ pageSize: value }) }))}
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
      </div>
    </div>
  )
}
```

(10) `ResolutionMetric` becomes the type of a strip cell, and the counted statuses (`:509-562`).

Replace:

```tsx
type ResolutionState = "pending_review" | "open_action" | "overdue" | "closed" | "resolved"

type FindingResolutionSnapshot = {
  reviewStatus: string
  actionStatus: string
  actionDueDate: Date | string | null
}

function ResolutionMetric({
  href,
  active,
  label,
  help,
  count,
  tone,
  icon,
}: {
  href: string
  active: boolean
  label: string
  help: string
  count: number
  tone: "warning" | "info" | "danger" | "success"
  icon: ReactNode
}) {
  const toneClass =
    tone === "danger"
      ? "border-danger-border bg-danger-soft text-danger"
      : tone === "warning"
        ? "border-warning-border bg-warning-soft text-warning"
        : tone === "success"
          ? "border-success-border bg-success-soft text-success"
          : "border-info-border bg-info-soft text-info"

  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={`group flex min-h-32 items-start justify-between gap-3 rounded-lg border p-4 transition-colors hover:bg-accent ${
        active ? toneClass : "border-border bg-background text-muted-foreground"
      }`}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="mt-2 block text-3xl font-semibold leading-none text-foreground">{count.toLocaleString("th-TH")}</span>
        <span className="mt-2 block text-xs text-muted-foreground">{help}</span>
      </span>
      <span className={`rounded-md border p-2 ${active ? "border-current bg-background/60" : "border-border bg-surface text-muted-foreground group-hover:text-foreground"}`}>
        {icon}
      </span>
    </Link>
  )
}
```

with:

```tsx
type ResolutionState = "pending_review" | "open_action" | "overdue" | "closed" | "resolved"

type FindingResolutionSnapshot = {
  reviewStatus: string
  actionStatus: string
  actionDueDate: Date | string | null
}

// One cell of the resolution number strip (StatStrip). Its count covers the whole filtered list, never one page.
type ResolutionMetric = {
  status: "pending" | "action_open" | "overdue" | "closed"
  label: string
  help: string
  count: number
  // Work waits on it: the cell's foot line turns warning with its icon. No tone fill (spec 2B R-d).
  attention: boolean
}

// The statuses the strip counts. A list filtered by one of them takes its total from the strip (spec 2B §5.9.2 row 3).
const SUMMARY_STATUSES: ReadonlySet<AuditFindingResolutionStatus> = new Set(["pending", "action_open", "overdue", "closed"])
```

(11) `FindingComparison`, the system value (`:579`).

Replace:

```tsx
        <div className="mt-1 break-words text-sm text-foreground">{expectedValue || "-"}</div>
```

with:

```tsx
        <div className="mt-1 break-words text-sm text-foreground">{orNil(expectedValue)}</div>
```

(12) `FindingComparison`, the found value (`:583`).

Replace:

```tsx
        <div className="mt-1 break-words text-sm font-medium text-foreground">{actualValue || "-"}</div>
```

with:

```tsx
        <div className="mt-1 break-words text-sm font-medium text-foreground">{orNil(actualValue)}</div>
```

(13) `buildAuditFindingsHref` takes the page; the local `Info` goes (`:657-678`).

Replace:

```tsx
function buildAuditFindingsHref(
  locale: string,
  status: AuditFindingResolutionStatus,
  searchText: string,
  filters: { roundId?: string; findingType?: string } = {}
) {
  const params = new URLSearchParams()
  params.set("status", status)
  if (searchText) params.set("search", searchText)
  if (filters.roundId) params.set("roundId", filters.roundId)
  if (filters.findingType) params.set("findingType", filters.findingType)
  return `/${locale}/audit/findings?${params.toString()}`
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-0.5 break-words text-sm text-foreground">{value || "-"}</div>
    </div>
  )
}
```

with:

```tsx
function buildAuditFindingsHref(
  locale: string,
  status: AuditFindingResolutionStatus,
  searchText: string,
  filters: { roundId?: string; findingType?: string } = {},
  listPage: { page?: number; pageSize?: number } = {}
) {
  const params = new URLSearchParams()
  params.set("status", status)
  if (searchText) params.set("search", searchText)
  if (filters.roundId) params.set("roundId", filters.roundId)
  if (filters.findingType) params.set("findingType", filters.findingType)
  // page only above 1 and pageSize only when it is not 25, so every default link stays as it was (spec 2B B4).
  appendListPage(params, listPage)
  return `/${locale}/audit/findings?${params.toString()}`
}
```

Check: `grep -n 'toLocaleString\|"-"\|MasterDataHeader\|ColumnHeader\|bg-muted\|uppercase\|opacity-\|function Info\|function ResolutionMetric\|aria-current\|take: [0-9]' "src/app/[locale]/(dashboard)/audit/findings/page.tsx"` prints nothing.

- [ ] **Step 6: Run the tests for this task**

Run: `node --test tests/list-pages-ui.test.ts tests/operational-return-navigation.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/audit-finding-resolution.test.ts tests/audit-item-status-labels.test.ts tests/audit-mobile-flow-completion.test.ts tests/disposal-route-structure.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts tests/list-primitives-ui.test.ts tests/dialog-trigger-handles.test.ts tests/clickable-table-row-navigation.test.ts`
Expected: PASS, `fail 0`: `list-frame-guards` 21 · `visual-foundation-guards` 26 · `form-migration-guards` 23 · `audit-finding-resolution` 7 · `audit-item-status-labels` 8 · `audit-mobile-flow-completion` 4 · `thai-glossary` 3 · `messages-parity` 3 · `list-primitives-ui` 18 · `dialog-trigger-handles` 5 · `clickable-table-row-navigation` 2; `list-pages-ui`, `operational-return-navigation` and `disposal-route-structure` pass in full (their counts include what Tasks 3–7 added).

Run: `node <temp>/p2b1-precheck.mjs --file D/audit/findings/page.tsx`
Expected: `· in MIGRATED_LIST_FILES` on the `file` line, every guard row `0 0 0 <seed>` (R7 seed 1, LH2 2, LT3 1, LV2 7, LS1 1, LK1 1, LN1 2) and `args    (no row holds this file)`; exit 0.

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected: exit 0, `budgets hold: no live count is over its row`; `R7 TABLE_HEADER_FILLS 22 in 16 rows`; `LH2 9`, `LT3 6`, `LV2 105`, `LS1 21`, `LK1 9`, `LN1 8`, each `slack 0`; the only `slack` lines are LB1's two `0 → 1` rows (`D/audit/rounds/[id]/page.tsx`, `D/maintenance/[id]/page.tsx`).

- [ ] **Step 7: Prove every class compiles**

Run: `node <temp>/p2b2-tw-probe.mjs "src/app/[locale]/(dashboard)/audit/findings/page.tsx"`
Expected: `checked 74 classes, missing 0` (exit 0). The page adds no class that `src` does not already use (`items-end`, `md:items-start`, `md:justify-between` and the rest come from the existing pages and primitives).

- [ ] **Step 8: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, and 2 more tests than before Step 2 (the two findings tests; 1 skipped as before). Tasks 6–8 together add 4 tests, so after Tasks 1–8 it prints `tests 1907 · pass 1906 · fail 0 · skipped 1` (Tasks 1–5 end at 1903).
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, no new warning (`npx eslint "src/app/[locale]/(dashboard)/audit/findings/page.tsx" tests/list-pages-ui.test.ts tests/operational-return-navigation.test.ts` prints nothing).

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- 7 files: the page 253 insertions and 242 deletions, `messages/th.json` and `messages/en.json` 2 insertions and 1 deletion each, `tests/list-pages-ui.test.ts` 36 insertions, `tests/operational-return-navigation.test.ts` 3 and 3, `tests/list-frame-guards.test.ts` 1 insertion and 6 deletions, `tests/visual-foundation-guards.test.ts` 1 deletion.
- The CRLF check (as in Task 6 Step 7) on the page prints `697 697`.

- [ ] **Step 9: Commit**

```bash
git add "src/app/[locale]/(dashboard)/audit/findings/page.tsx" messages/th.json messages/en.json tests/list-pages-ui.test.ts tests/operational-return-navigation.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): findings list on PageHeader, StatStrip, TabNav, chips, DataTable and real pages (2B-2 task 8)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 7 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the plan 2B-2 dev-app check (Task 18, spec §8.6 row `/th/audit/findings`):** at 1440, 1024 and 375, with the ledger's filter of Task 0 Step 7 if a list has more than 25 findings:
- the header: "กลับไปรอบตรวจนับ" with a left arrow (an arrow icon at 375); the title 600
- the strip: no fills or icons; the cell of the queue in use light blue with its line and `aria-current="page"` (check in the accessibility tree); "รอพิจารณา" above 0 has the warning foot; 2 × 2 below 1024; clicking a cell keeps the scroll position
- the footer total N equals the number in the current strip cell, for "รอพิจารณา" and for "ทั้งหมด" (the extra count); 25/50/100 keep the queue; "ถัดไป" to page 2; `?page=99` lands on the last page
- from a round's detail page, its findings links (`?status=pending&roundId=…`, and the result filter's `…&findingType=…`): the chips "รอบตรวจ: <auditNo>" and "ประเภท: …" show under the tabs; removing one keeps the other, the queue and the page size
- the table: 13 columns scroll sideways with the hint line at 1024; header white 13/500; "—" for an empty owner and due date
- page 2 → tick a finding → "ถัดไป": nothing is ticked on page 3; "อนุมัติที่เลือก" blue, "ปฏิเสธที่เลือก" red outline (open the dialog, then "ยกเลิก")
- page 2 of a queue → "เปิดคำขอตัดจำหน่าย" opens `disposal/new` with `returnTo` holding `page=2` (its back button still goes to `/disposal`, I22); do not submit
- the load time against Task 0 Step 9 (`withPerformanceTiming` is not on this page; use the navigation timing). If it is clearly slower, record it in DH as a risk; no index (B4).

---

### Task 9: `D/audit/rounds/page.tsx` on the list primitives, with pages cut in memory (B4, I20, I21)

Spec §10.3 (bullet 2B-2), §8.6 row 10, §5.4 row audit/rounds, §5.9.1, §5.9.2 row 7, §5.9.3 (rounds), §6.4 (the `MasterDataSearch` hidden inputs), §4.4.3 row rounds, §4.6.1, §10.4 table A row 2B-2 (VFG:227-230 and `audit-rounds-ux.test.ts:39`), rulings I17, I20, I21 and B4. One page, one commit. The page is CRLF. The query stays whole and read-only (§5.9.2 row 7): its only change is the `{ id: "asc" }` tie-break of `orderBy`. No schema, migration, index, API or message change.

Rulings this task applies:
- **I20:** `QuickFilterBar` keeps its name and becomes a thin wrapper of `TabNav` (link tabs with counts; `aria-current` comes from `TabNav`; `scroll={false}` goes on to `Link`). Only `tests/audit-rounds-ux.test.ts:39` changes, to `/<TabNav\b[\s\S]*?scroll=\{false\}/`; `:11` and `:38` pass unchanged. The selected tab's count chip `bg-primary-foreground/20` (`:597`) goes with it, so VFG R1 becomes `assertWithinBudget(TONE_OPACITY, {})` and its one comment row goes (VFG:226-231, spec §9.2.2). R1 is an inline object in the test call, not one of `p2b-budget.mjs`'s objects, so Step 2 edits it by hand.
- **B4, I21, §5.9.2 row 7:** the view filters (`filterRoundsByView`) and the tab counts need the insight of every round, so the query stays whole and the page is a slice: `parseListPage({ page, pageSize })` → `roundPage` with the page clamped to `lastListPage(filteredRounds.length, pageSize)` (the total is known before the cut, so a page past the end shows the last page without `redirect()`) → `listPageWindow(roundPage)` → `filteredRounds.slice(skip, skip + take)`. The phone cards and the table both render `pageRounds`. The tab counts, `ActionPanel` and the coverage numbers keep counting every round. `orderBy` becomes `[{ createdAt: "desc" }, { id: "asc" }]` (§5.9.1), so two rounds created in the same instant keep one order across requests and no round shows on two pages.
- **§5.9.1, I17:** `buildAuditRoundsHref(locale, view, searchText, listPage = {})` writes the list page through `appendListPage` (page only above 1, pageSize only when not 25), so every default link stays as it is (for example `/th/audit/rounds?view=open`, `tests/audit-round-result-drilldown.test.ts:63`). `auditRoundsReturnHref` carries `roundPage`, so the round detail and the scan screen bring the user back to the same page (`normalizeOperationalReturnTo` keeps `url.search`). The quick-filter tabs, the two `ActionPanel` fallbacks, "ล้างคำค้น" and the search form go back to page 1 and keep the page size. `tests/operational-return-navigation.test.ts:54` is appended to (I17): `…searchText, roundPage\)`.
- **§5.4 row audit/rounds:** `CoverageMetric` ×4 → one `StatStrip` (no tone fills, R-d; LS1). The two coverage gap tables → `DataTable framed={false}`: their box is the frame, so it turns `bg-surface` to keep the white header on white (no frame in a frame). The desktop actions column is `RowActions` (pattern ช1): the first workflow link of the round is the next step ("รอตรวจ 12", "ต้องพิจารณา 3", "นอกขอบเขต 1"), ⋯ holds the other links and "ดู"; a round with no open work has "ดู" as its next step and no ⋯ (`buildRoundRowActions`). The column is pinned right like the 2B-1 lists (2B-1 Task 25 fix 1). `ActionPanel` keeps its layout (phase 3): its count goes through `formatCount` and `bg-background/80` goes. Raw counts (`:268`, `:391`, `:489`, `:628`, the gap numbers) go through `formatCount`; the round code is `tag` (R-p).
- **Ruling (phone cards):** the cards keep `RoundWorkflowLinks` and the "ดู" button (§5.8: "คงโครงการ์ดเดิม"). Desktop no longer uses the chips, so the `compact` prop goes and the chips grow to `min-h-11` (44px, B3); "ดู" becomes `buttonVariants({ variant: "outline" })`.
- **§5.1, I21:** the desktop empty row is `TableEmptyRow`: the one-line "ไม่พบข้อมูล", or with a search term an `ActionEmptyState` whose "ล้างคำค้น" is `secondary`. The phone list shows `EmptyNote padded` (§5.4). **Ruling (copy):** "ล้างคำค้น" reuses `auditPending.clearSearch` (`tPending`): no key of `auditRound` says it, and spec §10.2 adds none for this page.
- **§4.6.1:** the bare root `<div>` becomes `space-y-6` and the `mb-*` of the blocks at the top level go (coverage `mb-6`, `ActionPanel` `mb-4`, `QuickFilterBar` `mb-4`). `MasterDataSearch` keeps its own `mb-4`, so the search sits 16px above its list (I8).
- **§8.7–8.9:** no later 2B plan lists the page, so it joins `MIGRATED_LIST_FILES` in this commit (every row 0; `KEEP` has none).
- **Ruling (test):** the page is not in `B4_LISTS` (its query is not paged and has no `count`); `tests/list-pages-ui.test.ts` gets two tests of its own.

What users will see on `/th/audit/rounds`:
- The list is paged: 25 rounds per page by default, with the range, "หน้า x จาก y", 25/50/100 and words-only buttons. Before, every round was on one page. A page number past the end shows the last page.
- The quick filters are underlined tabs with counts in one row (no filled pills, no translucent count chip). "ตัวกรองด่วน" is now the name a screen reader reads for the tabs, not a visible heading.
- The four coverage numbers are one flat strip; "ยังไม่อยู่ในรอบปีนี้" and "งานค้างในรอบเปิด" lose their orange and red boxes. The gap boxes are white, their tables have the white 13/500 header.
- Desktop rows end in a 120px next step with ⋯ (the other open work and "ดู"); clicking the row still opens the round. Phone cards keep their chips, now 44px tall, and a full-width outline "ดู".
- With a search that finds nothing, desktop offers "ล้างคำค้น" as an outline button.
- "กลับ" (crumb or bottom bar) on a round, and the scan screen's way back, return to the same view, page and page size.

Not in this task: `D/audit/rounds/[id]/page.tsx` (Task 10) · the pending list (Task 11) · `ReadyToCloseBadge` and `AuditStatusBadge` (hand-made pills, 2D) · `formatScope`'s "All assets" (not a 2B item) · messages · docs (Task 19).

**Files:**
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/page.tsx` (`i/lf w/crlf`, 937 lines; 11 exact replacements, Step 4)
- Modify: `tests/audit-rounds-ux.test.ts` (`i/lf w/crlf`, 1 replacement, `:39`)
- Modify: `tests/operational-return-navigation.test.ts` (`i/lf w/crlf`, 1 replacement, `:54`)
- Modify: `tests/visual-foundation-guards.test.ts` (`i/lf w/crlf`; R1 by hand in Step 2, the R7 row through `p2b-budget.mjs`)
- Modify: `tests/list-pages-ui.test.ts` (`i/lf w/crlf`, one block appended with `p2b2-append.mjs`)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`, through `p2b-budget.mjs` only)
- Temp folder only, never committed: `t09-pages-block.ts`, the old and new snippet files of Steps 2 and 4 if you apply them with a script (the task runs Task 1's `p2b2-append.mjs` and `p2b2-tw-probe.mjs`)

**Must keep passing without edits:**
- `tests/audit-rounds-ux.test.ts` (`:8-17` `view\?: string`, `ActionPanel`, `QuickFilterBar`, `ReadyToCloseBadge`, `buildAuditRoundInsights`, `filterRoundsByView`, the three `t("…")`; `:24-33` the workflow shortcuts; `:38` `function QuickFilterBar`) and `:42-66` (messages)
- `tests/operational-return-navigation.test.ts:55-57` (the round detail, scan and findings links with `auditRoundsReturnHref`)
- `tests/audit-round-cancellation.test.ts:104-106`, `:124-140` (`"cancelled"`, `viewCancelled`, `isAuditRoundOperationalStatus`, `auditRoundOperationalWhere`) · `tests/html-lang-and-years.test.ts:15` (`t("coverageTitle", { year: toDisplayYear(currentYear, locale) })`) · `tests/performance-route-instrumentation.test.ts:41-42` (both `withPerformanceTiming` labels)
- `tests/audit-round-result-drilldown.test.ts:63` (default links carry no `page`) · `tests/form-migration-guards.test.ts` (whole file) · `tests/dialog-trigger-handles.test.ts` · `tests/design-tokens-contrast.test.ts` · `tests/list-primitives-ui.test.ts` · `tests/row-actions-ui.test.ts`

**Interfaces:**
- Consumes:
  - `PageHeader({ title, meta?, actions?, back?, breadcrumbs?, compactOnMobile?, className? })` from `@/components/ui/page-header`.
  - From `@/components/ui/data-table`: `DataTable({ children, caption?, framed? = true, layout?, minWidth?, scrollHint?, footer?, className, ...div props })`, `DataTableHeader`, `DataTableBody`, `DataTableHead({ align?: "left" | "right", sort?, sticky?: "left" | "right", hideLabel? })`, `DataTableRow`, `DataTableCell({ align?, numeric?, sticky? })`, `DataTableFoot`, `TableEmptyRow({ colSpan } & ({ children, tone? } | { emptyState: ActionEmptyState props }))`.
  - `Pagination({ page, totalPages, previousHref, nextHref, labels: { navigation, previous, next, pageOf, range?, pageSizeGroup?, rowsPerPage? }, pageSize?, pageSizes?: { value, href }[] })` from `@/components/ui/pagination`.
  - `RowActions({ code, name?, menuLabel, next?: RowNextAction | null, groups: RowActionGroup[], deleteAction?, openerRef?, menu?, className? })` and the types `RowNextAction`, `RowActionGroup` from `@/components/ui/row-actions` (a client module; the page imports the component and two types only).
  - `TabNav({ "aria-label", items: { key, label, href, count?: string, icon? }[], current, scroll?, onSelect?, linkClassName?, className?, ...nav props })` from `@/components/ui/tab-nav`.
  - `StatStrip({ items: { key, label, value: string, unit?, foot?, footTitle?, href?, current?, scroll?, attention? }[], className? })` from `@/components/ui/stat-strip`.
  - `EmptyNote({ tone?, icon?, padded? })` from `@/components/ui/empty-note` · `buttonVariants` from `@/components/ui/button-variants` · `cn` from `@/lib/utils` · `formatCount` from `@/lib/display-format`.
  - `LIST_PAGE_SIZES`, `parseListPage`, `listPageWindow`, `lastListPage`, `appendListPage` from `@/lib/list-pagination` · `paginationRange` from `@/lib/master-data-query`.
  - `MasterDataSearch({ action, defaultValue, placeholder, submitLabel, hiddenInputs?: Record<string, string | number> })` (2B-1 Task 12, unchanged).
  - Keys (all exist): `common.showingRange`, `pageSizeLabel`, `moreActionsFor`, `tableScrollHint`, `pagination`, `previous`, `next`, `pageOf`, `rowsPerPage`, `noData`, `view`, `actions`; `auditPending.clearSearch`.
  - Temp folder (Task 0): `p2b1-precheck.mjs` (`--file`, `--budgets`) and `p2b-budget.mjs`.
  - `node <temp>/p2b2-append.mjs <block file> <test file>` and `node <temp>/p2b2-tw-probe.mjs <file> …` (Task 1 Step 1).
- Produces:
  - The rounds list paged in memory; the file-local `buildAuditRoundsHref(locale, view, searchText, listPage = {})`, `buildRoundRowActions({ links, viewHref, viewLabel }): { next: RowNextAction; groups: RowActionGroup[] }` and `QuickFilterBar` (a `TabNav` wrapper).
  - VFG R1 `assertWithinBudget(TONE_OPACITY, {})`.
  - `tests/list-pages-ui.test.ts`: the tests `audit rounds: PageHeader, StatStrip, the quick filters on TabNav, …` and `audit rounds page in memory: …`.
  - The page in `MIGRATED_LIST_FILES`.

| guard | `D/audit/rounds/page.tsx` before → after |
|---|---|
| VFG R1 | 1 → 0 (budget `{}`) |
| VFG R7 | 1 → – |
| LFG | LH2 2 · LT3 1 · LS1 1 · LN1 1 → all – · joins `MIGRATED_LIST_FILES` |

Running totals of the rows (`p2b1-precheck.mjs --budgets`, with Tasks 1–8 in): R7 22 → 21 (15 rows) · LH2 9 → 7 (5 rows) · LT3 6 → 5 (4 rows) · LS1 21 → 20 (17 rows) · LN1 8 → 7 (6 rows) · R1 1 → 0. Every other guard stays.

- [ ] **Step 1: Check what this task builds on (and the two helper scripts of Task 1)**

Run: `git status --short src tests messages`
Expected: nothing.

Run: `git diff --quiet e3f20ce -- "src/app/[locale]/(dashboard)/audit/rounds/page.tsx" tests/audit-rounds-ux.test.ts && echo UNCHANGED`
Expected: `UNCHANGED` (Tasks 1–8 touch neither file). If not, stop and report: the old snippets below are from `e3f20ce`.

Run: `node <temp>/p2b1-precheck.mjs --file D/audit/rounds/page.tsx`
Expected (exit 0): `file    src/app/[locale]/(dashboard)/audit/rounds/page.tsx (CRLF) · not in MIGRATED_LIST_FILES`, then the rows `R1 1 – – 1`, `R7 1 1 0 1`, `LH2 2 2 0 2`, `LT3 1 1 0 1`, `LS1 1 1 0 1`, `LN1 1 1 0 1` (live = budget = seed) and `args    R7=1:1 LH2=2:2 LT3=1:1 LS1=1:1 LN1=1:1`.

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected (exit 0): `R7 TABLE_HEADER_FILLS 22 in 16 rows`, `LH2 BUDGETS.LH2 9 in 6 rows`, `LT3 BUDGETS.LT3 6 in 5 rows`, `LS1 BUDGETS.LS1 21 in 18 rows`, `LN1 BUDGETS.LN1 8 in 7 rows`, `LB1 … slack 2` (the two `0 → 1` rows) and `budgets hold: no live count is over its row`. A different total means an earlier task of this plan left a row: stop and report.

Run: `ls <temp>/p2b2-append.mjs <temp>/p2b2-tw-probe.mjs`
Expected: both files are there: Task 1 Step 1 saved them. `p2b2-append.mjs` adds a test block in the line ending the file already uses (the test files are CRLF in this working tree, so plan 2B-1's `p2b1-append.mjs`, which refuses CRLF, does not fit); `p2b2-tw-probe.mjs` is the 2B-1 Tailwind probe under a 2B-2 name. Do not save another copy under either name; if one is missing, save it from Task 1 Step 1 without changing a byte.

- [ ] **Step 2: The failing tests**

(a) `tests/audit-rounds-ux.test.ts` (I20). Replace:

```ts
  assert.match(page, /href=\{filter\.href\}[\s\S]*scroll=\{false\}/)
```

with:

```ts
  assert.match(page, /<TabNav\b[\s\S]*?scroll=\{false\}/)
```

(b) `tests/operational-return-navigation.test.ts:54`, appended to (I17). Replace:

```ts
  assert.match(roundsSource, /const auditRoundsReturnHref = buildAuditRoundsHref\(locale, activeView, searchText\)/)
```

with:

```ts
  assert.match(roundsSource, /const auditRoundsReturnHref = buildAuditRoundsHref\(locale, activeView, searchText, roundPage\)/)
```

(c) `tests/visual-foundation-guards.test.ts`, R1 to `{}` and its comment row gone (spec §9.2.2). Replace:

```ts
test("R1 tone colors never fade with opacity", () => {
  assertWithinBudget(TONE_OPACITY, {
    // bg-primary-foreground/20 on the selected tab's count chip; moves to TabNav in phase 2B.
    "src/app/[locale]/(dashboard)/audit/rounds/page.tsx": 1,
  })
})
```

with:

```ts
test("R1 tone colors never fade with opacity", () => {
  assertWithinBudget(TONE_OPACITY, {})
})
```

(d) Save this block as `t09-pages-block.ts` in your temp folder, then run `node <temp>/p2b2-append.mjs <temp>/t09-pages-block.ts tests/list-pages-ui.test.ts` (it prints `… (CRLF)`):

```ts
// Plan 2B-2 Task 9 (spec 2B §5.4 row rounds, §5.9.2 row 7, I20, I21): the audit rounds list. The view filters and the
// tab counts need the insight of every round, so the query stays whole: the list pages in memory and clamps the page.
test("audit rounds: PageHeader, StatStrip, the quick filters on TabNav, and the list on DataTable with RowActions and Pagination (spec 2B §5.4)", () => {
  const source = read(`${D}audit/rounds/page.tsx`)
  for (const part of ["<PageHeader", "<StatStrip", "<TabNav", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<TableEmptyRow", "<ClickableTableRow", "<RowActions", "<DataTableFoot>", "<Pagination"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /<div className="space-y-6">/, "the page root spaces its blocks 24px apart (spec 2B §4.6.1)")
  assert.match(source, /function QuickFilterBar\([\s\S]*?<TabNav\n\s+aria-label=\{title\}/, "QuickFilterBar stays, as a thin wrapper of TabNav (I20)")
  assert.match(source, /<DataTableHead align="right" sticky="right" hideLabel>\{tCommon\("actions"\)\}<\/DataTableHead>/)
  assert.match(source, /<DataTableCell align="right" sticky="right">\s*<RowActions/)
  assert.match(source, /menuLabel=\{tCommon\("moreActionsFor", \{ code: round\.auditNo \}\)\}/, "⋯ is named after its round (I33)")
  assert.match(source, /<DataTable framed=\{false\} className="hidden sm:block" caption=\{title\}>/, "the coverage gap tables sit in their box with no second frame")
})

test("audit rounds page in memory: page and pageSize from the URL, a slice of the filtered rounds, a clamp past the last page (spec 2B §5.9.2 row 7, I21)", () => {
  const source = read(`${D}audit/rounds/page.tsx`)
  assert.match(source, /const listPage = parseListPage\(\{ page, pageSize \}\)/)
  assert.match(source, /const roundPage = \{ page: Math\.min\(listPage\.page, lastListPage\(filteredRounds\.length, listPage\.pageSize\)\), pageSize: listPage\.pageSize \}/)
  assert.match(source, /const \{ skip, take \} = listPageWindow\(roundPage\)\n\s+const pageRounds = filteredRounds\.slice\(skip, skip \+ take\)/)
  assert.equal(source.match(/\bpageRounds\.map\(/g)?.length, 2, "the phone cards and the table both show the page")
  assert.doesNotMatch(source, /\bfilteredRounds\.map\(/, "never every round at once")
  assert.doesNotMatch(source, /\bredirect\(/, "the total is known before the cut, so the page is clamped, not redirected (I21)")
  assert.match(source, /orderBy: \[\{ createdAt: "desc" \}, \{ id: "asc" \}\]/, "the old order plus id, so no round shows on two pages")
  assert.match(source, /const query = appendListPage\(params, listPage\)\.toString\(\)/, "default links stay as they were")
  assert.match(source, /href: buildAuditRoundsHref\(locale, value, searchText, \{ pageSize: listPage\.pageSize \}\)/, "a quick filter goes back to page 1 and keeps the page size")
  assert.match(source, /hiddenInputs=\{\{ \.\.\.\(activeView === "all" \? \{\} : \{ view: activeView \}\), \.\.\.Object\.fromEntries\(appendListPage\(new URLSearchParams\(\), \{ pageSize: listPage\.pageSize \}\)\) \}\}/)
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: buildAuditRoundsHref\(locale, activeView, searchText, \{ pageSize: value \}\) \}\)\)\}/)
})
```

Run: `node --test tests/list-pages-ui.test.ts tests/audit-rounds-ux.test.ts tests/operational-return-navigation.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `fail 5`; every other test passes (`tests/list-pages-ui.test.ts` has 2 more tests than before this step):
- `audit rounds quick filters preserve scroll position`: no match for `/<TabNav\b[\s\S]*?scroll=\{false\}/`
- `audit rounds: PageHeader, StatStrip, the quick filters on TabNav, …`: `no <PageHeader`
- `audit rounds page in memory: …`: no match for `/const listPage = parseListPage\(\{ page, pageSize \}\)/`
- `audit rounds preserve list context across round detail, scan, and pending pages`: no match for `…searchText, roundPage\)/`
- `R1 tone colors never fade with opacity`: `1 matches in 1 files; over budget:` and `src/app/[locale]/(dashboard)/audit/rounds/page.tsx: 1 > 0`

- [ ] **Step 3: Lower the guard rows of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs D/audit/rounds/page.tsx R7=1:0 LH2=2:0 LT3=1:0 LS1=1:0 LN1=1:0 --migrated`
Expected (exit 0):
```
R7: 1 -> 0 (row deleted)
LH2: 2 -> 0 (row deleted)
LT3: 1 -> 0 (row deleted)
LS1: 1 -> 0 (row deleted)
LN1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/audit/rounds/page.tsx
```
The `// 2B-2` comment of `BUDGETS.LH2` goes too: the findings page (Task 8) already left that group, and the script drops a group comment that heads no row.

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 40 · fail 7`, each naming only the rounds page:
- LFG `LH2` (`LH2: 9 in 6 files` and `src/app/[locale]/(dashboard)/audit/rounds/page.tsx: 2 > 0`), `LT3` (`6 in 5 files`, `1 > 0`), `LS1` (`21 in 18 files`, `1 > 0`), `LN1` (`8 in 7 files`, `1 > 0`) and `L0` with the same four lines
- VFG `R1 tone colors never fade with opacity` (as in Step 2) and `R7 interim: …` (`22 matches in 16 files; over budget:` and the page `1 > 0`)

- [ ] **Step 4: Move the page onto the primitives (`src/app/[locale]/(dashboard)/audit/rounds/page.tsx`, CRLF)**

Eleven exact replacements, top to bottom. Make all of them before you compile.

(1) Imports and the props type. Replace:

```tsx
import Link from "next/link"
import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, CheckCircle2, ClipboardCheck, Eye, ListFilter, ScanLine } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { ColumnHeader, MasterDataHeader, MasterDataSearch } from "@/components/master-data/master-data-layout"
import { formatDate } from "@/lib/utils"
import { toDisplayYear } from "@/lib/display-year"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { AuditProgressBar } from "@/components/audit/audit-progress-bar"
import { getDesktopTableOnlyClasses, getMobileCardListClasses } from "@/lib/design-system"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import { auditRoundCoverageWhere, auditRoundOperationalWhere, isAuditRoundOperationalStatus } from "@/lib/audit-round-status"
import { withPerformanceTiming } from "@/lib/performance-timing"

type AuditRoundsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; view?: string }>
}
```

with:

```tsx
import Link from "next/link"
import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, CheckCircle2, ClipboardCheck, Eye, ListChecks, Plus, ScanLine } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { MasterDataSearch } from "@/components/master-data/master-data-layout"
import { cn, formatDate } from "@/lib/utils"
import { toDisplayYear } from "@/lib/display-year"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { AuditProgressBar } from "@/components/audit/audit-progress-bar"
import { buttonVariants } from "@/components/ui/button-variants"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, DataTableRow, TableEmptyRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions, type RowActionGroup, type RowNextAction } from "@/components/ui/row-actions"
import { StatStrip } from "@/components/ui/stat-strip"
import { TabNav } from "@/components/ui/tab-nav"
import { getDesktopTableOnlyClasses, getMobileCardListClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, appendListPage, lastListPage, listPageWindow, parseListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import { auditRoundCoverageWhere, auditRoundOperationalWhere, isAuditRoundOperationalStatus } from "@/lib/audit-round-status"
import { withPerformanceTiming } from "@/lib/performance-timing"

type AuditRoundsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; view?: string; page?: string | string[]; pageSize?: string | string[] }>
}
```

(2) The URL state. Replace:

```tsx
  const { search = "", view = "all" } = await searchParams
  await requirePagePermission(locale, "audit", "view")

  const t = await getTranslations("auditRound")
  const tCommon = await getTranslations("common")
  const searchText = search.trim()
  const activeView: AuditRoundView = auditRoundViewValues.includes(view as AuditRoundView) ? (view as AuditRoundView) : "all"
```

with:

```tsx
  const { search = "", view = "all", page, pageSize } = await searchParams
  await requirePagePermission(locale, "audit", "view")

  const t = await getTranslations("auditRound")
  const tCommon = await getTranslations("common")
  const tPending = await getTranslations("auditPending")
  const searchText = search.trim()
  const activeView: AuditRoundView = auditRoundViewValues.includes(view as AuditRoundView) ? (view as AuditRoundView) : "all"
  const listPage = parseListPage({ page, pageSize })
```

(3) The order of the rounds query gets its tie-break (the query is otherwise unchanged). Replace:

```tsx
        orderBy: { createdAt: "desc" },
      }),
      prisma.asset.findMany({
```

with:

```tsx
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      }),
      prisma.asset.findMany({
```

(4) The page slice, the return href with the page, and the filter links that keep the page size. Replace:

```tsx
  const filteredRounds = filterRoundsByView(rounds, insightsByRoundId, activeView)
  const pendingRounds = rounds.filter((round) => (insightsByRoundId.get(round.id)?.pending ?? 0) > 0 && isAuditRoundOperationalStatus(round.status))
  const reviewRounds = rounds.filter((round) => (insightsByRoundId.get(round.id)?.followUps ?? 0) > 0 && isAuditRoundOperationalStatus(round.status))
  const readyRounds = rounds.filter((round) => insightsByRoundId.get(round.id)?.readyToClose)
  const viewLabels: Record<AuditRoundView, string> = {
    all: t("viewAll"),
    open: t("viewOpen"),
    pending: t("viewPending"),
    review: t("viewReview"),
    mismatch: t("viewMismatch"),
    readyToClose: t("viewReadyToClose"),
    cancelled: t("viewCancelled"),
  }
  const auditRoundsReturnHref = buildAuditRoundsHref(locale, activeView, searchText)
  const quickFilters = auditRoundViewValues.map((value) => ({
    value,
    label: viewLabels[value],
    count: filterRoundsByView(rounds, insightsByRoundId, value).length,
    href: buildAuditRoundsHref(locale, value, searchText),
  }))
  const actionItems: ActionPanelItem[] = [
    {
      label: t("actionContinueScan"),
      help: t("actionContinueScanHelp"),
      count: pendingRounds.reduce((sum, round) => sum + (insightsByRoundId.get(round.id)?.pending ?? 0), 0),
      href: pendingRounds[0] ? appendOperationalReturnTo(`/${locale}/audit/rounds/${pendingRounds[0].id}/scan`, auditRoundsReturnHref) : buildAuditRoundsHref(locale, "pending", searchText),
      icon: <ScanLine className="h-5 w-5" />,
      tone: "primary",
    },
    {
      label: t("actionReviewFindings"),
      help: t("actionReviewFindingsHelp"),
      count: reviewRounds.reduce((sum, round) => sum + (insightsByRoundId.get(round.id)?.followUps ?? 0), 0),
      href: appendOperationalReturnTo(`/${locale}/audit/findings?status=pending`, auditRoundsReturnHref),
      icon: <AlertTriangle className="h-5 w-5" />,
      tone: "warning",
    },
    {
      label: t("actionCloseReadyRounds"),
      help: t("actionCloseReadyRoundsHelp"),
      count: readyRounds.length,
      href: readyRounds[0] ? appendOperationalReturnTo(`/${locale}/audit/rounds/${readyRounds[0].id}`, auditRoundsReturnHref) : buildAuditRoundsHref(locale, "readyToClose", searchText),
      icon: <ClipboardCheck className="h-5 w-5" />,
      tone: "success",
    },
  ]
```

with:

```tsx
  const filteredRounds = filterRoundsByView(rounds, insightsByRoundId, activeView)
  // Real pages (spec 2B B4, §5.9.2 row 7, I21): the view filters and the tab counts need the insight of every round,
  // so the query stays whole and the page is a slice of filteredRounds. The total is known before the cut, so a page
  // past the last one is clamped to the last page instead of redirecting.
  const roundPage = { page: Math.min(listPage.page, lastListPage(filteredRounds.length, listPage.pageSize)), pageSize: listPage.pageSize }
  const { skip, take } = listPageWindow(roundPage)
  const pageRounds = filteredRounds.slice(skip, skip + take)
  const { start, end, totalPages } = paginationRange(roundPage.page, roundPage.pageSize, filteredRounds.length)
  const pendingRounds = rounds.filter((round) => (insightsByRoundId.get(round.id)?.pending ?? 0) > 0 && isAuditRoundOperationalStatus(round.status))
  const reviewRounds = rounds.filter((round) => (insightsByRoundId.get(round.id)?.followUps ?? 0) > 0 && isAuditRoundOperationalStatus(round.status))
  const readyRounds = rounds.filter((round) => insightsByRoundId.get(round.id)?.readyToClose)
  const viewLabels: Record<AuditRoundView, string> = {
    all: t("viewAll"),
    open: t("viewOpen"),
    pending: t("viewPending"),
    review: t("viewReview"),
    mismatch: t("viewMismatch"),
    readyToClose: t("viewReadyToClose"),
    cancelled: t("viewCancelled"),
  }
  // The round detail and scan pages bring the user back to this page and page size (B4 returnTo).
  const auditRoundsReturnHref = buildAuditRoundsHref(locale, activeView, searchText, roundPage)
  // A filter link goes back to page 1 and keeps the page size (spec 2B §5.9.1).
  const quickFilters = auditRoundViewValues.map((value) => ({
    value,
    label: viewLabels[value],
    count: filterRoundsByView(rounds, insightsByRoundId, value).length,
    href: buildAuditRoundsHref(locale, value, searchText, { pageSize: listPage.pageSize }),
  }))
  const clearSearchHref = buildAuditRoundsHref(locale, activeView, "", { pageSize: listPage.pageSize })
  const actionItems: ActionPanelItem[] = [
    {
      label: t("actionContinueScan"),
      help: t("actionContinueScanHelp"),
      count: pendingRounds.reduce((sum, round) => sum + (insightsByRoundId.get(round.id)?.pending ?? 0), 0),
      href: pendingRounds[0] ? appendOperationalReturnTo(`/${locale}/audit/rounds/${pendingRounds[0].id}/scan`, auditRoundsReturnHref) : buildAuditRoundsHref(locale, "pending", searchText, { pageSize: listPage.pageSize }),
      icon: <ScanLine className="h-5 w-5" />,
      tone: "primary",
    },
    {
      label: t("actionReviewFindings"),
      help: t("actionReviewFindingsHelp"),
      count: reviewRounds.reduce((sum, round) => sum + (insightsByRoundId.get(round.id)?.followUps ?? 0), 0),
      href: appendOperationalReturnTo(`/${locale}/audit/findings?status=pending`, auditRoundsReturnHref),
      icon: <AlertTriangle className="h-5 w-5" />,
      tone: "warning",
    },
    {
      label: t("actionCloseReadyRounds"),
      help: t("actionCloseReadyRoundsHelp"),
      count: readyRounds.length,
      href: readyRounds[0] ? appendOperationalReturnTo(`/${locale}/audit/rounds/${readyRounds[0].id}`, auditRoundsReturnHref) : buildAuditRoundsHref(locale, "readyToClose", searchText, { pageSize: listPage.pageSize }),
      icon: <ClipboardCheck className="h-5 w-5" />,
      tone: "success",
    },
  ]
```

(5) The root, the header, the coverage numbers and the search form. Replace:

```tsx
  return (
    <div>
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={`/${locale}/audit/rounds/new`}
        createLabel={t("createTitle")}
      />

      <section className="mb-6 rounded-lg border border-border bg-surface p-4">
        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("coverageTitle", { year: toDisplayYear(currentYear, locale) })}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("coverageHelp")}</p>
          </div>
          <div className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            {t("coverageRoundCount")}: <span className="font-semibold text-foreground">{currentYearRoundCount}</span>
          </div>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CoverageMetric label={t("coverageActiveAssets")} value={activeAssets.length} />
          <CoverageMetric label={t("coverageCoveredThisYear")} value={coveredAssetCount} />
          <CoverageMetric label={t("coverageUncoveredThisYear")} value={uncoveredAssetCount} tone="warning" />
          <CoverageMetric label={t("coverageOpenPending")} value={openPendingItems + openFollowUpCount} tone="danger" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
          <AuditProgressBar
            total={activeAssets.length}
            processed={coveredAssetCount}
            pending={uncoveredAssetCount}
            label={t("coverageProgress")}
            processedLabel={t("coverageCoveredLabel")}
            pendingLabel={t("coverageMissingLabel")}
            breakdown={[
              { label: t("coverageCoveredLabel"), value: coveredAssetCount, tone: "success" },
              { label: t("coverageMissingLabel"), value: uncoveredAssetCount, tone: "warning" },
              { label: t("scanned"), value: openProcessedItems, tone: "info" },
              { label: t("pendingReview"), value: openFollowUpCount, tone: "danger" },
            ]}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <CoverageGapList
              title={t("coverageByCategory")}
              help={t("coverageGapHelp")}
              rows={categoryGaps}
              emptyLabel={t("coverageNoGaps")}
              labels={{
                group: t("coverageGroup"),
                missing: t("coverageMissing"),
                total: t("coverageTotal"),
                rate: t("coverageRate"),
              }}
            />
            <CoverageGapList
              title={t("coverageByDepartment")}
              help={t("coverageGapHelp")}
              rows={departmentGaps}
              emptyLabel={t("coverageNoGaps")}
              labels={{
                group: t("coverageGroup"),
                missing: t("coverageMissing"),
                total: t("coverageTotal"),
                rate: t("coverageRate"),
              }}
            />
          </div>
        </div>
      </section>

      <ActionPanel title={t("nextActionsTitle")} help={t("nextActionsHelp")} actions={actionItems} />

      <QuickFilterBar title={t("quickFiltersTitle")} activeView={activeView} filters={quickFilters} />

      <MasterDataSearch
        action={`/${locale}/audit/rounds`}
        defaultValue={searchText}
        placeholder={tCommon("search")}
        submitLabel={tCommon("search")}
        hiddenInputs={activeView === "all" ? undefined : { view: activeView }}
      />
```

with:

```tsx
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <Link href={`/${locale}/audit/rounds/new`} className={buttonVariants({ size: "md" })}>
            <Plus aria-hidden="true" />
            {t("createTitle")}
          </Link>
        }
      />

      <section className="rounded-lg border border-border bg-surface p-4">
        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("coverageTitle", { year: toDisplayYear(currentYear, locale) })}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("coverageHelp")}</p>
          </div>
          <div className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            {t("coverageRoundCount")}: <span className="font-semibold text-foreground">{formatCount(currentYearRoundCount)}</span>
          </div>
        </div>

        <StatStrip
          className="mb-4"
          items={[
            { key: "activeAssets", label: t("coverageActiveAssets"), value: formatCount(activeAssets.length) },
            { key: "covered", label: t("coverageCoveredThisYear"), value: formatCount(coveredAssetCount) },
            { key: "uncovered", label: t("coverageUncoveredThisYear"), value: formatCount(uncoveredAssetCount) },
            { key: "openPending", label: t("coverageOpenPending"), value: formatCount(openPendingItems + openFollowUpCount) },
          ]}
        />

        <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
          <AuditProgressBar
            total={activeAssets.length}
            processed={coveredAssetCount}
            pending={uncoveredAssetCount}
            label={t("coverageProgress")}
            processedLabel={t("coverageCoveredLabel")}
            pendingLabel={t("coverageMissingLabel")}
            breakdown={[
              { label: t("coverageCoveredLabel"), value: coveredAssetCount, tone: "success" },
              { label: t("coverageMissingLabel"), value: uncoveredAssetCount, tone: "warning" },
              { label: t("scanned"), value: openProcessedItems, tone: "info" },
              { label: t("pendingReview"), value: openFollowUpCount, tone: "danger" },
            ]}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <CoverageGapList
              title={t("coverageByCategory")}
              help={t("coverageGapHelp")}
              rows={categoryGaps}
              emptyLabel={t("coverageNoGaps")}
              labels={{
                group: t("coverageGroup"),
                missing: t("coverageMissing"),
                total: t("coverageTotal"),
                rate: t("coverageRate"),
              }}
            />
            <CoverageGapList
              title={t("coverageByDepartment")}
              help={t("coverageGapHelp")}
              rows={departmentGaps}
              emptyLabel={t("coverageNoGaps")}
              labels={{
                group: t("coverageGroup"),
                missing: t("coverageMissing"),
                total: t("coverageTotal"),
                rate: t("coverageRate"),
              }}
            />
          </div>
        </div>
      </section>

      <ActionPanel title={t("nextActionsTitle")} help={t("nextActionsHelp")} actions={actionItems} />

      <QuickFilterBar title={t("quickFiltersTitle")} activeView={activeView} filters={quickFilters} />

      <MasterDataSearch
        action={`/${locale}/audit/rounds`}
        defaultValue={searchText}
        placeholder={tCommon("search")}
        submitLabel={tCommon("search")}
        hiddenInputs={{ ...(activeView === "all" ? {} : { view: activeView }), ...Object.fromEntries(appendListPage(new URLSearchParams(), { pageSize: listPage.pageSize })) }}
      />
```

(6) The list: phone cards and table on `pageRounds`, `RowActions`, the empty rows and the pager. Replace:

```tsx
      <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
        <div className={`${getMobileCardListClasses()} p-3`}>
          {filteredRounds.length === 0 ? (
            <div className="rounded-md border border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
              {tCommon("noData")}
            </div>
          ) : (
            filteredRounds.map((round) => {
              const progress = progressByRoundId.get(round.id) ?? { pending: round._count.items, processed: 0 }
              const insight = insightsByRoundId.get(round.id) ?? {
                pending: progress.pending,
                processed: progress.processed,
                followUps: 0,
                outOfScope: 0,
                hasMismatch: round._count.findings > 0,
                readyToClose: false,
              }
              const roundDetailHref = appendOperationalReturnTo(`/${locale}/audit/rounds/${round.id}`, auditRoundsReturnHref)
              const workflowLinks = buildAuditRoundWorkflowLinks({
                locale,
                roundId: round.id,
                status: round.status,
                returnTo: auditRoundsReturnHref,
                insight,
                labels: {
                  pending: t("roundActionPending"),
                  review: t("roundActionReview"),
                  outOfScope: t("roundActionOutOfScope"),
                },
              })

              return (
                <article key={round.id} className="min-w-0 rounded-md border border-border bg-background p-3">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={roundDetailHref} className="break-words text-sm font-semibold text-foreground hover:text-primary">
                        {round.auditNo}
                      </Link>
                      <p className="mt-1 line-clamp-2 text-sm text-foreground">{round.name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <AuditStatusBadge status={round.status} label={getAuditRoundStatusLabel(round.status, t)} />
                      <ReadyToCloseBadge
                        status={round.status}
                        insight={insight}
                        labels={{
                          ready: t("readyToClose"),
                          pending: t("blockedPendingItems", { count: insight.pending }),
                          review: t("blockedPendingReview", { count: insight.followUps }),
                        }}
                      />
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm">
                    <MobileAuditField label={t("scope")} value={formatScope(round)} />
                    <MobileAuditField label={t("dateRange")} value={`${formatDate(round.startDate)} - ${formatDate(round.endDate)}`} />
                    <MobileAuditField label={t("items")} value={String(round._count.items)} />
                  </div>
                  <div className="mt-3">
                    <AuditProgressBar
                      compact
                      total={round._count.items}
                      processed={progress.processed}
                      pending={progress.pending}
                      label={t("progress")}
                      processedLabel={t("scanned")}
                      pendingLabel={t("pending")}
                    />
                  </div>
                  <RoundWorkflowLinks links={workflowLinks} />
                  <Link
                    href={roundDetailHref}
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    <Eye className="h-4 w-4" />
                    {tCommon("view")}
                  </Link>
                </article>
              )
            })
          )}
        </div>
        <div className={`${getDesktopTableOnlyClasses()} overflow-x-auto`}>
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <ColumnHeader>{t("auditNo")}</ColumnHeader>
                <ColumnHeader>{t("name")}</ColumnHeader>
                <ColumnHeader>{t("scope")}</ColumnHeader>
                <ColumnHeader>{t("dateRange")}</ColumnHeader>
                <ColumnHeader>{t("status")}</ColumnHeader>
                <ColumnHeader align="right">{t("items")}</ColumnHeader>
                <ColumnHeader>{t("progress")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRounds.length === 0 ? (
                <tr>
                  <td colSpan={8} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
              ) : (
                filteredRounds.map((round) => {
                  const progress = progressByRoundId.get(round.id) ?? { pending: round._count.items, processed: 0 }
                  const insight = insightsByRoundId.get(round.id) ?? {
                    pending: progress.pending,
                    processed: progress.processed,
                    followUps: 0,
                    outOfScope: 0,
                    hasMismatch: round._count.findings > 0,
                    readyToClose: false,
                  }
                  const roundDetailHref = appendOperationalReturnTo(`/${locale}/audit/rounds/${round.id}`, auditRoundsReturnHref)
                  const workflowLinks = buildAuditRoundWorkflowLinks({
                    locale,
                    roundId: round.id,
                    status: round.status,
                    returnTo: auditRoundsReturnHref,
                    insight,
                    labels: {
                      pending: t("roundActionPending"),
                      review: t("roundActionReview"),
                      outOfScope: t("roundActionOutOfScope"),
                    },
                  })

                  return (
                    <ClickableTableRow
                      key={round.id}
                      href={roundDetailHref}
                      label={`${tCommon("view")}: ${round.auditNo}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{round.auditNo}</td>
                      <td className="min-w-56 px-4 py-3 text-foreground">{round.name}</td>
                      <td className="min-w-64 px-4 py-3 text-muted-foreground">{formatScope(round)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {formatDate(round.startDate)} - {formatDate(round.endDate)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <AuditStatusBadge status={round.status} label={getAuditRoundStatusLabel(round.status, t)} />
                          <ReadyToCloseBadge
                            status={round.status}
                            insight={insight}
                            labels={{
                              ready: t("readyToClose"),
                              pending: t("blockedPendingItems", { count: insight.pending }),
                              review: t("blockedPendingReview", { count: insight.followUps }),
                            }}
                          />
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-muted-foreground">{round._count.items}</td>
                      <td className="min-w-52 px-4 py-3">
                        <AuditProgressBar
                          compact
                          total={round._count.items}
                          processed={progress.processed}
                          pending={progress.pending}
                          label={t("progress")}
                          processedLabel={t("scanned")}
                          pendingLabel={t("pending")}
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex min-w-0 justify-end gap-2">
                          <RoundWorkflowLinks links={workflowLinks} compact />
                          <Link
                            href={roundDetailHref}
                            title={tCommon("view")}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary-soft"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </ClickableTableRow>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

with:

```tsx
      <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
        <div className={`${getMobileCardListClasses()} p-3`}>
          {pageRounds.length === 0 ? (
            <EmptyNote padded>{tCommon("noData")}</EmptyNote>
          ) : (
            pageRounds.map((round) => {
              const progress = progressByRoundId.get(round.id) ?? { pending: round._count.items, processed: 0 }
              const insight = insightsByRoundId.get(round.id) ?? {
                pending: progress.pending,
                processed: progress.processed,
                followUps: 0,
                outOfScope: 0,
                hasMismatch: round._count.findings > 0,
                readyToClose: false,
              }
              const roundDetailHref = appendOperationalReturnTo(`/${locale}/audit/rounds/${round.id}`, auditRoundsReturnHref)
              const workflowLinks = buildAuditRoundWorkflowLinks({
                locale,
                roundId: round.id,
                status: round.status,
                returnTo: auditRoundsReturnHref,
                insight,
                labels: {
                  pending: t("roundActionPending"),
                  review: t("roundActionReview"),
                  outOfScope: t("roundActionOutOfScope"),
                },
              })

              return (
                <article key={round.id} className="min-w-0 rounded-md border border-border bg-background p-3">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={roundDetailHref} className="break-words text-sm font-semibold text-foreground hover:text-primary">
                        <span className="tag font-medium">{round.auditNo}</span>
                      </Link>
                      <p className="mt-1 line-clamp-2 text-sm text-foreground">{round.name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <AuditStatusBadge status={round.status} label={getAuditRoundStatusLabel(round.status, t)} />
                      <ReadyToCloseBadge
                        status={round.status}
                        insight={insight}
                        labels={{
                          ready: t("readyToClose"),
                          pending: t("blockedPendingItems", { count: insight.pending }),
                          review: t("blockedPendingReview", { count: insight.followUps }),
                        }}
                      />
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm">
                    <MobileAuditField label={t("scope")} value={formatScope(round)} />
                    <MobileAuditField label={t("dateRange")} value={`${formatDate(round.startDate)} - ${formatDate(round.endDate)}`} />
                    <MobileAuditField label={t("items")} value={formatCount(round._count.items)} />
                  </div>
                  <div className="mt-3">
                    <AuditProgressBar
                      compact
                      total={round._count.items}
                      processed={progress.processed}
                      pending={progress.pending}
                      label={t("progress")}
                      processedLabel={t("scanned")}
                      pendingLabel={t("pending")}
                    />
                  </div>
                  <RoundWorkflowLinks links={workflowLinks} />
                  <Link href={roundDetailHref} className={cn(buttonVariants({ variant: "outline" }), "mt-3 w-full")}>
                    <Eye aria-hidden="true" />
                    {tCommon("view")}
                  </Link>
                </article>
              )
            })
          )}
        </div>
        <DataTable framed={false} className={getDesktopTableOnlyClasses()} caption={t("title")} scrollHint={tCommon("tableScrollHint")}>
          <DataTableHeader>
            <tr>
              <DataTableHead>{t("auditNo")}</DataTableHead>
              <DataTableHead>{t("name")}</DataTableHead>
              <DataTableHead>{t("scope")}</DataTableHead>
              <DataTableHead>{t("dateRange")}</DataTableHead>
              <DataTableHead>{t("status")}</DataTableHead>
              <DataTableHead align="right">{t("items")}</DataTableHead>
              <DataTableHead>{t("progress")}</DataTableHead>
              <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {pageRounds.length === 0 ? (
              searchText ? (
                <TableEmptyRow
                  colSpan={8}
                  emptyState={{ title: tCommon("noData"), actionHref: clearSearchHref, actionLabel: tPending("clearSearch"), actionVariant: "secondary" }}
                />
              ) : (
                <TableEmptyRow colSpan={8}>{tCommon("noData")}</TableEmptyRow>
              )
            ) : (
              pageRounds.map((round) => {
                const progress = progressByRoundId.get(round.id) ?? { pending: round._count.items, processed: 0 }
                const insight = insightsByRoundId.get(round.id) ?? {
                  pending: progress.pending,
                  processed: progress.processed,
                  followUps: 0,
                  outOfScope: 0,
                  hasMismatch: round._count.findings > 0,
                  readyToClose: false,
                }
                const roundDetailHref = appendOperationalReturnTo(`/${locale}/audit/rounds/${round.id}`, auditRoundsReturnHref)
                const workflowLinks = buildAuditRoundWorkflowLinks({
                  locale,
                  roundId: round.id,
                  status: round.status,
                  returnTo: auditRoundsReturnHref,
                  insight,
                  labels: {
                    pending: t("roundActionPending"),
                    review: t("roundActionReview"),
                    outOfScope: t("roundActionOutOfScope"),
                  },
                })
                const rowActions = buildRoundRowActions({ links: workflowLinks, viewHref: roundDetailHref, viewLabel: tCommon("view") })

                return (
                  <ClickableTableRow
                    key={round.id}
                    href={roundDetailHref}
                    label={`${tCommon("view")}: ${round.auditNo}`}
                  >
                    <DataTableCell className="whitespace-nowrap">
                      <span className="tag font-medium text-foreground">{round.auditNo}</span>
                    </DataTableCell>
                    <DataTableCell className="min-w-56 text-foreground">{round.name}</DataTableCell>
                    <DataTableCell className="min-w-64 text-muted-foreground">{formatScope(round)}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(round.startDate)} - {formatDate(round.endDate)}
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <div className="flex flex-col items-start gap-1">
                        <AuditStatusBadge status={round.status} label={getAuditRoundStatusLabel(round.status, t)} />
                        <ReadyToCloseBadge
                          status={round.status}
                          insight={insight}
                          labels={{
                            ready: t("readyToClose"),
                            pending: t("blockedPendingItems", { count: insight.pending }),
                            review: t("blockedPendingReview", { count: insight.followUps }),
                          }}
                        />
                      </div>
                    </DataTableCell>
                    <DataTableCell numeric className="text-muted-foreground">{formatCount(round._count.items)}</DataTableCell>
                    <DataTableCell className="min-w-52">
                      <AuditProgressBar
                        compact
                        total={round._count.items}
                        processed={progress.processed}
                        pending={progress.pending}
                        label={t("progress")}
                        processedLabel={t("scanned")}
                        pendingLabel={t("pending")}
                      />
                    </DataTableCell>
                    <DataTableCell align="right" sticky="right">
                      <RowActions
                        code={round.auditNo}
                        name={round.name}
                        menuLabel={tCommon("moreActionsFor", { code: round.auditNo })}
                        next={rowActions.next}
                        groups={rowActions.groups}
                      />
                    </DataTableCell>
                  </ClickableTableRow>
                )
              })
            )}
          </DataTableBody>
        </DataTable>
        {filteredRounds.length > 0 ? (
          <DataTableFoot>
            <Pagination
              page={roundPage.page}
              totalPages={totalPages}
              previousHref={buildAuditRoundsHref(locale, activeView, searchText, { page: roundPage.page - 1, pageSize: roundPage.pageSize })}
              nextHref={buildAuditRoundsHref(locale, activeView, searchText, { page: roundPage.page + 1, pageSize: roundPage.pageSize })}
              pageSize={roundPage.pageSize}
              pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: buildAuditRoundsHref(locale, activeView, searchText, { pageSize: value }) }))}
              labels={{
                navigation: tCommon("pagination"),
                previous: tCommon("previous"),
                next: tCommon("next"),
                pageOf: tCommon("pageOf", { page: roundPage.page, total: totalPages }),
                range: tCommon("showingRange", { from: formatCount(start), to: formatCount(end), total: formatCount(filteredRounds.length) }),
                pageSizeGroup: tCommon("pageSizeLabel"),
                rowsPerPage: tCommon("rowsPerPage"),
              }}
            />
          </DataTableFoot>
        ) : null}
      </div>
    </div>
  )
}
```

(7) `ActionPanel` (layout kept), `QuickFilterBar` on `TabNav` (I20) and the phone chips. Replace:

```tsx
function ActionPanel({ title, help, actions }: { title: string; help: string; actions: ActionPanelItem[] }) {
  return (
    <section className="mb-4 rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{help}</p>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {actions.map((action) => {
          const toneClass =
            action.tone === "success"
              ? "border-success-border bg-success-soft text-success hover:bg-success-soft"
              : action.tone === "warning"
                ? "border-warning-border bg-warning-soft text-warning hover:bg-warning-soft"
                : "border-primary-border bg-primary-soft text-primary hover:bg-primary-soft"

          return (
            <Link
              key={action.label}
              href={action.href}
              className={`flex min-h-24 items-center justify-between gap-3 rounded-md border px-4 py-3 transition-colors ${toneClass}`}
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-background/80">{action.icon}</div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">{action.label}</div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{action.help}</p>
                </div>
              </div>
              <div className="shrink-0 text-2xl font-bold tabular-nums text-foreground">{action.count}</div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function QuickFilterBar({
  title,
  activeView,
  filters,
}: {
  title: string
  activeView: AuditRoundView
  filters: Array<{ value: AuditRoundView; label: string; count: number; href: string }>
}) {
  return (
    <section className="mb-4 rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <ListFilter className="h-4 w-4 text-primary" />
        {title}
      </div>
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const active = filter.value === activeView

          return (
            <Link
              key={filter.value}
              href={filter.href}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-accent"
              }`}
            >
              <span>{filter.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"}`}>
                {filter.count}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function RoundWorkflowLinks({ links, compact = false }: { links: RoundWorkflowLink[]; compact?: boolean }) {
  if (links.length === 0) return null

  return (
    <div className={`mt-3 flex flex-wrap gap-2 ${compact ? "mt-0 justify-end" : ""}`}>
      {links.map((link) => {
        const toneClass =
          link.tone === "danger"
            ? "border-danger-border bg-danger-soft text-danger hover:bg-danger-soft"
            : link.tone === "info"
              ? "border-info-border bg-info-soft text-info hover:bg-info-soft"
              : "border-warning-border bg-warning-soft text-warning hover:bg-warning-soft"

        return (
          <Link
            key={link.key}
            href={link.href}
            className={`inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors ${toneClass}`}
          >
            <span>{link.label}</span>
            <span className="tabular-nums">{link.count}</span>
          </Link>
        )
      })}
    </div>
  )
}
```

with:

```tsx
function ActionPanel({ title, help, actions }: { title: string; help: string; actions: ActionPanelItem[] }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{help}</p>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {actions.map((action) => {
          const toneClass =
            action.tone === "success"
              ? "border-success-border bg-success-soft text-success hover:bg-success-soft"
              : action.tone === "warning"
                ? "border-warning-border bg-warning-soft text-warning hover:bg-warning-soft"
                : "border-primary-border bg-primary-soft text-primary hover:bg-primary-soft"

          return (
            <Link
              key={action.label}
              href={action.href}
              className={`flex min-h-24 items-center justify-between gap-3 rounded-md border px-4 py-3 transition-colors ${toneClass}`}
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md">{action.icon}</div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">{action.label}</div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{action.help}</p>
                </div>
              </div>
              <div className="shrink-0 text-2xl font-bold tabular-nums text-foreground">{formatCount(action.count)}</div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

// A thin wrapper of TabNav (spec 2B I20): the quick filters change the URL, so they are link tabs with counts. TabNav
// sets aria-current on the selected tab and passes scroll={false} to Link, so the page stays where it is.
function QuickFilterBar({
  title,
  activeView,
  filters,
}: {
  title: string
  activeView: AuditRoundView
  filters: Array<{ value: AuditRoundView; label: string; count: number; href: string }>
}) {
  return (
    <TabNav
      aria-label={title}
      items={filters.map((filter) => ({ key: filter.value, label: filter.label, count: formatCount(filter.count), href: filter.href }))}
      current={activeView}
      scroll={false}
    />
  )
}

// The workflow links of a phone card. On desktop the same links sit in RowActions (buildRoundRowActions).
function RoundWorkflowLinks({ links }: { links: RoundWorkflowLink[] }) {
  if (links.length === 0) return null

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {links.map((link) => {
        const toneClass =
          link.tone === "danger"
            ? "border-danger-border bg-danger-soft text-danger hover:bg-danger-soft"
            : link.tone === "info"
              ? "border-info-border bg-info-soft text-info hover:bg-info-soft"
              : "border-warning-border bg-warning-soft text-warning hover:bg-warning-soft"

        return (
          <Link
            key={link.key}
            href={link.href}
            className={`inline-flex min-h-11 items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors ${toneClass}`}
          >
            <span>{link.label}</span>
            <span className="tabular-nums">{formatCount(link.count)}</span>
          </Link>
        )
      })}
    </div>
  )
}
```

(8) `CoverageMetric` goes (LS1). Replace:

```tsx

  return null
}

function CoverageMetric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "warning" | "danger" }) {
  const toneClass =
    tone === "danger"
      ? "border-danger-border bg-danger-soft text-danger"
      : tone === "warning"
        ? "border-warning-border bg-warning-soft text-warning"
        : "border-border bg-background text-foreground"

  return (
    <div className={`rounded-md border px-3 py-3 ${toneClass}`}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  )
}

function MobileAuditField({ label, value }: { label: string; value: string }) {
```

with:

```tsx
  return null
}

function MobileAuditField({ label, value }: { label: string; value: string }) {
```

(9) The coverage gap box and its table. Replace:

```tsx
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{help}</p>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-md border border-border bg-surface px-3 py-4 text-sm text-muted-foreground">{emptyLabel}</div>
      ) : (
        <>
          <div className="grid gap-2 sm:hidden">
            {rows.map((row) => (
              <div key={row.id} className="rounded-md border border-border bg-surface p-3">
                <div className="break-words text-sm font-medium text-foreground">
                  {row.href ? (
                    <Link href={row.href} className="text-primary hover:underline">
                      {row.label}
                    </Link>
                  ) : (
                    row.label
                  )}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <MobileAuditField label={labels.missing} value={String(row.missing)} />
                  <MobileAuditField label={labels.total} value={String(row.total)} />
                  <MobileAuditField label={labels.rate} value={`${row.percent}%`} />
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto sm:block">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-2 py-2 text-left font-medium">{labels.group}</th>
                  <th className="px-2 py-2 text-right font-medium">{labels.missing}</th>
                  <th className="px-2 py-2 text-right font-medium">{labels.total}</th>
                  <th className="px-2 py-2 text-right font-medium">{labels.rate}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border-soft last:border-0">
                    <td className="min-w-44 px-2 py-2 font-medium text-foreground">
                      {row.href ? (
                        <Link href={row.href} className="text-primary hover:underline">
                          {row.label}
                        </Link>
                      ) : (
                        row.label
                      )}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right font-semibold text-warning">{row.missing}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right text-muted-foreground">{row.total}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right text-muted-foreground">{row.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
```

with:

```tsx
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{help}</p>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-md border border-border bg-surface px-3 py-4 text-sm text-muted-foreground">{emptyLabel}</div>
      ) : (
        <>
          <div className="grid gap-2 sm:hidden">
            {rows.map((row) => (
              <div key={row.id} className="rounded-md border border-border bg-surface p-3">
                <div className="break-words text-sm font-medium text-foreground">
                  {row.href ? (
                    <Link href={row.href} className="text-primary hover:underline">
                      {row.label}
                    </Link>
                  ) : (
                    row.label
                  )}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <MobileAuditField label={labels.missing} value={formatCount(row.missing)} />
                  <MobileAuditField label={labels.total} value={formatCount(row.total)} />
                  <MobileAuditField label={labels.rate} value={`${formatCount(row.percent)}%`} />
                </div>
              </div>
            ))}
          </div>
          {/* No frame of its own: the gap box is the frame (no frame in a frame). */}
          <DataTable framed={false} className="hidden sm:block" caption={title}>
            <DataTableHeader>
              <tr>
                <DataTableHead>{labels.group}</DataTableHead>
                <DataTableHead align="right">{labels.missing}</DataTableHead>
                <DataTableHead align="right">{labels.total}</DataTableHead>
                <DataTableHead align="right">{labels.rate}</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {rows.map((row) => (
                <DataTableRow key={row.id}>
                  <DataTableCell className="min-w-44 font-medium text-foreground">
                    {row.href ? (
                      <Link href={row.href} className="text-primary hover:underline">
                        {row.label}
                      </Link>
                    ) : (
                      row.label
                    )}
                  </DataTableCell>
                  <DataTableCell numeric className="font-semibold text-warning">{formatCount(row.missing)}</DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">{formatCount(row.total)}</DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">{formatCount(row.percent)}%</DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </>
      )}
    </div>
  )
}
```

(10) The row actions of a round, after `buildAuditRoundWorkflowLinks`. Replace:

```tsx
  return links
}
function filterRoundsByView<T extends AuditRoundListItem>(
```

with:

```tsx
  return links
}

const roundWorkflowIcons: Record<RoundWorkflowLink["key"], ReactNode> = {
  pending: <ListChecks aria-hidden="true" />,
  review: <AlertTriangle aria-hidden="true" />,
  out_of_scope: <ScanLine aria-hidden="true" />,
}

// Row actions of a round (pattern ช1, spec 2B §5.4 row rounds): the first workflow link is the next step, and ⋯ holds
// the other links and "ดู". A round with no open work has "ดู" as its next step and no ⋯. Each label keeps its count.
function buildRoundRowActions({
  links,
  viewHref,
  viewLabel,
}: {
  links: RoundWorkflowLink[]
  viewHref: string
  viewLabel: string
}): { next: RowNextAction; groups: RowActionGroup[] } {
  const view = { label: viewLabel, href: viewHref, icon: <Eye aria-hidden="true" /> }
  const [first, ...rest] = links
  if (!first) return { next: view, groups: [] }

  return {
    next: { label: `${first.label} ${formatCount(first.count)}`, href: first.href, icon: roundWorkflowIcons[first.key] },
    groups: [
      {
        key: "round",
        items: [
          ...rest.map((link) => ({ kind: "link" as const, key: link.key, label: `${link.label} ${formatCount(link.count)}`, href: link.href, icon: roundWorkflowIcons[link.key] })),
          { kind: "link" as const, key: "view", ...view },
        ],
      },
    ],
  }
}

function filterRoundsByView<T extends AuditRoundListItem>(
```

(11) The list URL with the page. Replace:

```tsx
function buildAuditRoundsHref(locale: string, view: AuditRoundView, searchText: string) {
  const params = new URLSearchParams()
  if (searchText) params.set("search", searchText)
  if (view !== "all") params.set("view", view)
  const query = params.toString()
  return `/${locale}/audit/rounds${query ? `?${query}` : ""}`
}
```

with:

```tsx
// The list URL. appendListPage writes page only above 1 and pageSize only when it is not 25, so every default link
// (for example /th/audit/rounds?view=open) stays as it was (spec 2B §5.9.1).
function buildAuditRoundsHref(locale: string, view: AuditRoundView, searchText: string, listPage: { page?: number; pageSize?: number } = {}) {
  const params = new URLSearchParams()
  if (searchText) params.set("search", searchText)
  if (view !== "all") params.set("view", view)
  const query = appendListPage(params, listPage).toString()
  return `/${locale}/audit/rounds${query ? `?${query}` : ""}`
}
```

Check: `grep -n "ColumnHeader\|MasterDataHeader\|bg-muted/\|/20\|aria-current\|colSpan\|CoverageMetric\|filteredRounds.map\|ListFilter" "src/app/[locale]/(dashboard)/audit/rounds/page.tsx"` prints the two `colSpan={8}` lines of `TableEmptyRow` and the `QuickFilterBar` comment that names `aria-current`, and nothing else.

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/audit-rounds-ux.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts tests/audit-round-cancellation.test.ts tests/html-lang-and-years.test.ts tests/performance-route-instrumentation.test.ts tests/breadcrumbs-ui.test.ts tests/form-migration-guards.test.ts tests/list-primitives-ui.test.ts tests/row-actions-ui.test.ts`
Expected: PASS, `tests 116 · pass 116 · fail 0`.

Run: `node --test tests/list-pages-ui.test.ts tests/operational-return-navigation.test.ts tests/dialog-trigger-handles.test.ts tests/audit-round-result-drilldown.test.ts`
Expected: PASS, `fail 0`.

Run: `node <temp>/p2b1-precheck.mjs --file D/audit/rounds/page.tsx` then `node <temp>/p2b1-precheck.mjs --budgets`
Expected: `· in MIGRATED_LIST_FILES`, every row live 0 (`R1 0 – – 1`, the others budget 0) and `args    (no row holds this file)`; then exit 0 with `R7 TABLE_HEADER_FILLS 21 in 15 rows`, `LH2 BUDGETS.LH2 7 in 5 rows`, `LT3 BUDGETS.LT3 5 in 4 rows`, `LS1 BUDGETS.LS1 20 in 17 rows`, `LN1 BUDGETS.LN1 7 in 6 rows`, slack only on the two LB1 `0 → 1` rows, and `budgets hold: no live count is over its row`.

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b2-tw-probe.mjs "src/app/[locale]/(dashboard)/audit/rounds/page.tsx"`
Expected (exit 0): `checked 98 classes, missing 0`. No class is new to `src` (`min-h-11`, `hidden sm:block`, `space-y-6` and the rest are in use already).

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 0 fail, 1 skipped, and 2 more tests than before Step 2; tsc no errors (the `searchParams` type with `page` and `pageSize`, the `RowNextAction`/`RowActionGroup` return type of `buildRoundRowActions`); lint 0 errors and 146 warnings, all under `.agents/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 6 files: the page 273 insertions and 227 deletions, `tests/list-pages-ui.test.ts` 30 insertions, `tests/list-frame-guards.test.ts` 1 and 5, `tests/visual-foundation-guards.test.ts` 1 and 5, `tests/audit-rounds-ux.test.ts` and `tests/operational-return-navigation.test.ts` 1 and 1 each. The page stays CRLF (983 lines).

- [ ] **Step 8: Commit**

```bash
git add "src/app/[locale]/(dashboard)/audit/rounds/page.tsx" tests/audit-rounds-ux.test.ts tests/operational-return-navigation.test.ts tests/visual-foundation-guards.test.ts tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): audit rounds list on TabNav, StatStrip, DataTable and RowActions, paged in memory (2B-2 task 9, B4, I20)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 6 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 2B-2 dev-app check (Task 18, spec §8.6 row `/th/audit/rounds`):**
- 1440, 768 and 375: the quick filters are one underlined tab row with counts (no translucent chip); the selected tab is read as current; switching a tab keeps the scroll position
- the footer total equals the "ทั้งหมด" tab count; `?page=99` shows the last page with "หน้า N จาก N"; pick 50, switch a tab: page 1 with 50
- page 2 → a round → "กลับ" (crumb, and the bottom bar at 375) → page 2 of the same view; the same from "สแกนต่อ" in `ActionPanel`
- desktop: a round with pending items shows "รอตรวจ n" as the next step and ⋯ with the other links and "ดู"; a closed round shows "ดู" and no ⋯; clicking ⋯ does not open the row; the column stays pinned while the table scrolls at 768–1023
- 375: the chips are 44px tall; the coverage strip is two by two; the gap tables appear from 640px with the white header
- a search with no result: desktop "ล้างคำค้น" (outline) clears it and keeps the view and page size

---

### Task 10: `D/audit/rounds/[id]/page.tsx`: the header and the result list on the primitives (B2, I21)

Spec §10.3 (bullet 2B-2: "ไอคอนแถบล่าง `D/audit/rounds/[id]/page.tsx:479`"), §8.6 row 11, §8.11 row 5 (O11), §4.4.3 row rounds/[id], §4.5.2 row 23, §4.5.3, §4.6.1 item 2, §5.4 row audit/rounds/[id], §10.4 table A row 2B-2 (`audit-round-result-drilldown.test.ts:138`), rulings I1, I21, B2 and R-m. One page, one commit. The page is CRLF. No query changes: the result list already pages on the server. No schema, migration, index, API or message change.

Rulings this task applies:
- **§4.4.3, I1:** the hand-made header becomes `PageHeader`: `breadcrumbs` (the same two items, now a prop: R-i, so `tests/breadcrumbs-ui.test.ts` still counts 11 trails and 8 codes), `title={round.name}`, `meta` = the code as `tag`, the `StatusBadge` that sat above the buttons, then the date range (one fact per element, no "•"). The five buttons keep their order and icons: three exports and "รายการรอตรวจ" `outline md`, "สแกน" primary `md`. A cancelled round has no button at all, so `actions` is `undefined` and the header draws no empty row. There is no back button in the header (unchanged, §4.4.3).
- **§4.6.1 item 2, §8.11 row 5 (O11):** the root line `<div className="pb-24 md:pb-0">` (`:408`) and the `MobileActionBar` belong to 2C plan 5. The header takes `className="mb-6"` instead of the root's `space-y-6`. In the bar only the back item's icon changes, `Download` → `<ArrowLeft className="h-4 w-4" />` (B2, §4.5.3); `Download` stays on the two export links. LB1 for the page goes from live 0 to 1, which its `0 → 1` budget row already allows (KEEP 1).
- **§5.4 row rounds/[id]:** `Metric` ×4 → `StatStrip`; the result buckets (`DashboardCard`, normal and needs-review groups) → two `StatStrip`s whose cells are links when the bucket has items, `current` (`aria-current`, the primary line) for the bucket in view, and the action words as the foot line; the evidence boxes → `StatStrip` (LS1 2 → 0, no tone fills, R-d). An empty bucket is plain text, as the old `disabled` card was not a link either.
- **§5.4, the result list:** the table → `DataTable framed={false}` inside the existing frame (phone cards and table share it, like the suppliers list), `TableEmptyRow` with the `ActionEmptyState` ("ดูทั้งหมด" `secondary`, also on the phone list), `RowActions` with "แก้ไขผลตรวจ" as the next step and `groups={[]}` (no ⋯), pinned right; a read-only round shows `Nil` in that column. The phone `MobileAuditDetailField` → `KeyValueList` (LK1). Codes are `tag` (R-p). Empty values are `Nil` (LV2 5 → 0: the two in the result list, the empty result label, and the cancelled notice's "ยกเลิกโดย" and "เหตุผล", where `Nil` takes `text-danger` because faint ink never sits on a status fill). The result count goes through `formatCount`; the two `h-9` links become `buttonVariants({ variant: "outline", size: "md" })`.
- **§5.4, the pager:** `AuditRoundResultPagination` (LT4, LT5 ×2) → `Pagination` in `DataTableFoot`, shown when the list has results. It keeps the page's own params: every href comes from `buildAuditRoundResultListHref` (which always writes `page` and `pageSize`, `tests/audit-round-result-drilldown.test.ts:68`), and the sizes are `auditRoundResultPageSizeOptions` (25/50/100).
- **I21:** a result page past the last one redirects to the last page (I21 covers every list that moves to `Pagination`; the old pager showed "หน้า 2 จาก 2" over an empty list).
- **Pins:** `audit-round-result-drilldown.test.ts:138` → `/<Pagination\b/` + `doesNotMatch(/function AuditRoundResultPagination/)` (table A). **Departure:** `:128` (`href=\{item\.count > 0 \? item\.href : undefined\}`) is not in table A, but the JSX attribute disappears with `DashboardCard`; the same rule now sits in the `StatStrip` items as `href: item.count > 0 ? item.href : undefined`, so the pin changes to that text, in this commit.
- **§8.7–8.9:** no later 2B plan lists the page, so it joins `MIGRATED_LIST_FILES`; its LB1 1 and LP1 1 rows stay and equal `KEEP` (L0 passes).

What users will see on `/th/audit/rounds/<id>`:
- The header: the round name 600, under it the code (monospace), the status badge and the dates; the five buttons on one row from 768 (wrapping when there is no room), 36px from md and 44 below. Before, the badge sat above the buttons and the buttons were 40.
- The four numbers, the seven result buckets and the four evidence numbers are flat strips without tinted boxes. The bucket in view has the primary-soft fill and a line under it instead of a ring.
- The result table has the white header; "แก้ไขผลตรวจ" is the 120px next step; an empty value reads "—". The footer is the shared pager (range, 25/50/100, words-only buttons).
- Phone: the bottom bar's "กลับ" has a left arrow instead of a download icon; nothing else in the bar moves. The cards show location and custodian as label and value rows.

Not in this task: the bottom padding `:408` and the other bar items (2C plan 5, O11) · `AuditRoundCloseButton`, `AuditRoundCancelButton` and their section · the `MasterDataSearch` hidden inputs (they already send `page: 1` and `pageSize`) · the progress bar and the chips of `componentRelationshipLines` (2D pills) · messages · docs (Task 19).

**Files:**
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx` (`i/lf w/crlf`, 1049 lines; 13 exact replacements, Step 4)
- Modify: `tests/audit-round-result-drilldown.test.ts` (`i/lf w/crlf`, 2 replacements: `:128`, `:138`)
- Modify: `tests/list-pages-ui.test.ts` (`i/lf w/crlf`, one block appended)
- Modify: `tests/list-frame-guards.test.ts`, `tests/visual-foundation-guards.test.ts` (`i/lf w/crlf`, through `p2b-budget.mjs` only)
- Temp folder only: `t10-pages-block.ts` (and Task 1's `p2b2-append.mjs`, `p2b2-tw-probe.mjs`; save them from Task 1 Step 1 if your temp folder lacks them)

**Must keep passing without edits:**
- `tests/audit-round-result-drilldown.test.ts` every other line, in particular `:123-127`, `:129-137`, `:139`, `:145-151` (`href={auditRoundExportHref}`, `href={auditRoundExportPdfHref}`), `:176-182` (`href={item.editHref}`, `t("editScanResult")`), `:215-220`, `:234-239`, `:257-261`
- `tests/breadcrumbs-ui.test.ts` (11 trails, 8 codes, `audit/rounds/[id]/page.tsx` ends on `{ label: round.auditNo, code: true }`) · `tests/audit-item-status-labels.test.ts:71-73` · `tests/audit-round-cancellation.test.ts:95-103` (`isAuditRoundReadOnlyStatus(round.status)`, `cancelledByDisplayName`, `t("cancelledBy")`, `cancelledReadOnlyNotice`, `!isRoundReadOnly`)
- `tests/operational-return-navigation.test.ts:59-64` (the `searchParams` type, `normalizeOperationalReturnTo(locale, "audit-rounds", …)`, `roundDetailReturnHref`, the pending and scan links, `result: "found", returnTo: returnToHref`)
- `tests/mobile-field-navigation.test.ts` · `tests/form-migration-guards.test.ts` (whole file; the page is no 2C file) · `tests/dialog-trigger-handles.test.ts` · `tests/design-tokens-contrast.test.ts`

**Interfaces:**
- Consumes: from Task 9's list `PageHeader`, `DataTable`, `DataTableHeader`, `DataTableBody`, `DataTableHead`, `DataTableCell`, `DataTableFoot`, `TableEmptyRow`, `Pagination`, `RowActions`, `StatStrip`, `buttonVariants`, `formatCount`, `lastListPage` and `paginationRange` (same signatures), plus `KeyValueList({ items: { key?, label, value, nilLabel? }[], className? })` from `@/components/ui/key-value-list`, `Nil({ label?, className? })` from `@/components/ui/nil`, `type StatStripItem` from `@/components/ui/stat-strip`, `redirect` from `next/navigation`, and from `@/lib/audit-round-result-filters` (unchanged): `buildAuditRoundResultListHref({ locale, roundId, result, returnTo?, search?, page?, pageSize? })`, `auditRoundResultPageSizeOptions` (`[25, 50, 100]`), `parseAuditRoundResultListParams`.
- Produces: the round detail on `PageHeader`, `StatStrip`, `DataTable`, `RowActions`, `KeyValueList` and `Pagination`; the file-local `resultStatItems(group): StatStripItem[]`; the list-pages test `audit round detail: PageHeader, StatStrip numbers and result buckets, …`; the page in `MIGRATED_LIST_FILES` (LB1 1 and LP1 1 left, both `KEEP`). For 2C plan 5 (spec §8.10 row 8): this O11 page has its new header.

| guard | `D/audit/rounds/[id]/page.tsx` before → after |
|---|---|
| VFG R7 | 1 → – |
| LFG | LH1 1 · LT3 1 · LT4 1 · LT5 2 · LV2 5 · LS1 2 · LK1 1 → all – · LB1 budget 1 (live 0 → 1, KEEP) · LP1 1 (KEEP) · joins `MIGRATED_LIST_FILES` |

Running totals (with Tasks 1–9 in): R7 21 → 20 (14 rows) · LH1 31 → 30 · LT3 5 → 4 (3 rows) · LT4 3 → 2 · LT5 7 → 5 (3 rows) · LV2 105 → 100 (32 rows) · LS1 20 → 18 (16 rows) · LK1 9 → 8 · LB1 budget 12 (live 10 → 11) · LP1 7.

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`
Expected: nothing.

Run: `git diff --quiet e3f20ce -- "src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx" tests/audit-round-result-drilldown.test.ts && echo UNCHANGED`
Expected: `UNCHANGED`.

Run: `node <temp>/p2b1-precheck.mjs --file "D/audit/rounds/[id]/page.tsx"`
Expected (exit 0): `(CRLF) · not in MIGRATED_LIST_FILES`, the rows `R7 1 1 0 1`, `LH1 1 1 0 1`, `LB1 0 1 1 0` (the `0 → 1` row: live 0 is expected before this task), `LP1 1 1 1 1`, `LT3 1 1 0 1`, `LT4 1 1 0 1`, `LT5 2 2 0 2`, `LV2 5 5 0 5`, `LS1 2 2 0 2`, `LK1 1 1 0 1`, and `args    R7=1:1 LH1=1:1 LB1=1:0 LP1=1:1 LT3=1:1 LT4=1:1 LT5=2:2 LV2=5:5 LS1=2:2 LK1=1:1`.

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected (exit 0): `R7 … 21 in 15 rows`, `LH1 … 31 in 31 rows`, `LT3 … 5 in 4 rows`, `LT4 … 3 in 3 rows`, `LT5 … 7 in 4 rows`, `LV2 … 105 in 33 rows`, `LS1 … 20 in 17 rows`, `LK1 … 9 in 9 rows`, `LB1 BUDGETS.LB1 12 in 12 rows · live 10 in 10 files · over 0 · slack 2`, `budgets hold: …`.

- [ ] **Step 2: The failing tests**

(a) `tests/audit-round-result-drilldown.test.ts:128` (departure, see the rulings). Replace:

```ts
  assert.match(page, /href=\{item\.count > 0 \? item\.href : undefined\}/)
```

with:

```ts
  assert.match(page, /href: item\.count > 0 \? item\.href : undefined/)
```

(b) `tests/audit-round-result-drilldown.test.ts:138` (table A). Replace:

```ts
  assert.match(page, /AuditRoundResultPagination/)
```

with:

```ts
  assert.match(page, /<Pagination\b/)
  assert.doesNotMatch(page, /function AuditRoundResultPagination/)
```

(c) Save this block as `t10-pages-block.ts` in your temp folder, then run `node <temp>/p2b2-append.mjs <temp>/t10-pages-block.ts tests/list-pages-ui.test.ts`:

```ts
// Plan 2B-2 Task 10 (spec 2B §4.4.3, §5.4 row rounds/[id], I21): the header and the result list of an audit round.
// The root padding and the mobile action bar belong to 2C plan 5 (O11); 2B changed only the bar's back icon (B2).
test("audit round detail: PageHeader, StatStrip numbers and result buckets, the result list on DataTable with RowActions and the shared Pagination (spec 2B §5.4)", () => {
  const source = read(`${D}audit/rounds/[id]/page.tsx`)
  for (const part of ["<PageHeader", "<StatStrip", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<TableEmptyRow", "<ClickableTableRow", "<RowActions", "<KeyValueList", "<DataTableFoot>", "<Pagination"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /<div className="pb-24 md:pb-0">\n\s+<PageHeader\n\s+className="mb-6"/, "the root keeps the O11 padding for 2C plan 5, so the header brings its own gap (spec 2B §4.6.1)")
  assert.match(source, /\{ href: returnToHref, label: tCommon\("back"\), icon: <ArrowLeft className="h-4 w-4" \/> \}/, "the back item of the mobile action bar has a left arrow (B2)")
  assert.match(source, /current: resultListState\.result === item\.result/, "the bucket in view is the current cell (aria-current from StatStrip)")
  assert.match(source, /next=\{\{ label: t\("editScanResult"\), href: item\.editHref, icon: <Pencil aria-hidden="true" \/> \}\}\n\s+groups=\{\[\]\}/, "the row's only command is the next step, so RowActions draws no ⋯")
  assert.match(source, /<DataTableHead align="right" sticky="right" hideLabel>\{tCommon\("actions"\)\}<\/DataTableHead>/)
  assert.match(source, /pageSizes=\{auditRoundResultPageSizeOptions\.map\(\(value\) => \(\{ value, href: buildAuditRoundResultListHref\(\{ [^}]*page: 1, pageSize: value \}\) \}\)\)\}/, "the result list keeps its own page and pageSize params")
  assert.match(source, /^import \{ notFound, redirect \} from "next\/navigation"$/m)
  assert.match(source, /if \(resultPageRowCount === 0 && resultListTotal > 0 && resultListState\.page > resultLastPage\) \{\n\s+redirect\(buildAuditRoundResultListHref\(/, "a result page past the last one shows the last page (I21)")
})
```

Run: `node --test tests/list-pages-ui.test.ts tests/audit-round-result-drilldown.test.ts`
Expected: FAIL, `fail 2` (`tests/audit-round-result-drilldown.test.ts` 15 tests, `tests/list-pages-ui.test.ts` 1 more than before this step):
- `audit round detail page exposes clickable result dashboard and paginated result list`: no match for `/href: item\.count > 0 \? item\.href : undefined/`
- `audit round detail: PageHeader, StatStrip numbers and result buckets, …`: `no <PageHeader`

- [ ] **Step 3: Lower the guard rows of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs "D/audit/rounds/[id]/page.tsx" R7=1:0 LH1=1:0 LB1=1:1 LP1=1:1 LT3=1:0 LT4=1:0 LT5=2:0 LV2=5:0 LS1=2:0 LK1=1:0 --migrated`
Expected (exit 0):
```
R7: 1 -> 0 (row deleted)
LH1: 1 -> 0 (row deleted)
LB1: 1 kept
LP1: 1 kept
LT3: 1 -> 0 (row deleted)
LT4: 1 -> 0 (row deleted)
LT5: 2 -> 0 (row deleted)
LV2: 5 -> 0 (row deleted)
LS1: 2 -> 0 (row deleted)
LK1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx
```
The `// 2B-2` comment of `BUDGETS.LK1` goes too (Tasks 5 and 8 already left that group). LB1 and LP1 must be named (`1:1`): the script refuses to leave a row unnamed.

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 38 · fail 9`, each naming only this page: LFG `LH1` (`31 in 31 files`), `LT3` (`5 in 4 files`), `LT4` (`3 in 3 files`), `LT5` (`7 in 4 files`, `2 > 0`), `LV2` (`105 in 33 files`, `5 > 0`), `LS1` (`20 in 17 files`, `2 > 0`), `LK1` (`9 in 9 files`), `L0` with the same seven lines, and VFG `R7 interim: …` (`21 matches in 15 files`). LB1 does not fail: the page has no `ArrowLeft` yet.

- [ ] **Step 4: Move the header and the list part onto the primitives (`src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx`, CRLF)**

Thirteen exact replacements, top to bottom. Make all of them before you compile. The root line `<div className="pb-24 md:pb-0">` (`:408`) stays as it is.

(1) Imports. Replace:

```tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, Download, FileText, ScanLine } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { ColumnHeader, MasterDataSearch } from "@/components/master-data/master-data-layout"
import { formatDate, formatDateTime } from "@/lib/utils"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { AuditProgressBar } from "@/components/audit/audit-progress-bar"
import { AuditRoundCancelButton } from "@/components/audit/audit-round-cancel-button"
import { AuditRoundCloseButton } from "@/components/audit/audit-round-close-button"
import { hasPermission } from "@/lib/auth-utils"
import { categoryPhotoChecklistKey, parsePhotoChecklist } from "@/lib/category-photo-checklist"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { MobileActionBar } from "@/components/ui/mobile-action-bar"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import { isSameAuditActor } from "@/lib/audit-segregation"
import { getDesktopTableOnlyClasses, getMobileCardListClasses } from "@/lib/design-system"
import { appendOperationalReturnTo, normalizeOperationalReturnTo } from "@/lib/operational-return-navigation"
import { countSuccessfulAuditResultRows, isVarianceAuditResult } from "@/lib/audit-result-summary"
import { isAuditRoundReadOnlyStatus } from "@/lib/audit-round-status"
import { buildAuditCorrectionHistoryByItemId, type AuditCorrectionHistoryItem } from "@/lib/audit-correction-history"
import { paginationRange } from "@/lib/master-data-query"
```

with:

```tsx
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, ArrowLeft, Download, FileText, Pencil, ScanLine } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { MasterDataSearch } from "@/components/master-data/master-data-layout"
import { formatDate, formatDateTime } from "@/lib/utils"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { AuditProgressBar } from "@/components/audit/audit-progress-bar"
import { AuditRoundCancelButton } from "@/components/audit/audit-round-cancel-button"
import { AuditRoundCloseButton } from "@/components/audit/audit-round-close-button"
import { hasPermission } from "@/lib/auth-utils"
import { categoryPhotoChecklistKey, parsePhotoChecklist } from "@/lib/category-photo-checklist"
import { MobileActionBar } from "@/components/ui/mobile-action-bar"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { StatStrip, type StatStripItem } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { isSameAuditActor } from "@/lib/audit-segregation"
import { getDesktopTableOnlyClasses, getMobileCardListClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { lastListPage } from "@/lib/list-pagination"
import { appendOperationalReturnTo, normalizeOperationalReturnTo } from "@/lib/operational-return-navigation"
import { countSuccessfulAuditResultRows, isVarianceAuditResult } from "@/lib/audit-result-summary"
import { isAuditRoundReadOnlyStatus } from "@/lib/audit-round-status"
import { buildAuditCorrectionHistoryByItemId, type AuditCorrectionHistoryItem } from "@/lib/audit-correction-history"
import { paginationRange } from "@/lib/master-data-query"
```

(2) The name of who cancelled may be empty; the page shows `Nil` (Step (8)). Replace:

```tsx
  const cancelledByDisplayName = cancelledByUser
    ? cancelledByUser.displayName === cancelledByUser.username
      ? cancelledByUser.username
      : `${cancelledByUser.displayName} (${cancelledByUser.username})`
    : round.cancelledBy || "-"
```

with:

```tsx
  const cancelledByDisplayName = cancelledByUser
    ? cancelledByUser.displayName === cancelledByUser.username
      ? cancelledByUser.username
      : `${cancelledByUser.displayName} (${cancelledByUser.username})`
    : round.cancelledBy
```

(3) A result page past the last one, and the range of the pager. Replace:

```tsx
  const resultListTotal = isOutOfScopeResultList ? outOfScopeScanTotal : resultItemTotal
```

with:

```tsx
  const resultListTotal = isOutOfScopeResultList ? outOfScopeScanTotal : resultItemTotal
  // A result page past the last one (an old link, or results that moved to another bucket) shows the last page
  // (spec 2B I21). The result list keeps its own page and pageSize params (spec 2B §5.4 row rounds/[id]).
  const resultLastPage = lastListPage(resultListTotal, resultListState.pageSize)
  const resultPageRowCount = isOutOfScopeResultList ? outOfScopeScanRows.length : resultItems.length
  if (resultPageRowCount === 0 && resultListTotal > 0 && resultListState.page > resultLastPage) {
    redirect(buildAuditRoundResultListHref({ locale, roundId: round.id, result: resultListState.result, returnTo: returnToHref, search: resultListState.search, page: resultLastPage, pageSize: resultListState.pageSize }))
  }
  const { start: resultStart, end: resultEnd, totalPages: resultTotalPages } = paginationRange(resultListState.page, resultListState.pageSize, resultListTotal)
```

(4) No result yet is `null`, shown as `Nil`, not a badge that says "-". Replace:

```tsx
          auditResultLabel: item.auditResult ? (resultLabelKey ? t(resultLabelKey) : item.auditResult) : "-",
```

with:

```tsx
          auditResultLabel: item.auditResult ? (resultLabelKey ? t(resultLabelKey) : item.auditResult) : null,
```

(5) The result buckets as `StatStrip` cells. Replace:

```tsx
  const resultNormalGroup = resultSummaryGroups.normal.map((item) => ({ ...item, ...resultSummaryItemConfig[item.result] }))
  const resultNeedsReviewGroup = resultSummaryGroups.needsReview.map((item) => ({ ...item, ...resultSummaryItemConfig[item.result] }))
```

with:

```tsx
  const resultNormalGroup = resultSummaryGroups.normal.map((item) => ({ ...item, ...resultSummaryItemConfig[item.result] }))
  const resultNeedsReviewGroup = resultSummaryGroups.needsReview.map((item) => ({ ...item, ...resultSummaryItemConfig[item.result] }))
  // The result buckets as StatStrip cells: a bucket with items is a link to its list, the bucket in view is current
  // (aria-current and the primary line), and an empty bucket is plain text.
  const resultStatItems = (group: typeof resultNormalGroup): StatStripItem[] =>
    group.map((item) => ({
      key: item.result,
      label: item.label,
      value: formatCount(item.count),
      href: item.count > 0 ? item.href : undefined,
      current: resultListState.result === item.result,
      foot: item.count > 0 ? item.actionLabel : undefined,
      footTitle: item.count > 0 ? item.actionLabel : undefined,
    }))
```

(6) The header (the root line above it stays). Replace:

```tsx
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2">
            <Breadcrumbs
              items={[
                { label: t("title"), href: returnToHref },
                { label: round.auditNo, code: true },
              ]}
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{round.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {round.auditNo} • {formatDate(round.startDate)} - {formatDate(round.endDate)}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <StatusBadge label={getAuditRoundStatusLabel(round.status, t)} status={round.status} />
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            {canExportRound ? (
              <>
                <a
                  href={auditRoundExportHref}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent sm:h-10 sm:min-h-0 sm:w-auto"
                >
                  <Download className="h-4 w-4" />
                  {t("exportResult")}
                </a>
                <a
                  href={auditRoundExportPdfHref}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent sm:h-10 sm:min-h-0 sm:w-auto"
                >
                  <FileText className="h-4 w-4" />
                  {t("exportResultPdf")}
                </a>
                <a
                  href={`/api/audit-rounds/${round.id}/variance-export`}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent sm:h-10 sm:min-h-0 sm:w-auto"
                >
                  <Download className="h-4 w-4" />
                  {t("exportVariance")}
                </a>
              </>
            ) : null}
            {!isRoundReadOnly ? (
              <>
                <Link
                  href={pendingHref}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent sm:h-10 sm:min-h-0 sm:w-auto"
                >
                  <AlertTriangle className="h-4 w-4" />
                  {t("pendingAssets")}
                </Link>
                <Link
                  href={scanHref}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover sm:h-10 sm:min-h-0 sm:w-auto"
                >
                  <ScanLine className="h-4 w-4" />
                  {t("scan")}
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </div>
```

with:

```tsx
      <PageHeader
        className="mb-6"
        breadcrumbs={[
          { label: t("title"), href: returnToHref },
          { label: round.auditNo, code: true },
        ]}
        title={round.name}
        meta={
          <>
            <span className="tag">{round.auditNo}</span>
            <StatusBadge label={getAuditRoundStatusLabel(round.status, t)} status={round.status} />
            <span>
              {formatDate(round.startDate)} – {formatDate(round.endDate)}
            </span>
          </>
        }
        actions={
          canExportRound || !isRoundReadOnly ? (
            <>
              {canExportRound ? (
                <>
                  <a href={auditRoundExportHref} className={buttonVariants({ variant: "outline", size: "md" })}>
                    <Download aria-hidden="true" />
                    {t("exportResult")}
                  </a>
                  <a href={auditRoundExportPdfHref} className={buttonVariants({ variant: "outline", size: "md" })}>
                    <FileText aria-hidden="true" />
                    {t("exportResultPdf")}
                  </a>
                  <a href={`/api/audit-rounds/${round.id}/variance-export`} className={buttonVariants({ variant: "outline", size: "md" })}>
                    <Download aria-hidden="true" />
                    {t("exportVariance")}
                  </a>
                </>
              ) : null}
              {!isRoundReadOnly ? (
                <>
                  <Link href={pendingHref} className={buttonVariants({ variant: "outline", size: "md" })}>
                    <AlertTriangle aria-hidden="true" />
                    {t("pendingAssets")}
                  </Link>
                  <Link href={scanHref} className={buttonVariants({ size: "md" })}>
                    <ScanLine aria-hidden="true" />
                    {t("scan")}
                  </Link>
                </>
              ) : null}
            </>
          ) : undefined
        }
      />
```

(7) The back item of the mobile action bar, and nothing else of the bar (B2, O11). Replace:

```tsx
            { href: returnToHref, label: tCommon("back"), icon: <Download className="h-4 w-4" /> },
```

with:

```tsx
            { href: returnToHref, label: tCommon("back"), icon: <ArrowLeft className="h-4 w-4" /> },
```

(8) The cancelled notice's empty values. Replace:

```tsx
                <div>
                  <dt className="font-medium text-foreground">{t("cancelledBy")}</dt>
                  <dd className="mt-1 break-words text-danger">{cancelledByDisplayName}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-medium text-foreground">{t("cancelReason")}</dt>
                  <dd className="mt-1 break-words text-danger">{round.cancelReason || "-"}</dd>
                </div>
```

with:

```tsx
                <div>
                  <dt className="font-medium text-foreground">{t("cancelledBy")}</dt>
                  <dd className="mt-1 break-words text-danger">{cancelledByDisplayName || <Nil className="text-danger" />}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-medium text-foreground">{t("cancelReason")}</dt>
                  <dd className="mt-1 break-words text-danger">{round.cancelReason || <Nil className="text-danger" />}</dd>
                </div>
```

(9) The four numbers. Replace:

```tsx
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Metric label={t("totalExpected")} value={round._count.items} />
        <Metric label={t("pending")} value={pendingCount} />
        <Metric label={t("scanned")} value={scannedCount} />
        <Metric label={t("progress")} value={`${progress}%`} />
      </div>
```

with:

```tsx
      <StatStrip
        className="mb-6"
        items={[
          { key: "totalExpected", label: t("totalExpected"), value: formatCount(round._count.items) },
          { key: "pending", label: t("pending"), value: formatCount(pendingCount) },
          { key: "scanned", label: t("scanned"), value: formatCount(scannedCount) },
          { key: "progress", label: t("progress"), value: `${formatCount(progress)}%` },
        ]}
      />
```

(10) The result buckets and the evidence numbers. Replace:

```tsx
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.65fr)_1fr]">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t("resultNormalGroup")}</h3>
            <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {resultNormalGroup.map((item) => (
                <DashboardCard
                  key={item.result}
                  label={item.label}
                  value={item.count}
                  tone={item.tone}
                  href={item.count > 0 ? item.href : undefined}
                  active={resultListState.result === item.result}
                  actionLabel={item.count > 0 ? item.actionLabel : undefined}
                  disabled={!item.actionable}
                />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t("resultNeedsReviewGroup")}</h3>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {resultNeedsReviewGroup.map((item) => (
                <DashboardCard
                  key={item.result}
                  label={item.label}
                  value={item.count}
                  tone={item.tone}
                  href={item.count > 0 ? item.href : undefined}
                  active={resultListState.result === item.result}
                  actionLabel={item.count > 0 ? item.actionLabel : undefined}
                  disabled={!item.actionable}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-lg border border-border bg-surface p-4">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">{t("evidenceSummary")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("evidenceSummaryHelp")}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardCard label={t("evidenceAttached")} value={evidenceSummary.withEvidence} tone="success" />
          <DashboardCard label={t("evidenceMissing")} value={evidenceSummary.missingEvidence} tone="warning" />
          <DashboardCard label={t("checklistComplete")} value={evidenceSummary.checklistComplete} tone="info" />
          <DashboardCard label={t("checklistIncomplete")} value={evidenceSummary.checklistIncomplete} tone="danger" />
        </div>
      </section>
```

with:

```tsx
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.65fr)_1fr]">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t("resultNormalGroup")}</h3>
            <StatStrip className="mt-2" items={resultStatItems(resultNormalGroup)} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t("resultNeedsReviewGroup")}</h3>
            <StatStrip className="mt-2" items={resultStatItems(resultNeedsReviewGroup)} />
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-lg border border-border bg-surface p-4">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">{t("evidenceSummary")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("evidenceSummaryHelp")}</p>
        </div>
        <StatStrip
          items={[
            { key: "evidenceAttached", label: t("evidenceAttached"), value: formatCount(evidenceSummary.withEvidence) },
            { key: "evidenceMissing", label: t("evidenceMissing"), value: formatCount(evidenceSummary.missingEvidence) },
            { key: "checklistComplete", label: t("checklistComplete"), value: formatCount(evidenceSummary.checklistComplete) },
            { key: "checklistIncomplete", label: t("checklistIncomplete"), value: formatCount(evidenceSummary.checklistIncomplete) },
          ]}
        />
      </section>
```

(11) The count and the two links above the result list. Replace:

```tsx
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={resultFilterLabels[resultListState.result]} status={resultListState.result} />
            <span className="rounded-md border border-border bg-background px-3 py-1 text-sm text-muted-foreground">
              {resultListTotal} {t("items")}
            </span>
            {resultFindingReviewHref && !isRoundReadOnly ? (
              <Link href={resultFindingReviewHref} className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent">
                <FileText className="h-4 w-4" />
                {t("openFindingReview")}
              </Link>
            ) : null}
            {resultListState.result !== "all" || resultListState.search ? (
              <Link href={allResultHref} className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent">
                {t("viewAll")}
              </Link>
            ) : null}
          </div>
```

with:

```tsx
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={resultFilterLabels[resultListState.result]} status={resultListState.result} />
            <span className="rounded-md border border-border bg-background px-3 py-1 text-sm text-muted-foreground">
              {formatCount(resultListTotal)} {t("items")}
            </span>
            {resultFindingReviewHref && !isRoundReadOnly ? (
              <Link href={resultFindingReviewHref} className={buttonVariants({ variant: "outline", size: "md" })}>
                <FileText aria-hidden="true" />
                {t("openFindingReview")}
              </Link>
            ) : null}
            {resultListState.result !== "all" || resultListState.search ? (
              <Link href={allResultHref} className={buttonVariants({ variant: "outline", size: "md" })}>
                {t("viewAll")}
              </Link>
            ) : null}
          </div>
```

(12) The result list: phone cards, the table and the shared pager. Replace:

```tsx
        <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
          <div className={`${getMobileCardListClasses()} p-3`}>
            {resultRows.length === 0 ? (
              <ActionEmptyState
                icon={<ScanLine className="h-6 w-6" />}
                title={emptyResultTitle}
                description={emptyResultDescription}
                actionHref={allResultHref}
                actionLabel={t("viewAll")}
              />
            ) : (
              resultRows.map((item) => (
                <article key={item.id} className="min-w-0 rounded-md border border-border bg-background p-3">
                  <Link href={`/${locale}/assets/${item.asset.id}`} className="break-words text-sm font-semibold text-foreground hover:text-primary">
                    {item.asset.assetTag}
                  </Link>
                  <p className="mt-1 line-clamp-2 text-sm text-foreground">{item.asset.name}</p>
                  {item.componentRelationshipLines.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.componentRelationshipLines.map((line) => (
                        <span key={line} className="rounded-full bg-info-soft px-2 py-0.5 text-xs font-medium text-info">
                          {line}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {item.latestCorrection ? (
                    <div className="mt-2 rounded-md border border-info-border bg-info-soft px-2 py-1 text-xs text-info">
                      <div>{t("correctionHistoryLatest", { date: formatDateTime(item.latestCorrection.createdAt), user: item.latestCorrection.userLabel })}</div>
                      {item.latestCorrection.changedFields.length > 0 ? (
                        <div>{t("correctionHistoryFields", { fields: formatAuditCorrectionFields(item.latestCorrection, t) })}</div>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="mt-3 grid gap-2 text-sm">
                    <MobileAuditDetailField label={t("expectedLocation")} value={`${item.asset.currentLocation.code} - ${item.asset.currentLocation.name}`} />
                    <MobileAuditDetailField
                      label={t("expectedCustodian")}
                      value={item.asset.custodian ? `${item.asset.custodian.code} - ${item.asset.custodian.fullNameTh}` : "-"}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge label={item.auditStatusLabel} status={item.auditStatus} />
                    <StatusBadge label={item.auditResultLabel} status={item.auditResult} tone={item.auditResultTone} />
                  </div>
                  {!isRoundReadOnly ? (
                    <div className="mt-3 flex justify-end">
                      <Link href={item.editHref} className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                        {t("editScanResult")}
                      </Link>
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>
          <div className={`${getDesktopTableOnlyClasses()} overflow-x-auto`}>
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <ColumnHeader>{t("assetTag")}</ColumnHeader>
                  <ColumnHeader>{t("assetName")}</ColumnHeader>
                  <ColumnHeader>{t("expectedLocation")}</ColumnHeader>
                  <ColumnHeader>{t("expectedCustodian")}</ColumnHeader>
                  <ColumnHeader>{t("status")}</ColumnHeader>
                  <ColumnHeader>{t("result")}</ColumnHeader>
                  <ColumnHeader>{tCommon("actions")}</ColumnHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {resultRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6">
                      <ActionEmptyState
                        icon={<ScanLine className="h-6 w-6" />}
                        title={emptyResultTitle}
                        description={emptyResultDescription}
                        actionHref={allResultHref}
                        actionLabel={t("viewAll")}
                      />
                    </td>
                  </tr>
                ) : (
                  resultRows.map((item) => (
                    <ClickableTableRow
                      key={item.id}
                      href={`/${locale}/assets/${item.asset.id}`}
                      label={`${tCommon("view")}: ${item.asset.assetTag}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{item.asset.assetTag}</td>
                      <td className="min-w-56 px-4 py-3 text-foreground">
                        <div>{item.asset.name}</div>
                        {item.componentRelationshipLines.length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {item.componentRelationshipLines.map((line) => (
                              <span key={line} className="rounded-full bg-info-soft px-2 py-0.5 text-xs font-medium text-info">
                                {line}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {item.latestCorrection ? (
                          <div className="mt-2 rounded-md border border-info-border bg-info-soft px-2 py-1 text-xs text-info">
                            <div>{t("correctionHistoryLatest", { date: formatDateTime(item.latestCorrection.createdAt), user: item.latestCorrection.userLabel })}</div>
                            {item.latestCorrection.changedFields.length > 0 ? (
                              <div>{t("correctionHistoryFields", { fields: formatAuditCorrectionFields(item.latestCorrection, t) })}</div>
                            ) : null}
                          </div>
                        ) : null}
                      </td>
                      <td className="min-w-56 px-4 py-3 text-muted-foreground">
                        {item.asset.currentLocation.code} - {item.asset.currentLocation.name}
                      </td>
                      <td className="min-w-56 px-4 py-3 text-muted-foreground">
                        {item.asset.custodian ? `${item.asset.custodian.code} - ${item.asset.custodian.fullNameTh}` : "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        <StatusBadge label={item.auditStatusLabel} status={item.auditStatus} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        <StatusBadge label={item.auditResultLabel} status={item.auditResult} tone={item.auditResultTone} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {!isRoundReadOnly ? (
                          <Link
                            href={item.editHref}
                            data-no-row-click
                            className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                          >
                            {t("editScanResult")}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </ClickableTableRow>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <AuditRoundResultPagination
            locale={locale}
            roundId={round.id}
            state={resultListState}
            total={resultListTotal}
            returnTo={returnToHref}
            labels={{ rowsPerPage: tCommon("rowsPerPage"), page: tCommon("page"), of: tCommon("of"), previous: tCommon("previous"), next: tCommon("next") }}
          />
        </div>
```

with:

```tsx
        <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
          <div className={`${getMobileCardListClasses()} p-3`}>
            {resultRows.length === 0 ? (
              <ActionEmptyState
                icon={<ScanLine className="h-6 w-6" />}
                title={emptyResultTitle}
                description={emptyResultDescription}
                actionHref={allResultHref}
                actionLabel={t("viewAll")}
                actionVariant="secondary"
              />
            ) : (
              resultRows.map((item) => (
                <article key={item.id} className="min-w-0 rounded-md border border-border bg-background p-3">
                  <Link href={`/${locale}/assets/${item.asset.id}`} className="break-words text-sm font-semibold text-foreground hover:text-primary">
                    <span className="tag font-medium">{item.asset.assetTag}</span>
                  </Link>
                  <p className="mt-1 line-clamp-2 text-sm text-foreground">{item.asset.name}</p>
                  {item.componentRelationshipLines.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.componentRelationshipLines.map((line) => (
                        <span key={line} className="rounded-full bg-info-soft px-2 py-0.5 text-xs font-medium text-info">
                          {line}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {item.latestCorrection ? (
                    <div className="mt-2 rounded-md border border-info-border bg-info-soft px-2 py-1 text-xs text-info">
                      <div>{t("correctionHistoryLatest", { date: formatDateTime(item.latestCorrection.createdAt), user: item.latestCorrection.userLabel })}</div>
                      {item.latestCorrection.changedFields.length > 0 ? (
                        <div>{t("correctionHistoryFields", { fields: formatAuditCorrectionFields(item.latestCorrection, t) })}</div>
                      ) : null}
                    </div>
                  ) : null}
                  <KeyValueList
                    className="mt-3"
                    items={[
                      {
                        key: "location",
                        label: t("expectedLocation"),
                        value: (
                          <>
                            <span className="tag">{item.asset.currentLocation.code}</span> - {item.asset.currentLocation.name}
                          </>
                        ),
                      },
                      {
                        key: "custodian",
                        label: t("expectedCustodian"),
                        value: item.asset.custodian ? (
                          <>
                            <span className="tag">{item.asset.custodian.code}</span> - {item.asset.custodian.fullNameTh}
                          </>
                        ) : null,
                      },
                    ]}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge label={item.auditStatusLabel} status={item.auditStatus} />
                    {item.auditResultLabel ? <StatusBadge label={item.auditResultLabel} status={item.auditResult} tone={item.auditResultTone} /> : null}
                  </div>
                  {!isRoundReadOnly ? (
                    <div className="mt-3 flex justify-end">
                      <Link href={item.editHref} className={buttonVariants({ variant: "outline", size: "md" })}>
                        {t("editScanResult")}
                      </Link>
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>
          <DataTable framed={false} className={getDesktopTableOnlyClasses()} caption={resultListTitle} scrollHint={tCommon("tableScrollHint")}>
            <DataTableHeader>
              <tr>
                <DataTableHead>{t("assetTag")}</DataTableHead>
                <DataTableHead>{t("assetName")}</DataTableHead>
                <DataTableHead>{t("expectedLocation")}</DataTableHead>
                <DataTableHead>{t("expectedCustodian")}</DataTableHead>
                <DataTableHead>{t("status")}</DataTableHead>
                <DataTableHead>{t("result")}</DataTableHead>
                <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {resultRows.length === 0 ? (
                <TableEmptyRow
                  colSpan={7}
                  emptyState={{
                    icon: <ScanLine className="h-6 w-6" />,
                    title: emptyResultTitle,
                    description: emptyResultDescription,
                    actionHref: allResultHref,
                    actionLabel: t("viewAll"),
                    actionVariant: "secondary",
                  }}
                />
              ) : (
                resultRows.map((item) => (
                  <ClickableTableRow
                    key={item.id}
                    href={`/${locale}/assets/${item.asset.id}`}
                    label={`${tCommon("view")}: ${item.asset.assetTag}`}
                  >
                    <DataTableCell className="whitespace-nowrap">
                      <span className="tag font-medium text-foreground">{item.asset.assetTag}</span>
                    </DataTableCell>
                    <DataTableCell className="min-w-56 text-foreground">
                      <div>{item.asset.name}</div>
                      {item.componentRelationshipLines.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {item.componentRelationshipLines.map((line) => (
                            <span key={line} className="rounded-full bg-info-soft px-2 py-0.5 text-xs font-medium text-info">
                              {line}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {item.latestCorrection ? (
                        <div className="mt-2 rounded-md border border-info-border bg-info-soft px-2 py-1 text-xs text-info">
                          <div>{t("correctionHistoryLatest", { date: formatDateTime(item.latestCorrection.createdAt), user: item.latestCorrection.userLabel })}</div>
                          {item.latestCorrection.changedFields.length > 0 ? (
                            <div>{t("correctionHistoryFields", { fields: formatAuditCorrectionFields(item.latestCorrection, t) })}</div>
                          ) : null}
                        </div>
                      ) : null}
                    </DataTableCell>
                    <DataTableCell className="min-w-56 text-muted-foreground">
                      <span className="tag">{item.asset.currentLocation.code}</span> - {item.asset.currentLocation.name}
                    </DataTableCell>
                    <DataTableCell className="min-w-56 text-muted-foreground">
                      {item.asset.custodian ? (
                        <>
                          <span className="tag">{item.asset.custodian.code}</span> - {item.asset.custodian.fullNameTh}
                        </>
                      ) : (
                        <Nil />
                      )}
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">
                      <StatusBadge label={item.auditStatusLabel} status={item.auditStatus} />
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">
                      {item.auditResultLabel ? <StatusBadge label={item.auditResultLabel} status={item.auditResult} tone={item.auditResultTone} /> : <Nil />}
                    </DataTableCell>
                    <DataTableCell align="right" sticky="right">
                      {!isRoundReadOnly ? (
                        <RowActions
                          code={item.asset.assetTag}
                          name={item.asset.name}
                          menuLabel={tCommon("moreActionsFor", { code: item.asset.assetTag })}
                          next={{ label: t("editScanResult"), href: item.editHref, icon: <Pencil aria-hidden="true" /> }}
                          groups={[]}
                        />
                      ) : (
                        <Nil />
                      )}
                    </DataTableCell>
                  </ClickableTableRow>
                ))
              )}
            </DataTableBody>
          </DataTable>
          {resultListTotal > 0 ? (
            <DataTableFoot>
              <Pagination
                page={resultListState.page}
                totalPages={resultTotalPages}
                previousHref={buildAuditRoundResultListHref({ locale, roundId: round.id, result: resultListState.result, returnTo: returnToHref, search: resultListState.search, page: resultListState.page - 1, pageSize: resultListState.pageSize })}
                nextHref={buildAuditRoundResultListHref({ locale, roundId: round.id, result: resultListState.result, returnTo: returnToHref, search: resultListState.search, page: resultListState.page + 1, pageSize: resultListState.pageSize })}
                pageSize={resultListState.pageSize}
                pageSizes={auditRoundResultPageSizeOptions.map((value) => ({ value, href: buildAuditRoundResultListHref({ locale, roundId: round.id, result: resultListState.result, returnTo: returnToHref, search: resultListState.search, page: 1, pageSize: value }) }))}
                labels={{
                  navigation: tCommon("pagination"),
                  previous: tCommon("previous"),
                  next: tCommon("next"),
                  pageOf: tCommon("pageOf", { page: resultListState.page, total: resultTotalPages }),
                  range: tCommon("showingRange", { from: formatCount(resultStart), to: formatCount(resultEnd), total: formatCount(resultListTotal) }),
                  pageSizeGroup: tCommon("pageSizeLabel"),
                  rowsPerPage: tCommon("rowsPerPage"),
                }}
              />
            </DataTableFoot>
          ) : null}
        </div>
```

(13) `Metric`, `MobileAuditDetailField`, `DashboardCard` and `AuditRoundResultPagination` go. Replace:

```tsx
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  )
}

function MobileAuditDetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-background px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm text-foreground">{value}</div>
    </div>
  )
}

function DashboardCard({
  label,
  value,
  tone,
  href,
  active = false,
  actionLabel,
  disabled = false,
}: {
  label: string
  value: number
  tone: "success" | "warning" | "danger" | "info" | "muted"
  href?: string
  active?: boolean
  actionLabel?: string
  disabled?: boolean
}) {
  const toneClass =
    disabled
      ? "border-border bg-background text-muted-foreground"
      : tone === "success"
      ? "border-success-border bg-success-soft text-success"
      : tone === "warning"
        ? "border-warning-border bg-warning-soft text-warning"
        : tone === "danger"
          ? "border-danger-border bg-danger-soft text-danger"
          : tone === "info"
            ? "border-info-border bg-info-soft text-info"
            : "border-border bg-background text-muted-foreground"
  const activeClassName = active ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
  const content = (
    <>
      <div className="text-xs font-medium">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {actionLabel ? <div className="mt-2 text-xs font-semibold underline-offset-2">{actionLabel}</div> : null}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={`block rounded-md border px-3 py-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${toneClass} ${activeClassName}`}>
        {content}
      </Link>
    )
  }

  return <div className={`rounded-md border px-3 py-3 ${toneClass}`}>{content}</div>
}

function AuditRoundResultPagination({
  locale,
  roundId,
  state,
  total,
  returnTo,
  labels,
}: {
  locale: string
  roundId: string
  state: AuditRoundResultListState
  total: number
  returnTo: string
  labels: { rowsPerPage: string; page: string; of: string; previous: string; next: string }
}) {
  const { start, end, totalPages } = paginationRange(state.page, state.pageSize, total)
  const previousPage = Math.max(1, state.page - 1)
  const nextPage = Math.min(totalPages, state.page + 1)

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div>
        {start}-{end} {labels.of} {total}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span>{labels.rowsPerPage}</span>
        {auditRoundResultPageSizeOptions.map((pageSize) => (
          <Link
            key={pageSize}
            href={buildAuditRoundResultListHref({ locale, roundId, result: state.result, returnTo, search: state.search, page: 1, pageSize })}
            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 transition-colors ${
              state.pageSize === pageSize ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface hover:bg-accent"
            }`}
          >
            {pageSize}
          </Link>
        ))}
        <span className="px-2">
          {labels.page} {Math.min(state.page, totalPages)} {labels.of} {totalPages}
        </span>
        <Link
          href={buildAuditRoundResultListHref({ locale, roundId, result: state.result, returnTo, search: state.search, page: previousPage, pageSize: state.pageSize })}
          aria-disabled={state.page <= 1}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${state.page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-accent"}`}
        >
          {labels.previous}
        </Link>
        <Link
          href={buildAuditRoundResultListHref({ locale, roundId, result: state.result, returnTo, search: state.search, page: nextPage, pageSize: state.pageSize })}
          aria-disabled={state.page >= totalPages}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${state.page >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-accent"}`}
        >
          {labels.next}
        </Link>
      </div>
    </div>
  )
}

type AuditRoundTranslator = Awaited<ReturnType<typeof getTranslations>>
```

with:

```tsx
}

type AuditRoundTranslator = Awaited<ReturnType<typeof getTranslations>>
```

Check: `grep -n "ColumnHeader\|<Breadcrumbs\|<h1\|bg-muted/\|opacity-50\|colSpan\|\"-\"\|function Metric\|DashboardCard\|MobileAuditDetailField\|AuditRoundResultPagination\|ArrowLeft\|pb-24" "src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx"` prints the `ArrowLeft` import, the `pb-24 md:pb-0` root, the `<ArrowLeft className="h-4 w-4" />` bar item and `colSpan={7}` of `TableEmptyRow`, and nothing else.

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/audit-round-result-drilldown.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/breadcrumbs-ui.test.ts tests/audit-item-status-labels.test.ts tests/audit-round-cancellation.test.ts tests/form-migration-guards.test.ts tests/list-primitives-ui.test.ts tests/row-actions-ui.test.ts tests/mobile-field-navigation.test.ts`
Expected: PASS, `tests 138 · pass 138 · fail 0`.

Run: `node --test tests/list-pages-ui.test.ts tests/operational-return-navigation.test.ts tests/dialog-trigger-handles.test.ts tests/audit-rounds-ux.test.ts`
Expected: PASS, `fail 0`.

Run: `node <temp>/p2b1-precheck.mjs --file "D/audit/rounds/[id]/page.tsx"` then `node <temp>/p2b1-precheck.mjs --budgets`
Expected: `· in MIGRATED_LIST_FILES`, the rows `LB1 1 1 1 0` and `LP1 1 1 1 1`, every other row live 0 and budget 0, and `args    LB1=1:1 LP1=1:1`; then exit 0 with `R7 … 20 in 14 rows`, `LH1 … 30 in 30 rows`, `LT3 … 4 in 3 rows`, `LT4 … 2 in 2 rows`, `LT5 … 5 in 3 rows`, `LV2 … 100 in 32 rows`, `LS1 … 18 in 16 rows`, `LK1 … 8 in 8 rows`, `LB1 BUDGETS.LB1 12 in 12 rows · live 11 in 11 files · over 0 · slack 1` (only `D/maintenance/[id]/page.tsx`, 2B-4) and `budgets hold: …`.

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b2-tw-probe.mjs "src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx"`
Expected: `checked 75 classes, missing 6: audit-rounds export-pdf function string, t: if`. The six are words of the string literals `"audit-rounds"`, `"export-pdf"` and of type text that the probe's pattern catches; the file at `e3f20ce` reports the same six and a `-`. The probe exits 1 because of them; that is the expected result. No class is new to `src`.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 0 fail, 1 skipped, and 1 more test than before Step 2; tsc no errors (`auditResultLabel` is now `string | null`; `resultStatItems` returns `StatStripItem[]`); lint 0 errors and 146 warnings, all under `.agents/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 5 files: the page 251 insertions and 346 deletions, `tests/audit-round-result-drilldown.test.ts` 3 and 2, `tests/list-pages-ui.test.ts` 17 insertions, `tests/list-frame-guards.test.ts` 1 and 8, `tests/visual-foundation-guards.test.ts` 1 deletion. The page stays CRLF (954 lines).

- [ ] **Step 8: Commit**

```bash
git add "src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx" tests/audit-round-result-drilldown.test.ts tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): audit round header on PageHeader, numbers on StatStrip, results on DataTable and Pagination (2B-2 task 10, B2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 5 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 2B-2 dev-app check (Task 18, spec §8.6 row `/th/audit/rounds/<id>`):**
- 1440, 1024, 768 and 375: crumbs → name 600 → code, badge and dates; five buttons in the order exports, "รายการรอตรวจ", "สแกน" (primary last); a cancelled round shows only the crumbs, title and meta, and "—" where who cancelled or the reason is empty
- 375: the bar shows สแกน, รายการรอตรวจ, ไปพิจารณารายการไม่ตรง and กลับ with a left arrow; the page's bottom padding is unchanged (the bar does not cover the pager)
- a result bucket with items opens its list at `#audit-result-list` and is the current cell (primary-soft + line; NVDA reads it as current); a bucket with 0 is not a link
- the result list: "แก้ไขผลตรวจ" opens the scan screen in edit mode and comes back to the same bucket, search and page; 25/50/100 keep the bucket; `?page=99` lands on the last page
- the phone cards show "ที่ตั้งตามระบบ" and "ผู้ถือครองตามระบบ" as label and value rows, "—" for no custodian

---

### Task 11: `D/audit/rounds/[id]/pending/page.tsx` on the list primitives, with real pages (B4) and ⋯ that opens the not-found dialog through its handle (R-m)

Spec §10.3 (bullet 2B-2: "`RowActions` + handle ของ P0 ใน disposal และ pending"), §8.6 row 12, §5.4 row …/pending, §5.9.1, §5.9.2 row 4, §5.9.3 (pending), §5.10 bugs 8 and 9, §6.4 (the `MasterDataSearch` hidden inputs), §4.4.3 row pending, §4.5.2 row 20, §10.4 table A row 2B-2 (`audit-pending-mobile-ux.test.ts:8`, `:15`, `:30`, `operational-return-navigation.test.ts:66`, `:69`), controller ruling (c), rulings I17, I21, B2, B4 and R-m. One page and one new client file, one commit. The page is CRLF; the new file is LF. The server change is read-only: the pending items move out of the round query into their own `findMany` with a `count` in one `Promise.all`. No schema, migration, index, API or message change.

Rulings this task applies:
- **B4, §5.9.2 row 4:** the round query keeps only `id`, `auditNo`, `name` and `status`; after `isAuditRoundReadOnlyStatus` (unchanged) the items load with `prisma.auditItem.findMany({ where, include (as before), orderBy: [{ createdAt: "asc" }, { id: "asc" }], skip, take })` and `prisma.auditItem.count({ where })` in one `Promise.all`. The `where` is the old item filter plus `auditRoundId: round.id`, in one `Prisma.AuditItemWhereInput` constant shared by both calls (its content does not change; `tests/audit-pending-mobile-ux.test.ts:11-13` and `operational-return-navigation.test.ts:90` pass unchanged). The `take: 1` of the latest audit movement stays: it is per asset, not a row limit. `IX_audit_items_auditRoundId_auditStatus` covers the `where` (`prisma/schema.prisma:696`); no index is added.
- **Bug §5.10 #8:** the count box says `t("pendingCount", { count: formatCount(total) })`: every pending item, where it counted the at most 200 rows of one query.
- **§5.9.1, I17, I21:** `listHref(next)` builds every link of the list through the file-local `buildAuditPendingListHref` (search, room, then `appendListPage`, then the page's own `returnTo` through `appendOperationalReturnTo`), so the pager, the page sizes, "ล้างคำค้น", "ดูทุกห้อง" and the past-the-end redirect keep `returnTo`, `search` and `locationId`; with the default page size the old links come out character for character. "ล้างคำค้น" and "ดูทุกห้อง" go back to page 1 and keep the page size. The search form sends `pageSize` when it is not 25 (`...pageSizeInput`); the two pins on the `searchParams` type and on `hiddenInputs` are appended to (`audit-pending-mobile-ux.test.ts:8`, `:15`, `operational-return-navigation.test.ts:66`, `:69`). A page past the last one (the last item of the last page marked "ไม่พบ") redirects to the last page.
- **B2, §4.5.2 row 20:** the text link above the title becomes `back={<PageBackLink href={returnToHref} label={tCommon("back")} />}` (44px icon below md); `operational-return-navigation.test.ts:68` (`href={returnToHref}`) passes unchanged. The root becomes `space-y-6` (§4.6.1).
- **Bug §5.10 #9, R-m, controller ruling (c):** desktop rows get `RowActions` through the new client file `src/components/audit/audit-pending-row-actions.tsx`: next step "สแกนรายการนี้" (`buildAuditPendingScanHref`), ⋯ = "ดูทรัพย์สิน" and "บันทึกไม่พบ". The menu never holds the dialog: the wrapper renders `AuditMarkNotFoundButton` outside it with `hideTrigger`, opens it with `notFoundRef.current?.open()` and passes `returnFocusRef={openerRef}`, the ref `RowActions` points at ⋯ before it calls `onSelect`. The P0 handle API is used as it is (`tests/dialog-trigger-handles.test.ts` passes unchanged). The page is a server component and cannot own a ref, hence the small client file.
- **Ruling (portal events):** React sends events from a portal up the component tree, so a click inside the not-found dialog would reach `ClickableTableRow` and open the asset page (the row skips only links, buttons, fields and `[data-no-row-click]`, and the dialog's text is none of them). The wrapper puts the dialog in `<div data-no-row-click className="contents" onClick={stopPortalEvent} onKeyDown={stopPortalEvent}>`. `contents` is the only class new to `src` in Tasks 9–11 (Step 6 proves it compiles).
- **§5.4, phone:** the card keeps its three buttons: the two links become `buttonVariants()` and `buttonVariants({ variant: "outline" })` (44px), `AuditMarkNotFoundButton variant="button"` stays (`audit-pending-mobile-ux.test.ts:23`). The phone list moves into the frame of the table so the one `Pagination` sits under both (§5.1), like the rounds pages.
- **§5.4, values:** `formatAuditPendingCustodian` returns `null` (LV2) and the page writes `?? <Nil />`; the last audit date is `null` before the first audit and shows `Nil` too (`formatDateTime` would print "-", R-n keeps that inside `src/lib`); `PendingInfo` shows `orNil(value)`. Codes are `tag` (R-p). The empty states keep their copy and get `actionVariant="secondary"` (clear the search, or go back).
- **New file:** LF, `"use client"`, no `busy`, no shadow, no dialog of its own (FMG GB4, VFG R2, GD2 have nothing to count); every LFG guard is 0 for it.
- **§8.7–8.9:** no later 2B plan lists the page, so it joins `MIGRATED_LIST_FILES` (the wrapper has no row and needs no entry).
- **Ruling (test):** the page is not added to `B4_LISTS`: its one `take: 1` (the latest audit movement of each asset) would fail that test's "no fixed take" check. `tests/list-pages-ui.test.ts` gets two tests of its own that make the same B4 checks and allow exactly that one `take: 1`.

What users will see on `/th/audit/rounds/<id>/pending`:
- A back button (outline, left arrow; an icon at 44px on phones) next to the title, where a small text link was.
- The count box counts every pending item. The list is paged: 25 per page by default, with the range, "หน้า x จาก y" and 25/50/100. Before, the list stopped at 200 rows without saying so.
- Desktop rows end in "สแกนรายการนี้" and ⋯ with "ดูทรัพย์สิน" and "บันทึกไม่พบ", the same three commands as the phone card (before, desktop had only the not-found icon). "บันทึกไม่พบ" opens the same dialog; closing it returns focus to ⋯.
- Phone: the cards sit in one white frame above the pager; the three buttons are 44px.
- An empty custodian or a never-audited asset reads "—".

Not in this task: `AuditMarkNotFoundButton` itself (P0, 2C) and its dialog · the scan screen · `resolveAuditPendingScanReturnTo` · messages · docs (Task 19).

**Files:**
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx` (`i/lf w/crlf`, 331 lines, no line break at the end; 5 exact replacements, Step 4)
- Create: `src/components/audit/audit-pending-row-actions.tsx` (LF, Step 4)
- Modify: `tests/audit-pending-mobile-ux.test.ts` (`i/lf w/crlf`, 3 replacements: `:8`, `:15`, `:30`)
- Modify: `tests/operational-return-navigation.test.ts` (`i/lf w/crlf`, 2 replacements: `:66`, `:69`)
- Modify: `tests/list-pages-ui.test.ts` (`i/lf w/crlf`, one block appended)
- Modify: `tests/list-frame-guards.test.ts`, `tests/visual-foundation-guards.test.ts` (`i/lf w/crlf`, through `p2b-budget.mjs` only)
- Temp folder only: `t11-pages-block.ts` (and Task 1's `p2b2-append.mjs`, `p2b2-tw-probe.mjs`)

**Must keep passing without edits:**
- `tests/audit-pending-mobile-ux.test.ts:9-14`, `:16-25` (`resolveFirstSearchParam`, the asset search `OR`, `MasterDataSearch`, `scanReturnToHref`, `normalizeAuditRoundDetailReturnTo`, `getMobileCardListClasses`, `getDesktopTableOnlyClasses`, `function AuditPendingMobileCard`, `const scanHref = buildAuditPendingScanHref`, `variant="button"`, `t("scanPendingAsset")`), `:31-34` (`ActionEmptyState`, `emptyTitle`, `emptySearchTitle`, `clearSearchHref`), `:37-53`
- `tests/operational-return-navigation.test.ts:67-68`, `:70-71` (`normalizeAuditRoundWorkflowReturnTo(locale, round.id, rawSearchParams.returnTo)`, `href={returnToHref}`), `:88-98` (the room filter and its copy)
- `tests/audit-scan-result-semantics.test.ts:21-30` (the pending page owns `AuditMarkNotFoundButton`) · `tests/dialog-trigger-handles.test.ts` (whole file) · `tests/form-migration-guards.test.ts` (whole file) · `tests/mobile-field-navigation.test.ts` · `tests/row-actions-ui.test.ts` · `tests/design-tokens-contrast.test.ts`

**Interfaces:**
- Consumes: from Task 9's list `PageHeader`, `DataTable`, `DataTableHeader`, `DataTableBody`, `DataTableHead`, `DataTableCell`, `DataTableFoot`, `TableEmptyRow`, `Pagination`, `RowActions` (in the wrapper), `buttonVariants`, `formatCount`, `LIST_PAGE_SIZES`, `parseListPage`, `listPageWindow`, `lastListPage`, `appendListPage` and `paginationRange` (same signatures), plus `PageBackLink({ href, label, onClick?, className? })` from `@/components/ui/page-header`, `Nil` and `orNil(value, label?)` from `@/components/ui/nil`, `type Prisma` from `@prisma/client`, `redirect` from `next/navigation`, and `AuditMarkNotFoundButton({ itemId, variant?, ref?: Ref<AuditMarkNotFoundButtonHandle>, hideTrigger?, returnFocusRef?: RefObject<HTMLElement | null> })` with `type AuditMarkNotFoundButtonHandle = { open: () => void }` from `@/components/audit/audit-mark-not-found-button` (P0, unchanged). `RowActions` calls an `action` item's `onSelect` after it points `openerRef` at ⋯, and keeps the closing menu from pulling focus back (`c/ui/row-actions.tsx` `openFromMenu`, `keepDialogFocus`).
- Produces:
  - `src/components/audit/audit-pending-row-actions.tsx`: `"use client"` · `export function AuditPendingRowActions({ itemId, assetTag, assetName, scanHref, assetHref }: { itemId: string; assetTag: string; assetName: string; scanHref: string; assetHref: string }): JSX.Element`.
  - The pending list paged on the server; the file-local `buildAuditPendingListHref({ pendingHref, returnTo, search, locationId, page?, pageSize? })` and `formatAuditPendingLastAudit(movements): string | null`; `formatAuditPendingCustodian` now returns `string | null`.
  - The list-pages tests `the pending list of a round pages on the server …` and `pending rows: RowActions on desktop …`; the page in `MIGRATED_LIST_FILES`.

| guard | before → after |
|---|---|
| VFG R7 | pending page 1 → – |
| LFG | pending page LH1 1 · LT3 1 · LV2 1 → all – · joins `MIGRATED_LIST_FILES` · `audit-pending-row-actions.tsx` new, 0 in every guard |

Running totals (with Tasks 1–10 in): R7 20 → 19 (13 rows) · LH1 30 → 29 · LT3 4 → 3 (2 rows; = the 2B-2 target) · LV2 100 → 99 (31 rows).

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`
Expected: nothing.

Run: `git diff --quiet e3f20ce -- "src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx" src/components/audit/audit-mark-not-found-button.tsx tests/audit-pending-mobile-ux.test.ts && echo UNCHANGED` then `test -e src/components/audit/audit-pending-row-actions.tsx || echo FREE`
Expected: `UNCHANGED`, then `FREE`.

Run: `grep -n "export type AuditMarkNotFoundButtonHandle = { open: () => void }\|hideTrigger = false\|returnFocusRef?: RefObject<HTMLElement | null>" src/components/audit/audit-mark-not-found-button.tsx`
Expected: three lines (the handle type, the `hideTrigger` default and the `returnFocusRef` prop): the P0 API this task uses.

Run: `node <temp>/p2b1-precheck.mjs --file "D/audit/rounds/[id]/pending/page.tsx"`
Expected (exit 0): `(CRLF) · not in MIGRATED_LIST_FILES`, the rows `R7 1 1 0 1`, `LH1 1 1 0 1`, `LT3 1 1 0 1`, `LV2 1 1 0 1`, and `args    R7=1:1 LH1=1:1 LT3=1:1 LV2=1:1`.

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected (exit 0): `R7 … 20 in 14 rows`, `LH1 … 30 in 30 rows`, `LT3 … 4 in 3 rows`, `LV2 … 100 in 32 rows`, `budgets hold: …`.

- [ ] **Step 2: The failing tests**

(a) `tests/audit-pending-mobile-ux.test.ts:8`, appended to (I17). Replace:

```ts
  assert.match(page, /searchParams: Promise<\{ returnTo\?: string \| string\[\]; search\?: string \| string\[\]; locationId\?: string \| string\[\] \}>/)
```

with:

```ts
  assert.match(page, /searchParams: Promise<\{ returnTo\?: string \| string\[\]; search\?: string \| string\[\]; locationId\?: string \| string\[\]; page\?: string \| string\[\]; pageSize\?: string \| string\[\] \}>/)
```

(b) `tests/audit-pending-mobile-ux.test.ts:15`, appended to. Replace:

```ts
  assert.match(page, /hiddenInputs=\{\{ returnTo: returnToHref, \.\.\.\(locationFilter \? \{ locationId: locationFilter \} : \{\}\) \}\}/)
```

with:

```ts
  assert.match(page, /hiddenInputs=\{\{ returnTo: returnToHref, \.\.\.\(locationFilter \? \{ locationId: locationFilter \} : \{\}\), \.\.\.pageSizeInput \}\}/)
```

(c) `tests/audit-pending-mobile-ux.test.ts:30`. Replace:

```ts
  assert.match(page, /<table className="min-w-full divide-y divide-border text-sm">/)
```

with:

```ts
  assert.match(page, /<DataTable\b/)
```

(d) `tests/operational-return-navigation.test.ts:66`, appended to. Replace:

```ts
  assert.match(pendingSource, /searchParams: Promise<\{ returnTo\?: string \| string\[\]; search\?: string \| string\[\]; locationId\?: string \| string\[\] \}>/)
```

with:

```ts
  assert.match(pendingSource, /searchParams: Promise<\{ returnTo\?: string \| string\[\]; search\?: string \| string\[\]; locationId\?: string \| string\[\]; page\?: string \| string\[\]; pageSize\?: string \| string\[\] \}>/)
```

(e) `tests/operational-return-navigation.test.ts:69`, appended to. Replace:

```ts
  assert.match(pendingSource, /hiddenInputs=\{\{ returnTo: returnToHref, \.\.\.\(locationFilter \? \{ locationId: locationFilter \} : \{\}\) \}\}/)
```

with:

```ts
  assert.match(pendingSource, /hiddenInputs=\{\{ returnTo: returnToHref, \.\.\.\(locationFilter \? \{ locationId: locationFilter \} : \{\}\), \.\.\.pageSizeInput \}\}/)
```

(f) Save this block as `t11-pages-block.ts` in your temp folder, then run `node <temp>/p2b2-append.mjs <temp>/t11-pages-block.ts tests/list-pages-ui.test.ts`:

```ts
// Plan 2B-2 Task 11 (spec 2B §5.4 row pending, §5.9.2 row 4, bugs §5.10 #8 and #9, I21, R-m): the pending list of a
// round. It pages like the B4 lists, but it is not in B4_LISTS: its one fixed take is the latest audit movement of each
// asset, which the B4_LISTS check would read as a row limit.
test("the pending list of a round pages on the server and counts every pending item (spec 2B §5.9.2 row 4, bug §5.10 #8)", () => {
  const source = read(`${D}audit/rounds/[id]/pending/page.tsx`)
  assert.match(source, /const listPage = parseListPage\(\{ page: rawSearchParams\.page, pageSize: rawSearchParams\.pageSize \}\)/)
  assert.match(source, /const \{ skip, take \} = listPageWindow\(listPage\)/)
  assert.deepEqual(source.match(/\btake: \d+/g), ["take: 1"], "the only fixed take is the latest audit movement of each asset")
  assert.match(source, /orderBy: \[\{ createdAt: "asc" \}, \{ id: "asc" \}\]/, "the old order plus id, so no item shows on two pages")
  assert.match(source, /await Promise\.all\(\[\n\s+prisma\.auditItem\.findMany\(\{[\s\S]*?\n\s+\}\),\n\s+prisma\.auditItem\.count\(\{ where \}\),\n\s+\]\)/, "findMany and count in one Promise.all")
  assert.ok(source.indexOf("if (!round || isAuditRoundReadOnlyStatus(round.status)) notFound()") < source.indexOf("prisma.auditItem.findMany("), "the items load only after the round passed the read-only check")
  assert.match(source, /t\("pendingCount", \{ count: formatCount\(total\) \}\)/, "the box counts every pending item, not the rows of one page")
  assert.match(source, /^import \{ notFound, redirect \} from "next\/navigation"$/m)
  assert.match(source, /const lastPage = lastListPage\(total, listPage\.pageSize\)\n\s+if \(items\.length === 0 && total > 0 && listPage\.page > lastPage\) \{\n\s+redirect\(listHref\(\{ page: lastPage \}\)\)/, "a page past the last one shows the last page (I21)")
  assert.match(source, /return appendOperationalReturnTo\(query \? `\$\{pendingHref\}\?\$\{query\}` : pendingHref, returnTo\)/, "every list link keeps the page's returnTo, the search and the room")
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: listHref\(\{ pageSize: value \}\) \}\)\)\}/)
})

test("pending rows: RowActions on desktop with the not-found dialog opened through its handle, three buttons on the phone card (spec 2B §5.4, bug §5.10 #9, R-m)", () => {
  const page = read(`${D}audit/rounds/[id]/pending/page.tsx`)
  const wrapper = read(`${C}audit/audit-pending-row-actions.tsx`)
  for (const part of ["<PageHeader", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<TableEmptyRow", "<ClickableTableRow", "<DataTableFoot>", "<Pagination"]) {
    assert.ok(page.includes(part), `page: no ${part}`)
  }
  assert.match(page, /<div className="space-y-6">/)
  assert.match(page, /back=\{<PageBackLink href=\{returnToHref\} label=\{tCommon\("back"\)\} \/>\}/, "the text link above the title became the back button (B2)")
  assert.match(page, /<DataTableHead align="right" sticky="right" hideLabel>\{tCommon\("actions"\)\}<\/DataTableHead>/)
  assert.match(page, /<DataTableCell align="right" sticky="right">\s*<AuditPendingRowActions/)
  assert.match(page, /<AuditMarkNotFoundButton itemId=\{item\.id\} variant="button" \/>/, "the phone card keeps its own not-found button")
  assert.match(wrapper, /^"use client"/)
  assert.match(wrapper, /next=\{\{ label: t\("scanPendingAsset"\), href: scanHref, icon: <ScanLine aria-hidden="true" \/> \}\}/)
  assert.match(wrapper, /\{ kind: "link", key: "view", label: t\("viewAsset"\), href: assetHref, icon: <Eye aria-hidden="true" \/> \}/)
  assert.match(wrapper, /\{ kind: "action", key: "notFound", label: t\("markNotFound"\), icon: <AlertTriangle aria-hidden="true" \/>, onSelect: \(\) => notFoundRef\.current\?\.open\(\) \}/)
  assert.match(wrapper, /openerRef=\{openerRef\}/)
  assert.match(wrapper, /<AuditMarkNotFoundButton ref=\{notFoundRef\} itemId=\{itemId\} hideTrigger returnFocusRef=\{openerRef\} \/>/, "the dialog sits outside the menu and gives focus back to ⋯")
  assert.match(wrapper, /<div data-no-row-click className="contents" onClick=\{stopPortalEvent\} onKeyDown=\{stopPortalEvent\}>/, "events from the dialog portal never reach the row")
})
```

Run: `node --test tests/list-pages-ui.test.ts tests/audit-pending-mobile-ux.test.ts tests/operational-return-navigation.test.ts`
Expected: FAIL, `fail 5`; every other test passes (`tests/list-pages-ui.test.ts` has 2 more tests than before this step):
- `audit pending page exposes mobile-first searchable pending cards`: no match for the `searchParams` type with `page\?` and `pageSize\?`
- `audit pending page keeps desktop table and empty states`: no match for `/<DataTable\b/`
- `audit rounds preserve list context across round detail, scan, and pending pages`: the same `searchParams` type in the pending page
- `the pending list of a round pages on the server …`: no match for `/const listPage = parseListPage\(…\)/`
- `pending rows: RowActions on desktop …`: `ENOENT` for `src/components/audit/audit-pending-row-actions.tsx`

- [ ] **Step 3: Lower the guard rows of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs "D/audit/rounds/[id]/pending/page.tsx" R7=1:0 LH1=1:0 LT3=1:0 LV2=1:0 --migrated`
Expected (exit 0):
```
R7: 1 -> 0 (row deleted)
LH1: 1 -> 0 (row deleted)
LT3: 1 -> 0 (row deleted)
LV2: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx
```
The `// 2B-2` comment of `BUDGETS.LT3` goes too: this was the last 2B-2 row of LT3.

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 42 · fail 5`, each naming only the pending page: LFG `LH1` (`30 in 30 files`), `LT3` (`4 in 3 files`), `LV2` (`100 in 32 files`), `L0` with the same three lines, and VFG `R7 interim: …` (`20 matches in 14 files`).

- [ ] **Step 4: The client wrapper and the paged page**

(1) Create `src/components/audit/audit-pending-row-actions.tsx` (LF):

```tsx
"use client"

import { useRef, type SyntheticEvent } from "react"
import { useTranslations } from "next-intl"
import { AlertTriangle, Eye, ScanLine } from "lucide-react"
import { AuditMarkNotFoundButton, type AuditMarkNotFoundButtonHandle } from "@/components/audit/audit-mark-not-found-button"
import { RowActions } from "@/components/ui/row-actions"

// React sends events up the component tree, so a click inside the not-found dialog (a portal outside the row) would
// reach the clickable table row and open the asset page. The dialog's wrapper stops them before the row.
function stopPortalEvent(event: SyntheticEvent) {
  event.stopPropagation()
}

// The desktop row actions of a pending audit item (pattern ช1, spec 2B §5.4 row pending, bug §5.10 #9): "สแกนรายการนี้"
// as the next step, then ⋯ with "ดูทรัพย์สิน" and "บันทึกไม่พบ", the same three commands as the phone card. A menu never
// holds a dialog (R-m): AuditMarkNotFoundButton renders here without its trigger, opens through its handle, and gives
// focus back to ⋯ (openerRef). A small client file, because the pending page is a server component.
export function AuditPendingRowActions({
  itemId,
  assetTag,
  assetName,
  scanHref,
  assetHref,
}: {
  itemId: string
  assetTag: string
  assetName: string
  scanHref: string
  assetHref: string
}) {
  const t = useTranslations("auditPending")
  const tCommon = useTranslations("common")
  const notFoundRef = useRef<AuditMarkNotFoundButtonHandle>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  return (
    <>
      <RowActions
        code={assetTag}
        name={assetName}
        menuLabel={tCommon("moreActionsFor", { code: assetTag })}
        next={{ label: t("scanPendingAsset"), href: scanHref, icon: <ScanLine aria-hidden="true" /> }}
        groups={[
          {
            key: "item",
            items: [
              { kind: "link", key: "view", label: t("viewAsset"), href: assetHref, icon: <Eye aria-hidden="true" /> },
              { kind: "action", key: "notFound", label: t("markNotFound"), icon: <AlertTriangle aria-hidden="true" />, onSelect: () => notFoundRef.current?.open() },
            ],
          },
        ]}
        openerRef={openerRef}
      />
      <div data-no-row-click className="contents" onClick={stopPortalEvent} onKeyDown={stopPortalEvent}>
        <AuditMarkNotFoundButton ref={notFoundRef} itemId={itemId} hideTrigger returnFocusRef={openerRef} />
      </div>
    </>
  )
}
```

(2) The page (`src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx`, CRLF). Five exact replacements, top to bottom; make all of them before you compile.

(2a) Imports and the props type. Replace:

```tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Eye, ScanLine } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { ColumnHeader, MasterDataSearch } from "@/components/master-data/master-data-layout"
import { AuditMarkNotFoundButton } from "@/components/audit/audit-mark-not-found-button"
import { formatDateTime } from "@/lib/utils"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { getDesktopTableOnlyClasses, getMobileCardListClasses } from "@/lib/design-system"
import { appendOperationalReturnTo, normalizeAuditRoundDetailReturnTo, normalizeAuditRoundWorkflowReturnTo } from "@/lib/operational-return-navigation"
import { isAuditRoundReadOnlyStatus } from "@/lib/audit-round-status"

type AuditPendingPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[]; search?: string | string[]; locationId?: string | string[] }>
}
```

with:

```tsx
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import type { Prisma } from "@prisma/client"
import { getTranslations } from "next-intl/server"
import { Eye, ScanLine } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { MasterDataSearch } from "@/components/master-data/master-data-layout"
import { AuditMarkNotFoundButton } from "@/components/audit/audit-mark-not-found-button"
import { AuditPendingRowActions } from "@/components/audit/audit-pending-row-actions"
import { formatDateTime } from "@/lib/utils"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { Nil, orNil } from "@/components/ui/nil"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { getDesktopTableOnlyClasses, getMobileCardListClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, appendListPage, lastListPage, listPageWindow, parseListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendOperationalReturnTo, normalizeAuditRoundDetailReturnTo, normalizeAuditRoundWorkflowReturnTo } from "@/lib/operational-return-navigation"
import { isAuditRoundReadOnlyStatus } from "@/lib/audit-round-status"

type AuditPendingPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[]; search?: string | string[]; locationId?: string | string[]; page?: string | string[]; pageSize?: string | string[] }>
}
```

(2b) The round, then the paged items with their count, the list links and the past-the-end redirect. Replace:

```tsx
  const locationFilter = resolveFirstSearchParam(rawSearchParams.locationId ?? "").trim()

  const round = await prisma.auditRound.findFirst({
    where: { id, isActive: true },
    select: {
      id: true,
      auditNo: true,
      name: true,
      status: true,
      items: {
        where: {
          auditStatus: "pending",
          ...(locationFilter ? { expectedLocationId: locationFilter } : {}),
          ...(searchText
            ? {
                asset: {
                  OR: [
                    { assetTag: { contains: searchText } },
                    { name: { contains: searchText } },
                    {
                      currentLocation: {
                        OR: [
                          { code: { contains: searchText } },
                          { name: { contains: searchText } },
                        ],
                      },
                    },
                    {
                      custodian: {
                        OR: [
                          { code: { contains: searchText } },
                          { fullNameTh: { contains: searchText } },
                        ],
                      },
                    },
                  ],
                },
              }
            : {}),
        },
        take: 200,
        orderBy: { createdAt: "asc" },
        include: {
          asset: {
            select: {
              id: true,
              assetTag: true,
              name: true,
              currentLocation: { select: { code: true, name: true } },
              custodian: { select: { code: true, fullNameTh: true } },
              movements: {
                where: { movementType: { contains: "audit" } },
                orderBy: { performedAt: "desc" },
                take: 1,
                select: { performedAt: true },
              },
            },
          },
        },
      },
    },
  })
  if (!round || isAuditRoundReadOnlyStatus(round.status)) notFound()
  const returnToHref = normalizeAuditRoundWorkflowReturnTo(locale, round.id, rawSearchParams.returnTo)
  const scanReturnToHref = resolveAuditPendingScanReturnTo(locale, round.id, returnToHref)
  const pendingHref = `/${locale}/audit/rounds/${round.id}/pending`
  const clearSearchHref = appendOperationalReturnTo(
    locationFilter ? `${pendingHref}?locationId=${encodeURIComponent(locationFilter)}` : pendingHref,
    returnToHref,
  )
  const clearRoomFilterHref = appendOperationalReturnTo(
    searchText ? `${pendingHref}?search=${encodeURIComponent(searchText)}` : pendingHref,
    returnToHref,
  )
  const filterLocation = locationFilter
    ? await prisma.location.findFirst({ where: { id: locationFilter }, select: { code: true, name: true } })
    : null
  const locationFilterLabel = filterLocation ? `${filterLocation.code} - ${filterLocation.name}` : locationFilter
  const emptyTitle = searchText ? t("emptySearchTitle") : t("emptyTitle")
  const emptyHelp = searchText ? t("emptySearchHelp") : t("emptyHelp")
  const emptyActionHref = searchText ? clearSearchHref : returnToHref
  const emptyActionLabel = searchText ? t("clearSearch") : tCommon("back")
```

with:

```tsx
  const locationFilter = resolveFirstSearchParam(rawSearchParams.locationId ?? "").trim()
  const listPage = parseListPage({ page: rawSearchParams.page, pageSize: rawSearchParams.pageSize })

  const round = await prisma.auditRound.findFirst({
    where: { id, isActive: true },
    select: {
      id: true,
      auditNo: true,
      name: true,
      status: true,
    },
  })
  if (!round || isAuditRoundReadOnlyStatus(round.status)) notFound()

  // Real pages (spec 2B B4, §5.9.2 row 4): the pending items load on their own once the round passed the read-only
  // check, with the whole count in the same Promise.all, so the box above the list counts every pending item.
  const where: Prisma.AuditItemWhereInput = {
    auditRoundId: round.id,
    auditStatus: "pending",
    ...(locationFilter ? { expectedLocationId: locationFilter } : {}),
    ...(searchText
      ? {
          asset: {
            OR: [
              { assetTag: { contains: searchText } },
              { name: { contains: searchText } },
              {
                currentLocation: {
                  OR: [
                    { code: { contains: searchText } },
                    { name: { contains: searchText } },
                  ],
                },
              },
              {
                custodian: {
                  OR: [
                    { code: { contains: searchText } },
                    { fullNameTh: { contains: searchText } },
                  ],
                },
              },
            ],
          },
        }
      : {}),
  }
  const { skip, take } = listPageWindow(listPage)
  const [items, total] = await Promise.all([
    prisma.auditItem.findMany({
      where,
      include: {
        asset: {
          select: {
            id: true,
            assetTag: true,
            name: true,
            currentLocation: { select: { code: true, name: true } },
            custodian: { select: { code: true, fullNameTh: true } },
            movements: {
              where: { movementType: { contains: "audit" } },
              orderBy: { performedAt: "desc" },
              take: 1,
              select: { performedAt: true },
            },
          },
        },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      skip,
      take,
    }),
    prisma.auditItem.count({ where }),
  ])
  const returnToHref = normalizeAuditRoundWorkflowReturnTo(locale, round.id, rawSearchParams.returnTo)
  const scanReturnToHref = resolveAuditPendingScanReturnTo(locale, round.id, returnToHref)
  const pendingHref = `/${locale}/audit/rounds/${round.id}/pending`
  // The list URL keeps the search, the room, the page size and the page's own returnTo (spec 2B §5.9.2 row 4).
  const listHref = (next: { search?: string; locationId?: string; page?: number; pageSize?: number }) =>
    buildAuditPendingListHref({
      pendingHref,
      returnTo: returnToHref,
      search: next.search ?? searchText,
      locationId: next.locationId ?? locationFilter,
      page: next.page,
      pageSize: next.pageSize ?? listPage.pageSize,
    })
  // A page past the last one (the last item of the last page marked not found, or an old link) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listPage.pageSize)
  if (items.length === 0 && total > 0 && listPage.page > lastPage) {
    redirect(listHref({ page: lastPage }))
  }
  const { start, end, totalPages } = paginationRange(listPage.page, listPage.pageSize, total)
  // A search or a room change goes back to page 1 and keeps the page size.
  const clearSearchHref = listHref({ search: "" })
  const clearRoomFilterHref = listHref({ locationId: "" })
  const pageSizeInput = Object.fromEntries(appendListPage(new URLSearchParams(), { pageSize: listPage.pageSize }))
  const filterLocation = locationFilter
    ? await prisma.location.findFirst({ where: { id: locationFilter }, select: { code: true, name: true } })
    : null
  const locationFilterLabel = filterLocation ? `${filterLocation.code} - ${filterLocation.name}` : locationFilter
  const emptyTitle = searchText ? t("emptySearchTitle") : t("emptyTitle")
  const emptyHelp = searchText ? t("emptySearchHelp") : t("emptyHelp")
  const emptyActionHref = searchText ? clearSearchHref : returnToHref
  const emptyActionLabel = searchText ? t("clearSearch") : tCommon("back")
```

(2c) The header with its back button, the count box, the search form, and the list: phone cards and table in one frame, `AuditPendingRowActions`, the empty rows and the pager. Replace:

```tsx
  return (
    <div>
      <div className="mb-6">
        <Link href={returnToHref} className="text-sm text-primary hover:underline">
          {tCommon("back")}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("subtitle", { round: `${round.auditNo} - ${round.name}` })}
        </p>
      </div>

      <div className="mb-4 rounded-lg border border-border bg-surface p-3 text-sm text-muted-foreground sm:p-4">
        {t("pendingCount", { count: round.items.length })}
        {locationFilter ? (
          <div className="mt-1 flex flex-wrap items-center gap-x-3">
            <span>{t("roomFilter", { location: locationFilterLabel })}</span>
            <Link href={clearRoomFilterHref} className="inline-flex min-h-11 items-center text-sm text-primary hover:underline">
              {t("roomFilterClear")}
            </Link>
          </div>
        ) : null}
      </div>

      <MasterDataSearch
        action={`/${locale}/audit/rounds/${round.id}/pending`}
        defaultValue={searchText}
        placeholder={t("searchPlaceholder")}
        submitLabel={tCommon("search")}
        hiddenInputs={{ returnTo: returnToHref, ...(locationFilter ? { locationId: locationFilter } : {}) }}
      />

      <div className={`${getMobileCardListClasses()} mb-4`}>
        {round.items.length === 0 ? (
          <ActionEmptyState
            icon={<ScanLine className="h-6 w-6" />}
            title={emptyTitle}
            description={emptyHelp}
            actionHref={emptyActionHref}
            actionLabel={emptyActionLabel}
          />
        ) : (
          round.items.map((item) => (
            <AuditPendingMobileCard
              key={item.id}
              item={item}
              locale={locale}
              roundId={round.id}
              scanReturnToHref={scanReturnToHref}
              labels={{
                expectedLocation: t("expectedLocation"),
                expectedCustodian: t("expectedCustodian"),
                lastAuditDate: t("lastAuditDate"),
                scanPendingAsset: t("scanPendingAsset"),
                viewAsset: t("viewAsset"),
              }}
            />
          ))
        )}
      </div>

      <div className={`${getDesktopTableOnlyClasses()} overflow-hidden rounded-lg border border-border bg-surface`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <ColumnHeader>{t("assetTag")}</ColumnHeader>
                <ColumnHeader>{t("assetName")}</ColumnHeader>
                <ColumnHeader>{t("expectedLocation")}</ColumnHeader>
                <ColumnHeader>{t("expectedCustodian")}</ColumnHeader>
                <ColumnHeader>{t("lastAuditDate")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {round.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8">
                    <ActionEmptyState
                      icon={<ScanLine className="h-6 w-6" />}
                      title={emptyTitle}
                      description={emptyHelp}
                      actionHref={emptyActionHref}
                      actionLabel={emptyActionLabel}
                    />
                  </td>
                </tr>
              ) : (
                round.items.map((item) => (
                  <ClickableTableRow
                    key={item.id}
                    href={`/${locale}/assets/${item.asset.id}`}
                    label={`${tCommon("view")}: ${item.asset.assetTag}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{item.asset.assetTag}</td>
                    <td className="min-w-56 px-4 py-3 text-foreground">{item.asset.name}</td>
                    <td className="min-w-56 px-4 py-3 text-muted-foreground">
                      {formatAuditPendingLocation(item.asset.currentLocation)}
                    </td>
                    <td className="min-w-56 px-4 py-3 text-muted-foreground">
                      {formatAuditPendingCustodian(item.asset.custodian)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatDateTime(item.asset.movements[0]?.performedAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <AuditMarkNotFoundButton itemId={item.id} />
                    </td>
                  </ClickableTableRow>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
```

with:

```tsx
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle", { round: `${round.auditNo} - ${round.name}` })}
        back={<PageBackLink href={returnToHref} label={tCommon("back")} />}
      />

      <div className="rounded-lg border border-border bg-surface p-3 text-sm text-muted-foreground sm:p-4">
        {t("pendingCount", { count: formatCount(total) })}
        {locationFilter ? (
          <div className="mt-1 flex flex-wrap items-center gap-x-3">
            <span>{t("roomFilter", { location: locationFilterLabel })}</span>
            <Link href={clearRoomFilterHref} className="inline-flex min-h-11 items-center text-sm text-primary hover:underline">
              {t("roomFilterClear")}
            </Link>
          </div>
        ) : null}
      </div>

      <MasterDataSearch
        action={`/${locale}/audit/rounds/${round.id}/pending`}
        defaultValue={searchText}
        placeholder={t("searchPlaceholder")}
        submitLabel={tCommon("search")}
        hiddenInputs={{ returnTo: returnToHref, ...(locationFilter ? { locationId: locationFilter } : {}), ...pageSizeInput }}
      />

      <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
        <div className={`${getMobileCardListClasses()} p-3`}>
          {items.length === 0 ? (
            <ActionEmptyState
              icon={<ScanLine className="h-6 w-6" />}
              title={emptyTitle}
              description={emptyHelp}
              actionHref={emptyActionHref}
              actionLabel={emptyActionLabel}
              actionVariant="secondary"
            />
          ) : (
            items.map((item) => (
              <AuditPendingMobileCard
                key={item.id}
                item={item}
                locale={locale}
                roundId={round.id}
                scanReturnToHref={scanReturnToHref}
                labels={{
                  expectedLocation: t("expectedLocation"),
                  expectedCustodian: t("expectedCustodian"),
                  lastAuditDate: t("lastAuditDate"),
                  scanPendingAsset: t("scanPendingAsset"),
                  viewAsset: t("viewAsset"),
                }}
              />
            ))
          )}
        </div>
        <DataTable framed={false} className={getDesktopTableOnlyClasses()} caption={t("title")} scrollHint={tCommon("tableScrollHint")}>
          <DataTableHeader>
            <tr>
              <DataTableHead>{t("assetTag")}</DataTableHead>
              <DataTableHead>{t("assetName")}</DataTableHead>
              <DataTableHead>{t("expectedLocation")}</DataTableHead>
              <DataTableHead>{t("expectedCustodian")}</DataTableHead>
              <DataTableHead>{t("lastAuditDate")}</DataTableHead>
              <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {items.length === 0 ? (
              <TableEmptyRow
                colSpan={6}
                emptyState={{
                  icon: <ScanLine className="h-6 w-6" />,
                  title: emptyTitle,
                  description: emptyHelp,
                  actionHref: emptyActionHref,
                  actionLabel: emptyActionLabel,
                  actionVariant: "secondary",
                }}
              />
            ) : (
              items.map((item) => (
                <ClickableTableRow
                  key={item.id}
                  href={`/${locale}/assets/${item.asset.id}`}
                  label={`${tCommon("view")}: ${item.asset.assetTag}`}
                >
                  <DataTableCell className="whitespace-nowrap">
                    <span className="tag font-medium text-foreground">{item.asset.assetTag}</span>
                  </DataTableCell>
                  <DataTableCell className="min-w-56 text-foreground">{item.asset.name}</DataTableCell>
                  <DataTableCell className="min-w-56 text-muted-foreground">
                    {formatAuditPendingLocation(item.asset.currentLocation)}
                  </DataTableCell>
                  <DataTableCell className="min-w-56 text-muted-foreground">
                    {formatAuditPendingCustodian(item.asset.custodian) ?? <Nil />}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-muted-foreground">
                    {formatAuditPendingLastAudit(item.asset.movements) ?? <Nil />}
                  </DataTableCell>
                  <DataTableCell align="right" sticky="right">
                    <AuditPendingRowActions
                      itemId={item.id}
                      assetTag={item.asset.assetTag}
                      assetName={item.asset.name}
                      scanHref={buildAuditPendingScanHref({ locale, roundId: round.id, assetId: item.asset.id, returnTo: scanReturnToHref })}
                      assetHref={`/${locale}/assets/${item.asset.id}`}
                    />
                  </DataTableCell>
                </ClickableTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>
        {total > 0 ? (
          <DataTableFoot>
            <Pagination
              page={listPage.page}
              totalPages={totalPages}
              previousHref={listHref({ page: listPage.page - 1 })}
              nextHref={listHref({ page: listPage.page + 1 })}
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
      </div>
    </div>
  )
```

(2d) The phone card's buttons and codes, and the empty values. Replace:

```tsx
  return (
    <article className="min-w-0 rounded-md border border-border bg-background p-4">
      <div className="min-w-0">
        <div className="break-words text-sm font-semibold text-foreground">{item.asset.assetTag}</div>
        <p className="mt-1 line-clamp-2 text-sm text-foreground">{item.asset.name}</p>
      </div>
      <div className="mt-3 grid gap-2 text-sm">
        <PendingInfo label={labels.expectedLocation} value={formatAuditPendingLocation(item.asset.currentLocation)} />
        <PendingInfo label={labels.expectedCustodian} value={formatAuditPendingCustodian(item.asset.custodian)} />
        <PendingInfo label={labels.lastAuditDate} value={formatDateTime(item.asset.movements[0]?.performedAt)} />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Link
          href={scanHref}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover sm:col-span-1"
        >
          <ScanLine className="h-4 w-4" />
          {labels.scanPendingAsset}
        </Link>
        <Link
          href={`/${locale}/assets/${item.asset.id}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          <Eye className="h-4 w-4" />
          {labels.viewAsset}
        </Link>
        <AuditMarkNotFoundButton itemId={item.id} variant="button" />
      </div>
    </article>
  )
}

function PendingInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm text-foreground">{value}</div>
    </div>
  )
}

function formatAuditPendingLocation(location: { code: string; name: string }) {
  return `${location.code} - ${location.name}`
}

function formatAuditPendingCustodian(custodian: { code: string; fullNameTh: string } | null) {
  return custodian ? `${custodian.code} - ${custodian.fullNameTh}` : "-"
}
```

with:

```tsx
  return (
    <article className="min-w-0 rounded-md border border-border bg-background p-4">
      <div className="min-w-0">
        <div className="break-words text-sm font-semibold text-foreground">
          <span className="tag font-medium">{item.asset.assetTag}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-foreground">{item.asset.name}</p>
      </div>
      <div className="mt-3 grid gap-2 text-sm">
        <PendingInfo label={labels.expectedLocation} value={formatAuditPendingLocation(item.asset.currentLocation)} />
        <PendingInfo label={labels.expectedCustodian} value={formatAuditPendingCustodian(item.asset.custodian)} />
        <PendingInfo label={labels.lastAuditDate} value={formatAuditPendingLastAudit(item.asset.movements)} />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Link href={scanHref} className={buttonVariants()}>
          <ScanLine aria-hidden="true" />
          {labels.scanPendingAsset}
        </Link>
        <Link href={`/${locale}/assets/${item.asset.id}`} className={buttonVariants({ variant: "outline" })}>
          <Eye aria-hidden="true" />
          {labels.viewAsset}
        </Link>
        <AuditMarkNotFoundButton itemId={item.id} variant="button" />
      </div>
    </article>
  )
}

function PendingInfo({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm text-foreground">{orNil(value)}</div>
    </div>
  )
}

function formatAuditPendingLocation(location: { code: string; name: string }) {
  return `${location.code} - ${location.name}`
}

// null when nobody holds the asset: the page shows Nil, not a typed dash.
function formatAuditPendingCustodian(custodian: { code: string; fullNameTh: string } | null) {
  return custodian ? `${custodian.code} - ${custodian.fullNameTh}` : null
}

// null before the first audit of the asset (formatDateTime would print a dash).
function formatAuditPendingLastAudit(movements: Array<{ performedAt: Date }>) {
  return movements[0] ? formatDateTime(movements[0].performedAt) : null
}
```

(2e) The list URL, after `buildAuditPendingScanHref`. Replace:

```tsx
function buildAuditPendingScanHref({ locale, roundId, assetId, returnTo }: { locale: string; roundId: string; assetId: string; returnTo: string }) {
  const params = new URLSearchParams({ assetId, returnTo })
  return `/${locale}/audit/rounds/${roundId}/scan?${params.toString()}`
}
```

with:

```tsx
function buildAuditPendingScanHref({ locale, roundId, assetId, returnTo }: { locale: string; roundId: string; assetId: string; returnTo: string }) {
  const params = new URLSearchParams({ assetId, returnTo })
  return `/${locale}/audit/rounds/${roundId}/scan?${params.toString()}`
}

// appendListPage writes page only above 1 and pageSize only when it is not 25, so the default links stay as they were.
function buildAuditPendingListHref({
  pendingHref,
  returnTo,
  search,
  locationId,
  page,
  pageSize,
}: {
  pendingHref: string
  returnTo: string
  search: string
  locationId: string
  page?: number
  pageSize?: number
}) {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  if (locationId) params.set("locationId", locationId)
  const query = appendListPage(params, { page, pageSize }).toString()
  return appendOperationalReturnTo(query ? `${pendingHref}?${query}` : pendingHref, returnTo)
}
```

Check: `grep -n "take: \|ColumnHeader\|<h1\|bg-muted/\|colSpan\|\"-\"\|round\.items\|text-primary hover:underline\">" "src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx"` prints `take: 1,` (the latest movement), `colSpan={6}` of `TableEmptyRow`, the "ดูทุกห้อง" link (`inline-flex min-h-11 … text-primary hover:underline`), and nothing else.

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/audit-pending-mobile-ux.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/audit-scan-result-semantics.test.ts tests/dialog-trigger-handles.test.ts tests/form-migration-guards.test.ts tests/row-actions-ui.test.ts tests/list-primitives-ui.test.ts tests/mobile-field-navigation.test.ts tests/breadcrumbs-ui.test.ts`
Expected: PASS, `tests 118 · pass 118 · fail 0`.

Run: `node --test tests/list-pages-ui.test.ts tests/operational-return-navigation.test.ts tests/audit-rounds-ux.test.ts tests/audit-round-result-drilldown.test.ts`
Expected: PASS, `fail 0`.

Run: `node <temp>/p2b1-precheck.mjs --file "D/audit/rounds/[id]/pending/page.tsx"`, `node <temp>/p2b1-precheck.mjs --file c/audit/audit-pending-row-actions.tsx`, then `node <temp>/p2b1-precheck.mjs --budgets`
Expected: the page `· in MIGRATED_LIST_FILES` with every row live 0 and budget 0 and `args    (no row holds this file)`; the wrapper `(LF) · not in MIGRATED_LIST_FILES` and `args    (no row holds this file)`; then exit 0 with `R7 … 19 in 13 rows`, `LH1 … 29 in 29 rows`, `LT3 … 3 in 2 rows`, `LV2 … 99 in 31 rows`, LB1 slack 1 (`D/maintenance/[id]/page.tsx`) and `budgets hold: …`.

- [ ] **Step 6: Prove every class compiles**

Run: `SHOW=contents node <temp>/p2b2-tw-probe.mjs "src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx" src/components/audit/audit-pending-row-actions.tsx`
Expected: `checked 43 classes, missing 1: http://asset.local` (a URL in a string literal, which the file at `e3f20ce` reports too, with a `-`; the probe exits 1 because of it), then `contents -> .contents { display: contents; }`. `contents` is the one class new to `src`; everything else is in use already.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 0 fail, 1 skipped, and 2 more tests than before Step 2; tsc no errors (`Prisma.AuditItemWhereInput`, `useRef<AuditMarkNotFoundButtonHandle>(null)` for the handle, the `searchParams` type with `page` and `pageSize`); lint 0 errors and 146 warnings, all under `.agents/` (the wrapper's `onClick`/`onKeyDown` on a `div` are fine under the repo's rules, as in `c/ui/row-actions.tsx`).

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 6 modified files in `git diff --stat`: the page 244 insertions and 163 deletions, `tests/list-pages-ui.test.ts` 38 insertions, `tests/audit-pending-mobile-ux.test.ts` 3 and 3, `tests/operational-return-navigation.test.ts` 2 and 2, `tests/list-frame-guards.test.ts` 1 and 4, `tests/visual-foundation-guards.test.ts` 1 deletion; `git status` also lists `?? src/components/audit/audit-pending-row-actions.tsx` (60 lines, LF). The page stays CRLF (412 lines, still no line break at the end).

- [ ] **Step 8: Commit**

```bash
git add "src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx" src/components/audit/audit-pending-row-actions.tsx tests/audit-pending-mobile-ux.test.ts tests/operational-return-navigation.test.ts tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): audit pending list paged on the server, with RowActions and the not-found dialog through its handle (2B-2 task 11, B4, R-m)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 7 files in the commit (1 new). `git status --short src tests messages` prints nothing; `git ls-files --eol src/components/audit/audit-pending-row-actions.tsx` shows `i/lf w/lf`.

**For the plan 2B-2 dev-app check (Task 18, spec §8.6 row `…/pending`):**
- 1440, 768 and 375: the back button sits next to the title (an icon at 375) and returns to the round, or to the scan screen when the list was opened from there
- the count box equals the footer total (a round with more than 200 pending items shows all of them over several pages); `?page=99` lands on the last page and keeps `returnTo`, the search and the room
- desktop ⋯ → "บันทึกไม่พบ" opens the dialog; clicking its text or its backdrop does not open the asset; Esc or ยกเลิก closes it with focus on ⋯; nothing is saved (cancel only, spec §10.5 rule)
- "สแกนรายการนี้" opens the scan screen for that asset; "ดูทรัพย์สิน" opens the asset
- 375: the three card buttons are 44px; the cards sit in one frame above the pager; "ดูทุกห้อง" and "ล้างคำค้น" keep the page size
- the page loads as fast as before on dev (two round trips now: the round, then the items with their count); note anything slow in the Task 18 findings

---

### Task 12: `D/maintenance/page.tsx` on `PageHeader`, the shared filters, `DataTable` and `Pagination` (and `c/maintenance/maintenance-pagination.tsx` goes with its last caller)

Spec §8.6 rows 13–14, with §5.4 row "maintenance", §5.1 (the shared rules of every list), §5.7 (money in and out of a table), §5.8 (phone cards stay), §5.9.1 (the past-the-end rule), §5.10 #4 and #11, §5.11, §6.4, §6.5 row 11 and "ซ่อมบำรุง: ชิป `assetId` (6-ญ)", §6.13 table B items 5–7, §4.4 header row `D/maintenance/page.tsx:93-107`, §9.4.1–9.4.2 rows 2B-2, §10.2 key table rows 2B-2, §10.4 table A row 2B-2 (`maintenance-pagination-ui.test.ts:5-14`, `:16-19`), rulings I21, I23, I24, I33, R-k, R-n, R-p and controller rulings (d), (e), (f), (i), (j). One page, one commit, one file deleted. The page is CRLF: edit it with exact-string replacement only.

The repair-record list already pages on the server (`skip`/`take` and `count` in one `Promise.all`), so it is not one of the B4 lists: the query, `parseMaintenanceListParams`, `buildMaintenanceQueryString` and the export link do not change.

Rulings this task applies:
- **R-h, I1:** the page calls `PageHeader` itself: `title={t("title")}`, `meta={t("subtitle")}`, and the create link at `buttonVariants({ size: "md" })` with `Plus`, only for `canCreate`. No `back`: the list is in the menu (§4.4 row "เดิม").
- **§6.5 row 11, I23:** the filter card becomes `FilterPanel` (labelled fields, `lg` 40, with its frame). The `<form>` gets `role="search"` (§6.4) and keeps its grid class and `action`. The search is `Field label={tCommon("search")}` + `SearchField`; the status select is `FilterSelect` with `allLabel={tCommon("all")}` and the `maintenanceStatusFilters` options; the two dates are `Field` + `Input type="date"`; the two hand-written buttons become `FilterFormActions`, whose "ล้างตัวกรอง" shows only while `hasActiveFilters`. The date-range warning box stays as it is (notice boxes are 2D's).
- **6-ญ, §6.1 "ฟอร์มที่ทิ้งขนาดหน้า":** the form gets `<input type="hidden" name="pageSize" value={filters.pageSize} />`, so "กรอง" keeps 25/50/100 and goes back to page 1 (the form never sent `page`).
- **§6.4 `hasActiveFilters`:** `Boolean(filters.search || filters.status || filters.dateFrom || filters.dateTo)`. `assetId` is not counted: it is not on screen and has its own chip; `page` and `pageSize` are not filters. `clearHref` stays exactly as it is (it keeps `assetId`).
- **I24, 6-ญ:** the line "เฉพาะทรัพย์สินนี้ · ล้างตัวกรอง" (whose link went to `/maintenance` and dropped every filter) becomes `FilterChipList` with one chip, `removeLabel={t("clearFilters")}` (read as "ล้างตัวกรอง: เฉพาะทรัพย์สินนี้") and `` href: `/${locale}/maintenance?${buildMaintenanceQueryString(filters, { assetId: "", page: 1 })}` ``: it removes `assetId` only and keeps the search, status, dates and page size. The group name is the new key `repairRecord.activeFilters`.
- **§5.10 #4, §5.11, ruling (f):** the empty state no longer offers "ล้างตัวกรอง" when nothing is filtered. With `hasActiveFilters`: `repairRecord.emptyFilteredTitle` + `emptyFilteredHelp` + an outline "ล้างตัวกรอง" (`actionVariant="secondary"`, to `clearHref`). Without: `emptyTitle` + the new `emptyHelp` ('กด "บันทึกซ่อม" เพื่อเริ่มบันทึก') + "บันทึกซ่อม" to the same create href as the header. **Ruling (spec silent):** without `maintenance:create` there is no button, so the help line that names the button is left out too (`description={canCreate ? t("emptyHelp") : undefined}`).
- **§5.4, §5.8, B6:** the phone cards (`getMobileCardListClasses()`) and the desktop-only table (`getDesktopTableOnlyClasses()`) stay inside the list section, which keeps its frame, title, count and export button. The table becomes `DataTable framed={false}` (the section is the frame; no frame in a frame) with `caption={t("listTitle")}` and `scrollHint={tCommon("tableScrollHint")}`: its 9 columns overflow between 768 and 1023px, and the hint shows only while they do (as the supplier list, which also has phone cards).
- **R-k, §3.8, ruling (d):** `MaintenancePagination` becomes the shared `Pagination` once, in `DataTableFoot` under both the cards and the table, shown only while `total > 0` (§5.1; the old pager also showed "0-0 จาก 0"). The live region stays: `Pagination` announces its range line with `<p aria-live="polite">`. The numbers and links keep coming from the page's own helpers, `buildMaintenancePagination` (`src/lib/maintenance-list.ts`, which clamps the page) and `buildMaintenancePageHref` (`src/lib/maintenance-view.ts`), so both keep a caller and their tests (`tests/maintenance-list.test.ts`, `tests/maintenance-view.test.ts`) keep meaning something. `maintenance-pagination.tsx` has no other caller (Step 1 proves it) and is deleted in this commit.
- **I21, §5.10 #11:** a page number past the last page (an old link, or a narrower filter on page 4) redirects to the same URL on the last page (`lastListPage`), after the `Promise.all` and outside any `try`. Next.js 16.4 `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md`: `redirect()` throws `NEXT_REDIRECT` and ends the render (307, or a client-side redirect once the page streams); the repo already uses it in the 2B-1 lists.
- **§5.7, DS:515:** in the table the money cell is `formatMoney(Number(record.repairCost))` with `numeric` (right-aligned, `num`), because its head `repairRecord.cost` already reads "ค่าใช้จ่ายรวม (บาท)" (no key change); the head is `align="right"`. The phone card line is not under that head, so it says `formatMoney(…, { unit: tCommon("baht") })`. `formatCurrency` leaves the page (LV3 2 → 0).
- **R-n:** the two typed `"-"` become `Nil`: the outcome helper returns `null` and the cell renders `orNil(…)`; an empty cost renders `<Nil />` (LV2 1 → 0; the `? "-" :` of the cost cell is not one LV2 counts, it goes too).
- **R-p:** the asset tag in the card and in the table is `<span className="tag font-medium">` inside its existing wrapper (the wrapper keeps the size; VFG "big numbers, codes" forbids a size or weight 600 on `tag`), and the repair number is `<span className="tag">` (its `text-xs` goes, §5.4 "`text-xs` → `tag`").
- **Buttons (§5.1, §6.3.4):** the export link is `buttonVariants({ variant: "outline", size: "md" })` (a list-head toolbar button, 36 from md); "จัดการแผน PM" is `buttonVariants({ variant: "outline" })` (default 40, it had `min-h-11` only). The stuck-asset and PM-due row links are not in §5.4 and stay as they are (`tests/repair-record-list-ui.test.ts:27` pins the stuck link's `min-h-11`).
- **Tests (I16, ruling (i), (j)):** `tests/maintenance-pagination-ui.test.ts` tests 1–2 keep their titles and now read the page (`:5-14` read the deleted file, `:16-19` pinned `<MaintenancePagination`); test 3 (the API envelopes, `:21-30`) does not change. That file reads sources with `\r`, so its new regexes hold no `\n`. `tests/list-pages-ui.test.ts` gets one block of "has" checks; `tests/list-filters-ui.test.ts` gets the page in `MIGRATED_FILTER_FILES` (items 5–6) and the item 7 test.
- **LFG and VFG (I15, ruling (e)):** every row of the page goes to 0 and the page joins `MIGRATED_LIST_FILES` (no 2B plan after this one lists it, spec §8.7–8.9; L0 then holds it at `KEEP`, which is 0). The deleted pager loses its rows without `--migrated` (L0 refuses a row for a missing file). The rows are lowered before the page changes, so the guards fail first on the live counts.
- **Ruling (line endings):** the test files 2B-1 created (`tests/list-pages-ui.test.ts`, `tests/list-filters-ui.test.ts`, `tests/list-frame-guards.test.ts`, `tests/list-pagination.test.ts`) are CRLF in this working tree (`git ls-files --eol` shows `i/lf w/crlf`), like the rest of `tests/`. Plan 2B-1's `p2b1-append.mjs` refuses CRLF, so this task saves `p2b2-append-t12.mjs` and `p2b2-list-insert.mjs`, which keep each file's line endings, and a Tailwind probe `p2b2-tw-probe.mjs` (plan 2B-1's `p2b1-tw-probe.mjs` verbatim, the same text as Task 1 Step 1's copy). Tasks 13 and 14 reuse all three. The append script has its own name because Task 1 Step 1's `p2b2-append.mjs` is a different text (one name, one text).
- **Ruling (TDD order):** the tests and the lowered rows come first and fail for the stated reasons; then the messages and the page change and everything passes.

What users will see on `/th/maintenance`:
- The title is weight 600; "บันทึกซ่อม" is 36px on desktop (44 on phones).
- The filter fields are 40px on desktop (44 on phones) with the 2A field look; the search has its icon. "ล้างตัวกรอง" in the form shows only while a search, status or date is set. "กรอง" keeps the chosen page size; before, it went back to 25.
- A list opened for one asset shows a chip "เฉพาะทรัพย์สินนี้" with ✕ under the form; pressing it removes only that filter and keeps the search, status, dates and page size. Before, the small "ล้างตัวกรอง" link dropped every filter.
- The table header is white, 13px, no capitals; rows are about 46px. The cost sits on the right as "1,234.00" with no "฿" (the head says "(บาท)"); an empty cost or outcome shows "—". Asset tags and repair numbers are monospace and select as one word. When the table is wider than the screen (768–1023px), a line above it says it scrolls sideways.
- On phones the cards stay; their cost reads "1,234.00 บาท" instead of "฿1,234.00".
- The footer reads "1–25 จาก N รายการ · หน้า 1 จาก M", with 25/50/100 and words-only "ก่อนหน้า"/"ถัดไป" (no arrows), and is gone when nothing is listed. A page number past the end opens the last page.
- An empty list says "ไม่พบบันทึกการซ่อมที่ตรงกับตัวกรอง" with an outline "ล้างตัวกรอง" while a filter is on, and "ยังไม่มีบันทึกการซ่อม", 'กด "บันทึกซ่อม" เพื่อเริ่มบันทึก' and "บันทึกซ่อม" otherwise (no button and no help line without create permission). Before, it always offered "ล้างตัวกรอง".
- "ส่งออก Excel" is a 36px outline button; "จัดการแผน PM" a 40px outline button.

Not in this task:
- `src/lib/maintenance-query.ts`, `maintenance-list.ts`, `maintenance-view.ts`, the query and the export API (unchanged)
- the stuck-asset and PM-due sections, apart from the "จัดการแผน PM" button
- `D/maintenance/[id]/page.tsx` (2B-4), the date-range warning box (2D), docs (Task 19). Do not run a formatter.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/maintenance/page.tsx` (`i/lf w/crlf`; 5 exact replacements)
- Delete: `src/components/maintenance/maintenance-pagination.tsx` (`i/lf w/crlf`)
- Modify: `tests/maintenance-pagination-ui.test.ts` (`i/lf w/crlf`; 1 exact replacement)
- Modify: `tests/list-pages-ui.test.ts` (`i/lf w/crlf`; one block appended with `p2b2-append-t12.mjs`)
- Modify: `tests/list-filters-ui.test.ts` (`i/lf w/crlf`; one line into `MIGRATED_FILTER_FILES` with `p2b2-list-insert.mjs`, one block appended)
- Modify: `messages/th.json`, `messages/en.json` (`i/lf w/crlf`; through `node scripts/messages-edit.mjs` only)
- Modify: `tests/list-frame-guards.test.ts`, `tests/visual-foundation-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only, never committed: `p2b2-t12-precheck.mjs`, `p2b2-append-t12.mjs`, `p2b2-list-insert.mjs`, `p2b2-tw-probe.mjs` (Tasks 13 and 14 reuse them), `t12-pages-block.ts`, `t12-filters-block.ts`, `t12-messages.json`

**Must keep passing without edits:**
- `tests/operational-return-navigation.test.ts:22-24` (`` const returnHref = `/${locale}/maintenance?${listQuery}` ``, `` appendOperationalReturnTo(`/${locale}/maintenance/${id}`, returnHref) `` and the `planId=` link: none of the three lines changes)
- `tests/repair-record-list-ui.test.ts` (5 tests: `buildDuePmPlanWhere(`, `id="pm-due"`, `id="stuck"`, the stuck link `min-h-11` `:27`, no board view)
- `tests/maintenance-contrast.test.ts:15-17` (`text-warning` stays in the outcome cell and the date warning, `text-success` in the outcome cell)
- `tests/maintenance-pagination-ui.test.ts:21-30` (test 3), `tests/maintenance-view.test.ts`, `tests/maintenance-list.test.ts`, `tests/repair-record-ui.test.ts` (`repairRecord` has the same keys in th and en)
- `tests/form-migration-guards.test.ts` (never edited; the page is not a 2C file), `tests/design-tokens-contrast.test.ts`, `tests/thai-glossary.test.ts`, `tests/messages-parity.test.ts`, `tests/list-primitives-ui.test.ts`, `tests/clickable-table-row-navigation.test.ts`
- `tests/list-frame-guards.test.ts` and `tests/visual-foundation-guards.test.ts`: every row of the other files

**Interfaces:**
- Consumes:
  - 2B-1: `PageHeader({ title, meta, actions })` from `@/components/ui/page-header`; `DataTable` (`framed`, `className`, `caption`, `scrollHint`), `DataTableHeader`, `DataTableBody`, `DataTableHead` (`align`), `DataTableCell` (`numeric`, `className`) and `DataTableFoot` from `@/components/ui/data-table`; `ClickableTableRow` (unchanged API) from `@/components/ui/clickable-table-row`; `Pagination({ page, totalPages, previousHref, nextHref, pageSize, pageSizes, labels: { navigation, previous, next, pageOf, range, pageSizeGroup, rowsPerPage } })` from `@/components/ui/pagination`; `LIST_PAGE_SIZES` and `lastListPage(total, pageSize)` from `@/lib/list-pagination`; `FilterPanel({ children })` and `FilterFormActions({ submitLabel, clear? })` from `@/components/ui/filter-panel`; `FilterSelect({ label, name, defaultValue, allLabel, options })` from `@/components/ui/filter-select`; `FilterChipList({ chips, label, removeLabel, className })` with `FilterChipItem = { key, label, href }` from `@/components/ui/filter-chips`.
  - 2A: `Field` from `@/components/ui/field`, `SearchField` from `@/components/ui/search-field`, `Input` (`type="date"`) from `@/components/ui/input`, `Nil` and `orNil` from `@/components/ui/nil`, `formatCount(value)` and `formatMoney(value, { unit? })` from `@/lib/display-format`, `buttonVariants` from `@/components/ui/button-variants`, the `tag` utility.
  - The page's own helpers, unchanged: `buildMaintenancePagination(page, pageSize, total)` → `{ page, pageSize, total, totalPages, start, end }` from `@/lib/maintenance-list`; `buildMaintenancePageHref(locale, currentQuery, { page?, pageSize? })` from `@/lib/maintenance-view`; `buildMaintenanceQueryString(filters, overrides)` from `@/lib/maintenance-query`.
  - Keys that exist: `repairRecord.*` (`title`, `subtitle`, `createTitle`, `filter`, `clearFilters`, `assetFilter`, `searchPlaceholder`, `filterStatus`, `dateFrom`, `dateTo`, `status.*`, `listTitle`, `resultCount`, `export`, `cost`, `emptyTitle`, `emptyHelp`) and `common.*` (`pagination`, `previous`, `next`, `pageOf`, `showingRange`, `pageSizeLabel`, `rowsPerPage`, `tableScrollHint`, `baht`, `search`, `all`, `view`).
  - Task 0: `p2b1-precheck.mjs` (`--file`, `--budgets`) and `p2b-budget.mjs` in the temp folder.
  - Next.js 16.4: `redirect` from `next/navigation`.
- Produces (Tasks 13, 14 and 19 rely on these):
  - keys `repairRecord.activeFilters`, `repairRecord.emptyFilteredTitle`, `repairRecord.emptyFilteredHelp` and the new value of `repairRecord.emptyHelp`, in th and en
  - `tests/list-pages-ui.test.ts`: two tests for the repair-record list; `tests/list-filters-ui.test.ts`: the page in `MIGRATED_FILTER_FILES` and the item 7 test; `tests/maintenance-pagination-ui.test.ts` reading the page
  - LFG `BUDGETS` and VFG `TABLE_HEADER_FILLS` hold no row of the page or of the deleted pager; `MIGRATED_LIST_FILES` holds the page
  - `p2b2-t12-precheck.mjs`, `p2b2-append-t12.mjs`, `p2b2-list-insert.mjs` and `p2b2-tw-probe.mjs` in the temp folder

| guard | `D/maintenance/page.tsx` | `c/maintenance/maintenance-pagination.tsx` | total before → after (budget rows, with Tasks 1–11 done as planned) |
|---|---|---|---|
| VFG R7 | 1 → – | – | 19 in 13 rows → 18 in 12 (17 after Task 16) |
| LH1 | 1 → – | – | 29 → 28 (25 after Task 17) |
| LT4 | – | 1 → – (file deleted) | 2 → 1 (the plan's total) |
| LT5 | – | 2 → – | 5 in 3 rows → 3 in 2 (the plan's total) |
| LV2 | 1 → – | – | 99 in 31 rows → 98 in 30 (the plan's total) |
| LV3 | 2 → – | – | 38 in 11 rows → 36 in 10 (the plan's total) |
| LN1 | – | 1 → – | 7 in 6 rows → 6 in 5 (the plan's total) |
| | joins `MIGRATED_LIST_FILES` | deleted, no `--migrated` | |

- [ ] **Step 1: Check what this task builds on (and save the four scripts)**

Save this script as `p2b2-t12-precheck.mjs` in your temp folder, next to Task 0's `p2b1-precheck.mjs` and `p2b-budget.mjs` (never in the repo). Tasks 13 and 14 run it with their own number.

```js
// p2b2-t12-precheck.mjs: run from the repo root before Task 12, 13 or 14 of plan 2B-2 (maintenance).
// Usage: node <temp>/p2b2-t12-precheck.mjs <12|13|14>. Reads only; writes nothing. Never commit this file.
// Confirms that the 2B-1 primitives are in with the names these tasks use, that each file the task edits still holds
// the e3f20ce text its old snippets quote (a hash of the text with \r stripped; Tasks 1-11 do not touch these files),
// that the earlier tasks of this group are in, and that the shared test files and lists do not hold this task's lines yet.
import { createHash } from "node:crypto"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const task = process.argv[2]
if (!["12", "13", "14"].includes(task)) {
  console.error("usage: node p2b2-t12-precheck.mjs <12|13|14>")
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
const sourceFiles = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name)
  return statSync(path).isDirectory() ? sourceFiles(path) : /\.(?:ts|tsx)$/.test(name) ? [path.replace(/\\/g, "/")] : []
})
const callersOf = (module) => sourceFiles("src").filter((path) => read(path).includes(`"${module}"`))
const messages = (locale) => JSON.parse(read(`messages/${locale}.json`))
const exportsAll = (path, names) => names.every((name) => new RegExp(`export (?:function|const|type) ${name}\\b`).test(read(path)))
const listBody = (path, name) => {
  const text = read(path)
  const start = text.indexOf(`const ${name}`)
  return start === -1 ? null : text.slice(start, text.indexOf("\n]", start))
}
const here = dirname(fileURLToPath(import.meta.url))

const page = `${D}maintenance/page.tsx`
const pager = `${C}maintenance/maintenance-pagination.tsx`
const pmPage = `${D}maintenance/pm/page.tsx`
const pmEdit = `${D}maintenance/pm/[id]/edit/page.tsx`
const planForm = `${C}maintenance/maintenance-plan-form.tsx`
const pmLib = "src/lib/preventive-maintenance.ts"
const returnLib = "src/lib/operational-return-navigation.ts"
const pagesTest = "tests/list-pages-ui.test.ts"
const filtersTest = "tests/list-filters-ui.test.ts"
const LFG = "tests/list-frame-guards.test.ts"
const migratedList = listBody(LFG, "MIGRATED_LIST_FILES") ?? ""
const filterList = listBody(filtersTest, "MIGRATED_FILTER_FILES")
const repairRecord = (locale) => messages(locale).repairRecord ?? {}
const commonKeys = ["pagination", "previous", "next", "pageOf", "showingRange", "pageSizeLabel", "rowsPerPage", "tableScrollHint", "back", "baht", "all", "search", "view", "edit"]
const newRepairKeys = ["activeFilters", "emptyFilteredTitle", "emptyFilteredHelp"]
const oldEmptyHelp = { th: 'กด "บันทึกซ่อม" เพื่อเริ่มบันทึก หรือล้างตัวกรอง', en: 'Press "Record a repair" to add one, or clear the filters' }
const auditFindingsLine = '  "audit-findings": (locale: string) => `/${locale}/audit/findings`,\n'

const checks = {
  "Task 0: p2b1-precheck.mjs and p2b-budget.mjs are saved next to this script": existsSync(join(here, "p2b1-precheck.mjs")) && existsSync(join(here, "p2b-budget.mjs")),
  "2B-1: PageHeader, PageBackLink": exportsAll(`${C}ui/page-header.tsx`, ["PageHeader", "PageBackLink"]),
  "2B-1: DataTable, DataTableHeader, DataTableBody, DataTableHead, DataTableCell, DataTableFoot": exportsAll(`${C}ui/data-table.tsx`, ["DataTable", "DataTableHeader", "DataTableBody", "DataTableHead", "DataTableCell", "DataTableFoot"]),
  "2B-1: Pagination takes pageSize and pageSizes; list-pagination exports its helpers": /pageSizes\?: readonly PaginationPageSize\[\]/.test(read(`${C}ui/pagination.tsx`)) && /<p aria-live="polite"/.test(read(`${C}ui/pagination.tsx`)) && exportsAll("src/lib/list-pagination.ts", ["LIST_PAGE_SIZES", "parseListPage", "listPageWindow", "lastListPage", "appendListPage"]),
  "2B-1: FilterSelect, FilterChipList, FilterPanel and FilterFormActions": exportsAll(`${C}ui/filter-select.tsx`, ["FilterSelect"]) && exportsAll(`${C}ui/filter-chips.tsx`, ["FilterChipList"]) && exportsAll(`${C}ui/filter-panel.tsx`, ["FilterPanel", "FilterFormActions"]),
  "2B-1: ContentPanel divided flush and ContentPanelRows": /\| \{ divided: true; flush\?: boolean \}/.test(read(`${C}ui/content-panel.tsx`)) && exportsAll(`${C}ui/content-panel.tsx`, ["ContentPanelRows"]),
  "2A: Field, SearchField, Input, Nil/orNil, formatCount/formatMoney, buttonVariants": /export \{ SearchField \}/.test(read(`${C}ui/search-field.tsx`)) && /export \{ Input \}/.test(read(`${C}ui/input.tsx`)) && exportsAll(`${C}ui/nil.tsx`, ["Nil", "orNil"]) && exportsAll("src/lib/display-format.ts", ["formatCount", "formatMoney"]) && exportsAll(`${C}ui/button-variants.ts`, ["buttonVariants"]),
  "the maintenance helpers the pages keep: buildMaintenancePagination, buildMaintenancePageHref, buildMaintenanceQueryString": exportsAll("src/lib/maintenance-list.ts", ["buildMaintenancePagination"]) && exportsAll("src/lib/maintenance-view.ts", ["buildMaintenancePageHref"]) && exportsAll("src/lib/maintenance-query.ts", ["buildMaintenanceQueryString"]),
  "the common keys exist in th and en": ["th", "en"].every((locale) => commonKeys.every((key) => typeof messages(locale).common?.[key] === "string")),
  [`${pagesTest} has read, D, C and existsSync`]: /^const read = /m.test(read(pagesTest)) && /^const D = /m.test(read(pagesTest)) && /^const C = /m.test(read(pagesTest)) && /^import \{ existsSync, readFileSync \} from "node:fs"$/m.test(read(pagesTest)),
  [`${filtersTest} has read and the list MIGRATED_FILTER_FILES`]: /^const read = /m.test(read(filtersTest)) && filterList !== null,
  ...(task === "12"
    ? {
        [`${page} is CRLF and unchanged since e3f20ce (hash a35142cd4a8ad84c)`]: eol(page) === "CRLF" && hash(page) === "a35142cd4a8ad84c",
        [`${pager} is CRLF, unchanged, and only ${page} imports it`]: eol(pager) === "CRLF" && hash(pager) === "c9eb621afd298060" && callersOf("@/components/maintenance/maintenance-pagination").join("|") === page,
        "tests/maintenance-pagination-ui.test.ts is unchanged since e3f20ce": hash("tests/maintenance-pagination-ui.test.ts") === "435a6388d4e6872f",
        "repairRecord has none of the new keys yet and emptyHelp still says 'or clear the filters'": ["th", "en"].every((locale) => newRepairKeys.every((key) => !(key in repairRecord(locale))) && repairRecord(locale).emptyHelp === oldEmptyHelp[locale]),
        "the maintenance list is not yet in list-pages-ui, MIGRATED_FILTER_FILES or MIGRATED_LIST_FILES": !read(pagesTest).includes("maintenance/page.tsx") && !(filterList ?? "").includes("maintenance/page.tsx") && !migratedList.includes("maintenance/page.tsx"),
      }
    : {}),
  ...(task === "13"
    ? {
        "Task 12 is in: maintenance-pagination.tsx is gone and repairRecord.activeFilters exists": !existsSync(pager) && ["th", "en"].every((locale) => typeof repairRecord(locale).activeFilters === "string"),
        [`${pmPage} is CRLF and unchanged since e3f20ce (hash 6f2aeb71709c81b6)`]: eol(pmPage) === "CRLF" && hash(pmPage) === "6f2aeb71709c81b6",
        [`${pmLib} is CRLF and unchanged since e3f20ce (hash aa227ca8484bed98)`]: eol(pmLib) === "CRLF" && hash(pmLib) === "aa227ca8484bed98",
        "tests/list-pagination.test.ts imports node:test on one line and has no planStatePageSlices yet": read("tests/list-pagination.test.ts").split('\nimport test from "node:test"\n').length === 2 && !read("tests/list-pagination.test.ts").includes("planStatePageSlices("),
        "tests/pm-plans-ui.test.ts is unchanged since e3f20ce": hash("tests/pm-plans-ui.test.ts") === "b57b30de0bb7d51b",
        "the PM list is not yet in list-pages-ui or MIGRATED_LIST_FILES": !read(pagesTest).includes("maintenance/pm/page.tsx") && !migratedList.includes("maintenance/pm/page.tsx"),
      }
    : {}),
  ...(task === "14"
    ? {
        "Task 13 is in: the PM list's edit link carries planListReturnHref": read(pmPage).includes("appendOperationalReturnTo(`/${locale}/maintenance/pm/${plan.id}/edit`, planListReturnHref)"),
        [`${returnLib} is LF, holds the audit-findings line once and no maintenance-pm section`]: eol(returnLib) === "LF" && read(returnLib).split(auditFindingsLine).length === 2 && !read(returnLib).includes('"maintenance-pm"'),
        [`${pmEdit} is CRLF and unchanged since e3f20ce (hash 30eeec7b6455535a)`]: eol(pmEdit) === "CRLF" && hash(pmEdit) === "30eeec7b6455535a",
        [`${planForm} is CRLF and unchanged since e3f20ce (hash 16babf0eedfddbd5)`]: eol(planForm) === "CRLF" && hash(planForm) === "16babf0eedfddbd5",
        "tests/pm-plans-ui.test.ts is unchanged since e3f20ce": hash("tests/pm-plans-ui.test.ts") === "b57b30de0bb7d51b",
        "tests/operational-return-navigation.test.ts has no maintenance-pm case yet": !read("tests/operational-return-navigation.test.ts").includes("maintenance-pm"),
      }
    : {}),
}

let missing = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok     " : "MISSING"} ${name}`)
  if (!ok) missing += 1
}
const files = { 12: [page, pager, pagesTest, filtersTest, "tests/maintenance-pagination-ui.test.ts", LFG], 13: [pmPage, pmLib, "tests/list-pagination.test.ts", pagesTest, LFG], 14: [returnLib, pmEdit, planForm, "tests/pm-plans-ui.test.ts", "tests/operational-return-navigation.test.ts"] }[task]
for (const path of files) console.log(`info    ${path}: ${eol(path)} · hash ${hash(path)}`)
if (missing > 0) {
  console.error(`ABORT: ${missing} precondition(s) failed. Do not start Task ${task}; report which.`)
  process.exit(1)
}
console.log(`preconditions hold for Task ${task}`)
```

Save this script as `p2b2-append-t12.mjs` in the same temp folder (not under Task 1's name `p2b2-append.mjs`, whose text differs). It appends a test block in the file's own line endings (plan 2B-1's `p2b1-append.mjs` refuses CRLF, and every test file is CRLF in this working tree):

```js
// p2b2-append-t12.mjs: run from the repo root. Usage: node <temp>/p2b2-append-t12.mjs <block file> <test file>
// Appends the block after one blank line and ends the file with one line break, in the file's own line endings (the
// test files are CRLF in this working tree, also the ones 2B-1 created). Refuses a mixed file and a block whose first
// line is already in the file. Writes nothing on a problem. Never commit this file.
import { readFileSync, writeFileSync } from "node:fs"

const [blockPath, target] = process.argv.slice(2)
if (!blockPath || !target) {
  console.error("usage: node p2b2-append-t12.mjs <block file> <test file>")
  process.exit(2)
}
const current = readFileSync(target, "utf8")
const crlf = (current.match(/\r\n/g) ?? []).length
const lf = (current.match(/\n/g) ?? []).length
if (crlf !== 0 && crlf !== lf) {
  console.error(`ABORT: ${target} mixes CRLF and LF; stop and report`)
  process.exit(1)
}
const eol = crlf > 0 ? "\r\n" : "\n"
const block = readFileSync(blockPath, "utf8").replace(/\r\n/g, "\n").replace(/^\n+|\n+$/g, "")
const firstLine = block.split("\n")[0]
const text = current.replace(/\r\n/g, "\n")
if (text.includes(firstLine)) {
  console.error(`ABORT: ${target} already holds "${firstLine}"`)
  process.exit(1)
}
writeFileSync(target, `${text.replace(/\n*$/, "\n\n")}${block}\n`.replace(/\n/g, eol))
console.log(`appended ${blockPath} to ${target} (${eol === "\r\n" ? "CRLF" : "LF"})`)
```

Save this script as `p2b2-list-insert.mjs` in the same temp folder. Other tasks of this plan add lines to the same lists (`MIGRATED_FILTER_FILES`), so it finds a list by name, not by its last line:

```js
// p2b2-list-insert.mjs: run from the repo root. Usage: node <temp>/p2b2-list-insert.mjs <file> <NAME> <line> [<line> ...]
// Inserts each <line> (written in full, with its indent and trailing comma) just before the "]" that closes
// `const NAME … = [` in <file>, in the file's own line endings. Other tasks of the plan add lines to the same lists, so
// this finds the list by name instead of by its last line. Refuses a missing list, a mixed file and a line that is
// already in the list. Writes nothing on a problem. Never commit this file.
import { readFileSync, writeFileSync } from "node:fs"

const [file, name, ...entries] = process.argv.slice(2)
if (!file || !name || entries.length === 0) {
  console.error("usage: node p2b2-list-insert.mjs <file> <NAME> <line> [<line> ...]")
  process.exit(2)
}
const raw = readFileSync(file, "utf8")
const crlf = (raw.match(/\r\n/g) ?? []).length
const lf = (raw.match(/\n/g) ?? []).length
if (crlf !== 0 && crlf !== lf) {
  console.error(`ABORT: ${file} mixes CRLF and LF; stop and report`)
  process.exit(1)
}
const eol = crlf > 0 ? "\r\n" : "\n"
const lines = raw.split(eol)
const start = lines.findIndex((line) => line.startsWith(`const ${name} `) || line.startsWith(`const ${name}:`))
const end = start === -1 ? -1 : lines.findIndex((line, index) => index > start && line === "]")
if (start === -1 || end === -1 || !lines[start].endsWith("[")) {
  console.error(`ABORT: no multi-line list "const ${name} … = [" closed by "]" in ${file}`)
  process.exit(1)
}
for (const entry of entries) {
  if (lines.slice(start, end).includes(entry)) {
    console.error(`ABORT: ${name} in ${file} already holds: ${entry}`)
    process.exit(1)
  }
}
lines.splice(end, 0, ...entries)
writeFileSync(file, lines.join(eol))
console.log(`${name} in ${file}: ${entries.length} line(s) added before its "]" (${eol === "\r\n" ? "CRLF" : "LF"})`)
```

Save this script as `p2b2-tw-probe.mjs` in the same temp folder (plan 2B-1's `p2b1-tw-probe.mjs` with its name changed; byte for byte the copy Task 1 Step 1 saved, so an existing copy stays as it is). It compiles in memory and writes nothing:

```js
// p2b2-tw-probe.mjs: run from the repo root. Usage: node <temp>/p2b2-tw-probe.mjs <file> [<file> ...]
// Compiles every class of the class strings in the given files with the repo's Tailwind (@tailwindcss/node) against
// src/app/globals.css, in memory, and lists any class that produces no CSS. Reads only; writes nothing. Never commit.
// SHOW=a,b prints the compiled rule of the named classes.
import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()
const require = createRequire(resolve(root, "package.json"))
const { compile } = require("@tailwindcss/node")
const compiler = await compile(readFileSync(resolve(root, "src/app/globals.css"), "utf8"), { base: root, onDependency() {} })

// Class strings: className="…", a …Classes constant, the first string in cn(…), and any other string with a "-" or
// ":" in it after &&, ?, :, or a comma (the other strings inside cn() and the sticky maps).
const STRING = /(className=|Classes = |cn\(|&& |\? |: |, )"([^"]*)"/g
const takes = (lead, text) => /^(?:className=|Classes = |cn\()$/.test(lead) || /[-:]/.test(text)
const MARKERS = new Set(["group", "group/row"]) // they name a group and emit no CSS of their own
const classes = new Set()
for (const file of process.argv.slice(2)) {
  for (const [, lead, text] of readFileSync(file, "utf8").matchAll(STRING)) {
    if (!takes(lead, text)) continue
    for (const token of text.split(/\s+/)) if (/^[a-z!\[-]/.test(token) && !/[(){}]/.test(token)) classes.add(token)
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
Expected: `feat/ui-phase2b-plan2`

Run: `git status --short src tests messages` then `node <temp>/p2b2-t12-precheck.mjs 12`
Expected: `git status` prints nothing. The script prints:
```
ok      Task 0: p2b1-precheck.mjs and p2b-budget.mjs are saved next to this script
ok      2B-1: PageHeader, PageBackLink
ok      2B-1: DataTable, DataTableHeader, DataTableBody, DataTableHead, DataTableCell, DataTableFoot
ok      2B-1: Pagination takes pageSize and pageSizes; list-pagination exports its helpers
ok      2B-1: FilterSelect, FilterChipList, FilterPanel and FilterFormActions
ok      2B-1: ContentPanel divided flush and ContentPanelRows
ok      2A: Field, SearchField, Input, Nil/orNil, formatCount/formatMoney, buttonVariants
ok      the maintenance helpers the pages keep: buildMaintenancePagination, buildMaintenancePageHref, buildMaintenanceQueryString
ok      the common keys exist in th and en
ok      tests/list-pages-ui.test.ts has read, D, C and existsSync
ok      tests/list-filters-ui.test.ts has read and the list MIGRATED_FILTER_FILES
ok      src/app/[locale]/(dashboard)/maintenance/page.tsx is CRLF and unchanged since e3f20ce (hash a35142cd4a8ad84c)
ok      src/components/maintenance/maintenance-pagination.tsx is CRLF, unchanged, and only src/app/[locale]/(dashboard)/maintenance/page.tsx imports it
ok      tests/maintenance-pagination-ui.test.ts is unchanged since e3f20ce
ok      repairRecord has none of the new keys yet and emptyHelp still says 'or clear the filters'
ok      the maintenance list is not yet in list-pages-ui, MIGRATED_FILTER_FILES or MIGRATED_LIST_FILES
```
then six `info` lines (all `CRLF`; the hashes of the four test files depend on Tasks 1–11) and `preconditions hold for Task 12`. On any `MISSING` line, stop and report it: a hash that differs means the page changed after `e3f20ce`, so the old snippets of Step 5 may not match; do not guess.

Run: `node <temp>/p2b1-precheck.mjs --file D/maintenance/page.tsx` then `node <temp>/p2b1-precheck.mjs --file c/maintenance/maintenance-pagination.tsx`
Expected (after the `info`/`ok` header lines; exit 0 both times):
```
file    src/app/[locale]/(dashboard)/maintenance/page.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
R7         1       1     0     1
LH1        1       1     0     1
LV2        1       1     0     1
LV3        2       2     0     2
args    R7=1:1 LH1=1:1 LV2=1:1 LV3=2:2
```
```
file    src/components/maintenance/maintenance-pagination.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LT4        1       1     0     1
LT5        2       2     0     2
LN1        1       1     0     1
args    LT4=1:1 LT5=2:2 LN1=1:1
```

Run: `git ls-files --eol "src/app/[[]locale]/(dashboard)/maintenance/page.tsx" src/components/maintenance/maintenance-pagination.tsx tests/maintenance-pagination-ui.test.ts tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts messages/th.json messages/en.json`
Expected: `i/lf    w/crlf` for all nine. Keep them CRLF: exact-string replacements and the two scripts above only.

- [ ] **Step 2: Write the failing tests**

(a) `tests/maintenance-pagination-ui.test.ts`: tests 1 and 2 read the page. Replace:

```ts
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("maintenance pagination exposes exact range, page size, and navigation", async () => {
  const source = await readFile("src/components/maintenance/maintenance-pagination.tsx", "utf8")
  assert.match(source, /buildMaintenancePagination/)
  assert.match(source, /\[25, 50, 100\]/)
  assert.match(source, /labels\.previous/)
  assert.match(source, /labels\.next/)
  assert.match(source, /pagination\.start/)
  assert.match(source, /pagination\.end/)
  assert.match(source, /pagination\.total/)
})

test("maintenance list renders pagination", async () => {
  const source = await readFile("src/app/[locale]/(dashboard)/maintenance/page.tsx", "utf8")
  assert.match(source, /<MaintenancePagination/)
})
```

with:

```ts
import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import test from "node:test"

// Plan 2B-2 Task 12 (spec 2B §5.4, R-k): the repair-record list draws the shared Pagination from the range helper it
// already had, and maintenance-pagination.tsx went with its last caller. Sources are read with \r: no regex holds \n.
test("maintenance pagination exposes exact range, page size, and navigation", async () => {
  const source = await readFile("src/app/[locale]/(dashboard)/maintenance/page.tsx", "utf8")
  assert.match(source, /const pagination = buildMaintenancePagination\(filters\.page, filters\.pageSize, total\)/)
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: buildMaintenancePageHref\(locale, listQuery, \{ pageSize: value, page: 1 \}\) \}\)\)\}/)
  assert.match(source, /previousHref=\{buildMaintenancePageHref\(locale, listQuery, \{ page: pagination\.page - 1 \}\)\}/)
  assert.match(source, /nextHref=\{buildMaintenancePageHref\(locale, listQuery, \{ page: pagination\.page \+ 1 \}\)\}/)
  assert.match(source, /range: tCommon\("showingRange", \{ from: formatCount\(pagination\.start\), to: formatCount\(pagination\.end\), total: formatCount\(pagination\.total\) \}\)/)
  const pagination = await readFile("src/components/ui/pagination.tsx", "utf8")
  assert.match(pagination, /<p aria-live="polite"/, "the range and page line is still announced when it changes (R-k)")
})

test("maintenance list renders pagination", async () => {
  const source = await readFile("src/app/[locale]/(dashboard)/maintenance/page.tsx", "utf8")
  assert.match(source, /<DataTableFoot>/)
  assert.match(source, /<Pagination\b/)
  assert.equal(existsSync("src/components/maintenance/maintenance-pagination.tsx"), false, "the local pager went with its last caller")
})
```

The third test (`maintenance APIs return exact paginated envelopes`) stays as it is.

(b) Save this block as `t12-pages-block.ts` in your temp folder (the file's `read` strips `\r`, so these regexes may hold `\n`):

```ts
// Plan 2B-2 Task 12 (spec 2B §5.4 row "maintenance", §5.10 #4 and #11, I21): the repair-record list. It already paged on
// the server; it keeps its phone cards, moves its table and pager to the shared parts, and its empty state tells a
// filtered list from an empty one.
test("the repair-record list builds on PageHeader, DataTable, the shared filters and one Pagination under cards and table (spec 2B §5.4)", () => {
  const source = read(`${D}maintenance/page.tsx`)
  for (const part of ["<PageHeader", "<FilterPanel>", '<form role="search"', "<FilterFormActions", "<FilterChipList", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<ClickableTableRow", "<DataTableFoot>", "<Pagination"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /<div className="space-y-6">\n\s+<PageHeader\n\s+title=\{t\("title"\)\}\n\s+meta=\{t\("subtitle"\)\}/)
  assert.match(source, /<DataTable framed=\{false\} className=\{getDesktopTableOnlyClasses\(\)\} caption=\{t\("listTitle"\)\} scrollHint=\{tCommon\("tableScrollHint"\)\}>/)
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(/)
  assert.match(source, /<DataTableHead align="right">\{t\("cost"\)\}<\/DataTableHead>/, "the cost head names the unit (บาท), so the cells carry none")
  assert.match(source, /<DataTableCell numeric className="text-muted-foreground">\{record\.repairCost == null \? <Nil \/> : formatMoney\(Number\(record\.repairCost\)\)\}<\/DataTableCell>/)
  assert.match(source, /formatMoney\(Number\(record\.repairCost\), \{ unit: tCommon\("baht"\) \}\)/, "the phone card is not under that head, so it shows the unit")
  assert.equal(existsSync(`${C}maintenance/maintenance-pagination.tsx`), false, "the local pager went with its last caller")
})

test("the repair-record list sends a page past the end to the last page and splits its empty state on the filters (spec 2B I21, §5.10 #4)", () => {
  const source = read(`${D}maintenance/page.tsx`)
  assert.match(source, /^import \{ redirect \} from "next\/navigation"$/m)
  assert.match(source, /const lastPage = lastListPage\(total, filters\.pageSize\)\n\s+if \(records\.length === 0 && total > 0 && filters\.page > lastPage\) \{\n\s+redirect\(buildMaintenancePageHref\(locale, listQuery, \{ page: lastPage \}\)\)/)
  assert.match(source, /const hasActiveFilters = Boolean\(filters\.search \|\| filters\.status \|\| filters\.dateFrom \|\| filters\.dateTo\)/)
  assert.match(source, /title=\{t\("emptyFilteredTitle"\)\} description=\{t\("emptyFilteredHelp"\)\} actionHref=\{clearHref\} actionLabel=\{t\("clearFilters"\)\} actionVariant="secondary"/)
  assert.match(source, /title=\{t\("emptyTitle"\)\} description=\{canCreate \? t\("emptyHelp"\) : undefined\} actionHref=\{canCreate \? createHref : undefined\} actionLabel=\{canCreate \? t\("createTitle"\) : undefined\}/)
})
```

Run: `node <temp>/p2b2-append-t12.mjs <temp>/t12-pages-block.ts tests/list-pages-ui.test.ts`
Expected: `appended <temp>/t12-pages-block.ts to tests/list-pages-ui.test.ts (CRLF)`

(c) Put the page into `MIGRATED_FILTER_FILES` (items 5 and 6 then cover it):

Run: `node <temp>/p2b2-list-insert.mjs tests/list-filters-ui.test.ts MIGRATED_FILTER_FILES '  "src/app/[locale]/(dashboard)/maintenance/page.tsx",'`
Expected: `MIGRATED_FILTER_FILES in tests/list-filters-ui.test.ts: 1 line(s) added before its "]" (CRLF)`

Save this block as `t12-filters-block.ts` in your temp folder:

```ts
// Item 7 (spec 2B §6.13 table B, §6.5 "6-ญ", I24): the maintenance filter form keeps the page size, and the chip for
// the hidden asset filter removes only assetId (plan 2B-2 Task 12).
test("the maintenance filter keeps the page size, and its asset chip clears only the asset filter (item 7)", () => {
  const source = read("src/app/[locale]/(dashboard)/maintenance/page.tsx")
  const form = source.slice(source.indexOf('<form role="search"'), source.indexOf("</form>"))
  assert.match(form, /<input type="hidden" name="pageSize" value=\{filters\.pageSize\} \/>/)
  assert.match(form, /<FilterFormActions submitLabel=\{t\("filter"\)\} clear=\{hasActiveFilters \? \{ href: clearHref, label: t\("clearFilters"\) \} : undefined\} \/>/)
  assert.match(
    source,
    /<FilterChipList\n\s+className="mt-3"\n\s+label=\{t\("activeFilters"\)\}\n\s+removeLabel=\{t\("clearFilters"\)\}\n\s+chips=\{\[\{ key: "assetId", label: t\("assetFilter"\), href: `\/\$\{locale\}\/maintenance\?\$\{buildMaintenanceQueryString\(filters, \{ assetId: "", page: 1 \}\)\}` \}\]\}/,
  )
})
```

Run: `node <temp>/p2b2-append-t12.mjs <temp>/t12-filters-block.ts tests/list-filters-ui.test.ts`
Expected: `appended <temp>/t12-filters-block.ts to tests/list-filters-ui.test.ts (CRLF)`

Run: `node --test tests/maintenance-pagination-ui.test.ts tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts`
Expected: FAIL, exactly these 6 tests (every other test of the three files passes; at `e3f20ce` the run reads `tests 17 · pass 11 · fail 6`):
- `migrated filter forms use Field, SearchField and FilterSelect only, and every form is a search landmark (item 5)`: `src/app/[locale]/(dashboard)/maintenance/page.tsx: a raw select or textarea`
- `the maintenance filter keeps the page size, and its asset chip clears only the asset filter (item 7)`: no match for `/<input type="hidden" name="pageSize" value=\{filters\.pageSize\} \/>/`
- `the repair-record list builds on PageHeader, DataTable, the shared filters and one Pagination under cards and table (spec 2B §5.4)`: `no <PageHeader`
- `the repair-record list sends a page past the end to the last page and splits its empty state on the filters (spec 2B I21, §5.10 #4)`: no match for the `redirect` import regex
- `maintenance pagination exposes exact range, page size, and navigation`: no match for `/const pagination = buildMaintenancePagination\(filters\.page, filters\.pageSize, total\)/`
- `maintenance list renders pagination`: no match for `/<DataTableFoot>/`

- [ ] **Step 3: Lower the guard rows of the page and of the pager (the failing guards)**

Run: `node <temp>/p2b-budget.mjs D/maintenance/page.tsx R7=1:0 LH1=1:0 LV2=1:0 LV3=2:0 --migrated`
Expected (exit 0):
```
R7: 1 -> 0 (row deleted)
LH1: 1 -> 0 (row deleted)
LV2: 1 -> 0 (row deleted)
LV3: 2 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/maintenance/page.tsx
```

Run: `node <temp>/p2b-budget.mjs c/maintenance/maintenance-pagination.tsx LT4=1:0 LT5=2:0 LN1=1:0`
Expected (exit 0; no `--migrated`, the file is deleted in Step 6):
```
LT4: 1 -> 0 (row deleted)
LT5: 2 -> 0 (row deleted)
LN1: 1 -> 0 (row deleted)
written: src/components/maintenance/maintenance-pagination.tsx
```

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 39 · fail 8`:
- LFG `LH1` (`LH1: 29 in 29 files`), `LT4` (`2 in 2 files`), `LT5` (`5 in 3 files`), `LV2` (`99 in 31 files`), `LV3` (`38 in 11 files`) and `LN1` (`7 in 6 files`). Each lists one line: `src/app/[locale]/(dashboard)/maintenance/page.tsx: 1 > 0` for LH1 and LV2 and `…: 2 > 0` for LV3; `src/components/maintenance/maintenance-pagination.tsx: 1 > 0` for LT4 and LN1 and `…: 2 > 0` for LT5.
- LFG `L0` with 3 lines: `LH1 src/app/[locale]/(dashboard)/maintenance/page.tsx: 1 > 0`, `LV2 …: 1 > 0`, `LV3 …: 2 > 0`.
- VFG `R7 interim: table-header fills wait for DataTable (2B), file by file`: `19 matches in 13 files; over budget:` and the one line `src/app/[locale]/(dashboard)/maintenance/page.tsx: 1 > 0`.
- The totals assume Tasks 1–11 lowered their files as planned (at `e3f20ce` they read 34, 4, 9, 113, 42, 12 and 29 in 20 files). What matters is that each failing guard lists only this task's two files.

- [ ] **Step 4: The messages (spec §10.2 rows 2B-2, ruling (f))**

Save this as `t12-messages.json` in your temp folder:

```json
{
  "set": {
    "th": {
      "repairRecord.activeFilters": "ตัวกรองที่ใช้อยู่",
      "repairRecord.emptyFilteredTitle": "ไม่พบบันทึกการซ่อมที่ตรงกับตัวกรอง",
      "repairRecord.emptyFilteredHelp": "ลองเปลี่ยนหรือล้างตัวกรอง",
      "repairRecord.emptyHelp": "กด \"บันทึกซ่อม\" เพื่อเริ่มบันทึก"
    },
    "en": {
      "repairRecord.activeFilters": "Active filters",
      "repairRecord.emptyFilteredTitle": "No repair records match the filters",
      "repairRecord.emptyFilteredHelp": "Change or clear the filters",
      "repairRecord.emptyHelp": "Press \"Record a repair\" to add one"
    }
  }
}
```

Run from the repo root: `node scripts/messages-edit.mjs <temp>/t12-messages.json`
Expected: `messages updated: 4 th, 4 en, 0 deleted`

Run: `node -e "for (const l of ['th','en']) { const r = JSON.parse(require('fs').readFileSync('messages/'+l+'.json','utf8')).repairRecord; console.log(l, r.activeFilters, '|', r.emptyFilteredTitle, '|', r.emptyFilteredHelp, '|', r.emptyHelp) }"`
Expected:
```
th ตัวกรองที่ใช้อยู่ | ไม่พบบันทึกการซ่อมที่ตรงกับตัวกรอง | ลองเปลี่ยนหรือล้างตัวกรอง | กด "บันทึกซ่อม" เพื่อเริ่มบันทึก
en Active filters | No repair records match the filters | Change or clear the filters | Press "Record a repair" to add one
```
`git diff --stat messages` shows 5 insertions and 2 deletions in each file (the three new keys go to the end of `repairRecord`; its old last line gains a comma).

- [ ] **Step 5: Move the page onto the primitives (`src/app/[locale]/(dashboard)/maintenance/page.tsx`, CRLF)**

Five exact replacements, top to bottom. Make all five before you compile: (1) imports what (2)–(5) use and drops `formatCurrency`, `ColumnHeader` and `MaintenancePagination`, which (5) stops calling.

(1) Imports. `formatCurrency`, `ColumnHeader` and `MaintenancePagination` go; `redirect`, the page's two helpers, the primitives and the 2A helpers come in. The `type MaintenancePageProps` below it does not change.

Replace:

```tsx
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, CalendarClock, Download, Plus, Wrench } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import {
  buildMaintenanceQueryString,
  buildMaintenanceWhere,
  getMaintenanceDateRangeError,
  maintenanceStatusFilters,
  parseMaintenanceListParams,
} from "@/lib/maintenance-query"
import { buildDuePmPlanWhere, getBangkokDateKey } from "@/lib/preventive-maintenance"
import { getRepairRecordStatusTone, openRepairRecordWhere, toRepairRecordStatus } from "@/lib/repair-record-policy"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ColumnHeader } from "@/components/master-data/master-data-layout"
import { MaintenancePagination } from "@/components/maintenance/maintenance-pagination"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import { getDesktopTableOnlyClasses, getMobileCardListClasses } from "@/lib/design-system"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
```

with:

```tsx
import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, CalendarClock, Download, Plus, Wrench } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import {
  buildMaintenanceQueryString,
  buildMaintenanceWhere,
  getMaintenanceDateRangeError,
  maintenanceStatusFilters,
  parseMaintenanceListParams,
} from "@/lib/maintenance-query"
import { buildMaintenancePagination } from "@/lib/maintenance-list"
import { buildMaintenancePageHref } from "@/lib/maintenance-view"
import { buildDuePmPlanWhere, getBangkokDateKey } from "@/lib/preventive-maintenance"
import { getRepairRecordStatusTone, openRepairRecordWhere, toRepairRecordStatus } from "@/lib/repair-record-policy"
import { formatDate } from "@/lib/utils"
import { formatCount, formatMoney } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { FilterChipList } from "@/components/ui/filter-chips"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
import { FilterSelect } from "@/components/ui/filter-select"
import { Input } from "@/components/ui/input"
import { Nil, orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { SearchField } from "@/components/ui/search-field"
import { StatusBadge } from "@/components/ui/status-badge"
import { getDesktopTableOnlyClasses, getMobileCardListClasses } from "@/lib/design-system"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
```

(2) After the `Promise.all`: the past-the-end redirect, the range, the outcome helper without `"-"`, the active-filter flag and the create href (now used twice); then the header.

Replace:

```tsx
    prisma.asset.count({ where: stuckAssetWhere }),
  ])
  const recordHref = (id: string) => appendOperationalReturnTo(`/${locale}/maintenance/${id}`, returnHref)
  const outcomeLabel = (outcome: string | null, status: string) =>
    outcome === "usable" || outcome === "beyond_repair"
      ? t(`outcome.${outcome}`)
      : toRepairRecordStatus(status) === "closed" ? t("outcome.unknown") : "-"
  const clearHref = filters.assetId ? `/${locale}/maintenance?assetId=${encodeURIComponent(filters.assetId)}` : `/${locale}/maintenance`

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {canCreate ? (
          <Link
            href={appendOperationalReturnTo(`/${locale}/maintenance/new${filters.assetId ? `?assetId=${encodeURIComponent(filters.assetId)}` : ""}`, returnHref)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />{t("createTitle")}
          </Link>
        ) : null}
      </div>
```

with:

```tsx
    prisma.asset.count({ where: stuckAssetWhere }),
  ])
  // A page past the last one (an old link, or a narrower filter) shows the last page, not an empty table (spec 2B I21).
  const lastPage = lastListPage(total, filters.pageSize)
  if (records.length === 0 && total > 0 && filters.page > lastPage) {
    redirect(buildMaintenancePageHref(locale, listQuery, { page: lastPage }))
  }
  const pagination = buildMaintenancePagination(filters.page, filters.pageSize, total)
  const recordHref = (id: string) => appendOperationalReturnTo(`/${locale}/maintenance/${id}`, returnHref)
  const outcomeLabel = (outcome: string | null, status: string) =>
    outcome === "usable" || outcome === "beyond_repair"
      ? t(`outcome.${outcome}`)
      : toRepairRecordStatus(status) === "closed" ? t("outcome.unknown") : null
  const clearHref = filters.assetId ? `/${locale}/maintenance?assetId=${encodeURIComponent(filters.assetId)}` : `/${locale}/maintenance`
  // The filters the form shows. The asset filter has its own chip; page and page size are not filters (spec 2B §6.4).
  const hasActiveFilters = Boolean(filters.search || filters.status || filters.dateFrom || filters.dateTo)
  const createHref = appendOperationalReturnTo(`/${locale}/maintenance/new${filters.assetId ? `?assetId=${encodeURIComponent(filters.assetId)}` : ""}`, returnHref)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          canCreate ? (
            <Link href={createHref} className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden="true" />
              {t("createTitle")}
            </Link>
          ) : undefined
        }
      />
```

(3) The link to the PM plans (in the PM-due section).

Replace:

```tsx
          <Link href={`/${locale}/maintenance/pm`} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium hover:bg-accent">
            {t("pmManage")}
          </Link>
```

with:

```tsx
          <Link href={`/${locale}/maintenance/pm`} className={buttonVariants({ variant: "outline" })}>
            {t("pmManage")}
          </Link>
```

(4) The filter card becomes `FilterPanel`, with the hidden page size, `FilterFormActions` and the asset chip. The date-range warning does not change.

Replace:

```tsx
      <section className="rounded-lg border border-border bg-surface p-4">
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_repeat(3,minmax(150px,180px))_auto]" action={`/${locale}/maintenance`}>
          {filters.assetId ? <input type="hidden" name="assetId" value={filters.assetId} /> : null}
          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{tCommon("search")}</span>
            <input type="search" name="search" defaultValue={filters.search} placeholder={t("searchPlaceholder")} className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
          </label>
          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("filterStatus")}</span>
            <select name="status" defaultValue={filters.status} className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring">
              <option value="">{tCommon("all")}</option>
              {maintenanceStatusFilters.map((status) => <option key={status} value={status}>{t(`status.${status}`)}</option>)}
            </select>
          </label>
          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("dateFrom")}</span>
            <input type="date" name="dateFrom" defaultValue={filters.dateFrom} className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
          </label>
          <label className="min-w-0">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("dateTo")}</span>
            <input type="date" name="dateTo" defaultValue={filters.dateTo} className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
          </label>
          <div className="flex flex-col gap-2 self-end sm:flex-row">
            <button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover">{t("filter")}</button>
            <Link href={clearHref} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium hover:bg-accent">{t("clearFilters")}</Link>
          </div>
        </form>
        {filters.assetId ? <p className="mt-3 text-xs text-muted-foreground">{t("assetFilter")} · <Link href={`/${locale}/maintenance`} className="text-primary hover:underline">{t("clearFilters")}</Link></p> : null}
        {getMaintenanceDateRangeError(filters) ? (
          <p role="alert" className="mt-3 rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning">{t("invalidDateRange")}</p>
        ) : null}
      </section>
```

with:

```tsx
      <FilterPanel>
        <form role="search" className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_repeat(3,minmax(150px,180px))_auto]" action={`/${locale}/maintenance`}>
          {filters.assetId ? <input type="hidden" name="assetId" value={filters.assetId} /> : null}
          <input type="hidden" name="pageSize" value={filters.pageSize} />
          <Field label={tCommon("search")}>
            <SearchField name="search" defaultValue={filters.search} placeholder={t("searchPlaceholder")} />
          </Field>
          <FilterSelect
            label={t("filterStatus")}
            name="status"
            defaultValue={filters.status}
            allLabel={tCommon("all")}
            options={maintenanceStatusFilters.map((status) => ({ value: status, label: t(`status.${status}`) }))}
          />
          <Field label={t("dateFrom")}>
            <Input type="date" name="dateFrom" defaultValue={filters.dateFrom} />
          </Field>
          <Field label={t("dateTo")}>
            <Input type="date" name="dateTo" defaultValue={filters.dateTo} />
          </Field>
          <FilterFormActions submitLabel={t("filter")} clear={hasActiveFilters ? { href: clearHref, label: t("clearFilters") } : undefined} />
        </form>
        {filters.assetId ? (
          <FilterChipList
            className="mt-3"
            label={t("activeFilters")}
            removeLabel={t("clearFilters")}
            chips={[{ key: "assetId", label: t("assetFilter"), href: `/${locale}/maintenance?${buildMaintenanceQueryString(filters, { assetId: "", page: 1 })}` }]}
          />
        ) : null}
        {getMaintenanceDateRangeError(filters) ? (
          <p role="alert" className="mt-3 rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning">{t("invalidDateRange")}</p>
        ) : null}
      </FilterPanel>
```

(5) The list section from its export button to its end: the export button, the two empty states, the cards' codes and money, the table on `DataTable`, and one `Pagination` under both. The section frame and its title row above this snippet stay.

Replace:

```tsx
          {canExport ? (
            <a href={`/api/maintenance-tickets/export?${listQuery}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium hover:bg-accent">
              <Download className="h-4 w-4" />{t("export")}
            </a>
          ) : null}
        </div>
        {records.length === 0 ? (
          <div className="p-4">
            <ActionEmptyState icon={<Wrench className="h-6 w-6" />} title={t("emptyTitle")} description={t("emptyHelp")} actionHref={clearHref} actionLabel={t("clearFilters")} />
          </div>
        ) : (
          <>
            <div className={`${getMobileCardListClasses()} p-3`}>
              {records.map((record) => (
                <Link key={record.id} href={recordHref(record.id)} className="block min-w-0 rounded-md border border-border bg-background p-3 hover:bg-accent">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">{record.asset.assetTag}</div>
                      <div className="truncate text-xs text-muted-foreground">{record.asset.name}</div>
                    </div>
                    <StatusBadge label={t(`status.${toRepairRecordStatus(record.repairStatus)}`)} tone={getRepairRecordStatusTone(record.repairStatus)} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-foreground">{record.problem}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {formatDate(record.reportedDate)} · {record.vendor?.name ?? t("internal")}
                    {record.repairCost == null ? "" : ` · ${formatCurrency(Number(record.repairCost))}`}
                  </div>
                </Link>
              ))}
            </div>
            <div className={`${getDesktopTableOnlyClasses()} overflow-x-auto`}>
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <ColumnHeader>{t("date")}</ColumnHeader>
                    <ColumnHeader>{t("asset")}</ColumnHeader>
                    <ColumnHeader>{t("problem")}</ColumnHeader>
                    <ColumnHeader>{t("statusLabel")}</ColumnHeader>
                    <ColumnHeader>{t("outcomeQuestion")}</ColumnHeader>
                    <ColumnHeader>{t("vendor")}</ColumnHeader>
                    <ColumnHeader>{t("cost")}</ColumnHeader>
                    <ColumnHeader>{t("reporter")}</ColumnHeader>
                    <ColumnHeader>{t("repairNo")}</ColumnHeader>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {records.map((record) => (
                    <ClickableTableRow key={record.id} href={recordHref(record.id)} label={`${tCommon("view")}: ${record.repairNo}`}>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(record.reportedDate)}</td>
                      <td className="min-w-48 px-4 py-3">
                        <div className="font-medium text-foreground">{record.asset.assetTag}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{record.asset.name}</div>
                      </td>
                      <td className="min-w-72 px-4 py-3 text-foreground">{record.problem}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge label={t(`status.${toRepairRecordStatus(record.repairStatus)}`)} tone={getRepairRecordStatusTone(record.repairStatus)} />
                      </td>
                      <td className={`whitespace-nowrap px-4 py-3 ${record.outcome === "beyond_repair" ? "text-warning" : record.outcome === "usable" ? "text-success" : "text-muted-foreground"}`}>
                        {outcomeLabel(record.outcome, record.repairStatus)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{record.vendor?.name ?? t("internal")}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{record.repairCost == null ? "-" : formatCurrency(Number(record.repairCost))}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{record.reportedBy.fullNameTh}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{record.repairNo}</td>
                    </ClickableTableRow>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <MaintenancePagination
          locale={locale}
          currentQuery={listQuery}
          page={filters.page}
          pageSize={filters.pageSize}
          total={total}
          labels={{ rowsPerPage: tCommon("rowsPerPage"), page: tCommon("page"), of: tCommon("of"), previous: tCommon("previous"), next: tCommon("next") }}
        />
      </section>
```

with:

```tsx
          {canExport ? (
            <a href={`/api/maintenance-tickets/export?${listQuery}`} className={buttonVariants({ variant: "outline", size: "md" })}>
              <Download aria-hidden="true" />
              {t("export")}
            </a>
          ) : null}
        </div>
        {records.length === 0 ? (
          <div className="p-4">
            {hasActiveFilters ? (
              <ActionEmptyState icon={<Wrench className="h-6 w-6" />} title={t("emptyFilteredTitle")} description={t("emptyFilteredHelp")} actionHref={clearHref} actionLabel={t("clearFilters")} actionVariant="secondary" />
            ) : (
              <ActionEmptyState icon={<Wrench className="h-6 w-6" />} title={t("emptyTitle")} description={canCreate ? t("emptyHelp") : undefined} actionHref={canCreate ? createHref : undefined} actionLabel={canCreate ? t("createTitle") : undefined} />
            )}
          </div>
        ) : (
          <>
            <div className={`${getMobileCardListClasses()} p-3`}>
              {records.map((record) => (
                <Link key={record.id} href={recordHref(record.id)} className="block min-w-0 rounded-md border border-border bg-background p-3 hover:bg-accent">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        <span className="tag font-medium">{record.asset.assetTag}</span>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{record.asset.name}</div>
                    </div>
                    <StatusBadge label={t(`status.${toRepairRecordStatus(record.repairStatus)}`)} tone={getRepairRecordStatusTone(record.repairStatus)} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-foreground">{record.problem}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {formatDate(record.reportedDate)} · {record.vendor?.name ?? t("internal")}
                    {record.repairCost == null ? "" : ` · ${formatMoney(Number(record.repairCost), { unit: tCommon("baht") })}`}
                  </div>
                </Link>
              ))}
            </div>
            <DataTable framed={false} className={getDesktopTableOnlyClasses()} caption={t("listTitle")} scrollHint={tCommon("tableScrollHint")}>
              <DataTableHeader>
                <tr>
                  <DataTableHead>{t("date")}</DataTableHead>
                  <DataTableHead>{t("asset")}</DataTableHead>
                  <DataTableHead>{t("problem")}</DataTableHead>
                  <DataTableHead>{t("statusLabel")}</DataTableHead>
                  <DataTableHead>{t("outcomeQuestion")}</DataTableHead>
                  <DataTableHead>{t("vendor")}</DataTableHead>
                  <DataTableHead align="right">{t("cost")}</DataTableHead>
                  <DataTableHead>{t("reporter")}</DataTableHead>
                  <DataTableHead>{t("repairNo")}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {records.map((record) => (
                  <ClickableTableRow key={record.id} href={recordHref(record.id)} label={`${tCommon("view")}: ${record.repairNo}`}>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatDate(record.reportedDate)}</DataTableCell>
                    <DataTableCell className="min-w-48">
                      <div className="font-medium text-foreground">
                        <span className="tag font-medium">{record.asset.assetTag}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{record.asset.name}</div>
                    </DataTableCell>
                    <DataTableCell className="min-w-72 text-foreground">{record.problem}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <StatusBadge label={t(`status.${toRepairRecordStatus(record.repairStatus)}`)} tone={getRepairRecordStatusTone(record.repairStatus)} />
                    </DataTableCell>
                    <DataTableCell className={`whitespace-nowrap ${record.outcome === "beyond_repair" ? "text-warning" : record.outcome === "usable" ? "text-success" : "text-muted-foreground"}`}>
                      {orNil(outcomeLabel(record.outcome, record.repairStatus))}
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">{record.vendor?.name ?? t("internal")}</DataTableCell>
                    <DataTableCell numeric className="text-muted-foreground">{record.repairCost == null ? <Nil /> : formatMoney(Number(record.repairCost))}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">{record.reportedBy.fullNameTh}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">
                      <span className="tag">{record.repairNo}</span>
                    </DataTableCell>
                  </ClickableTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </>
        )}
        {total > 0 ? (
          <DataTableFoot>
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              previousHref={buildMaintenancePageHref(locale, listQuery, { page: pagination.page - 1 })}
              nextHref={buildMaintenancePageHref(locale, listQuery, { page: pagination.page + 1 })}
              pageSize={pagination.pageSize}
              pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: buildMaintenancePageHref(locale, listQuery, { pageSize: value, page: 1 }) }))}
              labels={{
                navigation: tCommon("pagination"),
                previous: tCommon("previous"),
                next: tCommon("next"),
                pageOf: tCommon("pageOf", { page: pagination.page, total: pagination.totalPages }),
                range: tCommon("showingRange", { from: formatCount(pagination.start), to: formatCount(pagination.end), total: formatCount(pagination.total) }),
                pageSizeGroup: tCommon("pageSizeLabel"),
                rowsPerPage: tCommon("rowsPerPage"),
              }}
            />
          </DataTableFoot>
        ) : null}
      </section>
```

Check: `grep -n "toLocaleString\|\"-\"\|<MaintenancePagination\|maintenance-pagination\|ColumnHeader\|formatCurrency\|bg-muted\|<h1\|opacity-\|function " "src/app/[locale]/(dashboard)/maintenance/page.tsx"` prints one line, `50:export default async function MaintenancePage({ params, searchParams }: MaintenancePageProps) {`.

- [ ] **Step 6: Delete the pager that has no caller left**

Run: `git rm src/components/maintenance/maintenance-pagination.tsx`
Expected: `rm 'src/components/maintenance/maintenance-pagination.tsx'`

Run: `git grep -n "components/maintenance/maintenance-pagination\|<MaintenancePagination" -- src`
Expected: no output (exit 1). `buildMaintenancePagination` in `src/lib/maintenance-list.ts` stays: the page calls it.

- [ ] **Step 7: Run the tests for this task**

Run: `node --test tests/maintenance-pagination-ui.test.ts tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/operational-return-navigation.test.ts tests/repair-record-list-ui.test.ts tests/maintenance-contrast.test.ts tests/maintenance-view.test.ts tests/maintenance-list.test.ts tests/repair-record-ui.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts tests/form-migration-guards.test.ts tests/list-primitives-ui.test.ts tests/clickable-table-row-navigation.test.ts`
Expected: PASS, `fail 0`. The files that Tasks 1–11 do not touch hold: maintenance-pagination-ui 3, repair-record-list-ui 5, maintenance-contrast 1, maintenance-view 1, maintenance-list 1, repair-record-ui 7, thai-glossary 3, messages-parity 3, form-migration-guards 23, list-frame-guards 21, visual-foundation-guards 26. `list-pages-ui` has 2 tests more and `list-filters-ui` 1 more than before Step 2.

Run: `node <temp>/p2b1-precheck.mjs --file D/maintenance/page.tsx`
Expected: `· in MIGRATED_LIST_FILES` on the `file` line, the rows `R7 0 0 0 1`, `LH1 0 0 0 1`, `LV2 0 0 0 1`, `LV3 0 0 0 2`, and `args    (no row holds this file)`; exit 0.

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected: exit 0, `budgets hold: no live count is over its row`, and (with Tasks 1–11 done as planned) `R7  TABLE_HEADER_FILLS  18 in 12 rows`, `LH1 BUDGETS.LH1  28 in 28 rows`, `LT4 … 1 in 1 rows`, `LT5 … 3 in 2 rows`, `LV2 … 98 in 30 rows`, `LV3 … 36 in 10 rows`, `LN1 … 6 in 5 rows`. LT4, LT5, LV2, LV3 and LN1 now hold the plan's totals (ruling (g)). The one `slack` line is LB1's `slack D/maintenance/[id]/page.tsx: budget 1 > live 0` (the `0 → 1` row 2B-4 fills, controller ruling (1)); none names this task's page or pager.

- [ ] **Step 8: Prove every class compiles**

Run from the repo root: `node <temp>/p2b2-tw-probe.mjs "src/app/[locale]/(dashboard)/maintenance/page.tsx"`
Expected: `checked 70 classes, missing 0` (exit 0). No class is new to `src`: the button, field, table, chip and foot classes come from the 2B-1 primitives, and `tag font-medium` is the 2B-1 row-id pair.

- [ ] **Step 9: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, and 3 more tests than before Step 2 (2 in `list-pages-ui`, 1 in `list-filters-ui`; `maintenance-pagination-ui` keeps 3; 1 skipped as before).
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors and no new warning in `src/` or `tests/` (`npx eslint "src/app/[locale]/(dashboard)/maintenance/page.tsx" tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/maintenance-pagination-ui.test.ts` prints nothing).

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- `git diff --stat` (unstaged) shows 8 files: the page 143 insertions and 98 deletions, `tests/maintenance-pagination-ui.test.ts` 14 and 9, `tests/list-pages-ui.test.ts` 26 insertions, `tests/list-filters-ui.test.ts` 14 insertions, `tests/list-frame-guards.test.ts` 1 insertion and 10 deletions (6 rows and the 4 `// 2B-2` group lines that no longer head a row once Tasks 1–11 are in; at `e3f20ce` alone it would be 1 and 6), `tests/visual-foundation-guards.test.ts` 1 deletion, `messages/th.json` and `messages/en.json` 5 and 2 each.
- `git status` also lists `D  src/components/maintenance/maintenance-pagination.tsx` (staged by `git rm`).
- `node -e "const s=require('fs').readFileSync(process.argv[1],'utf8');console.log((s.match(/\r\n/g)||[]).length,(s.match(/\n/g)||[]).length)" "src/app/[locale]/(dashboard)/maintenance/page.tsx"` prints `339 339` (CRLF throughout). A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).

- [ ] **Step 10: Commit**

```bash
git add "src/app/[locale]/(dashboard)/maintenance/page.tsx" tests/maintenance-pagination-ui.test.ts tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts messages/th.json messages/en.json
git commit -m "feat(ui): repair-record list on DataTable, the shared filters and Pagination, with a filter-aware empty state (2B-2 task 12)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 9 files in the commit, the pager among them as a deletion (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the plan 2B-2 dev-app check (Task 18, spec §8.6 row `/th/maintenance`):** `/th/maintenance` at 1440, 1024, 768 and 375 (Thai, and English once):
- the header: title 600, "บันทึกซ่อม" 36 (44 at 375); no back button
- the filter panel: fields 40 (44 at 375); Enter in the search submits; "ล้างตัวกรอง" only after a search, status or date; pick 50 in the footer, then filter: the list keeps 50 and starts on page 1
- the asset chip: open the list with `?assetId=<id of an asset that has repair records>&search=<a word>&pageSize=50`; the chip reads "เฉพาะทรัพย์สินนี้"; a screen reader names it "ล้างตัวกรอง: เฉพาะทรัพย์สินนี้"; pressing it keeps the search and 50 and drops only `assetId`
- the table at 1440 and 1024: white header 13/500, no capitals; rows about 46; the cost right-aligned without "฿"; "—" for an empty cost or outcome; tags monospace; a row click opens the record with `returnTo`; at 768 the table scrolls sideways and the hint line shows only while it overflows
- at 375: the cards; the cost line says "บาท"; one footer under the cards
- the footer: "1–25 จาก N รายการ · หน้า 1 จาก M", 25/50/100, words-only buttons; NVDA reads the range line again after a page change (`aria-live`); `?page=99` lands on the last page; a filter that finds nothing shows "ไม่พบบันทึกการซ่อมที่ตรงกับตัวกรอง" with "ล้างตัวกรอง"; an account without `maintenance:create` sees no create button anywhere
- "ส่งออก Excel" downloads as before (do not change data); "จัดการแผน PM" opens `/th/maintenance/pm`
- load time as before (no new query); save nothing

---

### Task 13: `D/maintenance/pm/page.tsx` paged on the server by plan state (B4), as panel rows with a back link (I25)

Spec §8.6 row 15, with §5.4 row "maintenance/pm", §5.9.1 (the B4 rules), §5.9.2 row 6, §5.9.3 bullet "PM", §5.14 (`planStatePageSlices` cases in `tests/list-pagination.test.ts`), §4.4 header row `D/maintenance/pm/page.tsx:38-53` and §4.4 rule 2 (no icon in the h1), §4.5 row 32, §3.15 (`ContentPanel divided`, `ContentPanelRows`), rulings I1, I21, I25, I32, B4 and controller rulings (e), (j). One page and one pure helper, one commit (the helper has no other caller). The page and `src/lib/preventive-maintenance.ts` are CRLF. The only server change is read-only: one `groupBy` and up to three `findMany` (usually one). No schema, migration, index or API change.

Rulings this task applies:
- **B4, §5.9.2 row 6:** today the page loads up to 500 plans ordered by `nextDueDate` and sorts them by state in JS (`planStateOrder`, active → paused → ended → any other). That order must hold across pages, so a page cannot sort after it cuts. The page reads `parseListPage({ page, pageSize })`, counts the plans per state with `prisma.maintenancePlan.groupBy({ by: ["planState"], _count: { _all: true } })` (the total for the pager is their sum), and the new pure `planStatePageSlices(counts, listPageWindow(listPage))` turns the page's `skip`/`take` over the whole list into one window per state, in state order. Each window is `findMany({ where: { planState }, orderBy: [{ nextDueDate: "asc" }, { id: "asc" }], skip, take })`, run in one `Promise.all` and joined in order. The order in a page equals today's; only ties on the same due date now fall back to `id` (§5.9.3: today's `Array.prototype.sort` is stable, so nobody relies on another tie order).
- **Ruling (round trips):** the `groupBy` has to come before the windows (they need its counts), so this list waits twice where the other B4 lists wait once (§5.9.1 "count in the same `Promise.all`"). §5.9.2 row 6 designs it so; the table is small (hundreds of rows), `planState` has no index and none is added (B4). Task 18 measures the load time on dev.
- **`planStatePageSlices` (§5.14):** pure (no Prisma, no React), in `src/lib/preventive-maintenance.ts` next to the other PM rules, so `tests/list-pagination.test.ts` imports it with a relative `.ts` path (the file's only import is `import type { Prisma }`, which type stripping erases). Order: `active`, `paused`, `ended`, then any other state by name. The database allows only those three (`CHECK ([planState] IN (…))`, `prisma/manual-migrations/2026-07-14-add-maintenance-plan-state.sql:18`), so "any other" is a guard, not a real case. States with no plans give no window; a page past the end gives none.
- **I21:** a page past the last page redirects to the last page (`lastListPage`), like every list on `Pagination`. `Pagination` sits at the end of the panel in `DataTableFoot` (the one list-foot look) and shows only while `total > 0`; 25/50/100 come from `LIST_PAGE_SIZES`.
- **B4 `returnTo`:** `listHref(next)` writes `page` only above 1 and `pageSize` only when not 25 (`appendListPage`), so `/th/maintenance/pm` stays the default link. The "แก้ไข" link becomes `` appendOperationalReturnTo(`/${locale}/maintenance/pm/${plan.id}/edit`, planListReturnHref) ``: the literal `` `/${locale}/maintenance/pm/${plan.id}/edit` `` stays for `tests/pm-plans-ui.test.ts:8`. Task 14 makes the edit page follow it. "บันทึกว่าทำแล้ว" keeps its href (`/maintenance/new?planId=`, pinned `:9`): `maintenance/new` accepts only `/maintenance` as `returnTo` (I22).
- **§5.4, §3.15:** the plan list stays rows at every width (no table): `ContentPanel divided flush className="overflow-hidden"` with `ContentPanelRows` (soft lines, the panel's side gutter on each row) in place of the hand-made `section`/`ul`. `overflow-hidden` keeps the foot's white fill inside the panel's rounded corners, as the brand panel of 2B-1 does. The panel has no head: the page title names the list and no key is added. The empty state (`ActionEmptyState`) stays as it is.
- **I21, §5.4:** the row buttons stay in the row; no ⋯ (the 2C dialogs of `MaintenancePlanStateActions` have no handle, R-m). "บันทึกว่าทำแล้ว" becomes `buttonVariants({ size: "sm" })`, "แก้ไข" `buttonVariants({ variant: "outline", size: "sm" })` (both 44 below md, 32 from md). `MaintenancePlanStateActions` is a 2C batch 3 file and is not touched.
- **I25, I1, I32:** `PageHeader` with the crumbs it had (`breadcrumbs={[…]}` written at the call site, so `tests/breadcrumbs-ui.test.ts` still counts 11 sites and still sees this page end on a title), `title={t("pmTitle")}` without the `CalendarClock` icon, `meta={t("pmSubtitle")}`, the new `` back={<PageBackLink href={`/${locale}/maintenance`} label={tCommon("back")} />} `` and the create link at `buttonVariants({ size: "md" })`. The root becomes `space-y-6`.
- **R-p:** the plan number, the asset tag and the provider code are `<span className="tag">` inside their lines.
- **Tests (ruling (j)):** `tests/list-pagination.test.ts` gets 3 `planStatePageSlices` tests (a page that spans active, paused and ended; the last page and past the end; an unknown state last). `tests/list-pages-ui.test.ts` gets one block of 2 tests. The page is not added to `B4_LISTS`: that test wants `findMany` and `count({ where })` in one `Promise.all`, which this design does not have; its own test checks `parseListPage`, the `groupBy`, the windows, the order with `id`, no fixed `take` and the redirect instead.
- **LFG (ruling (e)):** the page's one row (LH1) goes to 0 and the page joins `MIGRATED_LIST_FILES` (no later 2B plan lists it). No VFG row: the page has no table.
- **Ruling (TDD order):** tests and the lowered row first, then the helper and the page.

What users will see on `/th/maintenance/pm`:
- A "กลับ" button (a 44px arrow on phones) next to "เพิ่มแผน PM" goes back to `/th/maintenance`; the crumbs stay. The title is weight 600 without the calendar icon.
- 25 plans per page with "1–25 จาก N รายการ · หน้า 1 จาก M", 25/50/100 and "ก่อนหน้า"/"ถัดไป". Before, one page showed up to 500 plans and never said that more were cut.
- The order is the same: active plans first, then paused, then ended, each by the next due date.
- The rows are split by soft lines; plan numbers, asset tags and provider codes are monospace. "บันทึกว่าทำแล้ว" and "แก้ไข" are 32px on desktop (44 on phones), "แก้ไข" outlined. Pause, resume and end work as before.
- From page 2, "แก้ไข" carries the page and page size (Task 14 brings the user back there).

Not in this task:
- the PM edit page and the plan form (Task 14), `pm/new` (its `returnTo` is the PM list, and a new plan is found from page 1 anyway)
- `MaintenancePlanStateActions` and its dialogs (2C batch 3), the PM-due section of `/maintenance`
- messages (no key changes), docs (Task 19)

**Files:**
- Modify: `src/app/[locale]/(dashboard)/maintenance/pm/page.tsx` (`i/lf w/crlf`; 2 exact replacements, together the whole file)
- Modify: `src/lib/preventive-maintenance.ts` (`i/lf w/crlf`; 1 exact replacement)
- Modify: `tests/list-pagination.test.ts` (`i/lf w/crlf`; 1 exact replacement and one block appended)
- Modify: `tests/list-pages-ui.test.ts` (`i/lf w/crlf`; one block appended)
- Modify: `tests/list-frame-guards.test.ts` (through `p2b-budget.mjs` only)
- Temp folder only: `t13-pagination-block.ts`, `t13-pages-block.ts`; Task 12's `p2b2-t12-precheck.mjs`, `p2b2-append-t12.mjs` and `p2b2-tw-probe.mjs`

**Must keep passing without edits:**
- `tests/pm-plans-ui.test.ts:5-10` (`MaintenancePlanStateActions`, the edit literal, `/maintenance/new?planId=${plan.id}`), `tests/maintenance-plan-routes.test.ts:20-22`
- `tests/breadcrumbs-ui.test.ts` (11 crumb sites, 8 with a code; `maintenance/pm/page.tsx` ends on a title, `:65-69`)
- `tests/preventive-maintenance.test.ts`, `tests/pm-due-dates.test.ts` (the other functions of the helper file), the 6 tests already in `tests/list-pagination.test.ts`
- `tests/mobile-field-navigation.test.ts` and FMG GL2 (`/maintenance/pm` is still a list route with the bottom navigation), `tests/form-migration-guards.test.ts` (never edited), `tests/visual-foundation-guards.test.ts`

**Interfaces:**
- Consumes:
  - Task 12: `p2b2-t12-precheck.mjs`, `p2b2-append-t12.mjs`, `p2b2-tw-probe.mjs` in the temp folder.
  - 2B-1: `PageHeader({ breadcrumbs, title, meta, back, actions })` and `PageBackLink({ href, label })` from `@/components/ui/page-header`; `ContentPanel` (`divided`, `flush`, `className`) and `ContentPanelRows` (a `<ul>`) from `@/components/ui/content-panel`; `DataTableFoot` from `@/components/ui/data-table`; `Pagination` (as in Task 12) from `@/components/ui/pagination`; `LIST_PAGE_SIZES`, `parseListPage({ page, pageSize })` → `{ page, pageSize }`, `listPageWindow(state)` → `{ skip, take }`, `lastListPage(total, pageSize)` and `appendListPage(params, { page?, pageSize? })` from `@/lib/list-pagination`; `paginationRange(page, pageSize, total)` → `{ start, end, totalPages }` from `@/lib/master-data-query`.
  - `appendOperationalReturnTo(href, returnTo)` from `@/lib/operational-return-navigation`; `formatCount` from `@/lib/display-format`; `buttonVariants`.
  - Prisma 7: `prisma.maintenancePlan.groupBy({ by: ["planState"], _count: { _all: true } })` → `Array<{ planState: string; _count: { _all: number } }>` (the pattern of `src/app/api/reports/assets-overview/export/route.ts:21`).
- Produces:
  - `src/lib/preventive-maintenance.ts`: `export type MaintenancePlanStateCount = { planState: string; count: number }`, `export type MaintenancePlanStatePageSlice = { planState: string; skip: number; take: number }` and `export function planStatePageSlices(counts: readonly MaintenancePlanStateCount[], pageWindow: { skip: number; take: number }): MaintenancePlanStatePageSlice[]`
  - the PM list's edit links carry `returnTo` = `planListReturnHref` (`/${locale}/maintenance/pm`, plus `page` above 1 and `pageSize` other than 25). Task 14 reads it.
  - `tests/list-pagination.test.ts`: 3 tests; `tests/list-pages-ui.test.ts`: 2 tests; LFG: no row of the page, the page in `MIGRATED_LIST_FILES`

| guard | `D/maintenance/pm/page.tsx` before → after | total before → after (with Tasks 1–12 done as planned) |
|---|---|---|
| LFG LH1 | 1 → – · joins `MIGRATED_LIST_FILES` | 28 → 27 (25 after Task 17) |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b2-t12-precheck.mjs 13`
Expected: `git status` prints nothing. The script prints the eleven shared `ok` lines of Task 12 Step 1 (Task 0 to `tests/list-filters-ui.test.ts has read and the list MIGRATED_FILTER_FILES`), then:
```
ok      Task 12 is in: maintenance-pagination.tsx is gone and repairRecord.activeFilters exists
ok      src/app/[locale]/(dashboard)/maintenance/pm/page.tsx is CRLF and unchanged since e3f20ce (hash 6f2aeb71709c81b6)
ok      src/lib/preventive-maintenance.ts is CRLF and unchanged since e3f20ce (hash aa227ca8484bed98)
ok      tests/list-pagination.test.ts imports node:test on one line and has no planStatePageSlices yet
ok      tests/pm-plans-ui.test.ts is unchanged since e3f20ce
ok      the PM list is not yet in list-pages-ui or MIGRATED_LIST_FILES
```
five `info` lines (all `CRLF`) and `preconditions hold for Task 13`. On any `MISSING` line, stop and report it.

Run: `node <temp>/p2b1-precheck.mjs --file D/maintenance/pm/page.tsx`
Expected (after the header lines; exit 0):
```
file    src/app/[locale]/(dashboard)/maintenance/pm/page.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LH1        1       1     0     1
args    LH1=1:1
```

Run: `git ls-files --eol "src/app/[[]locale]/(dashboard)/maintenance/pm/page.tsx" src/lib/preventive-maintenance.ts tests/list-pagination.test.ts tests/list-pages-ui.test.ts`
Expected: `i/lf    w/crlf` for all four.

- [ ] **Step 2: Write the failing tests**

(a) `tests/list-pagination.test.ts`: import the helper. Replace:

```ts
import test from "node:test"
```

with:

```ts
import test from "node:test"
import { planStatePageSlices } from "../src/lib/preventive-maintenance.ts"
```

Save this block as `t13-pagination-block.ts` in your temp folder:

```ts
// Plan 2B-2 Task 13 (spec 2B §5.9.2 row 6, §5.14): the PM list pages over its plan states in their order, so the
// page reads one findMany window per state instead of sorting a capped list in JS.
test("planStatePageSlices: a page that spans active, paused and ended reads each state from where the last one ended", () => {
  const counts = [
    { planState: "ended", count: 4 },
    { planState: "paused", count: 10 },
    { planState: "active", count: 30 },
  ]
  assert.deepEqual(planStatePageSlices(counts, { skip: 0, take: 25 }), [{ planState: "active", skip: 0, take: 25 }])
  assert.deepEqual(planStatePageSlices(counts, listPageWindow({ page: 2, pageSize: 25 })), [
    { planState: "active", skip: 25, take: 5 },
    { planState: "paused", skip: 0, take: 10 },
    { planState: "ended", skip: 0, take: 4 },
  ])
  assert.deepEqual(planStatePageSlices(counts, { skip: 32, take: 5 }), [{ planState: "paused", skip: 2, take: 5 }], "a page inside one state")
  assert.deepEqual(counts.map((row) => row.planState), ["ended", "paused", "active"], "the counts are not reordered in place")
})

test("planStatePageSlices: the last page is short, and a page past the end or an empty list reads nothing", () => {
  const counts = [{ planState: "active", count: 26 }, { planState: "paused", count: 0 }]
  assert.deepEqual(planStatePageSlices(counts, listPageWindow({ page: 2, pageSize: 25 })), [{ planState: "active", skip: 25, take: 1 }])
  assert.deepEqual(planStatePageSlices(counts, listPageWindow({ page: 3, pageSize: 25 })), [], "past the end: the page redirects to the last page")
  assert.deepEqual(planStatePageSlices([], { skip: 0, take: 25 }), [])
})

test("planStatePageSlices puts a state it does not know after ended, by name", () => {
  const counts = [
    { planState: "zz", count: 1 },
    { planState: "archived", count: 2 },
    { planState: "ended", count: 1 },
    { planState: "active", count: 1 },
  ]
  assert.deepEqual(planStatePageSlices(counts, { skip: 0, take: 25 }).map((slice) => slice.planState), ["active", "ended", "archived", "zz"])
  assert.deepEqual(planStatePageSlices(counts, { skip: 2, take: 2 }), [{ planState: "archived", skip: 0, take: 2 }])
})
```

Run: `node <temp>/p2b2-append-t12.mjs <temp>/t13-pagination-block.ts tests/list-pagination.test.ts`
Expected: `appended <temp>/t13-pagination-block.ts to tests/list-pagination.test.ts (CRLF)`

(b) Save this block as `t13-pages-block.ts` in your temp folder:

```ts
// Plan 2B-2 Task 13 (spec 2B §5.4 row "maintenance/pm", §5.9.2 row 6, I21, I25): the PM plans page by state, as the
// rows of a divided panel, and the page gets the back link it lacked. Row buttons stay in the row (I21).
test("PM plans page on the server by state, as panel rows with one Pagination at the end of the panel (spec 2B §5.9.2 row 6)", () => {
  const source = read(`${D}maintenance/pm/page.tsx`)
  assert.match(source, /const listPage = parseListPage\(\{ page, pageSize \}\)/)
  assert.match(source, /prisma\.maintenancePlan\.groupBy\(\{ by: \["planState"\], _count: \{ _all: true \} \}\)/)
  assert.match(source, /planStatePageSlices\(\n\s+stateCounts\.map\(\(row\) => \(\{ planState: row\.planState, count: row\._count\._all \}\)\),\n\s+listPageWindow\(listPage\),\n\s+\)/)
  assert.match(source, /where: \{ planState: slice\.planState \},/)
  assert.match(source, /orderBy: \[\{ nextDueDate: "asc" \}, \{ id: "asc" \}\],\n\s+skip: slice\.skip,\n\s+take: slice\.take,/)
  assert.doesNotMatch(source, /\btake: \d+|\.sort\(/, "no fixed number of rows, and no sort of a capped list in JS")
  assert.match(source, /<ContentPanel divided flush className="overflow-hidden">/)
  assert.match(source, /<ContentPanelRows>/)
  assert.match(source, /<DataTableFoot>\n\s+<Pagination\n/)
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: listHref\(\{ pageSize: value \}\) \}\)\)\}/)
  assert.match(source, /^import \{ redirect \} from "next\/navigation"$/m)
  assert.match(source, /const lastPage = lastListPage\(total, listPage\.pageSize\)\n\s+if \(plans\.length === 0 && total > 0 && listPage\.page > lastPage\) \{\n\s+redirect\(listHref\(\{ page: lastPage, pageSize: listPage\.pageSize \}\)\)/)
})

test("the PM page goes back to maintenance, has no icon in its title, and its edit link keeps the page (spec 2B I25, B4)", () => {
  const source = read(`${D}maintenance/pm/page.tsx`)
  assert.match(source, /<PageHeader\n\s+breadcrumbs=\{\[\{ label: tRecord\("title"\), href: `\/\$\{locale\}\/maintenance` \}, \{ label: t\("pmTitle"\) \}\]\}\n\s+title=\{t\("pmTitle"\)\}\n\s+meta=\{t\("pmSubtitle"\)\}\n\s+back=\{<PageBackLink href=\{`\/\$\{locale\}\/maintenance`\} label=\{tCommon\("back"\)\} \/>\}/)
  assert.match(source, /^import \{ Plus \} from "lucide-react"$/m, "the title icon (CalendarClock) is gone")
  assert.match(source, /const planListReturnHref = listHref\(listPage\)/)
  assert.match(source, /href=\{appendOperationalReturnTo\(`\/\$\{locale\}\/maintenance\/pm\/\$\{plan\.id\}\/edit`, planListReturnHref\)\} className=\{buttonVariants\(\{ variant: "outline", size: "sm" \}\)\}/)
  assert.match(source, /href=\{`\/\$\{locale\}\/maintenance\/new\?planId=\$\{plan\.id\}`\} className=\{buttonVariants\(\{ size: "sm" \}\)\}/)
  assert.match(source, /\{canEdit \? <MaintenancePlanStateActions planId=\{plan\.id\} state=\{plan\.planState as MaintenancePlanState\} \/> : null\}/)
})
```

Run: `node <temp>/p2b2-append-t12.mjs <temp>/t13-pages-block.ts tests/list-pages-ui.test.ts`
Expected: `appended <temp>/t13-pages-block.ts to tests/list-pages-ui.test.ts (CRLF)`

Run: `node --test tests/list-pagination.test.ts tests/list-pages-ui.test.ts`
Expected: FAIL, 3 failures; every other test of `list-pages-ui` passes:
- `tests\list-pagination.test.ts` fails as a file: `SyntaxError: The requested module '../src/lib/preventive-maintenance.ts' does not provide an export named 'planStatePageSlices'` (so its 6 old tests do not run either until Step 4)
- `PM plans page on the server by state, as panel rows with one Pagination at the end of the panel (spec 2B §5.9.2 row 6)`: no match for `/const listPage = parseListPage\(\{ page, pageSize \}\)/`
- `the PM page goes back to maintenance, has no icon in its title, and its edit link keeps the page (spec 2B I25, B4)`: no match for the `<PageHeader …` regex

- [ ] **Step 3: Lower the guard row of the page (the failing guard)**

Run: `node <temp>/p2b-budget.mjs D/maintenance/pm/page.tsx LH1=1:0 --migrated`
Expected (exit 0):
```
LH1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/maintenance/pm/page.tsx
```

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 45 · fail 2`: LFG `LH1` (`LH1: 28 in 28 files` with Tasks 1–12 in; only `src/app/[locale]/(dashboard)/maintenance/pm/page.tsx: 1 > 0` listed) and `L0` (`LH1 src/app/[locale]/(dashboard)/maintenance/pm/page.tsx: 1 > 0`).

- [ ] **Step 4: The pure helper (`src/lib/preventive-maintenance.ts`, CRLF)**

One exact replacement between `summarizeMaintenancePlans` and the private `startOfDay`.

Replace:

```ts
  return summary
}

function startOfDay(value: Date | string) {
```

with:

```ts
  return summary
}

// The order of the PM plan list: active plans first, then paused, then ended, then any other state by name. The
// database allows only these three (the planState CHECK of 2026-07-14), so "any other" is a guard, not a case.
const maintenancePlanStateOrder = ["active", "paused", "ended"] as const

export type MaintenancePlanStateCount = { planState: string; count: number }
export type MaintenancePlanStatePageSlice = { planState: string; skip: number; take: number }

// One page of the PM list (skip and take over the whole list in state order) as one findMany window per state, so
// every state is read with its own where and the list keeps its order across pages (spec 2B §5.9.2 row 6). States
// without plans give no slice, and a page past the end gives none at all. Pure, so tests import it.
export function planStatePageSlices(
  counts: readonly MaintenancePlanStateCount[],
  pageWindow: { skip: number; take: number },
): MaintenancePlanStatePageSlice[] {
  const order: readonly string[] = maintenancePlanStateOrder
  const rank = (state: string) => (order.includes(state) ? order.indexOf(state) : order.length)
  const byName = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0)
  const states = counts
    .filter((row) => row.count > 0)
    .sort((left, right) => rank(left.planState) - rank(right.planState) || byName(left.planState, right.planState))
  const slices: MaintenancePlanStatePageSlice[] = []
  let skip = Math.max(0, pageWindow.skip)
  let take = Math.max(0, pageWindow.take)
  for (const { planState, count } of states) {
    if (take === 0) break
    if (skip >= count) {
      skip -= count
      continue
    }
    const rows = Math.min(count - skip, take)
    slices.push({ planState, skip, take: rows })
    take -= rows
    skip = 0
  }
  return slices
}

function startOfDay(value: Date | string) {
```

`filter` makes a new array, so `sort` never reorders the caller's counts (the first test checks it). The parameter is `pageWindow`, not `window`, so it does not shadow the browser global.

Run: `node --test tests/list-pagination.test.ts tests/preventive-maintenance.test.ts tests/pm-due-dates.test.ts`
Expected: PASS, `tests 17 · pass 17 · fail 0` (list-pagination 9, preventive-maintenance 3, pm-due-dates 5).

- [ ] **Step 5: Move the page onto the paged query and the primitives (`src/app/[locale]/(dashboard)/maintenance/pm/page.tsx`, CRLF)**

Two exact replacements; together they cover the whole file except the blank line between them. Make both before you compile.

(1) Imports, the props type with `searchParams`, the page state and `listHref`, the counts per state, the windows, the redirect and the range. `Breadcrumbs` and `CalendarClock` go with the old header; `planStateOrder` goes with the JS sort.

Replace:

```tsx
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { CalendarClock, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { formatDate } from "@/lib/utils"
import { getMaintenancePlanDueState } from "@/lib/preventive-maintenance"
import type { MaintenancePlanState } from "@/lib/maintenance-plan-service"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import { MaintenancePlanStateActions } from "@/components/maintenance/maintenance-plan-state-actions"

type Props = { params: Promise<{ locale: string }> }

const planStateOrder: Record<string, number> = { active: 0, paused: 1, ended: 2 }

export default async function MaintenancePlansPage({ params }: Props) {
  const { locale } = await params
  const user = await requirePagePermission(locale, "maintenance", "view")
  const canCreate = hasPermission(user, "maintenance", "create")
  const canEdit = hasPermission(user, "maintenance", "edit")
  const t = await getTranslations("maintenancePage")
  const tRecord = await getTranslations("repairRecord")
  const tCommon = await getTranslations("common")
  const now = new Date()
  const plans = (await prisma.maintenancePlan.findMany({
    include: {
      asset: { select: { assetTag: true, name: true } },
      vendor: { select: { code: true, name: true } },
    },
    orderBy: { nextDueDate: "asc" },
    take: 500,
  })).sort((left, right) => (planStateOrder[left.planState] ?? 3) - (planStateOrder[right.planState] ?? 3))
```

with:

```tsx
import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { formatDate } from "@/lib/utils"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, appendListPage, lastListPage, listPageWindow, parseListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import { getMaintenancePlanDueState, planStatePageSlices } from "@/lib/preventive-maintenance"
import type { MaintenancePlanState } from "@/lib/maintenance-plan-service"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { ContentPanel, ContentPanelRows } from "@/components/ui/content-panel"
import { DataTableFoot } from "@/components/ui/data-table"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { StatusBadge } from "@/components/ui/status-badge"
import { MaintenancePlanStateActions } from "@/components/maintenance/maintenance-plan-state-actions"

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string | string[]; pageSize?: string | string[] }>
}

export default async function MaintenancePlansPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { page, pageSize } = await searchParams
  const user = await requirePagePermission(locale, "maintenance", "view")
  const canCreate = hasPermission(user, "maintenance", "create")
  const canEdit = hasPermission(user, "maintenance", "edit")
  const t = await getTranslations("maintenancePage")
  const tRecord = await getTranslations("repairRecord")
  const tCommon = await getTranslations("common")
  const now = new Date()
  const listPage = parseListPage({ page, pageSize })
  const basePath = `/${locale}/maintenance/pm`
  // The list URL with its page and page size; the default page and page size stay out of it (spec 2B B4).
  const listHref = (next: { page?: number; pageSize?: number }) => {
    const query = appendListPage(new URLSearchParams(), next).toString()
    return query ? `${basePath}?${query}` : basePath
  }
  const planListReturnHref = listHref(listPage)

  // Active plans first, then paused, then ended, each by next due date, across every page (spec 2B §5.9.2 row 6).
  // The count per state places the page's window in the states it covers: usually one findMany, at most three.
  const stateCounts = await prisma.maintenancePlan.groupBy({ by: ["planState"], _count: { _all: true } })
  const total = stateCounts.reduce((sum, row) => sum + row._count._all, 0)
  const slices = planStatePageSlices(
    stateCounts.map((row) => ({ planState: row.planState, count: row._count._all })),
    listPageWindow(listPage),
  )
  const plans = (
    await Promise.all(
      slices.map((slice) =>
        prisma.maintenancePlan.findMany({
          where: { planState: slice.planState },
          include: {
            asset: { select: { assetTag: true, name: true } },
            vendor: { select: { code: true, name: true } },
          },
          orderBy: [{ nextDueDate: "asc" }, { id: "asc" }],
          skip: slice.skip,
          take: slice.take,
        }),
      ),
    )
  ).flat()
  // A page past the last one (an old or hand-typed link) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listPage.pageSize)
  if (plans.length === 0 && total > 0 && listPage.page > lastPage) {
    redirect(listHref({ page: lastPage, pageSize: listPage.pageSize }))
  }
  const { start, end, totalPages } = paginationRange(listPage.page, listPage.pageSize, total)
```

(2) The page from `return` to its end: the header with the back link, the panel rows, the row buttons, the edit link with `returnTo`, and the pager at the end of the panel.

Replace:

```tsx
  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: tRecord("title"), href: `/${locale}/maintenance` }, { label: t("pmTitle") }]} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <CalendarClock className="h-6 w-6 text-primary" />{t("pmTitle")}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("pmSubtitle")}</p>
        </div>
        {canCreate ? (
          <Link href={`/${locale}/maintenance/pm/new`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
            <Plus className="h-4 w-4" />{t("pmCreateTitle")}
          </Link>
        ) : null}
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        {plans.length === 0 ? (
          <div className="p-4">
            <ActionEmptyState title={t("pmEmptyTitle")} description={t("pmEmptyHelp")} />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {plans.map((plan) => {
              const isActivePlan = plan.planState === "active"
              const dueState = getMaintenancePlanDueState(plan.nextDueDate, now)
              const dueTone = dueState === "overdue" ? "danger" : dueState === "due_soon" ? "warning" : "primary"
              return (
                <li key={plan.id} className="grid min-w-0 gap-3 px-4 py-3 md:grid-cols-[minmax(220px,1fr)_minmax(200px,260px)_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">{plan.title}</div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">{plan.planNo} · {plan.asset.assetTag} - {plan.asset.name}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div>{t("pmNextDueDate")}: {formatDate(plan.nextDueDate)}</div>
                    <div className="mt-1">{t("pmExternalProvider")}: {plan.vendor ? `${plan.vendor.code} - ${plan.vendor.name}` : t("pmNoExternalProvider")}</div>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-2 md:justify-end">
                    {isActivePlan ? <StatusBadge label={t(`pmDueState.${dueState}`)} tone={dueTone} /> : null}
                    <StatusBadge label={t(`pmFrequencies.${plan.frequency}`)} tone="muted" />
                    <StatusBadge label={t(`pmPlanStates.${plan.planState}`)} tone={isActivePlan ? "success" : plan.planState === "paused" ? "warning" : "muted"} />
                    {canCreate && isActivePlan ? (
                      <Link href={`/${locale}/maintenance/new?planId=${plan.id}`} className="inline-flex min-h-11 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary-hover">
                        {tRecord("pmRecordDone")}
                      </Link>
                    ) : null}
                    {canEdit && plan.planState !== "ended" ? (
                      <Link href={`/${locale}/maintenance/pm/${plan.id}/edit`} className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-3 text-xs font-medium hover:bg-accent">
                        {tCommon("edit")}
                      </Link>
                    ) : null}
                    {canEdit ? <MaintenancePlanStateActions planId={plan.id} state={plan.planState as MaintenancePlanState} /> : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
```

with:

```tsx
  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: tRecord("title"), href: `/${locale}/maintenance` }, { label: t("pmTitle") }]}
        title={t("pmTitle")}
        meta={t("pmSubtitle")}
        back={<PageBackLink href={`/${locale}/maintenance`} label={tCommon("back")} />}
        actions={
          canCreate ? (
            <Link href={`/${locale}/maintenance/pm/new`} className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden="true" />
              {t("pmCreateTitle")}
            </Link>
          ) : undefined
        }
      />

      <ContentPanel divided flush className="overflow-hidden">
        {plans.length === 0 ? (
          <div className="p-4">
            <ActionEmptyState title={t("pmEmptyTitle")} description={t("pmEmptyHelp")} />
          </div>
        ) : (
          <ContentPanelRows>
            {plans.map((plan) => {
              const isActivePlan = plan.planState === "active"
              const dueState = getMaintenancePlanDueState(plan.nextDueDate, now)
              const dueTone = dueState === "overdue" ? "danger" : dueState === "due_soon" ? "warning" : "primary"
              return (
                <li key={plan.id} className="grid min-w-0 gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(200px,260px)_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">{plan.title}</div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      <span className="tag">{plan.planNo}</span> · <span className="tag">{plan.asset.assetTag}</span> - {plan.asset.name}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div>{t("pmNextDueDate")}: {formatDate(plan.nextDueDate)}</div>
                    <div className="mt-1">{t("pmExternalProvider")}: {plan.vendor ? <><span className="tag">{plan.vendor.code}</span> - {plan.vendor.name}</> : t("pmNoExternalProvider")}</div>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-2 md:justify-end">
                    {isActivePlan ? <StatusBadge label={t(`pmDueState.${dueState}`)} tone={dueTone} /> : null}
                    <StatusBadge label={t(`pmFrequencies.${plan.frequency}`)} tone="muted" />
                    <StatusBadge label={t(`pmPlanStates.${plan.planState}`)} tone={isActivePlan ? "success" : plan.planState === "paused" ? "warning" : "muted"} />
                    {canCreate && isActivePlan ? (
                      <Link href={`/${locale}/maintenance/new?planId=${plan.id}`} className={buttonVariants({ size: "sm" })}>
                        {tRecord("pmRecordDone")}
                      </Link>
                    ) : null}
                    {canEdit && plan.planState !== "ended" ? (
                      <Link href={appendOperationalReturnTo(`/${locale}/maintenance/pm/${plan.id}/edit`, planListReturnHref)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                        {tCommon("edit")}
                      </Link>
                    ) : null}
                    {canEdit ? <MaintenancePlanStateActions planId={plan.id} state={plan.planState as MaintenancePlanState} /> : null}
                  </div>
                </li>
              )
            })}
          </ContentPanelRows>
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
```

Check: `grep -n "take: [0-9]\|\.sort(\|CalendarClock\|<h1\|Breadcrumbs\|function " "src/app/[locale]/(dashboard)/maintenance/pm/page.tsx"` prints one line, `29:export default async function MaintenancePlansPage({ params, searchParams }: Props) {`.

- [ ] **Step 6: Run the tests for this task**

Run: `node --test tests/list-pagination.test.ts tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/pm-plans-ui.test.ts tests/maintenance-plan-routes.test.ts tests/breadcrumbs-ui.test.ts tests/preventive-maintenance.test.ts tests/pm-due-dates.test.ts tests/mobile-field-navigation.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `fail 0`, with list-pagination 9, pm-plans-ui 3, maintenance-plan-routes 3, breadcrumbs-ui 4, preventive-maintenance 3, pm-due-dates 5, mobile-field-navigation 7, list-frame-guards 21, visual-foundation-guards 26, form-migration-guards 23, and 2 tests more in `list-pages-ui` than after Task 12.

Run: `node <temp>/p2b1-precheck.mjs --file D/maintenance/pm/page.tsx` then `node <temp>/p2b1-precheck.mjs --budgets`
Expected: `· in MIGRATED_LIST_FILES`, `LH1        0       0     0     1` and `args    (no row holds this file)`; then exit 0 with `LH1 BUDGETS.LH1  27 in 27 rows` (Tasks 1–12 in) and `budgets hold: no live count is over its row`.

- [ ] **Step 7: Prove every class compiles**

Run: `node <temp>/p2b2-tw-probe.mjs "src/app/[locale]/(dashboard)/maintenance/pm/page.tsx"`
Expected: `checked 20 classes, missing 0`. No class is new to `src`.

- [ ] **Step 8: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail and 5 more tests than before Step 2 (3 in `list-pagination`, 2 in `list-pages-ui`).
- `npx tsc --noEmit`: no errors (the `groupBy` rows type `planState` as `string` and `_count._all` as `number`; `searchParams` has `page` and `pageSize`).
- `npm run lint`: 0 errors and no new warning (`npx eslint "src/app/[locale]/(dashboard)/maintenance/pm/page.tsx" src/lib/preventive-maintenance.ts tests/list-pagination.test.ts tests/list-pages-ui.test.ts` prints nothing).

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 5 files: the page 104 insertions and 39 deletions, `src/lib/preventive-maintenance.ts` 37 insertions, `tests/list-pagination.test.ts` 37 insertions, `tests/list-pages-ui.test.ts` 28 insertions, `tests/list-frame-guards.test.ts` 1 and 1. The page stays CRLF (`164 164`) and the helper file too (`136 136`).

- [ ] **Step 9: Commit**

```bash
git add "src/app/[locale]/(dashboard)/maintenance/pm/page.tsx" src/lib/preventive-maintenance.ts tests/list-pagination.test.ts tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): PM plans paged on the server by state, as panel rows with a back link (2B-2 task 13, B4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 5 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 2B-2 dev-app check (Task 18, spec §8.6 row `/th/maintenance/pm`):** `/th/maintenance/pm` at 1440, 768 and 375:
- the header: "กลับ" goes to `/th/maintenance` (a 44px arrow at 375, NVDA reads "กลับ"); the crumbs stay above the title; no icon in the title; "เพิ่มแผน PM" last in the row
- the order: active plans first by next due date, then paused, then ended, as in the Task 0 screenshot; with more than 25 plans, page 2 continues where page 1 stopped (the last plan of page 1 and the first of page 2 follow the same order); with 25 or fewer, `?page=2` lands on `/th/maintenance/pm`
- the footer: total = the number of plans; 25/50/100; words-only buttons; `?page=99` lands on the last page
- rows: soft lines, codes monospace; "บันทึกว่าทำแล้ว" 32 at 1440 and 44 at 375; "แก้ไข" from page 2 opens the edit page with `returnTo` holding `page=2`; pause and end open their dialogs, Cancel closes them, save nothing
- at 375 the bottom navigation is still there (a list route, FMG GL2)
- the load time on dev against the Task 0 number (one `groupBy`, then one to three `findMany`, where the old page read up to 500 plans at once); note anything slow in the Task 18 findings, add no index

---

### Task 14: The PM edit page goes back to the list page it came from (B4 `returnTo`, §5.9.2 row 6)

Spec §5.9.2 row 6 column `returnTo`, §5.9.1 bullet `returnTo`, §5.14 row `tests/operational-return-navigation.test.ts` (the `"maintenance-pm"` cases) and `tests/pm-plans-ui.test.ts:17`, §4.5 row 18 (the edit page's `PageBackLink`, 2B-1), rulings B4, I17, I22 and controller rulings (a) and (i). One commit across three source files: the section, the page that reads it and the form prop are one behavior, and the prop has no other caller. `src/lib/operational-return-navigation.ts` is LF; the edit page and the form are CRLF.

Rulings this task applies:
- **Ruling (a):** this task is in scope although spec §8.6 lists 18 files: §10.1 (B4) says `returnTo` carries the page and page size, §5.9.2 row 6 gives this design, `c/maintenance/maintenance-plan-form.tsx` is a 2C batch 1a file that 2C plan 1 already migrated, and no 2C plan is open during 2B-2 (R-e). The form gets one optional prop and nothing else; FMG stays green and is not edited.
- **§5.9.2 row 6:** `operationalReturnPaths` gains the section `"maintenance-pm"` (`` `/${locale}/maintenance/pm` ``). `normalizeInternalReturnTo` compares the pathname exactly and keeps `url.search`, so `/th/maintenance/pm?page=2&pageSize=50` comes back whole, and anything else (another page, another site, another locale) falls back to the PM list. The section is inserted right after `"audit-findings"`, so the edit holds whatever Task 5 added to the file.
- **The edit page:** it reads `searchParams` (`Promise<{ returnTo?: string | string[] }>`, the shape of `D/maintenance/[id]/page.tsx:22`) and sets `const returnTo = normalizeOperationalReturnTo(locale, "maintenance-pm", rawSearchParams.returnTo)` in place of the fixed `` `/${locale}/maintenance/pm` ``. The name `returnTo` stays, so the crumb (`href: returnTo`) and `<PageBackLink href={returnTo} …>` that `tests/form-frames-ui.test.ts:76-82` pins now follow it unchanged, and the form gets `returnHref={returnTo}`.
- **The form:** `returnHref = `/${locale}/maintenance/pm`` as a destructuring default (spec "ค่าตั้งต้น `/${locale}/maintenance/pm`") and `router.push(returnHref)` after a save. `pm/new` passes nothing, so creating a plan still lands on the PM list (page 1, where a new plan is found by its state and due date like any other). `tests/pm-plans-ui.test.ts:17` pinned the literal push; it now checks the default and the push (§10.4 table A row 2B-2). That file reads the form with `\r`, so the new regexes hold no `\n`.
- **I17, ruling (i):** the return-navigation pins are appended to, never shortened: `tests/operational-return-navigation.test.ts` gets one block at its end (the 6 `normalizeOperationalReturnTo` cases and the edit page and form text). The block imports the helper with `await import(…)` inside its test, so it does not touch the import lines at the top that Task 5 may have changed.
- **I22:** nothing else follows `returnTo` in this task (`maintenance/new` still takes only `/maintenance`).
- **No new class:** the three files gain no class string, so there is no Tailwind probe in this task (the probe would only report the `"maintenance-pm"` literal as a class).
- **LFG:** the edit page is already in `MIGRATED_LIST_FILES` (2B-1 Task 22) and stays at 0 for every guard; the form and the helper hold no row. No budget changes.

What users will see on `/th/maintenance/pm/<id>/edit`:
- Opened from page 2 (or page size 50) of the PM list, "กลับ", the crumb "แผนบำรุงรักษาตามรอบ (PM)" and a successful "บันทึก" all go back to that page and page size. Before, they always went to page 1.
- Opened any other way, they go to the PM list as before.

Not in this task: `pm/new` and `maintenance/new` (I22), the form's fields, look and validation, `MaintenancePlanStateActions`, messages, docs (Task 19).

**Files:**
- Modify: `src/lib/operational-return-navigation.ts` (`i/lf w/lf`; 1 exact replacement)
- Modify: `src/app/[locale]/(dashboard)/maintenance/pm/[id]/edit/page.tsx` (`i/lf w/crlf`; 2 exact replacements)
- Modify: `src/components/maintenance/maintenance-plan-form.tsx` (`i/lf w/crlf`; 2 exact replacements; 2C batch 1a, ruling (a))
- Modify: `tests/pm-plans-ui.test.ts` (`i/lf w/crlf`; 1 exact replacement)
- Modify: `tests/operational-return-navigation.test.ts` (`i/lf w/crlf`; one block appended)
- Temp folder only: `t14-return-block.ts`; Task 12's `p2b2-t12-precheck.mjs` and `p2b2-append-t12.mjs`

**Must keep passing without edits:**
- `tests/form-frames-ui.test.ts` (the three maintenance create and edit headers, `:72-83`: `breadcrumbs={[{ label: t("pmTitle"), href: returnTo }, …]}`, `back={<PageBackLink href={returnTo} label={tCommon("back")} />}`, no `next/link`, no `cancel`)
- `tests/breadcrumbs-ui.test.ts` (`maintenance/pm/[id]/edit/page.tsx` ends on `plan.planNo` with `code: true`)
- `tests/form-migration-guards.test.ts` (whole file, never edited: the form keeps its 4 `required`, 2 `maxLength`, `busy` save button, no `Loader2`; GF5 floors `[4, 2, 0]`)
- `tests/pm-plans-ui.test.ts` tests 1 and 3, `tests/maintenance-i18n.test.ts`, `tests/maintenance-option-select.test.ts`, `tests/field-primitives.test.ts`
- `tests/operational-return-navigation.test.ts`: every test already there, including `:42` (`normalizeOperationalReturnTo(locale, "disposal", rawSearchParams.returnTo)`, I22) and whatever Tasks 5, 8 and 11 appended
- `tests/mobile-field-navigation.test.ts` (`/th/maintenance/pm/plan-1/edit` is still a focus route), `tests/list-frame-guards.test.ts` (L0 for the edit page)

**Interfaces:**
- Consumes:
  - Task 13: the PM list's edit links `` appendOperationalReturnTo(`/${locale}/maintenance/pm/${plan.id}/edit`, planListReturnHref) ``.
  - `normalizeOperationalReturnTo(locale: string, section: OperationalReturnSection, value: string | string[] | undefined): string` from `@/lib/operational-return-navigation` (relative `../src/lib/operational-return-navigation.ts` in tests).
  - `MaintenancePlanForm({ locale, initialAsset?, planId?, initialValues? })` from `@/components/maintenance/maintenance-plan-form`; `PageHeader`/`PageBackLink` as the edit page has them.
- Produces:
  - `OperationalReturnSection` includes `"maintenance-pm"`.
  - `MaintenancePlanForm` takes `returnHref?: string` (default `` `/${locale}/maintenance/pm` ``); the edit page passes its normalized `returnTo`.
  - `tests/operational-return-navigation.test.ts`: 2 tests appended; `tests/pm-plans-ui.test.ts` test 2 checks the default and the push.

| guard | change |
|---|---|
| LFG, VFG | none (the edit page stays in `MIGRATED_LIST_FILES` at 0; the form and the helper hold no row) |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b2-t12-precheck.mjs 14`
Expected: `git status` prints nothing. The script prints the eleven shared `ok` lines, then:
```
ok      Task 13 is in: the PM list's edit link carries planListReturnHref
ok      src/lib/operational-return-navigation.ts is LF, holds the audit-findings line once and no maintenance-pm section
ok      src/app/[locale]/(dashboard)/maintenance/pm/[id]/edit/page.tsx is CRLF and unchanged since e3f20ce (hash 30eeec7b6455535a)
ok      src/components/maintenance/maintenance-plan-form.tsx is CRLF and unchanged since e3f20ce (hash 16babf0eedfddbd5)
ok      tests/pm-plans-ui.test.ts is unchanged since e3f20ce
ok      tests/operational-return-navigation.test.ts has no maintenance-pm case yet
```
five `info` lines (`LF` for the helper, `CRLF` for the other four; the hashes of the helper and of `tests/operational-return-navigation.test.ts` depend on Tasks 5, 8 and 11) and `preconditions hold for Task 14`. On any `MISSING` line, stop and report it.

Run: `node <temp>/p2b1-precheck.mjs --file "D/maintenance/pm/[id]/edit/page.tsx"` then `node <temp>/p2b1-precheck.mjs --file c/maintenance/maintenance-plan-form.tsx`
Expected (exit 0 both): the edit page `· in MIGRATED_LIST_FILES` with `LH1        0       0     0     1` and `args    (no row holds this file)`; the form `· not in MIGRATED_LIST_FILES` and `args    (no row holds this file)`.

Run: `git ls-files --eol src/lib/operational-return-navigation.ts "src/app/[[]locale]/(dashboard)/maintenance/pm/[[]id]/edit/page.tsx" src/components/maintenance/maintenance-plan-form.tsx tests/pm-plans-ui.test.ts tests/operational-return-navigation.test.ts`
Expected: `i/lf    w/lf` for the helper and `i/lf    w/crlf` for the other four.

- [ ] **Step 2: Write the failing tests**

(a) `tests/pm-plans-ui.test.ts`, test 2 (`PM plans no longer ask for an internal assignee`). Replace:

```ts
  assert.match(form, /router\.push\(`\/\$\{locale\}\/maintenance\/pm`\)/)
})
```

with:

```ts
  // After a save the form goes to returnHref: the PM list page the edit page came from, else the PM list (2B-2 Task 14).
  assert.match(form, /returnHref = `\/\$\{locale\}\/maintenance\/pm`,/)
  assert.match(form, /router\.push\(returnHref\)/)
})
```

(b) Save this block as `t14-return-block.ts` in your temp folder (the file reads sources with `\r`, so no regex here holds `\n`):

```ts
// Plan 2B-2 Task 14 (spec 2B B4, §5.9.2 row 6, §5.14): the PM edit page goes back to the PM list page and page size
// it was opened from. The helper is pure, so it is imported here; the page and form are read as text (with \r, so no
// regex below holds \n).
test("maintenance-pm returnTo keeps the PM list's page and page size and falls back to the PM list", async () => {
  const { normalizeOperationalReturnTo } = await import("../src/lib/operational-return-navigation.ts")
  assert.equal(normalizeOperationalReturnTo("th", "maintenance-pm", "/th/maintenance/pm?page=2&pageSize=50"), "/th/maintenance/pm?page=2&pageSize=50")
  assert.equal(normalizeOperationalReturnTo("th", "maintenance-pm", ["/th/maintenance/pm?page=3", "/th/maintenance"]), "/th/maintenance/pm?page=3")
  assert.equal(normalizeOperationalReturnTo("th", "maintenance-pm", undefined), "/th/maintenance/pm")
  assert.equal(normalizeOperationalReturnTo("th", "maintenance-pm", "/th/maintenance?page=2"), "/th/maintenance/pm", "the repair-record list is another page")
  assert.equal(normalizeOperationalReturnTo("th", "maintenance-pm", "https://example.com/th/maintenance/pm"), "/th/maintenance/pm", "never another site")
  assert.equal(normalizeOperationalReturnTo("en", "maintenance-pm", "/th/maintenance/pm?page=2"), "/en/maintenance/pm", "the locale is part of the path")
})

test("the PM edit page reads returnTo and the plan form goes there after a save (spec 2B §5.9.2 row 6)", () => {
  const edit = readFileSync("src/app/[locale]/(dashboard)/maintenance/pm/[id]/edit/page.tsx", "utf8")
  const form = readFileSync("src/components/maintenance/maintenance-plan-form.tsx", "utf8")
  assert.match(edit, /searchParams: Promise<\{ returnTo\?: string \| string\[\] \}>/)
  assert.match(edit, /const returnTo = normalizeOperationalReturnTo\(locale, "maintenance-pm", rawSearchParams\.returnTo\)/)
  assert.match(edit, /returnHref=\{returnTo\}/)
  assert.match(form, /returnHref = `\/\$\{locale\}\/maintenance\/pm`,/, "the create page passes nothing and keeps going to the PM list")
  assert.match(form, /router\.push\(returnHref\)/)
})
```

Run: `node <temp>/p2b2-append-t12.mjs <temp>/t14-return-block.ts tests/operational-return-navigation.test.ts`
Expected: `appended <temp>/t14-return-block.ts to tests/operational-return-navigation.test.ts (CRLF)`

Run: `node --test tests/operational-return-navigation.test.ts tests/pm-plans-ui.test.ts`
Expected: FAIL, exactly these 3 (every other test of the two files passes; at `e3f20ce` plus this block the run reads `tests 11 · pass 8 · fail 3`):
- `maintenance-pm returnTo keeps the PM list's page and page size and falls back to the PM list`: `TypeError: operationalReturnPaths[section] is not a function`
- `the PM edit page reads returnTo and the plan form goes there after a save (spec 2B §5.9.2 row 6)`: no match for `/searchParams: Promise<\{ returnTo\?: string \| string\[\] \}>/`
- `PM plans no longer ask for an internal assignee`: no match for `` /returnHref = `\/\$\{locale\}\/maintenance\/pm`,/ ``

- [ ] **Step 3: The section (`src/lib/operational-return-navigation.ts`, LF)**

Replace:

```ts
  "audit-findings": (locale: string) => `/${locale}/audit/findings`,
```

with:

```ts
  "audit-findings": (locale: string) => `/${locale}/audit/findings`,
  // The PM plan list, whose page and page size the edit page carries back (spec 2B B4, §5.9.2 row 6).
  "maintenance-pm": (locale: string) => `/${locale}/maintenance/pm`,
```

- [ ] **Step 4: The form takes where to go after a save (`src/components/maintenance/maintenance-plan-form.tsx`, CRLF, 2C batch 1a)**

Two exact replacements; nothing else in the file changes.

(1) Replace:

```tsx
  planId,
  initialValues,
}: {
  locale: string
  initialAsset?: Option
  planId?: string
  initialValues?: Partial<{
    title: string
    frequency: string
    intervalDays: string
    nextDueDate: string
    vendorId: string
    notes: string
  }>
}) {
```

with:

```tsx
  planId,
  initialValues,
  returnHref = `/${locale}/maintenance/pm`,
}: {
  locale: string
  initialAsset?: Option
  planId?: string
  initialValues?: Partial<{
    title: string
    frequency: string
    intervalDays: string
    nextDueDate: string
    vendorId: string
    notes: string
  }>
  // Where a save goes: the edit page passes the PM list page it was opened from (its returnTo, spec 2B B4).
  returnHref?: string
}) {
```

(2) Replace:

```tsx
      router.push(`/${locale}/maintenance/pm`)
```

with:

```tsx
      router.push(returnHref)
```

- [ ] **Step 5: The edit page reads `returnTo` (`src/app/[locale]/(dashboard)/maintenance/pm/[id]/edit/page.tsx`, CRLF)**

Two exact replacements. The header block between them does not change: it already uses `returnTo` for the crumb and the back link.

(1) Replace:

```tsx
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { toLocalDateInputValue } from "@/lib/local-date"

type Props = {
  params: Promise<{ locale: string; id: string }>
}

export default async function EditMaintenancePlanPage({ params }: Props) {
  const { locale, id } = await params
  await requirePagePermission(locale, "maintenance", "edit")
  const t = await getTranslations("maintenancePage")
  const tCommon = await getTranslations("common")
  const returnTo = `/${locale}/maintenance/pm`
```

with:

```tsx
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { toLocalDateInputValue } from "@/lib/local-date"
import { normalizeOperationalReturnTo } from "@/lib/operational-return-navigation"

type Props = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[] }>
}

export default async function EditMaintenancePlanPage({ params, searchParams }: Props) {
  const { locale, id } = await params
  const rawSearchParams = await searchParams
  await requirePagePermission(locale, "maintenance", "edit")
  const t = await getTranslations("maintenancePage")
  const tCommon = await getTranslations("common")
  // The PM list page and page size the user came from (spec 2B B4, §5.9.2 row 6); any other target is the PM list.
  const returnTo = normalizeOperationalReturnTo(locale, "maintenance-pm", rawSearchParams.returnTo)
```

(2) Replace:

```tsx
      <MaintenancePlanForm
        locale={locale}
        planId={plan.id}
```

with:

```tsx
      <MaintenancePlanForm
        locale={locale}
        planId={plan.id}
        returnHref={returnTo}
```

- [ ] **Step 6: Run the tests for this task**

Run: `node --test tests/operational-return-navigation.test.ts tests/pm-plans-ui.test.ts tests/form-frames-ui.test.ts tests/breadcrumbs-ui.test.ts tests/form-migration-guards.test.ts tests/maintenance-i18n.test.ts tests/maintenance-option-select.test.ts tests/field-primitives.test.ts tests/mobile-field-navigation.test.ts tests/list-frame-guards.test.ts`
Expected: PASS, `fail 0`, with pm-plans-ui 3, form-frames-ui 13, breadcrumbs-ui 4, form-migration-guards 23, maintenance-i18n 4, maintenance-option-select 2, field-primitives 16, mobile-field-navigation 7, list-frame-guards 21, and 2 tests more in `operational-return-navigation` than before Step 2.

Run: `node <temp>/p2b1-precheck.mjs --file "D/maintenance/pm/[id]/edit/page.tsx"` then `node <temp>/p2b1-precheck.mjs --budgets`
Expected: the edit page as in Step 1 (`in MIGRATED_LIST_FILES`, all 0); `budgets hold: no live count is over its row`, totals as after Task 13.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail and 2 more tests than before Step 2.
- `npx tsc --noEmit`: no errors (`"maintenance-pm"` is now an `OperationalReturnSection`, so the test's dynamic import type-checks; the form's default may read `locale`, which comes first in the destructuring).
- `npm run lint`: 0 errors and no new warning (`npx eslint src/lib/operational-return-navigation.ts "src/app/[locale]/(dashboard)/maintenance/pm/[id]/edit/page.tsx" src/components/maintenance/maintenance-plan-form.tsx tests/pm-plans-ui.test.ts tests/operational-return-navigation.test.ts` prints nothing).

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 5 files: `src/lib/operational-return-navigation.ts` 2 insertions, the edit page 7 insertions and 2 deletions, the form 4 and 1, `tests/pm-plans-ui.test.ts` 3 and 1, `tests/operational-return-navigation.test.ts` 23 insertions. Line endings kept: the helper LF (`0 59`: Task 5 added `normalizeDisposalBatchReturnTo`, 8 lines; at `e3f20ce` alone it would be `0 51`), the edit page `53 53`, the form `157 157` (the `node -e` count of Task 12 Step 9).

- [ ] **Step 8: Commit**

```bash
git add src/lib/operational-return-navigation.ts "src/app/[locale]/(dashboard)/maintenance/pm/[id]/edit/page.tsx" src/components/maintenance/maintenance-plan-form.tsx tests/pm-plans-ui.test.ts tests/operational-return-navigation.test.ts
git commit -m "feat(ui): the PM edit page returns to the PM list page it came from (2B-2 task 14, B4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 5 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 2B-2 dev-app check (Task 18, spec §8.6 row `/th/maintenance/pm` and §10.6 row 2B-2 `docs/07_UAT_CHECKLIST.md`):**
- with more than 25 plans: page 2 → "แก้ไข" → "กลับ" lands on page 2 with the same page size; the crumb "แผนบำรุงรักษาตามรอบ (PM)" too; pick 50 first and it stays 50. With 25 or fewer plans, open the edit page with `?returnTo=%2Fth%2Fmaintenance%2Fpm%3FpageSize%3D50` and check that "กลับ" keeps `pageSize=50`
- `/th/maintenance/pm/<id>/edit?returnTo=https%3A%2F%2Fexample.com` and `?returnTo=%2Fth%2Fmaintenance`: "กลับ" goes to `/th/maintenance/pm`
- do not press "บันทึก" on dev (it writes): the save path is pinned by `tests/pm-plans-ui.test.ts` and `tests/operational-return-navigation.test.ts`; Task 18 records it as a human UAT step
- `/th/maintenance/pm/new`: "กลับ" and the crumb go to `/th/maintenance/pm` as before

---

### Task 15: `D/admin/data-quality/page.tsx` header on `PageHeader` and its number boxes as one `StatStrip` (and the helper scripts Tasks 16–17 reuse)

Spec §10.3 bullet 2B-2 and §10.6 row 2B-2, with rulings I12 (this page moved from 2B-5 to 2B-2 because 2C plan 4 edits its `DataQualityRuleForm` labels), §8.6 row 16, §4.4.3 row `D/admin/data-quality/page.tsx`, §4.3.3 (header rules), §5.4 row admin/data-quality, §5.1 (numbers), §3.13 (`StatStrip`) and R-d. One file, one commit. The page is CRLF: edit it with exact-string replacement only.

Rulings this task applies:
- **§4.4.3, §4.3.3:** the hand-written `h1` block becomes `PageHeader` with `title={t("title")}` and `meta={t("subtitle")}`. "เปิดรายงาน" is the one action, an outline `md` link (`buttonVariants({ variant: "outline", size: "md" })`, §4.3.3 rule 5) with no icon, as today. The page root is already `space-y-6`, so the header needs no margin. LFG LH1 drops by 1.
- **§3.13, §5.4, R-d, DS:258:** the three `SummaryCard`s (primary, red/green and grey boxes with an `AlertTriangle`) become one `StatStrip` with the counts through `formatCount`. No cell gets `attention`: `StatStrip` shows attention only on a foot line, and no existing key reads as one (2B-2 adds no key beyond spec §10.2). The rule cards below still carry the severity colors. `SummaryCard`, `summaryClass` and the `AlertTriangle` import go; LFG LS1 drops by 1.
- **§5.1 (numbers):** the rule card count `count.toLocaleString("th-TH")` becomes `formatCount(count)`: the same th-TH digits, and the file has no `toLocaleString` left when it joins `MIGRATED_LIST_FILES`. LV1 does not count this call (it counts bare `toLocaleString()` only), so no row moves for it. The rule cards' tinted frames stay (status fills on cards are 2D).
- **Ruling (labels for Task 16):** the page adds three common words to the review queue's `labels`: `pagination: tCommon("pagination")`, `pageOf: tCommon.raw("pageOf")` and `tableScrollHint: tCommon("tableScrollHint")`, so Task 16 changes only its own file. All three keys exist; no message changes. `pageOf` is passed raw because the client fills `{page}` and `{total}` itself, as it already does for `total` and `scanSuccess` (pinned raw by `tests/asset-state-review-ui.test.ts:37-40`). Until Task 16 the workspace ignores them (its `labels` is `Record<string, string>`).
- **I12, fence (h):** the `<DataQualityRuleForm … />` element and its `labels` object stay byte-for-byte as they are (2C plan 4 adds `severity` there). `p2b2-fence.mjs 15` proves it before the commit. After this commit the element starts at `:150` and its `labels` at `:152` (they were `:144` and `:146`); Task 19 writes the new line numbers into DH for 2C plan 4.
- **Ruling (e):** plans 2B-3…2B-5 never touch this page (spec §8.9 "ห้ามแตะ" names it), so it joins `MIGRATED_LIST_FILES` in this commit. Its `KEEP` is 0 for every guard, and after the edit every count is 0.
- **Ruling (j), I16:** `tests/list-pages-ui.test.ts` gets one "has" test for this page (header, strip, the three labels). The "none left" checks are the LFG rows this commit removes.
- **Ruling (TDD order):** the test and the lowered budgets come first and fail for the stated reasons; then the page changes and everything passes.

What users will see on `/th/admin/data-quality`:
- The title is weight 600 (was bold), with the subtitle under it in the 13px meta line. "เปิดรายงาน" is a 36px outline button at the top right from `md` (44px on phones), top-aligned with the title (it was bottom-aligned).
- The three tinted number boxes become one flat strip with white cells and divider lines. The issue count is no longer in a red or green box. Below 1024px the strip has two columns and the third cell fills its row.
- The rule cards and the rule form look the same.

Not in this task:
- `getRuleCounts`, the queries and `RuleStatusCard` (except its count's formatter)
- the `labels` of `DataQualityRuleForm` and `c/admin/data-quality-rule-form.tsx` (2C plan 4)
- `c/admin/asset-state-review-workspace.tsx` (Task 16); `labels.scanning` keeps being passed (Task 16 stops reading it, K13)
- messages (no key changes), docs (Task 19). Do not run a formatter.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/admin/data-quality/page.tsx` (`i/lf w/crlf`; 5 exact replacements)
- Modify: `tests/list-pages-ui.test.ts` (`i/lf w/crlf`; one block appended through `p2b2-admin-edit.mjs`)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`), through `p2b-budget.mjs` only
- Temp folder only, never committed: `p2b2-t15-precheck.mjs`, `p2b2-admin-edit.mjs`, `p2b2-fence.mjs` (Tasks 16–17 reuse all three), `p2b1-tw-probe.mjs` (the text is plan 2B-1 Task 4's; no earlier task of this plan saves this name: Task 1's `p2b2-tw-probe.mjs` is the same probe under its own name), `t15-pages-block.ts`

**Must keep passing without edits:**
- `tests/asset-state-review-ui.test.ts` (4 tests: `AssetStateReviewWorkspace` in the page; `total: t.raw("assetStateReviews.total")` and `scanSuccess: t.raw("assetStateReviews.scanSuccess")` stay as they are)
- `tests/mobile-field-navigation.test.ts`, `tests/list-primitives-ui.test.ts`, `tests/form-migration-guards.test.ts` (never edited; `data-quality-rule-form.tsx` is a batch 4 file and is not touched), `tests/design-tokens-contrast.test.ts`, `tests/thai-glossary.test.ts`, `tests/messages-parity.test.ts`
- `tests/list-frame-guards.test.ts` and `tests/visual-foundation-guards.test.ts`: every row of the other files

**Interfaces:**
- Consumes:
  - 2B-1: `PageHeader({ title, meta?, actions?, back?, breadcrumbs?, compactOnMobile?, className? })` from `@/components/ui/page-header` (`title`, `meta`, `actions`, `back`: `ReactNode`).
  - 2B-1: `StatStrip({ items, className? }: { items: readonly StatStripItem[]; className?: string })` with `StatStripItem = { key: string; label: string; value: string; unit?: string; foot?: React.ReactNode; footTitle?: string; href?: string; current?: boolean; scroll?: boolean; attention?: boolean }` from `@/components/ui/stat-strip`.
  - 2A: `buttonVariants({ variant, size })` from `@/components/ui/button-variants`; `formatCount(value: number): string` from `@/lib/display-format`.
  - next-intl: `getTranslations("common")` and its `.raw(key)` (the page already calls `t.raw`).
  - keys `common.pagination` ("การแบ่งหน้า"), `common.pageOf` ("หน้า {page} จาก {total}"), `common.tableScrollHint`.
  - Task 0: `<temp>/p2b1-precheck.mjs` (`--file`, `--budgets`) and `<temp>/p2b-budget.mjs`.
- Produces:
  - The review queue's `labels` holds `pagination`, `pageOf` (raw, with `{page}` and `{total}`) and `tableScrollHint`; Task 16 reads them.
  - LFG: `BUDGETS.LH1` and `BUDGETS.LS1` hold no row of the page; `MIGRATED_LIST_FILES` holds it.
  - `tests/list-pages-ui.test.ts`: the test `data quality: PageHeader with the reports link, …`.
  - `<temp>/p2b2-t15-precheck.mjs <15|16|17>`, `<temp>/p2b2-admin-edit.mjs append|insert …`, `<temp>/p2b2-fence.mjs <15|16|17>`, `<temp>/p2b1-tw-probe.mjs <file> …`.

| guard | `D/admin/data-quality/page.tsx` before → after | plan total before → after (when Tasks 1–14 reached their numbers) |
|---|---|---|
| LFG LH1 | 1 → – | 27 → 26 |
| LFG LS1 | 1 → – | 18 → 17 |
| `MIGRATED_LIST_FILES` | – → joins | +1 |

- [ ] **Step 1: Check what this task builds on (and save the helper scripts)**

Save these four scripts in your temp folder (never in the repo). Tasks 16 and 17 run the same scripts with their own number.

`<temp>/p2b2-t15-precheck.mjs`:

```js
// p2b2-t15-precheck.mjs: run from the repo root before Task 15, 16 or 17 of plan 2B-2. Reads only; writes nothing.
// Usage: node p2b2-t15-precheck.mjs <15|16|17>. Never commit this file.
// Confirms that the 2B-1 parts these tasks use are in with the props the tasks pass, that the task's file still holds
// the e3f20ce text the old snippets quote (a hash of its text with \r stripped) with its line endings, that the 2C files
// next to it have not changed, and that the test files hold the lines of the earlier tasks of this group only.
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"

const task = process.argv[2]
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
const unchangedSince = (commit, paths) => {
  try {
    execFileSync("git", ["diff", "--quiet", commit, "--", ...paths])
    return true
  } catch {
    return false
  }
}
const ui = (name) => read(`${C}ui/${name}`)
const messages = (locale) => JSON.parse(read(`messages/${locale}.json`))

// The files in task order, their e3f20ce line endings, their LF text hash at e3f20ce (= d38a0ee) and the title of the
// test each task appends to tests/list-pages-ui.test.ts.
const TASKS = {
  15: { path: `${D}admin/data-quality/page.tsx`, eol: "CRLF", hash: "326661dae541da1c", test: "data quality: PageHeader with the reports link" },
  16: { path: `${C}admin/asset-state-review-workspace.tsx`, eol: "CRLF", hash: "da303558645e8468", test: "data quality review queue: FilterSelect, DataTable" },
  17: { path: `${D}admin/integrations/page.tsx`, eol: "mixed", hash: "6ed665b2206a79c7", test: "integrations: the header is PageHeader" },
}
const current = TASKS[task]
if (!current) {
  console.error("usage: node p2b2-t15-precheck.mjs <15|16|17>")
  process.exit(2)
}
const earlier = Object.entries(TASKS).filter(([number]) => Number(number) < Number(task)).map(([, entry]) => entry)
const pagesTest = read("tests/list-pages-ui.test.ts")
const filtersTest = read("tests/list-filters-ui.test.ts")
const lfg = read("tests/list-frame-guards.test.ts")
const dataTable = ui("data-table.tsx")
const lfgEntry = (path) => (path.startsWith(D) ? "`${D}" + path.slice(D.length) + "`," : "`${C}" + path.slice(C.length) + "`,")
const SHARED_2C = [`${C}admin/data-quality-rule-form.tsx`, `${C}admin/asset-state-review-dialog.tsx`, `${C}admin/IntegrationClientManager.tsx`, "tests/form-migration-guards.test.ts"]

const checks = {
  "2B-1: PageHeader": /export function PageHeader\(/.test(ui("page-header.tsx")),
  "2B-1: StatStrip with value: string": /export function StatStrip\(/.test(ui("stat-strip.tsx")) && /\n  value: string\n/.test(ui("stat-strip.tsx")),
  "2B-1: DataTable (framed, minWidth, scrollHint) and its parts, DataTableRow and DataTableFoot among them":
    ["DataTable", "DataTableHeader", "DataTableBody", "DataTableHead", "DataTableRow", "DataTableCell", "DataTableFoot"].every((name) => new RegExp(`export function ${name}\\(`).test(dataTable)) &&
    /framed\?: boolean/.test(dataTable) && /minWidth\?: number/.test(dataTable) && /scrollHint\?: string/.test(dataTable) && /sticky\?: "left" \| "right"/.test(dataTable),
  "2B-1: FilterSelect (options, allLabel, select props)": /export function FilterSelect\(\{ label, options, allLabel,/.test(ui("filter-select.tsx")),
  "2A: Button busy, ActionEmptyState, formatCount": /busy\?: boolean/.test(ui("button.tsx")) && /export function ActionEmptyState\(/.test(ui("action-empty-state.tsx")) && /export function formatCount\(/.test(read("src/lib/display-format.ts")),
  "common.pagination, common.pageOf ({page}, {total}) and common.tableScrollHint in th and en": ["th", "en"].every((locale) => {
    const common = messages(locale).common ?? {}
    return typeof common.pagination === "string" && /\{page\}/.test(common.pageOf ?? "") && /\{total\}/.test(common.pageOf ?? "") && typeof common.tableScrollHint === "string"
  }),
  [`${current.path} is ${current.eol} and unchanged since e3f20ce (hash ${current.hash})`]: eol(current.path) === current.eol && hash(current.path) === current.hash,
  [`${current.path} is not in MIGRATED_LIST_FILES yet`]: !lfg.includes(lfgEntry(current.path)),
  "the 2C files beside these pages and FMG are unchanged since e3f20ce": unchangedSince("e3f20ce", SHARED_2C),
  "tests/list-pages-ui.test.ts holds the tests of the earlier tasks of this group only":
    earlier.every((entry) => pagesTest.includes(`test("${entry.test}`)) && !pagesTest.includes(`test("${current.test}`),
  ...(task === "16"
    ? {
        "Task 15: the data-quality page passes pagination, pageOf and tableScrollHint to the workspace": /pagination: tCommon\("pagination"\),\n\s+pageOf: tCommon\.raw\("pageOf"\),\n\s+tableScrollHint: tCommon\("tableScrollHint"\),/.test(read(`${D}admin/data-quality/page.tsx`)),
        "tests/list-filters-ui.test.ts: MIGRATED_FILTER_FILES does not hold the workspace yet": /const MIGRATED_FILTER_FILES = \[/.test(filtersTest) && !filtersTest.includes(`"${C}admin/asset-state-review-workspace.tsx",`),
      }
    : {}),
}

let missing = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok     " : "MISSING"} ${name}`)
  if (!ok) missing += 1
}
for (const path of [current.path, "tests/list-pages-ui.test.ts", "tests/list-frame-guards.test.ts", ...(task === "16" ? ["tests/list-filters-ui.test.ts", "tests/visual-foundation-guards.test.ts"] : [])]) {
  console.log(`info    ${path}: ${eol(path)}`)
}
if (hash(current.path) !== current.hash) console.log(`info    ${current.path} hash is ${hash(current.path)}`)
if (missing > 0) {
  console.error(`ABORT: ${missing} precondition(s) failed. Do not start Task ${task}; report which.`)
  process.exit(1)
}
console.log(`preconditions hold for Task ${task}`)
```

`<temp>/p2b2-admin-edit.mjs` (the test files are CRLF in the working tree; this keeps them so):

```js
// p2b2-admin-edit.mjs: run from the repo root (plan 2B-2 Tasks 15–17). Never commit this file.
//   node p2b2-admin-edit.mjs append <block-file> <target>
//       Appends the block (written with \n, starting with one blank line) to the end of <target>.
//   node p2b2-admin-edit.mjs insert <target> <const-name> <line>
//       Inserts <line> before the "]" line that closes `const <const-name> = [` in <target>.
// Both keep the target's line endings (CRLF when every line break is CRLF, LF when none is; a mixed file is refused),
// refuse text that is already there, and write nothing on any problem.
import { readFileSync, writeFileSync } from "node:fs"

const [mode, ...args] = process.argv.slice(2)
const fail = (message) => {
  console.error(`ABORT, nothing written: ${message}`)
  process.exit(1)
}
const load = (path) => {
  const raw = readFileSync(path, "utf8")
  const crlf = (raw.match(/\r\n/g) ?? []).length
  const lf = (raw.match(/\n/g) ?? []).length
  if (crlf !== 0 && crlf !== lf) fail(`${path} has mixed line endings`)
  if (!raw.endsWith("\n")) fail(`${path} does not end with a line break`)
  return { raw, eol: crlf ? "\r\n" : "\n", text: raw.replace(/\r\n/g, "\n") }
}

if (mode === "append") {
  const [blockFile, target] = args
  if (!blockFile || !target) fail("usage: append <block-file> <target>")
  const block = readFileSync(blockFile, "utf8").replace(/\r\n/g, "\n")
  if (!block.startsWith("\n")) fail(`${blockFile} must start with one blank line`)
  const body = block.replace(/^\n+/, "").replace(/\n*$/, "\n")
  const doc = load(target)
  const firstLine = body.split("\n")[0]
  if (doc.text.includes(firstLine)) fail(`${target} already holds "${firstLine}"`)
  writeFileSync(target, doc.raw + ("\n" + body).replace(/\n/g, doc.eol))
  console.log(`appended ${blockFile} to ${target} (${doc.eol === "\r\n" ? "CRLF" : "LF"})`)
} else if (mode === "insert") {
  const [target, name, line] = args
  if (!target || !name || !line) fail("usage: insert <target> <const-name> <line>")
  const doc = load(target)
  const lines = doc.text.split("\n")
  const start = lines.findIndex((text) => new RegExp(`^const ${name}\\b[^=]*= \\[\\s*$`).test(text))
  if (start === -1) fail(`no line "const ${name} = [" in ${target}`)
  const end = lines.findIndex((text, index) => index > start && /^\]\s*$/.test(text))
  if (end === -1) fail(`no closing "]" for ${name} in ${target}`)
  if (lines.slice(start, end).includes(line)) fail(`${name} already holds ${line.trim()}`)
  lines.splice(end, 0, line)
  writeFileSync(target, lines.join("\n").replace(/\n/g, doc.eol))
  console.log(`inserted into ${name} of ${target} before its closing ] (now line ${end + 1}, ${doc.eol === "\r\n" ? "CRLF" : "LF"})`)
} else {
  fail("usage: append <block-file> <target> | insert <target> <const-name> <line>")
}
```

`<temp>/p2b2-fence.mjs`:

```js
// p2b2-fence.mjs: run from the repo root (plan 2B-2 Tasks 15–17). Reads only; writes nothing. Never commit this file.
// Usage: node p2b2-fence.mjs <15|16|17>
// Proves that the part of the file that 2C owns is the same text as in HEAD (the commit before this task): the
// DataQualityRuleForm element (2C plan 4), the AssetStateReviewDialog element (2C plan 4) or the
// IntegrationClientManager element (2C plan 5), compared with \r stripped. Also checks that the 2C component files
// themselves have no change in the working tree.
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

const D = "src/app/[locale]/(dashboard)/"
const FENCES = {
  15: { path: `${D}admin/data-quality/page.tsx`, start: "<DataQualityRuleForm", end: "/>", owner: "src/components/admin/data-quality-rule-form.tsx" },
  16: { path: "src/components/admin/asset-state-review-workspace.tsx", start: "{dialog ? <AssetStateReviewDialog", end: "/> : null}", owner: "src/components/admin/asset-state-review-dialog.tsx" },
  17: { path: `${D}admin/integrations/page.tsx`, start: "<IntegrationClientManager", end: "/>", owner: "src/components/admin/IntegrationClientManager.tsx" },
}
const fence = FENCES[process.argv[2]]
if (!fence) {
  console.error("usage: node p2b2-fence.mjs <15|16|17>")
  process.exit(2)
}
const slice = (text) => {
  const source = text.replace(/\r\n/g, "\n")
  const start = source.indexOf(fence.start)
  if (start === -1) return null
  return source.slice(start, source.indexOf(fence.end, start) + fence.end.length)
}
const before = slice(execFileSync("git", ["show", `HEAD:${fence.path}`], { encoding: "utf8" }))
const after = slice(readFileSync(fence.path, "utf8"))
const ownerClean = execFileSync("git", ["status", "--porcelain", "--", fence.owner], { encoding: "utf8" }).trim() === ""
const same = before !== null && before === after
console.log(`${same ? "ok     " : "CHANGED"} ${fence.start} … ${fence.end} in ${fence.path}: ${before ? before.split("\n").length : 0} lines, ${same ? "same as" : "differs from"} HEAD`)
console.log(`${ownerClean ? "ok     " : "CHANGED"} ${fence.owner}: no change in the working tree`)
process.exit(same && ownerClean ? 0 : 1)
```

`<temp>/p2b1-tw-probe.mjs` (plan 2B-1 Task 4's probe, unchanged; no earlier task of this plan saves this name, and an existing copy has this same text):

```js
// p2b1-tw-probe.mjs: run from the repo root. Usage: node <temp>/p2b1-tw-probe.mjs <file> [<file> ...]
// Compiles every class of the class strings in the given files with the repo's Tailwind (@tailwindcss/node) against
// src/app/globals.css, in memory, and lists any class that produces no CSS. Reads only; writes nothing. Never commit.
// SHOW=a,b prints the compiled rule of the named classes.
import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()
const require = createRequire(resolve(root, "package.json"))
const { compile } = require("@tailwindcss/node")
const compiler = await compile(readFileSync(resolve(root, "src/app/globals.css"), "utf8"), { base: root, onDependency() {} })

// Class strings: className="…", a …Classes constant, the first string in cn(…), and any other string with a "-" or
// ":" in it after &&, ?, :, or a comma (the other strings inside cn() and the sticky maps).
const STRING = /(className=|Classes = |cn\(|&& |\? |: |, )"([^"]*)"/g
const takes = (lead, text) => /^(?:className=|Classes = |cn\()$/.test(lead) || /[-:]/.test(text)
const MARKERS = new Set(["group", "group/row"]) // they name a group and emit no CSS of their own
const classes = new Set()
for (const file of process.argv.slice(2)) {
  for (const [, lead, text] of readFileSync(file, "utf8").matchAll(STRING)) {
    if (!takes(lead, text)) continue
    for (const token of text.split(/\s+/)) if (/^[a-z!\[-]/.test(token) && !/[(){}]/.test(token)) classes.add(token)
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
Expected: `feat/ui-phase2b-plan2`

Run: `git status --short src tests messages` then `node <temp>/p2b2-t15-precheck.mjs 15`
Expected: `git status` prints nothing. The script prints (exit 0):
```
ok      2B-1: PageHeader
ok      2B-1: StatStrip with value: string
ok      2B-1: DataTable (framed, minWidth, scrollHint) and its parts, DataTableRow and DataTableFoot among them
ok      2B-1: FilterSelect (options, allLabel, select props)
ok      2A: Button busy, ActionEmptyState, formatCount
ok      common.pagination, common.pageOf ({page}, {total}) and common.tableScrollHint in th and en
ok      src/app/[locale]/(dashboard)/admin/data-quality/page.tsx is CRLF and unchanged since e3f20ce (hash 326661dae541da1c)
ok      src/app/[locale]/(dashboard)/admin/data-quality/page.tsx is not in MIGRATED_LIST_FILES yet
ok      the 2C files beside these pages and FMG are unchanged since e3f20ce
ok      tests/list-pages-ui.test.ts holds the tests of the earlier tasks of this group only
info    src/app/[locale]/(dashboard)/admin/data-quality/page.tsx: CRLF
info    tests/list-pages-ui.test.ts: CRLF
info    tests/list-frame-guards.test.ts: CRLF
preconditions hold for Task 15
```
On any `MISSING` line, stop and report it. A `hash is …` line means the page changed after `e3f20ce`, so the old snippets of Step 4 may not match: report it, do not guess.

Run: `node <temp>/p2b1-precheck.mjs --file D/admin/data-quality/page.tsx`
Expected (after the `info`/`ok` header lines; exit 0):
```
file    src/app/[locale]/(dashboard)/admin/data-quality/page.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LH1        1       1     0     1
LS1        1       1     0     1
args    LH1=1:1 LS1=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol "src/app/[[]locale]/(dashboard)/admin/data-quality/page.tsx" tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf    w/crlf` on all three. Keep them CRLF.

- [ ] **Step 2: Write the failing page test**

Save this block as `<temp>/t15-pages-block.ts` (it starts with one blank line):

```ts

// Plan 2B-2 Task 15 (spec 2B §4.4.3, §5.4 row admin/data-quality, I12): the data-quality header and number strip. The
// rule cards stay as they are, and the labels of DataQualityRuleForm belong to 2C plan 4 (it adds severity there).
test("data quality: PageHeader with the reports link, one StatStrip for the three tinted SummaryCards, and the common words the review queue reads (spec 2B §5.4, I12)", () => {
  const source = read(`${D}admin/data-quality/page.tsx`)
  assert.match(source, /<div className="space-y-6">\n\s+<PageHeader\n\s+title=\{t\("title"\)\}\n\s+meta=\{t\("subtitle"\)\}\n\s+actions=\{\n\s+<Link href=\{`\/\$\{locale\}\/reports`\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.ok(source.includes("<StatStrip"), "no <StatStrip")
  for (const [key, count] of [["enabledRules", "enabledRules.length"], ["totalIssues", "totalIssues"], ["rulesConfigured", "rules.length"]]) {
    assert.ok(source.includes(`{ key: "${key}", label: t("${key}"), value: formatCount(${count}) },`), `no StatStrip cell for ${key}`)
  }
  assert.match(source, /pagination: tCommon\("pagination"\),\n\s+pageOf: tCommon\.raw\("pageOf"\),\n\s+tableScrollHint: tCommon\("tableScrollHint"\),/, "the review queue's page bar and scroll hint use the common words")
  assert.doesNotMatch(source, /toLocaleString\(/, "counts go through formatCount")
  assert.ok(source.includes("<AssetStateReviewWorkspace") && source.includes("<DataQualityRuleForm"), "the review queue and the rule form stay on the page")
})
```

The file's `read` strips `\r`, so the `\n` in these regexes is safe (spec §9.6).

Run: `node <temp>/p2b2-admin-edit.mjs append <temp>/t15-pages-block.ts tests/list-pages-ui.test.ts`
Expected: `appended <temp>/t15-pages-block.ts to tests/list-pages-ui.test.ts (CRLF)`

Run: `node --test tests/list-pages-ui.test.ts`
Expected: FAIL, one more test than before this step and `fail 1`: `data quality: PageHeader with the reports link, …` with `The input did not match the regular expression /<div className="space-y-6">\n\s+<PageHeader…/` (the page still writes its own `h1`). Every other test of the file passes.

- [ ] **Step 3: Lower the guard rows of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs D/admin/data-quality/page.tsx LH1=1:0 LS1=1:0 --migrated`
Expected (exit 0):
```
LH1: 1 -> 0 (row deleted)
LS1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/admin/data-quality/page.tsx
```
The `// 2B-2` comments of `LH1` and `LS1` stay: `integrations/page.tsx` (Task 17) and `disposal-bulk-approval.tsx` (KEEP 1) still sit under them.

Run: `node --test tests/list-frame-guards.test.ts`
Expected: FAIL, `tests 21 · pass 18 · fail 3`:
- `LH1 page titles (<h1>) come from PageHeader`: `LH1: 27 in 27 files. …` with the one line `src/app/[locale]/(dashboard)/admin/data-quality/page.tsx: 1 > 0`
- `LS1 number tiles come from StatStrip, not a local tile function`: `LS1: 18 in 16 files. …` with the same line
- `L0 a file 2B is done with keeps only what KEEP allows, …`: `LH1 src/app/[locale]/(dashboard)/admin/data-quality/page.tsx: 1 > 0` and `LS1 …: 1 > 0`

(The totals are those after Tasks 1–14; at `e3f20ce` they would read `34 in 34` and `23 in 20`.)

- [ ] **Step 4: Move the header and the number boxes (`src/app/[locale]/(dashboard)/admin/data-quality/page.tsx`, CRLF)**

Five exact replacements, top to bottom. Make all five before you compile: (1) imports what (2) uses and drops `AlertTriangle`, which (5) stops using.

(1) Imports. `AlertTriangle` goes; `formatCount`, `buttonVariants`, `PageHeader` and `StatStrip` come in.

Replace:

```tsx
import Link from "next/link"
import { AlertTriangle, CheckCircle2, FileWarning } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { listAssetStateReviews } from "@/lib/asset-state-review-service"
import { assetMissingResponsibilityWhere } from "@/lib/asset-ownership"
import { assetDataQualityRulesKey, parseAssetDataQualityRules, type AssetDataQualityRule } from "@/lib/data-quality-rules"
import { buildDataQualityRuleHref } from "@/lib/data-quality-drilldown"
import { DataQualityRuleForm } from "@/components/admin/data-quality-rule-form"
import { AssetStateReviewWorkspace, type AssetStateReviewResponse } from "@/components/admin/asset-state-review-workspace"
```

with:

```tsx
import Link from "next/link"
import { CheckCircle2, FileWarning } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { listAssetStateReviews } from "@/lib/asset-state-review-service"
import { assetMissingResponsibilityWhere } from "@/lib/asset-ownership"
import { assetDataQualityRulesKey, parseAssetDataQualityRules, type AssetDataQualityRule } from "@/lib/data-quality-rules"
import { buildDataQualityRuleHref } from "@/lib/data-quality-drilldown"
import { formatCount } from "@/lib/display-format"
import { DataQualityRuleForm } from "@/components/admin/data-quality-rule-form"
import { AssetStateReviewWorkspace, type AssetStateReviewResponse } from "@/components/admin/asset-state-review-workspace"
import { buttonVariants } from "@/components/ui/button-variants"
import { PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
```

(2) The header and the three number boxes.

Replace:

```tsx
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link
          href={`/${locale}/reports`}
          className="inline-flex h-10 w-fit items-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
        >
          {t("openReports")}
        </Link>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <SummaryCard label={t("enabledRules")} value={enabledRules.length} tone="primary" />
        <SummaryCard label={t("totalIssues")} value={totalIssues} tone={totalIssues > 0 ? "danger" : "success"} />
        <SummaryCard label={t("rulesConfigured")} value={rules.length} tone="muted" />
      </section>
```

with:

```tsx
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <Link href={`/${locale}/reports`} className={buttonVariants({ variant: "outline", size: "md" })}>
            {t("openReports")}
          </Link>
        }
      />

      <StatStrip
        items={[
          { key: "enabledRules", label: t("enabledRules"), value: formatCount(enabledRules.length) },
          { key: "totalIssues", label: t("totalIssues"), value: formatCount(totalIssues) },
          { key: "rulesConfigured", label: t("rulesConfigured"), value: formatCount(rules.length) },
        ]}
      />
```

(3) The three common words for the review queue (Task 16 reads them). Inside the `labels` of `<AssetStateReviewWorkspace`, not of `<DataQualityRuleForm`.

Replace:

```tsx
          previous: t("assetStateReviews.previous"),
          next: t("assetStateReviews.next"),
```

with:

```tsx
          previous: t("assetStateReviews.previous"),
          next: t("assetStateReviews.next"),
          pagination: tCommon("pagination"),
          pageOf: tCommon.raw("pageOf"),
          tableScrollHint: tCommon("tableScrollHint"),
```

(4) The rule card count.

Replace:

```tsx
          <div className="text-2xl font-bold text-foreground">{count.toLocaleString("th-TH")}</div>
```

with:

```tsx
          <div className="text-2xl font-bold text-foreground">{formatCount(count)}</div>
```

(5) `SummaryCard` and `summaryClass` go; `severityClass` (the rule cards use it) stays. This is the end of the file.

Replace:

```tsx
function SummaryCard({ label, value, tone }: { label: string; value: number; tone: "primary" | "danger" | "success" | "muted" }) {
  return (
    <div className={`rounded-lg border p-4 ${summaryClass(tone)}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value.toLocaleString("th-TH")}</p>
        </div>
        <AlertTriangle className="h-5 w-5 text-current" />
      </div>
    </div>
  )
}

function severityClass(severity: AssetDataQualityRule["severity"]) {
  return severity === "danger" ? "border-danger-border bg-danger-soft text-danger" : "border-warning-border bg-warning-soft text-warning"
}

function summaryClass(tone: "primary" | "danger" | "success" | "muted") {
  if (tone === "primary") return "border-primary-border bg-primary-soft text-primary"
  if (tone === "danger") return "border-danger-border bg-danger-soft text-danger"
  if (tone === "success") return "border-success-border bg-success-soft text-success"
  return "border-border bg-surface text-muted-foreground"
}
```

with:

```tsx
function severityClass(severity: AssetDataQualityRule["severity"]) {
  return severity === "danger" ? "border-danger-border bg-danger-soft text-danger" : "border-warning-border bg-warning-soft text-warning"
}
```

Check: `grep -n "<h1\|SummaryCard\|summaryClass\|AlertTriangle\|toLocaleString" "src/app/[locale]/(dashboard)/admin/data-quality/page.tsx"` prints nothing (exit 1).

- [ ] **Step 5: Prove the 2C part did not move**

Run: `node <temp>/p2b2-fence.mjs 15`
Expected (exit 0):
```
ok      <DataQualityRuleForm … /> in src/app/[locale]/(dashboard)/admin/data-quality/page.tsx: 13 lines, same as HEAD
ok      src/components/admin/data-quality-rule-form.tsx: no change in the working tree
```

Run: `grep -n "<DataQualityRuleForm\|^        labels={{" "src/app/[locale]/(dashboard)/admin/data-quality/page.tsx"`
Expected: `77:        labels={{`, `150:      <DataQualityRuleForm`, `152:        labels={{` (the workspace labels, then the rule form at its new lines for DH).

- [ ] **Step 6: Run the tests for this task**

Run: `node --test tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/asset-state-review-ui.test.ts tests/list-primitives-ui.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `fail 0`: list-frame-guards 21, visual-foundation-guards 26, asset-state-review-ui 4, list-primitives-ui 18, form-migration-guards 23 (their counts at `e3f20ce`, plus any test an earlier task of this plan added to them), and list-pages-ui with the one test of Step 2 more than before.

Run: `node <temp>/p2b1-precheck.mjs --file D/admin/data-quality/page.tsx`
Expected: `· in MIGRATED_LIST_FILES` on the `file` line, the rows `LH1 0 0 0 1` and `LS1 0 0 0 1`, and `args    (no row holds this file)`; exit 0.

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected: exit 0 and `budgets hold: no live count is over its row`. With Tasks 1–14 at their numbers: `LH1 BUDGETS.LH1 26 in 26 rows · live 26 in 26 files · over 0 · slack 0` and `LS1 BUDGETS.LS1 17 in 15 rows · live 17 in 15 files · over 0 · slack 0`. No slack line names this page.

- [ ] **Step 7: Prove every class compiles**

Run from the repo root: `node <temp>/p2b1-tw-probe.mjs "src/app/[locale]/(dashboard)/admin/data-quality/page.tsx"`
Expected: `checked 35 classes, missing 0` (exit 0). None is new to `src`: the new markup has no class string of its own (the header, button and strip classes live in the primitives).

- [ ] **Step 8: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, and 1 more test than before Step 2 (1 skipped as before).
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors and no new warning in `src/` or `tests/` (`npx eslint "src/app/[locale]/(dashboard)/admin/data-quality/page.tsx" tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts` prints nothing).

Run: `git diff --numstat` then `git status --short src tests messages`
Expected:
- `25 40` for the page, `14 0` for `tests/list-pages-ui.test.ts`, `1 2` for `tests/list-frame-guards.test.ts`. Nothing else, and `git status` lists only these three files.
- `node -e "const s=require('fs').readFileSync(process.argv[1],'utf8');console.log((s.match(/\r\n/g)||[]).length,(s.match(/\n/g)||[]).length)" "src/app/[locale]/(dashboard)/admin/data-quality/page.tsx"` prints `236 236` (251 before; CRLF throughout). A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).

- [ ] **Step 9: Commit**

```bash
git add "src/app/[locale]/(dashboard)/admin/data-quality/page.tsx" tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): data-quality header on PageHeader and its number boxes as one StatStrip (2B-2 task 15)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 18):** `/th/admin/data-quality` at 1440, 1024, 768 and 375: title weight 600 with the subtitle in the meta line; "เปิดรายงาน" outline 36px top right from `md`, 44px below; the strip has white cells with divider lines, no red or green box, 2 + 1 cells below 1024 with the third full width, th-TH digits; the rule cards and the rule form look as before; English pass: "Data Quality Rule Center" and "Open Reports".

---

### Task 16: `c/admin/asset-state-review-workspace.tsx` on `FilterSelect`, `DataTable` and `Button` (O3)

Spec §10.3 bullet 2B-2, with rulings I12 and I21 (client lists keep their own paging), §8.6 row 17, §5.4 row admin/data-quality, §5.1, §6.5 row O3, §6.4, §6.9, §6.10 item 6, §6.13 table B item 5, §3.4, §3.9 and DESIGN.md:371 (busy) and :425–427 (empty states). One file, one commit. The file is a client component and CRLF: edit it with exact-string replacement only. Never touch `c/admin/asset-state-review-dialog.tsx` or the `{dialog ? <AssetStateReviewDialog … /> : null}` element (2C plan 4).

Rulings this task applies:
- **§6.5 row O3, §6.4:** the three local `Filter` selects become controlled `FilterSelect`s (`value` + `onChange`, which now receives the change event, so each handler reads `event.target.value` and then calls `load(1, …)` exactly as before). Review status has no "all" option; severity and issue type pass `allLabel={labels.all}` (the old `["", labels.all]` first option). The issue type options are `Object.entries(issueTypes)` mapped to `{ value, label }`. The filter bar `<div className="grid gap-3 border-b border-border bg-background p-4 sm:grid-cols-3">` stays (§6.5: `bg-background` inside the panel is fine, DS:441). `FilterSelect` keeps its default `fieldSize="lg"`: 40px from `md`, 44px below (was 44px at every width, §6.9). `function Filter` goes: LFG LF1 drops by 1.
- **§5.4, §3.4:** the table becomes `DataTable framed={false}` (the section is already the frame; DS: never a frame in a frame) with `caption={labels.title}`, `minWidth={980}` (the old `min-w-[980px]`) and `className="hidden md:block"` (the phone cards below `md` stay). The header loses `bg-muted/60` (VFG R7 drops by 1) and its hand-written cells; rows become `DataTableRow` (the old `hover:bg-row-hover` row is not clickable, so it is the plain row, §5.1) and cells `DataTableCell`, which bring `p-3` and `align-top`.
- **§5.8 row 2, B6:** between 768px and about 1000px the 980px table scrolls inside the panel, so it gets `scrollHint={labels.tableScrollHint}` (Task 15 passes `tCommon("tableScrollHint")`).
- **Ruling (pinned actions column):** as plan 2B-1 Task 25 fixed on every wide list (`64c089a`), the actions head and cell are `sticky="right"`, so "แก้ไข" and "ยกเว้น" stay visible while the table scrolls. The head keeps its visible label ("การดำเนินการ"), because a read-only row shows text in that cell instead of buttons.
- **§5.4 page bar, I21:** this list pages on the client through `/api/admin/asset-state-reviews`, so it cannot use `Pagination` (links). Its foot is `DataTableFoot` with the layout of `Pagination`: a `nav` named `labels.pagination` ("การแบ่งหน้า"), one `aria-live="polite"` line on the left and words-only outline `sm` buttons on the right. The line reads `labels.total` + " · " + `labels.pageOf` ("ทั้งหมด 120 รายการ · หน้า 2 จาก 5"; it was "ทั้งหมด 120 รายการ" and "2/5"), with every number through `formatCount`. The foot shows only while `result.total > 0` (§5.1). The buttons keep `disabled={loading || …}` exactly as before (no behavior change).
- **ActionButton → Button:** in a row, resolve is `Button size="sm"` (ActionButton `primary` → `default`) and dismiss `Button variant="outline" size="sm"` (ActionButton's default `secondary` → `outline`). The scan button is `Button size="lg"`: ActionButton `md` is Button `default`, 40px today; `lg` is the same 40px, is the panel action size of the 2B-1 brands panel, and does not shrink when 2D makes `default` 36px. The scan button takes `busy={scanning}` and no `disabled` (guard GB4); the spinner replaces its `ScanSearch` icon and the label stays `labels.scan` while busy (DS:371, ruling K13), so `RefreshCw` and the label swap go. The page keeps passing `labels.scanning`, now unused.
- **Ruling (empty state, departs from §5.4):** §5.4 says `EmptyNote`, but this state has a title and a description, and DESIGN.md:427 says that is an `ActionEmptyState` ("one line of text → EmptyNote; a title, a description or a button → ActionEmptyState"). `ActionEmptyState title={labels.emptyTitle} description={labels.emptyDescription}` keeps both texts (the description is the only hint to scan or change the filters) and its default faint `Inbox` icon replaces the green `CheckCircle2` (DS:258: green only in badges and toasts). It looks as before minus the green: centered, `py-10`.
- **§5.1 (numbers):** `value.toLocaleString()` in `Summary` becomes `formatCount(value)` (LFG LV1 drops by 1); the total and page numbers use `formatCount` too, so `numberLocale` goes. The colored dots of `Summary`, the panel head and `ShieldAlert` stay (2D).
- **§6.10 item 6:** the out-of-order result risk (`load` has no request guard) stays as it is; Task 19 notes it in DH.
- **§6.13 item 5, I34:** the workspace joins `MIGRATED_FILTER_FILES` in `tests/list-filters-ui.test.ts` (one of 2B-2's three files there, with disposal and maintenance). It has no `<form>`, so item 6 does not apply.
- **Ruling (e):** plans 2B-3…2B-5 do not touch this file, so it joins `MIGRATED_LIST_FILES`; its `KEEP` is 0 everywhere and its VFG R7 row goes.
- **Ruling (j), I16:** `tests/list-pages-ui.test.ts` gets one "has" test for the workspace.
- **Ruling (TDD order):** the tests and the lowered budgets come first and fail; then the file changes and everything passes.

What users will see in the review queue on `/th/admin/data-quality`:
- The three filters are 40px on desktop (44px on phones) with the shared field look and 13px labels; changing one still reloads the list at page 1.
- The table header is white, 13px, no fill; cells have the shared 12px padding. While the table is wider than the panel (768–1000px), the actions column stays pinned on the right and a hint line above the table says it scrolls.
- "แก้ไข" stays a primary small button and "ยกเว้น" an outline small button (32px from `md`, 44px below).
- "สแกนรายการใหม่" keeps its label while it runs: a spinner takes the place of its icon and the button keeps focus (it used to switch to "กำลังสแกน" and drop focus).
- With no item, the centered empty state shows a faint inbox icon (it was a green check), with the same title and description, and no page bar.
- The page bar reads "ทั้งหมด 120 รายการ · หน้า 2 จาก 5" in th-TH digits, and screen readers hear it when it changes; "ก่อนหน้า"/"ถัดไป" are outline small buttons.

Not in this task:
- `c/admin/asset-state-review-dialog.tsx` and the element that renders it (2C plan 4)
- `load`, `scan`, `submitDialog`, the API calls and the state (unchanged); the loading skeleton; `ReviewMobileCard`, `AssetIdentity`, `StateSummary`, `IssueSummary` (unchanged)
- the panel head layout (title, `ShieldAlert`, the severity summary line and its dots: 2D) and `D/admin/data-quality/page.tsx` (Task 15 already passed the labels)
- messages (no key changes), docs (Task 19). Do not run a formatter.

**Files:**
- Modify: `src/components/admin/asset-state-review-workspace.tsx` (`i/lf w/crlf`; 8 exact replacements)
- Modify: `tests/list-pages-ui.test.ts` (`i/lf w/crlf`; one block appended) and `tests/list-filters-ui.test.ts` (`i/lf w/crlf`; one line inserted), through `p2b2-admin-edit.mjs`
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`) and `tests/visual-foundation-guards.test.ts` (`i/lf w/crlf`), through `p2b-budget.mjs` only
- Temp folder only, never committed: `t16-pages-block.ts`; Task 15's scripts are already there

**Must keep passing without edits:**
- `tests/asset-state-review-ui.test.ts` (4 tests: the workspace still names `/api/admin/asset-state-reviews/scan`, `reviewStatus` and `severity`; the dialog checks read the dialog file, which does not change)
- `tests/form-migration-guards.test.ts` (GB4: `busy={scanning}` with no `disabled` on that tag; `asset-state-review-dialog.tsx` is in `BATCH_FILES` "4" and is not touched), `tests/dialog-trigger-handles.test.ts`, `tests/list-primitives-ui.test.ts`, `tests/design-tokens-contrast.test.ts`
- `tests/list-frame-guards.test.ts` and `tests/visual-foundation-guards.test.ts`: every row of the other files

**Interfaces:**
- Consumes:
  - 2B-1: `FilterSelect(props: Omit<React.ComponentProps<"select">, "size" | "multiple" | "className"> & { label: string; options?: readonly FilterSelectOption[]; allLabel?: string; fieldSize?: FieldSize; hideLabel?: boolean; labelAction?: React.ReactNode; className?: string })` with `FilterSelectOption = { value: string; label: string }` from `@/components/ui/filter-select`.
  - 2B-1: from `@/components/ui/data-table`: `DataTable(props: Omit<React.ComponentProps<"div">, "children"> & { children: React.ReactNode; caption?: string; framed?: boolean; layout?: "auto" | "fixed"; minWidth?: number; scrollHint?: string; footer?: React.ReactNode })`, `DataTableHeader` (`<thead>` props), `DataTableBody` (`<tbody>` props), `DataTableHead(props: Omit<React.ComponentProps<"th">, "scope"> & { align?: "left" | "right"; sort?: DataTableSort; sticky?: "left" | "right"; hideLabel?: boolean })`, `DataTableRow` (`<tr>` props), `DataTableCell(props: React.ComponentProps<"td"> & { align?: "left" | "right"; numeric?: boolean; sticky?: "left" | "right" })`, `DataTableFoot` (`<div>` props).
  - 2A: `Button(props: React.ComponentProps<"button"> & ButtonVariantProps & ({ asChild?: false; busy?: boolean } | { asChild: true; busy?: never }))` from `@/components/ui/button` (variants `default`, `outline`, …; sizes `sm`, `md`, `lg`, …); `ActionEmptyState({ icon?, title: string, description?: string, actionHref?, actionLabel?, actionVariant?, action?, details?, tone? })` from `@/components/ui/action-empty-state`; `formatCount` from `@/lib/display-format`.
  - Task 15: `labels.pagination`, `labels.pageOf` (raw, `{page}` and `{total}`), `labels.tableScrollHint`; `<temp>/p2b2-t15-precheck.mjs`, `p2b2-admin-edit.mjs`, `p2b2-fence.mjs`, `p2b1-tw-probe.mjs`.
- Produces:
  - Unchanged exports: `AssetStateReviewWorkspace({ locale, canEdit, initialData, labels, issueTypes })` and `type AssetStateReviewResponse` (the page imports both).
  - VFG `TABLE_HEADER_FILLS` and LFG `BUDGETS.LF1`/`BUDGETS.LV1` hold no row of the file; `MIGRATED_LIST_FILES` and `MIGRATED_FILTER_FILES` hold it.
  - `tests/list-pages-ui.test.ts`: the test `data quality review queue: FilterSelect, DataTable …`.

| guard | `c/admin/asset-state-review-workspace.tsx` before → after | plan total before → after (when Tasks 1–14 reached their numbers) |
|---|---|---|
| VFG R7 | 1 → – | 18 in 12 rows → 17 in 11 rows |
| LFG LF1 | 1 → – | 3 → 2 |
| LFG LV1 | 1 → – | 20 → 19 |
| `MIGRATED_LIST_FILES` · `MIGRATED_FILTER_FILES` | – → joins both | +1 each |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b2-t15-precheck.mjs 16`
Expected: `git status` prints nothing. The script prints (exit 0):
```
ok      2B-1: PageHeader
ok      2B-1: StatStrip with value: string
ok      2B-1: DataTable (framed, minWidth, scrollHint) and its parts, DataTableRow and DataTableFoot among them
ok      2B-1: FilterSelect (options, allLabel, select props)
ok      2A: Button busy, ActionEmptyState, formatCount
ok      common.pagination, common.pageOf ({page}, {total}) and common.tableScrollHint in th and en
ok      src/components/admin/asset-state-review-workspace.tsx is CRLF and unchanged since e3f20ce (hash da303558645e8468)
ok      src/components/admin/asset-state-review-workspace.tsx is not in MIGRATED_LIST_FILES yet
ok      the 2C files beside these pages and FMG are unchanged since e3f20ce
ok      tests/list-pages-ui.test.ts holds the tests of the earlier tasks of this group only
ok      Task 15: the data-quality page passes pagination, pageOf and tableScrollHint to the workspace
ok      tests/list-filters-ui.test.ts: MIGRATED_FILTER_FILES does not hold the workspace yet
info    src/components/admin/asset-state-review-workspace.tsx: CRLF
info    tests/list-pages-ui.test.ts: CRLF
info    tests/list-frame-guards.test.ts: CRLF
info    tests/list-filters-ui.test.ts: CRLF
info    tests/visual-foundation-guards.test.ts: CRLF
preconditions hold for Task 16
```
On any `MISSING` line, stop and report it.

Run: `node <temp>/p2b1-precheck.mjs --file c/admin/asset-state-review-workspace.tsx`
Expected (after the header lines; exit 0):
```
file    src/components/admin/asset-state-review-workspace.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
R7         1       1     0     1
LF1        1       1     0     1
LV1        1       1     0     1
args    R7=1:1 LF1=1:1 LV1=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol src/components/admin/asset-state-review-workspace.tsx tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: `i/lf    w/crlf` on all five. Keep them CRLF.

- [ ] **Step 2: Write the failing tests**

(a) Save this block as `<temp>/t16-pages-block.ts` (it starts with one blank line):

```ts

// Plan 2B-2 Task 16 (spec 2B §5.4 row admin/data-quality, §6.5 row O3, I12): the review queue on the data-quality page.
// It pages on the client through the review API, so its page bar holds buttons, not Pagination links.
test("data quality review queue: FilterSelect, DataTable and a client page bar of outline sm buttons (spec 2B §5.4, §6.5 O3, I12)", () => {
  const source = read(`${C}admin/asset-state-review-workspace.tsx`)
  assert.match(source, /^"use client"$/m, "busy and the client page bar need client state")
  assert.equal(source.match(/<FilterSelect\n/g)?.length, 3, "three controlled filters")
  assert.equal(source.match(/allLabel=\{labels\.all\}/g)?.length, 2, "severity and issue type start with all; review status has no all")
  assert.match(source, /<DataTable framed=\{false\} caption=\{labels\.title\} minWidth=\{980\} scrollHint=\{labels\.tableScrollHint\} className="hidden md:block">/)
  for (const part of ["<DataTableHeader>", "<DataTableBody>", "<DataTableRow>", '<DataTableHead align="right" sticky="right">', '<DataTableCell align="right" sticky="right">', "<DataTableFoot>"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /<nav aria-label=\{labels\.pagination\} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">\n\s+<p aria-live="polite" className="text-meta text-muted-foreground num">/)
  assert.equal(source.match(/<Button variant="outline" size="sm" disabled=\{loading \|\| result\.page (?:<= 1|>= totalPages)\}/g)?.length, 2, "previous and next")
  assert.match(source, /<Button size="lg" busy=\{scanning\} onClick=\{\(\) => void scan\(\)\}>\n\s+<ScanSearch aria-hidden="true" \/>\n\s+\{labels\.scan\}\n/, "the scan button keeps its label while busy (K13)")
  assert.match(source, /<ActionEmptyState title=\{labels\.emptyTitle\} description=\{labels\.emptyDescription\} \/>/)
  assert.doesNotMatch(source, /\bActionButton\b|<table\b|<select\b|toLocaleString\(/)
})
```

Run: `node <temp>/p2b2-admin-edit.mjs append <temp>/t16-pages-block.ts tests/list-pages-ui.test.ts`
Expected: `appended <temp>/t16-pages-block.ts to tests/list-pages-ui.test.ts (CRLF)`

(b) Add the workspace to item 5 of the filter tests.

Run: `node <temp>/p2b2-admin-edit.mjs insert tests/list-filters-ui.test.ts MIGRATED_FILTER_FILES '  "src/components/admin/asset-state-review-workspace.tsx",'`
Expected: `inserted into MIGRATED_FILTER_FILES of tests/list-filters-ui.test.ts before its closing ] (now line <n>, CRLF)`, where `<n>` is the line of the new entry (the list's last line).

Run: `node --test tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts`
Expected: FAIL, `fail 2`:
- `data quality review queue: FilterSelect, DataTable and a client page bar of outline sm buttons …`: `three controlled filters` (the file still has its local `Filter`)
- `migrated filter forms use Field, SearchField and FilterSelect only, and every form is a search landmark (item 5)`: `src/components/admin/asset-state-review-workspace.tsx: a raw select or textarea`
- every other test of both files passes.

- [ ] **Step 3: Lower the guard rows of the file (the failing guards)**

Run: `node <temp>/p2b-budget.mjs c/admin/asset-state-review-workspace.tsx R7=1:0 LF1=1:0 LV1=1:0 --migrated`
Expected (exit 0):
```
R7: 1 -> 0 (row deleted)
LF1: 1 -> 0 (row deleted)
LV1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/components/admin/asset-state-review-workspace.tsx
```
The script also drops the `// 2B-2` comments of `LF1`, `LV1` and (when Tasks 1–14 removed the other 2B-2 rows) `TABLE_HEADER_FILLS`, because this file was the last row under each.

Run: `node --test tests/list-frame-guards.test.ts`
Expected: FAIL, `tests 21 · pass 18 · fail 3`:
- `LF1 list filters use the shared FilterSelect, not a local select helper`: `LF1: 3 in 3 files. …` with the line `src/components/admin/asset-state-review-workspace.tsx: 1 > 0`
- `LV1 numbers on screen go through formatCount or formatMoney, not a bare toLocaleString()`: `LV1: 20 in 8 files. …` with the same line
- `L0 …`: `LF1 src/components/admin/asset-state-review-workspace.tsx: 1 > 0` and `LV1 …: 1 > 0`

Run: `node --test tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 26 · pass 25 · fail 1`: `R7 interim: table-header fills wait for DataTable (2B), file by file` with `18 matches in 12 files; over budget:` (after Tasks 1–14; `29 matches in 20 files` at `e3f20ce`) and the one line `src/components/admin/asset-state-review-workspace.tsx: 1 > 0`.

- [ ] **Step 4: Move the file onto the shared parts (`src/components/admin/asset-state-review-workspace.tsx`, CRLF)**

Eight exact replacements, top to bottom. Make all eight before you compile: (1) imports what (3)–(7) use, and (8) deletes the `Filter` that (4) stops calling.

(1) Imports. `CheckCircle2`, `RefreshCw` and `ActionButton` go; the empty state, `Button`, the table parts, `FilterSelect` and `formatCount` come in.

Replace:

```tsx
import Link from "next/link"
import { AlertTriangle, CheckCircle2, RefreshCw, ScanSearch, ShieldAlert } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { AssetStateReviewDialog, type ReviewTarget } from "@/components/admin/asset-state-review-dialog"
import { ActionButton } from "@/components/ui/action-button"
import { useApiError } from "@/components/ui/use-api-error"
import { StatusBadge } from "@/components/ui/status-badge"
```

with:

```tsx
import Link from "next/link"
import { AlertTriangle, ScanSearch, ShieldAlert } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { AssetStateReviewDialog, type ReviewTarget } from "@/components/admin/asset-state-review-dialog"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { Button } from "@/components/ui/button"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { FilterSelect } from "@/components/ui/filter-select"
import { useApiError } from "@/components/ui/use-api-error"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCount } from "@/lib/display-format"
```

(2) `numberLocale` goes (the foot formats through `formatCount`).

Replace:

```tsx
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize))
  const numberLocale = locale === "th" ? "th-TH" : "en-US"
```

with:

```tsx
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize))
```

(3) The scan button.

Replace:

```tsx
        {canEdit ? (
          <ActionButton variant="primary" onClick={() => void scan()} disabled={scanning}>
            {scanning ? <RefreshCw className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <ScanSearch className="h-4 w-4" />}
            {scanning ? labels.scanning : labels.scan}
          </ActionButton>
        ) : null}
```

with:

```tsx
        {canEdit ? (
          <Button size="lg" busy={scanning} onClick={() => void scan()}>
            <ScanSearch aria-hidden="true" />
            {labels.scan}
          </Button>
        ) : null}
```

(4) The three filters.

Replace:

```tsx
      <div className="grid gap-3 border-b border-border bg-background p-4 sm:grid-cols-3">
        <Filter label={labels.reviewStatus} value={reviewStatus} onChange={(value) => { setReviewStatus(value); void load(1, { reviewStatus: value, severity, issueType }) }} options={[
          ["pending", labels.pending], ["resolved", labels.resolved], ["dismissed", labels.dismissed],
        ]} />
        <Filter label={labels.severity} value={severity} onChange={(value) => { setSeverity(value); void load(1, { reviewStatus, severity: value, issueType }) }} options={[
          ["", labels.all], ["critical", labels.critical], ["warning", labels.warning], ["info", labels.info],
        ]} />
        <Filter label={labels.issueType} value={issueType} onChange={(value) => { setIssueType(value); void load(1, { reviewStatus, severity, issueType: value }) }} options={[
          ["", labels.all], ...Object.entries(issueTypes),
        ]} />
      </div>
```

with:

```tsx
      <div className="grid gap-3 border-b border-border bg-background p-4 sm:grid-cols-3">
        <FilterSelect
          label={labels.reviewStatus}
          value={reviewStatus}
          onChange={(event) => { const value = event.target.value; setReviewStatus(value); void load(1, { reviewStatus: value, severity, issueType }) }}
          options={[{ value: "pending", label: labels.pending }, { value: "resolved", label: labels.resolved }, { value: "dismissed", label: labels.dismissed }]}
        />
        <FilterSelect
          label={labels.severity}
          value={severity}
          onChange={(event) => { const value = event.target.value; setSeverity(value); void load(1, { reviewStatus, severity: value, issueType }) }}
          allLabel={labels.all}
          options={[{ value: "critical", label: labels.critical }, { value: "warning", label: labels.warning }, { value: "info", label: labels.info }]}
        />
        <FilterSelect
          label={labels.issueType}
          value={issueType}
          onChange={(event) => { const value = event.target.value; setIssueType(value); void load(1, { reviewStatus, severity, issueType: value }) }}
          allLabel={labels.all}
          options={Object.entries(issueTypes).map(([value, label]) => ({ value, label }))}
        />
      </div>
```

(5) The empty state, the table and the page bar. The loading skeleton above and the dialog element below stay.

Replace:

```tsx
      ) : result.data.length === 0 ? (
        <div className="flex flex-col items-center px-4 py-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-success" />
          <h3 className="mt-3 font-semibold text-foreground">{labels.emptyTitle}</h3>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{labels.emptyDescription}</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-muted/60 text-xs font-medium text-muted-foreground">
                <tr><th className="px-4 py-3">{labels.asset}</th><th className="px-4 py-3">{labels.currentState}</th><th className="px-4 py-3">{labels.issue}</th><th className="px-4 py-3">{labels.lastDetected}</th><th className="px-4 py-3 text-right">{labels.actions}</th></tr>
              </thead>
              <tbody className="divide-y divide-border">{result.data.map((row) => <ReviewTableRow key={row.id} row={row} locale={locale} labels={labels} issueTypes={issueTypes} canEdit={canEdit} onAction={(mode) => setDialog({ mode, row })} />)}</tbody>
            </table>
          </div>
          <div className="grid gap-3 p-4 md:hidden">{result.data.map((row) => <ReviewMobileCard key={row.id} row={row} locale={locale} labels={labels} issueTypes={issueTypes} canEdit={canEdit} onAction={(mode) => setDialog({ mode, row })} />)}</div>
        </>
      )}

      <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground">{labels.total.replace("{count}", result.total.toLocaleString(numberLocale))}</span>
        <div className="flex gap-2">
          <ActionButton size="sm" disabled={loading || result.page <= 1} onClick={() => void load(result.page - 1)}>{labels.previous}</ActionButton>
          <span className="inline-flex min-h-11 items-center px-2 text-muted-foreground sm:min-h-0">{result.page}/{totalPages}</span>
          <ActionButton size="sm" disabled={loading || result.page >= totalPages} onClick={() => void load(result.page + 1)}>{labels.next}</ActionButton>
        </div>
      </div>
```

with:

```tsx
      ) : result.data.length === 0 ? (
        <ActionEmptyState title={labels.emptyTitle} description={labels.emptyDescription} />
      ) : (
        <>
          <DataTable framed={false} caption={labels.title} minWidth={980} scrollHint={labels.tableScrollHint} className="hidden md:block">
            <DataTableHeader>
              <tr>
                <DataTableHead>{labels.asset}</DataTableHead>
                <DataTableHead>{labels.currentState}</DataTableHead>
                <DataTableHead>{labels.issue}</DataTableHead>
                <DataTableHead>{labels.lastDetected}</DataTableHead>
                <DataTableHead align="right" sticky="right">{labels.actions}</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>{result.data.map((row) => <ReviewTableRow key={row.id} row={row} locale={locale} labels={labels} issueTypes={issueTypes} canEdit={canEdit} onAction={(mode) => setDialog({ mode, row })} />)}</DataTableBody>
          </DataTable>
          <div className="grid gap-3 p-4 md:hidden">{result.data.map((row) => <ReviewMobileCard key={row.id} row={row} locale={locale} labels={labels} issueTypes={issueTypes} canEdit={canEdit} onAction={(mode) => setDialog({ mode, row })} />)}</div>
        </>
      )}

      {result.total > 0 ? (
        <DataTableFoot>
          <nav aria-label={labels.pagination} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <p aria-live="polite" className="text-meta text-muted-foreground num">
              {labels.total.replace("{count}", formatCount(result.total))}
              <span aria-hidden="true"> · </span>
              {labels.pageOf.replace("{page}", formatCount(result.page)).replace("{total}", formatCount(totalPages))}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" disabled={loading || result.page <= 1} onClick={() => void load(result.page - 1)}>{labels.previous}</Button>
              <Button variant="outline" size="sm" disabled={loading || result.page >= totalPages} onClick={() => void load(result.page + 1)}>{labels.next}</Button>
            </div>
          </nav>
        </DataTableFoot>
      ) : null}
```

(6) The table row.

Replace:

```tsx
function ReviewTableRow({ row, locale, labels, issueTypes, canEdit, onAction }: RowProps) {
  return <tr className="align-top hover:bg-row-hover"><td className="px-4 py-3"><AssetIdentity row={row} locale={locale} labels={labels} /></td><td className="px-4 py-3"><StateSummary row={row} locale={locale} labels={labels} /></td><td className="max-w-sm px-4 py-3"><IssueSummary row={row} labels={labels} issueTypes={issueTypes} /></td><td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(row.lastDetectedAt, locale)}</td><td className="px-4 py-3"><ReviewActions row={row} canEdit={canEdit} labels={labels} onAction={onAction} /></td></tr>
}
```

with:

```tsx
function ReviewTableRow({ row, locale, labels, issueTypes, canEdit, onAction }: RowProps) {
  return <DataTableRow><DataTableCell><AssetIdentity row={row} locale={locale} labels={labels} /></DataTableCell><DataTableCell><StateSummary row={row} locale={locale} labels={labels} /></DataTableCell><DataTableCell className="max-w-sm"><IssueSummary row={row} labels={labels} issueTypes={issueTypes} /></DataTableCell><DataTableCell className="whitespace-nowrap text-muted-foreground">{formatDate(row.lastDetectedAt, locale)}</DataTableCell><DataTableCell align="right" sticky="right"><ReviewActions row={row} canEdit={canEdit} labels={labels} onAction={onAction} /></DataTableCell></DataTableRow>
}
```

(7) The row buttons (the table row and the phone card both render `ReviewActions`).

Replace:

```tsx
  return <div className="flex flex-wrap justify-end gap-2">{canResolve ? <ActionButton size="sm" variant="primary" onClick={() => onAction("resolve")}>{labels.resolve}</ActionButton> : <span className="self-center text-xs text-muted-foreground">{labels.workflowRequired}</span>}<ActionButton size="sm" onClick={() => onAction("dismiss")}>{labels.dismiss}</ActionButton></div>
```

with:

```tsx
  return <div className="flex flex-wrap justify-end gap-2">{canResolve ? <Button size="sm" onClick={() => onAction("resolve")}>{labels.resolve}</Button> : <span className="self-center text-xs text-muted-foreground">{labels.workflowRequired}</span>}<Button variant="outline" size="sm" onClick={() => onAction("dismiss")}>{labels.dismiss}</Button></div>
```

(8) The local `Filter` goes, and `Summary` formats its count.

Replace:

```tsx
function Filter({ label, value, options, onChange }: { label: string; value: string; options: string[][]; onChange: (value: string) => void }) {
  return <label className="text-sm font-medium text-foreground">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring">{options.map(([optionValue, optionLabel]) => <option key={optionValue || "all"} value={optionValue}>{optionLabel}</option>)}</select></label>
}

function Summary({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${tone === "danger" ? "bg-danger" : tone === "warning" ? "bg-warning" : "bg-info"}`} /><span className="text-muted-foreground">{label}</span><strong className="text-foreground">{value.toLocaleString()}</strong></span>
}
```

with:

```tsx
function Summary({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${tone === "danger" ? "bg-danger" : tone === "warning" ? "bg-warning" : "bg-info"}`} /><span className="text-muted-foreground">{label}</span><strong className="text-foreground">{formatCount(value)}</strong></span>
}
```

Check: `grep -n "ActionButton\|<table\|<thead\|<select\|toLocaleString\|numberLocale\|RefreshCw\|CheckCircle2\|function Filter\|bg-muted/" src/components/admin/asset-state-review-workspace.tsx` prints nothing (exit 1).

- [ ] **Step 5: Prove the 2C part did not move**

Run: `node <temp>/p2b2-fence.mjs 16`
Expected (exit 0):
```
ok      {dialog ? <AssetStateReviewDialog … /> : null} in src/components/admin/asset-state-review-workspace.tsx: 13 lines, same as HEAD
ok      src/components/admin/asset-state-review-dialog.tsx: no change in the working tree
```

- [ ] **Step 6: Run the tests for this task**

Run: `node --test tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/asset-state-review-ui.test.ts tests/list-primitives-ui.test.ts tests/form-migration-guards.test.ts tests/dialog-trigger-handles.test.ts`
Expected: PASS, `fail 0`: list-frame-guards 21, visual-foundation-guards 26, asset-state-review-ui 4, list-primitives-ui 18, form-migration-guards 23, dialog-trigger-handles 5 (their counts at `e3f20ce`, plus any test an earlier task of this plan added to them), list-pages-ui with the one test of Step 2 more than before, and list-filters-ui with the same number of tests as before (item 5 now also reads the workspace).

Run: `node <temp>/p2b1-precheck.mjs --file c/admin/asset-state-review-workspace.tsx`
Expected: `· in MIGRATED_LIST_FILES`, the rows `R7 0 0 0 1`, `LF1 0 0 0 1`, `LV1 0 0 0 1`, and `args    (no row holds this file)`; exit 0.

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected: exit 0 and `budgets hold: no live count is over its row`. With Tasks 1–14 at their numbers: `R7  TABLE_HEADER_FILLS  17 in 11 rows · live  17 in 11 files · over 0 · slack 0` (spec §10.4 table C, column 2B-2), `LF1 BUDGETS.LF1 2 in 2 rows` and `LV1 BUDGETS.LV1 19 in 7 rows`, each with `slack 0`. No slack line names this file.

- [ ] **Step 7: Prove every class compiles**

Run from the repo root: `node <temp>/p2b1-tw-probe.mjs src/components/admin/asset-state-review-workspace.tsx`
Expected: `checked 71 classes, missing 2: th-TH en-US` (exit 1). Those two are not classes: the probe reads every quoted string after `? ` or `: ` that holds a `-`, and `formatDate` has `locale === "th" ? "th-TH" : "en-US"` (the file at `e3f20ce` gives the same two). Every real class compiles, and none is new to `src`: the foot's `flex flex-wrap items-center justify-between gap-x-3 gap-y-2` and `text-meta text-muted-foreground num` are the strings of `ui/pagination.tsx`.

- [ ] **Step 8: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, and 1 more test than before Step 2 (1 skipped as before).
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors and no new warning in `src/` or `tests/` (`npx eslint src/components/admin/asset-state-review-workspace.tsx tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts` prints nothing).

Run: `git diff --numstat` then `git status --short src tests messages`
Expected:
- `61 44` for the workspace, `18 0` for `tests/list-pages-ui.test.ts`, `1 0` for `tests/list-filters-ui.test.ts`, `1 4` for `tests/list-frame-guards.test.ts` (two rows, two `// 2B-2` comments, one `MIGRATED_LIST_FILES` line) and `0 2` for `tests/visual-foundation-guards.test.ts` (the row and its `// 2B-2` comment; `0 1` if another 2B-2 row were still there, which Step 6's `--budgets` would have shown). `git status` lists only these five files.
- `node -e "const s=require('fs').readFileSync(process.argv[1],'utf8');console.log((s.match(/\r\n/g)||[]).length,(s.match(/\n/g)||[]).length)" src/components/admin/asset-state-review-workspace.tsx` prints `266 266` (249 before; CRLF throughout).

- [ ] **Step 9: Commit**

```bash
git add src/components/admin/asset-state-review-workspace.tsx tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): data-quality review queue on FilterSelect, DataTable and Button (2B-2 task 16)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 5 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 18):** the review queue on `/th/admin/data-quality` at 1440, 1024, 768 and 375. Write nothing to the database: never press "สแกนรายการใหม่" (it creates review rows), and open "แก้ไข"/"ยกเว้น" only to press "ยกเลิก".
- filters 40px (44 at 375) with 13px labels; review status has no "ทั้งหมด", the other two start with it; a change reloads at page 1
- table header white 13/500 faint; at 768 and 1024 the table scrolls inside the panel, the actions column stays pinned on the right with its inner line, and the hint line shows only while it overflows; at 1440 no hint
- the foot reads "ทั้งหมด N รายการ · หน้า 1 จาก M" in th-TH digits; "ถัดไป" loads page 2 and the line changes (NVDA reads it, `aria-live`); both buttons are disabled while it loads; with a filter that finds nothing (for example "ยกเว้นแล้ว" with one issue type), the empty state shows a faint inbox icon with the title and description and no foot
- "แก้ไข" opens the existing dialog, "ยกเลิก" closes it and nothing is saved; a read-only account sees "ดูได้เท่านั้น" in the pinned column
- at 375 the phone cards are as before and the foot sits under them
- keyboard: Tab reaches the three selects, the scroll region of the table, the row buttons and the two foot buttons, each with the focus ring
- axe on `/th/admin/data-quality`: no `label` or `aria-*` violation (Task 18 Step 6)

---

### Task 17: `D/admin/integrations/page.tsx` header on `PageHeader` (header only)

Spec §10.3 bullet 2B-2, with ruling I12 (this header moved from 2B-5 to 2B-2 because 2C plan 5 edits this page's `labels`), §8.6 row 18, §4.4.3 row `D/admin/integrations/page.tsx` and §4.3.3 rule 3. One file, one commit. The file has mixed line endings: keep every line's ending as it is.

Rulings this task applies:
- **§4.4.3, §4.3.3 rule 3:** the hand-written `h1` block becomes `<PageHeader title={t("title")} meta={t("subtitle")} />`. The old `max-w-3xl` of the subtitle is the meta row's own `max-w-3xl`. No actions and no back link (the page has none today). The page root is already `space-y-6`. LFG LH1 drops by 1.
- **I12, fence (h):** the `<IntegrationClientManager … />` element and its `labels` object stay byte-for-byte as they are (2C plan 5 adds `confirmScopeExpansionAction` beside `confirmScopeExpansion`). `p2b2-fence.mjs 17` proves it. After this commit `confirmScopeExpansion` is at `:50` (it was `:52`); Task 19 writes that into DH for 2C plan 5.
- **Line endings (the file is `i/lf w/mixed`):** lines 1–42, 55–61 and 77–80 end in CRLF, lines 43–54 and 62–76 in LF (inside the `labels` object). Both edits sit in CRLF lines (2 and 16–19). `t17-header.mjs` makes them with CRLF and leaves every other byte alone; do not let an editor normalize the file. After the edit the file has 51 CRLF in 78 line breaks (53 in 80 before).
- **Ruling (e):** plans 2B-3…2B-5 never touch this page (spec §8.9 "ห้ามแตะ" names it), so it joins `MIGRATED_LIST_FILES`.
- **Ruling (j), I16:** `tests/list-pages-ui.test.ts` gets one "has" test for this page.
- **Ruling (TDD order):** the test and the lowered budget come first and fail; then the page changes.

What users will see on `/th/admin/integrations`: the title is weight 600 (was bold) with the subtitle in the 13px meta line under it. Everything below the header is unchanged.

Not in this task:
- `c/admin/IntegrationClientManager.tsx` and the page's `labels` object (2C plan 5; the manager's own counts, tiles and table are 2C plan 4 or 2D, R-e, R-f)
- messages (no key changes), docs (Task 19). Do not run a formatter.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/admin/integrations/page.tsx` (`i/lf w/mixed`; 2 exact replacements through `t17-header.mjs`)
- Modify: `tests/list-pages-ui.test.ts` (`i/lf w/crlf`; one block appended through `p2b2-admin-edit.mjs`)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`), through `p2b-budget.mjs` only
- Temp folder only, never committed: `t17-pages-block.ts`, `t17-header.mjs`; Task 15's scripts are already there

**Must keep passing without edits:**
- `tests/integration-api-client-admin.test.ts` (12 tests; for this page: `requirePagePermission(locale, "setting", "view")`, `getTranslations("integrationApiPage")`, `IntegrationClientManager`, `labels={{` and no `tokenHash`)
- `tests/mobile-field-navigation.test.ts`, `tests/form-migration-guards.test.ts` (`IntegrationClientManager.tsx` is a batch 4 file and is not touched), `tests/list-primitives-ui.test.ts`
- `tests/list-frame-guards.test.ts` and `tests/visual-foundation-guards.test.ts`: every row of the other files

**Interfaces:**
- Consumes: 2B-1 `PageHeader({ title, meta?, actions?, back?, breadcrumbs?, compactOnMobile?, className? })` from `@/components/ui/page-header`; Task 15's `<temp>/p2b2-t15-precheck.mjs`, `p2b2-admin-edit.mjs`, `p2b2-fence.mjs`, `p2b1-tw-probe.mjs`; Task 0's `p2b1-precheck.mjs`, `p2b-budget.mjs`.
- Produces: LFG `BUDGETS.LH1` holds no row of the page and no `// 2B-2` group (this was its last 2B-2 row); `MIGRATED_LIST_FILES` holds the page; `tests/list-pages-ui.test.ts` has the test `integrations: the header is PageHeader …`. After this task the guard totals of the rows Tasks 15–17 own equal spec §10.4 table C column 2B-2 (LH1 25, LS1 17, R7 17 in 11, LF1 2, LV1 19).

| guard | `D/admin/integrations/page.tsx` before → after | plan total before → after (when Tasks 1–16 reached their numbers) |
|---|---|---|
| LFG LH1 | 1 → – | 26 → 25 |
| `MIGRATED_LIST_FILES` | – → joins | +1 |

- [ ] **Step 1: Check what this task builds on (and save the header script)**

Run: `git status --short src tests messages` then `node <temp>/p2b2-t15-precheck.mjs 17`
Expected: `git status` prints nothing. The script prints (exit 0):
```
ok      2B-1: PageHeader
ok      2B-1: StatStrip with value: string
ok      2B-1: DataTable (framed, minWidth, scrollHint) and its parts, DataTableRow and DataTableFoot among them
ok      2B-1: FilterSelect (options, allLabel, select props)
ok      2A: Button busy, ActionEmptyState, formatCount
ok      common.pagination, common.pageOf ({page}, {total}) and common.tableScrollHint in th and en
ok      src/app/[locale]/(dashboard)/admin/integrations/page.tsx is mixed and unchanged since e3f20ce (hash 6ed665b2206a79c7)
ok      src/app/[locale]/(dashboard)/admin/integrations/page.tsx is not in MIGRATED_LIST_FILES yet
ok      the 2C files beside these pages and FMG are unchanged since e3f20ce
ok      tests/list-pages-ui.test.ts holds the tests of the earlier tasks of this group only
info    src/app/[locale]/(dashboard)/admin/integrations/page.tsx: mixed
info    tests/list-pages-ui.test.ts: CRLF
info    tests/list-frame-guards.test.ts: CRLF
preconditions hold for Task 17
```
On any `MISSING` line, stop and report it.

Run: `node <temp>/p2b1-precheck.mjs --file D/admin/integrations/page.tsx`
Expected (after the header lines; exit 0):
```
file    src/app/[locale]/(dashboard)/admin/integrations/page.tsx (mixed) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LH1        1       1     0     1
args    LH1=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol "src/app/[[]locale]/(dashboard)/admin/integrations/page.tsx" tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf    w/mixed` for the page, `i/lf    w/crlf` for the two tests.

Save this script as `<temp>/t17-header.mjs` (never in the repo):

```js
// t17-header.mjs: run from the repo root (plan 2B-2 Task 17). Makes the two replacements of the integrations header in a
// file whose lines end in CRLF except lines 43–54 and 62–76 (LF). Both old snippets sit in CRLF lines, so the script
// matches and writes CRLF there and leaves every other byte alone. Writes nothing unless each snippet is found once.
// Never commit this file.
import { readFileSync, writeFileSync } from "node:fs"

const path = "src/app/[locale]/(dashboard)/admin/integrations/page.tsx"
const edits = [
  [
    ['import { IntegrationClientManager } from "@/components/admin/IntegrationClientManager"', ""],
    ['import { IntegrationClientManager } from "@/components/admin/IntegrationClientManager"', 'import { PageHeader } from "@/components/ui/page-header"', ""],
  ],
  [
    ["      <div>", '        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>', '        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("subtitle")}</p>', "      </div>", ""],
    ['      <PageHeader title={t("title")} meta={t("subtitle")} />', ""],
  ],
]
let text = readFileSync(path, "utf8")
for (const [oldLines, newLines] of edits) {
  const oldText = oldLines.join("\r\n")
  const found = text.split(oldText).length - 1
  if (found !== 1) {
    console.error(`ABORT, nothing written: this snippet is there ${found} times, want 1:\n${oldText}`)
    process.exit(1)
  }
  text = text.replace(oldText, () => newLines.join("\r\n"))
}
writeFileSync(path, text)
console.log(`written: ${path}`)
```

- [ ] **Step 2: Write the failing page test**

Save this block as `<temp>/t17-pages-block.ts` (it starts with one blank line):

```ts

// Plan 2B-2 Task 17 (spec 2B §4.4.3, I12): the integrations header only. IntegrationClientManager and its labels belong
// to 2C plan 5 (it adds confirmScopeExpansionAction there).
test("integrations: the header is PageHeader and the client manager follows it (spec 2B §4.4.3, I12)", () => {
  const source = read(`${D}admin/integrations/page.tsx`)
  assert.match(source, /<div className="space-y-6">\n\s+<PageHeader title=\{t\("title"\)\} meta=\{t\("subtitle"\)\} \/>\n\n\s+<IntegrationClientManager\n\s+labels=\{\{/)
  assert.doesNotMatch(source, /<h1\b/)
})
```

(`read` strips `\r\n`, and the LF lines of this file have no `\r`, so the regex sees `\n` everywhere.)

Run: `node <temp>/p2b2-admin-edit.mjs append <temp>/t17-pages-block.ts tests/list-pages-ui.test.ts`
Expected: `appended <temp>/t17-pages-block.ts to tests/list-pages-ui.test.ts (CRLF)`

Run: `node --test tests/list-pages-ui.test.ts`
Expected: FAIL, one more test than before this step and `fail 1`: `integrations: the header is PageHeader and the client manager follows it …` with `The input did not match the regular expression /<div className="space-y-6">\n\s+<PageHeader title=…/`. Every other test passes.

- [ ] **Step 3: Lower the guard row of the page (the failing guard)**

Run: `node <temp>/p2b-budget.mjs D/admin/integrations/page.tsx LH1=1:0 --migrated`
Expected (exit 0):
```
LH1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/admin/integrations/page.tsx
```
With Tasks 1–16 done this was the last row under `LH1`'s `// 2B-2` comment, so the script drops that comment too.

Run: `node --test tests/list-frame-guards.test.ts`
Expected: FAIL, `tests 21 · pass 19 · fail 2`:
- `LH1 page titles (<h1>) come from PageHeader`: `LH1: 26 in 26 files. …` (after Tasks 1–16) with the one line `src/app/[locale]/(dashboard)/admin/integrations/page.tsx: 1 > 0`
- `L0 …`: `LH1 src/app/[locale]/(dashboard)/admin/integrations/page.tsx: 1 > 0`

- [ ] **Step 4: Move the header (`src/app/[locale]/(dashboard)/admin/integrations/page.tsx`, mixed)**

Two exact replacements, both in CRLF lines.

(1) The import (line 2):

Replace:

```tsx
import { IntegrationClientManager } from "@/components/admin/IntegrationClientManager"
```

with:

```tsx
import { IntegrationClientManager } from "@/components/admin/IntegrationClientManager"
import { PageHeader } from "@/components/ui/page-header"
```

(2) The header (lines 16–19):

Replace:

```tsx
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
```

with:

```tsx
      <PageHeader title={t("title")} meta={t("subtitle")} />
```

Run: `node <temp>/t17-header.mjs`
Expected: `written: src/app/[locale]/(dashboard)/admin/integrations/page.tsx` (exit 0). An `ABORT` line means a snippet is not there exactly once in CRLF: report it, do not edit by hand.

Run: `node -e "const s=require('fs').readFileSync(process.argv[1],'utf8');console.log((s.match(/\r\n/g)||[]).length,(s.match(/\n/g)||[]).length)" "src/app/[locale]/(dashboard)/admin/integrations/page.tsx"`
Expected: `51 78` (53 in 80 before: 4 CRLF lines became 1, and 1 CRLF line was added).

Check: `grep -n "<h1\|max-w-3xl" "src/app/[locale]/(dashboard)/admin/integrations/page.tsx"` prints nothing (exit 1), and `grep -n "confirmScopeExpansion" "src/app/[locale]/(dashboard)/admin/integrations/page.tsx"` prints `50:          confirmScopeExpansion: t("confirmScopeExpansion"),`.

- [ ] **Step 5: Prove the 2C part did not move**

Run: `node <temp>/p2b2-fence.mjs 17`
Expected (exit 0):
```
ok      <IntegrationClientManager … /> in src/app/[locale]/(dashboard)/admin/integrations/page.tsx: 57 lines, same as HEAD
ok      src/components/admin/IntegrationClientManager.tsx: no change in the working tree
```

- [ ] **Step 6: Run the tests for this task**

Run: `node --test tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/integration-api-client-admin.test.ts tests/mobile-field-navigation.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `fail 0`: list-frame-guards 21, visual-foundation-guards 26, integration-api-client-admin 12, mobile-field-navigation 7, form-migration-guards 23 (their counts at `e3f20ce`, plus any test an earlier task of this plan added to them), and list-pages-ui with the one test of Step 2 more than before.

Run: `node <temp>/p2b1-precheck.mjs --file D/admin/integrations/page.tsx`
Expected: `(mixed) · in MIGRATED_LIST_FILES`, the row `LH1 0 0 0 1` and `args    (no row holds this file)`; exit 0.

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected: exit 0, `budgets hold: no live count is over its row`, and with Tasks 1–16 at their numbers `LH1 BUDGETS.LH1 25 in 25 rows · live 25 in 25 files · over 0 · slack 0` (spec §10.4 table C, column 2B-2).

- [ ] **Step 7: Prove every class compiles**

Run from the repo root: `node <temp>/p2b1-tw-probe.mjs "src/app/[locale]/(dashboard)/admin/integrations/page.tsx"`
Expected: `checked 1 classes, missing 0` (exit 0): only the root's `space-y-6` is left; the header's classes live in `ui/page-header.tsx`.

- [ ] **Step 8: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, and 1 more test than before Step 2 (1 skipped as before).
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors and no new warning in `src/` or `tests/` (`npx eslint "src/app/[locale]/(dashboard)/admin/integrations/page.tsx" tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts` prints nothing).

Run: `git diff --numstat` then `git status --short src tests messages`
Expected: `2 4` for the page, `8 0` for `tests/list-pages-ui.test.ts` and `1 2` for `tests/list-frame-guards.test.ts` (the row and the `// 2B-2` comment out, the `MIGRATED_LIST_FILES` line in). `git status` lists only these three files. Git may warn about line endings for the page; leave it as it is (mixed is its state at `e3f20ce`).

- [ ] **Step 9: Commit**

```bash
git add "src/app/[locale]/(dashboard)/admin/integrations/page.tsx" tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): integrations header on PageHeader (2B-2 task 17)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 18):** `/th/admin/integrations` at 1440 and 375: title weight 600 ("Integration API Clients"), the subtitle in the 13px meta line, no button row; everything from the summary tiles down is unchanged (create nothing, rotate nothing).

---

### Task 18: Verify, production build and dev-app check (controller runs this task, not an implementer)

**Files:**
- Create then delete: `.claude/launch.json` (temporary; never committed)
- Evidence: `.superpowers/sdd/screenshots/ui-phase2b-plan2/after/` (git-ignored)
- Modify: only files needed to fix problems found here. Each fix gets its own small commit, with a test where one is possible, through an implementer and the normal review.

**Interfaces:**
- Consumes: Tasks 1–17 committed; the Task 0 ids, before images and before load times.
- Produces: the after images and `.superpowers/sdd/<plan workspace>/task-18-findings.md`, which Task 19 turns into the "Dev-app check" bullets.

- [ ] **Step 1: Full verify.** Run `npm run verify` (lint, tests, build). Record the test count and the build page count for Task 20. Run `node <temp>/p2b1-precheck.mjs --budgets`: every guard holds, with slack only on LB1 (1, the `D/maintenance/[id]/page.tsx` row of 2B-4).

- [ ] **Step 2: Production server.** Confirm the dev database (Task 0 Step 5). Create `.claude/launch.json` with `runtimeExecutable: "node"`, `runtimeArgs: ["node_modules/next/dist/bin/next", "start", "-p", "3001"]`, `port: 3001`, `autoPort: false`, and start it with `preview_start`. Log in with the seed admin; do not echo the password. Prefer `waitUntil: "load"` plus a short wait over `networkidle` (link prefetch keeps the network busy on a production build).

- [ ] **Step 3: Writes nothing.** Every dialog opened from ⋯ or a row button (พิจารณา, ดำเนินการ, หาไม่พบ, อนุมัติ/ปฏิเสธที่เลือก, the plan state actions) is closed with its cancel button or Esc. Never press a confirm, Save or Submit. Count the POST, PUT, PATCH and DELETE requests while doing so: 0.

- [ ] **Step 4: Screens.** Take every Task 0 view again under the same name in `after/` and compare (height, wrapping, truncation, lost color or shape). Then walk spec §8.6's dev-check table at the widths it names (1440, 1024, 768 and 375), in Thai, plus one English pass, at 100% and 200% zoom:
  - **`/th/disposal`:** `TabNav` for the steps (underline, counts, `aria-current`) · one filter form at every width, its `<summary>` shows "ใช้ตัวกรอง N รายการ" · ⋯ → พิจารณา / ดำเนินการ opens the existing 2C dialog, closing it returns focus to ⋯, and the row does not open · row checkboxes are 44px targets · "ตรวจสอบและอนุมัติ" (`disposalPage.bulkReviewAndApprove`) shows the `busy` spinner style only while busy (do not submit) · `?page=99` lands on the last page · the empty state offers "ล้างตัวกรอง" (secondary) only while a filter is on.
  - **`/th/disposal/batches` · `/th/disposal/batches/<id>`:** pages instead of the old cap of 100 · a batch row opens the batch · page 2 → batch → "กลับ" returns to page 2 · on the batch page the content is not hidden by the bottom bar after `pb-24` went · `StatStrip` and `KeyValueList` · money in the info list carries the baht unit.
  - **`/th/audit/findings`:** the pager total equals the matching summary box · the `StatStrip` cells that filter keep `aria-current` · chips show the round and type filters, each chip removes only its own filter (I24) · the 13-column table scrolls with the hint · "อนุมัติที่เลือก" is primary, "ปฏิเสธที่เลือก" is `danger` (open the dialog, cancel) · selecting rows then changing page clears the selection · the header back button has a left arrow, not `+`.
  - **`/th/audit/rounds` · `/th/audit/rounds/<id>` · `…/pending`:** quick-filter `TabNav` with counts and no tinted fill · rounds page (was unlimited) and pending page (was 200) · the pending summary box shows the full count · ⋯ → "หาไม่พบ" opens the dialog, cancel returns focus to ⋯ · on phones the pending rows keep their 3 buttons · the round's mobile bar changes only its back icon (left arrow) · round page 2 → round → back lands on page 2.
  - **`/th/maintenance` · `/th/maintenance/pm`:** the shared pager (25/50/100, `aria-live`) · PM has pages instead of the cap of 500, in the same order as before (active → paused → ended, then due date) · PM has a back button to `/th/maintenance` and no icon in its h1 (I25) · PM page 2 → edit → "กลับ" and the crumb return to page 2 with the same page size (a save would go there too; do not save) · the PM page keeps its bottom bar in navigation mode · on `/th/maintenance?assetId=<id>` the "เฉพาะทรัพย์สินนี้" chip removes only the asset filter, other filters stay · the empty state reads "ไม่พบบันทึกการซ่อมที่ตรงกับตัวกรอง" with a filter on and offers "บันทึกซ่อม" without one.
  - **`/th/admin/data-quality` · `/th/admin/integrations`:** the new headers · the workspace filter is a `FilterSelect` · its previous/next buttons work · the `IntegrationClientManager` content is unchanged.
  - **Load times:** repeat Task 0 Step 9 on the production server and on the dev server. A page clearly slower than before is recorded as a risk in DH and the findings (no index may be added, B4).

- [ ] **Step 5: Keyboard.** Header Tab order: back → ⋯ → secondary → primary · Tab into a row: the row is highlighted, then the next-step button shows `primary-soft` · ⋯ opens with Enter, arrows move, Esc closes and returns focus to ⋯ · a dialog opened from ⋯ returns focus to ⋯ when cancelled · `TabNav` and the pager take Tab with a visible ring · an overflowing table takes Tab on its scroller (`role="region"`).

- [ ] **Step 6: axe.** Inject `node_modules/axe-core/axe.min.js` with `page.addScriptTag({ path })` (from a script under `.playwright-mcp/` that you delete afterwards) and run `axe.run(main, { runOnly: ["color-contrast", "label", "aria-valid-attr-value", "aria-required-attr", "button-name", "nested-interactive"] })` on `/th/disposal` (1440 and 375), `/th/audit/findings` with a filter on, `/th/audit/rounds/<id>/pending`, `/th/maintenance/pm`, `/th/admin/data-quality`. Expected: 0 violations.

- [ ] **Step 7: Forced colors and reduced motion.** With Playwright `emulateMedia`: focus rings on `TabNav`, the next-step button, ⋯, chips, pager and table scroller · the underline of a selected `StatStrip` cell · the disabled "previous" button stays distinct. Reduced motion: no lingering row transition, the ⋯ sheet does not slide.

- [ ] **Step 8: NVDA and real devices.** If NVDA is not available to you, list these checks for the user and do not mark them done: ⋯ reads "การดำเนินการของ <เลขที่>" and its dialog items read their names · the `TabNav` current step reads as current · the selected `StatStrip` filter cell reads as current · the footer is read on page change · the PM back button reads "กลับ". Real iPhone and iPad: the ⋯ sheet clears the home bar; the pending row buttons and the disposal checkboxes are easy to tap. Add them to the open manual checks; all of them must be done before the one phase-2 deploy.

- [ ] **Step 9: Findings report.** Write `task-18-findings.md` in the plan workspace, in the shape Task 19 fills its markers from (like plan 2B-1's `task-25-findings.md`):
  - **Fixes made:** commit + one line each, or "none".
  - **Checked and passed:** what was checked, where and at which widths, with the results.
  - **Load times:** one line per page, "`/th/audit/findings` <before> → <after> ms", the median of five loads on the dev database (Task 0 Step 9 and Step 4 above), for the six pages.
  - **Found but not caused by plan 2B-2.**
  - **Accepted mixes.**
  - **Still needs a person:** the Step 8 list and anything else not checked.

- [ ] **Step 10: Clean up.** Stop the server and delete `.claude/launch.json` and any helper script you put under the repo (`.playwright-mcp/` and `.superpowers/sdd/` are linted). `git status --short` must show no stray files.

---

### Task 19: Repo documentation for plan 2B-2 (the controller adds the verify numbers and the wiki in Task 20)

Spec §10.6 row 2B-2, §8.14 row 2B-2 and §5.13, with the checklists of §4.10 (`DESIGN.md:573`), §6.12 (`DESIGN.md:459`, the handoff notes of §6.10 item 6) and §9.11 (`DEVELOPER_HANDOFF.md:321`, R1 `{}`). Where a section-file checklist names a file that row 2B-2 does not, it waits for its own plan. Six files change, all CRLF in the working tree (`i/lf w/crlf`): edit them with exact-string replacement, keep the endings, never run a formatter, and match on the quoted strings, not on line numbers (the numbers below are those at `e3f20ce`; Tasks 1–17 do not touch these files).

Rulings made in this task:
- **What goes where (spec §10.6 row 2B-2):**
  - `DESIGN.md`: approve is not green (`:258`) · the filter status of `:462` and a sub-bullet for the folded phone form (§6.12) · R7 after 2B-2 (`:515`) · in the list-page rules, `StatStrip` cells that filter, the B4 sentence with its three exceptions and the page-bound selection, and ⋯ opening a 2C dialog through its handle · the "Empty Values and Numbers" counts after 2B-2 (`:557`). The breadcrumb exception that spec §4.10 calls `DESIGN.md:573` is `:614` now; its words stay ("the page keeps its back button" holds, the PM list got one, I25), and the check script proves they did not change.
  - `docs/14_UI_UX_DESIGN_SYSTEM.md` follows `DESIGN.md`: the `Pagination`, `RowActions` and `StatStrip` rows, and plan 2B-2 in the registry row of the 2B spec (the registry rule at the top of that table).
  - `docs/11_FEATURE_LIST.md`: `:183` and the rows of the lists that page now (findings, pending, rounds, PM, the repair list, a new disposal batches row) plus the departments row, which plan 2B-1 left to 2B-2 (§10.6 row 2B-1 has no feature-list column).
  - `docs/07_UAT_CHECKLIST.md`: one new section with 7 items (page 3 → record → back to page 3, the last row of the last page, and the checks of spec §8.6's dev-check table that need real data).
  - `DEVELOPER_HANDOFF.md`: the 2B-2 section before `## Open Go-Live Decisions` ("2C plan 3 may start", the shared-file table of spec §8.6 with the line numbers after Tasks 1–2 and 6–7, the count-query load-time risk, what is handed on to 2C plans 3–5), and one pointer in each older bullet this plan made stale: R1 at `:321`, the findings back button at `:494`, the plan-3 line of the 2C plan 1 pipeline at `:442`, and the "Next" line of the 2B plan 1 section at `:516`.
  - `docs/99_CHANGELOG.md`: the Thai entry under `## <today>`, shaped like the 2B-1 entry.
  - `.impeccable/design.json`: **no change**. No component entry changes in 2B-2: the plan adds no primitive, the "Stat Strip" entry already describes the filter cell with `aria-current=page`, and the "Row Actions" entry already says the menu holds every other action (how a caller opens a 2C dialog from it is a page rule, in `DESIGN.md`).
- **The line numbers handed to 2C** are those in the files after Tasks 1–17 (scratch replay of the plan text from `e3f20ce`). The check script recomputes each one from the files and the FMG rows, so a Task 18 fix that moved a line fails the check and prints the line to write.
- **The guard numbers** are the live totals after Task 17 (spec §10.4 table C as corrected by the controller: LB1 budget 12, live 11). If Step 1 prints other totals, write those.
- **The findings markers** (`<from task-18-findings.md>` three times in the handoff, `<จาก task-18-findings.md>` once in the changelog) come from `.superpowers/sdd/<plan workspace>/task-18-findings.md`, in the shape of the 2B plan 1 bullets: what was checked, the results, fixes, accepted mixes, existing issues and what still needs a person; the load-time marker takes the before → after medians of the six pages. Task 20 adds its verify bullet directly above "Dev-app check (Task 18)" and "ตรวจบนแอป (Task 18)".
- **Dates:** the handoff heading and the changelog date use the day this task runs (`<today>`). If that day is 2026-10-13, the entry goes under the existing `## 2026-10-13` heading, above the 2B-1 entry; otherwise a new date block goes on top with the `---` separator the file uses.
- **The plan file name:** the docs link `docs/superpowers/plans/2026-10-13-ui-phase2b-plan2.md`. If the controller saved plan 2B-2 under another name, replace that path everywhere in this task (the check script's `PLAN` included) before Step 2.
- **The findings UAT item uses the browser Back button.** Spec §5.13 writes "findings page 3 → open the asset → back to page 3", but a finding's row opens the asset page without `returnTo` (spec §5.9.2 row 3 gives `auditFindingsReturnHref` to the disposal links only, and `disposal/new` drops it, I22). The page lives in the URL, so the browser's Back returns to page 3; the lists whose record pages read `returnTo` get the item with the page's own "กลับ".

**Files:**
- Modify: `DESIGN.md` (CRLF, `i/lf w/crlf`; 8 replacements): §2 Where Color Lives (`:258`) · §5 Inputs Migration (`:462`) and List filters (`:467-468`) · §5 Data Tables (`:515`), Every list page (`:532`, `:534`, `:539`) · Empty Values and Numbers (`:557`)
- Modify: `docs/14_UI_UX_DESIGN_SYSTEM.md` (CRLF; 4 replacements): Shared Components rows `:75`, `:79`, `:80` · the registry row of the 2B spec (`:116`)
- Modify: `docs/11_FEATURE_LIST.md` (CRLF; 8 replacements): Audit `:182`, `:183`, `:196`, `:199` · Maintenance `:217`, `:220` · Disposal `:229` · Master Data `:261`
- Modify: `docs/07_UAT_CHECKLIST.md` (CRLF; 1 replacement): a new section before `## Adaptive UI Release Gate` (`:289`)
- Modify: `DEVELOPER_HANDOFF.md` (CRLF; 4 replacements): `:321`, `:442`, `:494`, and `:516-518` (the 2B plan 1 "Next" line and a new section before `## Open Go-Live Decisions`)
- Modify: `docs/99_CHANGELOG.md` (CRLF; 1 or 2 replacements): the 2B-2 entry at the top (`:7`)
- Not changed: `.impeccable/design.json` (see the rulings) · `src/`, `tests/`, `messages/` · the wiki (Task 20)
- Temp folder only, never committed: `check-docs-2b2.mjs`

**Interfaces:**
- Consumes: Tasks 1–18 committed; `.superpowers/sdd/<plan workspace>/task-18-findings.md` (dev-app check, load times, still open); the live guard totals (`node <temp>/p2b1-precheck.mjs --budgets`); `<temp>/p2b1-precheck.mjs` from Task 0.
- Produces:
  - `DEVELOPER_HANDOFF.md` section `## UI Round 4 Phase 2B Plan 2 Disposal, Audit, Maintenance, Data-Quality and Integration Lists (<today>)` with a `- Dev-app check (Task 18):` bullet; `docs/99_CHANGELOG.md` entry `### หน้ารายการตัดจำหน่าย ตรวจนับ และซ่อมบำรุง (UI รอบ 4 เฟส 2B plan 2)` with a `- **ตรวจบนแอป (Task 18):**` bullet. Task 20 adds its verify bullet directly above each.
  - The hand-off of spec §8.6 that 2C plan 3 reads in its Task 0 (the shared-file table), and the line numbers 2C plans 4 and 5 need.
  - `DESIGN.md` rules that plans 2B-3 to 2B-5 follow: `StatStrip` filter cells, the B4 exceptions, page-bound selections, and ⋯ that opens a 2C dialog through its handle.

- [ ] **Step 1: Check the base**

Run: `git diff --quiet e3f20ce HEAD -- DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md docs/11_FEATURE_LIST.md docs/07_UAT_CHECKLIST.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md .impeccable/design.json && echo DOCS-UNCHANGED`
Expected: `DOCS-UNCHANGED` (Tasks 1–18 did not touch them; if a Task 18 fix did, re-read the quoted strings below against the file).

Run: `git ls-files --eol DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md docs/11_FEATURE_LIST.md docs/07_UAT_CHECKLIST.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md .impeccable/design.json`
Expected: `i/lf    w/crlf` for all seven.

Run: `ls docs/superpowers/plans/2026-10-13-ui-phase2b-plan2.md .superpowers/sdd/*/task-18-findings.md`
Expected: both exist (the docs link the plan; the findings fill the markers). If the plan has another name, see the rulings.

Run: `git status --short src tests messages` then `git ls-files src/components/disposal/disposal-pagination.tsx src/components/maintenance/maintenance-pagination.tsx src/components/disposal/disposal-row-actions.tsx src/components/audit/audit-pending-row-actions.tsx`
Expected: `git status` prints nothing; `git ls-files` prints only the two new wrappers (the two pagers were deleted in Tasks 3 and 12).

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected (exit 0): `budgets hold: no live count is over its row`, `MIGRATED_LIST_FILES 51 files`, and these totals:
```
ok      R7  TABLE_HEADER_FILLS  17 in 11 rows · live  17 in 11 files · over 0 · slack 0
ok      LH1 BUDGETS.LH1         25 in 25 rows · live  25 in 25 files · over 0 · slack 0
ok      LH2 BUDGETS.LH2          7 in  5 rows · live   7 in  5 files · over 0 · slack 0
ok      LB1 BUDGETS.LB1         12 in 12 rows · live  11 in 11 files · over 0 · slack 1
          slack D/maintenance/[id]/page.tsx: budget 1 > live 0 (0 → 1 row, expected until its plan)
ok      LP1 BUDGETS.LP1          7 in  7 rows · live   7 in  7 files · over 0 · slack 0
ok      LF1 BUDGETS.LF1          2 in  2 rows · live   2 in  2 files · over 0 · slack 0
ok      LT1 BUDGETS.LT1         36 in 10 rows · live  36 in 10 files · over 0 · slack 0
ok      LT2 BUDGETS.LT2          2 in  2 rows · live   2 in  2 files · over 0 · slack 0
ok      LT3 BUDGETS.LT3          3 in  2 rows · live   3 in  2 files · over 0 · slack 0
ok      LT4 BUDGETS.LT4          1 in  1 rows · live   1 in  1 files · over 0 · slack 0
ok      LT5 BUDGETS.LT5          3 in  2 rows · live   3 in  2 files · over 0 · slack 0
ok      LV1 BUDGETS.LV1         19 in  7 rows · live  19 in  7 files · over 0 · slack 0
ok      LV2 BUDGETS.LV2         98 in 30 rows · live  98 in 30 files · over 0 · slack 0
ok      LV3 BUDGETS.LV3         36 in 10 rows · live  36 in 10 files · over 0 · slack 0
ok      LS1 BUDGETS.LS1         17 in 15 rows · live  17 in 15 files · over 0 · slack 0
ok      LS2 BUDGETS.LS2         20 in  6 rows · live  20 in  6 files · over 0 · slack 0
ok      LK1 BUDGETS.LK1          8 in  8 rows · live   8 in  8 files · over 0 · slack 0
ok      LN1 BUDGETS.LN1          6 in  5 rows · live   6 in  5 files · over 0 · slack 0
ok      LN2 BUDGETS.LN2          7 in  7 rows · live   7 in  7 files · over 0 · slack 0
ok      LR1 BUDGETS.LR1          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
```
These are the numbers Steps 8 and 9 write. If a total differs, write the live one in both places and say so in the task report.

Run: `grep -n "assertWithinBudget(TONE_OPACITY" tests/visual-foundation-guards.test.ts`
Expected: one line ending in `assertWithinBudget(TONE_OPACITY, {})` (R1 `{}`, Task 9).

Run: `node -e "console.log(new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }))"`
Expected: a date such as `2026-10-13`. This is `<today>` in Steps 8 and 9: replace every `<today>` below with it.

- [ ] **Step 2: Write the check script (it fails first).** Save as `check-docs-2b2.mjs` in your temp folder:

```js
// check-docs-2b2.mjs: run from the repo root. Checks the plan 2B-2 docs edits of Task 19, and that the line numbers the
// handoff gives 2C are the ones in the files now. Reads only. Never commit this file.
import { existsSync, readFileSync } from "node:fs"

const PLAN = "docs/superpowers/plans/2026-10-13-ui-phase2b-plan2.md"
const files = ["DESIGN.md", "docs/14_UI_UX_DESIGN_SYSTEM.md", "docs/11_FEATURE_LIST.md", "docs/07_UAT_CHECKLIST.md", "DEVELOPER_HANDOFF.md", "docs/99_CHANGELOG.md", ".impeccable/design.json"]
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
const HANDOFF = "## UI Round 4 Phase 2B Plan 2 Disposal, Audit, Maintenance, Data-Quality and Integration Lists ("
const UAT = "## List Pages UAT (UI round 4 phase 2B)"
const ENTRY = "### หน้ารายการตัดจำหน่าย ตรวจนับ และซ่อมบำรุง (UI รอบ 4 เฟส 2B plan 2)"
const handoff = section("DEVELOPER_HANDOFF.md", HANDOFF)
const uat = section("docs/07_UAT_CHECKLIST.md", UAT)

// The line numbers the handoff hands to 2C (spec §8.6), recomputed from the files and the FMG rows.
const C = "src/components/"
const D = "src/app/[locale]/(dashboard)/"
const lines = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n").split("\n")
const lineOf = (rows, test, from = 0) => {
  for (let index = from; index < rows.length; index += 1) if (test(rows[index])) return index + 1
  return 0
}
const sitesOf = (path, pattern) => lines(path).flatMap((row, index) => (row.match(pattern) ?? []).map(() => index + 1))
const at = (numbers) => numbers.map((number) => `\`:${number}\``).join(", ")
const fmg = lines("tests/form-migration-guards.test.ts")
const fmgRow = (name, file) => {
  const line = lineOf(fmg, (row) => row.includes("[`${C}" + file + "`]"), lineOf(fmg, (row) => row.startsWith(`const ${name}`)))
  return { line, value: (/\]: (\[[^\]]*\]|\d+)/.exec(fmg[line - 1] ?? "") ?? [])[1] }
}
// GF7 (FMG OLD_FIELD_MARKUP, copied), GB1 and GD4.
const OLD_FIELD_MARKUP = /ml-1 text-danger">\*|mb-1\.5 block text-sm font-medium text-foreground|<legend className="mb-2 text-sm font-medium text-foreground"|\b(?:h-4 w-4|h-5 w-5|h-3\.5 w-3\.5) rounded border-border\b|\baccent-primary\b/g
const LOADER2 = /<Loader2\b/g
const REVERSE = /\bflex-col-reverse\b/g
const APPROVAL = "disposal/disposal-bulk-approval.tsx"
const EXECUTION = "disposal/disposal-bulk-execution.tsx"
const BATCH = "audit/audit-findings-batch-actions.tsx"
const REVIEW = "audit/audit-finding-review-actions.tsx"
const tableRow = (guard, name, file, pattern) => {
  const { line, value } = fmgRow(name, file)
  const sites = sitesOf(C + file, pattern)
  return `| ${guard} \`${name}\` \`:${line}\` | \`${file}\` | ${value} | ${sites.length} | ${sites.length ? at(sites) : "—"} |`
}
const floors = [REVIEW, APPROVAL, EXECUTION].map((file) => fmgRow("CONSTRAINT_FLOORS", file))
const fn = (rows, name) => lineOf(rows, (row) => row.startsWith(`function ${name}(`))
const dialogSpan = (rows, name) => {
  const start = lineOf(rows, (row) => row.includes("<AccessibleDialog"), fn(rows, name))
  return `\`:${start}-${lineOf(rows, (row) => row.includes("</AccessibleDialog>"), start)}\``
}
const approval = lines(C + APPROVAL)
const execution = lines(C + EXECUTION)
const batch = lines(C + BATCH)
const review = lines(C + REVIEW)
const confirmStart = lineOf(batch, (row) => row.includes("<ConfirmTextDialog"))
const confirmEnd = lineOf(batch, (row) => row.trim() === "/>", confirmStart)
const dataQuality = lines(`${D}admin/data-quality/page.tsx`)
const ruleForm = lineOf(dataQuality, (row) => row.includes("<DataQualityRuleForm"))
const workspace = lines(`${C}admin/asset-state-review-workspace.tsx`)
const integrations = lines(`${D}admin/integrations/page.tsx`)
const roundDetail = lines(`${D}audit/rounds/[id]/page.tsx`)
const disposal = lines(`${D}disposal/page.tsx`)
const handedOn = [
  tableRow("GF7", "OLD_MARKUP", APPROVAL, OLD_FIELD_MARKUP),
  tableRow("GF7", "OLD_MARKUP", EXECUTION, OLD_FIELD_MARKUP),
  tableRow("GF7", "OLD_MARKUP", BATCH, OLD_FIELD_MARKUP),
  tableRow("GB1", "LOADER2", REVIEW, LOADER2),
  tableRow("GB1", "LOADER2", APPROVAL, LOADER2),
  tableRow("GB1", "LOADER2", EXECUTION, LOADER2),
  tableRow("GB1", "LOADER2", BATCH, LOADER2),
  tableRow("GD4", "REVERSE", EXECUTION, REVERSE),
  `| GF5 \`CONSTRAINT_FLOORS\` ${at(floors.map((row) => row.line))} | \`${REVIEW}\` · \`${APPROVAL}\` · \`${EXECUTION}\` | ${floors.map((row) => `\`${row.value}\``).join(" · ")} | the same (floors, never lowered) | the fields of the dialogs |`,
  `\`DisposalBulkApprovalDialog\` \`:${fn(approval, "DisposalBulkApprovalDialog")}\` with its \`AccessibleDialog\` ${dialogSpan(approval, "DisposalBulkApprovalDialog")}`,
  `\`BulkExecutionDialog\` \`:${fn(execution, "BulkExecutionDialog")}\` with its \`AccessibleDialog\` ${dialogSpan(execution, "BulkExecutionDialog")}, \`BusyLabel\` \`:${fn(execution, "BusyLabel")}\` and \`SharedValueFields\` \`:${fn(execution, "SharedValueFields")}\``,
  `\`<ConfirmTextDialog>\` \`:${confirmStart}-${confirmEnd}\``,
  `\`ReviewDecisionModal\` \`:${fn(review, "ReviewDecisionModal")}\`, \`ActionPlanModal\` \`:${fn(review, "ActionPlanModal")}\` and \`CloseFindingModal\` \`:${fn(review, "CloseFindingModal")}\``,
  `\`<DataQualityRuleForm\` \`:${ruleForm}\` and its \`labels\` \`:${lineOf(dataQuality, (row) => row.includes("labels={{"), ruleForm)}\``,
  `\`{dialog ? <AssetStateReviewDialog\` \`:${lineOf(workspace, (row) => row.includes("{dialog ? <AssetStateReviewDialog"))}\``,
  `\`confirmScopeExpansion\` \`:${lineOf(integrations, (row) => row.includes("confirmScopeExpansion:"))}\``,
  `\`<div className="pb-24 md:pb-0">\` \`:${lineOf(roundDetail, (row) => row.includes('<div className="pb-24 md:pb-0">'))}\` and \`MobileActionBar\` \`:${lineOf(roundDetail, (row) => row.includes("<MobileActionBar"))}\``,
  `whose icon changed (\`:${lineOf(roundDetail, (row) => row.includes('label: tCommon("back"), icon: <ArrowLeft'))}\``,
  `\`bulkApprovalCopy\` \`:${lineOf(disposal, (row) => row.includes("const bulkApprovalCopy"))}\` and \`bulkExecutionCopy\` \`:${lineOf(disposal, (row) => row.includes("const bulkExecutionCopy"))}\``,
]
const missingHandedOn = handedOn.filter((fragment) => !handoff.includes(fragment))

const checks = {
  "every file is CRLF only": files.every((path) => !/(^|[^\r])\n/.test(raw[path])),
  "no <today> or findings marker is left": files.every((path) => none(path, "<today>", "<from task-18-findings.md>", "<จาก task-18-findings.md>")),
  "the plan file the docs link exists": existsSync(PLAN) && once("docs/14_UI_UX_DESIGN_SYSTEM.md", `](superpowers/plans/${PLAN.slice("docs/superpowers/plans/".length)})`) && handoff.includes(`plan \`${PLAN}\``),
  "DESIGN.md: approve is not green (Where Color Lives)":
    once("DESIGN.md", "Approve is not green either: \"อนุมัติที่เลือก\" is the primary button, the \"อนุมัติ\" of a table row is `outline` with its check icon, and \"ปฏิเสธ\" and \"ปฏิเสธที่เลือก\" are `danger`"),
  "DESIGN.md: the filter status after 2B-2 and the folded phone form":
    once("DESIGN.md", "plan 2B-2 those of the disposal queue and the repair list and the three filters of the data-quality review queue", "  - A page has one filter form.") &&
    none("DESIGN.md", "and plans 2B-2 to 2B-5 move the rest.") &&
    before("DESIGN.md", "  - A page has one filter form.", "- Text selection uses `primary-border` behind ink."),
  "DESIGN.md: R7 17 after plan 2B-2": once("DESIGN.md", "44 at the start of 2B, 29 after plan 2B-1, 17 after plan 2B-2;"),
  "DESIGN.md: StatStrip filter cells, the B4 exceptions and selections, and ⋯ through a dialog handle":
    once("DESIGN.md", "the counts cover the whole filtered list, never the rows of one page.", "Where one `count` cannot give the total, the list keeps the rule its own way:", "`planStatePageSlices`", "A selection belongs to the page on screen:", "  - A 2C dialog never sits in the menu.", "`src/components/audit/audit-pending-row-actions.tsx`") &&
    none("DESIGN.md", "a cell can filter the list (see Cards / Containers).") &&
    before("DESIGN.md", "  - A 2C dialog never sits in the menu.", "**Asset register pattern (2026-10-07).**"),
  "DESIGN.md: the empty-value counts after 2B-2, and the breadcrumb exception kept":
    once("DESIGN.md", "After plan 2B-2, guard LV2 counts 98 typed `\"-\"`, LV1 19 bare `toLocaleString()` calls and LV3 36 `formatCurrency(` calls on screens (113, 20 and 42 after plan 2B-1).", "the 20px-tall breadcrumb links (one link per trail, and the page keeps its back button)") &&
    none("DESIGN.md", "After plan 2B-1, guard LV2 counts 113"),
  "docs/14: the Pagination, RowActions and StatStrip rows, and plan 2B-2 in the registry":
    once("docs/14_UI_UX_DESIGN_SYSTEM.md", "(a list cut in memory clamps instead); links keep `page` and `pageSize`, and so does the `returnTo` of each record link; counts above the list cover every page |", "to open a 2C dialog, a small client wrapper renders the dialog's button outside the menu with `hideTrigger`, calls its `open()` handle and passes `returnFocusRef={openerRef}`; a dialog without a handle keeps its button in the cell |", "| Counts above a list | `StatStrip` | values already formatted and counted over the whole filtered list;", "sequences plan 2B-2 (the disposal, audit, maintenance, data-quality and integration lists, five of them with real pages); plans 2B-3 to 2B-5 follow (spec §10.3). |") &&
    none("docs/14_UI_UX_DESIGN_SYSTEM.md", "the sidebar and the form headers); plans 2B-2 to 2B-5 follow"),
  "docs/11: the paged lists and their way back":
    once("docs/11_FEATURE_LIST.md", "25/50/100 rounds per page, cut in memory after the view filter", "the rounds list's own `returnTo` also carries its page and page size", "the pending list pages on the server (25/50/100) and counts every pending item", "25/50/100 findings per page on the server", "\"เฉพาะทรัพย์สินนี้\" chip", "the PM list pages on the server by plan state", "| Disposal batches |", "the list pages on the server (25/50/100) and edit → back keeps the page") &&
    before("docs/11_FEATURE_LIST.md", "| Disposal request |", "| Disposal batches |") && before("docs/11_FEATURE_LIST.md", "| Disposal batches |", "| Detail | Request, asset, decision"),
  "docs/07: the list-page UAT section before the release gate, 7 items":
    count("docs/07_UAT_CHECKLIST.md", UAT) === 1 && before("docs/07_UAT_CHECKLIST.md", "## Mobile Field Navigation UAT", UAT) && before("docs/07_UAT_CHECKLIST.md", UAT, "## Adaptive UI Release Gate") && uat.split("\n- [ ] ").length - 1 === 7,
  "handoff: the 2B-2 section after 2B-1 and before Open Go-Live Decisions, with its bullets":
    count("DEVELOPER_HANDOFF.md", HANDOFF) === 1 &&
    before("DEVELOPER_HANDOFF.md", "## UI Round 4 Phase 2B Plan 1 Primitives, Master-Data Lists and Page Headers (", HANDOFF) &&
    before("DEVELOPER_HANDOFF.md", HANDOFF, "## Open Go-Live Decisions") &&
    ["- **2C plan 3 may start once this branch merges**", "- **Real pages (B4,", "- **Risks:**", "  - Load time of the new counts", "- **Handed on to 2C plan 3:**", "- **Handed on to 2C plan 4:**", "- **Handed on to 2C plan 5:**", "- Dev-app check (Task 18):", "- Still open, for a person before the one phase-2 deploy:", "LH1 25 · LH2 7 · LB1 11"].every((literal) => handoff.split(literal).length === 2),
  "handoff: the older bullets point to 2B-2 (R1 {}, the findings back button, 2C plan 3, the 2B-1 Next line)":
    once("DEVELOPER_HANDOFF.md", "R1 tone opacity (none: the budget is `{}` since 2B plan 2", "44 → 29 → 17 after 2B plan 2", "until 2B-2 (plan 2B-2 made it an outline back button with a left arrow).", "starts when 2B plan 2 has merged (the 2B plan 2 section below lists the state of the files they share)", "- Next: 2B plan 2 (below; it unlocks 2C plan 3), then the pipeline above.") &&
    none("DEVELOPER_HANDOFF.md", "R1 tone opacity (budget: `audit/rounds/page.tsx` 1", "- Next: 2B plan 2 (disposal, audit, maintenance, data quality and integrations; it unlocks 2C plan 3)"),
  "handoff: the shared-file table and the 2C line numbers are the live ones": missingHandedOn.length === 0,
  "changelog: the 2B-2 entry first under the newest date, above the 2B-1 entry":
    once("docs/99_CHANGELOG.md", ENTRY, "- **ตรวจบนแอป (Task 18):**") &&
    new RegExp(`^# [^\\n]*\\n[\\s\\S]*?\\n---\\n\\n## \\d{4}-\\d{2}-\\d{2}\\n\\n${ENTRY.replace(/[()]/g, "\\$&")}\\n`).test(text["docs/99_CHANGELOG.md"]) &&
    before("docs/99_CHANGELOG.md", ENTRY, "### หน้ารายการและโครงหน้า ชุดแรก (UI รอบ 4 เฟส 2B plan 1)"),
}
let failed = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}`)
  if (!ok) failed += 1
}
if (missingHandedOn.length) console.log(`the handoff section lacks these live fragments:\n${missingHandedOn.join("\n")}`)
process.exit(failed ? 1 : 0)
```

- [ ] **Step 3: Run it**

Run: `node <temp>/check-docs-2b2.mjs`
Expected: exit 1. `ok` on "every file is CRLF only" and "no <today> or findings marker is left", `FAIL` on the other 13 lines, then `the handoff section lacks these live fragments:` and the 19 fragments the handoff will hold. The first eight must read:
```
| GF7 `OLD_MARKUP` `:282` | `disposal/disposal-bulk-approval.tsx` | 3 | 1 | `:558` |
| GF7 `OLD_MARKUP` `:283` | `disposal/disposal-bulk-execution.tsx` | 5 | 3 | `:862`, `:893`, `:922` |
| GF7 `OLD_MARKUP` `:285` | `audit/audit-findings-batch-actions.tsx` | 1 | 0 | — |
| GB1 `LOADER2` `:307` | `audit/audit-finding-review-actions.tsx` | 2 | 0 | — |
| GB1 `LOADER2` `:314` | `disposal/disposal-bulk-approval.tsx` | 4 | 3 | `:552`, `:553`, `:565` |
| GB1 `LOADER2` `:315` | `disposal/disposal-bulk-execution.tsx` | 2 | 2 | `:961`, `:983` |
| GB1 `LOADER2` `:318` | `audit/audit-findings-batch-actions.tsx` | 2 | 0 | — |
| GD4 `REVERSE` `:339` | `disposal/disposal-bulk-execution.tsx` | 1 | 1 | `:929` |
```
and the other eleven carry `:236`, `:255`, `:256` · `:511`, `:539-569` · `:734`, `:802-976`, `:980`, `:989` · `:124-138` · `:181`, `:279`, `:392` · `:150`, `:152` · `:214` · `:50` · `:437`, `:490` · `:495` · `:206`, `:251`. These are the numbers Step 8 writes. If any differs (a Task 18 fix moved a line), use the printed fragment in Step 8 instead of the text below and say so in the task report.

- [ ] **Step 4: `DESIGN.md` (8 replacements)**

(1) §2 The Where Color Lives Rule. Replace:

```
Number strips (`StatStrip`) have no tone fill either: a cell that needs action gets a warning foot line with its icon, and the cell of the filter in use gets `primary-soft` with a 2px primary line.
```

with:

```
Number strips (`StatStrip`) have no tone fill either: a cell that needs action gets a warning foot line with its icon, and the cell of the filter in use gets `primary-soft` with a 2px primary line. Approve is not green either: "อนุมัติที่เลือก" is the primary button, the "อนุมัติ" of a table row is `outline` with its check icon, and "ปฏิเสธ" and "ปฏิเสธที่เลือก" are `danger` (plan 2B-2 took the findings buttons off `bg-success` and the solid `bg-danger`).
```

(2) §5 Inputs / Fields, Migration. Replace:

```
List-page filters belong to 2B: plan 2B-1 moved the filter forms of the master-data lists and the user list (see **List filters** below), and plans 2B-2 to 2B-5 move the rest.
```

with:

```
List-page filters belong to 2B: plan 2B-1 moved the filter forms of the master-data lists and the user list, plan 2B-2 those of the disposal queue and the repair list and the three filters of the data-quality review queue (see **List filters** below), and plans 2B-3 to 2B-5 move the rest.
```

(3) §5 Inputs / Fields, List filters: a sub-bullet after the chips. Replace:

```
  - `FilterChipList` shows one removable chip for each active filter that is not visible on screen. The whole chip is one link named "<remove label>: <filter>" (8px corners, `primary-soft`, 36px from `md`, 44px below), and "ล้างทั้งหมด" is a text link after the chips.
- Text selection uses `primary-border` behind ink.
```

with:

```
  - `FilterChipList` shows one removable chip for each active filter that is not visible on screen. The whole chip is one link named "<remove label>: <filter>" (8px corners, `primary-soft`, 36px from `md`, 44px below), and "ล้างทั้งหมด" is a text link after the chips.
  - A page has one filter form. Where phones fold it into a `<details>`, the same component renders twice (in the `<details>` and in `FilterPanel className="hidden md:block"`), its field ids come from `useId`, and the `<summary>` says how many filters are on ("ใช้ตัวกรอง N รายการ" in `text-meta num`), never a command it cannot run (the disposal queue). A client list that filters without a form (the data-quality review queue) uses controlled `FilterSelect`s that reload page 1.
- Text selection uses `primary-border` behind ink.
```

(4) §5 Data Tables, the R7 sentence of the opening paragraph. Replace:

```
44 at the start of 2B, 29 after plan 2B-1;
```

with:

```
44 at the start of 2B, 29 after plan 2B-1, 17 after plan 2B-2;
```

(5) §5 Data Tables, Every list page, the numbers. Replace the whole line:

```
- **Numbers:** `StatStrip` above the table for the counts a person scans; a cell can filter the list (see Cards / Containers).
```

with:

```
- **Numbers:** `StatStrip` above the table for the counts a person scans; the counts cover the whole filtered list, never the rows of one page. A cell that filters the list is a link (`href`, plus `scroll: false` where the page keeps its scroll position); the cell of the filter in use takes `current` and reads as `aria-current="page"`, and on the findings list the pager's total equals that cell's count. A count that needs action takes `attention` (see Cards / Containers).
```

(6) §5 Data Tables, Every list page, pages on the server. Replace the whole line:

```
- **Pages on the server:** `page` and `pageSize` (25, 50 or 100; 25 by default) live in the URL and are read with `parseListPage` (`src/lib/list-pagination.ts`). The query takes `listPageWindow` and counts the total in the same `Promise.all`, with the old `orderBy` plus `{ id: "asc" }`. A page past the end redirects to the last page (`lastListPage`), and links keep the page and its size (`appendListPage`), so `returnTo` brings a person back to the same page. A main list never caps its rows with a fixed `take`.
```

with:

```
- **Pages on the server:** `page` and `pageSize` (25, 50 or 100; 25 by default) live in the URL and are read with `parseListPage` (`src/lib/list-pagination.ts`). The query takes `listPageWindow` and counts the total in the same `Promise.all`, with the old `orderBy` plus `{ id: "asc" }`. A page past the end redirects to the last page (`lastListPage`), and links keep the page and its size (`appendListPage`), so `returnTo` brings a person back to the same page. A main list never caps its rows with a fixed `take`. Where one `count` cannot give the total, the list keeps the rule its own way: the audit rounds list reads every round (its view tabs count them all) and shows a slice of the filtered rounds, with a page past the end clamped to the last page instead of a redirect; the PM list counts its plans per state with `groupBy` and reads one window per state (`planStatePageSlices`, `src/lib/preventive-maintenance.ts`), so active, paused and ended plans keep their order across pages; the findings list takes its total from the strip count when the queue is one the strip counts. A selection belongs to the page on screen: changing the page, its size or a filter clears it (the disposal providers take `selectionKey`, the findings panel takes it as its `key`).
```

(7) §5 Data Tables, `RowActions`, a sub-bullet after the delete one. Replace:

```
  - `deleteAction` adds "ลบ" last, after a separator. It asks the shared delete confirm and returns focus to ⋯. The trigger and the menu carry `data-no-row-click`, so a click in them never opens the row (guard LR1: no `…DeleteButton` in a row).
```

with:

```
  - `deleteAction` adds "ลบ" last, after a separator. It asks the shared delete confirm and returns focus to ⋯. The trigger and the menu carry `data-no-row-click`, so a click in them never opens the row (guard LR1: no `…DeleteButton` in a row).
  - A 2C dialog never sits in the menu. When the next step or a ⋯ item opens one ("พิจารณาคำขอ", "บันทึกตัดจำหน่ายจริง", "บันทึกไม่พบ"), a small client wrapper (`src/components/disposal/disposal-row-actions.tsx`, `src/components/audit/audit-pending-row-actions.tsx`) renders the dialog's own button outside the menu with `hideTrigger` and a ref, calls its `open()` from `onSelect`, and passes `returnFocusRef={openerRef}`: `RowActions` points `openerRef` at the button that was used, so closing the dialog returns focus there. The wrapper stops the events of the dialog portal before they reach the row, so a click in the dialog never opens the record. A dialog without an `open()` handle keeps its button in the cell (the findings review buttons, the PM plan state actions).
```

(8) §5 Empty Values and Numbers. Replace:

```
After plan 2B-1, guard LV2 counts 113 typed `"-"` and LV1 20 bare `toLocaleString()` calls on screens.
```

with:

```
After plan 2B-2, guard LV2 counts 98 typed `"-"`, LV1 19 bare `toLocaleString()` calls and LV3 36 `formatCurrency(` calls on screens (113, 20 and 42 after plan 2B-1).
```

Leave §5 Accessibility's breadcrumb exception ("the page keeps its back button", `:614`, the `DESIGN.md:573` of spec §4.10) as it is: the PM list has a back button since Task 13 (I25), so the sentence still holds.

- [ ] **Step 5: `docs/14_UI_UX_DESIGN_SYSTEM.md` (4 replacements)**

(1) Shared Components, the `Pagination` row. Replace:

```
| Page links under a table | `Pagination` in `DataTable footer`, with `parseListPage`, `listPageWindow`, `lastListPage` and `appendListPage` (`src/lib/list-pagination.ts`) | 25/50/100; a page past the end redirects to `lastListPage`; links keep `page` and `pageSize` |
```

with:

```
| Page links under a table | `Pagination` in `DataTable footer`, with `parseListPage`, `listPageWindow`, `lastListPage` and `appendListPage` (`src/lib/list-pagination.ts`) | 25/50/100; a page past the end redirects to `lastListPage` (a list cut in memory clamps instead); links keep `page` and `pageSize`, and so does the `returnTo` of each record link; counts above the list cover every page |
```

(2) The `RowActions` row. Replace:

```
| A next step and more actions in a table row | `RowActions` | data-only props; delete through `deleteAction`, never a delete button in the row; `menuLabel={tCommon("moreActionsFor", { code })}` |
```

with:

```
| A next step and more actions in a table row | `RowActions` | data-only props; delete through `deleteAction`, never a delete button in the row; `menuLabel={tCommon("moreActionsFor", { code })}`; to open a 2C dialog, a small client wrapper renders the dialog's button outside the menu with `hideTrigger`, calls its `open()` handle and passes `returnFocusRef={openerRef}`; a dialog without a handle keeps its button in the cell |
```

(3) The `StatStrip` row. Replace:

```
| Counts above a list | `StatStrip` | values already formatted; no tone fill; `current` on the cell of the filter in use |
```

with:

```
| Counts above a list | `StatStrip` | values already formatted and counted over the whole filtered list; no tone fill; a cell that filters takes `href`, the cell of the filter in use `current`, and a count that needs action `attention` |
```

(4) The registry row of the 2B spec, its last cell. Replace:

```
sequences plan 2B-1 (the primitives, the master-data lists and users, the sidebar and the form headers); plans 2B-2 to 2B-5 follow (spec §10.3). |
```

with:

```
sequences plan 2B-1 (the primitives, the master-data lists and users, the sidebar and the form headers); [`2026-10-13-ui-phase2b-plan2.md`](superpowers/plans/2026-10-13-ui-phase2b-plan2.md) sequences plan 2B-2 (the disposal, audit, maintenance, data-quality and integration lists, five of them with real pages); plans 2B-3 to 2B-5 follow (spec §10.3). |
```

- [ ] **Step 6: `docs/11_FEATURE_LIST.md` (8 replacements)**

(1) Audit, the rounds list. Replace:

```
| Audit rounds action hub | Action-first list with next-action cards, URL-backed quick filters, and ready-to-close/blocker badges for high-volume audit operations |
```

with:

```
| Audit rounds action hub | Action-first list with next-action cards, URL-backed quick filter tabs with counts, and ready-to-close/blocker badges for high-volume audit operations; 25/50/100 rounds per page, cut in memory after the view filter so the tab counts still cover every round, and a page past the end shows the last page |
```

(2) Audit return navigation (`:183`). Replace:

```
scan/pending return to the round detail and round detail returns to the filtered rounds list |
```

with:

```
scan/pending return to the round detail and round detail returns to the filtered rounds list; the rounds list's own `returnTo` also carries its page and page size, so the round detail and the scan screen bring a person back to the same page, and the pending list keeps the round's `returnTo` on its page links |
```

(3) The not-found workflow (the pending list). Replace:

```
| Not-found workflow | Mark pending items as not found from the pending list/zone queue without changing asset status to Lost automatically |
```

with:

```
| Not-found workflow | Mark pending items as not found from the pending list/zone queue without changing asset status to Lost automatically; the pending list pages on the server (25/50/100) and counts every pending item (it stopped at 200 before), desktop rows offer "สแกนรายการนี้" with ⋯ ("ดูทรัพย์สิน", "บันทึกไม่พบ"), and marking the last item of the last page lands on the new last page |
```

(4) The findings workflow, its last words. Replace:

```
evidence attachments, batch actions, and filtered Excel/PDF exports |
```

with:

```
evidence attachments, batch actions, and filtered Excel/PDF exports; 25/50/100 findings per page on the server (it showed the first 200 before), the pager total equal to the strip count of the queue in use, removable chips for the round and type filters that drill-down links set, and batch decisions limited to the page on screen |
```

(5) Maintenance, the repair list, its filters. Replace:

```
| Repair list | Status/date/search/asset filters, 
```

with:

```
| Repair list | Status/date/search filters (25/50/100 per page; "กรอง" keeps the page size), an asset filter shown as a removable "เฉพาะทรัพย์สินนี้" chip that keeps the other filters, 
```

(6) Maintenance, PM plans, the end of the row. Replace:

```
disposal execution ends the asset's plans |
```

with:

```
disposal execution ends the asset's plans; the PM list pages on the server by plan state (active, paused, ended, then the next due date; 25/50/100; it showed up to 500 before) and its edit page returns to the list page it came from |
```

(7) Disposal: the queue and a new batches row. Replace:

```
| Disposal request | Create and list disposal requests |
```

with:

```
| Disposal request | Create and list disposal requests; the queue has stage tabs, one filter form, 25/50/100 pages and a row next step that opens the review or execution dialog |
| Disposal batches | `/disposal/batches` lists bulk batches 25/50/100 per page on the server (it showed only the newest 100 before); a batch page's Back returns to the batch list page it came from, otherwise to the queue |
```

(8) Master Data, departments (plan 2B-1 paged it; §10.6 left its feature row to this plan). Replace:

```
| Departments | CRUD, optional company relation, department code/name |
```

with:

```
| Departments | CRUD, optional company relation, department code/name; the list pages on the server (25/50/100) and edit → back keeps the page |
```

- [ ] **Step 7: `docs/07_UAT_CHECKLIST.md` (1 replacement)**

A new section before the release gate. Replace:

```
## Adaptive UI Release Gate
```

with:

```
## List Pages UAT (UI round 4 phase 2B)

- [ ] Return to the same page: on page 2 or 3 of `/th/audit/rounds`, `/th/disposal/batches`, `/th/maintenance/pm`, `/th/disposal`, `/th/maintenance` and `/th/master-data/departments` (with the page size set to 50 on one of them), open a record (round detail, batch, PM edit, request, repair record, department edit) and go back with the page's "กลับ" button or its crumb. Confirm the list opens on the same page with the same page size and filters. On a phone the round detail's bottom-bar "กลับ" (left arrow) does the same, and a saved PM plan returns to that page too.
- [ ] On page 3 of `/th/audit/findings` (or the last page of a queue with more than 50 findings), open a finding's asset and use the browser Back button: the findings list returns on page 3 with the same queue, search and page size.
- [ ] Last row of the last page: on `/th/audit/rounds/<id>/pending`, mark the only item of the last page "บันทึกไม่พบ" (⋯ on desktop) and confirm the list lands on the new last page and the count box drops by one; on `/th/audit/findings?status=pending`, decide the only finding of the last page and confirm the queue lands on its new last page; on `/th/master-data/departments`, delete the only row of the last page through ⋯ → "ลบ" → confirm, and confirm the list lands on the new last page. Opening `?page=99` on each paged list opens its last page (`/th/audit/rounds` shows the last page and keeps the URL).
- [ ] Totals: the pager total of `/th/audit/findings` equals the number in the strip cell of the queue in use; the count box of `/th/audit/rounds/<id>/pending` counts every pending item (more than 200 when the round has more); `/th/disposal/batches` reaches batches older than the newest 100; `/th/maintenance/pm` reaches plans past the first 500, in the same order (active, paused, ended, then the next due date).
- [ ] Dialogs opened from a row: on `/th/disposal` at desktop width, open "พิจารณาคำขอ" or "บันทึกตัดจำหน่ายจริง" from a row, cancel it, and confirm focus returns to that button and the request page did not open; on `/th/audit/rounds/<id>/pending`, do the same with ⋯ → "บันทึกไม่พบ" (focus returns to ⋯). On every master-data list, ⋯ → "ลบ" asks the same confirmation as before and Cancel returns focus to ⋯.
- [ ] Filters and chips: on `/th/audit/findings` opened from a round or a report, the "รอบตรวจ: …" and "ประเภท: …" chips each remove only their own filter; on `/th/maintenance?assetId=<id>`, the "เฉพาะทรัพย์สินนี้" chip removes only the asset filter and keeps the search, status, dates and page size, and "กรอง" keeps the chosen page size; on `/th/disposal` at 375px the folded filter panel reads "ใช้ตัวกรอง N รายการ".
- [ ] Selections stay on one page: on `/th/audit/findings` (approver), tick findings, then go to the next page or another queue and confirm the ticks are cleared; "อนุมัติที่เลือก" is the primary button and "ปฏิเสธที่เลือก" the red-outlined one. On `/th/disposal`, "เลือกหน้านี้" selects only rows of the page on screen.

## Adaptive UI Release Gate
```

- [ ] **Step 8: `DEVELOPER_HANDOFF.md` (4 replacements)**

(1) Phase 2A, the Ratchet guards bullet (`:321`). Replace:

```
R1 tone opacity (budget: `audit/rounds/page.tsx` 1, the selected tab's count chip), R7 neutral fills outside table headers (none; table-header fills have a budget per file since 2B plan 1, `TABLE_HEADER_FILLS`, 44 → 29),
```

with:

```
R1 tone opacity (none: the budget is `{}` since 2B plan 2, when the selected tab's count chip of `audit/rounds/page.tsx` went with `TabNav`), R7 neutral fills outside table headers (none; table-header fills have a budget per file since 2B plan 1, `TABLE_HEADER_FILLS`, 44 → 29 → 17 after 2B plan 2),
```

(2) 2C plan 1, Deferred, the plan 3 line of the pipeline (`:442`). Replace:

```
    - plan 3 (the bulk disposal dialogs, the audit round forms and `ConfirmTextDialog`) starts when 2B plan 2 has merged
```

with:

```
    - plan 3 (the bulk disposal dialogs, the audit round forms and `ConfirmTextDialog`) starts when 2B plan 2 has merged (the 2B plan 2 section below lists the state of the files they share)
```

(3) 2B plan 1, "Changed before their own plan", its last sentence (`:494`). Replace:

```
The findings "กลับไปรอบตรวจนับ" button still shows the plus icon until 2B-2.
```

with:

```
The findings "กลับไปรอบตรวจนับ" button still shows the plus icon until 2B-2 (plan 2B-2 made it an outline back button with a left arrow).
```

(4) The new section. Replace the last bullet of the 2B plan 1 section and the heading after it (`:516-518`) with the block below, which ends with that same heading. Replace `<today>` with the date of Step 1. Write the three `<from task-18-findings.md>` markers from `task-18-findings.md` in the shape of the 2B plan 1 section's bullets: the load times as one "`/th/audit/findings` <before> → <after> ms" item for each of the six pages (median of five loads, dev database, Task 0 Step 9 and Task 18 Step 4); the "Dev-app check (Task 18)" bullet as one paragraph (what was checked and where, the results, fixes with their commits or "none", accepted mixes, existing issues not caused by 2B-2, what still needs a person); "Still open" as nested bullets when it has more than two items, like the 2B plan 1 section. If Step 3 printed other line numbers, use its fragments in the table and the three "Handed on" bullets.

```
- Next: 2B plan 2 (disposal, audit, maintenance, data quality and integrations; it unlocks 2C plan 3), then the pipeline above.

## Open Go-Live Decisions
```

with:

```
- Next: 2B plan 2 (below; it unlocks 2C plan 3), then the pipeline above.

## UI Round 4 Phase 2B Plan 2 Disposal, Audit, Maintenance, Data-Quality and Integration Lists (<today>)

- Branch `feat/ui-phase2b-plan2` (from `master` `e3f20ce`: 2B plan 1 merged, not deployed). Spec `docs/superpowers/specs/2026-10-12-ui-phase2b-design.md` (its §10 rulings I1–I34 override the section files in `docs/superpowers/specs/2026-10-12-ui-phase2b/`) · plan `docs/superpowers/plans/2026-10-13-ui-phase2b-plan2.md` · canonical values in `DESIGN.md`.
  - Plan 2B-2 moves the 18 files of spec §8.6 onto the 2B-1 primitives (the disposal queue, its batches and a batch's page; audit findings, rounds, a round's detail and its pending list; the repair list and the PM plans; the data-quality page and its review queue; the integrations header) and lets the PM edit page return to the list page it came from (spec §5.9.2 row 6; `maintenance-plan-form.tsx`, a migrated 2C batch 1a file, gets one optional prop while no 2C plan is open). One commit per file; a page goes with its new wrapper, helper or deleted pager, and Task 14 is one commit across the return section, the edit page and the form.
  - No new primitive, schema, migration, API, RBAC, dependency, index or token. The server changes are read-only queries in the pages (`findMany`, `count`, `groupBy`, one `findUnique`).
- **2C plan 3 may start once this branch merges** (spec B7, §8.1): 2B is done with the three batch-3 files it shares with plan 3, `disposal-bulk-approval.tsx`, `disposal-bulk-execution.tsx` and `audit-findings-batch-actions.tsx` ("Handed on to 2C plan 3" below gives their state).
- **Deploy:** none, as for 2B plan 1: one deploy after all of phase 2; `ab1b873` stays the rollback point (no schema change).
- **Real pages (B4, 25/50/100, 25 by default, a page past the end redirects to the last page):**
  - `/audit/findings` (it showed the first 200): `findMany` with `skip`/`take` and `orderBy` `reportedAt desc, id asc`. The total is the strip count for the four counted queues and one `count({ where })` for approved, rejected, exception and all; the round chip reads its code with one `findUnique`. The exports still take the whole filtered set.
  - `/audit/rounds/[id]/pending` (it showed 200): the items load apart from the round, `auditItem.findMany` + `count` in one `Promise.all` after the read-only check; the count box counts every pending item.
  - `/disposal/batches` (it showed the newest 100): `findMany` + `count`.
  - `/maintenance/pm` (it showed up to 500): `groupBy` by `planState`, then one `findMany` window per state from `planStatePageSlices`, so the order stays active → paused → ended, then `nextDueDate`.
  - `/audit/rounds` (unbounded): the query stays whole apart from the `id` tie-break; the filtered rounds are cut in memory, and a page past the end clamps (I21).
  - `returnTo` carries the page and the page size: rounds → round detail and scan, batches → a batch's page (`normalizeDisposalBatchReturnTo`), PM → the edit page (section `"maintenance-pm"`). `/disposal` and `/maintenance` already paged; they gained the redirect past the last page. A round's results keep their own params, moved to `Pagination` and redirect past their last page too.
- **Pages moved:**
  - `/disposal`: `PageHeader` · the stages as `TabNav` with th-TH counts · one `DisposalFilterForm` (in the phone `<details>`, whose summary now reads "ใช้ตัวกรอง N รายการ", and in `FilterPanel` from `md`) · `ContentPanel divided flush` with `DataTable` · `RowActions` through `DisposalRowActions`: the next step "พิจารณาคำขอ" or "บันทึกตัดจำหน่ายจริง" opens the existing 2C dialog through its handle, "ดู" opens the request, ⋯ holds "เปิดคำขอ" and "เปิดใบงานชุด". The next steps carry no icon so their words fit; "บันทึกตัดจำหน่ายจริง" (115px at 13px) still shows cut in the 120px slot, and its accessible name stays whole (accepted for now; a shorter label needs the user's copy approval). The money line under the type is `formatMoney` with the unit; `Pagination` sits once under the cards and the table. The bulk approval and bulk execution lists (Tasks 1–2): the row and page checkboxes on `checkboxVariants` in 44px labels, the toolbar buttons on `Button`, "ตรวจสอบและอนุมัติ" with `busy`.
  - `/disposal/batches` and `/disposal/batches/[id]`: `PageHeader` with `PageBackLink` · `ClickableTableRow` rows with a next-step-only `RowActions` · a batch's page has the batch code as its title, `StatStrip`, `KeyValueList` (money with the unit), `TableEmptyRow`, and no `pb-24` (the shell already leaves room for the bottom navigation).
  - `/audit/findings`: `PageHeader` with the back button "กลับไปรอบตรวจนับ" (it was a primary button with a plus) · one `StatStrip` whose cells filter the queue (`current`; `attention` on pending and overdue above 0) · the queue links as `TabNav` · `FilterChipList` for the round and type filters (I24) · `DataTable` with the scroll hint (13 columns) · the row review buttons stay in the cell on `Button size="sm"` (their dialogs have no handle, I21) · "อนุมัติที่เลือก" is primary and "ปฏิเสธที่เลือก" `danger`, both with `busy` (R-c) · `key={selectionKey}` clears the ticks on every page or filter change.
  - `/audit/rounds`: `QuickFilterBar` is a thin wrapper of `TabNav` with counts (I20) · `StatStrip` for the coverage · desktop rows have `RowActions` (the first open work as the next step, the rest and "ดู" in ⋯), and the phone cards keep their chips at 44px · `TableEmptyRow`.
  - `/audit/rounds/[id]`: `PageHeader` (the code, the badge and the dates in the meta) · `StatStrip` for the numbers, the result buckets (filter cells) and the evidence · `DataTable` with "แก้ไขผลตรวจ" as the next step · `Pagination` replaces `AuditRoundResultPagination` · in the mobile bar only the back icon changed (`ArrowLeft`, B2); the bar and the `pb-24` root stay for 2C plan 5 (O11).
  - `/audit/rounds/[id]/pending`: `PageBackLink` replaces the text link · desktop rows have `RowActions` through `AuditPendingRowActions` ("สแกนรายการนี้", ⋯ "ดูทรัพย์สิน" and "บันทึกไม่พบ" through the `AuditMarkNotFoundButton` handle) · the phone cards keep their three 44px buttons inside the table frame.
  - `/maintenance`: `PageHeader` · `FilterPanel` with `FilterSelect` and `FilterFormActions`; the form keeps `pageSize` · the "เฉพาะทรัพย์สินนี้" chip removes only `assetId` (I24) · the empty state offers "ล้างตัวกรอง" only while a filter is on, otherwise "บันทึกซ่อม" · `DataTable` with the scroll hint; the cost has no "฿" in the table (its head says "(บาท)") and the unit on the phone cards · `Pagination`, still fed by `buildMaintenancePagination` and `buildMaintenancePageHref`.
  - `/maintenance/pm`: `PageHeader` with the new back button to `/maintenance` and no icon in the `h1` (I25) · `ContentPanel divided flush` with `ContentPanelRows` · the row buttons stay in the row (`MaintenancePlanStateActions` has no handle) · `Pagination` in the panel's foot.
  - `/admin/data-quality`: `PageHeader` and one `StatStrip` without tone fills. Its review queue (`asset-state-review-workspace.tsx`): three `FilterSelect`s, `DataTable` with the actions column pinned and the scroll hint, `Button` for the row actions, "สแกนรายการใหม่" with `busy` and its label kept (K13), `ActionEmptyState` without the green check, and a client page bar "ทั้งหมด N รายการ · หน้า x จาก y" in an `aria-live` `nav`. `/admin/integrations`: the header only.
  - After this plan `MasterDataHeader` has one caller left, the asset register (2B-3); plan 2B-5 deletes it.
- **New files and helpers:** `src/components/disposal/disposal-row-actions.tsx` (`DisposalRowActions`) and `src/components/audit/audit-pending-row-actions.tsx` (`AuditPendingRowActions`), the client wrappers that open a 2C dialog from a row through its handle (R-m; the rule is in `DESIGN.md` under `RowActions`) · `normalizeDisposalBatchReturnTo(locale, value)` and the section `"maintenance-pm"` in `src/lib/operational-return-navigation.ts` · `planStatePageSlices(counts, window)` in `src/lib/preventive-maintenance.ts` · `MaintenancePlanForm` takes an optional `returnHref` (default `/${locale}/maintenance/pm`). Deleted with their last callers: `src/components/disposal/disposal-pagination.tsx` and `src/components/maintenance/maintenance-pagination.tsx`.
- **Portal clicks:** React sends the events of a dialog portal up the component tree, so a click inside a dialog opened from a clickable row could reach `ClickableTableRow` and open the record behind it. Both wrappers and the findings row triggers now stop those events, as `RowActions` does for its own menu.
- **Messages:** new `disposalPage.activeFilterCount`, `auditFinding.activeFilters`, `repairRecord.activeFilters`, `repairRecord.emptyFilteredTitle`, `repairRecord.emptyFilteredHelp`; `repairRecord.emptyHelp` now reads 'กด "บันทึกซ่อม" เพื่อเริ่มบันทึก'. The words for clearing a search and removing a chip reuse existing keys (`auditPending.clearSearch`, `asset.clearDrilldownFilter`).
- **Guards:**
  - VFG: R7 `TABLE_HEADER_FILLS` 29 in 20 files → 17 in 11 · R1 `TONE_OPACITY` is `{}` (the count chip went with `TabNav`) · R2 10 in 9 files, unchanged.
  - LFG after this plan (live counts): LH1 25 · LH2 7 · LB1 11 · LP1 7 · LF1 2 · LT1 36 · LT2 2 · LT3 3 · LT4 1 · LT5 3 · LV1 19 · LV2 98 · LV3 36 · LS1 17 · LS2 20 · LK1 8 · LN1 6 · LN2 7 · LR1 0. LB1's budget is 12: its one slack is the `0 → 1` row of `D/maintenance/[id]/page.tsx`, which 2B-4 fills. `MIGRATED_LIST_FILES` holds 51 files, and `MIGRATED_FILTER_FILES` in `tests/list-filters-ui.test.ts` gained the disposal page, the repair list and the review queue (11 files).
  - `tests/form-migration-guards.test.ts` is not edited (spec §8.11): the shared files now count fewer sites than their rows allow, and 2C plan 3 lowers each row when it takes the file.
- **Tests:** no new file. New blocks in `list-pages-ui` (every page and both wrappers), `list-filters-ui`, `list-pagination` (`planStatePageSlices`), `operational-return-navigation` (`normalizeDisposalBatchReturnTo`, `"maintenance-pm"`), `disposal-bulk-approval` and `disposal-bulk-execution-ui`. Edited pins (spec §10.4 table A row 2B-2): `visual-foundation-guards` (R1, R7), `audit-rounds-ux:39`, `audit-round-result-drilldown:138` (and `:128`, whose `href` moved into the `StatStrip` items), `maintenance-pagination-ui` tests 1–2, `disposal-route-structure`, `audit-pending-mobile-ux`, `operational-return-navigation` (appended to, never shortened, I17), `pm-plans-ui:17`, `disposal-queue-ux` (`:43-51`, and `:23` now checks `sticky="right"`), `disposal-bulk-approval:92` and `disposal-bulk-execution-ui:33`.
- **Risks:**
  - Load time of the new counts (spec §10.7 item 3): findings sorts by `reportedAt`, which has no index, and adds a `count` for four of its queues; PM waits twice (`groupBy`, then its windows; `planState` has no index); the rounds list still reads every round. No index was added (B4). Median of five loads on the dev database, before → after: <from task-18-findings.md>.
  - The data-quality review queue still has no guard against out-of-order answers: `load` in `asset-state-review-workspace.tsx` can show an older result after two quick filter changes (spec §6.10 item 6; unchanged in 2B).
  - A raw field in a list file outside `MIGRATED_FILTER_FILES` still has no guard until 2D (I34).
- **Handed on to 2C plan 3:** the three batch-3 files and the batch-1d row triggers are done for 2B, which touches none of them again. In `disposal-bulk-approval.tsx`, `DisposalBulkApprovalDialog` `:511` with its `AccessibleDialog` `:539-569` is untouched; the list part now imports `Button`, `linkVariants` and `checkboxVariants`. In `disposal-bulk-execution.tsx`, `BulkExecutionDialog` `:734` with its `AccessibleDialog` `:802-976`, `BusyLabel` `:980` and `SharedValueFields` `:989` are untouched; the list part imports `Button` and `checkboxVariants`. In `audit-findings-batch-actions.tsx`, `<ConfirmTextDialog>` `:124-138` is untouched and the three buttons are `Button` with `busy`. In `audit-finding-review-actions.tsx` (batch 1d, migrated in 2C plan 1), `ReviewDecisionModal` `:181`, `ActionPlanModal` `:279` and `CloseFindingModal` `:392` are untouched; the four row triggers are `Button size="sm"` and the trigger row stops portal clicks. Their FMG rows (spec §8.6; files under `src/components/`, line numbers after this plan; the FMG comments still name older lines):

| FMG row | File | Budget | Live after 2B-2 | Sites left (all in the dialogs) |
|---|---|---|---|---|
| GF7 `OLD_MARKUP` `:282` | `disposal/disposal-bulk-approval.tsx` | 3 | 1 | `:558` |
| GF7 `OLD_MARKUP` `:283` | `disposal/disposal-bulk-execution.tsx` | 5 | 3 | `:862`, `:893`, `:922` |
| GF7 `OLD_MARKUP` `:285` | `audit/audit-findings-batch-actions.tsx` | 1 | 0 | — |
| GB1 `LOADER2` `:307` | `audit/audit-finding-review-actions.tsx` | 2 | 0 | — |
| GB1 `LOADER2` `:314` | `disposal/disposal-bulk-approval.tsx` | 4 | 3 | `:552`, `:553`, `:565` |
| GB1 `LOADER2` `:315` | `disposal/disposal-bulk-execution.tsx` | 2 | 2 | `:961`, `:983` |
| GB1 `LOADER2` `:318` | `audit/audit-findings-batch-actions.tsx` | 2 | 0 | — |
| GD4 `REVERSE` `:339` | `disposal/disposal-bulk-execution.tsx` | 1 | 1 | `:929` |
| GF5 `CONSTRAINT_FLOORS` `:236`, `:255`, `:256` | `audit/audit-finding-review-actions.tsx` · `disposal/disposal-bulk-approval.tsx` · `disposal/disposal-bulk-execution.tsx` | `[1, 3, 0]` · `[0, 1, 0]` · `[5, 2, 1]` | the same (floors, never lowered) | the fields of the dialogs |

- **Handed on to 2C plan 4:** in `D/admin/data-quality/page.tsx`, `<DataQualityRuleForm` `:150` and its `labels` `:152` (they were `:144`, `:146`) are untouched, for 2C plan 4 to add `severity`. The page also passes `pagination`, `pageOf` and `tableScrollHint` to the review queue, and still passes `scanning`, which the queue no longer reads (its scan button keeps its label, K13). In `src/components/admin/asset-state-review-workspace.tsx`, the dialog element `{dialog ? <AssetStateReviewDialog` `:214` (it was `:193`) and `asset-state-review-dialog.tsx` are untouched.
- **Handed on to 2C plan 5:** in `D/admin/integrations/page.tsx`, `confirmScopeExpansion` `:50` (it was `:52`) sits in the untouched `labels` object; the file keeps its mixed line endings (LF inside `labels`). In `D/audit/rounds/[id]/page.tsx`, `<div className="pb-24 md:pb-0">` `:437` and `MobileActionBar` `:490` (they were `:408`, `:474`) are untouched apart from the back item, whose icon changed (`:495`, `Download` → `ArrowLeft`). In `D/disposal/page.tsx`, `bulkApprovalCopy` `:206` and `bulkExecutionCopy` `:251` (they were `:185`, `:230`) keep their names.
- **Handed on, later:** the findings review dialogs and `MaintenancePlanStateActions` have no `open()` handle, so their buttons stay in the row until one gets a handle · `disposal/new` and `disposal/[id]` still drop a `returnTo` that is not the queue, so the findings page number does not reach the back button of `disposal/new` (I22, phase 3) · the disposal queue's batch links carry no `returnTo` yet, so a batch's page opened from the queue goes back to the queue · the rounds list still reads every round; past about a thousand rounds it needs a two-step query (spec §5.9.2 row 7, phase 3).
- Dev-app check (Task 18): <from task-18-findings.md>
- Before/after screenshots: `.superpowers/sdd/screenshots/ui-phase2b-plan2/before/` and `after/` (git-ignored, on the development machine only).
- Still open, for a person before the one phase-2 deploy: <from task-18-findings.md>, together with the open checks of phase 1, 2A, 2C plans 1–2 and 2B plan 1 above.
- Next: merge this branch; then 2B plan 3 (the asset register) in the main checkout and 2C plan 3 in a worktree beside it (spec §8.1–8.2), then the pipeline above.

## Open Go-Live Decisions
```

Replace the three `<from task-18-findings.md>` markers with the text from the findings; no marker may stay.

- [ ] **Step 9: `docs/99_CHANGELOG.md` (1 or 2 replacements)**

(1) Only if `<today>` is not `2026-10-13`: put a new date block on top. Replace the line `## 2026-10-13` with:

```
## <today>

---

## 2026-10-13
```

(2) The entry, directly under the `## <today>` heading (above `### หน้ารายการและโครงหน้า ชุดแรก (UI รอบ 4 เฟส 2B plan 1)` when `<today>` is 2026-10-13, above `---` otherwise). Replace:

```
## <today>

```

with the block below. Write the "ตรวจบนแอป (Task 18)" bullet from `task-18-findings.md`, in Thai, in the shape of the 2B plan 1 entry's bullet, with the load times before → after of the six pages in it.

```
## <today>

### หน้ารายการตัดจำหน่าย ตรวจนับ และซ่อมบำรุง (UI รอบ 4 เฟส 2B plan 2)

Branch `feat/ui-phase2b-plan2` (จาก `master` `e3f20ce`) · design `docs/superpowers/specs/2026-10-12-ui-phase2b-design.md` (ข้อ 10 ใช้แทนไฟล์ส่วน) · plan `docs/superpowers/plans/2026-10-13-ui-phase2b-plan2.md` · ค่าทั้งหมดอยู่ใน `DESIGN.md`

- **ขอบเขต:** 18 ไฟล์ตามสเปกข้อ 8.6 (คิวตัดจำหน่าย ประวัติชุดคำขอ หน้าชุดคำขอ รายการไม่ตรง รอบตรวจนับ ผลตรวจของรอบ รายการรอตรวจ ซ่อมบำรุง แผน PM ศูนย์กฎคุณภาพข้อมูลและคิวตรวจสถานะ หัวหน้า Integration API) และทางกลับของหน้าแก้ไขแผน PM · ใช้ของกลางจาก 2B-1 ไม่มีของกลางใหม่ · ไม่เปลี่ยนขั้นตอนงาน ไม่แตะ schema ไม่เพิ่ม API ไม่เพิ่ม index ไม่เพิ่ม token · server แก้แค่ query อ่านอย่างเดียวในหน้า
- **แบ่งหน้าจริง (B4):** รายการไม่ตรง (เดิมแสดง 200 แถวแรก) · รายการรอตรวจของรอบ (เดิม 200) · ประวัติชุดคำขอ (เดิม 100 ชุดล่าสุด) · แผน PM (เดิมสูงสุด 500) · รอบตรวจนับ (เดิมไม่จำกัด ตัดหน้าในหน่วยความจำ) · ค่าตั้งต้น 25 เลือก 25/50/100 · ท้ายตาราง "1–25 จาก N รายการ · หน้า 1 จาก M" · เปิดหน้าที่เกินหน้าสุดท้ายพาไปหน้าสุดท้าย (รอบตรวจนับแสดงหน้าสุดท้ายโดยไม่เปลี่ยน URL) · กล่องตัวเลขยังนับยอดเต็ม · รายการรอตรวจนับครบทุกรายการ (เดิมนับแค่ 200) · "กลับ" จากหน้ารอบตรวจ หน้าชุดคำขอ และหน้าแก้ไขแผน PM พาไปหน้าเดิมของรายการขนาดเดิม · คิวตัดจำหน่ายและซ่อมบำรุงแบ่งหน้าอยู่แล้ว เพิ่มการพาไปหน้าสุดท้าย
- **ตัดจำหน่าย:** ขั้นตอนเป็นแท็บเส้นใต้พร้อมตัวนับ · ฟอร์มกรองชุดเดียว (บนมือถือพับไว้และบอก "ใช้ตัวกรอง N รายการ" แทนป้าย "ล้างตัวกรอง" ที่กดไม่ได้) · แถวมีปุ่มขั้นถัดไป ("พิจารณาคำขอ" "บันทึกตัดจำหน่ายจริง" หรือ "ดู") และ ⋯ ("เปิดคำขอ" "เปิดใบงานชุด") เปิด dialog เดิม ปิดแล้วโฟกัสกลับปุ่มที่เปิด · "บันทึกตัดจำหน่ายจริง" ยาวเกินช่อง 120px จึงแสดงไม่ครบ (โปรแกรมอ่านหน้าจออ่านครบ) · checkbox ของแถวเป็นแบบกลางกดได้ 44px · ปุ่มเลือกและ "ตรวจสอบและอนุมัติ" เป็นปุ่มกลาง (ไอคอนหมุนตอนตรวจ) · มูลค่าบรรทัดรองเป็น "1,500.00 บาท" · ประวัติชุดคำขอและหน้าชุดคำขอ: ปุ่มกลับแบบใหม่ กล่องตัวเลขเป็นแถบเดียว ข้อมูลร่วมเป็นรายการป้ายกับค่า มือถือไม่มีแถบว่างเหนือแถบนำทาง
- **ตรวจนับ:** รายการไม่ตรง: "กลับไปรอบตรวจนับ" เป็นปุ่มขอบลูกศรซ้าย (เดิมเป็นปุ่มสีหลักมีเครื่องหมาย +) · กล่อง 4 กล่องเป็นแถบตัวเลข ช่องของคิวที่ใช้อยู่พื้นฟ้าอ่อนมีเส้นใต้ · คิวเป็นแท็บเส้นใต้ · ชิป "รอบตรวจ: …" และ "ประเภท: …" ลบเฉพาะตัวกรองของตัวเอง · "อนุมัติที่เลือก" เป็นสีหลักแทนสีเขียว "ปฏิเสธที่เลือก" เป็นปุ่มขอบแดง · ปุ่มในแถวเป็นปุ่มเล็กแบบกลาง ("อนุมัติ" เป็นปุ่มขอบ) · คลิกใน dialog ไม่เปิดหน้าทรัพย์สินข้างหลังแล้ว · เปลี่ยนหน้าหรือคิวแล้วล้างที่เลือกไว้ · รอบตรวจนับ: ตัวกรองด่วนเป็นแท็บพร้อมตัวนับ แถวมีปุ่มงานถัดไปและ ⋯ · ผลตรวจของรอบ: หัวเป็น `PageHeader` กลุ่มผลเป็นแถบตัวเลข ท้ายตารางแบบกลาง "กลับ" ในแถบล่างมือถือเป็นลูกศรซ้ายแทนไอคอนดาวน์โหลด · รายการรอตรวจ: ปุ่มกลับแบบใหม่ จอใหญ่มี "สแกนรายการนี้" และ ⋯ ("ดูทรัพย์สิน" "บันทึกไม่พบ") ครบเท่ามือถือ
- **ซ่อมบำรุง:** ตัวกรองแบบกลาง "กรอง" คงจำนวนต่อหน้า · ชิป "เฉพาะทรัพย์สินนี้" ลบแค่ตัวกรองทรัพย์สิน ตัวกรองอื่นไม่หาย · แถวว่างบอก "ไม่พบบันทึกการซ่อมที่ตรงกับตัวกรอง" เมื่อมีตัวกรอง และบอกให้กด "บันทึกซ่อม" เมื่อไม่มี · ค่าใช้จ่ายในตารางไม่มี "฿" (หัวคอลัมน์มี "(บาท)") บนการ์ดมือถือเป็น "1,234.00 บาท" · แผน PM: มีปุ่มกลับไปหน้าซ่อมบำรุง หัวเรื่องไม่มีไอคอน ลำดับเดิม (ใช้งาน → พักแผน → จบแผน แล้วตามวันครบกำหนด) แก้ไขหรือบันทึกแล้วกลับหน้าเดิม
- **ศูนย์กฎคุณภาพข้อมูลและ Integration API:** หัวเรื่อง 600 · กล่องตัวเลข 3 กล่องเป็นแถบเดียวไม่มีพื้นสี · คิวตรวจสถานะ: ตัวกรองแบบกลาง หัวตารางพื้นขาว คอลัมน์การดำเนินการตรึงขวา ท้ายตาราง "ทั้งหมด N รายการ · หน้า x จาก y" ปุ่ม "สแกนรายการใหม่" ไม่เปลี่ยนป้ายตอนทำงาน แถวว่างไม่มีเครื่องหมายถูกสีเขียว · หน้า Integration API แก้แค่หัว
- **ข้อความ:** เพิ่ม `disposalPage.activeFilterCount`, `auditFinding.activeFilters`, `repairRecord.activeFilters`, `repairRecord.emptyFilteredTitle`, `repairRecord.emptyFilteredHelp` · แก้ค่า `repairRecord.emptyHelp` เป็น 'กด "บันทึกซ่อม" เพื่อเริ่มบันทึก'
- **ไฟล์ใหม่และที่ลบ:** ตัวห่อ client `disposal-row-actions.tsx` และ `audit-pending-row-actions.tsx` (เปิด dialog ของ 2C ผ่าน handle) · `normalizeDisposalBatchReturnTo` และ section `"maintenance-pm"` ใน `src/lib/operational-return-navigation.ts` · `planStatePageSlices` ใน `src/lib/preventive-maintenance.ts` · `MaintenancePlanForm` รับ `returnHref` · ลบ `disposal-pagination.tsx` และ `maintenance-pagination.tsx`
- **guard:** VFG R7 29 → 17 (11 ไฟล์) · R1 เป็น `{}` · R2 10 คงเดิม · LFG หลัง plan: LH1 25 · LH2 7 · LB1 11 (budget 12 เหลือแถว `maintenance/[id]` ของ 2B-4) · LP1 7 · LF1 2 · LT3 3 · LT4 1 · LT5 3 · LV1 19 · LV2 98 · LV3 36 · LS1 17 · LK1 8 · LN1 6 (LT1 36 · LT2 2 · LS2 20 · LN2 7 · LR1 0 คงเดิม) · `MIGRATED_LIST_FILES` 51 ไฟล์ · ไม่แก้ `form-migration-guards` ไฟล์ที่ใช้ร่วมกับ 2C plan 3 นับต่ำกว่าเพดานแล้ว
- **test:** ไม่มีไฟล์ใหม่ · เพิ่มใน `list-pages-ui`, `list-filters-ui`, `list-pagination`, `operational-return-navigation`, `disposal-bulk-approval`, `disposal-bulk-execution-ui` · แก้ pin ตามสเปกข้อ 10.4 ตาราง A แถว 2B-2 (return navigation ต่อท้าย ไม่ลบของเดิม) และ `audit-round-result-drilldown:128`, `disposal-queue-ux:23`
- **ความเสี่ยง:** เวลาโหลดของ query นับ (รายการไม่ตรงไม่มี index `reportedAt` · แผน PM รอ 2 รอบเพราะ `groupBy` ก่อน · รอบตรวจนับยังอ่านทุกรอบ) · ไม่เพิ่ม index ใน 2B · ผลวัดอยู่ในหัวข้อตรวจบนแอป
- **deploy:** ไม่ deploy ใน 2B · deploy ครั้งเดียวหลังเฟส 2 ทั้งหมดและผู้ใช้ตรวจเครื่องจริง · ถอยกลับไป `ab1b873` ได้เพราะไม่มี schema เปลี่ยน
- **ตรวจบนแอป (Task 18):** <จาก task-18-findings.md>
- ภาพก่อน/หลัง: `.superpowers/sdd/screenshots/ui-phase2b-plan2/before/` และ `after/` (git ignore อยู่บนเครื่องพัฒนา)
- ต่อไป: merge แล้วทำ 2B-3 (ทะเบียนทรัพย์สิน) ใน checkout หลัก คู่กับ 2C plan 3 ใน worktree (สเปกข้อ 8.1) · แล้ว 2B-4 · 2B-5 · 2D · งาน V

```

Replace the `<จาก task-18-findings.md>` marker with the text from the findings, and every `<today>` with the date; no marker may stay.

- [ ] **Step 10: `.impeccable/design.json`: no change**

No component entry changes in 2B-2 (see the rulings): leave the file and its `generatedAt` as they are.

Run: `git diff --quiet e3f20ce -- .impeccable/design.json && echo DESIGN-JSON-UNCHANGED`
Expected: `DESIGN-JSON-UNCHANGED`.

- [ ] **Step 11: Check**

Run: `node <temp>/check-docs-2b2.mjs`
Expected: 15 `ok` lines, exit 0, and no "lacks these live fragments" list.

Run: `grep -n "<from task-18\|<จาก task-18\|<today>" DESIGN.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md docs/14_UI_UX_DESIGN_SYSTEM.md docs/11_FEATURE_LIST.md docs/07_UAT_CHECKLIST.md .impeccable/design.json`
Expected: nothing.

Run: `git diff --numstat`
Expected: exactly the six files: `DESIGN.md` `8 6` (six changed lines and two new sub-bullets), `docs/14_UI_UX_DESIGN_SYSTEM.md` `4 4`, `docs/11_FEATURE_LIST.md` `9 8`, `docs/07_UAT_CHECKLIST.md` `10 0`, `DEVELOPER_HANDOFF.md` about `63 4` (the findings change the count), `docs/99_CHANGELOG.md` about `20 0` (`24 0` with a new date block). A file that shows every line changed was normalized: restore its line endings.

Run: `node -e "for (const f of process.argv.slice(1)) { const s = require('fs').readFileSync(f, 'utf8'); console.log(f, (s.match(/\r\n/g) || []).length, (s.match(/\n/g) || []).length) }" DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md docs/11_FEATURE_LIST.md docs/07_UAT_CHECKLIST.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md`
Expected: the two numbers equal on every line (CRLF throughout).

Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: all green, with the test count of Task 17 (`tests/audit-round-cancellation.test.ts` reads the handoff, the UAT checklist, the changelog and the feature list; no other test reads these files).

- [ ] **Step 12: Commit**

```bash
git add DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md docs/11_FEATURE_LIST.md docs/07_UAT_CHECKLIST.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md
git commit -m "docs(ui): phase 2B plan 2 lists, real pages and the 2C plan 3 hand-off in DESIGN.md, handoff, feature list, UAT and changelog

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 6 files in the commit (`git show --stat HEAD`). `git status --short` prints only the untracked paths of Global Constraints.

---

### Task 20: Final verification, wiki and memory (controller runs this task)

**Files:**
- Modify: `docs/99_CHANGELOG.md`, `DEVELOPER_HANDOFF.md` (verify numbers)
- Modify (vault `D:\Obsidian\Eltross`): `AssetSystem/ams-status.md`, `AssetSystem/ams-log.md`, `AssetSystem/ams-open-questions.md`
- Modify (auto-memory): `review-2026-10-priorities.md`

**Interfaces:**
- Consumes: Tasks 1–19 committed.
- Produces: the branch ready for superpowers:finishing-a-development-branch.

- [ ] **Step 1: Verify.**
  - Run `npm run verify` and record the test count and the build page count.
  - If it passed, add one bullet to the 2B-2 entry in `docs/99_CHANGELOG.md`, directly above its "ตรวจบนแอป (Task 18)" bullet: `` `npm run verify` ผ่าน (test N · ผ่าน N · ข้าม 1 · build X/X หน้า) ``.
  - Add the same numbers to the 2B-2 section of `DEVELOPER_HANDOFF.md`, directly above its "Dev-app check (Task 18)" bullet: ``- Verification: `npm run verify` passes (tests N · pass N · skipped 1 · build X/X pages).``
  - Both files are CRLF: insert with an exact-string edit that writes `\r\n`.
  - Run `npm test` again (`tests/audit-round-cancellation.test.ts` reads both files).
  - Commit both files with `docs(ui): record phase 2B plan 2 verify results` and the Co-Authored-By line.

- [ ] **Step 2: Wiki.** Read `AssetSystem/_schema/ams-wiki-schema.md` first, then:
  - `ams-status.md`: the 2B row says plan 2B-2 is built on `feat/ui-phase2b-plan2` with the verify numbers, not merged, not deployed, and that 2C plan 3 may start once it merges. Fix any sentence the row now contradicts (rule 8).
  - `ams-log.md`: an entry at the top of `## <today>`.
  - `ams-open-questions.md`: the 2B-2 checks for a person from Task 18 Step 8 (one new numbered item, or appended to the 2B item) · any risk Task 18 recorded (load times of the count queries) · the existing-issue findings of Task 18.
  - Run `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` from `D:\Obsidian\Eltross`.
  - Commit only those three files with an `ingest:` message. Other sessions have uncommitted changes in the vault; never stage them.

- [ ] **Step 3: Memory.** Update `review-2026-10-priorities.md`: 2B-2 built on `feat/ui-phase2b-plan2`, not merged, not deployed. Next: the merge choice, then 2B-3 (the register) with 2C plan 3 in a worktree (spec §8.1–8.2, I29, I30).

- [ ] **Step 4:** Use superpowers:finishing-a-development-branch.

