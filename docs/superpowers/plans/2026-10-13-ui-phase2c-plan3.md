# UI Round 4 · Phase 2C Forms and Dialogs · Plan 3 (batch 3: disposal, audit and maintenance dialogs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the 9 files of 2C batch 3 (the disposal bulk approval and execution dialogs, the audit round form and cancel dialog, the findings batch dialog side, the audit scan room picker and check panel sheets, the PM plan state actions and `ConfirmTextDialog`) onto the 2A and 2C primitives. Workflows, pages, data and validation behavior stay the same.

**Architecture:**
- **No new primitives.** Plan 1 merged everything batch 3 needs: `AccessibleDialog` parts, `Field`, `Input`, `NativeSelect`, `Textarea`, `checkboxVariants`, `Button` with `busy`, `Notice`, the sheet parts.
- **One file is one commit (I30).** Each of Tasks 1–9 migrates one file. In the same commit it lowers that file's budgets in `tests/form-migration-guards.test.ts` (FMG) and adds it to `MIGRATED_FILES`, so the old patterns cannot come back.
- **Three files are shared with 2B.** Plan 2B-2 already moved the list parts of `disposal-bulk-approval.tsx`, `disposal-bulk-execution.tsx` and `audit-findings-batch-actions.tsx` (checkboxes, toolbar buttons, `busy`, row triggers); this plan moves their dialogs only (DH "Handed on to 2C plan 3").
- **Pipeline (2B spec B7, §8.1–8.2):** this plan runs in the git worktree `.worktrees/ui-phase2c-plan3` while plan 2B-3 (the asset register) runs in the main checkout. They share no code file. Whichever finishes second rebases onto `master` in its last task.
- **Controller tasks:** Task 0 (worktree setup, base check, before screenshots), Task 10 (verify, production build, dev-app check) and Task 12 (verify numbers, rebase if needed, wiki, memory). Task 11 writes the repo docs.

**Tech Stack:** Next.js 16.4 App Router · Tailwind CSS 4.2.4 · class-variance-authority 0.7.1 · tailwind-merge 3.5 (through `cn()`) · radix-ui · next-intl 4 · `node --test` with Node 24 type stripping.

**Spec:** `docs/superpowers/specs/2026-10-11-ui-phase2c-design.md`, with section details in `docs/superpowers/specs/2026-10-11-ui-phase2c/03-primitives.md` … `09-guards-tests.md`.
- **Spec §10 (rulings I1–I36) overrides the section files wherever they conflict.** This plan already applies them; when a task and a section file disagree, the task wins.
- Batch 3 is spec §8.9 "ชุด 3" and §10.3 "plan 3". Its line numbers are from `5ffee76`; this plan recounted them at `886a290`.
- The 2B spec (`docs/superpowers/specs/2026-10-12-ui-phase2b-design.md` §8.1–8.3, I28 superseded by B7, I29, I30) sets when this plan may start (after 2B-2 merged) and the rules for running beside 2B-3.

## Global Constraints

- **Git:**
  - Work in the worktree `D:/Antigravity/asset-system/.worktrees/ui-phase2c-plan3` on branch `feat/ui-phase2c-plan3` (from `master` `886a290`). Run every command from the worktree's root.
  - Never run `git checkout`, `git switch`, `git reset`, `git stash`, `git rebase` or `git clean`, never touch `master`, and never touch the main checkout `D:/Antigravity/asset-system` (plan 2B-3 runs there at the same time).
  - Commit only the files your task names. One migrated file is one commit (I30).
  - End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Next.js 16.4** is not the Next.js in your training data. Read `node_modules/next/dist/docs/` before using an API you have not seen in this repo.
- **Line endings:**
  - `git config core.autocrlf` is `true`, and a fresh worktree checks every text file out as CRLF: the 9 batch-3 files, `tests/form-migration-guards.test.ts` (`i/lf w/crlf`) and most `tests/` files. The budget scripts keep the endings they read.
  - Before you edit a file, run `git ls-files --eol <file>` and keep what it uses. Edit with exact-string replacement; never normalize a file. New files are LF.
  - Tests that read source files strip `\r` (`.replace(/\r\n/g, "\n")`) before multi-line regexes. A test that reads a CRLF file without stripping must not get a new regex with `\n`.
- **Tests:**
  - `npm test` runs `node scripts/run-tests.mjs` over `tests/**/*.test.{ts,mjs,js}` with Node 24 type stripping. Run one file with `node --test tests/<file>.test.ts`.
  - Modules that tests import use relative `.ts` imports (no `@/`) and erasable TypeScript only. Tests cannot import `.tsx`; they check `.tsx` by reading the source text.
  - Use the shared helpers in `tests/helpers/source-files.ts`.
