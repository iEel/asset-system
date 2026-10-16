# UI Round 4 Phase 2D Plan 4: Audit, Disposal, Maintenance and Transactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sweep the last screens of spec 2D §3.4 onto the shared parts, file by file:
- the field audit scanner (its command buttons too, D2) and the audit round pages and parts, the findings page included;
- the disposal queue, request, batch, bulk dialogs (M26), stepper (M28) and print page (D10, M24);
- the repair records, repair attachments (M28), PM plans and the repair print page (D10, M24), then `formatCurrency` goes (§4.1);
- the check-out, check-in, transfer and bulk-move forms, the transaction cancel dialog and the A4 operation documents;
- three carried fixes: the phone `ActionBar` is one row on a short screen (D18, wiki 38), the asset page's links to a section of another view open that view (wiki 43 (1)), and a check-sheet field focused before the phone keyboard opens comes back above the pinned bar.

Panels are `ContentPanel` (or `getPanelClasses()` where the element cannot be one), messages `Notice` by meaning, states `StatusBadge`, names `Chip`, empty states `EmptyNote` / `ActionEmptyState`, empty values `Nil`, label and value pairs `KeyValueList`, numbers `StatStrip` and `formatCount` / `formatMoney`, commands `Button` / `buttonVariants`, text links `linkVariants`, codes `tag`, sub-lines `text-meta`. Workflows, data, validation, permissions, messages, the API and the database stay the same.

**Architecture:**
- **One file is one commit** (or a tight pair that shares a prop, a type or one identical sweep), with every sweep category of that file and its guard rows in the same commit (spec §3, §5.6). The tree is green after every commit.
- **Task order:** OP, AS, AP, DS, MT.
  - OP (Tasks 1–6): the shared `ActionBar`, the asset page's section links, the transaction parts and forms.
  - AS (Tasks 7–19): the field audit scanner, on top of the audit mobile fix of 2026-10-16.
  - AP (Tasks 20–29): the audit parts first, then the four audit pages.
  - DS (Tasks 30–43): the disposal parts, then the pages, then the print page.
  - MT (Tasks 44–51): repair and PM, the repair print page, then `formatCurrency`.
- **Hard dependencies:** Tasks 27 and 28 rely on Task 20 (the progress bar loses its own frame); Task 50 needs Task 43 (LV3) and Task 51 needs Tasks 43 and 50 (no caller of `formatCurrency` is left); the LFG lines `LOCAL_STAT_TILE` and `LOCAL_KEY_VALUE` grow in Tasks 6, 22, 23, 24, 26, 27, 29, 38 and 39, always at the end (R19). Otherwise the areas are independent.
- **Branch:** `feat/ui-phase2d-plan4` in the main checkout `D:/Antigravity/asset-system`. No worktree: one plan at a time (D15).
- **Tests:** five new LF files collect the sweep pins, one test per code commit, appended in order, plus the five Review Focus tests:
  - `tests/operations-sweep-ui.test.ts` (Tasks 1–6, 8 tests)
  - `tests/audit-scan-sweep-ui.test.ts` (Tasks 7–19, 14 tests)
  - `tests/audit-pages-sweep-ui.test.ts` (Tasks 20–29, 10 tests)
  - `tests/disposal-sweep-ui.test.ts` (Tasks 30–43, 15 tests)
  - `tests/maintenance-sweep-ui.test.ts` (Tasks 44–51, 9 tests)
  - and one unit test in `tests/asset-detail-view.test.ts` (Task 2).
  - Existing pins that lock what changes are edited in the same commit. Each new sweep assertion fails before its change; a Review Focus test may pin what must stay (its Step 2 says so).
- **Controller tasks:** Task 0 (branch, baseline, ids, before evidence), Task 52 (verify, production build, dev-app check), Task 54 (verify numbers, wiki, memory, finishing). **Task 53** (repo docs) is an implementer task.

**Interfaces between tasks:**

| Made in | What | Used by |
|---|---|---|
| Task 1 | `ActionBar` short-screen classes; no prop or API change | the four detail pages (`/assets/[id]`, `/audit/rounds/[id]`, `/disposal/[id]`, `/maintenance/[id]`) |
| Task 2 | `buildAssetDetailSectionHref(locale, assetId, currentView, sectionId, returnTo?)` exported from `src/lib/asset-detail-view.ts` (private `getAssetDetailSectionView`, `buildAssetDetailUrl`); `buildAssetDetailViewHref` output unchanged | the asset page (same task) |
| Task 7 | `revealFocusInScrollArea(area, focused)` in `src/components/audit/audit-scan-helpers.ts` | the check form (same task) |
| Task 11 | `AuditScanCheckPanel` `description: ReactNode` (was `string`) | the workspace (same task) |
| Task 20 | `AuditProgressBar` (non-compact) has no frame of its own; props unchanged | Task 27 (inside the coverage `ContentPanel`), Task 28 (its own `ContentPanel`) |
| Task 21 | `ChecklistItem.href` documented: the drill-down of a count; an item without one is a rule | the round page (Task 28, no change needed) |
| Task 43 | no `formatCurrency(` left on the disposal print page; LV3 row deleted | Tasks 50, 51 |
| Task 45 | `MaintenanceOptionSelect` optional `hint?: React.ReactNode`, passed to `SearchableSelect` | other callers pass nothing |
| Task 50 | no `formatCurrency(` left on the repair print page; `BUDGETS.LV3` `{}` | Task 51 |
| Tasks 6, 22–24, 26, 27, 29, 38, 39 | one name appended to `LOCAL_KEY_VALUE` or `LOCAL_STAT_TILE` each, with one comment line (R19) | each later task appends after it |

**Tech Stack:** Next.js 16.4 App Router · React 19 · Tailwind CSS 4.2 · class-variance-authority · tailwind-merge (through `cn()`) · next-intl 4 · Prisma 7 (not touched) · `node --test` with Node 24 type stripping.

**Spec:** `docs/superpowers/specs/2026-10-15-ui-phase2d-design.md`.
- **What this plan covers:** §3.4 and every M row whose plan column names 2D-4 or "by file" for these files:
  - M17 (these files' LFG rows: LV2 of the check-in form 9, the finding review actions 3 and the disposal batch form 3; LV3 6; LS1 1; LB1 of the operation document), M20, M21, M22, M24, M25, M26, M28, M29, M33;
  - D2 (the scanner's command buttons), D7, D9, D10, D18 (the `ActionBar` at 200% zoom), D19 (the room picker's sheet footer, the label-and-value and tile look-alikes);
  - §4.1 / D12: `formatCurrency`.
- **Carried items:** the findings page (left by the audit mobile fix); the keyboard that covers the check sheet's remark (DH "Audit Counting on Phones"); the rest of `c/asset-operations/transaction-cancel-dialog.tsx` (plan 2D-3 R2); the asset page's view-aware section links (wiki `ams-open-questions` 43 (1)); the print documents' missing snapshot as `null` (M32 b, as the asset page since 2D-3); wiki 38 (the bar height at 200%).
- **Line numbers** are of `45c1409` unless a step says otherwise. They move as earlier tasks edit a file; find every site by its quoted text.
- **Prior art:** `docs/superpowers/plans/2026-10-16-ui-phase2d-plan3.md` (rulings R1–R16 and the vocabulary). Unlike that plan, this one is not a transcript (see "How to read a task").

`D/` = `src/app/[locale]/(dashboard)/` · `P/` = `src/app/[locale]/(print)/` · `c/` = `src/components/`.

**Dry run:** the clone `p2d4-sim` (branch `sim4` on `45c1409`, its own `node_modules`) ran every code task in order, one commit each; Task 4, missed by the first run, ran last on top of Task 51:
- Sim commits: 1 `dad403ea` · 2 `22a89deb` · 3 `5aec886a` · 5 `a37e2c01` · 6 `1e6c1245` · 7 `7b34dd86` · 8 `242cbff6` · 9 `0f90f4e0` · 10 `71248e53` · 11 `2dd2350b` · 12 `c2eced41` · 13 `92d68e61` · 14 `7b1c5dd9` · 15 `bcceb3ac` · 16 `49eeb79c` · 17 `e0af5125` · 18 `221bff53` · 19 `fc2df1e2` · 20 `69cd9dc2` · 21 `24e5455c` · 22 `414e9813` · 23 `b6eaffde` · 24 `71428b9e` · 25 `f27c51a9` · 26 `ecd7c009` · 27 `7f39d15d` · 28 `b6744602` · 29 `ead2dfd7` · 30 `042167b3` · 31 `d982b9f3` · 32 `3fd43ea8` · 33 `7e9c8051` · 34 `6234a0d0` · 35 `829b2459` · 36 `ad5d3b1e` · 37 `8ad38f12` · 38 `4393b485` · 39 `77defa85` · 40 `8582aef4` · 41 `fba17cf7` · 42 `af764c42` · 43 `db5f6ec2` · 44 `7910617d` · 45 `33ba0666` · 46 `5bf59812` · 47 `57f4bb3c` · 48 `3e1c6d74` · 49 `4ae833ad` · 50 `0d9cdab9` · 51 `ea9691b3`. Task 4 `e54b7601` (run after Task 51: its two expected failures failed first, its four test files passed 61/61, `tsc` and eslint clean, line endings kept).
- Result: every listed failing test failed first (Task 26 had two, not three), every task ended with 0 fail, and `tsc` and eslint were clean wherever the run checked them; a full `npm run lint` after Tasks 18 and 35 gave 0 errors and 146 warnings, all under `.agents/`, and the check after Task 35 found every changed file with its line endings kept. Task 18 Step 3b was skipped (open issue 10 a not approved), so no message changed. Final count in the clone after Task 4: 2159 tests, 2158 pass, 0 fail, 1 skipped, this plan's total.
- What changed in this plan: every count is exact (the dry run's count, plus Task 4's 2 from Task 5 on); "How to read a task" says that new comments must not contain what a test forbids and how to read guard line numbers; the line-ending note on `git add` of LF files; the place of Task 2's helpers; Task 6's four open rows and its `Button` import; the comment texts and places the dry run chose (Tasks 8, 11, 18, 19, 30, 38, 47, and Task 48's `#history` comment as in Task 40); the import anchors of Tasks 11 and 49; Task 21's split of the checklist; Task 24's date note; Task 26's expected failures; Task 27's `formatScope` parts; Task 34's money rows; the mobile-only `text-meta` of Tasks 37 and 38; Task 38's recipient source; Task 43's Step 2; the guard line numbers of Tasks 34, 37, 43, 50 and 51 as they are when the task runs; Task 51's grep list and the tests that import `src/lib/utils.ts`.

- The user's answers of 2026-10-16 (open issues) were checked the same way: Task 18 Step 3b (10 a) and Task 32's named remove buttons (10 b) on top of Task 4 in `p2d4-sim` (`279ed80e`): the disposal sweep, glossary, workspace, choice-controls and route tests 65/65, `npm test` 2159 / 2158 / 0 / 1, `tsc` and eslint clean.

**Base:** `master` `45c1409` (2D-3 merged and pushed).

## Global Constraints

- **Git:**
  - Work in the main checkout `D:/Antigravity/asset-system` on branch `feat/ui-phase2d-plan4`, which holds `master` `45c1409` and this plan's commit.
  - Never run `git checkout`, `git switch`, `git reset`, `git stash`, `git rebase` or `git clean`, and never touch `master`.
  - Commit only the files your task names. Use `git add <paths>` (quote paths with brackets or parentheses) and never `git add -A` or `git add .`.
  - The checkout has untracked folders and files that are not yours: `.codex/`, `.impeccable/config.json`, `.impeccable/critique/`, `.playwright-mcp/`, `.superpowers/brainstorm/` and `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`; another session may add `.claude/` while its preview server runs. Leave them alone.
  - End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - Never create a git worktree whose `node_modules` is a junction to the main checkout's, and never let git remove one: `git worktree remove` follows the junction on Windows and deletes the main `node_modules`.
- **Next.js 16.4** is not the Next.js in your training data. Read `node_modules/next/dist/docs/` before you use an API you have not seen in this repo. This plan adds no Next.js API; it uses `Link`, `useId`, server pages and client components the way the files already do.
- **Line endings:**
  - `git config core.autocrlf` is `true` (system level). Most files this plan edits are CRLF in the working tree (`i/lf w/crlf`), among them the three guard files, `DESIGN.md`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md` and `docs/14_UI_UX_DESIGN_SYSTEM.md`.
  - These are LF (`i/lf w/lf`): `P/asset-management/checkouts/[id]/page.tsx`, `P/asset-management/checkins/[id]/page.tsx`, `P/asset-management/transfers/[id]/page.tsx`, `src/lib/utils.ts`, `tests/asset-handover-checkin.test.ts`, `tests/file-evidence-ui.test.ts`, and the five new test files.
  - Before you edit a file, run `git ls-files --eol <file>` and keep what it shows. In Git Bash, `grep -c $'\r'` reports 0 even for CRLF files, so do not use it as a check.
  - `git add` of an LF working-tree file (the five new sweep test files, `tests/asset-handover-checkin.test.ts`, `tests/file-evidence-ui.test.ts`, the three document pages `P/asset-management/{checkouts,checkins,transfers}/[id]/page.tsx`) prints "LF will be replaced by CRLF the next time Git touches it". That warning is expected and harmless: do not renormalize.
  - Edit with exact-string replacement (the Edit tool keeps the file's line endings), never a formatter, and never normalize a file.
  - Check line endings with `node <temp>/eol.mjs <file>…`. A CRLF file prints the same number twice; an LF file prints 0 and then the line count:

```js
// eol.mjs: node <temp>/eol.mjs <file>…   prints "<file> <CRLF count> <LF count>".
import { readFileSync } from "node:fs"
for (const file of process.argv.slice(2)) {
  const source = readFileSync(file, "utf8")
  console.log(file, (source.match(/\r\n/g) ?? []).length, (source.match(/\n/g) ?? []).length)
}
```

  - Tests that read source files strip `\r` (`.replace(/\r\n/g, "\n")`) before multi-line regexes.
- **How to read a task:**
  - **Changes at 45c1409** is a table of the sites: the line, what is there now (quoted as it is, LF shown; a CRLF file has CRLF), what it becomes, and the rule. "Becomes" is exact where a test pins it (prop order included) and an exact description otherwise; every prop and class the row does not name stays. Rows may be applied in any order. It is not a replacement transcript: read the file, make the change, and let the task's tests and guards confirm it.
  - **Step 1 code blocks are exact:** create or append them byte for byte. "Append" adds the block at the end of the file; the first line of a block shown empty is the blank line before it.
  - **Pin edits** are exact old → new strings; each old string occurs once in its file.
  - **Guard rows** (Step 4) are exact old → new text. Find each row by its text: the line numbers in the guard files move as earlier tasks delete rows or add comment lines. A guard line number marked "when this task runs" is the line before the task's first edit and assumes every earlier task as written, Task 4 included; without Task 4 (as in the dry run) the LFG rows below `BUDGETS.LB1` sit one or two lines further down.
  - **A comment a row adds is source the tests read.** The `doesNotMatch` and counting regexes of a task's test read the whole file, comments included, so a new comment never contains a string the test forbids or counts: class names (`text-primary`, `text-xs`, `-soft`, `-info-`, a tone such as `text-warning`), `<button`, `<label`, `cn(`, or `role="status"` where the test counts it. Where a row gives no comment text, write your own within that rule.
- **Tests:**
  - `npm test` runs `node scripts/run-tests.mjs` over `tests/**/*.test.{ts,mjs,js}`. Run one file with `node --test tests/<file>.test.ts`.
  - `tsconfig.json` includes `**/*.ts`, so **tests are type-checked**.
  - Modules that tests import use relative `.ts` imports (no `@/`). Tests cannot import `.tsx`; they read `.tsx` source text instead.
- **Baseline at `45c1409`** (the 2D-3 verify that commit records; Task 0 checks it again):
  - `npm test`: 2102 tests, 2101 pass, 0 fail, 1 skipped; `npm run build`: 60/60 pages.
  - `npx tsc --noEmit`: clean. `npm run lint`: 0 errors, 146 warnings, all under `.agents/`.
  - **After this plan:** 2159 tests, 2158 pass, 1 skipped (+57: 51 sweep tests, 5 Review Focus tests, 1 unit test). Each task states its exact count after its commit: the dry run's count for Tasks 1–3, the computed one for Task 4 (the dry run did not run it), and from Task 5 on the dry run's count plus Task 4's two tests (each Step 5 names the dry run's number too).
- **Every task ends with all of these green:** `npm test` with 0 fail and the task's count; `npx tsc --noEmit`; `npm run lint` with 0 errors and no new warning in `src/` or `tests/`. Report any failure by name.
- **Messages:** none change. No key is added, changed or deleted; every label a task passes already exists (`checkin.*`, `transactionCancellation.*`, `auditScan.*`, `auditRound.*`, `auditFinding.*`, `auditPending.*`, `disposalPage.*`, `maintenancePage.*`, `repairRecord.*`, `common.*`). The one exception, approved by the user 2026-10-16 (open issue 10 a): Task 18 Step 3b drops "✓ " from three `auditScan` keys through `node scripts/messages-edit.mjs`. Task 32 names its remove buttons with the existing `assetTools.removeSelectedAsset` (open issue 10 b, approved), no key change. If you think a key is missing, stop and report.
- **No new tokens (2A I21).** No custom property in `:root`, `@theme inline` or `@theme`, no `@custom-variant`, no edit to `tests/design-tokens-contrast.test.ts`, never `rounded-[…]`. Task 1's `[@media(max-height:32rem)]:` classes are Tailwind arbitrary variants, not tokens.
- **No migration, no DB write, no schema change, no API change.** No Prisma `select` changes either (open issue 15).
- **Guards only go down.** Never raise a number in `tests/visual-foundation-guards.test.ts` (VFG), `tests/form-migration-guards.test.ts` (FMG) or `tests/list-frame-guards.test.ts` (LFG), and never add a row. LFG L9 holds `BUDGETS` equal to `KEEP` and L10 holds every `KEEP` row equal to its live count, so the commit that moves a site lowers (or deletes at 0) its row in `BUDGETS` and `KEEP` together. A name joins `LOCAL_KEY_VALUE` or `LOCAL_STAT_TILE` (D19) in the commit that removes the last function of that name, so the count stays 0. R19 lists every row this plan moves.
- **No validation change.** Keep every `required`, `maxLength`, `minLength`, `pattern`, `toast.error` and `disabled` gate. FMG `CONSTRAINT_FLOORS` must still hold for these files: `maintenance-plan-form` [4, 2, 0], `repair-record-form` [2, 3, 0], `repair-record-actions` [3, 6, 0], `checkin-form` [4, 0, 0], `checkout-form` [6, 0, 0], `transfer-form` [1, 1, 0], `bulk-move-form` [1, 1, 0], `disposal-request-form` [3, 1, 1], `disposal-batch-form` [1, 1, 1], `disposal-execution-button` [8, 4, 1], `disposal-decision-button` [3, 1, 0], `audit-finding-review-actions` [1, 3, 0], `disposal-bulk-approval` [0, 1, 0], `disposal-bulk-execution` [5, 2, 1], `audit-round-form` [7, 1, 0], `audit-round-cancel-button` [1, 0, 0], `transaction-cancel-dialog` [0, 1, 0].
- **Off limits:**
  - Never open, read or print `.env` or `.env.prod-admin`.
  - Implementers do not run `npm ci`, `npm install`, `npm run build`, the dev server, or anything against a database. The controller runs the app in Tasks 0 and 52.
  - Do not run skill helper scripts; they make network calls.
  - Keep helper scripts and change files in your temp folder (`<temp>`), outside the repo.
  - Shell heredocs and `node -e` may drop backslashes. Write regex-bearing text with a file-writing tool.
- **Deploy:** none. One deploy after 2D, Dark Mode, the V track and the E2E suite (D17, wiki 27).

## Rulings of this plan

- **R1, the 2D-2 and 2D-3 rulings apply** (`docs/superpowers/plans/2026-10-15-ui-phase2d-plan2.md`, `2026-10-16-ui-phase2d-plan3.md`):
  - 2D-2 R2 `Chip` for names (a count is plain `num` text); R3 `tag` scope (short codes are `tag`, a row's own id at `font-medium`; a code that must wrap keeps `font-mono` with `break-all`; an editable `Input` keeps `font-mono`); R4 panels (`ContentPanel`, or `cn(getPanelClasses(), "p-4 sm:p-5")` for an element that cannot be one; the quiet grouping inside a panel; no frame in a frame); R5 `Notice` by meaning.
  - 2D-3 R3 (marker shapes, never a tone-colored dot), R12 (D19 helpers join the LFG lists in the commit that removes them), R13 (`formatDateTime` instead of a local date helper).
- **R2, tones and markers:**
  - Marker shapes (`statusMarkerVariants`) replace tone fills and dots: the audit progress legend takes each breakdown item's own tone (Task 20; rounds list: covered `success`, missing `warning`, scanned `info`, pending decision `danger`; round page: found `success`, mismatch `warning`, not found `danger`, pending `muted`); the disposal request history and the repair history use `primary` (Tasks 40, 48).
  - Audit round state on the rounds list is `StatusBadge status={round.status}` as on the round page (open `info`, closed `success`, cancelled `danger`, draft `muted`); ready to close `success`, items pending `warning`, a decision pending `danger` (Task 27). The findings page keeps `RESOLUTION_STATE_TONES` and `getStatusTone`; only its three badge wrappers go (Task 26).
  - Bulk execution outcomes: eligible `success`, executed `primary`, blocked `warning`, failed `danger` (`outcomeTones`, Task 38), the reason in words after the badge. Repair outcome: usable `success`, beyond repair `warning`, unknown `muted`, none `Nil` (Tasks 47, 48).
  - `StatStrip` `attention` marks a cell that blocks or waits: the close checklist (Task 21), the findings cell of the rounds next actions (Task 27). No success or primary fills on number cells.
  - Names, not states, are `Chip`: the disposal type (Task 39), the PM frequency (Task 49), the check-in legacy badge "ข้อมูลเก่า" (Task 6), the round page's component lines (Task 28).
  - Kept as they are (open issue 4): `DisposalStageBadge` (queue), `BatchStatus` (batch history) and `getStatusTone` on the disposal request and batch pages.
  - Color lives in badges, notices and destructive controls only: the primary panel-heading icons, the legacy backfill icon's `text-warning`, the attachment file icons' `text-info` / `text-danger` and the bulk toolbars' primary icons go.
- **R3, `Notice` by meaning (D7).** The call site owns the live role.
  - `info` (inline): OP the check-in's "send for repair"; AS the installed-in note, the saved banner when the save is kept on the device; AP the round form's component expansion line, the cancelled round's read-only line, the correction history lines; DS the request's source batch (an outline "open batch" action).
  - `neutral` (inline): AS the missing-photo reason in the pinned bar (a line, so the bar does not grow), the lookup card's offline line; AP the closer-is-not-creator rule while it blocks closing, what a rejection does; DS what a rejection restores.
  - `warning` (box): OP the check-in's "handover review required" and the legacy return list, the cancel dialog's blockers (`role="status"`); AS the offline bar (`role="status"`), the saved banner with a mismatch (`role="status"`), the lookup's out-of-scope result (its action records it), a camera that cannot start (`role="alert"`); AP the round cancel dialog's no-rollback line, what an approval does, the review conflict (`role="alert"`), the self-review note on the findings phone card; DS no evidence (`role="alert"`), the historical-exception warning (the execution dialog keeps `role="alert"` and `hidden`; the bulk execution one has no role), no eligible request (bulk approval, `role="alert"`), a recorded historical exception (request page); MT the closed-record evidence lock, the repair form's asset status effect, the stuck-asset instruction, the disposal review (its request button as the action).
  - `danger` (box): OP the cancel dialog's error (`role="alert"`, R12); AS the closed round (`role="alert"`, back to the round as the action), the lookup error (`role="alert"`), the photo retry (no role: its toast spoke); DS each bulk selection bar's error (under the bar; the approval one with an outline retry action) and each bulk dialog's error (R12), `role="alert"`; MT the repair form's open-record refusal and the list's invalid date range (`role="alert"`).
  - `success` (inline): AS the saved banner when everything matches or for an out-of-scope save (`role="status"`).
  - Faint text never sits on a fill: facts and fields that belong to a warning box follow it, outside the fill (the review conflict's two dates, the request page's exception facts, the bulk execution's historical-exception field and its two hints).
  - Kept outside `Notice` (audit mobile fix decisions): a check field's mismatch box and "ในระบบ: …" (D1), the scan header's mismatch ink and progress fill (D5), "อยู่ <room>" in warning ink (D6), the search highlight `<mark>`, the confirmed component's check (D2); the findings table's self-review note stays small warning text (13px now).
- **R4, panels and groupings (2D-2 R4, D9):**
  - `ContentPanel` for a page-level panel: the four operation forms (Tasks 5, 6), the register lookup card (16), the round close checklist and the round page's sections (21, 28), the audit pending count (29), the findings batch panel (25), the rounds coverage (27), the disposal stepper, evidence, request form, batch form steps, request-page sections and batch facts (30, 31, 33, 34, 40, 42), the repair attachments, repair form, PM form and the record page's panels (44–46, 48).
  - `cn(getPanelClasses(), …)` where the element cannot be one: the audit round `<form>` (Task 23); the scan check panel and its empty state, `<aside>`s without `p-4 sm:p-5` (11); the disposal queue's phone filter `<details>` (39); sections that keep an `id`: `#history` of the disposal and repair records, `#stuck`, `#pm-due` (40, 47, 48); list frames that hold phone cards, a table and a foot, `cn(getPanelClasses(), "overflow-hidden")` (26–29), and the scanner's room list and results, `"… divide-y divide-border overflow-hidden"` (13, 15).
  - `ContentPanel divided flush` with `ContentPanelRows`: the disposal batch history, the batch page's requests (41, 42) and the repair-record list (47).
  - The quiet grouping `rounded-md border border-border bg-background` inside a panel, never a frame in a frame: the custody facts, the scanner's note and photo fields and register matches, the round form's sampling group, the findings batch selection, the bulk selection bars (inset `mx-4 md:mx-5` in the flush queue panel), the stuck rows, the PM-due list, the repair form's optional details, the review dialog's summary, the evidence and attachment cards.
  - A list inside a panel is one bordered list with `divide-border-soft` lines, never a box per row: the legacy return list, the picker's chosen assets, the batch form's assets, the bulk review and result lists.
  - What goes: the progress bar's own frame (its callers decide), the coverage gap lists' frames, the boxes around a dropzone (check-in photos, repair attachments), the round form's preview boxes, the frame of the round page's result list head, the queue card's "more details" box, the attachment thumbnail's border.
  - Kept: the bulk move checkbox list box (a control list), the check sheet's component list (white and bordered: its ⋯ hover would vanish on `bg-background`), the `SignaturePad` canvas, the camera frame.
  - Panel titles are 16/600 text: the heading icons and the 18–20px panel headings go, and the padding is the one `p-4 sm:p-5` (was `sm:p-6` or `p-6`).
- **R5, raw `<button>`s that stay** (for 2D-5's `OWNERS`/`EXEMPT`; each gets a one-line comment at the site; all `permanent`). 10 in 7 files; no raw button stays in OP or AP:

| File | Buttons | Why |
|---|---|---|
| `c/audit/audit-scan-camera.tsx` | 3: zoom levels, torch, stop | controls over the camera image with their own dark fill and white ink (§5.3) |
| `c/audit/audit-scan-room-list.tsx` | 1: the row | the whole row of two to four lines opens the check sheet (`data-audit-scan-row`, `aria-current`, the workspace's focus logic) |
| `c/audit/audit-scan-search.tsx` | 1: the result row | the whole result row opens the check sheet |
| `c/audit/audit-scan-lookup-card.tsx` | 1: the register match | a two-line register match that opens it |
| `c/audit/audit-scan-room-picker.tsx` | 2: the trigger, the option | a two-line context control under `SheetTrigger asChild`; a pressed option the open-focus logic looks for |
| `c/disposal/disposal-asset-picker.tsx` | 1: the option row | `role="option"` with its own check box and two lines |
| `c/maintenance/maintenance-attachments.tsx` | 1: the thumbnail | the image or the PDF preview is the control (as 2D-3's photo buttons) |

  `OWNERS` (shared parts, not `EXEMPT`): `SearchField`'s own clear button; the `ActionBar`'s disabled `<a role="link" aria-disabled>` (K23).
- **R6, commands and links:**
  - Sizes from today's desktop height (DESIGN.md "Hand-written buttons"): `h-8` → `sm`; `min-h-11` only, or `h-9` / `h-10` not beside a field → no size (36px from `md`); a `Notice` action and a print toolbar button → `md` (D6).
  - `busy` instead of `disabled` while working (GB4: clicks blocked, focus kept, no fading): the round close button, the offline send, the disposal evidence delete, the repair attachment delete. No `disabled:opacity-*`, no hand-placed spinner.
  - A delete that is red at rest is `danger` (K22): the disposal evidence and repair attachment deletes (`icon-sm`). Taking an asset off a list deletes nothing: the picker's removes are `outline` `icon-sm`.
  - An `/api` download stays `<a>` with `buttonVariants` (M31).
  - Text links are `linkVariants`. A record's own code keeps its ink (`cn(linkVariants({ size: "inherit" }), "text-foreground")`); a link on a phone card or in a cell shown below `md` adds `inline-flex min-h-11 items-center md:min-h-0`; a code link in a table shown only from `md` is `linkVariants({ size: "inherit" })`; batch codes, evidence and the pending-page links are 13px `linkVariants()`.
  - A disclosure is an outline full-width `Button` with `aria-expanded` and `aria-controls` (set only while the panel exists) over a quiet grouping: the scanner's "หมายเหตุ / รูป" (Task 8) and the repair form's "รายละเอียดเพิ่มเติม (ไม่บังคับ)" (Task 45), as 2D-3's status correction.
  - D2, the scanner's icon buttons: the header back is a ghost `icon` link; the camera toggle is a ghost (pressed: `default`) `icon` `Button` with `aria-pressed` in `SearchField`'s `trailing` slot. D19: the room picker's clear button takes the dialog footer's layout.
  - The print documents: back is `PageBackLink`, print a `md` `Button` (Task 4).
- **R7, numbers:**
  - Counts and percentages go through `formatCount` in `num` (the scan header, room tabs, legacy filter count, progress bar, previews, dialogs).
  - Number tiles are `StatStrip`: the close checklist (3 counts, each a link while above 0), the rounds next actions (3), the round form preview (4), the bulk dialogs (5 in one strip, as the batch page; open issue 8).
  - A small dialog's review of counts (the round cancel dialog's six impact counts) and Thai text values (the risk preset) are a `KeyValueList`: `text-metric` is for numbers only.
  - A lone count is plain `num` text, never a box or pill: the coverage round count, the result list total, the attachment group count, the batch review count (`text-count num`, `aria-hidden`: the help sentence says it).
- **R8, codes (M33):**
  - A row's own code is `tag font-medium` inside a sized wrapper (room list, search results, register matches, findings and legacy rows, bulk review); a code with its name rendered in JSX is `<span className="tag">CODE</span> - name` (pending, rounds scope, stuck and PM-due rows, the queue's approver); the check sheet's serial through its `ReactNode` description.
  - Codes stay plain text inside a translated sentence and in a label string handed on as a string (`assetLabel` to dialogs and ⋯ menus, server-built labels, combobox options, sort keys); the scan `h1`'s round code is a title. Styling them needs a markup tag in the messages (open issue 9).
- **R9, empty states and empty values:**
  - `ActionEmptyState` when there is a title, a description or an action (the check-in with no handover waiting); `EmptyNote` for one line, `padded role="status"` where a live search filters the list, `tone="clear"` when nothing is left to do.
  - `Nil` through `KeyValueList` / `orNil`; `null` instead of a typed "-" (the check-in's `formatDate`, the print documents' `formatSnapshotState`, the cancelled round's date, the review dialog's values, the batch form's review); `nilLabel` keeps "ไม่ได้ระบุ" for screen readers in the bulk execution review (open issue 11).
  - Print pages keep their "-" (R17). The typed English "All assets" becomes the existing `auditRound.all`.
- **R10, D19 look-alikes:**
  - Join `LOCAL_KEY_VALUE` in the commit that removes them: `ReadOnly` (Task 6), `ReviewPreviewField` (24), `FindingComparison` (26), `MobileAuditField` (27), `PendingInfo` (29), `ReviewValue` (38), `MobileDisposalField` (39). Join `LOCAL_STAT_TILE`: `ImpactItem` (22), `PreviewMetric` (23), `SummaryValue` (38); `Metric` was already there.
  - Not added: `Summary` (the batch form's goes, but `function Summary` lives on in `c/admin/asset-state-review-workspace.tsx:266`) and `TextBlock` (the disposal request page's goes, but `D/maintenance/[id]/page.tsx:278` keeps its wells, R18).
  - The coverage gap phone card keeps its three numbers in a plain 3-column `<dl>`: a `KeyValueList` is one column below `sm`, where only these cards show.
- **R11, type:** `text-xs` sub-lines, hints and counts become `text-meta` (13/20; DESIGN.md Typography keeps Small for sidebar and menu headings, the bottom bar and `Kbd`); `tabular-nums` becomes `num`; capitals and tracking labels become `text-meta font-medium`; bold `text-lg` / `text-2xl` tile values go with their tiles. Not on print pages (the A4 Print Exception).
- **R12, dialog errors:** the error of a dialog's own action is a `Notice tone="danger" role="alert"`, the first thing in its body (DESIGN.md Dialogs → Errors): the transaction cancel dialog (Task 3, its "at least 5 characters" message included) and the two bulk disposal dialogs (Tasks 37, 38). The V track moves field errors under their fields later (I31).
- **R13, the asset page's in-page links (wiki 43, Task 2):** a link to a section of the custody, operations or audit view goes through `buildAssetDetailSectionHref` (`#id` in its own view, otherwise `?view=…&returnTo=…#id`); a link that renders only in the overview view and points at an overview section stays a plain `#id`; the `ActionBar`'s lifecycle links go through the helper because the bar shows in every view. `statusHref` had no reader and is deleted.
- **R14, the keyboard fix (Task 7):** while the check form is mounted, a `resize` listener on `window.visualViewport` (falling back to `window`) scrolls the focused control into view with `block: "nearest"`, only when it sits inside the scrolling body; `scroll-py-3` keeps the focus halo inside the body. Not taken: `scroll-padding-bottom` equal to the bar (nothing overlaps inside the scroller), an `onFocus` scroll (the browser already reveals the field it focuses), `viewport.interactiveWidget` (app-wide, Chromium only), a sheet sized to the visual viewport (open issue 14).
- **R15, the `ActionBar` on a short screen (D18, Task 1):** one media query, `max-height: 32rem` (720×450 of a 200% zoom of 1440×900, a phone on its side; no portrait phone is that short), as Tailwind arbitrary variants in the bar's own class strings: 6px instead of 12px above and below the row (the home-bar padding keeps `max(…, env(safe-area-inset-bottom))`), and only with a `primaryAction` a 1fr : 2fr row up to 768px wide. The links stay `size: "sm"` (44px below `md`), nothing hides, `actionBarPagePadding` stays. Not taken: hidden labels, an icon-only bar, a ⋯ overflow (phase 3).
- **R16, money on print pages and the end of `formatCurrency` (D10):** the disposal print page shows its five amounts as `formatMoney(Number(x), { unit: tCommon("baht") })`, each behind its `== null ? null :` check (Task 43); the repair print page `formatMoney(Number(cost))` without a unit, because its label says "(บาท)" (Task 50); then `formatCurrency` leaves `src/lib/utils.ts` after a grep of `src` and `tests` (Task 51, spec §4.1). LFG's `FORMAT_CURRENCY`, its LV3 counter, `TITLES.LV3`, the reader test and the `doesNotMatch` pins that name it stay for 2D-5. The batch form's review shows its values with the unit too (Task 34); the bulk execution review shows the stored decimals as before (open issue 6).
- **R17, print and camera stay (spec §5.3, permanent, for 2D-5's raw-color `EXEMPT`):**
  - The A4 paper of `c/asset-operations/operation-document-print.tsx` (raw `slate` / `red` / white, `shadow-sm`, its `h1`, `text-xs`, the uppercase brand line, the "-" of empty fields, `#ffffff` in its print CSS), `VoidDocumentBanner` (it prints inside the paper; its LFG comment says so since Task 4), the print pages' "-" data (LV2 2 and 4), the `SignaturePad` canvas (dashed `border-input`, white, `#0f172a`).
  - The scanner's camera controls (`border-white/50`, `bg-slate-950/70`, `bg-white`, `text-slate-950`, `text-white`, `hover:bg-white/15`) and the QR overlay (`border-white` ×4, the inline `rgba(15, 23, 42, 0.42)` shadow), each with a comment (Tasks 10, 19).
  - Only the screen toolbar of the print documents moves (Task 4).
- **R18, not taken or kept (open issues where the user may want more):**
  - The audit mobile fix stays as it is: the findings table's 8 columns, `<colgroup>`, `layout="fixed"`, `minWidth={960}`, sticky actions, `FindingValueChange`, `FindingStatusBadges`, the `compact` review actions and `RowActions` ⋯; the check sheet's pinned bar and the save and "ไม่ใช่ชิ้นนี้" heights (D1); the component rows (D2); the scan header (D5); full room names (D6). Only `text-xs` and hand-written links change inside them.
  - Not a sweep category: hover fills (`hover:bg-accent`, `active && "bg-accent"`, pinned) and `divide-border` on the scanner's lists; the duplicated badge tone maps of the room list and search results; the progress bar's fill colors and its `rounded-full` track (a meter); the coverage table's `font-semibold text-warning` missing count; the `ActionBar` and `ActionEmptyState` icon sizes; the not-found trigger's warning icon; the picker's chosen-option `primary-soft` box and its blocker line's danger ink (words carry it); the request form's local `Select` wrapper; the repair dialogs' muted help paragraphs; the record page's `TextBlock` wells; the PM page's inline "label: value" lines; the check-out's plain non-user handover help; the cancel dialog's facts `dl` (2D-3's `OperationReviewDialog` shape); `text-xs` on print pages.
  - Left for later: the asset state as a `StatusBadge` in the stuck rows and the record page (needs `name: true` in two Prisma `select`s); `maintenance-option-select.tsx:92`'s English live text (needs message keys); the missing-component dialog's focus return; `viewport.interactiveWidget`; one `getDisposalStageTone` for the four disposal pages; the asset page's lifecycle fields `statusLabel`, `statusValue` and `responsibilityLabel` that nothing reads (a dead-code pass); `DataFreshnessBanner` on the findings page (a `ui/` part, spec §5.5 GB3).
- **R19, guard rows this plan moves (all down; find each by its text):**

| Guard | Row | Before → after | Task |
|---|---|---|---|
| LFG LV2 | `D/assets/[id]/page.tsx` | 4 → 4; comment `:1197, :1199 … :2384` → `:1202, :1204 … :2390` (both tables) | 2 |
| LFG LB1 | `c/asset-operations/operation-document-print.tsx` | 1 → deleted from both tables (the LH1 row of the same text stays) | 4 |
| LFG LV2 | `c/asset-operations/void-document-banner.tsx` | 3 → 3; comment "2D" → "print page, the void banner prints on the A4 document (R-n, plan 2D-4)" | 4 |
| LFG LV2 | `c/asset-operations/checkin-form.tsx` | 9 → deleted | 6 |
| LFG LV2 | `c/audit/audit-finding-review-actions.tsx` | 3 → deleted, with its lone `// 2B-2` group line in `BUDGETS.LV2` | 24 |
| LFG LB1 | `D/audit/rounds/[id]/page.tsx` | 1 → 1; comment `:496` → `:499` | 28 |
| LFG LB1 | `c/disposal/disposal-batch-form.tsx` | 1 → 1; comment `:93` → `:97` | 34 |
| LFG LV2 | `c/disposal/disposal-batch-form.tsx` | 3 → deleted | 34 |
| LFG LS1 | `c/disposal/disposal-bulk-approval.tsx` | 1 → deleted; `BUDGETS.LS1` becomes `{}` (its `// 2B-2` line goes), `KEEP.LS1` goes | 37 |
| LFG LV3 | `P/disposal/[id]/print/page.tsx` | 5 → deleted | 43 |
| LFG LV3 | `P/maintenance/[id]/print/page.tsx` | 1 → deleted; `BUDGETS.LV3` becomes `{}` (its group comment goes), `KEEP.LV3` goes | 50 |
| LFG `LOCAL_KEY_VALUE` | the regex line | + `ReadOnly` (6), `ReviewPreviewField` (24), `FindingComparison` (26), `MobileAuditField` (27), `PendingInfo` (29), `ReviewValue` (38), `MobileDisposalField` (39) | as listed |
| LFG `LOCAL_STAT_TILE` | the regex line | + `ImpactItem` (22), `PreviewMetric` (23), `SummaryValue` (38) | as listed |
| FMG `LOADER2` | `c/asset-operations/transaction-cancel-dialog.tsx` | 1 → 1; comment `:134` → `:138` | 3 |
| FMG `LOADER2` | `c/audit/audit-scan-check-form.tsx` | 1 → 1; comment `:286` → `:296` → `:297` | 7, 8 |
| FMG `RAW_FIELDS` | `c/audit/audit-scan-room-picker.tsx` | 1 → 1; comment `:76` → `:88` | 14 |
| FMG `LOADER2` | `c/disposal/disposal-asset-picker.tsx` | 1 → 1; comment `:64` → `:66` | 32 |
| FMG `LOADER2` | `c/disposal/disposal-bulk-approval.tsx` | 2 → 2; comment `:560, :561` → `:565, :566` | 37 |
| FMG `LOADER2` | `c/disposal/disposal-bulk-execution.tsx` | 1 → 1; comment `:967 (its spinner :970)` → `:973 (its spinner :976)` | 38 |
| FMG `LOADER2` | `c/maintenance/maintenance-attachments.tsx` | 1 → deleted (the `// 1a` line above it stays) | 44 |

  - Totals: LV2 44 → 29 typed "-" (left: the R-n rows and the print rows); LV3 6 → 0; LS1 1 → 0; LB1 5 → 4 rows. LH1, LN1, VFG (its `:26`–`:28` pins and the R2 rows of the check form and the A4 page), FMG `CONSTRAINT_FLOORS` and `FIXED_BOTTOM_BARS` (the `ActionBar` stays 1) do not change.
  - The two regex lines after Task 39 (each name added with one comment line `// Plan 2D-4 Task <n> (<id>): <Name> (<where>).` directly above its `const`):

```ts
const LOCAL_STAT_TILE = /\bfunction (?:SummaryTile|SummaryCard|SummaryPill|SummaryStrip|RoleAuditCard|ResolutionMetric|CoverageMetric|Metric|DashboardCard|BatchMetric|MetricCard|OperationMetric|EvidenceStat|SummaryItem|ImpactItem|PreviewMetric|SummaryValue)\b/g
const LOCAL_KEY_VALUE = /\bfunction (?:Info|InfoRow|DetailItem|BatchInfo|MobileAuditDetailField|MovementInfo|ReviewItem|MobileField|DocumentFact|ReadOnly|ReviewPreviewField|FindingComparison|MobileAuditField|PendingInfo|ReviewValue|MobileDisposalField)\b/g
```

  This rule replaces the per-area wording of the drafts for these two lines; the tasks below give each step's old → new text.

## Review Focus

Five inputs or failure modes that would bite a person and that no task test exercised; each now has a test in its owning task's Step 1 block, and Task 52 checks it on the app.

1. **A long Thai label in a compact row on a phone.** The repair list's stuck rows put "<tag> - <long Thai name> (<state>)" beside a "บันทึกซ่อม" button in a 375px row. Task 47 rewrites the row, the link and the button classes; if the inner `truncate` span or `min-w-0` goes, the name pushes the button off the card. **Test:** "review focus 1: …" in Task 47 (the row keeps `min-w-0`, the link `min-w-0` with the inner `truncate` span, the button `shrink-0`). Task 52: a stuck asset with a long name at 375.
2. **An empty or missing value on a printout.** The disposal print page's five amounts are `null` when missing, which the print component prints as "-". Task 43 swaps `formatCurrency` for `formatMoney`; if the `== null ? null :` check goes, a missing sale value prints "0.00 บาท". **Test:** "review focus 2: …" in Task 43. Task 52: print preview of a request without sale values.
3. **A disabled action.** A transaction that cannot be cancelled (blockers) keeps its confirm and reason disabled, and the reasons say why. Task 3 rewrites the blocker box and moves the error; nothing pinned the two `disabled` gates or the translated blocker names. **Test:** "review focus 3: …" in Task 3. Task 52: the dialog on a transaction with blockers.
4. **The keyboard open on a phone.** Task 7's fix only scrolls a field that sits in the check form's scrolling body. A text field later moved into the pinned bar (Task 8 puts a `Notice` and a `ChoiceCard` there) would stay under the keyboard. **Test:** "review focus 4: …" in Task 7 (passes before and after: it pins the assumption). Task 52: the emulated keyboard check at 390×364.
5. **Print output.** Task 4 puts the shared `PageBackLink` and `Button` into the A4 documents' toolbar; they must stay inside `.operation-print-toolbar`, which the print CSS hides, or they print on the paper. **Test:** "review focus 5: …" in Task 4. Task 52: print preview (`emulateMedia({ media: "print" })`) of a check-out, a check-in and a transfer document.

## File structure

| File | What changes | Task |
|---|---|---|
| `c/ui/action-bar.tsx` | short-screen padding; the next step beside the links (D18) | 1 |
| `D/assets/[id]/page.tsx`, `src/lib/asset-detail-view.ts` | links to a section of another view open that view; `statusHref` deleted | 2 |
| `c/asset-operations/transaction-cancel-dialog.tsx` | the error a danger `Notice` first in the body, blockers a warning `Notice`, `formatCount` | 3 |
| `c/asset-operations/operation-document-print.tsx`, `P/asset-management/{checkouts,checkins,transfers}/[id]/page.tsx` | `PageBackLink` and a `md` print `Button`; a missing snapshot is `null` | 4 |
| `c/asset-operations/checkout-form.tsx`, `transfer-form.tsx`, `bulk-move-form.tsx` | `ContentPanel`; `EmptyNote` | 5 |
| `c/asset-operations/checkin-form.tsx` | `ContentPanel`, `Notice`s, `ActionEmptyState`, `KeyValueList` with `Nil`, `Chip`, `EmptyNote`; `ReadOnly` deleted | 6 |
| `c/audit/audit-scan-check-form.tsx`, `audit-scan-helpers.ts` | the keyboard reveal (`revealFocusInScrollArea`) | 7 |
| `c/audit/audit-scan-check-form.tsx` | info / neutral `Notice`s, the outline note-and-photo toggle over a quiet grouping, `ChoiceCard` | 8 |
| `c/audit/audit-scan-check-field.tsx` · `audit-scan-panels.tsx` | `text-meta` hints and sub-lines; the overlay's permanent comment | 9 · 10 |
| `c/audit/audit-scan-check-panel.tsx`, `audit-scan-workspace.tsx` | panel classes, `EmptyNote`, the serial as `tag`, the closed round a danger `Notice` | 11 |
| `c/audit/audit-scan-header.tsx` · `audit-scan-room-list.tsx` · `audit-scan-room-picker.tsx` | ghost icon link and `formatCount` · panel classes, `EmptyNote`, `tag`, `Button`, `linkVariants` · no dashed trigger, `text-meta`, the dialog footer layout (D19) | 12 · 13 · 14 |
| `c/audit/audit-scan-search.tsx` · `audit-scan-lookup-card.tsx` | `SearchField` with the camera `Button` · `ContentPanel`, `Notice`s, `EmptyNote` | 15 · 16 |
| `c/audit/audit-scan-offline-bar.tsx` · `audit-scan-saved-banner.tsx` · `audit-scan-camera.tsx` | warning `Notice`, busy send · `Notice` by result · warning `Notice`, raw controls commented | 17 · 18 · 19 |
| `c/audit/audit-progress-bar.tsx` · `audit-round-close-button.tsx` · `audit-round-cancel-button.tsx` | frameless, marker legend · `ContentPanel`, busy `Button`, `StatStrip` · `KeyValueList`, warning `Notice` (M26) | 20 · 21 · 22 |
| `c/audit/audit-round-form.tsx` · `audit-finding-review-actions.tsx` · `audit-findings-batch-actions.tsx` | the form on the panel classes, `StatStrip`, `ChoiceCard` · `KeyValueList`, `Notice`s, no typed "-" · `ContentPanel`, `ChoiceCard` | 23 · 24 · 25 |
| `D/audit/findings/page.tsx` · `D/audit/rounds/page.tsx` · `D/audit/rounds/[id]/page.tsx` · `D/audit/rounds/[id]/pending/page.tsx` | the four audit pages | 26 · 27 · 28 · 29 |
| `c/disposal/disposal-workflow-stepper.tsx` · `disposal-attachments.tsx` · `disposal-asset-picker.tsx` · `disposal-request-form.tsx` | `ContentPanel` (M28) · `ContentPanel`, `EmptyNote`, shared buttons · shared buttons, one quiet list · `ContentPanel` | 30 · 31 · 32 · 33 |
| `c/disposal/disposal-batch-form.tsx` · `disposal-decision-button.tsx` · `disposal-execution-button.tsx` | `ContentPanel`s, `KeyValueList`, `Nil` · neutral `Notice` · warning `Notice`s | 34 · 35 · 36 |
| `c/disposal/disposal-bulk-approval.tsx` · `disposal-bulk-execution.tsx` | M26: quiet bars, `Notice`s, `StatStrip`, `KeyValueList`, `StatusBadge` | 37 · 38 |
| `D/disposal/page.tsx` · `D/disposal/[id]/page.tsx` · `D/disposal/batches/page.tsx` · `D/disposal/batches/[id]/page.tsx` | the four disposal pages | 39 · 40 · 41 · 42 |
| `P/disposal/[id]/print/page.tsx` | `formatMoney` (D10, M24) | 43 |
| `c/maintenance/maintenance-attachments.tsx` · `repair-record-form.tsx` + `maintenance-option-select.tsx` · `maintenance-plan-form.tsx` | M28 · `ContentPanel`, `Notice`s, the disclosure, `hint` · `ContentPanel` | 44 · 45 · 46 |
| `D/maintenance/page.tsx` · `D/maintenance/[id]/page.tsx` · `D/maintenance/pm/page.tsx` | the repair list, the record page, the PM page | 47 · 48 · 49 |
| `P/maintenance/[id]/print/page.tsx` · `src/lib/utils.ts` | `formatMoney` · `formatCurrency` deleted | 50 · 51 |
| `tests/*` | five new files and one unit test; pins edited with their file; guard rows in 3 files | 1–51 |
| `DESIGN.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md` | plan 2D-4 docs | 53 |

No change (checked): `c/asset-operations/signature-pad.tsx` and `void-document-banner.tsx` (print content; only the banner's LFG comment changes), `D/asset-management/{checkout,checkin,transfer,bulk-move}/page.tsx`, `P/assets/labels/page.tsx`, `P/assets/[id]/label/page.tsx`, `c/audit/audit-scan-component-missing-dialog.tsx`, `audit-scan-types.ts`, `use-audit-scan-room.ts`, `D/audit/rounds/[id]/scan/page.tsx`, `D/audit/rounds/new/page.tsx`, `c/audit/audit-mark-not-found-button.tsx`, `audit-pending-row-actions.tsx`, `c/disposal/disposal-row-actions.tsx`, `D/disposal/new/page.tsx`, `D/disposal/batch/new/page.tsx`, `c/maintenance/maintenance-plan-state-actions.tsx`, `repair-record-actions.tsx`, `repair-record-upload.ts`, `D/maintenance/new/page.tsx`, `D/maintenance/pm/new/page.tsx`, `D/maintenance/pm/[id]/edit/page.tsx`, `messages/*.json` (unless Task 18 Step 3b is approved).

---

### Task 0: Branch, baseline, ids and before evidence (controller runs this task, not an implementer)

**Files:**
- Create then delete: a launch configuration for the dev server only while it runs; never committed. If `.claude/launch.json` already holds another session's configuration, do not edit or delete theirs: add your own entry with its own name and port, and remove only that entry afterwards.
- Evidence: `.superpowers/sdd/screenshots/ui-phase2d-plan4/before/` and `.superpowers/sdd/ui-phase2d-plan4/task-0-baseline.md` (git-ignored).

**Interfaces:**
- Consumes: `feat/ui-phase2d-plan4` at the plan commit (on `45c1409`).
- Produces: the baseline numbers, the ids, the before images, the before `href` lists and the before measurements, which Task 52 compares against.

- [ ] **Step 1: Branch and base.**
  - `git rev-parse --abbrev-ref HEAD` → `feat/ui-phase2d-plan4`.
  - `git merge-base --is-ancestor 45c1409 HEAD && git diff --quiet 45c1409 HEAD -- src tests messages scripts prisma && echo BASE-OK` → `BASE-OK`; `git diff --name-only 45c1409 HEAD` lists only this plan (`docs/superpowers/plans/2026-10-16-ui-phase2d-plan4.md`).
  - `git status --short` → only the untracked folders and files of the Global Constraints.
- [ ] **Step 2: Baseline.** `npm test` (expected 2102 tests, 2101 pass, 0 fail, 1 skipped), `npx tsc --noEmit` (clean), `npm run lint` (0 errors; record the warning count and check that every warning is under `.agents/`; 146 at `45c1409`). Record the numbers in `task-0-baseline.md`.
- [ ] **Step 3: Temp scripts.** Save `eol.mjs` (Global Constraints) in `<temp>`. Hand its path to every implementer.
- [ ] **Step 4: Dev server.**
  - If `preview_list` shows a dev server of this checkout on `:3000`, use it and do not stop it. Otherwise add a launch configuration `name: "asset-2d4-dev-3100"`, `runtimeExecutable: "node"`, `runtimeArgs: ["node_modules/next/dist/bin/next", "dev", "-p", "3100"]`, `port: 3100`, `autoPort: false` (if another session's server holds 3100, use 3102 and say so in the baseline file), and start it with `preview_start`.
  - Memory says `.env` points at `asset_management_dev` / `asset_dev`. Confirm this without opening the file: `/th/admin/readiness` shows the database checks. If anything suggests the production database, stop.
  - Log in with the seed admin of `prisma/seed.ts`; do not echo the password. Use your own browser tab.
- [ ] **Step 5: Ids.** Record these, and note any the dev data lacks (wiki 38: dev may have only disposed disposal requests):
  - audit: an open round with pending items, findings and a correction history line (`/th/audit/rounds/<id>`, `/scan`, `/pending`), a closed round, a cancelled round if there is one, a finding with evidence files;
  - disposal: a request at each stage the data has (`/th/disposal/<id>`, its `/print`), one with a historical evidence exception if any, one in a batch, a batch (`/th/disposal/batches/<id>`); whether the queue has pending or approved requests (the bulk dialogs need them);
  - maintenance: a record with attachments and history, a closed record, a "beyond repair" record if any (`/th/maintenance/<id>`, its `/print`), a stuck asset with a long name if any, a PM plan due (`/th/maintenance/pm`, its edit page);
  - transactions: an active check-out, a check-in and a transfer document (`/th/asset-management/checkouts/<id>`, `checkins/<id>`, `transfers/<id>`), one with cancellation blockers if any, a void document if any; a handover waiting for check-in and a legacy return candidate if any;
  - the asset page: a personal asset with a custodian and an open repair or audit follow-up, a component asset, a software license if any (`/th/assets/<id>` in each view: `overview`, `custody`, `operations`, `audit`).
- [ ] **Step 6: Before `href`s.** With inline Playwright code (`browser_run_code_unsafe`), save every `a[href]` inside `main` (text, `href`) to `task-0-baseline.md` on: the four views of `/th/assets/<id>`; `/th/audit/rounds`, `/th/audit/rounds/<id>`, its `/pending` and `/scan`, `/th/audit/findings`; `/th/disposal`, `/th/disposal/<id>`, `/th/disposal/batches`, `/th/disposal/batches/<id>`; `/th/maintenance`, `/th/maintenance/<id>`, `/th/maintenance/pm`; the three document pages.
- [ ] **Step 7: Before measurements** (Task 52 repeats them):
  - the `ActionBar` height (`document.querySelector('[data-slot="action-bar"]').getBoundingClientRect().height`) at 720×450 and at 375×812 on `/th/assets/<id>`, `/th/maintenance/<id>`, `/th/audit/rounds/<id>` and `/th/disposal/<id>` (a pending or approved request for the next step, if the data has one);
  - the keyboard emulation of Task 52 Step 10 on the check sheet (expected before: the textarea's bottom is below the bar's top).
- [ ] **Step 8: Before screenshots.** Save to `.superpowers/sdd/screenshots/ui-phase2d-plan4/before/<view>-<width>.png` at 1440, 768 and 375 (write nothing; open each dialog, sheet and disclosure to its first screen and close it with ยกเลิก, the X or Esc):
  - the asset page's overview (data health, follow-ups, quick actions) and the phone `ActionBar`;
  - `/th/audit/rounds/<id>/scan` with the room picker, a typed search, an opened check sheet with "หมายเหตุ / รูป" open, the lookup card of an unknown code; `/th/audit/rounds`, `/th/audit/rounds/<id>` (open and cancelled), `/pending`, `/th/audit/findings` (also at 1280×800), `/th/audit/rounds/new` (no preview), the round close and cancel dialogs and the review dialogs to their first screen;
  - `/th/disposal` (phone filter open at 375), `/th/disposal/<id>` (each stage the data has), `/th/disposal/batches`, `/th/disposal/batches/<id>`, `/th/disposal/new`, `/th/disposal/batch/new`, the decision and execution dialogs to their first screen if a request allows;
  - `/th/maintenance`, `/th/maintenance/<id>`, `/th/maintenance/new` with "รายละเอียดเพิ่มเติม" open, `/th/maintenance/pm`, `/th/maintenance/pm/new`, a PM edit page;
  - `/th/asset-management/checkout`, `/checkin` (a handover chosen), `/transfer`, `/bulk-move`, the three document pages and their print preview (`emulateMedia({ media: "print" })`).
- [ ] **Step 9: Clean up.** Stop your server if you started one and remove your launch configuration (only yours; delete `.claude/launch.json` only if you created the file). `git status --short` shows what Step 1 showed. No commit in this task.

---

## Area OP: the shared bits and the asset transactions (Tasks 1–6)

Spec §3.4 ("ธุรกรรมทรัพย์สิน", D18), wiki 38 and 43 (1). Task 1 creates `tests/operations-sweep-ui.test.ts`; Tasks 2–6 append to it. After the area: LFG LV2 44 → 35, LB1 loses the operation document's row, `LOCAL_KEY_VALUE` gains `ReadOnly`, and no raw `<button>` is left in these files.

### Task 1 (OP-1): the phone ActionBar is one row on a short screen (`src/components/ui/action-bar.tsx`)

Spec D18 ("ความสูง `ActionBar` ที่ zoom 200%"), wiki open question 38; K23 stays. A short screen (`max-height: 32rem`, 512px: the 720×450 of a 200% zoom on 1440×900, a phone on its side; no portrait phone is that short) gets 6px instead of 12px above and below the row, the iPhone home-bar padding kept, and, only when the bar has a `primaryAction` (the disposal request's next step), the next step sits beside the links in a 1fr : 2fr grid (up to `max-w-3xl`) instead of above them. The bar drops from 69 to 57px, the disposal bar with a next step from 121 to 57px. The links stay `buttonVariants({ size: "sm" })`, 44px below `md`; nothing is hidden and `md:hidden` is unchanged. `actionBarPagePadding` stays (the room under the page is still more than the bar). The classes are Tailwind arbitrary variants, not a token or a `@custom-variant` (2A I21). The 6px top padding still holds the 2px focus ring and its 2px offset inside the bar.

**Files:**
- Modify: `src/components/ui/action-bar.tsx` (CRLF)
- Create: `tests/operations-sweep-ui.test.ts` (LF)
- Test: `tests/mobile-action-bar.test.ts` (CRLF)

**Changes at `45c1409`:**

| line | now | becomes | rule |
|---|---|---|---|
| `:23`-`:26` | the comment above `ActionBar` | add one sentence: a short screen (max-height 32rem: 720×450 at 200% zoom of 1440×900, a phone on its side) keeps the 44px targets, gets 6px instead of 12px above and below them, and puts the next step beside the links, so the bar is one row there (spec 2D D18) | D18 |
| `:43` | `className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:hidden"` | the same string with ` [@media(max-height:32rem)]:pb-[max(0.375rem,env(safe-area-inset-bottom))] [@media(max-height:32rem)]:pt-1.5` appended (one string, so FMG GL1 still counts 1) | D18 |
| `:45` | `<div className="mx-auto grid min-w-0 max-w-lg gap-2">` | `<div className={cn("mx-auto grid min-w-0 max-w-lg gap-2", primaryAction && "[@media(max-height:32rem)]:max-w-3xl [@media(max-height:32rem)]:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]")}>` (only with a next step: a lone link row must not land in the 1fr column) | D18 |

- [ ] **Step 1: The failing test.** Create `tests/operations-sweep-ui.test.ts` (LF) with exactly:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-4 (spec 2D §3.4, D7, D9, D18, M20, M21, M22, M25, M29, M32 b, M33): the shared bits and the asset
// transactions on the shared parts. The phone ActionBar is one row on a short screen, the asset page's in-page links
// open the view that shows their section, the operation forms are ContentPanels, messages Notice by meaning, empty
// states EmptyNote or ActionEmptyState, label and value pairs KeyValueList, empty values Nil, codes tag. Each test pins
// one file (or one tight group) and fails before that commit. Sources are read with LF line endings, so the regexes may
// contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/"

test("ActionBar: a short screen keeps the 44px links, halves the padding and puts the next step beside the links (spec 2D D18)", () => {
  const source = read(`${C}ui/action-bar.tsx`)
  assert.match(source, /className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-3 pb-\[max\(0\.75rem,env\(safe-area-inset-bottom\)\)\] pt-3 md:hidden \[@media\(max-height:32rem\)\]:pb-\[max\(0\.375rem,env\(safe-area-inset-bottom\)\)\] \[@media\(max-height:32rem\)\]:pt-1\.5"/)
  assert.match(source, /<div className=\{cn\("mx-auto grid min-w-0 max-w-lg gap-2", primaryAction && "\[@media\(max-height:32rem\)\]:max-w-3xl \[@media\(max-height:32rem\)\]:grid-cols-\[minmax\(0,1fr\)_minmax\(0,2fr\)\]"\)\}>/)
  assert.match(source, /buttonVariants\(\{ variant: action\.primary \? "default" : "outline", size: "sm" \}\)/, "size sm stays 44px tall below md")
  assert.doesNotMatch(source, /32rem\)\]:(?:min-)?h-|32rem\)\]:hidden/, "nothing shrinks a 44px target or hides an action on a short screen")
})
```

  Edit the existing pins in `tests/mobile-action-bar.test.ts` (CRLF; exact-string replacement):
  - `:32`: the regex ending `pt-3 md:hidden"/)` becomes ending `pt-3 md:hidden /)` (only the closing `"` before `/)` becomes a space).
  - `:33`: `/<div className="mx-auto grid min-w-0 max-w-lg gap-2">\n` (the start of the regex) becomes `/<div className=\{cn\("mx-auto grid min-w-0 max-w-lg gap-2", primaryAction && "[^"]+"\)\}>\n`; the rest of the line stays.

- [ ] **Step 2: Watch it fail.** `node --test tests/operations-sweep-ui.test.ts tests/mobile-action-bar.test.ts`. Expected to fail: "ActionBar: a short screen keeps the 44px links, halves the padding and puts the next step beside the links (spec 2D D18)" and "ActionBar is one server-safe bar of shared button links, with the page padding it needs (K23)".
- [ ] **Step 3: Implement** per the Changes table. `cn` is already imported.
- [ ] **Step 4: Guard rows.** None change. FMG `FIXED_BOTTOM_BARS` `` [`${C}ui/action-bar.tsx`]: 1 `` stays 1 (the new classes are in the same class string; the inner `cn` strings have neither `fixed` nor `bottom-`). VFG "panels and bottom action bars are flat" still holds.
- [ ] **Step 5: Verify.** `node --test tests/operations-sweep-ui.test.ts tests/mobile-action-bar.test.ts tests/audit-scan-search-ui.test.ts tests/disposal-detail-workspace.test.ts tests/form-migration-guards.test.ts tests/visual-foundation-guards.test.ts`; `npm test` (+1: 2103 tests, 2102 pass, 0 fail, 1 skipped); `npx tsc --noEmit`; `npm run lint` (0 errors, no new warning in `src/` or `tests/`).
- [ ] **Step 6: Commit.**

```
git add src/components/ui/action-bar.tsx tests/operations-sweep-ui.test.ts tests/mobile-action-bar.test.ts
git commit -m "fix(ui): the phone ActionBar is one row with half the padding on a short screen (2D-4 task 1, OP-1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2 (OP-2): the asset page's links to a section of another view open that view (`src/app/[locale]/(dashboard)/assets/[id]/page.tsx`, `src/lib/asset-detail-view.ts`)

Wiki open question 43 (1), spec §3.4; the page was swept in 2D-3, so only its in-page section links change. The overview view renders the data health, the follow-ups and the quick actions, and the phone ActionBar shows two lifecycle actions in every view; their links to sections of the custody, operations or audit view ("#ownership", "#maintenance", "#audit", "#components") did nothing, and the ActionBar's "#purchase" and "#components" did nothing outside their view. A new helper in `src/lib/asset-detail-view.ts` returns `#<section>` when the current view renders the section, otherwise the URL of the view that does, with the same `returnTo`, anchored on the section. Links that render only in the overview view and point at overview sections ("#overview", "#purchase", "#photos") stay plain. `statusHref` is never read anywhere: it is deleted instead of made view-aware. Every view, tab, section id, href target and the back link stay the same.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx` (CRLF), `src/lib/asset-detail-view.ts` (CRLF)
- Test: `tests/operations-sweep-ui.test.ts` (LF), `tests/asset-detail-view.test.ts` (CRLF), `tests/list-frame-guards.test.ts` (CRLF, comments only)

**Changes at `45c1409`:**

| line | now | becomes | rule |
|---|---|---|---|
| `asset-detail-view.ts:45`-`:54` | `buildAssetDetailViewHref` builds the URL inline | the URL-building moves into a private `buildAssetDetailUrl(locale, assetId, view, anchor, returnTo?)`, placed directly after `buildAssetDetailViewHref` and after `getAssetDetailSectionView`; `buildAssetDetailViewHref` calls it with `assetDetailViewAnchor[view]` (same output; pinned by `tests/asset-detail-view.test.ts:18`-`:23`) | wiki 43 |
| `asset-detail-view.ts` (new, directly after `buildAssetDetailViewHref`, before `buildAssetDetailUrl`) | none | private `getAssetDetailSectionView(sectionId: AssetDetailSectionId): AssetDetailView`: the view whose list in `sectionIdsByAssetDetailView` holds the section, `return assetDetailViews.find((view) => sectionIdsByAssetDetailView[view].includes(sectionId)) ?? "overview"` (the `??` is for the type; every section is in exactly one list). Not exported: no caller outside the file (D12) | wiki 43 |
| `asset-detail-view.ts` (new, at the end) | none | exported `buildAssetDetailSectionHref(locale: string, assetId: string, currentView: AssetDetailView, sectionId: AssetDetailSectionId, returnTo?: string \| null): string`, with a comment naming wiki 43 (algorithm in Step 3) | wiki 43 |
| page `:65` | `import { buildAssetDetailViewHref, isAssetDetailSectionVisible, parseAssetDetailView } from "@/lib/asset-detail-view"` | `import { buildAssetDetailSectionHref, buildAssetDetailViewHref, isAssetDetailSectionVisible, parseAssetDetailView, type AssetDetailSectionId } from "@/lib/asset-detail-view"` | |
| page after `:711` (the end of `componentsManagerHref`) | none | a one-line comment (wiki 43) and `const sectionHref = (sectionId: AssetDetailSectionId) => buildAssetDetailSectionHref(locale, asset.id, assetDetailView, sectionId, returnToHref)` | wiki 43 |
| page `:715`, `:733` | `createHealthItem(hasAssetResponsibility(asset), responsibilityHealthLabel, "#ownership", …)` | `sectionHref("ownership")` in place of `"#ownership"` | wiki 43 |
| page `:753`, `:757` | `: "#handover"` (the fallbacks of `checkinHref` and `latestDocumentHref`, used only by actions that are disabled then) | `: sectionHref("handover")` | wiki 43 |
| page `:768` (the `getOwnershipLifecycle({ … })` call) | `latestDocumentHref,` then `hasAssignedAsset: …` | after `latestDocumentHref,` add `purchaseHref: sectionHref("purchase"),`, `auditHref: sectionHref("audit"),`, `componentsHref: sectionHref("components"),` (one per line, in that order) | wiki 43 |
| page `:796` | `href: "#movement",` (the activity drawer item; the drawer renders no href) | `href: sectionHref("movement"),` | wiki 43 |
| page `:813` | `href: "#maintenance",` | `href: sectionHref("maintenance"),` | wiki 43 |
| page `:840` | `href: "#audit",` | `href: sectionHref("audit"),` | wiki 43 |
| page `:1596`-`:1597`, `:1611`-`:1612` | the parameters and the type of `getOwnershipLifecycle` | add `purchaseHref`, `auditHref`, `componentsHref` after `latestDocumentHref` in both, typed `string` | |
| page `:1631` | `const renewAction = { href: "#purchase", …` | `{ href: purchaseHref, …` (the ActionBar shows it in every view) | wiki 43 |
| page `:1632` | `const auditAction = { href: "#audit", …` | `{ href: auditHref, …` | wiki 43 |
| page `:1664`, `:1683`, `:1702`, `:1725` | `` { href: `#audit`, … `` (`:1664`) and `{ href: "#audit", …` | `{ href: auditHref, icon: <ScanLine className="h-4 w-4" />, label: t("quickAudit") }` | wiki 43 |
| page `:1688` | `const componentAction = { href: "#components", …` | `{ href: componentsHref, …` (the ActionBar shows it in every view) | wiki 43 |
| page `:1642`, `:1661`, `:1680`, `:1699`, `:1717` | `statusHref: "#…",` | delete (no reader) | dead field |
| page `:714`, `:716`-`:718`, `:721`-`:732`, `:734`, `:756`, `:822`, `:831`, `:2207`, `:2233` | "#overview", "#purchase", "#photos" | stay: they render in the overview view only, which renders those sections | |

- [ ] **Step 1: The failing test.** Append to `tests/operations-sweep-ui.test.ts`:

```ts

const D = "src/app/[locale]/(dashboard)/"

test("asset page: a link to a section that the current view hides opens the view that shows it (wiki 43, spec 2D §3.4)", () => {
  const source = read(`${D}assets/[id]/page.tsx`)
  assert.match(source, /import \{ buildAssetDetailSectionHref, buildAssetDetailViewHref, isAssetDetailSectionVisible, parseAssetDetailView, type AssetDetailSectionId \} from "@\/lib\/asset-detail-view"/)
  assert.match(source, /const sectionHref = \(sectionId: AssetDetailSectionId\) => buildAssetDetailSectionHref\(locale, asset\.id, assetDetailView, sectionId, returnToHref\)/)
  assert.equal(source.match(/createHealthItem\(hasAssetResponsibility\(asset\), responsibilityHealthLabel, sectionHref\("ownership"\), /g)?.length, 2)
  assert.match(source, /href: sectionHref\("maintenance"\),\n\s+actionLabel: t\("quickMaintenance"\),/)
  assert.match(source, /href: sectionHref\("audit"\),\n\s+actionLabel: t\("detailSections\.audit"\),/)
  assert.match(source, /purchaseHref: sectionHref\("purchase"\),\n\s+auditHref: sectionHref\("audit"\),\n\s+componentsHref: sectionHref\("components"\),/)
  assert.match(source, /const renewAction = \{ href: purchaseHref, /, "the phone ActionBar shows it in every view")
  assert.match(source, /const auditAction = \{ href: auditHref, /)
  assert.match(source, /const componentAction = \{ href: componentsHref, /, "the phone ActionBar shows it in every view")
  assert.equal(source.match(/\{ href: auditHref, icon: <ScanLine className="h-4 w-4" \/>, label: t\("quickAudit"\) \}/g)?.length, 4)
  // Only sections of the overview view stay plain "#id" links: they render in the overview view only.
  assert.doesNotMatch(source, /["`]#(?:ownership|components|handover|movement|maintenance|audit)["`]|\bstatusHref\b/)
})
```

  In `tests/asset-detail-view.test.ts` (CRLF): add `  buildAssetDetailSectionHref,` as the first name of the import list (`:5`, before `  buildAssetDetailViewHref,`), and append:

```ts

// Wiki open question 43 (plan 2D-4): an in-page link to a section is "#id" in the view that renders the section, and
// otherwise the URL of the view that does, with the same returnTo and the section as the anchor.
test("links a section in place when the view renders it, and otherwise opens the view that does", () => {
  assert.equal(buildAssetDetailSectionHref("th", "asset id/1", "overview", "purchase", "/th/assets"), "#purchase")
  assert.equal(buildAssetDetailSectionHref("th", "asset id/1", "custody", "components", "/th/assets"), "#components")
  assert.equal(
    buildAssetDetailSectionHref("th", "asset id/1", "overview", "ownership", "/th/assets?status=ready"),
    "/th/assets/asset%20id%2F1?view=custody&returnTo=%2Fth%2Fassets%3Fstatus%3Dready#ownership",
  )
  assert.equal(buildAssetDetailSectionHref("th", "a1", "overview", "audit"), "/th/assets/a1?view=audit#audit")
  assert.equal(buildAssetDetailSectionHref("th", "a1", "overview", "maintenance", ""), "/th/assets/a1?view=operations#maintenance")
  assert.equal(buildAssetDetailSectionHref("th", "a1", "audit", "purchase", "/th/assets"), "/th/assets/a1?view=overview&returnTo=%2Fth%2Fassets#purchase")
})
```

  No existing assertion pins a changed link (`grep -rn '#ownership\|#audit\|statusHref' tests` finds none).
- [ ] **Step 2: Watch it fail.** `node --test tests/operations-sweep-ui.test.ts tests/asset-detail-view.test.ts`. Expected to fail: "asset page: a link to a section that the current view hides opens the view that shows it (wiki 43, spec 2D §3.4)", and the whole file `tests/asset-detail-view.test.ts` (it cannot load: no export named `buildAssetDetailSectionHref`).
- [ ] **Step 3: Implement** per the Changes table. The helper is this algorithm:

```ts
if (isAssetDetailSectionVisible(currentView, sectionId)) return `#${sectionId}`
return buildAssetDetailUrl(locale, assetId, getAssetDetailSectionView(sectionId), sectionId, returnTo)
```

- [ ] **Step 4: Guard rows.** LFG LV2 `` [`${D}assets/[id]/page.tsx`]: 4 `` stays 4; its comment in `BUDGETS` (`:259`) and `KEEP` (`:314`) changes `translated-sentence arguments :1197, :1199 and the history sentence :2384 (R-n)` → `translated-sentence arguments :1202, :1204 and the history sentence :2390 (R-n)` (the lines move by +5 and +6). No VFG or FMG row.
- [ ] **Step 5: Verify.** `node --test tests/operations-sweep-ui.test.ts tests/asset-detail-view.test.ts tests/assets-sweep-ui.test.ts tests/asset-detail-ux.test.ts tests/asset-detail-anchor-layout.test.ts tests/list-frame-guards.test.ts`; `npm test` (+2: 2105 tests, 2104 pass, 0 fail, 1 skipped); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.**

```
git add "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" src/lib/asset-detail-view.ts tests/asset-detail-view.test.ts tests/operations-sweep-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "fix(ui): the asset page's links to a section of another view open that view (2D-4 task 2, OP-2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3 (OP-3): the transaction cancel dialog's error and blockers as Notice (`src/components/asset-operations/transaction-cancel-dialog.tsx`)

Spec D7, M20, plan 2D-3 R2 (2D-3 widened `currentState`/`restoreState` and showed `orNil` in the facts list; 2D-4 sweeps the rest). The error of the dialog's own action becomes a `<Notice tone="danger" role="alert">`, the first thing in the body (DESIGN.md Dialogs: Errors), instead of a red line under the reason field; the warning-tinted blockers box becomes a warning `Notice` with `role="status"` (it appears after the preview); the component count uses `formatCount`. The loading status line (I27), the facts list, the reason `Field`/`Textarea` (`maxLength={2000}`, its `disabled` gate), the 5-character check, the footer and the trigger stay.

**Files:**
- Modify: `src/components/asset-operations/transaction-cancel-dialog.tsx` (CRLF)
- Test: `tests/operations-sweep-ui.test.ts` (LF), `tests/form-migration-guards.test.ts` (CRLF, comment only)

**Changes at `45c1409`:**

| line | now | becomes | rule |
|---|---|---|---|
| `:5` | `import { AlertTriangle, Loader2, Undo2 } from "lucide-react"` | `import { Loader2, Undo2 } from "lucide-react"` | |
| `:10`-`:11` | the `orNil` and `Textarea` imports | add `import { Notice } from "@/components/ui/notice"` after `orNil` and `import { formatCount } from "@/lib/display-format"` after `Textarea` (the `Loader2` line moves to `:138`) | |
| `:138` (`<>` of the loaded branch) | the fragment starts with the facts `dl` | first child: `{error ? (<Notice tone="danger" role="alert" className="mb-4"><ApiErrorText error={error} /></Notice>) : null}`, written over five lines | D7, DESIGN.md Dialogs |
| `:140` | `[labels.components, String(componentCount)]` | `[labels.components, formatCount(componentCount)]` | counts |
| `:144`-`:150` | `<div className="mt-4 rounded-md border border-warning-border bg-warning-soft p-4" role="status">` with an `AlertTriangle` title row, a muted `p` and the `ul` | `<Notice tone="warning" role="status" title={labels.blockedTitle} className="mt-4">` holding `<p>{labels.blockedDescription}</p>` and `<ul className="mt-2 list-disc space-y-1 pl-5 text-foreground">` (the same `li`s; `text-sm` goes, the Notice body is 13/20) | D7 |
| `:154` | `<p className="mt-2 min-h-5 text-sm text-danger" aria-live="polite">{error ? <ApiErrorText error={error} /> : null}</p>` | delete (the error is the Notice above) | D7 |
| `:136`, `:139`-`:143`, `:151`-`:153`, `:158`-`:163` | the loading line, the facts `dl`, the reason `Field`, the footer | stay | I27, 2D-3 R2 |

- [ ] **Step 1: The failing test.** Append to `tests/operations-sweep-ui.test.ts`:

```ts

test("transaction cancel dialog: the error is the first thing in the body, the blockers a warning Notice, the count formatCount (spec 2D D7, plan 2D-3 R2)", () => {
  const source = read(`${C}asset-operations/transaction-cancel-dialog.tsx`)
  const body = source.slice(source.indexOf("<AccessibleDialogBody>"), source.indexOf("</AccessibleDialogBody>"))
  assert.match(body, /\{error \? \(\n\s+<Notice tone="danger" role="alert"[^>]*>\n\s+<ApiErrorText error=\{error\} \/>\n\s+<\/Notice>\n\s+\) : null\}/)
  assert.ok(body.indexOf('<Notice tone="danger"') < body.indexOf("<dl "), "an error from the dialog's action comes before the facts (DESIGN.md Dialogs)")
  assert.match(body, /<Notice tone="warning" role="status" title=\{labels\.blockedTitle\}[^>]*>\n\s+<p>\{labels\.blockedDescription\}<\/p>\n\s+<ul className="mt-2 list-disc space-y-1 pl-5 text-foreground">/)
  assert.match(source, /\[labels\.components, formatCount\(componentCount\)\]/)
  assert.doesNotMatch(source, /AlertTriangle|warning-soft|warning-border|text-danger|String\(componentCount\)|min-h-5/)
})
```

  No existing assertion changes: `tests/asset-transaction-cancellation-ui.test.ts:12` (`aria-live="polite"`) still matches the loading line, `:71`-`:74` and `tests/assets-sweep-ui.test.ts:36`-`:40` pin lines that stay.

  Then append the Review Focus 3 test (a disabled action) to the same file:

```ts

test("review focus 3: a blocked cancellation keeps its confirm and reason disabled, and the warning Notice says why (plan 2D-4)", () => {
  const source = read(`${C}asset-operations/transaction-cancel-dialog.tsx`)
  assert.match(source, /<Button variant="destructive" busy=\{saving\} disabled=\{loading \|\| blockers\.length > 0\} onClick=\{\(\) => void submitCancellation\(\)\}>/)
  assert.match(source, /<Textarea ref=\{reasonRef\}[^\n]*disabled=\{saving \|\| blockers\.length > 0\}/)
  assert.match(source, /\{blockers\.length > 0 \? \(\n\s+<Notice tone="warning" role="status"/)
  assert.match(source, /\{blockers\.map\(\(blocker\) => <li key=\{blocker\}>\{labels\.blockers\[blocker\] \?\? blocker\}<\/li>\)\}/, "every blocker is named in words")
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/operations-sweep-ui.test.ts`. Expected to fail: "transaction cancel dialog: the error is the first thing in the body, the blockers a warning Notice, the count formatCount (spec 2D D7, plan 2D-3 R2)".
  Also expected to fail: "review focus 3: a blocked cancellation keeps its confirm and reason disabled, and the warning Notice says why (plan 2D-4)" (the blockers box is not a `Notice` yet; its other three assertions already hold).
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** FMG `LOADER2` (`:300`): `` [`${C}asset-operations/transaction-cancel-dialog.tsx`]: 1, // the loading line :134 in the dialog body (I27) `` → `…: 1, // the loading line :138 in the dialog body (I27)` (the number stays 1; the comment was stale at `:136`). `CONSTRAINT_FLOORS` `:260` [0,1,0] holds (the `Textarea` keeps `maxLength`). No LFG or VFG row.
- [ ] **Step 5: Verify.** `node --test tests/operations-sweep-ui.test.ts tests/asset-transaction-cancellation-ui.test.ts tests/assets-sweep-ui.test.ts tests/dropdown-menus-ui.test.ts tests/form-migration-guards.test.ts`; `npm test` (+2: 2107 tests, 2106 pass, 0 fail, 1 skipped); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.**

```
git add src/components/asset-operations/transaction-cancel-dialog.tsx tests/operations-sweep-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "refactor(ui): the transaction cancel dialog's error and blockers as Notice, its count formatCount (2D-4 task 3, OP-3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4 (OP-4): the print documents' shared toolbar buttons, and a missing snapshot as null (`src/components/asset-operations/operation-document-print.tsx`, the three `(print)/asset-management/*/[id]/page.tsx`)

Spec M29, M32 b, §5.3. The screen-only toolbar of the A4 check-out, check-in and transfer documents takes the shared parts: the back text link becomes `PageBackLink` (outline `md`, an icon button below `md`, LB1) and the raw print `<button>` becomes `Button size="md"` (the header size, D6). The three print pages' `formatSnapshotState` returns `null` for a transaction without a snapshot, so the cancel dialog in their toolbar shows `Nil` as the asset page has since 2D-3; the transfer document still prints "-" for it through `field.value || "-"`. The A4 paper (raw colors, the paper shadow, its `h1`, `text-xs`, the uppercase brand line, the "-" of empty fields) and the `VoidDocumentBanner` inside it are print (spec §5.3, permanent) and do not change; the banner's LFG comment now says so.

**Files:**
- Modify: `src/components/asset-operations/operation-document-print.tsx` (CRLF); `src/app/[locale]/(print)/asset-management/checkouts/[id]/page.tsx`, `checkins/[id]/page.tsx`, `transfers/[id]/page.tsx` (all LF)
- Test: `tests/operations-sweep-ui.test.ts` (LF), `tests/list-frame-guards.test.ts` (CRLF)

**Changes at `45c1409`:**

| line | now | becomes | rule |
|---|---|---|---|
| `operation-document-print.tsx:3`-`:4` | `import Link from "next/link"`, `import { ArrowLeft, Printer } from "lucide-react"` | `import { Printer } from "lucide-react"`; add `import { Button } from "@/components/ui/button"` and `import { PageBackLink } from "@/components/ui/page-header"` after the `VoidDocumentBanner` import | |
| `:77`-`:80` | `<Link href={backHref} className="inline-flex h-10 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" />{backLabel}</Link>` | `<PageBackLink href={backHref} label={backLabel} className="max-sm:self-start" />` with a one-line comment (it is an icon button below `md`; `self-start` keeps it from stretching in the column below `sm`) | M29, LB1 |
| `:83`-`:90` | raw `<button type="button" onClick={() => window.print()} className="inline-flex min-h-11 … bg-primary … text-white …"><Printer className="h-4 w-4" />{printLabel}</button>` | `<Button size="md" onClick={() => window.print()}>` with `<Printer aria-hidden="true" />` and `{printLabel}`; last in the row (K8) | M29, D6 |
| `:76`, `:81`-`:82` | the toolbar row and the actions group | stay (`toolbarActions` holds the cancel dialog's `danger` trigger at the default size, 36px) | |
| `:95`-`:139` | the A4 paper | stays (print, permanent) | §5.3 |
| `checkouts/[id]/page.tsx:163` · `checkins/[id]/page.tsx:183` · `transfers/[id]/page.tsx:131` | `if (!snapshot) return "-"` | `if (!snapshot) return null` (the return type is inferred as `string \| null`: do not annotate it, the Step 1 regex expects `) {` right after the parameters; `TransactionCancelDialog` takes `string \| null` since 2D-3 and `DocumentField.value` is `string \| null`) | M32 b |
| `void-document-banner.tsx` | | no change | §5.3 |

- [ ] **Step 1: The failing test.** Append to `tests/operations-sweep-ui.test.ts`:

```ts

const P = "src/app/[locale]/(print)/"

test("print documents: the toolbar has the shared back and print buttons, and a missing snapshot reaches the cancel dialog as null (spec 2D M29, M32 b)", () => {
  const source = read(`${C}asset-operations/operation-document-print.tsx`)
  assert.match(source, /<PageBackLink href=\{backHref\} label=\{backLabel\}[^>]*\/>/)
  assert.match(source, /\{toolbarActions\}\n\s+<Button size="md" onClick=\{\(\) => window\.print\(\)\}>\n\s+<Printer aria-hidden="true" \/>\n\s+\{printLabel\}\n\s+<\/Button>/)
  assert.doesNotMatch(source, /<button\b|<ArrowLeft\b|hover:text-primary|from "next\/link"/)
  // The A4 page is print (spec 2D §5.3, permanent): its raw colors, the paper shadow, its h1 and the "-" of an empty field stay.
  assert.match(source, /\{field\.value \|\| "-"\}/)
  for (const page of ["checkouts", "checkins", "transfers"]) {
    const print = read(`${P}asset-management/${page}/[id]/page.tsx`)
    assert.match(print, /function formatSnapshotState\([^)]*\) \{\n\s+if \(!snapshot\) return null\n/, page)
  }
})
```

  No existing assertion changes (`tests/asset-transaction-cancellation-ui.test.ts:17`-`:43` and VFG `:143`-`:145` pin what stays).

  Then append the Review Focus 5 test (print output) to the same file:

```ts

test("review focus 5: the shared back and print buttons sit in the toolbar that print hides, so the A4 paper prints without them (plan 2D-4)", () => {
  const source = read(`${C}asset-operations/operation-document-print.tsx`)
  assert.match(source, /@media print \{[\s\S]*?\.operation-print-toolbar \{\s*display: none !important;\s*\}/)
  const toolbar = source.slice(source.indexOf('<div className="operation-print-toolbar'), source.indexOf("<section"))
  assert.match(toolbar, /<PageBackLink\b/)
  assert.match(toolbar, /<Button size="md" onClick=\{\(\) => window\.print\(\)\}>/)
  assert.match(toolbar, /\{toolbarActions\}/, "the cancel dialog's trigger does not print either")
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/operations-sweep-ui.test.ts`. Expected to fail: "print documents: the toolbar has the shared back and print buttons, and a missing snapshot reaches the cancel dialog as null (spec 2D M29, M32 b)".
  Also expected to fail: "review focus 5: the shared back and print buttons sit in the toolbar that print hides, so the A4 paper prints without them (plan 2D-4)" (no `PageBackLink` in the toolbar yet; the print CSS assertion already holds).
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows** (`tests/list-frame-guards.test.ts`, CRLF; find each row by its text).
  - LFG LB1 `operation-document-print.tsx` 1 → 0: delete the row from both tables. **Careful:** `BUDGETS.LH1` and `KEEP.LH1` hold rows with the same text (the LH1 row of this file stays), so match two lines each time:
    - `BUDGETS.LB1` old (two lines): ``    [`${C}asset-operations/operation-document-print.tsx`]: 1, // → 1 (KEEP): print page`` then ``    [`${C}audit/audit-scan-header.tsx`]: 1, // → 1 (KEEP): field scan header``; new: only the second line.
    - `KEEP.LB1` old (two lines): ``    [`${C}asset-operations/operation-document-print.tsx`]: 1, // print page`` then ``    [`${C}audit/audit-scan-header.tsx`]: 1, // field scan header``; new: only the second line.
    - LB1 goes 5 → 4 rows.
  - LFG LV2 `void-document-banner.tsx` stays 3, comment only: `BUDGETS` `// → 3 (KEEP): 2D` → `// → 3 (KEEP): print page, the void banner prints on the A4 document (R-n, plan 2D-4)`; `KEEP` `// 2D` (the banner's row) → `// print page, the void banner prints on the A4 document (R-n, plan 2D-4)`.
  - Unchanged: LH1 `operation-document-print.tsx` 1, LV2 `operation-document-print.tsx` 1, LV2 print check-ins 2 and check-outs 4 (the removed `return "-"` was never an LV2 match), VFG R2 `operation-document-print.tsx` 1.
- [ ] **Step 5: Verify.** `node --test tests/operations-sweep-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/asset-transaction-cancellation-ui.test.ts`; `npm test` (+2: 2109 tests, 2108 pass, 0 fail, 1 skipped; computed: the dry run did not run this task); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.**

```
git add src/components/asset-operations/operation-document-print.tsx "src/app/[locale]/(print)/asset-management/checkouts/[id]/page.tsx" "src/app/[locale]/(print)/asset-management/checkins/[id]/page.tsx" "src/app/[locale]/(print)/asset-management/transfers/[id]/page.tsx" tests/operations-sweep-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "refactor(ui): the print documents' shared back and print buttons, and a missing snapshot as null (2D-4 task 4, OP-4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5 (OP-5): the check-out, transfer and bulk move forms on ContentPanel (`src/components/asset-operations/checkout-form.tsx`, `transfer-form.tsx`, `bulk-move-form.tsx`)

Spec D9, M21, M25 (the 2D-3 Task 19c precedent: identical one-panel sweeps in one commit). Each form's hand-written `section` panel becomes `ContentPanel` (the one panel spacing, `p-4 sm:p-5`), and the bulk move's empty asset line becomes `EmptyNote padded role="status"` (the search filters the list live). Fields, `required`/`maxLength`, the `toast.error` gates, the review dialogs (they stay inside the panel), the submit buttons and the bulk move checkbox list stay.

**Files:**
- Modify: `src/components/asset-operations/checkout-form.tsx`, `transfer-form.tsx`, `bulk-move-form.tsx` (all CRLF)
- Test: `tests/operations-sweep-ui.test.ts` (LF), `tests/form-frames-ui.test.ts` (CRLF)

**Changes at `45c1409`:**

| line | now | becomes | rule |
|---|---|---|---|
| `checkout-form.tsx:10` | the `ChoiceCard` import | add `import { ContentPanel } from "@/components/ui/content-panel"` after it | |
| `checkout-form.tsx:395` | `<section className="min-w-0 rounded-lg border border-border bg-surface p-4 sm:p-6">{children}</section>` (in `OperationShell`) | `<ContentPanel>{children}</ContentPanel>` | D9 |
| `transfer-form.tsx:8` | the `Button` import | add the `ContentPanel` import after it | |
| `transfer-form.tsx:126`, `:165` | `<section className="min-w-0 rounded-lg border border-border bg-surface p-4 sm:p-6">` … `</section>` | `<ContentPanel>` … `</ContentPanel>` | D9 |
| `bulk-move-form.tsx:9` | the `preventEnterSubmit` import | add `import { ContentPanel } from "@/components/ui/content-panel"` and `import { EmptyNote } from "@/components/ui/empty-note"` after it | |
| `bulk-move-form.tsx:86`, `:140` | `<section className="rounded-lg border border-border bg-surface p-6">` … `</section>` | `<ContentPanel>` … `</ContentPanel>` | D9 |
| `bulk-move-form.tsx:101` | `<div className="px-3 py-6 text-center text-sm text-muted-foreground">{tCommon("noData")}</div>` | `<EmptyNote padded role="status">{tCommon("noData")}</EmptyNote>` (the list box has no padding of its own) | M21 |
| `bulk-move-form.tsx:99` | the checkbox list box `max-h-72 overflow-y-auto rounded-md border border-border bg-surface` | stays (a control list; `tests/choice-controls-ui.test.ts:83`) | |

- [ ] **Step 1: The failing test.** Append to `tests/operations-sweep-ui.test.ts`:

```ts

test("check-out, transfer and bulk move forms: the form panel is a ContentPanel, and the empty asset list is an EmptyNote (spec 2D D9, M21, M25)", () => {
  const checkout = read(`${C}asset-operations/checkout-form.tsx`)
  assert.match(checkout, /<PageHeader title=\{title\} className="mb-6" \/>\n\s+<ContentPanel>\{children\}<\/ContentPanel>/)
  const transfer = read(`${C}asset-operations/transfer-form.tsx`)
  assert.match(transfer, /<PageHeader title=\{t\("title"\)\} className="mb-6" \/>\n\s+<ContentPanel>\n\s+<form onSubmit=\{handleSubmit\}/)
  assert.match(transfer, /<\/form>\n\s+<OperationReviewDialog[\s\S]*?\/>\n\s+<\/ContentPanel>/, "the review dialog stays inside the panel")
  const bulkMove = read(`${C}asset-operations/bulk-move-form.tsx`)
  assert.match(bulkMove, /className="mb-6" \/>\n\s+<ContentPanel>\n\s+<form onSubmit=\{handleSubmit\}/)
  assert.match(bulkMove, /<EmptyNote padded role="status">\{tCommon\("noData"\)\}<\/EmptyNote>/)
  for (const [name, source] of [["checkout", checkout], ["transfer", transfer], ["bulk move", bulkMove]]) {
    assert.doesNotMatch(source, /<section\b|rounded-lg border|text-center text-sm text-muted-foreground/, name)
  }
})
```

  Edit the existing pin `tests/form-frames-ui.test.ts:99` (CRLF): `<section className="min-w-0 rounded-lg border border-border bg-surface p-4 sm:p-6">\{children\}<\/section>/,` (the end of the regex) → `<ContentPanel>\{children\}<\/ContentPanel>/,`.
- [ ] **Step 2: Watch it fail.** `node --test tests/operations-sweep-ui.test.ts tests/form-frames-ui.test.ts`. Expected to fail: "check-out, transfer and bulk move forms: the form panel is a ContentPanel, and the empty asset list is an EmptyNote (spec 2D D9, M21, M25)" and "the check-out form's OperationShell draws its title with PageHeader and stays a card (2B-1 task 23, I13)".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** None change. FMG `CONSTRAINT_FLOORS` `:221` [6,0,0], `:222` [1,1,0], `:223` [1,1,0] hold (checked: the counts, `disabled=`, `busy=` and `toast.error(` are the same before and after).
- [ ] **Step 5: Verify.** `node --test tests/operations-sweep-ui.test.ts tests/form-frames-ui.test.ts tests/choice-controls-ui.test.ts tests/asset-operation-confirmation-ui.test.ts tests/file-evidence-ui.test.ts tests/asset-handover-checkout.test.ts tests/form-migration-guards.test.ts`; `npm test` (+1: 2110 tests, 2109 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2108 / 2107); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.**

```
git add src/components/asset-operations/checkout-form.tsx src/components/asset-operations/transfer-form.tsx src/components/asset-operations/bulk-move-form.tsx tests/operations-sweep-ui.test.ts tests/form-frames-ui.test.ts
git commit -m "refactor(ui): the check-out, transfer and bulk move forms on ContentPanel (2D-4 task 5, OP-5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6 (OP-6): the check-in form on the shared parts (`src/components/asset-operations/checkin-form.tsx`)

Spec D7, D9, D19, M17 (LV2 9), M21, M22, M25, M33. The panel is a `ContentPanel`; "no handover waiting" is an `ActionEmptyState`; the review-required box, the legacy return box and the send-to-repair box are `Notice`s by meaning; the legacy list is one quiet grouping of divided rows with the row's tag, a `Chip` and an `EmptyNote`; the current custody facts are two `KeyValueList`s (the handover, the asset) with `Nil` for an empty value, inside the existing quiet grouping; the box around the return photo dropzone goes. `ReadOnly` is deleted and joins LFG `LOCAL_KEY_VALUE` (D19). Every field, `required` (the `returnDate` star stays server-enforced, `STAR_ONLY`), the `noValidate` form, the `toast.error` gates, the legacy backfill, the review dialog, the photo queue, the signatures and the submit button stay.

**Files:**
- Modify: `src/components/asset-operations/checkin-form.tsx` (CRLF)
- Test: `tests/operations-sweep-ui.test.ts` (LF), `tests/legacy-checkin-flow.test.ts` (CRLF), `tests/asset-handover-checkin.test.ts` (LF), `tests/file-evidence-ui.test.ts` (LF), `tests/list-frame-guards.test.ts` (CRLF)

**Changes at `45c1409`:**

| line | now | becomes | rule |
|---|---|---|---|
| `:5`, `:7`, `:9`, `:25` | `import Link`, `Wrench`, `buttonVariants`, `import { cn }` | delete `Link`, `Wrench`, `buttonVariants` and the `cn` import (no other use; `:9` `import { Button, buttonVariants } from "@/components/ui/button"` becomes `import { Button } from "@/components/ui/button"`); add `ActionEmptyState`, `Chip`, `ContentPanel`, `EmptyNote` (before/after `Button` in path order), `KeyValueList` (after `Input`), `Notice` (after `NativeSelect`), `formatCount` from `@/lib/display-format` (after `appendReturnTo`) | |
| `:297`, `:570` | `<section className="min-w-0 rounded-lg border border-border bg-surface p-4 sm:p-6">` … `</section>` | `<ContentPanel>` … `</ContentPanel>` (the review dialog stays inside) | D9 |
| `:316`-`:333` | dashed box (`border-dashed`), a `primary-soft` icon tile, a title, a `text-xs` line and an outline `Link` to check-out | `<div className="md:col-span-2">` around `<ActionEmptyState icon={<PackageCheck />} title={t("noActiveCheckoutsTitle")} description={t("noActiveCheckoutsDescription")} actionHref={`/${locale}/asset-management/checkout`} actionLabel={t("goToCheckout")} actionVariant="secondary" />` (one prop per line, in this order) | M21 |
| `:335`-`:340` | `rounded-md border border-warning-border bg-warning-soft p-4 text-sm text-warning` with two lines | `<Notice tone="warning" title={t("handoverReviewRequired")} className="md:col-span-2">{t("handoverModeMissing")}</Notice>` | D7 |
| `:343`-`:356` | the warning box with the title, the count pill (`rounded-full … text-xs`) and a `text-xs` description | `<div className="md:col-span-2 grid gap-3">`; first `<Notice tone="warning" title={t("legacyReturnTitle")}>{t("legacyReturnDescription")}</Notice>`; then a row `flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between` with the count as `<span className="text-meta text-muted-foreground">` (`shown: formatCount(filteredLegacyReturnCandidates.length)`, `total: formatCount(legacyReturnCandidates.length)`) and the `SearchField` (its props stay) | D7, M22 |
| `:365` | `mt-3 grid max-h-96 gap-2 overflow-y-auto pr-1` | `max-h-96 overflow-y-auto rounded-md border border-border bg-background` (one quiet grouping) | D9 |
| `:367`-`:369` | dashed empty box (`border-dashed border-warning-border bg-surface/80`) | `<EmptyNote padded role="status">{t("legacyReturnNoResults")}</EmptyNote>` | M21 |
| `:371`-`:372`, `:396`-`:397` | `filteredLegacyReturnCandidates.map((asset) => (<div … className="grid gap-3 rounded-md border border-border bg-surface p-3 lg:grid-cols-[1fr_auto] lg:items-center">` | `<ul className="divide-y divide-border-soft">` around the map; each row `<li key={asset.id} className="grid gap-3 p-3 lg:grid-cols-[1fr_auto] lg:items-center">` (no card in the panel). The quiet grouping of `:365` holds the `EmptyNote` directly in the empty branch and the `<ul>` only in the non-empty branch | D9 |
| `:375` | `<div className="font-semibold text-foreground">{asset.assetTag}</div>` | `<span className="tag font-medium text-foreground">{asset.assetTag}</span>` (the row's own id) | M33 |
| `:376`-`:378` | `rounded-full bg-warning-soft … text-xs … text-warning` badge | `<Chip>{t("legacyReturnBadge")}</Chip>` | M22 |
| `:381` | `mt-2 grid gap-1 text-xs text-muted-foreground md:grid-cols-2` | `text-meta` in place of `text-xs` | text-xs |
| `:393` | `<PackageCheck className="text-warning" />` | `<PackageCheck />` (the `Button` and its `busy`/`disabled` stay) | color |
| `:412`-`:432` | a 3-column grid of 12 `ReadOnly` with `?? "-"` / `: "-"` | a one-line JSX comment (D19) directly above the grid, then `<div className="grid gap-x-6 gap-y-2 md:grid-cols-2">` with two `KeyValueList`s. `destinationLabel`, `remark` and `assetName` are passed as they are (`KeyValueList` turns `undefined` or `null` into `Nil` through `orNil`); `expectedReturnDate` joins the handover list by a conditional spread (`...(… ? [{ … }] : [])`). Handover: `documentNo` (`selectedCheckout.documentNo ? <span className="tag">{…}</span> : null`), `custodyType` (the same two labels), `checkoutType` (`` t(`type_${…}`) `` or `null`), `checkoutTo` (`destinationLabel`), `checkoutDate` and, for a temporary loan only, `expectedReturnDate` (`formatDate(…)`), `checkoutRemark` (`remark`). Asset: `assetTag` and `serialNumber` (each a `tag` span or `null`), `assetName`, `currentAssetStatus` (`statusLabel ?? statusName`, text), `conditionBefore` (the label map or the raw value, or `null`). Each item has `key`; labels are the existing `t(…)` keys. The grouping `:410` and its title `:411` stay | D19, LV2 |
| `:488`, `:491` | `md:col-span-2 rounded-md border border-border bg-background p-4` around the photo type, dropzone and queue; `mt-1 text-xs text-muted-foreground` | `md:col-span-2` only (no box around a dropzone); `text-meta` in place of `text-xs` | D9, text-xs |
| `:535`-`:548` | `rounded-md border border-warning-border bg-warning-soft p-4` with a `Wrench` title, a `text-xs text-warning` line and the problem `Field` in a `mt-3` div | `<div className="md:col-span-2 grid gap-3">` with `<Notice tone="info" title={t("sendToRepairTitle")}>{t("sendToRepairHelp")}</Notice>` then the same `Field`/`Textarea` | D7 |
| `:585`-`:592` | `function ReadOnly(…)` (`text-xs uppercase` label) | delete | D19 |
| `:594`-`:595` | `if (!value) return "-"` | `if (!value) return null` | LV2 |

- [ ] **Step 1: The failing test.** Append to `tests/operations-sweep-ui.test.ts`:

```ts

test("check-in form: a ContentPanel, Notice by meaning, ActionEmptyState, KeyValueList with Nil, a Chip and EmptyNote in the legacy list, and no box around the dropzone (spec 2D D7, D9, D19, M21, M22, M33)", () => {
  const source = read(`${C}asset-operations/checkin-form.tsx`)
  assert.match(source, /<PageHeader title=\{t\("title"\)\} className="mb-6" \/>\n\s+<ContentPanel>\n\s+<form onSubmit=\{handleSubmit\} noValidate /)
  assert.match(source, /<ActionEmptyState\n\s+icon=\{<PackageCheck \/>\}\n\s+title=\{t\("noActiveCheckoutsTitle"\)\}\n\s+description=\{t\("noActiveCheckoutsDescription"\)\}\n\s+actionHref=\{`\/\$\{locale\}\/asset-management\/checkout`\}\n\s+actionLabel=\{t\("goToCheckout"\)\}\n\s+actionVariant="secondary"/)
  assert.match(source, /<Notice tone="warning" title=\{t\("handoverReviewRequired"\)\}[^>]*>\n\s+\{t\("handoverModeMissing"\)\}\n\s+<\/Notice>/)
  assert.match(source, /<Notice tone="warning" title=\{t\("legacyReturnTitle"\)\}[^>]*>\n\s+\{t\("legacyReturnDescription"\)\}\n\s+<\/Notice>/)
  assert.match(source, /shown: formatCount\(filteredLegacyReturnCandidates\.length\),\n\s+total: formatCount\(legacyReturnCandidates\.length\),/)
  assert.match(source, /<EmptyNote padded role="status">\{t\("legacyReturnNoResults"\)\}<\/EmptyNote>/)
  assert.match(source, /<span className="tag font-medium text-foreground">\{asset\.assetTag\}<\/span>\n\s+<Chip>\{t\("legacyReturnBadge"\)\}<\/Chip>/)
  assert.equal(source.match(/<KeyValueList\b/g)?.length, 2, "the handover and the asset")
  assert.match(source, /value: selectedCheckout\.documentNo \? <span className="tag">\{selectedCheckout\.documentNo\}<\/span> : null/)
  assert.match(source, /function formatDate\(value\?: string \| null\) \{\n\s+if \(!value\) return null\n/)
  assert.match(source, /<Notice tone="info" title=\{t\("sendToRepairTitle"\)\}[^>]*>\n\s+\{t\("sendToRepairHelp"\)\}\n\s+<\/Notice>/)
  assert.doesNotMatch(source, /function ReadOnly\b|"-"|<section\b|rounded-lg border|border-dashed|rounded-full|warning-soft|primary-soft|text-warning|\btext-xs\b|\buppercase\b|<Wrench\b|from "next\/link"/)
})
```

  Edit three existing pins:
  - `tests/legacy-checkin-flow.test.ts:83` (CRLF): `assert.match(source, /<PackageCheck className="text-warning" \/>\n\s+\{t\("legacyReturnAction"\)\}/)` → `assert.match(source, /<PackageCheck \/>\n\s+\{t\("legacyReturnAction"\)\}/)`.
  - `tests/asset-handover-checkin.test.ts:57` (LF): `assert.match(source, /className=\{cn\(buttonVariants\(\{ variant: "outline" \}\), "w-full shrink-0 sm:w-auto"\)\}/)` → ``assert.match(source, /actionHref=\{`\/\$\{locale\}\/asset-management\/checkout`\}\n\s+actionLabel=\{t\("goToCheckout"\)\}\n\s+actionVariant="secondary"/)``.
  - `tests/file-evidence-ui.test.ts:118` (LF): `assert.equal(source.match(/rounded-md bg-primary-soft text-primary/g)?.length, 1, "only the no-checkouts icon tile stays")` → `assert.doesNotMatch(source, /rounded-md bg-primary-soft text-primary/, "the no-checkouts state is an ActionEmptyState, without an icon tile (plan 2D-4)")`.
- [ ] **Step 2: Watch it fail.** `node --test tests/operations-sweep-ui.test.ts tests/legacy-checkin-flow.test.ts tests/asset-handover-checkin.test.ts tests/file-evidence-ui.test.ts`. Expected to fail: "check-in form: a ContentPanel, Notice by meaning, ActionEmptyState, KeyValueList with Nil, a Chip and EmptyNote in the legacy list, and no box around the dropzone (spec 2D D7, D9, D19, M21, M22, M33)", "the legacy return row keeps its label while it works, and its search box is a SearchField (2C batch 1b)", "the check-in form uses the shared fields and a busy save button (2C batch 1b)" and "the check-in photo picker explains itself before a pick and lists the queue with FileQueueList (2C batch 1b)".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows** (`tests/list-frame-guards.test.ts`, CRLF; find each row by its text).
  - LFG LV2 `checkin-form.tsx` 9 → 0, delete from both tables: `BUDGETS` ``    [`${C}asset-operations/checkin-form.tsx`]: 9, // → 9 (KEEP): 2C form (2D)`` and `KEEP` ``    [`${C}asset-operations/checkin-form.tsx`]: 9, // 2C form (2D)``. LV2 goes 44 → 35.
  - LFG `LOCAL_KEY_VALUE` (D19, R10, the R19 rule for these lines): insert directly above the line `const LOCAL_KEY_VALUE = …` the comment line `// Plan 2D-4 Task 6 (OP-6): ReadOnly (the check-in form's current custody).`, and in the `const` line replace `|MobileField|DocumentFact)\b/g` with `|MobileField|DocumentFact|ReadOnly)\b/g`. `function ReadOnly` exists only in this file, so LK1 stays 0.
  - FMG unchanged: `CONSTRAINT_FLOORS` [4, 0, 0] holds (three `Select required` and the `NativeSelect required={required}`), `STAR_ONLY` (`t("returnDate")`), `BUSY_LABEL_SWAPS`. VFG unchanged.
- [ ] **Step 5: Verify.** `node --test tests/operations-sweep-ui.test.ts tests/legacy-checkin-flow.test.ts tests/asset-handover-checkin.test.ts tests/file-evidence-ui.test.ts tests/checkin-send-to-repair-ui.test.ts tests/form-frames-ui.test.ts tests/asset-operation-confirmation-ui.test.ts tests/list-frame-guards.test.ts tests/form-migration-guards.test.ts tests/visual-foundation-guards.test.ts`; `npm test` (+1: 2111 tests, 2110 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2109 / 2108); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.**

```
git add src/components/asset-operations/checkin-form.tsx tests/operations-sweep-ui.test.ts tests/legacy-checkin-flow.test.ts tests/asset-handover-checkin.test.ts tests/file-evidence-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "refactor(ui): the check-in form on ContentPanel, Notice, ActionEmptyState and KeyValueList (2D-4 task 6, OP-6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Area AS: the field audit scanner (Tasks 7–19)

Spec §3.4 ("เครื่องสแกนตรวจนับ"), D2, D7, D9, D19, and the carried keyboard bug. The audit mobile fix (`7a88ac7`..`3e11101`) already reworked the sheet, form, field, components panel, header, room picker, room list and search; these tasks sweep what is left on top of that layout and keep its decisions D1–D7 (R18). Raw `<button>`s: 16 in 8 files at `45c1409` (the spec's "17 in 8" at `71597e5` leaves out the camera's 3), 8 in 5 files after the area, each with a comment (R5). No guard number changes; two FMG comments move (R19). Task 7 creates `tests/audit-scan-sweep-ui.test.ts`; Tasks 8–19 append to it. Every file of the area is CRLF.

### Task 7 (AS-1): The check sheet brings a focused field back above its pinned bar when the keyboard shrinks the screen (`c/audit/audit-scan-check-form.tsx`, `c/audit/audit-scan-helpers.ts`)

The carried bug. The check form is a flex column: a scrolling body (`data-audit-check-body`) and a pinned action bar (`data-audit-check-actions`, outside the scroller, D1). On an emulated iPhone (390×664, keyboard open so about 364px are visible) the remark textarea sits under the bar once it has focus. Cause (read from the layout; the dev-app check of Task 52 Step 10 reproduces it before the fix): the person taps the remark at full height, then the keyboard shrinks the viewport; the sheet (`max-h-[92dvh]`) and its body shrink, but the body keeps its `scrollTop`, so the focused textarea ends below the body's visible part, which ends at the bar's top edge; nothing re-scrolls a field inside a nested scroller on a resize. Fix, the smallest robust one: while the form is mounted, a `resize` listener on `window.visualViewport` (falls back to `window`) scrolls the focused control, only when it is inside the body, into view with `block: "nearest"`; `scroll-py-3` on the body keeps the 4px focus halo inside the body when a field lands on its edge. A `scroll-padding-bottom` equal to the bar is not needed: the bar is outside the scroller, so nothing overlaps inside it. Not taken: `viewport.interactiveWidget` in `src/app/layout.tsx` (app-wide, Chromium only, and it would move the bottom navigation and every fixed bar above the keyboard on every page). The bar, the save logic, the fields and their order stay.

**Files:**
- Modify: `src/components/audit/audit-scan-check-form.tsx` (CRLF), `src/components/audit/audit-scan-helpers.ts` (CRLF)
- Create: `tests/audit-scan-sweep-ui.test.ts` (LF, new)
- Test (edit): `tests/audit-scan-check-ui.test.ts` (CRLF); guard comment: `tests/form-migration-guards.test.ts` (CRLF)

**Interfaces:** `export function revealFocusInScrollArea(area: Element | null, focused: Element | null): void` in `audit-scan-helpers.ts` (plain TS, no React, so the test imports it). Consumed by the form in this task only.

**Changes at 45c1409:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| helpers `:55` (end of file) | — | add `revealFocusInScrollArea` (algorithm below) with a 3-line doc comment saying why | carried bug |
| form `:16` | `import { isAuditComponentChecked, isAuditComponentPending } from "@/components/audit/audit-scan-helpers"` | add `revealFocusInScrollArea` to the same import | — |
| form `:122` | `const mountedRef = useRef(true)` | add after it: `const bodyRef = useRef<HTMLDivElement \| null>(null)` | — |
| form after `:147` (the preview-URL cleanup effect) | — | a new effect (algorithm below) with a 2-line comment: the phone keyboard opens after a field takes focus and shrinks the screen; bring the focused field back above the pinned bar | carried bug |
| form `:255` | `<div data-audit-check-body className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">` | `<div ref={bodyRef} data-audit-check-body className="min-h-0 flex-1 scroll-py-3 space-y-3 overflow-y-auto px-4 py-3">` | carried bug |

The algorithm (exact text, the test pins it):

```ts
export function revealFocusInScrollArea(area: Element | null, focused: Element | null) {
  if (!area || !focused || focused === area || !area.contains(focused)) return
  focused.scrollIntoView({ block: "nearest" })
}
```

```tsx
  useEffect(() => {
    const viewport: EventTarget = window.visualViewport ?? window
    const reveal = () => revealFocusInScrollArea(bodyRef.current, document.activeElement)
    viewport.addEventListener("resize", reveal)
    return () => viewport.removeEventListener("resize", reveal)
  }, [])
```

- [ ] **Step 1: The failing test.** Create `tests/audit-scan-sweep-ui.test.ts` (LF) with exactly:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-4 (spec 2D §3.4, D2, D7, D9, D19, M20, M21, M22, M25, M29, M33): the field audit scanner on the shared parts,
// on top of the audit mobile fix of 2026-10-16 (the pinned action bar, compact component rows, "พบครบทุกชิ้น" and the
// room picker stay as they are), plus the carried keyboard bug of the check sheet. Messages are Notice by meaning, panels
// the panel classes, empty states EmptyNote, commands Button or buttonVariants, text links linkVariants, codes tag. Each
// test pins one file (or one tight pair) and fails before that commit. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const A = "src/components/audit/"

test("check sheet: a field focused before the phone keyboard opens scrolls back above the pinned action bar (carried bug)", async () => {
  const { revealFocusInScrollArea } = await import("../src/components/audit/audit-scan-helpers.ts")
  const calls: unknown[] = []
  const field = { scrollIntoView: (options: unknown) => calls.push(options) } as unknown as Element
  const outside = { scrollIntoView: (options: unknown) => calls.push(options) } as unknown as Element
  const body = { contains: (node: unknown) => node === field } as unknown as Element
  revealFocusInScrollArea(body, field)
  revealFocusInScrollArea(body, outside)
  revealFocusInScrollArea(body, body)
  revealFocusInScrollArea(body, null)
  revealFocusInScrollArea(null, field)
  assert.deepEqual(calls, [{ block: "nearest" }], "only a control inside the body scrolls, and only as far as it must")
  const source = read(`${A}audit-scan-check-form.tsx`)
  assert.match(source, /const bodyRef = useRef<HTMLDivElement \| null>\(null\)/)
  // scroll-py-3 keeps the 4px focus halo inside the body when a field is scrolled to its edge.
  assert.match(source, /<div\s+ref=\{bodyRef\}\s+data-audit-check-body\s+className="min-h-0 flex-1 scroll-py-3 space-y-3 overflow-y-auto px-4 py-3"/)
  assert.match(source, /const viewport: EventTarget = window\.visualViewport \?\? window\s+const reveal = \(\) => revealFocusInScrollArea\(bodyRef\.current, document\.activeElement\)\s+viewport\.addEventListener\("resize", reveal\)\s+return \(\) => viewport\.removeEventListener\("resize", reveal\)/)
  // The bar stays outside the scrolling body (audit mobile fix D1), and nothing changes the viewport meta app-wide.
  assert.ok(source.indexOf("data-audit-check-body") < source.indexOf("data-audit-check-actions"))
  assert.doesNotMatch(read("src/app/layout.tsx"), /interactiveWidget/)
})
```

  Existing pin, `tests/audit-scan-check-ui.test.ts:50`:
  - old: `  assert.match(source, /<div data-audit-check-body className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">/)`
  - new: `  assert.match(source, /<div ref=\{bodyRef\} data-audit-check-body className="min-h-0 flex-1 scroll-py-3 space-y-3 overflow-y-auto px-4 py-3">/)`

  Then append the Review Focus 4 test (keyboard open on a phone) to the new file:

```ts

test("review focus 4: with the phone keyboard open, every field that takes typing is in the scrolling body, never in the pinned bar (plan 2D-4)", () => {
  const source = read(`${A}audit-scan-check-form.tsx`)
  const body = source.indexOf("data-audit-check-body")
  const actions = source.indexOf("data-audit-check-actions")
  // revealFocusInScrollArea scrolls only inside the body: a text field in the bar would stay under the keyboard.
  assert.doesNotMatch(source.slice(actions), /<(?:Textarea|Input|textarea|SearchableSelect|AuditScanCheckField)\b|<input\b(?![^>]*type="checkbox")/)
  for (const marker of ["<AuditScanCheckField", "<Textarea"]) {
    const at = source.indexOf(marker)
    assert.ok(body < at && at < actions, `${marker} sits in the scrolling body`)
  }
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/audit-scan-sweep-ui.test.ts tests/audit-scan-check-ui.test.ts`. Expected to fail: "check sheet: a field focused before the phone keyboard opens scrolls back above the pinned action bar (carried bug)" (`revealFocusInScrollArea` is not a function) and "the save and not-this-item buttons sit in a pinned action bar below the scrolling fields (D1)".
  The Review Focus 4 test passes before and after this task: it pins the assumption the fix rests on (the bar holds no field that takes typing). If it fails at the commit before, stop and report.
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** FMG `LOADER2` comment of the form (`tests/form-migration-guards.test.ts:287`): `// the components loading line :286 (T2 audit mobile fix; was the header toggle)` → `:296` (the `<Loader2` line after this task; check with `grep -n "<Loader2" src/components/audit/audit-scan-check-form.tsx`). The number stays 1. LFG LV2 3 and VFG R2 1 of the form are unchanged.
- [ ] **Step 5: Verify.** `node --test tests/audit-scan-sweep-ui.test.ts tests/audit-scan-check-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`; `npm test` (+2: 2113 tests, 2112 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2111 / 2110); `npx tsc --noEmit`; `npm run lint` (0 errors, no new warning in `src/` or `tests/`).
- [ ] **Step 6: Commit.** `git add src/components/audit/audit-scan-check-form.tsx src/components/audit/audit-scan-helpers.ts tests/audit-scan-sweep-ui.test.ts tests/audit-scan-check-ui.test.ts tests/form-migration-guards.test.ts` then `git commit -m "fix(audit): the check sheet brings a focused field back above its pinned bar when the keyboard shrinks the screen (2D-4 task 7, AS-1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 8 (AS-2): The check form's notes, note and photo toggle and correction choice on the shared parts (`c/audit/audit-scan-check-form.tsx`)

Spec D7, D9, M20, M25, M29; DESIGN.md Typography. The installed-in note is information about the asset (it is part of a parent): an info `Notice`, inline (was a teal box with `text-xs`). The note and photo toggle becomes an outline `Button` with `aria-expanded` and `aria-controls` (the 2D-3 status correction pattern), and the opened fields sit in a quiet grouping (no frame in a frame). The missing-photo reason is a condition before saving: a neutral `Notice` (D7), an inline line that does not grow the pinned bar, still above save. The approver's correction checkbox card becomes `ChoiceCard type="checkbox"` with its help as `description`. Stays: the save logic and labels, `busy`/`disabled`, the photo grid and its remove button (`shadow-sm`, VFG R2), the components loading line, the `"-"` arguments, the D1 bar.

**Files:**
- Modify: `src/components/audit/audit-scan-check-form.tsx` (CRLF)
- Test: `tests/audit-scan-sweep-ui.test.ts` (LF); guard comment: `tests/form-migration-guards.test.ts` (CRLF)

**Changes at 45c1409** (after AS-1 every line below `:147` sits 10 lower; find them by the quoted text):

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:3` | `useEffect, useMemo, useRef, useState` | add `useId` | — |
| `:6-13` | imports `checkboxVariants` (`:9`) and `cn` (`:13`) | delete both (no use left); add `import { ChoiceCard } from "@/components/ui/choice-card"` and `import { Notice } from "@/components/ui/notice"` | — |
| after `bodyRef` | — | `const extrasId = useId()` | — |
| `:277-281` | `<div className="rounded-md border border-info-border bg-info-soft p-2.5 text-xs text-info">` around the `installedIn` paragraphs | `<Notice tone="info">` … `</Notice>` around the same `map` (the paragraphs stay) | D7 info, M20 |
| `:306-315` | `<div className="rounded-md border border-border">` with a raw `<button type="button" aria-expanded={extrasOpen} … className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-sm font-medium text-primary">` and `<ChevronDown className="size-4" …>` | `<div className="space-y-2">` holding `<Button variant="outline" aria-expanded={extrasOpen} aria-controls={extrasOpen ? extrasId : undefined} onClick={() => setExtrasOpen((current) => !current)} className="w-full justify-between">` (props in this order), label `{t("addNotePhoto")}`, `<ChevronDown aria-hidden="true" />` (no size class) | M29, D2 |
| `:317` | `<div className="space-y-3 border-t border-border p-3">` | `<div id={extrasId} className="space-y-3 rounded-md border border-border bg-background p-3">` with a one-line comment above it, a `//` line inside `{extrasOpen ? (` before the `<div>`: `// A quiet grouping inside the sheet, never a frame in a frame (spec 2D D9).` | D9, M25 |
| `:379-381` | `<p className="text-sm font-medium text-warning">{mode === "out_of_scope" ? … : …}</p>` | `<Notice tone="neutral">` with the same expression, and a one-line JSX comment above `{missingPhoto ? (`: `{/* Why save is disabled: a condition before acting, one inline line that does not grow the bar (spec 2D D7). */}`. Neither comment may name a class the test forbids (`text-primary`, `-info-`, `text-xs`) | D7 neutral, M20 |
| `:403-409` | `<label className="flex min-h-11 items-start gap-2 rounded-md border border-border p-2.5 text-sm">` with the native checkbox and two spans (`text-xs` help) | `<ChoiceCard type="checkbox" checked={applyCorrections} onChange={(event) => setApplyCorrections(event.target.checked)} label={t("applyAuditCorrections")} description={t("applyAuditCorrectionsHelp")} />` (props in this order) | ChoiceCard, DESIGN.md Typography |

- [ ] **Step 1: The failing test.** Append to `tests/audit-scan-sweep-ui.test.ts`:

```ts

test("check form: the installed-in note is an info Notice, the note and photo toggle a Button over a quiet grouping, the photo rule a neutral Notice and the correction a ChoiceCard (spec 2D D7, D9, M20, M29)", () => {
  const source = read(`${A}audit-scan-check-form.tsx`)
  assert.match(source, /<Notice tone="info">\s*\{components\.installedIn\.map\(/)
  assert.match(source, /<Button\s+variant="outline"\s+aria-expanded=\{extrasOpen\}\s+aria-controls=\{extrasOpen \? extrasId : undefined\}\s+onClick=\{\(\) => setExtrasOpen\(\(current\) => !current\)\}\s+className="w-full justify-between"\s*>/)
  assert.match(source, /<div id=\{extrasId\} className="space-y-3 rounded-md border border-border bg-background p-3">/)
  assert.match(source, /<Notice tone="neutral">\s*\{mode === "out_of_scope" \? t\("auditPhotoRequiredForMismatch"\) : t\("photoRequiredCondition"\)\}\s*<\/Notice>/)
  assert.match(source, /<ChoiceCard\s+type="checkbox"\s+checked=\{applyCorrections\}\s+onChange=\{\(event\) => setApplyCorrections\(event\.target\.checked\)\}\s+label=\{t\("applyAuditCorrections"\)\}\s+description=\{t\("applyAuditCorrectionsHelp"\)\}\s*\/>/)
  // The photo rule stays in the pinned bar, above save (audit mobile fix D1).
  const rule = source.indexOf('<Notice tone="neutral">')
  assert.ok(source.indexOf("data-audit-check-actions") < rule && rule < source.indexOf("{saveLabel}"))
  assert.doesNotMatch(source, /<button\b|<label\b|\btext-xs\b|\b(?:bg|border|text)-info\b|-info-|\btext-primary\b|\btext-warning\b|checkboxVariants/)
})
```

  No existing assertion changes (`audit-scan-check-ui` `:43-45` and `:58` still find the correction condition, `t("applyAuditCorrections")` after `{saveLabel}` and `{missingPhoto ? (` in the bar).
- [ ] **Step 2: Watch it fail.** `node --test tests/audit-scan-sweep-ui.test.ts`. Expected to fail: "check form: the installed-in note is an info Notice, the note and photo toggle a Button over a quiet grouping, the photo rule a neutral Notice and the correction a ChoiceCard (spec 2D D7, D9, M20, M29)".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** FMG `LOADER2` comment of the form: `:296` → `:297` (the `useId` line moves the loading line by one). Number stays 1. LFG LV2 3 and VFG R2 1 unchanged.
- [ ] **Step 5: Verify.** `node --test tests/audit-scan-sweep-ui.test.ts tests/audit-scan-check-ui.test.ts tests/audit-component-scan-ui.test.ts tests/file-evidence-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`; `npm test` (+1: 2114 tests, 2113 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2112 / 2111); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.** `git add src/components/audit/audit-scan-check-form.tsx tests/audit-scan-sweep-ui.test.ts tests/form-migration-guards.test.ts` then `git commit -m "refactor(ui): the check form's notes, note and photo toggle and correction choice on the shared parts (2D-4 task 8, AS-2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 9 (AS-3): The check field's system and latest values as meta lines (`c/audit/audit-scan-check-field.tsx`)

DESIGN.md Typography: a hint under a field is Meta (13/20), not Small. The two lines under a field go from `text-xs` to `text-meta`. The mismatch box (warning-soft with "ในระบบ: …") is the documented field-audit pattern and stays (D1); a matching field keeps no box.

**Files:**
- Modify: `src/components/audit/audit-scan-check-field.tsx` (CRLF)
- Test: `tests/audit-scan-sweep-ui.test.ts` (LF)

**Changes at 45c1409:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:51` | `<p className="mt-1 text-xs font-medium text-warning">` | `<p className="mt-1 text-meta font-medium text-warning">` | Typography |
| `:53` | `<p className="mt-0.5 text-xs text-muted-foreground">` | `<p className="mt-0.5 text-meta text-muted-foreground">` | Typography |

- [ ] **Step 1: The failing test.** Append:

```ts

test("check field: the system value and the latest register value are meta lines under the field (DESIGN.md Typography: hints are text-meta)", () => {
  const source = read(`${A}audit-scan-check-field.tsx`)
  assert.match(source, /<p className="mt-1 text-meta font-medium text-warning">\{t\("inSystem", \{ value: labelFor\(expectedValue\) \}\)\}<\/p>/)
  assert.match(source, /<p className="mt-0\.5 text-meta text-muted-foreground">\{t\("latestValue", \{ value: labelFor\(latestValue\) \}\)\}<\/p>/)
  // Only a mismatch keeps its warning box (audit mobile fix D1).
  assert.match(source, /className=\{mismatch \? "rounded-md border border-warning-border bg-warning-soft p-2\.5" : undefined\}/)
  assert.doesNotMatch(source, /\btext-xs\b/)
})
```

  No existing assertion changes.
- [ ] **Step 2: Watch it fail.** `node --test tests/audit-scan-sweep-ui.test.ts`. Expected to fail: "check field: the system value and the latest register value are meta lines under the field (DESIGN.md Typography: hints are text-meta)".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** None (the file has no row).
- [ ] **Step 5: Verify.** `node --test tests/audit-scan-sweep-ui.test.ts tests/audit-scan-check-ui.test.ts`; `npm test` (+1: 2115 tests, 2114 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2113 / 2112); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.** `git add src/components/audit/audit-scan-check-field.tsx tests/audit-scan-sweep-ui.test.ts` then `git commit -m "refactor(ui): the check field's system and latest values as meta lines (2D-4 task 9, AS-3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 10 (AS-4): The component panel's count and sub-lines as meta lines (`c/audit/audit-scan-panels.tsx`)

DESIGN.md Typography (sub-lines in rows and stat lines are Meta). The heading's "ตรวจแล้ว x / n" and each row's name · role · slot go to `text-meta`; the row stays `min-h-16` (22 + 20 + 16 = 58px fits in 64px, D2). The shared `Button`, `StatusBadge` and `DropdownMenu` of the audit mobile fix stay. The QR overlay on the camera image keeps its raw dim and white corners (permanent, §5.3) and gets a one-line comment saying so, for 2D-5's raw-color `EXEMPT`.

**Files:**
- Modify: `src/components/audit/audit-scan-panels.tsx` (CRLF)
- Test: `tests/audit-scan-sweep-ui.test.ts` (LF); edit `tests/audit-component-scan-ui.test.ts` (CRLF)

**Changes at 45c1409:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:59` | `<p className="text-xs text-muted-foreground">{t("componentsCheckedCount", …)}` | `text-meta` | Typography |
| `:83` | `<p className="truncate text-xs text-muted-foreground">` | `<p className="truncate text-meta text-muted-foreground">` | Typography |
| above `:155` `export function AuditQrScannerOverlay()` | — | `// The camera's scan frame keeps its own dim and white corners: they sit on the camera image (spec 2D §5.3, permanent).` | §5.3 |

- [ ] **Step 1: The failing test.** Append:

```ts

test("component panel: the checked count and each row's name · role · slot are meta lines, and the 64px rows stay (DESIGN.md Typography; audit mobile fix D2)", () => {
  const source = read(`${A}audit-scan-panels.tsx`)
  assert.match(source, /<p className="text-meta text-muted-foreground">\{t\("componentsCheckedCount", \{ checked: checkedCount, total: components\.length \}\)\}<\/p>/)
  assert.match(source, /<p className="truncate text-meta text-muted-foreground">\s*\{\[component\.name, component\.componentRole, component\.slotNo\]\.filter\(Boolean\)\.join\(" · "\)\}/)
  assert.match(source, /data-audit-component-row className="flex min-h-16 items-center gap-2 px-3 py-2"/)
  // The scan frame on the camera image keeps its raw dim and white corners, and says why (2D-5 lists it as permanent).
  assert.match(source, /\/\/ The camera's scan frame keeps its own dim and white corners[^\n]*\bpermanent\b[^\n]*\n(?:\/\/[^\n]*\n)*export function AuditQrScannerOverlay\(\)/)
  assert.doesNotMatch(source, /\btext-xs\b/)
})
```

  Existing pin, `tests/audit-component-scan-ui.test.ts:88`:
  - old: `  assert.match(panel, /<p className="truncate text-xs text-muted-foreground">/)`
  - new: `  assert.match(panel, /<p className="truncate text-meta text-muted-foreground">/)`
- [ ] **Step 2: Watch it fail.** `node --test tests/audit-scan-sweep-ui.test.ts tests/audit-component-scan-ui.test.ts`. Expected to fail: "component panel: the checked count and each row's name · role · slot are meta lines, and the 64px rows stay (DESIGN.md Typography; audit mobile fix D2)" and "each component is one compact row: tag, StatusBadge, name · role · slot, a พบ Button and a ⋯ menu (D2)".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** None.
- [ ] **Step 5: Verify.** `node --test tests/audit-scan-sweep-ui.test.ts tests/audit-component-scan-ui.test.ts tests/audit-scan-search-ui.test.ts tests/audit-scan-refactor-boundaries.test.ts`; `npm test` (+1: 2116 tests, 2115 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2114 / 2113); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.** `git add src/components/audit/audit-scan-panels.tsx tests/audit-scan-sweep-ui.test.ts tests/audit-component-scan-ui.test.ts` then `git commit -m "refactor(ui): the component panel's count and sub-lines as meta lines (2D-4 task 10, AS-4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 11 (AS-5): The check panel on the panel classes with an EmptyNote, the serial as a tag and the closed round as a danger Notice (`c/audit/audit-scan-check-panel.tsx`, `c/audit/audit-scan-workspace.tsx`)

A tight pair: they share the panel's `description` prop. Spec D7, D9, M20, M21, M25, M29, M33 and the DESIGN.md hand-on ("codes … a string a page builds … wait for plan 2D-4"). The ≥1024px side panel is an `<aside>`, so it takes `cn(getPanelClasses(), …)` with its own layout (sticky, the height cap, the header block; no `p-4 sm:p-5`, the form pads its body and bar). The empty side panel loses its dashed box: the same frame holding an `EmptyNote`. The description becomes a `ReactNode` so the serial shows as `tag`. The closed-round box is a danger `Notice` (`role="alert"` as before) whose action is the back link as an outline `md` `buttonVariants` link (was a hand-written text link). The phone sheet, the focus logic, the title and the out-of-scope subtitle stay.

**Files:**
- Modify: `src/components/audit/audit-scan-check-panel.tsx` (CRLF), `src/components/audit/audit-scan-workspace.tsx` (CRLF)
- Test: `tests/audit-scan-sweep-ui.test.ts` (LF); edit `tests/audit-scan-check-ui.test.ts` (CRLF)

**Interfaces:** `AuditScanCheckPanel` prop `description: string` → `description: ReactNode` (JSDoc: the asset's name and serial; the serial is a tag). The workspace is its only caller.

**Changes at 45c1409:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| panel `:4-5` | imports | add `import { EmptyNote } from "@/components/ui/empty-note"`, `import { getPanelClasses } from "@/lib/design-system"`, `import { cn } from "@/lib/utils"` (`ReactNode` is already imported) | — |
| panel `:20` | `description: string` | `description: ReactNode` with the JSDoc above | M33 |
| panel `:39` | `<aside data-audit-check-panel aria-label={title} className="sticky top-4 flex max-h-[calc(100dvh-7rem)] flex-col self-start rounded-lg border border-border bg-surface">` | `className={cn(getPanelClasses(), "sticky top-4 flex max-h-[calc(100dvh-7rem)] flex-col self-start")}` (the two comment lines above stay) | D9, M25 |
| panel `:47-49` | `<aside className="sticky top-4 self-start rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t("checkPanelEmpty")}</aside>` | `<aside className={cn(getPanelClasses(), "sticky top-4 self-start")}><EmptyNote padded className="justify-center">{t("checkPanelEmpty")}</EmptyNote></aside>` with a one-line comment, a `//` line after `) : (` and before the `<aside>`: `// The frame stays; one quiet line inside it instead of a dashed box (spec 2D M21).` | M21, §5.4 rule 2 |
| workspace `:4` | `import { useCallback, useEffect, useMemo, useRef, useState } from "react"` | add `type ReactNode` | — |
| workspace `:20-21` | imports | add `import { buttonVariants } from "@/components/ui/button-variants"` and `import { Notice } from "@/components/ui/notice"`, in that order, directly before `import { useMediaQuery } from "@/components/ui/use-media-query"` (`:21`, path order) | — |
| workspace `:650-652` | ``const targetDescription = target?.kind === "item" ? [target.item.name, target.item.serialNumber ? `Serial ${…}` : null].filter(Boolean).join(" · ") : target?.asset.subtitle ?? ""`` | `const targetDescription: ReactNode = target?.kind === "item"` then `? <>{target.item.name}{target.item.serialNumber ? <> · Serial <span className="tag">{target.item.serialNumber}</span></> : null}</>` then `: target?.asset.subtitle ?? ""`, with the one-line comment `// The serial is a code, so it shows as a tag; an out-of-scope subtitle is the asset's name.` above it | M33 |
| workspace `:659-664` | `<div role="alert" className="flex flex-wrap items-center gap-2 rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm font-medium text-danger">` with the message span and `<Link href={backHref} className="inline-flex min-h-11 items-center px-2 font-semibold text-primary underline-offset-4 hover:underline">` | `<Notice tone="danger" role="alert" action={<Link href={backHref} className={buttonVariants({ variant: "outline", size: "md" })}>{t("backToRound")}</Link>}>{t("roundClosedError")}</Notice>` (`tone`, `role`, `action` in this order) | D7 danger, M20, M29 |

- [ ] **Step 1: The failing test.** Append:

```ts

test("check panel and workspace: the side panel on the panel classes, its empty state an EmptyNote, the serial a tag and the closed round a danger Notice (spec 2D D7, D9, M21, M25, M33)", () => {
  const panel = read(`${A}audit-scan-check-panel.tsx`)
  assert.match(panel, /<aside\s+data-audit-check-panel\s+aria-label=\{title\}\s+className=\{cn\(getPanelClasses\(\), "sticky top-4 flex max-h-\[calc\(100dvh-7rem\)\] flex-col self-start"\)\}\s*>/)
  assert.match(panel, /<aside className=\{cn\(getPanelClasses\(\), "sticky top-4 self-start"\)\}>\s*<EmptyNote padded className="justify-center">\{t\("checkPanelEmpty"\)\}<\/EmptyNote>/)
  assert.match(panel, /description: ReactNode/)
  assert.doesNotMatch(panel, /border-dashed|rounded-lg border border-border bg-surface/)
  const workspace = read(`${A}audit-scan-workspace.tsx`)
  assert.match(workspace, /const targetDescription: ReactNode = target\?\.kind === "item"/)
  assert.match(workspace, /\{target\.item\.serialNumber \? <> · Serial <span className="tag">\{target\.item\.serialNumber\}<\/span><\/> : null\}/)
  assert.match(workspace, /<Notice\s+tone="danger"\s+role="alert"\s+action=\{\s*<Link href=\{backHref\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>\s*\{t\("backToRound"\)\}\s*<\/Link>\s*\}\s*>\s*\{t\("roundClosedError"\)\}\s*<\/Notice>/)
  assert.doesNotMatch(workspace, /bg-danger-soft|hover:underline|`Serial \$\{/)
})
```

  Existing pin, `tests/audit-scan-check-ui.test.ts:70`:
  - old: `  assert.match(source, /className="sticky top-4 flex max-h-\[calc\(100dvh-7rem\)\] flex-col self-start rounded-lg border border-border bg-surface"/)`
  - new: `  assert.match(source, /className=\{cn\(getPanelClasses\(\), "sticky top-4 flex max-h-\[calc\(100dvh-7rem\)\] flex-col self-start"\)\}/)`
- [ ] **Step 2: Watch it fail.** `node --test tests/audit-scan-sweep-ui.test.ts tests/audit-scan-check-ui.test.ts`. Expected to fail: "check panel and workspace: the side panel on the panel classes, its empty state an EmptyNote, the serial a tag and the closed round a danger Notice (spec 2D D7, D9, M21, M25, M33)" and "the panel hands its height to the form: the sheet body and the wide aside no longer scroll as one block (D1)".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** None (VFG `:26` still finds the heading's class; FMG has no row for the panel).
- [ ] **Step 5: Verify.** `node --test tests/audit-scan-sweep-ui.test.ts tests/audit-scan-check-ui.test.ts tests/audit-scan-workspace-ui.test.ts tests/audit-scan-room-ui.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`; `npm test` (+1: 2117 tests, 2116 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2115 / 2114); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.** `git add src/components/audit/audit-scan-check-panel.tsx src/components/audit/audit-scan-workspace.tsx tests/audit-scan-sweep-ui.test.ts tests/audit-scan-check-ui.test.ts` then `git commit -m "refactor(ui): the check panel on the panel classes with an EmptyNote, the serial as a tag and the closed round as a danger Notice (2D-4 task 11, AS-5)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 12 (AS-6): The scan header's back link from buttonVariants and its counts through formatCount (`c/audit/audit-scan-header.tsx`)

Spec D2 (the scanner's icon buttons are 2D's), M29; DESIGN.md Numbers and Typography. The back link is a ghost `icon` `buttonVariants` link (44px below `md`, 36px from `md`; was 44px at every width), the `ArrowLeft` keeps `size-5`. The counts go through `formatCount` (the same output: `th-TH` digits and groups equal `en-US`), `useLocale` goes, and the counts line is `text-meta num`. Stays: the `h1` with the code on phones and the full name for screen readers (D5, LH1), the `ArrowLeft` (LB1, the field scan header exception), the mismatch ink and the 4px progress bar (D5).

**Files:**
- Modify: `src/components/audit/audit-scan-header.tsx` (CRLF)
- Test: `tests/audit-scan-sweep-ui.test.ts` (LF)

**Changes at 45c1409:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:5-6` | `import { useLocale, useTranslations } from "next-intl"`; `cn` | `import { useTranslations } from "next-intl"`; add `import { buttonVariants } from "@/components/ui/button-variants"` and `import { formatCount } from "@/lib/display-format"`; `cn` stays (the mismatch span) | — |
| `:23` | `const numberLocale = useLocale() === "th" ? "th-TH" : "en-US"` | delete | Numbers |
| `:32` | `className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:…"` | `className={buttonVariants({ variant: "ghost", size: "icon" })}` (`href`, `aria-label`, `className` in this order) | D2, M29 |
| `:40` | `<p className="shrink-0 pr-1 text-xs tabular-nums text-muted-foreground">` | `<p className="shrink-0 pr-1 text-meta num text-muted-foreground">` | Typography |
| `:41` | `checked: progress.checked.toLocaleString(numberLocale), total: progress.total.toLocaleString(numberLocale)` | `checked: formatCount(progress.checked), total: formatCount(progress.total)` | Numbers |
| `:44` | `count: progress.mismatched.toLocaleString(numberLocale)` | `count: formatCount(progress.mismatched)` | Numbers |

- [ ] **Step 1: The failing test.** Append:

```ts

test("scan header: the back link is a ghost icon link from buttonVariants and the counts go through formatCount (spec 2D D2, M29; DESIGN.md Numbers)", () => {
  const source = read(`${A}audit-scan-header.tsx`)
  assert.match(source, /<Link\s+href=\{backHref\}\s+aria-label=\{tCommon\("back"\)\}\s+className=\{buttonVariants\(\{ variant: "ghost", size: "icon" \}\)\}\s*>\s*<ArrowLeft className="size-5" aria-hidden="true" \/>/)
  assert.match(source, /<p className="shrink-0 pr-1 text-meta num text-muted-foreground">/)
  assert.match(source, /t\("progressChecked", \{ checked: formatCount\(progress\.checked\), total: formatCount\(progress\.total\) \}\)/)
  assert.match(source, /t\("progressMismatch", \{ count: formatCount\(progress\.mismatched\) \}\)/)
  // The one-line header of the audit mobile fix (D5) stays: the code on phones, the thin bar.
  assert.match(source, /<span aria-hidden="true" className="md:hidden">\{roundCode\}<\/span>/)
  assert.doesNotMatch(source, /toLocaleString|useLocale|\btext-xs\b|size-11|hover:bg-accent/)
})
```

  No existing assertion changes (`audit-scan-room-ui` `:16-39` still match: `truncate`, the progress bar, `<p[^>]*shrink-0[^>]*>` before the bar, `h-1`).
- [ ] **Step 2: Watch it fail.** `node --test tests/audit-scan-sweep-ui.test.ts`. Expected to fail: "scan header: the back link is a ghost icon link from buttonVariants and the counts go through formatCount (spec 2D D2, M29; DESIGN.md Numbers)".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** LFG LH1 header 1 → 1 and LB1 header 1 → 1, unchanged (the `h1` and `ArrowLeft` stay; their comments name no line). LV1 does not count `toLocaleString(numberLocale)`, so no row moves.
- [ ] **Step 5: Verify.** `node --test tests/audit-scan-sweep-ui.test.ts tests/audit-scan-room-ui.test.ts tests/list-frame-guards.test.ts`; `npm test` (+1: 2118 tests, 2117 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2116 / 2115); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.** `git add src/components/audit/audit-scan-header.tsx tests/audit-scan-sweep-ui.test.ts` then `git commit -m "refactor(ui): the scan header's back link from buttonVariants and its counts through formatCount (2D-4 task 12, AS-6)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 13 (AS-7): The scan room list on the panel classes with EmptyNote, tags, a show-more Button and a text link (`c/audit/audit-scan-room-list.tsx`)

Spec D9, M21, M25, M29, M33; DESIGN.md Typography and Numbers. The tab counts go through `formatCount` in `num`. An empty tab is an `EmptyNote` (the pending tab's "ตรวจครบทุกชิ้นแล้ว" is `tone="clear"`, nothing left to do). The list is a frame on the canvas: the panel classes (12px corners, was 8px). Each row's own asset tag is `tag font-medium` in a sized wrapper (as the component rows); the name, room and meta lines are `text-meta`. Show-more is an outline `Button`; the pending-page link is `linkVariants()` with the 44px box below `md`. The row stays a raw `<button>` (the whole row opens the check sheet; `data-audit-scan-row`, `aria-current` and the workspace's focus logic use it) with a comment. Stays: the `Segmented` tabs, `min-h-14`, `hover:bg-accent` and `active && "bg-accent"` (pinned), the full room line (D6), the badges.

**Files:**
- Modify: `src/components/audit/audit-scan-room-list.tsx` (CRLF)
- Test: `tests/audit-scan-sweep-ui.test.ts` (LF); edit `tests/audit-scan-room-ui.test.ts` (CRLF)

**Changes at 45c1409:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:5-9` | imports | add `Button` (`@/components/ui/button`), `linkVariants` (`@/components/ui/button-variants`), `EmptyNote` (`@/components/ui/empty-note`), `getPanelClasses` (`@/lib/design-system`), `formatCount` (`@/lib/display-format`); `cn` stays | — |
| `:84` | `<span className="tabular-nums">{counts[key]}</span>` | `<span className="num">{formatCount(counts[key])}</span>` | Numbers |
| `:91` | `<p className="px-2 py-6 text-center text-sm text-muted-foreground">{t(emptyLabelKey[tab])}</p>` | `<EmptyNote tone={tab === "pending" ? "clear" : "empty"} className="justify-center px-2 py-6">{t(emptyLabelKey[tab])}</EmptyNote>` | M21 |
| `:93` | `<ul className="mt-2 divide-y divide-border overflow-hidden rounded-md border border-border bg-surface">` | `<ul className={cn(getPanelClasses(), "mt-2 divide-y divide-border overflow-hidden")}>` | D9, M25 |
| `:100-101` | `<li key={item.itemId}>` `<button` | a JSX comment between them: `{/* A raw button on purpose: the whole row of two to four lines opens the check sheet (2D-5 lists it). */}` | R5 |
| `:112` | `<span className="block truncate text-sm font-semibold text-foreground">{item.assetTag}</span>` | `<span className="block truncate text-sm text-foreground"><span className="tag font-medium">{item.assetTag}</span></span>` | M33 |
| `:113-115` | `text-xs` on the name, room and meta spans | `text-meta` on each (classes otherwise unchanged) | Typography |
| `:130-136` | raw `<button type="button" onClick={onShowMore} className="mt-2 inline-flex min-h-11 w-full … hover:bg-accent …">` | `<Button variant="outline" onClick={onShowMore} className="mt-2 w-full">{t("showMore")}</Button>` | M29 |
| `:142` | `className="mt-3 inline-flex min-h-11 items-center px-1 text-sm font-medium text-primary underline-offset-4 hover:underline"` | `className={cn(linkVariants(), "mt-3 inline-flex min-h-11 items-center md:min-h-0")}` | M29 (DESIGN.md text links) |

- [ ] **Step 1: The failing test.** Append:

```ts

test("room list: counts through formatCount, EmptyNote for an empty tab, the list on the panel classes, the tag as tag, meta lines, an outline show-more and a text link to the pending page (spec 2D D9, M21, M25, M29, M33)", () => {
  const source = read(`${A}audit-scan-room-list.tsx`)
  assert.match(source, /<span className="num">\{formatCount\(counts\[key\]\)\}<\/span>/)
  assert.match(source, /<EmptyNote tone=\{tab === "pending" \? "clear" : "empty"\} className="justify-center px-2 py-6">\{t\(emptyLabelKey\[tab\]\)\}<\/EmptyNote>/)
  assert.match(source, /<ul className=\{cn\(getPanelClasses\(\), "mt-2 divide-y divide-border overflow-hidden"\)\}>/)
  assert.match(source, /<span className="block truncate text-sm text-foreground"><span className="tag font-medium">\{item\.assetTag\}<\/span><\/span>/)
  assert.match(source, /<Button variant="outline" onClick=\{onShowMore\} className="mt-2 w-full">\s*\{t\("showMore"\)\}\s*<\/Button>/)
  assert.match(source, /href=\{pendingHref\}\s+className=\{cn\(linkVariants\(\), "mt-3 inline-flex min-h-11 items-center md:min-h-0"\)\}/)
  // The row stays a raw button (the whole row opens the sheet) and says so for 2D-5.
  assert.equal(source.match(/<button\b/g)?.length, 1)
  assert.match(source, /\{\/\* A raw button on purpose: [^\n]*\*\/\}\s*<button\s+type="button"\s+data-audit-scan-row/)
  assert.doesNotMatch(source, /\btext-xs\b|font-semibold|tabular-nums|hover:underline|text-primary|rounded-md border border-border bg-surface/)
})
```

  Existing pins, `tests/audit-scan-room-ui.test.ts`:
  - `:78` old: `  assert.match(source, /<span className="block truncate text-sm font-semibold text-foreground">\{item\.assetTag\}<\/span>/)` → new: `  assert.match(source, /<span className="block truncate text-sm text-foreground"><span className="tag font-medium">\{item\.assetTag\}<\/span><\/span>/)`
  - `:79` old: `  assert.match(source, /<span className="block truncate text-xs text-foreground">\{item\.name\}<\/span>/)` → new: `  assert.match(source, /<span className="block truncate text-meta text-foreground">\{item\.name\}<\/span>/)`
  - `:81` old: `  assert.match(source, /\{place \? <span data-audit-scan-row-room className="block break-words text-xs text-muted-foreground">\{place\}<\/span> : null\}/)` → new: `  assert.match(source, /\{place \? <span data-audit-scan-row-room className="block break-words text-meta text-muted-foreground">\{place\}<\/span> : null\}/)`
- [ ] **Step 2: Watch it fail.** `node --test tests/audit-scan-sweep-ui.test.ts tests/audit-scan-room-ui.test.ts`. Expected to fail: "room list: counts through formatCount, EmptyNote for an empty tab, the list on the panel classes, the tag as tag, meta lines, an outline show-more and a text link to the pending page (spec 2D D9, M21, M25, M29, M33)" and "room list rows show tag, name and the full room on its own line (D6)".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** None (VFG `:283-284` still finds `<Segmented` and no `aria-pressed`).
- [ ] **Step 5: Verify.** `node --test tests/audit-scan-sweep-ui.test.ts tests/audit-scan-room-ui.test.ts tests/visual-foundation-guards.test.ts tests/audit-scan-workspace-ui.test.ts`; `npm test` (+1: 2119 tests, 2118 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2117 / 2116); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.** `git add src/components/audit/audit-scan-room-list.tsx tests/audit-scan-sweep-ui.test.ts tests/audit-scan-room-ui.test.ts` then `git commit -m "refactor(ui): the scan room list on the panel classes with EmptyNote, tags, a show-more Button and a text link (2D-4 task 13, AS-7)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 14 (AS-8): The room picker without a dashed trigger, with meta counts and the dialog footer layout (`c/audit/audit-scan-room-picker.tsx`)

Spec D19 (the sheet footer button follows the dialog footer, named at this file), §5.4 rule 2 (no `border-dashed` outside the shared parts); DESIGN.md Typography and Numbers. The trigger without a chosen room drops its dashed border for the outline-button line (`border-control-border`). Its count, the "เปลี่ยน" cue and each option's count become `text-meta` (`num` for numbers). The footer takes the dialog footer's layout: full width on phones, a right-aligned row from `sm` (`AccessibleDialogFooter`'s classes), the button without `w-full`. The trigger (a two-line context control under `SheetTrigger asChild`) and the option (`aria-pressed`, found by the open-focus logic) stay raw `<button>`s, each with a comment. Stays: the controlled `open` (D7), the room search `<input>` (O20), the department `Field`, the selected `primary-soft` looks.

**Files:**
- Modify: `src/components/audit/audit-scan-room-picker.tsx` (CRLF)
- Test: `tests/audit-scan-sweep-ui.test.ts` (LF); edit `tests/audit-scan-room-ui.test.ts` (CRLF); guard comment: `tests/form-migration-guards.test.ts` (CRLF)

**Changes at 45c1409:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:47-48` | `<Sheet …>` `<SheetTrigger asChild>` | a JSX comment between them: `{/* A raw button on purpose: a two-line context control that shows the chosen room, like a select trigger (2D-5 lists it). */}` (outside `SheetTrigger`, which takes one child) | R5 |
| `:54` | `"border-dashed border-border bg-surface text-muted-foreground hover:bg-accent"` | `"border-control-border bg-surface text-muted-foreground hover:bg-accent"` | §5.4 rule 2 |
| `:61` | `<span className="block text-xs font-normal tabular-nums">` | `<span className="block text-meta font-normal num">` | Typography |
| `:68` | `<span className="shrink-0 text-xs font-semibold underline underline-offset-4">` | `text-meta` in place of `text-xs` | Typography |
| `:115-116` | `<li key={option.locationId}>` `<button` | a JSX comment between them: `{/* A raw button on purpose: a pressed room option that chooses and closes the sheet (2D-5 lists it). */}` | R5 |
| `:126` | `<span className="shrink-0 text-xs tabular-nums text-muted-foreground">` | `<span className="shrink-0 text-meta num text-muted-foreground">` | Typography |
| `:135-136` | `<SheetFooter className="border-t border-border-soft bg-background px-4 py-3">` and `<Button variant="outline" onClick={() => choose({ locationId: "", departmentId: "" })} className="w-full">` | a one-line JSX comment above (the dialog footer's layout, spec 2D D19), `<SheetFooter className="border-t border-border-soft bg-background px-4 py-3 sm:flex-row sm:flex-wrap sm:justify-end sm:px-5">` and `<Button variant="outline" onClick={() => choose({ locationId: "", departmentId: "" })}>` | D19 |

- [ ] **Step 1: The failing test.** Append:

```ts

test("room picker: no dashed trigger, meta counts, the clear button in the dialog footer's layout, and the two raw buttons that stay say why (spec 2D D19, §5.4 rule 2)", () => {
  const source = read(`${A}audit-scan-room-picker.tsx`)
  assert.match(source, /selected \? "border-primary-border bg-primary-soft text-primary" : "border-control-border bg-surface text-muted-foreground hover:bg-accent"/)
  assert.match(source, /<span className="block text-meta font-normal num">\s*\{t\("roomPendingOfTotal", \{ pending: selected\.pending, total: selected\.total \}\)\}/)
  assert.match(source, /<span className="shrink-0 text-meta font-semibold underline underline-offset-4">\{t\("roomChange"\)\}<\/span>/)
  assert.match(source, /<span className="shrink-0 text-meta num text-muted-foreground">\s*\{t\("roomPendingOfTotal", \{ pending: option\.pending, total: option\.total \}\)\}/)
  assert.match(source, /<SheetFooter className="border-t border-border-soft bg-background px-4 py-3 sm:flex-row sm:flex-wrap sm:justify-end sm:px-5">\s*<Button variant="outline" onClick=\{\(\) => choose\(\{ locationId: "", departmentId: "" \}\)\}>/)
  assert.equal(source.match(/\{\/\* A raw button on purpose: [^\n]*\(2D-5 lists it\)\. \*\/\}/g)?.length, 2)
  assert.equal(source.match(/<button\b/g)?.length, 2)
  assert.doesNotMatch(source, /border-dashed|\btext-xs\b|tabular-nums|className="w-full"/)
})
```

  Existing pin, `tests/audit-scan-room-ui.test.ts:156`:
  - old: `  assert.match(source, /<SheetFooter className="border-t border-border-soft bg-background px-4 py-3">\n\s+<Button variant="outline" onClick=\{\(\) => choose\(\{ locationId: "", departmentId: "" \}\)\} className="w-full">\n\s+\{t\("roomClear"\)\}\n\s+<\/Button>\n\s+<\/SheetFooter>/)`
  - new: `  assert.match(source, /<SheetFooter className="border-t border-border-soft bg-background px-4 py-3 sm:flex-row sm:flex-wrap sm:justify-end sm:px-5">\n\s+<Button variant="outline" onClick=\{\(\) => choose\(\{ locationId: "", departmentId: "" \}\)\}>\n\s+\{t\("roomClear"\)\}\n\s+<\/Button>\n\s+<\/SheetFooter>/)`
- [ ] **Step 2: Watch it fail.** `node --test tests/audit-scan-sweep-ui.test.ts tests/audit-scan-room-ui.test.ts`. Expected to fail: "room picker: no dashed trigger, meta counts, the clear button in the dialog footer's layout, and the two raw buttons that stay say why (spec 2D D19, §5.4 rule 2)" and "the room sheet takes its X name and header from Sheet, the department is a shared field and clearing sits in a footer (2C batch 3)".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** FMG `RAW_FIELDS` (`tests/form-migration-guards.test.ts:194`): `// → 1: the room search :76 stays (O20)` → `:88` (the comment was already stale: the input is at `:87` at `45c1409`; the trigger comment moves it to `:88`; check with `grep -n "<input" src/components/audit/audit-scan-room-picker.tsx`). The number stays 1.
- [ ] **Step 5: Verify.** `node --test tests/audit-scan-sweep-ui.test.ts tests/audit-scan-room-ui.test.ts tests/form-migration-guards.test.ts`; `npm test` (+1: 2120 tests, 2119 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2118 / 2117); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.** `git add src/components/audit/audit-scan-room-picker.tsx tests/audit-scan-sweep-ui.test.ts tests/audit-scan-room-ui.test.ts tests/form-migration-guards.test.ts` then `git commit -m "refactor(ui): the room picker without a dashed trigger, with meta counts and the dialog footer layout (2D-4 task 14, AS-8)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 15 (AS-9): The scan search on SearchField with a camera Button, results on the panel classes (`c/audit/audit-scan-search.tsx`)

Spec D2, D9, M25, M29, M33; FMG GF2 once 2D-5 widens it. The hand-written field (icon, raw `<input>`, raw clear and camera buttons) becomes the shared `SearchField` (its comment already names "the audit scan camera button" as the one trailing button): `type="text"`, `fieldSize="xl"` (48px, 16px text, no iOS zoom), every input prop as before (IME composition, `inputMode`, `enterKeyHint`, `ref`), `onClear` with `clearLabel`, and the camera as `trailing`: a `Button` `variant={cameraOpen ? "default" : "ghost"}` `size="icon"` with `aria-pressed` (44px below `md`, 36px from `md`). The result list takes the panel classes; each row's tag is `tag font-medium`; the count, sub-line and room line are `text-meta`. The result row stays a raw `<button>` with a comment. Stays: the sticky bar `<form role="search">` and its classes (VFG `:117`), the highlight `<mark>`, the room warning ink (D6), the badges, the quiet live region.

**Files:**
- Modify: `src/components/audit/audit-scan-search.tsx` (CRLF)
- Test: `tests/audit-scan-sweep-ui.test.ts` (LF); edit `tests/audit-scan-search-ui.test.ts` (CRLF)

**Changes at 45c1409:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:4` | `import { Camera, Search, X } from "lucide-react"` | `import { Camera } from "lucide-react"` | — |
| `:6` | `StatusBadge` import | add `import { Button } from "@/components/ui/button"` and `import { SearchField } from "@/components/ui/search-field"` before it | — |
| `:14` | `import { getFieldControlClasses } from "@/lib/design-system"` | `import { getPanelClasses } from "@/lib/design-system"`; `cn` stays | — |
| `:49-99` | `<div className="relative">` with the `Search` icon, the raw `<input … className={cn(getFieldControlClasses({ fieldSize: "xl" }), "pl-9 pr-24")} />`, and a trailing `div` with the raw clear `<button>` and the raw camera `<button>` | a one-line JSX comment (the shared search box, spec 2D D2, M29), then `<SearchField` with, in this order: `ref={inputRef}`, `type="text"`, `fieldSize="xl"`, `inputMode="search"`, `enterKeyHint="search"`, `autoComplete="off"`, `spellCheck={false}`, `aria-label={t("searchItemsLabel")}`, `placeholder={t("searchItemsPlaceholder")}`, `value={value}`, the same `onCompositionStart`, `onCompositionEnd`, `onChange` bodies, `onClear={onClear}`, `clearLabel={t("searchClear")}`, `trailing={<Button variant={cameraOpen ? "default" : "ghost"} size="icon" aria-label={cameraOpen ? t("stopCamera") : t("openCamera")} aria-pressed={cameraOpen} onClick={onToggleCamera}><Camera className="size-5" aria-hidden="true" /></Button>}` (Button props in this order) | D2, M29 |
| `:147` | `<p className="px-1 pb-1 text-xs text-muted-foreground">` | `text-meta` | Typography |
| `:148` | `<ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-surface">` | `<ul className={cn(getPanelClasses(), "divide-y divide-border overflow-hidden")}>` | D9, M25 |
| `:155-156` | `<li key={match.item.itemId}>` `<button` | a JSX comment between them: `{/* A raw button on purpose: the whole result row opens the check sheet (2D-5 lists it). */}` | R5 |
| `:162-164` | `<span className="block truncate text-sm font-semibold text-foreground">` around the tag expression | `<span className="block truncate text-sm text-foreground">` around `<span className="tag font-medium">{match.field === "assetTag" ? highlight(match.item.assetTag) : match.item.assetTag}</span>` | M33 |
| `:165` | `<span className="block truncate text-xs text-muted-foreground">` | `text-meta` | Typography |
| `:169` | `cn("block break-words text-xs", elsewhere ? …)` | `cn("block break-words text-meta", elsewhere ? …)` | Typography |

- [ ] **Step 1: The failing test.** Append:

```ts

test("scan search: the shared SearchField with its clear button and a camera Button, and results on the panel classes with the tag as tag and meta lines (spec 2D D2, D9, M25, M29, M33)", () => {
  const source = read(`${A}audit-scan-search.tsx`)
  assert.match(source, /<SearchField\s+ref=\{inputRef\}\s+type="text"\s+fieldSize="xl"[\s\S]*?onClear=\{onClear\}\s+clearLabel=\{t\("searchClear"\)\}\s+trailing=\{/)
  assert.match(source, /<Button\s+variant=\{cameraOpen \? "default" : "ghost"\}\s+size="icon"\s+aria-label=\{cameraOpen \? t\("stopCamera"\) : t\("openCamera"\)\}\s+aria-pressed=\{cameraOpen\}\s+onClick=\{onToggleCamera\}\s*>/)
  assert.match(source, /<ul className=\{cn\(getPanelClasses\(\), "divide-y divide-border overflow-hidden"\)\}>/)
  assert.match(source, /<span className="tag font-medium">\{match\.field === "assetTag" \? highlight\(match\.item\.assetTag\) : match\.item\.assetTag\}<\/span>/)
  // The sticky bar over main's padding stays (VFG pins its classes); only the result row stays a raw button.
  assert.equal(source.match(/<button\b/g)?.length, 1)
  assert.equal(source.match(/<input\b/g), null)
  assert.doesNotMatch(source, /getFieldControlClasses|size-11|\btext-xs\b|font-semibold|rounded-md border border-border bg-surface/)
})
```

  Existing pins, `tests/audit-scan-search-ui.test.ts`:
  - `:15` old: `  assert.match(source, /getFieldControlClasses\(\{ fieldSize: "xl" \}\)/)` → new: `  assert.match(source, /<SearchField\n\s+ref=\{inputRef\}\n\s+type="text"\n\s+fieldSize="xl"/)`
  - `:19` old: `  assert.match(source, /size-11/)` → new: `  assert.match(source, /trailing=\{\n\s+<Button\n\s+variant=\{cameraOpen \? "default" : "ghost"\}\n\s+size="icon"/)`
- [ ] **Step 2: Watch it fail.** `node --test tests/audit-scan-sweep-ui.test.ts tests/audit-scan-search-ui.test.ts`. Expected to fail: "scan search: the shared SearchField with its clear button and a camera Button, and results on the panel classes with the tag as tag and meta lines (spec 2D D2, D9, M25, M29, M33)" and "the search field sticks to the top on phones, avoids iOS zoom and holds the camera button".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** None (the file is not a 2C file; VFG `:117` still finds the sticky bar).
- [ ] **Step 5: Verify.** `node --test tests/audit-scan-sweep-ui.test.ts tests/audit-scan-search-ui.test.ts tests/audit-scan-readable-result.test.ts tests/audit-scan-workspace-ui.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts`; `npm test` (+1: 2121 tests, 2120 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2119 / 2118); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.** `git add src/components/audit/audit-scan-search.tsx tests/audit-scan-sweep-ui.test.ts tests/audit-scan-search-ui.test.ts` then `git commit -m "refactor(ui): the scan search on SearchField with a camera Button, results on the panel classes (2D-4 task 15, AS-9)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 16 (AS-10): The register lookup card as a ContentPanel with Notices by meaning and EmptyNote (`c/audit/audit-scan-lookup-card.tsx`)

Spec D7, D9, M20, M21, M25, M33. The card ("ไม่พบในรอบนี้" with its search of the register) is a stand-alone frame on the canvas: `ContentPanel` (padding 16/20px, was 12px; the unused `data-audit-scan-lookup` hook goes, ContentPanel takes no data attribute). Inside: the out-of-scope result is a warning `Notice` with the asset tag sentence as `title`, the name as body and "บันทึกเป็นนอกขอบเขต" as an outline `md` action; the matches list is a quiet grouping; the match tag is `tag font-medium`; an unknown code is an `EmptyNote`; offline is a neutral `Notice` (a condition of the search: the offline bar above already warns); an error is a danger `Notice` with `role="alert"`. The match row stays a raw `<button>` with a comment. Stays: the seven states, the loading line with its stopped spinner (I27), the idle outline button, the in-round badge tones.

**Files:**
- Modify: `src/components/audit/audit-scan-lookup-card.tsx` (CRLF)
- Test: `tests/audit-scan-sweep-ui.test.ts` (LF)

**Changes at 45c1409:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:6-7` | imports | add `ContentPanel` (`@/components/ui/content-panel`), `EmptyNote` (`@/components/ui/empty-note`), `Notice` (`@/components/ui/notice`) | — |
| `:35`, `:83` | `<div data-audit-scan-lookup className="rounded-md border border-border bg-surface p-3">` … `</div>` | `<ContentPanel>` … `</ContentPanel>` | D9, M25 |
| `:50-56` | `<div className="mt-2 rounded-md border border-warning-border bg-warning-soft p-3">` with a `text-warning` title, a `text-xs` subtitle and an outline `Button className="mt-2"` | `<Notice tone="warning" className="mt-2" title={t("lookupOutOfScope", { assetTag: state.asset.assetTag })} action={<Button type="button" variant="outline" size="md" onClick={() => onRecordOutOfScope(state.asset)}>{t("recordOutOfScope")}</Button>}>{state.asset.subtitle}</Notice>` (props in this order) | D7 warning, M20 |
| `:60` | `<p className="text-xs text-muted-foreground">` | `text-meta` | Typography |
| `:61` | `<ul className="mt-1 divide-y divide-border rounded-md border border-border">` | `… border border-border bg-background">` with a one-line JSX comment above (a quiet grouping inside the panel) | D9 |
| `:63-64` | `<li key={match.assetId}>` `<button` | a JSX comment between them: `{/* A raw button on purpose: a two-line register match that opens it (2D-5 lists it). */}` | R5 |
| `:70` | `<span className="block truncate text-sm font-semibold">{match.assetTag}</span>` | `<span className="block truncate text-sm text-foreground"><span className="tag font-medium">{match.assetTag}</span></span>` | M33 |
| `:71` | `text-xs text-muted-foreground` | `text-meta text-muted-foreground` | Typography |
| `:80` | `<p className="mt-2 text-sm text-muted-foreground">{t("lookupUnknown")}</p>` | `<EmptyNote className="mt-2">{t("lookupUnknown")}</EmptyNote>` | M21 |
| `:81` | `<p className="mt-2 text-sm text-warning">{t("lookupOffline")}</p>` | a one-line JSX comment (offline is a condition of the search; the bar above warns) and `<Notice tone="neutral" className="mt-2">{t("lookupOffline")}</Notice>` | D7 neutral, M20 |
| `:82` | `<p className="mt-2 text-sm text-danger" role="alert"><ApiErrorText …/></p>` | `<Notice tone="danger" role="alert" className="mt-2"><ApiErrorText error={state.message} /></Notice>` | D7 danger, M20 |

- [ ] **Step 1: The failing test.** Append:

```ts

test("lookup card: a ContentPanel with Notices by meaning (out of scope warning, offline neutral, error danger alert), EmptyNote for an unknown code, a quiet list and the tag as tag (spec 2D D7, D9, M20, M21, M25, M33)", () => {
  const source = read(`${A}audit-scan-lookup-card.tsx`)
  assert.match(source, /return \(\s*<ContentPanel>/)
  assert.match(source, /<Notice\s+tone="warning"\s+className="mt-2"\s+title=\{t\("lookupOutOfScope", \{ assetTag: state\.asset\.assetTag \}\)\}\s+action=\{\s*<Button type="button" variant="outline" size="md" onClick=\{\(\) => onRecordOutOfScope\(state\.asset\)\}>/)
  assert.match(source, /<ul className="mt-1 divide-y divide-border rounded-md border border-border bg-background">/)
  assert.match(source, /<span className="block truncate text-sm text-foreground"><span className="tag font-medium">\{match\.assetTag\}<\/span><\/span>/)
  assert.match(source, /<EmptyNote className="mt-2">\{t\("lookupUnknown"\)\}<\/EmptyNote>/)
  assert.match(source, /<Notice tone="neutral" className="mt-2">\{t\("lookupOffline"\)\}<\/Notice>/)
  assert.match(source, /<Notice tone="danger" role="alert" className="mt-2"><ApiErrorText error=\{state\.message\} \/><\/Notice>/)
  assert.equal(source.match(/<button\b/g)?.length, 1)
  assert.doesNotMatch(source, /\b(?:bg|border|text)-warning\b|-warning-|text-danger|\btext-xs\b|font-semibold|rounded-md border border-border bg-surface/)
})
```

  No existing assertion changes (`audit-scan-search-ui` `:55-62` reads the seven `state.status` branches, `t("lookupOffline")` and `state.message`; `spinner-motion-ui` reads the stopped spinner).
- [ ] **Step 2: Watch it fail.** `node --test tests/audit-scan-sweep-ui.test.ts`. Expected to fail: "lookup card: a ContentPanel with Notices by meaning (out of scope warning, offline neutral, error danger alert), EmptyNote for an unknown code, a quiet list and the tag as tag (spec 2D D7, D9, M20, M21, M25, M33)".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** None.
- [ ] **Step 5: Verify.** `node --test tests/audit-scan-sweep-ui.test.ts tests/audit-scan-search-ui.test.ts tests/spinner-motion-ui.test.ts`; `npm test` (+1: 2122 tests, 2121 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2120 / 2119); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.** `git add src/components/audit/audit-scan-lookup-card.tsx tests/audit-scan-sweep-ui.test.ts` then `git commit -m "refactor(ui): the register lookup card as a ContentPanel with Notices by meaning and EmptyNote (2D-4 task 16, AS-10)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 17 (AS-11): The offline bar as a warning Notice with a busy send Button (`c/audit/audit-scan-offline-bar.tsx`)

Spec D7, M20, M29, §5.4 rule 4. Saves waiting on the device are something to deal with: a warning `Notice`, `role="status"` and `data-audit-scan-offline` kept, the count sentence as its `title`, the failed entries as its body. "ส่งตอนนี้" is the Notice action, an outline `md` `Button` with `busy={sending}` (was a link-look raw button with `disabled={sending}` and `disabled:opacity-60`: busy blocks clicks the same way, keeps focus and never fades, GB4). "ลบออกจากคิว" is an outline `sm` `Button` per failed row. Stays: `return null` while online with an empty queue, the failed filter, the `?? "-"` inside the translated sentence (LV2, R-n).

**Files:**
- Modify: `src/components/audit/audit-scan-offline-bar.tsx` (CRLF)
- Test: `tests/audit-scan-sweep-ui.test.ts` (LF); edit `tests/audit-scan-offline-ux.test.ts` (CRLF)

**Changes at 45c1409:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:3-4` | imports | add `Button` (`@/components/ui/button`) and `Notice` (`@/components/ui/notice`) | — |
| `:26` | `<div role="status" data-audit-scan-offline className="mb-2 rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning">` | a one-line comment above `return` (waiting saves are a warning; the send runs busy), then `<Notice tone="warning" role="status" data-audit-scan-offline className="mb-2" title={online ? t("offlineBarPending", { count: queue.length }) : t("offlineBarOffline", { count: queue.length })} action={…}>` (props in this order) | D7 warning, M20 |
| `:27-36` | the title span and the raw send `<button type="button" onClick={onSendNow} disabled={sending} className="… hover:underline disabled:opacity-60 md:min-h-8">` | `action={online && queue.length > 0 ? <Button variant="outline" size="md" busy={sending} onClick={onSendNow}>{t("sendNow")}</Button> : undefined}` | M29, §5.4 rule 4 |
| `:38`, `:40` | `<ul className="mt-1 space-y-1">`, `<li … className="flex flex-wrap items-center gap-2 text-xs">` | `<ul className="space-y-1">` as the Notice's children (only while `failed.length > 0`), `<li … className="flex flex-wrap items-center gap-2">` | Typography (the Notice body is `text-meta`) |
| `:42-44` | raw remove `<button … className="… hover:underline md:min-h-8">` | `<Button variant="outline" size="sm" onClick={() => onRemove(entry.id)}>{t("removeFromQueue")}</Button>` | M29 |
| `:49` | `</div>` | `</Notice>` | — |

- [ ] **Step 1: The failing test.** Append:

```ts

test("offline bar: a warning Notice with role status, a busy send Button and outline remove Buttons, no faded disabled look (spec 2D D7, M20, M29, §5.4 rule 4)", () => {
  const source = read(`${A}audit-scan-offline-bar.tsx`)
  assert.match(source, /<Notice\s+tone="warning"\s+role="status"\s+data-audit-scan-offline\s+className="mb-2"\s+title=\{online \? t\("offlineBarPending", \{ count: queue\.length \}\) : t\("offlineBarOffline", \{ count: queue\.length \}\)\}/)
  assert.match(source, /<Button variant="outline" size="md" busy=\{sending\} onClick=\{onSendNow\}>\s*\{t\("sendNow"\)\}/)
  assert.match(source, /<Button variant="outline" size="sm" onClick=\{\(\) => onRemove\(entry\.id\)\}>\s*\{t\("removeFromQueue"\)\}/)
  // The failed line keeps its "-" inside a translated sentence (LFG LV2 KEEP 1, R-n).
  assert.match(source, /error: entry\.lastSyncError \?\? "-"/)
  assert.doesNotMatch(source, /<button\b|disabled:opacity|hover:underline|text-primary|\btext-xs\b|bg-warning-soft|disabled=\{sending\}/)
})
```

  Existing pin, `tests/audit-scan-offline-ux.test.ts`:
  - `:18` old: `test("the offline bar shows failed entries with their last error and disables send while sending", () => {` → new: `test("the offline bar shows failed entries with their last error and keeps send busy while sending", () => {`
  - `:23` old: `  assert.match(bar, /onClick=\{onSendNow\} disabled=\{sending\}/)` → new: `  assert.match(bar, /busy=\{sending\} onClick=\{onSendNow\}/)`
- [ ] **Step 2: Watch it fail.** `node --test tests/audit-scan-sweep-ui.test.ts tests/audit-scan-offline-ux.test.ts`. Expected to fail: "offline bar: a warning Notice with role status, a busy send Button and outline remove Buttons, no faded disabled look (spec 2D D7, M20, M29, §5.4 rule 4)" and "the offline bar shows failed entries with their last error and keeps send busy while sending".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** LFG LV2 `audit-scan-offline-bar.tsx` 1 → 1 in BUDGETS and KEEP, unchanged (the `?? "-"` stays; the comment names no line). LT5 counts only an `opacity-N` without a variant prefix, so the removed `disabled:opacity-60` was never in a row (it is spec §5.4 rule 4, which 2D-5 adds).
- [ ] **Step 5: Verify.** `node --test tests/audit-scan-sweep-ui.test.ts tests/audit-scan-offline-ux.test.ts tests/audit-scan-feedback-transition.test.ts tests/list-frame-guards.test.ts tests/form-migration-guards.test.ts`; `npm test` (+1: 2123 tests, 2122 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2121 / 2120); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.** `git add src/components/audit/audit-scan-offline-bar.tsx tests/audit-scan-sweep-ui.test.ts tests/audit-scan-offline-ux.test.ts` then `git commit -m "refactor(ui): the offline bar as a warning Notice with a busy send Button (2D-4 task 17, AS-11)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 18 (AS-12): The saved banner as a Notice by result with outline Buttons (`c/audit/audit-scan-saved-banner.tsx`)

Spec D7, M20, M29. The banner after a save is a `Notice` whose tone follows the result: kept on the device `info`, saved with a mismatch `warning` (a box), saved (all match, or out of scope) `success`. It appears by itself after a save, so it keeps `role="status"` (one live region). "แก้" (not for out-of-scope saves, as before) and "ส่งรูปอีกครั้ง" are outline `md` `Button`s in the Notice action. The photo retry is its own danger `Notice` under it with no live role: the failed upload's toast already announced it. `data-audit-scan-saved` and `mb-2` move to a wrapping `div` (`space-y-2`). Stays: the message keys and their choice (`savedQueued`, `savedOutOfScope`, `savedAllMatch`, `savedMismatch`), the field-label words for the fields.

**Files:**
- Modify: `src/components/audit/audit-scan-saved-banner.tsx` (CRLF)
- Test: `tests/audit-scan-sweep-ui.test.ts` (LF)

**Changes at 45c1409:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:3-5` | `useTranslations`, the session types, `cn` | delete the `cn` import; add `Button` (`@/components/ui/button`) and `Notice` (`@/components/ui/notice`) | — |
| `:43-51` | `<div role="status" data-audit-scan-saved className={cn("mb-2 flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium", notice.queued ? "border-border bg-muted text-foreground" : notice.diff.length > 0 ? "…warning…" : "…success…")}>` | a 3-line comment above `return` (tones by result; status; the retry has no role because its toast spoke), then `<div data-audit-scan-saved className="mb-2 space-y-2">` holding `<Notice tone={notice.queued ? "info" : notice.diff.length > 0 ? "warning" : "success"} role="status" action={…}>{message}</Notice>` (`tone`, `role`, `action` in this order). The test counts `role="status"` (exactly 1) and forbids `-soft`, `text-success`, `text-warning`, `text-danger` and `cn(` anywhere in the file, so the comment contains none of them; the dry run's text: `// The tone follows the result: kept on the device is info, saved with a mismatch a warning box, saved a success line.` / `// It appears by itself after a save, so it is the one live status region. The photo retry under it has no live role:` / `// the failed upload's toast already announced it.` | D7, M20 |
| `:53-57` | raw `<button type="button" onClick={onEdit} className="… text-primary … hover:underline md:min-h-8">` | `action={notice.mode !== "out_of_scope" ? <Button variant="outline" size="md" onClick={onEdit}>{t("editAgain")}</Button> : undefined}` | M29 |
| `:58-65` | `<span className="flex w-full flex-wrap items-center gap-2 text-danger">` with the message and a raw retry `<button>` | `{photoRetryCount > 0 ? <Notice tone="danger" action={<Button variant="outline" size="md" onClick={onRetryPhotos}>{t("retryPhotos")}</Button>}>{t("photoRetryMessage")}</Notice> : null}` after the first Notice, inside the wrapper | D7 danger, M20, M29 |

- [ ] **Step 1: The failing test.** Append:

```ts

test("saved banner: a Notice by result (queued info, mismatch warning, saved success) with role status, outline Buttons for edit and photo retry, and the retry a danger Notice (spec 2D D7, M20, M29)", () => {
  const source = read(`${A}audit-scan-saved-banner.tsx`)
  assert.match(source, /<div data-audit-scan-saved className="mb-2 space-y-2">\s*<Notice\s+tone=\{notice\.queued \? "info" : notice\.diff\.length > 0 \? "warning" : "success"\}\s+role="status"/)
  assert.match(source, /notice\.mode !== "out_of_scope" \? \(\s*<Button variant="outline" size="md" onClick=\{onEdit\}>\s*\{t\("editAgain"\)\}/)
  assert.match(source, /\{photoRetryCount > 0 \? \(\s*<Notice\s+tone="danger"\s+action=\{\s*<Button variant="outline" size="md" onClick=\{onRetryPhotos\}>\s*\{t\("retryPhotos"\)\}/)
  assert.equal(source.match(/role="status"/g)?.length, 1, "one live region: the saved result")
  assert.doesNotMatch(source, /<button\b|hover:underline|text-primary|-soft\b|text-(?:success|warning|danger)\b|\bcn\(/)
})
```

  No existing assertion changes (`audit-scan-workspace-ui` `:59-64` reads the field-label map; `audit-scan-feedback-transition` `:24` finds `role="status"`).
- [ ] **Step 2: Watch it fail.** `node --test tests/audit-scan-sweep-ui.test.ts`. Expected to fail: "saved banner: a Notice by result (queued info, mismatch warning, saved success) with role status, outline Buttons for edit and photo retry, and the retry a danger Notice (spec 2D D7, M20, M29)".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 3b (approved by the user 2026-10-16, open issue 10 a; the dry run skipped it, so check its tests with care).** Drop the leading "✓ " from the three saved keys, because the success `Notice` draws its own check (a mismatch keeps the triangle). Write this change file to `<temp>/2d4-saved-keys.json` with a file-writing tool and run `node scripts/messages-edit.mjs <temp>/2d4-saved-keys.json`; then `git diff --stat messages/` shows the two files with three lines each.

```json
{
  "set": {
    "th": {
      "auditScan.savedAllMatch": "{assetTag} บันทึกแล้ว · ตรงทุกข้อ",
      "auditScan.savedMismatch": "{assetTag} บันทึกแล้ว · ไม่ตรง: {fields}",
      "auditScan.savedOutOfScope": "{assetTag} บันทึกเป็นนอกขอบเขตแล้ว"
    },
    "en": {
      "auditScan.savedAllMatch": "{assetTag} saved · everything matches",
      "auditScan.savedMismatch": "{assetTag} saved · mismatched: {fields}",
      "auditScan.savedOutOfScope": "{assetTag} saved as out of scope"
    }
  }
}
```

  With Step 3b, add `messages/th.json messages/en.json` to the `git add` of Step 6 and run `node --test tests/thai-glossary.test.ts tests/audit-scan-workspace-ui.test.ts` in Step 5.
- [ ] **Step 4: Guard rows.** None.
- [ ] **Step 5: Verify.** `node --test tests/audit-scan-sweep-ui.test.ts tests/audit-scan-workspace-ui.test.ts tests/audit-scan-feedback-transition.test.ts`; `npm test` (+1: 2124 tests, 2123 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2122 / 2121); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.** `git add src/components/audit/audit-scan-saved-banner.tsx tests/audit-scan-sweep-ui.test.ts` then `git commit -m "refactor(ui): the saved banner as a Notice by result with outline Buttons (2D-4 task 18, AS-12)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 19 (AS-13): The camera error as a warning Notice; the controls on the image stay raw (`c/audit/audit-scan-camera.tsx`)

Spec D7, M20, §5.3. A camera that cannot start (unsupported, no camera, permission denied, error) is something the person deals with by allowing the camera or typing: a warning `Notice` with `role="alert"` (as before), in a padded footer under the image (a warning box may sit inside a frame). The zoom, torch and stop buttons sit on the camera image: they keep their raw dark fill and white ink and stay raw `<button>`s; one comment above them says so for 2D-5. Stays: the camera frame, the square target, the overlay, the stopped spinner, every camera behaviour.

**Files:**
- Modify: `src/components/audit/audit-scan-camera.tsx` (CRLF)
- Test: `tests/audit-scan-sweep-ui.test.ts` (LF)

**Changes at 45c1409:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:7-8` | imports | add `import { Notice } from "@/components/ui/notice"` | — |
| above `:150` `{running && zoom.levels.length > 0 ? (` | — | a two-line JSX comment: `{/* The zoom, torch and stop controls sit on the camera image: raw buttons with their own dark fill and white ink` / `(spec 2D §5.3, permanent; 2D-5 lists them). */}` | §5.3, R5 |
| `:193-197` | `<p role="alert" className="border-t border-border bg-warning-soft p-3 text-sm text-warning">{errorText}</p>` | a one-line comment, a `//` line inside `{errorText ? (` before the `<div>`: `// A camera that cannot start is the person's to deal with (allow the camera or type the code): a warning box.` (the test does not pin it), then `<div className="border-t border-border p-3"><Notice tone="warning" role="alert">{errorText}</Notice></div>` | D7 warning, M20 |

- [ ] **Step 1: The failing test.** Append:

```ts

test("camera: a camera that cannot start shows a warning Notice with role alert; the controls on the image keep their raw look and say why (spec 2D D7, §5.3)", () => {
  const source = read(`${A}audit-scan-camera.tsx`)
  assert.match(source, /<div className="border-t border-border p-3">\s*<Notice tone="warning" role="alert">\{errorText\}<\/Notice>\s*<\/div>/)
  assert.match(source, /\{\/\* The zoom, torch and stop controls sit on the camera image: raw buttons[\s\S]*?permanent; 2D-5 lists them\)\. \*\/\}/)
  assert.equal(source.match(/<button\b/g)?.length, 3)
  assert.doesNotMatch(source, /bg-warning-soft|text-warning/)
})
```

  No existing assertion changes (`audit-scan-search-ui` `:64-152` reads the camera's behaviour, its `data-audit-scan-camera` frame with `scroll-mt-20`, the square target and the torch/zoom code).
- [ ] **Step 2: Watch it fail.** `node --test tests/audit-scan-sweep-ui.test.ts`. Expected to fail: "camera: a camera that cannot start shows a warning Notice with role alert; the controls on the image keep their raw look and say why (spec 2D D7, §5.3)".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** None (GB2 and `spinner-motion-ui` still see the stopped spinner).
- [ ] **Step 5: Verify.** `node --test tests/audit-scan-sweep-ui.test.ts tests/audit-scan-search-ui.test.ts tests/audit-scan-readable-result.test.ts tests/spinner-motion-ui.test.ts`; `npm test` (+1: 2125 tests, 2124 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2123 / 2122); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.** `git add src/components/audit/audit-scan-camera.tsx tests/audit-scan-sweep-ui.test.ts` then `git commit -m "refactor(ui): the camera error as a warning Notice; the controls on the image stay raw (2D-4 task 19, AS-13)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

## Area AP: the audit pages and parts (Tasks 20–29)

Spec §3.4 ("หน้ารอบตรวจนับ (token info 16 จุด)", M26 for the round cancel dialog), D7, D9, D19. The 16 info tokens are the 10 of `D/audit/rounds/[id]/page.tsx` and the 6 of `D/audit/rounds/page.tsx`; the area's other files hold 10 more (the findings page 3, the progress bar 3, the round form 4). After Tasks 27 and 28 no screen file uses the `info` tokens outside the shared parts. The shared audit parts come first (Tasks 20–25), then the four pages (26–29); between Tasks 20 and 28 the round page shows the progress bar without a frame (nothing deploys in between). Task 20 creates `tests/audit-pages-sweep-ui.test.ts`; Tasks 21–29 append to it (`const D` is declared in Task 26's block).

### Task 20 (AP-1): The progress bar has no frame of its own, counts through formatCount and a marker legend (`src/components/audit/audit-progress-bar.tsx`)

Spec D9 (R4: no frame in a frame), M22, DESIGN "Numbers" and "The Where Color Lives Rule". The non-compact bar sits inside the coverage panel of the rounds list and on its own on the round page, so it loses its frame and the callers decide (AP-8: none, it is inside the coverage `ContentPanel`; AP-9: its own `ContentPanel`). The breakdown's tinted tiles become a legend whose marker shapes carry the tone (2D-3 R3), the counts go through `formatCount`, and `text-xs` becomes `text-meta`. The props, the bar itself (track, fill, its tone by percent) and the compact variant's layout stay.

**Files:**
- Modify: `src/components/audit/audit-progress-bar.tsx` (CRLF)
- Create: `tests/audit-pages-sweep-ui.test.ts` (LF)

**Interfaces:** `AuditProgressBar`'s props do not change. Its non-compact root has no frame from this commit on; AP-8 and AP-9 rely on that.

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| `:32` | root `compact ? "min-w-44" : "rounded-lg border border-border bg-surface p-4"` | `className={compact ? "min-w-44" : undefined}` | D9, R4 |
| `:34` | compact label `text-xs font-medium text-muted-foreground` | `text-meta font-medium text-muted-foreground` (non-compact `text-sm font-medium text-foreground` stays) | DESIGN §3 Meta |
| `:37-38` | `text-xs font-semibold text-foreground` / `text-sm font-semibold text-foreground`, `{percent}%` | `text-meta font-semibold num text-foreground` / `text-sm font-semibold num text-foreground`, `{formatCount(percent)}%` | formatCount, `num` |
| `:41-42` | track `rounded-full bg-muted`, fill `rounded-full` + `bg-success` / `bg-primary` / `bg-warning` | unchanged (a meter, not a pill) | not taken (R18) |
| `:44-46` | `text-xs text-muted-foreground`, `{processed}/{total}`, `{pending}` | `text-meta num text-muted-foreground`, `{formatCount(processed)}/{formatCount(total)}`, `{formatCount(pending)}` | formatCount |
| `:48-56` | grid of tinted tiles (`rounded-md border px-3 py-2 text-xs ${getBreakdownClass(item.tone)}`), value `text-lg font-semibold` `{item.value}` | a legend `<dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">`; each item `<div key={item.label} className="min-w-0">` with `<dt className="flex items-center gap-1.5 text-meta text-muted-foreground"><span aria-hidden="true" className={statusMarkerVariants({ tone: item.tone ?? "muted" })} />{item.label}</dt>` and `<dd className="text-count num text-foreground">{formatCount(item.value)}</dd>` | M22, Status With Evidence (marker shapes), no tone fills |
| `:62-68` | `getBreakdownClass` | delete | — |
| imports | none | `import { statusMarkerVariants } from "@/components/ui/badge-variants"`, `import { formatCount } from "@/lib/display-format"` (both server-safe; the file has no directive) | — |

- [ ] **Step 1: The failing test.** Create `tests/audit-pages-sweep-ui.test.ts` (LF) with this content:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-4 (spec 2D §3.4, D7, D9, D19, M20–M22, M25, M26, M29, M33): the audit pages and their parts on the shared
// parts. List frames take the panel classes, page sections are ContentPanel, number tiles StatStrip, label and value
// pairs KeyValueList, messages Notice by meaning, states StatusBadge, names the shared Chip, empty states EmptyNote,
// codes tag, empty values Nil, links linkVariants or buttonVariants. The audit mobile fix of the findings table (8
// columns, colgroup, sticky actions, the compact review actions) stays. Each test pins one file and fails before that
// commit. Sources are read with LF line endings, so the regexes may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/"

test("audit progress bar: no frame of its own, counts through formatCount, the breakdown as a legend with shape markers (spec 2D D9, M22)", () => {
  const source = read(`${C}audit/audit-progress-bar.tsx`)
  assert.match(source, /<div className=\{compact \? "min-w-44" : undefined\}>/)
  assert.match(source, /\{formatCount\(processed\)\}\/\{formatCount\(total\)\}/)
  assert.match(source, /\{formatCount\(pending\)\}/)
  assert.match(source, /\{formatCount\(percent\)\}%/)
  assert.match(source, /<span aria-hidden="true" className=\{statusMarkerVariants\(\{ tone: item\.tone \?\? "muted" \}\)\} \/>/)
  assert.match(source, /<dd className="text-count num text-foreground">\{formatCount\(item\.value\)\}<\/dd>/)
  assert.doesNotMatch(source, /rounded-lg|border-border|bg-surface|getBreakdownClass|-soft\b|\btext-xs\b|text-lg/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/audit-pages-sweep-ui.test.ts` → fails: "audit progress bar: no frame of its own, counts through formatCount, the breakdown as a legend with shape markers (spec 2D D9, M22)".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** None: the file has no LFG, VFG or FMG row, and every counter stays 0 for it (VFG: `text-count num` share one class string).
- [ ] **Step 5: Verify.** `node --test tests/audit-pages-sweep-ui.test.ts`; `npm test` (+1: 2126 tests, 2125 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2124 / 2123); `npx tsc --noEmit`; `npm run lint` (0 errors, no new warning in `src/` or `tests/`).
- [ ] **Step 6: Commit.**

```
git add src/components/audit/audit-progress-bar.tsx tests/audit-pages-sweep-ui.test.ts
git commit -m "refactor(ui): the audit progress bar has no frame of its own, counts through formatCount and shows its breakdown as a marker legend (2D-4 task 20, AP-1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 21 (AP-2): The round close checklist on ContentPanel, Button busy and StatStrip (`src/components/audit/audit-round-close-button.tsx`)

Spec D7, D9, M22, M29; DESIGN "Detail pages" (a record's counts are a `StatStrip`, a count that needs action takes `attention`), "Busy" (K13, GB4). The hand-written panel becomes a `ContentPanel` whose action is the shared `Button` (busy while closing, the spinner from `Button`, no faded disabled look). The four tinted cards become a `StatStrip` of the three counts (each links to its list while it is above 0, its foot line says "ดูรายการ" in the warning tone while it blocks closing); the fourth item, the closer-is-not-the-creator rule, has no count to drill into, so while it blocks it is a neutral `Notice` under the strip (D7: a condition before acting) and while it passes it shows nothing. The confirm, the API call, the toasts, `disabled` and the checklist data stay.

**Files:**
- Modify: `src/components/audit/audit-round-close-button.tsx` (CRLF)
- Test: `tests/audit-pages-sweep-ui.test.ts` (LF), `tests/audit-round-result-drilldown.test.ts` (CRLF)

**Interfaces:** `ChecklistItem` (`label`, `value`, `ok`, `href?`, `actionLabel?`) does not change. Its meaning is now written in a comment on `href`: "the drill-down of a count; an item without one is a rule". The round page (AP-9) already builds the closer rule without `href`, so it needs no change.

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| `:57-62` | `<div className="rounded-lg border border-border bg-surface p-4">` with a hand-written head (`h2`, `p`) | `<ContentPanel title={t("closeChecklist")} description={t("closeChecklistHelp")} actions={…}>` | D9 |
| `:63-71` | raw `<button>` (`h-10`, `bg-primary`, `text-white`, `disabled={disabled \|\| saving}`, `disabled:opacity-50`, `Loader2` or `Lock` `h-4 w-4`) | in `actions`: `<Button onClick={closeRound} busy={saving} disabled={disabled}>` + `<Lock aria-hidden="true" />` + `{t("closeRound")}`; default variant and size (`h-10` not beside a field → 36px) | M29, GB4 (busy is not repeated in `disabled`) |
| `:73-99` | grid of 4 tinted cards (`border-success-border bg-success-soft` / `border-warning-border bg-warning-soft`, `CheckCircle2` in the tone color, `text-2xl font-bold` value, an underlined `text-xs` link label, a `Link` card when `item.href && item.value > 0`) | the items with `href` → `<StatStrip items={…} />` with, per item: `key: item.label`, `label: item.label`, `value: formatCount(item.value)`, `href: item.href && item.value > 0 ? item.href : undefined`, `foot` and `footTitle`: `item.actionLabel` on the same condition, `attention: !item.ok`. The items without `href`: when `!item.ok`, `<Notice key={item.label} tone="neutral" className="mt-3">{item.label}</Notice>` after the strip; otherwise nothing. Filter the checklist twice above `return`, under a two-line comment: `const counts = checklist.filter((item) => item.href)` for the strip and `const rules = checklist.filter((item) => !item.href)`, rendered as `{rules.map((item) => !item.ok ? (<Notice …/>) : null)}`; `foot` and `footTitle` are both `item.href && item.value > 0 ? item.actionLabel : undefined` | DESIGN Detail pages, D7 neutral |
| `:6`, imports | `Link`, `CheckCircle2`, `Loader2`, `Lock` | keep `Lock`; remove `Link`, `CheckCircle2`, `Loader2`; add `Button`, `ContentPanel`, `Notice`, `StatStrip`, `formatCount` | — |
| `:12-18` | `type ChecklistItem` | unchanged; the comment on `href` above | — |

- [ ] **Step 1: The failing test.** Append to `tests/audit-pages-sweep-ui.test.ts`:

```ts

test("audit round close: a ContentPanel with the shared busy Button, the checklist counts as a StatStrip with attention, and a blocking rule as a neutral Notice (spec 2D D7, D9, M22, M29)", () => {
  const source = read(`${C}audit/audit-round-close-button.tsx`)
  assert.match(source, /<ContentPanel\s+title=\{t\("closeChecklist"\)\}\s+description=\{t\("closeChecklistHelp"\)\}\s+actions=\{/)
  assert.match(source, /<Button onClick=\{closeRound\} busy=\{saving\} disabled=\{disabled\}>\s*<Lock aria-hidden="true" \/>\s*\{t\("closeRound"\)\}/)
  assert.match(source, /<StatStrip\b/)
  assert.match(source, /value: formatCount\(item\.value\)/)
  assert.match(source, /href: item\.href && item\.value > 0 \? item\.href : undefined/)
  assert.match(source, /attention: !item\.ok/)
  assert.match(source, /<Notice key=\{item\.label\} tone="neutral" className="mt-3">\{item\.label\}<\/Notice>/)
  assert.doesNotMatch(source, /<button\b|Loader2|CheckCircle2|disabled:opacity|text-white|-soft\b|rounded-lg|rounded-md|text-2xl|\btext-xs\b/)
})
```

  Edit the existing pin in `tests/audit-round-result-drilldown.test.ts` `:244` (test "audit round close checklist items link to focused drilldown pages"):
  - old: `  assert.match(closeButton, /Link/)`
  - new: `  assert.match(closeButton, /<StatStrip\b/)`

- [ ] **Step 2: Watch it fail.** `node --test tests/audit-pages-sweep-ui.test.ts tests/audit-round-result-drilldown.test.ts` → fail: "audit round close: a ContentPanel with the shared busy Button, the checklist counts as a StatStrip with attention, and a blocking rule as a neutral Notice (spec 2D D7, D9, M22, M29)" and "audit round close checklist items link to focused drilldown pages".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** None (the file is in no guard table; LT5 never counted it because its opacity was behind `disabled:`).
- [ ] **Step 5: Verify.** `node --test tests/audit-pages-sweep-ui.test.ts tests/audit-round-result-drilldown.test.ts`; `npm test` (+1: 2127 tests, 2126 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2125 / 2124); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.**

```
git add src/components/audit/audit-round-close-button.tsx tests/audit-pages-sweep-ui.test.ts tests/audit-round-result-drilldown.test.ts
git commit -m "refactor(ui): the round close checklist on ContentPanel, Button busy and StatStrip, the closer rule as a neutral Notice (2D-4 task 21, AP-2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 22 (AP-3): The round cancel dialog's impact as a KeyValueList and its warning as a Notice (`src/components/audit/audit-round-cancel-button.tsx`)

Spec M26 (`:98`, `:128`), D7, D19. The no-rollback line is a warning `Notice` (the user must weigh it before cancelling). The six impact tiles are number tiles in a small dialog, where a `StatStrip` would put six 28px cells in one row from `lg`; they become one `KeyValueList` with the counts through `formatCount` (the 2D-3 precedent for counts in a review, `SummaryItem`), and `ImpactItem` joins LS1's `LOCAL_STAT_TILE`. The trigger, the dialog, its field (`required`, FMG floor [1, 0, 0]), the footer and the API stay.

**Files:**
- Modify: `src/components/audit/audit-round-cancel-button.tsx` (CRLF), `tests/list-frame-guards.test.ts` (CRLF)
- Test: `tests/audit-pages-sweep-ui.test.ts` (LF)

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| `:90-97` | `<div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">` with six `<ImpactItem>` | `<KeyValueList items={[…]} />`, in this order: `{ key: "processed", label: t("cancelImpactProcessed"), value: formatCount(impact.processedItems) }`, then `pending` / `pendingItems`, `pendingFindings` / `pendingFindings`, `approvedFindings` / `approvedFindings`, `openActions` / `openActions`, `scanHistory` / `scanHistoryRows`, each label the key its `ImpactItem` had | M26 `:128`, D19 |
| `:98-100` | `<div className="rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning">` | `<Notice tone="warning">{t("cancelNoRollbackWarning")}</Notice>` | M26 `:98`, D7 warning |
| `:128-135` | `function ImpactItem` (`text-xs` label, `text-xl font-bold` value) | delete | D19 |
| imports | — | add `KeyValueList`, `Notice`, `formatCount` | — |

- [ ] **Step 1: The failing test.** Append to `tests/audit-pages-sweep-ui.test.ts`:

```ts

test("audit round cancel dialog: the impact counts are a KeyValueList through formatCount and the no-rollback line is a warning Notice (spec 2D M26, D7, D19)", () => {
  const source = read(`${C}audit/audit-round-cancel-button.tsx`)
  assert.match(source, /<Notice tone="warning">\{t\("cancelNoRollbackWarning"\)\}<\/Notice>/)
  assert.match(source, /<KeyValueList\b/)
  for (const field of ["processedItems", "pendingItems", "pendingFindings", "approvedFindings", "openActions", "scanHistoryRows"]) {
    assert.match(source, new RegExp(`value: formatCount\\(impact\\.${field}\\)`), field)
  }
  assert.doesNotMatch(source, /function ImpactItem\b|<ImpactItem\b|border-warning-border|bg-warning-soft|text-xl font-bold|\btext-xs\b/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/audit-pages-sweep-ui.test.ts` → fails: "audit round cancel dialog: the impact counts are a KeyValueList through formatCount and the no-rollback line is a warning Notice (spec 2D M26, D7, D19)".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** LFG LS1 has no row for the file (its count stays 0). `ImpactItem` joins `LOCAL_STAT_TILE` in this commit (D19, R10), so no tile of that name can come back. In `tests/list-frame-guards.test.ts` (CRLF): insert directly above the line `const LOCAL_STAT_TILE = …` (below the two `// Plan 2D-3 (D19) …` comment lines) the comment line `// Plan 2D-4 Task 22 (AP-3): ImpactItem (the round cancel dialog).`, and in the `const` line replace `|EvidenceStat|SummaryItem)\b/g` with `|EvidenceStat|SummaryItem|ImpactItem)\b/g`. FMG `CONSTRAINT_FLOORS` [1, 0, 0] still holds (the `Textarea` keeps `required`).
- [ ] **Step 5: Verify.** `node --test tests/audit-pages-sweep-ui.test.ts tests/list-frame-guards.test.ts tests/audit-round-cancellation.test.ts tests/form-migration-guards.test.ts`; `npm test` (+1: 2128 tests, 2127 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2126 / 2125); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.**

```
git add src/components/audit/audit-round-cancel-button.tsx tests/audit-pages-sweep-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "refactor(ui): the round cancel dialog shows its impact as a KeyValueList and its no-rollback line as a warning Notice (2D-4 task 22, AP-3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 23 (AP-4): The audit round form on the panel classes, StatStrip, Notice and ChoiceCard (`src/components/audit/audit-round-form.tsx`)

Spec D7, D9, D19, M22, M33, and 2D-3 R4 (a `<form>` cannot be a `ContentPanel`, so it takes `cn(getPanelClasses(), "p-4 sm:p-5")`). The section around the form goes and the form is the panel; the sampling group is the quiet grouping and the boxes inside it go; the preview counts are a `StatStrip` (four numbers above the list of sample assets, DESIGN "StatStrip"), the risk preset (Thai text, which `text-metric` must not carry) a one-row `KeyValueList`, the component line an info `Notice`, the sample assets a plain list with their tags (M33, never bold), the empty preview an `EmptyNote`, the "include closed assets" checkbox a `ChoiceCard` (its warning tint goes; `ChoiceCard` also stops Enter on it from submitting the form). `PreviewMetric` joins `LOCAL_STAT_TILE`. The fields, `required` / `maxLength` / `min` / `max` (FMG floor [7, 1, 0]), the preview and save buttons, the API calls and the `PageHeader` stay.

**Files:**
- Modify: `src/components/audit/audit-round-form.tsx` (CRLF), `tests/list-frame-guards.test.ts` (CRLF)
- Test: `tests/audit-pages-sweep-ui.test.ts` (LF), `tests/audit-round-form-ui.test.ts` (CRLF), `tests/audit-component-round-routes.test.ts` (CRLF)

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| `:141`, `:274` | `<section className="rounded-lg border border-border bg-surface p-6">` … `</section>` | delete (the `<form>` is the panel; its children may keep their indentation) | D9 |
| `:142` | `<form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">` | `<form onSubmit={handleSubmit} className={cn(getPanelClasses(), "grid grid-cols-1 gap-5 p-4 sm:p-5 md:grid-cols-2")}>` | R4 (one spacing) |
| `:160` | `md:col-span-2 rounded-lg border border-border bg-background p-4` | `md:col-span-2 rounded-md border border-border bg-background p-4` | quiet grouping |
| `:184` | preview row `mt-4 flex flex-col gap-3 rounded-md border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between` | `mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between` | no box in a box |
| `:187` | `mt-1 text-xs text-muted-foreground` | `mt-1 text-meta text-muted-foreground` | Meta |
| `:195` | `mt-4 rounded-md border border-primary-border bg-primary-soft p-4` | `mt-4 space-y-4` (no fill: `primary-soft` marks a choice, not a result) | DESIGN Primary |
| `:196-202` | five `<PreviewMetric>` in `grid gap-3 sm:grid-cols-2 lg:grid-cols-5`, values `String(…)` | `<StatStrip items={[…]} />` with `{ key: "matched", label: t("previewMatched"), value: formatCount(preview.matchedAssets) }`, `{ key: "sampled", label: t("previewSampled"), value: formatCount(preview.sampledAssets) }`, `{ key: "componentItems", label: t("previewComponentItems"), value: formatCount(componentItems) }`, `{ key: "sampleRate", label: t("previewSampleRate"), value: `${formatCount(preview.sampleRate)}%` }`; then `<KeyValueList items={[{ key: "risk", label: t("previewRisk"), value: t(`riskPreset_${preview.riskPreset}`) }]} />` | StatStrip, `text-metric` numbers only |
| `:203-207` | `<p className="mt-3 rounded-md border border-info-border bg-info-soft px-3 py-2 text-xs text-info">` | `<Notice tone="info">{t("previewComponentHelp", { count: componentItems })}</Notice>` (same condition `componentItems > 0`) | D7 info |
| `:208-209` | `<div className="mt-4">`, heading `text-xs font-semibold uppercase tracking-normal text-muted-foreground` | `<div>` (the wrapper's `space-y-4` spaces it), heading `text-meta font-medium text-muted-foreground` | no capitals |
| `:211-223` | `mt-2 grid gap-2 md:grid-cols-2` of boxed cards `rounded-md border border-border bg-surface px-3 py-2` | `<ul className="mt-2 grid gap-x-4 gap-y-3 md:grid-cols-2">` of `<li key={asset.id} className="min-w-0">` (no box) | no box in a box |
| `:214` | `<div className="text-sm font-semibold text-foreground">{asset.assetTag}</div>` | `<div className="text-sm text-foreground"><span className="tag font-medium">{asset.assetTag}</span></div>` | M33 |
| `:215` | `mt-0.5 truncate text-xs text-muted-foreground` | `mt-0.5 truncate text-meta text-muted-foreground` | Meta |
| `:217` | `mt-1 text-xs font-medium text-info` | `mt-1 text-meta text-muted-foreground` (the sentence keeps its code as text, R8) | no teal text |
| `:225` | `<p className="mt-2 text-sm text-muted-foreground">{t("previewEmpty")}</p>` | `<EmptyNote className="mt-2">{t("previewEmpty")}</EmptyNote>` | M21 |
| `:255-266` | `<label className="md:col-span-2 flex items-start gap-3 rounded-md border border-warning-border bg-warning-soft p-3">` with a native checkbox (`cn(checkboxVariants(), "mt-0.5")`), its label and `text-xs` help | `<ChoiceCard type="checkbox" className="md:col-span-2" label={t("includeClosedAssets")} description={t("includeClosedAssetsHelp")} checked={values.includeClosedAssets} onChange={(event) => setIncludeClosedAssets(event.target.checked)} />` | 2C ChoiceCard, Enter guard |
| `:283-290` | `function PreviewMetric` | delete | D19 |
| imports | `checkboxVariants` | remove; add `ChoiceCard` (`@/components/ui/choice-card`), `EmptyNote`, `KeyValueList`, `Notice`, `StatStrip`, `getPanelClasses` (`@/lib/design-system`), `formatCount` (`@/lib/display-format`); `cn` stays | — |

- [ ] **Step 1: The failing test.** Append to `tests/audit-pages-sweep-ui.test.ts`:

```ts

test("audit round form: the form is the panel, the sampling box a quiet grouping, the preview a StatStrip with an info Notice, codes as tag, an EmptyNote and the include-closed choice a ChoiceCard (spec 2D D7, D9, D19, M22, M33)", () => {
  const source = read(`${C}audit/audit-round-form.tsx`)
  assert.match(source, /<form onSubmit=\{handleSubmit\} className=\{cn\(getPanelClasses\(\), "grid grid-cols-1 gap-5 p-4 sm:p-5 md:grid-cols-2"\)\}>/)
  assert.match(source, /<div className="md:col-span-2 rounded-md border border-border bg-background p-4">/)
  assert.match(source, /<StatStrip\b/)
  for (const value of ["formatCount\\(preview\\.matchedAssets\\)", "formatCount\\(preview\\.sampledAssets\\)", "formatCount\\(componentItems\\)", "`\\$\\{formatCount\\(preview\\.sampleRate\\)\\}%`"]) {
    assert.match(source, new RegExp(`value: ${value}`), value)
  }
  assert.match(source, /<Notice tone="info">\{t\("previewComponentHelp", \{ count: componentItems \}\)\}<\/Notice>/)
  assert.match(source, /<span className="tag font-medium">\{asset\.assetTag\}<\/span>/)
  assert.match(source, /<EmptyNote className="mt-2">\{t\("previewEmpty"\)\}<\/EmptyNote>/)
  assert.match(source, /<ChoiceCard\s+type="checkbox"\s+className="md:col-span-2"\s+label=\{t\("includeClosedAssets"\)\}\s+description=\{t\("includeClosedAssetsHelp"\)\}/)
  assert.doesNotMatch(source, /<section\b|function PreviewMetric\b|uppercase|tracking-|primary-soft|primary-border|info-soft|info-border|text-info|warning-soft|warning-border|rounded-lg|\btext-xs\b|<input\b|checkboxVariants/)
})
```

  Edit the existing pins:
  - `tests/audit-round-form-ui.test.ts` `:13` (test "the audit round form uses the shared fields, the sample-rate hint and busy preview and save buttons (2C batch 3)"):
    - old: `  assert.equal(source.match(/<input\b/g)?.length, 1, "only the include-closed checkbox stays a native input")`
    - new: `  assert.doesNotMatch(source, /<input\b/, "the include-closed checkbox is a ChoiceCard since plan 2D-4")`
  - same file `:21`:
    - old: `  assert.match(source, /className=\{cn\(checkboxVariants\(\), "mt-0\.5"\)\}/)`
    - new: `  assert.match(source, /<ChoiceCard\s+type="checkbox"\s+className="md:col-span-2"/)`
  - `tests/audit-component-round-routes.test.ts` `:97` (test "audit round form displays component expansion counts from preview"):
    - old: `  assert.match(form, /String\(componentItems\)/)`
    - new: `  assert.match(form, /formatCount\(componentItems\)/)`

- [ ] **Step 2: Watch it fail.** `node --test tests/audit-pages-sweep-ui.test.ts tests/audit-round-form-ui.test.ts tests/audit-component-round-routes.test.ts` → fail: "audit round form: the form is the panel, the sampling box a quiet grouping, the preview a StatStrip with an info Notice, codes as tag, an EmptyNote and the include-closed choice a ChoiceCard (spec 2D D7, D9, D19, M22, M33)", "the audit round form uses the shared fields, the sample-rate hint and busy preview and save buttons (2C batch 3)" and "audit round form displays component expansion counts from preview".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** `PreviewMetric` joins `LOCAL_STAT_TILE` (count stays 0). In `tests/list-frame-guards.test.ts`: insert directly above the line `const LOCAL_STAT_TILE = …` (below the Task 22 comment line) `// Plan 2D-4 Task 23 (AP-4): PreviewMetric (the round form preview).`, and in the `const` line replace `|SummaryItem|ImpactItem)\b/g` with `|SummaryItem|ImpactItem|PreviewMetric)\b/g`. FMG: `CONSTRAINT_FLOORS` [7, 1, 0] still holds (5 `Input` with `required`, the status `Select` and its `NativeSelect`; `maxLength` on the name); GF2 has no row and still counts 0 (the native checkbox is gone); GF8 holds (`ChoiceCard` is the label). No FMG comment names this file.
- [ ] **Step 5: Verify.** `node --test tests/audit-pages-sweep-ui.test.ts tests/audit-round-form-ui.test.ts tests/audit-component-round-routes.test.ts tests/form-frames-ui.test.ts tests/html-lang-and-years.test.ts tests/list-frame-guards.test.ts tests/form-migration-guards.test.ts`; `npm test` (+1: 2129 tests, 2128 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2127 / 2126); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.**

```
git add src/components/audit/audit-round-form.tsx tests/audit-pages-sweep-ui.test.ts tests/audit-round-form-ui.test.ts tests/audit-component-round-routes.test.ts tests/list-frame-guards.test.ts
git commit -m "refactor(ui): the audit round form on the panel classes, a StatStrip preview, an info Notice and a ChoiceCard (2D-4 task 23, AP-4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 24 (AP-5): The finding review dialogs on KeyValueList and Notice, no typed dash (`src/components/audit/audit-finding-review-actions.tsx`)

Spec D7, D19, M17 (LFG LV2 3 → 0), M20. The audit mobile fix stays as it is: the `compact` branch, `RowActions` ⋯ with plan, close and the page's links, the stacked approve and reject, and the small self-review note of the table (only its `text-xs` becomes `text-meta`). The phone card's self-review box is a warning `Notice` (the fix wanted a box there). In the review dialog the summary is one quiet grouping with a `KeyValueList` (empty values show `Nil`, no typed "-"), the impact is a `Notice` by meaning (approve changes the asset record: `warning`; reject changes nothing: `neutral`), and the conflict is a warning `Notice` with `role="alert"` (the 409 that stopped the decision; no toast says it) followed by a `KeyValueList` of its two dates (faint labels never sit on the warning fill). `ReviewPreviewField` joins `LOCAL_KEY_VALUE`; the local date formatter gives way to `formatDateTime` (2D-3 R13). The three dialogs, their fields (`required` and `maxLength`, FMG floor [1, 3, 0]), footers, `busy`, the API calls and the toasts stay.

**Files:**
- Modify: `src/components/audit/audit-finding-review-actions.tsx` (CRLF), `tests/list-frame-guards.test.ts` (CRLF)
- Test: `tests/audit-pages-sweep-ui.test.ts` (LF), `tests/list-pages-ui.test.ts` (CRLF)

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| `:145` | compact note `<p className="flex items-start gap-1.5 text-left text-xs text-warning">` | `<p className="flex items-start gap-1.5 text-left text-meta text-warning">` (icon and text stay) | Meta; the fix's note stays (R18) |
| `:150-152` | `<div className="max-w-56 rounded-md border border-warning-border bg-warning-soft px-2 py-1 text-left text-xs font-medium text-warning">` | `<Notice tone="warning">{reviewBlockedReason ?? t("segregationReviewBlocked")}</Notice>` | D7 (R3) |
| `:269-276` | `rounded-lg border border-border bg-background p-4` with the asset label and three `ReviewPreviewField` boxes (`\|\| "-"` ×2) | `<div className="rounded-md border border-border bg-background p-4">`: the `text-sm font-semibold text-foreground` asset label, then `<KeyValueList className="mt-3" items={[{ key: "findingType", label: t("findingType"), value: findingTypeLabel }, { key: "systemValue", label: t("systemValue"), value: expectedValue }, { key: "foundValue", label: t("foundValue"), value: actualValue ? <span className="font-semibold">{actualValue}</span> : null }]} />` | quiet grouping, KeyValueList, LV2 −2 |
| `:278-281` | ``rounded-lg border p-4 text-sm ${approve ? warning box : danger box}`` with title and help | `<Notice tone={action === "approve" ? "warning" : "neutral"} title={t(`reviewDecisionImpactTitle_${action}`)}>{t(`reviewDecisionHelp_${action}`)}</Notice>` | D7 |
| `:283-295` | warning box with an `AlertTriangle` title row, help and two `ReviewPreviewField` dates | `<>` `<Notice tone="warning" role="alert" title={t("reviewConflictTitle")}>{t("reviewConflictHelp")}</Notice>` `<KeyValueList items={[{ key: "findingReportedAt", label: t("reviewConflictFindingAt"), value: conflict.findingReportedAt ? formatDateTime(conflict.findingReportedAt) : null }, { key: "assetUpdatedAt", label: t("reviewConflictAssetUpdatedAt"), value: conflict.assetUpdatedAt ? formatDateTime(conflict.assetUpdatedAt) : null }]} />` `</>` | D7, role at the call site |
| `:312-319` | `function ReviewPreviewField` (`text-xs` label, `\|\| "-"`) | delete | D19, LV2 −1 |
| `:321-332` | `function formatClientDateTime` (returns "-" ×2) | delete; the conflict dates use `formatDateTime` from `@/lib/utils`. Unlike the old helper, `formatDateTime` does not catch an unparseable date (it prints "Invalid Date" where the helper printed "-"); the API sends only valid ISO strings, so nothing visible changes | 2D-3 R13 |
| `:524-526` | `<div className="rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">` closure evidence count | `<p className="text-sm text-muted-foreground">{t("closureEvidenceCount", { count: uploadedCount })}</p>` | no box for one line |
| imports | — | add `KeyValueList`, `Notice`, `import { formatDateTime } from "@/lib/utils"`; `AlertTriangle` stays (the compact note) | — |

- [ ] **Step 1: The failing test.** Append to `tests/audit-pages-sweep-ui.test.ts`:

```ts

test("finding review actions: a warning Notice on the phone card, KeyValueLists with Nil in the dialog, the impact and the conflict as Notices by meaning, no typed dash (spec 2D D7, D19, LV2)", () => {
  const source = read(`${C}audit/audit-finding-review-actions.tsx`)
  assert.match(source, /<Notice tone="warning">\{reviewBlockedReason \?\? t\("segregationReviewBlocked"\)\}<\/Notice>/)
  assert.match(source, /<p className="flex items-start gap-1\.5 text-left text-meta text-warning">/, "the table keeps the small note of the audit mobile fix")
  assert.match(source, /<div className="rounded-md border border-border bg-background p-4">/)
  assert.equal(source.match(/<KeyValueList\b/g)?.length, 2, "the finding summary and the conflict dates")
  assert.match(source, /\{ key: "systemValue", label: t\("systemValue"\), value: expectedValue \}/)
  assert.match(source, /<Notice tone=\{action === "approve" \? "warning" : "neutral"\} title=\{t\(`reviewDecisionImpactTitle_\$\{action\}`\)\}>/)
  assert.match(source, /<Notice tone="warning" role="alert" title=\{t\("reviewConflictTitle"\)\}>\{t\("reviewConflictHelp"\)\}<\/Notice>/)
  assert.match(source, /value: conflict\.findingReportedAt \? formatDateTime\(conflict\.findingReportedAt\) : null/)
  assert.match(source, /<p className="text-sm text-muted-foreground">\{t\("closureEvidenceCount", \{ count: uploadedCount \}\)\}<\/p>/)
  assert.doesNotMatch(source, /"-"|function (?:ReviewPreviewField|formatClientDateTime)\b|rounded-lg|border-warning-border|border-danger-border|bg-danger-soft|\btext-xs\b/)
})
```

  Edit the existing pins in `tests/list-pages-ui.test.ts` (test "the finding row triggers are Button sm: approve outline, reject danger, busy while the decision saves, no click through to the row; the dialogs stay (spec 2B §5.4, O21)"):
  - `:269` old: `  assert.match(source, /<p className="flex items-start gap-1\.5 text-left text-xs text-warning">\n\s+<AlertTriangle aria-hidden="true" className="mt-0\.5 size-3\.5 shrink-0" \/>\n\s+<span>\{reviewBlockedReason \?\? t\("segregationReviewBlocked"\)\}<\/span>/)`
  - `:269` new: `  assert.match(source, /<p className="flex items-start gap-1\.5 text-left text-meta text-warning">\n\s+<AlertTriangle aria-hidden="true" className="mt-0\.5 size-3\.5 shrink-0" \/>\n\s+<span>\{reviewBlockedReason \?\? t\("segregationReviewBlocked"\)\}<\/span>/)`
  - `:283` old: `  assert.match(source, /<div className="max-w-56 rounded-md border border-warning-border bg-warning-soft px-2 py-1 text-left text-xs font-medium text-warning">/, "the phone cards keep the box")`
  - `:283` new: `  assert.match(source, /<Notice tone="warning">\{reviewBlockedReason \?\? t\("segregationReviewBlocked"\)\}<\/Notice>/, "the phone cards keep the box: a warning Notice since plan 2D-4")`

- [ ] **Step 2: Watch it fail.** `node --test tests/audit-pages-sweep-ui.test.ts tests/list-pages-ui.test.ts` → fail: "finding review actions: a warning Notice on the phone card, KeyValueLists with Nil in the dialog, the impact and the conflict as Notices by meaning, no typed dash (spec 2D D7, D19, LV2)" and "the finding row triggers are Button sm: approve outline, reject danger, busy while the decision saves, no click through to the row; the dialogs stay (spec 2B §5.4, O21)".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows** (`tests/list-frame-guards.test.ts`; find each row by its text).
  - LFG LV2 for the file is 3 at `45c1409` (`:273`, `:274`, `:316`) and 0 after; the row goes from both tables (L9, L10):
    - `BUDGETS.LV2`: delete the two lines `    // 2B-2` and ``    [`${C}audit/audit-finding-review-actions.tsx`]: 3, // → 3 (KEEP): review dialog (2D)`` (that `// 2B-2` line is the one directly above this row; it has no other row; the `// 2B-2` lines of LB1 and LS1 stay).
    - `KEEP.LV2`: delete ``    [`${C}audit/audit-finding-review-actions.tsx`]: 3, // review dialog (2D)``.
    - LV2 goes 35 → 32.
  - `ReviewPreviewField` joins `LOCAL_KEY_VALUE` (LK1 stays 0): insert directly above the line `const LOCAL_KEY_VALUE = …` (below the Task 6 comment line) `// Plan 2D-4 Task 24 (AP-5): ReviewPreviewField (the finding review dialog).`, and in the `const` line replace `|DocumentFact|ReadOnly)\b/g` with `|DocumentFact|ReadOnly|ReviewPreviewField)\b/g`.
  - FMG `CONSTRAINT_FLOORS` [1, 3, 0] still holds; GD2, GD3 and GD6 hold (the footers are unchanged).
- [ ] **Step 5: Verify.** `node --test tests/audit-pages-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/form-migration-guards.test.ts tests/audit-finding-resolution.test.ts tests/ui-overlay-guards.test.ts`; `npm test` (+1: 2130 tests, 2129 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2128 / 2127); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.**

```
git add src/components/audit/audit-finding-review-actions.tsx tests/audit-pages-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "refactor(ui): the finding review dialogs on KeyValueList and Notice, and the phone card's self-review note a warning Notice; no typed dash left (2D-4 task 24, AP-5)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 25 (AP-6): The findings batch panel on ContentPanel and ChoiceCard (`src/components/audit/audit-findings-batch-actions.tsx`)

Spec D9, M25. The hand-written section becomes a `ContentPanel` (title, help, the three buttons as its actions; its `mb-4` goes, the page root spaces it), the selection list keeps its quiet grouping, and each hand-written checkbox card (a frame in the grouping, `hover:bg-accent`) becomes a `ChoiceCard` with the detail as its description (the chosen card turns `primary-soft`). The buttons, `busy` and `disabled`, the `ConfirmTextDialog` and the API calls stay.

**Files:**
- Modify: `src/components/audit/audit-findings-batch-actions.tsx` (CRLF)
- Test: `tests/audit-pages-sweep-ui.test.ts` (LF), `tests/list-pages-ui.test.ts` (CRLF)

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| `:71-77`, `:100-101`, `:123` | `<section className="mb-4 rounded-lg border border-border bg-surface p-4">` with a hand-written head and `<div className="flex min-w-0 flex-col gap-2 md:flex-row md:flex-wrap">` around the buttons | `<ContentPanel title={t("batchReview")} description={t("batchReviewHelp")} actions={<>…the three Buttons unchanged…</>}>` | D9 |
| `:102` | `mt-3 rounded-md border border-border bg-background p-3` | `rounded-md border border-border bg-background p-3` (the panel head brings the gap) | quiet grouping |
| `:108-119` | `<label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-surface p-3 text-sm hover:bg-accent">` with a native checkbox and two spans (`text-xs` detail) | `<ChoiceCard key={finding.id} type="checkbox" label={finding.label} description={finding.detail} checked={selectedSet.has(finding.id)} onChange={() => toggleFinding(finding.id)} />` | 2C ChoiceCard |
| imports | `checkboxVariants`, `cn` | remove both; add `ChoiceCard`, `ContentPanel` | — |

- [ ] **Step 1: The failing test.** Append to `tests/audit-pages-sweep-ui.test.ts`:

```ts

test("findings batch panel: a ContentPanel, the pending findings as checkbox ChoiceCards in a quiet grouping (spec 2D D9, M25)", () => {
  const source = read(`${C}audit/audit-findings-batch-actions.tsx`)
  assert.match(source, /<ContentPanel\s+title=\{t\("batchReview"\)\}\s+description=\{t\("batchReviewHelp"\)\}\s+actions=\{/)
  assert.match(source, /<div className="rounded-md border border-border bg-background p-3">/)
  assert.match(source, /<ChoiceCard\s+key=\{finding\.id\}\s+type="checkbox"\s+label=\{finding\.label\}\s+description=\{finding\.detail\}/)
  assert.doesNotMatch(source, /<section\b|<label\b|<input\b|checkboxVariants|hover:bg-accent|rounded-lg|\bmb-4\b|\btext-xs\b/)
})
```

  Edit the existing pins in `tests/list-pages-ui.test.ts` (test "the findings batch panel: shared checkboxes, Button with busy, approve in the primary color and reject as danger (spec 2B R-c, §8.6 row 8)"):
  - `:247` old: `  assert.match(source, /className=\{cn\(checkboxVariants\(\), "mt-0\.5"\)\}/)`
  - `:247` new: `  assert.match(source, /<ChoiceCard\s+key=\{finding\.id\}\s+type="checkbox"\s+label=\{finding\.label\}\s+description=\{finding\.detail\}\s+checked=\{selectedSet\.has\(finding\.id\)\}\s+onChange=\{\(\) => toggleFinding\(finding\.id\)\}/)`
  - `:248` old: `  assert.match(source, /<div className="flex min-w-0 flex-col gap-2 md:flex-row md:flex-wrap">\n\s+<Button variant="outline" size="md" onClick=\{toggleAll\}>/)`
  - `:248` new: `  assert.match(source, /actions=\{\s*<>\s*<Button variant="outline" size="md" onClick=\{toggleAll\}>/)`

- [ ] **Step 2: Watch it fail.** `node --test tests/audit-pages-sweep-ui.test.ts tests/list-pages-ui.test.ts` → fail: "findings batch panel: a ContentPanel, the pending findings as checkbox ChoiceCards in a quiet grouping (spec 2D D9, M25)" and "the findings batch panel: shared checkboxes, Button with busy, approve in the primary color and reject as danger (spec 2B R-c, §8.6 row 8)".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** None (no row; GF2 counts no checkbox; GF8 holds).
- [ ] **Step 5: Verify.** `node --test tests/audit-pages-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/confirm-text-dialog-ui.test.ts tests/form-migration-guards.test.ts`; `npm test` (+1: 2131 tests, 2130 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2129 / 2128); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.**

```
git add src/components/audit/audit-findings-batch-actions.tsx tests/audit-pages-sweep-ui.test.ts tests/list-pages-ui.test.ts
git commit -m "refactor(ui): the findings batch panel on ContentPanel, with ChoiceCard checkboxes (2D-4 task 25, AP-6)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 26 (AP-7): The findings page (`src/app/[locale]/(dashboard)/audit/findings/page.tsx`)

Spec D9, D19, M22, M29, M33; 2D-3 R4 (a list frame is `cn(getPanelClasses(), "overflow-hidden")`, the precedent of `asset-register-table.tsx:458` and `supplier-list-view.tsx:103`). The audit mobile fix D8 stays: 8 columns, `layout="fixed"`, `minWidth={960}`, the `<colgroup>` widths, the sticky actions column, `FindingValueChange`, `FindingStatusBadges` and the compact review actions. What remains is swept: the list frame takes the panel classes; the three local badge wrappers give way to direct `StatusBadge` calls with the same tones; the phone card's comparison box goes into the card's `KeyValueList` (after the finding type), so `FindingComparison` joins `LOCAL_KEY_VALUE`; the phone card's evidence loses its info box and its files become text links; the table's round link and the evidence links are `linkVariants`; every `text-xs` sub-line is `text-meta`; the phone card's title shows the asset tag as `tag`. Data, counts, filters, pages, the batch panel and every link target stay.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/audit/findings/page.tsx` (CRLF), `tests/list-frame-guards.test.ts` (CRLF)
- Test: `tests/audit-pages-sweep-ui.test.ts` (LF), `tests/list-pages-ui.test.ts` (CRLF), `tests/audit-finding-resolution.test.ts` (CRLF)

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| `:323` | `<div className="overflow-hidden rounded-lg border border-border bg-surface">` | `<div className={cn(getPanelClasses(), "overflow-hidden")}>` | D9, R4 |
| `:346` | `<div className="font-semibold text-foreground">{assetLabel}</div>` | same div; children: `finding.asset ? <><span className="tag font-medium">{finding.asset.assetTag}</span> - {finding.asset.name}</> : <span className="tag font-medium">{finding.auditRound.auditNo}</span>` (`assetLabel` stays for the dialogs and ⋯) | M33, R8 |
| `:347` | `mt-1 text-xs text-muted-foreground` | `mt-1 text-meta text-muted-foreground` | Meta |
| `:349` | `<ResolutionStateBadge state={resolutionState} labels={resolutionStateLabels} />` | `<StatusBadge label={resolutionStateLabels[resolutionState]} tone={RESOLUTION_STATE_TONES[resolutionState]} />` | M22 |
| `:352-353` | `<ReviewStatusBadge …>`, `<ActionStatusBadge …>` | `<StatusBadge label={t(`status_${finding.reviewStatus}`)} status={finding.reviewStatus} />`, `<StatusBadge label={t(`actionStatus_${finding.actionStatus}`)} status={finding.actionStatus} />` | M22 |
| `:355-368` | `KeyValueList` of round, type, owner, due date | the same list with two items after `findingType`: `{ key: "systemValue", label: t("systemValue"), value: expectedValue }` and `{ key: "foundValue", label: t("foundValue"), value: actualValue ? <span className="font-medium">{actualValue}</span> : null }` | D19, Nil |
| `:369-384` | `<div className="mt-3 grid gap-2 text-sm">` with `<FindingComparison …>` and `<AuditFindingEvidenceList …>` | only `<AuditFindingEvidenceList …>` (the wrapper goes; the list brings its own `mt-3`) | no box in a box |
| `:484` | `<Link … className="text-primary hover:underline">` (the round code in the table) | `className={linkVariants({ size: "inherit" })}` (the table shows from `md`, so no 44px box) | M29 |
| `:487`, `:493` | `text-xs text-muted-foreground` sub-lines | `text-meta text-muted-foreground` | Meta |
| `:520` | `mt-0.5 text-xs` | `mt-0.5 text-meta` | Meta |
| `:604-627` | `function FindingComparison` (a `rounded-md border` box, `text-xs` labels) | delete | D19 |
| `:667` | compact wrapper `mt-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground` | `mt-1 flex min-w-0 items-center gap-1 text-meta text-muted-foreground` | Meta |
| `:677` | compact link `flex min-w-0 items-center gap-1 text-primary hover:underline` | `className={cn(linkVariants(), "flex min-w-0 items-center gap-1")}` (the `·`, the icon and the truncated name stay) | M29 |
| `:689-714` | `mt-2 rounded-md border border-info-border bg-info-soft p-3`, `text-xs` title and count, file rows `flex min-h-11 … rounded-md border border-border bg-background px-3 py-2 text-xs … hover:border-primary-border hover:bg-accent` with a `text-info` icon | root `<div className="mt-3 min-w-0">`; a head row `flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1` with the title `text-meta font-medium text-foreground` and the count `text-meta text-muted-foreground`; `<ul className="mt-1 grid">` of `<li className="min-w-0">`, each `<a>` (same `href`, `target`, `rel`, `aria-label`) with `className={cn(linkVariants({ size: "inherit" }), "flex min-h-11 min-w-0 items-center gap-2")}`, `<FileText aria-hidden="true" className="size-4 shrink-0" />`, then a `<span className="min-w-0 flex-1">` holding the name `block truncate` and the size · date line `mt-0.5 block truncate text-meta font-normal text-muted-foreground`, so the two lines stack beside the icon; the `key` moves to the `<li>` | info tokens 3 → 0, M29 |
| `:743-745`, `:788-794` | `ResolutionStateBadge`, `ReviewStatusBadge`, `ActionStatusBadge` | delete (`RESOLUTION_STATE_TONES` and `FindingStatusBadges` stay) | M22 |
| imports | — | `linkVariants` joins the `button-variants` import; `cn` joins `formatDateTime` from `@/lib/utils`; add `import { getPanelClasses } from "@/lib/design-system"` | — |

- [ ] **Step 1: The failing test.** Append to `tests/audit-pages-sweep-ui.test.ts`:

```ts

const D = "src/app/[locale]/(dashboard)/"

test("findings page: the list frame on the panel classes, StatusBadge without local wrappers, the phone card's values in its KeyValueList, the evidence as text links without the info box, text-meta sub-lines and the audit mobile fix kept (spec 2D D9, D19, M22, M29, M33)", () => {
  const source = read(`${D}audit/findings/page.tsx`)
  assert.match(source, /<div className=\{cn\(getPanelClasses\(\), "overflow-hidden"\)\}>/)
  assert.match(source, /<StatusBadge label=\{resolutionStateLabels\[resolutionState\]\} tone=\{RESOLUTION_STATE_TONES\[resolutionState\]\} \/>/)
  assert.match(source, /<StatusBadge label=\{t\(`status_\$\{finding\.reviewStatus\}`\)\} status=\{finding\.reviewStatus\} \/>/)
  assert.match(source, /<StatusBadge label=\{t\(`actionStatus_\$\{finding\.actionStatus\}`\)\} status=\{finding\.actionStatus\} \/>/)
  assert.match(source, /\{ key: "systemValue", label: t\("systemValue"\), value: expectedValue \}/)
  assert.match(source, /<span className="tag font-medium">\{finding\.asset\.assetTag\}<\/span> - \{finding\.asset\.name\}/)
  assert.match(source, /<Link href=\{`\/\$\{locale\}\/audit\/rounds\/\$\{finding\.auditRound\.id\}`\} className=\{linkVariants\(\{ size: "inherit" \}\)\}>/)
  assert.equal(source.match(/className=\{cn\(linkVariants\(/g)?.length, 2, "the evidence links of the table and of the phone card")
  assert.match(source, /<DataTable framed=\{false\} layout="fixed" minWidth=\{960\} /, "the audit mobile fix stays")
  assert.doesNotMatch(source, /function (?:FindingComparison|ResolutionStateBadge|ReviewStatusBadge|ActionStatusBadge)\b|info-soft|info-border|text-info|hover:underline|hover:bg-accent|text-primary|\btext-xs\b|rounded-lg border/)
})
```

  Edit the existing pins:
  - `tests/audit-finding-resolution.test.ts` `:14` (test "audit findings page exposes the findings workflow"):
    - old: `  assert.match(page, /FindingComparison/)`
    - new: `  assert.match(page, /FindingValueChange/)`
  - `tests/list-pages-ui.test.ts` (test "the findings desktop table has 8 columns with the actions pinned right (audit mobile fix D8)"):
    - `:537` old: `  assert.doesNotMatch(table, /<FindingComparison\b/, "no inner bordered box in the table (the phone cards keep it)")`
    - `:537` new: `  assert.doesNotMatch(table, /<FindingComparison\b/, "no inner bordered box in the table (plan 2D-4 moved the phone card's values into its KeyValueList)")`
    - `:558` old: `  assert.match(evidence, /if \(compact\) \{\n\s+return \(\n\s+<div className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">\n\s+<span className="shrink-0">\{labels\.count\}<\/span>/)`
    - `:558` new: `  assert.match(evidence, /if \(compact\) \{\n\s+return \(\n\s+<div className="mt-1 flex min-w-0 items-center gap-1 text-meta text-muted-foreground">\n\s+<span className="shrink-0">\{labels\.count\}<\/span>/)`
    - `:559` old: `  assert.match(evidence, /className="flex min-w-0 items-center gap-1 text-primary hover:underline"/)`
    - `:559` new: `  assert.match(evidence, /className=\{cn\(linkVariants\(\), "flex min-w-0 items-center gap-1"\)\}/)`

- [ ] **Step 2: Watch it fail.** `node --test tests/audit-pages-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/audit-finding-resolution.test.ts` → 2 failures: "findings page: the list frame on the panel classes, StatusBadge without local wrappers, the phone card's values in its KeyValueList, the evidence as text links without the info box, text-meta sub-lines and the audit mobile fix kept (spec 2D D9, D19, M22, M29, M33)" and "the findings desktop table has 8 columns with the actions pinned right (audit mobile fix D8)".
  The `audit-finding-resolution` pin edit (`FindingComparison` → `FindingValueChange`) passes before and after: `FindingValueChange` exists since the audit mobile fix, so the edit only replaces a pin that this change would break.
- [ ] **Step 3: Implement** per the Changes table. Keep the function order (`FindingValueChange`, `AuditFindingEvidenceList`, `resolveFindingState`): `list-pages-ui` slices the source between them.
- [ ] **Step 4: Guard rows.** The page has no row and stays at 0 in every LFG counter (L0). `FindingComparison` joins `LOCAL_KEY_VALUE` in `tests/list-frame-guards.test.ts`: insert directly above the line `const LOCAL_KEY_VALUE = …` (below the Task 24 comment line) `// Plan 2D-4 Task 26 (AP-7): FindingComparison (the findings phone card).`, and in the `const` line replace `|ReadOnly|ReviewPreviewField)\b/g` with `|ReadOnly|ReviewPreviewField|FindingComparison)\b/g`.
- [ ] **Step 5: Verify.** `node --test tests/audit-pages-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/audit-finding-resolution.test.ts tests/audit-item-status-labels.test.ts tests/audit-mobile-flow-completion.test.ts tests/disposal-route-structure.test.ts tests/operational-return-navigation.test.ts tests/list-frame-guards.test.ts`; `npm test` (+1: 2132 tests, 2131 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2130 / 2129); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.**

```
git add "src/app/[locale]/(dashboard)/audit/findings/page.tsx" tests/audit-pages-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/audit-finding-resolution.test.ts tests/list-frame-guards.test.ts
git commit -m "refactor(ui): the findings page on the panel classes, StatusBadge, KeyValueList and text links; the audit mobile fix stays (2D-4 task 26, AP-7)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 27 (AP-8): The audit rounds list (`src/app/[locale]/(dashboard)/audit/rounds/page.tsx`)

Spec D7, D9, D19, M21, M22, M29, M33 and the 6 info tokens of §3.4. The coverage section is a `ContentPanel` whose round count is plain `num` text in its actions; the progress bar (frameless since AP-1) and the two gap lists sit in it without frames of their own (their phone cards are quiet groupings, their links text links, their empty line an `EmptyNote` with the "nothing to do" check). The next-action cards become a `StatStrip` under a section heading (the 2D-2 dashboard precedent: no icons, no tone fills; the findings cell gets the warning foot line while findings wait), keeping the `ActionPanel` function and its name. The list frame takes the panel classes. The per-file round status pill gives way to `StatusBadge` with `status` (the tones of the round page), the ready-to-close pills to `StatusBadge` with the same three tones, the phone card facts to a `KeyValueList` (`MobileAuditField` joins `LOCAL_KEY_VALUE`), the phone card's workflow pills to outline `sm` buttons with their icons, and the scope shows its codes as `tag` and the existing "ทรัพย์สินทั้งหมด" (`auditRound.all`) instead of the typed English "All assets". Data, the view filters and their counts, pages, `returnTo` and every link target stay.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/page.tsx` (CRLF), `tests/list-frame-guards.test.ts` (CRLF)
- Test: `tests/audit-pages-sweep-ui.test.ts` (LF), `tests/list-pages-ui.test.ts` (CRLF)

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| `:288-297`, `:353` | `<section className="rounded-lg border border-border bg-surface p-4">`, hand-written head, the round count in a `rounded-md border … bg-background px-3 py-2` box | `<ContentPanel title={t("coverageTitle", { year: toDisplayYear(currentYear, locale) })} description={t("coverageHelp")} actions={<p className="text-sm text-muted-foreground">{t("coverageRoundCount")}: <span className="num font-semibold text-foreground">{formatCount(currentYearRoundCount)}</span></p>}>` | D9, a count is plain `num` text |
| `:309`, `:324` | `grid gap-4 xl:grid-cols-[1fr_1.2fr]`, `grid gap-4 lg:grid-cols-2` | `gap-6` in both (the blocks lose their frames) | spacing |
| `:367` | `min-w-0 overflow-hidden rounded-lg border border-border bg-surface` | `<div className={cn(getPanelClasses(), "overflow-hidden")}>` | R4 |
| `:400` | card code link `break-words text-sm font-semibold text-foreground hover:text-primary` | `className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}` (the inner `tag font-medium` stays) | M29, R6 |
| `:406`, `:509` | `<AuditStatusBadge status={round.status} label={…} />` | `<StatusBadge label={getAuditRoundStatusLabel(round.status, t)} status={round.status} />` | M22, R2 |
| `:418-422` | three `<MobileAuditField>` in `mt-3 grid gap-2 text-sm` | `<KeyValueList className="mt-3" items={[{ key: "scope", label: t("scope"), value: formatScope(round, t("all")) }, { key: "dateRange", label: t("dateRange"), value: `${formatDate(round.startDate)} - ${formatDate(round.endDate)}` }, { key: "items", label: t("items"), value: formatCount(round._count.items) }]} />` | D19 |
| `:503` | `{formatScope(round)}` | `{formatScope(round, t("all"))}` | — |
| `:230`, `:238`, `:246`, `:82` | `icon: <… className="h-5 w-5" />` in `actionItems`, `icon: ReactNode` in `ActionPanelItem` | delete the three `icon` lines and the type field (`tone` stays) | 2D-2 dashboard precedent |
| `:574-612` | `ActionPanel`: `<section className="rounded-lg border …">` and three tinted `Link` cards (`border-success-border bg-success-soft` / warning / `primary-soft`, an icon box, `text-xs` help, `text-2xl font-bold` count) | same function and props; body `<section aria-labelledby="audit-round-next-actions-title" className="space-y-3">` with `<div><h2 id="audit-round-next-actions-title" className="text-base font-semibold text-foreground">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{help}</p></div>` and `<StatStrip items={actions.map((action) => ({ key: action.label, label: action.label, value: formatCount(action.count), href: action.href, foot: action.help, footTitle: action.help, attention: action.tone === "warning" && action.count > 0 }))} />` (the findings page's resolution section is the same shape) | StatStrip, Where Color Lives |
| `:636-662` | `RoundWorkflowLinks`: tone pills `inline-flex min-h-11 … rounded-md border px-2 text-xs` (danger / info / warning soft) | each link `className={buttonVariants({ variant: "outline", size: "sm" })}` with `{roundWorkflowIcons[link.key]}`, `<span>{link.label}</span>`, `<span className="num">{formatCount(link.count)}</span>` | M29, info tokens −4 |
| `:70-76`, `:841`, `:851`, `:861` | `tone: "warning" \| "danger" \| "info"` in `RoundWorkflowLink` and the three `tone:` lines in `buildAuditRoundWorkflowLinks` | delete (nothing reads them any more) | — |
| `:663-688` | `ReadyToCloseBadge`: three `rounded-full … text-xs` pills (success with `CheckCircle2`, warning, danger) | same function and logic; returns `<StatusBadge label={labels.ready} tone="success" />`, `<StatusBadge label={labels.pending} tone="warning" />`, `<StatusBadge label={labels.review} tone="danger" />` | M22 |
| `:690-697` | `function MobileAuditField` | delete | D19 |
| `:713-717` | `CoverageGapList` root `rounded-lg border border-border bg-surface p-3`, help `mt-1 text-xs text-muted-foreground` | root `<div className="min-w-0">` (no frame), help `mt-1 text-meta text-muted-foreground` | R4, Meta |
| `:719` | `<div className="rounded-md border border-border bg-surface px-3 py-4 text-sm text-muted-foreground">{emptyLabel}</div>` | `<EmptyNote tone="clear">{emptyLabel}</EmptyNote>` ("ปีนี้ครอบคลุมครบแล้ว": nothing to do) | M21 |
| `:724` | phone card `rounded-md border border-border bg-surface p-3` | `rounded-md border border-border bg-background p-3` | quiet grouping |
| `:727`, `:757` | `<Link href={row.href} className="text-primary hover:underline">` | `className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}` (both: the phone card and the table from `sm`, below `md`) | D19 precedent, 44px |
| `:734-738` | `mt-2 grid grid-cols-3 gap-2 text-xs` of three `<MobileAuditField>` | `<dl className="mt-2 grid grid-cols-3 gap-x-3">` with three `<div className="min-w-0"><dt className="text-meta text-faint-foreground">{label}</dt><dd className="text-sm num text-foreground">{value}</dd></div>` (missing, total, rate; values as before) | R10 (three numbers side by side) |
| `:742` | comment `No frame of its own: the gap box is the frame (no frame in a frame).` | `No frame of its own: the coverage panel is the frame (no frame in a frame).` | — |
| `:777-788` | `function AuditStatusBadge` | delete | M22 |
| `:941-953` | `formatScope(round)` returns `"CODE - name"` parts joined by " / ", or `"All assets"` | `formatScope(round, allLabel: string): ReactNode`: each part `<Fragment key={kind}><span className="tag">{code}</span> - {name}</Fragment>` (kind company, branch, location), " / " between parts, `allLabel` when the round has no scope. Build the parts as an explicit typed array, `const parts: Array<{ kind: string; code: string; name: string }> = []` filled by three `if`s (`.filter(Boolean)` does not narrow the type), return `allLabel` when it is empty, otherwise `parts.map((part, index) => <Fragment key={part.kind}>{index > 0 ? " / " : null}<span className="tag">{part.code}</span> - {part.name}</Fragment>)` | M33, R8, the typed English fallback |
| imports | `CheckCircle2`, `ClipboardCheck` | remove both; add `ContentPanel`, `KeyValueList`, `StatusBadge`; `linkVariants` joins the `button-variants` import; `getPanelClasses` joins the `design-system` import; `import { Fragment, type ReactNode } from "react"` | — |

- [ ] **Step 1: The failing test.** Append to `tests/audit-pages-sweep-ui.test.ts`:

```ts

test("audit rounds list: the coverage a ContentPanel with frameless gap lists, the next actions a StatStrip, the list frame on the panel classes, StatusBadge states, KeyValueList facts, outline sm workflow links, text links and tag scopes (spec 2D §3.4, D7, D9, D19, M21, M22, M29, M33)", () => {
  const source = read(`${D}audit/rounds/page.tsx`)
  assert.match(source, /<ContentPanel\s+title=\{t\("coverageTitle", \{ year: toDisplayYear\(currentYear, locale\) \}\)\}\s+description=\{t\("coverageHelp"\)\}/)
  assert.match(source, /\{t\("coverageRoundCount"\)\}: <span className="num font-semibold text-foreground">\{formatCount\(currentYearRoundCount\)\}<\/span>/)
  assert.match(source, /<section aria-labelledby="audit-round-next-actions-title" className="space-y-3">/)
  assert.match(source, /attention: action\.tone === "warning" && action\.count > 0/)
  assert.match(source, /<div className=\{cn\(getPanelClasses\(\), "overflow-hidden"\)\}>/)
  assert.equal(source.match(/<StatusBadge label=\{getAuditRoundStatusLabel\(round\.status, t\)\} status=\{round\.status\} \/>/g)?.length, 2, "the phone card and the table")
  for (const [label, tone] of [["ready", "success"], ["pending", "warning"], ["review", "danger"]]) {
    assert.match(source, new RegExp(`<StatusBadge label=\\{labels\\.${label}\\} tone="${tone}" \\/>`), label)
  }
  assert.match(source, /<KeyValueList\s+className="mt-3"/)
  assert.match(source, /className=\{buttonVariants\(\{ variant: "outline", size: "sm" \}\)\}/)
  assert.equal(source.match(/className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center md:min-h-0"\)\}/g)?.length, 3, "the round code of the phone card and the two gap-list links")
  assert.match(source, /<EmptyNote tone="clear">\{emptyLabel\}<\/EmptyNote>/)
  assert.match(source, /<dl className="mt-2 grid grid-cols-3 gap-x-3">/)
  assert.match(source, /formatScope\(round, t\("all"\)\)/)
  assert.match(source, /<span className="tag">\{/)
  assert.doesNotMatch(source, /function (?:AuditStatusBadge|MobileAuditField)\b|"All assets"|rounded-full|rounded-lg|\b(?:bg|border)-(?:success|warning|danger|info)-(?:soft|border)\b|\btext-info\b|hover:underline|hover:text-primary|text-2xl font-bold|\btext-xs\b|CheckCircle2|ClipboardCheck/)
})
```

  Edit the existing pin in `tests/list-pages-ui.test.ts` `:335` (test "audit rounds: PageHeader, StatStrip, the quick filters on TabNav, and the list on DataTable with RowActions and Pagination (spec 2B §5.4)"); only its message, which would turn false:
  - old: `  assert.match(source, /<DataTable framed=\{false\} className="hidden sm:block" caption=\{title\} scrollHint=\{labels\.scrollHint\}>/, "the coverage gap tables sit in their box with no second frame")`
  - new: `  assert.match(source, /<DataTable framed=\{false\} className="hidden sm:block" caption=\{title\} scrollHint=\{labels\.scrollHint\}>/, "the coverage gap tables sit in the coverage panel with no frame of their own (plan 2D-4)")`
  The `audit-rounds-ux` pins (`ActionPanel`, `ReadyToCloseBadge`, `RoundWorkflowLinks`, `QuickFilterBar`, the message keys) hold, because those functions keep their names.

- [ ] **Step 2: Watch it fail.** `node --test tests/audit-pages-sweep-ui.test.ts` → fails: "audit rounds list: the coverage a ContentPanel with frameless gap lists, the next actions a StatStrip, the list frame on the panel classes, StatusBadge states, KeyValueList facts, outline sm workflow links, text links and tag scopes (spec 2D §3.4, D7, D9, D19, M21, M22, M29, M33)". (The `list-pages-ui` edit changes a message only, so it passes before and after.)
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** The page has no row and stays at 0 (L0). `MobileAuditField` joins `LOCAL_KEY_VALUE` in `tests/list-frame-guards.test.ts`: insert directly above the line `const LOCAL_KEY_VALUE = …` (below the Task 26 comment line) `// Plan 2D-4 Task 27 (AP-8): MobileAuditField (the audit rounds phone card).`, and in the `const` line replace `|ReviewPreviewField|FindingComparison)\b/g` with `|ReviewPreviewField|FindingComparison|MobileAuditField)\b/g`.
- [ ] **Step 5: Verify.** `node --test tests/audit-pages-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/audit-rounds-ux.test.ts tests/form-frames-ui.test.ts tests/html-lang-and-years.test.ts tests/audit-round-cancellation.test.ts tests/operational-return-navigation.test.ts tests/performance-route-instrumentation.test.ts tests/list-frame-guards.test.ts`; `npm test` (+1: 2133 tests, 2132 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2131 / 2130); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.**

```
git add "src/app/[locale]/(dashboard)/audit/rounds/page.tsx" tests/audit-pages-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "refactor(ui): the audit rounds list on ContentPanel, StatStrip, StatusBadge, KeyValueList and text links; no info tint left (2D-4 task 27, AP-8)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 28 (AP-9): The audit round page (`src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx`)

Spec §3.4 (the 10 info tokens of the round page), D7, D9, M22, M29. The root keeps its O11 padding (`actionBarPagePadding.single`) and every block keeps its `mb-6` (DESIGN: this page passes `className="mb-6"` instead of `space-y-6`). The cancelled state is a `ContentPanel` (its `h2` stays) with an info `Notice` and its three facts in a `KeyValueList` (a missing date is `null`, never the "-" of `formatDateTime`); the progress bar, the result dashboard, the evidence summary and the cancel card are `ContentPanel`s; the result list head loses its frame (it is a section head, like the findings page's), its total is plain `num` text; the list frame takes the panel classes; the component lines are `Chip`s and the correction history lines info `Notice`s. The header, the `ActionBar` (its back item and LB1 row stay), the buckets, the queries, pages, `returnTo`, exports and every link target stay.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx` (CRLF), `tests/list-frame-guards.test.ts` (CRLF)
- Test: `tests/audit-pages-sweep-ui.test.ts` (LF)

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| `:501-525` | `<section className="mb-6 rounded-lg border border-danger-border bg-danger-soft p-4 text-sm text-danger">` with an icon, `h2`, the notice and a `dl` of 3 facts in danger text (`<Nil className="text-danger" />` ×2) | `<ContentPanel title={t("statusCancelled")} className="mb-6">` + `<Notice tone="info">{t("cancelledReadOnlyNotice")}</Notice>` + `<KeyValueList className="mt-4" items={[{ key: "cancelledAt", label: t("cancelledAt"), value: round.cancelledAt ? formatDateTime(round.cancelledAt) : null }, { key: "cancelledBy", label: t("cancelledBy"), value: cancelledByDisplayName }, { key: "cancelReason", label: t("cancelReason"), value: round.cancelReason }]} />` | D7 info (R3), Nil |
| `:537-552` | `<div className="mb-6"><AuditProgressBar …/></div>` | `<ContentPanel className="mb-6"><AuditProgressBar …/></ContentPanel>` (AP-1 took the bar's own frame) | D9 |
| `:554-558`, `:569` | `<section className="mb-6 rounded-lg border border-border bg-surface p-4">` + hand-written head (result dashboard) | `<ContentPanel title={t("resultDashboard")} description={t("resultDashboardHelp")} className="mb-6">`; the inner grid, `h3`s and `StatStrip`s stay | D9 |
| `:571-575`, `:584` | the same for the evidence summary | `<ContentPanel title={t("evidenceSummary")} description={t("evidenceSummaryHelp")} className="mb-6">` | D9 |
| `:593-599` | `<section className="rounded-lg border border-border bg-surface p-4 lg:min-w-72 lg:self-start">` with `h2`, `p`, `<div className="mt-4">` | `<ContentPanel title={t("cancelRound")} description={t("cancelDialogHelp")} className="lg:min-w-72 lg:self-start"><AuditRoundCancelButton …/></ContentPanel>` | D9 |
| `:604` | `mb-4 flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 lg:flex-row lg:items-start lg:justify-between` | `mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between` (a section head without a frame; the `<section id="audit-result-list" className="scroll-mt-24">` stays) | R4 |
| `:611-613` | `<span className="rounded-md border border-border bg-background px-3 py-1 text-sm text-muted-foreground">{formatCount(resultListTotal)} {t("items")}</span>` | `<span className="text-sm text-muted-foreground"><span className="num font-medium text-foreground">{formatCount(resultListTotal)}</span> {t("items")}</span>` | a count is plain `num` text |
| `:635` | `min-w-0 overflow-hidden rounded-lg border border-border bg-surface` | `<div className={cn(getPanelClasses(), "overflow-hidden")}>` | R4 |
| `:649` | card code link `break-words text-sm font-semibold text-foreground hover:text-primary` | `className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}` | M29, R6 |
| `:656-658`, `:748-750` | `<span key={line} className="rounded-full bg-info-soft px-2 py-0.5 text-xs font-medium text-info">{line}</span>` | `<Chip key={line} title={line}>{line}</Chip>` (the wrappers `mt-2 …` / `mt-1 flex flex-wrap gap-1.5` stay) | M22, 2D-2 R2 (a fact about the asset, not a state) |
| `:663-668`, `:755-760` | `mt-2 rounded-md border border-info-border bg-info-soft px-2 py-1 text-xs text-info` with one or two `<div>` lines | `<Notice tone="info" className="mt-2">` with the same two lines | D7 info |
| `:639`, `:725` | `icon={<ScanLine className="h-6 w-6" />}` | unchanged | not taken (R18) |
| `:493-496` | `ActionBar` icons `className="h-4 w-4"`, back item `<ArrowLeft …>` `:496` | unchanged (pinned by `list-pages-ui` `:361`; LB1 permanent) | — |
| imports | — | add `Chip`, `ContentPanel`, `Notice` (three new lines); `linkVariants` joins the `button-variants` import; `cn` joins `formatDate, formatDateTime` from `@/lib/utils`; `getPanelClasses` joins the `design-system` import | — |

- [ ] **Step 1: The failing test.** Append to `tests/audit-pages-sweep-ui.test.ts`:

```ts

test("audit round page: ContentPanels, the cancelled state as an info Notice with its facts in a KeyValueList, the result list head without a frame, the list frame on the panel classes, Chips and info Notices instead of the info tint (spec 2D §3.4, D7, D9, M22, M29)", () => {
  const source = read(`${D}audit/rounds/[id]/page.tsx`)
  assert.match(source, /<ContentPanel title=\{t\("statusCancelled"\)\} className="mb-6">\s*<Notice tone="info">\{t\("cancelledReadOnlyNotice"\)\}<\/Notice>/)
  assert.match(source, /value: round\.cancelledAt \? formatDateTime\(round\.cancelledAt\) : null/)
  assert.match(source, /<ContentPanel className="mb-6">\s*<AuditProgressBar/)
  for (const key of ["resultDashboard", "evidenceSummary", "cancelRound"]) {
    assert.match(source, new RegExp(`<ContentPanel title=\\{t\\("${key}"\\)\\}`), key)
  }
  assert.match(source, /<span className="num font-medium text-foreground">\{formatCount\(resultListTotal\)\}<\/span> \{t\("items"\)\}/)
  assert.match(source, /<div className=\{cn\(getPanelClasses\(\), "overflow-hidden"\)\}>/)
  assert.match(source, /className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center md:min-h-0"\)\}/)
  assert.equal(source.match(/<Chip key=\{line\} title=\{line\}>\{line\}<\/Chip>/g)?.length, 2)
  assert.equal(source.match(/<Notice tone="info" className="mt-2">/g)?.length, 2)
  assert.doesNotMatch(source, /\b(?:bg|text|border)-info(?:-soft|-border)?\b|bg-danger-soft|border-danger-border|text-danger|rounded-full|rounded-lg border|hover:text-primary|\btext-xs\b/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/audit-pages-sweep-ui.test.ts` → fails: "audit round page: ContentPanels, the cancelled state as an info Notice with its facts in a KeyValueList, the result list head without a frame, the list frame on the panel classes, Chips and info Notices instead of the info tint (spec 2D §3.4, D7, D9, M22, M29)".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** LFG LB1 stays 1 for the page (the `ActionBar` back item, K23, permanent). Its line moves from `:496` to `:499` with the three new import lines (check with `grep -n "<ArrowLeft" "src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx"` and use what it prints). In `tests/list-frame-guards.test.ts` (find each row by its text):
  - `BUDGETS.LB1` old: ``    [`${D}audit/rounds/[id]/page.tsx`]: 1, // 0 → 1: 2B-2 swaps the Download icon of the bar's back item :496 for ArrowLeft``
  - new: ``    [`${D}audit/rounds/[id]/page.tsx`]: 1, // 0 → 1: 2B-2 swaps the Download icon of the bar's back item :499 for ArrowLeft``
  - `KEEP.LB1` old: ``    [`${D}audit/rounds/[id]/page.tsx`]: 1, // back item of the ActionBar :496 (2C batch 5, K23)``
  - new: ``    [`${D}audit/rounds/[id]/page.tsx`]: 1, // back item of the ActionBar :499 (2C batch 5, K23)``
  - Every other LFG counter stays 0 for the page (L0).
- [ ] **Step 5: Verify.** `node --test tests/audit-pages-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/audit-round-cancellation.test.ts tests/audit-round-result-drilldown.test.ts tests/audit-item-status-labels.test.ts tests/breadcrumbs-ui.test.ts tests/operational-return-navigation.test.ts tests/list-frame-guards.test.ts`; `npm test` (+1: 2134 tests, 2133 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2132 / 2131); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.**

```
git add "src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx" tests/audit-pages-sweep-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "refactor(ui): the audit round page on ContentPanel, Notice, Chip and the panel classes; no info tint left (2D-4 task 28, AP-9)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 29 (AP-10): The audit pending page (`src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx`)

Spec D9, D19, M29, M33. The count box is a `ContentPanel` (its room-filter clear link a text link with a 44px phone target), the list frame takes the panel classes, the phone card facts are a `KeyValueList` (`PendingInfo` joins `LOCAL_KEY_VALUE`), and the location and custodian codes show as `tag` in the table and the card, as on the round page. The query, the count, the search, the room filter, pages, `returnTo`, the row actions and the not-found buttons stay.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx` (CRLF), `tests/list-frame-guards.test.ts` (CRLF)
- Test: `tests/audit-pages-sweep-ui.test.ts` (LF)

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| `:165-175` | `<div className="rounded-lg border border-border bg-surface p-3 text-sm text-muted-foreground sm:p-4">` with the count and the room line | `<ContentPanel><div className="text-sm text-muted-foreground">` + the same count and room line + `</div></ContentPanel>` | D9 |
| `:170` | `<Link href={clearRoomFilterHref} className="inline-flex min-h-11 items-center text-sm text-primary hover:underline">` | `className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}` | M29 |
| `:185` | `min-w-0 overflow-hidden rounded-lg border border-border bg-surface` | `<div className={cn(getPanelClasses(), "overflow-hidden")}>` | R4 |
| `:328-332` | three `<PendingInfo>` in `mt-3 grid gap-2 text-sm` | `<KeyValueList className="mt-3" items={[{ key: "location", label: labels.expectedLocation, value: formatAuditPendingLocation(item.asset.currentLocation) }, { key: "custodian", label: labels.expectedCustodian, value: formatAuditPendingCustodian(item.asset.custodian) }, { key: "lastAudit", label: labels.lastAuditDate, value: formatAuditPendingLastAudit(item.asset.movements) }]} />` | D19 |
| `:348-355` | `function PendingInfo` (`rounded-md border … bg-surface`, `text-xs` label, `orNil`) | delete | D19 |
| `:357-359` | `formatAuditPendingLocation` returns `` `${location.code} - ${location.name}` `` | returns `<><span className="tag">{location.code}</span> - {location.name}</>` | M33, R8 |
| `:361-364` | `formatAuditPendingCustodian` returns `` `${code} - ${fullNameTh}` `` or `null` | returns `<><span className="tag">{custodian.code}</span> - {custodian.fullNameTh}</>` or `null` (its comment stays; the table's `?? <Nil />` stays) | M33 |
| imports | `orNil` | remove `orNil` (keep `Nil`); add `ContentPanel`, `KeyValueList`; `linkVariants` joins the `button-variants` import; `cn` joins `formatDateTime` from `@/lib/utils`; `getPanelClasses` joins the `design-system` import | — |

- [ ] **Step 1: The failing test.** Append to `tests/audit-pages-sweep-ui.test.ts`:

```ts

test("audit pending page: the count in a ContentPanel with a text link, the list frame on the panel classes, the phone card facts in a KeyValueList and the codes as tag (spec 2D D9, D19, M29, M33)", () => {
  const source = read(`${D}audit/rounds/[id]/pending/page.tsx`)
  assert.match(source, /<ContentPanel>\s*<div className="text-sm text-muted-foreground">\s*\{t\("pendingCount", \{ count: formatCount\(total\) \}\)\}/)
  assert.match(source, /<Link href=\{clearRoomFilterHref\} className=\{cn\(linkVariants\(\), "inline-flex min-h-11 items-center md:min-h-0"\)\}>/)
  assert.match(source, /<div className=\{cn\(getPanelClasses\(\), "overflow-hidden"\)\}>/)
  assert.match(source, /<KeyValueList\s+className="mt-3"/)
  assert.match(source, /<span className="tag">\{location\.code\}<\/span> - \{location\.name\}/)
  assert.match(source, /<span className="tag">\{custodian\.code\}<\/span> - \{custodian\.fullNameTh\}/)
  assert.doesNotMatch(source, /function PendingInfo\b|rounded-lg border|hover:underline|text-primary|\btext-xs\b|\borNil\b/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/audit-pages-sweep-ui.test.ts` → fails: "audit pending page: the count in a ContentPanel with a text link, the list frame on the panel classes, the phone card facts in a KeyValueList and the codes as tag (spec 2D D9, D19, M29, M33)".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** The page has no row and stays at 0 (L0). `PendingInfo` joins `LOCAL_KEY_VALUE` in `tests/list-frame-guards.test.ts`: insert directly above the line `const LOCAL_KEY_VALUE = …` (below the Task 27 comment line) `// Plan 2D-4 Task 29 (AP-10): PendingInfo (the audit pending phone card).`, and in the `const` line replace `|FindingComparison|MobileAuditField)\b/g` with `|FindingComparison|MobileAuditField|PendingInfo)\b/g`.
- [ ] **Step 5: Verify.** `node --test tests/audit-pages-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/audit-pending-mobile-ux.test.ts tests/audit-scan-result-semantics.test.ts tests/operational-return-navigation.test.ts tests/list-frame-guards.test.ts`; `npm test` (+1: 2135 tests, 2134 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2133 / 2132); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.**

```
git add "src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx" tests/audit-pages-sweep-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "refactor(ui): the audit pending page on ContentPanel, the panel classes, KeyValueList and tag codes (2D-4 task 29, AP-10)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Area DS: disposal (Tasks 30–43)

Spec §3.4 (the bulk dialogs M26, the stepper M28, the print page D10 / M24). Every file of the area is CRLF; no file has `font-mono`, `uppercase`, a raw palette color or `toLocaleString`. Task 30 creates `tests/disposal-sweep-ui.test.ts`; Tasks 31–43 append to it. `formatCurrency` stays in `src/lib/utils.ts` until Task 51.

### Task 30 (DS-1): The disposal stepper panel (`src/components/disposal/disposal-workflow-stepper.tsx`)

Spec M28 (`:51`), D9. The hand-written panel of the request page's stepper becomes the plain `ContentPanel` (the same frame and `p-4 sm:p-5`). The stage row and the shared `Steps` rail stay as they are (K28 kept only the panel for 2D). This task creates the area test file.

**Files:**
- Modify: `src/components/disposal/disposal-workflow-stepper.tsx` (CRLF)
- Create: `tests/disposal-sweep-ui.test.ts` (LF)

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| `:1` | imports | add `import { ContentPanel } from "@/components/ui/content-panel"` first | — |
| `:37-38` | comment "…stay the panel's first row (the panel itself waits for 2D, K28)…" | "The shared panel (spec 2D D9, K28): the stage and its owner are its first row, then the shared rail, which names its list, reads each step's state and shows "ขั้นที่ x จาก 3" on phones." over two `//` lines, the first ending "which names its" | — |
| `:51` | `<section className="rounded-lg border border-border bg-surface p-4 sm:p-5">` | `<ContentPanel>` | D9, M28 |
| `:57` | `</section>` | `</ContentPanel>` | — |

- [ ] **Step 1: The failing test.** Create `tests/disposal-sweep-ui.test.ts` (LF):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-4 (spec 2D §3.4, D7, D9, D10, D19, M17, M21, M22, M24, M25, M26, M28, M29, M33): the disposal screens on the
// shared parts. Panels are ContentPanel (or getPanelClasses where the element cannot be one), messages Notice by meaning,
// numbers StatStrip, label and value pairs KeyValueList, states StatusBadge, names the shared Chip, empty states
// EmptyNote, codes tag, empty values Nil, money formatMoney. Each test pins one file and fails before that commit.
// Sources are read with LF line endings, so the regexes may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/"

test("disposal stepper: the stage row and the steps sit in a ContentPanel (spec 2D D9, M28)", () => {
  const source = read(`${C}disposal/disposal-workflow-stepper.tsx`)
  assert.match(source, /^import \{ ContentPanel \} from "@\/components\/ui\/content-panel"$/m)
  assert.match(source, /<ContentPanel>\n\s+<div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">/)
  assert.match(source, /<Steps className="mt-4" label=\{stepsLabel\} steps=\{steps\} \/>\n\s+<\/ContentPanel>/)
  assert.doesNotMatch(source, /<section\b|rounded-lg border|waits for 2D/)
})
```

No existing assertion pins the changed markup (`steps-ui` pins the `Steps` line, which stays).

- [ ] **Step 2: Watch it fail.** `node --test tests/disposal-sweep-ui.test.ts` → 1 failure: "disposal stepper: the stage row and the steps sit in a ContentPanel (spec 2D D9, M28)".
- [ ] **Step 3: Implement** per the table.
- [ ] **Step 4: Guard rows.** None (FMG lists the file in batch "5" with no row; no LFG or VFG row).
- [ ] **Step 5: Verify.** `node --test tests/disposal-sweep-ui.test.ts tests/steps-ui.test.ts tests/disposal-detail-workspace.test.ts tests/form-migration-guards.test.ts`; `npm test` (+1: 2136 tests, 2135 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2134 / 2133); `npx tsc --noEmit`; `npm run lint` (0 errors, no new warning in `src/` or `tests/`).
- [ ] **Step 6: Commit.**

```
git add src/components/disposal/disposal-workflow-stepper.tsx tests/disposal-sweep-ui.test.ts
git commit -m "refactor(ui): the disposal stepper in a ContentPanel (2D-4 task 30, DS-1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 31 (DS-2): Disposal evidence (`src/components/disposal/disposal-attachments.tsx`)

Spec D9, M21, M29, DESIGN.md :260 (the info icon). The evidence panel (request page aside, batch page aside) becomes `ContentPanel` with the title as its `h2` (the 20px `text-lg` heading and its primary icon go); the dashed empty box is `EmptyNote`; the file cards stay quiet groupings; the download link and the delete button are the shared button parts (`h-8` → `sm` / `icon-sm`); delete is `Button busy` (no `disabled:opacity`, no hand spinner). Upload, delete confirm, toasts and `canManage` gates stay.

**Files:** Modify `src/components/disposal/disposal-attachments.tsx` (CRLF). Test: `tests/disposal-sweep-ui.test.ts` (LF).

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| `:6` | `import { Download, FileText, Image as ImageIcon, Loader2, Trash2 } from "lucide-react"` | drop `Loader2` | — |
| `:8-11` | imports | add `Button` (`@/components/ui/button`), `buttonVariants` (`@/components/ui/button-variants`), `ContentPanel`, `EmptyNote`, `cn` (`@/lib/utils`) | — |
| `:79-83` | `<section className="rounded-lg … p-4 sm:p-6">` + `<h2 className="mb-4 flex … text-lg …"><FileText className="h-5 w-5 text-primary" />{title ?? t("requestEvidence")}</h2>` | `<ContentPanel title={title ?? t("requestEvidence")}>` (icon and `h2` go) | D9 |
| `:99` | `<div className="rounded-md border border-dashed … p-6 text-center …">{tCommon("noData")}</div>` | `<EmptyNote>{tCommon("noData")}</EmptyNote>` | M21 |
| `:103` | card `rounded-md border border-border bg-background p-3` | stays (quiet grouping) | R4 |
| `:109` | `<ImageIcon className="mt-0.5 h-4 w-4 text-info" />` / `<FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />` | both `aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground"` | DESIGN :260 |
| `:112` | `mt-1 text-xs text-muted-foreground` | `mt-1 text-meta text-muted-foreground` | text-xs |
| `:116-119` | `<a href={…} className="inline-flex min-h-11 flex-1 … rounded-md border … text-xs … hover:bg-accent sm:h-8 sm:min-h-0">` + `<Download className="h-3.5 w-3.5" />` | `<a href={`/api/attachments/${attachment.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}>` + `<Download aria-hidden="true" />` (an `/api` download stays `<a>`, 2D-1 M31) | M29 |
| `:121-123` | raw `<button … disabled={deletingId === attachment.id} className="… text-danger … disabled:opacity-50 sm:h-8 …" aria-label title>` with `Loader2`/`Trash2` | `<Button` then, one per line: `variant="danger"`, `size="icon-sm"`, `onClick={() => handleDelete(attachment.id)}`, `busy={deletingId === attachment.id}`, `aria-label={tCommon("delete")}`, `title={tCommon("delete")}` `>` `<Trash2 aria-hidden="true" />` `</Button>` (red at rest stays `danger`, K22) | M29, GB4 |
| `:130` | `</section>` | `</ContentPanel>` | — |

- [ ] **Step 1: The failing test.** Append to `tests/disposal-sweep-ui.test.ts`:

```ts

test("disposal evidence: a ContentPanel, EmptyNote, the shared download link and delete button, and no teal icon (spec 2D D9, M21, M29)", () => {
  const source = read(`${C}disposal/disposal-attachments.tsx`)
  assert.match(source, /<ContentPanel title=\{title \?\? t\("requestEvidence"\)\}>/)
  assert.match(source, /<EmptyNote>\{tCommon\("noData"\)\}<\/EmptyNote>/)
  assert.match(source, /<a href=\{`\/api\/attachments\/\$\{attachment\.id\}`\} className=\{cn\(buttonVariants\(\{ variant: "outline", size: "sm" \}\), "flex-1"\)\}>/)
  assert.match(source, /<Button\s+variant="danger"\s+size="icon-sm"\s+onClick=\{\(\) => handleDelete\(attachment\.id\)\}\s+busy=\{deletingId === attachment\.id\}\s+aria-label=\{tCommon\("delete"\)\}/)
  assert.doesNotMatch(source, /<button\b|<section\b|Loader2|disabled:opacity|border-dashed|rounded-lg border|text-lg|text-info|text-primary|hover:bg-accent|\btext-xs\b|sm:h-8/)
})
```

Existing pins that keep holding: `disposal-detail-workspace` (`canManage: boolean`, `{canManage ? (`, `<FileDropzone`, the `/api/attachments/${attachment.id}` href, `aria-label={tCommon("delete")}`), `confirm-dialog-ui` (`tCommon("deletedSuccess")`, `tone: "destructive"`).

- [ ] **Step 2: Watch it fail.** `node --test tests/disposal-sweep-ui.test.ts` → 1 failure: "disposal evidence: a ContentPanel, EmptyNote, the shared download link and delete button, and no teal icon (spec 2D D9, M21, M29)".
- [ ] **Step 3: Implement** per the table.
- [ ] **Step 4: Guard rows.** None (the file is in no guard table; FMG skips non-2C files).
- [ ] **Step 5: Verify.** `node --test tests/disposal-sweep-ui.test.ts tests/disposal-detail-workspace.test.ts tests/confirm-dialog-ui.test.ts`; `npm test` (+1: 2137 tests, 2136 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2135 / 2134); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.**

```
git add src/components/disposal/disposal-attachments.tsx tests/disposal-sweep-ui.test.ts
git commit -m "refactor(ui): disposal evidence on ContentPanel, EmptyNote and the shared buttons (2D-4 task 31, DS-2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 32 (DS-3): The disposal asset picker (`src/components/disposal/disposal-asset-picker.tsx`)

Spec M21, M29, DESIGN.md (row hover, inner dividers, FileQueueList). The two remove buttons are the shared `outline` `icon-sm` button (the look of taking a file out of `FileQueueList`: nothing saved is deleted); the chosen assets of the batch picker are one quiet list with soft lines instead of a bordered box each; the empty search result is `EmptyNote`; the 13px meta lines replace `text-xs`. The listbox options stay raw `<button role="option">` (R5) with `hover:bg-row-hover` and soft dividers. The search, the 250ms debounce, `max`, eligibility (`disabled={!option.eligible}`), the blocker line, the chosen-option `primary-soft` box and every label stay; the two remove buttons are named "เอาออกจากรายการ: <asset>" with the existing key `assetTools.removeSelectedAsset` and the asset's label (open issue 10 b, approved 2026-10-16: they were named with the no-results text).

**Files:** Modify `src/components/disposal/disposal-asset-picker.tsx` (CRLF). Test: `tests/disposal-sweep-ui.test.ts` (LF).

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| `:6-7` | imports `FieldLabel`, `Input` | add `import { Button } from "@/components/ui/button"` and `import { EmptyNote } from "@/components/ui/empty-note"` before them (the search spinner moves `:64` → `:66`) | — |
| `:20` | `const t = useTranslations("disposalPage")` | add after it: `const tAssetTools = useTranslations("assetTools")` | open issue 10 b |
| `:62` | `<span className="text-xs text-muted-foreground">{selectedCountLabel}</span>` | `text-meta text-muted-foreground` | text-xs |
| `:63` | raw `<button type="button" onClick={() => onChange([])} aria-label={emptyLabel} className="inline-flex h-10 w-10 … hover:bg-accent"><X className="h-4 w-4" /></button>` | `<Button variant="outline" size="icon-sm" onClick={() => onChange([])} aria-label={`${tAssetTools("removeSelectedAsset")}: ${selected[0].label}`}><X aria-hidden="true" /></Button>`; the `primary-soft` chosen box around it stays | M29 |
| `:64` | search spinner `Loader2 … motion-reduce:animate-none` | stays (FMG `LOADER2` 1, I27) | — |
| new line after `:65` | — | `{/* The options stay raw buttons: a listbox option with its own check box and two lines, which Button cannot hold (plan 2D-4 R5). */}` | R5 |
| `:66` | `<div className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyLabel}</div>` | `<EmptyNote className="px-3 py-4">{emptyLabel}</EmptyNote>` | M21 |
| `:66` | option `<button … className="flex min-h-11 w-full items-start gap-3 border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-accent disabled:…">` | stays raw; `border-b border-border` → `border-b border-border-soft`, `hover:bg-accent` → `hover:bg-row-hover`; the check box span, `role="option"`, `aria-selected`, `disabled={!option.eligible}` stay | R5, row hover |
| `:66` | metadata `mt-0.5 block text-xs text-muted-foreground`; blockers `mt-1 block text-xs font-medium text-danger` | `text-meta` in both (the blocker keeps its danger ink: R18) | text-xs |
| `:68` | `<div className="mt-3 max-h-56 space-y-2 overflow-y-auto">` with rows `flex min-h-11 … rounded-md border border-border px-3 py-2 text-sm` and a red raw X `<button … text-danger hover:bg-danger-soft>` | container `mt-3 max-h-56 divide-y divide-border-soft overflow-y-auto rounded-md border border-border`; rows `flex min-h-11 items-center justify-between gap-2 px-3 py-2 text-sm`; X `<Button variant="outline" size="icon-sm" onClick={() => toggle(asset)} aria-label={`${tAssetTools("removeSelectedAsset")}: ${asset.label}`}><X aria-hidden="true" /></Button>` | box in a box, M29 |

- [ ] **Step 1: The failing test.** Append:

```ts

test("disposal asset picker: shared remove buttons, one quiet list of the chosen assets, options on the row hover, EmptyNote and 13px meta lines (spec 2D M21, M29)", () => {
  const source = read(`${C}disposal/disposal-asset-picker.tsx`)
  assert.equal(source.match(/<Button variant="outline" size="icon-sm" onClick=\{\(\) => (?:onChange\(\[\]\)|toggle\(asset\))\}[^>]*><X aria-hidden="true" \/><\/Button>/g)?.length, 2, "clearing the one choice and taking an asset off the list")
  // Open issue 10 b (approved 2026-10-16): each remove button names its action and its asset, not the no-results text.
  assert.match(source, /const tAssetTools = useTranslations\("assetTools"\)/)
  assert.equal(source.match(/aria-label=\{`\$\{tAssetTools\("removeSelectedAsset"\)\}: \$\{(?:selected\[0\]|asset)\.label\}`\}/g)?.length, 2)
  assert.doesNotMatch(source, /aria-label=\{emptyLabel\}/)
  assert.match(source, /<div className="mt-3 max-h-56 divide-y divide-border-soft overflow-y-auto rounded-md border border-border">/)
  assert.match(source, /<EmptyNote className="px-3 py-4">\{emptyLabel\}<\/EmptyNote>/)
  // The options stay raw buttons: a listbox option with its own check box and two lines (plan 2D-4 R5, for 2D-5's EXEMPT list).
  assert.equal(source.match(/<button\b/g)?.length, 1)
  assert.match(source, /role="option" aria-selected=\{active\} disabled=\{!option\.eligible\} onClick=\{\(\) => toggle\(option\)\} className="[^"]*\bborder-b border-border-soft\b[^"]*\bhover:bg-row-hover\b/)
  assert.doesNotMatch(source, /hover:bg-accent|hover:bg-danger-soft|\btext-xs\b|h-10 w-10|space-y-2 overflow-y-auto|px-3 py-6 text-center/)
})
```

Existing pins that keep holding: `choice-controls-ui` (the 16px check-box class string and its three-way class, `role="option" aria-selected={active}`, the `FieldLabel` line, `<Input id={inputId}…role="combobox"`, no old 20px box), `disposal-route-structure` (`/api/disposal-assets?q=`, `disabled={!option.eligible}`, `option.blockers`). `choice-controls-ui` imports `clsx` through `src/lib/utils.ts`; it runs in the repo.

- [ ] **Step 2: Watch it fail.** `node --test tests/disposal-sweep-ui.test.ts` → 1 failure: "disposal asset picker: shared remove buttons, one quiet list of the chosen assets, options on the row hover, EmptyNote and 13px meta lines (spec 2D M21, M29)".
- [ ] **Step 3: Implement** per the table.
- [ ] **Step 4: Guard rows.** FMG `LOADER2` (comment only, the number stays 1): `[`${C}disposal/disposal-asset-picker.tsx`]: 1, // → 1: the spinner in the search field :64` → `… :66`.
- [ ] **Step 5: Verify.** `node --test tests/disposal-sweep-ui.test.ts tests/choice-controls-ui.test.ts tests/disposal-route-structure.test.ts tests/form-migration-guards.test.ts`; `npm test` (+1: 2138 tests, 2137 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2136 / 2135); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.**

```
git add src/components/disposal/disposal-asset-picker.tsx tests/disposal-sweep-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "refactor(ui): the disposal asset picker's remove buttons, rows and empty note on the shared parts (2D-4 task 32, DS-3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 33 (DS-4): The disposal request form (`src/components/disposal/disposal-request-form.tsx`)

Spec D9. The `<section>` frame around the form is the plain `ContentPanel` (`sm:p-6` → the one spacing `sm:p-5`); the `<form>` inside keeps its grid. Fields, `required`/`minLength`/`maxLength` (FMG floors `[3, 1, 1]`), the local `Select` wrapper, uploads and the submit button stay.

**Files:** Modify `src/components/disposal/disposal-request-form.tsx` (CRLF). Test: `tests/disposal-sweep-ui.test.ts` (LF).

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| `:8` | `import { Button } …` | add `import { ContentPanel } from "@/components/ui/content-panel"` after it | — |
| `:115` | `<section className="rounded-lg border border-border bg-surface p-4 sm:p-6">` | `<ContentPanel>` | D9 |
| `:116` | `<form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">` | stays | — |
| `:219` | `</section>` | `</ContentPanel>` | — |

- [ ] **Step 1: The failing test.** Append:

```ts

test("disposal request form: the form sits in a ContentPanel at the one panel spacing (spec 2D D9)", () => {
  const source = read(`${C}disposal/disposal-request-form.tsx`)
  assert.match(source, /<ContentPanel>\n\s+<form onSubmit=\{handleSubmit\} className="grid grid-cols-1 gap-5 md:grid-cols-2">/)
  assert.match(source, /<\/form>\n\s+<\/ContentPanel>/)
  assert.doesNotMatch(source, /<section\b|rounded-lg border|sm:p-6/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/disposal-sweep-ui.test.ts` → 1 failure: "disposal request form: the form sits in a ContentPanel at the one panel spacing (spec 2D D9)".
- [ ] **Step 3: Implement** per the table.
- [ ] **Step 4: Guard rows.** None (FMG floors still `[3, 1, 1]`).
- [ ] **Step 5: Verify.** `node --test tests/disposal-sweep-ui.test.ts tests/disposal-forms-ux.test.ts tests/file-evidence-ui.test.ts tests/disposal-route-structure.test.ts tests/form-migration-guards.test.ts`; `npm test` (+1: 2139 tests, 2138 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2137 / 2136); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.**

```
git add src/components/disposal/disposal-request-form.tsx tests/disposal-sweep-ui.test.ts
git commit -m "refactor(ui): the disposal request form in a ContentPanel (2D-4 task 33, DS-4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 34 (DS-5): The disposal batch form (`src/components/disposal/disposal-batch-form.tsx`)

Spec D9, D19, M17 (LFG LV2 3), M22. Both steps (review and form) are plain `ContentPanel`s; the review step's title, help and count become the panel head (the count is plain `text-count num`, 2D-2 R2, hidden from screen readers because the help sentence already says it); the review facts are one `KeyValueList` (the local `Summary` and its boxed `<dl>` go, the three typed `"-"` become `Nil`; sale and salvage values show through `formatMoney` with the unit, as the request page does); the chosen asset list is one quiet list with soft lines. The "back to editing" arrow stays (LFG KEEP.LB1). Validation (`valid`, `required minLength maxLength` on the reason, FMG floors `[1, 1, 1]`), the submit and the uploads stay.

**Files:** Modify `src/components/disposal/disposal-batch-form.tsx` (CRLF), `tests/list-frame-guards.test.ts` (CRLF). Test: `tests/disposal-sweep-ui.test.ts` (LF).

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| `:8-13`, `:19` | imports | add `ContentPanel` (after `Button`), `KeyValueList` (after `Input`), and `import { formatCount, formatMoney } from "@/lib/display-format"` after `getDisposalApiErrorMessage`; `PackageCheck` stays (the review button) | — |
| `:70-79` | `<section className="rounded-lg … p-4 sm:p-6">`, a flex head with `<h2 className="text-lg …">{t("batchReviewTitle")}</h2>`, `<p …>{t("batchReviewHelp", { count })}</p>` and the chip `rounded-md bg-primary-soft … text-primary"><PackageCheck … /> {selectedIds.length}` | `<ContentPanel` with, one per line, `title={t("batchReviewTitle")}`, `description={t("batchReviewHelp", { count: selectedIds.length })}`, `actions={<span className="text-count num text-foreground" aria-hidden="true">{formatCount(selectedIds.length)}</span>}` `>` | D9, 2D-2 R2 |
| `:80-87` | `<dl className="mt-5 grid gap-3 rounded-md border … bg-background p-4 text-sm sm:grid-cols-2">` with six `<Summary>` | `<KeyValueList items={[…]} />`, keys in order: `disposalType` (`t(`types.${values.disposalType}`)`), `requestedBy` (`employees.find((item) => item.id === values.requestedById)?.label`, no fallback), `approver` (`… ?? t("noApprover")`, stays), `saleValue` and `salvageValue` only when `showsEstimated…` as today, each `values.x ? <span className="num">{formatMoney(Number(values.x), { unit: tCommon("baht") })}</span> : null`, `reason` (`<span className="whitespace-pre-wrap">{values.reason}</span>`). The two money rows are conditional spreads in the one `items` array, one item per row: `...(showsEstimatedSaleValue(values.disposalType as DisposalType)` / `? [{ key: "saleValue", … }]` / `: []),` and the same for `showsEstimatedSalvageValue`; with this layout `<ArrowLeft` lands at `:97` | D19, LV2, D10 |
| `:82`, `:84`, `:85` | `?? "-"`, `\|\| "-"` ×2 | gone (null → `Nil`) | LV2 |
| `:88-90` | `<div className="mt-4 max-h-72 overflow-y-auto rounded-md border border-border">` with rows `border-b border-border px-3 py-2 text-sm last:border-b-0` | `mt-4 max-h-72 divide-y divide-border-soft overflow-y-auto rounded-md border border-border`; rows `px-3 py-2 text-sm` | inner dividers |
| `:91-100` | button row, `<ArrowLeft aria-hidden="true" />` at `:93` | stays (moves to `:97`, LFG KEEP.LB1) | — |
| `:101`, `:106`, `:159` | `</section>`, `<section className="rounded-lg … p-4 sm:p-6">`, `</section>` | `</ContentPanel>`, `<ContentPanel>`, `</ContentPanel>` | D9 |
| `:163` | `function Summary(…)` | delete (not added to `LOCAL_KEY_VALUE`: R10) | D19 |

- [ ] **Step 1: The failing test.** Append:

```ts

test("disposal batch form: two ContentPanels, the review facts a KeyValueList with Nil and formatMoney, a plain count and one quiet asset list (spec 2D D9, D19, M17, M22)", () => {
  const source = read(`${C}disposal/disposal-batch-form.tsx`)
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 2, "the review step and the form step")
  assert.match(source, /<ContentPanel\n\s+title=\{t\("batchReviewTitle"\)\}\n\s+description=\{t\("batchReviewHelp", \{ count: selectedIds\.length \}\)\}\n\s+actions=\{<span className="text-count num text-foreground" aria-hidden="true">\{formatCount\(selectedIds\.length\)\}<\/span>\}\n\s+>/)
  assert.equal(source.match(/<KeyValueList\b/g)?.length, 1)
  assert.match(source, /\{ key: "requestedBy", label: t\("requestedBy"\), value: employees\.find\(\(item\) => item\.id === values\.requestedById\)\?\.label \}/)
  assert.match(source, /value: values\.saleValue \? <span className="num">\{formatMoney\(Number\(values\.saleValue\), \{ unit: tCommon\("baht"\) \}\)\}<\/span> : null/)
  assert.match(source, /value: values\.salvageValue \? <span className="num">\{formatMoney\(Number\(values\.salvageValue\), \{ unit: tCommon\("baht"\) \}\)\}<\/span> : null/)
  assert.match(source, /<div className="mt-4 max-h-72 divide-y divide-border-soft overflow-y-auto rounded-md border border-border">/)
  assert.match(source, /<ArrowLeft aria-hidden="true" \/>/, "back to editing keeps its arrow (LFG KEEP.LB1)")
  assert.doesNotMatch(source, /function Summary\b|"-"|<section\b|rounded-lg border|bg-primary-soft|text-lg|\btext-xs\b|border-b border-border(?!-)/)
})
```

Existing pins that keep holding: `disposal-forms-ux` (`<FormSection number={1} …`, `reasonCharacterCount`, no `batchCreateTitle` h2), `file-evidence-ui` (`description={t("batchEvidenceHelp")}`, `<FileQueueList items={files.map(`), `disposal-route-structure` (`<DisposalAssetPicker`).

- [ ] **Step 2: Watch it fail.** `node --test tests/disposal-sweep-ui.test.ts` → 1 failure: "disposal batch form: two ContentPanels, the review facts a KeyValueList with Nil and formatMoney, a plain count and one quiet asset list (spec 2D D9, D19, M17, M22)".
- [ ] **Step 3: Implement** per the table.
- [ ] **Step 4: Guard rows** (`tests/list-frame-guards.test.ts`; live LV2 3 → 0, LB1 stays 1; find each row by its text; line numbers at `45c1409` and, in brackets, when this task runs, before its first edit):
  - BUDGETS.LB1 (`:234` [`:240`]): `[`${C}disposal/disposal-batch-form.tsx`]: 1, // → 1 (KEEP): back to editing in the review step :93 (2C)` → `… :97 (2C)`.
  - KEEP.LB1 (`:308` [`:311`]): `[`${C}disposal/disposal-batch-form.tsx`]: 1, // back to editing in the review step :93 (2C)` → `… :97 (2C)`.
  - BUDGETS.LV2 (`:269` [`:272`]): delete the line `[`${C}disposal/disposal-batch-form.tsx`]: 3, // → 3 (KEEP): 2C form (2D)`.
  - KEEP.LV2 (`:319` [`:319`]): delete the line `[`${C}disposal/disposal-batch-form.tsx`]: 3, // 2C form (2D)`.
  - LV2 goes 32 → 29 (after Tasks 6 and 24). FMG floors `[1, 1, 1]` hold.
- [ ] **Step 5: Verify.** `node --test tests/disposal-sweep-ui.test.ts tests/disposal-forms-ux.test.ts tests/file-evidence-ui.test.ts tests/disposal-route-structure.test.ts tests/list-frame-guards.test.ts tests/form-migration-guards.test.ts`; `npm test` (+1: 2140 tests, 2139 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2138 / 2137); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.**

```
git add src/components/disposal/disposal-batch-form.tsx tests/disposal-sweep-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "refactor(ui): the disposal batch form on ContentPanel and KeyValueList, Nil for its typed dashes (2D-4 task 34, DS-5)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 35 (DS-6): The rejection note of the decision dialog (`src/components/disposal/disposal-decision-button.tsx`)

Spec D7. What a rejection does ("ระบบจะคืนสถานะเดิม…") is a condition before acting: a `neutral` `Notice` in place of the grey box (no live role; it is guidance, not a result). The dialog parts, fields, `required` gates (FMG floors `[3, 1, 0]`) and the trigger handle stay.

**Files:** Modify `src/components/disposal/disposal-decision-button.tsx` (CRLF). Test: `tests/disposal-sweep-ui.test.ts` (LF).

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| `:18` | `import { NativeSelect } …` | add `import { Notice } from "@/components/ui/notice"` after it | — |
| `:200-202` | `<div className="rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">{t("rejectRestoresPreviousStatus")}</div>` | `<Notice tone="neutral">{t("rejectRestoresPreviousStatus")}</Notice>` (one line) | D7 |

- [ ] **Step 1: The failing test.** Append:

```ts

test("disposal decision dialog: what a rejection does is a neutral Notice, not a box (spec 2D D7)", () => {
  const source = read(`${C}disposal/disposal-decision-button.tsx`)
  assert.match(source, /<Notice tone="neutral">\{t\("rejectRestoresPreviousStatus"\)\}<\/Notice>/)
  assert.doesNotMatch(source, /rounded-md border border-border bg-background/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/disposal-sweep-ui.test.ts` → 1 failure: "disposal decision dialog: what a rejection does is a neutral Notice, not a box (spec 2D D7)".
- [ ] **Step 3: Implement** per the table.
- [ ] **Step 4: Guard rows.** None.
- [ ] **Step 5: Verify.** `node --test tests/disposal-sweep-ui.test.ts tests/disposal-detail-workspace.test.ts tests/dialog-trigger-handles.test.ts tests/form-migration-guards.test.ts`; `npm test` (+1: 2141 tests, 2140 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2139 / 2138); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.**

```
git add src/components/disposal/disposal-decision-button.tsx tests/disposal-sweep-ui.test.ts
git commit -m "refactor(ui): the rejection note of the disposal decision dialog is a neutral Notice (2D-4 task 35, DS-6)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 36 (DS-7): The execution dialog warnings (`src/components/disposal/disposal-execution-button.tsx`)

Spec D7. The two hand-made warning boxes are `Notice tone="warning"`: "no evidence" keeps `role="alert"` and its two-column span; the historical-exception warning keeps its `id` (the checkbox's `aria-describedby`), its `hidden` toggle and `role="alert"`. The two quiet checkbox rows, every field, `required`/`minLength`/`maxLength` (FMG floors `[8, 4, 1]`), `submitDisabled` and the reset on close stay.

**Files:** Modify `src/components/disposal/disposal-execution-button.tsx` (CRLF). Test: `tests/disposal-sweep-ui.test.ts` (LF).

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| `:6` | `import { AlertTriangle, CheckCircle2, Truck } from "lucide-react"` | `import { CheckCircle2, Truck } from "lucide-react"` | — |
| `:19` | `import { NativeSelect } …` | add `import { Notice } from "@/components/ui/notice"` after it | — |
| `:249` | `<div role="alert" className="flex gap-3 rounded-md border border-warning-border bg-warning-soft p-3 text-sm text-foreground md:col-span-2"><AlertTriangle … /><p>{t("errors.DISPOSAL_EVIDENCE_REQUIRED")}</p></div>` | `<Notice tone="warning" role="alert" className="md:col-span-2">{t("errors.DISPOSAL_EVIDENCE_REQUIRED")}</Notice>` | D7 |
| `:282` | `<div id={historicalEvidenceWarningId} hidden={!values.useHistoricalEvidenceException} role="alert" className="mt-2 flex gap-3 rounded-md border border-warning-border bg-warning-soft p-3 …"><AlertTriangle … /><p>{t("historicalEvidenceWarning")}</p></div>` | `<Notice tone="warning" id={historicalEvidenceWarningId} hidden={!values.useHistoricalEvidenceException} role="alert" className="mt-2">{t("historicalEvidenceWarning")}</Notice>` (Tailwind's preflight keeps `[hidden]` at `display: none !important` over the Notice's `grid`) | D7 |
| `:282`, `:291` | checkbox rows `rounded-md border border-border bg-background px-3` | stay (quiet groupings) | R4 |

- [ ] **Step 1: The failing test.** Append:

```ts

test("disposal execution dialog: the missing-evidence and historical warnings are warning Notices (spec 2D D7)", () => {
  const source = read(`${C}disposal/disposal-execution-button.tsx`)
  assert.match(source, /<Notice tone="warning" role="alert" className="md:col-span-2">\{t\("errors\.DISPOSAL_EVIDENCE_REQUIRED"\)\}<\/Notice>/)
  assert.match(source, /<Notice tone="warning" id=\{historicalEvidenceWarningId\} hidden=\{!values\.useHistoricalEvidenceException\} role="alert" className="mt-2">\{t\("historicalEvidenceWarning"\)\}<\/Notice>/)
  assert.doesNotMatch(source, /AlertTriangle|bg-warning-soft|border-warning-border/)
})
```

Existing pins that keep holding: `disposal-evidence-exception` "resets historical exception state…" (`aria-describedby={historicalEvidenceWarningId}`, `t("historicalEvidenceWarning")`, `minLength={20}`, `maxLength={2000}`, …), `disposal-detail-workspace` (`initialFocusRef={executionDateRef}`), `dialog-trigger-handles`.

- [ ] **Step 2: Watch it fail.** `node --test tests/disposal-sweep-ui.test.ts` → 1 failure: "disposal execution dialog: the missing-evidence and historical warnings are warning Notices (spec 2D D7)".
- [ ] **Step 3: Implement** per the table.
- [ ] **Step 4: Guard rows.** None.
- [ ] **Step 5: Verify.** `node --test tests/disposal-sweep-ui.test.ts tests/disposal-evidence-exception.test.ts tests/disposal-detail-workspace.test.ts tests/dialog-trigger-handles.test.ts tests/form-migration-guards.test.ts`; `npm test` (+1: 2142 tests, 2141 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2140 / 2139); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.**

```
git add src/components/disposal/disposal-execution-button.tsx tests/disposal-sweep-ui.test.ts
git commit -m "refactor(ui): the disposal execution warnings are warning Notices (2D-4 task 36, DS-7)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 37 (DS-8): Bulk approval (`src/components/disposal/disposal-bulk-approval.tsx`)

Spec M26 (`:565`, `:593`, `:598`, `:602`), D7, M17 (LFG LS1), M29, M33. The selection bar is the quiet grouping inset by the panel's gutter (it sits in the queue's flush panel); its error is a `danger` `Notice` under the bar whose action is the outline retry `Button` (the raw `linkVariants` `<button>` goes); the dialog's error moves to the first line of the body as `Notice tone="danger" role="alert"` (DESIGN Dialogs → Errors); "no eligible request" is the warning `Notice` the execution dialog already uses; the five counts are one `StatStrip` (`formatCount`; `BulkSummary` and `Metric` go); codes in the blocked groups and the result lists are `tag`. The provider, selection, abort and guard logic, the two status-line spinners (I27), the remark field (FMG floors `[0, 1, 0]`), the footer and the VFG `tabIndex={-1}` wrapper stay.

**Files:** Modify `src/components/disposal/disposal-bulk-approval.tsx` (CRLF), `tests/disposal-bulk-approval.test.ts` (CRLF), `tests/list-frame-guards.test.ts` (CRLF), `tests/form-migration-guards.test.ts` (CRLF). Test: `tests/disposal-sweep-ui.test.ts` (LF).

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| `:28-33` | imports | delete `import { linkVariants } …`; add `Notice` (after `checkboxVariants`), `StatStrip` (after it), and `import { formatCount } from "@/lib/display-format"` after `Textarea` | — |
| `:428-443` | `return (` one `<div className="mt-3 flex flex-col gap-3 border border-border bg-background p-3 sm:rounded-md md:flex-row …" aria-label={copy.toolbarLabel}>` holding the count, the buttons, the limit line and the error line | `return (` a fragment: the bar `<div className="mx-4 mt-3 flex flex-col gap-3 rounded-md border border-border bg-background p-3 md:mx-5 md:flex-row md:items-center md:justify-between" aria-label={copy.toolbarLabel}>` (sr-only live count and the three buttons unchanged), then after it `{error ? <Notice tone="danger" role="alert" className="mx-4 mt-3 md:mx-5" action={<Button variant="outline" size="md" onClick={() => void preview()} disabled={busy}>{copy.retry}</Button>}>{error}</Notice> : null}` | R4, D7, M29 |
| `:431` | `<CheckSquare2 className="h-4 w-4 text-primary" />` | `<CheckSquare2 aria-hidden="true" className="size-4 text-muted-foreground" />` | color |
| `:440` | `<p className="text-xs text-muted-foreground md:col-span-full">{limitMessage}</p>` | `<p className="text-meta text-muted-foreground">{limitMessage}</p>` (inside the bar) | text-xs |
| `:441` | `<div className="flex items-center gap-3 text-sm text-danger" role="alert"><span>{error}</span><button … className={linkVariants({ size: "inherit" })}>{copy.retry}</button></div>` | gone (the Notice above) | D7, M29 |
| `:498` | `${variant === "mobile" ? "px-2 text-xs" : ""}` | `${variant === "mobile" ? "px-2 text-meta" : ""}` (only `text-xs` → `text-meta`; the mobile condition stays, so desktop gets no padding) | text-xs |
| `:559` | `<AccessibleDialogBody className="space-y-5">` | first child `{error ? <Notice tone="danger" role="alert">{error}</Notice> : null}` | DESIGN Dialogs |
| `:560-561` | the two status lines with `Loader2` | stay (`:565-566`, FMG `LOADER2` 2, I27) | — |
| `:563` | `<BulkSummary … />` | `<StatStrip items={[…]} />` (props on their own lines), keys `selected`, `eligible`, `blocked`, `approved`, `failed` with `label: copy.<key>` and `value: formatCount(response.summary.<key>)` | M26, LS1 |
| `:564` | groups: `<ShieldAlert className="h-4 w-4 text-warning" />`; `<li>{item.disposalNo} - {item.assetTag}</li>` | `<ShieldAlert aria-hidden="true" className="size-4 text-warning" />`; `<li …><span className="tag">{item.disposalNo}</span> - <span className="tag">{item.assetTag}</span></li>`; the quiet `<details>` stays | M33 |
| `:565` | `<p role="alert" className="rounded-md border border-warning-border bg-warning-soft p-3 text-sm text-foreground">{copy.zeroEligible}</p>` | `<Notice tone="warning" role="alert">{copy.zeroEligible}</Notice>` | M26, D7 |
| `:576` | `{error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}` | delete (moved to the top of the body) | DESIGN Dialogs |
| `:593-600` | `function BulkSummary` and `function Metric` | delete (`DisposalBulkApprovalSummary` stays imported: the response type uses it at `:84`) | M26, LS1 |
| `:609` | `<li …>{item.disposalNo} - {item.assetTag}{item.code ? …}</li>` | `<li …><span className="tag">{item.disposalNo}</span> - <span className="tag">{item.assetTag}</span>{item.code ? …}</li>` | M26, M33 |

- [ ] **Step 1: The failing test.** Append:

```ts

test("bulk approval: the toolbar is a quiet grouping, errors and the zero case are Notices, the counts a StatStrip and codes tag (spec 2D M26, D7, M33)", () => {
  const source = read(`${C}disposal/disposal-bulk-approval.tsx`)
  assert.match(source, /<div className="mx-4 mt-3 flex flex-col gap-3 rounded-md border border-border bg-background p-3 md:mx-5 md:flex-row md:items-center md:justify-between" aria-label=\{copy\.toolbarLabel\}>/)
  assert.match(source, /\{error \? <Notice tone="danger" role="alert" className="mx-4 mt-3 md:mx-5" action=\{<Button variant="outline" size="md" onClick=\{\(\) => void preview\(\)\} disabled=\{busy\}>\{copy\.retry\}<\/Button>\}>\{error\}<\/Notice> : null\}/)
  assert.match(source, /<AccessibleDialogBody className="space-y-5">\n\s+\{error \? <Notice tone="danger" role="alert">\{error\}<\/Notice> : null\}/, "a dialog error is the first thing in its body")
  assert.match(source, /<Notice tone="warning" role="alert">\{copy\.zeroEligible\}<\/Notice>/)
  assert.equal(source.match(/value: formatCount\(response\.summary\.(?:selected|eligible|blocked|approved|failed)\) \}/g)?.length, 5)
  assert.match(source, /<StatStrip\n\s+items=\{\[/)
  assert.equal(source.match(/<span className="tag">\{item\.disposalNo\}<\/span> - <span className="tag">\{item\.assetTag\}<\/span>/g)?.length, 2, "the blocked groups and the result lists")
  assert.doesNotMatch(source, /function (?:BulkSummary|Metric)\b|<button\b|linkVariants|bg-warning-soft|text-danger|\btext-xs\b|h-4 w-4 text-primary/)
})
```

Edit two existing assertions in `tests/disposal-bulk-approval.test.ts` (CRLF, exact text):
- `:172` old: `  assert.match(list, /className=\{linkVariants\(\{ size: "inherit" \}\)\}>\{copy\.retry\}<\/button>/)`
  new: `  assert.match(list, /action=\{<Button variant="outline" size="md" onClick=\{\(\) => void preview\(\)\} disabled=\{busy\}>\{copy\.retry\}<\/Button>\}/, "retry is the danger Notice's button (plan 2D-4)")`
- `:185` old: `  const dialog = source.slice(source.indexOf("function DisposalBulkApprovalDialog"), source.indexOf("function BulkSummary"))`
  new: `  const dialog = source.slice(source.indexOf("function DisposalBulkApprovalDialog"), source.indexOf("function ResultDetails"))`

The other pins of that file (the list buttons, `checkboxVariants(` ×2, the `<Loader2 className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none" />` ×2, the remark `Field`, the footer) keep holding, as do VFG `:27`, `ui-overlay-guards` and `confirm-dialog-ui`.

- [ ] **Step 2: Watch it fail.** `node --test tests/disposal-sweep-ui.test.ts tests/disposal-bulk-approval.test.ts` → 2 failures: "bulk approval: the toolbar is a quiet grouping, errors and the zero case are Notices, the counts a StatStrip and codes tag (spec 2D M26, D7, M33)" and "bulk approval list controls use Button, busy and checkboxVariants, and leave the dialog to 2C (spec 2B §8.6 row 3)".
- [ ] **Step 3: Implement** per the table.
- [ ] **Step 4: Guard rows** (live LS1 1 → 0, `LOADER2` stays 2; find each block by its text). LFG BUDGETS.LS1 (`:276-279` at `45c1409`; `:278-281` when this task runs, after the comment lines of Tasks 6, 22–24, 26, 27 and 29 and the rows Tasks 4, 6, 24 and 34 deleted) old:

```ts
  LS1: {
    // 2B-2
    [`${C}disposal/disposal-bulk-approval.tsx`]: 1, // → 1 (KEEP): Metric :598 in the dialog (2C plan 3)
  },
```

new:

```ts
  LS1: {
  },
```

LFG KEEP.LS1 (`:332-334` at `45c1409`; `:330-332` when this task runs, before the BUDGETS edit): delete these three lines (the key goes):

```ts
  LS1: {
    [`${C}disposal/disposal-bulk-approval.tsx`]: 1, // Metric :598 in the dialog (2C plan 3)
  },
```

FMG `LOADER2` (`:294`, comment only): `// the status lines :560, :561 in the dialog body (I27)` → `// the status lines :565, :566 in the dialog body (I27)`. `Metric` stays in `LOCAL_STAT_TILE` (it was already there).
- [ ] **Step 5: Verify.** `node --test tests/disposal-sweep-ui.test.ts tests/disposal-bulk-approval.test.ts tests/ui-overlay-guards.test.ts tests/confirm-dialog-ui.test.ts tests/disposal-queue-ux.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts tests/form-migration-guards.test.ts`; `npm test` (+1: 2143 tests, 2142 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2141 / 2140); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.**

```
git add src/components/disposal/disposal-bulk-approval.tsx tests/disposal-sweep-ui.test.ts tests/disposal-bulk-approval.test.ts tests/list-frame-guards.test.ts tests/form-migration-guards.test.ts
git commit -m "refactor(ui): the bulk disposal approval toolbar, notices and counts on the shared parts (2D-4 task 37, DS-8)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 38 (DS-9): Bulk execution (`src/components/disposal/disposal-bulk-execution.tsx`)

Spec M26 (`:864`, `:1052`, `:1080`, `:1141`), D7, D19, M22, M29, M33. The selection bar is the same inset quiet grouping as DS-8, its error a `danger` `Notice` under it; the dialog's error is the first line of the body; the historical-exception warning is a warning `Notice` (keeping `id={historicalWarningId}` for both `aria-describedby`s) and the checkbox, reason field, hint and acknowledgement sit after it, off the fill, so the two `FieldHint`s drop their `text-muted-foreground` (faint is right again); the shared values and each request's values are `KeyValueList`s (`ReviewValue` goes; "ไม่ได้ระบุ" becomes `Nil` with `nilLabel: copy.notProvided`, R9); the request and result lists are quiet lists with soft lines; the five counts are one `StatStrip` (`SummaryValue` goes); each result is a `StatusBadge` from `outcomeTones` with the reason as text after it (the green/red text goes). Request and document codes are `tag`; the server-built `assetLabel` strings stay text (R8). State, abort, retry and guard logic, `BusyLabel` (I27), the shared fields (FMG floors `[5, 2, 1]`), the three native checkboxes, the footer and the VFG wrapper stay.

**Files:** Modify `src/components/disposal/disposal-bulk-execution.tsx` (CRLF), `tests/disposal-bulk-execution-ui.test.ts` (CRLF), `tests/list-frame-guards.test.ts` (CRLF), `tests/form-migration-guards.test.ts` (CRLF). Test: `tests/disposal-sweep-ui.test.ts` (LF).

**Interfaces:** none (`outcomeTones` and the deleted helpers are module-private).

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| `:51-54` | imports | add `KeyValueList` (after `Input`), `StatStrip` and `import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"` (after `Notice`), `import { formatCount } from "@/lib/display-format"` (after `Textarea`) | — |
| `:636-660` | `return (` one `<div className="mt-3 flex flex-col gap-3 border-y border-border bg-background p-3 md:flex-row …" aria-label={copy.toolbarLabel}>` with the error `<p role="alert" className="text-sm text-danger">` inside | a fragment: the bar `className="mx-4 mt-3 flex flex-col gap-3 rounded-md border border-border bg-background p-3 md:mx-5 md:flex-row md:items-center md:justify-between"` on its own line, then `aria-label={copy.toolbarLabel}`; after the bar `{error ? <Notice tone="danger" role="alert" className="mx-4 mt-3 md:mx-5">{error}</Notice> : null}` | R4, D7 |
| `:645` | `<CheckSquare2 className="h-4 w-4 text-primary" aria-hidden="true" />` | `className="size-4 text-muted-foreground"` | color |
| `:657` | `<p className="text-xs text-muted-foreground">{selectionMessage}</p>` | `text-meta` | text-xs |
| `:724` | `${variant === "mobile" ? "px-2 text-xs" : ""}` | `${variant === "mobile" ? "px-2 text-meta" : ""}` (only `text-xs` → `text-meta`; the mobile condition stays) | text-xs |
| `:831-836` | the `aria-live` div holding both `BusyLabel`s and `{error ? <p role="alert" className="font-medium text-danger">…` | first child of the body `{error ? <Notice tone="danger" role="alert">{error}</Notice> : null}`, then the `aria-live="polite" className="min-h-5 text-sm"` div with the two `BusyLabel`s only | DESIGN Dialogs |
| `:864-867` | `<section className="space-y-3 rounded-md border border-warning-border bg-warning-soft p-3">` + `<p id={historicalWarningId} className="text-sm font-medium text-foreground">{copy.historicalWarning}</p>` | `<section className="space-y-3">` + `<Notice tone="warning" id={historicalWarningId}>` / `{copy.historicalWarning}` / `</Notice>` (three lines); the label, `Field`, `FieldHint`s and acknowledgement follow unchanged | M26, D7 |
| `:891`, `:910` | `<FieldHint id={historicalHelpId} className="text-muted-foreground">` | `<FieldHint id={historicalHelpId}>` | faint off the fill |
| `:967-974` | `BusyLabel` with `Loader2` | stays (`:973`, spinner `:976`; FMG `LOADER2` 1, I27) | — |
| `:1070-1075` | `<dl className="mt-2 grid gap-3 border border-border bg-background p-3 text-sm sm:grid-cols-3">` with four `<ReviewValue>` | `<KeyValueList className="mt-2" items={[…]} />`: `executionDate` (`payload.executionDate`), `executor` (`employee`, `nilLabel: copy.notProvided`), `finalStatus` (`status`, `nilLabel: copy.notProvided`), and `...(payload.sharedRecipientName ? [{ key: "sharedRecipient", label: copy.sharedRecipient, value: payload.sharedRecipientName }] : [])` | M26, D19 |
| `:1095` | `<div className="mt-2 divide-y divide-border border border-border">` | `mt-2 divide-y divide-border-soft rounded-md border border-border` | M26 |
| `:1107` | `<h4 className="text-sm font-semibold text-foreground">{item.disposalNo}</h4>` | `<h4 className="text-sm text-foreground"><span className="tag font-medium">{item.disposalNo}</span></h4>` | M33 |
| `:1108` | `<span className="text-xs text-muted-foreground">{item.assetLabel}</span>` | `text-meta` | text-xs |
| `:1110-1120` | `<dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">` with five `<ReviewValue … ?? copy.notProvided>` | `<KeyValueList items={[…]} />`, each with `nilLabel: copy.notProvided`: `recipient` (value `recipient.recipientName ? <>{recipient.recipientName}{recipientSource ? <span className="mt-1 block text-meta text-muted-foreground">{recipientSource}</span> : null}</> : null`), `documentNo` (`item.documentNo ? <span className="tag">{item.documentNo}</span> : null`), `saleValue` (`item.saleValue`), `salvageValue` (`item.salvageValue`), `remark` (`item.executionRemark`). The source line shows only with a recipient name; that changes nothing, because `resolveDisposalExecutionRecipient` (`src/lib/disposal-execution-service.ts:360`) returns a source only together with a name and the preview fallback has no source | M26, D19, M33 |
| `:1129-1139` | `function ReviewValue` | delete; in its place `outcomeTones: Record<DisposalBulkExecutionResponse["items"][number]["outcome"], StatusTone>` = `eligible: "success"`, `executed: "primary"`, `blocked: "warning"`, `failed: "danger"` (one per line), with a two-line comment (R2; the test does not pin its words), for example `// Each outcome is a state badge (plan 2D-4 R2): eligible and executed are the good results, blocked waits on the user,` / `// failed is an error; the reason follows the badge in words.` | D19, M22 |
| `:1153-1159` | `<dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">` with five `<SummaryValue>` | `<StatStrip items={[…]} />`, keys `selected`, `eligible`, `executed`, `blocked`, `failed`, `value: formatCount(response.<key>Count)` | M26 |
| `:1160` | `<ul className="mt-3 divide-y divide-border border border-border">` | `mt-3 divide-y divide-border-soft rounded-md border border-border` | M26 |
| `:1162-1176` | `<li className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:justify-between">`, the code in `font-medium text-foreground`, the outcome as `text-success`/`text-danger` text with "blocked: reason" | `<li className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">`; `<span className="min-w-0 text-foreground"><span className="tag font-medium">{item.disposalNo ?? item.requestId}</span>{item.assetLabel ? ` · ${item.assetLabel}` : ""}</span>`; `<span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"><StatusBadge label={copy[item.outcome]} tone={outcomeTones[item.outcome]} />{item.outcome === "blocked" \|\| item.outcome === "failed" ? <span className="text-meta text-muted-foreground">{getErrorLabel(item.code)}</span> : null}</span>` | M22, M26 |
| `:1183-1190` | `function SummaryValue` | delete | M26, LS1 |

- [ ] **Step 1: The failing test.** Append:

```ts

test("bulk execution: a quiet toolbar, danger and warning Notices, KeyValueList reviews with Nil, a StatStrip and outcome StatusBadges (spec 2D M26, D7, D19, M22)", () => {
  const source = read(`${C}disposal/disposal-bulk-execution.tsx`)
  assert.match(source, /className="mx-4 mt-3 flex flex-col gap-3 rounded-md border border-border bg-background p-3 md:mx-5 md:flex-row md:items-center md:justify-between"\n\s+aria-label=\{copy\.toolbarLabel\}/)
  assert.match(source, /\{error \? <Notice tone="danger" role="alert" className="mx-4 mt-3 md:mx-5">\{error\}<\/Notice> : null\}/)
  assert.match(source, /<AccessibleDialogBody className="space-y-5">\n\s+\{error \? <Notice tone="danger" role="alert">\{error\}<\/Notice> : null\}\n\s+<div aria-live="polite" className="min-h-5 text-sm">/, "a dialog error is the first thing in its body")
  assert.match(source, /<section className="space-y-3">\n\s+<Notice tone="warning" id=\{historicalWarningId\}>\n\s+\{copy\.historicalWarning\}\n\s+<\/Notice>/, "the warning is a Notice and the controls sit outside its fill")
  assert.equal(source.match(/<KeyValueList\b/g)?.length, 2, "the shared values and each request's values")
  assert.equal(source.match(/nilLabel: copy\.notProvided/g)?.length, 7)
  assert.match(source, /\{ key: "documentNo", label: copy\.documentNo, value: item\.documentNo \? <span className="tag">\{item\.documentNo\}<\/span> : null, nilLabel: copy\.notProvided \}/)
  assert.match(source, /<h4 className="text-sm text-foreground"><span className="tag font-medium">\{item\.disposalNo\}<\/span><\/h4>/)
  assert.equal(source.match(/value: formatCount\(response\.(?:selected|eligible|executed|blocked|failed)Count\) \}/g)?.length, 5)
  assert.match(source, /<StatusBadge label=\{copy\[item\.outcome\]\} tone=\{outcomeTones\[item\.outcome\]\} \/>/)
  assert.match(source, /eligible: "success",\n\s+executed: "primary",\n\s+blocked: "warning",\n\s+failed: "danger",/)
  assert.equal(source.match(/divide-y divide-border-soft rounded-md border border-border/g)?.length, 2, "the request list and the result list")
  assert.doesNotMatch(source, /function (?:ReviewValue|SummaryValue)\b|bg-warning-soft|border-warning-border|text-success|text-danger|border-y border-border|\btext-xs\b|text-lg|h-4 w-4 text-primary|copy\.notProvided\}/)
})
```

Edit one existing assertion in `tests/disposal-bulk-execution-ui.test.ts` (CRLF, exact text):
- `:218` old: `  assert.equal(dialog.match(/<FieldHint id=\{historicalHelpId\} className="text-muted-foreground">/g)?.length, 2, "muted, not faint, ink on the warning fill (DESIGN.md §2)")`
  new: `  assert.equal(dialog.match(/<FieldHint id=\{historicalHelpId\}>/g)?.length, 2, "the hint sits under the warning Notice, not on its fill, so it is the faint hint again (plan 2D-4)")`

The other pins of that file keep holding (`closeLabel`, the form and body lines, the zero-eligible `Notice`, the footer, the `BusyLabel` spinner, the historical `Field`, `checkboxVariants({ size: "lg" })` ×2 and the `cn(…, "mt-0.5")` one, three `<input`, the three required `Field`s, the shared recipient `Field`, the list buttons; and the field names `recipientName`, `documentNo`, `saleValue`, `salvageValue`, `executionRemark`).

- [ ] **Step 2: Watch it fail.** `node --test tests/disposal-sweep-ui.test.ts tests/disposal-bulk-execution-ui.test.ts` → 2 failures: "bulk execution: a quiet toolbar, danger and warning Notices, KeyValueList reviews with Nil, a StatStrip and outcome StatusBadges (spec 2D M26, D7, D19, M22)" and "bulk execution dialog uses the dialog parts, busy buttons that stay in place and the shared fields (2C batch 3)".
- [ ] **Step 3: Implement** per the table.
- [ ] **Step 4: Guard rows** (no number changes; the two names keep LS1 and LK1 at 0, D19, R10). In `tests/list-frame-guards.test.ts` (CRLF):
  - `LOCAL_STAT_TILE`: insert directly above the line `const LOCAL_STAT_TILE = …` (below the Task 23 comment line) `// Plan 2D-4 Task 38 (DS-9): SummaryValue (the bulk disposal execution result).`, and in the `const` line replace `|ImpactItem|PreviewMetric)\b/g` with `|ImpactItem|PreviewMetric|SummaryValue)\b/g`.
  - `LOCAL_KEY_VALUE`: insert directly above the line `const LOCAL_KEY_VALUE = …` (below the Task 29 comment line) `// Plan 2D-4 Task 38 (DS-9): ReviewValue (the bulk disposal execution review).`, and in the `const` line replace `|MobileAuditField|PendingInfo)\b/g` with `|MobileAuditField|PendingInfo|ReviewValue)\b/g`.
  - FMG `LOADER2` (`tests/form-migration-guards.test.ts`, comment only): `// BusyLabel :967 (its spinner :970), the status line in the dialog body (I27)` → `// BusyLabel :973 (its spinner :976), the status line in the dialog body (I27)` (check with `grep -n "Loader2\|function BusyLabel" src/components/disposal/disposal-bulk-execution.tsx`). `CONSTRAINT_FLOORS` [5, 2, 1] holds.
- [ ] **Step 5: Verify.** `node --test tests/disposal-sweep-ui.test.ts tests/disposal-bulk-execution-ui.test.ts tests/ui-overlay-guards.test.ts tests/confirm-dialog-ui.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts tests/form-migration-guards.test.ts`; `npm test` (+1: 2144 tests, 2143 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2142 / 2141); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.**

```
git add src/components/disposal/disposal-bulk-execution.tsx tests/disposal-sweep-ui.test.ts tests/disposal-bulk-execution-ui.test.ts tests/list-frame-guards.test.ts tests/form-migration-guards.test.ts
git commit -m "refactor(ui): the bulk disposal execution toolbar, notices, reviews and results on the shared parts (2D-4 task 38, DS-9)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 39 (DS-10): The disposal queue (`src/app/[locale]/(dashboard)/disposal/page.tsx`)

Spec D9, D19, M22, M29. The phone filter `<details>` takes the panel classes (it cannot be `ContentPanel`, 2D-2 R4, as the supplier list); its icon loses the primary ink. The record codes are text links (R6): the row's own code ink with the shared underline, the batch code a 13px `linkVariants()` link, both with the 44px phone target on the phone cards. The disposal type is a `Chip` (a kind, not a state, 2D-2 R2). The phone card facts and its "more details" are `KeyValueList`s (`MobileDisposalField` goes); the "more details" disclosure loses its box (a frame in the card) and gets a 44px summary. `text-xs` sub-lines are `text-meta`. Queries, filters, the bulk providers and their copy, `DisposalStageBadge` tones (open issue 4), the table, pagination and the row actions stay.

**Files:** Modify `src/app/[locale]/(dashboard)/disposal/page.tsx` (CRLF), `tests/list-frame-guards.test.ts` (CRLF). Test: `tests/disposal-sweep-ui.test.ts` (LF).

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| `:1` | `import type { ComponentProps, ReactNode } from "react"` | `import type { ComponentProps } from "react"` | — |
| `:13` | `import { formatDateTime } from "@/lib/utils"` | `import { cn, formatDateTime } from "@/lib/utils"` | — |
| `:34-35` | `import { buttonVariants } …` | `import { buttonVariants, linkVariants } …`; add `import { Chip } from "@/components/ui/chip"` | — |
| `:41` | `import { Input } …` | add `import { KeyValueList } from "@/components/ui/key-value-list"` after it | — |
| `:48` | `import { getDesktopTableOnlyClasses, getMobileCardListClasses } …` | add `getPanelClasses` | — |
| `:308` | `<details className="group rounded-lg border border-border bg-surface md:hidden" open={hasActiveFilters}>` | a comment line `{/* A <details> cannot be ContentPanel: the panel classes (2D-2 R4). */}` above `<details className={cn(getPanelClasses(), "group md:hidden")} open={hasActiveFilters}>` | D9 |
| `:310` | `<SlidersHorizontal className="h-4 w-4 text-primary" />` | `<SlidersHorizontal className="h-4 w-4" aria-hidden="true" />` | color |
| `:353` | `… px-4 pt-2 text-xs text-muted-foreground sm:hidden` | `text-meta` | text-xs |
| `:361` | `<Link href={detailHref} className="text-sm text-foreground hover:text-primary">` | `className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center text-sm text-foreground md:min-h-0")}` | M29, D19 |
| `:361` | batch `<Link … className="text-xs text-primary hover:underline">` | `className={cn(linkVariants(), "inline-flex min-h-11 items-center md:min-h-0")}` | M29, D19 |
| `:362` | `mt-1 line-clamp-2 text-xs text-muted-foreground` | `text-meta` | text-xs |
| `:364` | `<StatusBadge label={t(`types.${request.disposalType}`)} tone="muted" />` | `<Chip>{t(`types.${request.disposalType}`)}</Chip>` | M22, 2D-2 R2 |
| `:365` | `<div className="mt-3 grid grid-cols-2 gap-2 text-sm">` with two `<MobileDisposalField>` | `<KeyValueList className="mt-3" items={[{ key: "requestedBy", label: t("requestedBy"), value: request.requestedBy.fullNameTh }, { key: "requestDate", label: t("requestDate"), value: formatDateTime(request.requestDate) }]} />` | D19 |
| `:366` | `<details className="mt-3 rounded-md border border-border bg-surface px-3 py-2"><summary className="min-h-9 cursor-pointer text-sm font-medium text-primary">…</summary><dl className="grid gap-3 border-t border-border pt-3 text-sm">` three `<MobileDisposalField>` `</dl></details>` | `<details className="mt-3 border-t border-border-soft"><summary className="cursor-pointer py-3 text-sm font-medium text-primary">{t("moreDetails")}</summary><KeyValueList items={[reason (request.reason), approver (request.approver ? <><span className="tag">{request.approver.code}</span> - {request.approver.fullNameTh}</> : null), value (getRequestValue(request, tCommon("baht")))]} /></details>` | R4, D19, M33 |
| `:404` | `<Link href={detailHref} className="text-foreground hover:text-primary">` | `className={cn(linkVariants({ size: "inherit" }), "text-foreground")}` (desktop table only) | M29 |
| `:405` | batch `<Link … className="mt-1 block text-xs text-primary hover:underline">` | `className={cn(linkVariants(), "mt-1 block")}` | M29 |
| `:409`, `:413` | `mt-1 text-xs text-muted-foreground`, `mt-1 text-xs num` | `text-meta` | text-xs |
| `:536-538` | `function MobileDisposalField` | delete | D19 |

- [ ] **Step 1: The failing test.** Append:

```ts

test("disposal queue: the phone filter on the panel classes, text links with a 44px phone target, the type a Chip and the phone facts KeyValueLists (spec 2D D9, D19, M22, M29)", () => {
  const source = read("src/app/[locale]/(dashboard)/disposal/page.tsx")
  assert.match(source, /<details className=\{cn\(getPanelClasses\(\), "group md:hidden"\)\} open=\{hasActiveFilters\}>/)
  assert.match(source, /<SlidersHorizontal className="h-4 w-4" aria-hidden="true" \/>/)
  assert.match(source, /<Link href=\{detailHref\} className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center text-sm text-foreground md:min-h-0"\)\}><span className="tag font-medium">\{request\.disposalNo\}<\/span><\/Link>/)
  assert.match(source, /className=\{cn\(linkVariants\(\), "inline-flex min-h-11 items-center md:min-h-0"\)\}><span className="tag">\{request\.batch\.batchNo\}<\/span><\/Link>/)
  assert.match(source, /<Link href=\{detailHref\} className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "text-foreground"\)\}><span className="tag font-medium">\{request\.disposalNo\}<\/span><\/Link>/, "the row's own code stays ink")
  assert.match(source, /className=\{cn\(linkVariants\(\), "mt-1 block"\)\}><span className="tag">\{request\.batch\.batchNo\}<\/span><\/Link>/)
  assert.match(source, /<Chip>\{t\(`types\.\$\{request\.disposalType\}`\)\}<\/Chip>/)
  assert.equal(source.match(/<KeyValueList\b/g)?.length, 2, "the phone card's facts and its more-details list")
  assert.match(source, /<details className="mt-3 border-t border-border-soft"><summary className="cursor-pointer py-3 text-sm font-medium text-primary">\{t\("moreDetails"\)\}<\/summary><KeyValueList /)
  assert.doesNotMatch(source, /function MobileDisposalField\b|hover:text-primary|hover:underline|\btext-xs\b|rounded-lg border|bg-surface px-3 py-2|tone="muted" \/>/)
})
```

Existing pins that keep holding: `list-pages-ui` "the disposal queue builds on…" (all parts, `<ContentPanel\n divided\n flush`, the `DataTable` line, `count: formatCount(stage.count)`, the row actions, `formatMoney(Number(request.saleValue), { unit })`), `list-filters-ui` (two `<DisposalFilterForm …/>`, the `FilterPanel` line, one `<form`, the `activeFilterCount` span), `disposal-queue-ux` (`<details`, sticky actions, the providers), `disposal-route-structure`, `disposal-bulk-execution-ui`, `disposal-evidence-exception`, `operational-return-navigation`, `confirm-dialog-ui` (`discardSelectionAction: t("bulkDiscardSelectionAction"),` ×2).

- [ ] **Step 2: Watch it fail.** `node --test tests/disposal-sweep-ui.test.ts` → 1 failure: "disposal queue: the phone filter on the panel classes, text links with a 44px phone target, the type a Chip and the phone facts KeyValueLists (spec 2D D9, D19, M22, M29)".
- [ ] **Step 3: Implement** per the table.
- [ ] **Step 4: Guard rows.** No number changes (the page is a `MIGRATED_LIST_FILES` file; every counter stays 0). `MobileDisposalField` joins `LOCAL_KEY_VALUE` in `tests/list-frame-guards.test.ts`: insert directly above the line `const LOCAL_KEY_VALUE = …` (below the Task 38 comment line) `// Plan 2D-4 Task 39 (DS-10): MobileDisposalField (the disposal queue's phone card).`, and in the `const` line replace `|PendingInfo|ReviewValue)\b/g` with `|PendingInfo|ReviewValue|MobileDisposalField)\b/g`.
- [ ] **Step 5: Verify.** `node --test tests/disposal-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/list-filters-ui.test.ts tests/disposal-queue-ux.test.ts tests/disposal-route-structure.test.ts tests/disposal-bulk-execution-ui.test.ts tests/disposal-evidence-exception.test.ts tests/operational-return-navigation.test.ts tests/confirm-dialog-ui.test.ts tests/list-frame-guards.test.ts`; `npm test` (+1: 2145 tests, 2144 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2143 / 2142); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.**

```
git add "src/app/[locale]/(dashboard)/disposal/page.tsx" tests/disposal-sweep-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "refactor(ui): the disposal queue's phone filter, links, type chip and phone facts on the shared parts (2D-4 task 39, DS-10)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 40 (DS-11): The disposal request page (`src/app/[locale]/(dashboard)/disposal/[id]/page.tsx`)

Spec D7, D9, M21, M22, M29. Five sections are `ContentPanel`s with their titles (the 20px headings and primary icons go, `p-6` → the one spacing); the history section keeps `id="history"` (the `ActionBar` link) on the panel classes; the source batch is an info `Notice` with the open-batch link as its outline `md` action; the recorded historical exception is a warning `Notice` with the reason, and its granted-by/at facts sit after it (faint labels never on the fill); the two remarks are `KeyValueList` rows (the local `TextBlock` boxes go); the history dots are the primary shape marker; the open-asset link is the outline button. The header, the stepper, the `ActionBar`, every `KeyValueList` fact, the history labels and `ActionEmptyState`, the queries and the permissions stay.

**Files:** Modify `src/app/[locale]/(dashboard)/disposal/[id]/page.tsx` (CRLF), `tests/disposal-detail-workspace.test.ts` (CRLF). Test: `tests/disposal-sweep-ui.test.ts` (LF).

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| `:4` | `import { AlertTriangle, ClipboardCheck, FileText, History, Package, Printer } from "lucide-react"` | `import { FileText, History, Printer } from "lucide-react"` | — |
| `:10` | `import { formatDateTime } from "@/lib/utils"` | `import { cn, formatDateTime } …` | — |
| `:17-21` | imports | add `statusMarkerVariants` (`@/components/ui/badge-variants`), `ContentPanel`, `Notice`; delete `import { Nil } …` | — |
| `:26` | `import { formatMovementType } …` | add `import { getPanelClasses } from "@/lib/design-system"` after it | — |
| `:211-216` | `<div className="flex flex-col gap-2 rounded-lg border border-primary-border bg-primary-soft px-4 py-3 …">` with `sourceBatch` + batch number and `<Link … className="inline-flex min-h-10 … border-primary-border bg-surface … text-primary hover:bg-primary-soft">{t("openBatch")}</Link>` | `<Notice` with, one per line, `tone="info"`, `title={t("sourceBatch")}`, `action={<Link href={`/${locale}/disposal/batches/${disposalRequest.batch.id}`} className={buttonVariants({ variant: "outline", size: "md" })}>{t("openBatch")}</Link>}` `>` `<span className="tag">{disposalRequest.batch.batchNo}</span>` `</Notice>` | D7 (info), M29 |
| `:229-233`, `:260` | `<section className="rounded-lg … p-6">` + `<h2 className="mb-5 … text-lg …"><FileText className="h-5 w-5 text-primary" />{t("requestDetail")}</h2>` … `</section>` | `<ContentPanel title={t("requestDetail")}>` … `</ContentPanel>` | D9 |
| `:262-265` | reason section with `text-lg` `h2` | `<ContentPanel title={t("reason")}>` with the same `<p className="whitespace-pre-wrap text-sm text-muted-foreground">` | D9 |
| `:267-275` | decision section with `ClipboardCheck` and `<TextBlock label={t("approvalRemark")} … />` | `<ContentPanel title={t("decisionDetail")}>` + `<KeyValueList items={[{ key: "approvalRemark", label: t("approvalRemark"), value: disposalRequest.approvalRemark ? <span className="whitespace-pre-wrap">{disposalRequest.approvalRemark}</span> : null }]} />` (the object keys one per line) | D9, D19 |
| `:277-282` | execution section with `ClipboardCheck` heading | `<ContentPanel title={t("executionDetail")}>` | D9 |
| `:303`, `:306-308` | after `completedAt`, a `<div className="mt-5"><TextBlock label={t("executionRemark")} … /></div>` | a last item `{ key: "executionRemark", label: t("executionRemark"), value: disposalRequest.executionRemark ? <span className="whitespace-pre-wrap">{disposalRequest.executionRemark}</span> : null }` in the same `KeyValueList`; the div goes | D19 |
| `:309-329` | `<section aria-label={t("historicalEvidenceSummary")} className="mt-5 rounded-lg border border-warning-border bg-warning-soft p-4">` with `AlertTriangle`, the badge text, the reason, and a `KeyValueList className="mt-4 border-t border-warning-border pt-4"` | `<section aria-label={t("historicalEvidenceSummary")} className="mt-5 space-y-4">` + `<Notice tone="warning" title={t("historicalEvidenceBadge")}><p className="whitespace-pre-wrap">{disposalRequest.evidenceExceptionReason}</p></Notice>` + the same `KeyValueList` items without `className`; `{disposalRequest.evidenceExceptionReason ? (` stays | D7, faint off the fill |
| `:331` | `</section>` | `</ContentPanel>` | — |
| `:334-338` | `<section id="history" className="rounded-lg … p-6">` + `<h2 className="mb-5 … text-lg …"><History className="h-5 w-5 text-primary" />…</h2>` | a comment line `{/* The ActionBar's #history link scrolls here, and ContentPanel takes no id: the panel classes (2D-2 R4). */}` above `<section id="history" className={cn(getPanelClasses(), "p-4 sm:p-5")}>` + `<h2 className="mb-4 break-words text-base font-semibold text-foreground">{t("disposalHistory")}</h2>` | D9, R4 |
| `:349` | `<span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-primary" />` | `<span aria-hidden="true" className={cn(statusMarkerVariants({ tone: "primary" }), "absolute top-2 -left-1")} />` (the movement timeline's marker) | M22 |
| `:358` | `text-xs text-muted-foreground` | `text-meta` | text-xs |
| `:377-381`, `:420` | aside section with `Package` icon heading … `</section>` | `<ContentPanel title={t("asset")}>` … `</ContentPanel>` | D9 |
| `:413-418` | `<Link … className="inline-flex min-h-11 w-full … rounded-md border … hover:bg-accent sm:h-9 sm:min-h-0">` | `<Link href={`/${locale}/assets/${disposalRequest.asset.id}`} className={cn(buttonVariants({ variant: "outline" }), "w-full")}>` (no `sm:` height, spec 5.4 #5) | M29 |
| `:478-487` | `function TextBlock` | delete (not added to `LOCAL_KEY_VALUE`: R10) | D19 |

- [ ] **Step 1: The failing test.** Append:

```ts

test("disposal request page: ContentPanels, the batch an info Notice, the historical exception a warning Notice with its facts outside, remarks in the KeyValueLists and shape markers (spec 2D D7, D9, M21, M22, M29)", () => {
  const source = read("src/app/[locale]/(dashboard)/disposal/[id]/page.tsx")
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 5)
  assert.equal(source.match(/<ContentPanel title=\{t\("(?:requestDetail|reason|decisionDetail|executionDetail|asset)"\)\}>/g)?.length, 5, "request, reason, decision, execution, asset")
  assert.match(source, /<Notice\n\s+tone="info"\n\s+title=\{t\("sourceBatch"\)\}\n\s+action=\{<Link href=\{`\/\$\{locale\}\/disposal\/batches\/\$\{disposalRequest\.batch\.id\}`\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>\{t\("openBatch"\)\}<\/Link>\}\n\s+>\n\s+<span className="tag">\{disposalRequest\.batch\.batchNo\}<\/span>/)
  assert.match(source, /<section aria-label=\{t\("historicalEvidenceSummary"\)\} className="mt-5 space-y-4">\n\s+<Notice tone="warning" title=\{t\("historicalEvidenceBadge"\)\}>/)
  assert.match(source, /key: "approvalRemark",\n\s+label: t\("approvalRemark"\),/)
  assert.match(source, /key: "executionRemark",\n\s+label: t\("executionRemark"\),/)
  assert.match(source, /<section id="history" className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}>/)
  assert.match(source, /<span aria-hidden="true" className=\{cn\(statusMarkerVariants\(\{ tone: "primary" \}\), "absolute top-2 -left-1"\)\} \/>/)
  assert.match(source, /<Link href=\{`\/\$\{locale\}\/assets\/\$\{disposalRequest\.asset\.id\}`\} className=\{cn\(buttonVariants\(\{ variant: "outline" \}\), "w-full"\)\}>/)
  assert.doesNotMatch(source, /function TextBlock\b|rounded-lg border|bg-(?:primary|warning)-soft|border-(?:primary|warning)-border|rounded-full|text-lg|\btext-xs\b|hover:bg-accent|sm:h-9|AlertTriangle|text-primary/)
})
```

Edit one existing assertion in `tests/disposal-detail-workspace.test.ts` (CRLF, exact text):
- `:116` old: `  assert.equal(source.match(/<KeyValueList\b/g)?.length, 5)`
  new: `  assert.equal(source.match(/<KeyValueList\b/g)?.length, 6, "plan 2D-4 adds the decision remark")`

Pins that keep holding: the rest of `disposal-detail-workspace` (stage action, progressive reveal `requestStatus !== "pending" ? (` / `=== "disposed" ? (`, `<PageBackLink href={returnToHref}`, `primaryAction={nextActionControl}`, `hidden … md:flex`, movement translations, the print label, the batch include and `/disposal/batches/${disposalRequest.batch.id}`, the header), `mobile-action-bar` (the `ActionBar` lines and `icon: <FileText className="h-4 w-4" />`), `steps-ui` (`stepsLabel` and `labels`), `disposal-evidence-exception` (`evidenceExceptionReason ? (`, `historicalEvidenceBadge`, …), `operational-return-navigation`.

- [ ] **Step 2: Watch it fail.** `node --test tests/disposal-sweep-ui.test.ts tests/disposal-detail-workspace.test.ts` → 2 failures: "disposal request page: ContentPanels, the batch an info Notice, the historical exception a warning Notice with its facts outside, remarks in the KeyValueLists and shape markers (spec 2D D7, D9, M21, M22, M29)" and "disposal request header is PageHeader with the asset name and a back button at every width (spec 2B §4.5.4)".
- [ ] **Step 3: Implement** per the table.
- [ ] **Step 4: Guard rows.** None (the page is a `MIGRATED_LIST_FILES` file with no row; it stays at 0 in every LFG counter).
- [ ] **Step 5: Verify.** `node --test tests/disposal-sweep-ui.test.ts tests/disposal-detail-workspace.test.ts tests/mobile-action-bar.test.ts tests/steps-ui.test.ts tests/disposal-evidence-exception.test.ts tests/operational-return-navigation.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`; `npm test` (+1: 2146 tests, 2145 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2144 / 2143); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.**

```
git add "src/app/[locale]/(dashboard)/disposal/[id]/page.tsx" tests/disposal-sweep-ui.test.ts tests/disposal-detail-workspace.test.ts
git commit -m "refactor(ui): the disposal request page on ContentPanel, Notice and KeyValueList (2D-4 task 40, DS-11)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 41 (DS-12): The batch history list (`src/app/[locale]/(dashboard)/disposal/batches/page.tsx`)

Spec D9, D19, M29. The list frame is `ContentPanel divided flush` with no head (the page title names it), the phone list `ContentPanelRows` (the panel's own row gutters and soft lines), the batch code on a phone card a text link with the 44px target (R6), and the `text-xs` sub-lines `text-meta`. Paging, the redirect, `returnTo`, `BatchStatus` tones (open issue 4), the table and its row actions stay.

**Files:** Modify `src/app/[locale]/(dashboard)/disposal/batches/page.tsx` (CRLF). Test: `tests/disposal-sweep-ui.test.ts` (LF).

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| `:16-17` | `import { buttonVariants } …`, `import { ClickableTableRow } …` | `import { buttonVariants, linkVariants } …`; add `import { ContentPanel, ContentPanelRows } from "@/components/ui/content-panel"` after `ClickableTableRow` | — |
| `:87` | `<section className="overflow-hidden rounded-lg border border-border bg-surface">` | `<ContentPanel divided flush>` | D9 |
| `:88`, `:94` | `<div className="divide-y divide-border md:hidden">` … `</div>` | `<ContentPanelRows className="md:hidden">` … `</ContentPanelRows>` | D9 |
| `:92` | `return <article key={batch.id} className="p-4">…</article>` | `return <li key={batch.id}><article>…</article></li>` (the rows bring the padding) | D9 |
| `:92` | `<Link href={href} className="text-sm text-foreground hover:text-primary">` | `className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center text-sm text-foreground md:min-h-0")}` | M29, D19 |
| `:92`, `:114` | `mt-1 text-xs text-muted-foreground` ×2 | `text-meta` | text-xs |
| `:152` | `</section>` | `</ContentPanel>` | — |

- [ ] **Step 1: The failing test.** Append:

```ts

test("disposal batch history: a flush ContentPanel with shared phone rows, a text link with a 44px phone target and 13px meta lines (spec 2D D9, D19, M29)", () => {
  const source = read("src/app/[locale]/(dashboard)/disposal/batches/page.tsx")
  assert.match(source, /<ContentPanel divided flush>\n\s+<ContentPanelRows className="md:hidden">/)
  assert.match(source, /return <li key=\{batch\.id\}><article><div className="flex items-start justify-between gap-3">/)
  assert.match(source, /<Link href=\{href\} className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center text-sm text-foreground md:min-h-0"\)\}><span className="tag font-medium">\{batch\.batchNo\}<\/span><\/Link>/)
  assert.match(source, /<\/DataTableFoot>\n\s+<\/ContentPanel>/)
  assert.doesNotMatch(source, /<section\b|rounded-lg border|hover:text-primary|\btext-xs\b|divide-border md:hidden/)
})
```

Pins that keep holding: `list-pages-ui` B4 (paging), "disposal batches: real pages…" (parts, `<div className="space-y-6">`, back link, `returnTo`, the row actions, `canCreate && total > 0 ?`), `disposal-queue-ux`.

- [ ] **Step 2: Watch it fail.** `node --test tests/disposal-sweep-ui.test.ts` → 1 failure: "disposal batch history: a flush ContentPanel with shared phone rows, a text link with a 44px phone target and 13px meta lines (spec 2D D9, D19, M29)".
- [ ] **Step 3: Implement** per the table.
- [ ] **Step 4: Guard rows.** None.
- [ ] **Step 5: Verify.** `node --test tests/disposal-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/disposal-queue-ux.test.ts tests/list-frame-guards.test.ts`; `npm test` (+1: 2147 tests, 2146 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2145 / 2144); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.**

```
git add "src/app/[locale]/(dashboard)/disposal/batches/page.tsx" tests/disposal-sweep-ui.test.ts
git commit -m "refactor(ui): the disposal batch history in a flush ContentPanel with shared rows (2D-4 task 41, DS-12)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 42 (DS-13): The batch page (`src/app/[locale]/(dashboard)/disposal/batches/[id]/page.tsx`)

Spec D9. The shared facts are a `ContentPanel` with its title (the 20px heading and its icon go); the child requests are `ContentPanel divided flush` with the title as its head (the hand-made head row goes), the phone list `ContentPanelRows` (an empty batch shows the padded `EmptyNote` instead), and `text-xs` sub-lines `text-meta`. The header, the `StatStrip`, the facts, the table, the row actions and the evidence aside stay.

**Files:** Modify `src/app/[locale]/(dashboard)/disposal/batches/[id]/page.tsx` (CRLF). Test: `tests/disposal-sweep-ui.test.ts` (LF).

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| `:4` | `import { FileText, PackageCheck } from "lucide-react"` | `import { FileText } from "lucide-react"` | — |
| `:14` | `import { ClickableTableRow } …` | add `import { ContentPanel, ContentPanelRows } from "@/components/ui/content-panel"` after it | — |
| `:94-97` | `<section className="rounded-lg … p-4 sm:p-6">` + `<h2 className="flex … text-lg …"><PackageCheck className="h-5 w-5 text-primary" />{t("batchSharedDetail")}</h2>` + `<KeyValueList className="mt-5"` | `<ContentPanel title={t("batchSharedDetail")}>` + `<KeyValueList` (no `className`) | D9 |
| `:108` | `</section>` | `</ContentPanel>` | — |
| `:110-114` | `<section className="overflow-hidden rounded-lg …">`, `<div className="border-b border-border px-4 py-3"><h2 …>{t("batchChildren")}</h2></div>`, `<div className="divide-y divide-border md:hidden">{… ? <EmptyNote padded>… : ….map((request) => <BatchRequestCard key={request.id} … />)}</div>` | `<ContentPanel divided flush title={t("batchChildren")}>` then `{batch.disposalRequests.length === 0 ? (` / `<EmptyNote padded className="md:hidden">{tCommon("noData")}</EmptyNote>` / `) : (` / `<ContentPanelRows className="md:hidden">` / `{batch.disposalRequests.map((request) => <li key={request.id}><BatchRequestCard href={…} request={request} statusLabel={…} openLabel={t("openRequest")} /></li>)}` / `</ContentPanelRows>` / `)}` | D9 |
| `:135` | `text-xs text-muted-foreground` | `text-meta` | text-xs |
| `:152` | `</section>` | `</ContentPanel>` | — |
| `:163` | `<article className="p-4">` | `<article>` | D9 |
| `:171` | `mt-2 text-xs text-muted-foreground` | `text-meta` | text-xs |

- [ ] **Step 1: The failing test.** Append:

```ts

test("disposal batch page: the shared facts a ContentPanel, the requests a flush ContentPanel with shared phone rows, and 13px meta lines (spec 2D D9)", () => {
  const source = read("src/app/[locale]/(dashboard)/disposal/batches/[id]/page.tsx")
  assert.match(source, /<ContentPanel title=\{t\("batchSharedDetail"\)\}>\n\s+<KeyValueList\n\s+items=\{\[/)
  assert.match(source, /<ContentPanel divided flush title=\{t\("batchChildren"\)\}>/)
  assert.match(source, /<EmptyNote padded className="md:hidden">\{tCommon\("noData"\)\}<\/EmptyNote>/)
  assert.match(source, /<ContentPanelRows className="md:hidden">\n\s+\{batch\.disposalRequests\.map\(\(request\) => <li key=\{request\.id\}><BatchRequestCard /)
  assert.match(source, /<article>\n\s+<div className="flex items-start justify-between gap-3">/)
  assert.doesNotMatch(source, /<section\b|rounded-lg border|PackageCheck|text-lg|\btext-xs\b|text-primary/)
})
```

Pins that keep holding: `list-pages-ui` "the disposal batch page builds on…" (parts, root, the `h1` code, crumbs, `formatMoney(Number(batch.saleValue), { unit: tCommon("baht") })`, the row actions, the next-action head).

- [ ] **Step 2: Watch it fail.** `node --test tests/disposal-sweep-ui.test.ts` → 1 failure: "disposal batch page: the shared facts a ContentPanel, the requests a flush ContentPanel with shared phone rows, and 13px meta lines (spec 2D D9)".
- [ ] **Step 3: Implement** per the table.
- [ ] **Step 4: Guard rows.** None.
- [ ] **Step 5: Verify.** `node --test tests/disposal-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/operational-return-navigation.test.ts tests/list-frame-guards.test.ts`; `npm test` (+1: 2148 tests, 2147 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2146 / 2145); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.**

```
git add "src/app/[locale]/(dashboard)/disposal/batches/[id]/page.tsx" tests/disposal-sweep-ui.test.ts
git commit -m "refactor(ui): the disposal batch page on ContentPanel and shared rows (2D-4 task 42, DS-13)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 43 (DS-14): Money on the print page (`src/app/[locale]/(print)/disposal/[id]/print/page.tsx`)

Spec D10, M24 (5 sites), M17 (LFG LV3 5). The five amounts go through `formatMoney(Number(x), { unit: tCommon("baht") })`, as the request page shows them ("1,500.00 บาท" instead of "฿1,500.00"). The print page keeps everything else (its `"-"` and its look belong to `OperationDocumentPrint`). `formatCurrency` stays in `src/lib/utils.ts` for the repair print page (Task 51 deletes it).

**Files:** Modify `src/app/[locale]/(print)/disposal/[id]/print/page.tsx` (CRLF), `tests/list-frame-guards.test.ts` (CRLF). Test: `tests/disposal-sweep-ui.test.ts` (LF).

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| `:5` | `import { formatCurrency, formatDateTime } from "@/lib/utils"` | `import { formatMoney } from "@/lib/display-format"` and `import { formatDateTime } from "@/lib/utils"` (two lines) | — |
| `:74`, `:75` | `formatCurrency(Number(disposalRequest.actualSaleValue))`, `…actualSalvageValue))` | `formatMoney(Number(disposalRequest.actualSaleValue), { unit: tCommon("baht") })`, same for `actualSalvageValue` | D10 |
| `:115`, `:116` | `formatCurrency(Number(disposalRequest.saleValue))`, `…salvageValue))` | `formatMoney(…, { unit: tCommon("baht") })` | D10 |
| `:135` | `formatCurrency(Number(disposalRequest.asset.purchasePrice))` | `formatMoney(Number(disposalRequest.asset.purchasePrice), { unit: tCommon("baht") })` | D10 |

- [ ] **Step 1: The failing test.** Append:

```ts

test("disposal print page: money through formatMoney with the baht unit, as on the screen (spec 2D D10, M24)", () => {
  const source = read("src/app/[locale]/(print)/disposal/[id]/print/page.tsx")
  assert.match(source, /^import \{ formatMoney \} from "@\/lib\/display-format"$/m)
  assert.equal(source.match(/formatMoney\(Number\(disposalRequest\.(?:actualSaleValue|actualSalvageValue|saleValue|salvageValue|asset\.purchasePrice)\), \{ unit: tCommon\("baht"\) \}\)/g)?.length, 5)
  assert.doesNotMatch(source, /formatCurrency/)
})
```

Pins that keep holding: `disposal-route-structure` (`omit: { batchId: true }`), `disposal-evidence-exception` (the exception fields, `evidenceCount + batchEvidenceCount`, `.filter(Boolean)`).

Then append the Review Focus 2 test (an empty or missing value) to the same file:

```ts

test("review focus 2: a missing amount on the disposal printout stays null and prints the print page's dash, never 0.00 บาท (plan 2D-4)", () => {
  const source = read("src/app/[locale]/(print)/disposal/[id]/print/page.tsx")
  for (const field of ["actualSaleValue", "actualSalvageValue", "saleValue", "salvageValue", "asset.purchasePrice"]) {
    const name = field.replace(".", "\\.")
    assert.match(source, new RegExp(`disposalRequest\\.${name} == null \\? null : formatMoney\\(Number\\(disposalRequest\\.${name}\\), \\{ unit: tCommon\\("baht"\\) \\}\\)`), field)
  }
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/disposal-sweep-ui.test.ts` → 2 failures: "disposal print page: money through formatMoney with the baht unit, as on the screen (spec 2D D10, M24)" and "review focus 2: a missing amount on the disposal printout stays null and prints the print page's dash, never 0.00 บาท (plan 2D-4)" (the amounts still go through `formatCurrency`).
- [ ] **Step 3: Implement** per the table.
- [ ] **Step 4: Guard rows** (`tests/list-frame-guards.test.ts`; live LV3 5 → 0 in this file, 6 → 1 in all; find each row by its text; line numbers at `45c1409` and, in brackets, when this task runs, before its first edit):
  - BUDGETS.LV3 (`:273` [`:278`]): delete the line `"src/app/[locale]/(print)/disposal/[id]/print/page.tsx": 5, // → 5 (KEEP): print page, 2D (A/08:305)`; the maintenance row and the group comment stay.
  - KEEP.LV3 (`:329` [`:328`]): delete the line `"src/app/[locale]/(print)/disposal/[id]/print/page.tsx": 5, // print page, 2D (A/08:305)`.
- [ ] **Step 5: Verify.** `node --test tests/disposal-sweep-ui.test.ts tests/disposal-route-structure.test.ts tests/disposal-evidence-exception.test.ts tests/list-frame-guards.test.ts`; `npm test` (+2: 2150 tests, 2149 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2148 / 2147); `npx tsc --noEmit`; `npm run lint`.
- [ ] **Step 6: Commit.**

```
git add "src/app/[locale]/(print)/disposal/[id]/print/page.tsx" tests/disposal-sweep-ui.test.ts tests/list-frame-guards.test.ts
git commit -m "refactor(ui): money on the disposal print page through formatMoney like the screen (2D-4 task 43, DS-14)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Area MT: maintenance (Tasks 44–51)

Spec §3.4 (the repair attachments M28, the print page D10 / M24), the sweep categories of the maintenance files, and the deletion of `formatCurrency` (§4.1, D10). Task 50 needs Task 43; Task 51 needs Tasks 43 and 50. VFG has no row for these files. Task 44 creates `tests/maintenance-sweep-ui.test.ts`; Tasks 45–51 append to it (`const D` in Task 47's block, `const P` in Task 50's).

### Task 44 (MT-1): Repair attachments on the shared parts (`src/components/maintenance/maintenance-attachments.tsx`)

Spec M28 (:146, :185, :194, :202, :210), D7, D9 / M25, M21, M22, M29; plan 2D-3 R4 and R5. The section becomes a `ContentPanel` (the page already wraps it in `<div id="attachments">`, so the panel needs no id). The warning becomes a `Notice`, the empty box an `EmptyNote` and the count pill plain `num` text. The preview, download and delete controls become `Button` / `buttonVariants` (the delete button is `busy`, so `Loader2`, `disabled:opacity-50` and the `sm:` heights go), and the attachment card loses the frames inside it. The thumbnail that opens the preview stays a raw `<button>` with a comment, because the image is the control (as the asset photos, 2D-3 R5). Upload, delete confirm, toasts, grouping by type and the preview dialog stay the same.

**Files:**
- Modify: `src/components/maintenance/maintenance-attachments.tsx` (i/lf w/crlf = CRLF)
- Modify: `tests/form-migration-guards.test.ts` (CRLF)
- Modify (comment only): `tests/maintenance-attachments-ui.test.ts` (CRLF)
- Create: `tests/maintenance-sweep-ui.test.ts` (new, LF)

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| :6 | `Loader2` in the lucide import | drop it | GB1 |
| imports | — | add `formatCount` (`@/lib/display-format`), `cn` (`@/lib/utils`), `Button`, `buttonVariants`, `ContentPanel`, `EmptyNote`, `Notice` | — |
| :99-103, :238 | `<section className="rounded-lg border border-border bg-surface p-6">`, an `h2` `text-lg` with `<FileText className="h-5 w-5 text-primary" />` | `<ContentPanel title={t("attachments")}>` … `</ContentPanel>`; the heading and its icon go (a panel title is text) | D9, M25 |
| :106 | `mb-4 rounded-md border border-border bg-background p-3` around the type select and the drop zone | `mb-4` only: no box around a drop zone | 2D-3 R4 |
| :107 | `<p className="mb-3 rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning">` | `<Notice tone="warning" className="mb-3">{t("closedEvidenceAppendOnlyHelp")}</Notice>`, with no role (it is there when the page loads) | D7, R3 |
| :108 | `<Field label={t("attachmentType")} className="mb-3">` | unchanged (pinned) | — |
| :132-134 | dashed `div` with `tCommon("noData")` | `<EmptyNote>{tCommon("noData")}</EmptyNote>` | M21 |
| :141 | pill `rounded-full bg-muted px-2 py-1 text-xs font-medium` | `<span className="text-meta num text-muted-foreground">{formatCount(group.attachments.length)}</span>` | M22, 2D-2 R2 |
| :144 | card `rounded-md border border-border bg-background p-3` | unchanged (the quiet grouping) | R4 |
| :145 | — | a JSX comment as the card's first child, before `{isPreviewable(attachment) ? (`: `{/* The thumbnail stays a raw button: the image or the PDF preview is the control (plan 2D-4, for the EXEMPT list of 2D-5). */}`. No apostrophe and no `<button` inside it | R5 |
| :146-149 | raw thumbnail `<button>`, `… rounded-md border border-border bg-surface text-muted-foreground transition-colors hover:bg-accent` | stays a `<button type="button">`; class `mb-3 flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-md bg-surface text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (no frame inside the grouping, the 2D-3 R5 focus ring) | M28 :146, R5 |
| :160 | `<FileText className="h-10 w-10 text-danger" />` | `<FileText className="h-10 w-10" />` (red belongs to badges, notices and destructive controls only) | Where Color Lives |
| :166 | placeholder `… rounded-md border border-dashed border-border bg-surface text-muted-foreground` | `mb-3 flex aspect-[4/3] w-full items-center justify-center rounded-md bg-surface text-muted-foreground` | spec §5.4 guard 2 |
| :172 | `<ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-info" />` | `text-muted-foreground`, like the `FileText` beside it | M20 (info token) |
| :178 | `mt-1 text-xs text-muted-foreground` | `mt-1 text-meta text-muted-foreground` | text-xs |
| :185-192 | raw preview `<button>` (`sm:h-8`, `text-xs`, `hover:bg-accent`, `Eye h-3.5 w-3.5`) | `<Button variant="outline" size="sm" className="flex-1" onClick={() => setPreview(attachment)}>` with `<Eye aria-hidden="true" />` | M28 :185, M29 (h-8 → `sm`) |
| :194-200 | `<a href={`/api/attachments/${attachment.id}`}>` with hand-written button classes | the same `<a>` (a download from `/api` stays a plain `<a>`, M31) with `className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1")}` and `<Download aria-hidden="true" />` | M28 :194 |
| :202-214 | raw delete `<button>`, `disabled={deletingId === attachment.id}`, `text-danger … disabled:opacity-50 sm:h-8 sm:min-h-0 sm:w-8 sm:min-w-0`, `title`, `Loader2` / `Trash2` | `<Button variant="danger" size="icon-sm" onClick={() => void handleDelete(attachment.id)} busy={deletingId === attachment.id} aria-label={tCommon("delete")} title={tCommon("delete")}>` with `<Trash2 aria-hidden="true" />`, props in this order. `busy` replaces `disabled` (GB4). `danger` because it is red at rest (K22), as the asset attachments (2D-3) | M28 :202, :210 |
| :236 | `closeLabel={tCommon("close")}` | delete (it is the default; DESIGN Dialogs: pass `closeLabel` only when the name differs) | DESIGN |

- [ ] **Step 1: The failing test.** Create `tests/maintenance-sweep-ui.test.ts` (LF):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-4 (spec 2D §3.4, D7, D9, D10, M21, M22, M24, M25, M28, M29, M33): the repair records, the PM plans and the
// repair print page on the shared parts. Panels are ContentPanel (or getPanelClasses where a section keeps an id),
// messages Notice by meaning, states StatusBadge, cadences the shared Chip, empty states EmptyNote, buttons Button and
// buttonVariants, text links linkVariants, codes tag, money formatMoney. Each test pins one file (or one tight pair) and
// fails before that commit. Sources are read with LF line endings, so the regexes may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/"

test("repair attachments: a ContentPanel, a warning Notice, a plain count, EmptyNote and the shared buttons; the thumbnail stays a raw button (spec 2D M28, D7, D9, M21, M29)", () => {
  const source = read(`${C}maintenance/maintenance-attachments.tsx`)
  assert.match(source, /<ContentPanel title=\{t\("attachments"\)\}>/)
  assert.match(source, /<Notice tone="warning"[^>]*>\{t\("closedEvidenceAppendOnlyHelp"\)\}<\/Notice>/)
  assert.match(source, /<EmptyNote>\{tCommon\("noData"\)\}<\/EmptyNote>/)
  assert.match(source, /<span className="text-meta num text-muted-foreground">\{formatCount\(group\.attachments\.length\)\}<\/span>/)
  assert.match(source, /<Button variant="outline" size="sm" className="flex-1" onClick=\{\(\) => setPreview\(attachment\)\}>/)
  assert.match(source, /<a\s+href=\{`\/api\/attachments\/\$\{attachment\.id\}`\}\s+className=\{cn\(buttonVariants\(\{ variant: "outline", size: "sm" \}\), "flex-1"\)\}/)
  assert.match(source, /<Button\s+variant="danger"\s+size="icon-sm"\s+onClick=\{\(\) => void handleDelete\(attachment\.id\)\}\s+busy=\{deletingId === attachment\.id\}\s+aria-label=\{tCommon\("delete"\)\}\s+title=\{tCommon\("delete"\)\}\s*>/)
  // The thumbnail that opens the preview stays a raw button: the image or the PDF preview is the control (2D-4, for 2D-5's EXEMPT list).
  assert.equal(source.match(/<button\b/g)?.length, 1)
  assert.match(source, /className="mb-3 flex aspect-\[4\/3\] w-full items-center justify-center overflow-hidden rounded-md bg-surface text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"/)
  assert.doesNotMatch(source, /Loader2|disabled:opacity|border-dashed|rounded-full|rounded-lg|hover:bg-accent|sm:h-8|sm:min-h-0|\btext-xs\b|\btext-lg\b|text-(?:info|danger|warning|primary)\b|bg-warning-soft|closeLabel=/)
})
```

  Existing pins: none changes. `maintenance-attachments-ui.test.ts` :22 (the `Field` and `NativeSelect`), :24 (`FileDropzone`) and :28 (the `onClick` of the delete button) stay true. Update its stale comment, :26 only:
  - old: `  // button stays as it is (2D) and only starts handleDelete, which asks first.`
  - new: `  // button (Button danger icon-sm busy since plan 2D-4) only starts handleDelete, which asks first.`
- [ ] **Step 2: Watch it fail.** `node --test tests/maintenance-sweep-ui.test.ts` → fails: "repair attachments: a ContentPanel, a warning Notice, a plain count, EmptyNote and the shared buttons; the thumbnail stays a raw button (spec 2D M28, D7, D9, M21, M29)".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** FMG `LOADER2`: delete the line `  [`${C}maintenance/maintenance-attachments.tsx`]: 1, // → 1: the delete button :210 (2D)` (FMG :282). The `// 1a` comment line above it stays, like the other empty groups. The live count is 0, and GB2 has no spinner left to check in this file. LFG and VFG: no rows.
- [ ] **Step 5: Verify.** `node --test tests/maintenance-sweep-ui.test.ts tests/maintenance-attachments-ui.test.ts tests/attachment-preview-dialog-ui.test.ts tests/confirm-dialog-ui.test.ts tests/maintenance-i18n.test.ts tests/maintenance-contrast.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`, then `npm test` (+1: 2151 tests, 2150 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2149 / 2148), `npx tsc --noEmit`, `npm run lint` (0 errors, no new warning in `src/` or `tests/`).
- [ ] **Step 6: Commit.**
  - `git add src/components/maintenance/maintenance-attachments.tsx tests/maintenance-sweep-ui.test.ts tests/form-migration-guards.test.ts tests/maintenance-attachments-ui.test.ts`
  - Message:

```
refactor(ui): the repair attachments on ContentPanel, a warning Notice, EmptyNote and the shared buttons (2D-4 task 44, MT-1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

### Task 45 (MT-2): The repair form and its option select (`src/components/maintenance/repair-record-form.tsx`, `src/components/maintenance/maintenance-option-select.tsx`)

Spec D7, D9 / M25, M29; plan 2D-3 R4 and R11 (the status-correction disclosure, M27). The `<section>` around the form becomes a `ContentPanel`. Both warning boxes become `Notice`s by meaning: the refused save is `danger` with `role="alert"`, and the asset status effect is `warning`. The reporter hint moves into the select as its field hint (13px faint `FieldHint`, read through `aria-describedby`). This is why the pair shares a new optional `hint` prop. The "more details" row becomes an outline `Button` with `aria-expanded` and `aria-controls` over a quiet grouping. Every field, `required` and `maxLength`, the submit, the upload after save and the error link stay the same.

**Files:**
- Modify: `src/components/maintenance/repair-record-form.tsx` (CRLF)
- Modify: `src/components/maintenance/maintenance-option-select.tsx` (CRLF)
- Test: `tests/maintenance-sweep-ui.test.ts` (LF)

**Interfaces:** `MaintenanceOptionSelect` gets an optional `hint?: React.ReactNode` prop and passes it to `SearchableSelect`'s existing `hint`. The other callers (`maintenance-plan-form.tsx`, `repair-record-actions.tsx`) pass nothing.

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| form :4 | `import { useState } from "react"` | `import { useId, useState } from "react"` | — |
| form imports | — | add `ContentPanel`, `Notice` | — |
| form :50 | `const [showDetails, setShowDetails] = …` | add `const detailsId = useId()` under it | — |
| form :118, :267 | `<section className="rounded-lg border border-border bg-surface p-4 sm:p-6">` / `</section>` | `<ContentPanel>` / `</ContentPanel>`. The section around the form can be one, so the form keeps `className="space-y-5"` | D9, R4 |
| form :136-144 | `<p role="alert" className="rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning">` … `</p>` | `<Notice tone="danger" role="alert">` … `</Notice>` with the same children. The link keeps `cn(linkVariants({ size: "inherit" }), "decoration-current")` (pinned). The save was refused: an error after the user acted | D7, R3 |
| form :182-184 | warning `<p>` with `t(`assetStatusEffect.${effectKey}`)` | `<Notice tone="warning">{t(`assetStatusEffect.${effectKey}`)}</Notice>`, with no role (as today) | D7 |
| form :187-200 | `<div>` + `MaintenanceOptionSelect type="employee"` + `<p className="mt-1 text-xs text-muted-foreground">{t("reporterHelp")}</p>` | the select alone, with `hint={t("reporterHelp")}` before `onChange`; the wrapper `div` and the `p` go | text-xs; Field hint |
| form :202 | `<div className="rounded-md border border-border">` | `<div>` | R4 |
| form :203-211 | raw `<button type="button" aria-expanded …>` (`min-h-11 … hover:bg-accent focus-visible:…`), `<ChevronDown className={`h-4 w-4 transition-transform …`} />` | `<Button variant="outline" aria-expanded={showDetails} aria-controls={showDetails ? detailsId : undefined} onClick={() => setShowDetails((open) => !open)} className="w-full justify-between">` (props in this order), then `{t("moreDetails")}` and `<ChevronDown aria-hidden="true" className={showDetails ? "rotate-180" : undefined} />`. `aria-controls` is set only while the panel exists (axe) | M29, 2D-3 R11 |
| form :213 | `<div className="grid gap-4 border-t border-border p-4 md:grid-cols-2">` | `<div id={detailsId} className="mt-3 grid gap-4 rounded-md border border-border bg-background p-4 md:grid-cols-2">` (the quiet grouping) | R4 |
| form :260-265 | the submit row | unchanged (pinned) | — |
| select :9-35 | props | add `hint,` after `formatReason,` in the list, and `hint?: React.ReactNode` after `formatReason?: …` in the type (a type position, so no React import) | — |
| select :79-90 | `<SearchableSelect …>` | add `hint={hint}` after `emptyLabel={…}` | — |
| select :91-93 | the `sr-only` live text "Loading" / "`${n}` results" | unchanged (not taken, R18) | — |

- [ ] **Step 1: The failing test.** Append to `tests/maintenance-sweep-ui.test.ts`:

```ts

test("repair form: a ContentPanel, the open-record error and the status effect as Notices, the reporter hint on its select, and an outline disclosure over a quiet grouping (spec 2D D7, D9, M29)", () => {
  const source = read(`${C}maintenance/repair-record-form.tsx`)
  assert.match(source, /<ContentPanel>\s*<form onSubmit=\{handleSubmit\} className="space-y-5">/)
  assert.match(source, /<Notice tone="danger" role="alert">\s*\{tMaintenance\("errors\.MAINTENANCE_OPEN_RECORD_EXISTS"\)\}/)
  assert.match(source, /<Notice tone="warning">\s*\{t\(`assetStatusEffect\.\$\{effectKey\}`\)\}\s*<\/Notice>/)
  assert.match(source, /hint=\{t\("reporterHelp"\)\}/)
  assert.match(source, /const detailsId = useId\(\)/)
  assert.match(source, /<Button\s+variant="outline"\s+aria-expanded=\{showDetails\}\s+aria-controls=\{showDetails \? detailsId : undefined\}\s+onClick=\{\(\) => setShowDetails\(\(open\) => !open\)\}\s+className="w-full justify-between"\s*>/)
  assert.match(source, /<div id=\{detailsId\} className="mt-3 grid gap-4 rounded-md border border-border bg-background p-4 md:grid-cols-2">/)
  assert.doesNotMatch(source, /<button\b|<section\b|rounded-lg|bg-warning-soft|border-warning-border|text-warning|hover:bg-accent|\btext-xs\b|transition-transform|\bh-4 w-4\b/)
  const select = read(`${C}maintenance/maintenance-option-select.tsx`)
  assert.match(select, /\n\s+hint\?: React\.ReactNode\n/)
  assert.match(select, /\n\s+hint=\{hint\}\n/)
})
```

  Existing pins: none changes. These stay true: `repair-record-ui` :57-61 (no `<input`, `<textarea` or `Loader2`; the two fields; the link; the submit), `choice-controls-ui` :55-62 (two fieldsets, two `FieldRequiredMark`), `file-evidence-ui` :75-88 (`<Field label={t("files")} className="md:col-span-2">` inside the grouping) and `maintenance-option-select` :5-24.
- [ ] **Step 2: Watch it fail.** `node --test tests/maintenance-sweep-ui.test.ts` → fails: "repair form: a ContentPanel, the open-record error and the status effect as Notices, the reporter hint on its select, and an outline disclosure over a quiet grouping (spec 2D D7, D9, M29)".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** None to change. FMG `CONSTRAINT_FLOORS` `repair-record-form.tsx: [2, 3, 0]` must still hold: `required` on the date `Input` and the problem `Textarea`; `maxLength` on the problem, the invoice number and the remark. The live count after is [2, 3, 0]. No LFG or VFG row.
- [ ] **Step 5: Verify.** `node --test tests/maintenance-sweep-ui.test.ts tests/repair-record-ui.test.ts tests/choice-controls-ui.test.ts tests/file-evidence-ui.test.ts tests/maintenance-option-select.test.ts tests/maintenance-i18n.test.ts tests/maintenance-contrast.test.ts tests/form-migration-guards.test.ts`, then `npm test` (+1: 2152 tests, 2151 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2150 / 2149), `npx tsc --noEmit`, `npm run lint`.
- [ ] **Step 6: Commit.**
  - `git add src/components/maintenance/repair-record-form.tsx src/components/maintenance/maintenance-option-select.tsx tests/maintenance-sweep-ui.test.ts`
  - Message:

```
refactor(ui): the repair form on ContentPanel and Notice, its reporter hint on the select and an outline disclosure (2D-4 task 45, MT-2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

### Task 46 (MT-3): The PM plan form panel (`src/components/maintenance/maintenance-plan-form.tsx`)

Spec D9 / M25 and the Where Color Lives rule (`primary-soft` marks a selected chip, tab or option, never a panel). The tinted `<section>` becomes a plain `ContentPanel`. Its heading div ("เพิ่มแผน PM" with a primary icon) goes, because the page header already names the form: the new page's `h1` is the same words, and the edit page's `h1` is the plan's title, where "เพิ่มแผน PM" was wrong (R4, open issue 12). Fields, `required` and `maxLength`, the save and the return link stay the same.

**Files:**
- Modify: `src/components/maintenance/maintenance-plan-form.tsx` (CRLF)
- Test: `tests/maintenance-sweep-ui.test.ts` (LF)

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| :6 | `import { CalendarClock, Save } from "lucide-react"` | `import { Save } from "lucide-react"` | — |
| imports | — | add `ContentPanel` | — |
| :89-93 | `<section className="rounded-lg border border-primary-border bg-primary-soft p-4">` and the heading `div` with `<CalendarClock className="h-5 w-5 text-primary" />{t("pmCreateTitle")}` | `<ContentPanel>`, with no heading | D9, Where Color Lives |
| :94 | `<form … className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">` | `className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"` (no heading above it) | — |
| :155 | `</section>` | `</ContentPanel>` | — |

- [ ] **Step 1: The failing test.** Append:

```ts

test("PM plan form: a plain ContentPanel with no tinted frame and no heading of its own; the page header names the form (spec 2D D9)", () => {
  const source = read(`${C}maintenance/maintenance-plan-form.tsx`)
  assert.match(source, /<ContentPanel>\s*<form onSubmit=\{handleSubmit\} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">/)
  assert.doesNotMatch(source, /<section\b|primary-soft|primary-border|CalendarClock|t\("pmCreateTitle"\)|\bmt-4\b/)
})
```

  Existing pins: none changes (`pm-plans-ui` :22-30: four starred fields, four `required`, the notes `Textarea`, the busy submit; `operational-return-navigation` :143; `maintenance-option-select` :15-24).
- [ ] **Step 2: Watch it fail.** `node --test tests/maintenance-sweep-ui.test.ts` → fails: "PM plan form: a plain ContentPanel with no tinted frame and no heading of its own; the page header names the form (spec 2D D9)".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** None to change. FMG `CONSTRAINT_FLOORS` `maintenance-plan-form.tsx: [4, 2, 0]` must still hold (live after: [4, 2, 0]).
- [ ] **Step 5: Verify.** `node --test tests/maintenance-sweep-ui.test.ts tests/pm-plans-ui.test.ts tests/operational-return-navigation.test.ts tests/maintenance-option-select.test.ts tests/maintenance-i18n.test.ts tests/form-frames-ui.test.ts tests/form-migration-guards.test.ts`, then `npm test` (+1: 2153 tests, 2152 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2151 / 2150), `npx tsc --noEmit`, `npm run lint`.
- [ ] **Step 6: Commit.**
  - `git add src/components/maintenance/maintenance-plan-form.tsx tests/maintenance-sweep-ui.test.ts`
  - Message:

```
refactor(ui): the PM plan form in a plain ContentPanel without its tinted frame and repeated heading (2D-4 task 46, MT-3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

### Task 47 (MT-4): The repair-record list (`src/app/[locale]/(dashboard)/maintenance/page.tsx`)

Spec D7, D9 / M25, M22, M29, M33; plan 2D-3 R3 and R4. Both top sections keep their ids: `#pm-due` is the target of the work center and the notification digest, and `#stuck` is pinned. So they move onto `cn(getPanelClasses(), "p-4 sm:p-5")` rather than `ContentPanel` (R4). The stuck section loses its orange fill: its instruction becomes a warning `Notice`, and its rows become quiet groupings with a text link and an outline button. The PM-due list becomes a quiet grouping with `tag` codes. The date-range error becomes a danger `Notice`. The list becomes `ContentPanel divided flush`, and its phone cards become the quiet link of 2D-3. The outcome becomes a `StatusBadge`. Queries, filters, the pager, links, `returnTo` and the export stay the same.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/maintenance/page.tsx` (CRLF)
- Modify: `tests/repair-record-list-ui.test.ts` (CRLF)
- Test: `tests/maintenance-sweep-ui.test.ts` (LF)

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| :4 | `AlertTriangle, CalendarClock` in the lucide import | drop both (`Download`, `Plus`, `Wrench` stay) | — |
| :19 | `import { formatDate } from "@/lib/utils"` | `import { cn, formatDate } from "@/lib/utils"` | — |
| :24 | `import { buttonVariants } …` | `import { buttonVariants, linkVariants } …` | — |
| :36 | `import { getDesktopTableOnlyClasses, getMobileCardListClasses } …` | add `getPanelClasses` | — |
| imports | — | add `ContentPanel`, `Notice` | — |
| after :108 | — | a local arrow `outcomeBadge(outcome: string \| null, status: string)`: `const label = outcomeLabel(outcome, status)`; it returns `null` when `label == null`, otherwise `<StatusBadge label={label} tone={outcome === "usable" ? "success" : outcome === "beyond_repair" ? "warning" : "muted"} />` (R2), with a one-line comment above it (the test does not pin its words), for example `// The outcome is a state badge (plan 2D-4 R2): usable success, beyond repair warning, unknown muted, none Nil.` | M22 |
| :130 | `<section id="stuck" className="rounded-lg border border-warning-border bg-warning-soft p-4">` | `<section id="stuck" className={cn(getPanelClasses(), "p-4 sm:p-5")}>` | R4 |
| :131-133 | `h2` `flex items-center gap-2` with `<AlertTriangle … text-warning />` and `({stuckTotal})` | `<h2 className="text-base font-semibold text-foreground">{t("stuckTitle")} ({formatCount(stuckTotal)})</h2>` | R2 |
| :134 | `<p className="mt-1 text-sm text-muted-foreground">{t("stuckHelp")}</p>` | `<Notice tone="warning" className="mt-3">{t("stuckHelp")}</Notice>` (the attention the fill carried) | D7 |
| :137 | `li` `… rounded-md border border-border bg-surface px-3 py-2` | `… rounded-md border border-border bg-background px-3 py-2` (quiet grouping) | R4 |
| :138 | asset `Link` `inline-flex min-h-11 min-w-0 items-center truncate text-sm font-medium text-foreground hover:text-primary` | `className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 min-w-0 items-center md:min-h-0")}`; the inner `span className="truncate"` stays | M29 (text link) |
| :140 | `{asset.assetTag} - {asset.name} <span className="text-xs text-muted-foreground">(…)</span>` | `<span className="tag">{asset.assetTag}</span> - {asset.name} <span className="text-meta text-muted-foreground">({asset.status.nameTh})</span>`. The state stays text (R18) | M33 |
| :144 | create `Link` `inline-flex min-h-11 shrink-0 … text-xs font-medium hover:bg-accent` | `className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}`. It was `min-h-11` on desktop, so it takes no size (36px from `md`) | M29, DESIGN sizes |
| :151 | `mt-2 text-xs text-muted-foreground` | `mt-2 text-meta text-muted-foreground` | text-xs |
| :155 | `<section id="pm-due" className="rounded-lg border border-border bg-surface p-4">` | `<section id="pm-due" className={cn(getPanelClasses(), "p-4 sm:p-5")}>` | R4 |
| :158-160 | `h2` with `<CalendarClock … text-primary />` and `({duePlans.length})` | `<h2 className="text-base font-semibold text-foreground">{t("pmDueTitle")} ({formatCount(duePlans.length)})</h2>` | R2 |
| :163 | the "จัดการแผน PM" `Link` `buttonVariants({ variant: "outline" })` | unchanged | — |
| :168 | `mt-3 divide-y divide-border rounded-md border border-border` | `mt-3 divide-y divide-border-soft rounded-md border border-border bg-background` (quiet grouping, inner lines `border-soft`) | R4 |
| :175-176 | `truncate text-xs text-muted-foreground` and `{plan.planNo} · {plan.asset.assetTag} - {plan.asset.name}…` | `truncate text-meta text-muted-foreground` and `<span className="tag">{plan.planNo}</span> · <span className="tag">{plan.asset.assetTag}</span> - {plan.asset.name}{plan.vendor ? ` · ${plan.vendor.name}` : ""}` | M33 |
| :182 | record-done `Link` `inline-flex min-h-11 items-center rounded-md bg-primary px-3 text-xs … hover:bg-primary-hover` | `className={buttonVariants()}` (`min-h-11` on desktop → no size) | M29 |
| :225 | `<p role="alert" className="mt-3 rounded-md border border-warning-border bg-warning-soft …">` | `<Notice tone="danger" role="alert" className="mt-3">{t("invalidDateRange")}</Notice>` (a validation error of the filter; the role stays) | D7 |
| :229-241, :336 | `<section className="overflow-hidden rounded-lg border border-border bg-surface">` with a hand-written head (`h2`, the count in `text-xs`, the export `<a>`) | `<ContentPanel divided flush className="overflow-hidden" title={t("listTitle")} description={t("resultCount", { count: total })} actions={canExport ? <a …export…> : undefined}>` (props in this order) … `</ContentPanel>`. The export `<a>` keeps its href, `buttonVariants({ variant: "outline", size: "md" })` and its icon | D9, M25 |
| :243-249 | the two `ActionEmptyState`s in `<div className="p-4">` | unchanged (as the PM page) | — |
| :254 | card `Link` `block min-w-0 rounded-md border border-border bg-background p-3 hover:bg-accent` | `block min-w-0 rounded-md border border-border bg-background p-3 transition-colors hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` (the quiet grouping link of the supplier page, 2D-3) | R4 |
| :260, :265, :294 | `text-xs` | `text-meta` | text-xs |
| :300-302 | `DataTableCell` with `text-warning` / `text-success` / `text-muted-foreground` and `orNil(outcomeLabel(…))` | `<DataTableCell className="whitespace-nowrap">{orNil(outcomeBadge(record.outcome, record.repairStatus))}</DataTableCell>` | M22 |

- [ ] **Step 1: The failing test.** Append:

```ts

const D = "src/app/[locale]/(dashboard)/"

test("repair-record list: the stuck and PM-due sections keep their ids on the panel classes with a warning Notice and quiet rows, the list is a divided ContentPanel, and outcomes are StatusBadges (spec 2D D7, D9, M22, M25, M29, M33)", () => {
  const source = read(`${D}maintenance/page.tsx`)
  assert.match(source, /<section id="stuck" className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}>\n\s+<h2 className="text-base font-semibold text-foreground">\{t\("stuckTitle"\)\} \(\{formatCount\(stuckTotal\)\}\)<\/h2>/)
  assert.match(source, /<Notice tone="warning" className="mt-3">\{t\("stuckHelp"\)\}<\/Notice>/)
  assert.match(source, /<li key=\{asset\.id\} className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">/)
  assert.match(source, /<span className="tag">\{asset\.assetTag\}<\/span> - \{asset\.name\} <span className="text-meta text-muted-foreground">\(\{asset\.status\.nameTh\}\)<\/span>/)
  assert.match(source, /className=\{cn\(buttonVariants\(\{ variant: "outline" \}\), "shrink-0"\)\}>\n\s+\{t\("createTitle"\)\}/)
  assert.match(source, /<section id="pm-due" className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}>/)
  assert.match(source, /<h2 className="text-base font-semibold text-foreground">\{t\("pmDueTitle"\)\} \(\{formatCount\(duePlans\.length\)\}\)<\/h2>/)
  assert.match(source, /<ul className="mt-3 divide-y divide-border-soft rounded-md border border-border bg-background">/)
  assert.match(source, /<span className="tag">\{plan\.planNo\}<\/span> · <span className="tag">\{plan\.asset\.assetTag\}<\/span> - \{plan\.asset\.name\}/)
  assert.match(source, /href=\{appendOperationalReturnTo\(`\/\$\{locale\}\/maintenance\/new\?planId=\$\{plan\.id\}`, returnHref\)\} className=\{buttonVariants\(\)\}/)
  assert.match(source, /<Notice tone="danger" role="alert" className="mt-3">\{t\("invalidDateRange"\)\}<\/Notice>/)
  assert.match(source, /<ContentPanel\s+divided\s+flush\s+className="overflow-hidden"\s+title=\{t\("listTitle"\)\}\s+description=\{t\("resultCount", \{ count: total \}\)\}\s+actions=\{/)
  assert.match(source, /className="block min-w-0 rounded-md border border-border bg-background p-3 transition-colors hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"/)
  assert.match(source, /<StatusBadge label=\{label\} tone=\{outcome === "usable" \? "success" : outcome === "beyond_repair" \? "warning" : "muted"\} \/>/)
  assert.match(source, /<DataTableCell className="whitespace-nowrap">\{orNil\(outcomeBadge\(record\.outcome, record\.repairStatus\)\)\}<\/DataTableCell>/)
  assert.doesNotMatch(source, /AlertTriangle|CalendarClock|bg-warning-soft|border-warning-border|text-(?:warning|success|primary)\b|hover:bg-accent|hover:text-primary|\bbg-primary\b|\btext-xs\b|rounded-lg|divide-border(?![\w-])|<section className=/)
})
```

  Existing pin to edit, `tests/repair-record-list-ui.test.ts` :27 (the stuck link's 44px box is now in the `cn(…)` string):
  - old: ``  assert.match(source, /href=\{`\/\$\{locale\}\/assets\/\$\{asset\.id\}`\}\s+className="[^"]*min-h-11/)``
  - new: ``  assert.match(source, /href=\{`\/\$\{locale\}\/assets\/\$\{asset\.id\}`\}\s+className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 min-w-0 items-center md:min-h-0"\)\}/)``

  These stay true unchanged: `list-pages-ui` :411-432 (the parts list, the `space-y-6` root and `PageHeader`, the `DataTable` line, the cost cells, the empty states), `maintenance-pagination-ui` :8-24, `list-filters-ui` :77-89, `repair-record-list-ui` :16-23 (`id="pm-due"`, `id="stuck"`), `operational-return-navigation` :20-26. `maintenance-contrast` still passes, because the record page keeps `text-success` and `text-warning` until MT-5.

  Then append the Review Focus 1 test (a long Thai label in a compact row on a phone) to the same file, after the test above (it reads `D`):

```ts

test("review focus 1: a stuck asset with a long Thai name stays one cut line beside its button on a 375px phone (plan 2D-4)", () => {
  const source = read(`${D}maintenance/page.tsx`)
  const start = source.indexOf("{stuckAssets.map((asset) => (")
  const row = source.slice(start, source.indexOf('{t("createTitle")}', start))
  assert.match(row, /<li key=\{asset\.id\} className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">/)
  assert.match(row, /className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 min-w-0 items-center md:min-h-0"\)\}>\n\s+<span className="truncate">\n\s+<span className="tag">\{asset\.assetTag\}<\/span>/)
  assert.match(row, /className=\{cn\(buttonVariants\(\{ variant: "outline" \}\), "shrink-0"\)\}/, "the button keeps its width; the name gives way")
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/maintenance-sweep-ui.test.ts tests/repair-record-list-ui.test.ts` → fails: "repair-record list: the stuck and PM-due sections keep their ids on the panel classes with a warning Notice and quiet rows, the list is a divided ContentPanel, and outcomes are StatusBadges (spec 2D D7, D9, M22, M25, M29, M33)" and "the stuck-asset link has a 44px touch target".
  Also expected to fail: "review focus 1: a stuck asset with a long Thai name stays one cut line beside its button on a 375px phone (plan 2D-4)" (the row and link classes are the old ones).
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** None. The file is in LFG `MIGRATED_LIST_FILES` with no `KEEP` row: every LFG count must stay 0, so add no typed `"-"`, no `toLocaleString()` and no `aria-current="page"`. No VFG or FMG row; the FMG checks that read every file (GB4 busy and disabled, GD2-GD6 dialogs and forms) find nothing new here.
- [ ] **Step 5: Verify.** `node --test tests/maintenance-sweep-ui.test.ts tests/repair-record-list-ui.test.ts tests/list-pages-ui.test.ts tests/maintenance-pagination-ui.test.ts tests/list-filters-ui.test.ts tests/operational-return-navigation.test.ts tests/maintenance-contrast.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`, then `npm test` (+2: 2155 tests, 2154 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2153 / 2152), `npx tsc --noEmit`, `npm run lint`.
- [ ] **Step 6: Commit.**
  - `git add "src/app/[locale]/(dashboard)/maintenance/page.tsx" tests/maintenance-sweep-ui.test.ts tests/repair-record-list-ui.test.ts`
  - Message:

```
refactor(ui): the repair-record list's stuck and PM-due sections on the panel classes, the list in a divided ContentPanel and outcome badges (2D-4 task 47, MT-4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

### Task 48 (MT-5): The repair record page (`src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx`)

Spec D7, D9 / M25, M21, M22, M29; plan 2D-3 R3 and R4. The detail, legacy and asset sections and the disposal review become `ContentPanel`s. The history section keeps `id="history"` (the `ActionBar`'s `#history` link) on the panel classes; its marker becomes a status shape and its empty state an `EmptyNote` (a title alone is one line). The outcome becomes a `StatusBadge`. The orange disposal-review panel becomes a `ContentPanel` holding a warning `Notice`, with the request link in the Notice's `action` slot. The two hand-written outline links become `buttonVariants`. This is the commit that removes the last tone-colored text of the maintenance files, so the `maintenance-contrast` test changes with it. The header, `ActionBar`, `KeyValueList`s (4), attachments, links and data stay the same.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx` (CRLF)
- Modify: `tests/maintenance-contrast.test.ts` (CRLF)
- Test: `tests/maintenance-sweep-ui.test.ts` (LF)

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| :4 | `AlertTriangle` in the lucide import | drop it (`FileText`, `History`, `Printer` stay for the `ActionBar`; `Trash2` stays) | — |
| :9 | `import { formatDate, formatDateTime } from "@/lib/utils"` | add `cn` | — |
| imports | `ActionEmptyState` (:18) | delete it; add `getPanelClasses` (`@/lib/design-system`), `statusMarkerVariants` (`@/components/ui/badge-variants`), `ContentPanel`, `EmptyNote`, `Notice` | — |
| :157-158, :183 | `<section className="rounded-lg border border-border bg-surface p-6">`, `h2` `mb-5 text-lg` | `<ContentPanel title={t("detailTitle")}>` … `</ContentPanel>`; the `KeyValueList` and the `TextBlock` grid (`mt-5`) stay | D9 |
| :165-167 | `<span className={ticket.outcome === "usable" ? "text-success" : … "text-warning" : undefined}>{outcomeLabel}</span>` | `<StatusBadge label={outcomeLabel} tone={ticket.outcome === "usable" ? "success" : ticket.outcome === "beyond_repair" ? "warning" : "muted"} />` (`null` still shows `Nil`) | M22, R2 |
| :186-189 | legacy `section` + `h2` | `<ContentPanel title={t("legacyTitle")}>` | D9 |
| :192-195 | `<section id="history" className="scroll-mt-6 rounded-lg border border-border bg-surface p-6">`, `h2` `mb-5 flex … text-lg` with `<History className="h-5 w-5 text-primary" />` | a comment line `{/* The ActionBar's #history link scrolls here, and ContentPanel takes no id: the panel classes (2D-2 R4). */}` above `<section id="history" className={cn(getPanelClasses(), "scroll-mt-6 p-4 sm:p-5")}>` (as Task 40), and `<h2 className="mb-4 text-base font-semibold text-foreground">{t("history")}</h2>` | R4 |
| :197 | `<ActionEmptyState icon={<History className="h-6 w-6" />} title={t("historyEmpty")} />` | `<EmptyNote>{t("historyEmpty")}</EmptyNote>` (one line → EmptyNote) | M21 |
| :202 | `<span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-primary" />` | `<span aria-hidden="true" className={cn(statusMarkerVariants({ tone: "primary" }), "absolute top-2 -left-1")} />` (the movement timeline's marker, 2D-3 R3) | M22 |
| :203 | `rounded-md bg-background p-4` | unchanged (the timeline's well, as 2D-3) | — |
| :213 | `text-xs text-muted-foreground` | `text-meta text-muted-foreground` | text-xs |
| :232-233, :251 | asset `section` + `h2` `text-lg` | `<ContentPanel title={t("assetSection")}>` … `</ContentPanel>` | D9 |
| :247 | `Link` `inline-flex min-h-11 w-full … rounded-md border border-border bg-surface px-3 text-sm font-medium hover:bg-accent` | `className={cn(buttonVariants({ variant: "outline" }), "w-full")}` (`min-h-11` → no size) | M29 |
| :254-266 | tinted `section` (`border-warning-border bg-warning-soft p-6`), `h2` with `AlertTriangle`, three lines in `space-y-2 text-sm text-muted-foreground`, a warning-colored request `Link` with `Trash2` | `<ContentPanel title={t("disposalReviewTitle")}>` holding `<Notice tone="warning" action={<Link href={disposalRequestHref} className={buttonVariants({ variant: "outline", size: "md" })}><Trash2 aria-hidden="true" />{t("openDisposalRequest")}</Link>}>`, with the same three lines as `<p>` children (count, cost, and the ratio while `purchasePrice > 0`) | D7, M29 |
| :269-271 | `<div id="attachments" className="scroll-mt-6">` | unchanged | — |
| :278-287 | `TextBlock` | unchanged (R18) | — |

- [ ] **Step 1: The failing test.** Append:

```ts

test("repair record page: ContentPanels, the history section on the panel classes with status markers and EmptyNote, the outcome as a StatusBadge, a warning Notice with its action, and outline links (spec 2D D7, D9, M21, M22, M25, M29)", () => {
  const source = read(`${D}maintenance/[id]/page.tsx`)
  for (const title of ["detailTitle", "legacyTitle", "assetSection", "disposalReviewTitle"]) {
    assert.match(source, new RegExp(`<ContentPanel title=\\{t\\("${title}"\\)\\}>`), title)
  }
  assert.match(source, /<section id="history" className=\{cn\(getPanelClasses\(\), "scroll-mt-6 p-4 sm:p-5"\)\}>\n\s+<h2 className="mb-4 text-base font-semibold text-foreground">\{t\("history"\)\}<\/h2>/)
  assert.match(source, /<EmptyNote>\{t\("historyEmpty"\)\}<\/EmptyNote>/)
  assert.match(source, /<span aria-hidden="true" className=\{cn\(statusMarkerVariants\(\{ tone: "primary" \}\), "absolute top-2 -left-1"\)\} \/>/)
  assert.match(source, /<StatusBadge label=\{outcomeLabel\} tone=\{ticket\.outcome === "usable" \? "success" : ticket\.outcome === "beyond_repair" \? "warning" : "muted"\} \/>/)
  assert.match(source, /<Notice\s+tone="warning"\s+action=\{\s*<Link href=\{disposalRequestHref\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.match(source, /<Link href=\{`\/\$\{locale\}\/assets\/\$\{ticket\.asset\.id\}`\} className=\{cn\(buttonVariants\(\{ variant: "outline" \}\), "w-full"\)\}>/)
  assert.doesNotMatch(source, /ActionEmptyState|AlertTriangle|rounded-lg|rounded-full|bg-warning-soft|border-warning-border|text-(?:warning|success|primary)\b|hover:bg-accent|\btext-lg\b|\btext-xs\b|<section className=/)
})
```

  Existing pin to edit, `tests/maintenance-contrast.test.ts`. After this commit no maintenance file has tone-colored copy of its own, so the test's two `match` lines would fail.
  - :6 old: `test("maintenance warning and success copy uses AA status ink", async () => {`
  - :6 new: `test("maintenance copy carries no tone color of its own: tones live in StatusBadge and Notice (spec 2D D7, M22)", async () => {`
  - :16-17 old:

```ts
  assert.match(source, /text-warning\b/)
  assert.match(source, /text-success\b/)
```

  - :16 new (one line; :15, the `-foreground` check, stays):

```ts
  assert.doesNotMatch(source, /\btext-(?:warning|success|danger|info)\b/, "a tone on screen is a StatusBadge or a Notice, which bring the AA status ink")
```

  These stay true unchanged: `repair-record-detail-ui` :32-50 and :81-90 (`KeyValueList` still ×4, no `"-"`, no `ArrowLeft`, the `actionBarPagePadding` root), `maintenance-attachments-ui` :14-18, `mobile-action-bar` :48-66 (the `ActionBar` import line and the root), `operational-return-navigation` :20-33, `breadcrumbs-ui` :54 and `disposal-route-structure` :38-43 (the disposal link's query).
- [ ] **Step 2: Watch it fail.** `node --test tests/maintenance-sweep-ui.test.ts tests/maintenance-contrast.test.ts` → fails: "repair record page: ContentPanels, the history section on the panel classes with status markers and EmptyNote, the outcome as a StatusBadge, a warning Notice with its action, and outline links (spec 2D D7, D9, M21, M22, M25, M29)" and "maintenance copy carries no tone color of its own: tones live in StatusBadge and Notice (spec 2D D7, M22)".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** None. The file is in LFG `MIGRATED_LIST_FILES` with no `KEEP` row (its LB1 row went in 2D-1); keep every count 0. No VFG or FMG row.
- [ ] **Step 5: Verify.** `node --test tests/maintenance-sweep-ui.test.ts tests/maintenance-contrast.test.ts tests/repair-record-detail-ui.test.ts tests/maintenance-attachments-ui.test.ts tests/mobile-action-bar.test.ts tests/operational-return-navigation.test.ts tests/breadcrumbs-ui.test.ts tests/disposal-route-structure.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`, then `npm test` (+1: 2156 tests, 2155 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2154 / 2153), `npx tsc --noEmit`, `npm run lint`.
- [ ] **Step 6: Commit.**
  - `git add "src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx" tests/maintenance-sweep-ui.test.ts tests/maintenance-contrast.test.ts`
  - Message:

```
refactor(ui): the repair record page on ContentPanel, status markers, EmptyNote and a warning Notice for the disposal review (2D-4 task 48, MT-5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

### Task 49 (MT-6): The PM plans page (`src/app/[locale]/(dashboard)/maintenance/pm/page.tsx`)

Spec M22 and 2D-2 R2 (`Chip` names a cadence; "report cadences" are its listed users). The plan's frequency ("รายเดือน", "รายไตรมาส" …) is not a state, so its muted `StatusBadge` becomes a `Chip`. The row's sub-line moves from `text-xs` to `text-meta`. The due-state and plan-state badges, the row buttons, paging by state and the links stay the same.

**Files:**
- Modify: `src/app/[locale]/(dashboard)/maintenance/pm/page.tsx` (CRLF)
- Test: `tests/maintenance-sweep-ui.test.ts` (LF)

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| imports | — | add `import { Chip } from "@/components/ui/chip"` directly after `import { buttonVariants } from "@/components/ui/button-variants"` (path order) | — |
| :111 | `mt-1 truncate text-xs text-muted-foreground` | `mt-1 truncate text-meta text-muted-foreground` | text-xs |
| :121 | `<StatusBadge label={t(`pmFrequencies.${plan.frequency}`)} tone="muted" />` | `<Chip>{t(`pmFrequencies.${plan.frequency}`)}</Chip>` | M22, 2D-2 R2 |

- [ ] **Step 1: The failing test.** Append:

```ts

test("PM plans page: the frequency is a Chip (a cadence, not a state), and the row's sub-line is text-meta (spec 2D M22, 2D-2 R2)", () => {
  const source = read(`${D}maintenance/pm/page.tsx`)
  assert.match(source, /<Chip>\{t\(`pmFrequencies\.\$\{plan\.frequency\}`\)\}<\/Chip>/)
  assert.match(source, /<div className="mt-1 truncate text-meta text-muted-foreground">\n\s+<span className="tag">\{plan\.planNo\}<\/span>/)
  assert.doesNotMatch(source, /pmFrequencies[^\n]*tone=|\btext-xs\b/)
})
```

  Existing pins: none changes (`list-pages-ui` :434-460, `pm-plans-ui` :5-10, `maintenance-plan-routes` :20, `breadcrumbs-ui` :65).
- [ ] **Step 2: Watch it fail.** `node --test tests/maintenance-sweep-ui.test.ts` → fails: "PM plans page: the frequency is a Chip (a cadence, not a state), and the row's sub-line is text-meta (spec 2D M22, 2D-2 R2)".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** None (in LFG `MIGRATED_LIST_FILES`, no `KEEP` row; counts stay 0).
- [ ] **Step 5: Verify.** `node --test tests/maintenance-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/pm-plans-ui.test.ts tests/maintenance-plan-routes.test.ts tests/breadcrumbs-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`, then `npm test` (+1: 2157 tests, 2156 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2155 / 2154), `npx tsc --noEmit`, `npm run lint`.
- [ ] **Step 6: Commit.**
  - `git add "src/app/[locale]/(dashboard)/maintenance/pm/page.tsx" tests/maintenance-sweep-ui.test.ts`
  - Message:

```
refactor(ui): the PM plan frequency as a Chip and its sub-line in text-meta (2D-4 task 49, MT-6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

### Task 50 (MT-7): The repair print page shows the cost through formatMoney (`src/app/[locale]/(print)/maintenance/[id]/print/page.tsx`)

Spec D10, M24 (1 site). The cost is `formatMoney` as on the screen: the record page's `KeyValueList` shows `formatMoney(Number(ticket.repairCost))` with no unit, because the label `repairRecord.cost` already reads "ค่าใช้จ่ายรวม (บาท)" / "Total cost (THB)". The printout now shows "1,234.00" where it showed "฿1,234.00". An empty cost stays `null`, which the shared print component prints as "-" (print pages keep "-", spec §5.3). Everything else on the page stays the same.

**Files:**
- Modify: `src/app/[locale]/(print)/maintenance/[id]/print/page.tsx` (CRLF)
- Modify: `tests/list-frame-guards.test.ts` (CRLF)
- Test: `tests/maintenance-sweep-ui.test.ts` (LF)

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| :5 | `import { formatCurrency, formatDate } from "@/lib/utils"` | `import { formatDate } from "@/lib/utils"`, then a new line `import { formatMoney } from "@/lib/display-format"` | — |
| :63 | `value: ticket.repairCost == null ? null : formatCurrency(Number(ticket.repairCost))` | `value: ticket.repairCost == null ? null : formatMoney(Number(ticket.repairCost))` (no unit, R16) | D10, M24 |

- [ ] **Step 1: The failing test.** Append:

```ts

const P = "src/app/[locale]/(print)/"

test("repair print page: the cost goes through formatMoney, as on the screen, without a unit (its label ends in บาท) (spec 2D D10, M24)", () => {
  const source = read(`${P}maintenance/[id]/print/page.tsx`)
  assert.match(source, /^import \{ formatDate \} from "@\/lib\/utils"$/m)
  assert.match(source, /^import \{ formatMoney \} from "@\/lib\/display-format"$/m)
  assert.match(source, /\{ label: tRecord\("cost"\), value: ticket\.repairCost == null \? null : formatMoney\(Number\(ticket\.repairCost\)\) \}/)
  assert.doesNotMatch(source, /formatCurrency/)
})
```

  Existing pins: none changes (`repair-record-detail-ui` :52-56).
- [ ] **Step 2: Watch it fail.** `node --test tests/maintenance-sweep-ui.test.ts` → fails: "repair print page: the cost goes through formatMoney, as on the screen, without a unit (its label ends in บาท) (spec 2D D10, M24)".
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard rows.** LFG `LV3` (live count 1 → 0; delete the row from both tables).
  - **Precondition:** Task 43 (DS-14) ran first, so this file's row is the only one left. If `BUDGETS.LV3` still has the disposal print row, stop and report: MT-8 cannot run either.
  - `BUDGETS` (`:271-275` at `45c1409`; after Task 43, `:276-279` when this task runs; find it by its text):

```ts
  LV3: {
    // no 2B plan: KEEP holds these (2C plan 4, 2D or phase 3)
    "src/app/[locale]/(print)/maintenance/[id]/print/page.tsx": 1, // → 1 (KEEP): print page, 2D (A/08:305)
  },
```

    becomes the empty group, like `LV1` after 2D-3. The group comment goes with its last row; if Task 43 already removed it, only the row goes.

```ts
  LV3: {
  },
```

  - `KEEP` (`:328-331` at `45c1409`; after Task 43, `:326-328` when this task runs, before the `BUDGETS` edit):

```ts
  LV3: {
    "src/app/[locale]/(print)/maintenance/[id]/print/page.tsx": 1, // print page, 2D (A/08:305)
  },
```

    Delete it, all three lines, as `KEEP.LV1` and `KEEP.LT1` went in 2D-3. L9 compares only non-empty groups, so `BUDGETS.LV3 {}` equals the missing `KEEP.LV3`.
  - `FORMAT_CURRENCY` (`:155`), the `LV3` counter (`:181` at `45c1409`, `:191` when this task runs), `TITLES.LV3` (`:203`, `:213`) and the reader test line (`:350`, `:344` before this task's edits and `:339` after them) stay. The guard holds the count at 0 until 2D-5 widens it.
- [ ] **Step 5: Verify.** `node --test tests/maintenance-sweep-ui.test.ts tests/repair-record-detail-ui.test.ts tests/list-frame-guards.test.ts`, then `npm test` (+1: 2158 tests, 2157 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2156 / 2155), `npx tsc --noEmit`, `npm run lint`.
- [ ] **Step 6: Commit.**
  - `git add "src/app/[locale]/(print)/maintenance/[id]/print/page.tsx" tests/maintenance-sweep-ui.test.ts tests/list-frame-guards.test.ts`
  - Message:

```
refactor(ui): the repair print page shows the cost through formatMoney, as on the screen (2D-4 task 50, MT-7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

### Task 51 (MT-8): Delete formatCurrency (`src/lib/utils.ts`)

Spec §4.1 and D10: `formatCurrency` has no caller once both print pages use `formatMoney` (the disposal print page from Task 43 (DS-14), the repair print page from MT-7). Nothing else in `src/lib/utils.ts` changes.

**Files:**
- Modify: `src/lib/utils.ts` (i/lf w/lf = LF)
- Test: `tests/maintenance-sweep-ui.test.ts` (LF)

**Interfaces:** consumes Task 43 (DS-14) (no `formatCurrency(` left in `P/disposal/[id]/print/page.tsx`) and MT-7.

**Before you delete (spec §4.1: grep `src` and `tests`):**
- `git grep -n "formatCurrency" -- src` must print only `src/lib/utils.ts:43:export function formatCurrency(value: number | null | undefined): string {`. Anything else means a caller is left: stop and report.
- `git grep -n "formatCurrency" -- tests` prints only pins that name it without importing it. They all stay:
  - the `doesNotMatch` pins: `asset-detail-ux.test.ts:176`, `asset-register-table-ui.test.ts:259`, `disposal-detail-workspace.test.ts:117`, `disposal-sweep-ui.test.ts:154` (Task 43), `list-pages-ui.test.ts:617` and `:633`, `maintenance-sweep-ui.test.ts:108` (Task 50), `repair-record-detail-ui.test.ts:89`, `reports-adaptive-ui.test.ts:209` and `:228`;
  - `list-frame-guards.test.ts:155` (`FORMAT_CURRENCY`), `:213` (`TITLES.LV3`) and `:339` (the reader test on a made-up source string); at `45c1409` they were `:155`, `:203` and `:350`.
  - No test imports `formatCurrency`.

**Changes at 45c1409:**

| line | now | becomes | rule |
|---|---|---|---|
| :42-49 | the blank line and `export function formatCurrency(value: number \| null \| undefined): string { … }` (8 lines) | delete them. The file then ends with `formatDateTime`'s closing `}` and one LF | §4.1, D10 |

- [ ] **Step 1: The failing test.** Append:

```ts

test("formatCurrency is gone from src/lib/utils.ts once both print pages show money through formatMoney (spec 2D D10, §4.1)", () => {
  assert.doesNotMatch(read("src/lib/utils.ts"), /formatCurrency/)
  for (const path of [`${P}disposal/[id]/print/page.tsx`, `${P}maintenance/[id]/print/page.tsx`]) {
    const source = read(path)
    assert.match(source, /\bformatMoney\(/, path)
    assert.doesNotMatch(source, /formatCurrency/, path)
  }
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/maintenance-sweep-ui.test.ts` → fails only: "formatCurrency is gone from src/lib/utils.ts once both print pages show money through formatMoney (spec 2D D10, §4.1)". This holds if Task 43 (DS-14) and Task 50 (MT-7) are in. If its print-page assertions fail, a page still calls `formatCurrency`: stop.
- [ ] **Step 3: Implement** per the Changes table (an exact-text deletion; the file is LF).
- [ ] **Step 4: Guard rows.** None: LV3 counts calls, and its rows went in Task 50 (MT-7) and Task 43 (DS-14). VFG and FMG do not read `src/lib/utils.ts` for this.
- [ ] **Step 5: Verify.** `node --test tests/maintenance-sweep-ui.test.ts tests/list-frame-guards.test.ts tests/class-merge.test.ts tests/design-system.test.ts tests/status-badge.test.ts tests/choice-controls-ui.test.ts tests/field-primitives.test.ts` (the last five import `cn` from `src/lib/utils.ts`), then `npm test` (+1: 2159 tests, 2158 pass, 0 fail, 1 skipped; the dry run, without Task 4, counted 2157 / 2156), `npx tsc --noEmit` (no import of `formatCurrency` is left), `npm run lint`.
- [ ] **Step 6: Commit.**
  - `git add src/lib/utils.ts tests/maintenance-sweep-ui.test.ts`
  - Message:

```
refactor: delete formatCurrency, which has no caller left after the print pages moved to formatMoney (2D-4 task 51, MT-8)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

### Task 52: Verify, production build and dev-app check (controller runs this task, not an implementer)

**Files:**
- Create then delete: your own launch configuration (temporary; never committed; leave any other session's `.claude/` content alone).
- Evidence: `.superpowers/sdd/screenshots/ui-phase2d-plan4/after/` and `.superpowers/sdd/ui-phase2d-plan4/task-52-findings.md` (git-ignored).
- Modify: only files needed to fix problems found here. Each fix gets its own small commit with a test where one is possible, through an implementer and the normal review.

**Interfaces:**
- Consumes: Tasks 1–51 committed; the Task 0 baseline, ids, `href` lists, measurements and before images.
- Produces: `task-52-findings.md`, which Task 53 turns into the "Dev-app check" bullets.

- [ ] **Step 1: Full verify.** Run `npm run verify` (lint, tests, build). Record the test count (expected 2159, 2158 pass, 0 fail, 1 skipped) and the build page count (60/60 at `45c1409`; this plan adds no route).
- [ ] **Step 2: Production server.**
  - Add a launch configuration `name: "asset-2d4-start-3101"`, `runtimeExecutable: "node"`, `runtimeArgs: ["node_modules/next/dist/bin/next", "start", "-p", "3101"]`, `port: 3101`, `autoPort: false` (another free port if 3101 is taken; say which).
  - Start it with `preview_start` and log in with the seed admin; do not echo the password.
  - Prefer `waitUntil: "load"` plus a short wait over `networkidle`. Playwright code runs inline (`browser_run_code_unsafe`); a file you must create goes under `.playwright-mcp/` and is deleted right after the run.
- [ ] **Step 3: Write nothing.**
  - Open every dialog, sheet, drawer and disclosure to its first screen and close it with ยกเลิก, the X or Esc.
  - Never press: a scanner save, "พบ", "พบครบทุกชิ้น", "ไม่พบ", "บันทึกเป็นนอกขอบเขต", "ส่งตอนนี้", "ลบออกจากคิว"; a review approve or reject, a plan, a close, the round close or cancel; the transaction cancel confirm; the legacy backfill; a disposal decision, execution or bulk confirm; a repair save, upload or delete; a PM "done"; print or "record print" (use print preview through `emulateMedia({ media: "print" })`). Forms are opened, tabbed through and left without saving.
  - Count POST, PUT, PATCH and DELETE requests while you work. Expected: 0, apart from these read-only previews, which you list by path: `POST /api/audit-rounds/<id>/scan-lookup` (the lookup card), `POST /api/audit-rounds/preview` (only if you press the round form's preview), and `POST /api/disposal-requests/bulk-decision` or `bulk-execution` whose body has `"mode":"preview"` (read the body; a commit body is a failure).
- [ ] **Step 4: Screens.** Take every Task 0 view again under the same name in `after/` and compare with `before/`. Check in Thai at 1440, 768 and 375:
  - **No wrapping, truncation or overlap** that was not there before; no horizontal page scroll at 375. Green, orange and red appear only in `StatusBadge`s, `Notice` icons and boxes, `StatStrip` attention feet, danger buttons and the audit inks R3 keeps; teal only in the info ring and the info `Notice` icon.
  - **Links:** every Task 0 page has the same `href`s in the same order with the same text, except the intended change of Task 2 (the asset page's links to a section of another view are now `?view=…&returnTo=…#section`). List each difference.
  - **Audit pages:** the rounds list (state badges: closed a green dot, draft a grey bar; the next-actions strip with the warning foot on findings; the coverage panel with frameless gap lists and the 3-column phone cards; outline workflow buttons with counts; "ทรัพย์สินทั้งหมด" for a round without scope); the round page (the cancelled panel with its info line and facts; the progress bar in its panel with the marker legend; the result list head without a frame; `Chip`s and info `Notice`s on the correction lines; the close checklist strip: counts link while above 0, the closer rule a neutral line only while it blocks; the cancel dialog's impact list and warning); the round form (the sampling grouping, the `StatStrip` preview with the risk row, the include-closed `ChoiceCard`: Enter on it sends no POST); the findings page at 1440 and 1280×800 (8 columns as before, cells wrap at most one more line; phone cards with the values in the fact list and evidence as text links; the batch panel's `ChoiceCard`s; the review dialogs: approve a warning box, reject a neutral line); the pending page (the count panel, `KeyValueList` phone cards, `tag` codes).
  - **Disposal:** the queue (the phone filter on the panel classes, phone cards with a label/value list, a grey type `Chip` and a frameless "รายละเอียดเพิ่มเติม" row, text links at least 44px tall at 375); the request page (the source batch info line with its outline button, the exception warning with its facts below, the remarks as list rows, the history markers, the outline open-asset button; the `ActionBar`'s `#history` link scrolls to the history panel); the batch history and the batch page (flush panels with shared rows); the evidence panel (outline download, a red icon delete: do not click); the asset picker on `/th/disposal/batch/new` (outline remove buttons, one lined list, the empty note); the bulk dialogs if the data has pending or approved requests (inset quiet bars; errors as red boxes; five counts in one strip at 1440 and 375 with no value cut; outcome badges); the print page in print preview ("1,500.00 บาท"; Review Focus 2: a request without sale values prints "-").
  - **Maintenance:** the repair list (`#stuck` and `#pm-due` on the panel classes; the stuck warning `Notice`; Review Focus 1: a stuck asset with a long name cuts with an ellipsis beside its button at 375; the PM-due codes as `tag`; an end date before the start date shows the red `Notice`; the list a divided panel; phone cards; outcome badges); the record page (panels; the history markers and, for a record without history, the faint line; the outcome badge; the disposal review's warning `Notice` with its outline button; the outline asset link); the attachments (the warning lock on a closed record, the empty note, the plain count; the thumbnail opens the preview and Esc closes it; do not delete); the repair form (the reporter hint under its select, read through `aria-describedby`; the disclosure's `aria-expanded` flips; the quiet grouping); the PM form without its heading on new and edit; the PM page's frequency `Chip`; the repair printout in print preview ("1,234.00").
  - **Transactions:** the four forms at 16/20px panel padding; the check-in (two fact lists with "—" for empty values and codes as `tag`; the repair choice shows the info line and the problem field; no box around the photo group; the legacy list if the data has candidates; the empty state if no handover waits); the document pages (back outline, icon only at 375; print a 36px button from `md`; Review Focus 5: print preview shows no toolbar and the signature row on page 1; a void document keeps its banner and watermark); Review Focus 3: the cancel dialog on a transaction with blockers keeps confirm and reason disabled under the warning box.
  - **Per-task notes from the tasks** (read-only, dev DB):
    - **Task 1 (OP-1).** At 720×450 (Chrome device toolbar, or 200% zoom of a 1440×900 window) open `/th/assets/<id>` (a user with asset edit, so the bar shows), `/th/maintenance/<id>`, `/th/audit/rounds/<id>` and `/th/disposal/<id>` (a pending or approved request if the dev data has one, for the next step; wiki 38 says dev has only disposed requests, then record it as not checkable). For each: `document.querySelector('[data-slot="action-bar"]').getBoundingClientRect().height` before and after (expected 69 → 57, the disposal bar with a next step 121 → 57); every link and the next-step button 44px tall; labels end in an ellipsis rather than overflow; Tab shows the focus ring inside the bar; scroll to the end of each page: the last content clears the bar. At 375×812 the bar is unchanged (69px; disposal with a next step 121px, two rows). At 768×1024 there is no bar. Forced colors: the bar's top line shows.
    - **Task 2 (OP-2).** On `/th/assets/<id>` (overview, a user with asset edit): the responsibility data-health row once it is done ("มีผู้ถือครอง" on a personal asset; the "ความครบถ้วนของข้อมูล" details show while another item is missing) opens `?view=custody&returnTo=…#ownership`; the "ตรวจนับ" quick action opens `?view=audit…#audit` scrolled to the section; the follow-ups "ใบซ่อมค้างอยู่" and "ผลตรวจนับต้องติดตาม" open the operations and audit views. At 375 in the custody view, a component asset's bar item opens `#components` in place; a software license's renew item in the audit view opens `?view=overview…#purchase`. After each jump the back button still returns to the list the user came from.
    - **Task 3 (OP-3).** Open the dialog from an asset's ⋯ "ยกเลิกรายการ" (and from a check-out document's toolbar) on an active transaction; with blockers it shows the orange box with the reasons and a disabled confirm; type 1-4 characters and confirm on a transaction without blockers: the red box appears at the top of the body and focus goes to the reason; close with Cancel. Do not confirm a valid cancellation (it writes).
    - **Task 4 (OP-4).** Open `/th/asset-management/checkouts/<id>`, `checkins/<id>` and `transfers/<id>` at 1440 and 375: back is the outline button (icon only at 375) and returns to `returnTo` or the asset; print preview (`emulateMedia({ media: "print" })`, never the print button) shows no toolbar and the signature row on page 1 (A4); a void document still shows its banner and watermark; with edit permission on an active transaction the cancel dialog shows "—" for a missing state (if the dev data has an old transaction without a snapshot).
    - **Task 5 (OP-5).** `/th/asset-management/checkout`, `/transfer`, `/bulk-move` at 1440 and 375: the panel is 16px padded on phones and 20px from `sm`; the review dialog still opens from the check-out and transfer submit; on bulk move, a search with no match shows the one faint line.
    - **Task 6 (OP-6).** `/th/asset-management/checkin` at 1440, 768 and 375: with handovers waiting, pick one and read the two fact lists ("—" for an empty serial or remark, the document number and tag as code); choose the repair status: the info line and the problem field appear; the photo group has no box. If the dev data has legacy candidates: the orange notice, the count, the search (a miss shows the one line), rows with the grey "ข้อมูลเก่า" chip. With no handover waiting (if the dev data allows): the centered empty state with the outline "ไปหน้าส่งมอบ". English once.
    - **Task 7 (AS-1).**
      1. Playwright with the mobile preset (390×664, touch), the seed admin, `/th/audit/rounds/<an open round with pending items>/scan`. Before (at `45c1409`) and after (at the Task 19 (AS-13) commit), same steps.
      2. Dismiss the room picker if it opens (Esc). Tap a pending row: the bottom sheet opens.
      3. Tap "หมายเหตุ / รูป" (after AS-2 an outline button with `aria-expanded="true"`), then tap the textarea `[data-audit-check-body] textarea`. Check `document.activeElement` is that textarea.
      4. Keyboard open: `page.setViewportSize({ width: 390, height: 364 })`, then wait two animation frames (or 300ms).
      5. Measure in the page: `const r = (s) => document.querySelector(s).getBoundingClientRect(); const ta = r("[data-audit-check-body] textarea"), body = r("[data-audit-check-body]"), bar = r("[data-audit-check-actions]")`. Pass: `ta.bottom <= bar.top` and `ta.top >= body.top` (the whole textarea inside the body), focus still on the textarea. Record `ta`, `body`, `bar` before and after; before is expected to give `ta.bottom > bar.top`.
      6. Repeat in the other order: start at 390×364, open the sheet, open the note, focus the textarea. Same pass rule.
      7. If the dev data allows (an approver, a location mismatch): the bar then also holds the correction card; record the body height. If the body is shorter than the textarea at 364px, record it under Open issue 14, not as a failure.
      8. Esc closes the sheet; 0 POST to `/scan` (the read-only `scan-lookup` POST excluded).
    - **Task 19 (AS-13).** At 1440, 768 and 390 on `/th/audit/rounds/<id>/scan`: the header is one line with a 44px (390) / 36px (≥768) ghost back link and the counts; the room button has a solid line with no room chosen; the room picker's "ไม่เลือกห้อง" is full width at 390 and right-aligned from 640; rows show the tag in mono with 13px sub-lines and the room in full; "แสดงเพิ่ม" is an outline button; "ของที่หาไม่เจอ → รายการค้าง" is a 44px-tall link at 390; the search field is 48px with the clear X and a 44/36px camera button (pressed when open, `aria-pressed`); a search with no result shows the lookup panel (search the register: the read-only `scan-lookup` POST; an unknown code shows the faint line; with `context.setOffline(true)` the neutral offline line and the warning offline bar "ออฟไลน์ · รอส่ง 0 รายการ"); the wide side panel's empty state at 1440 is a framed quiet line; an opened item at 1440 and 390 shows the serial in mono in the description, the outline "หมายเหตุ / รูป" toggle (`aria-expanded`), the quiet grouping, and, for an approver with a location mismatch, the correction `ChoiceCard`; a camera with permission denied shows the warning Notice. Not reachable without writing data: the saved banner, the photo retry, the queued and failed queue rows, the closed-round Notice (source pins only). axe (as in 2D-3) at 1440 and 390 on the page, the open sheet and the room picker. No horizontal scroll at 390; the English pass at 1440.
- [ ] **Step 5: The asset page's overview links.** On `/th/assets/<id>` (overview, a user with asset edit): each link of Task 2 opens its view and lands on its section (`document.getElementById(id)` is in the viewport after the navigation), and the page's back link still returns to the list the user came from. At 375 in the custody view, a component asset's bar item opens `#components` in place.
- [ ] **Step 6: English pass at 1440:** the scan page with an open sheet, the rounds list, the round page, the findings page, the disposal queue and request page, the repair list and record page, the check-in form.
- [ ] **Step 7: Keyboard.** Tab order follows the visual order and every focus ring shows (teal 2px): a `Notice` action comes after its text; the two disclosures open with Enter and Space and `aria-expanded` flips; `ChoiceCard`s toggle with Space and Enter does not submit; the scan search's Enter opens the first result; the room picker's footer button is reachable; at 720×450 the `ActionBar` links show the ring inside the bar.
- [ ] **Step 8: axe.**
  - Inject `node_modules/axe-core/axe.min.js` with `page.addScriptTag({ path })`.
  - Run `axe.run(document.querySelector("main"), { runOnly: ["color-contrast", "label", "aria-valid-attr-value", "aria-required-attr", "button-name", "link-name", "nested-interactive", "target-size", "list", "listitem"] })` at 1440 and 375 on `/th/audit/rounds/<id>/scan`, `/th/audit/rounds`, `/th/audit/rounds/<id>`, its `/pending`, `/th/audit/findings`, `/th/audit/rounds/new`, `/th/disposal`, `/th/disposal/<id>`, `/th/disposal/batches/<id>`, `/th/maintenance`, `/th/maintenance/<id>`, `/th/maintenance/new`, `/th/maintenance/pm`, `/th/asset-management/checkin` and a check-out document page. Run it once more on the open check sheet (390), the open room picker and the open transaction cancel dialog (on the sheet or dialog element).
  - Expected: 0 violations. A `target-size` hit on an R5 raw control is recorded as accepted for 2D-5, not as a failure of this plan.
- [ ] **Step 9: Forced colors, reduced motion and zoom.**
  - Forced colors (`emulateMedia`): the `StatusBadge` markers, the progress legend and history markers, the `Chip` borders, the `ContentPanel` lines, the quiet groupings, the `Notice` boxes, the `ActionBar`'s top line and the focus rings stay visible on the scan page, the round page, the disposal request page and the repair record page.
  - Reduced motion: the check form's components loading line, the lookup card's loading line, the bulk dialogs' status lines, the cancel dialog's loading line and every busy `Button` spinner do not spin.
  - 200% zoom (a 720×450 viewport) on the four `ActionBar` pages: the bar is 57px (it was 69; with the disposal next step 121 → 57) and one row; every link and the next step are 44px tall; labels end in an ellipsis; the last content clears the bar. At 375×812 the bar is unchanged (two rows with a next step); at 768 there is no bar. Nothing is clipped on the scan page, the findings page and the disposal request page.
- [ ] **Step 10: The emulated phone keyboard (Task 7, R14).** Follow the Task 7 (AS-1) note of Step 4 at 390×664 → 390×364 and in the other order. Pass: the textarea's bottom is at or above the bar's top, its top at or below the body's top, and focus stays on it. Record the before (Task 0) and after rectangles. If the approver's correction card and a missing-photo reason are both in the bar and the body is shorter than the textarea, record it under open issue 14, not as a failure.
- [ ] **Step 11: NVDA, real devices and paper.** If NVDA or the devices are not available to you, list these for the user and do not mark them done:
  - NVDA: the asset page's overview links read as links and land on their sections; the scanner's result banner reads once (`role="status"`) and the closed round as an alert; the camera toggle reads pressed and not pressed; the room picker's trigger and options; the disclosures read collapsed and expanded; `ChoiceCard`s read as checkboxes with their descriptions; a `StatStrip` cell reads its label and number (and "ดูรายการ" while it blocks); a dialog's danger `Notice` is read when it appears; the bulk outcome badges read their labels.
  - Real phones (iPhone and Android): the check sheet with the keyboard open; the `ActionBar` on a phone on its side; the saved banner's and offline bar's height; the 13px sub-lines and the scanner's tap targets in the field.
  - Paper: one printed disposal request, one final disposal document, one repair printout and one check-out document (no toolbar on the paper; the money formats of R16).
  - The cases the dev data lacked in Task 0 Step 5.
- [ ] **Step 12: Findings report.** Write `.superpowers/sdd/ui-phase2d-plan4/task-52-findings.md` with these parts:
  - **Fixes made:** commit and one line each, or "none".
  - **Checked and passed:** what, where, at which widths, with results; the `href` comparison; the `ActionBar` heights; the keyboard rectangles; the overview links.
  - **Found but not caused by plan 2D-4.**
  - **Accepted mixes:** R5 raw buttons, R17 print and camera colors, R18 items, and any new ones.
  - **Still needs a person:** the Step 11 list.
- [ ] **Step 13: Clean up.** Stop your server, remove your launch configuration and every helper you put under the repo. `git status --short` shows only the untracked folders and files of the Global Constraints.

---

### Task 53: Repo documentation for plan 2D-4 (repo docs only; the controller adds the verify numbers and the wiki in Task 54)

Spec §6 ("every plan: DH section, changelog, wiki") and §3.4. What 2D-4 makes untrue or new in the canonical docs: the info-teal exception (no screen file uses the `info` tokens any more), the `tag` sentence (2D-4's codes moved), the hand-written buttons line, the tinted-box line, the `FieldHint` on a soft fill (no case left), the LV2 / LV3 numbers and `formatCurrency`, the Field Audit section (search field, keyboard reveal, saved banner, offline bar), the `ActionBar` on a short screen, and (if open issue 8 keeps five) the five-count strip. `.impeccable/design.json` waits for 2D-5. `docs/11_FEATURE_LIST.md` and `docs/07_UAT_CHECKLIST.md` do not change: no feature changes what it does (the overview links now reach the sections they always named).

All four files are CRLF now (`i/lf w/crlf`, `DESIGN.md` included). Edit with exact-string replacement, keep the endings, and never run a formatter. Each old text below occurs exactly once at `45c1409` (check with `grep -cF`).

**Files:**
- Modify `DESIGN.md` (11 replacements, or 12 with the five-count strip)
- Modify `docs/14_UI_UX_DESIGN_SYSTEM.md` (2 replacements, or 3)
- Modify `DEVELOPER_HANDOFF.md` (1 replacement): a new section before `## Open Go-Live Decisions`
- Modify `docs/99_CHANGELOG.md` (1 or 2 replacements): the entry on top
- Not changed: `.impeccable/design.json`, `docs/11_FEATURE_LIST.md`, `docs/07_UAT_CHECKLIST.md`, `src/`, `tests/`, `messages/`

**Interfaces:**
- Consumes: Tasks 1–52 committed; `task-52-findings.md`; the user's answers to the open issues.
- Produces: the section `## UI Round 4 Phase 2D Plan 4 Audit, Disposal, Maintenance and Transactions (<today>)` with a `- Dev-app check (Task 52):` bullet; the changelog entry `### ตรวจนับ ตัดจำหน่าย ซ่อมบำรุง และธุรกรรมทรัพย์สิน (UI รอบ 4 เฟส 2D plan 4)` with a `- **ตรวจบนแอป (Task 52):**` bullet. Task 54 adds the verify bullet directly above each.

- [ ] **Step 1: Check the base.**
  - `git diff --quiet 45c1409 HEAD -- DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md && echo DOCS-UNCHANGED` → `DOCS-UNCHANGED`.
  - `git ls-files --eol DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md` → `i/lf w/crlf` for all four.
  - Read `task-52-findings.md` and the user's answers to the open issues (open issue 8 decides DESIGN.md (12) and docs/14 (3)).

- [ ] **Step 2: `DESIGN.md`, color and type (2 replacements).**

(1) §2 Named Rules, the known exception (`:260`): replace

```
Known exception: until phase 2D ends, info notices, chips and a few info icons in the files that plans 2D-4 and 2D-5 own still use the `info` tokens and so appear teal (phase 2A changed only their borders, `border-info/30` → `border-info-border`). Plan 2D-2 moved the admin pages, the reports, the dashboard, the work center and the shell, and plan 2D-3 the asset pages, the asset tools and the master data: names are the neutral `Chip`, states `StatusBadge` and notes `Notice` by meaning.
```

with

```
Known exception (closed by plan 2D-4): info notices, chips and a few info icons used the `info` tokens and so appeared teal until phase 2D moved them (phase 2A changed only their borders, `border-info/30` → `border-info-border`). Plan 2D-2 moved the admin pages, the reports, the dashboard, the work center and the shell, plan 2D-3 the asset pages, the asset tools and the master data, and plan 2D-4 the audit, disposal, maintenance and transaction screens: names are the neutral `Chip`, states `StatusBadge` and notes `Notice` by meaning. Outside the shared parts (the `info` status ring and the info `Notice` icon) no screen uses the `info` tokens.
```

(2) §3 Typography, the `tag` bullet (`:302`): replace

```
Codes still in `font-mono` (the forms and pages that plan 2D-4 owns) and codes inside a translated sentence or a string a page builds (`assetTag - name`) wait for plan 2D-4.
```

with

```
Plan 2D-4 moved the codes of the audit, disposal, maintenance and transaction screens to `tag` (a row's own id at `font-medium`; the scan check sheet's serial through its `ReactNode` description). Codes inside a translated sentence and codes in a label string that a page builds and hands on as a string (`assetTag - name` in dialog titles, ⋯ menus, combobox options and labels the server builds) stay plain text: styling them needs a markup tag in the messages, which phase 2D does not add.
```

- [ ] **Step 3: `DESIGN.md`, buttons, cards, fields and numbers (5 replacements, or 6).**

(3) §5 Buttons, **Hand-written buttons** (`:377`): replace

```
and the master-data drill-down links)
```

with

```
and the master-data drill-down links; plan 2D-4 the field audit scanner's commands (the camera toggle in `SearchField`'s `trailing` slot, show-more, a busy "ส่งตอนนี้", "แก้" and the photo retry), the round close button (`busy`), the disposal evidence, asset picker and bulk retry buttons, the repair attachment buttons and the print documents' back and print buttons; the raw `<button>`s that stay carry a comment for 2D-5's `OWNERS`/`EXEMPT` lists: the scanner's whole-row buttons, the room picker's trigger and options, the camera controls over the image, the disposal asset picker's options and the repair attachment thumbnail)
```

(4) §5 Cards, **Border** (`:439`): replace

```
Tinted boxes (`Notice` warning and danger, and the callouts plans 2D-4 and 2D-5 still move)
```

with

```
Tinted boxes (`Notice` warning and danger, and the mismatch box of a field audit check field, see Field Audit / QR Workflows)
```

(5) §5 Forms, **`Field`** (`:455`): replace

```
A hint that sits on a status soft fill (the counter under the historical exception reason of the bulk execution dialog, on `bg-warning-soft`) is a `FieldHint` with `className="text-muted-foreground"`: faint ink never sits on a soft fill (§2, Neutral).
```

with

```
A field never sits on a status soft fill: it follows the warning `Notice` that explains it, outside the fill, so its hint stays the faint `FieldHint` (the historical exception reason of the bulk execution dialog since plan 2D-4); faint ink never sits on a soft fill (§2, Neutral).
```

(6) Empty Values and Numbers (`:566`): replace

```
LV2 was 61 after plan 2D-2; plan 2D-3 took it to 44 and LV1 to 0 (the import panel and the label tool count with `formatCount`). Print pages, PDFs and label data keep `"-"`, and `formatCurrency` (`฿` prefix) stays until 2D.
```

with

```
LV2 was 61 after plan 2D-2; plan 2D-3 took it to 44 and LV1 to 0 (the import panel and the label tool count with `formatCount`), and plan 2D-4 took LV2 to 29 and LV3 to 0: the two print pages show money through `formatMoney` as the screen does (spec 2D D10) and `formatCurrency` is deleted. Print pages, PDFs and label data keep `"-"`.
```

(7) Adaptive UI, **`ActionBar`** (`:625`): replace

```
It holds up to four links in one row, or three under a full-width `primaryAction` (the next step of a disposal request).
```

with

```
It holds up to four links in one row, or three under a full-width `primaryAction` (the next step of a disposal request). On a short screen (`max-height: 32rem`: a 200% zoom of a 1440 × 900 window, a phone on its side) the links stay 44px, the padding above and below them is 6px instead of 12px, and a `primaryAction` sits beside the three links (1fr : 2fr, up to 768px wide), so the bar is one row (spec 2D D18, plan 2D-4).
```

(12, only if open issue 8 keeps five counts in one strip) §5 **`StatStrip`** (`:443`): replace

```
(`splitStatRows` in `src/lib/stat-strip-rows.ts`: the work center and the dashboard's 4 + 3 KPIs), so a 28px value is never cut.
```

with

```
(`splitStatRows` in `src/lib/stat-strip-rows.ts`: the work center and the dashboard's 4 + 3 KPIs), so a 28px value is never cut; five counts of at most two digits may share one strip (the disposal batch page and the two bulk disposal dialogs, plan 2D-4).
```

- [ ] **Step 4: `DESIGN.md`, Field Audit / QR Workflows (4 replacements).**

(8) The search bullet (`:574`): replace

```
Enter opens the first result, camera button inside the field.
```

with

```
Enter opens the first result; the shared `SearchField` (`fieldSize="xl"`) with its clear button and the camera toggle in its `trailing` slot (a ghost `icon` `Button` with `aria-pressed`).
```

(9) The check sheet bullet (`:575`): replace

```
and saving the parent while some are pending asks first (audit fix, 2026-10-16).
```

with

```
and saving the parent while some are pending asks first (audit fix, 2026-10-16). When the phone keyboard opens after a field takes focus, the form scrolls that field back into the body above the bar (`revealFocusInScrollArea` on a `visualViewport` resize, plan 2D-4).
```

(10) After saving (`:577`): replace

```
a `role="status"` banner with an "แก้" link
```

with

```
a `role="status"` `Notice` whose tone follows the result (kept on the device `info`, saved with a mismatch `warning`, saved `success`) with an outline "แก้" button
```

(11) Offline (`:578`): replace

```
a bar shows the count, and the queue sends itself when the connection returns.
```

with

```
a warning `Notice` shows the count with a busy "ส่งตอนนี้" button, and the queue sends itself when the connection returns.
```

- [ ] **Step 5: `docs/14_UI_UX_DESIGN_SYSTEM.md` (2 replacements, or 3).**

(1) The `ActionBar` row: replace

```
up to 4 links, or 3 under a `primaryAction`;
```

with

```
up to 4 links, or 3 under a `primaryAction` (beside it on a short screen, `max-height: 32rem`);
```

(2) The `Field` row: replace

```
a hint on a status soft fill is `FieldHint` with `className="text-muted-foreground"`;
```

with

```
a field and its hint follow the warning `Notice` that explains them, never sit on its fill;
```

(3, only with DESIGN.md (12)) The `StatStrip` row: replace

```
and more than four numbers in strips of at most four (`splitStatRows`)
```

with

```
and more than four numbers in strips of at most four (`splitStatRows`; five two-digit counts may share one strip)
```

- [ ] **Step 6: `DEVELOPER_HANDOFF.md` (1 replacement).** Replace the line `## Open Go-Live Decisions` (the only one) with the block below, which ends with that same line.
  - Replace `<today>` with today's date and `<N>` with the test count of Task 52 Step 1.
  - Write the markers from the findings and the user's answers: what was checked and where, the `href` comparison, the `ActionBar` heights, the keyboard rectangles, fixes or "none", accepted mixes, issues not caused by this plan, and what still needs a person. When "Still open" has more than two items, write nested bullets as the 2D-3 section does.
  - If Task 18 Step 3b ran, the second bullet says "one message change (the three saved `auditScan` keys lose their leading ✓)" instead of "message".

```
## UI Round 4 Phase 2D Plan 4 Audit, Disposal, Maintenance and Transactions (<today>)

- Branch `feat/ui-phase2d-plan4` in the main checkout (from `master` `45c1409`: phase 1, 2A, 2B plans 1–5, 2C plans 1–5, 2D plans 1–3, the Thai font fix and the audit mobile fix merged, not deployed). Spec `docs/superpowers/specs/2026-10-15-ui-phase2d-design.md` §3.4 · plan `docs/superpowers/plans/2026-10-16-ui-phase2d-plan4.md` · canonical values in `DESIGN.md`. The fourth of five 2D plans, one at a time (D15).
- No new workflow, page, schema, migration, dependency, token, message or API change. Validation is unchanged. Two behaviours change: the asset page's overview links to a section of another view open that view and scroll to the section (wiki 43 (1)), and on the check sheet a field focused before the phone keyboard opens scrolls back above the pinned bar.
- **Shared bits and transactions (Tasks 1–6):** the phone `ActionBar` is one row on a short screen (`max-height: 32rem`: 6px padding, the disposal next step beside the links; D18, wiki 38); `buildAssetDetailSectionHref` in `src/lib/asset-detail-view.ts` (R13; `statusHref` deleted); the transaction cancel dialog's error is a danger `Notice` first in its body and its blockers a warning `Notice` (R12); the A4 documents' toolbar has `PageBackLink` and a `md` print `Button`, and a transaction without a snapshot reaches the cancel dialog as `null` (M32 b); the check-out, transfer and bulk-move forms are `ContentPanel`s; the check-in form uses `ContentPanel`, `Notice`s, `ActionEmptyState`, two `KeyValueList`s with `Nil`, a `Chip` and `EmptyNote` (`ReadOnly` deleted).
- **Field audit scanner (Tasks 7–19):** the keyboard reveal (`revealFocusInScrollArea`, R14); the check form's info and neutral `Notice`s, the outline "หมายเหตุ / รูป" toggle over a quiet grouping and the correction `ChoiceCard`; `text-meta` hints and sub-lines; the side panel on the panel classes with an `EmptyNote` and the serial as `tag`; the closed round a danger `Notice`; the header's ghost icon back link and `formatCount`; the room list and picker (panel classes, `EmptyNote`, tags, an outline show-more, a text link, no dashed trigger, the dialog footer layout of D19); `SearchField` with the camera `Button` (D2); the lookup card, offline bar, saved banner and camera error as `Notice`s by meaning with outline or busy `Button`s. 8 raw buttons stay in 5 files, each with a comment (R5).
- **Audit pages (Tasks 20–29):** the progress bar without a frame of its own and with a marker legend; the close checklist on `ContentPanel`, a busy `Button` and `StatStrip`; the round cancel dialog's impact as a `KeyValueList` and its no-rollback line a warning `Notice` (M26); the round form on the panel classes with a `StatStrip` preview and `ChoiceCard`s; the finding review dialogs on `KeyValueList` and `Notice`s with no typed "-"; the findings batch panel on `ContentPanel` and `ChoiceCard`s; the findings, rounds, round and pending pages on the panel classes, `ContentPanel`, `StatStrip`, `StatusBadge`, `KeyValueList`, `Chip`, text links and `tag` codes, with no info tint left (§3.4). The audit mobile fix's layout stays.
- **Disposal (Tasks 30–43):** the stepper (M28), evidence, request and batch forms and the request and batch pages on `ContentPanel` (`ContentPanel divided flush` for the lists); the bulk approval and execution dialogs (M26): quiet inset selection bars, danger `Notice`s for errors (first in the dialog body), `StatStrip` counts, `KeyValueList` reviews with `Nil`, outcome `StatusBadge`s, `tag` codes; the decision and execution dialogs' `Notice`s; the queue's phone filter, text links, type `Chip` and phone facts; the print page's money through `formatMoney` (D10, M24).
- **Maintenance (Tasks 44–51):** the repair attachments on `ContentPanel`, a warning `Notice`, `EmptyNote` and the shared buttons (M28); the repair form on `ContentPanel` and `Notice`s with the reporter hint on its select and an outline disclosure; the PM form a plain `ContentPanel`; the repair list's `#stuck` and `#pm-due` on the panel classes and the list a divided `ContentPanel`; the record page's panels, history markers, `EmptyNote` and outcome `StatusBadge`; the PM frequency a `Chip`; the repair print page's cost through `formatMoney`; `formatCurrency` deleted from `src/lib/utils.ts` (§4.1).
- **Guards:** LFG LV2 44 → 29 (three rows deleted), LV3 6 → 0, LS1 1 → 0, LB1 5 → 4 rows (the operation document); `LOCAL_KEY_VALUE` gained `ReadOnly`, `ReviewPreviewField`, `FindingComparison`, `MobileAuditField`, `PendingInfo`, `ReviewValue` and `MobileDisposalField`, `LOCAL_STAT_TILE` `ImpactItem`, `PreviewMetric` and `SummaryValue` (D19); FMG `LOADER2` lost the repair attachments' row and otherwise only comment line numbers changed; VFG unchanged. No number went up.
- **Tests:** new files `tests/operations-sweep-ui.test.ts` (8), `tests/audit-scan-sweep-ui.test.ts` (14), `tests/audit-pages-sweep-ui.test.ts` (10), `tests/disposal-sweep-ui.test.ts` (15) and `tests/maintenance-sweep-ui.test.ts` (9), five of them the Review Focus tests; one unit test in `tests/asset-detail-view.test.ts`; pins edited with their file in 21 test files, guard rows in 2. 2102 → <N> tests.
- **Rulings of this plan:** R1 (the 2D-2 and 2D-3 rulings), R2 (tones and markers), R3 (`Notice` by meaning), R4 (panels), R5 (raw buttons that stay), R6 (commands and links), R7 (numbers), R8 (codes), R9 (empty states and values), R10 (D19), R11 (type), R12 (dialog errors), R13 (asset section links), R14 (the keyboard fix), R15 (the short-screen `ActionBar`), R16 (print money, `formatCurrency`), R17 (print and camera), R18 (not taken), R19 (guard rows).
- **Accepted until their plan:** the raw `<button>`s of R5 (10 in 7 files) and R17's print and camera colors wait for 2D-5's `OWNERS`/`EXEMPT` lists.
- **The user's answers to the open issues:** <the answers, or "none before execution">.
- **Handed on:** 2D-5: R5 and R17 for `OWNERS`/`EXEMPT`, `.impeccable/design.json`, the codes inside translated sentences (open issue 9). Later: one `getDisposalStageTone` for the four disposal pages; the asset state as a `StatusBadge` on the repair pages; the English live text of `maintenance-option-select.tsx`; the missing-component dialog's focus return; the asset page's unread lifecycle fields.
- Dev-app check (Task 52): <from task-52-findings.md>
- Before/after screenshots: `.superpowers/sdd/screenshots/ui-phase2d-plan4/before/` and `after/` (git-ignored, on the development machine only).
- Still open, for a person before the one deploy after 2D and V: <from task-52-findings.md>, together with the open checks of the sections above.
- Next: merge this branch; then plan 2D-5 (its plan first).

## Open Go-Live Decisions
```

- [ ] **Step 7: `docs/99_CHANGELOG.md`.**

The newest date at `45c1409` is `## 2026-10-16` (the 2D-3, audit mobile fix, font and 2D-2 entries).
  - If `<today>` is 2026-10-16, the entry goes directly under that heading, above the 2D-3 entry `### หน้าทรัพย์สินและข้อมูลหลัก (UI รอบ 4 เฟส 2D plan 3)`: go straight to the replacement below, whose `## <today>` line is then that heading.
  - Otherwise, first replace the line `## 2026-10-16` with:

```
## <today>

---

## 2026-10-16
```

Then replace the heading line `## <today>` (the newest, the only line with that date) with the block below. Write the marker in Thai, in the shape of the 2D-3 entry's bullet. If Task 18 Step 3b ran, "ไม่แก้ข้อความ" becomes "แก้ข้อความ 3 คีย์ (ข้อความหลังบันทึกตรวจไม่ขึ้นต้นด้วย ✓)".

```
## <today>

### ตรวจนับ ตัดจำหน่าย ซ่อมบำรุง และธุรกรรมทรัพย์สิน (UI รอบ 4 เฟส 2D plan 4)

Branch `feat/ui-phase2d-plan4` (จาก `master` `45c1409`) · design `docs/superpowers/specs/2026-10-15-ui-phase2d-design.md` ข้อ 3.4 · plan `docs/superpowers/plans/2026-10-16-ui-phase2d-plan4.md` · ค่าทั้งหมดอยู่ใน `DESIGN.md` · plan ที่ 4 จาก 5 ของ 2D

- **ขอบเขต:** เครื่องสแกนตรวจนับ หน้ารอบตรวจนับและรายการไม่ตรง หน้าตัดจำหน่ายและ dialog แบบหลายรายการ บันทึกการซ่อมและแผน PM ฟอร์มส่งมอบ รับคืน โอนย้าย และย้ายหลายรายการ เอกสาร A4 และหน้าพิมพ์ ใช้ชิ้นส่วนกลางชุดเดียวกับหน้าอื่น · ไม่มีขั้นตอนงานใหม่ ไม่แตะฐานข้อมูล ไม่แก้ API ไม่เพิ่ม token ไม่แก้ข้อความ · การตรวจกรอกไม่เปลี่ยน
- **แก้ที่ค้างมา:** แถบปุ่มมือถือของหน้ารายละเอียดเหลือแถวเดียวบนจอเตี้ย (zoom 200% หรือมือถือแนวนอน) · ลิงก์ในภาพรวมของหน้าทรัพย์สินที่ชี้ส่วนของมุมมองอื่น (มีผู้ถือครอง ตรวจนับ ใบซ่อมค้าง ผลตรวจนับที่ต้องติดตาม) เปิดมุมมองนั้นและเลื่อนไปที่ส่วนนั้น (เดิมกดแล้วไม่ไปไหน) · ช่องหมายเหตุใน sheet ตรวจรายการไม่ถูกแถบปุ่มบังเมื่อคีย์บอร์ดมือถือเปิด
- **ตรวจนับ:** ข้อความใน sheet ตรวจ แถบออฟไลน์ ข้อความหลังบันทึก และกล้องเป็น `Notice` ตามความหมาย · ปุ่มคำสั่งเป็นปุ่มกลาง (ปุ่มกล้องอยู่ในช่องค้นหากลาง) · รหัสทรัพย์สินและ Serial แสดงด้วยตัวอักษรรหัส (`tag`) · หน้ารอบตรวจนับไม่มีกล่องสีฟ้าอมเขียวแล้ว · รายการตรวจก่อนปิดรอบและงานที่ต้องทำต่อเป็นแถบตัวเลข · สถานะรอบในรายการเป็นป้ายแบบเดียวกับหน้ารอบ · การ์ดรายการไม่ตรงบนมือถือแสดงค่าในระบบและค่าที่พบในรายการข้อมูล
- **ตัดจำหน่าย:** dialog แบบหลายรายการ: แถบเลือกเป็นกรอบเรียบ ข้อผิดพลาดเป็นกล่องสีแดงบนสุดของ dialog จำนวน 5 ช่องเป็นแถบตัวเลข ผลของแต่ละคำขอเป็นป้ายสถานะ · หน้าคำขอ: ชุดที่มาเป็นข้อความข้อมูล ข้อยกเว้นหลักฐานเป็นคำเตือน · หน้าพิมพ์แสดงเงินแบบ "1,500.00 บาท" เหมือนจอ
- **ซ่อมบำรุง:** ไฟล์แนบงานซ่อมใช้ปุ่มกลาง (ปุ่มลบแสดงว่ากำลังทำงาน) · ส่วนทรัพย์สินค้างสถานะซ่อมไม่เป็นกรอบสีส้มทั้งกรอบแล้ว (คำเตือนอยู่ในกรอบขาว) · ผลการซ่อมเป็นป้ายสถานะ · ความถี่ของแผน PM เป็นชิปชื่อ · ใบพิมพ์บันทึกการซ่อมแสดงค่าใช้จ่ายแบบ "1,234.00" ใต้หัวข้อที่มี "(บาท)" · ลบ `formatCurrency` แล้ว
- **ธุรกรรม:** ฟอร์มส่งมอบ รับคืน โอนย้าย และย้ายหลายรายการเป็นกรอบเนื้อหาแบบกลาง · ฟอร์มรับคืนใช้คำเตือน รายการข้อมูล และหน้าว่างแบบกลาง · dialog ยกเลิกรายการแสดงข้อผิดพลาดบนสุด · เอกสาร A4 ใช้ปุ่มกลับและปุ่มพิมพ์แบบกลาง (ไม่ติดไปบนกระดาษ)
- **guard:** `list-frame-guards` "-" ที่พิมพ์เอง 44 → 29 · `formatCurrency(` 6 → 0 · ช่องตัวเลขเขียนเอง 1 → 0 · ไม่มีตัวเลขเพิ่ม
- **test:** ไฟล์ใหม่ 5 ไฟล์ · test 2102 → <N>
- **deploy:** ไม่ deploy · deploy ครั้งเดียวหลัง 2D, Dark Mode, งาน V และชุด E2E
- **ตรวจบนแอป (Task 52):** <จาก task-52-findings.md>
- ภาพก่อน/หลัง: `.superpowers/sdd/screenshots/ui-phase2d-plan4/before/` และ `after/` (git ignore อยู่บนเครื่องพัฒนา)
- ต่อไป: merge แล้วเริ่ม 2D-5 (เขียน plan ก่อน)
```

Replace every `<today>`, `<N>` and marker; none may stay. Check the Thai wording against `docs/19_THAI_GLOSSARY.md` (UI terms: ตรวจนับ, รายการไม่ตรง, ตัดจำหน่าย, ซ่อมบำรุง / บันทึกการซ่อม, ส่งมอบ, รับคืน, โอนย้าย, ส่วนควบ, ผู้ขาย, ยี่ห้อ/รุ่น; ผู้ถือครอง, ตัวกรอง, ป้าย).

- [ ] **Step 8: Check.**
  - `grep -n "<from task-52\|<จาก task-52\|<today>\|<N>\|<the answers" DESIGN.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md docs/14_UI_UX_DESIGN_SYSTEM.md` → nothing.
  - `grep -n "plans 2D-4 and 2D-5 own\|wait for plan 2D-4\|callouts plans 2D-4\|stays until 2D\|camera button inside the field" DESIGN.md` → nothing.
  - The facts the new sentences state: `grep -rnE "\b(bg|text|border)-info(-soft|-border)?\b" src --include=*.tsx | grep -v "src/components/ui/"` → nothing; `grep -rlE "bg-(warning|danger|success)-soft" src --include=*.tsx | grep -v "src/components/ui/"` → only `c/audit/audit-scan-check-field.tsx` (the mismatch box), `c/audit/audit-scan-search.tsx` (the search highlight) and `c/asset-operations/void-document-banner.tsx` (print); `git grep -n formatCurrency -- src` → nothing.
  - `git diff --numstat` → exactly the four files. A file that shows every line changed was normalized; restore its line endings.
  - `node <temp>/eol.mjs DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md` → equal numbers for each.
  - `npm test` (2159 tests, 2158 pass, 0 fail, 1 skipped, plus any test a Task 52 fix added; `tests/audit-round-cancellation.test.ts` reads the handoff and the changelog), `npx tsc --noEmit` and `npm run lint`.
- [ ] **Step 9: Commit.**

```bash
git add DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md
git commit -m "docs(ui): phase 2D plan 4 audit, disposal, maintenance and transactions in DESIGN.md, design-system index, handoff and changelog

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 54: Final verification, wiki and memory (controller runs this task)

**Files:**
- Modify: `docs/99_CHANGELOG.md`, `DEVELOPER_HANDOFF.md` (verify numbers)
- Modify (vault `D:\Obsidian\Eltross`): `AssetSystem/ams-status.md`, `AssetSystem/ams-log.md`, `AssetSystem/ams-open-questions.md`
- Modify (auto-memory): `review-2026-10-priorities.md`

- [ ] **Step 1: Verify.**
  - Run `npm run verify` and record the test count and the build page count.
  - Add `` `npm run verify` ผ่าน (test N · ผ่าน N · ข้าม 1 · build X/X หน้า) `` to the 2D plan 4 changelog entry, directly above its "ตรวจบนแอป (Task 52)" bullet.
  - Add ``- Verification: `npm run verify` passes (tests N · pass N · skipped 1 · build X/X pages).`` to the handoff section, directly above "Dev-app check (Task 52)".
  - Both files are CRLF: insert with an exact-string edit that writes `\r\n` (a Node script; `sed -i` in Git Bash writes LF).
  - Run `npm test` again, then commit both files with `docs(ui): record phase 2D plan 4 verify results` and the Co-Authored-By line.
- [ ] **Step 2: Wiki.** Read `AssetSystem/_schema/ams-wiki-schema.md` first, then edit:
  - `ams-status.md`: 2D plan 4 is built on `feat/ui-phase2d-plan4` with the verify numbers, not merged, not deployed; the next step is 2D-5. Fix any sentence the row now contradicts (the info teal, `formatCurrency`, the `ActionBar` at 200%).
  - `ams-log.md`: an entry at the top of `## <today>`.
  - `ams-open-questions.md`:
    - the plan 2D-4 checks for a person (Task 52 Step 11): one new numbered item (44 at `45c1409`), also added to the list in item 27;
    - close what this plan settled, if Task 52 passed it: item 43's finding (1) (the overview links), item 38's finding of the bar at 200% (about 90px), and item 20 (info teal outside states: Task 53's check found no screen file with the `info` tokens); add the keyboard emulation result to item 42, which stays open for a real phone;
    - the open issues of this plan below that the user has not ruled on.
  - Then run `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` from `D:\Obsidian\Eltross`, and commit only those three files with an `ingest:` message. Never stage other sessions' changes in the vault.
- [ ] **Step 3: Memory.** Update `review-2026-10-priorities.md`: 2D plan 4 is built on `feat/ui-phase2d-plan4`, not merged, not deployed. Next: the merge choice, then the 2D-5 plan (wiki 27 order: 2D-5 → Dark Mode → V → E2E → deploy).
- [ ] **Step 4:** Use superpowers:finishing-a-development-branch. A local merge fast-forwards `master` (`git merge --ff-only feat/ui-phase2d-plan4` from `master`) and runs the tests on the merged result. Push only if the user asks.

---

## Open issues (for the user before execution)

**The user's answers (2026-10-16):** accept every change as the plan proposes (issues 2, 4–7, 11–13: the recommendations; the self-review note stays orange on both the phone card and the table; codes in translated sentences wait for phase 3); 10 a and 10 b yes (Task 18 Step 3b runs; Task 32 names its remove buttons with `assetTools.removeSelectedAsset`); 10 c is a follow-up; issue 3: one row at 57px; issue 8: keep five counts in one strip as the batch page (Task 53 writes the exception in DESIGN.md); issue 16 resolved by a dry run of Task 4.

1. **Plan size.** 55 tasks (0–54) and 51 code commits over 59 source files. It stays one plan because spec §3.4 is one plan and every commit is one file or a tight pair. If a session runs short, stop after any commit (the tree is green after each) and resume at the next task; mind the hard dependencies (Tasks 27–28 after 20, 50–51 after 43).
2. **Behaviour changes, not only looks:**
   - the asset page's overview links (the data health "มีผู้ถือครอง", the "ตรวจนับ" and "ตรวจ License" quick actions, the follow-ups "ใบซ่อมค้างอยู่" and "ผลตรวจนับต้องติดตาม", the phone bar's renew and component items outside their view) switch to the custody, operations or audit view and scroll to the section; before they did nothing (Task 2);
   - Enter on the round form's "รวมทรัพย์สินที่ตัดจำหน่าย/ปลดระวางแล้ว" no longer submits the form (Task 23);
   - the transaction cancel dialog's errors, "at least 5 characters" included, and the bulk disposal dialogs' errors move to a red box at the top of the dialog body (Tasks 3, 37, 38).
3. **The `ActionBar` on a short screen (Task 1):** 57px and one row at 720×450 (69 before; the disposal bar with a next step 121 → 57). Confirm the look at 200% zoom and on a phone on its side. Alternative: the padding only (the disposal bar stays two rows, 109px).
4. **Tones to confirm:**
   - the rounds list: closed becomes a green dot and draft a grey bar (they were a grey and an orange pill), as on the round page (Task 27);
   - the repair outcome: "ซ่อมไม่ได้ เสนอจำหน่าย" a warning badge, "ใช้งานได้" a green dot, "ไม่ระบุ" a grey bar (they were colored text); alternative: a calm muted badge for every outcome (Tasks 47, 48);
   - the check-in legacy badge "ข้อมูลเก่า" becomes a grey `Chip`; alternative: an orange `StatusBadge` on every row (Task 6);
   - kept: disposal state tones still differ by page ("อนุมัติแล้ว" an info ring on the queue and the batch history, a primary dot on the request and batch pages; a partial batch warning on the history and muted on the batch page). Recommendation for a later plan: one `getDisposalStageTone` in `src/lib/disposal-stage.ts` (pending warning, approved info, disposed success, rejected danger, partial warning).
5. **`Notice` choices to confirm (D7):**
   - red instead of orange: the repair form's open-record refusal and the list's invalid date range (Tasks 45, 47); alternative: keep them warning;
   - calmer: the cancelled round (a panel with an info line; the header badge stays red; Task 28); the review dialog's reject impact (a neutral line; Task 24); the closer-is-not-creator rule (a neutral line, only while it blocks; Task 21); the check-in's "send for repair" (an info line; Task 6); the scanner's missing-photo reason and offline lookup line (neutral; Tasks 8, 16); an unknown code (a faint `EmptyNote`; Task 16);
   - kept orange: the self-review note (a warning box on the findings phone card, small orange text in the table; Task 24). D7 would call it a precondition (neutral): orange for both, or neutral for both? Likewise the closed-record evidence lock of the repair attachments (alternative neutral; Task 44).
6. **Taller or denser:**
   - the scanner's saved banner and offline bar put "แก้" and "ส่งตอนนี้" on a 44px row under the text (the `Notice` action); alternative: inline text buttons, which would be raw buttons for 2D-5 (Tasks 17, 18);
   - the check-in's custody facts as two label/value lists, taller on phones; alternative: one list (Task 6);
   - the bulk execution's per-request review as a label/value list per request (5 rows each, up to 20 requests), about twice as tall at 1440; alternative: a `DataTable`. Its sale and salvage values still show the stored decimal without a unit (a unit needs a `baht` entry in `DisposalBulkExecutionCopy`, a two-file change) (Task 38);
   - 12 → 13px sub-lines (`text-meta`) in the scanner's rows, hints and header counts (at 390 the round code truncates sooner) and on the audit pages, the 1280×800 findings table included (cells may wrap one more line) (Tasks 9–16, 20–29).
7. **Smaller desktop targets:** the scan header's back link, the camera toggle and the documents' print button are 36px from `md` (they were 44px at every width; phones keep 44px) (Tasks 4, 12, 15); the repair list's "บันทึกซ่อม" and "บันทึกว่าทำแล้ว" become 36px while the PM page's same action stays `sm` 32px: make both `sm`? (Task 47)
8. **Five counts in one `StatStrip`** in the two bulk disposal dialogs, as the batch page already shows, against DESIGN.md "more than four numbers split into strips of at most four" (`splitStatRows`). The values are at most two digits, so none is cut. Keep five (Task 53 then writes the exception) or split 3 + 2? (Tasks 37, 38)
9. **Codes inside translated sentences and built label strings stay plain text** (the scanner's saved and out-of-scope sentences, "เข้ารอบเพราะติดตั้งอยู่กับ X", "เป็นส่วนควบของ X", the pending subtitle, "TAG - name" in dialog titles, ⋯ menus, combobox options and server-built labels): styling them needs a markup tag in the messages (`t.rich` takes tag functions only). In 2D-5 or in phase 3?
10. **Messages (none change unless you approve):**
    - a. drop the leading "✓ " from `auditScan.savedAllMatch`, `savedMismatch` and `savedOutOfScope`, because the success `Notice` draws its own check (Task 18 Step 3b holds the change file);
    - b. the disposal asset picker's two remove buttons are named with the no-results text ("ไม่พบรายการที่ตรงกับคำค้น"); reuse `assetTools.removeSelectedAsset` ("เอาออกจากรายการ") with the asset's label? Which words? Not in this plan unless approved (Task 32);
    - c. found in passing: `maintenance-option-select.tsx:92` announces "Loading" and "N results" in English on Thai pages (needs message keys; a follow-up).
11. **Empty values and print:** "ไม่ได้ระบุ" in the bulk execution review becomes "—" (the words stay for screen readers); alternative: keep the words visible (Task 38). The disposal print document's money becomes "1,500.00 บาท" (was "฿1,500.00") and the repair printout's cost "1,234.00" under "ค่าใช้จ่ายรวม (บาท)" (was "฿1,234.00"): check one printed request, one final document and one repair printout on paper before deploy (Tasks 43, 50). A round without a scope reads "ทรัพย์สินทั้งหมด" on Thai pages (it showed English; Task 27).
12. **Layout changes to glance at:**
    - panels go from 24px to the one 16/20px padding (the four operation forms, disposal, repair);
    - the PM form drops its in-panel heading "เพิ่มแผน PM", which repeated the new page's title and read "add" on the edit page; alternative: keep it as the panel title (Task 46);
    - the stuck section and the disposal review lose their orange fill (white panels with an orange `Notice`; "ขอจำหน่าย" a plain outline button) (Tasks 47, 48); repair history with no entries is one faint line (Task 48);
    - the progress bar's breakdown is a marker legend, and the gap lists and the bar lose their frames in the coverage panel (Tasks 20, 27); the coverage gap phone card keeps a 3-column list (Task 27); the pending page's count stays a panel (alternative: the header's meta row; Task 29); the round form's preview is a number strip with the risk preset as one row under it (Task 23); the findings phone card's values move into its fact list and its evidence files become text links (Task 26);
    - the "หมายเหตุ / รูป" and "รายละเอียดเพิ่มเติม (ไม่บังคับ)" disclosures are full-width outline buttons over a grey grouping (Tasks 8, 45); the room button without a room loses its dashed outline and the scanner's lists get 12px corners (Tasks 13, 14); the disposal picker's red × becomes a neutral outline button and the chosen assets one lined list; the bulk selection bars become inset rounded boxes (Tasks 32, 37, 38).
13. **Raw `<button>`s that stay (R5):** 10 in 7 files, each with a comment (the scanner's three whole-row buttons, the room picker's trigger and option, the camera's zoom, torch and stop, the disposal picker's option rows, the repair attachment thumbnail). 2D-5 lists them; say if any should become a shared row-button part first.
14. **The keyboard fix's limits (Task 7):** a real iPhone and Android phone still need a person. With the approver's correction card and a missing-photo reason both in the bar, the body can be shorter than the textarea at 364px; the options are to let the bar scroll, move the card into the body (both change audit fix D1), or size the sheet to the visual viewport.
15. **Not taken, for later:** the asset state as a `StatusBadge` in the stuck rows and on the record page (it needs `name: true` in two Prisma `select`s); the missing-component dialog's focus return; the asset page's lifecycle fields `statusLabel`, `statusValue` and `responsibilityLabel` that nothing reads (a dead-code pass); `viewport.interactiveWidget` (app-wide).
16. ~~**Task 4 (OP-4) had no dry run.**~~ Resolved by the controller: Task 4 ran on `p2d4-sim` after Task 51 (`e54b7601`); both expected failures failed first, the suite ended at 2159 / 2158 / 0 / 1, and two text fixes came from it (Task 4's return-type note, the LF warning list of the Global Constraints).
