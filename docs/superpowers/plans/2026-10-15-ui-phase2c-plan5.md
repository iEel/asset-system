# UI Round 4 · Phase 2C Forms and Dialogs · Plan 5 (batch 5: the phone action bar, confirm dialogs, disposal steps and settings tabs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish phase 2C: one `ActionBar` with its page padding replaces the two phone action bars of the four detail pages, the disposal request workflow runs on `Steps`, `AlertDialog` / `useConfirm` take the dialog look and every confirm names its verb (the last hand-made delete dialog becomes `useConfirm`), and the settings tab row becomes `TabNav`. Workflows, pages, data and validation behavior stay the same.

**Architecture:**
- **One new primitive (Task 1):** `src/components/ui/action-bar.tsx` exports `ActionBar` and `actionBarPagePadding` (spec §3.15, §6.10, I23). FMG's `NEW_2C_FILES` already lists it, so every guard applies from its first commit.
- **The swap is one commit (Task 2):** the two old bars are deleted and the four O11 pages (`D/assets/[id]`, `D/maintenance/[id]`, `D/disposal/[id]`, `D/audit/rounds/[id]`) take `ActionBar` and `actionBarPagePadding` together, so no page is ever without its bar or its bottom space.
- **One file is one commit (I30) elsewhere.** Tasks 3–9 each change one file (Task 4 is `alert-dialog.tsx` then `confirm-dialog.tsx`; Task 7 is two commits, because each bulk component and its one caller `D/disposal/page.tsx` must change together to compile). Each lowers its own rows in `tests/form-migration-guards.test.ts` (FMG) and adds the file to `MIGRATED_FILES`.
- **The verb ratchet (Tasks 6–8):** `tests/confirm-dialog-ui.test.ts` gains `CONFIRMS_WITHOUT_A_VERB`, which starts with the 4 confirms that still lack a `confirmLabel` and shrinks with each commit, ending strict (every `confirm()` names its verb) at Task 8.
- **Pipeline (2B spec B7, §8.1–8.2):** this plan runs in the git worktree `.worktrees/ui-phase2c-plan5` beside plan 2B-5 in the main checkout. They share no code file. Whichever finishes second rebases onto `master` in its last task.
- **Controller tasks:** Task 0 (worktree setup, base check, before screenshots), Task 11 (verify, production build, dev-app check) and Task 13 (verify numbers, rebase if needed, wiki, memory). Task 12 writes the repo docs, the last of 2C.

**Tech Stack:** Next.js 16.4 App Router · React 19 · Tailwind CSS 4.2.4 · class-variance-authority 0.7.1 · tailwind-merge 3.5 (through `cn()`) · radix-ui · next-intl 4 · `node --test` with Node 24 type stripping.

**Spec:** `docs/superpowers/specs/2026-10-11-ui-phase2c-design.md`, with section details in `docs/superpowers/specs/2026-10-11-ui-phase2c/03-primitives.md` … `09-guards-tests.md`.
- **Spec §10 (rulings I1–I36) overrides the section files wherever they conflict.** This plan already applies them; when a task and a section file disagree, the task wins.
- Batch 5 is spec §8.9 "ชุด 5" and §10.3 "plan 5". Its line numbers are from `5ffee76`; this plan recounted them at `6835bdf`.
- The 2B spec (`docs/superpowers/specs/2026-10-12-ui-phase2b-design.md` §8.1–8.3, B7, I29, I30) sets when this plan may start (after 2B-4 and 2C plan 4 merged) and the rules for running beside 2B-5.

## Global Constraints

- **Git:**
  - Work in the worktree `D:/Antigravity/asset-system/.worktrees/ui-phase2c-plan5` on branch `feat/ui-phase2c-plan5` (from `master` `6835bdf`). Run every command from the worktree's root.
  - Never run `git checkout`, `git switch`, `git reset`, `git stash`, `git rebase` or `git clean`, never touch `master`, and never touch the main checkout `D:/Antigravity/asset-system` (plan 2B-5 may run there at the same time).
  - Commit only the files your task names. One migrated file is one commit (I30), except where a task says why not.
  - End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Next.js 16.4** is not the Next.js in your training data. Read `node_modules/next/dist/docs/` before using an API you have not seen in this repo.
- **Line endings:**
  - `git config core.autocrlf` is `true`, and the worktree checks every text file out as CRLF (`i/lf w/crlf`), the batch-5 files, the four pages and `tests/form-migration-guards.test.ts` included. The budget script keeps the endings it reads.
  - Before you edit a file, run `git ls-files --eol <file>` and keep what it uses. Edit with exact-string replacement; never normalize a file. New files are LF.
  - Tests that read source files strip `\r` (`.replace(/\r\n/g, "\n")`) before multi-line regexes. A test that reads a CRLF file without stripping must not get a new regex with `\n`.
- **Tests:**
  - `npm test` runs `node scripts/run-tests.mjs` over `tests/**/*.test.{ts,mjs,js}` with Node 24 type stripping. Run one file with `node --test tests/<file>.test.ts`.
  - Modules that tests import use relative `.ts` imports (no `@/`) and erasable TypeScript only. Tests cannot import `.tsx`; they check `.tsx` by reading the source text.
  - Use the shared helpers in `tests/helpers/source-files.ts`.
- **Baseline before Task 1** (HEAD `6835bdf`, or this plan's commit on top of it, which changes only `docs/`):
  - `npm test`: 1980 tests, 1979 pass, 0 fail, 1 skipped.
  - `npx tsc --noEmit`: clean.
  - `npm run lint`: 0 errors and 146 warnings, all under `.agents/`.
  - Task 0 re-checks these numbers in the worktree. The dry run ends at 1988 tests (1987 pass, 1 skipped).
- **Every task ends with all of these green:** `npm test` (0 fail) · `npx tsc --noEmit` · `npm run lint` (0 errors, no new warnings in `src/` or `tests/`). Report any failure by name.
- **The temp scripts:** Task 1 saves `p2c5-precheck.mjs` (the batch-5 preconditions at `6835bdf`; it also counts the `confirm()` calls without a `confirmLabel`: 4) and `p2c-budget.mjs` (plan 2C-4's text, verbatim) in your temp folder; Task 5 saves `p2c5-guard-state.mjs`, which Task 10 replaces with its own version under the same name. Only Tasks 3 and 4 use `p2c-budget.mjs`; Tasks 1, 2 and 5 edit FMG by exact replacement (the script cannot add a row, always appends to `MIGRATED_FILES` and refuses a file already listed).
- **Off limits:**
  - Do not run `npm ci`, `npm install`, `npm run build`, the dev server, `npx shadcn …`, or anything against a database (the controller set up the worktree in Task 0).
  - Do not read or print `.env` or `.env.prod-admin`.
  - Do not run skill helper scripts (for example the impeccable launcher); they make network calls.
  - Your temp folder is outside both trees; keep every helper and fragment there. Shell heredocs and `node -e` drop backslashes: write regex-bearing text with a file-writing tool or a script file. When you copy a block from a task, copy only the lines between its fences.
- **No new tokens (I21).** No task adds a custom property to `:root`, `@theme inline` or `@theme`, and no task edits `tests/design-tokens-contrast.test.ts`. Never write `rounded-[…]`. Every new class must compile with Tailwind 4.2.4 against `src/app/globals.css`.
- **2B fences (2B spec §8.3, §8.11, and the pair rulings below):**
  - Never touch plan 2B-5's files: `D/admin/roles/page.tsx`, `D/admin/logs/page.tsx`, `D/admin/storage/page.tsx`, `D/admin/approvals/page.tsx`, `D/admin/approvals/history/page.tsx`, `D/admin/readiness/page.tsx`, `D/admin/settings/page.tsx`, `D/access-denied/page.tsx`, `D/notifications/page.tsx`, `D/my-assets/page.tsx`, `D/reports/page.tsx`, every file in `c/reports/` except `report-preset-controls.tsx` (done), `c/ui/metric-card.tsx`, `D/dashboard/page.tsx`, `D/work-center/page.tsx`, `c/master-data/master-data-layout.tsx`, `src/lib/design-system.ts`, `src/lib/approval-decision-log.ts`.
  - Never edit `tests/list-frame-guards.test.ts` (LFG, 2B's guard file); keep it green. This plan only lowers live counts there (the O11 pages' LP1, the repair page's LB1), which LFG accepts without an edit.
  - Never edit `tests/design-system.test.ts` or `tests/approval-decision-log.test.ts` (2B-5's), nor `asset-label-print-ui`, `audit-round-cancellation`, `field-primitives`, `performance-route-instrumentation`, `settings-depreciation-policy-ui`, `settings-ldap-role-ui`, `system-log-history`, `visual-consistency-ui`. In `tests/list-pages-ui.test.ts` change only `:343` (Task 2); plan 2B-5 appends to that file.
  - On the four O11 pages change only the root padding and the bar lines; nothing else on those pages.
- **Dialog rules (spec §5, §10):** confirms go through `useConfirm` with a verb `confirmLabel`; `AlertDialog` cancel first, the confirm last; `destructive` for a confirm that deletes or discards; the confirm `busy` while it works and never `disabled` by the same flag (GB4); a busy button keeps its label (K13).
- **No validation behavior change.** Keep every `toast.error` guard, every `disabled` gate and every native check (FMG GF5 `CONSTRAINT_FLOORS` never go down). Field errors and focus on the first invalid field belong to the V track.
- **Messages:** the batch-5 keys are `disposalPage.workflowStepsLabel` and `disposalPage.workflowSteps.{request,decision,execution}` (Task 3), `integrationApiPage.confirmScopeExpansionAction` (Task 6), `disposalPage.bulkDiscardSelectionAction` (Task 7) and `supplier.unsavedChangesLeave` (Task 8), through `node scripts/messages-edit.mjs <changes.json>` run from the worktree root with the JSON in your temp folder; Thai follows `docs/19_THAI_GLOSSARY.md`. If a task finds another string it must add, stop and ask the controller.
- **Deploy:** no task deploys. The user decided on 2026-10-12 to deploy once after all of phase 2.

## Rulings of this plan

- **FMG after batch 5 = the end of 2C** (Task 10 prints it with `p2c5-guard-state.mjs`): `MIGRATED_FILES` 64 = every `BATCH_FILES` entry (the spec's 66 less the two deleted bars) · `PENDING_FOOTER_PARTS` empty (`new Set<string>([])`: an empty `new Set([])` is `Set<never>` and tsc fails at `.has()`) · `FIXED_BOTTOM_BARS` 2 (`assets/asset-register-table.tsx` 1, `ui/action-bar.tsx` 1) · `LOADER2` 10 entries (13) and `RAW_FIELDS` 2 entries (3), unchanged from batch 4 · every other budget `{}` · `CONSTRAINT_FLOORS` 38 rows, untouched.
- **Pipeline with plan 2B-5 (2B spec §8.2, I29):** the shared non-code files are `DESIGN.md`, `tests/visual-foundation-guards.test.ts` (this plan edits the bars' line `:91`, 2B-5 the R7 lock and its `MetricCard` line `:90`: keep both on rebase), `tests/list-pages-ui.test.ts` (this plan `:343`, 2B-5 appends), `messages/*.json`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md` and `docs/11_FEATURE_LIST.md`. If plan 2B-5 merges first, the controller rebases this branch in Task 13 Step 2 and resolves them by the rules there. A conflict in any other file means a fence leaked: stop.
- **Pair rulings (both plans):** P1 `src/lib/design-system.ts` is 2B-5's: the unused `getMobileSafeBottomPaddingClasses` and its pin `tests/audit-scan-search-ui.test.ts:188` stay for 2D (the 2B-4 hand-off proposed deleting them here; that would share a code file and a test file with 2B-5). This plan edits only `audit-scan-search-ui.test.ts:182`. P2 `D/admin/settings/page.tsx` is 2B-5's: Task 9 names the settings `TabNav` with the existing key `systemSettingsPage.title` ("ตั้งค่าระบบ"), read through `useTranslations` inside the form; no page edit and no new key.
- **Accepted from the drafts (spec silent or departed on purpose):**
  - Tasks 1–2: the primitive and its own tests come first (Task 1), the swap second (Task 2); spec §6.10 put the pages in the primitive's commit, but O11 still holds (a page's bar and its padding change in one commit). `FIXED_BOTTOM_BARS` gains the `ui/action-bar.tsx` row in Task 1 (4 rows until Task 2 drops the two old bars'), and `BATCH_FILES "5"` loses the two deleted bars in Task 2 (FMG requires every entry to exist); they never join `MIGRATED_FILES`.
  - Task 2, the back items (2B spec §4.6.4, the 2B-4 hand-off): `/maintenance/[id]` drops the bar's back item and `ArrowLeft` (its header has `PageBackLink` at every width, and two back controls on phones were a 2B-4 risk); `/audit/rounds/[id]` keeps its back item (its header has none). The repair page's LFG LB1 goes live 1 → 0. Task 2 also edits the "stays for 2C plan 5" pins the spec's table does not list: `asset-detail-ux.test.ts:177-178`, `disposal-detail-workspace.test.ts:106`, `:114`, `repair-record-detail-ui.test.ts:79-81`, `:86-87` (and that test's name), `list-pages-ui.test.ts:343`. VFG `:92` keeps its regex (I23); the new `mobile-action-bar` test forbids `leading-tight` instead.
  - Task 4a: `AlertDialogContent` uses the classes of spec §5.9 as two strings (the box, then its phone position), as `dialog.tsx` and `accessible-dialog.tsx` split them; as one string, `fixed` and `bottom-[max(…)]` make GL1(c) count the confirm box as a bottom bar (seen in the dry run).
  - Task 4b: `ui/confirm-dialog.tsx` needs no change (its DOM is already cancel-first; `variant={current.tone === "destructive" ? "destructive" : "default"}` stays); its commit adds it to `MIGRATED_FILES` with a test that pins its K8/K12 contract and passes at once (a mutation check makes it fail).
  - Task 5: the spec's `confirm-dialog-ui.test.ts:25-31` change (the delete list gains `maintenance-attachments.tsx`) lands here, with the file it asserts; `:36` (`useDeleteAction(endpoint)`, I5) is not touched. The confirm sits at the top of `handleDelete`, the way `asset-attachments.tsx`, `disposal-attachments.tsx` and `asset-purchase-documents.tsx` write it, instead of the spec's separate `requestDelete`.
  - Tasks 6–8: the spec's tests G and H (every `confirm()` names its verb; the three verb keys) become the two-way ratchet `CONFIRMS_WITHOUT_A_VERB` with a balanced-brace reader (the spec's regex misreads `storage-archive-button.tsx`'s nested `{ file }`); H also pins where each key is read.
  - Task 9: the settings `TabNav` drops the old card and its full-bleed margins; its links switch tabs on Enter (a link, not a button, so not on Space).
  - Task 10 lowers no budget: it checks the end state and fixes the FMG comments at `:25` / `:39`.
  - The integrations page has no mixed line endings at `6835bdf` (78 of 78 lines CRLF), whatever the 2B-2 note said.

## Review Focus

1. **A phone user who scrolls to the bottom of an asset, repair, disposal or audit round page** must see all content above the bar and the home bar, and one bar only. Pinned by Task 1's `ActionBar` tests and Task 2's `mobile-action-bar` test (the pages use `actionBarPagePadding`, the old bars are gone); measured at 375 against Task 0 Step 9 in Task 11 Step 4.
2. **A user who clicks a confirm by mistake** must read the verb on the confirm button and be able to cancel; nothing must be sent until they confirm. Pinned by the verb ratchet of Tasks 6–8 (`CONFIRMS_WITHOUT_A_VERB` empty) and `confirm-dialog-ui`; checked with cancel only in Task 11.
3. **A user who deletes a repair attachment** must still be asked once and then see the same success toast. Pinned by Task 5's `maintenance-attachments-ui` and `confirm-dialog-ui` assertions (`deletedSuccess`, `tone: "destructive"`); the dialog is opened and cancelled in Task 11.
4. **A user who switches settings tabs after typing** must keep what they typed, as today. Pinned by Task 9's `settings-tab-persistence-ui` test (`onSelect` switches in place); checked with the mouse and the keyboard in Task 11.
5. **A user who follows a disposal request** must see the current step marked on `Steps`, with each step named for what it does. Pinned by Task 3's `steps-ui` and `disposal-detail-workspace` tests and the four new keys; checked on `/th/disposal/<id>` in Task 11.

## File structure

| File | What changes | Task |
|---|---|---|
| `src/components/ui/action-bar.tsx` (new) | `ActionBar` and `actionBarPagePadding` | 1 |
| `src/components/ui/mobile-action-bar.tsx`, `src/components/disposal/disposal-mobile-action-bar.tsx` (deleted) · `D/assets/[id]/page.tsx`, `D/maintenance/[id]/page.tsx`, `D/disposal/[id]/page.tsx`, `D/audit/rounds/[id]/page.tsx` (root padding and bar only) | the swap | 2 |
| `src/components/disposal/disposal-workflow-stepper.tsx` (+ `disposalPage.workflowStepsLabel`, `workflowSteps.*`) | an adapter over `Steps` (S1, K17) | 3 |
| `src/components/ui/alert-dialog.tsx`, `src/components/ui/confirm-dialog.tsx` | the dialog look (K12); the provider marked migrated | 4 |
| `src/components/maintenance/maintenance-attachments.tsx` | its delete dialog → `useConfirm` | 5 |
| `src/components/admin/IntegrationClientManager.tsx`, `D/admin/integrations/page.tsx` (+ `integrationApiPage.confirmScopeExpansionAction`) | the scope-expansion verb | 6 |
| `src/components/disposal/disposal-bulk-approval.tsx`, `disposal-bulk-execution.tsx`, `D/disposal/page.tsx` (+ `disposalPage.bulkDiscardSelectionAction`) | the discard-selection verb | 7 |
| `src/components/master-data/supplier-form.tsx` (+ `supplier.unsavedChangesLeave`) | the unsaved-changes verb | 8 |
| `src/components/admin/system-settings-form.tsx` | the settings tab row → `TabNav` with `onSelect` (O7) | 9 |
| `tests/form-migration-guards.test.ts` | the end state of 2C, comments | 10 |
| `DESIGN.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md` | the last 2C docs and the 2D hand-off | 12 |

---

### Task 0: Worktree setup, base check and before screenshots (controller runs this task, not an implementer)

**Files:**
- Create: the worktree `.worktrees/ui-phase2c-plan5` on branch `feat/ui-phase2c-plan5` (`.worktrees/` is git-ignored, `.gitignore:49-50`)
- Create (git-ignored, inside the worktree): `node_modules/` (`npm ci`; `npm run prisma:generate`), `.env` (a byte copy of the main checkout's `.env`)
- Create then delete: the main checkout's `.claude/launch.json` (only while a server runs; never committed)
- Evidence: `.superpowers/sdd/screenshots/ui-phase2c-plan5/before/` in the main checkout (git-ignored)

**Interfaces:**
- Consumes: `master` at `6835bdf`.
- Produces: a working worktree, the baseline numbers there, the FMG precheck, the ids, and the before images Task 11 compares against.

- [ ] **Step 1: The worktree (2B spec §8.2).** The plan commit created it (`git worktree add .worktrees/ui-phase2c-plan5 -b feat/ui-phase2c-plan5 master`, then this plan file committed there). From the main checkout:

Run: `git worktree list`
Expected: the main checkout and `.worktrees/ui-phase2c-plan5 <plan commit> [feat/ui-phase2c-plan5]`. If the worktree is missing, create it with the command above from `master` `6835bdf` and record a ruling.

- [ ] **Step 2: Install, generate and copy the env (I30).** From the worktree root:
  - `npm ci` (the same lockfile; no dependency changes). Expected: exit 0.
  - `npm run prisma:generate`. Expected: `Generated Prisma Client`.
  - Copy the main checkout's `.env` byte for byte without opening it: `cp ../../.env .env` (the user approved copying `.env` only into the 2C worktrees, I30). Never copy or read `.env.prod-admin`.
  - Confirm the database without printing secrets: read the `.env` keys `DATABASE_URL` and `DB_USER` and print only the database name and the user. Expected: `asset_management_dev` / `asset_dev`. If not, stop and delete the copy.

- [ ] **Step 3: Check the base.** From the worktree:

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2c-plan5`

Run: `git merge-base --is-ancestor 6835bdf HEAD && git diff --quiet 6835bdf HEAD -- src tests messages scripts prisma && echo BASE-OK`
Expected: `BASE-OK`

If plan 2B-5 already has commits on `feat/ui-phase2b-plan5`, run `git diff --name-only master...feat/ui-phase2b-plan5`: every path must be one of 2B-5's files, its tests, LFG, or the shared non-code files of the Rulings. A batch-5 path means a fence leaked: stop.

- [ ] **Step 4: Baseline in the worktree.** Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: 1980 tests (1979 pass, 0 fail, 1 skipped); tsc clean; lint 0 errors and 146 warnings, all under `.agents/`. Record the numbers in the ledger.

- [ ] **Step 5: FMG precheck.** Save Task 1's `p2c5-precheck.mjs` and `p2c-budget.mjs` (Task 1 gives their full text) in the controller's temp folder (`<temp>`, outside both trees) and run the precheck from the worktree root. Every batch-5 row of FMG must equal Task 1's Expected; on any difference, stop and update the tasks before dispatching Task 1.

- [ ] **Step 6: Open the app from the worktree.** The main checkout's servers (3000/3001) serve plan 2B-5; never use them for this plan.
  - The preview tool reads `.claude/launch.json` of the main checkout, so point Next.js at the worktree directory: a configuration named `asset-2c5-dev-3100` with `runtimeExecutable: "node"`, `runtimeArgs: [".worktrees/ui-phase2c-plan5/node_modules/next/dist/bin/next", "dev", ".worktrees/ui-phase2c-plan5", "-p", "3100"]`, `port: 3100`, `autoPort: false` (`next dev <dir>` loads that directory's `.env`). Start it with `preview_start`. If plan 2B-5's controller has its own configuration in the same file, add this one beside it.
  - Log in with the seed admin from `prisma/seed.ts`; do not echo the password.

- [ ] **Step 7: Pick ids.** Record in the ledger: an asset (`/th/assets/<id>`), a repair ticket (`/th/maintenance/<id>`) with attachments if the dev data has one, a disposal request at each workflow step if the dev data has them (`/th/disposal/<id>`), an audit round (`/th/audit/rounds/<id>`), an integration client whose scopes can be widened (the scope-expansion confirm), disposal rows that can be ticked for bulk approval and bulk execution (the discard-selection confirm), a supplier form (`/th/master-data/suppliers/<id>/edit`; the unsaved-changes confirm), and `/th/admin/settings` (the tab row). Note which of them the dev data lacks.

- [ ] **Step 8: Before screenshots.** Save to the main checkout's `.superpowers/sdd/screenshots/ui-phase2c-plan5/before/` as `<view>-<width>.png`, at 1440, 768 and 375 for the four O11 pages (full page plus the `main` area scrolled to its bottom, with the bottom bar), 1440 and 375 for the rest. Open each confirm to its first screen and cancel it; save nothing:
  - `/th/assets/<id>`, `/th/maintenance/<id>`, `/th/disposal/<id>`, `/th/audit/rounds/<id>` (bottom bar and bottom space; the disposal stepper)
  - the maintenance attachment delete dialog (cancel), the integration scope-expansion confirm (cancel; widen nothing), the disposal discard-selection confirms (tick, then leave; cancel), the supplier unsaved-changes confirm (type, then leave; cancel)
  - `/th/admin/settings` (the tab row, every tab)

- [ ] **Step 9: Measure.** At 375 on each O11 page, record the gap between the last content and the top of the bottom bar when scrolled to the bottom, and whether any content sits under the bar. Task 11 compares them.

- [ ] **Step 10: Clean up.** Stop the server and remove this configuration from the main checkout's `.claude/launch.json` (delete the file if nothing else is in it). In the worktree, `git status --short` must show nothing (`node_modules/`, `src/generated/`, `.env` are ignored). No commit in this task.

---

### Task 1: Batch 5 · `ui/action-bar.tsx` (the one phone action bar of the detail pages, K23, and `actionBarPagePadding`; no page uses it yet; and the precheck and budget scripts that Tasks 2–10 reuse)

Spec §3.15 (the API: `label` and `role="group"`), §6.10 (the classes, `actionBarPagePadding`, rulings 15 and 16 of §6.15), I23 (which of §3.15 and §6.10 wins, part by part), §6.11 table B (row `tests/mobile-action-bar.test.ts`), §9.2 (`NEW_2C_FILES` already names `ui/action-bar.tsx`), §9.3 GL1(c) and §10.4 table C (end state `asset-register-table.tsx` 1 + `ui/action-bar.tsx` 1). New file, LF. One file, one commit.

Lines at `6835bdf`: the old bars `src/components/ui/mobile-action-bar.tsx:13-48` (outer class `:18`, text `:24`, `:34`) and `src/components/disposal/disposal-mobile-action-bar.tsx:11-43` (`:21`, `:29`, primary rule `:30`); `tests/mobile-action-bar.test.ts:16-21` (the last test); FMG `FIXED_BOTTOM_BARS` `:312-316`.

Rulings this task applies:
- **I23:** `label` is required and names the bar: `role="group" aria-label={label}` (§3.15; the pages pass `tCommon("actions")`, "การดำเนินการ"). A link is `cn(buttonVariants({ variant: action.primary ? "default" : "outline", size: "sm" }), "min-w-0 px-2")`, with no `text-xs` (§6.10: `sm` is 44px below `md` with 13/20 text, which ends the `text-xs leading-tight` of both old bars). A disabled item is `<a role="link" aria-disabled="true">` with no `href` (§6.10), so it reads as an unavailable link and takes the 2A `aria-disabled:` look. `actionBarPagePadding = { single, withPrimary }` adds the home indicator to the old 96px / 144px (§6.10, §6.15 ruling 16).
- **§6.10, §6.15 ruling 15:** `visibleActions = actions.slice(0, primaryAction ? 3 : 4)` keeps both old limits; the inner row `mx-auto grid min-w-0 max-w-lg gap-2` applies to every page (it was the disposal bar's only); the `primaryAction` slot keeps `min-w-0 [&>button]:w-full`. A link is primary only through its own `primary` flag (the disposal page sets it in Task 2).
- **Server-safe:** no directive and no hook (the four pages are server components); `buttonVariants` comes from `@/components/ui/button-variants`, as the pages import it.
- **The outer class string is the old bars' string, unchanged:** `tests/audit-scan-search-ui.test.ts:187` (safe-area padding) and `tests/disposal-detail-workspace.test.ts:47-48` (`fixed inset-x-0 bottom-0`, `md:hidden`) read it from this file after Task 2.
- **Ruling (this plan, R1), FMG:** the file is in `NEW_2C_FILES`, so GL1(c) counts its class string at once; this task adds the row `ui/action-bar.tsx: 1` that §10.4 table C names for the end of batch 5. `FIXED_BOTTOM_BARS` holds 4 rows until Task 2 removes the two old bars' rows.
- **Ruling (this plan, R9), the scripts:** `p2c5-precheck.mjs` is new (Step 1). `p2c-budget.mjs` is plan 2C-4's script verbatim (Step 2); Tasks 3, 4a and 4b use it.

What users will see: nothing yet; no page renders `ActionBar` until Task 2.

Not in this task:
- the four pages, the two old bars and the tests that read them (Task 2)
- `getMobileSafeBottomPaddingClasses()` `src/lib/design-system.ts:112-114` and its pin `tests/audit-scan-search-ui.test.ts:188` (P1: both stay for 2D)
- the ⋯ layout of the mockup's bar (phase 3)
- messages: no key changes. Do not run a formatter.

**Files:**
- Create: `src/components/ui/action-bar.tsx` (LF)
- Modify: `tests/mobile-action-bar.test.ts` (CRLF, 1 test appended)
- Modify: `tests/form-migration-guards.test.ts` (CRLF, 1 exact replacement)
- Temp folder only, never committed: `p2c5-precheck.mjs`, `p2c-budget.mjs`

**Must keep passing without edits:**
- `tests/mobile-action-bar.test.ts:7-21` (its second test still reads `ui/mobile-action-bar.tsx` until Task 2).
- `tests/audit-scan-search-ui.test.ts:181-189` and `tests/visual-foundation-guards.test.ts:86-94` (they read the old bars until Task 2), `tests/disposal-detail-workspace.test.ts:40-49`.
- `tests/list-frame-guards.test.ts` (2B's file, never edited by 2C).

**Interfaces:**
- Consumes: 2A `buttonVariants` (`size: "sm"`, the `aria-disabled:` look) from `@/components/ui/button-variants`, `getMobileActionGridClass` from `@/lib/mobile-action-layout`, `cn`; FMG `NEW_2C_FILES`.
- Produces (Task 2 relies on these): `ActionBar({ label, actions, primaryAction })`, `type ActionBarLink`, `actionBarPagePadding.single` and `.withPrimary` from `@/components/ui/action-bar`; the `FIXED_BOTTOM_BARS` row; `<temp>/p2c5-precheck.mjs` and `<temp>/p2c-budget.mjs`.

| file | `FIXED_BOTTOM_BARS` | `MIGRATED_FILES` |
|---|---|---|
| `ui/action-bar.tsx` (new) | – → 1 (R1) | not listed (`NEW_2C_FILES` covers it) |

- [ ] **Step 1: Check what this task builds on**

Save this script as `p2c5-precheck.mjs` in your temp folder (never in the repo). Tasks 2–10 run it with their own file or page; the controller runs it with no argument in Task 0 Step 5:

```js
// p2c5-precheck.mjs: run from the worktree root. Reads only; writes nothing. Never commit this file.
//   node --no-warnings <temp>/p2c5-precheck.mjs           every batch-5 row that is not done yet (Task 0 Step 5)
//   node --no-warnings <temp>/p2c5-precheck.mjs <name>    one row, before its own task: a path under src/components/
//                                                         (e.g. ui/alert-dialog.tsx) or an O11 page (e.g. "disposal/[id]")
// Confirms that plans 1-4 are merged, that the primitives batch 5 uses are there, and that the guard file still holds
// each batch-5 file's row as it was at 6835bdf (budgets, GF5 floors, MIGRATED_FILES, PENDING_FOOTER_PARTS). Beside
// each budget it prints the live count, read the way tests/form-migration-guards.test.ts reads it, and the confirm()
// calls that still lack a confirmLabel, so a task can predict its failing run.
import { existsSync, readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

const C = "src/components/"
const D = "src/app/[locale]/(dashboard)/"
const GUARD = "tests/form-migration-guards.test.ts"
const { findJsxTags, hasJsxAttr, jsxAttrValue } = await import(pathToFileURL(`${process.cwd()}/tests/helpers/source-files.ts`).href)

// FMG rows at 6835bdf of every file batch 5 touches. kind: "new" (Task 1 creates it), "deleted" (Task 2 deletes it),
// "migrate" (joins MIGRATED_FILES in its task), "pending" (migrated in batch 1a, still in PENDING_FOOTER_PARTS),
// "migrated" (migrated in batches 1-4; batch 5 edits it again). A budget left out is 0; floors null = no row.
const SEEDS = {
  "ui/action-bar.tsx": { kind: "new", task: "1", floors: null },
  "ui/mobile-action-bar.tsx": { kind: "deleted", task: "2", FIXED_BOTTOM_BARS: 1, floors: null },
  "disposal/disposal-mobile-action-bar.tsx": { kind: "deleted", task: "2", FIXED_BOTTOM_BARS: 1, floors: null },
  "disposal/disposal-workflow-stepper.tsx": { kind: "migrate", task: "3", floors: null },
  "ui/alert-dialog.tsx": { kind: "migrate", task: "4a", floors: null },
  "ui/confirm-dialog.tsx": { kind: "migrate", task: "4b", floors: null },
  "maintenance/maintenance-attachments.tsx": { kind: "pending", task: "5", LOADER2: 1, floors: null },
  "admin/IntegrationClientManager.tsx": { kind: "migrated", task: "6", LOADER2: 2, floors: [3, 3, 1] },
  "disposal/disposal-bulk-approval.tsx": { kind: "migrated", task: "7", LOADER2: 2, floors: [0, 1, 0] },
  "disposal/disposal-bulk-execution.tsx": { kind: "migrated", task: "7", LOADER2: 1, floors: [5, 2, 1] },
  "master-data/supplier-form.tsx": { kind: "migrated", task: "8", floors: [2, 6, 0] },
  "admin/system-settings-form.tsx": { kind: "migrated", task: "9", floors: [0, 1, 0] },
}
// The four O11 pages (Task 2) as plan 2B-4 left them: the root padding and the bar, and the disposal stepper (Task 3).
const PAGES = {
  "assets/[id]": { root: '<div className="space-y-6 pb-24 md:pb-0">', bar: "<MobileActionBar actions={mobileActions} />" },
  "maintenance/[id]": { root: '<div className="space-y-6 pb-24 md:pb-0">', bar: "<MobileActionBar\n" },
  "disposal/[id]": { root: '<div className="space-y-6 pb-36 md:pb-0">', bar: "<DisposalMobileActionBar\n", stepper: "<DisposalWorkflowStepper\n" },
  "audit/rounds/[id]": { root: '<div className="pb-24 md:pb-0">', bar: "<MobileActionBar\n" },
}
const BUDGETS = ["LOCAL_FIELD", "RAW_FIELDS", "FIELD_CLASS_STRINGS", "OLD_MARKUP", "LOADER2", "REVERSE", "OLD_HELPERS", "FIXED_BOTTOM_BARS", "CLOSE_LABEL_IS_CANCEL"]
const BATCH_5 = ["ui/mobile-action-bar.tsx", "disposal/disposal-mobile-action-bar.tsx", "disposal/disposal-workflow-stepper.tsx", "ui/confirm-dialog.tsx", "ui/alert-dialog.tsx"]

// The guard's own definitions (tests/form-migration-guards.test.ts at 6835bdf), copied so the live counts match it.
const NON_FIELD_INPUT = /^(?:checkbox|radio|hidden|file)$/
const CONTROL_TAGS = ["Input", "NativeSelect", "Textarea", "SearchField", "ScannerTextInput", "FileDropzone", "input", "select", "textarea", "Select", "SelectField", "QueueSelect"]
const CONSTRAINT_TAGS = [...CONTROL_TAGS, "ChoiceCard", "ChoiceChip"]
const isFieldClassString = (text) =>
  !/\bhover:/.test(text) &&
  (/\bfocus(?:-visible)?:border-ring\b/.test(text) ||
    (/\bborder-(?:border|input)\b/.test(text) &&
      /\brounded(?:-md)?\b/.test(text) &&
      /\b(?:px-3|px-2|pl-9|pl-10)\b/.test(text) &&
      /\b(?:w-full|min-h-\d+|h-(?:9|10|11))\b/.test(text) &&
      !/\b(?:inline-flex|flex|grid|justify-center|font-medium|font-semibold)\b|\bfile:/.test(text)))
const classStrings = (source, keep) => [...source.matchAll(/"[^"\n]*"/g)].filter((match) => keep(match[0])).length
const matches = (source, pattern) => [...source.matchAll(pattern)].length
const LIVE = {
  LOCAL_FIELD: (source) => matches(source, /\bfunction Field\s*\(/g),
  RAW_FIELDS: (source) => findJsxTags(source, ["input", "select", "textarea"]).filter((tag) => tag.name !== "input" || !NON_FIELD_INPUT.test(jsxAttrValue(tag.text, "type") ?? "")).length,
  FIELD_CLASS_STRINGS: (source) => classStrings(source, isFieldClassString),
  OLD_MARKUP: (source) => matches(source, /ml-1 text-danger">\*|mb-1\.5 block text-sm font-medium text-foreground|<legend className="mb-2 text-sm font-medium text-foreground"|\b(?:h-4 w-4|h-5 w-5|h-3\.5 w-3\.5) rounded border-border\b|\baccent-primary\b/g),
  LOADER2: (source) => matches(source, /<Loader2\b/g),
  REVERSE: (source) => matches(source, /\bflex-col-reverse\b/g),
  OLD_HELPERS: (source) => matches(source, /\bfunction (?:FormStep|WizardStep|Choice|AssetStateFieldLabel)\b|aria-label=\{t\("batchAssetTagHelp"\)\}/g),
  FIXED_BOTTOM_BARS: (source) => classStrings(source, (text) => /\bfixed\b/.test(text) && /\bbottom-/.test(text)),
  CLOSE_LABEL_IS_CANCEL: (source) => matches(source, /closeLabel=\{[^}]*\bcancel\b[^}]*\}/g),
}

// Every object literal passed to confirm( (useConfirm), by brace depth, so { file } inside a t() call does not end it.
function confirmObjects(source) {
  const objects = []
  for (const call of source.matchAll(/(?<![\w.$])confirm\(/g)) {
    let depth = 0
    let start = -1
    for (let at = call.index + call[0].length, paren = 1; at < source.length && paren > 0; at += 1) {
      const char = source[at]
      if (char === "(") paren += 1
      else if (char === ")") paren -= 1
      else if (char === "{") {
        if (depth === 0) start = at
        depth += 1
      } else if (char === "}") {
        depth -= 1
        if (depth === 0 && start !== -1) objects.push(source.slice(start, at + 1))
      }
    }
  }
  return objects.filter((text) => /^\{\s*title:/.test(text))
}

const arg = process.argv[2]
if (arg !== undefined && !SEEDS[arg] && !PAGES[arg]) {
  console.error(`usage: node p2c5-precheck.mjs [one of: ${[...Object.keys(SEEDS), ...Object.keys(PAGES)].join(", ")}]`)
  process.exit(2)
}
const raw = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "")
const read = (path) => raw(path).replace(/\r\n/g, "\n")
const ui = (name) => read(`${C}ui/${name}`)
const guardRaw = raw(GUARD)
const lines = guardRaw.replace(/\r\n/g, "\n").split("\n")
const eol = (text) => {
  const crlf = (text.match(/\r\n/g) ?? []).length
  const lf = (text.match(/\n/g) ?? []).length
  return lf === 0 ? "none" : crlf === lf ? "CRLF" : crlf === 0 ? "LF" : "mixed"
}
function block(name) {
  const start = lines.findIndex((line) => new RegExp(String.raw`^const ${name}\b`).test(line))
  if (start === -1) return null
  const end = lines.findIndex((line, index) => index > start && /^[}\]]/.test(line))
  return lines.slice(start, end + 1).join("\n")
}
const keyOf = (file) => String.raw`\[` + "`" + String.raw`\$\{C\}` + file.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&") + "`" + String.raw`\]`
const budget = (name, file) => Number(new RegExp(keyOf(file) + String.raw`\s*:\s*(\d+)`).exec(block(name) ?? "")?.[1] ?? 0)
const floorsOf = (file) => new RegExp(keyOf(file) + String.raw`\s*:\s*\[(\d+), (\d+), (\d+)\]`).exec(block("CONSTRAINT_FLOORS") ?? "")?.slice(1).map(Number) ?? null
const listed = (name, file) => (block(name) ?? "").includes("`${C}" + file + "`")
const batchFiles = (batches) => [...guardRaw.matchAll(/^\s+"([0-9a-g]+)": \[([^\]]*)\]/gm)].filter((match) => batches.includes(match[1])).flatMap((match) => [...match[2].matchAll(/"([^"]+)"/g)].map((item) => item[1]))
const before = batchFiles(["1a", "1b", "1c", "1d", "1g", "1e", "1f", "2", "3", "4"])
const batch5 = batchFiles(["5"])
const oldBarsGone = !existsSync(`${C}ui/mobile-action-bar.tsx`) && !existsSync(`${C}disposal/disposal-mobile-action-bar.tsx`)
const pageSource = (page) => read(`${D}${page}/page.tsx`)
const lineOf = (source, text) => {
  const at = source.indexOf(text)
  return at === -1 ? 0 : source.slice(0, at).split("\n").length
}

const isDone = (file) => {
  const seed = SEEDS[file]
  if (seed.kind === "new") return existsSync(C + file)
  if (seed.kind === "deleted") return !existsSync(C + file)
  if (seed.kind === "migrate") return listed("MIGRATED_FILES", file)
  if (seed.kind === "pending") return !listed("PENDING_FOOTER_PARTS", file)
  return false
}
const pageDone = (page) => pageSource(page).includes("<ActionBar")
const files = arg ? (SEEDS[arg] ? [arg] : []) : Object.keys(SEEDS).filter((file) => !isDone(file))
const pages = arg ? (PAGES[arg] ? [arg] : []) : Object.keys(PAGES).filter((page) => !pageDone(page))
const done = arg ? [] : [...Object.keys(SEEDS).filter(isDone), ...Object.keys(PAGES).filter(pageDone)]

const steps = ui("steps.tsx")
const alert = ui("alert-dialog.tsx")
const checks = {
  "2C-0 Steps (label, steps, className) and getLinearStepStates with StepOutcome": /export function Steps\(\{ label, steps, className \}/.test(steps) && /export function getLinearStepStates\(count: number, currentIndex: number, outcome: StepOutcome = "in_progress"\)/.test(read("src/lib/step-states.ts")),
  '2A buttonVariants with size sm (44px below md, 13/20 text) and the aria-disabled look': /const sizeSm = "min-h-11 px-2\.5 text-meta md:h-8 md:min-h-0 rounded-control"/.test(ui("button-variants.ts")) && /aria-disabled:pointer-events-none aria-disabled:border-border aria-disabled:bg-background aria-disabled:text-faint-foreground/.test(ui("button-variants.ts")),
  "getMobileActionGridClass in src/lib/mobile-action-layout.ts": /export function getMobileActionGridClass\(actionCount: number\)/.test(read("src/lib/mobile-action-layout.ts")),
  "useConfirm with confirmLabel and tone; AlertDialog parts": /export function useConfirm\(\): ConfirmFn/.test(ui("confirm-dialog.tsx")) && /confirmLabel\?: string/.test(read("src/lib/confirm-queue.ts")) && ["AlertDialogContent", "AlertDialogHeader", "AlertDialogFooter", "AlertDialogTitle", "AlertDialogAction", "AlertDialogCancel"].every((name) => alert.includes(`function ${name}(`)),
  "2B TabNav with onSelect; P0 Segmented": /\bonSelect\b/.test(ui("tab-nav.tsx")) && /export \{ Segmented \}/.test(ui("segmented.tsx")),
  'common.actions in both locales ("การดำเนินการ" / "Actions")': JSON.parse(read("messages/th.json")).common?.actions === "การดำเนินการ" && JSON.parse(read("messages/en.json")).common?.actions === "Actions",
  "P1: getMobileSafeBottomPaddingClasses and its pin stay for 2D": /export function getMobileSafeBottomPaddingClasses\(\)/.test(read("src/lib/design-system.ts")) && /pb-\\\[calc\\\(6rem\\\+max/.test(read("tests/audit-scan-search-ui.test.ts")),
  "plans 1-4 merged: the 61 files of batches 1a-4 are in MIGRATED_FILES": before.length === 61 && before.every((path) => listed("MIGRATED_FILES", path)),
  [`BATCH_FILES "5" holds ${oldBarsGone ? "the 3 files left after Task 2" : "the 5 batch-5 files"}`]: JSON.stringify(batch5) === JSON.stringify(oldBarsGone ? BATCH_5.slice(2) : BATCH_5),
  'NEW_2C_FILES names "ui/action-bar.tsx"': /const NEW_2C_FILES = \[[^\]]*"ui\/action-bar\.tsx"/.test(guardRaw),
  "FIXED_BOTTOM_BARS keeps the register's phone bulk bar (1, phase 3)": budget("FIXED_BOTTOM_BARS", "assets/asset-register-table.tsx") === 1,
}
for (const file of files) {
  const seed = SEEDS[file]
  const wrong = BUDGETS.filter((name) => budget(name, file) !== (seed[name] ?? 0))
  const exists = existsSync(C + file)
  checks[`${file} (Task ${seed.task}): ${seed.kind === "new" ? "does not exist yet" : "exists"}`] = seed.kind === "new" ? !exists : exists
  checks[`${file}: budgets at their 6835bdf row${wrong.length ? ` (differs: ${wrong.join(", ")})` : ""}`] = wrong.length === 0
  checks[`${file}: CONSTRAINT_FLOORS ${seed.floors ? seed.floors.join("/") : "no row"}`] = JSON.stringify(floorsOf(file)) === JSON.stringify(seed.floors)
  const inMigrated = seed.kind === "pending" || seed.kind === "migrated"
  checks[`${file}: ${inMigrated ? "in" : "not in"} MIGRATED_FILES, ${seed.kind === "pending" ? "in" : "not in"} PENDING_FOOTER_PARTS`] =
    listed("MIGRATED_FILES", file) === inMigrated && listed("PENDING_FOOTER_PARTS", file) === (seed.kind === "pending")
}
for (const page of pages) {
  const source = pageSource(page)
  for (const [part, text] of Object.entries(PAGES[page])) checks[`${D}${page}/page.tsx: ${part} as plan 2B-4 left it`] = lineOf(source, text) > 0
}

let missing = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok     " : "MISSING"} ${name}`)
  if (!ok) missing += 1
}
console.log(`info    ${GUARD}: ${eol(guardRaw)}`)
for (const name of done) console.log(`info    ${name}: done by this plan already, row not checked`)
for (const file of files) {
  if (!existsSync(C + file)) {
    console.log(`info    ${file}: not there`)
    continue
  }
  const source = read(C + file)
  const live = BUDGETS.filter((name) => budget(name, file) > 0 || LIVE[name](source) > 0).map((name) => `${name} ${budget(name, file)}/${LIVE[name](source)}`)
  const tags = findJsxTags(source, CONSTRAINT_TAGS)
  const floors = ["required", "maxLength", "minLength"].map((attr) => tags.filter((tag) => hasJsxAttr(tag.text, attr)).length)
  const dialogs = `AccessibleDialog ${findJsxTags(source, ["AccessibleDialog"]).length} · AccessibleDialogFooter ${findJsxTags(source, ["AccessibleDialogFooter"]).length}`
  const confirms = confirmObjects(source)
  const unnamed = confirms.filter((text) => !/\bconfirmLabel\s*:/.test(text)).length
  console.log(`info    ${file}: ${eol(raw(C + file))} · budget/live ${live.length ? live.join(" · ") : "none"} · floors live ${floors.join("/")} · ${dialogs} · confirm() ${confirms.length}, without confirmLabel ${unnamed}`)
}
for (const page of pages) {
  const source = pageSource(page)
  const at = Object.entries(PAGES[page]).map(([part, text]) => `${part} :${lineOf(source, text)}`).join(" · ")
  console.log(`info    ${D}${page}/page.tsx: ${eol(raw(`${D}${page}/page.tsx`))} · ${at}`)
}
if (missing > 0) {
  console.error(`ABORT: ${missing} precondition(s) failed. Do not start; report which.`)
  process.exit(1)
}
console.log(`preconditions hold for ${arg ?? `the ${files.length + pages.length} batch-5 rows not done yet`}`)
```

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2c-plan5`

Run: `git status --short src tests messages`, then `git ls-files --eol tests/mobile-action-bar.test.ts tests/form-migration-guards.test.ts`
Expected: `git status` prints nothing; both files `i/lf w/crlf`. Keep what you find.

Run: `node --no-warnings <temp>/p2c5-precheck.mjs ui/action-bar.tsx`
(`--no-warnings` hides Node's `MODULE_TYPELESS_PACKAGE_JSON` notice from the `tests/helpers/source-files.ts` import.)
Expected:

```
ok      2C-0 Steps (label, steps, className) and getLinearStepStates with StepOutcome
ok      2A buttonVariants with size sm (44px below md, 13/20 text) and the aria-disabled look
ok      getMobileActionGridClass in src/lib/mobile-action-layout.ts
ok      useConfirm with confirmLabel and tone; AlertDialog parts
ok      2B TabNav with onSelect; P0 Segmented
ok      common.actions in both locales ("การดำเนินการ" / "Actions")
ok      P1: getMobileSafeBottomPaddingClasses and its pin stay for 2D
ok      plans 1-4 merged: the 61 files of batches 1a-4 are in MIGRATED_FILES
ok      BATCH_FILES "5" holds the 5 batch-5 files
ok      NEW_2C_FILES names "ui/action-bar.tsx"
ok      FIXED_BOTTOM_BARS keeps the register's phone bulk bar (1, phase 3)
ok      ui/action-bar.tsx (Task 1): does not exist yet
ok      ui/action-bar.tsx: budgets at their 6835bdf row
ok      ui/action-bar.tsx: CONSTRAINT_FLOORS no row
ok      ui/action-bar.tsx: not in MIGRATED_FILES, not in PENDING_FOOTER_PARTS
info    tests/form-migration-guards.test.ts: CRLF
info    ui/action-bar.tsx: not there
preconditions hold for ui/action-bar.tsx
```

The first 11 lines are the shared checks; every later task's run prints them first (after Task 2 the `BATCH_FILES` line reads `ok      BATCH_FILES "5" holds the 3 files left after Task 2`). On any `MISSING` line, stop and report it.

With no argument, the script checks every batch-5 row not done yet. At `6835bdf` (Task 0 Step 5) it prints 68 `ok` lines (the 11 shared checks, 4 per file in the order of `SEEDS`, then the 9 page checks) and then:

```
info    tests/form-migration-guards.test.ts: CRLF
info    ui/action-bar.tsx: not there
info    ui/mobile-action-bar.tsx: CRLF · budget/live FIXED_BOTTOM_BARS 1/1 · floors live 0/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0 · confirm() 0, without confirmLabel 0
info    disposal/disposal-mobile-action-bar.tsx: CRLF · budget/live FIXED_BOTTOM_BARS 1/1 · floors live 0/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0 · confirm() 0, without confirmLabel 0
info    disposal/disposal-workflow-stepper.tsx: CRLF · budget/live none · floors live 0/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0 · confirm() 0, without confirmLabel 0
info    ui/alert-dialog.tsx: CRLF · budget/live none · floors live 0/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0 · confirm() 0, without confirmLabel 0
info    ui/confirm-dialog.tsx: CRLF · budget/live none · floors live 0/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0 · confirm() 0, without confirmLabel 0
info    maintenance/maintenance-attachments.tsx: CRLF · budget/live LOADER2 1/1 · floors live 0/0/0 · AccessibleDialog 1 · AccessibleDialogFooter 0 · confirm() 0, without confirmLabel 0
info    admin/IntegrationClientManager.tsx: CRLF · budget/live LOADER2 2/2 · floors live 3/3/1 · AccessibleDialog 1 · AccessibleDialogFooter 1 · confirm() 4, without confirmLabel 1
info    disposal/disposal-bulk-approval.tsx: CRLF · budget/live LOADER2 2/2 · floors live 0/1/0 · AccessibleDialog 1 · AccessibleDialogFooter 1 · confirm() 1, without confirmLabel 1
info    disposal/disposal-bulk-execution.tsx: CRLF · budget/live LOADER2 1/1 · floors live 5/2/1 · AccessibleDialog 1 · AccessibleDialogFooter 1 · confirm() 1, without confirmLabel 1
info    master-data/supplier-form.tsx: CRLF · budget/live none · floors live 2/6/0 · AccessibleDialog 0 · AccessibleDialogFooter 0 · confirm() 1, without confirmLabel 1
info    admin/system-settings-form.tsx: CRLF · budget/live none · floors live 0/1/0 · AccessibleDialog 1 · AccessibleDialogFooter 1 · confirm() 0, without confirmLabel 0
info    src/app/[locale]/(dashboard)/assets/[id]/page.tsx: CRLF · root :886 · bar :979
info    src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx: CRLF · root :109 · bar :146
info    src/app/[locale]/(dashboard)/disposal/[id]/page.tsx: CRLF · root :174 · bar :216 · stepper :199
info    src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx: CRLF · root :437 · bar :490
preconditions hold for the 16 batch-5 rows not done yet
```

The `confirm() …, without confirmLabel` column is for Tasks 6–8 and 10 (4 calls at `6835bdf`).

- [ ] **Step 2: Save the budget script**

Save this as `p2c-budget.mjs` in your temp folder (never in the repo). It is plan 2C-4's script (Task 1 Step 2 there), unchanged. Usage: `node p2c-budget.mjs <path under src/components/> NAME=from:to ... [--footer-done]`; it checks every current value first and writes nothing on a mismatch, and it always appends the file to `MIGRATED_FILES`. In this plan Tasks 3, 4a and 4b run it with no `NAME=` argument (their files have no budget row); Tasks 1, 2 and 5 edit the guard file by exact replacement (R9).

```js
// p2c-budget.mjs: run from the repo root. Edits tests/form-migration-guards.test.ts for ONE migrated file: lowers or
// removes its entries in the named budgets, appends it to MIGRATED_FILES and, with --footer-done, drops it from
// PENDING_FOOTER_PARTS. It checks every current value first and writes nothing on any mismatch. Never commit this file.
// Usage: node p2c-budget.mjs <path under src/components/> NAME=from:to ... [--footer-done]   (to = 0 deletes the entry)
import { readFileSync, writeFileSync } from "node:fs"

const GUARD = "tests/form-migration-guards.test.ts"
const BUDGETS = ["LOCAL_FIELD", "RAW_FIELDS", "FIELD_CLASS_STRINGS", "OLD_MARKUP", "LOADER2", "REVERSE", "OLD_HELPERS", "FIXED_BOTTOM_BARS", "CLOSE_LABEL_IS_CANCEL"]
const [file, ...args] = process.argv.slice(2)
const footerDone = args.includes("--footer-done")
const edits = args.filter((arg) => arg !== "--footer-done").map((arg) => {
  const match = /^([A-Z0-9_]+)=(\d+):(\d+)$/.exec(arg)
  if (!match || !BUDGETS.includes(match[1])) throw new Error(`bad edit: ${arg}`)
  return { name: match[1], from: Number(match[2]), to: Number(match[3]) }
})
const raw = readFileSync(GUARD, "utf8")
const eol = raw.includes("\r\n") ? "\r\n" : "\n"
const lines = raw.split(/\r?\n/)
const quoted = file.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")
// An entry key as Task 7 writes it: [`${C}path`] or "src/components/path".
const key = String.raw`(?:\[` + "`" + String.raw`\$\{C\}` + quoted + "`" + String.raw`\]|"src/components/` + quoted + `")`
const item = String.raw`(?:` + "`" + String.raw`\$\{C\}` + quoted + "`" + String.raw`|"src/components/` + quoted + `")`
const problems = []

// The lines from `const NAME` to the line that closes it at column 0, or the same line for a one-line value.
function block(name) {
  const start = lines.findIndex((line) => line !== null && new RegExp(String.raw`^const ${name}\b`).test(line))
  if (start === -1) return null
  if (/[}\]]\)?\s*(?:\/\/.*)?$/.test(lines[start]) && !/[{[(]\s*$/.test(lines[start])) return { start, end: start }
  const end = lines.findIndex((line, index) => index > start && line !== null && /^[}\]]/.test(line))
  return { start, end }
}

for (const name of BUDGETS) {
  const range = block(name)
  if (!range) { problems.push(`const ${name} not found`); continue }
  let index = -1
  let value = 0
  for (let at = range.start; at <= range.end; at += 1) {
    const match = new RegExp(key + String.raw`\s*:\s*(\d+)`).exec(lines[at])
    if (match) { index = at; value = Number(match[1]); break }
  }
  const edit = edits.find((candidate) => candidate.name === name)
  if (!edit) { if (value > 0) problems.push(`${name} still holds ${value} for ${file}; name it in this command`); continue }
  if (value !== edit.from) { problems.push(`${name}: expected ${edit.from} for ${file}, found ${value}`); continue }
  if (edit.to === edit.from) continue
  if (edit.to > edit.from) { problems.push(`${name}: a budget never goes up`); continue }
  const line = lines[index]
  if (edit.to > 0) lines[index] = line.replace(new RegExp("(" + key + String.raw`\s*:\s*)\d+`), `$1${edit.to}`)
  else if (range.start !== range.end && new RegExp(String.raw`^\s*` + key + String.raw`\s*:\s*\d+,?\s*(?:\/\/.*)?$`).test(line)) lines[index] = null
  else lines[index] = line.replace(new RegExp(String.raw`\s*` + key + String.raw`\s*:\s*\d+,?`), "").replace(/\{\s*,?\s*\}/, "{}")
  console.log(`${name}: ${edit.from} -> ${edit.to}`)
}

const migrated = block("MIGRATED_FILES")
const entry = "  `${C}" + file + "`,"
if (!migrated) problems.push("const MIGRATED_FILES not found")
else if (lines.slice(migrated.start, migrated.end + 1).some((line) => line !== null && line.includes("${C}" + file + "`"))) problems.push(`${file} is already in MIGRATED_FILES`)
else if (/= \[\]\s*$/.test(lines[migrated.start])) lines.splice(migrated.start, 1, lines[migrated.start].replace(/\[\]\s*$/, "["), entry, "]")
else if (migrated.start === migrated.end) problems.push("MIGRATED_FILES is a one-line list that is not empty: add the entry by hand")
else lines.splice(migrated.end, 0, entry)

if (footerDone) {
  const pending = block("PENDING_FOOTER_PARTS")
  const at = pending ? lines.findIndex((line, index) => index >= pending.start && index <= pending.end && line !== null && new RegExp(item).test(line)) : -1
  if (at === -1) problems.push(`${file} is not in PENDING_FOOTER_PARTS`)
  else if (pending.start !== pending.end && new RegExp(String.raw`^\s*` + item + String.raw`,?\s*(?:\/\/.*)?$`).test(lines[at])) {
    lines[at] = null
    console.log(`PENDING_FOOTER_PARTS: removed ${file}`)
  } else problems.push(`PENDING_FOOTER_PARTS entry for ${file} shares a line: remove it by hand`)
}

if (problems.length > 0) {
  console.error(`ABORT, nothing written:\n${problems.join("\n")}`)
  process.exit(1)
}
writeFileSync(GUARD, lines.filter((line) => line !== null).join(eol))
console.log(`MIGRATED_FILES: added ${file}`)
```

- [ ] **Step 3: Append the failing test to `tests/mobile-action-bar.test.ts`**

One exact replacement at the end of the file (`:20-21`). The new test strips `\r` itself; `readFileSync` is imported.

Replace:

```ts
  assert.doesNotMatch(source, /className="grid min-w-0 grid-cols-4 gap-2"/)
})
```

with:

```ts
  assert.doesNotMatch(source, /className="grid min-w-0 grid-cols-4 gap-2"/)
})

// Phase 2C batch 5 (spec 2C §3.15, §6.10, I23, K23): one ActionBar for the four detail pages. No directive and no hook
// (the pages are server components); a named group; links with the shared button look at size sm (44px below md and
// 13/20 text, instead of text-xs leading-tight); a disabled item that still reads as a link; and the page padding that
// goes with the bar, the home indicator included. Read with \r stripped: the worktree is CRLF.
test("ActionBar is one server-safe bar of shared button links, with the page padding it needs (K23)", () => {
  const source = readFileSync("src/components/ui/action-bar.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.doesNotMatch(source, /"use client"|\buse(?:State|Effect|LayoutEffect|Context|Ref)\b/)
  assert.match(source, /export type ActionBarLink = \{\n  label: string\n  href: string\n  icon\?: React\.ReactNode\n  primary\?: boolean\n  disabled\?: boolean\n\}/)
  assert.match(source, /export const actionBarPagePadding = \{\n  single: "pb-\[calc\(6rem\+env\(safe-area-inset-bottom\)\)\] md:pb-0",\n  withPrimary: "pb-\[calc\(9rem\+env\(safe-area-inset-bottom\)\)\] md:pb-0",\n\} as const/)
  assert.match(source, /role="group"\n\s+aria-label=\{label\}\n\s+data-slot="action-bar"\n\s+className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-3 pb-\[max\(0\.75rem,env\(safe-area-inset-bottom\)\)\] pt-3 md:hidden"/)
  assert.match(source, /<div className="mx-auto grid min-w-0 max-w-lg gap-2">\n\s+\{primaryAction \? <div className="min-w-0 \[&>button\]:w-full">\{primaryAction\}<\/div> : null\}/)
  assert.match(source, /const visibleActions = actions\.slice\(0, primaryAction \? 3 : 4\)/)
  assert.match(source, /const className = cn\(buttonVariants\(\{ variant: action\.primary \? "default" : "outline", size: "sm" \}\), "min-w-0 px-2"\)/)
  assert.match(source, /<a key=\{action\.label\} role="link" aria-disabled="true" className=\{className\}>/)
  assert.match(source, /<Link key=\{action\.label\} href=\{action\.href\} className=\{className\}>/)
  assert.equal(source.match(/<span className="min-w-0 truncate">\{action\.label\}<\/span>/g)?.length, 2)
  assert.doesNotMatch(source, /<a\b[^>]*\bhref=|<span[^>]*aria-disabled|leading-tight|text-xs|bg-muted|text-white|shadow-|backdrop-blur/)
})
```

Run: `node --test tests/mobile-action-bar.test.ts`
Expected: FAIL, `tests 3 · pass 2 · fail 1`: the new test, on `ENOENT` for `src/components/ui/action-bar.tsx`.

- [ ] **Step 4: Create `src/components/ui/action-bar.tsx`**

Create the file with this content (LF, ending with one line break):

```tsx
import Link from "next/link"
import type React from "react"
import { buttonVariants } from "@/components/ui/button-variants"
import { getMobileActionGridClass } from "@/lib/mobile-action-layout"
import { cn } from "@/lib/utils"

export type ActionBarLink = {
  label: string
  href: string
  icon?: React.ReactNode
  primary?: boolean
  disabled?: boolean
}

// The room a page leaves under its content for the bar, the iPhone home indicator included (spec 2C section 6.10,
// O11). A page puts one of these on its root next to <ActionBar>, so the bar and its room change together. The bar
// hides from md, and so does the room.
export const actionBarPagePadding = {
  single: "pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0",
  withPrimary: "pb-[calc(9rem+env(safe-area-inset-bottom))] md:pb-0",
} as const

// The phone action bar of a detail page (K23): up to four links, or three under a full-width primaryAction (the next
// step of a disposal request). No directive and no hook, so the server pages render it. A link is the primary button
// only when it says so (primary); a disabled item stays a link to screen readers (role="link", aria-disabled, no href)
// and takes the shared aria-disabled look.
export function ActionBar({
  label,
  actions,
  primaryAction,
}: {
  label: string
  actions: readonly ActionBarLink[]
  primaryAction?: React.ReactNode
}) {
  const visibleActions = actions.slice(0, primaryAction ? 3 : 4)

  return (
    <div
      role="group"
      aria-label={label}
      data-slot="action-bar"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:hidden"
    >
      <div className="mx-auto grid min-w-0 max-w-lg gap-2">
        {primaryAction ? <div className="min-w-0 [&>button]:w-full">{primaryAction}</div> : null}
        <div className={cn("grid min-w-0 gap-2", getMobileActionGridClass(visibleActions.length))}>
          {visibleActions.map((action) => {
            const className = cn(buttonVariants({ variant: action.primary ? "default" : "outline", size: "sm" }), "min-w-0 px-2")
            return action.disabled ? (
              <a key={action.label} role="link" aria-disabled="true" className={className}>
                {action.icon}
                <span className="min-w-0 truncate">{action.label}</span>
              </a>
            ) : (
              <Link key={action.label} href={action.href} className={className}>
                {action.icon}
                <span className="min-w-0 truncate">{action.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

Run: `node --test tests/mobile-action-bar.test.ts`
Expected: PASS, `tests 3 · pass 3 · fail 0`.

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL, `tests 23 · pass 22 · fail 1`: GL1, `GL1 fixed bottom bars: 4 in 4 files`, naming only `'src/components/ui/action-bar.tsx: 1 > 0'` (the new bar's own `fixed … bottom-0` string; the guard sees it from the first day).

- [ ] **Step 5: Give the new bar its `FIXED_BOTTOM_BARS` row (R1)**

One exact replacement in `tests/form-migration-guards.test.ts` (`:312-313`).

Replace:

```ts
const FIXED_BOTTOM_BARS: Record<string, number> = {
  [`${C}assets/asset-register-table.tsx`]: 1, // :473 the phone bulk-action bar (phase 3, R-q)
```

with:

```ts
const FIXED_BOTTOM_BARS: Record<string, number> = {
  [`${C}assets/asset-register-table.tsx`]: 1, // :473 the phone bulk-action bar (phase 3, R-q)
  [`${C}ui/action-bar.tsx`]: 1, // the ActionBar of the four detail pages (batch 5, K23)
```

Run: `node --test tests/form-migration-guards.test.ts tests/mobile-action-bar.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts tests/audit-scan-search-ui.test.ts`
Expected: PASS, `tests 89 · pass 89 · fail 0` (23 + 3 + 26 + 21 + 16).

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 1981 tests, 1980 pass, 0 fail, 1 skipped (1 test more than at `6835bdf`).
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected: `git diff --stat` shows exactly 2 files: `tests/form-migration-guards.test.ts` 1 insertion, `tests/mobile-action-bar.test.ts` 19 insertions. `git status` also lists `?? src/components/ui/action-bar.tsx` (66 lines, LF: `git ls-files --eol` after `git add` shows `i/lf w/lf`). A file that shows every line changed was normalized: restore its line endings before you commit.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/action-bar.tsx tests/mobile-action-bar.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): ActionBar, the one phone action bar of the detail pages, with its page padding (2C batch 5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 11):** nothing to see from this task alone; Task 2 lists the checks.

---

### Task 2: Batch 5 · the swap (the four O11 pages on `ActionBar` and `actionBarPagePadding`, the two old phone bars deleted, the back items ruled; one commit)

Spec §6.10 (the four-page table), §3.15, O11 (a bar and the room it needs change in one commit), I23, §6.11 table A (rows of batch 5), §9.5 (rows 5), §9.9 (last bullet), §6.15 rulings 15–16, and the 2B spec §4.6.4 with the DH section "UI Round 4 Phase 2B Plan 4 …", "Handed on to 2C plan 5" (the lines below, recounted at `6835bdf`, equal its numbers). One commit for the whole swap (the controller's ruling for batch 5): the two old bars go, the four pages change only their bar import, their root padding and their bar, and every test that reads those lines moves with them. Every file is CRLF in the worktree.

Lines at `6835bdf`:
- `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`: the import `:55`, the root `:886`, the bar `:979`.
- `src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx`: the `lucide-react` import `:4`, the bar import `:17`, the root `:109`, the bar `:146-153` with its back item `:151`.
- `src/app/[locale]/(dashboard)/disposal/[id]/page.tsx`: the imports `:15-17`, the root `:174`, the bar `:216-223` (the stepper `:199-209` is Task 3's).
- `src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx`: the import `:15`, the root `:437`, the bar `:490-497` with its back item `:495`.
- Tests: `mobile-action-bar.test.ts:2`, `:17`; `visual-foundation-guards.test.ts:91`; `audit-scan-search-ui.test.ts:182`; `disposal-detail-workspace.test.ts:35`, `:42`, `:106`, `:114`; `asset-detail-ux.test.ts:177-178`; `repair-record-detail-ui.test.ts:78-81`, `:86-87`; `list-pages-ui.test.ts:343`. FMG: the `BATCH_FILES` comment `:25`, `"5"` `:37`, and after Task 1 the `FIXED_BOTTOM_BARS` rows `:314-317`.

Rulings this task applies:
- **§6.10 table:** each page swaps its bar import for `import { ActionBar, actionBarPagePadding } from "@/components/ui/action-bar"` on the same line (on the disposal page the old import sat in the disposal group, so the new line goes into the `ui/` group one line down: one replacement of `:15-17`). The roots: `` className={`space-y-6 ${actionBarPagePadding.single}`} `` on the asset and repair pages, `` className={`space-y-6 ${actionBarPagePadding.withPrimary}`} `` on the disposal page, `className={actionBarPagePadding.single}` on the audit round page (its root had no `space-y-6`). The template literal is §6.10's; three of the pages import no `cn`, and none gains an import for it.
- **I23:** every bar gets `label={tCommon("actions")}` as its first prop (each page has `tCommon` already). The disposal page's first link gets `primary: !nextActionControl`: the old bar's own rule ("the first link is primary when there is no `primaryAction`", `disposal-mobile-action-bar.tsx:30`) moves to the page (§6.10). The asset page's actions keep their own `primary` flag (the scan-return link), as `MobileActionBar` read them.
- **Back items (R3; 2B spec §4.6.4; DH 2B-4: "Plan 5 decides whether the bars of `/maintenance/[id]` and `/audit/rounds/[id]` keep their back item"):** the repair page's header has `PageBackLink` at every width since plan 2B-4, so its bar drops `{ href: returnToHref, label: tCommon("back"), icon: <ArrowLeft … /> }` and the page drops `ArrowLeft` from its `lucide-react` import (3 links: open asset, print, history). The audit round page's header has no back link (its trail only), so its bar keeps the back item. The live LFG LB1 count of the repair page goes 1 → 0 under its row of 1, which LFG accepts; LFG is never edited by 2C.
- **The tests that read the bars and the O11 lines (§6.11, §9.5, R4):** `mobile-action-bar.test.ts:17`, `audit-scan-search-ui.test.ts:182` and `disposal-detail-workspace.test.ts:42` read `ui/action-bar.tsx`; `disposal-detail-workspace.test.ts:35` looks for `<ActionBar`; `visual-foundation-guards.test.ts:91` lists `src/components/ui/action-bar.tsx` alone and keeps its regex `:92` (I23). Plans 2B-4 and 2B-2 pinned the O11 lines "for 2C plan 5": `asset-detail-ux.test.ts:177-178`, `disposal-detail-workspace.test.ts:114` (and its comment `:106`), `repair-record-detail-ui.test.ts:86-87` (and its comment and name `:79-81`, because of the back item), `list-pages-ui.test.ts:343`. `audit-scan-search-ui.test.ts:188` (the unused helper's string) stays (P1).
- **FMG (R2):** `FIXED_BOTTOM_BARS` drops the two old bars' rows (§9.9; end state `asset-register-table.tsx` 1 + `ui/action-bar.tsx` 1). `BATCH_FILES "5"` drops the two deleted files, because "the guard's own lists name real 2C files" requires every entry to exist, and its comment says why; the deleted files never join `MIGRATED_FILES`.

What users will see (phones and tablets below `md` on `/assets/<id>`, `/maintenance/<id>`, `/disposal/<id>`, `/audit/rounds/<id>`; nothing changes from `md`, where the bar is hidden and the padding is 0):
- The bar's links are the shared buttons: white outline with the control border (they were grey-filled), the primary link solid primary, 13px text on a 20px line (it was 12px on tight lines), 44px tall, 6px corners.
- A disabled item (for example "เอกสารล่าสุด" on an asset with no handover) is grey with faint text, and screen readers hear an unavailable link (it was a plain text span).
- Screen readers hear the bar as the group "การดำเนินการ".
- From 512px of width the links stop at 512px, centered (on three pages they spread across the whole width).
- On an iPhone the page leaves 96px (the disposal page 144px) plus the home indicator under its content, so the last card no longer ends under the bar; elsewhere the room is the old 96px / 144px.
- The repair page's bar has three links ("เปิดทรัพย์สิน", "พิมพ์", "ประวัติ"); "กลับ" is the header's button.

Not in this task:
- anything else on the four pages (2B-4); the disposal stepper (Task 3)
- `getMobileSafeBottomPaddingClasses()` and `tests/audit-scan-search-ui.test.ts:188` (P1, 2D)
- `tests/list-frame-guards.test.ts` (2B's; the live LP1 counts of the four pages fall 1 → 0 and the repair page's LB1 1 → 0 under their rows, which it accepts)
- `DESIGN.md:620-621` and the DH lines that name the old bars (Task 12)
- messages: no key changes. Do not run a formatter.

**Files:**
- Delete: `src/components/ui/mobile-action-bar.tsx`, `src/components/disposal/disposal-mobile-action-bar.tsx`
- Modify (CRLF): `src/app/[locale]/(dashboard)/assets/[id]/page.tsx` (3 replacements), `src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx` (4), `src/app/[locale]/(dashboard)/disposal/[id]/page.tsx` (3), `src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx` (3)
- Modify (CRLF): `tests/mobile-action-bar.test.ts` (3: `:2`, `:17`, 1 test appended), `tests/visual-foundation-guards.test.ts` (1), `tests/audit-scan-search-ui.test.ts` (1), `tests/disposal-detail-workspace.test.ts` (4), `tests/asset-detail-ux.test.ts` (1), `tests/repair-record-detail-ui.test.ts` (2), `tests/list-pages-ui.test.ts` (1)
- Modify: `tests/form-migration-guards.test.ts` (CRLF, 3 exact replacements)

**Must keep passing without edits:**
- `tests/disposal-detail-workspace.test.ts:9`, `:12` (the stepper file and name), `:44-48` (`primaryAction={nextActionControl}` on the page; `primaryAction`, `fixed inset-x-0 bottom-0`, `md:hidden` in the bar), `:113` (the stepper under the header), `:116` (no `ArrowLeft` on the disposal page).
- `tests/list-pages-ui.test.ts:344` (the audit round bar's back item with `ArrowLeft`, kept by R3), `tests/audit-scan-search-ui.test.ts:187-188`, `tests/asset-detail-ux.test.ts:165-176` (`<ArrowLeft\b` absent from the asset page), `tests/asset-transaction-cancellation-ui.test.ts:26-42`, `tests/mobile-field-navigation.test.ts`, `tests/list-frame-guards.test.ts`.

**Interfaces:**
- Consumes: Task 1's `ActionBar`, `actionBarPagePadding`, the `FIXED_BOTTOM_BARS` row of `ui/action-bar.tsx`.
- Produces: no `MobileActionBar`, `DisposalMobileActionBar`, `pb-24` or `pb-36` left in `src`; the four pages on `ActionBar` (Task 3 edits the disposal page's stepper lines, which this task leaves at `:199-209`); FMG `BATCH_FILES "5"` = `disposal/disposal-workflow-stepper.tsx`, `ui/confirm-dialog.tsx`, `ui/alert-dialog.tsx`; `FIXED_BOTTOM_BARS` = 2 rows.

| file | `FIXED_BOTTOM_BARS` | `BATCH_FILES "5"` |
|---|---|---|
| `ui/mobile-action-bar.tsx` (deleted) | 1 → – | listed → removed |
| `disposal/disposal-mobile-action-bar.tsx` (deleted) | 1 → – | listed → removed |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `git ls-files --eol` on the four pages and the seven test files above.
Expected: `git status` prints nothing; every file `i/lf w/crlf`.

Run the precheck for each old bar and each page:
`node --no-warnings <temp>/p2c5-precheck.mjs ui/mobile-action-bar.tsx`, `… disposal/disposal-mobile-action-bar.tsx`, `… "assets/[id]"`, `… "maintenance/[id]"`, `… "disposal/[id]"`, `… "audit/rounds/[id]"`.
Expected: the 11 shared lines `ok` and `info    tests/form-migration-guards.test.ts: CRLF` in every run; besides them, run by run:

```
ok      ui/mobile-action-bar.tsx (Task 2): exists
ok      ui/mobile-action-bar.tsx: budgets at their 6835bdf row
ok      ui/mobile-action-bar.tsx: CONSTRAINT_FLOORS no row
ok      ui/mobile-action-bar.tsx: not in MIGRATED_FILES, not in PENDING_FOOTER_PARTS
info    ui/mobile-action-bar.tsx: CRLF · budget/live FIXED_BOTTOM_BARS 1/1 · floors live 0/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0 · confirm() 0, without confirmLabel 0
preconditions hold for ui/mobile-action-bar.tsx
ok      disposal/disposal-mobile-action-bar.tsx (Task 2): exists
ok      disposal/disposal-mobile-action-bar.tsx: budgets at their 6835bdf row
ok      disposal/disposal-mobile-action-bar.tsx: CONSTRAINT_FLOORS no row
ok      disposal/disposal-mobile-action-bar.tsx: not in MIGRATED_FILES, not in PENDING_FOOTER_PARTS
info    disposal/disposal-mobile-action-bar.tsx: CRLF · budget/live FIXED_BOTTOM_BARS 1/1 · floors live 0/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0 · confirm() 0, without confirmLabel 0
preconditions hold for disposal/disposal-mobile-action-bar.tsx
ok      src/app/[locale]/(dashboard)/assets/[id]/page.tsx: root as plan 2B-4 left it
ok      src/app/[locale]/(dashboard)/assets/[id]/page.tsx: bar as plan 2B-4 left it
info    src/app/[locale]/(dashboard)/assets/[id]/page.tsx: CRLF · root :886 · bar :979
preconditions hold for assets/[id]
ok      src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx: root as plan 2B-4 left it
ok      src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx: bar as plan 2B-4 left it
info    src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx: CRLF · root :109 · bar :146
preconditions hold for maintenance/[id]
ok      src/app/[locale]/(dashboard)/disposal/[id]/page.tsx: root as plan 2B-4 left it
ok      src/app/[locale]/(dashboard)/disposal/[id]/page.tsx: bar as plan 2B-4 left it
ok      src/app/[locale]/(dashboard)/disposal/[id]/page.tsx: stepper as plan 2B-4 left it
info    src/app/[locale]/(dashboard)/disposal/[id]/page.tsx: CRLF · root :174 · bar :216 · stepper :199
preconditions hold for disposal/[id]
ok      src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx: root as plan 2B-4 left it
ok      src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx: bar as plan 2B-4 left it
info    src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx: CRLF · root :437 · bar :490
preconditions hold for audit/rounds/[id]
```

- [ ] **Step 2: Drop the two old bars' rows (the failing guard)**

One exact replacement in `tests/form-migration-guards.test.ts` (`:314-317`).

Replace:

```ts
  [`${C}ui/action-bar.tsx`]: 1, // the ActionBar of the four detail pages (batch 5, K23)
  [`${C}ui/mobile-action-bar.tsx`]: 1, // batch 5 deletes both files
  [`${C}disposal/disposal-mobile-action-bar.tsx`]: 1, // and adds "ui/action-bar.tsx": 1
}
```

with:

```ts
  [`${C}ui/action-bar.tsx`]: 1, // the ActionBar of the four detail pages (batch 5, K23)
}
```

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL, `tests 23 · pass 22 · fail 1`: GL1, `GL1 fixed bottom bars: 4 in 4 files`, naming `'src/components/disposal/disposal-mobile-action-bar.tsx: 1 > 0'` and `'src/components/ui/mobile-action-bar.tsx: 1 > 0'`.

- [ ] **Step 3: Update the tests (the failing tests)**

Thirteen exact replacements.

(1) `tests/mobile-action-bar.test.ts:2`.

Replace:

```ts
import { readFileSync } from "node:fs"
```

with:

```ts
import { existsSync, readFileSync } from "node:fs"
```

(2) `tests/mobile-action-bar.test.ts:17` (§6.11: `:19-20` pass on the new file).

Replace:

```ts
  const source = readFileSync("src/components/ui/mobile-action-bar.tsx", "utf8")
```

with:

```ts
  const source = readFileSync("src/components/ui/action-bar.tsx", "utf8")
```

(3) `tests/mobile-action-bar.test.ts`, at the end (Task 1's test, its last lines).

Replace:

```ts
  assert.doesNotMatch(source, /<a\b[^>]*\bhref=|<span[^>]*aria-disabled|leading-tight|text-xs|bg-muted|text-white|shadow-|backdrop-blur/)
})
```

with:

```ts
  assert.doesNotMatch(source, /<a\b[^>]*\bhref=|<span[^>]*aria-disabled|leading-tight|text-xs|bg-muted|text-white|shadow-|backdrop-blur/)
})

// Phase 2C batch 5 (spec 2C §6.10, §6.11 table B, O11, K23): the four detail pages render ActionBar, named by
// tCommon("actions") ("การดำเนินการ"), and pad their root with actionBarPagePadding, so the bar and its room change in
// one place. The disposal request's first link is the primary button only when no next-step button sits above it.
// The repair page's bar drops its back item, because the header's PageBackLink shows at every width; the audit round
// keeps it, because its header has no back link (2B spec §4.6.4). The two old bars are gone.
test("the four detail pages use ActionBar with its page padding, and the two old bars are gone (K23, O11)", () => {
  assert.equal(existsSync("src/components/ui/mobile-action-bar.tsx"), false)
  assert.equal(existsSync("src/components/disposal/disposal-mobile-action-bar.tsx"), false)
  const page = (route: string) => readFileSync(`src/app/[locale]/(dashboard)/${route}/page.tsx`, "utf8").replace(/\r\n/g, "\n")
  const pages: Record<string, [string, RegExp]> = {
    "assets/[id]": [page("assets/[id]"), /<div className=\{`space-y-6 \$\{actionBarPagePadding\.single\}`\}>/],
    "maintenance/[id]": [page("maintenance/[id]"), /<div className=\{`space-y-6 \$\{actionBarPagePadding\.single\}`\}>/],
    "disposal/[id]": [page("disposal/[id]"), /<div className=\{`space-y-6 \$\{actionBarPagePadding\.withPrimary\}`\}>/],
    "audit/rounds/[id]": [page("audit/rounds/[id]"), /<div className=\{actionBarPagePadding\.single\}>/],
  }
  for (const [route, [source, root]] of Object.entries(pages)) {
    assert.match(source, /^import \{ ActionBar, actionBarPagePadding \} from "@\/components\/ui\/action-bar"$/m, route)
    assert.match(source, root, route)
    assert.match(source, /<ActionBar\s+label=\{tCommon\("actions"\)\}/, route)
    assert.doesNotMatch(source, /MobileActionBar|\bpb-(?:24|36)\b/, route)
  }
  const [disposal] = pages["disposal/[id]"]
  assert.match(disposal, /<ActionBar\n\s+label=\{tCommon\("actions"\)\}\n\s+primaryAction=\{nextActionControl\}\n/)
  assert.match(disposal, /label: t\("openAsset"\), icon: <FileText className="h-4 w-4" \/>, primary: !nextActionControl \}/)
  assert.doesNotMatch(pages["maintenance/[id]"][0], /label: tCommon\("back"\)|ArrowLeft/, "the repair header's PageBackLink is its one back control")
  assert.match(pages["audit/rounds/[id]"][0], /\{ href: returnToHref, label: tCommon\("back"\), icon: <ArrowLeft className="h-4 w-4" \/> \}/, "the audit round header has no back link, so its bar keeps one")
})
```

(4) `tests/visual-foundation-guards.test.ts:91` (the regex `:92` stays, I23).

Replace:

```ts
  for (const path of ["src/components/ui/mobile-action-bar.tsx", "src/components/disposal/disposal-mobile-action-bar.tsx"]) {
```

with:

```ts
  for (const path of ["src/components/ui/action-bar.tsx"]) {
```

(5) `tests/audit-scan-search-ui.test.ts:182` (`:187` passes on the new file; `:188` stays, P1).

Replace:

```ts
  const actionBar = read("src/components/ui/mobile-action-bar.tsx")
```

with:

```ts
  const actionBar = read("src/components/ui/action-bar.tsx")
```

(6) `tests/disposal-detail-workspace.test.ts:35`.

Replace:

```ts
  assert.match(source, /<DisposalMobileActionBar/)
```

with:

```ts
  assert.match(source, /<ActionBar/)
```

(7) `tests/disposal-detail-workspace.test.ts:42` (`:44-48` pass on the new file and the page).

Replace:

```ts
  const actionBar = readFileSync("src/components/disposal/disposal-mobile-action-bar.tsx", "utf8")
```

with:

```ts
  const actionBar = readFileSync("src/components/ui/action-bar.tsx", "utf8")
```

(8) `tests/disposal-detail-workspace.test.ts:106` (the comment of the 2B-4 test).

Replace:

```ts
// stepper stays under the header and the O11 bottom padding stays for 2C plan 5. Raw read (CRLF): no line breaks here.
```

with:

```ts
// stepper stays under the header; 2C plan 5 moved the O11 bottom padding to actionBarPagePadding. Raw read (CRLF): no
// line breaks here.
```

(9) `tests/disposal-detail-workspace.test.ts:114` (one line below its old place after (8)). The file reads the page raw (CRLF): no `\n` in the regex.

Replace:

```ts
  assert.match(source, /<div className="space-y-6 pb-36 md:pb-0">/, "the O11 bottom padding stays for 2C plan 5")
```

with:

```ts
  assert.match(source, /<div className=\{`space-y-6 \$\{actionBarPagePadding\.withPrimary\}`\}>/, "room for the ActionBar and its next step (2C plan 5, O11)")
```

(10) `tests/asset-detail-ux.test.ts:177-178` (raw read: no `\n`).

Replace:

```ts
  assert.match(source, /<div className="space-y-6 pb-24 md:pb-0">/, "the O11 bottom padding stays for 2C plan 5")
  assert.match(source, /\{mobileActions\.length > 0 \? <MobileActionBar actions=\{mobileActions\} \/> : null\}/)
```

with:

```ts
  assert.match(source, /<div className=\{`space-y-6 \$\{actionBarPagePadding\.single\}`\}>/, "room for the ActionBar (2C plan 5, O11)")
  assert.match(source, /\{mobileActions\.length > 0 \? <ActionBar label=\{tCommon\("actions"\)\} actions=\{mobileActions\} \/> : null\}/)
```

(11) `tests/repair-record-detail-ui.test.ts:78-81` (the comment and the name: the bar has no back item now, R3).

Replace:

```ts
// name as the h1 (a repair record has no name of its own) and the repair code, the status and the asset code as meta.
// Back is PageBackLink, and the back item of the mobile bar shows ArrowLeft instead of Wrench. The O11 bottom padding
// stays for 2C plan 5. This file reads the page raw (CRLF): no line breaks in these regexes.
test("the repair page header is PageHeader with the asset name, and back points left in the header and the bar (spec 2B §4.4.5, B2)", () => {
```

with:

```ts
// name as the h1 (a repair record has no name of its own) and the repair code, the status and the asset code as meta.
// Back is PageBackLink, at every width; 2C plan 5 took the back item out of the phone bar (2B spec §4.6.4) and moved
// the O11 bottom padding to actionBarPagePadding. This file reads the page raw (CRLF): no line breaks in these regexes.
test("the repair page header is PageHeader with the asset name, and its PageBackLink is the one back control (spec 2B §4.4.5, §4.6.4)", () => {
```

(12) `tests/repair-record-detail-ui.test.ts:86-87` (raw read: no `\n`).

Replace:

```ts
  assert.match(source, /\{ href: returnToHref, label: tCommon\("back"\), icon: <ArrowLeft className="h-4 w-4" \/> \}/)
  assert.match(source, /<div className="space-y-6 pb-24 md:pb-0">/, "the O11 bottom padding stays for 2C plan 5")
```

with:

```ts
  assert.doesNotMatch(source, /label: tCommon\("back"\)|ArrowLeft/, "the bar has no back item of its own (2C plan 5)")
  assert.match(source, /<div className=\{`space-y-6 \$\{actionBarPagePadding\.single\}`\}>/, "room for the ActionBar (2C plan 5, O11)")
```

(13) `tests/list-pages-ui.test.ts:343` (`read` strips `\r`; `:344`, the audit round's back item, stays).

Replace:

```ts
  assert.match(source, /<div className="pb-24 md:pb-0">\n\s+<PageHeader\n\s+className="mb-6"/, "the root keeps the O11 padding for 2C plan 5, so the header brings its own gap (spec 2B §4.6.1)")
```

with:

```ts
  assert.match(source, /<div className=\{actionBarPagePadding\.single\}>\n\s+<PageHeader\n\s+className="mb-6"/, "the root leaves room for the ActionBar (2C plan 5, O11), so the header brings its own gap (spec 2B §4.6.1)")
```

Run: `node --test tests/mobile-action-bar.test.ts tests/visual-foundation-guards.test.ts tests/audit-scan-search-ui.test.ts tests/disposal-detail-workspace.test.ts tests/asset-detail-ux.test.ts tests/repair-record-detail-ui.test.ts tests/list-pages-ui.test.ts`
Expected: FAIL, `tests 115 · pass 109 · fail 6`:
- `the four detail pages use ActionBar with its page padding, and the two old bars are gone (K23, O11)`
- `disposal detail preserves operational navigation and uses an ArrowLeft back affordance` (`<ActionBar`)
- `disposal request header is PageHeader with the asset name and a back button at every width (spec 2B §4.5.4)` (the root)
- `asset detail header is PageHeader with the asset name, and its facts, tiles and tables use the shared parts (spec 2B §4.4.5)`
- `the repair page header is PageHeader with the asset name, and its PageBackLink is the one back control (spec 2B §4.4.5, §4.6.4)`
- `audit round detail: PageHeader, StatStrip numbers and result buckets, the result list on DataTable with RowActions and the shared Pagination (spec 2B §5.4)`

The VFG, `audit-scan-search-ui` and `disposal-detail-workspace` bar tests already pass: they read `ui/action-bar.tsx`, which Task 1 created with the old bars' outer string.

- [ ] **Step 4: Delete the old bars, swap the four pages, and update `BATCH_FILES`**

Delete the two files: `git rm src/components/ui/mobile-action-bar.tsx src/components/disposal/disposal-mobile-action-bar.tsx`

Then fifteen exact replacements.

(1) `tests/form-migration-guards.test.ts:25`, the `BATCH_FILES` comment.

Replace:

```ts
// The 66 files of 2C by batch (spec §8.6, §8.9), relative to src/components/.
```

with:

```ts
// The files of 2C by batch (spec §8.6, §8.9), relative to src/components/: the 66 of the spec less the two mobile
// action bars that batch 5 deleted (ActionBar replaced them).
```

(2) `tests/form-migration-guards.test.ts`, `BATCH_FILES "5"` (`:38` after (1)).

Replace:

```ts
  "5": ["ui/mobile-action-bar.tsx", "disposal/disposal-mobile-action-bar.tsx", "disposal/disposal-workflow-stepper.tsx", "ui/confirm-dialog.tsx", "ui/alert-dialog.tsx"],
```

with:

```ts
  "5": ["disposal/disposal-workflow-stepper.tsx", "ui/confirm-dialog.tsx", "ui/alert-dialog.tsx"],
```

(3)–(5) `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`: the import `:55`, the root `:886`, the bar `:979`.

Replace:

```tsx
import { MobileActionBar } from "@/components/ui/mobile-action-bar"
```

with:

```tsx
import { ActionBar, actionBarPagePadding } from "@/components/ui/action-bar"
```

Replace:

```tsx
    <div className="space-y-6 pb-24 md:pb-0">
```

with:

```tsx
    <div className={`space-y-6 ${actionBarPagePadding.single}`}>
```

Replace:

```tsx
      {mobileActions.length > 0 ? <MobileActionBar actions={mobileActions} /> : null}
```

with:

```tsx
      {mobileActions.length > 0 ? <ActionBar label={tCommon("actions")} actions={mobileActions} /> : null}
```

(6)–(9) `src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx`: the `lucide-react` import `:4` (`ArrowLeft` goes with the back item, R3), the bar import `:17`, the root `:109`, the bar `:146-153`.

Replace:

```tsx
import { AlertTriangle, ArrowLeft, FileText, History, Printer, Trash2 } from "lucide-react"
```

with:

```tsx
import { AlertTriangle, FileText, History, Printer, Trash2 } from "lucide-react"
```

Replace:

```tsx
import { MobileActionBar } from "@/components/ui/mobile-action-bar"
```

with:

```tsx
import { ActionBar, actionBarPagePadding } from "@/components/ui/action-bar"
```

Replace:

```tsx
    <div className="space-y-6 pb-24 md:pb-0">
```

with:

```tsx
    <div className={`space-y-6 ${actionBarPagePadding.single}`}>
```

Replace:

```tsx
      <MobileActionBar
        actions={[
          { href: `/${locale}/assets/${ticket.asset.id}`, label: t("openAsset"), icon: <FileText className="h-4 w-4" />, primary: true },
          { href: printHref, label: t("print"), icon: <Printer className="h-4 w-4" /> },
          { href: "#history", label: t("history"), icon: <History className="h-4 w-4" /> },
          { href: returnToHref, label: tCommon("back"), icon: <ArrowLeft className="h-4 w-4" /> },
        ]}
      />
```

with:

```tsx
      <ActionBar
        label={tCommon("actions")}
        actions={[
          { href: `/${locale}/assets/${ticket.asset.id}`, label: t("openAsset"), icon: <FileText className="h-4 w-4" />, primary: true },
          { href: printHref, label: t("print"), icon: <Printer className="h-4 w-4" /> },
          { href: "#history", label: t("history"), icon: <History className="h-4 w-4" /> },
        ]}
      />
```

(10)–(12) `src/app/[locale]/(dashboard)/disposal/[id]/page.tsx`: the imports `:15-17`, the root `:174`, the start of the bar `:216-219` (its last two links and the closing lines stay).

Replace:

```tsx
import { DisposalMobileActionBar } from "@/components/disposal/disposal-mobile-action-bar"
import { DisposalWorkflowStepper } from "@/components/disposal/disposal-workflow-stepper"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
```

with:

```tsx
import { DisposalWorkflowStepper } from "@/components/disposal/disposal-workflow-stepper"
import { ActionBar, actionBarPagePadding } from "@/components/ui/action-bar"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
```

Replace:

```tsx
    <div className="space-y-6 pb-36 md:pb-0">
```

with:

```tsx
    <div className={`space-y-6 ${actionBarPagePadding.withPrimary}`}>
```

Replace:

```tsx
      <DisposalMobileActionBar
        primaryAction={nextActionControl}
        actions={[
          { href: `/${locale}/assets/${disposalRequest.asset.id}`, label: t("openAsset"), icon: <FileText className="h-4 w-4" /> },
```

with:

```tsx
      <ActionBar
        label={tCommon("actions")}
        primaryAction={nextActionControl}
        actions={[
          { href: `/${locale}/assets/${disposalRequest.asset.id}`, label: t("openAsset"), icon: <FileText className="h-4 w-4" />, primary: !nextActionControl },
```

(13)–(15) `src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx`: the import `:15`, the root `:437`, the start of the bar `:490-491` (its four links, the back item among them, stay).

Replace:

```tsx
import { MobileActionBar } from "@/components/ui/mobile-action-bar"
```

with:

```tsx
import { ActionBar, actionBarPagePadding } from "@/components/ui/action-bar"
```

Replace:

```tsx
    <div className="pb-24 md:pb-0">
```

with:

```tsx
    <div className={actionBarPagePadding.single}>
```

Replace:

```tsx
        <MobileActionBar
          actions={[
```

with:

```tsx
        <ActionBar
          label={tCommon("actions")}
          actions={[
```

Check: `git grep -n "MobileActionBar\|mobile-action-bar\|pb-24\|pb-36" -- src` prints nothing, and `git grep -n "ActionBar\|actionBarPagePadding" -- "src/app"` prints 12 lines: the import, the root and the bar of each page (assets `:55`, `:886`, `:979`; maintenance `:17`, `:109`, `:146`; disposal `:16`, `:174`, `:216`; audit `:15`, `:437`, `:490`).

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/form-migration-guards.test.ts tests/mobile-action-bar.test.ts tests/visual-foundation-guards.test.ts tests/audit-scan-search-ui.test.ts tests/disposal-detail-workspace.test.ts tests/asset-detail-ux.test.ts tests/repair-record-detail-ui.test.ts tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts tests/mobile-field-navigation.test.ts`
Expected: PASS, `tests 166 · pass 166 · fail 0` (23 + 4 + 26 + 16 + 10 + 15 + 10 + 34 + 21 + 7).

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 1982 tests, 1981 pass, 0 fail, 1 skipped (1 more than after Task 1); tsc no errors (`ActionBarLink` takes the asset page's lifecycle actions and the scan-return link as they are); lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat HEAD`
Expected: exactly 14 files, 65 insertions and 126 deletions: the asset page 3 / 3, the audit round page 4 / 3, the disposal page 5 / 4, the repair page 5 / 5, `disposal-mobile-action-bar.tsx` 0 / 43 and `mobile-action-bar.tsx` 0 / 48 (deleted), `asset-detail-ux` 2 / 2, `audit-scan-search-ui` 1 / 1, `disposal-detail-workspace` 5 / 4, `form-migration-guards` 3 / 4, `list-pages-ui` 1 / 1, `mobile-action-bar.test.ts` 30 / 2, `repair-record-detail-ui` 5 / 5, `visual-foundation-guards` 1 / 1 (insertions / deletions).

- [ ] **Step 7: Commit**

Step 4's `git rm` already staged the two deletions (`git add` on a removed path fails with "pathspec did not match"); add the other twelve files:

```bash
git add "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" "src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx" "src/app/[locale]/(dashboard)/disposal/[id]/page.tsx" "src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx" tests/mobile-action-bar.test.ts tests/visual-foundation-guards.test.ts tests/audit-scan-search-ui.test.ts tests/disposal-detail-workspace.test.ts tests/asset-detail-ux.test.ts tests/repair-record-detail-ui.test.ts tests/list-pages-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): the four detail pages on ActionBar and actionBarPagePadding; the two old phone bars go (2C batch 5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 14 files in the commit, 2 of them deleted (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 11):** `/th/assets/<id>` (one asset you may edit, one in stock with an active handover so an item is disabled), `/th/maintenance/<id>`, `/th/disposal/<id>` (one pending as an approver, so the next step sits above the links; one disposed), `/th/audit/rounds/<id>` (an open round) at 375, 700 and 768:
- below 768 the bar is the shared outline buttons (the primary one solid), 44px, 13px labels on one line, no text cut off at 375 in Thai or English; at 700 the links are centered within 512px; at 768 no bar and no bottom gap
- scroll to the end at 375: the last card ends above the bar, about 96px (144px on the disposal page) of room
- the disabled item is grey and does nothing when tapped; NVDA reads it as an unavailable link, and the bar as the group "การดำเนินการ"
- the repair page's bar: three links and no "กลับ"; the header's back button still works; the audit round keeps "กลับ" in its bar
- the disposal page: with the next step, its button sits full width above three outline links; without it (a disposed request), "เปิดทรัพย์สิน" is the solid one
- iPhone (person, before the phase-2 deploy): the bar and the room clear the home indicator.

---

### Task 3: Batch 5 · `disposal/disposal-workflow-stepper.tsx` (the disposal request's steps on the shared `Steps` rail, S1; the file and its export stay as a thin adapter; four new keys; the page passes them)

Spec §7.2.4 S1 (the props, `currentStepByStage`, `outcomeByStage`, the state table, the page lines), §7.8 and §10.2 "ชุด 5" (the keys `disposalPage.workflowStepsLabel`, `disposalPage.workflowSteps.{request,decision,execution}`), §7.9 (the `steps-ui` row: `<Steps`, `getLinearStepStates`, no `grid grid-cols-3` and `text-white`, `pending_approval: 1`, the page passes `workflowSteps.request`), §7.13 rulings 3–7, I18 (the rejected word is "ปฏิเสธแล้ว", from `Steps`), K17, O12 (2C owns the component, 2B only placed it), §9.4 (no row). The stepper is CRLF in the worktree; the page line is the one the controller's ruling for this task allows (`D/disposal/[id]/page.tsx` is a 2C-5 page). One file, one commit, with the page lines and the keys it needs.

Lines at `6835bdf` (Task 2 did not move them): the stepper `:1-21` (imports, props, `currentStepByStage`) and `:23-70` (the component); the page's stepper `:199-209` (`labels` `:204-208`); `tests/steps-ui.test.ts:122-124` (the end of the file).

Rulings this task applies:
- **§7.2.4 S1, K17:** the file and `DisposalWorkflowStepper` stay (`tests/disposal-detail-workspace.test.ts:9`, `:12`); its `<ol>` with three hand-drawn markers becomes `<Steps className="mt-4" label={stepsLabel} steps={steps} />`. The states come from `getLinearStepStates(3, currentStepByStage[stage], outcomeByStage[stage])` with §7.2.4's two tables: a request that can be opened has been filed, so `pending` is at the decision (`1`) and `approved` at the disposal (`2`); `disposed` is all done with no current step; `rejected` stops at the decision with an X. The three ids are the label keys (`stepKeys`).
- **K28:** the panel (`section`) and its first row (the stage and its owner) stay as they are (2D).
- **§7.13 ruling 6, §7.8:** the step names are new action words, "ยื่นคำขอ · พิจารณา · ตัดจำหน่ายจริง" ("Request · Decision · Execution"), and the list is named "ขั้นตอนการตัดจำหน่าย" ("Disposal steps"); the page passes them, and its cards keep `requestDetail`, `decisionDetail`, `executionDetail` (`:230`, `:269`, `:279`). New prop `stepsLabel: string` (the old list was named with the current stage).
- **§10.2:** the four keys go through `node scripts/messages-edit.mjs` in this commit.
- **FMG:** no budget row; the file joins `MIGRATED_FILES` (`p2c-budget.mjs` with no `NAME=` argument).

What users will see (`/disposal/<id>`):
- The three steps are the shared rail: 22px circles joined by a line, a green check for each done step, the current step's number in light primary, a red X on a rejected decision; the step names show from `md`, and on phones one line under the rail says, for example, "ขั้นที่ 2 จาก 3 · พิจารณา".
- The names are "ยื่นคำขอ", "พิจารณา", "ตัดจำหน่ายจริง" (they were "รายละเอียดคำขอ", "รายละเอียดการพิจารณา", "รายละเอียดการดำเนินการจริง", the card titles). A pending request now shows "พิจารณา" as the current step (it showed the first step); an approved one "ตัดจำหน่ายจริง"; a disposed one three checks and no current step.
- Screen readers hear the list "ขั้นตอนการตัดจำหน่าย" and each step with its state ("เสร็จแล้ว: ยื่นคำขอ", "ขั้นตอนปัจจุบัน: พิจารณา", "ปฏิเสธแล้ว: พิจารณา").

Not in this task:
- the panel frame and the stage row (2D, K28); the page header and cards (2B-4); `src/lib/step-states.ts` and `ui/steps.tsx` (2C-0, unchanged)
- do not run a formatter

**Files:**
- Modify: `src/components/disposal/disposal-workflow-stepper.tsx` (CRLF, 2 replacements)
- Modify: `src/app/[locale]/(dashboard)/disposal/[id]/page.tsx` (CRLF, 1 replacement)
- Modify: `messages/th.json`, `messages/en.json` (CRLF; only through `node scripts/messages-edit.mjs`: 4 keys)
- Modify: `tests/steps-ui.test.ts` (CRLF, 1 test appended)
- Modify: `tests/form-migration-guards.test.ts` (through `p2c-budget.mjs` only)

**Must keep passing without edits:**
- `tests/disposal-detail-workspace.test.ts:9`, `:12`, `:113` (the file, the name, the stepper under the header).
- `tests/step-states.test.ts`, `tests/thai-glossary.test.ts`, `tests/messages-parity.test.ts`, `tests/messages-edit.test.ts`.
- `tests/visual-foundation-guards.test.ts:91-99` (no status fill with faint text in one string: `Steps` keeps them apart).

**Interfaces:**
- Consumes: 2C-0 `Steps` (`label`, `steps`, `className`) from `@/components/ui/steps`, `getLinearStepStates` and `type StepOutcome` from `@/lib/step-states`; Task 1's `p2c-budget.mjs`.
- Produces: `DisposalWorkflowStepper` with the new required prop `stepsLabel`; `disposal/disposal-workflow-stepper.tsx` in `MIGRATED_FILES` (62 files); the keys `disposalPage.workflowStepsLabel` and `disposalPage.workflowSteps` `{ request, decision, execution }` (the last two entries of `disposalPage`).

| file | budgets | `MIGRATED_FILES` | messages |
|---|---|---|---|
| `disposal/disposal-workflow-stepper.tsx` | none | added | 4 new keys |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `git ls-files --eol src/components/disposal/disposal-workflow-stepper.tsx "src/app/[locale]/(dashboard)/disposal/[id]/page.tsx" tests/steps-ui.test.ts messages/th.json messages/en.json`, then `node --no-warnings <temp>/p2c5-precheck.mjs disposal/disposal-workflow-stepper.tsx`
Expected: `git status` prints nothing; all five `i/lf w/crlf`. The 11 shared lines `ok` (the `BATCH_FILES` line reads "the 3 files left after Task 2"), then:

```
ok      disposal/disposal-workflow-stepper.tsx (Task 3): exists
ok      disposal/disposal-workflow-stepper.tsx: budgets at their 6835bdf row
ok      disposal/disposal-workflow-stepper.tsx: CONSTRAINT_FLOORS no row
ok      disposal/disposal-workflow-stepper.tsx: not in MIGRATED_FILES, not in PENDING_FOOTER_PARTS
info    tests/form-migration-guards.test.ts: CRLF
info    disposal/disposal-workflow-stepper.tsx: CRLF · budget/live none · floors live 0/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0 · confirm() 0, without confirmLabel 0
preconditions hold for disposal/disposal-workflow-stepper.tsx
```

Run: `node -e "for (const l of ['th','en']) { const d = require('./messages/' + l + '.json').disposalPage; console.log(l, d.workflowStepsLabel, d.workflowSteps) }"`
Expected: `th undefined undefined` and `en undefined undefined` (the keys are new).

- [ ] **Step 2: Add the file to `MIGRATED_FILES`**

Run: `node --no-warnings <temp>/p2c-budget.mjs disposal/disposal-workflow-stepper.tsx`
Expected: `MIGRATED_FILES: added disposal/disposal-workflow-stepper.tsx`

Run: `node --test tests/form-migration-guards.test.ts`
Expected: PASS, `tests 23 · pass 23 · fail 0` (the old stepper has nothing the migrated-file guards look for).

- [ ] **Step 3: Append the failing test to `tests/steps-ui.test.ts`**

The file's `read` strips `\r`; `readFileSync` is imported. One exact replacement at the end of the file (`:122-124`, the import panel test's last lines).

Replace:

```ts
    assert.equal(typeof asset.importWizardStepComplete, "string", locale)
  }
})
```

with:

```ts
    assert.equal(typeof asset.importWizardStepComplete, "string", locale)
  }
})

test("the disposal request shows its three steps on the shared rail: filed, decision, disposal (S1, batch 5)", () => {
  const stepper = read("src/components/disposal/disposal-workflow-stepper.tsx")
  assert.match(stepper, /import \{ Steps \} from "@\/components\/ui\/steps"/)
  assert.match(stepper, /import \{ getLinearStepStates, type StepOutcome \} from "@\/lib\/step-states"/)
  assert.match(stepper, /export function DisposalWorkflowStepper\(/)
  // A request someone can open has been filed: pending waits at the decision, approved at the disposal (spec 2C §7.2.4).
  assert.match(stepper, /const currentStepByStage: Record<DisposalStage, number> = \{\n  pending_approval: 1,\n  awaiting_execution: 2,\n  complete: 2,\n  rejected: 1,\n\}/)
  assert.match(stepper, /const outcomeByStage: Record<DisposalStage, StepOutcome> = \{\n  pending_approval: "in_progress",\n  awaiting_execution: "in_progress",\n  complete: "complete",\n  rejected: "rejected",\n\}/)
  assert.match(stepper, /const states = getLinearStepStates\(stepKeys\.length, currentStepByStage\[stage\], outcomeByStage\[stage\]\)/)
  assert.match(stepper, /<Steps className="mt-4" label=\{stepsLabel\} steps=\{steps\} \/>/)
  assert.doesNotMatch(stepper, /grid grid-cols-3|text-white|aria-current|<ol\b|\bCircle\b|XCircle/, "the rail, its states and its words come from Steps")
  const page = read("src/app/[locale]/(dashboard)/disposal/[id]/page.tsx")
  assert.match(page, /stepsLabel=\{t\("workflowStepsLabel"\)\}\n\s+labels=\{\{\n\s+request: t\("workflowSteps\.request"\),\n\s+decision: t\("workflowSteps\.decision"\),\n\s+execution: t\("workflowSteps\.execution"\),\n\s+\}\}/)
  const words = {
    th: { label: "ขั้นตอนการตัดจำหน่าย", steps: { request: "ยื่นคำขอ", decision: "พิจารณา", execution: "ตัดจำหน่ายจริง" } },
    en: { label: "Disposal steps", steps: { request: "Request", decision: "Decision", execution: "Execution" } },
  }
  for (const locale of ["th", "en"] as const) {
    const disposal = (JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { disposalPage: Record<string, unknown> }).disposalPage
    assert.equal(disposal.workflowStepsLabel, words[locale].label, locale)
    assert.deepEqual(disposal.workflowSteps, words[locale].steps, locale)
  }
})
```

Run: `node --test tests/steps-ui.test.ts`
Expected: FAIL, `tests 9 · pass 8 · fail 1`: the new test, first on the `import { Steps }` regex.

- [ ] **Step 4: Add the four keys**

Save this file as `<temp>/p2c5-disposal-steps.json` (UTF-8):

```json
{ "set": {
  "th": { "disposalPage.workflowStepsLabel": "ขั้นตอนการตัดจำหน่าย", "disposalPage.workflowSteps.request": "ยื่นคำขอ", "disposalPage.workflowSteps.decision": "พิจารณา", "disposalPage.workflowSteps.execution": "ตัดจำหน่ายจริง" },
  "en": { "disposalPage.workflowStepsLabel": "Disposal steps", "disposalPage.workflowSteps.request": "Request", "disposalPage.workflowSteps.decision": "Decision", "disposalPage.workflowSteps.execution": "Execution" } } }
```

Run from the worktree root: `node scripts/messages-edit.mjs <temp>/p2c5-disposal-steps.json`
Expected: `messages updated: 4 th, 4 en, 0 deleted`. `git diff --stat messages` shows 7 insertions and 1 deletion in each file (the comma after `executeDisposalShort`, then `workflowStepsLabel` and the 5 lines of `workflowSteps`); both files stay CRLF (`node -e "const s=require('fs').readFileSync('messages/th.json','utf8');console.log((s.match(/\r\n/g)||[]).length,(s.match(/\n/g)||[]).length)"` prints `4318 4318`, and the same for `en.json`).

- [ ] **Step 5: Turn the stepper into the adapter, and pass the new labels**

Three exact replacements.

(1) `src/components/disposal/disposal-workflow-stepper.tsx:1-21`: the imports, the props (`stepsLabel` is new) and the two stage tables.

Replace:

```tsx
import { Check, Circle, XCircle } from "lucide-react"
import type { DisposalStage } from "@/lib/disposal-stage"

type DisposalWorkflowStepperProps = {
  stage: DisposalStage
  currentStageLabel: string
  ownerRoleLabel: string
  ownerLabel: string
  labels: {
    request: string
    decision: string
    execution: string
  }
}

const currentStepByStage: Record<DisposalStage, number> = {
  pending_approval: 0,
  awaiting_execution: 1,
  complete: 2,
  rejected: 1,
}
```

with:

```tsx
import { Steps } from "@/components/ui/steps"
import type { DisposalStage } from "@/lib/disposal-stage"
import { getLinearStepStates, type StepOutcome } from "@/lib/step-states"

type DisposalWorkflowStepperProps = {
  stage: DisposalStage
  currentStageLabel: string
  ownerRoleLabel: string
  ownerLabel: string
  stepsLabel: string
  labels: {
    request: string
    decision: string
    execution: string
  }
}

// A request someone can open has been filed, so "request" is always done (spec 2C section 7.2.4, S1): a pending
// request waits at the decision, an approved one at the disposal itself. A disposed request has every step done and
// none current; a rejected one stops at the decision with an X.
const currentStepByStage: Record<DisposalStage, number> = {
  pending_approval: 1,
  awaiting_execution: 2,
  complete: 2,
  rejected: 1,
}

const outcomeByStage: Record<DisposalStage, StepOutcome> = {
  pending_approval: "in_progress",
  awaiting_execution: "in_progress",
  complete: "complete",
  rejected: "rejected",
}

const stepKeys = ["request", "decision", "execution"] as const
```

(2) The same file, the component (`:23-70` before (1)). The file still ends with `}` and one line break.

Replace:

```tsx
export function DisposalWorkflowStepper({
  stage,
  currentStageLabel,
  ownerRoleLabel,
  ownerLabel,
  labels,
}: DisposalWorkflowStepperProps) {
  const currentStep = currentStepByStage[stage]
  const steps = [labels.request, labels.decision, labels.execution]

  return (
    <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <p className="text-sm font-semibold text-foreground">{currentStageLabel}</p>
        <p className="text-sm text-muted-foreground">{ownerRoleLabel}: {ownerLabel}</p>
      </div>
      <ol className="mt-4 grid grid-cols-3 gap-2" aria-label={currentStageLabel}>
        {steps.map((label, index) => {
          const isCurrent = index === currentStep
          const isComplete = index < currentStep || stage === "complete"
          const isRejected = stage === "rejected" && index === currentStep

          return (
            <li key={label} aria-current={isCurrent ? "step" : undefined} className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                    isRejected
                      ? "border-danger bg-danger-soft text-danger"
                      : isComplete
                        ? "border-success bg-success text-white"
                        : isCurrent
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {isRejected ? <XCircle className="h-3.5 w-3.5" /> : isComplete ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                </span>
                {index < steps.length - 1 ? <span className="h-px min-w-0 flex-1 bg-border" aria-hidden="true" /> : null}
              </div>
              <p className={`mt-2 text-xs font-medium ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>{label}</p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
```

with:

```tsx
// The stage and its owner stay the panel's first row (the panel itself waits for 2D, K28); the steps are the shared
// rail, which names its list, reads each step's state and shows "ขั้นที่ x จาก 3" on phones.
export function DisposalWorkflowStepper({
  stage,
  currentStageLabel,
  ownerRoleLabel,
  ownerLabel,
  stepsLabel,
  labels,
}: DisposalWorkflowStepperProps) {
  const states = getLinearStepStates(stepKeys.length, currentStepByStage[stage], outcomeByStage[stage])
  const steps = stepKeys.map((key, index) => ({ id: key, label: labels[key], state: states[index] }))

  return (
    <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <p className="text-sm font-semibold text-foreground">{currentStageLabel}</p>
        <p className="text-sm text-muted-foreground">{ownerRoleLabel}: {ownerLabel}</p>
      </div>
      <Steps className="mt-4" label={stepsLabel} steps={steps} />
    </section>
  )
}
```

(3) `src/app/[locale]/(dashboard)/disposal/[id]/page.tsx:203-208` (O12: only the stepper's props).

Replace:

```tsx
        ownerLabel={ownerContext.ownerLabel}
        labels={{
          request: t("requestDetail"),
          decision: t("decisionDetail"),
          execution: t("executionDetail"),
        }}
```

with:

```tsx
        ownerLabel={ownerContext.ownerLabel}
        stepsLabel={t("workflowStepsLabel")}
        labels={{
          request: t("workflowSteps.request"),
          decision: t("workflowSteps.decision"),
          execution: t("workflowSteps.execution"),
        }}
```

Check: `grep -n "Check\|Circle\|text-white\|aria-current\|<ol" src/components/disposal/disposal-workflow-stepper.tsx` prints nothing; the file has 59 lines.

- [ ] **Step 6: Run the tests for this task**

Run: `node --test tests/form-migration-guards.test.ts tests/steps-ui.test.ts tests/step-states.test.ts tests/disposal-detail-workspace.test.ts tests/mobile-action-bar.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts tests/messages-edit.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts`
Expected: PASS, `tests 108 · pass 108 · fail 0` (23 + 9 + 5 + 10 + 4 + 3 + 3 + 4 + 26 + 21).

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 1983 tests, 1982 pass, 0 fail, 1 skipped; tsc no errors (the page is the only caller and passes `stepsLabel`); lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat`
Expected: exactly 6 files: `disposal-workflow-stepper.tsx` 23 insertions and 34 deletions, the disposal page 4 and 3, `messages/th.json` and `messages/en.json` 7 and 1 each, `tests/steps-ui.test.ts` 24 insertions, `tests/form-migration-guards.test.ts` 1 insertion.

- [ ] **Step 8: Commit**

```bash
git add src/components/disposal/disposal-workflow-stepper.tsx "src/app/[locale]/(dashboard)/disposal/[id]/page.tsx" messages/th.json messages/en.json tests/steps-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): disposal request steps on the shared Steps rail, named for what each step does (2C batch 5, S1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 6 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 11):** `/th/disposal/<id>` for a pending, an approved, a disposed and a rejected request (whichever the dev data has; record the missing ones) at 375, 768 and 1440: pending = check, current "พิจารณา", upcoming; approved = check, check, current "ตัดจำหน่ายจริง"; disposed = three green checks, no current step, "ขั้นที่ 3 จาก 3 · ตัดจำหน่ายจริง" on phones; rejected = check, red X on "พิจารณา" (red name), upcoming. At 375 the names are hidden and the line under the rail names the step; no sideways scroll. The stage line and "ผู้อนุมัติ: …" stay above the rail. English pass: "Request · Decision · Execution", "Step 2 of 3 · Decision". NVDA: "ขั้นตอนการตัดจำหน่าย", list of 3, "เสร็จแล้ว: ยื่นคำขอ", "ขั้นตอนปัจจุบัน: พิจารณา" (or "ปฏิเสธแล้ว: พิจารณา"). Forced colors: the markers keep their borders, numbers, check and X.

---

### Task 4: Batch 5 · `ui/alert-dialog.tsx` and `ui/confirm-dialog.tsx` (K12: the confirm dialog takes the look of the other dialogs; two commits, 4a and 4b)

Spec §5.9 (the classes of `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogFooter`; `size`, `data-size`, `group/alert-dialog-content` and `AlertDialogMedia` go; `confirm-dialog.tsx` needs no change), §5.11 table B F, §5.12 row 5, §5.4 ruling 18 (ด18), K8, K12, I12 (2C-0 already turned `flex-col-reverse` into `flex-col` at `:94`), §9.4 (no row for either file). Both files are CRLF. One file, one commit: 4a `alert-dialog.tsx` (the look), then 4b `confirm-dialog.tsx` (no source change, R6).

Lines at `6835bdf`: `ui/alert-dialog.tsx` `AlertDialogContent` `:47-68` (class `:61`), `AlertDialogHeader` class `:78`, `AlertDialogFooter` `:86-100` (class `:94`), `AlertDialogTitle` class `:110`, `AlertDialogMedia` `:131-145`, the export list `:183-196` (`AlertDialogMedia` `:191`); `ui/confirm-dialog.tsx:64-110` (the provider's dialog; Cancel `:90-97` before Action `:98-106`); `tests/accessible-dialog.test.ts:86`; `tests/confirm-dialog-ui.test.ts:1-3`, `:39-41`.

Rulings this task applies:
- **§5.9, K12:** the box is white (`bg-surface`), anchored 12px above the bottom or the home bar on phones and centered from `sm` (`sm:max-w-lg`), a flex column that clips at `max-h-[92dvh]`; the header is `flex flex-col gap-2 border-b border-border px-4 py-4 text-left sm:px-5` (no X, so no `pr-16`); the title 16px `text-base font-semibold text-foreground`; the footer the grey band `flex shrink-0 flex-col gap-2 bg-background px-4 py-3 sm:flex-row sm:justify-end sm:px-5` with no top line (the header has one). `AlertDialogAction` and `AlertDialogCancel` keep their `size="default"` (K7) and variants.
- **§5.9, ด18:** the content's `size` prop, `data-size`, `group/alert-dialog-content` and `AlertDialogMedia` go: no caller uses them (`git grep -n "AlertDialogMedia" -- src tests` at `6835bdf` finds only `ui/alert-dialog.tsx`, and the one `<AlertDialogContent`, `confirm-dialog.tsx:71`, passes no `size`; the old footer string is pinned at `tests/accessible-dialog.test.ts:86`).
- **Ruling (this plan, R5):** the content's classes are §5.9's, in two strings: the box (with `shadow-overlay … motion-reduce:animate-none!`, which `tests/visual-foundation-guards.test.ts:73` reads in one string) and its phone position (`bottom-[max(…)] sm:top-[50%] sm:bottom-auto sm:translate-y-[-50%]`), the split `dialog.tsx` and `accessible-dialog.tsx` already have. In one string, GL1(c) counts the box as a fixed bottom bar (`ui/alert-dialog.tsx: 1 > 0`).
- **`tests/accessible-dialog.test.ts:86`** pins the old footer string (the 2C-0 K8 fix); it now pins the new footer string. `:87-89` (no `flex-col-reverse`) pass.
- **Ruling (this plan, R6), 4b:** `confirm-dialog.tsx` stays byte for byte (§5.9: cancel already comes first, and `variant={current.tone === "destructive" ? "destructive" : "default"}` must stay for `confirm-dialog-ui.test.ts:13`). Its commit adds it to `MIGRATED_FILES` (its batch is 5) and a test that pins the K8 order, the caller's verb with the "ยืนยัน" fallback, and parts with no class or size of their own (so the AlertDialog look applies). That test passes at once.
- **Not here (R7, open issue 6):** the `confirm-dialog-ui.test.ts:25-31` change is Task 5's; the spec's tests G and H wait for Tasks 6–8.

What users will see (every confirm through `useConfirm`: master-data deletes, attachment and purchase-document deletes, archive orphan file, close audit round, the integration client's rotate / enable / disable and scope confirm, the bulk discard confirms, the supplier's leave-without-saving):
- The box is white like the other dialogs. On phones it sits 12px above the bottom edge (above the home bar on iPhone) across the width less 12px a side, instead of floating in the middle with 16px margins; from `sm` it is centered, up to 512px wide.
- The title is 16px and left-aligned with a line under it (it was 18px and centered on phones); the description stays 14px grey under the title.
- The buttons sit in a grey band: on phones full width, "ยกเลิก" above the action; from `sm` a right-aligned row with the action last (the order 2C-0 set). Focus still starts on "ยกเลิก".

Not in this task:
- `ui/dialog.tsx`, `ui/accessible-dialog.tsx` (2C-0); the dialogs that stay `AccessibleDialog` (for example the PM plan state actions, K12)
- the callers' verb labels (Tasks 6–8) and `maintenance-attachments` (Task 5)
- messages: no key changes. Do not run a formatter.

**Files:**
- 4a: Modify `src/components/ui/alert-dialog.tsx` (CRLF, 6 replacements), `tests/accessible-dialog.test.ts` (CRLF, 1), `tests/confirm-dialog-ui.test.ts` (CRLF, 1 test appended), `tests/form-migration-guards.test.ts` (through `p2c-budget.mjs` only)
- 4b: Modify `tests/confirm-dialog-ui.test.ts` (CRLF, the helper import and 1 test appended), `tests/form-migration-guards.test.ts` (through `p2c-budget.mjs` only); `src/components/ui/confirm-dialog.tsx` is not edited

**Must keep passing without edits:**
- `tests/visual-foundation-guards.test.ts:67-84` (the scrim string `:72`; `shadow-overlay[^"]*motion-reduce:animate-none!` in one string of `alert-dialog.tsx` `:73`).
- `tests/confirm-dialog-ui.test.ts:7-21` (the import, the settle calls, the `variant` expression, the focus handlers, `useConfirm`'s throw, the provider in the shell), `:24-41` (deletes report a delete; `:36` `useDeleteAction(endpoint)`).
- `tests/dropdown-menus-ui.test.ts:69-80` (`onCloseAutoFocus` returns focus to the menu trigger), `tests/ui-overlay-guards.test.ts`, `tests/accessible-dialog.test.ts:79-90`.

**Interfaces:**
- Consumes: 2A `Button` (through `AlertDialogAction` / `AlertDialogCancel`, unchanged); Task 1's `p2c-budget.mjs`.
- Produces: `AlertDialogContent` without `size`; no `AlertDialogMedia` export; the exports otherwise unchanged (`ConfirmProvider` uses Content, Header, Title, Description, Footer, Cancel, Action). `ui/alert-dialog.tsx` (4a) and `ui/confirm-dialog.tsx` (4b) in `MIGRATED_FILES` (63, then 64: every `BATCH_FILES` entry).

| file | budgets | `MIGRATED_FILES` | source |
|---|---|---|---|
| `ui/alert-dialog.tsx` (4a) | none | added | K12 look |
| `ui/confirm-dialog.tsx` (4b) | none | added | unchanged (R6) |

**Task 4a: `ui/alert-dialog.tsx`**

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `git ls-files --eol src/components/ui/alert-dialog.tsx tests/accessible-dialog.test.ts tests/confirm-dialog-ui.test.ts`, then `node --no-warnings <temp>/p2c5-precheck.mjs ui/alert-dialog.tsx`
Expected: `git status` prints nothing; all three `i/lf w/crlf`. The 11 shared lines `ok`, then:

```
ok      ui/alert-dialog.tsx (Task 4a): exists
ok      ui/alert-dialog.tsx: budgets at their 6835bdf row
ok      ui/alert-dialog.tsx: CONSTRAINT_FLOORS no row
ok      ui/alert-dialog.tsx: not in MIGRATED_FILES, not in PENDING_FOOTER_PARTS
info    tests/form-migration-guards.test.ts: CRLF
info    ui/alert-dialog.tsx: CRLF · budget/live none · floors live 0/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0 · confirm() 0, without confirmLabel 0
preconditions hold for ui/alert-dialog.tsx
```

- [ ] **Step 2: Add the file to `MIGRATED_FILES`**

Run: `node --no-warnings <temp>/p2c-budget.mjs ui/alert-dialog.tsx`
Expected: `MIGRATED_FILES: added ui/alert-dialog.tsx`

Run: `node --test tests/form-migration-guards.test.ts`
Expected: PASS, `tests 23 · pass 23 · fail 0`.

- [ ] **Step 3: Update the tests (the failing tests)**

Two exact replacements; both files' `read` strips `\r`.

(1) `tests/accessible-dialog.test.ts:86`.

Replace:

```ts
  assert.match(alert, /"flex flex-col gap-2 group-data-\[size=sm\]\/alert-dialog-content:grid /)
```

with:

```ts
  assert.match(alert, /"flex shrink-0 flex-col gap-2 bg-background px-4 py-3 sm:flex-row sm:justify-end sm:px-5"/)
```

(2) `tests/confirm-dialog-ui.test.ts`, at the end (`:39-41`): the spec's test F.

Replace:

```ts
  assert.equal(th.common.deletedSuccess, "ลบแล้ว")
  assert.equal(en.common.deletedSuccess, "Deleted")
})
```

with:

```ts
  assert.equal(th.common.deletedSuccess, "ลบแล้ว")
  assert.equal(en.common.deletedSuccess, "Deleted")
})

// Phase 2C batch 5 (spec 2C §5.9, §5.11 F, K12, K8): a confirm looks like the other dialogs: white, above the iPhone
// home bar on phones and centered from sm, a 16px left-aligned title over the header line, and a grey footer band with
// cancel first and the action last. The size variants and AlertDialogMedia (no caller) are gone.
test("confirm dialogs look like the other dialogs (K12)", () => {
  const source = read("src/components/ui/alert-dialog.tsx")
  assert.match(source, /"fixed left-\[50%\] z-50 flex max-h-\[92dvh\] w-\[calc\(100%-1\.5rem\)\] translate-x-\[-50%\] flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-overlay [^"]*sm:max-w-lg motion-reduce:animate-none!",\n\s+"bottom-\[max\(0\.75rem,env\(safe-area-inset-bottom\)\)\] sm:top-\[50%\] sm:bottom-auto sm:translate-y-\[-50%\]",/)
  assert.match(source, /"flex flex-col gap-2 border-b border-border px-4 py-4 text-left sm:px-5"/)
  assert.match(source, /"flex shrink-0 flex-col gap-2 bg-background px-4 py-3 sm:flex-row sm:justify-end sm:px-5"/)
  assert.match(source, /"text-base font-semibold text-foreground"/)
  assert.match(source, /cn\("text-sm text-muted-foreground", className\)/)
  assert.doesNotMatch(source, /flex-col-reverse|data-\[size=|data-size|AlertDialogMedia|group\/alert-dialog-content|place-items-center|\bp-6\b|size\?: "default" \| "sm"/)
})
```

Run: `node --test tests/accessible-dialog.test.ts tests/confirm-dialog-ui.test.ts`
Expected: FAIL, `tests 11 · pass 9 · fail 2`: `dialog primitives keep the primary action last on phones (K8)` (the footer string) and `confirm dialogs look like the other dialogs (K12)`.

- [ ] **Step 4: Give `AlertDialog` the dialog look (`src/components/ui/alert-dialog.tsx`)**

Six exact replacements. The file keeps its shadcn style (no trailing comma after `className` inside `cn(`).

(1) `AlertDialogContent` (`:47-61`): no `size`, no `data-size`, the two strings of R5.

Replace:

```tsx
function AlertDialogContent({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content> & {
  size?: "default" | "sm"
}) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        data-size={size}
        className={cn(
          "group/alert-dialog-content fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-overlay duration-200 outline-none data-[size=sm]:max-w-xs data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[size=default]:sm:max-w-lg motion-reduce:animate-none!",
```

with:

```tsx
// The look of AccessibleDialog (spec 2C section 5.9, K12): white, above the iPhone home bar on phones and centered from
// sm. The header carries the line and the footer the grey band, so a confirm has no body of its own. The box and its
// phone position are two strings, as dialog.tsx and accessible-dialog.tsx split them: a dialog is not a fixed bottom
// bar (FMG GL1).
function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        className={cn(
          "fixed left-[50%] z-50 flex max-h-[92dvh] w-[calc(100%-1.5rem)] translate-x-[-50%] flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-overlay duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg motion-reduce:animate-none!",
          "bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:top-[50%] sm:bottom-auto sm:translate-y-[-50%]",
```

(2) The header class (`:78`).

Replace:

```tsx
        "grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-center has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-6 sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-left sm:group-data-[size=default]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]",
```

with:

```tsx
        "flex flex-col gap-2 border-b border-border px-4 py-4 text-left sm:px-5",
```

(3) `AlertDialogFooter` (`:86-94`).

Replace:

```tsx
function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "flex flex-col gap-2 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end",
```

with:

```tsx
// Cancel first, the action last (K8): phones stack them full width with cancel on top, and from sm they form a
// right-aligned row. No top line: the header already has one.
function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "flex shrink-0 flex-col gap-2 bg-background px-4 py-3 sm:flex-row sm:justify-end sm:px-5",
```

(4) The title class (`:110`).

Replace:

```tsx
        "text-lg font-semibold sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2",
```

with:

```tsx
        "text-base font-semibold text-foreground",
```

(5) `AlertDialogMedia` goes (`:131-147`).

Replace:

```tsx
function AlertDialogMedia({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-media"
      className={cn(
        "mb-2 inline-flex size-16 items-center justify-center rounded-md bg-muted sm:group-data-[size=default]/alert-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-8",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogAction({
```

with:

```tsx
function AlertDialogAction({
```

(6) The export list.

Replace:

```tsx
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
```

with:

```tsx
  AlertDialogHeader,
  AlertDialogOverlay,
```

Check: `grep -n "size\|Media\|group/\|p-6\|place-items" src/components/ui/alert-dialog.tsx` prints 6 lines, the `size` of `AlertDialogAction` (`:137`, `:140`, `:142`) and `AlertDialogCancel` (`:155`, `:158`, `:160`), unchanged.

- [ ] **Step 5: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/accessible-dialog.test.ts tests/confirm-dialog-ui.test.ts tests/visual-foundation-guards.test.ts tests/ui-overlay-guards.test.ts tests/dropdown-menus-ui.test.ts`
Expected: PASS, `tests 78 · pass 78 · fail 0` (23 + 7 + 4 + 26 + 12 + 6).

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 1984 tests, 1983 pass, 0 fail, 1 skipped; tsc no errors (no caller passed `size` to `AlertDialogContent` or used `AlertDialogMedia`); lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat`
Expected: exactly 4 files: `alert-dialog.tsx` 12 insertions and 26 deletions, `tests/accessible-dialog.test.ts` 1 and 1, `tests/confirm-dialog-ui.test.ts` 13 insertions, `tests/form-migration-guards.test.ts` 1 insertion.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/alert-dialog.tsx tests/accessible-dialog.test.ts tests/confirm-dialog-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): AlertDialog takes the dialog look: white, above the home bar, 16px title and a footer band (2C batch 5, K12)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit. `git status --short src tests messages` prints nothing.

**Task 4b: `ui/confirm-dialog.tsx`**

- [ ] **Step 8: Check what this task builds on**

Run: `git ls-files --eol src/components/ui/confirm-dialog.tsx tests/confirm-dialog-ui.test.ts`, then `node --no-warnings <temp>/p2c5-precheck.mjs ui/confirm-dialog.tsx`
Expected: both `i/lf w/crlf`. The 11 shared lines `ok`, then:

```
ok      ui/confirm-dialog.tsx (Task 4b): exists
ok      ui/confirm-dialog.tsx: budgets at their 6835bdf row
ok      ui/confirm-dialog.tsx: CONSTRAINT_FLOORS no row
ok      ui/confirm-dialog.tsx: not in MIGRATED_FILES, not in PENDING_FOOTER_PARTS
info    tests/form-migration-guards.test.ts: CRLF
info    ui/confirm-dialog.tsx: CRLF · budget/live none · floors live 0/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0 · confirm() 0, without confirmLabel 0
preconditions hold for ui/confirm-dialog.tsx
```

- [ ] **Step 9: Add the file to `MIGRATED_FILES`**

Run: `node --no-warnings <temp>/p2c-budget.mjs ui/confirm-dialog.tsx`
Expected: `MIGRATED_FILES: added ui/confirm-dialog.tsx`

Run: `node --test tests/form-migration-guards.test.ts`
Expected: PASS, `tests 23 · pass 23 · fail 0`.

- [ ] **Step 10: Pin the provider's contract (`tests/confirm-dialog-ui.test.ts`)**

Two exact replacements.

(1) The imports (`:1-3`): the JSX reader comes in.

Replace:

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
import { findJsxTags, jsxAttrValue } from "./helpers/source-files.ts"
```

(2) The end of the file (4a's test, its last lines).

Replace:

```ts
  assert.doesNotMatch(source, /flex-col-reverse|data-\[size=|data-size|AlertDialogMedia|group\/alert-dialog-content|place-items-center|\bp-6\b|size\?: "default" \| "sm"/)
})
```

with:

```ts
  assert.doesNotMatch(source, /flex-col-reverse|data-\[size=|data-size|AlertDialogMedia|group\/alert-dialog-content|place-items-center|\bp-6\b|size\?: "default" \| "sm"/)
})

// Phase 2C batch 5 (spec 2C §5.9, K8, K12): the confirm provider itself does not change. Cancel comes before the
// action in the DOM (phones stack cancel on top and the action last), its parts take no class or size of their own
// (the AlertDialog look applies), and the action reads the caller's verb, "ยืนยัน" only when a caller gives none.
test("the confirm provider puts cancel first and the caller's verb last, on the plain AlertDialog parts (K8, K12)", () => {
  const source = read("src/components/ui/confirm-dialog.tsx")
  assert.ok(source.indexOf("<AlertDialogCancel") < source.indexOf("<AlertDialogAction"), "cancel first, the action last (K8)")
  assert.match(source, /\{current\.cancelLabel \?\? tCommon\("cancel"\)\}/)
  assert.match(source, /\{current\.confirmLabel \?\? tCommon\("confirm"\)\}/)
  const parts = findJsxTags(source, ["AlertDialog\\w*"])
  assert.equal(parts.length, 8, "AlertDialog, Content, Header, Title, Description, Footer, Cancel, Action")
  assert.deepEqual(
    parts.filter((tag) => jsxAttrValue(tag.text, "className") !== null || jsxAttrValue(tag.text, "size") !== null).map((tag) => tag.name),
    [],
    "the parts carry the look (K12)",
  )
})
```

Run: `node --test tests/form-migration-guards.test.ts tests/confirm-dialog-ui.test.ts tests/dropdown-menus-ui.test.ts`
Expected: PASS, `tests 34 · pass 34 · fail 0` (23 + 5 + 6). The new test passes at once: it pins what §5.9 keeps (R6). To see it bite, add `className="flex-col-reverse"` to `<AlertDialogFooter>` in `confirm-dialog.tsx`, run `node --test tests/confirm-dialog-ui.test.ts` (FAIL, naming `'AlertDialogFooter'`), then undo the edit with `git checkout -- src/components/ui/confirm-dialog.tsx`.

- [ ] **Step 11: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 1985 tests, 1984 pass, 0 fail, 1 skipped; tsc no errors; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat`
Expected: exactly 2 files: `tests/confirm-dialog-ui.test.ts` 18 insertions, `tests/form-migration-guards.test.ts` 1 insertion. `src/components/ui/confirm-dialog.tsx` does not appear.

- [ ] **Step 12: Commit**

```bash
git add tests/confirm-dialog-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "test(ui): confirm provider keeps cancel first and the caller's verb on plain AlertDialog parts; mark it migrated (2C batch 5, K8, K12)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 2 files in the commit. `git status --short src tests messages` prints nothing.

**For the dev-app check (Task 11):** open a confirm and cancel it, never confirm: delete on a master-data row (`/th/master-data/brands`, ⋯ → "ลบ"), delete on an asset attachment (`/th/assets/<id>`), and "ปิดรอบ" on an open audit round, at 375, 768 and 1440. At 375 the box sits 12px above the bottom edge, white, the title 16px left-aligned over a line, the band with "ยกเลิก" above the action, both full width; at 768 and 1440 centered, at most 512px, a right-aligned row with the action last. Focus starts on "ยกเลิก"; Tab goes cancel → action; Esc closes and focus returns to ⋯ or the button that opened it. English pass at 1440. Forced colors: the box border and the focus outline show. Reduced motion: no zoom. axe (the 6 rules of plan 2C-4) 0 on the open confirm. iPhone (person): the box clears the home bar.

---

### Task 5: Batch 5 · `maintenance/maintenance-attachments.tsx` (the repair attachment delete asks through `useConfirm`, K12; `PENDING_FOOTER_PARTS` becomes empty; the guard end state of batch 5)

Spec §5.9 (`maintenance-attachments.tsx` → `useConfirm`: the confirm with `tCommon("deleteConfirm")`, `confirmLabel: tCommon("delete")`, `tone: "destructive"`; `pendingDeleteId`, its reset in `handleDelete`, the dialog `:239-256` and the `AccessibleDialog` import go; the success toast becomes `tCommon("deletedSuccess")`; the open button changes only its `onClick`), §5.11 table A row `confirm-dialog-ui.test.ts:25-31`, §5.4 ruling 20 (ด20), §8.14 ruling 7, K12, §9.4 row 1a (`LOADER2` 1 stays: the delete button's spinner, 2D), §9.9 (`PENDING_FOOTER_PARTS` empty after batch 5), DH "UI Round 4 Phase 2C Plan 4 …", "Handed on to 2C plan 5". The file is CRLF. It is in `MIGRATED_FILES` since batch 1a; one file, one commit.

Lines at `6835bdf`: the `AccessibleDialog` import `:13`, the hooks `:39-42` (`pendingDeleteId` `:42`), `handleDelete` `:81-96` (its reset `:82`, the toast `:89`), the delete button `:202-214` (`onClick` `:204`, its spinner `:210`), the dialog `:239-256`; `tests/maintenance-attachments-ui.test.ts:20`, `:25`; `tests/confirm-dialog-ui.test.ts:30-31` (`:31-32` after Task 4b's import line); FMG `PENDING_FOOTER_PARTS` `:319-321` (`:322-324` after Tasks 1–4b).

Rulings this task applies:
- **§5.9, K12, R8:** `const confirm = useConfirm()` takes the place of the `pendingDeleteId` state, and `handleDelete` asks first: `if (!(await confirm({ title: tCommon("deleteConfirm"), confirmLabel: tCommon("delete"), tone: "destructive" }))) return`, as `asset-attachments.tsx:121`, `disposal-attachments.tsx:63` and `asset-purchase-documents.tsx:48` do (the spec's separate `requestDelete` would be a second function for the same thing). The delete button calls `void handleDelete(attachment.id)`; its classes, `disabled={deletingId === attachment.id}`, its `title` and its spinner stay (2D; `LOADER2` 1 at `:210` holds, so its row comment stays true). The dialog `:238-256` (with its blank line) and the import go.
- **§5.9:** the success toast says `tCommon("deletedSuccess")` ("ลบแล้ว", DESIGN.md) instead of `savedSuccess`.
- **R7:** the spec's `confirm-dialog-ui.test.ts:25-31` row lands here: `maintenance-attachments.tsx` joins the "deletes report a delete" list (it asserts this file's `deletedSuccess` and `tone: "destructive"`); `doesNotMatch(/AccessibleDialog/)` goes into the file's own test, `maintenance-attachments-ui.test.ts:25`, whose name `:20` drops "waits for batch 5".
- **FMG (R8):** the file's line leaves `PENDING_FOOTER_PARTS` by exact replacement (`p2c-budget.mjs` refuses a file already in `MIGRATED_FILES`), and the set becomes `new Set<string>([…])`: empty, `new Set([…])` is `Set<never>` and `tsc` fails at `PENDING_FOOTER_PARTS.has(file.path)` (`TS2345`). GD2 then checks the file like any other (no `AccessibleDialog` left).

What users will see (`/maintenance/<id>`, a record you may edit, its attachments):
- Deleting an attachment opens the shared confirm (Task 4a's look): "ต้องการลบรายการนี้หรือไม่?", "ยกเลิก" and the red "ลบ"; focus starts on "ยกเลิก", Esc cancels, and focus returns to the delete button. Before, it was a home-made box with two buttons that did not follow the dialog rules.
- After the delete the toast says "ลบแล้ว" (it said "บันทึกสำเร็จ"). While the file is deleted, its card's delete button shows its spinner, as before.

Not in this task:
- the delete, preview and download buttons and the attachment cards (2D, §8.10); the upload `Field`, `NativeSelect` and `FileDropzone` (batch 1a, done)
- the PM plan state dialog (`maintenance-plan-state-actions.tsx`, stays `AccessibleDialog`, K12)
- messages: no key changes (`common.deleteConfirm`, `common.delete`, `common.deletedSuccess` exist). Do not run a formatter.

**Files:**
- Modify: `src/components/maintenance/maintenance-attachments.tsx` (CRLF, 6 replacements)
- Modify: `tests/maintenance-attachments-ui.test.ts` (CRLF, 2), `tests/confirm-dialog-ui.test.ts` (CRLF, 1)
- Modify: `tests/form-migration-guards.test.ts` (CRLF, 1 exact replacement)
- Temp folder only, never committed: `p2c5-guard-state.mjs`

**Must keep passing without edits:**
- `tests/maintenance-attachments-ui.test.ts:5-18` (`canEdit` / `canDelete` gates, no `window.confirm`; the page passes `canEdit={canAttach}` and `canDelete={canEdit}`).
- `tests/attachment-preview-dialog-ui.test.ts:16-22`, `tests/maintenance-i18n.test.ts:24-35` (`getMaintenanceErrorMessage(payload?.code, t`), `tests/file-evidence-ui.test.ts`, `tests/repair-record-detail-ui.test.ts`.
- `tests/confirm-dialog-ui.test.ts:36` (`useDeleteAction(endpoint)`) and the Task 4 tests.

**Interfaces:**
- Consumes: `useConfirm` from `@/components/ui/confirm-dialog` (with Task 4a's look); the `ConfirmProvider` in the dashboard shell (`confirm-dialog-ui.test.ts:19-22`).
- Produces: no `AccessibleDialog` in the file; `PENDING_FOOTER_PARTS` empty (`new Set<string>`); the batch-5 end state of FMG (Step 8), which Task 10 starts from.

| file | `LOADER2` | `PENDING_FOOTER_PARTS` | `MIGRATED_FILES` |
|---|---|---|---|
| `maintenance/maintenance-attachments.tsx` | 1, unchanged (the delete button `:210`, 2D) | listed → removed (the set is empty) | listed since 1a |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `git ls-files --eol src/components/maintenance/maintenance-attachments.tsx tests/maintenance-attachments-ui.test.ts tests/confirm-dialog-ui.test.ts`, then `node --no-warnings <temp>/p2c5-precheck.mjs maintenance/maintenance-attachments.tsx`
Expected: `git status` prints nothing; all three `i/lf w/crlf`. The 11 shared lines `ok`, then:

```
ok      maintenance/maintenance-attachments.tsx (Task 5): exists
ok      maintenance/maintenance-attachments.tsx: budgets at their 6835bdf row
ok      maintenance/maintenance-attachments.tsx: CONSTRAINT_FLOORS no row
ok      maintenance/maintenance-attachments.tsx: in MIGRATED_FILES, in PENDING_FOOTER_PARTS
info    tests/form-migration-guards.test.ts: CRLF
info    maintenance/maintenance-attachments.tsx: CRLF · budget/live LOADER2 1/1 · floors live 0/0/0 · AccessibleDialog 1 · AccessibleDialogFooter 0 · confirm() 0, without confirmLabel 0
preconditions hold for maintenance/maintenance-attachments.tsx
```

- [ ] **Step 2: Take the file out of `PENDING_FOOTER_PARTS` (the failing guard)**

One exact replacement in `tests/form-migration-guards.test.ts` (`:322-325`).

Replace:

```ts
const PENDING_FOOTER_PARTS = new Set([
  // 1a
  `${C}maintenance/maintenance-attachments.tsx`, // the delete dialog :239 waits for batch 5 (K12)
  // 1b
```

with:

```ts
const PENDING_FOOTER_PARTS = new Set<string>([
  // 1a
  // 1b
```

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL, `tests 23 · pass 22 · fail 1`: GD2, naming only `'src/components/maintenance/maintenance-attachments.tsx: 1 AccessibleDialog, 0 AccessibleDialogFooter'`.

- [ ] **Step 3: Update the tests (the failing tests)**

Three exact replacements. Both files' sources are read with `\r` stripped.

(1) `tests/maintenance-attachments-ui.test.ts:20`, the name.

Replace:

```ts
test("the attachment type select uses Field and NativeSelect, and the delete dialog waits for batch 5 (2C batch 1a)", () => {
```

with:

```ts
test("the attachment type select uses Field and NativeSelect (2C batch 1a), and delete asks through useConfirm (K12, batch 5)", () => {
```

(2) `tests/maintenance-attachments-ui.test.ts:25`.

Replace:

```ts
  assert.match(source, /<AccessibleDialog open=\{Boolean\(pendingDeleteId\)\} title=\{tCommon\("deleteConfirm"\)\}/)
```

with:

```ts
  // Batch 5 (spec 2C §5.9, K12): the shared confirm with the verb "ลบ" replaces the file's own dialog; the delete
  // button stays as it is (2D) and only starts handleDelete, which asks first.
  assert.match(source, /async function handleDelete\(id: string\) \{\n\s+if \(!\(await confirm\(\{ title: tCommon\("deleteConfirm"\), confirmLabel: tCommon\("delete"\), tone: "destructive" \}\)\)\) return\n\s+setDeletingId\(id\)/)
  assert.match(source, /onClick=\{\(\) => void handleDelete\(attachment\.id\)\}/)
  assert.doesNotMatch(source, /AccessibleDialog|pendingDeleteId|savedSuccess/)
```

(3) `tests/confirm-dialog-ui.test.ts`, the end of the delete list (`:31-32` after Task 4b).

Replace:

```ts
    "src/components/master-data/asset-model-form.tsx",
  ]) {
```

with:

```ts
    "src/components/master-data/asset-model-form.tsx",
    "src/components/maintenance/maintenance-attachments.tsx",
  ]) {
```

Run: `node --test tests/maintenance-attachments-ui.test.ts tests/confirm-dialog-ui.test.ts`
Expected: FAIL, `tests 8 · pass 6 · fail 2`: `the attachment type select uses Field and NativeSelect (2C batch 1a), and delete asks through useConfirm (K12, batch 5)` and `deletes report a delete, not a save`.

- [ ] **Step 4: Move the delete onto `useConfirm` (`src/components/maintenance/maintenance-attachments.tsx`)**

Six exact replacements.

(1) The import (`:13`).

Replace:

```tsx
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
```

with:

```tsx
import { useConfirm } from "@/components/ui/confirm-dialog"
```

(2) The hooks (`:39-42`): the confirm takes the place of `pendingDeleteId`.

Replace:

```tsx
  const tCommon = useTranslations("common")
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
```

with:

```tsx
  const tCommon = useTranslations("common")
  const confirm = useConfirm()
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
```

(3) `handleDelete` asks first (`:81-83`).

Replace:

```tsx
  async function handleDelete(id: string) {
    setPendingDeleteId(null)
    setDeletingId(id)
```

with:

```tsx
  async function handleDelete(id: string) {
    if (!(await confirm({ title: tCommon("deleteConfirm"), confirmLabel: tCommon("delete"), tone: "destructive" }))) return
    setDeletingId(id)
```

(4) The success toast (`:89`).

Replace:

```tsx
      toast.success(tCommon("savedSuccess"))
```

with:

```tsx
      toast.success(tCommon("deletedSuccess"))
```

(5) The delete button's `onClick` (`:204`); the rest of the button stays (2D).

Replace:

```tsx
                  onClick={() => setPendingDeleteId(attachment.id)}
```

with:

```tsx
                  onClick={() => void handleDelete(attachment.id)}
```

(6) The dialog goes (`:236-257`).

Replace:

```tsx
        closeLabel={tCommon("close")}
      />

      <AccessibleDialog open={Boolean(pendingDeleteId)} title={tCommon("deleteConfirm")} busy={Boolean(deletingId)} onClose={() => setPendingDeleteId(null)}>
            <div className="flex justify-end gap-2 p-5">
              <button
                type="button"
                onClick={() => setPendingDeleteId(null)}
                className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-medium"
              >
                {tCommon("cancel")}
              </button>
              <button
                type="button"
                onClick={() => { if (pendingDeleteId) handleDelete(pendingDeleteId) }}
                className="inline-flex min-h-11 items-center rounded-md bg-danger px-4 text-sm font-medium text-white"
              >
                {tCommon("delete")}
              </button>
            </div>
      </AccessibleDialog>
    </section>
```

with:

```tsx
        closeLabel={tCommon("close")}
      />
    </section>
```

Check: `grep -n "AccessibleDialog\|pendingDeleteId\|savedSuccess\|Loader2" src/components/maintenance/maintenance-attachments.tsx` prints 2 lines: `6:` (the `lucide-react` import) and `210:` (the delete button's spinner, unchanged).

- [ ] **Step 5: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/maintenance-attachments-ui.test.ts tests/confirm-dialog-ui.test.ts tests/attachment-preview-dialog-ui.test.ts tests/maintenance-i18n.test.ts tests/repair-record-detail-ui.test.ts tests/file-evidence-ui.test.ts`
Expected: PASS, `tests 64 · pass 64 · fail 0` (23 + 3 + 5 + 3 + 4 + 10 + 16).

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 1985 tests, 1984 pass, 0 fail, 1 skipped (no new test; three edited); tsc no errors (with `new Set<string>`); lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat`
Expected: exactly 4 files: `maintenance-attachments.tsx` 5 insertions and 24 deletions, `tests/maintenance-attachments-ui.test.ts` 6 and 2, `tests/confirm-dialog-ui.test.ts` 1 insertion, `tests/form-migration-guards.test.ts` 1 insertion and 2 deletions.

- [ ] **Step 7: Commit**

```bash
git add src/components/maintenance/maintenance-attachments.tsx tests/maintenance-attachments-ui.test.ts tests/confirm-dialog-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): repair attachment delete asks through useConfirm; no dialog waits for its footer part (2C batch 5, K12)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit. `git status --short src tests messages` prints nothing.

- [ ] **Step 8: Check the guard state after Task 5**

Save this script as `p2c5-guard-state.mjs` in your temp folder (never in the repo):

```js
// Guard state after Task 5 of plan 2C-5: run from the worktree root. Prints every budget of
// tests/form-migration-guards.test.ts as "NAME: <entries> entries, <sum>" and fails if anything differs from the end
// state of batch 5 (spec 2C §9.4, §9.9, §10.4 table C): every 2C file migrated, no dialog waiting for its footer part,
// the two fixed bottom strings that stay (the register's phone bulk bar for phase 3, ActionBar), and only the kept
// spinners and fields of batches 1-4. Never commit this file.
import { existsSync, readFileSync } from "node:fs"

const guard = readFileSync("tests/form-migration-guards.test.ts", "utf8").replace(/\r\n/g, "\n")
const block = (name) => new RegExp(`^const ${name}\\b[\\s\\S]*?^[}\\]]`, "m").exec(guard)?.[0] ?? ""
const entries = (name) => [...block(name).matchAll(/^\s+\[`\$\{C\}([^`]+)`\]: (\[[^\]]*\]|\d+)/gm)].map((match) => ({ path: match[1], value: match[2] }))
const listed = (name) => [...block(name).matchAll(/^\s+`\$\{C\}([^`]+)`,/gm)].map((match) => match[1])
const batches = [...guard.matchAll(/^\s+"([0-9a-g]+)": \[([^\]]*)\]/gm)].map((match) => ({ id: match[1], files: [...match[2].matchAll(/"([^"]+)"/g)].map((item) => item[1]) }))
const all = batches.flatMap((batch) => batch.files)
const batch5 = batches.find((batch) => batch.id === "5")?.files ?? []
// What stays after batch 5 on purpose: the room search (O20), the label print toolbar (K21), the spinners outside
// buttons (I27, 2D), and the two fixed bottom strings (the register's bulk bar for phase 3, ActionBar).
const KEEP = {
  RAW_FIELDS: { "audit/audit-scan-room-picker.tsx": "1", "assets/asset-label-print.tsx": "2" },
  LOADER2: {
    "maintenance/maintenance-attachments.tsx": "1",
    "disposal/disposal-asset-picker.tsx": "1",
    "audit/audit-scan-check-form.tsx": "1",
    "assets/asset-component-manager.tsx": "1",
    "disposal/disposal-bulk-approval.tsx": "2",
    "disposal/disposal-bulk-execution.tsx": "1",
    "admin/IntegrationClientManager.tsx": "2",
    "assets/asset-label-batch-tool.tsx": "2",
    "assets/asset-scan-search-tool.tsx": "1",
    "asset-operations/transaction-cancel-dialog.tsx": "1",
  },
  FIXED_BOTTOM_BARS: { "assets/asset-register-table.tsx": "1", "ui/action-bar.tsx": "1" },
}
const problems = []
for (const name of ["LOCAL_FIELD", "RAW_FIELDS", "FIELD_CLASS_STRINGS", "OLD_MARKUP", "LOADER2", "OLD_HELPERS", "REVERSE", "CLOSE_LABEL_IS_CANCEL", "FIXED_BOTTOM_BARS"]) {
  const list = entries(name)
  console.log(`${name}: ${list.length} entries, ${list.reduce((sum, item) => sum + Number(item.value), 0)}`)
  const keep = KEEP[name] ?? {}
  for (const item of list) if (keep[item.path] !== item.value) problems.push(`${name} holds ${item.value} for ${item.path}`)
  for (const [path, value] of Object.entries(keep)) if (!list.some((item) => item.path === path && item.value === value)) problems.push(`${name} should keep ${value} for ${path}`)
}
console.log(`CONSTRAINT_FLOORS: ${entries("CONSTRAINT_FLOORS").length} entries`)
const migrated = listed("MIGRATED_FILES")
console.log(`BATCH_FILES: ${all.length} files · MIGRATED_FILES: ${migrated.length} (batch 5: ${batch5.filter((path) => migrated.includes(path)).length} of ${batch5.length})`)
for (const path of all) if (!migrated.includes(path)) problems.push(`MIGRATED_FILES lacks ${path}`)
for (const path of all) if (!existsSync(`src/components/${path}`)) problems.push(`BATCH_FILES names a missing file: ${path}`)
const pending = listed("PENDING_FOOTER_PARTS")
console.log(`PENDING_FOOTER_PARTS: ${pending.length}${pending.length ? ` (${pending.join(", ")})` : ""}`)
if (pending.length > 0) problems.push("PENDING_FOOTER_PARTS is not empty")
if (problems.length > 0) {
  console.error(problems.join("\n"))
  process.exit(1)
}
console.log("batch 5 guard end state holds")
```

Run: `node <temp>/p2c5-guard-state.mjs`
Expected, exactly:

```
LOCAL_FIELD: 0 entries, 0
RAW_FIELDS: 2 entries, 3
FIELD_CLASS_STRINGS: 0 entries, 0
OLD_MARKUP: 0 entries, 0
LOADER2: 10 entries, 13
OLD_HELPERS: 0 entries, 0
REVERSE: 0 entries, 0
CLOSE_LABEL_IS_CANCEL: 0 entries, 0
FIXED_BOTTOM_BARS: 2 entries, 2
CONSTRAINT_FLOORS: 38 entries
BATCH_FILES: 64 files · MIGRATED_FILES: 64 (batch 5: 3 of 3)
PENDING_FOOTER_PARTS: 0
batch 5 guard end state holds
```

This is the end state of batch 5 for FMG's budgets (spec §9.9, §10.4 table C): against `6835bdf`, `MIGRATED_FILES` 61 → 64 (the stepper, `alert-dialog`, `confirm-dialog`; the two old bars left `BATCH_FILES`), `PENDING_FOOTER_PARTS` 1 → 0, `FIXED_BOTTOM_BARS` 3 → 2 (Task 1 added `ui/action-bar.tsx`, Task 2 took out the two old bars); `RAW_FIELDS` 2 (3), `LOADER2` 10 (13) and `CONSTRAINT_FLOORS` 38 do not move. If a line differs, stop and report it (do not edit a budget to make it match). No commit in this step.

**For the dev-app check (Task 11):** `/th/maintenance/<id>` of a record with an attachment, at 375 and 1440: the delete button opens the shared confirm ("ต้องการลบรายการนี้หรือไม่?", "ยกเลิก" first, red "ลบ"), focus on "ยกเลิก"; cancel it, or Esc, and focus returns to the delete button. Never confirm (it would delete the file); the toast "ลบแล้ว" and the spinner are pinned by the tests. A closed record (append-only) shows no delete button, as before.

---

### Task 6: Batch 5 · `admin/IntegrationClientManager.tsx` + `D/admin/integrations/page.tsx` (the scope-expansion confirm says "เพิ่มสิทธิ์"; and the confirm-verb tests that Tasks 7–8 finish)

Spec §5.9 (the `confirm(` table, row `IntegrationClientManager.tsx:193`: new `labels.confirmScopeExpansionAction` "เพิ่มสิทธิ์", tone default; "จุดที่ต้องแก้" bullet 1), §5.10 (the three keys), §5.11 table B rows G and H, §5.12 row 5, §10.2 message table row "ชุด 5", K12 ("ปุ่มเป็นคำกริยา"). DH "UI Round 4 Phase 2C Plan 4", "Handed on to 2C plan 5": the four `confirm()` calls without a verb `confirmLabel` are `admin/IntegrationClientManager.tsx:206`, `disposal/disposal-bulk-approval.tsx:327`, `disposal/disposal-bulk-execution.tsx:494` and `master-data/supplier-form.tsx:97`. This task, Task 7 (two commits) and Task 8 give each one its verb.

Lines at `6835bdf` (the spec quotes `5ffee76`: the type `:68`, the call `:193`, the page `:52`): the `Labels` type `IntegrationClientManager.tsx:80-82` (`confirmScopeExpansion: string` `:81`), `confirmScopeExpansion()` `:203-207` (the call `:206`), the page's label `D/admin/integrations/page.tsx:50-51`; `tests/confirm-dialog-ui.test.ts:3` (`import test from "node:test"`) and its end. Every file is CRLF in the worktree; edit with exact-string replacement only. The page has no mixed line endings at `6835bdf` (index LF, worktree CRLF, 78 of 78 lines): keep what `git ls-files --eol` shows.

Rulings this task applies:
- **§5.9:** `confirm({ title: labels.confirmScopeExpansion, confirmLabel: labels.confirmScopeExpansionAction })`. No `tone`: the default button, as the spec's table says (widening a token's scopes is not a delete). `title` stays the first property (§5 ruling ด22; `tests/integration-api-client-admin.test.ts:144` reads `await confirm\(\{`).
- **One commit for the component and the page.** `confirmScopeExpansionAction: string` is a required member of `Labels`, and the page is its only caller, so `npx tsc --noEmit` passes only with both (plan 4's rule: a page line that only follows a component's own change rides in that component's commit). The page is a 2C-5 file (controller ruling P3).
- **§5.10:** the key goes through `node scripts/messages-edit.mjs`, in this commit. Keep the change file in `<temp>`: Task 13 re-runs it if plan 2B-5 merges first (2B spec §8.2 rebase rule).
- **§5.11 G and H, ruling (this plan):** both tests go into `tests/confirm-dialog-ui.test.ts` (Tasks 4–5 edit the file first; this task appends at its end and adds `readSourceFiles` to Task 4b's helper import).
  - G is a two-way ratchet, the way FMG's `PENDING_FOOTER_PARTS` works: `CONFIRMS_WITHOUT_A_VERB` lists the three files still waiting after this task; Task 7 removes two lines and Task 8 removes the last and makes the test strict. Each file's commit then lowers the guard (the controller's "fold into the earlier tasks").
  - G's reader balances parentheses and braces instead of the spec's `/\{\s*title:[^}]*\}/g`, which would cut `{ title: t("archiveConfirm", { file: relativePath }), confirmLabel: … }` (`admin/storage-archive-button.tsx:19`) at the inner `}` and report a named confirm as unnamed. At `6835bdf` it finds 14 option objects in 11 files (the toggle confirm's ternary has two), 4 without `confirmLabel`; Task 5's `useConfirm` in `maintenance-attachments.tsx` makes 15 in 12.
  - H checks the three keys' exact th/en values (§5.10) and also where each one is read (the confirm call and the page line, counted per file), so a key that exists but is wired to nothing fails too.
- **FMG:** no row changes. `IntegrationClientManager.tsx` was migrated in batch 4 and the page is not a 2C file; `p2c5-precheck.mjs` covers the batch-5 FMG rows only, so Step 1 checks this task's sites directly, and `p2c-budget.mjs` is not run.

What users will see (`/admin/integrations`, "แก้สิทธิ์" on a client, tick a scope the client does not have, "บันทึกสิทธิ์"):
- The confirm that warns about widening a token's access now has the primary button "เพิ่มสิทธิ์" ("Add permissions") instead of "ยืนยัน". The title, the cancel button and what happens on either button are unchanged; the look of the confirm is Task 4's (K12).

Not in this task:
- the rotate, enable and disable confirms (`:262`, `:267-271`) already pass their verbs (`labels.rotate`, `labels.enable`, `labels.disable`)
- the edit dialog, the token panel and the rows (batch 4, 2D); the rest of the page (its header is 2B-2's)
- `tests/integration-api-client-admin.test.ts` (H pins the new key); `ui/confirm-dialog.tsx` and `ui/alert-dialog.tsx` (Task 4). Do not run a formatter.

**Files:**
- Modify: `src/components/admin/IntegrationClientManager.tsx` (CRLF, 2 replacements)
- Modify: `src/app/[locale]/(dashboard)/admin/integrations/page.tsx` (CRLF, 1 replacement)
- Modify: `messages/th.json`, `messages/en.json` (CRLF; only through `node scripts/messages-edit.mjs`: 1 key)
- Modify: `tests/confirm-dialog-ui.test.ts` (CRLF: the helper import widened, 1 block appended)
- Temp folder only, never committed: `p2c5-append.mjs` (Task 9 reuses it), `p2c5-scope-expansion-action.json`

**Must keep passing without edits:**
- `tests/integration-api-client-admin.test.ts:107-115` (the page: `requirePagePermission`, `getTranslations("integrationApiPage")`, `labels={{`), `:125-149` (`confirmScopeExpansion`, `await confirm\(\{`), `:173-213` (the page keys, `confirmScopeExpansion` among them) and the batch-4 test `:233-252`.
- `tests/confirm-dialog-ui.test.ts` as Tasks 4–5 left it (this task only widens the helper import `:4` and adds a block after the last line).
- `tests/list-frame-guards.test.ts` (2B's file, never edited by 2C; the page is in `MIGRATED_LIST_FILES` `:82`; the manager's budget rows count code this task does not touch), `tests/form-migration-guards.test.ts`, `tests/thai-glossary.test.ts`, `tests/messages-parity.test.ts`, `tests/messages-edit.test.ts`.

**Interfaces:**
- Consumes: `useConfirm` (`ConfirmOptions.confirmLabel`, `ui/confirm-dialog.tsx`, Task 4's look); `readSourceFiles` from `tests/helpers/source-files.ts`; Tasks 4–5 committed (Task 5's `useConfirm` call in `maintenance-attachments.tsx` names its verb, spec §5.9).
- Produces:
  - `Labels.confirmScopeExpansionAction: string` (required) in `IntegrationClientManager.tsx`; the page passes `t("confirmScopeExpansionAction")`; the key `integrationApiPage.confirmScopeExpansionAction` (the last key of `integrationApiPage` in both files).
  - In `tests/confirm-dialog-ui.test.ts`: `confirmOptionObjects`, `CONFIRMS_WITHOUT_A_VERB` (3 lines), the G test, `BATCH_5_VERBS` (1 row) and the H test. Tasks 7 and 8 edit these lines.
  - `<temp>/p2c5-append.mjs`.

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `git ls-files --eol src/components/admin/IntegrationClientManager.tsx "src/app/[locale]/(dashboard)/admin/integrations/page.tsx" tests/confirm-dialog-ui.test.ts messages/th.json messages/en.json`
Expected: `git status` prints nothing; all five `i/lf w/crlf` (keep what you find).

Run: `git grep -n -F -e "confirmScopeExpansion: " -e "confirm({ title: labels.confirmScopeExpansion" -- src`
Expected, exactly:
```
src/app/[locale]/(dashboard)/admin/integrations/page.tsx:50:          confirmScopeExpansion: t("confirmScopeExpansion"),
src/components/admin/IntegrationClientManager.tsx:81:  confirmScopeExpansion: string
src/components/admin/IntegrationClientManager.tsx:206:    return confirm({ title: labels.confirmScopeExpansion })
```

Run: `node -e "for (const l of ['th','en']) console.log(l, require('./messages/' + l + '.json').integrationApiPage.confirmScopeExpansionAction)"`
Expected: `th undefined` and `en undefined`.

Run: `git grep -n -e "readSourceFiles" -e "CONFIRMS_WITHOUT_A_VERB" -e "BATCH_5_VERBS" -e "names its action" -- tests/confirm-dialog-ui.test.ts`
Expected: nothing (Tasks 4–5 did not add spec §5.11 G or H). Task 4b's helper import `:4` (`import { findJsxTags, jsxAttrValue } from "./helpers/source-files.ts"`) is the line Step 2 (1) widens; if Task 4 or 5 added a G or H test, stop and ask the controller.

- [ ] **Step 2: The failing tests (`tests/confirm-dialog-ui.test.ts`)**

(1) The helper import (`:4`, Task 4b's line): `readSourceFiles` joins it, so the file imports the module once. One exact replacement.

Replace:

```ts
import { findJsxTags, jsxAttrValue } from "./helpers/source-files.ts"
```

with:

```ts
import { findJsxTags, jsxAttrValue, readSourceFiles } from "./helpers/source-files.ts"
```

(2) The block at the end of the file. Tasks 4–5 may have changed the file's last lines, so the block is appended by a script instead of an exact replacement. Save it as `p2c5-append.mjs` in your temp folder (never in the repo; Task 9 reuses it):

```js
// p2c5-append.mjs: run from the worktree root. Appends a block to the end of a test file, after one blank line, in the
// file's own line endings. Writes nothing if the block's first line is already in the file. Never commit this file.
// Usage: node p2c5-append.mjs <file> <block file (UTF-8, LF)>
import { readFileSync, writeFileSync } from "node:fs"

const [file, blockPath] = process.argv.slice(2)
const raw = readFileSync(file, "utf8")
const eol = raw.includes("\r\n") ? "\r\n" : "\n"
const block = readFileSync(blockPath, "utf8").replace(/\r\n/g, "\n").replace(/\n+$/, "")
const first = block.split("\n").find((line) => line.trim() !== "")
if (raw.replace(/\r\n/g, "\n").includes(first)) {
  console.error(`ABORT, nothing written: ${file} already has "${first}"`)
  process.exit(1)
}
const body = raw.replace(/(?:\r?\n)+$/, "")
writeFileSync(file, `${body}${eol}${eol}${block.replace(/\n/g, eol)}${eol}`)
console.log(`appended ${block.split("\n").length} lines to ${file}`)
```

Save the block below as `<temp>/p2c5-confirm-verbs.ts.txt` (UTF-8, LF), then run from the worktree root: `node <temp>/p2c5-append.mjs tests/confirm-dialog-ui.test.ts <temp>/p2c5-confirm-verbs.ts.txt`
Expected: `appended 63 lines to tests/confirm-dialog-ui.test.ts`.

```ts
// Phase 2C batch 5 (K12, spec 2C §5.9-§5.11 G-H): every confirm() names its action with a verb on its button, never
// the generic "ยืนยัน". The reader takes the argument of each confirm( call in a file that calls useConfirm() and
// checks every { title: … } object in it (both branches of a ternary count).
function confirmOptionObjects(source: string): string[] {
  const balanced = (text: string, from: number, open: string, close: string) => {
    let depth = 0
    for (let index = from; index < text.length; index += 1) {
      if (text[index] === open) depth += 1
      else if (text[index] === close && --depth === 0) return text.slice(from, index + 1)
    }
    return ""
  }
  return [...source.matchAll(/(?<![\w.$])confirm\(/g)].flatMap((call) => {
    const argument = balanced(source, call.index + call[0].length - 1, "(", ")")
    return [...argument.matchAll(/\{\s*title:/g)].map((object) => balanced(argument, object.index, "{", "}"))
  })
}

// Files whose confirm() still has no verb. The commit that names one removes its line (a two-way ratchet); the last one
// makes the test strict.
const CONFIRMS_WITHOUT_A_VERB = new Set<string>([
  "src/components/disposal/disposal-bulk-approval.tsx", // the discard-selection confirm
  "src/components/disposal/disposal-bulk-execution.tsx", // the discard-selection confirm
  "src/components/master-data/supplier-form.tsx", // the unsaved-changes confirm
])

test("every confirm() names its action with a verb (K12, spec 2C §5.11 G)", () => {
  const unnamed = new Set<string>()
  let objects = 0
  for (const file of readSourceFiles("src")) {
    if (file.path === "src/components/ui/confirm-dialog.tsx" || !/\buseConfirm\(\)/.test(file.source)) continue
    for (const object of confirmOptionObjects(file.source)) {
      objects += 1
      if (!/\bconfirmLabel:/.test(object)) unnamed.add(file.path)
    }
  }
  assert.ok(objects >= 14, `the reader found only ${objects} confirm() options`)
  assert.deepEqual([...unnamed].filter((path) => !CONFIRMS_WITHOUT_A_VERB.has(path)), [], "give the confirm a confirmLabel that says its verb")
  assert.deepEqual([...CONFIRMS_WITHOUT_A_VERB].filter((path) => !unnamed.has(path)), [], "it names its action now: remove it from CONFIRMS_WITHOUT_A_VERB")
})

// The verb labels batch 5 adds (spec 2C §5.10) and the expressions that read them, counted per file.
const BATCH_5_VERBS: Array<{ key: string; th: string; en: string; reads: Array<[path: string, expression: string, count: number]> }> = [
  {
    key: "integrationApiPage.confirmScopeExpansionAction",
    th: "เพิ่มสิทธิ์",
    en: "Add permissions",
    reads: [
      ["src/components/admin/IntegrationClientManager.tsx", 'confirm({ title: labels.confirmScopeExpansion, confirmLabel: labels.confirmScopeExpansionAction })', 1],
      ["src/app/[locale]/(dashboard)/admin/integrations/page.tsx", 'confirmScopeExpansionAction: t("confirmScopeExpansionAction"),', 1],
    ],
  },
]

test("the batch 5 verbs say the same thing in both languages and reach their confirm() (spec 2C §5.10, §5.11 H)", () => {
  const messages = { th: JSON.parse(readFileSync("messages/th.json", "utf8")), en: JSON.parse(readFileSync("messages/en.json", "utf8")) }
  const at = (tree: unknown, key: string) => key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], tree)
  for (const verb of BATCH_5_VERBS) {
    assert.equal(at(messages.th, verb.key), verb.th, `th ${verb.key}`)
    assert.equal(at(messages.en, verb.key), verb.en, `en ${verb.key}`)
    for (const [path, expression, count] of verb.reads) assert.equal(read(path).split(expression).length - 1, count, `${path} reads ${expression}`)
  }
})
```

Run: `node --test tests/confirm-dialog-ui.test.ts`
Expected: FAIL, `tests 7 · pass 5 · fail 2` (5 after Task 5, 2 new), the two new ones:
- G: `give the confirm a confirmLabel that says its verb`, actual `[ 'src/components/admin/IntegrationClientManager.tsx' ]`
- H: `th integrationApiPage.confirmScopeExpansionAction`, actual `undefined`, expected `'เพิ่มสิทธิ์'`

- [ ] **Step 3: Add the message key**

Save this file as `<temp>/p2c5-scope-expansion-action.json` (UTF-8; keep it for Task 13):

```json
{ "set": { "th": { "integrationApiPage.confirmScopeExpansionAction": "เพิ่มสิทธิ์" }, "en": { "integrationApiPage.confirmScopeExpansionAction": "Add permissions" } } }
```

Run from the worktree root: `node scripts/messages-edit.mjs <temp>/p2c5-scope-expansion-action.json`
Expected: `messages updated: 1 th, 1 en, 0 deleted`. `git diff --stat messages` shows 2 insertions and 1 deletion in each file (the comma after `integrationApiPage.actions` and the new last key); both stay CRLF: `node -e "for (const l of ['th','en']) { const s = require('fs').readFileSync('messages/' + l + '.json', 'utf8'); console.log(l, (s.match(/\r\n/g) || []).length === (s.match(/\n/g) || []).length) }"` prints `th true` and `en true`.

Run: `node --test tests/confirm-dialog-ui.test.ts`
Expected: still FAIL on the same 2 tests (`tests 7 · pass 5 · fail 2`); H now fails on `src/components/admin/IntegrationClientManager.tsx reads confirm({ title: labels.confirmScopeExpansion, confirmLabel: labels.confirmScopeExpansionAction })` (0, expected 1).

- [ ] **Step 4: Name the verb (`IntegrationClientManager.tsx`, then the page)**

(1) `src/components/admin/IntegrationClientManager.tsx`, the `Labels` type (`:80-82`).

Replace:

```tsx
  confirmRotate: string
  confirmScopeExpansion: string
  confirmEnable: string
```

with:

```tsx
  confirmRotate: string
  confirmScopeExpansion: string
  confirmScopeExpansionAction: string
  confirmEnable: string
```

(2) `src/components/admin/IntegrationClientManager.tsx`, the scope-expansion confirm (`:205-207`).

Replace:

```tsx
    if (!hasNewScope) return true
    return confirm({ title: labels.confirmScopeExpansion })
  }
```

with:

```tsx
    if (!hasNewScope) return true
    return confirm({ title: labels.confirmScopeExpansion, confirmLabel: labels.confirmScopeExpansionAction })
  }
```

(3) `src/app/[locale]/(dashboard)/admin/integrations/page.tsx`, the labels (`:50-51`).

Replace:

```tsx
          confirmScopeExpansion: t("confirmScopeExpansion"),
          confirmEnable: t("confirmEnable"),
```

with:

```tsx
          confirmScopeExpansion: t("confirmScopeExpansion"),
          confirmScopeExpansionAction: t("confirmScopeExpansionAction"),
          confirmEnable: t("confirmEnable"),
```

Check: `git grep -n -F "confirmScopeExpansionAction" -- src` prints 3 lines: `IntegrationClientManager.tsx:82` (the type), `:207` (the call) and `admin/integrations/page.tsx:51`.

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/integration-api-client-admin.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts tests/messages-edit.test.ts tests/list-frame-guards.test.ts`
Expected: PASS, `tests 44 · pass 44 · fail 0` (13 + 3 + 3 + 4 + 21).

Run: `node --test tests/confirm-dialog-ui.test.ts tests/form-migration-guards.test.ts`
Expected: PASS, `tests 30 · pass 30 · fail 0` (7 + 23: `confirm-dialog-ui` 2 tests more than after Task 5; FMG as after Task 5).

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 1987 tests, 1986 pass, 0 fail, 1 skipped (2 more than after Task 5); tsc no errors (the page passes the new required label); lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat`
Expected: exactly 5 files. `IntegrationClientManager.tsx` 2 insertions and 1 deletion, `admin/integrations/page.tsx` 1 insertion, `messages/th.json` and `messages/en.json` 2 insertions and 1 deletion each, `tests/confirm-dialog-ui.test.ts` 65 insertions and 1 deletion. A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/IntegrationClientManager.tsx "src/app/[locale]/(dashboard)/admin/integrations/page.tsx" messages/th.json messages/en.json tests/confirm-dialog-ui.test.ts
git commit -m "feat(ui): the integration scope-expansion confirm names its verb, and every confirm must (2C batch 5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 5 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the plan 5 dev-app check (Task 11):**
- `/th/admin/integrations` at 1440 and 375: "แก้สิทธิ์" on a client that lacks a scope, tick that scope, "บันทึกสิทธิ์": the confirm opens with the title "คุณกำลังเพิ่มสิทธิ์ให้ token เดิม…", "ยกเลิก" first and the primary "เพิ่มสิทธิ์" last; cancel it (never widen a client's scopes: the edit dialog stays open with nothing saved); Esc closes it too, and focus returns to "บันทึกสิทธิ์". English pass: "Add permissions". Unticking a scope saves without a confirm, as before (do not save).

---

### Task 7: Batch 5 · `disposal/disposal-bulk-approval.tsx`, `disposal/disposal-bulk-execution.tsx` and `D/disposal/page.tsx` (the discard-selection confirms say "ละทิ้งรายการที่เลือก"; two commits)

Spec §5.9 (the `confirm(` table rows `disposal-bulk-approval.tsx:316` and `disposal-bulk-execution.tsx:481`: new `copy.discardSelectionAction`, destructive; "จุดที่ต้องแก้" bullet 2), §5.10 (`disposalPage.bulkDiscardSelectionAction`), §5 ruling ด17 (one key for both bulk confirms), §5.11 G–H, §10.2 message table row "ชุด 5". The DH 2C-4 hand-off names `disposal-bulk-approval.tsx:327` and `disposal-bulk-execution.tsx:494`.

Lines at `6835bdf` (the spec quotes `5ffee76`: the types `:67`, `:109`, the calls `:316`, `:481`, the page `:216`, `:231`): `DisposalBulkApprovalCopy` `disposal-bulk-approval.tsx:77-79` (`discardSelection: string` `:78`) and its confirm `:327`; `DisposalBulkExecutionCopy` `disposal-bulk-execution.tsx:121-123` (`:122`) and its confirm `:494`; in `D/disposal/page.tsx`, `bulkApprovalCopy` `:206-247` (`discardSelection: t("bulkDiscardSelection"),` `:237`, then `errors: {` `:238`) and `bulkExecutionCopy` `:251-254` (every key on the one line `:252`, then `errors: bulkExecutionErrors,` `:253`). Every file is CRLF; edit with exact-string replacement only.

**Two commits (the controller's "say which"):** each component's copy type gains a required `discardSelectionAction`, and `D/disposal/page.tsx` is the only place that builds either copy object (`git grep -n ": DisposalBulk\(Approval\|Execution\)Copy = {" -- src` prints only the page's `:206` and `:251`), so each component and its own page line must change together for tsc to pass. Part A commits the approval component, its page line and the key; Part B commits the execution component and its page line. The page is in both commits (one line each); it is a 2C-5 file (controller ruling P3).

Rulings this task applies:
- **§5.9, ด17, ด22:** both calls become `confirm({ title: copy.discardSelection, confirmLabel: copy.discardSelectionAction, tone: "destructive" })`: `title` stays first (`tests/disposal-bulk-approval.test.ts:145` and `tests/disposal-bulk-execution-ui.test.ts:58` read `confirm\(\{ title: copy\.discardSelection`), `tone` stays last. Both copies read the one key `t("bulkDiscardSelectionAction")`; the titles keep their own keys (`bulkDiscardSelection`, `bulkExecutionDiscardSelection`).
- **The page lines:** the approval copy gets its line right after `discardSelection` (`:237`); the execution copy is one 2,480-character line (`:252`), so its new member goes on a line of its own before `errors: bulkExecutionErrors,` instead of into that line (a one-line diff that reads).
- **§5.11 G–H:** each part removes its file from `CONFIRMS_WITHOUT_A_VERB` and fills the `BATCH_5_VERBS` row (Task 6).
- **2B fence:** only the copy types and the confirm calls change. The list parts 2B owns (O4: the toggles, toolbars, select-page controls and row checkboxes) and the dialogs (2C plan 3) stay byte for byte. FMG: no row changes (both files were migrated in batch 3; the page is not a 2C file).

What users will see (`/disposal`, the pending or the approved queue, selection mode on, at least one request ticked, then a page link, a filter or a stage tab):
- The confirm "ละทิ้งรายการที่เลือกไว้ก่อนเปลี่ยนหน้าใช่หรือไม่" (approval) or "…ก่อนออกจากหน้านี้ใช่หรือไม่" (execution) now has the red button "ละทิ้งรายการที่เลือก" ("Discard selection") instead of a red "ยืนยัน". What each button does is unchanged.

Not in this task:
- the list parts (2B, O4), both dialogs and their footers (batch 3), the rest of `D/disposal/page.tsx` (its stage `TabNav` and filters are 2B-2's)
- the titles' keys; `tests/disposal-bulk-approval.test.ts`, `tests/disposal-bulk-execution-ui.test.ts` (H pins the wiring). Do not run a formatter.

**Files (Part A):**
- Modify: `src/components/disposal/disposal-bulk-approval.tsx` (CRLF, 2 replacements), `src/app/[locale]/(dashboard)/disposal/page.tsx` (CRLF, 1 replacement)
- Modify: `messages/th.json`, `messages/en.json` (CRLF; only through `node scripts/messages-edit.mjs`: 1 key)
- Modify: `tests/confirm-dialog-ui.test.ts` (CRLF, 2 replacements)
- Temp folder only: `p2c5-bulk-discard-selection-action.json` (keep it for Task 13)

**Files (Part B):**
- Modify: `src/components/disposal/disposal-bulk-execution.tsx` (CRLF, 2 replacements), `src/app/[locale]/(dashboard)/disposal/page.tsx` (CRLF, 1 replacement)
- Modify: `tests/confirm-dialog-ui.test.ts` (CRLF, 2 replacements)

**Must keep passing without edits:**
- `tests/disposal-bulk-approval.test.ts:145` (`async function discardSelectionThen(proceed: () => void) {` then `const confirmed = await confirm({ title: copy.discardSelection`), `:146` and the 2B and batch-3 tests `:159-193`; `tests/disposal-bulk-execution-ui.test.ts:58` (`confirm\(\{ title: copy\.discardSelection`), `:128-150` (the execution keys, `bulkExecutionDiscardSelection` among them) and `:199-225`.
- `tests/disposal-queue-ux.test.ts:62-63` (`const bulkApprovalCopy: DisposalBulkApprovalCopy = {` … `errors:`), `tests/list-pages-ui.test.ts:183-184` (both copy declarations), `tests/disposal-route-structure.test.ts`, `tests/visual-foundation-guards.test.ts:26-28` (the bulk wrappers' focus targets), `tests/list-frame-guards.test.ts` (both components and the page are in `MIGRATED_LIST_FILES`, `:67-69`).

**Interfaces:**
- Consumes: Task 6's `CONFIRMS_WITHOUT_A_VERB` and `BATCH_5_VERBS` in `tests/confirm-dialog-ui.test.ts`.
- Produces: `DisposalBulkApprovalCopy.discardSelectionAction` and `DisposalBulkExecutionCopy.discardSelectionAction` (required `string`), both set by the page from `t("bulkDiscardSelectionAction")`; the key `disposalPage.bulkDiscardSelectionAction` (the last key of `disposalPage`, after Task 3's `workflowSteps`); `CONFIRMS_WITHOUT_A_VERB` down to the supplier form; the second `BATCH_5_VERBS` row.

#### Part A: the approval confirm

- [ ] **Step 1: Check what this part builds on**

Run: `git status --short src tests messages`, then `git ls-files --eol src/components/disposal/disposal-bulk-approval.tsx src/components/disposal/disposal-bulk-execution.tsx "src/app/[locale]/(dashboard)/disposal/page.tsx"`
Expected: `git status` prints nothing; all three `i/lf w/crlf`.

Run: `git grep -n -F -e "discardSelection: " -e "confirm({ title: copy.discardSelection" -- src`
Expected, exactly (the `:252` line is the execution copy's one long line, cut here):
```
src/app/[locale]/(dashboard)/disposal/page.tsx:237:    discardSelection: t("bulkDiscardSelection"),
src/app/[locale]/(dashboard)/disposal/page.tsx:252:    toolbarLabel: t("bulkExecutionToolbarLabel"), selectionMode: t("bulkExecutionSelectionMode"), …
src/components/disposal/disposal-bulk-approval.tsx:78:  discardSelection: string
src/components/disposal/disposal-bulk-approval.tsx:327:    const confirmed = await confirm({ title: copy.discardSelection, tone: "destructive" })
src/components/disposal/disposal-bulk-execution.tsx:122:  discardSelection: string
src/components/disposal/disposal-bulk-execution.tsx:494:    const confirmed = await confirm({ title: copy.discardSelection, tone: "destructive" })
```

Run: `node -e "for (const l of ['th','en']) console.log(l, require('./messages/' + l + '.json').disposalPage.bulkDiscardSelectionAction)"`
Expected: `th undefined` and `en undefined`.

- [ ] **Step 2: The failing tests (`tests/confirm-dialog-ui.test.ts`)**

Two exact replacements in the lines Task 6 added.

(1) The approval file leaves the waiting list.

Replace:

```ts
const CONFIRMS_WITHOUT_A_VERB = new Set<string>([
  "src/components/disposal/disposal-bulk-approval.tsx", // the discard-selection confirm
  "src/components/disposal/disposal-bulk-execution.tsx", // the discard-selection confirm
```

with:

```ts
const CONFIRMS_WITHOUT_A_VERB = new Set<string>([
  "src/components/disposal/disposal-bulk-execution.tsx", // the discard-selection confirm
```

(2) The second `BATCH_5_VERBS` row (the page count is 1 until Part B).

Replace:

```ts
      ["src/app/[locale]/(dashboard)/admin/integrations/page.tsx", 'confirmScopeExpansionAction: t("confirmScopeExpansionAction"),', 1],
    ],
  },
]
```

with:

```ts
      ["src/app/[locale]/(dashboard)/admin/integrations/page.tsx", 'confirmScopeExpansionAction: t("confirmScopeExpansionAction"),', 1],
    ],
  },
  {
    // One key for both bulk confirms: they mean the same thing (spec 2C §5, ruling ด17).
    key: "disposalPage.bulkDiscardSelectionAction",
    th: "ละทิ้งรายการที่เลือก",
    en: "Discard selection",
    reads: [
      ["src/components/disposal/disposal-bulk-approval.tsx", 'confirm({ title: copy.discardSelection, confirmLabel: copy.discardSelectionAction, tone: "destructive" })', 1],
      ["src/app/[locale]/(dashboard)/disposal/page.tsx", 'discardSelectionAction: t("bulkDiscardSelectionAction"),', 1],
    ],
  },
]
```

Run: `node --test tests/confirm-dialog-ui.test.ts`
Expected: FAIL, `tests 7 · pass 5 · fail 2`, the two batch-5 tests: G (actual `[ 'src/components/disposal/disposal-bulk-approval.tsx' ]`) and H (`th disposalPage.bulkDiscardSelectionAction`, actual `undefined`).

- [ ] **Step 3: Add the message key**

Save this file as `<temp>/p2c5-bulk-discard-selection-action.json` (UTF-8; keep it for Task 13):

```json
{ "set": { "th": { "disposalPage.bulkDiscardSelectionAction": "ละทิ้งรายการที่เลือก" }, "en": { "disposalPage.bulkDiscardSelectionAction": "Discard selection" } } }
```

Run from the worktree root: `node scripts/messages-edit.mjs <temp>/p2c5-bulk-discard-selection-action.json`
Expected: `messages updated: 1 th, 1 en, 0 deleted`; `git diff --stat messages` 2 insertions and 1 deletion in each file; both stay CRLF (the check of Task 6 Step 3 prints `th true`, `en true`).

Run: `node --test tests/confirm-dialog-ui.test.ts`
Expected: still FAIL on the same 2 tests (`tests 7 · pass 5 · fail 2`); H now on `src/components/disposal/disposal-bulk-approval.tsx reads confirm({ title: copy.discardSelection, confirmLabel: copy.discardSelectionAction, tone: "destructive" })`.

- [ ] **Step 4: Name the verb (`disposal-bulk-approval.tsx`, then the page)**

(1) `src/components/disposal/disposal-bulk-approval.tsx`, `DisposalBulkApprovalCopy` (`:77-79`).

Replace:

```tsx
  zeroEligible: string
  discardSelection: string
  errors: Record<DisposalBulkApprovalCode, string>
```

with:

```tsx
  zeroEligible: string
  discardSelection: string
  discardSelectionAction: string
  errors: Record<DisposalBulkApprovalCode, string>
```

(2) `src/components/disposal/disposal-bulk-approval.tsx`, the confirm (`:327`).

Replace:

```tsx
    const confirmed = await confirm({ title: copy.discardSelection, tone: "destructive" })
```

with:

```tsx
    const confirmed = await confirm({ title: copy.discardSelection, confirmLabel: copy.discardSelectionAction, tone: "destructive" })
```

(3) `src/app/[locale]/(dashboard)/disposal/page.tsx`, `bulkApprovalCopy` (`:237-238`).

Replace:

```tsx
    discardSelection: t("bulkDiscardSelection"),
    errors: {
```

with:

```tsx
    discardSelection: t("bulkDiscardSelection"),
    discardSelectionAction: t("bulkDiscardSelectionAction"),
    errors: {
```

Check: `git grep -n -F "discardSelectionAction" -- src` prints 3 lines: `disposal-bulk-approval.tsx:79` (the type), `:328` (the call) and `disposal/page.tsx:238`.

- [ ] **Step 5: Run the tests for this part**

Run: `node --test tests/disposal-bulk-approval.test.ts tests/disposal-queue-ux.test.ts tests/list-pages-ui.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts tests/messages-edit.test.ts`
Expected: PASS, `tests 66 · pass 66 · fail 0` (14 + 8 + 34 + 3 + 3 + 4).

Run: `node --test tests/confirm-dialog-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: PASS, `tests 77 · pass 77 · fail 0` (7 + 23 + 21 + 26, as after Task 6).

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 1987 tests, 1986 pass, 0 fail, 1 skipped, the same count as after Task 6 (no new test); tsc no errors (the page sets the new required member); lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat`
Expected: exactly 5 files. `disposal-bulk-approval.tsx` 2 insertions and 1 deletion, `disposal/page.tsx` 1 insertion, `messages/th.json` and `messages/en.json` 2 insertions and 1 deletion each, `tests/confirm-dialog-ui.test.ts` 10 insertions and 1 deletion.

- [ ] **Step 7: Commit Part A**

```bash
git add src/components/disposal/disposal-bulk-approval.tsx "src/app/[locale]/(dashboard)/disposal/page.tsx" messages/th.json messages/en.json tests/confirm-dialog-ui.test.ts
git commit -m "feat(ui): the bulk approval discard-selection confirm names its verb (2C batch 5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 5 files in the commit. `git status --short src tests messages` prints nothing.

#### Part B: the execution confirm

- [ ] **Step 8: The failing tests (`tests/confirm-dialog-ui.test.ts`)**

Two exact replacements in the lines Part A left.

(1) The execution file leaves the waiting list.

Replace:

```ts
const CONFIRMS_WITHOUT_A_VERB = new Set<string>([
  "src/components/disposal/disposal-bulk-execution.tsx", // the discard-selection confirm
```

with:

```ts
const CONFIRMS_WITHOUT_A_VERB = new Set<string>([
```

(2) The execution file reads the key too, and the page now reads it twice.

Replace:

```ts
      ["src/components/disposal/disposal-bulk-approval.tsx", 'confirm({ title: copy.discardSelection, confirmLabel: copy.discardSelectionAction, tone: "destructive" })', 1],
      ["src/app/[locale]/(dashboard)/disposal/page.tsx", 'discardSelectionAction: t("bulkDiscardSelectionAction"),', 1],
```

with:

```ts
      ["src/components/disposal/disposal-bulk-approval.tsx", 'confirm({ title: copy.discardSelection, confirmLabel: copy.discardSelectionAction, tone: "destructive" })', 1],
      ["src/components/disposal/disposal-bulk-execution.tsx", 'confirm({ title: copy.discardSelection, confirmLabel: copy.discardSelectionAction, tone: "destructive" })', 1],
      ["src/app/[locale]/(dashboard)/disposal/page.tsx", 'discardSelectionAction: t("bulkDiscardSelectionAction"),', 2],
```

Run: `node --test tests/confirm-dialog-ui.test.ts`
Expected: FAIL, `tests 7 · pass 5 · fail 2`, the two batch-5 tests: G (actual `[ 'src/components/disposal/disposal-bulk-execution.tsx' ]`) and H (`src/components/disposal/disposal-bulk-execution.tsx reads confirm({ title: copy.discardSelection, confirmLabel: copy.discardSelectionAction, tone: "destructive" })`, 0, expected 1).

- [ ] **Step 9: Name the verb (`disposal-bulk-execution.tsx`, then the page)**

(1) `src/components/disposal/disposal-bulk-execution.tsx`, `DisposalBulkExecutionCopy` (`:121-123`).

Replace:

```tsx
  commitFailed: string
  discardSelection: string
  sharedValues: string
```

with:

```tsx
  commitFailed: string
  discardSelection: string
  discardSelectionAction: string
  sharedValues: string
```

(2) `src/components/disposal/disposal-bulk-execution.tsx`, the confirm (`:494`). The same line as Part A's (2); it occurs once in this file.

Replace:

```tsx
    const confirmed = await confirm({ title: copy.discardSelection, tone: "destructive" })
```

with:

```tsx
    const confirmed = await confirm({ title: copy.discardSelection, confirmLabel: copy.discardSelectionAction, tone: "destructive" })
```

(3) `src/app/[locale]/(dashboard)/disposal/page.tsx`, the end of `bulkExecutionCopy` (`:254-255` after Part A; `:253-254` at `6835bdf`). The new member goes on its own line; the long line `:253` does not change.

Replace:

```tsx
    errors: bulkExecutionErrors,
  }
```

with:

```tsx
    discardSelectionAction: t("bulkDiscardSelectionAction"),
    errors: bulkExecutionErrors,
  }
```

Check: `git grep -n -F "discardSelectionAction" -- src` prints 6 lines: `disposal-bulk-approval.tsx:79`, `:328`, `disposal-bulk-execution.tsx:123`, `:495`, `disposal/page.tsx:238`, `:254`.

- [ ] **Step 10: Run the tests for this part**

Run: `node --test tests/disposal-bulk-execution-ui.test.ts tests/disposal-queue-ux.test.ts tests/list-pages-ui.test.ts tests/disposal-route-structure.test.ts`
Expected: PASS, `tests 71 · pass 71 · fail 0` (11 + 8 + 34 + 18).

Run: `node --test tests/confirm-dialog-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: PASS, `tests 77 · pass 77 · fail 0`.

- [ ] **Step 11: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 1987 tests, 1986 pass, 0 fail, 1 skipped, the same count as after Task 6; tsc no errors; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat`
Expected: exactly 3 files. `disposal-bulk-execution.tsx` 2 insertions and 1 deletion, `disposal/page.tsx` 1 insertion, `tests/confirm-dialog-ui.test.ts` 2 insertions and 2 deletions.

- [ ] **Step 12: Commit Part B**

```bash
git add src/components/disposal/disposal-bulk-execution.tsx "src/app/[locale]/(dashboard)/disposal/page.tsx" tests/confirm-dialog-ui.test.ts
git commit -m "feat(ui): the bulk execution discard-selection confirm names its verb (2C batch 5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 5 dev-app check (Task 11):**
- `/th/disposal?status=pending` (bulk approval) and `/th/disposal?status=approved` (bulk execution) at 1440 and 375, with rows the dev data has: turn selection mode on (phones) or tick a row (desktop), then click another stage tab or a page link. The confirm shows its question, "ยกเลิก" first and the red "ละทิ้งรายการที่เลือก" last. Press "ยกเลิก" (or Esc): the page stays and the selection stays; focus returns to the link you clicked. Never press "ละทิ้งรายการที่เลือก" with a real selection you need, and never open the review or run approve or execute. English pass: "Discard selection". If the dev data has no pending or approved request, record that the confirm could not be opened (G and H pin it).

---

### Task 8: Batch 5 · `master-data/supplier-form.tsx` (the unsaved-changes confirm says "ออกโดยไม่บันทึก"; every confirm now names its action)

Spec §5.9 (the `confirm(` table row `supplier-form.tsx:93`: new `t("unsavedChangesLeave")` "ออกโดยไม่บันทึก", destructive; "จุดที่ต้องแก้" bullet 3 gives the call in full), §5.10, §5.11 G–H, §10.2 message table row "ชุด 5". DH 2C-4 hand-off: `master-data/supplier-form.tsx:97`. At `6835bdf` the call is `:97` (the spec quotes `:93`), inside `confirmNavigation` `:92-100`. The file is CRLF; edit with exact-string replacement only. It is a 2C-5 file (P3) and was migrated in batch 2 (no FMG row changes).

Rulings this task applies:
- **§5.9 "จุดที่ต้องแก้" bullet 3, ด22:** `confirm({ title: t("unsavedChangesConfirm"), confirmLabel: t("unsavedChangesLeave"), tone: "destructive" })`, `title` first (`tests/supplier-form-ui.test.ts:27` reads `confirm\(\{ title: t\("unsavedChangesConfirm"\)`); `.then((confirmed) => { if (confirmed) router.push(href) })` stays as it is.
- **§5.11 G, ruling (this plan):** the supplier form was the last file in `CONFIRMS_WITHOUT_A_VERB`, so this commit deletes the list and makes G strict (no waiting list is left to keep in sync); H gets its third and last row.
- **Messages:** one key through `messages-edit.mjs`; keep the change file for Task 13.

What users will see (`/master-data/suppliers/<id>/edit` or `/master-data/suppliers/new`: change a field, then "ยกเลิก" or the back link):
- The confirm "มีข้อมูลผู้ขายที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?" now has the red button "ออกโดยไม่บันทึก" ("Leave without saving") instead of a red "ยืนยัน". "ยกเลิก" keeps the user on the form with the changes. The browser's own leave-page prompt (`beforeunload`) is unchanged.

Not in this task:
- the form's fields, its back link and its buttons (batch 2, 2B-1); `tests/supplier-form-ui.test.ts` (H pins the wiring). Do not run a formatter.

**Files:**
- Modify: `src/components/master-data/supplier-form.tsx` (CRLF, 1 replacement)
- Modify: `messages/th.json`, `messages/en.json` (CRLF; only through `node scripts/messages-edit.mjs`: 1 key)
- Modify: `tests/confirm-dialog-ui.test.ts` (CRLF, 3 replacements)
- Temp folder only: `p2c5-unsaved-changes-leave.json` (keep it for Task 13)

**Must keep passing without edits:**
- `tests/supplier-form-ui.test.ts` (it reads the file without stripping `\r`): `:24-29` (`addEventListener("beforeunload"`, `removeEventListener`, `confirm\(\{ title: t\("unsavedChangesConfirm"\)`, `confirmNavigation`), `:31-40` (the four supplier keys), `:42-49` (batch 2).
- `tests/form-frames-ui.test.ts` (the supplier form's header pins), `tests/list-frame-guards.test.ts` (`MIGRATED_LIST_FILES` `:50`), `tests/form-migration-guards.test.ts` (`CONSTRAINT_FLOORS` `[2, 6, 0]` holds: no field changes), `tests/thai-glossary.test.ts`, `tests/messages-parity.test.ts`, `tests/messages-edit.test.ts`.

**Interfaces:**
- Consumes: Task 7's state of `tests/confirm-dialog-ui.test.ts`.
- Produces: the key `supplier.unsavedChangesLeave` (the last key of `supplier`); G strict (no `CONFIRMS_WITHOUT_A_VERB`); `BATCH_5_VERBS` with its 3 rows. After this task every `confirm()` in `src` names its action.

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `git ls-files --eol src/components/master-data/supplier-form.tsx tests/confirm-dialog-ui.test.ts`
Expected: `git status` prints nothing; both `i/lf w/crlf`.

Run: `git grep -n -F "unsavedChanges" -- src/components/master-data/supplier-form.tsx`
Expected, exactly:
```
src/components/master-data/supplier-form.tsx:97:    void confirm({ title: t("unsavedChangesConfirm"), tone: "destructive" }).then((confirmed) => {
```

Run: `node -e "for (const l of ['th','en']) console.log(l, require('./messages/' + l + '.json').supplier.unsavedChangesLeave)"`
Expected: `th undefined` and `en undefined`.

- [ ] **Step 2: The failing tests (`tests/confirm-dialog-ui.test.ts`)**

Three exact replacements in the lines Tasks 6–7 left.

(1) The waiting list goes.

Replace:

```ts
// Files whose confirm() still has no verb. The commit that names one removes its line (a two-way ratchet); the last one
// makes the test strict.
const CONFIRMS_WITHOUT_A_VERB = new Set<string>([
  "src/components/master-data/supplier-form.tsx", // the unsaved-changes confirm
])

test("every confirm() names its action with a verb (K12, spec 2C §5.11 G)", () => {
```

with:

```ts
test("every confirm() names its action with a verb (K12, spec 2C §5.11 G)", () => {
```

(2) G is strict.

Replace:

```ts
  assert.deepEqual([...unnamed].filter((path) => !CONFIRMS_WITHOUT_A_VERB.has(path)), [], "give the confirm a confirmLabel that says its verb")
  assert.deepEqual([...CONFIRMS_WITHOUT_A_VERB].filter((path) => !unnamed.has(path)), [], "it names its action now: remove it from CONFIRMS_WITHOUT_A_VERB")
```

with:

```ts
  assert.deepEqual([...unnamed], [], "give the confirm a confirmLabel that says its verb")
```

(3) The last `BATCH_5_VERBS` row.

Replace:

```ts
      ["src/app/[locale]/(dashboard)/disposal/page.tsx", 'discardSelectionAction: t("bulkDiscardSelectionAction"),', 2],
    ],
  },
]
```

with:

```ts
      ["src/app/[locale]/(dashboard)/disposal/page.tsx", 'discardSelectionAction: t("bulkDiscardSelectionAction"),', 2],
    ],
  },
  {
    key: "supplier.unsavedChangesLeave",
    th: "ออกโดยไม่บันทึก",
    en: "Leave without saving",
    reads: [["src/components/master-data/supplier-form.tsx", 'confirm({ title: t("unsavedChangesConfirm"), confirmLabel: t("unsavedChangesLeave"), tone: "destructive" })', 1]],
  },
]
```

Run: `node --test tests/confirm-dialog-ui.test.ts`
Expected: FAIL, `tests 7 · pass 5 · fail 2`, the two batch-5 tests: G (actual `[ 'src/components/master-data/supplier-form.tsx' ]`) and H (`th supplier.unsavedChangesLeave`, actual `undefined`).

- [ ] **Step 3: Add the message key**

Save this file as `<temp>/p2c5-unsaved-changes-leave.json` (UTF-8; keep it for Task 13):

```json
{ "set": { "th": { "supplier.unsavedChangesLeave": "ออกโดยไม่บันทึก" }, "en": { "supplier.unsavedChangesLeave": "Leave without saving" } } }
```

Run from the worktree root: `node scripts/messages-edit.mjs <temp>/p2c5-unsaved-changes-leave.json`
Expected: `messages updated: 1 th, 1 en, 0 deleted`; `git diff --stat messages` 2 insertions and 1 deletion in each file (the comma after `supplier.fieldTooLong` and the new key); both stay CRLF.

Run: `node --test tests/confirm-dialog-ui.test.ts`
Expected: still FAIL on the same 2 tests (`tests 7 · pass 5 · fail 2`); H now on `src/components/master-data/supplier-form.tsx reads confirm({ title: t("unsavedChangesConfirm"), confirmLabel: t("unsavedChangesLeave"), tone: "destructive" })`.

- [ ] **Step 4: Name the verb (`src/components/master-data/supplier-form.tsx:97`)**

Replace:

```tsx
    void confirm({ title: t("unsavedChangesConfirm"), tone: "destructive" }).then((confirmed) => {
```

with:

```tsx
    void confirm({ title: t("unsavedChangesConfirm"), confirmLabel: t("unsavedChangesLeave"), tone: "destructive" }).then((confirmed) => {
```

Check: `git grep -n -e "confirm({ title: [^}]*})" -- src | grep -v confirmLabel` prints nothing (every one-line `confirm({…})` in `src` has its verb; the multi-line ones in `use-delete-action.ts` and the integration toggle already had theirs).

- [ ] **Step 5: Run the tests for this task**

Run: `node --test tests/supplier-form-ui.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts tests/messages-edit.test.ts tests/form-frames-ui.test.ts`
Expected: PASS, `tests 28 · pass 28 · fail 0` (5 + 3 + 3 + 4 + 13).

Run: `node --test tests/confirm-dialog-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts`
Expected: PASS, `tests 51 · pass 51 · fail 0` (7 + 23 + 21).

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 1987 tests, 1986 pass, 0 fail, 1 skipped, the same count as after Task 6 (no new test); tsc no errors; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat`
Expected: exactly 4 files. `supplier-form.tsx` 1 insertion and 1 deletion, `messages/th.json` and `messages/en.json` 2 insertions and 1 deletion each, `tests/confirm-dialog-ui.test.ts` 7 insertions and 8 deletions.

- [ ] **Step 7: Commit**

```bash
git add src/components/master-data/supplier-form.tsx messages/th.json messages/en.json tests/confirm-dialog-ui.test.ts
git commit -m "feat(ui): the supplier unsaved-changes confirm names its verb; every confirm now does (2C batch 5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit. `git status --short src tests messages` prints nothing.

After this task the appended block of `tests/confirm-dialog-ui.test.ts` reads, in full (for the reviewer; nothing to apply):

```ts
// Phase 2C batch 5 (K12, spec 2C §5.9-§5.11 G-H): every confirm() names its action with a verb on its button, never
// the generic "ยืนยัน". The reader takes the argument of each confirm( call in a file that calls useConfirm() and
// checks every { title: … } object in it (both branches of a ternary count).
function confirmOptionObjects(source: string): string[] {
  const balanced = (text: string, from: number, open: string, close: string) => {
    let depth = 0
    for (let index = from; index < text.length; index += 1) {
      if (text[index] === open) depth += 1
      else if (text[index] === close && --depth === 0) return text.slice(from, index + 1)
    }
    return ""
  }
  return [...source.matchAll(/(?<![\w.$])confirm\(/g)].flatMap((call) => {
    const argument = balanced(source, call.index + call[0].length - 1, "(", ")")
    return [...argument.matchAll(/\{\s*title:/g)].map((object) => balanced(argument, object.index, "{", "}"))
  })
}

test("every confirm() names its action with a verb (K12, spec 2C §5.11 G)", () => {
  const unnamed = new Set<string>()
  let objects = 0
  for (const file of readSourceFiles("src")) {
    if (file.path === "src/components/ui/confirm-dialog.tsx" || !/\buseConfirm\(\)/.test(file.source)) continue
    for (const object of confirmOptionObjects(file.source)) {
      objects += 1
      if (!/\bconfirmLabel:/.test(object)) unnamed.add(file.path)
    }
  }
  assert.ok(objects >= 14, `the reader found only ${objects} confirm() options`)
  assert.deepEqual([...unnamed], [], "give the confirm a confirmLabel that says its verb")
})

// The verb labels batch 5 adds (spec 2C §5.10) and the expressions that read them, counted per file.
const BATCH_5_VERBS: Array<{ key: string; th: string; en: string; reads: Array<[path: string, expression: string, count: number]> }> = [
  {
    key: "integrationApiPage.confirmScopeExpansionAction",
    th: "เพิ่มสิทธิ์",
    en: "Add permissions",
    reads: [
      ["src/components/admin/IntegrationClientManager.tsx", 'confirm({ title: labels.confirmScopeExpansion, confirmLabel: labels.confirmScopeExpansionAction })', 1],
      ["src/app/[locale]/(dashboard)/admin/integrations/page.tsx", 'confirmScopeExpansionAction: t("confirmScopeExpansionAction"),', 1],
    ],
  },
  {
    // One key for both bulk confirms: they mean the same thing (spec 2C §5, ruling ด17).
    key: "disposalPage.bulkDiscardSelectionAction",
    th: "ละทิ้งรายการที่เลือก",
    en: "Discard selection",
    reads: [
      ["src/components/disposal/disposal-bulk-approval.tsx", 'confirm({ title: copy.discardSelection, confirmLabel: copy.discardSelectionAction, tone: "destructive" })', 1],
      ["src/components/disposal/disposal-bulk-execution.tsx", 'confirm({ title: copy.discardSelection, confirmLabel: copy.discardSelectionAction, tone: "destructive" })', 1],
      ["src/app/[locale]/(dashboard)/disposal/page.tsx", 'discardSelectionAction: t("bulkDiscardSelectionAction"),', 2],
    ],
  },
  {
    key: "supplier.unsavedChangesLeave",
    th: "ออกโดยไม่บันทึก",
    en: "Leave without saving",
    reads: [["src/components/master-data/supplier-form.tsx", 'confirm({ title: t("unsavedChangesConfirm"), confirmLabel: t("unsavedChangesLeave"), tone: "destructive" })', 1]],
  },
]

test("the batch 5 verbs say the same thing in both languages and reach their confirm() (spec 2C §5.10, §5.11 H)", () => {
  const messages = { th: JSON.parse(readFileSync("messages/th.json", "utf8")), en: JSON.parse(readFileSync("messages/en.json", "utf8")) }
  const at = (tree: unknown, key: string) => key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], tree)
  for (const verb of BATCH_5_VERBS) {
    assert.equal(at(messages.th, verb.key), verb.th, `th ${verb.key}`)
    assert.equal(at(messages.en, verb.key), verb.en, `en ${verb.key}`)
    for (const [path, expression, count] of verb.reads) assert.equal(read(path).split(expression).length - 1, count, `${path} reads ${expression}`)
  }
})
```

**For the plan 5 dev-app check (Task 11):**
- `/th/master-data/suppliers/<id>/edit` at 1440 and 375: change the contact field, then press "ยกเลิก" (the outline link at the bottom) or the header's back link: the confirm shows its question, "ยกเลิก" first and the red "ออกโดยไม่บันทึก" last. Press "ยกเลิก" (or Esc): the form stays with the change; focus returns to the link. Do not press "ออกโดยไม่บันทึก" and do not save. English pass: "Leave without saving". With no change, the link leaves without a confirm (do not save anything).

---

### Task 9: Batch 5 · `admin/system-settings-form.tsx` (O7: the settings tab row on `TabNav` with `onSelect`)

Spec §8.2 O7 (the 11-tab row → 2B's `TabNav` in batch 5, after 2B merged; `tests/settings-tab-persistence-ui.test.ts:8-13` keeps passing), §8.9 "ชุด 5" bullet 4, §8 ruling 15, §10.1 (O7 kept out of 1f). The 2B spec gives the API and the use: `docs/superpowers/specs/2026-10-12-ui-phase2b/00-synthesis.md:54` (R-g: `TabNav` takes a client `onSelect` that can `preventDefault`, so 2C batch 5 can move the row that uses `replaceState`) and `03-primitives.md` §3.12 (the settings page calls `event.preventDefault()` and then `selectTab(key)`; the URL changes through `replaceState` as before; Ctrl+click opens the tab in a new window; links do not submit the form). Controller ruling P2: this task changes `c/admin/system-settings-form.tsx` only; the page `D/admin/settings/page.tsx` is plan 2B-5's.

Lines at `6835bdf` (the spec quotes `:937-956` at `5ffee76`; the 2B spec `:948-967`): imports `:5` (`next/navigation`) and `:21` (`sticky-form-footer`), the hooks `:522-523` (`usePathname`, `useSearchParams`), `activeTab` `:527`, the tab list `:748`, `selectTab` `:754-758`, the form `:947` and the tab row `:948-967` (a card `:948` around a scrolling row `:949` of 11 `<button aria-pressed>` `:953-963`). The file is CRLF; edit with exact-string replacement only.

Rulings this task applies:
- **R-g, §3.12 of the 2B spec:** `<TabNav aria-label=… items={tabs} current={activeTab} onSelect={(key, event) => { event.preventDefault(); selectTab(parseSystemSettingsTab(key)) }} />`. `parseSystemSettingsTab` turns the `string` key back into a `SettingsTabId` without a cast (an unknown key falls back to the first tab, which cannot happen here). `selectTab` and its `window.history.replaceState` do not change, so the unsaved edits survive a tab switch exactly as with the buttons, and `tests/settings-tab-persistence-ui.test.ts:5-13` passes as it is.
- **The items:** `tabs` becomes the `TabNavItem[]` itself: `{ key: id, label: tabLabels[id], href: buildSystemSettingsTabHref(pathname, searchParams.toString(), id) }`, so each link has the real URL of its tab (Ctrl+click and middle-click open it). The settings search (`findSystemSettingsSearchResults(…, tabLabels)` `:749-753`) reads `tabLabels`, not `tabs`, so nothing else changes.
- **The frame:** the card around the row (`min-w-0 rounded-lg border border-border bg-surface p-2`) goes with the buttons: `TabNav` is an underline row on the page canvas, like the other `TabNav` rows (`D/audit/findings/page.tsx:303`, the asset detail tabs). No `className`: the row stays inside the form's padding and scrolls sideways when it does not fit (11 tabs; `TabNav` keeps the system scrollbar, 2B spec §3.12 ruling 22). **Ruling (this plan):** no full-bleed margins on phones (the register's status tabs have them; the spec says nothing for this row).
- **The row's name, controller ruling P2:** the form receives no label for the row (its `labels` prop has none: the tab names, `settingsOverview` "สรุปสถานะการตั้งค่า" and the search label do not name a set of sections), and the form has no `useTranslations` today. **Proposed ruling (open for the controller):** read the existing key `systemSettingsPage.title` ("ตั้งค่าระบบ" / "System Settings") with `useTranslations("systemSettingsPage")` inside the form (`NextIntlClientProvider` in `src/app/[locale]/layout.tsx:14` passes every message to client components), so the page is not edited and no key is added; screen readers hear the navigation "ตั้งค่าระบบ" under the page title "ตั้งค่าระบบ". The alternative is a new key such as `systemSettingsPage.tabNavigation` "หมวดการตั้งค่า", read the same way; the spec's batch-5 message table has no such key, so it would be a departure.
- **What links change:** Enter opens a tab (Space did on the buttons); the current tab is marked with `aria-current="page"` instead of `aria-pressed="true"`; links do not submit the settings `<form>` (the buttons were `type="button"`). The row is 44px below `md` and 40px from `md` (the buttons switched at `sm`).
- **FMG and LFG:** no row changes. The form was migrated in 1f; LFG's rows for it (LB1 1, LV2 8, LS1 1) count things this task does not touch, and `TabNav` sets `aria-current` itself (LN1).

What users will see (`/admin/settings`):
- The 11 tabs are an underline row like the other link tabs: the current tab is dark, weight 600, with a 2px primary line; the others are muted and show a grey line on hover. The white card with a filled blue current tab is gone. 44px tall on phones, 40px from `md`.
- Switching tabs works as before: the panel changes in place, the URL gets `?tab=…` and unsaved edits stay (the change counter in the save bar does not reset). Ctrl+click or middle-click opens a tab in a new browser tab (new).
- Screen readers hear a navigation named "ตั้งค่าระบบ" with 11 links, the current one as "current page" (it was a "pressed" toggle button).

Not in this task:
- `D/admin/settings/page.tsx` (plan 2B-5: its header; P2), the settings search card, the overview, every panel, the prefix dialog and the save bar (1f)
- `src/lib/system-settings-tabs.ts`, `src/lib/settings-information-architecture.ts`, `ui/tab-nav.tsx` (2B)
- messages: no key changes. Do not run a formatter.

**Files:**
- Modify: `src/components/admin/system-settings-form.tsx` (CRLF, 5 replacements)
- Modify: `tests/settings-tab-persistence-ui.test.ts` (CRLF, 1 test appended with `<temp>/p2c5-append.mjs`)

**Must keep passing without edits:**
- `tests/settings-tab-persistence-ui.test.ts:5-13` (`useSearchParams`, `parseSystemSettingsTab`, `buildSystemSettingsTabHref`, `window.history.replaceState`, `beforeunload`; it reads the file without stripping `\r`).
- `tests/settings-ldap-role-ui.test.ts`, `tests/settings-depreciation-policy-ui.test.ts`, `tests/system-log-history.test.ts`, `tests/asset-label-print-ui.test.ts` (read by both plans, edited by neither; the pair's §8.3 table), `tests/sticky-form-footer-ui.test.ts:45-55` (the save bar is the form's last child), `tests/accessible-dialog.test.ts:92-` (the prefix dialog inside the form), `tests/steps-ui.test.ts:96-104`, `tests/form-frames-ui.test.ts:125-132`, `tests/field-primitives.test.ts:149`, `tests/visual-foundation-guards.test.ts:301` (`<Segmented` in the form), `tests/pm-generation-removed.test.ts`, `tests/choice-controls-ui.test.ts`.
- `tests/list-primitives-ui.test.ts` (`TabNav`) and `tests/list-frame-guards.test.ts` (the form is in `MIGRATED_LIST_FILES`, `:64`); `tests/form-migration-guards.test.ts` (GD5: the prefix dialog stays inside the form; STICKY_FOOTER_ROUTES).

**Interfaces:**
- Consumes: 2B's `TabNav` from `@/components/ui/tab-nav` (`"aria-label"`, `items: readonly TabNavItem[]` with `key`, `label`, `href`, `current`, `onSelect(key, event)`, server-safe, `Link onNavigate` inside); `useTranslations` from `next-intl`; the form's `selectTab`, `parseSystemSettingsTab`, `buildSystemSettingsTabHref`, `pathname`, `searchParams`; Task 6's `<temp>/p2c5-append.mjs`.
- Produces: the settings row on `TabNav`; `const tabs` is `TabNavItem`-shaped; `const tPage = useTranslations("systemSettingsPage")` in `SystemSettingsForm`. `SystemSettingsFormProps` is unchanged.

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `git ls-files --eol src/components/admin/system-settings-form.tsx tests/settings-tab-persistence-ui.test.ts`
Expected: `git status` prints nothing; both `i/lf w/crlf`.

Run: `git grep -n -e "aria-pressed={isActive}" -e "const tabs = " -e "useTranslations" -e "tab-nav" -- src/components/admin/system-settings-form.tsx`
Expected, exactly:
```
src/components/admin/system-settings-form.tsx:748:  const tabs = getSettingsTabOrder().map((id) => ({ id, label: tabLabels[id] }))
src/components/admin/system-settings-form.tsx:960:                aria-pressed={isActive}
```

Run: `git grep -n "onSelect\|onNavigate" -- src/components/ui/tab-nav.tsx`
Expected: 6 lines, among them `:26` (`onSelect?: (key: string, event: { preventDefault: () => void }) => void`) and `:55` (`onNavigate={onSelect ? (event) => onSelect(item.key, event) : undefined}`), 2B-1's API. If either is missing, stop.

- [ ] **Step 2: Append the failing test (`tests/settings-tab-persistence-ui.test.ts`)**

Save the block below as `<temp>/p2c5-settings-tabs.ts.txt` (UTF-8, LF) and run from the worktree root: `node <temp>/p2c5-append.mjs tests/settings-tab-persistence-ui.test.ts <temp>/p2c5-settings-tabs.ts.txt`
Expected: `appended 12 lines to tests/settings-tab-persistence-ui.test.ts`. (The file's last lines at `6835bdf` are `:13-14`, `  assert.match(source, /removeEventListener\("beforeunload"/)` and `})`; the test strips `\r` itself.)

```ts
// Phase 2C batch 5 (O7, 2B spec R-g): the tab row is TabNav, links named by the nav with the current one marked by
// aria-current. A plain click runs onSelect, which cancels the Link navigation and keeps the replaceState switch the
// test above pins, so unsaved edits stay; Ctrl+click opens the tab's own URL.
test("the settings tab row is TabNav, and a click switches tabs in place (O7, 2C batch 5)", () => {
  const source = readFileSync("src/components/admin/system-settings-form.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /^import \{ TabNav \} from "@\/components\/ui\/tab-nav"$/m)
  assert.match(source, /^import \{ useTranslations \} from "next-intl"$/m)
  assert.match(source, /const tPage = useTranslations\("systemSettingsPage"\)/)
  assert.match(source, /const tabs = getSettingsTabOrder\(\)\.map\(\(id\) => \(\{ key: id, label: tabLabels\[id\], href: buildSystemSettingsTabHref\(pathname, searchParams\.toString\(\), id\) \}\)\)/)
  assert.match(source, /<form onSubmit=\{handleSubmit\} className="space-y-6">\n\s+<TabNav\n\s+aria-label=\{tPage\("title"\)\}\n\s+items=\{tabs\}\n\s+current=\{activeTab\}\n\s+onSelect=\{\(key, event\) => \{\n\s+event\.preventDefault\(\)\n\s+selectTab\(parseSystemSettingsTab\(key\)\)\n\s+\}\}\n\s+\/>/)
  assert.doesNotMatch(source, /aria-pressed=\{isActive\}|bg-primary text-white|tabs\.map\(\(tab\)/, "the hand-made tab buttons are gone")
})
```

Run: `node --test tests/settings-tab-persistence-ui.test.ts`
Expected: FAIL, `tests 2 · pass 1 · fail 1`: the new test, first on `/^import \{ TabNav \} from "@\/components\/ui\/tab-nav"$/m`.

- [ ] **Step 3: Move the row onto `TabNav` (`src/components/admin/system-settings-form.tsx`)**

Five exact replacements. Make all of them before you compile.

(1) The `next-intl` import (`:5`).

Replace:

```tsx
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
```

with:

```tsx
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
```

(2) The `TabNav` import (`:21`).

Replace:

```tsx
import { StickyFormFooter } from "@/components/ui/sticky-form-footer"
```

with:

```tsx
import { StickyFormFooter } from "@/components/ui/sticky-form-footer"
import { TabNav } from "@/components/ui/tab-nav"
```

(3) The row's name (`:522-523`).

Replace:

```tsx
  const pathname = usePathname()
  const searchParams = useSearchParams()
```

with:

```tsx
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // The tab row's name: the page passes no label for it, so the form reads the page title.
  const tPage = useTranslations("systemSettingsPage")
```

(4) The tab items (`:748`).

Replace:

```tsx
  const tabs = getSettingsTabOrder().map((id) => ({ id, label: tabLabels[id] }))
```

with:

```tsx
  // TabNav links (O7, 2B spec R-g): each tab has its own URL, so Ctrl+click opens it in a new tab. A plain click runs
  // onSelect below, which cancels the navigation and switches with selectTab, so unsaved edits stay.
  const tabs = getSettingsTabOrder().map((id) => ({ key: id, label: tabLabels[id], href: buildSystemSettingsTabHref(pathname, searchParams.toString(), id) }))
```

(5) The row (`:947-967`). The search card that follows (`:969`) stays.

Replace:

```tsx
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="min-w-0 rounded-lg border border-border bg-surface p-2">
        <div className="flex max-w-full gap-2 overflow-x-auto overscroll-x-contain">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                className={`min-h-11 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors sm:h-10 sm:min-h-0 ${
                  isActive ? "bg-primary text-white" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
                aria-pressed={isActive}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>
```

with:

```tsx
    <form onSubmit={handleSubmit} className="space-y-6">
      <TabNav
        aria-label={tPage("title")}
        items={tabs}
        current={activeTab}
        onSelect={(key, event) => {
          event.preventDefault()
          selectTab(parseSystemSettingsTab(key))
        }}
      />
```

Check: `grep -n "TabNav\|tPage\|useTranslations\|const tabs\|aria-pressed\|bg-primary text-white" src/components/admin/system-settings-form.tsx` prints 7 lines: `6:` (the `next-intl` import), `23:` (the `TabNav` import), `527:` (`tPage`), `752:` (the comment), `754:` (`const tabs`), `954:` (`<TabNav`) and `955:` (`aria-label={tPage("title")}`).

- [ ] **Step 4: Run the tests for this task**

Run: `node --test tests/settings-tab-persistence-ui.test.ts tests/list-primitives-ui.test.ts tests/list-frame-guards.test.ts tests/sticky-form-footer-ui.test.ts tests/form-frames-ui.test.ts tests/settings-ldap-role-ui.test.ts tests/settings-depreciation-policy-ui.test.ts tests/asset-label-print-ui.test.ts tests/field-primitives.test.ts tests/system-log-history.test.ts tests/pm-generation-removed.test.ts tests/choice-controls-ui.test.ts`
Expected: PASS, `tests 115 · pass 115 · fail 0` (2 + 19 + 21 + 4 + 13 + 1 + 6 + 14 + 16 + 3 + 2 + 14).

Run: `node --test tests/form-migration-guards.test.ts tests/visual-foundation-guards.test.ts tests/accessible-dialog.test.ts tests/steps-ui.test.ts`
Expected: PASS, `tests 65 · pass 65 · fail 0` (23 + 26 + 7 + 9, as after Task 8).

- [ ] **Step 5: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 1988 tests, 1987 pass, 0 fail, 1 skipped (1 test more than after Task 8); tsc no errors (`tabs` fits `readonly TabNavItem[]`, and `onSelect` gets `key: string`); lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat`
Expected: exactly 2 files. `system-settings-form.tsx` 16 insertions and 21 deletions, `tests/settings-tab-persistence-ui.test.ts` 13 insertions.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/system-settings-form.tsx tests/settings-tab-persistence-ui.test.ts
git commit -m "feat(ui): settings tabs on TabNav, switching in place through onSelect (2C batch 5, O7)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 2 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 5 dev-app check (Task 11):**
- `/th/admin/settings` at 1440, 768 and 375: the underline row with "เลขที่ทรัพย์สิน" current; no card around it; at 375 the row scrolls sideways inside the content padding, no page scroll; 44px tall at 375, 40px from 768.
- Change one field on the first tab (do not save), then click "การแจ้งเตือน": the panel switches, the URL reads `?tab=notifications`, the save bar still counts 1 change; click back: the field still holds the change. Then undo it by hand or reload (never press "บันทึก").
- Keyboard: Tab reaches the 11 links in order with the inset focus ring; Enter switches; the focus stays on the link. Ctrl+click on a tab opens it in a new browser tab on that tab (close it).
- NVDA: "ตั้งค่าระบบ navigation", the current link "current page". Forced colors: the current tab keeps its 2px `CanvasText` underline.
- Network: the tab links may send GET prefetches for `?tab=…` (Link); a tab click sends no request; 0 POST/PUT/PATCH/DELETE.

---

### Task 10: Batch 5 · the form guard's end state (a check; one comment commit only if the earlier tasks left stale comments)

Spec §8.9 "ชุด 5" last bullet ("budget G4 ของไฟล์ 2C ทุกตัวเป็น 0 (ยกเว้นที่ชุด 4 ระบุ)": 08's G4 is FMG's GF2 `RAW_FIELDS`, spec §9.2), §9.4 (`FIXED_BOTTOM_BARS` after batch 5; "`PENDING_FOOTER_PARTS` … ชุด 5 ว่าง"), §9.9 (batch 5: delete the two bars, `FIXED_BOTTOM_BARS` loses their rows and gains `ui/action-bar.tsx: 1`, `PENDING_FOOTER_PARTS` empty), §10.4 table C (GD2 `{}` after batch 5; GL1(c) `asset-register-table.tsx` 1 + `ui/action-bar.tsx` 1), §5.11 G (every `confirm()` names its verb).

**Every lowering is folded into the commit of its file** (the controller's rule): Task 2 deletes the two bars, their `FIXED_BOTTOM_BARS` rows and their `BATCH_FILES` "5" entries (FMG's "the guard's own lists name real 2C files" fails on a deleted path) and adds `ui/action-bar.tsx: 1`; Tasks 3 and 4 add `disposal/disposal-workflow-stepper.tsx`, `ui/alert-dialog.tsx` and `ui/confirm-dialog.tsx` to `MIGRATED_FILES`; Task 5 takes `maintenance-attachments.tsx` out of `PENDING_FOOTER_PARTS`; Tasks 6–8 give the four `confirm()` calls their verbs. This task checks the result and changes nothing unless two header comments still describe batch 5 as future work.

**Must hold for Task 5 (found while checking this task):** removing the last entry leaves `const PENDING_FOOTER_PARTS = new Set([` with only comments inside. An empty `new Set([])` is a `Set<never>`, and `npx tsc --noEmit` then fails at FMG `:517` (`PENDING_FOOTER_PARTS.has(file.path)`: TS2345, `string` is not assignable to `never`; checked in a copy of `6835bdf`). Task 5 must write `new Set<string>([` in the same commit; Step 2's script checks it.

What users will see: nothing (tests only).

**Files:**
- Modify (only if Step 3 finds them): `tests/form-migration-guards.test.ts` (CRLF, up to 2 replacements of comment lines)
- Temp folder only, never committed: `p2c5-guard-state.mjs`

**Interfaces:**
- Consumes: Tasks 1–9 committed.
- Produces: the end state of 2C's guard (the table under Step 2) for Tasks 12–13 and the DH; 2D starts from it ("Phase 2D widens every guard to all of src and sets the budgets to {}", FMG `:21`).

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `git log --oneline master..HEAD`
Expected: `git status` prints nothing; the log lists the 11 commits of Tasks 1–9 (Tasks 4 and 7 have two each) and the plan commit, newest first. `git ls-files --eol tests/form-migration-guards.test.ts` shows `i/lf w/crlf`.

- [ ] **Step 2: Check the guard state after batch 5**

Save this script as `p2c5-guard-state.mjs` in your temp folder (never in the repo; it replaces Task 5 Step 8's script of the same name):

```js
// p2c5-guard-state.mjs: run from the worktree root. Reads only; writes nothing. Never commit this file.
// Prints every budget of tests/form-migration-guards.test.ts as "NAME: <entries> entries, <sum>" and checks the 2C end
// state after batch 5 (spec 2C §8.9 "ชุด 5", §9.4, §9.9): every 2C file is in MIGRATED_FILES, no dialog waits in
// PENDING_FOOTER_PARTS, the budgets hold only the rows 2C keeps on purpose, and every confirm() names its action.
// Exits 1 and names each difference.
import { existsSync, readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

const { readSourceFiles } = await import(pathToFileURL(`${process.cwd()}/tests/helpers/source-files.ts`).href)
const guardRaw = readFileSync("tests/form-migration-guards.test.ts", "utf8")
const guard = guardRaw.replace(/\r\n/g, "\n")
// The lines from `const NAME` to the first line that starts with } or ] (the object or list closing at column 0).
const block = (name) => new RegExp(String.raw`^const ${name}\b[\s\S]*?^[}\]]`, "m").exec(guard)?.[0] ?? ""
// A row is [`${C}path`]: n (or "src/components/path": n); a list item is `${C}path`, (or "src/components/path",).
const entries = (name) => [...block(name).matchAll(/^\s+(?:\[`\$\{C\}([^`]+)`\]|"src\/components\/([^"]+)"):\s*(\[[^\]]*\]|\d+)/gm)].map((m) => ({ path: m[1] ?? m[2], value: m[3] }))
const listed = (name) => [...block(name).matchAll(/^\s+(?:`\$\{C\}([^`]+)`|"src\/components\/([^"]+)"),/gm)].map((m) => m[1] ?? m[2])
const batches = Object.fromEntries([...guard.matchAll(/^\s+"([0-9a-g]+)": \[([^\]]*)\]/gm)].map((m) => [m[1], [...m[2].matchAll(/"([^"]+)"/g)].map((item) => item[1])]))
const batchFiles = Object.values(batches).flat()

// What 2C leaves on purpose (spec §9.4, I27, K21, O20; GL1(c) after plan 5): the room search and the label print
// toolbar's two boxed fields; the spinners outside buttons; ActionBar and the register's phone bulk bar (phase 3).
const KEEP = {
  RAW_FIELDS: { "audit/audit-scan-room-picker.tsx": "1", "assets/asset-label-print.tsx": "2" },
  LOADER2: {
    "maintenance/maintenance-attachments.tsx": "1",
    "disposal/disposal-asset-picker.tsx": "1",
    "audit/audit-scan-check-form.tsx": "1",
    "assets/asset-component-manager.tsx": "1",
    "disposal/disposal-bulk-approval.tsx": "2",
    "disposal/disposal-bulk-execution.tsx": "1",
    "admin/IntegrationClientManager.tsx": "2",
    "assets/asset-label-batch-tool.tsx": "2",
    "assets/asset-scan-search-tool.tsx": "1",
    "asset-operations/transaction-cancel-dialog.tsx": "1",
  },
  FIXED_BOTTOM_BARS: { "assets/asset-register-table.tsx": "1", "ui/action-bar.tsx": "1" },
}
const BATCH_5 = ["disposal/disposal-workflow-stepper.tsx", "ui/alert-dialog.tsx", "ui/confirm-dialog.tsx"]
const problems = []
for (const name of ["LOCAL_FIELD", "RAW_FIELDS", "FIELD_CLASS_STRINGS", "OLD_MARKUP", "LOADER2", "OLD_HELPERS", "REVERSE", "CLOSE_LABEL_IS_CANCEL", "FIXED_BOTTOM_BARS"]) {
  if (!block(name)) problems.push(`const ${name} not found`)
  const list = entries(name)
  console.log(`${name}: ${list.length} entries, ${list.reduce((sum, item) => sum + Number(item.value), 0)}`)
  const keep = KEEP[name] ?? {}
  for (const item of list) if (keep[item.path] !== item.value) problems.push(`${name} holds ${item.value} for ${item.path}`)
  for (const [path, value] of Object.entries(keep)) if (!list.some((item) => item.path === path)) problems.push(`${name} should keep ${value} for ${path}`)
}
const floors = entries("CONSTRAINT_FLOORS").length
console.log(`CONSTRAINT_FLOORS: ${floors} entries`)
if (floors !== 38) problems.push(`CONSTRAINT_FLOORS has ${floors} entries, not 38 (a floor never goes)`)
const batch5 = [...(batches["5"] ?? [])].sort()
console.log(`BATCH_FILES: ${batchFiles.length} files (batch 5: ${batch5.join(", ")})`)
if (JSON.stringify(batch5) !== JSON.stringify(BATCH_5)) problems.push(`BATCH_FILES "5" should be ${BATCH_5.join(", ")}`)
for (const gone of ["ui/mobile-action-bar.tsx", "disposal/disposal-mobile-action-bar.tsx"]) if (existsSync(`src/components/${gone}`)) problems.push(`src/components/${gone} still exists`)
if (!/"ui\/action-bar\.tsx"/.test(/^const NEW_2C_FILES\b.*$/m.exec(guard)?.[0] ?? "")) problems.push("NEW_2C_FILES lacks ui/action-bar.tsx")
const migrated = listed("MIGRATED_FILES")
const unmigrated = batchFiles.filter((path) => !migrated.includes(path))
console.log(`MIGRATED_FILES: ${migrated.length}${unmigrated.length ? ` (not yet: ${unmigrated.join(", ")})` : " (every 2C file)"}`)
if (unmigrated.length) problems.push(`MIGRATED_FILES lacks ${unmigrated.join(", ")}`)
const pending = listed("PENDING_FOOTER_PARTS")
console.log(`PENDING_FOOTER_PARTS: ${pending.length}${pending.length ? ` (${pending.join(", ")})` : ""}`)
if (pending.length) problems.push(`PENDING_FOOTER_PARTS still lists ${pending.join(", ")}`)
// An empty new Set([]) is a Set<never>, and tsc then rejects PENDING_FOOTER_PARTS.has(file.path) in GD2.
if (!/^const PENDING_FOOTER_PARTS = new Set<string>\(/m.test(guard)) problems.push("declare PENDING_FOOTER_PARTS as new Set<string>( so tsc accepts .has(path) on the empty set")

// K12: every confirm() names its action (the reader of tests/confirm-dialog-ui.test.ts, spec 2C §5.11 G).
const balanced = (text, from, open, close) => {
  let depth = 0
  for (let index = from; index < text.length; index += 1) {
    if (text[index] === open) depth += 1
    else if (text[index] === close && --depth === 0) return text.slice(from, index + 1)
  }
  return ""
}
const confirmFiles = readSourceFiles("src").filter((file) => file.path !== "src/components/ui/confirm-dialog.tsx" && /\buseConfirm\(\)/.test(file.source))
const options = confirmFiles.flatMap((file) =>
  [...file.source.matchAll(/(?<![\w.$])confirm\(/g)].flatMap((call) => {
    const argument = balanced(file.source, call.index + call[0].length - 1, "(", ")")
    return [...argument.matchAll(/\{\s*title:/g)].map((object) => ({ path: file.path, text: balanced(argument, object.index, "{", "}") }))
  }),
)
const unnamed = options.filter((option) => !/\bconfirmLabel:/.test(option.text))
console.log(`confirm(): ${options.length} options in ${confirmFiles.length} files, ${unnamed.length} without confirmLabel`)
if (unnamed.length) problems.push(`confirm() without a verb: ${unnamed.map((option) => option.path).join(", ")}`)
const crlf = (guardRaw.match(/\r\n/g) ?? []).length
const lf = (guardRaw.match(/\n/g) ?? []).length
console.log(`tests/form-migration-guards.test.ts: ${crlf === lf ? "CRLF" : crlf === 0 ? "LF" : "mixed"}`)
if (problems.length > 0) {
  console.error(problems.join("\n"))
  process.exit(1)
}
console.log("2C holds only what it keeps (batch 5 end state)")
```

Run: `node --no-warnings <temp>/p2c5-guard-state.mjs`
Expected, exactly:
```
LOCAL_FIELD: 0 entries, 0
RAW_FIELDS: 2 entries, 3
FIELD_CLASS_STRINGS: 0 entries, 0
OLD_MARKUP: 0 entries, 0
LOADER2: 10 entries, 13
OLD_HELPERS: 0 entries, 0
REVERSE: 0 entries, 0
CLOSE_LABEL_IS_CANCEL: 0 entries, 0
FIXED_BOTTOM_BARS: 2 entries, 2
CONSTRAINT_FLOORS: 38 entries
BATCH_FILES: 64 files (batch 5: disposal/disposal-workflow-stepper.tsx, ui/alert-dialog.tsx, ui/confirm-dialog.tsx)
MIGRATED_FILES: 64 (every 2C file)
PENDING_FOOTER_PARTS: 0
confirm(): 15 options in 12 files, 0 without confirmLabel
tests/form-migration-guards.test.ts: CRLF
2C holds only what it keeps (batch 5 end state)
```

On any other output, stop and report it (do not edit a budget to make it match; the task that owns the row fixes it). If Task 5 recorded a different kept value for `maintenance-attachments.tsx` (its delete button's spinner, `LOADER2` 1, spec §9.4 row 1a "GB1 :210 ปุ่มลบของ 2D"), the controller updates `KEEP` and the `LOADER2` line together before this step.

The end state against `6835bdf` (the DH 2C plan 4 guard line):

| FMG | `6835bdf` (after batch 4) | after batch 5 | by |
|---|---|---|---|
| `LOCAL_FIELD`, `FIELD_CLASS_STRINGS`, `OLD_MARKUP`, `OLD_HELPERS`, `REVERSE`, `CLOSE_LABEL_IS_CANCEL` | `{}` | `{}` | — |
| `RAW_FIELDS` (GF2, 08's G4) | 2 entries (3): the room search (O20), the label print toolbar (K21) | the same | — |
| `LOADER2` | 10 entries (13) | the same (no batch-5 file has a spinner; `maintenance-attachments.tsx` keeps its delete button's, 2D) | — |
| `FIXED_BOTTOM_BARS` (GL1c) | 3: the register's bulk bar, the two phone action bars | 2: the register's bulk bar (phase 3), `ui/action-bar.tsx` | Task 2 |
| `BATCH_FILES` | 66 files | 64 ("5": the stepper, `ui/alert-dialog.tsx`, `ui/confirm-dialog.tsx`) | Task 2 |
| `MIGRATED_FILES` | 61 | 64 (every 2C file; `ui/action-bar.tsx` counts through `NEW_2C_FILES`) | Tasks 3, 4 |
| `PENDING_FOOTER_PARTS` (GD2) | 1 (`maintenance-attachments.tsx`) | 0, typed `new Set<string>` | Task 5 |
| `CONSTRAINT_FLOORS` (GF5) | 38 files | 38 (a floor never goes) | — |
| `BUSY_LABEL_SWAPS`, `STICKY_FOOTER_ROUTES` | 8, 2 | the same | — |
| `confirm()` options (`tests/confirm-dialog-ui.test.ts` G) | 14 in 11 files, 4 without a verb | 15 in 12 files, 0 | Tasks 5–8 |

- [ ] **Step 3: Stale comments**

Run: `git grep -n -e "The 66 files" -e "arrives in batch 5" -e "batch 5 deletes" -e "waits for batch 5" -- tests/form-migration-guards.test.ts`
At `6835bdf` this prints `:25`, `:39`, `:314` and `:321`; Tasks 2 and 5 removed the rows of `:314` and `:321`, and Task 2 (Step 4 (1)) already rewrote the `:25` header. After Tasks 1–9 it prints exactly one line, the `:39` line of `6835bdf`, one lower after Task 2's two-line header:
```
tests/form-migration-guards.test.ts:40:// Primitives 2C creates: every guard applies to them from the first day (action-bar.tsx arrives in batch 5).
```
- If it prints nothing, the earlier tasks already updated both header comments: skip to Step 5 (no commit).
- Otherwise make the replacements below for the lines it prints (each OLD is the line at `6835bdf`): after Tasks 1–9 that is (2) only. For any other line it prints, stop and ask the controller.

(1) `:25`, the `BATCH_FILES` header (only if the line is printed; Task 2 already replaces it).

Replace:

```ts
// The 66 files of 2C by batch (spec §8.6, §8.9), relative to src/components/.
```

with:

```ts
// The 64 files of 2C by batch (spec §8.6, §8.9), relative to src/components/. Batch 5 deleted its two phone action bars;
// ActionBar (ui/action-bar.tsx) replaced them and is one of NEW_2C_FILES.
```

(2) `:39` (`:40` after Task 2), the `NEW_2C_FILES` header.

Replace:

```ts
// Primitives 2C creates: every guard applies to them from the first day (action-bar.tsx arrives in batch 5).
```

with:

```ts
// Primitives 2C creates: every guard applies to them from the first day.
```

- [ ] **Step 4: Verify and commit (only if Step 3 changed the file)**

Run: `node --test tests/form-migration-guards.test.ts`, then `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: FMG PASS, `tests 23 · pass 23 · fail 0`; `npm test` 1988 tests, 1987 pass, 0 fail, 1 skipped (the same count as after Task 9); tsc no errors; lint 0 errors and no new warning.

Run: `git diff --stat`
Expected: 1 file, `tests/form-migration-guards.test.ts`, 1 insertion and 1 deletion (replacement (2) only; with (1) as well it would be 3 and 2).

```bash
git add tests/form-migration-guards.test.ts
git commit -m "test(ui): form guard comments at the 2C end state (2C batch 5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 1 file in the commit. `git status --short src tests messages` prints nothing.

- [ ] **Step 5: Record**

Run `node --no-warnings <temp>/p2c5-guard-state.mjs` once more (the same output as Step 2) and copy the table above, with the commit hashes, into the controller's ledger for Task 12 (the DH "Guards" bullet of plan 5) and Task 13.

---

### Task 11: Verify, production build and dev-app check (controller runs this task, not an implementer)

**Files:**
- Create then delete: a configuration in the main checkout's `.claude/launch.json` (temporary; never committed)
- Evidence: `.superpowers/sdd/screenshots/ui-phase2c-plan5/after/` in the main checkout (git-ignored)
- Modify: only files needed to fix problems found here. Each fix gets its own small commit in the worktree, with a test where one is possible, through an implementer and the normal review.

**Interfaces:**
- Consumes: Tasks 1–10 committed; the Task 0 ids, before images and measurements.
- Produces: the after images and `.superpowers/sdd/<plan workspace>/task-11-findings.md`, which Task 12 turns into the "Dev-app check" bullets.

- [ ] **Step 1: Full verify.** From the worktree, run `npm run verify` (lint, tests, build). Record the test count and the build page count for Task 13. Run `node <temp>/p2c5-precheck.mjs` (or Task 10's state script): the FMG end state of Task 10.

- [ ] **Step 2: Production server.** Confirm the worktree's dev database (Task 0 Step 2). Add a configuration `asset-2c5-start-3101` to the main checkout's `.claude/launch.json` with `runtimeExecutable: "node"`, `runtimeArgs: [".worktrees/ui-phase2c-plan5/node_modules/next/dist/bin/next", "start", ".worktrees/ui-phase2c-plan5", "-p", "3101"]`, `port: 3101`, `autoPort: false`, and start it with `preview_start`. Log in with the seed admin; do not echo the password. Prefer `waitUntil: "load"` plus a short wait over `networkidle`. Playwright scripts run inline (`browser_run_code_unsafe` with `code`); if one must be a file, put it under the main checkout's `.playwright-mcp/` and delete it right after the run (`.playwright-mcp/` is linted).

- [ ] **Step 3: Writes nothing.** Every confirm and dialog is opened to its first screen and closed with its cancel button, the X or Esc. Never press a confirm, Save, delete, approve, execute or leave-without-saving; never widen a client's scopes. Count POST, PUT, PATCH and DELETE requests while doing so: 0 (read-only lookups the pages already send are listed by path).

- [ ] **Step 4: Screens.** Take every Task 0 view again under the same name in `after/` and compare (height, wrapping, truncation, lost color or shape). Then check, in Thai, at 1440, 768 and 375, plus one English pass at 1440 and 200% zoom (a 720×450 viewport):
  - **The four O11 pages:** one `ActionBar` (a named group, its items 44px or more, the disabled item not a link), shown below `md` and gone from `md`; the bottom space from `actionBarPagePadding` clears the bar and the home bar (compare Task 0 Step 9); no content under the bar; the back item where Task 2 kept it.
  - **`/th/disposal/<id>`:** the workflow is `Steps` (the current step reads as current, done steps as done; on phones one line "ขั้นที่ N จาก 3 · …").
  - **Every confirm of the batch:** the `AlertDialog` look of K12; the confirm button says its verb (the scope expansion, the two discard-selection confirms, the supplier unsaved-changes confirm, the maintenance attachment delete); cancel before the confirm; Esc and cancel close it and focus returns to the button that opened it.
  - **`/th/admin/settings`:** the tab row is `TabNav` (underlined; the current tab marked; switching tabs works with the mouse and the keyboard and keeps the form state as before).

- [ ] **Step 5: Keyboard.** Tab order in each confirm: cancel before confirm; focus starts where it did before; Esc closes; focus returns to the opener. `ActionBar` items take Tab in visual order. The settings `TabNav` takes Tab and its `onSelect` switches the panel.

- [ ] **Step 6: axe.** Inject `node_modules/axe-core/axe.min.js` (the worktree's) with `page.addScriptTag({ path })` and run `axe.run(<dialog or main>, { runOnly: ["color-contrast", "label", "aria-valid-attr-value", "aria-required-attr", "button-name", "nested-interactive"] })` on each open confirm, each O11 page at 375 (with the `ActionBar`) and the settings page. Expected: 0 violations.

- [ ] **Step 7: Forced colors and reduced motion.** With Playwright `emulateMedia`: the `ActionBar` edge, the confirm border and focus rings stay visible; the current `Steps` item and the current settings tab stay marked. Reduced motion: no slide or spin that did not stop before.

- [ ] **Step 8: NVDA and real devices.** If NVDA is not available to you, list these checks for the user and do not mark them done: the `ActionBar` group reads its name · a disabled bar item reads as unavailable · each confirm reads its title and its verb button · `Steps` reads the current step · the settings tabs read the current tab. Real iPhone and iPad: the bar clears the home bar and nothing hides under it; the confirms clear the home bar and the keyboard. With data the dev database may lack: a disposal request at each step, a repair ticket with an attachment. Add them to the open manual checks; all of them must be done before the one phase-2 deploy.

- [ ] **Step 9: Findings report.** Write `task-11-findings.md` in the plan workspace, in the shape Task 12 fills its markers from:
  - **Fixes made:** commit + one line each, or "none".
  - **Checked and passed:** what was checked, where and at which widths, with the results.
  - **Bottom space:** one line per O11 page at 375, before → after.
  - **Found but not caused by plan 5.**
  - **Accepted mixes.**
  - **Still needs a person:** the Step 8 list and anything else not checked.

- [ ] **Step 10: Clean up.** Stop the server, remove the configuration from the main checkout's `.claude/launch.json` (delete the file if nothing else is in it), and delete every helper script you put under either tree. `git status --short` in the worktree must show nothing.

---

### Task 12: Repo documentation for plan 5 (repo docs only; the controller adds the verify numbers, the rebase and the wiki in Task 13)

Spec §10.6 lists what each document holds, §3.18, §5.12, §6.12 and §7.12 list the batch-5 items, and §8.12 ends every plan with its documents; the "Handed on to 2C plan 5" bullets of the 2B plan 2, 2C plan 3, 2B plan 4 and 2C plan 4 sections of `DEVELOPER_HANDOFF.md` are the state this plan started from. Batch 5 adds one primitive (`ActionBar` with `actionBarPagePadding`), gives the confirm dialog the dialog look (K12), names every confirm's action with a verb, moves the disposal request onto `Steps` (S1) and the settings tabs onto `TabNav` (O7), and deletes the two old phone bars that `DESIGN.md` names. The handoff and the changelog get a plan 5 entry, the last of 2C. All four files are CRLF in the worktree (`i/lf w/crlf`): edit them with exact-string replacement, keep the endings, never run a formatter, and match on the quoted strings, not on line numbers (the numbers below are those at `6835bdf`; Tasks 1–11 do not touch these files).

Rulings made in this task:
- **What goes where:**
  - `DESIGN.md` (10 replacements):
    - §2 Neutral, **Soft System Background** (`:229`): the confirm dialog is white now; only its footer takes `background`.
    - §5 Buttons, **Hand-written buttons** (`:375`): the repair attachment delete dialog became `useConfirm` (Task 5), and no later 2C batch is left.
    - Dialogs, **Primitives** (`:403`): `AlertDialog` is the overlay of `useConfirm()` only (its one importer is `ui/confirm-dialog.tsx`).
    - Dialogs, **Confirmation** (`:412`): every call names its verb (Tasks 6–8, test G), and the K12 look (Task 4a).
    - Forms, **`Steps`** users (`:484`): the disposal request joined in batch 5 (Task 3).
    - Navigation, **Back button** (`:513`): which `ActionBar` keeps a back item (Task 2, R3).
    - Navigation, **Link tabs** (`:514`): the settings tabs use `onSelect` to switch in place (Task 9).
    - §6 **Do** (`:580`): `useConfirm` and `ActionBar` join the list of shared primitives.
    - §7 Adaptive UI Contract, **Bottom space** (`:620`): a new **`ActionBar`** bullet above it (Task 1), and the padding rule on `actionBarPagePadding` (Task 2).
    - §7 Adaptive UI Contract, **Two breakpoints** (`:621`): the two deleted bars become `ActionBar`.
  - `docs/14_UI_UX_DESIGN_SYSTEM.md` (6 replacements) follows `DESIGN.md`: Navigation and Action Surfaces (`:42`), the `TabNav` row (`:73`), the confirmation row (`:91`), a new `ActionBar` row after the save bar row (`:92`), the sentence under the table (`:97`) and the "Forms and dialogs" registry row (`:117`), which links this plan.
  - `DEVELOPER_HANDOFF.md` (1 replacement): a new section before `## Open Go-Live Decisions` (`:784`): what moved, the guard state after batch 5 (the end state of 2C), "2D may start once 2B plan 5 also merges", and what 2D, phase 3 and the V track inherit. No older line changes (open issue 6).
  - `docs/99_CHANGELOG.md` (2 replacements): a new `## <today>` date block on top and the Thai entry under it, shaped like the plan 4 entry.
  - **Not changed:** `.impeccable/design.json` (open issue 5) · `docs/11_FEATURE_LIST.md` (no feature row changes: batch 5 changes looks, labels, names and focus, not what a feature does; the asset detail, disposal detail, repair record detail, system settings, suppliers and Integration API rows stay true, and the settings tabs keep their `?tab=` URL and in-place switch) · `docs/07_UAT_CHECKLIST.md` (the checks that need a person go into the handoff's "Still open" here and into the wiki in Task 13) · `src/`, `tests/`, `messages/`.
- **Not written into `DESIGN.md`:** the `primary: !nextActionControl` rule of the disposal page, the two class strings of `AlertDialogContent` (R5) and the `useTranslations` read of the settings form (P2) are single cases with their reasons; the handoff records them.
- **The rulings these texts depend on:** P1 (`src/lib/design-system.ts` and `tests/audit-scan-search-ui.test.ts:188` stay for 2D), P2 (open issue 2), R3 (open issue 3), R5, R6 and R8 of Tasks 1–5, the waiting list of test G and the two commits of Task 7 (Tasks 6–8). If the controller ruled otherwise on any of them before Task 1, rewrite the matching sentence, and the literal the check script tests for it, before Step 2.
- **The guard numbers** are the live totals after Task 10 against `6835bdf`. The check script recomputes them from `tests/form-migration-guards.test.ts` (each against `git show 6835bdf:`), the `confirm()` option objects of the files that call `useConfirm()` (with test G's balanced reader), the LFG LP1 and LB1 live counts (with LFG's own patterns), and the `test(` lines of the changed test files (against the fork from `master`), and it recomputes every line number the handoff hands on from the files. If Step 3 prints other numbers (a Task 11 fix moved a line or added a test), write the printed ones and say so in the task report.
- **The findings markers** (`<from task-11-findings.md>` twice in the handoff, `<จาก task-11-findings.md>` once in the changelog) come from Task 11's `task-11-findings.md` (`.superpowers/sdd/<plan workspace>/`, the controller names its path), in the shape of the plan 4 and plan 2B-4 bullets: what was checked and where, the results (the bottom space of each O11 page at 375, before → after, from its "Bottom space" part), fixes with their commits or "none", accepted mixes, issues found but not caused by plan 5, and what still needs a person. The "Dev-app check (Task 11)" bullet is one paragraph; "Still open" becomes nested bullets when it has more than two items. Task 13 Step 1 adds its verify bullet directly above "Dev-app check (Task 11)" and "ตรวจบนแอป (Task 11)".
- **Dates:** the handoff heading and the changelog date use the day this task runs (`<today>`, Step 1). The newest changelog date at `6835bdf` is `## 2026-10-14`, with the 2C plan 4 entry on top. If the worktree already has `## <today>` (the controller rebased onto a plan 2B-5 that wrote it), skip Step 7 (1) and put the entry directly under that heading, above 2B-5's entry; the check script accepts both.
- **The plan file name:** see open issue 1.

**Files:**
- Modify: `DESIGN.md` (CRLF; 10 replacements): §2 **Soft System Background** (`:229`) · §5 Buttons, **Hand-written buttons** (`:375`) · Dialogs, **Primitives** (`:403`) and **Confirmation** (`:412`) · Forms, **`Steps`** (`:484`) · Navigation, **Back button** (`:513`) and **Link tabs** (`:514`) · §6 **Do** (`:580`) · §7 Adaptive UI Contract, **Bottom space** (`:620`, one bullet added above it) and **Two breakpoints** (`:621`)
- Modify: `docs/14_UI_UX_DESIGN_SYSTEM.md` (CRLF; 6 replacements): `:42`, the `TabNav` row (`:73`), the confirmation row (`:91`), a row added after the save bar row (`:92`), `:97`, the "Forms and dialogs" registry row (`:117`)
- Modify: `DEVELOPER_HANDOFF.md` (CRLF; 1 replacement): a new section before `## Open Go-Live Decisions` (`:784`)
- Modify: `docs/99_CHANGELOG.md` (CRLF; 2 replacements): a date block and the 2C plan 5 entry at the top (`:7`)
- Not changed: `.impeccable/design.json`, `docs/07_UAT_CHECKLIST.md`, `docs/11_FEATURE_LIST.md`, `src/`, `tests/`, `messages/`, the wiki (Task 13)
- Temp folder only, never committed: `check-docs-2c5.mjs` (Task 13 Step 2 runs it again after a rebase)

**Interfaces:**
- Consumes: Tasks 1–11 committed; `task-11-findings.md` (dev-app check, bottom space, fixes, accepted mixes, still open); `<temp>/p2c5-guard-state.mjs` from Task 10 Step 2 (Task 10 saves its script under the name Task 5 Step 8 used; if the file is missing or prints "batch 5 guard end state holds", save Task 10's text again).
- Produces:
  - `DEVELOPER_HANDOFF.md` section `## UI Round 4 Phase 2C Plan 5 Detail-Page Action Bars, Confirm Dialogs, Disposal Steps and Settings Tabs (<today>)` with a `- Dev-app check (Task 11):` bullet, and `docs/99_CHANGELOG.md` entry `### แถบปุ่มบนมือถือของหน้ารายละเอียด dialog ยืนยัน ขั้นตอนตัดจำหน่าย และแท็บตั้งค่า (UI รอบ 4 เฟส 2C plan 5)` with a `- **ตรวจบนแอป (Task 11):**` bullet. Task 13 Step 1 adds its verify bullet directly above each.
  - The hand-off that 2D reads (the end state of the form guard, what stays on purpose with line numbers, P1's helper and pin, the LFG rows left above their live counts), and what phase 3 and the V track inherit.
  - `<temp>/check-docs-2c5.mjs`.

- [ ] **Step 1: Check the base**

Run: `git diff --quiet 6835bdf HEAD -- DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md .impeccable/design.json docs/07_UAT_CHECKLIST.md docs/11_FEATURE_LIST.md && echo DOCS-UNCHANGED`
Expected: `DOCS-UNCHANGED` (Tasks 1–11 did not touch them; if a Task 11 fix did, re-read the quoted strings below against the file).

Run: `git ls-files --eol DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md`
Expected: `i/lf    w/crlf` for all four.

Run: `ls docs/superpowers/plans/2026-10-15-ui-phase2c-plan5.md`, then read the `task-11-findings.md` the controller names.
Expected: the plan file exists (the docs link it; if it has another name, see open issue 1), and the findings have the six parts of Task 11 Step 9.

Run: `git status --short src tests messages`
Expected: nothing.

Run: `node --no-warnings <temp>/p2c5-guard-state.mjs`
Expected (exit 0), the end state of batch 5 that Steps 6 and 7 describe:
```
LOCAL_FIELD: 0 entries, 0
RAW_FIELDS: 2 entries, 3
FIELD_CLASS_STRINGS: 0 entries, 0
OLD_MARKUP: 0 entries, 0
LOADER2: 10 entries, 13
OLD_HELPERS: 0 entries, 0
REVERSE: 0 entries, 0
CLOSE_LABEL_IS_CANCEL: 0 entries, 0
FIXED_BOTTOM_BARS: 2 entries, 2
CONSTRAINT_FLOORS: 38 entries
BATCH_FILES: 64 files (batch 5: disposal/disposal-workflow-stepper.tsx, ui/alert-dialog.tsx, ui/confirm-dialog.tsx)
MIGRATED_FILES: 64 (every 2C file)
PENDING_FOOTER_PARTS: 0
confirm(): 15 options in 12 files, 0 without confirmLabel
tests/form-migration-guards.test.ts: CRLF
2C holds only what it keeps (batch 5 end state)
```

Run: `node -e "console.log(new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }))"`
Expected: a date such as `2026-10-15`. This is `<today>` in Steps 6 and 7: replace every `<today>` below with it.

- [ ] **Step 2: Write the check script (it fails first).** Save as `check-docs-2c5.mjs` in your temp folder:

```js
// check-docs-2c5.mjs: run from the worktree root. Checks the plan 2C-5 docs edits of Task 12, and that the guard numbers
// and line numbers they give are the ones in the files now (the base numbers come from `git show 6835bdf:`).
// Reads only. Never commit this file. Optional argument: the base commit (default 6835bdf).
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"

const BASE = process.argv[2] ?? "6835bdf"
const PLAN = "docs/superpowers/plans/2026-10-15-ui-phase2c-plan5.md"
const PLAN_NAME = PLAN.slice("docs/superpowers/plans/".length)
const files = ["DESIGN.md", "docs/14_UI_UX_DESIGN_SYSTEM.md", "DEVELOPER_HANDOFF.md", "docs/99_CHANGELOG.md"]
const lf = (value) => value.replace(/\r\n/g, "\n")
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
const show = (path) => lf(git("show", `${BASE}:${path}`))
const raw = Object.fromEntries(files.map((path) => [path, readFileSync(path, "utf8")]))
const text = Object.fromEntries(files.map((path) => [path, lf(raw[path])]))
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

// The form guard now and at the base (tests/form-migration-guards.test.ts, FMG).
const fmgNow = lf(readFileSync("tests/form-migration-guards.test.ts", "utf8"))
const fmgBase = show("tests/form-migration-guards.test.ts")
const block = (guard, name) => new RegExp(`^const ${name}\\b[\\s\\S]*?^[}\\]]`, "m").exec(guard)?.[0] ?? ""
const rows = (guard, name) => [...block(guard, name).matchAll(/^\s+\[`\$\{C\}([^`]+)`\]: (\[[^\]]*\]|\d+)/gm)].map((match) => ({ path: match[1], value: match[2] }))
const listed = (guard, name) => [...block(guard, name).matchAll(/^\s+`\$\{C\}([^`]+)`,/gm)].map((match) => match[1])
const sum = (list) => list.reduce((total, row) => total + Number(row.value), 0)
const batchFiles = (guard) => [...guard.matchAll(/^\s+"[0-9a-g]+": \[([^\]]*)\]/gm)].flatMap((match) => [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]))
const plural = (n) => `${n} ${n === 1 ? "file" : "files"}`
const budget = (name) => {
  const was = rows(fmgBase, name)
  const now = rows(fmgNow, name)
  return [was, now]
}
const [barsWas, barsNow] = budget("FIXED_BOTTOM_BARS")
const [fieldsWas, fieldsNow] = budget("RAW_FIELDS")
const [loadersWas, loadersNow] = budget("LOADER2")
const migrated = [listed(fmgBase, "MIGRATED_FILES"), listed(fmgNow, "MIGRATED_FILES")]
const pending = [listed(fmgBase, "PENDING_FOOTER_PARTS"), listed(fmgNow, "PENDING_FOOTER_PARTS")]
const batches = [batchFiles(fmgBase), batchFiles(fmgNow)]
const floors = [rows(fmgBase, "CONSTRAINT_FLOORS"), rows(fmgNow, "CONSTRAINT_FLOORS")]
const emptied = ["LOCAL_FIELD", "FIELD_CLASS_STRINGS", "OLD_MARKUP", "OLD_HELPERS", "REVERSE", "CLOSE_LABEL_IS_CANCEL"]

// Every confirm() option object in the files that call useConfirm() (the reader of tests/confirm-dialog-ui.test.ts G).
const balanced = (value, from, open, close) => {
  let depth = 0
  for (let index = from; index < value.length; index += 1) {
    if (value[index] === open) depth += 1
    else if (value[index] === close && --depth === 0) return value.slice(from, index + 1)
  }
  return ""
}
const confirmState = (ref) => {
  const paths = (ref ? git("grep", "-l", "-F", "useConfirm()", ref, "--", "src") : git("grep", "-l", "-F", "useConfirm()", "--", "src"))
    .split("\n").filter(Boolean).map((line) => (ref ? line.slice(ref.length + 1) : line))
    .filter((path) => path !== "src/components/ui/confirm-dialog.tsx" && /\.tsx?$/.test(path))
  const options = paths.flatMap((path) => {
    const source = lf(ref ? git("show", `${ref}:${path}`) : readFileSync(path, "utf8"))
    return [...source.matchAll(/(?<![\w.$])confirm\(/g)].flatMap((call) => {
      const argument = balanced(source, call.index + call[0].length - 1, "(", ")")
      return [...argument.matchAll(/\{\s*title:/g)].map((object) => ({ path, text: balanced(argument, object.index, "{", "}") }))
    })
  })
  const files = new Set(options.map((option) => option.path)).size
  return { options: options.length, files, unnamed: options.filter((option) => !/\bconfirmLabel:/.test(option.text)).length }
}
const confirms = [confirmState(BASE), confirmState("")]

// The list guard's LP1 and LB1 live counts (tests/list-frame-guards.test.ts, LFG, 2B's file), read the way it reads them.
const D = "src/app/[locale]/(dashboard)/"
const live = (ref, literal, pattern, keep) =>
  (ref ? git("grep", "-l", "-F", literal, ref, "--", "src") : git("grep", "-l", "-F", literal, "--", "src"))
    .split("\n").filter(Boolean).map((line) => (ref ? line.slice(ref.length + 1) : line))
    .filter((path) => /\.tsx?$/.test(path) && keep(path))
    .reduce((total, path) => total + (lf(ref ? git("show", `${ref}:${path}`) : readFileSync(path, "utf8")).match(pattern) ?? []).length, 0)
const lp1 = [BASE, ""].map((ref) => live(ref, "pb-", /\bpb-(?:24|36)\b/g, (path) => path.startsWith(D)))
const lb1 = [BASE, ""].map((ref) => live(ref, "<ArrowLeft", /<ArrowLeft\b/g, (path) => path !== "src/components/ui/page-header.tsx"))

// Tests this plan added: test( lines now minus at the fork from master, over the test files that changed. The fork is
// 6835bdf until the branch rebases; after a rebase onto 2B-5 it is master, so 2B-5's own tests do not count.
const FORK = git("merge-base", "master", "HEAD").trim()
const changedTests = git("diff", "--name-only", FORK, "--", "tests").split("\n").filter((path) => /^tests\/.*\.test\.(?:ts|mjs|js)$/.test(path))
const tests = (value) => (value.match(/^test\(/gm) ?? []).length
const added = changedTests.reduce((total, path) => total + (existsSync(path) ? tests(readFileSync(path, "utf8")) : 0) - (git("ls-tree", "--name-only", FORK, path).trim() ? tests(lf(git("show", `${FORK}:${path}`))) : 0), 0)

// Line numbers the handoff gives, read from the files now.
const C = "src/components/"
const lines = (path) => lf(readFileSync(path.startsWith("src/") || path.startsWith("tests/") ? path : C + path, "utf8")).split("\n")
const lineOf = (path, literal) => lines(path).findIndex((row) => row.includes(literal)) + 1
const at = (path, literal) => `\`${path}:${lineOf(path, literal)}\``
const helperStart = lineOf("src/lib/design-system.ts", "export function getMobileSafeBottomPaddingClasses()")
const helperEnd = helperStart + lines("src/lib/design-system.ts").slice(helperStart - 1).findIndex((row) => row === "}")
const handedOn = [
  `the audit round page keeps its back item \`D/audit/rounds/[id]/page.tsx:${lineOf(`${D}audit/rounds/[id]/page.tsx`, '{ href: returnToHref, label: tCommon("back"), icon: <ArrowLeft')}\``,
  `(\`tests/form-migration-guards.test.ts:${lineOf("tests/form-migration-guards.test.ts", "// Phase 2D widens every guard to all of src")}\`)`,
  `the repair attachment delete button's ${at("maintenance/maintenance-attachments.tsx", "<Loader2")}`,
  `the register's phone bulk-action bar ${at("assets/asset-register-table.tsx", 'className="fixed inset-x-3 bottom-[calc(5.25rem')}`,
  `the bar's own string ${at("ui/action-bar.tsx", 'className="fixed inset-x-0 bottom-0')}`,
  `\`getMobileSafeBottomPaddingClasses()\` \`src/lib/design-system.ts:${helperStart}-${helperEnd}\``,
  `\`tests/audit-scan-search-ui.test.ts:${lineOf("tests/audit-scan-search-ui.test.ts", "assert.match(designSystem, /pb-\\[calc\\(6rem")}\` pins its class string`,
  `The disposal stepper's panel ${at("disposal/disposal-workflow-stepper.tsx", '<section className="rounded-lg border border-border bg-surface p-4 sm:p-5">')}`,
]
const guardFragments = [
  `\`MIGRATED_FILES\` ${migrated[0].length} → ${migrated[1].length}`,
  `(\`BATCH_FILES\` ${batches[0].length} → ${batches[1].length} files`,
  `\`PENDING_FOOTER_PARTS\` ${pending[0].length} → ${pending[1].length}`,
  `\`CONSTRAINT_FLOORS\` (${floors[1].length} files) does not move`,
  `\`FIXED_BOTTOM_BARS\` ${sum(barsWas)} in ${plural(barsWas.length)} → ${sum(barsNow)} in ${barsNow.length}`,
  `\`RAW_FIELDS\` ${sum(fieldsNow)} in ${plural(fieldsNow.length)} and \`LOADER2\` ${sum(loadersNow)} in ${plural(loadersNow.length)} do not move`,
  `${confirms[1].options} option objects in ${confirms[1].files} files, ${confirms[1].unnamed === 0 ? "none" : confirms[1].unnamed} without \`confirmLabel\` (${confirms[0].options} in ${confirms[0].files} files, ${confirms[0].unnamed} without, at \`${BASE}\`)`,
  `LP1 ${lp1[0]} → ${lp1[1]} (the four roots) and LB1 ${lb1[0]} → ${lb1[1]} (the repair page's bar)`,
  `\`RAW_FIELDS\` ${sum(fieldsNow)} (the label print toolbar`,
  `\`LOADER2\` ${sum(loadersNow)} in ${plural(loadersNow.length)} (spinners outside buttons`,
  `\`FIXED_BOTTOM_BARS\` ${sum(barsNow)} (the register's`,
  `${added} tests in all`,
]
const HANDOFF = "## UI Round 4 Phase 2C Plan 5 Detail-Page Action Bars, Confirm Dialogs, Disposal Steps and Settings Tabs ("
const handoff = section("DEVELOPER_HANDOFF.md", HANDOFF)
const missing = [...handedOn, ...guardFragments, `plan \`${PLAN}\``].filter((fragment) => !handoff.includes(fragment))
const date = /^## UI Round 4 Phase 2C Plan 5 [^\n(]*\((\d{4}-\d{2}-\d{2})\)$/m.exec(text["DEVELOPER_HANDOFF.md"])?.[1] ?? "none"
const ENTRY = "### แถบปุ่มบนมือถือของหน้ารายละเอียด dialog ยืนยัน ขั้นตอนตัดจำหน่าย และแท็บตั้งค่า (UI รอบ 4 เฟส 2C plan 5)"
const entry = (() => {
  const start = text["docs/99_CHANGELOG.md"].indexOf(ENTRY)
  if (start < 0) return ""
  const end = text["docs/99_CHANGELOG.md"].indexOf("\n### ", start + ENTRY.length)
  const stop = text["docs/99_CHANGELOG.md"].indexOf("\n---\n", start + ENTRY.length)
  const cut = [end, stop].filter((value) => value >= 0)
  return text["docs/99_CHANGELOG.md"].slice(start, cut.length ? Math.min(...cut) : undefined)
})()
const entryFragments = [
  `\`MIGRATED_FILES\` ${migrated[0].length} → ${migrated[1].length}`,
  `\`BATCH_FILES\` ${batches[0].length} → ${batches[1].length} ไฟล์`,
  `\`PENDING_FOOTER_PARTS\` ${pending[0].length} → ${pending[1].length}`,
  `\`FIXED_BOTTOM_BARS\` ${sum(barsWas)} → ${sum(barsNow)}`,
  `\`confirm()\` ${confirms[1].options} จุดใน ${confirms[1].files} ไฟล์มีคำกริยาครบ`,
  `LP1 ${lp1[0]} → ${lp1[1]} และ LB1 ${lb1[0]} → ${lb1[1]}`,
  `รวม ${added} test`,
]
const missingEntry = entryFragments.filter((fragment) => !entry.includes(fragment))

const BATCH5 = ["disposal/disposal-workflow-stepper.tsx", "ui/alert-dialog.tsx", "ui/confirm-dialog.tsx"]
const checks = {
  "every file is CRLF only": files.every((path) => !/(^|[^\r])\n/.test(raw[path])),
  "no <today> or findings marker is left": files.every((path) => none(path, "<today>", "<from task-11-findings.md>", "<จาก task-11-findings.md>")),
  "the plan file the docs link exists": existsSync(PLAN),
  "the guard files hold what the docs say":
    BATCH5.every((path) => migrated[1].includes(path)) && batches[1].every((path) => migrated[1].includes(path)) &&
    pending[1].length === 0 && /^const PENDING_FOOTER_PARTS = new Set<string>\(/m.test(fmgNow) &&
    block(fmgBase, "CONSTRAINT_FLOORS") === block(fmgNow, "CONSTRAINT_FLOORS") &&
    barsNow.map((row) => `${row.path} ${row.value}`).sort().join(", ") === "assets/asset-register-table.tsx 1, ui/action-bar.tsx 1" &&
    block(fmgBase, "RAW_FIELDS") === block(fmgNow, "RAW_FIELDS") && sum(loadersWas) === sum(loadersNow) &&
    emptied.every((name) => rows(fmgNow, name).length === 0) &&
    !existsSync(`${C}ui/mobile-action-bar.tsx`) && !existsSync(`${C}disposal/disposal-mobile-action-bar.tsx`) &&
    confirms[1].unnamed === 0 && lp1[1] === 0,
  "DESIGN.md: the confirm dialog's footer band and look, and every confirm names its verb":
    once("DESIGN.md", "Dialog footers (`AccessibleDialogFooter`, and `AlertDialogFooter` of the confirm dialog since phase 2C plan 5); ", "`AlertDialog` (only through `useConfirm()`) for a yes-or-no question", "never the \"ยืนยัน\" it falls back to: since phase 2C plan 5 every call passes one, and `tests/confirm-dialog-ui.test.ts` fails on a call without it. The confirm dialog (`AlertDialog`) has the dialog look (phase 2C ruling K12)") &&
    none("DESIGN.md", "until phase 2C batch 5 restyles it", "4 calls still lack one until phase 2C batch 5", "which batch 5 turns into `useConfirm`"),
  "DESIGN.md: Steps users, the back items and the settings tabs":
    once("DESIGN.md", "and the disposal request (batch 5, \"ยื่นคำขอ\", \"พิจารณา\", \"ตัดจำหน่ายจริง\":", "An `ActionBar` has a back item only where the header has no back button (`/audit/rounds/[id]`)", "the 11 tabs of the settings page call `event.preventDefault()` and switch in place through `history.replaceState`") &&
    none("DESIGN.md", "the disposal request follows in batch 5.", "the back items of mobile action bars use the same left arrow"),
  "DESIGN.md: ActionBar and actionBarPagePadding in the Adaptive UI Contract":
    once("DESIGN.md", "- **`ActionBar`** (`src/components/ui/action-bar.tsx`, server-safe, phase 2C ruling K23)", "Only a page with its own `ActionBar` pads its root, with `actionBarPagePadding`", "the page's own action bar (`ActionBar` is `md:hidden`)", "`StickyFormFooter` and `ActionBar`, `ChoiceCard`") &&
    none("DESIGN.md", "`MobileActionBar`", "`DisposalMobileActionBar`", "until phase 2C plan 5 moves them to `actionBarPagePadding`"),
  "docs/14: plan 5 in the registry, ActionBar, the confirm and the tabs":
    once("docs/14_UI_UX_DESIGN_SYSTEM.md", `[\`${PLAN_NAME}\`](superpowers/plans/${PLAN_NAME}) sequences plan 5 (batch 5, the last:`, "| A phone action bar on a detail page | `ActionBar`, with `actionBarPagePadding` on the page root |", "`confirmLabel` is a verb, never \"ยืนยัน\" (a test checks every call)", "a client page may cancel the navigation in `onSelect` and switch in place (the settings tabs) |", "renders its own `ActionBar`, with `actionBarPagePadding` (the four", "(and plan 5 `ActionBar`)") &&
    none("docs/14_UI_UX_DESIGN_SYSTEM.md", "plan 5 follows. |", "| `confirmLabel` is a verb |"),
  "handoff: the 2C plan 5 section after 2C plan 4 and before Open Go-Live Decisions, with its bullets":
    count("DEVELOPER_HANDOFF.md", HANDOFF) === 1 &&
    before("DEVELOPER_HANDOFF.md", "## UI Round 4 Phase 2C Plan 4 Admin, Asset and Login Forms and Dialogs (", HANDOFF) &&
    before("DEVELOPER_HANDOFF.md", HANDOFF, "## Open Go-Live Decisions") &&
    ["- **2D may start once 2B plan 5 also merges**", "- **Deploy:**", "- **What changed in each file:**", "- **The files shared with 2B:**", "- **Messages:**", "- **Guards**", "- **Tests:**", "- **Rulings of this plan**", "- **Accepted:**", "- **Handed on to 2D and the V track:**", "- Dev-app check (Task 11):", "- Before/after screenshots:", "- Still open, for a person before the one phase-2 deploy:", "- Next:"].every((literal) => handoff.split(`\n${literal}`).length === 2),
  "handoff: the guard numbers and line numbers are the live ones": missing.length === 0,
  "changelog: the 2C plan 5 entry first under the handoff's date, above the 2C plan 4 entry":
    once("docs/99_CHANGELOG.md", ENTRY) && entry.split("\n- **ตรวจบนแอป (Task 11):**").length === 2 && missingEntry.length === 0 &&
    text["docs/99_CHANGELOG.md"].includes(`\n## ${date}\n\n${ENTRY}\n`) &&
    before("docs/99_CHANGELOG.md", ENTRY, "### ฟอร์มและ dialog ชุดที่เหลือของผู้ดูแลระบบ ทรัพย์สิน และหน้าเข้าสู่ระบบ (UI รอบ 4 เฟส 2C plan 4)"),
}
let failed = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}`)
  if (!ok) failed += 1
}
if (missing.length) console.log(`the handoff section lacks these live fragments:\n${missing.join("\n")}`)
if (missingEntry.length) console.log(`the changelog entry lacks these live fragments:\n${missingEntry.join("\n")}`)
process.exit(failed ? 1 : 0)
```

- [ ] **Step 3: Run it**

Run: `node <temp>/check-docs-2c5.mjs`
Expected: exit 1. `ok` on the first four lines ("every file is CRLF only", "no <today> or findings marker is left", "the plan file the docs link exists", "the guard files hold what the docs say") and `FAIL` on the other seven, then the fragments Steps 6 and 7 write:
```
ok   every file is CRLF only
ok   no <today> or findings marker is left
ok   the plan file the docs link exists
ok   the guard files hold what the docs say
FAIL DESIGN.md: the confirm dialog's footer band and look, and every confirm names its verb
FAIL DESIGN.md: Steps users, the back items and the settings tabs
FAIL DESIGN.md: ActionBar and actionBarPagePadding in the Adaptive UI Contract
FAIL docs/14: plan 5 in the registry, ActionBar, the confirm and the tabs
FAIL handoff: the 2C plan 5 section after 2C plan 4 and before Open Go-Live Decisions, with its bullets
FAIL handoff: the guard numbers and line numbers are the live ones
FAIL changelog: the 2C plan 5 entry first under the handoff's date, above the 2C plan 4 entry
the handoff section lacks these live fragments:
the audit round page keeps its back item `D/audit/rounds/[id]/page.tsx:496`
(`tests/form-migration-guards.test.ts:21`)
the repair attachment delete button's `maintenance/maintenance-attachments.tsx:210`
the register's phone bulk-action bar `assets/asset-register-table.tsx:473`
the bar's own string `ui/action-bar.tsx:43`
`getMobileSafeBottomPaddingClasses()` `src/lib/design-system.ts:112-114`
`tests/audit-scan-search-ui.test.ts:188` pins its class string
The disposal stepper's panel `disposal/disposal-workflow-stepper.tsx:51`
`MIGRATED_FILES` 61 → 64
(`BATCH_FILES` 66 → 64 files
`PENDING_FOOTER_PARTS` 1 → 0
`CONSTRAINT_FLOORS` (38 files) does not move
`FIXED_BOTTOM_BARS` 3 in 3 files → 2 in 2
`RAW_FIELDS` 3 in 2 files and `LOADER2` 13 in 10 files do not move
15 option objects in 12 files, none without `confirmLabel` (14 in 11 files, 4 without, at `6835bdf`)
LP1 4 → 0 (the four roots) and LB1 7 → 6 (the repair page's bar)
`RAW_FIELDS` 3 (the label print toolbar
`LOADER2` 13 in 10 files (spinners outside buttons
`FIXED_BOTTOM_BARS` 2 (the register's
8 tests in all
plan `docs/superpowers/plans/2026-10-15-ui-phase2c-plan5.md`
the changelog entry lacks these live fragments:
`MIGRATED_FILES` 61 → 64
`BATCH_FILES` 66 → 64 ไฟล์
`PENDING_FOOTER_PARTS` 1 → 0
`FIXED_BOTTOM_BARS` 3 → 2
`confirm()` 15 จุดใน 12 ไฟล์มีคำกริยาครบ
LP1 4 → 0 และ LB1 7 → 6
รวม 8 test
```
If "the guard files hold what the docs say" fails, or a fragment differs (a Task 11 fix moved a line, a row or a test), stop and report it before editing: Steps 4, 6 and 7 then use the printed numbers in place of the ones below.

- [ ] **Step 4: `DESIGN.md` (10 replacements)**

(1) §2 Colors, Neutral, **Soft System Background** (`:229`). Replace (the string ends at the semicolon; the space and text after it stay):

```
Dialog footers (`AccessibleDialogFooter`) and, until phase 2C batch 5 restyles it, the whole confirm dialog (`AlertDialog` behind `useConfirm`);
```

with:

```
Dialog footers (`AccessibleDialogFooter`, and `AlertDialogFooter` of the confirm dialog since phase 2C plan 5);
```

(2) §5 Components, Buttons, **Hand-written buttons** (`:375`). Replace the start of the line:

```
- **Hand-written buttons** keep their own classes until 2B, the later 2C batches and 2D move them; phase 2C batch 1 moved the form and dialog buttons of its 26 files (all but the repair attachment delete dialog, which batch 5 turns into `useConfirm`).
```

with:

```
- **Hand-written buttons** keep their own classes until 2B and 2D move them; phase 2C batch 1 moved the form and dialog buttons of its 26 files (all but the repair attachment delete dialog, which batch 5 turned into `useConfirm`).
```

The line goes on unchanged ("Pick the size from today's desktop height: …").

(3) Dialogs, Menus and Confirmation, **Primitives** (`:403`). Replace:

```
`AccessibleDialog` for forms and reviews, `Sheet` for side drawers
```

with:

```
`AccessibleDialog` for forms and reviews, `AlertDialog` (only through `useConfirm()`) for a yes-or-no question, `Sheet` for side drawers
```

(`git grep -l "ui/alert-dialog\"" -- src` prints only `src/components/ui/confirm-dialog.tsx`.)

(4) Dialogs, Menus and Confirmation, **Confirmation** (`:412`). Replace the end of the line:

```
`confirmLabel` names the action with a verb ("ลบ", "ละทิ้ง"), not "ยืนยัน"; 4 calls still lack one until phase 2C batch 5, which also gives the confirm dialog the `AccessibleDialog` look. On phones it already stacks Cancel above the action.
```

with:

```
`confirmLabel` names the action with a verb ("ลบ", "เพิ่มสิทธิ์", "ละทิ้งรายการที่เลือก", "ออกโดยไม่บันทึก"), never the "ยืนยัน" it falls back to: since phase 2C plan 5 every call passes one, and `tests/confirm-dialog-ui.test.ts` fails on a call without it. The confirm dialog (`AlertDialog`) has the dialog look (phase 2C ruling K12): a white box with 12px corners and `shadow-overlay`, 12px above the bottom edge and the iPhone home bar on phones, centered and at most 512px wide from `sm`; a header with the 16px semibold title, left-aligned, the 14px `muted-foreground` description and a bottom line; then the footer band (`background`) with Cancel first, stacked full width on phones and a right-aligned row from `sm`. It has no body and no X: Cancel and Escape close it, focus starts on Cancel and returns to the button that asked.
```

(The look is `ui/alert-dialog.tsx` after Task 4a; Radix focuses `AlertDialogCancel` on open, and `ui/confirm-dialog.tsx:74-83` returns focus to the element that was focused or to `returnFocusRef`.)

(5) §5 Forms: Save Bar, Steps, Sections and Signature, **`Steps`** (`:484`). Replace the line:

```
  - Users: the component install flow (batch 1) and the import wizard (batch 4, where a finished import shows every step done); the disposal request follows in batch 5.
```

with:

```
  - Users: the component install flow (batch 1), the import wizard (batch 4, where a finished import shows every step done) and the disposal request (batch 5, "ยื่นคำขอ", "พิจารณา", "ตัดจำหน่ายจริง": a request that can be opened has been filed, so a pending one is at the decision, an approved one at the disposal, a rejected one stops at the decision with an X, and a disposed one shows every step done). `DisposalWorkflowStepper` is the adapter that turns the request's stage into these states.
```

(6) §5 Navigation, **Back button** (`:513`). Replace the end of the line:

```
Pages that had a back button keep it, forms that had none get none, and the back items of mobile action bars use the same left arrow (guard LB1: no hand-placed `ArrowLeft`).
```

with:

```
Pages that had a back button keep it, and forms that had none get none. An `ActionBar` has a back item only where the header has no back button (`/audit/rounds/[id]`), with the same left arrow (guard LB1: no hand-placed `ArrowLeft`); the bar of `/maintenance/[id]` dropped its back item in 2C plan 5.
```

(7) §5 Navigation, **Link tabs** (`:514`). Replace:

```
`onSelect` (client callers only) can cancel a navigation.
```

with:

```
`onSelect` (client callers only) can cancel a navigation: the 11 tabs of the settings page call `event.preventDefault()` and switch in place through `history.replaceState`, so unsaved edits stay, and Ctrl+click still opens a tab's own URL (2C plan 5).
```

The line goes on unchanged ("State that does not change the URL uses `Segmented` instead.").

(8) §6 Do's and Don'ts, the first **Do** (`:580`). Replace:

```
the dialog parts (`AccessibleDialogBody`, `AccessibleDialogFooter`, `AccessibleDialogCancel`), `StickyFormFooter`, `ChoiceCard`
```

with:

```
the dialog parts (`AccessibleDialogBody`, `AccessibleDialogFooter`, `AccessibleDialogCancel`) and `useConfirm`, `StickyFormFooter` and `ActionBar`, `ChoiceCard`
```

(9) §7 Adaptive UI Contract, **Bottom space** (`:620`). Replace the whole line:

```
- **Bottom space:** the dashboard shell leaves room for Mobile Field Navigation while it shows (`pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:pb-0` in `src/components/layout/dashboard-shell.tsx`), so a page in navigation mode adds no bottom padding of its own. Only a page with its own action bar pads its root: the four focus-task pages `/assets/[id]`, `/audit/rounds/[id]` and `/maintenance/[id]` (`pb-24 md:pb-0`) and `/disposal/[id]` (`pb-36 md:pb-0`), until phase 2C plan 5 moves them to `actionBarPagePadding`. Guard LP1 keeps `pb-24` and `pb-36` to those four; plans 2B-2 and 2B-4 took the doubled padding off the disposal batch, employee, supplier and my-asset pages.
```

with these two lines:

```
- **`ActionBar`** (`src/components/ui/action-bar.tsx`, server-safe, phase 2C ruling K23): the page-owned action bar of the four detail pages below `md`. It is fixed to the bottom of the screen on `bg-surface` with a `border-t` and the home-bar padding (`pb-[max(0.75rem,env(safe-area-inset-bottom))]`), its row centered and at most 512px wide, and it is a `role="group"` named by its required `label` (`tCommon("actions")`, "การดำเนินการ"). It holds up to four links in one row, or three under a full-width `primaryAction` (the next step of a disposal request). Each link is `buttonVariants({ size: "sm" })`, so 44px with 13/20 text: `outline`, or `default` when the link sets `primary`. An item that cannot run now is `<a role="link" aria-disabled="true">` without `href`, in the disabled look, so a screen reader reads an unavailable link. The ⋯ layout of the mockup waits for phase 3.
- **Bottom space:** the dashboard shell leaves room for Mobile Field Navigation while it shows (`pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:pb-0` in `src/components/layout/dashboard-shell.tsx`), so a page in navigation mode adds no bottom padding of its own. Only a page with its own `ActionBar` pads its root, with `actionBarPagePadding` from the same file and in the same commit as the bar: `.single` (`pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0`) on `/assets/[id]`, `/audit/rounds/[id]` and `/maintenance/[id]`, and `.withPrimary` (9rem) on `/disposal/[id]`, whose bar puts the next step above its links. The room is the bar's height plus the iPhone home bar; until 2C plan 5 it was `pb-24` / `pb-36`, which left the home bar out. Guard LP1 keeps `pb-24` and `pb-36` off the pages under the shell (none is left); plans 2B-2 and 2B-4 took the doubled padding off the disposal batch, employee, supplier and my-asset pages.
```

(`ActionBar` and `actionBarPagePadding` are `src/components/ui/action-bar.tsx` after Task 1; `getMobileActionGridClass` gives one row of up to 4 columns.)

(10) §7 Adaptive UI Contract, **Two breakpoints** (`:621`). Replace:

```
the page's own action bar (`MobileActionBar` and `DisposalMobileActionBar` are `md:hidden`)
```

with:

```
the page's own action bar (`ActionBar` is `md:hidden`)
```

- [ ] **Step 5: `docs/14_UI_UX_DESIGN_SYSTEM.md` (6 replacements)**

(1) Navigation and Action Surfaces, the safe-area bullet (`:42`). Replace:

```
and a page pads its own root only when it renders its own action bar (the four focus-task pages
```

with:

```
and a page pads its own root only when it renders its own `ActionBar`, with `actionBarPagePadding` (the four focus-task pages
```

(2) Shared Components, the `TabNav` row ("Tabs that change the URL", `:73`). Replace:

```
; state that does not change the URL uses `Segmented` |
```

with:

```
; state that does not change the URL uses `Segmented`; a client page may cancel the navigation in `onSelect` and switch in place (the settings tabs) |
```

(3) Shared Components, the confirmation row (`:91`). Replace the whole row:

```
| A confirmation | `useConfirm()` | `confirmLabel` is a verb |
```

with:

```
| A confirmation | `useConfirm()` | `confirmLabel` is a verb, never "ยืนยัน" (a test checks every call); `tone: "destructive"` for a delete, whose toast then says "ลบแล้ว"; it opens the one `AlertDialog`, which has the dialog look and no X |
```

(4) Shared Components, after the save bar row (`:92`). Replace the row:

```
| A save bar for a long form | `StickyFormFooter` | the last child of the `<form>`; on focus-task routes only |
```

with these two rows:

```
| A save bar for a long form | `StickyFormFooter` | the last child of the `<form>`; on focus-task routes only |
| A phone action bar on a detail page | `ActionBar`, with `actionBarPagePadding` on the page root | `label={tCommon("actions")}`; up to 4 links, or 3 under a `primaryAction`; a link is primary only through its `primary` flag; the bar and the root padding change in the same commit; below `md` only |
```

(5) The sentence under the table (`:97`). Replace:

```
phase 2C plan 1 added the form and dialog pieces, and phase 2B plan 1
```

with:

```
phase 2C plan 1 added the form and dialog pieces (and plan 5 `ActionBar`), and phase 2B plan 1
```

(6) Current-Surface Registry, the "Forms and dialogs" row (`:117`). Replace the end of the row:

```
run after plan 2B-4); plan 5 follows. |
```

with:

```
run after plan 2B-4); [`2026-10-15-ui-phase2c-plan5.md`](superpowers/plans/2026-10-15-ui-phase2c-plan5.md) sequences plan 5 (batch 5, the last: `ActionBar` and its page padding on the four detail pages, the disposal request on `Steps`, the confirm dialog's look and verbs, the repair attachment delete on `useConfirm` and the settings tabs on `TabNav`, run beside plan 2B-5). |
```

- [ ] **Step 6: `DEVELOPER_HANDOFF.md` (1 replacement)**

The new section. Replace the line `## Open Go-Live Decisions` (the only one) with the block below, which ends with that same line. Replace `<today>` with the date of Step 1. Write the two `<from task-11-findings.md>` markers from `task-11-findings.md` as the rulings say. If Step 3 printed other numbers, use its fragments in the "Guards", "Tests" and "Handed on" bullets and the back-item sentence.

```
## UI Round 4 Phase 2C Plan 5 Detail-Page Action Bars, Confirm Dialogs, Disposal Steps and Settings Tabs (<today>)

- Branch `feat/ui-phase2c-plan5` (from `master` `6835bdf`: 2A, 2C plans 1–4 and 2B plans 1–4 merged, not deployed), built in the git worktree `.worktrees/ui-phase2c-plan5` while plan 2B-5 ran in the main checkout. Spec `docs/superpowers/specs/2026-10-11-ui-phase2c-design.md` §8.9 batch 5 (its §10 rulings I1–I36 override the section files) · plan `docs/superpowers/plans/2026-10-15-ui-phase2c-plan5.md` · canonical values in `DESIGN.md`. Batch 5 is the last of 2C.
  - Batch 5 crosses domains: one `ActionBar` (`ui/action-bar.tsx`, new) for the phone bars of `D/assets/[id]/page.tsx`, `D/maintenance/[id]/page.tsx`, `D/disposal/[id]/page.tsx` and `D/audit/rounds/[id]/page.tsx` (O11; `ui/mobile-action-bar.tsx` and `disposal/disposal-mobile-action-bar.tsx` are deleted); `disposal/disposal-workflow-stepper.tsx` on `Steps` (S1); `ui/alert-dialog.tsx` with the dialog look (K12; `ui/confirm-dialog.tsx` needed no change); `maintenance/maintenance-attachments.tsx` on `useConfirm`; a verb on the 4 confirms that still said "ยืนยัน" (`admin/IntegrationClientManager.tsx`, `disposal/disposal-bulk-approval.tsx`, `disposal/disposal-bulk-execution.tsx`, `master-data/supplier-form.tsx`); and the settings tab row of `admin/system-settings-form.tsx` on `TabNav` (O7).
  - Commits: `ActionBar` alone (Task 1); the swap in one commit, the two old bars deleted together with the four pages' bars, root padding and the tests that read them (Task 2); then one per file (Tasks 3–9; `alert-dialog.tsx` and `confirm-dialog.tsx` apart in Task 4, the two bulk confirms apart in Task 7), each with the page line and message keys its own type needs (`D/disposal/[id]/page.tsx` in Task 3, `D/admin/integrations/page.tsx` in Task 6, one line of `D/disposal/page.tsx` in each part of Task 7); and the guard comments (Task 10).
  - No new workflow, page, schema, RBAC, migration, API, dependency, index or token. No server change. Validation is unchanged (K4): every `required`, `maxLength`, `minLength`, toast and `disabled` gate stays.
- **2D may start once 2B plan 5 also merges** (2B spec B7, §8.1): with both plans 5 merged, 2B and 2C are done, and 2D (its own spec) widens the guards to all of `src`. Plans 2C-5 and 2B-5 share no code file (2B spec §8.3); the one that merged second rebased onto `master` in its last task.
- **Deploy:** none: one deploy after all of phase 2 and the user's checks on real devices; `ab1b873` stays the rollback point (no schema change).
- **What changed in each file:**
  - `c/ui/action-bar.tsx` (new; K23, spec §3.15, §6.10, I23): server-safe (no directive and no hook), so the four server pages render it. A `role="group"` named by its required `label` (the pages pass `tCommon("actions")`, "การดำเนินการ"), fixed to the bottom below `md` (`md:hidden`) on `bg-surface` with a `border-t` and the home-bar padding; its row is centered and at most 512px wide on every page (only the disposal bar had that). Up to 4 links in one row, or 3 under a full-width `primaryAction`. Each link is `buttonVariants({ size: "sm" })` with `min-w-0 px-2`: 44px with 13/20 text, `outline`, or `default` when the link sets `primary` (the old bars were grey-filled with `text-xs leading-tight`). A disabled item is `<a role="link" aria-disabled="true">` with no `href`, in the 2A disabled look (it was a plain `<span>`). `actionBarPagePadding.single` (`pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0`) and `.withPrimary` (9rem) add the home bar to the old 96px and 144px (spec §6.15 rulings 15–16).
  - The four O11 pages changed their bar import, root padding and bar only: `` `space-y-6 ${actionBarPagePadding.single}` `` on the asset and repair pages, `` `space-y-6 ${actionBarPagePadding.withPrimary}` `` on the disposal page and `actionBarPagePadding.single` alone on the audit round page (its root had no `space-y-6`); every bar passes `label={tCommon("actions")}`, and the disposal page passes `primary: !nextActionControl` on its first link (the old bar's rule moved to the page). Back items (2B spec §4.6.4, R3): the repair page's bar dropped "กลับ" and `ArrowLeft` left its imports, because its header has `PageBackLink` at every width since 2B plan 4 (the bar keeps open asset, print and history); the audit round page keeps its back item `D/audit/rounds/[id]/page.tsx:496`, because its header has no back button.
  - `c/disposal/disposal-workflow-stepper.tsx` (S1, K17): the file and `DisposalWorkflowStepper` stay as an adapter, and the hand-drawn `<ol>` is `Steps` with `getLinearStepStates(3, …)`. A request that can be opened has been filed: a pending one is current at "พิจารณา" (it showed the first step as current), an approved one at "ตัดจำหน่ายจริง", a rejected one stops at "พิจารณา" with the X, and a disposed one has every step done and none current. The steps are named for what they do, "ยื่นคำขอ · พิจารณา · ตัดจำหน่ายจริง" (they were the card titles "รายละเอียด…"); the list is named "ขั้นตอนการตัดจำหน่าย" (new prop `stepsLabel`), and phones show one line such as "ขั้นที่ 2 จาก 3 · พิจารณา". The panel and its stage row did not change (K28, 2D).
  - `c/ui/alert-dialog.tsx` (K12, spec §5.9): the confirm dialog has the dialog look: a white box with 12px corners and `shadow-overlay`, 12px above the bottom edge and the home bar on phones and centered up to 512px from `sm`, a column that clips at `92dvh`; the header (the 16px semibold title, left-aligned, then the 14px description) carries the bottom line; the footer is the `background` band with Cancel first, stacked full width on phones and a right-aligned row from `sm`. The content's `size` prop, `data-size` and `AlertDialogMedia` are gone (no caller). The box and its phone position are two class strings, as in `dialog.tsx` (R5), so guard GL1 does not count the dialog as a fixed bottom bar.
  - `c/ui/confirm-dialog.tsx`: no source change (R6). It already put Cancel first and passes the caller's `confirmLabel` (falling back to "ยืนยัน") and tone; a new test pins that, and the file joined `MIGRATED_FILES`.
  - `c/maintenance/maintenance-attachments.tsx`: deleting an attachment asks through `useConfirm` ("ต้องการลบรายการนี้หรือไม่?", the red "ลบ", `tone: "destructive"`) at the top of `handleDelete`, as the other attachment lists do (R8); the home-made dialog, its `pendingDeleteId` state and the `AccessibleDialog` import are gone, and the toast after a delete says "ลบแล้ว" (`common.deletedSuccess`; it said "บันทึกสำเร็จ"). The cards and their buttons, the delete button's spinner included, did not change (2D).
  - The four confirms that said "ยืนยัน" name their action (K12, spec §5.9–5.10; `title` stays the first property): the scope expansion of `c/admin/IntegrationClientManager.tsx` says "เพิ่มสิทธิ์" (default tone; the page passes `confirmScopeExpansionAction`), the discard-selection confirms of `c/disposal/disposal-bulk-approval.tsx` and `c/disposal/disposal-bulk-execution.tsx` say "ละทิ้งรายการที่เลือก" (destructive; one key for both copies, set in `D/disposal/page.tsx`), and the unsaved-changes confirm of `c/master-data/supplier-form.tsx` says "ออกโดยไม่บันทึก" (destructive). What each button does is unchanged.
  - `c/admin/system-settings-form.tsx` (O7, 2B spec R-g): the 11 tabs are `TabNav`, an underline row without the old card. Each tab is a link to its own `?tab=` URL, and `onSelect` calls `event.preventDefault()` and `selectTab(…)`, so a click switches in place through `replaceState` and unsaved edits stay, while Ctrl+click opens the tab's URL. The current tab has `aria-current="page"` (it was `aria-pressed`); Enter switches a tab and Space no longer does; the row is 44px below `md` and 40px from `md`. The row is named "ตั้งค่าระบบ" by the existing key `systemSettingsPage.title`, which the form reads with `useTranslations` (P2: `D/admin/settings/page.tsx` is plan 2B-5's and was not edited).
- **The files shared with 2B:** the four O11 pages changed only their bar import, root padding and bar, and `D/disposal/[id]/page.tsx` its stepper props (Task 3); `D/disposal/page.tsx` gained one line in each bulk copy object, and `D/admin/integrations/page.tsx` one label (it has no mixed line endings at `6835bdf`: `i/lf w/crlf`, unlike the 2B plan 2 note). `D/admin/settings/page.tsx` and `src/lib/design-system.ts` are plan 2B-5's and were not edited (P2, P1). The tests of 2B plans that pin the O11 lines moved with the swap (R4): `asset-detail-ux:177-178`, `disposal-detail-workspace:106`, `:114`, `repair-record-detail-ui:79-81`, `:86-87` and `list-pages-ui:343` (that one line only; plan 2B-5 edits other lines of the file, which follows the rebase rule). `tests/list-frame-guards.test.ts` is not edited. The "Handed on to 2C plan 5" lists of the 2B plan 2, 2C plan 3, 2B plan 4 and 2C plan 4 sections are done, except `getMobileSafeBottomPaddingClasses()` and its pin, which go to 2D (P1, below).
- **Messages:** new `integrationApiPage.confirmScopeExpansionAction` ("เพิ่มสิทธิ์" / "Add permissions"), `disposalPage.bulkDiscardSelectionAction` ("ละทิ้งรายการที่เลือก" / "Discard selection"), `supplier.unsavedChangesLeave` ("ออกโดยไม่บันทึก" / "Leave without saving"), `disposalPage.workflowStepsLabel` ("ขั้นตอนการตัดจำหน่าย" / "Disposal steps") and `disposalPage.workflowSteps` with `request`, `decision` and `execution` ("ยื่นคำขอ", "พิจารณา", "ตัดจำหน่ายจริง" / "Request", "Decision", "Execution"); none deleted. The card titles `requestDetail`, `decisionDetail` and `executionDetail` stay: the page's cards read them. Every key went in through `scripts/messages-edit.mjs`; Task 13 re-runs the four change files if plan 2B-5 merged first.
- **Guards** (`tests/form-migration-guards.test.ts`; total and files per budget, `6835bdf` → after this plan, the end state of 2C):
  - `MIGRATED_FILES` 61 → 64, every file of `BATCH_FILES` (`BATCH_FILES` 66 → 64 files: Task 2 took the two deleted bars out, R2; `ui/action-bar.tsx` is one of `NEW_2C_FILES`) · `PENDING_FOOTER_PARTS` 1 → 0 (declared `new Set<string>`, so tsc accepts `.has(path)` on the empty set) · `CONSTRAINT_FLOORS` (38 files) does not move.
  - `FIXED_BOTTOM_BARS` 3 in 3 files → 2 in 2 (GL1(c): the register's phone bulk-action bar for phase 3, and `ActionBar`, whose row Task 1 added, R1) · `RAW_FIELDS` 3 in 2 files and `LOADER2` 13 in 10 files do not move (kept on purpose: K21, O20, I27) · `LOCAL_FIELD`, `FIELD_CLASS_STRINGS`, `OLD_MARKUP`, `OLD_HELPERS`, `REVERSE` and `CLOSE_LABEL_IS_CANCEL` stay empty.
  - `confirm()` (`tests/confirm-dialog-ui.test.ts`, spec §5.11 G and H): 15 option objects in 12 files, none without `confirmLabel` (14 in 11 files, 4 without, at `6835bdf`). G was a waiting list that Tasks 6–8 emptied, one file per commit, and is strict since Task 8; it reads each call with balanced brackets, because the spec's regex stops at the `{ file }` inside a `t()` call. H pins the three verb keys in both languages and where each one is read.
  - VFG: one pin, `:91` (the bars' path list is `src/components/ui/action-bar.tsx` alone; its regex did not change, I23); no budget row changes.
  - LFG is not edited (2B's file). Its live counts after this plan: LP1 4 → 0 (the four roots) and LB1 7 → 6 (the repair page's bar), under their rows of 1. Plan 2B-5 locks `BUDGETS` to `KEEP`, which accepts lower live counts: if this plan merges first, 2B-5 lowers those rows after its rebase; otherwise 2D does.
- **Tests:** no new file; 2 tests appended to `mobile-action-bar` (Tasks 1 and 2), 1 to `steps-ui` (Task 3), 4 to `confirm-dialog-ui` (Tasks 4a and 4b, and G and H in Task 6) and 1 to `settings-tab-persistence-ui` (Task 9): 8 tests in all. Edited pins (spec §10.4 tables A and D, R4, R7): `mobile-action-bar:2`, `:17`, `visual-foundation-guards:91`, `audit-scan-search-ui:182`, `disposal-detail-workspace:35`, `:42`, `:106`, `:114`, `asset-detail-ux:177-178`, `repair-record-detail-ui:79-81`, `:86-87` and `list-pages-ui:343` (Task 2), `accessible-dialog:86` (Task 4a), `maintenance-attachments-ui:20`, `:25` and `confirm-dialog-ui:25-31` (Task 5). `audit-scan-search-ui:188` stays (P1). The test files both plans of the pair read (`asset-label-print-ui`, `audit-round-cancellation`, `field-primitives`, `performance-route-instrumentation`, `settings-depreciation-policy-ui`, `settings-ldap-role-ui`, `system-log-history`, `visual-consistency-ui`) are not edited.
- **Rulings of this plan** (where the spec was silent, or the pair needed one):
  - P1: `src/lib/design-system.ts` is plan 2B-5's alone, so the unused `getMobileSafeBottomPaddingClasses()` and its pin stay for 2D (the 2B plan 4 hand-off had given them to plan 5). P2: `D/admin/settings/page.tsx` is 2B-5's, so the tab row takes its name inside the form. P3: neither plan touched a file of the other.
  - R1 and R2 (the guard rows of the new bar and of the two deleted ones), R3 (the back items), R4 (the 2B-4 pins), R5 (the confirm box in two class strings), R6 (`confirm-dialog.tsx` unchanged, with its own commit for `MIGRATED_FILES` and its test), R7 (the `confirm-dialog-ui:25-31` change lands with the file it reads, Task 5), R8 (the attachment confirm inside `handleDelete`; `new Set<string>`).
  - G is a waiting list that each verb's commit shortens; Task 7 is two commits, because each copy type and its one caller must change together for tsc; the settings tab row has no card and no full-bleed margins.
- **Accepted:**
  - On phones the repair page's bar has no "กลับ": the header's back button does that at every width (R3). The audit round page keeps its back item.
  - The settings tabs are links: Enter switches a tab and Space does not (the buttons took both), and Next.js may prefetch the `?tab=` URLs (GET only).
  - The settings tab row and the page title share the words "ตั้งค่าระบบ" (P2: no new key).
  - The disposal stepper's panel and stage row keep their look until 2D (K28), and the card titles under it keep "รายละเอียด…" while the steps say what each step does (spec §7.13 ruling 6).
  - `ActionBar` has no ⋯ layout (phase 3).
- **Handed on to 2D and the V track:**
  - 2D (its own spec) widens every form guard to all of `src` and sets the budgets to `{}` (`tests/form-migration-guards.test.ts:21`). What 2C leaves there on purpose: `RAW_FIELDS` 3 (the label print toolbar's two boxed fields, K21, and the audit room search, O20), `LOADER2` 13 in 10 files (spinners outside buttons, I27, among them the repair attachment delete button's `maintenance/maintenance-attachments.tsx:210`) and `FIXED_BOTTOM_BARS` 2 (the register's phone bulk-action bar `assets/asset-register-table.tsx:473`, for phase 3 with QR label printing, and the bar's own string `ui/action-bar.tsx:43`).
  - `getMobileSafeBottomPaddingClasses()` `src/lib/design-system.ts:112-114` has no caller, and `tests/audit-scan-search-ui.test.ts:188` pins its class string: 2D deletes them together (P1).
  - The disposal stepper's panel `disposal/disposal-workflow-stepper.tsx:51` and its stage row (K28); the repair attachment cards with their preview, download and delete buttons (spec §8.10).
  - The LFG rows this plan left above their live counts (LP1 of the four O11 pages, LB1 of `D/maintenance/[id]/page.tsx`), unless plan 2B-5 lowered them after a rebase.
  - Phase 3: the ⋯ layout of `ActionBar` (K23) and the register's phone bulk-action bar.
  - The 2C plan 4 list (the boxes, panels and buttons batch 4 kept, the import panel's R-e and R-f items, the keys K13 left unread, the last 3 `ActionButton` call sites) is unchanged.
  - V track: nothing new from batch 5, which changed no validation; its items are those of the 2C plan 4 section, counted again by its own spec at its HEAD (spec §8.11).
- Dev-app check (Task 11): <from task-11-findings.md>
- Before/after screenshots: `.superpowers/sdd/screenshots/ui-phase2c-plan5/before/` and `after/` in the main checkout (git-ignored, on the development machine only).
- Still open, for a person before the one phase-2 deploy: <from task-11-findings.md>, together with the open checks of phase 1, 2A, 2C plans 1–4 and 2B plans 1–4 above.
- Next: merge this branch (rebase it first if 2B plan 5 merged before it); 2D once 2B plan 5 has merged too (its spec first), then the V track (the pipeline of the 2B plan 1 section).

## Open Go-Live Decisions
```

Replace both `<from task-11-findings.md>` markers with the text from the findings; no marker may stay. When "Still open" has more than two items, replace its whole line with `- Still open, for a person before the one phase-2 deploy:`, one nested bullet (two spaces, `- `) per item, and a last nested bullet `Complete these, together with the open checks of phase 1, 2A, 2C plans 1–4 and 2B plans 1–4 above.`, as the 2C plan 4 section does.

- [ ] **Step 7: `docs/99_CHANGELOG.md` (2 replacements)**

(1) A new date block on top (skip this when the file already has `## <today>`, see the rulings). Replace the line `## 2026-10-14` with:

```
## <today>

---

## 2026-10-14
```

(2) The entry, directly under the `## <today>` heading (above `---` when (1) ran, above plan 2B-5's entry otherwise). Replace the heading line `## <today>` (the newest one, the only line with that date) with the block below, which starts with that same heading and ends with the entry's last bullet; the blank line that followed the heading now separates this entry from the next. Write the "ตรวจบนแอป (Task 11)" bullet from `task-11-findings.md`, in Thai, in the shape of the plan 4 entry's bullet (what was checked and where, the results with the bottom space of the four pages at 375, fixes or "แก้เพิ่ม: ไม่มี", what was accepted, issues not caused by plan 5, and "ยังต้องให้คนตรวจ: …" ending with "รวมกับรายการเปิดของเฟส 1, 2A, 2C plan 1–4 และ 2B plan 1–4 ก่อน deploy ครั้งเดียวตอนจบเฟส 2").

```
## <today>

### แถบปุ่มบนมือถือของหน้ารายละเอียด dialog ยืนยัน ขั้นตอนตัดจำหน่าย และแท็บตั้งค่า (UI รอบ 4 เฟส 2C plan 5)

Branch `feat/ui-phase2c-plan5` ใน worktree `.worktrees/ui-phase2c-plan5` (จาก `master` `6835bdf` ทำคู่กับ 2B-5) · design `docs/superpowers/specs/2026-10-11-ui-phase2c-design.md` ข้อ 8.9 ชุด 5 (ข้อ 10 ใช้แทนไฟล์ส่วน) · plan `docs/superpowers/plans/2026-10-15-ui-phase2c-plan5.md` · ค่าทั้งหมดอยู่ใน `DESIGN.md` · plan สุดท้ายของ 2C

- **ขอบเขต:** ชุด 5 ข้ามโดเมน: แถบปุ่มบนมือถือของหน้ารายละเอียด 4 หน้า (ทรัพย์สิน บันทึกการซ่อม คำขอตัดจำหน่าย รอบตรวจนับ) เป็น `ActionBar` ตัวเดียว (ลบแถบเดิม 2 ไฟล์) และระยะล่างของหน้าเปลี่ยนใน commit เดียวกัน · ขั้นตอนของคำขอตัดจำหน่ายเป็นแถบขั้นตอนแบบกลาง · dialog ยืนยันได้หน้าตาเดียวกับ dialog อื่น · ลบไฟล์แนบงานซ่อมถามผ่าน dialog ยืนยันกลาง · ปุ่มยืนยัน 4 จุดที่ยังเขียน "ยืนยัน" เป็นคำกริยา · แท็บหน้าตั้งค่าเป็น `TabNav` · ไม่มีขั้นตอนงานใหม่ ไม่แตะฐานข้อมูล ไม่แก้ server ไม่เพิ่ม token · การตรวจกรอกไม่เปลี่ยน
- **แถบปุ่มบนมือถือ (ต่ำกว่า 768px):** ปุ่มเป็นปุ่มขอบสีขาวแบบกลาง (เดิมพื้นเทา) ปุ่มหลักสีทึบ ตัวอักษร 13px สูง 44 · ปุ่มที่ใช้ไม่ได้ (เช่น "เอกสารล่าสุด" ของทรัพย์สินที่ไม่มีการส่งมอบ) เป็นสีเทา โปรแกรมอ่านหน้าจออ่านว่าเป็นลิงก์ที่ใช้ไม่ได้ · แถบมีชื่อกลุ่ม "การดำเนินการ" · จอกว้างตั้งแต่ 512px ปุ่มอยู่กลาง กว้างไม่เกิน 512px · ระยะล่างของหน้าเผื่อขอบล่างของ iPhone ด้วย · หน้าบันทึกการซ่อมเหลือ 3 ปุ่ม ("กลับ" อยู่ที่หัวหน้าทุกขนาดจอ) หน้ารอบตรวจนับคงปุ่มกลับ · ตั้งแต่ 768px ไม่มีแถบเหมือนเดิม
- **ขั้นตอนตัดจำหน่าย:** 3 ขั้น "ยื่นคำขอ · พิจารณา · ตัดจำหน่ายจริง" (เดิมใช้ชื่อการ์ด "รายละเอียด…") บนแถบขั้นตอนแบบกลาง วงกลม 22px เครื่องหมายถูกที่ขั้นที่เสร็จ · คำขอที่รออนุมัติอยู่ที่ "พิจารณา" (เดิมแสดงขั้นแรก) อนุมัติแล้วอยู่ที่ "ตัดจำหน่ายจริง" ปฏิเสธมีกากบาทที่ "พิจารณา" ตัดจำหน่ายแล้วเสร็จทุกขั้น · มือถือแสดงบรรทัดเดียว เช่น "ขั้นที่ 2 จาก 3 · พิจารณา" · โปรแกรมอ่านหน้าจออ่านรายการ "ขั้นตอนการตัดจำหน่าย" พร้อมสถานะของแต่ละขั้น · กรอบและแถวสถานะด้านบนคงเดิม (2D)
- **dialog ยืนยัน:** (ลบข้อมูลหลัก ลบไฟล์แนบและเอกสารจัดซื้อ ย้ายไฟล์กำพร้าไป .archive ปิดรอบตรวจนับ เปลี่ยน token ปิดหรือเปิดใช้ client เพิ่มสิทธิ์ ละทิ้งรายการที่เลือก ออกจากฟอร์มผู้ขาย) กล่องสีขาวแบบ dialog อื่น · มือถืออยู่เหนือขอบล่าง 12px และพ้นขอบล่างของ iPhone (เดิมลอยกลางจอ) ตั้งแต่ 640px อยู่กลางจอ กว้างไม่เกิน 512px · หัวเรื่อง 16px ชิดซ้ายมีเส้นใต้ (เดิม 18px และอยู่กลางบนมือถือ) · ปุ่มอยู่ในแถบพื้นเทา "ยกเลิก" มาก่อน มือถือปุ่มเต็มความกว้าง ยกเลิกอยู่บน · โฟกัสเริ่มที่ "ยกเลิก" · ปุ่มยืนยันเป็นคำกริยาทุกจุด: 4 จุดที่เคยเขียน "ยืนยัน" เป็น "เพิ่มสิทธิ์" (Integration API) "ละทิ้งรายการที่เลือก" (เลือกคำขอในคิวตัดจำหน่ายแล้วเปลี่ยนหน้า 2 จุด ปุ่มแดง) และ "ออกโดยไม่บันทึก" (ฟอร์มผู้ขาย ปุ่มแดง) · ลบไฟล์แนบของงานซ่อมใช้ dialog ยืนยันกลาง (ปุ่มแดง "ลบ") แทนกล่องที่เขียนเอง และหลังลบขึ้น "ลบแล้ว" (เดิม "บันทึกสำเร็จ")
- **แท็บหน้าตั้งค่า:** 11 แท็บเป็นแท็บเส้นใต้แบบหน้าอื่น (เดิมเป็นปุ่มในกรอบการ์ด แท็บปัจจุบันพื้นน้ำเงิน) มือถือสูง 44 จอใหญ่ 40 · เปลี่ยนแท็บแล้วค่าที่ยังไม่บันทึกอยู่ครบ URL เป็น `?tab=…` เหมือนเดิม · Ctrl+คลิกเปิดแท็บในแท็บใหม่ของเบราว์เซอร์ได้ (ใหม่) · Enter เปลี่ยนแท็บ (Space ไม่เปลี่ยนแล้ว) · โปรแกรมอ่านหน้าจออ่านเป็นแถบนำทาง "ตั้งค่าระบบ" แท็บปัจจุบันเป็นหน้าปัจจุบัน
- **ข้อความ:** เพิ่ม `integrationApiPage.confirmScopeExpansionAction` ("เพิ่มสิทธิ์" / "Add permissions") · `disposalPage.bulkDiscardSelectionAction` ("ละทิ้งรายการที่เลือก" / "Discard selection") · `supplier.unsavedChangesLeave` ("ออกโดยไม่บันทึก" / "Leave without saving") · `disposalPage.workflowStepsLabel` ("ขั้นตอนการตัดจำหน่าย" / "Disposal steps") · `disposalPage.workflowSteps` ("ยื่นคำขอ" "พิจารณา" "ตัดจำหน่ายจริง" / "Request" "Decision" "Execution") · ไม่ลบ key
- **guard:** `form-migration-guards` ถึงสถานะสุดท้ายของ 2C: `MIGRATED_FILES` 61 → 64 (ครบทุกไฟล์ของ 2C) · `BATCH_FILES` 66 → 64 ไฟล์ (แถบเดิม 2 ไฟล์ถูกลบ) · `PENDING_FOOTER_PARTS` 1 → 0 · `FIXED_BOTTOM_BARS` 3 → 2 (แถบปุ่มเลือกหลายรายการของทะเบียนรอเฟส 3 และ `ActionBar`) · ช่องที่เขียนเอง 3 ช่องและไอคอนหมุนนอกปุ่ม 13 จุดคงไว้ตั้งใจ · `CONSTRAINT_FLOORS` ไม่ลด · `confirm()` 15 จุดใน 12 ไฟล์มีคำกริยาครบ (test ตรวจทุกจุด) · VFG แก้ pin 1 บรรทัด · ไม่แก้ `list-frame-guards` (นับจริง LP1 4 → 0 และ LB1 7 → 6 ต่ำกว่าแถวที่ล็อกไว้ ให้ 2B-5 หรือ 2D ลด)
- **test:** ไม่มีไฟล์ใหม่ · เพิ่ม 2 test ใน `mobile-action-bar` 1 ใน `steps-ui` 4 ใน `confirm-dialog-ui` และ 1 ใน `settings-tab-persistence-ui` รวม 8 test · แก้ pin ตามสเปกข้อ 10.4 และ pin ของ 2B-4 ที่รอ plan 5 (`asset-detail-ux` `disposal-detail-workspace` `repair-record-detail-ui` และ `list-pages-ui:343`) · `audit-scan-search-ui:188` และ `getMobileSafeBottomPaddingClasses()` คงไว้ให้ 2D
- **deploy:** ไม่ deploy · deploy ครั้งเดียวหลังเฟส 2 ทั้งหมดและผู้ใช้ตรวจเครื่องจริง · ถอยกลับไป `ab1b873` ได้เพราะไม่มี schema เปลี่ยน
- **ตรวจบนแอป (Task 11):** <จาก task-11-findings.md>
- ภาพก่อน/หลัง: `.superpowers/sdd/screenshots/ui-phase2c-plan5/before/` และ `after/` ใน checkout หลัก (git ignore อยู่บนเครื่องพัฒนา)
- ต่อไป: merge (ถ้า 2B-5 merge ก่อนให้ rebase ก่อน) · 2D เริ่มได้เมื่อ 2B-5 merge แล้วด้วย (เขียนสเปกก่อน) · แล้วงาน V
```

Replace the `<จาก task-11-findings.md>` marker with the text from the findings, and every `<today>` with the date; no marker may stay.

- [ ] **Step 8: `.impeccable/design.json` and `docs/11_FEATURE_LIST.md`: no change**

No feature row becomes untrue and no `design.json` entry does (see the rulings and open issues 4–5): leave both files, and the `generatedAt` of `design.json`, as they are.

Run: `git diff --quiet 6835bdf -- .impeccable/design.json docs/11_FEATURE_LIST.md docs/07_UAT_CHECKLIST.md && echo NOT-CHANGED`
Expected: `NOT-CHANGED`.

- [ ] **Step 9: Check**

Run: `node <temp>/check-docs-2c5.mjs`
Expected: 11 `ok` lines, exit 0, and no "lacks these live fragments" list.

Run: `grep -n "<from task-11\|<จาก task-11\|<today>" DESIGN.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md docs/14_UI_UX_DESIGN_SYSTEM.md`
Expected: nothing.

Run: `git diff --numstat`
Expected: exactly the four files: `DESIGN.md` `11 10` (10 lines changed and the **`ActionBar`** bullet added), `docs/14_UI_UX_DESIGN_SYSTEM.md` `6 5` (5 rows or lines changed and the `ActionBar` row added), `DEVELOPER_HANDOFF.md` about `49 0` (the findings change the count: a nested "Still open" adds one line per bullet, `53 0` with three items and the closing bullet), `docs/99_CHANGELOG.md` about `21 0` (`17 0` without the new date block). A file that shows every line changed was normalized: restore its line endings.

Run: `node -e "for (const f of process.argv.slice(1)) { const s = require('fs').readFileSync(f, 'utf8'); console.log(f, (s.match(/\r\n/g) || []).length, (s.match(/\n/g) || []).length) }" DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md`
Expected: the two numbers equal on every line (CRLF throughout).

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: all green, with the test count after Task 11 (1988 tests, 1987 pass, 1 skipped, if Task 11 added no test). `tests/audit-round-cancellation.test.ts` reads the handoff and the changelog (both must still mention the round cancellation and that earlier audit work is preserved; the older sections still do); no other test reads these four files.

- [ ] **Step 10: Commit**

```bash
git add DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md
git commit -m "docs(ui): phase 2C plan 5 action bar, confirm dialog, disposal steps and settings tabs in DESIGN.md, design-system index, handoff and changelog

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit (`git show --stat HEAD`). `git status --short` prints nothing (the worktree has no untracked files; `node_modules/`, `src/generated/` and `.env` are ignored).

---

### Task 13: Final verification, rebase if needed, wiki and memory (controller runs this task)

**Files:**
- Modify: `docs/99_CHANGELOG.md`, `DEVELOPER_HANDOFF.md` (verify numbers)
- Modify (vault `D:\Obsidian\Eltross`): `AssetSystem/ams-status.md`, `AssetSystem/ams-log.md`, `AssetSystem/ams-open-questions.md`
- Modify (auto-memory): `review-2026-10-priorities.md`

**Interfaces:**
- Consumes: Tasks 1–12 committed in the worktree.
- Produces: the branch ready for superpowers:finishing-a-development-branch, and the worktree removed after the merge.

- [ ] **Step 1: Verify.** From the worktree:
  - Run `npm run verify` and record the test count and the build page count.
  - If it passed, add one bullet to the 2C plan 5 entry in `docs/99_CHANGELOG.md`, directly above its "ตรวจบนแอป (Task 11)" bullet: `` `npm run verify` ผ่าน (test N · ผ่าน N · ข้าม 1 · build X/X หน้า) ``.
  - Add the same numbers to the 2C plan 5 section of `DEVELOPER_HANDOFF.md`, directly above its "Dev-app check (Task 11)" bullet: ``- Verification: `npm run verify` passes (tests N · pass N · skipped 1 · build X/X pages).``
  - Both files are CRLF: insert with an exact-string edit that writes `\r\n` (a Node script; `sed -i` in Git Bash writes LF).
  - Run `npm test` again (`tests/audit-round-cancellation.test.ts` reads both files).
  - Commit both files with `docs(ui): record phase 2C plan 5 verify results` and the Co-Authored-By line.

- [ ] **Step 2: Rebase if plan 2B-5 merged first (2B spec §8.2).** From the worktree run `git merge-base --is-ancestor master HEAD && echo UP-TO-DATE`.
  - If it prints `UP-TO-DATE`, skip to Step 3.
  - Otherwise `master` moved (plan 2B-5 merged). Run `git rebase master` in the worktree and resolve conflicts by 2B spec §8.2:
    - `DESIGN.md`: keep both sides; where both touched the same line, write it so it matches the code after both merges.
    - `tests/visual-foundation-guards.test.ts`: keep both sides; a budget row both lowered takes the lower number; never raise. This plan edits the mobile action bar pins; 2B-5 the R7 lock and the `MetricCard` pins.
    - `messages/th.json`, `messages/en.json`: take `master`'s version, then re-run this plan's change files (`node scripts/messages-edit.mjs <temp>/<change file>`) in task order.
    - `DEVELOPER_HANDOFF.md` (chronological: the section that merged first stays above), `docs/99_CHANGELOG.md` (newest entry on top under its date), `docs/14_UI_UX_DESIGN_SYSTEM.md`, `docs/11_FEATURE_LIST.md`: keep both sides; adjacent table rows keep each side's own row.
    - A conflict in any other file means a fence leaked: abort the rebase (`git rebase --abort`), find the commit that touched the other plan's file, and stop to report.
  - After the rebase: 2B-5 locked LFG (`BUDGETS = KEEP`); this plan lowers live counts only (the four O11 pages' LP1, maybe LB1), which the lock accepts. Run `node <temp>/check-docs-2c5.mjs` (Task 12) and, if it prints other line fragments, update the handoff text it names (new commit); then `npm run verify`, the production build from the worktree, and the screens of Task 11 Step 4 once more at 1440 and 375 (cancel only). Update the verify numbers of Step 1 if they changed (new commit).

- [ ] **Step 3: Wiki.** Read `AssetSystem/_schema/ams-wiki-schema.md` first, then:
  - `ams-status.md`: the 2C row says plan 5 (the last 2C plan) is built on `feat/ui-phase2c-plan5` (worktree) with the verify numbers, not merged, not deployed, and that 2D may start once both plan 5 and 2B-5 have merged. Fix any sentence the row now contradicts (rule 8).
  - `ams-log.md`: an entry at the top of `## <today>`.
  - `ams-open-questions.md`: the plan-5 checks for a person from Task 11 Step 8 (one new numbered item, also added to the list in item 27) · anything Task 11 recorded as found but not caused by plan 5.
  - Run `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` from `D:\Obsidian\Eltross`.
  - Commit only those three files with an `ingest:` message. Other sessions have uncommitted changes in the vault; never stage them.

- [ ] **Step 4: Memory.** Update `review-2026-10-priorities.md`: 2C plan 5 built on `feat/ui-phase2c-plan5` in the worktree, not merged, not deployed; the state of 2B-5; next: the merge choice, then 2D (its spec) once both have merged.

- [ ] **Step 5:** Use superpowers:finishing-a-development-branch. A local merge fast-forwards `master` from the main checkout (`git merge --ff-only feat/ui-phase2c-plan5` when the main checkout is on `master`; `git fetch . feat/ui-phase2c-plan5:master` while it holds plan 2B-5's branch), then runs the tests on the merged result. After the merge, remove the worktree from the main checkout with `git worktree remove .worktrees/ui-phase2c-plan5` (its `.env` copy goes with it, I30) and `git worktree prune`; if Windows refuses to delete the emptied folder, `rmdir` it once no process holds it.