- **Baseline before Task 1** (HEAD `886a290`, or this plan's commit on top of it, which changes only `docs/`):
  - `npm test`: 1927 tests, 1926 pass, 0 fail, 1 skipped.
  - `npx tsc --noEmit`: clean.
  - `npm run lint`: 0 errors and 146 warnings, all under `.agents/`.
  - Task 0 re-checks these numbers in the worktree.
- **Every task ends with all of these green:** `npm test` (0 fail) · `npx tsc --noEmit` · `npm run lint` (0 errors, no new warnings in `src/` or `tests/`). Report any failure by name.
- **Off limits:**
  - Do not run `npm ci`, `npm install`, `npm run build`, the dev server, `npx shadcn …`, or anything against a database (the controller set up the worktree in Task 0).
  - Do not read or print `.env` or `.env.prod-admin`.
  - Do not run skill helper scripts (for example the impeccable launcher); they make network calls.
  - Keep code fragments in your temp folder as `.txt` (the temp folder sits under the linted tree).
- **No new tokens (I21).** No task adds a custom property to `:root`, `@theme inline` or `@theme`, and no task edits `tests/design-tokens-contrast.test.ts`. Never write `rounded-[…]`.
- **2B fences (2B spec §8.3, §8.11):**
  - Never touch plan 2B-3's files: `src/components/assets/asset-register-*.tsx`, `src/lib/asset-register-columns.ts`, `src/app/[locale]/(dashboard)/assets/page.tsx`, `src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx`.
  - Never edit `tests/list-frame-guards.test.ts` (LFG, 2B's guard file); keep it green.
  - In `disposal-bulk-approval.tsx`, `disposal-bulk-execution.tsx` and `audit-findings-batch-actions.tsx`, change only the dialog side; the list parts 2B-2 moved stay as they are.
  - In `audit-scan-room-picker.tsx`, never touch the search line (2C spec O20).
  - Keep `tests/audit-scan-room-ui.test.ts` green: the room picker keeps its `min-h-11` targets.
- **Dialog rules (spec §5, §10):** `AccessibleDialog` with its header, body and footer parts; the footer part instead of a hand-made `sticky bottom-0` footer; the confirm button `busy` while it works and never `disabled` by the same flag (GB4); a busy button keeps its label (no "กำลัง..." swaps, K13); `destructive` for solid confirms, `danger` for in-page destructive actions; the PM plan state actions stay a dialog (not `useConfirm`, K12).
- **Field rules (spec §4):** `Field label=` first; `required`, `maxLength` and `minLength` stay on the control (K4; FMG GF5 `CONSTRAINT_FLOORS` never go down); `fieldSize` default `lg`; phones keep ≥44px with 16px text.
- **No validation behavior change.** Keep every `toast.error` guard, every `disabled` gate and every native check. Field errors, focus on the first invalid field, and `min={start}` on date pairs belong to the V track.
- **Messages:** batch 3 adds no key (spec §8.13). If a task finds a string it must add, stop and ask the controller.
- **Deploy:** no task deploys. The user decided on 2026-10-12 to deploy once after all of phase 2.

## Rulings of this plan

- **Pipeline with plan 2B-3 (2B spec §8.2, I29):** the shared non-code files are `DESIGN.md`, `tests/visual-foundation-guards.test.ts`, `messages/*.json`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md` and `docs/11_FEATURE_LIST.md`. If plan 2B-3 merges first, the controller rebases this branch in Task 12 Step 2 and resolves them by the rules there. A conflict in any other file means a fence leaked: stop.
- **The worktree has no `uploads/`** (git-ignored, 2B spec §8.2): attachment thumbnails answer 500 there. Batch 3 changes no attachment view, so the dev-app check ignores them.

## Review Focus

1. **A user who presses a dialog's confirm twice, or Enter while it works,** must not send a second request, and focus must stay on the busy confirm, which keeps its label. Pinned by FMG GB4 (no `disabled={x}` beside `busy={x}`) and GB3, and by each task's test of a `busy` confirm (Tasks 1–6, 9); checked with the keyboard in Task 10.
2. **A user who saves the audit round form with a required field empty** must still be stopped as today. Pinned by FMG GF5 (`CONSTRAINT_FLOORS` never go down) and Task 4's test (the shared fields keep `required`).
3. **A user on a phone with the disposal bulk execution dialog open** must reach its buttons without them scrolling away or sitting under the home bar. Pinned by Task 3's test (the footer part, no hand-made `sticky bottom-0` footer) and the rewritten `tests/disposal-bulk-execution-ui.test.ts` pin; checked at 375 in Task 10 where the dev data allows, otherwise listed for a person.
4. **A user who closes a dialog or sheet with its X or Esc** must hear "ปิด" for the X and get focus back on the control that opened it. Pinned by Tasks 6–8 (the X name comes from the dialog or sheet part, not the caller) and `tests/dialog-trigger-handles.test.ts` (kept green); checked with the keyboard in Task 10.
5. **A field auditor picking a room on a phone** must keep 44px rows and the same search line. Pinned by `tests/audit-scan-room-ui.test.ts` (kept green, `min-h-11`) and Task 7's test (the search line untouched, the department a shared field, clearing in a footer).

## File structure

| File | What changes | Task |
|---|---|---|
| `src/components/ui/confirm-text-dialog.tsx` | `busy` confirm, dialog parts | 1 |
| `src/components/disposal/disposal-bulk-approval.tsx`, `disposal-bulk-execution.tsx` | dialog side only (2B-2 moved the list side) | 2, 3 |
| `src/components/audit/audit-round-form.tsx` | 6 fields on `Field` | 4 |
| `src/components/audit/audit-round-cancel-button.tsx` | dialog + trigger | 5 |
| `src/components/audit/audit-findings-batch-actions.tsx` | dialog side only | 6 |
| `src/components/audit/audit-scan-room-picker.tsx`, `audit-scan-check-panel.tsx` | sheet chrome, `NativeSelect` | 7, 8 |
| `src/components/maintenance/maintenance-plan-state-actions.tsx` | dialog + trigger (stays a dialog, K12) | 9 |
| `tests/form-migration-guards.test.ts` | each task lowers its file's budgets and adds it to `MIGRATED_FILES` | 1–9 |
| `tests/audit-round-form-ui.test.ts` (new) and one appended test per touched file's UI test; the rewritten pins of `disposal-bulk-approval` and `disposal-bulk-execution-ui` | tests | 1–9 |
| `DESIGN.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md` | plan 3 docs | 11, 12 |

---


### Task 0: Worktree setup, base check and before screenshots (controller runs this task, not an implementer)

**Files:**
- Create: the worktree `.worktrees/ui-phase2c-plan3` on branch `feat/ui-phase2c-plan3` (`.worktrees/` is git-ignored, `.gitignore:49-50`)
- Create (git-ignored, inside the worktree): `node_modules/` (`npm ci`; `npm run prisma:generate` writes the client to `node_modules/.prisma/client`), `.env` (a byte copy of the main checkout's `.env`)
- Create then delete: the main checkout's `.claude/launch.json` (only while a server runs; never committed)
- Evidence: `.superpowers/sdd/screenshots/ui-phase2c-plan3/before/` in the main checkout (git-ignored)

**Interfaces:**
- Consumes: `master` at `886a290`.
- Produces: a working worktree, the baseline numbers there, the FMG precheck, and the before images Task 10 compares against.

- [ ] **Step 1: The worktree (2B spec §8.2).** The plan commit created it (`git worktree add .worktrees/ui-phase2c-plan3 -b feat/ui-phase2c-plan3 master`, then this plan file committed there). From the main checkout:

Run: `git worktree list`
Expected: the main checkout and `.worktrees/ui-phase2c-plan3 <plan commit> [feat/ui-phase2c-plan3]`. If the worktree is missing, create it with the command above from `master` `886a290` and record a ruling.

- [ ] **Step 2: Install, generate and copy the env (I30).** From the worktree root:
  - `npm ci` (the same lockfile; no dependency changes). Expected: exit 0.
  - `npm run prisma:generate`. Expected: `Generated Prisma Client` into `node_modules/.prisma/client` (`schema.prisma` uses `prisma-client-js` without an output path).
  - Copy the main checkout's `.env` byte for byte without opening it: `cp ../../.env .env` (the user approved copying `.env` only on 2026-10-12, I30). Never copy or read `.env.prod-admin`.
  - Confirm the database without printing secrets: read the `.env` keys `DATABASE_URL` and `DB_USER` and print only the database name and the user. Expected: `asset_management_dev` / `asset_dev`. If not, stop and delete the copy.

- [ ] **Step 3: Check the base.** From the worktree:

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2c-plan3`

Run: `git merge-base --is-ancestor 886a290 HEAD && git diff --quiet 886a290 HEAD -- src tests messages scripts prisma && echo BASE-OK`
Expected: `BASE-OK`

If plan 2B-3 already has commits on `feat/ui-phase2b-plan3`, run `git diff --name-only master...feat/ui-phase2b-plan3`: every path must be one of 2B-3's files, its tests, LFG, or the shared non-code files of the Rulings. A batch-3 path means a fence leaked: stop.

- [ ] **Step 4: Baseline in the worktree.** Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: 1927 tests (1926 pass, 0 fail, 1 skipped); tsc clean; lint 0 errors and 146 warnings, all under `.agents/`. Record the numbers in the ledger.

- [ ] **Step 5: FMG precheck.** Save Task 1's `p2c3-precheck.mjs` (Task 1 Step 1 gives its full text) in the controller's temp folder and run it from the worktree root. Every batch-3 row of FMG must equal Task 1's Expected; on any difference, stop and update the tasks before dispatching Task 1.

- [ ] **Step 6: Open the app from the worktree.** The main checkout's servers (3000/3001) serve plan 2B-3; never use them for this plan.
  - The preview tool reads `.claude/launch.json` of the main checkout, so point Next.js at the worktree directory: a configuration named `asset-2c3-dev-3100` with `runtimeExecutable: "node"`, `runtimeArgs: [".worktrees/ui-phase2c-plan3/node_modules/next/dist/bin/next", "dev", ".worktrees/ui-phase2c-plan3", "-p", "3100"]`, `port: 3100`, `autoPort: false` (`next dev <dir>` loads that directory's `.env`). Start it with `preview_start`. If plan 2B-3's controller has its own configuration in the same file, add this one beside it.
  - Log in with the seed admin from `prisma/seed.ts`; do not echo the password.

- [ ] **Step 7: Pick ids.** Record in the ledger: an audit round in draft (for the round form's edit page) and one in progress (for the cancel dialog), a round with scan rooms (for the room picker and the check panel), a PM plan in each state, and whether the dev data has a pending and an approved disposal request (the bulk dialogs need them; the dev data of 2026-10-13 had none).

- [ ] **Step 8: Before screenshots.** Save to the main checkout's `.superpowers/sdd/screenshots/ui-phase2c-plan3/before/` as `<view>-<width>.png`, at 1440 and 375 unless noted. Open each dialog or sheet to its first screen and close it with its cancel button or Esc; save nothing:
  - `/th/audit/rounds/new` and a draft round's edit page (the round form)
  - the cancel dialog of an in-progress round (`/th/audit/rounds/<id>`)
  - `/th/audit/findings` with "อนุมัติที่เลือก" / "ปฏิเสธที่เลือก" dialogs (tick one finding; cancel)
  - the scan screen's room picker sheet and check panel sheet (`/th/audit/rounds/<id>/scan`) at 375 and 768
  - `/th/maintenance/pm` with the pause / resume / end dialogs of a plan
  - the disposal bulk approval and bulk execution dialogs if the dev data has requests for them (otherwise record that they could not be opened)

- [ ] **Step 9: Clean up.** Stop the server and remove this configuration from the main checkout's `.claude/launch.json` (delete the file if nothing else is in it). In the worktree, `git status --short` must show nothing (`node_modules/`, `src/generated/`, `.env` are ignored). No commit in this task.

---

### Task 1: Batch 3 · `ui/confirm-text-dialog.tsx` (and the precheck and budget scripts that Tasks 2–9 reuse)

Spec §8.9 "ชุด 3" row `ui/confirm-text-dialog.tsx`, with §5.5 row 22, §5.3 (the `closeLabel?` row), §4.3 (F1, F2, F4), §4.13 (`disabled:opacity-60`), §4.14 note "3", §6.4 (`:86` → `busy`), §9.4 (seeds), §10.1 and I6–I8. Line numbers below are recounted at `886a290`. One file, one commit (I30). The file is CRLF; edit it with exact-string replacement only.

Rulings this task applies:
- **§5.5 row 22, I6–I8:** layout A. `<form className={accessibleDialogFormClasses}>` wraps `AccessibleDialogBody` (no className) and `AccessibleDialogFooter`. Cancel becomes `AccessibleDialogCancel` with the caller's `cancelLabel`. Its click falls back to the dialog's `onClose`, the same function the old button called, and it is disabled while the dialog is `busy`, as the old `disabled={busy}` was.
- **K13, GB4 (§6.4 `:86`):** the confirm button gets `busy={busy}` and loses `disabled={busy}`, so focus stays on it while the caller saves. Its label does not change, and its variant still comes from `tone`.
- **§4.14 note "3", F2, §4.13:** the textarea becomes `Textarea` inside `Field label={fieldLabel}`. It keeps `ref={inputRef}` (the dialog's `initialFocusRef`), `id={fieldId}`, `disabled={busy}`, `rows={4}`, `placeholder` and `min-h-28`. `mt-2`, the look classes and `disabled:opacity-60` go. The field has no `required`, so no star (F5).
- **Ruling (this plan), `onClose`:** `ConfirmTextForm` no longer uses `onClose` (the cancel part reads it from the dialog). The prop leaves its `Pick`, its destructuring and its call, or lint would warn about an unused variable. `ConfirmTextDialog`'s own props do not change.
- **§5.3:** `closeLabel?` stays an optional pass-through. Its only caller, `audit-findings-batch-actions.tsx:131`, drops `closeLabel={tCommon("close")}` in Task 6.
- **Ruling (this plan), the scripts:**
  - `p2c-budget.mjs` is plan 2C-2's script (`docs/superpowers/plans/2026-10-12-ui-phase2c-plan2.md` Task 1 Step 2), copied verbatim. It was run against `tests/form-migration-guards.test.ts` at `886a290` for Tasks 1–3. Every budget name it edits exists there, `--footer-done` removes a `PENDING_FOOTER_PARTS` line, a lowered row keeps its trailing comment, and the file keeps its line endings.
  - `p2c3-precheck.mjs` is new. It carries the `886a290` rows of all 9 batch-3 files and prints each file's live counts beside its budgets. Plan 2B-2 lowered several live counts below their rows without touching FMG (DH "Handed on to 2C plan 3"), so a task needs both numbers to predict its failing guard run.

What users will see (the only caller is the "อนุมัติที่เลือก" / "ปฏิเสธที่เลือก" dialog on `/audit/findings`):
- The remark field gets the 2A look: white, a 13px label above it, 44px tall with 16px text on phones.
- The footer is the shared bar and stays in view. On phones, cancel sits above confirm, as before. From `sm` the two buttons form a right-aligned row instead of two half-width buttons.
- While the review saves, the confirm button keeps focus and shows a spinner instead of fading. Cancel and the X are grey and do nothing.

Not in this task:
- `audit-findings-batch-actions.tsx` (Task 6: the caller and its `closeLabel`)
- messages: no key changes (no `messages-edit.mjs` run)
- no toast, `required`, `maxLength` or `disabled` gate changes (K4); do not run a formatter

**Files:**
- Modify: `src/components/ui/confirm-text-dialog.tsx` (CRLF, 4 replacements)
- Modify: `tests/confirm-text-dialog-ui.test.ts` (CRLF, 1 test appended)
- Modify: `tests/form-migration-guards.test.ts` (through the budget script only)
- Temp folder only, never committed: `p2c3-precheck.mjs`, `p2c-budget.mjs` (Tasks 2–9 reuse both)

**Must keep passing without edits:**
- `tests/confirm-text-dialog-ui.test.ts:5-13`: `<AccessibleDialog`, `initialFocusRef={inputRef}` and `busy={busy}` stay; no `onKeyDown=`, `restoreFocusRef` or `role="dialog"`. `:15-24` reads the two callers, which this task does not touch.
- `tests/accessible-dialog.test.ts:70-73`: the props type keeps the lines `  description?: ReactNode` and `  closeLabel?: string`.
- `tests/list-pages-ui.test.ts:251`: `<ConfirmTextDialog` followed by a line break in `audit-findings-batch-actions.tsx`.

**Interfaces:**
- Consumes:
  - 2C-0: `AccessibleDialogBody`, `AccessibleDialogFooter`, `AccessibleDialogCancel` (default label `tCommon("cancel")`, click `onClick ?? dialog.onClose`, disabled while the dialog is `busy`) and `accessibleDialogFormClasses`, all from `@/components/ui/accessible-dialog`.
  - 2A: `Field` from `@/components/ui/field` (`label` first; one element child, whose own `id` it keeps); `Textarea` from `@/components/ui/textarea`; `Button` with `busy` from `@/components/ui/button`.
  - Plans 1 and 2: the guard file with their 34 files in `MIGRATED_FILES`, and the batch-3 rows of spec §9.4 untouched (the precheck confirms both).
- Produces (Tasks 2–9 rely on these):
  - `ui/confirm-text-dialog.tsx` is the last line of `MIGRATED_FILES` (35 files) and out of `PENDING_FOOTER_PARTS` (9 entries left). It has no entry in any budget.
  - `ConfirmTextDialog`'s props are unchanged (`closeLabel?` is still optional), so Task 6 edits only its caller.
  - `<temp>/p2c3-precheck.mjs` and `<temp>/p2c-budget.mjs`.

| file | `RAW_FIELDS` | `FIELD_CLASS_STRINGS` | `PENDING_FOOTER_PARTS` | `CONSTRAINT_FLOORS` |
|---|---|---|---|---|
| `ui/confirm-text-dialog.tsx` | 1 → – | 1 → – | listed → removed | no row |

- [ ] **Step 1: Check what this task builds on**

Save this script as `p2c3-precheck.mjs` in your temp folder (never in the repo). Tasks 2–9 run it with their own file; the controller runs it with no argument in Task 0 Step 5:

```js
// p2c3-precheck.mjs: run from the worktree root. Reads only; writes nothing. Never commit this file.
//   node <temp>/p2c3-precheck.mjs                                  every batch-3 row not migrated yet (Task 0 Step 5)
//   node <temp>/p2c3-precheck.mjs <path under src/components/>     one batch-3 file, before its own task
// Confirms that plans 1 and 2 are merged, that the primitives batch 3 uses are there, and that the guard file still
// holds the file's row as it was at 886a290 (budgets, GF5 floors, PENDING_FOOTER_PARTS). Beside each budget it prints
// the live count, read the way tests/form-migration-guards.test.ts reads it, so the task can predict its failing run.
import { existsSync, readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

const C = "src/components/"
const GUARD = "tests/form-migration-guards.test.ts"
const { findJsxTags, hasJsxAttr, jsxAttrValue } = await import(pathToFileURL(`${process.cwd()}/tests/helpers/source-files.ts`).href)

// FMG rows of the 9 batch-3 files at 886a290 (spec §9.4 seeds; plan 2B-2 lowered live counts, never a row).
// A budget left out is 0. floors = CONSTRAINT_FLOORS [required, maxLength, minLength] (null = no row).
const SEEDS = {
  "ui/confirm-text-dialog.tsx": { RAW_FIELDS: 1, FIELD_CLASS_STRINGS: 1, floors: null, pending: true },
  "disposal/disposal-bulk-approval.tsx": { RAW_FIELDS: 1, FIELD_CLASS_STRINGS: 1, OLD_MARKUP: 3, LOADER2: 4, floors: [0, 1, 0], pending: true },
  "disposal/disposal-bulk-execution.tsx": { RAW_FIELDS: 5, FIELD_CLASS_STRINGS: 5, OLD_MARKUP: 5, LOADER2: 2, REVERSE: 1, floors: [5, 2, 1], pending: true },
  "audit/audit-round-form.tsx": { LOCAL_FIELD: 1, RAW_FIELDS: 6, FIELD_CLASS_STRINGS: 6, OLD_MARKUP: 3, LOADER2: 2, floors: [7, 1, 0], pending: false },
  "audit/audit-round-cancel-button.tsx": { RAW_FIELDS: 1, FIELD_CLASS_STRINGS: 1, LOADER2: 2, floors: [1, 0, 0], pending: true },
  "audit/audit-findings-batch-actions.tsx": { OLD_MARKUP: 1, LOADER2: 2, floors: null, pending: false },
  "audit/audit-scan-room-picker.tsx": { RAW_FIELDS: 2, floors: null, pending: false },
  "audit/audit-scan-check-panel.tsx": { floors: null, pending: false },
  "maintenance/maintenance-plan-state-actions.tsx": { LOADER2: 1, REVERSE: 1, floors: null, pending: true },
}
const BUDGETS = ["LOCAL_FIELD", "RAW_FIELDS", "FIELD_CLASS_STRINGS", "OLD_MARKUP", "LOADER2", "REVERSE", "OLD_HELPERS", "FIXED_BOTTOM_BARS", "CLOSE_LABEL_IS_CANCEL"]

// The guard's own definitions (tests/form-migration-guards.test.ts at 886a290), copied so the live counts match it.
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

const arg = process.argv[2]
if (arg !== undefined && !SEEDS[arg]) {
  console.error(`usage: node p2c3-precheck.mjs [one of: ${Object.keys(SEEDS).join(", ")}]`)
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

// The lines of `const NAME ...` up to the line that closes it at column 0.
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
const before = batchFiles(["1a", "1b", "1c", "1d", "1g", "1e", "1f", "2"])
const batch3 = batchFiles(["3"])
// Without an argument, the rows of files this plan already migrated are skipped (their tasks changed them on purpose).
const done = arg ? [] : Object.keys(SEEDS).filter((file) => listed("MIGRATED_FILES", file))
const files = arg ? [arg] : Object.keys(SEEDS).filter((file) => !done.includes(file))

const dialog = ui("accessible-dialog.tsx")
const field = ui("field.tsx")
const checks = {
  "2C-0 dialog parts: AccessibleDialogBody, AccessibleDialogFooter, AccessibleDialogCancel, accessibleDialogFormClasses": ["AccessibleDialogBody", "AccessibleDialogFooter", "AccessibleDialogCancel"].every((name) => new RegExp(String.raw`export function ${name}\(`).test(dialog)) && /export const accessibleDialogFormClasses = "flex min-h-0 flex-1 flex-col"/.test(dialog),
  "2C-0 AccessibleDialog: description?: ReactNode, closeLabel?: string, busy-aware cancel": /description\?: ReactNode/.test(dialog) && /closeLabel\?: string/.test(dialog) && /disabled=\{dialog\.busy \|\| disabled\} onClick=\{onClick \?\? dialog\.onClose\}/.test(dialog),
  "2A Field (hint, hideLabel, id), FieldHint, FieldRequiredMark": /export \{[^}]*\bField\b[^}]*\bFieldHint\b[^}]*\bFieldRequiredMark\b[^}]*\}/.test(field) && ["hint", "hideLabel", "id"].every((prop) => new RegExp(String.raw`\b${prop}\?: `).test(field)),
  "2A Input, NativeSelect, Textarea": /export \{ Input \}/.test(ui("input.tsx")) && /export \{ NativeSelect \}/.test(ui("native-select.tsx")) && /export \{ Textarea \}/.test(ui("textarea.tsx")),
  "2A checkboxVariants (md, lg) and fieldLabelClasses": /export const checkboxVariants = cva\(/.test(ui("field-variants.ts")) && /\blg: "size-5"/.test(ui("field-variants.ts")) && /export const fieldLabelClasses = "text-meta font-medium text-foreground"/.test(ui("field-variants.ts")),
  "2A Button with busy, and buttonVariants": /\bbusy\?: boolean\b/.test(ui("button.tsx")) && /export \{ Button, buttonVariants \}/.test(ui("button.tsx")),
  "2A Notice with a required tone": /export function Notice\(/.test(ui("notice.tsx")) && /\btone: NoticeTone\b/.test(ui("notice.tsx")),
  "2C-0 sheet: SheetContent, SheetHeader, SheetTitle": ["SheetContent", "SheetHeader", "SheetTitle"].every((name) => new RegExp(String.raw`\b${name}\b`).test(ui("sheet.tsx"))),
  "plans 1 and 2 merged: their 34 files are in MIGRATED_FILES": before.length === 34 && before.every((path) => listed("MIGRATED_FILES", path)),
  "BATCH_FILES \"3\" holds the 9 files of this plan": batch3.length === 9 && Object.keys(SEEDS).every((path) => batch3.includes(path)),
}
for (const file of files) {
  const seed = SEEDS[file]
  const wrong = BUDGETS.filter((name) => budget(name, file) !== (seed[name] ?? 0))
  checks[`${file}: not in MIGRATED_FILES yet`] = !listed("MIGRATED_FILES", file)
  checks[`${file}: budgets at their 886a290 row${wrong.length ? ` (differs: ${wrong.join(", ")})` : ""}`] = wrong.length === 0
  checks[`${file}: CONSTRAINT_FLOORS ${seed.floors ? seed.floors.join("/") : "no row"}`] = JSON.stringify(floorsOf(file)) === JSON.stringify(seed.floors)
  checks[`${file}: ${seed.pending ? "in" : "not in"} PENDING_FOOTER_PARTS`] = listed("PENDING_FOOTER_PARTS", file) === seed.pending
  checks[`${C}${file} exists`] = raw(C + file).length > 0
}

let missing = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok     " : "MISSING"} ${name}`)
  if (!ok) missing += 1
}
console.log(`info    ${GUARD}: ${eol(guardRaw)}`)
for (const file of done) console.log(`info    ${file}: migrated by this plan already, row not checked`)
for (const file of files) {
  const source = read(C + file)
  const live = BUDGETS.filter((name) => budget(name, file) > 0 || LIVE[name](source) > 0).map((name) => `${name} ${budget(name, file)}/${LIVE[name](source)}`)
  const tags = findJsxTags(source, CONSTRAINT_TAGS)
  const floors = ["required", "maxLength", "minLength"].map((attr) => tags.filter((tag) => hasJsxAttr(tag.text, attr)).length)
  const dialogs = `AccessibleDialog ${findJsxTags(source, ["AccessibleDialog"]).length} · AccessibleDialogFooter ${findJsxTags(source, ["AccessibleDialogFooter"]).length}`
  console.log(`info    ${file}: ${eol(raw(C + file))} · budget/live ${live.length ? live.join(" · ") : "none"} · floors live ${floors.join("/")} · ${dialogs}`)
}
if (missing > 0) {
  console.error(`ABORT: ${missing} precondition(s) failed. Do not start; report which.`)
  process.exit(1)
}
console.log(`preconditions hold for ${arg ?? `the ${files.length} batch-3 files not migrated yet`}`)
```

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2c-plan3`

Run: `git status --short src tests messages`, then `git ls-files --eol src/components/ui/confirm-text-dialog.tsx tests/confirm-text-dialog-ui.test.ts tests/form-migration-guards.test.ts`
Expected: `git status` prints nothing. All three files show `i/lf w/crlf`: with `core.autocrlf=true`, the worktree checked every text file out as CRLF. Keep what you find.

Run: `node --no-warnings <temp>/p2c3-precheck.mjs ui/confirm-text-dialog.tsx`
(`--no-warnings` hides Node's `MODULE_TYPELESS_PACKAGE_JSON` notice, which appears because the script imports `tests/helpers/source-files.ts`.)
Expected:
```
ok      2C-0 dialog parts: AccessibleDialogBody, AccessibleDialogFooter, AccessibleDialogCancel, accessibleDialogFormClasses
ok      2C-0 AccessibleDialog: description?: ReactNode, closeLabel?: string, busy-aware cancel
ok      2A Field (hint, hideLabel, id), FieldHint, FieldRequiredMark
ok      2A Input, NativeSelect, Textarea
ok      2A checkboxVariants (md, lg) and fieldLabelClasses
ok      2A Button with busy, and buttonVariants
ok      2A Notice with a required tone
ok      2C-0 sheet: SheetContent, SheetHeader, SheetTitle
ok      plans 1 and 2 merged: their 34 files are in MIGRATED_FILES
ok      BATCH_FILES "3" holds the 9 files of this plan
ok      ui/confirm-text-dialog.tsx: not in MIGRATED_FILES yet
ok      ui/confirm-text-dialog.tsx: budgets at their 886a290 row
ok      ui/confirm-text-dialog.tsx: CONSTRAINT_FLOORS no row
ok      ui/confirm-text-dialog.tsx: in PENDING_FOOTER_PARTS
ok      src/components/ui/confirm-text-dialog.tsx exists
info    tests/form-migration-guards.test.ts: CRLF
info    ui/confirm-text-dialog.tsx: CRLF · budget/live RAW_FIELDS 1/1 · FIELD_CLASS_STRINGS 1/1 · floors live 0/0/0 · AccessibleDialog 1 · AccessibleDialogFooter 0
preconditions hold for ui/confirm-text-dialog.tsx
```
`budget/live` is the guard's row, then the count the guard reads in the file today. On any `MISSING` line, stop and report it.

With no argument, the script checks the row of every batch-3 file that is not in `MIGRATED_FILES` yet. At `886a290` (Task 0 Step 5) it prints 55 `ok` lines (the 10 shared checks, then 5 per file in the order of `SEEDS`) and then:
```
info    tests/form-migration-guards.test.ts: CRLF
info    ui/confirm-text-dialog.tsx: CRLF · budget/live RAW_FIELDS 1/1 · FIELD_CLASS_STRINGS 1/1 · floors live 0/0/0 · AccessibleDialog 1 · AccessibleDialogFooter 0
info    disposal/disposal-bulk-approval.tsx: CRLF · budget/live RAW_FIELDS 1/1 · FIELD_CLASS_STRINGS 1/1 · OLD_MARKUP 3/1 · LOADER2 4/3 · floors live 0/1/0 · AccessibleDialog 1 · AccessibleDialogFooter 0
info    disposal/disposal-bulk-execution.tsx: CRLF · budget/live RAW_FIELDS 5/5 · FIELD_CLASS_STRINGS 5/5 · OLD_MARKUP 5/3 · LOADER2 2/2 · REVERSE 1/1 · floors live 5/2/1 · AccessibleDialog 1 · AccessibleDialogFooter 0
info    audit/audit-round-form.tsx: CRLF · budget/live LOCAL_FIELD 1/1 · RAW_FIELDS 6/6 · FIELD_CLASS_STRINGS 6/6 · OLD_MARKUP 3/3 · LOADER2 2/2 · floors live 7/1/0 · AccessibleDialog 0 · AccessibleDialogFooter 0
info    audit/audit-round-cancel-button.tsx: CRLF · budget/live RAW_FIELDS 1/1 · FIELD_CLASS_STRINGS 1/1 · LOADER2 2/2 · floors live 1/0/0 · AccessibleDialog 1 · AccessibleDialogFooter 0
info    audit/audit-findings-batch-actions.tsx: CRLF · budget/live OLD_MARKUP 1/0 · LOADER2 2/0 · floors live 0/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0
info    audit/audit-scan-room-picker.tsx: CRLF · budget/live RAW_FIELDS 2/2 · floors live 0/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0
info    audit/audit-scan-check-panel.tsx: CRLF · budget/live none · floors live 0/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0
info    maintenance/maintenance-plan-state-actions.tsx: CRLF · budget/live LOADER2 1/1 · REVERSE 1/1 · floors live 0/0/0 · AccessibleDialog 1 · AccessibleDialogFooter 0
preconditions hold for the 9 batch-3 files not migrated yet
```

- [ ] **Step 2: Save the budget script**

Every migration commit lowers its own file's budgets, adds the file to `MIGRATED_FILES` and, once its dialog uses the footer part, takes it out of `PENDING_FOOTER_PARTS` (spec §9.9). Two budget objects can hold the same line text for one file (`RAW_FIELDS` and `FIELD_CLASS_STRINGS` both hold `1` for this dialog), so exact-string edits cannot target them. This script edits by object name instead. It checks each current value against the number you pass and writes nothing on a mismatch. It is plan 2C-2's script, unchanged. Save it as `p2c-budget.mjs` in your temp folder (never in the repo):

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

`NAME=from:to` lowers the entry from `from` to `to`, and `to = 0` deletes the line. Any budget that still holds a number for the file must be named, so no row is forgotten. Use `:` and not `>`, because the shell reads `>` as a redirect. `--footer-done` removes the file from `PENDING_FOOTER_PARTS`; the five batch-3 files in that set pass it (Tasks 1, 2, 3, 5 and 9). The script never rewrites a row's comment: when a row is lowered but kept, the task fixes the comment with one exact replacement (Tasks 2 and 3).

- [ ] **Step 3: Lower the dialog's budgets (the failing guard)**

Run: `node --no-warnings <temp>/p2c-budget.mjs ui/confirm-text-dialog.tsx RAW_FIELDS=1:0 FIELD_CLASS_STRINGS=1:0 --footer-done`
Expected:
```
RAW_FIELDS: 1 -> 0
FIELD_CLASS_STRINGS: 1 -> 0
PENDING_FOOTER_PARTS: removed ui/confirm-text-dialog.tsx
MIGRATED_FILES: added ui/confirm-text-dialog.tsx
```
On `ABORT`, stop and report the lines it prints.

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL, `tests 23 · pass 20 · fail 3`. Each failing guard names only `src/components/ui/confirm-text-dialog.tsx`:
- GF2 `1 > 0`
- GF3 `1 > 0`
- GD2 `1 AccessibleDialog, 0 AccessibleDialogFooter`

- [ ] **Step 4: Append the failing test to `tests/confirm-text-dialog-ui.test.ts`**

The file reads its sources without stripping `\r`; the new test strips them itself before its multi-line regexes. One exact replacement at the end of the file (`:22-24`):

Replace:

```ts
  assert.doesNotMatch(batchSource, /window\.prompt/)
  assert.doesNotMatch(componentSource, /window\.prompt/)
})
```

with:

```ts
  assert.doesNotMatch(batchSource, /window\.prompt/)
  assert.doesNotMatch(componentSource, /window\.prompt/)
})

// Phase 2C batch 3 (spec 2C §5.5 row 22, §8.9): the form wraps the dialog parts, the label comes from Field, and the
// confirm button shows busy instead of turning disabled, so focus stays on it while the caller works.
test("the confirmation dialog uses the dialog parts, a shared field and a busy confirm button (2C batch 3)", () => {
  const source = readFileSync("src/components/ui/confirm-text-dialog.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /<form onSubmit=\{handleSubmit\} className=\{accessibleDialogFormClasses\}>\n\s+<AccessibleDialogBody>\n\s+<Field label=\{fieldLabel\}>\n\s+<Textarea\n\s+ref=\{inputRef\}\n\s+id=\{fieldId\}/)
  assert.match(source, /<AccessibleDialogFooter>\n\s+<AccessibleDialogCancel>\{cancelLabel\}<\/AccessibleDialogCancel>\n\s+<Button type="submit" variant=\{confirmVariantByTone\[tone\]\} busy=\{busy\}>\{confirmLabel\}<\/Button>\n\s+<\/AccessibleDialogFooter>/)
  assert.doesNotMatch(source, /<textarea|<label|disabled:opacity|grid-cols-2|onClick=\{onClose\}/)
  assert.doesNotMatch(source, /<Button[^>]*\sdisabled=/, "cancel is disabled by the dialog while busy; the confirm button keeps focus")
})
```

Run: `node --test tests/confirm-text-dialog-ui.test.ts`
Expected: FAIL, `tests 3 · pass 2 · fail 1`. The new test fails first on the `<form onSubmit={handleSubmit} className={accessibleDialogFormClasses}>` regex.

- [ ] **Step 5: Move the dialog onto the parts (`src/components/ui/confirm-text-dialog.tsx`)**

Four exact replacements.

(1) Imports (`:3-5`): the dialog parts, `Field` and `Textarea` come in.

Replace:

```tsx
import { useId, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react"
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
```

with:

```tsx
import { useId, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react"
import {
  AccessibleDialog,
  AccessibleDialogBody,
  AccessibleDialogCancel,
  AccessibleDialogFooter,
  accessibleDialogFormClasses,
} from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
```

(2) The form no longer gets `onClose` (`:41`).

Replace:

```tsx
      <ConfirmTextForm {...formProps} busy={busy} inputRef={inputRef} onClose={onClose} />
```

with:

```tsx
      <ConfirmTextForm {...formProps} busy={busy} inputRef={inputRef} />
```

(3) `ConfirmTextForm`'s props (`:54-60`).

Replace:

```tsx
  inputRef,
  onClose,
  onConfirm,
}: Pick<
  ConfirmTextDialogProps,
  "fieldLabel" | "placeholder" | "confirmLabel" | "cancelLabel" | "defaultValue" | "tone" | "onClose" | "onConfirm"
> & { busy: boolean; inputRef: RefObject<HTMLTextAreaElement | null> }) {
```

with:

```tsx
  inputRef,
  onConfirm,
}: Pick<
  ConfirmTextDialogProps,
  "fieldLabel" | "placeholder" | "confirmLabel" | "cancelLabel" | "defaultValue" | "tone" | "onConfirm"
> & { busy: boolean; inputRef: RefObject<HTMLTextAreaElement | null> }) {
```

(4) The form, the field and the footer (`:70-88`).

Replace:

```tsx
    <form onSubmit={handleSubmit}>
      <div className="px-4 py-4">
        <label htmlFor={fieldId} className="text-sm font-medium text-foreground">{fieldLabel}</label>
        <textarea
          ref={inputRef}
          id={fieldId}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={busy}
          rows={4}
          placeholder={placeholder}
          className="mt-2 min-h-28 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring disabled:opacity-60"
        />
      </div>
      <div className="grid gap-2 border-t border-border bg-background px-4 py-4 sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>{cancelLabel}</Button>
        <Button type="submit" variant={confirmVariantByTone[tone]} disabled={busy}>{confirmLabel}</Button>
      </div>
    </form>
```

with:

```tsx
    <form onSubmit={handleSubmit} className={accessibleDialogFormClasses}>
      <AccessibleDialogBody>
        <Field label={fieldLabel}>
          <Textarea
            ref={inputRef}
            id={fieldId}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            disabled={busy}
            rows={4}
            placeholder={placeholder}
            className="min-h-28"
          />
        </Field>
      </AccessibleDialogBody>
      <AccessibleDialogFooter>
        <AccessibleDialogCancel>{cancelLabel}</AccessibleDialogCancel>
        <Button type="submit" variant={confirmVariantByTone[tone]} busy={busy}>{confirmLabel}</Button>
      </AccessibleDialogFooter>
    </form>
```

Check: `grep -n "<textarea\|<label\|<button\|disabled=\|onClose" src/components/ui/confirm-text-dialog.tsx` prints 4 lines: `29:` (the `onClose` prop type), `35:` (`export function ConfirmTextDialog(…)`), `47:` (`onClose={onClose}` on `AccessibleDialog`) and `85:` (`disabled={busy}` on the `Textarea`, not on a button).

- [ ] **Step 6: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/confirm-text-dialog-ui.test.ts tests/accessible-dialog.test.ts tests/list-pages-ui.test.ts tests/ui-overlay-guards.test.ts`
Expected: PASS, `tests 75 · pass 75 · fail 0`.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, 1 test more than at `886a290`: 1928 tests, 1927 pass, 1 skipped.
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- `git diff --stat` shows exactly 3 files: `src/components/ui/confirm-text-dialog.tsx` with 30 insertions and 22 deletions, `tests/confirm-text-dialog-ui.test.ts` with 10 insertions, and `tests/form-migration-guards.test.ts` with 1 insertion and 3 deletions.
- `git status` lists the same 3 files and nothing else.
- A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/confirm-text-dialog.tsx tests/confirm-text-dialog-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): confirm text dialog on the dialog parts with a busy confirm button (2C batch 3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the plan 3 dev-app check (Task 10):**
- `/th/audit/findings` at 375 and 1440: tick one pending finding, press "อนุมัติที่เลือก", then cancel (never confirm). The remark field is 44px with 16px text at 375 and 40px at 1440, its label 13px. At 375 cancel sits above the confirm button, full width; at 1440 they form a right-aligned row. The X reads "ปิด" (NVDA), Esc closes the dialog, and focus returns to "อนุมัติที่เลือก".
- The busy look cannot be seen without saving a review; the new test and guard GB4 pin it.

---

### Task 2: Batch 3 · `disposal/disposal-bulk-approval.tsx` (the dialog only)

Spec §8.9 row `disposal-bulk-approval.tsx` ("dialog only", O4), with §5.5 row 13, §5.3 (the `:539` row), §6.3 #98–#100 (I25: they follow §5.5), §6.5.3 (the status lines), §4.3 F6 (this file is the spec's example of a two-line hint), §4.13, §9.4, I27 and I35. At `886a290` the dialog is `DisposalBulkApprovalDialog` `:511`, its `AccessibleDialog` `:539-569`, the form `:550`, the status lines `:552-553`, the remark `:558` and the footer row `:562-566` (DH "Handed on to 2C plan 3"; the spec's numbers are from `5ffee76`). One file, one commit (I30). The file is CRLF; edit it with exact-string replacement only.

Rulings this task applies:
- **O4, 2B fence:** only the import block and `DisposalBulkApprovalDialog` change. The list part plan 2B-2 moved (`DisposalBulkSelectionToggle` through `DisposalBulkApprovalCheckbox`, `:394-509`) and the helpers below the dialog (`BulkSummary`, `Metric`, `ResultDetails`, `groupByCode`) stay byte for byte. LFG keeps its `Metric` row for this file (LS1 `KEEP`).
- **§5.5 row 13, I25 (rows #98–#100 follow §5):** layout A. The footer is `AccessibleDialogCancel` (label `dialogState === "result" ? copy.close : copy.cancel`), then, in `preview` with an error, `Button variant="outline"` retry with `disabled={eligible.length === 0}`, then, in `preview` or `committing`, `Button type="submit"` with its `CheckSquare2` icon, `busy={dialogState === "committing"}` and `disabled={eligible.length === 0}`.
  - The approve button now stays on screen while the approval commits (it used to vanish, which dropped focus to the page), so focus stays on it (ด13).
  - Retry drops `busy ||` from `disabled`. It shows only in `preview`, where `busy` is always false, so nothing changes for users.
- **§5.3:** `closeLabel={copy.close}` goes; `copy.close` is "ปิด", the X's default. The `close` key stays in `DisposalBulkApprovalCopy` because the result screen's cancel button reads it.
- **I27, GB2 (§6.5.3):** the two status-line spinners in the body stay and get `motion-reduce:animate-none`. The spinner inside the approve button goes; `Button busy` draws its own.
- **§4.3 F6, §4.13:** the shared remark becomes `Field` + `Textarea`, with both help lines in `hint` as two block spans (the spec's example for this file). `maxLength={4000}`, `rows={4}`, `disabled={busy}` and `min-h-28` stay. No `required`, so no star; the GF5 floor `0/1/0` holds.
- **I35:** the zero-eligible box (`:557`, a `<p role="alert">` on `bg-warning-soft`) and the error line (`:561`) stay as they are. Only the bulk execution dialog's zero-eligible button label becomes a `Notice` (§5.7, Task 3); the 2D notice sweep takes this box.
- **Ruling (this plan), plan 2B-2's pins:** `tests/disposal-bulk-approval.test.ts:176-178` pinned this dialog as it was "for 2C plan 3" (3 spinners and the old label span). This task rewrites those three lines to the new end state and the comment `:159-160`. The list assertions `:161-175` stay untouched.
- **Ruling (this plan), FMG rows:** at `886a290` two rows of this file are above the live counts, because 2B-2 lowered counts and never edits FMG: `OLD_MARKUP` 3 (live 1, the label span `:558`) and `LOADER2` 4 (live 3, `:552`, `:553`, `:565`). This task lowers them to what stays: `OLD_MARKUP` → –, `LOADER2` → 2. The kept `LOADER2` row's comment named the old lines, so one exact replacement rewrites it.

What users will see (bulk approval on `/disposal`, pending queue):
- The footer is the shared bar and stays in view under a scrolling body. On phones cancel sits above the approve button; from `sm` they form a right-aligned row. Buttons are 44px on phones and 40px on desktop.
- While the approval commits, "ยืนยันอนุมัติ N รายการ" stays where it was with a spinner instead of disappearing; cancel and the X are grey.
- The remark field gets the 2A look with a 13px label; its two help lines are 13px faint text under the field, and screen readers read them with it.
- Retry is a plain outline button (it had blue text).
- The status-line spinners stop for users who reduce motion.

Not in this task:
- the list part (2B-2) and the toolbar's inline retry link `:432`
- `BulkSummary`, `Metric` and `ResultDetails` (2D panels; LFG `KEEP`)
- the zero-eligible box `:557` and the error line `:561` (I35)
- messages: no key changes
- no toast, `required`, `maxLength` or `disabled` gate changes (K4); do not run a formatter

**Files:**
- Modify: `src/components/disposal/disposal-bulk-approval.tsx` (CRLF, 5 replacements)
- Modify: `tests/disposal-bulk-approval.test.ts` (CRLF, 2 replacements: the comment `:159-160`, and `:176-179` with 1 test appended after it)
- Modify: `tests/form-migration-guards.test.ts` (the budget script, then 1 exact replacement of the `LOADER2` row's comment)

**Must keep passing without edits:**
- `tests/disposal-bulk-approval.test.ts:76-87`: `<AccessibleDialog[\s\S]*?busy=\{busy\}`, `returnFocusRef={triggerRef}`, `fallbackFocusRef={restoreTargetRef}`, `size="xl"`, `data-disposal-bulk-dialog="true"`, and no `tabIndex={-1}` between `function DisposalBulkApprovalDialog` and the next function.
- `:89-111`: the list's `min-h-11 min-w-11` targets and `checkboxVariants(`; `copy.sharedRemarkHelp`, `copy.remarkLimit`, `copy.committing`, `copy.zeroEligible`, `copy.retry`, `copy.errors[code]`; no `useTranslations`.
- `:138-147`: `confirm({ title: copy.discardSelection` with `title` first (ด22); `:161-175`: the 2B-2 list pins, including the two `import` lines of `Button` and `checkboxVariants`, which stay on lines of their own.
- `tests/visual-foundation-guards.test.ts:27` (the provider wrapper's `tabIndex={-1} className={cn("outline-none", className)}`), `tests/ui-overlay-guards.test.ts:38-48` (`shouldGuardLinkClick(` and `confirm({`), `tests/list-frame-guards.test.ts` (never edit it).

**Interfaces:**
- Consumes:
  - Task 1: `<temp>/p2c3-precheck.mjs` and `<temp>/p2c-budget.mjs`. If either is missing, save it again from Task 1 Step 1 or Step 2.
  - 2C-0: the dialog parts and `accessibleDialogFormClasses` (as in Task 1).
  - 2A: `Field` (`label`, `hint`), `Textarea`, `Button` (`variant`, `busy`).
- Produces:
  - `disposal/disposal-bulk-approval.tsx` is the last line of `MIGRATED_FILES` (36 files) and out of `PENDING_FOOTER_PARTS` (8 left). Its only rows left are `LOADER2` 2 (the status lines `:559`, `:560` after this task) and `CONSTRAINT_FLOORS` `[0, 1, 0]`.
  - `DisposalBulkApprovalCopy` and every export of the file are unchanged.

| file | `RAW_FIELDS` | `FIELD_CLASS_STRINGS` | `OLD_MARKUP` | `LOADER2` | `PENDING_FOOTER_PARTS` | `CONSTRAINT_FLOORS` |
|---|---|---|---|---|---|---|
| `disposal/disposal-bulk-approval.tsx` | 1 → – | 1 → – | 3 (live 1) → – | 4 (live 3) → 2 | listed → removed | 0/1/0 unchanged |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `git ls-files --eol src/components/disposal/disposal-bulk-approval.tsx tests/disposal-bulk-approval.test.ts`, then `node --no-warnings <temp>/p2c3-precheck.mjs disposal/disposal-bulk-approval.tsx`
Expected: `git status` prints nothing; both files `i/lf w/crlf`. The script prints:
```
ok      2C-0 dialog parts: AccessibleDialogBody, AccessibleDialogFooter, AccessibleDialogCancel, accessibleDialogFormClasses
ok      2C-0 AccessibleDialog: description?: ReactNode, closeLabel?: string, busy-aware cancel
ok      2A Field (hint, hideLabel, id), FieldHint, FieldRequiredMark
ok      2A Input, NativeSelect, Textarea
ok      2A checkboxVariants (md, lg) and fieldLabelClasses
ok      2A Button with busy, and buttonVariants
ok      2A Notice with a required tone
ok      2C-0 sheet: SheetContent, SheetHeader, SheetTitle
ok      plans 1 and 2 merged: their 34 files are in MIGRATED_FILES
ok      BATCH_FILES "3" holds the 9 files of this plan
ok      disposal/disposal-bulk-approval.tsx: not in MIGRATED_FILES yet
ok      disposal/disposal-bulk-approval.tsx: budgets at their 886a290 row
ok      disposal/disposal-bulk-approval.tsx: CONSTRAINT_FLOORS 0/1/0
ok      disposal/disposal-bulk-approval.tsx: in PENDING_FOOTER_PARTS
ok      src/components/disposal/disposal-bulk-approval.tsx exists
info    tests/form-migration-guards.test.ts: CRLF
info    disposal/disposal-bulk-approval.tsx: CRLF · budget/live RAW_FIELDS 1/1 · FIELD_CLASS_STRINGS 1/1 · OLD_MARKUP 3/1 · LOADER2 4/3 · floors live 0/1/0 · AccessibleDialog 1 · AccessibleDialogFooter 0
preconditions hold for disposal/disposal-bulk-approval.tsx
```
On any `MISSING` line, stop and report it.

- [ ] **Step 2: Lower the file's budgets (the failing guard)**

Run: `node --no-warnings <temp>/p2c-budget.mjs disposal/disposal-bulk-approval.tsx RAW_FIELDS=1:0 FIELD_CLASS_STRINGS=1:0 OLD_MARKUP=3:0 LOADER2=4:2 --footer-done`
Expected:
```
RAW_FIELDS: 1 -> 0
FIELD_CLASS_STRINGS: 1 -> 0
OLD_MARKUP: 3 -> 0
LOADER2: 4 -> 2
PENDING_FOOTER_PARTS: removed disposal/disposal-bulk-approval.tsx
MIGRATED_FILES: added disposal/disposal-bulk-approval.tsx
```

Then rewrite the kept `LOADER2` row's comment in `tests/form-migration-guards.test.ts` (one exact replacement; the line numbers are the status lines after Step 4):

Replace:

```ts
  [`${C}disposal/disposal-bulk-approval.tsx`]: 2, // → 3: :424 (2B) and the status lines :546, :547
```

with:

```ts
  [`${C}disposal/disposal-bulk-approval.tsx`]: 2, // the status lines :559, :560 in the dialog body (I27)
```

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL, `tests 23 · pass 17 · fail 6`. Each failing guard names only `src/components/disposal/disposal-bulk-approval.tsx`:
- GF2 `1 > 0`, GF3 `1 > 0`, GF7 `1 > 0`
- GB1 `3 > 2`
- GB2 `:552` and `:553` (the status-line spinners have no `motion-reduce:animate-none`)
- GD2 `1 AccessibleDialog, 0 AccessibleDialogFooter`

- [ ] **Step 3: Update plan 2B-2's dialog pins and append the failing test (`tests/disposal-bulk-approval.test.ts`)**

The file reads most sources without stripping `\r`; both changed tests strip them before their multi-line regexes. Two exact replacements.

(1) The comment above 2B-2's list test (`:159-160`).

Replace:

```ts
// Plan 2B-2 Task 1 (spec 2B §8.6 row 3, §8.11 row 3): 2B owns only the list part of this 2C batch 3 file. The dialog
// (DisposalBulkApprovalDialog and the helpers below it) stays as it is for 2C plan 3.
```

with:

```ts
// Plan 2B-2 Task 1 (spec 2B §8.6 row 3, §8.11 row 3): 2B owns only the list part of this 2C batch 3 file. The dialog
// (DisposalBulkApprovalDialog and the helpers below it) belongs to 2C plan 3, which checks it in the next test.
```

(2) The end of 2B-2's list test (`:176-179`), and the new test after it.

Replace:

```ts
  // The dialog keeps its buttons and status lines for 2C plan 3 (FMG GF7 and GB1 of this file drop to 1 and 3, as spec §8.6 says).
  assert.equal(dialog.match(/<Loader2\b/g)?.length, 3)
  assert.match(dialog, /<span className="mb-1\.5 block text-sm font-medium text-foreground">\{copy\.sharedRemark\}<\/span>/)
})
```

with:

```ts
  // 2C plan 3 moved the dialog onto the dialog parts: its two status-line spinners stay (FMG GB1 2) and its old label went (GF7 0).
  assert.equal(dialog.match(/<Loader2\b/g)?.length, 2)
  assert.doesNotMatch(dialog, /mb-1\.5 block text-sm font-medium text-foreground/)
})

// Phase 2C batch 3 (spec 2C §5.5 row 13, §5.3, I25, I27, §4.3 F6): the dialog on the dialog parts. The approve button
// stays in place with busy while the commit runs, so focus stays on it; cancel and the X are off while busy.
test("bulk approval dialog uses the dialog parts, a shared remark field and a busy approve button (2C batch 3)", () => {
  const source = readFileSync("src/components/disposal/disposal-bulk-approval.tsx", "utf8").replace(/\r\n/g, "\n")
  const dialog = source.slice(source.indexOf("function DisposalBulkApprovalDialog"), source.indexOf("function BulkSummary"))

  assert.doesNotMatch(dialog, /closeLabel=/, "the X takes its name from the dialog itself (spec §5.3)")
  assert.match(dialog, /<form data-disposal-bulk-dialog="true" onSubmit=\{handleSubmit\} className=\{accessibleDialogFormClasses\}>\n\s+<AccessibleDialogBody className="space-y-5">/)
  assert.equal(dialog.match(/<Loader2 className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none" \/>/g)?.length, 2, "the preview and commit status lines")
  assert.match(dialog, /<Field\n\s+label=\{copy\.sharedRemark\}\n\s+hint=\{<><span className="block">\{copy\.sharedRemarkHelp\}<\/span><span className="block">\{formatCopy\(copy\.remarkLimit, \{ count: approvalRemark\.length \}\)\}<\/span><\/>\}\n\s+>\n\s+<Textarea value=\{approvalRemark\} maxLength=\{4000\} rows=\{4\} disabled=\{busy\}/)
  assert.match(dialog, /<AccessibleDialogFooter>\n\s+<AccessibleDialogCancel>\{dialogState === "result" \? copy\.close : copy\.cancel\}<\/AccessibleDialogCancel>\n\s+\{dialogState === "preview" && error \? <Button variant="outline" onClick=\{\(\) => void commit\(\)\} disabled=\{eligible\.length === 0\}>\{copy\.retry\}<\/Button> : null\}\n\s+\{dialogState === "preview" \|\| dialogState === "committing" \? \(\n\s+<Button type="submit" busy=\{dialogState === "committing"\} disabled=\{eligible\.length === 0\}>\n\s+<CheckSquare2 aria-hidden="true" \/>/)
  assert.doesNotMatch(dialog, /<button\b|<textarea|<label|disabled:opacity-50|min-h-11/)
})
```

Run: `node --test tests/disposal-bulk-approval.test.ts`
Expected: FAIL, `tests 14 · pass 12 · fail 2`: 2B-2's list test (3 spinners found, 2 expected) and the new test (first on `closeLabel=`).

- [ ] **Step 4: Move the dialog onto the parts (`src/components/disposal/disposal-bulk-approval.tsx`)**

Five exact replacements.

(1) Imports (`:21-25`). The `Button` and `checkboxVariants` imports stay on lines of their own (2B-2 pins them).

Replace:

```tsx
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { checkboxVariants } from "@/components/ui/field-variants"
```

with:

```tsx
import {
  AccessibleDialog,
  AccessibleDialogBody,
  AccessibleDialogCancel,
  AccessibleDialogFooter,
  accessibleDialogFormClasses,
} from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Textarea } from "@/components/ui/textarea"
```

(2) The X takes its own name (`:544-546`).

Replace:

```tsx
      size="xl"
      closeLabel={copy.close}
      returnFocusRef={triggerRef}
```

with:

```tsx
      size="xl"
      returnFocusRef={triggerRef}
```

(3) The form, the body and the status lines (`:550-553`).

Replace:

```tsx
      <form data-disposal-bulk-dialog="true" onSubmit={handleSubmit}>
        <div className="space-y-5 p-4 sm:p-5">
          {dialogState === "previewing" ? <div className="flex min-h-24 items-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" />{copy.previewLoading}</div> : null}
          {dialogState === "committing" ? <div className="flex min-h-24 items-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" />{copy.committing}</div> : null}
```

with:

```tsx
      <form data-disposal-bulk-dialog="true" onSubmit={handleSubmit} className={accessibleDialogFormClasses}>
        <AccessibleDialogBody className="space-y-5">
          {dialogState === "previewing" ? <div className="flex min-h-24 items-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none" />{copy.previewLoading}</div> : null}
          {dialogState === "committing" ? <div className="flex min-h-24 items-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none" />{copy.committing}</div> : null}
```

(4) The shared remark (`:558`).

Replace:

```tsx
            {dialogState === "preview" ? <label className="block"><span className="mb-1.5 block text-sm font-medium text-foreground">{copy.sharedRemark}</span><textarea value={approvalRemark} maxLength={4000} rows={4} disabled={busy} onChange={(event) => setApprovalRemark(event.target.value)} className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring" /><span className="mt-1 block text-xs text-muted-foreground">{copy.sharedRemarkHelp}</span><span className="mt-1 block text-xs text-muted-foreground">{formatCopy(copy.remarkLimit, { count: approvalRemark.length })}</span></label> : null}
```

with:

```tsx
            {dialogState === "preview" ? (
              <Field
                label={copy.sharedRemark}
                hint={<><span className="block">{copy.sharedRemarkHelp}</span><span className="block">{formatCopy(copy.remarkLimit, { count: approvalRemark.length })}</span></>}
              >
                <Textarea value={approvalRemark} maxLength={4000} rows={4} disabled={busy} onChange={(event) => setApprovalRemark(event.target.value)} className="min-h-28" />
              </Field>
            ) : null}
```

(5) The footer (`:561-568`).

Replace:

```tsx
          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          <div className="flex flex-col justify-end gap-2 sm:flex-row">
            <button type="button" onClick={closeDialog} disabled={busy} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 sm:h-10 sm:min-h-0">{dialogState === "result" ? copy.close : copy.cancel}</button>
            {dialogState === "preview" && error ? <button type="button" onClick={() => void commit()} disabled={busy || eligible.length === 0} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 sm:h-10 sm:min-h-0">{copy.retry}</button> : null}
            {dialogState === "preview" ? <button type="submit" disabled={busy || eligible.length === 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 sm:h-10 sm:min-h-0">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare2 className="h-4 w-4" />}{formatCopy(copy.confirmApproval, { count: eligible.length })}</button> : null}
          </div>
        </div>
      </form>
```

with:

```tsx
          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
        </AccessibleDialogBody>
        <AccessibleDialogFooter>
          <AccessibleDialogCancel>{dialogState === "result" ? copy.close : copy.cancel}</AccessibleDialogCancel>
          {dialogState === "preview" && error ? <Button variant="outline" onClick={() => void commit()} disabled={eligible.length === 0}>{copy.retry}</Button> : null}
          {dialogState === "preview" || dialogState === "committing" ? (
            <Button type="submit" busy={dialogState === "committing"} disabled={eligible.length === 0}>
              <CheckSquare2 aria-hidden="true" />
              {formatCopy(copy.confirmApproval, { count: eligible.length })}
            </Button>
          ) : null}
        </AccessibleDialogFooter>
      </form>
```

Check: `grep -n "<textarea\|<label\|<button\|<Loader2\|closeLabel\|min-h-11" src/components/disposal/disposal-bulk-approval.tsx` prints 6 lines, all outside the dialog except the two status lines: `440:` (the toolbar's inline retry `<button>`, 2B-2), `460:` and `506:` (the list's checkbox `<label>`s), `497:` (the blocked-reason note), `559:` and `560:` (the status-line spinners with `motion-reduce:animate-none`).

- [ ] **Step 5: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/disposal-bulk-approval.test.ts tests/visual-foundation-guards.test.ts tests/ui-overlay-guards.test.ts tests/list-frame-guards.test.ts tests/list-pages-ui.test.ts`
Expected: PASS, `tests 126 · pass 126 · fail 0`.

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, 1 test more than after Task 1: 1929 tests, 1928 pass, 1 skipped.
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- exactly 3 files: `src/components/disposal/disposal-bulk-approval.tsx` with 32 insertions and 13 deletions, `tests/disposal-bulk-approval.test.ts` with 18 insertions and 4 deletions, `tests/form-migration-guards.test.ts` with 2 insertions and 5 deletions.
- `git status` lists the same 3 files and nothing else. A file with every line changed was normalized: restore its line endings first.

- [ ] **Step 7: Commit**

```bash
git add src/components/disposal/disposal-bulk-approval.tsx tests/disposal-bulk-approval.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): bulk approval dialog on the dialog parts with a busy approve button (2C batch 3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 3 dev-app check (Task 10):**
- Only if Task 0 Step 7 found pending disposal requests (the dev data of 2026-10-13 had none): on `/th/disposal` (pending queue) at 375 and 1440, tick one request and press "ตรวจสอบและอนุมัติ". The preview is a POST with `mode: "preview"` that only reads (`inspectDisposalApprovalRequests`); never press "ยืนยันอนุมัติ". Check: the footer stays in view while the body scrolls; at 375 cancel sits above the approve button, at 1440 a right-aligned row; the remark label is 13px and both help lines sit under the field; the X reads "ปิด"; Esc closes and focus returns to "ตรวจสอบและอนุมัติ".
- Otherwise record "not seen on dev" for Task 11; the new test and the guards pin the structure.

---

### Task 3: Batch 3 · `disposal/disposal-bulk-execution.tsx` (the dialog and `SharedValueFields`)

Spec §8.9 row `disposal-bulk-execution.tsx` (the dialog + `SharedValueFields`, the sticky footer → the footer part, O4), with §5.5 row 14, I25 and its rulings ด13–ด14, §5.3 (the `:818` row: keep `closeLabel`), §5.7 (the zero-eligible label), I35, §4.3 (F1, F2, F4, F5: the stars on `:880`, `:1032`, `:1042`, `:1056`; F6: `historicalHelpId`), §4.6 (K7), §4.12 (the 20px checkboxes), §4.13 (the `<fieldset disabled>` fields), §4.14 note "3", §6.5.3 (`BusyLabel`), §9.4 and §10.4 table A (`disposal-bulk-execution-ui.test.ts:31`). At `886a290` the dialog is `BulkExecutionDialog` `:734`, its `AccessibleDialog` `:802-976`, the form `:813`, the historical section `:852-903`, the permanent confirmation `:916-926`, the sticky footer `:929-974`, `BusyLabel` `:980` and `SharedValueFields` `:989` with its fieldset `:1019-1072` (DH "Handed on to 2C plan 3"). One file, one commit (I30). The file is CRLF; edit it with exact-string replacement only.

Rulings this task applies:
- **O4, 2B fence:** only the import block, `BulkExecutionDialog`, `BusyLabel` and `SharedValueFields` change. The list part 2B-2 moved (`DisposalBulkExecutionSelectionToggle` through `DisposalBulkExecutionCheckbox`, `:596-732`), the provider and the read-only helpers below `SharedValueFields` stay byte for byte.
- **§5.5 row 14, I25, ด13:** layout A; the body loses its own padding (`sm:px-6` becomes the part's 20px). The footer is:
  - `AccessibleDialogCancel` with `{previewing ? copy.cancelPreview : dialogState === "result" ? copy.close : copy.cancel}`. The dialog's `busy` is `committing`, so cancel stays usable while the preview runs (it cancels the preview, as before) and is shown grey during the commit instead of being hidden.
  - in `review` or `previewing`: `Button type="submit"` `{format(copy.confirm, { count: reviewedItems.length })}` with `busy={previewing}` and `disabled={!hasSharedValues}`;
  - in `preview` or `committing`: `Button type="submit"` `{format(copy.confirm, { count: eligible.length })}` with `busy={committing}` and `disabled={eligible.length === 0 || !permanentConfirmed}`;
  - in `result` with unresolved items: `Button onClick={retry}` `{copy.retry}`.
  - The button that starts the work stays in place with `busy` until the work ends, so focus does not drop to the page. The "กำลังบันทึก" div `:960-963` and its spinner go (GD3); the body's `aria-live` line `:820-824` still announces the state.
- **§5.3, ด8:** `closeLabel={previewing ? copy.cancelPreview : copy.close}` stays: while the preview runs, the X cancels it. `aria-busy={busy}` and `data-disposal-bulk-dialog` stay on the `<form>`.
- **§5.7, ด14, I35:** the zero-eligible sentence (66 Thai characters) leaves the button. In `preview` with no eligible request, the body shows `<Notice tone="warning" role="alert">{copy.zeroEligible}</Notice>`, and the button reads `format(copy.confirm, { count: 0 })` and cannot be pressed (`eligible.length === 0`).
- **§4.3, §4.6, §4.13:** `SharedValueFields` keeps its `<fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-3">`; its 4 labels become `Field` with `Input type="date"`, `NativeSelect` ×2 and `Input`. The date, executor and final status get `Field required` (their controls keep `required`), so they gain the star. The shared recipient keeps `maxLength={200}` and its help line becomes `hint`; its `sm:col-span-3` moves to `Field className`. The fields drop from 44px to 40px on desktop (K7) and take the 2A disabled look from the fieldset (no `opacity`).
- **§4.3 F4, F5:** the historical reason becomes `Field label={copy.historicalReason} required` + `Textarea`, keeping `minLength={20}`, `maxLength={2000}`, `required`, `aria-describedby={`${historicalWarningId} ${historicalHelpId}`}` and `min-h-28`. GF5's floor `5/2/1` holds (date, executor, status, reason, acknowledgement / reason, recipient / reason).
- **§4.3 F6 + ruling (this plan), the help line on the warning fill:** F6 makes the `historicalHelpId` line a `FieldHint` where it is. `FieldHint` is faint ink, and DESIGN.md §2 (Faint) never puts faint ink on a status soft fill; the historical section is `bg-warning-soft`. So both copies of the line (the reason's, and the one shown before the box is ticked; same id, same text) become `<FieldHint id={historicalHelpId} className="text-muted-foreground">`: 13px like every hint, in the muted ink they use today.
- **§4.12:** the three 20px checkboxes take `checkboxVariants({ size: "lg" })`; the permanent confirmation keeps its `mt-0.5` (`cn(checkboxVariants({ size: "lg" }), "mt-0.5")`). Their `<label>` rows (already `min-h-11`) and the two `aria-describedby` stay.
- **I27, GB2 (§6.5.3):** `BusyLabel`'s spinner stays and gets `motion-reduce:animate-none`.
- **§10.4 table A + ruling (this plan), the pins:** `tests/disposal-bulk-execution-ui.test.ts:31` changes as the spec says. Plan 2B-2's lines `:195-197` pinned the dialog as it was "for 2C plan 3" (2 spinners, 3 old checkbox classes); this task rewrites them, and the comment `:181-182`, to the new end state. The list assertions `:183-194` stay untouched.
- **Ruling (this plan), FMG rows:** `OLD_MARKUP` 5 (live 3, the three checkboxes) → –; `LOADER2` 2 (live 2) → 1 (`BusyLabel`), with its comment rewritten; `REVERSE` 1 → – (the footer's `flex-col-reverse`).

What users will see (bulk execution on `/disposal`, approved queue):
- The footer is the shared bar under a scrolling body; nothing slides over the content any more. On phones cancel sits above the confirm button; from `sm` they form a right-aligned row. Buttons are 44px on phones and 40px on desktop (they were 44 everywhere).
- "ยืนยันดำเนินการ N รายการ" stays in place with a spinner while the preview runs and while the commit runs. During the commit, cancel stays visible but grey (it used to vanish), and the footer no longer shows "กำลังบันทึกผลตัดจำหน่ายจริง" (the line in the body still does, and screen readers hear it).
- With no eligible request, an orange warning box in the body says so, and the button reads "ยืนยันดำเนินการ 0 รายการ" and cannot be pressed (the long sentence used to be the button label).
- The execution date, executor, final status and shared recipient get the 2A field look with 13px labels; the first three show the orange star. The recipient's help line is a 13px faint hint under the field.
- The historical exception fields: the reason gets the field look and a star; its counter line is 13px muted text; the checkboxes are 20px with the shared focus outline.
- The spinner in the status line stops for users who reduce motion.

Not in this task:
- the list part (2B-2), the provider, `ReviewedSharedValues`, `AuthoritativeItems`, `ResponseSummary` and their boxes (2D)
- the historical warning box `:852-855` (I35, 2D)
- messages: no key changes (`copy.zeroEligible` keeps its text; it moves to the body)
- no toast, `required`, `maxLength`, `minLength` or `disabled` gate changes (K4); do not run a formatter

**Files:**
- Modify: `src/components/disposal/disposal-bulk-execution.tsx` (CRLF, 7 replacements)
- Modify: `tests/disposal-bulk-execution-ui.test.ts` (CRLF, 3 replacements: `:31`, the comment `:181-182`, and `:195-198` with 1 test appended after it)
- Modify: `tests/form-migration-guards.test.ts` (the budget script, then 1 exact replacement of the `LOADER2` row's comment)

**Must keep passing without edits:**
- `tests/disposal-bulk-execution-ui.test.ts:19-36` apart from `:31`: `:25` and `:90` `aria-live="polite"`, `:26` `<AccessibleDialog[\s\S]*?busy=\{committing\}`, `:27` and `:89` `aria-busy={busy}` on the `<form>`, `:29-30` the focus refs, `:33` `min-h-11 min-w-11` (the list part's labels), `:34` `checkboxVariants(`.
- `:49-65` (`:57` `confirm({ title: copy.discardSelection`), `:67-76` (`dialogState === "committing"`), `:78-94` (`:88` `aria-describedby=`, `:91` the `historicalReasonHelp` counter over three lines, `:92-93` the two `format(copy.confirm, …)` labels), `:96-111` (`:106` `maxLength={200}`), `:183-194` (the 2B-2 list pins, including the `Button` and `checkboxVariants` import lines).
- `tests/visual-foundation-guards.test.ts:28` (the provider wrapper), `tests/ui-overlay-guards.test.ts:38-48`, `tests/disposal-bulk-execution-ui-state.test.ts`, `tests/disposal-bulk-execution-route.test.ts`, `tests/list-frame-guards.test.ts` (never edit it).

**Interfaces:**
- Consumes:
  - Task 1: `<temp>/p2c3-precheck.mjs` and `<temp>/p2c-budget.mjs` (save them again from Task 1 if missing).
  - 2C-0: the dialog parts and `accessibleDialogFormClasses`.
  - 2A: `Field` (`label`, `required`, `hint`, `className`), `FieldHint` (a `<p>` that takes `id` and `className`), `Input` (`type="date"`), `NativeSelect`, `Textarea`, `checkboxVariants` (`size: "lg"` is 20px), `Button` with `busy`, and `Notice` (`tone` required) from `@/components/ui/notice`. `cn` is already imported.
- Produces:
  - `disposal/disposal-bulk-execution.tsx` is the last line of `MIGRATED_FILES` (37 files) and out of `PENDING_FOOTER_PARTS` (7 left: `maintenance-attachments.tsx`, the two batch-3 files of Tasks 5 and 9, and the four batch-4 files). Its only rows left are `LOADER2` 1 (`BusyLabel` `:969` after this task) and `CONSTRAINT_FLOORS` `[5, 2, 1]`. `REVERSE` holds only `maintenance-plan-state-actions.tsx` (Task 9) and `IntegrationClientManager.tsx` (batch 4).
  - `DisposalBulkExecutionCopy` and every export of the file are unchanged.

| file | `RAW_FIELDS` | `FIELD_CLASS_STRINGS` | `OLD_MARKUP` | `LOADER2` | `REVERSE` | `PENDING_FOOTER_PARTS` | `CONSTRAINT_FLOORS` |
|---|---|---|---|---|---|---|---|
| `disposal/disposal-bulk-execution.tsx` | 5 → – | 5 → – | 5 (live 3) → – | 2 → 1 | 1 → – | listed → removed | 5/2/1 unchanged |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `git ls-files --eol src/components/disposal/disposal-bulk-execution.tsx tests/disposal-bulk-execution-ui.test.ts`, then `node --no-warnings <temp>/p2c3-precheck.mjs disposal/disposal-bulk-execution.tsx`
Expected: `git status` prints nothing; both files `i/lf w/crlf`. The script prints:
```
ok      2C-0 dialog parts: AccessibleDialogBody, AccessibleDialogFooter, AccessibleDialogCancel, accessibleDialogFormClasses
ok      2C-0 AccessibleDialog: description?: ReactNode, closeLabel?: string, busy-aware cancel
ok      2A Field (hint, hideLabel, id), FieldHint, FieldRequiredMark
ok      2A Input, NativeSelect, Textarea
ok      2A checkboxVariants (md, lg) and fieldLabelClasses
ok      2A Button with busy, and buttonVariants
ok      2A Notice with a required tone
ok      2C-0 sheet: SheetContent, SheetHeader, SheetTitle
ok      plans 1 and 2 merged: their 34 files are in MIGRATED_FILES
ok      BATCH_FILES "3" holds the 9 files of this plan
ok      disposal/disposal-bulk-execution.tsx: not in MIGRATED_FILES yet
ok      disposal/disposal-bulk-execution.tsx: budgets at their 886a290 row
ok      disposal/disposal-bulk-execution.tsx: CONSTRAINT_FLOORS 5/2/1
ok      disposal/disposal-bulk-execution.tsx: in PENDING_FOOTER_PARTS
ok      src/components/disposal/disposal-bulk-execution.tsx exists
info    tests/form-migration-guards.test.ts: CRLF
info    disposal/disposal-bulk-execution.tsx: CRLF · budget/live RAW_FIELDS 5/5 · FIELD_CLASS_STRINGS 5/5 · OLD_MARKUP 5/3 · LOADER2 2/2 · REVERSE 1/1 · floors live 5/2/1 · AccessibleDialog 1 · AccessibleDialogFooter 0
preconditions hold for disposal/disposal-bulk-execution.tsx
```
On any `MISSING` line, stop and report it.

- [ ] **Step 2: Lower the file's budgets (the failing guard)**

Run: `node --no-warnings <temp>/p2c-budget.mjs disposal/disposal-bulk-execution.tsx RAW_FIELDS=5:0 FIELD_CLASS_STRINGS=5:0 OLD_MARKUP=5:0 LOADER2=2:1 REVERSE=1:0 --footer-done`
Expected:
```
RAW_FIELDS: 5 -> 0
FIELD_CLASS_STRINGS: 5 -> 0
OLD_MARKUP: 5 -> 0
LOADER2: 2 -> 1
REVERSE: 1 -> 0
PENDING_FOOTER_PARTS: removed disposal/disposal-bulk-execution.tsx
MIGRATED_FILES: added disposal/disposal-bulk-execution.tsx
```

Then rewrite the kept `LOADER2` row's comment (one exact replacement; `:969` is `BusyLabel`'s spinner after Step 4):

Replace:

```ts
  [`${C}disposal/disposal-bulk-execution.tsx`]: 1, // → 1: BusyLabel :993 (:971 goes with the footer, GD3)
```

with:

```ts
  [`${C}disposal/disposal-bulk-execution.tsx`]: 1, // BusyLabel :969, the status line in the dialog body (I27)
```

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL, `tests 23 · pass 16 · fail 7`. Each failing guard names only `src/components/disposal/disposal-bulk-execution.tsx`:
- GF2 `5 > 0`, GF3 `5 > 0`, GF7 `3 > 0`
- GB1 `2 > 1`
- GB2 `:961` and `:983` (the footer's status spinner and `BusyLabel`'s)
- GD2 `1 AccessibleDialog, 0 AccessibleDialogFooter`
- GD4 `1 > 0` (`flex-col-reverse`)

- [ ] **Step 3: Update the tests (`tests/disposal-bulk-execution-ui.test.ts`)**

Most tests in this file read the source without stripping `\r`, so the new `:31` lines have no `\n`; the changed 2B-2 test and the new test strip `\r` first. Three exact replacements.

(1) The footer pin (`:31`, spec §10.4 table A).

Replace:

```ts
  assert.match(component, /<footer className="[^"]*sticky bottom-0[^"]*"/)
```

with:

```ts
  assert.match(component, /<AccessibleDialogFooter>/)
  assert.doesNotMatch(component, /<footer|sticky bottom-0/)
```

(2) The comment above 2B-2's list test (`:181-182`).

Replace:

```ts
// Plan 2B-2 Task 2 (spec 2B §8.6 row 4, §8.11 row 3): 2B owns only the list part of this 2C batch 3 file. The dialog
// (BulkExecutionDialog, SharedValueFields and the rest below it) stays as it is for 2C plan 3.
```

with:

```ts
// Plan 2B-2 Task 2 (spec 2B §8.6 row 4, §8.11 row 3): 2B owns only the list part of this 2C batch 3 file. The dialog
// (BulkExecutionDialog, SharedValueFields and the rest below it) belongs to 2C plan 3, which checks it in the next test.
```

(3) The end of 2B-2's list test (`:195-198`), and the new test after it.

Replace:

```ts
  // The dialog keeps its own markup for 2C plan 3 (FMG GF7 of this file drops to 3, GB1 stays 2, as spec §8.6 says).
  assert.equal(dialog.match(/<Loader2\b/g)?.length, 2)
  assert.equal(dialog.match(/\b(?:h-4 w-4|h-5 w-5|h-3\.5 w-3\.5) rounded border-border\b|\baccent-primary\b|mb-1\.5 block text-sm font-medium text-foreground|ml-1 text-danger">\*/g)?.length, 3)
})
```

with:

```ts
  // 2C plan 3 moved the dialog onto the dialog parts: BusyLabel keeps the one spinner (FMG GB1 1) and the old checkbox markup went (GF7 0).
  assert.equal(dialog.match(/<Loader2\b/g)?.length, 1)
  assert.doesNotMatch(dialog, /\b(?:h-4 w-4|h-5 w-5|h-3\.5 w-3\.5) rounded border-border\b|\baccent-primary\b|mb-1\.5 block text-sm font-medium text-foreground|ml-1 text-danger">\*/)
})

// Phase 2C batch 3 (spec 2C §5.5 row 14, I25, §5.7, I35, §4.3, §4.12): the dialog on the dialog parts. The button that
// starts the work stays in place with busy, cancel stays on screen but is off while committing, and "no eligible
// request" is a warning Notice in the body instead of a long button label.
test("bulk execution dialog uses the dialog parts, busy buttons that stay in place and the shared fields (2C batch 3)", async () => {
  const component = (await source("src/components/disposal/disposal-bulk-execution.tsx")).replace(/\r\n/g, "\n")
  const dialog = component.slice(component.indexOf("function BulkExecutionDialog"), component.indexOf("function ReviewedSharedValues"))

  assert.match(dialog, /closeLabel=\{previewing \? copy\.cancelPreview : copy\.close\}/, "while the preview runs, the X cancels it (spec §5.3)")
  assert.match(dialog, /onSubmit=\{handleSubmit\}\n\s+className=\{accessibleDialogFormClasses\}\n\s+>\n\s+<AccessibleDialogBody className="space-y-5">/)
  assert.match(dialog, /<Notice tone="warning" role="alert">\{copy\.zeroEligible\}<\/Notice>/)
  assert.equal(dialog.match(/copy\.zeroEligible/g)?.length, 1, "no button says the zero-eligible sentence")
  assert.match(dialog, /<AccessibleDialogFooter>\n\s+<AccessibleDialogCancel>\n\s+\{previewing \? copy\.cancelPreview : dialogState === "result" \? copy\.close : copy\.cancel\}\n\s+<\/AccessibleDialogCancel>/)
  assert.match(dialog, /\{dialogState === "review" \|\| previewing \? \(\n\s+<Button type="submit" busy=\{previewing\} disabled=\{!hasSharedValues\}>/)
  assert.match(dialog, /\{dialogState === "preview" \|\| committing \? \(\n\s+<Button type="submit" busy=\{committing\} disabled=\{eligible\.length === 0 \|\| !permanentConfirmed\}>\n\s+\{format\(copy\.confirm, \{ count: eligible\.length \}\)\}/)
  assert.match(dialog, /<Button onClick=\{retry\}>\{copy\.retry\}<\/Button>/)
  assert.match(dialog, /<Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" \/>/)
  assert.match(dialog, /<Field label=\{copy\.historicalReason\} required>\n\s+<Textarea\n/)
  assert.equal(dialog.match(/<FieldHint id=\{historicalHelpId\} className="text-muted-foreground">/g)?.length, 2, "muted, not faint, ink on the warning fill (DESIGN.md §2)")
  assert.equal(dialog.match(/className=\{checkboxVariants\(\{ size: "lg" \}\)\}/g)?.length, 2)
  assert.match(dialog, /className=\{cn\(checkboxVariants\(\{ size: "lg" \}\), "mt-0\.5"\)\}/)
  assert.equal(dialog.match(/<input\b/g)?.length, 3, "only the three checkboxes stay native inputs")
  assert.equal(dialog.match(/<Field label=\{copy\.(?:executionDate|executor|finalStatus)\} required>/g)?.length, 3)
  assert.match(dialog, /<Field label=\{copy\.sharedRecipient\} hint=\{copy\.sharedRecipientHelp\} className="sm:col-span-3">/)
  assert.doesNotMatch(dialog, /<footer|<button\b|<select|<textarea|<label className="(?:block )?text-sm font-medium|disabled:opacity|flex-col-reverse/)
})
```

Run: `node --test tests/disposal-bulk-execution-ui.test.ts`
Expected: FAIL, `tests 11 · pass 8 · fail 3`: the first test (no `<AccessibleDialogFooter>` yet), 2B-2's list test (2 spinners found, 1 expected) and the new test.

- [ ] **Step 4: Move the dialog onto the parts (`src/components/disposal/disposal-bulk-execution.tsx`)**

Seven exact replacements.

(1) Imports (`:40-44`). The `Button` and `checkboxVariants` imports stay on lines of their own (2B-2 pins them).

Replace:

```tsx
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { checkboxVariants } from "@/components/ui/field-variants"
import { shouldGuardLinkClick } from "@/lib/navigation-guard"
```

with:

```tsx
import {
  AccessibleDialog,
  AccessibleDialogBody,
  AccessibleDialogCancel,
  AccessibleDialogFooter,
  accessibleDialogFormClasses,
} from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { Field, FieldHint } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Notice } from "@/components/ui/notice"
import { Textarea } from "@/components/ui/textarea"
import { shouldGuardLinkClick } from "@/lib/navigation-guard"
```

(2) The form class and the body (`:816-819`).

Replace:

```tsx
        onSubmit={handleSubmit}
        className="flex flex-col"
      >
        <div className="space-y-5 px-4 py-4 sm:px-6">
```

with:

```tsx
        onSubmit={handleSubmit}
        className={accessibleDialogFormClasses}
      >
        <AccessibleDialogBody className="space-y-5">
```

(3) The historical exception checkbox, reason and counter line (`:861-885`).

Replace:

```tsx
                  aria-describedby={`${historicalWarningId} ${historicalHelpId}`}
                  className="h-5 w-5 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-ring"
                />
                {copy.historicalException}
              </label>
              {useHistoricalEvidenceException ? (
                <>
                  <label className="block text-sm font-medium text-foreground">
                    {copy.historicalReason}
                    <textarea
                      value={evidenceExceptionReason}
                      onChange={(event) => setEvidenceExceptionReason(event.target.value)}
                      minLength={20}
                      maxLength={2000}
                      required
                      aria-describedby={`${historicalWarningId} ${historicalHelpId}`}
                      className="mt-2 min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </label>
                  <p id={historicalHelpId} className="text-xs text-muted-foreground">
                    {format(copy.historicalReasonHelp, {
                      count: evidenceExceptionReason.length,
                      max: 2000,
                    })}
                  </p>
```

with:

```tsx
                  aria-describedby={`${historicalWarningId} ${historicalHelpId}`}
                  className={checkboxVariants({ size: "lg" })}
                />
                {copy.historicalException}
              </label>
              {useHistoricalEvidenceException ? (
                <>
                  <Field label={copy.historicalReason} required>
                    <Textarea
                      value={evidenceExceptionReason}
                      onChange={(event) => setEvidenceExceptionReason(event.target.value)}
                      minLength={20}
                      maxLength={2000}
                      required
                      aria-describedby={`${historicalWarningId} ${historicalHelpId}`}
                      className="min-h-28"
                    />
                  </Field>
                  <FieldHint id={historicalHelpId} className="text-muted-foreground">
                    {format(copy.historicalReasonHelp, {
                      count: evidenceExceptionReason.length,
                      max: 2000,
                    })}
                  </FieldHint>
```

(4) The acknowledgement checkbox and the counter line before the box is ticked (`:892-902`).

Replace:

```tsx
                      aria-describedby={`${historicalWarningId} ${historicalHelpId}`}
                      className="h-5 w-5 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    {copy.historicalAcknowledgement}
                  </label>
                </>
              ) : (
                <p id={historicalHelpId} className="text-xs text-muted-foreground">
                  {format(copy.historicalReasonHelp, { count: 0, max: 2000 })}
                </p>
              )}
```

with:

```tsx
                      aria-describedby={`${historicalWarningId} ${historicalHelpId}`}
                      className={checkboxVariants({ size: "lg" })}
                    />
                    {copy.historicalAcknowledgement}
                  </label>
                </>
              ) : (
                <FieldHint id={historicalHelpId} className="text-muted-foreground">
                  {format(copy.historicalReasonHelp, { count: 0, max: 2000 })}
                </FieldHint>
              )}
```

(5) The zero-eligible notice, the permanent confirmation and the footer (`:916-975`).

Replace:

```tsx
          {dialogState === "preview" && eligible.length > 0 ? (
            <label className="flex min-h-11 items-start gap-3 border-t border-border pt-4 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={permanentConfirmed}
                onChange={(event) => setPermanentConfirmed(event.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-ring"
              />
              {copy.permanentConfirmation}
            </label>
          ) : null}
        </div>

        <footer className="sticky bottom-0 z-10 flex flex-col-reverse gap-2 border-t border-border bg-surface px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
          {dialogState !== "committing" ? (
            <button
              type="button"
              onClick={closeDialog}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium hover:bg-accent"
            >
              {previewing ? copy.cancelPreview : dialogState === "result" ? copy.close : copy.cancel}
            </button>
          ) : null}
          {dialogState === "review" ? (
            <button
              type="submit"
              disabled={!hasSharedValues}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {format(copy.confirm, { count: reviewedItems.length })}
            </button>
          ) : null}
          {dialogState === "preview" ? (
            <button
              type="submit"
              disabled={eligible.length === 0 || !permanentConfirmed}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {eligible.length === 0
                ? copy.zeroEligible
                : format(copy.confirm, { count: eligible.length })}
            </button>
          ) : null}
          {dialogState === "committing" ? (
            <div className="inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-medium text-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {copy.committing}
            </div>
          ) : null}
          {dialogState === "result" && blocked.length + failed.length > 0 ? (
            <button
              type="button"
              onClick={retry}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover"
            >
              {copy.retry}
            </button>
          ) : null}
        </footer>
      </form>
```

with:

```tsx
          {dialogState === "preview" && eligible.length === 0 ? (
            <Notice tone="warning" role="alert">{copy.zeroEligible}</Notice>
          ) : null}

          {dialogState === "preview" && eligible.length > 0 ? (
            <label className="flex min-h-11 items-start gap-3 border-t border-border pt-4 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={permanentConfirmed}
                onChange={(event) => setPermanentConfirmed(event.target.checked)}
                className={cn(checkboxVariants({ size: "lg" }), "mt-0.5")}
              />
              {copy.permanentConfirmation}
            </label>
          ) : null}
        </AccessibleDialogBody>

        <AccessibleDialogFooter>
          <AccessibleDialogCancel>
            {previewing ? copy.cancelPreview : dialogState === "result" ? copy.close : copy.cancel}
          </AccessibleDialogCancel>
          {dialogState === "review" || previewing ? (
            <Button type="submit" busy={previewing} disabled={!hasSharedValues}>
              {format(copy.confirm, { count: reviewedItems.length })}
            </Button>
          ) : null}
          {dialogState === "preview" || committing ? (
            <Button type="submit" busy={committing} disabled={eligible.length === 0 || !permanentConfirmed}>
              {format(copy.confirm, { count: eligible.length })}
            </Button>
          ) : null}
          {dialogState === "result" && blocked.length + failed.length > 0 ? (
            <Button onClick={retry}>{copy.retry}</Button>
          ) : null}
        </AccessibleDialogFooter>
      </form>
```

(6) `BusyLabel`'s spinner (`:983-984`).

Replace:

```tsx
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {label}
```

with:

```tsx
      <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      {label}
```

(7) `SharedValueFields` (`:1019-1072`).

Replace:

```tsx
    <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-3">
      <label className="text-sm font-medium text-foreground">
        {copy.executionDate}
        <input
          type="date"
          value={executionDate}
          onChange={(event) => onExecutionDateChange(event.target.value)}
          required
          className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
        />
      </label>
      <label className="text-sm font-medium text-foreground">
        {copy.executor}
        <select
          value={executedById}
          onChange={(event) => onExecutedByChange(event.target.value)}
          required
          className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
        >
          <option value="">{copy.selectEmployee}</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>{employee.label}</option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium text-foreground">
        {copy.finalStatus}
        <select
          value={nextStatusId}
          onChange={(event) => onNextStatusChange(event.target.value)}
          required
          className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
        >
          <option value="">{copy.selectStatus}</option>
          {executionStatuses.map((status) => (
            <option key={status.id} value={status.id}>{status.label}</option>
          ))}
        </select>
      </label>
      {recipientFallbackApplicable ? (
        <label className="text-sm font-medium text-foreground sm:col-span-3">
          {copy.sharedRecipient}
          <input
            value={sharedRecipientName}
            onChange={(event) => onSharedRecipientNameChange(event.target.value)}
            maxLength={200}
            className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            {copy.sharedRecipientHelp}
          </span>
        </label>
      ) : null}
    </fieldset>
```

with:

```tsx
    <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-3">
      <Field label={copy.executionDate} required>
        <Input
          type="date"
          value={executionDate}
          onChange={(event) => onExecutionDateChange(event.target.value)}
          required
        />
      </Field>
      <Field label={copy.executor} required>
        <NativeSelect
          value={executedById}
          onChange={(event) => onExecutedByChange(event.target.value)}
          required
        >
          <option value="">{copy.selectEmployee}</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>{employee.label}</option>
          ))}
        </NativeSelect>
      </Field>
      <Field label={copy.finalStatus} required>
        <NativeSelect
          value={nextStatusId}
          onChange={(event) => onNextStatusChange(event.target.value)}
          required
        >
          <option value="">{copy.selectStatus}</option>
          {executionStatuses.map((status) => (
            <option key={status.id} value={status.id}>{status.label}</option>
          ))}
        </NativeSelect>
      </Field>
      {recipientFallbackApplicable ? (
        <Field label={copy.sharedRecipient} hint={copy.sharedRecipientHelp} className="sm:col-span-3">
          <Input
            value={sharedRecipientName}
            onChange={(event) => onSharedRecipientNameChange(event.target.value)}
            maxLength={200}
          />
        </Field>
      ) : null}
    </fieldset>
```

Check: `grep -n "<input\|<select\|<textarea\|<button\|<footer\|<Loader2\|flex-col-reverse\|zeroEligible\|h-5 w-5" src/components/disposal/disposal-bulk-execution.tsx` prints 9 lines: `119:` (`zeroEligible: string` in the copy type), `682:` and `733:` (the list's checkboxes, 2B-2), `725:` (the list's `ShieldAlert className="h-5 w-5"`), `868:`, `897:` and `932:` (the three dialog checkboxes), `927:` (the `Notice`) and `969:` (`BusyLabel`'s spinner).

- [ ] **Step 5: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/disposal-bulk-execution-ui.test.ts tests/disposal-bulk-execution-ui-state.test.ts tests/visual-foundation-guards.test.ts tests/ui-overlay-guards.test.ts tests/list-frame-guards.test.ts tests/disposal-bulk-execution-route.test.ts`
Expected: PASS, `tests 107 · pass 107 · fail 0`.

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, 1 test more than after Task 2: 1930 tests, 1929 pass, 1 skipped.
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- exactly 3 files: `src/components/disposal/disposal-bulk-execution.tsx` with 59 insertions and 84 deletions, `tests/disposal-bulk-execution-ui.test.ts` with 32 insertions and 5 deletions, `tests/form-migration-guards.test.ts` with 2 insertions and 6 deletions.
- `git status` lists the same 3 files and nothing else. A file with every line changed was normalized: restore its line endings first.

- [ ] **Step 7: Commit**

```bash
git add src/components/disposal/disposal-bulk-execution.tsx tests/disposal-bulk-execution-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): bulk execution dialog on the dialog parts, busy confirm buttons and shared fields (2C batch 3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 3 dev-app check (Task 10):**
- Only if Task 0 Step 7 found approved disposal requests (the dev data of 2026-10-13 had none): on `/th/disposal` (approved queue) at 375, 768 and 1440, turn on selection, tick one request and press "ตรวจสอบรายการ". Check the review screen: the date, executor and final status fields with stars at 40px on desktop and 44px with 16px text at 375; the recipient field and its hint when the type is sell, donate or dispose; the footer in view; at 375 cancel above "ยืนยันดำเนินการ 1 รายการ". As system admin with a request that has no evidence, tick "historical exception" and check the reason field's star, the muted counter line on the orange box and the 20px checkboxes. Close with cancel or Esc; focus returns to "ตรวจสอบรายการ".
- The preview ("ยืนยันดำเนินการ" on the review screen) is a POST with `mode: "preview"` that only reads (`inspectDisposalBulkExecution`); press it only to see the zero-eligible notice or the permanent-confirmation row, and never press the second "ยืนยันดำเนินการ", which writes.
- Otherwise record "not seen on dev" for Task 11; the new test and the guards pin the structure.

---

### Task 4: Batch 3 · `audit/audit-round-form.tsx` (six fields on `Field`, the sample-rate hint, busy preview and save)

Spec §8.9 "ชุด 3" row `audit-round-form.tsx` (6 fields · `Field` ×6), with §4.3 (F1–F8), §4.4 (L1, the local `Field`; row 8, the sample-rate hint), §4.5 (the `Select` wrapper, 10 calls), §4.6, §4.10 (the two dates), §4.12 (the include-closed checkbox), §4.14 (the row), §6.3 #85–#86, §9.4 (the row), §9.8 (`html-lang-and-years.test.ts:21`), §10.1 and §10.3 "plan 3". One file, one commit (I30). The form is CRLF; edit it with exact-string replacement only.

Lines at `886a290` (the spec quotes `5ffee76`, one line further down): local `Field` `:312`, `Select` wrapper `:324`, the five inputs `:138`, `:141`, `:144`, `:147`, `:168`, the wrapper's `<select>` `:327`, the sample-rate help `:177`, the preview button `:185`, the checkbox `:257` (class `:261`), the save button `:269`.

Rulings this task applies:
- **K4, GF5:** `required` stays on the five inputs, on the status `Select` call and on the wrapper's control (`required={required}`); `maxLength={200}` stays on the name. `CONSTRAINT_FLOORS` stays `[7, 1, 0]`. `Field required` goes on exactly the fields whose control has `required` (F5, GF4).
- **§4.5:** the `Select` wrapper keeps its name, props and one-line signature; only its inside changes to `Field` + `NativeSelect`, so its 10 calls stay as they are.
- **§4.4 row 8, F6:** the sample-rate help `<p>` `:177` becomes `Field hint` (13px, linked through `aria-describedby`). Two more lines match F6's regex but sit under no field, so they stay (F6, second bullet): the preview help `:183` (it explains the preview box) and the include-closed help `:265` (inside the checkbox row).
- **§4.12, K16:** the checkbox (`mt-1 h-4 w-4 …`) takes `cn(checkboxVariants(), "mt-0.5")`. Its row is not one of the 9 small targets, so the `<label>` keeps its classes.
- **K13, §6.3:** #85 preview `busy={previewing}` with no `disabled`; #86 save `busy={saving}` with `disabled={previewing}`, so a save while a preview runs stays blocked as today (GB4 checks that `disabled` no longer repeats `saving`).
- **§4.10, V track:** the end date gets no `min={values.startDate}`.
- **§9.8:** `min={yearRange.min} max={yearRange.max}` stay side by side, in this order, on the year `Input`.
- **Ruling (spec gap), the test file:** the round form has no UI test of its own and §9.6 names none for batch 3. This task creates `tests/audit-round-form-ui.test.ts` (plan 2's per-form pattern). The guards pin the old patterns; this test pins what they cannot see: the hint, the wrapper's inside, both busy buttons and the five native `required`.
- **Ruling, the scripts:** this task saves `p2c3-quotes.mjs`, which Tasks 5–9 reuse. It checks what Task 1's `p2c3-precheck.mjs` does not: that the earlier tasks of this plan landed and that the text each task quotes is still there.

What users will see:
- The round form gets the 2A field look: white fields 44px tall with 16px text on phones and 40px on desktop, 13px labels, orange stars that screen readers do not read (they hear "required"). The 10 scope selects get the shared arrow.
- The sampling help sits under its field in the 13px hint style, and screen readers read it with the field.
- "ดูตัวอย่าง" keeps focus and shows a spinner while the preview loads; Save does the same while saving, and is grey (not faded) while a preview runs.
- The include-closed checkbox gets the shared 16px box and focus outline.

Not in this task:
- `PageHeader` (2B-1), the form panel `rounded-lg border border-border bg-surface p-6` and the risk-sampling panel `rounded-lg border border-border bg-background p-4` (K28, 2D)
- the preview result box, its info line `border-info-border bg-info-soft` and `PreviewMetric` (notices and tiles, I35, 2D)
- the F1 row `md:col-span-2 flex justify-end` (§6.7)
- messages: no key changes
- no toast, `required`, `maxLength` or `disabled` gate changes (K4); `min` on the dates is the V track. Do not run a formatter.

**Files:**
- Modify: `src/components/audit/audit-round-form.tsx` (CRLF, 7 replacements)
- Create: `tests/audit-round-form-ui.test.ts` (LF)
- Modify: `tests/form-migration-guards.test.ts` (only through `p2c-budget.mjs`)
- Temp folder only, never committed: `p2c3-quotes.mjs` (Tasks 5–9 reuse it), and Task 1's `p2c3-precheck.mjs` and `p2c-budget.mjs`

**Must keep passing without edits:**
- `tests/html-lang-and-years.test.ts:18-23`: `auditYear: String(toDisplayYear(new Date().getFullYear(), locale))`, `min={yearRange.min} max={yearRange.max}` side by side, `fromDisplayYear(Number(values.auditYear), locale)`.
- `tests/form-frames-ui.test.ts:118-123`: `import { PageHeader } from "@/components/ui/page-header"` and `<div className="mx-auto max-w-5xl">` followed by `<PageHeader title={t("createTitle")} className="mb-6" />` on the next line.
- `tests/audit-component-round-routes.test.ts:89-106`: the `componentItems` lines of the preview.
- `tests/list-frame-guards.test.ts` (2B's guard file; the form is in its `MIGRATED_LIST_FILES`): add no `<h1`, `"-"`, `toLocaleString()` or local tile function.

**Interfaces:**
- Consumes:
  - 2A: `Field` (`label`, `required`, `hint`) from `@/components/ui/field`, `Input`, `NativeSelect`, `checkboxVariants` from `@/components/ui/field-variants`, `Button` with `busy` (default `type="button"`) and `cn` from `@/lib/utils`.
  - Task 1: `<temp>/p2c-budget.mjs` and `<temp>/p2c3-precheck.mjs`. Tasks 1–3: their three files in `MIGRATED_FILES`.
- Produces:
  - `audit/audit-round-form.tsx` in `MIGRATED_FILES` (after Task 3's line), with no entry left in `LOCAL_FIELD`, `RAW_FIELDS`, `FIELD_CLASS_STRINGS`, `OLD_MARKUP` or `LOADER2`; `CONSTRAINT_FLOORS` stays `[7, 1, 0]`.
  - `tests/audit-round-form-ui.test.ts` (LF, 1 test).
  - `<temp>/p2c3-quotes.mjs` for Tasks 5–9.

| file | `LOCAL_FIELD` | `RAW_FIELDS` | `FIELD_CLASS_STRINGS` | `OLD_MARKUP` | `LOADER2` | `CONSTRAINT_FLOORS` |
|---|---|---|---|---|---|---|
| `audit/audit-round-form.tsx` | 1 → – | 6 → – | 6 → – | 3 → – | 2 → – | `[7, 1, 0]` unchanged |

`RAW_FIELDS` 6 = the five inputs and the wrapper's `<select>`; `FIELD_CLASS_STRINGS` 6 = their six class strings; `OLD_MARKUP` 3 = the local `Field`'s label span and red star, and the checkbox class; `LOADER2` 2 = the preview and save spinners.

- [ ] **Step 1: Check what this task builds on**

Save this script as `p2c3-quotes.mjs` in your temp folder, next to Task 1's scripts (never in the repo):

```js
// p2c3-quotes.mjs: run from the worktree root before each of Tasks 4-9 of plan 3. Usage: node p2c3-quotes.mjs <4-9>
// Checks that the earlier tasks of plan 3 landed, that the task's file still holds its 886a290 guard rows, and that the
// file and the test it appends to still hold the text the task quotes. Reads only; writes nothing. Never commit this file.
import { existsSync, readFileSync } from "node:fs"

const C = "src/components/"
const raw = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "")
const read = (path) => raw(path).replace(/\r\n/g, "\n")
const count = (text, literal) => text.split(literal).length - 1
const guard = read("tests/form-migration-guards.test.ts")
const block = (name) => new RegExp(`^const ${name}\\b[\\s\\S]*?^[}\\]]`, "m").exec(guard)?.[0] ?? ""
// One budget entry as written ("6", "[7, 1, 0]"), or null when the file has none.
const entry = (name, path) => {
  const line = block(name).split("\n").find((text) => text.includes("[`${C}" + path + "`]:"))
  return line ? line.split("]:")[1].replace(/,?\s*(?:\/\/.*)?$/, "").trim() : null
}
const listed = (name, path) => block(name).includes("`${C}" + path + "`")
const BUDGETS = ["LOCAL_FIELD", "RAW_FIELDS", "FIELD_CLASS_STRINGS", "OLD_MARKUP", "LOADER2", "REVERSE", "OLD_HELPERS", "FIXED_BOTTOM_BARS", "CLOSE_LABEL_IS_CANCEL"]
// Plan 3 in task order (Tasks 1-9), under src/components/.
const ORDER = [
  "ui/confirm-text-dialog.tsx",
  "disposal/disposal-bulk-approval.tsx",
  "disposal/disposal-bulk-execution.tsx",
  "audit/audit-round-form.tsx",
  "audit/audit-round-cancel-button.tsx",
  "audit/audit-findings-batch-actions.tsx",
  "audit/audit-scan-room-picker.tsx",
  "audit/audit-scan-check-panel.tsx",
  "maintenance/maintenance-plan-state-actions.tsx",
]
const REVIEW_ROW = "  [`${C}audit/audit-finding-review-actions.tsx`]: 2, // → 2: the row triggers :102, :112 (2B, O21)"
// Per task: the guard rows at 886a290, the floors, whether the file waits in PENDING_FOOTER_PARTS, the quoted text with
// its count in the file, and the test file the task creates (create) or appends to (append, with a test that must be there).
const TASKS = {
  4: {
    seeds: { LOCAL_FIELD: "1", RAW_FIELDS: "6", FIELD_CLASS_STRINGS: "6", OLD_MARKUP: "3", LOADER2: "2" },
    floors: "[7, 1, 0]",
    pending: false,
    quotes: {
      "function Field({ label, required, children }": 1,
      'className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"': 6,
      "Loader2": 3,
      '<p className="mt-1.5 text-xs text-muted-foreground">{t("sampleRateHelp")}</p>': 1,
      "required min={yearRange.min} max={yearRange.max}": 1,
      'className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-ring"': 1,
      "<button type=\"submit\" disabled={saving || previewing}": 1,
    },
    create: "tests/audit-round-form-ui.test.ts",
  },
  5: {
    seeds: { RAW_FIELDS: "1", FIELD_CLASS_STRINGS: "1", LOADER2: "2" },
    floors: "[1, 0, 0]",
    pending: true,
    quotes: {
      "<form onSubmit={handleSubmit}>": 1,
      "max-h-[calc(92dvh-10rem)]": 1,
      "Loader2": 3,
      "<textarea": 1,
      "<button": 3,
      "bg-danger-soft px-4 text-sm font-semibold text-danger": 1,
    },
    append: ["tests/audit-round-cancellation.test.ts", 'test("audit cancellation workflow is documented in handoff docs", () => {'],
  },
  6: {
    seeds: { OLD_MARKUP: "1", LOADER2: "2" },
    floors: null,
    pending: false,
    quotes: {
      'closeLabel={tCommon("close")}': 1,
      "<ConfirmTextDialog\n": 1,
      'cancelLabel={tCommon("cancel")}\n        closeLabel={tCommon("close")}\n        busy={reviewing !== null}': 1,
    },
    append: ["tests/confirm-text-dialog-ui.test.ts", 'test("batch review and component removal use accessible dialogs instead of browser prompts", () => {'],
  },
  7: {
    seeds: { RAW_FIELDS: "2" },
    floors: null,
    pending: false,
    quotes: {
      'closeLabel={tCommon("close")}': 1,
      'const tCommon = useTranslations("common")': 1,
      '<SheetHeader className="border-b border-border pr-14">': 1,
      "<select": 1,
      "<input": 1,
      '<span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("roomDepartment")}</span>': 1,
      '<div className="border-t border-border p-3">': 1,
      'onClick={() => choose({ locationId: "", departmentId: "" })}': 1,
    },
    append: ["tests/audit-scan-room-ui.test.ts", 'test("the room list tab group has its own label", () => {'],
  },
  8: {
    seeds: {},
    floors: null,
    pending: false,
    quotes: {
      'closeLabel={tCommon("close")}': 1,
      'const tCommon = useTranslations("common")': 1,
      '<SheetHeader className="border-b border-border pr-14">': 1,
      'tabIndex={-1} className="text-base font-semibold text-foreground outline-none"': 1,
    },
    append: ["tests/audit-scan-check-ui.test.ts", 'test("check sheet copy exists in Thai and English", () => {'],
  },
  9: {
    seeds: { LOADER2: "1", REVERSE: "1" },
    floors: null,
    pending: true,
    quotes: {
      "flex-col-reverse": 1,
      "Loader2": 2,
      'tCommon("confirm")': 1,
      "<button": 3,
      '<div className="flex flex-col-reverse gap-2 p-5 sm:flex-row sm:justify-end">': 1,
    },
    append: ["tests/pm-plans-ui.test.ts", 'test("the PM plan form uses the shared field primitives and a busy save button (2C batch 1a)", () => {'],
  },
}

const task = Number(process.argv[2])
const spec = TASKS[task]
if (!spec) {
  console.error("usage: node p2c3-quotes.mjs <4|5|6|7|8|9>")
  process.exit(2)
}
const file = ORDER[task - 1]
const source = read(C + file)
const earlier = ORDER.slice(0, task - 1)
const seedText = Object.entries(spec.seeds).map(([name, value]) => `${name} ${value}`).join(", ") || "none"
const quoteMisses = Object.entries(spec.quotes).filter(([literal, expected]) => count(source, literal) !== expected)
const checks = {
  [`Tasks 1-${task - 1} are in MIGRATED_FILES`]: earlier.every((path) => listed("MIGRATED_FILES", path)),
  [`${file} is not in MIGRATED_FILES yet`]: source.length > 0 && !listed("MIGRATED_FILES", file),
  [`guard rows: ${seedText}`]: BUDGETS.every((name) => entry(name, file) === (spec.seeds[name] ?? null)),
  [`CONSTRAINT_FLOORS ${spec.floors ?? "none"}`]: entry("CONSTRAINT_FLOORS", file) === spec.floors,
  [`${spec.pending ? "listed" : "not listed"} in PENDING_FOOTER_PARTS`]: listed("PENDING_FOOTER_PARTS", file) === spec.pending,
  [`quoted text: ${Object.keys(spec.quotes).length} snippets at their counts`]: quoteMisses.length === 0,
}
if (spec.create) checks[`${spec.create}: not there yet`] = !existsSync(spec.create)
if (spec.append) checks[`${spec.append[0]}: holds the test this task appends after`] = count(read(spec.append[0]), spec.append[1]) === 1
if (task === 6) {
  const confirmText = read(`${C}ui/confirm-text-dialog.tsx`)
  checks["Task 1 kept closeLabel?: string and cancelLabel on ConfirmTextDialog"] = /\n  closeLabel\?: string\n/.test(confirmText) && /\n  cancelLabel\??: string\n/.test(confirmText)
  checks["LOADER2 still holds 2 for audit/audit-finding-review-actions.tsx, which has no <Loader2 left"] =
    block("LOADER2").split("\n").filter((line) => line === REVIEW_ROW).length === 1 && count(read(`${C}audit/audit-finding-review-actions.tsx`), "<Loader2") === 0
}
let missing = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok     " : "MISSING"} ${name}`)
  if (!ok) missing += 1
}
for (const [literal, expected] of quoteMisses) console.log(`        found ${count(source, literal)}, expected ${expected}: ${JSON.stringify(literal)}`)
const text = raw(C + file)
const crlf = (text.match(/\r\n/g) ?? []).length
const lf = (text.match(/\n/g) ?? []).length
console.log(`info    line endings of ${file}: ${crlf === lf && lf > 0 ? "CRLF" : crlf === 0 ? "LF" : "mixed"}`)
if (missing > 0) {
  console.error(`ABORT: ${missing} precondition(s) failed. Do not start Task ${task}; report which.`)
  process.exit(1)
}
console.log(`Task ${task} preconditions hold`)
```

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2c-plan3`

Run: `git status --short src tests messages`, then `node <temp>/p2c3-precheck.mjs audit/audit-round-form.tsx`, then `node <temp>/p2c3-quotes.mjs 4`
Expected:
- `git status` prints nothing.
- Task 1's precheck ends with `preconditions hold for audit/audit-round-form.tsx`.
- `p2c3-quotes.mjs` prints:
```
ok      Tasks 1-3 are in MIGRATED_FILES
ok      audit/audit-round-form.tsx is not in MIGRATED_FILES yet
ok      guard rows: LOCAL_FIELD 1, RAW_FIELDS 6, FIELD_CLASS_STRINGS 6, OLD_MARKUP 3, LOADER2 2
ok      CONSTRAINT_FLOORS [7, 1, 0]
ok      not listed in PENDING_FOOTER_PARTS
ok      quoted text: 7 snippets at their counts
ok      tests/audit-round-form-ui.test.ts: not there yet
info    line endings of audit/audit-round-form.tsx: CRLF
Task 4 preconditions hold
```
On any `MISSING` line, stop and report it.

Run: `git ls-files --eol src/components/audit/audit-round-form.tsx tests/form-migration-guards.test.ts`
Expected: `i/lf w/crlf` for the form. Keep what it prints for both files; `p2c-budget.mjs` writes the guard back with the line endings it read.

- [ ] **Step 2: Lower the round form's budgets (the failing guard)**

Run: `node <temp>/p2c-budget.mjs audit/audit-round-form.tsx LOCAL_FIELD=1:0 RAW_FIELDS=6:0 FIELD_CLASS_STRINGS=6:0 OLD_MARKUP=3:0 LOADER2=2:0`
Expected:
```
LOCAL_FIELD: 1 -> 0
RAW_FIELDS: 6 -> 0
FIELD_CLASS_STRINGS: 6 -> 0
OLD_MARKUP: 3 -> 0
LOADER2: 2 -> 0
MIGRATED_FILES: added audit/audit-round-form.tsx
```
On `ABORT`, stop and report the lines it prints.

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL, `tests 23 · pass 18 · fail 5`. Each failing guard names only `src/components/audit/audit-round-form.tsx`:
- GF1 `1 > 0`
- GF2 `6 > 0`
- GF3 `6 > 0`
- GF7 `3 > 0`
- GB1 `2 > 0`

GF4, GF8 and GB2 already pass on the file: each starred local `Field` has a control with native `required`, no `<label>` wraps a `Field`, and both spinners sit inside a `<button>`.

- [ ] **Step 3: Create the failing test `tests/audit-round-form-ui.test.ts`**

Create `tests/audit-round-form-ui.test.ts` with this content (LF line endings):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { findJsxTags, hasJsxAttr } from "./helpers/source-files.ts"

// Phase 2C batch 3 (spec 2C §8.9 "ชุด 3"): the new audit round form on the shared fields and buttons. The form is CRLF
// in the working tree, so the source is read with \r stripped before the multi-line regexes.
const source = readFileSync("src/components/audit/audit-round-form.tsx", "utf8").replace(/\r\n/g, "\n")

test("the audit round form uses the shared fields, the sample-rate hint and busy preview and save buttons (2C batch 3)", () => {
  assert.match(source, /import \{ Field \} from "@\/components\/ui\/field"/)
  assert.doesNotMatch(source, /function Field\(|<select\b|<textarea\b|<button\b|Loader2|ml-1 text-danger|mt-1\.5 text-xs text-muted-foreground/)
  assert.equal(source.match(/<input\b/g)?.length, 1, "only the include-closed checkbox stays a native input")
  const inputs = findJsxTags(source, ["Input"])
  assert.equal(inputs.length, 5)
  assert.equal(inputs.filter((tag) => hasJsxAttr(tag.text, "required")).length, 5, "every round field keeps the browser's own required check")
  assert.equal(source.match(/<Field label=\{t\("(?:name|auditYear|startDate|endDate)"\)\} required>/g)?.length, 4)
  assert.match(source, /<Field label=\{t\("sampleRate"\)\} required hint=\{t\("sampleRateHelp"\)\}>/)
  assert.match(source, /<Field label=\{label\} required=\{required\}>\n\s+<NativeSelect value=\{value\} required=\{required\} onChange=\{\(event\) => onChange\(event\.target\.value\)\}>/)
  assert.match(source, /<Select label=\{t\("status"\)\} value=\{values\.status\} required onChange=/)
  assert.match(source, /className=\{cn\(checkboxVariants\(\), "mt-0\.5"\)\}/)
  assert.match(source, /<Button variant="outline" busy=\{previewing\} onClick=\{handlePreview\}>\n\s+<ClipboardList aria-hidden="true" \/>\n\s+\{t\("preview"\)\}/)
  assert.match(source, /<Button type="submit" busy=\{saving\} disabled=\{previewing\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{tCommon\("save"\)\}/)
})
```

Run: `node --test tests/audit-round-form-ui.test.ts`
Expected: FAIL, `tests 1 · pass 0 · fail 1`, first on `/import \{ Field \} from "@\/components\/ui\/field"/`.

- [ ] **Step 4: Move the round form onto the primitives (`src/components/audit/audit-round-form.tsx`)**

Make these 7 replacements in `src/components/audit/audit-round-form.tsx`. Make all of them before you compile: (1) imports the 2A `Field` and (7) deletes the local one, and the file type-checks only with both (§4.3 F8).

(1) Imports. `Loader2` goes; the five 2A modules and `cn` come in.

Replace:

```tsx
import { ClipboardList, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { filterAuditStatusOptions } from "@/lib/audit-round-scope"
import { PageHeader } from "@/components/ui/page-header"
import { useApiError } from "@/components/ui/use-api-error"
import { displayYearRange, fromDisplayYear, toDisplayYear } from "@/lib/display-year"
```

with:

```tsx
import { ClipboardList, Save } from "lucide-react"
import { toast } from "sonner"
import { filterAuditStatusOptions } from "@/lib/audit-round-scope"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { PageHeader } from "@/components/ui/page-header"
import { useApiError } from "@/components/ui/use-api-error"
import { displayYearRange, fromDisplayYear, toDisplayYear } from "@/lib/display-year"
import { cn } from "@/lib/utils"
```

(2) The name, year and date fields (`:137-148`). Every attribute stays in its place; only the class strings go.

Replace:

```tsx
          <Field label={t("name")} required>
            <input value={values.name} onChange={(event) => setField("name", event.target.value)} required maxLength={200} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
          </Field>
          <Field label={t("auditYear")} required>
            <input type="number" value={values.auditYear} onChange={(event) => setField("auditYear", event.target.value)} required min={yearRange.min} max={yearRange.max} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
          </Field>
          <Field label={t("startDate")} required>
            <input type="date" value={values.startDate} onChange={(event) => setField("startDate", event.target.value)} required className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
          </Field>
          <Field label={t("endDate")} required>
            <input type="date" value={values.endDate} onChange={(event) => setField("endDate", event.target.value)} required className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
          </Field>
```

with:

```tsx
          <Field label={t("name")} required>
            <Input value={values.name} onChange={(event) => setField("name", event.target.value)} required maxLength={200} />
          </Field>
          <Field label={t("auditYear")} required>
            <Input type="number" value={values.auditYear} onChange={(event) => setField("auditYear", event.target.value)} required min={yearRange.min} max={yearRange.max} />
          </Field>
          <Field label={t("startDate")} required>
            <Input type="date" value={values.startDate} onChange={(event) => setField("startDate", event.target.value)} required />
          </Field>
          <Field label={t("endDate")} required>
            <Input type="date" value={values.endDate} onChange={(event) => setField("endDate", event.target.value)} required />
          </Field>
```

(3) The sample rate (`:167-178`): its help becomes the `Field` hint (§4.4 row 8).

Replace:

```tsx
              <Field label={t("sampleRate")} required>
                <input
                  type="number"
                  value={values.sampleRate}
                  onChange={(event) => setField("sampleRate", event.target.value)}
                  required
                  min={1}
                  max={100}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">{t("sampleRateHelp")}</p>
              </Field>
```

with:

```tsx
              <Field label={t("sampleRate")} required hint={t("sampleRateHelp")}>
                <Input
                  type="number"
                  value={values.sampleRate}
                  onChange={(event) => setField("sampleRate", event.target.value)}
                  required
                  min={1}
                  max={100}
                />
              </Field>
```

(4) The preview button (#85, `:185`). It keeps no `disabled`: `busy` keeps focus on it and ignores clicks.

Replace:

```tsx
              <button
                type="button"
                onClick={handlePreview}
                disabled={previewing}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
              >
                {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                {t("preview")}
              </button>
```

with:

```tsx
              <Button variant="outline" busy={previewing} onClick={handlePreview}>
                <ClipboardList aria-hidden="true" />
                {t("preview")}
              </Button>
```

(5) The include-closed checkbox (`:261`).

Replace:

```tsx
              onChange={(event) => setIncludeClosedAssets(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-ring"
```

with:

```tsx
              onChange={(event) => setIncludeClosedAssets(event.target.checked)}
              className={cn(checkboxVariants(), "mt-0.5")}
```

(6) The save button (#86, `:269`). The F1 row around it keeps its classes.

Replace:

```tsx
            <button type="submit" disabled={saving || previewing} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {tCommon("save")}
            </button>
```

with:

```tsx
            <Button type="submit" busy={saving} disabled={previewing}>
              <Save aria-hidden="true" />
              {tCommon("save")}
            </Button>
```

(7) The local `Field` goes and the `Select` wrapper keeps its name, props and calls (§4.5). The file still ends with `}` and one line break.

Replace:

```tsx
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-danger">*</span>}
      </span>
      {children}
    </label>
  )
}

function Select({ label, value, required, onChange, children }: { label: string; value: string; required?: boolean; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <Field label={label} required={required}>
      <select value={value} required={required} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring">
        {children}
      </select>
    </Field>
  )
}
```

with:

```tsx
function Select({ label, value, required, onChange, children }: { label: string; value: string; required?: boolean; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <Field label={label} required={required}>
      <NativeSelect value={value} required={required} onChange={(event) => onChange(event.target.value)}>
        {children}
      </NativeSelect>
    </Field>
  )
}
```

Check: `grep -n "Loader2\|<input\|<select\|<textarea\|<button\|function Field\|text-danger\|disabled=" src/components/audit/audit-round-form.tsx` prints two lines: `:256` (`<input`, the include-closed checkbox) and `:268` (`disabled={previewing}`, on Save).

- [ ] **Step 5: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/audit-round-form-ui.test.ts tests/html-lang-and-years.test.ts tests/form-frames-ui.test.ts tests/audit-component-round-routes.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: PASS, 0 fail. `tests/form-migration-guards.test.ts` reports 23 tests and `tests/audit-round-form-ui.test.ts` 1.

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, and 1 more test than after Task 3.
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- `git diff --stat` shows exactly 2 files: `audit-round-form.tsx` with 22 insertions and 35 deletions, and `tests/form-migration-guards.test.ts` with 1 insertion and 5 deletions.
- `git status` also lists `?? tests/audit-round-form-ui.test.ts`.
- A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).

- [ ] **Step 7: Commit**

```bash
git add src/components/audit/audit-round-form.tsx tests/audit-round-form-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): audit round form on the shared fields, a sample-rate hint and busy preview and save (2C batch 3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the plan 3 dev-app check (`/th/audit/rounds/new` at 375, 768 and 1440):**
- fields 44px with 16px text on the phone and 40px on desktop; orange stars on name, year, the two dates, status and sampling; the 10 scope selects with the shared arrow
- the sampling help under its field in 13px grey, and NVDA reads it with the field
- "ดูตัวอย่าง": the spinner replaces the clipboard icon while loading, focus stays on it, and Save is grey until the preview returns; the preview box still shows its five numbers
- leave the name empty and press Save: the browser still stops the submit (native `required`); the year still accepts the Buddhist year and rejects one outside its range
- the include-closed row: clicking its text toggles the box

---

### Task 5: Batch 3 · `audit/audit-round-cancel-button.tsx` (dialog parts, a busy destructive confirm and a danger trigger)

Spec §8.9 "ชุด 3" row `audit-round-cancel-button.tsx` (dialog + trigger `:66`), with §5.4, §5.5 row 11 (layout ก, `space-y-4` in place of the guessed scroll box), §4.3 F5 (the reason gains its star), §4.13 (`disabled:opacity-60` goes), §6.3 #83–#84, §6.4.1 (the trigger: `danger`, `busy={saving}`, `w-full sm:w-auto`), §9.4 (the row), §10.1 and §10.3 "plan 3". One file, one commit (I30). The file is CRLF; edit it with exact-string replacement only. Its line numbers at `886a290` equal the spec's: trigger `:66`, dialog `:76`, form `:84`, scroll box `:85`, reason `:101`, footer `:114`, cancel `:115`, confirm `:123`.

Rulings this task applies:
- **K9, layout ก (§5.2):** the `<form>` takes `accessibleDialogFormClasses` and wraps `AccessibleDialogBody` and `AccessibleDialogFooter`, so the submit button stays inside the form (Enter and the native `required` still work) and the footer stays in view while the body scrolls. The scroll box `max-h-[calc(92dvh-10rem)]`, which guessed the free height, goes.
- **K8, K9 (§5.4):** `AccessibleDialogCancel` first (its default label is `tCommon("cancel")`, the same words as today; it calls the dialog's `onClose`, which is `closeDialog`, and it is disabled while `busy`), then the confirm.
- **K13, §6.3 #84:** the confirm is `Button type="submit" variant="destructive" busy={saving}` with the `AlertTriangle` icon kept; the spinner takes the icon's place while saving.
- **§6.4.1:** the trigger is `variant="danger"` (white with a red border and text; it was a light red fill), `busy={saving}`, `className="w-full sm:w-auto"`.
- **F5, K4:** the reason textarea keeps `required` (`CONSTRAINT_FLOORS` `[1, 0, 0]`) and gets `Field required`, so it shows the orange star and `aria-required` (one of the 12 fields of §4.3 F5 that gain a star). It keeps `id={reasonId}`, `disabled={saving}` (§4.13) and `min-h-28`.
- **I35:** the no-rollback warning box and the `ImpactItem` tiles stay as they are (2D).
- **Ruling, the test:** one test is appended to `tests/audit-round-cancellation.test.ts`, the file that already pins this component.

What users will see:
- The "ยกเลิกรอบตรวจ" button is white with a red border and red text, 44px on phones and 40px on desktop.
- In the dialog, the numbers, the warning and the reason scroll on their own and the two buttons stay at the bottom on a light bar. On phones Cancel is on top and the red "ยืนยันยกเลิก" below it; from `sm` they sit in a row on the right.
- The reason shows an orange star. While the round is cancelled, the confirm shows a spinner and keeps focus, and Cancel, X and Esc do nothing.

Not in this task:
- the toast `cancelReasonRequired` and every other check (K4)
- the warning box and `ImpactItem` (I35, 2D)
- the round detail page that renders this button (2B-2)
- messages: no key changes. Do not run a formatter.

**Files:**
- Modify: `src/components/audit/audit-round-cancel-button.tsx` (CRLF, 3 replacements)
- Modify: `tests/audit-round-cancellation.test.ts` (CRLF: append 1 test)
- Modify: `tests/form-migration-guards.test.ts` (only through `p2c-budget.mjs`)

**Must keep passing without edits:**
- `tests/audit-round-cancellation.test.ts:107-111`: `<AccessibleDialog`, no `fixed inset-0` or `role="dialog"`, `JSON.stringify({ action: "cancel", reason:`, `impact.processedItems`, `impact.approvedFindings`.
- `tests/accessible-dialog.test.ts` (the parts).

**Interfaces:**
- Consumes: plan 1 Task 4's `AccessibleDialogBody`, `AccessibleDialogFooter`, `AccessibleDialogCancel`, `accessibleDialogFormClasses`; 2A `Field`, `Textarea`, `Button`; Task 4's `p2c3-quotes.mjs`; Task 1's scripts.
- Produces: `audit/audit-round-cancel-button.tsx` in `MIGRATED_FILES`, out of `PENDING_FOOTER_PARTS`, with no budget entry left; `CONSTRAINT_FLOORS` `[1, 0, 0]` unchanged.

| file | `RAW_FIELDS` | `FIELD_CLASS_STRINGS` | `LOADER2` | `PENDING_FOOTER_PARTS` | `CONSTRAINT_FLOORS` |
|---|---|---|---|---|---|
| `audit/audit-round-cancel-button.tsx` | 1 → – | 1 → – | 2 → – | listed → removed | `[1, 0, 0]` unchanged |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `node <temp>/p2c3-precheck.mjs audit/audit-round-cancel-button.tsx`, then `node <temp>/p2c3-quotes.mjs 5`, then `git ls-files --eol src/components/audit/audit-round-cancel-button.tsx tests/audit-round-cancellation.test.ts`
Expected:
- `git status` prints nothing; Task 1's precheck ends with `preconditions hold for audit/audit-round-cancel-button.tsx`.
- `p2c3-quotes.mjs` prints:
```
ok      Tasks 1-4 are in MIGRATED_FILES
ok      audit/audit-round-cancel-button.tsx is not in MIGRATED_FILES yet
ok      guard rows: RAW_FIELDS 1, FIELD_CLASS_STRINGS 1, LOADER2 2
ok      CONSTRAINT_FLOORS [1, 0, 0]
ok      listed in PENDING_FOOTER_PARTS
ok      quoted text: 6 snippets at their counts
ok      tests/audit-round-cancellation.test.ts: holds the test this task appends after
info    line endings of audit/audit-round-cancel-button.tsx: CRLF
Task 5 preconditions hold
```
- `git ls-files --eol`: `i/lf w/crlf` for both. Keep them.

On any `MISSING` line, stop and report it.

- [ ] **Step 2: Lower the budgets and drop the file from the pending list (the failing guard)**

Run: `node <temp>/p2c-budget.mjs audit/audit-round-cancel-button.tsx RAW_FIELDS=1:0 FIELD_CLASS_STRINGS=1:0 LOADER2=2:0 --footer-done`
Expected:
```
RAW_FIELDS: 1 -> 0
FIELD_CLASS_STRINGS: 1 -> 0
LOADER2: 2 -> 0
PENDING_FOOTER_PARTS: removed audit/audit-round-cancel-button.tsx
MIGRATED_FILES: added audit/audit-round-cancel-button.tsx
```

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL, `tests 23 · pass 19 · fail 4`, each naming only `src/components/audit/audit-round-cancel-button.tsx`:
- GF2 `1 > 0`
- GF3 `1 > 0`
- GB1 `2 > 0`
- GD2 `1 AccessibleDialog, 0 AccessibleDialogFooter`

- [ ] **Step 3: Append the failing test to `tests/audit-round-cancellation.test.ts`**

Append this test at the end of `tests/audit-round-cancellation.test.ts` (keep its CRLF line endings):

```ts

test("the round cancel dialog keeps its footer in view, with a busy destructive confirm and a danger trigger (2C batch 3)", () => {
  const source = readFileSync("src/components/audit/audit-round-cancel-button.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /<Button variant="danger" busy=\{saving\} onClick=\{\(\) => setDialogOpen\(true\)\} className="w-full sm:w-auto">\n\s+<AlertTriangle aria-hidden="true" \/>\n\s+\{t\("cancelRound"\)\}/)
  assert.match(source, /<form onSubmit=\{handleSubmit\} className=\{accessibleDialogFormClasses\}>\n\s+<AccessibleDialogBody className="space-y-4">/)
  assert.match(source, /<Field label=\{t\("cancelReason"\)\} required>\n\s+<Textarea\n\s+id=\{reasonId\}[\s\S]*?\n\s+required\n[\s\S]*?className="min-h-28"\n\s+\/>\n\s+<\/Field>/)
  assert.match(source, /<AccessibleDialogFooter>\n\s+<AccessibleDialogCancel \/>\n\s+<Button type="submit" variant="destructive" busy=\{saving\}>\n\s+<AlertTriangle aria-hidden="true" \/>\n\s+\{t\("cancelConfirm"\)\}\n\s+<\/Button>\n\s+<\/AccessibleDialogFooter>/)
  assert.doesNotMatch(source, /<button\b|<textarea\b|Loader2|max-h-\[calc|disabled:opacity/)
})
```

Run: `node --test tests/audit-round-cancellation.test.ts`
Expected: FAIL, `tests 9 · pass 8 · fail 1`: the new test, first on the trigger regex.

- [ ] **Step 4: Move the dialog onto the parts (`src/components/audit/audit-round-cancel-button.tsx`)**

Make these 3 replacements in `src/components/audit/audit-round-cancel-button.tsx`.

(1) Imports. `Loader2` goes; the dialog parts, `Button`, `Field` and `Textarea` come in.

Replace:

```tsx
import { AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
import { useApiError } from "@/components/ui/use-api-error"
```

with:

```tsx
import { AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import {
  AccessibleDialog,
  AccessibleDialogBody,
  AccessibleDialogCancel,
  AccessibleDialogFooter,
  accessibleDialogFormClasses,
} from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
```

(2) The trigger (§6.4.1). `busy` keeps focus on it; it no longer turns faded.

Replace:

```tsx
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        disabled={saving}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-danger-border bg-danger-soft px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger-soft disabled:opacity-50 sm:h-10 sm:min-h-0 sm:w-auto"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
        {t("cancelRound")}
      </button>
```

with:

```tsx
      <Button variant="danger" busy={saving} onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
        <AlertTriangle aria-hidden="true" />
        {t("cancelRound")}
      </Button>
```

(3) The dialog content: layout ก (§5.2). The impact grid and the warning box move into the body unchanged.

Replace:

```tsx
        <form onSubmit={handleSubmit}>
          <div className="max-h-[calc(92dvh-10rem)] space-y-4 overflow-y-auto px-4 py-4">
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <ImpactItem label={t("cancelImpactProcessed")} value={impact.processedItems} />
              <ImpactItem label={t("cancelImpactPending")} value={impact.pendingItems} />
              <ImpactItem label={t("cancelImpactPendingFindings")} value={impact.pendingFindings} />
              <ImpactItem label={t("cancelImpactApprovedFindings")} value={impact.approvedFindings} />
              <ImpactItem label={t("cancelImpactOpenActions")} value={impact.openActions} />
              <ImpactItem label={t("cancelImpactScanHistory")} value={impact.scanHistoryRows} />
            </div>
            <div className="rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning">
              {t("cancelNoRollbackWarning")}
            </div>
            <div>
              <label htmlFor={reasonId} className="text-sm font-medium text-foreground">
                {t("cancelReason")}
              </label>
              <textarea
                id={reasonId}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                disabled={saving}
                rows={4}
                required
                placeholder={t("cancelReasonPlaceholder")}
                className="mt-2 min-h-28 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring disabled:opacity-60"
              />
            </div>
          </div>

          <div className="grid gap-2 border-t border-border bg-background px-4 py-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={closeDialog}
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-danger px-4 text-sm font-semibold text-white transition-colors hover:bg-danger-hover disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              {t("cancelConfirm")}
            </button>
          </div>
        </form>
```

with:

```tsx
        <form onSubmit={handleSubmit} className={accessibleDialogFormClasses}>
          <AccessibleDialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <ImpactItem label={t("cancelImpactProcessed")} value={impact.processedItems} />
              <ImpactItem label={t("cancelImpactPending")} value={impact.pendingItems} />
              <ImpactItem label={t("cancelImpactPendingFindings")} value={impact.pendingFindings} />
              <ImpactItem label={t("cancelImpactApprovedFindings")} value={impact.approvedFindings} />
              <ImpactItem label={t("cancelImpactOpenActions")} value={impact.openActions} />
              <ImpactItem label={t("cancelImpactScanHistory")} value={impact.scanHistoryRows} />
            </div>
            <div className="rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning">
              {t("cancelNoRollbackWarning")}
            </div>
            <Field label={t("cancelReason")} required>
              <Textarea
                id={reasonId}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                disabled={saving}
                rows={4}
                required
                placeholder={t("cancelReasonPlaceholder")}
                className="min-h-28"
              />
            </Field>
          </AccessibleDialogBody>

          <AccessibleDialogFooter>
            <AccessibleDialogCancel />
            <Button type="submit" variant="destructive" busy={saving}>
              <AlertTriangle aria-hidden="true" />
              {t("cancelConfirm")}
            </Button>
          </AccessibleDialogFooter>
        </form>
```

Notes:
- `closeDialog` stays: it is the dialog's `onClose`, which `AccessibleDialogCancel` calls, and it still refuses to close while saving. `tCommon` stays for `tCommon("error")`. `useId` stays for `reasonId`; `Field` reuses the child's id.

Check: `grep -n "Loader2\|<textarea\|<button\|<label\|max-h-\[calc\|opacity" src/components/audit/audit-round-cancel-button.tsx` prints nothing.

- [ ] **Step 5: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/audit-round-cancellation.test.ts tests/accessible-dialog.test.ts tests/list-frame-guards.test.ts`
Expected: PASS, 0 fail. `tests/form-migration-guards.test.ts` reports 23 tests and `tests/audit-round-cancellation.test.ts` 9.

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 0 fail and 1 more test than after Task 4; tsc no errors; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat`
Expected: exactly 3 files. `audit-round-cancel-button.tsx` 27 insertions and 37 deletions, `tests/audit-round-cancellation.test.ts` 9 insertions, `tests/form-migration-guards.test.ts` 1 insertion and 4 deletions. A file that shows every line changed was normalized: restore its line endings first.

- [ ] **Step 7: Commit**

```bash
git add src/components/audit/audit-round-cancel-button.tsx tests/audit-round-cancellation.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): round cancel dialog with a fixed footer, busy destructive confirm and danger trigger (2C batch 3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 3 dev-app check (an in-progress round, `/th/audit/rounds/<id>`, at 375 and 1440; close with Cancel, never confirm):**
- the trigger: white with a red border, 44px on the phone, 40px on desktop, `w-full` on the phone
- the dialog at 375: the body scrolls under a fixed footer; Cancel on top, red "ยืนยันยกเลิก" below; at 1440 one row on the right; the X reads "ปิด"
- the reason shows the orange star; with it empty, Enter in the textarea adds a line and pressing the confirm stops on the browser's `required` message (nothing is sent)
- Tab order: the reason, Cancel, the confirm, the X

---

### Task 6: Batch 3 · `audit/audit-findings-batch-actions.tsx` (the dialog side: no `closeLabel`; the stale 2B rows)

Spec §8.9 "ชุด 3" row `audit-findings-batch-actions.tsx` ("ฝั่ง dialog"; the list part is 2B's, O5), §5.3 (the table row `audit-findings-batch-actions.tsx:131`: the caller stops passing `closeLabel={tCommon("close")}`), §5.12 batch 3, §9.4 (the row) and DH "UI Round 4 Phase 2B Plan 2" → "Handed on to 2C plan 3". One file, one commit (I30). The file is CRLF; edit it with exact-string replacement only. Line at `886a290`: `closeLabel` `:131` (as in the spec); `<ConfirmTextDialog>` `:124-138`.

Rulings this task applies:
- **§5.3, ruling ด8 of §5:** `ConfirmTextDialog` (Task 1) passes an absent `closeLabel` on to `AccessibleDialog`, whose X then reads `tCommon("close")` "ปิด". The caller's own `tCommon("close")` repeats that default, so the line goes. `cancelLabel={tCommon("cancel")}` stays (Task 1 keeps the prop).
- **2B-2 hand-over (DH):** 2B-2 already moved this file's list checkbox and its two toolbar spinners, so its `OLD_MARKUP` (1) and `LOADER2` (2) rows count sites that are gone. Both rows go to 0 now, against the "→ 1" / "→ 2" of their FMG comments and spec §9.4, which predate 2B-2.
- **Ruling (DH table, row `GB1 LOADER2 :307`):** 2B-2 also removed the two row-trigger spinners of `audit/audit-finding-review-actions.tsx` (batch 1d, migrated in plan 1), whose `LOADER2` row still allows 2. The DH hands that row to plan 3, and this is the plan's findings task, so this commit deletes it too. `p2c-budget.mjs` cannot (it would add the file to `MIGRATED_FILES` a second time), so a one-line script does it. The file's source is not touched.
- **Ruling, the test:** one test is appended to `tests/confirm-text-dialog-ui.test.ts`, which already reads this file. That test file reads without stripping `\r`; the new test strips it itself.

What users will see: nothing changes on screen. The batch review dialog's X still reads "ปิด"; it now comes from the dialog itself, like every other dialog.

Not in this task:
- the list part: the checkboxes, the three toolbar buttons and their `busy` (2B-2, `tests/list-pages-ui.test.ts:244-252`)
- `ConfirmTextDialog` itself (Task 1) and `audit-finding-review-actions.tsx` (plan 1, its dialogs; 2B-2, its triggers)
- messages: no key changes. Do not run a formatter.

**Files:**
- Modify: `src/components/audit/audit-findings-batch-actions.tsx` (CRLF, 1 replacement)
- Modify: `tests/confirm-text-dialog-ui.test.ts` (CRLF: append 1 test)
- Modify: `tests/form-migration-guards.test.ts` (through `p2c-budget.mjs` and `p2c3-review-loader-row.mjs`)
- Temp folder only, never committed: `p2c3-review-loader-row.mjs`

**Must keep passing without edits:**
- `tests/confirm-text-dialog-ui.test.ts:15-24` (`ConfirmTextDialog` in this file, no `window.prompt`) and whatever Task 1 added to that file.
- `tests/list-pages-ui.test.ts:244-252` (2B-2's pins of the list part, including `/<ConfirmTextDialog\n/`).
- `tests/list-frame-guards.test.ts` (the file is in `MIGRATED_LIST_FILES`).

**Interfaces:**
- Consumes: Task 1's `ConfirmTextDialog` with `closeLabel?: string` and `cancelLabel: string`; Task 4's `p2c3-quotes.mjs`; Task 1's scripts.
- Produces: `audit/audit-findings-batch-actions.tsx` in `MIGRATED_FILES` with no budget entry; `audit/audit-finding-review-actions.tsx` with no `LOADER2` entry.

| file | `OLD_MARKUP` | `LOADER2` | live count at `886a290` |
|---|---|---|---|
| `audit/audit-findings-batch-actions.tsx` | 1 → – | 2 → – | 0 and 0 (2B-2) |
| `audit/audit-finding-review-actions.tsx` | – | 2 → – | 0 (2B-2) |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `node <temp>/p2c3-precheck.mjs audit/audit-findings-batch-actions.tsx`, then `node <temp>/p2c3-quotes.mjs 6`, then `git ls-files --eol src/components/audit/audit-findings-batch-actions.tsx tests/confirm-text-dialog-ui.test.ts`
Expected:
- `git status` prints nothing; Task 1's precheck ends with `preconditions hold for audit/audit-findings-batch-actions.tsx`.
- `p2c3-quotes.mjs` prints:
```
ok      Tasks 1-5 are in MIGRATED_FILES
ok      audit/audit-findings-batch-actions.tsx is not in MIGRATED_FILES yet
ok      guard rows: OLD_MARKUP 1, LOADER2 2
ok      CONSTRAINT_FLOORS none
ok      not listed in PENDING_FOOTER_PARTS
ok      quoted text: 3 snippets at their counts
ok      tests/confirm-text-dialog-ui.test.ts: holds the test this task appends after
ok      Task 1 kept closeLabel?: string and cancelLabel on ConfirmTextDialog
ok      LOADER2 still holds 2 for audit/audit-finding-review-actions.tsx, which has no <Loader2 left
info    line endings of audit/audit-findings-batch-actions.tsx: CRLF
Task 6 preconditions hold
```
- `git ls-files --eol`: `i/lf w/crlf` for both. Keep them.

On any `MISSING` line, stop and report it.

- [ ] **Step 2: Drop the stale rows**

Run: `node <temp>/p2c-budget.mjs audit/audit-findings-batch-actions.tsx OLD_MARKUP=1:0 LOADER2=2:0`
Expected:
```
OLD_MARKUP: 1 -> 0
LOADER2: 2 -> 0
MIGRATED_FILES: added audit/audit-findings-batch-actions.tsx
```

Save this script as `p2c3-review-loader-row.mjs` in your temp folder (never in the repo):

```js
// Task 6 of plan 3: delete the LOADER2 row of audit/audit-finding-review-actions.tsx. 2B-2 removed the two row-trigger
// spinners it allowed (DH "Handed on to 2C plan 3"). The file is already in MIGRATED_FILES, so p2c-budget.mjs cannot do
// this. Writes nothing unless the row is there exactly once inside LOADER2. Never commit this file.
import { readFileSync, writeFileSync } from "node:fs"

const GUARD = "tests/form-migration-guards.test.ts"
const raw = readFileSync(GUARD, "utf8")
const eol = raw.includes("\r\n") ? "\r\n" : "\n"
const lines = raw.split(/\r?\n/)
const row = "  [`${C}audit/audit-finding-review-actions.tsx`]: 2, // → 2: the row triggers :102, :112 (2B, O21)"
const start = lines.findIndex((line) => /^const LOADER2\b/.test(line))
const end = lines.findIndex((line, index) => index > start && /^}/.test(line))
const hits = lines.flatMap((line, index) => (line === row && index > start && index < end ? [index] : []))
if (start === -1 || hits.length !== 1) {
  console.error(`ABORT, nothing written: expected the row once inside LOADER2, found ${hits.length}`)
  process.exit(1)
}
lines.splice(hits[0], 1)
writeFileSync(GUARD, lines.join(eol))
console.log("LOADER2: audit/audit-finding-review-actions.tsx 2 -> 0")
```

Run: `node <temp>/p2c3-review-loader-row.mjs`
Expected: `LOADER2: audit/audit-finding-review-actions.tsx 2 -> 0`

Run: `node --test tests/form-migration-guards.test.ts`
Expected: PASS, `tests 23 · pass 23`. This step fails nothing: 2B-2 already removed these sites; the rows go so the sites cannot come back.

- [ ] **Step 3: Append the failing test to `tests/confirm-text-dialog-ui.test.ts`**

Append this test at the end of `tests/confirm-text-dialog-ui.test.ts` (keep its CRLF line endings):

```ts

test("the findings batch dialog takes its X name from the dialog, not from its caller (2C batch 3, spec §5.3)", () => {
  const source = readFileSync("src/components/audit/audit-findings-batch-actions.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /cancelLabel=\{tCommon\("cancel"\)\}\n\s+busy=\{reviewing !== null\}/)
  assert.doesNotMatch(source, /closeLabel=/)
})
```

Run: `node --test tests/confirm-text-dialog-ui.test.ts`
Expected: FAIL, 1 fail: the new test, on `/cancelLabel=\{tCommon\("cancel"\)\}\n\s+busy=\{reviewing !== null\}/`.

- [ ] **Step 4: Drop the caller's close label (`src/components/audit/audit-findings-batch-actions.tsx`)**

Make this replacement in `src/components/audit/audit-findings-batch-actions.tsx`.

Replace:

```tsx
        cancelLabel={tCommon("cancel")}
        closeLabel={tCommon("close")}
        busy={reviewing !== null}
```

with:

```tsx
        cancelLabel={tCommon("cancel")}
        busy={reviewing !== null}
```

`tCommon` stays (the cancel label and `tCommon("error")`).

- [ ] **Step 5: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/confirm-text-dialog-ui.test.ts tests/list-pages-ui.test.ts tests/list-frame-guards.test.ts`
Expected: PASS, 0 fail. `tests/form-migration-guards.test.ts` reports 23 tests.

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 0 fail and 1 more test than after Task 5; tsc no errors; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat`
Expected: exactly 3 files. `audit-findings-batch-actions.tsx` 1 deletion, `tests/confirm-text-dialog-ui.test.ts` 6 insertions, `tests/form-migration-guards.test.ts` 1 insertion and 3 deletions.

- [ ] **Step 7: Commit**

```bash
git add src/components/audit/audit-findings-batch-actions.tsx tests/confirm-text-dialog-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): findings batch dialog takes its close label from the dialog; drop the guard rows 2B-2 emptied (2C batch 3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 3 dev-app check (`/th/audit/findings`, tick one finding, open "อนุมัติที่เลือก" and "ปฏิเสธที่เลือก", close each with Cancel):** the X reads "ปิด" (NVDA and the tooltip); the dialog itself is Task 1's.

---

### Task 7: Batch 3 · `audit/audit-scan-room-picker.tsx` (sheet chrome, the department on `Field` + `NativeSelect`, the clear button in a footer)

Spec §8.9 "ชุด 3" row `audit-scan-room-picker.tsx` (sheet chrome + `NativeSelect` `:86`; never `:75`, O20), with §5.3 (the sheet stops passing `closeLabel`), §5.8 (the row: no `closeLabel` `:61`, no header class `:70`, the footer `:125-133` as a `SheetFooter`), §6.3 #92, §4.3 F1/F4, §4.14 (the row), §9.4 (the row, `RAW_FIELDS` 2 → 1), §9.8 (`audit-scan-room-ui.test.ts:47-49`), §10.4 table D "plan 2–5" (`audit-scan-room-ui.test.ts:31`, `min-h-11` stays). One file, one commit (I30). The file is CRLF; edit it with exact-string replacement only. Its line numbers at `886a290` equal the spec's.

Rulings this task applies:
- **O20:** the room search `<input type="search">` `:75-82` and its `getFieldControlClasses()` stay exactly as they are; so does the `getFieldControlClasses` import. `RAW_FIELDS` keeps 1 for it (the FMG comment "→ 1").
- **§5.3, §5.8:** without `closeLabel`, the sheet's X reads `tCommon("close")` from the primitive (the same "ปิด"), so the file's `tCommon` goes. Without its class, `SheetHeader` uses the primitive's `border-b border-border px-4 py-4 pr-16` (it was `p-4` + `border-b border-border pr-14`).
- **§4.3 F1/F4:** the department `<label>` + `<span>` + `<select>` becomes `<Field label={t("roomDepartment")}><NativeSelect …/></Field>` (04-fields line 478). No `required` (the department is optional); the label moves from 12px muted to the 13px `FieldLabel`.
- **§5.8 and §6.3 #92 together:** the clear button becomes `Button variant="outline"` in `<SheetFooter className="border-t border-border-soft bg-background px-4 py-3">`. §5.8 writes the button without a class ("full width, because `flex-col`"); §6.3 #92 keeps `w-full`. This task keeps `className="w-full"`: §6.3 owns the button's classes, and the width then does not depend on `SheetFooter`'s alignment.
- **Kept on purpose:** the trigger (`SheetTrigger asChild` with its `min-h-11` button, `data-audit-scan-room`), the room rows with `aria-pressed` and `min-h-11`, `onOpenAutoFocus` with its comment, and `listRef`. They are not in the button table and tests pin them.
- **Ruling, the test:** one test is appended to `tests/audit-scan-room-ui.test.ts`, the file that already pins this sheet.

What users will see:
- The room sheet's header gets the shared padding (16px, the title clear of the X) and a white sheet as before.
- The department picker gets the shared field look and a 13px label in the text color.
- "ไม่เลือกห้อง" sits on a light footer bar with a soft top line, full width; 44px on phones, 40px from `md`.
- The X still reads "ปิด".

Not in this task:
- the room search line (O20), the room list (`audit-scan-room-list.tsx`, P0) and `use-audit-scan-room.ts`
- `ui/sheet.tsx` (plan 1)
- messages: no key changes. Do not run a formatter.

**Files:**
- Modify: `src/components/audit/audit-scan-room-picker.tsx` (CRLF, 6 replacements)
- Modify: `tests/audit-scan-room-ui.test.ts` (CRLF: append 1 test)
- Modify: `tests/form-migration-guards.test.ts` (only through `p2c-budget.mjs`)

**Must keep passing without edits:**
- `tests/audit-scan-room-ui.test.ts:24-32`: `<SheetTrigger asChild>`, `side={isDesktop ? "right" : "bottom"}`, `t("roomPendingOfTotal", { pending: option.pending, total: option.total })`, `t("roomAllDepartments")`, `choose({ locationId: "", departmentId: "" })`, `min-h-11`.
- `tests/audit-scan-room-ui.test.ts:45-51`: `<ul ref={listRef}`, `onOpenAutoFocus={(event) => {` then its comment line and `event.preventDefault()`, the `querySelector` string, no `autoFocus`.

**Interfaces:**
- Consumes: 2A `Field`, `NativeSelect`, `Button`; plan 1's `SheetFooter`, `SheetHeader` defaults and the X label default; Task 4's `p2c3-quotes.mjs`; Task 1's scripts.
- Produces: `audit/audit-scan-room-picker.tsx` in `MIGRATED_FILES`, `RAW_FIELDS` 1 (the room search, O20).

| file | `RAW_FIELDS` |
|---|---|
| `audit/audit-scan-room-picker.tsx` | 2 → 1 (the room search `:75`, O20) |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `node <temp>/p2c3-precheck.mjs audit/audit-scan-room-picker.tsx`, then `node <temp>/p2c3-quotes.mjs 7`, then `git ls-files --eol src/components/audit/audit-scan-room-picker.tsx tests/audit-scan-room-ui.test.ts`
Expected:
- `git status` prints nothing; Task 1's precheck ends with `preconditions hold for audit/audit-scan-room-picker.tsx`.
- `p2c3-quotes.mjs` prints:
```
ok      Tasks 1-6 are in MIGRATED_FILES
ok      audit/audit-scan-room-picker.tsx is not in MIGRATED_FILES yet
ok      guard rows: RAW_FIELDS 2
ok      CONSTRAINT_FLOORS none
ok      not listed in PENDING_FOOTER_PARTS
ok      quoted text: 8 snippets at their counts
ok      tests/audit-scan-room-ui.test.ts: holds the test this task appends after
info    line endings of audit/audit-scan-room-picker.tsx: CRLF
Task 7 preconditions hold
```
- `git ls-files --eol`: `i/lf w/crlf` for both. Keep them.

On any `MISSING` line, stop and report it.

- [ ] **Step 2: Lower the budget (the failing guard)**

Run: `node <temp>/p2c-budget.mjs audit/audit-scan-room-picker.tsx RAW_FIELDS=2:1`
Expected:
```
RAW_FIELDS: 2 -> 1
MIGRATED_FILES: added audit/audit-scan-room-picker.tsx
```
The entry keeps its comment `// → 1: the room search :75 stays (O20)`.

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL, `tests 23 · pass 22 · fail 1`: GF2 `src/components/audit/audit-scan-room-picker.tsx: 2 > 1`.

- [ ] **Step 3: Append the failing test to `tests/audit-scan-room-ui.test.ts`**

Append this test at the end of `tests/audit-scan-room-ui.test.ts` (keep its CRLF line endings; the file's `read` strips `\r`):

```ts

test("the room sheet takes its X name and header from Sheet, the department is a shared field and clearing sits in a footer (2C batch 3)", () => {
  const source = read("src/components/audit/audit-scan-room-picker.tsx")
  assert.doesNotMatch(source, /closeLabel=|<SheetHeader className=|tCommon|<select\b|<label\b/)
  assert.match(source, /<SheetHeader>\n\s+<SheetTitle>\{t\("roomSheetTitle"\)\}<\/SheetTitle>/)
  assert.match(source, /<Field label=\{t\("roomDepartment"\)\}>\n\s+<NativeSelect\n\s+value=\{room\.departmentId\}/)
  assert.match(source, /<SheetFooter className="border-t border-border-soft bg-background px-4 py-3">\n\s+<Button variant="outline" onClick=\{\(\) => choose\(\{ locationId: "", departmentId: "" \}\)\} className="w-full">\n\s+\{t\("roomClear"\)\}\n\s+<\/Button>\n\s+<\/SheetFooter>/)
  assert.equal(source.match(/<input\b/g)?.length, 1, "the room search stays as it is (spec O20)")
  assert.match(source, /<input\n\s+type="search"\n\s+value=\{query\}\n\s+onChange=\{\(event\) => setQuery\(event\.target\.value\)\}\n\s+placeholder=\{t\("roomSheetSearch"\)\}\n\s+aria-label=\{t\("roomSheetSearch"\)\}\n\s+className=\{getFieldControlClasses\(\)\}\n\s+\/>/)
})
```

Run: `node --test tests/audit-scan-room-ui.test.ts`
Expected: FAIL, `tests 10 · pass 9 · fail 1`: the new test, on its `doesNotMatch`.

- [ ] **Step 4: Move the sheet onto the primitives (`src/components/audit/audit-scan-room-picker.tsx`)**

Make these 6 replacements in `src/components/audit/audit-scan-room-picker.tsx`. None of them touches `onOpenAutoFocus` (`:63-68`) or the room search (`:75-82`).

(1) Imports: `Button`, `Field`, `NativeSelect` and `SheetFooter` come in; `getFieldControlClasses` stays for the room search.

Replace:

```tsx
import { useTranslations } from "next-intl"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
```

with:

```tsx
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { NativeSelect } from "@/components/ui/native-select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
```

(2) `tCommon` was only for the close label.

Replace:

```tsx
  const t = useTranslations("auditScan")
  const tCommon = useTranslations("common")
  const isDesktop = useMediaQuery("(min-width: 48rem)")
```

with:

```tsx
  const t = useTranslations("auditScan")
  const isDesktop = useMediaQuery("(min-width: 48rem)")
```

(3) The X label comes from `SheetContent` (`:61`).

Replace:

```tsx
        side={isDesktop ? "right" : "bottom"}
        closeLabel={tCommon("close")}
```

with:

```tsx
        side={isDesktop ? "right" : "bottom"}
```

(4) The header uses the primitive's classes (`:70`).

Replace:

```tsx
        <SheetHeader className="border-b border-border pr-14">
          <SheetTitle>{t("roomSheetTitle")}</SheetTitle>
```

with:

```tsx
        <SheetHeader>
          <SheetTitle>{t("roomSheetTitle")}</SheetTitle>
```

(5) The department (`:84-98`).

Replace:

```tsx
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("roomDepartment")}</span>
              <select
                value={room.departmentId}
                onChange={(event) => choose({ locationId: room.locationId, departmentId: event.target.value })}
                className={getFieldControlClasses()}
              >
                <option value="">{t("roomAllDepartments")}</option>
                {selected.departments.map((department) => (
                  <option key={department.departmentId} value={department.departmentId}>
                    {department.label} ({department.total})
                  </option>
                ))}
              </select>
            </label>
```

with:

```tsx
            <Field label={t("roomDepartment")}>
              <NativeSelect
                value={room.departmentId}
                onChange={(event) => choose({ locationId: room.locationId, departmentId: event.target.value })}
              >
                <option value="">{t("roomAllDepartments")}</option>
                {selected.departments.map((department) => (
                  <option key={department.departmentId} value={department.departmentId}>
                    {department.label} ({department.total})
                  </option>
                ))}
              </NativeSelect>
            </Field>
```

(6) The clear button in a footer (#92, `:125-133`).

Replace:

```tsx
        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={() => choose({ locationId: "", departmentId: "" })}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("roomClear")}
          </button>
        </div>
```

with:

```tsx
        <SheetFooter className="border-t border-border-soft bg-background px-4 py-3">
          <Button variant="outline" onClick={() => choose({ locationId: "", departmentId: "" })} className="w-full">
            {t("roomClear")}
          </Button>
        </SheetFooter>
```

`SheetFooter` is `mt-auto flex flex-col gap-2 p-4`. `cn` keeps its `p-4` beside `px-4 py-3` (tailwind-merge drops a `p-*` only when it comes after them), and Tailwind writes `padding-inline` and `padding-block` after `padding`, so the footer gets 16px sides and 12px top and bottom.

Check: `grep -n "<input\|<select\|<label\|closeLabel\|tCommon\|getFieldControlClasses" src/components/audit/audit-scan-room-picker.tsx` prints 3 lines: `:12` (the import), `:76` (`<input`) and `:82` (`className={getFieldControlClasses()}`).

- [ ] **Step 5: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/audit-scan-room-ui.test.ts tests/sheet-drawers-ui.test.ts tests/ui-overlay-guards.test.ts`
Expected: PASS, 0 fail. `tests/form-migration-guards.test.ts` reports 23 tests and `tests/audit-scan-room-ui.test.ts` 10.

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 0 fail and 1 more test than after Task 6; tsc no errors; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat`
Expected: exactly 3 files. `audit-scan-room-picker.tsx` 13 insertions and 18 deletions, `tests/audit-scan-room-ui.test.ts` 10 insertions, `tests/form-migration-guards.test.ts` 2 insertions and 1 deletion.

- [ ] **Step 7: Commit**

```bash
git add src/components/audit/audit-scan-room-picker.tsx tests/audit-scan-room-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): room picker sheet on the shared header, department field and footer (2C batch 3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 3 dev-app check (the scan screen `/th/audit/rounds/<id>/scan` at 375 and 768 (bottom sheet) and 1440 (right sheet)):**
- opening the sheet focuses the chosen room (or the first), not the search box, so the phone keyboard stays down
- the header: the title clear of the X; the X reads "ปิด"
- pick a room with departments: the department field has a 13px label and the shared arrow; choosing one closes the sheet
- "ไม่เลือกห้อง" sits on the light footer, full width, and clears the room
- at 375 the footer clears the home bar on a real iPhone (`pb-[env(safe-area-inset-bottom)]` of the bottom sheet)

---

### Task 8: Batch 3 · `audit/audit-scan-check-panel.tsx` (sheet chrome only)

Spec §8.9 "ชุด 3" row `audit-scan-check-panel.tsx` (chrome of the sheet; `visual-foundation-guards.test.ts:26`), with §5.3 and §5.8 (the row: no `closeLabel` `:54`, no header class `:64`; never `onCloseAutoFocus` `:56-62` or the heading's `tabIndex={-1}`), §9.4 (no budget), §9.8 (`audit-scan-check-ui.test.ts:71`, `:76`, `:77`; VFG `:26`). One file, one commit (I30). The file is CRLF; edit it with exact-string replacement only. Its line numbers at `886a290` equal the spec's.

Rulings this task applies:
- **§5.3, §5.8:** without `closeLabel`, the X reads `tCommon("close")` from `SheetContent`, so the file's `tCommon` goes. Without its class, `SheetHeader` uses the primitive's `border-b border-border px-4 py-4 pr-16`. `SheetDescription className="truncate"` stays.
- **Not touched:** the wide `<aside>` panel and its heading (VFG `:26`), `onCloseAutoFocus` with its comment, the `useEffect` that focuses the heading, and the body `min-h-0 flex-1 overflow-y-auto p-4`.
- **FMG:** the file holds no budget, so the commit only adds it to `MIGRATED_FILES`; from now on GF4, GF6, GF8, GB2 and GB3 cover it. Nothing in FMG fails first; the appended UI test does.
- **Ruling, the test:** one test is appended to `tests/audit-scan-check-ui.test.ts`, which already pins this panel.

What users will see: on phones, the check sheet's header gets the shared padding (title clear of the X). The X still reads "ปิด". Wide screens do not change.

Not in this task: the check form inside (`audit-scan-check-form.tsx`, plan 1) · `ui/sheet.tsx` · messages (no key changes). Do not run a formatter.

**Files:**
- Modify: `src/components/audit/audit-scan-check-panel.tsx` (CRLF, 3 replacements)
- Modify: `tests/audit-scan-check-ui.test.ts` (CRLF: append 1 test)
- Modify: `tests/form-migration-guards.test.ts` (only through `p2c-budget.mjs`)

**Must keep passing without edits:**
- `tests/visual-foundation-guards.test.ts:26`: `tabIndex={-1} className="text-base font-semibold text-foreground outline-none"` on one line.
- `tests/audit-scan-check-ui.test.ts:55-61` (`<SheetContent\s+side="bottom"`, `onCloseAutoFocus` … `returnFocusRef.current`, `<aside`, `if (isWide)`), `:70-74` (`onReturnFocusMissing?: () => void`, the two-line `if … else`), `:76-80` (`<h2 ref={headingRef} tabIndex={-1}`, the three-line `useEffect`).

**Interfaces:**
- Consumes: plan 1's `SheetContent` close-label default and `SheetHeader` classes; Task 4's `p2c3-quotes.mjs`; Task 1's scripts.
- Produces: `audit/audit-scan-check-panel.tsx` in `MIGRATED_FILES` (no budget rows, before or after).

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `node <temp>/p2c3-precheck.mjs audit/audit-scan-check-panel.tsx`, then `node <temp>/p2c3-quotes.mjs 8`, then `git ls-files --eol src/components/audit/audit-scan-check-panel.tsx tests/audit-scan-check-ui.test.ts`
Expected:
- `git status` prints nothing; Task 1's precheck ends with `preconditions hold for audit/audit-scan-check-panel.tsx`.
- `p2c3-quotes.mjs` prints:
```
ok      Tasks 1-7 are in MIGRATED_FILES
ok      audit/audit-scan-check-panel.tsx is not in MIGRATED_FILES yet
ok      guard rows: none
ok      CONSTRAINT_FLOORS none
ok      not listed in PENDING_FOOTER_PARTS
ok      quoted text: 4 snippets at their counts
ok      tests/audit-scan-check-ui.test.ts: holds the test this task appends after
info    line endings of audit/audit-scan-check-panel.tsx: CRLF
Task 8 preconditions hold
```
- `git ls-files --eol`: `i/lf w/crlf` for both. Keep them.

On any `MISSING` line, stop and report it.

- [ ] **Step 2: Add the file to `MIGRATED_FILES`**

Run: `node <temp>/p2c-budget.mjs audit/audit-scan-check-panel.tsx`
Expected: `MIGRATED_FILES: added audit/audit-scan-check-panel.tsx` (no budget line: the file has none).

Run: `node --test tests/form-migration-guards.test.ts`
Expected: PASS, `tests 23 · pass 23`.

- [ ] **Step 3: Append the failing test to `tests/audit-scan-check-ui.test.ts`**

Append this test at the end of `tests/audit-scan-check-ui.test.ts` (keep its CRLF line endings; the file's `read` strips `\r`):

```ts

test("the phone check sheet takes its X name and header from Sheet (2C batch 3)", () => {
  const source = read("src/components/audit/audit-scan-check-panel.tsx")
  assert.doesNotMatch(source, /closeLabel=|<SheetHeader className=|tCommon/)
  assert.match(source, /<SheetContent\n\s+side="bottom"\n\s+className="max-h-\[92dvh\] gap-0 rounded-t-xl"\n\s+onCloseAutoFocus=/)
  assert.match(source, /<SheetHeader>\n\s+<SheetTitle>\{title\}<\/SheetTitle>\n\s+<SheetDescription className="truncate">\{description\}<\/SheetDescription>\n\s+<\/SheetHeader>/)
})
```

Run: `node --test tests/audit-scan-check-ui.test.ts`
Expected: FAIL, `tests 13 · pass 12 · fail 1`: the new test, on its `doesNotMatch`.

- [ ] **Step 4: Drop the chrome the primitive owns (`src/components/audit/audit-scan-check-panel.tsx`)**

Make these 3 replacements in `src/components/audit/audit-scan-check-panel.tsx`.

(1) `tCommon` was only for the close label.

Replace:

```tsx
  const t = useTranslations("auditScan")
  const tCommon = useTranslations("common")
  const headingRef = useRef<HTMLHeadingElement | null>(null)
```

with:

```tsx
  const t = useTranslations("auditScan")
  const headingRef = useRef<HTMLHeadingElement | null>(null)
```

(2) The X label (`:54`).

Replace:

```tsx
        side="bottom"
        closeLabel={tCommon("close")}
        className="max-h-[92dvh] gap-0 rounded-t-xl"
```

with:

```tsx
        side="bottom"
        className="max-h-[92dvh] gap-0 rounded-t-xl"
```

(3) The header (`:64`).

Replace:

```tsx
        <SheetHeader className="border-b border-border pr-14">
          <SheetTitle>{title}</SheetTitle>
```

with:

```tsx
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
```

Check: `grep -n "closeLabel\|tCommon\|pr-14" src/components/audit/audit-scan-check-panel.tsx` prints nothing.

- [ ] **Step 5: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/audit-scan-check-ui.test.ts tests/visual-foundation-guards.test.ts tests/sheet-drawers-ui.test.ts`
Expected: PASS, 0 fail. `tests/audit-scan-check-ui.test.ts` reports 13 tests.

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 0 fail and 1 more test than after Task 7; tsc no errors; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat`
Expected: exactly 3 files. `audit-scan-check-panel.tsx` 1 insertion and 3 deletions, `tests/audit-scan-check-ui.test.ts` 7 insertions, `tests/form-migration-guards.test.ts` 1 insertion.

- [ ] **Step 7: Commit**

```bash
git add src/components/audit/audit-scan-check-panel.tsx tests/audit-scan-check-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): check panel sheet takes its header and close label from Sheet (2C batch 3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 3 dev-app check (the scan screen at 375 and 768, open an item):** the title and the truncated description clear the X; the X reads "ปิด"; closing returns focus to the row or the search box that opened it (and to the list when that row is gone); at 1440 the inline panel still takes focus on its heading.

---

### Task 9: Batch 3 · `maintenance/maintenance-plan-state-actions.tsx` (dialog footer part with a verb confirm, `Button sm` triggers, and the guard state after batch 3)

Spec §8.9 "ชุด 3" row `maintenance-plan-state-actions.tsx` (dialog + trigger `:50`; stays a dialog, not `useConfirm`, K12), with §5.4, §5.5 row 18 (layout ค: the footer only), ruling ด12 of §5, §5.9 (last bullet), §6.3 #114–#115, §6.4.1 (the trigger: `variant={action === "end" ? "danger" : "outline"}` `size="sm"`), §6.2.5, §9.4 (the row) and §10.3 "plan 3". One file, one commit (I30). The file is CRLF; edit it with exact-string replacement only. Its line numbers at `886a290` equal the spec's: trigger `:50`, dialog `:60`, footer `:67`, cancel `:68`, confirm `:71`.

Rulings this task applies:
- **K12, ด12:** the dialog stays an `AccessibleDialog` (it must wait with `busy` while the plan saves, which `useConfirm` cannot). Layout ค: `AccessibleDialogFooter` is its only child; the description carries the text, and `first:border-t-0` keeps the footer's line off the header's.
- **K8, K9 (§5.4):** `AccessibleDialogCancel` (default label `tCommon("cancel")`; it calls the dialog's `onClose` and is disabled while `busy`) comes first, the confirm last. The `flex-col-reverse` row goes (FMG `REVERSE` 1 → 0).
- **ด12, §5.5 row 18:** the confirm names its action with the existing keys: `{pendingAction ? t(\`pmActions.${pendingAction}\`) : null}` ("พักแผน" / "เปิดใช้งานต่อ" / "จบแผน"), in place of "ยืนยัน". "จบแผน" is `destructive`, the other two `default`. No new key (§5.10).
- **K13, §6.3 #115:** the confirm is `busy={saving}` with no `disabled`; the spinner goes before its text (it has no icon).
- **§6.4.1, §6.2.5:** the triggers are `Button size="sm"` (44px on phones, 32px from `md`), `outline`, or `danger` for "จบแผน"; their icons lose `h-3.5 w-3.5` (16px from `Button`) and gain `aria-hidden="true"`.
- **Accepted:** while the dialog closes (about 200ms), `pendingAction` is already `null`, so the confirm's label empties and its color returns to `default`, just as the title already empties today. No state is added to hold the old action.
- **Ruling, the test:** one test is appended to `tests/pm-plans-ui.test.ts`, which already holds the PM call-site tests of plan 1.

What users will see:
- On the PM list, the pause, resume and end buttons look like the other small buttons: white with a grey border, "จบแผน" with a red border and text; 44px on phones and 32px on desktop.
- In the dialog, the buttons sit on a light bar under the header. The confirm says what it does ("พักแผน", "เปิดใช้งานต่อ" or the red "จบแผน") instead of "ยืนยัน". On phones Cancel is on top and the confirm below it (they were reversed).
- While the plan saves, the confirm shows a spinner and keeps focus; Cancel, X and Esc do nothing.

Not in this task:
- the PM list page that renders these buttons (2B-2; `tests/list-pages-ui.test.ts:442`) and an `open()` handle (DH "Handed on, later")
- the toast and `getMaintenanceErrorMessage` path
- messages: no key changes. Do not run a formatter.

**Files:**
- Modify: `src/components/maintenance/maintenance-plan-state-actions.tsx` (CRLF, 3 replacements)
- Modify: `tests/pm-plans-ui.test.ts` (CRLF: append 1 test)
- Modify: `tests/form-migration-guards.test.ts` (only through `p2c-budget.mjs`)
- Temp folder only, never committed: `p2c3-guard-state.mjs`

**Must keep passing without edits:**
- `tests/pm-plans-ui.test.ts:5-10`, `tests/maintenance-plan-routes.test.ts:23` (`MaintenancePlanStateActions` on the PM page), `tests/list-pages-ui.test.ts:442` (`{canEdit ? <MaintenancePlanStateActions planId={plan.id} state={plan.planState as MaintenancePlanState} /> : null}`).
- `tests/accessible-dialog.test.ts` (the parts).

**Interfaces:**
- Consumes: plan 1 Task 4's `AccessibleDialogFooter` and `AccessibleDialogCancel`; 2A `Button`; Task 4's `p2c3-quotes.mjs`; Task 1's scripts; Tasks 1–8 committed.
- Produces: `maintenance/maintenance-plan-state-actions.tsx` in `MIGRATED_FILES`, out of `PENDING_FOOTER_PARTS`, with no budget entry; the end state of batch 3 (Step 8).

| file | `LOADER2` | `REVERSE` | `PENDING_FOOTER_PARTS` |
|---|---|---|---|
| `maintenance/maintenance-plan-state-actions.tsx` | 1 → – | 1 → – | listed → removed |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `node <temp>/p2c3-precheck.mjs maintenance/maintenance-plan-state-actions.tsx`, then `node <temp>/p2c3-quotes.mjs 9`, then `git ls-files --eol src/components/maintenance/maintenance-plan-state-actions.tsx tests/pm-plans-ui.test.ts`
Expected:
- `git status` prints nothing; Task 1's precheck ends with `preconditions hold for maintenance/maintenance-plan-state-actions.tsx`.
- `p2c3-quotes.mjs` prints:
```
ok      Tasks 1-8 are in MIGRATED_FILES
ok      maintenance/maintenance-plan-state-actions.tsx is not in MIGRATED_FILES yet
ok      guard rows: LOADER2 1, REVERSE 1
ok      CONSTRAINT_FLOORS none
ok      listed in PENDING_FOOTER_PARTS
ok      quoted text: 5 snippets at their counts
ok      tests/pm-plans-ui.test.ts: holds the test this task appends after
info    line endings of maintenance/maintenance-plan-state-actions.tsx: CRLF
Task 9 preconditions hold
```
- `git ls-files --eol`: `i/lf w/crlf` for both. Keep them.

On any `MISSING` line, stop and report it.

- [ ] **Step 2: Lower the budgets and drop the file from the pending list (the failing guard)**

Run: `node <temp>/p2c-budget.mjs maintenance/maintenance-plan-state-actions.tsx LOADER2=1:0 REVERSE=1:0 --footer-done`
Expected:
```
LOADER2: 1 -> 0
REVERSE: 1 -> 0
PENDING_FOOTER_PARTS: removed maintenance/maintenance-plan-state-actions.tsx
MIGRATED_FILES: added maintenance/maintenance-plan-state-actions.tsx
```

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL, `tests 23 · pass 20 · fail 3`, each naming only `src/components/maintenance/maintenance-plan-state-actions.tsx`:
- GB1 `1 > 0`
- GD2 `1 AccessibleDialog, 0 AccessibleDialogFooter`
- GD4 `1 > 0` (`flex-col-reverse`)

- [ ] **Step 3: Append the failing test to `tests/pm-plans-ui.test.ts`**

Append this test at the end of `tests/pm-plans-ui.test.ts` (keep its CRLF line endings):

```ts

test("PM plan state buttons are Button sm, and their dialog keeps a busy verb confirm in a fixed footer (2C batch 3, K12)", () => {
  const source = readFileSync("src/components/maintenance/maintenance-plan-state-actions.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /<Button key=\{action\} variant=\{action === "end" \? "danger" : "outline"\} size="sm" onClick=\{\(\) => setPendingAction\(action\)\}>/)
  assert.match(source, /<AccessibleDialogFooter>\n\s+<AccessibleDialogCancel \/>\n\s+<Button variant=\{pendingAction === "end" \? "destructive" : "default"\} busy=\{saving\} onClick=\{submitAction\}>\n\s+\{pendingAction \? t\(`pmActions\.\$\{pendingAction\}`\) : null\}\n\s+<\/Button>\n\s+<\/AccessibleDialogFooter>/)
  assert.match(source, /<AccessibleDialog\n/, "the dialog stays: it waits with busy while the plan saves, which useConfirm cannot (K12)")
  assert.doesNotMatch(source, /<button\b|Loader2|flex-col-reverse|tCommon\("confirm"\)|useConfirm/)
})
```

Run: `node --test tests/pm-plans-ui.test.ts`
Expected: FAIL, `tests 4 · pass 3 · fail 1`: the new test, first on the trigger regex.

- [ ] **Step 4: Move the triggers and the dialog footer onto the shared parts (`src/components/maintenance/maintenance-plan-state-actions.tsx`)**

Make these 3 replacements in `src/components/maintenance/maintenance-plan-state-actions.tsx`.

(1) Imports. `Loader2` goes; `AccessibleDialogCancel`, `AccessibleDialogFooter` and `Button` come in.

Replace:

```tsx
import { Loader2, Pause, Play, Square } from "lucide-react"
import { toast } from "sonner"
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
```

with:

```tsx
import { Pause, Play, Square } from "lucide-react"
import { toast } from "sonner"
import { AccessibleDialog, AccessibleDialogCancel, AccessibleDialogFooter } from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
```

(2) The triggers (§6.4.1, `:50`).

Replace:

```tsx
        <button
          key={action}
          type="button"
          onClick={() => setPendingAction(action)}
          className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-h-8 ${action === "end" ? "border-danger-border text-danger hover:bg-danger-soft" : "border-border bg-surface text-foreground hover:bg-accent"}`}
        >
          {action === "pause" ? <Pause className="h-3.5 w-3.5" /> : action === "resume" ? <Play className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
          {t(`pmActions.${action}`)}
        </button>
```

with:

```tsx
        <Button key={action} variant={action === "end" ? "danger" : "outline"} size="sm" onClick={() => setPendingAction(action)}>
          {action === "pause" ? <Pause aria-hidden="true" /> : action === "resume" ? <Play aria-hidden="true" /> : <Square aria-hidden="true" />}
          {t(`pmActions.${action}`)}
        </Button>
```

(3) The dialog: layout ค (`:67-74`).

Replace:

```tsx
        <div className="flex flex-col-reverse gap-2 p-5 sm:flex-row sm:justify-end">
          <button type="button" disabled={saving} onClick={() => setPendingAction(null)} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            {tCommon("cancel")}
          </button>
          <button type="button" disabled={saving} onClick={submitAction} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{tCommon("confirm")}
          </button>
        </div>
```

with:

```tsx
        <AccessibleDialogFooter>
          <AccessibleDialogCancel />
          <Button variant={pendingAction === "end" ? "destructive" : "default"} busy={saving} onClick={submitAction}>
            {pendingAction ? t(`pmActions.${pendingAction}`) : null}
          </Button>
        </AccessibleDialogFooter>
```

`tCommon` stays for `tCommon("error")`; the dialog's `onClose={() => setPendingAction(null)}` is what `AccessibleDialogCancel` calls.

Check: `grep -n "<button\|Loader2\|flex-col-reverse\|tCommon(\"confirm\")\|h-3.5" src/components/maintenance/maintenance-plan-state-actions.tsx` prints nothing.

- [ ] **Step 5: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/pm-plans-ui.test.ts tests/maintenance-plan-routes.test.ts tests/list-pages-ui.test.ts tests/accessible-dialog.test.ts`
Expected: PASS, 0 fail. `tests/form-migration-guards.test.ts` reports 23 tests and `tests/pm-plans-ui.test.ts` 4.

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 0 fail and 1 more test than after Task 8; tsc no errors; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat`
Expected: exactly 3 files. `maintenance-plan-state-actions.tsx` 12 insertions and 18 deletions, `tests/pm-plans-ui.test.ts` 8 insertions, `tests/form-migration-guards.test.ts` 1 insertion and 3 deletions.

- [ ] **Step 7: Commit**

```bash
git add src/components/maintenance/maintenance-plan-state-actions.tsx tests/pm-plans-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): PM plan state dialog with a fixed footer and verb confirm, Button sm triggers (2C batch 3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

- [ ] **Step 8: Check the guard state after batch 3**

Save this script as `p2c3-guard-state.mjs` in your temp folder (never in the repo):

```js
// Guard state after batch 3: run from the worktree root. Prints every budget of tests/form-migration-guards.test.ts as
// "NAME: <entries> entries, <sum>" and fails if a batch-3 file holds more than batch 3 keeps on purpose. Never commit this file.
import { readFileSync } from "node:fs"

const guard = readFileSync("tests/form-migration-guards.test.ts", "utf8").replace(/\r\n/g, "\n")
const block = (name) => new RegExp(`^const ${name}\\b[\\s\\S]*?^[}\\]]`, "m").exec(guard)?.[0] ?? ""
const entries = (name) => [...block(name).matchAll(/^\s+\[`\$\{C\}([^`]+)`\]: (\[[^\]]*\]|\d+)/gm)].map((match) => ({ path: match[1], value: match[2] }))
const listed = (name) => [...block(name).matchAll(/^\s+`\$\{C\}([^`]+)`,/gm)].map((match) => match[1])
const batch3 = [.../^\s+"3": \[([^\]]*)\]/m.exec(guard)?.[1].matchAll(/"([^"]+)"/g) ?? []].map((match) => match[1])
// What batch 3 keeps on purpose (spec §9.4, I27): the room search (O20) and the spinners outside buttons in the two bulk
// dialogs (bulk approval: its two status lines; bulk execution: BusyLabel), as Tasks 2 and 3 leave them.
const KEEP = {
  "RAW_FIELDS audit/audit-scan-room-picker.tsx": "1",
  "LOADER2 disposal/disposal-bulk-approval.tsx": "2",
  "LOADER2 disposal/disposal-bulk-execution.tsx": "1",
}
const problems = []
for (const name of ["LOCAL_FIELD", "RAW_FIELDS", "FIELD_CLASS_STRINGS", "OLD_MARKUP", "LOADER2", "OLD_HELPERS", "REVERSE", "CLOSE_LABEL_IS_CANCEL", "FIXED_BOTTOM_BARS"]) {
  const list = entries(name)
  console.log(`${name}: ${list.length} entries, ${list.reduce((sum, item) => sum + Number(item.value), 0)}`)
  for (const item of list) {
    if (batch3.includes(item.path) && KEEP[`${name} ${item.path}`] !== item.value) problems.push(`${name} holds ${item.value} for ${item.path}`)
    if (item.path === "audit/audit-finding-review-actions.tsx" && name === "LOADER2") problems.push("LOADER2 still holds a row for audit/audit-finding-review-actions.tsx (Task 6)")
  }
}
for (const [key, value] of Object.entries(KEEP)) {
  const [name, path] = key.split(" ")
  if (!entries(name).some((item) => item.path === path && item.value === value)) problems.push(`${name} should keep ${value} for ${path}`)
}
console.log(`CONSTRAINT_FLOORS: ${entries("CONSTRAINT_FLOORS").length} entries`)
const migrated = listed("MIGRATED_FILES")
console.log(`MIGRATED_FILES: ${migrated.length} (batch 3: ${batch3.filter((path) => migrated.includes(path)).length} of ${batch3.length})`)
const pending = listed("PENDING_FOOTER_PARTS")
console.log(`PENDING_FOOTER_PARTS: ${pending.length}`)
for (const path of pending) if (batch3.includes(path)) problems.push(`PENDING_FOOTER_PARTS still lists ${path}`)
for (const path of batch3) if (!migrated.includes(path)) problems.push(`MIGRATED_FILES lacks ${path}`)
if (problems.length > 0) {
  console.error(problems.join("\n"))
  process.exit(1)
}
console.log("batch 3 holds only what it keeps")
```

Run: `node <temp>/p2c3-guard-state.mjs`
Expected, exactly:
```
LOCAL_FIELD: 2 entries, 2
RAW_FIELDS: 14 entries, 33
FIELD_CLASS_STRINGS: 12 entries, 30
OLD_MARKUP: 9 entries, 26
LOADER2: 15 entries, 21
OLD_HELPERS: 1 entries, 1
REVERSE: 1 entries, 1
CLOSE_LABEL_IS_CANCEL: 1 entries, 1
FIXED_BOTTOM_BARS: 3 entries, 3
CONSTRAINT_FLOORS: 38 entries
MIGRATED_FILES: 43 (batch 3: 9 of 9)
PENDING_FOOTER_PARTS: 5
batch 3 holds only what it keeps
```

This is the end state of batch 3. Against plan 3's start (HEAD `886a290`):
- `LOCAL_FIELD` 3 entries (3) → 2 (2): `admin/admin-user-form.tsx` and `admin/role-permission-form.tsx` (batch 4).
- `RAW_FIELDS` 19 (48) → 14 (33): the 13 batch-4 entries (32) and the room search (1, O20).
- `FIELD_CLASS_STRINGS` 17 (44) → 12 (30) and `OLD_MARKUP` 13 (38) → 9 (26): batch 4 only.
- `LOADER2` 20 (33) → 15 (21): batch 1 keeps 4 (`maintenance-attachments` 1, `disposal-asset-picker` 1, `audit-scan-check-form` 1, `asset-component-manager` 1), batch 3 keeps 3 (bulk approval 2, bulk execution 1), batch 4 keeps 9 entries (14). Task 6 also removed the stale `audit-finding-review-actions` row (2).
- `REVERSE` 3 → 1 (`IntegrationClientManager`, batch 4). `OLD_HELPERS`, `CLOSE_LABEL_IS_CANCEL` and `FIXED_BOTTOM_BARS` unchanged.
- `CONSTRAINT_FLOORS` 38 entries, unchanged (floors never drop).
- `MIGRATED_FILES` 34 → 43: the 34 files of plans 1–2, then the 9 batch-3 files in task order.
- `PENDING_FOOTER_PARTS` 10 → 5: `maintenance-attachments` (batch 5) and the four batch-4 dialogs (`IntegrationClientManager`, `asset-state-review-dialog`, `asset-register-table`, `transaction-cancel-dialog`), as spec §9.4 expects after batch 3.

If any line differs, stop and report it (do not edit a budget to make it match). If Tasks 2 or 3 record different `LOADER2` values for the bulk dialogs in their Produces, the controller updates `KEEP` and the `LOADER2` line together before this step.

No commit in this step.

**For the plan 3 dev-app check (`/th/maintenance/pm`, a plan in each state, at 375 and 1440; close every dialog with Cancel):**
- the row buttons: "พักแผน" / "เปิดใช้งานต่อ" outline, "จบแผน" with a red border; 44px on the phone, 32px on desktop; icons 16px
- each dialog: the title and help, then the footer bar with no double line under the header; the confirm reads "พักแผน", "เปิดใช้งานต่อ" or a red "จบแผน"; at 375 Cancel on top
- Tab order: Cancel, the confirm, the X; Esc closes; focus returns to the row button

---

### Task 10: Verify, production build and dev-app check (controller runs this task, not an implementer)

**Files:**
- Create then delete: a configuration in the main checkout's `.claude/launch.json` (temporary; never committed)
- Evidence: `.superpowers/sdd/screenshots/ui-phase2c-plan3/after/` in the main checkout (git-ignored)
- Modify: only files needed to fix problems found here. Each fix gets its own small commit in the worktree, with a test where one is possible, through an implementer and the normal review.

**Interfaces:**
- Consumes: Tasks 1–9 committed; the Task 0 ids and before images.
- Produces: the after images and `.superpowers/sdd/<plan workspace>/task-10-findings.md`, which Task 11 turns into the "Dev-app check" bullets.

- [ ] **Step 1: Full verify.** From the worktree, run `npm run verify` (lint, tests, build). Record the test count and the build page count for Task 12.

- [ ] **Step 2: Production server.** Confirm the worktree's dev database (Task 0 Step 2). Add a configuration `asset-2c3-start-3101` to the main checkout's `.claude/launch.json` with `runtimeExecutable: "node"`, `runtimeArgs: [".worktrees/ui-phase2c-plan3/node_modules/next/dist/bin/next", "start", ".worktrees/ui-phase2c-plan3", "-p", "3101"]`, `port: 3101`, `autoPort: false`, and start it with `preview_start`. Log in with the seed admin; do not echo the password. Prefer `waitUntil: "load"` plus a short wait over `networkidle`.

- [ ] **Step 3: Writes nothing.** Every dialog and sheet is opened to its first screen and closed with its cancel button or Esc. Never press a confirm or Save. Count POST, PUT, PATCH and DELETE requests while doing so: 0.

- [ ] **Step 4: Screens.** Take every Task 0 view again under the same name in `after/` and compare (height, wrapping, truncation, lost color or shape). Then check, in Thai, at 1440, 768 and 375, plus one English pass at 1440 and 200% zoom at 1440:
  - **Every dialog of the batch** (round cancel, findings approve/reject-selected, PM pause/resume/end, the bulk approval and execution dialogs where the dev data allows): the shared header with the X close, the body, the footer part (no hand-made sticky footer), the confirm on the right, the cancel before it; on phones the dialog fits above the home bar; Esc and the X close it and focus returns to the button that opened it.
  - **The audit round form** (new and edit): 6 fields in `Field` with labels and the star on required ones, 40px on desktop and ≥44px with 16px text on phones; the dates keep their behavior (no `min` change, V track).
  - **The scan room picker and check panel sheets** at 375 and 768: the shared sheet header and close, the room list keeps its 44px rows (`tests/audit-scan-room-ui.test.ts`), the select is a `NativeSelect`, the search line unchanged.
  - **`ConfirmTextDialog`** (opened from the findings reject-selected): the confirm shows `busy` only while working, and keeps its label.
  - The list parts of the three shared files look exactly as plan 2B-2 left them.

- [ ] **Step 5: Keyboard.** Tab order in each dialog follows the visual order with cancel before confirm; focus starts on the first field or the cancel button as before; Esc closes; focus returns to the opener; the round form's fields show the focus ring; an empty required field still shows the browser warning on Save (do not let it submit).

- [ ] **Step 6: axe.** Inject `node_modules/axe-core/axe.min.js` with `page.addScriptTag({ path })` (from a script under `.playwright-mcp/` that you delete right after the run; `.playwright-mcp/` is linted) and run `axe.run(dialog, { runOnly: ["color-contrast", "label", "aria-valid-attr-value", "aria-required-attr", "button-name", "nested-interactive"] })` on each open dialog and sheet of Step 4 and on `/th/audit/rounds/new`. Expected: 0 violations.

- [ ] **Step 7: Forced colors and reduced motion.** With Playwright `emulateMedia`: dialog borders, focus rings and field borders stay visible; the busy spinner stops under reduced motion; sheets do not slide.

- [ ] **Step 8: NVDA and real devices.** If NVDA is not available to you, list these checks for the user and do not mark them done: each dialog reads its title and description on open · required fields read "จำเป็น" and the star is not read · the busy confirm reads as busy · the sheet close button reads "ปิด". Real iPhone and iPad: the dialogs and sheets clear the home bar and the keyboard; the round form's fields do not zoom. With data the dev database may lack: the disposal bulk approval and execution dialogs end to end up to the confirm. Add them to the open manual checks; all of them must be done before the one phase-2 deploy.

- [ ] **Step 9: Findings report.** Write `task-10-findings.md` in the plan workspace, in the shape Task 11 fills its markers from:
  - **Fixes made:** commit + one line each, or "none".
  - **Checked and passed:** what was checked, where and at which widths, with the results.
  - **Found but not caused by plan 3.**
  - **Accepted mixes.**
  - **Still needs a person:** the Step 8 list and anything else not checked.

- [ ] **Step 10: Clean up.** Stop the server, remove the configuration from the main checkout's `.claude/launch.json` (delete the file if nothing else is in it), and delete every helper script you put under either tree. `git status --short` in the worktree must show nothing.

---

### Task 11: Repo documentation for plan 3 (repo docs only; the controller adds the verify numbers, the rebase and the wiki in Task 12)

Spec §10.6 lists what each document holds and §8.12 ends every plan with its documents; DH "Handed on to 2C plan 3" (plan 2B-2) is the state this plan started from. Batch 3 adds no primitive and no rule, so the design docs change only where they count what is left after batch 3, plus one sentence for the case Task 3 met (a hint on a status soft fill). The handoff and the changelog get a plan 3 entry. All four files are CRLF in the working tree (`i/lf w/crlf`): edit them with exact-string replacement, keep the endings, never run a formatter, and match on the quoted strings, not on line numbers (the numbers below are those at `886a290`; Tasks 1–10 do not touch these files).

Rulings made in this task:
- **What goes where:**
  - `DESIGN.md` (3 replacements): §3 Label (`:288`) and §5 Inputs "Migration" (`:462`) count what is left after batch 3, as plan 2 did after batch 2. The `Field` bullet (`:450`) gains one sentence: a hint on a status soft fill is a `FieldHint` with `text-muted-foreground` (Task 3's ruling: spec F6 said `FieldHint`, and §2 Neutral never puts faint ink on a soft fill). Every other rule batch 3 applies is already written: the footer parts and the K8 order, a busy confirm that keeps its label, `closeLabel` only when the name differs, a sentence in the body as a `Notice` instead of a long footer label, white sheets with the shared header.
  - `docs/14_UI_UX_DESIGN_SYSTEM.md` (2 replacements) follows `DESIGN.md`: the `Field` row (`:60`) gets the same rule, and the "Forms and dialogs" registry row (`:102`) links this plan.
  - `DEVELOPER_HANDOFF.md` (1 replacement): a new section before `## Open Go-Live Decisions` (`:582`): what moved, the guard state, "2C plan 4 may start once 2B plan 3 also merges", and what plan 4, plan 5, 2D and the V track inherit. No older bullet becomes false (the 2B plan 2 section's "Handed on to 2C plan 3" is history, and the new section says it is done), so no older line changes: plan 2B-3 writes its own section beside this one in the same days, and every untouched line is one rebase conflict less.
  - `docs/99_CHANGELOG.md` (1 or 2 replacements): the Thai entry under `## <today>`, shaped like the plan 2 entry.
  - **Not changed:** `.impeccable/design.json` (no component entry changes; its "Dialog" and "Text Field" entries already describe the parts and the field) · `docs/07_UAT_CHECKLIST.md` and `docs/11_FEATURE_LIST.md` (no workflow or feature changes; the checks that need a person go into the handoff's "Still open" here and into the wiki in Task 12) · `src/`, `tests/`, `messages/`.
- **No sheet-footer rule.** Task 7 gives the room picker `<SheetFooter className="border-t border-border-soft bg-background px-4 py-3">` (spec §5.8), while the register filter sheet (2B, `assets/asset-register-filter-sheet.tsx`, which plan 2B-3 keeps) has `grid grid-cols-2 gap-2 border-t border-border`. A general sheet-footer rule in `DESIGN.md` would contradict one of them, so the handoff records both looks for 2D.
- **The guard numbers** are the live totals after Task 9 (Task 9 Step 8) against `886a290`. The check script recomputes them from `tests/form-migration-guards.test.ts` and `git show 886a290:tests/form-migration-guards.test.ts`, and recomputes every line number the handoff hands on from the files. If Step 1 or Step 3 prints other numbers (a Task 10 fix moved a line or a row), write the printed ones and say so in the task report.
- **The findings markers** (`<from task-10-findings.md>` twice in the handoff, `<จาก task-10-findings.md>` once in the changelog) come from Task 10's `task-10-findings.md` (the controller names its path), in the shape of the plan 2 and plan 2B-2 bullets: what was checked and where, the results, fixes with their commits or "none", accepted mixes, issues found but not caused by plan 3, and what still needs a person. The "Dev-app check (Task 10)" bullet is one paragraph; "Still open" becomes nested bullets when it has more than two items. Task 12 Step 1 adds its verify bullet directly above "Dev-app check (Task 10)" and "ตรวจบนแอป (Task 10)".
- **Dates:** the handoff heading and the changelog date use the day this task runs (`<today>`, Step 1). In the worktree the newest changelog date is `## 2026-10-13` (plan 2B-3's entry is not on this branch until Task 12). If `<today>` is 2026-10-13, the entry goes under that heading, above the 2B plan 2 entry; otherwise a new date block goes on top with the `---` separator the file uses.
- **The plan file name:** the docs link `docs/superpowers/plans/2026-10-13-ui-phase2c-plan3.md`. If the controller saved plan 3 under another name, replace that path everywhere in this task (the check script's `PLAN` included) before Step 2.
- **Rebase with plan 2B-3 (Task 12 Step 2):** `DESIGN.md:462` is one line that holds both this plan's field counts and 2B's list-filter status ("plans 2B-3 to 2B-5 move the rest"), which plan 2B-3's docs task is likely to edit, and both plans add a section before `## Open Go-Live Decisions` and an entry under the newest changelog date. If plan 2B-3 merges first: on `:462` keep this task's 2C sentences and 2B-3's list-filter clause; keep both handoff sections and both changelog entries in merge order.

**Files:**
- Modify: `DESIGN.md` (CRLF; 3 replacements): §3 Typography, Hierarchy, **Label** (`:288`) · §5 Inputs / Fields, the **`Field`** bullet (`:450`) and **Migration** (`:462`)
- Modify: `docs/14_UI_UX_DESIGN_SYSTEM.md` (CRLF; 2 replacements): the `Field` row (`:60`) and the "Forms and dialogs" registry row (`:102`)
- Modify: `DEVELOPER_HANDOFF.md` (CRLF; 1 replacement): a new section before `## Open Go-Live Decisions` (`:582`)
- Modify: `docs/99_CHANGELOG.md` (CRLF; 1 or 2 replacements): the 2C plan 3 entry at the top (`:7`)
- Not changed: `.impeccable/design.json`, `docs/07_UAT_CHECKLIST.md`, `docs/11_FEATURE_LIST.md`, `src/`, `tests/`, `messages/`, the wiki (Task 12)
- Temp folder only, never committed: `check-docs-2c3.mjs`

**Interfaces:**
- Consumes: Tasks 1–10 committed; `task-10-findings.md` (dev-app check, fixes, accepted mixes, still open); `<temp>/p2c3-guard-state.mjs` from Task 9 Step 8 (save it again from there if it is missing).
- Produces:
  - `DEVELOPER_HANDOFF.md` section `## UI Round 4 Phase 2C Plan 3 Disposal, Audit and Maintenance Dialogs (<today>)` with a `- Dev-app check (Task 10):` bullet, and `docs/99_CHANGELOG.md` entry `### dialog ตัดจำหน่าย ตรวจนับ และซ่อมบำรุงที่เหลือ (UI รอบ 4 เฟส 2C plan 3)` with a `- **ตรวจบนแอป (Task 10):**` bullet. Task 12 Step 1 adds its verify bullet directly above each.
  - The hand-off that 2C plan 4 reads in its Task 0 (the guard state after batch 3), the lines 2C plan 5 needs (the two discard-selection `confirm()` calls), and the boxes and footers left for 2D and the V track.

- [ ] **Step 1: Check the base**

Run: `git diff --quiet 886a290 HEAD -- DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md .impeccable/design.json docs/07_UAT_CHECKLIST.md docs/11_FEATURE_LIST.md && echo DOCS-UNCHANGED`
Expected: `DOCS-UNCHANGED` (Tasks 1–10 did not touch them; if a Task 10 fix did, re-read the quoted strings below against the file).

Run: `git ls-files --eol DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md`
Expected: `i/lf    w/crlf` for all four.

Run: `ls docs/superpowers/plans/2026-10-13-ui-phase2c-plan3.md`, then read the `task-10-findings.md` the controller names.
Expected: the plan file exists (the docs link it; if it has another name, see the rulings), and the findings have the five parts of Task 10 Step 9.

Run: `git status --short src tests messages`
Expected: nothing.

Run: `node <temp>/p2c3-guard-state.mjs`
Expected (exit 0), the end state of batch 3 that Steps 6 and 7 describe:
```
LOCAL_FIELD: 2 entries, 2
RAW_FIELDS: 14 entries, 33
FIELD_CLASS_STRINGS: 12 entries, 30
OLD_MARKUP: 9 entries, 26
LOADER2: 15 entries, 21
OLD_HELPERS: 1 entries, 1
REVERSE: 1 entries, 1
CLOSE_LABEL_IS_CANCEL: 1 entries, 1
FIXED_BOTTOM_BARS: 3 entries, 3
CONSTRAINT_FLOORS: 38 entries
MIGRATED_FILES: 43 (batch 3: 9 of 9)
PENDING_FOOTER_PARTS: 5
batch 3 holds only what it keeps
```

Run: `node -e "console.log(new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }))"`
Expected: a date such as `2026-10-13`. This is `<today>` in Steps 6 and 7: replace every `<today>` below with it.

- [ ] **Step 2: Write the check script (it fails first).** Save as `check-docs-2c3.mjs` in your temp folder:

```js
// check-docs-2c3.mjs: run from the worktree root. Checks the plan 2C-3 docs edits of Task 11, and that the guard numbers
// and line numbers they give are the ones in the files now (the base numbers come from `git show 886a290:`).
// Reads only. Never commit this file. Optional argument: the base commit (default 886a290).
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"

const BASE = process.argv[2] ?? "886a290"
const PLAN = "docs/superpowers/plans/2026-10-13-ui-phase2c-plan3.md"
const files = ["DESIGN.md", "docs/14_UI_UX_DESIGN_SYSTEM.md", "DEVELOPER_HANDOFF.md", "docs/99_CHANGELOG.md"]
const lf = (value) => value.replace(/\r\n/g, "\n")
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

// The guard file now and at the base (tests/form-migration-guards.test.ts, FMG).
const fmgNow = lf(readFileSync("tests/form-migration-guards.test.ts", "utf8"))
const fmgBase = lf(execFileSync("git", ["show", `${BASE}:tests/form-migration-guards.test.ts`], { encoding: "utf8" }))
const block = (guard, name) => new RegExp(`^const ${name}\\b[\\s\\S]*?^[}\\]]`, "m").exec(guard)?.[0] ?? ""
const rows = (guard, name) => [...block(guard, name).matchAll(/^\s+\[`\$\{C\}([^`]+)`\]: (\[[^\]]*\]|\d+)/gm)].map((match) => ({ path: match[1], value: match[2] }))
const listed = (guard, name) => [...block(guard, name).matchAll(/^\s+`\$\{C\}([^`]+)`,/gm)].map((match) => match[1])
const sum = (list) => list.reduce((total, row) => total + Number(row.value), 0)
const batch = (name) => [...(new RegExp(`^\\s+"${name}": \\[([^\\]]*)\\]`, "m").exec(fmgNow)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((match) => match[1])
const BATCH3 = batch("3")
const BATCH4 = batch("4")
const budget = (name) => `\`${name}\` ${sum(rows(fmgBase, name))} in ${rows(fmgBase, name).length} files → ${sum(rows(fmgNow, name))} in ${rows(fmgNow, name).length}`
const fieldsNow = rows(fmgNow, "RAW_FIELDS")
const kept = sum(fieldsNow.filter((row) => row.path === "assets/asset-label-print.tsx" || row.path === "audit/audit-scan-room-picker.tsx"))
const moved = sum(rows(fmgBase, "RAW_FIELDS").filter((row) => BATCH3.includes(row.path))) - sum(fieldsNow.filter((row) => BATCH3.includes(row.path)))
const migrated = [listed(fmgBase, "MIGRATED_FILES").length, listed(fmgNow, "MIGRATED_FILES").length]
const pending = [listed(fmgBase, "PENDING_FOOTER_PARTS").length, listed(fmgNow, "PENDING_FOOTER_PARTS").length]
const unchanged = ["OLD_HELPERS", "CLOSE_LABEL_IS_CANCEL", "FIXED_BOTTOM_BARS"]

// Line numbers the handoff gives, read from the files now.
const C = "src/components/"
const lines = (path) => lf(readFileSync(C + path, "utf8")).split("\n")
const lineOf = (path, literal) => lines(path).findIndex((row) => row.includes(literal)) + 1
const at = (path, literal) => `\`${path}:${lineOf(path, literal)}\``
const APPROVAL = "disposal/disposal-bulk-approval.tsx"
const EXECUTION = "disposal/disposal-bulk-execution.tsx"
const handedOn = [
  `${at(APPROVAL, "confirm({ title: copy.discardSelection")} and ${at(EXECUTION, "confirm({ title: copy.discardSelection")}`,
  `the zero-eligible box ${at(APPROVAL, "bg-warning-soft p-3 text-sm text-foreground\">{copy.zeroEligible}")}`,
  `the historical warning box ${at(EXECUTION, "<section className=\"space-y-3 rounded-md border border-warning-border bg-warning-soft p-3\">")}`,
  `the no-rollback warning ${at("audit/audit-round-cancel-button.tsx", "rounded-md border border-warning-border bg-warning-soft")}`,
  `the end date ${at("audit/audit-round-form.tsx", "<Field label={t(\"endDate\")} required>")}`,
  `${at("audit/audit-scan-room-picker.tsx", "<SheetFooter className=\"border-t border-border-soft bg-background px-4 py-3\">")}`,
]
const guardFragments = [
  `\`MIGRATED_FILES\` ${migrated[0]} → ${migrated[1]}`,
  `\`PENDING_FOOTER_PARTS\` ${pending[0]} → ${pending[1]}`,
  ...["LOCAL_FIELD", "RAW_FIELDS", "FIELD_CLASS_STRINGS", "OLD_MARKUP", "LOADER2", "REVERSE"].map(budget),
  `${unchanged.map((name) => `\`${name}\` ${sum(rows(fmgNow, name))}`).join(", ").replace(/, (?=[^,]*$)/, " and ")} do not move`,
  `\`CONSTRAINT_FLOORS\` (${rows(fmgNow, "CONSTRAINT_FLOORS").length} files) does not move`,
]
const HANDOFF = "## UI Round 4 Phase 2C Plan 3 Disposal, Audit and Maintenance Dialogs ("
const handoff = section("DEVELOPER_HANDOFF.md", HANDOFF)
const missing = [...handedOn, ...guardFragments, `plan \`${PLAN}\``].filter((fragment) => !handoff.includes(fragment))
const ENTRY = "### dialog ตัดจำหน่าย ตรวจนับ และซ่อมบำรุงที่เหลือ (UI รอบ 4 เฟส 2C plan 3)"
const entry = (() => {
  const start = text["docs/99_CHANGELOG.md"].indexOf(ENTRY)
  if (start < 0) return ""
  const end = text["docs/99_CHANGELOG.md"].indexOf("\n### ", start + ENTRY.length)
  return text["docs/99_CHANGELOG.md"].slice(start, end < 0 ? undefined : end)
})()
const entryFragments = [`\`MIGRATED_FILES\` ${migrated[0]} → ${migrated[1]}`, `\`PENDING_FOOTER_PARTS\` ${pending[0]} → ${pending[1]}`, `ช่องที่เขียนเอง (GF2) ${sum(rows(fmgBase, "RAW_FIELDS"))} → ${sum(fieldsNow)}`]
const missingEntry = entryFragments.filter((fragment) => !entry.includes(fragment))

const checks = {
  "every file is CRLF only": files.every((path) => !/(^|[^\r])\n/.test(raw[path])),
  "no <today> or findings marker is left": files.every((path) => none(path, "<today>", "<from task-10-findings.md>", "<จาก task-10-findings.md>")),
  "the plan file the docs link exists": existsSync(PLAN),
  "the guard file holds what the docs say": migrated[1] === migrated[0] + 9 && BATCH3.every((path) => listed(fmgNow, "MIGRATED_FILES").includes(path)) &&
    block(fmgBase, "CONSTRAINT_FLOORS") === block(fmgNow, "CONSTRAINT_FLOORS") && unchanged.every((name) => sum(rows(fmgBase, name)) === sum(rows(fmgNow, name))) &&
    [...rows(fmgNow, "LOCAL_FIELD"), ...rows(fmgNow, "OLD_MARKUP")].every((row) => BATCH4.includes(row.path)) &&
    lines(EXECUTION).filter((row) => row.includes("<FieldHint id={historicalHelpId} className=\"text-muted-foreground\">")).length === 2,
  "DESIGN.md: labels left in batch 4": once("DESIGN.md", "the hand-written labels left in the 2C batch 4 files move to it in plan 4.") && none("DESIGN.md", "batch 3–5 forms move to it in plans 3–5"),
  "DESIGN.md: the field counts after plan 3": once("DESIGN.md", `Phase 2C plan 2 moved the 46 fields of the 8 master-data forms (batch 2) the same way, and plan 3 the ${moved} fields of batch 3 (the audit round form, the bulk disposal, round cancel and text confirm dialogs, and the room picker). That leaves ${sum(fieldsNow)} hand-written fields in ${fieldsNow.length} files of 2C: ${sum(fieldsNow) - kept} move in plan 4, and ${kept} stay on purpose:`) &&
    none("DESIGN.md", "The 48 hand-written fields in the other 32 files of 2C move in plans 3–5"),
  "DESIGN.md: a hint on a status soft fill": once("DESIGN.md", "A hint that sits on a status soft fill (the counter under the historical exception reason of the bulk execution dialog, on `bg-warning-soft`) is a `FieldHint` with `className=\"text-muted-foreground\"`: faint ink never sits on a soft fill (§2, Neutral)."),
  "docs/14: plan 3 in the registry, and the soft-fill hint": once("docs/14_UI_UX_DESIGN_SYSTEM.md", `[\`${PLAN.slice("docs/superpowers/plans/".length)}\`](superpowers/plans/${PLAN.slice("docs/superpowers/plans/".length)}) sequences plan 3 (batch 3, the disposal, audit and maintenance dialogs, run beside plan 2B-3); plans 4–5 follow, one per batch. |`, "; a hint on a status soft fill is `FieldHint` with `className=\"text-muted-foreground\"` |") &&
    none("docs/14_UI_UX_DESIGN_SYSTEM.md", "plans 3–5 follow, one per batch."),
  "handoff: the 2C plan 3 section after 2B plan 2 and before Open Go-Live Decisions, with its bullets":
    count("DEVELOPER_HANDOFF.md", HANDOFF) === 1 &&
    before("DEVELOPER_HANDOFF.md", "## UI Round 4 Phase 2B Plan 2 Disposal, Audit, Maintenance, Data-Quality and Integration Lists (", HANDOFF) &&
    before("DEVELOPER_HANDOFF.md", HANDOFF, "## Open Go-Live Decisions") &&
    ["- **2C plan 4 may start once 2B plan 3 also merges**", "- **Deploy:**", "- **What changed in each file**", "- **The three files shared with 2B:**", "- **Guards**", "- **Tests:**", "- **Accepted:**", "- **Handed on to 2C plan 4:**", "- **Handed on to 2C plan 5:**", "- **Handed on to 2D and the V track:**", "- Dev-app check (Task 10):", "- Before/after screenshots:", "- Still open, for a person before the one phase-2 deploy:", "- Next:"].every((literal) => handoff.split(`\n${literal}`).length === 2),
  "handoff: the guard numbers and line numbers are the live ones": missing.length === 0,
  "changelog: the 2C plan 3 entry first under the newest date, above the 2B plan 2 entry":
    once("docs/99_CHANGELOG.md", ENTRY) && entry.split("\n- **ตรวจบนแอป (Task 10):**").length === 2 && missingEntry.length === 0 &&
    new RegExp(`^# [^\\n]*\\n[\\s\\S]*?\\n---\\n\\n## \\d{4}-\\d{2}-\\d{2}\\n\\n${ENTRY.replace(/[()]/g, "\\$&")}\\n`).test(text["docs/99_CHANGELOG.md"]) &&
    before("docs/99_CHANGELOG.md", ENTRY, "### หน้ารายการตัดจำหน่าย ตรวจนับ และซ่อมบำรุง (UI รอบ 4 เฟส 2B plan 2)"),
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

Run: `node <temp>/check-docs-2c3.mjs`
Expected: exit 1. `ok` on the first four lines ("every file is CRLF only", "no <today> or findings marker is left", "the plan file the docs link exists", "the guard file holds what the docs say") and `FAIL` on the other seven, then the fragments Steps 6 and 7 write:
```
the handoff section lacks these live fragments:
`disposal/disposal-bulk-approval.tsx:327` and `disposal/disposal-bulk-execution.tsx:494`
the zero-eligible box `disposal/disposal-bulk-approval.tsx:564`
the historical warning box `disposal/disposal-bulk-execution.tsx:863`
the no-rollback warning `audit/audit-round-cancel-button.tsx:98`
the end date `audit/audit-round-form.tsx:152`
`audit/audit-scan-room-picker.tsx:124`
`MIGRATED_FILES` 34 → 43
`PENDING_FOOTER_PARTS` 10 → 5
`LOCAL_FIELD` 3 in 3 files → 2 in 2
`RAW_FIELDS` 48 in 19 files → 33 in 14
`FIELD_CLASS_STRINGS` 44 in 17 files → 30 in 12
`OLD_MARKUP` 38 in 13 files → 26 in 9
`LOADER2` 33 in 20 files → 21 in 15
`REVERSE` 3 in 3 files → 1 in 1
`OLD_HELPERS` 1, `CLOSE_LABEL_IS_CANCEL` 1 and `FIXED_BOTTOM_BARS` 3 do not move
`CONSTRAINT_FLOORS` (38 files) does not move
plan `docs/superpowers/plans/2026-10-13-ui-phase2c-plan3.md`
the changelog entry lacks these live fragments:
`MIGRATED_FILES` 34 → 43
`PENDING_FOOTER_PARTS` 10 → 5
ช่องที่เขียนเอง (GF2) 48 → 33
```
If "the guard file holds what the docs say" fails, or a fragment differs (a Task 10 fix moved a line or a row), stop and report it before editing: Steps 4, 6 and 7 then use the printed numbers in place of the ones below.

- [ ] **Step 4: `DESIGN.md` (3 replacements)**

(1) §3 Typography, Hierarchy, **Label**. Replace:

```
the hand-written labels of the 2C batch 3–5 forms move to it in plans 3–5.
```

with:

```
the hand-written labels left in the 2C batch 4 files move to it in plan 4.
```

(After batch 3, `LOCAL_FIELD` and `OLD_MARKUP` hold only batch-4 files, and the 5 batch-5 files have no `<label>`.)

(2) §5 Inputs / Fields, the end of the **`Field`** bullet. Replace:

```
Errors under fields stay only where they existed before phase 2C (the supplier form, the duplicate asset tag and serial); the rest come with the V track.
```

with:

```
Errors under fields stay only where they existed before phase 2C (the supplier form, the duplicate asset tag and serial); the rest come with the V track. A hint that sits on a status soft fill (the counter under the historical exception reason of the bulk execution dialog, on `bg-warning-soft`) is a `FieldHint` with `className="text-muted-foreground"`: faint ink never sits on a soft fill (§2, Neutral).
```

(3) §5 Inputs / Fields, **Migration**. Replace:

```
Phase 2C plan 2 moved the 46 fields of the 8 master-data forms (batch 2) the same way. The 48 hand-written fields in the other 32 files of 2C move in plans 3–5, and 3 stay on purpose:
```

with:

```
Phase 2C plan 2 moved the 46 fields of the 8 master-data forms (batch 2) the same way, and plan 3 the 15 fields of batch 3 (the audit round form, the bulk disposal, round cancel and text confirm dialogs, and the room picker). That leaves 33 hand-written fields in 14 files of 2C: 30 move in plan 4, and 3 stay on purpose:
```

The sentence goes on unchanged ("the 2 boxed fields of the label-print toolbar and the room search of the audit room picker. List-page filters belong to 2B: …"). The numbers are guard GF2 (`RAW_FIELDS`): 16 fields of batch 3 at `886a290`, 1 left (the room search, O20); 33 left in 14 files, of which the label-print toolbar keeps 2 and the room picker 1.

- [ ] **Step 5: `docs/14_UI_UX_DESIGN_SYSTEM.md` (2 replacements)**

(1) Shared Components, the `Field` row ("A label with hint and error"). Replace:

```
never around `SearchableSelect`, never inside a `<label>` |
```

with:

```
never around `SearchableSelect`, never inside a `<label>`; a hint on a status soft fill is `FieldHint` with `className="text-muted-foreground"` |
```

(2) Current-Surface Registry, the "Forms and dialogs" row. Replace:

```
[`2026-10-12-ui-phase2c-plan2.md`](superpowers/plans/2026-10-12-ui-phase2c-plan2.md) sequences plan 2 (batch 2, the master-data forms); plans 3–5 follow, one per batch. |
```

with:

```
[`2026-10-12-ui-phase2c-plan2.md`](superpowers/plans/2026-10-12-ui-phase2c-plan2.md) sequences plan 2 (batch 2, the master-data forms); [`2026-10-13-ui-phase2c-plan3.md`](superpowers/plans/2026-10-13-ui-phase2c-plan3.md) sequences plan 3 (batch 3, the disposal, audit and maintenance dialogs, run beside plan 2B-3); plans 4–5 follow, one per batch. |
```

- [ ] **Step 6: `DEVELOPER_HANDOFF.md` (1 replacement)**

The new section. Replace the line `## Open Go-Live Decisions` (the only one) with the block below, which ends with that same line. Replace `<today>` with the date of Step 1. Write the two `<from task-10-findings.md>` markers from `task-10-findings.md` as the rulings say. If Step 3 printed other numbers, use its fragments in the "Guards" bullet and the three "Handed on" bullets.

```
## UI Round 4 Phase 2C Plan 3 Disposal, Audit and Maintenance Dialogs (<today>)

- Branch `feat/ui-phase2c-plan3` (from `master` `886a290`: 2A, 2C plans 1–2 and 2B plans 1–2 merged, not deployed), built in the git worktree `.worktrees/ui-phase2c-plan3` while plan 2B-3 ran in the main checkout. Spec `docs/superpowers/specs/2026-10-11-ui-phase2c-design.md` §8.9 batch 3 (its §10 rulings I1–I36 override the section files) · plan `docs/superpowers/plans/2026-10-13-ui-phase2c-plan3.md` · canonical values in `DESIGN.md`.
  - Batch 3 is 9 files in `src/components/`: `ui/confirm-text-dialog.tsx`; the dialog sides of `disposal/disposal-bulk-approval.tsx`, `disposal/disposal-bulk-execution.tsx` and `audit/audit-findings-batch-actions.tsx`; `audit/audit-round-form.tsx`; `audit/audit-round-cancel-button.tsx`; the sheets of `audit/audit-scan-room-picker.tsx` and `audit/audit-scan-check-panel.tsx`; `maintenance/maintenance-plan-state-actions.tsx`. One commit per file (Tasks 1–9).
  - No new primitive, message key, workflow, page, schema, RBAC, migration, dependency or token. No server change. Validation is unchanged (K4): every `required`, `maxLength`, `minLength`, toast and `disabled` gate stays.
- **2C plan 4 may start once 2B plan 3 also merges** (2B spec B7, §8.1): plan 4 shares `assets/asset-register-table.tsx` and the two asset pages with plan 2B-3. Plans 2C-3 and 2B-3 share no code file; the one that merged second rebased onto `master` in its last task.
- **Deploy:** none: one deploy after all of phase 2 and the user's checks on real devices; `ab1b873` stays the rollback point (no schema change).
- **What changed in each file** (`src/components/`):
  - Every dialog of the batch has the footer part: `AccessibleDialogCancel` first and the primary action last; on phones Cancel sits on top, from `sm` the buttons form a right-aligned row. Where the dialog has a form, `<form className={accessibleDialogFormClasses}>` wraps the body and the footer. The button that starts the work stays in place with `busy` and its label, so focus does not drop.
  - `ui/confirm-text-dialog.tsx` (the "อนุมัติที่เลือก" / "ปฏิเสธที่เลือก" dialog of `/audit/findings`): the remark is `Field` + `Textarea`; the confirm has `busy={busy}` instead of `disabled={busy}`. `ConfirmTextForm` lost its unused `onClose`; the props of `ConfirmTextDialog` did not change (`closeLabel?` stays optional).
  - `audit/audit-findings-batch-actions.tsx`: no `closeLabel={tCommon("close")}` (the X reads "ปิด" from the dialog). Nothing else changed.
  - `disposal/disposal-bulk-approval.tsx`: the approve button stays on screen with `busy` while the approval commits (it used to vanish); retry is an `outline` button; the shared remark is `Field` + `Textarea` with both help lines in `hint`; no `closeLabel`; the two status-line spinners stop under reduced motion.
  - `disposal/disposal-bulk-execution.tsx`: the hand-made `sticky bottom-0` footer is the footer part. The submit button keeps `busy` through the preview and through the commit, and the footer's "กำลังบันทึก" line went (the body's `aria-live` line still says it). Cancel cancels a running preview and is grey during the commit. With no eligible request, the sentence moved from the button to `<Notice tone="warning" role="alert">` in the body, and the button reads "ยืนยันดำเนินการ 0 รายการ" and cannot be pressed (spec §5.7). `closeLabel` stays: while the preview runs, the X reads "ยกเลิกการตรวจสอบ". The 4 shared values are `Field` inside the existing `<fieldset disabled>`; the date, the executor and the final status show the star. The historical reason is `Field required` + `Textarea`; its counter line is `FieldHint` with `text-muted-foreground` on the warning fill. The three 20px checkboxes use `checkboxVariants({ size: "lg" })`.
  - `audit/audit-round-form.tsx`: the 6 fields and the 10 scope selects (through the local `Select` wrapper, whose calls did not change) are `Field` with `Input` or `NativeSelect`; the local `Field` helper is gone. The sample-rate help is the field's `hint`. Preview and save are `Button` with `busy`; save stays disabled while a preview runs. The include-closed checkbox uses `checkboxVariants()`.
  - `audit/audit-round-cancel-button.tsx`: the trigger is `danger` with `busy`; the body part replaced the guessed `max-h-[calc(92dvh-10rem)]` scroll box; the reason is `Field required` (it gained the star) + `Textarea`; the confirm is `destructive` with `busy`.
  - `audit/audit-scan-room-picker.tsx`: no `closeLabel` and the default `SheetHeader`; the department is `Field` + `NativeSelect`; "ไม่เลือกห้อง" is a full-width `outline` `Button` in a `SheetFooter` with the dialog footer look. The room search (O20), the trigger and the 44px room rows did not change.
  - `audit/audit-scan-check-panel.tsx`: no `closeLabel` and the default `SheetHeader`. The wide `<aside>` panel, `onCloseAutoFocus` and the heading focus did not change.
  - `maintenance/maintenance-plan-state-actions.tsx`: still a dialog (K12), with the footer part only. The confirm names its action ("พักแผน", "เปิดใช้งานต่อ", or a `destructive` "จบแผน") instead of "ยืนยัน", with `busy`. The row buttons are `Button size="sm"`: `outline`, and `danger` for "จบแผน".
- **The three files shared with 2B:** only their dialog sides changed. The list parts plan 2B-2 moved are as 2B-2 left them, and the "Handed on to 2C plan 3" list of the 2B plan 2 section is done.
- **Guards** (`tests/form-migration-guards.test.ts`; total and files per budget, `886a290` → after this plan):
  - `MIGRATED_FILES` 34 → 43 (the 9 files in task order) · `PENDING_FOOTER_PARTS` 10 → 5 (`maintenance/maintenance-attachments.tsx` for batch 5 and the 4 batch-4 dialogs) · `CONSTRAINT_FLOORS` (38 files) does not move.
  - `LOCAL_FIELD` 3 in 3 files → 2 in 2 · `RAW_FIELDS` 48 in 19 files → 33 in 14 · `FIELD_CLASS_STRINGS` 44 in 17 files → 30 in 12 · `OLD_MARKUP` 38 in 13 files → 26 in 9 · `LOADER2` 33 in 20 files → 21 in 15 · `REVERSE` 3 in 3 files → 1 in 1 · `OLD_HELPERS` 1, `CLOSE_LABEL_IS_CANCEL` 1 and `FIXED_BOTTOM_BARS` 3 do not move.
  - Kept on purpose: the room search (`RAW_FIELDS` 1, O20) and three spinners outside buttons (I27): the two status lines of the bulk approval dialog (`LOADER2` 2) and `BusyLabel` of the bulk execution dialog (`LOADER2` 1).
  - The rows plan 2B-2 left above their live counts went straight to their final values: bulk approval `OLD_MARKUP` 3 → none and `LOADER2` 4 → 2; bulk execution `OLD_MARKUP` 5 → none; the findings batch actions `OLD_MARKUP` 1 and `LOADER2` 2 → none; `LOADER2` 2 of `audit/audit-finding-review-actions.tsx` (batch 1d) → none.
  - `tests/list-frame-guards.test.ts` and `tests/visual-foundation-guards.test.ts` are not edited.
- **Tests:** new `tests/audit-round-form-ui.test.ts`; one test appended to `disposal-bulk-approval`, `disposal-bulk-execution-ui`, `audit-round-cancellation`, `audit-scan-room-ui`, `audit-scan-check-ui` and `pm-plans-ui`, and two to `confirm-text-dialog-ui` (Tasks 1 and 6). Edited pins: `disposal-bulk-execution-ui:31` (the footer part, spec §10.4 table A), and the dialog pins plan 2B-2 wrote "for 2C plan 3" in `disposal-bulk-approval` (`:159-160`, `:176-179`) and `disposal-bulk-execution-ui` (`:181-182`, `:195-198`).
- **Accepted:**
  - Two state changes remove the button that has focus, so Radix moves focus to the dialog box, as before this plan: the bulk approval retry, and review → preview in the bulk execution dialog (the review button gives way to the commit button).
  - While the PM plan dialog closes (about 200ms), its confirm label empties and its color goes back to `default`, as its title already did.
- **Handed on to 2C plan 4:** batch 4's rows are as `886a290` left them. `PENDING_FOOTER_PARTS` lists its 4 dialogs (`admin/IntegrationClientManager.tsx`, `admin/asset-state-review-dialog.tsx`, `assets/asset-register-table.tsx`, `asset-operations/transaction-cancel-dialog.tsx`), and `REVERSE` and `CLOSE_LABEL_IS_CANCEL` hold only `IntegrationClientManager.tsx`. In `assets/asset-register-table.tsx` the dialog is plan 4's and the list part plan 2B-3's.
- **Handed on to 2C plan 5:** `maintenance/maintenance-attachments.tsx` is the last `PENDING_FOOTER_PARTS` entry outside batch 4 (its delete dialog becomes `useConfirm`, K12). The discard-selection confirms `disposal/disposal-bulk-approval.tsx:327` and `disposal/disposal-bulk-execution.tsx:494` (`confirm({ title: copy.discardSelection, tone: "destructive" })`) still have no `confirmLabel`: plan 5 adds `copy.discardSelectionAction` (`disposalPage.bulkDiscardSelectionAction`, spec §5.9–5.10) through `bulkApprovalCopy` and `bulkExecutionCopy` of `src/app/[locale]/(dashboard)/disposal/page.tsx` (see 2B plan 2), keeping `title` as the first property.
- **Handed on to 2D and the V track:** the boxes and panels batch 3 kept (I35, K28): in the bulk approval dialog the zero-eligible box `disposal/disposal-bulk-approval.tsx:564` and `BulkSummary`, `Metric` and `ResultDetails`; in the bulk execution dialog the historical warning box `disposal/disposal-bulk-execution.tsx:863`, `ReviewedSharedValues`, `AuthoritativeItems` and `ResponseSummary`; in the round cancel dialog the no-rollback warning `audit/audit-round-cancel-button.tsx:98` and `ImpactItem`; the round form's panels, its preview box and `PreviewMetric`. Two sheet footers now differ: the room picker's `audit/audit-scan-room-picker.tsx:124` has the dialog footer look (`border-t border-border-soft bg-background px-4 py-3`), the register filter sheet's (2B) is `grid grid-cols-2 gap-2 border-t border-border`; 2D picks one. The V track adds `min={values.startDate}` to the end date `audit/audit-round-form.tsx:152`.
- Dev-app check (Task 10): <from task-10-findings.md>
- Before/after screenshots: `.superpowers/sdd/screenshots/ui-phase2c-plan3/before/` and `after/` in the main checkout (git-ignored, on the development machine only).
- Still open, for a person before the one phase-2 deploy: <from task-10-findings.md>, together with the open checks of phase 1, 2A, 2C plans 1–2 and 2B plans 1–2 above.
- Next: merge this branch (rebase it first if 2B plan 3 merged before it); 2C plan 4 once 2B plan 3 has merged too; then the pipeline of the 2B plan 1 section.

## Open Go-Live Decisions
```

Replace both `<from task-10-findings.md>` markers with the text from the findings; no marker may stay.

- [ ] **Step 7: `docs/99_CHANGELOG.md` (1 or 2 replacements)**

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

with the block below. Write the "ตรวจบนแอป (Task 10)" bullet from `task-10-findings.md`, in Thai, in the shape of the plan 2 entry's bullet (what was checked and where, the results, fixes or "แก้เพิ่ม: ไม่มี", what was accepted, issues not caused by plan 3, and "ยังต้องให้คนตรวจ: …" ending with "รวมกับรายการเปิดของเฟส 1, 2A, 2C plan 1–2 และ 2B plan 1–2 ก่อน deploy ครั้งเดียวตอนจบเฟส 2").

```
## <today>

### dialog ตัดจำหน่าย ตรวจนับ และซ่อมบำรุงที่เหลือ (UI รอบ 4 เฟส 2C plan 3)

Branch `feat/ui-phase2c-plan3` ใน worktree `.worktrees/ui-phase2c-plan3` (จาก `master` `886a290` ทำคู่กับ 2B-3) · design `docs/superpowers/specs/2026-10-11-ui-phase2c-design.md` ข้อ 8.9 ชุด 3 (ข้อ 10 ใช้แทนไฟล์ส่วน) · plan `docs/superpowers/plans/2026-10-13-ui-phase2c-plan3.md` · ค่าทั้งหมดอยู่ใน `DESIGN.md`

- **ขอบเขต:** ชุด 3 จำนวน 9 ไฟล์ ไฟล์ละ 1 commit: dialog อนุมัติและดำเนินการตัดจำหน่ายหลายรายการ · ฟอร์มรอบตรวจนับ · dialog ยกเลิกรอบตรวจ · dialog อนุมัติ/ปฏิเสธรายการไม่ตรงที่เลือก (`ConfirmTextDialog`) · sheet เลือกห้องและแผ่นตรวจตอนสแกน · ปุ่มพักแผน เปิดใช้งานต่อ และจบแผน PM · ไฟล์ที่ใช้ร่วมกับ 2B แก้เฉพาะฝั่ง dialog · ไม่มีของกลางใหม่ ไม่เปลี่ยนขั้นตอนงาน ไม่แตะฐานข้อมูล ไม่แก้ server ไม่เพิ่ม key ข้อความ ไม่เพิ่ม token · การตรวจกรอกไม่เปลี่ยน (คง `required` / `maxLength` / `minLength` toast และเงื่อนไขที่ปิดปุ่มทุกจุด)
- **dialog:** ส่วนท้ายแบบกลางทุกตัว เห็นตลอดแม้เนื้อเลื่อน มือถือปุ่มยกเลิกอยู่บน ปุ่มหลักอยู่ล่าง ตั้งแต่ `sm` เรียงแถวชิดขวา · ปุ่มที่เริ่มงานอยู่ที่เดิมพร้อมไอคอนหมุน ป้ายไม่เปลี่ยน โฟกัสไม่หลุด (ปุ่มอนุมัติหลายรายการเคยหายระหว่างบันทึก) · ดำเนินการหลายรายการ: เลิกใช้ส่วนท้าย `sticky` ที่ทำเอง · เมื่อไม่มีคำขอที่ดำเนินการได้ ข้อความย้ายจากป้ายปุ่มไปเป็นกล่องเตือนในเนื้อ ปุ่มเป็น "ยืนยันดำเนินการ 0 รายการ" และกดไม่ได้ · X อ่าน "ปิด" จากของกลาง (ดำเนินการหลายรายการยังอ่าน "ยกเลิกการตรวจสอบ" ระหว่างตรวจสอบ) · ยกเลิกรอบตรวจ: ปุ่มเปิดเป็นปุ่มขอบแดง ปุ่มยืนยันสีแดงทึบ · แผน PM: ยังเป็น dialog ปุ่มยืนยันบอกสิ่งที่ทำ ("พักแผน" "เปิดใช้งานต่อ" หรือ "จบแผน" สีแดง) แทน "ยืนยัน" · ปุ่มในแถวแผน PM เป็นปุ่มเล็กแบบกลาง ("จบแผน" ขอบแดง)
- **ช่องกรอก:** ฟอร์มรอบตรวจนับ 6 ช่องและตัวเลือกขอบเขต 10 ตัว · ข้อมูลร่วม 4 ช่องและเหตุผลข้อยกเว้นของดำเนินการหลายรายการ · หมายเหตุของอนุมัติหลายรายการและของ `ConfirmTextDialog` · เหตุผลยกเลิกรอบตรวจ · แผนกในตัวเลือกห้อง เป็น `Field` กับ `Input` / `NativeSelect` / `Textarea` · ช่องที่บังคับกรอกมีดอกจัน (วันที่ดำเนินการ ผู้ดำเนินการ สถานะหลังตัดจำหน่าย เหตุผลข้อยกเว้น เหตุผลยกเลิกรอบตรวจ) · จอใหญ่สูง 40 มือถือสูงอย่างน้อย 44 ตัวอักษร 16px · คำอธิบายอัตราสุ่มเป็น hint ของช่อง · บรรทัดนับตัวอักษรบนพื้นสีเตือนใช้สีรอง ไม่ใช้สีจาง · checkbox ใช้ `checkboxVariants`
- **sheet:** ตัวเลือกห้องและแผ่นตรวจตอนสแกนใช้หัวแบบกลาง (ชื่อไม่ชิด X) · "ไม่เลือกห้อง" อยู่บนแถบท้ายพื้นอ่อน เต็มความกว้าง · ช่องค้นหาห้องและแถวห้อง 44px คงเดิม
- **guard:** `form-migration-guards`: `MIGRATED_FILES` 34 → 43 · `PENDING_FOOTER_PARTS` 10 → 5 · ช่องที่เขียนเอง (GF2) 48 → 33 · คงไว้ตั้งใจ: ช่องค้นหาห้อง และไอคอนหมุนในบรรทัดสถานะของ dialog ตัดจำหน่ายหลายรายการทั้งสอง · แถวที่ 2B-2 ลดของจริงไปก่อนแล้วลดถึงค่าสุดท้ายทันที · `CONSTRAINT_FLOORS` ไม่ลด · ไม่แก้ `list-frame-guards` และ `visual-foundation-guards`
- **test:** ใหม่ `audit-round-form-ui` · เพิ่มใน `confirm-text-dialog-ui` (2 test) `disposal-bulk-approval` `disposal-bulk-execution-ui` `audit-round-cancellation` `audit-scan-room-ui` `audit-scan-check-ui` `pm-plans-ui` · แก้ pin `disposal-bulk-execution-ui:31` ตามสเปกข้อ 10.4 ตาราง A และ pin ของ dialog ที่ 2B-2 เขียนไว้ให้ plan 3
- **deploy:** ไม่ deploy · deploy ครั้งเดียวหลังเฟส 2 ทั้งหมดและผู้ใช้ตรวจเครื่องจริง · ถอยกลับไป `ab1b873` ได้เพราะไม่มี schema เปลี่ยน
- **ตรวจบนแอป (Task 10):** <จาก task-10-findings.md>
- ภาพก่อน/หลัง: `.superpowers/sdd/screenshots/ui-phase2c-plan3/before/` และ `after/` ใน checkout หลัก (git ignore อยู่บนเครื่องพัฒนา)
- ต่อไป: merge (ถ้า 2B-3 merge ก่อนให้ rebase ก่อน) · 2C plan 4 เริ่มได้เมื่อ 2B-3 merge แล้วด้วย · ตามด้วยสายท่อตามสเปก 2B ข้อ 8.1 · 2D · งาน V

```

Replace the `<จาก task-10-findings.md>` marker with the text from the findings, and every `<today>` with the date; no marker may stay.

- [ ] **Step 8: `.impeccable/design.json`: no change**

No component entry changes in batch 3 (see the rulings): leave the file and its `generatedAt` as they are.

Run: `git diff --quiet 886a290 -- .impeccable/design.json && echo DESIGN-JSON-UNCHANGED`
Expected: `DESIGN-JSON-UNCHANGED`.

- [ ] **Step 9: Check**

Run: `node <temp>/check-docs-2c3.mjs`
Expected: 11 `ok` lines, exit 0, and no "lacks these live fragments" list.

Run: `grep -n "<from task-10\|<จาก task-10\|<today>" DESIGN.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md docs/14_UI_UX_DESIGN_SYSTEM.md`
Expected: nothing.

Run: `git diff --numstat`
Expected: exactly the four files: `DESIGN.md` `3 3`, `docs/14_UI_UX_DESIGN_SYSTEM.md` `2 2`, `DEVELOPER_HANDOFF.md` about `37 0` (the findings change the count), `docs/99_CHANGELOG.md` about `15 0` (`19 0` with a new date block). A file that shows every line changed was normalized: restore its line endings.

Run: `node -e "for (const f of process.argv.slice(1)) { const s = require('fs').readFileSync(f, 'utf8'); console.log(f, (s.match(/\r\n/g) || []).length, (s.match(/\n/g) || []).length) }" DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md`
Expected: the two numbers equal on every line (CRLF throughout).

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: all green, with the test count after Task 10 (1936 tests, 1935 pass, 1 skipped, if Task 10 added no test). `tests/audit-round-cancellation.test.ts` reads the handoff and the changelog (both must still mention the round cancellation and that earlier audit work is preserved; the older sections still do); no other test reads these four files.

- [ ] **Step 10: Commit**

```bash
git add DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md
git commit -m "docs(ui): phase 2C plan 3 dialogs, field counts and hand-off in DESIGN.md, handoff and changelog

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit (`git show --stat HEAD`). `git status --short` prints nothing (the worktree has no untracked files; `node_modules/`, `src/generated/` and `.env` are ignored).

---

### Task 12: Final verification, rebase if needed, wiki and memory (controller runs this task)

**Files:**
- Modify: `docs/99_CHANGELOG.md`, `DEVELOPER_HANDOFF.md` (verify numbers)
- Modify (vault `D:\Obsidian\Eltross`): `AssetSystem/ams-status.md`, `AssetSystem/ams-log.md`, `AssetSystem/ams-open-questions.md`
- Modify (auto-memory): `review-2026-10-priorities.md`

**Interfaces:**
- Consumes: Tasks 1–11 committed in the worktree.
- Produces: the branch ready for superpowers:finishing-a-development-branch, and the worktree removed after the merge.

- [ ] **Step 1: Verify.** From the worktree:
  - Run `npm run verify` and record the test count and the build page count.
  - If it passed, add one bullet to the 2C plan 3 entry in `docs/99_CHANGELOG.md`, directly above its "ตรวจบนแอป (Task 10)" bullet: `` `npm run verify` ผ่าน (test N · ผ่าน N · ข้าม 1 · build X/X หน้า) ``.
  - Add the same numbers to the 2C plan 3 section of `DEVELOPER_HANDOFF.md`, directly above its "Dev-app check (Task 10)" bullet: ``- Verification: `npm run verify` passes (tests N · pass N · skipped 1 · build X/X pages).``
  - Both files are CRLF: insert with an exact-string edit that writes `\r\n`.
  - Run `npm test` again (`tests/audit-round-cancellation.test.ts` reads both files).
  - Commit both files with `docs(ui): record phase 2C plan 3 verify results` and the Co-Authored-By line.

- [ ] **Step 2: Rebase if plan 2B-3 merged first (2B spec §8.2).** From the worktree run `git merge-base --is-ancestor master HEAD && echo UP-TO-DATE`.
  - If it prints `UP-TO-DATE`, skip to Step 3.
  - Otherwise `master` moved (plan 2B-3 merged). Run `git rebase master` in the worktree and resolve conflicts by 2B spec §8.2:
    - `DESIGN.md`: keep both sides; where both touched the same line, write it so it matches the code after both merges.
    - `tests/visual-foundation-guards.test.ts`: keep both sides; a budget row both lowered takes the lower number; never raise.
    - `messages/th.json`, `messages/en.json`: take `master`'s version (batch 3 adds no key, so nothing to re-run).
    - `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md`, `docs/11_FEATURE_LIST.md`: keep both sections, in merge order (plan 2B-3's first). `DESIGN.md:462` (2C field counts and 2B's list-filter clause on one line) is a certain conflict: keep this plan's 2C sentences and 2B-3's clause.
    - A conflict in any other file means a fence leaked: abort the rebase (`git rebase --abort`), find the commit that touched the other plan's file, and stop to report.
  - After the rebase: run `node <temp>/check-docs-2c3.mjs` (Task 11) and, if it prints other line fragments, update the handoff text it names (new commit); then `npm run verify`, the production build from the worktree, and the dialogs of Task 10 Step 4 once more at 1440 and 375 (cancel only). Update the verify numbers of Step 1 if they changed (new commit).

- [ ] **Step 3: Wiki.** Read `AssetSystem/_schema/ams-wiki-schema.md` first, then:
  - `ams-status.md`: the 2C row says plan 3 is built on `feat/ui-phase2c-plan3` (worktree) with the verify numbers, not merged, not deployed, and that 2C plan 4 may start once both plan 3 and 2B-3 have merged. Fix any sentence the row now contradicts (rule 8).
  - `ams-log.md`: an entry at the top of `## <today>`.
  - `ams-open-questions.md`: the plan-3 checks for a person from Task 10 Step 8 (one new numbered item) · anything Task 10 recorded as found but not caused by plan 3.
  - Run `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` from `D:\Obsidian\Eltross`.
  - Commit only those three files with an `ingest:` message. Other sessions have uncommitted changes in the vault; never stage them.

- [ ] **Step 4: Memory.** Update `review-2026-10-priorities.md`: 2C plan 3 built on `feat/ui-phase2c-plan3` in the worktree, not merged, not deployed; the state of 2B-3; next: the merge choice, then 2C plan 4 once both have merged.

- [ ] **Step 5:** Use superpowers:finishing-a-development-branch. After a merge, remove the worktree from the main checkout with `git worktree remove .worktrees/ui-phase2c-plan3` (its `.env` copy goes with it, I30) and `git worktree prune`.

