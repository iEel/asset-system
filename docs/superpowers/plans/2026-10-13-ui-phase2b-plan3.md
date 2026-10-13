# UI Round 4 · Phase 2B List Pages and Page Frames · Plan 2B-3 (the asset register) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the asset register (`/th/assets`, its toolbar, filter sheet, tabs, chips, table, mobile list and row actions) and the import/export page header onto the phase 2B primitives, while the register keeps its own contract: dense rows, fixed column widths and no horizontal scroll at 1440 with the default columns. Workflows, data and validation stay the same.

**Architecture:**
- **No new primitive.** The register uses what plans 2B-1 and 2B-2 built: `PageHeader`, `DataTableBody`/`DataTableHead sort`/`DataTableFoot`/`TableEmptyRow`, `ClickableTableRow`, `Pagination`, `FilterSelect`, `FilterChipList`, `RowActions`, `TabNav`, `SearchField`. Its dense rows stay in file-local classes (spec I3) and its own scroll hint stays (I4).
- **One file = one commit.** Tasks 1–14 each move one file and lower that file's rows in `tests/list-frame-guards.test.ts` (LFG), so old patterns cannot come back.
- **The register table is shared with 2C plan 4.** This plan changes its list part only; its dialog and the bulk-action bar belong to 2C plan 4 and phase 3.
- **Pipeline (spec B7, §8.1–8.2):** this plan runs in the main checkout while 2C plan 3 runs in the worktree `.worktrees/ui-phase2c-plan3`. They share no code file. Whichever finishes second rebases onto `master` in its last task.
- **Controller tasks:** Task 0 (base check, before screenshots), Task 15 (verify, production build, dev-app check) and Task 17 (verify numbers, rebase if needed, wiki, memory). Task 16 writes the repo docs.

**Tech Stack:** Next.js 16.4 App Router · React 19 · Tailwind CSS 4.2.4 · class-variance-authority 0.7.1 · tailwind-merge 3.5 (through `cn()`) · radix-ui · next-intl 4 · `node --test` with Node 24 type stripping.

**Spec:** `docs/superpowers/specs/2026-10-12-ui-phase2b-design.md`, with section files in `docs/superpowers/specs/2026-10-12-ui-phase2b/` (`00-decisions.md`, `00-synthesis.md`, `03-primitives.md` … `09-guards-tests.md`; the register is `07-register.md`).
- **Spec §10 (rulings I1–I34) overrides the section files wherever they conflict.** This plan already applies them; when a task and a section file disagree, the task wins.
- The plan's files are those of spec §8.7.

## Global Constraints

- **Git:**
  - Work on branch `feat/ui-phase2b-plan3` in the main checkout `D:/Antigravity/asset-system` (from `master` `886a290`, which holds plans 2B-1 and 2B-2).
  - Never run `git checkout`, `git switch`, `git reset`, `git stash`, `git rebase` or `git clean`, and never touch `master`. Never touch the worktree `.worktrees/ui-phase2c-plan3` (2C plan 3 runs there at the same time).
  - Commit only the files your task names. One file is one commit unless the task groups files on purpose.
  - End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Next.js 16.4** is not the Next.js in your training data. Read `node_modules/next/dist/docs/` before using an API you have not seen in this repo.
- **Line endings:**
  - `git config core.autocrlf` is `true`. Most `src/` and `tests/` files are CRLF in the working tree, including `tests/visual-foundation-guards.test.ts`, `tests/form-migration-guards.test.ts`, `tests/helpers/source-files.ts` and every file plans 2B-1 and 2B-2 created (`tests/list-frame-guards.test.ts`, `tests/list-pages-ui.test.ts`, `tests/list-filters-ui.test.ts`, `tests/list-pagination.test.ts`, `src/lib/list-pagination.ts`, the `src/components/ui/` primitives); several are LF (for example `src/lib/utils.ts`, `src/components/ui/field.tsx`).
  - Before you edit a file, run `git ls-files --eol <file>` and keep what it uses. Edit with exact-string replacement; never normalize a file. New files are LF.
  - Tests that read source files strip `\r` (`.replace(/\r\n/g, "\n")`) before multi-line regexes. A test that reads a CRLF file without stripping must not get a new regex with `\n` (spec §9.6).
- **Tests:**
  - `npm test` runs `node scripts/run-tests.mjs` over `tests/**/*.test.{ts,mjs,js}` with Node 24 type stripping. Run one file with `node --test tests/<file>.test.ts`.
  - Modules that tests import use relative `.ts` imports (no `@/`) and erasable TypeScript only. Tests cannot import `.tsx`; they check `.tsx` by reading the source text.
  - Use the shared helpers in `tests/helpers/source-files.ts` (`readSourceFiles`, `findMatches`, `countMatchesByFile`, the JSX reader).
- **Baseline before Task 1** (HEAD `886a290`, or this plan's commit on top of it, which changes only `docs/`):
  - `npm test`: 1927 tests, 1926 pass, 0 fail, 1 skipped.
  - `npx tsc --noEmit`: clean.
  - `npm run lint`: 0 errors and 146 warnings, all under `.agents/`.
  - Task 0 re-checks these numbers.
- **Every task ends with all of these green:** `npm test` (0 fail) · `npx tsc --noEmit` · `npm run lint` (0 errors, no new warnings in `src/` or `tests/`). Report any failure by name.
- **The two guard scripts** (`<temp>` is the implementer's temp folder the controller names in the dispatch; never commit these files):
  - `node <temp>/p2b1-precheck.mjs --file <path>` prints one file's live count, budget, `KEEP` and `d38a0ee` seed per guard, and the `p2b-budget.mjs` arguments `ID=<budget>:<live>`. `node <temp>/p2b1-precheck.mjs --budgets` compares every budget row with the live counts.
  - `node <temp>/p2b-budget.mjs <path> ID=from:to ... [--migrated] [--dry-run]` lowers rows of LFG `BUDGETS` and VFG `TABLE_HEADER_FILLS` by file, never raises a number, never touches `KEEP`, and with `--migrated` adds the path to `MIGRATED_LIST_FILES`.
  - Before editing a file, its `live` equals its `budget`. After editing, compare the printed `args` with the task's Expected, then run `p2b-budget.mjs`.
  - Every other helper (the append that keeps CRLF, the Tailwind probe, a task precheck) is saved in full by the first task that needs it; later tasks name that task. Keep code fragments in `<temp>` as `.txt` (the temp folder sits under the linted tree).
- **Off limits:**
  - Do not run `npm ci`, `npm install`, `npm run build`, the dev server, `npx shadcn …`, or anything against a database.
  - Do not read or print `.env` or `.env.prod-admin`.
  - Leave the untracked paths alone: `.codex/`, `.impeccable/critique/`, `.playwright-mcp/`, `.superpowers/brainstorm/`, `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`, and `.worktrees/`.
  - Do not run skill helper scripts (for example the impeccable launcher); they make network calls.
- **No new tokens (2A I21).** No task adds a custom property to `:root`, `@theme inline` or `@theme`, and no task edits `tests/design-tokens-contrast.test.ts`. Never write `rounded-[…]`. Every new class must compile with Tailwind 4.2.4 against `src/app/globals.css`.
- **2C fences (spec §8.7, §8.11):**
  - Never edit `tests/form-migration-guards.test.ts` (FMG); 2C plan 3 edits it in the worktree at the same time. Never rename, move or delete a file in its `BATCH_FILES`, and keep it green.
  - `c/assets/asset-register-table.tsx` is a 2C batch 4 file: change only its list part. Never touch its dialog or its bulk-action bar (they belong to 2C plan 4 and phase 3; FMG GL1 and R2 budget 0 forbid moving the bar to a new file).
  - Never touch the 9 files of 2C batch 3 (FMG `BATCH_FILES["3"]`) or the chrome of `ui/sheet.tsx`.
  - In `D/assets/page.tsx` and `D/asset-management/import-export/page.tsx`, never touch the lines 2C plan 4 deletes (the `currentStep` line of each, spec C/07:136).
  - Never run a formatter on 2C files.
- **Register contract (DESIGN.md:500-510, spec §7.3, I3, I26):** no horizontal scroll at 1440 with the default column presets (operations and accounting 1,116 ≤ 1,117); dense rows keep `px-3 py-2` (rows are 56px because of the 40px thumbnail); the actions column is 172px and fits the 120px next step plus ⋯; the key column and the actions column stay sticky; the table header is white, 13px weight 500, no uppercase.
- **Look (B3):** `h1` weight 600 (`text-xl` below md on the register, `compactOnMobile`) · toolbar without a card from md, controls 36 · `TabNav` underline at every width, 44 targets on phones · the filter sheet's fields are labelled `FilterSelect`s.
- **Validation and behavior:** keep every `required`, toast, `disabled` gate, `returnTo` and confirm step. Delete from ⋯ keeps today's permission rule and asks the same confirm. Search keeps its 400ms debounce, IME handling and Enter. No validation UX changes (V track).
- **Server:** none. No schema, migration, API, dependency or index.
- **Messages:** edit `messages/th.json` and `messages/en.json` only through `node scripts/messages-edit.mjs <changes.json>`, run from the repo root, with the JSON kept in your temp folder. Thai follows `docs/19_THAI_GLOSSARY.md` and must pass `tests/thai-glossary.test.ts`; every key exists in both files. The one new key is `asset.noCustodian` "ไม่มีผู้ถือครอง" / "No custodian" (spec §10.2, approved by the user 2026-10-12).
- **Deploy:** no task deploys. The user decided on 2026-10-12 to deploy once after all of phase 2 (B9).

## Rulings of this plan

- **Guard totals after this plan** (spec §10.4 table C column 2B-3, relative to the budgets at `886a290`): LH1 25 → 24 · LH2 7 → 5 · LF1 2 → 1 · LT1 36 → 34 · LT2 2 → 1 · LT3 3 → 2 · LV2 98 → 97 · LV3 36 → 35 · LK1 8 → 7 · LN1 6 → 5. R7 17, R1 `{}`, R2 10, LB1 12 (live 11, slack 1 for 2B-4), LP1 7, LT4 1, LT5 3, LV1 19, LS1 17, LS2 20, LN2 7 and LR1 0 do not move.
- **Pipeline with 2C plan 3 (spec §8.2, I29):** the shared non-code files are `DESIGN.md`, `tests/visual-foundation-guards.test.ts`, `messages/*.json`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md` and `docs/11_FEATURE_LIST.md`. If 2C plan 3 merges first, the controller rebases this branch in Task 17 Step 2 and resolves them by the rules there. A conflict in any other file means a fence leaked: stop.

## Review Focus

1. **A user on a 1440 screen with the default columns** (the operations or accounting preset) must see every column without scrolling sideways, with the next step and ⋯ uncut. Pinned by Task 1's test (the actions column 172px, the presets at 1,116 ≤ 1,117px) and `tests/asset-register-view-model.test.ts`; measured per preset in Task 15 against Task 0.
2. **A user without delete permission** must not see "ลบ" in ⋯, and a user with it must get the same confirm as before, with focus back on ⋯ after cancel. Pinned by Task 2's test (`deleteAction` only when `permissions.canDelete`) and `tests/row-actions-ui.test.ts`; checked with cancel only in Task 15.
3. **A user typing Thai in the register search** must not trigger a search mid-composition, must wait 400ms after two characters, and Enter must search at once. Pinned by `tests/asset-register-search-ui.test.ts` (kept green) and Task 6's test that the `SearchField` sits inside the old search form with its handlers; checked with a Thai IME on a real phone (Task 15 Step 9).
4. **A user who picks filters in the sheet and then removes a chip** must see the sheet's selects show the new values, not stale ones. Pinned by Task 7's test that the seven `FilterSelect` keys are distinct and carry their value (the spec's plain `key={value}` would collide when two filters are empty).
5. **A user in select mode who taps beside a checkbox** must not open the row, and the bulk-action bar must stay where it was. Pinned by Task 3's tests (the 44px label with `data-no-row-click`, the bar's place and frame) and Task 4's mobile-list test; FMG GL1 keeps the bar in its file.

## File structure

| File | What changes | Task |
|---|---|---|
| `src/lib/asset-register-columns.ts` | column widths (actions 172, company/branch 116) | 1 |
| `src/components/assets/asset-register-row-actions.tsx` | thin client wrapper of `RowActions` (I5) | 2 |
| `src/components/assets/asset-register-table.tsx` | list part on the `DataTable` parts with file-local dense classes; dialog and bulk bar untouched | 3 |
| `src/components/assets/asset-register-mobile-list.tsx`, `-toolbar.tsx`, `-search-field.tsx`, `-filter-sheet.tsx`, `-status-tabs.tsx`, `-filter-chips.tsx` | the shared checkbox, `FilterSelect`, `SearchField`, `TabNav`, `FilterChipList` | 4–9 |
| `src/components/assets/asset-register-sort-menu.tsx`, `-column-picker.tsx`, `-export-menu.tsx` | triggers on `Button` | 10–12 |
| `src/app/[locale]/(dashboard)/assets/page.tsx`, `asset-management/import-export/page.tsx` | `PageHeader`; import history facts as `KeyValueList` | 13, 14 |
| `messages/th.json`, `messages/en.json` | `asset.noCustodian` | 3 |
| `tests/asset-register-*.test.ts`, `tests/asset-status-help-ui.test.ts`, `tests/dropdown-menus-ui.test.ts`, `tests/list-*.test.ts`, VFG register rows, LFG budgets | tests and guards | 1–14 |
| `DESIGN.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md`, `docs/11_FEATURE_LIST.md`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md` | plan 2B-3 docs | 16, 17 |

---


### Task 0: Base check, guard scripts and before screenshots (controller runs this task, not an implementer)

**Files:**
- Create then delete: `.claude/launch.json` (only if no dev server is running; never committed)
- Create (git-ignored): `<temp>/p2b1-precheck.mjs`, `<temp>/p2b-budget.mjs`, where `<temp>` is the `codex-temp/` folder of this plan's SDD workspace (`.superpowers/sdd/<plan workspace>/codex-temp/`)
- Evidence: `.superpowers/sdd/screenshots/ui-phase2b-plan3/before/` (git-ignored)

**Interfaces:**
- Consumes: HEAD before Task 1.
- Produces: the base check, the baseline numbers, the two guard scripts every later task runs, the ids and the before images Task 15 compares against.

- [ ] **Step 1: Check the base.**

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2b-plan3`

Run: `git merge-base --is-ancestor 886a290 HEAD && git diff --quiet 886a290 HEAD -- src tests messages scripts prisma && echo BASE-OK`
Expected: `BASE-OK`

Run: `git log --oneline -1 master`
Expected: `886a290 docs(ui): record phase 2B plan 2 verify results` (plan 2B-2 is merged; spec §8.10 row 2).

Run: `git worktree list`
Expected: the main checkout, and `.worktrees/ui-phase2c-plan3` on `feat/ui-phase2c-plan3` once 2C plan 3 has started (spec §8.10 row 7). Run `git diff --name-only master...feat/ui-phase2c-plan3` when that branch exists: every path must be one of 2C plan 3's files, its tests, FMG, or the shared non-code files of the Rulings. A path of this plan means a fence leaked: stop.

If `BASE-OK` does not print, code changed after `886a290`. Run each task's precheck before dispatching it, update the task text where a count or snippet differs, and record a ruling in the ledger.

- [ ] **Step 2: Baseline.** Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: 1927 tests (1926 pass, 0 fail, 1 skipped); tsc clean; lint 0 errors and 146 warnings, all under `.agents/`. Record the numbers in the ledger.

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

- [ ] **Step 4: Recount.** Run `node <temp>/p2b1-precheck.mjs --budgets`. Expected: `budgets hold: no live count is over its row`; every guard shows `slack 0` except `LB1 … 12 in 12 rows · live 11 in 11 files · slack 1` (the `D/maintenance/[id]/page.tsx` row of 2B-4). Then run `node <temp>/p2b1-precheck.mjs --file <path>` for each file of Tasks 1–14 and check that the `live` column equals the task's precheck Expected. On any difference, stop and update that task before dispatching it.

- [ ] **Step 5: Confirm the dev database.** Read the `.env` keys `DATABASE_URL` and `DB_USER` without printing secrets. The database must be `asset_management_dev` and the user `asset_dev`. If not, stop.

- [ ] **Step 6: Open the app.**
  - If the user's dev server answers on `http://localhost:3000` (the main checkout), use it. 2C plan 3's servers run from the worktree on 3100/3101; never use those for this plan.
  - Otherwise create `.claude/launch.json` (`runtimeExecutable: "npm"`, `runtimeArgs: ["run", "dev"]`, `port: 3000`) and run `preview_start`.
  - Log in with the seed admin from `prisma/seed.ts`; do not echo the password.

- [ ] **Step 7: Pick ids and filters.** Record in the ledger: one asset id with a photo, one without, one that is checked out (its row offers "รับคืน"), one with no custodian; a register filter set that yields chips (a company and a status); the column presets the picker offers (operations, accounting, audit, all).

- [ ] **Step 8: Before screenshots.** Save to `.superpowers/sdd/screenshots/ui-phase2b-plan3/before/` as `<view>-<width>.png`, full page plus the `main` scroll area scrolled to its bottom:
  - `/th/assets` at 1440 and 1366 with each column preset; at 1024, 768 and 375 with the default preset
  - `/th/assets` with the filter chips of Step 7 at 1440 and 375
  - the filter sheet open at 1440 and 375; ⋯ open on a row at 1440 and as the sheet at 375; select mode on at 375 with two rows ticked (do not run a bulk action)
  - `/th/asset-management/import-export` at 1440 and 375
  - Save nothing in any form. Open no dialog past its first screen.

- [ ] **Step 9: Measure the register.** At 1440 and 1366 with each preset, record the table's `scrollWidth - clientWidth` of its scroller, the width of the actions column and the row height of a row with a photo. Task 15 compares them (spec §8.7 dev-check row 1).

- [ ] **Step 10: Clean up.** Stop any server you started and delete `.claude/launch.json`. Keep every helper script outside the repo except the two guard scripts in `<temp>`. `git status --short` must show only the untracked paths in Global Constraints. No commit in this task.

---

### Task 1: `src/lib/asset-register-columns.ts` · the actions column fits `RowActions` and the default presets stay 1,116px (I26), plus the helper scripts of this plan

Spec §10.2 I26, §10.3 bullet 2B-3, §8.7 file 12, §7.8.4, §10.4 table A row 2B-3 (`tests/asset-register-view-model.test.ts:164` 1094 → 1116), §7.17 N8, §10.7 risk 4 and controller ruling (g). One file, one commit. It comes first because Tasks 2 and 3 put the 156px `RowActions` pair into the actions column (spec §7.1: "3.5 ต้องมาก่อน 3.6"). The lib and its test are CRLF in the working tree: exact-string replacements only. This task also saves the three helper scripts the plan reuses.

Rulings this task applies:
- **I26, §7.8.4:** `actions` 150 → 172 and `companyBranch` 120 → 116; every other width stays (`name` 200 is pinned at `tests/asset-register-view-model.test.ts:163`). The presets then measure (select 44 + actions 172 + their columns):
  - operations (the default): 44 + 172 + 172 + 200 + 140 + 160 + 132 + 96 = **1,116**
  - accounting: 44 + 172 + 172 + 200 + 116 + 160 + 120 + 132 = **1,116** (1,120 without the 4px from `companyBranch`)
  - audit 1,276 and all 1,632 scroll, as before (`tests/asset-register-view-model.test.ts:166`)
- **Controller ruling (g), DESIGN.md:500-510 ("the default column set must fit 1440px without horizontal scroll"):** a 1440px screen leaves 1,117px for the table (1440 − sidebar 256 − padding 48 − scrollbar 17 − border 2, `docs/superpowers/plans/2026-10-07-asset-register-redesign.md:45`), so both default presets fit with 1px to spare. If the 1440 check of Task 15 still scrolls on a real Windows machine (a wider scrollbar or a zoom other than 100%), the fallback of spec §10.7 risk 4 is `custodian` 160 → 156; this task does not take it.
- **Why 172 (I3):** Task 3 pads the actions cell `pl-1.5 pr-2` and draws a 1px left line, so the content box is 172 − 6 − 8 − 0.5 = 157.5 ≥ 156 (next step 120 + gap 4 + ⋯ 32). With `px-3` it would need 180, and operations would be 1,124.
- **LFG:** `src/lib/` is off screen for every LFG counter (`offScreen`, `tests/list-frame-guards.test.ts:24`), so the file has no row and does not join `MIGRATED_LIST_FILES`, which lists screen files (plan 2B-2 left `src/lib/operational-return-navigation.ts` out the same way).
- **Helpers:** `p2b3-append.mjs` and `p2b3-tw-probe.mjs` are plan 2B-2's `p2b2-append.mjs` and `p2b2-tw-probe.mjs` (Task 1 Step 1 of that plan) under 2B-3 names, with one change in the probe: `;` joins the characters that mark a string as not a class, so the CSV MIME type `"text/csv;charset=utf-8"` of `asset-register-table.tsx:330` is not reported as a missing class. `p2b3-t1-precheck.mjs` is new and covers Tasks 1–3.

What users will see on `/th/assets`: nothing on its own. The actions column is 22px wider (Task 2 fills it with the fixed next-step button and ⋯) and the company/branch column 4px narrower; the operations and accounting presets still fit 1440px without sideways scrolling.

Not in this task: the padding of the actions cell and the table (Task 3) · `RowActions` (Task 2) · docs (Task 16).

**Files:**
- Modify: `src/lib/asset-register-columns.ts` (`i/lf w/crlf`; 1 exact replacement)
- Modify: `tests/asset-register-view-model.test.ts` (`i/lf w/crlf`; 1 exact replacement, 1 appended block)
- Temp folder only, never committed: `p2b3-t1-precheck.mjs`, `p2b3-append.mjs`, `p2b3-tw-probe.mjs` (Tasks 2–3 reuse all three; any later task of this plan may reuse the last two by name), `t01-block.ts`

**Must keep passing without edits:**
- `tests/asset-register-view-model.test.ts:163`, `:165-166` (`name` 200, operations ≤ 1,117, all > 1,117) and the other nine tests of the file
- `tests/asset-register-ux.test.ts:19-38` (the preset lists), `:85-90` (operations is the first preset) · `tests/asset-register-table-ui.test.ts:97-106` (the `<colgroup>` reads the widths by name)

**Interfaces:**
- Consumes:
  - 886a290: `assetRegisterColumnWidths`, `assetRegisterColumnPresets`, `getAssetRegisterTableMinWidth(columns: Iterable<AssetRegisterColumnKey>): number` from `src/lib/asset-register-columns.ts` (the API does not change).
  - Task 0: `<temp>/p2b1-precheck.mjs` (`--file`, `--budgets`) and `<temp>/p2b-budget.mjs`, copied there by the controller.
- Produces:
  - `assetRegisterColumnWidths.actions === 172` and `.companyBranch === 116` (Task 3's `<col>` and `pl-1.5 pr-2` rely on them).
  - In the temp folder: `p2b3-t1-precheck.mjs <1|2|3>`, `p2b3-append.mjs <block file> <test file>` (keeps the test file's CRLF or LF), `p2b3-tw-probe.mjs <file> …` (`SHOW=a,b` prints compiled rules).

| guard | `src/lib/asset-register-columns.ts` before → after |
|---|---|
| LFG / VFG | no row (off screen) · totals unchanged |

- [ ] **Step 1: Check what this task builds on (and save the three helper scripts)**

Save these three scripts in your temp folder (never in the repo).

`p2b3-t1-precheck.mjs`:

```js
// p2b3-t1-precheck.mjs: run from the repo root before Task 1, 2 or 3 of plan 2B-3.
// Usage: node p2b3-t1-precheck.mjs <1|2|3>. Reads only; writes nothing. Never commit this file.
// Confirms that the 2B-1 primitives and the 2A parts this group uses are there with the API the tasks quote, that the
// earlier tasks of the group are in and this task's change is not, and that each file this task edits still holds the
// 886a290 text the old snippets quote (a hash of its text with \r stripped).
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"

const task = Number(process.argv[2])
if (![1, 2, 3].includes(task)) {
  console.error("usage: node p2b3-t1-precheck.mjs <1|2|3>")
  process.exit(2)
}
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
const migrated = (path) => migratedBlock.includes(`\`${path.replace(C, "${C}")}\``)

// The files each task edits, with their CR-stripped text hash at 886a290 (only files no earlier task of this group edits).
const UNCHANGED = {
  1: { "src/lib/asset-register-columns.ts": "62214422a8e482bf", "tests/asset-register-view-model.test.ts": "c33184cdeb89edc3" },
  2: {
    [`${C}assets/asset-register-row-actions.tsx`]: "3f1b681c2ccb79fc",
    "tests/asset-register-table-ui.test.ts": "710aef1c2dc3534e",
    "tests/dropdown-menus-ui.test.ts": "995b5c3960b28de0",
  },
  3: { [`${C}assets/asset-register-table.tsx`]: "d87a19b4c8d0b7e0", "tests/asset-register-ux.test.ts": "54ee073c3f7310b4" },
}
// What each task leaves behind, so the next task can see it is in (and a task can see it has not run yet).
const DONE = {
  1: () => /^ {2}actions: 172,$/m.test(read("src/lib/asset-register-columns.ts")) && /^ {2}companyBranch: 116,$/m.test(read("src/lib/asset-register-columns.ts")),
  2: () => read(`${C}assets/asset-register-row-actions.tsx`).includes("<RowActions") && migrated(`${C}assets/asset-register-row-actions.tsx`),
  3: () => read(`${C}assets/asset-register-table.tsx`).includes("<DataTableBody>") && migrated(`${C}assets/asset-register-table.tsx`),
}

const rowActions = ui("row-actions.tsx")
const dataTable = ui("data-table.tsx")
const checks = {
  "2B-1: RowActions with deleteAction, menu, the next slot and the link/unavailable items":
    exports(`${C}ui/row-actions.tsx`, ["RowActions", "RowNextAction", "RowActionItem"]) &&
    /deleteAction\?: \{ endpoint: string; label\?: string \}/.test(rowActions) &&
    /menu\?: "auto" \| "dropdown" \| "sheet"/.test(rowActions) &&
    /next\?: RowNextAction \| null/.test(rowActions) &&
    /\{ kind: "unavailable"; key: string; label: string; reason: string; icon\?: ReactNode \}/.test(rowActions),
  "2B-1: DataTableHead sort, DataTableBody, DataTableFoot, TableEmptyRow emptyState":
    exports(`${C}ui/data-table.tsx`, ["DataTableHead", "DataTableBody", "DataTableFoot", "TableEmptyRow", "DataTableSort"]) &&
    /emptyState: React\.ComponentProps<typeof ActionEmptyState>/.test(dataTable) &&
    /direction: "asc" \| "desc" \| null/.test(dataTable),
  "2B-1: ClickableTableRow carries group/row": /cn\(dataTableRowClasses, /.test(ui("clickable-table-row.tsx")) && /"group\/row /.test(dataTable),
  "2B-1: Pagination takes labels.range": /range\?: string/.test(ui("pagination.tsx")),
  "2A: Button, checkboxVariants, Nil, orNil, formatCount, formatMoney":
    /busy\?: boolean/.test(ui("button.tsx")) && exports(`${C}ui/field-variants.ts`, ["checkboxVariants"]) &&
    exports(`${C}ui/nil.tsx`, ["Nil", "orNil"]) && exports("src/lib/display-format.ts", ["formatCount", "formatMoney"]),
  "the keys the register uses exist in th and en": ["th", "en"].every((locale) => {
    const { asset, common } = messages(locale)
    return ["rowActionsMenu", "transactionMenu", "cloneAsset", "purchasePriceBaht", "registerRange", "tableScrollHint", "selectMode", "selectModeDone"].every((key) => typeof asset?.[key] === "string") &&
      ["edit", "delete", "pagination", "pageOf", "noValue"].every((key) => typeof common?.[key] === "string")
  }),
  ...Object.fromEntries([1, 2].filter((number) => number < task).map((number) => [`Task ${number} is in`, DONE[number]()])),
  [`Task ${task} has not run yet`]: !DONE[task](),
  ...Object.fromEntries(Object.entries(UNCHANGED[task]).map(([path, expected]) => [`${path} is unchanged since 886a290 (hash ${expected})`, hash(path) === expected])),
  ...(task === 3 ? { "asset.noCustodian is not in th or en yet": ["th", "en"].every((locale) => !("noCustodian" in (messages(locale).asset ?? {}))) } : {}),
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

`p2b3-append.mjs`:

```js
// p2b3-append.mjs: run from the repo root. Usage: node <temp>/p2b3-append.mjs <block file> <test file>
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

`p2b3-tw-probe.mjs`:

```js
// p2b3-tw-probe.mjs: run from the repo root. Usage: node <temp>/p2b3-tw-probe.mjs <file> [<file> ...]
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
    for (const token of text.split(/\s+/)) if (/^[a-z!\[-]/.test(token) && !/[(){};]/.test(token)) classes.add(token)
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
Expected: `feat/ui-phase2b-plan3`

Run: `git status --short src tests messages` then `node <temp>/p2b3-t1-precheck.mjs 1`
Expected: `git status` prints nothing. The script prints:
```
ok      2B-1: RowActions with deleteAction, menu, the next slot and the link/unavailable items
ok      2B-1: DataTableHead sort, DataTableBody, DataTableFoot, TableEmptyRow emptyState
ok      2B-1: ClickableTableRow carries group/row
ok      2B-1: Pagination takes labels.range
ok      2A: Button, checkboxVariants, Nil, orNil, formatCount, formatMoney
ok      the keys the register uses exist in th and en
ok      Task 1 has not run yet
ok      src/lib/asset-register-columns.ts is unchanged since 886a290 (hash 62214422a8e482bf)
ok      tests/asset-register-view-model.test.ts is unchanged since 886a290 (hash c33184cdeb89edc3)
info    src/lib/asset-register-columns.ts: CRLF
info    tests/asset-register-view-model.test.ts: CRLF
preconditions hold for Task 1
```
On any `MISSING` line, stop and report it. A `hash now` line means the file changed after 886a290 (2C plan 3 does not touch these files), so the old snippets below may not match: report it, do not guess.

Run: `node <temp>/p2b1-precheck.mjs --file src/lib/asset-register-columns.ts`
Expected (after the `info`/`ok` header lines; exit 0):
```
file    src/lib/asset-register-columns.ts (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
args    (no row holds this file)
```

Run: `git ls-files --eol src/lib/asset-register-columns.ts tests/asset-register-view-model.test.ts`
Expected: `i/lf w/crlf` for both. Keep them CRLF.

- [ ] **Step 2: Write the failing tests (`tests/asset-register-view-model.test.ts`, CRLF; it imports the lib, it reads no source text)**

(a) The pin of §10.4 table A (`:164`). Replace:

```ts
  assert.equal(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.operations), 1094)
```

with:

```ts
  assert.equal(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.operations), 1116)
```

(b) N8. Save this block as `<temp>/t01-block.ts`:

```ts
// Plan 2B-3 Task 1 (spec 2B I26, §7.8.4, N8): the actions column holds the ช1 pair of RowActions (next step 120 + gap 4 +
// ⋯ 32 = 156) between pl-1.5 pr-2 and its left line: 172 − 6 − 8 − 0.5 = 157.5. companyBranch gives back 4px, so the
// accounting preset still fits the 1,117px a 1440px screen leaves (DESIGN.md, asset register: no horizontal scroll).
test("the actions column fits the next-step button and ⋯, and the accounting preset still fits 1440px (spec 2B I26)", () => {
  assert.equal(assetRegisterColumnWidths.actions, 172)
  assert.equal(assetRegisterColumnWidths.companyBranch, 116)
  assert.equal(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.accounting), 1116)
  assert.ok(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.accounting) <= 1117)
  assert.equal(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.audit), 1276, "audit scrolls, as before")
  assert.equal(getAssetRegisterTableMinWidth(assetRegisterColumnPresets.all), 1632, "all scrolls, as before")
})
```

Run: `node <temp>/p2b3-append.mjs <temp>/t01-block.ts tests/asset-register-view-model.test.ts`
Expected: `appended <temp>/t01-block.ts to tests/asset-register-view-model.test.ts (CRLF)`

Run: `node --test tests/asset-register-view-model.test.ts`
Expected: FAIL, `tests 11 · pass 9 · fail 2`:
- `default columns fit a 1440px screen without horizontal scroll`: `1094 !== 1116`
- `the actions column fits the next-step button and ⋯, and the accounting preset still fits 1440px (spec 2B I26)`: `150 !== 172`

- [ ] **Step 3: Widen the actions column (`src/lib/asset-register-columns.ts`, CRLF)**

Replace `:56-70`:

```ts
/** Desktop widths in px. `name` is the minimum; the name column takes the remaining space. */
export const assetRegisterColumnWidths = {
  select: 44,
  assetTag: 172,
  name: 200,
  category: 160,
  companyBranch: 120,
  currentLocation: 140,
  custodian: 160,
  ownershipType: 120,
  status: 132,
  condition: 96,
  purchasePrice: 120,
  actions: 150,
} satisfies Record<AssetRegisterColumnKey | "select" | "actions", number>
```

with:

```ts
/**
 * Desktop widths in px. `name` is the minimum; the name column takes the remaining space.
 * actions 172: the RowActions pair (next step 120 + 4 + ⋯ 32 = 156) fits between pl-1.5 pr-2 and the left line
 * (172 − 6 − 8 − 0.5 = 157.5, spec 2B I26). companyBranch 116 keeps the accounting preset at 1,116px, and operations is
 * 1,116px too: a 1440px screen leaves 1,117px, so the default columns never scroll sideways (DESIGN.md, asset register).
 */
export const assetRegisterColumnWidths = {
  select: 44,
  assetTag: 172,
  name: 200,
  category: 160,
  companyBranch: 116,
  currentLocation: 140,
  custodian: 160,
  ownershipType: 120,
  status: 132,
  condition: 96,
  purchasePrice: 120,
  actions: 172,
} satisfies Record<AssetRegisterColumnKey | "select" | "actions", number>
```

- [ ] **Step 4: Run the tests for this task**

Run: `node --test tests/asset-register-view-model.test.ts tests/asset-register-ux.test.ts tests/asset-register-table-ui.test.ts tests/list-frame-guards.test.ts`
Expected: PASS, `tests 67 · pass 67 · fail 0` (asset-register-view-model 11, asset-register-ux 18, asset-register-table-ui 17, list-frame-guards 21).

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected: exit 0, `budgets hold: no live count is over its row`, the totals of Task 0 unchanged (`LT1 BUDGETS.LT1 36 in 10 rows`, `LV2 BUDGETS.LV2 98 in 30 rows`, `LV3 BUDGETS.LV3 36 in 10 rows`), and no `slack` line except the LB1 `0 → 1` row of `D/maintenance/[id]/page.tsx` (2B-4 fills it).

No Tailwind probe: the file has no class string.

- [ ] **Step 5: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `tests 1928 · pass 1927 · fail 0 · skipped 1` (one test more than the baseline of 1927).
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors and the 146 warnings under `.agents/`; `npx eslint src/lib/asset-register-columns.ts tests/asset-register-view-model.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 2 files: `src/lib/asset-register-columns.ts` 8 insertions and 3 deletions, `tests/asset-register-view-model.test.ts` 13 insertions and 1 deletion. `node -e "const s=require('fs').readFileSync(process.argv[1],'utf8');console.log((s.match(/\r\n/g)||[]).length,(s.match(/\n/g)||[]).length)" src/lib/asset-register-columns.ts` prints `81 81`, and the same for the test prints `179 179` (CRLF throughout). A file that shows every line changed was normalized: restore its line endings before you commit.

- [ ] **Step 6: Commit**

```bash
git add src/lib/asset-register-columns.ts tests/asset-register-view-model.test.ts
git commit -m "feat(ui): register actions column 172 and company/branch 116, so RowActions fits and the default presets stay 1,116px (2B-3 task 1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 2 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 15, spec §8.7 row `/th/assets` 1440 and 1366, §7.15):** at 1440 on Windows with the real scrollbar, with the operations and then the accounting preset: `document.querySelector("[data-asset-desktop-table]")` has `scrollWidth <= clientWidth` and no scroll hint line shows; with audit and all the table scrolls, the hint shows, and the code and actions columns stay pinned. At 1366 and 1280 the default preset scrolls and the hint shows.

---

### Task 2: `c/assets/asset-register-row-actions.tsx` on the shared `RowActions`, pattern ช1 (I5)

Spec §10.2 I5, §10.3 bullet 2B-3, §8.7 file 2, §7.9, §3.11, §8.11 row 1 (2B removes the register's own ⋯ sheet; the sheet chrome stays 2C's), §10.4 table A row 2B-3 (`tests/asset-register-table-ui.test.ts:13-25` and `tests/dropdown-menus-ui.test.ts:27-38` read the same behavior at `ui/row-actions.tsx`), §7.17 N1, rulings R-p, I33 and controller rulings (e), (f). One file, one commit. `AssetRegisterRowActions` keeps its file, its export name and its props: the table (`:662`), the phone list (`asset-register-mobile-list.tsx:73`) and four test files call it by name, so Tasks 3 and 4 render it as today. The file is CRLF: exact-string replacements only.

Rulings this task applies:
- **I5, §7.9:** the file becomes a thin client wrapper that turns a row into the data-only props of `RowActions` (no `children`, no `triggerRef`, no `contentClassName`):
  - `next`: on desktop the transaction `getRowNextAction` picks (handover, then return) as a link with its icon, or `null` when the row has none, so the empty 120px slot keeps ⋯ in line; on phones `undefined` (no slot, today's phone row has none).
  - `groups`: the transactions under `t("transactionMenu")` in today's order (`ordered`, the next step first): `link` with a primary icon when enabled, `unavailable` with `reasonOf(transaction)` otherwise; then edit and clone, each by its permission (`permissions.canEdit ?`, `permissions.canCreate ?`).
  - `` deleteAction={permissions.canDelete ? { endpoint: `/api/assets/${assetId}` } : undefined} ``: today's rule (`:145`, `:224`); the primitive shows ลบ last after a line and confirms through `useDeleteAction(…, { returnFocusRef: triggerRef })`, as `:77` did.
  - `menuLabel={t("rowActionsMenu", { assetTag })}` (today's words, I33), `menu={variant === "desktop" ? "dropdown" : "sheet"}` (the table shows from `md`, the phone list below it), `code={assetTag}`, `name={assetName}`, `className` (the phone list passes `relative z-10`).
- **What goes:** `NextActionLink` (`:246-269`), the hand-written ⋯ buttons (`:93-101`, `:163-173`), the dropdown (`:91-155`), the hand-written sheet (`:160-243`), `sheetItemClasses` (`:47-48`), and `useState`, `useRef`, `useDeleteAction`, `Link`, `cn` and the dropdown and sheet imports. The primitive brings the ghost `icon-sm` ⋯ (32px from `md`, 44 below), `data-no-row-click` on its root, menu and sheet, the sheet header `<span className="tag font-medium">{code}</span>` (R-p), the close label and the home-bar padding of the Sheet primitive, and closing the sheet before the delete confirm (`:229-232` today).
- **Group handling:** the wrapper always passes the `record` group; `RowActions` drops an empty group (`filled`), so a user who may neither edit nor create sees the transactions and then ลบ, as today. (Spec §7.9 spreads the group in only when it has items; the result is the same.)
- **Menu width (I5):** the default `min-w-60` (240px) instead of `w-64` (256px).
- **Pins (§10.4 table A, I5):** `tests/asset-register-table-ui.test.ts:15-18`, `:20`, `:25` and `tests/dropdown-menus-ui.test.ts:29-38` read the same behavior at `src/components/ui/row-actions.tsx` (`:19` and `:31` split into the wrapper's `deleteAction` and the primitive's `useDeleteAction`; `:32` "two `ref={triggerRef}`" becomes one, the primitive's single ⋯; `:36-37` match the primitive's `{item.reason}` and the wrapper's `reason: reasonOf(transaction)`). `:13-14`, `:21-24` and `:26` stay on the wrapper. Both files strip `\r`, so the new regexes may hold `\n`. N1 is appended.
- **2C fence (§8.11 row 1):** this task deletes only the register's own sheet. It never edits `c/ui/sheet.tsx`, `c/ui/dropdown-menu.tsx` or `c/ui/row-actions.tsx`.
- **LFG, rulings (e), (f):** the file has no row, and no later 2B plan touches it (spec §8.8–8.9), so it joins `MIGRATED_LIST_FILES`.

What users will see on `/th/assets`:
- Desktop rows: the next step ("ส่งมอบ", "รับคืน") is a fixed 120px button with its icon on the left and no fill; it fills light blue while the row is hovered or holds focus, and while the row's ⋯ menu is open. A row without a next step keeps the empty slot, so ⋯ lines up in every row. ⋯ is the shared 32px ghost button.
- The ⋯ menu holds the same items in the same order: the transactions under "ทำธุรกรรม" (one that cannot run stays in the list with its reason, as today), then "แก้ไข" and "คัดลอกเป็นรายการใหม่", then "ลบ" after a line, only for users who may delete. It is at least 240px wide (was 256).
- Phones: ⋯ opens the shared bottom sheet: the asset tag in monospace as its title, the name under it, the label "ทำธุรกรรม" above the transactions (new), 44px rows; "ลบ" closes the sheet and asks the same confirm.
- Screen readers: the next step reads "ส่งมอบ AST-0001" (was "ส่งมอบ: AST-0001"); ⋯ still reads "การดำเนินการของ AST-0001".

Not in this task: the actions column of the table and its padding (Task 3) · the phone list (Task 4) · `c/ui/row-actions.tsx` (2B-1, unchanged) · docs (Task 16).

**Files:**
- Modify: `src/components/assets/asset-register-row-actions.tsx` (`i/lf w/crlf`; 3 exact replacements)
- Modify: `tests/asset-register-table-ui.test.ts` (`i/lf w/crlf`; 1 exact replacement, 1 appended block)
- Modify: `tests/dropdown-menus-ui.test.ts` (`i/lf w/crlf`; 1 exact replacement)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only: `t02-table-block.ts`

**Must keep passing without edits** (886a290 numbering):
- `tests/asset-register-table-ui.test.ts:29-36` (`<AssetRegisterRowActions\s+variant="desktop"`, `permissions={permissions}` in the table), `:38-45` (row-action copy), `:138-153` (`<AssetRegisterRowActions\s+variant="mobile"` in the phone row), `:155-164`
- `tests/asset-clone-ui.test.ts:6-14` (`t("cloneAsset")` in the wrapper) · `tests/row-actions-ui.test.ts` · `tests/dialog-trigger-handles.test.ts` · `tests/dropdown-menus-ui.test.ts:7-25`, `:41-82`
- `tests/form-migration-guards.test.ts` (whole file, never edited) · `tests/visual-foundation-guards.test.ts` · `tests/list-frame-guards.test.ts`

**Interfaces:**
- Consumes:
  - 2B-1: `RowActions({ code, name?, menuLabel, next?: RowNextAction | null, groups: readonly RowActionGroup[], deleteAction?: { endpoint: string; label?: string }, openerRef?, menu?: "auto" | "dropdown" | "sheet", className? })` and `type RowActionItem = { kind: "link"; key; label; href; icon?; onNavigate? } | { kind: "action"; … } | { kind: "unavailable"; key; label; reason; icon? }` from `@/components/ui/row-actions`.
  - 886a290: `getRowNextAction`, `type AssetRegisterTransaction`, `type AssetRegisterTransactionAction` from `@/lib/asset-operation-policy` (unchanged).
  - Task 1: `<temp>/p2b3-t1-precheck.mjs`, `<temp>/p2b3-append.mjs`, `<temp>/p2b3-tw-probe.mjs`.
- Produces:
  - Unchanged exports: `AssetRegisterRowActions({ variant: "desktop" | "mobile", assetId, assetTag, assetName, transactions, editHref, cloneHref, permissions, onNavigate?, className? })`, `type AssetRegisterRowTransaction`, `type AssetRegisterRowPermissions`. Task 3 renders it in the table cell, Task 4 in the phone row, as today.
  - LFG: the file in `MIGRATED_LIST_FILES` (52 files).

| guard | `c/assets/asset-register-row-actions.tsx` before → after |
|---|---|
| LFG | no row · joins `MIGRATED_LIST_FILES` |
| VFG / FMG | no row (not a 2C file) · totals unchanged |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b3-t1-precheck.mjs 2`
Expected: `git status` prints nothing; the script prints:
```
ok      2B-1: RowActions with deleteAction, menu, the next slot and the link/unavailable items
ok      2B-1: DataTableHead sort, DataTableBody, DataTableFoot, TableEmptyRow emptyState
ok      2B-1: ClickableTableRow carries group/row
ok      2B-1: Pagination takes labels.range
ok      2A: Button, checkboxVariants, Nil, orNil, formatCount, formatMoney
ok      the keys the register uses exist in th and en
ok      Task 1 is in
ok      Task 2 has not run yet
ok      src/components/assets/asset-register-row-actions.tsx is unchanged since 886a290 (hash 3f1b681c2ccb79fc)
ok      tests/asset-register-table-ui.test.ts is unchanged since 886a290 (hash 710aef1c2dc3534e)
ok      tests/dropdown-menus-ui.test.ts is unchanged since 886a290 (hash 995b5c3960b28de0)
info    src/components/assets/asset-register-row-actions.tsx: CRLF
info    tests/asset-register-table-ui.test.ts: CRLF
info    tests/dropdown-menus-ui.test.ts: CRLF
preconditions hold for Task 2
```

Run: `node <temp>/p2b1-precheck.mjs --file c/assets/asset-register-row-actions.tsx`
Expected (after the header lines; exit 0):
```
file    src/components/assets/asset-register-row-actions.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
args    (no row holds this file)
```

Run: `git ls-files --eol src/components/assets/asset-register-row-actions.tsx tests/asset-register-table-ui.test.ts tests/dropdown-menus-ui.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf w/crlf` for all four. Keep them CRLF.

- [ ] **Step 2: Write the failing tests**

(a) `tests/asset-register-table-ui.test.ts` (CRLF; `read` strips `\r`). The pins of §10.4 table A (`:10-27`). Replace:

```ts
test("row actions show one next-step button and keep every action in the ⋯ menu", () => {
  const source = rowActions()

  assert.match(source, /const nextAction = getRowNextAction\(transactions\)/)
  assert.match(source, /next \? \[next, \.\.\.transactions\.filter\(\(transaction\) => transaction !== next\)\] : transactions/)
  assert.match(source, /<DropdownMenuTrigger asChild>/)
  assert.match(source, /<DropdownMenuContent data-no-row-click/)
  assert.match(source, /<SheetTrigger asChild>/)
  assert.match(source, /<SheetContent\s+side="bottom"/)
  assert.match(source, /useDeleteAction\(`\/api\/assets\/\$\{assetId\}`, \{ returnFocusRef: triggerRef \}\)/)
  assert.match(source, /variant="destructive"/)
  assert.match(source, /permissions\.canEdit \?/)
  assert.match(source, /permissions\.canCreate \?/)
  assert.match(source, /permissions\.canDelete \?/)
  assert.match(source, /reasonLabelKeys\[transaction\.reason\]/)
  assert.match(source, /size-11/)
  assert.doesNotMatch(source, /createPortal|getBoundingClientRect|addEventListener/)
})
```

with:

```ts
test("row actions show one next-step button and keep every action in the ⋯ menu", () => {
  const source = rowActions()
  // Plan 2B-3 Task 2 (spec 2B I5): the menu, the phone sheet and the delete confirm moved into the shared RowActions,
  // so their pins read ui/row-actions.tsx. The wrapper keeps the register's rules: next step, order, permissions, reasons.
  const shared = read("src/components/ui/row-actions.tsx")

  assert.match(source, /const nextAction = getRowNextAction\(transactions\)/)
  assert.match(source, /next \? \[next, \.\.\.transactions\.filter\(\(transaction\) => transaction !== next\)\] : transactions/)
  assert.match(source, /<RowActions\b/)
  assert.match(shared, /<DropdownMenuTrigger asChild>/)
  assert.match(shared, /<DropdownMenuContent data-no-row-click/)
  assert.match(shared, /<SheetTrigger asChild>/)
  assert.match(shared, /<SheetContent\s+side="bottom"/)
  assert.match(source, /deleteAction=\{permissions\.canDelete \? \{ endpoint: `\/api\/assets\/\$\{assetId\}` \} : undefined\}/)
  assert.match(shared, /useDeleteAction\([\s\S]*?\{ returnFocusRef: triggerRef \}\)/)
  assert.match(shared, /variant="destructive"/)
  assert.match(source, /permissions\.canEdit \?/)
  assert.match(source, /permissions\.canCreate \?/)
  assert.match(source, /permissions\.canDelete \?/)
  assert.match(source, /reasonLabelKeys\[transaction\.reason\]/)
  assert.match(shared, /size="icon-sm"/, "⋯ is 32px from md and 44px below")
  assert.doesNotMatch(source, /createPortal|getBoundingClientRect|addEventListener/)
})
```

(b) N1. Save this block as `<temp>/t02-table-block.ts` and run `node <temp>/p2b3-append.mjs <temp>/t02-table-block.ts tests/asset-register-table-ui.test.ts`:

```ts
// Plan 2B-3 Task 2 (spec 2B I5, §7.9, N1): the register's row actions are the shared RowActions, pattern ช1. The wrapper
// passes data only: the next step on desktop rows (phones get none), the transaction group, edit and clone, and delete
// only for users who may delete.
test("the register row actions are a thin wrapper of RowActions: next step on desktop only, dropdown or sheet, delete by permission (spec 2B I5)", () => {
  const source = rowActions()
  assert.match(source, /<RowActions\b[\s\S]*?menuLabel=\{t\("rowActionsMenu", \{ assetTag \}\)\}[\s\S]*?menu=\{variant === "desktop" \? "dropdown" : "sheet"\}/)
  assert.match(source, /next=\{variant === "desktop" \? \(next \? \{ label: t\(transactionLabelKeys\[next\.action\]\), href: next\.href, icon: icon\(next\.action\), onNavigate \} : null\) : undefined\}/, "a desktop row without a next step keeps the empty 120px slot, so ⋯ lines up")
  assert.match(source, /groups=\{\[/)
  assert.match(source, /label: t\("transactionMenu"\)/)
  assert.match(source, /code=\{assetTag\}\n\s+name=\{assetName\}/, "the phone sheet is headed by the tag and the name")
  assert.doesNotMatch(source, /function NextActionLink|sheetItemClasses|<DropdownMenu|<Sheet|triggerRef|contentClassName|size-8|closeLabel=|pr-14|pb-\[env/)
})
```

Expected: `appended <temp>/t02-table-block.ts to tests/asset-register-table-ui.test.ts (CRLF)`

(c) `tests/dropdown-menus-ui.test.ts` (CRLF; `read` strips `\r`). The pins of §10.4 table A (`:27-39`). Replace:

```ts
test("register row menus are Radix overlays and delete through the shared action", () => {
  const source = read("src/components/assets/asset-register-row-actions.tsx")
  assert.match(source, /<DropdownMenuContent data-no-row-click/)
  assert.match(source, /<SheetContent\s+side="bottom"/)
  assert.match(source, /useDeleteAction\(`\/api\/assets\/\$\{assetId\}`, \{ returnFocusRef: triggerRef \}\)/)
  assert.equal(source.match(/ref=\{triggerRef\}/g)?.length, 2)
  assert.match(source, /variant="destructive"/)
  assert.doesNotMatch(source, /createPortal|getBoundingClientRect|addEventListener|AssetDeleteButton/)
  // A blocked transaction stays reachable by arrow keys and reads its reason (spec 5.4).
  assert.match(source, /<DropdownMenuItem key=\{transaction\.action\} unavailable>/)
  assert.match(source, /<DropdownMenuItemDescription>\{reasonOf\(transaction\)\}<\/DropdownMenuItemDescription>/)
  assert.doesNotMatch(source, /disabled className="items-start"|<DropdownMenuLabel className=/)
})
```

with:

```ts
test("register row menus are Radix overlays and delete through the shared action", () => {
  // Plan 2B-3 Task 2 (spec 2B I5): the register's ⋯ menu, phone sheet and delete live in the shared RowActions now.
  const source = read("src/components/ui/row-actions.tsx")
  assert.match(source, /<DropdownMenuContent data-no-row-click/)
  assert.match(source, /<SheetContent\s+side="bottom"/)
  assert.match(source, /useDeleteAction\([\s\S]*?\{ returnFocusRef: triggerRef \}\)/)
  assert.match(source, /ref=\{triggerRef\}/)
  assert.match(source, /variant="destructive"/)
  assert.doesNotMatch(source, /createPortal|getBoundingClientRect|addEventListener|AssetDeleteButton/)
  // A blocked transaction stays reachable by arrow keys and reads its reason (spec 5.4).
  assert.match(source, /<DropdownMenuItem\b[^>]*\bunavailable>/)
  assert.match(source, /<DropdownMenuItemDescription>\{[\w.]*reason\}<\/DropdownMenuItemDescription>/)
  assert.doesNotMatch(source, /disabled className="items-start"|<DropdownMenuLabel className=/)
  const wrapper = read("src/components/assets/asset-register-row-actions.tsx")
  assert.match(wrapper, /kind: "unavailable"[\s\S]*?reason: reasonOf\(transaction\)/)
  assert.doesNotMatch(wrapper, /<DropdownMenu|<Sheet|triggerRef|AssetDeleteButton/, "the wrapper renders no menu of its own")
})
```

Run: `node --test tests/asset-register-table-ui.test.ts tests/dropdown-menus-ui.test.ts`
Expected: FAIL, `tests 24 · pass 21 · fail 3`:
- `row actions show one next-step button and keep every action in the ⋯ menu`: no match for `/<RowActions\b/`
- `the register row actions are a thin wrapper of RowActions: next step on desktop only, dropdown or sheet, delete by permission (spec 2B I5)`: no match for `/<RowActions\b[\s\S]*?menuLabel=\{t\("rowActionsMenu", \{ assetTag \}\)\}[\s\S]*?menu=…/`
- `register row menus are Radix overlays and delete through the shared action`: no match for `/kind: "unavailable"[\s\S]*?reason: reasonOf\(transaction\)/` (every assertion on `ui/row-actions.tsx` before it passes: the behavior is already in the primitive)

- [ ] **Step 3: Move the row actions onto `RowActions` (`src/components/assets/asset-register-row-actions.tsx`, CRLF)**

Three exact replacements, top to bottom. Make all three before you compile: (1) drops the imports that (3) stops using.

(1) Imports `:3-24`.

Replace:

```tsx
import { useRef, useState } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { ArrowRightLeft, Copy, MoreHorizontal, PackageCheck, Pencil, Trash2, Undo2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemDescription,
  DropdownMenuItemText,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useDeleteAction } from "@/components/master-data/use-delete-action"
import {
  getRowNextAction,
  type AssetRegisterTransaction,
  type AssetRegisterTransactionAction,
} from "@/lib/asset-operation-policy"
import { cn } from "@/lib/utils"
```

with:

```tsx
import { useTranslations } from "next-intl"
import { ArrowRightLeft, Copy, PackageCheck, Pencil, Undo2 } from "lucide-react"
import { RowActions, type RowActionItem } from "@/components/ui/row-actions"
import {
  getRowNextAction,
  type AssetRegisterTransaction,
  type AssetRegisterTransactionAction,
} from "@/lib/asset-operation-policy"
```

(2) `sheetItemClasses` (`:46-50`) goes; the component gets its comment.

Replace:

```tsx
} as const
const sheetItemClasses =
  "flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function AssetRegisterRowActions({
```

with:

```tsx
} as const

// The register's row actions, pattern ช1 (spec 2B I5, §7.9): a client wrapper that turns one row into the data-only
// props of the shared RowActions. RowActions draws the next-step button (desktop rows only; a row without one keeps the
// empty 120px slot), ⋯ (a dropdown in the table, a bottom sheet in the phone list), the delete confirm and the focus
// return to ⋯. This file keeps the register's own rules: which step is next, the order, the permissions and the reasons.
export function AssetRegisterRowActions({
```

(3) The body (`:73`) to the end of the file (`:269`): the hand-written dropdown, sheet and `NextActionLink` give way to one `RowActions`.

Replace:

```tsx
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const [sheetOpen, setSheetOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const { deleting, runDelete } = useDeleteAction(`/api/assets/${assetId}`, { returnFocusRef: triggerRef })
  const nextAction = getRowNextAction(transactions)
  const next = nextAction ? transactions.find((transaction) => transaction.action === nextAction) : undefined
  const ordered = next ? [next, ...transactions.filter((transaction) => transaction !== next)] : transactions
  const menuLabel = t("rowActionsMenu", { assetTag })
  const reasonOf = (transaction: AssetRegisterRowTransaction) =>
    transaction.reason ? t(reasonLabelKeys[transaction.reason]) : ""

  if (variant === "desktop") {
    return (
      <div className={cn("flex items-center justify-end gap-1", className)}>
        {next ? (
          <NextActionLink transaction={next} label={t(transactionLabelKeys[next.action])} assetTag={assetTag} onNavigate={onNavigate} />
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              ref={triggerRef}
              type="button"
              aria-label={menuLabel}
              title={menuLabel}
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent data-no-row-click align="end" className="w-64">
            <DropdownMenuLabel>{t("transactionMenu")}</DropdownMenuLabel>
            {ordered.map((transaction) => {
              const Icon = transactionIcons[transaction.action]
              const title = t(transactionLabelKeys[transaction.action])
              if (!transaction.enabled) {
                return (
                  <DropdownMenuItem key={transaction.action} unavailable>
                    <Icon aria-hidden="true" />
                    <DropdownMenuItemText>
                      {title}
                      <DropdownMenuItemDescription>{reasonOf(transaction)}</DropdownMenuItemDescription>
                    </DropdownMenuItemText>
                  </DropdownMenuItem>
                )
              }
              return (
                <DropdownMenuItem key={transaction.action} asChild>
                  <Link href={transaction.href} onClick={onNavigate}>
                    <Icon className="text-primary" aria-hidden="true" />
                    {title}
                  </Link>
                </DropdownMenuItem>
              )
            })}
            {permissions.canEdit || permissions.canCreate ? <DropdownMenuSeparator /> : null}
            {permissions.canEdit ? (
              <DropdownMenuItem asChild>
                <Link href={editHref} onClick={onNavigate}>
                  <Pencil aria-hidden="true" />
                  {tCommon("edit")}
                </Link>
              </DropdownMenuItem>
            ) : null}
            {permissions.canCreate ? (
              <DropdownMenuItem asChild>
                <Link href={cloneHref} onClick={onNavigate}>
                  <Copy aria-hidden="true" />
                  {t("cloneAsset")}
                </Link>
              </DropdownMenuItem>
            ) : null}
            {permissions.canDelete ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" disabled={deleting} onSelect={() => void runDelete()}>
                  <Trash2 aria-hidden="true" />
                  {tCommon("delete")}
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-label={menuLabel}
          className={cn(
            "inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          <MoreHorizontal className="size-5" aria-hidden="true" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        closeLabel={tCommon("close")}
        data-no-row-click
        className="max-h-[85dvh] gap-0 rounded-t-xl pb-[env(safe-area-inset-bottom)]"
      >
        <SheetHeader className="pr-14">
          <SheetTitle>{assetTag}</SheetTitle>
          <SheetDescription className="truncate">{assetName}</SheetDescription>
        </SheetHeader>
        <ul className="space-y-0.5 overflow-y-auto px-2 pb-3">
          {ordered.map((transaction) => {
            const Icon = transactionIcons[transaction.action]
            const title = t(transactionLabelKeys[transaction.action])
            return (
              <li key={transaction.action}>
                {transaction.enabled ? (
                  <Link href={transaction.href} onClick={onNavigate} className={cn(sheetItemClasses, "text-foreground")}>
                    <Icon className="size-4 text-primary" aria-hidden="true" />
                    {title}
                  </Link>
                ) : (
                  <div aria-disabled="true" className={cn(sheetItemClasses, "cursor-not-allowed py-2 text-muted-foreground hover:bg-transparent")}>
                    <Icon className="size-4" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block">{title}</span>
                      <span className="block text-xs font-normal">{reasonOf(transaction)}</span>
                    </span>
                  </div>
                )}
              </li>
            )
          })}
          {permissions.canEdit ? (
            <li className="border-t border-border pt-0.5">
              <Link href={editHref} onClick={onNavigate} className={cn(sheetItemClasses, "text-foreground")}>
                <Pencil className="size-4" aria-hidden="true" />
                {tCommon("edit")}
              </Link>
            </li>
          ) : null}
          {permissions.canCreate ? (
            <li>
              <Link href={cloneHref} onClick={onNavigate} className={cn(sheetItemClasses, "text-foreground")}>
                <Copy className="size-4" aria-hidden="true" />
                {t("cloneAsset")}
              </Link>
            </li>
          ) : null}
          {permissions.canDelete ? (
            <li className="border-t border-border pt-0.5">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setSheetOpen(false)
                  void runDelete()
                }}
                className={cn(sheetItemClasses, "text-danger disabled:cursor-not-allowed")}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                {tCommon("delete")}
              </button>
            </li>
          ) : null}
        </ul>
      </SheetContent>
    </Sheet>
  )
}

function NextActionLink({
  transaction,
  label,
  assetTag,
  onNavigate,
}: {
  transaction: AssetRegisterRowTransaction
  label: string
  assetTag: string
  onNavigate?: () => void
}) {
  const Icon = transactionIcons[transaction.action]
  return (
    <Link
      href={transaction.href}
      onClick={onNavigate}
      aria-label={`${label}: ${assetTag}`}
      className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-primary-border bg-primary-soft px-2.5 text-xs font-medium text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </Link>
  )
}
```

with:

```tsx
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const nextAction = getRowNextAction(transactions)
  const next = nextAction ? transactions.find((transaction) => transaction.action === nextAction) : undefined
  const ordered = next ? [next, ...transactions.filter((transaction) => transaction !== next)] : transactions
  const reasonOf = (transaction: AssetRegisterRowTransaction) =>
    transaction.reason ? t(reasonLabelKeys[transaction.reason]) : ""
  const icon = (action: AssetRegisterTransactionAction, className?: string) => {
    const Icon = transactionIcons[action]
    return <Icon className={className} aria-hidden="true" />
  }
  // A blocked transaction stays in the menu as "unavailable": arrow keys reach it, it reads its reason, and it does nothing.
  const transactionItems: RowActionItem[] = ordered.map((transaction) =>
    transaction.enabled
      ? { kind: "link", key: transaction.action, label: t(transactionLabelKeys[transaction.action]), href: transaction.href, icon: icon(transaction.action, "text-primary"), onNavigate }
      : { kind: "unavailable", key: transaction.action, label: t(transactionLabelKeys[transaction.action]), reason: reasonOf(transaction), icon: icon(transaction.action) },
  )
  const recordItems: RowActionItem[] = [
    ...(permissions.canEdit ? [{ kind: "link" as const, key: "edit", label: tCommon("edit"), href: editHref, icon: <Pencil aria-hidden="true" />, onNavigate }] : []),
    ...(permissions.canCreate ? [{ kind: "link" as const, key: "clone", label: t("cloneAsset"), href: cloneHref, icon: <Copy aria-hidden="true" />, onNavigate }] : []),
  ]

  // RowActions skips an empty group, so a user who may neither edit nor create sees the transactions alone.
  return (
    <RowActions
      code={assetTag}
      name={assetName}
      menuLabel={t("rowActionsMenu", { assetTag })}
      menu={variant === "desktop" ? "dropdown" : "sheet"}
      next={variant === "desktop" ? (next ? { label: t(transactionLabelKeys[next.action]), href: next.href, icon: icon(next.action), onNavigate } : null) : undefined}
      groups={[
        { key: "transactions", label: t("transactionMenu"), items: transactionItems },
        { key: "record", items: recordItems },
      ]}
      deleteAction={permissions.canDelete ? { endpoint: `/api/assets/${assetId}` } : undefined}
      className={className}
    />
  )
}
```

Check: the file is 99 lines; `git diff -U0 src/components/assets/asset-register-row-actions.tsx | grep -c "^@@"` prints `12`.

- [ ] **Step 4: Put the file in `MIGRATED_LIST_FILES`**

Run: `node <temp>/p2b-budget.mjs c/assets/asset-register-row-actions.tsx --migrated`
Expected (exit 0):
```
MIGRATED_LIST_FILES: added
written: src/components/assets/asset-register-row-actions.tsx
```

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/asset-register-table-ui.test.ts tests/dropdown-menus-ui.test.ts tests/asset-clone-ui.test.ts tests/row-actions-ui.test.ts tests/dialog-trigger-handles.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `tests 110 · pass 110 · fail 0` (asset-register-table-ui 18, dropdown-menus-ui 6, asset-clone-ui 3, row-actions-ui 8, dialog-trigger-handles 5, list-frame-guards 21, visual-foundation-guards 26, form-migration-guards 23).

Run: `node <temp>/p2b1-precheck.mjs --file c/assets/asset-register-row-actions.tsx`
Expected: `· in MIGRATED_LIST_FILES` on the `file` line and `args    (no row holds this file)`; exit 0.

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected: exit 0, `budgets hold: no live count is over its row`, totals unchanged (`LT1 BUDGETS.LT1 36 in 10 rows`, `LV2 BUDGETS.LV2 98 in 30 rows`), no `slack` line except the LB1 row of `D/maintenance/[id]/page.tsx`.

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b3-tw-probe.mjs src/components/assets/asset-register-row-actions.tsx`
Expected: `checked 1 classes, missing 0` (exit 0): `text-primary`, the icon color of an enabled transaction. Every other class now comes from `RowActions`.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `tests 1929 · pass 1928 · fail 0 · skipped 1` (one more than after Task 1: N1).
- `npx tsc --noEmit`: no errors (the item objects type-check against `RowActionItem`; the transaction items take their `kind` from the annotation, the record items carry `as const`).
- `npm run lint`: 0 errors and the 146 warnings under `.agents/`; `npx eslint src/components/assets/asset-register-row-actions.tsx tests/asset-register-table-ui.test.ts tests/dropdown-menus-ui.test.ts tests/list-frame-guards.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 4 files: `src/components/assets/asset-register-row-actions.tsx` 32 insertions and 202 deletions, `tests/asset-register-table-ui.test.ts` 25 and 7, `tests/dropdown-menus-ui.test.ts` 9 and 5, `tests/list-frame-guards.test.ts` 1 insertion. The line-ending check prints `99 99` for the wrapper, `220 220` for `tests/asset-register-table-ui.test.ts`, `86 86` for `tests/dropdown-menus-ui.test.ts` and `547 547` for `tests/list-frame-guards.test.ts` (CRLF throughout).

- [ ] **Step 8: Commit**

```bash
git add src/components/assets/asset-register-row-actions.tsx tests/asset-register-table-ui.test.ts tests/dropdown-menus-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "refactor(ui): register row actions on the shared RowActions, pattern ช1 (2B-3 task 2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 15, spec §8.7 rows `/th/assets`, §7.15):** at 1440 the next step is 120 × 32 in every row that has one, and ⋯ stays in the same place in rows without one; hover a row and Tab into it: the next step fills light blue and the row stays filled while focus is on ⋯ and while its menu is open. ⋯ → arrow keys reach a transaction that cannot run and read its reason; Enter on it neither closes the menu nor opens the asset. As a user with delete: ⋯ → "ลบ" → the confirm → "ยกเลิก" (never confirm): focus returns to ⋯. As a user without delete: no "ลบ". At 375: ⋯ (44px) opens the bottom sheet with the tag in monospace as its title; tapping outside closes it without opening the asset; "ลบ" closes the sheet and asks (cancel). Keyboard: Esc closes the menu and returns focus to ⋯.

---

### Task 3: `c/assets/asset-register-table.tsx` on the `DataTable` parts, with its dense rows, `Nil`, `formatMoney`, 44px checkboxes and no edge shadow (a 2C batch 4 file: never its dialog)

Spec §10.2 I3, I4, I26, I33; §10.3 bullet 2B-3; §8.7 file 1 and "ตัวเลข"; §7.8.1–7.8.7; §8.11 rows 3 and 14; §10.4 table A row 2B-3 (`tests/asset-register-table-ui.test.ts:125-126`, `tests/asset-register-ux.test.ts:99`, the VFG R2 comment); §7.17 N2–N5; rulings R-j, R-n, R-p, R-q, O1 and controller rulings (a)–(g). One file, one commit, together with one message key. The table is a 2C batch 4 file (FMG `BATCH_FILES` "4"): 2C plan 4 rebuilds its bulk-update dialog after this plan merges. Change nothing from `<AccessibleDialog` (`:697`) to `</AccessibleDialog>` (`:774`), keep the bulk-bar container (`:452-458`, with the `fixed … shadow-lg` line `:455`), never run a formatter, and use exact-string replacements only (the file is CRLF). All line numbers below are 886a290's.

Rulings this task applies:
- **I3 (dense rows stay in this file until phase 3):** no `DataTable` wrapper and no `density`. Two file-local strings: `headerClasses` (the `DataTable` header look: white, 13/500, faint, `align-bottom`, no capitals) and `cellClasses` (`border-b border-border-soft px-3 py-2 align-top`). The table uses `DataTableBody`, `ClickableTableRow` (2B-1 gave it `group/row` and the row fill), `TableEmptyRow`, `DataTableFoot`, and `DataTableHead sort` for the three sortable middle columns only (code, name, price). The select column is always first and the actions column always last, so the primitive's `first:`/`last:` gutters never reach a `DataTableHead`. The plain heads (`:572-586`: category, company/branch, location, custodian, ownership, status and condition with their help popovers) keep `headerClasses` and do not change. `table-fixed`, the `<colgroup>`, `style={{ minWidth }}` and the two pinned columns stay (DESIGN.md:500-510, ruling (g)).
- **I26, I3 (the actions column):** `pl-1.5 pr-2` on its head and its cells, through `cn(headerClasses, "pl-1.5 pr-2 text-right", …)` and `cn(cellClasses, "pl-1.5 pr-2", …)`: 172 − 6 − 8 − 0.5 = 157.5px for the 156px `RowActions` pair. `cn` keeps `px-3` and adds `pl-1.5 pr-2` after it; Tailwind 4.2.4 emits `.pl-1\.5` and `.pr-2` after `.px-3`, so they win (Step 7 shows the rules).
- **I4:** the scroller keeps its `ref`, `data-asset-desktop-table` and classes, and `isOverflowing` with the `asset.tableScrollHint` line (`:519-526`) stays as it is: no `DataTableScrollArea`.
- **R-j (no edge shadow):** `assetRegisterActionsShadowClasses` (`:152`), the `hasMoreRight` state (`:200`) and its measure line (`:207`), `onScroll` (`:531`) and the `hasRemainingHorizontalContent` import (`:10`) go; the helper stays in `src/lib/horizontal-scroll.ts` (`c/assets/asset-detail-tabs.tsx` uses it). The pinned cells fill with the row through `group-hover/row` and `group-focus-within/row` (the fill follows focus to ⋯). **Ruling (beyond the §7.8.1 string):** they also take `group-has-[[aria-expanded=true]]/row:bg-row-hover` and the row's "instant on, soft off" timing (`transition-colors`, `duration-0` on the way in), as `DataTable`'s own pinned cells do (`ui/data-table.tsx:29-32`); without it the code and actions cells would stay white while the rest of the row is lit with ⋯ open. Their side lines are `border-r-border` / `border-l-border`: a plain `border-border` would make `cn()` drop the `border-border-soft` row line under the pinned cells. The head keeps `border-r border-border` / `border-l border-border` (its bottom line is `border-border` too).
- **Header (B3(2)):** `<thead>` loses `bg-muted`; the pinned head constant becomes `z-30 bg-surface`. The actions head shows no word: `<span className="sr-only">{labels.actions}</span>` (mockup `register.html:86`; the column still has its name).
- **Price (§7.8.2, DESIGN.md money rule):** the head is the existing key `asset.purchasePriceBaht` ("ราคาซื้อ (บาท)"), right-aligned and sortable; the cell is `formatMoney(asset.purchasePrice) ?? <Nil />`, right-aligned with `num`. **Ruling (departure from §7.4 and §7.1 row 3.6):** the table reads the head through its own `t("purchasePriceBaht")`, as it already does for `registerRange` and `selectMode`, instead of a new `labels.purchasePriceBaht` passed from `D/assets/page.tsx`: the commit stays one code file, and Task 13's page has no label to add. `labels.purchasePrice` stays for the CSV header (`:314`).
- **R-n, R-p (§7.8.2):** the custodian cell is `orNil(asset.custodian, t("noCustodian"))` with the new key (controller ruling (c), spec §10.2): "—" on screen, "ไม่มีผู้ถือครอง" for a screen reader; an empty string counts as empty, as `|| "-"` did. The code is `<span className="tag font-medium">` inside the truncating cell (the cell keeps its `title`), the serial `<span className="tag">` in a `text-meta` line (20 + 20 = the 40px thumbnail, so the row stays 56px). Category, company/branch and location stay one "CODE - name" string (phase 3, I26).
- **Numbers:** the range (`:173-177`) and the bulk count (`:460`) go through `formatCount`; `useLocale` and `numberLocale` go.
- **O1, K16 (§7.8.3):** both checkboxes are `checkboxVariants()` inside a `flex min-h-11 w-11` label that fills the 44px column (`p-0` on the head and the cell through `cn`, which drops `px-3 py-2(.5)`). The row label carries `data-no-row-click`: `ClickableTableRow` skips clicks on `input` but not on `label` (`ui/clickable-table-row.tsx:29`), so without it a click beside the box would open the asset. The head row becomes 44px.
- **Empty (§7.8.5):** the desktop empty row is `TableEmptyRow emptyState={emptyState}`; with a filter on, `emptyState` adds `actionVariant: "secondary"` (the outline "clear filters", the primary color stays with the page's own action). The phone empty state keeps `<ActionEmptyState {...emptyState} />` (`tests/asset-register-ux.test.ts:79`).
- **Footer (§7.8.6, I33):** `DataTableFoot` + `Pagination` with today's props plus `range: rangeLabel`. **Ruling (departure from §7.8.6):** the section text keeps a separate `<p>` beside `Pagination`; the 2B-1 `Pagination` prints "range · page" itself on the left, in one `aria-live` line, with its buttons on the right, so a second `<p>` in `DataTableFoot` would stack above the nav. The summary bar at the top keeps its range line (`text-meta num`).
- **Summary bar (§7.8.6):** the phone "เลือก/เสร็จ" toggle becomes `Button variant="ghost" size="md"` with `aria-pressed`. The sort, column and export triggers are Tasks 10–12.
- **Bulk bar (§7.8.7, R-q, §10.3 "ไม่แตะ … แถบคำสั่งกลุ่ม :455", controller task text "NEVER … the bulk-action bar (old :455)"):** **ruling:** the bar stays where it is with its container byte for byte (`:452-458`: `data-asset-bulk-bar`, `fixed inset-x-3 bottom-[…] … shadow-lg …`, the heading); FMG GL1 and VFG R2 keep counting it once, and nothing moves to a new file. Only the four buttons inside become `Button` (`size="md"`, the first primary, the others `outline`, `w-full sm:w-auto`) and the count goes through `formatCount` (§7.8.2): 2C spec `06-actions.md:301` leaves the bar's buttons to 2B, and N5 (§7.17) expects four `<Button`. If the controller reads its ruling as "the whole bar", drop replacement (9) and the three `bar` assertions of the last appended test (keep its select-toggle line); nothing else depends on them (`Button` and `formatCount` stay in use).
- **VFG, ruling (b):** the R2 row of the table stays 1 (the bar's `shadow-lg`); its comment "(2B / phase 3)" becomes "(phase 3, R-q)", the words of spec §7.12 and §9.2.2. R7 has no row for this file: its header was solid `bg-muted`, which LT1 counted.
- **LFG, rulings (a), (e), (f):** LT1 2 (`<thead className="bg-muted">`, the `uppercase` head of `SortableHeader`), LT2 1 (`function SortableHeader`), LT3 1 (`<td colSpan>`), LV2 1 (`|| "-"`), LV3 1 (`formatCurrency(`) all go to 0, and the file joins `MIGRATED_LIST_FILES`: no later 2B plan lists it (spec §8.8–8.9). R2 is not an LFG counter.
- **FMG, ruling (d) (never edited; spec §8.7 "สถานะที่ส่งให้ 2C-4"):** after this task the table counts GF7 `OLD_MARKUP` 4 (budget 6; the two `h-4 w-4 rounded border-border` checkboxes are gone, the four label spans of the dialog stay: `:692`, `:707`, `:722`, `:732`, were `:708`, `:723`, `:738`, `:748`), GB1 `LOADER2` 1 (the dialog's submit spinner `:753`, was `:769`), GL1 `FIXED_BOTTOM_BARS` 1 (the bar `:463`, was `:455`), GF2 `RAW_FIELDS` 4 and GF3 `FIELD_CLASS_STRINGS` 4 (the dialog's fields), GF5 floors `[1, 1, 0]` (the dialog's `required` and `maxLength`), and it stays in GD2 `PENDING_FOOTER_PARTS` (one `AccessibleDialog`, no footer part). The dialog moves from `:697-774` to `:681-758`; Task 16 writes the new numbers into DEVELOPER_HANDOFF.md for 2C plan 4.

What users will see on `/th/assets`:
- The table header is white with small grey words and no capitals. The sorted column (code, name or price) shows an arrow icon instead of "↑"/"↓", and screen readers hear its order. The actions column has no visible heading.
- Codes and serial numbers are monospace. A missing custodian shows "—" and is read "ไม่มีผู้ถือครอง". The price column reads "ราคาซื้อ (บาท)" with "1,234.00" right-aligned (no "฿"); a missing price shows "—".
- The checkboxes are 44 × 44 targets; a click next to a box ticks it and never opens the asset. The header row is 44px; body rows stay 56px.
- The pinned code and actions columns have a thin line instead of a shadow, and light up with their row on hover, on keyboard focus and while the row's ⋯ menu is open.
- The footer reads "1–25 จาก N รายการ · หน้า 1 จาก M" on the left with "ก่อนหน้า"/"ถัดไป" on the right (page sizes stay in the filter sheet).
- A filter that finds nothing shows the empty state with an outline "clear filters" button.
- Phones: "เลือก"/"เสร็จ" is a ghost button; in the floating bulk bar the four buttons are the standard ones (44px below 768px, 36px from 768px, which was from 640px) and the count is th-TH.

Not in this task: the phone list (Task 4) · the toolbar, search, filter sheet, tabs, chips (Tasks 5–9) · the sort, column and export triggers (Tasks 10–12) · `D/assets/page.tsx` (Task 13) · the bulk-update dialog and its trigger's dialog (2C plan 4) · docs (Task 16). Do not run a formatter.

**Files:**
- Modify: `src/components/assets/asset-register-table.tsx` (`i/lf w/crlf`; 19 exact replacements)
- Modify: `messages/th.json`, `messages/en.json` (`i/lf w/crlf`; through `node scripts/messages-edit.mjs` only: 1 key)
- Modify: `tests/asset-register-table-ui.test.ts` (`i/lf w/crlf`; 1 exact replacement, 1 appended block)
- Modify: `tests/asset-register-ux.test.ts` (`i/lf w/crlf`; 1 exact replacement; the file reads sources without stripping `\r`, so the new regex has no `\n`)
- Modify: `tests/visual-foundation-guards.test.ts` (`i/lf w/crlf`; 1 exact replacement of a comment) and `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only: `t03-table-block.ts`, `t03-messages.json`

**Must keep passing without edits** (886a290 numbering; Task 2 moved `tests/asset-register-table-ui.test.ts` down by 5 lines from `:28`):
- `tests/asset-register-table-ui.test.ts:29-36`, `:78-87` (`data-asset-register-summary`, `<AssetRegisterSortMenu />`, the `hidden items-center gap-2 md:flex` group, `<Pagination\b`, `aria-busy={isPending}`), `:89-95`, `:97-106` (`className="w-full table-fixed`, `style={{ minWidth: … }}`, `<colgroup>`), `:108-118` (thumbnail, `title={asset.name}`, `title={asset.custodian ?? undefined}`, the badges), `:166-177` (select mode, `aria-pressed={selectMode}`, the `fixed inset-x-3 …` bar, `reserveBulkBarSpace`), `:186-195`, `:197-202` (the bar heading)
- `tests/asset-register-ux.test.ts:40-62`, `:74-83`, `:85-111` (other than `:99`), `:122-124`, `:150-175`
- `tests/asset-return-navigation.test.ts:29-39` · `tests/asset-status-help-ui.test.ts:28-40` · `tests/attachment-preview-dialog-ui.test.ts:24-35` (`<AccessibleDialog`, no `fixed inset-0`) · `tests/modern-enterprise-theme.test.ts:67` · `tests/asset-clone-ui.test.ts:6-14` · `tests/clickable-table-row-navigation.test.ts` · `tests/list-primitives-ui.test.ts` · `tests/row-actions-ui.test.ts` · `tests/dialog-trigger-handles.test.ts`
- `tests/form-migration-guards.test.ts` (whole file, never edited) · `tests/visual-foundation-guards.test.ts` (every other line) · `tests/thai-glossary.test.ts` · `tests/messages-parity.test.ts`

**Interfaces:**
- Consumes:
  - 2B-1: `DataTableHead({ align?: "left" | "right", sort?: DataTableSort, sticky?, hideLabel?, …th props })`, `type DataTableSort = { href: string; direction: "asc" | "desc" | null; scroll?: boolean }`, `DataTableBody(tbody props)`, `DataTableFoot(div props)`, `TableEmptyRow({ colSpan, emptyState: ActionEmptyStateProps })` from `@/components/ui/data-table`; `ClickableTableRow({ href, label, className?, onNavigate?, children })` (rows carry `group/row`); `Pagination({ page, totalPages, previousHref, nextHref, labels: { navigation, previous, next, pageOf, range? } })`.
  - 2A: `Button({ variant?, size?, …button props })` from `@/components/ui/button`; `checkboxVariants({ size?: "md" | "lg" })` from `@/components/ui/field-variants`; `Nil({ label?, className? })` and `orNil(value, label?)` from `@/components/ui/nil`; `formatCount`, `formatMoney` from `@/lib/display-format`; `ActionEmptyState`'s `actionVariant?: "primary" | "secondary"`; the `tag` and `num` utilities.
  - Task 1: `assetRegisterColumnWidths.actions` 172. Task 2: `AssetRegisterRowActions` (unchanged API). Task 1 helpers: `<temp>/p2b3-t1-precheck.mjs`, `<temp>/p2b3-append.mjs`, `<temp>/p2b3-tw-probe.mjs`.
  - Existing keys: `asset.purchasePriceBaht`, `asset.registerRange`, `asset.selectMode`, `asset.selectModeDone`, `common.pagination`, `common.pageOf`, `common.noValue`.
- Produces:
  - Unchanged exports `AssetRegisterTable(props)` and `type AssetRegisterRow`; the props and the `labels` type do not change (`labels.purchasePrice` still names the CSV column, `labels.actions` names the actions column for screen readers). `D/assets/page.tsx` needs no edit for this task.
  - `asset.noCustodian` "ไม่มีผู้ถือครอง" / "No custodian" in both locales.
  - LFG: no row of the table; the table in `MIGRATED_LIST_FILES` (53 files).
  - For 2C plan 4: the dialog at `:681-758`, the bar at `:462-463`, the FMG counts above.

| guard | `c/assets/asset-register-table.tsx` before → after |
|---|---|
| LFG | LT1 2 · LT2 1 · LT3 1 · LV2 1 · LV3 1 → all – · joins `MIGRATED_LIST_FILES` |
| VFG R2 | 1 → 1 (comment "(phase 3, R-q)") · R7: no row |
| totals | LT1 36 → 34 · LT2 2 → 1 · LT3 3 → 2 · LV2 98 → 97 · LV3 36 → 35 (spec §10.4 table C column 2B-3, controller ruling (a)); every other guard unchanged |
| FMG (not edited) | GF7 live 6 → 4 (budget 6) · GB1 1 · GL1 1 · GF2 4 · GF3 4 · GF5 `[1, 1, 0]` · GD2 pending |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b3-t1-precheck.mjs 3`
Expected: `git status` prints nothing; the script prints:
```
ok      2B-1: RowActions with deleteAction, menu, the next slot and the link/unavailable items
ok      2B-1: DataTableHead sort, DataTableBody, DataTableFoot, TableEmptyRow emptyState
ok      2B-1: ClickableTableRow carries group/row
ok      2B-1: Pagination takes labels.range
ok      2A: Button, checkboxVariants, Nil, orNil, formatCount, formatMoney
ok      the keys the register uses exist in th and en
ok      Task 1 is in
ok      Task 2 is in
ok      Task 3 has not run yet
ok      src/components/assets/asset-register-table.tsx is unchanged since 886a290 (hash d87a19b4c8d0b7e0)
ok      tests/asset-register-ux.test.ts is unchanged since 886a290 (hash 54ee073c3f7310b4)
ok      asset.noCustodian is not in th or en yet
info    src/components/assets/asset-register-table.tsx: CRLF
info    tests/asset-register-ux.test.ts: CRLF
preconditions hold for Task 3
```

Run: `node <temp>/p2b1-precheck.mjs --file c/assets/asset-register-table.tsx`
Expected (after the header lines; exit 0):
```
file    src/components/assets/asset-register-table.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
R2         1       –     –     1
LT1        2       2     0     2
LT2        1       1     0     1
LT3        1       1     0     1
LV2        1       1     0     1
LV3        1       1     0     1
args    LT1=2:2 LT2=1:1 LT3=1:1 LV2=1:1 LV3=1:1
```
(R2 has no per-file budget column here: its budget is the inline object of VFG's R2 test, where the table's row is 1.)

Run: `git ls-files --eol src/components/assets/asset-register-table.tsx messages/th.json messages/en.json tests/asset-register-table-ui.test.ts tests/asset-register-ux.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf w/crlf` for all seven. Keep them CRLF.

- [ ] **Step 2: Write the failing tests**

(a) `tests/asset-register-table-ui.test.ts` (CRLF; `read` strips `\r`). The pin of §10.4 table A `:125-126`: the test at `:125-132` (886a290 `:120-127`). Replace:

```ts
test("the scroll hint and the actions shadow follow real overflow", () => {
  const source = table()

  assert.match(source, /new ResizeObserver\(/)
  assert.match(source, /\{isOverflowing \? \(/)
  assert.match(source, /hasRemainingHorizontalContent\(/)
  assert.match(source, /hasMoreRight && /)
})
```

with:

```ts
test("the scroll hint follows real overflow and the pinned actions column has no edge shadow", () => {
  const source = table()

  assert.match(source, /new ResizeObserver\(/)
  assert.match(source, /\{isOverflowing \? \(/)
  // Spec 2B R-j: the mockup draws no shadow on the pinned column; its left line separates it.
  assert.doesNotMatch(source, /hasMoreRight|hasRemainingHorizontalContent|shadow-\[|rgb\(/)
})
```

(b) N2–N5. Save this block as `<temp>/t03-table-block.ts` and run `node <temp>/p2b3-append.mjs <temp>/t03-table-block.ts tests/asset-register-table-ui.test.ts`:

```ts
// Plan 2B-3 Task 3 (spec 2B §7.8, I3, I4, R-j, R-n, R-p, O1, N2–N5): the desktop table on the DataTable parts. The
// dense rows stay in this file (headerClasses, cellClasses) until phase 3; the scroller, the pinned columns and the
// scroll hint stay the register's own (I4).
test("the register table builds on the DataTable parts and keeps its dense rows in its own classes (spec 2B I3)", () => {
  const source = table()
  assert.match(source, /const headerClasses = "border-b border-border bg-surface px-3 py-2\.5 text-left align-bottom text-meta font-medium whitespace-nowrap text-faint-foreground"/)
  assert.match(source, /const cellClasses = "border-b border-border-soft px-3 py-2 align-top"/)
  assert.match(source, /const assetRegisterStickyHeaderColumnClasses = "z-30 bg-surface"/)
  assert.match(source, /group-has-\[\[aria-expanded=true\]\]\/row:bg-row-hover/, "the pinned cells stay lit with the row while its ⋯ menu is open")
  assert.match(source, /cn\(headerClasses, "pl-1\.5 pr-2 text-right", /, "the actions column: 172 − 6 − 8 − 0.5 leaves 157.5px for the 156px RowActions pair")
  assert.match(source, /cn\(cellClasses, "pl-1\.5 pr-2", /)
  assert.equal(source.match(/<DataTableHead\b[^>]*\bsort=\{sortOf\("(?:assetTag|name|purchasePrice)"\)\}/g)?.length, 3, "the code, name and price heads sort through DataTableHead (aria-sort and an arrow icon)")
  assert.match(source, /const current = filters\.sort === field \? \(filters\.direction === "asc" \? "asc" : "desc"\) : null/)
  assert.match(source, /<DataTableBody>/)
  assert.match(source, /<TableEmptyRow colSpan=\{visibleColumnCount \+ 2\} emptyState=\{emptyState\} \/>/)
  assert.match(source, /actionVariant: "secondary"/)
  assert.match(source, /<DataTableFoot>\n\s+<Pagination\b/)
  assert.match(source, /range: rangeLabel,/)
  assert.match(source, /<span className="sr-only">\{labels\.actions\}<\/span>/)
  assert.doesNotMatch(source, /<thead className="bg-muted"|uppercase|function SortableHeader|className="group"|density=|data-density/)
})

test("register cells: codes in monospace, money through formatMoney, empty values through Nil (spec 2B R-n, R-p, §7.8.2)", () => {
  const source = table()
  assert.match(source, /<span className="tag font-medium">\{asset\.assetTag\}<\/span>/)
  assert.match(source, /<span className="tag">\{asset\.serialNumber\}<\/span>/)
  assert.match(source, /orNil\(asset\.custodian, t\("noCustodian"\)\)/)
  assert.match(source, /formatMoney\(asset\.purchasePrice\) \?\? <Nil \/>/)
  assert.match(source, /t\("purchasePriceBaht"\)/, "the unit sits in the head, so the cells drop the ฿")
  assert.match(source, /from: formatCount\(fromRow\),/)
  assert.doesNotMatch(source, /formatCurrency|\|\| "-"|toLocaleString\(|useLocale/)
  assert.equal(messages("th").noCustodian, "ไม่มีผู้ถือครอง")
  assert.equal(typeof messages("en").noCustodian, "string")
})

test("register checkboxes are the shared checkbox in a 44px label, and a click beside the box never opens the row (spec 2B O1)", () => {
  const source = table()
  assert.equal(source.match(/className=\{checkboxVariants\(\)\}/g)?.length, 2)
  assert.match(source, /<th scope="col" className=\{cn\(headerClasses, "p-0"\)\}>\n\s+<label className="flex min-h-11 w-11 cursor-pointer items-center justify-center">/)
  assert.match(source, /<label data-no-row-click className="flex min-h-11 w-11 cursor-pointer items-center justify-center">/)
  assert.doesNotMatch(source, /h-4 w-4 rounded border-border/)
})

test("the bulk bar keeps its place and frame, with its buttons on Button (spec 2B R-q, §7.8.7)", () => {
  const source = table()
  const bar = source.slice(source.indexOf("data-asset-bulk-bar"), source.indexOf("{assets.length === 0 ? ("))
  assert.match(bar, /"fixed inset-x-3 [^"]*shadow-lg[^"]*"/, "phase 3 moves the bar (R-q)")
  assert.equal(bar.match(/<Button\b/g)?.length, 4)
  assert.match(bar, /\{formatCount\(selectedAssets\.length\)\} \{labels\.selectedCount\}/)
  assert.match(source, /<Button variant="ghost" size="md" aria-pressed=\{selectMode\} onClick=\{toggleSelectMode\} className="md:hidden">/)
})
```

Expected: `appended <temp>/t03-table-block.ts to tests/asset-register-table-ui.test.ts (CRLF)`

(c) `tests/asset-register-ux.test.ts` (CRLF, read raw: the new regex has no `\n`). The pin of §10.4 table A `:99`. Replace:

```ts
  assert.match(source, /group-hover:bg-row-hover group-focus:bg-row-hover/)
```

with:

```ts
  assert.match(source, /group-hover\/row:bg-row-hover group-focus-within\/row:bg-row-hover group-has-\[\[aria-expanded=true\]\]\/row:bg-row-hover/)
```

Run: `node --test tests/asset-register-table-ui.test.ts tests/asset-register-ux.test.ts`
Expected: FAIL, `tests 40 · pass 34 · fail 6`:
- `the scroll hint follows real overflow and the pinned actions column has no edge shadow`: the input was expected not to match `/hasMoreRight|hasRemainingHorizontalContent|shadow-\[|rgb\(/`
- `the register table builds on the DataTable parts and keeps its dense rows in its own classes (spec 2B I3)`: no match for `/const headerClasses = "border-b border-border bg-surface px-3 py-2\.5 …"/`
- `register cells: codes in monospace, money through formatMoney, empty values through Nil (spec 2B R-n, R-p, §7.8.2)`: no match for `/<span className="tag font-medium">\{asset\.assetTag\}<\/span>/`
- `register checkboxes are the shared checkbox in a 44px label, and a click beside the box never opens the row (spec 2B O1)`: `undefined !== 2`
- `the bulk bar keeps its place and frame, with its buttons on Button (spec 2B R-q, §7.8.7)`: `undefined !== 4`
- `asset register desktop table pins the tag and actions columns only` (asset-register-ux): no match for `/group-hover\/row:bg-row-hover group-focus-within\/row:bg-row-hover group-has-…/`

- [ ] **Step 3: Add the message key**

Save this file as `<temp>/t03-messages.json` (UTF-8):

```json
{
  "set": {
    "th": { "asset.noCustodian": "ไม่มีผู้ถือครอง" },
    "en": { "asset.noCustodian": "No custodian" }
  }
}
```

Run from the repo root: `node scripts/messages-edit.mjs <temp>/t03-messages.json`
Expected: `messages updated: 1 th, 1 en, 0 deleted`. `git diff --stat messages` shows 2 insertions and 1 deletion in each file (the comma after `asset.checklistPhotoDescription` and the new last key of `asset`); both files stay CRLF (`4312 4312`).

- [ ] **Step 4: Lower the guard rows (the failing guards) and update the R2 comment**

Run: `node <temp>/p2b-budget.mjs c/assets/asset-register-table.tsx LT1=2:0 LT2=1:0 LT3=1:0 LV2=1:0 LV3=1:0 --migrated`
Expected (exit 0):
```
LT1: 2 -> 0 (row deleted)
LT2: 1 -> 0 (row deleted)
LT3: 1 -> 0 (row deleted)
LV2: 1 -> 0 (row deleted)
LV3: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/components/assets/asset-register-table.tsx
```
Each of the five rows sat alone under its `// 2B-3` group comment, so the script deletes the five comments too (`git diff --stat tests/list-frame-guards.test.ts`: 1 insertion, 10 deletions).

`tests/visual-foundation-guards.test.ts` (CRLF), the R2 budget of the table (`:286`, ruling (b)). Replace:

```ts
    "src/components/assets/asset-register-table.tsx": 1, // mobile bulk-action bar shadow-lg (2B / phase 3)
```

with:

```ts
    "src/components/assets/asset-register-table.tsx": 1, // mobile bulk-action bar shadow-lg (phase 3, R-q)
```

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 41 · fail 6`: LFG LT1 (`LT1: 36 in 10 files`), LT2 (`2 in 2`), LT3 (`3 in 2`), LV2 (`98 in 30`) and LV3 (`36 in 10`), each listing only `src/components/assets/asset-register-table.tsx: N > 0` (2, 1, 1, 1, 1); `L0` with the same five lines (`LT1 src/components/assets/asset-register-table.tsx: 2 > 0` …). VFG passes.

- [ ] **Step 5: Move the table onto the `DataTable` parts (`src/components/assets/asset-register-table.tsx`, CRLF)**

Nineteen exact replacements, top to bottom. Make all nineteen before you compile: (1)–(2) import what the others use, and (19) removes `SortableHeader`, which (12)–(13) stop calling. Nothing from `<AccessibleDialog` (`:697`) to `</AccessibleDialog>` (`:774`) changes, and the bulk bar keeps `:452-458`.

(1) Imports `:3-10`: `Link` (only `SortableHeader` used it), `useLocale`, `formatCurrency` and `hasRemainingHorizontalContent` go; the display helpers come in. `Loader2` stays: the dialog uses it.

Replace:

```tsx
import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { Download, Edit, Loader2, Printer, X } from "lucide-react"
import { toast } from "sonner"
import { cn, formatCurrency } from "@/lib/utils"
import { hasRemainingHorizontalContent } from "@/lib/horizontal-scroll"
```

with:

```tsx
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Download, Edit, Loader2, Printer, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatCount, formatMoney } from "@/lib/display-format"
```

(2) Imports `:17-18`: the primitives.

Replace:

```tsx
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
```

with:

```tsx
import { Button } from "@/components/ui/button"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTableBody, DataTableFoot, DataTableHead, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Nil, orNil } from "@/components/ui/nil"
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
```

(3) The class constants `:148-154`: the pinned head turns white, the pinned cells follow `group/row`, the shadow goes, the dense row classes take the `DataTable` look.

Replace:

```tsx
const assetRegisterStickyFirstColumnClasses = "sticky left-0"
const assetRegisterStickyActionsColumnClasses = "sticky right-0"
const assetRegisterStickyHeaderColumnClasses = "z-30 bg-muted"
const assetRegisterStickyBodyColumnClasses = "z-20 bg-surface group-hover:bg-row-hover group-focus:bg-row-hover"
const assetRegisterActionsShadowClasses = "shadow-[-8px_0_8px_-8px_rgb(15_23_42/0.25)]"
const cellClasses = "px-3 py-2"
const headerClasses = "px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground"
```

with:

```tsx
const assetRegisterStickyFirstColumnClasses = "sticky left-0"
const assetRegisterStickyActionsColumnClasses = "sticky right-0"
const assetRegisterStickyHeaderColumnClasses = "z-30 bg-surface"
// The pinned cells take the row fill together with the row (instant on, soft off), also while the row's ⋯ menu is
// open. A side line replaces the old edge shadow (spec 2B R-j); each cell sets that side's color only, so the soft row
// line under it stays.
const assetRegisterStickyBodyColumnClasses = "z-20 bg-surface transition-colors group-hover/row:bg-row-hover group-focus-within/row:bg-row-hover group-has-[[aria-expanded=true]]/row:bg-row-hover group-hover/row:duration-0 group-focus-within/row:duration-0"
// Dense rows are the register's own until phase 3 (spec 2B I3, B3(3)): the DataTable look (white 13/500 faint header,
// soft row lines) with px-3 py-2 cells instead of p-3, and no 16/20px gutters on the first and last columns, because
// the widths in src/lib/asset-register-columns.ts count none. Rows are 56px: the name cell holds a 40px thumbnail.
const cellClasses = "border-b border-border-soft px-3 py-2 align-top"
const headerClasses = "border-b border-border bg-surface px-3 py-2.5 text-left align-bottom text-meta font-medium whitespace-nowrap text-faint-foreground"
```

(4) The range `:170-177`: `formatCount` instead of `toLocaleString(numberLocale)`.

Replace:

```tsx
  const tCommon = useTranslations("common")
  const numberLocale = useLocale() === "th" ? "th-TH" : "en-US"
  const { isPending } = useAssetRegisterNavigation()
  const rangeLabel = t("registerRange", {
    from: fromRow.toLocaleString(numberLocale),
    to: toRow.toLocaleString(numberLocale),
    total: total.toLocaleString(numberLocale),
  })
```

with:

```tsx
  const tCommon = useTranslations("common")
  const { isPending } = useAssetRegisterNavigation()
  const rangeLabel = t("registerRange", {
    from: formatCount(fromRow),
    to: formatCount(toRow),
    total: formatCount(total),
  })
```

(5) The overflow measure `:198-208`: `hasMoreRight` goes. The rest of the effect (`:209-213`) stays.

Replace:

```tsx
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const [hasMoreRight, setHasMoreRight] = useState(false)

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const measure = () => {
      setIsOverflowing(element.scrollWidth > element.clientWidth + 1)
      setHasMoreRight(hasRemainingHorizontalContent(element))
    }
```

with:

```tsx
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)

  // The hint line shows only while the table really overflows (DESIGN.md, asset register). The pinned actions column
  // has no edge shadow any more (spec 2B R-j), so nothing else is measured and the scroller needs no onScroll.
  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const measure = () => setIsOverflowing(element.scrollWidth > element.clientWidth + 1)
```

(6) `sortOf` after `buildHref` (`:385-387`).

Replace:

```tsx
  function buildHref(overrides: { page?: number; sort?: string; direction?: string }) {
    return `/${locale}/assets?${buildAssetQueryString(filters, overrides)}`
  }
```

with:

```tsx
  function buildHref(overrides: { page?: number; sort?: string; direction?: string }) {
    return `/${locale}/assets?${buildAssetQueryString(filters, overrides)}`
  }

  // DataTableHead sort (spec 2B I3): as the old SortableHeader did, the link flips the sorted column and starts any
  // other column ascending; aria-sort and the arrow icon mark only the sorted column.
  function sortOf(field: string): DataTableSort {
    const current = filters.sort === field ? (filters.direction === "asc" ? "asc" : "desc") : null
    return { href: buildHref({ sort: field, direction: current === "asc" ? "desc" : "asc", page: 1 }), direction: current }
  }
```

(7) The empty state `:425`: the clear-filters button is the outline variant.

Replace:

```tsx
    ...(hasActiveFilters ? { actionHref: clearAllFiltersHref, actionLabel: labels.clearAllFilters } : {}),
```

with:

```tsx
    // "Clear filters" is the outline button: the primary color stays with the page's own main action (spec 2B §7.8.5).
    ...(hasActiveFilters ? { actionHref: clearAllFiltersHref, actionLabel: labels.clearAllFilters, actionVariant: "secondary" as const } : {}),
```

(8) The summary bar `:435-445`: the range line and the phone select toggle.

Replace:

```tsx
        <p className="text-sm text-muted-foreground">{rangeLabel}</p>
        <div className="flex items-center gap-2">
          <AssetRegisterSortMenu />
          <button
            type="button"
            onClick={toggleSelectMode}
            aria-pressed={selectMode}
            className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          >
            {selectMode ? t("selectModeDone") : t("selectMode")}
          </button>
```

with:

```tsx
        <p className="text-meta text-muted-foreground num">{rangeLabel}</p>
        <div className="flex items-center gap-2">
          <AssetRegisterSortMenu />
          <Button variant="ghost" size="md" aria-pressed={selectMode} onClick={toggleSelectMode} className="md:hidden">
            {selectMode ? t("selectModeDone") : t("selectMode")}
          </Button>
```

(9) Inside the bulk bar `:459-496`: the count and the four buttons. The container `:452-458` (`data-asset-bulk-bar`, the `fixed … shadow-lg …` class string, the heading) does not change.

Replace:

```tsx
            <div className="text-sm text-muted-foreground md:mt-0.5">
              {selectedAssets.length} {labels.selectedCount}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={printSelectedLabels}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-white transition-colors hover:bg-primary-hover sm:h-9 sm:min-h-0 sm:w-auto"
            >
              <Printer className="h-4 w-4" />
              {labels.printSelectedLabels}
            </button>
            <button
              type="button"
              onClick={() => setBulkUpdateOpen(true)}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-9 sm:min-h-0 sm:w-auto"
            >
              <Edit className="h-4 w-4" />
              {labels.bulkUpdate}
            </button>
            <button
              type="button"
              onClick={exportSelected}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-9 sm:min-h-0 sm:w-auto"
            >
              <Download className="h-4 w-4" />
              {labels.exportSelected}
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-9 sm:min-h-0 sm:w-auto"
            >
              <X className="h-4 w-4" />
              {labels.clearSelection}
            </button>
          </div>
```

with:

```tsx
            <div className="text-sm text-muted-foreground md:mt-0.5">
              {formatCount(selectedAssets.length)} {labels.selectedCount}
            </div>
          </div>
          {/* The bar keeps its place and its frame until phase 3 (spec 2B R-q); its buttons are the shared Button (§7.8.7). */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button size="md" onClick={printSelectedLabels} className="w-full sm:w-auto">
              <Printer aria-hidden="true" />
              {labels.printSelectedLabels}
            </Button>
            <Button variant="outline" size="md" onClick={() => setBulkUpdateOpen(true)} className="w-full sm:w-auto">
              <Edit aria-hidden="true" />
              {labels.bulkUpdate}
            </Button>
            <Button variant="outline" size="md" onClick={exportSelected} className="w-full sm:w-auto">
              <Download aria-hidden="true" />
              {labels.exportSelected}
            </Button>
            <Button variant="outline" size="md" onClick={clearSelection} className="w-full sm:w-auto">
              <X aria-hidden="true" />
              {labels.clearSelection}
            </Button>
          </div>
```

(10) The scroller and the table `:528-533`: no `onScroll`, no `divide-y` (the cells draw the row lines). The `<colgroup>` `:534-540` stays.

Replace:

```tsx
      <div
        data-asset-desktop-table className={`${getDesktopTableOnlyClasses()} relative overflow-x-auto overscroll-x-contain`}
        ref={scrollRef}
        onScroll={(event) => setHasMoreRight(hasRemainingHorizontalContent(event.currentTarget))}
      >
        <table className="w-full table-fixed divide-y divide-border text-sm" style={{ minWidth: getAssetRegisterTableMinWidth(visibleColumnList) }}>
```

with:

```tsx
      <div
        data-asset-desktop-table className={`${getDesktopTableOnlyClasses()} relative overflow-x-auto overscroll-x-contain`}
        ref={scrollRef}
      >
        <table className="w-full table-fixed text-sm" style={{ minWidth: getAssetRegisterTableMinWidth(visibleColumnList) }}>
```

(11) The head and its checkbox `:541-551`.

Replace:

```tsx
          <thead className="bg-muted">
            <tr>
              <th scope="col" className={headerClasses}>
                <input
                  type="checkbox"
                  checked={allCurrentPageSelected}
                  onChange={toggleCurrentPage}
                  aria-label={labels.all}
                  className="h-4 w-4 rounded border-border text-primary"
                />
              </th>
```

with:

```tsx
          <thead>
            <tr>
              {/* The label fills the 44px column (O1, K16); the box draws its own focus outline. */}
              <th scope="col" className={cn(headerClasses, "p-0")}>
                <label className="flex min-h-11 w-11 cursor-pointer items-center justify-center">
                  <input
                    type="checkbox"
                    checked={allCurrentPageSelected}
                    onChange={toggleCurrentPage}
                    aria-label={labels.all}
                    className={checkboxVariants()}
                  />
                </label>
              </th>
```

(12) The code and name heads `:552-571`.

Replace:

```tsx
              {visibleColumns.has("assetTag") && (
                <SortableHeader
                  filters={filters}
                  field="assetTag"
                  label={labels.assetTag}
                  buildHref={buildHref}
                  className={`${assetRegisterStickyHeaderColumnClasses} ${assetRegisterStickyFirstColumnClasses} border-r border-border`}
                  linkClassName="block truncate"
                />
              )}
              {visibleColumns.has("name") && (
                <SortableHeader
                  filters={filters}
                  field="name"
                  label={labels.assetName}
                  buildHref={buildHref}
                  className=""
                  linkClassName="block truncate"
                />
              )}
```

with:

```tsx
              {visibleColumns.has("assetTag") && (
                <DataTableHead
                  sort={sortOf("assetTag")}
                  className={cn(assetRegisterStickyHeaderColumnClasses, assetRegisterStickyFirstColumnClasses, "border-r border-border")}
                >
                  {labels.assetTag}
                </DataTableHead>
              )}
              {visibleColumns.has("name") && <DataTableHead sort={sortOf("name")}>{labels.assetName}</DataTableHead>}
```

(13) The price and actions heads, the body and the empty row `:587-605`.

Replace:

```tsx
              {visibleColumns.has("purchasePrice") && (
                <SortableHeader filters={filters} field="purchasePrice" label={labels.purchasePrice} buildHref={buildHref} linkClassName="block truncate" />
              )}
              <th
                scope="col"
                className={cn(headerClasses, "text-right", assetRegisterStickyHeaderColumnClasses, assetRegisterStickyActionsColumnClasses, "border-l border-border", hasMoreRight && assetRegisterActionsShadowClasses)}
              >
                {labels.actions}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {assets.length === 0 ? (
              <tr>
                <td colSpan={visibleColumnCount + 2} className="px-4 py-6">
                  <ActionEmptyState {...emptyState} />
                </td>
              </tr>
            ) : (
```

with:

```tsx
              {visibleColumns.has("purchasePrice") && (
                <DataTableHead align="right" sort={sortOf("purchasePrice")}>{t("purchasePriceBaht")}</DataTableHead>
              )}
              {/* pl-1.5 pr-2: the 172px column keeps 157.5px for the 156px RowActions pair (spec 2B I3, I26). */}
              <th
                scope="col"
                className={cn(headerClasses, "pl-1.5 pr-2 text-right", assetRegisterStickyHeaderColumnClasses, assetRegisterStickyActionsColumnClasses, "border-l border-border")}
              >
                <span className="sr-only">{labels.actions}</span>
              </th>
            </tr>
          </thead>
          <DataTableBody>
            {assets.length === 0 ? (
              <TableEmptyRow colSpan={visibleColumnCount + 2} emptyState={emptyState} />
            ) : (
```

(14) The row, its checkbox and the code cell `:607-627`.

Replace:

```tsx
                <ClickableTableRow
                  key={asset.id}
                  href={buildAssetDetailHref(asset.id)}
                  label={`${labels.detail}: ${asset.assetTag}`}
                  className="group"
                  onNavigate={rememberDetailReturnScroll}
                >
                  <td className={cellClasses}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(asset.id)}
                      onChange={() => toggleAsset(asset.id)}
                      aria-label={asset.assetTag}
                      className="h-4 w-4 rounded border-border text-primary"
                    />
                  </td>
                  {visibleColumns.has("assetTag") && (
                    <td className={`${assetRegisterStickyBodyColumnClasses} ${assetRegisterStickyFirstColumnClasses} ${cellClasses} truncate border-r border-border font-medium text-foreground`} title={asset.assetTag}>
                      {asset.assetTag}
                    </td>
                  )}
```

with:

```tsx
                <ClickableTableRow
                  key={asset.id}
                  href={buildAssetDetailHref(asset.id)}
                  label={`${labels.detail}: ${asset.assetTag}`}
                  onNavigate={rememberDetailReturnScroll}
                >
                  <td className={cn(cellClasses, "p-0")}>
                    {/* ClickableTableRow skips clicks on the input but not on its label: data-no-row-click keeps a click
                        beside the box from opening the asset (spec 2B §7.8.3). */}
                    <label data-no-row-click className="flex min-h-11 w-11 cursor-pointer items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(asset.id)}
                        onChange={() => toggleAsset(asset.id)}
                        aria-label={asset.assetTag}
                        className={checkboxVariants()}
                      />
                    </label>
                  </td>
                  {visibleColumns.has("assetTag") && (
                    <td className={cn(assetRegisterStickyBodyColumnClasses, assetRegisterStickyFirstColumnClasses, cellClasses, "truncate border-r border-r-border text-foreground")} title={asset.assetTag}>
                      <span className="tag font-medium">{asset.assetTag}</span>
                    </td>
                  )}
```

(15) The serial number `:634-636`.

Replace:

```tsx
                          {asset.serialNumber ? (
                            <div className="truncate text-xs text-muted-foreground" title={asset.serialNumber}>{asset.serialNumber}</div>
                          ) : null}
```

with:

```tsx
                          {asset.serialNumber ? (
                            <div className="truncate text-meta text-muted-foreground" title={asset.serialNumber}><span className="tag">{asset.serialNumber}</span></div>
                          ) : null}
```

(16) The custodian `:644`.

Replace:

```tsx
                  {visibleColumns.has("custodian") && <td className={`${cellClasses} truncate text-muted-foreground`} title={asset.custodian ?? undefined}>{asset.custodian || "-"}</td>}
```

with:

```tsx
                  {visibleColumns.has("custodian") && <td className={`${cellClasses} truncate text-muted-foreground`} title={asset.custodian ?? undefined}>{orNil(asset.custodian, t("noCustodian"))}</td>}
```

(17) The price cell and the actions cell `:660-661`. The `<AssetRegisterRowActions variant="desktop" …>` call `:662-672` stays.

Replace:

```tsx
                  {visibleColumns.has("purchasePrice") && <td className={`${cellClasses} truncate text-muted-foreground`}>{formatCurrency(asset.purchasePrice)}</td>}
                  <td className={cn(assetRegisterStickyBodyColumnClasses, assetRegisterStickyActionsColumnClasses, cellClasses, "border-l border-border", hasMoreRight && assetRegisterActionsShadowClasses)}>
```

with:

```tsx
                  {visibleColumns.has("purchasePrice") && <td className={cn(cellClasses, "truncate text-right text-muted-foreground num")}>{formatMoney(asset.purchasePrice) ?? <Nil />}</td>}
                  <td className={cn(cellClasses, "pl-1.5 pr-2", assetRegisterStickyBodyColumnClasses, assetRegisterStickyActionsColumnClasses, "border-l border-l-border")}>
```

(18) The end of the body and the footer `:677-695`.

Replace:

```tsx
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">{rangeLabel}</p>
        <Pagination
          page={filters.page}
          totalPages={totalPages}
          previousHref={buildHref({ page: Math.max(1, filters.page - 1) })}
          nextHref={buildHref({ page: Math.min(totalPages, filters.page + 1) })}
          labels={{
            navigation: tCommon("pagination"),
            previous: labels.previous,
            next: labels.next,
            pageOf: tCommon("pageOf", { page: filters.page, total: totalPages }),
          }}
        />
      </div>
```

with:

```tsx
          </DataTableBody>
        </table>
      </div>

      <DataTableFoot>
        <Pagination
          page={filters.page}
          totalPages={totalPages}
          previousHref={buildHref({ page: Math.max(1, filters.page - 1) })}
          nextHref={buildHref({ page: Math.min(totalPages, filters.page + 1) })}
          labels={{
            navigation: tCommon("pagination"),
            previous: labels.previous,
            next: labels.next,
            pageOf: tCommon("pageOf", { page: filters.page, total: totalPages }),
            range: rangeLabel,
          }}
        />
      </DataTableFoot>
```

(19) `SortableHeader` `:779-808` goes (its last caller went in (12)–(13)); `HeaderWithHelp` stays.

Replace:

```tsx
function SortableHeader({
  filters,
  field,
  label,
  buildHref,
  className = "",
  linkClassName = "",
}: {
  filters: { sort: string; direction: string }
  field: string
  label: string
  buildHref: (overrides: { page?: number; sort?: string; direction?: string }) => string
  className?: string
  linkClassName?: string
}) {
  const direction = filters.sort === field && filters.direction === "asc" ? "desc" : "asc"
  const suffix = filters.sort === field ? (filters.direction === "asc" ? " ↑" : " ↓") : ""
  return (
    <th
      scope="col"
      className={`px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground ${className}`}
    >
      <Link href={buildHref({ sort: field, direction, page: 1 })} className={`hover:text-primary ${linkClassName}`}>
        {label}
        {suffix}
      </Link>
    </th>
  )
}

function HeaderWithHelp({
```

with:

```tsx
function HeaderWithHelp({
```

Check: `git diff -U0 src/components/assets/asset-register-table.tsx | grep "^@@"` prints 46 hunk headers; the last three start at old lines `-692`, `-695` and `-779`. No hunk starts between `-696` and `-778`: the dialog did not change.

- [ ] **Step 6: Run the tests for this task**

Run: `node --test tests/asset-register-table-ui.test.ts tests/asset-register-ux.test.ts tests/asset-register-view-model.test.ts tests/dropdown-menus-ui.test.ts tests/row-actions-ui.test.ts tests/asset-clone-ui.test.ts tests/asset-return-navigation.test.ts tests/asset-status-help-ui.test.ts tests/attachment-preview-dialog-ui.test.ts tests/modern-enterprise-theme.test.ts tests/clickable-table-row-navigation.test.ts tests/list-primitives-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts tests/dialog-trigger-handles.test.ts`
Expected: PASS, `tests 186 · pass 186 · fail 0` (asset-register-table-ui 22, asset-register-ux 18, asset-register-view-model 11, dropdown-menus-ui 6, row-actions-ui 8, asset-clone-ui 3, asset-return-navigation 6, asset-status-help-ui 4, attachment-preview-dialog-ui 3, modern-enterprise-theme 4, clickable-table-row-navigation 2, list-primitives-ui 18, list-frame-guards 21, visual-foundation-guards 26, form-migration-guards 23, thai-glossary 3, messages-parity 3, dialog-trigger-handles 5).

Run: `node <temp>/p2b1-precheck.mjs --file c/assets/asset-register-table.tsx`
Expected: `· in MIGRATED_LIST_FILES` on the `file` line, the rows `R2 1 – – 1`, `LT1 0 0 0 2`, `LT2 0 0 0 1`, `LT3 0 0 0 1`, `LV2 0 0 0 1`, `LV3 0 0 0 1` and `args    (no row holds this file)`; exit 0.

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected: exit 0, `budgets hold: no live count is over its row`, with `LT1 BUDGETS.LT1 34 in 9 rows`, `LT2 BUDGETS.LT2 1 in 1 rows`, `LT3 BUDGETS.LT3 2 in 1 rows`, `LV2 BUDGETS.LV2 97 in 29 rows`, `LV3 BUDGETS.LV3 35 in 9 rows`, every other total as in Task 0 (`R7 TABLE_HEADER_FILLS 17 in 11 rows`, `LH1 BUDGETS.LH1 25 in 25 rows`, `LH2 BUDGETS.LH2 7 in 5 rows`, `LF1 BUDGETS.LF1 2 in 2 rows`, `LK1 BUDGETS.LK1 8 in 8 rows`, `LN1 BUDGETS.LN1 6 in 5 rows`), and no `slack` line except the LB1 row of `D/maintenance/[id]/page.tsx`.

Run (the FMG rows this file hands to 2C plan 4, ruling (d)): `node -e 'const s = require("fs").readFileSync("src/components/assets/asset-register-table.tsx", "utf8"); const n = (re) => (s.match(re) ?? []).length; console.log("GF7", n(/mb-1\.5 block text-sm font-medium text-foreground|\b(?:h-4 w-4|h-5 w-5|h-3\.5 w-3\.5) rounded border-border\b/g), "GB1", n(/<Loader2\b/g), "GL1", n(/"[^"\n]*\bfixed\b[^"\n]*\bbottom-[^"\n]*"/g))'`
Expected: `GF7 4 GB1 1 GL1 1`.

- [ ] **Step 7: Prove every class compiles**

Run: `node <temp>/p2b3-tw-probe.mjs src/components/assets/asset-register-table.tsx`
Expected: `checked 114 classes, missing 0` (exit 0). New to this file and compiled here: `border-r-border`, `border-l-border`, `group-has-[[aria-expanded=true]]/row:bg-row-hover`, `group-hover/row:duration-0`, `pl-1.5`, `p-0`, `num`, `tag`.

Run: `SHOW=px-3,pl-1.5,pr-2 node <temp>/p2b3-tw-probe.mjs src/components/assets/asset-register-table.tsx`
Expected, after the `checked` line: `px-3 -> .px-3 { padding-inline: … }`, `pl-1.5 -> .pl-1\.5 { padding-left: … }`, `pr-2 -> .pr-2 { padding-right: … }`. Tailwind emits the `padding-left`/`padding-right` rules after `padding-inline`, so `pl-1.5 pr-2` win over `px-3` in the actions column.

- [ ] **Step 8: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `tests 1933 · pass 1932 · fail 0 · skipped 1` (four more than after Task 2: N2–N5).
- `npx tsc --noEmit`: no errors (`emptyState` with `actionVariant: "secondary" as const` fits `TableEmptyRow` and `ActionEmptyState`; `t("noCustodian")` exists after Step 3).
- `npm run lint`: 0 errors and the 146 warnings under `.agents/`; `npx eslint src/components/assets/asset-register-table.tsx tests/asset-register-table-ui.test.ts tests/asset-register-ux.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 7 files: `src/components/assets/asset-register-table.tsx` 97 insertions and 143 deletions, `messages/en.json` and `messages/th.json` 2 and 1 each, `tests/asset-register-table-ui.test.ts` 55 and 3, `tests/asset-register-ux.test.ts` 1 and 1, `tests/list-frame-guards.test.ts` 1 and 10, `tests/visual-foundation-guards.test.ts` 1 and 1. The line-ending check prints `788 788` for the table, `272 272` for `tests/asset-register-table-ui.test.ts`, `228 228` for `tests/asset-register-ux.test.ts`, `538 538` for `tests/list-frame-guards.test.ts` and `323 323` for VFG (CRLF throughout).

- [ ] **Step 9: Commit**

```bash
git add src/components/assets/asset-register-table.tsx messages/th.json messages/en.json tests/asset-register-table-ui.test.ts tests/asset-register-ux.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): register table on the DataTable parts with its dense rows, Nil, formatMoney, 44px checkboxes and no edge shadow (2B-3 task 3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 7 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For Task 16 (DEVELOPER_HANDOFF.md, the 2C plan 4 hand-off, spec §8.7 "สถานะที่ส่งให้ 2C-4"):** the dialog is now `asset-register-table.tsx:681-758` (was `:697-774`); its label spans `:692`, `:707`, `:722`, `:732`; its spinner `:753`; the bar `:462-463` (was `:454-455`). FMG of the file: GF7 4 live (budget 6), GB1 1, GL1 1, GF2 4, GF3 4, GF5 `[1, 1, 0]`, GD2 pending. The table's FMG comments (`:293` "→ 2: list checkboxes :549, :620", `:351` ":455 … (2B / phase 3)") are stale and stay until 2C plan 4 edits its rows (2B never edits FMG).

**For the dev-app check (Task 15, spec §8.7 rows `/th/assets`, §7.15):**
- 1440 and 1366, every preset: header white 13px, no capitals; click "รหัส", "ชื่อ", "ราคาซื้อ (บาท)": the arrow icon moves, a second click flips it, `aria-sort` sits on that head only; the actions head is blank on screen and reads "การดำเนินการ"; no shadow on the pinned columns; with audit or all, scroll sideways: the pinned code and actions cells keep their line and stay opaque over the scrolled cells; rows stay 56px.
- Hover a row, then Tab into it: the pinned cells fill with the row; open ⋯: the whole row stays filled, pinned cells included.
- A row with no custodian: "—", read "ไม่มีผู้ถือครอง"; price "1,234.00" right-aligned, a missing price "—".
- Tick a row by clicking the empty space beside the box: it ticks, the asset does not open; the header box selects the page; the bulk bar count is in th-TH; its four buttons are 36px from 768 (44 below, two columns at 700); "แก้ไขหลายรายการ" opens the 2C dialog: close it with "ยกเลิก" (never apply).
- A search that finds nothing: the empty state with an outline clear-filters button; the footer "1–25 จาก N รายการ · หน้า 1 จาก M" on the left, buttons right.
- 375: "เลือก"/"เสร็จ" is a ghost button; the phone list is Task 4's.
- Copy two rows to Excel (spec §7.14 risk 5): the custodian "—" pastes with its sr-only words; record what pastes.

---

### Task 4: `c/assets/asset-register-mobile-list.tsx` · phone rows with mono tags and the shared checkbox (O1, R-p)

Spec §7.10, §7.17 row `asset-register-table-ui.test.ts:161`, §8.7 row 3, rulings O1 and R-p, controller ruling (f). One file, one commit. The file is CRLF: exact-string replacements only. No other task of this plan edits it: Task 3 renders it from the table and keeps its props.

Rulings this task applies:
- **§7.10 in full, not only the checkbox of §8.7 row 3:** §8.7 row 3 names only the checkbox (`:93`), but §7.10 is the table for this file and also gives the row line and the two tags, and R-p (codes are `tag`, the row's own id `tag font-medium`) holds for every 2B list. So four changes: the `ul` line `divide-border` → `divide-border-soft` (the row line of `DataTable`); the tag in the row link becomes an inner `<span className="tag font-medium">` (the link keeps every class: `tests/asset-register-table-ui.test.ts:149` pins `before:absolute before:inset-0`, and a `tag` inside a link selects as normal text, `src/app/globals.css` `@utility tag`); the select-mode box becomes `checkboxVariants({ size: "lg" })`; the select-mode tag becomes `<span className="block truncate text-sm text-foreground"><span className="tag font-medium">…</span></span>` (a `tag` takes weight 400 or 500 only, so the 600 goes).
- **O1:** `checkboxVariants({ size: "lg" })` is 20px with `shrink-0 cursor-pointer` in the variant; the color comes from `accent-color`, so `rounded border-border text-primary` (which did nothing on a native checkbox, spec §7.8.3) goes. The whole row is already an 80px `<label>` (`:92`), so the target stays 80px tall.
- **Controller ruling (f):** 2B does not edit this file again, so it joins `MIGRATED_LIST_FILES`. It holds no guard row; L0 then keeps every counter at its `KEEP` of 0.

What users will see (phones, below 768px):
- The asset tag in each row is monospace (IBM Plex Mono, 500); the line between rows is the lighter row line.
- In "เลือก" mode the box is the browser checkbox in the primary color, 20px as before, and the tag beside it is monospace.

Not in this task: the desktop table and its checkboxes (Task 3) · `AssetRegisterRowActions` (Task 2) · docs (Task 16). Do not run a formatter.

**Files:**
- Modify: `src/components/assets/asset-register-mobile-list.tsx` (`i/lf w/crlf`; 5 exact replacements)
- Modify: `tests/asset-register-table-ui.test.ts` (`i/lf w/crlf`, read with `\r` stripped, so a new regex may hold `\n`; 1 exact replacement, 1 appended block)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only: `t4-block.ts`

**Must keep passing without edits:**
- `tests/asset-register-table-ui.test.ts:138-153` (row order tag → name → location → status, `min-h-20`, `before:absolute before:inset-0`, the 44px thumbnail with `className="relative z-10"`, `variant="mobile"`), `:155-160` and `:162-164` (the select-mode `<label className="flex min-h-20 cursor-pointer`, `type="checkbox"`, `aria-label={asset.assetTag}`, `preview={false}`, no link), `:186-195` (line 3 on one line, `className="relative flex min-h-20 items-center gap-3 px-3 py-2 `, three `StatusBadge`), `:197-202` (`reserveBulkBarSpace && "pb-44"`)
- `tests/asset-register-ux.test.ts:102-111` (`data-asset-mobile-list`, `data-asset-mobile-row`, `md:hidden`; read raw, unchanged)
- `tests/form-migration-guards.test.ts` (the file is not a 2C file: no FMG count reads it) · `tests/visual-foundation-guards.test.ts`

**Interfaces:**
- Consumes:
  - 2A: `checkboxVariants({ size?: "md" | "lg" })` from `@/components/ui/field-variants` (plain TS; `lg` = `size-5`).
  - Task 0: `<temp>/p2b1-precheck.mjs` (`--file`, `--budgets`) and `<temp>/p2b-budget.mjs`. Task 1: `<temp>/p2b3-append.mjs <block file> <test file>` (appends after one blank line in the test file's own line endings) and `<temp>/p2b3-tw-probe.mjs <file> …` (prints `checked N classes, missing M`).
- Produces:
  - `AssetRegisterMobileList` with unchanged props (`assets`, `selectMode`, `selectedIds`, `onToggleAsset`, `permissions`, `detailHref`, `editHref`, `cloneHref`, `onNavigate`, `reserveBulkBarSpace`): Task 3's table renders it as today.
  - LFG: the file in `MIGRATED_LIST_FILES`.

| guard | `c/assets/asset-register-mobile-list.tsx` before → after |
|---|---|
| LFG | no row (every counter 0) → joins `MIGRATED_LIST_FILES` · no total moves |
| FMG (not edited) | not a 2C file: no count |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`
Expected: nothing.

Run: `git diff --quiet 886a290 -- src/components/assets/asset-register-mobile-list.tsx src/components/ui src/lib/display-format.ts && echo BASE-OK`
Expected: `BASE-OK` (no earlier task edits this file, and the 2B-1 primitives are as at `886a290`). Otherwise stop and report.

Run: `git grep -cF 'assert.match(row, /className="size-5 /)' -- tests/asset-register-table-ui.test.ts`
Expected: `tests/asset-register-table-ui.test.ts:1` (Tasks 2–3 edit other tests of this file).

Run: `node <temp>/p2b1-precheck.mjs --file c/assets/asset-register-mobile-list.tsx`
Expected (exit 0; after the four `info`/`ok` header lines):
```
file    src/components/assets/asset-register-mobile-list.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
args    (no row holds this file)
```

Run: `git ls-files --eol src/components/assets/asset-register-mobile-list.tsx tests/asset-register-table-ui.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf    w/crlf` for all three. Keep them CRLF.

- [ ] **Step 2: Write the failing tests** (`tests/asset-register-table-ui.test.ts`)

(a) Replace `:161` (spec §7.17):

```ts
  assert.match(row, /className="size-5 /)
```

with:

```ts
  assert.match(row, /className=\{checkboxVariants\(\{ size: "lg" \}\)\}/)
```

(b) Save this block as `<temp>/t4-block.ts` and run `node <temp>/p2b3-append.mjs <temp>/t4-block.ts tests/asset-register-table-ui.test.ts` (Expected: `appended <temp>/t4-block.ts to tests/asset-register-table-ui.test.ts (CRLF)`). It reuses the file's `mobileList` and `functionBody` (`:129-136`):

```ts
// Plan 2B-3 Task 4 (spec 2B §7.10, R-p, O1): phone rows show the asset tag in mono on the soft row line of DataTable,
// and the select-mode box is the shared 20px checkbox.
test("phone rows show the asset tag as a mono tag on the soft row line, and select mode uses the shared checkbox (2B §7.10)", () => {
  const source = mobileList()
  const row = functionBody(source, "MobileAssetRow")
  const selectable = functionBody(source, "MobileSelectableRow")

  assert.match(source, /^import \{ checkboxVariants \} from "@\/components\/ui\/field-variants"$/m)
  assert.match(source, /<ul data-asset-mobile-list className=\{cn\("divide-y divide-border-soft md:hidden", reserveBulkBarSpace && "pb-44"\)\}>/)
  assert.match(row, /focus-visible:before:ring-ring"\n\s+>\n\s+<span className="tag font-medium">\{asset\.assetTag\}<\/span>\n\s+<\/Link>/)
  assert.match(selectable, /<span className="block truncate text-sm text-foreground"><span className="tag font-medium">\{asset\.assetTag\}<\/span><\/span>/)
  assert.doesNotMatch(source, /rounded border-border|text-primary|font-semibold text-foreground">\{asset\.assetTag\}/)
})
```

Run: `node --test tests/asset-register-table-ui.test.ts`
Expected: FAIL, `tests 23 · pass 21 · fail 2` (Tasks 1–3 appended 5 tests to this file, which pass):
- `select mode rows only toggle the checkbox and never navigate`: no match for `/className=\{checkboxVariants\(\{ size: "lg" \}\)\}/`
- `phone rows show the asset tag as a mono tag on the soft row line, and select mode uses the shared checkbox (2B §7.10)`: no match for the `checkboxVariants` import

- [ ] **Step 3: Change the component (`src/components/assets/asset-register-mobile-list.tsx`, CRLF)**

Five exact replacements, top to bottom.

(1) Import `:6-7`. Replace:

```tsx
import type { AssetRegisterRow } from "@/components/assets/asset-register-table"
import { StatusBadge } from "@/components/ui/status-badge"
```

with:

```tsx
import type { AssetRegisterRow } from "@/components/assets/asset-register-table"
import { checkboxVariants } from "@/components/ui/field-variants"
import { StatusBadge } from "@/components/ui/status-badge"
```

(2) The list `:35`. Replace:

```tsx
    <ul data-asset-mobile-list className={cn("divide-y divide-border md:hidden", reserveBulkBarSpace && "pb-44")}>
```

with:

```tsx
    <ul data-asset-mobile-list className={cn("divide-y divide-border-soft md:hidden", reserveBulkBarSpace && "pb-44")}>
```

(3) The tag in the row link `:56-58`. Replace:

```tsx
        >
          {asset.assetTag}
        </Link>
```

with:

```tsx
        >
          <span className="tag font-medium">{asset.assetTag}</span>
        </Link>
```

(4) The select-mode box `:97-99`. Replace:

```tsx
          aria-label={asset.assetTag}
          className="size-5 shrink-0 rounded border-border text-primary"
        />
```

with:

```tsx
          aria-label={asset.assetTag}
          className={checkboxVariants({ size: "lg" })}
        />
```

(5) The select-mode tag `:102`. Replace:

```tsx
          <span className="block truncate text-sm font-semibold text-foreground">{asset.assetTag}</span>
```

with:

```tsx
          <span className="block truncate text-sm text-foreground"><span className="tag font-medium">{asset.assetTag}</span></span>
```

- [ ] **Step 4: Mark the file migrated (LFG)**

Run: `node <temp>/p2b-budget.mjs c/assets/asset-register-mobile-list.tsx --migrated`
Expected (exit 0):
```
MIGRATED_LIST_FILES: added
written: src/components/assets/asset-register-mobile-list.tsx
```

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/asset-register-table-ui.test.ts tests/asset-register-ux.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `fail 0` (`tests 111 · pass 111`: asset-register-table-ui 23, asset-register-ux 18, list-frame-guards 21, visual-foundation-guards 26, form-migration-guards 23, with the tests Tasks 1–3 added).

Run: `node <temp>/p2b1-precheck.mjs --file c/assets/asset-register-mobile-list.tsx`
Expected: `file    src/components/assets/asset-register-mobile-list.tsx (CRLF) · in MIGRATED_LIST_FILES` and `args    (no row holds this file)`; exit 0.

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected: exit 0, `budgets hold: no live count is over its row`; every total as after Task 3 (this task moves none).

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b3-tw-probe.mjs src/components/assets/asset-register-mobile-list.tsx`
Expected: `checked 40 classes, missing 0` (exit 0). Nothing is new to `src`: `divide-border-soft` is in `c/ui/content-panel.tsx:57`, `tag` is the `@utility tag` of `src/app/globals.css`.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `fail 0`, one test more than after Task 3: `tests 1934 · pass 1933 · fail 0 · skipped 1`.
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors and the 146 warnings under `.agents/`; `npx eslint src/components/assets/asset-register-mobile-list.tsx tests/asset-register-table-ui.test.ts tests/list-frame-guards.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 3 files: `src/components/assets/asset-register-mobile-list.tsx` 5 insertions and 4 deletions, `tests/asset-register-table-ui.test.ts` 15 insertions and 1 deletion, `tests/list-frame-guards.test.ts` 1 insertion. `node -e "const s=require('fs').readFileSync(process.argv[1],'utf8');console.log((s.match(/\r\n/g)||[]).length,(s.match(/\n/g)||[]).length)" src/components/assets/asset-register-mobile-list.tsx` prints `114 114` (CRLF throughout). A file that shows every line changed was normalized: restore its line endings before you commit.

- [ ] **Step 8: Commit**

```bash
git add src/components/assets/asset-register-mobile-list.tsx tests/asset-register-table-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): register phone rows show mono tags and the shared checkbox (2B-3 task 4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 15, spec §8.7 row `/th/assets` 375):** at 375 and 390: rows about 80px, the tag monospace, lighter lines between rows; "เลือก" turns rows into 20px boxes in the primary color, a tap anywhere on the row toggles it, the bulk bar floats above the bottom navigation and the list keeps room for it.

---

### Task 5: `c/assets/asset-register-toolbar.tsx` · no card from md, `FilterSelect` scope selects and a `Button` sheet trigger (B3(4), I6)

Spec §7.5 (frame and the first two rows of "ช่องและปุ่ม"), §6.6 rows 1, 4 and 6, §6.3.4, §8.7 row 4, §7.17 N6 (toolbar), rulings B3(4), I6, I23 and controller ruling (f). One file, one commit. The file is CRLF: exact-string replacements only.

Rulings this task applies:
- **Frame (B3(4)):** from md the toolbar loses its card: `md:rounded-lg md:border md:border-border md:bg-surface md:p-3` becomes `md:px-0 md:py-0`. The start `sticky top-0 z-20 -mx-4 mb-3 bg-canvas ` stays byte for byte (`tests/visual-foundation-guards.test.ts:111`), no `md:shadow-sm` comes in (`:112`), and below md the bar still sticks to the top on the canvas (R-o: the padding of `<main>` is not touched).
- **Scope selects (I6, §6.6 row 1):** the three `<select>` become `FilterSelect label={t(…)} hideLabel fieldSize="md" className="w-44 shrink-0 lg:w-48"` with their `key`, `defaultValue`, `onChange` and option children unchanged (`tests/asset-register-filter-ui.test.ts:39-42`). DESIGN.md:452: a field without a visible label uses `Field hideLabel`, and only `SearchField` and `ScannerTextInput` take `aria-label` (DESIGN.md:465 names the register toolbar); so the `aria-label`s go and the sr-only `<label for>` gives each select the same name as before ("บริษัท", "สาขา", "หมวดหมู่"), while the first option still shows "บริษัท: ทั้งหมด". `className` lands on the `Field` wrapper (layout only, §6.3.1); the select is `w-full`, 36px from md through `fieldSize="md"`, and gets the `select-chevron`. The old `truncate` goes (a `<select>` clips its own text). `selectClassName` and the `getFieldControlClasses` import go; `cn` stays for `FilterCount`.
- **Sheet trigger (§6.6 row 4):** `Button variant="outline" size="md"`: 36px from md, 44 below. `AssetRegisterFilterSheet` renders it through `<SheetTrigger asChild>{trigger}</SheetTrigger>` (`tests/asset-register-filter-ui.test.ts:51`), the same pattern as `c/ui/activity-drawer.tsx:48-49`. The icon, the `sr-only md:not-sr-only` label and both `FilterCount`s stay; `FilterCount` is a 2D pill (spec §7.5).
- **Order unchanged:** search → three selects (from md) → ⚙. The mockup puts the tabs above the toolbar; that move is phase 3 (§7.5).
- **Controller ruling (f):** joins `MIGRATED_LIST_FILES` (no guard row).

What users will see:
- From 768px the search bar has no white card; the three selects and "ตัวกรองเพิ่มเติม" are 36px (were 40) and the selects show a chevron. (The search field follows in Task 6.)
- Phones: unchanged, the bar sticks to the top with 44px controls.

Not in this task: the search field (Task 6) · the sheet (Task 7) · tabs and chips (Tasks 8–9) · docs (Task 16). Do not run a formatter.

**Files:**
- Modify: `src/components/assets/asset-register-toolbar.tsx` (`i/lf w/crlf`; 5 exact replacements)
- Modify: `tests/asset-register-filter-ui.test.ts` (`i/lf w/crlf`, read with `\r` stripped; 1 appended block)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only: `t5-block.ts`

**Must keep passing without edits:** `tests/asset-register-filter-ui.test.ts:36-46` (the three `onChange` handlers, `` key={`company-${filters.companyId}`} ``, `hidden md:contents`, `sticky top-0 … md:static`, no submit) · `tests/visual-foundation-guards.test.ts:109-115` · `tests/list-primitives-ui.test.ts:190-205` (`FilterSelect`) · `tests/form-migration-guards.test.ts`.

**Interfaces:**
- Consumes:
  - 2B-1: `FilterSelect(props: Omit<React.ComponentProps<"select">, "size" | "multiple" | "className"> & { label: string; options?; allLabel?; fieldSize?: "md" | "lg" | "xl"; hideLabel?: boolean; labelAction?: React.ReactNode; className?: string })` from `@/components/ui/filter-select` (children render after `options`).
  - 2A: `Button({ variant, size, … })` from `@/components/ui/button` (default `type="button"`).
  - Task 0 and Task 1 helpers as in Task 4.
- Produces:
  - `AssetRegisterToolbar({ locale, options, tabStatusIds, total })` unchanged (Task 13's page renders it as today). The `trigger` it hands to `AssetRegisterFilterSheet` is a `Button`; Task 7 does not change `trigger`.
  - LFG: the file in `MIGRATED_LIST_FILES`.

| guard | `c/assets/asset-register-toolbar.tsx` before → after |
|---|---|
| LFG | no row → joins `MIGRATED_LIST_FILES` · no total moves |
| VFG | `:111` and `:112` still hold (unchanged) |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`
Expected: nothing.

Run: `git diff --quiet 886a290 -- src/components/assets/asset-register-toolbar.tsx src/components/ui && echo BASE-OK`
Expected: `BASE-OK`.

Run: `git log --oneline -1 -- src/components/assets/asset-register-mobile-list.tsx`
Expected: the Task 4 commit (`feat(ui): register phone rows show mono tags and the shared checkbox (2B-3 task 4)`).

Run: `node <temp>/p2b1-precheck.mjs --file c/assets/asset-register-toolbar.tsx`
Expected (exit 0; after the header lines):
```
file    src/components/assets/asset-register-toolbar.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
args    (no row holds this file)
```

Run: `git ls-files --eol src/components/assets/asset-register-toolbar.tsx tests/asset-register-filter-ui.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf    w/crlf` for all three.

- [ ] **Step 2: Write the failing test** (`tests/asset-register-filter-ui.test.ts`)

Save this block as `<temp>/t5-block.ts` and run `node <temp>/p2b3-append.mjs <temp>/t5-block.ts tests/asset-register-filter-ui.test.ts` (Expected: `appended … (CRLF)`). It uses the file's `toolbar()` reader (`:7`):

```ts
// Plan 2B-3 Task 5 (spec 2B §7.5, B3(4), I6): from md the register toolbar has no card and its controls are 36px:
// FilterSelect with a screen-reader label for the three scope selects, and an outline Button for the filter sheet.
test("the toolbar has no card from md, its scope selects are FilterSelect hideLabel at 36px and the sheet trigger is a Button (2B §7.5)", () => {
  const source = toolbar()

  assert.equal(source.match(/<FilterSelect\s+label=\{t\("(?:company|branch|category)"\)\}\s+hideLabel\s+fieldSize="md"\s+className="w-44 shrink-0 lg:w-48"/g)?.length, 3)
  assert.match(source, /className="sticky top-0 z-20 -mx-4 mb-3 bg-canvas px-4 py-2 sm:-mx-6 sm:px-6 md:static md:mx-0 md:px-0 md:py-0"/)
  assert.match(source, /trigger=\{\n\s+<Button variant="outline" size="md">\n\s+<SlidersHorizontal className="size-4" aria-hidden="true" \/>/)
  assert.doesNotMatch(source, /md:rounded-lg md:border|md:bg-surface|getFieldControlClasses|<select\b|<NativeSelect\b|<button\b|aria-label=/)
})
```

Run: `node --test tests/asset-register-filter-ui.test.ts`
Expected: FAIL, `fail 1` (`tests 10 · pass 9` on `886a290` with Tasks 4–5 only; add any test Tasks 1–3 appended to this file): `the toolbar has no card from md, its scope selects are FilterSelect hideLabel at 36px and the sheet trigger is a Button (2B §7.5)` with `undefined !== 3`.

- [ ] **Step 3: Change the component (`src/components/assets/asset-register-toolbar.tsx`, CRLF)**

Five exact replacements, top to bottom.

(1) Imports `:7-10`. Replace:

```tsx
import { AssetRegisterSearchField } from "@/components/assets/asset-register-search-field"
import { getActiveSheetFilterKeys, getCompanyChangeOverrides } from "@/lib/asset-register-filters"
import { getFieldControlClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"
```

with:

```tsx
import { AssetRegisterSearchField } from "@/components/assets/asset-register-search-field"
import { Button } from "@/components/ui/button"
import { FilterSelect } from "@/components/ui/filter-select"
import { getActiveSheetFilterKeys, getCompanyChangeOverrides } from "@/lib/asset-register-filters"
import { cn } from "@/lib/utils"
```

(2) `selectClassName` `:30-33` goes. Replace:

```tsx
    : options.branches
  const selectClassName = cn(getFieldControlClasses(), "w-44 shrink-0 truncate lg:w-48")

  return (
```

with:

```tsx
    : options.branches

  return (
```

(3) The frame `:36`. Replace:

```tsx
      className="sticky top-0 z-20 -mx-4 mb-3 bg-canvas px-4 py-2 sm:-mx-6 sm:px-6 md:static md:mx-0 md:rounded-lg md:border md:border-border md:bg-surface md:p-3"
```

with:

```tsx
      className="sticky top-0 z-20 -mx-4 mb-3 bg-canvas px-4 py-2 sm:-mx-6 sm:px-6 md:static md:mx-0 md:px-0 md:py-0"
```

(4) The three selects `:40-77`. Replace:

```tsx
        <div className="hidden md:contents">
          <select
            key={`company-${filters.companyId}`}
            aria-label={t("company")}
            defaultValue={filters.companyId}
            onChange={(event) => navigate(getCompanyChangeOverrides(event.target.value, filters.branchId, options.branches))}
            className={selectClassName}
          >
            <option value="">{t("company")}: {tCommon("all")}</option>
            {options.companies.map((company) => (
              <option key={company.id} value={company.id}>{company.code} - {company.nameTh}</option>
            ))}
          </select>
          <select
            key={`branch-${filters.companyId}-${filters.branchId}`}
            aria-label={t("branch")}
            defaultValue={filters.branchId}
            onChange={(event) => navigate({ branchId: event.target.value })}
            className={selectClassName}
          >
            <option value="">{t("branch")}: {tCommon("all")}</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.company.code} / {branch.code} - {branch.name}</option>
            ))}
          </select>
          <select
            key={`category-${filters.categoryId}`}
            aria-label={t("category")}
            defaultValue={filters.categoryId}
            onChange={(event) => navigate({ categoryId: event.target.value })}
            className={selectClassName}
          >
            <option value="">{t("category")}: {tCommon("all")}</option>
            {options.categories.map((category) => (
              <option key={category.id} value={category.id}>{category.code} - {category.name}</option>
            ))}
          </select>
        </div>
```

with:

```tsx
        <div className="hidden md:contents">
          {/* Uncontrolled + key: each select remounts on the optimistic value, so it never bounces back. The label is
              sr-only (a field without a visible label uses hideLabel); the first option names the filter. */}
          <FilterSelect
            label={t("company")}
            hideLabel
            fieldSize="md"
            className="w-44 shrink-0 lg:w-48"
            key={`company-${filters.companyId}`}
            defaultValue={filters.companyId}
            onChange={(event) => navigate(getCompanyChangeOverrides(event.target.value, filters.branchId, options.branches))}
          >
            <option value="">{t("company")}: {tCommon("all")}</option>
            {options.companies.map((company) => (
              <option key={company.id} value={company.id}>{company.code} - {company.nameTh}</option>
            ))}
          </FilterSelect>
          <FilterSelect
            label={t("branch")}
            hideLabel
            fieldSize="md"
            className="w-44 shrink-0 lg:w-48"
            key={`branch-${filters.companyId}-${filters.branchId}`}
            defaultValue={filters.branchId}
            onChange={(event) => navigate({ branchId: event.target.value })}
          >
            <option value="">{t("branch")}: {tCommon("all")}</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.company.code} / {branch.code} - {branch.name}</option>
            ))}
          </FilterSelect>
          <FilterSelect
            label={t("category")}
            hideLabel
            fieldSize="md"
            className="w-44 shrink-0 lg:w-48"
            key={`category-${filters.categoryId}`}
            defaultValue={filters.categoryId}
            onChange={(event) => navigate({ categoryId: event.target.value })}
          >
            <option value="">{t("category")}: {tCommon("all")}</option>
            {options.categories.map((category) => (
              <option key={category.id} value={category.id}>{category.code} - {category.name}</option>
            ))}
          </FilterSelect>
        </div>
```

(5) The sheet trigger `:82-92`. Replace:

```tsx
          trigger={
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-10 md:min-h-0"
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              <span className="sr-only md:not-sr-only">{t("advancedFilters")}</span>
              <FilterCount count={mobileCount} className="md:hidden" />
              <FilterCount count={desktopCount} className="hidden md:inline-flex" />
            </button>
          }
```

with:

```tsx
          trigger={
            <Button variant="outline" size="md">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              <span className="sr-only md:not-sr-only">{t("advancedFilters")}</span>
              <FilterCount count={mobileCount} className="md:hidden" />
              <FilterCount count={desktopCount} className="hidden md:inline-flex" />
            </Button>
          }
```

- [ ] **Step 4: Mark the file migrated (LFG)**

Run: `node <temp>/p2b-budget.mjs c/assets/asset-register-toolbar.tsx --migrated`
Expected (exit 0): `MIGRATED_LIST_FILES: added` and `written: src/components/assets/asset-register-toolbar.tsx`.

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/asset-register-filter-ui.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts tests/form-migration-guards.test.ts tests/list-primitives-ui.test.ts`
Expected: PASS, `fail 0` (`tests 98 · pass 98` on `886a290` with Tasks 4–5 only: asset-register-filter-ui 10, visual-foundation-guards 26, list-frame-guards 21, form-migration-guards 23, list-primitives-ui 18; add what Tasks 1–3 added).

Run: `node <temp>/p2b1-precheck.mjs --file c/assets/asset-register-toolbar.tsx`
Expected: `· in MIGRATED_LIST_FILES` on the `file` line and `args    (no row holds this file)`; exit 0.

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected: exit 0, `budgets hold: no live count is over its row`; no total moves.

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b3-tw-probe.mjs src/components/assets/asset-register-toolbar.tsx`
Expected: `checked 40 classes, missing 0` (exit 0). `md:px-0` and `md:py-0` are core utilities; the field and button classes come from `fieldControlVariants` and `buttonVariants`.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `fail 0`, one test more than after Task 4: `tests 1935 · pass 1934 · fail 0 · skipped 1`.
- `npx tsc --noEmit`: no errors (`key` and the `onChange` handlers type-check against `FilterSelect`'s `select` props; `Button` accepts the props Radix's `SheetTrigger asChild` merges in).
- `npm run lint`: 0 errors and the 146 warnings under `.agents/`; `npx eslint src/components/assets/asset-register-toolbar.tsx tests/asset-register-filter-ui.test.ts tests/list-frame-guards.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 3 files: `src/components/assets/asset-register-toolbar.tsx` 25 insertions and 20 deletions, `tests/asset-register-filter-ui.test.ts` 11 insertions, `tests/list-frame-guards.test.ts` 1 insertion. The line-ending check (Task 4 Step 7) prints `111 111` for the component.

- [ ] **Step 8: Commit**

```bash
git add src/components/assets/asset-register-toolbar.tsx tests/asset-register-filter-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): register toolbar without a card from md, scope selects on FilterSelect, sheet trigger on Button (2B-3 task 5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 15, spec §8.7 rows `/th/assets`):** at 1440, 1024 and 768 the bar has no frame and every control is 36px; changing a select reloads the list at once without bouncing back, and changing the company clears a branch of another company; "ตัวกรองเพิ่มเติม" opens the sheet (Enter and Space too) and focus returns to it on close; the filter counts show beside the words. At 375 the bar sticks to the top while the list scrolls, ⚙ is a 44px outline button with its count. axe on `/th/assets`: no `label` or `aria-*` violation (each select is named by its sr-only label).

---

### Task 6: `c/assets/asset-register-search-field.tsx` · on the shared `SearchField` (R-l, §6.7)

Spec §7.5 (row "ช่องค้นหา" and the bullets under it), §6.6 row 2, §6.7, §8.7 row 5, §7.17 rows `asset-register-search-ui.test.ts:26`, `:28` (`:25`, `:27` at `886a290`), ruling R-l and controller ruling (f). One file, one commit. The file is CRLF: exact-string replacements only.

Rulings this task applies:
- **§7.5:** the hand-placed icon, `<input>` and × button become one `SearchField` with `fieldSize="md"` (36px from md, 44 below), `loading={isPending}`, `onClear={clearSearch}` and `clearLabel={t("searchClear")}`. Every other input prop and handler moves over in its old order; `aria-label={tCommon("search")}` stays (a `SearchField` is the field that takes `aria-label`, DESIGN.md:452, :465).
- **§6.7 and R-l, kept line for line:** the 400ms pause (`assetRegisterSearchDebounceMs`), `shouldAutoSearch` (two characters, an empty field searches at once), the IME guard (`onCompositionStart`/`onCompositionEnd`, `composingRef.current || isComposing`), Enter (`onSubmit` + `preventDefault` + `search(draft)`), "the URL wins only while nobody is typing" and the unmount cleanup do not change (`tests/asset-register-search-ui.test.ts:10-18`, `:30-40`). The form stays the `role="search"` GET form with its hidden inputs, so the search still works without JavaScript.
- `clearSearch` is the old × handler (`setDraft("")`, `search("")`, `inputRef.current?.focus()`) as a named function, because `SearchField` takes `onClear` and draws the × itself (44px wide, `rounded-control`). `ref={inputRef}` reaches the `<input>`: React 19 passes `ref` as a prop, and `SearchField` and `Input` spread their props onto the element (`c/ui/search-field.tsx:18-32`, `c/ui/input.tsx:13-27`).
- The form drops `relative` (the `SearchField` wrapper is the positioned box) and keeps `min-w-0` plus the caller's `className` (`min-w-0 flex-1 basis-56` from Task 5's toolbar).
- `Loader2`, `Search`, `X` and `getFieldControlClasses` go. The spinner gets `motion-reduce:animate-none` from `SearchField`.
- **Controller ruling (f):** joins `MIGRATED_LIST_FILES` (no guard row).

What users will see:
- From 768px the search field is 36px (was 40), matching the selects; the icon is the faint grey of the other search fields.
- Typing, the pause, Thai input, Enter and × behave exactly as before; × still puts the cursor back in the field. The spinner holds still for users who reduce motion.

Not in this task: the toolbar (Task 5) · `c/assets/asset-register-navigation.tsx` (unchanged, `tests/asset-register-search-ui.test.ts:42-50`) · docs (Task 16). Do not run a formatter.

**Files:**
- Modify: `src/components/assets/asset-register-search-field.tsx` (`i/lf w/crlf`; 4 exact replacements)
- Modify: `tests/asset-register-search-ui.test.ts` (`i/lf w/crlf`, read with `\r` stripped; 1 exact replacement, 1 appended block)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only: `t6-block.ts`

**Must keep passing without edits:** `tests/asset-register-search-ui.test.ts:10-18`, `:20-24`, `:26` (`inputRef.current?.focus()`), `:30-57` · `tests/field-primitives.test.ts` (the `SearchField` strings) · `tests/form-migration-guards.test.ts`.

**Interfaces:**
- Consumes:
  - 2A: `SearchField(props: Omit<React.ComponentProps<"input">, "size" | "type"> & { type?: "search" | "text"; fieldSize?: FieldSize; loading?: boolean; trailing?: React.ReactNode } & ({ onClear: () => void; clearLabel: string } | { onClear?: undefined; clearLabel?: undefined }))` from `@/components/ui/search-field`: `className` goes on its wrapper, every other prop (with `ref`) on the `<input>`; × shows while `value` is not empty.
  - Task 0 and Task 1 helpers as in Task 4.
- Produces:
  - `AssetRegisterSearchField({ locale, className })` unchanged (Task 5's toolbar renders it).
  - LFG: the file in `MIGRATED_LIST_FILES`.

| guard | `c/assets/asset-register-search-field.tsx` before → after |
|---|---|
| LFG | no row → joins `MIGRATED_LIST_FILES` · no total moves |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`
Expected: nothing.

Run: `git diff --quiet 886a290 -- src/components/assets/asset-register-search-field.tsx tests/asset-register-search-ui.test.ts src/components/ui && echo BASE-OK`
Expected: `BASE-OK`.

Run: `git log --oneline -1 -- src/components/assets/asset-register-toolbar.tsx`
Expected: the Task 5 commit.

Run: `node <temp>/p2b1-precheck.mjs --file c/assets/asset-register-search-field.tsx`
Expected (exit 0): `file    src/components/assets/asset-register-search-field.tsx (CRLF) · not in MIGRATED_LIST_FILES` and `args    (no row holds this file)`.

Run: `git ls-files --eol src/components/assets/asset-register-search-field.tsx tests/asset-register-search-ui.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf    w/crlf` for all three.

- [ ] **Step 2: Write the failing tests** (`tests/asset-register-search-ui.test.ts`)

(a) Replace `:25-27` (spec §7.17 `:26`, `:28`; `:26` itself stays):

```ts
  assert.match(source, /aria-label=\{t\("searchClear"\)\}/)
  assert.match(source, /inputRef\.current\?\.focus\(\)/)
  assert.match(source, /isPending \? <Loader2/)
```

with:

```ts
  assert.match(source, /clearLabel=\{t\("searchClear"\)\}/)
  assert.match(source, /inputRef\.current\?\.focus\(\)/)
  assert.match(source, /<SearchField\b[\s\S]*?loading=\{isPending\}/)
```

(b) Save this block as `<temp>/t6-block.ts` and run `node <temp>/p2b3-append.mjs <temp>/t6-block.ts tests/asset-register-search-ui.test.ts` (Expected: `appended … (CRLF)`). It uses the file's `field()` reader (`:6`):

```ts
// Plan 2B-3 Task 6 (spec 2B §7.5, §6.7, R-l): the register search is the shared SearchField at 36px from md (44 below)
// inside the same search form, so the pause, IME, Enter and the hidden GET fields stay exactly as they were.
test("the register search is the shared SearchField with its clear button, inside the old search form (2B §7.5)", () => {
  const source = field()

  assert.match(source, /^import \{ SearchField \} from "@\/components\/ui\/search-field"$/m)
  assert.match(source, /<SearchField\n\s+ref=\{inputRef\}\n\s+name="search"\n\s+type="text"\n\s+inputMode="search"\n\s+enterKeyHint="search"\n\s+autoComplete="off"\n\s+spellCheck=\{false\}\n\s+fieldSize="md"\n\s+loading=\{isPending\}\n\s+aria-label=\{tCommon\("search"\)\}/)
  assert.match(source, /onClear=\{clearSearch\}/)
  assert.match(source, /function clearSearch\(\) \{\n\s+setDraft\(""\)\n\s+search\(""\)\n\s+inputRef\.current\?\.focus\(\)\n\s+\}/)
  assert.match(source, /className=\{cn\("min-w-0", className\)\}/)
  assert.equal(source.match(/<input\b/g)?.length, 1, "only the hidden inputs that keep the other filters stay raw")
  assert.doesNotMatch(source, /getFieldControlClasses|lucide-react|<button\b/)
})
```

Run: `node --test tests/asset-register-search-ui.test.ts`
Expected: FAIL, `tests 7 · pass 5 · fail 2`:
- `Enter searches at once and the clear button refocuses the field`: no match for `/clearLabel=\{t\("searchClear"\)\}/`
- `the register search is the shared SearchField with its clear button, inside the old search form (2B §7.5)`: no match for the `SearchField` import

- [ ] **Step 3: Change the component (`src/components/assets/asset-register-search-field.tsx`, CRLF)**

Four exact replacements, top to bottom.

(1) Imports `:3-10`. Replace:

```tsx
import { useEffect, useRef, useState } from "react"
import { Loader2, Search, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { useAssetRegisterNavigation } from "@/components/assets/asset-register-navigation"
import { buildAssetQueryString } from "@/lib/asset-list-query"
import { assetRegisterSearchDebounceMs, shouldAutoSearch } from "@/lib/asset-register-filters"
import { getFieldControlClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"
```

with:

```tsx
import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { useAssetRegisterNavigation } from "@/components/assets/asset-register-navigation"
import { SearchField } from "@/components/ui/search-field"
import { buildAssetQueryString } from "@/lib/asset-list-query"
import { assetRegisterSearchDebounceMs, shouldAutoSearch } from "@/lib/asset-register-filters"
import { cn } from "@/lib/utils"
```

(2) The clear handler gets a name, after `scheduleSearch` (`:55-58`). Replace:

```tsx
    }, assetRegisterSearchDebounceMs)
  }

  // Without JavaScript the form still submits as a GET that keeps every other filter.
```

with:

```tsx
    }, assetRegisterSearchDebounceMs)
  }

  function clearSearch() {
    setDraft("")
    search("")
    inputRef.current?.focus()
  }

  // Without JavaScript the form still submits as a GET that keeps every other filter.
```

(3) The form and the field `:69-88`. Replace:

```tsx
      className={cn("relative min-w-0", className)}
    >
      {preservedParams.map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground" aria-hidden="true">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
      </span>
      <input
        ref={inputRef}
        name="search"
        type="text"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        aria-label={tCommon("search")}
        placeholder={t("searchPlaceholder")}
        value={draft}
        onFocus={() => setFocused(true)}
```

with:

```tsx
      className={cn("min-w-0", className)}
    >
      {preservedParams.map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SearchField
        ref={inputRef}
        name="search"
        type="text"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        fieldSize="md"
        loading={isPending}
        aria-label={tCommon("search")}
        placeholder={t("searchPlaceholder")}
        value={draft}
        onClear={clearSearch}
        clearLabel={t("searchClear")}
        onFocus={() => setFocused(true)}
```

(4) The end of the field and the hand-drawn × `:102-120`. Replace:

```tsx
          scheduleSearch(value)
        }}
        className={cn(getFieldControlClasses(), "pl-9", draft ? "pr-11" : "")}
      />
      {draft ? (
        <button
          type="button"
          aria-label={t("searchClear")}
          onClick={() => {
            setDraft("")
            search("")
            inputRef.current?.focus()
          }}
          className="absolute inset-y-0 right-0 inline-flex min-w-11 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </form>
```

with:

```tsx
          scheduleSearch(value)
        }}
      />
    </form>
```

- [ ] **Step 4: Mark the file migrated (LFG)**

Run: `node <temp>/p2b-budget.mjs c/assets/asset-register-search-field.tsx --migrated`
Expected (exit 0): `MIGRATED_LIST_FILES: added` and `written: src/components/assets/asset-register-search-field.tsx`.

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/asset-register-search-ui.test.ts tests/field-primitives.test.ts tests/list-frame-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `fail 0` (`tests 67 · pass 67` on `886a290` with Tasks 4–6 only: asset-register-search-ui 7, field-primitives 16, list-frame-guards 21, form-migration-guards 23).

Run: `node <temp>/p2b1-precheck.mjs --file c/assets/asset-register-search-field.tsx`
Expected: `· in MIGRATED_LIST_FILES` and `args    (no row holds this file)`; exit 0.

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected: exit 0, `budgets hold: no live count is over its row`; no total moves.

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b3-tw-probe.mjs src/components/assets/asset-register-search-field.tsx`
Expected: `checked 1 classes, missing 0` (`min-w-0`; every other class now comes from `SearchField`).

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `fail 0`, one test more than after Task 5: `tests 1936 · pass 1935 · fail 0 · skipped 1`.
- `npx tsc --noEmit`: no errors (`ref={inputRef}` and the composition handlers type-check against `SearchField`'s input props; `onClear` and `clearLabel` come as a pair).
- `npm run lint`: 0 errors and the 146 warnings under `.agents/`; `npx eslint src/components/assets/asset-register-search-field.tsx tests/asset-register-search-ui.test.ts tests/list-frame-guards.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 3 files: `src/components/assets/asset-register-search-field.tsx` 13 insertions and 22 deletions, `tests/asset-register-search-ui.test.ts` 16 insertions and 2 deletions, `tests/list-frame-guards.test.ts` 1 insertion. The line-ending check prints `113 113` for the component and `71 71` for the test.

- [ ] **Step 8: Commit**

```bash
git add src/components/assets/asset-register-search-field.tsx tests/asset-register-search-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): register search on the shared SearchField (2B-3 task 6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 15, spec §8.7 row `/th/assets` 1024 · 768 · 375):** type one Thai character: nothing happens; two characters: the list updates about 400ms after the last key, the spinner shows meanwhile; type with the Thai IME (Windows) and no search fires mid-word; Enter searches at once; × clears, reloads and leaves the cursor in the field; type while a slow response arrives and the field keeps what you typed. 36px from 768, 44 at 375. NVDA reads the field as "ค้นหา" and × as "ล้างคำค้นหา".

---

### Task 7: `c/assets/asset-register-filter-sheet.tsx` · the sheet body on `FilterSelect` with `labelAction` help and a busy result button (I6, I26)

Spec §7.6, §6.6 row 3, §8.7 row 6, §8.11 row 1, §7.17 rows `asset-register-filter-ui.test.ts:58-59`, `asset-status-help-ui.test.ts:49-51` and N6 (sheet), rulings I6, I23, I26 and controller rulings (e), (f). One file, one commit. The file is CRLF: exact-string replacements only. LF1 goes from 2 to 1.

Rulings this task applies:
- **Body only (§8.11 row 1, controller ruling (e)):** `c/ui/sheet.tsx` is 2C's chrome and is not touched; 2B edits only `asset-register-filter-sheet.tsx:90-180` (plus its imports and the deleted helper). Inside those lines §7.6 drops two call-site props that the primitive now sets itself: `closeLabel={tCommon("close")}` (the primitive's default is `tCommon("close")`, `tests/sheet-drawers-ui.test.ts:10`) and `className="border-b border-border pr-14"` on `SheetHeader` (the primitive draws `border-b border-border px-4 py-4 pr-16`, `:26`; the old `pr-14` beat its `pr-16`). `side`, width, height, `SheetFooter className="grid grid-cols-2 gap-2 border-t border-border"` (its only caller, `:28-29`) and the button order "ล้าง" then "แสดง N รายการ" (K8) stay.
- **I6:** the seven `LabeledSelect` calls become `FilterSelect` (`Field` + `NativeSelect`) at the default `lg` (40px, 44 below md: a panel with visible labels, I23), with their old option children. Status and condition carry `labelAction={<AssetStateHelpPopover {...statusHelp} />}` / `{...conditionHelp}` at the popover's default 24px (was `size="compact"`, 16px); `Field` keeps the label row at 20px (`-my-0.5`, `c/ui/field.tsx:53-61`) and puts the button outside the `<label>`, so a click on it does not focus the select. The label is the 13px `FieldLabel` (`text-meta font-medium text-foreground`) instead of the 12px muted one. `function LabeledSelect` goes (LFG LF1 1 → 0, `KEEP` 0). Status still comes before condition (`tests/asset-status-help-ui.test.ts:44-48`).
- **Keys, a departure from §7.6's `key={filters.statusId}`:** each select stays uncontrolled with a key on the optimistic value, so it remounts on that value and never bounces back. Today the key sits on the `<select>` inside each `LabeledSelect`, one per parent. On `FilterSelect` the keys sit on siblings inside one `FilterSection`, where every unset filter has the same value `""`: `key={filters.statusId}`, `key={filters.conditionId}` and `key={filters.ownershipType}` would all be `""`, React would warn about duplicate keys and could keep the wrong select. So the key also carries the filter name, as the toolbar does: `` key={`status-${filters.statusId}`} ``. The N6 regex of §7.17 follows (`` /key=\{`status-\$\{filters\.statusId\}`\}/ `` for `/key=\{filters\.statusId\}/`), and the new test checks that the seven keys are distinct.
- **I26 `busy`:** the result button takes `busy={isPending}` instead of the hand-placed `Loader2`. It keeps focus, is announced as busy, shows the shared spinner and ignores clicks while the count loads; ×, Esc and a tap outside still close the sheet (risk §7.14 #3). It has no `disabled` (FMG GB4, `tests/form-migration-guards.test.ts:532-548`; "ล้าง" keeps its own `disabled={activeCount === 0}`). The label still reads "กำลังโหลด…" while loading, because the label is the result, not a command name (K13's `BUSY_LABEL_SWAPS` lists 2C files only).
- **Count:** `formatCount(total)` replaces `total.toLocaleString(locale === "th" ? "th-TH" : "en-US")`; `useLocale` goes (`src/lib/display-format.ts:1-2`: th-TH digits and grouping read the same in English).
- Stay: `FilterSection`, `ChipGroup` (`aria-pressed`, `min-h-11 md:min-h-9`, `tests/asset-register-filter-ui.test.ts:60-61`), `cn`, `statusHelp`, `conditionHelp`. Go: `Loader2`, `useLocale`, `getFieldControlClasses`.
- **Controller ruling (f):** the LF1 row goes and the file joins `MIGRATED_LIST_FILES`.

What users will see:
- In "ตัวกรอง" (desktop right, phone bottom) the labels are 13px dark text (were 12px grey); the ? buttons beside "สถานะ" and "สภาพ" are 24px (were 16); every select shows a chevron, 40px on desktop and 44 on phones.
- The title keeps clear of ×.
- "แสดง N รายการ" shows the spinner and "กำลังโหลด…" while the count loads and does nothing when pressed then; × or Esc closes the sheet at any time. Counts read "1,234".

Not in this task: `c/ui/sheet.tsx`, `c/ui/field.tsx` (2C chrome) · `c/assets/asset-state-help-popover.tsx` (its `size="compact"` branch has no caller left but stays pinned by `tests/asset-status-help-ui.test.ts:23-24`) · docs (Task 16). Do not run a formatter.

**Files:**
- Modify: `src/components/assets/asset-register-filter-sheet.tsx` (`i/lf w/crlf`; 10 exact replacements)
- Modify: `tests/asset-register-filter-ui.test.ts` (`i/lf w/crlf`, read with `\r` stripped; 1 exact replacement, 1 appended block)
- Modify: `tests/asset-status-help-ui.test.ts` (`i/lf w/crlf`, **read raw**: no `\n` in a new regex; 1 exact replacement)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only: `t7-block.ts`

**Must keep passing without edits:**
- `tests/asset-register-filter-ui.test.ts:48-57` (`<SheetTrigger asChild>{trigger}</SheetTrigger>`, `side`, `buildSheetClearOverrides(filters, scope)`, `disabled={activeCount === 0}`, `t("filterSheetShowResults", { count:`, `t("filterSheetNoResults")`, `onClick={() => setOpen(false)}`), `:60-62`, `:85-105`
- `tests/asset-status-help-ui.test.ts:11-26` (the popover keeps `size = "default"` and `isCompact`), `:28-40`, `:42-48`, `:54-77`
- `tests/sheet-drawers-ui.test.ts` (whole file; the sheet chrome is unchanged) · `tests/list-primitives-ui.test.ts:190-205` · `tests/form-migration-guards.test.ts` (GB4 finds one more `busy=` and no `disabled` beside it; GD1 finds no literal close label)

**Interfaces:**
- Consumes:
  - 2B-1: `FilterSelect` as in Task 5, here with `labelAction` and the default `fieldSize="lg"`.
  - 2A: `Button({ busy?: boolean, … })` (keeps focus, `aria-busy`, `aria-disabled`, spinner first, clicks cancelled); `formatCount(value: number): string` from `@/lib/display-format`.
  - `AssetStateHelpPopover({ title, description, items, srLabel?, size? })` from `@/components/assets/asset-state-help-popover` (default 24px button).
  - Task 0 and Task 1 helpers as in Task 4.
- Produces:
  - `AssetRegisterFilterSheet({ trigger, options, tabStatusIds, total })` and `type AssetRegisterFilterOptions` unchanged (Task 5's toolbar renders it).
  - LFG: no LF1 row for the file; the file in `MIGRATED_LIST_FILES`.

| guard | before → after |
|---|---|
| LFG `c/assets/asset-register-filter-sheet.tsx` | LF1 1 → – (row deleted with its `// 2B-3` group line) · joins `MIGRATED_LIST_FILES` |
| totals | LF1 2 → 1 (left: `c/reports/report-filter-panel.tsx`, 2B-5) |
| FMG (not edited) | not a 2C file: no count · GB4 passes |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`
Expected: nothing.

Run: `git diff --quiet 886a290 -- src/components/assets/asset-register-filter-sheet.tsx tests/asset-status-help-ui.test.ts src/components/ui src/lib/display-format.ts && echo BASE-OK`
Expected: `BASE-OK`.

Run: `git log --oneline -1 -- src/components/assets/asset-register-search-field.tsx`
Expected: the Task 6 commit.

Run: `git grep -cF 'assert.match(source, /help=\{statusHelp\}/)' -- tests/asset-register-filter-ui.test.ts tests/asset-status-help-ui.test.ts`
Expected: `tests/asset-register-filter-ui.test.ts:1` and `tests/asset-status-help-ui.test.ts:1`.

Run: `node <temp>/p2b1-precheck.mjs --file c/assets/asset-register-filter-sheet.tsx`
Expected (exit 0; after the header lines):
```
file    src/components/assets/asset-register-filter-sheet.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LF1        1       1     0     1
args    LF1=1:1
```

Run: `git ls-files --eol src/components/assets/asset-register-filter-sheet.tsx tests/asset-register-filter-ui.test.ts tests/asset-status-help-ui.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf    w/crlf` for all four.

- [ ] **Step 2: Write the failing tests**

(a) `tests/asset-register-filter-ui.test.ts` (read with `\r` stripped). Replace `:58-59` (I6):

```ts
  assert.match(source, /help=\{statusHelp\}/)
  assert.match(source, /help=\{conditionHelp\}/)
```

with:

```ts
  assert.match(source, /labelAction=\{<AssetStateHelpPopover \{\.\.\.statusHelp\} \/>\}/)
  assert.match(source, /labelAction=\{<AssetStateHelpPopover \{\.\.\.conditionHelp\} \/>\}/)
```

(b) `tests/asset-status-help-ui.test.ts` (read raw, CRLF: the new regexes hold no `\n`). Replace `:49-51`:

```ts
  assert.match(source, /help=\{statusHelp\}/)
  assert.match(source, /help=\{conditionHelp\}/)
  assert.match(source, /<AssetStateHelpPopover \{\.\.\.help\} size="compact" \/>/)
```

with:

```ts
  assert.match(source, /labelAction=\{<AssetStateHelpPopover \{\.\.\.statusHelp\} \/>\}/)
  assert.match(source, /labelAction=\{<AssetStateHelpPopover \{\.\.\.conditionHelp\} \/>\}/)
  assert.doesNotMatch(source, /size="compact"|function LabeledSelect/)
```

(c) Save this block as `<temp>/t7-block.ts` and run `node <temp>/p2b3-append.mjs <temp>/t7-block.ts tests/asset-register-filter-ui.test.ts` (Expected: `appended … (CRLF)`). It uses the file's `sheet()` reader (`:8`):

```ts
// Plan 2B-3 Task 7 (spec 2B §7.6, I6, I26): the sheet's seven selects are FilterSelect with a visible label at lg,
// status and condition carry their 24px help button in labelAction, and the result button is busy while it loads.
test("the filter sheet uses FilterSelect with labelAction help and a busy result button (2B §7.6)", () => {
  const source = sheet()

  assert.equal(source.match(/<FilterSelect\b/g)?.length, 7)
  assert.match(source, /key=\{`status-\$\{filters\.statusId\}`\}\n\s+defaultValue=\{filters\.statusId\}\n\s+onChange=\{\(event\) => navigate\(\{ statusId: event\.target\.value \}\)\}/)
  assert.match(source, /key=\{`pageSize-\$\{filters\.pageSize\}`\}\n\s+defaultValue=\{String\(filters\.pageSize\)\}\n\s+onChange=\{\(event\) => navigate\(\{ pageSize: Number\(event\.target\.value\) \}\)\}/)
  assert.equal(new Set(source.match(/key=\{`[A-Za-z]+-\$\{filters\./g)).size, 7, "sibling FilterSelects need distinct keys: an unset filter is the same empty value in every select")
  assert.match(source, /<Button onClick=\{\(\) => setOpen\(false\)\} aria-live="polite" busy=\{isPending\}>/)
  assert.match(source, /t\("filterSheetShowResults", \{ count: formatCount\(total\) \}\)/)
  assert.match(source, /<SheetHeader>/)
  assert.doesNotMatch(source, /function LabeledSelect|<select\b|Loader2|closeLabel=|pr-14|getFieldControlClasses|toLocaleString\(|useLocale/)
})
```

Run: `node --test tests/asset-register-filter-ui.test.ts tests/asset-status-help-ui.test.ts`
Expected: FAIL, `fail 3` (`tests 15 · pass 12` on `886a290` with Tasks 4–7 only; add any test Tasks 1–3 appended to the first file):
- `the filter sheet applies changes at once, keeps its trigger and shows the real result count`: no match for the `labelAction=\{<AssetStateHelpPopover \{\.\.\.statusHelp\} \/>\}` regex
- `the filter sheet uses FilterSelect with labelAction help and a busy result button (2B §7.6)`: `undefined !== 7`
- `asset register keeps status and condition filters together with their help`: no match for the same `labelAction` regex

- [ ] **Step 3: Lower the guard row (the failing guards)**

Run: `node <temp>/p2b-budget.mjs c/assets/asset-register-filter-sheet.tsx LF1=1:0 --migrated`
Expected (exit 0):
```
LF1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/components/assets/asset-register-filter-sheet.tsx
```

Run: `node --test tests/list-frame-guards.test.ts`
Expected: FAIL, `tests 21 · pass 19 · fail 2`: `LF1 list filters use the shared FilterSelect, not a local select helper` (`LF1: 2 in 2 files`, listing `src/components/assets/asset-register-filter-sheet.tsx: 1 > 0`) and `L0 …` (`LF1 src/components/assets/asset-register-filter-sheet.tsx: 1 > 0`).

- [ ] **Step 4: Change the component (`src/components/assets/asset-register-filter-sheet.tsx`, CRLF)**

Ten exact replacements, top to bottom.

(1) Imports `:3-9`. Replace:

```tsx
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { AssetStateHelpPopover } from "@/components/assets/asset-state-help-popover"
import { useAssetRegisterNavigation } from "@/components/assets/asset-register-navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
```

with:

```tsx
import { useState } from "react"
import { useTranslations } from "next-intl"
import { AssetStateHelpPopover } from "@/components/assets/asset-state-help-popover"
import { useAssetRegisterNavigation } from "@/components/assets/asset-register-navigation"
import { Button } from "@/components/ui/button"
import { FilterSelect } from "@/components/ui/filter-select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
```

(2) Imports `:14-16`. Replace:

```tsx
import { buildSheetClearOverrides, getActiveSheetFilterKeys, getCompanyChangeOverrides } from "@/lib/asset-register-filters"
import { getFieldControlClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"
```

with:

```tsx
import { buildSheetClearOverrides, getActiveSheetFilterKeys, getCompanyChangeOverrides } from "@/lib/asset-register-filters"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"
```

(3) `useLocale` `:54-56`. Replace:

```tsx
  const tCommon = useTranslations("common")
  const locale = useLocale()
  const { filters, isPending, navigate } = useAssetRegisterNavigation()
```

with:

```tsx
  const tCommon = useTranslations("common")
  const { filters, isPending, navigate } = useAssetRegisterNavigation()
```

(4) The result count `:85`. Replace:

```tsx
      : t("filterSheetShowResults", { count: total.toLocaleString(locale === "th" ? "th-TH" : "en-US") })
```

with:

```tsx
      : t("filterSheetShowResults", { count: formatCount(total) })
```

(5) `SheetContent` `:91-93`. Replace:

```tsx
        side={isDesktop ? "right" : "bottom"}
        closeLabel={tCommon("close")}
        data-asset-filter-sheet
```

with:

```tsx
        side={isDesktop ? "right" : "bottom"}
        data-asset-filter-sheet
```

(6) `SheetHeader` `:96`. Replace:

```tsx
        <SheetHeader className="border-b border-border pr-14">
```

with:

```tsx
        <SheetHeader>
```

(7) Scope and state sections `:100-146`. Replace:

```tsx
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          {isDesktop ? null : (
            <FilterSection title={t("filterSheetScope")}>
              <LabeledSelect
                label={t("company")}
                value={filters.companyId}
                onChange={(value) => navigate(getCompanyChangeOverrides(value, filters.branchId, options.branches))}
              >
                <option value="">{tCommon("all")}</option>
                {options.companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.code} - {company.nameTh}</option>
                ))}
              </LabeledSelect>
              <LabeledSelect label={t("branch")} value={filters.branchId} onChange={(value) => navigate({ branchId: value })}>
                <option value="">{tCommon("all")}</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.company.code} / {branch.code} - {branch.name}</option>
                ))}
              </LabeledSelect>
              <LabeledSelect label={t("category")} value={filters.categoryId} onChange={(value) => navigate({ categoryId: value })}>
                <option value="">{tCommon("all")}</option>
                {options.categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.code} - {category.name}</option>
                ))}
              </LabeledSelect>
            </FilterSection>
          )}
          <FilterSection title={t("filterSheetState")}>
            <LabeledSelect label={t("status")} help={statusHelp} value={filters.statusId} onChange={(value) => navigate({ statusId: value })}>
              <option value="">{tCommon("all")}</option>
              {options.statuses.map((status) => (
                <option key={status.id} value={status.id}>{status.nameTh}</option>
              ))}
            </LabeledSelect>
            <LabeledSelect label={t("condition")} help={conditionHelp} value={filters.conditionId} onChange={(value) => navigate({ conditionId: value })}>
              <option value="">{tCommon("all")}</option>
              {options.conditions.map((condition) => (
                <option key={condition.id} value={condition.id}>{condition.nameTh}</option>
              ))}
            </LabeledSelect>
            <LabeledSelect label={t("ownershipType")} value={filters.ownershipType} onChange={(value) => navigate({ ownershipType: value })}>
              <option value="">{tCommon("all")}</option>
              {assetOwnershipTypes.map((type) => (
                <option key={type} value={type}>{t(`ownershipType_${type}`)}</option>
              ))}
            </LabeledSelect>
          </FilterSection>
```

with:

```tsx
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          {/* Uncontrolled + key: each FilterSelect remounts on the optimistic value, so it never bounces back. The key
              carries the filter name too, because an unset filter is the same empty value in every sibling select. */}
          {isDesktop ? null : (
            <FilterSection title={t("filterSheetScope")}>
              <FilterSelect
                label={t("company")}
                key={`company-${filters.companyId}`}
                defaultValue={filters.companyId}
                onChange={(event) => navigate(getCompanyChangeOverrides(event.target.value, filters.branchId, options.branches))}
              >
                <option value="">{tCommon("all")}</option>
                {options.companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.code} - {company.nameTh}</option>
                ))}
              </FilterSelect>
              <FilterSelect
                label={t("branch")}
                key={`branch-${filters.branchId}`}
                defaultValue={filters.branchId}
                onChange={(event) => navigate({ branchId: event.target.value })}
              >
                <option value="">{tCommon("all")}</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.company.code} / {branch.code} - {branch.name}</option>
                ))}
              </FilterSelect>
              <FilterSelect
                label={t("category")}
                key={`category-${filters.categoryId}`}
                defaultValue={filters.categoryId}
                onChange={(event) => navigate({ categoryId: event.target.value })}
              >
                <option value="">{tCommon("all")}</option>
                {options.categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.code} - {category.name}</option>
                ))}
              </FilterSelect>
            </FilterSection>
          )}
          <FilterSection title={t("filterSheetState")}>
            <FilterSelect
              label={t("status")}
              labelAction={<AssetStateHelpPopover {...statusHelp} />}
              key={`status-${filters.statusId}`}
              defaultValue={filters.statusId}
              onChange={(event) => navigate({ statusId: event.target.value })}
            >
              <option value="">{tCommon("all")}</option>
              {options.statuses.map((status) => (
                <option key={status.id} value={status.id}>{status.nameTh}</option>
              ))}
            </FilterSelect>
            <FilterSelect
              label={t("condition")}
              labelAction={<AssetStateHelpPopover {...conditionHelp} />}
              key={`condition-${filters.conditionId}`}
              defaultValue={filters.conditionId}
              onChange={(event) => navigate({ conditionId: event.target.value })}
            >
              <option value="">{tCommon("all")}</option>
              {options.conditions.map((condition) => (
                <option key={condition.id} value={condition.id}>{condition.nameTh}</option>
              ))}
            </FilterSelect>
            <FilterSelect
              label={t("ownershipType")}
              key={`ownershipType-${filters.ownershipType}`}
              defaultValue={filters.ownershipType}
              onChange={(event) => navigate({ ownershipType: event.target.value })}
            >
              <option value="">{tCommon("all")}</option>
              {assetOwnershipTypes.map((type) => (
                <option key={type} value={type}>{t(`ownershipType_${type}`)}</option>
              ))}
            </FilterSelect>
          </FilterSection>
```

(8) Page size `:163-169`. Replace:

```tsx
          <FilterSection title={t("filterSheetDisplay")}>
            <LabeledSelect label={t("pageSizeLabel")} value={String(filters.pageSize)} onChange={(value) => navigate({ pageSize: Number(value) })}>
              {[10, 25, 50, 100].map((pageSize) => (
                <option key={pageSize} value={pageSize}>{pageSize}</option>
              ))}
            </LabeledSelect>
          </FilterSection>
```

with:

```tsx
          <FilterSection title={t("filterSheetDisplay")}>
            <FilterSelect
              label={t("pageSizeLabel")}
              key={`pageSize-${filters.pageSize}`}
              defaultValue={String(filters.pageSize)}
              onChange={(event) => navigate({ pageSize: Number(event.target.value) })}
            >
              {[10, 25, 50, 100].map((pageSize) => (
                <option key={pageSize} value={pageSize}>{pageSize}</option>
              ))}
            </FilterSelect>
          </FilterSection>
```

(9) The result button `:175-178`. Replace:

```tsx
          <Button onClick={() => setOpen(false)} aria-live="polite">
            {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {resultLabel}
          </Button>
```

with:

```tsx
          <Button onClick={() => setOpen(false)} aria-live="polite" busy={isPending}>
            {resultLabel}
          </Button>
```

(10) `function LabeledSelect` `:194-226` goes (the OLD text runs to the `ChipGroup` line `:227`, which stays). Replace:

```tsx
function LabeledSelect({
  label,
  value,
  onChange,
  help,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  help?: { title: string; description: string; items: string[] }
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        {help ? <AssetStateHelpPopover {...help} size="compact" /> : null}
      </div>
      {/* Uncontrolled + key: remounts on the optimistic value, so it never bounces back. */}
      <select
        key={value}
        aria-label={label}
        defaultValue={value}
        onChange={(event) => onChange(event.target.value)}
        className={getFieldControlClasses()}
      >
        {children}
      </select>
    </div>
  )
}

function ChipGroup<T extends string>({
```

with:

```tsx
function ChipGroup<T extends string>({
```

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/asset-register-filter-ui.test.ts tests/asset-status-help-ui.test.ts tests/sheet-drawers-ui.test.ts tests/list-frame-guards.test.ts tests/form-migration-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: PASS, `fail 0` (`tests 91 · pass 91` on `886a290` with Tasks 4–7 only: asset-register-filter-ui 11, asset-status-help-ui 4, sheet-drawers-ui 6, list-frame-guards 21, form-migration-guards 23, visual-foundation-guards 26).

Run: `node <temp>/p2b1-precheck.mjs --file c/assets/asset-register-filter-sheet.tsx`
Expected: `· in MIGRATED_LIST_FILES`, the row `LF1        0       0     0     1` and `args    (no row holds this file)`; exit 0.

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected: exit 0, `budgets hold: no live count is over its row`, with `LF1 BUDGETS.LF1          1 in  1 rows · live   1 in  1 files · over 0 · slack 0`; every other total as after Task 6.

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b3-tw-probe.mjs src/components/assets/asset-register-filter-sheet.tsx`
Expected: `checked 28 classes, missing 0` (no class is new: the select and label classes come from `FilterSelect`).

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `fail 0`, one test more than after Task 6: `tests 1937 · pass 1936 · fail 0 · skipped 1`.
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors and the 146 warnings under `.agents/`; `npx eslint src/components/assets/asset-register-filter-sheet.tsx tests/asset-register-filter-ui.test.ts tests/asset-status-help-ui.test.ts tests/list-frame-guards.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 4 files: `src/components/assets/asset-register-filter-sheet.tsx` 57 insertions and 58 deletions, `tests/asset-register-filter-ui.test.ts` 17 insertions and 2 deletions, `tests/asset-status-help-ui.test.ts` 3 insertions and 3 deletions, `tests/list-frame-guards.test.ts` 1 insertion and 2 deletions. The line-ending check prints `260 260` for the component and `77 77` for `tests/asset-status-help-ui.test.ts`.

- [ ] **Step 8: Commit**

```bash
git add src/components/assets/asset-register-filter-sheet.tsx tests/asset-register-filter-ui.test.ts tests/asset-status-help-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): register filter sheet on FilterSelect with labelAction help and a busy result button (2B-3 task 7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 15, spec §7.15 row 375 and §8.7 rows `/th/assets`):** open "ตัวกรองเพิ่มเติม" at 1440 (right sheet) and 375 (bottom sheet): labels 13px and dark; the 24px ? opens its help on hover and stays open on click, and a click on it does not focus the select; the label row with ? stays 20px; change status, then condition, then page size: the list reloads each time, the select shows the new value at once and does not bounce back, the other selects keep theirs; on a phone the three scope selects (company, branch, category) are at the top; "แสดง N รายการ" shows the spinner and "กำลังโหลด…" while loading, then closes the sheet; × and Esc close it at any time, focus returns to "ตัวกรองเพิ่มเติม"; "ล้าง" is greyed with no filter on. NVDA: each select reads its visible label; the ? reads its title.

---

### Task 8: `c/assets/asset-register-status-tabs.tsx` · a server wrapper of `TabNav` (B3(5), I9)

Spec §7.7, §7.3 row "Status tabs", §8.7 row 7, §7.17 rows `asset-register-filter-ui.test.ts:69-72` and VFG:143-148, rulings B3(5), I9, R-g and controller rulings (b), (f). One file, one commit, together with its two pins. The file is CRLF. LN1 goes from 6 to 5.

Rulings this task applies:
- **I9, §7.7:** the file and `AssetRegisterStatusTabs` stay (Task 13's page and `tests/asset-register-filter-ui.test.ts:20` call it by name) and render `TabNav` with `aria-label={label}`, `items`, `current={items.find((item) => item.active)?.key ?? ""}`, `data-asset-status-tabs` (it reaches the `<nav>` through `...navProps`) and the old placement class `-mx-4 mb-2 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:mb-3 md:px-0`, so the row still scrolls to the screen edge on phones and `mb-2 … md:mb-3` stays (`:109`). No `fullBleed` prop (I9). `overflow-x-auto`, the inset base line, the 2px line of the current tab, `aria-current` and the 44px targets below md now come from `TabNav`.
- **The item type:** `type AssetRegisterStatusTabItem = TabNavItem & { active: boolean }`. The page's items (`key`, `label`, `count` already formatted, `href`, `active`) fit unchanged; `current` is a required prop of `TabNav`, so the page keeps marking the item and the wrapper turns it into a key.
- **B3(5), R-g:** underline tabs at every width (phones had rounded pills); the count is `text-meta num` after the label with no fill, so no R1 site appears.
- **LN1 1 → 0:** `aria-current` now comes from `TabNav`, a navigation primitive LN1 skips. Controller ruling (f): the file joins `MIGRATED_LIST_FILES`.
- **VFG:143-148 (§7.17, controller ruling (b)):** the pin reads `c/ui/tab-nav.tsx` (no `overflow-visible` or `-mb-px`, `overflow-x-auto`, the inset base line and no `md:` on it) and checks that the wrapper passes `data-asset-status-tabs`; its name becomes "the register status tabs keep their underline at every width and the row still scrolls". The other register row of VFG, the R2 comment of the table at VFG:286 (VFG:270 in the spec), belongs to Task 3; this task does not touch it.

What users will see:
- The status tabs ("ทั้งหมด", "พร้อมใช้งาน", …) are underlined at every width; on phones they were rounded pills. The count is a plain number after the label (primary on the current tab), the current tab is bold with a 2px primary line, and the tabs sit 22px apart.
- On phones each tab is 44px tall and the row still scrolls sideways to the screen edge.

Not in this task: the page and `src/lib/asset-register-status-tabs.ts` (unchanged; Task 13 changes only the page's `count:` to `formatCount`) · `c/ui/tab-nav.tsx` (2B-1) · docs (Task 16, DESIGN.md:503). Do not run a formatter.

**Files:**
- Modify: `src/components/assets/asset-register-status-tabs.tsx` (`i/lf w/crlf`; the whole file, 44 → 18 lines)
- Modify: `tests/asset-register-filter-ui.test.ts` (`i/lf w/crlf`, read with `\r` stripped; 1 exact replacement)
- Modify: `tests/visual-foundation-guards.test.ts` (`i/lf w/crlf`, read with `\r` stripped; 1 exact replacement)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)

**Must keep passing without edits:** `tests/asset-register-filter-ui.test.ts:13-24`, `:107-110` (`:109` `mb-2 [^"]*md:mb-3`; `:108` is Task 13's) · `tests/list-primitives-ui.test.ts:225-245` (`TabNav`) · `tests/asset-register-view-model.test.ts` (`buildStatusTabs`) · `tests/visual-foundation-guards.test.ts` outside `:143-148`.

**Interfaces:**
- Consumes:
  - 2B-1: `TabNav(props: Omit<React.ComponentProps<"nav">, "children" | "aria-label" | "onSelect"> & { "aria-label": string; items: readonly TabNavItem[]; current: string; scroll?: boolean; onSelect?; linkClassName?: string; className?: string })` and `type TabNavItem = { key: string; label: React.ReactNode; href: string; count?: string; icon?: React.ReactNode }` from `@/components/ui/tab-nav` (server-safe; `...navProps` lands on the `<nav>`).
  - Task 0 helpers.
- Produces:
  - `AssetRegisterStatusTabs({ label, items }: { label: string; items: AssetRegisterStatusTabItem[] })` and `export type AssetRegisterStatusTabItem = TabNavItem & { active: boolean }` (Task 13's page passes the same objects).
  - LFG: no LN1 row for the file; the file in `MIGRATED_LIST_FILES`.

| guard | before → after |
|---|---|
| LFG `c/assets/asset-register-status-tabs.tsx` | LN1 1 → – (row deleted with its `// 2B-3` group line) · joins `MIGRATED_LIST_FILES` |
| totals | LN1 6 → 5 |
| VFG | one test rewritten in place (still 26 tests), no budget |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`
Expected: nothing.

Run: `git diff --quiet 886a290 -- src/components/assets/asset-register-status-tabs.tsx src/components/ui/tab-nav.tsx && echo BASE-OK`
Expected: `BASE-OK`.

Run: `git log --oneline -1 -- src/components/assets/asset-register-filter-sheet.tsx`
Expected: the Task 7 commit.

Run: `git grep -cF 'test("status tabs are server-rendered links' -- tests/asset-register-filter-ui.test.ts` then `git grep -cF 'test("the selected register status tab keeps its underline on desktop' -- tests/visual-foundation-guards.test.ts`
Expected: `tests/asset-register-filter-ui.test.ts:1`, then `tests/visual-foundation-guards.test.ts:1`.

Run: `node <temp>/p2b1-precheck.mjs --file c/assets/asset-register-status-tabs.tsx`
Expected (exit 0; after the header lines):
```
file    src/components/assets/asset-register-status-tabs.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LN1        1       1     0     1
args    LN1=1:1
```

Run: `git ls-files --eol src/components/assets/asset-register-status-tabs.tsx tests/asset-register-filter-ui.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf    w/crlf` for all four.

- [ ] **Step 2: Write the failing tests**

(a) `tests/asset-register-filter-ui.test.ts`: replace the status tab test `:65-73` (spec §7.17 `:69-72`; `:68` still reads the wrapper):

```ts
test("status tabs are server-rendered links that mark the current tab and scroll sideways on phones", () => {
  const source = tabs()

  assert.doesNotMatch(source, /"use client"/)
  assert.match(source, /<nav aria-label=\{label\}/)
  assert.match(source, /aria-current=\{item\.active \? "page" : undefined\}/)
  assert.match(source, /overflow-x-auto/)
  assert.match(source, /min-h-11/)
})
```

with:

```ts
test("status tabs are server-rendered links that mark the current tab and scroll sideways on phones", () => {
  const source = tabs()
  // TabNav (2B-1, I9) draws the links: aria-current on the current one, a row that scrolls, 44px targets below md.
  const tabNav = read("src/components/ui/tab-nav.tsx")

  assert.doesNotMatch(source, /"use client"/)
  assert.match(source, /<TabNav\b[\s\S]*?aria-label=\{label\}[\s\S]*?data-asset-status-tabs/)
  assert.match(source, /current=\{items\.find\(\(item\) => item\.active\)\?\.key \?\? ""\}/)
  assert.match(source, /className="-mx-4 mb-2 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:mb-3 md:px-0"/, "the row still scrolls to the screen edge on phones")
  assert.doesNotMatch(source, /<nav\b|<Link\b|aria-current|rounded-full|fullBleed/)
  assert.match(tabNav, /aria-current=/)
  assert.match(tabNav, /overflow-x-auto/)
  assert.match(tabNav, /min-h-11/)
})
```

(b) `tests/visual-foundation-guards.test.ts`: replace `:143-148`:

```ts
test("the selected register status tab keeps its underline on desktop and the row still scrolls", () => {
  const source = read("src/components/assets/asset-register-status-tabs.tsx")
  assert.doesNotMatch(source, /md:overflow-visible|md:-mb-px/)
  assert.match(source, /data-asset-status-tabs className="[^"]*\boverflow-x-auto\b/)
  assert.match(source, /md:shadow-\[inset_0_-1px_0_var\(--border\)\]/)
})
```

with:

```ts
test("the register status tabs keep their underline at every width and the row still scrolls", () => {
  // The register tabs are TabNav (2B-3, I9): the base line is an inset shadow on the list at every width, and the
  // current tab's line sits inside the list, so it scrolls with the tabs and is never clipped.
  const tabNav = read("src/components/ui/tab-nav.tsx")
  assert.doesNotMatch(tabNav, /overflow-visible|-mb-px/)
  assert.match(tabNav, /overflow-x-auto/)
  assert.match(tabNav, /shadow-\[inset_0_-1px_0_var\(--border\)\]/)
  assert.doesNotMatch(tabNav, /md:shadow-\[inset/)
  assert.match(read("src/components/assets/asset-register-status-tabs.tsx"), /<TabNav\b[\s\S]*?data-asset-status-tabs/)
})
```

Run: `node --test tests/asset-register-filter-ui.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `fail 2` (`tests 37 · pass 35` on `886a290` with Tasks 4–8 only; add any test Tasks 1–3 appended):
- `status tabs are server-rendered links that mark the current tab and scroll sideways on phones`: no match for `/<TabNav\b[\s\S]*?aria-label=\{label\}[\s\S]*?data-asset-status-tabs/`
- `the register status tabs keep their underline at every width and the row still scrolls`: no match for `/<TabNav\b[\s\S]*?data-asset-status-tabs/`

- [ ] **Step 3: Lower the guard row (the failing guards)**

Run: `node <temp>/p2b-budget.mjs c/assets/asset-register-status-tabs.tsx LN1=1:0 --migrated`
Expected (exit 0):
```
LN1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/components/assets/asset-register-status-tabs.tsx
```

Run: `node --test tests/list-frame-guards.test.ts`
Expected: FAIL, `tests 21 · pass 19 · fail 2`: `LN1 aria-current="page" is set by TabNav, StatStrip, Pagination and the menus, not by hand` (`LN1: 6 in 5 files`, listing `src/components/assets/asset-register-status-tabs.tsx: 1 > 0`) and `L0 …` (`LN1 src/components/assets/asset-register-status-tabs.tsx: 1 > 0`).

- [ ] **Step 4: Replace the component (`src/components/assets/asset-register-status-tabs.tsx`, CRLF)**

The whole file changes. Old text at `886a290` (all 44 lines):

```tsx
import Link from "next/link"
import { cn } from "@/lib/utils"

export type AssetRegisterStatusTabItem = {
  key: string
  label: string
  /** Already formatted for the locale. */
  count: string
  href: string
  active: boolean
}

export function AssetRegisterStatusTabs({ label, items }: { label: string; items: AssetRegisterStatusTabItem[] }) {
  return (
    <nav aria-label={label} data-asset-status-tabs className="-mx-4 mb-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 md:mx-0 md:mb-3 md:px-0">
      <ul className="flex w-max gap-2 md:min-w-full md:gap-1 md:shadow-[inset_0_-1px_0_var(--border)]">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-10 md:rounded-none md:border-0 md:border-b-2",
                item.active
                  ? "border-primary-border bg-primary-soft text-primary md:border-primary md:bg-transparent"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground md:border-transparent md:bg-transparent",
              )}
            >
              <span>{item.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  item.active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {item.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
```

New text (18 lines):

```tsx
import { TabNav, type TabNavItem } from "@/components/ui/tab-nav"

// count is already formatted (formatCount). The page marks one item active; TabNav takes its key as current.
export type AssetRegisterStatusTabItem = TabNavItem & { active: boolean }

// A server wrapper of TabNav (spec 2B §7.7, I9): underline tabs at every width, 44px targets below md. The class lets
// the row scroll to the screen edge on phones; data-asset-status-tabs reaches the nav element through navProps.
export function AssetRegisterStatusTabs({ label, items }: { label: string; items: AssetRegisterStatusTabItem[] }) {
  return (
    <TabNav
      aria-label={label}
      items={items}
      current={items.find((item) => item.active)?.key ?? ""}
      data-asset-status-tabs
      className="-mx-4 mb-2 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:mb-3 md:px-0"
    />
  )
}
```

Keep the file CRLF. If your editor wrote LF, run `node -e "const fs=require('fs');const p=process.argv[1];fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace(/\r?\n/g,'\r\n'))" src/components/assets/asset-register-status-tabs.tsx`.

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/asset-register-filter-ui.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts tests/list-primitives-ui.test.ts tests/asset-register-view-model.test.ts`
Expected: PASS, `fail 0` (`tests 87 · pass 87`: asset-register-filter-ui 11, visual-foundation-guards 26, list-frame-guards 21, list-primitives-ui 18, asset-register-view-model 11 (Task 1 added one); add what Tasks 1–3 added).

Run: `node <temp>/p2b1-precheck.mjs --file c/assets/asset-register-status-tabs.tsx`
Expected: `· in MIGRATED_LIST_FILES`, the row `LN1        0       0     0     1` and `args    (no row holds this file)`; exit 0.

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected: exit 0, `budgets hold: no live count is over its row`, with `LN1 BUDGETS.LN1          5 in  4 rows · live   5 in  4 files · over 0 · slack 0`.

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b3-tw-probe.mjs src/components/assets/asset-register-status-tabs.tsx`
Expected: `checked 8 classes, missing 0`.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `fail 0`, as many tests as after Task 7 (two tests rewritten, none added): `tests 1937 · pass 1936 · fail 0 · skipped 1`.
- `npx tsc --noEmit`: no errors (the page's items type-check against `TabNavItem & { active: boolean }`; `data-asset-status-tabs` is a `nav` prop).
- `npm run lint`: 0 errors and the 146 warnings under `.agents/`; `npx eslint src/components/assets/asset-register-status-tabs.tsx tests/asset-register-filter-ui.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 4 files: `src/components/assets/asset-register-status-tabs.tsx` 12 insertions and 38 deletions, `tests/asset-register-filter-ui.test.ts` 9 insertions and 4 deletions, `tests/list-frame-guards.test.ts` 1 insertion and 2 deletions, `tests/visual-foundation-guards.test.ts` 9 insertions and 5 deletions. The line-ending check prints `18 18` for the component.

- [ ] **Step 8: Commit**

```bash
git add src/components/assets/asset-register-status-tabs.tsx tests/asset-register-filter-ui.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): register status tabs on TabNav (2B-3 task 8)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 15, spec §7.15 rows 375 and 1440):** at 1440 and 768 the tabs sit on one base line under the toolbar, the current tab bold with the primary line, counts in th-TH; at 375 the row scrolls to both screen edges, each tab is 44px tall, and the current tab's line scrolls with it and is never cut; Tab moves through the tabs with the ring inside each link; NVDA reads the nav name "กรองตามสถานะ" and "หน้าปัจจุบัน" on the current tab. Windows forced colors: the current tab's line still shows.

---

### Task 9: `c/assets/asset-register-filter-chips.tsx` · a server wrapper of `FilterChipList` (I7)

Spec §7.5 ("ชิปตัวกรอง" and the code under it), §6.6 row 5, §8.7 row 8, §7.17 row `asset-register-filter-ui.test.ts:79-82` and N6 (chips), ruling I7 and controller ruling (f). One file, one commit. The file is CRLF.

Rulings this task applies:
- **I7, §7.5:** the file and `AssetRegisterFilterChips` with its props stay (the page calls it by name with `labels.remove = t("clearDrilldownFilter")`, `tests/asset-register-filter-ui.test.ts:20`) and render `FilterChipList` with `chips`, `label={labels.activeFilters}`, `removeLabel={labels.remove}`, `clearAll={{ href: clearAllHref, label: labels.clearAll }}` and `className="mb-3"` (the old margin). `AssetRegisterChip` (`src/lib/asset-register-chips.ts:4`) has the fields of `FilterChipItem`; `FilterChipList` keeps the `mobileOnly` rules (scope chips hidden from md, the whole group hidden when every chip is `mobileOnly`) and renders nothing without chips.
- **The name each chip reads stays** "ล้างตัวกรองนี้: บริษัท: GRL" (`` `${removeLabel}: ${chip.label}` ``).
- `data-asset-active-filters` goes (no code or test reads it); the `Link`, `X` and `cn` imports go.
- **§7.17 `:79-82`:** the chip strings now live in `c/ui/filter-chips.tsx` (36px from md, not 32), so the test reads them there and checks the props the wrapper passes; `:78` (no `"use client"`) still reads the wrapper.
- **Controller ruling (f):** joins `MIGRATED_LIST_FILES` (no guard row).

What users will see:
- From 768px the chips are 36px (were 32) with 8px corners (were round), 13px text, and the × sits in a 24px box that fills on hover. "ล้างตัวกรองทั้งหมด" is a text link that underlines on hover. The focus ring has a gap around the chip.
- Phones: 44px chips as before; scope chips still show only on phones.

Not in this task: `src/lib/asset-register-chips.ts` and the page (unchanged) · `c/ui/filter-chips.tsx` (2B-1) · docs (Task 16). Do not run a formatter.

**Files:**
- Modify: `src/components/assets/asset-register-filter-chips.tsx` (`i/lf w/crlf`; the whole file, 47 → 24 lines)
- Modify: `tests/asset-register-filter-ui.test.ts` (`i/lf w/crlf`, read with `\r` stripped; 1 exact replacement)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)

**Must keep passing without edits:** `tests/asset-register-filter-ui.test.ts:13-24`, `:26-34` · `tests/list-primitives-ui.test.ts:207-223` (`FilterChipList`) · `tests/list-filters-ui.test.ts`.

**Interfaces:**
- Consumes:
  - 2B-1: `FilterChipList({ chips: readonly FilterChipItem[]; label: string; removeLabel: string; clearAll?: { href: string; label: string }; className?: string })` and `type FilterChipItem = { key: string; label: string; href: string; mobileOnly?: boolean }` from `@/components/ui/filter-chips` (server-safe).
  - Task 0 helpers.
- Produces:
  - `AssetRegisterFilterChips({ chips, clearAllHref, labels }: { chips: AssetRegisterChip[]; clearAllHref: string; labels: { activeFilters: string; remove: string; clearAll: string } })` unchanged (Task 13's page renders it as today).
  - LFG: the file in `MIGRATED_LIST_FILES`.

| guard | `c/assets/asset-register-filter-chips.tsx` before → after |
|---|---|
| LFG | no row → joins `MIGRATED_LIST_FILES` · no total moves |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`
Expected: nothing.

Run: `git diff --quiet 886a290 -- src/components/assets/asset-register-filter-chips.tsx src/components/ui/filter-chips.tsx src/lib/asset-register-chips.ts && echo BASE-OK`
Expected: `BASE-OK`.

Run: `git log --oneline -1 -- src/components/assets/asset-register-status-tabs.tsx`
Expected: the Task 8 commit.

Run: `git grep -cF 'test("filter chips keep 44px phone targets' -- tests/asset-register-filter-ui.test.ts`
Expected: `tests/asset-register-filter-ui.test.ts:1`.

Run: `node <temp>/p2b1-precheck.mjs --file c/assets/asset-register-filter-chips.tsx`
Expected (exit 0): `file    src/components/assets/asset-register-filter-chips.tsx (CRLF) · not in MIGRATED_LIST_FILES` and `args    (no row holds this file)`.

Run: `git ls-files --eol src/components/assets/asset-register-filter-chips.tsx tests/asset-register-filter-ui.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf    w/crlf` for all three.

- [ ] **Step 2: Write the failing test** (`tests/asset-register-filter-ui.test.ts`)

Replace the chip test `:75-83`:

```ts
test("filter chips keep 44px phone targets and hide scope chips on desktop", () => {
  const source = chips()

  assert.doesNotMatch(source, /"use client"/)
  assert.match(source, /min-h-11[^"]*md:min-h-8/)
  assert.match(source, /chip\.mobileOnly && "md:hidden"/)
  assert.match(source, /href=\{clearAllHref\}/)
  assert.match(source, /aria-label=\{`\$\{labels\.remove\}: \$\{chip\.label\}`\}/)
})
```

with:

```ts
test("filter chips keep 44px phone targets and hide scope chips on desktop", () => {
  const source = chips()
  // FilterChipList (2B-1, I7) draws the chips: 44px on phones and 36px from md, scope chips hidden from md, and each
  // chip named "<remove label>: <chip>", the same name as before because the page still passes clearDrilldownFilter.
  const list = read("src/components/ui/filter-chips.tsx")

  assert.doesNotMatch(source, /"use client"/)
  assert.match(source, /<FilterChipList\b/)
  assert.match(source, /label=\{labels\.activeFilters\}/)
  assert.match(source, /removeLabel=\{labels\.remove\}/)
  assert.match(source, /clearAll=\{\{ href: clearAllHref, label: labels\.clearAll \}\}/)
  assert.match(source, /className="mb-3"/)
  assert.doesNotMatch(source, /<Link\b|rounded-full/)
  assert.match(list, /min-h-11[^"]*md:h-9 md:min-h-0/)
  assert.match(list, /chip\.mobileOnly && "md:hidden"/)
  assert.match(list, /href=\{clearAll\.href\}/)
  assert.match(list, /aria-label=\{`\$\{removeLabel\}: \$\{chip\.label\}`\}/)
})
```

Run: `node --test tests/asset-register-filter-ui.test.ts`
Expected: FAIL, `fail 1` (`tests 11 · pass 10` on `886a290` with Tasks 4–9 only): `filter chips keep 44px phone targets and hide scope chips on desktop` with no match for `/<FilterChipList\b/`.

- [ ] **Step 3: Replace the component (`src/components/assets/asset-register-filter-chips.tsx`, CRLF)**

The whole file changes. Old text at `886a290` (all 47 lines):

```tsx
import Link from "next/link"
import { X } from "lucide-react"
import type { AssetRegisterChip } from "@/lib/asset-register-chips"
import { cn } from "@/lib/utils"

export function AssetRegisterFilterChips({
  chips,
  clearAllHref,
  labels,
}: {
  chips: AssetRegisterChip[]
  clearAllHref: string
  labels: { activeFilters: string; remove: string; clearAll: string }
}) {
  if (chips.length === 0) return null
  const onlyMobileChips = chips.every((chip) => chip.mobileOnly)

  return (
    <div
      role="group"
      aria-label={labels.activeFilters}
      data-asset-active-filters
      className={cn("mb-3 flex flex-wrap items-center gap-2", onlyMobileChips && "md:hidden")}
    >
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          aria-label={`${labels.remove}: ${chip.label}`}
          className={cn(
            "inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border border-primary-border bg-primary-soft px-3 text-sm font-medium text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-8",
            chip.mobileOnly && "md:hidden",
          )}
        >
          <span className="truncate">{chip.label}</span>
          <X className="size-3.5 shrink-0" aria-hidden="true" />
        </Link>
      ))}
      <Link
        href={clearAllHref}
        className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-8"
      >
        {labels.clearAll}
      </Link>
    </div>
  )
}
```

New text (24 lines):

```tsx
import { FilterChipList } from "@/components/ui/filter-chips"
import type { AssetRegisterChip } from "@/lib/asset-register-chips"

// A server wrapper of FilterChipList (spec 2B §7.5, I7). AssetRegisterChip has the fields of FilterChipItem, and
// FilterChipList hides scope chips from md (mobileOnly) and the whole group when every chip is mobileOnly.
export function AssetRegisterFilterChips({
  chips,
  clearAllHref,
  labels,
}: {
  chips: AssetRegisterChip[]
  clearAllHref: string
  labels: { activeFilters: string; remove: string; clearAll: string }
}) {
  return (
    <FilterChipList
      chips={chips}
      label={labels.activeFilters}
      removeLabel={labels.remove}
      clearAll={{ href: clearAllHref, label: labels.clearAll }}
      className="mb-3"
    />
  )
}
```

Keep the file CRLF (the one-liner of Task 8 Step 4, with this path).

- [ ] **Step 4: Mark the file migrated (LFG)**

Run: `node <temp>/p2b-budget.mjs c/assets/asset-register-filter-chips.tsx --migrated`
Expected (exit 0): `MIGRATED_LIST_FILES: added` and `written: src/components/assets/asset-register-filter-chips.tsx`.

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/asset-register-filter-ui.test.ts tests/list-frame-guards.test.ts tests/list-primitives-ui.test.ts tests/list-filters-ui.test.ts`
Expected: PASS, `fail 0` (`tests 55 · pass 55` on `886a290` with Tasks 4–9 only: asset-register-filter-ui 11, list-frame-guards 21, list-primitives-ui 18, list-filters-ui 5).

Run: `node <temp>/p2b1-precheck.mjs --file c/assets/asset-register-filter-chips.tsx`
Expected: `· in MIGRATED_LIST_FILES` and `args    (no row holds this file)`; exit 0.

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected: exit 0, `budgets hold: no live count is over its row`; `LF1 … 1 in 1 rows` and `LN1 … 5 in 4 rows` as after Tasks 7–8.

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b3-tw-probe.mjs src/components/assets/asset-register-filter-chips.tsx`
Expected: `checked 1 classes, missing 0` (`mb-3`).

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `fail 0`, as many tests as after Task 8 (one test rewritten): `tests 1937 · pass 1936 · fail 0 · skipped 1`.
- `npx tsc --noEmit`: no errors (`AssetRegisterChip[]` fits `readonly FilterChipItem[]`).
- `npm run lint`: 0 errors and the 146 warnings under `.agents/`; `npx eslint src/components/assets/asset-register-filter-chips.tsx tests/asset-register-filter-ui.test.ts tests/list-frame-guards.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 3 files: `src/components/assets/asset-register-filter-chips.tsx` 10 insertions and 33 deletions, `tests/asset-register-filter-ui.test.ts` 13 insertions and 4 deletions, `tests/list-frame-guards.test.ts` 1 insertion. The line-ending check prints `24 24` for the component.

- [ ] **Step 8: Commit**

```bash
git add src/components/assets/asset-register-filter-chips.tsx tests/asset-register-filter-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): register filter chips on FilterChipList (2B-3 task 9)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 15, spec §8.7 rows `/th/assets`):** open `/th/assets?companyId=<id>&dataQuality=photo` at 1440: the company chip is hidden (the select shows it), the data-quality chip is 36px with 8px corners; click its ×-area and only that filter goes; "ล้างตัวกรองทั้งหมด" clears every filter; at 375 the company chip shows too, 44px. Tab reaches each chip and the clear-all link with a ring that has a gap. NVDA reads "ล้างตัวกรองนี้: …" on each chip and the group name "ตัวกรองที่ใช้อยู่". With only scope filters on, no chip group shows from 768.

---

### Task 10: `c/assets/asset-register-sort-menu.tsx` · the sort trigger on `Button` (ghost below md, the outline look from md, I26)

Spec §8.7 row 9, §7.8.6 row "ปุ่มเรียง", §7.13, §7.14 risk 6, §7.17 (`tests/asset-register-table-ui.test.ts:56` and N5), §10.2 I26, §10.4 table A row 2B-3 and controller rulings (e) and (f). One file, one commit. The file is CRLF: exact-string replacements only, no formatter. This task also saves the precheck script that Tasks 11–14 reuse.

Rulings this task applies:
- **I26, §7.8.6:** the hand-written `<button>` becomes `<Button variant="ghost" size="md">` with `md:` classes that give it the outline look from md. Below md the summary bar is 44px tall (`py-0`, `tests/asset-register-table-ui.test.ts:194`), and a frame would touch its top and bottom lines; from md the button sits beside the outline "คอลัมน์" and "ส่งออก" buttons of Tasks 11–12. The `aria-label` ("เรียง: <current>"), the `ArrowUpDown` icon (still muted; its 16px now comes from `Button`), the `hidden md:inline` prefix "เรียง:" and the current label stay. The menu content does not change.
- **Departure from §7.8.6 (two more `md:` classes):** the spec lists `md:border-control-border md:bg-surface md:text-foreground md:hover:border-input md:hover:bg-background`. Compiled with the repo's Tailwind 4.2.4, every `md:` rule comes after the ghost `active:bg-muted` (Step 6 prints the order), so `md:bg-surface` beats the press fill from md and a mouse press shows the hover fill, not outline's pressed fill. This task adds `md:active:border-input md:active:bg-muted`: the class string is then exactly the outline variant's colors behind `md:`, which is what §7.8.6 asks ("จอใหญ่หน้าตาเท่า `outline`"). twMerge keeps the ghost classes and the `md:` classes side by side (different modifiers). Cost if wrong: one class string.
- **Sizes:** `size="md"` is 44px below md (`min-h-11`, as before) and 36px from md (`md:h-9`, as before); the side padding is 14px at every width (was 8px below md and 12px from md). Focus shows `Button`'s ring with its 2px offset.
- **LFG, ruling (f):** the file holds no guard row before or after. 2B does not touch it again, so it joins `MIGRATED_LIST_FILES`; L0 then holds every counter of it at its `KEEP` (0).
- **Tests (§10.4 table A, §7.17, N5):** `tests/asset-register-table-ui.test.ts:56` (`/min-h-11/`) becomes the spec regex, the exact class string, the `aria-label` and the prefix, and the file may no longer hold `<button` (N5 for this menu). That test file strips `\r` before matching, so its regexes may hold `\n`.

What users will see on `/th/assets`:
- Phones: the sort button in the summary bar still has no frame; its words are now the faint ghost grey instead of black, and it is a little wider (14px padding).
- From 768px: the same 36px framed button as "คอลัมน์" and "ส่งออก": the darker control border, a light grey hover fill (was the accent fill) and the standard focus ring with a 2px gap.

Not in this task: the summary bar and the "เลือก/เสร็จ" button (Task 3) · the radio items (unchanged) · docs (Task 16). Do not run a formatter.

**Files:**
- Modify: `src/components/assets/asset-register-sort-menu.tsx` (`i/lf w/crlf`; 2 exact replacements)
- Modify: `tests/asset-register-table-ui.test.ts` (`i/lf w/crlf`; 1 exact replacement)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only, never committed: `p2b3-t10-precheck.mjs` (Tasks 11–14 reuse it)

**Must keep passing without edits:**
- `tests/asset-register-table-ui.test.ts:54-55` (the radio group and `navigate`, in the same test as the replaced line), `:82` (`<AssetRegisterSortMenu />` in the summary bar), `:194` (the summary bar adds no vertical padding on phones)
- `tests/asset-register-view-model.test.ts` (`assetRegisterSortOptions`, `getActiveSortKey`) · `tests/menu-primitives-ui.test.ts` · `tests/dropdown-menus-ui.test.ts` (as Task 2 left it) · `tests/design-system.test.ts` (the ghost and outline strings) · `tests/form-migration-guards.test.ts` · `tests/visual-foundation-guards.test.ts`

**Interfaces:**
- Consumes:
  - 2A: `Button({ variant?: "default" | "outline" | "ghost" | "danger" | "destructive" | "warning", size?: "sm" | "md" | "lg" | "default" | "icon-sm" | "icon", busy?, asChild?, …<button> props })` from `@/components/ui/button` (no client directive and no hooks; it spreads the props and the `ref` that Radix `DropdownMenuTrigger asChild` passes, React 19 ref-as-prop, as `c/assets/asset-detail-action-menu.tsx:55` already does). `buttonVariants` ghost = `border-transparent bg-transparent text-muted-foreground hover:bg-background hover:text-foreground active:bg-muted`, outline = `border-control-border bg-surface text-foreground hover:border-input hover:bg-background active:border-input active:bg-muted`, md = `min-h-11 px-3.5 text-sm md:h-9 md:min-h-0 rounded-md`; an `svg` without a `size-` class gets `size-4`.
  - Task 0: `<temp>/p2b1-precheck.mjs`, `<temp>/p2b-budget.mjs`. Task 1: `<temp>/p2b3-tw-probe.mjs <file> …` (prints `checked N classes, missing M`).
- Produces:
  - `AssetRegisterSortMenu()` with the same API (no props; `asset-register-table.tsx` renders `<AssetRegisterSortMenu />`).
  - `<temp>/p2b3-t10-precheck.mjs <10|11|12|13|14>` (Tasks 11–14 run it in their Step 1).
  - LFG: the file in `MIGRATED_LIST_FILES`.

| guard | `c/assets/asset-register-sort-menu.tsx` before → after |
|---|---|
| LFG, VFG | no row before or after · joins `MIGRATED_LIST_FILES` |
| FMG (not edited) | not a 2C file, no row |

- [ ] **Step 1: Check what this task builds on (and save the precheck script)**

Save this script in your temp folder (never in the repo). Tasks 11–14 reuse it.

`p2b3-t10-precheck.mjs`:

```js
// p2b3-t10-precheck.mjs: run from the repo root before Task 10, 11, 12, 13 or 14 of plan 2B-3.
// Usage: node p2b3-t10-precheck.mjs <10|11|12|13|14>. Reads only; writes nothing. Never commit this file.
// Confirms the shared parts these five tasks use and the keys they read, that the earlier tasks of the group are in
// and this task's change is not, that the source file this task edits still holds its 886a290 text (a hash of its text
// with \r stripped; no other task of the plan edits these five files), and that the test text this task replaces or
// appends after is there exactly once (Tasks 2-9 edit the same test files elsewhere).
import { createHash } from "node:crypto"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const task = Number(process.argv[2])
if (![10, 11, 12, 13, 14].includes(task)) {
  console.error("usage: node p2b3-t10-precheck.mjs <10|11|12|13|14>")
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
const occurrences = (path, text) => read(path).split(text).length - 1
const sourceFiles = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name)
  return statSync(path).isDirectory() ? sourceFiles(path) : /\.(?:ts|tsx)$/.test(name) ? [path.replace(/\\/g, "/")] : []
})
const exports = (path, names) => names.every((name) => new RegExp(`export (?:function|const|type) ${name}\\b`).test(read(path)))
const messages = (locale) => JSON.parse(read(`messages/${locale}.json`))
const lfg = read("tests/list-frame-guards.test.ts")
const migratedBlock = lfg.match(/const MIGRATED_LIST_FILES: string\[\] = \[([\s\S]*?)\n\]/)?.[1] ?? ""
const migrated = (path) => migratedBlock.includes(`\`${path.replace(D, "${D}").replace(C, "${C}")}\``)

const SORT = `${C}assets/asset-register-sort-menu.tsx`
const PICKER = `${C}assets/asset-register-column-picker.tsx`
const EXPORT = `${C}assets/asset-register-export-menu.tsx`
const REGISTER = `${D}assets/page.tsx`
const IMPORT_EXPORT = `${D}asset-management/import-export/page.tsx`
const TABLE_TEST = "tests/asset-register-table-ui.test.ts"
const FILTER_TEST = "tests/asset-register-filter-ui.test.ts"
const UX_TEST = "tests/asset-register-ux.test.ts"

// The source file each task edits, with its CR-stripped text hash at 886a290.
const UNCHANGED = {
  10: { [SORT]: "d74957728a50ff62" },
  11: { [PICKER]: "d4ed9a88f9922f45" },
  12: { [EXPORT]: "e40f82dc9d87e40f" },
  13: { [REGISTER]: "c8f6a53168df5604" },
  14: { [IMPORT_EXPORT]: "c28bad3fc29b1613" },
}
// The test text each task replaces (Tasks 10 and 13) or relies on for its appended block (Tasks 11, 12 and 14).
const ANCHORS = {
  10: { [TABLE_TEST]: [String.raw`  assert.match(source, /navigate\(\{ sort: option\.sort, direction: option\.direction \}\)/)`, String.raw`  assert.match(source, /min-h-11/)`, ""].join("\n") },
  11: { [TABLE_TEST]: 'const columnPicker = () => read("src/components/assets/asset-register-column-picker.tsx")\n' },
  12: { [TABLE_TEST]: 'const exportMenu = () => read("src/components/assets/asset-register-export-menu.tsx")\n' },
  13: { [FILTER_TEST]: ['test("the asset register page uses the compact mobile header", () => {', String.raw`  assert.match(page(), /<MasterDataHeader\s+compactOnMobile/)`, ""].join("\n") },
  14: { [UX_TEST]: 'const importExportPageSource = () =>\n  readFileSync("src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx", "utf8")\n' },
}
// What each task leaves behind, so the next task can see it is in (and a task can see it has not run yet).
const DONE = {
  10: () => read(SORT).includes('variant="ghost"') && migrated(SORT),
  11: () => read(PICKER).includes('<Button variant="outline" size="md">') && migrated(PICKER),
  12: () => read(EXPORT).includes('<Button variant="outline" size="md">') && migrated(EXPORT),
  13: () => read(REGISTER).includes("<PageHeader") && migrated(REGISTER),
  14: () => read(IMPORT_EXPORT).includes("<PageHeader") && migrated(IMPORT_EXPORT),
}
const variants = read(`${C}ui/button-variants.ts`)
const header = read(`${C}ui/page-header.tsx`)
const KEYS = {
  asset: ["sortMenu", "columns", "exportMenu", "title", "subtitle", "importHistorySourceFile", "importHistoryImported", "importHistorySkipped", "importHistoryApprovedBy"],
  common: ["create", "back"],
  assetTools: ["importExportTitle", "importExportSubtitle"],
}

const checks = {
  "2A: Button with the ghost and outline variants and size md": /^export \{ Button, buttonVariants \}$/m.test(read(`${C}ui/button.tsx`))
    && variants.includes('ghost: "border-transparent bg-transparent text-muted-foreground hover:bg-background hover:text-foreground active:bg-muted"')
    && variants.includes('outline: "border-control-border bg-surface text-foreground hover:border-input hover:bg-background active:border-input active:bg-muted"')
    && variants.includes('const sizeMd = "min-h-11 px-3.5 text-sm md:h-9 md:min-h-0 rounded-md"') && variants.includes("[&_svg:not([class*='size-'])]:size-4"),
  "2B-1: PageHeader with title, meta, actions, compactOnMobile and className": exports(`${C}ui/page-header.tsx`, ["PageHeader"])
    && ["title: ReactNode", "meta?: ReactNode", "actions?: ReactNode", "compactOnMobile?: boolean", "className?: string"].every((prop) => header.includes(prop)),
  "2B-1: KeyValueList with items": exports(`${C}ui/key-value-list.tsx`, ["KeyValueList", "KeyValueItem"]) && read(`${C}ui/key-value-list.tsx`).includes("{ items, className }: { items: readonly KeyValueItem[]; className?: string }"),
  "2A: formatCount": exports("src/lib/display-format.ts", ["formatCount"]),
  "the keys exist in th and en": ["th", "en"].every((locale) => Object.entries(KEYS).every(([space, keys]) => keys.every((key) => typeof messages(locale)[space]?.[key] === "string"))),
  ...Object.fromEntries([10, 11, 12, 13].filter((number) => number < task).map((number) => [`Task ${number} is in`, DONE[number]()])),
  [`Task ${task} has not run yet`]: !DONE[task](),
  ...Object.fromEntries(Object.entries(UNCHANGED[task]).map(([path, expected]) => [`${path} is unchanged since 886a290 (hash ${expected})`, hash(path) === expected])),
  ...Object.fromEntries(Object.entries(ANCHORS[task]).map(([path, text]) => [`${path} holds the text this task edits next to, once`, occurrences(path, text) === 1])),
  ...(task === 13
    ? { "only the register page still calls MasterDataHeader": sourceFiles("src").filter((path) => path !== `${C}master-data/master-data-layout.tsx` && /\bMasterDataHeader\b/.test(read(path))).join("|") === REGISTER }
    : {}),
}

let missing = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok     " : "MISSING"} ${name}`)
  if (!ok) missing += 1
}
for (const path of [...Object.keys(UNCHANGED[task]), ...Object.keys(ANCHORS[task])]) {
  const changed = UNCHANGED[task][path] && hash(path) !== UNCHANGED[task][path]
  console.log(`info    ${path}: ${eol(path)}${changed ? ` · hash now ${hash(path)}` : ""}`)
}
if (missing > 0) {
  console.error(`ABORT: ${missing} precondition(s) failed. Do not start Task ${task}; report which.`)
  process.exit(1)
}
console.log(`preconditions hold for Task ${task}`)
```

Run: `git status --short src tests messages` then `node <temp>/p2b3-t10-precheck.mjs 10`
Expected: `git status` prints nothing. The script prints (exit 0):
```
ok      2A: Button with the ghost and outline variants and size md
ok      2B-1: PageHeader with title, meta, actions, compactOnMobile and className
ok      2B-1: KeyValueList with items
ok      2A: formatCount
ok      the keys exist in th and en
ok      Task 10 has not run yet
ok      src/components/assets/asset-register-sort-menu.tsx is unchanged since 886a290 (hash d74957728a50ff62)
ok      tests/asset-register-table-ui.test.ts holds the text this task edits next to, once
info    src/components/assets/asset-register-sort-menu.tsx: CRLF
info    tests/asset-register-table-ui.test.ts: CRLF
preconditions hold for Task 10
```
On any `MISSING` line, stop and report it. A `hash now` line means the file changed after `886a290`, so the old snippets below may not match: report it, do not guess.

Run: `node <temp>/p2b1-precheck.mjs --file c/assets/asset-register-sort-menu.tsx`
Expected (after the `info`/`ok` header lines; exit 0):
```
file    src/components/assets/asset-register-sort-menu.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
args    (no row holds this file)
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol src/components/assets/asset-register-sort-menu.tsx tests/asset-register-table-ui.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf w/crlf` for all three. Keep them CRLF.

- [ ] **Step 2: Write the failing test (`tests/asset-register-table-ui.test.ts`, CRLF)**

The pin of §10.4 table A (`:56`). Replace:

```ts
  assert.match(source, /navigate\(\{ sort: option\.sort, direction: option\.direction \}\)/)
  assert.match(source, /min-h-11/)
```

with:

```ts
  assert.match(source, /navigate\(\{ sort: option\.sort, direction: option\.direction \}\)/)
  // Spec 2B §7.8.6, I26: ghost below md (no frame in the 44px summary bar), the outline variant's colors from md.
  assert.match(source, /<Button\b[\s\S]*?variant="ghost"[\s\S]*?size="md"[\s\S]*?md:border-control-border/)
  assert.match(source, /className="md:border-control-border md:bg-surface md:text-foreground md:hover:border-input md:hover:bg-background md:active:border-input md:active:bg-muted"/)
  assert.match(source, /aria-label=\{`\$\{t\("sortMenu"\)\}: \$\{activeLabel\}`\}/)
  assert.match(source, /<span className="hidden text-muted-foreground md:inline">\{t\("sortMenu"\)\}:<\/span>/)
  assert.doesNotMatch(source, /<button\b|min-h-11|hover:bg-accent/, "the trigger is the shared Button, not a hand-written button (N5)")
```

Run: `node --test tests/asset-register-table-ui.test.ts`
Expected: FAIL, `tests 23 · pass 22 · fail 1`, every other test of the file passing:
- `sorting is a radio menu that applies through the shared navigation`: the input did not match the regular expression `/<Button\b[\s\S]*?variant="ghost"[\s\S]*?size="md"[\s\S]*?md:border-control-border/`

- [ ] **Step 3: Add the file to `MIGRATED_LIST_FILES`**

Run: `node <temp>/p2b-budget.mjs c/assets/asset-register-sort-menu.tsx --migrated`
Expected (exit 0):
```
MIGRATED_LIST_FILES: added
written: src/components/assets/asset-register-sort-menu.tsx
```

Run: `node --test tests/list-frame-guards.test.ts`
Expected: PASS, `tests 21 · pass 21 · fail 0`. The file has no counted pattern before or after this task, so L0 holds at once; it keeps the file at 0 from now on.

- [ ] **Step 4: Put the trigger on `Button` (`src/components/assets/asset-register-sort-menu.tsx`, CRLF)**

Two exact replacements, top to bottom.

(1) The import (`:5-6`). Replace:

```tsx
import { useAssetRegisterNavigation } from "@/components/assets/asset-register-navigation"
import {
  DropdownMenu,
```

with:

```tsx
import { useAssetRegisterNavigation } from "@/components/assets/asset-register-navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
```

(2) The trigger (`:32-44`). Replace:

```tsx
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${t("sortMenu")}: ${activeLabel}`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-9 md:min-h-0 md:border md:border-border md:bg-surface md:px-3"
        >
          <ArrowUpDown className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="hidden text-muted-foreground md:inline">{t("sortMenu")}:</span>
          <span>{activeLabel}</span>
        </button>
      </DropdownMenuTrigger>
```

with:

```tsx
  // Ghost below md: the summary bar is 44px tall and a frame would touch its lines. From md the md: classes are the
  // outline variant's colors, so the button matches the column and export buttons beside it (spec 2B §7.8.6, I26).
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="md"
          aria-label={`${t("sortMenu")}: ${activeLabel}`}
          className="md:border-control-border md:bg-surface md:text-foreground md:hover:border-input md:hover:bg-background md:active:border-input md:active:bg-muted"
        >
          <ArrowUpDown className="text-muted-foreground" aria-hidden="true" />
          <span className="hidden text-muted-foreground md:inline">{t("sortMenu")}:</span>
          <span>{activeLabel}</span>
        </Button>
      </DropdownMenuTrigger>
```

`Button` sets `type="button"` itself, so the attribute goes. `font-medium`, `gap-1.5`, the radius, the focus ring and the 16px icon size come from `buttonVariants`.

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/asset-register-table-ui.test.ts tests/asset-register-view-model.test.ts tests/menu-primitives-ui.test.ts tests/dropdown-menus-ui.test.ts tests/design-system.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `fail 0`: `menu-primitives-ui` 10 · `design-system` 13 · `list-frame-guards` 21 · `form-migration-guards` 23; `asset-register-table-ui`, `asset-register-view-model`, `dropdown-menus-ui` and `visual-foundation-guards` pass in full (their counts include what Tasks 1–4 and 8 changed).

Run: `node <temp>/p2b1-precheck.mjs --file c/assets/asset-register-sort-menu.tsx`
Expected: `file    src/components/assets/asset-register-sort-menu.tsx (CRLF) · in MIGRATED_LIST_FILES`, no guard row, `args    (no row holds this file)`; exit 0.

- [ ] **Step 6: Prove every class compiles, and the CSS order the two extra classes rely on**

Run: `node <temp>/p2b3-tw-probe.mjs src/components/assets/asset-register-sort-menu.tsx`
Expected: `checked 10 classes, missing 0` (exit 0). Six of the seven `md:` classes are new to `src` (`md:bg-surface` was in the old trigger and the old toolbar); the probe proves they compile.

Run (from the repo root; it reads `globals.css` and prints the order of four rules in the compiled utilities):
```bash
node -e 'const r = require("module").createRequire(process.cwd() + "/package.json"); (async () => { const c = await r("@tailwindcss/node").compile(require("fs").readFileSync("src/app/globals.css", "utf8"), { base: process.cwd(), onDependency() {} }); const k = ["md:active:bg-muted", "md:hover:bg-background", "md:bg-surface", "active:bg-muted"]; const css = c.build(k); const u = css.slice(css.indexOf("@layer utilities")); console.log(k.map((n) => [n, u.indexOf("." + n.replace(/[^a-zA-Z0-9_-]/g, (ch) => "\\" + ch))]).sort((a, b) => a[1] - b[1]).map(([n]) => n).join(" < ")) })()'
```
Expected: `active:bg-muted < md:bg-surface < md:hover:bg-background < md:active:bg-muted`. The ghost press fill loses to `md:bg-surface` from md, and `md:active:bg-muted` wins over the hover fill while pressed: the outline behavior.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `fail 0`, the same number of tests as before this task (the task changes assertions inside an existing test): `tests 1937 · pass 1936 · fail 0 · skipped 1`.
- `npx tsc --noEmit`: no errors (`Button` takes the `ref` and the trigger props of `DropdownMenuTrigger asChild`).
- `npm run lint`: 0 errors, no new warning; `npx eslint src/components/assets/asset-register-sort-menu.tsx tests/asset-register-table-ui.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 3 files: the sort menu 9 insertions and 5 deletions, `tests/asset-register-table-ui.test.ts` 6 and 1, `tests/list-frame-guards.test.ts` 1 insertion (the `MIGRATED_LIST_FILES` line). Both commands list only those three paths.

- [ ] **Step 8: Commit**

```bash
git add src/components/assets/asset-register-sort-menu.tsx tests/asset-register-table-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): register sort trigger on Button, ghost below md and outline from md (2B-3 task 10)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 15, spec §8.7 rows `/th/assets`):**
- 375 and 390: the sort button sits in the 44px summary bar with no frame and does not touch its lines; it, "เลือก" and the range text fit one row; the menu opens, the current sort is checked, a choice re-sorts the list and the label follows
- 768, 1024 and 1440: the sort button is 36px with the same border as "คอลัมน์" and "ส่งออก"; hover is a light grey fill with the darker border; a press shows the muted fill; Tab reaches it and shows the ring with its gap; Enter opens the menu and Esc closes it with focus back on the button
- forced colors: the frame shows from md

---

### Task 11: `c/assets/asset-register-column-picker.tsx` · the column trigger on `Button` (outline md)

Spec §8.7 row 9, §7.8.6 row "ปุ่มคอลัมน์ · ส่งออก", §7.17 N5 and controller rulings (e) and (f). One file, one commit. The file is CRLF: exact-string replacements only.

Rulings this task applies:
- **§7.8.6:** the hand-written `<button>` becomes `<Button variant="outline" size="md">`: 36px from md, the size it had (`h-9`). The table renders the picker only from md (`<div className="hidden items-center gap-2 md:flex">`, pinned by `tests/asset-register-table-ui.test.ts:83` and `tests/asset-register-ux.test.ts:123`), so its 44px phone height never shows. The `Columns3` icon loses its `size-4` (`Button` sizes an icon that has none). The presets, the checkbox items, the "at least one column" rule and the open-while-toggling `onSelect` stay.
- **LFG, ruling (f):** no row; the file joins `MIGRATED_LIST_FILES`.
- **Tests (N5):** one test appended to `tests/asset-register-table-ui.test.ts` (the file strips `\r`).

What users will see from 768px on `/th/assets`: "คอลัมน์" is the standard outline button: the same height, the darker control border, 14px side padding (was 12px), a light grey hover fill (was the accent fill) and the focus ring with a 2px gap.

Not in this task: the summary bar (Task 3) · the menu content · docs (Task 16).

**Files:**
- Modify: `src/components/assets/asset-register-column-picker.tsx` (`i/lf w/crlf`; 2 exact replacements)
- Modify: `tests/asset-register-table-ui.test.ts` (`i/lf w/crlf`; one block appended with `p2b3-append.mjs`)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only: `t11-table-block.ts`

**Must keep passing without edits:**
- `tests/asset-register-table-ui.test.ts:62-68` (the presets, `<DropdownMenuCheckboxItem`, `disabled={checked && visibleColumns.size === 1}`, `onSelect={(event) => event.preventDefault()}`), `:83` · `tests/asset-register-ux.test.ts:42-50` (`columnPresetOperations`, `columnPresetAccounting`, `columnPresetAudit`), `:123`
- `tests/menu-primitives-ui.test.ts` · `tests/list-frame-guards.test.ts` (every other row) · `tests/form-migration-guards.test.ts`

**Interfaces:**
- Consumes: 2A `Button` as in Task 10 (outline, md); Task 10's `<temp>/p2b3-t10-precheck.mjs`; Task 1's `<temp>/p2b3-append.mjs <block file> <test file>` (keeps the test file's CRLF) and `<temp>/p2b3-tw-probe.mjs`; Task 0's guard scripts.
- Produces: `AssetRegisterColumnPicker({ visibleColumns, onToggleColumn, onApplyPreset })` with the same API; the file in `MIGRATED_LIST_FILES`; the test `the column picker opens from the shared outline Button (spec 2B §7.8.6)`.

| guard | `c/assets/asset-register-column-picker.tsx` before → after |
|---|---|
| LFG, VFG | no row before or after · joins `MIGRATED_LIST_FILES` |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b3-t10-precheck.mjs 11`
Expected: `git status` prints nothing. The script prints (exit 0):
```
ok      2A: Button with the ghost and outline variants and size md
ok      2B-1: PageHeader with title, meta, actions, compactOnMobile and className
ok      2B-1: KeyValueList with items
ok      2A: formatCount
ok      the keys exist in th and en
ok      Task 10 is in
ok      Task 11 has not run yet
ok      src/components/assets/asset-register-column-picker.tsx is unchanged since 886a290 (hash d4ed9a88f9922f45)
ok      tests/asset-register-table-ui.test.ts holds the text this task edits next to, once
info    src/components/assets/asset-register-column-picker.tsx: CRLF
info    tests/asset-register-table-ui.test.ts: CRLF
preconditions hold for Task 11
```

Run: `node <temp>/p2b1-precheck.mjs --file c/assets/asset-register-column-picker.tsx`
Expected (after the header lines; exit 0):
```
file    src/components/assets/asset-register-column-picker.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
args    (no row holds this file)
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol src/components/assets/asset-register-column-picker.tsx tests/asset-register-table-ui.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf w/crlf` for all three.

- [ ] **Step 2: Write the failing test**

Save this block as `<temp>/t11-table-block.ts`:

```ts
// Plan 2B-3 Task 11 (spec 2B §7.8.6, N5): the column picker opens from the shared outline Button, 36px from md. The
// table shows it from md only, so its 44px phone height never shows.
test("the column picker opens from the shared outline Button (spec 2B §7.8.6)", () => {
  const source = columnPicker()

  assert.match(source, /^import \{ Button \} from "@\/components\/ui\/button"$/m)
  assert.match(source, /<DropdownMenuTrigger asChild>\n\s+<Button variant="outline" size="md">\n\s+<Columns3 aria-hidden="true" \/>\n\s+\{t\("columns"\)\}\n\s+<\/Button>\n\s+<\/DropdownMenuTrigger>/)
  assert.doesNotMatch(source, /<button\b|hover:bg-accent|focus-visible:ring/, "no hand-written trigger (N5)")
})
```

Run: `node <temp>/p2b3-append.mjs <temp>/t11-table-block.ts tests/asset-register-table-ui.test.ts`
Expected: `appended <temp>/t11-table-block.ts to tests/asset-register-table-ui.test.ts (CRLF)`

Run: `node --test tests/asset-register-table-ui.test.ts`
Expected: FAIL, `tests 24 · pass 23 · fail 1` (one test more than before this step, every other test passing):
- `the column picker opens from the shared outline Button (spec 2B §7.8.6)`: the input did not match the regular expression `/^import \{ Button \} from "@\/components\/ui\/button"$/m`

- [ ] **Step 3: Add the file to `MIGRATED_LIST_FILES`**

Run: `node <temp>/p2b-budget.mjs c/assets/asset-register-column-picker.tsx --migrated`
Expected (exit 0):
```
MIGRATED_LIST_FILES: added
written: src/components/assets/asset-register-column-picker.tsx
```

- [ ] **Step 4: Put the trigger on `Button` (`src/components/assets/asset-register-column-picker.tsx`, CRLF)**

(1) The import (`:4-7`). Replace:

```tsx
import { useTranslations } from "next-intl"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
```

with:

```tsx
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
```

(2) The trigger (`:57-65`). Replace:

```tsx
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Columns3 className="size-4" aria-hidden="true" />
          {t("columns")}
        </button>
      </DropdownMenuTrigger>
```

with:

```tsx
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="md">
          <Columns3 aria-hidden="true" />
          {t("columns")}
        </Button>
      </DropdownMenuTrigger>
```

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/asset-register-table-ui.test.ts tests/asset-register-ux.test.ts tests/menu-primitives-ui.test.ts tests/list-frame-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `fail 0`: `menu-primitives-ui` 10 · `list-frame-guards` 21 · `form-migration-guards` 23; `asset-register-table-ui` and `asset-register-ux` pass in full.

Run: `node <temp>/p2b1-precheck.mjs --file c/assets/asset-register-column-picker.tsx`
Expected: `· in MIGRATED_LIST_FILES` on the `file` line, no guard row, `args    (no row holds this file)`; exit 0.

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b3-tw-probe.mjs src/components/assets/asset-register-column-picker.tsx`
Expected: `checked 0 classes, missing 0` (exit 0). After this task the file has no class string of its own.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `fail 0`, one test more than before this task: `tests 1938 · pass 1937 · fail 0 · skipped 1`.
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, no new warning; `npx eslint src/components/assets/asset-register-column-picker.tsx tests/asset-register-table-ui.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 3 files: the column picker 4 insertions and 6 deletions, `tests/asset-register-table-ui.test.ts` 10 insertions (the block and its blank line), `tests/list-frame-guards.test.ts` 1 insertion.

- [ ] **Step 8: Commit**

```bash
git add src/components/assets/asset-register-column-picker.tsx tests/asset-register-table-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): register column picker trigger on the outline Button (2B-3 task 11)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 15):** at 768, 1024 and 1440: "คอลัมน์" is 36px and lines up with the sort and export buttons; the menu keeps its presets and checkboxes, stays open while you toggle, never lets the last column go; Tab and Enter open it, Esc returns focus to it. At 375 it does not show (as before).

---

### Task 12: `c/assets/asset-register-export-menu.tsx` · the export trigger on `Button` (outline md)

Spec §8.7 row 9, §7.8.6 row "ปุ่มคอลัมน์ · ส่งออก", §7.17 N5 and controller rulings (e) and (f). One file, one commit. The file is CRLF: exact-string replacements only.

Rulings this task applies:
- **§7.8.6:** the trigger becomes `<Button variant="outline" size="md">`, as in Task 11 (the export menu shows from md only, beside the column picker). The `Download` icon loses its `size-4`. The two menu items stay plain download links (`<a href={exportHref}>`, `<a href={templateHref}>`, pinned by `tests/asset-register-table-ui.test.ts:74-75`).
- **LFG, ruling (f):** no row; the file joins `MIGRATED_LIST_FILES`.
- **Tests (N5):** one test appended to `tests/asset-register-table-ui.test.ts`.

What users will see from 768px on `/th/assets`: "ส่งออก" is the standard outline button, like "คอลัมน์" after Task 11.

Not in this task: the export routes and the import template (unchanged) · docs (Task 16).

**Files:**
- Modify: `src/components/assets/asset-register-export-menu.tsx` (`i/lf w/crlf`; 2 exact replacements)
- Modify: `tests/asset-register-table-ui.test.ts` (`i/lf w/crlf`; one block appended with `p2b3-append.mjs`)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only: `t12-table-block.ts`

**Must keep passing without edits:** `tests/asset-register-table-ui.test.ts:74-75`, `:83` · `tests/menu-primitives-ui.test.ts` · `tests/list-frame-guards.test.ts` (every other row) · `tests/form-migration-guards.test.ts`

**Interfaces:**
- Consumes: as Task 11.
- Produces: `AssetRegisterExportMenu({ exportHref, templateHref })` with the same API; the file in `MIGRATED_LIST_FILES`; the test `the export menu opens from the shared outline Button (spec 2B §7.8.6)`.

| guard | `c/assets/asset-register-export-menu.tsx` before → after |
|---|---|
| LFG, VFG | no row before or after · joins `MIGRATED_LIST_FILES` |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b3-t10-precheck.mjs 12`
Expected: `git status` prints nothing. The script prints (exit 0):
```
ok      2A: Button with the ghost and outline variants and size md
ok      2B-1: PageHeader with title, meta, actions, compactOnMobile and className
ok      2B-1: KeyValueList with items
ok      2A: formatCount
ok      the keys exist in th and en
ok      Task 10 is in
ok      Task 11 is in
ok      Task 12 has not run yet
ok      src/components/assets/asset-register-export-menu.tsx is unchanged since 886a290 (hash e40f82dc9d87e40f)
ok      tests/asset-register-table-ui.test.ts holds the text this task edits next to, once
info    src/components/assets/asset-register-export-menu.tsx: CRLF
info    tests/asset-register-table-ui.test.ts: CRLF
preconditions hold for Task 12
```

Run: `node <temp>/p2b1-precheck.mjs --file c/assets/asset-register-export-menu.tsx`
Expected (after the header lines; exit 0):
```
file    src/components/assets/asset-register-export-menu.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
args    (no row holds this file)
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol src/components/assets/asset-register-export-menu.tsx tests/asset-register-table-ui.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf w/crlf` for all three.

- [ ] **Step 2: Write the failing test**

Save this block as `<temp>/t12-table-block.ts`:

```ts
// Plan 2B-3 Task 12 (spec 2B §7.8.6, N5): the export menu opens from the shared outline Button, 36px from md, beside
// the column picker; its two items stay plain download links.
test("the export menu opens from the shared outline Button (spec 2B §7.8.6)", () => {
  const source = exportMenu()

  assert.match(source, /^import \{ Button \} from "@\/components\/ui\/button"$/m)
  assert.match(source, /<DropdownMenuTrigger asChild>\n\s+<Button variant="outline" size="md">\n\s+<Download aria-hidden="true" \/>\n\s+\{t\("exportMenu"\)\}\n\s+<\/Button>\n\s+<\/DropdownMenuTrigger>/)
  assert.doesNotMatch(source, /<button\b|hover:bg-accent|focus-visible:ring/, "no hand-written trigger (N5)")
})
```

Run: `node <temp>/p2b3-append.mjs <temp>/t12-table-block.ts tests/asset-register-table-ui.test.ts`
Expected: `appended <temp>/t12-table-block.ts to tests/asset-register-table-ui.test.ts (CRLF)`

Run: `node --test tests/asset-register-table-ui.test.ts`
Expected: FAIL, `tests 25 · pass 24 · fail 1` (one test more than before this step):
- `the export menu opens from the shared outline Button (spec 2B §7.8.6)`: the input did not match the regular expression `/^import \{ Button \} from "@\/components\/ui\/button"$/m`

- [ ] **Step 3: Add the file to `MIGRATED_LIST_FILES`**

Run: `node <temp>/p2b-budget.mjs c/assets/asset-register-export-menu.tsx --migrated`
Expected (exit 0):
```
MIGRATED_LIST_FILES: added
written: src/components/assets/asset-register-export-menu.tsx
```

- [ ] **Step 4: Put the trigger on `Button` (`src/components/assets/asset-register-export-menu.tsx`, CRLF)**

(1) The import (`:4-5`). Replace:

```tsx
import { useTranslations } from "next-intl"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
```

with:

```tsx
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
```

(2) The trigger (`:12-20`). Replace:

```tsx
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Download className="size-4" aria-hidden="true" />
          {t("exportMenu")}
        </button>
      </DropdownMenuTrigger>
```

with:

```tsx
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="md">
          <Download aria-hidden="true" />
          {t("exportMenu")}
        </Button>
      </DropdownMenuTrigger>
```

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/asset-register-table-ui.test.ts tests/menu-primitives-ui.test.ts tests/list-frame-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `fail 0`: `menu-primitives-ui` 10 · `list-frame-guards` 21 · `form-migration-guards` 23; `asset-register-table-ui` passes in full.

Run: `node <temp>/p2b1-precheck.mjs --file c/assets/asset-register-export-menu.tsx`
Expected: `· in MIGRATED_LIST_FILES` on the `file` line, no guard row, `args    (no row holds this file)`; exit 0.

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b3-tw-probe.mjs src/components/assets/asset-register-export-menu.tsx`
Expected: `checked 0 classes, missing 0` (exit 0).

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `fail 0`, one test more than before this task: `tests 1939 · pass 1938 · fail 0 · skipped 1`.
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, no new warning; `npx eslint src/components/assets/asset-register-export-menu.tsx tests/asset-register-table-ui.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 3 files: the export menu 4 insertions and 6 deletions, `tests/asset-register-table-ui.test.ts` 10 insertions, `tests/list-frame-guards.test.ts` 1 insertion.

- [ ] **Step 8: Commit**

```bash
git add src/components/assets/asset-register-export-menu.tsx tests/asset-register-table-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): register export menu trigger on the outline Button (2B-3 task 12)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 15):** at 768 and 1440: "ส่งออก" is 36px next to "คอลัมน์"; "ส่งออกตามตัวกรอง" downloads the export of the current filters and "ดาวน์โหลดแม่แบบ" the import template (check that each starts a download; change nothing); keyboard as in Task 11.

---

### Task 13: `D/assets/page.tsx` · the register calls `PageHeader` itself, and the tab counts use `formatCount` (the last caller of `MasterDataHeader`)

Spec §8.7 row 10, §7.4 (rows 1–5; row 6 is Task 3's), §10.2 I2 and I32, §10.4 table A row 2B-3 (`tests/asset-register-filter-ui.test.ts:108`), §7.17 N6 "page", §10.4 table C (LH2 7 → 5) and controller rulings (a), (e) and (f). One file, one commit. The page is CRLF: exact-string replacements only.

Rulings this task applies:
- **I2, §7.4 rows 1–3:** the page calls `PageHeader` itself instead of the thin `MasterDataHeader` wrapper of 2B-1: `compactOnMobile`, `title={t("title")}`, `meta={t("subtitle")}` and the create link in `actions`, a `Link` with `buttonVariants({ size: "md" })` and `<Plus aria-hidden="true" />` (the shape of `D/master-data/branches/page.tsx` after 2B-1; a server page puts `buttonVariants` on `Link`). The HTML is the same as the wrapper's: the wrapper passed the same title, meta, class and link (`c/master-data/master-data-layout.tsx:8-41`). The create link still shows to everyone who may view the register, as before (the `new` page checks `asset:create`); no behavior change in 2B.
- **I32, §7.4 row 4:** the page root stays a bare `<div>`; the 16px (phone) and 24px (md) gap under the header is the `className="mb-4 md:mb-6"` the wrapper set.
- **§7.4 row 5:** the tab counts are `formatCount(tab.count)` (th-TH digits on every machine, the same grouping as en-US); `numberLocale` had no other use and goes. LV1 does not count `toLocaleString(numberLocale)` (it has an argument), so no row moves for it.
- **R-h, LFG LH2:** the import and the call were the two LH2 hits of the page (2 → 0). After this commit `MasterDataHeader` has no caller; plan 2B-5 deletes it with the other helpers of `master-data-layout.tsx` (its LH2 row stays 1 until then).
- **Ruling (f):** 2B does not touch this page again (plans 2B-4 and 2B-5 do not list it), so it joins `MIGRATED_LIST_FILES`; every counter of the page is 0 after this task, the `KEEP` of every guard.
- **Fence (§7.4 "ไม่แตะ", §8.7 row 10, controller):** the queries (`:56-206`), `buildAssetRegisterChips` (`:229-273`), the row model (`:274-323`), the table `labels` (`:371-423`) and the import panel (`:427-471`) stay byte for byte. 2C plan 4 deletes `currentStep: t("importWizardCurrentStep"),` (`:451` at `886a290`), which sits at `:459` after this task; Task 16 writes that line number into DH.
- **Tests:** `tests/asset-register-filter-ui.test.ts:108` (`/<MasterDataHeader\s+compactOnMobile/` → `/<PageHeader\s+compactOnMobile/`, §10.4 table A) and one appended test with N6 "page" (`count: formatCount(tab.count)`, no `toLocaleString(` and no `MasterDataHeader`) plus the exact header. The file strips `\r`, so the appended regex may hold `\n`. It does not pin the import panel's `currentStep` line, which 2C plan 4 deletes.

What users will see on `/th/assets`: nothing new. The header has been `PageHeader` through the wrapper since 2B-1 (title 600, "เพิ่มใหม่" 36px from md and 44px on phones, the subtitle hidden below md); the tab counts read the same digits.

Not in this task: the table's `purchasePriceBaht` header (Task 3 reads it in the table) · the toolbar, tabs and chips (Tasks 5–9) · `c/master-data/master-data-layout.tsx` (2B-5) · docs (Task 16). Do not run a formatter.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/assets/page.tsx` (`i/lf w/crlf`; 5 exact replacements)
- Modify: `tests/asset-register-filter-ui.test.ts` (`i/lf w/crlf`; 1 exact replacement, one block appended with `p2b3-append.mjs`)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only: `t13-filter-block.ts`

**Must keep passing without edits:**
- `tests/asset-register-filter-ui.test.ts:16-23` (the counts, the providers and the four register parts), `:29-33` (the chips), `:109` (the tab row's `mb-2 … md:mb-3`, in the same test as `:108`), `:112-121` (the `PageHeader` strings and the wrapper's `compactOnMobile ? "mb-4 md:mb-6" : "mb-6"`)
- `tests/asset-register-ux.test.ts:113-120` · `tests/asset-status-help-ui.test.ts:37-39` (`statusHelpTitle`, `conditionHelpTitle` labels) · `tests/asset-import-field-labels.test.ts:30-31` (`fields: t.raw("importField")`) · `tests/asset-transaction-cancellation-routes.test.ts:25` · `tests/open-repair-filter.test.ts:8-16` · `tests/performance-route-instrumentation.test.ts:19` (`assets.initial-data`, `assets.model-photos`)
- `tests/list-primitives-ui.test.ts:64-70` (`MasterDataHeader` is still the thin wrapper; it reads the layout file only) · `tests/breadcrumbs-ui.test.ts` (the register has no trail) · `tests/visual-foundation-guards.test.ts` · `tests/form-migration-guards.test.ts`

**Interfaces:**
- Consumes:
  - 2B-1: `PageHeader({ title: ReactNode, meta?: ReactNode, actions?: ReactNode, back?: ReactNode, breadcrumbs?, compactOnMobile?: boolean, className?: string })` from `@/components/ui/page-header` (server-safe, no margin of its own).
  - 2A: `buttonVariants({ variant?, size? })` from `@/components/ui/button-variants`; `formatCount(value: number): string` from `@/lib/display-format`.
  - Task 10's `<temp>/p2b3-t10-precheck.mjs`; Task 1's `<temp>/p2b3-append.mjs`, `<temp>/p2b3-tw-probe.mjs`; Task 0's guard scripts.
  - Task 8: `AssetRegisterStatusTabs({ label, items })` with `items[].count` a string (the type Task 8 keeps; `formatCount` returns a string).
- Produces: the page without `MasterDataHeader` and `numberLocale`; the page in `MIGRATED_LIST_FILES`; LFG `BUDGETS.LH2` without the page's row and without its `// 2B-3` group; the test `the register page header is PageHeader with its create link, and the tab counts use formatCount (spec 2B §7.4)`; the new line number of the import panel's `currentStep` label for DH (Task 16).

| guard | `D/assets/page.tsx` before → after | plan total (budget) before → after |
|---|---|---|
| LFG LH2 | 2 → – | 7 → 5 (4 rows: `master-data-layout.tsx` 1, `my-assets/page.tsx` 1, `reports/page.tsx` 2, `report-header.tsx` 1) |
| `MIGRATED_LIST_FILES` | – → joins | +1 |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b3-t10-precheck.mjs 13`
Expected: `git status` prints nothing. The script prints (exit 0):
```
ok      2A: Button with the ghost and outline variants and size md
ok      2B-1: PageHeader with title, meta, actions, compactOnMobile and className
ok      2B-1: KeyValueList with items
ok      2A: formatCount
ok      the keys exist in th and en
ok      Task 10 is in
ok      Task 11 is in
ok      Task 12 is in
ok      Task 13 has not run yet
ok      src/app/[locale]/(dashboard)/assets/page.tsx is unchanged since 886a290 (hash c8f6a53168df5604)
ok      tests/asset-register-filter-ui.test.ts holds the text this task edits next to, once
ok      only the register page still calls MasterDataHeader
info    src/app/[locale]/(dashboard)/assets/page.tsx: CRLF
info    tests/asset-register-filter-ui.test.ts: CRLF
preconditions hold for Task 13
```

Run: `node <temp>/p2b1-precheck.mjs --file D/assets/page.tsx`
Expected (after the header lines; exit 0):
```
file    src/app/[locale]/(dashboard)/assets/page.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LH2        2       2     0     2
args    LH2=2:2
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol "src/app/[[]locale]/(dashboard)/assets/page.tsx" tests/asset-register-filter-ui.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf w/crlf` for all three.

- [ ] **Step 2: Write the failing tests (`tests/asset-register-filter-ui.test.ts`, CRLF)**

(a) The pin of §10.4 table A (`:108`). Replace:

```ts
test("the asset register page uses the compact mobile header", () => {
  assert.match(page(), /<MasterDataHeader\s+compactOnMobile/)
```

with:

```ts
test("the asset register page uses the compact mobile header", () => {
  assert.match(page(), /<PageHeader\s+compactOnMobile/)
```

(b) Save this block as `<temp>/t13-filter-block.ts`:

```ts
// Plan 2B-3 Task 13 (spec 2B §7.4, I2, I32, N6): the register calls PageHeader itself, keeps the 16/24px gap under it as
// the header's class, and formats the tab counts with formatCount. MasterDataHeader has no caller left (2B-5 deletes it).
test("the register page header is PageHeader with its create link, and the tab counts use formatCount (spec 2B §7.4)", () => {
  const source = page()

  assert.match(source, /^import \{ PageHeader \} from "@\/components\/ui\/page-header"$/m)
  assert.match(source, /<div>\n\s+<PageHeader\n\s+compactOnMobile\n\s+className="mb-4 md:mb-6"\n\s+title=\{t\("title"\)\}\n\s+meta=\{t\("subtitle"\)\}\n\s+actions=\{\n\s+<Link href=\{`\/\$\{locale\}\/assets\/new`\} className=\{buttonVariants\(\{ size: "md" \}\)\}>\n\s+<Plus aria-hidden="true" \/>\n\s+\{tCommon\("create"\)\}\n\s+<\/Link>\n\s+\}\n\s+\/>/)
  assert.match(source, /count: formatCount\(tab\.count\)/)
  assert.doesNotMatch(source, /toLocaleString\(|MasterDataHeader|numberLocale/)
})
```

Run: `node <temp>/p2b3-append.mjs <temp>/t13-filter-block.ts tests/asset-register-filter-ui.test.ts`
Expected: `appended <temp>/t13-filter-block.ts to tests/asset-register-filter-ui.test.ts (CRLF)`

Run: `node --test tests/asset-register-filter-ui.test.ts`
Expected: FAIL, `tests 12 · pass 10 · fail 2` (one test more than before this step, every other test passing):
- `the asset register page uses the compact mobile header`: the input did not match the regular expression `/<PageHeader\s+compactOnMobile/`
- `the register page header is PageHeader with its create link, and the tab counts use formatCount (spec 2B §7.4)`: the input did not match the regular expression `/^import \{ PageHeader \} from "@\/components\/ui\/page-header"$/m`

- [ ] **Step 3: Lower the guard row of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs D/assets/page.tsx LH2=2:0 --migrated`
Expected (exit 0):
```
LH2: 2 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/assets/page.tsx
```

Run: `node --test tests/list-frame-guards.test.ts`
Expected: FAIL, `tests 21 · pass 19 · fail 2`:
- `LH2 MasterDataHeader, ReportHeader and local PageHeader functions give way to PageHeader`: `LH2: 7 in 5 files. Lower a number in the commit that moves a site; never raise one. …` with the one line `src/app/[locale]/(dashboard)/assets/page.tsx: 2 > 0`
- `L0 a file 2B is done with keeps only what KEEP allows, and every row names a real file and a known guard`: the one line `LH2 src/app/[locale]/(dashboard)/assets/page.tsx: 2 > 0`, because the page is now in `MIGRATED_LIST_FILES`

- [ ] **Step 4: Move the header onto `PageHeader` and the counts onto `formatCount` (`src/app/[locale]/(dashboard)/assets/page.tsx`, CRLF)**

Five exact replacements, top to bottom. Make all five before you compile: (1)–(2) import what (4)–(5) use and drop the wrapper's import.

(1) Imports `:1-2`. Replace:

```tsx
import type { Prisma } from "@prisma/client"
import { getTranslations } from "next-intl/server"
```

with:

```tsx
import type { Prisma } from "@prisma/client"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Plus } from "lucide-react"
```

(2) Imports `:20-21`. Replace:

```tsx
import { AssetRegisterViewMemory } from "@/components/assets/asset-register-view-memory"
import { MasterDataHeader } from "@/components/master-data/master-data-layout"
```

with:

```tsx
import { AssetRegisterViewMemory } from "@/components/assets/asset-register-view-memory"
import { buttonVariants } from "@/components/ui/button-variants"
import { PageHeader } from "@/components/ui/page-header"
import { formatCount } from "@/lib/display-format"
```

(3) `numberLocale` (`:209-211`), whose only use was the tab count. Replace:

```tsx
  const toRow = Math.min(total, filters.page * filters.pageSize)
  const numberLocale = locale === "th" ? "th-TH" : "en-US"
  const basePath = `/${locale}/assets`
```

with:

```tsx
  const toRow = Math.min(total, filters.page * filters.pageSize)
  const basePath = `/${locale}/assets`
```

(4) The header (`:325-334`). Replace:

```tsx
  return (
    <div>
      <MasterDataHeader
        compactOnMobile
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={`/${locale}/assets/new`}
        createLabel={tCommon("create")}
      />
      <AssetRegisterViewMemory locale={locale} returnHref={registerReturnHref} />
```

with:

```tsx
  return (
    <div>
      <PageHeader
        compactOnMobile
        className="mb-4 md:mb-6"
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <Link href={`/${locale}/assets/new`} className={buttonVariants({ size: "md" })}>
            <Plus aria-hidden="true" />
            {tCommon("create")}
          </Link>
        }
      />
      <AssetRegisterViewMemory locale={locale} returnHref={registerReturnHref} />
```

(5) The tab count (`:348`). Replace:

```tsx
            count: tab.count.toLocaleString(numberLocale),
```

with:

```tsx
            count: formatCount(tab.count),
```

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/asset-register-filter-ui.test.ts tests/asset-register-ux.test.ts tests/asset-status-help-ui.test.ts tests/asset-import-field-labels.test.ts tests/asset-transaction-cancellation-routes.test.ts tests/open-repair-filter.test.ts tests/performance-route-instrumentation.test.ts tests/list-primitives-ui.test.ts tests/breadcrumbs-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `fail 0`: `asset-import-field-labels` 2 · `asset-transaction-cancellation-routes` 2 · `open-repair-filter` 3 · `performance-route-instrumentation` 1 · `list-primitives-ui` 18 · `breadcrumbs-ui` 4 · `list-frame-guards` 21 · `form-migration-guards` 23; `asset-register-filter-ui`, `asset-register-ux`, `asset-status-help-ui` and `visual-foundation-guards` pass in full (their counts include what Tasks 3, 5, 7, 8 and 9 changed).

Run: `node <temp>/p2b1-precheck.mjs --file D/assets/page.tsx`
Expected (exit 0):
```
file    src/app/[locale]/(dashboard)/assets/page.tsx (CRLF) · in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LH2        0       0     0     2
args    (no row holds this file)
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `grep -n 'currentStep: t("importWizardCurrentStep"),' "src/app/[locale]/(dashboard)/assets/page.tsx"`
Expected: `459:          currentStep: t("importWizardCurrentStep"),` (the line 2C plan 4 deletes; it was `:451`). Record the number for Task 16.

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b3-tw-probe.mjs "src/app/[locale]/(dashboard)/assets/page.tsx"`
Expected: `checked 2 classes, missing 0` (exit 0).

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `fail 0`, one test more than before this task: `tests 1940 · pass 1939 · fail 0 · skipped 1`.
- `npx tsc --noEmit`: no errors (`formatCount` returns the string `items[].count` takes).
- `npm run lint`: 0 errors, no new warning; `npx eslint "src/app/[locale]/(dashboard)/assets/page.tsx" tests/asset-register-filter-ui.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 3 files: the page 15 insertions and 7 deletions, `tests/asset-register-filter-ui.test.ts` 12 and 1, `tests/list-frame-guards.test.ts` 1 and 2 (the `MIGRATED_LIST_FILES` line in; the LH2 row and its `// 2B-3` group line out).

- [ ] **Step 8: Commit**

```bash
git add "src/app/[locale]/(dashboard)/assets/page.tsx" tests/asset-register-filter-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): register page calls PageHeader and formats tab counts with formatCount (2B-3 task 13)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 15):** at 1440, 768 and 375 the header looks as it did after 2B-1 (compare with the before images): title 600; "เพิ่มใหม่" 36px from md, 44px and on the title's row at 375 with the subtitle hidden; 16px to the toolbar on phones and 24px from md. The tab counts show th-TH digits in Thai and in English. Tab order in the header: the title is not focusable, "เพิ่มใหม่" is the first stop. NVDA reads the h1 "ทะเบียนทรัพย์สิน".

---

### Task 14: `D/asset-management/import-export/page.tsx` · the header on `PageHeader` and the import history facts on `KeyValueList`

Spec §8.7 row 11, §7.11 (header and page root), §10.2 I32, §10.4 table C (LH1 25 → 24, LK1 8 → 7), §9.4.1 row `D/asset-management/import-export/page.tsx` (LH1 1, LK1 1, both owned by 2B-3), §7.17 N7 and controller rulings (a), (e) and (f). One file, one commit. The page is CRLF: exact-string replacements only. This task ends with the guard state after plan 2B-3.

Rulings this task applies:
- **§7.11, I32:** the hand-written title block (`:32-35`) becomes `<PageHeader title={tTools("importExportTitle")} meta={tTools("importExportSubtitle")} />`: no actions, no back button (the "กลับ" link at the bottom of the page `:122-126` is not a header back button, so B2 does not cover it). The root keeps `mx-auto max-w-6xl` (the width of the tool pages) and goes from `space-y-5` to `space-y-6` (I32). LH1 1 → 0.
- **Departure from §7.11 (which lists `Info` `:219` under "ไม่แตะ"):** §10.4 table C, which overrides the section files, has LK1 8 → 7 after 2B-3, and §9.4.1 gives this page's LK1 1 to 2B-3 with `KEEP` 0; the only LK1 hit among the files of 2B-3 is `function Info` (`:219`) here. So the four `<Info>` items become one `KeyValueList` (§3.14, the shape `D/disposal/batches/[id]/page.tsx` and `D/audit/findings/page.tsx` use since 2B-2) and `function Info` goes. Without it the LK1 row stays and plan 2B-5's lock (`BUDGETS = KEEP`) fails on it. The four values keep their expressions byte for byte; the list adds `className="mt-3"` (the old `dl`'s gap).
- **Ruling (f):** 2B does not touch this page again, so it joins `MIGRATED_LIST_FILES` (every counter 0, the `KEEP` of every guard). 2C plan 4 still deletes one label line here; that is not 2B.
- **Fence (§7.11, controller):** the import panel `:58-102` stays byte for byte; 2C plan 4 deletes `currentStep: t("importWizardCurrentStep"),` (`:82` at `886a290`), which sits at `:81` after this task; Task 16 writes that into DH. The `ActionLink` cards (`:235-255`), the amber box (`:185`), the pill (`:173`), the dashed empty box (`:164`) and `formatFileSize` (2D), the two `toLocaleString("th-TH")` (`:191`, `:207`; `tests/asset-register-ux.test.ts:147` pins the second) and the bottom back link stay.
- **Tests (N7):** one test appended to `tests/asset-register-ux.test.ts`. That file reads the page raw (CRLF, no `\r` stripping), so the new regexes hold no `\n`.

What users will see on `/th/asset-management/import-export`:
- The title is weight 600 (was bold); the subtitle is the 13px meta line under it (was 14px); the sections are 24px apart (was 20px).
- In "ประวัติรอบนำเข้า", each batch lists ไฟล์ต้นทาง, นำเข้าแล้ว, ข้าม and ผู้ยืนยัน as label and value rows (a 13px faint label in a 120px column beside the value; below 640px the label sits above its value), instead of four small label-over-value columns. A long file name wraps instead of being cut.

Not in this task: the import panel (2C plan 4) · the cards, the rollback box, the pill and the empty box (2D) · docs (Task 16). Do not run a formatter.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx` (`i/lf w/crlf`; 4 exact replacements)
- Modify: `tests/asset-register-ux.test.ts` (`i/lf w/crlf`; one block appended with `p2b3-append.mjs`)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only: `t14-ux-block.ts`

**Must keep passing without edits:**
- `tests/asset-register-ux.test.ts:135-140` (`openImportWizard: t("openImportWizard")`, `collapseImportWizard: t("collapseImportWizard")`), `:142-148` (`moreAssets: (count: string) => t("importHistoryMoreAssets", { count })`, `labels.moreAssets(batch.rollbackSummary.hiddenAssetCount.toLocaleString("th-TH"))`)
- `tests/asset-import-field-labels.test.ts:30-31` (`fields: t.raw("importField")`) · `tests/list-primitives-ui.test.ts` (the `KeyValueList` strings) · `tests/visual-foundation-guards.test.ts` · `tests/form-migration-guards.test.ts`

**Interfaces:**
- Consumes:
  - 2B-1: `PageHeader` as in Task 13; `KeyValueList({ items: readonly KeyValueItem[], className?: string })` with `KeyValueItem = { key?: string; label: ReactNode; value: ReactNode; nilLabel?: string }` from `@/components/ui/key-value-list` (server-safe; a 120px label column, one column below sm; a blank value shows `Nil`, `0` is a value).
  - Task 10's `<temp>/p2b3-t10-precheck.mjs`; Task 1's `<temp>/p2b3-append.mjs`, `<temp>/p2b3-tw-probe.mjs`; Task 0's guard scripts.
- Produces: the page without `<h1>` and `function Info`; the page in `MIGRATED_LIST_FILES`; LFG `BUDGETS.LH1` and `BUDGETS.LK1` without the page's rows and without their `// 2B-3` groups; the test `the import-export page header is PageHeader and the import history facts are a KeyValueList (spec 2B §7.11)`; the new line number of the panel's `currentStep` label for DH (Task 16).

| guard | `D/asset-management/import-export/page.tsx` before → after | plan total (budget) before → after |
|---|---|---|
| LFG LH1 | 1 → – | 25 → 24 |
| LFG LK1 | 1 → – | 8 → 7 |
| `MIGRATED_LIST_FILES` | – → joins | +1 |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b3-t10-precheck.mjs 14`
Expected: `git status` prints nothing. The script prints (exit 0):
```
ok      2A: Button with the ghost and outline variants and size md
ok      2B-1: PageHeader with title, meta, actions, compactOnMobile and className
ok      2B-1: KeyValueList with items
ok      2A: formatCount
ok      the keys exist in th and en
ok      Task 10 is in
ok      Task 11 is in
ok      Task 12 is in
ok      Task 13 is in
ok      Task 14 has not run yet
ok      src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx is unchanged since 886a290 (hash c28bad3fc29b1613)
ok      tests/asset-register-ux.test.ts holds the text this task edits next to, once
info    src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx: CRLF
info    tests/asset-register-ux.test.ts: CRLF
preconditions hold for Task 14
```

Run: `node <temp>/p2b1-precheck.mjs --file D/asset-management/import-export/page.tsx`
Expected (after the header lines; exit 0):
```
file    src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LH1        1       1     0     1
LK1        1       1     0     1
args    LH1=1:1 LK1=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol "src/app/[[]locale]/(dashboard)/asset-management/import-export/page.tsx" tests/asset-register-ux.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf w/crlf` for all three.

- [ ] **Step 2: Write the failing test**

Save this block as `<temp>/t14-ux-block.ts`:

```ts
// Plan 2B-3 Task 14 (spec 2B §7.11, §10.4 table C row LK1, N7): the import-export page header is PageHeader and the import
// history facts are one KeyValueList. This file reads the page raw (CRLF), so these regexes hold no line break.
test("the import-export page header is PageHeader and the import history facts are a KeyValueList (spec 2B §7.11)", () => {
  const source = importExportPageSource()

  assert.match(source, /<div className="mx-auto max-w-6xl space-y-6">\s*<PageHeader title=\{tTools\("importExportTitle"\)\} meta=\{tTools\("importExportSubtitle"\)\} \/>/)
  assert.doesNotMatch(source, /<h1\b|font-bold/)
  assert.match(source, /<KeyValueList\s+className="mt-3"\s+items=\{\[/)
  assert.match(source, /\{ key: "sourceFile", label: labels\.sourceFile, value: `\$\{batch\.fileName\} \(\$\{formatFileSize\(batch\.fileSize\)\}\)` \}/)
  assert.doesNotMatch(source, /function Info\b|<Info\b/)
})
```

Run: `node <temp>/p2b3-append.mjs <temp>/t14-ux-block.ts tests/asset-register-ux.test.ts`
Expected: `appended <temp>/t14-ux-block.ts to tests/asset-register-ux.test.ts (CRLF)`

Run: `node --test tests/asset-register-ux.test.ts`
Expected: FAIL, `tests 19 · pass 18 · fail 1` (one test more than before this step, every other test passing):
- `the import-export page header is PageHeader and the import history facts are a KeyValueList (spec 2B §7.11)`: the input did not match the regular expression `/<div className="mx-auto max-w-6xl space-y-6">\s*<PageHeader title=\{tTools\("importExportTitle"\)\} meta=\{tTools\("importExportSubtitle"\)\} \/>/`

- [ ] **Step 3: Lower the guard rows of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs D/asset-management/import-export/page.tsx LH1=1:0 LK1=1:0 --migrated`
Expected (exit 0):
```
LH1: 1 -> 0 (row deleted)
LK1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx
```

Run: `node --test tests/list-frame-guards.test.ts`
Expected: FAIL, `tests 21 · pass 18 · fail 3`:
- `LH1 page titles (<h1>) come from PageHeader`: `LH1: 25 in 25 files. …` with the one line `src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx: 1 > 0`
- `LK1 detail values come from KeyValueList, not a local Info or DetailItem helper`: `LK1: 8 in 8 files. …` with the one line `src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx: 1 > 0`
- `L0 a file 2B is done with keeps only what KEEP allows, and every row names a real file and a known guard`: the two lines `LH1 src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx: 1 > 0` and `LK1 src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx: 1 > 0`

- [ ] **Step 4: Move the header and the history facts onto the primitives (`src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx`, CRLF)**

Four exact replacements, top to bottom.

(1) Imports `:8-9`. Replace:

```tsx
import { AssetImportPreviewPanel } from "@/components/assets/asset-import-preview-panel"
import { getResponsiveActionRowClasses, getSafeActionLinkClasses } from "@/lib/design-system"
```

with:

```tsx
import { AssetImportPreviewPanel } from "@/components/assets/asset-import-preview-panel"
import { KeyValueList } from "@/components/ui/key-value-list"
import { PageHeader } from "@/components/ui/page-header"
import { getResponsiveActionRowClasses, getSafeActionLinkClasses } from "@/lib/design-system"
```

(2) The page root and the header (`:30-35`). Replace:

```tsx
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{tTools("importExportTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{tTools("importExportSubtitle")}</p>
      </div>
```

with:

```tsx
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title={tTools("importExportTitle")} meta={tTools("importExportSubtitle")} />
```

(3) The four history facts (`:177-182`). Replace:

```tsx
                  <dl className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                    <Info label={labels.sourceFile} value={`${batch.fileName} (${formatFileSize(batch.fileSize)})`} />
                    <Info label={labels.imported} value={`${batch.imported}/${batch.totalRows}`} />
                    <Info label={labels.skipped} value={`${batch.skipped}`} />
                    <Info label={labels.approvedBy} value={`${batch.approvedByLabel} · ${formatDateTime(batch.createdAt)}`} />
                  </dl>
```

with:

```tsx
                  <KeyValueList
                    className="mt-3"
                    items={[
                      { key: "sourceFile", label: labels.sourceFile, value: `${batch.fileName} (${formatFileSize(batch.fileSize)})` },
                      { key: "imported", label: labels.imported, value: `${batch.imported}/${batch.totalRows}` },
                      { key: "skipped", label: labels.skipped, value: `${batch.skipped}` },
                      { key: "approvedBy", label: labels.approvedBy, value: `${batch.approvedByLabel} · ${formatDateTime(batch.createdAt)}` },
                    ]}
                  />
```

(4) The local helper, which has no caller left (`:219-228`). Replace:

```tsx
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate font-medium text-foreground">{value}</dd>
    </div>
  )
}

function formatFileSize(bytes: number) {
```

with:

```tsx
function formatFileSize(bytes: number) {
```

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/asset-register-ux.test.ts tests/asset-import-field-labels.test.ts tests/list-primitives-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `fail 0`: `asset-import-field-labels` 2 · `list-primitives-ui` 18 · `list-frame-guards` 21 · `form-migration-guards` 23; `asset-register-ux` and `visual-foundation-guards` pass in full (their counts include what Tasks 3 and 8 changed).

Run: `node <temp>/p2b1-precheck.mjs --file D/asset-management/import-export/page.tsx`
Expected (exit 0):
```
file    src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx (CRLF) · in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LH1        0       0     0     1
LK1        0       0     0     1
args    (no row holds this file)
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `grep -n 'currentStep: t("importWizardCurrentStep"),' "src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx"`
Expected: `81:          currentStep: t("importWizardCurrentStep"),` (the line 2C plan 4 deletes; it was `:82`). Record the number for Task 16.

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b3-tw-probe.mjs "src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx"`
Expected: `checked 64 classes, missing 0` (exit 0). The task adds `space-y-6` and `mt-3` only; both are in use in `src`.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `fail 0`, one test more than before this task: `tests 1941 · pass 1940 · fail 0 · skipped 1`. Tasks 10–14 together add 4 tests (Task 10 changes assertions in place; Tasks 11, 12, 13 and 14 append one each).
- `npx tsc --noEmit`: no errors (the four items type-check as `KeyValueItem`).
- `npm run lint`: 0 errors, no new warning; `npx eslint "src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx" tests/asset-register-ux.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 3 files: the page 13 insertions and 20 deletions, `tests/asset-register-ux.test.ts` 12 insertions, `tests/list-frame-guards.test.ts` 1 and 4 (the `MIGRATED_LIST_FILES` line in; the LH1 and LK1 rows and their two `// 2B-3` group lines out).

- [ ] **Step 8: The guard state after plan 2B-3**

Tasks 1–14 are in, so every budget now holds its spec §10.4 table C column 2B-3 value.

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected (exit 0; the header lines first):
```
ok      R7  TABLE_HEADER_FILLS  17 in 11 rows · live  17 in 11 files · over 0 · slack 0
ok      LH1 BUDGETS.LH1         24 in 24 rows · live  24 in 24 files · over 0 · slack 0
ok      LH2 BUDGETS.LH2          5 in  4 rows · live   5 in  4 files · over 0 · slack 0
ok      LB1 BUDGETS.LB1         12 in 12 rows · live  11 in 11 files · over 0 · slack 1
          slack D/maintenance/[id]/page.tsx: budget 1 > live 0 (0 → 1 row, expected until its plan)
ok      LP1 BUDGETS.LP1          7 in  7 rows · live   7 in  7 files · over 0 · slack 0
ok      LF1 BUDGETS.LF1          1 in  1 rows · live   1 in  1 files · over 0 · slack 0
ok      LT1 BUDGETS.LT1         34 in  9 rows · live  34 in  9 files · over 0 · slack 0
ok      LT2 BUDGETS.LT2          1 in  1 rows · live   1 in  1 files · over 0 · slack 0
ok      LT3 BUDGETS.LT3          2 in  1 rows · live   2 in  1 files · over 0 · slack 0
ok      LT4 BUDGETS.LT4          1 in  1 rows · live   1 in  1 files · over 0 · slack 0
ok      LT5 BUDGETS.LT5          3 in  2 rows · live   3 in  2 files · over 0 · slack 0
ok      LV1 BUDGETS.LV1         19 in  7 rows · live  19 in  7 files · over 0 · slack 0
ok      LV2 BUDGETS.LV2         97 in 29 rows · live  97 in 29 files · over 0 · slack 0
ok      LV3 BUDGETS.LV3         35 in  9 rows · live  35 in  9 files · over 0 · slack 0
ok      LS1 BUDGETS.LS1         17 in 15 rows · live  17 in 15 files · over 0 · slack 0
ok      LS2 BUDGETS.LS2         20 in  6 rows · live  20 in  6 files · over 0 · slack 0
ok      LK1 BUDGETS.LK1          7 in  7 rows · live   7 in  7 files · over 0 · slack 0
ok      LN1 BUDGETS.LN1          5 in  4 rows · live   5 in  4 files · over 0 · slack 0
ok      LN2 BUDGETS.LN2          7 in  7 rows · live   7 in  7 files · over 0 · slack 0
ok      LR1 BUDGETS.LR1          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
budgets hold: no live count is over its row
```

Every row is `slack 0` except LB1's one `0 → 1` row (`D/maintenance/[id]/page.tsx`, plan 2B-4). The other guards hold:
- VFG R1 `{}` (0 since 2B-2) · R2 10 in 9 rows (`asset-register-table.tsx` 1, the mobile bulk bar that phase 3 owns, `:455` at `886a290` and `:462-463` after Task 3; its comment reads "(phase 3, R-q)" after Task 3, rulings (b) and R-q) · R7 17 in 11 rows (the register header had no `/NN` fill)
- totals against the budgets at `886a290`: LH1 25 → 24 · LH2 7 → 5 · LF1 2 → 1 · LT1 36 → 34 · LT2 2 → 1 · LT3 3 → 2 · LV2 98 → 97 · LV3 36 → 35 · LK1 8 → 7 · LN1 6 → 5; unchanged: LB1 12 (live 11), LP1 7, LT4 1, LT5 3, LV1 19, LS1 17, LS2 20, LN2 7, LR1 0
- `MIGRATED_LIST_FILES`: the 51 files of `886a290`, then the files Tasks 1–9 added, then this group's five in commit order (`c/assets/asset-register-sort-menu.tsx`, `-column-picker.tsx`, `-export-menu.tsx`, `D/assets/page.tsx`, `D/asset-management/import-export/page.tsx`)
- FMG (never edited by 2B): the rows of `c/assets/asset-register-table.tsx` are the state spec §8.7 "ตัวเลข" hands to 2C plan 4. At `886a290` GF7 counts 6 (the list checkboxes `:549`, `:620` and the dialog labels `:708`, `:723`, `:738`, `:748`), GB1 1 (the dialog `:769`) and GL1 1 (the bulk bar `:455`). After Task 3 puts the two checkboxes on `checkboxVariants`: GF7 4 under its budget 6 (2C plan 4 lowers it) · GB1 1 · GL1 1 · GF2 and GF3 budgets 4 · GF5 floors `[1, 1, 0]`. Tasks 10–14 change none of them.

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `fail 0` (`list-frame-guards` 21 · `form-migration-guards` 23 · `visual-foundation-guards` as Task 8 left it).

- [ ] **Step 9: Commit**

```bash
git add "src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx" tests/asset-register-ux.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): import-export page header on PageHeader and import history facts on KeyValueList (2B-3 task 14)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 15, spec §8.7 row `/th/asset-management/import-export`):** at 1440 and 375: the title 600 with the subtitle under it, then the three cards 24px below; the import panel unchanged (open it and collapse it, import nothing); in the history, each batch shows its four facts as label and value rows (one column at 375), a long file name wraps, the rollback box beside it from 1024 as before; the "กลับ" link at the bottom still goes to `/th/assets`. NVDA reads the h1 and the history list as a description list (term, definition).

---

### Task 15: Verify, production build and dev-app check (controller runs this task, not an implementer)

**Files:**
- Create then delete: `.claude/launch.json` (temporary; never committed)
- Evidence: `.superpowers/sdd/screenshots/ui-phase2b-plan3/after/` (git-ignored)
- Modify: only files needed to fix problems found here. Each fix gets its own small commit, with a test where one is possible, through an implementer and the normal review.

**Interfaces:**
- Consumes: Tasks 1–14 committed; the Task 0 ids, before images and measurements.
- Produces: the after images and `.superpowers/sdd/<plan workspace>/task-15-findings.md`, which Task 16 turns into the "Dev-app check" bullets.

- [ ] **Step 1: Full verify.** Run `npm run verify` (lint, tests, build). Record the test count and the build page count for Task 17. Run `node <temp>/p2b1-precheck.mjs --budgets`: every guard holds, with slack only on LB1 (1).

- [ ] **Step 2: Production server.** Confirm the dev database (Task 0 Step 5). Create `.claude/launch.json` with `runtimeExecutable: "node"`, `runtimeArgs: ["node_modules/next/dist/bin/next", "start", "-p", "3001"]`, `port: 3001`, `autoPort: false`, and start it with `preview_start` from the main checkout. Log in with the seed admin; do not echo the password. Prefer `waitUntil: "load"` plus a short wait over `networkidle`.

- [ ] **Step 3: Writes nothing.** Delete through ⋯ only up to the confirm, then cancel. Never run a bulk action, never save a form, never apply an import. Count POST, PUT, PATCH and DELETE requests while doing so: 0.

- [ ] **Step 4: Screens.** Take every Task 0 view again under the same name in `after/` and compare (height, wrapping, truncation, lost color or shape). Then walk spec §8.7's dev-check table, in Thai plus one English pass, at 100% and 200% zoom:
  - **`/th/assets` at 1440 and 1366, every column preset:** no horizontal scroll at 1440 for operations and accounting (scroller `scrollWidth - clientWidth` = 0, spec DS:508, I26) · the actions column is 172px and shows the 120px next step and ⋯ uncut (I3) · the key column (tag) is not cut · status and condition do not wrap · rows keep `px-3 py-2` (56px with a photo) · no shadow on the pinned actions column (R-j) · the table header is white, 13px weight 500, no uppercase · an asset without a custodian shows "ไม่มีผู้ถือครอง" · empty values show "—".
  - **`/th/assets` at 1024, 768 and 375:** the toolbar has no card from md and its controls are 36px; on phones the sticky bar is 44 · the status tabs are one underline at every width with 44px targets on phones and keep scrolling with the active tab in view · the chips of Task 0 Step 7 remove one filter each · the filter sheet: labelled selects with the help buttons (24px) beside status and condition, "แสดง N รายการ" shows `busy` while counting · search: 2 characters, a 400ms wait, Thai IME composition does not search mid-word, Enter searches, × clears · select mode: 44px checkboxes, the bulk-action bar where it was · ⋯ on phones is a bottom sheet whose rows are 44px and whose title is the asset tag.
  - **⋯ delete (cancel only):** ⋯ → "ลบ" asks the same confirm as before; "ยกเลิก" returns focus to ⋯; 0 DELETE requests; users without delete permission see no "ลบ" (Task 0's account has it; list the other case for a person).
  - **`/th/asset-management/import-export` at 1440 and 375:** the new header; the body is unchanged (2C plan 4 owns it).
  - **Register header:** `PageHeader compactOnMobile` (title `text-xl` and the create button on one row below md, meta hidden), 600 weight, the create button 36 from md.

- [ ] **Step 5: Keyboard.** Header Tab order: ⋯ menus → create · the status tabs take Tab and arrows do not trap · Tab into a row highlights it, then the next step shows `primary-soft` · ⋯ opens with Enter, Esc closes and returns focus to ⋯ · the sort headers take Tab and show the focus ring · the filter sheet traps focus and returns it to its trigger.

- [ ] **Step 6: axe.** Inject `node_modules/axe-core/axe.min.js` with `page.addScriptTag({ path })` (from a script under `.playwright-mcp/` that you delete right after the run; `.playwright-mcp/` is linted) and run `axe.run(main, { runOnly: ["color-contrast", "label", "aria-valid-attr-value", "aria-required-attr", "button-name", "nested-interactive"] })` on `/th/assets` at 1440 and 375, with the chips of Task 0 Step 7, with the filter sheet open (run it on the sheet's dialog element), and on `/th/asset-management/import-export`. Expected: 0 violations.

- [ ] **Step 7: Forced colors and reduced motion.** With Playwright `emulateMedia`: focus rings on tabs, chips, sort headers, the next step and ⋯ · the selected tab's underline stays visible · the pinned columns keep their edge line. Reduced motion: no lingering row transition, the ⋯ sheet does not slide.

- [ ] **Step 8: Load time.** Load `/th/assets` five times on the production server and record the median `responseEnd`, beside Task 0's dev number; a page clearly slower is recorded in the findings.

- [ ] **Step 9: NVDA and real devices.** If NVDA is not available to you, list these checks for the user and do not mark them done: ⋯ reads "การดำเนินการของ <tag>" · the current status tab reads as current · a chip reads "ล้างตัวกรองนี้: …" · the sorted column reads its order · the search reads "ค้นหา" · the help buttons read their names · the custodian-less row reads "ไม่มีผู้ถือครอง". Real iPhone and iPad: the ⋯ sheet clears the home bar; Thai IME in the search; the sticky toolbar stays put. Add them to the open manual checks; all of them must be done before the one phase-2 deploy.

- [ ] **Step 10: Findings report.** Write `task-15-findings.md` in the plan workspace, in the shape Task 16 fills its markers from:
  - **Fixes made:** commit + one line each, or "none".
  - **Checked and passed:** what was checked, where and at which widths, with the results.
  - **Register widths:** one line per preset and width, "operations @1440: overflow 0px · actions 172px · row 56px".
  - **Load time:** `/th/assets` before → after.
  - **Found but not caused by plan 2B-3.**
  - **Accepted mixes.**
  - **Still needs a person:** the Step 9 list and anything else not checked.

- [ ] **Step 11: Clean up.** Stop the server and delete `.claude/launch.json` and every helper script you put under the repo (`.playwright-mcp/` and `.superpowers/sdd/` are linted). `git status --short` must show no stray files.

---

### Task 16: Repo documentation for plan 2B-3 (the controller adds the verify numbers, the rebase and the wiki in Task 17)

Spec §10.6 row 2B-3, §8.14 row 2B-3 and the checklist of §7.16 (`DESIGN.md:335`, `:500-510`, `:503`; `DEVELOPER_HANDOFF.md:252`, `:256`, `:301` and the 2B section; `docs/99_CHANGELOG.md`; `docs/14_UI_UX_DESIGN_SYSTEM.md:93`; `.impeccable/design.json` unchanged), with the register text of §7.3. Those line numbers are from `d38a0ee`; the numbers below are recounted at `886a290` (Tasks 1–15 do not touch these files). Five files change, all CRLF in the working tree (`i/lf w/crlf`): edit them with exact-string replacement, keep the endings, never run a formatter, and match on the quoted strings, not on line numbers.

Rulings made in this task:
- **What goes where (spec §10.6 row 2B-3, §7.16):**
  - `DESIGN.md`: the register's bulk-action bar goes to phase 3 (`:335`, R-q) · the asset register pattern (`:543-552`, the `:500-510` of the spec) per the table of spec §7.3: the search bar without a frame from `md` at 36px, the status tabs on `TabNav` with their lines at every width (the `:503` item of §7.16), the filter sheet's `FilterSelect` fields with `labelAction` help and the `busy` result button, ช1 rows, dense `px-3 py-2` rows as the register's own exception (I3), the 172px actions column and the 1,116px presets (I26), and the sentence under the heading that the density does not carry over to other lists · the empty-value counts after 2B-3 (`:559`; not in §10.6, but its numbers move with Task 3 the way plan 2B-2 moved them).
  - `docs/14_UI_UX_DESIGN_SYSTEM.md`: the Asset Register registry row (`:106`, the `:93` of the spec) names `2026-10-07-asset-register-redesign-design.md` and spec 2B §7 as its records and marks the 2026-07-10 record `Superseded by 2026-10-07-asset-register-redesign-design.md` (the registry rule at `:101`; the spec files themselves carry no such line, as with Maintenance at `:112`) · plan 2B-3 in the registry row of the 2B spec (`:116`).
  - `docs/11_FEATURE_LIST.md`: one phrase (`:113`). Task 7 makes "register filter icons use a compact size" false: nothing passes `AssetStateHelpPopover size="compact"` any more.
  - `DEVELOPER_HANDOFF.md`: one pointer in each older bullet this plan made stale (`:252` the register components, `:256` `compactOnMobile`, `:301` the phase 1 tab baseline, `:580` the "Next" line of the 2B plan 2 section), and the 2B-3 section before `## Open Go-Live Decisions` ("2C plan 4 may start once this branch and 2C plan 3 have both merged", the register contract, what changed, the line numbers 2C plan 4 needs, the table's FMG rows).
  - `docs/99_CHANGELOG.md`: the Thai entry under `## <today>`, shaped like the 2B-2 entry, with every item of spec §7.13.
  - `.impeccable/design.json`: **no change** (§7.16: the components came in 2B-1, R-s).
  - **Left as they are:** the `DESIGN.md:462` migration sentence ("plans 2B-3 to 2B-5 move the rest" is still true, and 2C plan 3 edits the same bullet for its own fields, so an edit here would make a same-line rebase conflict) · the `DEVELOPER_HANDOFF.md:443` 2C plan 4 line (still true; 2C plan 3 is likely to edit the lines beside it) · `docs/07_UAT_CHECKLIST.md` (the person checks of this plan go to the handoff's "Still open" list; §10.6 row 2B-3 names no UAT section).
- **The line numbers handed to 2C plan 4** are those in the files after Tasks 1–14 (checked on a copy of `886a290` with the code of Tasks 1–14). The check script recomputes each one from the files and the FMG rows, so a Task 15 fix that moved a line fails the check and prints the fragment to write. After a rebase onto 2C plan 3 (Task 17 Step 2), FMG rows can move: Task 17 re-runs the script and copies any printed fragment into the section.
- **The guard numbers** are the live totals after Task 14 (spec §10.4 table C column 2B-3, the controller's ruling (a)). If Step 1 prints other totals, write those in Steps 7 and 8 and say so in the task report.
- **The findings markers** (`<from task-15-findings.md>` three times in the handoff, `<จาก task-15-findings.md>` once in the changelog) come from `.superpowers/sdd/<plan workspace>/task-15-findings.md`, in the shape of the 2B plan 2 bullets: what was checked, where and at which widths, the results, the fixes with their commits or "none", accepted mixes, existing issues not caused by 2B-3, and what still needs a person. The widths marker takes the "Register widths" lines of the findings (overflow, actions column and row height per preset at 1440 and 1366). Task 17 adds its verify bullet directly above "Dev-app check (Task 15)" and "ตรวจบนแอป (Task 15)".
- **Dates:** the handoff heading and the changelog date use the day this task runs (`<today>`). If that day is 2026-10-13, the entry goes under the existing `## 2026-10-13` heading, above the 2B-2 entry; otherwise a new date block goes on top with the `---` separator the file uses.
- **The plan file name:** the docs link `docs/superpowers/plans/2026-10-13-ui-phase2b-plan3.md`. If the controller saved plan 2B-3 under another name, replace that path everywhere in this task (the check script's `PLAN` included) before Step 2.
- **The bulk-action bar (Task 3, its open question 1):** the text below follows Task 3 as drafted: the bar's container keeps every class, its four buttons are `Button`. If the controller ruled that Task 3 leaves the buttons as they were, delete "its four buttons are `Button` and " from the handoff bullet "The bulk-action bar keeps its place …" (Step 7) and "ปุ่ม 4 ปุ่มเป็นปุ่มกลาง " from the changelog bullet "ปุ่มบนแถบสรุป" (Step 8); no check depends on them.
- **Rebase (Task 17 Step 2, spec I29):** `DESIGN.md`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md` and `docs/14_UI_UX_DESIGN_SYSTEM.md` follow Task 17's rules. `docs/11_FEATURE_LIST.md` is not in the I29 list; it conflicts only if 2C plan 3 edited line `:113` too, and then the two edits are kept together like the files of the list.

**Files:**
- Modify: `DESIGN.md` (`i/lf w/crlf`; 3 replacements): §4 Elevation, The Border First Rule (`:335`) · §5 Data Tables, the asset register pattern (`:543-552`) · §5 Empty Values and Numbers (`:559`)
- Modify: `docs/14_UI_UX_DESIGN_SYSTEM.md` (`i/lf w/crlf`; 2 replacements): the registry rows Asset Register (`:106`) and List pages and page frames (`:116`)
- Modify: `docs/11_FEATURE_LIST.md` (`i/lf w/crlf`; 1 replacement): Status/condition guidance (`:113`)
- Modify: `DEVELOPER_HANDOFF.md` (`i/lf w/crlf`; 4 replacements): `:252`, `:256`, `:301`, and `:580-582` (the 2B plan 2 "Next" line and a new section before `## Open Go-Live Decisions`)
- Modify: `docs/99_CHANGELOG.md` (`i/lf w/crlf`; 1 or 2 replacements): the 2B-3 entry at the top (`:7`)
- Not changed: `.impeccable/design.json` (see the rulings) · `docs/07_UAT_CHECKLIST.md` · `src/`, `tests/`, `messages/` · the wiki (Task 17)
- Temp folder only, never committed: `<temp>/check-docs-2b3.mjs`

**Interfaces:**
- Consumes: Tasks 1–15 committed; `.superpowers/sdd/<plan workspace>/task-15-findings.md` (dev-app check, register widths, load time, still open); the live guard totals (`node <temp>/p2b1-precheck.mjs --budgets`); `<temp>/p2b1-precheck.mjs` from Task 0.
- Produces:
  - `DEVELOPER_HANDOFF.md` section `## UI Round 4 Phase 2B Plan 3 Asset Register (<today>)` with a `- Dev-app check (Task 15):` bullet; `docs/99_CHANGELOG.md` entry `### ทะเบียนทรัพย์สิน (UI รอบ 4 เฟส 2B plan 3)` with a `- **ตรวจบนแอป (Task 15):**` bullet. Task 17 adds its verify bullet directly above each.
  - The hand-off of spec §8.7 that 2C plan 4 reads in its Task 0: the new line numbers of the bulk update dialog in `asset-register-table.tsx` and of the `currentStep` labels in `D/assets/page.tsx` and `D/asset-management/import-export/page.tsx`, and the table's FMG rows ("สถานะที่ส่งให้ 2C-4").
  - The `DESIGN.md` register pattern that phase 3 starts from.

- [ ] **Step 1: Check the base**

Run: `git diff --quiet 886a290 HEAD -- DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md docs/11_FEATURE_LIST.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md .impeccable/design.json && echo DOCS-UNCHANGED`
Expected: `DOCS-UNCHANGED` (Tasks 1–15 did not touch them; if a Task 15 fix did, re-read the quoted strings below against the file).

Run: `git ls-files --eol DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md docs/11_FEATURE_LIST.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md .impeccable/design.json`
Expected: `i/lf    w/crlf` for all six.

Run: `ls docs/superpowers/plans/2026-10-13-ui-phase2b-plan3.md .superpowers/sdd/*/task-15-findings.md`
Expected: both exist (the docs link the plan; the findings fill the markers). If the plan has another name, see the rulings.

Run: `git status --short src tests messages`
Expected: nothing.

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected (exit 0; Node may print a `MODULE_TYPELESS_PACKAGE_JSON` warning on stderr, ignore it): the info line `… MIGRATED_LIST_FILES 64 files`, `budgets hold: no live count is over its row`, and these totals:
```
ok      R7  TABLE_HEADER_FILLS  17 in 11 rows · live  17 in 11 files · over 0 · slack 0
ok      LH1 BUDGETS.LH1         24 in 24 rows · live  24 in 24 files · over 0 · slack 0
ok      LH2 BUDGETS.LH2          5 in  4 rows · live   5 in  4 files · over 0 · slack 0
ok      LB1 BUDGETS.LB1         12 in 12 rows · live  11 in 11 files · over 0 · slack 1
          slack D/maintenance/[id]/page.tsx: budget 1 > live 0 (0 → 1 row, expected until its plan)
ok      LP1 BUDGETS.LP1          7 in  7 rows · live   7 in  7 files · over 0 · slack 0
ok      LF1 BUDGETS.LF1          1 in  1 rows · live   1 in  1 files · over 0 · slack 0
ok      LT1 BUDGETS.LT1         34 in  9 rows · live  34 in  9 files · over 0 · slack 0
ok      LT2 BUDGETS.LT2          1 in  1 rows · live   1 in  1 files · over 0 · slack 0
ok      LT3 BUDGETS.LT3          2 in  1 rows · live   2 in  1 files · over 0 · slack 0
ok      LT4 BUDGETS.LT4          1 in  1 rows · live   1 in  1 files · over 0 · slack 0
ok      LT5 BUDGETS.LT5          3 in  2 rows · live   3 in  2 files · over 0 · slack 0
ok      LV1 BUDGETS.LV1         19 in  7 rows · live  19 in  7 files · over 0 · slack 0
ok      LV2 BUDGETS.LV2         97 in 29 rows · live  97 in 29 files · over 0 · slack 0
ok      LV3 BUDGETS.LV3         35 in  9 rows · live  35 in  9 files · over 0 · slack 0
ok      LS1 BUDGETS.LS1         17 in 15 rows · live  17 in 15 files · over 0 · slack 0
ok      LS2 BUDGETS.LS2         20 in  6 rows · live  20 in  6 files · over 0 · slack 0
ok      LK1 BUDGETS.LK1          7 in  7 rows · live   7 in  7 files · over 0 · slack 0
ok      LN1 BUDGETS.LN1          5 in  4 rows · live   5 in  4 files · over 0 · slack 0
ok      LN2 BUDGETS.LN2          7 in  7 rows · live   7 in  7 files · over 0 · slack 0
ok      LR1 BUDGETS.LR1          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
```
These are the numbers Steps 7 and 8 write. If a total differs, write the live one in both places and say so in the task report.

Run: `grep -n '"src/components/assets/asset-register-table.tsx": 1' tests/visual-foundation-guards.test.ts`
Expected: one line, the R2 row, whose comment names phase 3 and no longer says "2B" (Task 3, the controller's ruling (b)).

Run: `node -e "console.log(new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }))"`
Expected: a date such as `2026-10-13`. This is `<today>` in Steps 7 and 8: replace every `<today>` below with it.

- [ ] **Step 2: Write the check script (it fails first).** Save as `check-docs-2b3.mjs` in your temp folder:

```js
// check-docs-2b3.mjs: run from the repo root. Checks the plan 2B-3 docs edits of Task 16, the code facts they state,
// and that the line numbers the handoff gives 2C plan 4 are the ones in the files now. Reads only. Never commit this file.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

const PLAN = "docs/superpowers/plans/2026-10-13-ui-phase2b-plan3.md"
const files = ["DESIGN.md", "docs/14_UI_UX_DESIGN_SYSTEM.md", "docs/11_FEATURE_LIST.md", "DEVELOPER_HANDOFF.md", "docs/99_CHANGELOG.md", ".impeccable/design.json"]
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
const HANDOFF = "## UI Round 4 Phase 2B Plan 3 Asset Register ("
const ENTRY = "### ทะเบียนทรัพย์สิน (UI รอบ 4 เฟส 2B plan 3)"
const handoff = section("DEVELOPER_HANDOFF.md", HANDOFF)

// The code facts the docs state (after Tasks 1–14).
const C = "src/components/"
const D = "src/app/[locale]/(dashboard)/"
const source = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const columns = await import(pathToFileURL(resolve("src/lib/asset-register-columns.ts")).href)
const presetWidth = (preset) => columns.getAssetRegisterTableMinWidth(columns.assetRegisterColumnPresets[preset])
const asset = (locale) => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).asset ?? {}
const callers = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return callers(path)
    return /\.tsx?$/.test(entry) && source(path).includes("<MasterDataHeader") ? [path.replace(/\\/g, "/")] : []
  })
const codeFacts =
  presetWidth("operations") === 1116 && presetWidth("accounting") === 1116 && presetWidth("audit") === 1276 && presetWidth("all") === 1632 &&
  columns.assetRegisterColumnWidths.actions === 172 && columns.assetRegisterColumnWidths.companyBranch === 116 &&
  asset("th").noCustodian === "ไม่มีผู้ถือครอง" && asset("en").noCustodian === "No custodian" &&
  callers("src").length === 0 &&
  /<RowActions\b/.test(source(`${C}assets/asset-register-row-actions.tsx`)) && !/<Sheet\b|sheetItemClasses/.test(source(`${C}assets/asset-register-row-actions.tsx`)) &&
  /<TabNav\b/.test(source(`${C}assets/asset-register-status-tabs.tsx`)) && /<FilterChipList\b/.test(source(`${C}assets/asset-register-filter-chips.tsx`)) &&
  !/function LabeledSelect/.test(source(`${C}assets/asset-register-filter-sheet.tsx`)) && /busy=\{isPending\}/.test(source(`${C}assets/asset-register-filter-sheet.tsx`)) &&
  /<SearchField\b/.test(source(`${C}assets/asset-register-search-field.tsx`)) && /<FilterSelect\b/.test(source(`${C}assets/asset-register-toolbar.tsx`)) &&
  source(`${C}assets/asset-register-table.tsx`).includes('const cellClasses = "border-b border-border-soft px-3 py-2 align-top"') &&
  /<PageHeader\s+compactOnMobile/.test(source(`${D}assets/page.tsx`)) && /<KeyValueList\b/.test(source(`${D}asset-management/import-export/page.tsx`))

// The line numbers the handoff hands to 2C plan 4 (spec §8.7), recomputed from the files and the FMG rows.
const H = await import(pathToFileURL(resolve("tests/helpers/source-files.ts")).href)
const lines = (path) => source(path).split("\n")
const lineOf = (rows, test, from = 0) => {
  for (let index = from; index < rows.length; index += 1) if (test(rows[index])) return index + 1
  return 0
}
const at = (numbers) => (numbers.length ? numbers.map((number) => `\`:${number}\``).join(", ") : "—")
const span = (numbers) => (numbers.every((number, index) => index === 0 || number === numbers[index - 1] + 1) ? `\`:${numbers[0]}-${numbers.at(-1)}\`` : at(numbers))
const TABLE = "assets/asset-register-table.tsx"
const tableSource = source(C + TABLE)
const table = tableSource.split("\n")
const lineAt = (index) => tableSource.slice(0, index).split("\n").length
// GF2, GF3, GF7, GB1 and GL1 as FMG counts them (copied from tests/form-migration-guards.test.ts).
const NON_FIELD_INPUT = /^(?:checkbox|radio|hidden|file)$/
const rawFields = H.findJsxTags(tableSource, ["input", "select", "textarea"])
  .filter((tag) => tag.name !== "input" || !NON_FIELD_INPUT.test(H.jsxAttrValue(tag.text, "type") ?? ""))
  .map((tag) => tag.line)
const isFieldClassString = (value) =>
  !/\bhover:/.test(value) &&
  (/\bfocus(?:-visible)?:border-ring\b/.test(value) ||
    (/\bborder-(?:border|input)\b/.test(value) &&
      /\brounded(?:-md)?\b/.test(value) &&
      /\b(?:px-3|px-2|pl-9|pl-10)\b/.test(value) &&
      /\b(?:w-full|min-h-\d+|h-(?:9|10|11))\b/.test(value) &&
      !/\b(?:inline-flex|flex|grid|justify-center|font-medium|font-semibold)\b|\bfile:/.test(value)))
const classStrings = (keep) => [...tableSource.matchAll(/"[^"\n]*"/g)].filter((match) => keep(match[0])).map((match) => lineAt(match.index))
const OLD_FIELD_MARKUP = /ml-1 text-danger">\*|mb-1\.5 block text-sm font-medium text-foreground|<legend className="mb-2 text-sm font-medium text-foreground"|\b(?:h-4 w-4|h-5 w-5|h-3\.5 w-3\.5) rounded border-border\b|\baccent-primary\b/g
const matchLines = (pattern) => [...tableSource.matchAll(pattern)].map((match) => lineAt(match.index))
const fmg = lines("tests/form-migration-guards.test.ts")
const fmgRow = (name) => {
  const line = lineOf(fmg, (row) => row.includes("[`${C}" + TABLE + "`]"), lineOf(fmg, (row) => row.startsWith(`const ${name}`)))
  return { line, value: (/\]: (\[[^\]]*\]|\d+)/.exec(fmg[line - 1] ?? "") ?? [])[1] }
}
const fmgTableRow = (guard, name, sites, note) => {
  const { line, value } = fmgRow(name)
  return `| ${guard} \`${name}\` \`:${line}\` | ${value} | ${sites.length} | ${at(sites)}${sites.length ? note : ""} |`
}
const floors = fmgRow("CONSTRAINT_FLOORS")
const pending = lineOf(fmg, (row) => row.includes("`${C}" + TABLE + "`,"), lineOf(fmg, (row) => row.startsWith("const PENDING_FOOTER_PARTS")))
const dialogStart = lineOf(table, (row) => row.includes("<AccessibleDialog"))
const dialogEnd = lineOf(table, (row) => row.includes("</AccessibleDialog>"), dialogStart)
const footers = H.findJsxTags(tableSource, ["AccessibleDialogFooter"]).length
const state = ["const [bulkUpdateOpen", "const [bulkSaving", "const [bulkForm"].map((head) => lineOf(table, (row) => row.trimStart().startsWith(head)))
const panel = (path) => {
  const rows = lines(path)
  const start = lineOf(rows, (row) => row.includes("<AssetImportPreviewPanel"))
  return { start, end: lineOf(rows, (row) => row.trim() === "/>", start), step: lineOf(rows, (row) => row.includes('currentStep: t("importWizardCurrentStep")')) }
}
const page = panel(`${D}assets/page.tsx`)
const io = panel(`${D}asset-management/import-export/page.tsx`)
const handedOn = [
  `the bulk update dialog \`<AccessibleDialog\` \`:${dialogStart}-${dialogEnd}\` (it was \`:697-774\`)`,
  `its state \`bulkUpdateOpen\`, \`bulkSaving\` and \`bulkForm\` ${span(state)}, \`submitBulkUpdate\` \`:${lineOf(table, (row) => row.includes("function submitBulkUpdate("))}\``,
  `the bulk-action bar \`data-asset-bulk-bar\` \`:${lineOf(table, (row) => row.includes("data-asset-bulk-bar"))}\``,
  `In \`D/assets/page.tsx\`, \`<AssetImportPreviewPanel\` \`:${page.start}-${page.end}\` and its \`currentStep\` label \`:${page.step}\` (they were \`:427-471\` and \`:451\`)`,
  `in \`D/asset-management/import-export/page.tsx\`, \`<AssetImportPreviewPanel\` \`:${io.start}-${io.end}\` and its \`currentStep\` label \`:${io.step}\` (they were \`:58-102\` and \`:82\`)`,
  fmgTableRow("GF2", "RAW_FIELDS", rawFields, " (the dialog's two selects, input and textarea)"),
  fmgTableRow("GF3", "FIELD_CLASS_STRINGS", classStrings(isFieldClassString), " (their class strings)"),
  fmgTableRow("GF7", "OLD_MARKUP", matchLines(OLD_FIELD_MARKUP), " (the dialog's four labels)"),
  fmgTableRow("GB1", "LOADER2", matchLines(/<Loader2\b/g), " (the dialog's save button)"),
  fmgTableRow("GL1", "FIXED_BOTTOM_BARS", classStrings((value) => /\bfixed\b/.test(value) && /\bbottom-/.test(value)), " (the bulk-action bar, phase 3)"),
  `| GF5 \`CONSTRAINT_FLOORS\` \`:${floors.line}\` | \`${floors.value}\` | the same (floors, never lowered) | the reason field of the dialog |`,
  `| GD2 \`PENDING_FOOTER_PARTS\` \`:${pending}\` | listed | ${footers === 0 ? `still listed: the dialog \`:${dialogStart}\` has no \`AccessibleDialogFooter\`` : `${footers} footer(s): 2C plan 4 removes the row`} | — |`,
]
const missingHandedOn = handedOn.filter((fragment) => !handoff.includes(fragment))

// The newest date block of the changelog: from the first "## yyyy-mm-dd" heading to the "---" after it.
const log = text["docs/99_CHANGELOG.md"]
const newest = /\n## \d{4}-\d{2}-\d{2}\n/.exec(log)
const newestEnd = newest ? log.indexOf("\n---\n", newest.index) : -1
const newestBlock = newest ? log.slice(newest.index, newestEnd < 0 ? undefined : newestEnd) : ""

const checks = [
  ["every file is CRLF only", files.every((path) => !/(^|[^\r])\n/.test(raw[path]))],
  ["no <today> or findings marker is left", files.every((path) => none(path, "<today>", "<from task-15-findings.md>", "<จาก task-15-findings.md>"))],
  ["the code facts the docs state hold (widths, asset.noCustodian, no MasterDataHeader caller, the wrappers)", codeFacts],
  [
    "the plan file the docs link exists",
    existsSync(PLAN) &&
      count("docs/14_UI_UX_DESIGN_SYSTEM.md", `](superpowers/plans/${PLAN.slice("docs/superpowers/plans/".length)})`) === 2 &&
      handoff.includes(`plan \`${PLAN}\``) &&
      once("docs/99_CHANGELOG.md", `plan \`${PLAN}\``),
  ],
  [
    "DESIGN.md: the register's bulk-action bar waits for phase 3 (Elevation)",
    once("DESIGN.md", "the mobile bulk-action bar of the register (phase 3, with QR label printing; plan 2B-3 kept its place, frame and shadow)") &&
      none("DESIGN.md", "the mobile bulk-action bar of the register (2B)"),
  ],
  [
    "DESIGN.md: the register pattern after plan 2B-3",
    once(
      "DESIGN.md",
      "plan 2B-3 moved it onto the shared parts.",
      "- **Search bar:** a search field that searches while typing",
      "From `md` up the bar has no frame; the search field, the scope selects and the ⚙ button are 36px",
      "- **Status tabs with live counts** (`TabNav`, through `asset-register-status-tabs.tsx`)",
      "At every width the list draws the baseline as an inset shadow (`w-max min-w-full shadow-[inset_0_-1px_0_var(--border)]`)",
      "Do not use `overflow-visible` or a `-mb-px` overlap on a scrolling tab row.",
      "Its fields are `FilterSelect` (`Field` + `NativeSelect`); status and condition carry their 24px help button in `labelAction`.",
      "\"แสดง N รายการ\" is `busy` while the count loads.",
      "- **Removable chips** (`FilterChipList`)",
      "- **Rows:** `RowActions` (owner choice ช1) through `AssetRegisterRowActions`",
      "rows stay dense (`px-3 py-2`, 56px with the 40px thumbnail) until phase 3",
      "The actions column is 172px (`pl-1.5 pr-2`",
      "the operations preset (the default) and the accounting preset are 1,116px",
      "(`checkboxVariants({ size: \"lg\" })`), and its bulk bar floats above the bottom navigation until phase 3",
    ) &&
      none("DESIGN.md", "- **Search bar card:**", "md:min-w-full md:shadow-[inset_0_-1px_0_var(--border)]", "plan 2B-3 moves it onto the shared parts", "Do not use `md:overflow-visible`") &&
      before("DESIGN.md", "**Asset register pattern (2026-10-07).**", "- **Thumbnails:** list images come from") &&
      before("DESIGN.md", "- **Thumbnails:** list images come from", "### Empty Values and Numbers"),
  ],
  [
    "DESIGN.md: the empty-value counts after plan 2B-3",
    once("DESIGN.md", "After plan 2B-3, guard LV2 counts 97 typed `\"-\"`, LV1 19 bare `toLocaleString()` calls and LV3 35 `formatCurrency(` calls on screens (98, 19 and 36 after plan 2B-2; 113, 20 and 42 after plan 2B-1).") &&
      none("DESIGN.md", "After plan 2B-2, guard LV2 counts 98"),
  ],
  [
    "docs/14: the Asset Register record (the 2026-07-10 one superseded) and plan 2B-3 in the registry",
    once(
      "docs/14_UI_UX_DESIGN_SYSTEM.md",
      "| Asset Register | [`2026-10-07-asset-register-redesign-design.md`](superpowers/specs/2026-10-07-asset-register-redesign-design.md)",
      "`Superseded by 2026-10-07-asset-register-redesign-design.md`",
      "sequences plan 2B-3 (the asset register on the primitives, with its dense rows and fixed column widths kept); plans 2B-4 and 2B-5 follow (spec §10.3). |",
    ) &&
      none("docs/14_UI_UX_DESIGN_SYSTEM.md", "| Asset Register | [`2026-07-10-desktop-asset-register-workspace-design.md`]", "plans 2B-3 to 2B-5 follow (spec §10.3)"),
  ],
  [
    "docs/11: the help buttons of the register's filter sheet",
    once("docs/11_FEATURE_LIST.md", "every help button is 24px beside its label, and the register's filter sheet puts it in the `labelAction` of its `FilterSelect` |") &&
      none("docs/11_FEATURE_LIST.md", "register filter icons use a compact size"),
  ],
  [
    "handoff: the register bullets, the phase 1 tab bullet and the 2B-2 Next line point to plan 2B-3",
    once(
      "DEVELOPER_HANDOFF.md",
      "Since phase 2B plan 3 they sit on the shared primitives:",
      "since plan 2B-3 the register calls `PageHeader compactOnMobile` itself",
      "Since 2B plan 3 the tabs are `TabNav`:",
      "- Next: 2B plan 3 (below, the asset register) in the main checkout",
    ) &&
      none("DEVELOPER_HANDOFF.md", "and `MasterDataHeader` is a thin wrapper of it until plan 2B-5 deletes it.", "- Next: merge this branch; then 2B plan 3 (the asset register)"),
  ],
  [
    "handoff: the 2B-3 section after 2B-2 and before Open Go-Live Decisions, with its bullets",
    count("DEVELOPER_HANDOFF.md", HANDOFF) === 1 &&
      before("DEVELOPER_HANDOFF.md", "## UI Round 4 Phase 2B Plan 2 Disposal, Audit, Maintenance, Data-Quality and Integration Lists (", HANDOFF) &&
      before("DEVELOPER_HANDOFF.md", HANDOFF, "## Open Go-Live Decisions") &&
      [
        "- **2C plan 4 may start once this branch and 2C plan 3 have both merged**",
        "- **The register contract holds**",
        "- **What changed, file by file:**",
        "- **Messages:**",
        "  - LFG after this plan (live counts): LH1 24 · LH2 5 · LB1 11 · LP1 7 · LF1 1 · LT1 34 · LT2 1 · LT3 2 · LT4 1 · LT5 3 · LV1 19 · LV2 97 · LV3 35 · LS1 17 · LS2 20 · LK1 7 · LN1 5 · LN2 7 · LR1 0.",
        "`MIGRATED_LIST_FILES` holds 64 files",
        "- **Risks:**",
        "- **Handed on to 2C plan 4:**",
        "| FMG row | Budget | Live after 2B-3 | Sites left |",
        "- **Handed on, later:**",
        "- Dev-app check (Task 15):",
        "- Still open, for a person before the one phase-2 deploy:",
        "- Next: merge this branch;",
      ].every((literal) => handoff.split(literal).length === 2),
  ],
  ["handoff: the 2C plan 4 lines and the table's FMG rows are the live ones", missingHandedOn.length === 0],
  [
    "changelog: the 2B-3 entry in the newest date block, above the 2B-2 entry",
    once("docs/99_CHANGELOG.md", ENTRY, "- **ตรวจบนแอป (Task 15):**") &&
      newestBlock.includes(`\n${ENTRY}\n`) &&
      before("docs/99_CHANGELOG.md", ENTRY, "### หน้ารายการตัดจำหน่าย ตรวจนับ และซ่อมบำรุง (UI รอบ 4 เฟส 2B plan 2)"),
  ],
]
let failed = 0
checks.forEach(([name, ok], index) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${String(index + 1).padStart(2)} ${name}`)
  if (!ok) failed += 1
})
if (missingHandedOn.length) console.log(`the handoff section lacks these live fragments:\n${missingHandedOn.join("\n")}`)
process.exit(failed ? 1 : 0)
```

- [ ] **Step 3: Run it**

Run: `node <temp>/check-docs-2b3.mjs`
Expected: exit 1 (ignore a `MODULE_TYPELESS_PACKAGE_JSON` warning on stderr). Checks 1–3 print `ok` (the files are CRLF, no marker yet, and the code of Tasks 1–14 says what the docs will say); checks 4–13 print `FAIL`; then `the handoff section lacks these live fragments:` and these 12 lines:
```
the bulk update dialog `<AccessibleDialog` `:681-758` (it was `:697-774`)
its state `bulkUpdateOpen`, `bulkSaving` and `bulkForm` `:190-192`, `submitBulkUpdate` `:361`
the bulk-action bar `data-asset-bulk-bar` `:462`
In `D/assets/page.tsx`, `<AssetImportPreviewPanel` `:435-479` and its `currentStep` label `:459` (they were `:427-471` and `:451`)
in `D/asset-management/import-export/page.tsx`, `<AssetImportPreviewPanel` `:57-101` and its `currentStep` label `:81` (they were `:58-102` and `:82`)
| GF2 `RAW_FIELDS` `:181` | 4 | 4 | `:693`, `:708`, `:723`, `:733` (the dialog's two selects, input and textarea) |
| GF3 `FIELD_CLASS_STRINGS` `:212` | 4 | 4 | `:696`, `:711`, `:728`, `:737` (their class strings) |
| GF7 `OLD_MARKUP` `:293` | 6 | 4 | `:692`, `:707`, `:722`, `:732` (the dialog's four labels) |
| GB1 `LOADER2` `:327` | 1 | 1 | `:753` (the dialog's save button) |
| GL1 `FIXED_BOTTOM_BARS` `:351` | 1 | 1 | `:463` (the bulk-action bar, phase 3) |
| GF5 `CONSTRAINT_FLOORS` `:265` | `[1, 1, 0]` | the same (floors, never lowered) | the reason field of the dialog |
| GD2 `PENDING_FOOTER_PARTS` `:374` | listed | still listed: the dialog `:681` has no `AccessibleDialogFooter` | — |
```
These are the lines Step 7 writes. If check 3 fails, a task left the code different from what the docs say: find which fact (widths, `asset.noCustodian`, a `<MasterDataHeader` caller, a wrapper) and stop. If a fragment differs (a Task 15 fix moved a line), use the printed fragment in Step 7 instead of the text below and say so in the task report.

- [ ] **Step 4: `DESIGN.md` (3 replacements)**

(1) §4 Elevation, The Border First Rule. Replace:

```
Four larger shadows wait for their owners: the 2 floating add buttons (2D), the mobile bulk-action bar of the register (2B) and the round scan button (kept since phase 1).
```

with:

```
Four larger shadows wait for their owners: the 2 floating add buttons (2D), the mobile bulk-action bar of the register (phase 3, with QR label printing; plan 2B-3 kept its place, frame and shadow) and the round scan button (kept since phase 1).
```

(2) §5 Data Tables, the asset register pattern (spec §7.3; the `**Filters live in the URL.**` line and the `**Thumbnails:**` line after the block stay as they are). Replace:

```
**Asset register pattern (2026-10-07).** The register (`/[locale]/assets`) adds these to the rules above; plan 2B-3 moves it onto the shared parts:

- **Search bar card:** a search field that searches while typing (400ms pause, 2+ characters, not during IME composition, Enter searches at once, × clears) plus the two or three scope selects a person uses most. Below `md` the bar holds only search and ⚙, and it sticks to the top while the list scrolls.
- **Status tabs with live counts** for the handful of states people switch between; any other state lives in the filter sheet. The tab nav keeps `overflow-x-auto` at every width, so the row scrolls when the tabs do not fit. From `md` up the baseline is an inset shadow on the list (`md:min-w-full md:shadow-[inset_0_-1px_0_var(--border)]`), and the active tab's `md:border-b-2 md:border-primary` sits inside the list over it, so the underline scrolls with the tabs and is never clipped. Do not use `md:overflow-visible` or a `-mb-px` overlap on a scrolling tab row.
- **⚙ filter Sheet** (right on desktop, bottom on phones) for everything else. Changes apply at once, the sheet stays open, and its footer reads "ล้าง" and "แสดง N รายการ" with the real result count.
- **Removable chips** for every active filter that is not visible on screen, plus "ล้างทั้งหมด".
- **Filters live in the URL.** Changes go through `router.replace` with an optimistic state (`AssetRegisterNavigationProvider`), so the back button leaves the page in one step and controls never bounce back.
- **Rows:** one next-step button chosen by status (for example "ส่งมอบ" / "รับคืน") plus a ⋯ menu that holds every action, with disabled items explaining why. The ⋯ menu is a `DropdownMenu` on desktop and a bottom `Sheet` on phones. Clicking a row opens the detail page.
- **Desktop table:** `table-fixed` with a `<colgroup>`, only the key column and the actions column pinned, one-line truncated cells with a `title`. The default column set must fit 1440px without horizontal scroll, and the scroll hint appears only when the table really overflows.
- **Phone rows:** about 80px each — 44px thumbnail, tag, name, then location and a status badge on one line, and ⋯. A "เลือก" mode turns rows into checkboxes, and its bulk bar floats above the bottom navigation.
```

with:

```
**Asset register pattern (2026-10-07).** The register (`/[locale]/assets`) adds these to the rules above; plan 2B-3 moved it onto the shared parts. Its frame (search bar, status tabs, filter sheet, chips, filters in the URL, ช1 rows) is the model for list pages, but its dense rows are its own exception until phase 3 (spec 2B B3(3), I3); every other table uses the `DataTable` rows.

- **Search bar:** a search field that searches while typing (400ms pause, 2+ characters, not during IME composition, Enter searches at once, × clears) plus the two or three scope selects a person uses most. From `md` up the bar has no frame; the search field, the scope selects and the ⚙ button are 36px (`SearchField` and `FilterSelect hideLabel` at `fieldSize="md"`, `Button variant="outline" size="md"`). Below `md` the bar holds only search and ⚙ at 44px, and it sticks to the top while the list scrolls.
- **Status tabs with live counts** (`TabNav`, through `asset-register-status-tabs.tsx`) for the handful of states people switch between; any other state lives in the filter sheet. The tab nav keeps `overflow-x-auto` at every width, so the row scrolls when the tabs do not fit; below `md` it runs to the screen edges and its targets are 44px. At every width the list draws the baseline as an inset shadow (`w-max min-w-full shadow-[inset_0_-1px_0_var(--border)]`), and the current tab draws its 2px primary line as an inset shadow over it, so the underline scrolls with the tabs and is never clipped. Do not use `overflow-visible` or a `-mb-px` overlap on a scrolling tab row.
- **⚙ filter Sheet** (right on desktop, bottom on phones) for everything else. Its fields are `FilterSelect` (`Field` + `NativeSelect`); status and condition carry their 24px help button in `labelAction`. Changes apply at once, the sheet stays open, and its footer reads "ล้าง" and "แสดง N รายการ" with the real result count; "แสดง N รายการ" is `busy` while the count loads.
- **Removable chips** (`FilterChipList`) for every active filter that is not visible on screen, plus "ล้างทั้งหมด".
- **Filters live in the URL.** Changes go through `router.replace` with an optimistic state (`AssetRegisterNavigationProvider`), so the back button leaves the page in one step and controls never bounce back.
- **Rows:** `RowActions` (owner choice ช1) through `AssetRegisterRowActions`: a fixed 120px next-step button chosen by status (for example "ส่งมอบ" / "รับคืน"), or an empty slot when nothing is next, then ⋯ in a fixed slot that holds every action, with unavailable items explaining why; "ลบ" comes last and only with delete permission. The ⋯ menu is a `DropdownMenu` on desktop and a bottom `Sheet` titled with the asset tag on phones. Clicking a row opens the detail page.
- **Desktop table:** `table-fixed` with a `<colgroup>`, only the key column and the actions column pinned (each with a line on its inner edge, no shadow), one-line truncated cells with a `title`. It is built from the `DataTable` parts (`DataTableBody`, `ClickableTableRow`, `DataTableHead sort`, `TableEmptyRow`, `DataTableFoot` with `Pagination`) with the register's own classes (`headerClasses`, `cellClasses` in `asset-register-table.tsx`): rows stay dense (`px-3 py-2`, 56px with the 40px thumbnail) until phase 3. The actions column is 172px (`pl-1.5 pr-2`, room for the 120px next step and ⋯), and the operations preset (the default) and the accounting preset are 1,116px, within the 1,117px a 1440px screen leaves (`src/lib/asset-register-columns.ts`). The default column set must fit 1440px without horizontal scroll, and the scroll hint appears only when the table really overflows.
- **Phone rows:** about 80px each — 44px thumbnail, tag, name, then location and a status badge on one line, and ⋯. A "เลือก" mode turns rows into checkboxes (`checkboxVariants({ size: "lg" })`), and its bulk bar floats above the bottom navigation until phase 3 reworks it with QR label printing.
```

(3) §5 Empty Values and Numbers. Replace:

```
After plan 2B-2, guard LV2 counts 98 typed `"-"`, LV1 19 bare `toLocaleString()` calls and LV3 36 `formatCurrency(` calls on screens (113, 20 and 42 after plan 2B-1).
```

with:

```
After plan 2B-3, guard LV2 counts 97 typed `"-"`, LV1 19 bare `toLocaleString()` calls and LV3 35 `formatCurrency(` calls on screens (98, 19 and 36 after plan 2B-2; 113, 20 and 42 after plan 2B-1).
```

Leave the rest of `DESIGN.md` as it is: the `DataTable` paragraph already names the register's dense rows as the one exception (`:520`), the page-header bullet already keeps `compactOnMobile` for the register (`:508`), and the List filters bullet already names the register's toolbar (`:465`).

- [ ] **Step 5: `docs/14_UI_UX_DESIGN_SYSTEM.md` (2 replacements)**

(1) The Current-Surface Registry, the Asset Register row (the `:93` of spec §7.16). Replace the whole line:

```
| Asset Register | [`2026-07-10-desktop-asset-register-workspace-design.md`](superpowers/specs/2026-07-10-desktop-asset-register-workspace-design.md) | [`2026-07-10-desktop-asset-register-workspace.md`](superpowers/plans/2026-07-10-desktop-asset-register-workspace.md) is the implementation and sequencing record. |
```

with:

```
| Asset Register | [`2026-10-07-asset-register-redesign-design.md`](superpowers/specs/2026-10-07-asset-register-redesign-design.md) (the register as single-purpose components: search bar, status tabs, filter sheet, chips, filters in the URL, next step and ⋯ rows), with its look on the list primitives in [`2026-10-12-ui-phase2b-design.md`](superpowers/specs/2026-10-12-ui-phase2b-design.md) §7 (dense rows and fixed column widths kept); the former record [`2026-07-10-desktop-asset-register-workspace-design.md`](superpowers/specs/2026-07-10-desktop-asset-register-workspace-design.md) is `Superseded by 2026-10-07-asset-register-redesign-design.md` | [`2026-10-07-asset-register-redesign.md`](superpowers/plans/2026-10-07-asset-register-redesign.md) sequences the redesign and [`2026-10-13-ui-phase2b-plan3.md`](superpowers/plans/2026-10-13-ui-phase2b-plan3.md) its move onto the 2B primitives; [`2026-07-10-desktop-asset-register-workspace.md`](superpowers/plans/2026-07-10-desktop-asset-register-workspace.md) is the history of the superseded record. |
```

(2) The registry row of the 2B spec, its last cell. Replace:

```
sequences plan 2B-2 (the disposal, audit, maintenance, data-quality and integration lists, five of them with real pages); plans 2B-3 to 2B-5 follow (spec §10.3). |
```

with:

```
sequences plan 2B-2 (the disposal, audit, maintenance, data-quality and integration lists, five of them with real pages); [`2026-10-13-ui-phase2b-plan3.md`](superpowers/plans/2026-10-13-ui-phase2b-plan3.md) sequences plan 2B-3 (the asset register on the primitives, with its dense rows and fixed column widths kept); plans 2B-4 and 2B-5 follow (spec §10.3). |
```

The Shared Components table needs no change: its `FilterSelect`, `TabNav`, `RowActions` and `DataTable` rows already cover how the register uses them.

- [ ] **Step 6: `docs/11_FEATURE_LIST.md` (1 replacement)**

The Status/condition guidance row, its last words. Replace:

```
; register filter icons use a compact size so the filter rows stay visually aligned |
```

with:

```
; every help button is 24px beside its label, and the register's filter sheet puts it in the `labelAction` of its `FilterSelect` |
```

- [ ] **Step 7: `DEVELOPER_HANDOFF.md` (4 replacements)**

(1) Asset Register Redesign, the components bullet (`:252`). Replace:

```
Pure view-model helpers (`asset-register-filters`, `-status-tabs`, `-chips`, `-sort`, `-columns`) live in `src/lib` and are unit-tested.
```

with:

```
Pure view-model helpers (`asset-register-filters`, `-status-tabs`, `-chips`, `-sort`, `-columns`) live in `src/lib` and are unit-tested. Since phase 2B plan 3 they sit on the shared primitives: the status tabs wrap `TabNav`, the chips `FilterChipList` and the row actions `RowActions` (ช1; `AssetRegisterRowActions` builds its data-only props); the toolbar and the filter sheet use `FilterSelect`, the search field `SearchField` and the menu triggers `Button`; the table uses `DataTableBody`, `ClickableTableRow`, `DataTableHead sort`, `TableEmptyRow` and `DataTableFoot` with its own dense `headerClasses` / `cellClasses` (spec 2B I3, I5–I7, I9).
```

(2) Asset Register Redesign, the `compactOnMobile` bullet (`:256`). Replace:

```
Since phase 2B plan 1 the prop lives on the shared `PageHeader`, and `MasterDataHeader` is a thin wrapper of it until plan 2B-5 deletes it.
```

with:

```
Since phase 2B plan 1 the prop lives on the shared `PageHeader`; since plan 2B-3 the register calls `PageHeader compactOnMobile` itself (still the prop's only user), and `MasterDataHeader`, a thin wrapper of `PageHeader`, has no caller left until plan 2B-5 deletes it.
```

(3) Phase 1, Final-review fixes, the register tabs (`:301`). Replace:

```
so the active tab's `md:border-b-2` sits inside the scroller and is never clipped.
```

with:

```
so the active tab's `md:border-b-2` sits inside the scroller and is never clipped. Since 2B plan 3 the tabs are `TabNav`: both lines are inset shadows at every width, and phones show the underline instead of pills.
```

(4) The new section. Replace the last bullet of the 2B plan 2 section and the heading after it (`:580-582`) with the block below, which ends with that same heading. Replace `<today>` with the date of Step 1. Write the three `<from task-15-findings.md>` markers from `task-15-findings.md` in the shape of the 2B plan 2 section's bullets: the widths marker as one sentence with the "Register widths" lines (each preset at 1440 and 1366: overflow, actions column, row height); "Dev-app check (Task 15)" as one paragraph (what was checked and where, the results, the `/th/assets` load time before → after, fixes with their commits or "none", accepted mixes, existing issues not caused by 2B-3); "Still open" as nested bullets when it has more than two items. If Step 3 printed other line numbers, use its fragments in the "Handed on to 2C plan 4" bullet and the table.

```
- Next: merge this branch; then 2B plan 3 (the asset register) in the main checkout and 2C plan 3 in a worktree beside it (spec §8.1–8.2), then the pipeline above.

## Open Go-Live Decisions
```

with:

```
- Next: 2B plan 3 (below, the asset register) in the main checkout and 2C plan 3 in a worktree beside it (spec §8.1–8.2), then the pipeline above.

## UI Round 4 Phase 2B Plan 3 Asset Register (<today>)

- Branch `feat/ui-phase2b-plan3` (from `master` `886a290`: 2B plans 1–2 merged, not deployed), in the main checkout beside 2C plan 3 in `.worktrees/ui-phase2c-plan3`. Spec `docs/superpowers/specs/2026-10-12-ui-phase2b-design.md` (its §10 rulings I1–I34 override the section files in `docs/superpowers/specs/2026-10-12-ui-phase2b/`; the register is §7) · plan `docs/superpowers/plans/2026-10-13-ui-phase2b-plan3.md` · canonical values in `DESIGN.md`.
  - Plan 2B-3 moves the 14 files of spec §8.7 onto the 2B-1 primitives: the register page and its toolbar, search field, filter sheet body, status tabs, chips, sort, column and export menus, table, phone list and row actions; the column widths in `src/lib/asset-register-columns.ts`; and the header of the import/export page. One commit per file.
  - No new primitive, schema, migration, API, RBAC, dependency, index or token, and no server change: the register's queries, its URL filters, `AssetRegisterNavigationProvider` and its row model are untouched.
- **2C plan 4 may start once this branch and 2C plan 3 have both merged** (spec B7, §8.1): 2B is done with the three files it shares with plan 4, `asset-register-table.tsx`, `D/assets/page.tsx` and `D/asset-management/import-export/page.tsx` ("Handed on to 2C plan 4" below gives their state).
- **Deploy:** none, as for 2B plans 1–2: one deploy after all of phase 2; `ab1b873` stays the rollback point (no schema change).
- **The register contract holds** (`DESIGN.md` asset register pattern; spec §7.3, I3, I4, I26):
  - Widths: `actions` 150 → 172 and `companyBranch` 120 → 116. The operations preset (the default) goes 1,094 → 1,116 and accounting 1,098 → 1,116, within the 1,117px a 1440px screen leaves; audit (1,276) and all (1,632) scroll as before. The 172px column holds the 120px next step and ⋯ between `pl-1.5 pr-2` (157.5 ≥ 156). Measured at 1440 and 1366: <from task-15-findings.md>.
  - Rows stay dense until phase 3: `px-3 py-2`, 56px with the 40px thumbnail, in the file-local `headerClasses` / `cellClasses` of `asset-register-table.tsx`, with the `DataTable` look (white 13/500 header, soft row lines). `DataTable` itself has one density (I3).
  - The key and actions columns stay pinned, with a line on their inner edge instead of the edge shadow (R-j). The table no longer imports `hasRemainingHorizontalContent`; `src/lib/horizontal-scroll.ts` stays for `asset-detail-tabs.tsx`. The register keeps its own scroll hint, `isOverflowing` + `asset.tableScrollHint` (I4).
- **What changed, file by file:**
  - `D/assets/page.tsx`: `PageHeader compactOnMobile className="mb-4 md:mb-6"` with the create link (`buttonVariants({ size: "md" })` and `Plus`) as its action (I32); the tab counts through `formatCount`. `MasterDataHeader` has no caller left; plan 2B-5 deletes it.
  - Toolbar: no card from `md` (the sticky phone bar is unchanged), the three scope selects are `FilterSelect hideLabel fieldSize="md"` (their `key`, `defaultValue` and `onChange` kept), and ⚙ is `Button variant="outline" size="md"`. Search: `SearchField` with `fieldSize="md"`, `loading`, `onClear` and `clearLabel`; the 400ms debounce, the IME handling, Enter and the GET form without JavaScript are unchanged.
  - Filter sheet (its body only; `ui/sheet.tsx` is untouched): seven `FilterSelect`s keyed by filter name and value (`` key={`status-${filters.statusId}`} ``, because an unset filter is the same empty value in every sibling), status and condition with their help button in `labelAction` (24px), and "แสดง N รายการ" `busy` while the count loads. `function LabeledSelect` is gone, and the call no longer passes `closeLabel` or `pr-14`.
  - Status tabs: a server wrapper of `TabNav` with `data-asset-status-tabs` and the full-bleed class (I9). Chips: a server wrapper of `FilterChipList` (I7).
  - Sort, column and export triggers: `Button`. The sort trigger is `ghost` below `md` (a frame would touch the lines of the 44px summary bar) and takes the outline colors from `md` through `md:` classes, `md:active:*` included, because Tailwind 4.2.4 emits `md:bg-surface` after `active:bg-muted`; a change to the `ghost` or `outline` variant must update them.
  - Table: `DataTableBody`, `ClickableTableRow`, `DataTableHead sort` on tag, name and purchase price, `TableEmptyRow` ("ล้างตัวกรอง" is the secondary button while a filter is on), and `DataTableFoot` with `Pagination`, which prints the range itself (`labels.range`); 44px checkbox labels with `checkboxVariants()` and `data-no-row-click`; `orNil(asset.custodian, t("noCustodian"))`; `formatMoney` right-aligned under `asset.purchasePriceBaht`; the tag and the serial in `tag`; the pinned cells keep the row fill while ⋯ is open. `SortableHeader`, the edge shadow, `formatCurrency` and `toLocaleString` are gone from the file.
  - The bulk-action bar keeps its place, frame, `fixed` bottom offset and `shadow-lg` for phase 3 (with QR label printing, R-q); its four buttons are `Button` and its count uses `formatCount`.
  - Phone list: the tag in `tag` in both row kinds, `checkboxVariants({ size: "lg" })` in select mode, `border-soft` row lines.
  - Row actions: `AssetRegisterRowActions` keeps its file, name and props and builds the data-only props of `RowActions` (ช1, I5): the next step on desktop rows only (an empty 120px slot when nothing is next), a transactions group (`asset.transactionMenu`; a blocked one is `unavailable` with its reason), edit and clone, and "ลบ" only with `canDelete`. The hand-written ⋯ sheet and `sheetItemClasses` are gone; the delete confirm and the focus return come from `RowActions`.
  - `D/asset-management/import-export/page.tsx`: `PageHeader` in a `space-y-6` root, and the four facts of each import batch are a `KeyValueList`, which replaced `function Info` (guard LK1). The import panel, the cards and the rollback box are untouched (2C plan 4 and 2D).
- **Messages:** new `asset.noCustodian` ("ไม่มีผู้ถือครอง" / "No custodian"). The price header reads the existing `asset.purchasePriceBaht`.
- **Guards:**
  - VFG: R7 17 in 11 files and R1 `{}` unchanged (the register header was a solid `bg-muted`, never `/NN`) · R2 10 in 9 files unchanged; the comment of the `asset-register-table.tsx` row (the phone bulk bar's `shadow-lg`) now names phase 3 · the status-tab test reads `ui/tab-nav.tsx` and checks that the wrapper passes `data-asset-status-tabs`.
  - LFG after this plan (live counts): LH1 24 · LH2 5 · LB1 11 · LP1 7 · LF1 1 · LT1 34 · LT2 1 · LT3 2 · LT4 1 · LT5 3 · LV1 19 · LV2 97 · LV3 35 · LS1 17 · LS2 20 · LK1 7 · LN1 5 · LN2 7 · LR1 0. LB1's budget is still 12 (its slack is the `D/maintenance/[id]/page.tsx` row, 2B-4). `MIGRATED_LIST_FILES` holds 64 files: the 13 screen files of this plan joined; `src/lib/asset-register-columns.ts` is off screen and has no row.
  - `tests/form-migration-guards.test.ts` is not edited (spec §8.11): the register table now counts fewer sites than its rows allow (table below), and 2C plan 4 lowers them.
- **Tests:** no new file. New blocks and edited pins (spec §7.17 as adjusted by §10.9; §10.4 table A row 2B-3): `asset-register-view-model` (the operations preset 1094 → 1116), `asset-register-table-ui` (the row actions wrapper, the table, the phone list and the three triggers), `dropdown-menus-ui` (the ⋯ behaviour is pinned at `ui/row-actions.tsx` now), `asset-register-ux`, `asset-register-filter-ui` (toolbar, filter sheet, tabs, chips and page header), `asset-register-search-ui`, `asset-status-help-ui` and `visual-foundation-guards` (the status-tab test and the R2 comment).
- **Risks:**
  - The default presets have 1px to spare (1,116 of 1,117): a scrollbar wider than 17px or a zoom other than 100% makes them scroll at 1440. The way back is `custodian` 160 → 156 (spec §7.14 item 1).
  - "แสดง N รายการ" cannot close the sheet while the count loads (`busy`); ×, Esc and a tap outside still close it. If people dislike it, drop `busy` and show the spinner again (spec §7.14 item 3).
  - Copying table rows into Excel copies the `sr-only` "ไม่มีผู้ถือครอง" of an empty custodian cell (spec §7.14 item 5).
- **Handed on to 2C plan 4:** 2B touches none of these files again. In `asset-register-table.tsx` (a batch 4 file), the bulk update dialog `<AccessibleDialog` `:681-758` (it was `:697-774`) is untouched, and so are its state `bulkUpdateOpen`, `bulkSaving` and `bulkForm` `:190-192`, `submitBulkUpdate` `:361` and the `Loader2` and `AccessibleDialog` imports; the bulk-action bar `data-asset-bulk-bar` `:462` stays where it is for phase 3 (FMG GL1 and the R2 budget 0 of a new file forbid moving it). In `D/assets/page.tsx`, `<AssetImportPreviewPanel` `:435-479` and its `currentStep` label `:459` (they were `:427-471` and `:451`); in `D/asset-management/import-export/page.tsx`, `<AssetImportPreviewPanel` `:57-101` and its `currentStep` label `:81` (they were `:58-102` and `:82`): both labels wait for 2C plan 4 to delete them with `asset.importWizardCurrentStep`. 2C plan 4 also puts the headers of `asset-scan-search-tool.tsx` and `asset-label-batch-tool.tsx` on `PageHeader` (I13, from 2B plan 1). The table's FMG rows (line numbers of `tests/form-migration-guards.test.ts` and, for the sites, of the table after this plan; the FMG comments still name older lines):

| FMG row | Budget | Live after 2B-3 | Sites left |
|---|---|---|---|
| GF2 `RAW_FIELDS` `:181` | 4 | 4 | `:693`, `:708`, `:723`, `:733` (the dialog's two selects, input and textarea) |
| GF3 `FIELD_CLASS_STRINGS` `:212` | 4 | 4 | `:696`, `:711`, `:728`, `:737` (their class strings) |
| GF7 `OLD_MARKUP` `:293` | 6 | 4 | `:692`, `:707`, `:722`, `:732` (the dialog's four labels) |
| GB1 `LOADER2` `:327` | 1 | 1 | `:753` (the dialog's save button) |
| GL1 `FIXED_BOTTOM_BARS` `:351` | 1 | 1 | `:463` (the bulk-action bar, phase 3) |
| GF5 `CONSTRAINT_FLOORS` `:265` | `[1, 1, 0]` | the same (floors, never lowered) | the reason field of the dialog |
| GD2 `PENDING_FOOTER_PARTS` `:374` | listed | still listed: the dialog `:681` has no `AccessibleDialogFooter` | — |

- **Handed on, later:** phase 3: the register's column sets and the "CODE - ชื่อ" cells in `tag` (I26), the tabs above the toolbar as in the mockup, and the phone bulk bar with QR label printing (R-q) · 2D: nothing passes `AssetStateHelpPopover size="compact"` any more (the prop stays while `tests/asset-status-help-ui.test.ts` pins it).
- Dev-app check (Task 15): <from task-15-findings.md>
- Before/after screenshots: `.superpowers/sdd/screenshots/ui-phase2b-plan3/before/` and `after/` (git-ignored, on the development machine only).
- Still open, for a person before the one phase-2 deploy: <from task-15-findings.md>, together with the open checks of phase 1, 2A, 2C plans 1–2 and 2B plans 1–2 above.
- Next: merge this branch; then 2B plan 4 (the detail pages and skeletons) in the main checkout, and 2C plan 4 in the worktree once 2C plan 3 has merged too (spec §8.1–8.2), then the pipeline above.

## Open Go-Live Decisions
```

Replace the three `<from task-15-findings.md>` markers with the text from the findings; no marker may stay.

- [ ] **Step 8: `docs/99_CHANGELOG.md` (1 or 2 replacements)**

(1) Only if `<today>` is not `2026-10-13`: put a new date block on top. Replace the line `## 2026-10-13` with:

```
## <today>

---

## 2026-10-13
```

(2) The entry, directly under the `## <today>` heading (above `### หน้ารายการตัดจำหน่าย ตรวจนับ และซ่อมบำรุง (UI รอบ 4 เฟส 2B plan 2)` when `<today>` is 2026-10-13, above `---` otherwise). Replace:

```
## <today>

```

with the block below. Write the "ตรวจบนแอป (Task 15)" bullet from `task-15-findings.md`, in Thai, in the shape of the 2B plan 2 entry's bullet, with the register widths at 1440 and the `/th/assets` load time before → after in it.

```
## <today>

### ทะเบียนทรัพย์สิน (UI รอบ 4 เฟส 2B plan 3)

Branch `feat/ui-phase2b-plan3` (จาก `master` `886a290` ทำคู่กับ 2C plan 3 ใน worktree) · design `docs/superpowers/specs/2026-10-12-ui-phase2b-design.md` (ข้อ 10 ใช้แทนไฟล์ส่วน ทะเบียนอยู่ข้อ 7) · plan `docs/superpowers/plans/2026-10-13-ui-phase2b-plan3.md` · ค่าทั้งหมดอยู่ใน `DESIGN.md`

- **ขอบเขต:** 14 ไฟล์ตามสเปกข้อ 8.7 (หน้าทะเบียนทรัพย์สิน แถบค้นหา ช่องค้นหา sheet ตัวกรอง แท็บสถานะ ชิปตัวกรอง เมนูเรียง คอลัมน์ และส่งออก ตาราง รายการบนมือถือ ปุ่มในแถว ความกว้างคอลัมน์ และหัวหน้านำเข้า/ส่งออก) · ใช้ของกลางจาก 2B-1 ไม่มีของกลางใหม่ · ไม่เปลี่ยนขั้นตอนงาน ไม่แตะ schema ไม่เพิ่ม API ไม่เพิ่ม token ไม่แก้ query
- **สัญญาของทะเบียนคงเดิม:** ชุดคอลัมน์ "ปฏิบัติการ" (ค่าตั้งต้น) และ "บัญชี" กว้าง 1,116px จึงไม่เลื่อนแนวนอนที่จอ 1440 · คอลัมน์การดำเนินการกว้างขึ้นจาก 150 เป็น 172px คอลัมน์บริษัท/สาขาแคบลงจาก 120 เป็น 116px · แถวยังแน่น (`px-3 py-2` สูง 56px เพราะรูปย่อ 40px) จนถึงเฟส 3 · คอลัมน์รหัสทรัพย์สินและคอลัมน์การดำเนินการค้างตำแหน่งเหมือนเดิม · ข้อความบอกให้เลื่อนขึ้นเฉพาะตอนตารางล้นจริง
- **แถบค้นหา:** บนคอมไม่มีกรอบการ์ด · ช่องค้นหา select 3 ช่อง และปุ่มตัวกรองสูง 36 (เดิม 40) select มีลูกศรแบบกลาง · ค้นหาขณะพิมพ์เหมือนเดิม (รอ 400ms อย่างน้อย 2 ตัวอักษร ไม่ค้นระหว่างพิมพ์ภาษาไทย Enter ค้นทันที × ล้าง) · มือถือแถบยังติดบนสูง 44
- **แท็บสถานะ:** เป็นแท็บเส้นใต้ทุกขนาดจอ (บนมือถือเคยเป็นปุ่มมน) เป้ากด 44 บนมือถือ · ตัวเลขไม่มีพื้นสี
- **sheet ตัวกรอง:** ป้ายเข้มขึ้นขนาด 13px · ปุ่ม ? ข้างสถานะและสภาพใหญ่ขึ้นเป็น 24px · ปุ่ม "แสดง N รายการ" มีไอคอนหมุนและกดปิดไม่ได้ระหว่างนับ (ปิดด้วย × Esc หรือแตะนอก sheet ได้)
- **ตาราง:** หัวตารางพื้นขาว ตัวหนังสือ 13px สีจาง ไม่ใช้ตัวพิมพ์ใหญ่ · หัวคอลัมน์ที่เรียงอยู่มีลูกศร · ปุ่มงานถัดไปในแถวกว้างเท่ากันทุกแถว (120px) ไม่มีพื้น มีพื้นฟ้าอ่อนเมื่อชี้หรือกด Tab เข้าแถว · ⋯ ตรงแนวกันทุกแถว (แถวที่ไม่มีงานถัดไปเว้นช่องไว้) · คอลัมน์การดำเนินการไม่มีเงา มีเส้นคั่นแทน · ราคาซื้อเป็น "1,234.00" ชิดขวา หัวคอลัมน์ "ราคาซื้อ (บาท)" · ค่าว่างเป็น "—" (ผู้ถือครองที่ว่าง โปรแกรมอ่านหน้าจออ่านว่า "ไม่มีผู้ถือครอง") · รหัสทรัพย์สินและ Serial เป็นตัว monospace · checkbox กดง่ายขึ้น (44×44) คลิกรอบ checkbox ไม่เปิดหน้ารายละเอียด · ไม่พบรายการเมื่อมีตัวกรอง ปุ่ม "ล้างตัวกรอง" เป็นปุ่มรอง · ท้ายตารางแสดงช่วงแถวและหน้าในบรรทัดเดียว
- **ปุ่มบนแถบสรุป:** ปุ่มคอลัมน์และส่งออกเป็นปุ่มขอบแบบกลาง · ปุ่มเรียงบนมือถือไม่มีกรอบ บนคอมหน้าตาเหมือนปุ่มขอบ · ปุ่ม "เลือก/เสร็จ" บนมือถือเป็นปุ่มสีจาง · แถบคำสั่งกลุ่มอยู่ที่เดิม ปุ่ม 4 ปุ่มเป็นปุ่มกลาง (ตัวแถบรอเฟส 3 พร้อมงานพิมพ์ป้าย QR)
- **ปุ่มในแถว:** ⋯ ยังมีส่งมอบ รับคืน โอนย้าย (ที่ทำไม่ได้บอกเหตุผล) แก้ไข คัดลอก และ "ลบ" เฉพาะผู้มีสิทธิ์ลบ ต้องยืนยันเหมือนเดิม · บนมือถือ ⋯ เปิด sheet ของกลาง หัวเป็นรหัสทรัพย์สิน รายการสูง 44 · รหัสทรัพย์สินในรายการมือถือเป็นตัว monospace · checkbox โหมดเลือกหน้าตาตามเบราว์เซอร์
- **หน้านำเข้า/ส่งออก:** หัวเรื่อง 600 · ประวัติการนำเข้าแสดงไฟล์ จำนวนที่นำเข้า ที่ข้าม และผู้อนุมัติเป็นรายการป้ายกับค่า · แผงนำเข้าไม่เปลี่ยน (เป็นของ 2C plan 4)
- **ข้อความ:** เพิ่ม `asset.noCustodian` ("ไม่มีผู้ถือครอง" / "No custodian")
- **guard:** VFG R7 17 · R1 `{}` · R2 10 คงเดิม · LFG หลัง plan: LH1 24 · LH2 5 · LF1 1 · LT1 34 · LT2 1 · LT3 2 · LV2 97 · LV3 35 · LK1 7 · LN1 5 (LB1 11 · LP1 7 · LT4 1 · LT5 3 · LV1 19 · LS1 17 · LS2 20 · LN2 7 · LR1 0 คงเดิม) · `MIGRATED_LIST_FILES` 64 ไฟล์ · ไม่แก้ `form-migration-guards` ตารางทะเบียนนับต่ำกว่าเพดานแล้ว (GF7 4 จาก 6) ให้ 2C plan 4 ลดตัวเลข
- **test:** ไม่มีไฟล์ใหม่ · เพิ่มและแก้ pin ตามสเปกข้อ 7.17 (ปรับตามข้อ 10.9) ใน `asset-register-table-ui`, `asset-register-filter-ui`, `asset-register-search-ui`, `asset-register-ux`, `asset-register-view-model` (1094 → 1116), `asset-status-help-ui`, `dropdown-menus-ui` และ `visual-foundation-guards`
- **ความเสี่ยง:** ชุดคอลัมน์ค่าตั้งต้นเหลือที่ 1px (1,116 จาก 1,117) ถ้าแถบเลื่อนกว้างกว่า 17px หรือ zoom ไม่ใช่ 100% จะเลื่อนแนวนอนที่ 1440 · ทางถอย: คอลัมน์ผู้ถือครอง 160 → 156px
- **deploy:** ไม่ deploy ใน 2B · deploy ครั้งเดียวหลังเฟส 2 ทั้งหมดและผู้ใช้ตรวจเครื่องจริง · ถอยกลับไป `ab1b873` ได้เพราะไม่มี schema เปลี่ยน
- **ตรวจบนแอป (Task 15):** <จาก task-15-findings.md>
- ภาพก่อน/หลัง: `.superpowers/sdd/screenshots/ui-phase2b-plan3/before/` และ `after/` (git ignore อยู่บนเครื่องพัฒนา)
- ต่อไป: merge แล้วทำ 2B-4 (หน้ารายละเอียดและ skeleton) ใน checkout หลัก · 2C plan 4 ใน worktree เมื่อ 2C plan 3 merge แล้วด้วย (สเปกข้อ 8.1) · แล้ว 2B-5 · 2D · งาน V

```

Replace the `<จาก task-15-findings.md>` marker with the text from the findings, and every `<today>` with the date; no marker may stay.

- [ ] **Step 9: `.impeccable/design.json`: no change**

No component entry changes in 2B-3 (spec §7.16; the page-header, table, pagination, tabs, row-action and filter-chip entries came in 2B-1): leave the file and its `generatedAt` as they are.

Run: `git diff --quiet 886a290 -- .impeccable/design.json && echo DESIGN-JSON-UNCHANGED`
Expected: `DESIGN-JSON-UNCHANGED`.

- [ ] **Step 10: Check**

Run: `node <temp>/check-docs-2b3.mjs`
Expected: 13 `ok` lines, exit 0, and no "lacks these live fragments" list.

Run: `grep -n "<from task-15\|<จาก task-15\|<today>" DESIGN.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md docs/14_UI_UX_DESIGN_SYSTEM.md docs/11_FEATURE_LIST.md .impeccable/design.json`
Expected: nothing.

Run: `git diff --numstat`
Expected: exactly the five files: `DESIGN.md` `10 10` (one line in §4, eight lines of the register block, one line in Empty Values), `docs/14_UI_UX_DESIGN_SYSTEM.md` `2 2`, `docs/11_FEATURE_LIST.md` `1 1`, `DEVELOPER_HANDOFF.md` about `54 4` (with one line per marker; nested "Still open" bullets add lines), `docs/99_CHANGELOG.md` about `22 0` (`26 0` with a new date block). A file that shows every line changed was normalized: restore its line endings.

Run: `node -e "for (const f of process.argv.slice(1)) { const s = require('fs').readFileSync(f, 'utf8'); console.log(f, (s.match(/\r\n/g) || []).length, (s.match(/\n/g) || []).length) }" DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md docs/11_FEATURE_LIST.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md`
Expected: the two numbers equal on every line (CRLF throughout).

Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: all green, with the test count Task 15 ended with (1941 tests, 1940 pass, 0 fail, 1 skipped when Task 15 added no test: `886a290`'s 1927 plus Tasks 1–3 +6, Tasks 4–9 +4 and Tasks 10–14 +4). `tests/audit-round-cancellation.test.ts` reads the handoff, the changelog and the feature list; no other test reads these files.

- [ ] **Step 11: Commit**

```bash
git add DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md docs/11_FEATURE_LIST.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md
git commit -m "docs(ui): phase 2B plan 3 asset register and the 2C plan 4 hand-off in DESIGN.md, handoff, feature list, design-system index and changelog

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 5 files in the commit (`git show --stat HEAD`). `git status --short` prints only the untracked paths of Global Constraints.

---

### Task 17: Final verification, rebase if needed, wiki and memory (controller runs this task)

**Files:**
- Modify: `docs/99_CHANGELOG.md`, `DEVELOPER_HANDOFF.md` (verify numbers)
- Modify (vault `D:\Obsidian\Eltross`): `AssetSystem/ams-status.md`, `AssetSystem/ams-log.md`, `AssetSystem/ams-open-questions.md`
- Modify (auto-memory): `review-2026-10-priorities.md`

**Interfaces:**
- Consumes: Tasks 1–16 committed.
- Produces: the branch ready for superpowers:finishing-a-development-branch.

- [ ] **Step 1: Verify.**
  - Run `npm run verify` and record the test count and the build page count.
  - If it passed, add one bullet to the 2B-3 entry in `docs/99_CHANGELOG.md`, directly above its "ตรวจบนแอป (Task 15)" bullet: `` `npm run verify` ผ่าน (test N · ผ่าน N · ข้าม 1 · build X/X หน้า) ``.
  - Add the same numbers to the 2B-3 section of `DEVELOPER_HANDOFF.md`, directly above its "Dev-app check (Task 15)" bullet: ``- Verification: `npm run verify` passes (tests N · pass N · skipped 1 · build X/X pages).``
  - Both files are CRLF: insert with an exact-string edit that writes `\r\n`.
  - Run `npm test` again (`tests/audit-round-cancellation.test.ts` reads both files).
  - Commit both files with `docs(ui): record phase 2B plan 3 verify results` and the Co-Authored-By line.

- [ ] **Step 2: Rebase if 2C plan 3 merged first (spec §8.2).** Both plans share one repository, so `master` is already local. Run `git merge-base --is-ancestor master HEAD && echo UP-TO-DATE`.
  - If it prints `UP-TO-DATE`, skip to Step 3.
  - Otherwise `master` moved (2C plan 3 merged). Run `git rebase master` and resolve conflicts by spec §8.2:
    - `DESIGN.md`: keep both sides; where both touched the same line, write it so it matches the code after both merges.
    - `tests/visual-foundation-guards.test.ts`: keep both sides; a budget row both lowered takes the lower number; never raise.
    - `messages/th.json`, `messages/en.json`: take `master`'s version, then re-run this plan's change file (`node scripts/messages-edit.mjs <temp>/<the asset.noCustodian change file>`).
    - `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md`, `docs/11_FEATURE_LIST.md`: keep both sections, in merge order (2C plan 3's first).
    - A conflict in any other file means a fence leaked: abort the rebase (`git rebase --abort`), find the commit that touched the other plan's file, and stop to report.
  - After the rebase: run `node <temp>/check-docs-2b3.mjs` (Task 16) and, if it prints other FMG line fragments, update the handoff text it names (new commit); then `npm run verify`, `node <temp>/p2b1-precheck.mjs --budgets`, the production build, and the dev-app rows "หลัง rebase" of spec §8.7 (`/th/assets` ⋯ delete up to the confirm and cancel; the filter sheet) at 1440 and 375. Update the verify numbers of Step 1 if they changed (new commit).

- [ ] **Step 3: Wiki.** Read `AssetSystem/_schema/ams-wiki-schema.md` first, then:
  - `ams-status.md`: the 2B row says plan 2B-3 is built on `feat/ui-phase2b-plan3` with the verify numbers, not merged, not deployed, and that 2C plan 4 may start once both 2B-3 and 2C plan 3 have merged. Fix any sentence the row now contradicts (rule 8).
  - `ams-log.md`: an entry at the top of `## <today>`.
  - `ams-open-questions.md`: the 2B-3 checks for a person from Task 15 Step 9 (one new numbered item) · anything Task 15 recorded as found but not caused by 2B-3.
  - Run `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` from `D:\Obsidian\Eltross`.
  - Commit only those three files with an `ingest:` message. Other sessions have uncommitted changes in the vault; never stage them.

- [ ] **Step 4: Memory.** Update `review-2026-10-priorities.md`: 2B-3 built on `feat/ui-phase2b-plan3`, not merged, not deployed; the state of 2C plan 3; next: the merge choice, then 2B-4 (and 2C plan 4 once both have merged).

- [ ] **Step 5:** Use superpowers:finishing-a-development-branch.

