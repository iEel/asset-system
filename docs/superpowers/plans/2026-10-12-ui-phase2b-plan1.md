# UI Round 4 · Phase 2B List Pages and Page Frames · Plan 2B-1 (primitives, master data, sidebar, header back links) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared list and page-frame primitives of phase 2B, move the 8 master-data list pages and the user list onto them, give the asset register a first-level sidebar item, and give every form header one back button. Workflows, data and validation stay the same. The only server change is the read-only pagination query of the departments list (B4).

**Architecture:**
- **Primitives first (B8).** Tasks 3–12 add `PageHeader`/`PageBackLink`, `DataTable` (+ `TableEmptyRow`, `DataTableScrollArea`), the extended `Pagination` with `src/lib/list-pagination.ts`, `FilterSelect`/`FilterChipList`/`FilterFormActions`, `RowActions` (ช1), `TabNav`, `StatStrip`, `KeyValueList` and `ContentPanel divided` in `src/components/ui/`, each with source-text tests.
- **Guards before migrations.** Task 1 turns VFG R7 into per-file budgets and creates `tests/list-frame-guards.test.ts` (LFG) at the HEAD seeds. Every later commit lowers only its own rows, so old patterns cannot come back.
- **One page or form = one commit.** Tasks 13–21 move the master-data lists and users; Tasks 22–24 change form headers and the three 2C-migrated files (this is the only plan with no 2C plan open, spec R-e).
- **Controller tasks:** Task 0 (base check and before screenshots), Task 25 (verify, production build, dev-app check) and Task 27 (verify numbers, wiki, memory). Task 26 writes the repo docs.

**Tech Stack:** Next.js 16.4 App Router · React 19 · Tailwind CSS 4.2.4 · class-variance-authority 0.7.1 · tailwind-merge 3.5 (through `cn()`) · radix-ui · next-intl 4 · Prisma 7 (read-only queries) · `node --test` with Node 24 type stripping.

**Spec:** `docs/superpowers/specs/2026-10-12-ui-phase2b-design.md`, with section files in `docs/superpowers/specs/2026-10-12-ui-phase2b/` (`00-decisions.md`, `00-synthesis.md`, `03-primitives.md` … `09-guards-tests.md`).
- **Spec §10 (rulings I1–I34) overrides the section files wherever they conflict.** This plan already applies them; when a task and a section file disagree, the task wins.
- The task numbers are those of spec §10.3.

## Global Constraints

- **Git:**
  - Work on branch `feat/ui-phase2b` (spec commits `cfaca49`, `b16d152` on top of `master` `d38a0ee`).
  - Never run `git checkout`, `git switch`, `git reset`, `git stash`, `git rebase` or `git clean`, and never touch `master`.
  - Commit only the files your task names. One migrated page or form file is one commit unless the task groups files on purpose.
  - End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Next.js 16.4** is not the Next.js in your training data. Read `node_modules/next/dist/docs/` before using an API you have not seen in this repo.
- **Line endings:**
  - `git config core.autocrlf` is `true`. Most `src/` and `tests/` files are CRLF in the working tree, including `tests/visual-foundation-guards.test.ts`, `tests/form-migration-guards.test.ts` and `tests/helpers/source-files.ts`; several are LF (for example `src/lib/utils.ts`, `src/components/ui/field.tsx`, `field-variants.ts`, `segmented.tsx`).
  - Before you edit a file, run `git ls-files --eol <file>` and keep what it uses. Edit with exact-string replacement; never normalize a file. New files are LF.
  - Tests that read source files strip `\r` (`.replace(/\r\n/g, "\n")`) before multi-line regexes. A test that reads a CRLF file without stripping must not get a new regex with `\n` (spec §9.6).
- **Tests:**
  - `npm test` runs `node scripts/run-tests.mjs` over `tests/**/*.test.{ts,mjs,js}` with Node 24 type stripping. Run one file with `node --test tests/<file>.test.ts`.
  - Modules that tests import use relative `.ts` imports (no `@/`) and erasable TypeScript only. Tests cannot import `.tsx`; they check `.tsx` by reading the source text.
  - Use the shared helpers in `tests/helpers/source-files.ts` (`readSourceFiles`, `findMatches`, `countMatchesByFile`, the JSX reader).
- **Baseline before Task 1** (HEAD `b16d152`, whose `src/`, `tests/` and `messages/` equal `d38a0ee`):
  - `npm test`: 1812 tests, 1811 pass, 0 fail, 1 skipped.
  - `npx tsc --noEmit`: clean.
  - `npm run lint`: 0 errors and 146 warnings, all under `.agents/`.
  - Task 0 re-checks these numbers.
- **Every task ends with all of these green:** `npm test` (0 fail) · `npx tsc --noEmit` · `npm run lint` (0 errors, no new warnings in `src/` or `tests/`). Report any failure by name.
- **Off limits:**
  - Do not run `npm ci`, `npm install`, `npm run build`, the dev server, `npx shadcn …`, or anything against a database.
  - Do not read or print `.env` or `.env.prod-admin`.
  - Leave the untracked paths alone: `.codex/`, `.impeccable/critique/`, `.playwright-mcp/`, `.superpowers/brainstorm/`, `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`.
  - Do not run skill helper scripts (for example the impeccable launcher); they make network calls.
- **No new tokens (2A I21).** No task adds a custom property to `:root`, `@theme inline` or `@theme`, and no task edits `tests/design-tokens-contrast.test.ts`. Never write `rounded-[…]`. Every new class must compile with Tailwind 4.2.4 against `src/app/globals.css`.
- **2C fences (spec §2, §8):**
  - Do not touch the chrome of `ui/sheet.tsx`, `ui/dialog.tsx`, `ui/accessible-dialog.tsx`, `ui/alert-dialog.tsx`, `ui/field.tsx` or `ui/file-dropzone.tsx`.
  - Never edit `tests/form-migration-guards.test.ts`, never rename or move a file listed in its `BATCH_FILES`, and keep it green.
  - Never run a formatter on 2C files (21 of them change in Tasks 22–24).
  - In `system-settings-form.tsx`, never touch the tab row `:948-967` (O7).
- **Look (B3):** `h1` weight 600 · table header white, 13px weight 500, faint ink, no uppercase, 12px frame · rows `p-3` (about 46px) · toolbars without a frame, controls 36 from `md` and 44 below · `TabNav` underline at every width, 44 targets on phones.
- **Validation and behavior:** keep every `required`, `maxLength`, toast, `disabled` gate, `returnTo` and confirm step. Delete in master data moves into ⋯ and still asks the same confirm (B5). No validation UX changes (V track).
- **Server (B4):** only the departments list gets a paginated read-only query in this plan (`findMany` + `count` in one `Promise.all`, the old `orderBy` plus `{ id: "asc" }`). No schema, migration, API, dependency or index.
- **Messages:** edit `messages/th.json` and `messages/en.json` only through `node scripts/messages-edit.mjs <changes.json>`, run from the repo root, with the JSON kept in your temp folder. Thai follows `docs/19_THAI_GLOSSARY.md` and must pass `tests/thai-glossary.test.ts`; every key exists in both files. The copy of every new key is the table in spec §10.2 (approved by the user 2026-10-12).
- **Deploy:** no task deploys. The user decided on 2026-10-12 to deploy once after all of phase 2 (B9).

## Review Focus

1. **A user who opens ⋯ on a master-data row and picks "ลบ"** must get the same confirm as today; Cancel closes it with focus back on ⋯, and nothing is deleted. Clicking ⋯ or an item inside it must never also open the row's edit page. Pinned by `tests/row-actions-ui.test.ts` (`data-no-row-click` on the trigger and the menu content, the delete hook's `returnFocusRef`) in Task 7, and checked on the dev app in Task 25 with Cancel only.
2. **A user who lands on a page number past the last page** (an old link, or after deletes) must see the last page, not an empty table that says "หน้า 9 จาก 3". Pinned by the `lastListPage` cases in `tests/list-pagination.test.ts` (Task 5) and the `redirect(` check per page in `tests/list-pages-ui.test.ts` (Tasks 13–21).
3. **A user who filters a list, goes to page 2, opens a row and presses "กลับ"** must land on the same filters, page and page size. Pinned by `tests/master-data-return-navigation.test.ts` (passes unchanged) and the `appendListPage` cases of `tests/list-pagination.test.ts` (Task 5); checked on `/th/master-data/departments` in Task 25.
4. **A keyboard user who tabs into a table row** must see the whole row highlighted while focus is on its link or ⋯, open ⋯ with Enter, and get focus back on ⋯ after Esc. Pinned by the `group/row` and `focus-within` classes in `tests/list-primitives-ui.test.ts` (Task 4) and the trigger tests in `tests/row-actions-ui.test.ts` (Task 7).
5. **A user with only `asset:view`** must see "ทะเบียนทรัพย์สิน" as the first item of the asset section, no empty groups, and the right item marked active on `/th/assets/<id>`. Pinned by `tests/sidebar-menu-structure.test.ts` (Task 2) with `tests/permission-aware-navigation.test.ts` and `tests/navigation-active.test.ts` passing unchanged; checked with two accounts in Task 25.

## File structure

| File | What changes | Task |
|---|---|---|
| `tests/visual-foundation-guards.test.ts`, `tests/list-frame-guards.test.ts` (new) | R7 per-file budgets · LFG with 19 guards at the HEAD seeds | 1 |
| `src/components/layout/sidebar.tsx`, `messages/*`, `tests/sidebar-menu-structure.test.ts` (new) | B1 menu: register first, 2 groups, depth ≤ 2, unique icons | 2 |
| `src/components/ui/page-header.tsx` (new), `src/components/master-data/master-data-layout.tsx` | `PageHeader`, `PageBackLink` · `MasterDataHeader` thin wrapper · `MasterDataSearch` on `SearchField` (Task 12) | 3, 12 |
| `src/components/ui/data-table.tsx`, `data-table-scroll.tsx` (new), `clickable-table-row.tsx` | table parts, `TableEmptyRow`, scroll hint, `group/row` | 4 |
| `src/components/ui/pagination.tsx`, `src/lib/list-pagination.ts` (new) | range, page size, `aria-live` · page helpers | 5 |
| `src/components/ui/filter-select.tsx`, `filter-chips.tsx` (new), `filter-panel.tsx` | `FilterSelect`, `FilterChipList`, `FilterFormActions` | 6 |
| `src/components/ui/row-actions.tsx` (new), `dropdown-menu.tsx` | `RowActions` ช1 · exported menu item classes | 7 |
| `src/components/ui/tab-nav.tsx`, `stat-strip.tsx`, `key-value-list.tsx` (new), `content-panel.tsx` | `TabNav`, `StatStrip`, `KeyValueList`, `ContentPanel divided` | 8–11 |
| `src/app/[locale]/(dashboard)/master-data/*/page.tsx` (8), `src/components/master-data/supplier-list-view.tsx`, `src/app/[locale]/(dashboard)/admin/users/page.tsx`, 9 `*-delete-button.tsx` (deleted) | master-data lists and users on the primitives | 13–21 |
| 18 form and new-page files, 5 operation form headers | `PageBackLink`, `PageHeader` | 22, 23 |
| `src/components/admin/system-settings-form.tsx`, `src/components/assets/asset-batch-form.tsx`, `src/components/admin/depreciation-policy-builder.tsx` | table headers, numbers | 24 |
| `tests/list-primitives-ui.test.ts`, `row-actions-ui`, `list-pagination`, `list-filters-ui`, `list-pages-ui` (new) and pins of spec §10.4 table A | tests | 1–24 |
| `DESIGN.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md`, `.impeccable/design.json` | plan 2B-1 docs | 26, 27 |

---

### Task 0: Base check and before screenshots (controller runs this task, not an implementer)

**Files:**
- Create then delete: `.claude/launch.json` (only if no dev server is running; never committed)
- Evidence: `.superpowers/sdd/screenshots/ui-phase2b-plan1/before/` (git-ignored)

**Interfaces:**
- Consumes: HEAD before Task 1.
- Produces: the base check, the baseline numbers, the seed recount, and the before images Task 25 compares against.

- [ ] **Step 1: Check the base.**

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2b`

Run: `git merge-base --is-ancestor d38a0ee HEAD && git diff --quiet d38a0ee HEAD -- src tests messages scripts prisma && echo BASE-OK`
Expected: `BASE-OK`

If it does not print `BASE-OK`, code changed after `d38a0ee`. The seeds in Task 1 and the old snippets in Tasks 2–24 may be stale: run each task's precheck before dispatching it, update the task text where a count or snippet differs, and record a ruling in the ledger.

- [ ] **Step 2: Baseline.** Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: 1812 tests (1811 pass, 0 fail, 1 skipped); tsc clean; lint 0 errors and 146 warnings, all under `.agents/`. Record the numbers in the ledger.

- [ ] **Step 3: Recount the seeds.** Save `p2b1-precheck.mjs` from Task 1 Step 1 in the controller's temp folder and run it from the repo root. Every seed must equal spec §10.4 table C column "ที่ HEAD". On any difference, stop and update Task 1's `BUDGETS` before dispatching it.

- [ ] **Step 4: Confirm the dev database.** Read the `.env` keys `DATABASE_URL` and `DB_USER` without printing secrets. The database must be `asset_management_dev` and the user `asset_dev`. If not, stop.

- [ ] **Step 5: Open the app.**
  - If the user's dev server answers on `http://localhost:3000`, use it.
  - Otherwise create `.claude/launch.json` (`runtimeExecutable: "npm"`, `runtimeArgs: ["run", "dev"]`, `port: 3000`) and run `preview_start`.
  - Log in with the seed admin from `prisma/seed.ts`; do not echo the password.

- [ ] **Step 6: Pick ids.** From each list page take the first row's edit id (branches, categories, companies, departments, employees, locations, suppliers, users) and one brand id (`/th/master-data/brands?brand=<id>`). Find a departments filter that returns more than 25 rows if one exists. Record them in the ledger.

- [ ] **Step 7: Before screenshots.** Save to `.superpowers/sdd/screenshots/ui-phase2b-plan1/before/` as `<view>-<width>.png`, full page plus the `main` scroll area scrolled to its bottom:
  - sidebar open and collapsed at 1440 and 1024, and the drawer at 375
  - the 8 master-data list pages and `/th/admin/users` at 1440, 768 and 375
  - `/th/master-data/brands` with a brand selected at 1440
  - the 18 new/edit pages of Task 22 at 1440 and 375 (header only is enough)
  - `/th/asset-management/checkin`, `checkout`, `transfer`, `bulk-move`, `/th/audit/rounds/new`, `/th/assets/batch/new` at 1440
  - `/th/admin/settings` (the three tables) and the depreciation tab at 1440
  - the pages the primitives change before their own plan: `/th/assets`, `/th/audit/findings`, `/th/audit/rounds`, `/th/audit/rounds/<id>`, `/th/audit/rounds/<id>/pending`, `/th/disposal`, `/th/maintenance` at 1440 and 375
  - Save nothing in any form.

- [ ] **Step 8: Clean up.** Stop any server you started and delete `.claude/launch.json`. `git status --short` must show only the untracked paths in Global Constraints. No commit in this task.


---

### Task 1: Guards · VFG R7 per file and `tests/list-frame-guards.test.ts` at the HEAD seeds (and the precheck and budget scripts that later tasks reuse)

Spec §10.3 row 1, with §8.4 (the 31 rows of `TABLE_HEADER_FILLS`), §9.2.2 (the new R7 test), §9.3 (the LFG file, its counters and the sample test), §9.4 (the per-file seeds and `KEEP`), §10.4 table C (the seeds, column "ที่ HEAD") and rulings I11, I14 and I15. Tests only: no file under `src/` changes, no message changes, no new class (so no Tailwind probe).

Rulings this task applies:
- **I15, §9.3:** one new guard file, `tests/list-frame-guards.test.ts` (LFG), with the 19 guards LH1…LR1, the L0 check and the sample test of the counters. Its counters are the regexes of §9.3.1 verbatim (the ones `recount10.mjs` used for table C).
- **Table C, §9.4:** `BUDGETS` holds every file's count at `d38a0ee` (= HEAD `b16d152` for `src/`), plus the two LB1 rows `0 → 1` of §9.4.1 (`D/audit/rounds/[id]/page.tsx`, `D/maintenance/[id]/page.tsx`): the back items of the mobile action bars, whose wrong icons 2B-2 and 2B-4 swap for `ArrowLeft` inside the `actions` array that O11 owns. These are the only two rows above the HEAD count.
- **§9.4.3 + I11 + I14:** `KEEP` is the §9.4.3 object, written one row per line with its reason. I11 is its LN1 row (the brand picker keeps `aria-current="page"`, 2). I14 changes no `KEEP` row: `D/my-assets/page.tsx` keeps its LH2 and LN2 budget rows until 2B-5, and after 2B both are 0. `KEEP` totals equal table C column "2B-5 = KEEP" (LH1 6 · LB1 7 · LP1 4 · LT1 7 · LV1 8 · LV2 68 · LV3 6 · LS1 5 · LK1 1 · LN1 2 · LN2 1; the other 8 guards 0).
- **§8.4, §9.2.2:** VFG's interim test (`total <= 44`, VFG:249-254) becomes `assertWithinBudget(NEUTRAL_FILL_OPACITY, TABLE_HEADER_FILLS)` with the 31 rows at HEAD. The test "outside table headers" (VFG:236-247) keeps its `<th` line filter until 2B-5. The new top-level `const D` of VFG is used only by `TABLE_HEADER_FILLS`; 2B-5 deletes both together (otherwise lint warns that `D` is unused).
- **Ruling (format), one row per line:** §8.4 and §9.4.3 sketch three rows per line. Here every row of `TABLE_HEADER_FILLS`, `BUDGETS` and `KEEP` sits on its own line, grouped under `// 2B-N` comments (the first 2B plan that edits the file, spec §8.5–8.9 with I12), like `form-migration-guards.test.ts`. Each later commit then deletes or lowers whole lines, the reviewer sees one line per site, and `p2b-budget.mjs` can work line by line. A row whose number stays after 2B says `→ n (KEEP): reason`.
- **Ruling (L0 is stricter than the §9.3.1 sketch):** L0 also fails when a `BUDGETS` row of a file in `MIGRATED_LIST_FILES` is above its `KEEP` number (§9.8: "the rows that remain = KEEP"), when `TITLES` and `COUNTERS` name different guards, when `BUDGETS`/`KEEP` name an unknown guard, and when `MIGRATED_LIST_FILES` lists a missing file or a file twice.
- **Ruling (sample test):** the §9.3.2 sample test plus four cheap cases for the counters whose regexes have a trap: `RAW_DASH` (counts `|| "-"`, `?? "-"` and `: "-"`, not `"a-b"`), `FORMAT_CURRENCY` (skips the declaration), `ROW_DELETE_BUTTON` and `offScreen`.
- **Ruling (TDD for guards):** each guard object is written empty first and fails for the stated reason (every HEAD site is over a 0 budget, with the totals of table C), then filled with the seeds and passes. This proves the counters see exactly the table C sites before any budget hides them.
- **Ruling, the scripts:** `p2b1-precheck.mjs` (this task, Step 1) recounts every seed like `recount10.mjs` and, with `--budgets` and `--file`, compares the live counts with the rows in the test files. `p2b-budget.mjs` (Step 2) is the 2B version of plan 2C-2's `p2c-budget.mjs`: it edits rows by object name (`R7` = VFG `TABLE_HEADER_FILLS`, `LH1`…`LR1` = LFG `BUDGETS.<ID>`) and by file, never raises a number, never touches `KEEP`, and makes you name every row the file holds. R1 (VFG:226-231, an inline object in the test call) is not one of its objects: 2B-2 edits that one line by hand (§9.2.2). Both scripts live in the implementer's temp folder and are never committed; Tasks 13–24 reuse them.

What users will see: nothing. This task changes two test files.

Not in this task:
- any file under `src/`, `messages/` or `docs/`
- R1 (`{}` in 2B-2), the R2 comment (2B-3) and the R7 lock with no `<th` filter (2B-5)
- `tests/form-migration-guards.test.ts` (never edited in 2B) and `tests/helpers/source-files.ts` (FMG uses it; no new helper there, §9.3.1)
- the test `L9` (`BUDGETS` = `KEEP`), which 2B-5 adds

**Files:**
- Modify: `tests/visual-foundation-guards.test.ts` (CRLF in the working tree, `i/lf w/crlf`; two exact replacements, Steps 3 and 4)
- Create: `tests/list-frame-guards.test.ts` (LF; Step 5 creates it, Step 6 fills `BUDGETS`)
- Temp folder only, never committed: `p2b1-precheck.mjs`, `p2b-budget.mjs`

**Must keep passing without edits:**
- every other test in `tests/visual-foundation-guards.test.ts` (26 tests before and after; only the R7 interim test changes)
- `tests/form-migration-guards.test.ts` (whole file) · `tests/design-tokens-contrast.test.ts` · `tests/dialog-trigger-handles.test.ts`

**Interfaces:**
- Consumes:
  - `tests/helpers/source-files.ts`: `readSourceFiles(root)`, `countMatchesByFile(files, pattern, allow?)`, `countByFile(files, count, allow?)`, `budgetOverruns(counts, budget): string[]`, `findJsxTags(source, names): JsxTag[]`, `hasJsxAttr(tagText, attr): boolean`, `jsxAttrValue(tagText, attr): string | null` and `type SourceFile = { path: string; source: string }`. No change to the file.
  - VFG: `assertWithinBudget(pattern: RegExp, budget: Record<string, number>, allow?)` (VFG:203-210) and `NEUTRAL_FILL_OPACITY` (VFG:233), both unchanged.
- Produces (every later task relies on these):
  - VFG `const TABLE_HEADER_FILLS: Record<string, number>`: 31 rows, 44 in all, one row per line under `// 2B-1`, `// 2B-2`, `// 2B-4`, `// 2B-5` and `// 2C plan 4 or 2D (2C batch 4 files, R-e)`. The commit that moves a file's tables deletes its row (`p2b-budget.mjs … R7=n:0`). After 2B-1: 29 in 20 rows.
  - LFG module constants (not exported): `D`, `C`, `MIGRATED_LIST_FILES: string[]` (empty), `COUNTERS: Record<string, () => Record<string, number>>`, `TITLES: Record<string, string>`, `BUDGETS: Record<string, Record<string, number>>` (19 guards, 328 rows), `KEEP: Record<string, Record<string, number>>` (11 guards, 50 rows), the helpers `tagsWhere`, `handPaginations`, `fadedDisabled`, `pageCurrent` and the regex constants of §9.3.1. 21 tests: the sample test, `LH1` … `LR1` (title `"<ID> <sentence>"`) and `L0`.
  - `npm test` grows from 1812 to 1833 tests (1832 pass, 1 skipped).
  - `p2b1-precheck.mjs` in the temp folder: no argument = seed recount (exit 1 on any difference); `--budgets` = every row against the live counts (exit 1 on any "over"); `--file <path>` = one file's live count, budget, `KEEP` and seed per guard, and the `p2b-budget.mjs` arguments `ID=<budget>:<live>`.
  - `p2b-budget.mjs` in the temp folder: `node <temp>/p2b-budget.mjs <path> ID=from:to ... [--migrated] [--dry-run]`.
  - How Tasks 13–24 use them: before editing, `node <temp>/p2b1-precheck.mjs --file <path>` (every `live` equals `budget`); after editing, the same command prints `args`; compare them with the task's Expected, then run `node <temp>/p2b-budget.mjs <path> <args> [--migrated]`; the guards then pass, and `--budgets` shows no slack for the file.

| object | rows | total | file |
|---|---|---|---|
| VFG `TABLE_HEADER_FILLS` | 31 | 44 | `tests/visual-foundation-guards.test.ts` |
| LFG `BUDGETS` | 328 in 19 guards | table C column "ที่ HEAD" (LB1 29 = 27 + the two `0 → 1` rows) | `tests/list-frame-guards.test.ts` |
| LFG `KEEP` | 50 in 11 guards | table C column "2B-5 = KEEP" | `tests/list-frame-guards.test.ts` |
| LFG `MIGRATED_LIST_FILES` | 0 | — | `tests/list-frame-guards.test.ts` |

- [ ] **Step 1: Check what this task builds on (and save the precheck script)**

Save this script as `p2b1-precheck.mjs` in your temp folder (never in the repo). It carries the per-file counts at `d38a0ee` (spec §9.4, totals = table C) and the LFG counters verbatim; it takes the R1/R7/R2 regexes from VFG itself, as `recount10.mjs` did.

```js
// p2b1-precheck.mjs: run from the repo root. Reads only; writes nothing. Never commit this file.
//   node p2b1-precheck.mjs                  recount R1/R7/R2 and the 19 list-frame guards file by file against the d38a0ee
//                                           seeds (spec §10.4 table C, §9.4); exit 1 on any difference (Task 0 Step 3, Task 1 Step 1)
//   node p2b1-precheck.mjs --budgets        compare every budget row in tests/list-frame-guards.test.ts (LFG) and VFG
//                                           TABLE_HEADER_FILLS with the live counts: "over" fails the guard, "slack" is a row
//                                           some commit forgot to lower; exit 1 on any "over" (end of Task 1, any later task)
//   node p2b1-precheck.mjs --file <path>    one file: live count, budget, KEEP and seed per guard, and the p2b-budget.mjs
//                                           arguments ID=<budget>:<live> (Tasks 13–24, before and after the change)
// <path> may be the repo path or the short forms D/… (src/app/[locale]/(dashboard)/…) and c/… (src/components/…).
// The counters are those of LFG (spec §9.3); the R1/R7/R2 regexes are read from tests/visual-foundation-guards.test.ts.
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { execSync } from "node:child_process"

const D = "src/app/[locale]/(dashboard)/"
const C = "src/components/"
const VFG = "tests/visual-foundation-guards.test.ts"
const LFG = "tests/list-frame-guards.test.ts"
const full = (path) => (path.startsWith("D/") ? D + path.slice(2) : path.startsWith("c/") ? C + path.slice(2) : path)
const short = (path) => path.replace(D, "D/").replace(C, "c/")
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : "")
const sum = (rows) => Object.values(rows).reduce((total, count) => total + count, 0)
const files = (rows) => Object.keys(rows).length
const args = process.argv.slice(2)
const mode = args.includes("--budgets") ? "budgets" : args.includes("--file") ? "file" : "seeds"

const H = await import(pathToFileURL(resolve("tests/helpers/source-files.ts")).href)
const NEEDED = ["budgetOverruns", "countByFile", "countMatchesByFile", "findJsxTags", "hasJsxAttr", "jsxAttrValue", "readSourceFiles"]
const missingHelpers = NEEDED.filter((name) => typeof H[name] !== "function")
const { countByFile, countMatchesByFile, findJsxTags, hasJsxAttr, jsxAttrValue, readSourceFiles } = H
const sources = readSourceFiles("src")

// ---- the counters of LFG (spec §9.3), verbatim
const offScreen = (path) => !(path.startsWith("src/app/") || path.startsWith(C)) || path.startsWith("src/app/api/")
const skip = (...owners) => (path) => offScreen(path) || owners.includes(path)
const skipUi = (path) => offScreen(path) || path.startsWith(`${C}ui/`)
const NAV_PRIMITIVES = ["ui/tab-nav.tsx", "ui/breadcrumbs.tsx", "ui/pagination.tsx", "ui/steps.tsx", "ui/stat-strip.tsx", "layout/sidebar.tsx", "layout/mobile-field-navigation.tsx"].map((path) => C + path)
const tagsWhere = (names, keep) => (file) => findJsxTags(file.source, names).filter((tag) => keep(tag.text)).length
function handPaginations(file) {
  let count = 0
  for (const match of file.source.matchAll(/\bfunction [A-Z]\w*Pagination\b/g)) {
    const rest = file.source.slice(match.index + "function ".length)
    const next = rest.search(/\n(?:export )?(?:async )?function |\nconst [A-Z]/)
    if (!/<Pagination(?=[\s/>])/.test(next === -1 ? rest : rest.slice(0, next))) count++
  }
  return count
}
const fadedDisabled = (line) => /(?<![\w:-])opacity-\d+\b/.test(line) && /(?<![\w:-])(?:pointer-events-none|cursor-not-allowed)\b/.test(line)
const HEADER_OWNER = `${C}ui/page-header.tsx`
const HEADER_LOOK = /\bbg-(?:muted|accent)(?![\w/-])|\buppercase\b/
const pageCurrent = (text) => /"page"/.test(jsxAttrValue(text, "aria-current") ?? "")
const vfgText = read(VFG)
const vfgRegex = (name) => {
  const match = vfgText.match(new RegExp(`const ${name} =\\s*\\/(.+)\\/([gimsuy]*)\\n`))
  if (!match) throw new Error(`no ${name} in ${VFG}`)
  return new RegExp(match[1], match[2])
}
const COUNTERS = {
  R1: () => countMatchesByFile(sources, vfgRegex("TONE_OPACITY")),
  R7: () => countMatchesByFile(sources, vfgRegex("NEUTRAL_FILL_OPACITY")),
  R2: () => countMatchesByFile(sources, vfgRegex("SURFACE_SHADOW")),
  LH1: () => countByFile(sources, tagsWhere(["h1"], () => true), skip(HEADER_OWNER)),
  LH2: () => countMatchesByFile(sources, /\bMasterDataHeader\b|\bReportHeader\b|\bfunction PageHeader\b/g, skip(HEADER_OWNER)),
  LB1: () => countMatchesByFile(sources, /<ArrowLeft\b/g, skip(HEADER_OWNER)),
  LP1: () => countMatchesByFile(sources, /\bpb-(?:24|36)\b/g, (path) => !path.startsWith(D)),
  LF1: () => countMatchesByFile(sources, /\bfunction (?:FilterSelect|ReportSelect|LabeledSelect)\b|\bfunction Filter\(/g, skipUi),
  LT1: () => countByFile(sources, tagsWhere(["thead", "th"], (text) => HEADER_LOOK.test(text)), offScreen),
  LT2: () => countMatchesByFile(sources, /\bfunction (?:[A-Z]\w*)?Sort\w*Header\b/g, skip(`${C}ui/data-table.tsx`)),
  LT3: () => countByFile(sources, (file) => findJsxTags(file.source, ["td"]).filter((tag) => hasJsxAttr(tag.text, "colSpan")).length, skip(`${C}ui/data-table.tsx`)),
  LT4: () => countByFile(sources, handPaginations, skip(`${C}ui/pagination.tsx`)),
  LT5: () => countByFile(sources, (file) => file.source.split("\n").filter(fadedDisabled).length, offScreen),
  LV1: () => countMatchesByFile(sources, /\.toLocaleString\(\)/g, offScreen),
  LV2: () => countMatchesByFile(sources, /(?:\|\||\?\?|:)\s*"-"/g, offScreen),
  LV3: () => countMatchesByFile(sources, /(?<!function )\bformatCurrency\(/g, offScreen),
  LS1: () => countMatchesByFile(sources, /\bfunction (?:SummaryTile|SummaryCard|SummaryPill|SummaryStrip|RoleAuditCard|ResolutionMetric|CoverageMetric|Metric|DashboardCard|BatchMetric|MetricCard|OperationMetric)\b/g, skipUi),
  LS2: () => countMatchesByFile(sources, /<MetricCard(?=[\s/>])/g, offScreen),
  LK1: () => countMatchesByFile(sources, /\bfunction (?:Info|InfoRow|DetailItem|BatchInfo|MobileAuditDetailField)\b/g, skipUi),
  LN1: () => countByFile(sources, tagsWhere(["[A-Za-z][\\w.]*"], pageCurrent), (path) => offScreen(path) || NAV_PRIMITIVES.includes(path)),
  LN2: () => countMatchesByFile(sources, /\bfunction (?:StatusBadge|MetricCard|ColumnHeader|PageHeader|Pagination|DataTable|TabNav|StatStrip|KeyValueList|RowActions|TableEmptyRow|EmptyNote|Nil)\b/g, skipUi),
  LR1: () => countMatchesByFile(sources, /<[A-Z]\w*DeleteButton\s+id=/g, offScreen),
}
const LIVE = Object.fromEntries(Object.entries(COUNTERS).map(([id, count]) => [id, count()]))

// ---- per-file counts at d38a0ee (= spec §10.4 table C column "ที่ HEAD", per file as spec §9.4.1–9.4.2)
const SEEDS = {
  R1: {
    "D/audit/rounds/page.tsx": 1,
  },
  R7: {
    "D/admin/logs/page.tsx": 1, "D/admin/roles/page.tsx": 2, "D/admin/storage/page.tsx": 3, "D/admin/users/page.tsx": 1, "D/assets/[id]/page.tsx": 2,
    "D/audit/findings/page.tsx": 1, "D/audit/rounds/[id]/page.tsx": 1, "D/audit/rounds/[id]/pending/page.tsx": 1, "D/audit/rounds/page.tsx": 1,
    "D/disposal/batches/[id]/page.tsx": 2, "D/disposal/batches/page.tsx": 2, "D/disposal/page.tsx": 2, "D/maintenance/page.tsx": 1,
    "D/master-data/branches/page.tsx": 1, "D/master-data/brands/page.tsx": 1, "D/master-data/categories/page.tsx": 1, "D/master-data/companies/page.tsx": 1,
    "D/master-data/departments/page.tsx": 1, "D/master-data/employees/[id]/page.tsx": 3, "D/master-data/employees/page.tsx": 1,
    "D/master-data/locations/page.tsx": 1, "D/my-assets/page.tsx": 1, "c/admin/asset-state-review-workspace.tsx": 1,
    "c/admin/IntegrationClientManager.tsx": 1, "c/admin/role-permission-form.tsx": 1, "c/admin/system-settings-form.tsx": 3,
    "c/assets/asset-batch-form.tsx": 3, "c/assets/asset-import-preview-panel.tsx": 1, "c/master-data/supplier-list-view.tsx": 1,
    "c/master-data/supplier-purchase-documents.tsx": 1, "c/reports/responsive-report-list.tsx": 1,
  },
  R2: {
    "D/admin/roles/page.tsx": 1, "D/admin/users/page.tsx": 1, "c/admin/system-settings-form.tsx": 1, "c/asset-operations/operation-document-print.tsx": 1,
    "c/assets/asset-label-print.tsx": 1, "c/assets/asset-register-table.tsx": 1, "c/audit/audit-scan-check-form.tsx": 1,
    "c/layout/mobile-field-navigation.tsx": 1, "c/ui/scanner-text-input.tsx": 2,
  },
  LH1: {
    "src/app/[locale]/(auth)/login/page.tsx": 1, "D/admin/approvals/history/page.tsx": 1, "D/admin/approvals/page.tsx": 1,
    "D/admin/data-quality/page.tsx": 1, "D/admin/integrations/page.tsx": 1, "D/admin/logs/page.tsx": 1, "D/admin/readiness/page.tsx": 1,
    "D/admin/roles/page.tsx": 1, "D/admin/settings/page.tsx": 1, "D/admin/storage/page.tsx": 1, "D/admin/users/page.tsx": 1,
    "D/asset-management/import-export/page.tsx": 1, "D/assets/[id]/page.tsx": 1, "D/audit/rounds/[id]/page.tsx": 1,
    "D/audit/rounds/[id]/pending/page.tsx": 1, "D/dashboard/page.tsx": 1, "D/disposal/batches/[id]/page.tsx": 1, "D/disposal/batches/page.tsx": 1,
    "D/disposal/batch/new/page.tsx": 1, "D/disposal/[id]/page.tsx": 1, "D/disposal/new/page.tsx": 1, "D/disposal/page.tsx": 1,
    "D/maintenance/[id]/page.tsx": 1, "D/maintenance/new/page.tsx": 1, "D/maintenance/page.tsx": 1, "D/maintenance/pm/[id]/edit/page.tsx": 1,
    "D/maintenance/pm/new/page.tsx": 1, "D/maintenance/pm/page.tsx": 1, "D/master-data/employees/[id]/page.tsx": 1,
    "D/master-data/suppliers/[id]/page.tsx": 1, "D/my-assets/[id]/page.tsx": 1, "D/my-assets/page.tsx": 1, "D/notifications/page.tsx": 1,
    "D/work-center/page.tsx": 1, "c/admin/admin-user-form.tsx": 1, "c/admin/role-permission-form.tsx": 1, "c/asset-operations/bulk-move-form.tsx": 1,
    "c/asset-operations/checkin-form.tsx": 1, "c/asset-operations/checkout-form.tsx": 1, "c/asset-operations/operation-document-print.tsx": 1,
    "c/asset-operations/transfer-form.tsx": 1, "c/assets/asset-batch-form.tsx": 1, "c/assets/asset-component-manager.tsx": 1, "c/assets/asset-form.tsx": 1,
    "c/assets/asset-label-batch-tool.tsx": 1, "c/assets/asset-label-print.tsx": 1, "c/assets/asset-scan-search-tool.tsx": 1,
    "c/audit/audit-round-form.tsx": 1, "c/audit/audit-scan-header.tsx": 1, "c/master-data/asset-model-form.tsx": 1, "c/master-data/branch-form.tsx": 1,
    "c/master-data/brand-form.tsx": 1, "c/master-data/category-form.tsx": 1, "c/master-data/company-form.tsx": 1, "c/master-data/department-form.tsx": 1,
    "c/master-data/employee-form.tsx": 1, "c/master-data/location-form.tsx": 1, "c/master-data/master-data-layout.tsx": 1,
    "c/master-data/supplier-form.tsx": 1, "c/reports/report-header.tsx": 1,
  },
  LH2: {
    "D/assets/page.tsx": 2, "D/audit/findings/page.tsx": 2, "D/audit/rounds/page.tsx": 2, "D/master-data/branches/page.tsx": 2,
    "D/master-data/brands/page.tsx": 2, "D/master-data/categories/page.tsx": 2, "D/master-data/companies/page.tsx": 2,
    "D/master-data/departments/page.tsx": 2, "D/master-data/employees/page.tsx": 2, "D/master-data/locations/page.tsx": 2,
    "D/master-data/suppliers/page.tsx": 2, "D/my-assets/page.tsx": 1, "D/reports/page.tsx": 2, "c/master-data/master-data-layout.tsx": 1,
    "c/reports/report-header.tsx": 1,
  },
  LB1: {
    "D/assets/[id]/page.tsx": 1, "D/disposal/batches/[id]/page.tsx": 1, "D/disposal/batches/page.tsx": 1, "D/disposal/batch/new/page.tsx": 1,
    "D/disposal/[id]/page.tsx": 1, "D/disposal/new/page.tsx": 1, "D/master-data/employees/[id]/page.tsx": 1, "D/master-data/suppliers/[id]/page.tsx": 1,
    "D/my-assets/[id]/page.tsx": 1, "c/admin/admin-user-form.tsx": 1, "c/admin/role-permission-form.tsx": 1, "c/admin/system-settings-form.tsx": 1,
    "c/asset-operations/operation-document-print.tsx": 1, "c/assets/asset-component-manager.tsx": 1, "c/assets/asset-form.tsx": 1,
    "c/assets/asset-label-print.tsx": 1, "c/audit/audit-scan-header.tsx": 1, "c/disposal/disposal-batch-form.tsx": 1,
    "c/master-data/asset-model-form.tsx": 1, "c/master-data/branch-form.tsx": 1, "c/master-data/brand-form.tsx": 1, "c/master-data/category-form.tsx": 1,
    "c/master-data/company-form.tsx": 1, "c/master-data/department-form.tsx": 1, "c/master-data/employee-form.tsx": 1, "c/master-data/location-form.tsx": 1,
    "c/master-data/supplier-form.tsx": 1,
  },
  LP1: {
    "D/assets/[id]/page.tsx": 1, "D/audit/rounds/[id]/page.tsx": 1, "D/disposal/batches/[id]/page.tsx": 1, "D/disposal/[id]/page.tsx": 1,
    "D/maintenance/[id]/page.tsx": 1, "D/master-data/employees/[id]/page.tsx": 1, "D/master-data/suppliers/[id]/page.tsx": 1, "D/my-assets/[id]/page.tsx": 1,
  },
  LF1: {
    "D/master-data/branches/page.tsx": 1, "D/master-data/brands/page.tsx": 1, "D/master-data/categories/page.tsx": 1, "D/master-data/companies/page.tsx": 1,
    "D/master-data/employees/page.tsx": 1, "D/master-data/locations/page.tsx": 1, "D/master-data/suppliers/page.tsx": 1,
    "c/admin/asset-state-review-workspace.tsx": 1, "c/assets/asset-register-filter-sheet.tsx": 1, "c/reports/report-filter-panel.tsx": 1,
  },
  LT1: {
    "D/admin/logs/page.tsx": 1, "D/admin/storage/page.tsx": 11, "D/assets/[id]/page.tsx": 10, "D/master-data/branches/page.tsx": 1,
    "D/master-data/categories/page.tsx": 1, "D/master-data/companies/page.tsx": 1, "D/master-data/employees/[id]/page.tsx": 1,
    "D/master-data/employees/page.tsx": 1, "D/master-data/locations/page.tsx": 1, "D/my-assets/page.tsx": 1, "c/admin/role-permission-form.tsx": 2,
    "c/admin/system-settings-form.tsx": 1, "c/assets/asset-import-preview-panel.tsx": 5, "c/assets/asset-register-table.tsx": 2,
    "c/master-data/master-data-layout.tsx": 2, "c/master-data/supplier-list-view.tsx": 1, "c/reports/responsive-report-list.tsx": 1,
  },
  LT2: {
    "D/master-data/branches/page.tsx": 1, "D/master-data/categories/page.tsx": 1, "D/master-data/companies/page.tsx": 1,
    "D/master-data/employees/page.tsx": 1, "D/master-data/locations/page.tsx": 1, "c/assets/asset-register-table.tsx": 1,
    "c/master-data/master-data-layout.tsx": 1, "c/master-data/supplier-list-view.tsx": 1,
  },
  LT3: {
    "D/admin/storage/page.tsx": 2, "D/admin/users/page.tsx": 1, "D/audit/findings/page.tsx": 1, "D/audit/rounds/[id]/page.tsx": 1,
    "D/audit/rounds/[id]/pending/page.tsx": 1, "D/audit/rounds/page.tsx": 1, "D/disposal/page.tsx": 1, "D/master-data/branches/page.tsx": 1,
    "D/master-data/brands/page.tsx": 1, "D/master-data/categories/page.tsx": 1, "D/master-data/companies/page.tsx": 1,
    "D/master-data/departments/page.tsx": 1, "D/master-data/employees/page.tsx": 1, "D/master-data/locations/page.tsx": 1,
    "c/assets/asset-register-table.tsx": 1,
  },
  LT4: {
    "D/audit/rounds/[id]/page.tsx": 1, "D/master-data/branches/page.tsx": 1, "D/master-data/brands/page.tsx": 1, "D/master-data/categories/page.tsx": 1,
    "D/master-data/companies/page.tsx": 1, "D/master-data/employees/page.tsx": 1, "D/master-data/locations/page.tsx": 1,
    "c/disposal/disposal-pagination.tsx": 1, "c/maintenance/maintenance-pagination.tsx": 1, "c/master-data/master-data-layout.tsx": 1,
    "c/master-data/supplier-list-view.tsx": 1,
  },
  LT5: {
    "D/assets/[id]/page.tsx": 1, "D/audit/rounds/[id]/page.tsx": 2, "D/master-data/branches/page.tsx": 2, "D/master-data/brands/page.tsx": 2,
    "D/master-data/categories/page.tsx": 2, "D/master-data/companies/page.tsx": 2, "D/master-data/employees/page.tsx": 2,
    "D/master-data/locations/page.tsx": 2, "c/disposal/disposal-pagination.tsx": 2, "c/maintenance/maintenance-pagination.tsx": 2,
    "c/master-data/master-data-layout.tsx": 2, "c/master-data/supplier-list-view.tsx": 2,
  },
  LV1: {
    "D/admin/storage/page.tsx": 7, "D/master-data/branches/page.tsx": 4, "D/master-data/brands/page.tsx": 2, "D/master-data/categories/page.tsx": 3,
    "D/master-data/companies/page.tsx": 4, "D/master-data/employees/[id]/page.tsx": 1, "D/master-data/employees/page.tsx": 2,
    "D/master-data/locations/page.tsx": 3, "D/master-data/suppliers/[id]/page.tsx": 1, "D/master-data/suppliers/page.tsx": 1,
    "c/admin/asset-state-review-workspace.tsx": 1, "c/admin/depreciation-policy-builder.tsx": 1, "c/admin/IntegrationClientManager.tsx": 3,
    "c/assets/asset-import-preview-panel.tsx": 4, "c/assets/asset-label-batch-tool.tsx": 1, "c/master-data/supplier-list-view.tsx": 4,
    "c/master-data/supplier-purchase-documents.tsx": 2,
  },
  LV2: {
    "D/admin/approvals/page.tsx": 1, "D/admin/roles/page.tsx": 1, "D/admin/storage/page.tsx": 1, "D/admin/users/page.tsx": 2,
    "D/asset-management/labels/page.tsx": 4, "D/assets/[id]/page.tsx": 15, "D/audit/findings/page.tsx": 7, "D/audit/rounds/[id]/page.tsx": 5,
    "D/audit/rounds/[id]/pending/page.tsx": 1, "D/disposal/[id]/page.tsx": 2, "D/disposal/page.tsx": 1, "D/maintenance/[id]/page.tsx": 2,
    "D/maintenance/page.tsx": 1, "D/master-data/branches/page.tsx": 1, "D/master-data/brands/page.tsx": 1, "D/master-data/categories/page.tsx": 1,
    "D/master-data/companies/page.tsx": 2, "D/master-data/employees/[id]/page.tsx": 5, "D/master-data/employees/page.tsx": 2,
    "D/master-data/locations/page.tsx": 1, "D/master-data/suppliers/[id]/page.tsx": 1, "D/my-assets/[id]/page.tsx": 1, "D/my-assets/page.tsx": 2,
    "src/app/[locale]/(print)/asset-management/checkins/[id]/page.tsx": 2, "src/app/[locale]/(print)/asset-management/checkouts/[id]/page.tsx": 4,
    "c/admin/system-settings-form.tsx": 8, "c/asset-operations/checkin-form.tsx": 9, "c/asset-operations/operation-document-print.tsx": 1,
    "c/asset-operations/void-document-banner.tsx": 3, "c/assets/asset-batch-form.tsx": 8, "c/assets/asset-component-manager.tsx": 3,
    "c/assets/asset-form.tsx": 1, "c/assets/asset-import-preview-panel.tsx": 2, "c/assets/asset-label-batch-tool.tsx": 6,
    "c/assets/asset-movement-timeline.tsx": 2, "c/assets/asset-purchase-documents.tsx": 1, "c/assets/asset-register-table.tsx": 1,
    "c/audit/audit-finding-review-actions.tsx": 3, "c/audit/audit-scan-check-form.tsx": 3, "c/audit/audit-scan-offline-bar.tsx": 1,
    "c/disposal/disposal-batch-form.tsx": 3, "c/master-data/supplier-list-view.tsx": 5, "c/master-data/supplier-purchase-documents.tsx": 2,
  },
  LV3: {
    "D/assets/[id]/page.tsx": 3, "D/disposal/batches/[id]/page.tsx": 2, "D/disposal/[id]/page.tsx": 5, "D/disposal/page.tsx": 2,
    "D/maintenance/[id]/page.tsx": 5, "D/maintenance/page.tsx": 2, "D/master-data/suppliers/[id]/page.tsx": 4, "D/reports/page.tsx": 1,
    "src/app/[locale]/(print)/disposal/[id]/print/page.tsx": 5, "src/app/[locale]/(print)/maintenance/[id]/print/page.tsx": 1,
    "c/assets/asset-register-table.tsx": 1, "c/master-data/supplier-purchase-documents.tsx": 2, "c/reports/reports-accounting-view.tsx": 9,
  },
  LS1: {
    "D/admin/approvals/history/page.tsx": 1, "D/admin/approvals/page.tsx": 1, "D/admin/data-quality/page.tsx": 1, "D/admin/readiness/page.tsx": 1,
    "D/admin/roles/page.tsx": 1, "D/admin/storage/page.tsx": 1, "D/assets/[id]/page.tsx": 1, "D/audit/findings/page.tsx": 1,
    "D/audit/rounds/[id]/page.tsx": 2, "D/audit/rounds/page.tsx": 1, "D/disposal/batches/[id]/page.tsx": 1, "D/master-data/branches/page.tsx": 1,
    "D/master-data/brands/page.tsx": 1, "D/master-data/categories/page.tsx": 1, "D/master-data/companies/page.tsx": 1,
    "D/master-data/employees/[id]/page.tsx": 1, "D/master-data/employees/page.tsx": 1, "D/master-data/locations/page.tsx": 1,
    "D/master-data/suppliers/[id]/page.tsx": 1, "D/master-data/suppliers/page.tsx": 1, "D/my-assets/page.tsx": 1, "D/notifications/page.tsx": 1,
    "D/work-center/page.tsx": 2, "c/admin/IntegrationClientManager.tsx": 2, "c/admin/system-settings-form.tsx": 1,
    "c/assets/asset-import-preview-panel.tsx": 1, "c/disposal/disposal-bulk-approval.tsx": 1,
  },
  LS2: {
    "D/master-data/suppliers/[id]/page.tsx": 5, "D/reports/page.tsx": 2, "D/work-center/page.tsx": 1, "c/reports/reports-accounting-view.tsx": 10,
    "c/reports/reports-catalog-view.tsx": 1, "c/reports/reports-operations-view.tsx": 1,
  },
  LK1: {
    "D/asset-management/import-export/page.tsx": 1, "D/assets/[id]/page.tsx": 1, "D/audit/findings/page.tsx": 1, "D/audit/rounds/[id]/page.tsx": 1,
    "D/disposal/batches/[id]/page.tsx": 1, "D/disposal/[id]/page.tsx": 1, "D/maintenance/[id]/page.tsx": 1, "D/master-data/employees/[id]/page.tsx": 1,
    "D/master-data/suppliers/[id]/page.tsx": 1, "D/my-assets/[id]/page.tsx": 1, "c/assets/asset-movement-timeline.tsx": 1,
  },
  LN1: {
    "D/audit/findings/page.tsx": 2, "D/audit/rounds/page.tsx": 1, "D/disposal/page.tsx": 1, "D/master-data/brands/page.tsx": 2, "D/work-center/page.tsx": 1,
    "c/assets/asset-detail-tabs.tsx": 1, "c/assets/asset-register-status-tabs.tsx": 1, "c/disposal/disposal-pagination.tsx": 1,
    "c/maintenance/maintenance-pagination.tsx": 1, "c/master-data/supplier-list-view.tsx": 1, "c/reports/report-view-tabs.tsx": 1,
  },
  LN2: {
    "D/master-data/employees/[id]/page.tsx": 1, "D/master-data/suppliers/[id]/page.tsx": 1, "D/my-assets/page.tsx": 1, "D/notifications/page.tsx": 1,
    "D/work-center/page.tsx": 1, "c/admin/IntegrationClientManager.tsx": 1, "c/master-data/master-data-layout.tsx": 1,
  },
  LR1: {
    "D/master-data/branches/page.tsx": 1, "D/master-data/brands/page.tsx": 2, "D/master-data/categories/page.tsx": 1, "D/master-data/companies/page.tsx": 1,
    "D/master-data/departments/page.tsx": 1, "D/master-data/employees/page.tsx": 1, "D/master-data/locations/page.tsx": 1,
    "c/master-data/supplier-list-view.tsx": 2,
  },
}
const SEED = Object.fromEntries(Object.entries(SEEDS).map(([id, rows]) => [id, Object.fromEntries(Object.entries(rows).map(([path, count]) => [full(path), count]))]))
// The two LB1 rows that LFG budgets above their d38a0ee count (spec §9.4.1 note "LB1 0→1").
const LB1_UP = [`${D}audit/rounds/[id]/page.tsx`, `${D}maintenance/[id]/page.tsx`]

// ---- the budget objects as the test files hold them (evaluated, so formatting does not matter)
function objectOf(text, name) {
  const lines = text.split("\n")
  const start = lines.findIndex((line) => new RegExp(`^const ${name}\\b`).test(line))
  if (start === -1) return undefined
  const head = lines[start].slice(lines[start].indexOf("= ") + 2)
  const body = /^[{[].*[}\]]\s*$/.test(head) ? head : [head, ...lines.slice(start + 1, lines.findIndex((line, index) => index > start && /^[}\]]/.test(line)) + 1)].join("\n")
  return Function("D", "C", `return (${body})`)(D, C)
}
const lfgText = read(LFG)
const BUDGETS = lfgText ? objectOf(lfgText, "BUDGETS") : undefined
const KEEP = lfgText ? objectOf(lfgText, "KEEP") : undefined
const MIGRATED = lfgText ? objectOf(lfgText, "MIGRATED_LIST_FILES") : undefined
const FILLS = objectOf(vfgText, "TABLE_HEADER_FILLS")
const budgetOf = (id) => (id === "R7" ? FILLS : id === "R1" || id === "R2" ? undefined : BUDGETS?.[id] ?? {})

const git = (command) => { try { return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() } catch { return "?" } }
const changed = git("git diff --name-only d38a0ee HEAD -- src")
console.log(`info    HEAD ${git("git rev-parse --short HEAD")} on ${git("git rev-parse --abbrev-ref HEAD")} · files under src changed since d38a0ee: ${changed === "?" ? "?" : changed.split("\n").filter(Boolean).length}`)
console.log(`${missingHelpers.length ? "MISSING" : "ok     "} helpers ${NEEDED.join(", ")}${missingHelpers.length ? ` (missing: ${missingHelpers.join(", ")})` : ""}`)
console.log(`info    VFG R7: ${FILLS ? `per file, TABLE_HEADER_FILLS ${sum(FILLS)} in ${files(FILLS)} rows` : /total <= 44/.test(vfgText) ? "one total <= 44 (Task 1 not applied yet)" : "neither the total test nor TABLE_HEADER_FILLS (check the file)"}`)
console.log(`info    ${LFG}: ${lfgText ? `there · BUDGETS ${Object.keys(BUDGETS ?? {}).length} guards · KEEP ${Object.keys(KEEP ?? {}).length} guards · MIGRATED_LIST_FILES ${(MIGRATED ?? []).length} files` : "not there yet"}`)
let bad = missingHelpers.length

if (mode === "seeds") {
  for (const [id, live] of Object.entries(LIVE)) {
    const seed = SEED[id]
    const diff = [...new Set([...Object.keys(seed), ...Object.keys(live)])].sort().filter((path) => (seed[path] ?? 0) !== (live[path] ?? 0))
    console.log(`${diff.length ? "DIFF   " : "ok     "} ${id.padEnd(3)} ${String(sum(live)).padStart(3)} in ${String(files(live)).padStart(2)} files${diff.length ? ` (seed ${sum(seed)} in ${files(seed)})` : " = seed"}`)
    for (const path of diff) console.log(`          ${short(path)}: seed ${seed[path] ?? 0}, now ${live[path] ?? 0}`)
    bad += diff.length
  }
  if (bad) {
    console.error(`ABORT: ${bad} difference(s) from the d38a0ee seeds. Do not start Task 1 with its BUDGETS as written; report each line.`)
    process.exit(1)
  }
  console.log("seeds hold: every count equals spec §10.4 table C, file by file")
}

if (mode === "budgets") {
  if (!BUDGETS || !FILLS) {
    console.error(`ABORT: ${!BUDGETS ? LFG : "TABLE_HEADER_FILLS in " + VFG} is not there yet.`)
    process.exit(1)
  }
  for (const [id, live] of Object.entries(LIVE)) {
    const budget = budgetOf(id)
    if (!budget) continue
    const over = Object.keys(live).filter((path) => live[path] > (budget[path] ?? 0)).sort()
    const slack = Object.keys(budget).filter((path) => budget[path] > (live[path] ?? 0)).sort()
    const name = id === "R7" ? "TABLE_HEADER_FILLS" : `BUDGETS.${id}`
    console.log(`${over.length ? "OVER   " : "ok     "} ${id.padEnd(3)} ${name.padEnd(18)} ${String(sum(budget)).padStart(3)} in ${String(files(budget)).padStart(2)} rows · live ${String(sum(live)).padStart(3)} in ${String(files(live)).padStart(2)} files · over ${over.length} · slack ${slack.length}`)
    for (const path of over) console.log(`          over  ${short(path)}: live ${live[path]} > budget ${budget[path] ?? 0}`)
    for (const path of slack) console.log(`          slack ${short(path)}: budget ${budget[path]} > live ${live[path] ?? 0}${id === "LB1" && LB1_UP.includes(path) && !live[path] ? " (0 → 1 row, expected until its plan)" : ""}`)
    bad += over.length
  }
  for (const path of MIGRATED ?? []) for (const [id, live] of Object.entries(LIVE)) {
    if (id === "R1" || id === "R2") continue
    const keep = id === "R7" ? 0 : KEEP?.[id]?.[path] ?? 0
    if ((live[path] ?? 0) > keep) { console.log(`OVER    migrated ${short(path)} ${id}: live ${live[path]} > KEEP ${keep}`); bad++ }
  }
  if (bad) {
    console.error(`ABORT: ${bad} row(s) over budget; the guards fail. Report each line.`)
    process.exit(1)
  }
  console.log("budgets hold: no live count is over its row")
}

if (mode === "file") {
  const path = full(args[args.indexOf("--file") + 1] ?? "")
  if (!existsSync(path)) {
    console.error(`ABORT: ${path || "(no path)"} is no such file`)
    process.exit(2)
  }
  const raw = readFileSync(path, "utf8")
  const crlf = (raw.match(/\r\n/g) ?? []).length
  const lf = (raw.match(/\n/g) ?? []).length
  console.log(`file    ${path} (${crlf === lf && lf > 0 ? "CRLF" : crlf === 0 ? "LF" : "mixed"})${(MIGRATED ?? []).includes(path) ? " · in MIGRATED_LIST_FILES" : " · not in MIGRATED_LIST_FILES"}`)
  console.log("guard   live  budget  keep  seed")
  const out = []
  for (const [id, live] of Object.entries(LIVE)) {
    const budget = budgetOf(id)
    const now = live[path] ?? 0
    const row = budget ? budget[path] ?? 0 : undefined
    const keep = id === "R1" || id === "R2" ? undefined : id === "R7" ? 0 : KEEP?.[id]?.[path] ?? 0
    const seed = SEED[id][path] ?? 0
    if (!now && !row && !keep && !seed) continue
    const flag = row !== undefined && now > row ? "  OVER" : ""
    console.log(`${id.padEnd(6)} ${String(now).padStart(5)} ${String(row ?? "–").padStart(7)} ${String(keep ?? "–").padStart(5)} ${String(seed).padStart(5)}${flag}`)
    if (flag) bad++
    if (row !== undefined && (row > 0 || now > 0)) out.push(`${id}=${row}:${now}`)
  }
  console.log(`args    ${out.join(" ") || "(no row holds this file)"}`)
  console.log("        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)")
  if (bad) process.exit(1)
}
```

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2b`

Run: `git status --short src tests messages` then `node <temp>/p2b1-precheck.mjs`
Expected: `git status` prints nothing. The first line shows your HEAD (`b16d152`, or the plan commit on top of it). Node may print a `MODULE_TYPELESS_PACKAGE_JSON` warning on stderr when it loads `tests/helpers/source-files.ts`; ignore it. The script prints:
```
info    HEAD b16d152 on feat/ui-phase2b · files under src changed since d38a0ee: 0
ok      helpers budgetOverruns, countByFile, countMatchesByFile, findJsxTags, hasJsxAttr, jsxAttrValue, readSourceFiles
info    VFG R7: one total <= 44 (Task 1 not applied yet)
info    tests/list-frame-guards.test.ts: not there yet
ok      R1    1 in  1 files = seed
ok      R7   44 in 31 files = seed
ok      R2   10 in  9 files = seed
ok      LH1  60 in 60 files = seed
ok      LH2  27 in 15 files = seed
ok      LB1  27 in 27 files = seed
ok      LP1   8 in  8 files = seed
ok      LF1  10 in 10 files = seed
ok      LT1  43 in 17 files = seed
ok      LT2   8 in  8 files = seed
ok      LT3  16 in 15 files = seed
ok      LT4  11 in 11 files = seed
ok      LT5  23 in 12 files = seed
ok      LV1  44 in 17 files = seed
ok      LV2 128 in 43 files = seed
ok      LV3  42 in 13 files = seed
ok      LS1  30 in 27 files = seed
ok      LS2  20 in  6 files = seed
ok      LK1  11 in 11 files = seed
ok      LN1  13 in 11 files = seed
ok      LN2   7 in  7 files = seed
ok      LR1  10 in  8 files = seed
seeds hold: every count equals spec §10.4 table C, file by file
```
On any `DIFF` or `MISSING` line (exit 1), stop and report the lines: the `BUDGETS` of Step 6 would no longer be the HEAD counts.

Run: `git ls-files --eol tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/helpers/source-files.ts`
Expected: `i/lf    w/crlf` for all three. Keep VFG CRLF: edit it only by exact-string replacement (Steps 3 and 4), never by rewriting the file. The new LFG is LF.

- [ ] **Step 2: Save the budget script**

Every later migration commit lowers its own file's rows in `TABLE_HEADER_FILLS` and `BUDGETS` and, when 2B is done with the file, appends it to `MIGRATED_LIST_FILES` (spec §9.8). Several rows of one file hold the same text (`LT2`, `LT3` and `LT4` all hold `1` for a master-data page), so exact-string edits cannot target them; this script edits by object name and file instead. It reads each current value, refuses a number that goes up, refuses to write when a row of the file is left unnamed, re-reads both objects after the edit to prove that only the named rows changed, keeps each file's line endings (LFG LF, VFG CRLF) and drops a `// 2B-N` group comment that no longer heads a row. Save it as `p2b-budget.mjs` in your temp folder (never in the repo):

```js
// p2b-budget.mjs: run from the repo root. Lowers ONE file's rows in tests/list-frame-guards.test.ts (LFG BUDGETS.<ID>)
// and tests/visual-foundation-guards.test.ts (VFG TABLE_HEADER_FILLS, named R7) and, with --migrated, appends the file to
// MIGRATED_LIST_FILES. It refuses to raise a number, checks every current value first, makes you name every row that holds
// the file, re-reads both objects after the edit, and writes nothing on any problem. Keeps each file's line endings.
// Never commit this file.
// Usage: node p2b-budget.mjs <path> ID=from:to ... [--migrated] [--dry-run]
//   <path>: the repo path, or D/… for src/app/[locale]/(dashboard)/… and c/… for src/components/… (no quoting needed)
//   ID: R7 or LH1 LH2 LB1 LP1 LF1 LT1 LT2 LT3 LT4 LT5 LV1 LV2 LV3 LS1 LS2 LK1 LN1 LN2 LR1
//   from:to  from = the row's current number (0 when the file has no row), to <= from; to = 0 deletes the row,
//            n:n keeps a row you must still name. Use ":" (the shell reads ">" as a redirect).
import { existsSync, readFileSync, writeFileSync } from "node:fs"

const D = "src/app/[locale]/(dashboard)/"
const C = "src/components/"
const LFG = "tests/list-frame-guards.test.ts"
const VFG = "tests/visual-foundation-guards.test.ts"
const IDS = ["LH1", "LH2", "LB1", "LP1", "LF1", "LT1", "LT2", "LT3", "LT4", "LT5", "LV1", "LV2", "LV3", "LS1", "LS2", "LK1", "LN1", "LN2", "LR1"]
const [rawPath, ...rest] = process.argv.slice(2)
const migrated = rest.includes("--migrated")
const dryRun = rest.includes("--dry-run")
const problems = []
const fail = () => {
  console.error(`ABORT, nothing written:\n${problems.join("\n")}`)
  process.exit(1)
}
if (!rawPath || rawPath.startsWith("--")) {
  problems.push("usage: node p2b-budget.mjs <path> ID=from:to ... [--migrated] [--dry-run]")
  fail()
}
const path = rawPath.startsWith("D/") ? D + rawPath.slice(2) : rawPath.startsWith("c/") ? C + rawPath.slice(2) : rawPath
const edits = rest.filter((arg) => !arg.startsWith("--")).map((arg) => {
  const match = /^([A-Z0-9]+)=(\d+):(\d+)$/.exec(arg)
  if (!match || !(match[1] === "R7" || IDS.includes(match[1]))) {
    problems.push(`bad edit: ${arg} (want ID=from:to with ID R7 or one of ${IDS.join(" ")})`)
    return null
  }
  return { id: match[1], from: Number(match[2]), to: Number(match[3]) }
}).filter(Boolean)
for (const edit of edits) if (edits.filter((other) => other.id === edit.id).length > 1) problems.push(`${edit.id} named twice`)
for (const edit of edits) if (edit.to > edit.from) problems.push(`${edit.id}: ${edit.from} -> ${edit.to} raises a budget; a budget never goes up`)
if (problems.length) fail()

// How a row key for this path can be spelled in the two files.
const esc = (text) => text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")
const spellings = [`"${path}"`]
if (path.startsWith(D)) spellings.push("[`${D}" + path.slice(D.length) + "`]", "`${D}" + path.slice(D.length) + "`")
if (path.startsWith(C)) spellings.push("[`${C}" + path.slice(C.length) + "`]", "`${C}" + path.slice(C.length) + "`")
const KEY = `(?:${spellings.map(esc).join("|")})`
const GROUP = /^\s+\/\/ (?:2B-\d|no 2B plan|2C plan 4)/

function load(file) {
  const raw = readFileSync(file, "utf8")
  return { file, raw, eol: raw.includes("\r\n") ? "\r\n" : "\n", lines: raw.split(/\r?\n/) }
}
// [start, end] of `const NAME …` up to its closing line at column 0 (start === end for a one-line value).
function block(doc, name) {
  const start = doc.lines.findIndex((line) => line !== null && new RegExp(`^const ${name}\\b`).test(line))
  if (start === -1) return null
  if (/= [{[].*[}\]]\s*$/.test(doc.lines[start])) return [start, start]
  const end = doc.lines.findIndex((line, index) => index > start && line !== null && /^[}\]]/.test(line))
  return [start, end]
}
// [start, end] of the `  ID: {` sub-object inside BUDGETS or KEEP.
function subBlock(doc, name, id) {
  const outer = block(doc, name)
  if (!outer) return null
  const start = doc.lines.findIndex((line, index) => index > outer[0] && index < outer[1] && line !== null && new RegExp(`^  ${id}: \\{`).test(line))
  if (start === -1) return null
  if (/\}\s*,?\s*(?:\/\/.*)?$/.test(doc.lines[start])) return [start, start]
  const end = doc.lines.findIndex((line, index) => index > start && line !== null && /^  \},?\s*$/.test(line))
  return [start, end]
}
function evaluate(doc, name) {
  const range = block(doc, name)
  if (!range) return undefined
  const lines = doc.lines.slice(range[0], range[1] + 1).filter((line) => line !== null)
  lines[0] = lines[0].slice(lines[0].indexOf("= ") + 2)
  return Function("D", "C", `return (${lines.join("\n")})`)(D, C)
}
// The row of this path inside [start, end]: { index, value } or null.
function findRow(doc, [start, end]) {
  for (let index = start; index <= end; index += 1) {
    const match = doc.lines[index] === null ? null : new RegExp(`${KEY}\\s*:\\s*(\\d+)`).exec(doc.lines[index])
    if (match) return { index, value: Number(match[1]) }
  }
  return null
}
function setRow(doc, range, row, to) {
  const line = doc.lines[row.index]
  if (to > 0) doc.lines[row.index] = line.replace(new RegExp(`(${KEY}\\s*:\\s*)\\d+`), `$1${to}`)
  else if (range[0] !== range[1] && new RegExp(`^\\s*${KEY}\\s*:\\s*\\d+,?\\s*(?:\\/\\/.*)?$`).test(line)) doc.lines[row.index] = null
  else doc.lines[row.index] = line.replace(new RegExp(`\\s*${KEY}\\s*:\\s*\\d+,?`), "").replace(/\{\s*,?\s*\}/, "{}")
}
// Drop a group comment ("// 2B-1", "// no 2B plan…", "// 2C plan 4…") that no longer heads a row.
function dropEmptyGroups(doc, [start, end]) {
  for (let index = start + 1; index < end; index += 1) {
    if (doc.lines[index] === null || !GROUP.test(doc.lines[index])) continue
    let next = index + 1
    while (next <= end && doc.lines[next] === null) next += 1
    if (next > end || GROUP.test(doc.lines[next]) || /^\s*\},?\s*$/.test(doc.lines[next])) doc.lines[index] = null
  }
}

const lfg = load(LFG)
const vfg = load(VFG)
const before = { BUDGETS: evaluate(lfg, "BUDGETS"), KEEP: evaluate(lfg, "KEEP"), MIGRATED: evaluate(lfg, "MIGRATED_LIST_FILES"), FILLS: evaluate(vfg, "TABLE_HEADER_FILLS") }
if (!before.BUDGETS || !before.KEEP || !before.MIGRATED) problems.push(`${LFG}: BUDGETS, KEEP or MIGRATED_LIST_FILES not found`)
if (!before.FILLS) problems.push(`${VFG}: TABLE_HEADER_FILLS not found`)
if (problems.length) fail()

const expected = { BUDGETS: structuredClone(before.BUDGETS), FILLS: { ...before.FILLS } }
const log = []
for (const id of ["R7", ...IDS]) {
  const doc = id === "R7" ? vfg : lfg
  const range = id === "R7" ? block(vfg, "TABLE_HEADER_FILLS") : subBlock(lfg, "BUDGETS", id)
  if (!range) { problems.push(`${id}: its object was not found`); continue }
  const row = findRow(doc, range)
  const current = row?.value ?? 0
  const edit = edits.find((candidate) => candidate.id === id)
  if (!edit) { if (current > 0) problems.push(`${id} still holds ${current} for ${path}: name it (${id}=${current}:${current} keeps it)`); continue }
  if (edit.from !== current) { problems.push(`${id}: expected ${edit.from} for ${path}, the file holds ${current}`); continue }
  if (edit.to === edit.from) { if (current > 0) log.push(`${id}: ${current} kept`); continue }
  setRow(doc, range, row, edit.to)
  dropEmptyGroups(doc, range)
  const target = id === "R7" ? expected.FILLS : expected.BUDGETS[id]
  if (edit.to > 0) target[path] = edit.to
  else delete target[path]
  log.push(`${id}: ${edit.from} -> ${edit.to}${edit.to === 0 ? " (row deleted)" : ""}`)
}

if (migrated) {
  const range = block(lfg, "MIGRATED_LIST_FILES")
  const entry = path.startsWith(D) ? "  `${D}" + path.slice(D.length) + "`," : path.startsWith(C) ? "  `${C}" + path.slice(C.length) + "`," : `  "${path}",`
  if (!existsSync(path)) problems.push(`--migrated: ${path} is no such file (a deleted file only loses its rows)`)
  else if (before.MIGRATED.includes(path)) problems.push(`${path} is already in MIGRATED_LIST_FILES`)
  else if (range[0] === range[1] && /= \[\]\s*$/.test(lfg.lines[range[0]])) lfg.lines.splice(range[0], 1, lfg.lines[range[0]].replace(/\[\]\s*$/, "["), entry, "]")
  else if (range[0] === range[1]) problems.push("MIGRATED_LIST_FILES is a one-line list that is not empty: add the entry by hand")
  else lfg.lines.splice(range[1], 0, entry)
  for (const id of IDS) {
    const left = expected.BUDGETS[id]?.[path] ?? 0
    const keep = before.KEEP[id]?.[path] ?? 0
    if (left > keep) problems.push(`--migrated: ${id} would keep ${left} for ${path}, but KEEP allows ${keep}`)
  }
  if ((expected.FILLS[path] ?? 0) > 0) problems.push(`--migrated: R7 would keep ${expected.FILLS[path]} for ${path}; a file 2B is done with has no table-header fill`)
  log.push("MIGRATED_LIST_FILES: added")
}
if (problems.length) fail()

// Re-read both objects from the edited text: only the named rows may have changed.
const after = { BUDGETS: evaluate(lfg, "BUDGETS"), KEEP: evaluate(lfg, "KEEP"), MIGRATED: evaluate(lfg, "MIGRATED_LIST_FILES"), FILLS: evaluate(vfg, "TABLE_HEADER_FILLS") }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const sorted = (rows) => Object.fromEntries(Object.entries(rows).map(([id, value]) => [id, typeof value === "object" ? Object.fromEntries(Object.entries(value).sort()) : value]).sort())
if (!same(sorted(after.BUDGETS), sorted(expected.BUDGETS))) problems.push("BUDGETS after the edit is not what the edits ask for (check the file by hand)")
if (!same(Object.entries(after.FILLS).sort(), Object.entries(expected.FILLS).sort())) problems.push("TABLE_HEADER_FILLS after the edit is not what the edits ask for (check the file by hand)")
if (!same(after.KEEP, before.KEEP)) problems.push("KEEP changed; this script never edits KEEP")
if (!same(after.MIGRATED, migrated ? [...before.MIGRATED, path] : before.MIGRATED)) problems.push("MIGRATED_LIST_FILES after the edit is not what was asked")
if (problems.length) fail()

for (const line of log) console.log(line)
if (dryRun) {
  console.log(`dry run: ${path}, nothing written`)
  process.exit(0)
}
for (const doc of [lfg, vfg]) {
  const text = doc.lines.filter((line) => line !== null).join(doc.eol)
  if (text !== doc.raw) writeFileSync(doc.file, text)
}
console.log(`written: ${path}`)
```

`ID=from:to` lowers the row from `from` to `to`; `to = 0` deletes the line; `ID=n:n` keeps a row the task leaves in place (every row the file holds must be named, so none is forgotten). Write `D/…` and `c/…` paths to avoid quoting `[locale]` and `(dashboard)`; a full path needs quotes in both bash and PowerShell. `--migrated` also refuses when a row would stay above `KEEP`, when the R7 row is not deleted, or when the file does not exist. Step 7 exercises it with `--dry-run`; this task writes no row with it.

- [ ] **Step 3: VFG R7 per file, with no rows yet (the failing test)**

In `tests/visual-foundation-guards.test.ts` (CRLF), replace:

```ts
test("R7 interim: table-header fills wait for DataTable (2B)", () => {
  // 2B lowers 44 as DataTable takes the header fills over, then drops the header filter above. Never raise it.
  const fills = countMatchesByFile(sources, NEUTRAL_FILL_OPACITY)
  const total = Object.values(fills).reduce((sum, count) => sum + count, 0)
  assert.ok(total <= 44, `at most 44 table-header fills may remain, found ${total}: ${JSON.stringify(fills)}`)
})
```

with:

```ts
// R7 per file: the table-header fills (bg-muted/NN, bg-accent/NN, border-border/NN) at d38a0ee, all on <thead lines.
// The commit that moves a table onto DataTable deletes its row; never raise one. Phase 2B plan 5 drops the <th line
// filter above and keeps one test with the rows of the 2C batch 4 files; 2C plan 4 or 2D empties those.
const D = "src/app/[locale]/(dashboard)/"
const TABLE_HEADER_FILLS: Record<string, number> = {}

test("R7 interim: table-header fills wait for DataTable (2B), file by file", () => {
  // A file missing from TABLE_HEADER_FILLS may have none. The commit that moves a table onto DataTable deletes its row.
  assertWithinBudget(NEUTRAL_FILL_OPACITY, TABLE_HEADER_FILLS)
})
```

Run: `node --test tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 26 · pass 25 · fail 1`. The failing test is `R7 interim: table-header fills wait for DataTable (2B), file by file`, and its message lists every HEAD fill as over a 0 budget:
```
AssertionError [ERR_ASSERTION]: 44 matches in 31 files; over budget:
src/app/[locale]/(dashboard)/admin/logs/page.tsx: 1 > 0
src/app/[locale]/(dashboard)/admin/roles/page.tsx: 2 > 0
src/app/[locale]/(dashboard)/admin/storage/page.tsx: 3 > 0
src/app/[locale]/(dashboard)/admin/users/page.tsx: 1 > 0
src/app/[locale]/(dashboard)/assets/[id]/page.tsx: 2 > 0
src/app/[locale]/(dashboard)/audit/findings/page.tsx: 1 > 0
src/app/[locale]/(dashboard)/audit/rounds/page.tsx: 1 > 0
src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx: 1 > 0
src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx: 1 > 0
src/app/[locale]/(dashboard)/disposal/batches/page.tsx: 2 > 0
src/app/[locale]/(dashboard)/disposal/batches/[id]/page.tsx: 2 > 0
src/app/[locale]/(dashboard)/disposal/page.tsx: 2 > 0
src/app/[locale]/(dashboard)/maintenance/page.tsx: 1 > 0
src/app/[locale]/(dashboard)/master-data/branches/page.tsx: 1 > 0
src/app/[locale]/(dashboard)/master-data/brands/page.tsx: 1 > 0
src/app/[locale]/(dashboard)/master-data/categories/page.tsx: 1 > 0
src/app/[locale]/(dashboard)/master-data/companies/page.tsx: 1 > 0
src/app/[locale]/(dashboard)/master-data/departments/page.tsx: 1 > 0
src/app/[locale]/(dashboard)/master-data/employees/page.tsx: 1 > 0
src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx: 3 > 0
src/app/[locale]/(dashboard)/master-data/locations/page.tsx: 1 > 0
src/app/[locale]/(dashboard)/my-assets/page.tsx: 1 > 0
src/components/admin/asset-state-review-workspace.tsx: 1 > 0
src/components/admin/IntegrationClientManager.tsx: 1 > 0
src/components/admin/role-permission-form.tsx: 1 > 0
src/components/admin/system-settings-form.tsx: 3 > 0
src/components/assets/asset-batch-form.tsx: 3 > 0
src/components/assets/asset-import-preview-panel.tsx: 1 > 0
src/components/master-data/supplier-list-view.tsx: 1 > 0
src/components/master-data/supplier-purchase-documents.tsx: 1 > 0
src/components/reports/responsive-report-list.tsx: 1 > 0

31 !== 0
```

- [ ] **Step 4: Fill `TABLE_HEADER_FILLS` with the 31 rows at HEAD**

In the same file, replace:

```ts
const TABLE_HEADER_FILLS: Record<string, number> = {}
```

with:

```ts
const TABLE_HEADER_FILLS: Record<string, number> = {
  // 2B-1
  [`${D}admin/users/page.tsx`]: 1,
  [`${D}master-data/branches/page.tsx`]: 1,
  [`${D}master-data/brands/page.tsx`]: 1,
  [`${D}master-data/categories/page.tsx`]: 1,
  [`${D}master-data/companies/page.tsx`]: 1,
  [`${D}master-data/departments/page.tsx`]: 1,
  [`${D}master-data/employees/page.tsx`]: 1,
  [`${D}master-data/locations/page.tsx`]: 1,
  "src/components/admin/system-settings-form.tsx": 3,
  "src/components/assets/asset-batch-form.tsx": 3,
  "src/components/master-data/supplier-list-view.tsx": 1,
  // 2B-2
  [`${D}audit/findings/page.tsx`]: 1,
  [`${D}audit/rounds/[id]/page.tsx`]: 1,
  [`${D}audit/rounds/[id]/pending/page.tsx`]: 1,
  [`${D}audit/rounds/page.tsx`]: 1,
  [`${D}disposal/batches/[id]/page.tsx`]: 2,
  [`${D}disposal/batches/page.tsx`]: 2,
  [`${D}disposal/page.tsx`]: 2,
  [`${D}maintenance/page.tsx`]: 1,
  "src/components/admin/asset-state-review-workspace.tsx": 1,
  // 2B-4
  [`${D}assets/[id]/page.tsx`]: 2,
  [`${D}master-data/employees/[id]/page.tsx`]: 3,
  "src/components/master-data/supplier-purchase-documents.tsx": 1,
  // 2B-5
  [`${D}admin/logs/page.tsx`]: 1,
  [`${D}admin/roles/page.tsx`]: 2,
  [`${D}admin/storage/page.tsx`]: 3,
  [`${D}my-assets/page.tsx`]: 1,
  "src/components/reports/responsive-report-list.tsx": 1,
  // 2C plan 4 or 2D (2C batch 4 files, R-e)
  "src/components/admin/IntegrationClientManager.tsx": 1,
  "src/components/admin/role-permission-form.tsx": 1,
  "src/components/assets/asset-import-preview-panel.tsx": 1,
}
```

Run: `node --test tests/visual-foundation-guards.test.ts`
Expected: PASS, `tests 26 · pass 26 · fail 0`.

- [ ] **Step 5: Create `tests/list-frame-guards.test.ts` with empty `BUDGETS` (the failing guards)**

Create the file with this content, LF line endings:

```ts
import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import test from "node:test"
import {
  budgetOverruns,
  countByFile,
  countMatchesByFile,
  findJsxTags,
  hasJsxAttr,
  jsxAttrValue,
  readSourceFiles,
  type SourceFile,
} from "./helpers/source-files.ts"

// Phase 2B list-frame guards (spec 2B §9.3, rulings I11, I14 and I15). BUDGETS start at the d38a0ee counts
// (spec §10.4 table C) and only go down: the commit that moves a site lowers that file's rows, deleting rows that
// reach 0, and adds the file to MIGRATED_LIST_FILES once 2B is done with it. A file missing from a budget may have
// none; a listed file may have at most its number. Never raise a number. Phase 2B plan 5 sets BUDGETS to KEEP;
// phase 2D widens the guards to all of src and sets every budget to {}. 2C never needs to edit this file.
const sources = readSourceFiles("src")
const D = "src/app/[locale]/(dashboard)/"
const C = "src/components/"
// Screen code: pages and components. src/lib and the API routes are out (R-n keeps "-" there).
const offScreen = (path: string) => !(path.startsWith("src/app/") || path.startsWith(C)) || path.startsWith("src/app/api/")
const skip = (...owners: string[]) => (path: string) => offScreen(path) || owners.includes(path)
const skipUi = (path: string) => offScreen(path) || path.startsWith(`${C}ui/`)
const NAV_PRIMITIVES = ["ui/tab-nav.tsx", "ui/breadcrumbs.tsx", "ui/pagination.tsx", "ui/steps.tsx", "ui/stat-strip.tsx", "layout/sidebar.tsx", "layout/mobile-field-navigation.tsx"].map((path) => C + path)
const tagsWhere = (names: string[], keep: (text: string) => boolean) => (file: SourceFile) => findJsxTags(file.source, names).filter((tag) => keep(tag.text)).length

// Files 2B is done with, in commit order. The commit that finishes a file adds its line and lowers its rows; never remove one.
const MIGRATED_LIST_FILES: string[] = []

// A function named …Pagination that does not render <Pagination>: a thin wrapper that only builds hrefs is fine.
function handPaginations(file: SourceFile): number {
  let count = 0
  for (const match of file.source.matchAll(/\bfunction [A-Z]\w*Pagination\b/g)) {
    const rest = file.source.slice(match.index + "function ".length)
    const next = rest.search(/\n(?:export )?(?:async )?function |\nconst [A-Z]/)
    if (!/<Pagination(?=[\s/>])/.test(next === -1 ? rest : rest.slice(0, next))) count++
  }
  return count
}
// A disabled look made of opacity: the line has opacity-N and pointer-events-none or cursor-not-allowed, none behind a variant (disabled:, hover:).
const fadedDisabled = (line: string) => /(?<![\w:-])opacity-\d+\b/.test(line) && /(?<![\w:-])(?:pointer-events-none|cursor-not-allowed)\b/.test(line)

const HEADER_OWNER = `${C}ui/page-header.tsx`
const OLD_HEADER = /\bMasterDataHeader\b|\bReportHeader\b|\bfunction PageHeader\b/g
const BACK_ICON = /<ArrowLeft\b/g
const DOUBLE_BOTTOM_PADDING = /\bpb-(?:24|36)\b/g
const LOCAL_FILTER_SELECT = /\bfunction (?:FilterSelect|ReportSelect|LabeledSelect)\b|\bfunction Filter\(/g
const HEADER_LOOK = /\bbg-(?:muted|accent)(?![\w/-])|\buppercase\b/ // the /NN fills belong to VFG R7
const LOCAL_SORT_HEADER = /\bfunction (?:[A-Z]\w*)?Sort\w*Header\b/g
const BARE_LOCALE_STRING = /\.toLocaleString\(\)/g
const RAW_DASH = /(?:\|\||\?\?|:)\s*"-"/g
const FORMAT_CURRENCY = /(?<!function )\bformatCurrency\(/g
const LOCAL_STAT_TILE = /\bfunction (?:SummaryTile|SummaryCard|SummaryPill|SummaryStrip|RoleAuditCard|ResolutionMetric|CoverageMetric|Metric|DashboardCard|BatchMetric|MetricCard|OperationMetric)\b/g
const METRIC_CARD_TAG = /<MetricCard(?=[\s/>])/g
const LOCAL_KEY_VALUE = /\bfunction (?:Info|InfoRow|DetailItem|BatchInfo|MobileAuditDetailField)\b/g
const UI_NAME = /\bfunction (?:StatusBadge|MetricCard|ColumnHeader|PageHeader|Pagination|DataTable|TabNav|StatStrip|KeyValueList|RowActions|TableEmptyRow|EmptyNote|Nil)\b/g
const ROW_DELETE_BUTTON = /<[A-Z]\w*DeleteButton\s+id=/g
const pageCurrent = (text: string) => /"page"/.test(jsxAttrValue(text, "aria-current") ?? "")

const COUNTERS: Record<string, () => Record<string, number>> = {
  LH1: () => countByFile(sources, tagsWhere(["h1"], () => true), skip(HEADER_OWNER)),
  LH2: () => countMatchesByFile(sources, OLD_HEADER, skip(HEADER_OWNER)),
  LB1: () => countMatchesByFile(sources, BACK_ICON, skip(HEADER_OWNER)),
  LP1: () => countMatchesByFile(sources, DOUBLE_BOTTOM_PADDING, (path) => !path.startsWith(D)),
  LF1: () => countMatchesByFile(sources, LOCAL_FILTER_SELECT, skipUi),
  LT1: () => countByFile(sources, tagsWhere(["thead", "th"], (text) => HEADER_LOOK.test(text)), offScreen),
  LT2: () => countMatchesByFile(sources, LOCAL_SORT_HEADER, skip(`${C}ui/data-table.tsx`)),
  LT3: () => countByFile(sources, (file) => findJsxTags(file.source, ["td"]).filter((tag) => hasJsxAttr(tag.text, "colSpan")).length, skip(`${C}ui/data-table.tsx`)),
  LT4: () => countByFile(sources, handPaginations, skip(`${C}ui/pagination.tsx`)),
  LT5: () => countByFile(sources, (file) => file.source.split("\n").filter(fadedDisabled).length, offScreen),
  LV1: () => countMatchesByFile(sources, BARE_LOCALE_STRING, offScreen),
  LV2: () => countMatchesByFile(sources, RAW_DASH, offScreen),
  LV3: () => countMatchesByFile(sources, FORMAT_CURRENCY, offScreen),
  LS1: () => countMatchesByFile(sources, LOCAL_STAT_TILE, skipUi),
  LS2: () => countMatchesByFile(sources, METRIC_CARD_TAG, offScreen),
  LK1: () => countMatchesByFile(sources, LOCAL_KEY_VALUE, skipUi),
  LN1: () => countByFile(sources, tagsWhere(["[A-Za-z][\\w.]*"], pageCurrent), (path) => offScreen(path) || NAV_PRIMITIVES.includes(path)),
  LN2: () => countMatchesByFile(sources, UI_NAME, skipUi),
  LR1: () => countMatchesByFile(sources, ROW_DELETE_BUTTON, offScreen),
}

const TITLES: Record<string, string> = {
  LH1: "page titles (<h1>) come from PageHeader",
  LH2: "MasterDataHeader, ReportHeader and local PageHeader functions give way to PageHeader",
  LB1: "page back buttons go through PageBackLink, not a hand-placed ArrowLeft",
  LP1: "pages under the shell do not add pb-24 or pb-36 on top of the shell's bottom space",
  LF1: "list filters use the shared FilterSelect, not a local select helper",
  LT1: "table headers have no solid muted or accent fill and no capitals",
  LT2: "sortable column headers come from DataTableHead with aria-sort, not a local helper",
  LT3: "empty table rows are TableEmptyRow, not a hand-written <td colSpan>",
  LT4: "page links come from Pagination, not a local …Pagination that draws its own",
  LT5: "nothing looks disabled through opacity with pointer-events-none or cursor-not-allowed",
  LV1: "numbers on screen go through formatCount or formatMoney, not a bare toLocaleString()",
  LV2: "empty values on screen are Nil or orNil, not a typed \"-\"",
  LV3: "money on screen goes through formatMoney, not formatCurrency",
  LS1: "number tiles come from StatStrip, not a local tile function",
  LS2: "MetricCard gives way to StatStrip",
  LK1: "detail values come from KeyValueList, not a local Info or DetailItem helper",
  LN1: "aria-current=\"page\" is set by TabNav, StatStrip, Pagination and the menus, not by hand",
  LN2: "no local function takes the name of a shared component",
  LR1: "delete buttons in table rows move into the ⋯ menu of RowActions",
}

// ---- Budgets at d38a0ee (spec §10.4 table C, per file as spec §9.4.1–9.4.2). Groups name the first 2B plan that
// edits the file (spec §8.5–8.9, I12); "→ n (KEEP)" = what stays after 2B, and why. The LB1 rows marked 0 → 1 are the
// only two rows above the d38a0ee count (spec §9.4.1 note "LB1 0→1").
const BUDGETS: Record<string, Record<string, number>> = {}

// What may stay after phase 2B, with the reason (spec §9.4.3, I11, I14). L0 holds every file of MIGRATED_LIST_FILES
// to these numbers. 2C plan 4 or 2D empties the rest; phase 2D sets every budget to {}. Change a row only with a spec ruling.
const KEEP: Record<string, Record<string, number>> = {
  LH1: {
    "src/app/[locale]/(auth)/login/page.tsx": 1, // no shell (phase 3, with the login frame)
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // print page
    [`${C}assets/asset-label-print.tsx`]: 1, // print page
    [`${C}audit/audit-scan-header.tsx`]: 1, // field scan header, its own variant
    [`${C}assets/asset-scan-search-tool.tsx`]: 1, // 2C plan 4 moves it onto PageHeader (I13)
    [`${C}assets/asset-label-batch-tool.tsx`]: 1, // 2C plan 4 moves it onto PageHeader (I13)
  },
  LB1: {
    [`${C}admin/system-settings-form.tsx`]: 1, // the move-out button :1412, not a page back
    [`${C}disposal/disposal-batch-form.tsx`]: 1, // back to editing in the review step :93 (2C)
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // print page
    [`${C}assets/asset-label-print.tsx`]: 1, // print page
    [`${C}audit/audit-scan-header.tsx`]: 1, // field scan header
    [`${D}audit/rounds/[id]/page.tsx`]: 1, // back item of the mobile action bar (O11 owns the bar)
    [`${D}maintenance/[id]/page.tsx`]: 1, // back item of the mobile action bar (O11 owns the bar)
  },
  LP1: {
    [`${D}assets/[id]/page.tsx`]: 1, // O11, 2C plan 5
    [`${D}audit/rounds/[id]/page.tsx`]: 1, // O11, 2C plan 5
    [`${D}maintenance/[id]/page.tsx`]: 1, // O11, 2C plan 5
    [`${D}disposal/[id]/page.tsx`]: 1, // O11, 2C plan 5
  },
  LT1: {
    [`${C}admin/role-permission-form.tsx`]: 2, // 2C batch 4 (R-e)
    [`${C}assets/asset-import-preview-panel.tsx`]: 5, // 2C batch 4 (R-e, O13)
  },
  LV1: {
    [`${C}admin/IntegrationClientManager.tsx`]: 3, // R-f, 2C plan 4
    [`${C}assets/asset-import-preview-panel.tsx`]: 4, // R-f, 2C plan 4
    [`${C}assets/asset-label-batch-tool.tsx`]: 1, // R-f, 2C plan 4
  },
  LV2: {
    [`${D}assets/[id]/page.tsx`]: 4, // translated-sentence arguments :1198, :1200 and the history sentence :2462 (R-n)
    [`${C}admin/system-settings-form.tsx`]: 8, // 2C form (2D)
    [`${C}asset-operations/checkin-form.tsx`]: 9, // 2C form (2D)
    [`${C}assets/asset-batch-form.tsx`]: 8, // 2C form (2D)
    [`${C}assets/asset-component-manager.tsx`]: 3, // 2C form (2D)
    [`${C}assets/asset-form.tsx`]: 1, // 2C form (2D)
    [`${C}assets/asset-label-batch-tool.tsx`]: 6, // label data (R-n)
    [`${C}audit/audit-finding-review-actions.tsx`]: 3, // review dialog (2D)
    [`${C}assets/asset-import-preview-panel.tsx`]: 2, // 2C batch 4 (2D)
    [`${C}disposal/disposal-batch-form.tsx`]: 3, // 2C form (2D)
    [`${C}audit/audit-scan-check-form.tsx`]: 3, // translated sentences (R-n)
    [`${C}audit/audit-scan-offline-bar.tsx`]: 1, // translated sentence (R-n)
    [`${D}asset-management/labels/page.tsx`]: 4, // label data (R-n)
    "src/app/[locale]/(print)/asset-management/checkins/[id]/page.tsx": 2, // print page (R-n)
    "src/app/[locale]/(print)/asset-management/checkouts/[id]/page.tsx": 4, // print page (R-n)
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // print page (R-n)
    [`${C}asset-operations/void-document-banner.tsx`]: 3, // 2D
    [`${C}assets/asset-movement-timeline.tsx`]: 2, // 2D
    [`${C}assets/asset-purchase-documents.tsx`]: 1, // 2D
  },
  LV3: {
    "src/app/[locale]/(print)/disposal/[id]/print/page.tsx": 5, // print page, 2D (A/08:305)
    "src/app/[locale]/(print)/maintenance/[id]/print/page.tsx": 1, // print page, 2D (A/08:305)
  },
  LS1: {
    [`${C}admin/IntegrationClientManager.tsx`]: 2, // OperationMetric :763, SummaryCard :782 (2C plan 4)
    [`${C}assets/asset-import-preview-panel.tsx`]: 1, // SummaryPill :461 (2C plan 4)
    [`${C}admin/system-settings-form.tsx`]: 1, // Metric :2413 (2D)
    [`${C}disposal/disposal-bulk-approval.tsx`]: 1, // Metric :572 in the dialog (2C plan 3)
  },
  LK1: {
    [`${C}assets/asset-movement-timeline.tsx`]: 1, // Info :133, not in a 2B plan (2D)
  },
  LN1: {
    [`${D}master-data/brands/page.tsx`]: 2, // the brand picker is a vertical list, where aria-current="page" is right (I11)
  },
  LN2: {
    [`${C}admin/IntegrationClientManager.tsx`]: 1, // local StatusBadge :797 (2C plan 4)
  },
}

test("the list-frame counters read JSX and lines as intended", () => {
  const file = (source: string): SourceFile => ({ path: "src/components/x.tsx", source })
  assert.equal(tagsWhere(["h1"], () => true)(file('// <h1>old</h1>\n<h1 className="x">a</h1>')), 1)
  assert.equal(handPaginations(file("function APagination() {\n  return <Pagination page={1} />\n}\nfunction BPagination() {\n  return <nav />\n}")), 1)
  assert.equal(fadedDisabled('className="pointer-events-none opacity-50"'), true)
  assert.equal(fadedDisabled('className="disabled:pointer-events-none disabled:opacity-50"'), false)
  const current = tagsWhere(["[A-Za-z][\\w.]*"], pageCurrent)
  assert.equal(current(file('<Link aria-current={active ? "page" : undefined} /><li aria-current={on ? "step" : undefined} />')), 1)
  assert.equal(tagsWhere(["thead", "th"], (text) => HEADER_LOOK.test(text))(file('<thead className="bg-muted/40"><th className="uppercase">')), 1)
  assert.deepEqual(countMatchesByFile([file('{a || "-"} {b ?? "-"} {c ? d : "-"} {"a-b"} "x-y"')], RAW_DASH), { "src/components/x.tsx": 3 })
  assert.deepEqual(countMatchesByFile([file("export function formatCurrency(value) {}\nformatCurrency(1)")], FORMAT_CURRENCY), { "src/components/x.tsx": 1 })
  assert.deepEqual(countMatchesByFile([file('<BranchDeleteButton id={row.id} /><DeleteButtonGroup id="x" />')], ROW_DELETE_BUTTON), { "src/components/x.tsx": 1 })
  assert.equal(offScreen("src/app/api/assets/route.ts"), true)
  assert.equal(offScreen("src/lib/utils.ts"), true)
  assert.equal(offScreen(`${D}assets/page.tsx`), false)
})

for (const [id, title] of Object.entries(TITLES)) {
  test(`${id} ${title}`, () => {
    const counts = COUNTERS[id]()
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
    assert.deepEqual(
      budgetOverruns(counts, BUDGETS[id] ?? {}),
      [],
      `${id}: ${total} in ${Object.keys(counts).length} files. Lower a number in the commit that moves a site; never raise one. Phase 2D sets every budget to {}.`,
    )
  })
}

test("L0 a file 2B is done with keeps only what KEEP allows, and every row names a real file and a known guard", () => {
  const problems: string[] = []
  const ids = Object.keys(COUNTERS)
  if (Object.keys(TITLES).join() !== ids.join()) problems.push(`TITLES and COUNTERS name different guards: ${Object.keys(TITLES).join()} / ${ids.join()}`)
  for (const [name, table] of [["BUDGETS", BUDGETS], ["KEEP", KEEP]] as const) {
    for (const [id, rows] of Object.entries(table)) {
      if (!ids.includes(id)) problems.push(`${name}.${id}: no such guard`)
      for (const path of Object.keys(rows)) if (!existsSync(path)) problems.push(`${name}.${id}: ${path} is no such file, delete the row`)
    }
  }
  for (const path of MIGRATED_LIST_FILES) {
    if (!existsSync(path)) problems.push(`MIGRATED_LIST_FILES: ${path} is no such file`)
    if (MIGRATED_LIST_FILES.indexOf(path) !== MIGRATED_LIST_FILES.lastIndexOf(path)) problems.push(`MIGRATED_LIST_FILES: ${path} is listed twice`)
  }
  for (const [id, count] of Object.entries(COUNTERS)) {
    const counts = count()
    for (const path of MIGRATED_LIST_FILES) {
      const keep = KEEP[id]?.[path] ?? 0
      if ((counts[path] ?? 0) > keep) problems.push(`${id} ${path}: ${counts[path]} > ${keep}`)
      if ((BUDGETS[id]?.[path] ?? 0) > keep) problems.push(`${id} ${path}: the BUDGETS row ${BUDGETS[id][path]} must come down to KEEP ${keep}`)
    }
  }
  assert.deepEqual(problems, [])
})
```

Run: `node --test tests/list-frame-guards.test.ts`
Expected: FAIL, `tests 21 · pass 2 · fail 19`. The sample test and `L0` pass (every `KEEP` row names a real file). Each of the 19 guards fails with every HEAD site over a 0 budget, and its message carries exactly the table C total:
```
AssertionError [ERR_ASSERTION]: LH1: 60 in 60 files. Lower a number in the commit that moves a site; never raise one. Phase 2D sets every budget to {}.
AssertionError [ERR_ASSERTION]: LH2: 27 in 15 files. Lower a number in the commit that moves a site; never raise one. Phase 2D sets every budget to {}.
AssertionError [ERR_ASSERTION]: LB1: 27 in 27 files. Lower a number in the commit that moves a site; never raise one. Phase 2D sets every budget to {}.
AssertionError [ERR_ASSERTION]: LP1: 8 in 8 files. Lower a number in the commit that moves a site; never raise one. Phase 2D sets every budget to {}.
AssertionError [ERR_ASSERTION]: LF1: 10 in 10 files. Lower a number in the commit that moves a site; never raise one. Phase 2D sets every budget to {}.
AssertionError [ERR_ASSERTION]: LT1: 43 in 17 files. Lower a number in the commit that moves a site; never raise one. Phase 2D sets every budget to {}.
AssertionError [ERR_ASSERTION]: LT2: 8 in 8 files. Lower a number in the commit that moves a site; never raise one. Phase 2D sets every budget to {}.
AssertionError [ERR_ASSERTION]: LT3: 16 in 15 files. Lower a number in the commit that moves a site; never raise one. Phase 2D sets every budget to {}.
AssertionError [ERR_ASSERTION]: LT4: 11 in 11 files. Lower a number in the commit that moves a site; never raise one. Phase 2D sets every budget to {}.
AssertionError [ERR_ASSERTION]: LT5: 23 in 12 files. Lower a number in the commit that moves a site; never raise one. Phase 2D sets every budget to {}.
AssertionError [ERR_ASSERTION]: LV1: 44 in 17 files. Lower a number in the commit that moves a site; never raise one. Phase 2D sets every budget to {}.
AssertionError [ERR_ASSERTION]: LV2: 128 in 43 files. Lower a number in the commit that moves a site; never raise one. Phase 2D sets every budget to {}.
AssertionError [ERR_ASSERTION]: LV3: 42 in 13 files. Lower a number in the commit that moves a site; never raise one. Phase 2D sets every budget to {}.
AssertionError [ERR_ASSERTION]: LS1: 30 in 27 files. Lower a number in the commit that moves a site; never raise one. Phase 2D sets every budget to {}.
AssertionError [ERR_ASSERTION]: LS2: 20 in 6 files. Lower a number in the commit that moves a site; never raise one. Phase 2D sets every budget to {}.
AssertionError [ERR_ASSERTION]: LK1: 11 in 11 files. Lower a number in the commit that moves a site; never raise one. Phase 2D sets every budget to {}.
AssertionError [ERR_ASSERTION]: LN1: 13 in 11 files. Lower a number in the commit that moves a site; never raise one. Phase 2D sets every budget to {}.
AssertionError [ERR_ASSERTION]: LN2: 7 in 7 files. Lower a number in the commit that moves a site; never raise one. Phase 2D sets every budget to {}.
AssertionError [ERR_ASSERTION]: LR1: 10 in 8 files. Lower a number in the commit that moves a site; never raise one. Phase 2D sets every budget to {}.
```

- [ ] **Step 6: Fill `BUDGETS` with the HEAD counts**

In `tests/list-frame-guards.test.ts`, replace:

```ts
const BUDGETS: Record<string, Record<string, number>> = {}
```

with:

```ts
const BUDGETS: Record<string, Record<string, number>> = {
  LH1: {
    // 2B-1
    [`${D}admin/users/page.tsx`]: 1,
    [`${D}disposal/batch/new/page.tsx`]: 1,
    [`${D}disposal/new/page.tsx`]: 1,
    [`${D}maintenance/new/page.tsx`]: 1,
    [`${D}maintenance/pm/[id]/edit/page.tsx`]: 1,
    [`${D}maintenance/pm/new/page.tsx`]: 1,
    [`${C}admin/admin-user-form.tsx`]: 1,
    [`${C}admin/role-permission-form.tsx`]: 1,
    [`${C}asset-operations/bulk-move-form.tsx`]: 1,
    [`${C}asset-operations/checkin-form.tsx`]: 1,
    [`${C}asset-operations/checkout-form.tsx`]: 1,
    [`${C}asset-operations/transfer-form.tsx`]: 1,
    [`${C}assets/asset-batch-form.tsx`]: 1,
    [`${C}assets/asset-component-manager.tsx`]: 1,
    [`${C}assets/asset-form.tsx`]: 1,
    [`${C}audit/audit-round-form.tsx`]: 1,
    [`${C}master-data/asset-model-form.tsx`]: 1,
    [`${C}master-data/branch-form.tsx`]: 1,
    [`${C}master-data/brand-form.tsx`]: 1,
    [`${C}master-data/category-form.tsx`]: 1,
    [`${C}master-data/company-form.tsx`]: 1,
    [`${C}master-data/department-form.tsx`]: 1,
    [`${C}master-data/employee-form.tsx`]: 1,
    [`${C}master-data/location-form.tsx`]: 1,
    [`${C}master-data/master-data-layout.tsx`]: 1,
    [`${C}master-data/supplier-form.tsx`]: 1,
    // 2B-2
    [`${D}admin/data-quality/page.tsx`]: 1,
    [`${D}admin/integrations/page.tsx`]: 1,
    [`${D}audit/rounds/[id]/page.tsx`]: 1,
    [`${D}audit/rounds/[id]/pending/page.tsx`]: 1,
    [`${D}disposal/batches/[id]/page.tsx`]: 1,
    [`${D}disposal/batches/page.tsx`]: 1,
    [`${D}disposal/page.tsx`]: 1,
    [`${D}maintenance/page.tsx`]: 1,
    [`${D}maintenance/pm/page.tsx`]: 1,
    // 2B-3
    [`${D}asset-management/import-export/page.tsx`]: 1,
    // 2B-4
    [`${D}assets/[id]/page.tsx`]: 1,
    [`${D}disposal/[id]/page.tsx`]: 1,
    [`${D}maintenance/[id]/page.tsx`]: 1,
    [`${D}master-data/employees/[id]/page.tsx`]: 1,
    [`${D}master-data/suppliers/[id]/page.tsx`]: 1,
    [`${D}my-assets/[id]/page.tsx`]: 1,
    // 2B-5
    [`${D}admin/approvals/history/page.tsx`]: 1,
    [`${D}admin/approvals/page.tsx`]: 1,
    [`${D}admin/logs/page.tsx`]: 1,
    [`${D}admin/readiness/page.tsx`]: 1,
    [`${D}admin/roles/page.tsx`]: 1,
    [`${D}admin/settings/page.tsx`]: 1,
    [`${D}admin/storage/page.tsx`]: 1,
    [`${D}dashboard/page.tsx`]: 1,
    [`${D}my-assets/page.tsx`]: 1,
    [`${D}notifications/page.tsx`]: 1,
    [`${D}work-center/page.tsx`]: 1,
    [`${C}reports/report-header.tsx`]: 1,
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    "src/app/[locale]/(auth)/login/page.tsx": 1, // → 1 (KEEP): no shell (phase 3, with the login frame)
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // → 1 (KEEP): print page
    [`${C}assets/asset-label-batch-tool.tsx`]: 1, // → 1 (KEEP): 2C plan 4 moves it onto PageHeader (I13)
    [`${C}assets/asset-label-print.tsx`]: 1, // → 1 (KEEP): print page
    [`${C}assets/asset-scan-search-tool.tsx`]: 1, // → 1 (KEEP): 2C plan 4 moves it onto PageHeader (I13)
    [`${C}audit/audit-scan-header.tsx`]: 1, // → 1 (KEEP): field scan header, its own variant
  },
  LH2: {
    // 2B-1
    [`${D}master-data/branches/page.tsx`]: 2,
    [`${D}master-data/brands/page.tsx`]: 2,
    [`${D}master-data/categories/page.tsx`]: 2,
    [`${D}master-data/companies/page.tsx`]: 2,
    [`${D}master-data/departments/page.tsx`]: 2,
    [`${D}master-data/employees/page.tsx`]: 2,
    [`${D}master-data/locations/page.tsx`]: 2,
    [`${D}master-data/suppliers/page.tsx`]: 2,
    [`${C}master-data/master-data-layout.tsx`]: 1, // 2B-5 deletes MasterDataHeader (R-h)
    // 2B-2
    [`${D}audit/findings/page.tsx`]: 2,
    [`${D}audit/rounds/page.tsx`]: 2,
    // 2B-3
    [`${D}assets/page.tsx`]: 2,
    // 2B-5
    [`${D}my-assets/page.tsx`]: 1, // local PageHeader :163-170 (I14)
    [`${D}reports/page.tsx`]: 2,
    [`${C}reports/report-header.tsx`]: 1,
  },
  LB1: {
    // 2B-1
    [`${D}disposal/batch/new/page.tsx`]: 1,
    [`${D}disposal/new/page.tsx`]: 1,
    [`${C}admin/admin-user-form.tsx`]: 1,
    [`${C}admin/role-permission-form.tsx`]: 1,
    [`${C}admin/system-settings-form.tsx`]: 1, // → 1 (KEEP): the move-out button :1412, not a page back
    [`${C}assets/asset-component-manager.tsx`]: 1,
    [`${C}assets/asset-form.tsx`]: 1,
    [`${C}master-data/asset-model-form.tsx`]: 1,
    [`${C}master-data/branch-form.tsx`]: 1,
    [`${C}master-data/brand-form.tsx`]: 1,
    [`${C}master-data/category-form.tsx`]: 1,
    [`${C}master-data/company-form.tsx`]: 1,
    [`${C}master-data/department-form.tsx`]: 1,
    [`${C}master-data/employee-form.tsx`]: 1,
    [`${C}master-data/location-form.tsx`]: 1,
    [`${C}master-data/supplier-form.tsx`]: 1,
    // 2B-2
    [`${D}audit/rounds/[id]/page.tsx`]: 1, // 0 → 1: 2B-2 swaps the Download icon of the bar's back item :479 for ArrowLeft
    [`${D}disposal/batches/[id]/page.tsx`]: 1,
    [`${D}disposal/batches/page.tsx`]: 1,
    // 2B-4
    [`${D}assets/[id]/page.tsx`]: 1,
    [`${D}disposal/[id]/page.tsx`]: 1,
    [`${D}maintenance/[id]/page.tsx`]: 1, // 0 → 1: 2B-4 swaps the Wrench icon of the bar's back item :147 for ArrowLeft
    [`${D}master-data/employees/[id]/page.tsx`]: 1,
    [`${D}master-data/suppliers/[id]/page.tsx`]: 1,
    [`${D}my-assets/[id]/page.tsx`]: 1,
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // → 1 (KEEP): print page
    [`${C}assets/asset-label-print.tsx`]: 1, // → 1 (KEEP): print page
    [`${C}audit/audit-scan-header.tsx`]: 1, // → 1 (KEEP): field scan header
    [`${C}disposal/disposal-batch-form.tsx`]: 1, // → 1 (KEEP): back to editing in the review step :93 (2C)
  },
  LP1: {
    // 2B-2
    [`${D}audit/rounds/[id]/page.tsx`]: 1, // → 1 (KEEP): O11, 2C plan 5
    [`${D}disposal/batches/[id]/page.tsx`]: 1,
    // 2B-4
    [`${D}assets/[id]/page.tsx`]: 1, // → 1 (KEEP): O11, 2C plan 5
    [`${D}disposal/[id]/page.tsx`]: 1, // → 1 (KEEP): O11, 2C plan 5
    [`${D}maintenance/[id]/page.tsx`]: 1, // → 1 (KEEP): O11, 2C plan 5
    [`${D}master-data/employees/[id]/page.tsx`]: 1,
    [`${D}master-data/suppliers/[id]/page.tsx`]: 1,
    [`${D}my-assets/[id]/page.tsx`]: 1,
  },
  LF1: {
    // 2B-1
    [`${D}master-data/branches/page.tsx`]: 1,
    [`${D}master-data/brands/page.tsx`]: 1,
    [`${D}master-data/categories/page.tsx`]: 1,
    [`${D}master-data/companies/page.tsx`]: 1,
    [`${D}master-data/employees/page.tsx`]: 1,
    [`${D}master-data/locations/page.tsx`]: 1,
    [`${D}master-data/suppliers/page.tsx`]: 1,
    // 2B-2
    [`${C}admin/asset-state-review-workspace.tsx`]: 1,
    // 2B-3
    [`${C}assets/asset-register-filter-sheet.tsx`]: 1,
    // 2B-5
    [`${C}reports/report-filter-panel.tsx`]: 1,
  },
  LT1: {
    // 2B-1
    [`${D}master-data/branches/page.tsx`]: 1,
    [`${D}master-data/categories/page.tsx`]: 1,
    [`${D}master-data/companies/page.tsx`]: 1,
    [`${D}master-data/employees/page.tsx`]: 1,
    [`${D}master-data/locations/page.tsx`]: 1,
    [`${C}admin/role-permission-form.tsx`]: 2, // → 2 (KEEP): 2C batch 4 (R-e)
    [`${C}admin/system-settings-form.tsx`]: 1,
    [`${C}master-data/master-data-layout.tsx`]: 2, // 2B-5 deletes ColumnHeader and SortableColumnHeader (R-h)
    [`${C}master-data/supplier-list-view.tsx`]: 1,
    // 2B-3
    [`${C}assets/asset-register-table.tsx`]: 2,
    // 2B-4
    [`${D}assets/[id]/page.tsx`]: 10,
    [`${D}master-data/employees/[id]/page.tsx`]: 1,
    // 2B-5
    [`${D}admin/logs/page.tsx`]: 1,
    [`${D}admin/storage/page.tsx`]: 11,
    [`${D}my-assets/page.tsx`]: 1,
    [`${C}reports/responsive-report-list.tsx`]: 1,
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${C}assets/asset-import-preview-panel.tsx`]: 5, // → 5 (KEEP): 2C batch 4 (R-e, O13)
  },
  LT2: {
    // 2B-1
    [`${D}master-data/branches/page.tsx`]: 1,
    [`${D}master-data/categories/page.tsx`]: 1,
    [`${D}master-data/companies/page.tsx`]: 1,
    [`${D}master-data/employees/page.tsx`]: 1,
    [`${D}master-data/locations/page.tsx`]: 1,
    [`${C}master-data/master-data-layout.tsx`]: 1, // 2B-5 deletes SortableColumnHeader (R-h)
    [`${C}master-data/supplier-list-view.tsx`]: 1,
    // 2B-3
    [`${C}assets/asset-register-table.tsx`]: 1,
  },
  LT3: {
    // 2B-1
    [`${D}admin/users/page.tsx`]: 1,
    [`${D}master-data/branches/page.tsx`]: 1,
    [`${D}master-data/brands/page.tsx`]: 1,
    [`${D}master-data/categories/page.tsx`]: 1,
    [`${D}master-data/companies/page.tsx`]: 1,
    [`${D}master-data/departments/page.tsx`]: 1,
    [`${D}master-data/employees/page.tsx`]: 1,
    [`${D}master-data/locations/page.tsx`]: 1,
    // 2B-2
    [`${D}audit/findings/page.tsx`]: 1,
    [`${D}audit/rounds/[id]/page.tsx`]: 1,
    [`${D}audit/rounds/[id]/pending/page.tsx`]: 1,
    [`${D}audit/rounds/page.tsx`]: 1,
    [`${D}disposal/page.tsx`]: 1,
    // 2B-3
    [`${C}assets/asset-register-table.tsx`]: 1,
    // 2B-5
    [`${D}admin/storage/page.tsx`]: 2,
  },
  LT4: {
    // 2B-1
    [`${D}master-data/branches/page.tsx`]: 1,
    [`${D}master-data/brands/page.tsx`]: 1,
    [`${D}master-data/categories/page.tsx`]: 1,
    [`${D}master-data/companies/page.tsx`]: 1,
    [`${D}master-data/employees/page.tsx`]: 1,
    [`${D}master-data/locations/page.tsx`]: 1,
    [`${C}master-data/master-data-layout.tsx`]: 1, // 2B-5 deletes MasterDataPagination (R-h)
    [`${C}master-data/supplier-list-view.tsx`]: 1,
    // 2B-2
    [`${D}audit/rounds/[id]/page.tsx`]: 1,
    [`${C}disposal/disposal-pagination.tsx`]: 1,
    [`${C}maintenance/maintenance-pagination.tsx`]: 1,
  },
  LT5: {
    // 2B-1
    [`${D}master-data/branches/page.tsx`]: 2,
    [`${D}master-data/brands/page.tsx`]: 2,
    [`${D}master-data/categories/page.tsx`]: 2,
    [`${D}master-data/companies/page.tsx`]: 2,
    [`${D}master-data/employees/page.tsx`]: 2,
    [`${D}master-data/locations/page.tsx`]: 2,
    [`${C}master-data/master-data-layout.tsx`]: 2, // 2B-5 deletes MasterDataPagination (R-h)
    [`${C}master-data/supplier-list-view.tsx`]: 2,
    // 2B-2
    [`${D}audit/rounds/[id]/page.tsx`]: 2,
    [`${C}disposal/disposal-pagination.tsx`]: 2,
    [`${C}maintenance/maintenance-pagination.tsx`]: 2,
    // 2B-4
    [`${D}assets/[id]/page.tsx`]: 1,
  },
  LV1: {
    // 2B-1
    [`${D}master-data/branches/page.tsx`]: 4,
    [`${D}master-data/brands/page.tsx`]: 2,
    [`${D}master-data/categories/page.tsx`]: 3,
    [`${D}master-data/companies/page.tsx`]: 4,
    [`${D}master-data/employees/page.tsx`]: 2,
    [`${D}master-data/locations/page.tsx`]: 3,
    [`${D}master-data/suppliers/page.tsx`]: 1,
    [`${C}admin/depreciation-policy-builder.tsx`]: 1,
    [`${C}master-data/supplier-list-view.tsx`]: 4,
    // 2B-2
    [`${C}admin/asset-state-review-workspace.tsx`]: 1,
    // 2B-4
    [`${D}master-data/employees/[id]/page.tsx`]: 1,
    [`${D}master-data/suppliers/[id]/page.tsx`]: 1,
    [`${C}master-data/supplier-purchase-documents.tsx`]: 2,
    // 2B-5
    [`${D}admin/storage/page.tsx`]: 7,
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${C}admin/IntegrationClientManager.tsx`]: 3, // → 3 (KEEP): R-f, 2C plan 4
    [`${C}assets/asset-import-preview-panel.tsx`]: 4, // → 4 (KEEP): R-f, 2C plan 4
    [`${C}assets/asset-label-batch-tool.tsx`]: 1, // → 1 (KEEP): R-f, 2C plan 4
  },
  LV2: {
    // 2B-1
    [`${D}admin/users/page.tsx`]: 2,
    [`${D}master-data/branches/page.tsx`]: 1,
    [`${D}master-data/brands/page.tsx`]: 1,
    [`${D}master-data/categories/page.tsx`]: 1,
    [`${D}master-data/companies/page.tsx`]: 2,
    [`${D}master-data/employees/page.tsx`]: 2,
    [`${D}master-data/locations/page.tsx`]: 1,
    [`${C}admin/system-settings-form.tsx`]: 8, // → 8 (KEEP): 2C form (2D)
    [`${C}asset-operations/checkin-form.tsx`]: 9, // → 9 (KEEP): 2C form (2D)
    [`${C}assets/asset-batch-form.tsx`]: 8, // → 8 (KEEP): 2C form (2D)
    [`${C}assets/asset-component-manager.tsx`]: 3, // → 3 (KEEP): 2C form (2D)
    [`${C}assets/asset-form.tsx`]: 1, // → 1 (KEEP): 2C form (2D)
    [`${C}master-data/supplier-list-view.tsx`]: 5,
    // 2B-2
    [`${D}audit/findings/page.tsx`]: 7,
    [`${D}audit/rounds/[id]/page.tsx`]: 5,
    [`${D}audit/rounds/[id]/pending/page.tsx`]: 1,
    [`${D}disposal/page.tsx`]: 1,
    [`${D}maintenance/page.tsx`]: 1,
    [`${C}audit/audit-finding-review-actions.tsx`]: 3, // → 3 (KEEP): review dialog (2D)
    // 2B-3
    [`${C}assets/asset-register-table.tsx`]: 1,
    // 2B-4
    [`${D}assets/[id]/page.tsx`]: 15, // → 4 (KEEP): translated-sentence arguments :1198, :1200 and the history sentence :2462 (R-n)
    [`${D}disposal/[id]/page.tsx`]: 2,
    [`${D}maintenance/[id]/page.tsx`]: 2,
    [`${D}master-data/employees/[id]/page.tsx`]: 5,
    [`${D}master-data/suppliers/[id]/page.tsx`]: 1,
    [`${D}my-assets/[id]/page.tsx`]: 1,
    [`${C}master-data/supplier-purchase-documents.tsx`]: 2,
    // 2B-5
    [`${D}admin/approvals/page.tsx`]: 1,
    [`${D}admin/roles/page.tsx`]: 1,
    [`${D}admin/storage/page.tsx`]: 1,
    [`${D}my-assets/page.tsx`]: 2,
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${D}asset-management/labels/page.tsx`]: 4, // → 4 (KEEP): label data (R-n)
    "src/app/[locale]/(print)/asset-management/checkins/[id]/page.tsx": 2, // → 2 (KEEP): print page (R-n)
    "src/app/[locale]/(print)/asset-management/checkouts/[id]/page.tsx": 4, // → 4 (KEEP): print page (R-n)
    [`${C}asset-operations/operation-document-print.tsx`]: 1, // → 1 (KEEP): print page (R-n)
    [`${C}asset-operations/void-document-banner.tsx`]: 3, // → 3 (KEEP): 2D
    [`${C}assets/asset-import-preview-panel.tsx`]: 2, // → 2 (KEEP): 2C batch 4 (2D)
    [`${C}assets/asset-label-batch-tool.tsx`]: 6, // → 6 (KEEP): label data (R-n)
    [`${C}assets/asset-movement-timeline.tsx`]: 2, // → 2 (KEEP): 2D
    [`${C}assets/asset-purchase-documents.tsx`]: 1, // → 1 (KEEP): 2D
    [`${C}audit/audit-scan-check-form.tsx`]: 3, // → 3 (KEEP): translated sentences (R-n)
    [`${C}audit/audit-scan-offline-bar.tsx`]: 1, // → 1 (KEEP): translated sentence (R-n)
    [`${C}disposal/disposal-batch-form.tsx`]: 3, // → 3 (KEEP): 2C form (2D)
  },
  LV3: {
    // 2B-2
    [`${D}disposal/batches/[id]/page.tsx`]: 2,
    [`${D}disposal/page.tsx`]: 2,
    [`${D}maintenance/page.tsx`]: 2,
    // 2B-3
    [`${C}assets/asset-register-table.tsx`]: 1,
    // 2B-4
    [`${D}assets/[id]/page.tsx`]: 3,
    [`${D}disposal/[id]/page.tsx`]: 5,
    [`${D}maintenance/[id]/page.tsx`]: 5,
    [`${D}master-data/suppliers/[id]/page.tsx`]: 4,
    [`${C}master-data/supplier-purchase-documents.tsx`]: 2,
    // 2B-5
    [`${D}reports/page.tsx`]: 1,
    [`${C}reports/reports-accounting-view.tsx`]: 9,
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    "src/app/[locale]/(print)/disposal/[id]/print/page.tsx": 5, // → 5 (KEEP): print page, 2D (A/08:305)
    "src/app/[locale]/(print)/maintenance/[id]/print/page.tsx": 1, // → 1 (KEEP): print page, 2D (A/08:305)
  },
  LS1: {
    // 2B-1
    [`${D}master-data/branches/page.tsx`]: 1,
    [`${D}master-data/brands/page.tsx`]: 1,
    [`${D}master-data/categories/page.tsx`]: 1,
    [`${D}master-data/companies/page.tsx`]: 1,
    [`${D}master-data/employees/page.tsx`]: 1,
    [`${D}master-data/locations/page.tsx`]: 1,
    [`${D}master-data/suppliers/page.tsx`]: 1,
    [`${C}admin/system-settings-form.tsx`]: 1, // → 1 (KEEP): Metric :2413 (2D)
    // 2B-2
    [`${D}admin/data-quality/page.tsx`]: 1,
    [`${D}audit/findings/page.tsx`]: 1,
    [`${D}audit/rounds/[id]/page.tsx`]: 2,
    [`${D}audit/rounds/page.tsx`]: 1,
    [`${D}disposal/batches/[id]/page.tsx`]: 1,
    [`${C}disposal/disposal-bulk-approval.tsx`]: 1, // → 1 (KEEP): Metric :572 in the dialog (2C plan 3)
    // 2B-4
    [`${D}assets/[id]/page.tsx`]: 1,
    [`${D}master-data/employees/[id]/page.tsx`]: 1,
    [`${D}master-data/suppliers/[id]/page.tsx`]: 1,
    // 2B-5
    [`${D}admin/approvals/history/page.tsx`]: 1,
    [`${D}admin/approvals/page.tsx`]: 1,
    [`${D}admin/readiness/page.tsx`]: 1,
    [`${D}admin/roles/page.tsx`]: 1,
    [`${D}admin/storage/page.tsx`]: 1,
    [`${D}my-assets/page.tsx`]: 1,
    [`${D}notifications/page.tsx`]: 1,
    [`${D}work-center/page.tsx`]: 2,
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${C}admin/IntegrationClientManager.tsx`]: 2, // → 2 (KEEP): OperationMetric :763, SummaryCard :782 (2C plan 4)
    [`${C}assets/asset-import-preview-panel.tsx`]: 1, // → 1 (KEEP): SummaryPill :461 (2C plan 4)
  },
  LS2: {
    // 2B-4
    [`${D}master-data/suppliers/[id]/page.tsx`]: 5,
    // 2B-5
    [`${D}reports/page.tsx`]: 2,
    [`${D}work-center/page.tsx`]: 1,
    [`${C}reports/reports-accounting-view.tsx`]: 10,
    [`${C}reports/reports-catalog-view.tsx`]: 1,
    [`${C}reports/reports-operations-view.tsx`]: 1,
  },
  LK1: {
    // 2B-2
    [`${D}audit/findings/page.tsx`]: 1,
    [`${D}audit/rounds/[id]/page.tsx`]: 1,
    [`${D}disposal/batches/[id]/page.tsx`]: 1,
    // 2B-3
    [`${D}asset-management/import-export/page.tsx`]: 1,
    // 2B-4
    [`${D}assets/[id]/page.tsx`]: 1,
    [`${D}disposal/[id]/page.tsx`]: 1,
    [`${D}maintenance/[id]/page.tsx`]: 1,
    [`${D}master-data/employees/[id]/page.tsx`]: 1,
    [`${D}master-data/suppliers/[id]/page.tsx`]: 1,
    [`${D}my-assets/[id]/page.tsx`]: 1,
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${C}assets/asset-movement-timeline.tsx`]: 1, // → 1 (KEEP): Info :133, not in a 2B plan (2D)
  },
  LN1: {
    // 2B-1
    [`${D}master-data/brands/page.tsx`]: 2, // → 2 (KEEP): the brand picker is a vertical list, where aria-current="page" is right (I11)
    [`${C}master-data/supplier-list-view.tsx`]: 1,
    // 2B-2
    [`${D}audit/findings/page.tsx`]: 2,
    [`${D}audit/rounds/page.tsx`]: 1,
    [`${D}disposal/page.tsx`]: 1,
    [`${C}disposal/disposal-pagination.tsx`]: 1,
    [`${C}maintenance/maintenance-pagination.tsx`]: 1,
    // 2B-3
    [`${C}assets/asset-register-status-tabs.tsx`]: 1,
    // 2B-4
    [`${C}assets/asset-detail-tabs.tsx`]: 1,
    // 2B-5
    [`${D}work-center/page.tsx`]: 1,
    [`${C}reports/report-view-tabs.tsx`]: 1,
  },
  LN2: {
    // 2B-1
    [`${C}master-data/master-data-layout.tsx`]: 1, // 2B-5 deletes ColumnHeader (R-h)
    // 2B-4
    [`${D}master-data/employees/[id]/page.tsx`]: 1,
    [`${D}master-data/suppliers/[id]/page.tsx`]: 1,
    // 2B-5
    [`${D}my-assets/page.tsx`]: 1, // local PageHeader :163-170 (I14)
    [`${D}notifications/page.tsx`]: 1,
    [`${D}work-center/page.tsx`]: 1,
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    [`${C}admin/IntegrationClientManager.tsx`]: 1, // → 1 (KEEP): local StatusBadge :797 (2C plan 4)
  },
  LR1: {
    // 2B-1
    [`${D}master-data/branches/page.tsx`]: 1,
    [`${D}master-data/brands/page.tsx`]: 2,
    [`${D}master-data/categories/page.tsx`]: 1,
    [`${D}master-data/companies/page.tsx`]: 1,
    [`${D}master-data/departments/page.tsx`]: 1,
    [`${D}master-data/employees/page.tsx`]: 1,
    [`${D}master-data/locations/page.tsx`]: 1,
    [`${C}master-data/supplier-list-view.tsx`]: 2,
  },
}
```

Run: `node --test tests/list-frame-guards.test.ts`
Expected: PASS, `tests 21 · pass 21 · fail 0`.

- [ ] **Step 7: Check the scripts against the new files**

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected (exit 0; the first line shows your HEAD): every row equals its live count except the two LB1 `0 → 1` rows:
```
info    HEAD b16d152 on feat/ui-phase2b · files under src changed since d38a0ee: 0
ok      helpers budgetOverruns, countByFile, countMatchesByFile, findJsxTags, hasJsxAttr, jsxAttrValue, readSourceFiles
info    VFG R7: per file, TABLE_HEADER_FILLS 44 in 31 rows
info    tests/list-frame-guards.test.ts: there · BUDGETS 19 guards · KEEP 11 guards · MIGRATED_LIST_FILES 0 files
ok      R7  TABLE_HEADER_FILLS  44 in 31 rows · live  44 in 31 files · over 0 · slack 0
ok      LH1 BUDGETS.LH1         60 in 60 rows · live  60 in 60 files · over 0 · slack 0
ok      LH2 BUDGETS.LH2         27 in 15 rows · live  27 in 15 files · over 0 · slack 0
ok      LB1 BUDGETS.LB1         29 in 29 rows · live  27 in 27 files · over 0 · slack 2
          slack D/audit/rounds/[id]/page.tsx: budget 1 > live 0 (0 → 1 row, expected until its plan)
          slack D/maintenance/[id]/page.tsx: budget 1 > live 0 (0 → 1 row, expected until its plan)
ok      LP1 BUDGETS.LP1          8 in  8 rows · live   8 in  8 files · over 0 · slack 0
ok      LF1 BUDGETS.LF1         10 in 10 rows · live  10 in 10 files · over 0 · slack 0
ok      LT1 BUDGETS.LT1         43 in 17 rows · live  43 in 17 files · over 0 · slack 0
ok      LT2 BUDGETS.LT2          8 in  8 rows · live   8 in  8 files · over 0 · slack 0
ok      LT3 BUDGETS.LT3         16 in 15 rows · live  16 in 15 files · over 0 · slack 0
ok      LT4 BUDGETS.LT4         11 in 11 rows · live  11 in 11 files · over 0 · slack 0
ok      LT5 BUDGETS.LT5         23 in 12 rows · live  23 in 12 files · over 0 · slack 0
ok      LV1 BUDGETS.LV1         44 in 17 rows · live  44 in 17 files · over 0 · slack 0
ok      LV2 BUDGETS.LV2        128 in 43 rows · live 128 in 43 files · over 0 · slack 0
ok      LV3 BUDGETS.LV3         42 in 13 rows · live  42 in 13 files · over 0 · slack 0
ok      LS1 BUDGETS.LS1         30 in 27 rows · live  30 in 27 files · over 0 · slack 0
ok      LS2 BUDGETS.LS2         20 in  6 rows · live  20 in  6 files · over 0 · slack 0
ok      LK1 BUDGETS.LK1         11 in 11 rows · live  11 in 11 files · over 0 · slack 0
ok      LN1 BUDGETS.LN1         13 in 11 rows · live  13 in 11 files · over 0 · slack 0
ok      LN2 BUDGETS.LN2          7 in  7 rows · live   7 in  7 files · over 0 · slack 0
ok      LR1 BUDGETS.LR1         10 in  8 rows · live  10 in  8 files · over 0 · slack 0
budgets hold: no live count is over its row
```

Run the budget script three times with `--dry-run`; it must write nothing.

Run: `node <temp>/p2b-budget.mjs D/master-data/branches/page.tsx LT4=1:2 --dry-run`
Expected (exit 1):
```
ABORT, nothing written:
LT4: 1 -> 2 raises a budget; a budget never goes up
```

Run: `node <temp>/p2b-budget.mjs D/master-data/branches/page.tsx LT4=1:0 --dry-run`
Expected (exit 1): every other row of the file must be named:
```
ABORT, nothing written:
R7 still holds 1 for src/app/[locale]/(dashboard)/master-data/branches/page.tsx: name it (R7=1:1 keeps it)
LH2 still holds 2 for src/app/[locale]/(dashboard)/master-data/branches/page.tsx: name it (LH2=2:2 keeps it)
LF1 still holds 1 for src/app/[locale]/(dashboard)/master-data/branches/page.tsx: name it (LF1=1:1 keeps it)
LT1 still holds 1 for src/app/[locale]/(dashboard)/master-data/branches/page.tsx: name it (LT1=1:1 keeps it)
LT2 still holds 1 for src/app/[locale]/(dashboard)/master-data/branches/page.tsx: name it (LT2=1:1 keeps it)
LT3 still holds 1 for src/app/[locale]/(dashboard)/master-data/branches/page.tsx: name it (LT3=1:1 keeps it)
LT5 still holds 2 for src/app/[locale]/(dashboard)/master-data/branches/page.tsx: name it (LT5=2:2 keeps it)
LV1 still holds 4 for src/app/[locale]/(dashboard)/master-data/branches/page.tsx: name it (LV1=4:4 keeps it)
LV2 still holds 1 for src/app/[locale]/(dashboard)/master-data/branches/page.tsx: name it (LV2=1:1 keeps it)
LS1 still holds 1 for src/app/[locale]/(dashboard)/master-data/branches/page.tsx: name it (LS1=1:1 keeps it)
LR1 still holds 1 for src/app/[locale]/(dashboard)/master-data/branches/page.tsx: name it (LR1=1:1 keeps it)
```

Run: `node <temp>/p2b-budget.mjs D/master-data/branches/page.tsx R7=1:0 LH2=2:0 LF1=1:0 LT1=1:0 LT2=1:0 LT3=1:0 LT4=1:0 LT5=2:0 LV1=4:0 LV2=1:0 LS1=1:0 LR1=1:0 --migrated --dry-run`
Expected (exit 0), the shape of Task 13's call:
```
R7: 1 -> 0 (row deleted)
LH2: 2 -> 0 (row deleted)
LF1: 1 -> 0 (row deleted)
LT1: 1 -> 0 (row deleted)
LT2: 1 -> 0 (row deleted)
LT3: 1 -> 0 (row deleted)
LT4: 1 -> 0 (row deleted)
LT5: 2 -> 0 (row deleted)
LV1: 4 -> 0 (row deleted)
LV2: 1 -> 0 (row deleted)
LS1: 1 -> 0 (row deleted)
LR1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
dry run: src/app/[locale]/(dashboard)/master-data/branches/page.tsx, nothing written
```

Run: `git status --short src tests messages`
Expected: exactly ` M tests/visual-foundation-guards.test.ts` and `?? tests/list-frame-guards.test.ts`. The dry runs changed nothing.

- [ ] **Step 8: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `tests 1833 · pass 1832 · fail 0 · skipped 1` (21 more tests than the 1812 baseline: the 21 of LFG; VFG still has 26).
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/` (`npx eslint tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts` prints nothing).

Run: `git diff --stat` then `wc -l tests/list-frame-guards.test.ts`
Expected:
- `git diff --stat` shows one file, `tests/visual-foundation-guards.test.ts`, with 46 insertions and 5 deletions.
- `tests/list-frame-guards.test.ts` has 681 lines.
- `node -e "const s=require('fs').readFileSync('tests/visual-foundation-guards.test.ts','utf8');console.log((s.match(/\r\n/g)||[]).length, (s.match(/\n/g)||[]).length)"` prints `348 348` (still CRLF throughout). A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).
- Git may warn that LF will be replaced by CRLF in `tests/list-frame-guards.test.ts`. Leave it LF.

- [ ] **Step 9: Commit**

```bash
git add tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts
git commit -m "test(ui): R7 budgets per file and the list-frame guards at the 2B seeds (2B-1 task 1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 2 files in the commit (`git show --stat HEAD`: 727 insertions, 5 deletions). `git status --short src tests messages` prints nothing.

**For the plan 2B-1 dev-app check (Task 25):** nothing to look at; this task changes tests only. Task 25 records the guard numbers after the plan (spec §10.4 table C column "หลัง 2B-1") with `node <temp>/p2b1-precheck.mjs --budgets`.

---

### Task 2: Sidebar menu (B1, I27) · `layout/sidebar.tsx`

Spec §10.3 row 2, with B1, I27, §4.2.2 (the new tree), §4.2.3 (what changes in `sidebar.tsx`), §4.2.4 (the key), §4.8 rulings 1–6, §4.11 (the new test) and the §10.2 message table row "2B-1 · 2". One menu, one commit. `sidebar.tsx` and both message files are CRLF; edit `sidebar.tsx` with exact-string replacement only, and the message files only through `node scripts/messages-edit.mjs`.

Rulings this task applies:
- **B1:** "ทะเบียนทรัพย์สิน" (`assetRegister`) is the first row of the "ทรัพย์สิน" section, a plain link one click away. The "ทะเบียน" level (`assetRegistryGroup`) goes. "จัดการทรัพย์สิน" keeps add, scan/search, labels and import/export; "ธุรกรรม" (`assetTransactionsGroup`) moves up to a first-level group with check-out, check-in, transfer and bulk move. The menu is at most two levels deep.
- **I27:** icons are unique across the whole menu, because the collapsed rail shows icons only. Ten positions change: `assetManagement` `Package` → `Boxes`, `assetTransactionsGroup` `ArrowRightLeft` 18 → `Handshake` 20, `bulkMove` `MapPin` → `Move`, `auditRound` `ClipboardCheck` → `ClipboardList`, `auditFinding` `History` → `ListX`, `department` `Users` → `Network`, `userManagement` `Users` → `UserCog`, `rolePermission` `Settings` → `LockKeyhole`, `fileStorage` `Database` → `HardDrive`, `systemSetting` `Settings` → `SlidersHorizontal`. `assetRegister` keeps `Package` and grows 18 → 20 because it is now a first-level row. `KeyRound` stays (`tests/integration-api-client-admin.test.ts:120`). Result: 39 positions (34 rows and 5 groups), 39 names. All ten new names are main exports of the installed `lucide-react` 1.14.0 (the precheck confirms). No import is removed: `Package`, `ArrowRightLeft`, `MapPin`, `ClipboardCheck`, `History`, `Users`, `Database` and `Settings` are all still used.
- **§4.2.3:** `SidebarGroup` loses `depth` (the prop, its default and the `depth={depth + 1}` hand-down), because no group holds a group any more. Every group's child list is indented 20px (`ml-5`). Ruling (spec wording): §4.2.3 says the ternary `depth === 0 ? "ml-5" : "ml-4"` becomes `"ml-5"`; this task writes `ml-5` into the first class string of the same `cn(…)` instead of leaving a one-word argument. Same classes, same CSS.
- **§4.2.4:** delete `nav.assetRegistryGroup` from both message files. Keep the word in `tests/navigation-active.test.ts:49`: that fixture tests how the helper walks nested groups and never reads the real menu. Do not edit the finished plan `docs/superpowers/plans/2026-10-10-ui-foundation.md`.
- labelKey, href and permission of every row stay as they are. No new message key and no text change (§4.8 ruling 3), so no glossary review.
- **§4.8 ruling 4, the test:** `tests/sidebar-menu-structure.test.ts` reads the menu from the source of `sidebar.tsx` (between `const menuSections` and `const visibleSections`); the tree does not move to `src/lib`.

What users will see:
- "ทะเบียนทรัพย์สิน" is the first row under "ทรัพย์สิน", with no group to open. From any page the register is 1 click away (was 3).
- "จัดการทรัพย์สิน ▸" holds เพิ่มทรัพย์สิน, สแกน/ค้นหาทรัพย์สิน, พิมพ์ป้าย and นำเข้า/ส่งออก. "ธุรกรรม ▸" sits beside it as its own group with ส่งมอบทรัพย์สิน, รับคืนทรัพย์สิน, โอนย้ายทรัพย์สิน and อัปเดตหลายรายการ. Each of these is 2 clicks away (was 3).
- A user with only `asset:view` sees the register, "จัดการทรัพย์สิน ▸" with scan, labels and import/export, and no "ธุรกรรม" group (all four rows need `asset:edit`; `filterNavigationItemsByPermission` drops a group left with no rows, `src/lib/navigation-permissions.ts:29`).
- In the collapsed rail (`lg:w-16`) no two rows share an icon.
- On `/th/assets` and `/th/assets/<id>` the register row is selected and no group opens. `/th/assets/new` opens "จัดการทรัพย์สิน"; `/th/asset-management/checkout` opens "ธุรกรรม" (§4.2.5; the hrefs and `getActiveNavigationHref` do not change).

Not in this task:
- remembering open groups, a rail tooltip, Enter in the top search going to the register, a home page per role, favourites (phase 3, B1)
- `DESIGN.md:489` and the other docs (Task 26)
- `tests/list-frame-guards.test.ts`: no row changes. `sidebar.tsx` is in `NAV_PRIMITIVES` (LN1 skips it) and holds no other counted pattern.

**Files:**
- Modify: `src/components/layout/sidebar.tsx` (CRLF, 6 replacements)
- Modify: `messages/th.json`, `messages/en.json` (CRLF, through `node scripts/messages-edit.mjs` only: 1 key deleted in each)
- Create: `tests/sidebar-menu-structure.test.ts` (LF, 5 tests)
- Temp folder only, never committed: `p2b-t2-precheck.mjs`, `p2b-t2-messages.json`

**Must keep passing without edits:**
- `tests/dashboard-shell-theme.test.ts:8-31` (sidebar tokens, `aria-current={ariaCurrent}`, `role="group" aria-labelledby={headingId}`, the three section keys)
- `tests/navigation-active.test.ts` (its fixture `:44-49` keeps `assetRegistryGroup`, see the ruling above)
- `tests/permission-aware-navigation.test.ts:18-53`
- `tests/my-assets-route-ui.test.ts:35-45`. Its `doesNotMatch(/labelKey: "myAssets"[\s\S]{0,220}permission: \{ module: "asset", action: "view" \}/)` still holds: after this task the register's `asset:view` permission is 330 characters after `labelKey: "myAssets"` (344 in the CRLF file the test reads).
- `tests/integration-api-client-admin.test.ts:117-122` (`KeyRound`, the `integrationApi` href and permission)
- `tests/sheet-drawers-ui.test.ts:47-60`, `tests/mobile-field-navigation-ui.test.ts:59-80`, `tests/dropdown-menus-ui.test.ts:52-54`
- `tests/messages-parity.test.ts`, `tests/thai-glossary.test.ts`
- `tests/list-frame-guards.test.ts` (every row, unchanged)

**Interfaces:**
- Consumes:
  - Task 1: `tests/list-frame-guards.test.ts` exists and is green. This task leaves it as it is.
  - `filterNavigationSectionsByPermission` / `filterNavigationItemsByPermission` (`@/lib/navigation-permissions`) and `collectNavigationHrefs`, `containsNavigationHref`, `getActiveNavigationHref`, `isExactNavigationMatch` (`@/lib/navigation-active`), unchanged. They handle any depth.
  - `lucide-react` 1.14.0: `Boxes`, `Handshake`, `Move`, `ClipboardList`, `ListX`, `Network`, `UserCog`, `LockKeyhole`, `HardDrive`, `SlidersHorizontal`.
- Produces:
  - `src/components/layout/sidebar.tsx`: `type MenuItem` and `type MenuSection` unchanged (`MenuItem` can still nest; the test keeps it at two levels). `type SidebarItemProps = { item: MenuItem; collapsed: boolean; activeHref: string | null; pathname: string; t: (key: string) => string; onNavigate: () => void }`, no `depth`. The tree: 3 sections, 34 rows, 5 groups, 39 distinct icons, every icon written `icon: <Name size={20} />` at the first level and `size={18}` inside a group.
  - `messages/{th,en}.json`: no `nav.assetRegistryGroup`.
  - `tests/sidebar-menu-structure.test.ts`: LF, 5 tests. Task 26 cites it in `DESIGN.md:489`.

- [ ] **Step 1: Check what this task builds on**

Save this script as `p2b-t2-precheck.mjs` in your temp folder (never in the repo):

```js
// p2b-t2-precheck.mjs: run from the repo root before Task 2 of plan 2B-1. Reads only; writes nothing. Never commit this file.
// Confirms that Task 1 landed and that the menu is still the d38a0ee menu the old snippets of Task 2 quote.
import { existsSync, readFileSync } from "node:fs"

const raw = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "")
const isCrlf = (text) => text.length > 0 && (text.match(/\r\n/g) ?? []).length === (text.match(/\n/g) ?? []).length
const sidebarRaw = raw("src/components/layout/sidebar.tsx")
const sidebar = sidebarRaw.replace(/\r\n/g, "\n")
const menu = sidebar.slice(sidebar.indexOf("const menuSections"), sidebar.indexOf("const visibleSections"))
const nav = (locale) => JSON.parse(raw(`messages/${locale}.json`) || "{}").nav ?? {}
const lucide = raw("node_modules/lucide-react/dist/lucide-react.d.ts")
const NEW_ICONS = ["Boxes", "Handshake", "Move", "ClipboardList", "ListX", "Network", "UserCog", "LockKeyhole", "HardDrive", "SlidersHorizontal"]
const once = (text, needle) => text.split(needle).length - 1 === 1
const endings = (text) => (text.length === 0 ? "missing" : isCrlf(text) ? "CRLF" : text.includes("\r\n") ? "mixed" : "LF")

const checks = {
  "Task 1 landed: tests/list-frame-guards.test.ts exists": existsSync("tests/list-frame-guards.test.ts"),
  "the register group of three levels is still there": once(menu, 'labelKey: "assetRegistryGroup"') && once(menu, '{ labelKey: "assetRegister", href: `/${locale}/assets`'),
  "the menu has 40 icons, each written icon: <Name size={N} />": (menu.match(/\bicon:/g) ?? []).length === 40 && (menu.match(/icon: <\w+ size=\{(?:18|20)\} \/>/g) ?? []).length === 40,
  "SidebarGroup still takes depth (5 words)": (sidebar.match(/\bdepth\b/g) ?? []).length === 5,
  "the import list ends with KeyRound, Rocket, X": sidebar.includes('  KeyRound,\n  Rocket,\n  X,\n} from "lucide-react"'),
  "nav.assetRegistryGroup is ทะเบียน / Register": nav("th").assetRegistryGroup === "ทะเบียน" && nav("en").assetRegistryGroup === "Register",
  "the 10 new icon names are lucide-react exports": NEW_ICONS.every((name) => lucide.includes(`declare const ${name}:`)),
  "tests/sidebar-menu-structure.test.ts is not there yet": !existsSync("tests/sidebar-menu-structure.test.ts"),
}
let missing = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok     " : "MISSING"} ${name}`)
  if (!ok) missing += 1
}
for (const path of ["src/components/layout/sidebar.tsx", "messages/th.json", "messages/en.json"]) console.log(`info    line endings ${endings(raw(path))}: ${path}`)
if (missing > 0) {
  console.error(`ABORT: ${missing} precondition(s) failed. Do not start Task 2; report which.`)
  process.exit(1)
}
console.log("preconditions hold for Task 2")
```

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2b`

Run: `git status --short src tests messages` then `node <temp>/p2b-t2-precheck.mjs`
Expected: `git status` prints nothing. The script prints:
```
ok      Task 1 landed: tests/list-frame-guards.test.ts exists
ok      the register group of three levels is still there
ok      the menu has 40 icons, each written icon: <Name size={N} />
ok      SidebarGroup still takes depth (5 words)
ok      the import list ends with KeyRound, Rocket, X
ok      nav.assetRegistryGroup is ทะเบียน / Register
ok      the 10 new icon names are lucide-react exports
ok      tests/sidebar-menu-structure.test.ts is not there yet
info    line endings CRLF: src/components/layout/sidebar.tsx
info    line endings CRLF: messages/th.json
info    line endings CRLF: messages/en.json
preconditions hold for Task 2
```
On any `MISSING` line, stop and report it.

Run: `git ls-files --eol src/components/layout/sidebar.tsx messages/th.json messages/en.json`
Expected: `i/lf w/crlf` for all three. Keep them as they are.

- [ ] **Step 2: Create the failing test `tests/sidebar-menu-structure.test.ts`**

Create the file with this content, LF line endings:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Phase 2B menu (spec 2B §4.2, B1, I27). sidebar.tsx is CRLF in the working tree, so \r is stripped before the regexes.
// The menu is read from the source between `const menuSections` and `const visibleSections`.
const sidebar = readFileSync("src/components/layout/sidebar.tsx", "utf8").replace(/\r\n/g, "\n")
const menu = sidebar.slice(sidebar.indexOf("const menuSections"), sidebar.indexOf("const visibleSections"))
const nav = (locale: "th" | "en") => (JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { nav: Record<string, string> }).nav

type MenuRow = { key: string; level: number; icon: string | null; size: number | null }

// Every labelKey in source order. level 0 = a section or a row or group of a section; level 1 = inside a group.
// An array opened right after `children:` is a group; one opened inside another group would be a third level.
// A row's icon is the first `icon: <Name size={N} />` after its labelKey and before the next labelKey.
function readMenu(source: string): { rows: MenuRow[]; nestedGroups: number } {
  const arrays: boolean[] = []
  const rows: MenuRow[] = []
  let nestedGroups = 0
  for (let index = 0; index < source.length; index++) {
    if (source[index] === "[") {
      const isChildren = /children:\s*$/.test(source.slice(Math.max(0, index - 24), index))
      if (isChildren && arrays.includes(true)) nestedGroups++
      arrays.push(isChildren)
    } else if (source[index] === "]") {
      arrays.pop()
    } else if (source.startsWith('labelKey: "', index)) {
      const start = index + 'labelKey: "'.length
      const key = source.slice(start, source.indexOf('"', start))
      const nextKey = source.indexOf('labelKey: "', start)
      const own = source.slice(start, nextKey === -1 ? undefined : nextKey)
      const icon = /icon: <(\w+) size=\{(\d+)\} \/>/.exec(own)
      rows.push({ key, level: arrays.filter(Boolean).length, icon: icon?.[1] ?? null, size: icon ? Number(icon[2]) : null })
    }
  }
  return { rows, nestedGroups }
}

const { rows, nestedGroups } = readMenu(menu)
const isSection = (row: MenuRow) => row.key.startsWith("section")

test("the asset register is the first row of the assets section, one click from any page (B1)", () => {
  assert.match(
    menu,
    /labelKey: "sectionAssets",\s*items: \[\s*\{\s*labelKey: "assetRegister",\s*href: `\/\$\{locale\}\/assets`,\s*permission: \{ module: "asset", action: "view" \}/,
  )
  assert.equal(menu.match(/labelKey: "assetRegister"/g)?.length, 1)
})

test("the assets section holds the register, the management and transaction groups, then audit, maintenance and disposal (B1)", () => {
  const first = rows.findIndex((row) => row.key === "sectionAssets")
  const next = rows.findIndex((row) => row.key === "sectionSystem")
  assert.ok(first !== -1 && next > first, "sectionAssets comes before sectionSystem")
  assert.deepEqual(
    rows.slice(first + 1, next).map((row) => `${row.level}:${row.key}`),
    [
      "0:assetRegister",
      "0:assetManagement",
      "1:addAsset",
      "1:scanSearchAsset",
      "1:printLabels",
      "1:importExport",
      "0:assetTransactionsGroup",
      "1:checkout",
      "1:checkin",
      "1:transfer",
      "1:bulkMove",
      "0:audit",
      "1:auditRound",
      "1:auditFinding",
      "0:maintenance",
      "0:disposal",
    ],
  )
})

test("the menu is at most two levels deep, so groups lost their depth prop", () => {
  assert.equal(nestedGroups, 0, "a group inside a group is a third level")
  assert.deepEqual(rows.filter((row) => row.level > 1).map((row) => row.key), [])
  assert.doesNotMatch(sidebar, /\bdepth\b/)
  assert.match(sidebar, /"mt-0\.5 ml-5 space-y-0\.5 border-l border-sidebar-border pl-1"/)
})

test("every row and group has its own icon, because the collapsed rail shows icons only (I27)", () => {
  const items = rows.filter((row) => !isSection(row))
  assert.equal(items.length, 39, "34 rows and 5 groups")
  assert.equal(menu.match(/\bicon:/g)?.length, 39, "every icon is written as icon: <Name size={N} />")
  assert.deepEqual(items.filter((row) => row.icon === null).map((row) => row.key), [])
  const names = items.map((row) => row.icon)
  assert.deepEqual(names.filter((name, index) => names.indexOf(name) !== index), [], "an icon used twice")
  assert.deepEqual(items.filter((row) => row.size !== (row.level === 0 ? 20 : 18)).map((row) => row.key), [], "20px at the first level, 18px inside a group")
})

test("the register group key is gone, and every menu label exists in Thai and English", () => {
  assert.doesNotMatch(sidebar, /assetRegistryGroup/)
  for (const locale of ["th", "en"] as const) {
    const labels = nav(locale)
    assert.equal(labels.assetRegistryGroup, undefined, locale)
    assert.deepEqual(rows.filter((row) => typeof labels[row.key] !== "string").map((row) => row.key), [], locale)
  }
})
```

Run: `node --test tests/sidebar-menu-structure.test.ts`
Expected: FAIL, `tests 5 · pass 0 · fail 5`, each for the reason the menu has today:
- the first test: the regex does not match, because the first row of `sectionAssets` is the `assetManagement` group
- the second: the rows read `0:assetManagement`, `1:assetRegistryGroup`, `2:assetRegister`, …
- the third: `a group inside a group is a third level` (`2 !== 0`)
- the fourth: `34 rows and 5 groups` (`40 !== 39`)
- the fifth: `sidebar.tsx` still matches `/assetRegistryGroup/`

- [ ] **Step 3: Rebuild the menu (`src/components/layout/sidebar.tsx`)**

Six exact replacements. Make all six before you compile: (1) imports the new icons that (2)–(4) use.

(1) The ten new icons, added after `Rocket` in menu order.

Replace:

```tsx
  KeyRound,
  Rocket,
  X,
} from "lucide-react"
```

with:

```tsx
  KeyRound,
  Rocket,
  Boxes,
  Handshake,
  Move,
  ClipboardList,
  ListX,
  Network,
  UserCog,
  LockKeyhole,
  HardDrive,
  SlidersHorizontal,
  X,
} from "lucide-react"
```

(2) The assets section (`:115-152`): the register becomes the first row, the "ทะเบียน" group goes, "ธุรกรรม" moves up one level, and the audit rows get their own icons. `maintenance` and `disposal` below it do not change.

Replace:

```tsx
    {
      labelKey: "sectionAssets",
      items: [
        {
          labelKey: "assetManagement",
          icon: <Package size={20} />,
          children: [
            {
              labelKey: "assetRegistryGroup",
              icon: <Package size={18} />,
              children: [
                { labelKey: "assetRegister", href: `/${locale}/assets`, permission: { module: "asset", action: "view" }, icon: <Package size={18} /> },
                { labelKey: "addAsset", href: `/${locale}/assets/new`, permission: { module: "asset", action: "create" }, icon: <PackagePlus size={18} /> },
                { labelKey: "scanSearchAsset", href: `/${locale}/asset-management/scan`, permission: { module: "asset", action: "view" }, icon: <ScanLine size={18} /> },
                { labelKey: "printLabels", href: `/${locale}/asset-management/labels`, permission: { module: "asset", action: "view" }, icon: <Printer size={18} /> },
                { labelKey: "importExport", href: `/${locale}/asset-management/import-export`, permission: { module: "asset", action: "view" }, icon: <FileSpreadsheet size={18} /> },
              ],
            },
            {
              labelKey: "assetTransactionsGroup",
              icon: <ArrowRightLeft size={18} />,
              children: [
                { labelKey: "checkout", href: `/${locale}/asset-management/checkout`, permission: { module: "asset", action: "edit" }, icon: <LogOut size={18} /> },
                { labelKey: "checkin", href: `/${locale}/asset-management/checkin`, permission: { module: "asset", action: "edit" }, icon: <LogIn size={18} /> },
                { labelKey: "transfer", href: `/${locale}/asset-management/transfer`, permission: { module: "asset", action: "edit" }, icon: <ArrowRightLeft size={18} /> },
                { labelKey: "bulkMove", href: `/${locale}/asset-management/bulk-move`, permission: { module: "asset", action: "edit" }, icon: <MapPin size={18} /> },
              ],
            },
          ],
        },
        {
          labelKey: "audit",
          icon: <ClipboardCheck size={20} />,
          children: [
            { labelKey: "auditRound", href: `/${locale}/audit/rounds`, permission: { module: "audit", action: "view" }, icon: <ClipboardCheck size={18} /> },
            { labelKey: "auditFinding", href: `/${locale}/audit/findings`, permission: { module: "audit", action: "view" }, icon: <History size={18} /> },
          ],
        },
```

with:

```tsx
    {
      labelKey: "sectionAssets",
      items: [
        {
          labelKey: "assetRegister",
          href: `/${locale}/assets`,
          permission: { module: "asset", action: "view" },
          icon: <Package size={20} />,
        },
        {
          labelKey: "assetManagement",
          icon: <Boxes size={20} />,
          children: [
            { labelKey: "addAsset", href: `/${locale}/assets/new`, permission: { module: "asset", action: "create" }, icon: <PackagePlus size={18} /> },
            { labelKey: "scanSearchAsset", href: `/${locale}/asset-management/scan`, permission: { module: "asset", action: "view" }, icon: <ScanLine size={18} /> },
            { labelKey: "printLabels", href: `/${locale}/asset-management/labels`, permission: { module: "asset", action: "view" }, icon: <Printer size={18} /> },
            { labelKey: "importExport", href: `/${locale}/asset-management/import-export`, permission: { module: "asset", action: "view" }, icon: <FileSpreadsheet size={18} /> },
          ],
        },
        {
          labelKey: "assetTransactionsGroup",
          icon: <Handshake size={20} />,
          children: [
            { labelKey: "checkout", href: `/${locale}/asset-management/checkout`, permission: { module: "asset", action: "edit" }, icon: <LogOut size={18} /> },
            { labelKey: "checkin", href: `/${locale}/asset-management/checkin`, permission: { module: "asset", action: "edit" }, icon: <LogIn size={18} /> },
            { labelKey: "transfer", href: `/${locale}/asset-management/transfer`, permission: { module: "asset", action: "edit" }, icon: <ArrowRightLeft size={18} /> },
            { labelKey: "bulkMove", href: `/${locale}/asset-management/bulk-move`, permission: { module: "asset", action: "edit" }, icon: <Move size={18} /> },
          ],
        },
        {
          labelKey: "audit",
          icon: <ClipboardCheck size={20} />,
          children: [
            { labelKey: "auditRound", href: `/${locale}/audit/rounds`, permission: { module: "audit", action: "view" }, icon: <ClipboardList size={18} /> },
            { labelKey: "auditFinding", href: `/${locale}/audit/findings`, permission: { module: "audit", action: "view" }, icon: <ListX size={18} /> },
          ],
        },
```

(3) Departments stop sharing `Users` with employees (`:182`).

Replace:

```tsx
            { labelKey: "department", href: `/${locale}/master-data/departments`, permission: { module: "department", action: "view" }, icon: <Users size={18} /> },
```

with:

```tsx
            { labelKey: "department", href: `/${locale}/master-data/departments`, permission: { module: "department", action: "view" }, icon: <Network size={18} /> },
```

(4) The administration rows (`:194-210`): users, roles, storage and settings get their own icons. `approvalInbox`, `dataQuality`, `integrationApi` (`KeyRound`), `productionReadiness` and `systemLog` keep theirs.

Replace:

```tsx
            { labelKey: "userManagement", href: `/${locale}/admin/users`, permission: { module: "user", action: "view" }, icon: <Users size={18} /> },
            { labelKey: "rolePermission", href: `/${locale}/admin/roles`, permission: { module: "role", action: "view" }, icon: <Settings size={18} /> },
            {
              labelKey: "approvalInbox",
              href: `/${locale}/admin/approvals`,
              anyPermissions: [
                { module: "disposal", action: "approve" },
                { module: "audit", action: "approve" },
              ],
              icon: <FileCheck2 size={18} />,
            },
            { labelKey: "dataQuality", href: `/${locale}/admin/data-quality`, permission: { module: "setting", action: "view" }, icon: <ShieldAlert size={18} /> },
            { labelKey: "integrationApi", href: `/${locale}/admin/integrations`, permission: { module: "setting", action: "view" }, icon: <KeyRound size={18} /> },
            { labelKey: "fileStorage", href: `/${locale}/admin/storage`, permission: { module: "setting", action: "view" }, icon: <Database size={18} /> },
            { labelKey: "productionReadiness", href: `/${locale}/admin/readiness`, permission: { module: "setting", action: "view" }, icon: <Rocket size={18} /> },
            { labelKey: "systemLog", href: `/${locale}/admin/logs`, permission: { module: "system", action: "view" }, icon: <History size={18} /> },
            { labelKey: "systemSetting", href: `/${locale}/admin/settings`, permission: { module: "setting", action: "view" }, icon: <Settings size={18} /> },
```

with:

```tsx
            { labelKey: "userManagement", href: `/${locale}/admin/users`, permission: { module: "user", action: "view" }, icon: <UserCog size={18} /> },
            { labelKey: "rolePermission", href: `/${locale}/admin/roles`, permission: { module: "role", action: "view" }, icon: <LockKeyhole size={18} /> },
            {
              labelKey: "approvalInbox",
              href: `/${locale}/admin/approvals`,
              anyPermissions: [
                { module: "disposal", action: "approve" },
                { module: "audit", action: "approve" },
              ],
              icon: <FileCheck2 size={18} />,
            },
            { labelKey: "dataQuality", href: `/${locale}/admin/data-quality`, permission: { module: "setting", action: "view" }, icon: <ShieldAlert size={18} /> },
            { labelKey: "integrationApi", href: `/${locale}/admin/integrations`, permission: { module: "setting", action: "view" }, icon: <KeyRound size={18} /> },
            { labelKey: "fileStorage", href: `/${locale}/admin/storage`, permission: { module: "setting", action: "view" }, icon: <HardDrive size={18} /> },
            { labelKey: "productionReadiness", href: `/${locale}/admin/readiness`, permission: { module: "setting", action: "view" }, icon: <Rocket size={18} /> },
            { labelKey: "systemLog", href: `/${locale}/admin/logs`, permission: { module: "system", action: "view" }, icon: <History size={18} /> },
            { labelKey: "systemSetting", href: `/${locale}/admin/settings`, permission: { module: "setting", action: "view" }, icon: <SlidersHorizontal size={18} /> },
```

(5) `depth` leaves the props and the group (`:333-347`).

Replace:

```tsx
type SidebarItemProps = {
  item: MenuItem
  collapsed: boolean
  activeHref: string | null
  pathname: string
  t: (key: string) => string
  onNavigate: () => void
  depth?: number
}

function SidebarItem(props: SidebarItemProps) {
  return props.item.children ? <SidebarGroup {...props} /> : <SidebarLink {...props} />
}

function SidebarGroup({ item, collapsed, activeHref, pathname, t, onNavigate, depth = 0 }: SidebarItemProps) {
```

with:

```tsx
type SidebarItemProps = {
  item: MenuItem
  collapsed: boolean
  activeHref: string | null
  pathname: string
  t: (key: string) => string
  onNavigate: () => void
}

function SidebarItem(props: SidebarItemProps) {
  return props.item.children ? <SidebarGroup {...props} /> : <SidebarLink {...props} />
}

// The menu is at most two levels deep (spec 2B B1), so a group's rows always sit 20px in.
function SidebarGroup({ item, collapsed, activeHref, pathname, t, onNavigate }: SidebarItemProps) {
```

(6) The child list is always 20px in, and children no longer get a depth (`:372-393`).

Replace:

```tsx
      {open && (
        <div
          className={cn(
            "mt-0.5 space-y-0.5 border-l border-sidebar-border pl-1",
            depth === 0 ? "ml-5" : "ml-4",
            collapsed && "lg:ml-0 lg:border-l-0 lg:pl-0"
          )}
        >
          {item.children?.map((child) => (
            <SidebarItem
              key={child.labelKey}
              item={child}
              collapsed={collapsed}
              activeHref={activeHref}
              pathname={pathname}
              t={t}
              onNavigate={onNavigate}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
```

with:

```tsx
      {open && (
        <div className={cn("mt-0.5 ml-5 space-y-0.5 border-l border-sidebar-border pl-1", collapsed && "lg:ml-0 lg:border-l-0 lg:pl-0")}>
          {item.children?.map((child) => (
            <SidebarItem
              key={child.labelKey}
              item={child}
              collapsed={collapsed}
              activeHref={activeHref}
              pathname={pathname}
              t={t}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
```

Check: `grep -n "depth\|assetRegistryGroup" src/components/layout/sidebar.tsx` prints nothing.

Run: `node --test tests/sidebar-menu-structure.test.ts`
Expected: FAIL, `tests 5 · pass 4 · fail 1`. Only the fifth test fails, with the message `th`: the key is still in the message files.

- [ ] **Step 4: Delete the key `nav.assetRegistryGroup`**

Save this change file as `p2b-t2-messages.json` in your temp folder:

```json
{ "delete": ["nav.assetRegistryGroup"] }
```

Run (from the repo root): `node scripts/messages-edit.mjs <temp>/p2b-t2-messages.json`
Expected: `messages updated: 0 th, 0 en, 1 deleted`

Run: `git diff --stat messages`
Expected: `messages/en.json | 1 -` and `messages/th.json | 1 -` (the lines `"assetRegistryGroup": "Register",` and `"assetRegistryGroup": "ทะเบียน",`). Any other changed line means the files were not in the script's format before; stop and report.

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/sidebar-menu-structure.test.ts tests/dashboard-shell-theme.test.ts tests/navigation-active.test.ts tests/permission-aware-navigation.test.ts tests/my-assets-route-ui.test.ts tests/integration-api-client-admin.test.ts tests/sheet-drawers-ui.test.ts tests/mobile-field-navigation-ui.test.ts tests/dropdown-menus-ui.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts`
Expected: PASS, `tests 65 · pass 65 · fail 0`.

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `fail 0` (no budget row changes in this task).

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, and 5 more tests than at the end of Task 1 (1 skipped, as before).
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- `git diff --stat` shows exactly 3 files: `src/components/layout/sidebar.tsx` with 41 insertions and 39 deletions, and `messages/th.json` and `messages/en.json` with 1 deletion each (`3 files changed, 41 insertions(+), 41 deletions(-)`).
- `git status` also lists `?? tests/sidebar-menu-structure.test.ts` (101 lines).
- Git may warn that LF will be replaced by CRLF in the new test file. Leave it LF.
- A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/sidebar.tsx messages/th.json messages/en.json tests/sidebar-menu-structure.test.ts
git commit -m "feat(ui): asset register first in the sidebar, two levels and one icon per row (2B-1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the plan 2B-1 dev-app check (Task 25, spec §10.5 row "เมนูข้าง"):**
- 1440 expanded and collapsed, 1024, and 375 (the drawer), with an account that has only `asset:view` and with an admin account.
- "ทะเบียนทรัพย์สิน" is the first row and one click reaches `/th/assets`; check-out and check-in are 2 clicks; no third level anywhere.
- Collapsed: no two icons are the same, and NVDA reads each row's name.
- The selected row is right on `/th/assets/<id>`, `/th/assets/new` and `/th/asset-management/checkout`.
- The drawer returns focus to "เพิ่มเติม" when it closes; "สแกน/ค้นหาทรัพย์สิน" fits on one line at 375.

---

### Task 3: `PageHeader` and `PageBackLink` (I1), with `MasterDataHeader` as a thin wrapper (I2)

Spec §10.3 row 3, with I1, I2, §3.3, §4.3 (API, markup, rules), §4.4.2 (the wrapper), R-h, R-i, §10.4 table A rows "2B-1 · 3" and table B row `tests/list-primitives-ui.test.ts`. One new primitive file and its one existing caller, one commit. `master-data-layout.tsx`, `tests/asset-register-filter-ui.test.ts` and `tests/supplier-adaptive-ui.test.ts` are CRLF; `tests/breadcrumbs-ui.test.ts` is LF. Edit them with exact-string replacement only.

Rulings this task applies:
- **I1:** `src/components/ui/page-header.tsx` exports `PageHeader` and `PageBackLink` with the props, `data-slot`s and class strings of I1, character for character. No `"use client"` and no hook, so server pages and client forms (Tasks 22–24) both render them. `back` is a node, so each page keeps its literal `href={returnToHref}` (the six pins of §9.9 item 2 pass without edits later). `label` is required and has no default. The back button's name is its visible text (`max-md:sr-only` below md), so it has no `aria-label`.
- **I2, R-h:** `MasterDataHeader` keeps its props and its 11 callers and becomes a thin wrapper: `<PageHeader title meta={subtitle} compactOnMobile className={compactOnMobile ? "mb-4 md:mb-6" : "mb-6"} actions={<>{actions}<Link … buttonVariants({ size: "md" })>…</>} />`. The 11 headers look the same from this commit on. 2B-3 changes only `tests/asset-register-filter-ui.test.ts:108`; 2B-5 deletes the wrapper.
- **R-i:** `tests/breadcrumbs-ui.test.ts:38-40` counts both `<Breadcrumbs … />` and the `breadcrumbs={[…]}` prop, and skips `page-header.tsx`, whose one `<Breadcrumbs>` would otherwise make 12 sites. `:41` (11) and `:42` (8) stay; `:55-65` still match, because both forms end in `]}`.
- **§10.4 table A:** `tests/asset-register-filter-ui.test.ts:112-119` moves to the I1 strings in `page-header.tsx` plus `compactOnMobile ? "mb-4 md:mb-6" : "mb-6"` in the wrapper. `tests/supplier-adaptive-ui.test.ts:58` pins `href={createHref} className={buttonVariants({ size: "md" })}` (44px below md, 36px from md); Task 20 moves it to the suppliers page.
- **I16, §3.21 table C:** `tests/list-primitives-ui.test.ts` is new and holds the string pins of every 2B primitive. This task writes the shared part (two lists and two tests) and the header block. Each later primitive task appends its own block with its own server-safe and class checks; the two lists keep `page-header.tsx` only.
- **LFG (I15):** the wrapper has no `<h1>` any more, so this commit lowers `BUDGETS.LH1` for `src/components/master-data/master-data-layout.tsx` from 1 to 0 (deletes the entry). Its other rows stay: LH2 1 (the name `MasterDataHeader`, 2B-5), LN2 1 (`function ColumnHeader`), LT1 2, LT2 1, LT4 1 and LT5 2 (2B-5). `page-header.tsx` is `HEADER_OWNER`, so LH1, LH2 and LB1 skip it; it holds no other counted pattern. The file is not added to `MIGRATED_LIST_FILES`: plans 2B-2 to 2B-5 still edit it (§9.8).
- **Ruling, the budget script:** this task lowers the row with Task 1's `p2b-budget.mjs`, which makes you name every row the file holds (`ID=n:n` keeps one): `c/master-data/master-data-layout.tsx LH1=1:0 LH2=1:1 LT1=2:2 LT2=1:1 LT4=1:1 LT5=2:2 LN2=1:1`. No other budget script.
- **Ruling, the `buttonVariants` import:** `page-header.tsx` imports it from `@/components/ui/button-variants`, like the other files in `ui/`. `master-data-layout.tsx` imports it from `@/components/ui/button`, like the master-data forms, so Task 12 can add `Button` to the same line.
- No new Next.js API: `Link` with `onClick` is already used in `src/components/layout/sidebar.tsx:405`. No new token. Four classes are new to `src` (`max-md:text-xl`, `max-md:px-0`, `max-md:hidden`, `md:gap-x-6`); Step 6 proves they and every other class of the two files compile.

What users will see (the 11 `MasterDataHeader` pages: the 8 master-data lists, `/th/assets`, `/th/audit/findings`, `/th/audit/rounds`):
- The page title is weight 600 instead of 700. The subtitle is 13px (`text-meta`) instead of 14px.
- The create button is the shared primary button: 36px tall on desktop (was 44), still 44px on phones, with a 16px plus icon.
- From md, the buttons sit at the top of the title row with 24px before them, and wrap onto a new line when the title is long. Below md the buttons stack under the title, 12px apart (was 16px).
- The register keeps its compact phone header: 20px title and the create button on one row, subtitle hidden below md.
- On `/th/audit/findings` the "กลับไปรอบตรวจนับ" button still shows the plus icon, because it is the wrapper's create link; 2B-2 moves that page to `PageHeader` with a `PageBackLink` (§3.19 risk 1).
- No page renders `PageBackLink` yet; Tasks 13–24 and later plans place it.

Not in this task:
- `MasterDataSearch`, `ColumnHeader`, `SortableColumnHeader`, `MasterDataPagination`, `ActiveBadge` in the same file (Task 12 and 2B-5)
- any page: the pages move in Tasks 13–24 and later plans
- `src/components/ui/breadcrumbs.tsx` (unchanged; its "every caller is a server page" comment stays true, no client form passes `breadcrumbs`, spec §4.9 risk 7)
- the `function PageHeader` inside `D/my-assets/page.tsx:163-170` (2B-5, I14): it does not clash until that page imports the shared one
- messages: no key changes (no `messages-edit.mjs` run). Do not run a formatter.

**Files:**
- Create: `src/components/ui/page-header.tsx` (LF, like the other new files in `ui/`)
- Modify: `src/components/master-data/master-data-layout.tsx` (CRLF, 2 replacements)
- Create: `tests/list-primitives-ui.test.ts` (LF, 5 tests)
- Modify: `tests/breadcrumbs-ui.test.ts` (LF, 1 replacement), `tests/asset-register-filter-ui.test.ts` (CRLF, 1 replacement), `tests/supplier-adaptive-ui.test.ts` (CRLF, 1 replacement)
- Modify: `tests/list-frame-guards.test.ts` (through Task 1's `p2b-budget.mjs` only: `BUDGETS.LH1` loses one entry)
- Temp folder only, never committed: `p2b-t3-precheck.mjs`, `p2b-tw-probe.mjs` (later tasks reuse it); Task 1's `p2b-budget.mjs` is already there

**Must keep passing without edits:**
- `tests/master-data-brand-supplier-ui.test.ts:9-11` (the brands page still calls `<MasterDataHeader … createHref={createModelHref}` until Task 14)
- `tests/master-data-workspace.test.ts:13-23`
- `tests/operational-return-navigation.test.ts:69`, `:83` and `tests/audit-pending-mobile-ux.test.ts:14-15` (`MasterDataSearch` and its `hiddenInputs` are not touched, I17)
- `tests/visual-foundation-guards.test.ts` (focus rings use `ring-ring` through `buttonVariants`; no shadow, fill or tag rule is hit)
- `tests/form-migration-guards.test.ts` (no `flex-col-reverse` in `ui/`, GD4), `tests/class-merge.test.ts`, `tests/design-tokens-contrast.test.ts`
- `tests/list-frame-guards.test.ts`: every row except the one this task lowers

**Interfaces:**
- Consumes:
  - `Breadcrumbs` and `type BreadcrumbItem` from `@/components/ui/breadcrumbs` (unchanged)
  - `buttonVariants` from `@/components/ui/button-variants` (in `ui/`) and from `@/components/ui/button` (in `master-data/`): size `md` is `min-h-11 px-3.5 text-sm md:h-9 md:min-h-0 rounded-md`, variant `outline` is the 2A outline button
  - `cn` from `@/lib/utils`, `Link` from `next/link`, `ArrowLeft` and `Plus` from `lucide-react`
  - Task 1: `tests/list-frame-guards.test.ts` with `BUDGETS.LH1` holding 1 for `src/components/master-data/master-data-layout.tsx`, and `p2b-budget.mjs` in the temp folder
  - Task 2: committed (the precheck looks for `tests/sidebar-menu-structure.test.ts`)
- Produces (Tasks 12–24 and plans 2B-2 to 2B-5 rely on these):
  - `src/components/ui/page-header.tsx`:
    - `export type PageHeaderProps = { title: ReactNode; meta?: ReactNode; actions?: ReactNode; back?: ReactNode; breadcrumbs?: BreadcrumbItem[]; compactOnMobile?: boolean; className?: string }`
    - `export function PageHeader({ title, meta, actions, back, breadcrumbs, compactOnMobile = false, className }: PageHeaderProps)`: `<header data-slot="page-header">`, `<Breadcrumbs className="mb-1">` only when `breadcrumbs` is set, one `<h1>`, the meta row `data-slot="page-header-meta"` only when `meta` is set, the button row `data-slot="page-header-actions"` (DOM order `back` then `actions`) only when either is set. No outer margin: callers pass `className="mb-6"` or put the header in a `space-y-6` root.
    - `export type PageBackLinkProps = { href: string; label: string; onClick?: MouseEventHandler<HTMLAnchorElement>; className?: string }`
    - `export function PageBackLink({ href, label, onClick, className }: PageBackLinkProps)`: a `Link` with `data-slot="page-back-link"`. Callers write `back={<PageBackLink href={returnToHref} label={tCommon("back")} />}`; a client form may add `onClick={confirmNavigation}`.
  - `src/components/master-data/master-data-layout.tsx`: `MasterDataHeader` with its props unchanged (`title: string; subtitle: string; createHref: string; createLabel: string; actions?: React.ReactNode; compactOnMobile?: boolean`), now a wrapper of `PageHeader`. Its imports after this task (Task 12 edits the third line):
    ```tsx
    import Link from "next/link"
    import { ArrowDown, ArrowUp, Plus, Search } from "lucide-react"
    import { buttonVariants } from "@/components/ui/button"
    import { PageHeader } from "@/components/ui/page-header"
    import { buildMasterDataQueryString, paginationRange, type MasterDataListState } from "@/lib/master-data-query"
    ```
  - `tests/list-primitives-ui.test.ts`: LF, 5 tests. Shared part: `const UI = "src/components/ui/"`, `read(path)` (returns `""` for a missing file, with `\r` stripped), `const SERVER_SAFE = ["page-header.tsx"]` and `const PRIMITIVES = [...SERVER_SAFE]`. Tasks 4–11 leave the two lists as they are and append their own `test(…)` blocks at the end of the file, each with its own server-safe and class checks (Task 7 keeps the checks of `row-actions.tsx` in `tests/row-actions-ui.test.ts`).
  - `tests/list-frame-guards.test.ts`: `BUDGETS.LH1` without `master-data-layout.tsx`.
  - `p2b-tw-probe.mjs` in the temp folder.

| file | LFG `LH1` | other LFG rows | VFG R7 |
|---|---|---|---|
| `master-data/master-data-layout.tsx` | 1 → – | unchanged (LH2 1, LN2 1, LT1 2, LT2 1, LT4 1, LT5 2) | – (no fill) |
| `ui/page-header.tsx` (new) | skipped (`HEADER_OWNER`) | 0 | 0 |

- [ ] **Step 1: Check what this task builds on**

Save this script as `p2b-t3-precheck.mjs` in the temp folder that holds Task 1's `p2b-budget.mjs` (never in the repo). It runs `p2b-budget.mjs` with `--dry-run`:

```js
// p2b-t3-precheck.mjs: run from the repo root before Task 3 of plan 2B-1. Reads only; writes nothing. Never commit this file.
// Confirms that Tasks 1 and 2 landed, that the files Task 3 edits still hold the text its old snippets quote, and
// that the primitives it builds on are there.
import { existsSync, readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const raw = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "")
const lf = (path) => raw(path).replace(/\r\n/g, "\n")
const isCrlf = (text) => text.length > 0 && (text.match(/\r\n/g) ?? []).length === (text.match(/\n/g) ?? []).length
const endings = (text) => (text.length === 0 ? "missing" : isCrlf(text) ? "CRLF" : text.includes("\r\n") ? "mixed" : "LF")
const once = (text, needle) => text.split(needle).length - 1 === 1
const LAYOUT = "src/components/master-data/master-data-layout.tsx"
const layout = lf(LAYOUT)
const budgetScript = fileURLToPath(new URL("./p2b-budget.mjs", import.meta.url))
const lh1 = existsSync(budgetScript)
  ? spawnSync(process.execPath, [budgetScript, "c/master-data/master-data-layout.tsx", "LH1=1:0", "LH2=1:1", "LT1=2:2", "LT2=1:1", "LT4=1:1", "LT5=2:2", "LN2=1:1", "--dry-run"], { encoding: "utf8" })
  : null

const checks = {
  "Task 2 landed: tests/sidebar-menu-structure.test.ts exists": existsSync("tests/sidebar-menu-structure.test.ts"),
  "p2b-budget.mjs (Task 1) is saved next to this script": existsSync(budgetScript),
  "LFG holds LH1 1 for master-data-layout.tsx and the rows this task keeps": lh1?.status === 0,
  "src/components/ui/page-header.tsx is not there yet": !existsSync("src/components/ui/page-header.tsx"),
  "tests/list-primitives-ui.test.ts is not there yet": !existsSync("tests/list-primitives-ui.test.ts"),
  "master-data-layout.tsx still draws its own h1": once(layout, '<h1 className={compactOnMobile ? "text-xl font-bold text-foreground md:text-2xl" : "text-2xl font-bold text-foreground"}>{title}</h1>'),
  "master-data-layout.tsx names MasterDataHeader once (LH2 1)": (layout.match(/\bMasterDataHeader\b/g) ?? []).length === 1,
  "master-data-layout.tsx imports start with Link, the lucide icons and master-data-query": layout.startsWith('import Link from "next/link"\nimport { ArrowDown, ArrowUp, Plus, Search } from "lucide-react"\nimport { buildMasterDataQueryString, paginationRange, type MasterDataListState } from "@/lib/master-data-query"\n'),
  "11 <MasterDataHeader call sites under src/app": spawnSync("git", ["grep", "-c", "<MasterDataHeader", "--", "src/app"], { encoding: "utf8" }).stdout.trim().split("\n").filter(Boolean).length === 11,
  "breadcrumbs-ui.test.ts counts <Breadcrumbs /> only": once(lf("tests/breadcrumbs-ui.test.ts"), "[...file.source.matchAll(/<Breadcrumbs\\b[\\s\\S]*?\\/>/g)]"),
  "asset-register-filter-ui.test.ts pins the old header strings": once(lf("tests/asset-register-filter-ui.test.ts"), 'test("master data header hides the subtitle below md only when compactOnMobile is set", () => {'),
  "supplier-adaptive-ui.test.ts pins min-h-11 on the create link": once(lf("tests/supplier-adaptive-ui.test.ts"), 'assert.match(masterDataLayout, /href=\\{createHref\\}\\s+className="[^"]*min-h-11/)'),
  "Breadcrumbs and BreadcrumbItem are exported by ui/breadcrumbs.tsx": /export type BreadcrumbItem = \{/.test(lf("src/components/ui/breadcrumbs.tsx")) && /export function Breadcrumbs\(/.test(lf("src/components/ui/breadcrumbs.tsx")),
  "buttonVariants size md is 44px below md and 36px from md": lf("src/components/ui/button-variants.ts").includes('const sizeMd = "min-h-11 px-3.5 text-sm md:h-9 md:min-h-0 rounded-md"') && /export \{ Button, buttonVariants \}/.test(lf("src/components/ui/button.tsx")),
}
let missing = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok     " : "MISSING"} ${name}`)
  if (!ok) missing += 1
}
for (const path of [LAYOUT, "tests/breadcrumbs-ui.test.ts", "tests/asset-register-filter-ui.test.ts", "tests/supplier-adaptive-ui.test.ts", "tests/list-frame-guards.test.ts"]) console.log(`info    line endings ${endings(raw(path))}: ${path}`)
if (lh1 && lh1.status !== 0) console.log(`info    ${(lh1.stderr || lh1.stdout).trim()}`)
if (missing > 0) {
  console.error(`ABORT: ${missing} precondition(s) failed. Do not start Task 3; report which.`)
  process.exit(1)
}
console.log("preconditions hold for Task 3")
```

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2b`

Run: `git status --short src tests messages` then `node <temp>/p2b-t3-precheck.mjs`
Expected: `git status` prints nothing. The script prints:
```
ok      Task 2 landed: tests/sidebar-menu-structure.test.ts exists
ok      p2b-budget.mjs (Task 1) is saved next to this script
ok      LFG holds LH1 1 for master-data-layout.tsx and the rows this task keeps
ok      src/components/ui/page-header.tsx is not there yet
ok      tests/list-primitives-ui.test.ts is not there yet
ok      master-data-layout.tsx still draws its own h1
ok      master-data-layout.tsx names MasterDataHeader once (LH2 1)
ok      master-data-layout.tsx imports start with Link, the lucide icons and master-data-query
ok      11 <MasterDataHeader call sites under src/app
ok      breadcrumbs-ui.test.ts counts <Breadcrumbs /> only
ok      asset-register-filter-ui.test.ts pins the old header strings
ok      supplier-adaptive-ui.test.ts pins min-h-11 on the create link
ok      Breadcrumbs and BreadcrumbItem are exported by ui/breadcrumbs.tsx
ok      buttonVariants size md is 44px below md and 36px from md
info    line endings CRLF: src/components/master-data/master-data-layout.tsx
info    line endings LF: tests/breadcrumbs-ui.test.ts
info    line endings CRLF: tests/asset-register-filter-ui.test.ts
info    line endings CRLF: tests/supplier-adaptive-ui.test.ts
info    line endings LF: tests/list-frame-guards.test.ts
preconditions hold for Task 3
```
On any `MISSING` line, stop and report it, with the `info` line the script prints under the checks when the LFG rows are not as expected.

Run: `git ls-files --eol src/components/master-data/master-data-layout.tsx tests/breadcrumbs-ui.test.ts tests/asset-register-filter-ui.test.ts tests/supplier-adaptive-ui.test.ts`
Expected: `i/lf w/crlf` for the layout and the two CRLF tests, `i/lf w/lf` for `tests/breadcrumbs-ui.test.ts`. Keep all four as they are.

- [ ] **Step 2: The failing tests and the lowered guard**

(a) Create `tests/list-primitives-ui.test.ts` with this content, LF line endings:

```ts
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

// Phase 2B list primitives (spec 2B §3, §10.2). Each later 2B-1 primitive task appends its own block below, with its
// own server-safe and class checks. Sources are read with \r stripped, so a regex here may hold \n.
const UI = "src/components/ui/"
const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : "")

// Server-safe primitives (spec 2B §3.2): no client directive, no state, no effect, no context.
const SERVER_SAFE = ["page-header.tsx"]
// Every 2B primitive, client ones included, keeps to the shared class rules (spec 2B §3.2, §3.21 table C).
const PRIMITIVES = [...SERVER_SAFE]

test("the 2B list primitives render on the server", () => {
  for (const name of SERVER_SAFE) {
    assert.ok(existsSync(UI + name), `${UI}${name} is missing`)
    assert.doesNotMatch(read(UI + name), /"use client"|\buseState\b|\buseEffect\b|\bcreateContext\b|\buseContext\b/, name)
  }
})

test("the 2B list primitives keep to the shared class rules", () => {
  for (const name of PRIMITIVES) {
    assert.ok(existsSync(UI + name), `${UI}${name} is missing`)
    assert.doesNotMatch(
      read(UI + name),
      /\bshadow-(?:sm|md|lg|xl|2xl)\b|\bopacity-|\bleading-tight\b|\bleading-4\b|rounded-\[|\bflex-col-reverse\b|\buppercase\b|\bbg-muted\//,
      name,
    )
  }
})

test("PageHeader: one h1 at 600, breadcrumbs 4px above it, a meta row, and buttons that share the title row from md (I1)", () => {
  const source = read(`${UI}page-header.tsx`)
  assert.match(source, /export function PageHeader\(\{ title, meta, actions, back, breadcrumbs, compactOnMobile = false, className \}: PageHeaderProps\)/)
  for (const prop of ["title: ReactNode", "meta\\?: ReactNode", "actions\\?: ReactNode", "back\\?: ReactNode", "breadcrumbs\\?: BreadcrumbItem\\[\\]", "compactOnMobile\\?: boolean", "className\\?: string"]) {
    assert.match(source, new RegExp(`\\n  ${prop}\\n`), prop)
  }
  assert.match(source, /<header data-slot="page-header" className=\{cn\("min-w-0", className\)\}>/)
  assert.doesNotMatch(source.match(/<header\b[^>]*>/)?.[0] ?? "", /\bm[tb]-/, "the header has no outer margin")
  assert.equal(source.match(/<Breadcrumbs\b/g)?.length, 1)
  assert.match(source, /\{breadcrumbs \? <Breadcrumbs items=\{breadcrumbs\} className="mb-1" \/> : null\}/)
  assert.match(
    source,
    /compactOnMobile \? "flex items-center justify-between gap-3 md:items-start md:gap-x-6" : "flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-x-6"/,
  )
  assert.match(source, /<h1 className=\{cn\("text-2xl font-semibold text-balance break-words text-foreground", compactOnMobile && "max-md:text-xl"\)\}>\{title\}<\/h1>/)
  assert.equal(source.match(/<h1\b/g)?.length, 1)
  assert.match(source, /data-slot="page-header-meta" className=\{cn\("mt-1 flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted-foreground", compactOnMobile && "max-md:hidden"\)\}/)
  assert.match(source, /data-slot="page-header-actions" className=\{cn\("flex flex-wrap items-center gap-2 md:justify-end", compactOnMobile && "shrink-0"\)\}>\n\s+\{back\}\n\s+\{actions\}\n/)
  assert.doesNotMatch(source, /\bfont-bold\b|\buseTranslations\b|\bdescription\b|\bflex-1\b/)
})

test("PageBackLink: outline md with a left arrow, a 44px icon button below md whose name is the visible words (I1, B2)", () => {
  const source = read(`${UI}page-header.tsx`)
  assert.match(source, /export type PageBackLinkProps = \{\n(?:  \/\/[^\n]*\n)?  href: string\n(?:  \/\/[^\n]*\n)?  label: string\n(?:  \/\/[^\n]*\n)?  onClick\?: MouseEventHandler<HTMLAnchorElement>\n(?:  \/\/[^\n]*\n)?  className\?: string\n\}/)
  assert.match(
    source,
    /<Link href=\{href\} onClick=\{onClick\} data-slot="page-back-link" className=\{cn\(buttonVariants\(\{ variant: "outline", size: "md" \}\), "min-w-11 max-md:px-0", className\)\}>\n\s+<ArrowLeft aria-hidden="true" \/>\n\s+<span className="max-md:sr-only">\{label\}<\/span>\n\s+<\/Link>/,
  )
  assert.doesNotMatch(source, /aria-label=/)
})

test("MasterDataHeader is a thin wrapper of PageHeader until its last callers move (I2)", () => {
  const layout = read("src/components/master-data/master-data-layout.tsx")
  assert.match(layout, /import \{ buttonVariants \} from "@\/components\/ui\/button"/)
  assert.match(layout, /import \{ PageHeader \} from "@\/components\/ui\/page-header"/)
  assert.match(layout, /<PageHeader\n\s+title=\{title\}\n\s+meta=\{subtitle\}\n\s+compactOnMobile=\{compactOnMobile\}\n/)
  assert.match(layout, /<Link href=\{createHref\} className=\{buttonVariants\(\{ size: "md" \}\)\}>\n\s+<Plus aria-hidden="true" \/>\n\s+\{createLabel\}\n\s+<\/Link>/)
  assert.doesNotMatch(layout, /<h1\b|\bfont-bold\b/)
})
```

(b) `tests/asset-register-filter-ui.test.ts:112-119` (CRLF; this file strips `\r` before matching). The pins move from the wrapper's old class strings to the I1 strings.

Replace:

```ts
test("master data header hides the subtitle below md only when compactOnMobile is set", () => {
  const layout = read("src/components/master-data/master-data-layout.tsx")

  assert.match(layout, /compactOnMobile\?: boolean/)
  assert.match(layout, /compactOnMobile \? "hidden text-sm text-muted-foreground md:mt-1 md:block" : "mt-1 text-sm text-muted-foreground"/)
  assert.match(layout, /compactOnMobile \? "mb-4 space-y-4 md:mb-6" : "mb-6 space-y-4"/)
  assert.match(layout, /compactOnMobile \? "text-xl font-bold text-foreground md:text-2xl" : "text-2xl font-bold text-foreground"/)
})
```

with:

```ts
test("the page header hides the meta below md only when compactOnMobile is set", () => {
  const header = read("src/components/ui/page-header.tsx")
  const layout = read("src/components/master-data/master-data-layout.tsx")

  assert.match(header, /compactOnMobile\?: boolean/)
  assert.match(header, /compactOnMobile \? "flex items-center justify-between gap-3 md:items-start md:gap-x-6" : "flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-x-6"/)
  assert.match(header, /compactOnMobile && "max-md:text-xl"/)
  assert.match(header, /compactOnMobile && "max-md:hidden"/)
  assert.match(header, /compactOnMobile && "shrink-0"/)
  assert.match(layout, /compactOnMobile \? "mb-4 md:mb-6" : "mb-6"/)
})
```

(c) `tests/supplier-adaptive-ui.test.ts:57-59` (CRLF, read without stripping `\r`: the new regex has no `\n`).

Replace:

```ts
test("shared master-data create action meets the mobile touch target", () => {
  assert.match(masterDataLayout, /href=\{createHref\}\s+className="[^"]*min-h-11/)
})
```

with:

```ts
test("shared master-data create action meets the mobile touch target", () => {
  // buttonVariants size "md" is 44px tall below md and 36px from md (spec 2B I2).
  assert.match(masterDataLayout, /href=\{createHref\} className=\{buttonVariants\(\{ size: "md" \}\)\}/)
})
```

(d) Lower the guard.

Run: `node <temp>/p2b-budget.mjs c/master-data/master-data-layout.tsx LH1=1:0 LH2=1:1 LT1=2:2 LT2=1:1 LT4=1:1 LT5=2:2 LN2=1:1`
Expected (exit 0):
```
LH1: 1 -> 0 (row deleted)
LH2: 1 kept
LT1: 2 kept
LT2: 1 kept
LT4: 1 kept
LT5: 2 kept
LN2: 1 kept
written: src/components/master-data/master-data-layout.tsx
```
On `ABORT`, stop and report the lines it prints.

Run: `node --test tests/list-primitives-ui.test.ts tests/asset-register-filter-ui.test.ts tests/supplier-adaptive-ui.test.ts`
Expected: FAIL, `tests 21 · pass 14 · fail 7`:
- all 5 tests of `tests/list-primitives-ui.test.ts`: `src/components/ui/page-header.tsx is missing` (the first two), then no match for the `PageHeader`, `PageBackLinkProps` and `import { buttonVariants } from "@/components/ui/button"` regexes
- `the page header hides the meta below md only when compactOnMobile is set`: `ENOENT` on `src/components/ui/page-header.tsx`
- `shared master-data create action meets the mobile touch target`: no match for `/href=\{createHref\} className=\{buttonVariants\(\{ size: "md" \}\)\}/`

Run: `node --test tests/list-frame-guards.test.ts`
Expected: FAIL, exactly 1 failing test, the LH1 guard, with `src/components/master-data/master-data-layout.tsx: 1 > 0`.

- [ ] **Step 3: Create `src/components/ui/page-header.tsx`**

Create the file with this content, LF line endings:

```tsx
import type { MouseEventHandler, ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/breadcrumbs"
import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

export type PageHeaderProps = {
  // The h1: words, or a record code in <span className="tag font-medium"> when the record has no name of its own.
  title: ReactNode
  // The row under the title, one fact per element and no separators: code, status badge, facts, then what the page is for.
  meta?: ReactNode
  // The page's buttons at size "md": the ⋯ menu first, the primary action last.
  actions?: ReactNode
  // A <PageBackLink /> only. It comes first in the button row.
  back?: ReactNode
  // Written as an array literal at the call site: tests read the trail from the page source.
  breadcrumbs?: BreadcrumbItem[]
  // The asset register only: below md the title and its button share one row and the meta row is hidden.
  compactOnMobile?: boolean
  // Layout only. The header has no margin of its own; the gap below it belongs to the page.
  className?: string
}

// The page header (spec 2B §4.3, I1): breadcrumbs 4px above the title, one h1 at weight 600, the meta row, the buttons.
// Title and buttons stack below md and share a row from md, where buttons and fields change size. Flex, not the
// mockup's grid, so five buttons wrap to a new line instead of squeezing the title to nothing.
// No client directive and no hooks, like Button: server pages and client forms both render it.
export function PageHeader({ title, meta, actions, back, breadcrumbs, compactOnMobile = false, className }: PageHeaderProps) {
  return (
    <header data-slot="page-header" className={cn("min-w-0", className)}>
      {breadcrumbs ? <Breadcrumbs items={breadcrumbs} className="mb-1" /> : null}
      <div className={compactOnMobile ? "flex items-center justify-between gap-3 md:items-start md:gap-x-6" : "flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-x-6"}>
        <div className="min-w-0">
          <h1 className={cn("text-2xl font-semibold text-balance break-words text-foreground", compactOnMobile && "max-md:text-xl")}>{title}</h1>
          {meta ? (
            <div data-slot="page-header-meta" className={cn("mt-1 flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted-foreground", compactOnMobile && "max-md:hidden")}>
              {meta}
            </div>
          ) : null}
        </div>
        {back || actions ? (
          <div data-slot="page-header-actions" className={cn("flex flex-wrap items-center gap-2 md:justify-end", compactOnMobile && "shrink-0")}>
            {back}
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  )
}

export type PageBackLinkProps = {
  // The href the page already computed, returnTo included. The link never builds a URL itself.
  href: string
  // The page's own words (common.back, disposalPage.backToQueue …). Below md they stay as the icon button's name.
  label: string
  // Client callers only, for example a form that asks before it drops unsaved changes.
  onClick?: MouseEventHandler<HTMLAnchorElement>
  // Layout only.
  className?: string
}

// The one back button (spec 2B B2): outline md with a left arrow and the page's words. Below md it is a 44px icon
// button; the words stay in the accessibility tree (max-md:sr-only), so the name a screen reader reads is the
// visible text at every width and no separate label attribute is needed.
export function PageBackLink({ href, label, onClick, className }: PageBackLinkProps) {
  return (
    <Link href={href} onClick={onClick} data-slot="page-back-link" className={cn(buttonVariants({ variant: "outline", size: "md" }), "min-w-11 max-md:px-0", className)}>
      <ArrowLeft aria-hidden="true" />
      <span className="max-md:sr-only">{label}</span>
    </Link>
  )
}
```

Run: `node --test tests/list-primitives-ui.test.ts tests/breadcrumbs-ui.test.ts tests/asset-register-filter-ui.test.ts`
Expected: FAIL, `tests 18 · pass 15 · fail 3`:
- `MasterDataHeader is a thin wrapper of PageHeader until its last callers move (I2)`: no match for the `buttonVariants` import (Step 5)
- `every record page ends its breadcrumb trail on a code; the create and list pages do not`: `Breadcrumbs call sites`, `12 !== 11`, because the new file holds a `<Breadcrumbs … />` (Step 4)
- `the page header hides the meta below md only when compactOnMobile is set`: no match for `compactOnMobile \? "mb-4 md:mb-6" : "mb-6"` in the layout (Step 5)

- [ ] **Step 4: Count breadcrumb trails in both forms (`tests/breadcrumbs-ui.test.ts:37-40`, R-i)**

The file is LF.

Replace:

```ts
test("every record page ends its breadcrumb trail on a code; the create and list pages do not", () => {
  const sites = readSourceFiles("src").flatMap((file) =>
    [...file.source.matchAll(/<Breadcrumbs\b[\s\S]*?\/>/g)].map((match) => ({ path: file.path, element: match[0].replace(/\s+/g, " ") })),
  )
```

with:

```ts
test("every record page ends its breadcrumb trail on a code; the create and list pages do not", () => {
  // A trail is a <Breadcrumbs /> element or the breadcrumbs={[…]} prop of PageHeader, which renders the one
  // <Breadcrumbs /> inside src/components/ui/page-header.tsx (spec 2B R-i). Both forms end in "]}".
  const sites = readSourceFiles("src")
    .filter((file) => file.path !== "src/components/ui/page-header.tsx")
    .flatMap((file) =>
      [...file.source.matchAll(/<Breadcrumbs\b[\s\S]*?\/>|\bbreadcrumbs=\{\[[\s\S]*?\]\}/g)].map((match) => ({ path: file.path, element: match[0].replace(/\s+/g, " ") })),
    )
```

Run: `node --test tests/breadcrumbs-ui.test.ts`
Expected: PASS, `tests 4 · pass 4 · fail 0` (11 sites, 8 of them end on a code).

- [ ] **Step 5: `MasterDataHeader` becomes the thin wrapper (`src/components/master-data/master-data-layout.tsx`)**

Two exact replacements.

(1) Imports.

Replace:

```tsx
import Link from "next/link"
import { ArrowDown, ArrowUp, Plus, Search } from "lucide-react"
import { buildMasterDataQueryString, paginationRange, type MasterDataListState } from "@/lib/master-data-query"
```

with:

```tsx
import Link from "next/link"
import { ArrowDown, ArrowUp, Plus, Search } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { buildMasterDataQueryString, paginationRange, type MasterDataListState } from "@/lib/master-data-query"
```

(2) The body of `MasterDataHeader` (`:20-39`). The props above it and the closing `}` below it stay.

Replace:

```tsx
  return (
    <div className={compactOnMobile ? "mb-4 space-y-4 md:mb-6" : "mb-6 space-y-4"}>
      <div className={compactOnMobile ? "flex flex-row items-center justify-between gap-3" : "flex flex-col gap-4 md:flex-row md:items-center md:justify-between"}>
        <div className={compactOnMobile ? "min-w-0" : undefined}>
          <h1 className={compactOnMobile ? "text-xl font-bold text-foreground md:text-2xl" : "text-2xl font-bold text-foreground"}>{title}</h1>
          <p className={compactOnMobile ? "hidden text-sm text-muted-foreground md:mt-1 md:block" : "mt-1 text-sm text-muted-foreground"}>{subtitle}</p>
        </div>
        <div className={compactOnMobile ? "flex shrink-0 flex-wrap gap-2" : "flex flex-wrap gap-2"}>
          {actions}
          <Link
            href={createHref}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            {createLabel}
          </Link>
        </div>
      </div>
    </div>
  )
```

with:

```tsx
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
```

Check: `grep -n "<h1\|font-bold\|MasterDataHeader" src/components/master-data/master-data-layout.tsx` prints one line, `7:export function MasterDataHeader({`. A second `MasterDataHeader` (for example in a comment) would raise LFG LH2 above its budget of 1.

- [ ] **Step 6: Prove every class of the two files compiles**

Save this script as `p2b-tw-probe.mjs` in your temp folder (never in the repo). It compiles the classes with the repo's Tailwind and `src/app/globals.css` in memory and writes nothing:

```js
// p2b-tw-probe.mjs: run from the repo root. Compiles the given classes with the repo's Tailwind and src/app/globals.css
// in memory (nothing is written) and prints MISSING for every class Tailwind drops without an error.
// Usage: node p2b-tw-probe.mjs <class> <class> ...   Never commit this file.
import { createRequire } from "node:module"
import { readFileSync } from "node:fs"

const require = createRequire(`${process.cwd()}/package.json`)
const { compile } = require("@tailwindcss/node")
const classes = process.argv.slice(2)
const compiler = await compile(readFileSync("src/app/globals.css", "utf8"), { base: process.cwd(), onDependency() {} })
const css = compiler.build(classes)
const utilities = css.slice(css.indexOf("@layer utilities"))
const escape = (name) => name.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`)
const missing = classes.filter((name) => !utilities.includes(`.${escape(name)}`))
for (const name of missing) console.log(`MISSING ${name}`)
console.log(`checked ${classes.length}, missing ${missing.length}`)
process.exit(missing.length > 0 ? 1 : 0)
```

Run (from the repo root): `node <temp>/p2b-tw-probe.mjs min-w-0 mb-1 flex items-center justify-between gap-3 md:items-start md:gap-x-6 flex-col md:flex-row md:justify-between text-2xl font-semibold text-balance break-words text-foreground max-md:text-xl mt-1 max-w-3xl flex-wrap gap-x-3 gap-y-1 text-meta text-muted-foreground max-md:hidden gap-2 md:justify-end shrink-0 min-w-11 max-md:px-0 max-md:sr-only mb-4 md:mb-6 mb-6`
Expected: `checked 34, missing 0`. A `MISSING` line means Tailwind would drop that class without an error: stop and report it.

- [ ] **Step 7: Run the tests for this task**

Run: `node --test tests/list-primitives-ui.test.ts tests/breadcrumbs-ui.test.ts tests/asset-register-filter-ui.test.ts tests/supplier-adaptive-ui.test.ts tests/master-data-brand-supplier-ui.test.ts tests/master-data-workspace.test.ts tests/class-merge.test.ts`
Expected: PASS, `tests 35 · pass 35 · fail 0`.

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/operational-return-navigation.test.ts tests/audit-pending-mobile-ux.test.ts`
Expected: PASS, `fail 0`.

- [ ] **Step 8: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, and 5 more tests than at the end of Task 2 (1 skipped, as before).
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- `git diff --stat` shows exactly 5 files: `master-data-layout.tsx` with 16 insertions and 15 deletions, `tests/asset-register-filter-ui.test.ts` 8 and 5, `tests/breadcrumbs-ui.test.ts` 7 and 3, `tests/supplier-adaptive-ui.test.ts` 2 and 1, and `tests/list-frame-guards.test.ts` 1 deletion.
- `git status` also lists `?? src/components/ui/page-header.tsx` (74 lines) and `?? tests/list-primitives-ui.test.ts` (71 lines).
- Git may warn that LF will be replaced by CRLF in the LF files. Leave them LF.
- A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).

- [ ] **Step 9: Commit**

```bash
git add src/components/ui/page-header.tsx src/components/master-data/master-data-layout.tsx tests/list-primitives-ui.test.ts tests/breadcrumbs-ui.test.ts tests/asset-register-filter-ui.test.ts tests/supplier-adaptive-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): PageHeader and PageBackLink, with MasterDataHeader as a thin wrapper (2B-1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 7 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the plan 2B-1 dev-app check (Task 25, spec §10.5 row "หน้าที่ของกลางเปลี่ยนก่อน plan ของหน้า" and §3.19 risk 1):**
- `/th/assets` at 375, 768 and 1440: title 600; at 375 the 20px title and the create button share one row and the subtitle is hidden; from 768 the create button is 36px.
- `/th/audit/findings` and `/th/audit/rounds` at 375, 768 and 1440: header from the wrapper; the findings "กลับไปรอบตรวจนับ" button still has the plus icon (expected until 2B-2).
- The 8 master-data lists (until Tasks 13–20 move them): title 600, subtitle 13px, create button 36px on desktop and 44px on phones, keyboard focus ring outside the button.
- At 768: brands (4 header buttons) and categories (3) wrap onto a new line without squeezing the title.

---

### Task 4: `ui/data-table.tsx` (all parts and `TableEmptyRow`), `ui/data-table-scroll.tsx` and the shared row classes of `ClickableTableRow`

Spec §3.4 (`DataTable` API and class table), §3.5 (`TableEmptyRow`), §3.6 (`DataTableScrollArea`), §3.7 (`ClickableTableRow`), §3.21 table C rows "server-safe" and "ตาราง", §10.2 rulings I3, I4, I33 and the message row "2B-1 · 4", §10.3 row 4. One commit. No page uses `DataTable` yet: Tasks 13–21 are its first callers.

Rulings this task applies:
- **I3, one density:** `DataTable` has no `density` prop, no `group/table` and no `data-density`. The three exported class strings are the §3.4 strings to the letter. The first and last columns get 16px (20px from `md`) through `first:`/`last:`, which a plain class on a cell cannot override (written into DS in Task 26). The asset register keeps its compact rows in its own file (2B-3).
- **I4:** the register keeps its own `isOverflowing` hint and `asset.tableScrollHint`. `DataTableScrollArea` is used only through `DataTable scrollHint=…`, first by the B6 pages of Tasks 13–21.
- **R-j:** `data-table.tsx` has no directive, no hook and no context; `data-table-scroll.tsx` is the one client leaf (§10.1).
- **§3.7:** the `ClickableTableRow` API stays (`href`, `label`, `className?`, `onNavigate?`, `children`; pinned by `tests/clickable-table-row-navigation.test.ts:12-17`). Only its classes change, to `cn(dataTableRowClasses, …, className)` with `className` defaulting to `undefined`. `focus:bg-row-hover` goes because `focus-within` also covers focus on the row itself. `focus-visible:ring-2` and `focus-visible:ring-inset` stay written in the file (`tests/asset-register-ux.test.ts:169-175`). The register's `className="group"` survives `cn()` next to `group/row` (checked with the repo's `cn`).
- **I33:** `common.tableScrollHint` is the first sentence of `asset.tableScrollHint`, in both languages (copy from the §10.2 message table).
- **Ruling (spec gap), sticky cells:** §3.4 gives the sticky cell `border-r border-border` / `border-l border-border`. Through `cn()`, tailwind-merge treats `border-border` and the cell's `border-border-soft` as one color group and drops the soft one, so a pinned cell would get a dark bottom line (probe: `cn(dataTableCellClasses, "sticky right-0 z-20 border-l border-border bg-surface")` loses `border-border-soft`). The sticky **cell** strings therefore color only their side: `border-r border-r-border` / `border-l border-l-border`. The sticky **head** strings stay as §3.4 writes them, because the head line is `border-border` already. No caller passes `sticky` before 2B-2 (disposal).
- **Ruling, `data-slot` names (§3.2):** `data-table`, `data-table-scroll`, `data-table-scroll-hint`, `data-table-header`, `data-table-body`, `data-table-head`, `data-table-row`, `data-table-cell`, `data-table-foot`, `table-empty-row`. `DataTableHead` spreads the caller's props before `scope`, `aria-sort` and `className`, so a caller cannot drop `scope="col"` or the sort state.
- **Ruling, the test block:** the block appended to Task 3's `tests/list-primitives-ui.test.ts` reads its files inside each test and defines no top-level names, so it needs only the three imports at the top of that file and cannot clash with Task 3's helpers. It carries the §3.21 row-1 checks (server-safe, forbidden classes) for its own two files. If Task 3 keeps one shared list of primitive paths for those checks, the controller may add the two paths there as well; the assertions here stay.

What users will see (spec §3 "ผลที่พนักงานเห็นทันที", §10.7 risk 1):
- The 19 `ClickableTableRow` rows in 18 files (asset register, disposal, maintenance, audit, master data, users, roles, asset detail): a row stays lit while keyboard focus is anywhere inside it (a link, a checkbox, ⋯) or while a menu it opened is open, and the fill fades out in 150ms instead of vanishing.
- Nothing else changes on screen in this task.

Not in this task:
- `Pagination` and `src/lib/list-pagination.ts` (Task 5), `RowActions` (Task 7), any page (Tasks 13–21).
- The register's own header, cell, sticky and scroll-hint classes (`asset-register-table.tsx`, 2B-3, I3/I4).
- `ui/empty-note.tsx` and `ui/action-empty-state.tsx` stay as they are (`tests/feedback-states-ui.test.ts:100-125`).
- No VFG or LFG budget changes: no file migrates, and the new files count 0 everywhere except the guards they own (`data-table.tsx` is the owner skipped by LT2 and LT3; LN2 skips `ui/`). No `MIGRATED_LIST_FILES` line.
- DESIGN.md and the other docs (Task 26). No formatter.

**Files:**
- Create: `src/components/ui/data-table.tsx` (LF, 171 lines)
- Create: `src/components/ui/data-table-scroll.tsx` (LF, 47 lines)
- Modify: `src/components/ui/clickable-table-row.tsx` (CRLF, 3 exact replacements)
- Modify: `messages/th.json`, `messages/en.json` (CRLF, through `node scripts/messages-edit.mjs` only)
- Modify: `tests/list-primitives-ui.test.ts` (LF, created by Task 3: append the table block)
- Temp folder only, never committed: `p2b1-t45-precheck.mjs` (Task 5 reuses it), `p2b1-tw-probe.mjs` (Task 5 reuses it), `t4-messages.json`

**Must keep passing without edits:**
- `tests/clickable-table-row-navigation.test.ts:6-18` (the guard and the `onNavigate` type)
- `tests/asset-register-ux.test.ts:95-100` (the register's `group-hover:bg-row-hover group-focus:bg-row-hover` sticky cells) and `:169-175` (`focus-visible:ring-2`, `focus-visible:ring-inset` in the row file, read without stripping `\r`)
- `tests/feedback-states-ui.test.ts` (no change to `EmptyNote`, `ActionEmptyState`)
- `tests/visual-foundation-guards.test.ts` (R1, R2 and the Task 1 per-file R7: the new files add no fill, no tone opacity and no shadow), `tests/list-frame-guards.test.ts`, `tests/form-migration-guards.test.ts` (not edited)
- `tests/class-merge.test.ts`, `tests/thai-glossary.test.ts`, `tests/messages-parity.test.ts`

**Interfaces:**
- Consumes:
  - Task 1: `tests/list-frame-guards.test.ts` with `${C}ui/data-table.tsx` as the owner skipped by LT2 and LT3.
  - Task 3: `tests/list-primitives-ui.test.ts` (LF) starting with `import assert from "node:assert/strict"`, an import of `readFileSync` from `"node:fs"` and `import test from "node:test"`.
  - 2A: `EmptyNote` (`padded`, `tone: "empty" | "clear"`) from `@/components/ui/empty-note`, `ActionEmptyState` from `@/components/ui/action-empty-state`, `cn` from `@/lib/utils`; lucide `ArrowUp`, `ArrowDown`, `MoveHorizontal`; `next/link` (`scroll` prop: `node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md:230-234`; anchor attributes pass through, `:84`).
- Produces (Tasks 5, 7 and 13–24 rely on these):
  - `src/components/ui/data-table.tsx`, server-safe:
    - `DataTable(props: DataTableProps)`: `DataTableProps = Omit<React.ComponentProps<"div">, "children"> & { children: React.ReactNode; caption?: string; framed?: boolean /* default true */; layout?: "auto" | "fixed"; minWidth?: number; scrollHint?: string; footer?: React.ReactNode }`. The rest of the props go on the frame `<div data-slot="data-table">`. With `scrollHint` the table sits in `<DataTableScrollArea hint={scrollHint} label={caption}>`; without it in `<div data-slot="data-table-scroll" className="overflow-x-auto overscroll-x-contain">`. `footer` renders inside `DataTableFoot`.
    - `DataTableHeader(props: React.ComponentProps<"thead">)` (no fill) · `DataTableBody(props: React.ComponentProps<"tbody">)` · `DataTableRow(props: React.ComponentProps<"tr">)` (`dataTableRowClasses`) · `DataTableFoot(props: React.ComponentProps<"div">)`.
    - `DataTableHead(props: DataTableHeadProps)`: `DataTableHeadProps = Omit<React.ComponentProps<"th">, "scope"> & { align?: "left" | "right"; sort?: DataTableSort; sticky?: "left" | "right"; hideLabel?: boolean }`, `DataTableSort = { href: string; direction: "asc" | "desc" | null; scroll?: boolean }`. `aria-sort` and the arrow only when `direction` is set.
    - `DataTableCell(props: DataTableCellProps)`: `DataTableCellProps = React.ComponentProps<"td"> & { align?: "left" | "right"; numeric?: boolean; sticky?: "left" | "right" }`.
    - `TableEmptyRow(props: TableEmptyRowProps)`: `TableEmptyRowProps = { colSpan: number } & ({ children: React.ReactNode; tone?: "empty" | "clear"; emptyState?: never } | { emptyState: React.ComponentProps<typeof ActionEmptyState>; children?: never; tone?: never })`.
    - `dataTableHeadClasses`, `dataTableCellClasses`, `dataTableRowClasses` (strings, for the tables of R-e that cannot move whole: Task 24, 2B-5).
  - `src/components/ui/data-table-scroll.tsx`, client: `DataTableScrollArea({ hint, label, children }: { hint: string; label?: string; children: ReactNode })`.
  - `ClickableTableRow`: same props; its row now carries `group/row`, so sticky cells and `RowActions` (Task 7) can use `group-hover/row:`, `group-focus-within/row:`, `group-has-[[aria-expanded=true]]/row:`.
  - Message key `common.tableScrollHint` (th and en). Callers pass `scrollHint={tCommon("tableScrollHint")}`.

- [ ] **Step 1: Check what this task builds on**

Save this script as `p2b1-t45-precheck.mjs` in your temp folder (never in the repo). Task 5 runs the same script with `5`.

```js
// p2b1-t45-precheck.mjs: run from the repo root before Task 4 or Task 5 of plan 2B-1. Usage: node p2b1-t45-precheck.mjs <4|5>
// Confirms what the task builds on and that its own work is not there yet. Reads only; writes nothing. Never commit.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { createRequire } from "node:module"
import { join, resolve } from "node:path"

const task = process.argv[2]
if (task !== "4" && task !== "5") {
  console.error("usage: node p2b1-t45-precheck.mjs <4|5>")
  process.exit(2)
}
const raw = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "")
const read = (path) => raw(path).replace(/\r\n/g, "\n")
const messages = (locale) => JSON.parse(read(`messages/${locale}.json`))
const eol = (path) => {
  const text = raw(path)
  const crlf = (text.match(/\r\n/g) ?? []).length
  const lf = (text.match(/\n/g) ?? []).length
  return lf === 0 ? "missing" : crlf === lf ? "CRLF" : crlf === 0 ? "LF" : "mixed"
}
const sourceFiles = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name)
  return statSync(path).isDirectory() ? sourceFiles(path) : /\.(?:ts|tsx)$/.test(name) ? [path.replace(/\\/g, "/")] : []
})
const th = messages("th")
const en = messages("en")
const primitivesTest = read("tests/list-primitives-ui.test.ts")
const lucide = createRequire(resolve("package.json"))("lucide-react")

const checks = task === "4"
  ? {
      "Task 1 merged: tests/list-frame-guards.test.ts exists and names ui/data-table.tsx as an owner": /MIGRATED_LIST_FILES/.test(read("tests/list-frame-guards.test.ts")) && read("tests/list-frame-guards.test.ts").includes("ui/data-table.tsx"),
      "Task 3 merged: tests/list-primitives-ui.test.ts has the three imports": /^import assert from "node:assert\/strict"$/m.test(primitivesTest) && /^import \{[^}]*\breadFileSync\b[^}]*\} from "node:fs"$/m.test(primitivesTest) && /^import test from "node:test"$/m.test(primitivesTest),
      "tests/list-primitives-ui.test.ts has no table block yet": !/DataTable keeps one density|DataTableScrollArea shows the hint/.test(primitivesTest),
      "src/components/ui/data-table.tsx and data-table-scroll.tsx do not exist yet": !existsSync("src/components/ui/data-table.tsx") && !existsSync("src/components/ui/data-table-scroll.tsx"),
      "clickable-table-row.tsx still has the template-string row classes and className = \"\"": read("src/components/ui/clickable-table-row.tsx").includes('className={`cursor-pointer hover:bg-row-hover focus:bg-row-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${className}`}') && read("src/components/ui/clickable-table-row.tsx").includes('  className = "",\n'),
      "the register is the only ClickableTableRow caller that passes className (\"group\")": sourceFiles("src").flatMap((path) => [...read(path).matchAll(/<ClickableTableRow\b[^>]*?\bclassName=("[^"]*"|\{)/g)].map((match) => `${path} ${match[1]}`)).join("|") === 'src/components/assets/asset-register-table.tsx "group"',
      "EmptyNote has padded and tone; ActionEmptyState is exported": /padded\?: boolean/.test(read("src/components/ui/empty-note.tsx")) && /tone\?: "empty" \| "clear"/.test(read("src/components/ui/empty-note.tsx")) && /export function ActionEmptyState\(/.test(read("src/components/ui/action-empty-state.tsx")),
      "lucide-react has MoveHorizontal, ArrowUp, ArrowDown": ["MoveHorizontal", "ArrowUp", "ArrowDown"].every((name) => lucide[name] !== undefined),
      "common.tableScrollHint is new in th and en": th.common.tableScrollHint === undefined && en.common.tableScrollHint === undefined,
      "asset.tableScrollHint starts with the new copy (I33)": th.asset.tableScrollHint.startsWith("เลื่อนตารางซ้าย/ขวาเพื่อดูคอลัมน์เพิ่มเติม") && en.asset.tableScrollHint.startsWith("Scroll left/right to see more columns."),
    }
  : {
      "Task 4 merged: DataTable and its table block are in": /export function DataTableFoot\(/.test(read("src/components/ui/data-table.tsx")) && /DataTable keeps one density/.test(primitivesTest),
      "tests/list-primitives-ui.test.ts has no pagination block yet": !/Pagination puts the range left/.test(primitivesTest),
      "src/lib/list-pagination.ts and tests/list-pagination.test.ts do not exist yet": !existsSync("src/lib/list-pagination.ts") && !existsSync("tests/list-pagination.test.ts"),
      "pagination.tsx is still the old one (chevrons, hand-written controlClasses)": /import \{ ChevronLeft, ChevronRight \} from "lucide-react"/.test(read("src/components/ui/pagination.tsx")) && read("src/components/ui/pagination.tsx").includes('const controlClasses =\n  "inline-flex min-h-11 items-center gap-1 rounded-md border border-border px-3 text-sm font-medium sm:h-9 sm:min-h-0"'),
      // \s, not \b: <PaginationControl inside ui/pagination.tsx and "<Pagination>" in a comment are not callers.
      "the asset register is the only <Pagination caller": sourceFiles("src").filter((path) => /<Pagination\s/.test(read(path))).join("|") === "src/components/assets/asset-register-table.tsx",
      "buttonVariants is exported with the 2A sm size": /export const buttonVariants = cva\(/.test(read("src/components/ui/button-variants.ts")) && read("src/components/ui/button-variants.ts").includes('const sizeSm = "min-h-11 px-2.5 text-meta md:h-8 md:min-h-0 rounded-control"'),
      "paginationRange is still exported from src/lib/master-data-query.ts": /export function paginationRange\(page: number, pageSize: number, total: number\)/.test(read("src/lib/master-data-query.ts")),
      "common.showingRange and common.pageSizeLabel are new in th and en": [th, en].every((locale) => locale.common.showingRange === undefined && locale.common.pageSizeLabel === undefined),
      "the register's words exist (I33)": th.asset.registerRange === "{from}–{to} จาก {total} รายการ" && en.asset.registerRange === "{from}–{to} of {total}" && th.asset.pageSizeLabel === "จำนวนต่อหน้า" && en.asset.pageSizeLabel === "Rows per page",
      "common.pagination, pageOf, previous, next and rowsPerPage exist": [th, en].every((locale) => ["pagination", "pageOf", "previous", "next", "rowsPerPage"].every((key) => typeof locale.common[key] === "string")),
    }

let missing = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok     " : "MISSING"} ${name}`)
  if (!ok) missing += 1
}
const files = task === "4"
  ? ["src/components/ui/clickable-table-row.tsx", "messages/th.json", "messages/en.json", "tests/list-primitives-ui.test.ts"]
  : ["src/components/ui/pagination.tsx", "messages/th.json", "messages/en.json", "tests/list-primitives-ui.test.ts"]
for (const path of files) console.log(`info    ${path}: ${eol(path)}`)
if (missing > 0) {
  console.error(`ABORT: ${missing} precondition(s) failed. Do not start Task ${task}; report which.`)
  process.exit(1)
}
console.log(`preconditions hold for Task ${task}`)
```

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2b`

Run: `git status --short src tests messages` then `node <temp>/p2b1-t45-precheck.mjs 4`
Expected: `git status` prints nothing. The script prints:
```
ok      Task 1 merged: tests/list-frame-guards.test.ts exists and names ui/data-table.tsx as an owner
ok      Task 3 merged: tests/list-primitives-ui.test.ts has the three imports
ok      tests/list-primitives-ui.test.ts has no table block yet
ok      src/components/ui/data-table.tsx and data-table-scroll.tsx do not exist yet
ok      clickable-table-row.tsx still has the template-string row classes and className = ""
ok      the register is the only ClickableTableRow caller that passes className ("group")
ok      EmptyNote has padded and tone; ActionEmptyState is exported
ok      lucide-react has MoveHorizontal, ArrowUp, ArrowDown
ok      common.tableScrollHint is new in th and en
ok      asset.tableScrollHint starts with the new copy (I33)
info    src/components/ui/clickable-table-row.tsx: CRLF
info    messages/th.json: CRLF
info    messages/en.json: CRLF
info    tests/list-primitives-ui.test.ts: LF
preconditions hold for Task 4
```
On any `MISSING` line, stop and report it.

Run: `git ls-files --eol src/components/ui/clickable-table-row.tsx messages/th.json messages/en.json tests/list-primitives-ui.test.ts`
Expected: `i/lf w/crlf` for the first three and `i/lf w/lf` for the test file. Keep them as they are.

- [ ] **Step 2: Save the Tailwind probe**

Every new class must compile with Tailwind 4.2.4 against `src/app/globals.css` (no new tokens). Save this script as `p2b1-tw-probe.mjs` in your temp folder (never in the repo); Task 5 reuses it. It compiles in memory and writes nothing.

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

- [ ] **Step 3: Append the failing table block to `tests/list-primitives-ui.test.ts`**

Append this block at the very end of the file (it starts with one blank line; the file keeps LF and ends with one line break):

```ts

// Task 4 (spec 2B §3.4–3.7, I3, I4): DataTable with TableEmptyRow, the client scroll hint, and the shared row classes.
// Each test reads its files itself, so this block needs only the three imports at the top of the file.
test("DataTable keeps one density, the B3 header and cell look, and real table semantics (I3)", () => {
  const source = readFileSync("src/components/ui/data-table.tsx", "utf8").replace(/\r\n/g, "\n")
  const constant = (name: string) => source.match(new RegExp(`export const ${name} = "([^"]+)"`))?.[1]

  assert.equal(constant("dataTableHeadClasses"), "border-b border-border bg-surface px-3 py-2.5 text-left align-bottom text-meta font-medium whitespace-nowrap text-faint-foreground first:pl-4 last:pr-4 md:first:pl-5 md:last:pr-5")
  assert.equal(constant("dataTableCellClasses"), "border-b border-border-soft p-3 align-top first:pl-4 last:pr-4 md:first:pl-5 md:last:pr-5")
  assert.equal(constant("dataTableRowClasses"), "group/row transition-colors hover:bg-row-hover hover:duration-0 focus-within:bg-row-hover focus-within:duration-0 has-[[aria-expanded=true]]:bg-row-hover")
  assert.doesNotMatch(source, /group-data-\[density|data-density|group\/table/, "one density only: the register keeps its compact rows in its own file (I3)")
  assert.doesNotMatch(source, /"use client"|\buse(?:State|Effect|Context)\b|\bcreateContext\b/, "server-safe, no hooks (R-j)")
  assert.doesNotMatch(source, /\bshadow-(?:sm|md|lg|xl|2xl)\b|opacity-|leading-tight|leading-4|rounded-\[|flex-col-reverse|uppercase|bg-muted\//)
  assert.match(source, /const dataTableFrameClasses = "min-w-0 max-w-full overflow-hidden rounded-lg border border-border bg-surface"/)
  assert.match(source, /<table className=\{cn\("w-full text-sm", layout === "fixed" && "table-fixed"\)\} style=\{minWidth \? \{ minWidth \} : undefined\}>/)
  assert.match(source, /<caption className="sr-only">\{caption\}<\/caption>/)
  assert.match(source, /<DataTableScrollArea hint=\{scrollHint\} label=\{caption\}>/)
  assert.match(source, /<div data-slot="data-table-scroll" className="overflow-x-auto overscroll-x-contain">/)
  assert.match(source, /scope="col"/)
  assert.match(source, /aria-sort=\{direction === "asc" \? "ascending" : direction === "desc" \? "descending" : undefined\}/)
  assert.match(source, /<ArrowUp className="size-3\.5 shrink-0" aria-hidden="true" \/>/)
  assert.match(source, /<ArrowDown className="size-3\.5 shrink-0" aria-hidden="true" \/>/)
  assert.match(source, /<span className="sr-only">\{children\}<\/span>/, "hideLabel keeps the column name for screen readers")
  assert.match(source, /className=\{cn\("\[&>tr:last-child>td\]:border-b-0", className\)\}/)
  assert.match(source, /numeric && "text-right whitespace-nowrap num"/)
  assert.match(source, /"border-t border-border bg-surface px-4 py-2\.5 text-meta text-muted-foreground num md:px-5"/)
  assert.match(source, /<td colSpan=\{colSpan\} className="p-0">/)
  assert.match(source, /<ActionEmptyState \{\.\.\.content\.emptyState\} \/> : <EmptyNote padded tone=\{content\.tone\}>/)
  assert.doesNotMatch(source, /<tr data-slot="table-empty-row" className/, "the empty row has no hover fill")
})

test("DataTableScrollArea shows the hint and a focusable region only while the table overflows (B6, I4)", () => {
  const source = readFileSync("src/components/ui/data-table-scroll.tsx", "utf8").replace(/\r\n/g, "\n")

  assert.ok(source.startsWith('"use client"'), "the one client leaf of DataTable")
  assert.match(source, /const observer = new ResizeObserver\(measure\)/)
  assert.match(source, /setOverflowing\(element\.scrollWidth > element\.clientWidth \+ 1\)/)
  assert.match(source, /if \(element\.firstElementChild\) observer\.observe\(element\.firstElementChild\)/)
  assert.match(source, /return \(\) => observer\.disconnect\(\)/)
  assert.match(source, /const region = overflowing && Boolean\(label\)/)
  assert.match(source, /role=\{[^}]*"region"/)
  assert.match(source, /aria-label=\{region \? label : undefined\}/)
  assert.match(source, /tabIndex=\{region \? 0 : undefined\}/)
  assert.match(source, /\{overflowing \? \(\s*<p data-slot="data-table-scroll-hint" className="flex items-center gap-1\.5 border-b border-border-soft px-4 py-1\.5 text-meta text-faint-foreground md:px-5 \[&>svg\]:size-4 \[&>svg\]:shrink-0">/)
  assert.match(source, /<MoveHorizontal aria-hidden="true" \/>/)
  assert.match(source, /className="overflow-x-auto overscroll-x-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"/)
  assert.doesNotMatch(source, /\bshadow-(?:sm|md|lg|xl|2xl)\b|opacity-|leading-tight|leading-4|rounded-\[|flex-col-reverse|uppercase|bg-muted\//)
})

test("ClickableTableRow takes the shared row classes: lit while focus is inside, and while its menu is open (§3.7)", () => {
  const source = readFileSync("src/components/ui/clickable-table-row.tsx", "utf8").replace(/\r\n/g, "\n")

  assert.match(source, /import \{ dataTableRowClasses \} from "@\/components\/ui\/data-table"/)
  assert.match(source, /className=\{cn\(dataTableRowClasses, "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", className\)\}/)
  assert.doesNotMatch(source, /focus:bg-row-hover|className = ""/, "focus-within covers focus on the row itself")
  assert.match(source, /target\.closest\("a,button,input,select,textarea,\[data-no-row-click\]"\)/, "clicks on controls inside the row still do not open it")
})

test("the shared table scroll hint reads the first sentence of the register's hint (I33)", () => {
  const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))

  assert.equal(messages("th").common.tableScrollHint, "เลื่อนตารางซ้าย/ขวาเพื่อดูคอลัมน์เพิ่มเติม")
  assert.equal(messages("en").common.tableScrollHint, "Scroll left/right to see more columns.")
  for (const locale of ["th", "en"] as const) {
    assert.ok(messages(locale).asset.tableScrollHint.startsWith(messages(locale).common.tableScrollHint), locale)
  }
})
```

Run: `node --test tests/list-primitives-ui.test.ts`
Expected: FAIL, `fail 4`; every test Task 3 wrote still passes. The four new tests fail for these reasons:
- "DataTable keeps one density…": `ENOENT: no such file or directory, open '…src\components\ui\data-table.tsx'`
- "DataTableScrollArea shows the hint…": `ENOENT … data-table-scroll.tsx`
- "ClickableTableRow takes the shared row classes…": the first `assert.match`, `/import \{ dataTableRowClasses \} from "@\/components\/ui\/data-table"/`
- "the shared table scroll hint…": `actual: undefined` against `'เลื่อนตารางซ้าย/ขวาเพื่อดูคอลัมน์เพิ่มเติม'`

- [ ] **Step 4: Add the message key**

Save as `t4-messages.json` in your temp folder (copy from spec §10.2, row "2B-1 · 4"):

```json
{
  "set": {
    "th": { "common.tableScrollHint": "เลื่อนตารางซ้าย/ขวาเพื่อดูคอลัมน์เพิ่มเติม" },
    "en": { "common.tableScrollHint": "Scroll left/right to see more columns." }
  }
}
```

Run from the repo root: `node scripts/messages-edit.mjs <temp>/t4-messages.json`
Expected: `messages updated: 1 th, 1 en, 0 deleted`. Each file gets the key at the end of `common` (2 insertions and 1 deletion: the comma on the line before) and keeps CRLF.

- [ ] **Step 5: Create `src/components/ui/data-table-scroll.tsx`** (LF)

```tsx
"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { MoveHorizontal } from "lucide-react"

// The scroll area of DataTable when it has a scrollHint (spec 2B §3.6, B6). It measures like the asset register
// (asset-register-table.tsx): a ResizeObserver on the scroller and on the table, overflowing when the content is
// wider than the box. Only then does it show the hint line, and only then does a named scroller become a focusable
// region, so keyboard users can scroll it with the arrow keys and a table that fits adds no extra Tab stop.
// A table hidden with `hidden md:block` measures 0, so it never shows the hint.
export function DataTableScrollArea({ hint, label, children }: { hint: string; label?: string; children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [overflowing, setOverflowing] = useState(false)

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const measure = () => setOverflowing(element.scrollWidth > element.clientWidth + 1)
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    if (element.firstElementChild) observer.observe(element.firstElementChild)
    return () => observer.disconnect()
  }, [])

  const region = overflowing && Boolean(label)

  return (
    <>
      {overflowing ? (
        <p data-slot="data-table-scroll-hint" className="flex items-center gap-1.5 border-b border-border-soft px-4 py-1.5 text-meta text-faint-foreground md:px-5 [&>svg]:size-4 [&>svg]:shrink-0">
          <MoveHorizontal aria-hidden="true" />
          {hint}
        </p>
      ) : null}
      <div
        ref={scrollRef}
        data-slot="data-table-scroll"
        role={region ? "region" : undefined}
        aria-label={region ? label : undefined}
        tabIndex={region ? 0 : undefined}
        className="overflow-x-auto overscroll-x-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        {children}
      </div>
    </>
  )
}
```

- [ ] **Step 6: Create `src/components/ui/data-table.tsx`** (LF)

```tsx
import Link from "next/link"
import type React from "react"
import { ArrowDown, ArrowUp } from "lucide-react"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { DataTableScrollArea } from "@/components/ui/data-table-scroll"
import { EmptyNote } from "@/components/ui/empty-note"
import { cn } from "@/lib/utils"

// The shared list table (spec 2B §3.4, mockup .table-wrap): a 12px white frame, a white 13/500 faint header in
// sentence case, soft row lines and p-3 cells (rows about 46px). One density only (spec I3): the asset register keeps
// its compact rows in its own file. The first and last columns get 16px gutters (20px from md) through first:/last:,
// which a plain class on a cell cannot override. Server-safe: no directive, no hooks, no context (R-j); the scroll
// hint is the one client leaf (DataTableScrollArea).
// For the tables that cannot move whole yet (R-e), the three class strings below are exported.
export const dataTableHeadClasses = "border-b border-border bg-surface px-3 py-2.5 text-left align-bottom text-meta font-medium whitespace-nowrap text-faint-foreground first:pl-4 last:pr-4 md:first:pl-5 md:last:pr-5"
export const dataTableCellClasses = "border-b border-border-soft p-3 align-top first:pl-4 last:pr-4 md:first:pl-5 md:last:pr-5"
// "Instant on, soft off": the fill appears at once on hover or focus and fades out in 150ms. The row stays lit while a
// menu or popover it opened is open, because focus then sits in a portal outside the row.
export const dataTableRowClasses = "group/row transition-colors hover:bg-row-hover hover:duration-0 focus-within:bg-row-hover focus-within:duration-0 has-[[aria-expanded=true]]:bg-row-hover"

const dataTableFrameClasses = "min-w-0 max-w-full overflow-hidden rounded-lg border border-border bg-surface"
const dataTableSortLinkClasses = "inline-flex min-h-11 min-w-0 max-w-full items-center gap-1 rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:-my-2.5 md:min-h-0"
// A pinned column draws a line on its inner edge, with no shadow (R-j). The cells set the side's color only, so cn()
// keeps the soft row line under them.
const dataTableStickyHeadClasses = {
  left: "sticky left-0 z-30 border-r border-border",
  right: "sticky right-0 z-30 border-l border-border",
} as const
const dataTableStickyCellClasses = {
  left: "sticky left-0 z-20 border-r border-r-border bg-surface transition-colors group-hover/row:bg-row-hover group-hover/row:duration-0 group-focus-within/row:bg-row-hover group-focus-within/row:duration-0 group-has-[[aria-expanded=true]]/row:bg-row-hover",
  right: "sticky right-0 z-20 border-l border-l-border bg-surface transition-colors group-hover/row:bg-row-hover group-hover/row:duration-0 group-focus-within/row:bg-row-hover group-focus-within/row:duration-0 group-has-[[aria-expanded=true]]/row:bg-row-hover",
} as const

export type DataTableProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** <colgroup>, <DataTableHeader> and <DataTableBody>. */
  children: React.ReactNode
  /** The table's name for screen readers (a visually hidden <caption>); also names the scroll region. */
  caption?: string
  /** Default true. false: no frame of its own, for a table inside a panel that already has one. */
  framed?: boolean
  /** "fixed" adds table-fixed for tables that set their widths in a <colgroup>. */
  layout?: "auto" | "fixed"
  /** In px, on the <table>. */
  minWidth?: number
  /** Shown above the table only while it overflows (B6), through DataTableScrollArea. */
  scrollHint?: string
  /** The content of DataTableFoot: a <Pagination> or a range line. */
  footer?: React.ReactNode
}

export function DataTable({ children, caption, framed = true, layout = "auto", minWidth, scrollHint, footer, className, ...props }: DataTableProps) {
  const table = (
    <table className={cn("w-full text-sm", layout === "fixed" && "table-fixed")} style={minWidth ? { minWidth } : undefined}>
      {caption ? <caption className="sr-only">{caption}</caption> : null}
      {children}
    </table>
  )

  return (
    <div data-slot="data-table" className={cn(framed ? dataTableFrameClasses : "min-w-0 max-w-full", className)} {...props}>
      {scrollHint ? (
        <DataTableScrollArea hint={scrollHint} label={caption}>
          {table}
        </DataTableScrollArea>
      ) : (
        <div data-slot="data-table-scroll" className="overflow-x-auto overscroll-x-contain">
          {table}
        </div>
      )}
      {footer ? <DataTableFoot>{footer}</DataTableFoot> : null}
    </div>
  )
}

// No fill: the header cells bring their white background (so R7 has nothing to count here).
export function DataTableHeader(props: React.ComponentProps<"thead">) {
  return <thead data-slot="data-table-header" {...props} />
}

export function DataTableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="data-table-body" className={cn("[&>tr:last-child>td]:border-b-0", className)} {...props} />
}

export type DataTableSort = {
  href: string
  /** null: the column can be sorted but is not the sorted one now. */
  direction: "asc" | "desc" | null
  scroll?: boolean
}

export type DataTableHeadProps = Omit<React.ComponentProps<"th">, "scope"> & {
  align?: "left" | "right"
  sort?: DataTableSort
  sticky?: "left" | "right"
  /** The name stays for screen readers but is not shown, for example tCommon("actions") over a button column. */
  hideLabel?: boolean
}

// aria-sort only on the sorted column, and an arrow only there. The sort link is 44px tall on phones; max-md:-my-2.5
// takes the header's own padding back, so the header row stays 44 and does not grow to 64.
export function DataTableHead({ align = "left", sort, sticky, hideLabel = false, className, children, ...props }: DataTableHeadProps) {
  const direction = sort?.direction ?? null
  const label = hideLabel ? <span className="sr-only">{children}</span> : children

  return (
    <th
      data-slot="data-table-head"
      {...props}
      scope="col"
      aria-sort={direction === "asc" ? "ascending" : direction === "desc" ? "descending" : undefined}
      className={cn(dataTableHeadClasses, align === "right" && "text-right", sticky && dataTableStickyHeadClasses[sticky], className)}
    >
      {sort ? (
        <Link href={sort.href} scroll={sort.scroll} className={cn(dataTableSortLinkClasses, direction && "text-foreground")}>
          {hideLabel ? label : <span className="truncate">{children}</span>}
          {direction === "asc" ? <ArrowUp className="size-3.5 shrink-0" aria-hidden="true" /> : null}
          {direction === "desc" ? <ArrowDown className="size-3.5 shrink-0" aria-hidden="true" /> : null}
        </Link>
      ) : label}
    </th>
  )
}

export function DataTableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr data-slot="data-table-row" className={cn(dataTableRowClasses, className)} {...props} />
}

export type DataTableCellProps = React.ComponentProps<"td"> & {
  align?: "left" | "right"
  /** Right-aligned, on one line, with tabular figures (num). */
  numeric?: boolean
  sticky?: "left" | "right"
}

export function DataTableCell({ align = "left", numeric = false, sticky, className, ...props }: DataTableCellProps) {
  return (
    <td
      data-slot="data-table-cell"
      className={cn(
        dataTableCellClasses,
        align === "right" && "text-right",
        numeric && "text-right whitespace-nowrap num",
        sticky && dataTableStickyCellClasses[sticky],
        className,
      )}
      {...props}
    />
  )
}

// The table foot (mockup .table-foot): the place for <Pagination> or a range line.
export function DataTableFoot({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="data-table-foot" className={cn("border-t border-border bg-surface px-4 py-2.5 text-meta text-muted-foreground num md:px-5", className)} {...props} />
}

export type TableEmptyRowProps = { colSpan: number } & (
  | { children: React.ReactNode; tone?: "empty" | "clear"; emptyState?: never }
  | { emptyState: React.ComponentProps<typeof ActionEmptyState>; children?: never; tone?: never }
)

// The one empty row: a one-line note, or an ActionEmptyState when there is a title, a description or a button
// (clear filters as actionVariant "secondary"). No hover fill and no live region: the page reloads as a whole.
export function TableEmptyRow({ colSpan, ...content }: TableEmptyRowProps) {
  return (
    <tr data-slot="table-empty-row">
      <td colSpan={colSpan} className="p-0">
        {content.emptyState ? <ActionEmptyState {...content.emptyState} /> : <EmptyNote padded tone={content.tone}>{content.children}</EmptyNote>}
      </td>
    </tr>
  )
}
```

- [ ] **Step 7: Give `ClickableTableRow` the shared row classes (`src/components/ui/clickable-table-row.tsx`)**

Three exact replacements; the file is CRLF.

(1) Imports. Replace:

```tsx
import { useRef } from "react"
import { useRouter } from "next/navigation"
import {
  CLICKABLE_ROW_BEFORE_NAVIGATE_EVENT,
  shouldCancelClickableRowNavigation,
} from "@/lib/clickable-row-navigation"
```

with:

```tsx
import { useRef } from "react"
import { useRouter } from "next/navigation"
import { dataTableRowClasses } from "@/components/ui/data-table"
import {
  CLICKABLE_ROW_BEFORE_NAVIGATE_EVENT,
  shouldCancelClickableRowNavigation,
} from "@/lib/clickable-row-navigation"
import { cn } from "@/lib/utils"
```

(2) The `className` default. Replace:

```tsx
  label,
  className = "",
  onNavigate,
```

with:

```tsx
  label,
  className,
  onNavigate,
```

(3) The row classes. Replace:

```tsx
      className={`cursor-pointer hover:bg-row-hover focus:bg-row-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${className}`}
```

with:

```tsx
      className={cn(dataTableRowClasses, "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", className)}
```

- [ ] **Step 8: Run the tests for this task**

Run: `node --test tests/list-primitives-ui.test.ts tests/clickable-table-row-navigation.test.ts tests/asset-register-ux.test.ts tests/asset-register-building-blocks-ui.test.ts tests/feedback-states-ui.test.ts tests/class-merge.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `fail 0`. The files no earlier task of this plan edits give: clickable-table-row-navigation 2, asset-register-ux 18, asset-register-building-blocks-ui 4, feedback-states-ui 9, class-merge 3, thai-glossary 3, messages-parity 3, form-migration-guards 23.

- [ ] **Step 9: Prove the new classes compile**

Run from the repo root: `node <temp>/p2b1-tw-probe.mjs src/components/ui/data-table.tsx src/components/ui/data-table-scroll.tsx src/components/ui/clickable-table-row.tsx`
Expected: `checked 81 classes, missing 0` (exit 0). To see the tricky rules, prefix `SHOW='has-[[aria-expanded=true]]:bg-row-hover,group-has-[[aria-expanded=true]]/row:bg-row-hover,group-hover/row:bg-row-hover,[&>tr:last-child>td]:border-b-0,max-md:-my-2.5,border-l-border'`. They compile to `&:has(*:is([aria-expanded=true]))`, `&:is(:where(.group\/row):has(*:is([aria-expanded=true])) *)`, `&:is(:where(.group\/row):hover *) { @media (hover: hover) … }`, `&>tr:last-child>td { … border-bottom-width: 0px }`, `@media (width < 48rem) { margin-block: calc(var(--spacing) * -2.5) }` and `border-left-color: var(--border)`.

- [ ] **Step 10: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, and 4 more tests than before Step 3: 1847 tests, 1846 pass, 1 skipped (after Tasks 1–3: 1843).
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- `git diff --stat` shows 4 files: `clickable-table-row.tsx` 4 insertions and 2 deletions, `messages/th.json` and `messages/en.json` 2 insertions and 1 deletion each, `tests/list-primitives-ui.test.ts` 67 insertions.
- `git status` also lists `?? src/components/ui/data-table-scroll.tsx` (47 lines) and `?? src/components/ui/data-table.tsx` (171 lines).
- Git may warn that LF will be replaced by CRLF in the new files. Leave them LF. A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).

- [ ] **Step 11: Commit**

```bash
git add src/components/ui/data-table.tsx src/components/ui/data-table-scroll.tsx src/components/ui/clickable-table-row.tsx messages/th.json messages/en.json tests/list-primitives-ui.test.ts
git commit -m "feat(ui): DataTable, TableEmptyRow and the table scroll hint, with the shared row classes (2B-1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 6 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the plan 2B-1 dev-app check (Task 25):**
- `/th/assets`, `/th/disposal`, `/th/maintenance`, `/th/audit/rounds/<id>` at 1440: Tab into a row and on to a link or ⋯ inside it: the whole row stays lit; it fades out in about 150ms when focus leaves. With ⋯ open on a register row, the row stays lit.
- `/th/disposal` with bulk approval on: tick a row's checkbox, then click outside: the fill goes once focus leaves the checkbox (risk 3 of §3.19).
- With reduced motion on, the fill still appears at once and only fades out (no movement). In Windows forced colors, the inset focus ring of a focused row still shows.

---

### Task 5: Extend `ui/pagination.tsx` and add `src/lib/list-pagination.ts`

Spec §3.8 (`Pagination` API, markup and class table), §5.9.1 (the B4 rules and the pure helpers), §5.14 (`tests/list-pagination.test.ts`), §3.21 table C row "แบ่งหน้า", §10.2 rulings I21, I33 and the message row "2B-1 · 5", §10.3 row 5. One commit. The only caller today is the asset register (`asset-register-table.tsx:683`); its call does not change.

Rulings this task applies:
- **§3.8, mockup `.table-foot`:** words-only `outline sm` buttons (`buttonVariants({ variant: "outline", size: "sm" })`: 44px below `md`, 32px from `md`), no chevrons; the range and "หน้า x จาก y" on the left in one `aria-live="polite"` line; the page sizes as links that look like `Segmented` (`aria-current="true"` and weight 600 on the current one, never color alone); a disabled button is a `<span aria-disabled="true">` with the shared disabled look, so it takes no focus and nothing fades.
- **R-k, §3.18 #14:** `tests/asset-register-building-blocks-ui.test.ts:8-17` passes unchanged: no directive, `<nav aria-label={labels.navigation}`, `aria-disabled="true"`, `min-h-11` (now in `pageSizeOptionClasses`), `<Link`, no `opacity-`.
- **The new props are optional:** `range`, `pageSizeGroup`, `rowsPerPage`, `pageSize`, `pageSizes`. The register passes none, so it shows no range in the nav (it prints its own range line next to it until 2B-3) and no page sizes (it picks its size in the filter sheet, DS:504).
- **§5.9.1, I21:** page sizes 25/50/100, default 25. `parseListPage` takes a page as a whole number of at least 1 (anything else is 1) and a page size of exactly 25, 50 or 100 (anything else, a repeated key included, is 25). `appendListPage` writes `page` only above 1 and `pageSize` only when it is not 25, and drops any old value, so every default link stays exactly as it is today. `lastListPage` is at least 1: Tasks 13–21 redirect a page past the end there. The range numbers keep coming from `paginationRange` (`src/lib/master-data-query.ts:54-63`).
- **I33:** `common.showingRange` equals `asset.registerRange` and `common.pageSizeLabel` equals `asset.pageSizeLabel`, in both languages (copy from the §10.2 message table). The range does not start with "แสดง", because `common.rowsPerPage` ("แสดง") stands in front of the page sizes.
- **Ruling (spec gap), the helper input:** `parseListPage` takes `{ page?: ListPageParam; pageSize?: ListPageParam }` with `ListPageParam = string | string[] | number | null | undefined`, so a page passes its awaited `searchParams` fields as they come. `appendListPage` takes `{ page?: number; pageSize?: number }`: a filter or tab link passes only `{ pageSize }` and so goes back to page 1 with the same page size (§5.9.1 "ตัวกรองเปลี่ยน → กลับหน้า 1 คง pageSize"). It mutates and returns the same `URLSearchParams`.
- **Ruling, exports:** `list-pagination.ts` exports the five names of §10.3 plus the types `ListPageSize`, `ListPageState` and `ListPageParam`; the default size stays private (`LIST_PAGE_SIZES[0]`). `pagination.tsx` now exports `PaginationLabels`, `PaginationPageSize` and `PaginationProps`.

What users will see (spec §3 "ผลที่พนักงานเห็นทันที", §3.19 risk 2):
- On `/th/assets` only (the one caller): the previous and next buttons lose their arrows, are 32px tall on desktop (36 before) and still 44 on phones; "หน้า x จาก y" moves to the left of the buttons; a disabled button gets the 2A disabled look (light fill, faint text) instead of the grey `bg-muted` box.
- No list shows page sizes or a range in its foot until Tasks 13–21.

Not in this task:
- Any page or query (Tasks 13–21; departments is the B4 list of this plan, Task 17). `planStatePageSlices` (2B-2).
- The register's range lines and its `Pagination` call (`asset-register-table.tsx:434-435`, `:681-694`, 2B-3).
- No VFG or LFG budget changes (`ui/pagination.tsx` is the owner LT4 skips and sits in `NAV_PRIMITIVES`; `list-pagination.ts` is off screen). No `MIGRATED_LIST_FILES` line. No formatter.

**Files:**
- Modify: `src/components/ui/pagination.tsx` (CRLF, 3 exact replacements that together rewrite the file)
- Create: `src/lib/list-pagination.ts` (LF, 56 lines)
- Create: `tests/list-pagination.test.ts` (LF, 56 lines)
- Modify: `messages/th.json`, `messages/en.json` (CRLF, through `node scripts/messages-edit.mjs` only)
- Modify: `tests/list-primitives-ui.test.ts` (LF: append the pagination block after the Task 4 block)
- Temp folder only, never committed: `p2b1-t45-precheck.mjs` and `p2b1-tw-probe.mjs` (from Task 4), `t5-messages.json`

**Must keep passing without edits:**
- `tests/asset-register-building-blocks-ui.test.ts` (all 4 tests; `:8-17` is the pagination pin, `:42-47` the messages)
- `tests/asset-register-table-ui.test.ts` (17 tests; `:81-86` reads the register's range lines, which stay)
- `tests/maintenance-pagination-ui.test.ts`, `tests/disposal-route-structure.test.ts` (their own pagers stay until 2B-2)
- `tests/visual-foundation-guards.test.ts`, `tests/list-frame-guards.test.ts`, `tests/form-migration-guards.test.ts` (not edited), `tests/thai-glossary.test.ts`, `tests/messages-parity.test.ts`

**Interfaces:**
- Consumes:
  - Task 4: `tests/list-primitives-ui.test.ts` with the table block; `DataTableFoot` (callers put `<Pagination>` into `DataTable footer=…`).
  - 2A: `buttonVariants` from `@/components/ui/button-variants` (server-safe; `sizeSm` `button-variants.ts:6`), `cn` from `@/lib/utils`, `next/link`.
  - Existing keys `common.pagination`, `common.previous`, `common.next`, `common.pageOf`, `common.rowsPerPage`.
- Produces (Tasks 13–21, 2B-2 and 2B-5 rely on these):
  - `src/components/ui/pagination.tsx`, server-safe: `Pagination(props: PaginationProps)` with `PaginationProps = { page: number; totalPages: number; previousHref: string; nextHref: string; labels: PaginationLabels; pageSize?: number; pageSizes?: readonly PaginationPageSize[]; className?: string }`, `PaginationLabels = { navigation: string; previous: string; next: string; pageOf: string; range?: string; pageSizeGroup?: string; rowsPerPage?: string }`, `PaginationPageSize = { value: number; href: string }`.
  - `src/lib/list-pagination.ts`, pure (tests import it): `LIST_PAGE_SIZES` (`readonly [25, 50, 100]`) · `type ListPageSize = 25 | 50 | 100` · `type ListPageState = { page: number; pageSize: ListPageSize }` · `type ListPageParam = string | string[] | number | null | undefined` · `parseListPage(raw: { page?: ListPageParam; pageSize?: ListPageParam }): ListPageState` · `listPageWindow(state: ListPageState): { skip: number; take: number }` · `lastListPage(total: number, pageSize: number): number` · `appendListPage(params: URLSearchParams, state: { page?: number; pageSize?: number }): URLSearchParams`.
  - Message keys `common.showingRange` (`{from}`, `{to}`, `{total}`: pass strings already through `formatCount`, §3.17) and `common.pageSizeLabel`.
  - How a list page calls it (Tasks 13–21 write the real code; `hrefFor` stands for the page's own href builder, which uses `appendListPage`):

```tsx
const { start, end, totalPages } = paginationRange(page, pageSize, total)
<Pagination
  page={Math.min(page, totalPages)}
  totalPages={totalPages}
  previousHref={hrefFor({ page: page - 1, pageSize })}
  nextHref={hrefFor({ page: page + 1, pageSize })}
  pageSize={pageSize}
  pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: hrefFor({ page: 1, pageSize: value }) }))}
  labels={{
    navigation: tCommon("pagination"),
    previous: tCommon("previous"),
    next: tCommon("next"),
    pageOf: tCommon("pageOf", { page: Math.min(page, totalPages), total: totalPages }),
    range: tCommon("showingRange", { from: formatCount(start), to: formatCount(end), total: formatCount(total) }),
    pageSizeGroup: tCommon("pageSizeLabel"),
    rowsPerPage: tCommon("rowsPerPage"),
  }}
/>
```

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b1-t45-precheck.mjs 5` (the script from Task 4 Step 1)
Expected: `git status` prints nothing. The script prints:
```
ok      Task 4 merged: DataTable and its table block are in
ok      tests/list-primitives-ui.test.ts has no pagination block yet
ok      src/lib/list-pagination.ts and tests/list-pagination.test.ts do not exist yet
ok      pagination.tsx is still the old one (chevrons, hand-written controlClasses)
ok      the asset register is the only <Pagination caller
ok      buttonVariants is exported with the 2A sm size
ok      paginationRange is still exported from src/lib/master-data-query.ts
ok      common.showingRange and common.pageSizeLabel are new in th and en
ok      the register's words exist (I33)
ok      common.pagination, pageOf, previous, next and rowsPerPage exist
info    src/components/ui/pagination.tsx: CRLF
info    messages/th.json: CRLF
info    messages/en.json: CRLF
info    tests/list-primitives-ui.test.ts: LF
preconditions hold for Task 5
```
On any `MISSING` line, stop and report it.

Run: `git ls-files --eol src/components/ui/pagination.tsx`
Expected: `i/lf w/crlf`. Keep it.

- [ ] **Step 2: Write the failing tests**

(a) Append this block at the very end of `tests/list-primitives-ui.test.ts` (after the Task 4 block; it starts with one blank line):

```ts

// Task 5 (spec 2B §3.8, I33): Pagination in the table foot, with the range and the page sizes.
test("Pagination puts the range left, page sizes as Segmented-look links, and words-only outline sm buttons (§3.8)", () => {
  const source = readFileSync("src/components/ui/pagination.tsx", "utf8").replace(/\r\n/g, "\n")
  const constant = (name: string) => source.match(new RegExp(`const ${name} = "([^"]+)"`))?.[1]

  assert.doesNotMatch(source, /"use client"|\buse(?:State|Effect|Context)\b|\bcreateContext\b/, "server-safe, no hooks")
  assert.doesNotMatch(source, /\bshadow-(?:sm|md|lg|xl|2xl)\b|opacity-|leading-tight|leading-4|rounded-\[|flex-col-reverse|uppercase|bg-muted/)
  assert.doesNotMatch(source, /ChevronLeft|ChevronRight/, "words only, like the mockup's table foot")
  assert.match(source, /const controlClasses = buttonVariants\(\{ variant: "outline", size: "sm" \}\)/)
  assert.match(source, /<nav aria-label=\{labels\.navigation\} className=\{cn\("flex flex-wrap items-center justify-between gap-x-3 gap-y-2", className\)\}>/)
  assert.match(source, /<p aria-live="polite" className="text-meta text-muted-foreground num">/)
  assert.match(source, /\{labels\.range \? <>\{labels\.range\}<span aria-hidden="true"> · <\/span><\/> : null\}/)
  assert.match(source, /<div role="group" aria-label=\{labels\.pageSizeGroup\} className="flex items-center gap-2">/)
  assert.match(source, /<span aria-hidden="true" className="text-meta text-muted-foreground">\{labels\.rowsPerPage\}<\/span>/)
  assert.match(source, /aria-current=\{size\.value === pageSize \? "true" : undefined\}/)
  assert.equal(constant("pageSizeFrameClasses"), "inline-flex gap-0.5 rounded-md border border-border bg-surface p-0.5")
  assert.equal(constant("pageSizeOptionClasses"), "inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-2 text-meta transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-6.5 md:min-w-8")
  assert.equal(constant("pageSizeCurrentClasses"), "bg-primary-soft font-semibold text-primary-hover")
  assert.equal(constant("pageSizeIdleClasses"), "font-medium text-muted-foreground hover:bg-background hover:text-foreground")
  assert.match(source, /<PaginationControl href=\{previousHref\} enabled=\{page > 1\} rel="prev" label=\{labels\.previous\} \/>/)
  assert.match(source, /<PaginationControl href=\{nextHref\} enabled=\{page < totalPages\} rel="next" label=\{labels\.next\} \/>/)
  assert.match(source, /<span aria-disabled="true" className=\{controlClasses\}>/, "a disabled button takes no focus and keeps the shared disabled look")
  assert.match(source, /<Link href=\{href\} rel=\{rel\} className=\{controlClasses\}>/)
  assert.match(source, /pageSizes\?: readonly PaginationPageSize\[\]/)
})

test("the pagination range and page-size group read the register's words (I33)", () => {
  const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))

  assert.equal(messages("th").common.showingRange, "{from}–{to} จาก {total} รายการ")
  assert.equal(messages("en").common.showingRange, "{from}–{to} of {total}")
  assert.equal(messages("th").common.pageSizeLabel, "จำนวนต่อหน้า")
  assert.equal(messages("en").common.pageSizeLabel, "Rows per page")
  for (const locale of ["th", "en"] as const) {
    assert.equal(messages(locale).common.showingRange, messages(locale).asset.registerRange, locale)
    assert.equal(messages(locale).common.pageSizeLabel, messages(locale).asset.pageSizeLabel, locale)
  }
})
```

(b) Create `tests/list-pagination.test.ts` (LF):

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { LIST_PAGE_SIZES, appendListPage, lastListPage, listPageWindow, parseListPage } from "../src/lib/list-pagination.ts"

// Phase 2B B4 (spec 2B §5.9.1, §5.14): the page helpers every server list shares. Plan 2B-2 adds planStatePageSlices here.

test("lists offer 25, 50 and 100 rows per page (R-k)", () => {
  assert.deepEqual([...LIST_PAGE_SIZES], [25, 50, 100])
})

test("parseListPage keeps a page size of 25, 50 or 100 and turns any other value into 25", () => {
  for (const size of LIST_PAGE_SIZES) {
    assert.equal(parseListPage({ pageSize: String(size) }).pageSize, size)
    assert.equal(parseListPage({ pageSize: size }).pageSize, size)
  }
  for (const pageSize of ["10", "0", "abc", "", "50.5", "-25", "1e2", ["50", "100"], 10, null, undefined]) {
    assert.equal(parseListPage({ pageSize }).pageSize, 25, JSON.stringify(pageSize))
  }
})

test("parseListPage reads a whole page number of at least 1 and turns any other value into 1", () => {
  assert.deepEqual(parseListPage({}), { page: 1, pageSize: 25 })
  assert.equal(parseListPage({ page: "2" }).page, 2)
  assert.equal(parseListPage({ page: 3 }).page, 3)
  for (const page of ["0", "-1", "x", "", "1.5", "1e3", ["2", "3"], 0, -2, 2.5, null, undefined]) {
    assert.equal(parseListPage({ page }).page, 1, JSON.stringify(page))
  }
})

test("listPageWindow turns a page into the skip and take of findMany", () => {
  assert.deepEqual(listPageWindow({ page: 1, pageSize: 25 }), { skip: 0, take: 25 })
  assert.deepEqual(listPageWindow({ page: 3, pageSize: 50 }), { skip: 100, take: 50 })
  assert.deepEqual(listPageWindow(parseListPage({ page: "2", pageSize: "100" })), { skip: 100, take: 100 })
})

test("lastListPage is at least 1, so an empty list and a page past the end both land on a real page", () => {
  assert.equal(lastListPage(0, 25), 1)
  assert.equal(lastListPage(1, 25), 1)
  assert.equal(lastListPage(25, 25), 1)
  assert.equal(lastListPage(26, 25), 2)
  assert.equal(lastListPage(120, 50), 3)
})

test("appendListPage writes only the values that differ from the defaults, so default links stay as they are", () => {
  assert.equal(appendListPage(new URLSearchParams("view=open"), { page: 1, pageSize: 25 }).toString(), "view=open")
  assert.equal(appendListPage(new URLSearchParams("search=a"), { page: 2, pageSize: 50 }).toString(), "search=a&page=2&pageSize=50")
  assert.equal(
    appendListPage(new URLSearchParams("page=4&pageSize=100&search=a"), { pageSize: 100 }).toString(),
    "search=a&pageSize=100",
    "a filter link goes back to page 1 and keeps the page size",
  )
  assert.equal(appendListPage(new URLSearchParams("page=4&pageSize=50"), {}).toString(), "")
  const params = new URLSearchParams("search=a")
  assert.equal(appendListPage(params, { page: 3 }), params, "returns the same params, for chaining")
  assert.equal(params.toString(), "search=a&page=3")
})
```

Run: `node --test tests/list-primitives-ui.test.ts tests/list-pagination.test.ts`
Expected: FAIL, `fail 3`; every Task 3 and Task 4 test still passes.
- `tests/list-pagination.test.ts` fails as a file: `ERR_MODULE_NOT_FOUND … src\lib\list-pagination.ts`.
- "Pagination puts the range left…" fails first on the forbidden-class check: the old disabled control's `bg-muted` (and its `ChevronLeft` import) are still in the file.
- "the pagination range and page-size group…": `actual: undefined` against `'{from}–{to} จาก {total} รายการ'`.

- [ ] **Step 3: Add the message keys**

Save as `t5-messages.json` in your temp folder (copy from spec §10.2, row "2B-1 · 5"; the dash in the range is U+2013, as in `asset.registerRange`):

```json
{
  "set": {
    "th": { "common.showingRange": "{from}–{to} จาก {total} รายการ", "common.pageSizeLabel": "จำนวนต่อหน้า" },
    "en": { "common.showingRange": "{from}–{to} of {total}", "common.pageSizeLabel": "Rows per page" }
  }
}
```

Run from the repo root: `node scripts/messages-edit.mjs <temp>/t5-messages.json`
Expected: `messages updated: 2 th, 2 en, 0 deleted`. Each file gets the two keys at the end of `common` (3 insertions and 1 deletion) and keeps CRLF.

- [ ] **Step 4: Create `src/lib/list-pagination.ts`** (LF)

```ts
// Server-side paging for the phase 2B lists (spec 2B §5.9.1, B4, R-k). Pure: no Prisma, no React, so tests import it.
// The URL carries page only above 1 and pageSize only when it is not 25, so every default link stays as it is today.
// The range line keeps using paginationRange (src/lib/master-data-query.ts).

export const LIST_PAGE_SIZES = [25, 50, 100] as const

export type ListPageSize = (typeof LIST_PAGE_SIZES)[number]
export type ListPageState = { page: number; pageSize: ListPageSize }
/** A search param as a page receives it, or a number a caller already has. */
export type ListPageParam = string | string[] | number | null | undefined

const DEFAULT_LIST_PAGE_SIZE: ListPageSize = LIST_PAGE_SIZES[0]

// A whole number written with digits only ("2", not "2.5", "1e3" or "-1"); a repeated key (an array) is not one.
function wholeNumber(value: ListPageParam): number | null {
  if (typeof value === "number") return Number.isSafeInteger(value) ? value : null
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null
  const number = Number(value)
  return Number.isSafeInteger(number) ? number : null
}

function isListPageSize(value: number | null): value is ListPageSize {
  return LIST_PAGE_SIZES.some((size) => size === value)
}

/** page: a whole number of at least 1, else 1. pageSize: 25, 50 or 100, else 25. */
export function parseListPage(raw: { page?: ListPageParam; pageSize?: ListPageParam }): ListPageState {
  const page = wholeNumber(raw.page)
  const pageSize = wholeNumber(raw.pageSize)
  return {
    page: page !== null && page >= 1 ? page : 1,
    pageSize: isListPageSize(pageSize) ? pageSize : DEFAULT_LIST_PAGE_SIZE,
  }
}

/** The findMany window of a page. A page past the end gives an empty window: the page then redirects to lastListPage. */
export function listPageWindow({ page, pageSize }: ListPageState): { skip: number; take: number } {
  return { skip: (page - 1) * pageSize, take: pageSize }
}

/** The last page, at least 1 (an empty list still has page 1). */
export function lastListPage(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize))
}

/**
 * Writes page and pageSize into params where they differ from the defaults (1 and 25) and drops any old value.
 * A filter link passes only { pageSize }: it goes back to page 1 and keeps the page size. Returns params.
 */
export function appendListPage(params: URLSearchParams, state: { page?: number; pageSize?: number }): URLSearchParams {
  params.delete("page")
  params.delete("pageSize")
  if (state.page !== undefined && state.page > 1) params.set("page", String(state.page))
  if (state.pageSize !== undefined && state.pageSize !== DEFAULT_LIST_PAGE_SIZE) params.set("pageSize", String(state.pageSize))
  return params
}
```

- [ ] **Step 5: Extend `Pagination` (`src/components/ui/pagination.tsx`)**

Three exact replacements; the file is CRLF. Together they rewrite the file; the blank lines between the three parts stay.

(1) Imports, labels and classes. Replace:

```tsx
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

type PaginationLabels = {
  navigation: string
  previous: string
  next: string
  /** Already formatted, e.g. "หน้า 2 จาก 9". */
  pageOf: string
}

const controlClasses =
  "inline-flex min-h-11 items-center gap-1 rounded-md border border-border px-3 text-sm font-medium sm:h-9 sm:min-h-0"
```

with:

```tsx
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

export type PaginationLabels = {
  /** tCommon("pagination"): the name of the nav. */
  navigation: string
  previous: string
  next: string
  /** Already formatted, e.g. "หน้า 2 จาก 9". */
  pageOf: string
  /** tCommon("showingRange", { from, to, total }) with the numbers already through formatCount. */
  range?: string
  /** tCommon("pageSizeLabel"): the name of the page-size group. Pass it whenever you pass pageSizes. */
  pageSizeGroup?: string
  /** tCommon("rowsPerPage"): the word shown before the page sizes ("แสดง"). */
  rowsPerPage?: string
}

export type PaginationPageSize = { value: number; href: string }

export type PaginationProps = {
  /** The page shown, already kept within 1…totalPages. */
  page: number
  totalPages: number
  previousHref: string
  nextHref: string
  labels: PaginationLabels
  /** The current page size; marks one of pageSizes as current. */
  pageSize?: number
  /** 25/50/100 for the server lists (R-k). The asset register passes none: it picks its size in the filter sheet. */
  pageSizes?: readonly PaginationPageSize[]
  className?: string
}

// Mockup .table-foot (spec 2B §3.8): the range and the page text on the left, announced when a client navigation
// changes them; the page sizes as links that look like Segmented; words-only outline sm buttons, 44px below md and
// 32px from md. A disabled button is a span with the shared disabled look, so it takes no focus and never fades.
// Server-safe: no directive and no hooks.
const controlClasses = buttonVariants({ variant: "outline", size: "sm" })
const pageSizeFrameClasses = "inline-flex gap-0.5 rounded-md border border-border bg-surface p-0.5"
// The frame is 32px from md (26 + 2 × 2 padding + 2 × 1 border); every option is a 44px target below md.
const pageSizeOptionClasses = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-2 text-meta transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-6.5 md:min-w-8"
const pageSizeCurrentClasses = "bg-primary-soft font-semibold text-primary-hover"
const pageSizeIdleClasses = "font-medium text-muted-foreground hover:bg-background hover:text-foreground"
```

(2) `Pagination`. Replace:

```tsx
export function Pagination({
  page,
  totalPages,
  previousHref,
  nextHref,
  labels,
  className,
}: {
  page: number
  totalPages: number
  previousHref: string
  nextHref: string
  labels: PaginationLabels
  className?: string
}) {
  return (
    <nav aria-label={labels.navigation} className={cn("flex items-center gap-2", className)}>
      <PaginationControl href={previousHref} enabled={page > 1} direction="previous" label={labels.previous} />
      <span className="px-1 text-sm text-muted-foreground">{labels.pageOf}</span>
      <PaginationControl href={nextHref} enabled={page < totalPages} direction="next" label={labels.next} />
    </nav>
  )
}
```

with:

```tsx
export function Pagination({ page, totalPages, previousHref, nextHref, labels, pageSize, pageSizes, className }: PaginationProps) {
  return (
    <nav aria-label={labels.navigation} className={cn("flex flex-wrap items-center justify-between gap-x-3 gap-y-2", className)}>
      <p aria-live="polite" className="text-meta text-muted-foreground num">
        {labels.range ? <>{labels.range}<span aria-hidden="true"> · </span></> : null}
        {labels.pageOf}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {pageSizes?.length ? (
          <div role="group" aria-label={labels.pageSizeGroup} className="flex items-center gap-2">
            {labels.rowsPerPage ? <span aria-hidden="true" className="text-meta text-muted-foreground">{labels.rowsPerPage}</span> : null}
            <div className={pageSizeFrameClasses}>
              {pageSizes.map((size) => (
                <Link
                  key={size.value}
                  href={size.href}
                  aria-current={size.value === pageSize ? "true" : undefined}
                  className={cn(pageSizeOptionClasses, size.value === pageSize ? pageSizeCurrentClasses : pageSizeIdleClasses)}
                >
                  {size.value}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
        <PaginationControl href={previousHref} enabled={page > 1} rel="prev" label={labels.previous} />
        <PaginationControl href={nextHref} enabled={page < totalPages} rel="next" label={labels.next} />
      </div>
    </nav>
  )
}
```

(3) `PaginationControl`. The file ends with `}` and one line break, as before. Replace:

```tsx
function PaginationControl({
  href,
  enabled,
  direction,
  label,
}: {
  href: string
  enabled: boolean
  direction: "previous" | "next"
  label: string
}) {
  const content = direction === "previous"
    ? <><ChevronLeft className="size-4" aria-hidden="true" />{label}</>
    : <>{label}<ChevronRight className="size-4" aria-hidden="true" /></>

  if (!enabled) {
    return (
      <span aria-disabled="true" className={cn(controlClasses, "cursor-not-allowed bg-muted text-muted-foreground")}>
        {content}
      </span>
    )
  }

  return (
    <Link
      href={href}
      className={cn(controlClasses, "bg-surface text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
    >
      {content}
    </Link>
  )
}
```

with:

```tsx
function PaginationControl({
  href,
  enabled,
  rel,
  label,
}: {
  href: string
  enabled: boolean
  rel: "prev" | "next"
  label: string
}) {
  if (!enabled) {
    return (
      <span aria-disabled="true" className={controlClasses}>
        {label}
      </span>
    )
  }

  return (
    <Link href={href} rel={rel} className={controlClasses}>
      {label}
    </Link>
  )
}
```

Check: `grep -n "Chevron\|bg-muted\|direction\|sm:h-9" src/components/ui/pagination.tsx` prints nothing.

- [ ] **Step 6: Run the tests for this task**

Run: `node --test tests/list-primitives-ui.test.ts tests/list-pagination.test.ts tests/asset-register-building-blocks-ui.test.ts tests/asset-register-table-ui.test.ts tests/maintenance-pagination-ui.test.ts tests/disposal-route-structure.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts tests/class-merge.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `fail 0`. Among them: list-pagination 6, asset-register-building-blocks-ui 4, asset-register-table-ui 17, maintenance-pagination-ui 3, disposal-route-structure 18, form-migration-guards 23.

- [ ] **Step 7: Prove the new classes compile**

Run from the repo root: `node <temp>/p2b1-tw-probe.mjs src/components/ui/pagination.tsx`
Expected: `checked 35 classes, missing 0` (exit 0). With `SHOW='md:min-h-6.5,md:min-w-8'` it prints `@media (width >= 48rem) { min-height: calc(var(--spacing) * 6.5) }` and `{ min-width: calc(var(--spacing) * 8) }` (the 32px frame from `md`). The `outline sm` button classes come from `buttonVariants` and compile already.

- [ ] **Step 8: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, and 8 more tests than before Step 2 (2 in `list-primitives-ui`, 6 in `list-pagination`): 1855 tests, 1854 pass, 1 skipped.
- `npx tsc --noEmit`: no errors (the register's `Pagination` call compiles unchanged).
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- `git diff --stat` shows 4 files: `pagination.tsx` 62 insertions and 30 deletions, `messages/th.json` and `messages/en.json` 3 insertions and 1 deletion each, `tests/list-primitives-ui.test.ts` 39 insertions.
- `git status` also lists `?? src/lib/list-pagination.ts` (56 lines) and `?? tests/list-pagination.test.ts` (56 lines).
- Leave the new files LF. A file that shows every line changed was normalized: restore its line endings before you commit.

- [ ] **Step 9: Commit**

```bash
git add src/components/ui/pagination.tsx src/lib/list-pagination.ts tests/list-pagination.test.ts messages/th.json messages/en.json tests/list-primitives-ui.test.ts
git commit -m "feat(ui): Pagination with the range and page sizes, and the list page helpers (2B-1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 6 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the plan 2B-1 dev-app check (Task 25):**
- `/th/assets` at 1440 and 375: "หน้า x จาก y" sits left of the buttons; the buttons have no arrows, 32px on desktop and 44 on the phone; on page 1 "ก่อนหน้า" has the disabled look and Tab skips it.
- With NVDA (left for the human check before the one deploy): moving to the next page reads the new page line once (`aria-live="polite"`).
- The page sizes, the range and the redirect past the last page are checked on the master-data lists (Tasks 13–21) and `/th/master-data/departments` (Task 17).

---

### Task 6: Filter primitives · `ui/filter-select.tsx`, `ui/filter-chips.tsx` and `FilterFormActions` in `ui/filter-panel.tsx`

Spec §10.3 row 6, with §3.9, §3.10, §6.3.1–§6.3.3, §6.13 table B items 1–3, I6, I7 and I16. Three filter primitives, one commit. No page uses them yet: the first caller is Task 13 (branches). The two new files are LF like every 2A/2C primitive; `ui/filter-panel.tsx` is LF too.

Rulings this task applies:
- **I6:** `FilterSelect` has the API of §6.3.1 exactly: `label: string`, `options?`, `allLabel?`, `fieldSize?` (default `"lg"`, written as the parameter default `fieldSize = "lg"`), `hideLabel?`, `labelAction?`, and `className` on the `Field` wrapper. Every other prop (`name`, `defaultValue`, `value`, `onChange`, `id`) goes to `NativeSelect`. Options render as `allLabel` → `options` → `children`. It has no `data-slot` of its own (`Field` and `NativeSelect` bring theirs).
- **I7:** the chip file is `ui/filter-chips.tsx` (not `filter-chip-list.tsx`). It exports `FilterChipList` and the type `FilterChipItem`; `FilterChip` already names functions in the two approvals pages. Props and markup follow §6.3.3. The chip ring is `focus-visible:ring-ring focus-visible:ring-offset-2`, like a button's. Each chip's name is `` `${removeLabel}: ${chip.label}` ``, so callers that pass their existing key keep today's spoken name.
- **§6.3.2:** `FilterFormActions` goes into `ui/filter-panel.tsx`, and `FilterPanel` keeps its API. Both buttons are `size="lg"`, written out, because phase 2D moves the default size to 36px and these sit next to 40px fields. There is no `busy`, because a GET form changes the page by itself.
- **I16:** the strings of `FilterSelect` and `FilterChipList` (items 1 and 3) go into `tests/list-primitives-ui.test.ts`. `FilterFormActions` (item 2) goes into a new `tests/list-filters-ui.test.ts`, which Task 13 extends with items 5–6.
- **Ruling (spec gap), the shared rule check:** §3.21 table C row 1 requires every 2B primitive file to be server-safe and free of the retired classes. This task declares `assertListPrimitiveRules(path, source)` once, at the end of `tests/list-primitives-ui.test.ts`, and Tasks 8–11 call it. It is a function declaration, so it is hoisted for any test in the file.
- **Ruling:** `FilterChipList` returns `null` when there are no chips (§6.3.3: "ไม่มีชิป = null"). `FilterSelectProps`, `FilterChipListProps` and `FilterFormActionsProps` stay local types, as §6.3.1 writes `type FilterSelectProps`.

What users will see: nothing yet. No page renders these primitives until Task 13.

Not in this task:
- any page (Tasks 13–21, 2B-2 to 2B-5)
- the register selects (`LabeledSelect`, the toolbar; 2B-3, I6) and `ReportSelect` (2B-5)
- messages: no key changes, so no `messages-edit.mjs` run (§10.2: 2B-1 adds keys only in Tasks 4, 5 and 7)
- docs (Task 26)
- guard budgets: the new files count 0 in every LFG counter of §9.3.1 and in VFG R1/R2/R7, so no row changes.

Do not run a formatter.

**Files:**
- Create: `src/components/ui/filter-select.tsx` (LF)
- Create: `src/components/ui/filter-chips.tsx` (LF)
- Modify: `src/components/ui/filter-panel.tsx` (LF, 2 replacements)
- Create: `tests/list-filters-ui.test.ts` (LF)
- Modify: `tests/list-primitives-ui.test.ts` (LF, one block appended)
- Temp folder only, never committed: `p2b1-ui-precheck.mjs` and `p2b1-append.mjs` (Tasks 8–12 reuse both), `task06-block.ts`

**Must keep passing without edits:**
- `tests/field-primitives.test.ts` (16 tests): `Field`, `NativeSelect` and `SearchField` are not touched.
- `tests/reports-adaptive-ui.test.ts` (14 tests): `report-filter-panel.tsx`, the one caller of `FilterPanel`, renders as before.
- `tests/form-migration-guards.test.ts` (23 tests, never edited): GD4 sees no `flex-col-reverse` in `ui/`.
- `tests/visual-foundation-guards.test.ts`, `tests/list-frame-guards.test.ts`, `tests/class-merge.test.ts`.

**Interfaces:**
- Consumes:
  - 2A: `Field` (`label`, `hideLabel`, `labelAction`, `className`; one element child) from `@/components/ui/field`, `NativeSelect` (`fieldSize`) from `@/components/ui/native-select`, `type FieldSize` from `@/components/ui/field-variants`, `linkVariants` from `@/components/ui/button-variants`, `Button` and `buttonVariants` from `@/components/ui/button`.
  - Task 1: `tests/list-frame-guards.test.ts` exists.
  - Task 3: `tests/list-primitives-ui.test.ts` exists. It is LF and imports `assert` (default, `node:assert/strict`), `readFileSync` (`node:fs`) and `test` (default, `node:test`). It does not declare `assertListPrimitiveRules`.
- Produces (Tasks 8–21 and plans 2B-2 to 2B-5 rely on these):
  - `src/components/ui/filter-select.tsx`: `export type FilterSelectOption = { value: string; label: string }` and `export function FilterSelect(props: Omit<React.ComponentProps<"select">, "size" | "multiple" | "className"> & { label: string; options?: readonly FilterSelectOption[]; allLabel?: string; fieldSize?: FieldSize; hideLabel?: boolean; labelAction?: React.ReactNode; className?: string })`.
  - `src/components/ui/filter-chips.tsx`: `export type FilterChipItem = { key: string; label: string; href: string; mobileOnly?: boolean }` and `export function FilterChipList(props: { chips: readonly FilterChipItem[]; label: string; removeLabel: string; clearAll?: { href: string; label: string }; className?: string }): JSX.Element | null`.
  - `src/components/ui/filter-panel.tsx`: `export function FilterFormActions(props: { submitLabel: string; clear?: { href: string; label: string }; className?: string })`, next to the unchanged `FilterPanel`.
  - `tests/list-filters-ui.test.ts`: LF, the three imports and `const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")`, then 1 test. Task 13 appends `MIGRATED_FILTER_FILES` and items 5–6 to it.
  - `tests/list-primitives-ui.test.ts`: `function assertListPrimitiveRules(path: string, source: string): void`, plus 2 tests whose titles start with `FilterSelect ` and `FilterChipList `.
  - `p2b1-ui-precheck.mjs` and `p2b1-append.mjs` in the temp folder.

New classes (none of them in `src/` at HEAD): `group-hover/chip:bg-primary-border` and `md:flex-none`. Every class of this task compiles: the drafter ran Tailwind's own scanner and `compile` from `@tailwindcss/node` over the new files against `src/app/globals.css` in a scratch copy. No token is added.

- [ ] **Step 1: Check what this task builds on**

Save this script as `p2b1-ui-precheck.mjs` in your temp folder (never in the repo). Tasks 8–12 run the same script with their own task number:

```js
// p2b1-ui-precheck.mjs: run from the repo root before plan 2B-1 Task 6, 8, 9, 10, 11 or 12. Usage: node p2b1-ui-precheck.mjs <task>
// Confirms what the task builds on, and that the files it edits still hold the text the plan quotes. Reads only;
// writes nothing. Never commit this file.
import { existsSync, readFileSync } from "node:fs"

const task = process.argv[2]
const raw = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "")
const read = (path) => raw(path).replace(/\r\n/g, "\n")
const eol = (path) => {
  const source = raw(path)
  const crlf = (source.match(/\r\n/g) ?? []).length
  const lf = (source.match(/\n/g) ?? []).length
  return lf === 0 ? "none" : crlf === lf ? "CRLF" : crlf === 0 ? "LF" : "mixed"
}
const ui = (name) => `src/components/ui/${name}`
const LAYOUT = "src/components/master-data/master-data-layout.tsx"
const PRIMITIVES_TEST = "tests/list-primitives-ui.test.ts"
const primitivesTest = raw(PRIMITIVES_TEST)
const helperDeclared = /^function assertListPrimitiveRules\(/m.test(primitivesTest)
const absent = (path) => ({ [`${path} is not there yet`]: !existsSync(path) })
const helper = { "Task 6 declared assertListPrimitiveRules in tests/list-primitives-ui.test.ts": helperDeclared }

const common = {
  "Task 1: tests/list-frame-guards.test.ts exists": existsSync("tests/list-frame-guards.test.ts"),
  [`Task 3: ${PRIMITIVES_TEST} is LF and imports assert, readFileSync and test`]:
    eol(PRIMITIVES_TEST) === "LF" &&
    /^import assert from "node:assert\/strict"$/m.test(primitivesTest) &&
    /^import \{[^}]*\breadFileSync\b[^}]*\} from "node:fs"$/m.test(primitivesTest) &&
    /^import test from "node:test"$/m.test(primitivesTest),
}

const byTask = {
  6: {
    "assertListPrimitiveRules is not declared yet": primitivesTest !== "" && !helperDeclared,
    ...absent("tests/list-filters-ui.test.ts"),
    ...absent(ui("filter-select.tsx")),
    ...absent(ui("filter-chips.tsx")),
    "ui/filter-panel.tsx is LF, has no FilterFormActions, and holds the quoted imports and closing lines":
      eol(ui("filter-panel.tsx")) === "LF" &&
      !read(ui("filter-panel.tsx")).includes("FilterFormActions") &&
      read(ui("filter-panel.tsx")).startsWith('import type React from "react"\nimport { cn } from "@/lib/utils"\nimport { getPanelClasses } from "@/lib/design-system"\n') &&
      read(ui("filter-panel.tsx")).endsWith('      <div className="min-w-0 max-w-full">{children}</div>\n    </section>\n  )\n}\n'),
    "2A Field takes hideLabel and labelAction": /hideLabel\?: boolean/.test(read(ui("field.tsx"))) && /labelAction\?: React\.ReactNode/.test(read(ui("field.tsx"))),
    "2A NativeSelect takes fieldSize": /\{ fieldSize\?: FieldSize \}/.test(read(ui("native-select.tsx"))),
    "2A linkVariants and Button/buttonVariants": /export const linkVariants = cva\(/.test(read(ui("button-variants.ts"))) && /export \{ Button, buttonVariants \}/.test(read(ui("button.tsx"))),
  },
  8: {
    ...helper,
    ...absent(ui("tab-nav.tsx")),
    "Next 16.4 Link has onNavigate and scroll": /"version": "16\.4\./.test(read("node_modules/next/package.json")) && /onNavigate\?: OnNavigateEventHandler/.test(read("node_modules/next/dist/client/app-dir/link.d.ts")) && /scroll\?: boolean/.test(read("node_modules/next/dist/client/app-dir/link.d.ts")),
  },
  9: {
    ...helper,
    ...absent(ui("stat-strip.tsx")),
    "toneIcons.warning is TriangleAlert": /warning: TriangleAlert,/.test(read(ui("tone-icons.ts"))),
  },
  10: {
    ...helper,
    ...absent(ui("key-value-list.tsx")),
    "orNil(value, label) from ui/nil.tsx": /export function orNil\(value: ReactNode, label\?: string\): ReactNode/.test(read(ui("nil.tsx"))),
  },
  11: {
    ...helper,
    "ui/content-panel.tsx is LF, has no divided yet, and holds the two quoted snippets":
      eol(ui("content-panel.tsx")) === "LF" &&
      !read(ui("content-panel.tsx")).includes("divided") &&
      read(ui("content-panel.tsx")).includes("  className?: string\n}\n\nexport function ContentPanel({ title, description, actions, children, className }: ContentPanelProps) {\n  return (\n") &&
      read(ui("content-panel.tsx")).endsWith('      <div className="min-w-0 max-w-full">{children}</div>\n    </section>\n  )\n}\n'),
  },
  12: {
    ...helper,
    [`${LAYOUT} is CRLF`]: eol(LAYOUT) === "CRLF",
    "Task 3: MasterDataHeader is a PageHeader wrapper and the three quoted import lines are there":
      read(LAYOUT).includes("<PageHeader") &&
      read(LAYOUT).includes('import { ArrowDown, ArrowUp, Plus, Search } from "lucide-react"\nimport { buttonVariants } from "@/components/ui/button"\nimport { PageHeader } from "@/components/ui/page-header"\n'),
    "MasterDataSearch still renders the quoted card, raw input and raw button":
      read(LAYOUT).includes('    <div className="mb-4 rounded-lg border border-border bg-surface p-4">\n      <form className="flex flex-col gap-3 sm:flex-row" action={action}>\n') &&
      read(LAYOUT).includes('          className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"\n        >\n          {submitLabel}\n        </button>\n      </form>\n    </div>\n  )\n}\n'),
    "2A SearchField takes fieldSize and passes aria-label to its Input": /fieldSize\?: FieldSize/.test(read(ui("search-field.tsx"))) && /export \{ SearchField \}/.test(read(ui("search-field.tsx"))),
    "MasterDataSearch has its 6 callers": (() => {
      const pages = ["admin/users", "audit/findings", "audit/rounds", "audit/rounds/[id]", "audit/rounds/[id]/pending", "master-data/departments"]
      return pages.every((page) => read(`src/app/[locale]/(dashboard)/${page}/page.tsx`).includes("<MasterDataSearch"))
    })(),
  },
}

if (!byTask[task]) {
  console.error(`usage: node p2b1-ui-precheck.mjs <one of: ${Object.keys(byTask).join(", ")}>`)
  process.exit(2)
}
let missing = 0
for (const [name, ok] of Object.entries({ ...common, ...byTask[task] })) {
  console.log(`${ok ? "ok     " : "MISSING"} ${name}`)
  if (!ok) missing += 1
}
if (missing > 0) {
  console.error(`ABORT: ${missing} precondition(s) failed. Do not start Task ${task}; report which.`)
  process.exit(1)
}
console.log(`preconditions hold for Task ${task}`)
```

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2b`

Run: `git status --short src tests messages` then `node <temp>/p2b1-ui-precheck.mjs 6`
Expected: `git status` prints nothing. The script prints:
```
ok      Task 1: tests/list-frame-guards.test.ts exists
ok      Task 3: tests/list-primitives-ui.test.ts is LF and imports assert, readFileSync and test
ok      assertListPrimitiveRules is not declared yet
ok      tests/list-filters-ui.test.ts is not there yet
ok      src/components/ui/filter-select.tsx is not there yet
ok      src/components/ui/filter-chips.tsx is not there yet
ok      ui/filter-panel.tsx is LF, has no FilterFormActions, and holds the quoted imports and closing lines
ok      2A Field takes hideLabel and labelAction
ok      2A NativeSelect takes fieldSize
ok      2A linkVariants and Button/buttonVariants
preconditions hold for Task 6
```
On any `MISSING` line, stop and report it.

Run: `git ls-files --eol src/components/ui/filter-panel.tsx tests/list-primitives-ui.test.ts`
Expected: `w/lf` for both. Keep them LF.

- [ ] **Step 2: Save the append script**

Tasks 6 and 8–12 each add one block to the end of `tests/list-primitives-ui.test.ts`. The script refuses a CRLF file, puts exactly one blank line before the block, and leaves one line break at the end. Save it as `p2b1-append.mjs` in your temp folder (never in the repo):

```js
// p2b1-append.mjs: run from the repo root. Usage: node p2b1-append.mjs <block file> <test file>
// Appends the block after one blank line, keeps the file LF and ends it with one line break. Never commit this file.
import { readFileSync, writeFileSync } from "node:fs"

const [block, target] = process.argv.slice(2)
const current = readFileSync(target, "utf8")
if (current.includes("\r\n")) throw new Error(`${target} is not LF: stop and report`)
writeFileSync(target, current.replace(/\n*$/, "\n\n") + readFileSync(block, "utf8").replace(/\n*$/, "\n"))
console.log(`appended ${block} to ${target}`)
```

- [ ] **Step 3: Write the failing tests**

(a) Create `tests/list-filters-ui.test.ts` with this content, LF line endings:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Phase 2B (spec 2B §6.13 table B): how list pages use the shared filters. The strings of the filter primitives live
// in tests/list-primitives-ui.test.ts (I16); the "none left" guards live in tests/list-frame-guards.test.ts (I15, I34).
// Item 2 lands with FilterFormActions (2B-1 Task 6). Items 5 and 6 come with the first page that moves (Task 13).
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("FilterFormActions submits at 40px and offers clear filters as an outline link (2B §6.3.2, item 2)", () => {
  const panel = read("src/components/ui/filter-panel.tsx")
  assert.match(panel, /export function FilterFormActions\(\{ submitLabel, clear, className \}: FilterFormActionsProps\)/)
  assert.match(panel, /clear\?: \{ href: string; label: string \}/)
  assert.match(panel, /<div data-slot="filter-form-actions" className=\{cn\("flex items-end gap-2", className\)\}>/)
  assert.match(panel, /<Button type="submit" size="lg" className="flex-1 md:flex-none">\{submitLabel\}<\/Button>/)
  assert.match(panel, /\{clear \? \(\s*<Link href=\{clear\.href\} className=\{cn\(buttonVariants\(\{ variant: "outline", size: "lg" \}\), "flex-1 md:flex-none"\)\}>/)
  assert.doesNotMatch(panel, /"use client"|\bbusy\b/, "a GET form changes the page itself, so the panel stays server-safe and has no busy state")
  assert.match(panel, /export function FilterPanel\(\{ title, description, children, className \}: FilterPanelProps\)/, "FilterPanel keeps its API")
})
```

(b) Save this block as `task06-block.ts` in your temp folder:

```ts
// Spec 2B §3.2 and §3.21 table C row 1, for the primitive files the blocks below read: server-safe (no client
// directive, no state or context hook) and none of the classes the 2A guards retire. Declared once (Task 6).
function assertListPrimitiveRules(path: string, source: string) {
  for (const pattern of [/"use client"/, /\buseState\b/, /\buseEffect\b/, /\bcreateContext\b/, /\buseContext\b/]) {
    assert.doesNotMatch(source, pattern, `${path} must stay server-safe`)
  }
  for (const pattern of [/\bshadow-(?:sm|md|lg|xl|2xl)\b/, /opacity-/, /\bleading-tight\b/, /\bleading-4\b/, /rounded-\[/, /\bflex-col-reverse\b/, /\buppercase\b/, /bg-muted\//]) {
    assert.doesNotMatch(source, pattern, `${path} uses a retired class`)
  }
}

test("FilterSelect is a Field around NativeSelect, 40px by default, with an optional all option (2B §6.3.1, I6)", () => {
  const path = "src/components/ui/filter-select.tsx"
  const source = readFileSync(path, "utf8").replace(/\r\n/g, "\n")
  assertListPrimitiveRules(path, source)
  assert.match(source, /import \{ Field \} from "@\/components\/ui\/field"/)
  assert.match(source, /import \{ NativeSelect \} from "@\/components\/ui\/native-select"/)
  assert.match(source, /export type FilterSelectOption = \{ value: string; label: string \}/)
  assert.match(source, /type FilterSelectProps = Omit<React\.ComponentProps<"select">, "size" \| "multiple" \| "className"> & \{/)
  assert.match(source, /export function FilterSelect\(\{ label, options, allLabel, fieldSize = "lg", hideLabel, labelAction, className, children, \.\.\.selectProps \}: FilterSelectProps\)/)
  assert.match(source, /<Field label=\{label\} hideLabel=\{hideLabel\} labelAction=\{labelAction\} className=\{className\}>/)
  assert.match(source, /<NativeSelect fieldSize=\{fieldSize\} \{\.\.\.selectProps\}>/)
  assert.match(source, /\{allLabel \? <option value="">\{allLabel\}<\/option> : null\}/)
  const order = ["{allLabel ?", "{options?.map(", "{children}"].map((text) => source.indexOf(text))
  assert.ok(order[0] !== -1 && order[0] < order[1] && order[1] < order[2], "options render as allLabel, then options, then children")
  assert.doesNotMatch(source, /<select\b|<label\b|data-slot=/, "no raw select or label, and no data-slot of its own: Field and NativeSelect bring theirs")
})

test("FilterChipList makes each chip one remove link named by what it removes, 36px from md (2B §6.3.3, I7)", () => {
  const path = "src/components/ui/filter-chips.tsx"
  const source = readFileSync(path, "utf8").replace(/\r\n/g, "\n")
  assertListPrimitiveRules(path, source)
  assert.match(source, /export type FilterChipItem = \{ key: string; label: string; href: string; mobileOnly\?: boolean \}/)
  assert.match(source, /export function FilterChipList\(\{ chips, label, removeLabel, clearAll, className \}: FilterChipListProps\)/)
  assert.match(source, /if \(chips\.length === 0\) return null/)
  assert.match(source, /<div role="group" aria-label=\{label\} data-slot="filter-chips" className=\{cn\("flex min-w-0 flex-wrap items-center gap-2", chips\.every\(\(chip\) => chip\.mobileOnly\) && "md:hidden", className\)\}>/)
  assert.match(source, /aria-label=\{`\$\{removeLabel\}: \$\{chip\.label\}`\}/)
  assert.equal(
    source.match(/className=\{cn\("(group\/chip [^"]+)", chip\.mobileOnly && "md:hidden"\)\}/)?.[1],
    "group/chip inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-md border border-primary-border bg-primary-soft pl-3 pr-1 text-meta text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-9 md:min-h-0",
  )
  assert.match(source, /<span aria-hidden="true" className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm transition-colors motion-reduce:transition-none group-hover\/chip:bg-primary-border">/)
  assert.match(source, /<Link href=\{clearAll\.href\} className=\{cn\(linkVariants\(\), "inline-flex min-h-11 items-center md:min-h-0"\)\}>/)
  assert.doesNotMatch(source, /rounded-full/)
})
```

Run: `node <temp>/p2b1-append.mjs <temp>/task06-block.ts tests/list-primitives-ui.test.ts`
Expected: `appended <temp>/task06-block.ts to tests/list-primitives-ui.test.ts`

Run: `node --test --test-name-pattern="^(FilterSelect|FilterChipList|FilterFormActions) " tests/list-primitives-ui.test.ts tests/list-filters-ui.test.ts`
Expected: FAIL, `tests 3 · pass 0 · fail 3`:
- `FilterSelect is a Field around NativeSelect …`: `Error: ENOENT: no such file or directory, open '…\src\components\ui\filter-select.tsx'`
- `FilterChipList makes each chip one remove link …`: `Error: ENOENT: … '…\src\components\ui\filter-chips.tsx'`
- `FilterFormActions submits at 40px …`: `AssertionError … did not match the regular expression /export function FilterFormActions\(\{ submitLabel, clear, className \}: FilterFormActionsProps\)/`

Run: `node --test tests/list-primitives-ui.test.ts`
Expected: `fail 2`, and only the two tests above fail. The tests of Tasks 3–5 still pass.

- [ ] **Step 4: Create `src/components/ui/filter-select.tsx`**

Create the file with this content, LF line endings:

```tsx
import type React from "react"
import { Field } from "@/components/ui/field"
import type { FieldSize } from "@/components/ui/field-variants"
import { NativeSelect } from "@/components/ui/native-select"

export type FilterSelectOption = { value: string; label: string }

type FilterSelectProps = Omit<React.ComponentProps<"select">, "size" | "multiple" | "className"> & {
  // The visible label (13/20 500, like every Field), or a screen-reader label with hideLabel.
  label: string
  options?: readonly FilterSelectOption[]
  // Puts <option value=""> first, for "all".
  allLabel?: string
  // lg (40px) for a filter panel with visible labels; a toolbar passes md (36px). Below md both are 44px.
  fieldSize?: FieldSize
  // Toolbars: the label is sr-only and the first option shows the name instead.
  hideLabel?: boolean
  // One help button beside the label (AssetStateHelpPopover on the register).
  labelAction?: React.ReactNode
  // On the Field wrapper, for layout only (col-span, width). Change the height through fieldSize.
  className?: string
}

// A list filter: Field (label and id through useId) around NativeSelect. Server-safe: no directive and no hook of its
// own. Works uncontrolled (name + defaultValue in a GET form) or controlled (value + onChange from a client component).
// Options render in this order: allLabel, options, children. Never use it in place of SearchableSelect.
export function FilterSelect({ label, options, allLabel, fieldSize = "lg", hideLabel, labelAction, className, children, ...selectProps }: FilterSelectProps) {
  return (
    <Field label={label} hideLabel={hideLabel} labelAction={labelAction} className={className}>
      <NativeSelect fieldSize={fieldSize} {...selectProps}>
        {allLabel ? <option value="">{allLabel}</option> : null}
        {options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {children}
      </NativeSelect>
    </Field>
  )
}
```

- [ ] **Step 5: Create `src/components/ui/filter-chips.tsx`**

Create the file with this content, LF line endings:

```tsx
import Link from "next/link"
import { X } from "lucide-react"
import { linkVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

// href is the current URL without this filter. mobileOnly hides the chip from md (the register's scope chips, which
// the toolbar selects already show on desktop).
export type FilterChipItem = { key: string; label: string; href: string; mobileOnly?: boolean }

type FilterChipListProps = {
  chips: readonly FilterChipItem[]
  // The name of the group, for example "ตัวกรองที่ใช้อยู่".
  label: string
  // Starts each chip's name: `${removeLabel}: ${chip.label}`, so screen readers hear what a click removes.
  removeLabel: string
  // A "clear all" link after the chips (the register).
  clearAll?: { href: string; label: string }
  className?: string
}

// Mockup .toolbar .chip: 36px from md like its toolbar neighbours, 8px corners, primary-soft fill. The whole chip is
// one remove link (44px on phones), because a server page cannot pass a handler and a 24px x alone is too small to
// tap; the x is a picture. Server-safe. No chips, no group.
export function FilterChipList({ chips, label, removeLabel, clearAll, className }: FilterChipListProps) {
  if (chips.length === 0) return null

  return (
    <div role="group" aria-label={label} data-slot="filter-chips" className={cn("flex min-w-0 flex-wrap items-center gap-2", chips.every((chip) => chip.mobileOnly) && "md:hidden", className)}>
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          aria-label={`${removeLabel}: ${chip.label}`}
          className={cn("group/chip inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-md border border-primary-border bg-primary-soft pl-3 pr-1 text-meta text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-9 md:min-h-0", chip.mobileOnly && "md:hidden")}
        >
          <span className="min-w-0 truncate">{chip.label}</span>
          <span aria-hidden="true" className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm transition-colors motion-reduce:transition-none group-hover/chip:bg-primary-border">
            <X className="size-3" />
          </span>
        </Link>
      ))}
      {clearAll ? (
        <Link href={clearAll.href} className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}>
          {clearAll.label}
        </Link>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 6: Add `FilterFormActions` to `src/components/ui/filter-panel.tsx`**

Two exact replacements. `FilterPanel` itself does not change.

(1) Imports.

Replace:

```tsx
import type React from "react"
import { cn } from "@/lib/utils"
```

with:

```tsx
import type React from "react"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
```

(2) The end of `FilterPanel`, followed by the new part. The file keeps one line break at its end.

Replace:

```tsx
      <div className="min-w-0 max-w-full">{children}</div>
    </section>
  )
}
```

with:

```tsx
      <div className="min-w-0 max-w-full">{children}</div>
    </section>
  )
}

type FilterFormActionsProps = {
  // "กรอง" / "ใช้ตัวกรอง"
  submitLabel: string
  // Pass it only while a filter is active (hasActiveFilters); the link goes to the list without filters.
  clear?: { href: string; label: string }
  // Layout in the filter grid (col-span).
  className?: string
}

// The submit button and the "clear filters" link of a GET filter form. size="lg" is written out: the buttons sit in
// one row with 40px fields, and phase 2D moves the default size to 36px. items-end lines them up with the bottom of
// the fields in a grid cell that has labels on top. Phones: one button fills the row, two share it. Server-safe.
export function FilterFormActions({ submitLabel, clear, className }: FilterFormActionsProps) {
  return (
    <div data-slot="filter-form-actions" className={cn("flex items-end gap-2", className)}>
      <Button type="submit" size="lg" className="flex-1 md:flex-none">{submitLabel}</Button>
      {clear ? (
        <Link href={clear.href} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "flex-1 md:flex-none")}>
          {clear.label}
        </Link>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 7: Run the tests for this task**

Run: `node --test --test-name-pattern="^(FilterSelect|FilterChipList|FilterFormActions) " tests/list-primitives-ui.test.ts tests/list-filters-ui.test.ts`
Expected: PASS, `tests 3 · pass 3 · fail 0`.

Run: `node --test tests/list-primitives-ui.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/field-primitives.test.ts tests/reports-adaptive-ui.test.ts tests/class-merge.test.ts`
Expected: PASS, `fail 0`. LFG holds with no budget change: both new files count 0 in every counter, because `ui/` files are skipped by LF1/LS1/LK1/LN2 and match none of the others.

- [ ] **Step 8: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, and 3 more tests than before Step 3.
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- `git diff --stat` shows exactly 2 files: `src/components/ui/filter-panel.tsx` with 27 insertions and 0 deletions, and `tests/list-primitives-ui.test.ts` with 46 insertions and 0 deletions.
- `git status` also lists `?? src/components/ui/filter-chips.tsx` (49 lines), `?? src/components/ui/filter-select.tsx` (41 lines) and `?? tests/list-filters-ui.test.ts` (19 lines).
- Git may warn that LF will be replaced by CRLF. Leave the files LF.
- A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).

- [ ] **Step 9: Commit**

```bash
git add src/components/ui/filter-select.tsx src/components/ui/filter-chips.tsx src/components/ui/filter-panel.tsx tests/list-primitives-ui.test.ts tests/list-filters-ui.test.ts
git commit -m "feat(ui): FilterSelect, FilterChipList and FilterFormActions for list filters (2B plan 1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 5 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the plan 2B-1 dev-app check (Task 25):** nothing on its own. The filter panel rows of §10.5 (labels 40px, 44 on phones, "ล้างตัวกรอง" only while a filter is on) are checked on the pages of Tasks 13–21.

---

### Task 7: `ui/row-actions.tsx` · `RowActions` ช1 (and the two menu row class strings it shares)

Spec §10.3 row 7, with §3.11 (API, markup, behavior, a11y), I5 (one data-only API), I33 (the ⋯ name), §3.18 rulings 17–20, §3.21 table C row `tests/row-actions-ui.test.ts`, the §10.2 message row "2B-1 · 7", and the 2B-3 pins of §7.17 that later move to this file. One commit. This task adds the primitive only; no page calls it yet (Tasks 13–21 are the first callers).

Rulings this task applies:
- **I5:** one API for every caller. Props are data: `code`, `name?`, `menuLabel`, `next?`, `groups`, `deleteAction?`, `openerRef?`, `menu?`, `className?`. No `children`, no `triggerRef` prop (the ⋯ ref is internal), no `contentClassName`; the menu panel keeps the default `min-w-60`. Delete and focus return live inside the primitive: `useDeleteAction(endpoint, { returnFocusRef: triggerRef })`, the same hook and confirm as `MasterDataDeleteButton` (B5).
- **§3.11 markup verbatim:** `rowNextClasses`, the empty 120px slot, the ⋯ `Button ref={triggerRef} variant="ghost" size="icon-sm"` inside `DropdownMenuTrigger asChild` or `SheetTrigger asChild`, `DropdownMenu modal={false}`, the sheet `max-h-[85dvh] gap-0 rounded-t-lg` with the code as a `tag font-medium` title (R-p), group labels and `border-soft` dividers, and sheet rows on the exported `menuItemClasses` (ruling 20).
- **I33:** `menuLabel` is `common.moreActionsFor` (new key in this task), worded like the register's `asset.rowActionsMenu`.
- **Ruling (lint), `openFromNext`:** §3.11 writes `openerRef.current = event.currentTarget` inline in the next button's `onClick`. The repo's `react-hooks/refs` rule (eslint-config-next 16) reports that as an error ("Cannot access refs during render"), because the handler is built inside a render helper. The assignment moves into the handler function `openFromNext(button, select)`; the behavior is the same.
- **Ruling (spec gap), focus when a dialog opens from the sheet:** §3.11 sets `onCloseAutoFocus` on the menu only. The sheet closes before an `action` item runs (`setSheetOpen(false)` first), so without the same guard its close would move focus to ⋯ underneath the caller's dialog. Both `DropdownMenuContent` and `SheetContent` get `onCloseAutoFocus={keepDialogFocus}`.
- **Ruling (spec gap), the sheet's scrim:** React sends portal events up the component tree to the row's `onClick`. `ClickableTableRow` skips targets inside `[data-no-row-click]`, which covers the wrapper, the menu content and the sheet content, but not the sheet overlay. Radix dismisses a touch on the scrim at `click`, so the same click would reach the row and open its edit page. The wrapper gets `onClick={stopPortalClick}`, which stops only clicks whose target is outside the wrapper's own DOM (that is, from a portal). The 3 `data-no-row-click` marks of §3.11 stay.
- **Ruling (spec gap), small cases:** the separator before "ลบ" shows only when a group comes before it (the brands panel passes only `next` and `deleteAction`); an empty group is skipped; without `name` the sheet drops `aria-describedby` so Radix does not warn about a missing description (the pattern of `ui/accessible-dialog.tsx:63`).
- **Ruling, an unavailable row in the sheet:** it stays `<div aria-disabled="true">` as §3.11 writes it (like the register's sheet today): it reads its name and reason in reading order and is not in the Tab order. In the dropdown it stays focusable through `DropdownMenuItem unavailable` (DS:415).
- **I16, the class rules:** the §3.2 forbidden-class check for `row-actions.tsx` (spec §3.21 lists it with the `list-primitives-ui` files) lives in `tests/row-actions-ui.test.ts`, the owner of this primitive's strings. This task does not edit `tests/list-primitives-ui.test.ts`.

What users will see: nothing yet. The first callers (Tasks 13–21) show "แก้ไข" 120px + ⋯ on desktop, a bottom sheet with 44px rows on phones, and "ลบ" inside ⋯ with the same confirm as today.

Not in this task:
- any caller (Tasks 13–21), the register wrapper `asset-register-row-actions.tsx` (2B-3), disposal and pending rows (2B-2)
- the chrome of `ui/sheet.tsx` (2C fence), `master-data-delete-button.tsx` (kept without callers until 2D)
- docs (Task 26)
- LFG and VFG rows: the new file has none of the counted patterns, and `MIGRATED_LIST_FILES` lists pages, not primitives
- no formatter run

**Files:**
- Create: `src/components/ui/row-actions.tsx` (LF, 302 lines)
- Modify: `src/components/ui/dropdown-menu.tsx` (CRLF, 2 exact replacements)
- Modify: `messages/th.json`, `messages/en.json` (CRLF, through `scripts/messages-edit.mjs` only)
- Create: `tests/row-actions-ui.test.ts` (LF, 8 tests, 117 lines)
- Temp folder only, never committed: `p2b1-task07-precheck.mjs`, `p2b1-task07-messages.json`, `p2b1-task07-tw-probe.mjs`

**Must keep passing without edits:**
- `tests/menu-primitives-ui.test.ts` (10 tests): `classesOf` looks for `const menuItemClasses =`, which still matches inside `export const menuItemClasses =`; `:100` (`cn(menuItemClasses, menuItemDestructiveClasses, className)` in `DropdownMenuItem`) is untouched.
- `tests/dropdown-menus-ui.test.ts` (6) and `tests/asset-register-table-ui.test.ts` (17): they read `asset-register-row-actions.tsx`, which this task does not touch (2B-3 moves their row-menu regexes to `ui/row-actions.tsx`; this file already matches them).
- `tests/dialog-trigger-handles.test.ts` (5) and `tests/confirm-dialog-ui.test.ts:36` (no P0 file and no `MasterDataDeleteButton` change).
- `tests/form-migration-guards.test.ts` (never edited): GD1 (no `closeLabel=` on the sheet), GD4 (no `flex-col-reverse` in `ui/`), GB4.
- `tests/visual-foundation-guards.test.ts` (single ring token; `tag` with `font-medium` only; R1, R7, R2 at 0 for the new file), `tests/list-frame-guards.test.ts`, `tests/ui-overlay-guards.test.ts` (no `createPortal`, no `fixed inset-0`), `tests/class-merge.test.ts`, `tests/thai-glossary.test.ts`, `tests/messages-parity.test.ts`.

**Interfaces:**
- Consumes:
  - Task 4: `dataTableRowClasses` starts with `group/row`, and `ClickableTableRow` uses `cn(dataTableRowClasses, …)`. The next button's `group-hover/row:`, `group-focus-within/row:` and `group-has-[[aria-expanded=true]]/row:` fills hang on that group. `ClickableTableRow` still skips targets inside `a,button,input,select,textarea,[data-no-row-click]` (`ui/clickable-table-row.tsx:27`).
  - Task 1: `tests/list-frame-guards.test.ts` exists (this task changes none of its rows).
  - Existing: `Button` (`@/components/ui/button`; `variant="ghost"`, `size="icon-sm"` = 44px below `md`, 32px from `md`; `ref` passes as a prop in React 19, as `assets/asset-detail-action-menu.tsx:55` does) · `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` (`variant`, `unavailable`, `asChild`), `DropdownMenuItemText`, `DropdownMenuItemDescription`, `DropdownMenuLabel`, `DropdownMenuSeparator` · `Sheet`, `SheetTrigger`, `SheetContent` (`side="bottom"` adds the home-bar padding; it draws the "ปิด" X), `SheetHeader` (`pr-16`), `SheetTitle`, `SheetDescription` · `useDeleteAction(endpoint: string, options?: { returnFocusRef?: { current: HTMLElement | null } })` from `@/components/master-data/use-delete-action` · `useMediaQuery(query)` from `@/components/ui/use-media-query` · `cn` · `common.delete`.
- Produces (Tasks 13–21 and plans 2B-2, 2B-3 rely on these):
  - `src/components/ui/row-actions.tsx`, a client file:
    - `export function RowActions(props: RowActionsProps): JSX.Element`
    - `export type RowActionsProps = { code: string; name?: string; menuLabel: string; next?: RowNextAction | null; groups: readonly RowActionGroup[]; deleteAction?: { endpoint: string; label?: string }; openerRef?: RefObject<HTMLElement | null>; menu?: "auto" | "dropdown" | "sheet"; className?: string }`
    - `export type RowNextAction = { label: string; href: string; icon?: ReactNode; onNavigate?: () => void } | { label: string; onSelect: () => void; icon?: ReactNode }`
    - `export type RowActionItem = { kind: "link"; key; label; href; icon?; onNavigate? } | { kind: "action"; key; label; onSelect; icon?; destructive? } | { kind: "unavailable"; key; label; reason; icon? }` (all `string` except `icon: ReactNode`, `onSelect`/`onNavigate: () => void`, `destructive: boolean`)
    - `export type RowActionGroup = { key: string; label?: string; items: readonly RowActionItem[] }`
  - Caller contract:
    - `next`: `undefined` = no slot (phone rows), `null` = an empty 120px slot so ⋯ stays in its column, a link = the next step.
    - `groups` is required; pass `[]` when there is nothing but delete or nothing at all. With no non-empty group and no `deleteAction` there is no ⋯, only an empty 44px/32px slot (users, Task 21).
    - `deleteAction={{ endpoint }}` adds "ลบ" (or `label`) last, after a separator when a group comes before it; it asks the shared confirm and returns focus to ⋯.
    - `menuLabel={tCommon("moreActionsFor", { code })}`; `code` is also read after the next button's label ("แก้ไข BR-001") and is the sheet title.
    - Server pages pass data only (links, `icon` elements such as `<Pencil aria-hidden="true" />`). `onSelect`, `onNavigate` and `openerRef` come from client callers only; a dialog opened from `onSelect` is rendered outside `RowActions` with `hideTrigger` and `returnFocusRef={openerRef}` (R-m).
    - Put `RowActions` as the direct child of the `<td>`: `[td>&]:-my-1.25` keeps the row 46px.
    - `menu` defaults to `"auto"`: a menu from `md` (48rem), a bottom sheet below.
  - `src/components/ui/dropdown-menu.tsx`: `export const menuItemClasses` and `export const menuItemDestructiveClasses`. It is a client module; import them only from client files.
  - `common.moreActionsFor`: th `การดำเนินการของ {code}` · en `Actions for {code}`.

- [ ] **Step 1: Check what this task builds on**

Save this script as `p2b1-task07-precheck.mjs` in your temp folder (never in the repo):

```js
// p2b1-task07-precheck.mjs: run from the repo root before Task 7. Confirms that Tasks 1 and 4 are in, that the
// parts RowActions builds on are still as the plan quotes them, and that Task 7 has not started. Reads only; writes
// nothing. Never commit this file.
import { existsSync, readFileSync } from "node:fs"

const raw = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "")
const read = (path) => raw(path).replace(/\r\n/g, "\n")
const ui = (name) => read(`src/components/ui/${name}`)
const messages = (locale) => JSON.parse(raw(`messages/${locale}.json`) || "{}")
const dropdown = ui("dropdown-menu.tsx")
const count = (text, pattern) => (text.match(pattern) ?? []).length

const checks = {
  "Task 1: tests/list-frame-guards.test.ts exists": existsSync("tests/list-frame-guards.test.ts"),
  "Task 4: dataTableRowClasses starts with group/row": /export const dataTableRowClasses =\s*"group\/row /.test(ui("data-table.tsx")),
  "Task 4: ClickableTableRow uses cn(dataTableRowClasses, ...)": /cn\(dataTableRowClasses,/.test(ui("clickable-table-row.tsx")),
  "dropdown-menu: menuItemClasses and menuItemDestructiveClasses are module constants, once each":
    count(dropdown, /^const menuItemClasses =$/gm) === 1 && count(dropdown, /^const menuItemDestructiveClasses =$/gm) === 1 && !/export const menuItem/.test(dropdown),
  "dropdown-menu: DropdownMenuItem has unavailable, DropdownMenuItemText and DropdownMenuItemDescription":
    /\| \{ unavailable: true; asChild\?: never; onSelect\?: never \}/.test(dropdown) && /\bDropdownMenuItemText,/.test(dropdown) && /\bDropdownMenuItemDescription,/.test(dropdown),
  "sheet: SheetContent takes side and draws its own close X; SheetHeader has pr-16":
    /side = "right"/.test(ui("sheet.tsx")) && /closeLabel = closeLabelProp \?\? tCommon\("close"\)/.test(ui("sheet.tsx")) && /px-4 py-4 pr-16/.test(ui("sheet.tsx")),
  "button: ghost variant and icon-sm size (44px below md, 32px from md)":
    /ghost: "border-transparent bg-transparent text-muted-foreground/.test(ui("button-variants.ts")) && /const sizeIconSm = "min-h-11 min-w-11 md:size-8 md:min-h-0 md:min-w-0 rounded-control"/.test(ui("button-variants.ts")),
  "useDeleteAction(endpoint, { returnFocusRef }) with the shared confirm":
    /export function useDeleteAction\(endpoint: string, options\?: \{ returnFocusRef\?: \{ current: HTMLElement \| null \} \}\)/.test(read("src/components/master-data/use-delete-action.ts")) && /tone: "destructive"/.test(read("src/components/master-data/use-delete-action.ts")),
  "useMediaQuery is exported": /export function useMediaQuery\(query: string\)/.test(ui("use-media-query.ts")),
  "ClickableTableRow still skips clicks inside [data-no-row-click]": /closest\("a,button,input,select,textarea,\[data-no-row-click\]"\)/.test(ui("clickable-table-row.tsx")),
  "common.delete exists; common.moreActionsFor does not yet (th and en)": ["th", "en"].every((locale) => typeof messages(locale).common?.delete === "string" && messages(locale).common?.moreActionsFor === undefined),
  "Task 7 not started: no ui/row-actions.tsx, no tests/row-actions-ui.test.ts": !existsSync("src/components/ui/row-actions.tsx") && !existsSync("tests/row-actions-ui.test.ts"),
}
let missing = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok     " : "MISSING"} ${name}`)
  if (!ok) missing += 1
}
for (const path of ["src/components/ui/dropdown-menu.tsx", "messages/th.json", "messages/en.json"]) {
  const text = raw(path)
  const crlf = count(text, /\r\n/g)
  const lf = count(text, /\n/g)
  console.log(`info    ${path}: ${crlf === lf && lf > 0 ? "CRLF" : crlf === 0 ? "LF" : "mixed"}`)
}
if (missing > 0) {
  console.error(`ABORT: ${missing} precondition(s) failed. Do not start this task; report which.`)
  process.exit(1)
}
console.log("preconditions hold for Task 7")
```

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2b`

Run: `git status --short src tests messages` then `node <temp>/p2b1-task07-precheck.mjs`
Expected: `git status` prints nothing. The script prints:
```
ok      Task 1: tests/list-frame-guards.test.ts exists
ok      Task 4: dataTableRowClasses starts with group/row
ok      Task 4: ClickableTableRow uses cn(dataTableRowClasses, ...)
ok      dropdown-menu: menuItemClasses and menuItemDestructiveClasses are module constants, once each
ok      dropdown-menu: DropdownMenuItem has unavailable, DropdownMenuItemText and DropdownMenuItemDescription
ok      sheet: SheetContent takes side and draws its own close X; SheetHeader has pr-16
ok      button: ghost variant and icon-sm size (44px below md, 32px from md)
ok      useDeleteAction(endpoint, { returnFocusRef }) with the shared confirm
ok      useMediaQuery is exported
ok      ClickableTableRow still skips clicks inside [data-no-row-click]
ok      common.delete exists; common.moreActionsFor does not yet (th and en)
ok      Task 7 not started: no ui/row-actions.tsx, no tests/row-actions-ui.test.ts
info    src/components/ui/dropdown-menu.tsx: CRLF
info    messages/th.json: CRLF
info    messages/en.json: CRLF
preconditions hold for Task 7
```
On any `MISSING` line, stop and report it.

Run: `git ls-files --eol src/components/ui/dropdown-menu.tsx messages/th.json messages/en.json`
Expected: `i/lf w/crlf` for all three. Keep them CRLF.

- [ ] **Step 2: Create the failing test `tests/row-actions-ui.test.ts`**

Create the file with this content, LF line endings:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Phase 2B plan 1 Task 7 (spec 2B §3.11, I5, §3.21): RowActions ช1 in src/components/ui/row-actions.tsx. The
// dropdown-menu.tsx is CRLF in the working tree (the new component is LF), so every source is read with \r stripped.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const rowActions = () => read("src/components/ui/row-actions.tsx")

test("RowActions is a client component with one data-only API: no children, no outside trigger ref, no panel class (I5)", () => {
  const source = rowActions()
  assert.ok(source.startsWith('"use client"\n'), "the first line is the client directive")
  assert.match(source, /export function RowActions\(\{/)
  const props = source.match(/export type RowActionsProps = \{\n([\s\S]*?)\n\}/)?.[1]
  assert.ok(props, "export type RowActionsProps not found")
  assert.deepEqual(
    props.split("\n").map((line) => line.trim().split(":")[0]),
    ["code", "name?", "menuLabel", "next?", "groups", "deleteAction?", "openerRef?", "menu?", "className?"],
  )
  assert.match(props, /next\?: RowNextAction \| null/)
  assert.match(props, /deleteAction\?: \{ endpoint: string; label\?: string \}/)
  assert.match(props, /openerRef\?: RefObject<HTMLElement \| null>/)
  assert.match(props, /menu\?: "auto" \| "dropdown" \| "sheet"/)
  assert.match(source, /\| \{ label: string; href: string; icon\?: ReactNode; onNavigate\?: \(\) => void \}/)
  assert.match(source, /\| \{ label: string; onSelect: \(\) => void; icon\?: ReactNode \}/)
  assert.match(source, /\| \{ kind: "link"; key: string; label: string; href: string; icon\?: ReactNode; onNavigate\?: \(\) => void \}/)
  assert.match(source, /\| \{ kind: "action"; key: string; label: string; onSelect: \(\) => void; icon\?: ReactNode; destructive\?: boolean \}/)
  assert.match(source, /\| \{ kind: "unavailable"; key: string; label: string; reason: string; icon\?: ReactNode \}/)
  assert.match(source, /export type RowActionGroup = \{ key: string; label\?: string; items: readonly RowActionItem\[\] \}/)
  assert.doesNotMatch(source, /children|contentClassName/)
})

test("clicks on the actions, inside the menu and inside the sheet never open the row (R-m)", () => {
  const source = rowActions()
  assert.equal(source.match(/\bdata-no-row-click\b/g)?.length, 3)
  assert.match(source, /<div data-slot="row-actions" data-no-row-click onClick=\{stopPortalClick\} className=\{cn\("flex items-center justify-end gap-1 \[td>&\]:-my-1\.25", className\)\}>/)
  assert.match(source, /<DropdownMenuContent data-no-row-click align="end" onCloseAutoFocus=\{keepDialogFocus\}>/)
  assert.match(source, /<SheetContent side="bottom" data-no-row-click className="max-h-\[85dvh\] gap-0 rounded-t-lg"/)
  // The sheet's scrim is outside the marked parts, so a click that comes up from a portal stops at RowActions.
  assert.match(source, /function stopPortalClick\(event: ReactMouseEvent<HTMLDivElement>\) \{\s*if \(!event\.currentTarget\.contains\(event\.target as Node\)\) event\.stopPropagation\(\)\s*\}/)
})

test("the next button sits in a fixed 120px slot and reads its label with the row code (mockup .next-btn)", () => {
  const source = rowActions()
  assert.equal(
    source.match(/const rowNextClasses =\s*"([^"]+)"/)?.[1],
    "inline-flex min-h-11 w-30 shrink-0 items-center justify-start gap-1.5 rounded-control border border-transparent px-2.5 text-meta font-medium whitespace-nowrap text-primary transition-colors hover:bg-primary-soft hover:text-primary-hover hover:duration-0 group-hover/row:bg-primary-soft group-hover/row:text-primary-hover group-focus-within/row:bg-primary-soft group-focus-within/row:text-primary-hover group-has-[[aria-expanded=true]]/row:bg-primary-soft active:border-primary-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-8 md:min-h-0 [&_svg]:size-4 [&_svg]:shrink-0",
  )
  assert.match(source, /<span className="truncate">\{action\.label\}<\/span>\s*<span className="sr-only"> \{code\}<\/span>/)
  assert.match(source, /<Link href=\{action\.href\} onClick=\{action\.onNavigate\} className=\{rowNextClasses\}>/)
  assert.match(source, /onClick=\{\(event\) => openFromNext\(event\.currentTarget, onSelect\)\}/)
  assert.match(source, /function openFromNext\(button: HTMLElement, select: \(\) => void\) \{\s*if \(openerRef\) openerRef\.current = button\s*select\(\)\s*\}/)
  // undefined = no slot (phone rows) · null = an empty 120px slot, so ⋯ stays in its column.
  assert.match(source, /next === undefined \? null : next === null \? <span aria-hidden="true" className="w-30 shrink-0" \/> : renderNext\(next\)/)
})

test("⋯ is a ghost icon-sm button, a menu from md and a bottom sheet below, and leaves its place empty when there is nothing to show", () => {
  const source = rowActions()
  assert.match(source, /<Button ref=\{triggerRef\} variant="ghost" size="icon-sm" aria-label=\{menuLabel\} title=\{menuLabel\}>\s*<MoreHorizontal aria-hidden="true" \/>\s*<\/Button>/)
  assert.equal(source.match(/ref=\{triggerRef\}/g)?.length, 1)
  assert.match(source, /<DropdownMenuTrigger asChild>\{trigger\}<\/DropdownMenuTrigger>/)
  assert.match(source, /<SheetTrigger asChild>\{trigger\}<\/SheetTrigger>/)
  assert.match(source, /<DropdownMenu modal=\{false\}>/)
  assert.match(source, /useMediaQuery\("\(min-width: 48rem\)"\)/)
  assert.match(source, /const asSheet = menu === "sheet" \|\| \(menu === "auto" && !isDesktop\)/)
  assert.match(source, /const hasMenu = filled\.length > 0 \|\| Boolean\(deleteAction\)/)
  assert.match(source, /!hasMenu \? <span aria-hidden="true" className="w-11 shrink-0 md:w-8" \/> : asSheet \? renderSheet\(\) : renderDropdown\(\)/)
})

test("unavailable items say why, delete asks the shared confirm and returns focus to ⋯, dialogs open outside the menu", () => {
  const source = rowActions()
  // The same regexes plan 2B-3 moves from the register tests to this file (spec §7.17).
  assert.match(source, /<DropdownMenuItem\b[^>]*\bunavailable>/)
  assert.match(source, /<DropdownMenuItemDescription>\{[\w.]*reason\}<\/DropdownMenuItemDescription>/)
  assert.match(source, /useDeleteAction\([\s\S]*?\{ returnFocusRef: triggerRef \}\)/)
  assert.match(source, /useDeleteAction\(deleteAction\?\.endpoint \?\? "", \{ returnFocusRef: triggerRef \}\)/)
  assert.match(source, /<DropdownMenuItem variant="destructive" disabled=\{deleting\} onSelect=\{\(\) => void runDelete\(\)\}>\s*<Trash2 aria-hidden="true" \/>\s*\{deleteLabel\}/)
  assert.match(source, /const deleteLabel = deleteAction\?\.label \?\? tCommon\("delete"\)/)
  assert.match(source, /variant=\{item\.destructive \? "destructive" : "default"\} onSelect=\{\(\) => openFromMenu\(onSelect\)\}/)
  assert.match(source, /function openFromMenu\(select: \(\) => void\) \{\s*openingRef\.current = true\s*if \(openerRef\) openerRef\.current = triggerRef\.current\s*select\(\)\s*\}/)
  assert.match(source, /function keepDialogFocus\(event: Event\) \{\s*if \(!openingRef\.current\) return\s*openingRef\.current = false\s*event\.preventDefault\(\)\s*\}/)
  assert.equal(source.match(/onCloseAutoFocus=\{keepDialogFocus\}/g)?.length, 2, "the menu and the sheet both leave focus to the dialog")
  assert.doesNotMatch(source, /AccessibleDialog|ConfirmDialog|createPortal|addEventListener/)
})

test("the phone sheet shows the code as its title and uses the menu row look, with the chrome left to the Sheet primitive", () => {
  const source = rowActions()
  assert.match(source, /<SheetTitle>\s*<span className="tag font-medium">\{code\}<\/span>\s*<\/SheetTitle>/)
  assert.match(source, /\{name \? <SheetDescription className="truncate">\{name\}<\/SheetDescription> : null\}/)
  assert.match(source, /\{\.\.\.\(name \? \{\} : \{ "aria-describedby": undefined \}\)\}/)
  assert.match(source, /<div className="overflow-y-auto px-2 pt-1 pb-3">/)
  assert.match(source, /<div key=\{group\.key\} role="group" aria-labelledby=\{group\.label \? labelId : undefined\} className=\{cn\(index > 0 && "mt-1 border-t border-border-soft pt-1"\)\}>/)
  assert.match(source, /<p id=\{labelId\} className="px-2\.5 pt-2 pb-1 text-xs font-medium text-muted-foreground">/)
  assert.match(source, /<ul className="grid gap-px">/)
  assert.match(source, /import \{[^}]*\bmenuItemClasses\b[^}]*\bmenuItemDestructiveClasses\b[^}]*\} from "@\/components\/ui\/dropdown-menu"/)
  assert.match(source, /const sheetItemClasses = cn\(menuItemClasses, menuItemDestructiveClasses, "w-full text-left"\)/)
  assert.match(source, /<div aria-disabled="true" className=\{sheetItemClasses\}>/)
  assert.match(source, /setSheetOpen\(false\)\s*openFromMenu\(onSelect\)/)
  assert.match(source, /data-variant="destructive"\s*aria-disabled=\{deleting \|\| undefined\}\s*onClick=\{\(\) => \{\s*if \(deleting\) return\s*setSheetOpen\(false\)\s*void runDelete\(\)/)
  assert.doesNotMatch(source, /closeLabel=|pr-14|pb-\[env|hover:bg-accent|opacity-|rounded-t-xl|size-8|size-11/)
  // The class rules every 2B primitive follows (spec §3.2).
  assert.doesNotMatch(source, /\bshadow-(?:sm|md|lg|xl|2xl)\b|leading-tight|leading-4|rounded-\[|flex-col-reverse|uppercase|bg-muted\//)
})

test("dropdown-menu exports the two menu row class strings for the RowActions sheet", () => {
  const source = read("src/components/ui/dropdown-menu.tsx")
  assert.match(source, /^export const menuItemClasses =$/m)
  assert.match(source, /^export const menuItemDestructiveClasses =$/m)
  assert.equal(source.match(/^const menuItem(?:Destructive)?Classes =/gm), null)
})

test("the ⋯ name is common.moreActionsFor in both languages, worded like the register's ⋯ (I33)", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).common
  const en = JSON.parse(readFileSync("messages/en.json", "utf8")).common
  assert.equal(th.moreActionsFor, "การดำเนินการของ {code}")
  assert.equal(en.moreActionsFor, "Actions for {code}")
})
```

Run: `node --test tests/row-actions-ui.test.ts`
Expected: FAIL, `tests 8 · pass 0 · fail 8`:
- the 6 tests that read the component fail with `ENOENT: no such file or directory, open '…src\components\ui\row-actions.tsx'`
- "dropdown-menu exports the two menu row class strings …" fails on `/^export const menuItemClasses =$/m`
- "the ⋯ name is common.moreActionsFor …" fails with `undefined !== 'การดำเนินการของ {code}'`

- [ ] **Step 3: Export the two menu row class strings (`src/components/ui/dropdown-menu.tsx`)**

Two exact replacements in a CRLF file. Nothing else in the file changes (the strings, their comments and every component stay as they are).

(1) Replace:

```tsx
// disabled items and by `unavailable`) is faint with no fill; no opacity, so its reason line stays readable.
const menuItemClasses =
```

with:

```tsx
// disabled items and by `unavailable`) is faint with no fill; no opacity, so its reason line stays readable.
export const menuItemClasses =
```

(2) Replace:

```tsx
// reads one class string at a time.
const menuItemDestructiveClasses =
```

with:

```tsx
// reads one class string at a time.
export const menuItemDestructiveClasses =
```

Check: `grep -n "^export const menuItem" src/components/ui/dropdown-menu.tsx` prints `16:export const menuItemClasses =` and `22:export const menuItemDestructiveClasses =`.

Run: `node --test tests/menu-primitives-ui.test.ts`
Expected: PASS, `tests 10 · pass 10 · fail 0`.

- [ ] **Step 4: Add `common.moreActionsFor` (messages)**

Save this as `p2b1-task07-messages.json` in your temp folder (copy of spec §10.2, row "2B-1 · 7"):

```json
{
  "set": {
    "th": { "common.moreActionsFor": "การดำเนินการของ {code}" },
    "en": { "common.moreActionsFor": "Actions for {code}" }
  }
}
```

Run from the repo root: `node scripts/messages-edit.mjs <temp>/p2b1-task07-messages.json`
Expected: `messages updated: 1 th, 1 en, 0 deleted`

Run: `git diff --stat -- messages`
Expected: `messages/en.json | 3 ++-` and `messages/th.json | 3 ++-` (the key goes last in `common`, so the key before it gains a comma). Both files stay CRLF.

- [ ] **Step 5: Create `src/components/ui/row-actions.tsx`**

Create the file with this content, LF line endings:

```tsx
"use client"

import { Fragment, useId, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode, type RefObject } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { MoreHorizontal, Trash2 } from "lucide-react"
import { useDeleteAction } from "@/components/master-data/use-delete-action"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemDescription,
  DropdownMenuItemText,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  menuItemClasses,
  menuItemDestructiveClasses,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useMediaQuery } from "@/components/ui/use-media-query"
import { cn } from "@/lib/utils"

// Row actions, pattern ช1 (spec 2B §3.11, I5): one next-step button in a fixed 120px slot, then ⋯ with every other
// action of the row. The props are data only, so a server page renders RowActions directly; onSelect and onNavigate
// can only come from a client caller. A menu never holds a dialog: an "action" item calls onSelect, and the caller
// opens its own dialog, rendered outside with hideTrigger and returnFocusRef={openerRef}, through its handle (R-m).

// Next step: a link (a server page can pass it) or, from a client caller only, a button that opens a dialog.
export type RowNextAction =
  | { label: string; href: string; icon?: ReactNode; onNavigate?: () => void }
  | { label: string; onSelect: () => void; icon?: ReactNode }

export type RowActionItem =
  | { kind: "link"; key: string; label: string; href: string; icon?: ReactNode; onNavigate?: () => void }
  | { kind: "action"; key: string; label: string; onSelect: () => void; icon?: ReactNode; destructive?: boolean }
  | { kind: "unavailable"; key: string; label: string; reason: string; icon?: ReactNode }

export type RowActionGroup = { key: string; label?: string; items: readonly RowActionItem[] }

export type RowActionsProps = {
  code: string
  name?: string
  menuLabel: string
  next?: RowNextAction | null
  groups: readonly RowActionGroup[]
  deleteAction?: { endpoint: string; label?: string }
  openerRef?: RefObject<HTMLElement | null>
  menu?: "auto" | "dropdown" | "sheet"
  className?: string
}

// Mockup .next-btn: 120px wide and 32px tall from md (44px tall below), 13px medium primary text, a 16px icon on the
// left. It fills with primary-soft on hover, while its row is hovered or holds focus, and while the row's menu is open.
const rowNextClasses =
  "inline-flex min-h-11 w-30 shrink-0 items-center justify-start gap-1.5 rounded-control border border-transparent px-2.5 text-meta font-medium whitespace-nowrap text-primary transition-colors hover:bg-primary-soft hover:text-primary-hover hover:duration-0 group-hover/row:bg-primary-soft group-hover/row:text-primary-hover group-focus-within/row:bg-primary-soft group-focus-within/row:text-primary-hover group-has-[[aria-expanded=true]]/row:bg-primary-soft active:border-primary-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-8 md:min-h-0 [&_svg]:size-4 [&_svg]:shrink-0"

// Rows of the phone sheet look like menu rows (44px, primary-soft focus, danger for delete). dropdown-menu.tsx is a
// client module, so only client files may import these two strings.
const sheetItemClasses = cn(menuItemClasses, menuItemDestructiveClasses, "w-full text-left")

// React sends the events of the menu and sheet portals up through this component to the row. The row skips clicks on
// the marked parts, but the sheet's scrim is not one of them: a tap that closes the sheet would also open the row.
function stopPortalClick(event: ReactMouseEvent<HTMLDivElement>) {
  if (!event.currentTarget.contains(event.target as Node)) event.stopPropagation()
}

export function RowActions({
  code,
  name,
  menuLabel,
  next,
  groups,
  deleteAction,
  openerRef,
  menu = "auto",
  className,
}: RowActionsProps) {
  const tCommon = useTranslations("common")
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const openingRef = useRef(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const groupId = useId()
  // False on the server and during hydration, so "auto" starts as the sheet; ⋯ looks the same either way.
  const isDesktop = useMediaQuery("(min-width: 48rem)")
  // Hooks run on every render. Without deleteAction the endpoint is empty and runDelete is never called.
  const { deleting, runDelete } = useDeleteAction(deleteAction?.endpoint ?? "", { returnFocusRef: triggerRef })
  const filled = groups.filter((group) => group.items.length > 0)
  const hasMenu = filled.length > 0 || Boolean(deleteAction)
  const deleteLabel = deleteAction?.label ?? tCommon("delete")
  const asSheet = menu === "sheet" || (menu === "auto" && !isDesktop)

  // The caller's dialog takes focus, so the closing menu or sheet must not pull it back to ⋯. When the dialog
  // closes it returns focus to openerRef, which now points at ⋯.
  function openFromMenu(select: () => void) {
    openingRef.current = true
    if (openerRef) openerRef.current = triggerRef.current
    select()
  }

  // A next button that opens a dialog: the dialog gives focus back to this button.
  function openFromNext(button: HTMLElement, select: () => void) {
    if (openerRef) openerRef.current = button
    select()
  }

  function keepDialogFocus(event: Event) {
    if (!openingRef.current) return
    openingRef.current = false
    event.preventDefault()
  }

  function renderNext(action: RowNextAction) {
    const content = (
      <>
        {action.icon}
        <span className="truncate">{action.label}</span>
        <span className="sr-only"> {code}</span>
      </>
    )
    if ("href" in action) {
      return (
        <Link href={action.href} onClick={action.onNavigate} className={rowNextClasses}>
          {content}
        </Link>
      )
    }
    const { onSelect } = action
    return (
      <button
        type="button"
        className={rowNextClasses}
        onClick={(event) => openFromNext(event.currentTarget, onSelect)}
      >
        {content}
      </button>
    )
  }

  function menuItem(item: RowActionItem) {
    if (item.kind === "link") {
      return (
        <DropdownMenuItem key={item.key} asChild>
          <Link href={item.href} onClick={item.onNavigate}>
            {item.icon}
            {item.label}
          </Link>
        </DropdownMenuItem>
      )
    }
    if (item.kind === "action") {
      const { onSelect } = item
      return (
        <DropdownMenuItem key={item.key} variant={item.destructive ? "destructive" : "default"} onSelect={() => openFromMenu(onSelect)}>
          {item.icon}
          {item.label}
        </DropdownMenuItem>
      )
    }
    return (
      <DropdownMenuItem key={item.key} unavailable>
        {item.icon}
        <DropdownMenuItemText>
          {item.label}
          <DropdownMenuItemDescription>{item.reason}</DropdownMenuItemDescription>
        </DropdownMenuItemText>
      </DropdownMenuItem>
    )
  }

  function sheetItem(item: RowActionItem) {
    if (item.kind === "link") {
      return (
        <Link href={item.href} onClick={item.onNavigate} className={sheetItemClasses}>
          {item.icon}
          {item.label}
        </Link>
      )
    }
    if (item.kind === "action") {
      const { onSelect } = item
      return (
        <button
          type="button"
          data-variant={item.destructive ? "destructive" : undefined}
          onClick={() => {
            setSheetOpen(false)
            openFromMenu(onSelect)
          }}
          className={sheetItemClasses}
        >
          {item.icon}
          {item.label}
        </button>
      )
    }
    // Not a control: it reads its name and its reason, and pressing it does nothing.
    return (
      <div aria-disabled="true" className={sheetItemClasses}>
        {item.icon}
        <DropdownMenuItemText>
          {item.label}
          <DropdownMenuItemDescription>{item.reason}</DropdownMenuItemDescription>
        </DropdownMenuItemText>
      </div>
    )
  }

  const trigger = (
    <Button ref={triggerRef} variant="ghost" size="icon-sm" aria-label={menuLabel} title={menuLabel}>
      <MoreHorizontal aria-hidden="true" />
    </Button>
  )

  function renderDropdown() {
    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent data-no-row-click align="end" onCloseAutoFocus={keepDialogFocus}>
          {filled.map((group, index) => (
            <Fragment key={group.key}>
              {index > 0 ? <DropdownMenuSeparator /> : null}
              {group.label ? <DropdownMenuLabel>{group.label}</DropdownMenuLabel> : null}
              {group.items.map((item) => menuItem(item))}
            </Fragment>
          ))}
          {deleteAction ? (
            <>
              {filled.length > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem variant="destructive" disabled={deleting} onSelect={() => void runDelete()}>
                <Trash2 aria-hidden="true" />
                {deleteLabel}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // The Sheet primitive already draws the close X (common.close), the room for it in the header and the home-bar padding.
  function renderSheet() {
    return (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="bottom" data-no-row-click className="max-h-[85dvh] gap-0 rounded-t-lg" onCloseAutoFocus={keepDialogFocus} {...(name ? {} : { "aria-describedby": undefined })}>
          <SheetHeader>
            <SheetTitle>
              <span className="tag font-medium">{code}</span>
            </SheetTitle>
            {name ? <SheetDescription className="truncate">{name}</SheetDescription> : null}
          </SheetHeader>
          <div className="overflow-y-auto px-2 pt-1 pb-3">
            {filled.map((group, index) => {
              const labelId = `${groupId}-${group.key}`
              return (
                <div key={group.key} role="group" aria-labelledby={group.label ? labelId : undefined} className={cn(index > 0 && "mt-1 border-t border-border-soft pt-1")}>
                  {group.label ? (
                    <p id={labelId} className="px-2.5 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                      {group.label}
                    </p>
                  ) : null}
                  <ul className="grid gap-px">
                    {group.items.map((item) => (
                      <li key={item.key}>{sheetItem(item)}</li>
                    ))}
                  </ul>
                </div>
              )
            })}
            {deleteAction ? (
              <div className={cn(filled.length > 0 && "mt-1 border-t border-border-soft pt-1")}>
                <button
                  type="button"
                  data-variant="destructive"
                  aria-disabled={deleting || undefined}
                  onClick={() => {
                    if (deleting) return
                    setSheetOpen(false)
                    void runDelete()
                  }}
                  className={sheetItemClasses}
                >
                  <Trash2 aria-hidden="true" />
                  {deleteLabel}
                </button>
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div data-slot="row-actions" data-no-row-click onClick={stopPortalClick} className={cn("flex items-center justify-end gap-1 [td>&]:-my-1.25", className)}>
      {next === undefined ? null : next === null ? <span aria-hidden="true" className="w-30 shrink-0" /> : renderNext(next)}
      {!hasMenu ? <span aria-hidden="true" className="w-11 shrink-0 md:w-8" /> : asSheet ? renderSheet() : renderDropdown()}
    </div>
  )
}
```

- [ ] **Step 6: Prove every class compiles**

Save this as `p2b1-task07-tw-probe.mjs` in your temp folder:

```js
// p2b1-task07-tw-probe.mjs: run from the repo root after Step 6. Compiles every class written in
// src/components/ui/row-actions.tsx with the repo's Tailwind 4 and src/app/globals.css, in memory, and prints
// MISSING for any class that produces no CSS. Reads only; writes nothing. Never commit this file.
import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const repo = process.cwd()
const require = createRequire(join(repo, "package.json"))
const { compile } = require("@tailwindcss/node")
const source = readFileSync(join(repo, "src/components/ui/row-actions.tsx"), "utf8").replace(/\r\n/g, "\n")
// Class strings: className="…", the two const strings, and the literal arguments of cn(…).
const strings = [
  ...[...source.matchAll(/className="([^"]+)"/g)].map((match) => match[1]),
  ...[...source.matchAll(/const \w+Classes =\s*"([^"]+)"/g)].map((match) => match[1]),
  ...[...source.matchAll(/cn\(([^)]*)\)/g)].flatMap((match) => [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1])),
]
const classes = [...new Set(strings.flatMap((text) => text.split(/\s+/)).filter(Boolean))]
const compiler = await compile(readFileSync(join(repo, "src/app/globals.css"), "utf8"), { base: repo, onDependency() {} })
const css = compiler.build(classes)
const utilities = css.slice(css.indexOf("@layer utilities"))
const escape = (name) => name.replace(/[^a-zA-Z0-9_-]/g, (char) => "\\" + char)
const missing = classes.filter((name) => !utilities.includes("." + escape(name)))
for (const name of missing) console.log(`MISSING ${name}`)
const rule = (name) => {
  const at = utilities.indexOf("." + escape(name))
  return at === -1 ? "" : utilities.slice(at, utilities.indexOf("}", at) + 1).replace(/\s+/g, " ")
}
console.log(`checked ${classes.length} classes, missing ${missing.length}`)
console.log(`group-has  ${rule("group-has-[[aria-expanded=true]]/row:bg-primary-soft").slice(0, 160)}`)
console.log(`td margin  ${rule("[td>&]:-my-1.25").slice(0, 120)}`)
console.log(`w-30       ${rule("w-30")}`)
const tagAt = utilities.indexOf(".tag {")
const mediumAt = utilities.indexOf(".font-medium {")
console.log(`.tag before .font-medium (so font-medium wins): ${tagAt !== -1 && mediumAt !== -1 && tagAt < mediumAt}`)
```

Run from the repo root: `node <temp>/p2b1-task07-tw-probe.mjs`
Expected:
```
checked 60 classes, missing 0
group-has  .group-has-\[\[aria-expanded\=true\]\]\/row\:bg-primary-soft { &:is(:where(.group\/row):has(*:is([aria-expanded=true])) *) { background-color: var(--primary-sof
td margin  .\[td\>\&\]\:-my-1\.25 { td>& { margin-block: calc(var(--spacing) * -1.25); }
w-30       .w-30 { width: calc(var(--spacing) * 30); }
.tag before .font-medium (so font-medium wins): true
```
Any `MISSING` line means a class produces no CSS; stop and report it. No token is added (2A I21).

- [ ] **Step 7: Run the tests for this task**

Run: `node --test tests/row-actions-ui.test.ts tests/menu-primitives-ui.test.ts tests/dropdown-menus-ui.test.ts tests/dialog-trigger-handles.test.ts tests/confirm-dialog-ui.test.ts tests/asset-register-table-ui.test.ts tests/form-migration-guards.test.ts tests/ui-overlay-guards.test.ts tests/class-merge.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts`
Expected: PASS, `tests 93 · pass 93 · fail 0` (8 + 10 + 6 + 5 + 3 + 17 + 23 + 12 + 3 + 3 + 3).

Run: `node --test tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts tests/list-primitives-ui.test.ts`
Expected: PASS with `fail 0`, and the same test count as after Task 6 (this task adds no test to these files and moves no budget).

- [ ] **Step 8: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, and 8 more tests than before Step 2: 1866 tests, 1865 pass, 1 skipped (after Tasks 1–6: 1858).
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors and no new warning in `src/` or `tests/` (146 warnings, all under `.agents/`).

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- `git diff --stat` shows exactly 3 files, `6 insertions(+), 4 deletions(-)`: `src/components/ui/dropdown-menu.tsx | 4 ++--`, `messages/en.json | 3 ++-`, `messages/th.json | 3 ++-`.
- `git status` also lists `?? src/components/ui/row-actions.tsx` (302 lines) and `?? tests/row-actions-ui.test.ts` (117 lines).
- Git may warn that LF will be replaced by CRLF in the two new files. Leave them LF.
- A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).

- [ ] **Step 9: Commit**

```bash
git add src/components/ui/row-actions.tsx src/components/ui/dropdown-menu.tsx messages/th.json messages/en.json tests/row-actions-ui.test.ts
git commit -m "feat(ui): RowActions next button with a ⋯ menu or bottom sheet (2B-1 task 7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 5 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the plan 2B-1 dev-app check (Task 25), once Tasks 13–21 call it:**
- 1440: "แก้ไข" is 120 × 32 and ⋯ 32 × 32 in every row; a row without a next step keeps ⋯ in the same column; hovering or tabbing into the row fills "แก้ไข" with `primary-soft`, and the row stays filled while its ⋯ menu is open.
- ⋯ opens with Enter, arrows move, Esc closes with focus back on ⋯. "ลบ" → confirm → Cancel: focus back on ⋯, nothing deleted. Clicking ⋯ or any menu item never opens the row's edit page.
- 375: ⋯ opens the bottom sheet with the code as a monospace title, rows 44px, "ลบ" in red after a line. Tap the dark scrim to close it: the sheet closes and the row's edit page does **not** open. Tap "ลบ": the sheet closes, the confirm opens; Cancel.
- NVDA: the next button reads "แก้ไข BR-001", ⋯ reads "การดำเนินการของ BR-001".

---

### Task 8: `ui/tab-nav.tsx` (link tabs with one underline, I9)

Spec §10.3 row 8, with §3.12, §3.18 rulings 21–23, R-g and I9. One new primitive, one commit. No page uses it in 2B-1. The first callers are the rounds quick filters, the disposal stage tabs and the findings status row in 2B-2. The file is LF.

Rulings this task applies:
- **I9:** there is no `fullBleed` prop. `TabNav` takes `...navProps`, typed `Omit<React.ComponentProps<"nav">, "children" | "aria-label" | "onSelect">`, so `ref`, `style`, `onScroll` and `data-*` reach the `<nav>`. It also takes `linkClassName?: string`, added last in each link's `cn(…)`. The register status tabs (2B-3) pass `className` and `data-asset-status-tabs`. The client wrappers `asset-detail-tabs` (2B-4) and `report-view-tabs` (2B-5) pass `ref`/`onScroll`/`style` and `linkClassName="snap-start"`.
- **I9, the `Omit` of `onSelect`:** the `<nav>` element's own `onSelect` has a different event type and would clash with `TabNav`'s `onSelect`.
- **R-g, §3.18 ruling 23:** these are links with `aria-current="page"`, not an ARIA tab list. `onSelect` runs through `Link onNavigate`, so only a client component can pass it. Next 16.4: `onNavigate` fires only on client-side navigation and `event.preventDefault()` cancels it, while Ctrl+click still opens a new tab (`node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md:453-503`; `scroll` at `:230`). `onNavigate` is new to this repo, so read those two sections before Step 4.
- **§3.18 rulings 21–22:** the base line is an inset shadow on the `ul`. The 2px current line is an inset shadow on the link, inside a `li` that fills the row height, so the current tab is no taller and the line scrolls with its tab. No `-mb-px`, no `overflow-visible` and no `border-b-2`. The system scrollbar stays.
- **Ruling (from §3.12 markup):** the label and the count sit in one `<span className="whitespace-nowrap">`, so they share a baseline. The count is `ms-1.5 text-meta num`, `font-semibold text-primary` when the tab is current and `text-faint-foreground` when not.

What users will see: nothing yet.

Not in this task:
- callers (2B-2 to 2B-5) and the settings tabs (`system-settings-form.tsx:948-967`, 2C batch 5, O7)
- the R1 budget (`D/audit/rounds/page.tsx`, lowered in 2B-2)
- messages: no key
- docs (Task 26)
- LFG: `ui/tab-nav.tsx` is in `NAV_PRIMITIVES`, so LN1 skips its `aria-current`, and it matches no other counter.

Do not run a formatter.

**Files:**
- Create: `src/components/ui/tab-nav.tsx` (LF)
- Modify: `tests/list-primitives-ui.test.ts` (LF, one block appended)
- Temp folder only: `task08-block.ts` (and Task 6's `p2b1-ui-precheck.mjs` and `p2b1-append.mjs`; if your temp folder lacks them, save them from Task 6 Steps 1 and 2)

**Must keep passing without edits:** `tests/visual-foundation-guards.test.ts` (focus rings use `ring-ring`; no R2 shadow), `tests/list-frame-guards.test.ts`, `tests/form-migration-guards.test.ts`, `tests/class-merge.test.ts`.

**Interfaces:**
- Consumes: `Link` from `next/link` (`href`, `scroll`, `aria-current`, `onNavigate`, `className`); `cn` from `@/lib/utils`; Task 6's `assertListPrimitiveRules`.
- Produces:
  - `export type TabNavItem = { key: string; label: React.ReactNode; href: string; count?: string; icon?: React.ReactNode }` (`count` already formatted with `formatCount`).
  - `export function TabNav(props: Omit<React.ComponentProps<"nav">, "children" | "aria-label" | "onSelect"> & { "aria-label": string; items: readonly TabNavItem[]; current: string; scroll?: boolean; onSelect?: (key: string, event: { preventDefault: () => void }) => void; linkClassName?: string; className?: string })`.
  - `data-slot="tab-nav"` on the `<nav>`. The class constants `tabNavLinkClasses`, `tabNavSelectedClasses` and `tabNavIdleClasses` are one line each, for the tests.

New classes (none of them in `src/` at HEAD): `gap-5.5`, `ms-1.5`, `shadow-[inset_0_-1px_0_var(--border)]`, `shadow-[inset_0_-2px_0_var(--primary)]` and `hover:shadow-[inset_0_-2px_0_var(--border)]`. All of them compile against `globals.css` (drafter's scan and compile probe). `cn()` keeps the arbitrary shadow next to `focus-visible:ring-*`, because Tailwind composes ring and shadow through separate variables.

- [ ] **Step 1: Check what this task builds on**

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2b`

Run: `git status --short src tests messages` then `node <temp>/p2b1-ui-precheck.mjs 8`
Expected: `git status` prints nothing. The script prints:
```
ok      Task 1: tests/list-frame-guards.test.ts exists
ok      Task 3: tests/list-primitives-ui.test.ts is LF and imports assert, readFileSync and test
ok      Task 6 declared assertListPrimitiveRules in tests/list-primitives-ui.test.ts
ok      src/components/ui/tab-nav.tsx is not there yet
ok      Next 16.4 Link has onNavigate and scroll
preconditions hold for Task 8
```
On any `MISSING` line, stop and report it.

- [ ] **Step 2: Read the Next 16.4 `Link` docs**

Read `node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md`, the `scroll` section (from `:230`) and the `onNavigate` section (`:453-503`). Confirm that `onNavigate` receives `{ preventDefault }` and is skipped for modifier-key clicks.

- [ ] **Step 3: Write the failing test**

Save this block as `task08-block.ts` in your temp folder:

```ts
test("TabNav is a named nav of links with aria-current and one underline at every width (2B §3.12, I9)", () => {
  const path = "src/components/ui/tab-nav.tsx"
  const source = readFileSync(path, "utf8").replace(/\r\n/g, "\n")
  assertListPrimitiveRules(path, source)
  assert.match(source, /type TabNavProps = Omit<React\.ComponentProps<"nav">, "children" \| "aria-label" \| "onSelect"> & \{/)
  assert.match(source, /export function TabNav\(\{ "aria-label": ariaLabel, items, current, scroll, onSelect, linkClassName, className, \.\.\.navProps \}: TabNavProps\)/)
  assert.match(source, /<nav aria-label=\{ariaLabel\} data-slot="tab-nav" \{\.\.\.navProps\} className=\{cn\("overflow-x-auto overscroll-x-contain", className\)\}>/)
  assert.match(source, /<ul className="flex w-max min-w-full gap-5\.5 shadow-\[inset_0_-1px_0_var\(--border\)\]">/)
  assert.match(source, /aria-current=\{selected \? "page" : undefined\}/)
  assert.match(source, /scroll=\{scroll\}/)
  assert.match(source, /onNavigate=\{onSelect \? \(event\) => onSelect\(item\.key, event\) : undefined\}/)
  assert.match(source, /className=\{cn\(tabNavLinkClasses, selected \? tabNavSelectedClasses : tabNavIdleClasses, linkClassName\)\}/)
  assert.equal(
    source.match(/const tabNavLinkClasses = "([^"]+)"/)?.[1],
    "flex min-h-11 items-center gap-1.5 pt-2 pb-2.5 text-sm transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:min-h-0",
  )
  assert.equal(source.match(/const tabNavSelectedClasses = "([^"]+)"/)?.[1], "font-semibold text-foreground shadow-[inset_0_-2px_0_var(--primary)]")
  assert.equal(source.match(/const tabNavIdleClasses = "([^"]+)"/)?.[1], "text-muted-foreground hover:text-foreground hover:shadow-[inset_0_-2px_0_var(--border)]")
  assert.match(source, /cn\("ms-1\.5 text-meta num", selected \? "font-semibold text-primary" : "text-faint-foreground"\)/)
  assert.doesNotMatch(source, /fullBleed|role="tablist"|aria-pressed|scrollbar-none|border-b-2/)
})
```

Run: `node <temp>/p2b1-append.mjs <temp>/task08-block.ts tests/list-primitives-ui.test.ts`
Expected: `appended <temp>/task08-block.ts to tests/list-primitives-ui.test.ts`

Run: `node --test --test-name-pattern="^TabNav " tests/list-primitives-ui.test.ts`
Expected: FAIL, `tests 1 · pass 0 · fail 1`, with `Error: ENOENT: no such file or directory, open '…\src\components\ui\tab-nav.tsx'`.

- [ ] **Step 4: Create `src/components/ui/tab-nav.tsx`**

Create the file with this content, LF line endings. The comments must not contain the strings the test forbids (`role="tablist"`, `aria-pressed`, `scrollbar-none`, `border-b-2`, `fullBleed`).

```tsx
import type React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export type TabNavItem = {
  key: string
  label: React.ReactNode
  href: string
  // Already formatted (formatCount).
  count?: string
  // For example the warning icon of an asset detail tab.
  icon?: React.ReactNode
}

// ...navProps reaches <nav>: ref, style, onScroll and data-* for the client wrappers that scroll the row (I9).
// onSelect is left out of the <nav> props because its event type differs from the one below.
type TabNavProps = Omit<React.ComponentProps<"nav">, "children" | "aria-label" | "onSelect"> & {
  "aria-label": string
  items: readonly TabNavItem[]
  // The key of the current tab: its link gets aria-current="page".
  current: string
  // Passed to Link; false keeps the scroll position.
  scroll?: boolean
  // Client components only (a server page cannot pass a function): runs through Link onNavigate, so it fires on
  // client-side navigation only, and event.preventDefault() keeps the URL. Ctrl+click still opens a new tab.
  onSelect?: (key: string, event: { preventDefault: () => void }) => void
  // Added to every link, for example "snap-start" from a client wrapper.
  linkClassName?: string
  // Layout, for example the full-bleed register status tabs.
  className?: string
}

// Mockup .tabs: 14px links 22px apart on one 1px base line; the current tab is ink 600 with a 2px primary line.
// Both lines are inset shadows, so the current tab is no taller than the others, and the 2px line sits in a li that
// fills the row height: it covers the base line and scrolls with its tab. Focus ring inside, so the scroller cannot cut it.
const tabNavLinkClasses = "flex min-h-11 items-center gap-1.5 pt-2 pb-2.5 text-sm transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:min-h-0"
const tabNavSelectedClasses = "font-semibold text-foreground shadow-[inset_0_-2px_0_var(--primary)]"
const tabNavIdleClasses = "text-muted-foreground hover:text-foreground hover:shadow-[inset_0_-2px_0_var(--border)]"

// Links that change the URL, named by the <nav> and marked with aria-current, not an ARIA tab list (R-g). State that
// does not change the URL uses Segmented. Underline at every width; 40px from md, 44px below. Keeps the system
// scrollbar: the settings row has 11 tabs. Server-safe.
export function TabNav({ "aria-label": ariaLabel, items, current, scroll, onSelect, linkClassName, className, ...navProps }: TabNavProps) {
  return (
    <nav aria-label={ariaLabel} data-slot="tab-nav" {...navProps} className={cn("overflow-x-auto overscroll-x-contain", className)}>
      <ul className="flex w-max min-w-full gap-5.5 shadow-[inset_0_-1px_0_var(--border)]">
        {items.map((item) => {
          const selected = item.key === current
          return (
            <li key={item.key} className="flex">
              <Link
                href={item.href}
                scroll={scroll}
                aria-current={selected ? "page" : undefined}
                onNavigate={onSelect ? (event) => onSelect(item.key, event) : undefined}
                className={cn(tabNavLinkClasses, selected ? tabNavSelectedClasses : tabNavIdleClasses, linkClassName)}
              >
                {item.icon}
                <span className="whitespace-nowrap">
                  {item.label}
                  {item.count !== undefined ? <span className={cn("ms-1.5 text-meta num", selected ? "font-semibold text-primary" : "text-faint-foreground")}>{item.count}</span> : null}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
```

- [ ] **Step 5: Run the tests for this task**

Run: `node --test --test-name-pattern="^TabNav " tests/list-primitives-ui.test.ts`
Expected: PASS, `tests 1 · pass 1 · fail 0`.

Run: `node --test tests/list-primitives-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/class-merge.test.ts`
Expected: PASS, `fail 0`.

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 0 fail and 1 more test than before Step 3; tsc no errors; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: `git diff --stat` shows 1 file, `tests/list-primitives-ui.test.ts` with 22 insertions. `git status` also lists `?? src/components/ui/tab-nav.tsx` (70 lines). Leave LF files LF.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/tab-nav.tsx tests/list-primitives-ui.test.ts
git commit -m "feat(ui): TabNav, underlined link tabs with aria-current (2B plan 1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 2 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 2B-1 dev-app check (Task 25):** nothing on its own (no caller in 2B-1). The keyboard, forced-colors and font-weight-shift checks (§3.19 risk 6) run with the first callers in 2B-2.

---

### Task 9: `ui/stat-strip.tsx` (one flat strip of numbers)

Spec §10.3 row 9, with §3.13, §3.18 rulings 24–25, R-d and DESIGN.md:258 (status color only for what needs action). One new primitive, one commit. The first caller is Task 13 (branches, in place of `SummaryTile`). The file is LF.

Rulings this task applies:
- **R-d, §3.18 ruling 25:** no status fill or border. A cell that needs action gets only a warning foot line with the warning icon (`toneIcons.warning`, the `TriangleAlert` of 2A).
- **§3.18 ruling 24:** the cell of the filter in use gets `primary-soft`, a 2px inset line (shape, not only color) and `aria-current="page"` on its link.
- **§3.13 a11y:**
  - A cell with `href` holds one stretched link (`after:absolute after:inset-0`) whose name is the label. The value is read from its `dd`.
  - The cell draws the focus ring (`has-[a:focus-visible]:ring-*`), and the link has `focus-visible:outline-none`. The forced-colors outline of the 2A base layer still shows, because it sits outside every layer.
  - The chevron is a picture, shown with `invisible`/`visible`, never with opacity.
  - The `<dl>` has no `aria-label`.
- **Ruling (from §3.13):** `const AttentionIcon = toneIcons.warning`, so the icon follows the 2A tone map. VFG's "big numbers" rule holds: the value string is `"text-metric num text-foreground"`.

What users will see: nothing yet. On the pages that move later, the number boxes lose their fills and become one strip (§1 "สิ่งที่พนักงานจะเห็น").

Not in this task:
- callers (Task 13 onward); `MetricCard` (`ui/metric-card.tsx`, deleted in 2B-5, VFG:64 and :90 untouched)
- the skeleton `MetricGridSkeleton` (2B-4, I28)
- messages; docs (Task 26)
- LFG: `ui/stat-strip.tsx` is in `NAV_PRIMITIVES` (LN1) and is skipped by LS1 as a `ui/` file.

Do not run a formatter.

**Files:**
- Create: `src/components/ui/stat-strip.tsx` (LF)
- Modify: `tests/list-primitives-ui.test.ts` (LF, one block appended)
- Temp folder only: `task09-block.ts`

**Must keep passing without edits:** `tests/visual-foundation-guards.test.ts` ("big numbers, codes and faint text": `text-metric` with `num` in one class string; no faint text on a status fill), `tests/list-frame-guards.test.ts`, `tests/form-migration-guards.test.ts`.

**Interfaces:**
- Consumes: `Link` (`href`, `scroll`, `aria-current`), `ChevronRight` from `lucide-react`, `toneIcons` from `@/components/ui/tone-icons`, `cn`; Task 6's `assertListPrimitiveRules`.
- Produces:
  - `export type StatStripItem = { key: string; label: string; value: string; unit?: string; foot?: React.ReactNode; footTitle?: string; href?: string; current?: boolean; scroll?: boolean; attention?: boolean }`. `value` is already formatted with `formatCount` or `formatMoney`.
  - `export function StatStrip(props: { items: readonly StatStripItem[]; className?: string })`, with `data-slot="stat-strip"` on the `<dl>` and `data-slot="stat"` on each cell.

New classes (none of them in `src/` at HEAD): `after:absolute`, `after:inset-0`, `grid-rows-subgrid`, `row-span-3`, `group-hover:visible`, `group-focus-within:visible`, `has-[a:focus-visible]:ring-2`, `has-[a:focus-visible]:ring-inset`, `has-[a:focus-visible]:ring-ring`, `lg:auto-cols-fr`, `lg:grid-cols-none`, `lg:grid-flow-col`, `lg:grid-rows-[repeat(3,auto)]`, `max-lg:[&>:last-child:nth-child(odd)]:col-span-2`, `md:px-5`, `md:py-4`, `right-4`, `top-4.5`, `text-metric` and `shadow-[inset_0_-2px_0_var(--primary)]`. All of them compile (drafter's probe), for example `grid-template-rows: subgrid`, `@media (width < 64rem) { &>:last-child:nth-child(odd) { grid-column: span 2 / span 2 } }` and `&:has(*:is(a:focus-visible))`.

- [ ] **Step 1: Check what this task builds on**

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2b`

Run: `git status --short src tests messages` then `node <temp>/p2b1-ui-precheck.mjs 9`
Expected: `git status` prints nothing. The script prints:
```
ok      Task 1: tests/list-frame-guards.test.ts exists
ok      Task 3: tests/list-primitives-ui.test.ts is LF and imports assert, readFileSync and test
ok      Task 6 declared assertListPrimitiveRules in tests/list-primitives-ui.test.ts
ok      src/components/ui/stat-strip.tsx is not there yet
ok      toneIcons.warning is TriangleAlert
preconditions hold for Task 9
```
On any `MISSING` line, stop and report it.

- [ ] **Step 2: Write the failing test**

Save this block as `task09-block.ts` in your temp folder:

```ts
test("StatStrip is one flat frame of dt/dd cells; a filter cell is primary-soft, never a status fill (2B §3.13)", () => {
  const path = "src/components/ui/stat-strip.tsx"
  const source = readFileSync(path, "utf8").replace(/\r\n/g, "\n")
  assertListPrimitiveRules(path, source)
  assert.match(source, /export function StatStrip\(\{ items, className \}: \{ items: readonly StatStripItem\[\]; className\?: string \}\)/)
  assert.match(source, /<dl data-slot="stat-strip" className=\{cn\("grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border max-lg:\[&>:last-child:nth-child\(odd\)\]:col-span-2 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none lg:grid-rows-\[repeat\(3,auto\)\]", className\)\}>/)
  assert.equal(source.match(/const statClasses = "([^"]+)"/)?.[1], "group relative row-span-3 grid grid-rows-subgrid content-start gap-y-1 bg-surface px-4 py-3 transition-colors md:px-5 md:py-4")
  assert.equal(source.match(/const statLinkClasses = "([^"]+)"/)?.[1], "has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-inset has-[a:focus-visible]:ring-ring")
  assert.equal(source.match(/const statCurrentClasses = "([^"]+)"/)?.[1], "bg-primary-soft shadow-[inset_0_-2px_0_var(--primary)]")
  assert.match(source, /className=\{cn\(statClasses, item\.href && !item\.current && "hover:bg-background", item\.href && statLinkClasses, item\.current && statCurrentClasses\)\}/)
  assert.match(source, /<dt className="text-meta font-medium text-muted-foreground text-balance">/)
  assert.match(source, /aria-current=\{item\.current \? "page" : undefined\} className="after:absolute after:inset-0 focus-visible:outline-none"/)
  assert.match(source, /<ChevronRight aria-hidden="true" className="pointer-events-none absolute top-4\.5 right-4 size-3\.5 text-faint-foreground invisible group-hover:visible group-focus-within:visible" \/>/)
  assert.match(source, /<span className="text-metric num text-foreground">\{item\.value\}<\/span>/)
  assert.match(source, /<span className="text-base font-medium text-faint-foreground">\{item\.unit\}<\/span>/)
  assert.match(source, /cn\("flex min-w-0 items-center gap-1 text-meta", item\.attention \? "text-warning" : "text-faint-foreground"\)/)
  assert.match(source, /const AttentionIcon = toneIcons\.warning/)
  assert.match(source, /<span className="truncate" title=\{item\.footTitle\}>\{item\.foot\}<\/span>/)
  assert.doesNotMatch(source, /\bbg-(?:success|warning|danger|info)-soft\b|\bborder-(?:success|warning|danger|info)-border\b/, "no status fills or borders (DESIGN.md: color only marks what needs action)")
  assert.doesNotMatch(source, /<dl\b[^>]*aria-label/, "a dl takes no aria-label")
  for (const tag of ["<dl ", "<dt ", "<dd "]) assert.ok(source.includes(tag), `uses ${tag.trim()}`)
})
```

Run: `node <temp>/p2b1-append.mjs <temp>/task09-block.ts tests/list-primitives-ui.test.ts`
Expected: `appended <temp>/task09-block.ts to tests/list-primitives-ui.test.ts`

Run: `node --test --test-name-pattern="^StatStrip " tests/list-primitives-ui.test.ts`
Expected: FAIL, `tests 1 · pass 0 · fail 1`, with `Error: ENOENT: no such file or directory, open '…\src\components\ui\stat-strip.tsx'`.

- [ ] **Step 3: Create `src/components/ui/stat-strip.tsx`**

Create the file with this content, LF line endings:

```tsx
import type React from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { toneIcons } from "@/components/ui/tone-icons"
import { cn } from "@/lib/utils"

export type StatStripItem = {
  key: string
  label: string
  // Already formatted (formatCount, formatMoney). Never a raw number.
  value: string
  // "บาท", "รายการ"
  unit?: string
  // One line, cut with an ellipsis; footTitle is its title for the cut text.
  foot?: React.ReactNode
  footTitle?: string
  // The whole cell is a link (a filter, or a drill-down to the list).
  href?: string
  // The filter in use: aria-current="page", primary-soft fill and a 2px line.
  current?: boolean
  scroll?: boolean
  // Needs attention: the foot line turns warning with an icon. No fill and no border.
  attention?: boolean
}

// Mockup .stat: a subgrid of three rows (label, value, foot), so labels and values line up across the strip.
const statClasses = "group relative row-span-3 grid grid-rows-subgrid content-start gap-y-1 bg-surface px-4 py-3 transition-colors md:px-5 md:py-4"
// The stretched link draws no ring of its own (the cell has no room outside); the cell draws it.
const statLinkClasses = "has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-inset has-[a:focus-visible]:ring-ring"
const statCurrentClasses = "bg-primary-soft shadow-[inset_0_-2px_0_var(--primary)]"
const AttentionIcon = toneIcons.warning

// Mockup .stats: one frame with 1px lines between the cells, no status fills (DESIGN.md: color only marks what needs
// action). Two columns below lg, where a last cell left alone fills its row; one row of equal cells from lg.
// A <dl> takes no aria-label: a caller that needs a name wraps it in <section aria-labelledby>. Server-safe.
export function StatStrip({ items, className }: { items: readonly StatStripItem[]; className?: string }) {
  return (
    <dl data-slot="stat-strip" className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border max-lg:[&>:last-child:nth-child(odd)]:col-span-2 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none lg:grid-rows-[repeat(3,auto)]", className)}>
      {items.map((item) => (
        <div key={item.key} data-slot="stat" className={cn(statClasses, item.href && !item.current && "hover:bg-background", item.href && statLinkClasses, item.current && statCurrentClasses)}>
          <dt className="text-meta font-medium text-muted-foreground text-balance">
            {item.href ? (
              <Link href={item.href} scroll={item.scroll} aria-current={item.current ? "page" : undefined} className="after:absolute after:inset-0 focus-visible:outline-none">
                {item.label}
                <ChevronRight aria-hidden="true" className="pointer-events-none absolute top-4.5 right-4 size-3.5 text-faint-foreground invisible group-hover:visible group-focus-within:visible" />
              </Link>
            ) : (
              item.label
            )}
          </dt>
          <dd className="flex min-w-0 items-baseline gap-1">
            <span className="text-metric num text-foreground">{item.value}</span>
            {item.unit ? <span className="text-base font-medium text-faint-foreground">{item.unit}</span> : null}
          </dd>
          {item.foot ? (
            <dd className={cn("flex min-w-0 items-center gap-1 text-meta", item.attention ? "text-warning" : "text-faint-foreground")}>
              {item.attention ? <AttentionIcon className="size-3.5 shrink-0" aria-hidden="true" /> : null}
              <span className="truncate" title={item.footTitle}>{item.foot}</span>
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  )
}
```

- [ ] **Step 4: Run the tests for this task**

Run: `node --test --test-name-pattern="^StatStrip " tests/list-primitives-ui.test.ts`
Expected: PASS, `tests 1 · pass 1 · fail 0`.

Run: `node --test tests/list-primitives-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `fail 0`.

- [ ] **Step 5: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 0 fail and 1 more test than before Step 2; tsc no errors; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: `git diff --stat` shows 1 file, `tests/list-primitives-ui.test.ts` with 23 insertions. `git status` also lists `?? src/components/ui/stat-strip.tsx` (65 lines).

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/stat-strip.tsx tests/list-primitives-ui.test.ts
git commit -m "feat(ui): StatStrip, one flat strip of numbers (2B plan 1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 2 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 2B-1 dev-app check (Task 25):** checked on the pages of Tasks 13–21: no fills; the filter cell is `primary-soft` with a line under it; 2 columns below 1024 and one row from 1024; numbers in th-TH; in forced colors the line under the chosen cell shows.

---

### Task 10: `ui/key-value-list.tsx` (label and value pairs)

Spec §10.3 row 10, with §3.14, §3.18 ruling 26, R-n and DESIGN.md:514 (an empty value is `Nil`; 0 and false are values). One new primitive, one commit. It has no caller in 2B-1; the first callers are findings and `rounds/[id]` in 2B-2. The file is LF.

Rulings this task applies:
- **§3.14:** one form only (mockup `dl.kv`). It has a 120px label column and `minmax(0,1fr)` values. Below `sm` it is one column, with 2px between a label and its value and 8px before the next label (`max-sm:[&>dd+dt]:mt-2`). 120px is a layout width inside this component, not a token (2A I21).
- **R-n:** values go through `orNil(item.value, item.nilLabel)`, so `null`, `undefined` and blank strings show `Nil` with its screen-reader words, while 0 and `false` render as values. No `"-"` anywhere.
- **Ruling (from §3.14):** pairs are real `dt`/`dd` under `React.Fragment` keyed by `item.key ?? index`. `label` and `value` are `ReactNode`, so a caller can pass a `tag` code or a link.

What users will see: nothing yet.

Not in this task: callers (2B-2 to 2B-4, LK1 lowers there); the fact bar and phone left/right rows (phase 3); messages; docs (Task 26). LFG: LK1 skips `ui/`, and LV2 finds no `"-"`.

Do not run a formatter.

**Files:**
- Create: `src/components/ui/key-value-list.tsx` (LF)
- Modify: `tests/list-primitives-ui.test.ts` (LF, one block appended)
- Temp folder only: `task10-block.ts`

**Must keep passing without edits:** `tests/feedback-states-ui.test.ts` (`Nil` is not touched), `tests/list-frame-guards.test.ts`, `tests/visual-foundation-guards.test.ts`, `tests/form-migration-guards.test.ts`.

**Interfaces:**
- Consumes: `orNil(value: ReactNode, label?: string): ReactNode` from `@/components/ui/nil`; `Fragment` and `type ReactNode` from `react`; `cn`; Task 6's `assertListPrimitiveRules`.
- Produces: `export type KeyValueItem = { key?: string; label: ReactNode; value: ReactNode; nilLabel?: string }` and `export function KeyValueList(props: { items: readonly KeyValueItem[]; className?: string })`, with `data-slot="key-value-list"` on the `<dl>`.

New classes (none of them in `src/` at HEAD): `grid-cols-[120px_minmax(0,1fr)]`, `max-sm:grid-cols-1`, `max-sm:gap-y-0.5`, `max-sm:[&>dd+dt]:mt-2` and `m-0`. All of them compile (drafter's probe: `@media (width < 40rem) { &>dd+dt { margin-top: calc(var(--spacing) * 2) } }`).

- [ ] **Step 1: Check what this task builds on**

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2b`

Run: `git status --short src tests messages` then `node <temp>/p2b1-ui-precheck.mjs 10`
Expected: `git status` prints nothing. The script prints:
```
ok      Task 1: tests/list-frame-guards.test.ts exists
ok      Task 3: tests/list-primitives-ui.test.ts is LF and imports assert, readFileSync and test
ok      Task 6 declared assertListPrimitiveRules in tests/list-primitives-ui.test.ts
ok      src/components/ui/key-value-list.tsx is not there yet
ok      orNil(value, label) from ui/nil.tsx
preconditions hold for Task 10
```
On any `MISSING` line, stop and report it.

- [ ] **Step 2: Write the failing test**

Save this block as `task10-block.ts` in your temp folder:

```ts
test("KeyValueList pairs dt and dd in a 120px label column and shows Nil for an empty value (2B §3.14)", () => {
  const path = "src/components/ui/key-value-list.tsx"
  const source = readFileSync(path, "utf8").replace(/\r\n/g, "\n")
  assertListPrimitiveRules(path, source)
  assert.match(source, /export type KeyValueItem = \{ key\?: string; label: ReactNode; value: ReactNode; nilLabel\?: string \}/)
  assert.match(source, /export function KeyValueList\(\{ items, className \}: \{ items: readonly KeyValueItem\[\]; className\?: string \}\)/)
  assert.match(source, /<dl data-slot="key-value-list" className=\{cn\("grid grid-cols-\[120px_minmax\(0,1fr\)\] gap-x-4 gap-y-2 max-sm:grid-cols-1 max-sm:gap-y-0\.5 max-sm:\[&>dd\+dt\]:mt-2", className\)\}>/)
  assert.match(source, /<Fragment key=\{item\.key \?\? index\}>/)
  assert.match(source, /<dt className="text-meta text-faint-foreground">\{item\.label\}<\/dt>/)
  assert.match(source, /<dd className="m-0 min-w-0 break-words text-sm text-foreground">\{orNil\(item\.value, item\.nilLabel\)\}<\/dd>/)
  assert.match(source, /import \{ orNil \} from "@\/components\/ui\/nil"/)
  assert.doesNotMatch(source, /"-"|<div\b/, "an empty value is Nil, never a written dash; pairs are dt and dd, not divs")
})
```

Run: `node <temp>/p2b1-append.mjs <temp>/task10-block.ts tests/list-primitives-ui.test.ts`
Expected: `appended <temp>/task10-block.ts to tests/list-primitives-ui.test.ts`

Run: `node --test --test-name-pattern="^KeyValueList " tests/list-primitives-ui.test.ts`
Expected: FAIL, `tests 1 · pass 0 · fail 1`, with `Error: ENOENT: no such file or directory, open '…\src\components\ui\key-value-list.tsx'`.

- [ ] **Step 3: Create `src/components/ui/key-value-list.tsx`**

Create the file with this content, LF line endings:

```tsx
import { Fragment, type ReactNode } from "react"
import { orNil } from "@/components/ui/nil"
import { cn } from "@/lib/utils"

// nilLabel is what a screen reader says for an empty value, for example "ไม่มีผู้ถือครอง".
export type KeyValueItem = { key?: string; label: ReactNode; value: ReactNode; nilLabel?: string }

// Mockup dl.kv: a 120px label column beside the values; below sm one column, with 8px before each next label.
// An empty value shows Nil; 0 and false are values. 120px is a layout width inside this component, not a token.
// Server-safe.
export function KeyValueList({ items, className }: { items: readonly KeyValueItem[]; className?: string }) {
  return (
    <dl data-slot="key-value-list" className={cn("grid grid-cols-[120px_minmax(0,1fr)] gap-x-4 gap-y-2 max-sm:grid-cols-1 max-sm:gap-y-0.5 max-sm:[&>dd+dt]:mt-2", className)}>
      {items.map((item, index) => (
        <Fragment key={item.key ?? index}>
          <dt className="text-meta text-faint-foreground">{item.label}</dt>
          <dd className="m-0 min-w-0 break-words text-sm text-foreground">{orNil(item.value, item.nilLabel)}</dd>
        </Fragment>
      ))}
    </dl>
  )
}
```

- [ ] **Step 4: Run the tests for this task**

Run: `node --test --test-name-pattern="^KeyValueList " tests/list-primitives-ui.test.ts`
Expected: PASS, `tests 1 · pass 1 · fail 0`.

Run: `node --test tests/list-primitives-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/feedback-states-ui.test.ts`
Expected: PASS, `fail 0`.

- [ ] **Step 5: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 0 fail and 1 more test than before Step 2; tsc no errors; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: `git diff --stat` shows 1 file, `tests/list-primitives-ui.test.ts` with 14 insertions. `git status` also lists `?? src/components/ui/key-value-list.tsx` (22 lines).

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/key-value-list.tsx tests/list-primitives-ui.test.ts
git commit -m "feat(ui): KeyValueList for label and value pairs (2B plan 1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 2 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 2B-1 dev-app check (Task 25):** nothing (no caller in 2B-1). Long Thai labels in 120px (§3.19 risk 8) and copying `Nil` into Excel (risk 10) are checked in 2B-2 and 2B-4.

---

### Task 11: `ui/content-panel.tsx` · `divided`, `flush` and `ContentPanelRows`

Spec §10.3 row 11, with §3.15 and §3.18 ruling 27. One edited primitive, one commit. The file is LF. The 6 existing callers do not pass `divided` and render exactly as before:
- `D/my-assets/page.tsx:51`, `:102`
- `D/my-assets/[id]/page.tsx:68`, `:96`
- `c/reports/reports-accounting-view.tsx:61`, `:88`

The first users of `divided` are 2B-4 and 2B-5.

Rulings this task applies:
- **§3.15:** `divided` follows the mockup `.panel`:
  - The frame is `getPanelClasses()` with no padding.
  - The head is at least 56px tall, with a line under it and a 16/20px gutter. `h2` is 16/600 `text-balance`, the description is `text-meta text-muted-foreground text-pretty`, and the actions sit in one wrapping row.
  - The body is padded `px-4 py-4 md:px-5`, or has no padding with `flush`.
- **§3.15:** `ContentPanelRows` is a `ul` with `divide-border-soft` rows, each `px-4 py-3 md:px-5`. It goes into `ContentPanel divided flush`, which never wraps a frame in a frame.
- **Ruling (spec gap), types:** `flush` only means something with `divided`, so the props are a union: `{ divided?: false; flush?: never } | { divided: true; flush?: boolean }`. `<ContentPanel flush>` without `divided` is a type error. The drafter type-checked both cases with `@ts-expect-error` in a scratch copy.
- **§3.15 "`divided={false}` render เหมือนวันนี้ทุก class":** the default return block is the old one, character for character. No `data-slot` is added to the default path either.

What users will see: nothing. No caller passes `divided` yet.

Not in this task: callers (2B-4, 2B-5); `EmptyNote padded` (unchanged); messages; docs (Task 26).

Do not run a formatter.

**Files:**
- Modify: `src/components/ui/content-panel.tsx` (LF, 2 replacements)
- Modify: `tests/list-primitives-ui.test.ts` (LF, one block appended)
- Temp folder only: `task11-block.ts`

**Must keep passing without edits:** `npx tsc --noEmit` over the 6 callers; `tests/visual-foundation-guards.test.ts` ("panels and bottom action bars are flat" reads `getPanelClasses`); `tests/design-system.test.ts`; `tests/list-frame-guards.test.ts`; `tests/form-migration-guards.test.ts`.

**Interfaces:**
- Consumes: `getPanelClasses` from `@/lib/design-system`, `cn`; Task 6's `assertListPrimitiveRules`.
- Produces:
  - `ContentPanel(props: { title?: string; description?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string } & ({ divided?: false; flush?: never } | { divided: true; flush?: boolean }))`.
  - `export function ContentPanelRows(props: React.ComponentProps<"ul">)` with `data-slot="content-panel-rows"`.
  - `data-slot="content-panel-head"` on the divided head.

New classes (none of them in `src/` at HEAD): `[&>*]:px-4`, `[&>*]:py-3`, `md:[&>*]:px-5`, `divide-border-soft` and `md:px-5`. All of them compile (drafter's probe: `divide-border-soft` → `border-color: var(--border-soft)` on `:where(& > :not(:last-child))`).

- [ ] **Step 1: Check what this task builds on**

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2b`

Run: `git status --short src tests messages` then `node <temp>/p2b1-ui-precheck.mjs 11`
Expected: `git status` prints nothing. The script prints:
```
ok      Task 1: tests/list-frame-guards.test.ts exists
ok      Task 3: tests/list-primitives-ui.test.ts is LF and imports assert, readFileSync and test
ok      Task 6 declared assertListPrimitiveRules in tests/list-primitives-ui.test.ts
ok      ui/content-panel.tsx is LF, has no divided yet, and holds the two quoted snippets
preconditions hold for Task 11
```
On any `MISSING` line, stop and report it.

Run: `git ls-files --eol src/components/ui/content-panel.tsx`
Expected: `w/lf`. Keep it LF.

- [ ] **Step 2: Write the failing test**

Save this block as `task11-block.ts` in your temp folder:

```ts
test("ContentPanel divided has a 56px head over a line and a padded or flush body; the default panel is unchanged (2B §3.15)", () => {
  const path = "src/components/ui/content-panel.tsx"
  const source = readFileSync(path, "utf8").replace(/\r\n/g, "\n")
  assertListPrimitiveRules(path, source)
  assert.match(source, /\| \{ divided\?: false; flush\?: never \}/)
  assert.match(source, /\| \{ divided: true; flush\?: boolean \}/)
  assert.match(source, /export function ContentPanel\(\{ title, description, actions, children, className, divided = false, flush = false \}: ContentPanelProps\)/)
  // The default path renders exactly as before 2B.
  assert.match(source, /<section className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5", className\)\}>/)
  assert.match(source, /<div className="mb-4 flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">/)
  assert.match(source, /\{actions \? <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">\{actions\}<\/div> : null\}/)
  // divided
  assert.match(source, /<section className=\{cn\(getPanelClasses\(\), className\)\}>/)
  assert.match(source, /<div data-slot="content-panel-head" className="flex min-h-14 min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2\.5 md:px-5">/)
  assert.match(source, /<h2 className="text-base font-semibold text-foreground text-balance">\{title\}<\/h2>/)
  assert.match(source, /<p className="text-meta text-muted-foreground text-pretty">\{description\}<\/p>/)
  assert.match(source, /\{actions \? <div className="flex flex-wrap items-center gap-2">\{actions\}<\/div> : null\}/)
  assert.match(source, /<div className=\{cn\("min-w-0 max-w-full", !flush && "px-4 py-4 md:px-5"\)\}>\{children\}<\/div>/)
  // rows
  assert.match(source, /export function ContentPanelRows\(\{ className, \.\.\.props \}: React\.ComponentProps<"ul">\)/)
  assert.match(source, /<ul data-slot="content-panel-rows" className=\{cn\("divide-y divide-border-soft \[&>\*\]:px-4 \[&>\*\]:py-3 md:\[&>\*\]:px-5", className\)\} \{\.\.\.props\} \/>/)
})
```

Run: `node <temp>/p2b1-append.mjs <temp>/task11-block.ts tests/list-primitives-ui.test.ts`
Expected: `appended <temp>/task11-block.ts to tests/list-primitives-ui.test.ts`

Run: `node --test --test-name-pattern="^ContentPanel " tests/list-primitives-ui.test.ts`
Expected: FAIL, `tests 1 · pass 0 · fail 1`, with `AssertionError … did not match the regular expression /\| \{ divided\?: false; flush\?: never \}/`. The shared rules pass first, because the file already exists and is server-safe.

- [ ] **Step 3: Add `divided`, `flush` and `ContentPanelRows` (`src/components/ui/content-panel.tsx`)**

Two exact replacements.

(1) The props type and the start of `ContentPanel`. The divided branch returns first, and the old return block below it stays as it is.

Replace:

```tsx
  className?: string
}

export function ContentPanel({ title, description, actions, children, className }: ContentPanelProps) {
  return (
```

with:

```tsx
  className?: string
} & (
  // The panel as it has always been: padding on the frame, no line under the head.
  | { divided?: false; flush?: never }
  // Mockup .panel: a 56px head with a line under it, and a padded body. flush drops the body padding for content
  // that brings its own (DataTable framed={false}, ContentPanelRows, EmptyNote padded). Never a frame in a frame.
  | { divided: true; flush?: boolean }
)

export function ContentPanel({ title, description, actions, children, className, divided = false, flush = false }: ContentPanelProps) {
  if (divided) {
    return (
      <section className={cn(getPanelClasses(), className)}>
        {title || description || actions ? (
          <div data-slot="content-panel-head" className="flex min-h-14 min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2.5 md:px-5">
            {title || description ? (
              <div className="min-w-0">
                {title ? <h2 className="text-base font-semibold text-foreground text-balance">{title}</h2> : null}
                {description ? <p className="text-meta text-muted-foreground text-pretty">{description}</p> : null}
              </div>
            ) : null}
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        ) : null}
        <div className={cn("min-w-0 max-w-full", !flush && "px-4 py-4 md:px-5")}>{children}</div>
      </section>
    )
  }

  return (
```

(2) The end of the file. The file keeps one line break at its end.

Replace:

```tsx
      <div className="min-w-0 max-w-full">{children}</div>
    </section>
  )
}
```

with:

```tsx
      <div className="min-w-0 max-w-full">{children}</div>
    </section>
  )
}

// Mockup .rows: rows split by soft lines, each with the panel's side gutter. Put it in ContentPanel divided flush.
export function ContentPanelRows({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul data-slot="content-panel-rows" className={cn("divide-y divide-border-soft [&>*]:px-4 [&>*]:py-3 md:[&>*]:px-5", className)} {...props} />
}
```

Check: `grep -c "min-w-0 max-w-full" src/components/ui/content-panel.tsx` prints `2` (the divided body and the old body).

- [ ] **Step 4: Run the tests for this task**

Run: `node --test --test-name-pattern="^ContentPanel " tests/list-primitives-ui.test.ts`
Expected: PASS, `tests 1 · pass 1 · fail 0`.

Run: `node --test tests/list-primitives-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/design-system.test.ts`
Expected: PASS, `fail 0`.

- [ ] **Step 5: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 0 fail and 1 more test than before Step 2. tsc reports no errors: the 6 callers match the `{ divided?: false }` member. Lint: 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: `git diff --stat` shows exactly 2 files: `src/components/ui/content-panel.tsx` with 32 insertions and 2 deletions, and `tests/list-primitives-ui.test.ts` with 23 insertions. `git status` lists nothing untracked.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/content-panel.tsx tests/list-primitives-ui.test.ts
git commit -m "feat(ui): ContentPanel divided and flush, and ContentPanelRows (2B plan 1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 2 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 2B-1 dev-app check (Task 25):** `/th/my-assets`, `/th/my-assets/<id>` and the accounting report view look exactly as before (the default path).

---

### Task 12: `MasterDataSearch` on `SearchField` + `Button` (frameless search toolbar, I8)

Spec §10.3 row 12, with §3.16, §6.3.4, §6.3.5, §6.13 table B item 4, I8, I17 and I23. One edited file, one commit. `src/components/master-data/master-data-layout.tsx` is **CRLF**: edit it with exact-string replacement only. Task 3 already edited this file (`MasterDataHeader` is a thin `PageHeader` wrapper, I2). This task changes only the imports and the body of `MasterDataSearch`.

Rulings this task applies:
- **I8:** the markup of §6.3.5 is used as one block:
  - `<form role="search">` with no card, and `mb-4` kept. `mb-4` beats the page root's `space-y-6`, so the search sits 16px above its table (intended).
  - Hidden inputs come first.
  - `SearchField name="search" … aria-label={submitLabel} fieldSize="md" className="sm:flex-[1_1_320px]"`, then `Button type="submit" variant="outline" size="md"`.
- **I8, the name:** the field is named by `aria-label={submitLabel}`. That is "ค้นหา" at all 6 callers (`tCommon("search")`), the same name as the register search. The placeholder is still read as its description.
- **I23, B3(4):** this is a toolbar with no visible label, so it has no frame and is 36px from `md`. Below `sm` the field and the button stack at 44px, as the old `flex-col` did. From `sm` they share one row: the field grows and the button is as wide as its word.
- **I17:** the props stay as they are (`action, defaultValue, placeholder, submitLabel, hiddenInputs = {}`). None of the 6 callers changes, so `tests/operational-return-navigation.test.ts:69`, `:83` and `tests/audit-pending-mobile-ux.test.ts:14-15` pass without edits. 2B-2 appends `pageSize`/`page` at the call sites.
- **§3.16:** no `onClear`, because a server page cannot pass a function. The file stays without `"use client"`; `Button` and `SearchField` have no hooks.
- **Ruling, imports:** `Search` leaves the `lucide-react` import, because the icon now comes from `SearchField`. `Button` joins Task 3's `buttonVariants` import from `@/components/ui/button`, giving `{ Button, buttonVariants }`, the form 12 files already use. `SearchField` comes in after `PageHeader`. Task 3's wrapper test in `tests/list-primitives-ui.test.ts` pins the old import line, so this task moves that one pin to `{ Button, buttonVariants }` (Step 3 (3)).

What users will see (immediately, on 6 pages: `/th/admin/users`, `/th/master-data/departments`, `/th/audit/findings`, `/th/audit/rounds`, `/th/audit/rounds/<id>`, `/th/audit/rounds/<id>/pending`):
- The search bar loses its white card.
- Field and button are 36px tall on desktop (they were 40) and 44px on phones.
- The field is white with the 2A border and focus halo.
- The button is the outline button.
- Screen readers name the field "ค้นหา" (today it has no name).

Not in this task:
- the callers (2B-2 appends `pageSize`, I17)
- `MasterDataHeader` (Task 3), and `ColumnHeader`, `SortableColumnHeader`, `MasterDataPagination` (2B-5)
- `audit-scan-search.tsx`, `audit-scan-room-picker.tsx` and `global-search.tsx` (O20, phase 3)
- messages; docs (Task 26)
- guard budgets: the LFG counts of this file (LH2 1, LT1 2, LT2 1, LT4 1, LT5 2, LN2 1) and VFG do not change, because the changed lines hold none of them (drafter's count with the §9.3.1 counters before and after). `MIGRATED_LIST_FILES` does not get this file: 2B touches it again until 2B-5 (§9.8).

Do not run a formatter.

**Files:**
- Modify: `src/components/master-data/master-data-layout.tsx` (CRLF, 2 replacements)
- Modify: `tests/list-primitives-ui.test.ts` (LF, one block appended and one line of Task 3's wrapper test replaced)
- Temp folder only: `task12-block.ts`

**Must keep passing without edits:**
- `tests/operational-return-navigation.test.ts` (6 tests) and `tests/audit-pending-mobile-ux.test.ts` (3 tests): the call sites and their `hiddenInputs` (I17).
- `tests/master-data-workspace.test.ts` (1 test): no `MasterDataWorkspaceNav` in the layout.
- `tests/asset-register-filter-ui.test.ts` and `tests/supplier-adaptive-ui.test.ts` as Task 3 left them: their `MasterDataHeader` pins read this file.
- `tests/field-primitives.test.ts` (16 tests): `SearchField` is not touched.
- `tests/list-frame-guards.test.ts`, `tests/visual-foundation-guards.test.ts`, `tests/form-migration-guards.test.ts`.

**Interfaces:**
- Consumes:
  - 2A: `SearchField` (`fieldSize`, every other prop to its `Input`, `className` on its wrapper) from `@/components/ui/search-field`, and `Button` (`type`, `variant`, `size`) from `@/components/ui/button`.
  - Task 3: `master-data-layout.tsx` with these three lines in a row, `import { ArrowDown, ArrowUp, Plus, Search } from "lucide-react"`, `import { buttonVariants } from "@/components/ui/button"` and `import { PageHeader } from "@/components/ui/page-header"`, and `MasterDataSearch` unchanged since `d38a0ee`.
  - Task 6: `assertListPrimitiveRules`, not called here, because the layout is not a `ui/` primitive.
- Produces: `MasterDataSearch` with the same props and the I8 markup. `master-data-layout.tsx` no longer imports `Search`. 2B-2 adds `pageSize`/`page` at the call sites, and 2B-5 deletes the other exports.

New classes (none of them in `src/` at HEAD): `sm:flex-[1_1_320px]`, which compiles to `@media (width >= 40rem) { flex: 1 1 320px }` (drafter's probe).

- [ ] **Step 1: Check what this task builds on**

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2b`

Run: `git status --short src tests messages` then `node <temp>/p2b1-ui-precheck.mjs 12`
Expected: `git status` prints nothing. The script prints:
```
ok      Task 1: tests/list-frame-guards.test.ts exists
ok      Task 3: tests/list-primitives-ui.test.ts is LF and imports assert, readFileSync and test
ok      Task 6 declared assertListPrimitiveRules in tests/list-primitives-ui.test.ts
ok      src/components/master-data/master-data-layout.tsx is CRLF
ok      Task 3: MasterDataHeader is a PageHeader wrapper and the three quoted import lines are there
ok      MasterDataSearch still renders the quoted card, raw input and raw button
ok      2A SearchField takes fieldSize and passes aria-label to its Input
ok      MasterDataSearch has its 6 callers
preconditions hold for Task 12
```
On any `MISSING` line, stop and report it. If only the import line fails, Task 3 wrote its `buttonVariants` import in another form: report the three import lines you find, and do not guess.

Run: `git ls-files --eol src/components/master-data/master-data-layout.tsx tests/list-primitives-ui.test.ts`
Expected: `w/crlf` for the layout and `w/lf` for the test file. Keep both as they are.

- [ ] **Step 2: Write the failing test**

Save this block as `task12-block.ts` in your temp folder. It reads the CRLF layout with `\r` stripped, so its `\n` regexes are safe:

```ts
test("MasterDataSearch is a frameless search toolbar on SearchField and Button, with its props unchanged (2B §6.3.5, I8)", () => {
  const source = readFileSync("src/components/master-data/master-data-layout.tsx", "utf8").replace(/\r\n/g, "\n")
  const search = source.match(/export function MasterDataSearch\([\s\S]*?\n\}\n/)?.[0] ?? ""
  assert.ok(search, "function MasterDataSearch not found")
  assert.match(search, /^export function MasterDataSearch\(\{\n  action,\n  defaultValue,\n  placeholder,\n  submitLabel,\n  hiddenInputs = \{\},\n\}: \{/)
  assert.match(search, /<form role="search" action=\{action\} className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">/)
  assert.match(search, /<input key=\{name\} type="hidden" name=\{name\} value=\{value\} \/>/)
  assert.match(search, /<SearchField name="search" defaultValue=\{defaultValue\} placeholder=\{placeholder\} aria-label=\{submitLabel\} fieldSize="md" className="sm:flex-\[1_1_320px\]" \/>/)
  assert.match(search, /<Button type="submit" variant="outline" size="md">\{submitLabel\}<\/Button>/)
  assert.ok(search.indexOf('type="hidden"') < search.indexOf("<SearchField"), "hidden inputs come before the visible field")
  assert.doesNotMatch(search, /<input\s+type="search"|<button\b|rounded-lg border|bg-surface p-4|onClear/)
  assert.match(source, /import \{ Button, buttonVariants \} from "@\/components\/ui\/button"/)
  assert.match(source, /import \{ SearchField \} from "@\/components\/ui\/search-field"/)
  assert.doesNotMatch(source, /import \{[^}]*\bSearch\b[^}]*\} from "lucide-react"/, "the Search icon left with the raw field")
  assert.doesNotMatch(source, /"use client"/)
})
```

Run: `node <temp>/p2b1-append.mjs <temp>/task12-block.ts tests/list-primitives-ui.test.ts`
Expected: `appended <temp>/task12-block.ts to tests/list-primitives-ui.test.ts`

Run: `node --test --test-name-pattern="^MasterDataSearch " tests/list-primitives-ui.test.ts`
Expected: FAIL, `tests 1 · pass 0 · fail 1`, with `AssertionError … did not match the regular expression /<form role="search" action=\{action\} className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">/`. The props pin above it passes, which shows the API has not changed.

- [ ] **Step 3: Move `MasterDataSearch` onto the primitives (`src/components/master-data/master-data-layout.tsx`, CRLF)**

Two exact replacements in the layout and one in the test file. Make all three before you compile or test: (1) drops the `Search` icon that (2) stops using, and (3) moves Task 3's pin of the import line that (1) changes.

(1) Imports. `Search` goes, `Button` joins Task 3's `buttonVariants` import, and `SearchField` comes in.

Replace:

```tsx
import { ArrowDown, ArrowUp, Plus, Search } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
```

with:

```tsx
import { ArrowDown, ArrowUp, Plus } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { SearchField } from "@/components/ui/search-field"
```

(2) The body of `MasterDataSearch`. Its props (`:42-54` at `d38a0ee`) stay as they are.

Replace:

```tsx
  return (
    <div className="mb-4 rounded-lg border border-border bg-surface p-4">
      <form className="flex flex-col gap-3 sm:flex-row" action={action}>
        {Object.entries(hiddenInputs).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="search"
            defaultValue={defaultValue}
            placeholder={placeholder}
            className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
        >
          {submitLabel}
        </button>
      </form>
    </div>
  )
}
```

with:

```tsx
  // A toolbar, not a card (B3(4)): no frame, 36px from md, stacked at 44px below sm. mb-4 beats the page root's
  // space-y-6, so the search sits 16px above its table. The field is named by the button's word ("ค้นหา"), like
  // the register search; the placeholder is read as its description. No clear button: a server page has no handler.
  return (
    <form role="search" action={action} className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      {Object.entries(hiddenInputs).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SearchField name="search" defaultValue={defaultValue} placeholder={placeholder} aria-label={submitLabel} fieldSize="md" className="sm:flex-[1_1_320px]" />
      <Button type="submit" variant="outline" size="md">{submitLabel}</Button>
    </form>
  )
}
```

(3) `tests/list-primitives-ui.test.ts` (LF), in Task 3's test `MasterDataHeader is a thin wrapper of PageHeader until its last callers move (I2)`.

Replace:

```ts
  assert.match(layout, /import \{ buttonVariants \} from "@\/components\/ui\/button"/)
```

with:

```ts
  assert.match(layout, /import \{ Button, buttonVariants \} from "@\/components\/ui\/button"/)
```

Check: `grep -n "<input\|<button\|Search\b" src/components/master-data/master-data-layout.tsx` prints exactly two lines, `export function MasterDataSearch({` and `<input key={name} type="hidden" name={name} value={value} />`. `SearchField` does not match `Search\b`, and the comment holds "search" only in lower case.

- [ ] **Step 4: Run the tests for this file**

Run: `node --test --test-name-pattern="^MasterDataSearch " tests/list-primitives-ui.test.ts`
Expected: PASS, `tests 1 · pass 1 · fail 0`.

Run: `node --test tests/operational-return-navigation.test.ts tests/audit-pending-mobile-ux.test.ts tests/master-data-workspace.test.ts tests/field-primitives.test.ts`
Expected: PASS, `tests 26 · pass 26 · fail 0`.

Run: `node --test tests/list-primitives-ui.test.ts tests/asset-register-filter-ui.test.ts tests/supplier-adaptive-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `fail 0`.

- [ ] **Step 5: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 0 fail and 1 more test than before Step 2; tsc no errors; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- `git diff --stat` shows exactly 2 files: `src/components/master-data/master-data-layout.tsx` with 13 insertions and 25 deletions, and `tests/list-primitives-ui.test.ts` with 18 insertions and 1 deletion.
- Nothing is untracked.
- If the layout shows every line changed, it was normalized: restore CRLF before you commit.

- [ ] **Step 6: Commit**

```bash
git add src/components/master-data/master-data-layout.tsx tests/list-primitives-ui.test.ts
git commit -m "feat(ui): MasterDataSearch as a frameless toolbar on SearchField and Button (2B plan 1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 2 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 2B-1 dev-app check (Task 25, row "หน้าที่ของกลางเปลี่ยนก่อน plan ของหน้า"):**
- Check the 6 pages at 1440, 768 and 375 (`/th/admin/users`, `/th/master-data/departments`, `/th/audit/findings`, `/th/audit/rounds`, `/th/audit/rounds/<id>`, `/th/audit/rounds/<id>/pending`):
  - no card around the search
  - field and button 36px on desktop
  - stacked full width at 44px on 375
  - one row from 640
- Enter in the field and the "ค้นหา" button both submit.
- The hidden context survives a search:
  - findings keep `status`, `roundId` and `findingType`
  - pending keeps `returnTo` and `locationId`
  - `rounds/<id>` keeps `result`, `page`, `pageSize` and `returnTo`
- NVDA reads the field as "ค้นหา", followed by the placeholder.
- axe shows no `label` violation on `/th/admin/users`.
- With reduced motion, the field's spinner never shows (no `loading` is passed).

---

### Task 13: `D/master-data/branches/page.tsx` on the list primitives (and the two page test files)

Spec §10.3 row 13, with §5.3 (row "branches" and the B5 rules above the table), §5.1 (the shared rules of every list), §5.9.1 (the past-the-end rule), §6.4 and §6.5 row 1 (the filter form), §3.4, §3.5, §3.8, §3.11, §3.13 (how a page calls the primitives), §4.4.2 and §4.6.1 (header and page root), rulings I5, I11, I16, I21, I33, B5, B6 and R-h, R-n, R-p. One page, one commit. The page is CRLF: edit it with exact-string replacement only. This is the first list page on the primitives; Tasks 14–21 copy its shape.

Rulings this task applies:
- **I5, B5:** the page renders `RowActions` itself, with data props only: `code` = the branch code, `name` = the branch name, `menuLabel={tCommon("moreActionsFor", { code })}`, `next` = the edit link with `returnTo` (the same `editHref` the row opens), `groups={[]}`, and `` deleteAction={{ endpoint: `/api/branches/${branch.id}` }} ``, the endpoint of `branch-delete-button.tsx`. "ลบ" therefore sits in ⋯ and asks the same `useDeleteAction` confirm. The wrapper has no caller left and is deleted in this commit. `master-data-delete-button.tsx` stays (pin `tests/confirm-dialog-ui.test.ts:36`, 2D deletes it).
- **R-h:** the page calls `PageHeader` directly (title, `meta={t("subtitle")}`, the create link at `buttonVariants({ size: "md" })` with `Plus`), so `MasterDataHeader` loses this caller and LFG LH2 drops by 2. The root becomes `space-y-6` (§4.6.1 rule 1), so the header needs no margin.
- **§6.5 row 1, I23:** the filter card becomes `FilterPanel` (labelled fields, `lg`, with a frame). The grid class, the four hidden inputs and every `options` array stay as they are. The search is `Field label={tCommon("search")}` + `SearchField`; the three selects are `FilterSelect`; the two hand-written buttons become `FilterFormActions`, whose "ล้างตัวกรอง" shows only while `hasActiveFilters` (the §6.5 expression). The local `FilterSelect` goes.
- **§5.3, §3.4:** the table is `DataTable` with `caption={t("title")}` and `scrollHint={tCommon("tableScrollHint")}` (a B6 page: no phone list, so the table scrolls sideways with the hint). The six sortable heads become `DataTableHead sort={sortBy(field)}`, where `sortBy` builds the same href as `BranchSortableColumnHeader` did and sets `direction` only on the sorted column (so only that column gets `aria-sort` and an arrow). The count columns are right-aligned (`align="right"` on the head, `numeric` on the cell). The actions head is `hideLabel`.
- **I11, R-n, R-p:** the count links in the cells keep their class string to the letter (`tests/master-data-brand-supplier-ui.test.ts:40`, `:44` read it in categories and brands). Counts go through `formatCount`. A `0` sits in `<span className="px-2">` so it lines up with the 8px padding of the count links in the same right-aligned column. The contact is `orNil(...)` (a dash that reads "ไม่มีข้อมูล"). The branch code is `tag font-medium text-foreground`; the company code in "CODE - name" is an inner `tag`.
- **§3.13, R-d:** the four `SummaryTile`s become one `StatStrip`. `tone="warning"` becomes `attention` (a warning foot line with its icon, no warning border). The three filter cells set `current` when their filter is the one in use. `footTitle` repeats the foot, because the foot is cut to one line.
- **§5.1, §3.5:** the empty row is `TableEmptyRow`. While a filter is on it is an `ActionEmptyState` (`tCommon("noData")` and an outline "ล้างตัวกรอง" to the list without filters, `actionVariant: "secondary"`); without a filter it stays the one-line note. No new message key.
- **I21, §5.9.1:** when the page number is past the last page and the list is not empty, the page calls `redirect()` to the same URL on the last page (`lastListPage`). It runs after the `Promise.all` and outside any `try` (Next.js 16.4 `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md`: it throws `NEXT_REDIRECT` and ends the render; the server answers with a 307, or a client-side redirect once the page streams). `Pagination` sits in `DataTable footer` and shows only while `total > 0` (§5.1). The page sizes are `LIST_PAGE_SIZES` (25/50/100); the query, `parseBranchListParams` and `buildBranchQueryString` do not change.
- **I16, §5.14:** `tests/list-pages-ui.test.ts` is new and holds only "has" checks. Its `MASTER_DATA_LISTS` gets one line per migrated page (Tasks 13–21). The "none left" checks are the LFG rows this commit lowers.
- **§6.13 table B items 5 and 6, I34:** this task appends `MIGRATED_FILTER_FILES` and the two tests to Task 6's `tests/list-filters-ui.test.ts`. The list starts with `master-data-layout.tsx` (Task 12 moved `MasterDataSearch`, the last raw field of that file) and this page. Item 6 holds from the start, because no file used `FilterFormActions` before; item 5 is the one that fails first.
- **LFG and VFG (I15, §9.8):** every row of this file goes to 0 and the file joins `MIGRATED_LIST_FILES` (2B does not touch it again). The budget is lowered before the page changes, so the guards fail first on the HEAD counts.
- **Ruling (TDD order):** the tests and the lowered budgets come first and fail for the stated reasons; then the page changes and everything passes.

What users will see on `/th/master-data/branches`:
- The four number boxes become one flat strip: no warning border; a count that needs a look gets a warning line with an icon; the box of the filter in use is light blue with a line under it. Two columns below 1024px.
- The filter fields are 40px tall on desktop (44 on phones) with the 2A field look; the search has its icon. "ล้างตัวกรอง" shows only while a filter is on.
- The table header is white, 13px, no capitals, with 12px corners; rows are about 46px. The sorted column shows its arrow. Counts sit on the right in th-TH digits; codes are monospace and select as one word; an empty contact shows "—".
- Each row has "แก้ไข" (120px) and ⋯ holding "ลบ", which asks the same confirm as before. On phones ⋯ opens a bottom sheet. Clicking the row still opens the edit page.
- The footer reads "1–25 จาก N รายการ · หน้า 1 จาก M", with 25/50/100 and words-only "ก่อนหน้า"/"ถัดไป". A page number past the end opens the last page instead of an empty table.
- A filter that finds nothing shows "ไม่พบข้อมูล" with an outline "ล้างตัวกรอง" button.
- When the table is wider than the screen, a line above it says it scrolls sideways.

Not in this task:
- `parseBranchListParams`, `buildBranchQueryString`, the query and the drill-down hrefs (unchanged)
- `ActiveBadge` (2D), the edit and new pages (Task 22), `MasterDataHeader`, `ColumnHeader`, `MasterDataPagination` (still used elsewhere; 2B-5)
- messages: no key changes (`common.tableScrollHint`, `showingRange`, `pageSizeLabel`, `moreActionsFor` came with Tasks 4, 5 and 7)
- docs (Task 26). Do not run a formatter.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/master-data/branches/page.tsx` (CRLF, 6 exact replacements)
- Delete: `src/components/master-data/branch-delete-button.tsx`
- Create: `tests/list-pages-ui.test.ts` (LF, 2 tests)
- Modify: `tests/list-filters-ui.test.ts` (LF, one block appended: `MIGRATED_FILTER_FILES` and 2 tests)
- Modify: `tests/list-frame-guards.test.ts` (LF) and `tests/visual-foundation-guards.test.ts` (CRLF), through `p2b-budget.mjs` only
- Temp folder only, never committed: `p2b1-t13-precheck.mjs` (Tasks 14–17 reuse it), `t13-filters-block.ts`

**Must keep passing without edits:**
- `tests/master-data-return-navigation.test.ts` (4 tests: `const branchReturnHref = `, the `/new` and `/${branch.id}/edit` hrefs through `appendMasterDataReturnTo`; the file is read with `\r`, its regexes have no `\n`)
- `tests/master-data-workspace.test.ts`, `tests/master-data-brand-supplier-ui.test.ts` (the brands page still calls `MasterDataHeader` until Task 14), `tests/confirm-dialog-ui.test.ts`, `tests/row-actions-ui.test.ts`, `tests/list-primitives-ui.test.ts`, `tests/clickable-table-row-navigation.test.ts`, `tests/dialog-trigger-handles.test.ts`
- `tests/form-migration-guards.test.ts` (never edited; the page is not a 2C file), `tests/design-tokens-contrast.test.ts`, `tests/thai-glossary.test.ts`, `tests/messages-parity.test.ts`
- `tests/list-frame-guards.test.ts` and `tests/visual-foundation-guards.test.ts`: every row of the other files

**Interfaces:**
- Consumes:
  - Task 3: `PageHeader({ title, meta, actions })` from `@/components/ui/page-header`.
  - Task 4: `DataTable` (`caption`, `scrollHint`, `footer`), `DataTableHeader`, `DataTableBody`, `DataTableHead` (`align`, `sort`, `hideLabel`), `DataTableCell` (`numeric`, `align`, `className`), `TableEmptyRow` (`colSpan` with `children`, or with `emptyState`) and `type DataTableSort = { href: string; direction: "asc" | "desc" | null; scroll?: boolean }` from `@/components/ui/data-table`; `ClickableTableRow` (unchanged API) from `@/components/ui/clickable-table-row`.
  - Task 5: `Pagination({ page, totalPages, previousHref, nextHref, pageSize, pageSizes, labels: { navigation, previous, next, pageOf, range, pageSizeGroup, rowsPerPage } })` from `@/components/ui/pagination`; `LIST_PAGE_SIZES` and `lastListPage(total, pageSize)` from `@/lib/list-pagination`; keys `common.tableScrollHint`, `common.showingRange`, `common.pageSizeLabel`; `paginationRange` from `@/lib/master-data-query` (unchanged).
  - Task 6: `FilterSelect({ label, options, allLabel?, ...select props })` from `@/components/ui/filter-select`; `FilterPanel` and `FilterFormActions({ submitLabel, clear? })` from `@/components/ui/filter-panel`; `tests/list-filters-ui.test.ts` (LF, `read` strips `\r`); `p2b1-append.mjs` in the temp folder.
  - Task 7: `RowActions({ code, name?, menuLabel, next?, groups, deleteAction?, className? })` from `@/components/ui/row-actions`; key `common.moreActionsFor`.
  - Task 9: `StatStrip({ items })` with `StatStripItem = { key, label, value, foot?, footTitle?, href?, current?, attention? }` from `@/components/ui/stat-strip`.
  - 2A: `Field` from `@/components/ui/field`, `SearchField` from `@/components/ui/search-field`, `orNil` from `@/components/ui/nil`, `formatCount` from `@/lib/display-format`, `buttonVariants` from `@/components/ui/button-variants`, the `tag` and `num` utilities.
  - Task 1: `p2b1-precheck.mjs` (`--file`, `--budgets`) and `p2b-budget.mjs`; Task 4: `p2b1-tw-probe.mjs` (all in the temp folder).
  - Next.js 16.4: `redirect` from `next/navigation` (already used in `D/dashboard/page.tsx:69`).
- Produces (Tasks 14–21 rely on these):
  - `tests/list-pages-ui.test.ts` (LF): `const D`, `const C`, `read(path)` (strips `\r`), `type MasterDataList = { path: string; deleteEndpoints: readonly string[]; removedWrappers: readonly string[]; stats: boolean }` and `const MASTER_DATA_LISTS: readonly MasterDataList[]`, one entry per line, closed by `]` on its own line. Each later page task inserts its line before that `]`. An entry for a page with no ⋯ "ลบ" (users, Task 21) writes `deleteEndpoints: [], removedWrappers: []`. A `deleteEndpoints` string is written as the page writes it inside the template literal, for example `"/api/branches/${branch.id}"`.
  - `tests/list-filters-ui.test.ts`: `const MIGRATED_FILTER_FILES` with full paths in double quotes, one per line, closed by `]`; Tasks 14–16 and 18–20 insert their line before it.
  - LFG: `BUDGETS` and VFG `TABLE_HEADER_FILLS` hold no row of `D/master-data/branches/page.tsx`; `MIGRATED_LIST_FILES` holds it.
  - The page shape that Tasks 14–21 copy: `listHref(next)`, `lastPage` and the `redirect` block, `paginationRange`, `hasActiveFilters`, `sortBy(field): DataTableSort`, the `Pagination` labels object.

| guard | `D/master-data/branches/page.tsx` before → after |
|---|---|
| VFG R7 | 1 → – |
| LFG | LH2 2 · LF1 1 · LT1 1 · LT2 1 · LT3 1 · LT4 1 · LT5 2 · LV1 4 · LV2 1 · LS1 1 · LR1 1 → all – · joins `MIGRATED_LIST_FILES` |

- [ ] **Step 1: Check what this task builds on (and save the precheck script)**

Save this script as `p2b1-t13-precheck.mjs` in your temp folder (never in the repo). Tasks 14–17 run the same script with their own number.

```js
// p2b1-t13-precheck.mjs: run from the repo root before Task 13, 14, 15, 16 or 17 of plan 2B-1.
// Usage: node p2b1-t13-precheck.mjs <13|14|15|16|17>. Reads only; writes nothing. Never commit this file.
// Confirms that the primitives of Tasks 3–12 are in, that the page still holds the d38a0ee text the old snippets quote
// (a hash of its text with \r stripped), that its delete wrappers have no other caller, and that the test files hold
// the lines of the earlier tasks of this group and not yet this task's.
import { createHash } from "node:crypto"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

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
const sourceFiles = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name)
  return statSync(path).isDirectory() ? sourceFiles(path) : /\.(?:ts|tsx)$/.test(name) ? [path.replace(/\\/g, "/")] : []
})
const callersOf = (module) => sourceFiles("src").filter((path) => read(path).includes(`"@/components/master-data/${module}"`))
const messages = (locale) => JSON.parse(read(`messages/${locale}.json`))

// The pages in task order, their LF text hash at d38a0ee and the delete wrappers they are the last callers of.
const TASKS = {
  13: { page: "branches", hash: "6122499ec428765a", wrappers: ["branch-delete-button"], filters: true },
  14: { page: "brands", hash: "320ba387ea35d5f7", wrappers: ["brand-delete-button", "asset-model-delete-button"], filters: true },
  15: { page: "categories", hash: "768fe0c308388816", wrappers: ["category-delete-button"], filters: true },
  16: { page: "companies", hash: "d1f83cf3b0cb4597", wrappers: ["company-delete-button"], filters: true },
  17: { page: "departments", hash: "2238c40029edfd29", wrappers: ["department-delete-button"], filters: false },
}
const current = TASKS[task]
if (!current) {
  console.error("usage: node p2b1-t13-precheck.mjs <13|14|15|16|17>")
  process.exit(2)
}
const page = `${D}master-data/${current.page}/page.tsx`
const earlier = Object.entries(TASKS).filter(([number]) => Number(number) < Number(task)).map(([, entry]) => entry)
const pagesTest = read("tests/list-pages-ui.test.ts")
const filtersTest = read("tests/list-filters-ui.test.ts")
const ui = (name) => read(`${C}ui/${name}`)
const listPagination = read("src/lib/list-pagination.ts")
const layout = read(`${C}master-data/master-data-layout.tsx`)
const keys = ["tableScrollHint", "showingRange", "pageSizeLabel", "moreActionsFor", "pagination", "pageOf", "previous", "next", "rowsPerPage", "noData", "edit", "create", "filter", "search", "all", "status", "actions", "active"]
const listEntry = (name) => `{ path: \`\${D}master-data/${name}/page.tsx\``
const filterEntry = (name) => `"src/app/[locale]/(dashboard)/master-data/${name}/page.tsx",`

const checks = {
  "Task 1: tests/list-frame-guards.test.ts has MIGRATED_LIST_FILES": /const MIGRATED_LIST_FILES\b/.test(read("tests/list-frame-guards.test.ts")),
  "Task 3: PageHeader and PageBackLink": /export function PageHeader\(/.test(ui("page-header.tsx")),
  "Task 4: DataTable, its parts, TableEmptyRow and DataTableSort": ["DataTable", "DataTableHeader", "DataTableBody", "DataTableHead", "DataTableCell", "TableEmptyRow"].every((name) => new RegExp(`export function ${name}\\(`).test(ui("data-table.tsx"))) && /export type DataTableSort = \{/.test(ui("data-table.tsx")),
  "Task 5: Pagination takes pageSize and pageSizes; list-pagination exports its helpers": /pageSizes\?: readonly PaginationPageSize\[\]/.test(ui("pagination.tsx")) && ["LIST_PAGE_SIZES", "parseListPage", "listPageWindow", "lastListPage", "appendListPage"].every((name) => new RegExp(`export (?:const|function) ${name}\\b`).test(listPagination)),
  "Task 6: FilterSelect, FilterFormActions, and tests/list-filters-ui.test.ts": /export function FilterSelect\(/.test(ui("filter-select.tsx")) && /export function FilterFormActions\(/.test(ui("filter-panel.tsx")) && /^const read = /m.test(filtersTest),
  "Task 7: RowActions": /export function RowActions\(/.test(ui("row-actions.tsx")),
  "Task 9: StatStrip": /export function StatStrip\(/.test(ui("stat-strip.tsx")),
  "Task 11: ContentPanel divided and flush": /\| \{ divided: true; flush\?: boolean \}/.test(ui("content-panel.tsx")),
  "Task 12: MasterDataSearch is on SearchField; ActiveBadge is still exported": /<SearchField name="search"/.test(layout) && /export function ActiveBadge\(/.test(layout) && /export function MasterDataSearch\(/.test(layout),
  "the common keys exist in th and en": ["th", "en"].every((locale) => keys.every((key) => typeof messages(locale).common?.[key] === "string")),
  [`${page} is CRLF and unchanged since d38a0ee (hash ${current.hash})`]: eol(page) === "CRLF" && hash(page) === current.hash,
  [`${page} still calls MasterDataHeader`]: read(page).includes("<MasterDataHeader"),
  ...Object.fromEntries(current.wrappers.map((name) => [`${C}master-data/${name}.tsx exists and only this page imports it`, existsSync(`${C}master-data/${name}.tsx`) && callersOf(name).join("|") === page])),
  "tests/list-pages-ui.test.ts holds the lines of the earlier tasks only": task === "13"
    ? !existsSync("tests/list-pages-ui.test.ts")
    : earlier.every((entry) => pagesTest.includes(listEntry(entry.page))) && !pagesTest.includes(listEntry(current.page)) && !/const B4_LISTS\b/.test(pagesTest),
  "tests/list-filters-ui.test.ts holds the lines of the earlier tasks only": task === "13"
    ? !/const MIGRATED_FILTER_FILES\b/.test(filtersTest)
    : earlier.filter((entry) => entry.filters).every((entry) => filtersTest.includes(filterEntry(entry.page))) && !filtersTest.includes(filterEntry(current.page)),
  ...(task === "14"
    ? { "tests/master-data-brand-supplier-ui.test.ts still pins MasterDataHeader (:9-10)": read("tests/master-data-brand-supplier-ui.test.ts").includes('  assert.match(source, /<MasterDataHeader[\\s\\S]*createHref=\\{createModelHref\\}/)\n  assert.match(source, /createLabel=\\{t\\("createModel"\\)\\}/)\n') }
    : {}),
}

let missing = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok     " : "MISSING"} ${name}`)
  if (!ok) missing += 1
}
for (const path of [page, "tests/list-frame-guards.test.ts", "tests/list-filters-ui.test.ts", "tests/list-pages-ui.test.ts", ...(task === "14" ? ["tests/master-data-brand-supplier-ui.test.ts"] : [])]) {
  console.log(`info    ${path}: ${eol(path)}`)
}
if (hash(page) !== current.hash) console.log(`info    ${page} hash is ${hash(page)}`)
if (missing > 0) {
  console.error(`ABORT: ${missing} precondition(s) failed. Do not start Task ${task}; report which.`)
  process.exit(1)
}
console.log(`preconditions hold for Task ${task}`)
```

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2b`

Run: `git status --short src tests messages` then `node <temp>/p2b1-t13-precheck.mjs 13`
Expected: `git status` prints nothing. The script prints:
```
ok      Task 1: tests/list-frame-guards.test.ts has MIGRATED_LIST_FILES
ok      Task 3: PageHeader and PageBackLink
ok      Task 4: DataTable, its parts, TableEmptyRow and DataTableSort
ok      Task 5: Pagination takes pageSize and pageSizes; list-pagination exports its helpers
ok      Task 6: FilterSelect, FilterFormActions, and tests/list-filters-ui.test.ts
ok      Task 7: RowActions
ok      Task 9: StatStrip
ok      Task 11: ContentPanel divided and flush
ok      Task 12: MasterDataSearch is on SearchField; ActiveBadge is still exported
ok      the common keys exist in th and en
ok      src/app/[locale]/(dashboard)/master-data/branches/page.tsx is CRLF and unchanged since d38a0ee (hash 6122499ec428765a)
ok      src/app/[locale]/(dashboard)/master-data/branches/page.tsx still calls MasterDataHeader
ok      src/components/master-data/branch-delete-button.tsx exists and only this page imports it
ok      tests/list-pages-ui.test.ts holds the lines of the earlier tasks only
ok      tests/list-filters-ui.test.ts holds the lines of the earlier tasks only
info    src/app/[locale]/(dashboard)/master-data/branches/page.tsx: CRLF
info    tests/list-frame-guards.test.ts: LF
info    tests/list-filters-ui.test.ts: LF
info    tests/list-pages-ui.test.ts: missing
preconditions hold for Task 13
```
On any `MISSING` line, stop and report it. A hash line means the page changed after `d38a0ee`, so the old snippets of Step 4 may not match: report it, do not guess.

Run: `node <temp>/p2b1-precheck.mjs --file D/master-data/branches/page.tsx`
Expected (after the `info`/`ok` header lines; exit 0):
```
file    src/app/[locale]/(dashboard)/master-data/branches/page.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
R7         1       1     0     1
LH2        2       2     0     2
LF1        1       1     0     1
LT1        1       1     0     1
LT2        1       1     0     1
LT3        1       1     0     1
LT4        1       1     0     1
LT5        2       2     0     2
LV1        4       4     0     4
LV2        1       1     0     1
LS1        1       1     0     1
LR1        1       1     0     1
args    R7=1:1 LH2=2:2 LF1=1:1 LT1=1:1 LT2=1:1 LT3=1:1 LT4=1:1 LT5=2:2 LV1=4:4 LV2=1:1 LS1=1:1 LR1=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol "src/app/[[]locale]/(dashboard)/master-data/branches/page.tsx" tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: `w/crlf` for the page and VFG, `w/lf` for the two LF test files. Keep them as they are.

- [ ] **Step 2: Write the failing page tests**

(a) Create `tests/list-pages-ui.test.ts` with this content, LF line endings:

```ts
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

// Phase 2B (spec 2B §5.14, I16): what the migrated list pages must have. The "none left" checks (local sort headers
// and pagers, typed "-", bare toLocaleString(), <…DeleteButton id=, the old headers) are the LFG guards of
// tests/list-frame-guards.test.ts (I15). Sources are read with \r stripped, so a regex here may hold \n.
const D = "src/app/[locale]/(dashboard)/"
const C = "src/components/"
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

type MasterDataList = {
  path: string
  // The endpoints "ลบ" in ⋯ calls, as the page writes them: those of the *-delete-button.tsx wrappers it replaces (B5).
  deleteEndpoints: readonly string[]
  // The wrappers this page was the last caller of. They go in the same commit (spec 2B I5).
  removedWrappers: readonly string[]
  // The page shows a StatStrip in place of its local SummaryTile.
  stats: boolean
}

// The master-data lists of plan 2B-1. The commit that moves a page adds its line.
const MASTER_DATA_LISTS: readonly MasterDataList[] = [
  { path: `${D}master-data/branches/page.tsx`, deleteEndpoints: ["/api/branches/${branch.id}"], removedWrappers: [`${C}master-data/branch-delete-button.tsx`], stats: true },
]

test("master-data lists build on PageHeader, DataTable, TableEmptyRow, RowActions and the shared Pagination (spec 2B §5.3, B5, B6)", () => {
  for (const { path, deleteEndpoints, removedWrappers, stats } of MASTER_DATA_LISTS) {
    const source = read(path)
    for (const part of ["<PageHeader", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<TableEmptyRow", "<ClickableTableRow", "<RowActions", "<Pagination"]) {
      assert.ok(source.includes(part), `${path}: no ${part}`)
    }
    if (stats) assert.ok(source.includes("<StatStrip"), `${path}: no <StatStrip`)
    assert.match(source, /<div className="space-y-6">/, `${path}: the page root spaces its blocks 24px apart (spec 2B §4.6.1)`)
    assert.match(source, /scrollHint=\{tCommon\("tableScrollHint"\)\}/, `${path}: a table with no phone list scrolls sideways with the hint (B6)`)
    assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(/, `${path}: 25, 50 or 100 rows per page (R-k)`)
    assert.match(source, /menuLabel=\{tCommon\("moreActionsFor", \{ code: [\w.]+ \}\)\}/, `${path}: ⋯ is named after its row (I33)`)
    assert.match(source, /next=\{\{ label: (?:tCommon\("edit"\)|t\("\w+"\)), href: \w+, icon: <Pencil aria-hidden="true" \/> \}\}/, `${path}: the next step is the edit link (B5)`)
    for (const endpoint of deleteEndpoints) {
      assert.ok(source.includes(`deleteAction={{ endpoint: \`${endpoint}\` }}`), `${path}: "ลบ" in ⋯ calls ${endpoint}`)
    }
    for (const wrapper of removedWrappers) assert.equal(existsSync(wrapper), false, `${wrapper} has no caller left (I5)`)
  }
})

test("a master-data list past its last page sends the user to the last page (spec 2B I21, §5.9.1)", () => {
  for (const { path } of MASTER_DATA_LISTS) {
    const source = read(path)
    assert.match(source, /^import \{ redirect \} from "next\/navigation"$/m, path)
    assert.match(source, /const lastPage = lastListPage\(\w+, [\w.]+\)\n\s+if \(\w+\.length === 0 && \w+ > 0 && [\w.]+ > lastPage\) \{\n\s+redirect\(/, path)
  }
})
```

(b) Save this block as `t13-filters-block.ts` in your temp folder:

```ts
// Items 5 and 6 (spec 2B §6.13 table B, I34): the filter forms of the migrated list files. Each page commit adds its
// file; plan 2B-5 completes the list. A raw field in a file outside the list has no guard until 2D (I34).
const MIGRATED_FILTER_FILES = [
  "src/components/master-data/master-data-layout.tsx",
  "src/app/[locale]/(dashboard)/master-data/branches/page.tsx",
]

test("migrated filter forms use Field, SearchField and FilterSelect only, and every form is a search landmark (item 5)", () => {
  for (const path of MIGRATED_FILTER_FILES) {
    const source = read(path)
    assert.doesNotMatch(source, /<select\b|<textarea\b/, `${path}: a raw select or textarea`)
    const rawInputs = (source.match(/<input\b[^>]*>/g) ?? []).filter((tag) => !/\btype="hidden"/.test(tag))
    assert.deepEqual(rawInputs, [], `${path}: only hidden inputs may stay raw`)
    assert.doesNotMatch(source, /space-y-1 text-sm font-medium text-foreground|mb-1\.5 block text-xs font-medium text-muted-foreground/, `${path}: an old filter label`)
    assert.doesNotMatch(source, /\bfunction (?:FilterSelect|ReportSelect)\b|\bfunction Filter\(/, `${path}: a local filter helper`)
    for (const form of source.match(/<form\b[^>]*>/g) ?? []) assert.match(form, /\brole="search"/, `${path}: ${form}`)
  }
})

test("clear filters shows only while a filter is on (item 6)", () => {
  for (const path of MIGRATED_FILTER_FILES) {
    for (const actions of read(path).match(/<FilterFormActions\b[\s\S]*?\/>/g) ?? []) {
      if (/\bclear=/.test(actions)) assert.match(actions, /\bclear=\{hasActiveFilters \?/, `${path}: ${actions}`)
    }
  }
})
```

Run: `node <temp>/p2b1-append.mjs <temp>/t13-filters-block.ts tests/list-filters-ui.test.ts`
Expected: `appended <temp>/t13-filters-block.ts to tests/list-filters-ui.test.ts`

Run: `node --test tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts`
Expected: FAIL, `tests 5 · pass 2 · fail 3`:
- `master-data lists build on PageHeader, DataTable, TableEmptyRow, RowActions and the shared Pagination (spec 2B §5.3, B5, B6)`: `…/master-data/branches/page.tsx: no <PageHeader`
- `a master-data list past its last page sends the user to the last page (spec 2B I21, §5.9.1)`: the `redirect` import regex, message `src/app/[locale]/(dashboard)/master-data/branches/page.tsx`
- `migrated filter forms use Field, SearchField and FilterSelect only, and every form is a search landmark (item 5)`: `…/master-data/branches/page.tsx: a raw select or textarea`
- Task 6's `FilterFormActions submits at 40px …` and item 6 pass (no file calls `FilterFormActions` yet).

- [ ] **Step 3: Lower the guard rows of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs D/master-data/branches/page.tsx R7=1:0 LH2=2:0 LF1=1:0 LT1=1:0 LT2=1:0 LT3=1:0 LT4=1:0 LT5=2:0 LV1=4:0 LV2=1:0 LS1=1:0 LR1=1:0 --migrated`
Expected (exit 0):
```
R7: 1 -> 0 (row deleted)
LH2: 2 -> 0 (row deleted)
LF1: 1 -> 0 (row deleted)
LT1: 1 -> 0 (row deleted)
LT2: 1 -> 0 (row deleted)
LT3: 1 -> 0 (row deleted)
LT4: 1 -> 0 (row deleted)
LT5: 2 -> 0 (row deleted)
LV1: 4 -> 0 (row deleted)
LV2: 1 -> 0 (row deleted)
LS1: 1 -> 0 (row deleted)
LR1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/master-data/branches/page.tsx
```

Run: `node --test tests/list-frame-guards.test.ts`
Expected: FAIL, `tests 21 · pass 9 · fail 12`. The 11 guards LH2, LF1, LT1, LT2, LT3, LT4, LT5, LV1, LV2, LS1 and LR1 fail with the HEAD totals (`LH2: 27 in 15 files`, `LF1: 10 in 10 files`, `LT1: 43 in 17 files`, `LT2: 8 in 8 files`, `LT3: 16 in 15 files`, `LT4: 11 in 11 files`, `LT5: 23 in 12 files`, `LV1: 44 in 17 files`, `LV2: 128 in 43 files`, `LS1: 30 in 27 files`, `LR1: 10 in 8 files`), each listing only `src/app/[locale]/(dashboard)/master-data/branches/page.tsx: N > 0`. `L0` fails with the same 11 lines (`LH2 src/app/[locale]/(dashboard)/master-data/branches/page.tsx: 2 > 0` … `LR1 …: 1 > 0`), because the file is now in `MIGRATED_LIST_FILES`.

Run: `node --test tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 26 · pass 25 · fail 1`: `R7 interim: table-header fills wait for DataTable (2B), file by file` with `44 matches in 31 files; over budget:` and the one line `src/app/[locale]/(dashboard)/master-data/branches/page.tsx: 1 > 0`.

- [ ] **Step 4: Move the page onto the primitives (`src/app/[locale]/(dashboard)/master-data/branches/page.tsx`, CRLF)**

Six exact replacements, top to bottom. Make all six before you compile: (1) imports what (2)–(5) use, and (6) deletes the local helpers that (5) stops calling.

(1) Imports. `ArrowDown`, `ArrowUp`, `Edit`, `BranchDeleteButton`, `ColumnHeader` and `MasterDataHeader` go; `redirect`, the primitives, `formatCount` and the page helpers come in. The `organization-master-query` import below it does not change.

Replace:

```tsx
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { ArrowDown, ArrowUp, Edit } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { BranchDeleteButton } from "@/components/master-data/branch-delete-button"
import {
  ActiveBadge,
  ColumnHeader,
  MasterDataHeader,
} from "@/components/master-data/master-data-layout"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { paginationRange } from "@/lib/master-data-query"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
```

with:

```tsx
import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Pencil, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { ActiveBadge } from "@/components/master-data/master-data-layout"
import { buttonVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
import { FilterSelect } from "@/components/ui/filter-select"
import { orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
```

(2) After the summary: the list href, the past-the-end redirect, the range, the active-filter flag and the sort heads; then the page root and the header.

Replace:

```tsx
  const summary = buildBranchSummary(summaryBranches)

  return (
    <div className="space-y-4">
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={appendMasterDataReturnTo(`/${locale}/master-data/branches/new`, branchReturnHref)}
        createLabel={tCommon("create")}
      />
```

with:

```tsx
  const summary = buildBranchSummary(summaryBranches)
  const listHref = (next: Partial<BranchListState>) => `${basePath}?${buildBranchQueryString(listState, next)}`
  // A page past the last one (an old link, or the last row of the last page deleted) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listState.pageSize)
  if (branches.length === 0 && total > 0 && listState.page > lastPage) {
    redirect(listHref({ page: lastPage }))
  }
  const { start, end, totalPages } = paginationRange(listState.page, listState.pageSize, total)
  const hasActiveFilters = Boolean(listState.search || listState.companyId || listState.assetUsage !== "all" || listState.locationUsage !== "all")
  const sortBy = (field: BranchSort): DataTableSort => ({
    href: listHref({ sort: field, direction: listState.sort === field && listState.direction === "asc" ? "desc" : "asc", page: 1 }),
    direction: listState.sort === field ? listState.direction : null,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <Link href={appendMasterDataReturnTo(`/${locale}/master-data/branches/new`, branchReturnHref)} className={buttonVariants({ size: "md" })}>
            <Plus aria-hidden="true" />
            {tCommon("create")}
          </Link>
        }
      />
```

(3) The four number boxes become one `StatStrip`.

Replace:

```tsx
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          label={t("summaryTotal")}
          value={summary.total}
          detail={t("summaryWithLocations", { count: summary.withLocations })}
          href={basePath}
        />
        <SummaryTile
          label={t("summaryWithAssets")}
          value={summary.withAssets}
          detail={t("summaryWithAssetsHelp")}
          href={`${basePath}?${buildBranchQueryString(listState, { assetUsage: "withAssets", page: 1 })}`}
        />
        <SummaryTile
          label={t("summaryWithoutAssets")}
          value={summary.withoutAssets}
          detail={t("summaryWithoutAssetsHelp")}
          href={`${basePath}?${buildBranchQueryString(listState, { assetUsage: "withoutAssets", page: 1 })}`}
          tone={summary.withoutAssets > 0 ? "warning" : "neutral"}
        />
        <SummaryTile
          label={t("summaryWithoutLocations")}
          value={summary.withoutLocations}
          detail={t("summaryWithoutLocationsHelp")}
          href={`${basePath}?${buildBranchQueryString(listState, { locationUsage: "withoutLocations", page: 1 })}`}
          tone={summary.withoutLocations > 0 ? "warning" : "neutral"}
        />
      </div>
```

with:

```tsx
      <StatStrip
        items={[
          {
            key: "total",
            label: t("summaryTotal"),
            value: formatCount(summary.total),
            foot: t("summaryWithLocations", { count: summary.withLocations }),
            footTitle: t("summaryWithLocations", { count: summary.withLocations }),
            href: basePath,
          },
          {
            key: "withAssets",
            label: t("summaryWithAssets"),
            value: formatCount(summary.withAssets),
            foot: t("summaryWithAssetsHelp"),
            footTitle: t("summaryWithAssetsHelp"),
            href: listHref({ assetUsage: "withAssets", page: 1 }),
            current: listState.assetUsage === "withAssets",
          },
          {
            key: "withoutAssets",
            label: t("summaryWithoutAssets"),
            value: formatCount(summary.withoutAssets),
            foot: t("summaryWithoutAssetsHelp"),
            footTitle: t("summaryWithoutAssetsHelp"),
            href: listHref({ assetUsage: "withoutAssets", page: 1 }),
            current: listState.assetUsage === "withoutAssets",
            attention: summary.withoutAssets > 0,
          },
          {
            key: "withoutLocations",
            label: t("summaryWithoutLocations"),
            value: formatCount(summary.withoutLocations),
            foot: t("summaryWithoutLocationsHelp"),
            footTitle: t("summaryWithoutLocationsHelp"),
            href: listHref({ locationUsage: "withoutLocations", page: 1 }),
            current: listState.locationUsage === "withoutLocations",
            attention: summary.withoutLocations > 0,
          },
        ]}
      />
```

(4) The filter card becomes `FilterPanel`, the form a search landmark, and the search field `Field` + `SearchField`. The hidden inputs and the three `FilterSelect` calls below it stay as they are; from this commit on they render the shared `FilterSelect`.

Replace:

```tsx
      <div className="rounded-lg border border-border bg-surface p-4">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.4fr)_repeat(3,minmax(150px,1fr))_auto]" action={basePath}>
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={listState.pageSize} />
          <input type="hidden" name="sort" value={listState.sort} />
          <input type="hidden" name="direction" value={listState.direction} />
          <label className="space-y-1 text-sm font-medium text-foreground">
            <span>{tCommon("search")}</span>
            <input
              type="search"
              name="search"
              defaultValue={listState.search}
              placeholder={t("searchPlaceholder")}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </label>
```

with:

```tsx
      <FilterPanel>
        <form role="search" action={basePath} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.4fr)_repeat(3,minmax(150px,1fr))_auto]">
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={listState.pageSize} />
          <input type="hidden" name="sort" value={listState.sort} />
          <input type="hidden" name="direction" value={listState.direction} />
          <Field label={tCommon("search")}>
            <SearchField name="search" defaultValue={listState.search} placeholder={t("searchPlaceholder")} />
          </Field>
```

(5) The filter buttons, the table and its pager.

Replace:

```tsx
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
            >
              {tCommon("filter")}
            </button>
            <Link
              href={basePath}
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              {t("clearFilters")}
            </Link>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <BranchSortableColumnHeader field="code" current={listState} basePath={basePath}>{t("code")}</BranchSortableColumnHeader>
                <BranchSortableColumnHeader field="name" current={listState} basePath={basePath}>{t("name")}</BranchSortableColumnHeader>
                <BranchSortableColumnHeader field="company" current={listState} basePath={basePath}>{t("company")}</BranchSortableColumnHeader>
                <ColumnHeader>{t("contactPerson")}</ColumnHeader>
                <BranchSortableColumnHeader field="locations" current={listState} basePath={basePath}>{t("locations")}</BranchSortableColumnHeader>
                <BranchSortableColumnHeader field="employees" current={listState} basePath={basePath}>{t("employees")}</BranchSortableColumnHeader>
                <BranchSortableColumnHeader field="assets" current={listState} basePath={basePath}>{t("assets")}</BranchSortableColumnHeader>
                <ColumnHeader>{tCommon("status")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {branches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
              ) : (
                branches.map((branch) => {
                  const drilldown = buildBranchDrilldownHrefs({ locale, branchId: branch.id })
                  const editHref = appendMasterDataReturnTo(`/${locale}/master-data/branches/${branch.id}/edit`, branchReturnHref)
                  return (
                    <ClickableTableRow
                      key={branch.id}
                      href={editHref}
                      label={`${tCommon("edit")}: ${branch.code}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{branch.code}</td>
                      <td className="min-w-48 px-4 py-3 text-foreground">{branch.name}</td>
                      <td className="min-w-56 px-4 py-3 text-muted-foreground">
                        {branch.company.code} - {branch.company.nameTh}
                      </td>
                      <td className="min-w-40 px-4 py-3 text-muted-foreground">{branch.contactPerson || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {branch._count.locations > 0 ? (
                          <Link
                            href={drilldown.locations}
                            className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                          >
                            {branch._count.locations.toLocaleString()}
                          </Link>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {branch._count.employees.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {branch._count.assets > 0 ? (
                          <Link
                            href={drilldown.assets}
                            className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                          >
                            {branch._count.assets.toLocaleString()}
                          </Link>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <ActiveBadge label={tCommon("active")} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            href={editHref}
                            title={tCommon("edit")}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary-soft"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <BranchDeleteButton id={branch.id} />
                        </div>
                      </td>
                    </ClickableTableRow>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <BranchPagination
          current={listState}
          total={total}
          basePath={basePath}
          labels={{
            rowsPerPage: tCommon("rowsPerPage"),
            page: tCommon("page"),
            of: tCommon("of"),
            previous: tCommon("previous"),
            next: tCommon("next"),
          }}
        />
      </div>
    </div>
```

with:

```tsx
          <FilterFormActions submitLabel={tCommon("filter")} clear={hasActiveFilters ? { href: basePath, label: t("clearFilters") } : undefined} />
        </form>
      </FilterPanel>

      <DataTable
        caption={t("title")}
        scrollHint={tCommon("tableScrollHint")}
        footer={
          total > 0 ? (
            <Pagination
              page={listState.page}
              totalPages={totalPages}
              previousHref={listHref({ page: listState.page - 1 })}
              nextHref={listHref({ page: listState.page + 1 })}
              pageSize={listState.pageSize}
              pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: listHref({ pageSize: value, page: 1 }) }))}
              labels={{
                navigation: tCommon("pagination"),
                previous: tCommon("previous"),
                next: tCommon("next"),
                pageOf: tCommon("pageOf", { page: listState.page, total: totalPages }),
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
            <DataTableHead sort={sortBy("code")}>{t("code")}</DataTableHead>
            <DataTableHead sort={sortBy("name")}>{t("name")}</DataTableHead>
            <DataTableHead sort={sortBy("company")}>{t("company")}</DataTableHead>
            <DataTableHead>{t("contactPerson")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("locations")}>{t("locations")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("employees")}>{t("employees")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("assets")}>{t("assets")}</DataTableHead>
            <DataTableHead>{tCommon("status")}</DataTableHead>
            <DataTableHead align="right" hideLabel>{tCommon("actions")}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {branches.length === 0 ? (
            hasActiveFilters ? (
              <TableEmptyRow colSpan={9} emptyState={{ title: tCommon("noData"), actionHref: basePath, actionLabel: t("clearFilters"), actionVariant: "secondary" }} />
            ) : (
              <TableEmptyRow colSpan={9}>{tCommon("noData")}</TableEmptyRow>
            )
          ) : (
            branches.map((branch) => {
              const drilldown = buildBranchDrilldownHrefs({ locale, branchId: branch.id })
              const editHref = appendMasterDataReturnTo(`/${locale}/master-data/branches/${branch.id}/edit`, branchReturnHref)
              return (
                <ClickableTableRow
                  key={branch.id}
                  href={editHref}
                  label={`${tCommon("edit")}: ${branch.code}`}
                >
                  <DataTableCell className="whitespace-nowrap">
                    <span className="tag font-medium text-foreground">{branch.code}</span>
                  </DataTableCell>
                  <DataTableCell className="min-w-48 text-foreground">{branch.name}</DataTableCell>
                  <DataTableCell className="min-w-56 text-muted-foreground">
                    <span className="tag">{branch.company.code}</span> - {branch.company.nameTh}
                  </DataTableCell>
                  <DataTableCell className="min-w-40 text-muted-foreground">{orNil(branch.contactPerson)}</DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">
                    {branch._count.locations > 0 ? (
                      <Link
                        href={drilldown.locations}
                        className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                      >
                        {formatCount(branch._count.locations)}
                      </Link>
                    ) : (
                      <span className="px-2">{formatCount(0)}</span>
                    )}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">{formatCount(branch._count.employees)}</DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">
                    {branch._count.assets > 0 ? (
                      <Link
                        href={drilldown.assets}
                        className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                      >
                        {formatCount(branch._count.assets)}
                      </Link>
                    ) : (
                      <span className="px-2">{formatCount(0)}</span>
                    )}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <ActiveBadge label={tCommon("active")} />
                  </DataTableCell>
                  <DataTableCell align="right">
                    <RowActions
                      code={branch.code}
                      name={branch.name}
                      menuLabel={tCommon("moreActionsFor", { code: branch.code })}
                      next={{ label: tCommon("edit"), href: editHref, icon: <Pencil aria-hidden="true" /> }}
                      groups={[]}
                      deleteAction={{ endpoint: `/api/branches/${branch.id}` }}
                    />
                  </DataTableCell>
                </ClickableTableRow>
              )
            })
          )}
        </DataTableBody>
      </DataTable>
    </div>
```

(6) The four local helpers at the end of the file go (`SummaryTile`, `BranchSortableColumnHeader`, `BranchPagination`, `FilterSelect`). The file then ends with the page's `}` and one line break.

Replace:

```tsx
  )
}

function SummaryTile({
  label,
  value,
  detail,
  href,
  tone = "neutral",
}: {
  label: string
  value: number
  detail: string
  href: string
  tone?: "neutral" | "warning"
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg border bg-surface p-4 transition-colors hover:border-primary-border hover:bg-primary-soft ${
        tone === "warning" ? "border-warning-border" : "border-border"
      }`}
    >
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-bold text-foreground">{value.toLocaleString()}</div>
      <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
    </Link>
  )
}

function BranchSortableColumnHeader({
  children,
  field,
  current,
  basePath,
  align = "left",
}: {
  children: React.ReactNode
  field: BranchSort
  current: BranchListState
  basePath: string
  align?: "left" | "right"
}) {
  const active = current.sort === field
  const nextDirection = active && current.direction === "asc" ? "desc" : "asc"
  const href = `${basePath}?${buildBranchQueryString(current, { sort: field, direction: nextDirection, page: 1 })}`

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

function BranchPagination({
  current,
  total,
  basePath,
  labels,
}: {
  current: BranchListState
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
  const safePage = Math.min(current.page, totalPages)
  const previousPage = Math.max(1, safePage - 1)
  const nextPage = Math.min(totalPages, safePage + 1)

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
            href={`${basePath}?${buildBranchQueryString(current, { pageSize, page: 1 })}`}
            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 transition-colors ${
              current.pageSize === pageSize ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface hover:bg-accent"
            }`}
          >
            {pageSize}
          </Link>
        ))}
        <span className="px-2">
          {labels.page} {safePage} {labels.of} {totalPages}
        </span>
        <Link
          href={`${basePath}?${buildBranchQueryString(current, { page: previousPage })}`}
          aria-disabled={safePage <= 1}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${
            safePage <= 1 ? "pointer-events-none opacity-50" : "hover:bg-accent"
          }`}
        >
          {labels.previous}
        </Link>
        <Link
          href={`${basePath}?${buildBranchQueryString(current, { page: nextPage })}`}
          aria-disabled={safePage >= totalPages}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${
            safePage >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-accent"
          }`}
        >
          {labels.next}
        </Link>
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string
  name: string
  defaultValue: string
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="space-y-1 text-sm font-medium text-foreground">
      <span>{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
      >
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
  )
}
```

Check: `grep -n "toLocaleString\|\"-\"\|MasterDataHeader\|ColumnHeader\|DeleteButton\|bg-muted\|uppercase\|opacity-\|function " "src/app/[locale]/(dashboard)/master-data/branches/page.tsx"` prints one line, `export default async function BranchesPage({ params, searchParams }: BranchesPageProps) {`.

- [ ] **Step 5: Delete the wrapper that has no caller left**

Run: `git rm src/components/master-data/branch-delete-button.tsx`
Expected: `rm 'src/components/master-data/branch-delete-button.tsx'`

Run: `git grep -n "branch-delete-button\|BranchDeleteButton" -- src`
Expected: no output (exit 1).

- [ ] **Step 6: Run the tests for this task**

Run: `node --test tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/master-data-return-navigation.test.ts tests/master-data-brand-supplier-ui.test.ts tests/master-data-workspace.test.ts tests/confirm-dialog-ui.test.ts tests/row-actions-ui.test.ts tests/list-primitives-ui.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `tests 115 · pass 115 · fail 0` (list-pages-ui 2, list-filters-ui 3, list-frame-guards 21, visual-foundation-guards 26, master-data-return-navigation 4, master-data-brand-supplier-ui 6, master-data-workspace 1, confirm-dialog-ui 3, row-actions-ui 8, list-primitives-ui 18, form-migration-guards 23).

Run: `node <temp>/p2b1-precheck.mjs --file D/master-data/branches/page.tsx`
Expected: `· in MIGRATED_LIST_FILES` on the `file` line, every guard row `0 0 0 <seed>` and `args    (no row holds this file)`; exit 0.

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected: exit 0, `budgets hold: no live count is over its row`, `R7 TABLE_HEADER_FILLS 43 in 30 rows`, no `slack` line except the two LB1 `0 → 1` rows.

- [ ] **Step 7: Prove every class compiles**

Run from the repo root: `node <temp>/p2b1-tw-probe.mjs "src/app/[locale]/(dashboard)/master-data/branches/page.tsx"`
Expected: `checked 21 classes, missing 0` (exit 0). None of them is new to `src`; the button, field, table and strip classes come from the primitives, which Tasks 3–9 probed.

- [ ] **Step 8: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, and 4 more tests than before Step 2 (2 in `list-pages-ui`, 2 in `list-filters-ui`; 1 skipped as before).
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/` (`npx eslint "src/app/[locale]/(dashboard)/master-data/branches/page.tsx" tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts` prints nothing).

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- `git diff --stat` (unstaged) shows 4 files: the page with 192 insertions and 319 deletions, `tests/list-filters-ui.test.ts` 27 insertions, `tests/list-frame-guards.test.ts` 3 insertions and 12 deletions, `tests/visual-foundation-guards.test.ts` 1 deletion.
- `git status` also lists `D  src/components/master-data/branch-delete-button.tsx` (staged by `git rm`) and `?? tests/list-pages-ui.test.ts` (52 lines).
- `node -e "const s=require('fs').readFileSync(process.argv[1],'utf8');console.log((s.match(/\r\n/g)||[]).length,(s.match(/\n/g)||[]).length)" "src/app/[locale]/(dashboard)/master-data/branches/page.tsx"` prints `317 317` (CRLF throughout). A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).
- Git may warn that LF will be replaced by CRLF in `tests/list-pages-ui.test.ts`. Leave it LF.

- [ ] **Step 9: Commit**

```bash
git add "src/app/[locale]/(dashboard)/master-data/branches/page.tsx" tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): branches list on DataTable, RowActions, StatStrip and the shared filters (2B-1 task 13)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 6 files in the commit, the wrapper among them as a deletion (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the plan 2B-1 dev-app check (Task 25, spec §10.5 rows "ข้อมูลหลัก 8 หน้า" and the keyboard and axe lists):** `/th/master-data/branches` at 1440, 1366, 1280, 1024, 768 and 375:
- the strip: no fills; with `?assetUsage=withoutAssets` that cell is light blue with a line under it; a non-zero "ยังไม่มีทรัพย์สิน" or "ยังไม่มีที่ตั้ง" has the warning line and icon; 2 × 2 below 1024
- the filter panel: fields 40px (44 at 375), "ล้างตัวกรอง" only after a filter is applied; Enter in the search submits
- the table: header white 13/500 faint, no capitals; rows about 46px; sort by "ที่ตั้ง" twice and the arrow flips; counts right-aligned and a 0 lines up with the linked counts
- ⋯ → "ลบ" → the confirm → "ยกเลิก": focus back on ⋯, nothing deleted; clicking ⋯ or "ลบ" does not open the edit page; "แก้ไข" and a click on the row open the edit page with `returnTo`
- at 375: ⋯ opens the bottom sheet with the code as its title; tapping the scrim closes it without opening the row; the table scrolls sideways and the hint line shows
- the footer: "1–25 จาก N รายการ · หน้า 1 จาก M"; 50 keeps the filters; `?page=99` lands on the last page; a search that finds nothing shows the empty state with "ล้างตัวกรอง"
- axe: no `color-contrast`, `label` or `aria-*` violation with a filter on

---

### Task 14: `D/master-data/brands/page.tsx` on the list primitives, with `RowActions` in the brand panel (I11)

Spec §10.3 row 14, with §5.3 row "brands", §6.5 row 2, §10.4 table A row `master-data-brand-supplier-ui.test.ts:9-10`, rulings I5, I11, I21 and R-b, R-h, R-n. One page, one commit, two wrappers deleted. The page and `tests/master-data-brand-supplier-ui.test.ts` are CRLF; the test is read without stripping `\r`, so its new regexes have no `\n`. Task 13's shape applies; this lists only what differs.

Rulings this task applies:
- **I11:** the brand picker (`<aside>`) stays a vertical list of links with `aria-current="page"` on the chosen one. Its two `aria-current` sites are the `KEEP.LN1` row of this file (2), so LN1 keeps `2:2`. The count links keep their class string (`tests/master-data-brand-supplier-ui.test.ts:44`). The "all brands" count pill becomes plain `text-meta text-muted-foreground num` (§5.3).
- **I5:** the selected-brand panel gets `RowActions` with `next` = "แก้ไขยี่ห้อนี้" (`t("editSelectedBrand")`, the same `selectedBrandEditHref`) and `` deleteAction={{ endpoint: `/api/brands/${selectedBrand.id}` }} ``, with `className="justify-start"` (the panel is left-aligned; `cn()` drops `justify-end`). Brands and models have no code, so `code` is the name (it is read after "แก้ไข" and is the phone sheet's title). Each model row gets `RowActions` with `next` = "แก้ไข" and `` deleteAction={{ endpoint: `/api/models/${model.id}` }} ``. `brand-delete-button.tsx` and `asset-model-delete-button.tsx` have no caller left and go in this commit. The panel label loses `uppercase` and `font-semibold` (sentence case, `text-xs font-medium`).
- **R-h over §5.3:** §5.3 maps the three `h-10` header links to `size="lg"`, but R-h (synthesis, which overrides the section files) puts every header button at `size: "md"`, as `MasterDataHeader` already did for the create link. So: export, template and "เพิ่มยี่ห้อ" are `outline md`, "เพิ่มรุ่น" (primary) is last. The four buttons wrap onto a second line at 768.
- **R-b:** the "เพิ่มรุ่น" button in the model panel head keeps 40px (`h-10` → `outline lg`).
- **§6.5 row 2:** the model filter card keeps its own frame and heading (`modelWorkspaceTitle`); only the form inside moves: `<form role="search">`, `Field label={t("modelFiltersTitle")}` + `SearchField`, the three selects as the shared `FilterSelect` (the category one keeps `allLabel`), and `FilterFormActions` without the `Filter` icon. `hasActiveFilters` counts search, category, photo and usage, not `modelBrandId` (the picker has its own "all brands" link).
- **§3.4, §3.15:** the model table moves into `ContentPanel divided flush` (title, subtitle and the panel's "เพิ่มรุ่น") with `DataTable framed={false}`, so there is no frame inside a frame. The panel gets `className="overflow-hidden"`: `ContentPanel` does not clip, and without it the table foot and a hovered last row would paint square corners over the panel's 12px rounded border. The model table has no sortable heads (as today); `colSpan` of the empty row is `modelColumnCount` (6 with a brand chosen, 7 without).
- **I21:** the past-the-end redirect uses the model pager (`modelPage`, `modelPageSize`, `modelTotal`).
- **R-n:** the specs cell is `orNil(summarizeModelSpecs(...))`; the empty duplicate list shows `<Nil />`. The category in "CODE - name" gets an inner `tag`.
- **§10.4 table A:** `tests/master-data-brand-supplier-ui.test.ts:9-10` move to `<PageHeader … href={createModelHref}` and `{t("createModel")}`. `:11`, `:22`, `:23-25`, `:40`, `:44`, `:57-59` and `:80` pass without edits.
- **Ruling (test):** `tests/list-pages-ui.test.ts` gets the brands line in `MASTER_DATA_LISTS` (both endpoints, both wrappers) and one brand-only test for the panel.

What users will see on `/th/master-data/brands`:
- The header holds four buttons: three outline (export, template, "เพิ่มยี่ห้อ") and the primary "เพิ่มรุ่น", 36px on desktop; at 768 they wrap under the title.
- The three number boxes become one flat strip; a non-zero duplicate count gets a warning line with an icon.
- The brand picker looks as before, except that the "all" count is plain text. The chosen brand's panel shows "แก้ไขยี่ห้อนี้" and ⋯ with "ลบ" (the same confirm).
- The model filters are 40px labelled fields; "ล้างตัวกรอง" shows only while a model filter is on.
- The model table sits in a panel with a header line; white table header, no capitals; "แก้ไข" + ⋯ per row; a footer with the range, 25/50/100 and words-only buttons; a model page past the end opens the last page.

Not in this task: `buildBrandModelQueryString` and the queries (unchanged) · the brand and model forms (Task 22) · `DuplicateGroupList` (kept, only its dash) · messages · docs.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/master-data/brands/page.tsx` (CRLF, 11 exact replacements)
- Delete: `src/components/master-data/brand-delete-button.tsx`, `src/components/master-data/asset-model-delete-button.tsx`
- Modify: `tests/master-data-brand-supplier-ui.test.ts` (CRLF, 1 replacement)
- Modify: `tests/list-pages-ui.test.ts` (LF, 1 replacement and one block appended), `tests/list-filters-ui.test.ts` (LF, 1 replacement)
- Modify: `tests/list-frame-guards.test.ts`, `tests/visual-foundation-guards.test.ts` (through `p2b-budget.mjs` only)
- Temp folder only: `t14-pages-block.ts`

**Must keep passing without edits:** `tests/master-data-return-navigation.test.ts` (brands: `const brandReturnHref = `, `/brands/new` and `/brands/${selectedBrand.id}/edit`) · `tests/master-data-brand-supplier-ui.test.ts` except `:9-10` · `tests/confirm-dialog-ui.test.ts` · `tests/row-actions-ui.test.ts` · `tests/list-primitives-ui.test.ts` · `tests/form-migration-guards.test.ts` · the LFG and VFG rows of every other file.

**Interfaces:**
- Consumes: everything Task 13 consumes, plus Task 11's `ContentPanel({ divided: true, flush, title, description, actions, className })` from `@/components/ui/content-panel`, `DataTable framed={false}`, `FilterSelect allLabel`, `Nil` from `@/components/ui/nil`; Task 13's `tests/list-pages-ui.test.ts` (`MASTER_DATA_LISTS` ending with the branches line) and `MIGRATED_FILTER_FILES` (ending with the branches line); `p2b1-t13-precheck.mjs`.
- Produces: the brands line in both lists; LFG `BUDGETS` keeps only `LN1` 2 for the page, which joins `MIGRATED_LIST_FILES`; no VFG row.

| guard | `D/master-data/brands/page.tsx` before → after |
|---|---|
| VFG R7 | 1 → – |
| LFG | LH2 2 · LF1 1 · LT3 1 · LT4 1 · LT5 2 · LV1 2 · LV2 1 · LS1 1 · LR1 2 → all – · LN1 2 → 2 (KEEP, I11) · joins `MIGRATED_LIST_FILES` |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b1-t13-precheck.mjs 14`
Expected: `git status` prints nothing. The script prints the ten `ok` lines of Task 13 Step 1 for Tasks 1–12 and the keys, then:
```
ok      src/app/[locale]/(dashboard)/master-data/brands/page.tsx is CRLF and unchanged since d38a0ee (hash 320ba387ea35d5f7)
ok      src/app/[locale]/(dashboard)/master-data/brands/page.tsx still calls MasterDataHeader
ok      src/components/master-data/brand-delete-button.tsx exists and only this page imports it
ok      src/components/master-data/asset-model-delete-button.tsx exists and only this page imports it
ok      tests/list-pages-ui.test.ts holds the lines of the earlier tasks only
ok      tests/list-filters-ui.test.ts holds the lines of the earlier tasks only
ok      tests/master-data-brand-supplier-ui.test.ts still pins MasterDataHeader (:9-10)
info    src/app/[locale]/(dashboard)/master-data/brands/page.tsx: CRLF
info    tests/list-frame-guards.test.ts: LF
info    tests/list-filters-ui.test.ts: LF
info    tests/list-pages-ui.test.ts: LF
info    tests/master-data-brand-supplier-ui.test.ts: CRLF
preconditions hold for Task 14
```
On any `MISSING` line, stop and report it.

Run: `node <temp>/p2b1-precheck.mjs --file D/master-data/brands/page.tsx`
Expected (exit 0): rows `R7 1`, `LH2 2`, `LF1 1`, `LT3 1`, `LT4 1`, `LT5 2`, `LV1 2`, `LV2 1`, `LS1 1`, `LN1 2` (keep 2), `LR1 2`, each with live = budget = seed, and
```
args    R7=1:1 LH2=2:2 LF1=1:1 LT3=1:1 LT4=1:1 LT5=2:2 LV1=2:2 LV2=1:1 LS1=1:1 LN1=2:2 LR1=2:2
```

- [ ] **Step 2: The failing tests**

(a) `tests/master-data-brand-supplier-ui.test.ts:9-10` (CRLF, read with `\r`: the new regexes have no `\n`). Replace:

```ts
  assert.match(source, /<MasterDataHeader[\s\S]*createHref=\{createModelHref\}/)
  assert.match(source, /createLabel=\{t\("createModel"\)\}/)
```

with:

```ts
  assert.match(source, /<PageHeader[\s\S]*href=\{createModelHref\}/)
  assert.match(source, /\{t\("createModel"\)\}/)
```

(b) `tests/list-pages-ui.test.ts`: add the brands line. Replace:

```ts
  { path: `${D}master-data/branches/page.tsx`, deleteEndpoints: ["/api/branches/${branch.id}"], removedWrappers: [`${C}master-data/branch-delete-button.tsx`], stats: true },
]
```

with:

```ts
  { path: `${D}master-data/branches/page.tsx`, deleteEndpoints: ["/api/branches/${branch.id}"], removedWrappers: [`${C}master-data/branch-delete-button.tsx`], stats: true },
  { path: `${D}master-data/brands/page.tsx`, deleteEndpoints: ["/api/models/${model.id}", "/api/brands/${selectedBrand.id}"], removedWrappers: [`${C}master-data/brand-delete-button.tsx`, `${C}master-data/asset-model-delete-button.tsx`], stats: true },
]
```

(c) Save this block as `t14-pages-block.ts` in your temp folder, then run `node <temp>/p2b1-append.mjs <temp>/t14-pages-block.ts tests/list-pages-ui.test.ts`:

```ts
test("the selected brand keeps the vertical brand picker and gets RowActions: edit brand, delete in ⋯ (spec 2B I5, I11)", () => {
  const source = read(`${D}master-data/brands/page.tsx`)
  const start = source.indexOf("{selectedBrand ? (")
  assert.ok(start !== -1, "the selected brand panel")
  const panel = source.slice(start, source.indexOf("</aside>", start))
  assert.match(panel, /<RowActions\n\s+code=\{selectedBrand\.name\}/)
  assert.match(panel, /next=\{\{ label: t\("editSelectedBrand"\), href: selectedBrandEditHref, icon: <Pencil aria-hidden="true" \/> \}\}/)
  assert.match(panel, /deleteAction=\{\{ endpoint: `\/api\/brands\/\$\{selectedBrand\.id\}` \}\}/)
  assert.equal(source.match(/aria-current=\{/g)?.length, 2, "the picker keeps aria-current=\"page\" on its two links (I11, LFG KEEP.LN1)")
  assert.match(source, /<ContentPanel\n\s+divided\n\s+flush\n/, "the model table sits flush in a divided panel: no frame in a frame")
  assert.match(source, /<DataTable\n\s+framed=\{false\}/)
})
```

(d) `tests/list-filters-ui.test.ts`: add the brands line. Replace:

```ts
  "src/app/[locale]/(dashboard)/master-data/branches/page.tsx",
]
```

with:

```ts
  "src/app/[locale]/(dashboard)/master-data/branches/page.tsx",
  "src/app/[locale]/(dashboard)/master-data/brands/page.tsx",
]
```

Run: `node --test tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/master-data-brand-supplier-ui.test.ts`
Expected: FAIL, `tests 12 · pass 7 · fail 5`:
- `brand model page exposes create model action in the top header`: no match for `/<PageHeader[\s\S]*href=\{createModelHref\}/`
- `master-data lists build on …`: `…/master-data/brands/page.tsx: no <PageHeader`
- `a master-data list past its last page …`: message `src/app/[locale]/(dashboard)/master-data/brands/page.tsx`
- `the selected brand keeps the vertical brand picker …`: no match for `/<RowActions\n\s+code=\{selectedBrand\.name\}/`
- `migrated filter forms … (item 5)`: `…/master-data/brands/page.tsx: a raw select or textarea`

- [ ] **Step 3: Lower the guard rows of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs D/master-data/brands/page.tsx R7=1:0 LH2=2:0 LF1=1:0 LT3=1:0 LT4=1:0 LT5=2:0 LV1=2:0 LV2=1:0 LS1=1:0 LN1=2:2 LR1=2:0 --migrated`
Expected (exit 0):
```
R7: 1 -> 0 (row deleted)
LH2: 2 -> 0 (row deleted)
LF1: 1 -> 0 (row deleted)
LT3: 1 -> 0 (row deleted)
LT4: 1 -> 0 (row deleted)
LT5: 2 -> 0 (row deleted)
LV1: 2 -> 0 (row deleted)
LV2: 1 -> 0 (row deleted)
LS1: 1 -> 0 (row deleted)
LN1: 2 kept
LR1: 2 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/master-data/brands/page.tsx
```

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 36 · fail 11`:
- LFG: LH2, LF1, LT3, LT4, LT5, LV1, LV2, LS1 and LR1 fail with `LH2: 25 in 14 files`, `LF1: 9 in 9 files`, `LT3: 15 in 14 files`, `LT4: 10 in 10 files`, `LT5: 21 in 11 files`, `LV1: 40 in 16 files`, `LV2: 127 in 42 files`, `LS1: 29 in 26 files`, `LR1: 9 in 7 files`, each listing only the brands page; `L0` lists the same 9 lines. LN1 passes (2 ≤ 2).
- VFG: the R7 test fails with `43 matches in 30 files; over budget:` and `src/app/[locale]/(dashboard)/master-data/brands/page.tsx: 1 > 0`.

- [ ] **Step 4: Move the page onto the primitives (`src/app/[locale]/(dashboard)/master-data/brands/page.tsx`, CRLF)**

Eleven exact replacements, top to bottom. Make all of them before you compile.

(1) Imports. `Edit`, `Filter`, `Search`, both delete buttons, `ColumnHeader` and `MasterDataHeader` go. The imports from `paginationRange` down stay.

Replace:

```tsx
import Link from "next/link"
import Image from "next/image"
import type { Prisma } from "@prisma/client"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, Download, Edit, FileSpreadsheet, Filter, ImageIcon, Plus, Search } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { BrandDeleteButton } from "@/components/master-data/brand-delete-button"
import { AssetModelDeleteButton } from "@/components/master-data/asset-model-delete-button"
import { summarizeModelSpecs } from "@/lib/model-specs"
import {
  ActiveBadge,
  ColumnHeader,
  MasterDataHeader,
} from "@/components/master-data/master-data-layout"
```

with:

```tsx
import Link from "next/link"
import Image from "next/image"
import { redirect } from "next/navigation"
import type { Prisma } from "@prisma/client"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, Download, FileSpreadsheet, ImageIcon, Pencil, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { summarizeModelSpecs } from "@/lib/model-specs"
import { ActiveBadge } from "@/components/master-data/master-data-layout"
import { buttonVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { FilterFormActions } from "@/components/ui/filter-panel"
import { FilterSelect } from "@/components/ui/filter-select"
import { Nil, orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
```

(2) Right after the queries: the list href and the past-the-end redirect of the model pager.

Replace:

```tsx
  ])

  const brandNavigatorItems = buildBrandNavigatorItems(
```

with:

```tsx
  ])

  const listHref = (next: Partial<BrandModelListState>) => `${basePath}?${buildBrandModelQueryString(listState, next)}`
  // A model page past the last one (an old link, or the last model of the last page deleted) shows the last page (spec 2B I21).
  const lastPage = lastListPage(modelTotal, listState.modelPageSize)
  if (models.length === 0 && modelTotal > 0 && listState.modelPage > lastPage) {
    redirect(listHref({ modelPage: lastPage }))
  }

  const brandNavigatorItems = buildBrandNavigatorItems(
```

(3) The range, the filter flag and the column count; the page root, the header and the number strip.

Replace:

```tsx
    : ""

  return (
    <div className="space-y-4">
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={createModelHref}
        createLabel={t("createModel")}
        actions={
          <>
            <Link
              href="/api/brand-models/export"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Download className="h-4 w-4" />
              {t("downloadBrandModelExport")}
            </Link>
            <Link
              href="/api/brand-models/import-template"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {t("downloadBrandModelTemplate")}
            </Link>
            <Link
              href={appendMasterDataReturnTo(`/${locale}/master-data/brands/new`, brandReturnHref)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Plus className="h-4 w-4" />
              {t("createBrand")}
            </Link>
          </>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryTile label={t("brandTotal")} value={brandNavigatorItems.length} detail={t("brandNavigatorSummaryHelp")} />
        <SummaryTile label={t("modelTotal")} value={modelTotal} detail={t("filteredBySearchAndFilters")} />
        <SummaryTile
          label={t("duplicateReviewTitle")}
          value={totalDuplicateGroups}
          detail={t("duplicateReviewShort")}
          tone={totalDuplicateGroups > 0 ? "warning" : "neutral"}
        />
      </div>
```

with:

```tsx
    : ""
  const { start, end, totalPages } = paginationRange(listState.modelPage, listState.modelPageSize, modelTotal)
  // modelBrandId is not a filter of this form: the brand list beside it has its own "all brands" link.
  const hasActiveFilters = Boolean(searchText || listState.modelCategoryId || listState.modelPhoto !== "all" || listState.modelUsage !== "all")
  const modelColumnCount = selectedBrand ? 6 : 7

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <>
            <Link href="/api/brand-models/export" className={buttonVariants({ variant: "outline", size: "md" })}>
              <Download aria-hidden="true" />
              {t("downloadBrandModelExport")}
            </Link>
            <Link href="/api/brand-models/import-template" className={buttonVariants({ variant: "outline", size: "md" })}>
              <FileSpreadsheet aria-hidden="true" />
              {t("downloadBrandModelTemplate")}
            </Link>
            <Link href={appendMasterDataReturnTo(`/${locale}/master-data/brands/new`, brandReturnHref)} className={buttonVariants({ variant: "outline", size: "md" })}>
              <Plus aria-hidden="true" />
              {t("createBrand")}
            </Link>
            <Link href={createModelHref} className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden="true" />
              {t("createModel")}
            </Link>
          </>
        }
      />

      <StatStrip
        items={[
          {
            key: "brands",
            label: t("brandTotal"),
            value: formatCount(brandNavigatorItems.length),
            foot: t("brandNavigatorSummaryHelp"),
            footTitle: t("brandNavigatorSummaryHelp"),
          },
          {
            key: "models",
            label: t("modelTotal"),
            value: formatCount(modelTotal),
            foot: t("filteredBySearchAndFilters"),
            footTitle: t("filteredBySearchAndFilters"),
          },
          {
            key: "duplicates",
            label: t("duplicateReviewTitle"),
            value: formatCount(totalDuplicateGroups),
            foot: t("duplicateReviewShort"),
            footTitle: t("duplicateReviewShort"),
            attention: totalDuplicateGroups > 0,
          },
        ]}
      />
```

(4) The "all brands" count.

Replace:

```tsx
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{duplicateModelSource.length}</span>
```

with:

```tsx
              <span className="text-meta text-muted-foreground num">{formatCount(duplicateModelSource.length)}</span>
```

(5) The selected-brand panel.

Replace:

```tsx
              <div className="mb-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                {t("selectedBrandActions")}
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={selectedBrandEditHref}
                  className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-surface px-2 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <Edit className="h-4 w-4" />
                  <span className="truncate">{t("editSelectedBrand")}</span>
                </Link>
                <BrandDeleteButton id={selectedBrand.id} />
              </div>
```

with:

```tsx
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                {t("selectedBrandActions")}
              </div>
              <RowActions
                code={selectedBrand.name}
                menuLabel={tCommon("moreActionsFor", { code: selectedBrand.name })}
                next={{ label: t("editSelectedBrand"), href: selectedBrandEditHref, icon: <Pencil aria-hidden="true" /> }}
                groups={[]}
                deleteAction={{ endpoint: `/api/brands/${selectedBrand.id}` }}
                className="justify-start"
              />
```

(6) The model filter form and its search field. The three `FilterSelect` calls below it stay.

Replace:

```tsx
            <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(3,minmax(150px,1fr))_auto]" action={basePath}>
              <input type="hidden" name="brandPage" value="1" />
              <input type="hidden" name="brandPageSize" value={listState.brandPageSize} />
              <input type="hidden" name="modelPage" value="1" />
              <input type="hidden" name="modelPageSize" value={listState.modelPageSize} />
              <input type="hidden" name="modelBrandId" value={listState.modelBrandId} />
              <label className="space-y-1 text-sm font-medium text-foreground">
                <span>{t("modelFiltersTitle")}</span>
                <span className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    name="search"
                    defaultValue={searchText}
                    placeholder={t("searchPlaceholder")}
                    className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                  />
                </span>
              </label>
```

with:

```tsx
            <form role="search" action={basePath} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(3,minmax(150px,1fr))_auto]">
              <input type="hidden" name="brandPage" value="1" />
              <input type="hidden" name="brandPageSize" value={listState.brandPageSize} />
              <input type="hidden" name="modelPage" value="1" />
              <input type="hidden" name="modelPageSize" value={listState.modelPageSize} />
              <input type="hidden" name="modelBrandId" value={listState.modelBrandId} />
              <Field label={t("modelFiltersTitle")}>
                <SearchField name="search" defaultValue={searchText} placeholder={t("searchPlaceholder")} />
              </Field>
```

(7) The filter buttons.

Replace:

```tsx
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
                >
                  <Filter className="h-4 w-4" />
                  {tCommon("filter")}
                </button>
                <Link
                  href={basePath}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
                >
                  {t("clearFilters")}
                </Link>
              </div>
```

with:

```tsx
              <FilterFormActions submitLabel={tCommon("filter")} clear={hasActiveFilters ? { href: basePath, label: t("clearFilters") } : undefined} />
```

(8) The model table panel and its pager.

Replace:

```tsx
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="flex flex-col gap-3 border-b border-border px-4 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t("modelsTitle")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("modelsSubtitle")}</p>
              </div>
              <Link
                href={createModelHref}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
              >
                <Plus className="h-4 w-4" />
                {t("createModel")}
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <ColumnHeader>{t("modelName")}</ColumnHeader>
                    {!selectedBrand ? <ColumnHeader>{t("brand")}</ColumnHeader> : null}
                    <ColumnHeader>{t("category")}</ColumnHeader>
                    <ColumnHeader>{t("specs")}</ColumnHeader>
                    <ColumnHeader>{t("assets")}</ColumnHeader>
                    <ColumnHeader>{tCommon("status")}</ColumnHeader>
                    <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {models.length === 0 ? (
                    <tr>
                      <td colSpan={selectedBrand ? 6 : 7} className="h-32 px-4 text-center text-muted-foreground">
                        {tCommon("noData")}
                      </td>
                    </tr>
                  ) : (
                    models.map((model) => {
                      const photo = primaryPhotoByModelId.get(model.id)
                      const canPreviewPhoto = photo ? previewableModelPhotoTypes.has(photo.fileType) : false
                      const editModelHref = appendBrandModelReturnTo(`/${locale}/master-data/brands/models/${model.id}/edit`, brandModelReturnHref)
                      const modelDrilldown = buildModelDrilldownHrefs({ locale, modelId: model.id })

                      return (
                        <ClickableTableRow
                          key={model.id}
                          href={editModelHref}
                          label={`${tCommon("edit")}: ${model.name}`}
                        >
                          <td className="min-w-[220px] px-4 py-3 font-medium text-foreground">
                            <div className="flex items-center gap-3">
                              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted text-muted-foreground">
                                {photo && canPreviewPhoto ? (
                                  <Image
                                    src={`/api/attachments/${photo.id}?inline=1`}
                                    alt=""
                                    fill
                                    unoptimized
                                    className="object-contain p-1"
                                    sizes="48px"
                                  />
                                ) : (
                                  <ImageIcon className="h-5 w-5" aria-hidden="true" />
                                )}
                              </div>
                              <span className="min-w-0 truncate">{model.name}</span>
                            </div>
                          </td>
                          {!selectedBrand ? (
                            <td className="min-w-32 px-4 py-3 text-muted-foreground">{model.brand.name}</td>
                          ) : null}
                          <td className="min-w-44 px-4 py-3 text-muted-foreground">
                            {model.category.code} - {model.category.name}
                          </td>
                          <td className="min-w-[220px] max-w-lg px-4 py-3 text-muted-foreground">
                            <span className="line-clamp-2">{summarizeModelSpecs(model.specs) || "-"}</span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                            {model._count.assets > 0 ? (
                              <Link
                                prefetch={false}
                                href={modelDrilldown.assets}
                                className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                              >
                                {model._count.assets.toLocaleString()}
                              </Link>
                            ) : (
                              "0"
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <ActiveBadge label={tCommon("active")} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <Link
                                href={editModelHref}
                                title={tCommon("edit")}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary-soft"
                              >
                                <Edit className="h-4 w-4" />
                              </Link>
                              <AssetModelDeleteButton id={model.id} />
                            </div>
                          </td>
                        </ClickableTableRow>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            <BrandModelPagination
              current={listState}
              total={modelTotal}
              basePath={basePath}
              pageKey="modelPage"
              pageSizeKey="modelPageSize"
              labels={{
                rowsPerPage: tCommon("rowsPerPage"),
                page: tCommon("page"),
                of: tCommon("of"),
                previous: tCommon("previous"),
                next: tCommon("next"),
              }}
            />
          </div>
```

with:

```tsx
          <ContentPanel
            divided
            flush
            className="overflow-hidden"
            title={t("modelsTitle")}
            description={t("modelsSubtitle")}
            actions={
              <Link href={createModelHref} className={buttonVariants({ variant: "outline", size: "lg" })}>
                <Plus aria-hidden="true" />
                {t("createModel")}
              </Link>
            }
          >
            <DataTable
              framed={false}
              caption={t("modelsTitle")}
              scrollHint={tCommon("tableScrollHint")}
              footer={
                modelTotal > 0 ? (
                  <Pagination
                    page={listState.modelPage}
                    totalPages={totalPages}
                    previousHref={listHref({ modelPage: listState.modelPage - 1 })}
                    nextHref={listHref({ modelPage: listState.modelPage + 1 })}
                    pageSize={listState.modelPageSize}
                    pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: listHref({ modelPageSize: value, modelPage: 1 }) }))}
                    labels={{
                      navigation: tCommon("pagination"),
                      previous: tCommon("previous"),
                      next: tCommon("next"),
                      pageOf: tCommon("pageOf", { page: listState.modelPage, total: totalPages }),
                      range: tCommon("showingRange", { from: formatCount(start), to: formatCount(end), total: formatCount(modelTotal) }),
                      pageSizeGroup: tCommon("pageSizeLabel"),
                      rowsPerPage: tCommon("rowsPerPage"),
                    }}
                  />
                ) : undefined
              }
            >
              <DataTableHeader>
                <tr>
                  <DataTableHead>{t("modelName")}</DataTableHead>
                  {!selectedBrand ? <DataTableHead>{t("brand")}</DataTableHead> : null}
                  <DataTableHead>{t("category")}</DataTableHead>
                  <DataTableHead>{t("specs")}</DataTableHead>
                  <DataTableHead align="right">{t("assets")}</DataTableHead>
                  <DataTableHead>{tCommon("status")}</DataTableHead>
                  <DataTableHead align="right" hideLabel>{tCommon("actions")}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {models.length === 0 ? (
                  hasActiveFilters ? (
                    <TableEmptyRow colSpan={modelColumnCount} emptyState={{ title: tCommon("noData"), actionHref: basePath, actionLabel: t("clearFilters"), actionVariant: "secondary" }} />
                  ) : (
                    <TableEmptyRow colSpan={modelColumnCount}>{tCommon("noData")}</TableEmptyRow>
                  )
                ) : (
                  models.map((model) => {
                    const photo = primaryPhotoByModelId.get(model.id)
                    const canPreviewPhoto = photo ? previewableModelPhotoTypes.has(photo.fileType) : false
                    const editModelHref = appendBrandModelReturnTo(`/${locale}/master-data/brands/models/${model.id}/edit`, brandModelReturnHref)
                    const modelDrilldown = buildModelDrilldownHrefs({ locale, modelId: model.id })

                    return (
                      <ClickableTableRow
                        key={model.id}
                        href={editModelHref}
                        label={`${tCommon("edit")}: ${model.name}`}
                      >
                        <DataTableCell className="min-w-[220px] font-medium text-foreground">
                          <div className="flex items-center gap-3">
                            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted text-muted-foreground">
                              {photo && canPreviewPhoto ? (
                                <Image
                                  src={`/api/attachments/${photo.id}?inline=1`}
                                  alt=""
                                  fill
                                  unoptimized
                                  className="object-contain p-1"
                                  sizes="48px"
                                />
                              ) : (
                                <ImageIcon className="h-5 w-5" aria-hidden="true" />
                              )}
                            </div>
                            <span className="min-w-0 truncate">{model.name}</span>
                          </div>
                        </DataTableCell>
                        {!selectedBrand ? (
                          <DataTableCell className="min-w-32 text-muted-foreground">{model.brand.name}</DataTableCell>
                        ) : null}
                        <DataTableCell className="min-w-44 text-muted-foreground">
                          <span className="tag">{model.category.code}</span> - {model.category.name}
                        </DataTableCell>
                        <DataTableCell className="min-w-[220px] max-w-lg text-muted-foreground">
                          <span className="line-clamp-2">{orNil(summarizeModelSpecs(model.specs))}</span>
                        </DataTableCell>
                        <DataTableCell numeric className="text-muted-foreground">
                          {model._count.assets > 0 ? (
                            <Link
                              prefetch={false}
                              href={modelDrilldown.assets}
                              className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                            >
                              {formatCount(model._count.assets)}
                            </Link>
                          ) : (
                            <span className="px-2">{formatCount(0)}</span>
                          )}
                        </DataTableCell>
                        <DataTableCell className="whitespace-nowrap">
                          <ActiveBadge label={tCommon("active")} />
                        </DataTableCell>
                        <DataTableCell align="right">
                          <RowActions
                            code={model.name}
                            menuLabel={tCommon("moreActionsFor", { code: model.name })}
                            next={{ label: tCommon("edit"), href: editModelHref, icon: <Pencil aria-hidden="true" /> }}
                            groups={[]}
                            deleteAction={{ endpoint: `/api/models/${model.id}` }}
                          />
                        </DataTableCell>
                      </ClickableTableRow>
                    )
                  })
                )}
              </DataTableBody>
            </DataTable>
          </ContentPanel>
```

(9) `SummaryTile` and `FilterSelect` go; `DuplicateGroupList` stays.

Replace:

```tsx
}

function SummaryTile({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string
  value: number
  detail: string
  tone?: "neutral" | "warning"
}) {
  return (
    <div className={`rounded-lg border bg-surface p-4 ${tone === "warning" ? "border-warning-border" : "border-border"}`}>
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-bold text-foreground">{value.toLocaleString()}</div>
      <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
    </div>
  )
}

function FilterSelect({
  label,
  name,
  defaultValue,
  allLabel,
  options,
}: {
  label: string
  name: string
  defaultValue: string
  allLabel?: string
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="space-y-1 text-sm font-medium text-foreground">
      <span>{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
      >
        {allLabel ? <option value="">{allLabel}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function DuplicateGroupList({
```

with:

```tsx
}

function DuplicateGroupList({
```

(10) The empty duplicate list.

Replace:

```tsx
        <div className="mt-2 text-sm text-muted-foreground">-</div>
```

with:

```tsx
        <div className="mt-2 text-sm">
          <Nil />
        </div>
```

(11) `BrandModelPagination` goes. The file then ends with the `}` of `DuplicateGroupList` and one line break.

Replace:

```tsx
}

function BrandModelPagination({
  current,
  total,
  basePath,
  pageKey,
  pageSizeKey,
  labels,
}: {
  current: BrandModelListState
  total: number
  basePath: string
  pageKey: "brandPage" | "modelPage"
  pageSizeKey: "brandPageSize" | "modelPageSize"
  labels: {
    rowsPerPage: string
    page: string
    of: string
    previous: string
    next: string
  }
}) {
  const page = current[pageKey]
  const pageSize = current[pageSizeKey]
  const { start, end, totalPages } = paginationRange(page, pageSize, total)
  const safePage = Math.min(page, totalPages)
  const previousPage = Math.max(1, safePage - 1)
  const nextPage = Math.min(totalPages, safePage + 1)

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div>
        {start}-{end} {labels.of} {total}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span>{labels.rowsPerPage}</span>
        {[25, 50, 100].map((nextPageSize) => (
          <Link
            key={nextPageSize}
            href={`${basePath}?${buildBrandModelQueryString(current, {
              [pageKey]: 1,
              [pageSizeKey]: nextPageSize,
            } as Partial<BrandModelListState>)}`}
            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 transition-colors ${
              pageSize === nextPageSize ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface hover:bg-accent"
            }`}
          >
            {nextPageSize}
          </Link>
        ))}
        <span className="px-2">
          {labels.page} {safePage} {labels.of} {totalPages}
        </span>
        <Link
          href={`${basePath}?${buildBrandModelQueryString(current, { [pageKey]: previousPage } as Partial<BrandModelListState>)}`}
          aria-disabled={safePage <= 1}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${
            safePage <= 1 ? "pointer-events-none opacity-50" : "hover:bg-accent"
          }`}
        >
          {labels.previous}
        </Link>
        <Link
          href={`${basePath}?${buildBrandModelQueryString(current, { [pageKey]: nextPage } as Partial<BrandModelListState>)}`}
          aria-disabled={safePage >= totalPages}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${
            safePage >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-accent"
          }`}
        >
          {labels.next}
        </Link>
      </div>
    </div>
  )
}
```

with:

```tsx
}
```

Check: `grep -n "toLocaleString\|\"-\"\|MasterDataHeader\|ColumnHeader\|DeleteButton\|bg-muted\|uppercase\|opacity-\|function " "src/app/[locale]/(dashboard)/master-data/brands/page.tsx"` prints three lines: `export default async function BrandsPage(…`, the model thumbnail `<div className="relative flex h-12 w-12 … bg-muted text-muted-foreground">` (a solid fill, not a table header) and `function DuplicateGroupList({`.

- [ ] **Step 5: Delete the two wrappers that have no caller left**

Run: `git rm src/components/master-data/brand-delete-button.tsx src/components/master-data/asset-model-delete-button.tsx`
Expected: two `rm '…'` lines.

Run: `git grep -n "brand-delete-button\|asset-model-delete-button\|BrandDeleteButton\|AssetModelDeleteButton" -- src`
Expected: no output (exit 1).

- [ ] **Step 6: Run the tests for this task**

Run: `node --test tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/master-data-return-navigation.test.ts tests/master-data-brand-supplier-ui.test.ts tests/master-data-workspace.test.ts tests/confirm-dialog-ui.test.ts tests/row-actions-ui.test.ts tests/list-primitives-ui.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `tests 116 · pass 116 · fail 0` (list-pages-ui now 3).

Run: `node <temp>/p2b1-precheck.mjs --file D/master-data/brands/page.tsx`
Expected: `· in MIGRATED_LIST_FILES`, every row 0 except `LN1 2 2 2 2`, and `args    LN1=2:2`; exit 0.

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected: exit 0, `R7 TABLE_HEADER_FILLS 42 in 29 rows`, `LH2 BUDGETS.LH2 23 in 13 rows`, no slack except the two LB1 rows.

- [ ] **Step 7: Prove every class compiles**

Run: `node <temp>/p2b1-tw-probe.mjs "src/app/[locale]/(dashboard)/master-data/brands/page.tsx"`
Expected: `checked 88 classes, missing 0` (the probe also reads the template-literal class strings of the picker, which stay). No class is new to `src`.

- [ ] **Step 8: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 0 fail and 1 more test than before Step 2 (the brand panel test); tsc no errors; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- `git diff --stat` shows 6 files: the page 210 insertions and 328 deletions, `tests/list-pages-ui.test.ts` 14 insertions, `tests/list-filters-ui.test.ts` 1 insertion, `tests/master-data-brand-supplier-ui.test.ts` 2 and 2, `tests/list-frame-guards.test.ts` 1 and 9, `tests/visual-foundation-guards.test.ts` 1 deletion.
- `git status` also lists the two wrappers as `D ` (staged).
- The page stays CRLF throughout (`582 582` with the `node -e` line of Task 13 Step 8); the CRLF test keeps CRLF.

- [ ] **Step 9: Commit**

```bash
git add "src/app/[locale]/(dashboard)/master-data/brands/page.tsx" tests/master-data-brand-supplier-ui.test.ts tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): brands and models list on DataTable and RowActions, brand picker kept (2B-1 task 14)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 8 files in the commit (6 modified, 2 deleted). `git status --short src tests messages` prints nothing.

**For the plan 2B-1 dev-app check (Task 25, spec §10.5 row `/th/master-data/brands`):**
- 1440 and 768: four header buttons, the primary last; at 768 they wrap under the title without squeezing it
- the picker: unchanged list; the chosen brand is marked; the panel below it shows "แก้ไขยี่ห้อนี้" + ⋯ → "ลบ" → confirm → "ยกเลิก" with focus back on ⋯
- the model panel: header line, flush table with rounded corners intact at the bottom (hover the last row); "แก้ไข" + ⋯ per row; the footer pages by model; `?modelPage=99` lands on the last page
- a model filter that finds nothing: the empty state with "ล้างตัวกรอง"; choosing a brand alone does not show "ล้างตัวกรอง" in the filter panel
- 375: ⋯ of a model opens the sheet titled with the model name

---

### Task 15: `D/master-data/categories/page.tsx` on the list primitives

Spec §10.3 row 15, with §5.3 row "categories", §6.5 row 3, rulings I5, I11, I21 and R-h, R-n, R-p. One page, one commit, one wrapper deleted. The page is CRLF. Task 13's shape applies; this lists only what differs.

Rulings this task applies:
- **B5, §5.3:** the row had two text links ("ทรัพย์สิน", "รุ่น"), an edit icon and delete. It becomes `next` = "แก้ไข" and ⋯ = one group with the two drill-down links (`kind: "link"`, `t("viewAssets")`, `t("viewModels")`, the same `drilldown.assets` and `drilldown.models` hrefs), then "ลบ" with `` deleteAction={{ endpoint: `/api/categories/${category.id}` }} ``. `category-delete-button.tsx` goes in this commit.
- **R-h over §5.3:** export and template are `outline md` and the create link is the primary `md`, last (§5.3 wrote `size="lg"` for the two header links; R-h wins).
- **§6.5 row 3:** the five selects become `FilterSelect` with their `options` unchanged; `hasActiveFilters` = search or any of the five not `"all"`. The grid keeps `xl:grid-cols-[minmax(220px,1.4fr)_repeat(5,minmax(150px,1fr))_auto]`.
- **§3.13:** the three "missing" cells set `current` for `withoutModels`, `withoutChecklist` and `withoutPrefix`, and `attention` when their count is above 0.
- **I11:** the two count links keep their class string (`tests/master-data-brand-supplier-ui.test.ts:40`), and `category._count.models > 0` and `href={drilldown.models}` / `href={drilldown.assets}` stay in the cells (`:36-39`).
- **R-n:** the description is `orNil(...)`; the custom-field count goes through `formatCount` like the others.

What users will see on `/th/master-data/categories`: the same changes as branches (Task 13). The row actions are "แก้ไข" + ⋯ with "ทรัพย์สิน", "รุ่น", a line and "ลบ"; the two text links are no longer in the row. The header buttons wrap at 768.

Not in this task: `buildCategoryWhere`, the checklist and prefix settings, the category form (Task 22) · messages: the ⋯ links use the existing `category.viewAssets` and `category.viewModels` ("ทรัพย์สิน", "รุ่น") · docs.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/master-data/categories/page.tsx` (CRLF, 6 exact replacements)
- Delete: `src/components/master-data/category-delete-button.tsx`
- Modify: `tests/list-pages-ui.test.ts`, `tests/list-filters-ui.test.ts` (LF, 1 replacement each)
- Modify: `tests/list-frame-guards.test.ts`, `tests/visual-foundation-guards.test.ts` (through `p2b-budget.mjs` only)

**Must keep passing without edits:** `tests/master-data-brand-supplier-ui.test.ts` (`:36-40` read this page) · `tests/master-data-return-navigation.test.ts` (`const categoryReturnHref = `, `/categories/new`, `/categories/${category.id}/edit`) · `tests/category-list-query.test.ts` and the other tests of Task 13 Step 6.

**Interfaces:**
- Consumes: what Task 13 consumes; `RowActionGroup` items of `kind: "link"` (Task 7); `tests/list-pages-ui.test.ts` ending with the brands line and `MIGRATED_FILTER_FILES` ending with the brands line (Task 14).
- Produces: the categories line in both lists; no LFG or VFG row for the page; the page in `MIGRATED_LIST_FILES`.

| guard | `D/master-data/categories/page.tsx` before → after |
|---|---|
| VFG R7 | 1 → – |
| LFG | LH2 2 · LF1 1 · LT1 1 · LT2 1 · LT3 1 · LT4 1 · LT5 2 · LV1 3 · LV2 1 · LS1 1 · LR1 1 → all – · joins `MIGRATED_LIST_FILES` |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b1-t13-precheck.mjs 15`
Expected: `git status` prints nothing; the ten `ok` lines for Tasks 1–12 and the keys, then `ok` for the page (`hash 768fe0c308388816`), `still calls MasterDataHeader`, `src/components/master-data/category-delete-button.tsx exists and only this page imports it` and the two test-file lines, the `info` lines (page CRLF, the three test files LF) and `preconditions hold for Task 15`. On any `MISSING` line, stop and report it.

Run: `node <temp>/p2b1-precheck.mjs --file D/master-data/categories/page.tsx`
Expected (exit 0): live = budget = seed on every row, and
```
args    R7=1:1 LH2=2:2 LF1=1:1 LT1=1:1 LT2=1:1 LT3=1:1 LT4=1:1 LT5=2:2 LV1=3:3 LV2=1:1 LS1=1:1 LR1=1:1
```

- [ ] **Step 2: The failing tests**

(a) `tests/list-pages-ui.test.ts`: add the categories line. Replace:

```ts
  { path: `${D}master-data/brands/page.tsx`, deleteEndpoints: ["/api/models/${model.id}", "/api/brands/${selectedBrand.id}"], removedWrappers: [`${C}master-data/brand-delete-button.tsx`, `${C}master-data/asset-model-delete-button.tsx`], stats: true },
]
```

with:

```ts
  { path: `${D}master-data/brands/page.tsx`, deleteEndpoints: ["/api/models/${model.id}", "/api/brands/${selectedBrand.id}"], removedWrappers: [`${C}master-data/brand-delete-button.tsx`, `${C}master-data/asset-model-delete-button.tsx`], stats: true },
  { path: `${D}master-data/categories/page.tsx`, deleteEndpoints: ["/api/categories/${category.id}"], removedWrappers: [`${C}master-data/category-delete-button.tsx`], stats: true },
]
```

(b) `tests/list-filters-ui.test.ts`: add the categories line. Replace:

```ts
  "src/app/[locale]/(dashboard)/master-data/brands/page.tsx",
]
```

with:

```ts
  "src/app/[locale]/(dashboard)/master-data/brands/page.tsx",
  "src/app/[locale]/(dashboard)/master-data/categories/page.tsx",
]
```

Run: `node --test tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts`
Expected: FAIL, `tests 6 · pass 3 · fail 3`: `master-data lists build on …` (`…/master-data/categories/page.tsx: no <PageHeader`), `a master-data list past its last page …` (message `src/app/[locale]/(dashboard)/master-data/categories/page.tsx`) and item 5 (`…/master-data/categories/page.tsx: a raw select or textarea`). The brand panel test, Task 6's test and item 6 pass.

- [ ] **Step 3: Lower the guard rows of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs D/master-data/categories/page.tsx R7=1:0 LH2=2:0 LF1=1:0 LT1=1:0 LT2=1:0 LT3=1:0 LT4=1:0 LT5=2:0 LV1=3:0 LV2=1:0 LS1=1:0 LR1=1:0 --migrated`
Expected (exit 0): the twelve `… -> 0 (row deleted)` lines in the order R7, LH2, LF1, LT1, LT2, LT3, LT4, LT5, LV1 (`LV1: 3 -> 0`), LV2, LS1, LR1, then `MIGRATED_LIST_FILES: added` and `written: src/app/[locale]/(dashboard)/master-data/categories/page.tsx`.

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 34 · fail 13`:
- LFG: LH2 (`23 in 13 files`), LF1 (`8 in 8`), LT1 (`42 in 16`), LT2 (`7 in 7`), LT3 (`14 in 13`), LT4 (`9 in 9`), LT5 (`19 in 10`), LV1 (`38 in 15`), LV2 (`126 in 41`), LS1 (`28 in 25`), LR1 (`7 in 6`), each listing only the categories page, and `L0` with the same 11 lines.
- VFG: the R7 test with `42 matches in 29 files; over budget:` and `src/app/[locale]/(dashboard)/master-data/categories/page.tsx: 1 > 0`.

- [ ] **Step 4: Move the page onto the primitives (`src/app/[locale]/(dashboard)/master-data/categories/page.tsx`, CRLF)**

Six exact replacements, top to bottom. Make all six before you compile.

(1) Imports. The imports from `@/lib/category-list-query` and `ClickableTableRow` below stay.

Replace:

```tsx
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { ArrowDown, ArrowUp, Download, Edit, FileSpreadsheet } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { CategoryDeleteButton } from "@/components/master-data/category-delete-button"
import {
  ActiveBadge,
  ColumnHeader,
  MasterDataHeader,
} from "@/components/master-data/master-data-layout"
import { categoryPhotoChecklistKey, parsePhotoChecklist } from "@/lib/category-photo-checklist"
import { assetTagCategoryPrefixesKey } from "@/lib/system-setting-defaults"
import { paginationRange } from "@/lib/master-data-query"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
```

with:

```tsx
import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Download, FileSpreadsheet, Pencil, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { ActiveBadge } from "@/components/master-data/master-data-layout"
import { buttonVariants } from "@/components/ui/button-variants"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
import { FilterSelect } from "@/components/ui/filter-select"
import { orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { categoryPhotoChecklistKey, parsePhotoChecklist } from "@/lib/category-photo-checklist"
import { assetTagCategoryPrefixesKey } from "@/lib/system-setting-defaults"
import { paginationRange } from "@/lib/master-data-query"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
```

(2) After the summary: the list href, the redirect, the range, the filter flag and the sort heads; the page root and the header.

Replace:

```tsx
  const healthSummary = buildCategoryHealthSummary(summaryCategories, { categoryIdsWithChecklist, categoryIdsWithPrefix })

  return (
    <div className="space-y-4">
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={appendMasterDataReturnTo(`/${locale}/master-data/categories/new`, categoryReturnHref)}
        createLabel={tCommon("create")}
        actions={
          <>
            <Link
              href="/api/categories/export"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Download className="h-4 w-4" />
              {t("downloadCategoryExport")}
            </Link>
            <Link
              href="/api/categories/import-template"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {t("downloadCategoryTemplate")}
            </Link>
          </>
        }
      />
```

with:

```tsx
  const healthSummary = buildCategoryHealthSummary(summaryCategories, { categoryIdsWithChecklist, categoryIdsWithPrefix })
  const listHref = (next: Partial<CategoryListState>) => `${basePath}?${buildCategoryQueryString(listState, next)}`
  // A page past the last one (an old link, or the last row of the last page deleted) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listState.pageSize)
  if (categories.length === 0 && total > 0 && listState.page > lastPage) {
    redirect(listHref({ page: lastPage }))
  }
  const { start, end, totalPages } = paginationRange(listState.page, listState.pageSize, total)
  const hasActiveFilters = Boolean(
    searchText ||
      listState.assetUsage !== "all" ||
      listState.modelStatus !== "all" ||
      listState.customFieldStatus !== "all" ||
      listState.checklistStatus !== "all" ||
      listState.prefixStatus !== "all",
  )
  const sortBy = (field: CategorySort): DataTableSort => ({
    href: listHref({ sort: field, direction: listState.sort === field && listState.direction === "asc" ? "desc" : "asc", page: 1 }),
    direction: listState.sort === field ? listState.direction : null,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <>
            <Link href="/api/categories/export" className={buttonVariants({ variant: "outline", size: "md" })}>
              <Download aria-hidden="true" />
              {t("downloadCategoryExport")}
            </Link>
            <Link href="/api/categories/import-template" className={buttonVariants({ variant: "outline", size: "md" })}>
              <FileSpreadsheet aria-hidden="true" />
              {t("downloadCategoryTemplate")}
            </Link>
            <Link href={appendMasterDataReturnTo(`/${locale}/master-data/categories/new`, categoryReturnHref)} className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden="true" />
              {tCommon("create")}
            </Link>
          </>
        }
      />
```

(3) The number strip.

Replace:

```tsx
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          label={t("summaryTotal")}
          value={healthSummary.total}
          detail={t("summaryUsed", { count: healthSummary.used })}
          href={basePath}
        />
        <SummaryTile
          label={t("summaryMissingModels")}
          value={healthSummary.missingModels}
          detail={t("summaryMissingModelsHelp")}
          href={`${basePath}?${buildCategoryQueryString(listState, { modelStatus: "withoutModels", page: 1 })}`}
          tone={healthSummary.missingModels > 0 ? "warning" : "neutral"}
        />
        <SummaryTile
          label={t("summaryMissingChecklist")}
          value={healthSummary.missingChecklist}
          detail={t("summaryMissingChecklistHelp")}
          href={`${basePath}?${buildCategoryQueryString(listState, { checklistStatus: "withoutChecklist", page: 1 })}`}
          tone={healthSummary.missingChecklist > 0 ? "warning" : "neutral"}
        />
        <SummaryTile
          label={t("summaryMissingPrefix")}
          value={healthSummary.missingPrefix}
          detail={t("summaryMissingPrefixHelp")}
          href={`${basePath}?${buildCategoryQueryString(listState, { prefixStatus: "withoutPrefix", page: 1 })}`}
          tone={healthSummary.missingPrefix > 0 ? "warning" : "neutral"}
        />
      </div>
```

with:

```tsx
      <StatStrip
        items={[
          {
            key: "total",
            label: t("summaryTotal"),
            value: formatCount(healthSummary.total),
            foot: t("summaryUsed", { count: healthSummary.used }),
            footTitle: t("summaryUsed", { count: healthSummary.used }),
            href: basePath,
          },
          {
            key: "missingModels",
            label: t("summaryMissingModels"),
            value: formatCount(healthSummary.missingModels),
            foot: t("summaryMissingModelsHelp"),
            footTitle: t("summaryMissingModelsHelp"),
            href: listHref({ modelStatus: "withoutModels", page: 1 }),
            current: listState.modelStatus === "withoutModels",
            attention: healthSummary.missingModels > 0,
          },
          {
            key: "missingChecklist",
            label: t("summaryMissingChecklist"),
            value: formatCount(healthSummary.missingChecklist),
            foot: t("summaryMissingChecklistHelp"),
            footTitle: t("summaryMissingChecklistHelp"),
            href: listHref({ checklistStatus: "withoutChecklist", page: 1 }),
            current: listState.checklistStatus === "withoutChecklist",
            attention: healthSummary.missingChecklist > 0,
          },
          {
            key: "missingPrefix",
            label: t("summaryMissingPrefix"),
            value: formatCount(healthSummary.missingPrefix),
            foot: t("summaryMissingPrefixHelp"),
            footTitle: t("summaryMissingPrefixHelp"),
            href: listHref({ prefixStatus: "withoutPrefix", page: 1 }),
            current: listState.prefixStatus === "withoutPrefix",
            attention: healthSummary.missingPrefix > 0,
          },
        ]}
      />
```

(4) The filter panel and its search field. The five `FilterSelect` calls below it stay.

Replace:

```tsx
      <div className="rounded-lg border border-border bg-surface p-4">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(5,minmax(150px,1fr))_auto]" action={basePath}>
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={listState.pageSize} />
          <input type="hidden" name="sort" value={listState.sort} />
          <input type="hidden" name="direction" value={listState.direction} />
          <label className="space-y-1 text-sm font-medium text-foreground">
            <span>{tCommon("search")}</span>
            <input
              type="search"
              name="search"
              defaultValue={searchText}
              placeholder={t("searchPlaceholder")}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </label>
```

with:

```tsx
      <FilterPanel>
        <form role="search" action={basePath} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(5,minmax(150px,1fr))_auto]">
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={listState.pageSize} />
          <input type="hidden" name="sort" value={listState.sort} />
          <input type="hidden" name="direction" value={listState.direction} />
          <Field label={tCommon("search")}>
            <SearchField name="search" defaultValue={searchText} placeholder={t("searchPlaceholder")} />
          </Field>
```

(5) The filter buttons, the table and its pager.

Replace:

```tsx
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
            >
              {tCommon("filter")}
            </button>
            <Link
              href={basePath}
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              {t("clearFilters")}
            </Link>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <CategorySortableColumnHeader field="code" current={listState} basePath={basePath}>{t("code")}</CategorySortableColumnHeader>
                <CategorySortableColumnHeader field="name" current={listState} basePath={basePath}>{t("name")}</CategorySortableColumnHeader>
                <ColumnHeader>{t("description")}</ColumnHeader>
                <CategorySortableColumnHeader field="models" current={listState} basePath={basePath}>{t("models")}</CategorySortableColumnHeader>
                <CategorySortableColumnHeader field="assets" current={listState} basePath={basePath}>{t("assets")}</CategorySortableColumnHeader>
                <CategorySortableColumnHeader field="customFields" current={listState} basePath={basePath}>{t("customFieldsShort")}</CategorySortableColumnHeader>
                <ColumnHeader>{tCommon("status")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={8} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
              ) : (
                categories.map((category) => {
                  const drilldown = buildCategoryDrilldownHrefs({ locale, categoryId: category.id })
                  const editHref = appendMasterDataReturnTo(`/${locale}/master-data/categories/${category.id}/edit`, categoryReturnHref)
                  return (
                    <ClickableTableRow
                      key={category.id}
                      href={editHref}
                      label={`${tCommon("edit")}: ${category.code}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{category.code}</td>
                      <td className="min-w-48 px-4 py-3 text-foreground">{category.name}</td>
                      <td className="min-w-64 px-4 py-3 text-muted-foreground">
                        {category.description || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {category._count.models > 0 ? (
                          <Link
                            prefetch={false}
                            href={drilldown.models}
                            className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                          >
                            {category._count.models.toLocaleString()}
                          </Link>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {category._count.assets > 0 ? (
                          <Link
                            prefetch={false}
                            href={drilldown.assets}
                            className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                          >
                            {category._count.assets.toLocaleString()}
                          </Link>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {category._count.customFieldDefs}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <ActiveBadge label={tCommon("active")} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            href={drilldown.assets}
                            title={t("viewAssets")}
                            className="inline-flex h-8 items-center justify-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                          >
                            {t("viewAssets")}
                          </Link>
                          <Link
                            href={drilldown.models}
                            title={t("viewModels")}
                            className="inline-flex h-8 items-center justify-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                          >
                            {t("viewModels")}
                          </Link>
                          <Link
                            href={editHref}
                            title={tCommon("edit")}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary-soft"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <CategoryDeleteButton id={category.id} />
                        </div>
                      </td>
                    </ClickableTableRow>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <CategoryPagination
          current={listState}
          total={total}
          basePath={basePath}
          labels={{
            rowsPerPage: tCommon("rowsPerPage"),
            page: tCommon("page"),
            of: tCommon("of"),
            previous: tCommon("previous"),
            next: tCommon("next"),
          }}
        />
      </div>
    </div>
```

with:

```tsx
          <FilterFormActions submitLabel={tCommon("filter")} clear={hasActiveFilters ? { href: basePath, label: t("clearFilters") } : undefined} />
        </form>
      </FilterPanel>

      <DataTable
        caption={t("title")}
        scrollHint={tCommon("tableScrollHint")}
        footer={
          total > 0 ? (
            <Pagination
              page={listState.page}
              totalPages={totalPages}
              previousHref={listHref({ page: listState.page - 1 })}
              nextHref={listHref({ page: listState.page + 1 })}
              pageSize={listState.pageSize}
              pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: listHref({ pageSize: value, page: 1 }) }))}
              labels={{
                navigation: tCommon("pagination"),
                previous: tCommon("previous"),
                next: tCommon("next"),
                pageOf: tCommon("pageOf", { page: listState.page, total: totalPages }),
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
            <DataTableHead sort={sortBy("code")}>{t("code")}</DataTableHead>
            <DataTableHead sort={sortBy("name")}>{t("name")}</DataTableHead>
            <DataTableHead>{t("description")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("models")}>{t("models")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("assets")}>{t("assets")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("customFields")}>{t("customFieldsShort")}</DataTableHead>
            <DataTableHead>{tCommon("status")}</DataTableHead>
            <DataTableHead align="right" hideLabel>{tCommon("actions")}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {categories.length === 0 ? (
            hasActiveFilters ? (
              <TableEmptyRow colSpan={8} emptyState={{ title: tCommon("noData"), actionHref: basePath, actionLabel: t("clearFilters"), actionVariant: "secondary" }} />
            ) : (
              <TableEmptyRow colSpan={8}>{tCommon("noData")}</TableEmptyRow>
            )
          ) : (
            categories.map((category) => {
              const drilldown = buildCategoryDrilldownHrefs({ locale, categoryId: category.id })
              const editHref = appendMasterDataReturnTo(`/${locale}/master-data/categories/${category.id}/edit`, categoryReturnHref)
              return (
                <ClickableTableRow
                  key={category.id}
                  href={editHref}
                  label={`${tCommon("edit")}: ${category.code}`}
                >
                  <DataTableCell className="whitespace-nowrap">
                    <span className="tag font-medium text-foreground">{category.code}</span>
                  </DataTableCell>
                  <DataTableCell className="min-w-48 text-foreground">{category.name}</DataTableCell>
                  <DataTableCell className="min-w-64 text-muted-foreground">{orNil(category.description)}</DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">
                    {category._count.models > 0 ? (
                      <Link
                        prefetch={false}
                        href={drilldown.models}
                        className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                      >
                        {formatCount(category._count.models)}
                      </Link>
                    ) : (
                      <span className="px-2">{formatCount(0)}</span>
                    )}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">
                    {category._count.assets > 0 ? (
                      <Link
                        prefetch={false}
                        href={drilldown.assets}
                        className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                      >
                        {formatCount(category._count.assets)}
                      </Link>
                    ) : (
                      <span className="px-2">{formatCount(0)}</span>
                    )}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">{formatCount(category._count.customFieldDefs)}</DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <ActiveBadge label={tCommon("active")} />
                  </DataTableCell>
                  <DataTableCell align="right">
                    <RowActions
                      code={category.code}
                      name={category.name}
                      menuLabel={tCommon("moreActionsFor", { code: category.code })}
                      next={{ label: tCommon("edit"), href: editHref, icon: <Pencil aria-hidden="true" /> }}
                      groups={[
                        {
                          key: "related",
                          items: [
                            { kind: "link", key: "assets", label: t("viewAssets"), href: drilldown.assets },
                            { kind: "link", key: "models", label: t("viewModels"), href: drilldown.models },
                          ],
                        },
                      ]}
                      deleteAction={{ endpoint: `/api/categories/${category.id}` }}
                    />
                  </DataTableCell>
                </ClickableTableRow>
              )
            })
          )}
        </DataTableBody>
      </DataTable>
    </div>
```

(6) The four local helpers go.

Replace:

```tsx
  )
}

function SummaryTile({
  label,
  value,
  detail,
  href,
  tone = "neutral",
}: {
  label: string
  value: number
  detail: string
  href: string
  tone?: "neutral" | "warning"
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg border bg-surface p-4 transition-colors hover:border-primary-border hover:bg-primary-soft ${
        tone === "warning" ? "border-warning-border" : "border-border"
      }`}
    >
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-bold text-foreground">{value.toLocaleString()}</div>
      <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
    </Link>
  )
}

function CategorySortableColumnHeader({
  children,
  field,
  current,
  basePath,
  align = "left",
}: {
  children: React.ReactNode
  field: CategorySort
  current: CategoryListState
  basePath: string
  align?: "left" | "right"
}) {
  const active = current.sort === field
  const nextDirection = active && current.direction === "asc" ? "desc" : "asc"
  const href = `${basePath}?${buildCategoryQueryString(current, { sort: field, direction: nextDirection, page: 1 })}`

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

function CategoryPagination({
  current,
  total,
  basePath,
  labels,
}: {
  current: CategoryListState
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
  const safePage = Math.min(current.page, totalPages)
  const previousPage = Math.max(1, safePage - 1)
  const nextPage = Math.min(totalPages, safePage + 1)

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
            href={`${basePath}?${buildCategoryQueryString(current, { pageSize, page: 1 })}`}
            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 transition-colors ${
              current.pageSize === pageSize ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface hover:bg-accent"
            }`}
          >
            {pageSize}
          </Link>
        ))}
        <span className="px-2">
          {labels.page} {safePage} {labels.of} {totalPages}
        </span>
        <Link
          href={`${basePath}?${buildCategoryQueryString(current, { page: previousPage })}`}
          aria-disabled={safePage <= 1}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${
            safePage <= 1 ? "pointer-events-none opacity-50" : "hover:bg-accent"
          }`}
        >
          {labels.previous}
        </Link>
        <Link
          href={`${basePath}?${buildCategoryQueryString(current, { page: nextPage })}`}
          aria-disabled={safePage >= totalPages}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${
            safePage >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-accent"
          }`}
        >
          {labels.next}
        </Link>
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string
  name: string
  defaultValue: string
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="space-y-1 text-sm font-medium text-foreground">
      <span>{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
      >
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
  )
}
```

Check: `grep -n "toLocaleString\|\"-\"\|MasterDataHeader\|ColumnHeader\|DeleteButton\|bg-muted\|uppercase\|opacity-\|function " "src/app/[locale]/(dashboard)/master-data/categories/page.tsx"` prints one line, `export default async function CategoriesPage({ params, searchParams }: CategoriesPageProps) {`.

- [ ] **Step 5: Delete the wrapper**

Run: `git rm src/components/master-data/category-delete-button.tsx` then `git grep -n "category-delete-button\|CategoryDeleteButton" -- src`
Expected: `rm 'src/components/master-data/category-delete-button.tsx'`, then no output (exit 1).

- [ ] **Step 6: Run the tests for this task**

Run: `node --test tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/master-data-return-navigation.test.ts tests/master-data-brand-supplier-ui.test.ts tests/master-data-workspace.test.ts tests/confirm-dialog-ui.test.ts tests/row-actions-ui.test.ts tests/list-primitives-ui.test.ts tests/form-migration-guards.test.ts tests/category-list-query.test.ts`
Expected: PASS, `fail 0`, with `tests 116` from the first eleven files (as in Task 14) plus the tests of `category-list-query`.

Run: `node <temp>/p2b1-precheck.mjs --file D/master-data/categories/page.tsx` then `node <temp>/p2b1-precheck.mjs --budgets`
Expected: `· in MIGRATED_LIST_FILES` and `args    (no row holds this file)`; then exit 0 with `R7 TABLE_HEADER_FILLS 41 in 28 rows` and `budgets hold: no live count is over its row`.

- [ ] **Step 7: Prove every class compiles**

Run: `node <temp>/p2b1-tw-probe.mjs "src/app/[locale]/(dashboard)/master-data/categories/page.tsx"`
Expected: `checked 20 classes, missing 0`. No class is new to `src`.

- [ ] **Step 8: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 0 fail and the same number of tests as before Step 2 (this task adds lines, not tests); tsc no errors; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 5 files in `git diff --stat`: the page 208 insertions and 344 deletions, `tests/list-pages-ui.test.ts` 1 insertion, `tests/list-filters-ui.test.ts` 1 insertion, `tests/list-frame-guards.test.ts` 1 and 11, `tests/visual-foundation-guards.test.ts` 1 deletion; `git status` also lists the wrapper as `D `. The page stays CRLF (`377 377`).

- [ ] **Step 9: Commit**

```bash
git add "src/app/[locale]/(dashboard)/master-data/categories/page.tsx" tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): categories list on DataTable, RowActions, StatStrip and the shared filters (2B-1 task 15)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 6 files in the commit (5 modified, 1 deleted). `git status --short src tests messages` prints nothing.

**For the plan 2B-1 dev-app check (Task 25):** `/th/master-data/categories` at 1440, 1366, 1280 (the six-field filter grid), 768 and 375: the same list as Task 13; ⋯ shows "ทรัพย์สิน", "รุ่น", a line, "ลบ"; the two links open the same drill-downs as before; the three "missing" cells filter and mark themselves; the header buttons wrap at 768.

---

### Task 16: `D/master-data/companies/page.tsx` on the list primitives

Spec §10.3 row 16, with §5.3 row "companies", §6.5 row 4, rulings I5, I21 and R-h, R-n, R-p. One page, one commit, one wrapper deleted. The page is CRLF. Task 13's shape applies; this lists only what differs.

Rulings this task applies:
- **B5:** `next` = "แก้ไข", ⋯ = "ลบ" with `` deleteAction={{ endpoint: `/api/companies/${company.id}` }} ``, `groups={[]}`; `name` = `company.nameTh`. `company-delete-button.tsx` goes in this commit.
- **§5.3, R-p:** three codes become `tag`: the company code (`tag font-medium text-foreground`), the asset-tag code (`company.assetTagCode || company.code`, an inner `tag`) and the tax id. The tax id keeps today's test, `company.taxId ? <span className="tag">…</span> : <Nil />`, because `orNil` cannot wrap a `tag` span; the English name is `orNil(company.nameEn)`.
- **§6.5 row 4:** two `FilterSelect`s; `hasActiveFilters` = search, `assetUsage !== "all"` or `branchUsage !== "all"`; the grid `xl:grid-cols-[minmax(240px,1.5fr)_repeat(2,minmax(160px,1fr))_auto]` stays.
- **§3.13:** `current` on the cells of `withAssets`, `withoutAssets` and `withoutBranches`; `attention` on the last two when above 0.

What users will see on `/th/master-data/companies`: the same changes as branches (Task 13). The tax id and the asset-tag code are monospace; an empty English name or tax id shows "—".

Not in this task: `parseCompanyListParams`, `buildCompanyQueryString`, the company form (Task 22) · messages · docs.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/master-data/companies/page.tsx` (CRLF, 6 exact replacements)
- Delete: `src/components/master-data/company-delete-button.tsx`
- Modify: `tests/list-pages-ui.test.ts`, `tests/list-filters-ui.test.ts` (LF, 1 replacement each)
- Modify: `tests/list-frame-guards.test.ts`, `tests/visual-foundation-guards.test.ts` (through `p2b-budget.mjs` only)

**Must keep passing without edits:** `tests/master-data-return-navigation.test.ts` (`const companyReturnHref = `, `/companies/new`, `/companies/${company.id}/edit`) · `tests/master-data-workspace.test.ts` (reads this page) · `tests/organization-master-query.test.ts` and the other tests of Task 13 Step 6.

**Interfaces:**
- Consumes: what Task 13 consumes, plus `Nil` from `@/components/ui/nil`; `tests/list-pages-ui.test.ts` ending with the categories line and `MIGRATED_FILTER_FILES` ending with the categories line (Task 15).
- Produces: the companies line in both lists; no LFG or VFG row for the page; the page in `MIGRATED_LIST_FILES`.

| guard | `D/master-data/companies/page.tsx` before → after |
|---|---|
| VFG R7 | 1 → – |
| LFG | LH2 2 · LF1 1 · LT1 1 · LT2 1 · LT3 1 · LT4 1 · LT5 2 · LV1 4 · LV2 2 · LS1 1 · LR1 1 → all – · joins `MIGRATED_LIST_FILES` |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b1-t13-precheck.mjs 16`
Expected: `git status` prints nothing; the ten `ok` lines for Tasks 1–12 and the keys, then `ok` for the page (`hash d1f83cf3b0cb4597`), `still calls MasterDataHeader`, `src/components/master-data/company-delete-button.tsx exists and only this page imports it` and the two test-file lines, the `info` lines and `preconditions hold for Task 16`. On any `MISSING` line, stop and report it.

Run: `node <temp>/p2b1-precheck.mjs --file D/master-data/companies/page.tsx`
Expected (exit 0): live = budget = seed on every row, and
```
args    R7=1:1 LH2=2:2 LF1=1:1 LT1=1:1 LT2=1:1 LT3=1:1 LT4=1:1 LT5=2:2 LV1=4:4 LV2=2:2 LS1=1:1 LR1=1:1
```

- [ ] **Step 2: The failing tests**

(a) `tests/list-pages-ui.test.ts`: add the companies line. Replace:

```ts
  { path: `${D}master-data/categories/page.tsx`, deleteEndpoints: ["/api/categories/${category.id}"], removedWrappers: [`${C}master-data/category-delete-button.tsx`], stats: true },
]
```

with:

```ts
  { path: `${D}master-data/categories/page.tsx`, deleteEndpoints: ["/api/categories/${category.id}"], removedWrappers: [`${C}master-data/category-delete-button.tsx`], stats: true },
  { path: `${D}master-data/companies/page.tsx`, deleteEndpoints: ["/api/companies/${company.id}"], removedWrappers: [`${C}master-data/company-delete-button.tsx`], stats: true },
]
```

(b) `tests/list-filters-ui.test.ts`: add the companies line. Replace:

```ts
  "src/app/[locale]/(dashboard)/master-data/categories/page.tsx",
]
```

with:

```ts
  "src/app/[locale]/(dashboard)/master-data/categories/page.tsx",
  "src/app/[locale]/(dashboard)/master-data/companies/page.tsx",
]
```

Run: `node --test tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts`
Expected: FAIL, `tests 6 · pass 3 · fail 3`, the same three tests as in Task 15, now on `…/master-data/companies/page.tsx` (`no <PageHeader`, the `redirect` import, `a raw select or textarea`).

- [ ] **Step 3: Lower the guard rows of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs D/master-data/companies/page.tsx R7=1:0 LH2=2:0 LF1=1:0 LT1=1:0 LT2=1:0 LT3=1:0 LT4=1:0 LT5=2:0 LV1=4:0 LV2=2:0 LS1=1:0 LR1=1:0 --migrated`
Expected (exit 0): the twelve `… -> 0 (row deleted)` lines (R7, LH2, LF1, LT1, LT2, LT3, LT4, LT5, `LV1: 4 -> 0`, `LV2: 2 -> 0`, LS1, LR1), `MIGRATED_LIST_FILES: added` and `written: src/app/[locale]/(dashboard)/master-data/companies/page.tsx`.

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 34 · fail 13`:
- LFG: LH2 (`21 in 12 files`), LF1 (`7 in 7`), LT1 (`41 in 15`), LT2 (`6 in 6`), LT3 (`13 in 12`), LT4 (`8 in 8`), LT5 (`17 in 9`), LV1 (`35 in 14`), LV2 (`125 in 40`), LS1 (`27 in 24`), LR1 (`6 in 5`), each listing only the companies page, and `L0` with the same 11 lines.
- VFG: the R7 test with `41 matches in 28 files; over budget:` and `src/app/[locale]/(dashboard)/master-data/companies/page.tsx: 1 > 0`.

- [ ] **Step 4: Move the page onto the primitives (`src/app/[locale]/(dashboard)/master-data/companies/page.tsx`, CRLF)**

Six exact replacements, top to bottom. Make all six before you compile.

(1) Imports. The `organization-master-query` import below stays.

Replace:

```tsx
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { ArrowDown, ArrowUp, Edit } from "lucide-react"
import { prisma } from "@/lib/db"
import { CompanyDeleteButton } from "@/components/master-data/company-delete-button"
import { requirePagePermission } from "@/lib/page-auth"
import {
  ActiveBadge,
  ColumnHeader,
  MasterDataHeader,
} from "@/components/master-data/master-data-layout"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { paginationRange } from "@/lib/master-data-query"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
```

with:

```tsx
import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Pencil, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { ActiveBadge } from "@/components/master-data/master-data-layout"
import { buttonVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
import { FilterSelect } from "@/components/ui/filter-select"
import { Nil, orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
```

(2) After the summary: the list href, the redirect, the range, the filter flag and the sort heads; the page root and the header.

Replace:

```tsx
  const summary = buildCompanySummary(summaryCompanies)

  return (
    <div className="space-y-4">
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={appendMasterDataReturnTo(`/${locale}/master-data/companies/new`, companyReturnHref)}
        createLabel={tCommon("create")}
      />
```

with:

```tsx
  const summary = buildCompanySummary(summaryCompanies)
  const listHref = (next: Partial<CompanyListState>) => `${basePath}?${buildCompanyQueryString(listState, next)}`
  // A page past the last one (an old link, or the last row of the last page deleted) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listState.pageSize)
  if (companies.length === 0 && total > 0 && listState.page > lastPage) {
    redirect(listHref({ page: lastPage }))
  }
  const { start, end, totalPages } = paginationRange(listState.page, listState.pageSize, total)
  const hasActiveFilters = Boolean(listState.search || listState.assetUsage !== "all" || listState.branchUsage !== "all")
  const sortBy = (field: CompanySort): DataTableSort => ({
    href: listHref({ sort: field, direction: listState.sort === field && listState.direction === "asc" ? "desc" : "asc", page: 1 }),
    direction: listState.sort === field ? listState.direction : null,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <Link href={appendMasterDataReturnTo(`/${locale}/master-data/companies/new`, companyReturnHref)} className={buttonVariants({ size: "md" })}>
            <Plus aria-hidden="true" />
            {tCommon("create")}
          </Link>
        }
      />
```

(3) The number strip.

Replace:

```tsx
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          label={t("summaryTotal")}
          value={summary.total}
          detail={t("summaryWithBranches", { count: summary.withBranches })}
          href={basePath}
        />
        <SummaryTile
          label={t("summaryWithAssets")}
          value={summary.withAssets}
          detail={t("summaryWithAssetsHelp")}
          href={`${basePath}?${buildCompanyQueryString(listState, { assetUsage: "withAssets", page: 1 })}`}
        />
        <SummaryTile
          label={t("summaryWithoutAssets")}
          value={summary.withoutAssets}
          detail={t("summaryWithoutAssetsHelp")}
          href={`${basePath}?${buildCompanyQueryString(listState, { assetUsage: "withoutAssets", page: 1 })}`}
          tone={summary.withoutAssets > 0 ? "warning" : "neutral"}
        />
        <SummaryTile
          label={t("summaryWithoutBranches")}
          value={summary.withoutBranches}
          detail={t("summaryWithoutBranchesHelp")}
          href={`${basePath}?${buildCompanyQueryString(listState, { branchUsage: "withoutBranches", page: 1 })}`}
          tone={summary.withoutBranches > 0 ? "warning" : "neutral"}
        />
      </div>
```

with:

```tsx
      <StatStrip
        items={[
          {
            key: "total",
            label: t("summaryTotal"),
            value: formatCount(summary.total),
            foot: t("summaryWithBranches", { count: summary.withBranches }),
            footTitle: t("summaryWithBranches", { count: summary.withBranches }),
            href: basePath,
          },
          {
            key: "withAssets",
            label: t("summaryWithAssets"),
            value: formatCount(summary.withAssets),
            foot: t("summaryWithAssetsHelp"),
            footTitle: t("summaryWithAssetsHelp"),
            href: listHref({ assetUsage: "withAssets", page: 1 }),
            current: listState.assetUsage === "withAssets",
          },
          {
            key: "withoutAssets",
            label: t("summaryWithoutAssets"),
            value: formatCount(summary.withoutAssets),
            foot: t("summaryWithoutAssetsHelp"),
            footTitle: t("summaryWithoutAssetsHelp"),
            href: listHref({ assetUsage: "withoutAssets", page: 1 }),
            current: listState.assetUsage === "withoutAssets",
            attention: summary.withoutAssets > 0,
          },
          {
            key: "withoutBranches",
            label: t("summaryWithoutBranches"),
            value: formatCount(summary.withoutBranches),
            foot: t("summaryWithoutBranchesHelp"),
            footTitle: t("summaryWithoutBranchesHelp"),
            href: listHref({ branchUsage: "withoutBranches", page: 1 }),
            current: listState.branchUsage === "withoutBranches",
            attention: summary.withoutBranches > 0,
          },
        ]}
      />
```

(4) The filter panel and its search field. The two `FilterSelect` calls below it stay.

Replace:

```tsx
      <div className="rounded-lg border border-border bg-surface p-4">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.5fr)_repeat(2,minmax(160px,1fr))_auto]" action={basePath}>
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={listState.pageSize} />
          <input type="hidden" name="sort" value={listState.sort} />
          <input type="hidden" name="direction" value={listState.direction} />
          <label className="space-y-1 text-sm font-medium text-foreground">
            <span>{tCommon("search")}</span>
            <input
              type="search"
              name="search"
              defaultValue={listState.search}
              placeholder={t("searchPlaceholder")}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </label>
```

with:

```tsx
      <FilterPanel>
        <form role="search" action={basePath} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.5fr)_repeat(2,minmax(160px,1fr))_auto]">
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={listState.pageSize} />
          <input type="hidden" name="sort" value={listState.sort} />
          <input type="hidden" name="direction" value={listState.direction} />
          <Field label={tCommon("search")}>
            <SearchField name="search" defaultValue={listState.search} placeholder={t("searchPlaceholder")} />
          </Field>
```

(5) The filter buttons, the table and its pager.

Replace:

```tsx
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
            >
              {tCommon("filter")}
            </button>
            <Link
              href={basePath}
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              {t("clearFilters")}
            </Link>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <CompanySortableColumnHeader field="code" current={listState} basePath={basePath}>{t("code")}</CompanySortableColumnHeader>
                <CompanySortableColumnHeader field="assetTagCode" current={listState} basePath={basePath}>{t("assetTagCode")}</CompanySortableColumnHeader>
                <CompanySortableColumnHeader field="nameTh" current={listState} basePath={basePath}>{t("nameTh")}</CompanySortableColumnHeader>
                <ColumnHeader>{t("nameEn")}</ColumnHeader>
                <ColumnHeader>{t("taxId")}</ColumnHeader>
                <CompanySortableColumnHeader field="branches" current={listState} basePath={basePath}>{t("branches")}</CompanySortableColumnHeader>
                <CompanySortableColumnHeader field="employees" current={listState} basePath={basePath}>{t("employees")}</CompanySortableColumnHeader>
                <CompanySortableColumnHeader field="assets" current={listState} basePath={basePath}>{t("assets")}</CompanySortableColumnHeader>
                <ColumnHeader>{tCommon("status")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={10} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
              ) : (
                companies.map((company) => {
                  const drilldown = buildCompanyDrilldownHrefs({ locale, companyId: company.id })
                  const editHref = appendMasterDataReturnTo(`/${locale}/master-data/companies/${company.id}/edit`, companyReturnHref)
                  return (
                    <ClickableTableRow
                      key={company.id}
                      href={editHref}
                      label={`${tCommon("edit")}: ${company.code}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{company.code}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{company.assetTagCode || company.code}</td>
                      <td className="min-w-48 px-4 py-3 text-foreground">{company.nameTh}</td>
                      <td className="min-w-48 px-4 py-3 text-muted-foreground">{company.nameEn || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{company.taxId || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {company._count.branches > 0 ? (
                          <Link
                            href={drilldown.branches}
                            className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                          >
                            {company._count.branches.toLocaleString()}
                          </Link>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {company._count.employees.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {company._count.assets > 0 ? (
                          <Link
                            href={drilldown.assets}
                            className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                          >
                            {company._count.assets.toLocaleString()}
                          </Link>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <ActiveBadge label={tCommon("active")} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            href={editHref}
                            title={tCommon("edit")}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary-soft"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <CompanyDeleteButton id={company.id} />
                        </div>
                      </td>
                    </ClickableTableRow>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <CompanyPagination
          current={listState}
          total={total}
          basePath={basePath}
          labels={{
            rowsPerPage: tCommon("rowsPerPage"),
            page: tCommon("page"),
            of: tCommon("of"),
            previous: tCommon("previous"),
            next: tCommon("next"),
          }}
        />
      </div>
    </div>
```

with:

```tsx
          <FilterFormActions submitLabel={tCommon("filter")} clear={hasActiveFilters ? { href: basePath, label: t("clearFilters") } : undefined} />
        </form>
      </FilterPanel>

      <DataTable
        caption={t("title")}
        scrollHint={tCommon("tableScrollHint")}
        footer={
          total > 0 ? (
            <Pagination
              page={listState.page}
              totalPages={totalPages}
              previousHref={listHref({ page: listState.page - 1 })}
              nextHref={listHref({ page: listState.page + 1 })}
              pageSize={listState.pageSize}
              pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: listHref({ pageSize: value, page: 1 }) }))}
              labels={{
                navigation: tCommon("pagination"),
                previous: tCommon("previous"),
                next: tCommon("next"),
                pageOf: tCommon("pageOf", { page: listState.page, total: totalPages }),
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
            <DataTableHead sort={sortBy("code")}>{t("code")}</DataTableHead>
            <DataTableHead sort={sortBy("assetTagCode")}>{t("assetTagCode")}</DataTableHead>
            <DataTableHead sort={sortBy("nameTh")}>{t("nameTh")}</DataTableHead>
            <DataTableHead>{t("nameEn")}</DataTableHead>
            <DataTableHead>{t("taxId")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("branches")}>{t("branches")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("employees")}>{t("employees")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("assets")}>{t("assets")}</DataTableHead>
            <DataTableHead>{tCommon("status")}</DataTableHead>
            <DataTableHead align="right" hideLabel>{tCommon("actions")}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {companies.length === 0 ? (
            hasActiveFilters ? (
              <TableEmptyRow colSpan={10} emptyState={{ title: tCommon("noData"), actionHref: basePath, actionLabel: t("clearFilters"), actionVariant: "secondary" }} />
            ) : (
              <TableEmptyRow colSpan={10}>{tCommon("noData")}</TableEmptyRow>
            )
          ) : (
            companies.map((company) => {
              const drilldown = buildCompanyDrilldownHrefs({ locale, companyId: company.id })
              const editHref = appendMasterDataReturnTo(`/${locale}/master-data/companies/${company.id}/edit`, companyReturnHref)
              return (
                <ClickableTableRow
                  key={company.id}
                  href={editHref}
                  label={`${tCommon("edit")}: ${company.code}`}
                >
                  <DataTableCell className="whitespace-nowrap">
                    <span className="tag font-medium text-foreground">{company.code}</span>
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-muted-foreground">
                    <span className="tag">{company.assetTagCode || company.code}</span>
                  </DataTableCell>
                  <DataTableCell className="min-w-48 text-foreground">{company.nameTh}</DataTableCell>
                  <DataTableCell className="min-w-48 text-muted-foreground">{orNil(company.nameEn)}</DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-muted-foreground">
                    {company.taxId ? <span className="tag">{company.taxId}</span> : <Nil />}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">
                    {company._count.branches > 0 ? (
                      <Link
                        href={drilldown.branches}
                        className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                      >
                        {formatCount(company._count.branches)}
                      </Link>
                    ) : (
                      <span className="px-2">{formatCount(0)}</span>
                    )}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">{formatCount(company._count.employees)}</DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">
                    {company._count.assets > 0 ? (
                      <Link
                        href={drilldown.assets}
                        className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                      >
                        {formatCount(company._count.assets)}
                      </Link>
                    ) : (
                      <span className="px-2">{formatCount(0)}</span>
                    )}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <ActiveBadge label={tCommon("active")} />
                  </DataTableCell>
                  <DataTableCell align="right">
                    <RowActions
                      code={company.code}
                      name={company.nameTh}
                      menuLabel={tCommon("moreActionsFor", { code: company.code })}
                      next={{ label: tCommon("edit"), href: editHref, icon: <Pencil aria-hidden="true" /> }}
                      groups={[]}
                      deleteAction={{ endpoint: `/api/companies/${company.id}` }}
                    />
                  </DataTableCell>
                </ClickableTableRow>
              )
            })
          )}
        </DataTableBody>
      </DataTable>
    </div>
```

(6) The four local helpers go.

Replace:

```tsx
  )
}

function SummaryTile({
  label,
  value,
  detail,
  href,
  tone = "neutral",
}: {
  label: string
  value: number
  detail: string
  href: string
  tone?: "neutral" | "warning"
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg border bg-surface p-4 transition-colors hover:border-primary-border hover:bg-primary-soft ${
        tone === "warning" ? "border-warning-border" : "border-border"
      }`}
    >
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-bold text-foreground">{value.toLocaleString()}</div>
      <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
    </Link>
  )
}

function CompanySortableColumnHeader({
  children,
  field,
  current,
  basePath,
  align = "left",
}: {
  children: React.ReactNode
  field: CompanySort
  current: CompanyListState
  basePath: string
  align?: "left" | "right"
}) {
  const active = current.sort === field
  const nextDirection = active && current.direction === "asc" ? "desc" : "asc"
  const href = `${basePath}?${buildCompanyQueryString(current, { sort: field, direction: nextDirection, page: 1 })}`

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

function CompanyPagination({
  current,
  total,
  basePath,
  labels,
}: {
  current: CompanyListState
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
  const safePage = Math.min(current.page, totalPages)
  const previousPage = Math.max(1, safePage - 1)
  const nextPage = Math.min(totalPages, safePage + 1)

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
            href={`${basePath}?${buildCompanyQueryString(current, { pageSize, page: 1 })}`}
            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 transition-colors ${
              current.pageSize === pageSize ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface hover:bg-accent"
            }`}
          >
            {pageSize}
          </Link>
        ))}
        <span className="px-2">
          {labels.page} {safePage} {labels.of} {totalPages}
        </span>
        <Link
          href={`${basePath}?${buildCompanyQueryString(current, { page: previousPage })}`}
          aria-disabled={safePage <= 1}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${
            safePage <= 1 ? "pointer-events-none opacity-50" : "hover:bg-accent"
          }`}
        >
          {labels.previous}
        </Link>
        <Link
          href={`${basePath}?${buildCompanyQueryString(current, { page: nextPage })}`}
          aria-disabled={safePage >= totalPages}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${
            safePage >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-accent"
          }`}
        >
          {labels.next}
        </Link>
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string
  name: string
  defaultValue: string
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="space-y-1 text-sm font-medium text-foreground">
      <span>{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
      >
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
  )
}
```

Check: `grep -n "toLocaleString\|\"-\"\|MasterDataHeader\|ColumnHeader\|DeleteButton\|bg-muted\|uppercase\|opacity-\|function " "src/app/[locale]/(dashboard)/master-data/companies/page.tsx"` prints one line, `export default async function CompaniesPage({ params, searchParams }: CompaniesPageProps) {`.

- [ ] **Step 5: Delete the wrapper**

Run: `git rm src/components/master-data/company-delete-button.tsx` then `git grep -n "company-delete-button\|CompanyDeleteButton" -- src`
Expected: `rm 'src/components/master-data/company-delete-button.tsx'`, then no output (exit 1).

- [ ] **Step 6: Run the tests for this task**

Run: `node --test tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/master-data-return-navigation.test.ts tests/master-data-brand-supplier-ui.test.ts tests/master-data-workspace.test.ts tests/confirm-dialog-ui.test.ts tests/row-actions-ui.test.ts tests/list-primitives-ui.test.ts tests/form-migration-guards.test.ts tests/organization-master-query.test.ts`
Expected: PASS, `fail 0`, with `tests 116` from the first eleven files plus the tests of `organization-master-query`.

Run: `node <temp>/p2b1-precheck.mjs --file D/master-data/companies/page.tsx` then `node <temp>/p2b1-precheck.mjs --budgets`
Expected: `· in MIGRATED_LIST_FILES` and `args    (no row holds this file)`; then exit 0 with `R7 TABLE_HEADER_FILLS 40 in 27 rows` and `budgets hold: no live count is over its row`.

- [ ] **Step 7: Prove every class compiles**

Run: `node <temp>/p2b1-tw-probe.mjs "src/app/[locale]/(dashboard)/master-data/companies/page.tsx"`
Expected: `checked 19 classes, missing 0`. No class is new to `src`.

- [ ] **Step 8: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 0 fail and the same number of tests as before Step 2; tsc no errors; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 5 files in `git diff --stat`: the page 196 insertions and 319 deletions, `tests/list-pages-ui.test.ts` 1 insertion, `tests/list-filters-ui.test.ts` 1 insertion, `tests/list-frame-guards.test.ts` 1 and 11, `tests/visual-foundation-guards.test.ts` 1 deletion; `git status` also lists the wrapper as `D `. The page stays CRLF (`299 299`).

- [ ] **Step 9: Commit**

```bash
git add "src/app/[locale]/(dashboard)/master-data/companies/page.tsx" tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): companies list on DataTable, RowActions, StatStrip and the shared filters (2B-1 task 16)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 6 files in the commit (5 modified, 1 deleted). `git status --short src tests messages` prints nothing.

**For the plan 2B-1 dev-app check (Task 25):** `/th/master-data/companies` at 1440, 768 and 375: the same list as Task 13, over 10 columns (the scroll hint shows at 768 and 375); the tax id and asset-tag code are monospace; "—" for an empty English name reads "ไม่มีข้อมูล" with NVDA.

---

### Task 17: `D/master-data/departments/page.tsx` on the list primitives, with real pages (B4)

Spec §10.3 row 17, with §5.3 row "departments", §5.9.1 (the B4 rules), §5.9.2 row 8, §5.14 (`list-pages-ui`: `parseListPage`, no `take: \d+`), §6.4 (the `MasterDataSearch` hidden inputs), rulings I5, I17, I21 and B4. One page, one commit, one wrapper deleted. The page is CRLF. This is the only B4 list of plan 2B-1 and the only server change of the plan: one read-only `count` in the same `Promise.all` as the `findMany`. No schema, migration, index or API change.

Rulings this task applies:
- **B4, §5.9.1, §5.9.2 row 8:** `parseListPage({ page, pageSize })` reads the URL (`page` a whole number ≥ 1, `pageSize` 25/50/100, else 1 and 25). `listPageWindow` gives `skip`/`take`; `prisma.department.count({ where })` runs in the same `Promise.all` (no extra round trip); `orderBy` becomes `[{ createdAt: "desc" }, { id: "asc" }]` so a department never shows on two pages. The `where` moves into a typed `Prisma.DepartmentWhereInput` constant shared by both calls; its content does not change. The table has no index beyond `code @unique` (`prisma/schema.prisma:62-79`); the table is small, so the risk is low (§5.9.2), and no index is added.
- **§5.9.1, `returnTo`:** `listHref(next)` writes `search` (as today), then `appendListPage`, which adds `page` only above 1 and `pageSize` only when not 25. `departmentReturnHref = listHref(listPage)`, so the edit and create links carry the page and page size, and with the defaults the href is exactly today's (`tests/master-data-return-navigation.test.ts` passes without edits; `normalizeMasterDataReturnTo` keeps `url.search`). The page links and the page-size links use the same `listHref`; a page-size link goes back to page 1.
- **§6.4, I17:** `MasterDataSearch` gets `hiddenInputs={Object.fromEntries(appendListPage(new URLSearchParams(), { pageSize: listPage.pageSize }))}`: `{}` at 25 (so the form is the same as today) and `{ pageSize: "50" }` otherwise. A search goes back to page 1 and keeps the page size. The `MasterDataSearch` API does not change (I17), so the pins on the other five callers pass.
- **I21:** past the last page the page redirects to `listHref({ page: lastPage, pageSize })`.
- **B5, I5:** `next` = "แก้ไข", ⋯ = "ลบ" with `` deleteAction={{ endpoint: `/api/departments/${department.id}` }} ``. `department-delete-button.tsx` goes in this commit.
- **§5.1, B6:** the empty row stays the one-line note: the page has no filter panel and no `clearFilters` key, and its search toolbar keeps the term in the field. There is no `StatStrip` (the page has no number boxes). `scrollHint` is on (a B6 page).
- **§4.6.1:** the bare root `<div>` becomes `space-y-6`. `MasterDataSearch` keeps its own `mb-4`, which beats `space-y-6`, so the search sits 16px above its table (I8).
- **Ruling (test):** `tests/list-pages-ui.test.ts` gets the departments line (`stats: false`), `B4_LISTS` and two tests. Plans 2B-2 and 2B-5 add their B4 lists to `B4_LISTS`. The departments page is not in `MIGRATED_FILTER_FILES`: it has no form of its own (§6.13 item 5 lists 8 files in 2B-1).

What users will see on `/th/master-data/departments`:
- The list is now paged: 25 departments per page by default, with the range, "หน้า x จาก y", 25/50/100 and words-only buttons. Before, every department was on one page.
- The rest as on branches (Task 13): title 600, the white table header, "แก้ไข" + ⋯ with "ลบ", codes monospace, the scroll hint when the table overflows.
- "กลับ" on the edit page returns to the same page and page size; a search keeps the page size.

Not in this task: the department form (Task 22) · `src/lib` (no change: the page builds its query with the Task 5 helpers) · messages · docs (Task 26 writes the B4 line of DESIGN.md and `docs/11_FEATURE_LIST.md`).

**Files:**
- Modify: `src/app/[locale]/(dashboard)/master-data/departments/page.tsx` (CRLF, 2 exact replacements)
- Delete: `src/components/master-data/department-delete-button.tsx`
- Modify: `tests/list-pages-ui.test.ts` (LF, 1 replacement and one block appended)
- Modify: `tests/list-frame-guards.test.ts`, `tests/visual-foundation-guards.test.ts` (through `p2b-budget.mjs` only)
- Temp folder only: `t17-pages-block.ts`

**Must keep passing without edits:**
- `tests/master-data-return-navigation.test.ts` (`const departmentReturnHref = `, `` appendMasterDataReturnTo(`/${locale}/master-data/departments/new`, departmentReturnHref) `` and `…/${department.id}/edit`, read with `\r`)
- `tests/operational-return-navigation.test.ts` (`:69`, `:83`) and `tests/audit-pending-mobile-ux.test.ts` (`:14-15`): the other `MasterDataSearch` callers, untouched (I17)
- `tests/list-pagination.test.ts` (Task 5's helpers, unchanged), `tests/mobile-field-navigation.test.ts` (`:80-81`, the new and edit routes) and the tests of Task 13 Step 6

**Interfaces:**
- Consumes: what Task 13 consumes, plus `parseListPage`, `listPageWindow`, `appendListPage`, `lastListPage` and `LIST_PAGE_SIZES` from `@/lib/list-pagination` (Task 5), `MasterDataSearch({ action, defaultValue, placeholder, submitLabel, hiddenInputs })` (Task 12), `type Prisma` from `@prisma/client`; `tests/list-pages-ui.test.ts` ending with the companies line (Task 16).
- Produces:
  - `tests/list-pages-ui.test.ts`: `const B4_LISTS` (2B-2 and 2B-5 add their lists) and the tests `B4 lists read page and pageSize …` and `the departments list keeps its page and page size …`.
  - The B4 page shape for 2B-2 and 2B-5: `parseListPage` → `listHref(next)` with `appendListPage` → `findMany` with `skip`/`take` and `count({ where })` in one `Promise.all` → the redirect → `Pagination`.
  - No LFG or VFG row for the page; the page in `MIGRATED_LIST_FILES`.

| guard | `D/master-data/departments/page.tsx` before → after |
|---|---|
| VFG R7 | 1 → – |
| LFG | LH2 2 · LT3 1 · LR1 1 → all – · joins `MIGRATED_LIST_FILES` |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b1-t13-precheck.mjs 17`
Expected: `git status` prints nothing; the ten `ok` lines for Tasks 1–12 and the keys, then `ok` for the page (`hash 2238c40029edfd29`), `still calls MasterDataHeader`, `src/components/master-data/department-delete-button.tsx exists and only this page imports it` and the two test-file lines, the `info` lines and `preconditions hold for Task 17`. On any `MISSING` line, stop and report it.

Run: `node <temp>/p2b1-precheck.mjs --file D/master-data/departments/page.tsx`
Expected (exit 0): rows `R7 1`, `LH2 2`, `LT3 1`, `LR1 1` with live = budget = seed, and `args    R7=1:1 LH2=2:2 LT3=1:1 LR1=1:1`.

- [ ] **Step 2: The failing tests**

(a) `tests/list-pages-ui.test.ts`: add the departments line. Replace:

```ts
  { path: `${D}master-data/companies/page.tsx`, deleteEndpoints: ["/api/companies/${company.id}"], removedWrappers: [`${C}master-data/company-delete-button.tsx`], stats: true },
]
```

with:

```ts
  { path: `${D}master-data/companies/page.tsx`, deleteEndpoints: ["/api/companies/${company.id}"], removedWrappers: [`${C}master-data/company-delete-button.tsx`], stats: true },
  { path: `${D}master-data/departments/page.tsx`, deleteEndpoints: ["/api/departments/${department.id}"], removedWrappers: [`${C}master-data/department-delete-button.tsx`], stats: false },
]
```

(b) Save this block as `t17-pages-block.ts` in your temp folder, then run `node <temp>/p2b1-append.mjs <temp>/t17-pages-block.ts tests/list-pages-ui.test.ts`:

```ts
// B4 (spec 2B §5.9): the lists that now page on the server. Plans 2B-2 and 2B-5 add theirs.
const B4_LISTS = [`${D}master-data/departments/page.tsx`]

test("B4 lists read page and pageSize with parseListPage and count the whole list in the same Promise.all (spec 2B §5.9.1)", () => {
  for (const path of B4_LISTS) {
    const source = read(path)
    assert.match(source, /\bparseListPage\(/, path)
    assert.match(source, /\blistPageWindow\(/, path)
    assert.match(source, /\bappendListPage\(/, path)
    assert.doesNotMatch(source, /\btake: \d+/, `${path}: no fixed number of rows`)
    assert.match(source, /orderBy: \[[^\]\n]*\{ id: "asc" \}\]/, `${path}: the old order plus id, so no row shows on two pages`)
    assert.match(source, /await Promise\.all\(\[\n\s+prisma\.(\w+)\.findMany\(\{[\s\S]*?\n\s+\}\),\n\s+prisma\.\1\.count\(\{ where \}\),\n\s+\]\)/, `${path}: findMany and count in one Promise.all`)
  }
})

test("the departments list keeps its page and page size in returnTo, in its page links and in its search (spec 2B §5.9.2 row 8)", () => {
  const source = read(`${D}master-data/departments/page.tsx`)
  assert.match(source, /const departmentReturnHref = listHref\(listPage\)/)
  assert.match(source, /appendListPage\(new URLSearchParams\(searchText \? \{ search: searchText \} : \{\}\), next\)/)
  assert.match(source, /hiddenInputs=\{Object\.fromEntries\(appendListPage\(new URLSearchParams\(\), \{ pageSize: listPage\.pageSize \}\)\)\}/)
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: listHref\(\{ pageSize: value \}\) \}\)\)\}/)
})
```

Run: `node --test tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts`
Expected: FAIL, `tests 8 · pass 4 · fail 4`:
- `master-data lists build on …`: `…/master-data/departments/page.tsx: no <PageHeader`
- `a master-data list past its last page …`: message `src/app/[locale]/(dashboard)/master-data/departments/page.tsx`
- `B4 lists read page and pageSize …`: message `src/app/[locale]/(dashboard)/master-data/departments/page.tsx` (no `parseListPage(`)
- `the departments list keeps its page and page size …`: no match for `/const departmentReturnHref = listHref\(listPage\)/`
- The brand panel test and the three `list-filters-ui` tests pass.

- [ ] **Step 3: Lower the guard rows of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs D/master-data/departments/page.tsx R7=1:0 LH2=2:0 LT3=1:0 LR1=1:0 --migrated`
Expected (exit 0):
```
R7: 1 -> 0 (row deleted)
LH2: 2 -> 0 (row deleted)
LT3: 1 -> 0 (row deleted)
LR1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/master-data/departments/page.tsx
```

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 42 · fail 5`: LFG LH2 (`19 in 11 files`), LT3 (`12 in 11`) and LR1 (`5 in 4`), each listing only the departments page, and `L0` with the same 3 lines; VFG R7 with `40 matches in 27 files; over budget:` and `src/app/[locale]/(dashboard)/master-data/departments/page.tsx: 1 > 0`.

- [ ] **Step 4: Move the page onto the primitives and the paged query (`src/app/[locale]/(dashboard)/master-data/departments/page.tsx`, CRLF)**

Two exact replacements. Make both before you compile.

(1) Imports, the props type, the page state and `listHref`, the paged query with its count, the redirect and the range; then the page root and the header.

Replace:

```tsx
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Edit } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { DepartmentDeleteButton } from "@/components/master-data/department-delete-button"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import {
  ActiveBadge,
  ColumnHeader,
  MasterDataHeader,
  MasterDataSearch,
} from "@/components/master-data/master-data-layout"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"

type DepartmentsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string }>
}

export default async function DepartmentsPage({ params, searchParams }: DepartmentsPageProps) {
  const { locale } = await params
  const { search = "" } = await searchParams
  await requirePagePermission(locale, "department", "view")

  const t = await getTranslations("department")
  const tCommon = await getTranslations("common")
  const searchText = search.trim()
  const basePath = `/${locale}/master-data/departments`
  const departmentReturnHref = searchText ? `${basePath}?${new URLSearchParams({ search: searchText }).toString()}` : basePath

  const departments = await prisma.department.findMany({
    where: {
      isActive: true,
      ...(searchText
        ? {
            OR: [
              { code: { contains: searchText } },
              { name: { contains: searchText } },
              { company: { code: { contains: searchText } } },
              { company: { nameTh: { contains: searchText } } },
            ],
          }
        : {}),
    },
    include: {
      company: {
        select: {
          code: true,
          nameTh: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div>
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={appendMasterDataReturnTo(`/${locale}/master-data/departments/new`, departmentReturnHref)}
        createLabel={tCommon("create")}
```

with:

```tsx
import Link from "next/link"
import { redirect } from "next/navigation"
import type { Prisma } from "@prisma/client"
import { getTranslations } from "next-intl/server"
import { Pencil, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { appendMasterDataReturnTo } from "@/lib/master-data-return-navigation"
import {
  ActiveBadge,
  MasterDataSearch,
} from "@/components/master-data/master-data-layout"
import { buttonVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, appendListPage, lastListPage, listPageWindow, parseListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"

type DepartmentsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; page?: string | string[]; pageSize?: string | string[] }>
}

export default async function DepartmentsPage({ params, searchParams }: DepartmentsPageProps) {
  const { locale } = await params
  const { search = "", page, pageSize } = await searchParams
  await requirePagePermission(locale, "department", "view")

  const t = await getTranslations("department")
  const tCommon = await getTranslations("common")
  const searchText = search.trim()
  const listPage = parseListPage({ page, pageSize })
  const basePath = `/${locale}/master-data/departments`
  // The list URL with its search, page and page size; the default page and page size stay out of it (spec 2B B4).
  const listHref = (next: { page?: number; pageSize?: number }) => {
    const query = appendListPage(new URLSearchParams(searchText ? { search: searchText } : {}), next).toString()
    return query ? `${basePath}?${query}` : basePath
  }
  const departmentReturnHref = listHref(listPage)

  const where: Prisma.DepartmentWhereInput = {
    isActive: true,
    ...(searchText
      ? {
          OR: [
            { code: { contains: searchText } },
            { name: { contains: searchText } },
            { company: { code: { contains: searchText } } },
            { company: { nameTh: { contains: searchText } } },
          ],
        }
      : {}),
  }
  const { skip, take } = listPageWindow(listPage)
  const [departments, total] = await Promise.all([
    prisma.department.findMany({
      where,
      include: {
        company: {
          select: {
            code: true,
            nameTh: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip,
      take,
    }),
    prisma.department.count({ where }),
  ])
  // A page past the last one (an old link, or the last row of the last page deleted) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listPage.pageSize)
  if (departments.length === 0 && total > 0 && listPage.page > lastPage) {
    redirect(listHref({ page: lastPage, pageSize: listPage.pageSize }))
  }
  const { start, end, totalPages } = paginationRange(listPage.page, listPage.pageSize, total)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <Link href={appendMasterDataReturnTo(`/${locale}/master-data/departments/new`, departmentReturnHref)} className={buttonVariants({ size: "md" })}>
            <Plus aria-hidden="true" />
            {tCommon("create")}
          </Link>
        }
```

(2) The search keeps the page size; the table and its pager. The first four props of `MasterDataSearch` above this snippet stay.

Replace:

```tsx
        submitLabel={tCommon("search")}
      />

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <ColumnHeader>{t("code")}</ColumnHeader>
                <ColumnHeader>{t("name")}</ColumnHeader>
                <ColumnHeader>{t("company")}</ColumnHeader>
                <ColumnHeader>{tCommon("status")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {departments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
              ) : (
                departments.map((department) => {
                  const editHref = appendMasterDataReturnTo(`/${locale}/master-data/departments/${department.id}/edit`, departmentReturnHref)
                  return (
                    <ClickableTableRow
                      key={department.id}
                      href={editHref}
                      label={`${tCommon("edit")}: ${department.code}`}
                    >
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{department.code}</td>
                    <td className="min-w-48 px-4 py-3 text-foreground">{department.name}</td>
                    <td className="min-w-56 px-4 py-3 text-muted-foreground">
                      {department.company
                        ? `${department.company.code} - ${department.company.nameTh}`
                        : t("sharedDepartment")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <ActiveBadge label={tCommon("active")} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={editHref}
                          title={tCommon("edit")}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary-soft"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <DepartmentDeleteButton id={department.id} />
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
```

with:

```tsx
        submitLabel={tCommon("search")}
        hiddenInputs={Object.fromEntries(appendListPage(new URLSearchParams(), { pageSize: listPage.pageSize }))}
      />

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
            <DataTableHead>{t("code")}</DataTableHead>
            <DataTableHead>{t("name")}</DataTableHead>
            <DataTableHead>{t("company")}</DataTableHead>
            <DataTableHead>{tCommon("status")}</DataTableHead>
            <DataTableHead align="right" hideLabel>{tCommon("actions")}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {departments.length === 0 ? (
            <TableEmptyRow colSpan={5}>{tCommon("noData")}</TableEmptyRow>
          ) : (
            departments.map((department) => {
              const editHref = appendMasterDataReturnTo(`/${locale}/master-data/departments/${department.id}/edit`, departmentReturnHref)
              return (
                <ClickableTableRow
                  key={department.id}
                  href={editHref}
                  label={`${tCommon("edit")}: ${department.code}`}
                >
                  <DataTableCell className="whitespace-nowrap">
                    <span className="tag font-medium text-foreground">{department.code}</span>
                  </DataTableCell>
                  <DataTableCell className="min-w-48 text-foreground">{department.name}</DataTableCell>
                  <DataTableCell className="min-w-56 text-muted-foreground">
                    {department.company ? (
                      <>
                        <span className="tag">{department.company.code}</span> - {department.company.nameTh}
                      </>
                    ) : (
                      t("sharedDepartment")
                    )}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <ActiveBadge label={tCommon("active")} />
                  </DataTableCell>
                  <DataTableCell align="right">
                    <RowActions
                      code={department.code}
                      name={department.name}
                      menuLabel={tCommon("moreActionsFor", { code: department.code })}
                      next={{ label: tCommon("edit"), href: editHref, icon: <Pencil aria-hidden="true" /> }}
                      groups={[]}
                      deleteAction={{ endpoint: `/api/departments/${department.id}` }}
                    />
                  </DataTableCell>
                </ClickableTableRow>
              )
            })
          )}
        </DataTableBody>
      </DataTable>
```

Check: `grep -n "take: [0-9]\|toLocaleString\|\"-\"\|MasterDataHeader\|ColumnHeader\|DeleteButton\|bg-muted\|function " "src/app/[locale]/(dashboard)/master-data/departments/page.tsx"` prints one line, `export default async function DepartmentsPage({ params, searchParams }: DepartmentsPageProps) {`.

- [ ] **Step 5: Delete the wrapper**

Run: `git rm src/components/master-data/department-delete-button.tsx` then `git grep -n "department-delete-button\|DepartmentDeleteButton" -- src`
Expected: `rm 'src/components/master-data/department-delete-button.tsx'`, then no output (exit 1).

- [ ] **Step 6: Run the tests for this task**

Run: `node --test tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/master-data-return-navigation.test.ts tests/master-data-brand-supplier-ui.test.ts tests/master-data-workspace.test.ts tests/confirm-dialog-ui.test.ts tests/row-actions-ui.test.ts tests/list-primitives-ui.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `tests 118 · pass 118 · fail 0` (list-pages-ui now 5).

Run: `node --test tests/list-pagination.test.ts tests/operational-return-navigation.test.ts tests/audit-pending-mobile-ux.test.ts tests/mobile-field-navigation.test.ts`
Expected: PASS, `fail 0`.

Run: `node <temp>/p2b1-precheck.mjs --file D/master-data/departments/page.tsx` then `node <temp>/p2b1-precheck.mjs --budgets`
Expected: `· in MIGRATED_LIST_FILES` and `args    (no row holds this file)`; then exit 0 with `R7 TABLE_HEADER_FILLS 39 in 26 rows`, `LH2 BUDGETS.LH2 17 in 10 rows`, `LR1 BUDGETS.LR1 4 in 3 rows` and `budgets hold: no live count is over its row`.

- [ ] **Step 7: Prove every class compiles**

Run: `node <temp>/p2b1-tw-probe.mjs "src/app/[locale]/(dashboard)/master-data/departments/page.tsx"`
Expected: `checked 8 classes, missing 0`. No class is new to `src`.

- [ ] **Step 8: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 0 fail and 2 more tests than before Step 2 (the two B4 tests); tsc no errors (the `Prisma.DepartmentWhereInput` constant and the `searchParams` type with `page` and `pageSize` compile); lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 4 files in `git diff --stat`: the page 143 insertions and 92 deletions, `tests/list-pages-ui.test.ts` 24 insertions, `tests/list-frame-guards.test.ts` 1 and 3, `tests/visual-foundation-guards.test.ts` 1 deletion; `git status` also lists the wrapper as `D `. The page stays CRLF (`184 184`).

- [ ] **Step 9: Commit**

```bash
git add "src/app/[locale]/(dashboard)/master-data/departments/page.tsx" tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): departments list on DataTable and RowActions, paged on the server (2B-1 task 17, B4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 5 files in the commit (4 modified, 1 deleted). `git status --short src tests messages` prints nothing.

**For the plan 2B-1 dev-app check (Task 25, spec §10.5 row `/th/master-data/departments`):**
- the footer total equals the number of rows the Task 0 screenshot of this page shows (the whole list was one page before)
- page 2 (`?page=2`, or pick 25 and step on) → "แก้ไข" → "กลับ": back on page 2 with the same page size; pick 50, search a term: the result keeps 50 and starts on page 1
- `?page=99` lands on the last page; a search that finds nothing shows the one-line "ไม่พบข้อมูล"
- 1440 and 375: the frameless 36px search (Task 12) 16px above the table; the scroll hint at 375
- the page loads as fast as before on dev (one more `count` on a small table); note anything slow in the Task 25 findings

---

### Task 18: `D/master-data/employees/page.tsx` on the list primitives (and the precheck that Tasks 19–21 reuse)

Spec §10.3 row 18, with §5.3 row "employees", §6.5 row 5, §3.13, rulings I5, I11, I21, I33 and R-h, R-n, R-p. One page, one commit, one wrapper deleted. The page is CRLF: edit it with exact-string replacement only. Task 13's shape applies (`listHref`, the `redirect` block, `paginationRange`, `hasActiveFilters`, `sortBy`, the `Pagination` labels, `RowActions` in `DataTableCell align="right"`, the `px-2` zero, `footTitle`); this lists only what differs.

Rulings this task applies:
- **B5, §5.3:** a click on the row still opens the detail page (`detailHref`); `next` = "แก้ไข" to `editHref` (the same `returnTo`), ⋯ = "ลบ" with `` deleteAction={{ endpoint: `/api/employees/${employee.id}` }} ``, the endpoint of `employee-delete-button.tsx`, which goes in this commit. `code` = the employee code, `name` = `fullNameTh`.
- **§6.5 row 5:** the five `FilterSelect` calls keep their `<option>` children as they are (the local helper had the same props, so from this commit on they render the shared `FilterSelect`). The search becomes `Field` + `SearchField`; the buttons `FilterFormActions`. `hasActiveFilters` = search, company, branch or department set, or `employmentStatus` / `custodyUsage` not `"all"`. The grid `xl:grid-cols-[minmax(220px,1.4fr)_repeat(5,minmax(150px,1fr))_auto]` stays.
- **§3.13, R-d:** four strip cells. `current` follows Task 13's rule (the filter the cell's link sets is the one in use): "ถือครองทรัพย์สิน" for `custodyUsage === "withAssets"`, "ยังไม่มีทรัพย์สิน" for `"withoutAssets"`, "พ้นสภาพแต่ยังถือครอง" for `employmentStatus === "resigned"` with `custodyUsage === "withAssets"` (its link sets both). That last cell takes `attention` when its count is above 0 (it had `tone="warning"`). The total cell clears every filter and is never current.
- **R-n, R-p, I11:** the position/email line is `orNil(…)` (it was `|| "-"`); the manager cell `<Nil />` when empty; the codes in the company, branch, department and manager cells are inner `tag`s; the asset count link keeps its class string, and its zero sits in the `px-2` span.
- **`ColumnHeader`** (still used by 2B-2 and 2B-5 pages) is no longer imported here; the four local helpers (`SummaryTile`, `FilterSelect`, `EmployeeSortableColumnHeader`, `EmployeePagination`) go.
- **Ruling, the precheck:** Task 13's `p2b1-t13-precheck.mjs` covers Tasks 13–17 only. This task saves `p2b1-t1821-precheck.mjs`, the same checks for Tasks 18–21: the hash of every file the task quotes, the wrapper's only caller, and the `MASTER_DATA_LISTS` / `MIGRATED_FILTER_FILES` lines of the earlier tasks.

What users will see on `/th/master-data/employees`: the same changes as branches (Task 13): one flat number strip, the 40px filter fields with "ล้างตัวกรอง" only while a filter is on, the white table header, 46px rows, monospace codes, "—" for an empty position/email line or manager, "แก้ไข" + ⋯ with "ลบ" (same confirm), a bottom sheet on phones, the new foot with 25/50/100, the scroll hint when the table overflows, and `?page=99` → the last page. Clicking a row still opens the employee's detail page. "พ้นสภาพแต่ยังถือครอง" shows an orange line with an icon above 0, instead of an orange border.

Not in this task: `buildEmployeeWhere`, `buildEmployeeQueryString` and the query (unchanged) · `D/master-data/employees/[id]/page.tsx` (2B-4) · the employee form (Task 22) · `ActiveBadge` (2D) · messages (no key changes) · docs (Task 26). Do not run a formatter.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/master-data/employees/page.tsx` (CRLF, 5 exact replacements)
- Delete: `src/components/master-data/employee-delete-button.tsx`
- Modify: `tests/list-pages-ui.test.ts`, `tests/list-filters-ui.test.ts` (LF, 1 replacement each)
- Modify: `tests/list-frame-guards.test.ts`, `tests/visual-foundation-guards.test.ts` (through `p2b-budget.mjs` only)
- Temp folder only, never committed: `p2b1-t1821-precheck.mjs` (Tasks 19–21 reuse it)

**Must keep passing without edits:** `tests/master-data-return-navigation.test.ts:43-54` (`const employeeReturnHref = `, `/employees/new`, `/employees/${employee.id}` and `/employees/${employee.id}/edit` through `appendMasterDataReturnTo`) · `tests/master-data-workspace.test.ts` · `tests/confirm-dialog-ui.test.ts:36` · `tests/mobile-field-navigation.test.ts` (the list stays a navigation route) · the other tests of Task 13 Step 6.

**Interfaces:**
- Consumes: what Task 13 consumes (the same imports, now with `Nil` next to `orNil` from `@/components/ui/nil`); `tests/list-pages-ui.test.ts` with `MASTER_DATA_LISTS` ending with the departments line (Task 17); `tests/list-filters-ui.test.ts` with `MIGRATED_FILTER_FILES` ending with the companies line (Task 16); `p2b1-precheck.mjs`, `p2b-budget.mjs` (Task 1) and `p2b1-tw-probe.mjs` (Task 4) in the temp folder.
- Produces: the employees line in both lists; no LFG or VFG row for the page; the page in `MIGRATED_LIST_FILES`; `p2b1-t1821-precheck.mjs <18|19|20|21>` in the temp folder.

| guard | `D/master-data/employees/page.tsx` before → after |
|---|---|
| VFG R7 | 1 → – |
| LFG | LH2 2 · LF1 1 · LT1 1 · LT2 1 · LT3 1 · LT4 1 · LT5 2 · LV1 2 · LV2 2 · LS1 1 · LR1 1 → all – · joins `MIGRATED_LIST_FILES` |

- [ ] **Step 1: Check what this task builds on (and save the precheck script)**

Save this script as `p2b1-t1821-precheck.mjs` in your temp folder (never in the repo). Tasks 19–21 run the same script with their own number.

```js
// p2b1-t1821-precheck.mjs: run from the repo root before Task 18, 19, 20 or 21 of plan 2B-1.
// Usage: node p2b1-t1821-precheck.mjs <18|19|20|21>. Reads only; writes nothing. Never commit this file.
// Confirms that the primitives of Tasks 3–12 are in, that each file the task edits still holds the text the old
// snippets quote (a hash of its text with \r stripped: the d38a0ee text, and tests/supplier-adaptive-ui.test.ts as
// Task 3 left it), that the delete wrapper has no other caller, and that the two page test files hold the lines of
// Tasks 13–17 and of the earlier tasks of this group, and not yet this task's.
import { createHash } from "node:crypto"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

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
const sourceFiles = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name)
  return statSync(path).isDirectory() ? sourceFiles(path) : /\.(?:ts|tsx)$/.test(name) ? [path.replace(/\\/g, "/")] : []
})
const callersOf = (module) => sourceFiles("src").filter((path) => read(path).includes(`"@/components/master-data/${module}"`))
const messages = (locale) => JSON.parse(read(`messages/${locale}.json`))

// The files each task edits with their hash, the wrapper it deletes and its caller, its MASTER_DATA_LISTS page (none
// for suppliers: its table lives in the list view, Task 20) and its MIGRATED_FILTER_FILES page (none for users).
const TASKS = {
  18: { files: { [`${D}master-data/employees/page.tsx`]: "dd42c01bafe070b3" }, wrapper: ["employee-delete-button", `${D}master-data/employees/page.tsx`], list: "master-data/employees", filter: "employees" },
  19: { files: { [`${D}master-data/locations/page.tsx`]: "c13f7de94b57849f" }, wrapper: ["location-delete-button", `${D}master-data/locations/page.tsx`], list: "master-data/locations", filter: "locations" },
  20: {
    files: { [`${D}master-data/suppliers/page.tsx`]: "9ca067298eb78eba", [`${C}master-data/supplier-list-view.tsx`]: "05bb347f0117c1b1", "tests/supplier-adaptive-ui.test.ts": "0825e9868170e3a6" },
    wrapper: ["supplier-delete-button", `${C}master-data/supplier-list-view.tsx`],
    list: null,
    filter: "suppliers",
    title: "suppliers: ",
  },
  21: { files: { [`${D}admin/users/page.tsx`]: "24d11d7cac827de4" }, wrapper: null, list: "admin/users", filter: null, title: "users: " },
}
const current = TASKS[task]
if (!current) {
  console.error("usage: node p2b1-t1821-precheck.mjs <18|19|20|21>")
  process.exit(2)
}
const pagesTest = read("tests/list-pages-ui.test.ts")
const filtersTest = read("tests/list-filters-ui.test.ts")
const ui = (name) => read(`${C}ui/${name}`)
const layout = read(`${C}master-data/master-data-layout.tsx`)
const keys = ["tableScrollHint", "showingRange", "pageSizeLabel", "moreActionsFor", "pagination", "pageOf", "previous", "next", "rowsPerPage", "noData", "edit", "view", "create", "filter", "search", "all", "status", "actions", "active"]
const listEntry = (name) => `{ path: \`\${D}${name}/page.tsx\``
const filterEntry = (name) => `"src/app/[locale]/(dashboard)/master-data/${name}/page.tsx",`
const earlierLists = ["branches", "brands", "categories", "companies", "departments"].map((name) => `master-data/${name}`)
const earlierFilters = ["branches", "brands", "categories", "companies"]
for (const [number, entry] of Object.entries(TASKS)) {
  if (Number(number) >= Number(task)) continue
  if (entry.list) earlierLists.push(entry.list)
  if (entry.filter) earlierFilters.push(entry.filter)
}

const checks = {
  "Task 1: tests/list-frame-guards.test.ts has MIGRATED_LIST_FILES": /const MIGRATED_LIST_FILES\b/.test(read("tests/list-frame-guards.test.ts")),
  "Task 3: PageHeader": /export function PageHeader\(/.test(ui("page-header.tsx")),
  "Task 4: DataTable, its parts, DataTableFoot, TableEmptyRow and DataTableSort": ["DataTable", "DataTableHeader", "DataTableBody", "DataTableHead", "DataTableCell", "DataTableFoot", "TableEmptyRow"].every((name) => new RegExp(`export function ${name}\\(`).test(ui("data-table.tsx"))) && /export type DataTableSort = \{/.test(ui("data-table.tsx")),
  "Task 5: Pagination takes pageSize and pageSizes; LIST_PAGE_SIZES and lastListPage": /pageSizes\?: readonly PaginationPageSize\[\]/.test(ui("pagination.tsx")) && /export const LIST_PAGE_SIZES\b/.test(read("src/lib/list-pagination.ts")) && /export function lastListPage\(/.test(read("src/lib/list-pagination.ts")),
  "Task 6: FilterSelect and FilterFormActions": /export function FilterSelect\(/.test(ui("filter-select.tsx")) && /export function FilterFormActions\(/.test(ui("filter-panel.tsx")),
  "Task 7: RowActions": /export function RowActions\(/.test(ui("row-actions.tsx")),
  "Task 9: StatStrip": /export function StatStrip\(/.test(ui("stat-strip.tsx")),
  "Task 12: MasterDataSearch is on SearchField; ActiveBadge is still exported": /<SearchField name="search"/.test(layout) && /export function ActiveBadge\(/.test(layout) && /export function MasterDataSearch\(/.test(layout),
  "the common keys exist in th and en": ["th", "en"].every((locale) => keys.every((key) => typeof messages(locale).common?.[key] === "string")),
  ...Object.fromEntries(Object.entries(current.files).map(([path, expected]) => [`${path} is CRLF and unchanged (hash ${expected})`, eol(path) === "CRLF" && hash(path) === expected])),
  ...(current.wrapper
    ? { [`${C}master-data/${current.wrapper[0]}.tsx exists and only ${current.wrapper[1]} imports it`]: existsSync(`${C}master-data/${current.wrapper[0]}.tsx`) && callersOf(current.wrapper[0]).join("|") === current.wrapper[1] }
    : {}),
  "tests/list-pages-ui.test.ts (LF) holds the MASTER_DATA_LISTS lines of the earlier tasks only":
    eol("tests/list-pages-ui.test.ts") === "LF" &&
    /^const MASTER_DATA_LISTS: readonly MasterDataList\[\] = \[$/m.test(pagesTest) &&
    earlierLists.every((name) => pagesTest.includes(listEntry(name))) &&
    (!current.list || !pagesTest.includes(listEntry(current.list))) &&
    (!current.title || !pagesTest.includes(`test("${current.title}`)),
  "tests/list-filters-ui.test.ts (LF) holds the MIGRATED_FILTER_FILES lines of the earlier tasks only":
    eol("tests/list-filters-ui.test.ts") === "LF" &&
    earlierFilters.every((name) => filtersTest.includes(filterEntry(name))) &&
    (!current.filter || !filtersTest.includes(filterEntry(current.filter))),
}

let missing = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok     " : "MISSING"} ${name}`)
  if (!ok) missing += 1
}
for (const [path, expected] of Object.entries(current.files)) {
  if (hash(path) !== expected) console.log(`info    ${path} hash is ${hash(path)} (${eol(path)}); compare it with git diff d38a0ee -- "${path}"`)
}
if (missing > 0) {
  console.error(`ABORT: ${missing} precondition(s) failed. Do not start Task ${task}; report which.`)
  process.exit(1)
}
console.log(`preconditions hold for Task ${task}`)
```

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2b`

Run: `git status --short src tests messages` then `node <temp>/p2b1-t1821-precheck.mjs 18`
Expected: `git status` prints nothing. The script prints:
```
ok      Task 1: tests/list-frame-guards.test.ts has MIGRATED_LIST_FILES
ok      Task 3: PageHeader
ok      Task 4: DataTable, its parts, DataTableFoot, TableEmptyRow and DataTableSort
ok      Task 5: Pagination takes pageSize and pageSizes; LIST_PAGE_SIZES and lastListPage
ok      Task 6: FilterSelect and FilterFormActions
ok      Task 7: RowActions
ok      Task 9: StatStrip
ok      Task 12: MasterDataSearch is on SearchField; ActiveBadge is still exported
ok      the common keys exist in th and en
ok      src/app/[locale]/(dashboard)/master-data/employees/page.tsx is CRLF and unchanged (hash dd42c01bafe070b3)
ok      src/components/master-data/employee-delete-button.tsx exists and only src/app/[locale]/(dashboard)/master-data/employees/page.tsx imports it
ok      tests/list-pages-ui.test.ts (LF) holds the MASTER_DATA_LISTS lines of the earlier tasks only
ok      tests/list-filters-ui.test.ts (LF) holds the MIGRATED_FILTER_FILES lines of the earlier tasks only
preconditions hold for Task 18
```
On any `MISSING` line, stop and report it. A hash line means the page changed after `d38a0ee`, so the old snippets of Step 4 may not match: report it with the `info` line, do not guess.

Run: `node <temp>/p2b1-precheck.mjs --file D/master-data/employees/page.tsx`
Expected (after the `info`/`ok` header lines; exit 0):
```
file    src/app/[locale]/(dashboard)/master-data/employees/page.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
R7         1       1     0     1
LH2        2       2     0     2
LF1        1       1     0     1
LT1        1       1     0     1
LT2        1       1     0     1
LT3        1       1     0     1
LT4        1       1     0     1
LT5        2       2     0     2
LV1        2       2     0     2
LV2        2       2     0     2
LS1        1       1     0     1
LR1        1       1     0     1
args    R7=1:1 LH2=2:2 LF1=1:1 LT1=1:1 LT2=1:1 LT3=1:1 LT4=1:1 LT5=2:2 LV1=2:2 LV2=2:2 LS1=1:1 LR1=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

- [ ] **Step 2: The failing tests**

(a) `tests/list-pages-ui.test.ts`: add the employees line. Replace:

```ts
  { path: `${D}master-data/departments/page.tsx`, deleteEndpoints: ["/api/departments/${department.id}"], removedWrappers: [`${C}master-data/department-delete-button.tsx`], stats: false },
]
```

with:

```ts
  { path: `${D}master-data/departments/page.tsx`, deleteEndpoints: ["/api/departments/${department.id}"], removedWrappers: [`${C}master-data/department-delete-button.tsx`], stats: false },
  { path: `${D}master-data/employees/page.tsx`, deleteEndpoints: ["/api/employees/${employee.id}"], removedWrappers: [`${C}master-data/employee-delete-button.tsx`], stats: true },
]
```

(b) `tests/list-filters-ui.test.ts`: add the employees line. Replace:

```ts
  "src/app/[locale]/(dashboard)/master-data/companies/page.tsx",
]
```

with:

```ts
  "src/app/[locale]/(dashboard)/master-data/companies/page.tsx",
  "src/app/[locale]/(dashboard)/master-data/employees/page.tsx",
]
```

Run: `node --test tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts`
Expected: FAIL, `tests 8 · pass 5 · fail 3`: `master-data lists build on …` (`…/master-data/employees/page.tsx: no <PageHeader`), `a master-data list past its last page …` (message `src/app/[locale]/(dashboard)/master-data/employees/page.tsx`) and item 5 (`…/master-data/employees/page.tsx: a raw select or textarea`). The brand panel test, the two departments tests, Task 6's test and item 6 pass.

- [ ] **Step 3: Lower the guard rows of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs D/master-data/employees/page.tsx R7=1:0 LH2=2:0 LF1=1:0 LT1=1:0 LT2=1:0 LT3=1:0 LT4=1:0 LT5=2:0 LV1=2:0 LV2=2:0 LS1=1:0 LR1=1:0 --migrated`
Expected (exit 0):
```
R7: 1 -> 0 (row deleted)
LH2: 2 -> 0 (row deleted)
LF1: 1 -> 0 (row deleted)
LT1: 1 -> 0 (row deleted)
LT2: 1 -> 0 (row deleted)
LT3: 1 -> 0 (row deleted)
LT4: 1 -> 0 (row deleted)
LT5: 2 -> 0 (row deleted)
LV1: 2 -> 0 (row deleted)
LV2: 2 -> 0 (row deleted)
LS1: 1 -> 0 (row deleted)
LR1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/master-data/employees/page.tsx
```

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 34 · fail 13`:
- LFG: LH2 (`17 in 10 files`), LF1 (`6 in 6`), LT1 (`40 in 14`), LT2 (`5 in 5`), LT3 (`11 in 10`), LT4 (`7 in 7`), LT5 (`15 in 8`), LV1 (`31 in 13`), LV2 (`123 in 39`), LS1 (`26 in 23`), LR1 (`4 in 3`), each listing only the employees page (`: 2 > 0` for LH2, LT5, LV1 and LV2, `: 1 > 0` for the others), and `L0` with the same 11 lines.
- VFG: the R7 test with `39 matches in 26 files; over budget:` and `src/app/[locale]/(dashboard)/master-data/employees/page.tsx: 1 > 0`.

- [ ] **Step 4: Move the page onto the primitives (`src/app/[locale]/(dashboard)/master-data/employees/page.tsx`, CRLF)**

Five exact replacements, top to bottom. Make all five before you compile: (1) imports what (2)–(4) use, and (5) deletes the local helpers that (3) and (4) stop calling.

(1) Imports. `ArrowDown`, `ArrowUp`, `Edit`, `EmployeeDeleteButton`, `ColumnHeader` and `MasterDataHeader` go; `redirect`, `Pencil`, `Plus`, the primitives, `formatCount` and the page helpers come in. `Link` above and the `paginationRange`, `appendMasterDataReturnTo` and `organization-master-query` imports below stay.

Replace:

```tsx
import { getTranslations } from "next-intl/server"
import { ArrowDown, ArrowUp, Edit } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { EmployeeDeleteButton } from "@/components/master-data/employee-delete-button"
import {
  ActiveBadge,
  ColumnHeader,
  MasterDataHeader,
} from "@/components/master-data/master-data-layout"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
```

with:

```tsx
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Pencil, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { ActiveBadge } from "@/components/master-data/master-data-layout"
import { buttonVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
import { FilterSelect } from "@/components/ui/filter-select"
import { Nil, orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
```

(2) After the summary: the list href, the past-the-end redirect, the range, the active-filter flag and the sort heads. `filteredBranches` and `filteredDepartments` below stay.

Replace:

```tsx
  const summary = buildEmployeeSummary(summaryEmployees)
```

with:

```tsx
  const summary = buildEmployeeSummary(summaryEmployees)
  const listHref = (next: Partial<EmployeeListState>) => `${basePath}?${buildEmployeeQueryString(listState, next)}`
  // A page past the last one (an old link, or the last row of the last page deleted) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listState.pageSize)
  if (employees.length === 0 && total > 0 && listState.page > lastPage) {
    redirect(listHref({ page: lastPage }))
  }
  const { start, end, totalPages } = paginationRange(listState.page, listState.pageSize, total)
  const hasActiveFilters = Boolean(listState.search || listState.companyId || listState.branchId || listState.departmentId || listState.employmentStatus !== "all" || listState.custodyUsage !== "all")
  const sortBy = (field: EmployeeSort): DataTableSort => ({
    href: listHref({ sort: field, direction: listState.sort === field && listState.direction === "asc" ? "desc" : "asc", page: 1 }),
    direction: listState.sort === field ? listState.direction : null,
  })
```

(3) The page root, the header, the strip, the filter panel and the search field. The hidden inputs and the five `FilterSelect` calls below stay as they are.

Replace:

```tsx
    <div className="space-y-4">
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={appendMasterDataReturnTo(`/${locale}/master-data/employees/new`, employeeReturnHref)}
        createLabel={tCommon("create")}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          label={t("summaryTotal")}
          value={summary.total}
          detail={t("summaryActive", { count: summary.active })}
          href={basePath}
        />
        <SummaryTile
          label={t("summaryWithAssets")}
          value={summary.withAssets}
          detail={t("summaryWithAssetsHelp")}
          href={`${basePath}?${buildEmployeeQueryString(listState, { custodyUsage: "withAssets", page: 1 })}`}
        />
        <SummaryTile
          label={t("summaryWithoutAssets")}
          value={summary.withoutAssets}
          detail={t("summaryWithoutAssetsHelp")}
          href={`${basePath}?${buildEmployeeQueryString(listState, { custodyUsage: "withoutAssets", page: 1 })}`}
        />
        <SummaryTile
          label={t("summaryFormerWithAssets")}
          value={summary.formerWithAssets}
          detail={t("summaryFormerWithAssetsHelp")}
          href={`${basePath}?${buildEmployeeQueryString(listState, { employmentStatus: "resigned", custodyUsage: "withAssets", page: 1 })}`}
          tone={summary.formerWithAssets > 0 ? "warning" : "neutral"}
        />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(5,minmax(150px,1fr))_auto]" action={basePath}>
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={listState.pageSize} />
          <input type="hidden" name="sort" value={listState.sort} />
          <input type="hidden" name="direction" value={listState.direction} />
          <label className="space-y-1 text-sm font-medium text-foreground">
            <span>{tCommon("search")}</span>
            <input
              type="search"
              name="search"
              defaultValue={listState.search}
              placeholder={t("searchPlaceholder")}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </label>
```

with:

```tsx
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <Link href={appendMasterDataReturnTo(`/${locale}/master-data/employees/new`, employeeReturnHref)} className={buttonVariants({ size: "md" })}>
            <Plus aria-hidden="true" />
            {tCommon("create")}
          </Link>
        }
      />

      <StatStrip
        items={[
          {
            key: "total",
            label: t("summaryTotal"),
            value: formatCount(summary.total),
            foot: t("summaryActive", { count: summary.active }),
            footTitle: t("summaryActive", { count: summary.active }),
            href: basePath,
          },
          {
            key: "withAssets",
            label: t("summaryWithAssets"),
            value: formatCount(summary.withAssets),
            foot: t("summaryWithAssetsHelp"),
            footTitle: t("summaryWithAssetsHelp"),
            href: listHref({ custodyUsage: "withAssets", page: 1 }),
            current: listState.custodyUsage === "withAssets",
          },
          {
            key: "withoutAssets",
            label: t("summaryWithoutAssets"),
            value: formatCount(summary.withoutAssets),
            foot: t("summaryWithoutAssetsHelp"),
            footTitle: t("summaryWithoutAssetsHelp"),
            href: listHref({ custodyUsage: "withoutAssets", page: 1 }),
            current: listState.custodyUsage === "withoutAssets",
          },
          {
            key: "formerWithAssets",
            label: t("summaryFormerWithAssets"),
            value: formatCount(summary.formerWithAssets),
            foot: t("summaryFormerWithAssetsHelp"),
            footTitle: t("summaryFormerWithAssetsHelp"),
            href: listHref({ employmentStatus: "resigned", custodyUsage: "withAssets", page: 1 }),
            current: listState.employmentStatus === "resigned" && listState.custodyUsage === "withAssets",
            attention: summary.formerWithAssets > 0,
          },
        ]}
      />

      <FilterPanel>
        <form role="search" action={basePath} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(5,minmax(150px,1fr))_auto]">
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={listState.pageSize} />
          <input type="hidden" name="sort" value={listState.sort} />
          <input type="hidden" name="direction" value={listState.direction} />
          <Field label={tCommon("search")}>
            <SearchField name="search" defaultValue={listState.search} placeholder={t("searchPlaceholder")} />
          </Field>
```

(4) The filter buttons, the table and its pager.

Replace:

```tsx
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
            >
              {tCommon("filter")}
            </button>
            <Link
              href={basePath}
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              {t("clearFilters")}
            </Link>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <EmployeeSortableColumnHeader field="code" current={listState} basePath={basePath}>{t("code")}</EmployeeSortableColumnHeader>
                <EmployeeSortableColumnHeader field="fullNameTh" current={listState} basePath={basePath}>{t("fullNameTh")}</EmployeeSortableColumnHeader>
                <EmployeeSortableColumnHeader field="company" current={listState} basePath={basePath}>{t("company")}</EmployeeSortableColumnHeader>
                <EmployeeSortableColumnHeader field="branch" current={listState} basePath={basePath}>{t("branch")}</EmployeeSortableColumnHeader>
                <EmployeeSortableColumnHeader field="department" current={listState} basePath={basePath}>{t("department")}</EmployeeSortableColumnHeader>
                <ColumnHeader>{t("manager")}</ColumnHeader>
                <EmployeeSortableColumnHeader field="employmentStatus" current={listState} basePath={basePath}>{t("employmentStatus")}</EmployeeSortableColumnHeader>
                <EmployeeSortableColumnHeader field="assets" current={listState} basePath={basePath}>{t("assets")}</EmployeeSortableColumnHeader>
                <ColumnHeader>{tCommon("status")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={10} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
              ) : (
                employees.map((employee) => {
                  const drilldown = buildEmployeeDrilldownHrefs({ locale, employeeId: employee.id })
                  const detailHref = appendMasterDataReturnTo(`/${locale}/master-data/employees/${employee.id}`, employeeReturnHref)
                  const editHref = appendMasterDataReturnTo(`/${locale}/master-data/employees/${employee.id}/edit`, employeeReturnHref)
                  return (
                    <ClickableTableRow
                      key={employee.id}
                      href={detailHref}
                      label={`${tCommon("view")}: ${employee.code}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{employee.code}</td>
                      <td className="min-w-56 px-4 py-3 text-foreground">
                        <div className="font-medium">{employee.fullNameTh}</div>
                        <div className="text-xs text-muted-foreground">
                          {[employee.position, employee.email].filter(Boolean).join(" / ") || "-"}
                        </div>
                      </td>
                      <td className="min-w-56 px-4 py-3 text-muted-foreground">
                        {employee.company.code} - {employee.company.nameTh}
                      </td>
                      <td className="min-w-44 px-4 py-3 text-muted-foreground">
                        {employee.branch.code} - {employee.branch.name}
                      </td>
                      <td className="min-w-44 px-4 py-3 text-muted-foreground">
                        {employee.department.code} - {employee.department.name}
                      </td>
                      <td className="min-w-44 px-4 py-3 text-muted-foreground">
                        {employee.manager ? `${employee.manager.code} - ${employee.manager.fullNameTh}` : "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {t(`status_${employee.employmentStatus}`)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {employee._count.custodianAssets > 0 ? (
                          <Link
                            href={drilldown.assets}
                            className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                          >
                            {employee._count.custodianAssets.toLocaleString()}
                          </Link>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <ActiveBadge label={tCommon("active")} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            href={editHref}
                            title={tCommon("edit")}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary-soft"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <EmployeeDeleteButton id={employee.id} />
                        </div>
                      </td>
                    </ClickableTableRow>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <EmployeePagination
          current={listState}
          total={total}
          basePath={basePath}
          labels={{
            rowsPerPage: tCommon("rowsPerPage"),
            page: tCommon("page"),
            of: tCommon("of"),
            previous: tCommon("previous"),
            next: tCommon("next"),
          }}
        />
      </div>
    </div>
  )
```

with:

```tsx
          <FilterFormActions submitLabel={tCommon("filter")} clear={hasActiveFilters ? { href: basePath, label: t("clearFilters") } : undefined} />
        </form>
      </FilterPanel>

      <DataTable
        caption={t("title")}
        scrollHint={tCommon("tableScrollHint")}
        footer={
          total > 0 ? (
            <Pagination
              page={listState.page}
              totalPages={totalPages}
              previousHref={listHref({ page: listState.page - 1 })}
              nextHref={listHref({ page: listState.page + 1 })}
              pageSize={listState.pageSize}
              pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: listHref({ pageSize: value, page: 1 }) }))}
              labels={{
                navigation: tCommon("pagination"),
                previous: tCommon("previous"),
                next: tCommon("next"),
                pageOf: tCommon("pageOf", { page: listState.page, total: totalPages }),
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
            <DataTableHead sort={sortBy("code")}>{t("code")}</DataTableHead>
            <DataTableHead sort={sortBy("fullNameTh")}>{t("fullNameTh")}</DataTableHead>
            <DataTableHead sort={sortBy("company")}>{t("company")}</DataTableHead>
            <DataTableHead sort={sortBy("branch")}>{t("branch")}</DataTableHead>
            <DataTableHead sort={sortBy("department")}>{t("department")}</DataTableHead>
            <DataTableHead>{t("manager")}</DataTableHead>
            <DataTableHead sort={sortBy("employmentStatus")}>{t("employmentStatus")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("assets")}>{t("assets")}</DataTableHead>
            <DataTableHead>{tCommon("status")}</DataTableHead>
            <DataTableHead align="right" hideLabel>{tCommon("actions")}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {employees.length === 0 ? (
            hasActiveFilters ? (
              <TableEmptyRow colSpan={10} emptyState={{ title: tCommon("noData"), actionHref: basePath, actionLabel: t("clearFilters"), actionVariant: "secondary" }} />
            ) : (
              <TableEmptyRow colSpan={10}>{tCommon("noData")}</TableEmptyRow>
            )
          ) : (
            employees.map((employee) => {
              const drilldown = buildEmployeeDrilldownHrefs({ locale, employeeId: employee.id })
              const detailHref = appendMasterDataReturnTo(`/${locale}/master-data/employees/${employee.id}`, employeeReturnHref)
              const editHref = appendMasterDataReturnTo(`/${locale}/master-data/employees/${employee.id}/edit`, employeeReturnHref)
              return (
                <ClickableTableRow
                  key={employee.id}
                  href={detailHref}
                  label={`${tCommon("view")}: ${employee.code}`}
                >
                  <DataTableCell className="whitespace-nowrap">
                    <span className="tag font-medium text-foreground">{employee.code}</span>
                  </DataTableCell>
                  <DataTableCell className="min-w-56 text-foreground">
                    <div className="font-medium">{employee.fullNameTh}</div>
                    <div className="text-xs text-muted-foreground">
                      {orNil([employee.position, employee.email].filter(Boolean).join(" / "))}
                    </div>
                  </DataTableCell>
                  <DataTableCell className="min-w-56 text-muted-foreground">
                    <span className="tag">{employee.company.code}</span> - {employee.company.nameTh}
                  </DataTableCell>
                  <DataTableCell className="min-w-44 text-muted-foreground">
                    <span className="tag">{employee.branch.code}</span> - {employee.branch.name}
                  </DataTableCell>
                  <DataTableCell className="min-w-44 text-muted-foreground">
                    <span className="tag">{employee.department.code}</span> - {employee.department.name}
                  </DataTableCell>
                  <DataTableCell className="min-w-44 text-muted-foreground">
                    {employee.manager ? (
                      <>
                        <span className="tag">{employee.manager.code}</span> - {employee.manager.fullNameTh}
                      </>
                    ) : (
                      <Nil />
                    )}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-muted-foreground">
                    {t(`status_${employee.employmentStatus}`)}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">
                    {employee._count.custodianAssets > 0 ? (
                      <Link
                        href={drilldown.assets}
                        className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                      >
                        {formatCount(employee._count.custodianAssets)}
                      </Link>
                    ) : (
                      <span className="px-2">{formatCount(0)}</span>
                    )}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <ActiveBadge label={tCommon("active")} />
                  </DataTableCell>
                  <DataTableCell align="right">
                    <RowActions
                      code={employee.code}
                      name={employee.fullNameTh}
                      menuLabel={tCommon("moreActionsFor", { code: employee.code })}
                      next={{ label: tCommon("edit"), href: editHref, icon: <Pencil aria-hidden="true" /> }}
                      groups={[]}
                      deleteAction={{ endpoint: `/api/employees/${employee.id}` }}
                    />
                  </DataTableCell>
                </ClickableTableRow>
              )
            })
          )}
        </DataTableBody>
      </DataTable>
    </div>
  )
```

(5) The four local helpers at the end of the file go (`SummaryTile`, `FilterSelect`, `EmployeeSortableColumnHeader`, `EmployeePagination`). The snippet starts at the page component's closing `}`; the file then ends with that `}` and one line break.

Replace:

```tsx
}

function SummaryTile({
  label,
  value,
  detail,
  href,
  tone = "neutral",
}: {
  label: string
  value: number
  detail: string
  href: string
  tone?: "neutral" | "warning"
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg border bg-surface p-4 transition-colors hover:border-primary-border hover:bg-primary-soft ${
        tone === "warning" ? "border-warning-border" : "border-border"
      }`}
    >
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-bold text-foreground">{value.toLocaleString()}</div>
      <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
    </Link>
  )
}

function FilterSelect({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string
  name: string
  defaultValue: string
  children: React.ReactNode
}) {
  return (
    <label className="space-y-1 text-sm font-medium text-foreground">
      <span>{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
      >
        {children}
      </select>
    </label>
  )
}

function EmployeeSortableColumnHeader({
  children,
  field,
  current,
  basePath,
}: {
  children: React.ReactNode
  field: EmployeeSort
  current: EmployeeListState
  basePath: string
}) {
  const active = current.sort === field
  const nextDirection = active && current.direction === "asc" ? "desc" : "asc"
  const href = `${basePath}?${buildEmployeeQueryString(current, { sort: field, direction: nextDirection, page: 1 })}`

  return (
    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">
      <Link href={href} className="inline-flex items-center gap-1 hover:text-primary">
        {children}
        {active ? (
          current.direction === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
        ) : null}
      </Link>
    </th>
  )
}

function EmployeePagination({
  current,
  total,
  basePath,
  labels,
}: {
  current: EmployeeListState
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
            href={`${basePath}?${buildEmployeeQueryString(current, { pageSize, page: 1 })}`}
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
          href={`${basePath}?${buildEmployeeQueryString(current, { page: previousPage })}`}
          aria-disabled={current.page <= 1}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${
            current.page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-accent"
          }`}
        >
          {labels.previous}
        </Link>
        <Link
          href={`${basePath}?${buildEmployeeQueryString(current, { page: nextPage })}`}
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
```

with:

```tsx
}
```

Check: `grep -n "^function\|toLocaleString\|\"-\"\|<select\|<input type=\"search\"\|<thead\|<td colSpan\|MasterDataHeader\|DeleteButton" "src/app/[locale]/(dashboard)/master-data/employees/page.tsx"` prints nothing (exit 1).

- [ ] **Step 5: Delete the wrapper**

Run: `git rm src/components/master-data/employee-delete-button.tsx` then `git grep -n "employee-delete-button\|EmployeeDeleteButton" -- src`
Expected: `rm 'src/components/master-data/employee-delete-button.tsx'`, then no output (exit 1). The new `MASTER_DATA_LISTS` line names the file on purpose: it checks that the file is gone.

- [ ] **Step 6: Run the tests for this task**

Run: `node --test tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/master-data-return-navigation.test.ts tests/master-data-brand-supplier-ui.test.ts tests/master-data-workspace.test.ts tests/confirm-dialog-ui.test.ts tests/row-actions-ui.test.ts tests/list-primitives-ui.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `tests 118 · pass 118 · fail 0` (list-pages-ui has 5 tests since Task 17).

Run: `node <temp>/p2b1-precheck.mjs --file D/master-data/employees/page.tsx` then `node <temp>/p2b1-precheck.mjs --budgets`
Expected: `· in MIGRATED_LIST_FILES`, live and budget 0 on every row, and `args    (no row holds this file)`; then exit 0 with `R7 TABLE_HEADER_FILLS 38 in 25 rows`, slack only on the two LB1 `0 → 1` rows, and `budgets hold: no live count is over its row`.

- [ ] **Step 7: Prove every class compiles**

Run: `node <temp>/p2b1-tw-probe.mjs "src/app/[locale]/(dashboard)/master-data/employees/page.tsx"`
Expected: `checked 20 classes, missing 0`. No class is new to `src`.

- [ ] **Step 8: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 0 fail and the same number of tests as before Step 2 (this task adds lines, not tests); tsc no errors; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 5 files in `git diff --stat`: the page 201 insertions and 313 deletions, `tests/list-pages-ui.test.ts` 1 insertion, `tests/list-filters-ui.test.ts` 1 insertion, `tests/list-frame-guards.test.ts` 1 and 11, `tests/visual-foundation-guards.test.ts` 1 deletion; `git status` also lists the wrapper as `D `. The page stays CRLF. A file that shows every line changed was normalized: restore its line endings before you commit.

- [ ] **Step 9: Commit**

```bash
git add "src/app/[locale]/(dashboard)/master-data/employees/page.tsx" tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): employees list on DataTable, RowActions, StatStrip and the shared filters (2B-1 task 18)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 6 files in the commit (5 modified, 1 deleted). `git status --short src tests messages` prints nothing.

**For the plan 2B-1 dev-app check (Task 25):** `/th/master-data/employees` at 1440, 1366, 1280 (the six-field filter grid, with and without a filter on, spec §6.10 risk 1), 768 and 375: the same list as Task 13; a click on a row opens the detail page, "แก้ไข" and ⋯ do not; "พ้นสภาพแต่ยังถือครอง" filters resigned employees who still hold assets and marks itself; the company filter still narrows the branch and department options after "กรอง"; ⋯ → "ลบ" → "ยกเลิก" deletes nothing and returns focus to ⋯.

---

### Task 19: `D/master-data/locations/page.tsx` on the list primitives

Spec §10.3 row 19, with §5.3 row "locations", §6.5 row 6, §3.13, rulings I5, I11, I21 and R-h, R-n, R-p. One page, one commit, one wrapper deleted. The page is CRLF. Task 13's shape applies; this lists only what differs.

Rulings this task applies:
- **B5, §5.3:** the row and `next` both open the edit page (`editHref`); ⋯ = "ลบ" with `` deleteAction={{ endpoint: `/api/locations/${location.id}` }} ``. `location-delete-button.tsx` goes in this commit.
- **§6.5 row 6:** the four `FilterSelect` calls keep their `options` arrays as they are (the `{ value: "", … }` and `{ value: "all", … }` rows included); `hasActiveFilters` = search, branch or location type set, or `assetUsage` / `hierarchy` not `"all"`. The grid stays.
- **§3.13:** five strip cells (one row from `lg`; below it two columns, and the fifth fills its row). `current` for "มีทรัพย์สิน" / "ยังไม่มีทรัพย์สิน" (`assetUsage`), "ที่ตั้งปลายทาง" (`hierarchy === "leaf"`) and "ที่ตั้งหลัก" (`hierarchy === "root"`); `attention` on "ยังไม่มีทรัพย์สิน" above 0 (it had `tone="warning"`).
- **§5.3 "num":** "ทรัพย์สินปัจจุบัน" and "ที่ตั้งย่อย" are right-aligned (`align="right"` heads over `numeric` cells); both were left-aligned.
- **R-n, R-p, I11:** the parent cell is `<Nil />` when empty (it was `: "-"`); the branch cell gets two inner `tag`s (company code and branch code), the parent cell one; the full-path cell stays text (one string from `buildLocationPathMap`, R-p). The asset count link keeps its class string.
- The four local helpers (`SummaryTile`, `LocationSortableColumnHeader`, `LocationPagination`, `FilterSelect`) go.

What users will see on `/th/master-data/locations`: the same changes as branches (Task 13). The strip has five cells; "ยังไม่มีทรัพย์สิน" shows its orange line above 0; the two counts sit on the right.

Not in this task: `buildLocationWhere`, `buildLocationQueryString`, `buildLocationPathMap` and the query (unchanged) · the location form (Task 22) · `ActiveBadge` (2D) · messages · docs.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/master-data/locations/page.tsx` (CRLF, 4 exact replacements)
- Delete: `src/components/master-data/location-delete-button.tsx`
- Modify: `tests/list-pages-ui.test.ts`, `tests/list-filters-ui.test.ts` (LF, 1 replacement each)
- Modify: `tests/list-frame-guards.test.ts`, `tests/visual-foundation-guards.test.ts` (through `p2b-budget.mjs` only)

**Must keep passing without edits:** `tests/master-data-return-navigation.test.ts:34-41` (`const locationReturnHref = `, `/locations/new`, `/locations/${location.id}/edit`) · `tests/organization-master-query.test.ts` (the branch drill-down still links to `/th/master-data/locations?branchId=…&page=1`, which this page reads as before) · the other tests of Task 18 Step 6.

**Interfaces:**
- Consumes: what Task 18 consumes; `tests/list-pages-ui.test.ts` and `tests/list-filters-ui.test.ts` ending with the employees lines (Task 18); `p2b1-t1821-precheck.mjs` (Task 18).
- Produces: the locations line in both lists; no LFG or VFG row for the page; the page in `MIGRATED_LIST_FILES`.

| guard | `D/master-data/locations/page.tsx` before → after |
|---|---|
| VFG R7 | 1 → – |
| LFG | LH2 2 · LF1 1 · LT1 1 · LT2 1 · LT3 1 · LT4 1 · LT5 2 · LV1 3 · LV2 1 · LS1 1 · LR1 1 → all – · joins `MIGRATED_LIST_FILES` |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b1-t1821-precheck.mjs 19`
Expected: `git status` prints nothing; the nine `ok` lines for Tasks 1–12 and the keys, then `ok` for the page (`hash c13f7de94b57849f`), `src/components/master-data/location-delete-button.tsx exists and only src/app/[locale]/(dashboard)/master-data/locations/page.tsx imports it`, the two test-file lines and `preconditions hold for Task 19`. On any `MISSING` line, stop and report it.

Run: `node <temp>/p2b1-precheck.mjs --file D/master-data/locations/page.tsx`
Expected (exit 0): live = budget = seed on every row, and
```
args    R7=1:1 LH2=2:2 LF1=1:1 LT1=1:1 LT2=1:1 LT3=1:1 LT4=1:1 LT5=2:2 LV1=3:3 LV2=1:1 LS1=1:1 LR1=1:1
```

- [ ] **Step 2: The failing tests**

(a) `tests/list-pages-ui.test.ts`: add the locations line. Replace:

```ts
  { path: `${D}master-data/employees/page.tsx`, deleteEndpoints: ["/api/employees/${employee.id}"], removedWrappers: [`${C}master-data/employee-delete-button.tsx`], stats: true },
]
```

with:

```ts
  { path: `${D}master-data/employees/page.tsx`, deleteEndpoints: ["/api/employees/${employee.id}"], removedWrappers: [`${C}master-data/employee-delete-button.tsx`], stats: true },
  { path: `${D}master-data/locations/page.tsx`, deleteEndpoints: ["/api/locations/${location.id}"], removedWrappers: [`${C}master-data/location-delete-button.tsx`], stats: true },
]
```

(b) `tests/list-filters-ui.test.ts`: add the locations line. Replace:

```ts
  "src/app/[locale]/(dashboard)/master-data/employees/page.tsx",
]
```

with:

```ts
  "src/app/[locale]/(dashboard)/master-data/employees/page.tsx",
  "src/app/[locale]/(dashboard)/master-data/locations/page.tsx",
]
```

Run: `node --test tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts`
Expected: FAIL, `tests 8 · pass 5 · fail 3`: `master-data lists build on …` (`…/master-data/locations/page.tsx: no <PageHeader`), `a master-data list past its last page …` (message `src/app/[locale]/(dashboard)/master-data/locations/page.tsx`) and item 5 (`…/master-data/locations/page.tsx: a raw select or textarea`).

- [ ] **Step 3: Lower the guard rows of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs D/master-data/locations/page.tsx R7=1:0 LH2=2:0 LF1=1:0 LT1=1:0 LT2=1:0 LT3=1:0 LT4=1:0 LT5=2:0 LV1=3:0 LV2=1:0 LS1=1:0 LR1=1:0 --migrated`
Expected (exit 0): the twelve `… -> 0 (row deleted)` lines in the order R7, LH2, LF1, LT1, LT2, LT3, LT4, LT5, LV1 (`LV1: 3 -> 0`), LV2, LS1, LR1, then `MIGRATED_LIST_FILES: added` and `written: src/app/[locale]/(dashboard)/master-data/locations/page.tsx`.

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 34 · fail 13`:
- LFG: LH2 (`15 in 9 files`), LF1 (`5 in 5`), LT1 (`39 in 13`), LT2 (`4 in 4`), LT3 (`10 in 9`), LT4 (`6 in 6`), LT5 (`13 in 7`), LV1 (`29 in 12`), LV2 (`121 in 38`), LS1 (`25 in 22`), LR1 (`3 in 2`), each listing only the locations page, and `L0` with the same 11 lines.
- VFG: the R7 test with `38 matches in 25 files; over budget:` and `src/app/[locale]/(dashboard)/master-data/locations/page.tsx: 1 > 0`.

- [ ] **Step 4: Move the page onto the primitives (`src/app/[locale]/(dashboard)/master-data/locations/page.tsx`, CRLF)**

Four exact replacements, top to bottom. Make all four before you compile.

(1) Imports. `ArrowDown`, `ArrowUp`, `Edit`, `LocationDeleteButton`, `ColumnHeader` and `MasterDataHeader` go; the old `paginationRange` import moves below with the other `@/lib` imports. `Link` above and the `appendMasterDataReturnTo`, `locationTypes` and `location-list-query` imports below stay.

Replace:

```tsx
import { getTranslations } from "next-intl/server"
import { ArrowDown, ArrowUp, Edit } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { LocationDeleteButton } from "@/components/master-data/location-delete-button"
import {
  ActiveBadge,
  ColumnHeader,
  MasterDataHeader,
} from "@/components/master-data/master-data-layout"
import { paginationRange } from "@/lib/master-data-query"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
```

with:

```tsx
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Pencil, Plus } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { ActiveBadge } from "@/components/master-data/master-data-layout"
import { buttonVariants } from "@/components/ui/button-variants"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
import { FilterSelect } from "@/components/ui/filter-select"
import { Nil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
```

(2) After `locationPaths`: the list href, the redirect, the range, the active-filter flag and the sort heads; then the root, the header, the strip, the filter panel and the search field. The hidden inputs and the four `FilterSelect` calls below stay.

Replace:

```tsx
  const locationPaths = buildLocationPathMap(pathLocations)

  return (
    <div className="space-y-4">
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={appendMasterDataReturnTo(`/${locale}/master-data/locations/new`, locationReturnHref)}
        createLabel={tCommon("create")}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SummaryTile
          label={t("summaryTotal")}
          value={summary.total}
          detail={t("summaryRoot", { count: summary.rootLocations })}
          href={basePath}
        />
        <SummaryTile
          label={t("summaryWithAssets")}
          value={summary.withAssets}
          detail={t("summaryWithAssetsHelp")}
          href={`${basePath}?${buildLocationQueryString(listState, { assetUsage: "withAssets", page: 1 })}`}
        />
        <SummaryTile
          label={t("summaryWithoutAssets")}
          value={summary.withoutAssets}
          detail={t("summaryWithoutAssetsHelp")}
          href={`${basePath}?${buildLocationQueryString(listState, { assetUsage: "withoutAssets", page: 1 })}`}
          tone={summary.withoutAssets > 0 ? "warning" : "neutral"}
        />
        <SummaryTile
          label={t("summaryLeaf")}
          value={summary.leafLocations}
          detail={t("summaryLeafHelp")}
          href={`${basePath}?${buildLocationQueryString(listState, { hierarchy: "leaf", page: 1 })}`}
        />
        <SummaryTile
          label={t("summaryRootCard")}
          value={summary.rootLocations}
          detail={t("summaryRootHelp")}
          href={`${basePath}?${buildLocationQueryString(listState, { hierarchy: "root", page: 1 })}`}
        />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <form
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(4,minmax(150px,1fr))_auto]"
          action={basePath}
        >
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={listState.pageSize} />
          <input type="hidden" name="sort" value={listState.sort} />
          <input type="hidden" name="direction" value={listState.direction} />
          <label className="space-y-1 text-sm font-medium text-foreground">
            <span>{tCommon("search")}</span>
            <input
              type="search"
              name="search"
              defaultValue={searchText}
              placeholder={t("searchPlaceholder")}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </label>
```

with:

```tsx
  const locationPaths = buildLocationPathMap(pathLocations)
  const listHref = (next: Partial<LocationListState>) => `${basePath}?${buildLocationQueryString(listState, next)}`
  // A page past the last one (an old link, or the last row of the last page deleted) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listState.pageSize)
  if (locations.length === 0 && total > 0 && listState.page > lastPage) {
    redirect(listHref({ page: lastPage }))
  }
  const { start, end, totalPages } = paginationRange(listState.page, listState.pageSize, total)
  const hasActiveFilters = Boolean(listState.search || listState.branchId || listState.locationType || listState.assetUsage !== "all" || listState.hierarchy !== "all")
  const sortBy = (field: LocationSort): DataTableSort => ({
    href: listHref({ sort: field, direction: listState.sort === field && listState.direction === "asc" ? "desc" : "asc", page: 1 }),
    direction: listState.sort === field ? listState.direction : null,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <Link href={appendMasterDataReturnTo(`/${locale}/master-data/locations/new`, locationReturnHref)} className={buttonVariants({ size: "md" })}>
            <Plus aria-hidden="true" />
            {tCommon("create")}
          </Link>
        }
      />

      <StatStrip
        items={[
          {
            key: "total",
            label: t("summaryTotal"),
            value: formatCount(summary.total),
            foot: t("summaryRoot", { count: summary.rootLocations }),
            footTitle: t("summaryRoot", { count: summary.rootLocations }),
            href: basePath,
          },
          {
            key: "withAssets",
            label: t("summaryWithAssets"),
            value: formatCount(summary.withAssets),
            foot: t("summaryWithAssetsHelp"),
            footTitle: t("summaryWithAssetsHelp"),
            href: listHref({ assetUsage: "withAssets", page: 1 }),
            current: listState.assetUsage === "withAssets",
          },
          {
            key: "withoutAssets",
            label: t("summaryWithoutAssets"),
            value: formatCount(summary.withoutAssets),
            foot: t("summaryWithoutAssetsHelp"),
            footTitle: t("summaryWithoutAssetsHelp"),
            href: listHref({ assetUsage: "withoutAssets", page: 1 }),
            current: listState.assetUsage === "withoutAssets",
            attention: summary.withoutAssets > 0,
          },
          {
            key: "leaf",
            label: t("summaryLeaf"),
            value: formatCount(summary.leafLocations),
            foot: t("summaryLeafHelp"),
            footTitle: t("summaryLeafHelp"),
            href: listHref({ hierarchy: "leaf", page: 1 }),
            current: listState.hierarchy === "leaf",
          },
          {
            key: "root",
            label: t("summaryRootCard"),
            value: formatCount(summary.rootLocations),
            foot: t("summaryRootHelp"),
            footTitle: t("summaryRootHelp"),
            href: listHref({ hierarchy: "root", page: 1 }),
            current: listState.hierarchy === "root",
          },
        ]}
      />

      <FilterPanel>
        <form role="search" action={basePath} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(4,minmax(150px,1fr))_auto]">
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={listState.pageSize} />
          <input type="hidden" name="sort" value={listState.sort} />
          <input type="hidden" name="direction" value={listState.direction} />
          <Field label={tCommon("search")}>
            <SearchField name="search" defaultValue={searchText} placeholder={t("searchPlaceholder")} />
          </Field>
```

(3) The filter buttons, the table and its pager.

Replace:

```tsx
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
            >
              {tCommon("filter")}
            </button>
            <Link
              href={basePath}
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              {t("clearFilters")}
            </Link>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <LocationSortableColumnHeader field="code" current={listState} basePath={basePath}>{t("code")}</LocationSortableColumnHeader>
                <LocationSortableColumnHeader field="name" current={listState} basePath={basePath}>{t("name")}</LocationSortableColumnHeader>
                <ColumnHeader>{t("fullPath")}</ColumnHeader>
                <LocationSortableColumnHeader field="branch" current={listState} basePath={basePath}>{t("branch")}</LocationSortableColumnHeader>
                <LocationSortableColumnHeader field="locationType" current={listState} basePath={basePath}>{t("locationType")}</LocationSortableColumnHeader>
                <LocationSortableColumnHeader field="parent" current={listState} basePath={basePath}>{t("parentLocation")}</LocationSortableColumnHeader>
                <LocationSortableColumnHeader field="currentAssets" current={listState} basePath={basePath}>{t("currentAssets")}</LocationSortableColumnHeader>
                <LocationSortableColumnHeader field="children" current={listState} basePath={basePath}>{t("childCount")}</LocationSortableColumnHeader>
                <ColumnHeader>{tCommon("status")}</ColumnHeader>
                <ColumnHeader align="right">{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {locations.length === 0 ? (
                <tr>
                  <td colSpan={10} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
              ) : (
                locations.map((location) => {
                  const drilldown = buildLocationDrilldownHrefs({ locale, locationCode: location.code })
                  const editHref = appendMasterDataReturnTo(`/${locale}/master-data/locations/${location.id}/edit`, locationReturnHref)
                  return (
                    <ClickableTableRow
                      key={location.id}
                      href={editHref}
                      label={`${tCommon("edit")}: ${location.code}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{location.code}</td>
                      <td className="min-w-48 px-4 py-3 text-foreground">{location.name}</td>
                      <td className="min-w-64 px-4 py-3 text-muted-foreground">
                        {locationPaths.get(location.id) ?? location.code}
                      </td>
                      <td className="min-w-56 px-4 py-3 text-muted-foreground">
                        {location.branch.company.code} / {location.branch.code} - {location.branch.name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{location.locationType}</td>
                      <td className="min-w-44 px-4 py-3 text-muted-foreground">
                        {location.parent ? `${location.parent.code} - ${location.parent.name}` : "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {location._count.currentAssets > 0 ? (
                          <Link
                            href={drilldown.assets}
                            className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                          >
                            {location._count.currentAssets.toLocaleString()}
                          </Link>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {location._count.children.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <ActiveBadge label={tCommon("active")} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            href={editHref}
                            title={tCommon("edit")}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary-soft"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <LocationDeleteButton id={location.id} />
                        </div>
                      </td>
                    </ClickableTableRow>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <LocationPagination
          current={listState}
          total={total}
          basePath={basePath}
          labels={{
            rowsPerPage: tCommon("rowsPerPage"),
            page: tCommon("page"),
            of: tCommon("of"),
            previous: tCommon("previous"),
            next: tCommon("next"),
          }}
        />
      </div>
    </div>
  )
```

with:

```tsx
          <FilterFormActions submitLabel={tCommon("filter")} clear={hasActiveFilters ? { href: basePath, label: t("clearFilters") } : undefined} />
        </form>
      </FilterPanel>

      <DataTable
        caption={t("title")}
        scrollHint={tCommon("tableScrollHint")}
        footer={
          total > 0 ? (
            <Pagination
              page={listState.page}
              totalPages={totalPages}
              previousHref={listHref({ page: listState.page - 1 })}
              nextHref={listHref({ page: listState.page + 1 })}
              pageSize={listState.pageSize}
              pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: listHref({ pageSize: value, page: 1 }) }))}
              labels={{
                navigation: tCommon("pagination"),
                previous: tCommon("previous"),
                next: tCommon("next"),
                pageOf: tCommon("pageOf", { page: listState.page, total: totalPages }),
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
            <DataTableHead sort={sortBy("code")}>{t("code")}</DataTableHead>
            <DataTableHead sort={sortBy("name")}>{t("name")}</DataTableHead>
            <DataTableHead>{t("fullPath")}</DataTableHead>
            <DataTableHead sort={sortBy("branch")}>{t("branch")}</DataTableHead>
            <DataTableHead sort={sortBy("locationType")}>{t("locationType")}</DataTableHead>
            <DataTableHead sort={sortBy("parent")}>{t("parentLocation")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("currentAssets")}>{t("currentAssets")}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("children")}>{t("childCount")}</DataTableHead>
            <DataTableHead>{tCommon("status")}</DataTableHead>
            <DataTableHead align="right" hideLabel>{tCommon("actions")}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {locations.length === 0 ? (
            hasActiveFilters ? (
              <TableEmptyRow colSpan={10} emptyState={{ title: tCommon("noData"), actionHref: basePath, actionLabel: t("clearFilters"), actionVariant: "secondary" }} />
            ) : (
              <TableEmptyRow colSpan={10}>{tCommon("noData")}</TableEmptyRow>
            )
          ) : (
            locations.map((location) => {
              const drilldown = buildLocationDrilldownHrefs({ locale, locationCode: location.code })
              const editHref = appendMasterDataReturnTo(`/${locale}/master-data/locations/${location.id}/edit`, locationReturnHref)
              return (
                <ClickableTableRow
                  key={location.id}
                  href={editHref}
                  label={`${tCommon("edit")}: ${location.code}`}
                >
                  <DataTableCell className="whitespace-nowrap">
                    <span className="tag font-medium text-foreground">{location.code}</span>
                  </DataTableCell>
                  <DataTableCell className="min-w-48 text-foreground">{location.name}</DataTableCell>
                  <DataTableCell className="min-w-64 text-muted-foreground">
                    {locationPaths.get(location.id) ?? location.code}
                  </DataTableCell>
                  <DataTableCell className="min-w-56 text-muted-foreground">
                    <span className="tag">{location.branch.company.code}</span> / <span className="tag">{location.branch.code}</span> - {location.branch.name}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-muted-foreground">{location.locationType}</DataTableCell>
                  <DataTableCell className="min-w-44 text-muted-foreground">
                    {location.parent ? (
                      <>
                        <span className="tag">{location.parent.code}</span> - {location.parent.name}
                      </>
                    ) : (
                      <Nil />
                    )}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">
                    {location._count.currentAssets > 0 ? (
                      <Link
                        href={drilldown.assets}
                        className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
                      >
                        {formatCount(location._count.currentAssets)}
                      </Link>
                    ) : (
                      <span className="px-2">{formatCount(0)}</span>
                    )}
                  </DataTableCell>
                  <DataTableCell numeric className="text-muted-foreground">{formatCount(location._count.children)}</DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    <ActiveBadge label={tCommon("active")} />
                  </DataTableCell>
                  <DataTableCell align="right">
                    <RowActions
                      code={location.code}
                      name={location.name}
                      menuLabel={tCommon("moreActionsFor", { code: location.code })}
                      next={{ label: tCommon("edit"), href: editHref, icon: <Pencil aria-hidden="true" /> }}
                      groups={[]}
                      deleteAction={{ endpoint: `/api/locations/${location.id}` }}
                    />
                  </DataTableCell>
                </ClickableTableRow>
              )
            })
          )}
        </DataTableBody>
      </DataTable>
    </div>
  )
```

(4) The four local helpers at the end of the file go. The snippet starts at the page component's closing `}`; the file then ends with that `}` and one line break.

Replace:

```tsx
}

function SummaryTile({
  label,
  value,
  detail,
  href,
  tone = "neutral",
}: {
  label: string
  value: number
  detail: string
  href: string
  tone?: "neutral" | "warning"
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg border bg-surface p-4 transition-colors hover:border-primary-border hover:bg-primary-soft ${
        tone === "warning" ? "border-warning-border" : "border-border"
      }`}
    >
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-bold text-foreground">{value.toLocaleString()}</div>
      <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
    </Link>
  )
}

function LocationSortableColumnHeader({
  children,
  field,
  current,
  basePath,
  align = "left",
}: {
  children: React.ReactNode
  field: LocationSort
  current: LocationListState
  basePath: string
  align?: "left" | "right"
}) {
  const active = current.sort === field
  const nextDirection = active && current.direction === "asc" ? "desc" : "asc"
  const href = `${basePath}?${buildLocationQueryString(current, { sort: field, direction: nextDirection, page: 1 })}`

  return (
    <th
      scope="col"
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-normal text-muted-foreground ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      <Link href={href} className={`inline-flex items-center gap-1 hover:text-primary ${align === "right" ? "justify-end" : ""}`}>
        {children}
        {active ? (
          current.direction === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
        ) : null}
      </Link>
    </th>
  )
}

function LocationPagination({
  current,
  total,
  basePath,
  labels,
}: {
  current: LocationListState
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
  const safePage = Math.min(current.page, totalPages)
  const previousPage = Math.max(1, safePage - 1)
  const nextPage = Math.min(totalPages, safePage + 1)

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
            href={`${basePath}?${buildLocationQueryString(current, { pageSize, page: 1 })}`}
            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 transition-colors ${
              current.pageSize === pageSize ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface hover:bg-accent"
            }`}
          >
            {pageSize}
          </Link>
        ))}
        <span className="px-2">
          {labels.page} {safePage} {labels.of} {totalPages}
        </span>
        <Link
          href={`${basePath}?${buildLocationQueryString(current, { page: previousPage })}`}
          aria-disabled={safePage <= 1}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${
            safePage <= 1 ? "pointer-events-none opacity-50" : "hover:bg-accent"
          }`}
        >
          {labels.previous}
        </Link>
        <Link
          href={`${basePath}?${buildLocationQueryString(current, { page: nextPage })}`}
          aria-disabled={safePage >= totalPages}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${
            safePage >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-accent"
          }`}
        >
          {labels.next}
        </Link>
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string
  name: string
  defaultValue: string
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="space-y-1 text-sm font-medium text-foreground">
      <span>{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
      >
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
}
```

Check: `grep -n "^function\|toLocaleString\|\"-\"\|<select\|<input type=\"search\"\|<thead\|<td colSpan\|MasterDataHeader\|DeleteButton" "src/app/[locale]/(dashboard)/master-data/locations/page.tsx"` prints nothing (exit 1).

- [ ] **Step 5: Delete the wrapper**

Run: `git rm src/components/master-data/location-delete-button.tsx` then `git grep -n "location-delete-button\|LocationDeleteButton" -- src`
Expected: `rm 'src/components/master-data/location-delete-button.tsx'`, then no output (exit 1).

- [ ] **Step 6: Run the tests for this task**

Run: `node --test tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/master-data-return-navigation.test.ts tests/master-data-brand-supplier-ui.test.ts tests/master-data-workspace.test.ts tests/confirm-dialog-ui.test.ts tests/row-actions-ui.test.ts tests/list-primitives-ui.test.ts tests/form-migration-guards.test.ts tests/organization-master-query.test.ts`
Expected: PASS, `tests 129 · pass 129 · fail 0` (the 118 of Task 18 Step 6 plus the 11 of `organization-master-query`).

Run: `node <temp>/p2b1-precheck.mjs --file D/master-data/locations/page.tsx` then `node <temp>/p2b1-precheck.mjs --budgets`
Expected: `· in MIGRATED_LIST_FILES` and `args    (no row holds this file)`; then exit 0 with `R7 TABLE_HEADER_FILLS 37 in 24 rows` and `budgets hold: no live count is over its row`.

- [ ] **Step 7: Prove every class compiles**

Run: `node <temp>/p2b1-tw-probe.mjs "src/app/[locale]/(dashboard)/master-data/locations/page.tsx"`
Expected: `checked 22 classes, missing 0`. No class is new to `src`.

- [ ] **Step 8: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 0 fail and the same number of tests as before Step 2; tsc no errors; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 5 files in `git diff --stat`: the page 202 insertions and 328 deletions, `tests/list-pages-ui.test.ts` 1 insertion, `tests/list-filters-ui.test.ts` 1 insertion, `tests/list-frame-guards.test.ts` 1 and 11, `tests/visual-foundation-guards.test.ts` 1 deletion; `git status` also lists the wrapper as `D `. The page stays CRLF.

- [ ] **Step 9: Commit**

```bash
git add "src/app/[locale]/(dashboard)/master-data/locations/page.tsx" tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): locations list on DataTable, RowActions, StatStrip and the shared filters (2B-1 task 19)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 6 files in the commit (5 modified, 1 deleted). `git status --short src tests messages` prints nothing.

**For the plan 2B-1 dev-app check (Task 25):** `/th/master-data/locations` at 1440, 1366, 1280, 1024, 768 and 375: the five strip cells in one row at 1440 and 1024 (Thai labels wrap inside their cell, the values stay aligned), two columns with "ที่ตั้งหลัก" across the last row at 768 and 375; "ที่ตั้งปลายทาง" and "ที่ตั้งหลัก" set the hierarchy filter and mark themselves; the branch cell shows the company and branch codes in monospace; a location without a parent shows "—"; a branch row's location count link on `/th/master-data/branches` opens this list with the branch filter set and "ล้างตัวกรอง" shown.

---

### Task 20: `D/master-data/suppliers/page.tsx` and `c/master-data/supplier-list-view.tsx` on the list primitives, one commit (and the supplier pins)

Spec §10.3 row 20, with §5.3 row "suppliers", §5.8 row "มีรายการมือถือแยกอยู่แล้ว", §6.2 6-ช, §6.5 row 7, §3.13, §9.5 rows `supplier-adaptive-ui.test.ts`, rulings I5, I11, I21, I33 and R-h, R-n, R-p. The page, its list view and the delete wrapper move in one commit. The three edited source and test files are CRLF: exact-string replacement only. Task 13's shape applies to the page; this lists what differs.

Rulings this task applies:
- **I5, B5, §5.8:** `RowActions` on the desktop row and on the phone card: `code` = the supplier code, `name` = its name, `next` = "แก้ไข" to `hrefs.edit` (with `returnTo` and a `Pencil` icon), `groups={[]}`, `` deleteAction={{ endpoint: `/api/suppliers/${supplier.id}` }} ``. Below `md` ⋯ opens the bottom sheet. The card's footer loses its three icon buttons, the "ดู" eye included: the card's code and name are already the link to the detail page (the desktop row has no view button either). A click on the row still opens the detail page. `supplier-delete-button.tsx` goes in this commit.
- **Ruling, where the pager is built:** the page builds the one `Pagination` (its labels need `tCommon("pageOf", …)` and `tCommon("showingRange", …)`, and the page computes `paginationRange` for the redirect anyway) and passes it as the list view's new `pagination` prop. The list view shows it once, in `DataTableFoot`, under both the table and the cards (§5.1).
- **Ruling, the ⋯ name in a server component:** `SupplierListView` has no translator; it takes its words from the page. `labels.moreActionsFor` is a function, `(code) => tCommon("moreActionsFor", { code })`; the list view is a server component called by a server page, so no client boundary has to serialize it.
- **The table inside the list view's frame:** the list view keeps its outer `rounded-lg border` frame, which also holds the cards and the foot, so the table is `DataTable framed={false} className="hidden md:block"` with `data-supplier-desktop-table`, `caption={labels.title}` and `scrollHint={labels.tableScrollHint}` (the nine columns can overflow at 768–1023px; the hint shows only then). Below `md` the table is hidden; `DataTableScrollArea` measures 0 there and shows no hint.
- **§6.2 6-ช, §6.5 row 7:** `SupplierFilterForm` stays one function rendered twice (the phone `<details>` keeps its markup; the desktop card becomes `<FilterPanel className="hidden md:block">`). It gains `role="search"` and the prop `hasActiveFilters`, and uses `Field` + `SearchField`, two `FilterSelect` with their `<option>` children (without the old `className`, which on the shared `FilterSelect` would land on the `Field`) and `FilterFormActions`. `controlClassName`, the local `FilterSelect` and the hand-written buttons go. `Field` gives each copy its own ids, and the copy that is `display: none` leaves the accessibility tree.
- **Empty state:** the `ActionEmptyState` outside the table stays; its clear button becomes `actionVariant="secondary"` while a filter is on (§5.3).
- **§3.13:** the four swipe tiles become one strip (2×2 below `lg`, §5.8 "StatStrip 2×2 บนมือถือ") inside `<section aria-label={t("summaryLabel")}>`, which keeps the name the old row had (a `<dl>` takes no name). `current` for "มีทรัพย์สิน" / "ยังไม่มีทรัพย์สิน" (`assetUsage`) and "ยังไม่มีเอกสารจัดซื้อ" (`purchaseDocumentUsage === "withoutPurchaseDocuments"`, also `attention` above 0); `footTitle` repeats the foot.
- **R-n, R-p, I11:** contact, phone and email are `orNil(…)` on the row and the card (they were `|| "-"`); the code is `tag font-medium` on the row and inside the card's link (the card's wrapper keeps the 12px muted text: VFG keeps sizes off `tag`). `formatCount` for the counts, `RelationshipCount` and the count link's `aria-label`; the asset count link keeps its class string.
- **Ruling (test), suppliers is not in `MASTER_DATA_LISTS`:** Task 13's list test reads one file per entry, and here the table, the rows and the foot live in the list view while the empty state is an `ActionEmptyState` outside the table (no `TableEmptyRow`). This task appends its own test, which reads the page and the list view together and checks the same parts. Only the page joins `MIGRATED_FILTER_FILES` (the list view has no form); both files join `MIGRATED_LIST_FILES`.
- **§9.5, the supplier pins** (`tests/supplier-adaptive-ui.test.ts`, read raw, CRLF: no `\n` in any new regex): `:16` → `/<DataTable\b/`; `:24` → `/min-h-11 (?:min-)?w-11|<RowActions\b/`; `:29` → the list's `<DataTableHead sort={sortBy("code")}>` plus `aria-sort=` read from `ui/data-table.tsx`; `:37-38` → `<Pagination` in the page and `<DataTableFoot>{pagination}</DataTableFoot>` in the list view (the disabled span lives in `ui/pagination.tsx`, pinned by `asset-register-building-blocks-ui:13`); `:46` → `/<StatStrip\b/`; `:58` (Task 3's version) reads the suppliers page, whose create link is `href={createHref} className={buttonVariants({ size: "md" })}`. **Ruling (spec gap):** `:47` (`overflow-x-auto` in the page) goes with `:46`, although §9.5 lists it as passing: both pinned the old swipe row, and nothing else in the page scrolls. `:8` (`const masterDataLayout`) loses its last reader and becomes `const dataTable` (an unused constant would be a new lint warning). `:12-15`, `:17`, `:21-23`, `:25`, `:30-31`, `:35-36`, `:42-45` and `:50-55` pass unchanged.

What users will see on `/th/master-data/suppliers`: the same changes as branches (Task 13), and:
- The summary is one strip instead of a row of cards; on phones a 2×2 grid instead of the sideways swipe.
- The phone filter disclosure and the desktop panel use the shared fields; the disclosure still opens by itself while a filter is on.
- Each phone card ends with "แก้ไข" (44px) and ⋯, which opens a bottom sheet with "ลบ". The eye button is gone: tap the code or the name to open the supplier.
- At 768–1023px the table shows the scroll hint while it is wider than the window.

Not in this task: `D/master-data/suppliers/[id]/page.tsx` and `c/master-data/supplier-purchase-documents.tsx` (2B-4) · the supplier form (Task 22) · the bounded count queries (unchanged, `:42-45`) · the `<details>` summary row (kept, `:51-54`) · messages · docs.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/master-data/suppliers/page.tsx` (CRLF, 5 exact replacements)
- Modify: `src/components/master-data/supplier-list-view.tsx` (CRLF, 3 exact replacements)
- Delete: `src/components/master-data/supplier-delete-button.tsx`
- Modify: `tests/supplier-adaptive-ui.test.ts` (CRLF, 7 exact replacements)
- Modify: `tests/list-pages-ui.test.ts` (LF, one block appended), `tests/list-filters-ui.test.ts` (LF, 1 replacement)
- Modify: `tests/list-frame-guards.test.ts`, `tests/visual-foundation-guards.test.ts` (through `p2b-budget.mjs` only)
- Temp folder only: `t20-pages-block.ts`

**Must keep passing without edits:** `tests/master-data-return-navigation.test.ts:43-54` (page and list view read together: `const supplierReturnHref = `, `/suppliers/new`, `/suppliers/${supplier.id}`, `/suppliers/${supplier.id}/edit`) · `tests/supplier-form-ui.test.ts` · `tests/supplier-detail-ui.test.ts` · `tests/asset-register-building-blocks-ui.test.ts:8-17` · the other tests of Task 18 Step 6.

**Interfaces:**
- Consumes: what Task 13 consumes, plus `DataTableFoot` and `DataTable framed={false}` (Task 4); `buildSupplierQueryString`, `type SupplierListState`, `type SupplierSort` (unchanged); `tests/list-filters-ui.test.ts` ending with the locations line (Task 19); `read`, `D`, `C` and `existsSync` of `tests/list-pages-ui.test.ts` (Task 13); `p2b1-append.mjs` (Task 6) and `p2b1-t1821-precheck.mjs` (Task 18).
- Produces:
  - `SupplierListView({ suppliers, locale, current, basePath, supplierReturnHref, createHref, hasActiveFilters, pagination, labels })`: `total` goes; `pagination: React.ReactNode` is new; `SupplierListLabels` gains `title`, `tableScrollHint` and `moreActionsFor: (code: string) => string`, and loses `delete`, `rowsPerPage`, `page`, `of`, `previous` and `next`. The page is its only caller.
  - `SupplierFilterForm` (page-local) takes `hasActiveFilters: boolean`.
  - The suppliers line in `MIGRATED_FILTER_FILES`; the test `suppliers: the page and its list view build on …` in `tests/list-pages-ui.test.ts`; no LFG or VFG row for the two files; both in `MIGRATED_LIST_FILES`.

| guard | before → after |
|---|---|
| VFG R7 | `c/master-data/supplier-list-view.tsx` 1 → – |
| LFG `D/master-data/suppliers/page.tsx` | LH2 2 · LF1 1 · LV1 1 · LS1 1 → all – · joins `MIGRATED_LIST_FILES` |
| LFG `c/master-data/supplier-list-view.tsx` | LT1 1 · LT2 1 · LT4 1 · LT5 2 · LV1 4 · LV2 5 · LN1 1 · LR1 2 → all – · joins `MIGRATED_LIST_FILES` |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b1-t1821-precheck.mjs 20`
Expected: `git status` prints nothing. The script prints:
```
ok      Task 1: tests/list-frame-guards.test.ts has MIGRATED_LIST_FILES
ok      Task 3: PageHeader
ok      Task 4: DataTable, its parts, DataTableFoot, TableEmptyRow and DataTableSort
ok      Task 5: Pagination takes pageSize and pageSizes; LIST_PAGE_SIZES and lastListPage
ok      Task 6: FilterSelect and FilterFormActions
ok      Task 7: RowActions
ok      Task 9: StatStrip
ok      Task 12: MasterDataSearch is on SearchField; ActiveBadge is still exported
ok      the common keys exist in th and en
ok      src/app/[locale]/(dashboard)/master-data/suppliers/page.tsx is CRLF and unchanged (hash 9ca067298eb78eba)
ok      src/components/master-data/supplier-list-view.tsx is CRLF and unchanged (hash 05bb347f0117c1b1)
ok      tests/supplier-adaptive-ui.test.ts is CRLF and unchanged (hash 0825e9868170e3a6)
ok      src/components/master-data/supplier-delete-button.tsx exists and only src/components/master-data/supplier-list-view.tsx imports it
ok      tests/list-pages-ui.test.ts (LF) holds the MASTER_DATA_LISTS lines of the earlier tasks only
ok      tests/list-filters-ui.test.ts (LF) holds the MIGRATED_FILTER_FILES lines of the earlier tasks only
preconditions hold for Task 20
```
On any `MISSING` line, stop and report it. The hash of `tests/supplier-adaptive-ui.test.ts` is the file as Task 3 left it.

Run: `node <temp>/p2b1-precheck.mjs --file D/master-data/suppliers/page.tsx` then `node <temp>/p2b1-precheck.mjs --file c/master-data/supplier-list-view.tsx`
Expected (exit 0 each, after the header lines): live = budget = seed on every row, and the `args` lines
```
args    LH2=2:2 LF1=1:1 LV1=1:1 LS1=1:1
args    R7=1:1 LT1=1:1 LT2=1:1 LT4=1:1 LT5=2:2 LV1=4:4 LV2=5:5 LN1=1:1 LR1=2:2
```

- [ ] **Step 2: The failing tests**

(a) `tests/list-filters-ui.test.ts`: add the suppliers line. Replace:

```ts
  "src/app/[locale]/(dashboard)/master-data/locations/page.tsx",
]
```

with:

```ts
  "src/app/[locale]/(dashboard)/master-data/locations/page.tsx",
  "src/app/[locale]/(dashboard)/master-data/suppliers/page.tsx",
]
```

(b) Save this block as `t20-pages-block.ts` in your temp folder, then run `node <temp>/p2b1-append.mjs <temp>/t20-pages-block.ts tests/list-pages-ui.test.ts`:

```ts
// Suppliers is not in MASTER_DATA_LISTS: its table, row actions and foot live in supplier-list-view.tsx, and its empty
// state is an ActionEmptyState outside the table. This test reads the page and the list view together (2B-1 Task 20).
test("suppliers: the page and its list view build on PageHeader, StatStrip, DataTable, RowActions and one shared Pagination (spec 2B §5.3, B5)", () => {
  const page = read(`${D}master-data/suppliers/page.tsx`)
  const list = read(`${C}master-data/supplier-list-view.tsx`)
  for (const part of ["<PageHeader", "<StatStrip", '<FilterPanel className="hidden md:block">', '<form role="search"', "<FilterFormActions", "<Pagination"]) {
    assert.ok(page.includes(part), `page: no ${part}`)
  }
  for (const part of ["<DataTable", "<DataTableHeader>", "<DataTableBody>", "<ClickableTableRow", "<DataTableFoot>{pagination}</DataTableFoot>", "<RowActions"]) {
    assert.ok(list.includes(part), `list view: no ${part}`)
  }
  assert.match(page, /<div className="space-y-6">/)
  assert.match(page, /tableScrollHint: tCommon\("tableScrollHint"\)/)
  assert.match(page, /pageSizes=\{LIST_PAGE_SIZES\.map\(/)
  assert.match(page, /moreActionsFor: \(code\) => tCommon\("moreActionsFor", \{ code \}\)/)
  assert.match(page, /^import \{ redirect \} from "next\/navigation"$/m)
  assert.match(page, /const lastPage = lastListPage\(total, listState\.pageSize\)\n\s+if \(suppliers\.length === 0 && total > 0 && listState\.page > lastPage\) \{\n\s+redirect\(/)
  assert.equal(page.match(/<SupplierFilterForm [^\n]*hasActiveFilters=\{hasActiveFilters\}/g)?.length, 2, "both filter forms show clear filters only while a filter is on")
  assert.equal(list.match(/next=\{\{ label: labels\.edit, href: hrefs\.edit, icon: <Pencil aria-hidden="true" \/> \}\}/g)?.length, 2, "the desktop row and the phone card")
  assert.equal(list.match(/deleteAction=\{\{ endpoint: `\/api\/suppliers\/\$\{supplier\.id\}` \}\}/g)?.length, 2)
  assert.match(list, /scrollHint=\{labels\.tableScrollHint\}/)
  assert.match(list, /actionVariant=\{hasActiveFilters \? "secondary" : "primary"\}/)
  assert.equal(existsSync(`${C}master-data/supplier-delete-button.tsx`), false, "the wrapper has no caller left (I5)")
})
```

(c) `tests/supplier-adaptive-ui.test.ts` (CRLF, read without stripping `\r`). Seven exact replacements, top to bottom.

(1) The test reads `ui/data-table.tsx` instead of the layout. Replace:

```ts
const masterDataLayout = readFileSync("src/components/master-data/master-data-layout.tsx", "utf8")
```

with:

```ts
const dataTable = readFileSync("src/components/ui/data-table.tsx", "utf8")
```

(2) Replace:

```ts
  assert.match(list, /<table/)
```

with:

```ts
  assert.match(list, /<DataTable\b/)
```

(3) Replace:

```ts
  assert.match(list, /min-h-11 min-w-11/)
```

with:

```ts
  assert.match(list, /min-h-11 (?:min-)?w-11|<RowActions\b/)
```

(4) Replace:

```ts
  assert.match(list, /aria-sort=/)
```

with:

```ts
  // The sort links and aria-sort come from DataTableHead (spec 2B §3.4).
  assert.match(list, /<DataTableHead sort=\{sortBy\("code"\)\}>/)
  assert.match(dataTable, /aria-sort=/)
```

(5) Replace:

```ts
  assert.match(list, /aria-disabled="true"/)
  assert.match(list, /<span[\s\S]*labels\.previous/)
```

with:

```ts
  // The page builds the shared Pagination (its disabled buttons are spans, pinned in asset-register-building-blocks-ui);
  // the list shows it once under the table and the phone cards.
  assert.match(page, /<Pagination\b/)
  assert.match(list, /<DataTableFoot>\{pagination\}<\/DataTableFoot>/)
```

(6) Replace:

```ts
  assert.match(page, /grid-flow-col/)
  assert.match(page, /overflow-x-auto/)
```

with:

```ts
  assert.match(page, /<StatStrip\b/)
```

(7) Replace:

```ts
test("shared master-data create action meets the mobile touch target", () => {
  // buttonVariants size "md" is 44px tall below md and 36px from md (spec 2B I2).
  assert.match(masterDataLayout, /href=\{createHref\} className=\{buttonVariants\(\{ size: "md" \}\)\}/)
})
```

with:

```ts
test("the supplier create action meets the mobile touch target", () => {
  // buttonVariants size "md" is 44px tall below md and 36px from md (spec 2B I2).
  assert.match(page, /href=\{createHref\} className=\{buttonVariants\(\{ size: "md" \}\)\}/)
})
```

Run: `node --test tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/supplier-adaptive-ui.test.ts`
Expected: FAIL, `tests 16 · pass 9 · fail 7`:
- `suppliers: the page and its list view build on …`: `page: no <PageHeader`
- item 5: `…/master-data/suppliers/page.tsx: a raw select or textarea`
- five supplier pins fail on their first new part: `supplier list has mutually exclusive …` (`/<DataTable\b/`), `supplier desktop sorting exposes aria-sort …` (`<DataTableHead sort={sortBy("code")}>`), `supplier list uses actionable empty states …` (`<Pagination` in the page), `supplier summaries use bounded count queries …` (`/<StatStrip\b/`), `the supplier create action meets the mobile touch target`
- the two Task 13 list tests, the other page tests, `mobile supplier cards expose …` and `mobile filters use a disclosure …` pass.

- [ ] **Step 3: Lower the guard rows of the two files (the failing guards)**

Run both:
- `node <temp>/p2b-budget.mjs D/master-data/suppliers/page.tsx LH2=2:0 LF1=1:0 LV1=1:0 LS1=1:0 --migrated`
- `node <temp>/p2b-budget.mjs c/master-data/supplier-list-view.tsx R7=1:0 LT1=1:0 LT2=1:0 LT4=1:0 LT5=2:0 LV1=4:0 LV2=5:0 LN1=1:0 LR1=2:0 --migrated`

Expected (exit 0 each):
```
LH2: 2 -> 0 (row deleted)
LF1: 1 -> 0 (row deleted)
LV1: 1 -> 0 (row deleted)
LS1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/master-data/suppliers/page.tsx
R7: 1 -> 0 (row deleted)
LT1: 1 -> 0 (row deleted)
LT2: 1 -> 0 (row deleted)
LT4: 1 -> 0 (row deleted)
LT5: 2 -> 0 (row deleted)
LV1: 4 -> 0 (row deleted)
LV2: 5 -> 0 (row deleted)
LN1: 1 -> 0 (row deleted)
LR1: 2 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/components/master-data/supplier-list-view.tsx
```

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 34 · fail 13`:
- LFG: LH2 (`13 in 8 files`), LF1 (`4 in 4`) and LS1 (`24 in 21`) listing the page; LT1 (`38 in 12`), LT2 (`3 in 3`), LT4 (`5 in 5`), LT5 (`11 in 6`), LV2 (`120 in 37`), LN1 (`13 in 11`) and LR1 (`2 in 1`) listing the list view; LV1 (`26 in 11`) listing both (`page.tsx: 1 > 0`, `supplier-list-view.tsx: 4 > 0`); and `L0` with all 12 lines.
- VFG: the R7 test with `37 matches in 24 files; over budget:` and `src/components/master-data/supplier-list-view.tsx: 1 > 0`.

- [ ] **Step 4: Move the page onto the primitives (`src/app/[locale]/(dashboard)/master-data/suppliers/page.tsx`, CRLF)**

Five exact replacements, top to bottom.

(1) Imports. `MasterDataHeader` goes; `Link` above and `SupplierListView`, `prisma`, the `organization-master-query` and `page-auth` imports stay.

Replace:

```tsx
import { SlidersHorizontal } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { MasterDataHeader } from "@/components/master-data/master-data-layout"
import { SupplierListView } from "@/components/master-data/supplier-list-view"
import { prisma } from "@/lib/db"
```

with:

```tsx
import { redirect } from "next/navigation"
import { Plus, SlidersHorizontal } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { SupplierListView } from "@/components/master-data/supplier-list-view"
import { buttonVariants } from "@/components/ui/button-variants"
import { Field } from "@/components/ui/field"
import { FilterFormActions, FilterPanel } from "@/components/ui/filter-panel"
import { FilterSelect } from "@/components/ui/filter-select"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip } from "@/components/ui/stat-strip"
import { prisma } from "@/lib/db"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
```

(2) After `hasActiveFilters`: the list href, the redirect and the range. `filterLabels` below stays.

Replace:

```tsx
  )
  const filterLabels = {
```

with:

```tsx
  )
  const listHref = (next: Partial<SupplierListState>) => `${basePath}?${buildSupplierQueryString(listState, next)}`
  // A page past the last one (an old link, or the last row of the last page deleted) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listState.pageSize)
  if (suppliers.length === 0 && total > 0 && listState.page > lastPage) {
    redirect(listHref({ page: lastPage }))
  }
  const { start, end, totalPages } = paginationRange(listState.page, listState.pageSize, total)
  const filterLabels = {
```

(3) The root, the header, the strip, the two filter forms and the list view's new props (`pagination`, and the first new labels).

Replace:

```tsx
    <div className="space-y-4">
      <MasterDataHeader
        title={t("title")}
        subtitle={t("subtitle")}
        createHref={createHref}
        createLabel={tCommon("create")}
      />

      <div aria-label={t("summaryLabel")} className="grid auto-cols-[minmax(240px,85%)] grid-flow-col gap-3 overflow-x-auto pb-2 md:grid-flow-row md:grid-cols-2 md:overflow-visible md:pb-0 xl:grid-cols-4">
        <SummaryTile label={t("summaryTotal")} value={summaryTotal} detail={t("summaryWithAssets", { count: summaryWithAssets })} href={basePath} />
        <SummaryTile label={t("summaryAssetLinked")} value={summaryWithAssets} detail={t("summaryAssetLinkedHelp")} href={`${basePath}?${buildSupplierQueryString(listState, { assetUsage: "withAssets", page: 1 })}`} />
        <SummaryTile label={t("summaryWithoutAssets")} value={summaryWithoutAssets} detail={t("summaryWithoutAssetsHelp")} href={`${basePath}?${buildSupplierQueryString(listState, { assetUsage: "withoutAssets", page: 1 })}`} />
        <SummaryTile label={t("summaryWithoutPurchaseDocuments")} value={summaryWithoutPurchaseDocuments} detail={t("summaryWithoutPurchaseDocumentsHelp")} href={`${basePath}?${buildSupplierQueryString(listState, { purchaseDocumentUsage: "withoutPurchaseDocuments", page: 1 })}`} tone={summaryWithoutPurchaseDocuments > 0 ? "warning" : "neutral"} />
      </div>

      <details className="rounded-lg border border-border bg-surface md:hidden" open={hasActiveFilters}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          {t("filtersTitle")}
        </summary>
        <SupplierFilterForm basePath={basePath} current={listState} labels={filterLabels} className="grid gap-3 border-t border-border p-4" />
      </details>

      <div className="hidden rounded-lg border border-border bg-surface p-4 md:block">
        <SupplierFilterForm basePath={basePath} current={listState} labels={filterLabels} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.5fr)_repeat(2,minmax(160px,1fr))_auto]" />
      </div>

      <SupplierListView
        suppliers={suppliers}
        locale={locale}
        current={listState}
        total={total}
        basePath={basePath}
        supplierReturnHref={supplierReturnHref}
        createHref={createHref}
        hasActiveFilters={hasActiveFilters}
        labels={{
```

with:

```tsx
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        actions={
          <Link href={createHref} className={buttonVariants({ size: "md" })}>
            <Plus aria-hidden="true" />
            {tCommon("create")}
          </Link>
        }
      />

      <section aria-label={t("summaryLabel")}>
        <StatStrip
          items={[
            {
              key: "total",
              label: t("summaryTotal"),
              value: formatCount(summaryTotal),
              foot: t("summaryWithAssets", { count: summaryWithAssets }),
              footTitle: t("summaryWithAssets", { count: summaryWithAssets }),
              href: basePath,
            },
            {
              key: "withAssets",
              label: t("summaryAssetLinked"),
              value: formatCount(summaryWithAssets),
              foot: t("summaryAssetLinkedHelp"),
              footTitle: t("summaryAssetLinkedHelp"),
              href: listHref({ assetUsage: "withAssets", page: 1 }),
              current: listState.assetUsage === "withAssets",
            },
            {
              key: "withoutAssets",
              label: t("summaryWithoutAssets"),
              value: formatCount(summaryWithoutAssets),
              foot: t("summaryWithoutAssetsHelp"),
              footTitle: t("summaryWithoutAssetsHelp"),
              href: listHref({ assetUsage: "withoutAssets", page: 1 }),
              current: listState.assetUsage === "withoutAssets",
            },
            {
              key: "withoutPurchaseDocuments",
              label: t("summaryWithoutPurchaseDocuments"),
              value: formatCount(summaryWithoutPurchaseDocuments),
              foot: t("summaryWithoutPurchaseDocumentsHelp"),
              footTitle: t("summaryWithoutPurchaseDocumentsHelp"),
              href: listHref({ purchaseDocumentUsage: "withoutPurchaseDocuments", page: 1 }),
              current: listState.purchaseDocumentUsage === "withoutPurchaseDocuments",
              attention: summaryWithoutPurchaseDocuments > 0,
            },
          ]}
        />
      </section>

      <details className="rounded-lg border border-border bg-surface md:hidden" open={hasActiveFilters}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          {t("filtersTitle")}
        </summary>
        <SupplierFilterForm basePath={basePath} current={listState} labels={filterLabels} hasActiveFilters={hasActiveFilters} className="grid gap-3 border-t border-border p-4" />
      </details>

      <FilterPanel className="hidden md:block">
        <SupplierFilterForm basePath={basePath} current={listState} labels={filterLabels} hasActiveFilters={hasActiveFilters} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.5fr)_repeat(2,minmax(160px,1fr))_auto]" />
      </FilterPanel>

      <SupplierListView
        suppliers={suppliers}
        locale={locale}
        current={listState}
        basePath={basePath}
        supplierReturnHref={supplierReturnHref}
        createHref={createHref}
        hasActiveFilters={hasActiveFilters}
        pagination={
          <Pagination
            page={listState.page}
            totalPages={totalPages}
            previousHref={listHref({ page: listState.page - 1 })}
            nextHref={listHref({ page: listState.page + 1 })}
            pageSize={listState.pageSize}
            pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: listHref({ pageSize: value, page: 1 }) }))}
            labels={{
              navigation: tCommon("pagination"),
              previous: tCommon("previous"),
              next: tCommon("next"),
              pageOf: tCommon("pageOf", { page: listState.page, total: totalPages }),
              range: tCommon("showingRange", { from: formatCount(start), to: formatCount(end), total: formatCount(total) }),
              pageSizeGroup: tCommon("pageSizeLabel"),
              rowsPerPage: tCommon("rowsPerPage"),
            }}
          />
        }
        labels={{
          title: t("title"),
          tableScrollHint: tCommon("tableScrollHint"),
```

(4) The labels the list view no longer reads go, and `moreActionsFor` comes in.

Replace:

```tsx
          delete: tCommon("delete"),
          view: tCommon("view"),
          create: tCommon("create"),
          clearFilters: t("clearFilters"),
          emptyTitle: t("emptyTitle"),
          emptyDescription: t("emptyDescription"),
          filteredEmptyTitle: t("filteredEmptyTitle"),
          filteredEmptyDescription: t("filteredEmptyDescription"),
          rowsPerPage: tCommon("rowsPerPage"),
          page: tCommon("page"),
          of: tCommon("of"),
          previous: tCommon("previous"),
          next: tCommon("next"),
```

with:

```tsx
          view: tCommon("view"),
          create: tCommon("create"),
          clearFilters: t("clearFilters"),
          emptyTitle: t("emptyTitle"),
          emptyDescription: t("emptyDescription"),
          filteredEmptyTitle: t("filteredEmptyTitle"),
          filteredEmptyDescription: t("filteredEmptyDescription"),
          moreActionsFor: (code) => tCommon("moreActionsFor", { code }),
```

(5) `SupplierFilterForm` on the shared fields; the local `FilterSelect` and `SummaryTile` go. `type FilterLabels` above it stays. The file keeps one line break at its end.

Replace:

```tsx
function SupplierFilterForm({ basePath, current, labels, className }: { basePath: string; current: SupplierListState; labels: FilterLabels; className: string }) {
  const controlClassName = "min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
  return (
    <form className={className} action={basePath}>
      <input type="hidden" name="page" value="1" />
      <input type="hidden" name="pageSize" value={current.pageSize} />
      <input type="hidden" name="sort" value={current.sort} />
      <input type="hidden" name="direction" value={current.direction} />
      <label className="space-y-1 text-sm font-medium text-foreground">
        <span>{labels.search}</span>
        <input type="search" name="search" defaultValue={current.search} placeholder={labels.searchPlaceholder} className={controlClassName} />
      </label>
      <FilterSelect label={labels.assetUsage} name="assetUsage" defaultValue={current.assetUsage} className={controlClassName}>
        <option value="all">{labels.all}</option>
        <option value="withAssets">{labels.withAssets}</option>
        <option value="withoutAssets">{labels.withoutAssets}</option>
      </FilterSelect>
      <FilterSelect label={labels.purchaseDocumentUsage} name="purchaseDocumentUsage" defaultValue={current.purchaseDocumentUsage} className={controlClassName}>
        <option value="all">{labels.all}</option>
        <option value="withPurchaseDocuments">{labels.withPurchaseDocuments}</option>
        <option value="withoutPurchaseDocuments">{labels.withoutPurchaseDocuments}</option>
      </FilterSelect>
      <div className="grid grid-cols-2 items-end gap-2 md:flex">
        <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{labels.filter}</button>
        <Link href={basePath} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{labels.clear}</Link>
      </div>
    </form>
  )
}

function FilterSelect({ label, name, defaultValue, className, children }: { label: string; name: string; defaultValue: string; className: string; children: React.ReactNode }) {
  return <label className="space-y-1 text-sm font-medium text-foreground"><span>{label}</span><select name={name} defaultValue={defaultValue} className={className}>{children}</select></label>
}

function SummaryTile({ label, value, detail, href, tone = "neutral" }: { label: string; value: number; detail: string; href: string; tone?: "neutral" | "warning" }) {
  return (
    <Link href={href} className={`min-h-32 rounded-lg border bg-surface p-4 transition-colors hover:border-primary-border hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tone === "warning" ? "border-warning-border" : "border-border"}`}>
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-bold text-foreground">{value.toLocaleString()}</div>
      <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
    </Link>
  )
}
```

with:

```tsx
// Rendered twice: in the phone disclosure and in the desktop panel. Field gives each copy its own ids (useId), and
// the copy that is display: none leaves the accessibility tree, so the page keeps one search landmark (spec 2B §6.2 6-ช).
function SupplierFilterForm({
  basePath,
  current,
  labels,
  hasActiveFilters,
  className,
}: {
  basePath: string
  current: SupplierListState
  labels: FilterLabels
  hasActiveFilters: boolean
  className: string
}) {
  return (
    <form role="search" className={className} action={basePath}>
      <input type="hidden" name="page" value="1" />
      <input type="hidden" name="pageSize" value={current.pageSize} />
      <input type="hidden" name="sort" value={current.sort} />
      <input type="hidden" name="direction" value={current.direction} />
      <Field label={labels.search}>
        <SearchField name="search" defaultValue={current.search} placeholder={labels.searchPlaceholder} />
      </Field>
      <FilterSelect label={labels.assetUsage} name="assetUsage" defaultValue={current.assetUsage}>
        <option value="all">{labels.all}</option>
        <option value="withAssets">{labels.withAssets}</option>
        <option value="withoutAssets">{labels.withoutAssets}</option>
      </FilterSelect>
      <FilterSelect label={labels.purchaseDocumentUsage} name="purchaseDocumentUsage" defaultValue={current.purchaseDocumentUsage}>
        <option value="all">{labels.all}</option>
        <option value="withPurchaseDocuments">{labels.withPurchaseDocuments}</option>
        <option value="withoutPurchaseDocuments">{labels.withoutPurchaseDocuments}</option>
      </FilterSelect>
      <FilterFormActions submitLabel={labels.filter} clear={hasActiveFilters ? { href: basePath, label: labels.clear } : undefined} />
    </form>
  )
}
```

- [ ] **Step 5: Move the list view onto the primitives (`src/components/master-data/supplier-list-view.tsx`, CRLF), and delete the wrapper**

Three exact replacements, top to bottom. `SupplierListItem` and `buildSupplierRowHrefs` stay.

(1) Imports. `Link` above and the `master-data-return-navigation` and `organization-master-query` imports below stay.

Replace:

```tsx
import { ArrowDown, ArrowUp, Edit, Eye } from "lucide-react"
import { SupplierDeleteButton } from "@/components/master-data/supplier-delete-button"
import { ColumnHeader } from "@/components/master-data/master-data-layout"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { paginationRange } from "@/lib/master-data-query"
```

with:

```tsx
import { Pencil } from "lucide-react"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, type DataTableSort } from "@/components/ui/data-table"
import { orNil } from "@/components/ui/nil"
import { RowActions } from "@/components/ui/row-actions"
import { formatCount } from "@/lib/display-format"
```

(2) The labels type and the component.

Replace:

```tsx
  code: string
  name: string
  contactPerson: string
  phone: string
  email: string
  assets: string
  purchaseDocuments: string
  maintenanceTickets: string
  actions: string
  edit: string
  delete: string
  view: string
  create: string
  clearFilters: string
  emptyTitle: string
  emptyDescription: string
  filteredEmptyTitle: string
  filteredEmptyDescription: string
  rowsPerPage: string
  page: string
  of: string
  previous: string
  next: string
}

export function SupplierListView({
  suppliers,
  locale,
  current,
  total,
  basePath,
  supplierReturnHref,
  createHref,
  hasActiveFilters,
  labels,
}: {
  suppliers: SupplierListItem[]
  locale: string
  current: SupplierListState
  total: number
  basePath: string
  supplierReturnHref: string
  createHref: string
  hasActiveFilters: boolean
  labels: SupplierListLabels
}) {
  if (suppliers.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        <ActionEmptyState
          title={hasActiveFilters ? labels.filteredEmptyTitle : labels.emptyTitle}
          description={hasActiveFilters ? labels.filteredEmptyDescription : labels.emptyDescription}
          actionHref={hasActiveFilters ? basePath : createHref}
          actionLabel={hasActiveFilters ? labels.clearFilters : labels.create}
        />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div data-supplier-desktop-table className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/40">
            <tr>
              <SupplierSortableColumnHeader field="code" current={current} basePath={basePath}>{labels.code}</SupplierSortableColumnHeader>
              <SupplierSortableColumnHeader field="name" current={current} basePath={basePath}>{labels.name}</SupplierSortableColumnHeader>
              <SupplierSortableColumnHeader field="contactPerson" current={current} basePath={basePath}>{labels.contactPerson}</SupplierSortableColumnHeader>
              <SupplierSortableColumnHeader field="phone" current={current} basePath={basePath}>{labels.phone}</SupplierSortableColumnHeader>
              <SupplierSortableColumnHeader field="email" current={current} basePath={basePath}>{labels.email}</SupplierSortableColumnHeader>
              <SupplierSortableColumnHeader field="assets" current={current} basePath={basePath}>{labels.assets}</SupplierSortableColumnHeader>
              <SupplierSortableColumnHeader field="purchaseDocuments" current={current} basePath={basePath}>{labels.purchaseDocuments}</SupplierSortableColumnHeader>
              <ColumnHeader>{labels.maintenanceTickets}</ColumnHeader>
              <ColumnHeader align="right">{labels.actions}</ColumnHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {suppliers.map((supplier) => {
              const hrefs = buildSupplierRowHrefs({ supplier, locale, supplierReturnHref })
              return (
                <ClickableTableRow key={supplier.id} href={hrefs.detail} label={`${labels.view}: ${supplier.code}`}>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{supplier.code}</td>
                  <td className="min-w-56 px-4 py-3 text-foreground">
                    <div className="font-medium">{supplier.name}</div>
                    {supplier.address ? <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{supplier.address}</div> : null}
                  </td>
                  <td className="min-w-44 px-4 py-3 text-muted-foreground">{supplier.contactPerson || "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{supplier.phone || "-"}</td>
                  <td className="min-w-56 px-4 py-3 text-muted-foreground">{supplier.email || "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {supplier._count.assets > 0 ? (
                      <Link href={hrefs.assets} aria-label={`${labels.assets}: ${supplier._count.assets}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        {supplier._count.assets.toLocaleString()}
                      </Link>
                    ) : "0"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{supplier._count.purchaseDocuments.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{supplier._count.maintenanceTickets.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Link href={hrefs.edit} aria-label={`${labels.edit}: ${supplier.name}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <Edit className="h-4 w-4" aria-hidden="true" />
                      </Link>
                      <SupplierDeleteButton id={supplier.id} />
                    </div>
                  </td>
                </ClickableTableRow>
              )
            })}
          </tbody>
        </table>
      </div>

      <div data-supplier-mobile-list className="grid gap-3 bg-background p-3 md:hidden">
        {suppliers.map((supplier) => {
          const hrefs = buildSupplierRowHrefs({ supplier, locale, supplierReturnHref })
          return (
            <article key={supplier.id} className="rounded-lg border border-border bg-surface p-4">
              <Link href={hrefs.detail} className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="text-xs font-medium text-muted-foreground">{supplier.code}</div>
                <h2 className="mt-1 break-words text-base font-semibold text-primary">{supplier.name}</h2>
                {supplier.address ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{supplier.address}</p> : null}
              </Link>

              <dl className="mt-4 grid gap-3 text-sm">
                <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                  <dt className="text-muted-foreground">{labels.contactPerson}</dt>
                  <dd className="break-words text-foreground">{supplier.contactPerson || "-"}</dd>
                </div>
                <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                  <dt className="text-muted-foreground">{labels.phone}</dt>
                  <dd className="break-words text-foreground">{supplier.phone || "-"}</dd>
                </div>
              </dl>

              <div className="mt-4 grid grid-cols-3 gap-2 border-y border-border py-3 text-center">
                <RelationshipCount label={labels.assets} value={supplier._count.assets} href={supplier._count.assets > 0 ? hrefs.assets : undefined} />
                <RelationshipCount label={labels.purchaseDocuments} value={supplier._count.purchaseDocuments} />
                <RelationshipCount label={labels.maintenanceTickets} value={supplier._count.maintenanceTickets} />
              </div>

              <div className="mt-3 flex items-center justify-end gap-1">
                <Link href={hrefs.detail} aria-label={`${labels.view}: ${supplier.name}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Eye className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href={hrefs.edit} aria-label={`${labels.edit}: ${supplier.name}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Edit className="h-4 w-4" aria-hidden="true" />
                </Link>
                <SupplierDeleteButton id={supplier.id} />
              </div>
            </article>
          )
        })}
      </div>

      <SupplierPagination current={current} total={total} basePath={basePath} labels={labels} />
```

with:

```tsx
  title: string
  tableScrollHint: string
  code: string
  name: string
  contactPerson: string
  phone: string
  email: string
  assets: string
  purchaseDocuments: string
  maintenanceTickets: string
  actions: string
  edit: string
  view: string
  create: string
  clearFilters: string
  emptyTitle: string
  emptyDescription: string
  filteredEmptyTitle: string
  filteredEmptyDescription: string
  // tCommon("moreActionsFor", { code }). This is a server component called by a server page, so a function can pass.
  moreActionsFor: (code: string) => string
}

export function SupplierListView({
  suppliers,
  locale,
  current,
  basePath,
  supplierReturnHref,
  createHref,
  hasActiveFilters,
  pagination,
  labels,
}: {
  suppliers: SupplierListItem[]
  locale: string
  current: SupplierListState
  basePath: string
  supplierReturnHref: string
  createHref: string
  hasActiveFilters: boolean
  // The page's <Pagination>, shown once under both the table and the phone cards (spec 2B §5.1).
  pagination: React.ReactNode
  labels: SupplierListLabels
}) {
  if (suppliers.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        <ActionEmptyState
          title={hasActiveFilters ? labels.filteredEmptyTitle : labels.emptyTitle}
          description={hasActiveFilters ? labels.filteredEmptyDescription : labels.emptyDescription}
          actionHref={hasActiveFilters ? basePath : createHref}
          actionLabel={hasActiveFilters ? labels.clearFilters : labels.create}
          actionVariant={hasActiveFilters ? "secondary" : "primary"}
        />
      </div>
    )
  }

  const sortBy = (field: SupplierSort): DataTableSort => ({
    href: `${basePath}?${buildSupplierQueryString(current, { sort: field, direction: current.sort === field && current.direction === "asc" ? "desc" : "asc", page: 1 })}`,
    direction: current.sort === field ? current.direction : null,
  })

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <DataTable data-supplier-desktop-table framed={false} className="hidden md:block" caption={labels.title} scrollHint={labels.tableScrollHint}>
        <DataTableHeader>
          <tr>
            <DataTableHead sort={sortBy("code")}>{labels.code}</DataTableHead>
            <DataTableHead sort={sortBy("name")}>{labels.name}</DataTableHead>
            <DataTableHead sort={sortBy("contactPerson")}>{labels.contactPerson}</DataTableHead>
            <DataTableHead sort={sortBy("phone")}>{labels.phone}</DataTableHead>
            <DataTableHead sort={sortBy("email")}>{labels.email}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("assets")}>{labels.assets}</DataTableHead>
            <DataTableHead align="right" sort={sortBy("purchaseDocuments")}>{labels.purchaseDocuments}</DataTableHead>
            <DataTableHead align="right">{labels.maintenanceTickets}</DataTableHead>
            <DataTableHead align="right" hideLabel>{labels.actions}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {suppliers.map((supplier) => {
            const hrefs = buildSupplierRowHrefs({ supplier, locale, supplierReturnHref })
            return (
              <ClickableTableRow key={supplier.id} href={hrefs.detail} label={`${labels.view}: ${supplier.code}`}>
                <DataTableCell className="whitespace-nowrap">
                  <span className="tag font-medium text-foreground">{supplier.code}</span>
                </DataTableCell>
                <DataTableCell className="min-w-56 text-foreground">
                  <div className="font-medium">{supplier.name}</div>
                  {supplier.address ? <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{supplier.address}</div> : null}
                </DataTableCell>
                <DataTableCell className="min-w-44 text-muted-foreground">{orNil(supplier.contactPerson)}</DataTableCell>
                <DataTableCell className="whitespace-nowrap text-muted-foreground">{orNil(supplier.phone)}</DataTableCell>
                <DataTableCell className="min-w-56 text-muted-foreground">{orNil(supplier.email)}</DataTableCell>
                <DataTableCell numeric className="text-muted-foreground">
                  {supplier._count.assets > 0 ? (
                    <Link href={hrefs.assets} aria-label={`${labels.assets}: ${formatCount(supplier._count.assets)}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {formatCount(supplier._count.assets)}
                    </Link>
                  ) : <span className="px-2">{formatCount(0)}</span>}
                </DataTableCell>
                <DataTableCell numeric className="text-muted-foreground">{formatCount(supplier._count.purchaseDocuments)}</DataTableCell>
                <DataTableCell numeric className="text-muted-foreground">{formatCount(supplier._count.maintenanceTickets)}</DataTableCell>
                <DataTableCell align="right">
                  <RowActions
                    code={supplier.code}
                    name={supplier.name}
                    menuLabel={labels.moreActionsFor(supplier.code)}
                    next={{ label: labels.edit, href: hrefs.edit, icon: <Pencil aria-hidden="true" /> }}
                    groups={[]}
                    deleteAction={{ endpoint: `/api/suppliers/${supplier.id}` }}
                  />
                </DataTableCell>
              </ClickableTableRow>
            )
          })}
        </DataTableBody>
      </DataTable>

      <div data-supplier-mobile-list className="grid gap-3 bg-background p-3 md:hidden">
        {suppliers.map((supplier) => {
          const hrefs = buildSupplierRowHrefs({ supplier, locale, supplierReturnHref })
          return (
            <article key={supplier.id} className="rounded-lg border border-border bg-surface p-4">
              <Link href={hrefs.detail} className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="text-xs text-muted-foreground">
                  <span className="tag font-medium">{supplier.code}</span>
                </div>
                <h2 className="mt-1 break-words text-base font-semibold text-primary">{supplier.name}</h2>
                {supplier.address ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{supplier.address}</p> : null}
              </Link>

              <dl className="mt-4 grid gap-3 text-sm">
                <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                  <dt className="text-muted-foreground">{labels.contactPerson}</dt>
                  <dd className="break-words text-foreground">{orNil(supplier.contactPerson)}</dd>
                </div>
                <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2">
                  <dt className="text-muted-foreground">{labels.phone}</dt>
                  <dd className="break-words text-foreground">{orNil(supplier.phone)}</dd>
                </div>
              </dl>

              <div className="mt-4 grid grid-cols-3 gap-2 border-y border-border py-3 text-center">
                <RelationshipCount label={labels.assets} value={supplier._count.assets} href={supplier._count.assets > 0 ? hrefs.assets : undefined} />
                <RelationshipCount label={labels.purchaseDocuments} value={supplier._count.purchaseDocuments} />
                <RelationshipCount label={labels.maintenanceTickets} value={supplier._count.maintenanceTickets} />
              </div>

              <RowActions
                className="mt-3"
                code={supplier.code}
                name={supplier.name}
                menuLabel={labels.moreActionsFor(supplier.code)}
                next={{ label: labels.edit, href: hrefs.edit, icon: <Pencil aria-hidden="true" /> }}
                groups={[]}
                deleteAction={{ endpoint: `/api/suppliers/${supplier.id}` }}
              />
            </article>
          )
        })}
      </div>

      <DataTableFoot>{pagination}</DataTableFoot>
```

(3) `RelationshipCount` on `formatCount`; `SupplierSortableColumnHeader` and `SupplierPagination` go. The file keeps one line break at its end.

Replace:

```tsx
  const content = <><span className="block text-base font-semibold text-foreground">{value.toLocaleString()}</span><span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">{label}</span></>
  return href ? <Link href={href} aria-label={`${label}: ${value}`} className="min-h-11 rounded-md px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{content}</Link> : <div className="min-h-11 px-1 py-1">{content}</div>
}

function SupplierSortableColumnHeader({ children, field, current, basePath }: { children: React.ReactNode; field: SupplierSort; current: SupplierListState; basePath: string }) {
  const active = current.sort === field
  const nextDirection = active && current.direction === "asc" ? "desc" : "asc"
  const href = `${basePath}?${buildSupplierQueryString(current, { sort: field, direction: nextDirection, page: 1 })}`
  return (
    <th scope="col" aria-sort={active ? (current.direction === "asc" ? "ascending" : "descending") : undefined} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">
      <Link href={href} className="inline-flex min-h-11 items-center gap-1 rounded-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {children}
        {active ? current.direction === "asc" ? <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      </Link>
    </th>
  )
}

function SupplierPagination({ current, total, basePath, labels }: { current: SupplierListState; total: number; basePath: string; labels: Pick<SupplierListLabels, "rowsPerPage" | "page" | "of" | "previous" | "next"> }) {
  const { start, end, totalPages } = paginationRange(current.page, current.pageSize, total)
  const previousPage = Math.max(1, current.page - 1)
  const nextPage = Math.min(totalPages, current.page + 1)
  const targetClassName = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  return (
    <nav aria-label={`${labels.page} ${current.page} ${labels.of} ${totalPages}`} className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
      <div>{start}-{end} {labels.of} {total}</div>
      <div className="flex flex-wrap items-center gap-2">
        <span>{labels.rowsPerPage}</span>
        {[25, 50, 100].map((pageSize) => <Link key={pageSize} href={`${basePath}?${buildSupplierQueryString(current, { pageSize, page: 1 })}`} aria-current={current.pageSize === pageSize ? "page" : undefined} className={`${targetClassName} ${current.pageSize === pageSize ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface hover:bg-accent"}`}>{pageSize}</Link>)}
        <span className="w-full sm:w-auto sm:px-2">{labels.page} {current.page} {labels.of} {totalPages}</span>
        {current.page <= 1 ? <span aria-disabled="true" className={`${targetClassName} cursor-not-allowed border-border opacity-50`}>{labels.previous}</span> : <Link href={`${basePath}?${buildSupplierQueryString(current, { page: previousPage })}`} className={`${targetClassName} border-border hover:bg-accent`}>{labels.previous}</Link>}
        {current.page >= totalPages ? <span aria-disabled="true" className={`${targetClassName} cursor-not-allowed border-border opacity-50`}>{labels.next}</span> : <Link href={`${basePath}?${buildSupplierQueryString(current, { page: nextPage })}`} className={`${targetClassName} border-border hover:bg-accent`}>{labels.next}</Link>}
      </div>
    </nav>
  )
}
```

with:

```tsx
  const content = <><span className="block text-base font-semibold text-foreground">{formatCount(value)}</span><span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">{label}</span></>
  return href ? <Link href={href} aria-label={`${label}: ${formatCount(value)}`} className="min-h-11 rounded-md px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{content}</Link> : <div className="min-h-11 px-1 py-1">{content}</div>
}
```

Check: `grep -n "^function\|toLocaleString\|\"-\"\|<select\|<input type=\"search\"\|<table\|<thead\|colSpan\|MasterDataHeader\|DeleteButton\|opacity-" "src/app/[locale]/(dashboard)/master-data/suppliers/page.tsx" src/components/master-data/supplier-list-view.tsx` prints exactly the three helpers that stay:
```
src/app/[locale]/(dashboard)/master-data/suppliers/page.tsx:232:function SupplierFilterForm({
src/components/master-data/supplier-list-view.tsx:202:function buildSupplierRowHrefs({ supplier, locale, supplierReturnHref }: { supplier: SupplierListItem; locale: string; supplierReturnHref: string }) {
src/components/master-data/supplier-list-view.tsx:211:function RelationshipCount({ label, value, href }: { label: string; value: number; href?: string }) {
```

Run: `git rm src/components/master-data/supplier-delete-button.tsx` then `git grep -n "supplier-delete-button\|SupplierDeleteButton" -- src`
Expected: `rm 'src/components/master-data/supplier-delete-button.tsx'`, then no output (exit 1).

- [ ] **Step 6: Run the tests for this task**

Run: `node --test tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/master-data-return-navigation.test.ts tests/master-data-brand-supplier-ui.test.ts tests/master-data-workspace.test.ts tests/confirm-dialog-ui.test.ts tests/row-actions-ui.test.ts tests/list-primitives-ui.test.ts tests/form-migration-guards.test.ts tests/supplier-adaptive-ui.test.ts tests/supplier-form-ui.test.ts tests/supplier-detail-ui.test.ts tests/asset-register-building-blocks-ui.test.ts`
Expected: PASS, `tests 138 · pass 138 · fail 0` (the 118 of Task 18 Step 6, this task's list-pages-ui test, and 7 + 5 + 3 + 4 in the four supplier and building-block files).

Run: `node <temp>/p2b1-precheck.mjs --file D/master-data/suppliers/page.tsx`, the same for `c/master-data/supplier-list-view.tsx`, then `node <temp>/p2b1-precheck.mjs --budgets`
Expected: both files `· in MIGRATED_LIST_FILES` with `args    (no row holds this file)`; then exit 0 with `R7 TABLE_HEADER_FILLS 36 in 23 rows`, `LR1 BUDGETS.LR1 0 in 0 rows` and `budgets hold: no live count is over its row`.

- [ ] **Step 7: Prove every class compiles**

Run: `node <temp>/p2b1-tw-probe.mjs "src/app/[locale]/(dashboard)/master-data/suppliers/page.tsx" src/components/master-data/supplier-list-view.tsx`
Expected: `checked 61 classes, missing 0`. No class is new to `src`.

- [ ] **Step 8: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 0 fail and 1 more test than before Step 2 (the block of Step 2 (b)); tsc no errors; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 7 files in `git diff --stat`: the page 119 insertions and 51 deletions, the list view 88 and 111, `tests/supplier-adaptive-ui.test.ts` 13 and 10, `tests/list-pages-ui.test.ts` 25 insertions, `tests/list-filters-ui.test.ts` 1 insertion, `tests/list-frame-guards.test.ts` 2 and 14, `tests/visual-foundation-guards.test.ts` 1 deletion; `git status` also lists the wrapper as `D `. The three CRLF files stay CRLF.

- [ ] **Step 9: Commit**

```bash
git add "src/app/[locale]/(dashboard)/master-data/suppliers/page.tsx" src/components/master-data/supplier-list-view.tsx tests/supplier-adaptive-ui.test.ts tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): suppliers list and cards on DataTable, RowActions, StatStrip and the shared filters (2B-1 task 20)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 8 files in the commit (7 modified, 1 deleted). `git status --short src tests messages` prints nothing.

**For the plan 2B-1 dev-app check (Task 25, spec §10.5 and its axe row `/th/master-data/suppliers` at 375 and 1440):** at 375 the strip is 2×2, the disclosure opens with a filter on, each card ends with "แก้ไข" and ⋯ (the sheet shows the code as its title and "ลบ"; cancel at the confirm), tapping the code or the name opens the supplier, and the foot sits once under the cards; at 768 and 1024 the scroll hint shows only while the table overflows and the scroller takes Tab (`role="region"` named "ผู้ขาย"); at 1440 ⋯ and "แก้ไข" do not open the detail page and the row does; the accessibility tree has one search landmark at each width; axe reports no duplicate id and no `label` issue.

---

### Task 21: `D/admin/users/page.tsx` on the list primitives, with "แก้ไข" as the only row command and the floating create button kept (R-q)

Spec §10.3 row 21, with §5.3 row "admin/users", §4.4.2 row `D/admin/users/page.tsx:76`, rulings I5, I21, I33 and R-h, R-n, R-p, R-q. One page, one commit, no wrapper. The page is CRLF. Task 13's shape applies; this lists only what differs.

Rulings this task applies:
- **§5.3, I5:** the row's 32px outline "แก้ไข" link becomes `RowActions` with `next` = "แก้ไข" to `editHref` (now a constant in the row, the same `${basePath}/${user.id}/edit` the row opens) and `groups={[]}`, with no `deleteAction`: users have no other row command, so `RowActions` draws no ⋯ and leaves an empty 44px/32px slot (Task 7's caller contract). `menuLabel={tCommon("moreActionsFor", { code: user.username })}` is still passed (the prop is required); `code` = the username, `name` = the display name. The `MASTER_DATA_LISTS` line is `deleteEndpoints: [], removedWrappers: []` (Task 13).
- **R-q:** the floating create button (`fixed bottom-6 right-6 … shadow-lg`) stays as it is until 2D, with its VFG R2 row (`p2b-budget.mjs` does not edit R2).
- **I1, §4.4.2:** the hand-written `h1` and subtitle become `<PageHeader title={t("title")} meta={t("subtitle")} />`, without actions (the create button floats). The root already is `space-y-6`.
- **`MasterDataSearch`** stays the page's search toolbar (frameless since Task 12) with its `hiddenInputs` unchanged. It is not a filter form of the page, so the page does not join `MIGRATED_FILTER_FILES` (§6.13 table B item 5 lists 8 files for 2B-1).
- **§5.1:** the 4 sortable heads use `sortBy` over `buildMasterDataQueryString` (the hrefs of the shared `SortableColumnHeader`). After this task `SortableColumnHeader` and `MasterDataPagination` have no caller left in `src/app`; 2B-5 deletes them with `MasterDataHeader` (R-h, spec §8.13 item 6).
- **R-n, R-p:** `user.email ?? "-"` → `orNil(user.email)`; the employee cell's `: "-"` → `<Nil />` and its code an inner `tag`; a user with no role shows `<Nil />` instead of a grey "-"; the username is `tag font-medium text-foreground`. **Ruling (small, the same rule):** a user who never signed in shows `<Nil />` instead of the "-" that `formatDateTime(null)` returns (`src/lib/utils.ts` keeps its "-", R-n).
- **Empty row:** the one-line `tCommon("noData")`, as on departments (Task 17): there is no filter panel and no "clear" key in `adminUsersPage`, and the search box above the table keeps the term.
- The role pills, the active and inactive pills and `ActiveBadge` stay (2D, §5.1).
- **Ruling (test):** besides the `MASTER_DATA_LISTS` line, this task appends a test for what is particular to this page: no `deleteAction`, `groups={[]}` right after `next`, the header without actions, the floating button and the search `hiddenInputs`.

What users will see on `/th/admin/users`: the title is weight 600 and the subtitle 13px; the table, the foot and the scroll hint as on branches (Task 13); usernames and employee codes in monospace; "—" for an empty email, employee, role list or last sign-in; each row ends with "แก้ไข" (120px) and no ⋯. The search toolbar and the floating "เพิ่มผู้ใช้" button do not change.

Not in this task: the user form (Task 22) · the role and status pills and the floating button (2D, R-q) · `MasterDataSearch` and the shared helpers in `master-data-layout.tsx` (2B-5 deletes the last three) · messages · docs.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/admin/users/page.tsx` (CRLF, 4 exact replacements)
- Modify: `tests/list-pages-ui.test.ts` (LF, 1 replacement and one block appended)
- Modify: `tests/list-frame-guards.test.ts`, `tests/visual-foundation-guards.test.ts` (through `p2b-budget.mjs` only)
- Temp folder only: `t21-pages-block.ts`

**Must keep passing without edits:** VFG `R2 only floating layers, camera controls and paper previews cast a shadow` (the floating button's row stays 1) · `tests/mobile-field-navigation.test.ts` (`/th/admin/users` stays a navigation route; `/new` and `/edit` stay focus routes) · `tests/operational-return-navigation.test.ts` and `tests/audit-pending-mobile-ux.test.ts` (the other `MasterDataSearch` callers, I17) · `tests/admin-user-routes.test.ts` · the other tests of Task 18 Step 6.

**Interfaces:**
- Consumes: what Task 13 consumes except the filter parts, `StatStrip`, `Field`, `SearchField` and `buttonVariants`; `MasterDataSearch` and `ActiveBadge` (Task 12); `buildMasterDataQueryString`, `paginationRange`, `parseMasterDataListParams`, `type MasterDataListState` (unchanged); `tests/list-pages-ui.test.ts` with `MASTER_DATA_LISTS` ending with the locations line (Task 19); `p2b1-t1821-precheck.mjs` (Task 18).
- Produces: the users line in `MASTER_DATA_LISTS` and the test `users: edit is the row's only command, …`; no LFG row and no VFG R7 row for the page (its R2 row stays); the page in `MIGRATED_LIST_FILES`.

| guard | `D/admin/users/page.tsx` before → after |
|---|---|
| VFG R7 · R2 | 1 → – · 1 (kept, R-q) |
| LFG | LH1 1 · LT3 1 · LV2 2 → all – · joins `MIGRATED_LIST_FILES` |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b1-t1821-precheck.mjs 21`
Expected: `git status` prints nothing; the nine `ok` lines for Tasks 1–12 and the keys, then `ok` for the page (`hash 24d11d7cac827de4`), the two test-file lines and `preconditions hold for Task 21`. On any `MISSING` line, stop and report it.

Run: `node <temp>/p2b1-precheck.mjs --file D/admin/users/page.tsx`
Expected (exit 0, after the header lines):
```
file    src/app/[locale]/(dashboard)/admin/users/page.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
R7         1       1     0     1
R2         1       –     –     1
LH1        1       1     0     1
LT3        1       1     0     1
LV2        2       2     0     2
args    R7=1:1 LH1=1:1 LT3=1:1 LV2=2:2
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```
R2 has no budget column: VFG's R2 budget is an inline object that `p2b-budget.mjs` does not edit, and this task leaves it as it is.

- [ ] **Step 2: The failing tests**

(a) `tests/list-pages-ui.test.ts`: add the users line. Replace:

```ts
  { path: `${D}master-data/locations/page.tsx`, deleteEndpoints: ["/api/locations/${location.id}"], removedWrappers: [`${C}master-data/location-delete-button.tsx`], stats: true },
]
```

with:

```ts
  { path: `${D}master-data/locations/page.tsx`, deleteEndpoints: ["/api/locations/${location.id}"], removedWrappers: [`${C}master-data/location-delete-button.tsx`], stats: true },
  { path: `${D}admin/users/page.tsx`, deleteEndpoints: [], removedWrappers: [], stats: false },
]
```

(b) Save this block as `t21-pages-block.ts` in your temp folder, then run `node <temp>/p2b1-append.mjs <temp>/t21-pages-block.ts tests/list-pages-ui.test.ts`:

```ts
test("users: edit is the row's only command, so RowActions draws no ⋯, and the floating create button stays (spec 2B §5.3, R-q)", () => {
  const source = read(`${D}admin/users/page.tsx`)
  assert.match(source, /next=\{\{ label: tCommon\("edit"\), href: editHref, icon: <Pencil aria-hidden="true" \/> \}\}\n\s+groups=\{\[\]\}\n\s+\/>/)
  assert.doesNotMatch(source, /deleteAction=/)
  assert.match(source, /<PageHeader title=\{t\("title"\)\} meta=\{t\("subtitle"\)\} \/>/)
  assert.match(source, /className="fixed bottom-6 right-6 [^"]*shadow-lg/, "R-q: phase 2D moves the floating button")
  assert.match(source, /hiddenInputs=\{\{ pageSize: listState\.pageSize, sort: listState\.sort, direction: listState\.direction \}\}/)
})
```

Run: `node --test tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts`
Expected: FAIL, `tests 10 · pass 7 · fail 3`: `master-data lists build on …` (`src/app/[locale]/(dashboard)/admin/users/page.tsx: no <PageHeader`), `a master-data list past its last page …` (message `src/app/[locale]/(dashboard)/admin/users/page.tsx`) and `users: edit is the row's only command, …` (no match for the `next` regex). The other page tests and the three `list-filters-ui` tests pass.

- [ ] **Step 3: Lower the guard rows of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs D/admin/users/page.tsx R7=1:0 LH1=1:0 LT3=1:0 LV2=2:0 --migrated`
Expected (exit 0):
```
R7: 1 -> 0 (row deleted)
LH1: 1 -> 0 (row deleted)
LT3: 1 -> 0 (row deleted)
LV2: 2 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/admin/users/page.tsx
```

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 42 · fail 5`: LFG LH1 (`59 in 59 files`), LT3 (`9 in 8`) and LV2 (`115 in 36`), each listing only the users page (`: 2 > 0` for LV2, `: 1 > 0` for the others), and `L0` with the same 3 lines; VFG R7 with `36 matches in 23 files; over budget:` and `src/app/[locale]/(dashboard)/admin/users/page.tsx: 1 > 0`. VFG R2 passes.

- [ ] **Step 4: Move the page onto the primitives (`src/app/[locale]/(dashboard)/admin/users/page.tsx`, CRLF)**

Four exact replacements, top to bottom. Make all four before you compile.

(1) `redirect` and `Pencil` come in; `Edit` goes.

Replace:

```tsx
import { Edit, Plus } from "lucide-react"
```

with:

```tsx
import { redirect } from "next/navigation"
import { Pencil, Plus } from "lucide-react"
```

(2) `ColumnHeader`, `MasterDataPagination` and `SortableColumnHeader` go; the primitives and the page helpers come in. `ClickableTableRow` below stays.

Replace:

```tsx
  ColumnHeader,
  MasterDataPagination,
  MasterDataSearch,
  SortableColumnHeader,
} from "@/components/master-data/master-data-layout"
import { formatDateTime } from "@/lib/utils"
import { parseMasterDataListParams } from "@/lib/master-data-query"
```

with:

```tsx
  MasterDataSearch,
} from "@/components/master-data/master-data-layout"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, TableEmptyRow, type DataTableSort } from "@/components/ui/data-table"
import { Nil, orNil } from "@/components/ui/nil"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { formatDateTime } from "@/lib/utils"
import { buildMasterDataQueryString, paginationRange, parseMasterDataListParams, type MasterDataListState } from "@/lib/master-data-query"
```

(3) After `basePath`: the list href, the redirect, the range and the sort heads; then the header.

Replace:

```tsx
  const basePath = `/${locale}/admin/users`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
```

with:

```tsx
  const basePath = `/${locale}/admin/users`
  const listHref = (next: Partial<MasterDataListState<UserSort>>) => `${basePath}?${buildMasterDataQueryString(listState, next)}`
  // A page past the last one (an old link, or a search that now finds fewer users) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listState.pageSize)
  if (users.length === 0 && total > 0 && listState.page > lastPage) {
    redirect(listHref({ page: lastPage }))
  }
  const { start, end, totalPages } = paginationRange(listState.page, listState.pageSize, total)

  const sortBy = (field: UserSort): DataTableSort => ({
    href: listHref({ sort: field, direction: listState.sort === field && listState.direction === "asc" ? "desc" : "asc", page: 1 }),
    direction: listState.sort === field ? listState.direction : null,
  })

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} meta={t("subtitle")} />
```

(4) The table and its pager. `MasterDataSearch` above and the floating create button below stay.

Replace:

```tsx
      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <SortableColumnHeader field="username" current={listState} basePath={basePath}>{t("username")}</SortableColumnHeader>
                <SortableColumnHeader field="displayName" current={listState} basePath={basePath}>{t("displayName")}</SortableColumnHeader>
                <SortableColumnHeader field="email" current={listState} basePath={basePath}>{t("email")}</SortableColumnHeader>
                <ColumnHeader>{t("employee")}</ColumnHeader>
                <ColumnHeader>{t("roles")}</ColumnHeader>
                <ColumnHeader>{tCommon("status")}</ColumnHeader>
                <SortableColumnHeader field="lastLoginAt" current={listState} basePath={basePath}>{t("lastLoginAt")}</SortableColumnHeader>
                <ColumnHeader>{tCommon("actions")}</ColumnHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="h-32 px-4 text-center text-muted-foreground">
                    {tCommon("noData")}
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <ClickableTableRow
                    key={user.id}
                    href={`${basePath}/${user.id}/edit`}
                    label={`${tCommon("edit")}: ${user.username}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{user.username}</td>
                    <td className="min-w-56 px-4 py-3 text-foreground">{user.displayName}</td>
                    <td className="min-w-56 px-4 py-3 text-muted-foreground">{user.email ?? "-"}</td>
                    <td className="min-w-52 px-4 py-3 text-muted-foreground">
                      {user.employee ? `${user.employee.code} - ${user.employee.fullNameTh}` : "-"}
                    </td>
                    <td className="min-w-72 px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {user.userRoles.length === 0 ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          user.userRoles.map((userRole) => (
                            <span key={userRole.role.name} className="inline-flex rounded-full bg-info-soft px-2 py-1 text-xs font-medium text-info">
                              {userRole.role.displayNameTh || userRole.role.displayName}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {user.isActive ? (
                        <ActiveBadge label={tCommon("active")} />
                      ) : (
                        <span className="inline-flex rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                          {tCommon("inactive")}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(user.lastLoginAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link
                        href={`${basePath}/${user.id}/edit`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-medium transition-colors hover:bg-accent"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        {tCommon("edit")}
                      </Link>
                    </td>
                  </ClickableTableRow>
                ))
              )}
            </tbody>
          </table>
        </div>
        <MasterDataPagination
          current={listState}
          total={total}
          basePath={basePath}
          labels={{
            rowsPerPage: tCommon("rowsPerPage"),
            page: tCommon("page"),
            of: tCommon("of"),
            previous: tCommon("previous"),
            next: tCommon("next"),
          }}
        />
      </section>
```

with:

```tsx
      <DataTable
        caption={t("title")}
        scrollHint={tCommon("tableScrollHint")}
        footer={
          total > 0 ? (
            <Pagination
              page={listState.page}
              totalPages={totalPages}
              previousHref={listHref({ page: listState.page - 1 })}
              nextHref={listHref({ page: listState.page + 1 })}
              pageSize={listState.pageSize}
              pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: listHref({ pageSize: value, page: 1 }) }))}
              labels={{
                navigation: tCommon("pagination"),
                previous: tCommon("previous"),
                next: tCommon("next"),
                pageOf: tCommon("pageOf", { page: listState.page, total: totalPages }),
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
            <DataTableHead sort={sortBy("username")}>{t("username")}</DataTableHead>
            <DataTableHead sort={sortBy("displayName")}>{t("displayName")}</DataTableHead>
            <DataTableHead sort={sortBy("email")}>{t("email")}</DataTableHead>
            <DataTableHead>{t("employee")}</DataTableHead>
            <DataTableHead>{t("roles")}</DataTableHead>
            <DataTableHead>{tCommon("status")}</DataTableHead>
            <DataTableHead sort={sortBy("lastLoginAt")}>{t("lastLoginAt")}</DataTableHead>
            <DataTableHead align="right" hideLabel>{tCommon("actions")}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {users.length === 0 ? (
            <TableEmptyRow colSpan={8}>{tCommon("noData")}</TableEmptyRow>
          ) : (
            users.map((user) => {
              const editHref = `${basePath}/${user.id}/edit`
              return (
                <ClickableTableRow
                  key={user.id}
                  href={editHref}
                  label={`${tCommon("edit")}: ${user.username}`}
                >
                  <DataTableCell className="whitespace-nowrap">
                    <span className="tag font-medium text-foreground">{user.username}</span>
                  </DataTableCell>
                  <DataTableCell className="min-w-56 text-foreground">{user.displayName}</DataTableCell>
                  <DataTableCell className="min-w-56 text-muted-foreground">{orNil(user.email)}</DataTableCell>
                  <DataTableCell className="min-w-52 text-muted-foreground">
                    {user.employee ? (
                      <>
                        <span className="tag">{user.employee.code}</span> - {user.employee.fullNameTh}
                      </>
                    ) : (
                      <Nil />
                    )}
                  </DataTableCell>
                  <DataTableCell className="min-w-72">
                    <div className="flex flex-wrap gap-1.5">
                      {user.userRoles.length === 0 ? (
                        <Nil />
                      ) : (
                        user.userRoles.map((userRole) => (
                          <span key={userRole.role.name} className="inline-flex rounded-full bg-info-soft px-2 py-1 text-xs font-medium text-info">
                            {userRole.role.displayNameTh || userRole.role.displayName}
                          </span>
                        ))
                      )}
                    </div>
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap">
                    {user.isActive ? (
                      <ActiveBadge label={tCommon("active")} />
                    ) : (
                      <span className="inline-flex rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                        {tCommon("inactive")}
                      </span>
                    )}
                  </DataTableCell>
                  <DataTableCell className="whitespace-nowrap text-muted-foreground">
                    {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : <Nil />}
                  </DataTableCell>
                  <DataTableCell align="right">
                    <RowActions
                      code={user.username}
                      name={user.displayName}
                      menuLabel={tCommon("moreActionsFor", { code: user.username })}
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
```

Check: `grep -n "<h1\|<thead\|<td colSpan\|\"-\"\|<span className=\"text-muted-foreground\">-\|ColumnHeader\|MasterDataPagination\|shadow-lg" "src/app/[locale]/(dashboard)/admin/users/page.tsx"` prints exactly one line, the floating button (R-q):
```
208:        className="fixed bottom-6 right-6 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-white shadow-lg transition-colors hover:bg-primary-hover"
```

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/master-data-return-navigation.test.ts tests/master-data-brand-supplier-ui.test.ts tests/master-data-workspace.test.ts tests/confirm-dialog-ui.test.ts tests/row-actions-ui.test.ts tests/list-primitives-ui.test.ts tests/form-migration-guards.test.ts tests/mobile-field-navigation.test.ts tests/operational-return-navigation.test.ts tests/audit-pending-mobile-ux.test.ts`
Expected: PASS, `tests 136 · pass 136 · fail 0` (list-pages-ui now 7; mobile-field-navigation 7, operational-return-navigation 6, audit-pending-mobile-ux 3).

Run: `node <temp>/p2b1-precheck.mjs --file D/admin/users/page.tsx` then `node <temp>/p2b1-precheck.mjs --budgets`
Expected: `· in MIGRATED_LIST_FILES`, live and budget 0 on the R7, LH1, LT3 and LV2 rows, R2 still `1  –`, and `args    (no row holds this file)`; then exit 0 with `R7 TABLE_HEADER_FILLS 35 in 22 rows` and `budgets hold: no live count is over its row`.

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b1-tw-probe.mjs "src/app/[locale]/(dashboard)/admin/users/page.tsx"`
Expected: `checked 35 classes, missing 0`. No class is new to `src`.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 0 fail and 1 more test than before Step 2 (the block of Step 2 (b)); tsc no errors; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 4 files in `git diff --stat`: the page 124 insertions and 93 deletions, `tests/list-pages-ui.test.ts` 10 insertions, `tests/list-frame-guards.test.ts` 1 and 4, `tests/visual-foundation-guards.test.ts` 1 deletion; nothing untracked. The page stays CRLF.

- [ ] **Step 8: Commit**

```bash
git add "src/app/[locale]/(dashboard)/admin/users/page.tsx" tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): users list on DataTable and the shared pager, with edit as the row's only command (2B-1 task 21)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 2B-1 dev-app check (Task 25, spec §10.5 and its axe row `/th/admin/users`):** at 1440, 768 and 375: the header, the frameless 36px search (44px on phones), the table and the foot; each row has "แก้ไข" and an empty slot where ⋯ would be, Tab finds no ⋯, and NVDA reads "แก้ไข" followed by the username; a user who never signed in and a user without roles show "—"; sort by each of the 4 columns; `?page=99` lands on the last page; the floating button still sits bottom right (if it covers the foot's "ถัดไป" at 375 when scrolled to the bottom, list it for 2D, R-q, and do not move it here); axe reports no `label`, `button-name` or color-contrast issue.

---

### Task 22: Form and new-page headers on `PageHeader` with `PageBackLink` (15 back links, 3 header "ยกเลิก" links, h1 600) · 5 commits

Spec §10.3 row 22, with §4.4.2 (the header table of 2B-1), §4.5 (B2 back buttons, #1–#18), §4.6.1 (page roots), I1, I19, I32, §10.4 table A row `disposal-route-structure.test.ts:33`, and §10.5 row "หน้าแก้ไข/สร้าง 18 จุด". Five commits, grouped as §10.3 lists them: 22a the 9 master-data forms · 22b `admin-user-form` + `role-permission-form` · 22c `asset-form` + `asset-component-manager` · 22d `/disposal/new` + `/disposal/batch/new` · 22e `/maintenance/new`, `/maintenance/pm/new`, `/maintenance/pm/[id]/edit`. Every file except the two disposal pages is CRLF: edit with exact-string replacement only, and never run a formatter (13 of these files are 2C files).

Rulings this task applies:
- **I1, B2:** the header is `PageHeader` with `back={<PageBackLink href={…} label={…} />}`. `href` is the expression the file already uses (`backHref`, `returnToHref`, `returnTo`, or `` `/${locale}/disposal` ``), so every `returnTo` pin of §4.5.6 passes without edits. `label` is the words the link already shows (`tCommon("back")`, `labels.back`, `t("backToQueue")`). No `aria-label`: the name is the visible text, kept for screen readers below `md`.
- **§4.4.2:** title and meta are the old `h1` and subtitle. The supplier form keeps `onClick={confirmNavigation}` on `PageBackLink` (`tests/supplier-form-ui.test.ts:30-35`).
- **I32:** `role-permission-form` takes `title={isCreate ? t("createTitle") : t("editTitle")}`, so the create page reads "เพิ่มบทบาท" (key exists in both languages). Its meta stays as it is, " · " included (§4.4.2 "เดิม"; the file may change only at `:112-134`, plus the two import lines the header needs).
- **I32, §4.8 ruling 20:** the component manager header is a plain `PageHeader`: no sticky card, `title={labels.title}` ("จัดการส่วนควบ"), meta = the parent asset's tag (`<span className="tag">`) then its name. Its root `space-y-5 pb-6` stays (2C file); `className="mb-6"` on the header wins over `space-y-5`, giving the 24px of every header.
- **§4.6.1:** forms (component roots) pass `className="mb-6"` in place of the old `mb-6` div. The page files of 22d and 22e are moved whole, so their root becomes `space-y-6` (I32; it was `space-y-5` on 4 of the 5) and their header takes no margin.
- **§4.5.5, B2:** the three maintenance pages lose the header link "ยกเลิก" (`tCommon("cancel")`) and get `PageBackLink` "กลับ" to the same `returnTo`. Their breadcrumbs move into `PageHeader breadcrumbs={[…]}` as the same array literal: 4px above the title instead of a 20px block. `tests/breadcrumbs-ui.test.ts` still counts 11 trails and 8 codes, because Task 3 taught it the prop form.
- **§4.3.3 rule 6:** the PM edit page's trail ends on `plan.planNo` (`code: true`), so its title becomes `plan.title` and the plan number moves to the meta as `<span className="tag">`.
- **I19:** `tests/disposal-route-structure.test.ts:33` `/ArrowLeft/` becomes `/<PageBackLink href=\{returnToHref\}/` in 22d. The file is CRLF and read without stripping `\r`; the new regex has no `\n`.
- **Ruling (spec gap), the test file:** §10.3 rows 22–24 name only guards. The guards prove that the old patterns are gone (LFG LH1 no `<h1>`, LB1 no `<ArrowLeft`), not that the new header is there or that `href` kept its expression. Tasks 22–24 therefore add one test per commit to a new `tests/form-frames-ui.test.ts` (LF). 22a creates it; every later commit appends one test at its end. Each test defines its own constants inside it, so no later commit edits the top of the file.
- **Ruling, `MIGRATED_LIST_FILES`:** 2B touches none of these files again (spec §8.6–8.9), so each commit adds its files (`--migrated`), except `role-permission-form.tsx`: its VFG R7 row (1) and LT1 row (2, `KEEP`) belong to 2C plan 4 (R-e), and `p2b-budget.mjs --migrated` refuses a file with an R7 row.
- **FMG:** the removed header markup holds none of the patterns of `tests/form-migration-guards.test.ts` (the back links carry `hover:`, so they are not field class strings), so no FMG count changes and the file is not edited.

What users will see (18 pages; spec §10.5):
- The title is weight 600 instead of 700, and the subtitle is 13px instead of 14px.
- The back button is the shared outline button, 36px tall from `md` with "กลับ" (or "กลับคิวตัดจำหน่าย") and a left arrow; below `md` it is a 44px icon button under the title. It still goes to the same filtered list.
- `/disposal/batch/new`: the icon-only button left of the title becomes the same back button, with its words from `md`.
- The three maintenance pages: "ยกเลิก" becomes "กลับ" with an arrow; the breadcrumbs sit right above the title. The PM edit title is the plan's name, with its number under it.
- The role create page reads "เพิ่มบทบาท" instead of "แก้ไขสิทธิ์บทบาท".
- The component manager header no longer sticks to the top or sits in a card; its title is "จัดการส่วนควบ", with the parent asset's tag and name under it.
- The supplier form still asks before it drops unsaved changes.

Not in this task:
- the cancel links at the end of the forms (2C, `tests/{branch,…}-form-ui.test.ts`) and the "ย้อนกลับ" step button of the component manager (`asset-component-manager.tsx:386`, §4.5.7)
- the form panels (K28, 2D), the 2C fields of `admin-user-form`, `role-permission-form` and `audit-round-form` (2C plans 3–4)
- the operation forms (Task 23) and the two label/scan tools (2C plan 4, I13)
- messages: no key changes (no `messages-edit.mjs` run). No new class: every class of the new code is already in `src` (Step 1 checks them with Task 3's Tailwind probe).

**Files:**
- 22a: Modify `src/components/master-data/{asset-model,branch,brand,category,company,department,employee,location,supplier}-form.tsx` (CRLF, 3 replacements each) · Create `tests/form-frames-ui.test.ts` (LF)
- 22b: Modify `src/components/admin/admin-user-form.tsx`, `src/components/admin/role-permission-form.tsx` (CRLF, 3 replacements each)
- 22c: Modify `src/components/assets/asset-form.tsx`, `src/components/assets/asset-component-manager.tsx` (CRLF, 3 replacements each)
- 22d: Modify `src/app/[locale]/(dashboard)/disposal/new/page.tsx` (LF, 3 replacements), `src/app/[locale]/(dashboard)/disposal/batch/new/page.tsx` (LF, 2 replacements), `tests/disposal-route-structure.test.ts` (CRLF, 1 replacement)
- 22e: Modify `src/app/[locale]/(dashboard)/maintenance/new/page.tsx`, `maintenance/pm/new/page.tsx`, `maintenance/pm/[id]/edit/page.tsx` (CRLF, 2 replacements each)
- Every commit: append one test to `tests/form-frames-ui.test.ts`; lower its files' rows in `tests/list-frame-guards.test.ts` through `p2b-budget.mjs` only
- Temp folder only, never committed: `p2b1-t22-precheck.mjs` (Tasks 23 and 24 reuse it), plus Task 1's `p2b-budget.mjs` and `p2b1-precheck.mjs` and Task 3's `p2b-tw-probe.mjs`

**Must keep passing without edits:**
- `tests/master-data-return-navigation.test.ts` (every form keeps `backHref: providedBackHref`, `const backHref = providedBackHref ?? …` and `router.push(backHref)`), `tests/asset-return-navigation.test.ts:50-60`, `tests/operational-return-navigation.test.ts`
- `tests/supplier-form-ui.test.ts` (`:13` `min-h-11` is still on the "active" row, `:30-35` `confirmNavigation`, `:53` the cancel link) and the 7 `tests/<form>-form-ui.test.ts` of 2C plan 2
- `tests/asset-component-manager.test.ts`, `tests/asset-forms-ui.test.ts:82-120`, `tests/steps-ui.test.ts`, `tests/choice-controls-ui.test.ts`, `tests/confirm-text-dialog-ui.test.ts`, `tests/attachment-preview-dialog-ui.test.ts`, `tests/asset-clone-ui.test.ts`, `tests/sticky-form-footer-ui.test.ts`
- `tests/breadcrumbs-ui.test.ts` (11 trails, 8 codes, `pm/[id]/edit` ends on `plan.planNo`), `tests/repair-record-ui.test.ts:42-53`, `tests/mobile-field-navigation.test.ts`
- `tests/form-migration-guards.test.ts` (never edited), `tests/visual-foundation-guards.test.ts`, `tests/list-primitives-ui.test.ts`

**Interfaces:**
- Consumes:
  - Task 3: `PageHeader({ title, meta?, actions?, back?: ReactNode, breadcrumbs?: BreadcrumbItem[], compactOnMobile?, className? })` and `PageBackLink({ href: string; label: string; onClick?: MouseEventHandler<HTMLAnchorElement>; className? })` from `@/components/ui/page-header`. Both have no hooks, so the client forms render them.
  - Task 1: `tests/list-frame-guards.test.ts` (`BUDGETS`, `KEEP`, `MIGRATED_LIST_FILES`), VFG `TABLE_HEADER_FILLS`, and the temp scripts `p2b-budget.mjs` (`node <temp>/p2b-budget.mjs <path> ID=from:to … [--migrated] [--dry-run]`) and `p2b1-precheck.mjs` (`--file <path>`).
  - Task 3: `p2b-tw-probe.mjs` (`node <temp>/p2b-tw-probe.mjs <class> …`).
- Produces:
  - The 18 headers on `PageHeader`; every file but `role-permission-form.tsx` in `MIGRATED_LIST_FILES`.
  - `tests/form-frames-ui.test.ts`: LF; the three imports, then `const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")`, `const C = "src/components/"` and `const HEADER_IMPORT = 'import { PageBackLink, PageHeader } from "@/components/ui/page-header"'`; one test per commit. Tasks 23 and 24 append theirs.
  - `p2b1-t22-precheck.mjs` in the temp folder: `node <temp>/p2b1-t22-precheck.mjs <22a|…|24c>`.

| commit | file | LFG rows (VFG R7) | `p2b-budget.mjs` arguments | `--migrated` |
|---|---|---|---|---|
| 22a | each of the 9 `c/master-data/*-form.tsx` | LH1 1 → – · LB1 1 → – | `LH1=1:0 LB1=1:0` | yes |
| 22b | `c/admin/admin-user-form.tsx` | LH1 1 → – · LB1 1 → – | `LH1=1:0 LB1=1:0` | yes |
| 22b | `c/admin/role-permission-form.tsx` | LH1 1 → – · LB1 1 → – · LT1 2 (`KEEP`) · R7 1 (2C plan 4) | `R7=1:1 LH1=1:0 LB1=1:0 LT1=2:2` | no |
| 22c | `c/assets/asset-form.tsx` | LH1 1 → – · LB1 1 → – · LV2 1 (`KEEP`) | `LH1=1:0 LB1=1:0 LV2=1:1` | yes |
| 22c | `c/assets/asset-component-manager.tsx` | LH1 1 → – · LB1 1 → – · LV2 3 (`KEEP`) | `LH1=1:0 LB1=1:0 LV2=3:3` | yes |
| 22d | `D/disposal/new/page.tsx`, `D/disposal/batch/new/page.tsx` | LH1 1 → – · LB1 1 → – | `LH1=1:0 LB1=1:0` | yes |
| 22e | `D/maintenance/new/page.tsx`, `D/maintenance/pm/new/page.tsx`, `D/maintenance/pm/[id]/edit/page.tsx` | LH1 1 → – (no `ArrowLeft` today) | `LH1=1:0` | yes |

- [ ] **Step 1: Save the precheck script (Tasks 22–24 use it)**

Save this script as `p2b1-t22-precheck.mjs` in your temp folder (never in the repo):

```js
// p2b1-t22-precheck.mjs: run from the repo root before each commit of plan 2B-1 Tasks 22–24. Reads only; writes nothing.
// Usage: node p2b1-t22-precheck.mjs <22a|22b|22c|22d|22e|23a|23b|23c|23d|23e|24a|24b|24c>
// Confirms that Tasks 1 and 3 landed, that the commits before this one landed, that each file still holds the text the
// plan quotes, and that the guard rows of each file are what the plan's p2b-budget.mjs call expects. Never commit this file.
import { existsSync, readFileSync } from "node:fs"

const D = "src/app/[locale]/(dashboard)/"
const C = "src/components/"
const TEST = "tests/form-frames-ui.test.ts"
const ORDER = ["22a", "22b", "22c", "22d", "22e", "23a", "23b", "23c", "23d", "23e", "24a", "24b", "24c"]
// The title of the test each commit appends to tests/form-frames-ui.test.ts.
const TITLES = {
  "22a": "the 9 master-data forms: PageHeader",
  "22b": "the user and role forms: PageHeader and PageBackLink",
  "22c": "the asset form and the component manager: PageHeader",
  "22d": "the two disposal create pages: PageHeader",
  "22e": "the three maintenance create and edit pages",
  "23a": "the check-in form draws its title with PageHeader",
  "23b": "the check-out form's OperationShell",
  "23c": "the transfer form draws its title with PageHeader",
  "23d": "the bulk move form shows the selected count",
  "23e": "the new audit round form draws its title with PageHeader",
  "24a": "the three settings tables have the white 13/500 header",
  "24b": "the asset batch form: PageHeader and the white table header",
  "24c": "the depreciation builder formats its preview",
}
const OLD_BACK = '<ArrowLeft className="h-4 w-4" />'
const OLD_H1 = '<h1 className="text-2xl font-bold text-foreground">{title}</h1>'
const form = (name, extra = {}) => ({ path: `${C}master-data/${name}-form.tsx`, eol: "CRLF", once: [OLD_H1, OLD_BACK], rows: { LH1: 1, LB1: 1 }, ...extra })
// Per commit: each file, its line endings, lines that must occur exactly once, and its guard rows (R7 = VFG TABLE_HEADER_FILLS).
const TASKS = {
  "22a": [
    form("asset-model", { once: [OLD_H1, OLD_BACK, 'import { ArrowLeft, ImageIcon, Plus, Save, Sparkles, Trash2 } from "lucide-react"', 'import { NativeSelect } from "@/components/ui/native-select"'] }),
    form("branch", { once: [OLD_H1, OLD_BACK, 'import { ArrowLeft, Save } from "lucide-react"', 'import { NativeSelect } from "@/components/ui/native-select"'] }),
    form("brand", { once: [OLD_H1, OLD_BACK, 'import { ArrowLeft, Save } from "lucide-react"', 'import { Input } from "@/components/ui/input"'] }),
    form("category", { once: [OLD_H1, OLD_BACK, 'import { ArrowDown, ArrowLeft, ArrowUp, Copy, Plus, Save, Trash2 } from "lucide-react"', 'import { NativeSelect } from "@/components/ui/native-select"'] }),
    form("company", { once: [OLD_H1, OLD_BACK, 'import { ArrowLeft, Save } from "lucide-react"', 'import { Input } from "@/components/ui/input"'] }),
    form("department", { once: [OLD_H1, OLD_BACK, 'import { ArrowLeft, Save } from "lucide-react"', 'import { NativeSelect } from "@/components/ui/native-select"'] }),
    form("employee", { once: [OLD_H1, OLD_BACK, 'import { ArrowLeft, Save } from "lucide-react"', 'import { NativeSelect } from "@/components/ui/native-select"'] }),
    form("location", { once: [OLD_H1, OLD_BACK, 'import { ArrowLeft, Save } from "lucide-react"', 'import { NativeSelect } from "@/components/ui/native-select"'] }),
    form("supplier", { once: [OLD_H1, '<ArrowLeft className="h-4 w-4" aria-hidden="true" />', "onClick={confirmNavigation}\n", 'import { ArrowLeft, Save } from "lucide-react"', 'import { Input } from "@/components/ui/input"'] }),
  ],
  "22b": [
    { path: `${C}admin/admin-user-form.tsx`, eol: "CRLF", once: ['import { ArrowLeft, Loader2, Save } from "lucide-react"', '<p className="mt-1 text-sm text-muted-foreground">{t("formSubtitle")}</p>', OLD_BACK], rows: { LH1: 1, LB1: 1 } },
    { path: `${C}admin/role-permission-form.tsx`, eol: "CRLF", once: ['import { ArrowLeft, Info, Loader2, Save } from "lucide-react"', '<h1 className="text-2xl font-bold text-foreground">{t("editTitle")}</h1>', OLD_BACK], rows: { R7: 1, LH1: 1, LB1: 1, LT1: 2 }, migrated: false },
  ],
  "22c": [
    { path: `${C}assets/asset-form.tsx`, eol: "CRLF", once: ['import { AlertTriangle, ArrowLeft, Code2, Copy, Plus, Save, Trash2 } from "lucide-react"', '<h1 className="break-words text-2xl font-bold text-foreground">{title}</h1>', OLD_BACK], rows: { LH1: 1, LB1: 1, LV2: 1 } },
    { path: `${C}assets/asset-component-manager.tsx`, eol: "CRLF", once: ['import { ArrowLeft, CheckCircle2, Loader2, PackageCheck, PackagePlus, Trash2 } from "lucide-react"', '<section className="sticky top-0 z-20 rounded-lg border border-border bg-surface p-4">', '<h1 className="mt-1 break-words text-xl font-bold text-foreground">{parentAsset.assetTag}</h1>', OLD_BACK], rows: { LH1: 1, LB1: 1, LV2: 3 } },
  ],
  "22d": [
    { path: `${D}disposal/new/page.tsx`, eol: "LF", once: ['import Link from "next/link"\nimport { ArrowLeft } from "lucide-react"\n', '<h1 className="text-2xl font-bold text-foreground">{t("createTitle")}</h1>', '<ArrowLeft className="h-4 w-4" aria-hidden="true" />'], rows: { LH1: 1, LB1: 1 } },
    { path: `${D}disposal/batch/new/page.tsx`, eol: "LF", once: ['import Link from "next/link"\nimport { ArrowLeft } from "lucide-react"\n', '  return <div className="space-y-5">\n', 'aria-label={t("backToQueue")}'], rows: { LH1: 1, LB1: 1 } },
    { path: "tests/disposal-route-structure.test.ts", eol: "CRLF", once: ["  assert.match(newSource, /ArrowLeft/)\n"], rows: {}, guarded: false },
  ],
  "22e": ["new", "pm/new", "pm/[id]/edit"].map((route) => ({ path: `${D}maintenance/${route}/page.tsx`, eol: "CRLF", once: ['import Link from "next/link"\n', '    <div className="space-y-5">\n', "<Breadcrumbs items={[", '{tCommon("cancel")}'], rows: { LH1: 1 } })),
  "23a": [{ path: `${C}asset-operations/checkin-form.tsx`, eol: "CRLF", once: ['import { OperationReviewDialog } from "@/components/ui/operation-review-dialog"', '<h1 className="break-words text-2xl font-bold text-foreground">{t("title")}</h1>'], rows: { LH1: 1, LV2: 9 } }],
  "23b": [{ path: `${C}asset-operations/checkout-form.tsx`, eol: "CRLF", once: ['import { OperationReviewDialog } from "@/components/ui/operation-review-dialog"', '<h1 className="break-words text-2xl font-bold text-foreground">{title}</h1>', "function OperationShell({ title, children }"], rows: { LH1: 1 } }],
  "23c": [{ path: `${C}asset-operations/transfer-form.tsx`, eol: "CRLF", once: ['import { OperationReviewDialog } from "@/components/ui/operation-review-dialog"', '<h1 className="break-words text-2xl font-bold text-foreground">{t("title")}</h1>'], rows: { LH1: 1 } }],
  "23d": [{ path: `${C}asset-operations/bulk-move-form.tsx`, eol: "CRLF", once: ['import { Input } from "@/components/ui/input"', '<h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>', '{t("selectedCount", { count: assetIds.length })}'], rows: { LH1: 1 } }],
  "23e": [{ path: `${C}audit/audit-round-form.tsx`, eol: "CRLF", once: ['import { useApiError } from "@/components/ui/use-api-error"', '<h1 className="text-2xl font-bold text-foreground">{t("createTitle")}</h1>'], rows: { LH1: 1 } }],
  "24a": [{ path: `${C}admin/system-settings-form.tsx`, eol: "CRLF", once: ['return <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{children}</th>'], count: { '<thead className="bg-muted/40">': 3 }, rows: { R7: 3, LB1: 1, LT1: 1, LV2: 8, LS1: 1 } }],
  "24b": [{ path: `${C}assets/asset-batch-form.tsx`, eol: "CRLF", once: ['import { NativeSelect } from "@/components/ui/native-select"', '<h1 className="break-words text-2xl font-bold text-foreground">{t("batchCreateTitle")}</h1>'], count: { '<thead className="bg-muted/40 text-left text-xs font-semibold text-muted-foreground">': 3 }, rows: { R7: 3, LH1: 1, LV2: 8 } }],
  "24c": [{ path: `${C}admin/depreciation-policy-builder.tsx`, eol: "CRLF", once: ['} from "@/lib/depreciation-policy-editor"\n', "value={preview.ageMonths.toLocaleString()}", "function formatMoney(value: number) {"], rows: { LV1: 1 } }],
}

const task = process.argv[2]
if (!TASKS[task]) {
  console.error(`usage: node p2b1-t22-precheck.mjs <${ORDER.join("|")}>`)
  process.exit(2)
}
const raw = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "")
const read = (path) => raw(path).replace(/\r\n/g, "\n")
const endings = (text) => {
  const crlf = (text.match(/\r\n/g) ?? []).length
  const lf = (text.match(/\n/g) ?? []).length
  return lf === 0 ? "none" : crlf === lf ? "CRLF" : crlf === 0 ? "LF" : "mixed"
}
// The budget objects as the test files hold them (evaluated, so formatting does not matter).
function objectOf(text, name) {
  const lines = text.split("\n")
  const start = lines.findIndex((line) => new RegExp(`^const ${name}\\b`).test(line))
  if (start === -1) return undefined
  const head = lines[start].slice(lines[start].indexOf("= ") + 2)
  const body = /^[{[].*[}\]]\s*$/.test(head) ? head : [head, ...lines.slice(start + 1, lines.findIndex((line, index) => index > start && /^[}\]]/.test(line)) + 1)].join("\n")
  return Function("D", "C", `return (${body})`)(D, C)
}
const lfg = read("tests/list-frame-guards.test.ts")
const vfg = read("tests/visual-foundation-guards.test.ts")
const BUDGETS = lfg ? objectOf(lfg, "BUDGETS") : undefined
const MIGRATED = lfg ? objectOf(lfg, "MIGRATED_LIST_FILES") : undefined
const FILLS = objectOf(vfg, "TABLE_HEADER_FILLS")
const header = read(`${C}ui/page-header.tsx`)
const testSource = read(TEST)
const before = ORDER.slice(0, ORDER.indexOf(task))

const checks = {
  "Task 1: LFG BUDGETS and MIGRATED_LIST_FILES, VFG TABLE_HEADER_FILLS": Boolean(BUDGETS && MIGRATED && FILLS),
  "Task 3: ui/page-header.tsx exports PageHeader and PageBackLink (back is a node, onClick is optional)":
    /export function PageHeader\(/.test(header) && /export function PageBackLink\(/.test(header) && /\n  back\?: ReactNode\n/.test(header) && /\n  onClick\?: MouseEventHandler<HTMLAnchorElement>\n/.test(header),
  [`${TEST}: ${before.length ? `the tests of ${before.join(", ")} are in` : "not there yet"}`]: before.length
    ? before.every((id) => testSource.includes(`test("${TITLES[id]}`))
    : !existsSync(TEST),
  [`${TEST}: no test of ${task} yet`]: !testSource.includes(`test("${TITLES[task]}`),
}
for (const file of TASKS[task]) {
  const text = raw(file.path)
  const source = read(file.path)
  checks[`${file.path} exists, ${file.eol}`] = text.length > 0 && endings(text) === file.eol
  for (const line of file.once) checks[`${file.path}: once ${JSON.stringify(line.trim().slice(0, 70))}`] = source.split(line).length - 1 === 1
  for (const [line, count] of Object.entries(file.count ?? {})) checks[`${file.path}: ${count}× ${JSON.stringify(line.slice(0, 60))}`] = source.split(line).length - 1 === count
  if (file.guarded === false) continue
  const live = {}
  for (const [id, rows] of Object.entries(BUDGETS ?? {})) if (rows[file.path]) live[id] = rows[file.path]
  if (FILLS?.[file.path]) live.R7 = FILLS[file.path]
  const want = Object.entries(file.rows).map(([id, n]) => `${id}=${n}`).sort().join(" ")
  const have = Object.entries(live).map(([id, n]) => `${id}=${n}`).sort().join(" ")
  checks[`${file.path}: guard rows ${want}`] = want === have
  checks[`${file.path}: not in MIGRATED_LIST_FILES`] = !(MIGRATED ?? []).includes(file.path)
}
let missing = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok     " : "MISSING"} ${name}`)
  if (!ok) missing += 1
}
if (missing > 0) {
  console.error(`ABORT: ${missing} precondition(s) failed. Do not start ${task}; report which.`)
  process.exit(1)
}
console.log(`preconditions hold for ${task}`)
```

Every commit below starts with `node <temp>/p2b1-t22-precheck.mjs <commit>`. It prints one `ok` line per check and ends with `preconditions hold for <commit>`; on any `MISSING` line (exit 1) stop and report it. It reads the guard rows the same way `p2b-budget.mjs` does, so a `guard rows` line that fails means an earlier task left a row behind.

Then prove that every class the new code uses compiles (all of them are already in `src`):

Run: `node <temp>/p2b-tw-probe.mjs mb-6 space-y-6 min-w-0 break-words tag bg-surface px-4 py-2.5 text-left align-bottom text-meta font-medium text-faint-foreground`
Expected: `checked 13, missing 0`.

#### Commit 22a: the 9 master-data forms

- [ ] **Step 2: Check what this commit builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b1-t22-precheck.mjs 22a`
Expected: `git status` prints nothing. The script prints 68 `ok` lines (4 general, then for each form: exists and CRLF, its old `h1` and back icon and its two import lines once each, `guard rows LB1=1 LH1=1`, not in `MIGRATED_LIST_FILES`) and `preconditions hold for 22a`.

Run: `git ls-files --eol src/components/master-data/*-form.tsx`
Expected: `i/lf    w/crlf` for all 9.

- [ ] **Step 3: Lower the guard rows (the failing guards)**

Run these 9 commands (one per form):
```bash
node <temp>/p2b-budget.mjs c/master-data/asset-model-form.tsx LH1=1:0 LB1=1:0 --migrated
node <temp>/p2b-budget.mjs c/master-data/branch-form.tsx LH1=1:0 LB1=1:0 --migrated
node <temp>/p2b-budget.mjs c/master-data/brand-form.tsx LH1=1:0 LB1=1:0 --migrated
node <temp>/p2b-budget.mjs c/master-data/category-form.tsx LH1=1:0 LB1=1:0 --migrated
node <temp>/p2b-budget.mjs c/master-data/company-form.tsx LH1=1:0 LB1=1:0 --migrated
node <temp>/p2b-budget.mjs c/master-data/department-form.tsx LH1=1:0 LB1=1:0 --migrated
node <temp>/p2b-budget.mjs c/master-data/employee-form.tsx LH1=1:0 LB1=1:0 --migrated
node <temp>/p2b-budget.mjs c/master-data/location-form.tsx LH1=1:0 LB1=1:0 --migrated
node <temp>/p2b-budget.mjs c/master-data/supplier-form.tsx LH1=1:0 LB1=1:0 --migrated
```
Expected for each: four lines, for example
```
LH1: 1 -> 0 (row deleted)
LB1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/components/master-data/asset-model-form.tsx
```
On `ABORT`, stop and report the lines it prints.

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 44 · fail 3`: `LH1` and `LB1` each list the 9 forms as `1 > 0`, and `L0` lists `LH1 <form>: 1 > 0` and `LB1 <form>: 1 > 0` for each of them.

- [ ] **Step 4: Create the failing test `tests/form-frames-ui.test.ts`**

Create the file with this content, LF line endings:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Phase 2B plan 1, Tasks 22–24 (spec 2B §4.4.2, §4.5, §9.2.1, I1, I13, I32, R-e, R-f): the forms and new/edit pages
// that 2B-1 moves draw their title with the shared PageHeader, a back link in a header is PageBackLink with the href
// the page already computed, and the three 2C files of Task 24 take the white table header and the th-TH number
// helpers. Most of these files are CRLF in the working tree, so sources are read with \r stripped and the regexes
// below may hold \n. The "nothing left" side (no <h1>, no hand-placed ArrowLeft, no header fill) is LFG LH1, LB1
// and LT1 and VFG R7.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/"
const HEADER_IMPORT = 'import { PageBackLink, PageHeader } from "@/components/ui/page-header"'

test("the 9 master-data forms: PageHeader with the subtitle as meta and the back link to backHref (2B-1 task 22)", () => {
  const forms = ["asset-model", "branch", "brand", "category", "company", "department", "employee", "location", "supplier"]
  for (const name of forms) {
    const path = `${C}master-data/${name}-form.tsx`
    const source = read(path)
    assert.ok(source.includes(HEADER_IMPORT), `${path}: imports PageHeader and PageBackLink`)
    assert.match(
      source,
      /<PageHeader\n\s+title=\{title\}\n\s+meta=\{t\("subtitle"\)\}\n\s+className="mb-6"\n\s+back=\{<PageBackLink href=\{backHref\}(?: onClick=\{confirmNavigation\})? label=\{tCommon\("back"\)\} \/>\}\n\s+\/>/,
      path,
    )
    assert.doesNotMatch(source, /<h1\b|\bArrowLeft\b/, path)
  }
  assert.match(
    read(`${C}master-data/supplier-form.tsx`),
    /<PageBackLink href=\{backHref\} onClick=\{confirmNavigation\} label=\{tCommon\("back"\)\} \/>/,
    "the supplier back link still asks before it drops unsaved changes",
  )
})
```

Run: `node --test tests/form-frames-ui.test.ts`
Expected: FAIL, `tests 1 · pass 0 · fail 1`, first on `src/components/master-data/asset-model-form.tsx: imports PageHeader and PageBackLink`.

- [ ] **Step 5: Move the 9 headers onto `PageHeader` (`src/components/master-data/`)**

Three exact replacements in each file.

(1) and (2), the imports. In each file replace the `lucide-react` line, and add the `page-header` import on its own line right after the line in the last column:

| file | replace | with | then after this line add `import { PageBackLink, PageHeader } from "@/components/ui/page-header"` |
|---|---|---|---|
| `asset-model-form.tsx` | `import { ArrowLeft, ImageIcon, Plus, Save, Sparkles, Trash2 } from "lucide-react"` | `import { ImageIcon, Plus, Save, Sparkles, Trash2 } from "lucide-react"` | `import { NativeSelect } from "@/components/ui/native-select"` |
| `branch-form.tsx` | `import { ArrowLeft, Save } from "lucide-react"` | `import { Save } from "lucide-react"` | `import { NativeSelect } from "@/components/ui/native-select"` |
| `brand-form.tsx` | `import { ArrowLeft, Save } from "lucide-react"` | `import { Save } from "lucide-react"` | `import { Input } from "@/components/ui/input"` |
| `category-form.tsx` | `import { ArrowDown, ArrowLeft, ArrowUp, Copy, Plus, Save, Trash2 } from "lucide-react"` | `import { ArrowDown, ArrowUp, Copy, Plus, Save, Trash2 } from "lucide-react"` | `import { NativeSelect } from "@/components/ui/native-select"` |
| `company-form.tsx` | `import { ArrowLeft, Save } from "lucide-react"` | `import { Save } from "lucide-react"` | `import { Input } from "@/components/ui/input"` |
| `department-form.tsx` | `import { ArrowLeft, Save } from "lucide-react"` | `import { Save } from "lucide-react"` | `import { NativeSelect } from "@/components/ui/native-select"` |
| `employee-form.tsx` | `import { ArrowLeft, Save } from "lucide-react"` | `import { Save } from "lucide-react"` | `import { NativeSelect } from "@/components/ui/native-select"` |
| `location-form.tsx` | `import { ArrowLeft, Save } from "lucide-react"` | `import { Save } from "lucide-react"` | `import { NativeSelect } from "@/components/ui/native-select"` |
| `supplier-form.tsx` | `import { ArrowLeft, Save } from "lucide-react"` | `import { Save } from "lucide-react"` | `import { Input } from "@/components/ui/input"` |

The new import sorts by path among the `@/components/ui/` lines (`native-select` or `input` < `page-header` < `textarea`/`use-api-error`). `Link` stays: the cancel link at the end of each form uses it.

(3) The header. In the 8 forms other than the supplier form (identical text in all 8), replace:

```tsx
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link
          href={backHref}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          {tCommon("back")}
        </Link>
      </div>
```

with:

```tsx
      <PageHeader
        title={title}
        meta={t("subtitle")}
        className="mb-6"
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />
```

In `supplier-form.tsx`, replace:

```tsx
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link
          href={backHref}
          onClick={confirmNavigation}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {tCommon("back")}
        </Link>
      </div>
```

with:

```tsx
      <PageHeader
        title={title}
        meta={t("subtitle")}
        className="mb-6"
        back={<PageBackLink href={backHref} onClick={confirmNavigation} label={tCommon("back")} />}
      />
```

Check: `grep -n "ArrowLeft\|<h1" src/components/master-data/*-form.tsx` prints nothing.

- [ ] **Step 6: Run the tests for this commit**

Run: `node --test tests/form-frames-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: PASS, `tests 48 · pass 48 · fail 0`.

Run: `node --test tests/master-data-return-navigation.test.ts tests/supplier-form-ui.test.ts tests/branch-form-ui.test.ts tests/brand-form-ui.test.ts tests/category-form-ui.test.ts tests/company-form-ui.test.ts tests/department-form-ui.test.ts tests/employee-form-ui.test.ts tests/location-form-ui.test.ts tests/form-migration-guards.test.ts tests/ui-overlay-guards.test.ts tests/mobile-field-navigation.test.ts tests/master-data-brand-supplier-ui.test.ts tests/supplier-form-errors.test.ts tests/asset-model-selection.test.ts tests/confirm-dialog-ui.test.ts`
Expected: PASS, `fail 0`.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, 1 more test than before Step 4 (1 skipped, as before).
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/` (`npx eslint src/components/master-data tests/form-frames-ui.test.ts` prints nothing).

Run: `git diff --numstat` then `git status --short src tests messages` (below, `+8 −14` means the numstat line `8<tab>14`: 8 lines added, 14 removed)
Expected:
- 8 forms show +8 −14, and `supplier-form.tsx` shows +8 −15.
- `tests/list-frame-guards.test.ts` loses the 18 rows and gains the 9 `MIGRATED_LIST_FILES` lines (+9 −18; +11 −19 if `MIGRATED_LIST_FILES` was still `[]`).
- `git status` also lists `?? tests/form-frames-ui.test.ts` (33 lines).
- A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter). Git may warn that LF will be replaced by CRLF in the LF test files; leave them LF.

- [ ] **Step 8: Commit**

```bash
git add src/components/master-data/asset-model-form.tsx src/components/master-data/branch-form.tsx src/components/master-data/brand-form.tsx src/components/master-data/category-form.tsx src/components/master-data/company-form.tsx src/components/master-data/department-form.tsx src/components/master-data/employee-form.tsx src/components/master-data/location-form.tsx src/components/master-data/supplier-form.tsx tests/form-frames-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): master-data form headers on PageHeader with PageBackLink (2B-1 task 22a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 11 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

#### Commit 22b: the user and role forms (only their headers, I32)

- [ ] **Step 9: Check what this commit builds on**

Run: `node <temp>/p2b1-t22-precheck.mjs 22b`
Expected: 16 `ok` lines (`role-permission-form.tsx: guard rows LB1=1 LH1=1 LT1=2 R7=1` among them) and `preconditions hold for 22b`.

- [ ] **Step 10: Lower the guard rows (the failing guards)**

Run: `node <temp>/p2b-budget.mjs c/admin/admin-user-form.tsx LH1=1:0 LB1=1:0 --migrated`
Expected: `LH1: 1 -> 0 (row deleted)`, `LB1: 1 -> 0 (row deleted)`, `MIGRATED_LIST_FILES: added`, `written: src/components/admin/admin-user-form.tsx`.

Run: `node <temp>/p2b-budget.mjs c/admin/role-permission-form.tsx R7=1:1 LH1=1:0 LB1=1:0 LT1=2:2`
Expected:
```
R7: 1 kept
LH1: 1 -> 0 (row deleted)
LB1: 1 -> 0 (row deleted)
LT1: 2 kept
written: src/components/admin/role-permission-form.tsx
```

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 44 · fail 3`: `LH1` and `LB1` list both files as `1 > 0`; `L0` lists `admin-user-form.tsx` for LH1 and LB1 (`role-permission-form.tsx` is not in `MIGRATED_LIST_FILES`).

- [ ] **Step 11: Append the failing test**

Append to the end of `tests/form-frames-ui.test.ts`:

```ts

test("the user and role forms: PageHeader and PageBackLink, and the role create page names itself (2B-1 task 22, I32)", () => {
  const user = read(`${C}admin/admin-user-form.tsx`)
  assert.ok(user.includes(HEADER_IMPORT), "admin-user-form.tsx imports PageHeader and PageBackLink")
  assert.match(user, /<PageHeader\n\s+title=\{title\}\n\s+meta=\{t\("formSubtitle"\)\}\n\s+className="mb-6"\n\s+back=\{<PageBackLink href=\{backHref\} label=\{tCommon\("back"\)\} \/>\}\n\s+\/>/)
  const role = read(`${C}admin/role-permission-form.tsx`)
  assert.ok(role.includes(HEADER_IMPORT), "role-permission-form.tsx imports PageHeader and PageBackLink")
  assert.match(role, /<PageHeader\n\s+title=\{isCreate \? t\("createTitle"\) : t\("editTitle"\)\}\n/, "the create page reads เพิ่มบทบาท, not แก้ไขสิทธิ์บทบาท")
  assert.match(role, /\n\s+back=\{<PageBackLink href=\{backHref\} label=\{tCommon\("back"\)\} \/>\}\n\s+\/>/)
  for (const source of [user, role]) assert.doesNotMatch(source, /<h1\b|\bArrowLeft\b/)
})
```

Run: `node --test tests/form-frames-ui.test.ts`
Expected: FAIL, `tests 2 · pass 1 · fail 1`, on `admin-user-form.tsx imports PageHeader and PageBackLink`.

- [ ] **Step 12: Move the two headers (`src/components/admin/`)**

In `admin-user-form.tsx`, three replacements.

(1) Replace `import { ArrowLeft, Loader2, Save } from "lucide-react"` with `import { Loader2, Save } from "lucide-react"`.

(2) Replace `import { useApiError } from "@/components/ui/use-api-error"` with:

```tsx
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { useApiError } from "@/components/ui/use-api-error"
```

(3) Replace:

```tsx
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("formSubtitle")}</p>
        </div>
        <Link
          href={backHref}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          {tCommon("back")}
        </Link>
      </div>
```

with:

```tsx
      <PageHeader
        title={title}
        meta={t("formSubtitle")}
        className="mb-6"
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />
```

In `role-permission-form.tsx`, three replacements.

(1) Replace `import { ArrowLeft, Info, Loader2, Save } from "lucide-react"` with `import { Info, Loader2, Save } from "lucide-react"`.

(2) Replace `import { useApiError } from "@/components/ui/use-api-error"` with the same two lines as in `admin-user-form.tsx`.

(3) Replace (`:123-136`, inside the `:112-134` the fence allows plus the closing `</div>`):

```tsx
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("editTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{isCreate ? t("createSubtitle") : `${role.displayNameTh || role.displayName} · ${role.name}`}</p>
        </div>
        <Link
          href={backHref}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          {tCommon("back")}
        </Link>
      </div>
```

with:

```tsx
      <PageHeader
        title={isCreate ? t("createTitle") : t("editTitle")}
        meta={isCreate ? t("createSubtitle") : `${role.displayNameTh || role.displayName} · ${role.name}`}
        className="mb-6"
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />
```

`Link` stays in both files (their cancel links at the end use it). Nothing else in these two 2C batch 4 files changes.

- [ ] **Step 13: Run the tests for this commit**

Run: `node --test tests/form-frames-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/admin-user-routes.test.ts tests/admin-role-routes.test.ts tests/admin-access-policy.test.ts`
Expected: PASS, `fail 0` (`tests/form-frames-ui.test.ts` has 2 tests).

- [ ] **Step 14: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: 0 fail and 1 more test than before Step 11; tsc clean; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --numstat`
Expected: +8 −14 for each form, +11 −0 for `tests/form-frames-ui.test.ts`, and +1 −4 for `tests/list-frame-guards.test.ts` (4 rows out, 1 `MIGRATED_LIST_FILES` line in).

- [ ] **Step 15: Commit**

```bash
git add src/components/admin/admin-user-form.tsx src/components/admin/role-permission-form.tsx tests/form-frames-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): user and role form headers on PageHeader; the role create page names itself (2B-1 task 22b)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit.

#### Commit 22c: the asset form and the component manager

- [ ] **Step 16: Check what this commit builds on**

Run: `node <temp>/p2b1-t22-precheck.mjs 22c`
Expected: 17 `ok` lines and `preconditions hold for 22c`.

- [ ] **Step 17: Lower the guard rows (the failing guards)**

Run: `node <temp>/p2b-budget.mjs c/assets/asset-form.tsx LH1=1:0 LB1=1:0 LV2=1:1 --migrated`
Expected: `LH1: 1 -> 0 (row deleted)`, `LB1: 1 -> 0 (row deleted)`, `LV2: 1 kept`, `MIGRATED_LIST_FILES: added`, `written: src/components/assets/asset-form.tsx`.

Run: `node <temp>/p2b-budget.mjs c/assets/asset-component-manager.tsx LH1=1:0 LB1=1:0 LV2=3:3 --migrated`
Expected: the same lines with `LV2: 3 kept` and `written: src/components/assets/asset-component-manager.tsx`.

`LV2` stays at its `KEEP` number in both files (2C forms, 2D).

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 44 · fail 3` (`LH1`, `LB1` and `L0`, each naming the two files).

- [ ] **Step 18: Append the failing test**

Append to the end of `tests/form-frames-ui.test.ts`:

```ts

test("the asset form and the component manager: PageHeader, and the component header no longer sticks (2B-1 task 22, I32)", () => {
  const form = read(`${C}assets/asset-form.tsx`)
  assert.ok(form.includes(HEADER_IMPORT), "asset-form.tsx imports PageHeader and PageBackLink")
  assert.match(form, /<PageHeader\n\s+title=\{title\}\n\s+meta=\{t\("subtitle"\)\}\n\s+className="mb-6"\n\s+back=\{<PageBackLink href=\{backHref\} label=\{tCommon\("back"\)\} \/>\}\n\s+\/>/)
  const manager = read(`${C}assets/asset-component-manager.tsx`)
  assert.ok(manager.includes(HEADER_IMPORT), "asset-component-manager.tsx imports PageHeader and PageBackLink")
  // The page title is the page's name; the parent asset's code and name are its first facts (spec §4.3.3 rule 6).
  assert.match(manager, /<PageHeader\n\s+title=\{labels\.title\}\n\s+meta=\{\n\s+<>\n\s+<span className="tag">\{parentAsset\.assetTag\}<\/span>\n\s+<span className="min-w-0 break-words">\{parentAsset\.name\}<\/span>\n\s+<\/>\n\s+\}\n\s+className="mb-6"\n\s+back=\{<PageBackLink href=\{returnToHref\} label=\{labels\.back\} \/>\}\n\s+\/>/)
  assert.doesNotMatch(manager, /sticky top-0/, "the header of the component page scrolls with the page, like every other header")
  for (const source of [form, manager]) assert.doesNotMatch(source, /<h1\b|\bArrowLeft\b/)
})
```

Run: `node --test tests/form-frames-ui.test.ts`
Expected: FAIL, `tests 3 · pass 2 · fail 1`, on `asset-form.tsx imports PageHeader and PageBackLink`.

- [ ] **Step 19: Move the two headers (`src/components/assets/`)**

In `asset-form.tsx`, three replacements.

(1) Replace `import { AlertTriangle, ArrowLeft, Code2, Copy, Plus, Save, Trash2 } from "lucide-react"` with `import { AlertTriangle, Code2, Copy, Plus, Save, Trash2 } from "lucide-react"`.

(2) Replace `import { NativeSelect } from "@/components/ui/native-select"` with:

```tsx
import { NativeSelect } from "@/components/ui/native-select"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
```

(3) Replace:

```tsx
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold text-foreground">{title}</h1>
          <p className="mt-1 break-words text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link
          href={backHref}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent sm:w-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          {tCommon("back")}
        </Link>
      </div>
```

with:

```tsx
      <PageHeader
        title={title}
        meta={t("subtitle")}
        className="mb-6"
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />
```

In `asset-component-manager.tsx`, three replacements.

(1) Replace `import { ArrowLeft, CheckCircle2, Loader2, PackageCheck, PackagePlus, Trash2 } from "lucide-react"` with `import { CheckCircle2, Loader2, PackageCheck, PackagePlus, Trash2 } from "lucide-react"`.

(2) Replace `import { Input } from "@/components/ui/input"` with:

```tsx
import { Input } from "@/components/ui/input"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
```

(3) Replace the sticky header card:

```tsx
      <section className="sticky top-0 z-20 rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{labels.title}</p>
            <h1 className="mt-1 break-words text-xl font-bold text-foreground">{parentAsset.assetTag}</h1>
            <p className="mt-1 break-words text-sm text-muted-foreground">{parentAsset.name}</p>
          </div>
          <Link
            href={returnToHref}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent sm:h-10 sm:min-h-0"
          >
            <ArrowLeft className="h-4 w-4" />
            {labels.back}
          </Link>
        </div>
      </section>
```

with:

```tsx
      <PageHeader
        title={labels.title}
        meta={
          <>
            <span className="tag">{parentAsset.assetTag}</span>
            <span className="min-w-0 break-words">{parentAsset.name}</span>
          </>
        }
        className="mb-6"
        back={<PageBackLink href={returnToHref} label={labels.back} />}
      />
```

`Link` stays in both files (`asset-form.tsx:1062`, `:1451`; `asset-component-manager.tsx:498`). The root `<div className="space-y-5 pb-6">` of the component manager stays.

- [ ] **Step 20: Run the tests for this commit**

Run: `node --test tests/form-frames-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/asset-clone-ui.test.ts tests/asset-component-manager.test.ts tests/asset-custodian-scope-ui.test.ts tests/asset-form-sticky-actions.test.ts tests/asset-forms-ui.test.ts tests/asset-model-selection.test.ts tests/asset-operation-status-policy.test.ts tests/asset-return-navigation.test.ts tests/asset-status-help-ui.test.ts tests/attachment-preview-dialog-ui.test.ts tests/choice-controls-ui.test.ts tests/confirm-text-dialog-ui.test.ts tests/file-evidence-ui.test.ts tests/steps-ui.test.ts tests/sticky-form-footer-ui.test.ts tests/form-migration-guards.test.ts tests/mobile-field-navigation.test.ts`
Expected: PASS, `fail 0`.

- [ ] **Step 21: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: 0 fail and 1 more test than before Step 18; tsc clean; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --numstat`
Expected: `asset-component-manager.tsx` +13 −17, `asset-form.tsx` +8 −14, `tests/form-frames-ui.test.ts` +12 −0, `tests/list-frame-guards.test.ts` +2 −4.

- [ ] **Step 22: Commit**

```bash
git add src/components/assets/asset-form.tsx src/components/assets/asset-component-manager.tsx tests/form-frames-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): asset form and component manager headers on PageHeader (2B-1 task 22c)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit.

#### Commit 22d: the two disposal create pages (I19)

- [ ] **Step 23: Check what this commit builds on**

Run: `node <temp>/p2b1-t22-precheck.mjs 22d`
Expected: 18 `ok` lines (the two pages are `LF`, `tests/disposal-route-structure.test.ts` is `CRLF` and holds `assert.match(newSource, /ArrowLeft/)` once) and `preconditions hold for 22d`.

- [ ] **Step 24: Lower the guard rows (the failing guards)**

Run:
```bash
node <temp>/p2b-budget.mjs D/disposal/new/page.tsx LH1=1:0 LB1=1:0 --migrated
node <temp>/p2b-budget.mjs D/disposal/batch/new/page.tsx LH1=1:0 LB1=1:0 --migrated
```
Expected for each: `LH1: 1 -> 0 (row deleted)`, `LB1: 1 -> 0 (row deleted)`, `MIGRATED_LIST_FILES: added`, `written: src/app/[locale]/(dashboard)/disposal/…/page.tsx`.

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 44 · fail 3` (`LH1`, `LB1`, `L0`).

- [ ] **Step 25: The failing tests**

(a) Append to the end of `tests/form-frames-ui.test.ts`:

```ts

test("the two disposal create pages: PageHeader with the back link they had, on a space-y-6 root (2B-1 task 22, I19)", () => {
  const D = "src/app/[locale]/(dashboard)/"
  const request = read(`${D}disposal/new/page.tsx`)
  assert.ok(request.includes(HEADER_IMPORT), "disposal/new imports PageHeader and PageBackLink")
  assert.match(request, /<div className="space-y-6">\n\s+<PageHeader\n\s+title=\{t\("createTitle"\)\}\n\s+meta=\{t\("createSubtitle"\)\}\n\s+back=\{<PageBackLink href=\{returnToHref\} label=\{tCommon\("back"\)\} \/>\}\n\s+\/>/)
  const batch = read(`${D}disposal/batch/new/page.tsx`)
  assert.ok(batch.includes(HEADER_IMPORT), "disposal/batch/new imports PageHeader and PageBackLink")
  // The icon-only link with an aria-label becomes the words "กลับคิวตัดจำหน่าย" from md and a 44px icon below md.
  assert.match(batch, /<div className="space-y-6">\n\s+<PageHeader\n\s+title=\{t\("batchCreateTitle"\)\}\n\s+meta=\{t\("batchCreateHelp"\)\}\n\s+back=\{<PageBackLink href=\{`\/\$\{locale\}\/disposal`\} label=\{t\("backToQueue"\)\} \/>\}\n\s+\/>/)
  for (const source of [request, batch]) assert.doesNotMatch(source, /<h1\b|\bArrowLeft\b|from "next\/link"|aria-label=/)
})
```

(b) `tests/disposal-route-structure.test.ts:33` (CRLF, read without stripping `\r`; the new regex has no `\n`). Replace:

```ts
  assert.match(newSource, /ArrowLeft/)
```

with:

```ts
  assert.match(newSource, /<PageBackLink href=\{returnToHref\}/)
```

Run: `node --test tests/form-frames-ui.test.ts tests/disposal-route-structure.test.ts`
Expected: FAIL, 2 failing tests: the disposal test of `tests/form-frames-ui.test.ts` (on `disposal/new imports PageHeader and PageBackLink`) and `keeps the disposal list queue-first and puts request creation on its own route` (no match for `/<PageBackLink href=\{returnToHref\}/`).

- [ ] **Step 26: Move the two headers (`src/app/[locale]/(dashboard)/disposal/`, both LF)**

In `new/page.tsx`, three replacements.

(1) Replace:

```tsx
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getTranslations } from "next-intl/server"
```

with:

```tsx
import { getTranslations } from "next-intl/server"
```

(2) Replace:

```tsx
import { DisposalRequestForm } from "@/components/disposal/disposal-request-form"
```

with:

```tsx
import { DisposalRequestForm } from "@/components/disposal/disposal-request-form"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
```

(3) Replace (the root `<div className="space-y-6">` above it stays):

```tsx
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("createTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("createSubtitle")}</p>
        </div>
        <Link
          href={returnToHref}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-10 sm:min-h-0"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {tCommon("back")}
        </Link>
      </div>
```

with:

```tsx
      <PageHeader
        title={t("createTitle")}
        meta={t("createSubtitle")}
        back={<PageBackLink href={returnToHref} label={tCommon("back")} />}
      />
```

In `batch/new/page.tsx`, two replacements.

(1) Replace:

```tsx
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { DisposalBatchForm } from "@/components/disposal/disposal-batch-form"
```

with:

```tsx
import { getTranslations } from "next-intl/server"
import { DisposalBatchForm } from "@/components/disposal/disposal-batch-form"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
```

(2) Replace (the root becomes `space-y-6`, §4.6.1):

```tsx
  return <div className="space-y-5">
    <div className="flex items-start gap-3">
      <Link href={`/${locale}/disposal`} aria-label={t("backToQueue")} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-surface hover:bg-accent"><ArrowLeft className="h-4 w-4" /></Link>
      <div><h1 className="text-2xl font-bold text-foreground">{t("batchCreateTitle")}</h1><p className="mt-1 text-sm text-muted-foreground">{t("batchCreateHelp")}</p></div>
    </div>
```

with:

```tsx
  return <div className="space-y-6">
    <PageHeader
      title={t("batchCreateTitle")}
      meta={t("batchCreateHelp")}
      back={<PageBackLink href={`/${locale}/disposal`} label={t("backToQueue")} />}
    />
```

- [ ] **Step 27: Run the tests for this commit**

Run: `node --test tests/form-frames-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/disposal-route-structure.test.ts tests/breadcrumbs-ui.test.ts tests/mobile-field-navigation.test.ts`
Expected: PASS, `fail 0`.

Run: `node --test tests/disposal-*.test.ts tests/operational-return-navigation.test.ts`
Expected: PASS, `fail 0`.

- [ ] **Step 28: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: 0 fail and 1 more test than before Step 25; tsc clean; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --numstat`
Expected: `disposal/batch/new/page.tsx` +7 −7, `disposal/new/page.tsx` +6 −15, `tests/disposal-route-structure.test.ts` +1 −1, `tests/form-frames-ui.test.ts` +12 −0, `tests/list-frame-guards.test.ts` +2 −4.

- [ ] **Step 29: Commit**

```bash
git add "src/app/[locale]/(dashboard)/disposal/new/page.tsx" "src/app/[locale]/(dashboard)/disposal/batch/new/page.tsx" tests/disposal-route-structure.test.ts tests/form-frames-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): disposal create page headers on PageHeader with PageBackLink (2B-1 task 22d)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 5 files in the commit.

#### Commit 22e: the three maintenance create and edit pages (B2: "กลับ" instead of "ยกเลิก")

- [ ] **Step 30: Check what this commit builds on**

Run: `node <temp>/p2b1-t22-precheck.mjs 22e`
Expected: 25 `ok` lines (each page: CRLF, `import Link`, the `space-y-5` root, `<Breadcrumbs items={[` and `{tCommon("cancel")}` once, `guard rows LH1=1`) and `preconditions hold for 22e`.

- [ ] **Step 31: Lower the guard rows (the failing guards)**

Run:
```bash
node <temp>/p2b-budget.mjs D/maintenance/new/page.tsx LH1=1:0 --migrated
node <temp>/p2b-budget.mjs D/maintenance/pm/new/page.tsx LH1=1:0 --migrated
node <temp>/p2b-budget.mjs "D/maintenance/pm/[id]/edit/page.tsx" LH1=1:0 --migrated
```
Expected for each: `LH1: 1 -> 0 (row deleted)`, `MIGRATED_LIST_FILES: added`, `written: …`.

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 45 · fail 2` (`LH1` and `L0`, each naming the three pages).

- [ ] **Step 32: Append the failing test**

Append to the end of `tests/form-frames-ui.test.ts`:

```ts

test("the three maintenance create and edit pages: crumbs in PageHeader and กลับ instead of ยกเลิก (2B-1 task 22, B2)", () => {
  const D = "src/app/[locale]/(dashboard)/"
  const pages = {
    "maintenance/new/page.tsx": /<div className="space-y-6">\n\s+<PageHeader\n\s+breadcrumbs=\{\[\{ label: t\("title"\), href: returnTo \}, \{ label: t\("createTitle"\) \}\]\}\n\s+title=\{t\("createTitle"\)\}\n\s+meta=\{plan \? t\("pmCreateSubtitle"\) : t\("createSubtitle"\)\}\n/,
    "maintenance/pm/new/page.tsx": /<div className="space-y-6">\n\s+<PageHeader\n\s+breadcrumbs=\{\[\{ label: t\("pmTitle"\), href: returnTo \}, \{ label: t\("pmCreateTitle"\) \}\]\}\n\s+title=\{t\("pmCreateTitle"\)\}\n\s+meta=\{t\("pmSubtitle"\)\}\n/,
    // The trail ends on the plan code, so the title is the plan's own name and the code is the first fact (spec §4.3.3 rule 6).
    "maintenance/pm/[id]/edit/page.tsx": /<div className="space-y-6">\n\s+<PageHeader\n\s+breadcrumbs=\{\[\{ label: t\("pmTitle"\), href: returnTo \}, \{ label: plan\.planNo, code: true \}\]\}\n\s+title=\{plan\.title\}\n\s+meta=\{<span className="tag">\{plan\.planNo\}<\/span>\}\n/,
  }
  for (const [file, header] of Object.entries(pages)) {
    const source = read(D + file)
    assert.ok(source.includes(HEADER_IMPORT), `${file} imports PageHeader and PageBackLink`)
    assert.match(source, header, file)
    assert.match(source, /\n\s+back=\{<PageBackLink href=\{returnTo\} label=\{tCommon\("back"\)\} \/>\}\n\s+\/>/, file)
    assert.doesNotMatch(source, /<h1\b|<Breadcrumbs\b|from "next\/link"|tCommon\("cancel"\)/, file)
  }
})
```

Run: `node --test tests/form-frames-ui.test.ts`
Expected: FAIL, `tests 5 · pass 4 · fail 1`, on `maintenance/new/page.tsx imports PageHeader and PageBackLink`.

- [ ] **Step 33: Move the three headers (`src/app/[locale]/(dashboard)/maintenance/`)**

`Link` and `Breadcrumbs` leave each file; `PageHeader` renders the trail.

In `new/page.tsx`, replace:

```tsx
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { RepairRecordForm } from "@/components/maintenance/repair-record-form"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
```

with:

```tsx
import { getTranslations } from "next-intl/server"
import { RepairRecordForm } from "@/components/maintenance/repair-record-form"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
```

and replace:

```tsx
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: t("title"), href: returnTo }, { label: t("createTitle") }]} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("createTitle")}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{plan ? t("pmCreateSubtitle") : t("createSubtitle")}</p>
        </div>
        <Link href={returnTo} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium hover:bg-accent">
          {tCommon("cancel")}
        </Link>
      </div>
```

with:

```tsx
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: t("title"), href: returnTo }, { label: t("createTitle") }]}
        title={t("createTitle")}
        meta={plan ? t("pmCreateSubtitle") : t("createSubtitle")}
        back={<PageBackLink href={returnTo} label={tCommon("back")} />}
      />
```

In `pm/new/page.tsx`, replace:

```tsx
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { MaintenancePlanForm } from "@/components/maintenance/maintenance-plan-form"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
```

with:

```tsx
import { getTranslations } from "next-intl/server"
import { MaintenancePlanForm } from "@/components/maintenance/maintenance-plan-form"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
```

and replace:

```tsx
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: t("pmTitle"), href: returnTo }, { label: t("pmCreateTitle") }]} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("pmCreateTitle")}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("pmSubtitle")}</p>
        </div>
        <Link href={returnTo} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium hover:bg-accent">
          {tCommon("cancel")}
        </Link>
      </div>
```

with:

```tsx
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: t("pmTitle"), href: returnTo }, { label: t("pmCreateTitle") }]}
        title={t("pmCreateTitle")}
        meta={t("pmSubtitle")}
        back={<PageBackLink href={returnTo} label={tCommon("back")} />}
      />
```

In `pm/[id]/edit/page.tsx`, replace:

```tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { MaintenancePlanForm } from "@/components/maintenance/maintenance-plan-form"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
```

with:

```tsx
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { MaintenancePlanForm } from "@/components/maintenance/maintenance-plan-form"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
```

and replace:

```tsx
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: t("pmTitle"), href: returnTo }, { label: plan.planNo, code: true }]} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{plan.planNo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{plan.title}</p>
        </div>
        <Link href={returnTo} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium hover:bg-accent">
          {tCommon("cancel")}
        </Link>
      </div>
```

with:

```tsx
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: t("pmTitle"), href: returnTo }, { label: plan.planNo, code: true }]}
        title={plan.title}
        meta={<span className="tag">{plan.planNo}</span>}
        back={<PageBackLink href={returnTo} label={tCommon("back")} />}
      />
```

- [ ] **Step 34: Run the tests for this commit**

Run: `node --test tests/form-frames-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/breadcrumbs-ui.test.ts tests/repair-record-ui.test.ts tests/mobile-field-navigation.test.ts tests/operational-return-navigation.test.ts tests/pm-generation-removed.test.ts`
Expected: PASS, `fail 0`. `breadcrumbs-ui` still finds 11 trails and 8 codes, now reading the `breadcrumbs={[…]}` prop of these three pages.

- [ ] **Step 35: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: 0 fail and 1 more test than before Step 32; tsc clean; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --numstat`
Expected: +8 −13 for each of the three pages, +17 −0 for `tests/form-frames-ui.test.ts`, +3 −3 for `tests/list-frame-guards.test.ts`.

- [ ] **Step 36: Commit**

```bash
git add "src/app/[locale]/(dashboard)/maintenance/new/page.tsx" "src/app/[locale]/(dashboard)/maintenance/pm/new/page.tsx" "src/app/[locale]/(dashboard)/maintenance/pm/[id]/edit/page.tsx" tests/form-frames-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): maintenance create and edit headers on PageHeader, กลับ in place of ยกเลิก (2B-1 task 22e)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 5 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 2B-1 dev-app check (Task 25, spec §10.5 row "หน้าแก้ไข/สร้าง 18 จุด"):**
- The 18 pages at 1440, 768 and 375: title 600; the back button is outline with a left arrow, first in the button group; below `md` a 44px icon under the title; from `md` it sits at the top right of the title row.
- Open each master-data edit page from its list with a filter and on page 2: "กลับ" lands on the same filter, page and page size.
- The supplier form: change a field, press "กลับ": the "leave without saving" question appears; cancel it.
- `/th/maintenance/new`, `/th/maintenance/pm/new`, `/th/maintenance/pm/<id>/edit`: "กลับ" (no "ยกเลิก"), the crumbs 4px above the title; the PM edit title is the plan's name and its number is the first fact.
- `/th/admin/roles/new` reads "เพิ่มบทบาท"; `/th/assets/<id>/components`: the header scrolls away with the page and reads "จัดการส่วนควบ" with the tag and name under it.
- `/th/disposal/batch/new` at 375: a 44px icon back button; at 1440: "กลับคิวตัดจำหน่าย".
- NVDA (for the person): the icon back button reads "กลับ".

---

### Task 23: The operation form headers on `PageHeader` (I13) · 5 commits

Spec §10.3 row 23, with §4.4.2 (rows `checkin-form.tsx:295-297`, `checkout-form.tsx:392-394`, `transfer-form.tsx:124-126`, `bulk-move-form.tsx:84-89`, `audit-round-form.tsx:133-135`), I13 and §4.6.1 rule 2. One commit per file. All five are CRLF 2C files: exact-string replacement only, no formatter. The first four are batch 1 forms that 2C already moved; `audit-round-form.tsx` is a batch 3 form whose fields wait for 2C plan 3, and only its header changes here.

Rulings this task applies:
- **I13:** these forms had no back button and get none (B2, §4.5.1). The title and meta are the old ones; the header passes `className="mb-6"` in place of the old `mb-6` div, and the `mx-auto max-w-5xl` wrappers stay.
- **§4.4.2:** `bulk-move` puts `t("selectedCount", { count: assetIds.length })` into `meta` (under the title) instead of the right-hand column.
- **§4.8 ruling 23:** `OperationShell` in `checkout-form.tsx` stays the card wrapper; only the header inside it changes.
- **`MIGRATED_LIST_FILES`:** every file joins it (2B touches none again). `checkin-form.tsx` keeps its LV2 row at its `KEEP` number 9 (2D).
- The test of each commit goes to the end of `tests/form-frames-ui.test.ts` (Task 22).

What users will see: on `/th/asset-management/checkin`, `checkout`, `transfer`, `bulk-move` and `/th/audit/rounds/new` the title is weight 600; on bulk move the selected count sits under the title in 13px. Form widths and the card do not change.

Not in this task: the 2C fields of `audit-round-form.tsx` (2C plan 3), `asset-scan-search-tool.tsx` and `asset-label-batch-tool.tsx` (2C plan 4, I13), messages. No new class.

**Files:**
- 23a `src/components/asset-operations/checkin-form.tsx` · 23b `checkout-form.tsx` · 23c `transfer-form.tsx` · 23d `bulk-move-form.tsx` · 23e `src/components/audit/audit-round-form.tsx` (CRLF, 2 replacements each)
- Each commit: `tests/form-frames-ui.test.ts` (LF, one test appended), `tests/list-frame-guards.test.ts` (through `p2b-budget.mjs` only)

**Must keep passing without edits:** `tests/asset-handover-checkin.test.ts`, `asset-handover-checkout`, `asset-operation-confirmation-ui`, `audit-component-round-routes`, `checkin-send-to-repair-ui`, `choice-controls-ui`, `file-evidence-ui`, `html-lang-and-years`, `legacy-checkin-flow`, `form-migration-guards` (never edited).

**Interfaces:**
- Consumes: `PageHeader` (Task 3); `p2b1-t22-precheck.mjs` (Task 22 Step 1), `p2b-budget.mjs` (Task 1); `tests/form-frames-ui.test.ts` with its `read` and `C` (Task 22).
- Produces: the 5 headers on `PageHeader`, the 5 files in `MIGRATED_LIST_FILES`, 5 more tests in `tests/form-frames-ui.test.ts`.

| commit | file | LFG rows | `p2b-budget.mjs` arguments |
|---|---|---|---|
| 23a | `c/asset-operations/checkin-form.tsx` | LH1 1 → – · LV2 9 (`KEEP`) | `LH1=1:0 LV2=9:9 --migrated` |
| 23b | `c/asset-operations/checkout-form.tsx` | LH1 1 → – | `LH1=1:0 --migrated` |
| 23c | `c/asset-operations/transfer-form.tsx` | LH1 1 → – | `LH1=1:0 --migrated` |
| 23d | `c/asset-operations/bulk-move-form.tsx` | LH1 1 → – | `LH1=1:0 --migrated` |
| 23e | `c/audit/audit-round-form.tsx` | LH1 1 → – | `LH1=1:0 --migrated` |

Each commit runs the same 6 steps. The table after the steps gives each commit's text, its import anchor, the line counts and the commit message.

- [ ] **Step 1 (each commit): Check what it builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b1-t22-precheck.mjs <commit>` (`23a` … `23e`)
Expected: `git status` prints nothing; the script prints the `ok` count of the table below and `preconditions hold for <commit>`.

- [ ] **Step 2 (each commit): Lower the guard row (the failing guards)**

Run: `node <temp>/p2b-budget.mjs <path> <arguments>` with the path and arguments of the table above.
Expected: `LH1: 1 -> 0 (row deleted)` (23a also `LV2: 9 kept`), `MIGRATED_LIST_FILES: added`, `written: <path>`.

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 45 · fail 2`: `LH1` lists the file as `1 > 0`, and `L0` lists `LH1 <path>: 1 > 0`.

- [ ] **Step 3 (each commit): Append the failing test**

Append the commit's test (below) to the end of `tests/form-frames-ui.test.ts`.

Run: `node --test tests/form-frames-ui.test.ts`
Expected: FAIL, exactly 1 failing test, the new one, on `<file> imports PageHeader`.

- [ ] **Step 4 (each commit): Replace the header**

Two exact replacements: (1) replace the import anchor of the table with itself followed by `import { PageHeader } from "@/components/ui/page-header"` on the next line; (2) replace the old header with the new one (below).

- [ ] **Step 5 (each commit): Run the tests and verify**

Run: `node --test tests/form-frames-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `fail 0`.

Run: `node --test tests/asset-handover-checkin.test.ts tests/asset-handover-checkout.test.ts tests/asset-operation-confirmation-ui.test.ts tests/audit-component-round-routes.test.ts tests/checkin-send-to-repair-ui.test.ts tests/choice-controls-ui.test.ts tests/file-evidence-ui.test.ts tests/html-lang-and-years.test.ts tests/legacy-checkin-flow.test.ts`
Expected: PASS, `fail 0`.

Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: 0 fail and 1 more test than before Step 3; tsc clean; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --numstat`
Expected: the counts of the table; `tests/list-frame-guards.test.ts` +1 −1. A file that shows every line changed was normalized: restore its line endings.

- [ ] **Step 6 (each commit): Commit**

```bash
git add <file> tests/form-frames-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "<message of the table>

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit; `git status --short src tests messages` prints nothing.

| commit | precheck `ok` lines | import anchor (2) | `git diff --numstat` (file · test) | message |
|---|---|---|---|---|
| 23a | 9 | `import { OperationReviewDialog } from "@/components/ui/operation-review-dialog"` | +2 −3 · +7 −0 | `feat(ui): check-in form header on PageHeader (2B-1 task 23a)` |
| 23b | 10 | `import { OperationReviewDialog } from "@/components/ui/operation-review-dialog"` | +2 −3 · +10 −0 | `feat(ui): check-out OperationShell header on PageHeader (2B-1 task 23b)` |
| 23c | 9 | `import { OperationReviewDialog } from "@/components/ui/operation-review-dialog"` | +2 −3 · +7 −0 | `feat(ui): transfer form header on PageHeader (2B-1 task 23c)` |
| 23d | 10 | `import { Input } from "@/components/ui/input"` | +2 −6 · +7 −0 | `feat(ui): bulk move form header on PageHeader with the count as meta (2B-1 task 23d)` |
| 23e | 9 | `import { useApiError } from "@/components/ui/use-api-error"` (here the new line goes **before** the anchor) | +2 −3 · +7 −0 | `feat(ui): new audit round form header on PageHeader (2B-1 task 23e)` |

#### Commit 23a: `checkin-form.tsx`

Old header (once in the file):

```tsx
      <div className="mb-6">
        <h1 className="break-words text-2xl font-bold text-foreground">{t("title")}</h1>
      </div>
```

New header:

```tsx
      <PageHeader title={t("title")} className="mb-6" />
```

Test to append:

```ts

test("the check-in form draws its title with PageHeader (2B-1 task 23, I13)", () => {
  const source = read(`${C}asset-operations/checkin-form.tsx`)
  assert.ok(source.includes('import { PageHeader } from "@/components/ui/page-header"'), "checkin-form.tsx imports PageHeader")
  assert.match(source, /<div className="mx-auto max-w-5xl">\n\s+<PageHeader title=\{t\("title"\)\} className="mb-6" \/>\n/)
  assert.doesNotMatch(source, /<h1\b|PageBackLink/, "the operation forms keep having no back button (B2)")
})
```

#### Commit 23b: `checkout-form.tsx` (inside `OperationShell`)

Old header:

```tsx
      <div className="mb-6">
        <h1 className="break-words text-2xl font-bold text-foreground">{title}</h1>
      </div>
```

New header:

```tsx
      <PageHeader title={title} className="mb-6" />
```

Test to append:

```ts

test("the check-out form's OperationShell draws its title with PageHeader and stays a card (2B-1 task 23, I13)", () => {
  const source = read(`${C}asset-operations/checkout-form.tsx`)
  assert.ok(source.includes('import { PageHeader } from "@/components/ui/page-header"'), "checkout-form.tsx imports PageHeader")
  assert.match(
    source,
    /function OperationShell\(\{ title, children \}: \{ title: string; children: React\.ReactNode \}\) \{\n\s+return \(\n\s+<div className="mx-auto max-w-5xl">\n\s+<PageHeader title=\{title\} className="mb-6" \/>\n\s+<section className="min-w-0 rounded-lg border border-border bg-surface p-4 sm:p-6">\{children\}<\/section>/,
  )
  assert.doesNotMatch(source, /<h1\b|PageBackLink/)
})
```

#### Commit 23c: `transfer-form.tsx`

The old and new headers are the text of 23a (the same three lines occur once in `transfer-form.tsx`).

Test to append:

```ts

test("the transfer form draws its title with PageHeader (2B-1 task 23, I13)", () => {
  const source = read(`${C}asset-operations/transfer-form.tsx`)
  assert.ok(source.includes('import { PageHeader } from "@/components/ui/page-header"'), "transfer-form.tsx imports PageHeader")
  assert.match(source, /<div className="mx-auto max-w-5xl">\n\s+<PageHeader title=\{t\("title"\)\} className="mb-6" \/>\n/)
  assert.doesNotMatch(source, /<h1\b|PageBackLink/)
})
```

#### Commit 23d: `bulk-move-form.tsx`

Old header:

```tsx
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <div className="text-sm text-muted-foreground">
          {t("selectedCount", { count: assetIds.length })}
        </div>
      </div>
```

New header:

```tsx
      <PageHeader title={t("title")} meta={t("selectedCount", { count: assetIds.length })} className="mb-6" />
```

Test to append:

```ts

test("the bulk move form shows the selected count as the header's meta (2B-1 task 23, I13)", () => {
  const source = read(`${C}asset-operations/bulk-move-form.tsx`)
  assert.ok(source.includes('import { PageHeader } from "@/components/ui/page-header"'), "bulk-move-form.tsx imports PageHeader")
  assert.match(source, /<PageHeader title=\{t\("title"\)\} meta=\{t\("selectedCount", \{ count: assetIds\.length \}\)\} className="mb-6" \/>/)
  assert.doesNotMatch(source, /<h1\b|PageBackLink/)
})
```

#### Commit 23e: `audit-round-form.tsx`

Import: replace `import { useApiError } from "@/components/ui/use-api-error"` with:

```tsx
import { PageHeader } from "@/components/ui/page-header"
import { useApiError } from "@/components/ui/use-api-error"
```

Old header:

```tsx
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t("createTitle")}</h1>
      </div>
```

New header:

```tsx
      <PageHeader title={t("createTitle")} className="mb-6" />
```

Test to append:

```ts

test("the new audit round form draws its title with PageHeader (2B-1 task 23, I13)", () => {
  const source = read(`${C}audit/audit-round-form.tsx`)
  assert.ok(source.includes('import { PageHeader } from "@/components/ui/page-header"'), "audit-round-form.tsx imports PageHeader")
  assert.match(source, /<div className="mx-auto max-w-5xl">\n\s+<PageHeader title=\{t\("createTitle"\)\} className="mb-6" \/>\n/)
  assert.doesNotMatch(source, /<h1\b|PageBackLink/)
})
```

**For the plan 2B-1 dev-app check (Task 25, spec §10.5 row "ส่งมอบ · รับคืน · โอน · ย้ายหลายรายการ · เพิ่มเป็นชุด · รอบตรวจนับใหม่"):** at 1440 and 375 the title is 600 with 24px below it; the check-out form is still a card; the bulk move count sits under the title; no back button appeared; the form widths are unchanged.

---

### Task 24: The 2C files that already moved: settings table headers, the asset batch form, the depreciation builder (R-e, R-f, I13) · 3 commits

Spec §10.3 row 24, with §9.2.1 ("2C ย้ายแล้ว 2 ไฟล์"), §8.4 (R7 rows), R-e, R-f, I12 and I13. One commit per file. All three are CRLF 2C files that 2C has finished (in FMG `MIGRATED_FILES`): exact-string replacement only, never a formatter, and no 2C plan is open while 2B-1 runs (R-e).

Rulings this task applies:
- **24a, §9.2.1:** in `system-settings-form.tsx` only the three `<thead className="bg-muted/40">` lines (`:1269`, `:1973`, `:2006`) and the `Head` helper (`:2669-2671`) change. The settings tab row (`:948-967`, O7) is not touched.
- **24a, ruling (spec gap), the header string:** the three tables keep their own `px-4 py-3` cells, so `Head` does not take Task 4's `dataTableHeadClasses`: its `first:`/`last:` gutters and `px-3` would misalign every header with its column. `Head` writes the DataTable header look on the file's own padding instead: `bg-surface px-4 py-2.5 text-left align-bottom text-meta font-medium text-faint-foreground` (white, 13/500 faint, no capitals; the row stays 40px tall). The `<thead>` loses its class; the tables' `divide-y divide-border` still draws the line under the header.
- **24b, §9.2.1, I13:** `asset-batch-form.tsx` gets `PageHeader` for its title and subtitle (no back button, B2) and the three identical `<thead className="bg-muted/40 text-left text-xs font-semibold text-muted-foreground">` lines become `<thead className="bg-surface text-left text-meta font-medium text-faint-foreground">`. The `<table>` and `<th className="… px-3 py-2">` strings stay character for character, because `tests/asset-batch-form-layout.test.ts:33-59` pins them in order.
- **24c, R-f:** `depreciation-policy-builder.tsx` takes `formatCount` and `formatMoney` from `@/lib/display-format`, and its local `formatMoney` goes. The shared `formatMoney` prints the same th-TH 2-decimal text, except that an amount that rounds to zero prints `0.00` instead of `-0.00`.
- **`MIGRATED_LIST_FILES`:** all three join it. Their remaining rows equal `KEEP`: `system-settings-form.tsx` LB1 1 (the move-out button `:1412`), LV2 8 and LS1 1 (`Metric`, 2D); `asset-batch-form.tsx` LV2 8.
- The test of each commit goes to the end of `tests/form-frames-ui.test.ts` (Task 22).

What users will see: on `/th/admin/settings` (the category prefix table, the advanced settings table and the change review table) and `/th/assets/batch/new` (the row table, the review table and the receipt table) the table headers are white with 13px faint words and no capitals; the batch page title is 600; the depreciation preview's "age in months" groups thousands the Thai way on every machine.

Not in this task: the settings tab row (2C plan 5, O7), the `uppercase` labels outside tables in `system-settings-form.tsx` (2D), the field markup of these files (done by 2C), messages. No new class (all checked in Task 22 Step 1).

**Files:**
- 24a `src/components/admin/system-settings-form.tsx` (CRLF, 2 replacements, the first one at 3 places) · 24b `src/components/assets/asset-batch-form.tsx` (CRLF, 3 replacements, the third one at 3 places) · 24c `src/components/admin/depreciation-policy-builder.tsx` (CRLF, 3 replacements)
- Each commit: `tests/form-frames-ui.test.ts` (one test appended) and `tests/list-frame-guards.test.ts` (through `p2b-budget.mjs`); 24a and 24b also `tests/visual-foundation-guards.test.ts` (their `TABLE_HEADER_FILLS` row, through `p2b-budget.mjs`; the script may also drop the `// 2B-1` comment once no row is left under it)

**Must keep passing without edits:** `tests/asset-batch-form-layout.test.ts:5-60`, `tests/settings-depreciation-policy-ui.test.ts`, `tests/settings-tab-persistence-ui.test.ts:5-13`, `tests/settings-ldap-role-ui.test.ts`, `tests/system-log-history.test.ts`, `tests/sticky-form-footer-ui.test.ts`, `tests/display-format.test.ts`, `tests/form-migration-guards.test.ts` (never edited).

**Interfaces:**
- Consumes: `PageHeader` (Task 3); `formatCount(value: number): string` and `formatMoney(value: number): string` from `@/lib/display-format` (2A); the scripts and `tests/form-frames-ui.test.ts` of Task 22.
- Produces: 6 table headers without a fill (VFG R7 44 → 29 for all of 2B-1 together with Tasks 13–21), LT1 1 → 0 for the settings form, LV1 1 → 0 for the builder, 3 more tests.

| commit | file | rows | `p2b-budget.mjs` arguments |
|---|---|---|---|
| 24a | `c/admin/system-settings-form.tsx` | R7 3 → – · LT1 1 → – · LB1 1, LV2 8, LS1 1 (`KEEP`) | `R7=3:0 LB1=1:1 LT1=1:0 LV2=8:8 LS1=1:1 --migrated` |
| 24b | `c/assets/asset-batch-form.tsx` | R7 3 → – · LH1 1 → – · LV2 8 (`KEEP`) | `R7=3:0 LH1=1:0 LV2=8:8 --migrated` |
| 24c | `c/admin/depreciation-policy-builder.tsx` | LV1 1 → – | `LV1=1:0 --migrated` |

#### Commit 24a: the three settings table headers

- [ ] **Step 1: Check what this commit builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b1-t22-precheck.mjs 24a`
Expected: `git status` prints nothing; 9 `ok` lines (the old `Head` line once, `<thead className="bg-muted/40">` 3 times, `guard rows LB1=1 LS1=1 LT1=1 LV2=8 R7=3`) and `preconditions hold for 24a`.

- [ ] **Step 2: Lower the guard rows (the failing guards)**

Run: `node <temp>/p2b-budget.mjs c/admin/system-settings-form.tsx R7=3:0 LB1=1:1 LT1=1:0 LV2=8:8 LS1=1:1 --migrated`
Expected:
```
R7: 3 -> 0 (row deleted)
LB1: 1 kept
LT1: 1 -> 0 (row deleted)
LV2: 8 kept
LS1: 1 kept
MIGRATED_LIST_FILES: added
written: src/components/admin/system-settings-form.tsx
```

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 44 · fail 3`: VFG `R7 interim: table-header fills wait for DataTable (2B), file by file` (`src/components/admin/system-settings-form.tsx: 3 > 0`), LFG `LT1` (`1 > 0`) and `L0` (`LT1 src/components/admin/system-settings-form.tsx: 1 > 0`).

- [ ] **Step 3: Append the failing test**

Append to the end of `tests/form-frames-ui.test.ts`:

```ts

test("the three settings tables have the white 13/500 header in sentence case (2B-1 task 24, R-e)", () => {
  const source = read(`${C}admin/system-settings-form.tsx`)
  assert.equal(source.match(/<thead>/g)?.length, 3, "the prefix, advanced and change-review tables")
  assert.match(
    source,
    /function Head\(\{ children \}: \{ children: React\.ReactNode \}\) \{\n  return <th className="bg-surface px-4 py-2\.5 text-left align-bottom text-meta font-medium text-faint-foreground">\{children\}<\/th>\n\}/,
  )
  assert.doesNotMatch(source, /<thead className=|\bbg-muted\//)
})
```

Run: `node --test tests/form-frames-ui.test.ts`
Expected: FAIL, exactly 1 failing test (the new one), on `the prefix, advanced and change-review tables` (`undefined !== 3`: no bare `<thead>` yet).

- [ ] **Step 4: The header changes (`src/components/admin/system-settings-form.tsx`)**

(1) Replace all three occurrences of `<thead className="bg-muted/40">` (at `:1269` with 16 spaces before it, at `:1973` and `:2006` with 14) with `<thead>`. Keep each line's indentation.

(2) Replace the helper at the end of the file:

```tsx
function Head({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{children}</th>
}
```

with:

```tsx
// The white 13/500 header of the shared DataTable (spec 2B §3.4, R-e), on this file's own px-4 cells.
function Head({ children }: { children: React.ReactNode }) {
  return <th className="bg-surface px-4 py-2.5 text-left align-bottom text-meta font-medium text-faint-foreground">{children}</th>
}
```

Check: `grep -n "bg-muted/\|<thead" src/components/admin/system-settings-form.tsx` prints the 3 `<thead>` lines only.

- [ ] **Step 5: Run the tests and verify**

Run: `node --test tests/form-frames-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/settings-depreciation-policy-ui.test.ts tests/settings-tab-persistence-ui.test.ts tests/settings-ldap-role-ui.test.ts tests/system-log-history.test.ts tests/sticky-form-footer-ui.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `fail 0`.

Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: 0 fail and 1 more test than before Step 3; tsc clean; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --numstat`
Expected: `system-settings-form.tsx` +5 −4, `tests/form-frames-ui.test.ts` +10 −0, `tests/list-frame-guards.test.ts` +1 −1, `tests/visual-foundation-guards.test.ts` +0 −1 (the R7 row).

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/system-settings-form.tsx tests/form-frames-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): settings table headers white and in sentence case (2B-1 task 24a)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit.

#### Commit 24b: the asset batch form (`PageHeader` and three table headers)

- [ ] **Step 7: Check what this commit builds on**

Run: `node <temp>/p2b1-t22-precheck.mjs 24b`
Expected: 10 `ok` lines (`guard rows LH1=1 LV2=8 R7=3`, the old `<thead` 3 times) and `preconditions hold for 24b`.

- [ ] **Step 8: Lower the guard rows (the failing guards)**

Run: `node <temp>/p2b-budget.mjs c/assets/asset-batch-form.tsx R7=3:0 LH1=1:0 LV2=8:8 --migrated`
Expected: `R7: 3 -> 0 (row deleted)`, `LH1: 1 -> 0 (row deleted)`, `LV2: 8 kept`, `MIGRATED_LIST_FILES: added`, `written: src/components/assets/asset-batch-form.tsx`.

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 44 · fail 3`: VFG R7 (`asset-batch-form.tsx: 3 > 0`), LFG `LH1` and `L0`.

- [ ] **Step 9: Append the failing test**

Append to the end of `tests/form-frames-ui.test.ts`:

```ts

test("the asset batch form: PageHeader and the white table header on its three tables (2B-1 task 24, I13, R-e)", () => {
  const source = read(`${C}assets/asset-batch-form.tsx`)
  assert.ok(source.includes('import { PageHeader } from "@/components/ui/page-header"'), "asset-batch-form.tsx imports PageHeader")
  assert.match(source, /<div className="mx-auto max-w-6xl">\n\s+<PageHeader title=\{t\("batchCreateTitle"\)\} meta=\{t\("batchCreateSubtitle"\)\} className="mb-6" \/>\n/)
  assert.equal(source.match(/<thead className="bg-surface text-left text-meta font-medium text-faint-foreground">/g)?.length, 3)
  assert.doesNotMatch(source, /<h1\b|\bbg-muted\/|text-xs font-semibold text-muted-foreground/)
})
```

Run: `node --test tests/form-frames-ui.test.ts`
Expected: FAIL, exactly 1 failing test, on `asset-batch-form.tsx imports PageHeader`.

- [ ] **Step 10: The header changes (`src/components/assets/asset-batch-form.tsx`)**

(1) Replace `import { NativeSelect } from "@/components/ui/native-select"` with:

```tsx
import { NativeSelect } from "@/components/ui/native-select"
import { PageHeader } from "@/components/ui/page-header"
```

(2) Replace:

```tsx
      <div className="mb-6 min-w-0">
        <h1 className="break-words text-2xl font-bold text-foreground">{t("batchCreateTitle")}</h1>
        <p className="mt-1 break-words text-sm text-muted-foreground">{t("batchCreateSubtitle")}</p>
      </div>
```

with:

```tsx
      <PageHeader title={t("batchCreateTitle")} meta={t("batchCreateSubtitle")} className="mb-6" />
```

(3) Replace all three occurrences (`:886`, `:979`, `:1037`; keep each line's indentation) of

```tsx
<thead className="bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
```

with

```tsx
<thead className="bg-surface text-left text-meta font-medium text-faint-foreground">
```

- [ ] **Step 11: Run the tests and verify**

Run: `node --test tests/form-frames-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/asset-batch-form-layout.test.ts tests/asset-model-selection.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `fail 0`.

Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: 0 fail and 1 more test than before Step 9; tsc clean; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --numstat`
Expected: `asset-batch-form.tsx` +5 −7, `tests/form-frames-ui.test.ts` +8 −0, `tests/list-frame-guards.test.ts` +1 −1 (it may also lose an empty `// 2B-1` comment line), `tests/visual-foundation-guards.test.ts` +0 −1 or +0 −2 (the R7 row, and the `// 2B-1` comment once Tasks 13–21 and 24a have emptied that group).

- [ ] **Step 12: Commit**

```bash
git add src/components/assets/asset-batch-form.tsx tests/form-frames-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): asset batch form header on PageHeader and its table headers white (2B-1 task 24b)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit.

#### Commit 24c: the depreciation builder numbers (R-f)

- [ ] **Step 13: Check what this commit builds on**

Run: `node <temp>/p2b1-t22-precheck.mjs 24c`
Expected: 10 `ok` lines (`guard rows LV1=1`, `function formatMoney(value: number) {` once) and `preconditions hold for 24c`.

- [ ] **Step 14: Lower the guard row (the failing guards)**

Run: `node <temp>/p2b-budget.mjs c/admin/depreciation-policy-builder.tsx LV1=1:0 --migrated`
Expected: `LV1: 1 -> 0 (row deleted)`, `MIGRATED_LIST_FILES: added`, `written: src/components/admin/depreciation-policy-builder.tsx`.

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 45 · fail 2` (`LV1` with `depreciation-policy-builder.tsx: 1 > 0`, and `L0`).

- [ ] **Step 15: Append the failing test**

Append to the end of `tests/form-frames-ui.test.ts`:

```ts

test("the depreciation builder formats its preview with the shared th-TH helpers (2B-1 task 24, R-f)", () => {
  const source = read(`${C}admin/depreciation-policy-builder.tsx`)
  assert.ok(source.includes('import { formatCount, formatMoney } from "@/lib/display-format"'), "depreciation-policy-builder.tsx imports the shared helpers")
  assert.match(source, /value=\{formatCount\(preview\.ageMonths\)\}/)
  assert.equal(source.match(/value=\{formatMoney\(preview\.\w+\)\}/g)?.length, 3)
  assert.doesNotMatch(source, /function formatMoney\b|toLocaleString/, "no local formatter is left")
})
```

Run: `node --test tests/form-frames-ui.test.ts`
Expected: FAIL, exactly 1 failing test, on `depreciation-policy-builder.tsx imports the shared helpers`.

- [ ] **Step 16: The changes (`src/components/admin/depreciation-policy-builder.tsx`)**

(1) The import, after the editor helpers. Replace:

```tsx
} from "@/lib/depreciation-policy-editor"
```

with:

```tsx
} from "@/lib/depreciation-policy-editor"
import { formatCount, formatMoney } from "@/lib/display-format"
```

(2) Replace:

```tsx
          <PreviewMetric label={labels.depreciationPreviewAgeMonths} value={preview.ageMonths.toLocaleString()} />
```

with:

```tsx
          <PreviewMetric label={labels.depreciationPreviewAgeMonths} value={formatCount(preview.ageMonths)} />
```

(3) The local helper at the end of the file goes; the file still ends with `}` and one line break. Replace:

```tsx
    return parsed.policy
  }
}

function formatMoney(value: number) {
  return value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
```

with:

```tsx
    return parsed.policy
  }
}
```

The three `formatMoney(preview.…)` calls at `:299-301` stay as they are and now call the shared helper.

- [ ] **Step 17: Run the tests and verify**

Run: `node --test tests/form-frames-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/settings-depreciation-policy-ui.test.ts tests/display-format.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `fail 0`.

Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: 0 fail and 1 more test than before Step 15 (13 more than before Task 22); tsc clean; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected: exit 0; the only `slack` lines are the two LB1 `0 → 1` rows. If Tasks 1–21 all landed, the live totals are the spec §10.4 table C column "หลัง 2B-1": R7 29 in 20 files, LH1 34, LH2 11, LB1 12, LP1 8, LF1 3, LT1 36, LT2 2, LT3 8, LT4 4, LT5 9, LV1 20, LV2 113, LV3 42, LS1 23, LS2 20, LK1 11, LN1 12, LN2 7, LR1 0. Report any total that differs; Task 26 writes the live totals.

Run: `git diff --numstat`
Expected: `depreciation-policy-builder.tsx` +2 −5, `tests/form-frames-ui.test.ts` +8 −0, `tests/list-frame-guards.test.ts` +1 −1 (or +1 −2 when the `// 2B-1` comment of LV1 goes with the last row).

- [ ] **Step 18: Commit**

```bash
git add src/components/admin/depreciation-policy-builder.tsx tests/form-frames-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "refactor(ui): depreciation builder numbers through formatCount and formatMoney (2B-1 task 24c)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `tests/form-frames-ui.test.ts` now holds 13 tests (149 lines). `git status --short src tests messages` prints nothing.

**For the plan 2B-1 dev-app check (Task 25, spec §10.5 row "ตั้งค่า (3 ตาราง) · เพิ่มเป็นชุด (3 ตาราง) · ตัวสร้างนโยบายค่าเสื่อม"):** at 1440 and 375 the 6 table headers are white with 13/500 faint words, in sentence case, lined up with their columns; the settings tab row is unchanged (O7); the batch page title is 600; the depreciation preview shows the age in months with th-TH grouping and money with 2 decimals.

---

### Task 25: Verify, production build and dev-app check (controller runs this task, not an implementer)

**Files:**
- Create then delete: `.claude/launch.json` (temporary; never committed)
- Evidence: `.superpowers/sdd/screenshots/ui-phase2b-plan1/after/` (git-ignored)
- Modify: only files needed to fix problems found here. Each fix gets its own small commit, with a test where one is possible, through an implementer and the normal review.

**Interfaces:**
- Consumes: Tasks 1–24 committed; the Task 0 before images and ids.
- Produces: the after images and `.superpowers/sdd/<plan workspace>/task-25-findings.md`, which Task 26 turns into the "Dev-app check" bullets.

- [ ] **Step 1: Full verify.** Run `npm run verify` (lint, tests, build). Record the test count and the build page count for Task 27.

- [ ] **Step 2: Production server.** Confirm the dev database (Task 0 Step 4). Create `.claude/launch.json` with `runtimeExecutable: "node"`, `runtimeArgs: ["node_modules/next/dist/bin/next", "start", "-p", "3001"]`, `port: 3001`, `autoPort: false`, and start it with `preview_start`. Log in with the seed admin; do not echo the password.

- [ ] **Step 3: Writes nothing.** Delete through ⋯ only up to the confirm dialog, then press "ยกเลิก" every time. Never press Save in a form. On the supplier form try only the "leave without saving" question, then cancel it. The departments count query is read-only.

- [ ] **Step 4: Screens.** Take every Task 0 view again under the same name in `after/` and compare (height, wrapping, truncation, lost color or shape). Then walk spec §10.5 row by row at 1440, 1366, 1280, 1024, 768, 700 and 375, in Thai, plus one English pass, at 100% and 200% zoom:
  - **Sidebar:** with the seed admin and with an account that has only `asset:view` (create none; if no such account exists in the dev data, list this check for the user): "ทะเบียนทรัพย์สิน" is the first item and one click reaches `/th/assets` · check-out and check-in are two clicks · no third level · no repeated icon when collapsed · the active item is right on `/th/assets/<id>`, `/th/assets/new` and `/th/asset-management/checkout` · the drawer returns focus.
  - **8 master-data lists and users:** h1 600 · labeled filter panels 40 (44 on phones) with "ล้างตัวกรอง" only while a filter is on · white table header 13/500, no uppercase, 12px frame · rows about 46 · "แก้ไข" + ⋯ → "ลบ" → confirm (cancel) · row click opens the edit page · clicks on ⋯ and its items do not reach the row · ⋯ is a bottom sheet on phones with 44px items · the scroll hint shows only when the table overflows · the footer reads "1–25 จาก N รายการ · หน้า 1 จาก M" with 25/50/100 · `?page=99` lands on the last page · `StatStrip` has no fill; a filtering cell has `primary-soft` and an underline · codes are mono and select as one word.
  - **Departments (B4):** the total equals the department count before the change · page 2 → edit → "กลับ" returns to page 2 with the same page size · a search keeps the page size.
  - **Brands:** the brand panel is the old vertical list · the selected brand has "แก้ไขยี่ห้อ" + ⋯ "ลบ" · the 4 header buttons wrap at 768.
  - **Changed before their own plan:** `/th/assets` header (600, create button 36), footer without arrows and with the text on the left, row highlight on focus · `/th/audit/findings` and `/th/audit/rounds` headers from the thin wrapper · the frameless 36px search on the 6 `MasterDataSearch` pages · `ClickableTableRow` rows in disposal and maintenance (a checkbox in a row does not leave the row highlighted).
  - **18 new/edit pages:** the outline back button with a left arrow first in the button group · an icon button with 44px below `md` · it carries `returnTo` (open it from a filtered list on page 2) · the supplier form still asks before leaving · the 3 maintenance pages read "กลับ" · the role create page reads "เพิ่มบทบาท" · the component manager header is not sticky.
  - **Operation forms and new audit round, asset batch:** `PageHeader` with h1 600 · form width unchanged · `OperationShell` still a card.
  - **Settings tables, asset batch tables, depreciation builder:** white table headers · numbers th-TH · the settings tab row unchanged (O7).

- [ ] **Step 5: Keyboard.** Header Tab order: back → ⋯ → secondary → primary · Tab into a row: the row is highlighted, then "แก้ไข" shows `primary-soft` · ⋯ opens with Enter, arrows move, Esc closes and returns focus to ⋯ · confirm delete then cancel returns focus to ⋯ · sort links take Tab and show the focus ring · an overflowing table takes Tab on its scroller (`role="region"`) and scrolls with the arrow keys · chips and "ล้างทั้งหมด" take Tab.

- [ ] **Step 6: axe.** Inject `node_modules/axe-core/axe.min.js` with `page.addScriptTag({ path })` (from a script under the repo or `.playwright-mcp/`) and run `axe.run(main, { runOnly: ["color-contrast", "label", "aria-valid-attr-value", "aria-required-attr", "button-name", "nested-interactive"] })` on `/th/master-data/branches` with a filter on, `/th/master-data/suppliers` at 375 and 1440, `/th/master-data/brands`, `/th/admin/users`, `/th/master-data/branches/<id>/edit` and `/th/assets`. Expected: 0 violations.

- [ ] **Step 7: Forced colors and reduced motion.** With Playwright `emulateMedia`: focus rings on sort links, the next-step button, ⋯, chips and the table scroller · the underline of the selected `StatStrip` cell · the selected page size stays distinct (weight 600) · the disabled "previous" button. Reduced motion: no lingering row transition, the search spinner stops, the ⋯ sheet does not slide.

- [ ] **Step 8: NVDA and real devices.** If NVDA is not available to you, list these checks for the user and do not mark them done: the icon back button reads "กลับ" · the next-step button reads "แก้ไข BR-001" · ⋯ reads "การดำเนินการของ BR-001" · the sorted column header reads its order · the actions column header reads "การดำเนินการ" · the footer text is read on page change (`aria-live`) · the selected page size reads as current · the unlabelled search reads "ค้นหา" · an empty value reads "ไม่มีข้อมูล" · the collapsed sidebar reads item names. Real iPhone and iPad: the ⋯ sheet clears the home bar, list rows and the back icon are easy to tap. Add them to the open manual checks; all of them must be done before the one phase-2 deploy.

- [ ] **Step 9: Findings report.** Write `task-25-findings.md` in the plan workspace: fixes made (commit + one line each, or "none") · checked and passed · found but not caused by plan 2B-1 · accepted mixes · what still needs a person.

- [ ] **Step 10: Clean up.** Stop the server and delete `.claude/launch.json` and any helper script you put under the repo. `git status --short` must show no stray files.

---

### Task 26: Repo documentation for plan 2B-1 (the controller adds the verify numbers and the wiki in Task 27)

Spec §10.6 row 2B-1, with the checklists of §3.20, §4.10, §5.13, §6.12 and §9.11 (spec §10.6 says which plan does what; where a section-file checklist names a file that row 2B-1 does not, it waits for its own plan). Five files, all CRLF in the working tree (`i/lf w/crlf`): edit them with exact-string replacement, keep the endings, never run a formatter, and match on the quoted strings, not on line numbers (the numbers below are those at `b16d152`).

Rulings made in this task:
- **What goes where (spec §10.6 row 2B-1):** DESIGN.md gets the rules of every 2B-1 primitive and the list-page rules; the register-only text of `:502-510` stays for 2B-3, and its heading says so. `docs/14_UI_UX_DESIGN_SYSTEM.md` gets 13 rows in Shared Components, the LFG sentence and, by the registry rule at the top of that table ("update this registry in the same commit"), a registry row for the 2B spec and this plan. The handoff gets the 2B-1 section, the pipeline of spec §8.1 in place of "plans 3–5 start after 2B merges" (`:441-445`, `:475`), and one pointer sentence in each older bullet that 2B-1 made stale (`:256`, `:296`, `:321`, `:343`), so their history still reads as written. The changelog gets the Thai entry. `.impeccable/design.json` gets the 8 components of R-s.
- **DESIGN.md frontmatter:** `typography.display.fontWeight` 700 → 600, so the frontmatter matches §3. No other frontmatter change: the new components live in `.impeccable/design.json`, whose `refersTo` names follow R-s (`page-header`, `table`, `pagination`, `tabs`, `stat-strip`, `key-value`, `row-action`, `filter-chip`).
- **Dates:** the handoff heading, the changelog date and `generatedAt` use the day this task runs (`<today>` below). If that day is 2026-10-12, the 2B-1 entry goes under the existing `## 2026-10-12` heading of the changelog, above the 2C plan 2 entry; otherwise a new date block goes above it, with the `---` separator the file uses.
- **The guard numbers** in the handoff and the changelog are the live totals after Task 24 (spec §10.4 table C column "หลัง 2B-1"); if Task 24 Step 17 reported different totals, write those.
- **The "Dev-app check (Task 25)" bullets** come from `.superpowers/sdd/<plan workspace>/task-25-findings.md`, in the shape of the 2C plan 2 bullets: what was checked, the results, fixes, and what still needs a person. Task 27 adds its verify bullet directly above each of them.
- **The plan file name:** the docs link `docs/superpowers/plans/2026-10-12-ui-phase2b-plan1.md` (Step 1 checks that it exists).

**Files:**
- Modify: `DESIGN.md` (CRLF): frontmatter `typography.display` (`:51-54`); §2 Where Color Lives (`:258`); §3 Display (`:284`), Metric (`:291`), `num` (`:300`); §5 Feedback (`:425`, `:426`), Cards / Containers (`:432`, after `:436`), Inputs (`:459`, after it), Navigation (`:489`, `:493` and after it), Data Tables (`:498`, `:500`), Empty Values and Numbers (`:516`); §6 Do (`:534`)
- Modify: `docs/14_UI_UX_DESIGN_SYSTEM.md` (CRLF): Shared Components after the Breadcrumbs row (`:69`), the paragraph `:82`, the registry before "Cross-cutting UI hardening" (`:103`)
- Modify: `DEVELOPER_HANDOFF.md` (CRLF): `:256`, `:296`, `:321`, `:343`, `:441-445`, `:475` and a new section before `## Open Go-Live Decisions` (`:477`)
- Modify: `docs/99_CHANGELOG.md` (CRLF): the 2B-1 entry at the top (`:7`)
- Modify: `.impeccable/design.json` (CRLF): `generatedAt` (`:3`) and 8 components after "Sidebar Navigation Item" (`:414-420`)
- Temp folder only, never committed: `check-docs-2b1.mjs`
- Not in this task: the verify numbers and the wiki (Task 27), `docs/07_UAT_CHECKLIST.md` and `docs/11_FEATURE_LIST.md` (2B-2, spec §10.6), `src/` and `tests/`

**Interfaces:**
- Consumes: Tasks 1–25 committed; `task-25-findings.md`; the live guard totals of Task 24 Step 17.
- Produces: the 2B-1 handoff section with a "Dev-app check (Task 25)" bullet, and the changelog entry with a "ตรวจบนแอป (Task 25)" bullet (Task 27 adds its verify bullet above each).

- [ ] **Step 1: Check the base**

Run: `git diff --quiet b16d152 HEAD -- DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md .impeccable/design.json && echo DOCS-UNCHANGED`
Expected: `DOCS-UNCHANGED` (Tasks 1–25 did not touch them; if a Task 25 fix did, re-read the quoted strings below against the file).

Run: `git ls-files --eol DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md .impeccable/design.json`
Expected: `i/lf    w/crlf` for all five.

Run: `ls docs/superpowers/plans/2026-10-12-ui-phase2b-plan1.md .superpowers/sdd/*/task-25-findings.md`
Expected: both exist (the docs link the plan; the findings fill the markers).

Run: `node -e "console.log(new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }))"`
Expected: a date such as `2026-10-12`. This is `<today>` in Steps 4–8: replace every `<today>` below with it.

- [ ] **Step 2: Write the check script (it fails first).** Save as `check-docs-2b1.mjs` in your temp folder:

```js
// check-docs-2b1.mjs: run from the repo root. Checks the plan 2B-1 docs edits of Task 26. Reads only. Never commit this file.
import { readFileSync } from "node:fs"

const files = ["DESIGN.md", "docs/14_UI_UX_DESIGN_SYSTEM.md", "DEVELOPER_HANDOFF.md", "docs/99_CHANGELOG.md", ".impeccable/design.json"]
const raw = Object.fromEntries(files.map((path) => [path, readFileSync(path, "utf8")]))
const text = Object.fromEntries(files.map((path) => [path, raw[path].replace(/\r\n/g, "\n")]))
const count = (path, literal) => text[path].split(literal).length - 1
const once = (path, ...literals) => literals.every((literal) => count(path, literal) === 1)
const none = (path, ...literals) => literals.every((literal) => count(path, literal) === 0)
const before = (path, first, second) => {
  const at = text[path].indexOf(first)
  return at >= 0 && at < text[path].indexOf(second)
}
const design = (() => {
  try {
    return JSON.parse(raw[".impeccable/design.json"])
  } catch {
    return null
  }
})()
const NEW_COMPONENTS = ["Page Header", "Data Table", "Pagination", "Tab Nav", "Stat Strip", "Key Value List", "Row Actions", "Filter Chip"]
const checks = {
  "every file is CRLF only": files.every((path) => !/(^|[^\r])\n/.test(raw[path])),
  "no <today> or findings marker is left": files.every((path) => none(path, "<today>", "<from task-25-findings.md>", "<จาก task-25-findings.md>")),
  "DESIGN.md: Display 600 from PageHeader, in the text and the frontmatter":
    once("DESIGN.md", "- **Display** (600, 1.5rem / `text-2xl`, 32px; 36px on Thai pages): Page titles, built only by `PageHeader`") &&
    /\n  display:\n    fontFamily: "[^"\n]+"\n    fontSize: "1\.5rem"\n    fontWeight: 600\n/.test(text["DESIGN.md"]) &&
    none("DESIGN.md", "- **Display** (700"),
  "DESIGN.md: menu depth and icons, crumbs 4px above the title":
    once("DESIGN.md", "(the asset register first, then the groups จัดการทรัพย์สิน / Asset Management and ธุรกรรม / Transactions, then audit, maintenance and disposal)", "The menu is at most two levels deep", "No outer margin: `PageHeader` puts it 4px (`mb-1`) above the title.") &&
    none("DESIGN.md", "the page header owns the gap to the title"),
  "DESIGN.md: Page header, Back button and Link tabs bullets": once("DESIGN.md", "- **Page header** (`PageHeader`", "- **Back button** (`PageBackLink`", "- **Link tabs** (`TabNav`"),
  "DESIGN.md: DataTable rules and R7 per file":
    once("DESIGN.md", "**`DataTable`** (`src/components/ui/data-table.tsx`", "keep a budget per file (`TABLE_HEADER_FILLS`, guard R7): 44 at the start of 2B, 29 after plan 2B-1") &&
    none("DESIGN.md", "44 sites) move to the shared DataTable in phase 2B"),
  "DESIGN.md: every list page, RowActions, and the register pattern after them":
    once("DESIGN.md", "**Every list page (phase 2B", "- **`RowActions`** (`src/components/ui/row-actions.tsx`", "**Asset register pattern (2026-10-07).**") &&
    before("DESIGN.md", "**Every list page (phase 2B", "**Asset register pattern (2026-10-07).**") &&
    none("DESIGN.md", "New list pages follow the register"),
  "DESIGN.md: list filters, chips, empty rows, corners, panels, numbers, Do list":
    once("DESIGN.md", "- **List filters** (`FilterSelect`", "shown only while a filter is active).", "`TableEmptyRow` uses it, and so does an empty `ContentPanel divided flush`.", "filter chips (`FilterChipList`), the page-size frame of `Pagination`", "- **`ContentPanel divided`**", "- **`KeyValueList`**", "- **`StatStrip`**", "Number strips (`StatStrip`) have no tone fill either", "The value in a `StatStrip` cell.", "such as `StatStrip` values", "After plan 2B-1, guard LV2 counts 113", "`RowActions`, `TabNav`, `StatStrip`, `KeyValueList`, `ContentPanel divided`, and the panel") &&
    before("DESIGN.md", "- **List filters** (`FilterSelect`", "- Text selection uses `primary-border` behind ink."),
  "docs/14: 13 new rows after Breadcrumbs, LFG named, registry row before Cross-cutting":
    ["| `PageHeader` |", "| `PageBackLink` through `PageHeader back` |", "| `TabNav` |", "| `TableEmptyRow` |", "| `FilterSelect` |", "| `FilterFormActions` |", "| `FilterChipList` |", "| `RowActions` |", "| `StatStrip` |", "| `KeyValueList` |"].every((cell) => count("docs/14_UI_UX_DESIGN_SYSTEM.md", cell) === 1) &&
    before("docs/14_UI_UX_DESIGN_SYSTEM.md", "| A breadcrumb trail | `Breadcrumbs` |", "| A page title, its facts and its buttons | `PageHeader` |") &&
    once("docs/14_UI_UX_DESIGN_SYSTEM.md", "and for list pages and page frames `tests/list-frame-guards.test.ts` let their per-file budgets go down", "| List pages and page frames | [`2026-10-12-ui-phase2b-design.md`]") &&
    before("docs/14_UI_UX_DESIGN_SYSTEM.md", "| List pages and page frames |", "| Cross-cutting UI hardening |"),
  "handoff: 2B-1 section before Open Go-Live Decisions, with its Dev-app check and guard bullets":
    before("DEVELOPER_HANDOFF.md", "## UI Round 4 Phase 2B Plan 1 Primitives, Master-Data Lists and Page Headers (", "## Open Go-Live Decisions") &&
    before("DEVELOPER_HANDOFF.md", "## UI Round 4 Phase 2C Plan 2 Master-Data Forms (2026-10-12)", "## UI Round 4 Phase 2B Plan 1") &&
    once("DEVELOPER_HANDOFF.md", "- Dev-app check (Task 25):", "**Guard file `tests/list-frame-guards.test.ts`**", "- **Pipeline (spec §8.1"),
  "handoff: older sections point to 2B-1, and the pipeline replaces 'after 2B merges'":
    once("DEVELOPER_HANDOFF.md", "Since phase 2B plan 1 the prop lives on the shared `PageHeader`", "Phase 2B plan 1 rebuilt the asset section of the menu", "table-header fills have a budget per file since 2B plan 1", "R2 shadows (10 in 9 files)", "Plan 2B-1 built the primitives and moved the master-data lists", "plan 3 (the bulk disposal dialogs, the audit round forms and `ConfirmTextDialog`) starts when 2B plan 2 has merged", "- Next: 2B plan 1 (below), then the pipeline of the 2B spec §8.1") &&
    none("DEVELOPER_HANDOFF.md", "  - Plans 3–5 start after 2B merges:", "- Next: 2B (list pages and page frames, its own spec and plans)", "table-header fills at most 44"),
  "changelog: the 2B-1 entry under the newest date, above the 2C plan 2 entry":
    once("docs/99_CHANGELOG.md", "### หน้ารายการและโครงหน้า ชุดแรก (UI รอบ 4 เฟส 2B plan 1)", "- **ตรวจบนแอป (Task 25):**") &&
    /^# [^\n]*\n[\s\S]*?\n---\n\n## \d{4}-\d{2}-\d{2}\n\n### หน้ารายการและโครงหน้า ชุดแรก \(UI รอบ 4 เฟส 2B plan 1\)\n/.test(text["docs/99_CHANGELOG.md"]) &&
    before("docs/99_CHANGELOG.md", "### หน้ารายการและโครงหน้า ชุดแรก", "### ฟอร์มข้อมูลหลัก (UI รอบ 4 เฟส 2C plan 2)"),
  ".impeccable/design.json: valid JSON with the 8 new components after Sidebar Navigation Item":
    Boolean(design) &&
    design.components.length === 17 &&
    design.components.map((component) => component.name).slice(8).join() === ["Sidebar Navigation Item", ...NEW_COMPONENTS].join() &&
    design.components.every((component) => ["name", "kind", "refersTo", "description", "html", "css"].every((key) => typeof component[key] === "string")) &&
    /^\d{4}-\d{2}-\d{2}T00:00:00\+07:00$/.test(design.generatedAt) && design.generatedAt !== "2026-10-11T00:00:00+07:00",
}
let failed = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}`)
  if (!ok) failed += 1
}
process.exit(failed ? 1 : 0)
```

- [ ] **Step 3: Run it**

Run: `node <temp>/check-docs-2b1.mjs`
Expected: exit 1. `ok` on "every file is CRLF only" and "no <today> or findings marker is left", `FAIL` on the other 11 lines.

- [ ] **Step 4: `DESIGN.md` (17 replacements)**

(1) Frontmatter. Replace:

```
  display:
    fontFamily: "IBM Plex Sans, IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
```

with:

```
  display:
    fontFamily: "IBM Plex Sans, IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
```

(2) §2 The Where Color Lives Rule. Replace:

```
Do not use these colors as decorative fill across inactive cards or marketing-style sections.
```

with:

```
Do not use these colors as decorative fill across inactive cards or marketing-style sections. Number strips (`StatStrip`) have no tone fill either: a cell that needs action gets a warning foot line with its icon, and the cell of the filter in use gets `primary-soft` with a 2px primary line.
```

(3) §3 Display. Replace:

```
- **Display** (700, 1.5rem / `text-2xl`, 32px; 36px on Thai pages): Page titles, dashboard headings, and high-level report titles. Keep fixed and compact.
```

with:

```
- **Display** (600, 1.5rem / `text-2xl`, 32px; 36px on Thai pages): Page titles, built only by `PageHeader` (the compact register title is `text-xl` below `md`). Keep fixed and compact. Pages that a later 2B plan moves still draw their own 700 `h1` until then (guard LH1 counts them).
```

(4) §3 Metric. Replace:

```
- **Metric** (500, 1.75rem / `text-metric`, 32px, −0.02em): The value in a stat. Numbers only.
```

with:

```
- **Metric** (500, 1.75rem / `text-metric`, 32px, −0.02em): The value in a `StatStrip` cell. Numbers only.
```

(5) §3 Utilities, `num`. Replace:

```
numbers that must line up, such as MetricCard values.
```

with:

```
numbers that must line up, such as `StatStrip` values (and `MetricCard` values until plan 2B-5 removes it).
```

(6) §5 Feedback, `ActionEmptyState`. Replace:

```
(use it for "ล้างตัวกรอง").
```

with:

```
(use it for "ล้างตัวกรอง", shown only while a filter is active).
```

(7) §5 Feedback, `EmptyNote`. Replace:

```
`padded` adds `px-5 py-4` when the container has no padding.
```

with:

```
`padded` adds `px-5 py-4` when the container has no padding: `TableEmptyRow` uses it, and so does an empty `ContentPanel divided flush`.
```

(8) §5 Cards / Containers, Corner Style. Replace:

```
12px (`rounded-lg`) for main content panels, metric cards, dialogs, menus, popovers, the command panel and toasts; 8px (`rounded-md`) for compact tables, nested control surfaces,
```

with:

```
12px (`rounded-lg`) for main content panels, `DataTable` frames, `StatStrip`, metric cards, dialogs, menus, popovers, the command panel and toasts; 8px (`rounded-md`) for compact tables, filter chips (`FilterChipList`), the page-size frame of `Pagination`, nested control surfaces,
```

(9) §5 Cards / Containers, after Internal Padding. Replace:

```
- **Internal Padding:** 16px on mobile and compact panels, 20px where dashboard or form grouping needs more breathing room.
```

with:

```
- **Internal Padding:** 16px on mobile and compact panels, 20px where dashboard or form grouping needs more breathing room.
- **`ContentPanel divided`** (`src/components/ui/content-panel.tsx`): a panel with a head row at least 56px tall and a line under it (a 16/600 `h2`, a 13/20 description, the actions in one wrapping row) over a body padded 16px (20px at the sides from `md`). With `flush` the body has no padding and holds a table or a full-width list (`ContentPanelRows`: `border-soft` lines, `px-4 py-3 md:px-5` rows), so a frame never sits in a frame. Without `divided` the panel is the plain one.
- **`KeyValueList`** (`src/components/ui/key-value-list.tsx`, server-safe): the label and value pairs of a detail page, a 120px faint label column and the values in ink, one column below `sm`. Empty values show `Nil`; 0 and `false` show as values (guard LK1: no local `Info` or `DetailItem` helper).
- **`StatStrip`** (`src/components/ui/stat-strip.tsx`, server-safe): the numbers above a list, in one 12px frame with 1px lines between the cells and no fill. A cell is a 13/500 label, the value in Metric with `num` (already formatted) and an optional faint foot line; two columns below `lg`, one row from `lg`. A cell with `href` is one stretched link named by its label; the cell of the filter in use has `primary-soft`, a 2px primary line and `aria-current="page"`; a cell that needs action has a warning foot line with its icon (guards LS1, LS2).
```

(10) §5 Inputs / Fields, Migration. Replace:

```
List-page filters belong to 2B.
```

with:

```
List-page filters belong to 2B: plan 2B-1 moved the filter forms of the master-data lists and the user list (see **List filters** below), and plans 2B-2 to 2B-5 move the rest.
```

(11) §5 Inputs / Fields, the new **List filters** bullet before the last bullet. Replace:

```
- Text selection uses `primary-border` behind ink.
```

with:

```
- **List filters** (`FilterSelect` in `src/components/ui/filter-select.tsx`, `FilterFormActions` in `filter-panel.tsx`, `FilterChipList` in `filter-chips.tsx`; all server-safe):
  - A filter panel with visible labels (`FilterPanel`) uses `FilterSelect` and `Field` + `Input` at `fieldSize="lg"` (40px; 44px with 16px text below `md`) and ends with `FilterFormActions`: the primary `lg` submit button, then an outline `lg` "ล้างตัวกรอง" link that shows only while a filter is active.
  - A search toolbar without visible labels (`MasterDataSearch`, and the asset register from plan 2B-3) has no frame and uses `fieldSize="md"`: 36px from `md`, 44px below. Its search is `SearchField` named by `aria-label`; its selects are `FilterSelect hideLabel`.
  - The forms are GET forms with `role="search"`. A button or Enter submits; hidden inputs keep `pageSize`, `sort` and `direction`; a changed filter goes back to page 1 with the same page size.
  - `FilterChipList` shows one removable chip for each active filter that is not visible on screen. The whole chip is one link named "<remove label>: <filter>" (8px corners, `primary-soft`, 36px from `md`, 44px below), and "ล้างทั้งหมด" is a text link after the chips.
- Text selection uses `primary-border` behind ink.
```

(12) §5 Navigation, the three sections. Replace the whole line:

```
- **Three sections with headings:** งานประจำวัน / Daily work (dashboard, work center, my assets) · ทรัพย์สิน / Assets (asset management, audit, maintenance, disposal) · ภาพรวมและระบบ / Reports and system (reports, master data, settings). A section with no permitted item is hidden (`filterNavigationSectionsByPermission` in `src/lib/navigation-permissions.ts`); when the sidebar is collapsed, headings become divider lines. Each section is a `role="group"` labelled by its heading (`aria-labelledby`; drawer ids are prefixed `mobile-` because the body renders twice).
```

with:

```
- **Three sections with headings:** งานประจำวัน / Daily work (dashboard, work center, my assets) · ทรัพย์สิน / Assets (the asset register first, then the groups จัดการทรัพย์สิน / Asset Management and ธุรกรรม / Transactions, then audit, maintenance and disposal) · ภาพรวมและระบบ / Reports and system (reports, master data, settings). A section with no permitted item is hidden (`filterNavigationSectionsByPermission` in `src/lib/navigation-permissions.ts`); when the sidebar is collapsed, headings become divider lines. Each section is a `role="group"` labelled by its heading (`aria-labelledby`; drawer ids are prefixed `mobile-` because the body renders twice). The menu is at most two levels deep: a section holds rows and groups, a group holds rows only. Every row and group has its own icon, because the collapsed rail shows icons only (`tests/sidebar-menu-structure.test.ts`).
```

(13) §5 Navigation, the end of the Breadcrumbs bullet and three new bullets after it. Replace:

```
No outer margin: the page header owns the gap to the title.
```

with:

```
No outer margin: `PageHeader` puts it 4px (`mb-1`) above the title.
- **Page header** (`PageHeader`, `src/components/ui/page-header.tsx`, server-safe and without hooks, so client forms use it too): the one place that draws a page title.
  - Breadcrumbs (`breadcrumbs={[…]}`, written as an array literal) sit 4px above the `h1`. The `h1` is Display at weight 600 in ink, balanced and wrapping. A status badge never sits next to it.
  - The meta row under it is 13/20 secondary text with `gap-x-3 gap-y-1`, at most 48rem wide, one fact per element and no separators: the code (`tag`), then the status badge, then facts, then what the page is for.
  - When the last crumb is a code, the title is the record's own name (or the asset's name for a repair or disposal document), never the same code.
  - The buttons are `md`, in this order: back, ⋯, secondary, primary. Below `md` the title and the buttons stack; from `md` they share the row, and the buttons wrap when the title is long.
  - `compactOnMobile` is for the asset register only: below `md` a 20px title and its button share one row, and the meta row is hidden.
  - The header has no outer margin: a page root uses `space-y-6`, and a form or tool passes `className="mb-6"`. `AuditScanHeader` stays the field-scan exception.
- **Back button** (`PageBackLink`, passed as `back={<PageBackLink href={returnToHref} label={tCommon("back")} />}`): `outline` `md` with a left arrow and the page's own words. Below `md` it is a 44px icon button whose words stay in `max-md:sr-only`, so its name is the visible text. `href` is the expression the page already computed, `returnTo` included; the supplier form passes `onClick={confirmNavigation}`. Pages that had a back button keep it, forms that had none get none, and the back items of mobile action bars use the same left arrow (guard LB1: no hand-placed `ArrowLeft`).
- **Link tabs** (`TabNav`, `src/components/ui/tab-nav.tsx`, server-safe): a `<nav>` of links with `aria-current="page"` for views that change the URL. One underline at every width (an inset line under the row, a 2px primary line under the current tab), 40px from `md` and 44px below, counts in `text-meta num` after the label, and the row scrolls sideways when it does not fit. `scroll`, `ref`, `style`, `onScroll` and `data-*` pass through; `onSelect` (client callers only) can cancel a navigation. State that does not change the URL uses `Segmented` instead.
```

(14) §5 Data Tables, the last sentence of the opening paragraph, then the `DataTable` rules and the rules of every list page. Replace:

```
Table-header fills (`bg-muted/NN`, 44 sites) move to the shared DataTable in phase 2B.
```

with:

```
Table-header fills (`bg-muted/NN`) keep a budget per file (`TABLE_HEADER_FILLS`, guard R7): 44 at the start of 2B, 29 after plan 2B-1; the commit that moves a table deletes its row.

**`DataTable`** (`src/components/ui/data-table.tsx`, server-safe; its scroll hint `DataTableScrollArea` in `data-table-scroll.tsx` is the one client part) is the table of every list page except the asset register:

- **Frame:** 12px corners, `border`, white. The header is white with 13/500 faint text in sentence case and a `border` line under it: no fill and no capitals (guards LT1, R7). Rows are `p-3`, about 46px, with `border-soft` lines. There is one density only: the asset register keeps its compact `px-3 py-2` rows in `asset-register-table.tsx` until phase 3 (spec 2B I3).
- **Gutters:** the first and last columns get 16px, 20px from `md` (`first:pl-4 last:pr-4 md:first:pl-5 md:last:pr-5`). A plain class on a cell cannot change them; a table that needs another gutter writes its own variant.
- **Rows:** `DataTableRow`, or `ClickableTableRow` when the whole row opens the record. Both carry `group/row`: the row stays lit while it is hovered, while focus is anywhere inside it, and while a menu it opened is open. A pinned column (`sticky="left" | "right"`) draws a line on its inner edge and no shadow.
- **Sorting:** `DataTableHead sort={{ href, direction }}` makes the label a link (44px on phones) and sets `aria-sort` and an arrow on the sorted column only (guard LT2: no hand-written sort header).
- **Empty:** `TableEmptyRow` is the one empty row: an `EmptyNote padded` line, or an `ActionEmptyState` when there is a title, a description or a button (guard LT3: no hand-written `<td colSpan>`).
- **Foot:** `DataTable footer={<Pagination … />}` puts `Pagination` in `DataTableFoot`: the range and "หน้า x จาก y" on the left in one `aria-live="polite"` line, then the page sizes 25/50/100 as links that look like `Segmented` (the current one `aria-current="true"` at weight 600), then words-only outline `sm` previous and next buttons. A disabled one is a `span` with `aria-disabled` and the shared disabled look (guards LT4, LT5).
- **Scroll:** `scrollHint={tCommon("tableScrollHint")}` puts the table in `DataTableScrollArea`, a named `role="region"` scroller that takes Tab and shows its hint line only while the table really overflows (B6).
- **Values:** counts and money through `formatCount` and `formatMoney` in `num` cells (`DataTableCell numeric`), empty values through `Nil`, and the row's own code as `tag font-medium text-foreground` (guards LV1–LV3).
- `dataTableHeadClasses`, `dataTableCellClasses` and `dataTableRowClasses` are exported for tables that cannot move whole yet.

**Every list page (phase 2B, spec `docs/superpowers/specs/2026-10-12-ui-phase2b-design.md`):**

- **Header and filters:** `PageHeader` with the create button as the primary `md` action, last. A filter panel with visible labels or a frameless search toolbar (see **List filters** in Inputs / Fields), and `FilterChipList` for active filters that are not visible on screen.
- **Numbers:** `StatStrip` above the table for the counts a person scans; a cell can filter the list (see Cards / Containers).
- **Rows (ช1):** one next-step button ("แก้ไข" on the master-data lists) and a ⋯ menu that holds every other action (`RowActions`, below). Delete sits last in ⋯ and asks the same confirm as before. Clicking the row still opens its edit page.
- **Pages on the server:** `page` and `pageSize` (25, 50 or 100; 25 by default) live in the URL and are read with `parseListPage` (`src/lib/list-pagination.ts`). The query takes `listPageWindow` and counts the total in the same `Promise.all`, with the old `orderBy` plus `{ id: "asc" }`. A page past the end redirects to the last page (`lastListPage`), and links keep the page and its size (`appendListPage`), so `returnTo` brings a person back to the same page. A main list never caps its rows with a fixed `take`.
- **Phones:** a table without a phone layout keeps horizontal scrolling with `DataTableScrollArea`; phone layouts for these tables come in phase 3.
- **`RowActions`** (`src/components/ui/row-actions.tsx`, a client component with data-only props, so server pages can pass them):
  - The next-step button is 120px wide (32px tall from `md`, 44px below), 13px medium primary text with a 16px icon. It fills with `primary-soft` while its row is hovered, holds focus or has its menu open, and it is named "<label> <code>".
  - ⋯ is a `ghost` `icon-sm` button named "การดำเนินการของ <code>" (`common.moreActionsFor`). From `md` it opens a `DropdownMenu`; below `md` a bottom `Sheet` titled with the code in `tag`, with 44px rows. An item that cannot run now uses `unavailable` with its reason.
  - `deleteAction` adds "ลบ" last, after a separator. It asks the shared delete confirm and returns focus to ⋯. The trigger and the menu carry `data-no-row-click`, so a click in them never opens the row (guard LR1: no `…DeleteButton` in a row).
```

(15) §5 Data Tables, the register's heading. Replace:

```
**List page pattern (asset register, 2026-10-07).** New list pages follow the register (`/[locale]/assets`):
```

with:

```
**Asset register pattern (2026-10-07).** The register (`/[locale]/assets`) adds these to the rules above; plan 2B-3 moves it onto the shared parts:
```

(16) §5 Empty Values and Numbers. Replace:

```
- Phase 2A only adds these helpers; 2B uses them on screens (156 `"-"` fallbacks, 44 `toLocaleString()` calls without a locale).
```

with:

```
- Phase 2A only adds these helpers; 2B uses them on screens (156 `"-"` fallbacks, 44 `toLocaleString()` calls without a locale). After plan 2B-1, guard LV2 counts 113 typed `"-"` and LV1 20 bare `toLocaleString()` calls on screens.
```

(17) §6 Do. Replace:

```
`Notice`, `EmptyNote`, `ActionEmptyState`, and the panel, table shell and mobile card list helpers.
```

with:

```
`Notice`, `EmptyNote`, `ActionEmptyState`, `PageHeader` and `PageBackLink`, `DataTable` with `TableEmptyRow` and `Pagination`, `FilterSelect`, `FilterFormActions` and `FilterChipList`, `RowActions`, `TabNav`, `StatStrip`, `KeyValueList`, `ContentPanel divided`, and the panel, table shell and mobile card list helpers.
```

- [ ] **Step 5: `docs/14_UI_UX_DESIGN_SYSTEM.md` (3 replacements)**

(1) Shared Components, 13 rows after the Breadcrumbs row. Replace:

```
| A breadcrumb trail | `Breadcrumbs` | `code: true` for an asset tag or document number |
```

with:

```
| A breadcrumb trail | `Breadcrumbs` | `code: true` for an asset tag or document number |
| A page title, its facts and its buttons | `PageHeader` | the only `h1`; a status badge only in `meta`; `md` buttons, back first and primary last; no outer margin (a `space-y-6` root, or `className="mb-6"` in a form) |
| A back button in a header | `PageBackLink` through `PageHeader back` | `href` is the page's own expression, `returnTo` included; `label` is the page's own words; an icon button below `md` |
| Tabs that change the URL | `TabNav` | `aria-label` names the row; counts through `formatCount`; state that does not change the URL uses `Segmented` |
| A list table | `DataTable` with `DataTableHeader`, `DataTableHead`, `DataTableBody`, `DataTableRow` (or `ClickableTableRow`) and `DataTableCell` | one density; the first and last columns keep 16/20px; `sort` on `DataTableHead` sets `aria-sort`; `scrollHint` when the table can overflow on phones |
| An empty table | `TableEmptyRow` | one line through `children`, or `emptyState` for a title, a description or a button |
| Page links under a table | `Pagination` in `DataTable footer`, with `parseListPage`, `listPageWindow`, `lastListPage` and `appendListPage` (`src/lib/list-pagination.ts`) | 25/50/100; a page past the end redirects to `lastListPage`; links keep `page` and `pageSize` |
| A filter select | `FilterSelect` | `fieldSize="lg"` in a filter panel, `md` with `hideLabel` in a toolbar; `allLabel` for the "all" option |
| The buttons of a filter form | `FilterFormActions` | pass `clear` only while a filter is active |
| The active filters | `FilterChipList` | chips only for filters that are not visible on screen; `removeLabel` starts each chip's name |
| A next step and more actions in a table row | `RowActions` | data-only props; delete through `deleteAction`, never a delete button in the row; `menuLabel={tCommon("moreActionsFor", { code })}` |
| Counts above a list | `StatStrip` | values already formatted; no tone fill; `current` on the cell of the filter in use |
| Label and value pairs | `KeyValueList` | empty values become `Nil` by themselves |
| A panel with a head row | `ContentPanel divided`, with `flush` for a table or a `ContentPanelRows` list | without `divided` it is the plain panel |
```

(2) The paragraph under the table. Replace:

```
Phase 2A built the first set and phase 2C plan 1 added the form and dialog pieces; phases 2B to 2D move the hand-written controls onto them. The ratchet guards in `tests/visual-foundation-guards.test.ts` and, for forms and dialogs, `tests/form-migration-guards.test.ts` let their per-file budgets go down, never up.
```

with:

```
Phase 2A built the first set, phase 2C plan 1 added the form and dialog pieces, and phase 2B plan 1 added the list and page-frame pieces; phases 2B to 2D move the hand-written controls onto them. The ratchet guards in `tests/visual-foundation-guards.test.ts`, for forms and dialogs `tests/form-migration-guards.test.ts`, and for list pages and page frames `tests/list-frame-guards.test.ts` let their per-file budgets go down, never up.
```

(3) The registry, a row before "Cross-cutting UI hardening". Replace the start of that row:

```
| Cross-cutting UI hardening |
```

with:

```
| List pages and page frames | [`2026-10-12-ui-phase2b-design.md`](superpowers/specs/2026-10-12-ui-phase2b-design.md) (UI round 4 phase 2B: `PageHeader` and `PageBackLink`, `DataTable` with `TableEmptyRow` and `Pagination`, the filter parts, `RowActions`, `TabNav`, `StatStrip`, `KeyValueList`, `ContentPanel divided`; the sidebar with the asset register first; server pagination of 9 lists; its §10 rulings I1–I34 override the section files in [`2026-10-12-ui-phase2b/`](superpowers/specs/2026-10-12-ui-phase2b/)) | [`2026-10-12-ui-phase2b-plan1.md`](superpowers/plans/2026-10-12-ui-phase2b-plan1.md) sequences plan 2B-1 (the primitives, the master-data lists and users, the sidebar and the form headers); plans 2B-2 to 2B-5 follow (spec §10.3). |
| Cross-cutting UI hardening |
```

- [ ] **Step 6: `DEVELOPER_HANDOFF.md` (6 replacements)**

(1) Asset Register Redesign (`:256`). Replace:

```
- `MasterDataHeader` takes `compactOnMobile` (title and create button share one row, subtitle hidden below `md`); only the register uses it so far.
```

with:

```
- `MasterDataHeader` takes `compactOnMobile` (title and create button share one row, subtitle hidden below `md`); only the register uses it so far. Since phase 2B plan 1 the prop lives on the shared `PageHeader`, and `MasterDataHeader` is a thin wrapper of it until plan 2B-5 deletes it.
```

(2) Phase 1, the Shell bullet (`:296`), its last words. Replace:

```
`public/offline.html` recolored.
```

with:

```
`public/offline.html` recolored. Phase 2B plan 1 rebuilt the asset section of the menu (the register first, two groups, at most two levels, no repeated icon); see its section.
```

(3) Phase 2A, the Ratchet guards bullet (`:321`). Replace:

```
R7 neutral fills outside table headers (none; table-header fills at most 44), R2 shadows (12 in 10 files),
```

with:

```
R7 neutral fills outside table headers (none; table-header fills have a budget per file since 2B plan 1, `TABLE_HEADER_FILLS`, 44 → 29), R2 shadows (10 in 9 files),
```

(4) Phase 2A, Deferred 2B (`:343`). Replace:

```
  - 2B: list pages; table-header fills (44 sites); `tag` on 79 code sites; `Nil` and the number helpers on screens; 44 `toLocaleString()` calls without a locale; `RowActions`; `PageHeader`.
```

with:

```
  - 2B: list pages; table-header fills (44 sites); `tag` on 79 code sites; `Nil` and the number helpers on screens; 44 `toLocaleString()` calls without a locale; `RowActions`; `PageHeader`. Plan 2B-1 built the primitives and moved the master-data lists, users, the sidebar and the form headers (see its section); plans 2B-2 to 2B-5 do the rest.
```

(5) 2C plan 1, Deferred (`:441-445`). Replace:

```
  - Plan 2 (batch 2, master data, 8 files) can run beside 2B.
  - Plans 3–5 start after 2B merges:
    - the bulk disposal dialogs, the audit round forms and `ConfirmTextDialog`
    - login, the import wizard `Steps`, the two drawers and the label tools
    - `ActionBar` with `actionBarPagePadding`, the `AlertDialog` restyle with verb labels, the repair attachment delete dialog as `useConfirm`, and the disposal request `Steps`
```

with:

```
  - Plan 2 (batch 2, master data, 8 files) merged before 2B started. Plans 3–5 follow the pipeline of the 2B spec (§8.1, in the 2B plan 1 section below), not "after 2B merges":
    - plan 3 (the bulk disposal dialogs, the audit round forms and `ConfirmTextDialog`) starts when 2B plan 2 has merged
    - plan 4 (login, the import wizard `Steps`, the two drawers and the label tools) starts when 2B plan 3 and 2C plan 3 have merged
    - plan 5 (`ActionBar` with `actionBarPagePadding`, the `AlertDialog` restyle with verb labels, the repair attachment delete dialog as `useConfirm`, and the disposal request `Steps`) starts when 2B plan 4 and 2C plan 4 have merged
```

(6) The new section. Replace the last bullet of the 2C plan 2 section and the heading after it (`:475-477`) with the block below, which ends with that same heading. Replace `<today>` with the date of Step 1, and write the "Dev-app check (Task 25)" bullet and the "Still open" list from `task-25-findings.md`, in the shape of the 2C plan 2 section's bullets.

```
- Next: 2B (list pages and page frames, its own spec and plans), then 2C plans 3–5 after 2B merges, 2D and the V track.

## Open Go-Live Decisions
```

with:

```
- Next: 2B plan 1 (below), then the pipeline of the 2B spec §8.1: 2B plans 2–5 in order, 2C plans 3–5 beside them, then 2D and the V track, and one deploy.

## UI Round 4 Phase 2B Plan 1 Primitives, Master-Data Lists and Page Headers (<today>)

- Branch `feat/ui-phase2b` (from `master` `d38a0ee`: 2A and 2C plans 1–2 merged, not deployed). Spec `docs/superpowers/specs/2026-10-12-ui-phase2b-design.md` (its §10 rulings I1–I34 override the section files in `docs/superpowers/specs/2026-10-12-ui-phase2b/`) · plan `docs/superpowers/plans/2026-10-12-ui-phase2b-plan1.md` · canonical values in `DESIGN.md`.
  - Plan 2B-1 builds the list and page-frame primitives, moves the 8 master-data lists and the user list onto them, rebuilds the asset section of the sidebar, and gives every form header one back button. One commit per migrated page or form, except Task 22 (5 commits by group).
  - No schema, migration, API, RBAC, dependency or token. The one server change is the read-only pagination query of the departments list (`findMany` + `count` in one `Promise.all`; no index).
- **Pipeline (spec §8.1, replaces "plans 3–5 start after 2B merges" above):** 2B runs in the main checkout, one plan at a time: 2B-1 → 2B-2 → 2B-3 → 2B-4 → 2B-5. 2C runs in a worktree: plan 3 starts when 2B-2 has merged, plan 4 when 2B-3 and 2C-3 have merged, plan 5 when 2B-4 and 2C-4 have merged. 2D starts when 2B-5 and 2C-5 have merged, and the V track after 2D. Merges are fast-forward only; the branch that merges second rebases (DESIGN.md, VFG, `messages/*.json`, this file, the changelog, `docs/14_UI_UX_DESIGN_SYSTEM.md` and `.impeccable/design.json` may conflict; any other code conflict means a fence leaked, so stop and revert).
- **Deploy:** none in 2B. The user decided on 2026-10-12 to deploy once, after all of phase 2 and the user's checks on real devices; `ab1b873` stays the rollback point (no schema change).
- **New primitives** (`src/components/ui/`; all server-safe except `row-actions.tsx` and `data-table-scroll.tsx`; rules in `DESIGN.md` §5):
  - `page-header.tsx`: `PageHeader` (`title`, `meta`, `actions`, `back`, `breadcrumbs`, `compactOnMobile`, `className`) and `PageBackLink` (`href`, `label`, `onClick`). No hooks, so client forms render them. `back` is a node, so each page keeps its literal `href={returnToHref}`.
  - `data-table.tsx`: `DataTable`, `DataTableHeader`, `DataTableHead` (`sort`, `aria-sort`), `DataTableBody`, `DataTableRow`, `DataTableCell`, `DataTableFoot`, `TableEmptyRow`, and the exported class strings for tables that cannot move whole. One density (I3). `data-table-scroll.tsx`: `DataTableScrollArea`, the overflow hint (`common.tableScrollHint`). `ClickableTableRow` now uses the shared row classes (`group/row`, lit while focus is inside or its menu is open).
  - `pagination.tsx`: the range (`common.showingRange`), the page sizes 25/50/100 (`common.pageSizeLabel`) and `aria-live`; words-only buttons. `src/lib/list-pagination.ts`: `LIST_PAGE_SIZES`, `parseListPage`, `listPageWindow`, `lastListPage`, `appendListPage`.
  - `filter-select.tsx` (`FilterSelect`), `filter-chips.tsx` (`FilterChipList`, `FilterChipItem`), and `FilterFormActions` in `filter-panel.tsx`.
  - `row-actions.tsx`: `RowActions` (ช1: next step + ⋯; a menu from `md`, a bottom sheet below; `deleteAction` uses the same hook and confirm as `MasterDataDeleteButton`; `common.moreActionsFor`). `dropdown-menu.tsx` exports `menuItemClasses` and `menuItemDestructiveClasses`.
  - `tab-nav.tsx` (`TabNav`, with `onSelect` for 2C plan 5's settings tabs), `stat-strip.tsx` (`StatStrip`), `key-value-list.tsx` (`KeyValueList`) and `ContentPanel divided` / `flush` / `ContentPanelRows` in `content-panel.tsx`.
- **Pages and forms moved:**
  - The 8 master-data lists (`/master-data/{branches,brands,categories,companies,departments,employees,locations,suppliers}`, with `supplier-list-view.tsx`) and `/admin/users`: `PageHeader`, filter panels on `FilterSelect` and `FilterFormActions`, `DataTable` with `TableEmptyRow`, `Pagination` with 25/50/100 and a redirect past the last page, `StatStrip` instead of the summary tiles, `RowActions` ("แก้ไข" + ⋯ with "ลบ"; users has "แก้ไข" only), and `formatCount`, `Nil` and `tag`. The 9 `*-delete-button.tsx` wrappers are deleted; `master-data-delete-button.tsx` stays without callers until 2D. Departments now pages on the server (B4). The brand picker stays a vertical list with `aria-current` (I11).
  - Form headers: the 9 master-data forms, `admin-user-form`, `role-permission-form` (only its header: the create page now reads "เพิ่มบทบาท", I32), `asset-form`, `asset-component-manager` (its header no longer sticks), `/disposal/new`, `/disposal/batch/new`, `/maintenance/new`, `/maintenance/pm/new` and `/maintenance/pm/[id]/edit` use `PageHeader` with `PageBackLink`. The three maintenance pages read "กลับ" instead of "ยกเลิก", and the PM edit title is the plan's name with its code in the meta.
  - The 2C operation forms (`checkin`, `checkout` through `OperationShell`, `transfer`, `bulk-move`), `audit-round-form` and `asset-batch-form` draw their titles with `PageHeader` (I13). The settings tables and the asset batch tables have the white header; the depreciation builder formats through `formatCount` and `formatMoney` (R-e, R-f).
- **Changed before their own plan** (the shared parts moved under them): `MasterDataHeader` is a thin wrapper of `PageHeader` (the asset register, findings and rounds headers); `MasterDataSearch` is a frameless `SearchField` + outline `Button` toolbar on 6 pages; the register's `Pagination` lost its arrows; every `ClickableTableRow` row (19 in 18 files) stays lit while focus is inside. The findings "กลับไปรอบตรวจนับ" button still shows the plus icon until 2B-2.
- **Sidebar (B1):** "ทะเบียนทรัพย์สิน" is the first item of the asset section (one click to `/[locale]/assets`); the groups จัดการทรัพย์สิน and ธุรกรรม follow; at most two levels; 39 entries with 39 different icons. `nav.assetRegistryGroup` is deleted and `SidebarGroup` has no `depth`.
- **Messages:** new `common.tableScrollHint`, `common.showingRange`, `common.pageSizeLabel`, `common.moreActionsFor`; deleted `nav.assetRegistryGroup`.
- **Guards:**
  - VFG R7 is a budget per file (`TABLE_HEADER_FILLS`): 44 in 31 files at `d38a0ee`, 29 in 20 after this plan. R1 (1) and R2 (10 in 9 files) are unchanged.
  - **Guard file `tests/list-frame-guards.test.ts`** (LFG, 19 counters LH1…LR1 plus L0 and a sample test; JSX reader in `tests/helpers/source-files.ts`):
    - `BUDGETS` started at the `d38a0ee` counts (spec §10.4 table C) plus two LB1 rows `0 → 1` for the back items of the mobile action bars of `audit/rounds/[id]` and `maintenance/[id]`.
    - The commit that moves a site lowers that file's rows, and the commit that finishes a file adds it to `MIGRATED_LIST_FILES`; L0 then holds the file to `KEEP`. Never raise a number.
    - `KEEP` is what may stay after 2B, each row with its reason. Plan 2B-5 sets `BUDGETS` to `KEEP` (test L9); 2D sets every budget to `{}`.
    - 2C never needs to edit this file (its budgets are maxima). A new assertion in a test that reads a CRLF file without converting it has no `\n`.
    - After this plan (live counts): LH1 34 · LH2 11 · LB1 12 · LP1 8 · LF1 3 · LT1 36 · LT2 2 · LT3 8 · LT4 4 · LT5 9 · LV1 20 · LV2 113 · LV3 42 · LS1 23 · LS2 20 · LK1 11 · LN1 12 · LN2 7 · LR1 0.
  - `tests/form-migration-guards.test.ts` is not edited; the header changes in 2C files add or remove none of its patterns.
- **Tests:** new `tests/list-frame-guards.test.ts`, `sidebar-menu-structure`, `list-primitives-ui`, `row-actions-ui`, `list-pagination`, `list-filters-ui`, `list-pages-ui` and `form-frames-ui`. Edited pins: `visual-foundation-guards` (R7), `breadcrumbs-ui` (counts the `breadcrumbs={[…]}` prop too), `asset-register-filter-ui`, `supplier-adaptive-ui`, `master-data-brand-supplier-ui` and `disposal-route-structure` (spec §10.4 table A).
- **Handed on:** 2C plan 4 moves the headers of `asset-scan-search-tool.tsx` and `asset-label-batch-tool.tsx` onto `PageHeader` in the commit of each file (I13); the header back links of `admin-user-form.tsx` and `role-permission-form.tsx` are done (O16). 2C plan 5 can move the settings tab row onto `TabNav` with `onSelect` (O7).
- Dev-app check (Task 25): <from task-25-findings.md>
- Before/after screenshots: `.superpowers/sdd/screenshots/ui-phase2b-plan1/before/` and `after/` (git-ignored, on the development machine only).
- Still open, for a person before the one phase-2 deploy: <from task-25-findings.md>, together with the open checks of phase 1, 2A and 2C plans 1–2 above.
- Next: 2B plan 2 (disposal, audit, maintenance, data quality and integrations; it unlocks 2C plan 3), then the pipeline above.

## Open Go-Live Decisions
```

Replace both `<from task-25-findings.md>` markers with the text from the findings; no marker may stay.

- [ ] **Step 7: `docs/99_CHANGELOG.md` (1 or 2 replacements)**

(1) Only if `<today>` is not `2026-10-12`: put a new date block on top. Replace the line `## 2026-10-12` with:

```
## <today>

---

## 2026-10-12
```

(2) The entry, directly under the `## <today>` heading (above `### ฟอร์มข้อมูลหลัก (UI รอบ 4 เฟส 2C plan 2)` when `<today>` is 2026-10-12, above `---` otherwise). Replace:

```
## <today>

```

with the block below. Write the "ตรวจบนแอป (Task 25)" bullet from `task-25-findings.md`, in Thai, in the shape of the 2C plan 2 entry's bullet.

```
## <today>

### หน้ารายการและโครงหน้า ชุดแรก (UI รอบ 4 เฟส 2B plan 1)

Branch `feat/ui-phase2b` (จาก `master` `d38a0ee`) · design `docs/superpowers/specs/2026-10-12-ui-phase2b-design.md` (ข้อ 10 ใช้แทนไฟล์ส่วน) · plan `docs/superpowers/plans/2026-10-12-ui-phase2b-plan1.md` · ค่าทั้งหมดอยู่ใน `DESIGN.md`

- **ขอบเขต:** ของกลางของหน้ารายการและโครงหน้า · ข้อมูลหลัก 8 หน้าและหน้าผู้ใช้ · เมนูข้าง · ปุ่มกลับที่หัวฟอร์มทุกจุด · ไม่เปลี่ยนขั้นตอนงาน ไม่แตะ schema ไม่เพิ่ม API ไม่เพิ่ม token · server แก้แค่ query อ่านอย่างเดียวของรายการแผนก (แบ่งหน้าจริง ไม่เพิ่ม index)
- **ของกลางใหม่:** `PageHeader` / `PageBackLink` · `DataTable` + `TableEmptyRow` + `DataTableScrollArea` · `Pagination` (ช่วงแถว · 25/50/100 · `aria-live`) กับ `src/lib/list-pagination.ts` · `FilterSelect` · `FilterChipList` · `FilterFormActions` · `RowActions` (ปุ่มขั้นถัดไป + ⋯) · `TabNav` · `StatStrip` · `KeyValueList` · `ContentPanel divided`
- **ข้อมูลหลักและผู้ใช้:** หัวเรื่องบางลง (600) · หัวตารางพื้นขาว ตัวหนังสือ 13px สีจาง ไม่ใช้ตัวพิมพ์ใหญ่ · แถวราว 46px · "แก้ไข" + ⋯ และ "ลบ" อยู่ใน ⋯ ต้องยืนยันเหมือนเดิม (ผู้ใช้มีแค่ "แก้ไข") · คลิกทั้งแถวยังไปหน้าแก้ไข · ท้ายตาราง "1–25 จาก N รายการ · หน้า 1 จาก M" เลือก 25/50/100 ได้ · เปิดหน้าที่เกินหน้าสุดท้ายพาไปหน้าสุดท้าย · กล่องตัวเลขรวมเป็นแถบเดียวไม่มีพื้นสี · ค่าว่างเป็น "—" · ตัวเลขแบบไทย · รหัสเป็นตัว monospace · แผนกแบ่งหน้าจริงและ "กลับ" พาไปหน้าเดิมขนาดเดิม
- **เมนูข้าง:** "ทะเบียนทรัพย์สิน" เป็นรายการแรกของส่วนทรัพย์สิน คลิกเดียวถึง · กลุ่ม "จัดการทรัพย์สิน" และ "ธุรกรรม" · ลึกไม่เกิน 2 ชั้น · ไอคอนไม่ซ้ำทั้งเมนู (39 ตำแหน่ง) · ลบ key `nav.assetRegistryGroup`
- **หัวฟอร์มและหน้าสร้าง/แก้ไข:** 18 จุดใช้ `PageBackLink` (ปุ่มขอบ + ลูกศรซ้าย · บนมือถือเป็นไอคอน 44px · ยังพา `returnTo`) · 3 หน้าซ่อมบำรุงเขียน "กลับ" แทน "ยกเลิก" · หน้าสร้างบทบาทเขียน "เพิ่มบทบาท" · หัวหน้าจัดการส่วนควบไม่ติดบนแล้ว · ฟอร์มผู้ขายยังถามก่อนทิ้งที่แก้ · ฟอร์มส่งมอบ รับคืน โอน ย้ายหลายรายการ เพิ่มเป็นชุด และรอบตรวจนับใหม่ใช้ `PageHeader` · ตารางในหน้าตั้งค่าและเพิ่มเป็นชุดใช้หัวพื้นขาว · ตัวอย่างค่าเสื่อมใช้ตัวเลขแบบไทย
- **เห็นก่อน plan ของหน้า:** หัวของทะเบียน รายการไม่ตรง และรอบตรวจนับ (ผ่านตัวห่อ `MasterDataHeader`) · ช่องค้นหาไม่มีกรอบใน 6 หน้า · ปุ่มก่อนหน้า/ถัดไปของทะเบียนไม่มีลูกศร · แถวตารางที่คลิกได้ค้างสีตอนโฟกัสอยู่ในแถว
- **ข้อความ:** เพิ่ม `common.tableScrollHint`, `common.showingRange`, `common.pageSizeLabel`, `common.moreActionsFor` · ลบ `nav.assetRegistryGroup`
- **guard:** VFG R7 เป็น budget รายไฟล์ (44 → 29) · guard ใหม่ `tests/list-frame-guards.test.ts` (19 ตัว + L0 · ลดได้อย่างเดียว · `MIGRATED_LIST_FILES` · `KEEP`) · หลัง plan: LH1 34 · LH2 11 · LB1 12 · LF1 3 · LT1 36 · LT3 8 · LT4 4 · LT5 9 · LV1 20 · LV2 113 · LS1 23 · LR1 0
- **test:** ใหม่ `list-frame-guards`, `sidebar-menu-structure`, `list-primitives-ui`, `row-actions-ui`, `list-pagination`, `list-filters-ui`, `list-pages-ui`, `form-frames-ui` · แก้ pin ตามสเปกข้อ 10.4 ตาราง A
- **deploy:** ไม่ deploy ใน 2B · deploy ครั้งเดียวหลังเฟส 2 ทั้งหมดและผู้ใช้ตรวจเครื่องจริง · ถอยกลับไป `ab1b873` ได้เพราะไม่มี schema เปลี่ยน
- **ตรวจบนแอป (Task 25):** <จาก task-25-findings.md>
- ภาพก่อน/หลัง: `.superpowers/sdd/screenshots/ui-phase2b-plan1/before/` และ `after/` (git ignore อยู่บนเครื่องพัฒนา)
- ต่อไป: 2B-2 (ตัดจำหน่าย ตรวจนับ ซ่อมบำรุง · ปลด 2C plan 3) แล้วสายท่อตามสเปกข้อ 8.1 · 2D · งาน V

```

Replace the `<จาก task-25-findings.md>` marker with the text from the findings, and every `<today>` with the date; no marker may stay.

- [ ] **Step 8: `.impeccable/design.json` (2 replacements)**

(1) Replace:

```json
  "generatedAt": "2026-10-11T00:00:00+07:00",
```

with:

```json
  "generatedAt": "<today>T00:00:00+07:00",
```

(2) The 8 new components after "Sidebar Navigation Item", the last item of `components` (its closing brace, then the end of the array). Replace:

```json
    }
  ],
  "narrative": {
```

with:

```json
    },
    {
      "name": "Page Header",
      "kind": "custom",
      "refersTo": "page-header",
      "description": "PageHeader: breadcrumbs 4px above one h1 at weight 600 that wraps, a 13/20 meta row (code in Plex Mono, then the status badge, then facts) and md buttons in the order back, menu, secondary, primary. Stacked below 768px, one row from 768px with the buttons wrapping. PageBackLink is an outline button with a left arrow and the page's words; below 768px it is a 44px icon button whose words stay for screen readers. No outer margin.",
      "html": "<header class=\"ds-page-header\"><nav class=\"ds-page-crumbs\" aria-label=\"เส้นทางหน้า\"><a href=\"#\">แผน PM</a> › <span aria-current=\"page\" class=\"ds-page-code\">PM-2026-0007</span></nav><div class=\"ds-page-row\"><div class=\"ds-page-text\"><h1 class=\"ds-page-title\">ตรวจเครื่องสำรองไฟประจำไตรมาส</h1><div class=\"ds-page-meta\"><span class=\"ds-page-code\">PM-2026-0007</span><span>ทุก 90 วัน</span></div></div><div class=\"ds-page-actions\"><a class=\"ds-page-back\" href=\"#\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M19 12H5M12 19l-7-7 7-7\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg><span class=\"ds-page-back-label\">กลับ</span></a></div></div></header>",
      "css": ".ds-page-header { min-width: 0; font-family: \"IBM Plex Sans\", \"IBM Plex Sans Thai\", system-ui, sans-serif; color: #0B1D35; } .ds-page-crumbs { margin-bottom: 4px; font-size: 13px; line-height: 1.5385; color: #56677F; } .ds-page-crumbs a { color: inherit; text-decoration: none; } .ds-page-crumbs [aria-current] { font-weight: 500; color: #0B1D35; } .ds-page-row { display: flex; flex-direction: column; gap: 12px; } .ds-page-text { min-width: 0; } .ds-page-title { margin: 0; font-size: 24px; line-height: 1.3333; font-weight: 600; text-wrap: balance; overflow-wrap: break-word; } .ds-page-meta { margin-top: 4px; max-width: 48rem; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; font-size: 13px; line-height: 1.5385; color: #3C4F6B; } .ds-page-code { font-family: \"IBM Plex Mono\", ui-monospace, monospace; font-size: calc(1em - 1px); white-space: nowrap; user-select: all; } .ds-page-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; } .ds-page-back { box-sizing: border-box; min-height: 44px; min-width: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 0; border: 1px solid #C3CDDA; border-radius: 8px; background: #FFFFFF; color: #0B1D35; font: 500 14px/1.5714 \"IBM Plex Sans\", \"IBM Plex Sans Thai\", system-ui, sans-serif; text-decoration: none; transition: background-color 150ms ease-out, border-color 150ms ease-out; } .ds-page-back svg { width: 16px; height: 16px; } .ds-page-back:hover { background: #F6F8FB; border-color: #7C8BA0; } .ds-page-back:focus-visible { outline: 2px solid #10858D; outline-offset: 2px; } .ds-page-back-label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; } @media (min-width: 768px) { .ds-page-row { flex-direction: row; align-items: flex-start; justify-content: space-between; column-gap: 24px; } .ds-page-actions { justify-content: flex-end; } .ds-page-back { min-height: 0; height: 36px; padding: 0 14px; } .ds-page-back-label { position: static; width: auto; height: auto; overflow: visible; clip: auto; } } @media (prefers-reduced-motion: reduce) { .ds-page-back { transition: none; } }"
    },
    {
      "name": "Data Table",
      "kind": "custom",
      "refersTo": "table",
      "description": "DataTable: a white frame with 12px corners; a white header with 13/500 faint text in sentence case, no fill and no capitals; p-3 rows (about 46px) on border-soft lines, the first and last columns 16px from the edge (20px from 768px); the sorted column has aria-sort and an arrow; hovered or focused rows use row-hover; counts are tabular. The foot holds Pagination.",
      "html": "<div class=\"ds-table-frame\"><table class=\"ds-table\"><caption class=\"ds-table-caption\">สาขา</caption><thead><tr><th scope=\"col\" aria-sort=\"ascending\"><a href=\"#\">รหัส <span aria-hidden=\"true\">↑</span></a></th><th scope=\"col\">ชื่อสาขา</th><th scope=\"col\" class=\"ds-table-num\">ทรัพย์สิน</th></tr></thead><tbody><tr><td><span class=\"ds-table-code\">BR-001</span></td><td>สำนักงานใหญ่</td><td class=\"ds-table-num\">1,751</td></tr><tr><td><span class=\"ds-table-code\">BR-002</span></td><td>สาขาชลบุรี</td><td class=\"ds-table-num\">0</td></tr></tbody></table><div class=\"ds-table-foot\">1–2 จาก 2 รายการ · หน้า 1 จาก 1</div></div>",
      "css": ".ds-table-frame { min-width: 0; max-width: 100%; overflow: hidden; border: 1px solid #D7DEE8; border-radius: 12px; background: #FFFFFF; font-family: \"IBM Plex Sans\", \"IBM Plex Sans Thai\", system-ui, sans-serif; color: #0B1D35; } .ds-table { width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.5714; font-variant-numeric: tabular-nums; } .ds-table-caption { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; } .ds-table th { padding: 10px 12px; border-bottom: 1px solid #D7DEE8; background: #FFFFFF; text-align: left; vertical-align: bottom; font-size: 13px; line-height: 1.5385; font-weight: 500; white-space: nowrap; color: #56677F; } .ds-table th a { color: inherit; text-decoration: none; } .ds-table th[aria-sort] a { color: #0B1D35; } .ds-table th a:focus-visible { outline: 2px solid #10858D; outline-offset: 2px; } .ds-table td { padding: 12px; border-bottom: 1px solid #E7EBF1; vertical-align: top; } .ds-table tbody tr:last-child td { border-bottom: 0; } .ds-table th:first-child, .ds-table td:first-child { padding-left: 16px; } .ds-table th:last-child, .ds-table td:last-child { padding-right: 16px; } .ds-table tbody tr { transition: background-color 150ms ease-out; } .ds-table tbody tr:hover, .ds-table tbody tr:focus-within { background: #F3F6FB; transition-duration: 0ms; } .ds-table-num { text-align: right; white-space: nowrap; } .ds-table-code { font-family: \"IBM Plex Mono\", ui-monospace, monospace; font-size: calc(1em - 1px); font-weight: 500; white-space: nowrap; user-select: all; } .ds-table-foot { padding: 10px 16px; border-top: 1px solid #D7DEE8; font-size: 13px; line-height: 1.5385; color: #3C4F6B; font-variant-numeric: tabular-nums; } @media (min-width: 768px) { .ds-table th:first-child, .ds-table td:first-child { padding-left: 20px; } .ds-table th:last-child, .ds-table td:last-child { padding-right: 20px; } .ds-table-foot { padding: 10px 20px; } } @media (prefers-reduced-motion: reduce) { .ds-table tbody tr { transition: none; } }"
    },
    {
      "name": "Pagination",
      "kind": "nav",
      "refersTo": "pagination",
      "description": "Pagination in the table foot: the range and the page text on the left in one polite live line; the page sizes 25/50/100 as links that look like Segmented (the current one primary-soft, weight 600, aria-current=true); words-only outline sm buttons, 44px below 768px and 32px from 768px. A disabled button is a span with aria-disabled and the shared disabled look, never faded.",
      "html": "<nav class=\"ds-pager\" aria-label=\"การแบ่งหน้า\"><p class=\"ds-pager-text\" aria-live=\"polite\">1–25 จาก 64 รายการ<span aria-hidden=\"true\"> · </span>หน้า 1 จาก 3</p><div class=\"ds-pager-controls\"><div class=\"ds-pager-sizes\" role=\"group\" aria-label=\"จำนวนต่อหน้า\"><span aria-hidden=\"true\">แสดง</span><span class=\"ds-pager-frame\"><a href=\"#\" aria-current=\"true\">25</a><a href=\"#\">50</a><a href=\"#\">100</a></span></div><span class=\"ds-pager-btn\" aria-disabled=\"true\">ก่อนหน้า</span><a class=\"ds-pager-btn\" href=\"#\" rel=\"next\">ถัดไป</a></div></nav>",
      "css": ".ds-pager { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px; font-family: \"IBM Plex Sans\", \"IBM Plex Sans Thai\", system-ui, sans-serif; } .ds-pager-text { margin: 0; font-size: 13px; line-height: 1.5385; color: #3C4F6B; font-variant-numeric: tabular-nums; } .ds-pager-controls, .ds-pager-sizes { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 13px; line-height: 1.5385; color: #3C4F6B; } .ds-pager-frame { display: inline-flex; gap: 2px; padding: 2px; border: 1px solid #D7DEE8; border-radius: 8px; background: #FFFFFF; } .ds-pager-frame a { min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; padding: 0 8px; border-radius: 6px; font-weight: 500; color: #3C4F6B; text-decoration: none; } .ds-pager-frame a:hover { background: #F6F8FB; color: #0B1D35; } .ds-pager-frame a[aria-current=\"true\"] { background: #E9EFF8; font-weight: 600; color: #173E76; } .ds-pager-btn { box-sizing: border-box; min-height: 44px; display: inline-flex; align-items: center; padding: 0 10px; border: 1px solid #C3CDDA; border-radius: 6px; background: #FFFFFF; color: #0B1D35; font-size: 13px; font-weight: 500; text-decoration: none; } .ds-pager-btn:hover { background: #F6F8FB; border-color: #7C8BA0; } .ds-pager-btn[aria-disabled=\"true\"] { background: #F6F8FB; border-color: #D7DEE8; color: #56677F; cursor: not-allowed; } .ds-pager a:focus-visible { outline: 2px solid #10858D; outline-offset: 2px; } @media (min-width: 768px) { .ds-pager-frame a { min-width: 32px; min-height: 26px; } .ds-pager-btn { min-height: 0; height: 32px; } }"
    },
    {
      "name": "Tab Nav",
      "kind": "nav",
      "refersTo": "tabs",
      "description": "TabNav: links that change the URL, named by their nav and marked with aria-current=page, not an ARIA tab list. One underline at every width: an inset line under the row and a 2px primary line under the current tab, which is weight 600. Counts are 13px tabular after the label (primary on the current tab). 40px tall from 768px and 44px below; the row scrolls sideways when it does not fit.",
      "html": "<nav class=\"ds-tabs\" aria-label=\"สถานะ\"><ul><li><a href=\"#\" aria-current=\"page\">ทั้งหมด<span class=\"ds-tab-count\">1,751</span></a></li><li><a href=\"#\">พร้อมใช้งาน<span class=\"ds-tab-count\">1,204</span></a></li><li><a href=\"#\">ส่งซ่อม<span class=\"ds-tab-count\">12</span></a></li></ul></nav>",
      "css": ".ds-tabs { overflow-x: auto; overscroll-behavior-x: contain; font-family: \"IBM Plex Sans\", \"IBM Plex Sans Thai\", system-ui, sans-serif; } .ds-tabs ul { display: flex; width: max-content; min-width: 100%; gap: 22px; margin: 0; padding: 0; list-style: none; box-shadow: inset 0 -1px 0 #D7DEE8; } .ds-tabs li { display: flex; } .ds-tabs a { min-height: 44px; display: flex; align-items: center; gap: 6px; padding: 8px 0 10px; font-size: 14px; line-height: 1.5714; white-space: nowrap; color: #3C4F6B; text-decoration: none; transition: color 150ms ease-out, box-shadow 150ms ease-out; } .ds-tabs a:hover { color: #0B1D35; box-shadow: inset 0 -2px 0 #D7DEE8; } .ds-tabs a[aria-current=\"page\"] { font-weight: 600; color: #0B1D35; box-shadow: inset 0 -2px 0 #1E4F94; } .ds-tab-count { margin-inline-start: 6px; font-size: 13px; line-height: 1.5385; color: #56677F; font-variant-numeric: tabular-nums; } .ds-tabs a[aria-current=\"page\"] .ds-tab-count { font-weight: 600; color: #1E4F94; } .ds-tabs a:focus-visible { outline: 2px solid #10858D; outline-offset: -2px; } @media (min-width: 768px) { .ds-tabs a { min-height: 0; } } @media (prefers-reduced-motion: reduce) { .ds-tabs a { transition: none; } }"
    },
    {
      "name": "Stat Strip",
      "kind": "card",
      "refersTo": "stat-strip",
      "description": "StatStrip: the numbers above a list in one 12px frame with 1px lines between the cells and no status fill. A cell is a 13/500 label, the value in the Metric size with tabular figures, and an optional faint foot line. Two columns below 1024px, one row from 1024px. A cell that filters the list is one stretched link; the current one has primary-soft, a 2px primary line and aria-current=page. A cell that needs action has a warning foot line with its icon.",
      "html": "<dl class=\"ds-stats\"><div class=\"ds-stat\"><dt>สาขาทั้งหมด</dt><dd class=\"ds-stat-value\">64</dd><dd class=\"ds-stat-foot\">ใช้งาน 61</dd></div><div class=\"ds-stat ds-stat-current\"><dt><a href=\"#\" aria-current=\"page\">ปิดใช้งาน</a></dt><dd class=\"ds-stat-value\">3</dd></div><div class=\"ds-stat\"><dt>ทรัพย์สินในสาขา</dt><dd class=\"ds-stat-value\">1,751<span class=\"ds-stat-unit\">รายการ</span></dd><dd class=\"ds-stat-foot ds-stat-attention\">ยังไม่มีผู้ถือครอง 12</dd></div></dl>",
      "css": ".ds-stats { margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px; overflow: hidden; border: 1px solid #D7DEE8; border-radius: 12px; background: #D7DEE8; font-family: \"IBM Plex Sans\", \"IBM Plex Sans Thai\", system-ui, sans-serif; color: #0B1D35; } .ds-stat { position: relative; display: grid; align-content: start; gap: 4px; padding: 12px 16px; background: #FFFFFF; transition: background-color 150ms ease-out; } .ds-stat dt { font-size: 13px; line-height: 1.5385; font-weight: 500; color: #3C4F6B; } .ds-stat dt a { color: inherit; text-decoration: none; } .ds-stat dt a::after { content: \"\"; position: absolute; inset: 0; } .ds-stat dt a:focus-visible { outline: none; } .ds-stat:has(a:focus-visible) { outline: 2px solid #10858D; outline-offset: -2px; } .ds-stat:has(a):hover { background: #F6F8FB; } .ds-stat dd { margin: 0; } .ds-stat-value { display: flex; align-items: baseline; gap: 4px; font-size: 28px; line-height: 1.1429; font-weight: 500; letter-spacing: -0.02em; font-variant-numeric: tabular-nums lining-nums; } .ds-stat-unit { font-size: 16px; font-weight: 500; letter-spacing: 0; color: #56677F; } .ds-stat-foot { font-size: 13px; line-height: 1.5385; color: #56677F; } .ds-stat-attention { color: #A14A05; } .ds-stat-current, .ds-stat-current:hover { background: #E9EFF8; box-shadow: inset 0 -2px 0 #1E4F94; } @media (min-width: 768px) { .ds-stat { padding: 16px 20px; } } @media (min-width: 1024px) { .ds-stats { grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); } } @media (prefers-reduced-motion: reduce) { .ds-stat { transition: none; } }"
    },
    {
      "name": "Key Value List",
      "kind": "custom",
      "refersTo": "key-value",
      "description": "KeyValueList: label and value pairs of a detail page as real dt/dd, a 120px faint 13px label column and 14px ink values that wrap; one column below 640px, with 2px between a label and its value and 8px before the next label. An empty value shows the faint em dash with hidden words for screen readers; 0 and false show as values.",
      "html": "<dl class=\"ds-kv\"><dt>รหัส</dt><dd><span class=\"ds-kv-code\">EMP-0042</span></dd><dt>ตำแหน่ง</dt><dd>เจ้าหน้าที่บัญชี</dd><dt>อีเมล</dt><dd><span class=\"ds-kv-nil\" aria-hidden=\"true\">—</span><span class=\"ds-kv-sr\">ไม่มีข้อมูล</span></dd></dl>",
      "css": ".ds-kv { margin: 0; display: grid; grid-template-columns: minmax(0, 1fr); row-gap: 2px; font-family: \"IBM Plex Sans\", \"IBM Plex Sans Thai\", system-ui, sans-serif; } .ds-kv dt { font-size: 13px; line-height: 1.5385; color: #56677F; } .ds-kv dd { margin: 0; min-width: 0; overflow-wrap: break-word; font-size: 14px; line-height: 1.5714; color: #0B1D35; } .ds-kv dd + dt { margin-top: 8px; } .ds-kv-code { font-family: \"IBM Plex Mono\", ui-monospace, monospace; font-size: calc(1em - 1px); white-space: nowrap; user-select: all; } .ds-kv-nil { color: #56677F; } .ds-kv-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; } @media (min-width: 640px) { .ds-kv { grid-template-columns: 120px minmax(0, 1fr); gap: 8px 16px; } .ds-kv dd + dt { margin-top: 0; } }"
    },
    {
      "name": "Row Actions",
      "kind": "button",
      "refersTo": "row-action",
      "description": "RowActions in a table row: one next-step button (120px wide, 13px medium primary text with a 16px icon, 32px tall from 768px and 44px below) that fills with primary-soft while its row is hovered or holds focus, plus a ghost icon button that opens a menu from 768px and a bottom sheet below. The menu holds every other action, unavailable items with their reason, and delete last after a separator, which asks the shared confirm and returns focus to the menu button.",
      "html": "<div class=\"ds-row-actions\"><a class=\"ds-row-next\" href=\"#\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>แก้ไข<span class=\"ds-row-sr\"> BR-001</span></a><button class=\"ds-row-more\" type=\"button\" aria-haspopup=\"menu\" aria-expanded=\"false\" aria-label=\"การดำเนินการของ BR-001\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"5\" cy=\"12\" r=\"1.5\" fill=\"currentColor\"/><circle cx=\"12\" cy=\"12\" r=\"1.5\" fill=\"currentColor\"/><circle cx=\"19\" cy=\"12\" r=\"1.5\" fill=\"currentColor\"/></svg></button></div>",
      "css": ".ds-row-actions { display: inline-flex; align-items: center; gap: 4px; font-family: \"IBM Plex Sans\", \"IBM Plex Sans Thai\", system-ui, sans-serif; } .ds-row-next { box-sizing: border-box; min-height: 44px; width: 120px; display: inline-flex; align-items: center; gap: 6px; padding: 0 10px; border: 1px solid transparent; border-radius: 6px; font-size: 13px; line-height: 1.5385; font-weight: 500; white-space: nowrap; color: #1E4F94; text-decoration: none; transition: background-color 150ms ease-out, color 150ms ease-out; } .ds-row-next svg { width: 16px; height: 16px; flex: 0 0 auto; } .ds-row-next:hover, tr:hover .ds-row-next, tr:focus-within .ds-row-next { background: #E9EFF8; color: #173E76; transition-duration: 0ms; } .ds-row-next:active { border-color: #BACBE4; } .ds-row-more { box-sizing: border-box; width: 44px; height: 44px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid transparent; border-radius: 6px; background: transparent; color: #3C4F6B; cursor: pointer; } .ds-row-more svg { width: 16px; height: 16px; } .ds-row-more:hover, .ds-row-more[aria-expanded=\"true\"] { background: #F6F8FB; color: #0B1D35; } .ds-row-next:focus-visible, .ds-row-more:focus-visible { outline: 2px solid #10858D; outline-offset: 2px; } .ds-row-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; } @media (min-width: 768px) { .ds-row-next { min-height: 0; height: 32px; } .ds-row-more { width: 32px; height: 32px; } } @media (prefers-reduced-motion: reduce) { .ds-row-next { transition: none; } }"
    },
    {
      "name": "Filter Chip",
      "kind": "chip",
      "refersTo": "filter-chip",
      "description": "FilterChipList: one removable chip for each active filter that is not visible on screen. The whole chip is one link named by the remove words and the filter (8px corners, primary-border line, primary-soft fill, primary-hover text, 36px from 768px and 44px below); the x is a picture. A text link after the chips clears them all.",
      "html": "<div class=\"ds-chips\" role=\"group\" aria-label=\"ตัวกรองที่ใช้อยู่\"><a class=\"ds-chip\" href=\"#\" aria-label=\"ล้างตัวกรองนี้: บริษัท: GRL\"><span class=\"ds-chip-text\">บริษัท: GRL</span><span class=\"ds-chip-x\" aria-hidden=\"true\"><svg viewBox=\"0 0 24 24\"><path d=\"M18 6 6 18M6 6l12 12\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"/></svg></span></a><a class=\"ds-chip-clear\" href=\"#\">ล้างทั้งหมด</a></div>",
      "css": ".ds-chips { min-width: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-family: \"IBM Plex Sans\", \"IBM Plex Sans Thai\", system-ui, sans-serif; } .ds-chip { box-sizing: border-box; min-height: 44px; max-width: 100%; display: inline-flex; align-items: center; gap: 6px; padding: 0 4px 0 12px; border: 1px solid #BACBE4; border-radius: 8px; background: #E9EFF8; color: #173E76; font-size: 13px; line-height: 1.5385; text-decoration: none; } .ds-chip-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .ds-chip-x { width: 24px; height: 24px; flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px; transition: background-color 150ms ease-out; } .ds-chip-x svg { width: 12px; height: 12px; } .ds-chip:hover .ds-chip-x { background: #BACBE4; } .ds-chip:focus-visible { outline: 2px solid #10858D; outline-offset: 2px; } .ds-chip-clear { min-height: 44px; display: inline-flex; align-items: center; font-size: 13px; line-height: 1.5385; font-weight: 500; white-space: nowrap; color: #1E4F94; text-decoration: underline transparent; text-underline-offset: 3px; } .ds-chip-clear:hover, .ds-chip-clear:focus-visible { text-decoration-color: currentColor; } @media (min-width: 768px) { .ds-chip { min-height: 0; height: 36px; } .ds-chip-clear { min-height: 0; } } @media (prefers-reduced-motion: reduce) { .ds-chip-x { transition: none; } }"
    }
  ],
  "narrative": {
```

Check: `node -e "const j=require('./.impeccable/design.json');console.log(j.components.length, j.components.slice(-8).map((c)=>c.name).join(' | '))"` prints `17 Page Header | Data Table | Pagination | Tab Nav | Stat Strip | Key Value List | Row Actions | Filter Chip`.

- [ ] **Step 9: Check**

Run: `node <temp>/check-docs-2b1.mjs`
Expected: 13 `ok` lines, exit 0.

Run: `grep -n "<from task-25\|<จาก task-25\|<today>" DESIGN.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md docs/14_UI_UX_DESIGN_SYSTEM.md .impeccable/design.json`
Expected: nothing.

Run: `git diff --numstat`
Expected: exactly the five files: `DESIGN.md` +56 −15, `docs/14_UI_UX_DESIGN_SYSTEM.md` +15 −1, `DEVELOPER_HANDOFF.md` about +46 −10 (the findings change the count), `docs/99_CHANGELOG.md` about +18 −0 (+22 −0 with a new date block), `.impeccable/design.json` +65 −1. A file that shows every line changed was normalized: restore its line endings.

Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: all green (`tests/audit-round-cancellation.test.ts` reads the handoff and the changelog; no other test reads these files).

- [ ] **Step 10: Commit**

```bash
git add DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md .impeccable/design.json
git commit -m "docs(ui): phase 2B plan 1 primitives, list pages and page headers in DESIGN.md, handoff and changelog

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 5 files in the commit. `git status --short` prints only the untracked paths of Global Constraints.

---

### Task 27: Final verification, wiki and memory (controller runs this task)

**Files:**
- Modify: `docs/99_CHANGELOG.md`, `DEVELOPER_HANDOFF.md` (verify numbers)
- Modify (vault `D:\Obsidian\Eltross`): `AssetSystem/ams-status.md`, `AssetSystem/ams-log.md`, `AssetSystem/ams-open-questions.md`
- Modify (auto-memory): `review-2026-10-priorities.md`

**Interfaces:**
- Consumes: Tasks 1–26 committed.
- Produces: the branch ready for superpowers:finishing-a-development-branch.

- [ ] **Step 1: Verify.**
  - Run `npm run verify` and record the test count and the build page count.
  - If it passed, add one bullet to the 2B-1 entry in `docs/99_CHANGELOG.md`, directly above its "ตรวจบนแอป (Task 25)" bullet: `` `npm run verify` ผ่าน (test N · ผ่าน N · ข้าม 1 · build X/X หน้า) ``.
  - Add the same numbers to the 2B-1 section of `DEVELOPER_HANDOFF.md`, directly above its "Dev-app check (Task 25)" bullet: `Verification: `npm run verify` passes (tests N · pass N · skipped 1 · build X/X pages).`
  - Run `npm test` again (`tests/audit-round-cancellation.test.ts` reads both files).
  - Commit both files with `docs(ui): record phase 2B plan 1 verify results` and the Co-Authored-By line.

- [ ] **Step 2: Wiki.** Read `AssetSystem/_schema/ams-wiki-schema.md` first, then:
  - `ams-status.md`: the 2B row becomes `local`: 2B-1 built on `feat/ui-phase2b`, the verify numbers, not merged, not deployed.
  - `ams-log.md`: an entry at the top of `## <today>`.
  - `ams-open-questions.md`: question 28 "built in 2B-1, closes on merge" · a phase-3 item for the menu ideas not chosen and for `returnTo` dropped at some destinations (I22) · the 2B-1 checks for a person from Task 25 Step 8.
  - Run `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` from `D:\Obsidian\Eltross`.
  - Commit only those three files with an `ingest:` message. Other sessions have uncommitted changes in the vault; never stage them.

- [ ] **Step 3: Memory.** Update `review-2026-10-priorities.md`: 2B-1 built on `feat/ui-phase2b`, not merged, not deployed. Next: 2B-2 (unlocks 2C plan 3), then the pipeline of spec B7.

- [ ] **Step 4:** Use superpowers:finishing-a-development-branch.
