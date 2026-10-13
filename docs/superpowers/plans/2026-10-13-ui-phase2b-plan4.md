# UI Round 4 · Phase 2B List Pages and Page Frames · Plan 2B-4 (detail pages and skeletons) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the eight detail pages (asset, repair, disposal request, employee, supplier with its purchase documents, my asset) and the loading skeletons onto the phase 2B primitives: the asset name as the title on `PageHeader` with a back link that keeps `returnTo`, facts on `KeyValueList`, number tiles on `StatStrip`, tables on `DataTable`, the asset tabs on `TabNav`, no doubled bottom space, and skeletons that match their pages at full width. Workflows, data and validation stay the same.

**Architecture:**
- **No new primitive.** The pages use what plans 2B-1 to 2B-3 built: `PageHeader`, `PageBackLink`, `KeyValueList`, `StatStrip`, `DataTable` and its parts, `TabNav`, `Nil`/`orNil`, `formatMoney`, `formatCount`. Task 9 reshapes the existing `c/ui/page-skeleton.tsx`.
- **One file = one commit.** Tasks 1–9 each move one file and lower that file's rows in `tests/list-frame-guards.test.ts` (LFG) and `tests/visual-foundation-guards.test.ts` (VFG), so old patterns cannot come back. Task 10 is one commit that pins the five `loading.tsx` boundaries (they hold no class of their own; Task 9 changed the skeletons they render).
- **The detail pages render 2C plan 4's files** (the status correction, the evidence and activity drawers, the transaction cancel dialog). This plan places them as before and never edits them; 2C plan 4 edits them in its worktree at the same time.
- **Pipeline (spec B7, §8.1–8.2):** this plan runs in the main checkout while 2C plan 4 runs in the worktree `.worktrees/ui-phase2c-plan4`. They share no code file. Whichever finishes second rebases onto `master` in its last task.
- **Controller tasks:** Task 0 (base check, before screenshots), Task 11 (verify, production build, dev-app check) and Task 13 (verify numbers, rebase if needed, wiki, memory). Task 12 writes the repo docs.

**Tech Stack:** Next.js 16.4 App Router · React 19 · Tailwind CSS 4.2.4 · class-variance-authority 0.7.1 · tailwind-merge 3.5 (through `cn()`) · radix-ui · next-intl 4 · `node --test` with Node 24 type stripping.

**Spec:** `docs/superpowers/specs/2026-10-12-ui-phase2b-design.md`, with section files in `docs/superpowers/specs/2026-10-12-ui-phase2b/` (`00-decisions.md`, `00-synthesis.md`, `03-primitives.md` … `09-guards-tests.md`; detail pages and skeletons are `04-navigation-frames.md` and `05-lists.md`, the plan is `08-plans.md` §8.8).
- **Spec §10 (rulings I1–I34) overrides the section files wherever they conflict.** This plan already applies them; when a task and a section file disagree, the task wins.
- The plan's files are those of spec §8.8. Its line numbers are from `d38a0ee`; this plan recounted them at `c2bfbe2`.

## Global Constraints

- **Git:**
  - Work on branch `feat/ui-phase2b-plan4` in the main checkout `D:/Antigravity/asset-system` (from `master` `c2bfbe2`, which holds plans 2B-1 to 2B-3 and 2C plans 1–3).
  - Never run `git checkout`, `git switch`, `git reset`, `git stash`, `git rebase` or `git clean`, and never touch `master`. Never touch the worktree `.worktrees/ui-phase2c-plan4` (2C plan 4 runs there at the same time).
  - Commit only the files your task names. One file is one commit unless the task groups files on purpose.
  - End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Next.js 16.4** is not the Next.js in your training data. Read `node_modules/next/dist/docs/` before using an API you have not seen in this repo.
- **Line endings:**
  - `git config core.autocrlf` is `true`. Most `src/` and `tests/` files are CRLF in the working tree, including every file plans 2B-1 to 2B-3 created; several are LF.
  - Before you edit a file, run `git ls-files --eol <file>` and keep what it uses. Edit with exact-string replacement; never normalize a file. New files are LF.
  - Tests that read source files strip `\r` (`.replace(/\r\n/g, "\n")`) before multi-line regexes. A test that reads a CRLF file without stripping must not get a new regex with `\n` (spec §9.6).
- **Tests:**
  - `npm test` runs `node scripts/run-tests.mjs` over `tests/**/*.test.{ts,mjs,js}` with Node 24 type stripping. Run one file with `node --test tests/<file>.test.ts`.
  - Modules that tests import use relative `.ts` imports (no `@/`) and erasable TypeScript only. Tests cannot import `.tsx`; they check `.tsx` by reading the source text.
  - Use the shared helpers in `tests/helpers/source-files.ts`.
- **Baseline before Task 1** (HEAD `c2bfbe2`, or this plan's commit on top of it, which changes only `docs/`):
  - `npm test`: 1951 tests, 1950 pass, 0 fail, 1 skipped.
  - `npx tsc --noEmit`: clean.
  - `npm run lint`: 0 errors and 146 warnings, all under `.agents/`.
  - Task 0 re-checks these numbers.
- **Every task ends with all of these green:** `npm test` (0 fail) · `npx tsc --noEmit` · `npm run lint` (0 errors, no new warnings in `src/` or `tests/`). Report any failure by name.
- **The guard scripts** (`<temp>` is the implementer's temp folder the controller names in the dispatch; never commit these files):
  - `node <temp>/p2b1-precheck.mjs --file <path>` prints one file's live count, budget, `KEEP` and seed per guard, and the `p2b-budget.mjs` arguments `ID=<budget>:<live>`. `node <temp>/p2b1-precheck.mjs --budgets` compares every budget row with the live counts.
  - `node <temp>/p2b-budget.mjs <path> ID=from:to ... [--migrated] [--dry-run]` lowers rows of LFG `BUDGETS` and VFG `TABLE_HEADER_FILLS` by file, never raises a number, never touches `KEEP`, and with `--migrated` adds the path to `MIGRATED_LIST_FILES`.
  - Before editing a file, its `live` equals its `budget`. After editing, compare the printed `args` with the task's Expected, then run `p2b-budget.mjs`.
  - Every other helper (the append that keeps CRLF, the Tailwind probe, a task precheck) is saved in full by the first task that needs it; later tasks name that task. `<temp>` sits under the linted tree: helpers are ESM `.mjs`, code fragments `.txt` or the `.ts` names a task gives (never a `.cjs` with `require`).
  - Shell heredocs and `node -e` drop backslashes: write regex-bearing text with a file-writing tool or a script file. When you copy a block from a task, copy only the lines between its fences.
- **Off limits:**
  - Do not run `npm ci`, `npm install`, `npm run build`, the dev server, `npx shadcn …`, or anything against a database.
  - Do not read or print `.env` or `.env.prod-admin`.
  - Leave the untracked paths alone: `.codex/`, `.impeccable/critique/`, `.playwright-mcp/`, `.superpowers/brainstorm/`, `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`, and `.worktrees/`.
  - Do not run skill helper scripts (for example the impeccable launcher); they make network calls.
- **No new tokens (2A I21).** No task adds a custom property to `:root`, `@theme inline` or `@theme`, and no task edits `tests/design-tokens-contrast.test.ts`. Never write `rounded-[…]`. Every new class must compile with Tailwind 4.2.4 against `src/app/globals.css`.
- **2C fences (spec §8.3, §8.11):**
  - Never edit `tests/form-migration-guards.test.ts` (FMG); 2C plan 4 edits it in the worktree at the same time. Never rename, move or delete a file in its `BATCH_FILES`, and keep it green.
  - Never touch the 18 files of 2C batch 4 (FMG `BATCH_FILES["4"]`): on the detail pages that means `c/assets/asset-status-correction-button.tsx`, `c/assets/asset-evidence-drawer.tsx`, `c/ui/activity-drawer.tsx` and `c/asset-operations/transaction-cancel-dialog.tsx` stay where they are, unedited.
  - Never touch the O11 bottom padding of `D/assets/[id]/page.tsx`, `D/maintenance/[id]/page.tsx` and `D/disposal/[id]/page.tsx`, `c/ui/mobile-action-bar.tsx`, `c/disposal/disposal-mobile-action-bar.tsx`, the `DisposalWorkflowStepper` component, or `c/maintenance/maintenance-attachments.tsx` (all 2C plan 5).
  - In `D/assets/[id]/page.tsx` keep `cancelTransaction={` and `transactionStatus === "active"` (`tests/asset-transaction-cancellation-ui.test.ts:35-36`, whose `:13` 2C plan 4 edits), `<AssetDetailActionMenu … />` with no children (`tests/dropdown-menus-ui.test.ts:15-17`) and `href={returnToHref}` (`tests/asset-return-navigation.test.ts:46`). Never edit the test files 2B spec §8.3 lists for this pair except where a task names a line of its own.
  - Never run a formatter on 2C files.
- **Look (B2, B3, §4):** `h1` weight 600 through `PageHeader`; the back link is `PageBackLink` with the left arrow (an icon button on phones) and keeps `returnTo`; detail pages are full width (no `max-w-7xl`); tables have a white 13/500 header without capitals; number tiles are one flat `StatStrip`, never a status fill; empty values are `Nil` ("—"), never "0.00" for an unknown price.
- **Validation and behavior:** keep every `required`, toast, `disabled` gate, `returnTo` and confirm step. No validation UX changes (V track).
- **Server:** none. No schema, migration, API, dependency or index.
- **Messages:** edit `messages/th.json` and `messages/en.json` only through `node scripts/messages-edit.mjs <changes.json>`, run from the repo root, with the JSON kept in your temp folder. Thai follows `docs/19_THAI_GLOSSARY.md` and must pass `tests/thai-glossary.test.ts`; every key exists in both files. This plan adds no key unless a task says so.
- **Deploy:** no task deploys. The user decided on 2026-10-12 to deploy once after all of phase 2 (B9).

## Rulings of this plan

- **Guard totals after this plan** (spec §10.4 table C column 2B-4, checked against the live counts at `c2bfbe2`): R7 17 → 11 (in 8 files) · LH1 24 → 18 · LB1 live 11 → 7 and budget 12 → 7 (the `D/maintenance/[id]/page.tsx` row: budget 1, live 0 → 1 in Task 3, KEEP 1) · LP1 7 → 4 · LT1 34 → 23 · LT5 3 → 2 · LV1 19 → 15 · LV2 97 → 73 · LV3 35 → 16 · LS1 17 → 14 · LS2 20 → 15 · LK1 7 → 1 · LN1 5 → 4 · LN2 7 → 5. LH2 5, LF1 1, LT2 1, LT3 2, LT4 1, LR1 0, R1 `{}` and R2 10 do not move. `MIGRATED_LIST_FILES` ends at 77; `c/ui/page-skeleton.tsx` stays out of it (spec §4.7 lets 2B-5 reshape the dashboard and report skeletons).
- **Pipeline with 2C plan 4 (spec §8.2, I29):** the shared non-code files are `DESIGN.md`, `tests/visual-foundation-guards.test.ts`, `messages/*.json`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md` and `docs/11_FEATURE_LIST.md`. If 2C plan 4 merges first, the controller rebases this branch in Task 13 Step 2 and resolves them by the rules there. A conflict in any other file means a fence leaked: stop.
- **Accepted from the drafts (spec silent or departed on purpose):**
  - Task 1: the asset page's tiles map onto `StatStrip` as numbers (open and total repairs, the repair cost with "บาท", the scan count, yes/no), and the sentences they used to show move to the strip's foot line, with `attention` when a repair is open or an audit difference needs review. `asset.latestMaintenance` loses its only caller; the key stays (2D).
  - Task 1: the ⋯ trigger in `c/assets/asset-detail-action-menu.tsx` stays `size="icon"` (40px from md beside 36px header buttons); that file is not in this plan (2D, recorded in the hand-off).
  - Task 6: the supplier page gets two strips (three counts; two money totals, one column below `lg`), because one five-cell strip cuts any amount over 1,000 baht at 1024px and 375px.
  - Task 9: the skeleton frame also takes `StatStrip`'s odd-last-cell class (the dashboard's fifth cell would leave a grey hole), and the register skeleton draws plan 2B-3's real toolbar.
  - Task 10: one commit adds the five `loading.tsx` boundaries to `MIGRATED_LIST_FILES` with a pin test; they hold no `max-w-7xl` of their own (Task 9 removed it from the skeletons).
  - A purchase document with no total still shows "0.00" (the supplier page maps `null` to 0 before Task 7's type change); the hand-off records it for 2D, together with the stale LV2 `KEEP` comment lines of the asset page and the two helpers that still `return "-"`.

## Review Focus

1. **A user who opens an asset from the register's page 2 and presses "กลับ"** must land on page 2 with the same filters. Pinned by Task 1's test (`<PageBackLink href={returnToHref}` and the breadcrumb's `href: returnToHref`) and `tests/asset-return-navigation.test.ts` (kept green); checked in Task 11.
2. **A user on a phone at the end of a detail page** must see the last content above the bottom bar, with no doubled `pb-24`. Pinned by LFG LP1 (7 → 4) and the tests of Tasks 5, 6 and 8 ("no pb-24 of its own"); measured at 375 in Task 11 against Task 0 Step 9.
3. **A supplier price or purchase document with no amount** must read "—", not "0.00". Pinned by Task 6's test ("shows an empty price as Nil") and Task 7's test (`formatMoney`); the one known gap (a document total mapped to 0 before Task 7) is recorded for 2D.
4. **A user on the asset page who cancels a transaction or opens the evidence or activity drawer** must get the same dialogs as before. Pinned by the kept lines (`cancelTransaction={`, `transactionStatus === "active"`, the self-closing `<AssetDetailActionMenu … />`) and the fence on 2C plan 4's files; checked with cancel only in Task 11 and again after a rebase in Task 13.
5. **A user on a slow network** must see a skeleton with the page's shape at full width, not a narrow centered block. Pinned by Task 9's test ("loading skeletons take the shape of their pages at full width") and Task 10's boundary pin; checked throttled in Task 11.

## File structure

| File | What changes | Task |
|---|---|---|
| `src/app/[locale]/(dashboard)/assets/[id]/page.tsx` | `PageHeader` with the asset name, `PageBackLink` with `returnTo`, `KeyValueList`, `StatStrip`, two `DataTable`s, `Nil`, `formatMoney` | 1 |
| `src/components/assets/asset-detail-tabs.tsx` | client wrapper of `TabNav` keeping its scroll (I9) | 2 |
| `src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx`, `disposal/[id]/page.tsx` | `PageHeader`, left-arrow back in the header and the bar, a back link on phones, the stepper placed | 3, 4 |
| `src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx`, `suppliers/[id]/page.tsx`, `src/components/master-data/supplier-purchase-documents.tsx` | no doubled `pb-24`, `StatStrip`, `KeyValueList`, `DataTable`, `Nil`/`formatMoney`/`formatCount` | 5, 6, 7 |
| `src/app/[locale]/(dashboard)/my-assets/[id]/page.tsx` | `PageHeader`, back link, `KeyValueList`, no doubled `pb-24` | 8 |
| `src/components/ui/page-skeleton.tsx` | skeletons in the shape of their pages, full width (I28, R-o) | 9 |
| the five `loading.tsx` files | pinned and migrated | 10 |
| `tests/asset-detail-ux.test.ts`, `tests/asset-detail-tabs.test.ts`, `tests/repair-record-detail-ui.test.ts`, `tests/disposal-detail-workspace.test.ts`, `tests/supplier-detail-ui.test.ts`, `tests/mobile-field-navigation.test.ts`, `tests/list-pages-ui.test.ts`, `tests/page-loading-skeleton.test.ts`, `tests/loading-boundaries.test.ts`, VFG and LFG | tests and guards | 1–10 |
| `DESIGN.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md`, `docs/11_FEATURE_LIST.md`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md` | plan 2B-4 docs | 12, 13 |

---


### Task 0: Base check, guard scripts and before screenshots (controller runs this task, not an implementer)

**Files:**
- Create then delete: `.claude/launch.json` (only if no dev server is running; never committed)
- Create (git-ignored): `<temp>/p2b1-precheck.mjs`, `<temp>/p2b-budget.mjs`, where `<temp>` is the `codex-temp/` folder of this plan's SDD workspace (`.superpowers/sdd/<plan workspace>/codex-temp/`)
- Evidence: `.superpowers/sdd/screenshots/ui-phase2b-plan4/before/` (git-ignored)

**Interfaces:**
- Consumes: HEAD before Task 1.
- Produces: the base check, the baseline numbers, the two guard scripts every later task runs, the ids and the before images Task 11 compares against.

- [ ] **Step 1: Check the base.**

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2b-plan4`

Run: `git merge-base --is-ancestor c2bfbe2 HEAD && git diff --quiet c2bfbe2 HEAD -- src tests messages scripts prisma && echo BASE-OK`
Expected: `BASE-OK`

Run: `git log --oneline -1 master`
Expected: `c2bfbe2 docs(ui): phase 2B plan 3 verify numbers after the rebase onto 2C plan 3` (plans 2B-3 and 2C-3 are merged; spec §8.10 row 2).

Run: `git worktree list`
Expected: the main checkout, and `.worktrees/ui-phase2c-plan4` on `feat/ui-phase2c-plan4` once 2C plan 4 has started (spec §8.10 row 7). Run `git diff --name-only master...feat/ui-phase2c-plan4` when that branch has commits: every path must be one of 2C plan 4's files, its tests, FMG, or the shared non-code files of the Rulings. A path of this plan means a fence leaked: stop.

If `BASE-OK` does not print, code changed after `c2bfbe2`. Run each task's precheck before dispatching it, update the task text where a count or snippet differs, and record a ruling in the ledger.

- [ ] **Step 2: Baseline.** Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: 1951 tests (1950 pass, 0 fail, 1 skipped); tsc clean; lint 0 errors and 146 warnings, all under `.agents/`. Record the numbers in the ledger.

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

- [ ] **Step 4: Recount.** Run `node <temp>/p2b1-precheck.mjs --budgets`. Expected: `budgets hold: no live count is over its row`; every guard shows `slack 0` except `LB1 … 12 in 12 rows · live 11 in 11 files · slack 1` (the `D/maintenance/[id]/page.tsx` row: budget 1, live 0, KEEP 1; Task 3's left arrow in the bottom bar fills it, so the slack ends there). Then run `node <temp>/p2b1-precheck.mjs --file <path>` for each file of Tasks 1–10 and check that the `live` column equals the task's precheck Expected. On any difference, stop and update that task before dispatching it.

- [ ] **Step 5: Confirm the dev database.** Read the `.env` keys `DATABASE_URL` and `DB_USER` without printing secrets. The database must be `asset_management_dev` and the user `asset_dev`. If not, stop.

- [ ] **Step 6: Open the app.**
  - If the user's dev server answers on `http://localhost:3000` (the main checkout), use it. 2C plan 4's servers run from the worktree on 3100/3101; never use those for this plan.
  - Otherwise create `.claude/launch.json` (`runtimeExecutable: "npm"`, `runtimeArgs: ["run", "dev"]`, `port: 3000`) and run `preview_start`.
  - Log in with the seed admin from `prisma/seed.ts`; do not echo the password.

- [ ] **Step 7: Pick ids.** Record in the ledger:
  - assets: one with a photo and transactions (its detail page shows both tables), one checked out (a transaction that can be cancelled), and the register page-2 URL that opens one of them (for the "กลับ" check)
  - a repair ticket (`/th/maintenance/<id>`), a disposal request with a workflow stepper (`/th/disposal/<id>`)
  - an employee with assets, history and documents (the three tables of `/th/master-data/employees/<id>`), a supplier with purchase documents and one empty price (`/th/master-data/suppliers/<id>`)
  - an asset of `/th/my-assets` (if the seed admin holds none, record it; the page is then checked for a person in Task 11 Step 9)

- [ ] **Step 8: Before screenshots.** Save to `.superpowers/sdd/screenshots/ui-phase2b-plan4/before/` as `<view>-<width>.png`, full page plus the `main` scroll area scrolled to its bottom:
  - `/th/assets/<id>` at 1440, 1024, 768 and 375 (the asset with a photo), its other tabs at 1440 and 375
  - `/th/maintenance/<id>` and `/th/disposal/<id>` at 1440 and 375
  - `/th/master-data/employees/<id>`, `/th/master-data/suppliers/<id>`, `/th/my-assets/<id>` at 1440 and 375
  - the five loading views: navigate with the network throttled (Playwright `route` delay on the page request, or Chrome "Slow 3G") and capture the skeleton of `/th/dashboard`, `/th/assets`, `/th/assets/<id>`, `/th/reports` and one page that uses the root `D/loading.tsx`, at 1440 and 375
  - Save nothing in any form. Open no dialog or drawer past its first screen.

- [ ] **Step 9: Measure.** At 375 on each detail page, record the gap between the last content and the top of the bottom bar (the page's `main` scroll height minus the visible area when scrolled to the bottom, and whether any content sits under the bar). Task 11 compares them (spec §8.8 dev-check row 3).

- [ ] **Step 10: Clean up.** Stop any server you started and delete `.claude/launch.json`. Keep every helper script outside the repo except the two guard scripts in `<temp>`. `git status --short` must show only the untracked paths in Global Constraints. No commit in this task.

---

### Task 1: `D/assets/[id]/page.tsx` · the asset name as the h1 on `PageHeader`, the facts on `KeyValueList`, the tiles on `StatStrip` and the two history tables on `DataTable` (plus the helper scripts of this plan)

Spec §8.8 row 1, §4.4.5 row `D/assets/[id]/page.tsx`, §4.3.3 rules 3–6, §4.5.2 #24, §5.5 row `D/assets/[id]/page.tsx`, §5.1, §5.7, §9.4.1–9.4.2 rows `D/assets/[id]/page.tsx` (with the LV2 note), §10.4 table A row 2B-4 (`asset-detail-ux.test.ts:27`, `:39-40`, `:151-152`), §8.3 test table row 2B-4∥2C-4, §8.11 rows 5 and 8, rulings I1, R-h, R-n, R-p and controller rulings (a), (b), (e), (f) and (g). One file, one commit. The page and its test are CRLF: exact-string replacements only. This task also saves the three helper scripts Tasks 2–4 reuse (and the later tasks of this plan may reuse the append and the probe by name).

Rulings this task applies:
- **§4.4.5, §4.3.3 rule 6, I1:** the trail ends on the code, so the h1 is `asset.name` (it was `asset.assetTag` with the name under it). The meta row is, in order: the code as `<span className="tag">`, the status and condition badges with their help buttons (wrapped in `<span data-testid="asset-identity-summary" className="contents">`, so `tests/asset-detail-ux.test.ts:32-35` still finds the summary before the component banner), the location (`MapPin`) and the custodian or responsibility (`PackageCheck`), each `orNil(…)` (table A `:39-40`). One fact per element, no separators.
- **§4.5.2 #24, B2:** `back={<PageBackLink href={returnToHref} label={isAssetScanReturn ? t("backToScan") : tCommon("back")} />}`: the literal `href={returnToHref}` stays (`tests/asset-return-navigation.test.ts:46`); the name is the visible words at every width, so `aria-label` goes (table A `:27`). LB1 1 → 0.
- **R-h, §4.3.3 rule 5:** ⋯ (`<AssetDetailActionMenu … />`, its props byte for byte, only re-indented, still self-closing: `tests/dropdown-menus-ui.test.ts:15-17`; `cancelTransaction={` and `transactionStatus === "active"` stay: `tests/asset-transaction-cancellation-ui.test.ts:35-36`) comes before the primary "แก้ไข" link, now `cn(buttonVariants({ size: "md" }), "hidden md:inline-flex")` (table A `:152`). LH1 1 → 0.
- **§5.5:** the repair and audit history tables are `DataTable framed={false}` (they sit in a padded section that is already a panel) with a `caption` and the overflow hint, `DataTableHead`/`DataTableCell` cells and the existing `ClickableTableRow`. The repair status is a `StatusBadge` toned by `getRepairRecordStatusTone` (it was plain text); codes are `tag` (R-p); the scan count is right-aligned `formatCount` (§5.7). The `ActionEmptyState` outside each table stays. VFG R7 2 → 0, LT1 10 → 0.
- **§3.14, §9.4.1 LK1:** the file-local `Info` goes; its seven groups (overview, specs, ownership, purchase, the latest handover, older handovers, the movement snapshot) are `KeyValueList`s. Codes composed with a name become `<span className="tag">{code}</span> - {name}` (R-p, as plan 2B-2 did on the batch page); a missing custodian reads `asset.noCustodian` to screen readers (`nilLabel`). Nullable dates pass `null` (`formatDate(null)` would print a typed "-"). LK1 1 → 0.
- **§5.1 (number tiles → `StatStrip`, no status fill, R-d):** the file-local `SummaryStrip` goes. Each tab gets one `StatStrip` whose values are numbers or a short yes/no; the sentences it used to show as values become the foot line (see "Departure" below). LS1 1 → 0.
- **§9.4.2 LV2 note, R-n:** 11 typed dashes become `orNil`/`Nil`/`null` (`:909`, `:913`, `:1270`, `:1408`, `:1528`, `:1772`, `:1822` with `SummaryStrip`, `:2093` ×2 and `:2201` through `null` + `?? <Nil />` with `{relationshipAsset.assetTag}` kept for `tests/asset-relationship-map-ui.test.ts:39-40`, `:2449` with `Info`). The four that stay are the translated-sentence arguments `:1198`, `:1200` and the history sentence `:2462` ×2 (KEEP 4). LV2 15 → 4.
- **§5.7, DS:515:** money outside a table is `formatMoney(x, { unit: tCommon("baht") })`: the purchase price, the total repair cost tile (`unit` of the `StatStrip` item) and the purchase-document line of the timeline, which now takes the document's currency or "บาท" (a new last parameter of the file-local `buildPurchaseTimelineItems`). LV3 3 → 0.
- **LT5:** the disabled quick action drops `opacity-70` and uses the disabled ink of `buttonVariants` (`text-faint-foreground`) on the same box; it stays a non-focusable `span` as before. LT5 1 → 0.
- **Ruling (f):** 2B does not touch this page again, so it joins `MIGRATED_LIST_FILES`; what stays is LP1 1 and LV2 4, both its `KEEP`.
- **Fence (§8.8 row 1, §8.11 rows 5 and 8, ruling (e)):** never the root `<div className="space-y-6 pb-24 md:pb-0">` (`:882`, the O11 padding 2C plan 5 owns) or the `MobileActionBar` line (`:989`); never `asset-status-correction-button.tsx`, `asset-evidence-drawer.tsx`, `ui/activity-drawer.tsx` or `transaction-cancel-dialog.tsx` (2C plan 4; they stay where they are rendered); never `asset-detail-action-menu.tsx`.
- **Departure (spec silent on the tile mapping):** `StatStrip` values are numbers in `text-metric` (28px), so the two sentences the old tiles showed as values move to the foot line: repairs show open (with the warning foot "มีใบซ่อมเปิดอยู่ N รายการ" when there are any), total (foot "ล่าสุด: <เลขใบซ่อม>") and total cost; audit shows the scan count (foot "<รอบ>: <ผล>") and "ต้องตรวจสอบผลต่าง" ใช่/ไม่ (warning foot "ผลตรวจนับต้องติดตาม" when yes). `asset.latestMaintenance` loses its only caller; the key stays (no message edit in this plan). The `tone` fills give way to `attention` (R-d).
- **Tests:** table A `asset-detail-ux.test.ts:27`, `:39-40`, `:151-152` exactly as spec §10.4, plus one appended test for the new frame. The file reads the page raw (CRLF), so the new regexes hold no `\n`.

What users will see on `/th/assets/<id>`:
- The title is the asset name at weight 600; the code (monospace), the status and condition badges with their help, the location and the custodian sit on one row under it. A missing location or custodian shows "—".
- "กลับ" (or "กลับไปสแกน" from the scanner) is the outline button with the left arrow, a 44px icon button on phones, and still returns to the register page the user came from. ⋯ comes before "แก้ไข" from md.
- Overview, specs, ownership, purchase, handover and the movement snapshot list their facts as label and value rows (a 13px faint label in a 120px column; on phones the label sits above its value) instead of small capital labels in a grid. Money reads "64,900.00 บาท".
- The repair and audit tabs show one flat strip of numbers (two columns below 1024px) with a warning line when a repair is open or an audit difference needs review, then a table with a white 13px header without capitals, status badges, monospace codes and a scroll hint only when it overflows.
- A quick action that cannot be used now is no longer faded; it keeps its box with faint text.
- The phone bottom bar and the bottom space are unchanged.

Not in this task: the tabs (Task 2) · the skeleton of this page (Tasks 9–10) · `asset-detail-action-menu.tsx` (its ⋯ trigger stays `size="icon"`) · `getCheckoutDestination`'s `return "-"` and `formatCancellationSnapshot`'s `return "-"` (dialog and helper strings, not the counted forms; 2D) · `getSummaryToneClass` in `src/lib/asset-detail-format.ts` (no caller after this task; 2D) · docs (Task 12). Do not run a formatter.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx` (`i/lf w/crlf`; 24 exact replacements)
- Modify: `tests/asset-detail-ux.test.ts` (`i/lf w/crlf`; 3 exact replacements, 1 appended block)
- Modify: `tests/list-frame-guards.test.ts`, `tests/visual-foundation-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only, never committed: `p2b4-t1-precheck.mjs`, `p2b4-append.mjs`, `p2b4-tw-probe.mjs` (Tasks 2–4 reuse all three; any later task of this plan may reuse the last two by name), `t01-ux-block.ts`

**Must keep passing without edits:**
- `tests/asset-detail-ux.test.ts:7-22`, `:30-38` and `:41`, `:44-145`, `:150`, `:153-154`
- `tests/asset-transaction-cancellation-ui.test.ts:26-42` (`cancelTransaction={`, `transactionStatus === "active"`; `:13` is 2C plan 4's) · `tests/dropdown-menus-ui.test.ts:7-18` · `tests/asset-return-navigation.test.ts:41-48` · `tests/asset-scan-return-navigation.test.ts:18-24` · `tests/asset-status-help-ui.test.ts:28-40` · `tests/open-repair-filter.test.ts:20-25` · `tests/performance-route-instrumentation.test.ts` · `tests/asset-operation-status-policy.test.ts:98-106` (spec §8.3: nobody edits these while 2C plan 4 runs)
- `tests/asset-relationship-map-ui.test.ts:15-44` (`font-mono` and `[overflow-wrap:anywhere]` before `{relationshipAsset.assetTag}`) · `tests/asset-detail-anchor-layout.test.ts` · `tests/asset-detail-data-boundaries.test.ts` · `tests/asset-handover-presentation.test.ts:9-14` (`label: t("handoverMode")`) · `tests/asset-photo-gallery.test.ts` · `tests/audit-item-status-labels.test.ts:76-80` · `tests/visual-consistency-ui.test.ts:23-34` (`tone={getAssetStateTone(asset.status.name)}`) · `tests/breadcrumbs-ui.test.ts` (11 sites, 8 with a code; `{ label: asset.assetTag, code: true }` last)
- `tests/list-primitives-ui.test.ts` · `tests/form-migration-guards.test.ts`

**Interfaces:**
- Consumes:
  - 2B-1: `PageHeader({ title, meta?, actions?, back?, breadcrumbs?, compactOnMobile?, className? })` and `PageBackLink({ href, label, onClick?, className? })` from `@/components/ui/page-header`; `KeyValueList({ items: readonly KeyValueItem[], className? })` with `KeyValueItem = { key?: string; label: ReactNode; value: ReactNode; nilLabel?: string }` from `@/components/ui/key-value-list` (a blank value shows `Nil`; 0 is a value); `StatStrip({ items: readonly StatStripItem[], className? })` with `StatStripItem = { key, label, value: string, unit?, foot?, footTitle?, attention?, … }` from `@/components/ui/stat-strip`; `DataTable({ framed?, caption?, scrollHint?, … })`, `DataTableHeader`, `DataTableBody`, `DataTableHead({ align? })`, `DataTableCell({ align?, numeric? })` from `@/components/ui/data-table`; `ClickableTableRow({ href, label })` (unchanged import).
  - 2A: `Nil`, `orNil(value, label?)` from `@/components/ui/nil`; `formatCount`, `formatMoney(value, { unit? })` from `@/lib/display-format`; `buttonVariants({ variant?, size? })`.
  - `getRepairRecordStatusTone(status: string)` from `@/lib/repair-record-policy`.
  - Task 0: `<temp>/p2b1-precheck.mjs` (`--file`, `--budgets`) and `<temp>/p2b-budget.mjs`.
- Produces:
  - the page in `MIGRATED_LIST_FILES` with LP1 1 and LV2 4 (its `KEEP`), no R7 row; the test `asset detail header is PageHeader with the asset name, and its facts, tiles and tables use the shared parts (spec 2B §4.4.5)`.
  - In the temp folder: `p2b4-t1-precheck.mjs <1|2|3|4>`, `p2b4-append.mjs <block file> <test file>` (keeps the test file's CRLF or LF), `p2b4-tw-probe.mjs <file> …` (`SHOW=a,b` prints compiled rules).
  - For 2C plan 5 (Task 12 writes it into DH): the O11 root padding moves from `:882` to `:886`, and the `MobileActionBar` line from `:989` to `:979`.

| guard | `D/assets/[id]/page.tsx` before → after | plan total (budget) before → after |
|---|---|---|
| VFG R7 | 2 → – | 17 in 11 rows → 15 in 10 |
| LFG LH1 | 1 → – | 24 → 23 |
| LFG LB1 | 1 → – | 12 → 11 (live 11 → 10; the `D/maintenance/[id]/page.tsx` row is Task 3's) |
| LFG LP1 | 1 → 1 (`KEEP`, O11) | 7 |
| LFG LT1 | 10 → – | 34 → 24 |
| LFG LT5 | 1 → – | 3 → 2 |
| LFG LV2 | 15 → 4 (`KEEP`) | 97 → 86 |
| LFG LV3 | 3 → – | 35 → 32 |
| LFG LS1 | 1 → – | 17 → 16 |
| LFG LK1 | 1 → – | 7 → 6 |
| `MIGRATED_LIST_FILES` | – → joins | 64 → 65 |

- [ ] **Step 1: Check what this task builds on (and save the three helper scripts)**

Save these three scripts in your temp folder (never in the repo). `p2b4-append.mjs` is plan 2B-3's `p2b3-append.mjs` under the 2B-4 name. `p2b4-tw-probe.mjs` is plan 2B-3's `p2b3-tw-probe.mjs` with two changes: a `…ClassName="…"` prop (Task 2's `linkClassName="snap-start"`) is read as a class string, and a lone `-` (the typed dashes R-n keeps on this page) is not taken for a class.

`p2b4-t1-precheck.mjs`:

```js
// p2b4-t1-precheck.mjs: run from the repo root before Task 1, 2, 3 or 4 of plan 2B-4.
// Usage: node p2b4-t1-precheck.mjs <1|2|3|4>. Reads only; writes nothing. Never commit this file.
// Confirms that the 2B-1 primitives and the 2A parts these four tasks use are there with the API the tasks quote, that
// the keys they read exist in th and en, that the earlier tasks of the group are in and this task's change is not, and
// that each file this task edits still holds the c2bfbe2 text the old snippets quote (a hash of its text with \r stripped).
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"

const task = Number(process.argv[2])
if (![1, 2, 3, 4].includes(task)) {
  console.error("usage: node p2b4-t1-precheck.mjs <1|2|3|4>")
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
const migrated = (path) => migratedBlock.includes(`\`${path.replace(D, "${D}").replace(C, "${C}")}\``)

const ASSET = `${D}assets/[id]/page.tsx`
const TABS = `${C}assets/asset-detail-tabs.tsx`
const REPAIR = `${D}maintenance/[id]/page.tsx`
const DISPOSAL = `${D}disposal/[id]/page.tsx`
// The files each task edits, with their CR-stripped text hash at c2bfbe2 (no other task of the plan edits them).
const UNCHANGED = {
  1: { [ASSET]: "221289f96b41c0bc", "tests/asset-detail-ux.test.ts": "33b5097d2437b161" },
  2: { [TABS]: "42db5daf40eba2c2", "tests/asset-detail-tabs.test.ts": "cf35582178bd280c" },
  3: { [REPAIR]: "54d9f78e3d43f6bb", "tests/repair-record-detail-ui.test.ts": "30413625164c7f0e" },
  4: { [DISPOSAL]: "ffbc5092c34115e8", "tests/disposal-detail-workspace.test.ts": "6555cdd7434e3efe" },
}
// What each task leaves behind, so the next task can see it is in (and a task can see it has not run yet).
const DONE = {
  1: () => read(ASSET).includes("title={asset.name}") && migrated(ASSET),
  2: () => read(TABS).includes("<TabNav") && migrated(TABS),
  3: () => read(REPAIR).includes("title={ticket.asset.name}") && migrated(REPAIR),
  4: () => read(DISPOSAL).includes("title={disposalRequest.asset.name}") && migrated(DISPOSAL),
}

const pageHeader = ui("page-header.tsx")
const tabNav = ui("tab-nav.tsx")
const statStrip = ui("stat-strip.tsx")
const dataTable = ui("data-table.tsx")
const checks = {
  "2B-1: PageHeader with title, meta, actions, back and breadcrumbs; PageBackLink with href and label":
    exports(`${C}ui/page-header.tsx`, ["PageHeader", "PageBackLink"]) &&
    /export function PageHeader\(\{ title, meta, actions, back, breadcrumbs, compactOnMobile = false, className \}: PageHeaderProps\)/.test(pageHeader) &&
    /export function PageBackLink\(\{ href, label, onClick, className \}: PageBackLinkProps\)/.test(pageHeader),
  "2B-1: KeyValueList with items, key and nilLabel":
    /export type KeyValueItem = \{ key\?: string; label: ReactNode; value: ReactNode; nilLabel\?: string \}/.test(ui("key-value-list.tsx")) &&
    /export function KeyValueList\(\{ items, className \}: \{ items: readonly KeyValueItem\[\]; className\?: string \}\)/.test(ui("key-value-list.tsx")),
  "2B-1: TabNav passes ...navProps to <nav> and takes linkClassName, count and icon":
    /\.\.\.navProps \}: TabNavProps\)/.test(tabNav) && /\{\.\.\.navProps\}/.test(tabNav) && /linkClassName\?: string/.test(tabNav) &&
    /count\?: string/.test(tabNav) && /icon\?: React\.ReactNode/.test(tabNav),
  "2B-1: StatStrip items with unit, foot, footTitle and attention":
    exports(`${C}ui/stat-strip.tsx`, ["StatStrip", "StatStripItem"]) &&
    ["unit?: string", "foot?: React.ReactNode", "footTitle?: string", "attention?: boolean"].every((text) => statStrip.includes(text)),
  "2B-1: DataTable framed, caption and scrollHint; DataTableHead align; DataTableCell numeric":
    exports(`${C}ui/data-table.tsx`, ["DataTable", "DataTableHeader", "DataTableBody", "DataTableHead", "DataTableCell"]) &&
    ["framed?: boolean", "caption?: string", "scrollHint?: string", 'align?: "left" | "right"', "numeric?: boolean"].every((text) => dataTable.includes(text)),
  "2B-1: ClickableTableRow takes href and label": /export function ClickableTableRow\(\{\s*href,\s*label,/.test(ui("clickable-table-row.tsx")),
  "2A: Nil, orNil, formatCount, formatMoney, buttonVariants size md":
    exports(`${C}ui/nil.tsx`, ["Nil", "orNil"]) && exports("src/lib/display-format.ts", ["formatCount", "formatMoney"]) &&
    /md: sizeMd,/.test(read(`${C}ui/button-variants.ts`)),
  "getRepairRecordStatusTone is exported by src/lib/repair-record-policy.ts": exports("src/lib/repair-record-policy.ts", ["getRepairRecordStatusTone"]),
  "the keys these tasks read exist in th and en": ["th", "en"].every((locale) => {
    const { common, asset, repairRecord, disposalPage } = messages(locale)
    return ["back", "baht", "tableScrollHint", "yes", "no", "view", "status", "noValue"].every((key) => typeof common?.[key] === "string") &&
      ["backToScan", "noCustodian", "activityAuditFinding", "latestMaintenanceSummary", "openMaintenanceCount", "openMaintenance", "totalMaintenance",
        "maintenanceTotalCost", "scanCount", "auditFindingRequired", "auditHistory", "detailViews"].every((key) => asset?.[key] !== undefined) &&
      ["title", "print", "cost"].every((key) => typeof repairRecord?.[key] === "string") &&
      ["title", "saleValue", "salvageValue", "actualSaleValue", "actualSalvageValue"].every((key) => typeof disposalPage?.[key] === "string")
  }),
  ...Object.fromEntries([1, 2, 3].filter((number) => number < task).map((number) => [`Task ${number} is in`, DONE[number]()])),
  [`Task ${task} has not run yet`]: !DONE[task](),
  ...Object.fromEntries(Object.entries(UNCHANGED[task]).map(([path, expected]) => [`${path} is unchanged since c2bfbe2 (hash ${expected})`, hash(path) === expected])),
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

`p2b4-append.mjs`:

```js
// p2b4-append.mjs: run from the repo root. Usage: node <temp>/p2b4-append.mjs <block file> <test file>
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

`p2b4-tw-probe.mjs`:

```js
// p2b4-tw-probe.mjs: run from the repo root. Usage: node <temp>/p2b4-tw-probe.mjs <file> [<file> ...]
// Compiles every class of the class strings in the given files with the repo's Tailwind (@tailwindcss/node) against
// src/app/globals.css, in memory, and lists any class that produces no CSS. Reads only; writes nothing. Never commit.
// SHOW=a,b prints the compiled rule of the named classes. A lone "-" is a typed dash (the translated-sentence arguments
// that R-n keeps), never a class.
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
const classes = new Set()
for (const file of process.argv.slice(2)) {
  for (const [, lead, text] of readFileSync(file, "utf8").matchAll(STRING)) {
    if (!takes(lead, text)) continue
    for (const token of text.split(/\s+/)) if (/^[a-z!\[-]/.test(token) && !/[(){};]/.test(token) && token !== "-") classes.add(token)
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
Expected: `feat/ui-phase2b-plan4`

Run: `git status --short src tests messages` then `node <temp>/p2b4-t1-precheck.mjs 1`
Expected: `git status` prints nothing. The script prints (exit 0):
```
ok      2B-1: PageHeader with title, meta, actions, back and breadcrumbs; PageBackLink with href and label
ok      2B-1: KeyValueList with items, key and nilLabel
ok      2B-1: TabNav passes ...navProps to <nav> and takes linkClassName, count and icon
ok      2B-1: StatStrip items with unit, foot, footTitle and attention
ok      2B-1: DataTable framed, caption and scrollHint; DataTableHead align; DataTableCell numeric
ok      2B-1: ClickableTableRow takes href and label
ok      2A: Nil, orNil, formatCount, formatMoney, buttonVariants size md
ok      getRepairRecordStatusTone is exported by src/lib/repair-record-policy.ts
ok      the keys these tasks read exist in th and en
ok      Task 1 has not run yet
ok      src/app/[locale]/(dashboard)/assets/[id]/page.tsx is unchanged since c2bfbe2 (hash 221289f96b41c0bc)
ok      tests/asset-detail-ux.test.ts is unchanged since c2bfbe2 (hash 33b5097d2437b161)
info    src/app/[locale]/(dashboard)/assets/[id]/page.tsx: CRLF
info    tests/asset-detail-ux.test.ts: CRLF
preconditions hold for Task 1
```
On any `MISSING` line, stop and report it. A `hash now` line means the file changed after `c2bfbe2` (2C plan 4 does not edit these files), so the old snippets below may not match: report it, do not guess.

Run: `node <temp>/p2b1-precheck.mjs --file "D/assets/[id]/page.tsx"`
Expected (after the `info`/`ok` header lines; exit 0):
```
file    src/app/[locale]/(dashboard)/assets/[id]/page.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
R7         2       2     0     2
LH1        1       1     0     1
LB1        1       1     0     1
LP1        1       1     1     1
LT1       10      10     0    10
LT5        1       1     0     1
LV2       15      15     4    15
LV3        3       3     0     3
LS1        1       1     0     1
LK1        1       1     0     1
args    R7=2:2 LH1=1:1 LB1=1:1 LP1=1:1 LT1=10:10 LT5=1:1 LV2=15:15 LV3=3:3 LS1=1:1 LK1=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol "src/app/[[]locale]/(dashboard)/assets/[[]id]/page.tsx" tests/asset-detail-ux.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: `i/lf w/crlf` for all four. Keep them CRLF.

- [ ] **Step 2: Write the failing tests (`tests/asset-detail-ux.test.ts`, CRLF, read raw)**

(a) Table A `:27`. Replace:

```ts
  assert.match(source, /aria-label=\{isAssetScanReturn \? t\("backToScan"\) : tCommon\("back"\)\}/)
```

with:

```ts
  assert.match(source, /label=\{isAssetScanReturn \? t\("backToScan"\) : tCommon\("back"\)\}/)
```

(b) Table A `:39-40`. Replace:

```ts
  assert.match(source, /\{currentLocationLabel \|\| "-"\}/)
  assert.match(source, /\{lifecycle\.responsibilityValue \?\? currentCustodianLabel \?\? "-"\}/)
```

with:

```ts
  assert.match(source, /orNil\(currentLocationLabel\)/)
  assert.match(source, /orNil\(lifecycle\.responsibilityValue \?\? currentCustodianLabel\)/)
```

(c) Table A `:151-152`. Replace:

```ts
  assert.match(source, /className=\{cn\(buttonVariants\(\{ variant: "outline" \}\), "min-w-11 px-3"\)\}/)
  assert.match(source, /className=\{cn\(buttonVariants\(\), "hidden md:inline-flex"\)\}/)
```

with:

```ts
  assert.match(source, /<PageBackLink href=\{returnToHref\}/)
  assert.match(source, /cn\(buttonVariants\(\{ size: "md" \}\), "hidden md:inline-flex"\)/)
```

(d) Save this block as `<temp>/t01-ux-block.ts`:

```ts
// Plan 2B-4 Task 1 (spec 2B §4.4.5, §5.5, §8.8 row 1, I1, R-h): the asset name is the h1 under the trail that ends on
// the code; the code, the badges, the location and the custodian are the meta row; ⋯ comes before the primary edit link.
// The two history tables are DataTables, the facts KeyValueLists and the number tiles one StatStrip per tab. The O11
// bottom padding and the mobile action bar stay for 2C plan 5. This file reads the page raw (CRLF): no line breaks here.
test("asset detail header is PageHeader with the asset name, and its facts, tiles and tables use the shared parts (spec 2B §4.4.5)", () => {
  const source = assetDetailSource()

  assert.match(source, /import \{ PageBackLink, PageHeader \} from "@\/components\/ui\/page-header"/)
  assert.match(source, /breadcrumbs=\{\[\s*\{ label: t\("title"\), href: returnToHref \},\s*\{ label: asset\.assetTag, code: true \},\s*\]\}\s*title=\{asset\.name\}/)
  assert.match(source, /<span className="tag">\{asset\.assetTag\}<\/span>\s*<span data-testid="asset-identity-summary" className="contents">/)
  assert.match(source, /back=\{<PageBackLink href=\{returnToHref\} label=\{isAssetScanReturn \? t\("backToScan"\) : tCommon\("back"\)\} \/>\}/)
  assert.doesNotMatch(source, /aria-label=\{isAssetScanReturn/)
  const menuAt = source.indexOf("<AssetDetailActionMenu")
  const editAt = source.indexOf('cn(buttonVariants({ size: "md" }), "hidden md:inline-flex")')
  assert.ok(menuAt > -1 && editAt > menuAt, "⋯ comes before the primary edit link (spec 2B §4.3.3 rule 5)")
  assert.equal(source.match(/<DataTable framed=\{false\} caption=/g)?.length, 2)
  assert.match(source, /tone=\{getRepairRecordStatusTone\(ticket\.repairStatus\)\}/)
  assert.equal(source.match(/<StatStrip\b/g)?.length, 2)
  assert.equal(source.match(/<KeyValueList\b/g)?.length, 7)
  assert.doesNotMatch(source, /<h1\b|<thead\b|<Breadcrumbs\b|<ArrowLeft\b|formatCurrency|function (?:Info|SummaryStrip)\b|opacity-70/)
  assert.match(source, /<div className="space-y-6 pb-24 md:pb-0">/, "the O11 bottom padding stays for 2C plan 5")
  assert.match(source, /\{mobileActions\.length > 0 \? <MobileActionBar actions=\{mobileActions\} \/> : null\}/)
})
```

Run: `node <temp>/p2b4-append.mjs <temp>/t01-ux-block.ts tests/asset-detail-ux.test.ts`
Expected: `appended <temp>/t01-ux-block.ts to tests/asset-detail-ux.test.ts (CRLF)`

Run: `node --test tests/asset-detail-ux.test.ts`
Expected: FAIL, `tests 15 · pass 12 · fail 3` (one test more than before this step):
- `asset detail answers identity and responsibility in one compact first-viewport summary`: the input did not match the regular expression `/orNil\(currentLocationLabel\)/`
- `asset detail header links share the Button look of the More menu trigger`: the input did not match the regular expression `/<PageBackLink href=\{returnToHref\}/`
- `asset detail header is PageHeader with the asset name, and its facts, tiles and tables use the shared parts (spec 2B §4.4.5)`: the input did not match the regular expression `/import \{ PageBackLink, PageHeader \} from "@\/components\/ui\/page-header"/`

`asset detail keeps an accessible name on the icon-only mobile back link` passes before and after: the table A regex `/label=\{isAssetScanReturn …\}/` also matches today's `aria-label=…`. The appended test pins the move (`back={<PageBackLink … label={isAssetScanReturn …} />}` and no `aria-label={isAssetScanReturn`).

- [ ] **Step 3: Lower the guard rows of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs "D/assets/[id]/page.tsx" R7=2:0 LH1=1:0 LB1=1:0 LP1=1:1 LT1=10:0 LT5=1:0 LV2=15:4 LV3=3:0 LS1=1:0 LK1=1:0 --migrated`
Expected (exit 0):
```
R7: 2 -> 0 (row deleted)
LH1: 1 -> 0 (row deleted)
LB1: 1 -> 0 (row deleted)
LP1: 1 kept
LT1: 10 -> 0 (row deleted)
LT5: 1 -> 0 (row deleted)
LV2: 15 -> 4
LV3: 3 -> 0 (row deleted)
LS1: 1 -> 0 (row deleted)
LK1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/assets/[id]/page.tsx
```

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 37 · fail 10`, each naming only `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`:
- LH1 (`LH1: 24 in 24 files`, `1 > 0`) · LB1 (`11 in 11`, `1 > 0`) · LT1 (`34 in 9`, `10 > 0`) · LT5 (`3 in 2`, `1 > 0`) · LV2 (`97 in 29`, `15 > 4`) · LV3 (`35 in 9`, `3 > 0`) · LS1 (`17 in 15`, `1 > 0`) · LK1 (`7 in 7`, `1 > 0`)
- `L0 …` with the same eight lines (`LH1 …: 1 > 0` … `LK1 …: 1 > 0`), because the page is now in `MIGRATED_LIST_FILES`
- VFG `R7 interim: table-header fills wait for DataTable (2B), file by file`: `17 matches in 11 files; over budget:` and `…/assets/[id]/page.tsx: 2 > 0`

- [ ] **Step 4: Move the page onto the shared parts (`src/app/[locale]/(dashboard)/assets/[id]/page.tsx`, CRLF)**

24 exact replacements, top to bottom. Make all of them before you compile: (1)–(3) import what the others use and drop `Breadcrumbs`, `formatCurrency` and `getSummaryToneClass`. Keep the `ArrowLeft` import: `AssetRelationshipMap` still uses it (`:2017`, not a `<ArrowLeft` tag, so LB1 does not count it).

(1) Imports `:31-32`. Replace:

```tsx
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button-variants"
```

with:

```tsx
import { cn, formatDate, formatDateTime } from "@/lib/utils"
import { formatCount, formatMoney } from "@/lib/display-format"
import { buttonVariants } from "@/components/ui/button-variants"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader } from "@/components/ui/data-table"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil, orNil } from "@/components/ui/nil"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
```

(2) Imports `:48-50` (the trail now goes through `PageHeader`). Replace:

```tsx
import { AssetMovementTimeline, type AssetMovementTimelineItem } from "@/components/assets/asset-movement-timeline"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { MobileActionBar } from "@/components/ui/mobile-action-bar"
```

with:

```tsx
import { AssetMovementTimeline, type AssetMovementTimelineItem } from "@/components/assets/asset-movement-timeline"
import { MobileActionBar } from "@/components/ui/mobile-action-bar"
```

(3) Imports `:64-72` (`getSummaryToneClass` had one caller, `SummaryStrip`). Replace:

```tsx
import { toRepairRecordStatus } from "@/lib/repair-record-policy"
import {
  compactMovementDetails,
  createHealthItem,
  formatMovementType,
  getActivityToneClass,
  getHealthBadgeClass,
  getMissingPhotoChecklistLabels,
  getSummaryToneClass,
```

with:

```tsx
import { getRepairRecordStatusTone, toRepairRecordStatus } from "@/lib/repair-record-policy"
import {
  compactMovementDetails,
  createHealthItem,
  formatMovementType,
  getActivityToneClass,
  getHealthBadgeClass,
  getMissingPhotoChecklistLabels,
```

(4) The purchase timeline call `:661` (the money unit for documents without a currency). Replace:

```tsx
    ...buildPurchaseTimelineItems(purchaseDocuments, legacyPurchaseDocuments, t),
```

with:

```tsx
    ...buildPurchaseTimelineItems(purchaseDocuments, legacyPurchaseDocuments, t, tCommon("baht")),
```

(5) The header `:883-979` (the root `<div className="space-y-6 pb-24 md:pb-0">` at `:882` above it and the `<AssetComponentContextBanner` below it stay; the `<AssetDetailActionMenu … />` block is the same text, two spaces deeper). Replace:

```tsx
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="mb-2">
            <Breadcrumbs
              items={[
                { label: t("title"), href: returnToHref },
                { label: asset.assetTag, code: true },
              ]}
            />
          </div>
          <h1 className="break-words text-2xl font-bold text-foreground">{asset.assetTag}</h1>
          <p className="mt-1 break-words text-sm text-muted-foreground">{asset.name}</p>
          <div data-testid="asset-identity-summary" className="mt-3 flex flex-col gap-3 text-sm sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5">
                <StatusBadge label={asset.status.nameTh} tone={getAssetStateTone(asset.status.name)} />
                <AssetStateHelpPopover {...assetStatusHelp} />
              </div>
              <div className="inline-flex items-center gap-1.5">
                <StatusBadge label={asset.condition.nameTh} tone={getAssetStateTone(asset.condition.name)} />
                <AssetStateHelpPopover {...assetConditionHelp} />
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground">
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0 text-info" aria-hidden="true" />
                <span className="truncate">{currentLocationLabel || "-"}</span>
              </span>
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <PackageCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="truncate">{lifecycle.responsibilityValue ?? currentCustodianLabel ?? "-"}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={returnToHref}
            aria-label={isAssetScanReturn ? t("backToScan") : tCommon("back")}
            className={cn(buttonVariants({ variant: "outline" }), "min-w-11 px-3")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{isAssetScanReturn ? t("backToScan") : tCommon("back")}</span>
          </Link>
          {canEditAsset ? (
            <Link
              href={editHref}
              className={cn(buttonVariants(), "hidden md:inline-flex")}
            >
              <Edit className="h-4 w-4" />
              {tCommon("edit")}
            </Link>
          ) : null}
          <AssetDetailActionMenu
            label={t("detailMoreActions")}
            cancelTransaction={
              canEditAsset && latestAssetTransaction?.transactionStatus === "active"
                ? {
                    type: latestAssetTransaction.type,
                    transactionId: latestAssetTransaction.id,
                    expectedUpdatedAt: latestAssetTransaction.updatedAt.toISOString(),
                    originalOperator: latestAssetTransaction.operator,
                    currentState: formatCancellationSnapshot(cancellationAfterSnapshot, cancellationReferenceLabels),
                    restoreState: formatCancellationSnapshot(cancellationBeforeSnapshot, cancellationReferenceLabels),
                    componentCount: cancellationBeforeSnapshot?.components.length ?? 0,
                    labels: buildCancellationLabels(tCancellation),
                  }
                : undefined
            }
            activity={{
              title: t("activityDrawerTitle"),
              triggerLabel: t("activityDrawerOpen"),
              emptyLabel: tCommon("noData"),
              items: activityDrawerItems,
            }}
            evidence={{
              items: evidenceDrawerItems,
              labels: {
                title: t("evidenceCenter"),
                triggerLabel: t("detailSections.evidence"),
                emptyLabel: t("noEvidenceHelp"),
                total: t("evidenceTotal"),
                images: t("evidenceImages"),
                documents: t("evidenceDocuments"),
                all: t("movementFilters.all"),
                openFile: t("openEvidenceFile"),
              },
            }}
            links={[
              { key: "print", href: `/${locale}/assets/${asset.id}/label`, label: t("printLabel") },
              ...(canEditAsset ? [{ key: "components" as const, href: componentsManagerHref, label: t("manageComponents") }] : []),
              ...(canCreateAsset ? [{ key: "clone" as const, href: cloneHref, label: t("cloneAsset") }] : []),
              ...(canEditAsset ? [{ key: "edit" as const, href: editHref, label: tCommon("edit"), mobileOnly: true }] : []),
            ]}
          />
        </div>
      </div>
```

with:

```tsx
      <PageHeader
        breadcrumbs={[
          { label: t("title"), href: returnToHref },
          { label: asset.assetTag, code: true },
        ]}
        title={asset.name}
        meta={
          <>
            <span className="tag">{asset.assetTag}</span>
            <span data-testid="asset-identity-summary" className="contents">
              <span className="inline-flex items-center gap-1.5">
                <StatusBadge label={asset.status.nameTh} tone={getAssetStateTone(asset.status.name)} />
                <AssetStateHelpPopover {...assetStatusHelp} />
              </span>
              <span className="inline-flex items-center gap-1.5">
                <StatusBadge label={asset.condition.nameTh} tone={getAssetStateTone(asset.condition.name)} />
                <AssetStateHelpPopover {...assetConditionHelp} />
              </span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0 text-info" aria-hidden="true" />
              <span className="truncate">{orNil(currentLocationLabel)}</span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <PackageCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate">{orNil(lifecycle.responsibilityValue ?? currentCustodianLabel)}</span>
            </span>
          </>
        }
        back={<PageBackLink href={returnToHref} label={isAssetScanReturn ? t("backToScan") : tCommon("back")} />}
        actions={
          <>
            <AssetDetailActionMenu
              label={t("detailMoreActions")}
              cancelTransaction={
                canEditAsset && latestAssetTransaction?.transactionStatus === "active"
                  ? {
                      type: latestAssetTransaction.type,
                      transactionId: latestAssetTransaction.id,
                      expectedUpdatedAt: latestAssetTransaction.updatedAt.toISOString(),
                      originalOperator: latestAssetTransaction.operator,
                      currentState: formatCancellationSnapshot(cancellationAfterSnapshot, cancellationReferenceLabels),
                      restoreState: formatCancellationSnapshot(cancellationBeforeSnapshot, cancellationReferenceLabels),
                      componentCount: cancellationBeforeSnapshot?.components.length ?? 0,
                      labels: buildCancellationLabels(tCancellation),
                    }
                  : undefined
              }
              activity={{
                title: t("activityDrawerTitle"),
                triggerLabel: t("activityDrawerOpen"),
                emptyLabel: tCommon("noData"),
                items: activityDrawerItems,
              }}
              evidence={{
                items: evidenceDrawerItems,
                labels: {
                  title: t("evidenceCenter"),
                  triggerLabel: t("detailSections.evidence"),
                  emptyLabel: t("noEvidenceHelp"),
                  total: t("evidenceTotal"),
                  images: t("evidenceImages"),
                  documents: t("evidenceDocuments"),
                  all: t("movementFilters.all"),
                  openFile: t("openEvidenceFile"),
                },
              }}
              links={[
                { key: "print", href: `/${locale}/assets/${asset.id}/label`, label: t("printLabel") },
                ...(canEditAsset ? [{ key: "components" as const, href: componentsManagerHref, label: t("manageComponents") }] : []),
                ...(canCreateAsset ? [{ key: "clone" as const, href: cloneHref, label: t("cloneAsset") }] : []),
                ...(canEditAsset ? [{ key: "edit" as const, href: editHref, label: tCommon("edit"), mobileOnly: true }] : []),
              ]}
            />
            {canEditAsset ? (
              <Link href={editHref} className={cn(buttonVariants({ size: "md" }), "hidden md:inline-flex")}>
                <Edit aria-hidden="true" />
                {tCommon("edit")}
              </Link>
            ) : null}
          </>
        }
      />
```

(6) Overview facts `:1086-1100`. Replace:

```tsx
            <SectionHeading title={t("detailSections.overview")} subtitle={t("detailSections.overviewSubtitle")} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Info label={t("category")} value={`${asset.category.code} - ${asset.category.name}`} />
              <Info label={t("brand")} value={asset.brand?.name} />
              <Info label={t("model")} value={asset.model?.name} />
              <Info label={ownershipType === "software_license" ? t("licenseKey") : t("serialNumber")} value={ownershipType === "software_license" ? maskLicenseKey(asset.serialNumber) : asset.serialNumber} />
              {ownershipType === "software_license" ? (
                <>
                  <Info label={t("licenseSeatUsage")} value={licenseSeatSummary} />
                  <Info label={t("licenseAssignedAsset")} value={licenseAssignedAsset ? `${licenseAssignedAsset.assetTag} - ${licenseAssignedAsset.name}` : null} />
                </>
              ) : null}
              <Info label={t("fixedAssetCode")} value={asset.fixedAssetCode} />
              <Info label={t("purchasePrice")} value={formatCurrency(asset.purchasePrice ? Number(asset.purchasePrice) : null)} />
            </div>
```

with:

```tsx
            <SectionHeading title={t("detailSections.overview")} subtitle={t("detailSections.overviewSubtitle")} />
            <KeyValueList
              items={[
                { key: "category", label: t("category"), value: <><span className="tag">{asset.category.code}</span> - {asset.category.name}</> },
                { key: "brand", label: t("brand"), value: asset.brand?.name },
                { key: "model", label: t("model"), value: asset.model?.name },
                {
                  key: "serialNumber",
                  label: ownershipType === "software_license" ? t("licenseKey") : t("serialNumber"),
                  value: ownershipType === "software_license" ? maskLicenseKey(asset.serialNumber) : asset.serialNumber,
                },
                ...(ownershipType === "software_license"
                  ? [
                      { key: "licenseSeatUsage", label: t("licenseSeatUsage"), value: licenseSeatSummary },
                      {
                        key: "licenseAssignedAsset",
                        label: t("licenseAssignedAsset"),
                        value: licenseAssignedAsset ? <><span className="tag">{licenseAssignedAsset.assetTag}</span> - {licenseAssignedAsset.name}</> : null,
                      },
                    ]
                  : []),
                { key: "fixedAssetCode", label: t("fixedAssetCode"), value: asset.fixedAssetCode },
                {
                  key: "purchasePrice",
                  label: t("purchasePrice"),
                  value: asset.purchasePrice == null ? null : <span className="num">{formatMoney(Number(asset.purchasePrice), { unit: tCommon("baht") })}</span>,
                },
              ]}
            />
```

(7) Specs `:1106-1113`. Replace:

```tsx
              <SectionHeading title={tBrandModel("structuredSpecs")} subtitle={t("detailSections.specsSubtitle")} />
              {modelSpecs.items.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {modelSpecs.items.map((item) => (
                    <Info key={item.id} label={item.label} value={item.value} />
                  ))}
                </div>
              ) : null}
```

with:

```tsx
              <SectionHeading title={tBrandModel("structuredSpecs")} subtitle={t("detailSections.specsSubtitle")} />
              {modelSpecs.items.length > 0 ? (
                <KeyValueList items={modelSpecs.items.map((item) => ({ key: item.id, label: item.label, value: item.value }))} />
              ) : null}
```

(8) Ownership facts `:1124-1133`. Replace:

```tsx
            <SectionHeading title={t("ownership")} subtitle={t("detailSections.ownershipSubtitle")} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Info label={t("company")} value={`${asset.company.code} - ${asset.company.nameTh}`} />
              <Info label={t("branch")} value={`${asset.branch.code} - ${asset.branch.name}`} />
              <Info label={t("ownershipType")} value={t(`ownershipType_${ownershipType}`)} />
              <Info label={t("department")} value={asset.department ? `${asset.department.code} - ${asset.department.name}` : null} />
              <Info label={t("custodian")} value={asset.custodian ? `${asset.custodian.code} - ${asset.custodian.fullNameTh}` : null} />
              <Info label={t("homeLocation")} value={asset.homeLocation ? `${asset.homeLocation.code} - ${asset.homeLocation.name}` : null} />
              <Info label={t("currentLocation")} value={`${asset.currentLocation.code} - ${asset.currentLocation.name}`} />
            </div>
```

with:

```tsx
            <SectionHeading title={t("ownership")} subtitle={t("detailSections.ownershipSubtitle")} />
            <KeyValueList
              items={[
                { key: "company", label: t("company"), value: <><span className="tag">{asset.company.code}</span> - {asset.company.nameTh}</> },
                { key: "branch", label: t("branch"), value: <><span className="tag">{asset.branch.code}</span> - {asset.branch.name}</> },
                { key: "ownershipType", label: t("ownershipType"), value: t(`ownershipType_${ownershipType}`) },
                { key: "department", label: t("department"), value: asset.department ? <><span className="tag">{asset.department.code}</span> - {asset.department.name}</> : null },
                {
                  key: "custodian",
                  label: t("custodian"),
                  value: asset.custodian ? <><span className="tag">{asset.custodian.code}</span> - {asset.custodian.fullNameTh}</> : null,
                  nilLabel: t("noCustodian"),
                },
                { key: "homeLocation", label: t("homeLocation"), value: asset.homeLocation ? <><span className="tag">{asset.homeLocation.code}</span> - {asset.homeLocation.name}</> : null },
                { key: "currentLocation", label: t("currentLocation"), value: <><span className="tag">{asset.currentLocation.code}</span> - {asset.currentLocation.name}</> },
              ]}
            />
```

(9) Purchase facts `:1230-1237`. Replace:

```tsx
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Info label={t("supplier")} value={asset.supplier ? `${asset.supplier.code} - ${asset.supplier.name}` : null} />
              <Info label={t("purchaseDate")} value={formatDate(asset.purchaseDate)} />
              <Info label={t("warrantyStart")} value={formatDate(asset.warrantyStartDate)} />
              <Info label={t("warrantyEnd")} value={formatDate(asset.warrantyEndDate)} />
              <Info label={t("poNumber")} value={asset.poNumber} />
              <Info label={t("invoiceNumber")} value={asset.invoiceNumber} />
            </div>
```

with:

```tsx
            <KeyValueList
              items={[
                { key: "supplier", label: t("supplier"), value: asset.supplier ? <><span className="tag">{asset.supplier.code}</span> - {asset.supplier.name}</> : null },
                { key: "purchaseDate", label: t("purchaseDate"), value: asset.purchaseDate ? formatDate(asset.purchaseDate) : null },
                { key: "warrantyStart", label: t("warrantyStart"), value: asset.warrantyStartDate ? formatDate(asset.warrantyStartDate) : null },
                { key: "warrantyEnd", label: t("warrantyEnd"), value: asset.warrantyEndDate ? formatDate(asset.warrantyEndDate) : null },
                { key: "poNumber", label: t("poNumber"), value: asset.poNumber },
                { key: "invoiceNumber", label: t("invoiceNumber"), value: asset.invoiceNumber },
              ]}
            />
```

(10) The return label `:1270` (a value of the two handover lists below). Replace:

```tsx
                  const returnLabel = checkout.checkin ? `${checkout.checkin.documentNo ?? checkout.checkin.id} · ${formatDate(checkout.checkin.returnDate)}` : "-"
```

with:

```tsx
                  const returnLabel = checkout.checkin ? `${checkout.checkin.documentNo ?? checkout.checkin.id} · ${formatDate(checkout.checkin.returnDate)}` : null
```

(11) The latest handover's facts `:1300-1309`. Replace:

```tsx
                          <div className="mt-2 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                            <Info label={t("documentNo")} value={checkout.documentNo ?? checkout.id} compact />
                            <Info label={t("handoverMode")} value={handoverModeLabel} compact />
                            <Info label={t("handoverTo")} value={destination} compact />
                            {checkout.handoverMode === "temporary_loan" ? (
                              <Info label={t("expectedReturnDate")} value={formatDate(checkout.expectedReturnDate)} compact />
                            ) : null}
                            <Info label={t("returnDate")} value={returnLabel} compact />
                            <Info label={t("remark")} value={checkout.remark} compact />
                          </div>
```

with:

```tsx
                          <KeyValueList
                            className="mt-2"
                            items={[
                              { key: "documentNo", label: t("documentNo"), value: <span className="tag">{checkout.documentNo ?? checkout.id}</span> },
                              { key: "handoverMode", label: t("handoverMode"), value: handoverModeLabel },
                              { key: "handoverTo", label: t("handoverTo"), value: destination },
                              ...(checkout.handoverMode === "temporary_loan"
                                ? [{ key: "expectedReturnDate", label: t("expectedReturnDate"), value: checkout.expectedReturnDate ? formatDate(checkout.expectedReturnDate) : null }]
                                : []),
                              { key: "returnDate", label: t("returnDate"), value: returnLabel },
                              { key: "remark", label: t("remark"), value: checkout.remark },
                            ]}
                          />
```

(12) An older handover's facts in its `<summary>` `:1332-1338`. Replace:

```tsx
                          <div className="mt-2 grid gap-2 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
                            <Info label={t("documentNo")} value={checkout.documentNo ?? checkout.id} compact />
                            <Info label={t("handoverMode")} value={handoverModeLabel} compact />
                            <Info label={t("handoverTo")} value={destination} compact />
                            <Info label={t("returnDate")} value={returnLabel} compact />
                            <Info label={t("remark")} value={checkout.remark} compact />
                          </div>
```

with:

```tsx
                          <KeyValueList
                            className="mt-2"
                            items={[
                              { key: "documentNo", label: t("documentNo"), value: <span className="tag">{checkout.documentNo ?? checkout.id}</span> },
                              { key: "handoverMode", label: t("handoverMode"), value: handoverModeLabel },
                              { key: "handoverTo", label: t("handoverTo"), value: destination },
                              { key: "returnDate", label: t("returnDate"), value: returnLabel },
                              { key: "remark", label: t("remark"), value: checkout.remark },
                            ]}
                          />
```

(13) The movement snapshot `:1370-1375`. Replace:

```tsx
              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                <Info label={t("currentLocation")} value={currentLocationLabel} compact />
                <Info label={t("custodian")} value={currentCustodianLabel} compact />
                <Info label={t("status")} value={asset.status?.nameTh ?? asset.status?.name} compact />
                <Info label={t("latestMovement")} value={latestMovement ? `${latestMovement.title} · ${formatDateTime(latestMovement.performedAt)}` : null} compact />
              </div>
```

with:

```tsx
              <KeyValueList
                items={[
                  { key: "currentLocation", label: t("currentLocation"), value: currentLocationLabel },
                  { key: "custodian", label: t("custodian"), value: currentCustodianLabel, nilLabel: t("noCustodian") },
                  { key: "status", label: t("status"), value: asset.status?.nameTh ?? asset.status?.name },
                  { key: "latestMovement", label: t("latestMovement"), value: latestMovement ? `${latestMovement.title} · ${formatDateTime(latestMovement.performedAt)}` : null },
                ]}
              />
```

(14) Notes `:1408`. Replace:

```tsx
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{asset.remark || "-"}</p>
```

with:

```tsx
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{orNil(asset.remark)}</p>
```

(15) The repair tab: tiles and table `:1414-1481`. Replace:

```tsx
            <SectionHeading title={tMaintenance("maintenanceHistory")} subtitle={t("detailSections.maintenanceSubtitle")} icon={<History className="h-5 w-5 text-primary" />} />
            <SummaryStrip
              items={[
                { label: t("openMaintenance"), value: String(openMaintenanceCount), tone: openMaintenanceCount > 0 ? "warning" : "success" },
                { label: t("latestMaintenance"), value: maintenanceSummary },
                { label: t("totalMaintenance"), value: String(asset.maintenanceTickets.length) },
                { label: t("maintenanceTotalCost"), value: formatCurrency(totalMaintenanceCost) },
              ]}
            />
            {maintenanceReplacementWarning ? (
              <div className="mb-4 rounded-md border border-warning-border bg-warning-soft px-4 py-3 text-sm text-warning">
                {t("maintenanceReplacementWarning")}
              </div>
            ) : null}
            {asset.maintenanceTickets.length === 0 ? (
              <ActionEmptyState
                icon={<Wrench className="h-6 w-6" />}
                title={t("noMaintenanceTitle")}
                description={t("noMaintenanceHelp")}
                actionHref={maintenanceHref}
                actionLabel={t("quickMaintenance")}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{tMaintenance("repairNo")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{tMaintenance("problem")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{tMaintenance("reportedBy")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{tCommon("status")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{tMaintenance("reportedDate")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {asset.maintenanceTickets.map((ticket) => (
                      <ClickableTableRow
                        key={ticket.id}
                        href={`/${locale}/maintenance/${ticket.id}`}
                        label={`${tCommon("view")}: ${ticket.repairNo}`}
                      >
                        <td className="whitespace-nowrap px-4 py-3">
                          <Link href={`/${locale}/maintenance/${ticket.id}`} className="font-medium text-primary hover:underline">
                            {ticket.repairNo}
                          </Link>
                        </td>
                        <td className="min-w-72 px-4 py-3 text-muted-foreground">
                          <div className="flex flex-wrap items-center gap-2">
                            {Boolean(ticket.maintenancePlanId) ? (
                              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
                                {t("maintenancePmBadge")}
                              </span>
                            ) : null}
                            <span>{ticket.problem}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {ticket.reportedBy.code} - {ticket.reportedBy.fullNameTh}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {tMaintenance(`statuses.${toRepairRecordStatus(ticket.repairStatus)}`)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(ticket.reportedDate)}</td>
                      </ClickableTableRow>
                    ))}
                  </tbody>
                </table>
              </div>
```

with:

```tsx
            <SectionHeading title={tMaintenance("maintenanceHistory")} subtitle={t("detailSections.maintenanceSubtitle")} icon={<History className="h-5 w-5 text-primary" />} />
            <StatStrip
              className="mb-4"
              items={[
                {
                  key: "open",
                  label: t("openMaintenance"),
                  value: formatCount(openMaintenanceCount),
                  ...(openMaintenanceCount > 0 ? { foot: maintenanceSummary, attention: true } : {}),
                },
                {
                  key: "total",
                  label: t("totalMaintenance"),
                  value: formatCount(asset.maintenanceTickets.length),
                  foot: latestMaintenanceTicket ? t("latestMaintenanceSummary", { repairNo: latestMaintenanceTicket.repairNo }) : undefined,
                },
                { key: "cost", label: t("maintenanceTotalCost"), value: formatMoney(totalMaintenanceCost), unit: tCommon("baht") },
              ]}
            />
            {maintenanceReplacementWarning ? (
              <div className="mb-4 rounded-md border border-warning-border bg-warning-soft px-4 py-3 text-sm text-warning">
                {t("maintenanceReplacementWarning")}
              </div>
            ) : null}
            {asset.maintenanceTickets.length === 0 ? (
              <ActionEmptyState
                icon={<Wrench className="h-6 w-6" />}
                title={t("noMaintenanceTitle")}
                description={t("noMaintenanceHelp")}
                actionHref={maintenanceHref}
                actionLabel={t("quickMaintenance")}
              />
            ) : (
              <DataTable framed={false} caption={tMaintenance("maintenanceHistory")} scrollHint={tCommon("tableScrollHint")}>
                <DataTableHeader>
                  <tr>
                    <DataTableHead>{tMaintenance("repairNo")}</DataTableHead>
                    <DataTableHead>{tMaintenance("problem")}</DataTableHead>
                    <DataTableHead>{tMaintenance("reportedBy")}</DataTableHead>
                    <DataTableHead>{tCommon("status")}</DataTableHead>
                    <DataTableHead>{tMaintenance("reportedDate")}</DataTableHead>
                  </tr>
                </DataTableHeader>
                <DataTableBody>
                  {asset.maintenanceTickets.map((ticket) => (
                    <ClickableTableRow
                      key={ticket.id}
                      href={`/${locale}/maintenance/${ticket.id}`}
                      label={`${tCommon("view")}: ${ticket.repairNo}`}
                    >
                      <DataTableCell className="whitespace-nowrap">
                        <Link href={`/${locale}/maintenance/${ticket.id}`} className="font-medium text-primary hover:underline">
                          <span className="tag">{ticket.repairNo}</span>
                        </Link>
                      </DataTableCell>
                      <DataTableCell className="min-w-72 text-muted-foreground">
                        <div className="flex flex-wrap items-center gap-2">
                          {Boolean(ticket.maintenancePlanId) ? (
                            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
                              {t("maintenancePmBadge")}
                            </span>
                          ) : null}
                          <span>{ticket.problem}</span>
                        </div>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-muted-foreground">
                        <span className="tag">{ticket.reportedBy.code}</span> - {ticket.reportedBy.fullNameTh}
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <StatusBadge label={tMaintenance(`statuses.${toRepairRecordStatus(ticket.repairStatus)}`)} tone={getRepairRecordStatusTone(ticket.repairStatus)} />
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(ticket.reportedDate)}</DataTableCell>
                    </ClickableTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
```

(16) The audit tab: tiles and table `:1489-1535`. Replace:

```tsx
            <SummaryStrip
              items={[
                { label: t("latestAudit"), value: auditSummary },
                { label: t("scanCount"), value: latestAuditItem ? String(latestAuditItem.scanCount) : "0" },
                { label: t("auditFindingRequired"), value: latestAuditItem?.findingRequired ? tCommon("yes") : tCommon("no"), tone: latestAuditItem?.findingRequired ? "warning" : "success" },
              ]}
            />
            {asset.auditItems.length === 0 ? (
              <ActionEmptyState
                icon={<ScanLine className="h-6 w-6" />}
                title={t("noAuditTitle")}
                description={t("noAuditHelp")}
                actionHref={`/${locale}/audit/rounds`}
                actionLabel={t("quickAudit")}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("auditRound")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("status")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("result")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("lastAuditDate")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{t("scanCount")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {asset.auditItems.map((item) => (
                      <ClickableTableRow
                        key={item.id}
                        href={`/${locale}/audit/rounds/${item.auditRound.id}`}
                        label={`${tCommon("view")}: ${item.auditRound.auditNo}`}
                      >
                        <td className="min-w-64 px-4 py-3">
                          <div className="font-medium text-foreground">{item.auditRound.auditNo}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{item.auditRound.name}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatAuditState(item.auditStatus)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{item.auditResult ? formatAuditState(item.auditStatus, item.auditResult) : "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(item.lastScanAt ?? item.scannedAt)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{item.scanCount}</td>
                      </ClickableTableRow>
                    ))}
                  </tbody>
                </table>
              </div>
```

with:

```tsx
            <StatStrip
              className="mb-4"
              items={[
                { key: "scanCount", label: t("scanCount"), value: formatCount(latestAuditItem?.scanCount ?? 0), foot: auditSummary, footTitle: auditSummary },
                {
                  key: "findingRequired",
                  label: t("auditFindingRequired"),
                  value: latestAuditItem?.findingRequired ? tCommon("yes") : tCommon("no"),
                  ...(latestAuditItem?.findingRequired ? { foot: t("activityAuditFinding"), attention: true } : {}),
                },
              ]}
            />
            {asset.auditItems.length === 0 ? (
              <ActionEmptyState
                icon={<ScanLine className="h-6 w-6" />}
                title={t("noAuditTitle")}
                description={t("noAuditHelp")}
                actionHref={`/${locale}/audit/rounds`}
                actionLabel={t("quickAudit")}
              />
            ) : (
              <DataTable framed={false} caption={t("auditHistory")} scrollHint={tCommon("tableScrollHint")}>
                <DataTableHeader>
                  <tr>
                    <DataTableHead>{t("auditRound")}</DataTableHead>
                    <DataTableHead>{t("status")}</DataTableHead>
                    <DataTableHead>{t("result")}</DataTableHead>
                    <DataTableHead>{t("lastAuditDate")}</DataTableHead>
                    <DataTableHead align="right">{t("scanCount")}</DataTableHead>
                  </tr>
                </DataTableHeader>
                <DataTableBody>
                  {asset.auditItems.map((item) => (
                    <ClickableTableRow
                      key={item.id}
                      href={`/${locale}/audit/rounds/${item.auditRound.id}`}
                      label={`${tCommon("view")}: ${item.auditRound.auditNo}`}
                    >
                      <DataTableCell className="min-w-64">
                        <div className="font-medium text-foreground"><span className="tag font-medium">{item.auditRound.auditNo}</span></div>
                        <div className="mt-1 text-xs text-muted-foreground">{item.auditRound.name}</div>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatAuditState(item.auditStatus)}</DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-muted-foreground">{item.auditResult ? formatAuditState(item.auditStatus, item.auditResult) : <Nil />}</DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(item.lastScanAt ?? item.scannedAt)}</DataTableCell>
                      <DataTableCell numeric className="text-muted-foreground">{formatCount(item.scanCount)}</DataTableCell>
                    </ClickableTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
```

(17) The follow-up link value `:1772`. Replace:

```tsx
          <div className="mt-1 line-clamp-2 text-sm font-semibold text-foreground">{item.value || "-"}</div>
```

with:

```tsx
          <div className="mt-1 line-clamp-2 text-sm font-semibold text-foreground">{orNil(item.value)}</div>
```

(18) The disabled quick action `:1795-1802` (LT5). Replace:

```tsx
  if (disabled) {
    return (
      <span className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-center text-sm font-medium leading-tight text-muted-foreground opacity-70 md:h-10 md:min-h-0">
        {icon}
        {label}
      </span>
    )
  }
```

with:

```tsx
  if (disabled) {
    return (
      <span className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-center text-sm font-medium leading-tight text-faint-foreground md:h-10 md:min-h-0">
        {icon}
        {label}
      </span>
    )
  }
```

(19) `SummaryStrip` `:1812-1828` has no caller left. Delete these lines (the blank line after the function goes with it):

```tsx
function SummaryStrip({
  items,
}: {
  items: { label: string; value: string; tone?: "success" | "warning" | "danger" | "neutral" }[]
}) {
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className={`rounded-md border px-3 py-2 ${getSummaryToneClass(item.tone ?? "neutral")}`}>
          <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{item.label}</div>
          <div className="mt-1 text-sm font-semibold text-foreground">{item.value || "-"}</div>
        </div>
      ))}
    </div>
  )
}

```

(20) The relationship card's labels `:2093` (`{relationshipAsset.assetTag}` and `{relationshipAsset.name}` below stay as they are). Replace:

```tsx
  const relationshipAsset = link ? splitRelationshipLabel(link.label) : { assetTag: assetTag ?? "-", name: assetName ?? "-" }
```

with:

```tsx
  const relationshipLabel = link ? splitRelationshipLabel(link.label) : { assetTag: assetTag ?? null, name: assetName ?? null }
  const relationshipAsset = { assetTag: relationshipLabel.assetTag ?? <Nil />, name: relationshipLabel.name ?? <Nil /> }
```

(21) `splitRelationshipLabel` `:2201`. Replace:

```tsx
  if (separatorIndex === -1) return { assetTag: label, name: "-" }
```

with:

```tsx
  if (separatorIndex === -1) return { assetTag: label, name: null }
```

(22) `Info` `:2436-2454` has no caller left. Delete these lines (with the blank line after the function):

```tsx
function Info({
  label,
  value,
  compact,
}: {
  label: string
  value?: string | number | null
  compact?: boolean
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{label}</div>
      <div className={compact ? "mt-0.5 text-sm text-foreground" : "mt-1 text-sm font-medium text-foreground"}>
        {value || "-"}
      </div>
    </div>
  )
}

```

(23) `buildPurchaseTimelineItems` parameters `:2527-2528`. Replace:

```tsx
  legacyAttachments: { id: string; originalName: string; uploadedAt: Date }[],
  t: (key: string, values?: Record<string, string | number | Date>) => string
```

with:

```tsx
  legacyAttachments: { id: string; originalName: string; uploadedAt: Date }[],
  t: (key: string, values?: Record<string, string | number | Date>) => string,
  bahtLabel: string,
```

(24) The purchase-document money `:2546`. Replace:

```tsx
      { label: t("purchasePrice"), value: document.totalAmount == null ? null : `${formatCurrency(document.totalAmount)} ${document.currency ?? ""}`.trim() },
```

with:

```tsx
      { label: t("purchasePrice"), value: document.totalAmount == null ? null : formatMoney(document.totalAmount, { unit: document.currency ?? bahtLabel }) },
```

Check: `grep -nE '(\|\||\?\?|:)\s*"-"' "src/app/[locale]/(dashboard)/assets/[id]/page.tsx"` prints exactly the four kept lines `1205:`, `1207:` (the two relationship-summary arguments) and `2455:` (the history sentence, two hits on one line); `grep -n 'className="space-y-6 pb-24 md:pb-0"' …` prints `886:` (the O11 line, untouched).

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/asset-detail-ux.test.ts tests/asset-return-navigation.test.ts tests/asset-transaction-cancellation-ui.test.ts tests/dropdown-menus-ui.test.ts tests/asset-scan-return-navigation.test.ts tests/asset-status-help-ui.test.ts tests/open-repair-filter.test.ts tests/performance-route-instrumentation.test.ts tests/asset-operation-status-policy.test.ts tests/asset-relationship-map-ui.test.ts tests/asset-detail-anchor-layout.test.ts tests/asset-detail-data-boundaries.test.ts tests/asset-handover-presentation.test.ts tests/asset-photo-gallery.test.ts tests/audit-item-status-labels.test.ts tests/visual-consistency-ui.test.ts tests/breadcrumbs-ui.test.ts tests/list-primitives-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `tests 170 · pass 170 · fail 0` (asset-detail-ux 15 · asset-return-navigation 6 · asset-transaction-cancellation-ui 4 · dropdown-menus-ui 6 · asset-scan-return-navigation 3 · asset-status-help-ui 4 · open-repair-filter 3 · performance-route-instrumentation 1 · asset-operation-status-policy 10 · asset-relationship-map-ui 4 · asset-detail-anchor-layout 1 · asset-detail-data-boundaries 3 · asset-handover-presentation 3 · asset-photo-gallery 3 · audit-item-status-labels 8 · visual-consistency-ui 3 · breadcrumbs-ui 4 · list-primitives-ui 19 · list-frame-guards 21 · visual-foundation-guards 26 · form-migration-guards 23).

Run: `node <temp>/p2b1-precheck.mjs --file "D/assets/[id]/page.tsx"`
Expected (exit 0):
```
file    src/app/[locale]/(dashboard)/assets/[id]/page.tsx (CRLF) · in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
R7         0       0     0     2
LH1        0       0     0     1
LB1        0       0     0     1
LP1        1       1     1     1
LT1        0       0     0    10
LT5        0       0     0     1
LV2        4       4     4    15
LV3        0       0     0     3
LS1        0       0     0     1
LK1        0       0     0     1
args    LP1=1:1 LV2=4:4
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b4-tw-probe.mjs "src/app/[locale]/(dashboard)/assets/[id]/page.tsx"`
Expected: `checked 175 classes, missing 0` (exit 0). No class is new to `src`.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `tests 1952 · pass 1951 · fail 0 · skipped 1` (one test more than the baseline of 1951).
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors and the 146 warnings under `.agents/`; `npx eslint "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" tests/asset-detail-ux.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 4 files: the page 279 insertions and 285 deletions, `tests/asset-detail-ux.test.ts` 29 and 5, `tests/list-frame-guards.test.ts` 2 and 9 (the `MIGRATED_LIST_FILES` line in; the LV2 number changed; the LH1, LB1, LT1, LT5, LV3, LS1 and LK1 rows and the empty `// 2B-4` line of LT5 out), `tests/visual-foundation-guards.test.ts` 1 deletion. `node -e "const s=require('fs').readFileSync(process.argv[1],'utf8');console.log((s.match(/\r\n/g)||[]).length,(s.match(/\n/g)||[]).length)" "src/app/[locale]/(dashboard)/assets/[id]/page.tsx"` prints `2777 2777`, and the same for the test prints `179 179` (CRLF throughout). A file that shows every line changed was normalized: restore its line endings before you commit.

- [ ] **Step 8: Commit**

```bash
git add "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" tests/asset-detail-ux.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): asset detail on PageHeader with the asset name, KeyValueList facts, StatStrip tiles and DataTable history (2B-4 task 1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 11, spec §8.8 row `/th/assets/<id>`):** at 1440, 1024, 768 and 375 with the asset of Task 0 Step 7, against the before images:
- the trail, then the asset name as the h1 (600), then the code, both badges with their help popovers (open one with the mouse and one with a tap), the location and the custodian on the meta row; at 375 the row wraps and nothing scrolls sideways
- open the asset from page 2 of the register: "กลับ" lands on page 2 with the same page size; from the scanner the button reads "กลับไปสแกน" and returns to the scanner
- the header order is กลับ → ⋯ → แก้ไข from md; below md "แก้ไข" is in ⋯; Tab order is the same
- every tab: the facts are 120px label rows (stacked at 375), "—" for an empty value, money with "บาท"; the repair and audit tabs show one strip (2 + 1 below 1024), a warning foot when a repair is open, then the table with the white header, the status badges and the scroll hint only when it overflows; rows still open the repair and the round
- ⋯ → ยกเลิกรายการ opens the cancel preview (close it), the evidence and activity drawers open and close (2C plan 4's parts, unchanged)
- at 375 the bottom action bar is unchanged and covers no content; at 768–1023 the bar and the md header live together
- NVDA: the h1 reads the asset name; "กลับ" reads its words; an empty value reads "ไม่มีข้อมูล" (the custodian "ไม่มีผู้ถือครอง"); each table reads its caption

---
### Task 2: `c/assets/asset-detail-tabs.tsx` · the client wrapper keeps the scrolling and renders the shared `TabNav` (I9)

Spec §8.8 row 2, §10.2 I9, §5.1 row "แถวแท็บ" (→ `TabNav`, B3(5)), §9.4.1 row `c/assets/asset-detail-tabs.tsx` (LN1 1), §10.4 table A row 2B-4 (`asset-detail-tabs.test.ts:18` "ถ้าจำเป็น"), §10.4 table C (LN1 5 → 4 over the plan) and controller rulings (a), (b) and (f). One file, one commit. The component and its test are CRLF: exact-string replacements only.

Rulings this task applies:
- **I9:** the file stays the `"use client"` wrapper that owns the scrolling and renders `TabNav`, passing `ref`, `onScroll`, `style={{ scrollSnapType: "x mandatory" }}` and `linkClassName="snap-start"` (Tailwind `scroll-snap-align: start`, replacing the per-link `style`). `TabNav` sets `aria-current="page"` and the underline look, so the hand-written links, their pill classes and the `aria-current` go. LN1 1 → 0.
- **I9, table A `asset-detail-tabs.test.ts:18`:** a single `Link` ref can no longer reach the current tab, so the wrapper keeps a ref on the `<nav>` and scrolls `navRef.current?.querySelector('[aria-current="page"]')` into view on each view change (the same `{ block: "nearest", inline: "center" }`). `:18` changes in this commit, as I9 says; `:16-17`, `:19-20` pass unchanged.
- **§8.8 row 2 ("ตัวนับ `bg-white/20`"):** the custody count goes through `TabNavItem.count` as `formatCount(indicator.count)` (the primitive draws it `text-meta num`, primary on the current tab), so the translucent chip (`bg-white/20` / `bg-muted`) is gone. A count of 0 still shows nothing (`indicator?.count ?` as before; `tests/asset-detail-ux.test.ts:110` reads `indicator\?\.count`).
- **`TabNavItem.icon`:** the missing-serial warning (`AlertTriangle` with the sr-only `warningLabel`, `tests/asset-detail-ux.test.ts:109`, `:111`) is the item's `icon`, the slot `ui/tab-nav.tsx:12` names for it; it renders before the label and is `text-warning` on every tab (the current tab has no fill any more).
- **Kept:** the overflow cue and its classes (`border-r border-border bg-canvas/95 `, VFG:114), `hasRemainingHorizontalContent`, `scrollbar-none` and the full-bleed `-mx-4 px-4 pe-12 sm:mx-0 sm:px-0` on the row (`TabNav` adds its own `overflow-x-auto overscroll-x-contain`, so that class leaves this list).
- **Ruling (f):** 2B does not touch this file again, so it joins `MIGRATED_LIST_FILES` (every counter 0).
- **Tests:** table A `:18` and one appended test. The file reads the source raw (CRLF), so the new regexes hold no `\n`.

What users will see on `/th/assets/<id>`: the four view tabs become the underline row of the other pages (the current one in ink at weight 600 with a 2px primary line, the others muted) instead of filled pill buttons; the custody count is a small number after its label, and the missing-serial warning icon sits before the label. On phones the row still scrolls sideways with snapping, brings the current tab into view and shows the chevron cue until its end; targets stay 44px.

Not in this task: the page that renders it (Task 1) · `c/reports/report-view-tabs.tsx` (2B-5) · docs (Task 12). Do not run a formatter.

**Files:**
- Modify: `src/components/assets/asset-detail-tabs.tsx` (`i/lf w/crlf`; 2 exact replacements)
- Modify: `tests/asset-detail-tabs.test.ts` (`i/lf w/crlf`; 1 exact replacement, 1 appended block)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only: `t02-tabs-block.ts`

**Must keep passing without edits:**
- `tests/asset-detail-tabs.test.ts:7-11` (`hasRemainingHorizontalContent`) and `:16-17`, `:19-20` · `tests/asset-detail-ux.test.ts:102-112` (`AlertTriangle`, `indicator\?\.count`, `warningLabel` in this file) · `tests/visual-foundation-guards.test.ts:114` (`border-r border-border bg-canvas\/95 `)
- `tests/list-primitives-ui.test.ts` (the `TabNav` strings) · `tests/form-migration-guards.test.ts`

**Interfaces:**
- Consumes:
  - 2B-1: `TabNav({ "aria-label", items: readonly TabNavItem[], current, scroll?, onSelect?, linkClassName?, className?, ...navProps })` from `@/components/ui/tab-nav`, with `TabNavItem = { key, label, href, count?: string, icon? }`; `...navProps` reaches `<nav>` (`ref`, `style`, `onScroll`).
  - 2A: `formatCount(value: number): string` from `@/lib/display-format`.
  - Task 1's `<temp>/p2b4-t1-precheck.mjs`, `<temp>/p2b4-append.mjs`, `<temp>/p2b4-tw-probe.mjs`; Task 0's guard scripts.
- Produces: `AssetDetailTabs` with the same props (the page call of Task 1 does not change); the file in `MIGRATED_LIST_FILES`; LFG `BUDGETS.LN1` without its row; the test `asset detail tabs wrap the shared TabNav and keep their own scrolling (spec 2B I9)`.

| guard | `c/assets/asset-detail-tabs.tsx` before → after | plan total (budget) before → after |
|---|---|---|
| LFG LN1 | 1 → – | 5 in 4 rows → 4 in 3 |
| `MIGRATED_LIST_FILES` | – → joins | 65 → 66 |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b4-t1-precheck.mjs 2`
Expected: `git status` prints nothing. The script prints (exit 0):
```
ok      2B-1: PageHeader with title, meta, actions, back and breadcrumbs; PageBackLink with href and label
ok      2B-1: KeyValueList with items, key and nilLabel
ok      2B-1: TabNav passes ...navProps to <nav> and takes linkClassName, count and icon
ok      2B-1: StatStrip items with unit, foot, footTitle and attention
ok      2B-1: DataTable framed, caption and scrollHint; DataTableHead align; DataTableCell numeric
ok      2B-1: ClickableTableRow takes href and label
ok      2A: Nil, orNil, formatCount, formatMoney, buttonVariants size md
ok      getRepairRecordStatusTone is exported by src/lib/repair-record-policy.ts
ok      the keys these tasks read exist in th and en
ok      Task 1 is in
ok      Task 2 has not run yet
ok      src/components/assets/asset-detail-tabs.tsx is unchanged since c2bfbe2 (hash 42db5daf40eba2c2)
ok      tests/asset-detail-tabs.test.ts is unchanged since c2bfbe2 (hash cf35582178bd280c)
info    src/components/assets/asset-detail-tabs.tsx: CRLF
info    tests/asset-detail-tabs.test.ts: CRLF
preconditions hold for Task 2
```

Run: `node <temp>/p2b1-precheck.mjs --file c/assets/asset-detail-tabs.tsx`
Expected (after the header lines; exit 0):
```
file    src/components/assets/asset-detail-tabs.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LN1        1       1     0     1
args    LN1=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol src/components/assets/asset-detail-tabs.tsx tests/asset-detail-tabs.test.ts`
Expected: `i/lf w/crlf` for both.

- [ ] **Step 2: Write the failing tests (`tests/asset-detail-tabs.test.ts`, CRLF, read raw)**

(a) Table A `:18`. Replace:

```ts
  assert.match(source, /activeTabRef\.current\?\.scrollIntoView/)
```

with:

```ts
  assert.match(source, /navRef\.current\?\.querySelector\('\[aria-current="page"\]'\)\?\.scrollIntoView/)
```

(b) Save this block as `<temp>/t02-tabs-block.ts`:

```ts
// Plan 2B-4 Task 2 (spec 2B I9, §8.8 row 2, B3(5)): the detail tabs are the shared TabNav (underline at every width,
// 44px on phones, aria-current set by the primitive). This client wrapper keeps the scrolling: the nav ref, onScroll,
// the snap style, snap-start on every link and the phone overflow cue. The count has no translucent chip any more.
// This file reads the source raw (CRLF): no line breaks in these regexes.
test("asset detail tabs wrap the shared TabNav and keep their own scrolling (spec 2B I9)", () => {
  const source = readFileSync("src/components/assets/asset-detail-tabs.tsx", "utf8")

  assert.match(source, /import \{ TabNav \} from "@\/components\/ui\/tab-nav"/)
  assert.match(source, /<TabNav\s+ref=\{navRef\}\s+aria-label=\{label\}\s+current=\{view\}\s+onScroll=\{handleScroll\}\s+style=\{\{ scrollSnapType: "x mandatory" \}\}\s+linkClassName="snap-start"/)
  assert.match(source, /count: indicator\?\.count \? formatCount\(indicator\.count\) : undefined/)
  assert.doesNotMatch(source, /aria-current=\{|<Link\b|bg-white\/|text-white|scrollSnapAlign/)
})
```

Run: `node <temp>/p2b4-append.mjs <temp>/t02-tabs-block.ts tests/asset-detail-tabs.test.ts`
Expected: `appended <temp>/t02-tabs-block.ts to tests/asset-detail-tabs.test.ts (CRLF)`

Run: `node --test tests/asset-detail-tabs.test.ts`
Expected: FAIL, `tests 3 · pass 1 · fail 2`:
- `asset detail tabs snap, center the active tab, and expose a mobile overflow cue`: the input did not match the regular expression `/navRef\.current\?\.querySelector\('\[aria-current="page"\]'\)\?\.scrollIntoView/`
- `asset detail tabs wrap the shared TabNav and keep their own scrolling (spec 2B I9)`: the input did not match the regular expression `/import \{ TabNav \} from "@\/components\/ui\/tab-nav"/`

- [ ] **Step 3: Lower the guard row of the file (the failing guards)**

Run: `node <temp>/p2b-budget.mjs c/assets/asset-detail-tabs.tsx LN1=1:0 --migrated`
Expected (exit 0):
```
LN1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/components/assets/asset-detail-tabs.tsx
```

Run: `node --test tests/list-frame-guards.test.ts`
Expected: FAIL, `tests 21 · pass 19 · fail 2`:
- `LN1 aria-current="page" is set by TabNav, StatStrip, Pagination and the menus, not by hand`: `LN1: 5 in 4 files. …` with the one line `src/components/assets/asset-detail-tabs.tsx: 1 > 0`
- `L0 …`: the one line `LN1 src/components/assets/asset-detail-tabs.tsx: 1 > 0`

- [ ] **Step 4: Render `TabNav` from the wrapper (`src/components/assets/asset-detail-tabs.tsx`, CRLF)**

Two exact replacements.

(1) Imports, the indicator type and the comment over the component (`:1-18`). Replace:

```tsx
"use client"

import Link from "next/link"
import { useEffect, useRef, useState, type UIEvent } from "react"
import { AlertTriangle, ChevronRight } from "lucide-react"
import {
  assetDetailViews,
  buildAssetDetailViewHref,
  type AssetDetailView,
} from "@/lib/asset-detail-view"
import { hasRemainingHorizontalContent } from "@/lib/horizontal-scroll"

type AssetDetailTabIndicator = {
  count?: number
  hasWarning?: boolean
}

export function AssetDetailTabs({
```

with:

```tsx
"use client"

import { useEffect, useRef, useState, type UIEvent } from "react"
import { AlertTriangle, ChevronRight } from "lucide-react"
import { TabNav } from "@/components/ui/tab-nav"
import {
  assetDetailViews,
  buildAssetDetailViewHref,
  type AssetDetailView,
} from "@/lib/asset-detail-view"
import { formatCount } from "@/lib/display-format"
import { hasRemainingHorizontalContent } from "@/lib/horizontal-scroll"

type AssetDetailTabIndicator = {
  count?: number
  hasWarning?: boolean
}

// The client wrapper that owns the scrolling of the shared TabNav (spec 2B I9): it snaps the row, centres the
// current tab when the view changes and shows the phone overflow cue until the user reaches the end.
export function AssetDetailTabs({
```

(2) The body (`:37-101`, from `const activeTabRef` to the end of the file). Replace:

```tsx
  const activeTabRef = useRef<HTMLAnchorElement>(null)
  const [showOverflowCue, setShowOverflowCue] = useState(true)

  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ block: "nearest", inline: "center" })
  }, [view])

  function handleScroll(event: UIEvent<HTMLElement>) {
    const container = event.currentTarget
    setShowOverflowCue(hasRemainingHorizontalContent(container))
  }

  return (
    <div className="relative">
    <nav
      aria-label={label}
      onScroll={handleScroll}
      style={{ scrollSnapType: "x mandatory" }}
      className="scrollbar-none -mx-4 overflow-x-auto px-4 pe-12 sm:mx-0 sm:px-0"
    >
      <div className="flex min-w-max gap-2">
        {assetDetailViews.map((item) => {
          const indicator = indicators?.[item]

          return (
            <Link
              key={item}
              ref={view === item ? activeTabRef : undefined}
              href={buildAssetDetailViewHref(locale, assetId, item, returnTo)}
              aria-current={view === item ? "page" : undefined}
              style={{ scrollSnapAlign: "start" }}
              className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors sm:h-9 sm:min-h-0 ${
                view === item
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-surface text-muted-foreground hover:border-primary-border hover:bg-accent hover:text-foreground"
              }`}
            >
              <span>{labels[item]}</span>
              {indicator?.count ? (
                <span className={`rounded-full px-1.5 py-0.5 text-xs tabular-nums ${view === item ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                  {indicator.count}
                </span>
              ) : null}
              {indicator?.hasWarning ? (
                <span className={`inline-flex ${view === item ? "text-white" : "text-warning"}`}>
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">{warningLabel}</span>
                </span>
              ) : null}
            </Link>
          )
        })}
      </div>
    </nav>
    {showOverflowCue ? (
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 flex w-9 items-center justify-end border-r border-border bg-canvas/95 pr-1 text-muted-foreground sm:hidden"
      >
        <ChevronRight className="h-5 w-5" />
      </span>
    ) : null}
    </div>
  )
}
```

with:

```tsx
  const navRef = useRef<HTMLElement>(null)
  const [showOverflowCue, setShowOverflowCue] = useState(true)

  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" })
  }, [view])

  function handleScroll(event: UIEvent<HTMLElement>) {
    const container = event.currentTarget
    setShowOverflowCue(hasRemainingHorizontalContent(container))
  }

  return (
    <div className="relative">
      <TabNav
        ref={navRef}
        aria-label={label}
        current={view}
        onScroll={handleScroll}
        style={{ scrollSnapType: "x mandatory" }}
        linkClassName="snap-start"
        className="scrollbar-none -mx-4 px-4 pe-12 sm:mx-0 sm:px-0"
        items={assetDetailViews.map((item) => {
          const indicator = indicators?.[item]

          return {
            key: item,
            label: labels[item],
            href: buildAssetDetailViewHref(locale, assetId, item, returnTo),
            count: indicator?.count ? formatCount(indicator.count) : undefined,
            icon: indicator?.hasWarning ? (
              <span className="inline-flex text-warning">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">{warningLabel}</span>
              </span>
            ) : undefined,
          }
        })}
      />
      {showOverflowCue ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 flex w-9 items-center justify-end border-r border-border bg-canvas/95 pr-1 text-muted-foreground sm:hidden"
        >
          <ChevronRight className="h-5 w-5" />
        </span>
      ) : null}
    </div>
  )
}
```

Check: `grep -nE 'aria-current=\{|<Link\b|bg-white/|scrollSnapAlign|activeTabRef' src/components/assets/asset-detail-tabs.tsx` prints nothing (exit 1).

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/asset-detail-tabs.test.ts tests/asset-detail-ux.test.ts tests/list-primitives-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `tests 107 · pass 107 · fail 0` (asset-detail-tabs 3 · asset-detail-ux 15 · list-primitives-ui 19 · list-frame-guards 21 · visual-foundation-guards 26 · form-migration-guards 23).

Run: `node <temp>/p2b1-precheck.mjs --file c/assets/asset-detail-tabs.tsx`
Expected (exit 0):
```
file    src/components/assets/asset-detail-tabs.tsx (CRLF) · in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LN1        0       0     0     1
args    (no row holds this file)
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

- [ ] **Step 6: Prove every class compiles**

Run: `SHOW=snap-start node <temp>/p2b4-tw-probe.mjs src/components/assets/asset-detail-tabs.tsx`
Expected (exit 0):
```
checked 29 classes, missing 0
snap-start -> .snap-start { scroll-snap-align: start; }
```
`snap-start` is new to this file (`report-view-tabs.tsx:47` already uses it); the probe reads it through the `ClassName=` lead (Task 1's change).

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `tests 1953 · pass 1952 · fail 0 · skipped 1` (one test more than after Task 1).
- `npx tsc --noEmit`: no errors (`useRef<HTMLElement>(null)` fits the `ref` that `TabNav` passes to `<nav>`; `onScroll` keeps its `UIEvent<HTMLElement>` handler).
- `npm run lint`: 0 errors, no new warning; `npx eslint src/components/assets/asset-detail-tabs.tsx tests/asset-detail-tabs.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 3 files: the component 36 insertions and 48 deletions, `tests/asset-detail-tabs.test.ts` 14 and 1, `tests/list-frame-guards.test.ts` 1 and 2 (the `MIGRATED_LIST_FILES` line in; the LN1 row and its `// 2B-4` line out). CRLF counts: the component `89 89`, the test `34 34`.

- [ ] **Step 8: Commit**

```bash
git add src/components/assets/asset-detail-tabs.tsx tests/asset-detail-tabs.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): asset detail tabs render the shared TabNav from their scrolling client wrapper (2B-4 task 2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 11, spec §8.8 row `/th/assets/<id>` "TabNav ตัวนับไม่ใช้พื้นโปร่ง"):** at 1440 and 375, on an asset with components (and one with a component missing its serial): the four tabs are an underline row; the current tab has the 2px line and is announced as the current page; the custody count is a plain small number (primary on the current tab), no chip; the warning icon shows before "การถือครอง / ส่วนควบ" and NVDA reads the warning words. At 375 open `?view=audit` directly: the row scrolls so the current tab is in view; the chevron cue shows until the row's end and hides there; swiping snaps tab by tab; every tab is 44px tall. Forced colors: the current tab keeps its bottom border.

---
### Task 3: `D/maintenance/[id]/page.tsx` · the asset name as the h1 on `PageHeader`, back points left in the header and the bar (B2), and the facts on `KeyValueList`

Spec §8.8 row 3, §4.4.5 row `D/maintenance/[id]/page.tsx`, §4.3.3 rule 6, §4.5.2 #26–27, §4.5.3 row 1, §4.6.4 bullet "ปุ่มกลับ 2 ที่บนมือถือ", §5.7, §9.4.1 note "LB1 0→1", §9.4.1–9.4.2 rows `D/maintenance/[id]/page.tsx`, §8.11 row 5, rulings I32, R-h, R-p and controller rulings (a) (this is the plan of the LB1 `0 → 1` row), (e), (f) and (g). One file, one commit. The page and its test are CRLF: exact-string replacements only.

Rulings this task applies:
- **§4.4.5, I32, §4.3.3 rule 6:** a repair record has no name of its own and the trail ends on its code, so the h1 is `ticket.asset.name` (it was `ticket.repairNo`); the meta row is the repair code (`tag`), the status badge (`getRepairRecordStatusTone`, as before) and the asset code (`tag`). The old line "<รหัส> - <ชื่อ>" under the title goes (both parts are now in the header). LH1 1 → 0.
- **§4.5.2 #26, §4.5.3, B2:** `back={<PageBackLink href={returnToHref} label={tCommon("back")} />}` replaces the hand-made link with the `Wrench` icon (`tests/operational-return-navigation.test.ts:31` still finds `href={returnToHref}`). The print link becomes `buttonVariants({ variant: "outline", size: "md" })` with `Printer`; the order is back → print → `RepairRecordActions` (R-h, §4.4.5 "พิมพ์ · RepairRecordActions"; the 2C batch 1a component and its props are byte for byte, only two spaces deeper).
- **§4.5.2 #27, §4.5.3, §8.11 row 5 (2B may change only the icon in the page's `actions` array):** the back item of `MobileActionBar` shows `<ArrowLeft className="h-4 w-4" />` instead of `Wrench`; `Wrench` leaves the import. That `<ArrowLeft` is the one LB1 hit `KEEP` allows for this page (the `0 → 1` row): LB1 stays 1, live 0 → 1, slack 0.
- **§3.14, LK1:** the file-local `Info` goes; the repair facts, the legacy facts, each history step's from/to and the asset panel are `KeyValueList`s (codes composed with a name as `tag`, R-p). The outcome keeps its success/warning ink inside the value (`tests/maintenance-contrast.test.ts` reads `text-success` and `text-warning` here). LK1 1 → 0.
- **LV2:** `Info`'s `value || "-"` goes with it, and `TextBlock` shows `<Nil />` for an empty problem or remark. LV2 2 → 0.
- **§5.7, DS:515, LV3:** money is `formatMoney`: the labour and parts costs of old records and the repair total of the disposal-review box take `{ unit: tCommon("baht") }`; the record's cost does not, because its label `repairRecord.cost` already ends in "(บาท)" (§5.7: do not double the unit). The disposal-review reason that pre-fills `/disposal/new` reads "ค่าซ่อมรวม 1,500.00 บาท" instead of "ค่าซ่อมรวม ฿1,500.00" (the `disposalRequestHref` line itself is untouched: `tests/disposal-route-structure.test.ts:41`). LV3 5 → 0.
- **Ruling (f):** 2B does not touch this page again, so it joins `MIGRATED_LIST_FILES`; what stays is LB1 1 and LP1 1, both its `KEEP`.
- **Fence (§8.8 row 3, §8.11 row 5, ruling (e)):** never the root `<div className="space-y-6 pb-24 md:pb-0">` (`:105`, O11) or any other line of the `MobileActionBar` block; never `maintenance-attachments.tsx` (2C plan 5) or `repair-record-actions.tsx` (2C batch 1a).
- **Tests:** one test appended to `tests/repair-record-detail-ui.test.ts`. The file reads the page raw (CRLF), so its regexes hold no `\n`.

What users will see on `/th/maintenance/<id>`:
- The title is the asset's name at weight 600; the repair code (monospace), its status badge and the asset code sit under it.
- "กลับ" is the outline button with the left arrow (a 44px icon button on phones) and comes first; "พิมพ์" is an outline button; the finish, cancel and edit buttons follow. On phones the bottom bar's "กลับ" now shows a left arrow instead of a wrench.
- The repair details, old-record details, the asset panel and each history step list label and value rows. Money reads "1,500.00 บาท" (the total cost keeps its "(บาท)" label and shows the number only). An empty problem or remark shows "—".

Not in this task: `maintenance-attachments.tsx` and `MobileActionBar` (2C plan 5) · the "เปิดหน้าทรัพย์สิน" and disposal-review links in the side panels (2D) · docs (Task 12). Do not run a formatter.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx` (`i/lf w/crlf`; 11 exact replacements)
- Modify: `tests/repair-record-detail-ui.test.ts` (`i/lf w/crlf`; 1 appended block)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only: `t03-repair-block.ts`

**Must keep passing without edits:**
- `tests/repair-record-detail-ui.test.ts:32-50` (`RepairRecordActions`, `getRepairRecordStatusTone`, `hasLegacyDetails`, `legacyFields`, `canAttachToRepairRecord(`, `canEdit={canAttach}`) · `tests/operational-return-navigation.test.ts:20-34` (`{ label: t("title"), href: returnToHref }`, `href={returnToHref}`, the print and disposal `appendOperationalReturnTo(…)`) · `tests/disposal-route-structure.test.ts:37-45` · `tests/maintenance-attachments-ui.test.ts:14-18` · `tests/maintenance-contrast.test.ts` · `tests/mobile-field-navigation.test.ts:38-56` (`/th/maintenance/ticket-1` is a focus route: no bottom navigation, so the page's own bar)
- `tests/breadcrumbs-ui.test.ts` (`{ label: ticket.repairNo, code: true }` last) · `tests/list-primitives-ui.test.ts` · `tests/visual-foundation-guards.test.ts` · `tests/form-migration-guards.test.ts`

**Interfaces:**
- Consumes: what Task 1 consumes (`PageHeader`, `PageBackLink`, `KeyValueList`, `Nil`, `formatMoney`, `buttonVariants`); Task 1's `<temp>/p2b4-t1-precheck.mjs`, `<temp>/p2b4-append.mjs`, `<temp>/p2b4-tw-probe.mjs`; Task 0's guard scripts.
- Produces:
  - the page in `MIGRATED_LIST_FILES` with LB1 1 and LP1 1 (its `KEEP`); the test `the repair page header is PageHeader with the asset name, and back points left in the header and the bar (spec 2B §4.4.5, B2)`.
  - For 2C plan 5 (Task 12 writes it into DH): the O11 root padding moves from `:105` to `:109`, the `MobileActionBar` block from `:142-149` to `:146-153`, and its back item (now `ArrowLeft`) from `:147` to `:151`.

| guard | `D/maintenance/[id]/page.tsx` before → after | plan total (budget) before → after |
|---|---|---|
| LFG LH1 | 1 → – | 23 → 22 |
| LFG LB1 | budget 1 (live 0) → 1 (live 1, `KEEP`) | 11 (live 10 → 11; slack 1 → 0) |
| LFG LP1 | 1 → 1 (`KEEP`, O11) | 7 |
| LFG LV2 | 2 → – | 86 → 84 |
| LFG LV3 | 5 → – | 32 → 27 |
| LFG LK1 | 1 → – | 6 → 5 |
| `MIGRATED_LIST_FILES` | – → joins | 66 → 67 |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b4-t1-precheck.mjs 3`
Expected: `git status` prints nothing. The script prints (exit 0) the nine `ok` lines of Task 2 Step 1 for the primitives and keys, then:
```
ok      Task 1 is in
ok      Task 2 is in
ok      Task 3 has not run yet
ok      src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx is unchanged since c2bfbe2 (hash 54d9f78e3d43f6bb)
ok      tests/repair-record-detail-ui.test.ts is unchanged since c2bfbe2 (hash 30413625164c7f0e)
info    src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx: CRLF
info    tests/repair-record-detail-ui.test.ts: CRLF
preconditions hold for Task 3
```

Run: `node <temp>/p2b1-precheck.mjs --file "D/maintenance/[id]/page.tsx"`
Expected (after the header lines; exit 0):
```
file    src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LH1        1       1     0     1
LB1        0       1     1     0
LP1        1       1     1     1
LV2        2       2     0     2
LV3        5       5     0     5
LK1        1       1     0     1
args    LH1=1:1 LB1=1:0 LP1=1:1 LV2=2:2 LV3=5:5 LK1=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```
`LB1=1:0` is the `0 → 1` row: budget 1 since 2B-1, live 0 until this task puts the `ArrowLeft` in the bar.

Run: `git ls-files --eol "src/app/[[]locale]/(dashboard)/maintenance/[[]id]/page.tsx" tests/repair-record-detail-ui.test.ts`
Expected: `i/lf w/crlf` for both.

- [ ] **Step 2: Write the failing test (`tests/repair-record-detail-ui.test.ts`, CRLF, read raw)**

Save this block as `<temp>/t03-repair-block.ts`:

```ts
// Plan 2B-4 Task 3 (spec 2B §4.4.5, §4.5.3, §8.8 row 3, B2, I32): the repair page header is PageHeader with the asset's
// name as the h1 (a repair record has no name of its own) and the repair code, the status and the asset code as meta.
// Back is PageBackLink, and the back item of the mobile bar shows ArrowLeft instead of Wrench. The O11 bottom padding
// stays for 2C plan 5. This file reads the page raw (CRLF): no line breaks in these regexes.
test("the repair page header is PageHeader with the asset name, and back points left in the header and the bar (spec 2B §4.4.5, B2)", () => {
  const source = readFileSync(detailPath, "utf8")
  assert.match(source, /breadcrumbs=\{\[\{ label: t\("title"\), href: returnToHref \}, \{ label: ticket\.repairNo, code: true \}\]\}\s*title=\{ticket\.asset\.name\}/)
  assert.match(source, /<span className="tag">\{ticket\.repairNo\}<\/span>\s*<StatusBadge label=\{t\(`status\.\$\{recordStatus\}`\)\} tone=\{getRepairRecordStatusTone\(ticket\.repairStatus\)\} \/>\s*<span className="tag">\{ticket\.asset\.assetTag\}<\/span>/)
  assert.match(source, /back=\{<PageBackLink href=\{returnToHref\} label=\{tCommon\("back"\)\} \/>\}/)
  assert.match(source, /\{ href: returnToHref, label: tCommon\("back"\), icon: <ArrowLeft className="h-4 w-4" \/> \}/)
  assert.match(source, /<div className="space-y-6 pb-24 md:pb-0">/, "the O11 bottom padding stays for 2C plan 5")
  assert.equal(source.match(/<KeyValueList\b/g)?.length, 4)
  assert.doesNotMatch(source, /\bWrench\b|<h1\b|<Breadcrumbs\b|formatCurrency|function Info\b|"-"/)
})
```

Run: `node <temp>/p2b4-append.mjs <temp>/t03-repair-block.ts tests/repair-record-detail-ui.test.ts`
Expected: `appended <temp>/t03-repair-block.ts to tests/repair-record-detail-ui.test.ts (CRLF)`

Run: `node --test tests/repair-record-detail-ui.test.ts`
Expected: FAIL, `tests 10 · pass 9 · fail 1`:
- `the repair page header is PageHeader with the asset name, and back points left in the header and the bar (spec 2B §4.4.5, B2)`: the input did not match the regular expression `/breadcrumbs=\{\[\{ label: t\("title"\), href: returnToHref \}, \{ label: ticket\.repairNo, code: true \}\]\}\s*title=\{ticket\.asset\.name\}/`

- [ ] **Step 3: Lower the guard rows of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs "D/maintenance/[id]/page.tsx" LH1=1:0 LB1=1:1 LP1=1:1 LV2=2:0 LV3=5:0 LK1=1:0 --migrated`
Expected (exit 0):
```
LH1: 1 -> 0 (row deleted)
LB1: 1 kept
LP1: 1 kept
LV2: 2 -> 0 (row deleted)
LV3: 5 -> 0 (row deleted)
LK1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx
```

Run: `node --test tests/list-frame-guards.test.ts`
Expected: FAIL, `tests 21 · pass 16 · fail 5`, each naming only `src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx`:
- LH1 (`LH1: 23 in 23 files`, `1 > 0`) · LV2 (`86 in 29`, `2 > 0`) · LV3 (`32 in 8`, `5 > 0`) · LK1 (`6 in 6`, `1 > 0`)
- `L0 …` with the same four lines; LB1 is not among them (live 0 ≤ `KEEP` 1)

- [ ] **Step 4: Move the page onto the shared parts (`src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx`, CRLF)**

11 exact replacements, top to bottom.

(1) Imports `:4-18`. Replace:

```tsx
import { AlertTriangle, FileText, History, Printer, Trash2, Wrench } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils"
import { toLocalDateInputValue } from "@/lib/local-date"
import { MaintenanceAttachments } from "@/components/maintenance/maintenance-attachments"
import { RepairRecordActions } from "@/components/maintenance/repair-record-actions"
import { getMaintenanceMovementLabel, getMovementDisplayLabels } from "@/lib/movement-labels"
import { canAttachToRepairRecord, getRepairRecordStatusTone, isOpenRepairStatus, toRepairRecordStatus } from "@/lib/repair-record-policy"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { MobileActionBar } from "@/components/ui/mobile-action-bar"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import { appendOperationalReturnTo, normalizeOperationalReturnTo } from "@/lib/operational-return-navigation"
```

with:

```tsx
import { AlertTriangle, ArrowLeft, FileText, History, Printer, Trash2 } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { formatMoney } from "@/lib/display-format"
import { formatDate, formatDateTime } from "@/lib/utils"
import { toLocalDateInputValue } from "@/lib/local-date"
import { MaintenanceAttachments } from "@/components/maintenance/maintenance-attachments"
import { RepairRecordActions } from "@/components/maintenance/repair-record-actions"
import { getMaintenanceMovementLabel, getMovementDisplayLabels } from "@/lib/movement-labels"
import { canAttachToRepairRecord, getRepairRecordStatusTone, isOpenRepairStatus, toRepairRecordStatus } from "@/lib/repair-record-policy"
import { buttonVariants } from "@/components/ui/button-variants"
import { KeyValueList } from "@/components/ui/key-value-list"
import { MobileActionBar } from "@/components/ui/mobile-action-bar"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { Nil } from "@/components/ui/nil"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { appendOperationalReturnTo, normalizeOperationalReturnTo } from "@/lib/operational-return-navigation"
```

(2) The legacy costs `:83-84`. Replace:

```tsx
    { label: t("legacyFields.laborCost"), value: ticket.laborCost == null ? null : formatCurrency(Number(ticket.laborCost)) },
    { label: t("legacyFields.partsCost"), value: ticket.partsCost == null ? null : formatCurrency(Number(ticket.partsCost)) },
```

with:

```tsx
    { label: t("legacyFields.laborCost"), value: ticket.laborCost == null ? null : formatMoney(Number(ticket.laborCost), { unit: tCommon("baht") }) },
    { label: t("legacyFields.partsCost"), value: ticket.partsCost == null ? null : formatMoney(Number(ticket.partsCost), { unit: tCommon("baht") }) },
```

(3) The disposal-review reason `:98` (the `disposalRequestHref` lines below it stay). Replace:

```tsx
  const disposalReason = `${ticket.asset.assetTag} / ${ticket.repairNo}: ${t("disposalReviewCount", { count: totalRepairCount })}, ${t("disposalReviewCost", { cost: formatCurrency(totalRepairCost) })}`
```

with:

```tsx
  const disposalReason = `${ticket.asset.assetTag} / ${ticket.repairNo}: ${t("disposalReviewCount", { count: totalRepairCount })}, ${t("disposalReviewCost", { cost: formatMoney(totalRepairCost, { unit: tCommon("baht") }) })}`
```

(4) The header `:106-141` (the root `<div className="space-y-6 pb-24 md:pb-0">` at `:105` above it and `<MobileActionBar` below it stay). Replace:

```tsx
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2">
            <Breadcrumbs items={[{ label: t("title"), href: returnToHref }, { label: ticket.repairNo, code: true }]} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{ticket.repairNo}</h1>
            <StatusBadge label={t(`status.${recordStatus}`)} tone={getRepairRecordStatusTone(ticket.repairStatus)} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{ticket.asset.assetTag} - {ticket.asset.name}</p>
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {canEdit ? (
            <RepairRecordActions
              recordId={ticket.id}
              repairNo={ticket.repairNo}
              expectedUpdatedAt={ticket.updatedAt.toISOString()}
              isOpen={isOpen}
              details={{
                reportedDate: toLocalDateInputValue(ticket.reportedDate),
                problem: ticket.problem,
                vendor: ticket.vendor ? { id: ticket.vendor.id, label: `${ticket.vendor.code} - ${ticket.vendor.name}` } : null,
                repairCost: ticket.repairCost?.toString() ?? "",
                invoiceNo: ticket.invoiceNo ?? "",
                remark: ticket.resolution ?? "",
              }}
            />
          ) : null}
          <Link href={printHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium hover:bg-accent">
            <Printer className="h-4 w-4" />{t("print")}
          </Link>
          <Link href={returnToHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium hover:bg-accent">
            <Wrench className="h-4 w-4" />{tCommon("back")}
          </Link>
        </div>
      </div>
```

with:

```tsx
      <PageHeader
        breadcrumbs={[{ label: t("title"), href: returnToHref }, { label: ticket.repairNo, code: true }]}
        title={ticket.asset.name}
        meta={
          <>
            <span className="tag">{ticket.repairNo}</span>
            <StatusBadge label={t(`status.${recordStatus}`)} tone={getRepairRecordStatusTone(ticket.repairStatus)} />
            <span className="tag">{ticket.asset.assetTag}</span>
          </>
        }
        back={<PageBackLink href={returnToHref} label={tCommon("back")} />}
        actions={
          <>
            <Link href={printHref} className={buttonVariants({ variant: "outline", size: "md" })}>
              <Printer aria-hidden="true" />
              {t("print")}
            </Link>
            {canEdit ? (
              <RepairRecordActions
                recordId={ticket.id}
                repairNo={ticket.repairNo}
                expectedUpdatedAt={ticket.updatedAt.toISOString()}
                isOpen={isOpen}
                details={{
                  reportedDate: toLocalDateInputValue(ticket.reportedDate),
                  problem: ticket.problem,
                  vendor: ticket.vendor ? { id: ticket.vendor.id, label: `${ticket.vendor.code} - ${ticket.vendor.name}` } : null,
                  repairCost: ticket.repairCost?.toString() ?? "",
                  invoiceNo: ticket.invoiceNo ?? "",
                  remark: ticket.resolution ?? "",
                }}
              />
            ) : null}
          </>
        }
      />
```

(5) The back item of the mobile bar `:147` (the icon only; the other lines of the block stay). Replace:

```tsx
          { href: returnToHref, label: tCommon("back"), icon: <Wrench className="h-4 w-4" /> },
```

with:

```tsx
          { href: returnToHref, label: tCommon("back"), icon: <ArrowLeft className="h-4 w-4" /> },
```

(6) The repair facts `:155-164`. Replace:

```tsx
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Info label={t("date")} value={formatDate(ticket.reportedDate)} />
              <Info label={t("outcomeQuestion")} value={outcomeLabel} tone={ticket.outcome === "usable" ? "success" : ticket.outcome === "beyond_repair" ? "warning" : undefined} />
              <Info label={t("returnDate")} value={ticket.returnDate ? formatDate(ticket.returnDate) : null} />
              <Info label={t("vendor")} value={ticket.vendor ? `${ticket.vendor.code} - ${ticket.vendor.name}` : t("internal")} />
              <Info label={t("cost")} value={ticket.repairCost == null ? null : formatCurrency(Number(ticket.repairCost))} />
              <Info label={t("invoiceNo")} value={ticket.invoiceNo} />
              <Info label={t("reporter")} value={`${ticket.reportedBy.code} - ${ticket.reportedBy.fullNameTh}`} />
              {ticket.maintenancePlan ? <Info label={t("planLabel")} value={`${ticket.maintenancePlan.planNo} - ${ticket.maintenancePlan.title}`} /> : null}
            </div>
```

with:

```tsx
            <KeyValueList
              items={[
                { key: "date", label: t("date"), value: formatDate(ticket.reportedDate) },
                {
                  key: "outcome",
                  label: t("outcomeQuestion"),
                  value: outcomeLabel == null ? null : (
                    <span className={ticket.outcome === "usable" ? "text-success" : ticket.outcome === "beyond_repair" ? "text-warning" : undefined}>{outcomeLabel}</span>
                  ),
                },
                { key: "returnDate", label: t("returnDate"), value: ticket.returnDate ? formatDate(ticket.returnDate) : null },
                { key: "vendor", label: t("vendor"), value: ticket.vendor ? <><span className="tag">{ticket.vendor.code}</span> - {ticket.vendor.name}</> : t("internal") },
                { key: "cost", label: t("cost"), value: ticket.repairCost == null ? null : <span className="num">{formatMoney(Number(ticket.repairCost))}</span> },
                { key: "invoiceNo", label: t("invoiceNo"), value: ticket.invoiceNo },
                { key: "reporter", label: t("reporter"), value: <><span className="tag">{ticket.reportedBy.code}</span> - {ticket.reportedBy.fullNameTh}</> },
                ...(ticket.maintenancePlan
                  ? [{ key: "plan", label: t("planLabel"), value: <><span className="tag">{ticket.maintenancePlan.planNo}</span> - {ticket.maintenancePlan.title}</> }]
                  : []),
              ]}
            />
```

(7) The legacy facts `:174-176`. Replace:

```tsx
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {legacyFields.map((field) => <Info key={field.label} label={field.label} value={field.value} />)}
              </div>
```

with:

```tsx
              <KeyValueList items={legacyFields} />
```

(8) A history step's from/to `:203-206`. Replace:

```tsx
                      <div className="mt-2 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                        <Info label={t("fromValue")} value={movementLabels.get(movement.id)?.from} />
                        <Info label={t("toValue")} value={movementLabels.get(movement.id)?.to} />
                      </div>
```

with:

```tsx
                      <KeyValueList
                        className="mt-2"
                        items={[
                          { key: "from", label: t("fromValue"), value: movementLabels.get(movement.id)?.from },
                          { key: "to", label: t("toValue"), value: movementLabels.get(movement.id)?.to },
                        ]}
                      />
```

(9) The asset panel `:219-224` (the "เปิดหน้าทรัพย์สิน" link line stays). Replace:

```tsx
            <div className="space-y-4">
              <Info label={t("asset")} value={`${ticket.asset.assetTag} - ${ticket.asset.name}`} />
              <Info label={t("currentStatus")} value={ticket.asset.status.nameTh} />
              <Info label={t("location")} value={`${ticket.asset.currentLocation.code} - ${ticket.asset.currentLocation.name}`} />
              <Info label={t("custodian")} value={ticket.asset.custodian ? `${ticket.asset.custodian.code} - ${ticket.asset.custodian.fullNameTh}` : null} />
              <Link href={`/${locale}/assets/${ticket.asset.id}`} className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium hover:bg-accent">
```

with:

```tsx
            <div className="space-y-4">
              <KeyValueList
                items={[
                  { key: "asset", label: t("asset"), value: <><span className="tag">{ticket.asset.assetTag}</span> - {ticket.asset.name}</> },
                  { key: "currentStatus", label: t("currentStatus"), value: ticket.asset.status.nameTh },
                  { key: "location", label: t("location"), value: <><span className="tag">{ticket.asset.currentLocation.code}</span> - {ticket.asset.currentLocation.name}</> },
                  {
                    key: "custodian",
                    label: t("custodian"),
                    value: ticket.asset.custodian ? <><span className="tag">{ticket.asset.custodian.code}</span> - {ticket.asset.custodian.fullNameTh}</> : null,
                  },
                ]}
              />
              <Link href={`/${locale}/assets/${ticket.asset.id}`} className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium hover:bg-accent">
```

(10) The disposal-review cost `:237`. Replace:

```tsx
                <div>{t("disposalReviewCost", { cost: formatCurrency(totalRepairCost) })}</div>
```

with:

```tsx
                <div>{t("disposalReviewCost", { cost: formatMoney(totalRepairCost, { unit: tCommon("baht") }) })}</div>
```

(11) `Info` and `TextBlock` `:255-273` (`Info` has no caller left; the closing `}` of `TextBlock` at `:274` stays). Replace:

```tsx
function Info({ label, value, tone }: { label: string; value?: string | number | null; tone?: "success" | "warning" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-foreground"
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm font-medium ${toneClass}`}>{value || "-"}</div>
    </div>
  )
}

function TextBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-foreground">{label}</div>
      <div className="min-h-20 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
        {value ? <p className="whitespace-pre-wrap">{value}</p> : "-"}
      </div>
    </div>
  )
```

with:

```tsx
function TextBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-foreground">{label}</div>
      <div className="min-h-20 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
        {value ? <p className="whitespace-pre-wrap">{value}</p> : <Nil />}
      </div>
    </div>
  )
```

Check: `grep -nE 'Wrench|"-"|formatCurrency|<h1|function Info' "src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx"` prints nothing (exit 1); `grep -n 'className="space-y-6 pb-24 md:pb-0"\|<ArrowLeft' …` prints `109:` (the O11 line, untouched) and `151:` (the bar's back item).

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/repair-record-detail-ui.test.ts tests/operational-return-navigation.test.ts tests/breadcrumbs-ui.test.ts tests/maintenance-attachments-ui.test.ts tests/maintenance-contrast.test.ts tests/disposal-route-structure.test.ts tests/mobile-field-navigation.test.ts tests/list-primitives-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `tests 142 · pass 142 · fail 0` (repair-record-detail-ui 10 · operational-return-navigation 10 · breadcrumbs-ui 4 · maintenance-attachments-ui 3 · maintenance-contrast 1 · disposal-route-structure 18 · mobile-field-navigation 7 · list-primitives-ui 19 · list-frame-guards 21 · visual-foundation-guards 26 · form-migration-guards 23).

Run: `node <temp>/p2b1-precheck.mjs --file "D/maintenance/[id]/page.tsx"`
Expected (exit 0):
```
file    src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx (CRLF) · in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LH1        0       0     0     1
LB1        1       1     1     0
LP1        1       1     1     1
LV2        0       0     0     2
LV3        0       0     0     5
LK1        0       0     0     1
args    LB1=1:1 LP1=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b4-tw-probe.mjs "src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx"`
Expected: `checked 76 classes, missing 0` (exit 0). No class is new to `src`.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `tests 1954 · pass 1953 · fail 0 · skipped 1` (one test more than after Task 2).
- `npx tsc --noEmit`: no errors (`legacyFields` items fit `KeyValueItem` as they are).
- `npm run lint`: 0 errors, no new warning; `npx eslint "src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx" tests/repair-record-detail-ui.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 3 files: the page 88 insertions and 75 deletions, `tests/repair-record-detail-ui.test.ts` 15 insertions, `tests/list-frame-guards.test.ts` 1 and 4 (the `MIGRATED_LIST_FILES` line in; the LH1, LV2, LV3 and LK1 rows out; the LB1 and LP1 rows stay). CRLF counts: the page `287 287`, the test `90 90`.

- [ ] **Step 8: Commit**

```bash
git add "src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx" tests/repair-record-detail-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): repair page on PageHeader with the asset name, back points left in the header and the bar, facts on KeyValueList (2B-4 task 3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 11, spec §8.8 row `/th/maintenance/<id>`):** at 1440 and 375 with the repair of Task 0 Step 7, opened from page 2 of `/th/maintenance` with a filter: the asset name is the h1 and the meta row reads the repair code, the status badge and the asset code; "กลับ" (header and bottom bar) lands on page 2 with the filter; both back controls show a left arrow; "พิมพ์" opens the print page and its own back returns here; the finish/cancel/edit dialogs open and close (cancel them); the facts are label rows (stacked at 375) with "บาท" on the legacy costs and the review box, and the total cost shows the number under its "(บาท)" label; an empty remark shows "—"; at 375 the bottom bar covers no content and nothing scrolls sideways; at 768–1023 the header buttons and the bottom bar are both shown (md / lg).

---
### Task 4: `D/disposal/[id]/page.tsx` · the asset name as the h1 on `PageHeader`, a back button on phones too (B2), the stepper where it was, and the facts on `KeyValueList`

Spec §8.8 row 4, §4.4.5 row `D/disposal/[id]/page.tsx`, §4.3.3 rules 4 and 6, §4.5.2 #25, §4.5.4, §5.7, §9.4.1–9.4.2 rows `D/disposal/[id]/page.tsx`, §10.4 table A row 2B-4 (`disposal-detail-workspace.test.ts:33`), §8.11 rows 5 and 6, rulings I32, R-h, R-p and controller rulings (a), (e), (f) and (g). One file, one commit. The page and its test are CRLF: exact-string replacements only. This task ends with the guard state after Tasks 1–4.

Rulings this task applies:
- **§4.4.5, I32, §4.3.3 rules 4 and 6:** a disposal request has no name of its own and the trail ends on its code, so the h1 is `disposalRequest.asset.name` (it was `disposalNo`); the meta row is the request code (`tag`), the status badge (it lived in the `hidden … md:flex` group, so it now shows on phones too) and the asset code (`tag`). The old "<รหัส> - <ชื่อ>" line goes. LH1 1 → 0.
- **§4.5.2 #25, §4.5.4, B2:** `back={<PageBackLink href={returnToHref} label={tCommon("back")} />}` sits outside the md-and-up group, so phones get a back button (a 44px icon) for the first time; `href={returnToHref}` stays (`tests/disposal-detail-workspace.test.ts:36`, `tests/operational-return-navigation.test.ts:46`). Table A `:33` (`/ArrowLeft/`) becomes `/<PageBackLink href=\{returnToHref\}/`. LB1 1 → 0.
- **§4.5.4:** print (`buttonVariants({ variant: "outline", size: "md" })`, `Printer`) and `nextActionControl` stay in `<div className="hidden items-center gap-2 md:flex">` inside `actions` (`tests/disposal-detail-workspace.test.ts:45`); on phones `DisposalMobileActionBar` keeps offering them.
- **§8.11 row 6 (O12):** 2B may only place `DisposalWorkflowStepper`; it stays right under the header with its props byte for byte (`:205-215` → `:199-209`). The component file is 2C plan 5's.
- **§3.14, LK1:** the file-local `Info` goes; the request facts, the execution facts, the historical-evidence facts, each history step's from/to and the asset panel are `KeyValueList`s (composed codes as `tag`, R-p; a missing custodian reads `asset.noCustodian` to screen readers). Nullable dates pass `null` instead of `formatDateTime(null)`'s typed "-". `formatSource` returns `null` when there is no source (it returned a typed "-", which `KeyValueList` would print). LK1 1 → 0.
- **LV2:** `Info`'s `value || "-"` goes with it, and `TextBlock` shows `<Nil />` for an empty remark. LV2 2 → 0.
- **§5.7, DS:515, LV3:** the sale, salvage, actual sale, actual salvage and purchase values are `formatMoney(…, { unit: tCommon("baht") })` (their labels carry no unit). LV3 5 → 0.
- **Ruling (f):** 2B does not touch this page again, so it joins `MIGRATED_LIST_FILES`; what stays is LP1 1, its `KEEP`.
- **Fence (§8.8 row 4, §8.11 rows 5 and 6, ruling (e)):** never the root `<div className="space-y-6 pb-36 md:pb-0">` (`:170`, O11), the `DisposalMobileActionBar` block (`:222-229`) or `c/disposal/disposal-workflow-stepper.tsx`; never `disposal-decision-button.tsx` or `disposal-execution-button.tsx` (2C batch 1c).
- **Tests:** table A `:33` and one appended test. The file reads the page raw (CRLF), so the new regexes hold no `\n`.

What users will see on `/th/disposal/<id>`:
- The title is the asset's name at weight 600; the request code (monospace), the status badge and the asset code sit under it, on phones too.
- Phones get the "กลับ" icon button at the top (it was missing); from md "กลับ", the print button and the next step sit beside the title as before.
- The stepper, the batch banner and the phone bottom bar are where they were.
- The request, execution and asset facts are label and value rows; money reads "1,500.00 บาท"; an empty value or remark shows "—".

Not in this task: `DisposalMobileActionBar`, `DisposalWorkflowStepper` and the root padding (2C plan 5) · the batch banner and "เปิดรายละเอียดทรัพย์สิน" links (2D) · docs (Task 12). Do not run a formatter.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/disposal/[id]/page.tsx` (`i/lf w/crlf`; 9 exact replacements)
- Modify: `tests/disposal-detail-workspace.test.ts` (`i/lf w/crlf`; 1 exact replacement, 1 appended block)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only: `t04-disposal-block.ts`

**Must keep passing without edits:**
- `tests/disposal-detail-workspace.test.ts:8-28`, `:34-37` (`:35` `<DisposalMobileActionBar` is 2C plan 5's to change), `:40-49` (`:45` `hidden[^"]*md:flex`), `:63-69`, `:87-101`
- `tests/operational-return-navigation.test.ts:36-48` · `tests/disposal-route-structure.test.ts:92-107` · `tests/disposal-evidence-exception.test.ts:110-133`, `:195-221` (`evidenceExceptionReason ? (`, `prisma.user.findUnique`, `historicalEvidenceBadge`) · `tests/mobile-field-navigation.test.ts:38-56` (`/th/disposal/request-1` is a focus route)
- `tests/breadcrumbs-ui.test.ts` (`{ label: disposalRequest.disposalNo, code: true }` last) · `tests/list-primitives-ui.test.ts` · `tests/visual-foundation-guards.test.ts` · `tests/form-migration-guards.test.ts`

**Interfaces:**
- Consumes: what Task 3 consumes; `asset.noCustodian` (the page already loads `tAsset`); Task 1's `<temp>/p2b4-t1-precheck.mjs`, `<temp>/p2b4-append.mjs`, `<temp>/p2b4-tw-probe.mjs`; Task 0's guard scripts.
- Produces:
  - the page in `MIGRATED_LIST_FILES` with LP1 1 (its `KEEP`); the test `disposal request header is PageHeader with the asset name and a back button at every width (spec 2B §4.5.4)`.
  - For 2C plan 5 (Task 12 writes it into DH): the O11 root padding moves from `:170` to `:174`, `DisposalWorkflowStepper` from `:205-215` to `:199-209`, and `DisposalMobileActionBar` from `:222-229` to `:216-223`.

| guard | `D/disposal/[id]/page.tsx` before → after | plan total (budget) before → after |
|---|---|---|
| LFG LH1 | 1 → – | 22 → 21 |
| LFG LB1 | 1 → – | 11 → 10 (live 11 → 10) |
| LFG LP1 | 1 → 1 (`KEEP`, O11) | 7 |
| LFG LV2 | 2 → – | 84 → 82 |
| LFG LV3 | 5 → – | 27 → 22 |
| LFG LK1 | 1 → – | 5 → 4 |
| `MIGRATED_LIST_FILES` | – → joins | 67 → 68 |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b4-t1-precheck.mjs 4`
Expected: `git status` prints nothing. The script prints (exit 0) the nine `ok` lines of Task 2 Step 1 for the primitives and keys, then:
```
ok      Task 1 is in
ok      Task 2 is in
ok      Task 3 is in
ok      Task 4 has not run yet
ok      src/app/[locale]/(dashboard)/disposal/[id]/page.tsx is unchanged since c2bfbe2 (hash ffbc5092c34115e8)
ok      tests/disposal-detail-workspace.test.ts is unchanged since c2bfbe2 (hash 6555cdd7434e3efe)
info    src/app/[locale]/(dashboard)/disposal/[id]/page.tsx: CRLF
info    tests/disposal-detail-workspace.test.ts: CRLF
preconditions hold for Task 4
```

Run: `node <temp>/p2b1-precheck.mjs --file "D/disposal/[id]/page.tsx"`
Expected (after the header lines; exit 0):
```
file    src/app/[locale]/(dashboard)/disposal/[id]/page.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LH1        1       1     0     1
LB1        1       1     0     1
LP1        1       1     1     1
LV2        2       2     0     2
LV3        5       5     0     5
LK1        1       1     0     1
args    LH1=1:1 LB1=1:1 LP1=1:1 LV2=2:2 LV3=5:5 LK1=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol "src/app/[[]locale]/(dashboard)/disposal/[[]id]/page.tsx" tests/disposal-detail-workspace.test.ts`
Expected: `i/lf w/crlf` for both.

- [ ] **Step 2: Write the failing tests (`tests/disposal-detail-workspace.test.ts`, CRLF, read raw)**

(a) Table A `:33`. Replace:

```ts
  assert.match(source, /ArrowLeft/)
```

with:

```ts
  assert.match(source, /<PageBackLink href=\{returnToHref\}/)
```

(b) Save this block as `<temp>/t04-disposal-block.ts`:

```ts
// Plan 2B-4 Task 4 (spec 2B §4.4.5, §4.5.4, §8.8 row 4, B2, I32): the request page header is PageHeader with the asset's
// name as the h1; the request code, the status and the asset code are its meta and show on phones too. The back button
// shows at every width; print and the next step stay in the md-and-up group (the mobile bar has them on phones). The
// stepper stays under the header and the O11 bottom padding stays for 2C plan 5. Raw read (CRLF): no line breaks here.
test("disposal request header is PageHeader with the asset name and a back button at every width (spec 2B §4.5.4)", () => {
  const source = detailSource()

  assert.match(source, /breadcrumbs=\{\[\s*\{ label: t\("title"\), href: returnToHref \},\s*\{ label: disposalRequest\.disposalNo, code: true \},\s*\]\}\s*title=\{disposalRequest\.asset\.name\}/)
  assert.match(source, /meta=\{\s*<>\s*<span className="tag">\{disposalRequest\.disposalNo\}<\/span>\s*<StatusBadge /)
  assert.match(source, /back=\{<PageBackLink href=\{returnToHref\} label=\{tCommon\("back"\)\} \/>\}\s*actions=\{\s*<div className="hidden items-center gap-2 md:flex">/)
  assert.ok(source.indexOf("<PageHeader") < source.indexOf("<DisposalWorkflowStepper"), "the stepper stays under the header")
  assert.match(source, /<div className="space-y-6 pb-36 md:pb-0">/, "the O11 bottom padding stays for 2C plan 5")
  assert.equal(source.match(/<KeyValueList\b/g)?.length, 5)
  assert.doesNotMatch(source, /<h1\b|<Breadcrumbs\b|ArrowLeft|formatCurrency|function Info\b|"-"/)
})
```

Run: `node <temp>/p2b4-append.mjs <temp>/t04-disposal-block.ts tests/disposal-detail-workspace.test.ts`
Expected: `appended <temp>/t04-disposal-block.ts to tests/disposal-detail-workspace.test.ts (CRLF)`

Run: `node --test tests/disposal-detail-workspace.test.ts`
Expected: FAIL, `tests 10 · pass 8 · fail 2`:
- `disposal detail preserves operational navigation and uses an ArrowLeft back affordance`: the input did not match the regular expression `/<PageBackLink href=\{returnToHref\}/`
- `disposal request header is PageHeader with the asset name and a back button at every width (spec 2B §4.5.4)`: the input did not match the regular expression `/breadcrumbs=\{\[\s*\{ label: t\("title"\), href: returnToHref \},\s*\{ label: disposalRequest\.disposalNo, code: true \},\s*\]\}\s*title=\{disposalRequest\.asset\.name\}/`

- [ ] **Step 3: Lower the guard rows of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs "D/disposal/[id]/page.tsx" LH1=1:0 LB1=1:0 LP1=1:1 LV2=2:0 LV3=5:0 LK1=1:0 --migrated`
Expected (exit 0):
```
LH1: 1 -> 0 (row deleted)
LB1: 1 -> 0 (row deleted)
LP1: 1 kept
LV2: 2 -> 0 (row deleted)
LV3: 5 -> 0 (row deleted)
LK1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/disposal/[id]/page.tsx
```

Run: `node --test tests/list-frame-guards.test.ts`
Expected: FAIL, `tests 21 · pass 15 · fail 6`, each naming only `src/app/[locale]/(dashboard)/disposal/[id]/page.tsx`:
- LH1 (`LH1: 22 in 22 files`, `1 > 0`) · LB1 (`11 in 11`, `1 > 0`) · LV2 (`84 in 28`, `2 > 0`) · LV3 (`27 in 7`, `5 > 0`) · LK1 (`5 in 5`, `1 > 0`)
- `L0 …` with the same five lines

- [ ] **Step 4: Move the page onto the shared parts (`src/app/[locale]/(dashboard)/disposal/[id]/page.tsx`, CRLF)**

9 exact replacements, top to bottom.

(1) Imports `:4-19`. Replace:

```tsx
import { AlertTriangle, ArrowLeft, ClipboardCheck, FileText, History, Package, Printer } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { getDisposalOptions } from "@/lib/disposal-options"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { getMovementDisplayLabels } from "@/lib/movement-labels"
import { DisposalAttachments } from "@/components/disposal/disposal-attachments"
import { DisposalDecisionButton } from "@/components/disposal/disposal-decision-button"
import { DisposalExecutionButton } from "@/components/disposal/disposal-execution-button"
import { DisposalMobileActionBar } from "@/components/disposal/disposal-mobile-action-bar"
import { DisposalWorkflowStepper } from "@/components/disposal/disposal-workflow-stepper"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import { appendOperationalReturnTo, normalizeOperationalReturnTo } from "@/lib/operational-return-navigation"
```

with:

```tsx
import { AlertTriangle, ClipboardCheck, FileText, History, Package, Printer } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { getDisposalOptions } from "@/lib/disposal-options"
import { formatMoney } from "@/lib/display-format"
import { formatDateTime } from "@/lib/utils"
import { getMovementDisplayLabels } from "@/lib/movement-labels"
import { DisposalAttachments } from "@/components/disposal/disposal-attachments"
import { DisposalDecisionButton } from "@/components/disposal/disposal-decision-button"
import { DisposalExecutionButton } from "@/components/disposal/disposal-execution-button"
import { DisposalMobileActionBar } from "@/components/disposal/disposal-mobile-action-bar"
import { DisposalWorkflowStepper } from "@/components/disposal/disposal-workflow-stepper"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil } from "@/components/ui/nil"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { appendOperationalReturnTo, normalizeOperationalReturnTo } from "@/lib/operational-return-navigation"
```

(2) The header `:171-204` (the root `<div className="space-y-6 pb-36 md:pb-0">` at `:170` above it and `<DisposalWorkflowStepper` below it stay). Replace:

```tsx
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2">
            <Breadcrumbs
              items={[
                { label: t("title"), href: returnToHref },
                { label: disposalRequest.disposalNo, code: true },
              ]}
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{disposalRequest.disposalNo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {disposalRequest.asset.assetTag} - {disposalRequest.asset.name}
          </p>
        </div>
        <div className="hidden min-w-0 flex-col gap-2 md:flex md:flex-row md:flex-wrap md:items-center md:justify-end">
          <Link
            href={returnToHref}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent sm:h-10 sm:min-h-0 sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            {tCommon("back")}
          </Link>
          <Link
            href={printHref}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent sm:h-10 sm:min-h-0 sm:w-auto"
          >
            <Printer className="h-4 w-4" />
            {printLabel}
          </Link>
          {nextActionControl}
          <StatusBadge label={statusLabels[disposalRequest.requestStatus as keyof typeof statusLabels] ?? disposalRequest.requestStatus} status={disposalRequest.requestStatus} />
        </div>
      </div>
```

with:

```tsx
      <PageHeader
        breadcrumbs={[
          { label: t("title"), href: returnToHref },
          { label: disposalRequest.disposalNo, code: true },
        ]}
        title={disposalRequest.asset.name}
        meta={
          <>
            <span className="tag">{disposalRequest.disposalNo}</span>
            <StatusBadge label={statusLabels[disposalRequest.requestStatus as keyof typeof statusLabels] ?? disposalRequest.requestStatus} status={disposalRequest.requestStatus} />
            <span className="tag">{disposalRequest.asset.assetTag}</span>
          </>
        }
        back={<PageBackLink href={returnToHref} label={tCommon("back")} />}
        actions={
          <div className="hidden items-center gap-2 md:flex">
            <Link href={printHref} className={buttonVariants({ variant: "outline", size: "md" })}>
              <Printer aria-hidden="true" />
              {printLabel}
            </Link>
            {nextActionControl}
          </div>
        }
      />
```

(3) The request facts `:238-249`. Replace:

```tsx
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Info label={t("disposalNo")} value={disposalRequest.disposalNo} />
              <Info label={t("disposalType")} value={t(`types.${disposalRequest.disposalType}`)} />
              <Info label={t("requestDate")} value={formatDateTime(disposalRequest.requestDate)} />
              <Info label={t("requestedBy")} value={`${disposalRequest.requestedBy.code} - ${disposalRequest.requestedBy.fullNameTh}`} />
              <Info label={t("approver")} value={disposalRequest.approver ? `${disposalRequest.approver.code} - ${disposalRequest.approver.fullNameTh}` : null} />
              <Info label={tCommon("status")} value={statusLabels[disposalRequest.requestStatus as keyof typeof statusLabels] ?? disposalRequest.requestStatus} />
              <Info label={t("saleValue")} value={disposalRequest.saleValue == null ? null : formatCurrency(Number(disposalRequest.saleValue))} />
              <Info label={t("salvageValue")} value={disposalRequest.salvageValue == null ? null : formatCurrency(Number(disposalRequest.salvageValue))} />
              <Info label={t("approvedAt")} value={formatDateTime(disposalRequest.approvedAt)} />
              <Info label={t("source")} value={formatSource(disposalRequest.sourceType, disposalRequest.sourceId)} />
            </div>
```

with:

```tsx
            <KeyValueList
              items={[
                { key: "disposalNo", label: t("disposalNo"), value: <span className="tag">{disposalRequest.disposalNo}</span> },
                { key: "disposalType", label: t("disposalType"), value: t(`types.${disposalRequest.disposalType}`) },
                { key: "requestDate", label: t("requestDate"), value: formatDateTime(disposalRequest.requestDate) },
                { key: "requestedBy", label: t("requestedBy"), value: <><span className="tag">{disposalRequest.requestedBy.code}</span> - {disposalRequest.requestedBy.fullNameTh}</> },
                {
                  key: "approver",
                  label: t("approver"),
                  value: disposalRequest.approver ? <><span className="tag">{disposalRequest.approver.code}</span> - {disposalRequest.approver.fullNameTh}</> : null,
                },
                { key: "status", label: tCommon("status"), value: statusLabels[disposalRequest.requestStatus as keyof typeof statusLabels] ?? disposalRequest.requestStatus },
                {
                  key: "saleValue",
                  label: t("saleValue"),
                  value: disposalRequest.saleValue == null ? null : <span className="num">{formatMoney(Number(disposalRequest.saleValue), { unit: tCommon("baht") })}</span>,
                },
                {
                  key: "salvageValue",
                  label: t("salvageValue"),
                  value: disposalRequest.salvageValue == null ? null : <span className="num">{formatMoney(Number(disposalRequest.salvageValue), { unit: tCommon("baht") })}</span>,
                },
                { key: "approvedAt", label: t("approvedAt"), value: disposalRequest.approvedAt ? formatDateTime(disposalRequest.approvedAt) : null },
                { key: "source", label: t("source"), value: formatSource(disposalRequest.sourceType, disposalRequest.sourceId) },
              ]}
            />
```

(4) The execution facts `:273-281`. Replace:

```tsx
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Info label={t("executionDate")} value={formatDateTime(disposalRequest.executionDate)} />
                <Info label={t("executedBy")} value={disposalRequest.executedBy ? `${disposalRequest.executedBy.code} - ${disposalRequest.executedBy.fullNameTh}` : null} />
                <Info label={t("recipientName")} value={disposalRequest.recipientName} />
                <Info label={t("documentNo")} value={disposalRequest.documentNo} />
                <Info label={t("actualSaleValue")} value={disposalRequest.actualSaleValue == null ? null : formatCurrency(Number(disposalRequest.actualSaleValue))} />
                <Info label={t("actualSalvageValue")} value={disposalRequest.actualSalvageValue == null ? null : formatCurrency(Number(disposalRequest.actualSalvageValue))} />
                <Info label={t("completedAt")} value={formatDateTime(disposalRequest.completedAt)} />
              </div>
```

with:

```tsx
              <KeyValueList
                items={[
                  { key: "executionDate", label: t("executionDate"), value: disposalRequest.executionDate ? formatDateTime(disposalRequest.executionDate) : null },
                  {
                    key: "executedBy",
                    label: t("executedBy"),
                    value: disposalRequest.executedBy ? <><span className="tag">{disposalRequest.executedBy.code}</span> - {disposalRequest.executedBy.fullNameTh}</> : null,
                  },
                  { key: "recipientName", label: t("recipientName"), value: disposalRequest.recipientName },
                  { key: "documentNo", label: t("documentNo"), value: disposalRequest.documentNo },
                  {
                    key: "actualSaleValue",
                    label: t("actualSaleValue"),
                    value: disposalRequest.actualSaleValue == null ? null : <span className="num">{formatMoney(Number(disposalRequest.actualSaleValue), { unit: tCommon("baht") })}</span>,
                  },
                  {
                    key: "actualSalvageValue",
                    label: t("actualSalvageValue"),
                    value: disposalRequest.actualSalvageValue == null ? null : <span className="num">{formatMoney(Number(disposalRequest.actualSalvageValue), { unit: tCommon("baht") })}</span>,
                  },
                  { key: "completedAt", label: t("completedAt"), value: disposalRequest.completedAt ? formatDateTime(disposalRequest.completedAt) : null },
                ]}
              />
```

(5) The historical-evidence facts `:294-297`. Replace:

```tsx
                  <div className="mt-4 grid grid-cols-1 gap-4 border-t border-warning-border pt-4 md:grid-cols-2">
                    <Info label={t("historicalEvidenceGrantedBy")} value={evidenceExceptionGrantorLabel} />
                    <Info label={t("historicalEvidenceGrantedAt")} value={formatDateTime(disposalRequest.evidenceExceptionGrantedAt)} />
                  </div>
```

with:

```tsx
                  <KeyValueList
                    className="mt-4 border-t border-warning-border pt-4"
                    items={[
                      { key: "grantedBy", label: t("historicalEvidenceGrantedBy"), value: evidenceExceptionGrantorLabel },
                      {
                        key: "grantedAt",
                        label: t("historicalEvidenceGrantedAt"),
                        value: disposalRequest.evidenceExceptionGrantedAt ? formatDateTime(disposalRequest.evidenceExceptionGrantedAt) : null,
                      },
                    ]}
                  />
```

(6) A history step's from/to `:329-332`. Replace:

```tsx
                      <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-muted-foreground md:grid-cols-2">
                        <Info label={tAsset("fromValue")} value={movementLabels.get(movement.id)?.from} />
                        <Info label={tAsset("toValue")} value={movementLabels.get(movement.id)?.to} />
                      </div>
```

with:

```tsx
                      <KeyValueList
                        className="mt-2"
                        items={[
                          { key: "from", label: tAsset("fromValue"), value: movementLabels.get(movement.id)?.from },
                          { key: "to", label: tAsset("toValue"), value: movementLabels.get(movement.id)?.to },
                        ]}
                      />
```

(7) The asset panel `:348-361` (the "เปิดรายละเอียดทรัพย์สิน" link below stays). Replace:

```tsx
            <div className="space-y-4">
              <Info label={t("asset")} value={`${disposalRequest.asset.assetTag} - ${disposalRequest.asset.name}`} />
              <Info label={tAsset("serialNumber")} value={disposalRequest.asset.serialNumber} />
              <Info label={tAsset("fixedAssetCode")} value={disposalRequest.asset.fixedAssetCode} />
              <Info label={tAsset("category")} value={`${disposalRequest.asset.category.code} - ${disposalRequest.asset.category.name}`} />
              <Info label={tAsset("brand")} value={disposalRequest.asset.brand?.name} />
              <Info label={tAsset("model")} value={disposalRequest.asset.model?.name} />
              <Info label={tAsset("company")} value={`${disposalRequest.asset.company.code} - ${disposalRequest.asset.company.nameTh}`} />
              <Info label={tAsset("branch")} value={`${disposalRequest.asset.branch.code} - ${disposalRequest.asset.branch.name}`} />
              <Info label={t("currentLocation")} value={`${disposalRequest.asset.currentLocation.code} - ${disposalRequest.asset.currentLocation.name}`} />
              <Info label={t("custodian")} value={disposalRequest.asset.custodian ? `${disposalRequest.asset.custodian.code} - ${disposalRequest.asset.custodian.fullNameTh}` : null} />
              <Info label={t("currentStatus")} value={disposalRequest.asset.status.nameTh} />
              <Info label={t("currentCondition")} value={disposalRequest.asset.condition.nameTh} />
              <Info label={tAsset("purchasePrice")} value={disposalRequest.asset.purchasePrice == null ? null : formatCurrency(Number(disposalRequest.asset.purchasePrice))} />
```

with:

```tsx
            <div className="space-y-4">
              <KeyValueList
                items={[
                  { key: "asset", label: t("asset"), value: <><span className="tag">{disposalRequest.asset.assetTag}</span> - {disposalRequest.asset.name}</> },
                  { key: "serialNumber", label: tAsset("serialNumber"), value: disposalRequest.asset.serialNumber },
                  { key: "fixedAssetCode", label: tAsset("fixedAssetCode"), value: disposalRequest.asset.fixedAssetCode },
                  { key: "category", label: tAsset("category"), value: <><span className="tag">{disposalRequest.asset.category.code}</span> - {disposalRequest.asset.category.name}</> },
                  { key: "brand", label: tAsset("brand"), value: disposalRequest.asset.brand?.name },
                  { key: "model", label: tAsset("model"), value: disposalRequest.asset.model?.name },
                  { key: "company", label: tAsset("company"), value: <><span className="tag">{disposalRequest.asset.company.code}</span> - {disposalRequest.asset.company.nameTh}</> },
                  { key: "branch", label: tAsset("branch"), value: <><span className="tag">{disposalRequest.asset.branch.code}</span> - {disposalRequest.asset.branch.name}</> },
                  {
                    key: "currentLocation",
                    label: t("currentLocation"),
                    value: <><span className="tag">{disposalRequest.asset.currentLocation.code}</span> - {disposalRequest.asset.currentLocation.name}</>,
                  },
                  {
                    key: "custodian",
                    label: t("custodian"),
                    value: disposalRequest.asset.custodian ? <><span className="tag">{disposalRequest.asset.custodian.code}</span> - {disposalRequest.asset.custodian.fullNameTh}</> : null,
                    nilLabel: tAsset("noCustodian"),
                  },
                  { key: "currentStatus", label: t("currentStatus"), value: disposalRequest.asset.status.nameTh },
                  { key: "currentCondition", label: t("currentCondition"), value: disposalRequest.asset.condition.nameTh },
                  {
                    key: "purchasePrice",
                    label: tAsset("purchasePrice"),
                    value: disposalRequest.asset.purchasePrice == null ? null : <span className="num">{formatMoney(Number(disposalRequest.asset.purchasePrice), { unit: tCommon("baht") })}</span>,
                  },
                ]}
              />
```

(8) `formatSource` `:379-382`. Replace:

```tsx
function formatSource(sourceType?: string | null, sourceId?: string | null) {
  if (!sourceType && !sourceId) return "-"
  return [sourceType, sourceId].filter(Boolean).join(" / ")
}
```

with:

```tsx
function formatSource(sourceType?: string | null, sourceId?: string | null) {
  if (!sourceType && !sourceId) return null
  return [sourceType, sourceId].filter(Boolean).join(" / ")
}
```

(9) `Info` and `TextBlock` `:427-443` (`Info` has no caller left; the closing lines of `TextBlock` at `:444-445` stay). Replace:

```tsx
function Info({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value || "-"}</div>
    </div>
  )
}

function TextBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-foreground">{label}</div>
      <div className="min-h-24 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
        {value ? <p className="whitespace-pre-wrap">{value}</p> : "-"}
      </div>
    </div>
```

with:

```tsx
function TextBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-foreground">{label}</div>
      <div className="min-h-24 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
        {value ? <p className="whitespace-pre-wrap">{value}</p> : <Nil />}
      </div>
    </div>
```

Check: `grep -nE 'ArrowLeft|"-"|formatCurrency|<h1|<Breadcrumbs|function Info' "src/app/[locale]/(dashboard)/disposal/[id]/page.tsx"` prints nothing (exit 1); `grep -n 'className="space-y-6 pb-36 md:pb-0"\|<DisposalWorkflowStepper\|<DisposalMobileActionBar' …` prints `174:`, `199:` and `216:`.

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/disposal-detail-workspace.test.ts tests/operational-return-navigation.test.ts tests/breadcrumbs-ui.test.ts tests/disposal-route-structure.test.ts tests/disposal-evidence-exception.test.ts tests/mobile-field-navigation.test.ts tests/list-primitives-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `tests 152 · pass 152 · fail 0` (disposal-detail-workspace 10 · operational-return-navigation 10 · breadcrumbs-ui 4 · disposal-route-structure 18 · disposal-evidence-exception 14 · mobile-field-navigation 7 · list-primitives-ui 19 · list-frame-guards 21 · visual-foundation-guards 26 · form-migration-guards 23).

Run: `node <temp>/p2b1-precheck.mjs --file "D/disposal/[id]/page.tsx"`
Expected (exit 0):
```
file    src/app/[locale]/(dashboard)/disposal/[id]/page.tsx (CRLF) · in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LH1        0       0     0     1
LB1        0       0     0     1
LP1        1       1     1     1
LV2        0       0     0     2
LV3        0       0     0     5
LK1        0       0     0     1
args    LP1=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b4-tw-probe.mjs "src/app/[locale]/(dashboard)/disposal/[id]/page.tsx"`
Expected: `checked 90 classes, missing 0` (exit 0). No class is new to `src`.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `tests 1955 · pass 1954 · fail 0 · skipped 1` (one test more than after Task 3; Tasks 1–4 add four).
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, no new warning; `npx eslint "src/app/[locale]/(dashboard)/disposal/[id]/page.tsx" tests/disposal-detail-workspace.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 3 files: the page 129 insertions and 89 deletions, `tests/disposal-detail-workspace.test.ts` 17 and 1, `tests/list-frame-guards.test.ts` 1 and 5 (the `MIGRATED_LIST_FILES` line in; the LH1, LB1, LV2, LV3 and LK1 rows out; the LP1 row stays). CRLF counts: the page `485 485`, the test `117 117`.

- [ ] **Step 8: The guard state after Tasks 1–4**

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected (exit 0; the header lines first, with `MIGRATED_LIST_FILES 68 files`):
```
ok      R7  TABLE_HEADER_FILLS  15 in 10 rows · live  15 in 10 files · over 0 · slack 0
ok      LH1 BUDGETS.LH1         21 in 21 rows · live  21 in 21 files · over 0 · slack 0
ok      LH2 BUDGETS.LH2          5 in  4 rows · live   5 in  4 files · over 0 · slack 0
ok      LB1 BUDGETS.LB1         10 in 10 rows · live  10 in 10 files · over 0 · slack 0
ok      LP1 BUDGETS.LP1          7 in  7 rows · live   7 in  7 files · over 0 · slack 0
ok      LF1 BUDGETS.LF1          1 in  1 rows · live   1 in  1 files · over 0 · slack 0
ok      LT1 BUDGETS.LT1         24 in  8 rows · live  24 in  8 files · over 0 · slack 0
ok      LT2 BUDGETS.LT2          1 in  1 rows · live   1 in  1 files · over 0 · slack 0
ok      LT3 BUDGETS.LT3          2 in  1 rows · live   2 in  1 files · over 0 · slack 0
ok      LT4 BUDGETS.LT4          1 in  1 rows · live   1 in  1 files · over 0 · slack 0
ok      LT5 BUDGETS.LT5          2 in  1 rows · live   2 in  1 files · over 0 · slack 0
ok      LV1 BUDGETS.LV1         19 in  7 rows · live  19 in  7 files · over 0 · slack 0
ok      LV2 BUDGETS.LV2         82 in 27 rows · live  82 in 27 files · over 0 · slack 0
ok      LV3 BUDGETS.LV3         22 in  6 rows · live  22 in  6 files · over 0 · slack 0
ok      LS1 BUDGETS.LS1         16 in 14 rows · live  16 in 14 files · over 0 · slack 0
ok      LS2 BUDGETS.LS2         20 in  6 rows · live  20 in  6 files · over 0 · slack 0
ok      LK1 BUDGETS.LK1          4 in  4 rows · live   4 in  4 files · over 0 · slack 0
ok      LN1 BUDGETS.LN1          4 in  3 rows · live   4 in  3 files · over 0 · slack 0
ok      LN2 BUDGETS.LN2          7 in  7 rows · live   7 in  7 files · over 0 · slack 0
ok      LR1 BUDGETS.LR1          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
budgets hold: no live count is over its row
```
The LB1 `0 → 1` row is filled (no slack line any more). What Tasks 5–8 still take to reach spec §10.4 table C column 2B-4: R7 15 → 11 · LH1 21 → 18 · LB1 10 → 7 · LP1 7 → 4 · LT1 24 → 23 · LV1 19 → 15 · LV2 82 → 73 · LV3 22 → 16 · LS1 16 → 14 · LS2 20 → 15 · LK1 4 → 1 · LN2 7 → 5; LN1 4, LT5 2, LH2 5, LF1 1, LT2 1, LT3 2, LT4 1 and LR1 0 are already there.

- [ ] **Step 9: Commit**

```bash
git add "src/app/[locale]/(dashboard)/disposal/[id]/page.tsx" tests/disposal-detail-workspace.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): disposal request page on PageHeader with the asset name and a back button on phones, facts on KeyValueList (2B-4 task 4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 11, spec §8.8 row `/th/disposal/<id>`):** at 1440 and 375 with the request of Task 0 Step 7, opened from a filtered queue: the asset name is the h1 and the meta row (request code, status badge, asset code) shows at both widths; at 375 the "กลับ" icon button is at the top and lands on the filtered queue, and the bottom bar still offers the asset, print, history and the next step; from md "กลับ", print and the next step sit in the header and the next step opens its dialog (cancel it); the stepper is right under the header as before; facts are label rows with "บาท"; an empty remark or source shows "—"; the bottom bar covers no content and nothing scrolls sideways at 375; at 768–1023 the header group shows and the page bar is gone (both switch at md).

---

### Task 5: `D/master-data/employees/[id]/page.tsx` on `PageHeader`, `StatStrip`, `KeyValueList` and three `DataTable`s, with the status tone fix (§5.10 #7), plus the precheck script of Tasks 5–10

Spec §8.8 row 5, §4.4.5 row `employees/[id]`, §4.5.2 #28, §4.6.3, §5.5 row 2, §5.10 #7, §4.3.3 rules 3 and 6, §10.4 table C column 2B-4, rulings R-n, R-p and controller rulings (a), (b), (e), (f) and (g). One file, one commit. The page is CRLF: exact-string replacements only. This task also saves the precheck script that Tasks 6–10 reuse.

Rulings this task applies:
- **§4.4.5, §4.3.3 rules 3 and 6, I1:** the hand-written title block (`:255-286`) becomes `PageHeader`: the same two crumbs through `breadcrumbs` (the trail still ends on the code: `tests/breadcrumbs-ui.test.ts:43` reads both forms, R-i, and `:56` expects `employee.code` last), `title={employee.fullNameTh}` (the record has a name, so the h1 is the name), `meta` = the code in `tag` → the position → the e-mail, one fact per element with no "/" between them, and `t("noContactDetail")` when the person has neither. `back={<PageBackLink href={returnToHref} label={tCommon("back")} />}` replaces the `h-10` link (40px on phones, under 44, §4.5.2 #28); "แก้ไข" becomes `Link` + `buttonVariants({ size: "md" })` with `Edit`. LH1, LB1 1 → 0.
- **§4.6.3, ruling (g):** the root `space-y-6 pb-24 md:pb-0` becomes `space-y-6`. The page is in navigation mode (`tests/mobile-field-navigation.test.ts:31`), so the shell already leaves room for the bottom bar (`c/layout/dashboard-shell.tsx:128` `pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:pb-0`); the page's own `pb-24` doubled it. LP1 1 → 0.
- **§5.5, R-d:** the five `SummaryTile` boxes become one `StatStrip` (`formatCount`): the first cell stays a link to the employee's assets (`hrefs.assets`), the help line is each cell's foot, and a count above 0 that needs follow-up sets `attention` (the amber foot line with its icon) instead of the amber border. LS1, LV1 1 → 0.
- **§10.4 table C row LK1:** `Info` (`:598`) goes: the seven profile facts become one `KeyValueList` (label column 120px, one column below 640px). Codes are `tag` (R-p); a blank position, e-mail or manager shows `Nil` through `KeyValueList`; the employment status badge is a value. LK1 1 → 0.
- **§5.5, I3:** the three tables become `DataTable framed={false}` (the section is the frame), each with `caption` = its section title and `scrollHint={tCommon("tableScrollHint")}`; the heads are `DataTableHead` (white, 13/500, no capitals); rows are plain `DataTableRow`s that keep their links in the cells (no row click, as today). The file-local `ColumnHeader` (`:607`, the name of a shared helper, with `uppercase`) goes. R7 3 → 0, LT1 1 → 0, LN2 1 → 0.
- **§5.10 #7:** the status and condition badges of the current assets take `tone={getAssetStateTone(asset.status.name)}` / `condition.name` (as `D/my-assets/[id]/page.tsx` does); the query adds `name: true` to both selects (`:120-121`). Before, every status was blue and every condition grey.
- **R-n, §5.5 ("`"-"` 6 จุด"):** the six dashes become `Nil`: the document number, the handover and receive persons (`orNil`), the subordinate's position, and the role cell (`formatRoleLabels` returns `null`, the cell `orNil(…)`; its `return "-"` is the sixth, which LV2 does not count). LV2 5 → 0.
- **Addition (same cells):** an empty "กำหนดคืน" or "วันที่รับคืน" shows `Nil` instead of the "-" that `formatDate` prints for no date, so the table has one empty mark. `formatDate` itself (`src/lib/utils.ts`) does not change (R-n keeps `src/lib`).
- **§5.5:** "ดูทรัพย์สินทั้งหมดของพนักงานนี้" (`h-9` hand-written, `:354`) becomes `buttonVariants({ variant: "outline", size: "md" })`. Codes in the three tables are `tag`.
- **Ruling (f):** 2B does not touch the page again, so it joins `MIGRATED_LIST_FILES` (every counter 0).
- **Ruling (b):** the page's R7 row goes from VFG `TABLE_HEADER_FILLS`; no other VFG line changes.
- **Not changed:** the queries other than the two `name: true`, `buildEmployeeDetail*`, the follow-up and subordinate panels, `MiniList` (the audit and disposal lists), `SectionHeading`, `formatAuditItemStatus` / `formatAuditItemOutcome` (`tests/audit-item-status-labels.test.ts:57-63`).

What users will see on `/th/master-data/employees/<id>`:
- The title is the person's name at weight 600; under it the code in monospace, then the position and the e-mail. On phones "กลับ" is a 44px arrow button and "แก้ไข" a 44px button under the title; from 768px both sit right of the title at 36px.
- The five boxes are one strip without colored borders: two columns below 1024px (the fifth fills its row), one row from 1024px. "ทรัพย์สินปัจจุบัน" is still a link; a box that needs follow-up shows its help line in amber with an icon.
- The profile is label and value rows instead of a three-column grid with small capital labels; an empty value reads "—" ("ไม่มีข้อมูล" to a screen reader).
- The three tables have the white 13px header without capitals, about 46px rows, codes in monospace, and a scroll hint above a table only while it overflows. Status badges show the status's own color (green ready, amber repair …), not always blue.
- On phones there is no extra blank band above the bottom navigation.

Not in this task: the supplier page (Task 6) · `MiniList`, the follow-up boxes and the subordinate cards (2D) · docs (Task 12). Do not run a formatter.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx` (`i/lf w/crlf`; 12 exact replacements)
- Modify: `tests/list-pages-ui.test.ts` (`i/lf w/crlf`; one block appended with `p2b4-append.mjs`)
- Modify: `tests/list-frame-guards.test.ts`, `tests/visual-foundation-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only, never committed: `p2b4-t5-precheck.mjs` (Tasks 6–10 reuse it), `t05-pages-block.ts`

**Must keep passing without edits:**
- `tests/master-data-return-navigation.test.ts:75-84` (`searchParams: Promise<{ returnTo?: string | string[] }>`, `normalizeMasterDataReturnTo(locale, "employees", rawSearchParams.returnTo)`, `href={returnToHref}` (now inside `<PageBackLink`), `appendMasterDataReturnTo(hrefs.edit, returnToHref)`)
- `tests/breadcrumbs-ui.test.ts:37-70` (11 trails, 8 ending on a code; this page's trail ends `{ label: employee.code, code: true }, ]}`) · `tests/audit-item-status-labels.test.ts:57-63` · `tests/employee-detail.test.ts` · `tests/mobile-field-navigation.test.ts:13-36`
- `tests/visual-foundation-guards.test.ts:185-203` (`tag` strings carry no weight above 500 and no size) · `tests/list-primitives-ui.test.ts` · `tests/form-migration-guards.test.ts`

**Interfaces:**
- Consumes:
  - 2B-1: `PageHeader({ title: ReactNode, meta?: ReactNode, actions?: ReactNode, back?: ReactNode, breadcrumbs?: BreadcrumbItem[], compactOnMobile?: boolean, className?: string })` and `PageBackLink({ href: string, label: string, onClick?, className? })` from `@/components/ui/page-header` (server-safe; `back` renders before `actions`).
  - 2B-1: `StatStrip({ items: readonly StatStripItem[], className?: string })` with `StatStripItem = { key: string; label: string; value: string; unit?: string; foot?: ReactNode; footTitle?: string; href?: string; current?: boolean; scroll?: boolean; attention?: boolean }` from `@/components/ui/stat-strip`.
  - 2B-1: `KeyValueList({ items: readonly KeyValueItem[], className?: string })`, `KeyValueItem = { key?: string; label: ReactNode; value: ReactNode; nilLabel?: string }` from `@/components/ui/key-value-list` (a blank value shows `Nil`; `0` is a value).
  - 2B-1: `DataTable({ children, caption?: string, framed?: boolean (true), layout?, minWidth?, scrollHint?: string, footer?, className?, …<div> props })`, `DataTableHeader`, `DataTableBody`, `DataTableHead({ align?: "left" | "right", sort?, sticky?, hideLabel?, … })`, `DataTableRow`, `DataTableCell({ align?, numeric?: boolean, sticky?, className?, … })` from `@/components/ui/data-table` (server-safe).
  - 2A: `Nil({ label?, className? })`, `orNil(value: ReactNode, label?: string): ReactNode` from `@/components/ui/nil`; `formatCount(value: number): string` from `@/lib/display-format`; `buttonVariants({ variant?, size? })` from `@/components/ui/button-variants`; `getAssetStateTone(value?: string | null)` from `@/lib/design-system`.
  - Task 0: `<temp>/p2b1-precheck.mjs` (`--file`, `--budgets`), `<temp>/p2b-budget.mjs`. Task 1: `<temp>/p2b4-append.mjs <block file> <test file>` (keeps the test file's CRLF or LF; prints `appended <block> to <test> (CRLF)`), `<temp>/p2b4-tw-probe.mjs <file> …` (prints `checked N classes, missing M`; the counts below are this script's, and plan 2B-3's `p2b3-tw-probe.mjs` gives the same counts on the files of Tasks 5–9).
- Produces:
  - The page without `SummaryTile`, `Info`, `ColumnHeader`, `Breadcrumbs` and `ArrowLeft`; in `MIGRATED_LIST_FILES`; its rows gone from LFG `BUDGETS` and VFG `TABLE_HEADER_FILLS`.
  - The test `the employee page builds on PageHeader, StatStrip, KeyValueList and three DataTables, with no pb-24 of its own (spec 2B §5.5)` in `tests/list-pages-ui.test.ts`.
  - `<temp>/p2b4-t5-precheck.mjs <5|6|7|8|9|10>` (Tasks 6–10 run it in their Step 1).

| guard | `D/master-data/employees/[id]/page.tsx` before → after | plan total (budget) before → after |
|---|---|---|
| VFG R7 | 3 → – | 15 → 12 |
| LFG LH1 · LB1 · LP1 | 1 · 1 · 1 → – | 21 → 20 · 10 → 9 · 7 → 6 |
| LFG LT1 · LV1 · LV2 | 1 · 1 · 5 → – | 24 → 23 · 19 → 18 · 82 → 77 |
| LFG LS1 · LK1 · LN2 | 1 · 1 · 1 → – | 16 → 15 · 4 → 3 · 7 → 6 |
| `MIGRATED_LIST_FILES` | – → joins | +1 |

The "before" totals are the counts after Tasks 1–4 (ruling (a) per file); only this page's lines are this task's.

- [ ] **Step 1: Check what this task builds on (and save the precheck script)**

Save this script in your temp folder (never in the repo). Tasks 6–10 reuse it.

`p2b4-t5-precheck.mjs`:

```js
// p2b4-t5-precheck.mjs: run from the repo root before Task 5, 6, 7, 8, 9 or 10 of plan 2B-4.
// Usage: node p2b4-t5-precheck.mjs <5|6|7|8|9|10>. Reads only; writes nothing. Never commit this file.
// Confirms the shared parts these six tasks use (with the API the tasks quote) and the keys they read, that the earlier
// tasks of the group are in and this task's change is not, that each file this task edits still holds its c2bfbe2 text
// (a hash of its text with \r stripped; no other task of the plan and no file of 2C plan 4 edits these), and that the
// test text Task 7 replaces is there exactly once (Task 6 edits the same test file first).
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"

const task = Number(process.argv[2])
if (![5, 6, 7, 8, 9, 10].includes(task)) {
  console.error("usage: node p2b4-t5-precheck.mjs <5|6|7|8|9|10>")
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

const EMPLOYEE = `${D}master-data/employees/[id]/page.tsx`
const SUPPLIER = `${D}master-data/suppliers/[id]/page.tsx`
const DOCUMENTS = `${C}master-data/supplier-purchase-documents.tsx`
const MY_ASSET = `${D}my-assets/[id]/page.tsx`
const SKELETON = `${C}ui/page-skeleton.tsx`
const LOADING = [`${D}loading.tsx`, `${D}assets/loading.tsx`, `${D}assets/[id]/loading.tsx`, `${D}dashboard/loading.tsx`, `${D}reports/loading.tsx`]

// The files each task edits, with their CR-stripped text hash at c2bfbe2.
const UNCHANGED = {
  5: { [EMPLOYEE]: "a49c781b64ae76c8" },
  6: { [SUPPLIER]: "7b25daa599abfc15", "tests/supplier-detail-ui.test.ts": "ade41862c97dd187" },
  7: { [DOCUMENTS]: "31cba9a421cad592" },
  8: { [MY_ASSET]: "af04828046677bb4", "tests/mobile-field-navigation.test.ts": "9d3b36646de364ad" },
  9: { [SKELETON]: "85b86911c4c850aa", "tests/page-loading-skeleton.test.ts": "70e380c82ee8402f" },
  10: {
    [LOADING[0]]: "b51dfdc5363b4da1",
    [LOADING[1]]: "f45fb773d870650b",
    [LOADING[2]]: "50b6e255b0f48326",
    [LOADING[3]]: "48355b1e9e7e5505",
    [LOADING[4]]: "900951970ff79af4",
    "tests/loading-boundaries.test.ts": "66574f61d4aae935",
  },
}
// What each task leaves behind, so the next task can see it is in (and a task can see it has not run yet).
const DONE = {
  5: () => read(EMPLOYEE).includes("<StatStrip") && migrated(EMPLOYEE),
  6: () => read(SUPPLIER).includes("<StatStrip") && migrated(SUPPLIER),
  7: () => read(DOCUMENTS).includes("<DataTable") && migrated(DOCUMENTS),
  8: () => read(MY_ASSET).includes("<PageHeader") && migrated(MY_ASSET),
  9: () => !read(SKELETON).includes("max-w-7xl") && read(SKELETON).includes("function TabNavSkeleton("),
  10: () => LOADING.every(migrated),
}
// The keys the six tasks read, by namespace.
const KEYS = {
  common: ["back", "edit", "baht", "status", "tableScrollHint", "noValue"],
  employee: ["title", "noContactDetail", "detailCurrentAssets", "detailCurrentAssetsHelp", "detailOpenCheckouts", "detailOpenCheckoutsHelp", "detailOpenMaintenance", "detailOpenMaintenanceHelp", "detailPendingAudit", "detailPendingAuditHelp", "detailAttention", "detailAttentionHelp", "company", "branch", "department", "position", "email", "manager", "employmentStatus", "viewAllAssets", "handoverHistoryTitle", "maintenanceRelatedTitle"],
  supplier: ["title", "noContactDetail", "assets", "linkedAssetsHelp", "purchaseDocuments", "purchaseDocumentsHelp", "maintenanceTickets", "openMaintenanceCount", "totalPurchaseAmount", "fromPurchaseDocuments", "totalMaintenanceCost", "fromMaintenanceTickets", "contactPerson", "phone", "email", "address"],
  asset: ["purchaseDocumentAmountBaht"],
  myAssets: ["detailTitle", "detailHelp", "backToList", "category", "serialNumber", "location", "companyBranch", "updatedAt"],
}

const pageHeader = ui("page-header.tsx")
const dataTable = ui("data-table.tsx")
const statStrip = ui("stat-strip.tsx")
const checks = {
  "2B-1: PageHeader with breadcrumbs, meta, back and actions; PageBackLink with href and label":
    exports(`${C}ui/page-header.tsx`, ["PageHeader", "PageBackLink"]) &&
    /breadcrumbs\?: BreadcrumbItem\[\]/.test(pageHeader) && /back\?: ReactNode/.test(pageHeader) && /meta\?: ReactNode/.test(pageHeader) &&
    /compactOnMobile\?: boolean/.test(pageHeader) && /href: string\n[\s\S]*?label: string/.test(pageHeader),
  "2B-1: DataTable (framed, caption, scrollHint) and its parts, DataTableHead align, DataTableCell numeric":
    exports(`${C}ui/data-table.tsx`, ["DataTable", "DataTableHeader", "DataTableBody", "DataTableHead", "DataTableRow", "DataTableCell"]) &&
    /framed\?: boolean/.test(dataTable) && /caption\?: string/.test(dataTable) && /scrollHint\?: string/.test(dataTable) &&
    /align\?: "left" \| "right"/.test(dataTable) && /numeric\?: boolean/.test(dataTable),
  "2B-1: StatStrip with value, unit, foot, footTitle, href, attention and className":
    exports(`${C}ui/stat-strip.tsx`, ["StatStrip", "StatStripItem"]) &&
    ["value: string", "unit?: string", "foot?: React.ReactNode", "footTitle?: string", "href?: string", "attention?: boolean"].every((text) => statStrip.includes(text)) &&
    /\{ items, className \}: \{ items: readonly StatStripItem\[\]; className\?: string \}/.test(statStrip) &&
    statStrip.includes("max-lg:[&>:last-child:nth-child(odd)]:col-span-2"),
  "2B-1: KeyValueList with items and className": exports(`${C}ui/key-value-list.tsx`, ["KeyValueList", "KeyValueItem"]) && /\{ items, className \}: \{ items: readonly KeyValueItem\[\]; className\?: string \}/.test(ui("key-value-list.tsx")),
  "2A: Nil, orNil, formatCount, formatMoney, buttonVariants":
    exports(`${C}ui/nil.tsx`, ["Nil", "orNil"]) && exports("src/lib/display-format.ts", ["formatCount", "formatMoney"]) && exports(`${C}ui/button-variants.ts`, ["buttonVariants"]),
  "the keys the six tasks read exist in th and en": ["th", "en"].every((locale) => {
    const all = messages(locale)
    return Object.entries(KEYS).every(([namespace, keys]) => keys.every((key) => typeof all[namespace]?.[key] === "string"))
  }),
  ...Object.fromEntries([5, 6, 7, 8, 9].filter((number) => number < task).map((number) => [`Task ${number} is in`, DONE[number]()])),
  [`Task ${task} has not run yet`]: !DONE[task](),
  ...Object.fromEntries(Object.entries(UNCHANGED[task]).map(([path, expected]) => [`${path} is unchanged since c2bfbe2 (hash ${expected})`, hash(path) === expected])),
  ...(task === 7 ? { "tests/supplier-detail-ui.test.ts holds the line Task 7 replaces, once": once("tests/supplier-detail-ui.test.ts", "  assert.match(documents, /<table/)\n") } : {}),
}

let missing = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok     " : "MISSING"} ${name}`)
  if (!ok) missing += 1
}
for (const path of [...Object.keys(UNCHANGED[task]), ...(task === 7 ? ["tests/supplier-detail-ui.test.ts"] : [])]) {
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
Expected: `feat/ui-phase2b-plan4`

Run: `git status --short src tests messages` then `node <temp>/p2b4-t5-precheck.mjs 5`
Expected: `git status` prints nothing. The script prints (exit 0):
```
ok      2B-1: PageHeader with breadcrumbs, meta, back and actions; PageBackLink with href and label
ok      2B-1: DataTable (framed, caption, scrollHint) and its parts, DataTableHead align, DataTableCell numeric
ok      2B-1: StatStrip with value, unit, foot, footTitle, href, attention and className
ok      2B-1: KeyValueList with items and className
ok      2A: Nil, orNil, formatCount, formatMoney, buttonVariants
ok      the keys the six tasks read exist in th and en
ok      Task 5 has not run yet
ok      src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx is unchanged since c2bfbe2 (hash a49c781b64ae76c8)
info    src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx: CRLF
preconditions hold for Task 5
```
On any `MISSING` line, stop and report it. A `hash now` line means the file changed after c2bfbe2, so the old snippets below may not match: report it, do not guess.

Run: `node <temp>/p2b1-precheck.mjs --file "D/master-data/employees/[id]/page.tsx"`
Expected (after the `info`/`ok` header lines; exit 0):
```
file    src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
R7         3       3     0     3
LH1        1       1     0     1
LB1        1       1     0     1
LP1        1       1     0     1
LT1        1       1     0     1
LV1        1       1     0     1
LV2        5       5     0     5
LS1        1       1     0     1
LK1        1       1     0     1
LN2        1       1     0     1
args    R7=3:3 LH1=1:1 LB1=1:1 LP1=1:1 LT1=1:1 LV1=1:1 LV2=5:5 LS1=1:1 LK1=1:1 LN2=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol "src/app/[[]locale]/(dashboard)/master-data/employees/[[]id]/page.tsx" tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: `i/lf w/crlf` for all four. Keep them CRLF.

- [ ] **Step 2: Write the failing test (`tests/list-pages-ui.test.ts`, CRLF; it strips `\r` before matching, so its regexes may hold `\n`)**

Save this block as `<temp>/t05-pages-block.ts`:

```ts
// Plan 2B-4 Task 5 (spec 2B §4.4.5, §5.5, §4.6.3, bug §5.10 #7): the employee page on the page primitives. The shell
// already leaves room for the bottom navigation, so the page adds no pb-24 of its own.
test("the employee page builds on PageHeader, StatStrip, KeyValueList and three DataTables, with no pb-24 of its own (spec 2B §5.5)", () => {
  const source = read(`${D}master-data/employees/[id]/page.tsx`)
  for (const part of ["<PageHeader", "<PageBackLink", "<StatStrip", "<KeyValueList", "<DataTableHeader>", "<DataTableBody>", "<DataTableRow"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.equal(source.match(/<DataTable\b/g)?.length, 3, "the current assets, the handover history and the related repairs")
  assert.match(source, /return \(\n {4}<div className="space-y-6">\n {6}<PageHeader\n/)
  assert.doesNotMatch(source, /\bpb-24\b/)
  assert.match(source, /breadcrumbs=\{\[\n\s+\{ label: t\("title"\), href: returnToHref \},\n\s+\{ label: employee\.code, code: true \},\n\s+\]\}\n\s+title=\{employee\.fullNameTh\}/, "a record with a name: the h1 is the name, the code ends the trail (spec 2B §4.3.3 rule 6)")
  assert.match(source, /<span className="tag">\{employee\.code\}<\/span>/, "the code leads the meta row")
  assert.match(source, /back=\{<PageBackLink href=\{returnToHref\} label=\{tCommon\("back"\)\} \/>\}/)
  assert.match(source, /<Link href=\{editHref\} className=\{buttonVariants\(\{ size: "md" \}\)\}>/)
  assert.match(source, /status: \{ select: \{ name: true, nameTh: true, colorCode: true \} \}/)
  assert.match(source, /tone=\{getAssetStateTone\(asset\.status\.name\)\}/, "bug §5.10 #7: the status badge takes the tone of the status")
  assert.match(source, /tone=\{getAssetStateTone\(asset\.condition\.name\)\}/)
  assert.doesNotMatch(source, /tone="(?:info|muted)"/)
  assert.match(source, /<Link href=\{hrefs\.assets\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.doesNotMatch(source, /function (?:SummaryTile|Info|ColumnHeader)\b|<table\b|<th\b|toLocaleString\(|"-"/)
})
```

Run: `node <temp>/p2b4-append.mjs <temp>/t05-pages-block.ts tests/list-pages-ui.test.ts`
Expected: `appended <temp>/t05-pages-block.ts to tests/list-pages-ui.test.ts (CRLF)`

Run: `node --test tests/list-pages-ui.test.ts`
Expected: FAIL, `tests 31 · pass 30 · fail 1` (one test more than before this step; Tasks 1–4 append none here):
- `the employee page builds on PageHeader, StatStrip, KeyValueList and three DataTables, with no pb-24 of its own (spec 2B §5.5)`: `no <PageHeader`

- [ ] **Step 3: Lower the guard rows of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs "D/master-data/employees/[id]/page.tsx" R7=3:0 LH1=1:0 LB1=1:0 LP1=1:0 LT1=1:0 LV1=1:0 LV2=5:0 LS1=1:0 LK1=1:0 LN2=1:0 --migrated`
Expected (exit 0):
```
R7: 3 -> 0 (row deleted)
LH1: 1 -> 0 (row deleted)
LB1: 1 -> 0 (row deleted)
LP1: 1 -> 0 (row deleted)
LT1: 1 -> 0 (row deleted)
LV1: 1 -> 0 (row deleted)
LV2: 5 -> 0 (row deleted)
LS1: 1 -> 0 (row deleted)
LK1: 1 -> 0 (row deleted)
LN2: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx
```

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 36 · fail 11`. Each failure lists only `src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx` (`N > 0`, with the page's count before the code change):
- `LH1 page titles (<h1>) come from PageHeader` (`LH1: 21 in 21 files. …`, `: 1 > 0`) · `LB1 page back buttons go through PageBackLink, not a hand-placed ArrowLeft` (`10 in 10`, `1 > 0`) · `LP1 pages under the shell do not add pb-24 or pb-36 on top of the shell's bottom space` (`7 in 7`, `1 > 0`)
- `LT1 table headers have no solid muted or accent fill and no capitals` (`24 in 8`, `1 > 0`) · `LV1 numbers on screen go through formatCount or formatMoney, not a bare toLocaleString()` (`19 in 7`, `1 > 0`) · `LV2 empty values on screen are Nil or orNil, not a typed "-"` (`82 in 27`, `5 > 0`)
- `LS1 number tiles come from StatStrip, not a local tile function` (`16 in 14`, `1 > 0`) · `LK1 detail values come from KeyValueList, not a local Info or DetailItem helper` (`4 in 4`, `1 > 0`) · `LN2 no local function takes the name of a shared component` (`7 in 7`, `1 > 0`)
- `L0 a file 2B is done with keeps only what KEEP allows, and every row names a real file and a known guard`: the nine lines `LH1 …: 1 > 0` … `LN2 …: 1 > 0` of the page (now in `MIGRATED_LIST_FILES`)
- VFG `R7 interim: table-header fills wait for DataTable (2B), file by file`: `15 matches in 10 files; over budget:` and `src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx: 3 > 0`

(The totals are those of Task 4 Step 8; the page's own lines are what matter.)

- [ ] **Step 4: Move the page onto the primitives (`src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx`, CRLF)**

Twelve exact replacements, top to bottom. Make all twelve before you compile.

(1) Imports `:5-8`: `ArrowLeft` goes (the arrow is `PageBackLink`'s).

Replace `:5-8`:

```tsx
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
```

with:

```tsx
import {
  AlertTriangle,
  Boxes,
```

(2) Imports `:21`: the tone helper of bug §5.10 #7 and `formatCount`.

Replace `:21`:

```tsx
import { formatDate, formatDateTime } from "@/lib/utils"
```

with:

```tsx
import { formatDate, formatDateTime } from "@/lib/utils"
import { getAssetStateTone } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
```

(3) Imports `:26-28`: the primitives. `Breadcrumbs` goes (`PageHeader` renders the trail).

Replace `:26-28`:

```tsx
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { StatusBadge } from "@/components/ui/status-badge"
```

with:

```tsx
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil, orNil } from "@/components/ui/nil"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
```

(4) The current-asset query `:120-121` (bug §5.10 #7: the tone reads the status and condition names).

Replace `:120-121`:

```tsx
        status: { select: { nameTh: true, colorCode: true } },
        condition: { select: { nameTh: true, colorCode: true } },
```

with:

```tsx
        status: { select: { name: true, nameTh: true, colorCode: true } },
        condition: { select: { name: true, nameTh: true, colorCode: true } },
```

(5) The page root, the header and the five boxes `:253-294`.

Replace `:253-294`:

```tsx
  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2">
            <Breadcrumbs
              items={[
                { label: t("title"), href: returnToHref },
                { label: employee.code, code: true },
              ]}
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{employee.fullNameTh}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {employee.code} / {[employee.position, employee.email].filter(Boolean).join(" / ") || t("noContactDetail")}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href={returnToHref}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            {tCommon("back")}
          </Link>
          <Link
            href={editHref}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
          >
            <Edit className="h-4 w-4" />
            {tCommon("edit")}
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SummaryTile icon={<Boxes className="h-5 w-5" />} label={t("detailCurrentAssets")} value={summary.currentAssetCount} detail={t("detailCurrentAssetsHelp")} href={hrefs.assets} />
        <SummaryTile icon={<History className="h-5 w-5" />} label={t("detailOpenCheckouts")} value={summary.openCheckoutCount} detail={t("detailOpenCheckoutsHelp")} tone={summary.openCheckoutCount > 0 ? "warning" : "neutral"} />
        <SummaryTile icon={<Wrench className="h-5 w-5" />} label={t("detailOpenMaintenance")} value={summary.openMaintenanceCount} detail={t("detailOpenMaintenanceHelp")} tone={summary.openMaintenanceCount > 0 ? "warning" : "neutral"} />
        <SummaryTile icon={<ClipboardCheck className="h-5 w-5" />} label={t("detailPendingAudit")} value={summary.pendingAuditFindingCount} detail={t("detailPendingAuditHelp")} tone={summary.pendingAuditFindingCount > 0 ? "warning" : "neutral"} />
        <SummaryTile icon={<AlertTriangle className="h-5 w-5" />} label={t("detailAttention")} value={summary.attentionCount} detail={t("detailAttentionHelp")} tone={summary.attentionCount > 0 ? "warning" : "neutral"} />
      </div>
```

with:

```tsx
  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: t("title"), href: returnToHref },
          { label: employee.code, code: true },
        ]}
        title={employee.fullNameTh}
        meta={
          <>
            <span className="tag">{employee.code}</span>
            {employee.position ? <span>{employee.position}</span> : null}
            {employee.email ? <span>{employee.email}</span> : null}
            {employee.position || employee.email ? null : <span>{t("noContactDetail")}</span>}
          </>
        }
        back={<PageBackLink href={returnToHref} label={tCommon("back")} />}
        actions={
          <Link href={editHref} className={buttonVariants({ size: "md" })}>
            <Edit aria-hidden="true" />
            {tCommon("edit")}
          </Link>
        }
      />

      <StatStrip
        items={[
          { key: "currentAssets", label: t("detailCurrentAssets"), value: formatCount(summary.currentAssetCount), foot: t("detailCurrentAssetsHelp"), footTitle: t("detailCurrentAssetsHelp"), href: hrefs.assets },
          { key: "openCheckouts", label: t("detailOpenCheckouts"), value: formatCount(summary.openCheckoutCount), foot: t("detailOpenCheckoutsHelp"), footTitle: t("detailOpenCheckoutsHelp"), attention: summary.openCheckoutCount > 0 },
          { key: "openMaintenance", label: t("detailOpenMaintenance"), value: formatCount(summary.openMaintenanceCount), foot: t("detailOpenMaintenanceHelp"), footTitle: t("detailOpenMaintenanceHelp"), attention: summary.openMaintenanceCount > 0 },
          { key: "pendingAudit", label: t("detailPendingAudit"), value: formatCount(summary.pendingAuditFindingCount), foot: t("detailPendingAuditHelp"), footTitle: t("detailPendingAuditHelp"), attention: summary.pendingAuditFindingCount > 0 },
          { key: "attention", label: t("detailAttention"), value: formatCount(summary.attentionCount), foot: t("detailAttentionHelp"), footTitle: t("detailAttentionHelp"), attention: summary.attentionCount > 0 },
        ]}
      />
```

(6) The profile facts `:299-313`.

Replace `:299-313`:

```tsx
            <SectionHeading icon={<UserRound className="h-5 w-5 text-primary" />} title={t("detailProfileTitle")} subtitle={t("detailProfileHelp")} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Info label={t("company")} value={`${employee.company.code} - ${employee.company.nameTh}`} />
              <Info label={t("branch")} value={`${employee.branch.code} - ${employee.branch.name}`} />
              <Info label={t("department")} value={`${employee.department.code} - ${employee.department.name}`} />
              <Info label={t("position")} value={employee.position} />
              <Info label={t("email")} value={employee.email} />
              <Info label={t("manager")} value={employee.manager ? `${employee.manager.code} - ${employee.manager.fullNameTh}` : null} />
              <div>
                <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{t("employmentStatus")}</div>
                <div className="mt-1">
                  <StatusBadge label={t(`status_${employee.employmentStatus}`)} tone={employee.employmentStatus === "active" ? "success" : "warning"} />
                </div>
              </div>
            </div>
```

with:

```tsx
            <SectionHeading icon={<UserRound className="h-5 w-5 text-primary" />} title={t("detailProfileTitle")} subtitle={t("detailProfileHelp")} />
            <KeyValueList
              items={[
                { key: "company", label: t("company"), value: <><span className="tag">{employee.company.code}</span> - {employee.company.nameTh}</> },
                { key: "branch", label: t("branch"), value: <><span className="tag">{employee.branch.code}</span> - {employee.branch.name}</> },
                { key: "department", label: t("department"), value: <><span className="tag">{employee.department.code}</span> - {employee.department.name}</> },
                { key: "position", label: t("position"), value: employee.position },
                { key: "email", label: t("email"), value: employee.email },
                { key: "manager", label: t("manager"), value: employee.manager ? <><span className="tag">{employee.manager.code}</span> - {employee.manager.fullNameTh}</> : null },
                { key: "employmentStatus", label: t("employmentStatus"), value: <StatusBadge label={t(`status_${employee.employmentStatus}`)} tone={employee.employmentStatus === "active" ? "success" : "warning"} /> },
              ]}
            />
```

(7) The current assets table and its "view all" link `:319-358`.

Replace `:319-358`:

```tsx
              <ActionEmptyState icon={<Boxes className="h-6 w-6" />} title={t("emptyCurrentAssetsTitle")} description={t("emptyCurrentAssetsHelp")} />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <ColumnHeader>{t("assetTag")}</ColumnHeader>
                      <ColumnHeader>{t("assetName")}</ColumnHeader>
                      <ColumnHeader>{t("assetCategory")}</ColumnHeader>
                      <ColumnHeader>{t("assetLocation")}</ColumnHeader>
                      <ColumnHeader>{t("assetStatus")}</ColumnHeader>
                      <ColumnHeader>{t("assetCondition")}</ColumnHeader>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {currentAssets.map((asset) => (
                      <tr key={asset.id}>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                          <Link href={`/${locale}/assets/${asset.id}`} className="text-primary hover:underline">
                            {asset.assetTag}
                          </Link>
                        </td>
                        <td className="min-w-56 px-4 py-3 text-foreground">{asset.name}</td>
                        <td className="min-w-44 px-4 py-3 text-muted-foreground">{asset.category.code} - {asset.category.name}</td>
                        <td className="min-w-44 px-4 py-3 text-muted-foreground">{asset.currentLocation.code} - {asset.currentLocation.name}</td>
                        <td className="whitespace-nowrap px-4 py-3"><StatusBadge label={asset.status.nameTh} tone="info" /></td>
                        <td className="whitespace-nowrap px-4 py-3"><StatusBadge label={asset.condition.nameTh} tone="muted" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {currentAssetCount > 0 ? (
              <div className="mt-4">
                <Link href={hrefs.assets} className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent">
                  {t("viewAllAssets")}
                </Link>
              </div>
            ) : null}
```

with:

```tsx
              <ActionEmptyState icon={<Boxes className="h-6 w-6" />} title={t("emptyCurrentAssetsTitle")} description={t("emptyCurrentAssetsHelp")} />
            ) : (
              <DataTable framed={false} caption={t("detailCurrentAssets")} scrollHint={tCommon("tableScrollHint")}>
                <DataTableHeader>
                  <tr>
                    <DataTableHead>{t("assetTag")}</DataTableHead>
                    <DataTableHead>{t("assetName")}</DataTableHead>
                    <DataTableHead>{t("assetCategory")}</DataTableHead>
                    <DataTableHead>{t("assetLocation")}</DataTableHead>
                    <DataTableHead>{t("assetStatus")}</DataTableHead>
                    <DataTableHead>{t("assetCondition")}</DataTableHead>
                  </tr>
                </DataTableHeader>
                <DataTableBody>
                  {currentAssets.map((asset) => (
                    <DataTableRow key={asset.id}>
                      <DataTableCell className="whitespace-nowrap font-medium">
                        <Link href={`/${locale}/assets/${asset.id}`} className="text-primary hover:underline">
                          <span className="tag">{asset.assetTag}</span>
                        </Link>
                      </DataTableCell>
                      <DataTableCell className="min-w-56 text-foreground">{asset.name}</DataTableCell>
                      <DataTableCell className="min-w-44 text-muted-foreground"><span className="tag">{asset.category.code}</span> - {asset.category.name}</DataTableCell>
                      <DataTableCell className="min-w-44 text-muted-foreground"><span className="tag">{asset.currentLocation.code}</span> - {asset.currentLocation.name}</DataTableCell>
                      <DataTableCell className="whitespace-nowrap"><StatusBadge label={asset.status.nameTh} tone={getAssetStateTone(asset.status.name)} /></DataTableCell>
                      <DataTableCell className="whitespace-nowrap"><StatusBadge label={asset.condition.nameTh} tone={getAssetStateTone(asset.condition.name)} /></DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            )}
            {currentAssetCount > 0 ? (
              <div className="mt-4">
                <Link href={hrefs.assets} className={buttonVariants({ variant: "outline", size: "md" })}>
                  {t("viewAllAssets")}
                </Link>
              </div>
            ) : null}
```

(8) The handover history table `:364-402`.

Replace `:364-402`:

```tsx
              <ActionEmptyState icon={<History className="h-6 w-6" />} title={t("emptyHandoverTitle")} description={t("emptyHandoverHelp")} />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <ColumnHeader>{t("documentNo")}</ColumnHeader>
                      <ColumnHeader>{t("asset")}</ColumnHeader>
                      <ColumnHeader>{t("checkoutDate")}</ColumnHeader>
                      <ColumnHeader>{t("expectedReturnDate")}</ColumnHeader>
                      <ColumnHeader>{t("returnDate")}</ColumnHeader>
                      <ColumnHeader>{t("handoverBy")}</ColumnHeader>
                      <ColumnHeader>{t("receiveBy")}</ColumnHeader>
                      <ColumnHeader>{tCommon("status")}</ColumnHeader>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {checkoutHistory.map((checkout) => (
                      <tr key={checkout.id}>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{checkout.documentNo || "-"}</td>
                        <td className="min-w-56 px-4 py-3">
                          <Link href={`/${locale}/assets/${checkout.asset.id}`} className="text-primary hover:underline">
                            {checkout.asset.assetTag} - {checkout.asset.name}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(checkout.checkoutDate)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(checkout.expectedReturnDate)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(checkout.checkins[0]?.returnDate)}</td>
                        <td className="min-w-36 px-4 py-3 text-muted-foreground">{checkout.checkedOutBy || "-"}</td>
                        <td className="min-w-36 px-4 py-3 text-muted-foreground">{checkout.checkins[0]?.receiveBy || "-"}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <StatusBadge label={checkout.isReturned ? t("handoverReturned") : t("handoverOpen")} tone={checkout.isReturned ? "success" : "warning"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
```

with:

```tsx
              <ActionEmptyState icon={<History className="h-6 w-6" />} title={t("emptyHandoverTitle")} description={t("emptyHandoverHelp")} />
            ) : (
              <DataTable framed={false} caption={t("handoverHistoryTitle")} scrollHint={tCommon("tableScrollHint")}>
                <DataTableHeader>
                  <tr>
                    <DataTableHead>{t("documentNo")}</DataTableHead>
                    <DataTableHead>{t("asset")}</DataTableHead>
                    <DataTableHead>{t("checkoutDate")}</DataTableHead>
                    <DataTableHead>{t("expectedReturnDate")}</DataTableHead>
                    <DataTableHead>{t("returnDate")}</DataTableHead>
                    <DataTableHead>{t("handoverBy")}</DataTableHead>
                    <DataTableHead>{t("receiveBy")}</DataTableHead>
                    <DataTableHead>{tCommon("status")}</DataTableHead>
                  </tr>
                </DataTableHeader>
                <DataTableBody>
                  {checkoutHistory.map((checkout) => (
                    <DataTableRow key={checkout.id}>
                      <DataTableCell className="whitespace-nowrap font-medium text-foreground">{checkout.documentNo ? <span className="tag">{checkout.documentNo}</span> : <Nil />}</DataTableCell>
                      <DataTableCell className="min-w-56">
                        <Link href={`/${locale}/assets/${checkout.asset.id}`} className="text-primary hover:underline">
                          <span className="tag">{checkout.asset.assetTag}</span> - {checkout.asset.name}
                        </Link>
                      </DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatDate(checkout.checkoutDate)}</DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-muted-foreground">{checkout.expectedReturnDate ? formatDate(checkout.expectedReturnDate) : <Nil />}</DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-muted-foreground">{checkout.checkins[0]?.returnDate ? formatDate(checkout.checkins[0]?.returnDate) : <Nil />}</DataTableCell>
                      <DataTableCell className="min-w-36 text-muted-foreground">{orNil(checkout.checkedOutBy)}</DataTableCell>
                      <DataTableCell className="min-w-36 text-muted-foreground">{orNil(checkout.checkins[0]?.receiveBy)}</DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <StatusBadge label={checkout.isReturned ? t("handoverReturned") : t("handoverOpen")} tone={checkout.isReturned ? "success" : "warning"} />
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            )}
```

(9) The related repairs table `:408-446`.

Replace `:408-446`:

```tsx
              <ActionEmptyState icon={<Wrench className="h-6 w-6" />} title={t("emptyMaintenanceTitle")} description={t("emptyMaintenanceHelp")} />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <ColumnHeader>{tMaintenance("repairNo")}</ColumnHeader>
                      <ColumnHeader>{tMaintenance("asset")}</ColumnHeader>
                      <ColumnHeader>{t("employeeRole")}</ColumnHeader>
                      <ColumnHeader>{tMaintenance("reportedDate")}</ColumnHeader>
                      <ColumnHeader>{tMaintenance("problem")}</ColumnHeader>
                      <ColumnHeader>{tCommon("status")}</ColumnHeader>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {maintenanceTickets.map((ticket) => (
                      <tr key={ticket.id}>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                          <Link href={`/${locale}/maintenance/${ticket.id}`} className="text-primary hover:underline">
                            {ticket.repairNo}
                          </Link>
                        </td>
                        <td className="min-w-56 px-4 py-3">
                          <Link href={`/${locale}/assets/${ticket.asset.id}`} className="text-primary hover:underline">
                            {ticket.asset.assetTag} - {ticket.asset.name}
                          </Link>
                        </td>
                        <td className="min-w-44 px-4 py-3 text-muted-foreground">{formatRoleLabels(maintenanceRoleMap.get(ticket.id) ?? [], t)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(ticket.reportedDate)}</td>
                        <td className="min-w-56 px-4 py-3 text-muted-foreground"><span className="line-clamp-2">{ticket.problem}</span></td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <StatusBadge label={getMaintenanceStatusLabel(ticket.repairStatus, maintenanceStatusLabels)} tone={getMaintenanceStatusTone(ticket.repairStatus)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
```

with:

```tsx
              <ActionEmptyState icon={<Wrench className="h-6 w-6" />} title={t("emptyMaintenanceTitle")} description={t("emptyMaintenanceHelp")} />
            ) : (
              <DataTable framed={false} caption={t("maintenanceRelatedTitle")} scrollHint={tCommon("tableScrollHint")}>
                <DataTableHeader>
                  <tr>
                    <DataTableHead>{tMaintenance("repairNo")}</DataTableHead>
                    <DataTableHead>{tMaintenance("asset")}</DataTableHead>
                    <DataTableHead>{t("employeeRole")}</DataTableHead>
                    <DataTableHead>{tMaintenance("reportedDate")}</DataTableHead>
                    <DataTableHead>{tMaintenance("problem")}</DataTableHead>
                    <DataTableHead>{tCommon("status")}</DataTableHead>
                  </tr>
                </DataTableHeader>
                <DataTableBody>
                  {maintenanceTickets.map((ticket) => (
                    <DataTableRow key={ticket.id}>
                      <DataTableCell className="whitespace-nowrap font-medium">
                        <Link href={`/${locale}/maintenance/${ticket.id}`} className="text-primary hover:underline">
                          <span className="tag">{ticket.repairNo}</span>
                        </Link>
                      </DataTableCell>
                      <DataTableCell className="min-w-56">
                        <Link href={`/${locale}/assets/${ticket.asset.id}`} className="text-primary hover:underline">
                          <span className="tag">{ticket.asset.assetTag}</span> - {ticket.asset.name}
                        </Link>
                      </DataTableCell>
                      <DataTableCell className="min-w-44 text-muted-foreground">{orNil(formatRoleLabels(maintenanceRoleMap.get(ticket.id) ?? [], t))}</DataTableCell>
                      <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatDate(ticket.reportedDate)}</DataTableCell>
                      <DataTableCell className="min-w-56 text-muted-foreground"><span className="line-clamp-2">{ticket.problem}</span></DataTableCell>
                      <DataTableCell className="whitespace-nowrap">
                        <StatusBadge label={getMaintenanceStatusLabel(ticket.repairStatus, maintenanceStatusLabels)} tone={getMaintenanceStatusTone(ticket.repairStatus)} />
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            )}
```

(10) The subordinate's position `:476`.

Replace `:476`:

```tsx
                    <div className="mt-1 text-xs text-muted-foreground">{subordinate.position || "-"}</div>
```

with:

```tsx
                    <div className="mt-1 text-xs text-muted-foreground">{orNil(subordinate.position)}</div>
```

(11) The local helpers `:565-611`: `SummaryTile`, `Info` and `ColumnHeader` go; `SectionHeading` above and `MiniList` stay.

Replace `:565-611`:

```tsx
function SummaryTile({
  icon,
  label,
  value,
  detail,
  href,
  tone = "neutral",
}: {
  icon: React.ReactNode
  label: string
  value: number
  detail: string
  href?: string
  tone?: "neutral" | "warning"
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        <div className={tone === "warning" ? "text-warning" : "text-primary"}>{icon}</div>
      </div>
      <div className="mt-3 text-3xl font-bold text-foreground">{value.toLocaleString()}</div>
      <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
    </>
  )
  const className = `rounded-lg border bg-surface p-4 ${
    tone === "warning" ? "border-warning-border" : "border-border"
  } ${href ? "transition-colors hover:border-primary-border hover:bg-primary-soft" : ""}`

  if (href) return <Link href={href} className={className}>{content}</Link>
  return <div className={className}>{content}</div>
}

function Info({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value || "-"}</div>
    </div>
  )
}

function ColumnHeader({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{children}</th>
}

function MiniList({
```

with:

```tsx
function MiniList({
```

(12) `formatRoleLabels` `:651-654`: no role is `null`, so the cell shows `Nil`.

Replace `:651-654`:

```tsx
function formatRoleLabels(roles: string[], t: (key: string) => string) {
  if (roles.length === 0) return "-"
  return roles.map((role) => t(`maintenanceRole_${role}`)).join(" / ")
}
```

with:

```tsx
// null when the person has no role on the ticket: the cell shows Nil.
function formatRoleLabels(roles: string[], t: (key: string) => string) {
  if (roles.length === 0) return null
  return roles.map((role) => t(`maintenanceRole_${role}`)).join(" / ")
}
```

Check: `grep -nE 'ArrowLeft|<Breadcrumbs|<h1|<table|<thead|<th |pb-24|bg-muted/|toLocaleString\(|"-"|function (SummaryTile|Info|ColumnHeader)\b|tone="(info|muted)"' "src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx"` prints nothing (exit 1).

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/list-pages-ui.test.ts tests/master-data-return-navigation.test.ts tests/breadcrumbs-ui.test.ts tests/audit-item-status-labels.test.ts tests/employee-detail.test.ts tests/mobile-field-navigation.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-primitives-ui.test.ts`
Expected: PASS, `tests 147 · pass 147 · fail 0` (`list-pages-ui` 31 · `master-data-return-navigation` 4 · `breadcrumbs-ui` 4 · `audit-item-status-labels` 8 · `employee-detail` 4 · `mobile-field-navigation` 7 · `list-frame-guards` 21 · `visual-foundation-guards` 26 · `form-migration-guards` 23 · `list-primitives-ui` 19).

Run: `node <temp>/p2b1-precheck.mjs --file "D/master-data/employees/[id]/page.tsx"`
Expected (exit 0):
```
file    src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx (CRLF) · in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
R7         0       0     0     3
LH1        0       0     0     1
LB1        0       0     0     1
LP1        0       0     0     1
LT1        0       0     0     1
LV1        0       0     0     1
LV2        0       0     0     5
LS1        0       0     0     1
LK1        0       0     0     1
LN2        0       0     0     1
args    (no row holds this file)
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b4-tw-probe.mjs "src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx"`
Expected: `checked 53 classes, missing 0` (exit 0). No class is new to `src`.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `tests 1956 · pass 1955 · fail 0 · skipped 1` (one test more than after Task 4).
- `npx tsc --noEmit`: no errors (`name` is now in the status and condition selects, which `getAssetStateTone` reads).
- `npm run lint`: 0 errors and the 146 warnings under `.agents/`; `npx eslint "src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx" tests/list-pages-ui.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 4 files: the page 151 insertions and 207 deletions, `tests/list-pages-ui.test.ts` 22 insertions, `tests/list-frame-guards.test.ts` 1 insertion and 10 deletions (the `MIGRATED_LIST_FILES` line in; nine rows and the `// 2B-4` line of LT1 out, whose other row Task 1 removed), `tests/visual-foundation-guards.test.ts` 1 deletion. `node -e "const s=require('fs').readFileSync(process.argv[1],'utf8');console.log((s.match(/\r\n/g)||[]).length,(s.match(/\n/g)||[]).length)" "src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx"` prints `605 605` (CRLF throughout). A file that shows every line changed was normalized: restore its line endings before you commit.

- [ ] **Step 8: Commit**

```bash
git add "src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx" tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): employee page on PageHeader, StatStrip, KeyValueList and DataTable; status badges take their tone (2B-4 task 5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 11, spec §8.8 row 3 of the dev-check table):** at 1440, 768 and 375 with the Task 0 employee (assets, handovers, repairs): the crumbs, then the name at 600 and the code, position and e-mail in the meta row; Tab order back → แก้ไข; "กลับ" returns to the employee list page the user came from (open it from page 2 of `/th/master-data/employees` with a search); the strip is 2 × 2 + 1 below 1024 and one row from 1024, "ทรัพย์สินปัจจุบัน" opens the register filtered by the person; the profile list stacks below 640; the three tables have the white header, codes in monospace, a status badge in its own color, "—" in empty cells, and the scroll hint only at 375; at 375 nothing hides behind the bottom navigation and there is no extra band above it (compare with Task 0 Step 9). NVDA reads each table by its caption.

---

### Task 6: `D/master-data/suppliers/[id]/page.tsx` on `PageHeader`, `StatStrip` and `KeyValueList`; an empty price shows "—", not 0.00

Spec §8.8 row 6, §4.4.5 row `suppliers/[id]`, §4.5.2 #29, §4.6.3, §5.5 row 3, §5.7, §10.4 table A row 2B-4 (`tests/supplier-detail-ui.test.ts:21-23`) and table C column 2B-4, rulings R-n, R-p and controller rulings (a), (c), (e), (f) and (g). One file, one commit. The page and its test are CRLF: exact-string replacements only.

Rulings this task applies:
- **§4.4.5, §4.3.3 rules 3 and 6:** the title block (`:151-182`) becomes `PageHeader`: the two crumbs through `breadcrumbs`, `title={supplier.name}`, `meta` = the code in `tag` → contact person → phone → e-mail (each its own element, no "/"), or `t("noContactDetail")` when there is none; `back={<PageBackLink href={returnToHref} label={tCommon("back")} />}`; "แก้ไข" as `Link` + `buttonVariants({ size: "md" })` with `Edit`. LH1, LB1 1 → 0.
- **§4.6.3, ruling (g):** the root `space-y-6 pb-24 md:pb-0` → `space-y-6` (navigation mode, `tests/mobile-field-navigation.test.ts:32`). LP1 1 → 0.
- **§5.5, R-d (departure, see the next bullet):** the five local `MetricCard`s become `StatStrip`s: the three counts (assets, a link as before; purchase documents; repair jobs with "งานซ่อมค้างอยู่ N รายการ" as its foot and `attention` while jobs are open) in one strip, and the two money totals in a second strip (`formatMoney(…)` with `unit: tCommon("baht")`, so the cell reads "12,345.67 บาท"). The local `function MetricCard` goes (it took a shared name, LN2). LS1 1, LS2 5, LV1 1 → 0; LV3 loses the two `formatCurrency` of the totals.
- **Departure from §5.5 ("→ `StatStrip`", one strip):** two strips, and the money strip is one column below lg (`className="max-lg:grid-cols-1"`). A money value in the 28px metric size needs about 165px for "12,345.67 บาท" (Plex Sans figures about 0.6 em); a five-cell strip leaves about 104px a cell at 1024px (720 / 5 − 40) and a two-column strip about 138px at 375px (170 − 32), so any amount above 1,000 baht would be cut or run under the next cell. One money cell per row below lg leaves about 309px at 375px, and two cells from lg about 320px at 1024px. `tailwind-merge` keeps `max-lg:grid-cols-1` beside the strip's `grid-cols-2`, and Tailwind 4.2.4 emits it after `grid-cols-2`, so it wins below lg (checked against `src/app/globals.css`). The two strips sit in a `space-y-3` group. Cost if wrong: one class and one wrapper.
- **§5.5, §5.7, A/08:225 (the 0.00 bug):** an asset with no purchase price and a repair with no cost showed "฿0.00" (`formatCurrency(Number(x ?? 0))`, `:240`, `:289`). Now `x == null ? <Nil /> : formatMoney(Number(x), { unit: tCommon("baht") })`; the amounts sit outside a table, so they carry the unit (DS:515). LV3 4 → 0.
- **LK1:** `InfoRow` (`:358`) goes: the four profile facts are one `KeyValueList` (`Nil` for a blank value); the `Mail`/`Phone` icons go with it. LK1, LV2 1 → 0.
- **§5.7, ruling (c):** the purchase document money column must read "(บาท)" (spec §5.5 row 3, §5.7: "use the `*Baht` key 2C added if there is one"). 2C added `asset.purchaseDocumentAmountBaht` "ยอดรวม (บาท)" / "Total amount (THB)" for the purchase document amount (`c/assets/asset-form.tsx:1206`), so the page passes `totalAmount: tAsset("purchaseDocumentAmountBaht")` to `SupplierPurchaseDocuments`; no new key. Task 7 then drops the "฿" from the cells. Between the two commits the column reads "ยอดรวม (บาท)" over "฿1,500.00"; the branch is never deployed in between.
- **R-p:** the codes in the asset and repair links are `tag` (inside the link, on an inner span).
- **Ruling (f):** the page joins `MIGRATED_LIST_FILES`.
- **Not changed:** the queries, `buildSupplier*`, `SectionTitle` (its "ดูทั้งหมด" link is already 44px), the follow-up boxes (2D), the purchase document mapping (`totalAmount: Number(document.totalAmount ?? 0)` `:258`; open issue in the hand-off), `SupplierPurchaseDocuments` (Task 7).

What users will see on `/th/master-data/suppliers/<id>`:
- The supplier's name at 600, then the code in monospace, contact person, phone and e-mail; "กลับ" and "แก้ไข" as in Task 5.
- The five cards become two flat strips: the three counts (two columns on phones, the third filling its row; one row from 1024px), then the two money totals ("12,345.67 บาท"), one per row on phones and side by side from 1024px. No horizontal card scroller on phones any more.
- The profile is label and value rows without icons.
- An asset without a purchase price and a repair without a cost show "—" instead of "฿0.00"; other amounts read "1,500.00 บาท".
- The purchase document money column header reads "ยอดรวม (บาท)".

Not in this task: the purchase documents table (Task 7) · `SectionTitle` and the follow-up boxes · docs (Task 12). Do not run a formatter.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/master-data/suppliers/[id]/page.tsx` (`i/lf w/crlf`; 10 exact replacements)
- Modify: `tests/supplier-detail-ui.test.ts` (`i/lf w/crlf`; 1 exact replacement)
- Modify: `tests/list-pages-ui.test.ts` (`i/lf w/crlf`; one block appended with `p2b4-append.mjs`)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only: `t06-pages-block.ts`

**Must keep passing without edits:**
- `tests/supplier-detail-ui.test.ts:9-18` (the documents component; Task 7 edits `:15`), `:24` (`SupplierPurchaseDocuments`), `:27-31` (`min-h-11`, `focus-visible:ring-2` and `aria-hidden="true"` still hold: the asset and repair links and `SectionTitle`'s link keep them, `<Edit aria-hidden="true" />` and the follow-up icon carry the last), so §10.4 table A's conditional `:28-30` edit is not needed
- `tests/master-data-return-navigation.test.ts:75-84` · `tests/breadcrumbs-ui.test.ts:37-70` (`{ label: supplier.code, code: true }, ]}`) · `tests/mobile-field-navigation.test.ts:13-36` · `tests/supplier-route-lifecycle.test.ts`
- `tests/visual-foundation-guards.test.ts` · `tests/list-primitives-ui.test.ts` · `tests/form-migration-guards.test.ts`

**Interfaces:**
- Consumes: what Task 5 consumes, plus `formatMoney(value: number, options?: { unit?: string }): string` from `@/lib/display-format`; the key `asset.purchaseDocumentAmountBaht`; Task 5's `<temp>/p2b4-t5-precheck.mjs`.
- Produces: the page without `MetricCard`, `InfoRow`, `formatCurrency`, `Breadcrumbs` and `ArrowLeft`; in `MIGRATED_LIST_FILES`; `labels.totalAmount` = "ยอดรวม (บาท)" for Task 7; the test `the supplier page builds on PageHeader, StatStrip and KeyValueList, shows an empty price as Nil and has no pb-24 of its own (spec 2B §5.5)`.

| guard | `D/master-data/suppliers/[id]/page.tsx` before → after | plan total (budget) before → after |
|---|---|---|
| LFG LH1 · LB1 · LP1 | 1 · 1 · 1 → – | 20 → 19 · 9 → 8 · 6 → 5 |
| LFG LV1 · LV2 · LV3 | 1 · 1 · 4 → – | 18 → 17 · 77 → 76 · 22 → 18 |
| LFG LS1 · LS2 · LK1 · LN2 | 1 · 5 · 1 · 1 → – | 15 → 14 · 20 → 15 · 3 → 2 · 6 → 5 |
| `MIGRATED_LIST_FILES` | – → joins | +1 |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b4-t5-precheck.mjs 6`
Expected: `git status` prints nothing. The script prints (exit 0) the six `ok` lines of Task 5 Step 1 for the primitives and the keys, then:
```
ok      Task 5 is in
ok      Task 6 has not run yet
ok      src/app/[locale]/(dashboard)/master-data/suppliers/[id]/page.tsx is unchanged since c2bfbe2 (hash 7b25daa599abfc15)
ok      tests/supplier-detail-ui.test.ts is unchanged since c2bfbe2 (hash ade41862c97dd187)
info    src/app/[locale]/(dashboard)/master-data/suppliers/[id]/page.tsx: CRLF
info    tests/supplier-detail-ui.test.ts: CRLF
preconditions hold for Task 6
```

Run: `node <temp>/p2b1-precheck.mjs --file "D/master-data/suppliers/[id]/page.tsx"`
Expected (after the header lines; exit 0):
```
file    src/app/[locale]/(dashboard)/master-data/suppliers/[id]/page.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LH1        1       1     0     1
LB1        1       1     0     1
LP1        1       1     0     1
LV1        1       1     0     1
LV2        1       1     0     1
LV3        4       4     0     4
LS1        1       1     0     1
LS2        5       5     0     5
LK1        1       1     0     1
LN2        1       1     0     1
args    LH1=1:1 LB1=1:1 LP1=1:1 LV1=1:1 LV2=1:1 LV3=4:4 LS1=1:1 LS2=5:5 LK1=1:1 LN2=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol "src/app/[[]locale]/(dashboard)/master-data/suppliers/[[]id]/page.tsx" tests/supplier-detail-ui.test.ts tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf w/crlf` for all four.

- [ ] **Step 2: Write the failing tests**

(a) `tests/supplier-detail-ui.test.ts` (CRLF, read raw: no `\n` in a new regex). The pin of §10.4 table A (`:21-23`, inside the test `supplier detail uses a compact mobile metric strip`; `:24` stays).

Replace `:21-23`:

```ts
  assert.match(detail, /grid-flow-col/)
  assert.match(detail, /overflow-x-auto/)
  assert.match(detail, /md:grid-flow-row/)
```

with:

```ts
  // Spec 2B §5.5, §10.4 table A: the local MetricCard grid became StatStrip (two columns below lg, one row from lg).
  assert.match(detail, /<StatStrip\b/)
```

(b) `tests/list-pages-ui.test.ts` (CRLF; strips `\r`). Save this block as `<temp>/t06-pages-block.ts`:

```ts
// Plan 2B-4 Task 6 (spec 2B §4.4.5, §5.5, §5.7, §4.6.3): the supplier page on the page primitives. An empty price is
// Nil, not 0.00 (A/08:225); the counts and the two money totals are StatStrips; the purchase document money column
// reads "(บาท)" from the key 2C added (asset.purchaseDocumentAmountBaht).
test("the supplier page builds on PageHeader, StatStrip and KeyValueList, shows an empty price as Nil and has no pb-24 of its own (spec 2B §5.5)", () => {
  const source = read(`${D}master-data/suppliers/[id]/page.tsx`)
  for (const part of ["<PageHeader", "<PageBackLink", "<KeyValueList", "<SupplierPurchaseDocuments"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.equal(source.match(/<StatStrip\b/g)?.length, 2, "the counts, then the two money totals")
  assert.match(source, /<StatStrip\n\s+className="max-lg:grid-cols-1"/, "one money cell per row below lg, so an amount is never cut")
  assert.match(source, /value: formatMoney\(summary\.purchaseAmount\), unit: tCommon\("baht"\)/)
  assert.match(source, /value: formatMoney\(summary\.maintenanceCost\), unit: tCommon\("baht"\)/)
  assert.match(source, /return \(\n {4}<div className="space-y-6">\n {6}<PageHeader\n/)
  assert.doesNotMatch(source, /\bpb-24\b/)
  assert.match(source, /breadcrumbs=\{\[\n\s+\{ label: t\("title"\), href: returnToHref \},\n\s+\{ label: supplier\.code, code: true \},\n\s+\]\}\n\s+title=\{supplier\.name\}/)
  assert.match(source, /back=\{<PageBackLink href=\{returnToHref\} label=\{tCommon\("back"\)\} \/>\}/)
  assert.match(source, /<Link href=\{editHref\} className=\{buttonVariants\(\{ size: "md" \}\)\}>/)
  assert.match(source, /\{asset\.purchasePrice == null \? <Nil \/> : <span className="num">\{formatMoney\(Number\(asset\.purchasePrice\), \{ unit: tCommon\("baht"\) \}\)\}<\/span>\}/)
  assert.match(source, /\{ticket\.repairCost == null \? <Nil \/> : formatMoney\(Number\(ticket\.repairCost\), \{ unit: tCommon\("baht"\) \}\)\}/)
  assert.match(source, /totalAmount: tAsset\("purchaseDocumentAmountBaht"\),/)
  assert.doesNotMatch(source, /function (?:MetricCard|InfoRow)\b|<MetricCard\b|formatCurrency|\?\? 0\)\)|toLocaleString\(|"-"/)
})
```

Run: `node <temp>/p2b4-append.mjs <temp>/t06-pages-block.ts tests/list-pages-ui.test.ts`
Expected: `appended <temp>/t06-pages-block.ts to tests/list-pages-ui.test.ts (CRLF)`

Run: `node --test tests/supplier-detail-ui.test.ts tests/list-pages-ui.test.ts`
Expected: FAIL, `tests 35 · pass 33 · fail 2` (`supplier-detail-ui` 3 · `list-pages-ui` 32, one test more than before this step):
- `supplier detail uses a compact mobile metric strip`: the input did not match the regular expression `/<StatStrip\b/`
- `the supplier page builds on PageHeader, StatStrip and KeyValueList, shows an empty price as Nil and has no pb-24 of its own (spec 2B §5.5)`: `no <PageHeader`

- [ ] **Step 3: Lower the guard rows of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs "D/master-data/suppliers/[id]/page.tsx" LH1=1:0 LB1=1:0 LP1=1:0 LV1=1:0 LV2=1:0 LV3=4:0 LS1=1:0 LS2=5:0 LK1=1:0 LN2=1:0 --migrated`
Expected (exit 0):
```
LH1: 1 -> 0 (row deleted)
LB1: 1 -> 0 (row deleted)
LP1: 1 -> 0 (row deleted)
LV1: 1 -> 0 (row deleted)
LV2: 1 -> 0 (row deleted)
LV3: 4 -> 0 (row deleted)
LS1: 1 -> 0 (row deleted)
LS2: 5 -> 0 (row deleted)
LK1: 1 -> 0 (row deleted)
LN2: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/master-data/suppliers/[id]/page.tsx
```

Run: `node --test tests/list-frame-guards.test.ts`
Expected: FAIL, `tests 21 · pass 10 · fail 11`, each failure listing only the supplier page: LH1 (`LH1: 20 in 20 files`, `1 > 0`), LB1 (`9 in 9`), LP1 (`6 in 6`), LV1 (`18 in 6`), LV2 (`77 in 26`, `1 > 0`), LV3 (`22 in 6`, `4 > 0`), LS1 (`15 in 13`), LS2 (`20 in 6`, `5 > 0`), LK1 (`3 in 3`), LN2 (`6 in 6`), and `L0 …` with the ten lines of the page.

- [ ] **Step 4: Move the page onto the primitives (`src/app/[locale]/(dashboard)/master-data/suppliers/[id]/page.tsx`, CRLF)**

Ten exact replacements, top to bottom. Make all ten before you compile.

(1) Imports `:1-30`: `React`, `ArrowLeft`, the card icons, `formatCurrency` and `Breadcrumbs` go; the primitives, `formatCount` and `formatMoney` come.

Replace `:1-30`:

```tsx
import type React from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  ClipboardList,
  Edit,
  FileText,
  Mail,
  Phone,
  Wrench,
} from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import {
  buildSupplierDetailHrefs,
  buildSupplierDetailSummary,
  buildSupplierFollowUpItems,
  type SupplierFollowUpKey,
} from "@/lib/supplier-detail"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { StatusBadge } from "@/components/ui/status-badge"
import { SupplierPurchaseDocuments } from "@/components/master-data/supplier-purchase-documents"
import { getMaintenanceStatusLabel, getMaintenanceStatusTone, maintenanceStatuses } from "@/lib/maintenance-status"
import { appendMasterDataReturnTo, normalizeMasterDataReturnTo } from "@/lib/master-data-return-navigation"
```

with:

```tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, Edit } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import {
  buildSupplierDetailHrefs,
  buildSupplierDetailSummary,
  buildSupplierFollowUpItems,
  type SupplierFollowUpKey,
} from "@/lib/supplier-detail"
import { formatCount, formatMoney } from "@/lib/display-format"
import { formatDate } from "@/lib/utils"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil } from "@/components/ui/nil"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { SupplierPurchaseDocuments } from "@/components/master-data/supplier-purchase-documents"
import { getMaintenanceStatusLabel, getMaintenanceStatusTone, maintenanceStatuses } from "@/lib/maintenance-status"
import { appendMasterDataReturnTo, normalizeMasterDataReturnTo } from "@/lib/master-data-return-navigation"
```

(2) The translators `:44-45`: `asset` for the money column header.

Replace `:44-45`:

```tsx
  const tCommon = await getTranslations("common")
  const tMaintenance = await getTranslations("maintenancePage")
```

with:

```tsx
  const tCommon = await getTranslations("common")
  const tMaintenance = await getTranslations("maintenancePage")
  const tAsset = await getTranslations("asset")
```

(3) The page root, the header and the five cards `:149-190`.

Replace `:149-190`:

```tsx
  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2">
            <Breadcrumbs
              items={[
                { label: t("title"), href: returnToHref },
                { label: supplier.code, code: true },
              ]}
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{supplier.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {supplier.code} / {[supplier.contactPerson, supplier.phone, supplier.email].filter(Boolean).join(" / ") || t("noContactDetail")}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href={returnToHref}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            {tCommon("back")}
          </Link>
          <Link
            href={editHref}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Edit aria-hidden="true" className="h-4 w-4" />
            {tCommon("edit")}
          </Link>
        </div>
      </div>

      <div className="grid auto-cols-[minmax(230px,85%)] grid-flow-col gap-3 overflow-x-auto pb-2 md:grid-flow-row md:grid-cols-2 md:overflow-visible md:pb-0 xl:grid-cols-5">
        <MetricCard label={t("assets")} value={summary.assetCount} detail={t("linkedAssetsHelp")} href={hrefs.assets} icon={<Boxes aria-hidden="true" className="h-5 w-5 text-primary" />} />
        <MetricCard label={t("purchaseDocuments")} value={summary.purchaseDocumentCount} detail={t("purchaseDocumentsHelp")} icon={<FileText aria-hidden="true" className="h-5 w-5 text-primary" />} />
        <MetricCard label={t("maintenanceTickets")} value={summary.maintenanceTicketCount} detail={t("openMaintenanceCount", { count: summary.openMaintenanceTicketCount })} icon={<Wrench aria-hidden="true" className="h-5 w-5 text-primary" />} tone={summary.openMaintenanceTicketCount > 0 ? "warning" : "neutral"} />
        <MetricCard label={t("totalPurchaseAmount")} value={formatCurrency(summary.purchaseAmount)} detail={t("fromPurchaseDocuments")} icon={<ClipboardList aria-hidden="true" className="h-5 w-5 text-primary" />} />
        <MetricCard label={t("totalMaintenanceCost")} value={formatCurrency(summary.maintenanceCost)} detail={t("fromMaintenanceTickets")} icon={<Wrench aria-hidden="true" className="h-5 w-5 text-primary" />} />
      </div>
```

with:

```tsx
  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: t("title"), href: returnToHref },
          { label: supplier.code, code: true },
        ]}
        title={supplier.name}
        meta={
          <>
            <span className="tag">{supplier.code}</span>
            {supplier.contactPerson ? <span>{supplier.contactPerson}</span> : null}
            {supplier.phone ? <span>{supplier.phone}</span> : null}
            {supplier.email ? <span>{supplier.email}</span> : null}
            {supplier.contactPerson || supplier.phone || supplier.email ? null : <span>{t("noContactDetail")}</span>}
          </>
        }
        back={<PageBackLink href={returnToHref} label={tCommon("back")} />}
        actions={
          <Link href={editHref} className={buttonVariants({ size: "md" })}>
            <Edit aria-hidden="true" />
            {tCommon("edit")}
          </Link>
        }
      />

      {/* Counts in one strip; the two money totals in their own strip, one per row below lg, so an amount in the
          28px metric size is never cut (a five-cell strip leaves about 104px a cell at 1024px). */}
      <div className="space-y-3">
        <StatStrip
          items={[
            { key: "assets", label: t("assets"), value: formatCount(summary.assetCount), foot: t("linkedAssetsHelp"), footTitle: t("linkedAssetsHelp"), href: hrefs.assets },
            { key: "purchaseDocuments", label: t("purchaseDocuments"), value: formatCount(summary.purchaseDocumentCount), foot: t("purchaseDocumentsHelp"), footTitle: t("purchaseDocumentsHelp") },
            {
              key: "maintenanceTickets",
              label: t("maintenanceTickets"),
              value: formatCount(summary.maintenanceTicketCount),
              foot: t("openMaintenanceCount", { count: summary.openMaintenanceTicketCount }),
              footTitle: t("openMaintenanceCount", { count: summary.openMaintenanceTicketCount }),
              attention: summary.openMaintenanceTicketCount > 0,
            },
          ]}
        />
        <StatStrip
          className="max-lg:grid-cols-1"
          items={[
            { key: "purchaseAmount", label: t("totalPurchaseAmount"), value: formatMoney(summary.purchaseAmount), unit: tCommon("baht"), foot: t("fromPurchaseDocuments"), footTitle: t("fromPurchaseDocuments") },
            { key: "maintenanceCost", label: t("totalMaintenanceCost"), value: formatMoney(summary.maintenanceCost), unit: tCommon("baht"), foot: t("fromMaintenanceTickets"), footTitle: t("fromMaintenanceTickets") },
          ]}
        />
      </div>
```

(4) The profile facts `:196-201`.

Replace `:196-201`:

```tsx
            <dl className="mt-4 space-y-3 text-sm">
              <InfoRow label={t("contactPerson")} value={supplier.contactPerson} icon={<Mail aria-hidden="true" className="h-4 w-4" />} />
              <InfoRow label={t("phone")} value={supplier.phone} icon={<Phone aria-hidden="true" className="h-4 w-4" />} />
              <InfoRow label={t("email")} value={supplier.email} icon={<Mail aria-hidden="true" className="h-4 w-4" />} />
              <InfoRow label={t("address")} value={supplier.address} />
            </dl>
```

with:

```tsx
            <KeyValueList
              className="mt-4"
              items={[
                { key: "contactPerson", label: t("contactPerson"), value: supplier.contactPerson },
                { key: "phone", label: t("phone"), value: supplier.phone },
                { key: "email", label: t("email"), value: supplier.email },
                { key: "address", label: t("address"), value: supplier.address },
              ]}
            />
```

(5) An asset row: codes and the purchase price `:233-241`.

Replace `:233-241`:

```tsx
                      <span className="block font-medium text-primary">{asset.assetTag} - {asset.name}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {asset.category.code} - {asset.category.name} / {asset.currentLocation.code} - {asset.currentLocation.name}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                      <StatusBadge label={locale === "en" ? asset.status.name : asset.status.nameTh} status={asset.status.name} />
                      {formatCurrency(Number(asset.purchasePrice ?? 0))}
                    </span>
```

with:

```tsx
                      <span className="block font-medium text-primary"><span className="tag">{asset.assetTag}</span> - {asset.name}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        <span className="tag">{asset.category.code}</span> - {asset.category.name} / <span className="tag">{asset.currentLocation.code}</span> - {asset.currentLocation.name}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                      <StatusBadge label={locale === "en" ? asset.status.name : asset.status.nameTh} status={asset.status.name} />
                      {asset.purchasePrice == null ? <Nil /> : <span className="num">{formatMoney(Number(asset.purchasePrice), { unit: tCommon("baht") })}</span>}
                    </span>
```

(6) The money column header for Task 7 `:266`.

Replace `:266`:

```tsx
                totalAmount: t("totalAmount"),
```

with:

```tsx
                totalAmount: tAsset("purchaseDocumentAmountBaht"),
```

(7) A repair row's codes `:283`.

Replace `:283`:

```tsx
                        <div className="font-medium text-primary">{ticket.repairNo} - {ticket.asset.assetTag}</div>
```

with:

```tsx
                        <div className="font-medium text-primary"><span className="tag">{ticket.repairNo}</span> - <span className="tag">{ticket.asset.assetTag}</span></div>
```

(8) A repair row's cost `:289`.

Replace `:289`:

```tsx
                        <span className="text-xs text-muted-foreground">{formatCurrency(Number(ticket.repairCost ?? 0))}</span>
```

with:

```tsx
                        <span className="text-xs text-muted-foreground num">{ticket.repairCost == null ? <Nil /> : formatMoney(Number(ticket.repairCost), { unit: tCommon("baht") })}</span>
```

(9) The local `MetricCard` `:306-345` goes (`SectionTitle` stays).

Replace `:306-345`:

```tsx
function MetricCard({
  label,
  value,
  detail,
  icon,
  href,
  tone = "neutral",
}: {
  label: string
  value: number | string
  detail: string
  icon: React.ReactNode
  href?: string
  tone?: "neutral" | "warning"
}) {
  const content = (
    <div className={[
      "rounded-lg border bg-surface p-4 transition-colors",
      tone === "warning" ? "border-warning-border bg-warning-soft" : "border-border",
      href ? "hover:border-primary-border hover:bg-accent" : "",
    ].join(" ")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-bold text-foreground">{typeof value === "number" ? value.toLocaleString() : value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
        </div>
        <div className="rounded-md bg-primary-soft p-2">{icon}</div>
      </div>
    </div>
  )

  return href ? (
    <Link href={href} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      {content}
    </Link>
  ) : content
}

function SectionTitle({ title, actionHref, actionLabel }: { title: string; actionHref?: string; actionLabel?: string }) {
```

with:

```tsx
function SectionTitle({ title, actionHref, actionLabel }: { title: string; actionHref?: string; actionLabel?: string }) {
```

(10) The local `InfoRow` `:358-370` goes (`followUpText` stays).

Replace `:358-370`:

```tsx
function InfoRow({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      {icon ? <span className="mt-0.5 text-muted-foreground">{icon}</span> : null}
      <div className="min-w-0">
        <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 break-words text-foreground">{value || "-"}</dd>
      </div>
    </div>
  )
}

function followUpText(item: SupplierFollowUpKey, t: (key: string) => string) {
```

with:

```tsx
function followUpText(item: SupplierFollowUpKey, t: (key: string) => string) {
```

Check: `grep -nE 'ArrowLeft|<Breadcrumbs|<h1|pb-24|formatCurrency|toLocaleString\(|"-"|\?\? 0\)\)|function (MetricCard|InfoRow)\b|<MetricCard|Mail|Phone' "src/app/[locale]/(dashboard)/master-data/suppliers/[id]/page.tsx"` prints nothing (exit 1).

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/supplier-detail-ui.test.ts tests/list-pages-ui.test.ts tests/master-data-return-navigation.test.ts tests/breadcrumbs-ui.test.ts tests/mobile-field-navigation.test.ts tests/supplier-route-lifecycle.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-primitives-ui.test.ts`
Expected: PASS, `tests 141 · pass 141 · fail 0` (`supplier-detail-ui` 3 · `list-pages-ui` 32 · `master-data-return-navigation` 4 · `breadcrumbs-ui` 4 · `mobile-field-navigation` 7 · `supplier-route-lifecycle` 2 · `list-frame-guards` 21 · `visual-foundation-guards` 26 · `form-migration-guards` 23 · `list-primitives-ui` 19).

Run: `node <temp>/p2b1-precheck.mjs --file "D/master-data/suppliers/[id]/page.tsx"`
Expected: `· in MIGRATED_LIST_FILES`, every guard line `0       0     0` with its seed (LH1 1 · LB1 1 · LP1 1 · LV1 1 · LV2 1 · LV3 4 · LS1 1 · LS2 5 · LK1 1 · LN2 1), and `args    (no row holds this file)`.

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b4-tw-probe.mjs "src/app/[locale]/(dashboard)/master-data/suppliers/[id]/page.tsx"`
Expected: `checked 73 classes, missing 0` (exit 0). `max-lg:grid-cols-1` is the one class new to `src`; it compiles.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `tests 1957 · pass 1956 · fail 0 · skipped 1` (one test more than after Task 5; `supplier-detail-ui` changes an assertion in place).
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors and the 146 warnings under `.agents/`; `npx eslint "src/app/[locale]/(dashboard)/master-data/suppliers/[id]/page.tsx" tests/supplier-detail-ui.test.ts tests/list-pages-ui.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 4 files: the page 70 insertions and 114 deletions, `tests/list-frame-guards.test.ts` 1 and 13 (the `MIGRATED_LIST_FILES` line in; ten rows and the `// 2B-4` lines of LS1, LS2 and LN2 out, whose other rows Tasks 1 and 5 removed), `tests/list-pages-ui.test.ts` 23 insertions, `tests/supplier-detail-ui.test.ts` 2 and 3. The page stays CRLF (`330 330`), the supplier test too (`30 30`).

- [ ] **Step 8: Commit**

```bash
git add "src/app/[locale]/(dashboard)/master-data/suppliers/[id]/page.tsx" tests/supplier-detail-ui.test.ts tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): supplier page on PageHeader, StatStrip and KeyValueList; an empty price shows Nil, not 0.00 (2B-4 task 6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 11):** at 1440, 1024, 768 and 375 with the Task 0 supplier (purchase documents and one empty price): the header as in Task 5; the count strip 2 + 1 below 1024 and one row from 1024; the money strip one cell per row below 1024 and two from 1024, with the largest real total of the dev data showing in full at 1024 and 375 (no cut digit, nothing under the next cell; record the widest value and the cell width); the asset with no price and a repair with no cost show "—" (NVDA "ไม่มีข้อมูล"); other amounts "… บาท"; the purchase document header reads "ยอดรวม (บาท)"; at 375 nothing hides behind the bottom navigation and there is no extra band above it.

---

### Task 7: `c/master-data/supplier-purchase-documents.tsx` on `DataTable`, with `formatCount`, `formatMoney` and `Nil`

Spec §8.8 row 7, §5.5 row 3, §5.7, §5.8 row "มีรายการมือถือแยกอยู่แล้ว", R-n, R-p and controller rulings (a), (b), (e) and (f). One file, one commit. The file is CRLF: exact-string replacements only.

Rulings this task applies:
- **§5.5, I3:** the desktop table (`:40-67`) becomes `DataTable` (framed, as today's `rounded-md border` box was) with `data-supplier-documents-desktop` and `className="mt-4 hidden md:block"` passed through to its frame (`tests/supplier-detail-ui.test.ts:11-12` read them; `supplier-list-view.tsx` passes `data-supplier-desktop-table` the same way). Heads are `DataTableHead`; the linked-asset count and the money columns are right aligned in `numeric` cells (§5.7: a count column and its head align right together). Rows are plain `DataTableRow`s (no row target). No `caption` and no `scrollHint`: the component takes no words for them, the section's `h2` "เอกสารจัดซื้อ" names the area, and four columns from 768px do not overflow. R7 1 → 0.
- **§5.7:** the money cells hold the number only (`formatMoney(document.totalAmount)`): the unit is in the header, which the page passes as "ยอดรวม (บาท)" since Task 6. The phone card's fact uses the same label and value. LV3 2 → 0.
- **R-n:** the document references line shows `Nil` when there is neither a PO nor an invoice number (`orNil(documentReferences(document))`; it returns `""` then). LV2 2 → 0. `formatDate` keeps its "-" for no date (`src/lib`, R-n).
- **LV1:** `linkedAssets.toLocaleString()` → `formatCount(document.linkedAssets)` (th-TH digits on every machine). LV1 2 → 0.
- **R-p:** the document number is `tag` in the table and on the card.
- **§5.8:** the phone cards stay (`data-supplier-documents-mobile`, `<article>`, the `<dl>` with `DocumentFact`; `tests/supplier-detail-ui.test.ts:13-17`).
- **Ruling (b):** the file's R7 row goes from VFG; it was the last row of the `// 2B-4` group (Tasks 1 and 5 took the others), so `p2b-budget.mjs` drops that group line too.
- **Ruling (f):** the component joins `MIGRATED_LIST_FILES`.

What users will see on `/th/master-data/suppliers/<id>` ("เอกสารจัดซื้อ"):
- From 768px: a table with the white 13px header in a 12px frame; "ทรัพย์สินที่ผูก" and "ยอดรวม (บาท)" right aligned; amounts "1,500.00" without "฿"; document numbers in monospace; "—" when a document has no PO or invoice number.
- Phones: the same cards; the amount reads "1,500.00" under "ยอดรวม (บาท)"; counts and amounts in th-TH digits.

Not in this task: the page (Task 6) · a document without a total still reads "0.00" because the page maps a missing total to 0 (`totalAmount: Number(document.totalAmount ?? 0)`, open issue) · docs (Task 12). Do not run a formatter.

**Files:**
- Modify: `src/components/master-data/supplier-purchase-documents.tsx` (`i/lf w/crlf`; 3 exact replacements)
- Modify: `tests/supplier-detail-ui.test.ts` (`i/lf w/crlf`; 1 exact replacement)
- Modify: `tests/list-pages-ui.test.ts` (`i/lf w/crlf`; one block appended with `p2b4-append.mjs`)
- Modify: `tests/list-frame-guards.test.ts`, `tests/visual-foundation-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only: `t07-pages-block.ts`

**Must keep passing without edits:**
- `tests/supplier-detail-ui.test.ts:9-14`, `:16-17` (the adaptive desktop and phone parts), `:20-31` (as Task 6 left them)
- `tests/visual-foundation-guards.test.ts:185-203` · `tests/list-primitives-ui.test.ts` · `tests/form-migration-guards.test.ts`

**Interfaces:**
- Consumes: what Task 6 consumes; `SupplierPurchaseDocuments({ documents: SupplierPurchaseDocumentItem[], labels })` keeps its props (the page of Task 6 passes `labels.totalAmount` = "ยอดรวม (บาท)"; `totalAmount: number`).
- Produces: the component without `<table>`, `formatCurrency` and `toLocaleString()`; in `MIGRATED_LIST_FILES`; the test `supplier purchase documents: DataTable with right-aligned count and money columns, formatCount, formatMoney and Nil (spec 2B §5.5, §5.7)`.

| guard | `c/master-data/supplier-purchase-documents.tsx` before → after | plan total (budget) before → after |
|---|---|---|
| VFG R7 | 1 → – | 12 → 11 |
| LFG LV1 · LV2 · LV3 | 2 · 2 · 2 → – | 17 → 15 · 76 → 74 · 18 → 16 |
| `MIGRATED_LIST_FILES` | – → joins | +1 |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b4-t5-precheck.mjs 7`
Expected: `git status` prints nothing. The script prints (exit 0) the six `ok` lines for the primitives and the keys, then:
```
ok      Task 5 is in
ok      Task 6 is in
ok      Task 7 has not run yet
ok      src/components/master-data/supplier-purchase-documents.tsx is unchanged since c2bfbe2 (hash 31cba9a421cad592)
ok      tests/supplier-detail-ui.test.ts holds the line Task 7 replaces, once
info    src/components/master-data/supplier-purchase-documents.tsx: CRLF
info    tests/supplier-detail-ui.test.ts: CRLF
preconditions hold for Task 7
```

Run: `node <temp>/p2b1-precheck.mjs --file c/master-data/supplier-purchase-documents.tsx`
Expected (after the header lines; exit 0):
```
file    src/components/master-data/supplier-purchase-documents.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
R7         1       1     0     1
LV1        2       2     0     2
LV2        2       2     0     2
LV3        2       2     0     2
args    R7=1:1 LV1=2:2 LV2=2:2 LV3=2:2
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol src/components/master-data/supplier-purchase-documents.tsx tests/supplier-detail-ui.test.ts tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: `i/lf w/crlf` for all five.

- [ ] **Step 2: Write the failing tests**

(a) `tests/supplier-detail-ui.test.ts` (CRLF, read raw). The `<table` pin (`:15`, inside `purchase documents use adaptive desktop and mobile presentations`) follows the table onto `DataTable`. Not in §10.4 table A (which lists `:21-23` and `:28-30` only), but the table it reads moves in this task.

Replace `:15`:

```ts
  assert.match(documents, /<table/)
```

with:

```ts
  assert.match(documents, /<DataTable\b/)
```

(b) Save this block as `<temp>/t07-pages-block.ts`:

```ts
// Plan 2B-4 Task 7 (spec 2B §5.5, §5.7, R-p): a supplier's purchase documents on DataTable. The count and money columns
// are right aligned in num cells; the unit sits in the money header (the page passes "ยอดรวม (บาท)"), so the cells hold
// the number only.
test("supplier purchase documents: DataTable with right-aligned count and money columns, formatCount, formatMoney and Nil (spec 2B §5.5, §5.7)", () => {
  const source = read(`${C}master-data/supplier-purchase-documents.tsx`)
  assert.match(source, /<DataTable data-supplier-documents-desktop className="mt-4 hidden md:block">/)
  assert.match(source, /<DataTableHead align="right">\{labels\.linkedAssets\}<\/DataTableHead>/)
  assert.match(source, /<DataTableHead align="right">\{labels\.totalAmount\}<\/DataTableHead>/)
  assert.match(source, /<DataTableCell numeric className="text-muted-foreground">\{formatMoney\(document\.totalAmount\)\}<\/DataTableCell>/)
  assert.equal(source.match(/formatCount\(document\.linkedAssets\)/g)?.length, 2, "the table and the phone card")
  assert.equal(source.match(/orNil\(documentReferences\(document\)\)/g)?.length, 2, "the table and the phone card")
  assert.equal(source.match(/<span className="tag">\{document\.documentNo\}<\/span>/g)?.length, 2)
  assert.doesNotMatch(source, /<table\b|formatCurrency|toLocaleString\(|"-"/)
})
```

Run: `node <temp>/p2b4-append.mjs <temp>/t07-pages-block.ts tests/list-pages-ui.test.ts`
Expected: `appended <temp>/t07-pages-block.ts to tests/list-pages-ui.test.ts (CRLF)`

Run: `node --test tests/supplier-detail-ui.test.ts tests/list-pages-ui.test.ts`
Expected: FAIL, `tests 36 · pass 34 · fail 2` (`supplier-detail-ui` 3 · `list-pages-ui` 33, one test more than before this step):
- `purchase documents use adaptive desktop and mobile presentations`: the input did not match the regular expression `/<DataTable\b/`
- `supplier purchase documents: DataTable with right-aligned count and money columns, formatCount, formatMoney and Nil (spec 2B §5.5, §5.7)`: the input did not match the regular expression `/<DataTable data-supplier-documents-desktop className="mt-4 hidden md:block">/`

- [ ] **Step 3: Lower the guard rows of the file (the failing guards)**

Run: `node <temp>/p2b-budget.mjs c/master-data/supplier-purchase-documents.tsx R7=1:0 LV1=2:0 LV2=2:0 LV3=2:0 --migrated`
Expected (exit 0):
```
R7: 1 -> 0 (row deleted)
LV1: 2 -> 0 (row deleted)
LV2: 2 -> 0 (row deleted)
LV3: 2 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/components/master-data/supplier-purchase-documents.tsx
```

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 47 · pass 42 · fail 5`, each listing only the component: LV1 (`LV1: 17 in 5 files`, `2 > 0`), LV2 (`76 in 25`, `2 > 0`), LV3 (`18 in 5`, `2 > 0`), `L0 …` (three lines), VFG `R7 interim …` (`12 matches in 9 files`, `src/components/master-data/supplier-purchase-documents.tsx: 1 > 0`).

- [ ] **Step 4: Move the table onto `DataTable` (`src/components/master-data/supplier-purchase-documents.tsx`, CRLF)**

Three exact replacements, top to bottom.

(1) Imports `:1-2`.

Replace `:1-2`:

```tsx
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { formatCurrency, formatDate } from "@/lib/utils"
```

with:

```tsx
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { orNil } from "@/components/ui/nil"
import { formatCount, formatMoney } from "@/lib/display-format"
import { formatDate } from "@/lib/utils"
```

(2) The desktop table `:40-67`.

Replace `:40-67`:

```tsx
      <div
        data-supplier-documents-desktop
        className="mt-4 hidden overflow-x-auto rounded-md border border-border md:block"
      >
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-medium">{labels.documentNo}</th>
              <th scope="col" className="px-3 py-2 text-left font-medium">{labels.documentDate}</th>
              <th scope="col" className="px-3 py-2 text-left font-medium">{labels.linkedAssets}</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">{labels.totalAmount}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {documents.map((document) => (
              <tr key={document.id}>
                <td className="px-3 py-2">
                  <div className="font-medium text-foreground">{document.documentType} / {document.documentNo}</div>
                  <div className="text-xs text-muted-foreground">{documentReferences(document) || "-"}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatDate(document.documentDate)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{document.linkedAssets.toLocaleString()}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-muted-foreground">{formatCurrency(document.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
```

with:

```tsx
      <DataTable data-supplier-documents-desktop className="mt-4 hidden md:block">
        <DataTableHeader>
          <tr>
            <DataTableHead>{labels.documentNo}</DataTableHead>
            <DataTableHead>{labels.documentDate}</DataTableHead>
            <DataTableHead align="right">{labels.linkedAssets}</DataTableHead>
            <DataTableHead align="right">{labels.totalAmount}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {documents.map((document) => (
            <DataTableRow key={document.id}>
              <DataTableCell>
                <div className="font-medium text-foreground">{document.documentType} / <span className="tag">{document.documentNo}</span></div>
                <div className="text-xs text-muted-foreground">{orNil(documentReferences(document))}</div>
              </DataTableCell>
              <DataTableCell className="whitespace-nowrap text-muted-foreground">{formatDate(document.documentDate)}</DataTableCell>
              <DataTableCell numeric className="text-muted-foreground">{formatCount(document.linkedAssets)}</DataTableCell>
              <DataTableCell numeric className="text-muted-foreground">{formatMoney(document.totalAmount)}</DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
```

(3) The phone card `:72-81` (the `<article>` and the `DocumentFact` helper stay).

Replace `:72-81`:

```tsx
            <div className="font-medium text-foreground">{document.documentType} / {document.documentNo}</div>
            <div className="mt-1 text-xs text-muted-foreground">{documentReferences(document) || "-"}</div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <DocumentFact label={labels.documentDate} value={formatDate(document.documentDate)} />
              <DocumentFact label={labels.linkedAssets} value={document.linkedAssets.toLocaleString()} />
              <DocumentFact
                label={labels.totalAmount}
                value={formatCurrency(document.totalAmount)}
                className="col-span-2"
              />
```

with:

```tsx
            <div className="font-medium text-foreground">{document.documentType} / <span className="tag">{document.documentNo}</span></div>
            <div className="mt-1 text-xs text-muted-foreground">{orNil(documentReferences(document))}</div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <DocumentFact label={labels.documentDate} value={formatDate(document.documentDate)} />
              <DocumentFact label={labels.linkedAssets} value={formatCount(document.linkedAssets)} />
              <DocumentFact
                label={labels.totalAmount}
                value={formatMoney(document.totalAmount)}
                className="col-span-2"
              />
```

Check: `grep -nE '<table|<thead|<th |bg-muted/|formatCurrency|toLocaleString\(|"-"' src/components/master-data/supplier-purchase-documents.tsx` prints nothing (exit 1).

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/supplier-detail-ui.test.ts tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-primitives-ui.test.ts`
Expected: PASS, `tests 125 · pass 125 · fail 0` (`supplier-detail-ui` 3 · `list-pages-ui` 33 · `list-frame-guards` 21 · `visual-foundation-guards` 26 · `form-migration-guards` 23 · `list-primitives-ui` 19).

Run: `node <temp>/p2b1-precheck.mjs --file c/master-data/supplier-purchase-documents.tsx`
Expected: `· in MIGRATED_LIST_FILES`, the lines `R7 0 0 0 1`, `LV1 0 0 0 2`, `LV2 0 0 0 2`, `LV3 0 0 0 2` (in the script's columns) and `args    (no row holds this file)`.

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b4-tw-probe.mjs src/components/master-data/supplier-purchase-documents.tsx`
Expected: `checked 23 classes, missing 0` (exit 0).

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `tests 1958 · pass 1957 · fail 0 · skipped 1` (one test more than after Task 6).
- `npx tsc --noEmit`: no errors (`data-supplier-documents-desktop` reaches the frame through `DataTable`'s `<div>` props).
- `npm run lint`: 0 errors and the 146 warnings under `.agents/`; `npx eslint src/components/master-data/supplier-purchase-documents.tsx tests/supplier-detail-ui.test.ts tests/list-pages-ui.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 5 files: the component 31 insertions and 33 deletions, `tests/list-frame-guards.test.ts` 1 and 5 (the `MIGRATED_LIST_FILES` line in; three rows and the `// 2B-4` lines of LV1 and LV3 out), `tests/list-pages-ui.test.ts` 15 insertions, `tests/supplier-detail-ui.test.ts` 1 and 1, `tests/visual-foundation-guards.test.ts` 2 deletions (the row and the `// 2B-4` group line of `TABLE_HEADER_FILLS`). The component stays CRLF (`99 99`).

- [ ] **Step 8: Commit**

```bash
git add src/components/master-data/supplier-purchase-documents.tsx tests/supplier-detail-ui.test.ts tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts
git commit -m "feat(ui): supplier purchase documents on DataTable with formatCount, formatMoney and Nil (2B-4 task 7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 5 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 11):** at 1440 and 768 the purchase documents table of the Task 0 supplier: white header, the two right-aligned number columns, "ยอดรวม (บาท)" over plain amounts, document numbers in monospace and selectable as one word; at 375 the cards as before with th-TH digits; NVDA reads the header cells as column headers.

---

### Task 8: `D/my-assets/[id]/page.tsx` on `PageHeader` and `KeyValueList`, without the doubled `pb-24`

Spec §8.8 row 8, §4.4.5 row `my-assets/[id]`, §4.5.2 #30, §4.6.3, §10.4 table A row 2B-4 (`tests/mobile-field-navigation.test.ts:14-33` gains `"/th/my-assets/asset-1"`), rulings R-n, R-p and controller rulings (a), (e), (f) and (g). One file, one commit. The page is CRLF; `tests/mobile-field-navigation.test.ts` mixes CRLF and LF (139 lines, 133 of them CRLF), so it is edited by a script that writes one CRLF line, never by an editor that could normalize it.

Rulings this task applies:
- **§4.4.5, §4.5.2 #30:** the title block (`:57-66`) becomes `PageHeader` with `title={t("detailTitle")}`, `meta={t("detailHelp")}` and `back={<PageBackLink href={`/${locale}/my-assets`} label={t("backToList")} />}` (the page has no crumbs, so rule 6 does not apply and the h1 stays "รายละเอียดทรัพย์สินของฉัน"). The `getSafeActionLinkClasses("secondary")` link goes. LH1, LB1 1 → 0.
- **§4.6.3, §10.4 table A, ruling (g):** the root `space-y-6 pb-24 md:pb-0` → `space-y-6`. The page is in navigation mode (no focus regex of `src/lib/mobile-field-navigation.ts:16-28` matches `/my-assets/<id>`), which no test pinned: this task adds `"/th/my-assets/asset-1"` to the navigation-mode list, so a future focus rule that would hide the bottom bar here fails the test before the page loses its space. LP1 1 → 0.
- **LK1:** `DetailItem` (`:109`) goes: the five facts are one `KeyValueList` (no icons). The category code and the serial number are `tag` (R-p); a blank serial number shows `Nil` through `KeyValueList` (it was `"-"`). LK1, LV2 1 → 0.
- **Not changed:** the query (`buildMyAssetDetailWhere({ employeeId: user.employeeId, assetId: id })`, `tests/my-assets-detail.test.ts:28`; no purchase price, supplier or fixed-asset code, `:30`), the photo panel, the two status badges with `getAssetStateTone` and the one-line `StatusBadge` import (`tests/visual-consistency-ui.test.ts:23-34`).
- **Ruling (f):** the page joins `MIGRATED_LIST_FILES`.

What users will see on `/th/my-assets/<id>`:
- The title at 600 with the help line under it; "กลับไปทรัพย์สินของฉัน" is the outline button with the left arrow (a 44px icon button on phones) beside the title from 768px.
- The five facts are label and value rows instead of five bordered tiles with icons; codes in monospace; no serial number reads "—".
- On phones there is no extra blank band above the bottom navigation.

Not in this task: `D/my-assets/page.tsx` (2B-5, I14) · docs (Task 12). Do not run a formatter.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/my-assets/[id]/page.tsx` (`i/lf w/crlf`; 4 exact replacements)
- Modify: `tests/mobile-field-navigation.test.ts` (`i/lf w/mixed`; one line inserted by `<temp>/t08-insert-path.mjs`)
- Modify: `tests/list-pages-ui.test.ts` (`i/lf w/crlf`; one block appended with `p2b4-append.mjs`)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only)
- Temp folder only: `t08-insert-path.mjs`, `t08-pages-block.ts`

**Must keep passing without edits:**
- `tests/my-assets-detail.test.ts:23-31` · `tests/visual-consistency-ui.test.ts:23-34` · `tests/my-assets-route-ui.test.ts`
- `tests/mobile-field-navigation.test.ts` (every other line and test) · `tests/visual-foundation-guards.test.ts` · `tests/list-primitives-ui.test.ts` · `tests/form-migration-guards.test.ts`

**Interfaces:**
- Consumes: `PageHeader`, `PageBackLink`, `KeyValueList` as in Task 5; `getMobileShellMode(pathname: string): "navigation" | "focus"` from `src/lib/mobile-field-navigation.ts` (the test imports it); Task 5's precheck script.
- Produces: the page without `<h1>`, `ArrowLeft`, `Link`, `getSafeActionLinkClasses` and `DetailItem`; in `MIGRATED_LIST_FILES`; `"/th/my-assets/asset-1"` in the navigation-mode list; the test `my asset page: PageHeader with the back link to My Assets, the facts as a KeyValueList, no pb-24 of its own (spec 2B §4.4.5, §4.6.3)`.

| guard | `D/my-assets/[id]/page.tsx` before → after | plan total (budget) before → after |
|---|---|---|
| LFG LH1 · LB1 · LP1 | 1 · 1 · 1 → – | 19 → 18 · 8 → 7 · 5 → 4 |
| LFG LV2 · LK1 | 1 · 1 → – | 74 → 73 · 2 → 1 |
| `MIGRATED_LIST_FILES` | – → joins | +1 |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b4-t5-precheck.mjs 8`
Expected: `git status` prints nothing. The script prints (exit 0) the six `ok` lines for the primitives and the keys, then:
```
ok      Task 5 is in
ok      Task 6 is in
ok      Task 7 is in
ok      Task 8 has not run yet
ok      src/app/[locale]/(dashboard)/my-assets/[id]/page.tsx is unchanged since c2bfbe2 (hash af04828046677bb4)
ok      tests/mobile-field-navigation.test.ts is unchanged since c2bfbe2 (hash 9d3b36646de364ad)
info    src/app/[locale]/(dashboard)/my-assets/[id]/page.tsx: CRLF
info    tests/mobile-field-navigation.test.ts: mixed
preconditions hold for Task 8
```

Run: `node <temp>/p2b1-precheck.mjs --file "D/my-assets/[id]/page.tsx"`
Expected (after the header lines; exit 0):
```
file    src/app/[locale]/(dashboard)/my-assets/[id]/page.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
LH1        1       1     0     1
LB1        1       1     0     1
LP1        1       1     0     1
LV2        1       1     0     1
LK1        1       1     0     1
args    LH1=1:1 LB1=1:1 LP1=1:1 LV2=1:1 LK1=1:1
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol "src/app/[[]locale]/(dashboard)/my-assets/[[]id]/page.tsx" tests/mobile-field-navigation.test.ts tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf w/crlf` for the page, `tests/list-pages-ui.test.ts` and `tests/list-frame-guards.test.ts`; `i/lf w/mixed` for `tests/mobile-field-navigation.test.ts`. Keep each as it is.

- [ ] **Step 2: Write the tests**

(a) The navigation-mode pin (`tests/mobile-field-navigation.test.ts`, mixed line endings). Save this script as `<temp>/t08-insert-path.mjs`:

```js
// t08-insert-path.mjs: run from the repo root. Usage: node <temp>/t08-insert-path.mjs
// Adds "/th/my-assets/asset-1" to the navigation-mode list of tests/mobile-field-navigation.test.ts, after the supplier
// detail path, as one CRLF line like its neighbours. The file mixes CRLF and LF lines, so an editor could rewrite them
// all. Writes nothing unless the anchor is there exactly once. Never commit this file.
import { readFileSync, writeFileSync } from "node:fs"

const path = "tests/mobile-field-navigation.test.ts"
const text = readFileSync(path, "utf8")
const anchor = '    "/th/master-data/suppliers/supplier-1",\r\n  ]) {'
if (text.split(anchor).length !== 2) throw new Error(`${path}: the anchor is not there exactly once; stop and report`)
writeFileSync(path, text.replace(anchor, '    "/th/master-data/suppliers/supplier-1",\r\n    "/th/my-assets/asset-1",\r\n  ]) {'))
console.log(`added /th/my-assets/asset-1 to ${path}`)
```

Run: `node <temp>/t08-insert-path.mjs`
Expected: `added /th/my-assets/asset-1 to tests/mobile-field-navigation.test.ts`. Then `node -e "const s=require('fs').readFileSync(process.argv[1],'utf8');console.log((s.match(/\r\n/g)||[]).length,(s.match(/\n/g)||[]).length)" tests/mobile-field-navigation.test.ts` prints `134 140` (one CRLF line more; the six LF lines stay).

Run: `node --test tests/mobile-field-navigation.test.ts`
Expected: PASS, `tests 7 · pass 7 · fail 0`. This assertion pins today's behavior: the page is already in navigation mode, and Step 4 relies on it (the shell, not the page, leaves the room for the bar).

(b) The failing test (`tests/list-pages-ui.test.ts`, CRLF; strips `\r`). Save this block as `<temp>/t08-pages-block.ts`:

```ts
// Plan 2B-4 Task 8 (spec 2B §4.4.5, §4.6.3): the My Assets detail page: PageHeader with its back link to the list, the
// facts as one KeyValueList, and no pb-24 of its own. The page is in navigation mode, so the shell already leaves room
// for the bottom bar (tests/mobile-field-navigation.test.ts pins the mode).
test("my asset page: PageHeader with the back link to My Assets, the facts as a KeyValueList, no pb-24 of its own (spec 2B §4.4.5, §4.6.3)", () => {
  const source = read(`${D}my-assets/[id]/page.tsx`)
  assert.match(source, /return \(\n {4}<div className="space-y-6">\n {6}<PageHeader\n\s+title=\{t\("detailTitle"\)\}\n\s+meta=\{t\("detailHelp"\)\}\n\s+back=\{<PageBackLink href=\{`\/\$\{locale\}\/my-assets`\} label=\{t\("backToList"\)\} \/>\}\n\s+\/>/)
  assert.doesNotMatch(source, /\bpb-24\b/)
  assert.match(source, /<KeyValueList\n\s+items=\{\[/)
  assert.match(source, /\{ key: "serialNumber", label: t\("serialNumber"\), value: asset\.serialNumber \? <span className="tag">\{asset\.serialNumber\}<\/span> : null \}/, "an empty serial number shows Nil through KeyValueList")
  assert.doesNotMatch(source, /function DetailItem\b|<h1\b|getSafeActionLinkClasses|"-"/)
})
```

Run: `node <temp>/p2b4-append.mjs <temp>/t08-pages-block.ts tests/list-pages-ui.test.ts`
Expected: `appended <temp>/t08-pages-block.ts to tests/list-pages-ui.test.ts (CRLF)`

Run: `node --test tests/list-pages-ui.test.ts`
Expected: FAIL, `tests 34 · pass 33 · fail 1` (one test more than before this step):
- `my asset page: PageHeader with the back link to My Assets, the facts as a KeyValueList, no pb-24 of its own (spec 2B §4.4.5, §4.6.3)`: the input did not match the regular expression `/return \(\n {4}<div className="space-y-6">\n {6}<PageHeader…/`

- [ ] **Step 3: Lower the guard rows of the page (the failing guards)**

Run: `node <temp>/p2b-budget.mjs "D/my-assets/[id]/page.tsx" LH1=1:0 LB1=1:0 LP1=1:0 LV2=1:0 LK1=1:0 --migrated`
Expected (exit 0):
```
LH1: 1 -> 0 (row deleted)
LB1: 1 -> 0 (row deleted)
LP1: 1 -> 0 (row deleted)
LV2: 1 -> 0 (row deleted)
LK1: 1 -> 0 (row deleted)
MIGRATED_LIST_FILES: added
written: src/app/[locale]/(dashboard)/my-assets/[id]/page.tsx
```

Run: `node --test tests/list-frame-guards.test.ts`
Expected: FAIL, `tests 21 · pass 15 · fail 6`, each listing only the page: LH1 (`LH1: 19 in 19 files`, `1 > 0`), LB1 (`8 in 8`), LP1 (`5 in 5`), LV2 (`74 in 24`), LK1 (`2 in 2`), and `L0 …` (five lines).

- [ ] **Step 4: Move the page onto the primitives (`src/app/[locale]/(dashboard)/my-assets/[id]/page.tsx`, CRLF)**

Four exact replacements, top to bottom.

(1) Imports `:1-9`: `Link`, the five fact icons and `getSafeActionLinkClasses` go; `PackageCheck` stays for the photo placeholder; the `StatusBadge` import stays on its own line (`tests/visual-consistency-ui.test.ts:29`).

Replace `:1-9`:

```tsx
import Image from "next/image"
import Link from "next/link"
import type { Prisma } from "@prisma/client"
import { notFound } from "next/navigation"
import { ArrowLeft, Building2, CalendarClock, MapPin, PackageCheck, Tags } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { ContentPanel } from "@/components/ui/content-panel"
import { StatusBadge } from "@/components/ui/status-badge"
import { getAssetStateTone, getSafeActionLinkClasses } from "@/lib/design-system"
```

with:

```tsx
import Image from "next/image"
import type { Prisma } from "@prisma/client"
import { notFound } from "next/navigation"
import { PackageCheck } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { ContentPanel } from "@/components/ui/content-panel"
import { KeyValueList } from "@/components/ui/key-value-list"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { getAssetStateTone } from "@/lib/design-system"
```

(2) The page root and the header `:55-66`.

Replace `:55-66`:

```tsx
  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("detailTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("detailHelp")}</p>
        </div>
        <Link href={`/${locale}/my-assets`} className={getSafeActionLinkClasses("secondary")}>
          <ArrowLeft className="h-4 w-4" />
          {t("backToList")}
        </Link>
      </div>
```

with:

```tsx
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("detailTitle")}
        meta={t("detailHelp")}
        back={<PageBackLink href={`/${locale}/my-assets`} label={t("backToList")} />}
      />
```

(3) The facts `:96-104`.

Replace `:96-104`:

```tsx
      <ContentPanel title={t("detailTitle")}>
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <DetailItem icon={<Tags className="h-4 w-4" />} label={t("category")} value={`${asset.category.code} - ${asset.category.name}`} />
          <DetailItem icon={<PackageCheck className="h-4 w-4" />} label={t("serialNumber")} value={asset.serialNumber || "-"} />
          <DetailItem icon={<MapPin className="h-4 w-4" />} label={t("location")} value={location} />
          <DetailItem icon={<Building2 className="h-4 w-4" />} label={t("companyBranch")} value={companyBranch} />
          <DetailItem icon={<CalendarClock className="h-4 w-4" />} label={t("updatedAt")} value={formatDateTime(asset.updatedAt)} />
        </dl>
      </ContentPanel>
```

with:

```tsx
      <ContentPanel title={t("detailTitle")}>
        <KeyValueList
          items={[
            { key: "category", label: t("category"), value: <><span className="tag">{asset.category.code}</span> - {asset.category.name}</> },
            { key: "serialNumber", label: t("serialNumber"), value: asset.serialNumber ? <span className="tag">{asset.serialNumber}</span> : null },
            { key: "location", label: t("location"), value: location },
            { key: "companyBranch", label: t("companyBranch"), value: companyBranch },
            { key: "updatedAt", label: t("updatedAt"), value: formatDateTime(asset.updatedAt) },
          ]}
        />
      </ContentPanel>
```

(4) The local `DetailItem` `:107-119` goes.

Replace `:107-119`:

```tsx
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="text-primary" aria-hidden="true">{icon}</span>
        {label}
      </dt>
      <dd className="mt-2 break-words text-sm font-semibold text-foreground">{value}</dd>
    </div>
  )
}
```

with:

```tsx
}
```

Check: `grep -nE 'ArrowLeft|<h1|pb-24|getSafeActionLinkClasses|"-"|function DetailItem|<Link' "src/app/[locale]/(dashboard)/my-assets/[id]/page.tsx"` prints nothing (exit 1).

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/mobile-field-navigation.test.ts tests/list-pages-ui.test.ts tests/my-assets-detail.test.ts tests/visual-consistency-ui.test.ts tests/my-assets-route-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-primitives-ui.test.ts`
Expected: PASS, `tests 140 · pass 140 · fail 0` (`mobile-field-navigation` 7 · `list-pages-ui` 34 · `my-assets-detail` 3 · `visual-consistency-ui` 3 · `my-assets-route-ui` 4 · `list-frame-guards` 21 · `visual-foundation-guards` 26 · `form-migration-guards` 23 · `list-primitives-ui` 19).

Run: `node <temp>/p2b1-precheck.mjs --file "D/my-assets/[id]/page.tsx"`
Expected: `· in MIGRATED_LIST_FILES`, the lines `LH1 0 0 0 1`, `LB1 0 0 0 1`, `LP1 0 0 0 1`, `LV2 0 0 0 1`, `LK1 0 0 0 1` and `args    (no row holds this file)`.

- [ ] **Step 6: Prove every class compiles**

Run: `node <temp>/p2b4-tw-probe.mjs "src/app/[locale]/(dashboard)/my-assets/[id]/page.tsx"`
Expected: `checked 35 classes, missing 0` (exit 0).

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `tests 1959 · pass 1958 · fail 0 · skipped 1` (one test more than after Task 7).
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors and the 146 warnings under `.agents/`; `npx eslint "src/app/[locale]/(dashboard)/my-assets/[id]/page.tsx" tests/mobile-field-navigation.test.ts tests/list-pages-ui.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 4 files: the page 19 insertions and 33 deletions, `tests/list-frame-guards.test.ts` 1 and 7 (the `MIGRATED_LIST_FILES` line in; five rows and the `// 2B-4` lines of LH1 and LK1 out, whose other rows Tasks 1 and 3–6 removed), `tests/list-pages-ui.test.ts` 12 insertions, `tests/mobile-field-navigation.test.ts` 1 insertion (Git may warn that it will replace LF by CRLF in that file; that is the six LF lines it already had, and the commit stores LF as before). The page stays CRLF (`105 105`).

- [ ] **Step 8: Commit**

```bash
git add "src/app/[locale]/(dashboard)/my-assets/[id]/page.tsx" tests/mobile-field-navigation.test.ts tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(ui): my asset page on PageHeader and KeyValueList, without its own pb-24 (2B-4 task 8)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 11):** `/th/my-assets/<id>` with an account that holds assets (Task 0 Step 7; if the seed admin holds none, list it under "Still needs a person"): at 1440 the title, the help line and "กลับไปทรัพย์สินของฉัน" to the right; at 375 the arrow-only 44px back button, the facts stacked label over value, the bottom navigation visible and nothing under it, no extra band above it; "กลับไปทรัพย์สินของฉัน" returns to `/th/my-assets`.

---

### Task 9: `c/ui/page-skeleton.tsx` · the skeletons take the shape of their pages, at full width (I28, R-o)

Spec §8.8 row 9, §4.7, §4.6.2 (R-o), §10.2 I28, §4.8 row 28, §9.6 row 2B-4 (`tests/page-loading-skeleton.test.ts:10-33`, `tests/loading-boundaries.test.ts:5-32`) and controller rulings (e) and (f). One file, one commit. The file is CRLF and changes almost everywhere, so this task writes the whole file from a block, with CRLF, instead of thirty replacements.

Rulings this task applies:
- **R-o, §4.6.2:** every skeleton frame was `mx-auto flex w-full max-w-7xl flex-col gap-5` (`:84`, `:111`, `:146`, `:168`, `:208`): the five lines of spec §8.8 row 9 that "drop `max-w-7xl`" are all in this file. List and detail pages have no max width, so the frame is now `aria-busy="true" className="flex w-full flex-col gap-6"` (§4.7 "กรอบทุกตัว"); `gap-6` is the pages' `space-y-6`.
- **§4.7, I1:** `PageHeaderSkeleton` follows `PageHeader`: crumbs `h-5 w-40` with `mb-1`, the row `flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between` (it switched at `sm`), the title `h-8 w-56`, the meta `mt-1 h-5 w-72`, the button `h-11 w-28 md:h-9`. It takes `crumbs`, `meta` (`"text"` · `"badges"` · `"none"`), `actions` and `compactOnMobile`, so each page skeleton draws its own header: the asset page has crumbs and two `h-5.5 w-20 rounded-control` badges, the dashboard a title only, the register the compact row (title and button share a row below md, no meta).
- **I28:** `MetricGridSkeleton` (name kept, `tests/loading-boundaries.test.ts:25` reads `MetricGridSkeleton count={2}`) is one `StatStrip` frame: `grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border … lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none`, cells `space-y-2 bg-surface px-4 py-3 md:px-5 md:py-4` with a `h-4 w-24` label and a `h-8 w-16` value.
- **Departure from I28 (one class):** the frame also carries `StatStrip`'s `max-lg:[&>:last-child:nth-child(odd)]:col-span-2`. With five cells (the dashboard) and two columns, the fifth cell would leave its neighbour's slot empty, and in a `gap-px bg-border` grid an empty slot shows as a solid grey block; `StatStrip` (`c/ui/stat-strip.tsx`) has the class for that reason, and I28's own reason is that the skeleton must match the real strip. The class already compiles in `src`.
- **§4.7:** `TableSkeleton` is the `DataTable` frame: `overflow-hidden rounded-lg border border-border bg-surface`, a white header row `border-b border-border bg-surface px-3 py-2.5` (was `bg-background`) with `h-4 w-20` blocks, rows `divide-y divide-border-soft` at `py-3` (`dense`: `py-2`, the register's compact rows).
- **§4.7 per skeleton:**
  - `PageSkeleton` (every route without its own `loading.tsx`): the header and `TableSkeleton rows={6}`, the shape of a list page (was the header, four metric cards and two panels).
  - `DashboardPageSkeleton`: a title only; the old block order (the five metrics, the four-box panel, the two panels) with `gap-6`. Plan 2B-5 reshapes it if it changes the dashboard (§4.7).
  - `AssetRegisterPageSkeleton`: the compact header; no `FilterPanelSkeleton` (the register has no filter panel above its table, §4.7 "ตอนนี้"); a toolbar without a frame, the underline status tabs (`TabNavSkeleton count={5}`) and `TableSkeleton dense rows={8} columns={6}`.
  - `AssetDetailPageSkeleton`: crumbs and two badges in the header; the identity card (`:170-182`) goes, because the identity is in the header since Task 1; the view tabs (`TabNavSkeleton count={4}`), `MetricGridSkeleton count={6}` and `grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]` (the page's 280px side column).
  - `ReportsPageSkeleton`: the order `PageHeaderSkeleton` → `data-report-tabs-skeleton` → `FilterPanelSkeleton` → `MetricGridSkeleton count={2}` → `data-report-view-skeleton` stays (`tests/loading-boundaries.test.ts:15-32`); the tabs are an underline row instead of four `h-11` boxes.
- **Departure from §4.7 row `AssetRegisterPageSkeleton` (the toolbar's widths):** the spec's toolbar (`h-9 w-36` selects, a `size-11 md:size-9` icon button) predates the toolbar plan 2B-3 built: `c/assets/asset-register-toolbar.tsx:36-96` wraps (`flex-wrap`), the search has `basis-56`, the three scope selects are `w-44 lg:w-48`, and the filter button shows its words from md. The skeleton draws that toolbar (`h-11 min-w-0 flex-1 basis-56 md:h-9`, three `hidden h-9 w-44 shrink-0 md:block lg:w-48`, `size-11 shrink-0 md:h-9 md:w-36`), because I28 and F:42 ask the skeleton to match the real page.
- **`TabNavSkeleton`** (new, file-local): `flex gap-4 overflow-hidden border-b border-border pb-2` with `h-5 w-20` blocks (§4.7), passing other `<div>` props on (the reports skeleton passes `data-report-tabs-skeleton`).
- **Kept:** the five export names, `motion-safe:animate-pulse` and `aria-busy="true"` (`tests/page-loading-skeleton.test.ts:16-20`), `SkeletonBlock`, and `FilterPanelSkeleton` as it is (only the reports skeleton uses it now; 2B-5 reshapes the reports skeleton with its page, §4.7).
- **LFG, ruling (f):** the file holds no guard row before or after and stays out of `MIGRATED_LIST_FILES`: §4.7 lets plan 2B-5 change the dashboard and reports skeletons in the commits of those pages, so 2B is not done with the file.

What users will see while a page loads (slow network):
- Every skeleton spans the full width of the content area, like the page that replaces it (it stopped at 1280px before).
- The header placeholder has the page's shape: crumbs on record pages, the badges on the asset page, no button on the dashboard; it switches to one row from 768px.
- Numbers are one framed strip (two columns on phones) instead of separate cards; tables have a white header row; tabs are a thin underline row instead of boxes.
- A page without its own skeleton (most menu items) shows a header over a table instead of metric cards and two panels.

Not in this task: the five `loading.tsx` files (Task 10; none of them has a class) · `FilterPanelSkeleton` · docs (Task 12). Do not run a formatter.

**Files:**
- Modify: `src/components/ui/page-skeleton.tsx` (`i/lf w/crlf`; the whole file, written with CRLF by `<temp>/t09-write-crlf.mjs`)
- Modify: `tests/page-loading-skeleton.test.ts` (`i/lf w/lf`; one block appended with `p2b4-append.mjs`)
- Temp folder only: `t09-page-skeleton.txt`, `t09-write-crlf.mjs`, `t09-skeleton-block.ts`

**Must keep passing without edits:**
- `tests/page-loading-skeleton.test.ts:10-33` (the files exist; the three export names; `motion-safe:animate-pulse`; `aria-busy="true"`; the three `loading.tsx` render their skeleton without a spinner)
- `tests/loading-boundaries.test.ts:5-32` (the asset and reports boundaries; the reports order with `MetricGridSkeleton count={2}`)
- `tests/visual-foundation-guards.test.ts` · `tests/list-frame-guards.test.ts` · `tests/form-migration-guards.test.ts`

**Interfaces:**
- Consumes: `cn()` from `@/lib/utils`; the class strings of `StatStrip` (I28) and `DataTable` (§3.4) as quoted above; Task 5's precheck script; Task 1's `p2b4-append.mjs` and `p2b4-tw-probe.mjs`.
- Produces: `PageSkeleton()`, `DashboardPageSkeleton()`, `AssetRegisterPageSkeleton()`, `AssetDetailPageSkeleton()`, `ReportsPageSkeleton()` (same names, no props); file-local `PageHeaderSkeleton({ crumbs?, meta?, actions?, compactOnMobile? })`, `MetricGridSkeleton({ count? })`, `TableSkeleton({ rows?, columns?, dense? })`, `TabNavSkeleton({ count, …<div> props })`; the test `loading skeletons take the shape of their pages at full width (spec 2B §4.7, I28)`.

| guard | `c/ui/page-skeleton.tsx` before → after |
|---|---|
| LFG, VFG | no row before or after · stays out of `MIGRATED_LIST_FILES` (2B-5 may reshape two skeletons) |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b4-t5-precheck.mjs 9`
Expected: `git status` prints nothing. The script prints (exit 0) the six `ok` lines for the primitives and the keys, then:
```
ok      Task 5 is in
ok      Task 6 is in
ok      Task 7 is in
ok      Task 8 is in
ok      Task 9 has not run yet
ok      src/components/ui/page-skeleton.tsx is unchanged since c2bfbe2 (hash 85b86911c4c850aa)
ok      tests/page-loading-skeleton.test.ts is unchanged since c2bfbe2 (hash 70e380c82ee8402f)
info    src/components/ui/page-skeleton.tsx: CRLF
info    tests/page-loading-skeleton.test.ts: LF
preconditions hold for Task 9
```

Run: `node <temp>/p2b1-precheck.mjs --file c/ui/page-skeleton.tsx`
Expected (after the header lines; exit 0):
```
file    src/components/ui/page-skeleton.tsx (CRLF) · not in MIGRATED_LIST_FILES
guard   live  budget  keep  seed
args    (no row holds this file)
        (= ID=<budget>:<live>; compare them with the task's Expected before you pass them to p2b-budget.mjs)
```

Run: `git ls-files --eol src/components/ui/page-skeleton.tsx tests/page-loading-skeleton.test.ts`
Expected: `i/lf w/crlf` for the component, `i/lf w/lf` for the test. Keep them so.

- [ ] **Step 2: Write the failing test (`tests/page-loading-skeleton.test.ts`, LF; the new test strips `\r` itself, because the component is CRLF)**

Save this block as `<temp>/t09-skeleton-block.ts`:

```ts
// Plan 2B-4 Task 9 (spec 2B §4.7, I28, R-o): each skeleton takes the shape of its page at the page's full width: the
// PageHeader rows (switching at md), one StatStrip frame for the numbers, the DataTable frame and underline tabs.
test("loading skeletons take the shape of their pages at full width (spec 2B §4.7, I28)", () => {
  const source = readFileSync(skeletonComponentPath, "utf8").replace(/\r\n/g, "\n")
  assert.doesNotMatch(source, /max-w-7xl|mx-auto/, "list and detail pages are full width, so their skeletons are too (R-o)")
  assert.equal(source.match(/<div aria-busy="true" className="flex w-full flex-col gap-6">/g)?.length, 5, "the five exported skeletons")
  assert.match(source, /className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border max-lg:\[&>:last-child:nth-child\(odd\)\]:col-span-2 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none"/, "MetricGridSkeleton is one StatStrip frame (I28)")
  assert.match(source, /className="space-y-2 bg-surface px-4 py-3 md:px-5 md:py-4"/)
  assert.match(source, /"flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between"/, "the header switches at md, like PageHeader")
  assert.match(source, /className="h-11 w-28 shrink-0 md:h-9"/, "header buttons: 44px on phones, 36px from md")
  assert.match(source, /<div className="overflow-hidden rounded-lg border border-border bg-surface">/, "the DataTable frame")
  assert.match(source, /className="grid gap-4 border-b border-border bg-surface px-3 py-2\.5"/, "a white header row")
  assert.match(source, /className="divide-y divide-border-soft"/)
  assert.match(source, /className="flex gap-4 overflow-hidden border-b border-border pb-2"/, "underline tabs, not boxes")
  assert.match(source, /<PageHeaderSkeleton crumbs meta="badges" \/>/, "the asset page: crumbs, then the status badges in the meta row")
  assert.match(source, /<PageHeaderSkeleton meta="none" actions=\{false\} \/>/, "the dashboard: a title only")
  assert.match(source, /<PageHeaderSkeleton compactOnMobile \/>/, "the register: title and button share a row on phones")
  assert.match(source, /<TableSkeleton dense rows=\{8\} columns=\{6\} \/>/, "the register keeps its dense rows")
  assert.match(source, /<MetricGridSkeleton count=\{6\} \/>/)
  assert.doesNotMatch(source, /\bsm:(?:flex-row|items-start|justify-between|h-10)\b|bg-background px-4/, "the old header switch at sm and the grey header row are gone")
  const register = source.slice(source.indexOf("export function AssetRegisterPageSkeleton()"), source.indexOf("export function AssetDetailPageSkeleton()"))
  assert.doesNotMatch(register, /FilterPanelSkeleton/, "the register has no filter panel above its table")
  const detail = source.slice(source.indexOf("export function AssetDetailPageSkeleton()"), source.indexOf("export function ReportsPageSkeleton()"))
  assert.doesNotMatch(detail, /h-24 w-24/, "no identity card: the identity is in the header")
})
```

Run: `node <temp>/p2b4-append.mjs <temp>/t09-skeleton-block.ts tests/page-loading-skeleton.test.ts`
Expected: `appended <temp>/t09-skeleton-block.ts to tests/page-loading-skeleton.test.ts (LF)`

Run: `node --test tests/page-loading-skeleton.test.ts`
Expected: FAIL, `tests 2 · pass 1 · fail 1`:
- `loading skeletons take the shape of their pages at full width (spec 2B §4.7, I28)`: `list and detail pages are full width, so their skeletons are too (R-o)` (the `max-w-7xl` frames)

- [ ] **Step 3: Write the new file (`src/components/ui/page-skeleton.tsx`, CRLF)**

The old text is the whole c2bfbe2 file (`git show c2bfbe2:src/components/ui/page-skeleton.tsx`, 223 lines); Step 1 proved the working file still holds it (hash `85b86911c4c850aa`). The block below replaces all of it.

Save this script as `<temp>/t09-write-crlf.mjs`:

```js
// t09-write-crlf.mjs: run from the repo root. Usage: node <temp>/t09-write-crlf.mjs <source> <target>
// Writes the source text to the target with CRLF line endings and one final line break. The target must already be
// CRLF in the working tree (it is checked first). Never commit this file.
import { readFileSync, writeFileSync } from "node:fs"

const [source, target] = process.argv.slice(2)
if (!readFileSync(target, "utf8").includes("\r\n")) throw new Error(`${target} is not CRLF in the working tree: stop and report`)
writeFileSync(target, readFileSync(source, "utf8").replace(/\r\n/g, "\n").replace(/\n*$/, "\n").replace(/\n/g, "\r\n"))
console.log(`wrote ${source} to ${target} (CRLF)`)
```

Save this block as `<temp>/t09-page-skeleton.txt` (`.txt`: the temp folder is under the linted and type-checked tree):

```tsx
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

// Loading skeletons in the shape of the pages they stand for (spec 2B §4.7, I28): the PageHeader rows, one StatStrip
// frame for the numbers, the DataTable frame and the underline TabNav, at the full width of the page (R-o: list and
// detail pages have no max width). Server-safe. The loading.tsx files render one of the five exports and nothing else.

type SkeletonBlockProps = {
  className?: string
}

type PageHeaderSkeletonProps = {
  // The breadcrumb trail of a record page, 4px above the title.
  crumbs?: boolean
  // "text": the description line · "badges": two status badges (the asset page) · "none": no meta row.
  meta?: "text" | "badges" | "none"
  // The button row.
  actions?: boolean
  // The asset register (PageHeader compactOnMobile): below md the title and its button share one row, no meta row.
  compactOnMobile?: boolean
}

type TableSkeletonProps = {
  rows?: number
  columns?: number
  // The asset register's compact rows.
  dense?: boolean
}

function SkeletonBlock({ className }: SkeletonBlockProps) {
  return <div aria-hidden="true" className={cn("rounded-md bg-muted motion-safe:animate-pulse", className)} />
}

// PageHeader: stacked below md, title and buttons in one row from md; buttons 44px on phones, 36px from md.
function PageHeaderSkeleton({ crumbs = false, meta = "text", actions = true, compactOnMobile = false }: PageHeaderSkeletonProps) {
  return (
    <div className="min-w-0">
      {crumbs ? <SkeletonBlock className="mb-1 h-5 w-40" /> : null}
      <div className={compactOnMobile ? "flex min-w-0 items-center justify-between gap-3 md:items-start" : "flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between"}>
        <div className="min-w-0">
          <SkeletonBlock className="h-8 w-56 max-w-full" />
          {meta === "text" ? <SkeletonBlock className={cn("mt-1 h-5 w-72 max-w-full", compactOnMobile && "max-md:hidden")} /> : null}
          {meta === "badges" ? (
            <div className="mt-1 flex gap-3">
              <SkeletonBlock className="h-5.5 w-20 rounded-control" />
              <SkeletonBlock className="h-5.5 w-20 rounded-control" />
            </div>
          ) : null}
        </div>
        {actions ? <SkeletonBlock className="h-11 w-28 shrink-0 md:h-9" /> : null}
      </div>
    </div>
  )
}

// StatStrip (I28): one 12px frame with 1px lines between the cells, two columns below lg and one row from lg. As in
// StatStrip, a last cell left alone below lg fills its row, so no grey hole shows where a cell is missing.
function MetricGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border max-lg:[&>:last-child:nth-child(odd)]:col-span-2 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="space-y-2 bg-surface px-4 py-3 md:px-5 md:py-4">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-8 w-16" />
        </div>
      ))}
    </div>
  )
}

// DataTable: a 12px white frame, a white header row and soft lines between the rows.
function TableSkeleton({ rows = 6, columns = 5, dense = false }: TableSkeletonProps) {
  const columnTemplate = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="grid gap-4 border-b border-border bg-surface px-3 py-2.5" style={columnTemplate}>
        {Array.from({ length: columns }, (_, index) => (
          <SkeletonBlock key={index} className="h-4 w-20" />
        ))}
      </div>
      <div className="divide-y divide-border-soft">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={rowIndex} className={cn("grid gap-4 px-3", dense ? "py-2" : "py-3")} style={columnTemplate}>
            {Array.from({ length: columns }, (_, columnIndex) => (
              <SkeletonBlock key={columnIndex} className={cn("h-4", columnIndex === 0 ? "w-28" : "w-full")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// TabNav: underline tabs on one base line, not boxes.
function TabNavSkeleton({ count, ...props }: { count: number } & ComponentProps<"div">) {
  return (
    <div {...props} className="flex gap-4 overflow-hidden border-b border-border pb-2">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonBlock key={index} className="h-5 w-20 shrink-0" />
      ))}
    </div>
  )
}

function FilterPanelSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
      <SkeletonBlock className="h-5 w-32" />
      <SkeletonBlock className="mt-2 h-4 w-80 max-w-full" />
      <div className="mt-4 flex flex-wrap gap-2">
        {Array.from({ length: 7 }, (_, index) => (
          <SkeletonBlock key={index} className="h-10 w-28 rounded-full" />
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <SkeletonBlock key={index} className="h-11" />
        ))}
      </div>
    </div>
  )
}

// Every route without a loading file of its own: a header over a list, the shape most menu rows open.
export function PageSkeleton() {
  return (
    <div aria-busy="true" className="flex w-full flex-col gap-6">
      <PageHeaderSkeleton />
      <TableSkeleton rows={6} />
    </div>
  )
}

export function DashboardPageSkeleton() {
  return (
    <div aria-busy="true" className="flex w-full flex-col gap-6">
      <PageHeaderSkeleton meta="none" actions={false} />
      <MetricGridSkeleton count={5} />
      <div className="rounded-lg border border-border bg-surface p-5">
        <SkeletonBlock className="h-5 w-48" />
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonBlock key={index} className="h-24" />
          ))}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-5">
          <SkeletonBlock className="h-5 w-52" />
          <div className="mt-4 space-y-3">
            <SkeletonBlock className="h-12" />
            <SkeletonBlock className="h-12" />
            <SkeletonBlock className="h-12" />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <SkeletonBlock className="h-5 w-32" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }, (_, index) => (
              <SkeletonBlock key={index} className="h-16" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// The register (plan 2B-3): the compact header, the toolbar with no frame (search, three scope selects and the filter
// button from md; search and an icon button on phones), the underline status tabs and the dense table.
export function AssetRegisterPageSkeleton() {
  return (
    <div aria-busy="true" className="flex w-full flex-col gap-6">
      <PageHeaderSkeleton compactOnMobile />
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <SkeletonBlock className="h-11 min-w-0 flex-1 basis-56 md:h-9" />
          <SkeletonBlock className="hidden h-9 w-44 shrink-0 md:block lg:w-48" />
          <SkeletonBlock className="hidden h-9 w-44 shrink-0 md:block lg:w-48" />
          <SkeletonBlock className="hidden h-9 w-44 shrink-0 md:block lg:w-48" />
          <SkeletonBlock className="size-11 shrink-0 md:h-9 md:w-36" />
        </div>
        <TabNavSkeleton count={5} />
        <TableSkeleton dense rows={8} columns={6} />
      </div>
    </div>
  )
}

// The asset page: the identity moved into the header (crumbs, then the name, then the status badges), so there is no
// identity card; then the view tabs, the numbers and the content beside its 280px side column.
export function AssetDetailPageSkeleton() {
  return (
    <div aria-busy="true" className="flex w-full flex-col gap-6">
      <PageHeaderSkeleton crumbs meta="badges" />
      <TabNavSkeleton count={4} />
      <MetricGridSkeleton count={6} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-lg border border-border bg-surface p-5">
          <SkeletonBlock className="h-5 w-44" />
          <div className="mt-4 space-y-3">
            <SkeletonBlock className="h-16" />
            <SkeletonBlock className="h-16" />
            <SkeletonBlock className="h-16" />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <SkeletonBlock className="h-5 w-36" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function ReportsPageSkeleton() {
  return (
    <div aria-busy="true" className="flex w-full flex-col gap-6">
      <PageHeaderSkeleton />
      <TabNavSkeleton data-report-tabs-skeleton count={4} />
      <FilterPanelSkeleton />
      <MetricGridSkeleton count={2} />
      <div data-report-view-skeleton className="rounded-lg border border-border bg-surface p-5">
        <SkeletonBlock className="h-5 w-44" />
        <SkeletonBlock className="mt-4 h-64 w-full" />
      </div>
    </div>
  )
}
```

Run: `node <temp>/t09-write-crlf.mjs <temp>/t09-page-skeleton.txt src/components/ui/page-skeleton.tsx`
Expected: `wrote <temp>/t09-page-skeleton.txt to src/components/ui/page-skeleton.tsx (CRLF)`

Check: `grep -nE 'max-w-7xl|mx-auto|sm:flex-row|bg-background px-4' src/components/ui/page-skeleton.tsx` prints nothing (exit 1).

- [ ] **Step 4: Run the tests for this task**

Run: `node --test tests/page-loading-skeleton.test.ts tests/loading-boundaries.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-primitives-ui.test.ts`
Expected: PASS, `tests 94 · pass 94 · fail 0` (`page-loading-skeleton` 2 · `loading-boundaries` 3 · `list-frame-guards` 21 · `visual-foundation-guards` 26 · `form-migration-guards` 23 · `list-primitives-ui` 19).

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected: exit 0, `budgets hold: no live count is over its row`, the totals of Task 8 unchanged.

- [ ] **Step 5: Prove every class compiles**

Run: `node <temp>/p2b4-tw-probe.mjs src/components/ui/page-skeleton.tsx`
Expected: `checked 93 classes, missing 0` (exit 0). New to `src`: `md:w-36` (the probe compiles it) and `xl:grid-cols-[minmax(0,1fr)_280px]` (spec §4.7). The probe skips that one and `max-lg:[&>:last-child:nth-child(odd)]:col-span-2`, because they hold parentheses; both are arbitrary values, which Tailwind emits as written (`c/ui/stat-strip.tsx` already uses the second).

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: `tests 1960 · pass 1959 · fail 0 · skipped 1` (one test more than after Task 8).
- `npx tsc --noEmit`: no errors (`TabNavSkeleton` passes `data-report-tabs-skeleton` through its `<div>` props).
- `npm run lint`: 0 errors and the 146 warnings under `.agents/`; `npx eslint src/components/ui/page-skeleton.tsx tests/page-loading-skeleton.test.ts` prints nothing.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 2 files: `src/components/ui/page-skeleton.tsx` 88 insertions and 77 deletions, `tests/page-loading-skeleton.test.ts` 26 insertions (Git may warn about LF in that file; it is LF in the working tree and the index, as before). The component is CRLF throughout (`234 234`), the test LF (`0 59`).

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/page-skeleton.tsx tests/page-loading-skeleton.test.ts
git commit -m "feat(ui): loading skeletons in the shape of their pages, full width, with the StatStrip frame (2B-4 task 9)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 2 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 11, spec §8.8 row "skeleton"):** with the network throttled, at 1440 and 375: `/th/dashboard`, `/th/assets`, `/th/assets/<id>`, `/th/reports` and one route without its own boundary (for example `/th/master-data/branches`) show their skeleton at the full content width, in the shape of the page that follows (compare the before images of Task 0 Step 8 and the loaded page): the header row switching at 768px, one framed number strip (two columns on phones, the dashboard's fifth cell filling its row with no grey hole), white table header rows, underline tabs; with reduced motion the blocks do not pulse.

---

### Task 10: The five dashboard `loading.tsx` boundaries · pinned as bare wrappers, and the guard state after plan 2B-4

Spec §8.8 row 9 (the five boundaries), §4.7 ("ไม่เพิ่ม `loading.tsx` · ไม่เปลี่ยนชื่อ export"), §10.4 table C column 2B-4 and controller rulings (a) and (f). One commit for the five boundaries. This task ends with the guard state after plan 2B-4.

Rulings this task applies:
- **What the five files hold (departure from the dispatch, which named one commit per file and "drop `max-w-7xl`" here):** each boundary is the same five-line wrapper (`import { XSkeleton } from "@/components/ui/page-skeleton"` and `export default function Loading() { return <XSkeleton /> }`) with no class and no width; the `max-w-7xl` of spec §8.8 row 9 sat in `page-skeleton.tsx` and left in Task 9. So no boundary changes: this task pins them as bare wrappers (so a later width or wrapper goes on the skeleton, which matches its page) and adds them to `MIGRATED_LIST_FILES` (ruling (f): 2B does not touch them again; 2B-5 changes skeletons in `page-skeleton.tsx`, never a boundary, §4.7). Five commits with no file change but one list line each would only split one change; the five list lines and the pin go in one commit.
- **No failing test first:** nothing in the five files changes, so no assertion can fail before this task. The new test pins today's text exactly and passes at once; L0 then holds each file at its `KEEP` (0 everywhere).
- **Line endings:** `D/loading.tsx`, `D/assets/loading.tsx` and `D/dashboard/loading.tsx` are LF in the working tree, the other two CRLF; the test strips `\r`, so it reads both the same.

What users will see: nothing (the skeletons changed in Task 9).

Not in this task: any `loading.tsx` change · a new boundary (§4.7) · docs (Task 12).

**Files:**
- Modify: `tests/loading-boundaries.test.ts` (`i/lf w/crlf`; one block appended with `p2b4-append.mjs`)
- Modify: `tests/list-frame-guards.test.ts` (`i/lf w/crlf`; through `p2b-budget.mjs` only: five `MIGRATED_LIST_FILES` lines)
- Read only: `src/app/[locale]/(dashboard)/loading.tsx`, `…/assets/loading.tsx`, `…/assets/[id]/loading.tsx`, `…/dashboard/loading.tsx`, `…/reports/loading.tsx`
- Temp folder only: `t10-loading-block.ts`

**Must keep passing without edits:**
- `tests/loading-boundaries.test.ts:5-32` · `tests/page-loading-skeleton.test.ts` (as Task 9 left it) · `tests/list-frame-guards.test.ts` (every guard, and L0 for the five new entries) · `tests/visual-foundation-guards.test.ts` · `tests/form-migration-guards.test.ts`

**Interfaces:**
- Consumes: the five export names of Task 9; Task 5's precheck script; Task 0's guard scripts; Task 1's `p2b4-append.mjs`.
- Produces: the five boundaries in `MIGRATED_LIST_FILES`; the test `every dashboard loading boundary renders only its skeleton (spec 2B §4.7)`; the guard state after plan 2B-4 (Step 5).

| guard | the five `loading.tsx` before → after |
|---|---|
| LFG, VFG | no row before or after · the five join `MIGRATED_LIST_FILES` |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages` then `node <temp>/p2b4-t5-precheck.mjs 10`
Expected: `git status` prints nothing. The script prints (exit 0) the six `ok` lines for the primitives and the keys, then `ok      Task 5 is in` … `ok      Task 9 is in`, `ok      Task 10 has not run yet`, the six `… is unchanged since c2bfbe2` lines (the five boundaries: hashes `b51dfdc5363b4da1`, `f45fb773d870650b`, `50b6e255b0f48326`, `48355b1e9e7e5505`, `900951970ff79af4`; `tests/loading-boundaries.test.ts`: `66574f61d4aae935`), the `info` lines (`LF` for `D/loading.tsx`, `D/assets/loading.tsx` and `D/dashboard/loading.tsx`; `CRLF` for the other two and for the test) and `preconditions hold for Task 10`.

Run, for each of `D/loading.tsx`, `D/assets/loading.tsx`, `"D/assets/[id]/loading.tsx"`, `D/dashboard/loading.tsx`, `D/reports/loading.tsx`: `node <temp>/p2b1-precheck.mjs --file <path>`
Expected for each (exit 0): `file    <full path> (LF|CRLF) · not in MIGRATED_LIST_FILES`, the `guard   live  budget  keep  seed` header with no guard row under it, `args    (no row holds this file)`.

Run: `git ls-files --eol tests/loading-boundaries.test.ts tests/list-frame-guards.test.ts`
Expected: `i/lf w/crlf` for both.

- [ ] **Step 2: Write the pin (`tests/loading-boundaries.test.ts`, CRLF; the new test strips `\r`)**

Save this block as `<temp>/t10-loading-block.ts`:

```ts
// Plan 2B-4 Task 10 (spec 2B §4.7, R-o): a loading boundary renders its skeleton and nothing else, so its width and shape
// come from the skeleton, which matches its page (Task 9). No wrapper and no width of its own.
test("every dashboard loading boundary renders only its skeleton (spec 2B §4.7)", () => {
  for (const [routePath, skeletonName] of [
    ["src/app/[locale]/(dashboard)/loading.tsx", "PageSkeleton"],
    ["src/app/[locale]/(dashboard)/assets/loading.tsx", "AssetRegisterPageSkeleton"],
    ["src/app/[locale]/(dashboard)/assets/[id]/loading.tsx", "AssetDetailPageSkeleton"],
    ["src/app/[locale]/(dashboard)/dashboard/loading.tsx", "DashboardPageSkeleton"],
    ["src/app/[locale]/(dashboard)/reports/loading.tsx", "ReportsPageSkeleton"],
  ] as const) {
    const source = readFileSync(routePath, "utf8").replace(/\r\n/g, "\n")
    assert.equal(source, `import { ${skeletonName} } from "@/components/ui/page-skeleton"\n\nexport default function Loading() {\n  return <${skeletonName} />\n}\n`, routePath)
  }
})
```

Run: `node <temp>/p2b4-append.mjs <temp>/t10-loading-block.ts tests/loading-boundaries.test.ts`
Expected: `appended <temp>/t10-loading-block.ts to tests/loading-boundaries.test.ts (CRLF)`

Run: `node --test tests/loading-boundaries.test.ts`
Expected: PASS, `tests 4 · pass 4 · fail 0` (the pin passes at once; see the Rulings).

- [ ] **Step 3: Add the five boundaries to `MIGRATED_LIST_FILES`**

Run, one after the other:
```bash
node <temp>/p2b-budget.mjs D/loading.tsx --migrated
node <temp>/p2b-budget.mjs D/assets/loading.tsx --migrated
node <temp>/p2b-budget.mjs "D/assets/[id]/loading.tsx" --migrated
node <temp>/p2b-budget.mjs D/dashboard/loading.tsx --migrated
node <temp>/p2b-budget.mjs D/reports/loading.tsx --migrated
```
Expected for each (exit 0): `MIGRATED_LIST_FILES: added` and `written: src/app/[locale]/(dashboard)/<…>/loading.tsx`.

- [ ] **Step 4: Run the tests for this task**

Run: `node --test tests/loading-boundaries.test.ts tests/page-loading-skeleton.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `tests 76 · pass 76 · fail 0` (`loading-boundaries` 4 · `page-loading-skeleton` 2 · `list-frame-guards` 21 · `visual-foundation-guards` 26 · `form-migration-guards` 23).

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` `tests 1961 · pass 1960 · fail 0 · skipped 1`, one test more than after Task 9 (1951 at c2bfbe2, plus four from Tasks 1–4 and six from Tasks 5–10); tsc no errors; lint 0 errors and the 146 warnings under `.agents/` (`npx eslint tests/loading-boundaries.test.ts` prints nothing).

Run: `git diff --stat` then `git status --short src tests messages`
Expected: 2 files: `tests/list-frame-guards.test.ts` 5 insertions, `tests/loading-boundaries.test.ts` 15 insertions. No file under `src` changed.

- [ ] **Step 5: The guard state after plan 2B-4**

Tasks 1–10 are in, so every budget holds its spec §10.4 table C column 2B-4 value (controller ruling (a)).

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected (exit 0; the header lines first):
```
ok      R7  TABLE_HEADER_FILLS  11 in  8 rows · live  11 in  8 files · over 0 · slack 0
ok      LH1 BUDGETS.LH1         18 in 18 rows · live  18 in 18 files · over 0 · slack 0
ok      LH2 BUDGETS.LH2          5 in  4 rows · live   5 in  4 files · over 0 · slack 0
ok      LB1 BUDGETS.LB1          7 in  7 rows · live   7 in  7 files · over 0 · slack 0
ok      LP1 BUDGETS.LP1          4 in  4 rows · live   4 in  4 files · over 0 · slack 0
ok      LF1 BUDGETS.LF1          1 in  1 rows · live   1 in  1 files · over 0 · slack 0
ok      LT1 BUDGETS.LT1         23 in  7 rows · live  23 in  7 files · over 0 · slack 0
ok      LT2 BUDGETS.LT2          1 in  1 rows · live   1 in  1 files · over 0 · slack 0
ok      LT3 BUDGETS.LT3          2 in  1 rows · live   2 in  1 files · over 0 · slack 0
ok      LT4 BUDGETS.LT4          1 in  1 rows · live   1 in  1 files · over 0 · slack 0
ok      LT5 BUDGETS.LT5          2 in  1 rows · live   2 in  1 files · over 0 · slack 0
ok      LV1 BUDGETS.LV1         15 in  4 rows · live  15 in  4 files · over 0 · slack 0
ok      LV2 BUDGETS.LV2         73 in 23 rows · live  73 in 23 files · over 0 · slack 0
ok      LV3 BUDGETS.LV3         16 in  4 rows · live  16 in  4 files · over 0 · slack 0
ok      LS1 BUDGETS.LS1         14 in 12 rows · live  14 in 12 files · over 0 · slack 0
ok      LS2 BUDGETS.LS2         15 in  5 rows · live  15 in  5 files · over 0 · slack 0
ok      LK1 BUDGETS.LK1          1 in  1 rows · live   1 in  1 files · over 0 · slack 0
ok      LN1 BUDGETS.LN1          4 in  3 rows · live   4 in  3 files · over 0 · slack 0
ok      LN2 BUDGETS.LN2          5 in  5 rows · live   5 in  5 files · over 0 · slack 0
ok      LR1 BUDGETS.LR1          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
budgets hold: no live count is over its row
```

Every row is `slack 0`: the LB1 `0 → 1` row of `D/maintenance/[id]/page.tsx` holds the bottom bar's arrow since Task 3. The totals against c2bfbe2 (controller ruling (a)): R7 17 → 11 (in 8 files) · LH1 24 → 18 · LH2 5 · LB1 live 11 → 7, budget 12 → 7 · LP1 7 → 4 · LF1 1 · LT1 34 → 23 · LT2 1 · LT3 2 · LT4 1 · LT5 3 → 2 · LV1 19 → 15 · LV2 97 → 73 · LV3 35 → 16 · LS1 17 → 14 · LS2 20 → 15 · LK1 7 → 1 · LN1 5 → 4 · LN2 7 → 5 · LR1 0. The other guards hold:
- VFG R1 `{}` (0) · R2 10 in 9 rows (unchanged in 2B-4) · R7 `TABLE_HEADER_FILLS` 11 in 8 rows, no `// 2B-4` group left (the 2B-5 rows `admin/logs` 1, `admin/roles` 2, `admin/storage` 3, `my-assets/page.tsx` 1, `responsive-report-list.tsx` 1, and the three 2C batch 4 rows)
- What stays per 2B-4 file is its `KEEP`: LP1 1 on `D/assets/[id]`, `D/maintenance/[id]`, `D/disposal/[id]` (the O11 padding, 2C plan 5) · LB1 1 on `D/maintenance/[id]` (the bottom bar's back item) · LV2 4 on `D/assets/[id]` (R-n sentences)
- `MIGRATED_LIST_FILES`: the 64 files of c2bfbe2, then the files Tasks 1–4 added, then this group's nine in commit order (`D/master-data/employees/[id]/page.tsx`, `D/master-data/suppliers/[id]/page.tsx`, `c/master-data/supplier-purchase-documents.tsx`, `D/my-assets/[id]/page.tsx`, `D/loading.tsx`, `D/assets/loading.tsx`, `D/assets/[id]/loading.tsx`, `D/dashboard/loading.tsx`, `D/reports/loading.tsx`); `c/ui/page-skeleton.tsx` stays out (Task 9)
- FMG (never edited by 2B): no file of Tasks 5–10 is in `BATCH_FILES`; every FMG test passes (23)

Run: `node --test tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `tests 70 · pass 70 · fail 0` (`list-frame-guards` 21 · `visual-foundation-guards` 26 · `form-migration-guards` 23).

If a total differs, the line `over` or `slack` names the file: a row of Tasks 1–4 is not at its Rulings value. Stop and report it; do not lower or raise a number here.

- [ ] **Step 6: Commit**

```bash
git add tests/loading-boundaries.test.ts tests/list-frame-guards.test.ts
git commit -m "test(ui): the five dashboard loading boundaries render only their skeleton and join MIGRATED_LIST_FILES (2B-4 task 10)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 2 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 11):** nothing beyond Task 9's skeleton row; the root boundary shows `PageSkeleton` (a header over a table) on any route without its own boundary.

---

### Task 11: Verify, production build and dev-app check (controller runs this task, not an implementer)

**Files:**
- Create then delete: `.claude/launch.json` (temporary; never committed)
- Evidence: `.superpowers/sdd/screenshots/ui-phase2b-plan4/after/` (git-ignored)
- Modify: only files needed to fix problems found here. Each fix gets its own small commit, with a test where one is possible, through an implementer and the normal review.

**Interfaces:**
- Consumes: Tasks 1–10 committed; the Task 0 ids, before images and measurements.
- Produces: the after images and `.superpowers/sdd/<plan workspace>/task-11-findings.md`, which Task 12 turns into the "Dev-app check" bullets.

- [ ] **Step 1: Full verify.** Run `npm run verify` (lint, tests, build). Record the test count and the build page count for Task 13. Run `node <temp>/p2b1-precheck.mjs --budgets`: every guard holds, with the totals of the Rulings and no slack.

- [ ] **Step 2: Production server.** Confirm the dev database (Task 0 Step 5). Create `.claude/launch.json` with `runtimeExecutable: "node"`, `runtimeArgs: ["node_modules/next/dist/bin/next", "start", "-p", "3001"]`, `port: 3001`, `autoPort: false`, and start it with `preview_start` from the main checkout. Log in with the seed admin; do not echo the password. Prefer `waitUntil: "load"` plus a short wait over `networkidle`. Playwright scripts run inline (`browser_run_code_unsafe` with `code`); if one must be a file, put it under `.playwright-mcp/` and delete it right after the run (`.playwright-mcp/` is linted).

- [ ] **Step 3: Writes nothing.** Open dialogs and drawers only to their first screen and close them with cancel, the X or Esc. Never confirm a cancel, a status correction, a transaction or a delete; never save a form. Count POST, PUT, PATCH and DELETE requests while doing so: 0 (read-only lookups the pages already send are listed by path).

- [ ] **Step 4: Screens.** Take every Task 0 view again under the same name in `after/` and compare (height, wrapping, truncation, lost color or shape). Then walk spec §8.8's dev-check table, in Thai plus one English pass at 1440, at 100% and 200% zoom (200% = a 720×450 viewport):
  - **`/th/assets/<id>` at 1440, 1024, 768 and 375:** the breadcrumbs, then the h1 is the asset name with the status badges in the meta line · opened from the register's page 2, "กลับ" lands on page 2 with the same filters · ⋯ before the main button, the main button last · the tabs are `TabNav` with no translucent count fill and keep their scroll and snap · both tables on the `DataTable` look (white header, no capitals) · the facts as `KeyValueList` (120px / 1fr from md, stacked on phones) · the bottom bar and its padding unchanged (O11).
  - **`/th/maintenance/<id>` and `/th/disposal/<id>` at 1440 and 375:** the back icon is the left arrow in the header and in the bottom bar · the disposal page has a back link on phones · the stepper sits where Task 4 placed it, unchanged inside.
  - **`/th/master-data/employees/<id>`, `/th/master-data/suppliers/<id>`, `/th/my-assets/<id>` at 1440 and 375:** no doubled `pb-24` and no content under the bottom bar (compare with Task 0 Step 9) · an empty supplier price shows "—", not 0.00 · the three tables of the employee page on the `DataTable` look.
  - **Skeletons at 1440 and 375 (throttled):** the five match their pages' shape at full width (no `max-w-7xl`) and the metric grid of `MetricGridSkeleton`.
  - **768 to 1023:** the sidebar, the bottom bar and the header's button row switch at their own breakpoints (`lg` / `md`) without overlap.
  - **Drawers and dialogs that 2C plan 4 owns, placed by this plan (cancel only):** on `/th/assets/<id>` the transaction cancel dialog, the evidence drawer, the activity drawer and the status correction dialog open and close as before.

- [ ] **Step 5: Keyboard.** Tab order on `/th/assets/<id>`: breadcrumbs → back → ⋯ → main button → tabs; the tabs take Tab and arrows do not trap; Esc closes every drawer and returns focus to its trigger; the back links show the focus ring.

- [ ] **Step 6: axe.** Inject `node_modules/axe-core/axe.min.js` with `page.addScriptTag({ path })` and run `axe.run(main, { runOnly: ["color-contrast", "label", "aria-valid-attr-value", "aria-required-attr", "button-name", "nested-interactive"] })` on each detail page of Step 4 at 1440 and 375 and on one skeleton. Expected: 0 violations.

- [ ] **Step 7: Forced colors and reduced motion.** With Playwright `emulateMedia`: focus rings on the back links, the tabs and ⋯; the selected tab's underline stays visible (the `TabNav` forced-colors border); table and `KeyValueList` lines visible. Reduced motion: skeletons do not pulse (`motion-reduce:animate-none` or equivalent), drawers do not slide.

- [ ] **Step 8: Load time.** Load `/th/assets/<id>` five times on the production server and record the median `responseEnd`; a page clearly slower than Task 0's number is recorded in the findings.

- [ ] **Step 9: NVDA and real devices.** If NVDA is not available to you, list these checks for the user and do not mark them done: the back link reads "กลับ" (or its label) · the h1 reads the asset name · the status badges read in the meta line · the current tab reads as current · `KeyValueList` reads term then value · a skeleton is silent or reads loading once. Real iPhone and iPad: the bottom bars clear the home bar; nothing hides under them; the detail tabs scroll and snap. `/th/my-assets/<id>` with an account that holds assets, if the seed admin holds none. Add them to the open manual checks; all of them must be done before the one phase-2 deploy.

- [ ] **Step 10: Findings report.** Write `task-11-findings.md` in the plan workspace, in the shape Task 12 fills its markers from:
  - **Fixes made:** commit + one line each, or "none".
  - **Checked and passed:** what was checked, where and at which widths, with the results.
  - **Bottom space:** one line per detail page at 375, before → after.
  - **Load time:** `/th/assets/<id>` before → after.
  - **Found but not caused by plan 2B-4.**
  - **Accepted mixes.**
  - **Still needs a person:** the Step 9 list and anything else not checked.

- [ ] **Step 11: Clean up.** Stop the server and delete `.claude/launch.json` and every helper script you put under the repo (`.playwright-mcp/` and `.superpowers/sdd/` are linted). `git status --short` must show no stray files.

---

### Task 12: Repo documentation for plan 2B-4 (the controller adds the verify numbers, the rebase and the wiki in Task 13)

Spec §10.6 row 2B-4, §8.14 row 2B-4 and the checklist of §4.10 (`DESIGN.md:571` "ต่อท้ายหัวข้อ Adaptive", `docs/14_UI_UX_DESIGN_SYSTEM.md:37-42`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md`), with the frame rules of §4.6 and the skeleton table of §4.7. Those line numbers are from `d38a0ee`; the numbers below are recounted at `c2bfbe2` (Tasks 1–11 do not touch these files). Five files change, all CRLF in the working tree (`i/lf w/crlf`): edit them with exact-string replacement, keep the endings, never run a formatter, and match on the quoted strings, not on line numbers.

Rulings made in this task:
- **What goes where (spec §10.6 row 2B-4, §8.14 row 2B-4, §4.10):**
  - `DESIGN.md` (6 replacements):
    - §5 Cards / Containers: the `KeyValueList` bullet (`:438`) says how detail pages use it (one list per group, `nilLabel`, `null` dates, `tag` codes, the unit), and a new **Detail pages** bullet after `StatStrip` (`:439`) gives the body of a detail page (facts, numbers, history tables, the asset view tabs). §8.14 says "DS has no section yet · by the section that holds the primitive", so the body goes where `KeyValueList` and `StatStrip` live.
    - §5 Navigation: one sub-bullet under **Page header** (after `:506`) for the detail-page header. The rule itself ("the title is the record's own name") came in 2B-1; the sub-bullet names the pages that follow it now and which header buttons hide below `md` because phones reach them elsewhere.
    - §7 Adaptive UI Contract: four bullets at its end, after `:616` (the `:571` of `d38a0ee`, "ต่อท้าย"): who owns the bottom space (the shell / the four O11 pages, guard LP1), the two breakpoints (the page frame at `md`, the shell at `lg`), full-width list and detail pages with forms and tools keeping their width and a `space-y-6` root, and skeletons in the shape of the real page. §4.10 writes this as one bullet; four short bullets read better and each carries one rule.
    - Two sentences whose numbers move with this plan (not in §10.6, moved the way plans 2B-2 and 2B-3 moved them): the R7 budget sentence of §5 Data Tables (`:516`, 17 → 11) and the empty-value counts of §5 Empty Values and Numbers (`:559`).
  - `docs/14_UI_UX_DESIGN_SYSTEM.md` (5 replacements): Navigation and Action Surfaces (`:42`) names the owner of the bottom space and adds the two breakpoints (§10.6) · the Shared Components rows `KeyValueList` (`:81`, to match `DESIGN.md`) and a new loading-state row after `:87` · the registry row of the 2B spec (`:116`) gains plan 2B-4 · the registry row Asset Detail and components (`:107`) points to spec 2B §4.4.5 and §5.5 and to plan 2B-4, because the asset name is now the title (the registry rule at `:101`; plan 2B-3 did the same for the register at `:106`).
  - `docs/11_FEATURE_LIST.md` (1 replacement): the Loading UX row (`:45`), the one feature row this plan changes. The rows Asset detail (`:103`), Contextual transaction shortcuts (`:151`) and Suppliers (`:267`) stay true.
  - `DEVELOPER_HANDOFF.md` (5 replacements): one pointer in each older bullet this plan made stale (`:70` the skeletons, `:153` the asset tab row, `:154` the asset header, `:310` the phase 1 deferred quick action), and the 2B-3 "Next" line (`:677`) with the new section before `## Open Go-Live Decisions` ("2C plan 5 may start once this branch and 2C plan 4 have both merged", the page frame, what changed, the guards, what 2C plan 5 inherits with the O11 line numbers, what waits for 2D).
  - `docs/99_CHANGELOG.md`: the Thai entry under `## <today>`, shaped like the 2B-3 entry.
  - `.impeccable/design.json`: **no change** (the page-header, table, tabs, stat-strip and key-value entries came in 2B-1, R-s; §10.6 row 2B-4 names none).
  - **Left as they are:** the `DESIGN.md:462` migration sentence ("plans 2B-3 to 2B-5 move the rest" of the list filters stays true, 2B-4 moves no filter, and 2C plan 4 edits the same bullet for its own fields) · `DESIGN.md:616` (the breadcrumb exception still holds: every page with a trail keeps its back button) · `DEVELOPER_HANDOFF.md:444` and `:481` (the pipeline lines are still true) · `DEVELOPER_HANDOFF.md:622` (the "Next" line of 2C plan 3, which 2C plan 4 edits) · `DEVELOPER_HANDOFF.md:634` (`src/lib/horizontal-scroll.ts` still serves `asset-detail-tabs.tsx`) · `docs/07_UAT_CHECKLIST.md` (the person checks of this plan go to the handoff's "Still open" list; §10.6 row 2B-4 names no UAT section).
- **The line numbers handed to 2C plan 5** are those in the files after Tasks 1–10 (checked on a copy of `c2bfbe2` with the code of Tasks 1–10). The check script recomputes each one from the files, so a Task 11 fix that moved a line fails the check and prints the fragment to write. 2C plan 4 shares no file with them (spec §8.3), but Task 13 re-runs the script after a rebase all the same.
- **The guard numbers** are not typed into the check script: it reads `TABLE_HEADER_FILLS` from VFG and `BUDGETS` and `MIGRATED_LIST_FILES` from LFG and builds the sentences the three docs must hold. After Task 10 they are the totals of spec §10.4 table C column 2B-4 (the controller's ruling (a)); Step 1 checks that. If 2C plan 4 merges first and lowers its R7 rows (the three "2C plan 4 or 2D" rows of `TABLE_HEADER_FILLS`), Task 13's re-run prints the merged sentences and Task 13 writes them.
- **The findings markers** (`<from task-11-findings.md>` three times in the handoff, `<จาก task-11-findings.md>` once in the changelog) come from `.superpowers/sdd/<plan workspace>/task-11-findings.md`, in the shape of the 2B plan 3 bullets: what was checked, where and at which widths, the results, the fixes with their commits or "none", accepted mixes, existing issues not caused by 2B-4, and what still needs a person. The bottom-space marker takes the "Bottom space" lines of the findings (each detail page at 375, before → after), and the load time of `/th/assets/<id>` goes into the "Dev-app check" paragraph. Task 13 adds its verify bullet directly above "Dev-app check (Task 11)" and "ตรวจบนแอป (Task 11)".
- **Dates:** the handoff heading and the changelog date use the day this task runs (`<today>`). If that day is 2026-10-13, the entry goes under the existing `## 2026-10-13` heading, above the 2B-3 entry; otherwise a new date block goes on top with the `---` separator the file uses.
- **The plan file name:** the docs link `docs/superpowers/plans/2026-10-13-ui-phase2b-plan4.md`. If the controller saved plan 2B-4 under another name, replace that path everywhere in this task (the check script's `PLAN` included) before Step 2.
- **Departures of Tasks 1–10 that the docs describe:** the text below follows the tasks as drafted. If the controller ruled otherwise on one of them, change these places before Step 2:
  - Task 6 with one supplier strip instead of two: in Step 4 (2) delete the sentence that starts "A money total needs a wide cell:" and drop its literal from check 5; in Step 7 (5) replace "the five local `MetricCard`s are two `StatStrip`s: the three counts, then the two money totals ("12,345.67 บาท"), one per row below `lg`" with "the five local `MetricCard`s are one `StatStrip`"; in Step 8 delete "ผู้ขายมี 2 แถบ (จำนวน 3 ช่อง แล้วยอดเงิน 2 ช่องซึ่งบนมือถืออยู่ช่องละแถว) · "; in check 3 change `split("<StatStrip").length - 1 === 2` to `=== 1` and drop `'className="max-lg:grid-cols-1"', `.
  - Task 9 without the lone-last-cell class: in Step 4 (6) delete ", a lone last cell filling its row"; in Step 7 (5) delete " (its lone last cell spans the row below `lg`)"; in check 3 drop `"max-lg:[&>:last-child:nth-child(odd)]:col-span-2", `.
  - Task 9 with the register toolbar of spec §4.7: in Step 7 (5) delete "; the register skeleton draws the toolbar of plan 2B-3".
  - Task 10 as five commits: in Step 7 (5) replace "Task 10 is one commit for the five boundaries, which did not change" with "the five boundaries did not change".
- **Rebase (Task 13 Step 2, spec I29):** `DESIGN.md`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md` and `docs/11_FEATURE_LIST.md` follow Task 13's rules. Same-line conflicts are likely only in `DESIGN.md:516` (the R7 sentence, if 2C plan 4 lowered its rows) and in the section order of the handoff and the changelog.

**Files:**
- Modify: `DESIGN.md` (`i/lf w/crlf`; 6 replacements): §5 Cards / Containers, `KeyValueList` (`:438`) and after `StatStrip` (`:439`) · §5 Navigation, Page header (`:506`) · §5 Data Tables (`:516`) · §5 Empty Values and Numbers (`:559`) · §7 Adaptive UI Contract (`:616`)
- Modify: `docs/14_UI_UX_DESIGN_SYSTEM.md` (`i/lf w/crlf`; 5 replacements): Navigation and Action Surfaces (`:42`) · Shared Components (`:81`, `:87`) · Current-Surface Registry (`:107`, `:116`)
- Modify: `docs/11_FEATURE_LIST.md` (`i/lf w/crlf`; 1 replacement): Loading UX (`:45`)
- Modify: `DEVELOPER_HANDOFF.md` (`i/lf w/crlf`; 5 replacements): `:70`, `:153`, `:154`, `:310`, and `:677-679` (the 2B plan 3 "Next" line and a new section before `## Open Go-Live Decisions`)
- Modify: `docs/99_CHANGELOG.md` (`i/lf w/crlf`; 1 or 2 replacements): the 2B-4 entry at the top (`:7`)
- Not changed: `.impeccable/design.json` (see the rulings) · `docs/07_UAT_CHECKLIST.md` · `src/`, `tests/`, `messages/` · the wiki (Task 13)
- Temp folder only, never committed: `<temp>/check-docs-2b4.mjs`

**Interfaces:**
- Consumes: Tasks 1–11 committed; `.superpowers/sdd/<plan workspace>/task-11-findings.md` (dev-app check, bottom space, load time, still open); the guard totals (`node <temp>/p2b1-precheck.mjs --budgets`, Task 0).
- Produces:
  - `DEVELOPER_HANDOFF.md` section `## UI Round 4 Phase 2B Plan 4 Detail Pages and Loading Skeletons (<today>)` with a `- Dev-app check (Task 11):` bullet; `docs/99_CHANGELOG.md` entry `### หน้ารายละเอียดและ skeleton (UI รอบ 4 เฟส 2B plan 4)` with a `- **ตรวจบนแอป (Task 11):**` bullet. Task 13 adds its verify bullet directly above each.
  - The hand-off of spec §8.8 and §4.6.4 that 2C plan 5 reads in its Task 0 (spec §8.10 row 8): the new line numbers of the O11 roots, the two mobile bars and the stepper, the `md` switch of the bars, the return items of the bars, and `getMobileSafeBottomPaddingClasses` with its pin.
  - The `DESIGN.md` frame rules (bottom space, breakpoints, width, skeletons) and the detail-page pattern that plan 2B-5 and phase 3 start from.

- [ ] **Step 1: Check the base**

Run: `git diff --quiet c2bfbe2 HEAD -- DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md docs/11_FEATURE_LIST.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md .impeccable/design.json && echo DOCS-UNCHANGED`
Expected: `DOCS-UNCHANGED` (Tasks 1–11 did not touch them; if a Task 11 fix did, re-read the quoted strings below against the file).

Run: `git diff --quiet c2bfbe2 HEAD -- messages && echo MESSAGES-UNCHANGED`
Expected: `MESSAGES-UNCHANGED` (the docs say this plan has no message change).

Run: `git ls-files --eol DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md docs/11_FEATURE_LIST.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md .impeccable/design.json`
Expected: `i/lf    w/crlf` for all six.

Run: `ls docs/superpowers/plans/2026-10-13-ui-phase2b-plan4.md .superpowers/sdd/*/task-11-findings.md`
Expected: both exist (the docs link the plan; the findings fill the markers). If the plan has another name, see the rulings.

Run: `git status --short src tests messages`
Expected: nothing.

Run: `node <temp>/p2b1-precheck.mjs --budgets`
Expected (exit 0; Node may print a `MODULE_TYPELESS_PACKAGE_JSON` warning on stderr, ignore it): the info lines `info    VFG R7: per file, TABLE_HEADER_FILLS 11 in 8 rows` and `… MIGRATED_LIST_FILES 77 files`, `budgets hold: no live count is over its row`, and these totals:
```
ok      R7  TABLE_HEADER_FILLS  11 in  8 rows · live  11 in  8 files · over 0 · slack 0
ok      LH1 BUDGETS.LH1         18 in 18 rows · live  18 in 18 files · over 0 · slack 0
ok      LH2 BUDGETS.LH2          5 in  4 rows · live   5 in  4 files · over 0 · slack 0
ok      LB1 BUDGETS.LB1          7 in  7 rows · live   7 in  7 files · over 0 · slack 0
ok      LP1 BUDGETS.LP1          4 in  4 rows · live   4 in  4 files · over 0 · slack 0
ok      LF1 BUDGETS.LF1          1 in  1 rows · live   1 in  1 files · over 0 · slack 0
ok      LT1 BUDGETS.LT1         23 in  7 rows · live  23 in  7 files · over 0 · slack 0
ok      LT2 BUDGETS.LT2          1 in  1 rows · live   1 in  1 files · over 0 · slack 0
ok      LT3 BUDGETS.LT3          2 in  1 rows · live   2 in  1 files · over 0 · slack 0
ok      LT4 BUDGETS.LT4          1 in  1 rows · live   1 in  1 files · over 0 · slack 0
ok      LT5 BUDGETS.LT5          2 in  1 rows · live   2 in  1 files · over 0 · slack 0
ok      LV1 BUDGETS.LV1         15 in  4 rows · live  15 in  4 files · over 0 · slack 0
ok      LV2 BUDGETS.LV2         73 in 23 rows · live  73 in 23 files · over 0 · slack 0
ok      LV3 BUDGETS.LV3         16 in  4 rows · live  16 in  4 files · over 0 · slack 0
ok      LS1 BUDGETS.LS1         14 in 12 rows · live  14 in 12 files · over 0 · slack 0
ok      LS2 BUDGETS.LS2         15 in  5 rows · live  15 in  5 files · over 0 · slack 0
ok      LK1 BUDGETS.LK1          1 in  1 rows · live   1 in  1 files · over 0 · slack 0
ok      LN1 BUDGETS.LN1          4 in  3 rows · live   4 in  3 files · over 0 · slack 0
ok      LN2 BUDGETS.LN2          5 in  5 rows · live   5 in  5 files · over 0 · slack 0
ok      LR1 BUDGETS.LR1          0 in  0 rows · live   0 in  0 files · over 0 · slack 0
```
These are the numbers the check script reads from the guard files and Steps 4, 7 and 8 write. If a total differs, the script of Step 2 still builds the right sentences from the files: write the ones it prints in Step 3 and say so in the task report.

Run: `node -e "console.log(new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }))"`
Expected: a date such as `2026-10-13`. This is `<today>` in Steps 7 and 8: replace every `<today>` below with it.

- [ ] **Step 2: Write the check script (it fails first).** Save as `check-docs-2b4.mjs` in your temp folder:

```js
// check-docs-2b4.mjs: run from the repo root. Checks the plan 2B-4 docs edits of Task 12, the code facts they state,
// the guard numbers they quote (read from the guard files, not typed here), and that the line numbers the handoff gives
// 2C plan 5 are the ones in the files now. Reads only. Never commit this file.
import { existsSync, readFileSync } from "node:fs"

const PLAN = "docs/superpowers/plans/2026-10-13-ui-phase2b-plan4.md"
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
const HANDOFF = "## UI Round 4 Phase 2B Plan 4 Detail Pages and Loading Skeletons ("
const ENTRY = "### หน้ารายละเอียดและ skeleton (UI รอบ 4 เฟส 2B plan 4)"
const handoff = section("DEVELOPER_HANDOFF.md", HANDOFF)
const log = text["docs/99_CHANGELOG.md"]
const entryAt = log.indexOf(`\n${ENTRY}\n`)
const entryEnd = entryAt < 0 ? -1 : log.slice(entryAt + ENTRY.length + 2).search(/\n### |\n---\n/)
const entry = entryAt < 0 ? "" : log.slice(entryAt, entryEnd < 0 ? undefined : entryAt + ENTRY.length + 2 + entryEnd)

// The code facts the docs state (after Tasks 1–10).
const C = "src/components/"
const D = "src/app/[locale]/(dashboard)/"
const source = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const has = (path, ...literals) => literals.every((literal) => source(path).includes(literal))
const lacks = (path, ...literals) => literals.every((literal) => !source(path).includes(literal))
const ASSET = `${D}assets/[id]/page.tsx`
const TABS = `${C}assets/asset-detail-tabs.tsx`
const REPAIR = `${D}maintenance/[id]/page.tsx`
const DISPOSAL = `${D}disposal/[id]/page.tsx`
const ROUND = `${D}audit/rounds/[id]/page.tsx`
const EMPLOYEE = `${D}master-data/employees/[id]/page.tsx`
const SUPPLIER = `${D}master-data/suppliers/[id]/page.tsx`
const DOCUMENTS = `${C}master-data/supplier-purchase-documents.tsx`
const MY_ASSET = `${D}my-assets/[id]/page.tsx`
const SKELETON = `${C}ui/page-skeleton.tsx`
const BOUNDARIES = {
  [`${D}loading.tsx`]: "PageSkeleton",
  [`${D}assets/loading.tsx`]: "AssetRegisterPageSkeleton",
  [`${D}assets/[id]/loading.tsx`]: "AssetDetailPageSkeleton",
  [`${D}dashboard/loading.tsx`]: "DashboardPageSkeleton",
  [`${D}reports/loading.tsx`]: "ReportsPageSkeleton",
}
const message = (locale, key) => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).asset?.[key]
const lfg = source("tests/list-frame-guards.test.ts")
const migratedBlock = lfg.match(/const MIGRATED_LIST_FILES: string\[\] = \[([\s\S]*?)\n\]/)?.[1] ?? ""
const migratedRows = migratedBlock.split("\n").filter((line) => /^\s+[`"]/.test(line))
const migrated = (path) => migratedBlock.includes(`\`${path.replace(D, "${D}").replace(C, "${C}")}\``)
const PLAN_FILES = [ASSET, TABS, REPAIR, DISPOSAL, EMPLOYEE, SUPPLIER, DOCUMENTS, MY_ASSET, ...Object.keys(BOUNDARIES)]
const facts = {
  "the asset page: PageHeader with the asset name, PageBackLink, KeyValueList, StatStrip, DataTable; no h1, Info, SummaryStrip or opacity-70":
    has(ASSET, "title={asset.name}", "back={<PageBackLink href={returnToHref}", "<KeyValueList", "<StatStrip", "<DataTable framed={false}") &&
    lacks(ASSET, "<h1", "function Info(", "function SummaryStrip(", "opacity-70"),
  "the view tabs: the client wrapper renders TabNav with snap-start and no translucent count":
    has(TABS, '"use client"', "<TabNav", 'linkClassName="snap-start"') && lacks(TABS, "bg-white/20"),
  "the repair page: the asset name, ArrowLeft on the bar's back item, no Wrench and no Info":
    has(REPAIR, "title={ticket.asset.name}", 'label: tCommon("back"), icon: <ArrowLeft className="h-4 w-4" />') && lacks(REPAIR, "Wrench", "function Info("),
  "the disposal page: the asset name, a back button outside the md group, no Info":
    has(DISPOSAL, "title={disposalRequest.asset.name}", 'back={<PageBackLink href={returnToHref} label={tCommon("back")} />}', '<div className="hidden items-center gap-2 md:flex">') &&
    lacks(DISPOSAL, "function Info("),
  "the employee, supplier and my-asset pages: PageHeader and KeyValueList in a plain space-y-6 root, no pb-24":
    [EMPLOYEE, SUPPLIER, MY_ASSET].every((path) => has(path, "<PageHeader", "<KeyValueList", '<div className="space-y-6">') && !/\bpb-(?:24|36)\b/.test(source(path))),
  "the supplier page: two StatStrips, the money one a column below lg, the Baht header key; the documents on DataTable":
    source(SUPPLIER).split("<StatStrip").length - 1 === 2 && has(SUPPLIER, 'className="max-lg:grid-cols-1"', 'tAsset("purchaseDocumentAmountBaht")') &&
    has(DOCUMENTS, "<DataTable") && lacks(DOCUMENTS, "<table", "formatCurrency", ".toLocaleString()"),
  "the skeletons: five full-width gap-6 frames, the StatStrip lone-cell class, no max-w-7xl":
    (source(SKELETON).match(/aria-busy="true" className="flex w-full flex-col gap-6"/g) ?? []).length === 5 &&
    has(SKELETON, "max-lg:[&>:last-child:nth-child(odd)]:col-span-2", "motion-safe:animate-pulse") && lacks(SKELETON, "max-w-7xl"),
  "the five loading boundaries render their skeleton and nothing else":
    Object.entries(BOUNDARIES).every(([path, name]) => source(path) === `import { ${name} } from "@/components/ui/page-skeleton"\n\nexport default function Loading() {\n  return <${name} />\n}\n`),
  "O11 is where 2C plan 5 finds it: the four roots, md:hidden on both bars, the unused padding helper":
    has(ASSET, '<div className="space-y-6 pb-24 md:pb-0">') && has(REPAIR, '<div className="space-y-6 pb-24 md:pb-0">') &&
    has(DISPOSAL, '<div className="space-y-6 pb-36 md:pb-0">') && has(ROUND, '<div className="pb-24 md:pb-0">') &&
    has(`${C}ui/mobile-action-bar.tsx`, "md:hidden") && has(`${C}disposal/disposal-mobile-action-bar.tsx`, "md:hidden") &&
    has("src/lib/design-system.ts", "export function getMobileSafeBottomPaddingClasses()"),
  "messages: no new key; asset.purchaseDocumentAmountBaht reads ยอดรวม (บาท) and asset.latestMaintenance is still there":
    message("th", "purchaseDocumentAmountBaht") === "ยอดรวม (บาท)" && typeof message("en", "purchaseDocumentAmountBaht") === "string" &&
    typeof message("th", "latestMaintenance") === "string" && typeof message("en", "latestMaintenance") === "string",
  "tests/mobile-field-navigation.test.ts lists /th/my-assets/asset-1": source("tests/mobile-field-navigation.test.ts").includes('"/th/my-assets/asset-1"'),
  "MIGRATED_LIST_FILES holds the 13 files of the plan and not page-skeleton.tsx": PLAN_FILES.every(migrated) && !migrated(SKELETON),
}
const missingFacts = Object.entries(facts).filter(([, ok]) => !ok).map(([name]) => name)

// The guard numbers the docs quote, read from the guard files (spec §10.4 table C column 2B-4 is what they hold).
const block = (path, head) => {
  const all = source(path)
  const at = all.indexOf(head)
  return at < 0 ? "" : all.slice(at, all.indexOf("\n}\n", at))
}
const ROW = /^\s+(?:\[`[^`]+`\]|"[^"]+"): (\d+),/
const r7Rows = block("tests/visual-foundation-guards.test.ts", "const TABLE_HEADER_FILLS: Record<").split("\n").map((line) => ROW.exec(line)).filter(Boolean).map((match) => Number(match[1]))
const r7 = { total: r7Rows.reduce((sum, value) => sum + value, 0), files: r7Rows.length }
const budgets = {}
let guard
for (const line of block("tests/list-frame-guards.test.ts", "const BUDGETS: Record<").split("\n")) {
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
// The budgets at c2bfbe2 (LB1 12 with live 11), to tell the changelog which numbers moved.
const AT_BASE = { LH1: 24, LH2: 5, LB1: 12, LP1: 7, LF1: 1, LT1: 34, LT2: 1, LT3: 2, LT4: 1, LT5: 3, LV1: 19, LV2: 97, LV3: 35, LS1: 17, LS2: 20, LK1: 7, LN1: 5, LN2: 7, LR1: 0 }
const list = (guards) => guards.map((id) => `${id} ${budgets[id]}`).join(" · ")
const moved = GUARDS.filter((id) => budgets[id] !== AT_BASE[id])
const kept = GUARDS.filter((id) => budgets[id] === AT_BASE[id])
const liveGuards = {
  "DESIGN.md": [
    `Table-header fills (\`bg-muted/NN\`) keep a budget per file (\`TABLE_HEADER_FILLS\`, guard R7): 44 at the start of 2B, 29 after plan 2B-1, 17 after plans 2B-2 and 2B-3, ${r7.total} after plan 2B-4; the commit that moves a table deletes its row.`,
    `After plan 2B-4, guard LV2 counts ${budgets.LV2} typed \`"-"\`, LV1 ${budgets.LV1} bare \`toLocaleString()\` calls and LV3 ${budgets.LV3} \`formatCurrency(\` calls on screens (97, 19 and 35 after plan 2B-3; 98, 19 and 36 after plan 2B-2; 113, 20 and 42 after plan 2B-1).`,
  ],
  "DEVELOPER_HANDOFF.md": [
    `  - VFG: R7 \`TABLE_HEADER_FILLS\` 17 in 11 files → ${r7.total} in ${r7.files}; the \`// 2B-4\` group is gone (the asset page 2, the employee page 3, the purchase documents 1) · R1 \`{}\` · R2 10 in 9 files, unchanged.`,
    `  - LFG after this plan (live counts): ${list(GUARDS)}. LB1's budget went 12 → ${budgets.LB1} with no slack left. \`MIGRATED_LIST_FILES\` holds ${migratedRows.length} files:`,
  ],
  "docs/99_CHANGELOG.md": [
    `- **guard:** VFG R7 17 → ${r7.total} (${r7.files} ไฟล์) · R1 \`{}\` · R2 10 คงเดิม · LFG หลัง plan: ${list(moved)} (${list(kept)} คงเดิม) · \`MIGRATED_LIST_FILES\` ${migratedRows.length} ไฟล์`,
  ],
}
const guardScope = { "DESIGN.md": text["DESIGN.md"], "DEVELOPER_HANDOFF.md": handoff, "docs/99_CHANGELOG.md": entry }
const missingGuards = Object.entries(liveGuards).flatMap(([path, fragments]) => fragments.filter((fragment) => !guardScope[path].includes(fragment)).map((fragment) => `${path}: ${fragment}`))

// The line numbers the handoff hands to 2C plan 5 (spec §8.8, §4.6.4), recomputed from the files.
const lines = (path) => source(path).split("\n")
const lineOf = (rows, test, from = 0) => {
  for (let index = from; index < rows.length; index += 1) if (test(rows[index])) return index + 1
  return 0
}
const span = (rows, head) => {
  const start = lineOf(rows, (row) => row.includes(head))
  return `${start}-${lineOf(rows, (row) => row.trim() === "/>", start)}`
}
const asset = lines(ASSET)
const repair = lines(REPAIR)
const disposal = lines(DISPOSAL)
const round = lines(ROUND)
const designSystem = lines("src/lib/design-system.ts")
const helper = lineOf(designSystem, (row) => row.startsWith("export function getMobileSafeBottomPaddingClasses()"))
const repairBar = lineOf(repair, (row) => row.includes("<MobileActionBar"))
const roundBar = lineOf(round, (row) => row.includes("<MobileActionBar"))
const handedOn = [
  `In \`D/assets/[id]/page.tsx\`, the root \`<div className="space-y-6 pb-24 md:pb-0">\` \`:${lineOf(asset, (row) => row.includes('<div className="space-y-6 pb-24 md:pb-0">'))}\` (it was \`:882\`) and \`<MobileActionBar\` \`:${lineOf(asset, (row) => row.includes("<MobileActionBar"))}\` (it was \`:989\`)`,
  `in \`D/maintenance/[id]/page.tsx\`, the root \`<div className="space-y-6 pb-24 md:pb-0">\` \`:${lineOf(repair, (row) => row.includes('<div className="space-y-6 pb-24 md:pb-0">'))}\` (it was \`:105\`) and \`<MobileActionBar\` \`:${span(repair, "<MobileActionBar")}\` (it was \`:142-149\`), whose back item \`:${lineOf(repair, (row) => row.includes('label: tCommon("back")'), repairBar)}\` (it was \`:147\`) now shows \`ArrowLeft\``,
  `in \`D/disposal/[id]/page.tsx\`, the root \`<div className="space-y-6 pb-36 md:pb-0">\` \`:${lineOf(disposal, (row) => row.includes('<div className="space-y-6 pb-36 md:pb-0">'))}\` (it was \`:170\`), \`<DisposalWorkflowStepper\` \`:${span(disposal, "<DisposalWorkflowStepper")}\` (it was \`:205-215\`), \`<DisposalMobileActionBar\` \`:${span(disposal, "<DisposalMobileActionBar")}\` (it was \`:222-229\`) and the header group \`<div className="hidden items-center gap-2 md:flex">\` \`:${lineOf(disposal, (row) => row.includes('<div className="hidden items-center gap-2 md:flex">'))}\``,
  `in \`D/audit/rounds/[id]/page.tsx\` (as plan 2B-2 left it), the root \`<div className="pb-24 md:pb-0">\` \`:${lineOf(round, (row) => row.includes('<div className="pb-24 md:pb-0">'))}\` and \`<MobileActionBar\` \`:${roundBar}\`, whose back item is \`:${lineOf(round, (row) => row.includes('label: tCommon("back")'), roundBar)}\``,
  `\`md:hidden\` on \`src/components/ui/mobile-action-bar.tsx:${lineOf(lines(`${C}ui/mobile-action-bar.tsx`), (row) => row.includes("md:hidden"))}\` and \`src/components/disposal/disposal-mobile-action-bar.tsx:${lineOf(lines(`${C}disposal/disposal-mobile-action-bar.tsx`), (row) => row.includes("md:hidden"))}\``,
  `\`getMobileSafeBottomPaddingClasses()\` \`src/lib/design-system.ts:${helper}-${lineOf(designSystem, (row) => row === "}", helper)}\` has no caller, and \`tests/audit-scan-search-ui.test.ts:${lineOf(lines("tests/audit-scan-search-ui.test.ts"), (row) => row.includes("assert.match(designSystem, /pb-"))}\` pins its class string`,
]
const missingHandedOn = handedOn.filter((fragment) => !handoff.includes(fragment))

// The newest date block of the changelog: from the first "## yyyy-mm-dd" heading to the "---" after it.
const newest = /\n## \d{4}-\d{2}-\d{2}\n/.exec(log)
const newestEnd = newest ? log.indexOf("\n---\n", newest.index) : -1
const newestBlock = newest ? log.slice(newest.index, newestEnd < 0 ? undefined : newestEnd) : ""

const checks = [
  ["every file is CRLF only", files.every((path) => !/(^|[^\r])\n/.test(raw[path]))],
  ["no <today> or findings marker is left", files.every((path) => none(path, "<today>", "<from task-11-findings.md>", "<จาก task-11-findings.md>"))],
  ["the code facts the docs state hold (after Tasks 1–10)", missingFacts.length === 0],
  [
    "the plan file the docs link exists",
    existsSync(PLAN) &&
      count("docs/14_UI_UX_DESIGN_SYSTEM.md", `](superpowers/plans/${PLAN.slice("docs/superpowers/plans/".length)})`) === 2 &&
      handoff.includes(`plan \`${PLAN}\``) &&
      once("docs/99_CHANGELOG.md", `plan \`${PLAN}\``),
  ],
  [
    "DESIGN.md: KeyValueList and the detail-page body (Cards / Containers)",
    once(
      "DESIGN.md",
      "a 13px faint label in a 120px column and the values in ink; below `sm` one column, each label above its value. Use one list per group of facts.",
      "Pass `null` for a missing date, never the \"-\" a date formatter prints.",
      "after plan 2B-4 the last one is `Info` in `asset-movement-timeline.tsx` (2D).",
      "- **Detail pages** (since plan 2B-4; their header follows **Page header** in Navigation):",
      "the supplier page puts its two totals in a second strip that is one column below `lg` (`className=\"max-lg:grid-cols-1\"`)",
      "A history table inside a padded section is `DataTable framed={false}` with a `caption` (the section's title) and `scrollHint`;",
      "rendered by the client wrapper `AssetDetailTabs`",
    ) &&
      none("DESIGN.md", "a 120px faint label column and the values in ink, one column below `sm`", "(guard LK1: no local `Info` or `DetailItem` helper)") &&
      before("DESIGN.md", "- **`StatStrip`** (`src/components/ui/stat-strip.tsx`, server-safe)", "- **Detail pages** (since plan 2B-4;") &&
      before("DESIGN.md", "- **Detail pages** (since plan 2B-4;", "### Inputs / Fields"),
  ],
  [
    "DESIGN.md: the detail-page header (Navigation, Page header)",
    once(
      "DESIGN.md",
      "  - Detail pages follow these rules since plan 2B-4 (the asset, repair record, disposal request, employee, supplier and my-asset pages):",
      "The my-asset page has no trail, so its title stays the page's name.",
      "the back button shows at every width.",
    ) &&
      before("DESIGN.md", "never the same code.\n  - Detail pages follow these rules since plan 2B-4", "  - The buttons are `md`, in this order: back, ⋯, secondary, primary."),
  ],
  [
    "DESIGN.md: the four frame bullets at the end of the Adaptive UI Contract",
    once(
      "DESIGN.md",
      "Links inside a sentence are exempt as well.\n- **Bottom space:** the dashboard shell leaves room for Mobile Field Navigation while it shows",
      "until phase 2C plan 5 moves them to `actionBarPagePadding`. Guard LP1 keeps `pb-24` and `pb-36` to those four;",
      "- **Two breakpoints:** a page's own frame switches at `md` (768px):",
      "The shell switches at `lg` (1024px): the sidebar, Mobile Field Navigation and the shell's bottom space.",
      "- **Page width and rhythm:** list and detail pages fill the content area, with no `max-w-*` on their root;",
      "- **Loading skeletons** (`src/components/ui/page-skeleton.tsx`, server-safe;",
      "A plan that reshapes a page reshapes its skeleton in the same commit.\n\n### Supporting Documents",
    ),
  ],
  [
    "docs/14: the bottom-space owner and the two breakpoints, the KeyValueList and skeleton rows, the registry rows",
    once(
      "docs/14_UI_UX_DESIGN_SYSTEM.md",
      "- Reserve safe-area-aware content spacing only for the active bar: the dashboard shell reserves it for Mobile Field Navigation,",
      "- The page frame (the `PageHeader` row, the words of the back button, the page's own action bar) switches at `md`;",
      "| Label and value pairs | `KeyValueList` | one list per group of facts on a detail page;",
      "| A loading state for a route | one export of `src/components/ui/page-skeleton.tsx`, rendered alone by the route's `loading.tsx` |",
      "§4.4.5 and §5.5 (the asset name as the title, the code and the badges in the meta row)",
      "sequences plan 2B-4 (the detail pages, the asset view tabs and the loading skeletons); plan 2B-5 follows (spec §10.3). |",
    ) &&
      none("docs/14_UI_UX_DESIGN_SYSTEM.md", "plans 2B-4 and 2B-5 follow (spec §10.3)", "| Label and value pairs | `KeyValueList` | empty values become `Nil` by themselves |") &&
      before("docs/14_UI_UX_DESIGN_SYSTEM.md", "| An empty state | `EmptyNote` for one line", "| A loading state for a route |") &&
      before("docs/14_UI_UX_DESIGN_SYSTEM.md", "| A loading state for a route |", "| A dialog | `AccessibleDialog`"),
  ],
  [
    "docs/11: the Loading UX row",
    once("docs/11_FEATURE_LIST.md", "| Loading UX | Shared page skeletons in the shape of their pages, at full width") &&
      none("docs/11_FEATURE_LIST.md", "with route-specific skeletons for Dashboard and Asset Register |"),
  ],
  [
    "handoff: the skeleton, asset tab, asset header and quick action bullets and the 2B-3 Next line point to plan 2B-4",
    once(
      "DEVELOPER_HANDOFF.md",
      "Since phase 2B plan 4 each skeleton takes the shape of its page at full width",
      "Since phase 2B plan 4 the tab row is the shared `TabNav`",
      "Since phase 2B plan 4 that header is `PageHeader`: the asset name is the `h1`",
      "since 2B plan 4 the disabled quick actions use the faint ink without opacity, which is AA on `background`)",
      "- Next: 2B plan 4 (below, the detail pages and skeletons) in the main checkout and 2C plan 4 in the worktree `.worktrees/ui-phase2c-plan4` beside it",
    ) &&
      none("DEVELOPER_HANDOFF.md", "- Next: merge this branch; then 2B plan 4 (the detail pages and skeletons) in the main checkout"),
  ],
  [
    "handoff: the 2B-4 section after 2B-3 and before Open Go-Live Decisions, with its bullets",
    count("DEVELOPER_HANDOFF.md", HANDOFF) === 1 &&
      before("DEVELOPER_HANDOFF.md", "## UI Round 4 Phase 2B Plan 3 Asset Register (", HANDOFF) &&
      before("DEVELOPER_HANDOFF.md", HANDOFF, "## Open Go-Live Decisions") &&
      [
        "- **2C plan 5 may start once this branch and 2C plan 4 have both merged**",
        "- **Page frame**",
        "- **What changed, file by file:**",
        "- **Messages:** none new or changed.",
        "- **Guards:**",
        "- **Tests:**",
        "- **Risks:**",
        "- **Handed on to 2C plan 5:**",
        "- **Handed on, later (2D):**",
        "- Dev-app check (Task 11):",
        "- Still open, for a person before the one phase-2 deploy:",
        "- Next: merge this branch;",
      ].every((literal) => handoff.split(literal).length === 2),
  ],
  ["handoff: the 2C plan 5 lines are the live ones", missingHandedOn.length === 0],
  ["the guard numbers in DESIGN.md, the handoff and the changelog are the ones the guard files hold", missingGuards.length === 0],
  [
    "changelog: the 2B-4 entry in the newest date block, above the 2B-3 entry",
    once("docs/99_CHANGELOG.md", ENTRY, "- **ตรวจบนแอป (Task 11):**") &&
      newestBlock.includes(`\n${ENTRY}\n`) &&
      before("docs/99_CHANGELOG.md", ENTRY, "### ทะเบียนทรัพย์สิน (UI รอบ 4 เฟส 2B plan 3)"),
  ],
]
let failed = 0
checks.forEach(([name, ok], index) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${String(index + 1).padStart(2)} ${name}`)
  if (!ok) failed += 1
})
if (missingFacts.length) console.log(`these code facts do not hold:\n${missingFacts.join("\n")}`)
if (missingHandedOn.length) console.log(`the handoff section lacks these live fragments:\n${missingHandedOn.join("\n")}`)
if (missingGuards.length) console.log(`these guard fragments are missing:\n${missingGuards.join("\n")}`)
process.exit(failed ? 1 : 0)
```

- [ ] **Step 3: Run it**

Run: `node <temp>/check-docs-2b4.mjs`
Expected: exit 1 (ignore a `MODULE_TYPELESS_PACKAGE_JSON` warning on stderr). Checks 1–3 print `ok` (the files are CRLF, no marker yet, and the code of Tasks 1–10 says what the docs will say); checks 4–14 print `FAIL`; then these two lists:
```
the handoff section lacks these live fragments:
In `D/assets/[id]/page.tsx`, the root `<div className="space-y-6 pb-24 md:pb-0">` `:886` (it was `:882`) and `<MobileActionBar` `:979` (it was `:989`)
in `D/maintenance/[id]/page.tsx`, the root `<div className="space-y-6 pb-24 md:pb-0">` `:109` (it was `:105`) and `<MobileActionBar` `:146-153` (it was `:142-149`), whose back item `:151` (it was `:147`) now shows `ArrowLeft`
in `D/disposal/[id]/page.tsx`, the root `<div className="space-y-6 pb-36 md:pb-0">` `:174` (it was `:170`), `<DisposalWorkflowStepper` `:199-209` (it was `:205-215`), `<DisposalMobileActionBar` `:216-223` (it was `:222-229`) and the header group `<div className="hidden items-center gap-2 md:flex">` `:190`
in `D/audit/rounds/[id]/page.tsx` (as plan 2B-2 left it), the root `<div className="pb-24 md:pb-0">` `:437` and `<MobileActionBar` `:490`, whose back item is `:495`
`md:hidden` on `src/components/ui/mobile-action-bar.tsx:18` and `src/components/disposal/disposal-mobile-action-bar.tsx:21`
`getMobileSafeBottomPaddingClasses()` `src/lib/design-system.ts:112-114` has no caller, and `tests/audit-scan-search-ui.test.ts:188` pins its class string
these guard fragments are missing:
DESIGN.md: Table-header fills (`bg-muted/NN`) keep a budget per file (`TABLE_HEADER_FILLS`, guard R7): 44 at the start of 2B, 29 after plan 2B-1, 17 after plans 2B-2 and 2B-3, 11 after plan 2B-4; the commit that moves a table deletes its row.
DESIGN.md: After plan 2B-4, guard LV2 counts 73 typed `"-"`, LV1 15 bare `toLocaleString()` calls and LV3 16 `formatCurrency(` calls on screens (97, 19 and 35 after plan 2B-3; 98, 19 and 36 after plan 2B-2; 113, 20 and 42 after plan 2B-1).
DEVELOPER_HANDOFF.md:   - VFG: R7 `TABLE_HEADER_FILLS` 17 in 11 files → 11 in 8; the `// 2B-4` group is gone (the asset page 2, the employee page 3, the purchase documents 1) · R1 `{}` · R2 10 in 9 files, unchanged.
DEVELOPER_HANDOFF.md:   - LFG after this plan (live counts): LH1 18 · LH2 5 · LB1 7 · LP1 4 · LF1 1 · LT1 23 · LT2 1 · LT3 2 · LT4 1 · LT5 2 · LV1 15 · LV2 73 · LV3 16 · LS1 14 · LS2 15 · LK1 1 · LN1 4 · LN2 5 · LR1 0. LB1's budget went 12 → 7 with no slack left. `MIGRATED_LIST_FILES` holds 77 files:
docs/99_CHANGELOG.md: - **guard:** VFG R7 17 → 11 (8 ไฟล์) · R1 `{}` · R2 10 คงเดิม · LFG หลัง plan: LH1 18 · LB1 7 · LP1 4 · LT1 23 · LT5 2 · LV1 15 · LV2 73 · LV3 16 · LS1 14 · LS2 15 · LK1 1 · LN1 4 · LN2 5 (LH2 5 · LF1 1 · LT2 1 · LT3 2 · LT4 1 · LR1 0 คงเดิม) · `MIGRATED_LIST_FILES` 77 ไฟล์
```
These are the fragments Steps 4, 7 and 8 write. If check 3 fails, the script prints the code facts that do not hold: a task left the code different from what the docs say, so find which and stop. If a fragment differs from the text below (a Task 11 fix moved a line, or a total differs), use the printed fragment in Steps 4, 7 and 8 instead of the text below and say so in the task report.

- [ ] **Step 4: `DESIGN.md` (6 replacements)**

(1) §5 Cards / Containers, the `KeyValueList` bullet. Replace the whole line:

```
- **`KeyValueList`** (`src/components/ui/key-value-list.tsx`, server-safe): the label and value pairs of a detail page, a 120px faint label column and the values in ink, one column below `sm`. Empty values show `Nil`; 0 and `false` show as values (guard LK1: no local `Info` or `DetailItem` helper).
```

with:

```
- **`KeyValueList`** (`src/components/ui/key-value-list.tsx`, server-safe): the label and value pairs of a detail page, a 13px faint label in a 120px column and the values in ink; below `sm` one column, each label above its value. Use one list per group of facts. Empty values show `Nil`, and `nilLabel` names an empty value that needs more than "ไม่มีข้อมูล" (an empty custodian reads "ไม่มีผู้ถือครอง"); 0 and `false` show as values. Pass `null` for a missing date, never the "-" a date formatter prints. A code with its name reads `<span className="tag">CODE</span> - name`, and money carries its unit (`formatMoney(x, { unit })`) unless its label already ends in "(บาท)". Guard LK1 allows no local `Info`, `InfoRow` or `DetailItem` helper; after plan 2B-4 the last one is `Info` in `asset-movement-timeline.tsx` (2D).
```

(2) §5 Cards / Containers, a new bullet after `StatStrip`. Replace the end of the `StatStrip` line:

```
a cell that needs action has a warning foot line with its icon (guards LS1, LS2).
```

with:

```
a cell that needs action has a warning foot line with its icon (guards LS1, LS2).
- **Detail pages** (since plan 2B-4; their header follows **Page header** in Navigation): the facts are `KeyValueList`s, one per group, inside the panel or section they belong to. A record's counts are a `StatStrip`: each value is a number or a short yes/no, the sentence that explains it goes in the foot line, and a count that needs action takes `attention` instead of a tone fill. A money total needs a wide cell: the supplier page puts its two totals in a second strip that is one column below `lg` (`className="max-lg:grid-cols-1"`), because a 28px amount with "บาท" does not fit a fifth of a 1024px strip or half a phone screen. A history table inside a padded section is `DataTable framed={false}` with a `caption` (the section's title) and `scrollHint`; a table on its own keeps its frame (the supplier's purchase documents). The asset page's view tabs are `TabNav`, rendered by the client wrapper `AssetDetailTabs`, which keeps the sideways scroll and the snap (`linkClassName="snap-start"`), brings the current tab into view and shows the edge cue.
```

(3) §5 Navigation, **Page header**, a sub-bullet after the title rule. Replace:

```
  - When the last crumb is a code, the title is the record's own name (or the asset's name for a repair or disposal document), never the same code.
```

with:

```
  - When the last crumb is a code, the title is the record's own name (or the asset's name for a repair or disposal document), never the same code.
  - Detail pages follow these rules since plan 2B-4 (the asset, repair record, disposal request, employee, supplier and my-asset pages): the trail ends on the code, the `h1` is the name, and the meta row holds the code, the status badges (with their help buttons on the asset page) and the facts a person checks first, such as the asset's location and custodian or an employee's position and e-mail. The my-asset page has no trail, so its title stays the page's name. On the asset page "แก้ไข" is hidden below `md` (`hidden md:inline-flex`; phones reach it in ⋯), and on the disposal page print and the next step sit in a `hidden md:flex` group (phones reach them in the page's own action bar); the back button shows at every width.
```

(4) §5 Data Tables, the R7 budget sentence. Replace:

```
17 after plan 2B-2; the commit that moves a table deletes its row.
```

with:

```
17 after plans 2B-2 and 2B-3, 11 after plan 2B-4; the commit that moves a table deletes its row.
```

(5) §5 Empty Values and Numbers. Replace:

```
After plan 2B-3, guard LV2 counts 97 typed `"-"`, LV1 19 bare `toLocaleString()` calls and LV3 35 `formatCurrency(` calls on screens (98, 19 and 36 after plan 2B-2; 113, 20 and 42 after plan 2B-1).
```

with:

```
After plan 2B-4, guard LV2 counts 73 typed `"-"`, LV1 15 bare `toLocaleString()` calls and LV3 16 `formatCurrency(` calls on screens (97, 19 and 35 after plan 2B-3; 98, 19 and 36 after plan 2B-2; 113, 20 and 42 after plan 2B-1).
```

(6) §7 Adaptive UI Contract, four bullets at its end (spec §4.10 row `DESIGN.md:571`, §4.6). Replace the end of its last bullet:

```
Links inside a sentence are exempt as well.
```

with:

```
Links inside a sentence are exempt as well.
- **Bottom space:** the dashboard shell leaves room for Mobile Field Navigation while it shows (`pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:pb-0` in `src/components/layout/dashboard-shell.tsx`), so a page in navigation mode adds no bottom padding of its own. Only a page with its own action bar pads its root: the four focus-task pages `/assets/[id]`, `/audit/rounds/[id]` and `/maintenance/[id]` (`pb-24 md:pb-0`) and `/disposal/[id]` (`pb-36 md:pb-0`), until phase 2C plan 5 moves them to `actionBarPagePadding`. Guard LP1 keeps `pb-24` and `pb-36` to those four; plans 2B-2 and 2B-4 took the doubled padding off the disposal batch, employee, supplier and my-asset pages.
- **Two breakpoints:** a page's own frame switches at `md` (768px): the `PageHeader` row, the words of `PageBackLink`, the header buttons hidden below `md`, and the page's own action bar (`MobileActionBar` and `DisposalMobileActionBar` are `md:hidden`). The shell switches at `lg` (1024px): the sidebar, Mobile Field Navigation and the shell's bottom space. From 768 to 1023px a navigation page shows the row header above the field navigation, so check every changed page at 768 and at 1024.
- **Page width and rhythm:** list and detail pages fill the content area, with no `max-w-*` on their root; forms and tools keep their own width (`max-w-2xl` to `max-w-7xl`), and their header sits inside it. A page root is `space-y-6` (24px between blocks); a page that cannot change its root line (`/audit/rounds/[id]`, whose root holds the O11 padding) passes `className="mb-6"` to `PageHeader`, and the asset register keeps its bare root and `PageHeader className="mb-4 md:mb-6"` until phase 3. The padding of `<main>` (`px-4 py-4 sm:px-6 sm:py-6`) stays, because full-bleed bars rely on it.
- **Loading skeletons** (`src/components/ui/page-skeleton.tsx`, server-safe; each `loading.tsx` renders one of its five exports and nothing else) take the shape of their page at full width: the `PageHeader` rows (crumbs and two badges on the asset page, the compact row on the register, a title alone on the dashboard), one `StatStrip` frame for numbers (two columns below `lg`, a lone last cell filling its row), the `DataTable` frame with a white header row (`dense` rows on the register) and underline `TabNav` rows. The frame has `aria-busy="true"`, and the blocks pulse only with `motion-safe:animate-pulse`. A route without a boundary of its own shows `PageSkeleton`, a header over a table. A plan that reshapes a page reshapes its skeleton in the same commit.
```

Leave the rest of `DESIGN.md` as it is: the Page header bullet already holds the title rule, the back-button bullet already names the left arrow of the bottom bars (`:510`), and the `TabNav` bullet already passes `ref`, `style` and `onScroll` through (`:511`).

- [ ] **Step 5: `docs/14_UI_UX_DESIGN_SYSTEM.md` (5 replacements)**

(1) Navigation and Action Surfaces (spec §10.6: name the owner of the bottom space). Replace:

```
- Reserve safe-area-aware content spacing only for the active bar.
```

with:

```
- Reserve safe-area-aware content spacing only for the active bar: the dashboard shell reserves it for Mobile Field Navigation, and a page pads its own root only when it renders its own action bar (the four focus-task pages `/assets/[id]`, `/audit/rounds/[id]`, `/maintenance/[id]` and `/disposal/[id]`; guard LP1).
- The page frame (the `PageHeader` row, the words of the back button, the page's own action bar) switches at `md`; the shell (sidebar, Mobile Field Navigation and its space) switches at `lg`. Check every changed page at 768 and 1024px, where the row header and the field navigation show together.
```

(2) Shared Components, the `KeyValueList` row. Replace the whole line:

```
| Label and value pairs | `KeyValueList` | empty values become `Nil` by themselves |
```

with:

```
| Label and value pairs | `KeyValueList` | one list per group of facts on a detail page; empty values become `Nil` by themselves (`nilLabel` when the empty value needs its own name); `null` for a missing date; a code with its name as `tag` |
```

(3) Shared Components, a new row after the empty state. Replace the whole line:

```
| An empty state | `EmptyNote` for one line, `ActionEmptyState` for a title, description or action | |
```

with:

```
| An empty state | `EmptyNote` for one line, `ActionEmptyState` for a title, description or action | |
| A loading state for a route | one export of `src/components/ui/page-skeleton.tsx`, rendered alone by the route's `loading.tsx` | the shape of its page at full width; a change to the page's shape changes its skeleton in the same commit |
```

(4) Current-Surface Registry, the Asset Detail row. Replace the whole line:

```
| Asset Detail and components | [`2026-07-10-asset-detail-components-ux-design.md`](superpowers/specs/2026-07-10-asset-detail-components-ux-design.md) | [`2026-07-10-asset-detail-components-ux-implementation.md`](superpowers/plans/2026-07-10-asset-detail-components-ux-implementation.md) and [`2026-07-11-asset-detail-ux-polish.md`](superpowers/plans/2026-07-11-asset-detail-ux-polish.md) record implementation, sequencing, and polish history. |
```

with:

```
| Asset Detail and components | [`2026-07-10-asset-detail-components-ux-design.md`](superpowers/specs/2026-07-10-asset-detail-components-ux-design.md), with its header, facts, number strips, history tables and view tabs on the list primitives in [`2026-10-12-ui-phase2b-design.md`](superpowers/specs/2026-10-12-ui-phase2b-design.md) §4.4.5 and §5.5 (the asset name as the title, the code and the badges in the meta row) | [`2026-07-10-asset-detail-components-ux-implementation.md`](superpowers/plans/2026-07-10-asset-detail-components-ux-implementation.md) and [`2026-07-11-asset-detail-ux-polish.md`](superpowers/plans/2026-07-11-asset-detail-ux-polish.md) record implementation, sequencing, and polish history; [`2026-10-13-ui-phase2b-plan4.md`](superpowers/plans/2026-10-13-ui-phase2b-plan4.md) records its move onto the 2B primitives. |
```

(5) Current-Surface Registry, the last cell of the 2B spec row. Replace:

```
plans 2B-4 and 2B-5 follow (spec §10.3). |
```

with:

```
[`2026-10-13-ui-phase2b-plan4.md`](superpowers/plans/2026-10-13-ui-phase2b-plan4.md) sequences plan 2B-4 (the detail pages, the asset view tabs and the loading skeletons); plan 2B-5 follows (spec §10.3). |
```

The other Shared Components rows need no change: `PageHeader`, `PageBackLink`, `TabNav`, `DataTable` and `StatStrip` already say how the detail pages use them.

- [ ] **Step 6: `docs/11_FEATURE_LIST.md` (1 replacement)**

The Loading UX row. Replace the whole line:

```
| Loading UX | Shared page skeletons plus App Router `loading.tsx` fallbacks for authenticated dashboard pages, with route-specific skeletons for Dashboard and Asset Register |
```

with:

```
| Loading UX | Shared page skeletons in the shape of their pages, at full width (the header rows, one number strip, the white table header, underline tabs), plus App Router `loading.tsx` fallbacks for authenticated dashboard pages: route-specific skeletons for Dashboard, Asset Register, Asset Detail and Reports, and a header over a table for every other route |
```

- [ ] **Step 7: `DEVELOPER_HANDOFF.md` (5 replacements)**

(1) Current Production Readiness Status, the skeleton bullet (`:70`). Replace:

```
Future slow routes should reuse the shared skeleton component rather than adding one-off spinners.
```

with:

```
Future slow routes should reuse the shared skeleton component rather than adding one-off spinners. Since phase 2B plan 4 each skeleton takes the shape of its page at full width (`DESIGN.md` Adaptive UI Contract), and the shell fallback is a header over a table.
```

(2) Operational Notes, the asset tab row (`:153`). Replace:

```
the bottom action bar adapts to the number of visible lifecycle actions instead of reserving four empty columns.
```

with:

```
the bottom action bar adapts to the number of visible lifecycle actions instead of reserving four empty columns. Since phase 2B plan 4 the tab row is the shared `TabNav` (one underline at every width, the custody count in plain digits, the missing-serial warning before its label) inside `AssetDetailTabs`, which keeps the scrolling, the snap, the current tab in view and the edge cue; the back button is `PageBackLink`, named by its visible words.
```

(3) Operational Notes, the asset header (`:154`). Replace:

```
a separate ID-only evidence reference index keeps the cross-workflow Evidence Center complete.
```

with:

```
a separate ID-only evidence reference index keeps the cross-workflow Evidence Center complete. Since phase 2B plan 4 that header is `PageHeader`: the asset name is the `h1`, and the code, the status and condition badges with their help, the location and the custodian sit in its meta row.
```

(4) Phase 1, Deferred (`:310`). Replace:

```
looks disabled without disabled semantics (axe flags 3.44:1; phase 2)
```

with:

```
looks disabled without disabled semantics (axe flags 3.44:1; phase 2; since 2B plan 4 the disabled quick actions use the faint ink without opacity, which is AA on `background`)
```

(5) The new section. Replace the last bullet of the 2B plan 3 section and the heading after it (`:677-679`) with the block below, which ends with that same heading. Replace `<today>` with the date of Step 1. Write the three `<from task-11-findings.md>` markers from `task-11-findings.md` in the shape of the 2B plan 3 section's bullets: the bottom-space marker as one sentence with the "Bottom space" lines (each detail page at 375, before → after); "Dev-app check (Task 11)" as one paragraph (what was checked and where, the results, the `/th/assets/<id>` load time before → after, fixes with their commits or "none", accepted mixes, existing issues not caused by 2B-4); "Still open" as nested bullets when it has more than two items: the line then ends at "deploy:", and its last nested bullet is `  - Complete these, together with the open checks of phase 1, 2A, 2C plans 1–3 and 2B plans 1–3 above.` (as in the 2B plan 3 section). If Step 3 printed other fragments, use them in the "Page frame", "Guards" and "Handed on to 2C plan 5" bullets.

```
- Next: merge this branch; then 2B plan 4 (the detail pages and skeletons) in the main checkout, and 2C plan 4 in the worktree once 2C plan 3 has merged too (spec §8.1–8.2), then the pipeline above.

## Open Go-Live Decisions
```

with:

```
- Next: 2B plan 4 (below, the detail pages and skeletons) in the main checkout and 2C plan 4 in the worktree `.worktrees/ui-phase2c-plan4` beside it (spec §8.1–8.2), then the pipeline above.

## UI Round 4 Phase 2B Plan 4 Detail Pages and Loading Skeletons (<today>)

- Branch `feat/ui-phase2b-plan4` (from `master` `c2bfbe2`: 2B plans 1–3 and 2C plans 1–3 merged, not deployed), in the main checkout beside 2C plan 4 in `.worktrees/ui-phase2c-plan4`. Spec `docs/superpowers/specs/2026-10-12-ui-phase2b-design.md` (its §10 rulings I1–I34 override the section files in `docs/superpowers/specs/2026-10-12-ui-phase2b/`; the detail pages are §4.4.5 and §5.5, the skeletons §4.7) · plan `docs/superpowers/plans/2026-10-13-ui-phase2b-plan4.md` · canonical values in `DESIGN.md`.
  - Plan 2B-4 moves the 14 files of spec §8.8 onto the 2B-1 primitives: six detail pages (`/assets/[id]`, `/maintenance/[id]`, `/disposal/[id]`, `/master-data/employees/[id]`, `/master-data/suppliers/[id]`, `/my-assets/[id]`), the asset view tabs, the supplier's purchase documents table, the skeletons in `src/components/ui/page-skeleton.tsx` and the five `loading.tsx` boundaries. One commit per file; Task 10 is one commit for the five boundaries, which did not change.
  - No new primitive, message key, schema, migration, API, RBAC, dependency, index or token. The one query change is read-only: the employee page also selects the `name` of each asset's status and condition, for their badge tones.
- **2C plan 5 may start once this branch and 2C plan 4 have both merged** (spec B7, §8.1): the four O11 pages have their new headers (`/audit/rounds/[id]` since 2B plan 2, the other three since this plan), `/disposal/[id]` has a back button on phones, and 2B touches none of their O11 lines again ("Handed on to 2C plan 5" below gives their state).
- **Deploy:** none, as for 2B plans 1–3: one deploy after all of phase 2; `ab1b873` stays the rollback point (no schema change).
- **Page frame** (`DESIGN.md` Adaptive UI Contract; spec §4.6):
  - Bottom space: the shell owns it for Mobile Field Navigation, and a page pads its root only for its own action bar. The employee, supplier and my-asset pages dropped their doubled `pb-24 md:pb-0` (on phones it left a blank band of about 11rem above the field navigation), so guard LP1 counts only the four O11 pages. `/th/my-assets/asset-1` joined the navigation-mode list of `tests/mobile-field-navigation.test.ts`: a focus rule that hid the field navigation there would fail the test before the page lost its space. Measured at 375 (the gap between the last content and the bottom bar, before → after): <from task-11-findings.md>.
  - Breakpoints: the page frame (the header row, the words of `PageBackLink`, the header buttons hidden below `md`, the page's own action bar) switches at `md`; the shell (sidebar, field navigation and its space) at `lg`.
  - Width: the five skeletons dropped `mx-auto max-w-7xl`; list and detail pages already had no `max-w-*` (R-o).
- **What changed, file by file:**
  - `D/assets/[id]/page.tsx`: `PageHeader` with the asset name as the `h1` (it was the asset tag); the meta row holds the tag, the status and condition badges with their help popovers (inside `data-testid="asset-identity-summary"`), the location and the custodian, each through `orNil`. The back button is `PageBackLink` ("กลับ", or "กลับไปสแกน" from the scanner; `href={returnToHref}` kept), then ⋯ (`AssetDetailActionMenu`, its props unchanged and still self-closing), then "แก้ไข" (`md`, from `md`; phones reach it in ⋯). The seven fact groups are `KeyValueList`s (`function Info` is gone; an empty custodian reads `asset.noCustodian`); each tab's `SummaryStrip` is a `StatStrip` (numbers as values, the sentences in the foot line, `attention` for an open repair or an audit result to follow up); the repair and audit history tables are `DataTable framed={false}` with a caption and the scroll hint, the repair status is a `StatusBadge` and the scan count `formatCount`, right-aligned; money is `formatMoney` with "บาท" (the purchase document line of the timeline takes the document's currency); the disabled quick actions drop `opacity-70` for the faint ink (guard LT5). The root `pb-24 md:pb-0` and `MobileActionBar` are untouched (O11), and so are the four 2C plan 4 files the page renders (`asset-status-correction-button.tsx`, `asset-evidence-drawer.tsx`, `ui/activity-drawer.tsx`, `transaction-cancel-dialog.tsx`).
  - `c/assets/asset-detail-tabs.tsx`: still the `"use client"` wrapper that owns the scrolling (I9). It renders `TabNav` with `ref`, `onScroll`, `style={{ scrollSnapType: "x mandatory" }}` and `linkClassName="snap-start"`, scrolls `[aria-current="page"]` into view on a view change, shows the custody count as `formatCount` through `TabNavItem.count` (no translucent chip), and puts the missing-serial warning in the item's `icon`. The overflow cue and `hasRemainingHorizontalContent` stay.
  - `D/maintenance/[id]/page.tsx`: `PageHeader` with the asset name (the meta row: the repair code, its status, the asset tag); back → print (outline) → `RepairRecordActions` (unchanged); the bottom bar's back item shows `ArrowLeft` instead of `Wrench` (B2), which fills the page's LB1 `0 → 1` row. The facts are `KeyValueList`s; money has "บาท", except the record cost, whose label already ends in "(บาท)"; the reason that pre-fills a disposal request reads "ค่าซ่อมรวม 1,500.00 บาท" instead of "ค่าซ่อมรวม ฿1,500.00".
  - `D/disposal/[id]/page.tsx`: `PageHeader` with the asset name (the meta row: the request code, its status badge, which phones now see too, and the asset tag); `PageBackLink` at every width, so phones have a back button for the first time (B2); print and the next step stay in the `hidden md:flex` group; `DisposalWorkflowStepper` sits right under the header with its props unchanged. The facts are `KeyValueList`s (`formatSource` returns `null` when there is no source); the values have "บาท".
  - `D/master-data/employees/[id]/page.tsx`: `PageHeader` with the person's name (the meta row: the code, the position, the e-mail); the five tiles are one `StatStrip` (the first cell still links to the person's assets); the profile is a `KeyValueList`; the three tables are `DataTable framed={false}` with captions and the scroll hint, and the file-local `ColumnHeader` (a shared name, with `uppercase`) is gone; the status and condition badges take their own tone (they were always blue and grey, spec §5.10 #7); empty cells, the due and return dates included, show `Nil`.
  - `D/master-data/suppliers/[id]/page.tsx`: `PageHeader` with the supplier's name (the meta row: the code, the contact, the phone, the e-mail); the five local `MetricCard`s are two `StatStrip`s: the three counts, then the two money totals ("12,345.67 บาท"), one per row below `lg`; an asset without a purchase price and a repair without a cost show "—" instead of "฿0.00"; the profile is a `KeyValueList`; the purchase documents money column is headed by the existing `asset.purchaseDocumentAmountBaht` ("ยอดรวม (บาท)").
  - `c/master-data/supplier-purchase-documents.tsx`: `DataTable` (framed, with `data-supplier-documents-desktop`), the linked-asset count and the money right-aligned, `formatCount`, `formatMoney` without "฿", `Nil` for a document without a PO or invoice number, and the document number in `tag`; the phone cards stay.
  - `D/my-assets/[id]/page.tsx`: `PageHeader` (the page title, its help line in the meta row) with `PageBackLink` "กลับไปทรัพย์สินของฉัน"; the five facts are a `KeyValueList` (the category code and the serial in `tag`; no serial reads "—").
  - `c/ui/page-skeleton.tsx`: the five skeletons keep their names and take the shape of their pages at full width (I28, R-o): the `PageHeader` rows switching at `md`, `MetricGridSkeleton` as one `StatStrip` frame (its lone last cell spans the row below `lg`), `TableSkeleton` as the `DataTable` frame with a white header, and the new file-local `TabNavSkeleton`. `PageSkeleton` (every route without a boundary of its own) is a header over a table; the register skeleton draws the toolbar of plan 2B-3; the asset skeleton has no identity card, because the identity is in the header.
  - The five `loading.tsx` boundaries did not change (they never had a class or a width): a new test pins each as a bare wrapper of its skeleton, and they joined `MIGRATED_LIST_FILES`.
- **Messages:** none new or changed. The purchase documents column reuses `asset.purchaseDocumentAmountBaht` ("ยอดรวม (บาท)"); `asset.latestMaintenance` lost its last caller and stays in both files (2D).
- **Guards:**
  - VFG: R7 `TABLE_HEADER_FILLS` 17 in 11 files → 11 in 8; the `// 2B-4` group is gone (the asset page 2, the employee page 3, the purchase documents 1) · R1 `{}` · R2 10 in 9 files, unchanged.
  - LFG after this plan (live counts): LH1 18 · LH2 5 · LB1 7 · LP1 4 · LF1 1 · LT1 23 · LT2 1 · LT3 2 · LT4 1 · LT5 2 · LV1 15 · LV2 73 · LV3 16 · LS1 14 · LS2 15 · LK1 1 · LN1 4 · LN2 5 · LR1 0. LB1's budget went 12 → 7 with no slack left. `MIGRATED_LIST_FILES` holds 77 files: the 13 of this plan joined; `c/ui/page-skeleton.tsx` stays out, because plan 2B-5 reshapes the dashboard and reports skeletons with their pages (spec §4.7). What stays on this plan's files is their `KEEP`: LP1 1 on the asset, repair and disposal pages (O11), LB1 1 on the repair page (the bar's back item) and LV2 4 on the asset page (translated-sentence arguments, R-n).
  - `tests/form-migration-guards.test.ts` is not edited; no file of this plan is in its `BATCH_FILES`.
- **Tests:** no new file; 10 new tests. New blocks in `asset-detail-ux`, `asset-detail-tabs`, `repair-record-detail-ui`, `disposal-detail-workspace`, `list-pages-ui` (the employee, supplier, purchase documents and my-asset pages), `page-loading-skeleton` and `loading-boundaries`. Edited pins (spec §10.4 table A row 2B-4): `asset-detail-ux:27`, `:39-40` and `:151-152`, `asset-detail-tabs:18`, `disposal-detail-workspace:33`, `supplier-detail-ui:21-23` and `:15` (the documents table), and `mobile-field-navigation` (one path added). `visual-foundation-guards` and `list-frame-guards` changed only in their budget rows and `MIGRATED_LIST_FILES`.
- **Risks:**
  - The `h1` of the asset, repair and disposal pages is a name now, not a code (spec §4.9 item 2): the code stays in the trail and first in the meta row, and long names wrap (`text-balance`).
  - The status badge of `/disposal/<id>` shows on phones for the first time, beside the stepper's own stage (spec §4.9 item 3).
  - `/maintenance/<id>` has two back controls on phones, in the header and in the bar, until 2C plan 5 decides (spec §4.6.4, §4.9 item 8).
- **Handed on to 2C plan 5:** 2B touches none of these lines again. In `D/assets/[id]/page.tsx`, the root `<div className="space-y-6 pb-24 md:pb-0">` `:886` (it was `:882`) and `<MobileActionBar` `:979` (it was `:989`); in `D/maintenance/[id]/page.tsx`, the root `<div className="space-y-6 pb-24 md:pb-0">` `:109` (it was `:105`) and `<MobileActionBar` `:146-153` (it was `:142-149`), whose back item `:151` (it was `:147`) now shows `ArrowLeft`; in `D/disposal/[id]/page.tsx`, the root `<div className="space-y-6 pb-36 md:pb-0">` `:174` (it was `:170`), `<DisposalWorkflowStepper` `:199-209` (it was `:205-215`), `<DisposalMobileActionBar` `:216-223` (it was `:222-229`) and the header group `<div className="hidden items-center gap-2 md:flex">` `:190`; in `D/audit/rounds/[id]/page.tsx` (as plan 2B-2 left it), the root `<div className="pb-24 md:pb-0">` `:437` and `<MobileActionBar` `:490`, whose back item is `:495`. What plan 5 inherits (spec §4.6.4):
  - `ActionBar` (`ui/action-bar.tsx`, batch 5) switches at `md` like the two bars it replaces (`md:hidden` on `src/components/ui/mobile-action-bar.tsx:18` and `src/components/disposal/disposal-mobile-action-bar.tsx:21`), because the header buttons of `/disposal/[id]` show from `md` (the header group above).
  - The return item of the bottom bar: the headers of `/assets/[id]`, `/maintenance/[id]` and `/disposal/[id]` have `PageBackLink` at every width, and `/audit/rounds/[id]` has none (its trail and its bar's back item). Plan 5 decides whether the bars of `/maintenance/[id]` and `/audit/rounds/[id]` keep their back item; dropping one lowers a live LB1 count, which LFG accepts without an edit.
  - `actionBarPagePadding` replaces the `pb-24` / `pb-36` of the four roots (each page's LP1 `KEEP` is 1, so 0 passes). `getMobileSafeBottomPaddingClasses()` `src/lib/design-system.ts:112-114` has no caller, and `tests/audit-scan-search-ui.test.ts:188` pins its class string: plan 5 deletes the helper and that line together.
  - `DisposalWorkflowStepper` (the disposal request `Steps` of batch 5), `maintenance/maintenance-attachments.tsx` and both bars are as `c2bfbe2` left them.
- **Handed on, later (2D):** a purchase document without a total still reads "0.00", because the supplier page maps it to 0 (`totalAmount: Number(document.totalAmount ?? 0)`) · the ⋯ trigger of `asset-detail-action-menu.tsx` is `size="icon"` (40px from `md`) beside the 36px header buttons · `getSummaryToneClass` in `src/lib/asset-detail-format.ts` and the key `asset.latestMaintenance` have no caller left · `getCheckoutDestination` and `formatCancellationSnapshot` in the asset page still return a typed "-", a form guard LV2 does not count · the comment of the asset page's LV2 `KEEP` row still names `:1198`, `:1200` and `:2462`; the lines are now `:1205`, `:1207` and `:2455`.
- Dev-app check (Task 11): <from task-11-findings.md>
- Before/after screenshots: `.superpowers/sdd/screenshots/ui-phase2b-plan4/before/` and `after/` (git-ignored, on the development machine only).
- Still open, for a person before the one phase-2 deploy: <from task-11-findings.md>, together with the open checks of phase 1, 2A, 2C plans 1–3 and 2B plans 1–3 above.
- Next: merge this branch; then 2B plan 5 (admin, reports, dashboard and notifications, and the guard lock) in the main checkout, and 2C plan 5 in the worktree once 2C plan 4 has merged too (spec §8.1–8.2), then 2D and the V track.

## Open Go-Live Decisions
```

Replace the three `<from task-11-findings.md>` markers with the text from the findings; no marker may stay.

- [ ] **Step 8: `docs/99_CHANGELOG.md` (1 or 2 replacements)**

(1) Only if `<today>` is not `2026-10-13`: put a new date block on top. Replace the line `## 2026-10-13` with:

```
## <today>

---

## 2026-10-13
```

(2) The entry, directly under the `## <today>` heading (above `### ทะเบียนทรัพย์สิน (UI รอบ 4 เฟส 2B plan 3)` when `<today>` is 2026-10-13, above `---` otherwise). Replace:

```
## <today>

```

with the block below. Write the "ตรวจบนแอป (Task 11)" bullet from `task-11-findings.md`, in Thai, in the shape of the 2B plan 3 entry's bullet, with the bottom space at 375 and the `/th/assets/<id>` load time before → after in it.

```
## <today>

### หน้ารายละเอียดและ skeleton (UI รอบ 4 เฟส 2B plan 4)

Branch `feat/ui-phase2b-plan4` (จาก `master` `c2bfbe2` ทำคู่กับ 2C plan 4 ใน worktree) · design `docs/superpowers/specs/2026-10-12-ui-phase2b-design.md` (ข้อ 10 ใช้แทนไฟล์ส่วน หน้ารายละเอียดอยู่ข้อ 4.4.5 และ 5.5 skeleton อยู่ข้อ 4.7) · plan `docs/superpowers/plans/2026-10-13-ui-phase2b-plan4.md` · ค่าทั้งหมดอยู่ใน `DESIGN.md`

- **ขอบเขต:** 14 ไฟล์ตามสเปกข้อ 8.8 (หน้ารายละเอียดทรัพย์สินและแท็บของหน้านี้ หน้าบันทึกการซ่อม หน้าคำขอตัดจำหน่าย หน้ารายละเอียดพนักงาน หน้ารายละเอียดผู้ขายและตารางเอกสารจัดซื้อ หน้ารายละเอียดทรัพย์สินของฉัน skeleton และไฟล์ `loading.tsx` 5 ไฟล์) · ใช้ของกลางจาก 2B-1 ไม่มีของกลางใหม่ · ไม่เปลี่ยนขั้นตอนงาน ไม่แตะ schema ไม่เพิ่ม API ไม่เพิ่ม token ไม่เพิ่ม key ข้อความ · query เปลี่ยนจุดเดียวแบบอ่านอย่างเดียว: หน้าพนักงานอ่านค่า `name` ของสถานะและสภาพเพิ่มเพื่อเลือกสีป้าย
- **หัวหน้ารายละเอียด:** หัวเรื่องเป็นชื่อ น้ำหนัก 600 · หน้าทรัพย์สิน บันทึกการซ่อม และคำขอตัดจำหน่ายเปลี่ยนจากรหัสเป็นชื่อทรัพย์สิน รหัสยังอยู่ในเส้นทางหน้าและเป็นตัวแรกของบรรทัดใต้หัวเรื่อง (ตัว monospace) ตามด้วยป้ายสถานะและข้อมูลที่ดูบ่อย (ที่ตั้งและผู้ถือครองของทรัพย์สิน ตำแหน่งและอีเมลของพนักงาน ผู้ติดต่อ โทรศัพท์ และอีเมลของผู้ขาย) · ปุ่ม "กลับ" เป็นปุ่มขอบลูกศรซ้ายอยู่หน้าสุด บนมือถือเป็นไอคอน 44px และยังพากลับหน้าเดิมของรายการ (มาจากหน้าสแกนเขียน "กลับไปสแกน") · หน้าทรัพย์สิน: ⋯ อยู่ก่อน "แก้ไข" · หน้าคำขอตัดจำหน่ายมีปุ่มกลับบนมือถือเป็นครั้งแรก และเห็นป้ายสถานะบนมือถือด้วย · หน้าบันทึกการซ่อม: ไอคอนกลับทั้งบนหัวและในแถบล่างเป็นลูกศรซ้ายแทนรูปประแจ
- **ข้อมูลในหน้า:** ข้อมูลแต่ละกลุ่มเป็นรายการป้ายกับค่า (ป้าย 13px สีจางในคอลัมน์ 120px บนมือถือป้ายอยู่เหนือค่า) แทนช่องที่ป้ายเป็นตัวพิมพ์ใหญ่ · ค่าว่างเป็น "—" (ผู้ถือครองที่ว่าง โปรแกรมอ่านหน้าจออ่านว่า "ไม่มีผู้ถือครอง") · รหัสที่มีชื่อต่อท้ายเป็นตัว monospace · เงินนอกตารางเป็น "64,900.00 บาท" (ค่าใช้จ่ายของบันทึกการซ่อมซึ่งป้ายมี "(บาท)" แล้วแสดงแค่ตัวเลข) · เหตุผลที่เติมให้คำขอตัดจำหน่ายจากบันทึกการซ่อมเขียน "ค่าซ่อมรวม 1,500.00 บาท" แทน "฿1,500.00" · ปุ่มลัดที่ใช้ไม่ได้ไม่จางด้วยความโปร่งแล้ว ใช้ตัวหนังสือสีจางบนกรอบเดิม
- **กล่องตัวเลข:** เป็นแถบเดียวไม่มีพื้นสี (2 คอลัมน์ต่ำกว่า 1024px) ค่าเป็นตัวเลข ประโยคอธิบายอยู่บรรทัดล่าง สิ่งที่ต้องติดตามขึ้นบรรทัดสีเตือนพร้อมไอคอน · แท็บซ่อมบำรุงและตรวจนับของหน้าทรัพย์สิน: ใบซ่อมที่เปิดอยู่ ใบซ่อมทั้งหมด ค่าซ่อมรวม จำนวนครั้งที่สแกน และต้องตรวจสอบผลต่างไหม (ใช่/ไม่) · ผู้ขายมี 2 แถบ (จำนวน 3 ช่อง แล้วยอดเงิน 2 ช่องซึ่งบนมือถืออยู่ช่องละแถว) · ผู้ขาย: ทรัพย์สินที่ไม่มีราคาซื้อและงานซ่อมที่ไม่มีค่าใช้จ่ายแสดง "—" แทน "฿0.00"
- **ตาราง:** ประวัติซ่อมและตรวจนับของทรัพย์สิน 3 ตารางของพนักงาน และเอกสารจัดซื้อของผู้ขาย: หัวตารางพื้นขาว 13px ไม่ใช้ตัวพิมพ์ใหญ่ รหัสเป็นตัว monospace มีข้อความบอกให้เลื่อนเฉพาะตอนตารางล้น · สถานะใบซ่อมเป็นป้ายสถานะ · ป้ายสถานะและสภาพในตารางของพนักงานใช้สีตามสถานะจริง (เดิมเป็นสีน้ำเงินและเทาทุกแถว) · เอกสารจัดซื้อ: หัวคอลัมน์ "ยอดรวม (บาท)" ตัวเลขชิดขวาไม่มี "฿" เอกสารที่ไม่มีเลข PO และเลขใบแจ้งหนี้แสดง "—"
- **แท็บของหน้าทรัพย์สิน:** เป็นแท็บเส้นใต้ทุกขนาดจอแทนปุ่มมน ตัวนับไม่มีพื้นโปร่ง ไอคอนเตือนอยู่หน้าข้อความ · บนมือถือยังเลื่อนได้ เลื่อนแท็บปัจจุบันเข้าจอ และมีลูกศรบอกว่ายังมีแท็บอีก
- **ระยะล่าง:** หน้าพนักงาน ผู้ขาย และทรัพย์สินของฉันไม่เว้น `pb-24` ซ้อนกับที่ shell เว้นให้แถบนำทางแล้ว (บนมือถือเคยมีแถบว่างราว 11rem) · 4 หน้าที่มีแถบปุ่มของตัวเอง (ทรัพย์สิน รอบตรวจนับ บันทึกการซ่อม คำขอตัดจำหน่าย) คง padding ไว้ให้ 2C plan 5
- **skeleton:** เต็มความกว้างเหมือนหน้าจริง (เดิมหยุดที่ 1280px) · หัวมีรูปแบบของหน้า (เส้นทางหน้าและป้ายสถานะในหน้าทรัพย์สิน แถวเดียวของทะเบียน) และสลับเป็นแถวที่ 768px · ตัวเลขเป็นแถบเดียว ตารางหัวพื้นขาว แท็บเป็นเส้นใต้ · หน้าที่ไม่มี skeleton ของตัวเองแสดงหัวกับตาราง · ไฟล์ `loading.tsx` 5 ไฟล์ไม่เปลี่ยน
- **ข้อความ:** ไม่มี key ใหม่ · คอลัมน์เงินของเอกสารจัดซื้อใช้ `asset.purchaseDocumentAmountBaht` ที่มีอยู่
- **guard:** VFG R7 17 → 11 (8 ไฟล์) · R1 `{}` · R2 10 คงเดิม · LFG หลัง plan: LH1 18 · LB1 7 · LP1 4 · LT1 23 · LT5 2 · LV1 15 · LV2 73 · LV3 16 · LS1 14 · LS2 15 · LK1 1 · LN1 4 · LN2 5 (LH2 5 · LF1 1 · LT2 1 · LT3 2 · LT4 1 · LR1 0 คงเดิม) · `MIGRATED_LIST_FILES` 77 ไฟล์ (`page-skeleton.tsx` ยังไม่เข้า เพราะ 2B-5 ปรับ skeleton ของแดชบอร์ดและรายงานพร้อมหน้า) · ไม่แก้ `form-migration-guards`
- **test:** ไม่มีไฟล์ใหม่ · เพิ่ม 10 test ใน `asset-detail-ux`, `asset-detail-tabs`, `repair-record-detail-ui`, `disposal-detail-workspace`, `list-pages-ui` (4 หน้า), `page-loading-skeleton` และ `loading-boundaries` · แก้ pin ตามสเปกข้อ 10.4 ตาราง A แถว 2B-4 และ `supplier-detail-ui:15` · `mobile-field-navigation` เพิ่ม `/th/my-assets/asset-1` เป็นหน้าแบบแถบนำทาง
- **ความเสี่ยง:** หัวเรื่อง 3 หน้าเปลี่ยนจากรหัสเป็นชื่อ (รหัสยังอยู่ในเส้นทางหน้าและบรรทัดใต้หัวเรื่อง) · หน้าบันทึกการซ่อมมีปุ่มกลับ 2 ที่บนมือถือจนกว่า 2C plan 5 จะตัดสิน · เอกสารจัดซื้อที่ไม่มียอดรวมยังแสดง "0.00" เพราะหน้าแปลงค่าว่างเป็น 0 (รอ 2D)
- **deploy:** ไม่ deploy ใน 2B · deploy ครั้งเดียวหลังเฟส 2 ทั้งหมดและผู้ใช้ตรวจเครื่องจริง · ถอยกลับไป `ab1b873` ได้เพราะไม่มี schema เปลี่ยน
- **ตรวจบนแอป (Task 11):** <จาก task-11-findings.md>
- ภาพก่อน/หลัง: `.superpowers/sdd/screenshots/ui-phase2b-plan4/before/` และ `after/` (git ignore อยู่บนเครื่องพัฒนา)
- ต่อไป: merge แล้วทำ 2B-5 (admin รายงาน แดชบอร์ด แจ้งเตือน และล็อก guard) ใน checkout หลัก · 2C plan 5 ใน worktree เมื่อ 2C plan 4 merge แล้วด้วย (สเปกข้อ 8.1) · แล้ว 2D · งาน V

```

Replace the `<จาก task-11-findings.md>` marker with the text from the findings, and every `<today>` with the date; no marker may stay.

- [ ] **Step 9: `.impeccable/design.json`: no change**

No component entry changes in 2B-4 (spec §10.6 row 2B-4 names none; the page-header, table, tabs, stat-strip and key-value entries came in 2B-1): leave the file and its `generatedAt` as they are.

Run: `git diff --quiet c2bfbe2 -- .impeccable/design.json && echo DESIGN-JSON-UNCHANGED`
Expected: `DESIGN-JSON-UNCHANGED`.

- [ ] **Step 10: Check**

Run: `node <temp>/check-docs-2b4.mjs`
Expected: 14 `ok` lines, exit 0, and none of the three lists ("code facts", "live fragments", "guard fragments").

Run: `grep -n "<from task-11\|<จาก task-11\|<today>" DESIGN.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md docs/14_UI_UX_DESIGN_SYSTEM.md docs/11_FEATURE_LIST.md .impeccable/design.json`
Expected: nothing.

Run: `git diff --numstat`
Expected: exactly the five files: `DESIGN.md` `9 3` (the `KeyValueList` line changed; one new line each for **Detail pages** and the Page header sub-bullet; the R7 and empty-value lines changed; four new Adaptive lines), `docs/14_UI_UX_DESIGN_SYSTEM.md` `6 4` (four lines changed; one new line each for the breakpoints and the loading row), `docs/11_FEATURE_LIST.md` `1 1`, `DEVELOPER_HANDOFF.md` `48 5` with one line per marker (each nested "Still open" bullet adds one: `52 5` with three items and the closing "Complete these" bullet), `docs/99_CHANGELOG.md` about `21 0` (four more with a new date block). A file that shows every line changed was normalized: restore its line endings.

Run: `node -e "for (const f of process.argv.slice(1)) { const s = require('fs').readFileSync(f, 'utf8'); console.log(f, (s.match(/\r\n/g) || []).length, (s.match(/\n/g) || []).length) }" DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md docs/11_FEATURE_LIST.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md`
Expected: the two numbers equal on every line (CRLF throughout).

Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: all green, with the test count Task 11 ended with (`tests 1961 · pass 1960 · fail 0 · skipped 1` when Task 11 added no test: `c2bfbe2`'s 1951 plus Tasks 1–4 +4 and Tasks 5–10 +6); tsc prints nothing; lint `0 errors, 146 warnings`, every one under `.agents/`. `tests/audit-round-cancellation.test.ts` reads the handoff, the changelog and the feature list; no other test reads these five files.

- [ ] **Step 11: Commit**

```bash
git add DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md docs/11_FEATURE_LIST.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md
git commit -m "docs(ui): phase 2B plan 4 detail pages, skeletons and the 2C plan 5 hand-off in DESIGN.md, handoff, feature list, design-system index and changelog

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 5 files in the commit (`git show --stat HEAD`). `git status --short` prints only the untracked paths of Global Constraints.

---

### Task 13: Final verification, rebase if needed, wiki and memory (controller runs this task)

**Files:**
- Modify: `docs/99_CHANGELOG.md`, `DEVELOPER_HANDOFF.md` (verify numbers)
- Modify (vault `D:\Obsidian\Eltross`): `AssetSystem/ams-status.md`, `AssetSystem/ams-log.md`, `AssetSystem/ams-open-questions.md`
- Modify (auto-memory): `review-2026-10-priorities.md`

**Interfaces:**
- Consumes: Tasks 1–12 committed.
- Produces: the branch ready for superpowers:finishing-a-development-branch.

- [ ] **Step 1: Verify.**
  - Run `npm run verify` and record the test count and the build page count.
  - If it passed, add one bullet to the 2B-4 entry in `docs/99_CHANGELOG.md`, directly above its "ตรวจบนแอป (Task 11)" bullet: `` `npm run verify` ผ่าน (test N · ผ่าน N · ข้าม 1 · build X/X หน้า) ``.
  - Add the same numbers to the 2B-4 section of `DEVELOPER_HANDOFF.md`, directly above its "Dev-app check (Task 11)" bullet: ``- Verification: `npm run verify` passes (tests N · pass N · skipped 1 · build X/X pages).``
  - Both files are CRLF: insert with an exact-string edit that writes `\r\n` (a Node script; `sed -i` in Git Bash writes LF).
  - Run `npm test` again (`tests/audit-round-cancellation.test.ts` reads both files).
  - Commit both files with `docs(ui): record phase 2B plan 4 verify results` and the Co-Authored-By line.

- [ ] **Step 2: Rebase if 2C plan 4 merged first (spec §8.2).** Both plans share one repository, so `master` is already local. Run `git merge-base --is-ancestor master HEAD && echo UP-TO-DATE`.
  - If it prints `UP-TO-DATE`, skip to Step 3.
  - Otherwise `master` moved (2C plan 4 merged). Run `git rebase master` and resolve conflicts by spec §8.2:
    - `DESIGN.md`: keep both sides; where both touched the same line, write it so it matches the code after both merges.
    - `tests/visual-foundation-guards.test.ts`: keep both sides; a budget row both lowered takes the lower number; never raise.
    - `messages/th.json`, `messages/en.json`: take `master`'s version, then re-run each change file of this plan (`node scripts/messages-edit.mjs <temp>/<change file>`), if this plan has any.
    - `DEVELOPER_HANDOFF.md` (chronological: the section that merged first stays above), `docs/99_CHANGELOG.md` (newest entry on top under its date), `docs/14_UI_UX_DESIGN_SYSTEM.md`, `docs/11_FEATURE_LIST.md`: keep both sides; adjacent table rows keep each side's own row.
    - A conflict in any other file means a fence leaked: abort the rebase (`git rebase --abort`), find the commit that touched the other plan's file, and stop to report.
  - After the rebase: run `node <temp>/check-docs-2b4.mjs` (Task 12) and, if it prints other line fragments (2C plan 4 moves lines in files the hand-off names), update the handoff text it names (new commit); then `npm run verify`, `node <temp>/p2b1-precheck.mjs --budgets`, the production build, and the dev-app rows "หลัง rebase" of spec §8.8 (`/th/assets/<id>`: ⋯ cancel transaction up to its confirm and cancel, the evidence drawer, the activity drawer) at 1440 and 375. Update the verify numbers of Step 1 if they changed (new commit).

- [ ] **Step 3: Wiki.** Read `AssetSystem/_schema/ams-wiki-schema.md` first, then:
  - `ams-status.md`: the 2B row says plan 2B-4 is built on `feat/ui-phase2b-plan4` with the verify numbers, not merged, not deployed, and that 2C plan 5 may start once both 2B-4 and 2C plan 4 have merged. Fix any sentence the row now contradicts (rule 8).
  - `ams-log.md`: an entry at the top of `## <today>`.
  - `ams-open-questions.md`: the 2B-4 checks for a person from Task 11 Step 9 (one new numbered item, also added to the list in item 27) · anything Task 11 recorded as found but not caused by 2B-4.
  - Run `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` from `D:\Obsidian\Eltross`.
  - Commit only those three files with an `ingest:` message. Other sessions have uncommitted changes in the vault; never stage them.

- [ ] **Step 4: Memory.** Update `review-2026-10-priorities.md`: 2B-4 built on `feat/ui-phase2b-plan4`, not merged, not deployed; the state of 2C plan 4; next: the merge choice, then 2B-5 (and 2C plan 5 once both have merged).

- [ ] **Step 5:** Use superpowers:finishing-a-development-branch. For a local merge while the main checkout holds this branch, fast-forward `master` first (`git fetch . feat/ui-phase2b-plan4:master`), then `git checkout master`, so no file changes under the user's dev server.

