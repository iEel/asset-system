# UI Round 4 · Phase 2C Forms and Dialogs · Plan 4 (batch 4: admin, assets and the rest) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the 18 files of 2C batch 4 (the admin user, role and data-quality rule forms, the integration client manager and the asset state review dialog, the notification and report preset controls, the login form, the label batch tool, label print and scan search tool, the asset status correction, the evidence and activity drawers, the transaction cancel dialog, the create workspace, the register's bulk update dialog and the import preview panel) onto the 2A and 2C primitives. Workflows, pages, data and validation behavior stay the same.

**Architecture:**
- **No new primitives.** Plans 1–3 merged everything batch 4 needs: `AccessibleDialog` parts, `Field`, `FieldLabel`, `FieldHint`, `Input`, `NativeSelect`, `Textarea`, `checkboxVariants`, `Button` with `busy`, `Notice`, `Steps`, `Segmented`, the sheet parts, `PageHeader`.
- **One file is one commit (I30).** Each of Tasks 1–18 migrates one file. In the same commit it lowers that file's budgets in `tests/form-migration-guards.test.ts` (FMG) and adds it to `MIGRATED_FILES`, so the old patterns cannot come back. A page line that only follows a component's own change (the data-quality `severity` label in Task 5, the two `currentStep` lines in Task 18) and the message changes of a task go in that task's commit.
- **Files shared with 2B are done on 2B's side.** Plan 2B-3 left the register table's bulk update dialog and the two `currentStep` lines for this plan; plan 2B-1 left the headers of the label batch tool and the scan tool (I13); plan 2B-2 left the data-quality page's `labels` (DH "Handed on to 2C plan 4").
- **Pipeline (2B spec B7, §8.1–8.2):** this plan runs in the git worktree `.worktrees/ui-phase2c-plan4` while plan 2B-4 (detail pages and skeletons) runs in the main checkout. They share no code file. Whichever finishes second rebases onto `master` in its last task.
- **Controller tasks:** Task 0 (worktree setup, base check, before screenshots), Task 19 (verify, production build, dev-app check) and Task 21 (verify numbers, rebase if needed, wiki, memory). Task 20 writes the repo docs.

**Tech Stack:** Next.js 16.4 App Router · Tailwind CSS 4.2.4 · class-variance-authority 0.7.1 · tailwind-merge 3.5 (through `cn()`) · radix-ui · next-intl 4 · `node --test` with Node 24 type stripping.

**Spec:** `docs/superpowers/specs/2026-10-11-ui-phase2c-design.md`, with section details in `docs/superpowers/specs/2026-10-11-ui-phase2c/03-primitives.md` … `09-guards-tests.md`.
- **Spec §10 (rulings I1–I36) overrides the section files wherever they conflict.** This plan already applies them; when a task and a section file disagree, the task wins.
- Batch 4 is spec §8.9 "ชุด 4" and §10.3 "plan 4". Its line numbers are from `5ffee76`; this plan recounted them at `c2bfbe2`.
- The 2B spec (`docs/superpowers/specs/2026-10-12-ui-phase2b-design.md` §8.1–8.3, B7, I29, I30) sets when this plan may start (after 2B-3 and 2C-3 merged) and the rules for running beside 2B-4.

## Global Constraints

- **Git:**
  - Work in the worktree `D:/Antigravity/asset-system/.worktrees/ui-phase2c-plan4` on branch `feat/ui-phase2c-plan4` (from `master` `c2bfbe2`). Run every command from the worktree's root.
  - Never run `git checkout`, `git switch`, `git reset`, `git stash`, `git rebase` or `git clean`, never touch `master`, and never touch the main checkout `D:/Antigravity/asset-system` (plan 2B-4 runs there at the same time).
  - Commit only the files your task names. One migrated file is one commit (I30).
  - End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Next.js 16.4** is not the Next.js in your training data. Read `node_modules/next/dist/docs/` before using an API you have not seen in this repo.
- **Line endings:**
  - `git config core.autocrlf` is `true`, and a fresh worktree checks every text file out as CRLF: the 18 batch-4 files, `tests/form-migration-guards.test.ts` (`i/lf w/crlf`) and most `tests/` files (a file that is LF in the main checkout, such as `asset-state-review-dialog.tsx`, is CRLF here). The budget scripts keep the endings they read.
  - Before you edit a file, run `git ls-files --eol <file>` and keep what it uses. Edit with exact-string replacement; never normalize a file. New files are LF.
  - Tests that read source files strip `\r` (`.replace(/\r\n/g, "\n")`) before multi-line regexes. A test that reads a CRLF file without stripping must not get a new regex with `\n`.
- **Tests:**
  - `npm test` runs `node scripts/run-tests.mjs` over `tests/**/*.test.{ts,mjs,js}` with Node 24 type stripping. Run one file with `node --test tests/<file>.test.ts`.
  - Modules that tests import use relative `.ts` imports (no `@/`) and erasable TypeScript only. Tests cannot import `.tsx`; they check `.tsx` by reading the source text.
  - Use the shared helpers in `tests/helpers/source-files.ts`.
- **Baseline before Task 1** (HEAD `c2bfbe2`, or this plan's commit on top of it, which changes only `docs/`):
  - `npm test`: 1951 tests, 1950 pass, 0 fail, 1 skipped.
  - `npx tsc --noEmit`: clean.
  - `npm run lint`: 0 errors and 146 warnings, all under `.agents/`.
  - Task 0 re-checks these numbers in the worktree.
- **Every task ends with all of these green:** `npm test` (0 fail) · `npx tsc --noEmit` · `npm run lint` (0 errors, no new warnings in `src/` or `tests/`). Report any failure by name.
- **Off limits:**
  - Do not run `npm ci`, `npm install`, `npm run build`, the dev server, `npx shadcn …`, or anything against a database (the controller set up the worktree in Task 0).
  - Do not read or print `.env` or `.env.prod-admin`.
  - Do not run skill helper scripts (for example the impeccable launcher); they make network calls.
  - Your temp folder is outside both trees; keep every helper and fragment there. Shell heredocs and `node -e` drop backslashes: write regex-bearing text with a file-writing tool or a script file. When you copy a block from a task, copy only the lines between its fences.
- **No new tokens (I21).** No task adds a custom property to `:root`, `@theme inline` or `@theme`, and no task edits `tests/design-tokens-contrast.test.ts`. Never write `rounded-[…]`.
- **2B fences (2B spec §8.3, §8.11):**
  - Never touch plan 2B-4's files: `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`, `src/components/assets/asset-detail-tabs.tsx`, `src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx`, `src/app/[locale]/(dashboard)/disposal/[id]/page.tsx`, `src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx`, `src/app/[locale]/(dashboard)/master-data/suppliers/[id]/page.tsx`, `src/components/master-data/supplier-purchase-documents.tsx`, `src/app/[locale]/(dashboard)/my-assets/[id]/page.tsx`, `src/components/ui/page-skeleton.tsx` and the five `loading.tsx` files.
  - Never edit `tests/list-frame-guards.test.ts` (LFG, 2B's guard file); keep it green.
  - In `asset-register-table.tsx`, change only the bulk update dialog (O1); its list part and the bulk-action bar stay as plan 2B-3 left them. In `D/assets/page.tsx` and `D/asset-management/import-export/page.tsx`, change only the `currentStep` line (Task 18).
  - Never touch `c/ui/mobile-action-bar.tsx`, the O11 padding lines or `c/maintenance/maintenance-attachments.tsx` (2C plan 5).
  - Keep `tests/asset-transaction-cancellation-ui.test.ts:26-42` green without edits (2B-4 keeps those lines of the asset page); this plan edits only its `:13`.
- **Dialog rules (spec §5, §10):** `AccessibleDialog` with its header, body and footer parts; the footer part instead of a hand-made footer; the confirm button `busy` while it works and never `disabled` by the same flag (GB4); a busy button keeps its label (no "กำลัง..." swaps, K13); `closeLabel` only when the X's name differs from "ปิด" (K10); `destructive` for solid confirms, `danger` for in-page destructive actions.
- **Field rules (spec §4):** `Field label=` first (the login form uses `FieldLabel` + `Input`, spec §4.18 item 10); `required`, `maxLength` and `minLength` stay on the control (K4; FMG GF5 `CONSTRAINT_FLOORS` never go down); `fieldSize` default `lg`; phones keep ≥44px with 16px text.
- **No validation behavior change.** Keep every `toast.error` guard, every `disabled` gate and every native check. Field errors and focus on the first invalid field belong to the V track.
- **Messages:** the batch-4 changes are `asset.createModeLabel` (new, Task 16) and the deletion of `asset.importWizardCurrentStep` (Task 18), through `node scripts/messages-edit.mjs <changes.json>` run from the worktree root with the JSON in your temp folder; Thai follows `docs/19_THAI_GLOSSARY.md`. If a task finds another string it must add, stop and ask the controller.
- **Deploy:** no task deploys. The user decided on 2026-10-12 to deploy once after all of phase 2.

## Rulings of this plan

- **FMG after batch 4** (Task 18 prints it with `p2c4-guard-state.mjs`): `RAW_FIELDS` 2 entries (3 fields that stay on purpose, among them the label print toolbar's boxed fields, K21), `LOADER2` 10 entries (13), `LOCAL_FIELD`, `FIELD_CLASS_STRINGS`, `OLD_MARKUP`, `OLD_HELPERS`, `REVERSE` and `CLOSE_LABEL_IS_CANCEL` empty, `MIGRATED_FILES` 61, `PENDING_FOOTER_PARTS` 1 (`maintenance-attachments`, 2C plan 5).
- **Pipeline with plan 2B-4 (2B spec §8.2, I29):** the shared non-code files are `DESIGN.md`, `tests/visual-foundation-guards.test.ts`, `messages/*.json`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md` and `docs/11_FEATURE_LIST.md`. If plan 2B-4 merges first, the controller rebases this branch in Task 21 Step 2 and resolves them by the rules there. A conflict in any other file means a fence leaked: stop.
- **Accepted from the drafts (spec silent or departed on purpose):**
  - Task 3: while the integration client dialog is open, its error shows inside the dialog as `<Notice tone="danger" role="alert">`; the page's error box renders only when no dialog is open (the spec names the box behind the dialog and gives no fix).
  - Tasks 2–3 take the 2B spec's R-e/R-f for their own files (the role table header white 13/500; the client table header and three `toLocaleString()` → `formatCount`) and delete their VFG R7 rows. The LFG rows of those files (LT1 2, LV1 3) and of the two tool headers (LH1) then sit above their live counts; 2C cannot edit LFG, so plan 2B-5 or 2D lowers them (the hand-off lists them). The import panel's table header, `toLocaleString()` ×4, typed dashes and `SummaryPill` stay for 2D (O13 scopes Task 18 to the steps, the buttons and the error box).
  - LFG's "2C plan 4" notes for `OperationMetric`/`SummaryCard` (LS1) and the local `StatusBadge` (LN2) go to 2D: the 2C spec has no row or tone mapping for them.
  - Task 3: only the integration edit trigger becomes a `Button` (§6.4.1); it is 40px beside 44px row buttons on desktop until 2D. The notification and report-preset buttons are not in spec §6.3; they stay for 2D.
  - Task 8: the login form uses `FieldLabel` + `Input` (spec §4.18 item 10; `login-form-ui.test.ts` pins `htmlFor`); the session line keeps `role="status"`, only the error box is `role="alert"`; the info `Notice` uses its own icon; the show-password button keeps its sizes.
  - Task 9 moves the label tools' minimum-characters hint (the spec's "`:313`") into a `FieldHint` and edits `asset-label-print-ui.test.ts:155`; Task 10's boxed toolbar fields get `md:h-10 md:min-h-0` so `h-10` applies.
  - Task 12: the status correction is an inline panel, not a dialog: no dialog parts, buttons per §6.3 #73–74, its own new test file (`asset-operation-status-policy` is read by both plans and edited by neither).
  - Task 16: the create-mode `Segmented` follows the spec (no `showCheck`); in forced colors the chosen option differs by weight only, which Task 19 checks.
  - Task 18: the import error `Notice` gains `role="alert"`; `labels.close`, `labels.submitting` and `labels.importing` stay in the types and pages (only `closeLabel` and the swaps go).
- **The worktree has no `uploads/`** (git-ignored, 2B spec §8.2): attachment thumbnails and evidence files answer 500 there (and on the main checkout's dev box). The dev-app check opens the evidence drawer for its frame, empty state and focus, not for file previews.

## Review Focus

1. **A user who presses Save or a confirm twice, or Enter while it works,** must not send a second request; focus stays on the busy button, which keeps its label. Pinned by FMG GB4 (no `disabled={x}` beside `busy={x}`) and GB3, and by each task's busy test (Tasks 1–5, 8, 12, 15, 17, 18); checked with the keyboard in Task 19.
2. **A user who saves the admin user, role or data-quality rule form with a required field empty** must still be stopped as today. Pinned by FMG GF5 (`CONSTRAINT_FLOORS` never go down) and the new form tests of Tasks 1, 2 and 5.
3. **A user who signs in with a wrong password** must hear the error once, and the show-password control must keep working. Pinned by Task 8's test (`Notice` with `role="alert"`, `htmlFor` labels) and `tests/login-form-ui.test.ts`; checked in a fresh browser context in Task 19 without submitting a real password.
4. **An admin who creates an integration client** must still see the token once with its copy button, and an error while the dialog is open must show inside the dialog, not behind it. Pinned by `tests/integration-api-client-admin.test.ts:125-149` (kept as they are) and the test Task 3 appends there.
5. **A user who imports assets** must see the current step on the shared `Steps` rail on both import pages, without the old current-step label. Pinned by Task 18's two tests and the deletion of `asset.importWizardCurrentStep`; checked on both pages in Task 19 (never applying an import).

## File structure

| File | What changes | Task |
|---|---|---|
| `src/components/admin/admin-user-form.tsx`, `role-permission-form.tsx` | shared fields and checkboxes, busy save; the role table header (R-e) | 1, 2 |
| `src/components/admin/IntegrationClientManager.tsx`, `asset-state-review-dialog.tsx` | dialog parts, K10, K13, the error inside the open dialog | 3, 4 |
| `src/components/admin/data-quality-rule-form.tsx` (+ `D/admin/data-quality/page.tsx` labels) | K20 named severity selects | 5 |
| `src/components/notifications/notification-center-actions.tsx`, `src/components/reports/report-preset-controls.tsx` | `NativeSelect fieldSize="md"` (O17), `Field` + `Input` | 6, 7 |
| `src/components/auth/login-form.tsx` | `FieldLabel` + `Input`, `Notice`, busy submit | 8 |
| `src/components/assets/asset-label-batch-tool.tsx`, `asset-label-print.tsx`, `asset-scan-search-tool.tsx` | `PageHeader` (I13), shared fields, the print toolbar's boxed fields (K21) | 9, 10, 11 |
| `src/components/assets/asset-status-correction-button.tsx`, `asset-evidence-drawer.tsx`, `src/components/ui/activity-drawer.tsx`, `src/components/asset-operations/transaction-cancel-dialog.tsx` | the panel's buttons, sheet chrome and `EmptyNote` (O14), dialog parts | 12–15 |
| `src/components/assets/asset-create-workspace.tsx` (+ `asset.createModeLabel`) | `Segmented` | 16 |
| `src/components/assets/asset-register-table.tsx` | the bulk update dialog only (O1) | 17 |
| `src/components/assets/asset-import-preview-panel.tsx` (+ the two `currentStep` lines, `asset.importWizardCurrentStep` deleted) | `Steps` (S5), buttons (K13), the error `Notice` (O13) | 18 |
| `tests/form-migration-guards.test.ts` | each task lowers its file's budgets and adds it to `MIGRATED_FILES` | 1–18 |
| new form tests (`admin-user-form-ui`, `role-permission-form-ui`, `data-quality-rule-form-ui`, `asset-status-correction-ui`) and one appended test per touched file's UI test | tests | 1–18 |
| `DESIGN.md`, `docs/14_UI_UX_DESIGN_SYSTEM.md`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md` | plan 4 docs | 20, 21 |

---


### Task 0: Worktree setup, base check and before screenshots (controller runs this task, not an implementer)

**Files:**
- Create: the worktree `.worktrees/ui-phase2c-plan4` on branch `feat/ui-phase2c-plan4` (`.worktrees/` is git-ignored, `.gitignore:49-50`)
- Create (git-ignored, inside the worktree): `node_modules/` (`npm ci`; `npm run prisma:generate` writes the client to `node_modules/.prisma/client`), `.env` (a byte copy of the main checkout's `.env`)
- Create then delete: the main checkout's `.claude/launch.json` (only while a server runs; never committed)
- Evidence: `.superpowers/sdd/screenshots/ui-phase2c-plan4/before/` in the main checkout (git-ignored)

**Interfaces:**
- Consumes: `master` at `c2bfbe2`.
- Produces: a working worktree, the baseline numbers there, the FMG precheck, the ids, and the before images Task 19 compares against.

- [ ] **Step 1: The worktree (2B spec §8.2).** The plan commit created it (`git worktree add .worktrees/ui-phase2c-plan4 -b feat/ui-phase2c-plan4 master`, then this plan file committed there). From the main checkout:

Run: `git worktree list`
Expected: the main checkout and `.worktrees/ui-phase2c-plan4 <plan commit> [feat/ui-phase2c-plan4]`. If the worktree is missing, create it with the command above from `master` `c2bfbe2` and record a ruling.

- [ ] **Step 2: Install, generate and copy the env (I30).** From the worktree root:
  - `npm ci` (the same lockfile; no dependency changes). Expected: exit 0.
  - `npm run prisma:generate`. Expected: `Generated Prisma Client` into `node_modules/.prisma/client`.
  - Copy the main checkout's `.env` byte for byte without opening it: `cp ../../.env .env` (the user approved copying `.env` only into the 2C worktrees, I30). Never copy or read `.env.prod-admin`.
  - Confirm the database without printing secrets: read the `.env` keys `DATABASE_URL` and `DB_USER` and print only the database name and the user. Expected: `asset_management_dev` / `asset_dev`. If not, stop and delete the copy.

- [ ] **Step 3: Check the base.** From the worktree:

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2c-plan4`

Run: `git merge-base --is-ancestor c2bfbe2 HEAD && git diff --quiet c2bfbe2 HEAD -- src tests messages scripts prisma && echo BASE-OK`
Expected: `BASE-OK`

If plan 2B-4 already has commits on `feat/ui-phase2b-plan4`, run `git diff --name-only master...feat/ui-phase2b-plan4`: every path must be one of 2B-4's files, its tests, LFG, or the shared non-code files of the Rulings. A batch-4 path means a fence leaked: stop.

- [ ] **Step 4: Baseline in the worktree.** Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: 1951 tests (1950 pass, 0 fail, 1 skipped); tsc clean; lint 0 errors and 146 warnings, all under `.agents/`. Record the numbers in the ledger.

- [ ] **Step 5: FMG precheck.** Save Task 1's `p2c4-precheck.mjs` (Task 1 gives its full text) in the controller's temp folder (`<temp>`, outside both trees) and run it from the worktree root. Every batch-4 row of FMG must equal Task 1's Expected; on any difference, stop and update the tasks before dispatching Task 1.

- [ ] **Step 6: Open the app from the worktree.** The main checkout's servers (3000/3001) serve plan 2B-4; never use them for this plan.
  - The preview tool reads `.claude/launch.json` of the main checkout, so point Next.js at the worktree directory: a configuration named `asset-2c4-dev-3100` with `runtimeExecutable: "node"`, `runtimeArgs: [".worktrees/ui-phase2c-plan4/node_modules/next/dist/bin/next", "dev", ".worktrees/ui-phase2c-plan4", "-p", "3100"]`, `port: 3100`, `autoPort: false` (`next dev <dir>` loads that directory's `.env`). Start it with `preview_start`. If plan 2B-4's controller has its own configuration in the same file, add this one beside it.
  - Log in with the seed admin from `prisma/seed.ts`; do not echo the password. The login form itself is checked in a fresh browser context (no session cookie), never by signing out of this one.

- [ ] **Step 7: Pick ids.** Record in the ledger: a user to open in `/th/admin/users/<id>/edit` and a role in `/th/admin/roles/<id>`, an integration client, a data-quality rule and a review item with a state review, a notification, a report with presets, an asset with evidence files and activity (for the drawers and the status correction), an asset with an active transaction that can be cancelled, the register filter that shows rows for the bulk update dialog, and an import batch or template the preview panel can open without applying. Note which of them the dev data lacks.

- [ ] **Step 8: Before screenshots.** Save to the main checkout's `.superpowers/sdd/screenshots/ui-phase2c-plan4/before/` as `<view>-<width>.png`, at 1440 and 375 unless noted. Open each dialog, drawer or sheet to its first screen and close it with its cancel button, the X or Esc; save nothing:
  - the admin user form (new and edit), the role permission form, the integration client manager and its create dialog, the asset state review dialog, the data-quality rule form
  - the notification center's filter, the report preset controls
  - `/th/login` in a fresh browser context (with the error box shown by an empty submit only if the form blocks it in the browser; never submit a password)
  - `/th/asset-management/labels` (the label batch tool), its print view, `/th/asset-management/scan` (the scan search tool)
  - on `/th/assets/<id>`: the status correction dialog, the evidence drawer, the activity drawer, the transaction cancel dialog
  - `/th/assets/new` (the create workspace's mode toggle)
  - `/th/assets` with two rows ticked and the bulk update dialog open (cancel; never run a bulk action)
  - the import preview panel on `/th/asset-management/import-export` and on `/th/assets` (upload nothing that applies; if a preview needs a file, record that it could not be opened)

- [ ] **Step 9: Clean up.** Stop the server and remove this configuration from the main checkout's `.claude/launch.json` (delete the file if nothing else is in it). In the worktree, `git status --short` must show nothing (`node_modules/`, `src/generated/`, `.env` are ignored). No commit in this task.

---

### Task 1: Batch 4 · `admin/admin-user-form.tsx` (five fields on `Field`, a busy save button; and the precheck and budget scripts that Tasks 2–18 reuse)

Spec §8.9 "ชุด 4" row `admin/admin-user-form.tsx` (`Field` ×5), with §4.3 (F1, F2, F4, F5, F8), §4.4 (L1, the local `Field` of the file), §4.6 (K7), §4.12 (the two 16px checkboxes), §4.14 (the row), §6.3 #1–#2, §6.5.1, §6.7 (the cancel link), §9.4 (the row), §10.1 and §10.3 "plan 4". Line numbers below are recounted at `c2bfbe2` (the spec quotes `5ffee76`, a few lines further down). One file, one commit (I30). The file is CRLF in the worktree; edit it with exact-string replacement only.

Lines at `c2bfbe2`: imports `:3-10` (`Loader2` `:7`), the five `Field` calls `:120-171` (inputs `:121`, `:130`, `:141`, `:150`, the employee `<select>` `:159`), the active checkbox `:173` (class `:177`), the role checkboxes `:188` (class `:192`), the cancel link `:204`, the save button `:210`, the local `Field` `:224-234`.

Rulings this task applies:
- **§4.4 L1, F8:** the local `function Field` goes and the 2A `Field` comes in, in the same edit (the file type-checks only with both). The five calls keep their text (`<Field label={…} required={…}>`); only their child changes (F1).
- **F1, F2:** the four `<input>`s become `Input` and the `<select>` becomes `NativeSelect`. Every attribute stays where it is (`value`, `onChange`, `type`, `required`, `required={!isEdit}`, `minLength={8}`, `maxLength`); only the class strings go. Height comes from `fieldSize` `lg`: 44px with 16px text on phones, 40px from `md` (they were 40px everywhere).
- **K4, F5, GF5:** `CONSTRAINT_FLOORS` `[3, 4, 1]` holds: `required` on username, password (`required={!isEdit}`) and display name; `maxLength` on those three and on email; `minLength={8}` on the password. `Field required` already sits on exactly the fields whose control has `required`, so GF4 passes and no field gains or loses a star.
- **§4.12:** the active checkbox `:177` takes `checkboxVariants()`; the role checkboxes `:192` keep their `mt-0.5` through `cn(checkboxVariants(), "mt-0.5")`. Neither row is one of the 9 small targets of §4.12, so their `<label>` classes stay.
- **§6.7, §6.3 #1:** the cancel link is `Link` with `className={buttonVariants({ variant: "outline" })}` (no `asChild`, §6.2.1), as plan 2 did for the master-data forms. The F1 row `mt-6 flex justify-end gap-3 border-t border-border pt-5` around it stays (§6.7).
- **K13, §6.3 #2, §6.5.1:** the save button is `Button type="submit" busy={saving}` with no `disabled`; `<Save aria-hidden="true" />` stays first, so the spinner takes its place while saving and the label `tCommon("save")` does not change.
- **Ruling (spec gap), the test file:** the form has no UI test of its own (`tests/form-frames-ui.test.ts:35-44` pins only its header) and §9.6 names none. This task creates `tests/admin-user-form-ui.test.ts` (plan 2's per-form pattern, e.g. `tests/branch-form-ui.test.ts`).
- **Ruling (this plan), the scripts:**
  - `p2c-budget.mjs` is plan 2C-2's script (`docs/superpowers/plans/2026-10-12-ui-phase2c-plan2.md` Task 1 Step 2), which plan 2C-3 Task 1 Step 2 copied unchanged; Step 2 below copies it verbatim again. It was run against `tests/form-migration-guards.test.ts` at `c2bfbe2` for Tasks 1–5 of this plan: every budget name it edits exists there, a one-entry object such as `REVERSE` or `CLOSE_LABEL_IS_CANCEL` is left as `{` + `}` on two lines, `--footer-done` removes a `PENDING_FOOTER_PARTS` line, a lowered row keeps its trailing comment, and the file keeps its CRLF line endings.
  - `p2c4-precheck.mjs` is new. It is plan 2C-3's `p2c3-precheck.mjs` with the `c2bfbe2` rows of the 18 batch-4 files (it also checks `BUSY_LABEL_SWAPS`), the primitives batch 4 uses (`SearchField`, `EmptyNote`, `Steps`, `Segmented`, `PageHeader`, `ScannerTextInput`, `labelAction`), and plans 1–3 merged (43 files). It prints each file's live counts beside its budgets: plan 2B-3 lowered the live `OLD_MARKUP` of `assets/asset-register-table.tsx` to 4 under its row 6 without touching FMG (DH "UI Round 4 Phase 2B Plan 3 Asset Register", "Handed on to 2C plan 4"), so a task needs both numbers to predict its failing guard run.

What users will see (`/admin/users/new` and `/admin/users/<id>/edit`):
- The five fields get the 2A look: white, 13px labels, orange stars that screen readers do not read (they hear "required"), 44px tall with 16px text on phones and 40px on desktop. The employee select gets the shared arrow.
- "ยกเลิก" and "บันทึก" are the shared outline and primary buttons, 44px on phones and 40px on desktop. While the user is saved, "บันทึก" keeps focus and shows a spinner in place of the disk icon instead of fading.
- The active and role checkboxes get the shared 16px box and focus outline; their rows look as before.

Not in this task:
- `PageHeader` and `PageBackLink` (2B-1, `tests/form-frames-ui.test.ts:35-44`), the form card `rounded-lg border border-border bg-surface p-6` and the roles section (K28, 2D)
- the floating add button of `/admin/users` (2D)
- messages: no key changes (no `messages-edit.mjs` run)
- no toast, `required`, `maxLength`, `minLength` or `disabled` gate changes (K4); do not run a formatter

**Files:**
- Modify: `src/components/admin/admin-user-form.tsx` (CRLF, 5 replacements)
- Create: `tests/admin-user-form-ui.test.ts` (LF)
- Modify: `tests/form-migration-guards.test.ts` (only through `p2c-budget.mjs`)
- Temp folder only, never committed: `p2c4-precheck.mjs`, `p2c-budget.mjs` (Tasks 2–18 reuse both)

**Must keep passing without edits:**
- `tests/form-frames-ui.test.ts:35-44`: the line `import { PageBackLink, PageHeader } from "@/components/ui/page-header"` stays whole, the `<PageHeader` block `:111-116` stays as it is, and the file has no `<h1` or `ArrowLeft`.
- `tests/list-frame-guards.test.ts` (2B's guard file, never edited by 2C): the form is in its `MIGRATED_LIST_FILES` (`:51`), so it must stay at 0 for every guard: add no `<h1`, `"-"`, `toLocaleString()` or local tile function.
- `tests/feedback-states-ui.test.ts:176-193`: a `busy` button sits in a client file and its `disabled` never repeats the busy expression.

**Interfaces:**
- Consumes:
  - 2A: `Field` from `@/components/ui/field` (`label` first; one element child, whose `id` it sets), `Input`, `NativeSelect`, `checkboxVariants` from `@/components/ui/field-variants`, `Button` with `busy` (default `type="button"`) and `buttonVariants` from `@/components/ui/button`, `cn` from `@/lib/utils`.
  - Plans 1–3: the guard file with their 43 files in `MIGRATED_FILES`, and the batch-4 rows of spec §9.4 untouched (the precheck confirms both).
- Produces (Tasks 2–18 rely on these):
  - `admin/admin-user-form.tsx` is the last line of `MIGRATED_FILES` (44 files), with no entry left in `LOCAL_FIELD`, `RAW_FIELDS`, `FIELD_CLASS_STRINGS`, `OLD_MARKUP` or `LOADER2`; `CONSTRAINT_FLOORS` stays `[3, 4, 1]`.
  - `tests/admin-user-form-ui.test.ts` (LF, 1 test).
  - `<temp>/p2c4-precheck.mjs` and `<temp>/p2c-budget.mjs`.

| file | `LOCAL_FIELD` | `RAW_FIELDS` | `FIELD_CLASS_STRINGS` | `OLD_MARKUP` | `LOADER2` | `CONSTRAINT_FLOORS` |
|---|---|---|---|---|---|---|
| `admin/admin-user-form.tsx` | 1 → – | 5 → – | 5 → – | 4 → – | 1 → – | `[3, 4, 1]` unchanged |

`RAW_FIELDS` 5 = the four inputs and the select; `FIELD_CLASS_STRINGS` 5 = their class strings; `OLD_MARKUP` 4 = the two checkbox classes and the local `Field`'s label span and red star; `LOADER2` 1 = the save spinner.

- [ ] **Step 1: Check what this task builds on**

Save this script as `p2c4-precheck.mjs` in your temp folder (never in the repo). Tasks 2–18 run it with their own file; the controller runs it with no argument in Task 0 Step 5:

```js
// p2c4-precheck.mjs: run from the worktree root. Reads only; writes nothing. Never commit this file.
//   node --no-warnings <temp>/p2c4-precheck.mjs                                  every batch-4 row not migrated yet (Task 0 Step 5)
//   node --no-warnings <temp>/p2c4-precheck.mjs <path under src/components/>     one batch-4 file, before its own task
// Confirms that plans 1-3 are merged, that the primitives batch 4 uses are there, and that the guard file still holds
// the file's row as it was at c2bfbe2 (budgets, GF5 floors, PENDING_FOOTER_PARTS, BUSY_LABEL_SWAPS). Beside each budget
// it prints the live count, read the way tests/form-migration-guards.test.ts reads it, so the task can predict its
// failing run. Plan 2B-3 lowered live counts in asset-register-table.tsx below its rows without touching FMG.
import { existsSync, readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

const C = "src/components/"
const GUARD = "tests/form-migration-guards.test.ts"
const { findJsxTags, hasJsxAttr, jsxAttrValue } = await import(pathToFileURL(`${process.cwd()}/tests/helpers/source-files.ts`).href)

// FMG rows of the 18 batch-4 files at c2bfbe2, in the order of BATCH_FILES "4". A budget left out is 0.
// floors = CONSTRAINT_FLOORS [required, maxLength, minLength] (null = no row); swap = listed in BUSY_LABEL_SWAPS.
const SEEDS = {
  "admin/admin-user-form.tsx": { LOCAL_FIELD: 1, RAW_FIELDS: 5, FIELD_CLASS_STRINGS: 5, OLD_MARKUP: 4, LOADER2: 1, floors: [3, 4, 1], pending: false, swap: false },
  "admin/role-permission-form.tsx": { LOCAL_FIELD: 1, RAW_FIELDS: 4, FIELD_CLASS_STRINGS: 4, OLD_MARKUP: 5, LOADER2: 1, floors: [2, 3, 0], pending: false, swap: false },
  "admin/IntegrationClientManager.tsx": { RAW_FIELDS: 3, FIELD_CLASS_STRINGS: 3, OLD_MARKUP: 5, LOADER2: 4, REVERSE: 1, CLOSE_LABEL_IS_CANCEL: 1, floors: [3, 3, 1], pending: true, swap: false },
  "admin/asset-state-review-dialog.tsx": { RAW_FIELDS: 3, FIELD_CLASS_STRINGS: 3, floors: [1, 1, 1], pending: true, swap: true },
  "admin/data-quality-rule-form.tsx": { RAW_FIELDS: 1, FIELD_CLASS_STRINGS: 1, OLD_MARKUP: 1, floors: null, pending: false, swap: false },
  "assets/asset-label-batch-tool.tsx": { RAW_FIELDS: 4, FIELD_CLASS_STRINGS: 4, OLD_MARKUP: 1, LOADER2: 2, floors: null, pending: false, swap: false },
  "assets/asset-label-print.tsx": { RAW_FIELDS: 2, LOADER2: 1, floors: [0, 1, 0], pending: false, swap: true },
  "assets/asset-scan-search-tool.tsx": { OLD_MARKUP: 1, LOADER2: 1, floors: null, pending: false, swap: false },
  "assets/asset-status-correction-button.tsx": { RAW_FIELDS: 1, FIELD_CLASS_STRINGS: 1, floors: null, pending: false, swap: true },
  "assets/asset-register-table.tsx": { RAW_FIELDS: 4, FIELD_CLASS_STRINGS: 4, OLD_MARKUP: 6, LOADER2: 1, FIXED_BOTTOM_BARS: 1, floors: [1, 1, 0], pending: true, swap: false },
  "assets/asset-import-preview-panel.tsx": { OLD_HELPERS: 1, floors: null, pending: false, swap: true },
  "assets/asset-evidence-drawer.tsx": { floors: null, pending: false, swap: false },
  "assets/asset-create-workspace.tsx": { floors: null, pending: false, swap: false },
  "asset-operations/transaction-cancel-dialog.tsx": { RAW_FIELDS: 1, FIELD_CLASS_STRINGS: 1, LOADER2: 2, floors: [0, 1, 0], pending: true, swap: false },
  "auth/login-form.tsx": { RAW_FIELDS: 2, FIELD_CLASS_STRINGS: 2, OLD_MARKUP: 2, LOADER2: 1, floors: [2, 0, 0], pending: false, swap: true },
  "reports/report-preset-controls.tsx": { RAW_FIELDS: 1, FIELD_CLASS_STRINGS: 1, OLD_MARKUP: 1, floors: [0, 1, 0], pending: false, swap: false },
  "notifications/notification-center-actions.tsx": { RAW_FIELDS: 1, FIELD_CLASS_STRINGS: 1, floors: null, pending: false, swap: false },
  "ui/activity-drawer.tsx": { floors: null, pending: false, swap: false },
}
const BUDGETS = ["LOCAL_FIELD", "RAW_FIELDS", "FIELD_CLASS_STRINGS", "OLD_MARKUP", "LOADER2", "REVERSE", "OLD_HELPERS", "FIXED_BOTTOM_BARS", "CLOSE_LABEL_IS_CANCEL"]

// The guard's own definitions (tests/form-migration-guards.test.ts at c2bfbe2), copied so the live counts match it.
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
  console.error(`usage: node p2c4-precheck.mjs [one of: ${Object.keys(SEEDS).join(", ")}]`)
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
const swapListed = (file) => new RegExp(keyOf(file) + String.raw`\s*:\s*\/`).test(block("BUSY_LABEL_SWAPS") ?? "")
const batchFiles = (batches) => [...guardRaw.matchAll(/^\s+"([0-9a-g]+)": \[([^\]]*)\]/gm)].filter((match) => batches.includes(match[1])).flatMap((match) => [...match[2].matchAll(/"([^"]+)"/g)].map((item) => item[1]))
const before = batchFiles(["1a", "1b", "1c", "1d", "1g", "1e", "1f", "2", "3"])
const batch4 = batchFiles(["4"])
// Without an argument, the rows of files this plan already migrated are skipped (their tasks changed them on purpose).
const done = arg ? [] : Object.keys(SEEDS).filter((file) => listed("MIGRATED_FILES", file))
const files = arg ? [arg] : Object.keys(SEEDS).filter((file) => !done.includes(file))

const dialog = ui("accessible-dialog.tsx")
const field = ui("field.tsx")
const checks = {
  "2C-0 dialog parts: AccessibleDialogBody, AccessibleDialogFooter, AccessibleDialogCancel, accessibleDialogFormClasses": ["AccessibleDialogBody", "AccessibleDialogFooter", "AccessibleDialogCancel"].every((name) => new RegExp(String.raw`export function ${name}\(`).test(dialog)) && /export const accessibleDialogFormClasses = "flex min-h-0 flex-1 flex-col"/.test(dialog),
  "2C-0 AccessibleDialog: description?: ReactNode, closeLabel?: string, busy-aware cancel": /description\?: ReactNode/.test(dialog) && /closeLabel\?: string/.test(dialog) && /disabled=\{dialog\.busy \|\| disabled\} onClick=\{onClick \?\? dialog\.onClose\}/.test(dialog),
  "2A Field (hint, hideLabel, id, labelAction), FieldHint, FieldLabel, FieldRequiredMark": /export \{ Field, FieldError, FieldHint, FieldLabel, FieldRequiredMark \}/.test(field) && ["hint", "hideLabel", "id", "labelAction"].every((prop) => new RegExp(String.raw`\b${prop}\?: `).test(field)),
  "2A Input, NativeSelect, Textarea, SearchField": /export \{ Input \}/.test(ui("input.tsx")) && /export \{ NativeSelect \}/.test(ui("native-select.tsx")) && /export \{ Textarea \}/.test(ui("textarea.tsx")) && /export \{ SearchField \}/.test(ui("search-field.tsx")),
  "2A checkboxVariants (md, lg) and fieldLabelClasses": /export const checkboxVariants = cva\(/.test(ui("field-variants.ts")) && /\blg: "size-5"/.test(ui("field-variants.ts")) && /export const fieldLabelClasses = "text-meta font-medium text-foreground"/.test(ui("field-variants.ts")),
  "2A Button with busy, and buttonVariants": /\bbusy\?: boolean\b/.test(ui("button.tsx")) && /export \{ Button, buttonVariants \}/.test(ui("button.tsx")),
  "2A Notice with a required tone, and EmptyNote": /export function Notice\(/.test(ui("notice.tsx")) && /\btone: NoticeTone\b/.test(ui("notice.tsx")) && /export function EmptyNote\(/.test(ui("empty-note.tsx")),
  "2C-0 sheet: SheetContent, SheetHeader, SheetTitle": ["SheetContent", "SheetHeader", "SheetTitle"].every((name) => new RegExp(String.raw`\b${name}\b`).test(ui("sheet.tsx"))),
  "2C-0 Steps and getLinearStepStates; P0 Segmented; 2B PageHeader; ScannerTextInput": /export function Steps\(/.test(ui("steps.tsx")) && /export function getLinearStepStates\(/.test(read("src/lib/step-states.ts")) && /export \{ Segmented \}/.test(ui("segmented.tsx")) && /export function PageHeader\(/.test(ui("page-header.tsx")) && /export function ScannerTextInput\(/.test(ui("scanner-text-input.tsx")),
  "plans 1-3 merged: their 43 files are in MIGRATED_FILES": before.length === 43 && before.every((path) => listed("MIGRATED_FILES", path)),
  'BATCH_FILES "4" holds the 18 files of this plan': batch4.length === 18 && Object.keys(SEEDS).every((path) => batch4.includes(path)),
}
for (const file of files) {
  const seed = SEEDS[file]
  const wrong = BUDGETS.filter((name) => budget(name, file) !== (seed[name] ?? 0))
  checks[`${file}: not in MIGRATED_FILES yet`] = !listed("MIGRATED_FILES", file)
  checks[`${file}: budgets at their c2bfbe2 row${wrong.length ? ` (differs: ${wrong.join(", ")})` : ""}`] = wrong.length === 0
  checks[`${file}: CONSTRAINT_FLOORS ${seed.floors ? seed.floors.join("/") : "no row"}`] = JSON.stringify(floorsOf(file)) === JSON.stringify(seed.floors)
  checks[`${file}: ${seed.pending ? "in" : "not in"} PENDING_FOOTER_PARTS, ${seed.swap ? "in" : "not in"} BUSY_LABEL_SWAPS`] = listed("PENDING_FOOTER_PARTS", file) === seed.pending && swapListed(file) === seed.swap
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
console.log(`preconditions hold for ${arg ?? `the ${files.length} batch-4 files not migrated yet`}`)
```

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2c-plan4`

Run: `git status --short src tests messages`, then `git ls-files --eol src/components/admin/admin-user-form.tsx tests/form-migration-guards.test.ts`
Expected: `git status` prints nothing. Both files show `i/lf w/crlf`: with `core.autocrlf=true`, the worktree checked every text file out as CRLF. Keep what you find.

Run: `node --no-warnings <temp>/p2c4-precheck.mjs admin/admin-user-form.tsx`
(`--no-warnings` hides Node's `MODULE_TYPELESS_PACKAGE_JSON` notice, which appears because the script imports `tests/helpers/source-files.ts`.)
Expected:
```
ok      2C-0 dialog parts: AccessibleDialogBody, AccessibleDialogFooter, AccessibleDialogCancel, accessibleDialogFormClasses
ok      2C-0 AccessibleDialog: description?: ReactNode, closeLabel?: string, busy-aware cancel
ok      2A Field (hint, hideLabel, id, labelAction), FieldHint, FieldLabel, FieldRequiredMark
ok      2A Input, NativeSelect, Textarea, SearchField
ok      2A checkboxVariants (md, lg) and fieldLabelClasses
ok      2A Button with busy, and buttonVariants
ok      2A Notice with a required tone, and EmptyNote
ok      2C-0 sheet: SheetContent, SheetHeader, SheetTitle
ok      2C-0 Steps and getLinearStepStates; P0 Segmented; 2B PageHeader; ScannerTextInput
ok      plans 1-3 merged: their 43 files are in MIGRATED_FILES
ok      BATCH_FILES "4" holds the 18 files of this plan
ok      admin/admin-user-form.tsx: not in MIGRATED_FILES yet
ok      admin/admin-user-form.tsx: budgets at their c2bfbe2 row
ok      admin/admin-user-form.tsx: CONSTRAINT_FLOORS 3/4/1
ok      admin/admin-user-form.tsx: not in PENDING_FOOTER_PARTS, not in BUSY_LABEL_SWAPS
ok      src/components/admin/admin-user-form.tsx exists
info    tests/form-migration-guards.test.ts: CRLF
info    admin/admin-user-form.tsx: CRLF · budget/live LOCAL_FIELD 1/1 · RAW_FIELDS 5/5 · FIELD_CLASS_STRINGS 5/5 · OLD_MARKUP 4/4 · LOADER2 1/1 · floors live 3/4/1 · AccessibleDialog 0 · AccessibleDialogFooter 0
preconditions hold for admin/admin-user-form.tsx
```
`budget/live` is the guard's row, then the count the guard reads in the file today. On any `MISSING` line, stop and report it.

With no argument, the script checks the row of every batch-4 file that is not in `MIGRATED_FILES` yet. At `c2bfbe2` (Task 0 Step 5) it prints 101 `ok` lines (the 11 shared checks, then 5 per file in the order of `SEEDS`) and then:
```
info    tests/form-migration-guards.test.ts: CRLF
info    admin/admin-user-form.tsx: CRLF · budget/live LOCAL_FIELD 1/1 · RAW_FIELDS 5/5 · FIELD_CLASS_STRINGS 5/5 · OLD_MARKUP 4/4 · LOADER2 1/1 · floors live 3/4/1 · AccessibleDialog 0 · AccessibleDialogFooter 0
info    admin/role-permission-form.tsx: CRLF · budget/live LOCAL_FIELD 1/1 · RAW_FIELDS 4/4 · FIELD_CLASS_STRINGS 4/4 · OLD_MARKUP 5/5 · LOADER2 1/1 · floors live 2/3/0 · AccessibleDialog 0 · AccessibleDialogFooter 0
info    admin/IntegrationClientManager.tsx: CRLF · budget/live RAW_FIELDS 3/3 · FIELD_CLASS_STRINGS 3/3 · OLD_MARKUP 5/5 · LOADER2 4/4 · REVERSE 1/1 · CLOSE_LABEL_IS_CANCEL 1/1 · floors live 3/3/1 · AccessibleDialog 1 · AccessibleDialogFooter 0
info    admin/asset-state-review-dialog.tsx: CRLF · budget/live RAW_FIELDS 3/3 · FIELD_CLASS_STRINGS 3/3 · floors live 1/1/1 · AccessibleDialog 1 · AccessibleDialogFooter 0
info    admin/data-quality-rule-form.tsx: CRLF · budget/live RAW_FIELDS 1/1 · FIELD_CLASS_STRINGS 1/1 · OLD_MARKUP 1/1 · floors live 0/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0
info    assets/asset-label-batch-tool.tsx: CRLF · budget/live RAW_FIELDS 4/4 · FIELD_CLASS_STRINGS 4/4 · OLD_MARKUP 1/1 · LOADER2 2/2 · floors live 0/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0
info    assets/asset-label-print.tsx: CRLF · budget/live RAW_FIELDS 2/2 · LOADER2 1/1 · floors live 0/1/0 · AccessibleDialog 0 · AccessibleDialogFooter 0
info    assets/asset-scan-search-tool.tsx: CRLF · budget/live OLD_MARKUP 1/1 · LOADER2 1/1 · floors live 0/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0
info    assets/asset-status-correction-button.tsx: CRLF · budget/live RAW_FIELDS 1/1 · FIELD_CLASS_STRINGS 1/1 · floors live 0/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0
info    assets/asset-register-table.tsx: CRLF · budget/live RAW_FIELDS 4/4 · FIELD_CLASS_STRINGS 4/4 · OLD_MARKUP 6/4 · LOADER2 1/1 · FIXED_BOTTOM_BARS 1/1 · floors live 1/1/0 · AccessibleDialog 1 · AccessibleDialogFooter 0
info    assets/asset-import-preview-panel.tsx: CRLF · budget/live OLD_HELPERS 1/1 · floors live 0/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0
info    assets/asset-evidence-drawer.tsx: CRLF · budget/live none · floors live 0/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0
info    assets/asset-create-workspace.tsx: CRLF · budget/live none · floors live 0/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0
info    asset-operations/transaction-cancel-dialog.tsx: CRLF · budget/live RAW_FIELDS 1/1 · FIELD_CLASS_STRINGS 1/1 · LOADER2 2/2 · floors live 0/1/0 · AccessibleDialog 1 · AccessibleDialogFooter 0
info    auth/login-form.tsx: CRLF · budget/live RAW_FIELDS 2/2 · FIELD_CLASS_STRINGS 2/2 · OLD_MARKUP 2/2 · LOADER2 1/1 · floors live 2/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0
info    reports/report-preset-controls.tsx: CRLF · budget/live RAW_FIELDS 1/1 · FIELD_CLASS_STRINGS 1/1 · OLD_MARKUP 1/1 · floors live 0/1/0 · AccessibleDialog 0 · AccessibleDialogFooter 0
info    notifications/notification-center-actions.tsx: CRLF · budget/live RAW_FIELDS 1/1 · FIELD_CLASS_STRINGS 1/1 · floors live 0/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0
info    ui/activity-drawer.tsx: CRLF · budget/live none · floors live 0/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0
preconditions hold for the 18 batch-4 files not migrated yet
```

- [ ] **Step 2: Save the budget script**

Every migration commit lowers its own file's budgets, adds the file to `MIGRATED_FILES` and, once its dialog uses the footer part, takes it out of `PENDING_FOOTER_PARTS` (spec §9.9). Two budget objects can hold the same line text for one file (`RAW_FIELDS` and `FIELD_CLASS_STRINGS` both hold `5` for this form), so exact-string edits cannot target them. This script edits by object name instead. It checks each current value against the number you pass and writes nothing on a mismatch. It is plan 2C-2's script, unchanged (plan 2C-3 used the same text). Save it as `p2c-budget.mjs` in your temp folder (never in the repo):

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

`NAME=from:to` lowers the entry from `from` to `to`, and `to = 0` deletes the line. Any budget that still holds a number for the file must be named, so no row is forgotten. Use `:` and not `>`, because the shell reads `>` as a redirect. `--footer-done` removes the file from `PENDING_FOOTER_PARTS`; the four batch-4 files in that set pass it (Tasks 3, 4, 15 and 17). The script never rewrites a row's comment: when a row is lowered but kept, the task fixes the comment with one exact replacement (Task 3).

- [ ] **Step 3: Lower the form's budgets (the failing guard)**

Run: `node --no-warnings <temp>/p2c-budget.mjs admin/admin-user-form.tsx LOCAL_FIELD=1:0 RAW_FIELDS=5:0 FIELD_CLASS_STRINGS=5:0 OLD_MARKUP=4:0 LOADER2=1:0`
Expected:
```
LOCAL_FIELD: 1 -> 0
RAW_FIELDS: 5 -> 0
FIELD_CLASS_STRINGS: 5 -> 0
OLD_MARKUP: 4 -> 0
LOADER2: 1 -> 0
MIGRATED_FILES: added admin/admin-user-form.tsx
```
On `ABORT`, stop and report the lines it prints.

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL, `tests 23 · pass 18 · fail 5`. Each failing guard names only `src/components/admin/admin-user-form.tsx`:
- GF1 `1 > 0`
- GF2 `5 > 0`
- GF3 `5 > 0`
- GF7 `4 > 0`
- GB1 `1 > 0`

GF4, GF8 and GB2 already pass on the file: each starred local `Field` has a control with native `required`, no `<label>` wraps a `Field`, and the spinner sits inside the `<button>`.

- [ ] **Step 4: Create the failing test `tests/admin-user-form-ui.test.ts`**

Create `tests/admin-user-form-ui.test.ts` with this content (LF line endings):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { findJsxTags, hasJsxAttr } from "./helpers/source-files.ts"

// Phase 2C batch 4 (spec 2C §8.9 "ชุด 4"): the admin user form on the shared fields and buttons. The form is CRLF in the
// working tree, so the source is read with \r stripped before the multi-line regexes.
const source = readFileSync("src/components/admin/admin-user-form.tsx", "utf8").replace(/\r\n/g, "\n")

test("the admin user form uses the shared fields, checkboxes and a busy save button (2C batch 4)", () => {
  assert.match(source, /import \{ Field \} from "@\/components\/ui\/field"/)
  assert.doesNotMatch(source, /function Field\(|<select|<textarea|<button|Loader2|ml-1 text-danger|rounded border-border|disabled=/)
  assert.equal(source.match(/<input\b/g)?.length, 2, "only the active and role checkboxes stay native inputs")
  const inputs = findJsxTags(source, ["Input"])
  assert.equal(inputs.length, 4)
  assert.deepEqual(
    ["required", "maxLength", "minLength"].map((attr) => inputs.filter((tag) => hasJsxAttr(tag.text, attr)).length),
    [3, 4, 1],
    "username, password and display name keep the browser's own checks",
  )
  assert.equal(source.match(/<Field label=\{t\("(?:username|displayName)"\)\} required>\n\s+<Input\n/g)?.length, 2)
  assert.match(source, /<Field label=\{isEdit \? t\("newPassword"\) : t\("password"\)\} required=\{!isEdit\}>\n\s+<Input\n\s+type="password"\n/)
  assert.match(source, /<Field label=\{t\("email"\)\}>\n\s+<Input\n\s+type="email"\n/)
  assert.match(source, /<Field label=\{t\("employee"\)\}>\n\s+<NativeSelect\n/)
  assert.match(source, /onChange=\{\(event\) => setField\("isActive", event\.target\.checked\)\}\n\s+className=\{checkboxVariants\(\)\}/)
  assert.match(source, /onChange=\{\(\) => toggleRole\(role\.id\)\}\n\s+className=\{cn\(checkboxVariants\(\), "mt-0\.5"\)\}/)
  assert.match(source, /<Link href=\{backHref\} className=\{buttonVariants\(\{ variant: "outline" \}\)\}>\n\s+\{tCommon\("cancel"\)\}\n\s+<\/Link>/)
  assert.match(source, /<Button type="submit" busy=\{saving\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{tCommon\("save"\)\}\n\s+<\/Button>/)
})
```

Run: `node --test tests/admin-user-form-ui.test.ts`
Expected: FAIL, `tests 1 · pass 0 · fail 1`, first on `/import \{ Field \} from "@\/components\/ui\/field"/`.

- [ ] **Step 5: Move the form onto the primitives (`src/components/admin/admin-user-form.tsx`)**

Make these 5 replacements. Make all of them before you compile: (1) imports the 2A `Field` and (5) deletes the local one, and the file type-checks only with both (§4.3 F8).

(1) Imports (`:3-10`). `Loader2` goes; the 2A modules and `cn` come in. The `page-header` import line stays whole (`tests/form-frames-ui.test.ts:37`).

Replace:

```tsx
import { useMemo, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { useApiError } from "@/components/ui/use-api-error"
```

with:

```tsx
import { useMemo, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { useApiError } from "@/components/ui/use-api-error"
import { cn } from "@/lib/utils"
```

(2) The five fields and the active checkbox (`:120-178`). Every attribute stays in its place; only the class strings go.

Replace:

```tsx
          <Field label={t("username")} required>
            <input
              value={values.username}
              onChange={(event) => setField("username", event.target.value)}
              required
              maxLength={100}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </Field>
          <Field label={isEdit ? t("newPassword") : t("password")} required={!isEdit}>
            <input
              type="password"
              value={values.password}
              onChange={(event) => setField("password", event.target.value)}
              required={!isEdit}
              minLength={8}
              maxLength={100}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </Field>
          <Field label={t("displayName")} required>
            <input
              value={values.displayName}
              onChange={(event) => setField("displayName", event.target.value)}
              required
              maxLength={200}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </Field>
          <Field label={t("email")}>
            <input
              type="email"
              value={values.email ?? ""}
              onChange={(event) => setField("email", event.target.value)}
              maxLength={200}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </Field>
          <Field label={t("employee")}>
            <select
              value={values.employeeId ?? ""}
              onChange={(event) => setField("employeeId", event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            >
              <option value="">{t("noEmployee")}</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.code} - {employee.fullNameTh}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm md:self-end">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) => setField("isActive", event.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
            />
```

with:

```tsx
          <Field label={t("username")} required>
            <Input
              value={values.username}
              onChange={(event) => setField("username", event.target.value)}
              required
              maxLength={100}
            />
          </Field>
          <Field label={isEdit ? t("newPassword") : t("password")} required={!isEdit}>
            <Input
              type="password"
              value={values.password}
              onChange={(event) => setField("password", event.target.value)}
              required={!isEdit}
              minLength={8}
              maxLength={100}
            />
          </Field>
          <Field label={t("displayName")} required>
            <Input
              value={values.displayName}
              onChange={(event) => setField("displayName", event.target.value)}
              required
              maxLength={200}
            />
          </Field>
          <Field label={t("email")}>
            <Input
              type="email"
              value={values.email ?? ""}
              onChange={(event) => setField("email", event.target.value)}
              maxLength={200}
            />
          </Field>
          <Field label={t("employee")}>
            <NativeSelect
              value={values.employeeId ?? ""}
              onChange={(event) => setField("employeeId", event.target.value)}
            >
              <option value="">{t("noEmployee")}</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.code} - {employee.fullNameTh}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <label className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm md:self-end">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) => setField("isActive", event.target.checked)}
              className={checkboxVariants()}
            />
```

(3) The role checkboxes (`:191-192`).

Replace:

```tsx
                  onChange={() => toggleRole(role.id)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-ring"
```

with:

```tsx
                  onChange={() => toggleRole(role.id)}
                  className={cn(checkboxVariants(), "mt-0.5")}
```

(4) The cancel link and the save button (#1–#2, `:204-217`). The F1 row around them keeps its classes.

Replace:

```tsx
          <Link
            href={backHref}
            className="inline-flex h-10 items-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            {tCommon("cancel")}
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {tCommon("save")}
          </button>
```

with:

```tsx
          <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
            {tCommon("cancel")}
          </Link>
          <Button type="submit" busy={saving}>
            <Save aria-hidden="true" />
            {tCommon("save")}
          </Button>
```

(5) The local `Field` goes (`:221-234`). The file still ends with `}` and one line break.

Replace:

```tsx
  )
}

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
```

with:

```tsx
  )
}
```

Check: `grep -n "Loader2\|<input\|<select\|<textarea\|<button\|function Field\|text-danger\|disabled=" src/components/admin/admin-user-form.tsx` prints two lines: `174:` and `189:` (the active and role checkboxes).

- [ ] **Step 6: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/admin-user-form-ui.test.ts tests/form-frames-ui.test.ts tests/list-frame-guards.test.ts tests/feedback-states-ui.test.ts`
Expected: PASS, `tests 67 · pass 67 · fail 0`.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, 1 test more than at `c2bfbe2`: 1952 tests, 1951 pass, 1 skipped.
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- `git diff --stat` shows exactly 2 files: `src/components/admin/admin-user-form.tsx` with 19 insertions and 37 deletions, and `tests/form-migration-guards.test.ts` with 1 insertion and 5 deletions.
- `git status` also lists `?? tests/admin-user-form-ui.test.ts`.
- A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).

- [ ] **Step 8: Commit**

```bash
git add src/components/admin/admin-user-form.tsx tests/admin-user-form-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): admin user form on the shared fields and a busy save button (2C batch 4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the plan 4 dev-app check (Task 19), `/th/admin/users/new` and an existing user's `/th/admin/users/<id>/edit` at 375, 768 and 1440:**
- the five fields 44px with 16px text at 375 and 40px with 14px from 768; 13px labels; orange stars on username, password (new only) and display name, none on email and employee; the employee select with the shared arrow
- leave username empty and press "บันทึก": the browser still stops the submit (native `required`); type a 3-character password on the new page and press "บันทึก": the browser still asks for 8 characters (`minLength`). Never let a submit go through.
- Tab order: the five fields, the active checkbox, the role checkboxes, "ยกเลิก", "บันทึก"; the focus ring shows on each; clicking a role's text toggles its box
- the busy look cannot be seen without saving a user; the new test and guard GB4 pin it

---

### Task 2: Batch 4 · `admin/role-permission-form.tsx` (four fields on `Field`, the permission table's checkboxes and header, a busy save button)

Spec §8.9 "ชุด 4" row `admin/role-permission-form.tsx` (`Field` ×4 · the permission table `:230`, `:247`), with §4.3 (F1, F2, F4, F8), §4.4 (L1), §4.6, §4.12 (the three checkboxes, the two small targets and the disabled rows, ruling 13), §4.13 (`disabled:opacity-60`), §4.14 (the row), §6.3 #13–#14, §6.5.1, §6.7, §9.4 (the row), §10.1 and §10.3 "plan 4". The table header comes from the 2B spec ruling R-e (`docs/superpowers/specs/2026-10-12-ui-phase2b/00-synthesis.md:52`: "3 จุดในไฟล์ชุด 4 … ค้างเป็น budget รายไฟล์ให้ 2C plan 4 หรือ 2D"). One file, one commit (I30). The file is CRLF in the worktree; edit it with exact-string replacement only.

Lines at `c2bfbe2` (the spec quotes `5ffee76`, one line further down): imports `:7-10`, the role key `:147` (class `:153`), display name `:157`, Thai display name `:166`, the active row `:173` and its checkbox `:179`, the description textarea `:185`, the table header `:207-215`, the module row `:223` and its checkbox `:229`, the permission row `:237` and its checkbox `:246`, the cancel link `:261`, the save button `:267`, the local `Field` `:281-291`.

Rulings this task applies:
- **§4.4 L1, F8, F1, F2:** as Task 1: the local `Field` goes and the 2A one comes in; the three `<input>`s become `Input` and the `<textarea>` becomes `Textarea`. The role key keeps `required`, `pattern="[a-z][a-z0-9_]*"` and `disabled={isSystemRole}`, and loses `disabled:opacity-60` (§4.13: the 2A disabled look, grey fill and faint text, comes from `Input`). The textarea's `min-h-24` goes (it repeats the `Textarea` default, §4.6) and `rows={3}` stays.
- **K4, GF5:** `CONSTRAINT_FLOORS` `[2, 3, 0]` holds (`required` on the key and the display name; `maxLength` on the display names and the description).
- **§4.12, ruling 13:** the three checkboxes take `checkboxVariants()` (16px; the module box was 14px). All three can be disabled (`isSystemRole`, `permissionsLocked`), so each row `<label>` gets `has-disabled:cursor-not-allowed has-disabled:text-faint-foreground` in place of the checkbox's `disabled:opacity-60`. Two of them are small targets and get `min-h-11`: the active row `:173` drops `pb-2` for `min-h-11 items-center`, and the module row `:223` becomes `mt-3 inline-flex min-h-11 items-center …`. The permission tiles `:237` are already about 40px and keep their size.
- **Ruling (this plan), the permission tile's text:** its `<span className="text-sm text-foreground">` would keep its own color under `has-disabled:text-faint-foreground`, so the span loses `text-foreground` (the label's color reaches it; the text is foreground as before until the row is disabled).
- **R-e (2B spec), the table header:** the header `:207-215` was `bg-muted/40` with 12px capitals. It takes the white 13/500 header of `DataTable` with this file's own `px-4` cells, the same string 2B-1 gave the settings tables (`function Head`, `src/components/admin/system-settings-form.tsx:2671`): `bg-surface px-4 py-2.5 text-left align-bottom text-meta font-medium text-faint-foreground`. VFG R7 `TABLE_HEADER_FILLS` loses this file's row in this commit (VFG is shared with 2B-4; a row both plans lower takes the lower number, I29 of the 2B spec). `tests/list-frame-guards.test.ts` LT1 keeps its row 2 for this file (2C never edits LFG; the live count is 0 after this task, and LT1 is a ratchet).
- **§6.7, K13, §6.3 #13–#14:** cancel is `Link` + `buttonVariants({ variant: "outline" })`; save is `Button type="submit" busy={saving}` with `<Save aria-hidden="true" />` and the label `t("savePermissions")` kept.
- **I35:** the system-role info box `:139` stays (2D).
- **Ruling (spec gap), the test file:** this task creates `tests/role-permission-form-ui.test.ts` (as Task 1).

What users will see (`/admin/roles/new` and `/admin/roles/<id>/edit`):
- The four fields get the 2A look; a system role's key field is grey with faint text instead of faded.
- The active, module and permission checkboxes are 16px with the shared focus outline. "ใช้งาน" and "เลือกทั้งโมดูล" are 44px tall rows. On the system admin role, whose permissions are locked, the permission and module texts turn faint grey with a not-allowed pointer instead of only the box fading.
- The table header is white with 13px weight-500 grey words in sentence case ("โมดูล", "สิทธิ์") instead of a grey band with small capitals.
- "ยกเลิก" and "บันทึกสิทธิ์" are the shared buttons; "บันทึกสิทธิ์" shows a spinner in place of the disk icon while saving and keeps focus.

Not in this task:
- `PageHeader` and `PageBackLink` (2B-1, `tests/form-frames-ui.test.ts:35-44`), the three section cards (K28, 2D), the info box (I35, 2D)
- the floating add button of `/admin/roles` (2D)
- `tests/list-frame-guards.test.ts` (2B's file: its LT1 and KEEP rows for this file stay 2 until 2B-5 or 2D lowers them)
- messages: no key changes
- no toast, `required`, `pattern`, `maxLength` or `disabled` gate changes (K4); do not run a formatter

**Files:**
- Modify: `src/components/admin/role-permission-form.tsx` (CRLF, 8 replacements)
- Create: `tests/role-permission-form-ui.test.ts` (LF)
- Modify: `tests/visual-foundation-guards.test.ts` (CRLF, 1 replacement: the R7 row)
- Modify: `tests/form-migration-guards.test.ts` (only through `p2c-budget.mjs`)

**Must keep passing without edits:**
- `tests/form-frames-ui.test.ts:35-44`: the `page-header` import line stays whole; `<PageHeader\n\s+title={isCreate ? t("createTitle") : t("editTitle")}` and the `back={<PageBackLink …/>}` line `:124-129` stay; no `<h1` or `ArrowLeft`.
- `tests/visual-foundation-guards.test.ts` R7 (`:271-274`) with this file's row gone, R2, and every other test in the file.
- `tests/list-frame-guards.test.ts` (LT1 row 2 ≥ live 0).

**Interfaces:**
- Consumes: Task 1's `<temp>/p2c4-precheck.mjs` and `<temp>/p2c-budget.mjs` (save them again from Task 1 if missing); 2A `Field`, `Input`, `Textarea`, `checkboxVariants`, `Button`, `buttonVariants`.
- Produces: `admin/role-permission-form.tsx` in `MIGRATED_FILES` (after Task 1's line), with no entry left in `LOCAL_FIELD` (the object is empty after this task), `RAW_FIELDS`, `FIELD_CLASS_STRINGS`, `OLD_MARKUP` or `LOADER2`; `CONSTRAINT_FLOORS` stays `[2, 3, 0]`. VFG `TABLE_HEADER_FILLS` keeps the `IntegrationClientManager.tsx` row (Task 3) and the `asset-import-preview-panel.tsx` row (Task 18 or 2D) under its "2C plan 4 or 2D" comment.

| file | `LOCAL_FIELD` | `RAW_FIELDS` | `FIELD_CLASS_STRINGS` | `OLD_MARKUP` | `LOADER2` | `CONSTRAINT_FLOORS` | VFG R7 |
|---|---|---|---|---|---|---|---|
| `admin/role-permission-form.tsx` | 1 → – | 4 → – | 4 → – | 5 → – | 1 → – | `[2, 3, 0]` unchanged | 1 → – |

`OLD_MARKUP` 5 = the three checkbox classes (`h-4 w-4` ×2, `h-3.5 w-3.5`) and the local `Field`'s label span and red star.

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `git ls-files --eol src/components/admin/role-permission-form.tsx tests/visual-foundation-guards.test.ts`, then `node --no-warnings <temp>/p2c4-precheck.mjs admin/role-permission-form.tsx`
Expected: `git status` prints nothing; both files `i/lf w/crlf`. After the 11 shared `ok` lines of Task 1 Step 1 the script prints:
```
ok      admin/role-permission-form.tsx: not in MIGRATED_FILES yet
ok      admin/role-permission-form.tsx: budgets at their c2bfbe2 row
ok      admin/role-permission-form.tsx: CONSTRAINT_FLOORS 2/3/0
ok      admin/role-permission-form.tsx: not in PENDING_FOOTER_PARTS, not in BUSY_LABEL_SWAPS
ok      src/components/admin/role-permission-form.tsx exists
info    tests/form-migration-guards.test.ts: CRLF
info    admin/role-permission-form.tsx: CRLF · budget/live LOCAL_FIELD 1/1 · RAW_FIELDS 4/4 · FIELD_CLASS_STRINGS 4/4 · OLD_MARKUP 5/5 · LOADER2 1/1 · floors live 2/3/0 · AccessibleDialog 0 · AccessibleDialogFooter 0
preconditions hold for admin/role-permission-form.tsx
```
On any `MISSING` line, stop and report it.

Run: `grep -c 'className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring' src/components/admin/role-permission-form.tsx` and `grep -c '"src/components/admin/role-permission-form.tsx": 1,' tests/visual-foundation-guards.test.ts`
Expected: `3` (the three inputs) and `1` (the R7 row). Otherwise the quoted text below has moved: stop and report.

- [ ] **Step 2: Lower the form's budgets (the failing guard)**

Run: `node --no-warnings <temp>/p2c-budget.mjs admin/role-permission-form.tsx LOCAL_FIELD=1:0 RAW_FIELDS=4:0 FIELD_CLASS_STRINGS=4:0 OLD_MARKUP=5:0 LOADER2=1:0`
Expected:
```
LOCAL_FIELD: 1 -> 0
RAW_FIELDS: 4 -> 0
FIELD_CLASS_STRINGS: 4 -> 0
OLD_MARKUP: 5 -> 0
LOADER2: 1 -> 0
MIGRATED_FILES: added admin/role-permission-form.tsx
```

Then delete the file's VFG R7 row (one exact replacement in `tests/visual-foundation-guards.test.ts`, `:266-268`):

Replace:

```ts
  "src/components/admin/IntegrationClientManager.tsx": 1,
  "src/components/admin/role-permission-form.tsx": 1,
  "src/components/assets/asset-import-preview-panel.tsx": 1,
```

with:

```ts
  "src/components/admin/IntegrationClientManager.tsx": 1,
  "src/components/assets/asset-import-preview-panel.tsx": 1,
```

Run: `node --test tests/form-migration-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 49 · pass 43 · fail 6` (23 in the guard file, 26 in VFG). Each failing guard names only `src/components/admin/role-permission-form.tsx`:
- FMG: GF1 `1 > 0`, GF2 `4 > 0`, GF3 `4 > 0`, GF7 `5 > 0`, GB1 `1 > 0`
- VFG R7 (`17 matches in 11 files; over budget:`): `src/components/admin/role-permission-form.tsx: 1 > 0` (the `bg-muted/40` header)

- [ ] **Step 3: Create the failing test `tests/role-permission-form-ui.test.ts`**

Create `tests/role-permission-form-ui.test.ts` with this content (LF line endings):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { findJsxTags, hasJsxAttr } from "./helpers/source-files.ts"

// Phase 2C batch 4 (spec 2C §8.9 "ชุด 4", §4.12): the role permission form on the shared fields, checkboxes and buttons,
// and its permission table under the white 13px header of DataTable (2B spec R-e). The form is CRLF in the working
// tree, so the source is read with \r stripped before the multi-line regexes.
const source = readFileSync("src/components/admin/role-permission-form.tsx", "utf8").replace(/\r\n/g, "\n")

test("the role permission form uses the shared fields, 16px checkboxes in rows that read as locked, and a busy save button (2C batch 4)", () => {
  assert.match(source, /import \{ Field \} from "@\/components\/ui\/field"/)
  assert.doesNotMatch(source, /function Field\(|<select|<textarea|<button|Loader2|ml-1 text-danger|rounded border-border|disabled:opacity|uppercase|\bbg-muted\//)
  assert.equal(source.match(/<input\b/g)?.length, 3, "only the active, module and permission checkboxes stay native inputs")
  const controls = findJsxTags(source, ["Input", "Textarea"])
  assert.equal(controls.length, 4)
  assert.deepEqual(["required", "maxLength"].map((attr) => controls.filter((tag) => hasJsxAttr(tag.text, attr)).length), [2, 3], "the key and display names keep the browser's own checks")
  assert.match(source, /<Field label=\{t\("roleKey"\)\} required>\n\s+<Input\n\s+value=\{meta\.name\}\n\s+required\n\s+pattern="\[a-z\]\[a-z0-9_\]\*"\n\s+disabled=\{isSystemRole\}\n/)
  assert.match(source, /<Field label=\{t\("description"\)\}>\n\s+<Textarea\n\s+value=\{meta\.description\}\n\s+rows=\{3\}\n\s+maxLength=\{500\}\n/)
  assert.equal(source.match(/className=\{checkboxVariants\(\)\}/g)?.length, 3)
  assert.equal(source.match(/ has-disabled:cursor-not-allowed has-disabled:text-faint-foreground"/g)?.length, 3, "a locked row reads as unavailable instead of fading its box")
  assert.match(source, /<label className="flex min-h-11 items-center gap-2 self-end text-sm font-medium text-foreground has-disabled/)
  assert.match(source, /<label className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs text-muted-foreground has-disabled/)
  assert.match(source, /<span className="text-sm">\{t\(`actions\.\$\{permission\.action\}`\)\}<\/span>/)
  assert.match(source, /<thead>\n\s+<tr>\n\s+<th className="bg-surface px-4 py-2\.5 text-left align-bottom text-meta font-medium text-faint-foreground">\n\s+\{t\("module"\)\}/)
  assert.equal(source.match(/<th className="bg-surface px-4 py-2\.5 text-left align-bottom text-meta font-medium text-faint-foreground">/g)?.length, 2)
  assert.match(source, /<Link href=\{backHref\} className=\{buttonVariants\(\{ variant: "outline" \}\)\}>\n\s+\{tCommon\("cancel"\)\}\n\s+<\/Link>/)
  assert.match(source, /<Button type="submit" busy=\{saving\}>\n\s+<Save aria-hidden="true" \/>\n\s+\{t\("savePermissions"\)\}\n\s+<\/Button>/)
})
```

Run: `node --test tests/role-permission-form-ui.test.ts`
Expected: FAIL, `tests 1 · pass 0 · fail 1`, first on `/import \{ Field \} from "@\/components\/ui\/field"/`.

- [ ] **Step 4: Move the form onto the primitives (`src/components/admin/role-permission-form.tsx`)**

Make these 8 replacements, all before you compile ((1) and (8) belong together, §4.3 F8).

(1) Imports (`:7-10`). `Loader2` goes; the `page-header` import line stays whole.

Replace:

```tsx
import { Info, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { useApiError } from "@/components/ui/use-api-error"
```

with:

```tsx
import { Info, Save } from "lucide-react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
```

(2) The role key, the two display names and the active row (`:146-180`).

Replace:

```tsx
            <Field label={t("roleKey")} required>
              <input
                value={meta.name}
                required
                pattern="[a-z][a-z0-9_]*"
                disabled={isSystemRole}
                onChange={(event) => setMeta((current) => ({ ...current, name: event.target.value }))}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring disabled:opacity-60"
              />
            </Field>
            <Field label={t("displayName")} required>
              <input
                value={meta.displayName}
                required
                maxLength={200}
                onChange={(event) => setMeta((current) => ({ ...current, displayName: event.target.value }))}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </Field>
            <Field label={t("displayNameTh")}>
              <input
                value={meta.displayNameTh}
                maxLength={200}
                onChange={(event) => setMeta((current) => ({ ...current, displayNameTh: event.target.value }))}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={meta.isActive}
                disabled={isSystemRole}
                onChange={(event) => setMeta((current) => ({ ...current, isActive: event.target.checked }))}
                className="h-4 w-4 rounded border-border text-primary focus:ring-ring disabled:opacity-60"
              />
```

with:

```tsx
            <Field label={t("roleKey")} required>
              <Input
                value={meta.name}
                required
                pattern="[a-z][a-z0-9_]*"
                disabled={isSystemRole}
                onChange={(event) => setMeta((current) => ({ ...current, name: event.target.value }))}
              />
            </Field>
            <Field label={t("displayName")} required>
              <Input
                value={meta.displayName}
                required
                maxLength={200}
                onChange={(event) => setMeta((current) => ({ ...current, displayName: event.target.value }))}
              />
            </Field>
            <Field label={t("displayNameTh")}>
              <Input
                value={meta.displayNameTh}
                maxLength={200}
                onChange={(event) => setMeta((current) => ({ ...current, displayNameTh: event.target.value }))}
              />
            </Field>
            <label className="flex min-h-11 items-center gap-2 self-end text-sm font-medium text-foreground has-disabled:cursor-not-allowed has-disabled:text-faint-foreground">
              <input
                type="checkbox"
                checked={meta.isActive}
                disabled={isSystemRole}
                onChange={(event) => setMeta((current) => ({ ...current, isActive: event.target.checked }))}
                className={checkboxVariants()}
              />
```

(3) The description (`:185-191`).

Replace:

```tsx
                <textarea
                  value={meta.description}
                  rows={3}
                  maxLength={500}
                  onChange={(event) => setMeta((current) => ({ ...current, description: event.target.value }))}
                  className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                />
```

with:

```tsx
                <Textarea
                  value={meta.description}
                  rows={3}
                  maxLength={500}
                  onChange={(event) => setMeta((current) => ({ ...current, description: event.target.value }))}
                />
```

(4) The table header (`:207-214`, R-e).

Replace:

```tsx
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                    {t("module")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                    {t("permissions")}
                  </th>
```

with:

```tsx
              <thead>
                <tr>
                  <th className="bg-surface px-4 py-2.5 text-left align-bottom text-meta font-medium text-faint-foreground">
                    {t("module")}
                  </th>
                  <th className="bg-surface px-4 py-2.5 text-left align-bottom text-meta font-medium text-faint-foreground">
                    {t("permissions")}
                  </th>
```

(5) The module row and its checkbox (`:223-230`).

Replace:

```tsx
                      <label className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={modulePermissions.every((permission) => values.has(permission.id))}
                          disabled={permissionsLocked}
                          onChange={(event) => setModulePermissions(modulePermissions, event.target.checked)}
                          className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-ring disabled:opacity-60"
                        />
```

with:

```tsx
                      <label className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs text-muted-foreground has-disabled:cursor-not-allowed has-disabled:text-faint-foreground">
                        <input
                          type="checkbox"
                          checked={modulePermissions.every((permission) => values.has(permission.id))}
                          disabled={permissionsLocked}
                          onChange={(event) => setModulePermissions(modulePermissions, event.target.checked)}
                          className={checkboxVariants()}
                        />
```

(6) The permission tile, its checkbox and its text (`:239-248`).

Replace:

```tsx
                            className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2"
                          >
                            <input
                              type="checkbox"
                              checked={values.has(permission.id)}
                              disabled={permissionsLocked}
                              onChange={() => togglePermission(permission.id)}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-ring disabled:opacity-60"
                            />
                            <span className="text-sm text-foreground">{t(`actions.${permission.action}`)}</span>
```

with:

```tsx
                            className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 has-disabled:cursor-not-allowed has-disabled:text-faint-foreground"
                          >
                            <input
                              type="checkbox"
                              checked={values.has(permission.id)}
                              disabled={permissionsLocked}
                              onChange={() => togglePermission(permission.id)}
                              className={checkboxVariants()}
                            />
                            <span className="text-sm">{t(`actions.${permission.action}`)}</span>
```

(7) The cancel link and the save button (#13–#14, `:261-274`). The row `flex justify-end gap-3` stays.

Replace:

```tsx
          <Link
            href={backHref}
            className="inline-flex h-10 items-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            {tCommon("cancel")}
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("savePermissions")}
          </button>
```

with:

```tsx
          <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
            {tCommon("cancel")}
          </Link>
          <Button type="submit" busy={saving}>
            <Save aria-hidden="true" />
            {t("savePermissions")}
          </Button>
```

(8) The local `Field` goes (`:278-291`). The file still ends with `}` and one line break.

Replace:

```tsx
  )
}

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
```

with:

```tsx
  )
}
```

Check: `grep -n "Loader2\|<input\|<textarea\|<button\|function Field\|text-danger\|opacity\|uppercase\|bg-muted" src/components/admin/role-permission-form.tsx` prints three lines: `176:`, `225:` and `242:` (the three checkboxes).

- [ ] **Step 5: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/role-permission-form-ui.test.ts tests/visual-foundation-guards.test.ts tests/form-frames-ui.test.ts tests/list-frame-guards.test.ts tests/feedback-states-ui.test.ts`
Expected: PASS, `tests 93 · pass 93 · fail 0`.

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, 1 test more than after Task 1: 1953 tests, 1952 pass, 1 skipped.
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- `git diff --stat` shows exactly 3 files: `src/components/admin/role-permission-form.tsx` with 24 insertions and 42 deletions, `tests/form-migration-guards.test.ts` with 1 insertion and 5 deletions, and `tests/visual-foundation-guards.test.ts` with 1 deletion.
- `git status` also lists `?? tests/role-permission-form-ui.test.ts`.
- A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/role-permission-form.tsx tests/role-permission-form-ui.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): role permission form on the shared fields and checkboxes, a white table header and a busy save button (2C batch 4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 4 dev-app check (Task 19), `/th/admin/roles/new`, a custom role's edit page and the `system_admin` role's edit page at 375 and 1440:**
- the four fields at 44px / 16px on the phone and 40px / 14px on desktop, stars on the key and the display name; on a system role the key field is grey with faint text and the active row reads as unavailable (not-allowed pointer, faint text)
- the table header white, 13px, weight 500, no capitals; the "เลือกทั้งโมดูล" row 44px tall; on `system_admin` every permission tile's text faint with the not-allowed pointer; on a custom role clicking a tile's text toggles its box
- leave the key empty or type `Bad Key` and press "บันทึกสิทธิ์": the browser still stops the submit (`required`, `pattern`). Never let a submit go through.
- no page-level sideways scroll at 375 (the table scrolls inside its frame as before)

---

### Task 3: Batch 4 · `admin/IntegrationClientManager.tsx` (the edit dialog on the parts with no cancel X, its error inside it, the create form on `Field`, the edit trigger)

Spec §8.9 "ชุด 4" row `admin/IntegrationClientManager.tsx` (`closeLabel={labels.cancel}` `:395` K10 · the error box `:384` behind the open dialog · the one-time token and its copy button, `tests/integration-api-client-admin.test.ts:141`), with §5.3 (the `:395` row: delete), §5.4, §5.5 row 2, §4.3 (F1, F2, F4, F5: the three fields gain the star), §4.6 (K7), §4.12 (the two legends, the three checkboxes, the token row as a small target), §6.3 #10–#12, §6.4.1 (the trigger `:848`), §6.5.3 (the status line `:528`), §9.4 (the row: `LOADER2` 4 → 2), §10.1, §10.3 "plan 4" (GD1 budget `{}`), I35. The 2B spec hands this file two more items in the same commit: R-e (the client table's header fill `:547`) and R-f (its three `toLocaleString()`, "ส่งต่อ 2C plan 4 (commit เดียวกับไฟล์)", `docs/superpowers/specs/2026-10-12-ui-phase2b/00-synthesis.md:52-53`). One file, one commit (I30). The file is CRLF in the worktree; edit it with exact-string replacement only.

Lines at `c2bfbe2` (equal to the spec's `5ffee76` lines): imports `:4-11`, the token row `:362` and its checkbox `:367`, the error box `:383-387`, the dialog `:389-452` (description `:392`, `closeLabel` `:395`, form `:399`, the display name `:403`, legend `:412`, checkbox `:424`, footer `:432` with `flex-col-reverse`, cancel `:433`, save `:441`), the create form `:459-510` (client id `:462`, display name `:475`, legend `:485`, checkbox `:493`, submit `:501`), the status spinner `:528`, the table header `:547`, the three `toLocaleString()` `:734`, `:776`, `:789`, the edit trigger `:848`, the rotate button's spinner `:863`.

Rulings this task applies:
- **K10, §5.3, GD1:** `closeLabel={labels.cancel}` goes, so the X reads "ปิด" from `tCommon("close")`. `CLOSE_LABEL_IS_CANCEL` becomes `{}` (spec §10.3 "plan 4 … GD1 budget เป็น `{}`").
- **§5.5 row 2, K8, K9:** layout ก: `<form className={accessibleDialogFormClasses}>` wraps `AccessibleDialogBody className="grid gap-4"` (the old `p-5` and the inner `grid gap-4` div become the body) and `AccessibleDialogFooter`; `{editingClient ? <form…> : null}` stays. The footer is `AccessibleDialogCancel` `{labels.cancel}` (it calls the dialog's `onClose`, `closeEditClient`, and is disabled while `updatingClient`, as the old `disabled={updatingClient}` was), then `Button type="submit" busy={updatingClient} disabled={editScopes.length === 0}` with `<Pencil aria-hidden="true" />` kept. The `flex-col-reverse` row goes (`REVERSE` becomes `{}`).
- **§5.5 row 2, K11:** the description, a client id, is `<span className="tag">` (the dialog's `description?: ReactNode`).
- **Ruling (this plan), the error box behind the dialog (spec §8.9 names the defect without a fix):** a failed save sets `error`, but the page's box `:384` renders behind the open modal, so the user sees nothing and a screen reader, kept inside the dialog, hears nothing. While the dialog is open the same message (`{labels.error}: {error}`) shows as the first thing in the dialog body, `<Notice tone="danger" role="alert">`, and the page box renders only while no dialog is open (`error && !editingClient`). `openEditClient` already clears `error`, so an old page error never shows in the dialog; after the user closes the dialog, the page box still shows the failure. The page box itself keeps its hand-made markup (I35, 2D); the dialog uses `Notice` because a new box gets the shared primitive.
- **F1, F2, F4, F5, §4.6:** the three `<label className="grid gap-1.5 …">` + `<input>` pairs become `Field` + `Input`. All three have native `required`, so they get `Field required` and gain the orange star and `aria-required` (three of the 12 fields of §4.3 F5). Every attribute stays (`required`, `minLength={3}`, `maxLength`, `pattern="[A-Za-z0-9._:-]+"`, `placeholder`); `font-normal`, the look classes and `h-10 min-h-11` go, so the fields are 40px on desktop (K7; they were 44 everywhere). `CONSTRAINT_FLOORS` `[3, 3, 1]` holds.
- **§4.12, K27:** the two `<legend>`s take `cn(fieldLabelClasses, "mb-1.5")` and their `<fieldset>`s `min-w-0` (the create form's keeps `lg:col-span-2`). The three checkboxes take `checkboxVariants()`, the token one `cn(checkboxVariants(), "mt-0.5")`. The token row `:362` is one of the 9 small targets: `min-h-11` and, as an `items-start` row, `py-2`. The scope rows are already `min-h-11`.
- **§6.3 #12:** the create button is `Button type="submit" busy={saving} className="w-fit"` with `<Plus aria-hidden="true" />`.
- **§6.4.1:** only the edit trigger `:848` of the row becomes `Button variant="outline"`, keeping `disabled={busy}` (the row's own busy). Rotate, disable and enable stay hand-made with their spinner `:863` (2D, §6.5.3), so on desktop the edit button is 40px beside three 44px buttons until 2D (accepted, see Task 19).
- **§6.5.3, I27, GB2:** the status spinner `:528` stays and gets `motion-reduce:animate-none`. `LOADER2` 4 → 2 (`:528` and `:863`), and the row's comment names the new lines.
- **The token panel stays** (spec §8.9; `tests/integration-api-client-admin.test.ts:125-149`): the token text, the copy button `:341`, the `role="status"` feedback, the dismiss button `:371` and its gate are unchanged; only the acknowledgement checkbox and its row change (above).
- **R-e (2B spec):** the client table's header `:547` `border-b border-border bg-muted/50 text-muted-foreground` becomes `border-b border-border bg-surface text-meta text-faint-foreground`: the white 13/500 header of `DataTable` (its `<th>`s keep `px-4 py-3 font-medium`). VFG R7 `TABLE_HEADER_FILLS` loses this file's row in this commit.
- **R-f (2B spec):** the three `toLocaleString()` become `formatCount(…)` from `@/lib/display-format` (th-TH digits and grouping, the same on every machine). `tests/list-frame-guards.test.ts` LV1 keeps its row 3 for this file (2C never edits LFG; live 0 after this task).
- **Not taken from LFG's comments:** LFG's KEEP rows say "2C plan 4" for `OperationMetric` / `SummaryCard` (LS1, → `StatStrip`) and the local `StatusBadge` (LN2). 2C spec §8.9 gives this file no such row and there is no mapping for their tones, so they stay for 2D (open issue for the controller).

What users will see (`/admin/integrations`):
- "แก้สิทธิ์" opens the dialog with the client id in the monospace `tag` style under the title. Its X reads "ปิด" (it read "ยกเลิก"). The display name and the scopes scroll in the body; "ยกเลิก" and "บันทึกสิทธิ์" sit in the footer bar and stay in view. On phones cancel is on top; from `sm` they form a right-aligned row. "บันทึกสิทธิ์" shows a spinner in place of the pencil and keeps focus while it saves, and is grey while no scope is ticked.
- If the save fails, a red box inside the dialog says why (before, the message went to the page behind the dialog).
- The display name in the dialog and the two fields of the create form get the 2A look and an orange star; they are 40px on desktop (44px before) and 44px with 16px text on phones. The two "สิทธิ์ที่อนุญาต" group labels are 13px like field labels. The checkboxes are the shared 16px box; the token acknowledgement row is 44px tall.
- "สร้าง client" is the shared primary button with a spinner while it creates.
- The client table's header is white with 13px grey words (it was a grey band). The usage numbers use the th-TH format of the other pages.
- In each client row, "แก้สิทธิ์" is the shared outline button (40px on desktop, 4px shorter than its three neighbours until 2D).
- The loading spinner next to "Client ที่ลงทะเบียน" stops for users who reduce motion.

Not in this task:
- the token panel (its copy and dismiss buttons and their boxes), the page error box's markup (I35, 2D), the summary cards and `OperationMetric` tiles (LS1), `StatusBadge` and `ScopeList` (LN2), the rotate / disable / enable buttons, `OperationsPanel`'s PowerShell copy button (2D)
- `confirmScopeExpansionAction` (the verb label of the scope-expansion confirm, plan 5, spec §5.9–5.10) and `src/app/[locale]/(dashboard)/admin/integrations/page.tsx` (plan 5)
- `tests/list-frame-guards.test.ts` (2B's file)
- messages: no key changes
- no toast, `required`, `minLength`, `maxLength`, `pattern` or `disabled` gate changes (K4); do not run a formatter

**Files:**
- Modify: `src/components/admin/IntegrationClientManager.tsx` (CRLF, 11 replacements)
- Modify: `tests/integration-api-client-admin.test.ts` (CRLF: append 1 test)
- Modify: `tests/visual-foundation-guards.test.ts` (CRLF, 1 replacement: the R7 row)
- Modify: `tests/form-migration-guards.test.ts` (the budget script, then 1 exact replacement of the `LOADER2` row's comment)

**Must keep passing without edits:**
- `tests/integration-api-client-admin.test.ts:125-149` (the token stays in React state, the copy and dismiss flow: `confirmScopeExpansion` `:133`, `setCopyFeedback({ tone: "success", … })` `:139`, `role="status"` `:141`, `tokenAcknowledgement`, `dismissToken`, `await confirm\(\{` `:144`), `:151-159` (the three scopes and the default `useState<string[]>(["asset:read", "reference:read"])`), `:161-171` (`buildIntegrationPowerShellExamples`, `client.operations`, `labels.operations`, `labels.requests7d`, `labels.latestError`, `labels.copyPowerShell`).
- `tests/attachment-preview-dialog-ui.test.ts:24-35`: `<AccessibleDialog` stays; no `fixed inset-0`, `role="dialog"` or `aria-modal`.
- `tests/visual-foundation-guards.test.ts:311-321` (R3: no `leading-4` in this file) and R7 with this file's row gone.
- `tests/list-frame-guards.test.ts` (LV1 3, LS1 2, LN2 1 for this file: live 0, 2, 1 after this task) and `tests/list-pages-ui.test.ts:477-483` (the integrations page, untouched).

**Interfaces:**
- Consumes: Task 1's scripts; Task 2's VFG edit (the R7 rows of this file and `asset-import-preview-panel.tsx` are adjacent); 2C-0 the dialog parts and `accessibleDialogFormClasses`; 2A `Field`, `Input`, `checkboxVariants`, `fieldLabelClasses`, `Button` with `busy`, `Notice` (`tone` required; the live-region role is the caller's); `formatCount` from `@/lib/display-format`; `cn`.
- Produces: `admin/IntegrationClientManager.tsx` in `MIGRATED_FILES` (after Task 2's line) and out of `PENDING_FOOTER_PARTS` (3 left: Tasks 4, 15, 17); its only rows left are `LOADER2` 2 and `CONSTRAINT_FLOORS` `[3, 3, 1]`. `REVERSE` and `CLOSE_LABEL_IS_CANCEL` are `{}` (two lines, `{` and `}`). The `Labels` type and the page's `labels` object are unchanged.

| file | `RAW_FIELDS` | `FIELD_CLASS_STRINGS` | `OLD_MARKUP` | `LOADER2` | `REVERSE` | `CLOSE_LABEL_IS_CANCEL` | `PENDING_FOOTER_PARTS` | `CONSTRAINT_FLOORS` | VFG R7 |
|---|---|---|---|---|---|---|---|---|---|
| `admin/IntegrationClientManager.tsx` | 3 → – | 3 → – | 5 → – | 4 → 2 | 1 → – | 1 → – | listed → removed | `[3, 3, 1]` unchanged | 1 → – |

`OLD_MARKUP` 5 = the three checkbox classes and the two legends; `LOADER2` 4 = the dialog's and the create form's button spinners (they go to `busy`), the status line and the rotate button (they stay).

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `git ls-files --eol src/components/admin/IntegrationClientManager.tsx tests/integration-api-client-admin.test.ts`, then `node --no-warnings <temp>/p2c4-precheck.mjs admin/IntegrationClientManager.tsx`
Expected: `git status` prints nothing; both files `i/lf w/crlf`. After the 11 shared `ok` lines the script prints:
```
ok      admin/IntegrationClientManager.tsx: not in MIGRATED_FILES yet
ok      admin/IntegrationClientManager.tsx: budgets at their c2bfbe2 row
ok      admin/IntegrationClientManager.tsx: CONSTRAINT_FLOORS 3/3/1
ok      admin/IntegrationClientManager.tsx: in PENDING_FOOTER_PARTS, not in BUSY_LABEL_SWAPS
ok      src/components/admin/IntegrationClientManager.tsx exists
info    tests/form-migration-guards.test.ts: CRLF
info    admin/IntegrationClientManager.tsx: CRLF · budget/live RAW_FIELDS 3/3 · FIELD_CLASS_STRINGS 3/3 · OLD_MARKUP 5/5 · LOADER2 4/4 · REVERSE 1/1 · CLOSE_LABEL_IS_CANCEL 1/1 · floors live 3/3/1 · AccessibleDialog 1 · AccessibleDialogFooter 0
preconditions hold for admin/IntegrationClientManager.tsx
```
On any `MISSING` line, stop and report it.

Run: `grep -c "closeLabel={labels.cancel}\|flex-col-reverse\|toLocaleString()" src/components/admin/IntegrationClientManager.tsx` and `grep -c '"src/components/admin/IntegrationClientManager.tsx": 1,' tests/visual-foundation-guards.test.ts`
Expected: `5` (one `closeLabel`, one `flex-col-reverse`, three `toLocaleString()`) and `1`. Otherwise stop and report.

- [ ] **Step 2: Lower the file's budgets (the failing guard)**

Run: `node --no-warnings <temp>/p2c-budget.mjs admin/IntegrationClientManager.tsx RAW_FIELDS=3:0 FIELD_CLASS_STRINGS=3:0 OLD_MARKUP=5:0 LOADER2=4:2 REVERSE=1:0 CLOSE_LABEL_IS_CANCEL=1:0 --footer-done`
Expected:
```
RAW_FIELDS: 3 -> 0
FIELD_CLASS_STRINGS: 3 -> 0
OLD_MARKUP: 5 -> 0
LOADER2: 4 -> 2
REVERSE: 1 -> 0
CLOSE_LABEL_IS_CANCEL: 1 -> 0
PENDING_FOOTER_PARTS: removed admin/IntegrationClientManager.tsx
MIGRATED_FILES: added admin/IntegrationClientManager.tsx
```

Then rewrite the kept `LOADER2` row's comment (one exact replacement in `tests/form-migration-guards.test.ts`; `:523` and `:853` are the two spinners after Step 4):

Replace:

```ts
  [`${C}admin/IntegrationClientManager.tsx`]: 2, // → 2: the status line :528 and the row button :863 (2D)
```

with:

```ts
  [`${C}admin/IntegrationClientManager.tsx`]: 2, // the status line :523 and the rotate button of the row :853 (2D, I27)
```

And delete the file's VFG R7 row (one exact replacement in `tests/visual-foundation-guards.test.ts`; after Task 2 the two batch-4 rows sit together):

Replace:

```ts
  "src/components/admin/IntegrationClientManager.tsx": 1,
  "src/components/assets/asset-import-preview-panel.tsx": 1,
```

with:

```ts
  "src/components/assets/asset-import-preview-panel.tsx": 1,
```

The group comment `// 2C plan 4 or 2D (2C batch 4 files, R-e)` stays for the panel's row (Task 18 or 2D).

Run: `node --test tests/form-migration-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: FAIL, `tests 49 · pass 40 · fail 9`. Each failing guard names only `src/components/admin/IntegrationClientManager.tsx`:
- GF2 `3 > 0`, GF3 `3 > 0`, GF7 `5 > 0`
- GB1 `4 > 2`
- GB2 `src/components/admin/IntegrationClientManager.tsx:528` (the status spinner without `motion-reduce:animate-none`)
- GD1 `1 > 0` (`closeLabel={labels.cancel}`)
- GD2 `1 AccessibleDialog, 0 AccessibleDialogFooter`
- GD4 `1 > 0` (`flex-col-reverse`)
- VFG R7 `src/components/admin/IntegrationClientManager.tsx: 1 > 0` (the `bg-muted/50` header)

- [ ] **Step 3: Append the failing test to `tests/integration-api-client-admin.test.ts`**

The file reads its sources without stripping `\r`; the new test strips them itself before its multi-line regexes. One exact replacement at the end of the file (`:225-228`):

Replace:

```ts
      assert.equal(typeof messages.integrationApiPage[key], "string", `${locale} integrationApiPage.${key} should exist`)
    }
  }
})
```

with:

```ts
      assert.equal(typeof messages.integrationApiPage[key], "string", `${locale} integrationApiPage.${key} should exist`)
    }
  }
})

// Phase 2C batch 4 (spec 2C §8.9, §5.5 row 2, K10, §4.3, §4.12, §6.4.1; 2B spec R-e, R-f): the edit dialog on the dialog
// parts with the X named "ปิด", its save error shown inside it, the fields on Field, and the edit trigger on Button.
// The one-time token panel is pinned by the tests above and does not change.
test("integration client manager: the edit dialog uses the dialog parts and shows its own error, and the fields use Field (2C batch 4)", () => {
  const source = readRequiredFile("src/components/admin/IntegrationClientManager.tsx").replace(/\r\n/g, "\n")

  assert.doesNotMatch(source, /closeLabel=|flex-col-reverse|<select|<textarea|mb-2 text-sm font-medium|rounded border-border|font-normal|toLocaleString\(|bg-muted\//)
  assert.match(source, /description=\{editingClient \? <span className="tag">\{editingClient\.clientId\}<\/span> : undefined\}/)
  assert.match(source, /<form onSubmit=\{updateEditingClient\} className=\{accessibleDialogFormClasses\}>\n\s+<AccessibleDialogBody className="grid gap-4">\n\s+\{error \? \(\n\s+<Notice tone="danger" role="alert">\n\s+\{labels\.error\}: \{error\}\n\s+<\/Notice>/)
  assert.match(source, /\{error && !editingClient \? \(\n\s+<div className="rounded-md border border-danger-border bg-danger-soft p-3 text-sm text-danger" role="alert">/, "the page box waits until the dialog is closed")
  assert.match(source, /<AccessibleDialogFooter>\n\s+<AccessibleDialogCancel>\{labels\.cancel\}<\/AccessibleDialogCancel>\n\s+<Button type="submit" busy=\{updatingClient\} disabled=\{editScopes\.length === 0\}>\n\s+<Pencil aria-hidden="true" \/>\n\s+\{labels\.saveScopes\}\n\s+<\/Button>\n\s+<\/AccessibleDialogFooter>/)
  assert.equal(source.match(/<Field label=\{labels\.(?:clientId|displayName)\} required>\n\s+<Input\n/g)?.length, 3)
  assert.match(source, /required\n\s+minLength=\{3\}\n\s+maxLength=\{100\}\n\s+pattern="\[A-Za-z0-9\._:-\]\+"\n/, "the client id keeps every browser check")
  assert.equal(source.match(/<fieldset className="min-w-0(?: lg:col-span-2)?">\n\s+<legend className=\{cn\(fieldLabelClasses, "mb-1\.5"\)\}>\{labels\.scopes\}<\/legend>/g)?.length, 2)
  assert.equal(source.match(/className=\{checkboxVariants\(\)\}/g)?.length, 2)
  assert.match(source, /<label className="flex min-h-11 items-start gap-3 py-2 text-sm text-foreground">\n\s+<input\n\s+type="checkbox"\n\s+checked=\{tokenAcknowledgement\}\n(?:[^\n]*\n)\s+className=\{cn\(checkboxVariants\(\), "mt-0\.5"\)\}/)
  assert.match(source, /<Button type="submit" busy=\{saving\} className="w-fit">\n\s+<Plus aria-hidden="true" \/>\n\s+\{labels\.createClient\}/)
  assert.match(source, /<Button variant="outline" onClick=\{onEdit\} disabled=\{busy\}>\n\s+<Pencil aria-hidden="true" \/>\n\s+\{labels\.editScopes\}/)
  assert.match(source, /<Loader2 className="h-4 w-4 animate-spin text-muted-foreground motion-reduce:animate-none" \/>/)
  assert.match(source, /<thead className="border-b border-border bg-surface text-meta text-faint-foreground">/)
  assert.equal(source.match(/formatCount\(/g)?.length, 3)
  assert.match(source, /<button\n\s+type="button"\n\s+onClick=\{copyToken\}\n/, "the one-time token keeps its copy button")
})
```

Run: `node --test tests/integration-api-client-admin.test.ts`
Expected: FAIL, `tests 13 · pass 12 · fail 1`; the new test fails first on the `doesNotMatch` (`closeLabel=` is still there).

- [ ] **Step 4: Move the dialog, the fields and the trigger (`src/components/admin/IntegrationClientManager.tsx`)**

Make these 11 replacements.

(1) Imports (`:10-11`). `Loader2` stays in the `lucide-react` line (the status line and the rotate button keep it).

Replace:

```tsx
import { useConfirm } from "@/components/ui/confirm-dialog"
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
```

with:

```tsx
import { useConfirm } from "@/components/ui/confirm-dialog"
import {
  AccessibleDialog,
  AccessibleDialogBody,
  AccessibleDialogCancel,
  AccessibleDialogFooter,
  accessibleDialogFormClasses,
} from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { checkboxVariants, fieldLabelClasses } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { Notice } from "@/components/ui/notice"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"
```

(2) The token acknowledgement row and its checkbox (`:362-368`).

Replace:

```tsx
            <label className="flex items-start gap-3 text-sm text-foreground">
              <input
                type="checkbox"
                checked={tokenAcknowledgement}
                onChange={(event) => setTokenAcknowledgement(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border"
              />
```

with:

```tsx
            <label className="flex min-h-11 items-start gap-3 py-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={tokenAcknowledgement}
                onChange={(event) => setTokenAcknowledgement(event.target.checked)}
                className={cn(checkboxVariants(), "mt-0.5")}
              />
```

(3) The page error box waits while the dialog is open (`:383`).

Replace:

```tsx
      {error ? (
        <div className="rounded-md border border-danger-border bg-danger-soft p-3 text-sm text-danger" role="alert">
```

with:

```tsx
      {error && !editingClient ? (
        <div className="rounded-md border border-danger-border bg-danger-soft p-3 text-sm text-danger" role="alert">
```

(4) The dialog (`:389-452`).

Replace:

```tsx
      <AccessibleDialog
        open={editingClient !== null}
        title={labels.editScopes}
        description={editingClient?.clientId}
        busy={updatingClient}
        size="md"
        closeLabel={labels.cancel}
        onClose={closeEditClient}
      >
        {editingClient ? (
          <form onSubmit={updateEditingClient} className="p-5">
            <div className="grid gap-4">
              <label className="grid gap-1.5 text-sm font-medium text-foreground">
                {labels.displayName}
                <input
                  value={editDisplayName}
                  onChange={(event) => setEditDisplayName(event.target.value)}
                  required
                  maxLength={200}
                  className="h-10 min-h-11 rounded-md border border-border bg-background px-3 text-sm font-normal outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
                />
              </label>
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-foreground">{labels.scopes}</legend>
                <div className="grid gap-2">
                  {scopeOptions.map((scope) => (
                    <label
                      key={scope.value}
                      className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                    >
                      <span>{labels[scope.labelKey]}</span>
                      <input
                        type="checkbox"
                        checked={editScopes.includes(scope.value)}
                        onChange={() => toggleEditScope(scope.value)}
                        className="h-4 w-4 rounded border-border"
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeEditClient}
                disabled={updatingClient}
                className="inline-flex h-10 min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                {labels.cancel}
              </button>
              <button
                type="submit"
                disabled={updatingClient || editScopes.length === 0}
                className="inline-flex h-10 min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updatingClient ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                {labels.saveScopes}
              </button>
            </div>
          </form>
        ) : null}
      </AccessibleDialog>
```

with:

```tsx
      <AccessibleDialog
        open={editingClient !== null}
        title={labels.editScopes}
        description={editingClient ? <span className="tag">{editingClient.clientId}</span> : undefined}
        busy={updatingClient}
        size="md"
        onClose={closeEditClient}
      >
        {editingClient ? (
          <form onSubmit={updateEditingClient} className={accessibleDialogFormClasses}>
            <AccessibleDialogBody className="grid gap-4">
              {error ? (
                <Notice tone="danger" role="alert">
                  {labels.error}: {error}
                </Notice>
              ) : null}
              <Field label={labels.displayName} required>
                <Input
                  value={editDisplayName}
                  onChange={(event) => setEditDisplayName(event.target.value)}
                  required
                  maxLength={200}
                />
              </Field>
              <fieldset className="min-w-0">
                <legend className={cn(fieldLabelClasses, "mb-1.5")}>{labels.scopes}</legend>
                <div className="grid gap-2">
                  {scopeOptions.map((scope) => (
                    <label
                      key={scope.value}
                      className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                    >
                      <span>{labels[scope.labelKey]}</span>
                      <input
                        type="checkbox"
                        checked={editScopes.includes(scope.value)}
                        onChange={() => toggleEditScope(scope.value)}
                        className={checkboxVariants()}
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
            </AccessibleDialogBody>
            <AccessibleDialogFooter>
              <AccessibleDialogCancel>{labels.cancel}</AccessibleDialogCancel>
              <Button type="submit" busy={updatingClient} disabled={editScopes.length === 0}>
                <Pencil aria-hidden="true" />
                {labels.saveScopes}
              </Button>
            </AccessibleDialogFooter>
          </form>
        ) : null}
      </AccessibleDialog>
```

(5) The create form's fields, scopes and button (`:460-509`).

Replace:

```tsx
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            {labels.clientId}
            <input
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              required
              minLength={3}
              maxLength={100}
              pattern="[A-Za-z0-9._:-]+"
              placeholder={labels.clientIdPlaceholder}
              className="h-10 min-h-11 rounded-md border border-border bg-background px-3 text-sm font-normal outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            {labels.displayName}
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
              maxLength={200}
              placeholder={labels.displayNamePlaceholder}
              className="h-10 min-h-11 rounded-md border border-border bg-background px-3 text-sm font-normal outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </label>
          <fieldset className="lg:col-span-2">
            <legend className="mb-2 text-sm font-medium text-foreground">{labels.scopes}</legend>
            <div className="grid gap-2 md:grid-cols-3">
              {scopeOptions.map((scope) => (
                <label key={scope.value} className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope.value)}
                    onChange={() => toggleScope(scope.value)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span>{labels[scope.labelKey]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 min-h-11 w-fit items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {labels.createClient}
            </button>
          </div>
```

with:

```tsx
          <Field label={labels.clientId} required>
            <Input
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              required
              minLength={3}
              maxLength={100}
              pattern="[A-Za-z0-9._:-]+"
              placeholder={labels.clientIdPlaceholder}
            />
          </Field>
          <Field label={labels.displayName} required>
            <Input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
              maxLength={200}
              placeholder={labels.displayNamePlaceholder}
            />
          </Field>
          <fieldset className="min-w-0 lg:col-span-2">
            <legend className={cn(fieldLabelClasses, "mb-1.5")}>{labels.scopes}</legend>
            <div className="grid gap-2 md:grid-cols-3">
              {scopeOptions.map((scope) => (
                <label key={scope.value} className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope.value)}
                    onChange={() => toggleScope(scope.value)}
                    className={checkboxVariants()}
                  />
                  <span>{labels[scope.labelKey]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="lg:col-span-2">
            <Button type="submit" busy={saving} className="w-fit">
              <Plus aria-hidden="true" />
              {labels.createClient}
            </Button>
          </div>
```

(6) The status spinner (`:528`, GB2).

Replace:

```tsx
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
```

with:

```tsx
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground motion-reduce:animate-none" /> : null}
```

(7) The client table's header (`:547`, R-e).

Replace:

```tsx
                <thead className="border-b border-border bg-muted/50 text-muted-foreground">
```

with:

```tsx
                <thead className="border-b border-border bg-surface text-meta text-faint-foreground">
```

(8) The top endpoint's count (`:734`, R-f).

Replace:

```tsx
          <span className="ml-1">({operations.topEndpoint.count.toLocaleString()})</span>
```

with:

```tsx
          <span className="ml-1">({formatCount(operations.topEndpoint.count)})</span>
```

(9) `OperationMetric`'s number (`:775-777`, R-f).

Replace:

```tsx
      <div className={`text-sm font-semibold ${tone === "danger" ? "text-danger" : "text-foreground"}`}>
        {value.toLocaleString()}
      </div>
```

with:

```tsx
      <div className={`text-sm font-semibold ${tone === "danger" ? "text-danger" : "text-foreground"}`}>
        {formatCount(value)}
      </div>
```

(10) `SummaryCard`'s number (`:789`, R-f).

Replace:

```tsx
          <p className="mt-2 text-3xl font-bold text-foreground">{value.toLocaleString()}</p>
```

with:

```tsx
          <p className="mt-2 text-3xl font-bold text-foreground">{formatCount(value)}</p>
```

(11) The edit trigger in the row (`:848-856`, §6.4.1). The other three row buttons stay.

Replace:

```tsx
      <button
        type="button"
        onClick={onEdit}
        disabled={busy}
        className="inline-flex h-10 min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Pencil className="h-4 w-4" />
        {labels.editScopes}
      </button>
```

with:

```tsx
      <Button variant="outline" onClick={onEdit} disabled={busy}>
        <Pencil aria-hidden="true" />
        {labels.editScopes}
      </Button>
```

Check: `grep -n "Loader2\|<input\|<button\|closeLabel\|flex-col-reverse\|toLocaleString\|<legend" src/components/admin/IntegrationClientManager.tsx` prints 14 lines: `4:` (the `lucide-react` import with `Loader2`), `354:` (the token's copy button) and `384:` (dismiss), `376:` (the token checkbox), `427:` and `484:` (the two legends), `435:` and `488:` (the scope checkboxes), `523:` (the status spinner), `745:` (the PowerShell copy button), `847:`, `857:`, `866:` (rotate, disable, enable) and `853:` (rotate's spinner).

- [ ] **Step 5: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/integration-api-client-admin.test.ts tests/attachment-preview-dialog-ui.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts tests/list-pages-ui.test.ts tests/accessible-dialog.test.ts tests/feedback-states-ui.test.ts`
Expected: PASS, `tests 132 · pass 132 · fail 0`.

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, 1 test more than after Task 2: 1954 tests, 1953 pass, 1 skipped.
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- exactly 4 files: `src/components/admin/IntegrationClientManager.tsx` with 58 insertions and 68 deletions, `tests/form-migration-guards.test.ts` with 2 insertions and 7 deletions, `tests/integration-api-client-admin.test.ts` with 24 insertions, and `tests/visual-foundation-guards.test.ts` with 1 deletion.
- `git status` lists the same 4 files and nothing else. A file with every line changed was normalized: restore its line endings first.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/IntegrationClientManager.tsx tests/integration-api-client-admin.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): integration client dialog on the dialog parts with its own error, fields on Field and a busy save (2C batch 4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 4 dev-app check (Task 19), `/th/admin/integrations` at 375, 768 and 1440 (Task 0 Step 7 records whether dev has a client):**
- with a client: press its "แก้สิทธิ์": the description is the client id in a tag; the X reads "ปิด" (NVDA; "Close" in English); Tab goes display name → scope boxes → "ยกเลิก" → "บันทึกสิทธิ์" → X; Esc closes and focus returns to the row's "แก้สิทธิ์"; at 375 cancel sits above "บันทึกสิทธิ์", full width; untick every scope and "บันทึกสิทธิ์" is grey. Close with cancel or Esc; never save (a save writes `PATCH /api/admin/integration-clients/<id>`).
- the error-in-dialog path cannot be seen without a failing save; the new test pins it. Do not force one on the shared server.
- the create form: the two fields with stars, 40px on desktop and 44px / 16px at 375; leave the client id empty, or type `a b`, and press "สร้าง client": the browser still stops it (`required`, `pattern`, `minLength`). Never create a client.
- the row: "แก้สิทธิ์" 40px beside the 44px rotate / disable buttons on desktop (accepted until 2D); the table header white and 13px; usage numbers unchanged in value
- with no client on dev: check the create form and the empty table only, and record that the dialog was not seen

---

### Task 4: Batch 4 · `admin/asset-state-review-dialog.tsx` (dialog parts, shared fields, a busy confirm that keeps its label)

Spec §8.9 "ชุด 4" row `admin/asset-state-review-dialog.tsx` (the label swap `:102`, K13), with §5.4, §5.5 row 1 (layout ก, `space-y-4`; `ActionButton` ×2 → `Button`), §4.3 (F1, F2, F4, F5: the reason gains its star; F6: the help line → `hint`), §4.6 (the two selects `:60`, `:73` drop to 40px on desktop), §4.14 (the row), §6.2.1 (`ActionButton` → `Button`), §6.3 #3–#4, §6.5.2 (`:102`), §9.4 (the row) and §10.1. One file, one commit (I30). The file is CRLF in the worktree (the main checkout happens to hold it as LF; a fresh worktree with `core.autocrlf=true` checks it out as CRLF); edit it with exact-string replacement only. Its line numbers at `c2bfbe2` equal the spec's: dialog `:38`, form `:46` (class `:47`), status select `:60`, condition select `:73`, reason `:85` with its help `:97`, footer `:99`, cancel `:100`, confirm `:101`, the swap `:102`.

Rulings this task applies:
- **K9, layout ก (§5.2, §5.5 row 1):** the `<form>` takes `className={accessibleDialogFormClasses}` and wraps `AccessibleDialogBody className="space-y-4"` (the old `space-y-4 p-5`) and `AccessibleDialogFooter`; its `onSubmit` is unchanged.
- **K8, §6.3 #3:** `AccessibleDialogCancel` `{labels.cancel}` first: it calls the dialog's `onClose`, the same `onClose` the old button called, and is disabled while `busy`, as the old `disabled={busy}` was.
- **K13, GB3, GB4, §6.3 #4, §6.5.2:** the confirm is `Button type="submit" variant={mode === "dismiss" ? "destructive" : "default"} busy={busy} disabled={reason.trim().length < 10}`. The label is `{mode === "resolve" ? labels.confirmResolve : labels.confirmDismiss}`; `busy ? labels.saving` goes (spec §6.5.2: the key and the `labels` prop stay, so the workspace and the page do not change). `ActionButton` `danger` → `destructive`, `primary` → `default` (§6.2.1); the import `:5` goes.
- **F1, F2, F4, §4.6:** the two `<label>` + `<select>` pairs become `Field` + `NativeSelect` (they keep `name`, `value`, `onChange`; 44px on phones, 40px from `md`). The reason becomes `Field label={labels.reason} required hint={labels.reasonHelp}` + `Textarea`: it keeps `ref={reasonRef}` (the dialog's `initialFocusRef`), `name="resolutionReason"`, `minLength={10}`, `maxLength={2000}`, `required`, `rows={4}` and the placeholder; the `mt-1 block text-xs text-muted-foreground` help line becomes the field's hint (F6), linked through `aria-describedby`.
- **F5, K4, GF5:** the reason has native `required` and today no star; it gains `Field required` (the first of the 12 fields of §4.3 F5). `CONSTRAINT_FLOORS` `[1, 1, 1]` holds.
- **Ruling, the test:** one test is appended to `tests/asset-state-review-ui.test.ts`, the file that already pins this dialog.

What users will see (`/admin/data-quality`, the review queue, "แก้ไข" or "ยกเว้น" on an item):
- The dialog has the shared footer bar: on phones "ยกเลิก" is on top and the confirm below it, from `sm` a right-aligned row. Buttons are 44px on phones and 40px on desktop.
- The status and condition selects and the reason get the 2A field look with 13px labels; the reason shows an orange star, and its help line is a 13px hint under the field.
- "ยกเว้น" confirms in solid red (`destructive`), "แก้ไข" in the primary color. While the review saves, the confirm keeps its label ("ยืนยันการแก้ไข" / "ยืนยันการยกเว้น") with a spinner and keeps focus instead of switching to "กำลังบันทึก..."; Cancel, X and Esc do nothing.

Not in this task:
- `admin/asset-state-review-workspace.tsx`, which opens the dialog (2B-2, O3), and `src/app/[locale]/(dashboard)/admin/data-quality/page.tsx` (its `labels.saving` stays; Task 5 adds one label there for the rule form)
- `src/components/ui/action-button.tsx` (2D deletes it; other callers remain)
- messages: no key changes (`common.saving` stays, `tests/asset-state-review-ui.test.ts:37-45`)
- no toast, `required`, `minLength`, `maxLength` or `disabled` gate changes (K4); do not run a formatter

**Files:**
- Modify: `src/components/admin/asset-state-review-dialog.tsx` (CRLF, 3 replacements)
- Modify: `tests/asset-state-review-ui.test.ts` (CRLF: append 1 test)
- Modify: `tests/form-migration-guards.test.ts` (only through `p2c-budget.mjs`)

**Must keep passing without edits:**
- `tests/asset-state-review-ui.test.ts:5-18` (`AccessibleDialog`, `minLength=\{10\}`, `statusId`, `conditionId` in the dialog; the workspace pins) and `:37-45` (`common.saving` exists).
- `tests/list-pages-ui.test.ts:459-475` (the review queue, untouched) and `tests/accessible-dialog.test.ts`.

**Interfaces:**
- Consumes: Task 1's scripts; 2C-0 the dialog parts and `accessibleDialogFormClasses`; 2A `Field` (`required`, `hint`), `NativeSelect`, `Textarea`, `Button` with `busy`.
- Produces: `admin/asset-state-review-dialog.tsx` in `MIGRATED_FILES` (after Task 3's line) and out of `PENDING_FOOTER_PARTS` (2 left: Tasks 15 and 17), with no budget entry left; `CONSTRAINT_FLOORS` `[1, 1, 1]` unchanged; its `BUSY_LABEL_SWAPS` row is now checked (GB3). The component's props are unchanged.

| file | `RAW_FIELDS` | `FIELD_CLASS_STRINGS` | `PENDING_FOOTER_PARTS` | `BUSY_LABEL_SWAPS` | `CONSTRAINT_FLOORS` |
|---|---|---|---|---|---|
| `admin/asset-state-review-dialog.tsx` | 3 → – | 3 → – | listed → removed | `labels.saving` → gone (GB3 checks it from this commit) | `[1, 1, 1]` unchanged |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `git ls-files --eol src/components/admin/asset-state-review-dialog.tsx tests/asset-state-review-ui.test.ts`, then `node --no-warnings <temp>/p2c4-precheck.mjs admin/asset-state-review-dialog.tsx`
Expected: `git status` prints nothing; both files `i/lf w/crlf`. After the 11 shared `ok` lines the script prints:
```
ok      admin/asset-state-review-dialog.tsx: not in MIGRATED_FILES yet
ok      admin/asset-state-review-dialog.tsx: budgets at their c2bfbe2 row
ok      admin/asset-state-review-dialog.tsx: CONSTRAINT_FLOORS 1/1/1
ok      admin/asset-state-review-dialog.tsx: in PENDING_FOOTER_PARTS, in BUSY_LABEL_SWAPS
ok      src/components/admin/asset-state-review-dialog.tsx exists
info    tests/form-migration-guards.test.ts: CRLF
info    admin/asset-state-review-dialog.tsx: CRLF · budget/live RAW_FIELDS 3/3 · FIELD_CLASS_STRINGS 3/3 · floors live 1/1/1 · AccessibleDialog 1 · AccessibleDialogFooter 0
preconditions hold for admin/asset-state-review-dialog.tsx
```
On any `MISSING` line, stop and report it.

Run: `grep -c "ActionButton\|labels.saving" src/components/admin/asset-state-review-dialog.tsx`
Expected: `5` (lines `:5`, `:100`, `:101`, `:102`, `:103`: the import, the two buttons with the closing tag of the second, and the swap). Otherwise stop and report.

- [ ] **Step 2: Lower the dialog's budgets (the failing guard)**

Run: `node --no-warnings <temp>/p2c-budget.mjs admin/asset-state-review-dialog.tsx RAW_FIELDS=3:0 FIELD_CLASS_STRINGS=3:0 --footer-done`
Expected:
```
RAW_FIELDS: 3 -> 0
FIELD_CLASS_STRINGS: 3 -> 0
PENDING_FOOTER_PARTS: removed admin/asset-state-review-dialog.tsx
MIGRATED_FILES: added admin/asset-state-review-dialog.tsx
```

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL, `tests 23 · pass 19 · fail 4`. Each failing guard names only `src/components/admin/asset-state-review-dialog.tsx`:
- GF2 `3 > 0`, GF3 `3 > 0`
- GB3 `src/components/admin/asset-state-review-dialog.tsx: /labels\.saving\b/` (the swap is checked from this commit on)
- GD2 `1 AccessibleDialog, 0 AccessibleDialogFooter`

- [ ] **Step 3: Append the failing test to `tests/asset-state-review-ui.test.ts`**

The file reads its sources without stripping `\r`; the new test strips them itself before its multi-line regexes. One exact replacement at the end of the file (`:43-45`):

Replace:

```ts
  assert.equal(th.common.saving, "กำลังบันทึก...")
  assert.equal(en.common.saving, "Saving...")
})
```

with:

```ts
  assert.equal(th.common.saving, "กำลังบันทึก...")
  assert.equal(en.common.saving, "Saving...")
})

// Phase 2C batch 4 (spec 2C §5.5 row 1, §4.3 F5–F6, K13): the review dialog on the dialog parts. The confirm is busy while
// it saves and keeps its label (common.saving stays for other screens); the reason shows the star its required enforces.
test("the asset state review dialog uses the dialog parts, shared fields and a busy confirm that keeps its label (2C batch 4)", () => {
  const dialog = readFileSync("src/components/admin/asset-state-review-dialog.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(dialog, /<form\n\s+className=\{accessibleDialogFormClasses\}\n\s+onSubmit=\{\(event\) => \{/)
  assert.match(dialog, /<AccessibleDialogBody className="space-y-4">/)
  assert.match(dialog, /<Field label=\{labels\.nextStatus\}>\n\s+<NativeSelect\n\s+name="statusId"/)
  assert.match(dialog, /<Field label=\{labels\.nextCondition\}>\n\s+<NativeSelect\n\s+name="conditionId"/)
  assert.match(dialog, /<Field label=\{labels\.reason\} required hint=\{labels\.reasonHelp\}>\n\s+<Textarea\n\s+ref=\{reasonRef\}\n\s+name="resolutionReason"/)
  assert.match(dialog, /<AccessibleDialogFooter>\n\s+<AccessibleDialogCancel>\{labels\.cancel\}<\/AccessibleDialogCancel>\n\s+<Button\n\s+type="submit"\n\s+variant=\{mode === "dismiss" \? "destructive" : "default"\}\n\s+busy=\{busy\}\n\s+disabled=\{reason\.trim\(\)\.length < 10\}\n\s+>\n\s+\{mode === "resolve" \? labels\.confirmResolve : labels\.confirmDismiss\}\n\s+<\/Button>/)
  assert.doesNotMatch(dialog, /ActionButton|labels\.saving|<select|<textarea|<label|p-5/)
})
```

Run: `node --test tests/asset-state-review-ui.test.ts`
Expected: FAIL, `tests 5 · pass 4 · fail 1`; the new test fails first on `/<form\n\s+className=\{accessibleDialogFormClasses\}/`.

- [ ] **Step 4: Move the dialog onto the parts (`src/components/admin/asset-state-review-dialog.tsx`)**

Three exact replacements.

(1) Imports (`:3-5`). `ActionButton` goes.

Replace:

```tsx
import { useRef, useState } from "react"
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
import { ActionButton } from "@/components/ui/action-button"
```

with:

```tsx
import { useRef, useState } from "react"
import {
  AccessibleDialog,
  AccessibleDialogBody,
  AccessibleDialogCancel,
  AccessibleDialogFooter,
  accessibleDialogFormClasses,
} from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
```

(2) The form class (`:46-47`). `onSubmit` below it stays.

Replace:

```tsx
      <form
        className="space-y-4 p-5"
```

with:

```tsx
      <form
        className={accessibleDialogFormClasses}
```

(3) The fields and the footer (`:56-105`).

Replace:

```tsx
      >
        {mode === "resolve" && statusTargets.length > 0 ? (
          <label className="block text-sm font-medium text-foreground">
            {labels.nextStatus}
            <select
              name="statusId"
              value={statusId}
              onChange={(event) => setStatusId(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            >
              {statusTargets.map((target) => <option key={target.id} value={target.id}>{target.nameTh || target.name}</option>)}
            </select>
          </label>
        ) : null}
        {mode === "resolve" && conditionTargets.length > 0 ? (
          <label className="block text-sm font-medium text-foreground">
            {labels.nextCondition}
            <select
              name="conditionId"
              value={conditionId}
              onChange={(event) => setConditionId(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            >
              {conditionTargets.map((target) => <option key={target.id} value={target.id}>{target.nameTh || target.name}</option>)}
            </select>
          </label>
        ) : null}
        <label className="block text-sm font-medium text-foreground">
          {labels.reason}
          <textarea
            ref={reasonRef}
            name="resolutionReason"
            value={reason}
            minLength={10}
            maxLength={2000}
            required
            rows={4}
            onChange={(event) => setReason(event.target.value)}
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            placeholder={labels.reasonPlaceholder}
          />
          <span className="mt-1 block text-xs text-muted-foreground">{labels.reasonHelp}</span>
        </label>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <ActionButton disabled={busy} onClick={onClose}>{labels.cancel}</ActionButton>
          <ActionButton type="submit" variant={mode === "dismiss" ? "danger" : "primary"} disabled={busy || reason.trim().length < 10}>
            {busy ? labels.saving : mode === "resolve" ? labels.confirmResolve : labels.confirmDismiss}
          </ActionButton>
        </div>
      </form>
```

with:

```tsx
      >
        <AccessibleDialogBody className="space-y-4">
          {mode === "resolve" && statusTargets.length > 0 ? (
            <Field label={labels.nextStatus}>
              <NativeSelect
                name="statusId"
                value={statusId}
                onChange={(event) => setStatusId(event.target.value)}
              >
                {statusTargets.map((target) => <option key={target.id} value={target.id}>{target.nameTh || target.name}</option>)}
              </NativeSelect>
            </Field>
          ) : null}
          {mode === "resolve" && conditionTargets.length > 0 ? (
            <Field label={labels.nextCondition}>
              <NativeSelect
                name="conditionId"
                value={conditionId}
                onChange={(event) => setConditionId(event.target.value)}
              >
                {conditionTargets.map((target) => <option key={target.id} value={target.id}>{target.nameTh || target.name}</option>)}
              </NativeSelect>
            </Field>
          ) : null}
          <Field label={labels.reason} required hint={labels.reasonHelp}>
            <Textarea
              ref={reasonRef}
              name="resolutionReason"
              value={reason}
              minLength={10}
              maxLength={2000}
              required
              rows={4}
              onChange={(event) => setReason(event.target.value)}
              placeholder={labels.reasonPlaceholder}
            />
          </Field>
        </AccessibleDialogBody>
        <AccessibleDialogFooter>
          <AccessibleDialogCancel>{labels.cancel}</AccessibleDialogCancel>
          <Button
            type="submit"
            variant={mode === "dismiss" ? "destructive" : "default"}
            busy={busy}
            disabled={reason.trim().length < 10}
          >
            {mode === "resolve" ? labels.confirmResolve : labels.confirmDismiss}
          </Button>
        </AccessibleDialogFooter>
      </form>
```

Check: `grep -n "ActionButton\|labels.saving\|<select\|<textarea\|<label\|disabled=" src/components/admin/asset-state-review-dialog.tsx` prints one line: `109:` (`disabled={reason.trim().length < 10}` on the confirm).

- [ ] **Step 5: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/asset-state-review-ui.test.ts tests/list-pages-ui.test.ts tests/accessible-dialog.test.ts tests/feedback-states-ui.test.ts`
Expected: PASS, `tests 74 · pass 74 · fail 0`.

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, 1 test more than after Task 3: 1955 tests, 1954 pass, 1 skipped.
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- exactly 3 files: `src/components/admin/asset-state-review-dialog.tsx` with 60 insertions and 51 deletions, `tests/asset-state-review-ui.test.ts` with 13 insertions, and `tests/form-migration-guards.test.ts` with 1 insertion and 3 deletions.
- `git status` lists the same 3 files and nothing else. A file with every line changed was normalized: restore its line endings first.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/asset-state-review-dialog.tsx tests/asset-state-review-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): asset state review dialog on the dialog parts with a busy confirm that keeps its label (2C batch 4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 4 dev-app check (Task 19), `/th/admin/data-quality` at 375 and 1440 (only if the review queue has an open item; Task 0 Step 7 records it):**
- "แก้ไข" on an item: the status and condition selects and the reason with its star and 13px hint; 40px fields on desktop, 44px with 16px text at 375; the footer with "ยกเลิก" then "ยืนยันการแก้ไข"; at 375 cancel on top, full width
- "ยกเว้น": the confirm is solid red; with fewer than 10 characters in the reason it is grey
- focus starts in the reason (`initialFocusRef`); Tab reason → "ยกเลิก" → confirm → X; Esc closes and focus returns to the row button; the X reads "ปิด"
- never confirm (it writes the review); the busy look is pinned by the new test and GB3/GB4

---

### Task 5: Batch 4 · `admin/data-quality-rule-form.tsx` (the nameless severity select gets a visible label tied to its rule, K20; 16px checkboxes in 44px rows; a busy save) and its `severity` label on the data-quality page

Spec §8.9 "ชุด 4" row `admin/data-quality-rule-form.tsx` (the nameless field `:81`, K20), with §4.8 row 1 (the ruling for this select), §4.15 last bullet and §4.18 ruling 11 (the label is the existing `dataQualityPage.assetStateReviews.severity`), §4.12 (the checkbox `:74` and its row `:69`, a small target), §4.13 (the select had no disabled look; it is never disabled), §4.14 (the row), §6.3 #5, §6.5.1 (`busy` without a spinner today), §9.4 (the row), §10.1 and the main spec's batch-4 message table ("severity added to the labels of `DataQualityRuleForm`", DH "UI Round 4 Phase 2B Plan 2", "Handed on to 2C plan 4"). One task, one commit: the page edit only adds the label the form now needs (I30, this plan's rule for a page that feeds a task's component). Both files are CRLF in the worktree; edit them with exact-string replacement only.

Lines at `c2bfbe2` (the spec quotes `5ffee76`): the form's imports `:3-6`, the `labels` type `:10-19`, the save button `:56`, the rule row `:68`, its `<label>` `:69` and checkbox `:70` (class `:74`), the rule name `:77`, the select `:81` (class `:84`); the page's `<DataQualityRuleForm` `:150`, its `labels` `:152-161` (`danger: t("danger"),` `:158`), and the key's existing use `severity: t("assetStateReviews.severity"),` `:90` (the review queue's labels).

Rulings this task applies:
- **K20, §4.8 row 1, §4.18 ruling 11:** each rule's severity select gets a visible `Field label={labels.severity}` ("ระดับความสำคัญ") and `aria-describedby` pointing at its rule's name, so a screen reader says which rule it sets. The rule name `<span>` `:77` gets `id={`data-quality-rule-${rule.key}`}` (the spec's `ruleLabelId`); `Field` keeps a child's own `aria-describedby` first and adds nothing else (no hint, no error). The id is written inline twice instead of a `const ruleLabelId` (the `map` callback is an expression body; a block body would re-indent the whole card) — a departure in form only.
- **The labels type and the page (spec message table, §4.15):** `severity: string` joins the form's `labels` type after `danger`, and the page passes `severity: t("assetStateReviews.severity"),` after `danger: t("danger"),`. No new key: the key exists in th and en and the page already uses it `:90`. The page's other labels, its `StatStrip` and the review queue are untouched (`tests/list-pages-ui.test.ts:445-457`).
- **F1, F2, §4.6, §4.13:** the `<select>` becomes `NativeSelect` (`fieldSize` `lg`: 44px with 16px text on phones, 40px from `md`, the shared arrow `pr-9`); its look classes go. It sits in the card's `md:grid-cols-[1fr_auto_auto]` grid as before; the `Field` stacks the label over it.
- **§4.12:** the checkbox takes `cn(checkboxVariants(), "mt-0.5")` (its `mt-1` was the offset); its `<label>` `:69` is one of the 9 small targets and, being `items-start`, gets `min-h-11` and `py-2`.
- **K13, §6.3 #5, §6.5.1:** save is `Button busy={saving} onClick={save} className="w-fit"` (default `type="button"`, as before) with `<Save aria-hidden="true" />`; `disabled={saving}` goes, so focus stays on it while the rules save (spec §6.5.1: "ปุ่มที่ได้ `busy` แต่ไม่มี `Loader2`").
- **K4:** the form has no `required`, `maxLength` or `minLength` and no `CONSTRAINT_FLOORS` row; this task adds none. The toasts stay.
- **Ruling (spec gap), the test file:** this task creates `tests/data-quality-rule-form-ui.test.ts`, which also pins the page's new label line.

What users will see (`/admin/data-quality`, the rules section):
- Each rule card shows "ระดับความสำคัญ" in 13px above its select; screen readers read it as "ระดับความสำคัญ, <rule name>". The select gets the 2A look and the shared arrow: 40px on desktop, 44px with 16px text on phones.
- The enable checkbox is the shared 16px box in a 44px row (the box lines up with the rule name).
- "บันทึก" shows a spinner in place of the disk icon while the rules save, keeps focus and cannot be pressed twice; it no longer fades.

Not in this task:
- the rule cards' frames, the section card and the heading count `toLocaleString("th-TH")` `:54` (K28, 2D; LFG's LV1 counts only a bare `toLocaleString()`)
- the review queue and `asset-state-review-dialog.tsx` (Task 4), the rest of the page (2B-2)
- messages: no key changes
- no toast or behavior change; do not run a formatter

**Files:**
- Modify: `src/components/admin/data-quality-rule-form.tsx` (CRLF, 4 replacements)
- Modify: `src/app/[locale]/(dashboard)/admin/data-quality/page.tsx` (CRLF, 1 replacement)
- Create: `tests/data-quality-rule-form-ui.test.ts` (LF)
- Modify: `tests/form-migration-guards.test.ts` (only through `p2c-budget.mjs`)

**Must keep passing without edits:**
- `tests/list-pages-ui.test.ts:445-457`: the page's `PageHeader` block, its `StatStrip` cells, `pagination: tCommon("pagination"),` / `pageOf: tCommon.raw("pageOf"),` / `tableScrollHint: tCommon("tableScrollHint"),` on consecutive lines, no `toLocaleString(` in the page, and both `<AssetStateReviewWorkspace` and `<DataQualityRuleForm`.
- `tests/asset-state-review-ui.test.ts:5-18`, `:37-45` (the page still passes `t.raw("assetStateReviews.total")` and the review dialog's labels).
- `tests/list-frame-guards.test.ts`: the page is in `MIGRATED_LIST_FILES` (`:80`), so it stays at 0 for every guard.

**Interfaces:**
- Consumes: Task 1's scripts; 2A `Field`, `NativeSelect`, `checkboxVariants`, `Button` with `busy`; `cn`.
- Produces: `admin/data-quality-rule-form.tsx` in `MIGRATED_FILES` (after Task 4's line), with no budget entry left and no `CONSTRAINT_FLOORS` row. `DataQualityRuleForm`'s `labels` has a required `severity: string`; its only caller, the data-quality page, passes it.

| file | `RAW_FIELDS` | `FIELD_CLASS_STRINGS` | `OLD_MARKUP` | `CONSTRAINT_FLOORS` |
|---|---|---|---|---|
| `admin/data-quality-rule-form.tsx` | 1 → – | 1 → – | 1 → – | no row (none added) |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `git ls-files --eol src/components/admin/data-quality-rule-form.tsx "src/app/[locale]/(dashboard)/admin/data-quality/page.tsx"`, then `node --no-warnings <temp>/p2c4-precheck.mjs admin/data-quality-rule-form.tsx`
Expected: `git status` prints nothing; both files `i/lf w/crlf`. After the 11 shared `ok` lines the script prints:
```
ok      admin/data-quality-rule-form.tsx: not in MIGRATED_FILES yet
ok      admin/data-quality-rule-form.tsx: budgets at their c2bfbe2 row
ok      admin/data-quality-rule-form.tsx: CONSTRAINT_FLOORS no row
ok      admin/data-quality-rule-form.tsx: not in PENDING_FOOTER_PARTS, not in BUSY_LABEL_SWAPS
ok      src/components/admin/data-quality-rule-form.tsx exists
info    tests/form-migration-guards.test.ts: CRLF
info    admin/data-quality-rule-form.tsx: CRLF · budget/live RAW_FIELDS 1/1 · FIELD_CLASS_STRINGS 1/1 · OLD_MARKUP 1/1 · floors live 0/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0
preconditions hold for admin/data-quality-rule-form.tsx
```
On any `MISSING` line, stop and report it.

Run: `grep -rn "DataQualityRuleForm" src --include=*.tsx` and `node -e "const m=require('./messages/th.json'),e=require('./messages/en.json');console.log(m.dataQualityPage.assetStateReviews.severity,'|',e.dataQualityPage.assetStateReviews.severity)"`
Expected: four lines, the page's import `:12` and its use `:150` (the only caller) and the form's props type `:8` and definition `:22`; then `ระดับความสำคัญ | Severity`.

- [ ] **Step 2: Lower the form's budgets (the failing guard)**

Run: `node --no-warnings <temp>/p2c-budget.mjs admin/data-quality-rule-form.tsx RAW_FIELDS=1:0 FIELD_CLASS_STRINGS=1:0 OLD_MARKUP=1:0`
Expected:
```
RAW_FIELDS: 1 -> 0
FIELD_CLASS_STRINGS: 1 -> 0
OLD_MARKUP: 1 -> 0
MIGRATED_FILES: added admin/data-quality-rule-form.tsx
```

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL, `tests 23 · pass 20 · fail 3`. Each failing guard names only `src/components/admin/data-quality-rule-form.tsx`:
- GF2 `1 > 0`
- GF3 `1 > 0`
- GF7 `1 > 0`

- [ ] **Step 3: Create the failing test `tests/data-quality-rule-form-ui.test.ts`**

Create `tests/data-quality-rule-form-ui.test.ts` with this content (LF line endings):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Phase 2C batch 4 (spec 2C §8.9, §4.8 row 1 K20, §4.12, §6.3 #5): the data-quality rule cards. Each severity select has
// a visible label and points at its rule's name, so a screen reader knows which rule it sets. Both files are CRLF in the
// working tree, so they are read with \r stripped before the multi-line regexes.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("the data-quality rule form names each severity select after its rule and uses the shared field, checkbox and busy save (2C batch 4)", () => {
  const source = read("src/components/admin/data-quality-rule-form.tsx")
  assert.match(source, /\n    danger: string\n    severity: string\n/)
  assert.match(source, /<span id=\{`data-quality-rule-\$\{rule\.key\}`\} className="block font-medium text-foreground">\{labels\.ruleLabels\[rule\.key\]\}<\/span>/)
  assert.match(source, /<Field label=\{labels\.severity\}>\n\s+<NativeSelect\n\s+value=\{rule\.severity\}\n[^\n]*\n\s+aria-describedby=\{`data-quality-rule-\$\{rule\.key\}`\}\n\s+>/)
  assert.match(source, /<label className="flex min-h-11 items-start gap-3 py-2">\n\s+<input\n\s+type="checkbox"\n(?:[^\n]*\n){2}\s+className=\{cn\(checkboxVariants\(\), "mt-0\.5"\)\}/)
  assert.match(source, /<Button busy=\{saving\} onClick=\{save\} className="w-fit">\n\s+<Save aria-hidden="true" \/>\n\s+\{labels\.save\}\n\s+<\/Button>/)
  assert.doesNotMatch(source, /<select|<button|disabled=|rounded border-border|focus:border-ring/)

  const page = read("src/app/[locale]/(dashboard)/admin/data-quality/page.tsx")
  assert.match(page, /<DataQualityRuleForm\n(?:[^\n]*\n)*?\s+danger: t\("danger"\),\n\s+severity: t\("assetStateReviews\.severity"\),\n\s+ruleLabels:/, "the page passes the existing severity label")
})
```

Run: `node --test tests/data-quality-rule-form-ui.test.ts`
Expected: FAIL, `tests 1 · pass 0 · fail 1`, first on `/\n    danger: string\n    severity: string\n/`.

- [ ] **Step 4: Move the form onto the primitives (`src/components/admin/data-quality-rule-form.tsx`)**

Four exact replacements.

(1) Imports (`:3-6`).

Replace:

```tsx
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Save } from "lucide-react"
import { assetDataQualityRulesKey, type AssetDataQualityRule } from "@/lib/data-quality-rules"
```

with:

```tsx
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { NativeSelect } from "@/components/ui/native-select"
import { assetDataQualityRulesKey, type AssetDataQualityRule } from "@/lib/data-quality-rules"
import { cn } from "@/lib/utils"
```

(2) The `labels` type (`:15-17`).

Replace:

```tsx
    warning: string
    danger: string
    ruleLabels: Record<string, string>
```

with:

```tsx
    warning: string
    danger: string
    severity: string
    ruleLabels: Record<string, string>
```

(3) The save button (#5, `:56-64`).

Replace:

```tsx
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {labels.save}
        </button>
```

with:

```tsx
        <Button busy={saving} onClick={save} className="w-fit">
          <Save aria-hidden="true" />
          {labels.save}
        </Button>
```

(4) The rule's checkbox row, its name and the severity select (`:69-88`).

Replace:

```tsx
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={(event) => updateRule(rule.key, { enabled: event.target.checked })}
                className="mt-1 h-4 w-4 rounded border-border"
              />
              <span>
                <span className="block font-medium text-foreground">{labels.ruleLabels[rule.key]}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{labels.ruleDescriptions[rule.key]}</span>
              </span>
            </label>
            <select
              value={rule.severity}
              onChange={(event) => updateRule(rule.key, { severity: event.target.value as AssetDataQualityRule["severity"] })}
              className="h-10 rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            >
              <option value="warning">{labels.warning}</option>
              <option value="danger">{labels.danger}</option>
            </select>
```

with:

```tsx
            <label className="flex min-h-11 items-start gap-3 py-2">
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={(event) => updateRule(rule.key, { enabled: event.target.checked })}
                className={cn(checkboxVariants(), "mt-0.5")}
              />
              <span>
                <span id={`data-quality-rule-${rule.key}`} className="block font-medium text-foreground">{labels.ruleLabels[rule.key]}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{labels.ruleDescriptions[rule.key]}</span>
              </span>
            </label>
            <Field label={labels.severity}>
              <NativeSelect
                value={rule.severity}
                onChange={(event) => updateRule(rule.key, { severity: event.target.value as AssetDataQualityRule["severity"] })}
                aria-describedby={`data-quality-rule-${rule.key}`}
              >
                <option value="warning">{labels.warning}</option>
                <option value="danger">{labels.danger}</option>
              </NativeSelect>
            </Field>
```

- [ ] **Step 5: Pass the label from the page (`src/app/[locale]/(dashboard)/admin/data-quality/page.tsx`)**

One exact replacement (`:157-159`, inside `<DataQualityRuleForm labels={{ … }}>`).

Replace:

```tsx
          warning: t("warning"),
          danger: t("danger"),
          ruleLabels: Object.fromEntries(rules.map((rule) => [rule.key, t(`rules.${rule.key}.label`)])),
```

with:

```tsx
          warning: t("warning"),
          danger: t("danger"),
          severity: t("assetStateReviews.severity"),
          ruleLabels: Object.fromEntries(rules.map((rule) => [rule.key, t(`rules.${rule.key}.label`)])),
```

Check: `grep -n "<select\|<button\|disabled=\|<input" src/components/admin/data-quality-rule-form.tsx` prints one line: `71:` (the enable checkbox). `grep -c "assetStateReviews.severity" "src/app/[locale]/(dashboard)/admin/data-quality/page.tsx"` prints `2` (the review queue `:90` and the rule form).

- [ ] **Step 6: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/data-quality-rule-form-ui.test.ts tests/list-pages-ui.test.ts tests/asset-state-review-ui.test.ts tests/list-frame-guards.test.ts tests/feedback-states-ui.test.ts`
Expected: PASS, `tests 89 · pass 89 · fail 0`.

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, 1 test more than after Task 4: 1956 tests, 1955 pass, 1 skipped.
- `npx tsc --noEmit`: no errors (the page now satisfies the required `severity`; without Step 5, tsc reports it missing at the page's `labels`).
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- `git diff --stat` shows exactly 3 files: `src/app/[locale]/(dashboard)/admin/data-quality/page.tsx` with 1 insertion, `src/components/admin/data-quality-rule-form.tsx` with 22 insertions and 19 deletions, and `tests/form-migration-guards.test.ts` with 1 insertion and 3 deletions.
- `git status` also lists `?? tests/data-quality-rule-form-ui.test.ts`.
- A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).

- [ ] **Step 8: Commit**

```bash
git add src/components/admin/data-quality-rule-form.tsx "src/app/[locale]/(dashboard)/admin/data-quality/page.tsx" tests/data-quality-rule-form-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): data-quality rule form names each severity select after its rule, on the shared field, checkbox and busy save (2C batch 4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 4 dev-app check (Task 19), `/th/admin/data-quality` (the rules section) at 375 and 1440, Thai and English:**
- each card: "ระดับความสำคัญ" ("Severity") above the select; NVDA reads "ระดับความสำคัญ, combo box, เตือน, <rule name>"; the select 40px on desktop and 44px / 16px at 375 with the shared arrow, its options "เตือน" / "เร่งด่วน" not cut at 375
- the enable checkbox row 44px, the box level with the rule name; clicking the description toggles the box
- change nothing and press nothing that saves (the save writes the system setting); the busy look is pinned by the new test and GB4

---

### Task 6: Batch 4 · `notifications/notification-center-actions.tsx` (the assignee select on `NativeSelect fieldSize="md"`, O17; and the quotes script that Tasks 7–11 reuse)

Spec §8.9 "ชุด 4" row `notification-center-actions.tsx` (1 field), with §8.2 O17, §4.3 F1, F2 and F4 (the one-line `<label>` exception), §4.6 (`fieldSize="md"`, 4 fields), §4.13 (a disabled field with no look), §4.19 risk 6 (the 24px arrow beside `min-w-44`), §9.4 (the row) and §10.3 "plan 4". Line numbers are recounted at `c2bfbe2` and equal the spec's: the `<label>` row `:116`, the `<select>` `:119`, its class string `:127`, `</select>` `:135`. One file, one commit (I30). The file is CRLF; edit it with exact-string replacement only.

Rulings this task applies:
- **O17, §4.6:** the `<select>` becomes `NativeSelect fieldSize="md"`: 44px with 16px text below `md`, 36px with 14px text from `md`, the same height as the two `h-9` buttons beside it. It keeps `value`, `disabled={isPending}`, `onChange` and its options, in the same order.
- **§4.3 F4 (exception):** the one-line `<label>` (icon, "ผู้รับผิดชอบ", select) stays: a label and its control in one row is valid HTML, and GF8 allows a `NativeSelect` inside a `<label>`.
- **§4.3 F2, §4.19 risk 6:** the look classes go and `min-w-44` stays. `NativeSelect` brings `w-full` and `pr-9`; inside the flex row the select now takes the rest of the row (on phones the whole row), never less than 176px.
- **§4.13:** while a change saves (`isPending`), the select gets the 2A disabled look (grey fill and text); today it has none.
- **Ruling (this plan), the buttons:** the "เปิดรายการ" link and the read/unread and snooze buttons are not in the 152 buttons of spec §6.3; they stay for 2D.
- **Ruling (this plan), the test:** the file has no UI test of its own; one test is appended to `tests/notification-topbar-behavior.test.ts`, which already reads this component (`centerActionsSource`).
- **Ruling (this plan), the scripts:** this task saves `p2c4-quotes-6-11.mjs`, which Tasks 7–11 reuse. It checks what Task 1's `p2c4-precheck.mjs` does not: that Tasks 1 to n−1 of this plan landed, that the file's guard rows are still the `c2bfbe2` ones, and that the file and the test file still hold the text the task quotes.

What users will see (`/th/notifications`, the row of each notification):
- The assignee select has the shared field look: white, the shared arrow, 36px from `md` beside the 36px buttons, 44px with 16px text on phones, where it now fills the row after "ผู้รับผิดชอบ".
- While a change is saving, the select is grey instead of looking active.

Not in this task:
- the open link and the two buttons (not in §6.3; 2D)
- the page `src/app/[locale]/(dashboard)/notifications/page.tsx` (2B-5 owns its frame)
- messages: no key changes (no `messages-edit.mjs` run)
- no toast, `disabled` gate or request change (K4); do not run a formatter

**Files:**
- Modify: `src/components/notifications/notification-center-actions.tsx` (CRLF, 2 replacements)
- Modify: `tests/notification-topbar-behavior.test.ts` (CRLF, 1 test appended)
- Modify: `tests/form-migration-guards.test.ts` (only through `p2c-budget.mjs`)
- Temp folder only, never committed: `p2c4-quotes-6-11.mjs` (Tasks 7–11 reuse it), and Task 1's `p2c4-precheck.mjs` and `p2c-budget.mjs`

**Must keep passing without edits:**
- `tests/notification-topbar-behavior.test.ts:29-44`: `isPlainPrimaryClick(event)`, `event.preventDefault()`, `markNotificationRead(item)`, `router.push(item.href)` in `finally`, `notifyNotificationSummaryChanged()` before `router.refresh()`, `toast.error(labels.error)` in `catch`.
- `tests/list-frame-guards.test.ts` (2B's guard file): add no `<h1`, `"-"` or `toLocaleString()`.

**Interfaces:**
- Consumes:
  - 2A: `NativeSelect` from `@/components/ui/native-select` (`fieldSize` `md`; `select-chevron pr-9`; every other prop passes through).
  - Task 1: `<temp>/p2c4-precheck.mjs` and `<temp>/p2c-budget.mjs`. Tasks 1–5: their five files in `MIGRATED_FILES`.
- Produces:
  - `notifications/notification-center-actions.tsx` in `MIGRATED_FILES` (after Task 5's line), with no budget entry left (it never had a `CONSTRAINT_FLOORS` row).
  - `<temp>/p2c4-quotes-6-11.mjs` for Tasks 7–11.

| file | `RAW_FIELDS` | `FIELD_CLASS_STRINGS` | `CONSTRAINT_FLOORS` |
|---|---|---|---|
| `notifications/notification-center-actions.tsx` | 1 → – | 1 → – | no row |

- [ ] **Step 1: Check what this task builds on**

Save this script as `p2c4-quotes-6-11.mjs` in your temp folder, next to Task 1's scripts (never in the repo):

```js
// p2c4-quotes-6-11.mjs: run from the worktree root before each of Tasks 6-11 of plan 4. Usage: node p2c4-quotes-6-11.mjs <6-11>
// Checks that the earlier tasks of plan 4 landed, that the task's file still holds its c2bfbe2 guard rows, and that the
// file and the test file the task edits still hold the text the task quotes. Reads only; writes nothing. Never commit this file.
import { existsSync, readFileSync } from "node:fs"

const C = "src/components/"
const raw = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "")
const read = (path) => raw(path).replace(/\r\n/g, "\n")
const count = (text, literal) => text.split(literal).length - 1
const guard = read("tests/form-migration-guards.test.ts")
const block = (name) => new RegExp(`^const ${name}\\b[\\s\\S]*?^[}\\]]\\)?`, "m").exec(guard)?.[0] ?? ""
// One budget entry as written ("4", "[2, 0, 0]"), or null when the file has none.
const entry = (name, path) => {
  const line = block(name).split("\n").find((text) => text.includes("[`${C}" + path + "`]:"))
  return line ? line.split("]:")[1].replace(/,?\s*(?:\/\/.*)?$/, "").trim() : null
}
const listed = (name, path) => block(name).includes("`${C}" + path + "`")
const BUDGETS = ["LOCAL_FIELD", "RAW_FIELDS", "FIELD_CLASS_STRINGS", "OLD_MARKUP", "LOADER2", "REVERSE", "OLD_HELPERS", "FIXED_BOTTOM_BARS", "CLOSE_LABEL_IS_CANCEL"]
// Plan 4 in task order (Tasks 1-11), under src/components/.
const ORDER = [
  "admin/admin-user-form.tsx",
  "admin/role-permission-form.tsx",
  "admin/IntegrationClientManager.tsx",
  "admin/asset-state-review-dialog.tsx",
  "admin/data-quality-rule-form.tsx",
  "notifications/notification-center-actions.tsx",
  "reports/report-preset-controls.tsx",
  "auth/login-form.tsx",
  "assets/asset-label-batch-tool.tsx",
  "assets/asset-label-print.tsx",
  "assets/asset-scan-search-tool.tsx",
]
// Per task: the guard rows at c2bfbe2, the floors, whether BUSY_LABEL_SWAPS names the file, the quoted text with its
// count in the file, and the test file the task edits with the text it must hold there.
const TASKS = {
  6: {
    seeds: { RAW_FIELDS: "1", FIELD_CLASS_STRINGS: "1" },
    floors: null,
    swap: false,
    quotes: {
      'import { toast } from "sonner"\nimport {\n  isPlainPrimaryClick,': 1,
      "<select\n          value={assignedToUserId}": 1,
      'className="h-9 min-w-44 rounded-md border border-input bg-surface px-3 text-sm outline-none focus:border-ring"': 1,
      "</select>": 1,
    },
    test: ["tests/notification-topbar-behavior.test.ts", { 'test("notification center mutations notify the topbar after a successful save", () => {': 1, "(2C batch 4)": 0 }],
  },
  7: {
    seeds: { RAW_FIELDS: "1", FIELD_CLASS_STRINGS: "1", OLD_MARKUP: "1" },
    floors: "[0, 1, 0]",
    swap: false,
    quotes: {
      'import { BookmarkPlus, Trash2 } from "lucide-react"\nimport {\n  buildReportPreset,': 1,
      '<label className="min-w-0 flex-1">\n          <span className="mb-1.5 block text-sm font-medium text-foreground">{labels.presetName}</span>\n          <input': 1,
      'className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"': 1,
      "maxLength={60}": 1,
      '<p className="mt-2 text-xs text-muted-foreground">{labels.savedPresetsDeviceOnly}</p>': 1,
    },
    test: ["tests/report-presets.test.ts", { 'test("preset writes serialize the normalized list and report success", () => {': 1, "(2C batch 4)": 0 }],
  },
  8: {
    seeds: { RAW_FIELDS: "2", FIELD_CLASS_STRINGS: "2", OLD_MARKUP: "2", LOADER2: "1" },
    floors: "[2, 0, 0]",
    swap: true,
    quotes: {
      'import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react"': 1,
      'className="flex items-start gap-2 rounded-md bg-info-soft px-3 py-2.5 text-sm text-info"': 1,
      '<label htmlFor="login-username" className="mb-1.5 block text-sm font-medium text-foreground">': 1,
      '<label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-foreground">': 1,
      "focus:ring-2 focus:ring-ring/20 sm:h-10 sm:text-sm\"": 2,
      '<div role="alert" aria-live="polite" className="rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger">': 1,
      "aria-busy={loading}": 1,
      '<span>{loading ? t("loggingIn") : t("login")}</span>': 1,
    },
    test: ["tests/login-form-ui.test.ts", {
      '  assert.match(content, /aria-busy=\\{loading\\}/)\n  assert.match(content, /loading \\? t\\("loggingIn"\\) : t\\("login"\\)/)\n': 1,
      'test("login translations include visibility and loading copy", () => {': 1,
      "(2C batch 4)": 0,
    }],
  },
  9: {
    seeds: { RAW_FIELDS: "4", FIELD_CLASS_STRINGS: "4", OLD_MARKUP: "1", LOADER2: "2" },
    floors: null,
    swap: false,
    quotes: {
      'import { ArrowDownAZ, Clock3, Filter, Loader2, MapPin, Plus, Printer, RotateCcw, Search, X } from "lucide-react"': 1,
      '<h1 className="break-words text-2xl font-bold text-foreground">{labels.title}</h1>': 1,
      '<p className="mt-2 text-xs text-muted-foreground">{labels.minChars}</p>': 1,
      '<Loader2 className="h-4 w-4 animate-spin" />': 2,
      'className="h-11 w-full rounded-md border border-border bg-surface px-3 outline-none focus:border-ring focus:ring-1 focus:ring-ring"': 3,
      'icon={<ArrowDownAZ className="h-4 w-4 text-primary" />}': 1,
      "<button\n": 8,
    },
    test: ["tests/asset-label-print-ui.test.ts", {
      '  assert.match(source, /<p className="mt-2 text-xs text-muted-foreground">\\{labels\\.minChars\\}<\\/p>/)\n': 1,
      'test("label queue presents company and branch print scope before location filtering", () => {': 1,
      "(2C batch 4)": 0,
    }],
  },
  10: {
    seeds: { RAW_FIELDS: "2", LOADER2: "1" },
    floors: "[0, 1, 0]",
    swap: true,
    quotes: {
      'import { AlertTriangle, ArrowLeft, Info, Loader2, Printer } from "lucide-react"\nimport { QRCodeSVG } from "qrcode.react"': 1,
      'className="flex min-h-11 w-full min-w-0 flex-wrap items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm sm:h-10 sm:min-w-[240px] sm:flex-nowrap sm:py-0"': 1,
      'className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm sm:h-10 sm:w-auto"': 1,
      "{recordingPrint ? translations.recordingPrint : translations.print}": 1,
      '<h1 className="text-2xl font-bold">{translations.title}</h1>': 1,
      "maxLength={500}": 1,
    },
    test: ["tests/asset-label-print-ui.test.ts", { 'test("the label batch tool uses PageHeader, shared fields and Button (2C batch 4)", () => {': 1, "(2C batch 4)": 1 }],
  },
  11: {
    seeds: { OLD_MARKUP: "1", LOADER2: "1" },
    floors: null,
    swap: false,
    quotes: {
      'import { Loader2, MapPin, PackageSearch, Search } from "lucide-react"\nimport { ScannerTextInput } from "@/components/ui/scanner-text-input"': 1,
      '<h1 className="break-words text-2xl font-bold text-foreground">{labels.title}</h1>': 1,
      '<label htmlFor="asset-scan-query" className="mb-1.5 block text-sm font-medium text-foreground">': 1,
      '<Loader2 className="h-4 w-4 animate-spin" />': 1,
      "<button\n": 2,
    },
    test: ["tests/asset-scan-search-tool.test.ts", {
      '  assert.match(tool, /<label[^>]+htmlFor="asset-scan-query"/)\n': 1,
      'test("asset scan page labels only the native input and uses asset-specific search copy", () => {': 1,
      "(2C batch 4)": 0,
    }],
  },
}

const task = Number(process.argv[2])
const spec = TASKS[task]
if (!spec) {
  console.error("usage: node p2c4-quotes-6-11.mjs <6|7|8|9|10|11>")
  process.exit(2)
}
const file = ORDER[task - 1]
const source = read(C + file)
const earlier = ORDER.slice(0, task - 1)
const seedText = Object.entries(spec.seeds).map(([name, value]) => `${name} ${value}`).join(", ")
const quoteMisses = Object.entries(spec.quotes).filter(([literal, expected]) => count(source, literal) !== expected)
const [testPath, testQuotes] = spec.test
const testSource = read(testPath)
const testMisses = Object.entries(testQuotes).filter(([literal, expected]) => count(testSource, literal) !== expected)
const checks = {
  [`Tasks 1-${task - 1} are in MIGRATED_FILES`]: earlier.every((path) => listed("MIGRATED_FILES", path)),
  [`${file} is not in MIGRATED_FILES yet`]: source.length > 0 && !listed("MIGRATED_FILES", file),
  [`guard rows: ${seedText}`]: BUDGETS.every((name) => entry(name, file) === (spec.seeds[name] ?? null)),
  [`CONSTRAINT_FLOORS ${spec.floors ?? "none"}`]: entry("CONSTRAINT_FLOORS", file) === spec.floors,
  [`${spec.swap ? "listed" : "not listed"} in BUSY_LABEL_SWAPS`]: (block("BUSY_LABEL_SWAPS").includes("`${C}" + file + "`")) === spec.swap,
  ["not listed in PENDING_FOOTER_PARTS"]: !listed("PENDING_FOOTER_PARTS", file),
  [`quoted text: ${Object.keys(spec.quotes).length} snippets at their counts`]: quoteMisses.length === 0,
  [`${testPath}: ${Object.keys(testQuotes).length} snippets at their counts`]: testMisses.length === 0,
}
let missing = 0
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${ok ? "ok     " : "MISSING"} ${name}`)
  if (!ok) missing += 1
}
for (const [literal, expected] of quoteMisses) console.log(`        found ${count(source, literal)}, expected ${expected}: ${JSON.stringify(literal)}`)
for (const [literal, expected] of testMisses) console.log(`        found ${count(testSource, literal)}, expected ${expected} in ${testPath}: ${JSON.stringify(literal)}`)
for (const path of [C + file, testPath]) {
  const text = raw(path)
  const crlf = (text.match(/\r\n/g) ?? []).length
  const lf = (text.match(/\n/g) ?? []).length
  console.log(`info    line endings of ${path}: ${crlf === lf && lf > 0 ? "CRLF" : crlf === 0 ? "LF" : "mixed"}`)
}
if (missing > 0) {
  console.error(`ABORT: ${missing} precondition(s) failed. Do not start Task ${task}; report which.`)
  process.exit(1)
}
console.log(`Task ${task} preconditions hold`)
```

Run: `git rev-parse --abbrev-ref HEAD`
Expected: `feat/ui-phase2c-plan4`

Run: `git status --short src tests messages`, then `node --no-warnings <temp>/p2c4-precheck.mjs notifications/notification-center-actions.tsx`, then `node <temp>/p2c4-quotes-6-11.mjs 6`
Expected:
- `git status` prints nothing.
- Task 1's precheck ends with `preconditions hold for notifications/notification-center-actions.tsx`; its line for the file shows `CRLF`, `RAW_FIELDS 1/1`, `FIELD_CLASS_STRINGS 1/1` and `floors live 0/0/0` (the row, then the live count).
- `p2c4-quotes-6-11.mjs` prints:
```
ok      Tasks 1-5 are in MIGRATED_FILES
ok      notifications/notification-center-actions.tsx is not in MIGRATED_FILES yet
ok      guard rows: RAW_FIELDS 1, FIELD_CLASS_STRINGS 1
ok      CONSTRAINT_FLOORS none
ok      not listed in BUSY_LABEL_SWAPS
ok      not listed in PENDING_FOOTER_PARTS
ok      quoted text: 4 snippets at their counts
ok      tests/notification-topbar-behavior.test.ts: 2 snippets at their counts
info    line endings of src/components/notifications/notification-center-actions.tsx: CRLF
info    line endings of tests/notification-topbar-behavior.test.ts: CRLF
Task 6 preconditions hold
```
On any `MISSING` line, stop and report it.

Run: `git ls-files --eol src/components/notifications/notification-center-actions.tsx tests/notification-topbar-behavior.test.ts tests/form-migration-guards.test.ts`
Expected: `i/lf w/crlf` for all three. Keep what you find; `p2c-budget.mjs` writes the guard back with the line endings it read.

- [ ] **Step 2: Lower the file's budgets (the failing guard, `tests/form-migration-guards.test.ts`)**

Run: `node <temp>/p2c-budget.mjs notifications/notification-center-actions.tsx RAW_FIELDS=1:0 FIELD_CLASS_STRINGS=1:0`
Expected:
```
RAW_FIELDS: 1 -> 0
FIELD_CLASS_STRINGS: 1 -> 0
MIGRATED_FILES: added notifications/notification-center-actions.tsx
```
On `ABORT`, stop and report the lines it prints.

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL, `tests 23 · pass 21 · fail 2`. Each failing guard names only `src/components/notifications/notification-center-actions.tsx`:
- GF2 `1 > 0`
- GF3 `1 > 0`

- [ ] **Step 3: Append the failing test to `tests/notification-topbar-behavior.test.ts`**

The file reads the component without stripping `\r`; the new test strips it before its multi-line regexes. One exact replacement at the end of the file (`:43-44`):

Replace:

```ts
  assert.match(source, /catch\s*\{[\s\S]*toast\.error\(labels\.error\)/)
})
```

with:

```ts
  assert.match(source, /catch\s*\{[\s\S]*toast\.error\(labels\.error\)/)
})

// Phase 2C batch 4 (spec 2C §8.2 O17, §4.3 F4): the assignee select is the shared NativeSelect at the md size, the
// height of the buttons beside it, and it stays inside its one-line label.
test("the notification assignee select is the shared NativeSelect at the md size (2C batch 4)", () => {
  const source = centerActionsSource().replace(/\r\n/g, "\n")
  assert.match(source, /import \{ NativeSelect \} from "@\/components\/ui\/native-select"/)
  assert.match(source, /<label className="flex min-w-0 items-center gap-2 text-sm">[\s\S]*?<NativeSelect\n\s+fieldSize="md"\n\s+value=\{assignedToUserId\}\n\s+disabled=\{isPending\}/)
  assert.match(source, /className="min-w-44"\n\s+>[\s\S]*?<\/NativeSelect>\n\s+<\/label>/)
  assert.doesNotMatch(source, /<select\b|focus:border-ring/)
})
```

Run: `node --test tests/notification-topbar-behavior.test.ts`
Expected: FAIL, `tests 5 · pass 4 · fail 1`. The new test fails first on the `import { NativeSelect }` regex.

- [ ] **Step 4: Move the select onto `NativeSelect` (`src/components/notifications/notification-center-actions.tsx`)**

Two exact replacements.

(1) Imports (`:7-8`): `NativeSelect` comes in.

Replace:

```tsx
import { toast } from "sonner"
import {
  isPlainPrimaryClick,
```

with:

```tsx
import { toast } from "sonner"
import { NativeSelect } from "@/components/ui/native-select"
import {
  isPlainPrimaryClick,
```

(2) The select (`:119-135`). Every attribute keeps its place; `fieldSize="md"` comes first and only `min-w-44` stays of the class string.

Replace:

```tsx
        <select
          value={assignedToUserId}
          disabled={isPending}
          onChange={(event) => {
            const value = event.target.value
            setAssignedToUserId(value)
            mutate({ action: "assign", assignedToUserId: value || null })
          }}
          className="h-9 min-w-44 rounded-md border border-input bg-surface px-3 text-sm outline-none focus:border-ring"
        >
          <option value="">{labels.unassigned}</option>
          {assignees.map((assignee) => (
            <option key={assignee.id} value={assignee.id}>
              {assignee.label}
            </option>
          ))}
        </select>
```

with:

```tsx
        <NativeSelect
          fieldSize="md"
          value={assignedToUserId}
          disabled={isPending}
          onChange={(event) => {
            const value = event.target.value
            setAssignedToUserId(value)
            mutate({ action: "assign", assignedToUserId: value || null })
          }}
          className="min-w-44"
        >
          <option value="">{labels.unassigned}</option>
          {assignees.map((assignee) => (
            <option key={assignee.id} value={assignee.id}>
              {assignee.label}
            </option>
          ))}
        </NativeSelect>
```

Check: `grep -n "<select\|focus:\|NativeSelect" src/components/notifications/notification-center-actions.tsx` prints 3 lines: `8:` (the import), `120:` (`<NativeSelect`) and `137:` (`</NativeSelect>`).

- [ ] **Step 5: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/notification-topbar-behavior.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: PASS, `tests 75 · pass 75 · fail 0` (`tests/form-migration-guards.test.ts` 23 tests, `tests/notification-topbar-behavior.test.ts` 5).

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, 1 test more than after Task 5: 1957 tests, 1956 pass, 1 skipped.
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- `git diff --stat` shows exactly 3 files: `src/components/notifications/notification-center-actions.tsx` with 5 insertions and 3 deletions, `tests/notification-topbar-behavior.test.ts` with 10 insertions, and `tests/form-migration-guards.test.ts` with 1 insertion and 2 deletions.
- `git status` lists the same 3 files and nothing else.
- A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).

- [ ] **Step 7: Commit**

```bash
git add src/components/notifications/notification-center-actions.tsx tests/notification-topbar-behavior.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): notification assignee select on NativeSelect md (2C batch 4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the plan 4 dev-app check (Task 19, `/th/notifications` at 375, 768 and 1440):**
- the assignee select is 36px from 768 (level with "อ่านแล้ว" or "ยังไม่อ่าน" and "เลื่อน 1 วัน"), 44px with 16px text at 375, where it fills the row after "ผู้รับผิดชอบ"; the arrow does not cover a long name at 176px
- open the select and close it with Esc; never pick an assignee (that sends a PATCH)
- clicking "ผู้รับผิดชอบ" focuses the select; forced colors show the system arrow and the focus outline

---

### Task 7: Batch 4 · `reports/report-preset-controls.tsx` (the preset name on `Field` + `Input`)

Spec §8.9 "ชุด 4" row `report-preset-controls.tsx` (1 field), with §4.3 F1, F2, F4 and F6, §4.14 note "4" (`:72` → `<Field label={labels.presetName} className="min-w-0 flex-1">`), §4.6 (default `lg`), §4.7 (K4: `maxLength` stays), §9.4 (the row) and §10.3 "plan 4". Line numbers are recounted at `c2bfbe2` and equal the spec's: the `<label>` `:70`, its span `:71`, the `<input>` `:72`, its class string `:79`, the device-only line `:91`. One file, one commit (I30). The file is CRLF; edit it with exact-string replacement only.

Rulings this task applies:
- **F4, §4.14 note "4":** the `<label>` with its span becomes `Field label={labels.presetName} className="min-w-0 flex-1"`, so the field keeps its share of the row beside the save button.
- **K4, GF5:** the `Input` keeps `maxLength={60}` (`CONSTRAINT_FLOORS` `[0, 1, 0]`). The field has no `required` (the name check stays the `presetNameRequired` message of `savePreset`), so no star (F5).
- **Ruling (this plan), the device-only line `:91`:** it matches F6's regex (it is the "hint" counted for this file in §4.14), but it explains where saved presets are kept and sits under the row of the field and the save button, not under the field (F6, second bullet). It stays a `<p>`: as a `hint` it would sit inside `Field`, and the `sm:items-end` row would push the save button down to the hint.
- **Ruling (this plan), the buttons:** the save button and the delete icon buttons are not in the 152 buttons of spec §6.3; they stay for 2D. From `md` the field and the save button are both 40px; between 640 and 767px the field is 44px and the button 40px (today the button is 44px and the field 40px below 640).
- **Ruling (this plan), the test:** the file has no UI test; one test is appended to `tests/report-presets.test.ts`, the file that tests the presets it saves.

What users will see (`/th/reports?view=catalog`, "ชุดตัวกรอง" panel):
- "ชื่อชุดตัวกรอง" is a 13px label over a white 2A field: 44px with 16px text on phones, 40px from `md`, with the teal focus ring and halo.
- Everything else in the panel looks as before.

Not in this task:
- the save and delete buttons, the presets list and its empty line (2D)
- the status line `role="status"` under the row (the V track)
- messages: no key changes
- no toast, message, `maxLength` or storage change (K4); do not run a formatter

**Files:**
- Modify: `src/components/reports/report-preset-controls.tsx` (CRLF, 2 replacements)
- Modify: `tests/report-presets.test.ts` (CRLF, 1 test appended)
- Modify: `tests/form-migration-guards.test.ts` (only through `p2c-budget.mjs`)

**Must keep passing without edits:**
- `tests/report-presets.test.ts:7-76` (the preset helpers and the reports page).
- `tests/report-controls-ui.test.ts`, `tests/reports-adaptive-ui.test.ts`, `tests/reports-localization.test.ts` (they read the reports page and views, not this file).

**Interfaces:**
- Consumes: 2A `Field` from `@/components/ui/field` (`label` first; `className` on its wrapper) and `Input` from `@/components/ui/input`; Task 6's `<temp>/p2c4-quotes-6-11.mjs`; Task 1's scripts.
- Produces: `reports/report-preset-controls.tsx` in `MIGRATED_FILES` (after Task 6's line), with no entry left in `RAW_FIELDS`, `FIELD_CLASS_STRINGS` or `OLD_MARKUP`; `CONSTRAINT_FLOORS` stays `[0, 1, 0]`.

| file | `RAW_FIELDS` | `FIELD_CLASS_STRINGS` | `OLD_MARKUP` | `CONSTRAINT_FLOORS` |
|---|---|---|---|---|
| `reports/report-preset-controls.tsx` | 1 → – | 1 → – | 1 → – | `[0, 1, 0]` unchanged |

`OLD_MARKUP` 1 = the label span `mb-1.5 block text-sm font-medium text-foreground` `:71`.

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `node --no-warnings <temp>/p2c4-precheck.mjs reports/report-preset-controls.tsx`, then `node <temp>/p2c4-quotes-6-11.mjs 7`
Expected:
- `git status` prints nothing.
- Task 1's precheck ends with `preconditions hold for reports/report-preset-controls.tsx`; its line for the file shows `CRLF`, `RAW_FIELDS 1/1`, `FIELD_CLASS_STRINGS 1/1`, `OLD_MARKUP 1/1` and `floors live 0/1/0`.
- `p2c4-quotes-6-11.mjs` prints:
```
ok      Tasks 1-6 are in MIGRATED_FILES
ok      reports/report-preset-controls.tsx is not in MIGRATED_FILES yet
ok      guard rows: RAW_FIELDS 1, FIELD_CLASS_STRINGS 1, OLD_MARKUP 1
ok      CONSTRAINT_FLOORS [0, 1, 0]
ok      not listed in BUSY_LABEL_SWAPS
ok      not listed in PENDING_FOOTER_PARTS
ok      quoted text: 5 snippets at their counts
ok      tests/report-presets.test.ts: 2 snippets at their counts
info    line endings of src/components/reports/report-preset-controls.tsx: CRLF
info    line endings of tests/report-presets.test.ts: CRLF
Task 7 preconditions hold
```
On any `MISSING` line, stop and report it.

- [ ] **Step 2: Lower the file's budgets (the failing guard, `tests/form-migration-guards.test.ts`)**

Run: `node <temp>/p2c-budget.mjs reports/report-preset-controls.tsx RAW_FIELDS=1:0 FIELD_CLASS_STRINGS=1:0 OLD_MARKUP=1:0`
Expected:
```
RAW_FIELDS: 1 -> 0
FIELD_CLASS_STRINGS: 1 -> 0
OLD_MARKUP: 1 -> 0
MIGRATED_FILES: added reports/report-preset-controls.tsx
```

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL, `tests 23 · pass 20 · fail 3`. Each failing guard names only `src/components/reports/report-preset-controls.tsx`: GF2 `1 > 0`, GF3 `1 > 0`, GF7 `1 > 0`.

- [ ] **Step 3: Append the failing test to `tests/report-presets.test.ts`**

One exact replacement at the end of the file (`:74-76`):

Replace:

```ts
  assert.equal(storedKey, "asset-system:report-presets:v1")
  assert.deepEqual(JSON.parse(storedValue), presets)
})
```

with:

```ts
  assert.equal(storedKey, "asset-system:report-presets:v1")
  assert.deepEqual(JSON.parse(storedValue), presets)
})

// Phase 2C batch 4 (spec 2C §4.14 note 4, §8.9): the preset name is a shared Field + Input that keeps its 60-character
// limit; the device-only line stays under the row of the field and the save button. The file is CRLF in the working tree.
test("the preset name uses the shared Field and Input and keeps its 60-character limit (2C batch 4)", () => {
  const source = readFileSync("src/components/reports/report-preset-controls.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /<Field label=\{labels\.presetName\} className="min-w-0 flex-1">\n\s+<Input\n\s+value=\{name\}/)
  assert.match(source, /maxLength=\{60\}\n\s+\/>\n\s+<\/Field>/)
  assert.doesNotMatch(source, /<label\b|<input\b|mb-1\.5 block text-sm font-medium|focus:border-ring/)
  assert.match(source, /<\/div>\n\s+<p className="mt-2 text-xs text-muted-foreground">\{labels\.savedPresetsDeviceOnly\}<\/p>/)
})
```

Run: `node --test tests/report-presets.test.ts`
Expected: FAIL, `tests 9 · pass 8 · fail 1`. The new test fails first on the `<Field label={labels.presetName}` regex.

- [ ] **Step 4: Move the preset name onto `Field` + `Input` (`src/components/reports/report-preset-controls.tsx`)**

Two exact replacements.

(1) Imports (`:5-6`).

Replace:

```tsx
import { BookmarkPlus, Trash2 } from "lucide-react"
import {
  buildReportPreset,
```

with:

```tsx
import { BookmarkPlus, Trash2 } from "lucide-react"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  buildReportPreset,
```

(2) The field (`:70-81`). `onChange` and `maxLength` keep their places; the look classes go.

Replace:

```tsx
        <label className="min-w-0 flex-1">
          <span className="mb-1.5 block text-sm font-medium text-foreground">{labels.presetName}</span>
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setMessage("")
            }}
            maxLength={60}
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </label>
```

with:

```tsx
        <Field label={labels.presetName} className="min-w-0 flex-1">
          <Input
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setMessage("")
            }}
            maxLength={60}
          />
        </Field>
```

Check: `grep -n "<label\|<input\|focus:border-ring\|maxLength" src/components/reports/report-preset-controls.tsx` prints 1 line: `79:` (`maxLength={60}` on the `Input`).

- [ ] **Step 5: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/report-presets.test.ts tests/report-controls-ui.test.ts tests/reports-adaptive-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: PASS, `tests 96 · pass 96 · fail 0` (`tests/form-migration-guards.test.ts` 23 tests, `tests/report-presets.test.ts` 9).

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, 1 test more than after Task 6: 1958 tests, 1957 pass, 1 skipped.
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- `git diff --stat` shows exactly 3 files: `src/components/reports/report-preset-controls.tsx` with 5 insertions and 5 deletions, `tests/report-presets.test.ts` with 10 insertions, and `tests/form-migration-guards.test.ts` with 1 insertion and 3 deletions.
- `git status` lists the same 3 files and nothing else.
- A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).

- [ ] **Step 7: Commit**

```bash
git add src/components/reports/report-preset-controls.tsx tests/report-presets.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): report preset name on the shared field (2C batch 4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the plan 4 dev-app check (Task 19, `/th/reports?view=catalog` at 375, 700 and 1440):**
- "ชื่อชุดตัวกรอง" is 13px above a white field, 44px with 16px text at 375 and 700, 40px at 1440 and level with "บันทึกตัวกรองปัจจุบัน"; at 700 the field is 4px taller than the button (recorded, buttons are 2D)
- clicking the label focuses the field; typing 61 characters stops at 60
- never press "บันทึกตัวกรองปัจจุบัน" or a delete button (the dev-app check writes nothing, not even browser storage)

---

### Task 8: Batch 4 · `auth/login-form.tsx` (`FieldLabel` + `Input`, `Notice` for the two boxes, a busy sign-in button)

Spec §8.9 "ชุด 4" row `auth/login-form.tsx`, with §4.3 F1, F2 and F4 (the login exception), §4.18 item 10 (`FieldLabel` + `Input`, no star), §6.3 #93 (`busy={loading}`, no `disabled`, `w-full`, no `aria-busy`, no label swap), §6.5.1, §6.5.2 (K13 `t("loggingIn")`), I35 (the two boxes become `Notice`), §9.4 (the row), §10.4 table A (`login-form-ui.test.ts:29`, `:30`) and §10.3 "plan 4". Line numbers are recounted at `c2bfbe2` and equal the spec's: the session box `:58-65`, the username label `:69` and input `:72`, the password label `:89` and input `:93`, the show-password button `:107`, the error box `:130`, the submit button `:135`, its spinner `:141` and label swap `:142`. One file, one commit (I30). The file is CRLF; edit it with exact-string replacement only.

Rulings this task applies:
- **§4.18 item 10, §4.3 F4:** `FieldLabel htmlFor="login-username"` / `"login-password"` + `Input`, not `Field`. `tests/login-form-ui.test.ts:13`, `:17` pin the literal `htmlFor` strings (spec §9 table D row 4 keeps them unedited); `Field` would write `htmlFor={controlId}`. The password field also has its button inside the same frame. Each pair sits in `<div className="grid gap-1.5">`, the gap `Field` uses. No star: both fields are required and the page has only these two.
- **K4, GF5:** both `Input`s keep `required` (`CONSTRAINT_FLOORS` `[2, 0, 0]`), `id`, `name`, `type`, `autoComplete`, `autoFocus` on the username and `ref={passwordRef}` on the password. The password keeps `pr-12` (F2) for the button.
- **Task text, the show-password button:** it stays as it is (its classes, `aria-label`, `aria-controls`, `aria-pressed`, `onPointerDown`, focus return). Its `sm:min-h-10 sm:min-w-10` still switch at `sm` while the field switches at `md`; `inset-y-0` stretches it to the field's height, so only its width differs between 640 and 767px (40 instead of 44).
- **#93, K13:** `Button type="submit" busy={loading} className="w-full"` with one label, `t("login")`. `busy` keeps focus on the button and swallows a second click or Enter (implicit submission clicks the submit button), which `disabled={loading}` did before. `aria-busy` comes from `Button`; `t("loggingIn")` is no longer read but the key stays (§6.5.2; `login-form-ui.test.ts:49`, `:52` pin it).
- **I35, `Notice`:** the session box becomes `<Notice tone="info" role="status" aria-live="polite">` and the error box `<Notice tone="danger" role="alert" aria-live="polite">`, each keeping its own live-region role (the task text names `role="alert"` for both; the session line was `role="status"` and stays so, it is not an error). `info` is an inline line with the tone's own `Info` icon and no fill (DESIGN.md Feedback); the `ShieldCheck` it used goes, and stays for the directory hint. `danger` is a box with the tone's icon and ink text.
- **Phase 3:** the login page frame (`src/app/[locale]/(auth)/login/page.tsx`, its card, `h1` and `h2`) is not touched; the directory hint row `:124-127` stays.

What users will see (`/th/login`):
- The two labels are 13px; the fields are white, 44px with 16px text on phones and 40px with 14px text from `md` (they switched at `sm` before), with the teal focus ring and halo.
- "เข้าสู่ระบบ" is the shared primary button, weight 500 (it was 600). While signing in it keeps its label, shows a spinner and keeps focus; it no longer fades or reads "กำลังเข้าสู่ระบบ...".
- After an expired session, the line above the form is an inline line with an info icon and grey text instead of a teal box.
- A failed sign-in shows a red box with the error icon and dark text instead of red text on a red fill.

Not in this task:
- the login page frame and the directory hint (phase 3)
- the show-password button (kept as it is)
- messages: no key changes (`auth.loggingIn` stays)
- no change to `handleSubmit`, the focus return to the password, clearing the password, or `router.replace(callbackUrl)` (K4); do not run a formatter

**Files:**
- Modify: `src/components/auth/login-form.tsx` (CRLF, 6 replacements)
- Modify: `tests/login-form-ui.test.ts` (CRLF: 1 replacement at `:29-30`, 1 test appended)
- Modify: `tests/form-migration-guards.test.ts` (only through `p2c-budget.mjs`)

**Must keep passing without edits:**
- `tests/login-form-ui.test.ts:13-20` (`htmlFor` and `id` of both fields, `name`, `autoComplete`), `:25-28` (`EyeOff`, `Eye`, the button's `aria-label` and `aria-pressed`), `:35-40` (`setPassword("")`, `passwordRef.current?.focus()`, `role="alert"`, `aria-live="polite"`, the username `onChange`, `router.replace(callbackUrl)`), `:47-52` (the keys, `loggingIn` included).
- `tests/login-page-ui.test.ts:15` (`<LoginForm callbackUrl={callbackUrl} sessionExpired={sessionExpired} />`) and `tests/permission-aware-navigation.test.ts:97` (`router.replace(callbackUrl)`).
- `tests/list-frame-guards.test.ts` (LH1 keeps the login page's `<h1>`, a page this task does not touch).

**Interfaces:**
- Consumes: 2A `FieldLabel` (`@/components/ui/field`), `Input` (`type` takes `showPassword ? "text" : "password"` without a cast, §4.3 F1), `Button` with `busy` (default `type="button"`, so the submit passes `type="submit"`), `Notice` (`tone` required; `role` and `aria-live` pass through to its `<div>`); Task 6's `<temp>/p2c4-quotes-6-11.mjs`; Task 1's scripts.
- Produces: `auth/login-form.tsx` in `MIGRATED_FILES` (after Task 7's line), with no entry left in `RAW_FIELDS`, `FIELD_CLASS_STRINGS`, `OLD_MARKUP` or `LOADER2`; its `BUSY_LABEL_SWAPS` row (`t("loggingIn")`) now checked by GB3; `CONSTRAINT_FLOORS` stays `[2, 0, 0]`.

| file | `RAW_FIELDS` | `FIELD_CLASS_STRINGS` | `OLD_MARKUP` | `LOADER2` | `BUSY_LABEL_SWAPS` | `CONSTRAINT_FLOORS` |
|---|---|---|---|---|---|---|
| `auth/login-form.tsx` | 2 → – | 2 → – | 2 → – | 1 → – | checked from now on | `[2, 0, 0]` unchanged |

`OLD_MARKUP` 2 = the two label classes `mb-1.5 block text-sm font-medium text-foreground` (`:69`, `:89`); `LOADER2` 1 = the submit spinner `:141`.

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `node --no-warnings <temp>/p2c4-precheck.mjs auth/login-form.tsx`, then `node <temp>/p2c4-quotes-6-11.mjs 8`
Expected:
- `git status` prints nothing.
- Task 1's precheck ends with `preconditions hold for auth/login-form.tsx`; its line for the file shows `CRLF`, `RAW_FIELDS 2/2`, `FIELD_CLASS_STRINGS 2/2`, `OLD_MARKUP 2/2`, `LOADER2 1/1` and `floors live 2/0/0`.
- `p2c4-quotes-6-11.mjs` prints:
```
ok      Tasks 1-7 are in MIGRATED_FILES
ok      auth/login-form.tsx is not in MIGRATED_FILES yet
ok      guard rows: RAW_FIELDS 2, FIELD_CLASS_STRINGS 2, OLD_MARKUP 2, LOADER2 1
ok      CONSTRAINT_FLOORS [2, 0, 0]
ok      listed in BUSY_LABEL_SWAPS
ok      not listed in PENDING_FOOTER_PARTS
ok      quoted text: 8 snippets at their counts
ok      tests/login-form-ui.test.ts: 3 snippets at their counts
info    line endings of src/components/auth/login-form.tsx: CRLF
info    line endings of tests/login-form-ui.test.ts: CRLF
Task 8 preconditions hold
```
On any `MISSING` line, stop and report it.

- [ ] **Step 2: Lower the file's budgets (the failing guard, `tests/form-migration-guards.test.ts`)**

Run: `node <temp>/p2c-budget.mjs auth/login-form.tsx RAW_FIELDS=2:0 FIELD_CLASS_STRINGS=2:0 OLD_MARKUP=2:0 LOADER2=1:0`
Expected:
```
RAW_FIELDS: 2 -> 0
FIELD_CLASS_STRINGS: 2 -> 0
OLD_MARKUP: 2 -> 0
LOADER2: 1 -> 0
MIGRATED_FILES: added auth/login-form.tsx
```

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL, `tests 23 · pass 18 · fail 5`. Each failing guard names only `src/components/auth/login-form.tsx`:
- GF2 `2 > 0`
- GF3 `2 > 0`
- GF7 `2 > 0`
- GB1 `1 > 0`
- GB3 `/t\("loggingIn"\)/` (the file is migrated now, so the label swap counts)

GF4, GF8 and GB2 already pass on the file: it has no `Field`, its labels hold only text, and the spinner sits inside the submit `<button>`.

- [ ] **Step 3: The failing pins in `tests/login-form-ui.test.ts`**

The file reads the component without stripping `\r`. The two edited pins have no `\n`; the appended test strips `\r` before its multi-line regexes. Two exact replacements.

(1) The busy pins (`:29-30`, spec §10.4 table A).

Replace:

```ts
  assert.match(content, /aria-busy=\{loading\}/)
  assert.match(content, /loading \? t\("loggingIn"\) : t\("login"\)/)
```

with:

```ts
  assert.match(content, /<Button[\s\S]*?type="submit"[\s\S]*?busy=\{loading\}/)
  assert.doesNotMatch(content, /aria-busy=/)
  assert.match(content, /\{t\("login"\)\}/)
  assert.doesNotMatch(content, /t\("loggingIn"\)/)
```

(2) Append a test at the end of the file (`:52-53`).

Replace:

```ts
  assert.equal(english.auth.loggingIn, "Signing in...")
})
```

with:

```ts
  assert.equal(english.auth.loggingIn, "Signing in...")
})

// Phase 2C batch 4 (spec 2C §8.9, §4.18 item 10, §6.3 #93, I35): FieldLabel + Input (the first test pins the literal
// htmlFor strings, so not Field), both fields keep the browser's own required check, the two boxes are Notice with
// their live-region roles, and the submit button is busy with one label (K13).
test("login form uses the shared label, inputs, notices and a busy submit button (2C batch 4)", () => {
  const content = source().replace(/\r\n/g, "\n")
  assert.match(content, /<FieldLabel htmlFor="login-username">\{t\("username"\)\}<\/FieldLabel>\n\s+<Input\n\s+id="login-username"/)
  assert.match(content, /<FieldLabel htmlFor="login-password">\{t\("password"\)\}<\/FieldLabel>\n\s+<div className="relative">\n\s+<Input\n\s+ref=\{passwordRef\}/)
  assert.equal(content.match(/^\s+required$/gm)?.length, 2, "both fields keep native required")
  assert.match(content, /className="pr-12"\n\s+required\n\s+\/>\n\s+<button\n\s+type="button"\n\s+aria-label=\{showPassword/)
  assert.match(content, /<Notice tone="info" role="status" aria-live="polite">\n\s+\{t\("sessionExpired"\)\}\n\s+<\/Notice>/)
  assert.match(content, /<Notice tone="danger" role="alert" aria-live="polite">\n\s+\{error\}\n\s+<\/Notice>/)
  assert.match(content, /<Button type="submit" busy=\{loading\} className="w-full">\n\s+\{t\("login"\)\}\n\s+<\/Button>/)
  assert.doesNotMatch(content, /<input\b|<label\b|Loader2|bg-info-soft|bg-danger-soft|disabled=\{loading\}|mb-1\.5 block/)
})
```

Run: `node --test tests/login-form-ui.test.ts`
Expected: FAIL, `tests 5 · pass 3 · fail 2`. "login form provides accessible password visibility and submission states" fails on the `<Button[\s\S]*?type="submit"` regex, and the new test fails on its first `FieldLabel` regex.

- [ ] **Step 4: Move the login form onto the shared parts (`src/components/auth/login-form.tsx`)**

Make these 6 replacements.

(1) Imports (`:7`). `Loader2` goes (the `Button` spinner replaces it); `ShieldCheck` stays for the directory hint.

Replace:

```tsx
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react"
```

with:

```tsx
import { Eye, EyeOff, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Notice } from "@/components/ui/notice"
```

(2) The session line (`:57-66`).

Replace:

```tsx
      {sessionExpired ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-2 rounded-md bg-info-soft px-3 py-2.5 text-sm text-info"
        >
          <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t("sessionExpired")}</span>
        </div>
      ) : null}
```

with:

```tsx
      {sessionExpired ? (
        <Notice tone="info" role="status" aria-live="polite">
          {t("sessionExpired")}
        </Notice>
      ) : null}
```

(3) The username (`:68-86`). Every attribute keeps its place; the class string goes.

Replace:

```tsx
      <div>
        <label htmlFor="login-username" className="mb-1.5 block text-sm font-medium text-foreground">
          {t("username")}
        </label>
        <input
          id="login-username"
          name="username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) => {
            setUsername(event.target.value)
            setError("")
          }}
          className="h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20 sm:h-10 sm:text-sm"
          required
          autoFocus
        />
      </div>
```

with:

```tsx
      <div className="grid gap-1.5">
        <FieldLabel htmlFor="login-username">{t("username")}</FieldLabel>
        <Input
          id="login-username"
          name="username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) => {
            setUsername(event.target.value)
            setError("")
          }}
          required
          autoFocus
        />
      </div>
```

(4) The password (`:88-106`). Only `pr-12` stays of its class string; the show-password button after it is not touched.

Replace:

```tsx
      <div>
        <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-foreground">
          {t("password")}
        </label>
        <div className="relative">
          <input
            ref={passwordRef}
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setError("")
            }}
            className="h-11 w-full rounded-md border border-border bg-surface px-3 pr-12 text-base text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20 sm:h-10 sm:text-sm"
            required
          />
```

with:

```tsx
      <div className="grid gap-1.5">
        <FieldLabel htmlFor="login-password">{t("password")}</FieldLabel>
        <div className="relative">
          <Input
            ref={passwordRef}
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setError("")
            }}
            className="pr-12"
            required
          />
```

(5) The error box (`:129-133`).

Replace:

```tsx
      {error ? (
        <div role="alert" aria-live="polite" className="rounded-md bg-danger-soft px-3 py-2.5 text-sm text-danger">
          {error}
        </div>
      ) : null}
```

with:

```tsx
      {error ? (
        <Notice tone="danger" role="alert" aria-live="polite">
          {error}
        </Notice>
      ) : null}
```

(6) The submit button (#93, `:135-143`).

Replace:

```tsx
      <button
        type="submit"
        disabled={loading}
        aria-busy={loading}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 sm:h-10"
      >
        {loading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
        <span>{loading ? t("loggingIn") : t("login")}</span>
      </button>
```

with:

```tsx
      <Button type="submit" busy={loading} className="w-full">
        {t("login")}
      </Button>
```

Check: `grep -n "<input\|<label\|<button\|Loader2\|loggingIn\|disabled=\|aria-busy" src/components/auth/login-form.tsx` prints 1 line: `101:` (`<button`, the show-password button).

- [ ] **Step 5: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/login-form-ui.test.ts tests/login-page-ui.test.ts tests/permission-aware-navigation.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: PASS, `tests 83 · pass 83 · fail 0` (`tests/form-migration-guards.test.ts` 23 tests, `tests/login-form-ui.test.ts` 5).

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, 1 test more than after Task 7: 1959 tests, 1958 pass, 1 skipped.
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- `git diff --stat` shows exactly 3 files: `src/components/auth/login-form.tsx` with 20 insertions and 32 deletions, `tests/login-form-ui.test.ts` with 19 insertions and 2 deletions, and `tests/form-migration-guards.test.ts` with 1 insertion and 4 deletions.
- `git status` lists the same 3 files and nothing else.
- A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).

- [ ] **Step 7: Commit**

```bash
git add src/components/auth/login-form.tsx tests/login-form-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): login form on the shared label, inputs, notices and a busy sign-in button (2C batch 4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the plan 4 dev-app check (Task 19, `/th/login` in a fresh browser context, at 375, 700, 768 and 1440):**
- labels 13px; fields 44px with 16px text at 375 and 700, 40px with 14px text at 768 and 1440; the eye button stays inside the password field at every width, toggles `aria-pressed` and keeps focus in the field
- `/th/login?reason=session-expired`: the inline info line with its icon, grey text, no fill; NVDA reads it once
- press "เข้าสู่ระบบ" with both fields empty: the browser stops it on the username (native `required`) and no request is sent; never submit a password (the busy state and the error box are pinned by the tests; list "a failed sign-in shows the red box and keeps focus on the password" for a person)
- forced colors: both field borders and the focus outline; the button's focus ring

---

### Task 9: Batch 4 · `assets/asset-label-batch-tool.tsx` (the header on `PageHeader`, the search, dates and queue selects on the shared fields, six buttons on `Button`)

Spec §8.9 "ชุด 4" row `asset-label-batch-tool.tsx` (O19: fields and buttons of the whole file), with §4.3 F1, F2, F4 and F6, §4.5 (`QueueSelect`, 7 calls), §4.6 (four 44px fields go to 40px from `md`), §4.9 (the search: `Field` + `SearchField`, the `minChars` hint), §4.10 (the two dates, no `min`), §6.4.2 (the six buttons), §6.5.3 and I27 (the two status-line spinners stay with `motion-reduce:animate-none`), 2B spec I13 (the header moves onto `PageHeader` in this file's commit; DH "UI Round 4 Phase 2B Plan 1", "Handed on"), §9.4 (the row), §10.4 table A (`asset-label-print-ui.test.ts:155`) and §10.3 "plan 4". Line numbers are recounted at `c2bfbe2` and equal the spec's: header `:292-295`, search `:300-315` (input `:304`, hint `:313`), status spinners `:321`, `:469`, buttons `:373`, `:391`, `:493`, `:523`, `:532`, `:553`, the dates `:445-462`, the `ArrowDownAZ` icon `:520`, `QueueSelect` `:725-760` (its `<select>` `:746`). One file, one commit (I30). The file is CRLF; edit it with exact-string replacement only.

Rulings this task applies:
- **2B I13:** the title block becomes `<PageHeader title={labels.title} meta={labels.subtitle} />` (24px, weight 600; the subtitle in the 13px meta row). No `className`: the root's `space-y-5` gives the gap below it (the import/export page does the same with `space-y-6`).
- **§4.9:** the search `<label>` with its span, icon, `<input type="search">` and hint becomes `Field label={labels.searchLabel} hint={trimmedQuery.length < 2 ? labels.minChars : undefined}` around `SearchField` (same `value`, `onChange`, `placeholder`; `type="search"` by default). The hint is linked through `aria-describedby` and leaves when the query reaches 2 characters, as before. No `onClear`, no `loading` (the results box keeps its own status line).
- **§4.5:** `QueueSelect` keeps its name, props and 7 calls; inside, `Field` + `NativeSelect`, with the icon in the label: `label={icon ? <span className="inline-flex items-center gap-1">{icon}{label}</span> : label}`. The one icon passed (`ArrowDownAZ` `:520`) gets `aria-hidden="true"`.
- **§4.10, V track:** the two dates become `Field` + `Input type="date"`; no `min` (the V track adds `min={createdFrom}`).
- **§6.4.2:** `:373` `default` with `disabled={recentAssets.length === 0}` kept and its count-dependent label kept (not a busy swap) · `:391` `outline` · `:493` `outline` `mt-3 w-full` · `:523` `outline` and `:532` `default`, both with `disabled={selectedForPrint.length === 0}` kept and `w-full` · `:553` `outline` `icon-sm` (the neutral remove icon, K22) keeping `title` and `aria-label`. Icons lose their size classes (`Button` sizes them) and get `aria-hidden="true"`.
- **Departure (§6.4.2 `:373`):** the spec's className is `w-full shrink-0`; this task writes `w-full shrink-0 sm:w-auto`. The button sits in a `sm:flex-row` row beside the scope text; without `sm:w-auto` it would take the whole row from `sm` and squeeze the text to nothing.
- **I27, GB2:** the two status-line spinners (`:321`, `:469`) stay and get `motion-reduce:animate-none`; `LOADER2` stays 2 for them.
- **Not in §6.3:** the search-result and queue rows (`:329`, `:477`, list rows that add an asset), the dashed empty boxes and the queue scope box stay for 2D.
- **§4.16, §10.4 table A:** `tests/asset-label-print-ui.test.ts:155` reads this file (the batch tool), so its pin moves to the `hint=` expression in this task. The test file also gets one test for this file; Task 10 appends the print page's test after it.

What users will see (`/th/asset-management/labels`):
- The title is the shared page header (24px, weight 600, it was 700) with the subtitle as its 13px meta line.
- The search, the eight queue filters and the print-order select are white 2A fields with 13px labels: 44px with 16px text on phones, 40px from `md` (they were 44px everywhere); the selects get the shared arrow. The "พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหา" line under the search is the 13px hint, read with the field.
- The six buttons are the shared buttons: 40px from `md`, grey (not faded) when they cannot be pressed; the remove button beside each chosen asset is a neutral 32px outline icon on desktop.
- The two "กำลังค้นหา..." spinners stop for users who reduce motion.

Not in this task:
- the result and queue rows, the empty boxes, the scope box and `AssetLabelSearchResult` (2D)
- the page `src/app/[locale]/(dashboard)/asset-management/labels/page.tsx` (it passes the same `labels`)
- the print page (Task 10)
- messages: no key changes
- no `min` on the dates (V track); no change to searching, the queue request or printing; do not run a formatter

**Files:**
- Modify: `src/components/assets/asset-label-batch-tool.tsx` (CRLF, 12 replacements)
- Modify: `tests/asset-label-print-ui.test.ts` (CRLF: 1 replacement at `:155`, 1 test appended)
- Modify: `tests/form-migration-guards.test.ts` (through `p2c-budget.mjs`, then 1 exact replacement of the kept `LOADER2` row's comment)

**Must keep passing without edits:**
- `tests/asset-label-print-ui.test.ts:79-126` and `:156-181` (the batch tool's `queueFilters`, `selectedSort`, `labelPrint.count`, `printFirstLabel`, `loadMoreQueue`, `buildAssetLabelSubtitle`, `companyId?: string`, `filteredBranchOptions`, `updateQueueFilter("branchId", "all")`, `filteredLocationOptions`, `isLocationInScope`, `locationId: "all"`, no `p-6` box for `minChars`, `queueScopeSummary`, `getQueueScopeSummary`, `addFilteredQueue`, `addFilteredQueueUnavailable`).
- `tests/list-frame-guards.test.ts`: LH1 (this file's `<h1>` leaves: 1 → 0 under its row 1), LV1 (`printCount.toLocaleString()` stays, KEEP 1), LV2 (the six `"-"` stay, KEEP 6). Add no `<h1`, `"-"` or `toLocaleString()`.
- `tests/visual-foundation-guards.test.ts` (no new shadow, no `rounded-[`).

**Interfaces:**
- Consumes:
  - 2A: `Field` (`label` first, `hint`; it clones its one child with `id` and `aria-describedby`), `SearchField` (every prop but `className` goes to its `Input`), `Input`, `NativeSelect`, `Button` (default `type="button"`).
  - 2B-1: `PageHeader` from `@/components/ui/page-header` (`title`, `meta`).
  - Task 6's `<temp>/p2c4-quotes-6-11.mjs`; Task 1's scripts.
- Produces:
  - `assets/asset-label-batch-tool.tsx` in `MIGRATED_FILES` (after Task 8's line), with no entry left in `RAW_FIELDS`, `FIELD_CLASS_STRINGS` or `OLD_MARKUP`; `LOADER2` stays 2 with its comment naming the new lines.
  - `tests/asset-label-print-ui.test.ts` ending with this task's test, which Task 10 appends after.

| file | `RAW_FIELDS` | `FIELD_CLASS_STRINGS` | `OLD_MARKUP` | `LOADER2` | `CONSTRAINT_FLOORS` |
|---|---|---|---|---|---|
| `assets/asset-label-batch-tool.tsx` | 4 → – | 4 → – | 1 → – | 2 → 2 (comment: the new lines) | no row |

`RAW_FIELDS` 4 = the search input, the two dates and `QueueSelect`'s `<select>`; `FIELD_CLASS_STRINGS` 4 = their class strings; `OLD_MARKUP` 1 = the search label span `:301`; `LOADER2` 2 = the two status lines.

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `node --no-warnings <temp>/p2c4-precheck.mjs assets/asset-label-batch-tool.tsx`, then `node <temp>/p2c4-quotes-6-11.mjs 9`
Expected:
- `git status` prints nothing.
- Task 1's precheck ends with `preconditions hold for assets/asset-label-batch-tool.tsx`; its line for the file shows `CRLF`, `RAW_FIELDS 4/4`, `FIELD_CLASS_STRINGS 4/4`, `OLD_MARKUP 1/1`, `LOADER2 2/2` and `floors live 0/0/0`.
- `p2c4-quotes-6-11.mjs` prints:
```
ok      Tasks 1-8 are in MIGRATED_FILES
ok      assets/asset-label-batch-tool.tsx is not in MIGRATED_FILES yet
ok      guard rows: RAW_FIELDS 4, FIELD_CLASS_STRINGS 4, OLD_MARKUP 1, LOADER2 2
ok      CONSTRAINT_FLOORS none
ok      not listed in BUSY_LABEL_SWAPS
ok      not listed in PENDING_FOOTER_PARTS
ok      quoted text: 7 snippets at their counts
ok      tests/asset-label-print-ui.test.ts: 3 snippets at their counts
info    line endings of src/components/assets/asset-label-batch-tool.tsx: CRLF
info    line endings of tests/asset-label-print-ui.test.ts: CRLF
Task 9 preconditions hold
```
On any `MISSING` line, stop and report it.

- [ ] **Step 2: Lower the file's budgets (the failing guard, `tests/form-migration-guards.test.ts`)**

Run: `node <temp>/p2c-budget.mjs assets/asset-label-batch-tool.tsx RAW_FIELDS=4:0 FIELD_CLASS_STRINGS=4:0 OLD_MARKUP=1:0 LOADER2=2:2`
Expected (`LOADER2=2:2` is named because the row holds a number; it stays and prints nothing):
```
RAW_FIELDS: 4 -> 0
FIELD_CLASS_STRINGS: 4 -> 0
OLD_MARKUP: 1 -> 0
MIGRATED_FILES: added assets/asset-label-batch-tool.tsx
```

Then fix the comment of the kept `LOADER2` row (`:313` at `c2bfbe2`) with one exact replacement. The new lines are those of the two status spinners after Step 4.

Replace:

```ts
  [`${C}assets/asset-label-batch-tool.tsx`]: 2, // → 2: the status lines :321, :469
```

with:

```ts
  [`${C}assets/asset-label-batch-tool.tsx`]: 2, // the status lines :311, :446 (I27)
```

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL, `tests 23 · pass 19 · fail 4`. Each failing guard names only `src/components/assets/asset-label-batch-tool.tsx`:
- GF2 `4 > 0`
- GF3 `4 > 0`
- GF7 `1 > 0`
- GB2: the two spinners `:321` and `:469` (the file is migrated now; they sit outside a button without `motion-reduce:animate-none`)

- [ ] **Step 3: The failing pins in `tests/asset-label-print-ui.test.ts`**

The file reads its sources without stripping `\r`. The edited pin has no `\n`; the appended test strips `\r` before its multi-line regexes. Two exact replacements.

(1) The hint pin (`:155`, spec §10.4 table A). `:156` stays.

Replace:

```ts
  assert.match(source, /<p className="mt-2 text-xs text-muted-foreground">\{labels\.minChars\}<\/p>/)
```

with:

```ts
  assert.match(source, /hint=\{trimmedQuery\.length < 2 \? labels\.minChars : undefined\}/)
```

(2) Append a test at the end of the file (`:179-181`).

Replace:

```ts
    assert.equal(typeof messages.addFilteredQueueUnavailable, "string")
  }
})
```

with:

```ts
    assert.equal(typeof messages.addFilteredQueueUnavailable, "string")
  }
})

// Phase 2C batch 4 (spec 2C §8.9 O19, §4.5, §4.9, §6.4.2; 2B spec I13): the label batch tool's header, fields and
// buttons on the shared parts. The result and queue rows stay list buttons (2D); the two status-line spinners stay and
// stop for users who reduce motion (I27).
test("the label batch tool uses PageHeader, shared fields and Button (2C batch 4)", () => {
  const source = readFileSync("src/components/assets/asset-label-batch-tool.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /<PageHeader title=\{labels\.title\} meta=\{labels\.subtitle\} \/>/)
  assert.match(source, /<Field label=\{labels\.searchLabel\} hint=\{trimmedQuery\.length < 2 \? labels\.minChars : undefined\}>\n\s+<SearchField value=\{query\} onChange=\{\(event\) => setQuery\(event\.target\.value\)\} placeholder=\{labels\.searchPlaceholder\} \/>\n\s+<\/Field>/)
  assert.match(source, /<Field label=\{icon \? <span className="inline-flex items-center gap-1">\{icon\}\{label\}<\/span> : label\}>\n\s+<NativeSelect value=\{value\} onChange=\{\(event\) => onChange\(event\.target\.value\)\}>/)
  assert.equal(source.match(/<Field label=\{labels\.queueFilterCreated(?:From|To)\}>\n\s+<Input\n\s+type="date"/g)?.length, 2)
  assert.match(source, /icon=\{<ArrowDownAZ aria-hidden="true" className="h-4 w-4 text-primary" \/>\}/)
  assert.equal(source.match(/<Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" \/>/g)?.length, 2)
  assert.match(source, /<Button disabled=\{recentAssets\.length === 0\} onClick=\{addRecentAssets\} className="w-full shrink-0 sm:w-auto">/)
  assert.match(source, /<Button variant="outline" onClick=\{resetQueueFilters\}>/)
  assert.match(source, /<Button variant="outline" onClick=\{loadMoreQueue\} className="mt-3 w-full">/)
  assert.match(source, /<Button variant="outline" disabled=\{selectedForPrint\.length === 0\} onClick=\{printFirstLabel\} className="w-full">/)
  assert.match(source, /<Button disabled=\{selectedForPrint\.length === 0\} onClick=\{printLabels\} className="w-full">/)
  assert.match(source, /<Button\n\s+variant="outline"\n\s+size="icon-sm"\n\s+onClick=\{\(\) => removeAsset\(asset\.id\)\}\n\s+className="shrink-0"\n\s+title=\{labels\.remove\}\n\s+aria-label=\{labels\.remove\}/)
  assert.equal(source.match(/<button\b/g)?.length, 2, "only the result and queue rows stay list buttons (2D)")
  assert.doesNotMatch(source, /<h1\b|<select\b|<input\b|<label\b|mb-1\.5 block text-sm font-medium|focus:border-ring/)
})
```

Run: `node --test tests/asset-label-print-ui.test.ts`
Expected: FAIL, `tests 13 · pass 11 · fail 2`. "label search pre-query guidance stays compact under the input" fails on the `hint=` regex, and the new test fails on the `<PageHeader` regex.

- [ ] **Step 4: Move the batch tool onto the shared parts (`src/components/assets/asset-label-batch-tool.tsx`)**

Make these 12 replacements. Replacements (4) and (8), the two status spinners, differ only in their first line and indentation; copy them exactly.

(1) Imports (`:5`). `Search` goes (the `SearchField` draws its own icon); `Loader2` stays for the two status lines.

Replace:

```tsx
import { ArrowDownAZ, Clock3, Filter, Loader2, MapPin, Plus, Printer, RotateCcw, Search, X } from "lucide-react"
import { buildAssetLabelSubtitle } from "@/lib/asset-label-display"
```

with:

```tsx
import { ArrowDownAZ, Clock3, Filter, Loader2, MapPin, Plus, Printer, RotateCcw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { PageHeader } from "@/components/ui/page-header"
import { SearchField } from "@/components/ui/search-field"
import { buildAssetLabelSubtitle } from "@/lib/asset-label-display"
```

(2) The header (`:292-295`, 2B I13).

Replace:

```tsx
      <div>
        <h1 className="break-words text-2xl font-bold text-foreground">{labels.title}</h1>
        <p className="mt-1 break-words text-sm text-muted-foreground">{labels.subtitle}</p>
      </div>
```

with:

```tsx
      <PageHeader title={labels.title} meta={labels.subtitle} />
```

(3) The search (`:300-315`, §4.9).

Replace:

```tsx
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">{labels.searchLabel}</span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={labels.searchPlaceholder}
                  className="h-11 w-full rounded-md border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                />
              </div>
              {trimmedQuery.length < 2 ? (
                <p className="mt-2 text-xs text-muted-foreground">{labels.minChars}</p>
              ) : null}
            </label>
```

with:

```tsx
            <Field label={labels.searchLabel} hint={trimmedQuery.length < 2 ? labels.minChars : undefined}>
              <SearchField value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.searchPlaceholder} />
            </Field>
```

(4) The search status spinner (`:319-321`, I27).

Replace:

```tsx
                {loading ? (
                  <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
```

with:

```tsx
                {loading ? (
                  <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
```

(5) "เพิ่มตามตัวกรอง" (`:373-381`, §6.4.2; the departure above keeps `sm:w-auto`).

Replace:

```tsx
                <button
                  type="button"
                  disabled={recentAssets.length === 0}
                  onClick={addRecentAssets}
                  className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-1 rounded-md bg-primary px-3 text-sm font-medium text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground sm:w-auto"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {recentAssets.length === 0 ? labels.addFilteredQueueUnavailable : labels.addFilteredQueue}
                </button>
```

with:

```tsx
                <Button disabled={recentAssets.length === 0} onClick={addRecentAssets} className="w-full shrink-0 sm:w-auto">
                  <Plus aria-hidden="true" />
                  {recentAssets.length === 0 ? labels.addFilteredQueueUnavailable : labels.addFilteredQueue}
                </Button>
```

(6) Reset the filters (`:391-398`).

Replace:

```tsx
                <button
                  type="button"
                  onClick={resetQueueFilters}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  {labels.resetQueueFilters}
                </button>
```

with:

```tsx
                <Button variant="outline" onClick={resetQueueFilters}>
                  <RotateCcw aria-hidden="true" />
                  {labels.resetQueueFilters}
                </Button>
```

(7) The two dates (`:445-462`, §4.10: no `min`).

Replace:

```tsx
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-foreground">{labels.queueFilterCreatedFrom}</span>
                  <input
                    type="date"
                    value={queueFilters.createdFrom}
                    onChange={(event) => updateQueueFilter("createdFrom", event.target.value)}
                    className="h-11 w-full rounded-md border border-border bg-surface px-3 outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-foreground">{labels.queueFilterCreatedTo}</span>
                  <input
                    type="date"
                    value={queueFilters.createdTo}
                    onChange={(event) => updateQueueFilter("createdTo", event.target.value)}
                    className="h-11 w-full rounded-md border border-border bg-surface px-3 outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                  />
                </label>
```

with:

```tsx
                <Field label={labels.queueFilterCreatedFrom}>
                  <Input
                    type="date"
                    value={queueFilters.createdFrom}
                    onChange={(event) => updateQueueFilter("createdFrom", event.target.value)}
                  />
                </Field>
                <Field label={labels.queueFilterCreatedTo}>
                  <Input
                    type="date"
                    value={queueFilters.createdTo}
                    onChange={(event) => updateQueueFilter("createdTo", event.target.value)}
                  />
                </Field>
```

(8) The queue status spinner (`:467-469`, I27).

Replace:

```tsx
              {queueLoading ? (
                <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
```

with:

```tsx
              {queueLoading ? (
                <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
```

(9) Load more (`:493-499`).

Replace:

```tsx
              <button
                type="button"
                onClick={loadMoreQueue}
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {labels.loadMoreQueue}
              </button>
```

with:

```tsx
              <Button variant="outline" onClick={loadMoreQueue} className="mt-3 w-full">
                {labels.loadMoreQueue}
              </Button>
```

(10) The print-order icon and the two print buttons (`:520-540`).

Replace:

```tsx
              icon={<ArrowDownAZ className="h-4 w-4 text-primary" />}
            />
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <button
                type="button"
                disabled={selectedForPrint.length === 0}
                onClick={printFirstLabel}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Printer className="h-4 w-4" />
                {labels.printFirstLabel}
              </button>
              <button
                type="button"
                disabled={selectedForPrint.length === 0}
                onClick={printLabels}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Printer className="h-4 w-4" />
                {labels.print}
              </button>
```

with:

```tsx
              icon={<ArrowDownAZ aria-hidden="true" className="h-4 w-4 text-primary" />}
            />
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <Button variant="outline" disabled={selectedForPrint.length === 0} onClick={printFirstLabel} className="w-full">
                <Printer aria-hidden="true" />
                {labels.printFirstLabel}
              </Button>
              <Button disabled={selectedForPrint.length === 0} onClick={printLabels} className="w-full">
                <Printer aria-hidden="true" />
                {labels.print}
              </Button>
```

(11) Remove a chosen asset (`:553-561`, K22: the neutral icon button).

Replace:

```tsx
                  <button
                    type="button"
                    onClick={() => removeAsset(asset.id)}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-danger hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-8 sm:w-8"
                    title={labels.remove}
                    aria-label={labels.remove}
                  >
                    <X className="h-4 w-4" />
                  </button>
```

with:

```tsx
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => removeAsset(asset.id)}
                    className="shrink-0"
                    title={labels.remove}
                    aria-label={labels.remove}
                  >
                    <X aria-hidden="true" />
                  </Button>
```

(12) `QueueSelect`'s inside (`:740-759`, §4.5). Its name, props and signature stay, so its 7 calls do not change.

Replace:

```tsx
  return (
    <label className="block text-sm">
      <span className="mb-1 flex items-center gap-1 font-medium text-foreground">
        {icon}
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border border-border bg-surface px-3 outline-none focus:border-ring focus:ring-1 focus:ring-ring"
      >
        {allLabel ? <option value="all">{allLabel}</option> : null}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
```

with:

```tsx
  return (
    <Field label={icon ? <span className="inline-flex items-center gap-1">{icon}{label}</span> : label}>
      <NativeSelect value={value} onChange={(event) => onChange(event.target.value)}>
        {allLabel ? <option value="all">{allLabel}</option> : null}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </Field>
  )
```

Check: `grep -n "<button\|<input\|<select\|<label\|<h1\|Loader2" src/components/assets/asset-label-batch-tool.tsx` prints 5 lines: `5:` (the `lucide-react` import), `311:` and `446:` (the two status spinners), `319:` and `454:` (`<button`, the result and queue rows).

- [ ] **Step 5: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/asset-label-print-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: PASS, `tests 83 · pass 83 · fail 0` (`tests/form-migration-guards.test.ts` 23 tests, `tests/asset-label-print-ui.test.ts` 13).

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, 1 test more than after Task 8: 1960 tests, 1959 pass, 1 skipped.
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- `git diff --stat` shows exactly 3 files: `src/components/assets/asset-label-batch-tool.tsx` with 44 insertions and 88 deletions, `tests/asset-label-print-ui.test.ts` with 22 insertions and 1 deletion, and `tests/form-migration-guards.test.ts` with 2 insertions and 4 deletions.
- `git status` lists the same 3 files and nothing else.
- A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).

- [ ] **Step 7: Commit**

```bash
git add src/components/assets/asset-label-batch-tool.tsx tests/asset-label-print-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): label batch tool on PageHeader, the shared fields and Button (2C batch 4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the plan 4 dev-app check (Task 19, `/th/asset-management/labels` at 375, 768, 1280 and 1440):**
- the header is 24px / 600 with the subtitle in the 13px meta row; nothing above it moved
- the search shows the 13px hint until 2 characters and hides it from 2; NVDA reads the hint with the field; 2 characters list results; the search icon sits inside the field
- the eight queue filters and the print-order select: 44px with 16px text at 375, 40px from 768, labels 13px, the print-order label keeps its icon; the two dates 40px on desktop
- "เพิ่มตามตัวกรอง" sits beside the scope text from 640 (it does not fill the row) and is grey, reading "ไม่มีรายการในขอบเขตนี้", when the queue is empty; reset, load more, the two print buttons (grey with nothing chosen) and the remove icon (44px at 375, 32px at 1440) are the shared buttons
- with reduced motion the "กำลังค้นหา..." spinners do not turn
- choose two assets from the queue and remove one: the remove button keeps its name ("เอาออกจากรายการ"); never press a print button

---

### Task 10: Batch 4 · `assets/asset-label-print.tsx` (the print toolbar keeps its boxed fields with the field colors and a focus ring, K21; a busy print button)

Spec §8.9 "ชุด 4" row `asset-label-print.tsx` (O19, K21: the toolbar keeps its look plus `focus-within:`), with §4.3 F4 (the one-line `<label>` exception), §4.9 row `asset-label-print.tsx:225`, `:236`, §4.18 item 9, §6.4.2 `:254` (`default`, `busy={recordingPrint}`, no `disabled`, `w-full sm:w-auto`, no label swap `:261`), §6.5.2, §9.4 (the row: `RAW_FIELDS` 2 stays), 2B spec I13 ("หน้าพิมพ์คง 700": the print heading stays 700) and §10.3 "plan 4". Line numbers are recounted at `c2bfbe2` and equal the spec's: the reason box `:223` (its input `:225`), the tape box `:234` (its select `:236`), the print button `:254`, its spinner `:260` and label swap `:261`, the heading `:301`. One file, one commit (I30). The file is CRLF; edit it with exact-string replacement only.

Rulings this task applies:
- **K21, §4.9, §4.18 item 9:** both boxed labels keep their shape (label text and control inside one framed box) and get the field colors: `border-border bg-background` → `border-input bg-surface`, `text-sm` → `text-base … md:text-sm` (16px below `md`, so iOS does not zoom), and the field's focus look on the box: `focus-within:border-ring focus-within:ring-1 focus-within:ring-ring focus-within:shadow-field-focus`. The height switch moves from `sm:h-10` to `md:h-10`; the other `sm:` layout classes stay. The `<input>` and `<select>` inside keep `min-w-0 flex-1 bg-transparent outline-none` (`RAW_FIELDS` 2 stays, §9.4) and `maxLength={500}` (`CONSTRAINT_FLOORS` `[0, 1, 0]`). In forced-colors mode the inner control shows the base focus outline (`globals.css`), as today.
- **Departure (§4.9):** the spec writes `md:h-10` only; this task writes `md:h-10 md:min-h-0`. Beside `min-h-11` a height of 40px never applies (the larger `min-height` wins), which is why today's `sm:h-10` boxes are 44px on desktop next to the 40px button. `md:min-h-0` makes the boxes 40px from `md`, the height of the print `Button` and of the fields, as §4.18 item 9 intends.
- **§6.4.2, K13:** the print button is `Button busy={recordingPrint} className="w-full sm:w-auto"` with the `Printer` icon and one label, `translations.print`. `handlePrint` already returns early while recording; `busy` keeps focus on the button. `translations.recordingPrint` is no longer read; the prop stays in the type (§6.5.2).
- **Task text, "the hint → FieldHint":** this file has no field hint. The hint of spec §8.9 (`:313` → `FieldHint`, pinned by `asset-label-print-ui.test.ts:155`) is the `minChars` line of the batch tool, which Task 9 moved (the test file is named after this page but `:155` reads the batch tool).
- **2B I13:** the print heading `<h1 className="text-2xl font-bold">` stays 700 (print page; LFG LH1 KEEP 1).
- **Not in §6.3 or I35:** the back link (LFG LB1 KEEP: print page), the tape guidance and QR target boxes, the recorded and failed lines, and the label sheet stay for 2D.

What users will see (the print view `/th/assets/labels?id=…`):
- The "หมายเหตุ" and "ขนาดเทป" boxes are white with the field border; when the reason field or the tape select has focus, the whole box gets the teal border, ring and halo (today only a cursor shows). On phones their text is 16px; from `md` they are 40px tall (they were 44px).
- "พิมพ์ป้าย" is the shared primary button. While the print is being recorded it keeps its label, shows a spinner in place of the printer icon and keeps focus; it no longer fades or reads "กำลังบันทึก...".
- The printed labels and the print heading do not change.

Not in this task:
- the back link, the guidance boxes, the recorded and failed lines, the sheet and `AssetLabelItem` (2D)
- the two print pages `src/app/[locale]/(print)/assets/labels/page.tsx` and `…/[id]/label/page.tsx` (they pass the same `translations`)
- messages: no key changes (`recordingPrint` stays)
- no change to recording, `window.print()`, the tape sizes or the label templates; do not run a formatter

**Files:**
- Modify: `src/components/assets/asset-label-print.tsx` (CRLF, 4 replacements)
- Modify: `tests/asset-label-print-ui.test.ts` (CRLF, 1 test appended after Task 9's)
- Modify: `tests/form-migration-guards.test.ts` (through `p2c-budget.mjs`, then 1 exact replacement of the kept `RAW_FIELDS` row's comment)

**Must keep passing without edits:**
- `tests/asset-label-print-ui.test.ts:5-20` (`isLikelyLocalAssetQrValue`, `qrLocalWarning`, `qrPrintTarget`, `print-color-adjust: exact`, `text-black`, `secondaryClass` … `font-black`, no `text-slate-600|700`) and `:22-30` (the two print pages).
- `tests/asset-label-print-tracking.test.ts` and `tests/asset-label-template.test.ts`.
- `tests/visual-foundation-guards.test.ts:172-178` (the thermal label keeps its `text-[…px]` sizes), `:284` (R2: the sheet's `shadow-sm` is this file's one shadow; `shadow-field-focus` is not a surface shadow), `:313-314` (R3).
- `tests/list-frame-guards.test.ts`: LH1 and LB1 keep this file's `<h1>` and `ArrowLeft` (KEEP 1 each).

**Interfaces:**
- Consumes: 2A `Button` with `busy`; the `shadow-field-focus` utility (`--shadow-field-focus`, `globals.css:142`, already used by `fieldControlVariants`); Task 9's appended test; Task 6's `<temp>/p2c4-quotes-6-11.mjs`; Task 1's scripts.
- Produces: `assets/asset-label-print.tsx` in `MIGRATED_FILES` (after Task 9's line), with `RAW_FIELDS` 2 kept (its comment naming the new lines), no `LOADER2` entry, its `BUSY_LABEL_SWAPS` row (`translations.recordingPrint`) now checked by GB3, and `CONSTRAINT_FLOORS` `[0, 1, 0]` unchanged.

| file | `RAW_FIELDS` | `LOADER2` | `BUSY_LABEL_SWAPS` | `CONSTRAINT_FLOORS` |
|---|---|---|---|---|
| `assets/asset-label-print.tsx` | 2 → 2 (K21; comment: the new lines) | 1 → – | checked from now on | `[0, 1, 0]` unchanged |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `node --no-warnings <temp>/p2c4-precheck.mjs assets/asset-label-print.tsx`, then `node <temp>/p2c4-quotes-6-11.mjs 10`
Expected:
- `git status` prints nothing.
- Task 1's precheck ends with `preconditions hold for assets/asset-label-print.tsx`; its line for the file shows `CRLF`, `RAW_FIELDS 2/2`, `LOADER2 1/1` and `floors live 0/1/0`.
- `p2c4-quotes-6-11.mjs` prints:
```
ok      Tasks 1-9 are in MIGRATED_FILES
ok      assets/asset-label-print.tsx is not in MIGRATED_FILES yet
ok      guard rows: RAW_FIELDS 2, LOADER2 1
ok      CONSTRAINT_FLOORS [0, 1, 0]
ok      listed in BUSY_LABEL_SWAPS
ok      not listed in PENDING_FOOTER_PARTS
ok      quoted text: 6 snippets at their counts
ok      tests/asset-label-print-ui.test.ts: 2 snippets at their counts
info    line endings of src/components/assets/asset-label-print.tsx: CRLF
info    line endings of tests/asset-label-print-ui.test.ts: CRLF
Task 10 preconditions hold
```
On any `MISSING` line, stop and report it.

- [ ] **Step 2: Lower the file's budgets (the failing guard, `tests/form-migration-guards.test.ts`)**

Run: `node <temp>/p2c-budget.mjs assets/asset-label-print.tsx RAW_FIELDS=2:2 LOADER2=1:0`
Expected (`RAW_FIELDS=2:2` is named because the row holds a number; it stays and prints nothing):
```
LOADER2: 1 -> 0
MIGRATED_FILES: added assets/asset-label-print.tsx
```

Then fix the comment of the kept `RAW_FIELDS` row (`:182` at `c2bfbe2`) with one exact replacement. The new lines are those of the input and the select after Step 4.

Replace:

```ts
  [`${C}assets/asset-label-print.tsx`]: 2, // → 2: the toolbar :225, :236 (K21)
```

with:

```ts
  [`${C}assets/asset-label-print.tsx`]: 2, // the print toolbar's boxed fields :226, :237 (K21)
```

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL, `tests 23 · pass 21 · fail 2`. Each failing guard names only `src/components/assets/asset-label-print.tsx`:
- GB1 `1 > 0`
- GB3 `/translations\.recordingPrint\b/` (the file is migrated now, so the label swap counts)

GF8 and GB2 already pass on the file: its two `<label>`s wrap only an `<input>` or a `<select>` (allowed), and the spinner sits inside the print `<button>`.

- [ ] **Step 3: Append the failing test to `tests/asset-label-print-ui.test.ts`**

One exact replacement at the end of the file: the last two lines of Task 9's test.

Replace:

```ts
  assert.doesNotMatch(source, /<h1\b|<select\b|<input\b|<label\b|mb-1\.5 block text-sm font-medium|focus:border-ring/)
})
```

with:

```ts
  assert.doesNotMatch(source, /<h1\b|<select\b|<input\b|<label\b|mb-1\.5 block text-sm font-medium|focus:border-ring/)
})

// Phase 2C batch 4 (spec 2C §4.9 K21, §4.18 item 9, §6.4.2, K13): the print toolbar keeps its boxed labels with the
// field colors, 16px text below md, 40px from md and the field focus look on the box; the print button is busy with
// one label; the print heading stays 700 (2B spec I13).
test("the label print toolbar keeps its boxed fields with a focus ring and a busy print button (2C batch 4)", () => {
  const source = readFileSync("src/components/assets/asset-label-print.tsx", "utf8").replace(/\r\n/g, "\n")
  const boxes = [...source.matchAll(/<label className="([^"]+)">/g)].map((match) => match[1])
  assert.equal(boxes.length, 2)
  for (const box of boxes) {
    assert.match(box, /\bborder-input bg-surface\b/, box)
    assert.match(box, /\btext-base\b.*\bmd:h-10 md:min-h-0 md:text-sm focus-within:border-ring focus-within:ring-1 focus-within:ring-ring focus-within:shadow-field-focus$/, box)
    assert.doesNotMatch(box, /(?<![\w:-])(?:border-border|bg-background|text-sm)\b|\bsm:h-10\b/, box)
  }
  assert.equal(source.match(/className="min-w-0 flex-1 bg-transparent (?:font-medium )?outline-none/g)?.length, 2, "the controls inside the boxes stay bare")
  assert.match(source, /<Button onClick=\{handlePrint\} busy=\{recordingPrint\} className="w-full sm:w-auto">\n\s+<Printer aria-hidden="true" \/>\n\s+\{translations\.print\}\n\s+<\/Button>/)
  assert.doesNotMatch(source, /Loader2|translations\.recordingPrint|disabled=\{recordingPrint\}/)
  assert.match(source, /<h1 className="text-2xl font-bold">\{translations\.title\}<\/h1>/, "the print heading stays 700")
  assert.match(source, /maxLength=\{500\}/)
})
```

Run: `node --test tests/asset-label-print-ui.test.ts`
Expected: FAIL, `tests 14 · pass 13 · fail 1`. The new test fails first on `border-input bg-surface` in the first box.

- [ ] **Step 4: Move the toolbar boxes and the print button (`src/components/assets/asset-label-print.tsx`)**

Four exact replacements.

(1) Imports (`:5-6`). `Loader2` goes; `Button` comes in.

Replace:

```tsx
import { AlertTriangle, ArrowLeft, Info, Loader2, Printer } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
```

with:

```tsx
import { AlertTriangle, ArrowLeft, Info, Printer } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
```

(2) The reason box (`:223`). The input inside does not change.

Replace:

```tsx
            <label className="flex min-h-11 w-full min-w-0 flex-wrap items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm sm:h-10 sm:min-w-[240px] sm:flex-nowrap sm:py-0">
```

with:

```tsx
            <label className="flex min-h-11 w-full min-w-0 flex-wrap items-center gap-2 rounded-md border border-input bg-surface px-3 py-2 text-base sm:min-w-[240px] sm:flex-nowrap sm:py-0 md:h-10 md:min-h-0 md:text-sm focus-within:border-ring focus-within:ring-1 focus-within:ring-ring focus-within:shadow-field-focus">
```

(3) The tape box (`:234`). The select inside does not change.

Replace:

```tsx
            <label className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm sm:h-10 sm:w-auto">
```

with:

```tsx
            <label className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-surface px-3 text-base sm:w-auto md:h-10 md:min-h-0 md:text-sm focus-within:border-ring focus-within:ring-1 focus-within:ring-ring focus-within:shadow-field-focus">
```

(4) The print button (`:254-262`, K13).

Replace:

```tsx
            <button
              type="button"
              onClick={handlePrint}
              disabled={recordingPrint}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10 sm:w-auto"
            >
              {recordingPrint ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              {recordingPrint ? translations.recordingPrint : translations.print}
            </button>
```

with:

```tsx
            <Button onClick={handlePrint} busy={recordingPrint} className="w-full sm:w-auto">
              <Printer aria-hidden="true" />
              {translations.print}
            </Button>
```

Check: `grep -n "<input\|<select\|<button\|Loader2\|recordingPrint ?\|font-bold" src/components/assets/asset-label-print.tsx` prints 3 lines: `226:` (`<input`), `237:` (`<select`) and `297:` (the print heading).

- [ ] **Step 5: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/asset-label-print-ui.test.ts tests/asset-label-print-tracking.test.ts tests/asset-label-template.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: PASS, `tests 99 · pass 99 · fail 0` (`tests/form-migration-guards.test.ts` 23 tests, `tests/asset-label-print-ui.test.ts` 14).

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, 1 test more than after Task 9: 1961 tests, 1960 pass, 1 skipped.
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- `git diff --stat` shows exactly 3 files: `src/components/assets/asset-label-print.tsx` with 8 insertions and 12 deletions, `tests/asset-label-print-ui.test.ts` with 19 insertions, and `tests/form-migration-guards.test.ts` with 2 insertions and 2 deletions.
- `git status` lists the same 3 files and nothing else.
- A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).

- [ ] **Step 7: Commit**

```bash
git add src/components/assets/asset-label-print.tsx tests/asset-label-print-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): label print toolbar with field colors and focus ring, and a busy print button (2C batch 4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the plan 4 dev-app check (Task 19, the print view of one and of three assets, at 375, 768 and 1440):**
- both toolbar boxes: white with the field border; Tab into the reason field or the tape select gives the box the teal border, 1px ring and halo; 16px text and at least 44px at 375; 40px at 768 and 1440, level with "พิมพ์ป้าย"; at 375 the two boxes and the button keep the layout of the before images
- typing 501 characters into the reason stops at 500; changing the tape size redraws the preview (no request)
- the print heading is still 24px / 700; the print preview (Ctrl+P, then cancel) hides the toolbar and the heading as before
- never press "พิมพ์ป้าย" (it records a print); the busy look is pinned by the test and GB3
- forced colors: the box border and the inner control's focus outline

---

### Task 11: Batch 4 · `assets/asset-scan-search-tool.tsx` (the header on `PageHeader`, the query label through `Field`, the open button on `Button`)

Spec §8.9 "ชุด 4" row `asset-scan-search-tool.tsx` (O19), with §4.14 note "4" (`:115` → `<Field label={labels.queryLabel}>` around `ScannerTextInput id="asset-scan-query"`), §4.4 (a `ScannerTextInput` child takes `id` and `aria-*` from `Field`), §6.4.2 `:131` (`default`, `w-full sm:w-auto`), §6.5.3 and I27 (the status-line spinner `:146` stays with `motion-reduce:animate-none`), 2B spec I13 (the header moves onto `PageHeader` in this file's commit), §9.4 (the row), §10.4 table A (`asset-scan-search-tool.test.ts:43`) and §10.3 "plan 4". Line numbers are recounted at `c2bfbe2` and equal the spec's: header `:109-112`, label `:115`, `ScannerTextInput` `:118-126`, the open button `:131`, the status spinner `:146`. One file, one commit (I30). The file is CRLF; edit it with exact-string replacement only.

Rulings this task applies:
- **2B I13:** the title block becomes `<PageHeader title={labels.title} meta={labels.subtitle} />` (24px, weight 600; the subtitle in the 13px meta row).
- **§4.14 note "4", §4.4:** the hand-written `<label htmlFor="asset-scan-query">` becomes `Field label={labels.queryLabel}` around the same `ScannerTextInput`. `Field` keeps its child's `id="asset-scan-query"`, so the label still points at the text field and not at the camera button (`asset-scan-search-tool.test.ts:44-46`). No hint, no `required`.
- **§6.4.2:** "เปิดรายละเอียดทรัพย์สิน" is `Button className="w-full sm:w-auto"` with the `PackageSearch` icon.
- **I27, GB2:** the status-line spinner stays and gets `motion-reduce:animate-none`; `LOADER2` stays 1 for it.
- **Not in §6.3:** the result rows (`:157`, list buttons) and the dashed boxes stay for 2D.

What users will see (`/th/asset-management/scan`):
- The title is the shared page header (24px, weight 600, it was 700) with the subtitle as its 13px meta line.
- The label above the search is 13px (it was 14px); the field, the camera button and scanning do not change.
- When a scanned value points straight at an asset, "เปิดรายละเอียดทรัพย์สิน" is the shared primary button, 40px from `md`.
- The "กำลังค้นหา..." spinner stops for users who reduce motion.

Not in this task:
- `ScannerTextInput` itself (2C-0), the result rows, the dashed boxes (2D)
- the page `src/app/[locale]/(dashboard)/asset-management/scan/page.tsx` (it passes the same `labels`)
- messages: no key changes
- no change to the search request, the direct QR redirect or `returnTo`; do not run a formatter

**Files:**
- Modify: `src/components/assets/asset-scan-search-tool.tsx` (CRLF, 5 replacements)
- Modify: `tests/asset-scan-search-tool.test.ts` (CRLF: 1 replacement at `:43`, 1 test appended)
- Modify: `tests/form-migration-guards.test.ts` (through `p2c-budget.mjs`, then 1 exact replacement of the kept `LOADER2` row's comment)

**Must keep passing without edits:**
- `tests/asset-scan-search-tool.test.ts:8-12` (`directAssetHref`, `scanReturnHref`, `router.push(appendReturnTo(…))`, `onScanSuccess={handleScannedValue}`), `:44-46` (`<ScannerTextInput` … `id="asset-scan-query"`, no `<label className="block">` around it, no `inputClassName=`), `:47-50`.
- `tests/asset-scan-return-navigation.test.ts:13-15` and `tests/scanner-text-input.test.ts`.
- `tests/list-frame-guards.test.ts`: LH1 (this file's `<h1>` leaves: 1 → 0 under its row 1).

**Interfaces:**
- Consumes: 2A `Field` (it clones `ScannerTextInput` with its own `id` and any `aria-describedby`; `ScannerTextInput` passes `id` and `aria-*` to its `Input`), `Button`; 2B-1 `PageHeader`; Task 6's `<temp>/p2c4-quotes-6-11.mjs`; Task 1's scripts.
- Produces: `assets/asset-scan-search-tool.tsx` in `MIGRATED_FILES` (after Task 10's line, the last of Tasks 6–11), with no `OLD_MARKUP` entry and `LOADER2` 1 kept with its comment naming the new line.

| file | `OLD_MARKUP` | `LOADER2` | `CONSTRAINT_FLOORS` |
|---|---|---|---|
| `assets/asset-scan-search-tool.tsx` | 1 → – | 1 → 1 (comment: the new line) | no row |

`OLD_MARKUP` 1 = the label class `mb-1.5 block text-sm font-medium text-foreground` `:115`.

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `node --no-warnings <temp>/p2c4-precheck.mjs assets/asset-scan-search-tool.tsx`, then `node <temp>/p2c4-quotes-6-11.mjs 11`
Expected:
- `git status` prints nothing.
- Task 1's precheck ends with `preconditions hold for assets/asset-scan-search-tool.tsx`; its line for the file shows `CRLF`, `OLD_MARKUP 1/1`, `LOADER2 1/1` and `floors live 0/0/0`.
- `p2c4-quotes-6-11.mjs` prints:
```
ok      Tasks 1-10 are in MIGRATED_FILES
ok      assets/asset-scan-search-tool.tsx is not in MIGRATED_FILES yet
ok      guard rows: OLD_MARKUP 1, LOADER2 1
ok      CONSTRAINT_FLOORS none
ok      not listed in BUSY_LABEL_SWAPS
ok      not listed in PENDING_FOOTER_PARTS
ok      quoted text: 5 snippets at their counts
ok      tests/asset-scan-search-tool.test.ts: 3 snippets at their counts
info    line endings of src/components/assets/asset-scan-search-tool.tsx: CRLF
info    line endings of tests/asset-scan-search-tool.test.ts: CRLF
Task 11 preconditions hold
```
On any `MISSING` line, stop and report it.

- [ ] **Step 2: Lower the file's budgets (the failing guard, `tests/form-migration-guards.test.ts`)**

Run: `node <temp>/p2c-budget.mjs assets/asset-scan-search-tool.tsx OLD_MARKUP=1:0 LOADER2=1:1`
Expected (`LOADER2=1:1` is named because the row holds a number; it stays and prints nothing):
```
OLD_MARKUP: 1 -> 0
MIGRATED_FILES: added assets/asset-scan-search-tool.tsx
```

Then fix the comment of the kept `LOADER2` row (`:315` at `c2bfbe2`) with one exact replacement. The new line is that of the status spinner after Step 4.

Replace:

```ts
  [`${C}assets/asset-scan-search-tool.tsx`]: 1, // → 1: the status line :146
```

with:

```ts
  [`${C}assets/asset-scan-search-tool.tsx`]: 1, // the status line :141 (I27)
```

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL, `tests 23 · pass 21 · fail 2`. Each failing guard names only `src/components/assets/asset-scan-search-tool.tsx`:
- GF7 `1 > 0`
- GB2: the spinner `:146` (the file is migrated now; it sits outside a button without `motion-reduce:animate-none`)

- [ ] **Step 3: The failing pins in `tests/asset-scan-search-tool.test.ts`**

The file reads its sources without stripping `\r`. The edited pin uses `\s*` and `\s+`, which match `\r\n`; the appended test strips `\r` before its multi-line regexes. Two exact replacements.

(1) The label pin (`:43`, spec §10.4 table A). `:44-46` stay.

Replace:

```ts
  assert.match(tool, /<label[^>]+htmlFor="asset-scan-query"/)
```

with:

```ts
  assert.match(tool, /<Field label=\{labels\.queryLabel\}>\s*<ScannerTextInput\s+id="asset-scan-query"/)
```

(2) Append a test at the end of the file (`:49-51`).

Replace:

```ts
  assert.equal(en.assetTools.scanPlaceholder, "Search by Asset Tag, Serial Number, custodian, or location")
})
```

with:

```ts
  assert.equal(en.assetTools.scanPlaceholder, "Search by Asset Tag, Serial Number, custodian, or location")
})

// Phase 2C batch 4 (spec 2C §8.9 O19, §6.4.2; 2B spec I13): the scan tool's header is PageHeader, the open button is
// Button, the result rows stay list buttons (2D) and the status-line spinner stops for users who reduce motion (I27).
test("the asset scan tool uses PageHeader, Field and Button (2C batch 4)", () => {
  const tool = readFileSync("src/components/assets/asset-scan-search-tool.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(tool, /<PageHeader title=\{labels\.title\} meta=\{labels\.subtitle\} \/>/)
  assert.match(tool, /<Field label=\{labels\.queryLabel\}>\n\s+<ScannerTextInput\n\s+id="asset-scan-query"[\s\S]*?onScanSuccess=\{handleScannedValue\}\n\s+\/>\n\s+<\/Field>/)
  assert.match(tool, /<Button onClick=\{\(\) => openAsset\(directAssetHref\)\} className="w-full sm:w-auto">\n\s+<PackageSearch aria-hidden="true" \/>\n\s+\{labels\.openAsset\}\n\s+<\/Button>/)
  assert.match(tool, /<Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" \/>/)
  assert.equal(tool.match(/<button\b/g)?.length, 1, "only the result rows stay list buttons (2D)")
  assert.doesNotMatch(tool, /<h1\b|<label\b|mb-1\.5 block text-sm font-medium/)
})
```

Run: `node --test tests/asset-scan-search-tool.test.ts`
Expected: FAIL, `tests 4 · pass 2 · fail 2`. "asset scan page labels only the native input and uses asset-specific search copy" fails on the `<Field label={labels.queryLabel}>` regex, and the new test fails on the `<PageHeader` regex.

- [ ] **Step 4: Move the scan tool onto the shared parts (`src/components/assets/asset-scan-search-tool.tsx`)**

Five exact replacements.

(1) Imports (`:5-6`). `Search` stays (the result rows use it).

Replace:

```tsx
import { Loader2, MapPin, PackageSearch, Search } from "lucide-react"
import { ScannerTextInput } from "@/components/ui/scanner-text-input"
```

with:

```tsx
import { Loader2, MapPin, PackageSearch, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { PageHeader } from "@/components/ui/page-header"
import { ScannerTextInput } from "@/components/ui/scanner-text-input"
```

(2) The header (`:109-112`, 2B I13).

Replace:

```tsx
      <div className="min-w-0">
        <h1 className="break-words text-2xl font-bold text-foreground">{labels.title}</h1>
        <p className="mt-1 break-words text-sm text-muted-foreground">{labels.subtitle}</p>
      </div>
```

with:

```tsx
      <PageHeader title={labels.title} meta={labels.subtitle} />
```

(3) The query label and the scanner field (`:115-126`). The `ScannerTextInput` props do not change; they move one level in.

Replace:

```tsx
        <label htmlFor="asset-scan-query" className="mb-1.5 block text-sm font-medium text-foreground">
          {labels.queryLabel}
        </label>
        <ScannerTextInput
          id="asset-scan-query"
          value={query}
          onChange={setQuery}
          labels={labels.scanner}
          placeholder={labels.placeholder}
          scanMode="asset-qr"
          onScanSuccess={handleScannedValue}
        />
```

with:

```tsx
        <Field label={labels.queryLabel}>
          <ScannerTextInput
            id="asset-scan-query"
            value={query}
            onChange={setQuery}
            labels={labels.scanner}
            placeholder={labels.placeholder}
            scanMode="asset-qr"
            onScanSuccess={handleScannedValue}
          />
        </Field>
```

(4) "เปิดรายละเอียดทรัพย์สิน" (`:131-138`, §6.4.2).

Replace:

```tsx
          <button
            type="button"
            onClick={() => openAsset(directAssetHref)}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover sm:w-auto"
          >
            <PackageSearch className="h-4 w-4" />
            {labels.openAsset}
          </button>
```

with:

```tsx
          <Button onClick={() => openAsset(directAssetHref)} className="w-full sm:w-auto">
            <PackageSearch aria-hidden="true" />
            {labels.openAsset}
          </Button>
```

(5) The status spinner (`:146`, I27).

Replace:

```tsx
          <Loader2 className="h-4 w-4 animate-spin" />
```

with:

```tsx
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
```

Check: `grep -n "<label\|<h1\|<button\|Loader2" src/components/assets/asset-scan-search-tool.tsx` prints 3 lines: `5:` (the `lucide-react` import), `141:` (the status spinner) and `152:` (`<button`, the result rows).

- [ ] **Step 5: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/asset-scan-search-tool.test.ts tests/asset-scan-return-navigation.test.ts tests/scanner-text-input.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts`
Expected: PASS, `tests 94 · pass 94 · fail 0` (`tests/form-migration-guards.test.ts` 23 tests, `tests/asset-scan-search-tool.test.ts` 4).

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, 1 test more than after Task 10: 1962 tests, 1961 pass, 1 skipped.
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- `git diff --stat` shows exactly 3 files: `src/components/assets/asset-scan-search-tool.tsx` with 19 insertions and 24 deletions, `tests/asset-scan-search-tool.test.ts` with 13 insertions and 1 deletion, and `tests/form-migration-guards.test.ts` with 2 insertions and 2 deletions.
- `git status` lists the same 3 files and nothing else.
- A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).

- [ ] **Step 7: Commit**

```bash
git add src/components/assets/asset-scan-search-tool.tsx tests/asset-scan-search-tool.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): asset scan tool on PageHeader, the shared field label and Button (2C batch 4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the plan 4 dev-app check (Task 19, `/th/asset-management/scan` at 375, 768 and 1440):**
- the header is 24px / 600 with the subtitle in the 13px meta row
- the label "ค้นหาหรือสแกนรหัสทรัพย์สิน" is 13px; clicking it focuses the text field (not the camera button); the field and the camera button look as before; NVDA reads the label with the field
- typing 2 characters lists results; with reduced motion the spinner does not turn; a value that points straight at an asset still opens it with `returnTo` (the "เปิดรายละเอียดทรัพย์สิน" button shows only for a moment; its look is pinned by the test)
- do not open the camera unless the device allows it; nothing here writes

---

### Task 12: Batch 4 · `assets/asset-status-correction-button.tsx` (the trigger, the reason field and a busy submit on the shared parts)

Spec §8.9 "ชุด 4" row `assets/asset-status-correction-button.tsx` (trigger `:56`), with §6.3 #73–#74, §6.4.1 (the trigger row), §6.5.2 (`:96` `labels.submitting`), §4.3 (F1, F2, F4), §4.14 (1 textarea), §4 ruling 17 (the error line `:78` stays for the V track), §9.4 (the row) and §10.1 (K13). The line numbers at `c2bfbe2` equal the spec's. One file, one commit (I30). The file is CRLF; edit it with exact-string replacement only.

Rulings this task applies:
- **Not a dialog.** The correction opens an inline panel under its trigger (`:64-100`), so no dialog part applies. The panel box `:65`, its heading and its description stay (2D, K28). The button row `:79` already puts cancel first and is `flex-col` on phones and a right-aligned row from `sm` (K8), so it stays as it is.
- **§6.4.1, ruling ย17:** the trigger is `Button variant="outline"` (default size) with `<RotateCcw className="text-warning" aria-hidden="true" />`. Its orange tint (`bg-warning-soft text-warning`) goes; the icon keeps the warning hue. It gets no `aria-expanded` (the spec gives none; see "Not in this task").
- **§6.3 #73–#74, K13, GB4:** cancel is `Button variant="outline"` with its `onClick` unchanged. Submit is `Button busy={isSubmitting} disabled={reason.trim().length < 5}`: `isSubmitting` leaves `disabled`, so focus stays on the button while the correction saves, and the label stays `{labels.submit}` (no `labels.submitting` swap). `reason.trim().length < 5` stays verbatim (`tests/asset-operation-status-policy.test.ts:105`).
- **§4.3 F1, F2, F4:** the `<label htmlFor>` + `<textarea>` pair becomes `Field label={labels.reason} className="mt-3"` + `Textarea`. The textarea keeps `id="asset-status-correction-reason"` (Field uses its child's id), `value`, `onChange`, `placeholder` and `min-h-24`; `mt-1` and the look classes go. It has no `required` today, so no star (F5) and no GF5 floor.
- **K13 (§6.5.2):** `labels.submitting` stays in the props type and `D/assets/[id]/page.tsx` keeps passing it (no key and no prop is deleted; that page is 2B-4's).
- **Ruling (this plan), the test:** `tests/asset-operation-status-policy.test.ts` is read by both plans and edited by neither, so the new assertions go in a new file, `tests/asset-status-correction-ui.test.ts` (LF).

What users will see (asset detail `/assets/<id>`, an asset whose status can be corrected):
- "แก้ไขสถานะ" is a white button with a grey border and an orange icon (it was an orange-tinted button); 44px on phones, 40px from `md` (it was 44px everywhere).
- In the open panel the reason field has the 2A look: white, a 13px label, 44px tall with 16px text on phones.
- "เปลี่ยนกลับเป็นพร้อมใช้งาน" is grey (not faded blue) until the reason has 5 characters. While it saves it shows a spinner, keeps focus and keeps its label (it used to switch to "กำลังบันทึก...").

Not in this task:
- `D/assets/[id]/page.tsx` (2B-4) and its `labels`
- the panel box, heading and description (2D, K28); `aria-expanded` on the trigger (not in the spec; 2D may add it with the panel)
- the error line `:78` (V track, spec §4 ruling 17)
- messages: no key changes. No toast, `required`, `maxLength` or `disabled` gate changes (K4). Do not run a formatter.

**Files:**
- Modify: `src/components/assets/asset-status-correction-button.tsx` (CRLF, 4 replacements)
- Create: `tests/asset-status-correction-ui.test.ts` (LF)
- Modify: `tests/form-migration-guards.test.ts` (through `p2c-budget.mjs` only)

**Must keep passing without edits:**
- `tests/asset-operation-status-policy.test.ts:98-106`: the page renders `AssetStatusCorrectionButton` behind `canCorrectAssetStatus`; the component keeps `/api/assets/${assetId}/status-correction` and `reason.trim().length < 5`.

**Interfaces:**
- Consumes: Task 1's `<temp>/p2c4-precheck.mjs` and `<temp>/p2c-budget.mjs`; 2A `Button` (`busy`), `Field`, `Textarea`; Tasks 1–11 committed.
- Produces: `assets/asset-status-correction-button.tsx` is the last line of `MIGRATED_FILES` (55 files) with no budget entry; it was never in `PENDING_FOOTER_PARTS`. Its props are unchanged.

| file | `RAW_FIELDS` | `FIELD_CLASS_STRINGS` | `BUSY_LABEL_SWAPS` | `CONSTRAINT_FLOORS` |
|---|---|---|---|---|
| `assets/asset-status-correction-button.tsx` | 1 → – | 1 → – | `labels.submitting` (checked once migrated) | no row |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `git ls-files --eol src/components/assets/asset-status-correction-button.tsx tests/form-migration-guards.test.ts`, then `node --no-warnings <temp>/p2c4-precheck.mjs assets/asset-status-correction-button.tsx`
Expected: `git status` prints nothing; both files `i/lf w/crlf`. The precheck prints Task 1's shared checks, all `ok`, then:
```
ok      assets/asset-status-correction-button.tsx: not in MIGRATED_FILES yet
ok      assets/asset-status-correction-button.tsx: budgets at their c2bfbe2 row
ok      assets/asset-status-correction-button.tsx: CONSTRAINT_FLOORS no row
ok      assets/asset-status-correction-button.tsx: not in PENDING_FOOTER_PARTS, in BUSY_LABEL_SWAPS
ok      src/components/assets/asset-status-correction-button.tsx exists
info    tests/form-migration-guards.test.ts: CRLF
info    assets/asset-status-correction-button.tsx: CRLF · budget/live RAW_FIELDS 1/1 · FIELD_CLASS_STRINGS 1/1 · floors live 0/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0
preconditions hold for assets/asset-status-correction-button.tsx
```
(The five per-file lines follow Task 1's wording.) On any `MISSING` line, stop and report it.

- [ ] **Step 2: Lower the file's budgets (the failing guard)**

Run: `node --no-warnings <temp>/p2c-budget.mjs assets/asset-status-correction-button.tsx RAW_FIELDS=1:0 FIELD_CLASS_STRINGS=1:0`
Expected:
```
RAW_FIELDS: 1 -> 0
FIELD_CLASS_STRINGS: 1 -> 0
MIGRATED_FILES: added assets/asset-status-correction-button.tsx
```

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL, `tests 23 · pass 20 · fail 3`. Each failing guard names only `src/components/assets/asset-status-correction-button.tsx`:
- GF2 `1 > 0`
- GF3 `1 > 0`
- GB3 `/labels\.submitting\b/` (the file is migrated now, so its busy label swap counts)

- [ ] **Step 3: Write the failing test (`tests/asset-status-correction-ui.test.ts`, new, LF)**

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

// Phase 2C batch 4 (spec 2C §8.9 row asset-status-correction-button.tsx, §6.3 #73-#74, §6.4.1, §6.5.2, §4.3 F1-F4):
// the trigger is an outline Button with the warning icon (ย17), the reason is a shared field, and the submit button
// shows busy instead of turning disabled, so focus stays on it while the correction saves. Its label stays (K13).
test("the status correction uses Button, a shared reason field and a busy submit that keeps its label (2C batch 4)", () => {
  const source = read("src/components/assets/asset-status-correction-button.tsx")
  assert.match(source, /<Button variant="outline" onClick=\{\(\) => setOpen\(\(value\) => !value\)\}>\n\s+<RotateCcw className="text-warning" aria-hidden="true" \/>/)
  assert.match(source, /<Field label=\{labels\.reason\} className="mt-3">\n\s+<Textarea\n\s+id="asset-status-correction-reason"/)
  assert.match(source, /<Button\n\s+variant="outline"\n\s+onClick=\{\(\) => \{\n\s+setOpen\(false\)\n\s+setError\(null\)/)
  assert.match(source, /<Button busy=\{isSubmitting\} disabled=\{reason\.trim\(\)\.length < 5\} onClick=\{submitCorrection\}>\n\s+\{labels\.submit\}\n\s+<\/Button>/)
  assert.doesNotMatch(source, /<button\b|<textarea|<label\b|labels\.submitting|disabled:opacity|bg-warning-soft px-3/)
  // The error line stays as it is until the V track ties it to the field (spec 2C §4 ruling 17).
  assert.match(source, /\{error \? <p className="mt-2 text-sm text-danger"><ApiErrorText error=\{error\} \/><\/p> : null\}/)
})
```

Run: `node --test tests/asset-status-correction-ui.test.ts`
Expected: FAIL, `tests 1 · pass 0 · fail 1`, first on the `<Button variant="outline" onClick=…` regex.

- [ ] **Step 4: Move the trigger, the field and the two buttons onto the shared parts (`src/components/assets/asset-status-correction-button.tsx`)**

Four exact replacements.

(1) Imports (`:3-6`).

Replace:

```tsx
import { RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ApiErrorText } from "@/components/ui/api-error-text"
```

with:

```tsx
import { RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ApiErrorText } from "@/components/ui/api-error-text"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
```

(2) The trigger (`:56-63`).

Replace:

```tsx
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-sm font-medium text-warning transition-colors hover:bg-warning-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
        {labels.button}
      </button>
```

with:

```tsx
      <Button variant="outline" onClick={() => setOpen((value) => !value)}>
        <RotateCcw className="text-warning" aria-hidden="true" />
        {labels.button}
      </Button>
```

(3) The reason field (`:68-77`).

Replace:

```tsx
          <label className="mt-3 block text-sm font-medium text-foreground" htmlFor="asset-status-correction-reason">
            {labels.reason}
          </label>
          <textarea
            id="asset-status-correction-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={labels.reasonPlaceholder}
            className="mt-1 min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
```

with:

```tsx
          <Field label={labels.reason} className="mt-3">
            <Textarea
              id="asset-status-correction-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={labels.reasonPlaceholder}
              className="min-h-24"
            />
          </Field>
```

(4) Cancel and submit (`:80-97`).

Replace:

```tsx
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setError(null)
              }}
              className="min-h-11 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              {labels.cancel}
            </button>
            <button
              type="button"
              disabled={isSubmitting || reason.trim().length < 5}
              onClick={submitCorrection}
              className="min-h-11 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? labels.submitting : labels.submit}
            </button>
```

with:

```tsx
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false)
                setError(null)
              }}
            >
              {labels.cancel}
            </Button>
            <Button busy={isSubmitting} disabled={reason.trim().length < 5} onClick={submitCorrection}>
              {labels.submit}
            </Button>
```

Check: `grep -n "<textarea\|<label\|<button\|labels.submitting\|opacity" src/components/assets/asset-status-correction-button.tsx` prints nothing.

- [ ] **Step 5: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/asset-status-correction-ui.test.ts tests/asset-operation-status-policy.test.ts`
Expected: PASS, `tests 34 · pass 34 · fail 0` (23 + 1 + 10).

The per-file counts in Tasks 12–18 are each file's count at `c2bfbe2` plus the tests Tasks 12–18 append; Tasks 1–11 add none to the files named here (checked by running Tasks 1–18 in order on a copy of `c2bfbe2`). 0 fail is what must hold.

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected:
- `npm test`: 0 fail, 1 test more than after Task 11: 1963 tests, 1962 pass, 1 skipped.
- `npx tsc --noEmit`: no errors.
- `npm run lint`: 0 errors, and no new warning in `src/` or `tests/`.

Run: `git diff --stat` then `git status --short src tests messages`
Expected:
- `git diff --stat` shows 2 files: `src/components/assets/asset-status-correction-button.tsx` 21 insertions and 29 deletions, `tests/form-migration-guards.test.ts` 1 insertion and 2 deletions. `git status` also lists the untracked `tests/asset-status-correction-ui.test.ts` (19 lines) and nothing else.
- A file that shows every line changed was normalized: restore its line endings before you commit (never run a formatter).

- [ ] **Step 7: Commit**

```bash
git add src/components/assets/asset-status-correction-button.tsx tests/asset-status-correction-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): asset status correction on Button with a shared reason field and a busy submit (2C batch 4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit (`git show --stat HEAD`). `git status --short src tests messages` prints nothing.

**For the plan 4 dev-app check (Task 19):**
- An asset whose status can be corrected (Task 0 Step 7 id), `/th/assets/<id>` at 375 and 1440: "แก้ไขสถานะ" is outline with an orange icon (44px at 375, 40px at 1440); open the panel and type fewer than 5 characters: submit is grey; at 375 cancel sits above submit, full width; at 1440 they form a right-aligned row. Close with "ยกเลิก"; never submit.
- If the dev data has no such asset, record it for the person's checklist; the busy look is pinned by the new test and GB4.

---

### Task 13: Batch 4 · `assets/asset-evidence-drawer.tsx` (sheet chrome, the description and `EmptyNote`, O14)

Spec §8.9 "ชุด 4" row `assets/asset-evidence-drawer.tsx`, with §5.8 (the row `asset-evidence-drawer.tsx:70`: `closeLabel` `:72`, `aria-describedby={undefined}` `:73`, `bg-surface` in `:80`, the header class `:82`, the sub-line `:84`, the dashed empty box `:102`), §5.3 (the "sheet 4 จุด" row), O14, I10, I35, §5.11 table B row I and §9.4 (no row). The line numbers at `c2bfbe2` equal the spec's. One file, one commit (I30). The file is CRLF; edit it with exact-string replacement only.

Rulings this task applies:
- **§5.3, §5.8, I10:** the sheet already gives the X its "ปิด" name, the white fill, and the header and title look (2C-0). The drawer stops passing `closeLabel={tCommon("close")}`, `bg-surface` and its own header and title classes. `tCommon` and the `useTranslations` import go with them (lint would flag them).
- **§5.8:** the sub-line `<p className="text-xs text-muted-foreground">{labels.triggerLabel}</p>` becomes `<SheetDescription>`, so Radix ties it to the sheet as its description, and `aria-describedby={undefined}` goes. `side="right"`, `onCloseAutoFocus`, `w-full gap-0 p-0` and `sm:max-w-2xl` stay (`tests/sheet-drawers-ui.test.ts:35-44`).
- **O14, I35:** the dashed empty box becomes `<EmptyNote className="mt-4">{labels.emptyLabel}</EmptyNote>`: the one-line 13px faint note, no frame.
- **Ruling (this plan), FMG:** the file has no budget row (spec §9.4 "ไฟล์ของ 2C ที่ไม่มีแถว"). It joins `MIGRATED_FILES` in this commit, which turns on GF4, GF6, GF8, GB2 and GB3 for it; it passes them before and after the change, so the failing run is the new UI test.

What users will see (asset detail ⋯ → "หลักฐานทั้งหมด"):
- The drawer header is 56px tall (it was 48px) with the X centered in it; the title "ศูนย์หลักฐานของทรัพย์สิน" is unchanged; the line under it is 14px muted text (it was 12px) and screen readers now read it as the drawer's description.
- When there is nothing to list, "ยังไม่มีไฟล์หลักฐาน…" is a faint 13px text block instead of a dashed box.

Not in this task:
- the stat tiles (`EvidenceStat`), the group filter buttons (`FilterButton`, `h-8` with a solid primary fill) and the file cards: 2D (K28, buttons outside forms and dialogs)
- the caller `assets/asset-detail-action-menu.tsx` (its props stay); `D/assets/[id]/page.tsx` (2B-4)
- messages: no key changes. Do not run a formatter.

**Files:**
- Modify: `src/components/assets/asset-evidence-drawer.tsx` (CRLF, 5 replacements)
- Modify: `tests/sheet-drawers-ui.test.ts` (CRLF, 1 test appended)
- Modify: `tests/form-migration-guards.test.ts` (through `p2c-budget.mjs` only)

**Must keep passing without edits:**
- `tests/sheet-drawers-ui.test.ts:32-45`: `<SheetContent[\s\S]*?side="right"`, `controlledOpen ?? uncontrolledOpen`, `hideTrigger`, `returnFocusRef?.current`, no `fixed inset-0` or `aria-label="Close"`, and `sm:max-w-2xl`.
- `tests/asset-photo-gallery.test.ts:31-42` (the menu renders `<AssetEvidenceDrawer`), `tests/dropdown-menus-ui.test.ts:7-17` (the asset detail menu).

**Interfaces:**
- Consumes: 2C-0 `SheetHeader`, `SheetTitle`, `SheetDescription` (`text-sm text-muted-foreground`) and the X of `SheetContent`; 2B-1 `EmptyNote` from `@/components/ui/empty-note`; Task 1's scripts.
- Produces: `assets/asset-evidence-drawer.tsx` is the last line of `MIGRATED_FILES` (56 files); its exports and props are unchanged.

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `git ls-files --eol src/components/assets/asset-evidence-drawer.tsx tests/sheet-drawers-ui.test.ts`, then `node --no-warnings <temp>/p2c4-precheck.mjs assets/asset-evidence-drawer.tsx`
Expected: `git status` prints nothing; both files `i/lf w/crlf`. Task 1's shared checks print `ok`, then:
```
ok      assets/asset-evidence-drawer.tsx: not in MIGRATED_FILES yet
ok      assets/asset-evidence-drawer.tsx: budgets at their c2bfbe2 row
ok      assets/asset-evidence-drawer.tsx: CONSTRAINT_FLOORS no row
ok      assets/asset-evidence-drawer.tsx: not in PENDING_FOOTER_PARTS, not in BUSY_LABEL_SWAPS
ok      src/components/assets/asset-evidence-drawer.tsx exists
info    tests/form-migration-guards.test.ts: CRLF
info    assets/asset-evidence-drawer.tsx: CRLF · budget/live none · floors live 0/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0
preconditions hold for assets/asset-evidence-drawer.tsx
```

- [ ] **Step 2: Add the file to `MIGRATED_FILES`**

Run: `node --no-warnings <temp>/p2c-budget.mjs assets/asset-evidence-drawer.tsx`
Expected: `MIGRATED_FILES: added assets/asset-evidence-drawer.tsx` (no budget line: the file holds none).

Run: `node --test tests/form-migration-guards.test.ts`
Expected: PASS, `tests 23 · pass 23 · fail 0` (the drawer has no field, label, spinner or busy swap the migrated-only guards look at).

- [ ] **Step 3: Append the failing test to `tests/sheet-drawers-ui.test.ts`**

The file's `read` strips `\r`. One exact replacement at the end of the file (`:59-60`).

Replace:

```ts
  assert.match(sidebar, /onCloseAutoFocus=\{\(event\) => \{[\s\S]*?isConnected[\s\S]*?event\.preventDefault\(\)[\s\S]*?\.focus\(\)/)
})
```

with:

```ts
  assert.match(sidebar, /onCloseAutoFocus=\{\(event\) => \{[\s\S]*?isConnected[\s\S]*?event\.preventDefault\(\)[\s\S]*?\.focus\(\)/)
})

// Phase 2C batch 4 (spec 2C §5.8 row asset-evidence-drawer.tsx, O14, §5.11 table B row I): the drawer takes the
// sheet's own header, X name and white fill; its sub-line is the sheet's description, and an empty filter shows the
// shared one-line EmptyNote instead of a dashed box.
test("the evidence drawer uses the sheet header, its description and EmptyNote when a filter is empty (2C batch 4)", () => {
  const source = read("src/components/assets/asset-evidence-drawer.tsx")
  assert.match(source, /<SheetHeader>\n\s+<SheetTitle>\{labels\.title\}<\/SheetTitle>\n\s+<SheetDescription>\{labels\.triggerLabel\}<\/SheetDescription>\n\s+<\/SheetHeader>/)
  assert.match(source, /className="w-full gap-0 p-0 sm:max-w-2xl"/)
  assert.match(source, /<EmptyNote className="mt-4">\{labels\.emptyLabel\}<\/EmptyNote>/)
  assert.doesNotMatch(source, /closeLabel=|aria-describedby=|border-dashed|bg-surface|useTranslations/)
})
```

Run: `node --test tests/sheet-drawers-ui.test.ts`
Expected: FAIL, `tests 7 · pass 6 · fail 1`: the new test, first on the `<SheetHeader>` regex.

- [ ] **Step 4: Move the drawer onto the sheet's own chrome (`src/components/assets/asset-evidence-drawer.tsx`)**

Five exact replacements.

(1) Imports (`:3-7`): `useTranslations` goes; `EmptyNote` and `SheetDescription` come in.

Replace:

```tsx
import { useMemo, useState, type RefObject } from "react"
import { FileText, ImageIcon, Paperclip } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
```

with:

```tsx
import { useMemo, useState, type RefObject } from "react"
import { FileText, ImageIcon, Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyNote } from "@/components/ui/empty-note"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
```

(2) `tCommon` (`:46-47`).

Replace:

```tsx
  const tCommon = useTranslations("common")
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
```

with:

```tsx
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
```

(3) `SheetContent` props (`:70-74`).

Replace:

```tsx
      <SheetContent
        side="right"
        closeLabel={tCommon("close")}
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
```

with:

```tsx
      <SheetContent
        side="right"
        onCloseAutoFocus={(event) => {
```

(4) The panel class and the header (`:80-85`).

Replace:

```tsx
        className="w-full gap-0 bg-surface p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b border-border px-4 py-3 pr-16">
          <SheetTitle className="text-base font-semibold text-foreground">{labels.title}</SheetTitle>
          <p className="text-xs text-muted-foreground">{labels.triggerLabel}</p>
        </SheetHeader>
```

with:

```tsx
        className="w-full gap-0 p-0 sm:max-w-2xl"
      >
        <SheetHeader>
          <SheetTitle>{labels.title}</SheetTitle>
          <SheetDescription>{labels.triggerLabel}</SheetDescription>
        </SheetHeader>
```

(5) The empty box (`:101-105`, O14).

Replace:

```tsx
          {filteredItems.length === 0 ? (
            <div className="mt-4 rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {labels.emptyLabel}
            </div>
          ) : (
```

with:

```tsx
          {filteredItems.length === 0 ? (
            <EmptyNote className="mt-4">{labels.emptyLabel}</EmptyNote>
          ) : (
```

Check: `grep -n "closeLabel\|aria-describedby\|border-dashed\|bg-surface\|useTranslations\|tCommon" src/components/assets/asset-evidence-drawer.tsx` prints nothing.

- [ ] **Step 5: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/sheet-drawers-ui.test.ts tests/asset-photo-gallery.test.ts`
Expected: PASS, `tests 33 · pass 33 · fail 0` (23 + 7 + 3; on counts see Task 12 Step 5).

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 0 fail and 1 test more than after Task 12 (1964 tests, 1963 pass, 1 skipped); tsc no errors; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat`
Expected: exactly 3 files. `asset-evidence-drawer.tsx` 7 insertions and 12 deletions, `tests/sheet-drawers-ui.test.ts` 11 insertions, `tests/form-migration-guards.test.ts` 1 insertion.

- [ ] **Step 7: Commit**

```bash
git add src/components/assets/asset-evidence-drawer.tsx tests/sheet-drawers-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): evidence drawer on the sheet header and description, EmptyNote when a filter is empty (2C batch 4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 4 dev-app check (Task 19):**
- An asset with evidence files, `/th/assets/<id>` ⋯ → the evidence drawer at 375 and 1440: header 56px with the X centered, title 16px, the sub-line 14px muted; the X reads "ปิด" (NVDA) and Esc returns focus to ⋯ (`returnFocusRef`). The empty line shows only for an asset without evidence (groups come from the files, so a group is never empty); open such an asset if the dev data has one.

---

### Task 14: Batch 4 · `ui/activity-drawer.tsx` (sheet chrome and `EmptyNote`, O14)

Spec §8.9 "ชุด 4" row `ui/activity-drawer.tsx`, with §5.8 (the row `ui/activity-drawer.tsx:55`: `closeLabel` `:57`, `bg-surface` in `:65`, the header class `:67`, keep `aria-describedby={undefined}`, the empty box `:72` → `EmptyNote`), §5.3, O14, I10, I35, §5.11 table B row I and §9.4 (no row). The line numbers at `c2bfbe2` equal the spec's. One file, one commit (I30). The file is CRLF; edit it with exact-string replacement only.

Rulings this task applies:
- **§5.3, §5.8, I10:** as Task 13: no `closeLabel`, no `bg-surface`, no header or title classes; `tCommon` and `useTranslations` go. `cn` stays (the tone dot).
- **§5.8:** the drawer has no description line, so `aria-describedby={undefined}` stays (Radix would warn without it).
- **O14, I35:** the dashed empty box becomes `<EmptyNote>{emptyLabel}</EmptyNote>` (the list's `p-4` wrapper gives it its place, so no margin class).
- **FMG:** no budget row; it joins `MIGRATED_FILES` (as Task 13).

What users will see (asset detail ⋯ → "กิจกรรม"):
- The header is 56px tall with the X centered (it was 48px); the title "กิจกรรมล่าสุดของทรัพย์สิน" is unchanged.
- An empty history is one faint 13px line, "ไม่พบข้อมูล", instead of a dashed box.

Not in this task:
- the activity items (bordered cards with an `uppercase` 12px label): 2D (K28)
- the caller `assets/asset-detail-action-menu.tsx`; messages: no key changes. Do not run a formatter.

**Files:**
- Modify: `src/components/ui/activity-drawer.tsx` (CRLF, 4 replacements)
- Modify: `tests/sheet-drawers-ui.test.ts` (CRLF, 1 test appended after Task 13's)
- Modify: `tests/form-migration-guards.test.ts` (through `p2c-budget.mjs` only)

**Must keep passing without edits:**
- `tests/sheet-drawers-ui.test.ts:32-41` (`side="right"`, the controlled open, `hideTrigger`, `returnFocusRef?.current`) and Task 13's test.

**Interfaces:**
- Consumes: as Task 13 (no `SheetDescription`); Task 13's test in `tests/sheet-drawers-ui.test.ts`.
- Produces: `ui/activity-drawer.tsx` is the last line of `MIGRATED_FILES` (57 files); `ActivityDrawer` and `ActivityDrawerItem` are unchanged.

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `git ls-files --eol src/components/ui/activity-drawer.tsx`, then `node --no-warnings <temp>/p2c4-precheck.mjs ui/activity-drawer.tsx`
Expected: `git status` prints nothing; `i/lf w/crlf`. Task 1's shared checks print `ok`, then:
```
ok      ui/activity-drawer.tsx: not in MIGRATED_FILES yet
ok      ui/activity-drawer.tsx: budgets at their c2bfbe2 row
ok      ui/activity-drawer.tsx: CONSTRAINT_FLOORS no row
ok      ui/activity-drawer.tsx: not in PENDING_FOOTER_PARTS, not in BUSY_LABEL_SWAPS
ok      src/components/ui/activity-drawer.tsx exists
info    tests/form-migration-guards.test.ts: CRLF
info    ui/activity-drawer.tsx: CRLF · budget/live none · floors live 0/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0
preconditions hold for ui/activity-drawer.tsx
```

- [ ] **Step 2: Add the file to `MIGRATED_FILES`**

Run: `node --no-warnings <temp>/p2c-budget.mjs ui/activity-drawer.tsx`
Expected: `MIGRATED_FILES: added ui/activity-drawer.tsx`.

Run: `node --test tests/form-migration-guards.test.ts`
Expected: PASS, `tests 23 · pass 23 · fail 0`.

- [ ] **Step 3: Append the failing test to `tests/sheet-drawers-ui.test.ts`**

One exact replacement at the end of Task 13's test.

Replace:

```ts
  assert.match(source, /<EmptyNote className="mt-4">\{labels\.emptyLabel\}<\/EmptyNote>/)
  assert.doesNotMatch(source, /closeLabel=|aria-describedby=|border-dashed|bg-surface|useTranslations/)
})
```

with:

```ts
  assert.match(source, /<EmptyNote className="mt-4">\{labels\.emptyLabel\}<\/EmptyNote>/)
  assert.doesNotMatch(source, /closeLabel=|aria-describedby=|border-dashed|bg-surface|useTranslations/)
})

// Phase 2C batch 4 (spec 2C §5.8 row ui/activity-drawer.tsx, O14, §5.11 table B row I): the same sheet chrome. The
// drawer has no description, so it keeps aria-describedby={undefined}; an empty list is the shared EmptyNote.
test("the activity drawer uses the sheet header and X, and EmptyNote for an empty list (2C batch 4)", () => {
  const source = read("src/components/ui/activity-drawer.tsx")
  assert.match(source, /side="right"\n\s+aria-describedby=\{undefined\}\n\s+onCloseAutoFocus=/)
  assert.match(source, /<SheetHeader>\n\s+<SheetTitle>\{title\}<\/SheetTitle>\n\s+<\/SheetHeader>/)
  assert.match(source, /className="w-full gap-0 p-0 sm:max-w-md"/)
  assert.match(source, /\{items\.length === 0 \? \(\n\s+<EmptyNote>\{emptyLabel\}<\/EmptyNote>\n\s+\) : \(/)
  assert.doesNotMatch(source, /closeLabel=|border-dashed|bg-surface|useTranslations/)
})
```

Run: `node --test tests/sheet-drawers-ui.test.ts`
Expected: FAIL, `tests 8 · pass 7 · fail 1`: the new test, first on the `side="right"\n…aria-describedby` regex (`closeLabel` still sits between them).

- [ ] **Step 4: Move the drawer onto the sheet's own chrome (`src/components/ui/activity-drawer.tsx`)**

Four exact replacements.

(1) Imports (`:3-8`).

Replace:

```tsx
import { useState, type RefObject } from "react"
import { Activity } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
```

with:

```tsx
import { useState, type RefObject } from "react"
import { Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { EmptyNote } from "@/components/ui/empty-note"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
```

(2) `tCommon` (`:36-37`).

Replace:

```tsx
  const tCommon = useTranslations("common")
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
```

with:

```tsx
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
```

(3) `SheetContent` props (`:56-58`).

Replace:

```tsx
        side="right"
        closeLabel={tCommon("close")}
        aria-describedby={undefined}
```

with:

```tsx
        side="right"
        aria-describedby={undefined}
```

(4) The panel class, the header and the empty box (`:65-75`, O14).

Replace:

```tsx
        className="w-full gap-0 bg-surface p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border px-4 py-3 pr-16">
          <SheetTitle className="text-base font-semibold text-foreground">{title}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {emptyLabel}
            </div>
          ) : (
```

with:

```tsx
        className="w-full gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <EmptyNote>{emptyLabel}</EmptyNote>
          ) : (
```

Check: `grep -n "closeLabel\|aria-describedby\|border-dashed\|bg-surface\|useTranslations\|tCommon" src/components/ui/activity-drawer.tsx` prints 1 line: `56:        aria-describedby={undefined}`.

- [ ] **Step 5: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/sheet-drawers-ui.test.ts`
Expected: PASS, `tests 31 · pass 31 · fail 0` (23 + 8; on counts see Task 12 Step 5).

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 0 fail and 1 test more than after Task 13 (1965 tests, 1964 pass, 1 skipped); tsc no errors; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat`
Expected: exactly 3 files. `ui/activity-drawer.tsx` 5 insertions and 9 deletions, `tests/sheet-drawers-ui.test.ts` 11 insertions, `tests/form-migration-guards.test.ts` 1 insertion.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/activity-drawer.tsx tests/sheet-drawers-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): activity drawer on the sheet header, EmptyNote for an empty list (2C batch 4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 4 dev-app check (Task 19):**
- `/th/assets/<id>` ⋯ → the activity drawer at 375 and 1440: header 56px, X "ปิด", Esc returns focus to ⋯; the empty line only if the dev data has an asset without activity.

---

### Task 15: Batch 4 · `asset-operations/transaction-cancel-dialog.tsx` (layout B on the dialog parts, a busy destructive confirm and a danger trigger)

Spec §8.9 "ชุด 4" row `asset-operations/transaction-cancel-dialog.tsx` (trigger `:123` + footer), with §5.5 row 4 (dialog `:128`, body `:129`, footer `:154`), §6.3 #39–#40, §6.4.1 (the trigger row), §6.5.3 (the loading line `:131`), §4.3 (F1, F2, F4), §4.13 (`disabled:opacity-60` `:148`), §4 ruling 17 (the error line `:150` stays), I35 (the blocked box `:140` stays), §9.4 (the row: `LOADER2` 2 → 1), §9.5 / §10.4 table A (`tests/asset-transaction-cancellation-ui.test.ts:13`) and §10.1 (K13). The line numbers at `c2bfbe2` equal the spec's. One file, one commit (I30). The file is CRLF; edit it with exact-string replacement only.

Rulings this task applies:
- **§5.5 row 4, I6–I8:** layout B (no `<form>`; the confirm runs `submitCancellation` on click). `AccessibleDialogBody` (no className) replaces the guessed `max-h-[calc(100dvh-12rem)] overflow-y-auto px-5 py-4` box, so the body scrolls and the footer stays in view. `AccessibleDialogFooter` holds `AccessibleDialogCancel` with `{labels.cancel}` ("กลับไปตรวจสอบ") and then the confirm. Cancel's click falls back to the dialog's `onClose` (`() => setOpen(false)`, the same function the old button called) and it is disabled while the dialog is busy (`busy={saving}`), as the old `disabled={saving}` was (§6.3 #39).
- **§6.3 #40, K13, GB4:** the confirm is `Button variant="destructive" busy={saving} disabled={loading || blockers.length > 0}`: `saving` leaves `disabled`, and its spinner leaves the label (`Loader2` 2 → 1).
- **§6.4.1:** the trigger is `Button variant="danger"` (default size) with `<Undo2 aria-hidden="true" />`; `hideTrigger ? null` stays, so the asset detail menu still hides it.
- **§6.5.3, I27, GB2:** the loading line keeps its spinner and gains `motion-reduce:animate-none`; the line and its `aria-live="polite"` stay.
- **§4.3 F1, F2, F4, §4.13:** the wrapping `<label>` + `<textarea>` becomes `Field label={labels.reasonLabel} className="mt-4"` + `Textarea`. The textarea keeps `ref={reasonRef}` (the dialog's `initialFocusRef`), `value`, `onChange`, `disabled={saving || blockers.length > 0}`, `rows={4}`, `maxLength={2000}` (GF5 floor `0/1/0`), `placeholder` and `min-h-28`; `mt-2`, the look classes and `disabled:opacity-60` go. It has no `required` (the 5-character check is the code's), so no star.
- **I35, §4 ruling 17:** the blocked box (`:140`, `role="status"`) and the error line (`:150`, `aria-live="polite"`) stay as they are (2D and the V track).
- **Ruling (this plan), FMG:** `LOADER2` keeps 1 for the loading line; the row's comment is rewritten to the line after this task (`:134`).

What users will see (asset detail ⋯ → "ยกเลิกรายการ", and the trigger on the checkout, check-in and transfer document pages):
- The trigger on the document pages is the shared red-outline button, 44px on phones and 40px from `md`.
- The dialog body scrolls under a fixed footer bar; the buttons can no longer scroll away. On phones "กลับไปตรวจสอบ" sits above "ยืนยันยกเลิกรายการ", full width (as before); from `sm` they form a right-aligned row instead of two half-width buttons.
- The reason field has the 2A look (16px text on phones, a 13px label) and the grey disabled look instead of fading.
- While the cancellation saves, the confirm shows a spinner, keeps focus and keeps its label; "กลับไปตรวจสอบ", X and Esc do nothing (as before). The confirm is grey (not faded red) while the preview loads or a blocker exists.
- The loading spinner stops for users who reduce motion.

Not in this task:
- `assets/asset-detail-action-menu.tsx` (the `ref`, `hideTrigger` and `returnFocusRef` it passes stay), `D/assets/[id]/page.tsx` (2B-4) and the three print pages
- the facts list `:134-138`, the blocked box `:140-145` (2D) and the error line `:150` (V track)
- messages: no key changes. No toast, `maxLength` or `disabled` gate changes (K4). Do not run a formatter.

**Files:**
- Modify: `src/components/asset-operations/transaction-cancel-dialog.tsx` (CRLF, 5 replacements)
- Modify: `tests/asset-transaction-cancellation-ui.test.ts` (CRLF: `:13` replaced, 1 test appended)
- Modify: `tests/form-migration-guards.test.ts` (through `p2c-budget.mjs`, then 1 exact replacement of the `LOADER2` row's comment)

**Must keep passing without edits:**
- `tests/asset-transaction-cancellation-ui.test.ts:5-12` (`AccessibleDialog`, `cancel-preview`, `expectedUpdatedAt`, `reason.trim().length < 5`, `aria-live="polite"`) and `:26-42` (plan 2B-4 keeps `cancelTransaction={` and `transactionStatus === "active"` in `D/assets/[id]/page.tsx`; the menu keeps `<TransactionCancelDialog ref={cancelDialogRef}`).
- `tests/dropdown-menus-ui.test.ts:19-24`: `useImperativeHandle(ref, () => ({ open: () => void openPreview() }))`, `hideTrigger ? null`, `returnFocusRef={returnFocusRef}`; and `:7-17` (the menu).
- `tests/accessible-dialog.test.ts` (the parts).

**Interfaces:**
- Consumes: 2C-0 `AccessibleDialogBody`, `AccessibleDialogFooter`, `AccessibleDialogCancel`; 2A `Button` (`danger`, `destructive`, `busy`), `Field`, `Textarea`; Task 1's scripts.
- Produces: `asset-operations/transaction-cancel-dialog.tsx` is the last line of `MIGRATED_FILES` (58 files) and out of `PENDING_FOOTER_PARTS` (2 left: `maintenance/maintenance-attachments.tsx`, batch 5, and `assets/asset-register-table.tsx`, Task 17). Its rows left: `LOADER2` 1 and `CONSTRAINT_FLOORS` `[0, 1, 0]`. `TransactionCancelDialog`, its handle and its props are unchanged.

| file | `RAW_FIELDS` | `FIELD_CLASS_STRINGS` | `LOADER2` | `PENDING_FOOTER_PARTS` | `CONSTRAINT_FLOORS` |
|---|---|---|---|---|---|
| `asset-operations/transaction-cancel-dialog.tsx` | 1 → – | 1 → – | 2 → 1 | listed → removed | 0/1/0 unchanged |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `git ls-files --eol src/components/asset-operations/transaction-cancel-dialog.tsx tests/asset-transaction-cancellation-ui.test.ts`, then `node --no-warnings <temp>/p2c4-precheck.mjs asset-operations/transaction-cancel-dialog.tsx`
Expected: `git status` prints nothing; both `i/lf w/crlf`. Task 1's shared checks print `ok`, then:
```
ok      asset-operations/transaction-cancel-dialog.tsx: not in MIGRATED_FILES yet
ok      asset-operations/transaction-cancel-dialog.tsx: budgets at their c2bfbe2 row
ok      asset-operations/transaction-cancel-dialog.tsx: CONSTRAINT_FLOORS 0/1/0
ok      asset-operations/transaction-cancel-dialog.tsx: in PENDING_FOOTER_PARTS, not in BUSY_LABEL_SWAPS
ok      src/components/asset-operations/transaction-cancel-dialog.tsx exists
info    tests/form-migration-guards.test.ts: CRLF
info    asset-operations/transaction-cancel-dialog.tsx: CRLF · budget/live RAW_FIELDS 1/1 · FIELD_CLASS_STRINGS 1/1 · LOADER2 2/2 · floors live 0/1/0 · AccessibleDialog 1 · AccessibleDialogFooter 0
preconditions hold for asset-operations/transaction-cancel-dialog.tsx
```

- [ ] **Step 2: Lower the file's budgets (the failing guard)**

Run: `node --no-warnings <temp>/p2c-budget.mjs asset-operations/transaction-cancel-dialog.tsx RAW_FIELDS=1:0 FIELD_CLASS_STRINGS=1:0 LOADER2=2:1 --footer-done`
Expected:
```
RAW_FIELDS: 1 -> 0
FIELD_CLASS_STRINGS: 1 -> 0
LOADER2: 2 -> 1
PENDING_FOOTER_PARTS: removed asset-operations/transaction-cancel-dialog.tsx
MIGRATED_FILES: added asset-operations/transaction-cancel-dialog.tsx
```

Then rewrite the kept `LOADER2` row's comment (one exact replacement in `tests/form-migration-guards.test.ts`; `:134` is the loading line after Step 4).

Replace:

```ts
  [`${C}asset-operations/transaction-cancel-dialog.tsx`]: 1, // → 1: the status line :131
```

with:

```ts
  [`${C}asset-operations/transaction-cancel-dialog.tsx`]: 1, // the loading line :134 in the dialog body (I27)
```

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL, `tests 23 · pass 18 · fail 5`. Each failing guard names only `src/components/asset-operations/transaction-cancel-dialog.tsx`:
- GF2 `1 > 0`, GF3 `1 > 0`
- GB1 `2 > 1`
- GB2 `:131` (the loading spinner without `motion-reduce:animate-none`)
- GD2 `1 AccessibleDialog, 0 AccessibleDialogFooter`

- [ ] **Step 3: Update the tests (`tests/asset-transaction-cancellation-ui.test.ts`)**

The file reads its sources without stripping `\r`, so the new `:13` lines have no `\n`; the appended test strips `\r` first. Two exact replacements.

(1) `:12-14` (spec §10.4 table A: the old `/min-h-11/` matched only the three hand-written buttons).

Replace:

```ts
  assert.match(source, /aria-live="polite"/)
  assert.match(source, /min-h-11/)
})
```

with:

```ts
  assert.match(source, /aria-live="polite"/)
  assert.match(source, /<Button[\s\S]*?variant="danger"/)
  assert.match(source, /<AccessibleDialogFooter>[\s\S]*?variant="destructive"[\s\S]*?busy=\{saving\}/)
})
```

(2) The end of the file (`:58-61`).

Replace:

```ts
      assert.equal(typeof copy?.[key], "string", `${locale}.${key}`)
    }
  }
})
```

with:

```ts
      assert.equal(typeof copy?.[key], "string", `${locale}.${key}`)
    }
  }
})

// Phase 2C batch 4 (spec 2C §5.5 row 4, §6.3 #39-#40, §6.4.1, §6.5.3, §4.3 F1-F4, §4.13): layout B on the body and
// footer parts, the reason a shared field that keeps maxLength, the confirm busy in place (focus stays on it while the
// cancellation saves) and the trigger the danger Button. Cancel is disabled by the dialog while saving, as before.
test("the transaction cancel dialog uses the dialog parts, a shared reason field and a busy destructive confirm (2C batch 4)", () => {
  const source = readFileSync("src/components/asset-operations/transaction-cancel-dialog.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /\{hideTrigger \? null : \(\n\s+<Button variant="danger" onClick=\{\(\) => void openPreview\(\)\}>\n\s+<Undo2 aria-hidden="true" \/>/)
  assert.match(source, /<AccessibleDialogBody>\n\s+\{loading \? \(/)
  assert.match(source, /<Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" \/>\{labels\.loading\}/)
  assert.match(source, /<Field label=\{labels\.reasonLabel\} className="mt-4">\n\s+<Textarea ref=\{reasonRef\}[^\n]*maxLength=\{2000\}[^\n]*className="min-h-28" \/>\n\s+<\/Field>/)
  assert.match(source, /<AccessibleDialogFooter>\n\s+<AccessibleDialogCancel>\{labels\.cancel\}<\/AccessibleDialogCancel>\n\s+<Button variant="destructive" busy=\{saving\} disabled=\{loading \|\| blockers\.length > 0\} onClick=\{\(\) => void submitCancellation\(\)\}>\n\s+\{labels\.confirm\}\n\s+<\/Button>\n\s+<\/AccessibleDialogFooter>/)
  assert.doesNotMatch(source, /<button\b|<textarea|<label\b|max-h-\[calc|disabled:opacity|sm:grid-cols-2/)
})
```

Run: `node --test tests/asset-transaction-cancellation-ui.test.ts`
Expected: FAIL, `tests 5 · pass 3 · fail 2`: the first test (no `<Button … variant="danger"` yet) and the new test.

- [ ] **Step 4: Move the dialog onto the parts (`src/components/asset-operations/transaction-cancel-dialog.tsx`)**

Five exact replacements.

(1) Imports (`:5-7`). `Loader2` stays for the loading line.

Replace:

```tsx
import { AlertTriangle, Loader2, Undo2 } from "lucide-react"
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
import { ApiErrorText } from "@/components/ui/api-error-text"
```

with:

```tsx
import { AlertTriangle, Loader2, Undo2 } from "lucide-react"
import { AccessibleDialog, AccessibleDialogBody, AccessibleDialogCancel, AccessibleDialogFooter } from "@/components/ui/accessible-dialog"
import { ApiErrorText } from "@/components/ui/api-error-text"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
```

(2) The trigger (`:123-126`).

Replace:

```tsx
        <button type="button" onClick={() => void openPreview()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-danger-border bg-surface px-3 text-sm font-medium text-danger transition-colors hover:bg-danger-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Undo2 className="h-4 w-4" aria-hidden="true" />
          {labels.action}
        </button>
```

with:

```tsx
        <Button variant="danger" onClick={() => void openPreview()}>
          <Undo2 aria-hidden="true" />
          {labels.action}
        </Button>
```

(3) The body and the loading line (`:129-131`).

Replace:

```tsx
        <div className="max-h-[calc(100dvh-12rem)] overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex min-h-28 items-center justify-center gap-2 text-sm text-muted-foreground" aria-live="polite"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{labels.loading}</div>
```

with:

```tsx
        <AccessibleDialogBody>
          {loading ? (
            <div className="flex min-h-28 items-center justify-center gap-2 text-sm text-muted-foreground" aria-live="polite"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />{labels.loading}</div>
```

(4) The reason field (`:146-149`).

Replace:

```tsx
              <label className="mt-4 block text-sm font-medium text-foreground">
                {labels.reasonLabel}
                <textarea ref={reasonRef} value={reason} onChange={(event) => setReason(event.target.value)} disabled={saving || blockers.length > 0} rows={4} maxLength={2000} placeholder={labels.reasonPlaceholder} className="mt-2 min-h-28 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring disabled:opacity-60" />
              </label>
```

with:

```tsx
              <Field label={labels.reasonLabel} className="mt-4">
                <Textarea ref={reasonRef} value={reason} onChange={(event) => setReason(event.target.value)} disabled={saving || blockers.length > 0} rows={4} maxLength={2000} placeholder={labels.reasonPlaceholder} className="min-h-28" />
              </Field>
```

(5) The end of the body and the footer (`:152-157`).

Replace:

```tsx
          )}
        </div>
        <div className="grid gap-2 border-t border-border bg-background px-5 py-4 sm:grid-cols-2">
          <button type="button" onClick={() => setOpen(false)} disabled={saving} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50">{labels.cancel}</button>
          <button type="button" onClick={() => void submitCancellation()} disabled={loading || saving || blockers.length > 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-danger px-4 text-sm font-semibold text-white transition-colors hover:bg-danger-hover disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}{labels.confirm}</button>
        </div>
```

with:

```tsx
          )}
        </AccessibleDialogBody>
        <AccessibleDialogFooter>
          <AccessibleDialogCancel>{labels.cancel}</AccessibleDialogCancel>
          <Button variant="destructive" busy={saving} disabled={loading || blockers.length > 0} onClick={() => void submitCancellation()}>
            {labels.confirm}
          </Button>
        </AccessibleDialogFooter>
```

Check: `grep -n "<button\|<textarea\|<label\|Loader2" src/components/asset-operations/transaction-cancel-dialog.tsx` prints 2 lines: `5:` (the `lucide-react` import) and `134:` (the loading line).

- [ ] **Step 5: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/asset-transaction-cancellation-ui.test.ts tests/dropdown-menus-ui.test.ts tests/accessible-dialog.test.ts`
Expected: PASS, `tests 41 · pass 41 · fail 0` (23 + 5 + 6 + 7; on counts see Task 12 Step 5).

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 0 fail and 1 test more than after Task 14 (1966 tests, 1965 pass, 1 skipped); tsc no errors; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat`
Expected: exactly 3 files. `transaction-cancel-dialog.tsx` 19 insertions and 15 deletions, `tests/asset-transaction-cancellation-ui.test.ts` 15 insertions and 1 deletion, `tests/form-migration-guards.test.ts` 2 insertions and 4 deletions.

- [ ] **Step 7: Commit**

```bash
git add src/components/asset-operations/transaction-cancel-dialog.tsx tests/asset-transaction-cancellation-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): transaction cancel dialog on the dialog parts with a busy destructive confirm and a danger trigger (2C batch 4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 4 dev-app check (Task 19):**
- An asset with an active transaction (Task 0 Step 7), `/th/assets/<id>` ⋯ → "ยกเลิกรายการ" at 375 and 1440, and the trigger on its document page (`/th/asset-management/checkouts/<id>` or the check-in or transfer page): the trigger is red-outline 44 / 40px; in the dialog the facts and the reason field scroll above the footer bar; at 375 "กลับไปตรวจสอบ" sits above the red "ยืนยันยกเลิกรายการ"; at 1440 a right-aligned row; X "ปิด", Esc closes and focus returns to ⋯ or the trigger. Never confirm.

---

### Task 16: Batch 4 · `assets/asset-create-workspace.tsx` (the mode toggle on `Segmented`, and `asset.createModeLabel`)

Spec §8.9 "ชุด 4" row `assets/asset-create-workspace.tsx` (`:20-38` → `Segmented`), with §7.5 T3, §3.2 (the T3 row), §7.8 and §10.2 (the new key `asset.createModeLabel` "วิธีเพิ่มทรัพย์สิน" / "How to add assets", batch 4), §7.9 (the `choice-controls-ui` row: `<Segmented` + `t("createModeLabel")`, no `bg-primary text-white`), I3 and §9.4 (no row). The line numbers at `c2bfbe2` equal the spec's (the toggle is `:20-39`). One file, one commit (I30). The file is CRLF in the worktree (the main checkout happens to hold it as LF; keep what `git ls-files --eol` shows in the worktree).

Rulings this task applies:
- **§7.5 T3, I3:** the two hand-written buttons become P0's `Segmented` with `aria-label={t("createModeLabel")}`, `value={mode}`, `onValueChange={setMode}` and the two options. P0 named the prop `aria-label` (§7.5: "if P0 named it differently, use P0's"; §7.5 wrote `label=`). No `fill` (two short options fit at 375) and no `size` (the default `sm`: 44px below `md`, 32px from `md`), as §7.5 writes it.
- **§7.5:** `props.cloneSource` and `<AssetForm {...props} />` stay (`tests/asset-clone-ui.test.ts:33-34`); the clone page shows no toggle, as today.
- **§10.2:** the one new key of this task goes through `node scripts/messages-edit.mjs` in this commit.
- **FMG:** no budget row; the file joins `MIGRATED_FILES`.

What users will see (`/assets/new`):
- The toggle is the shared segmented control: a white frame with a grey line; the chosen option has a light primary fill with dark primary text (it was solid primary with white text); 44px tall on phones and 32px from `md` (it was 36px everywhere).
- Screen readers hear the group "วิธีเพิ่มทรัพย์สิน" ("How to add assets") and which option is pressed (there was no group name and no pressed state).

Not in this task:
- `D/assets/new/page.tsx`, `AssetForm` and `AssetBatchForm` (batch 1e, done). Do not run a formatter.

**Files:**
- Modify: `src/components/assets/asset-create-workspace.tsx` (CRLF, 2 replacements)
- Modify: `messages/th.json`, `messages/en.json` (CRLF; only through `node scripts/messages-edit.mjs`: 1 key)
- Modify: `tests/choice-controls-ui.test.ts` (CRLF, 1 test appended)
- Modify: `tests/form-migration-guards.test.ts` (through `p2c-budget.mjs` only)

**Must keep passing without edits:**
- `tests/asset-clone-ui.test.ts:27-35`: `props.cloneSource` and `<AssetForm {...props} />` in the workspace.
- `tests/thai-glossary.test.ts`, `tests/messages-parity.test.ts`, `tests/visual-foundation-guards.test.ts` (the segmented test reads `ui/segmented.tsx` only).

**Interfaces:**
- Consumes: P0 `Segmented` from `@/components/ui/segmented` (`"aria-label"`, `value`, `options`, `onValueChange`, `size` default `"sm"`); Task 1's scripts.
- Produces: `assets/asset-create-workspace.tsx` is the last line of `MIGRATED_FILES` (59 files); the key `asset.createModeLabel` (the last key of `asset` in both files). `AssetCreateWorkspace`'s props are unchanged.

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `git ls-files --eol src/components/assets/asset-create-workspace.tsx tests/choice-controls-ui.test.ts messages/th.json messages/en.json`, then `node --no-warnings <temp>/p2c4-precheck.mjs assets/asset-create-workspace.tsx`
Expected: `git status` prints nothing; all four `i/lf w/crlf` (keep what you find). Task 1's shared checks print `ok`, then:
```
ok      assets/asset-create-workspace.tsx: not in MIGRATED_FILES yet
ok      assets/asset-create-workspace.tsx: budgets at their c2bfbe2 row
ok      assets/asset-create-workspace.tsx: CONSTRAINT_FLOORS no row
ok      assets/asset-create-workspace.tsx: not in PENDING_FOOTER_PARTS, not in BUSY_LABEL_SWAPS
ok      src/components/assets/asset-create-workspace.tsx exists
info    tests/form-migration-guards.test.ts: CRLF
info    assets/asset-create-workspace.tsx: CRLF · budget/live none · floors live 0/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0
preconditions hold for assets/asset-create-workspace.tsx
```

Run: `node -e "for (const l of ['th','en']) console.log(l, require('./messages/' + l + '.json').asset.createModeLabel)"`
Expected: `th undefined` and `en undefined` (the key is new).

- [ ] **Step 2: Add the file to `MIGRATED_FILES`**

Run: `node --no-warnings <temp>/p2c-budget.mjs assets/asset-create-workspace.tsx`
Expected: `MIGRATED_FILES: added assets/asset-create-workspace.tsx`.

Run: `node --test tests/form-migration-guards.test.ts`
Expected: PASS, `tests 23 · pass 23 · fail 0`.

- [ ] **Step 3: Append the failing test to `tests/choice-controls-ui.test.ts`**

The file's `read` strips `\r`; `readFileSync` is imported. One exact replacement at the end of the file (the T6 test's last lines, `:137-139`).

Replace:

```ts
  // A real radio inside the settings <form>: ChoiceChip's Enter guard keeps Enter from saving every setting.
  assert.doesNotMatch(source, /aria-pressed|compactButtonClassName|inputClassName|previewInputClassName|function PreviewInputField/)
})
```

with:

```ts
  // A real radio inside the settings <form>: ChoiceChip's Enter guard keeps Enter from saving every setting.
  assert.doesNotMatch(source, /aria-pressed|compactButtonClassName|inputClassName|previewInputClassName|function PreviewInputField/)
})

test("the create page picks single or batch with the shared Segmented, named for screen readers (T3, batch 4)", () => {
  const source = read("src/components/assets/asset-create-workspace.tsx")
  assert.match(source, /import \{ Segmented \} from "@\/components\/ui\/segmented"/)
  assert.match(source, /<Segmented\n\s+aria-label=\{t\("createModeLabel"\)\}\n\s+value=\{mode\}\n\s+onValueChange=\{setMode\}/)
  assert.match(source, /\{ value: "single", label: t\("createModeSingle"\) \},\n\s+\{ value: "batch", label: t\("createModeBatch"\) \},/)
  assert.doesNotMatch(source, /<button\b|bg-primary text-white|\bfill\b/, "two short options fit at 375 without fill (spec 7.5 T3)")
  for (const [locale, text] of [["th", "วิธีเพิ่มทรัพย์สิน"], ["en", "How to add assets"]] as const) {
    assert.equal((JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { asset: Record<string, unknown> }).asset.createModeLabel, text, locale)
  }
})
```

Run: `node --test tests/choice-controls-ui.test.ts`
Expected: FAIL, `tests 14 · pass 13 · fail 1`: the new test, first on the `import { Segmented }` regex.

- [ ] **Step 4: Add the message key**

Save this file as `<temp>/p2c4-create-mode-label.json` (UTF-8):

```json
{ "set": { "th": { "asset.createModeLabel": "วิธีเพิ่มทรัพย์สิน" }, "en": { "asset.createModeLabel": "How to add assets" } } }
```

Run from the worktree root: `node scripts/messages-edit.mjs <temp>/p2c4-create-mode-label.json`
Expected: `messages updated: 1 th, 1 en, 0 deleted`. `git diff --stat messages` shows 2 insertions and 1 deletion in each file (the comma after `asset.noCustodian` and the new last key of `asset`); both files stay CRLF (`node -e "const s=require('fs').readFileSync('messages/th.json','utf8');console.log((s.match(/\r\n/g)||[]).length,(s.match(/\n/g)||[]).length)"` prints `4313 4313`, and the same for `en.json`).

- [ ] **Step 5: Move the toggle onto `Segmented` (`src/components/assets/asset-create-workspace.tsx`)**

Two exact replacements.

(1) Imports (`:5-6`).

Replace:

```tsx
import { AssetBatchForm } from "@/components/assets/asset-batch-form"
import { AssetForm } from "@/components/assets/asset-form"
```

with:

```tsx
import { AssetBatchForm } from "@/components/assets/asset-batch-form"
import { AssetForm } from "@/components/assets/asset-form"
import { Segmented } from "@/components/ui/segmented"
```

(2) The toggle (`:20-39`).

Replace:

```tsx
      <div className="inline-flex rounded-md border border-border bg-surface p-1">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={`h-9 rounded px-3 text-sm font-medium transition-colors ${
            mode === "single" ? "bg-primary text-white" : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          {t("createModeSingle")}
        </button>
        <button
          type="button"
          onClick={() => setMode("batch")}
          className={`h-9 rounded px-3 text-sm font-medium transition-colors ${
            mode === "batch" ? "bg-primary text-white" : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          {t("createModeBatch")}
        </button>
      </div>
```

with:

```tsx
      <Segmented
        aria-label={t("createModeLabel")}
        value={mode}
        onValueChange={setMode}
        options={[
          { value: "single", label: t("createModeSingle") },
          { value: "batch", label: t("createModeBatch") },
        ]}
      />
```

Check: `grep -n "<button\|bg-primary\|text-white" src/components/assets/asset-create-workspace.tsx` prints nothing.

- [ ] **Step 6: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/choice-controls-ui.test.ts tests/asset-clone-ui.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts`
Expected: PASS, `tests 46 · pass 46 · fail 0` (23 + 14 + 3 + 3 + 3; on counts see Task 12 Step 5).

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 0 fail and 1 test more than after Task 15 (1967 tests, 1966 pass, 1 skipped); tsc no errors (`setMode` fits `onValueChange: (value: "single" | "batch") => void`); lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat`
Expected: exactly 5 files. `asset-create-workspace.tsx` 10 insertions and 20 deletions, `messages/th.json` and `messages/en.json` 2 insertions and 1 deletion each, `tests/choice-controls-ui.test.ts` 11 insertions, `tests/form-migration-guards.test.ts` 1 insertion.

- [ ] **Step 8: Commit**

```bash
git add src/components/assets/asset-create-workspace.tsx messages/th.json messages/en.json tests/choice-controls-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): asset create mode toggle on Segmented with a group name (2C batch 4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 5 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 4 dev-app check (Task 19):**
- `/th/assets/new` at 375 and 1440: the toggle is 44px at 375 and 32px at 1440; the chosen option has the light primary fill; Tab reaches both options with the focus ring; NVDA reads "วิธีเพิ่มทรัพย์สิน", group, and "กดอยู่" on the chosen option; "เพิ่มเป็นชุด" shows the batch form. `/th/assets/new?cloneFrom=<id>` shows no toggle. English pass: "How to add assets". Forced colors: the chosen option stays distinct (it has no check mark; spec 10.5 asks for the same look on the room list).

---

### Task 17: Batch 4 · `assets/asset-register-table.tsx` (the bulk update dialog only, O1)

Spec §8.9 "ชุด 4" row `assets/asset-register-table.tsx` (the dialog only, O1, a shared file), with §5.5 row 6, §5.3 (the `closeLabel` row), §6.3 #71–#72, §4.3 (F1, F2, F4, F5: the reason gains the star), §4.14 (the row: 4 fields, `required` 1, `maxLength` 1) and §9.4 (the row). At `c2bfbe2` the dialog is `:681-758` (`closeLabel` `:687`, the form `:690`, the labels `:692`, `:707`, `:722`, `:732`, the fields `:693`, `:708`, `:723`, `:733`, the buttons `:741`, `:748`, `Loader2` `:753`), as the DH 2B-3 hand-off lists; at `5ffee76` it was `:697-774`. One file, one commit (I30). The file is CRLF; edit it with exact-string replacement only.

Rulings this task applies:
- **O1, 2B fence:** only the two import lines, the dialog's props and its children change. The list part 2B-3 moved (the table, the checkboxes, the phone list, the pagination) and the bulk-action bar `data-asset-bulk-bar` `:460-491` stay byte for byte; so do `bulkUpdateOpen`, `bulkSaving`, `bulkForm` and `submitBulkUpdate` (DH 2B-3 hand-off).
- **§5.5 row 6, I6–I8:** layout A. `<form onSubmit={submitBulkUpdate} className={accessibleDialogFormClasses}>` wraps `AccessibleDialogBody className="space-y-4"` and `AccessibleDialogFooter`, so Enter in a field still submits and `required` still blocks. The body takes the part's padding (`px-5` → `px-4 sm:px-5`).
- **§5.3:** `closeLabel={labels.close}` goes: the X reads "ปิด" from the dialog. `labels.close` stays in the props type and `D/assets/page.tsx` keeps passing it (no label prop is deleted; see "Not in this task").
- **§6.3 #71–#72, K9, K13, GB4:** `AccessibleDialogCancel` with `{labels.cancel}`: it closes through the dialog's `onClose` and is now disabled while saving (it was clickable during the save). Submit is `Button type="submit" busy={bulkSaving} disabled={!bulkForm.toLocationId && !bulkForm.toCustodianId}`: `bulkSaving` leaves `disabled`, its spinner leaves the label, and `Loader2` leaves the file (`LOADER2` 1 → 0; the import goes).
- **§4.3 F1, F2, F4, F5:** the four `<label className="block"><span …>X</span><control/></label>` pairs become `Field label={X}` with `NativeSelect` ×2, `Input` and `Textarea`. The reason keeps `required` and `maxLength={500}` (GF5 floor `1/1/0`) and its `Field` gets `required` (it gains the orange star; GF4 pairs them). The remark keeps `rows={3}` and `min-h-24`. The old `h-10` fields become the 2A sizes (40px from `md`, 44px with 16px text below).
- **Ruling (this plan), FMG:** the `OLD_MARKUP` row (6, live 4 after 2B-3) goes straight to none (the dialog held the 4 live sites; the 2 list checkboxes it was kept for went in 2B-3). `FIXED_BOTTOM_BARS` keeps 1 for the bulk-action bar (phase 3, R-q); its comment is rewritten to the bar's line after this task (`:473`).
- **Ruling (this plan), the test:** appended to `tests/asset-register-table-ui.test.ts` (the register's UI test; plan 2B-4 does not touch it).

What users will see (`/assets`, one or more rows selected → "อัปเดตที่ตั้ง/ผู้ถือครอง", dialog "อัปเดตทรัพย์สินหลายรายการ"):
- The four fields have the 2A look (white, 13px labels); on phones they are 44px with 16px text (they were 40px with 14px); "เหตุผล" shows the orange star.
- The buttons sit in a footer bar under the fields that stays in view; on phones "ยกเลิก" sits above "อัปเดตรายการที่เลือก", both full width and 44px (they were a 40px row); from `sm` a right-aligned row.
- While it saves, the submit button shows a spinner, keeps focus and its label; "ยกเลิก" is grey and does nothing (it could be pressed before).
- The X reads "ปิด", as before.

Not in this task:
- the list part, the checkboxes, the phone list and the bulk-action bar `:460-491` (2B / phase 3, R-q), `tests/list-frame-guards.test.ts` (never edit it)
- `D/assets/page.tsx`'s `labels` (`close` stays passed but unused by the dialog; a later cleanup may drop it); the dialog's `description` string (it stays a sentence with the count)
- messages: no key changes. No toast, `required`, `maxLength` or `disabled` gate changes (K4). Do not run a formatter.

**Files:**
- Modify: `src/components/assets/asset-register-table.tsx` (CRLF, 3 replacements)
- Modify: `tests/asset-register-table-ui.test.ts` (CRLF, 1 test appended)
- Modify: `tests/form-migration-guards.test.ts` (through `p2c-budget.mjs`, then 1 exact replacement of the `FIXED_BOTTOM_BARS` row's comment)

**Must keep passing without edits:**
- `tests/asset-register-table-ui.test.ts:176-188`, `:207-215`, `:230-247`, `:249-260`, `:262-268` (two `checkboxVariants()` in 44px labels; no `h-4 w-4 rounded border-border`), `:270-279` (the bar keeps its frame and 4 `Button`s).
- `tests/asset-register-ux.test.ts:53-62`, `:85-124`, `:158-176`; `tests/asset-return-navigation.test.ts:29-39`; `tests/asset-status-help-ui.test.ts`; `tests/attachment-preview-dialog-ui.test.ts:24-35` (`<AccessibleDialog`, no `fixed inset-0`, `role="dialog"` or `aria-modal`); `tests/modern-enterprise-theme.test.ts:67`; `tests/asset-clone-ui.test.ts:6-14`.
- `tests/visual-foundation-guards.test.ts` R2 (`asset-register-table.tsx: 1`, the bar's `shadow-lg`) and `tests/list-frame-guards.test.ts` (the register is in `MIGRATED_LIST_FILES`; this task lowers no counter's KEEP and raises none).

**Interfaces:**
- Consumes: 2C-0 dialog parts and `accessibleDialogFormClasses`; 2A `Field`, `Input`, `NativeSelect`, `Textarea`, `Button` (already imported); Task 1's scripts.
- Produces: `assets/asset-register-table.tsx` is the last line of `MIGRATED_FILES` (60 files) and out of `PENDING_FOOTER_PARTS` (1 left: `maintenance/maintenance-attachments.tsx`, batch 5). Its rows left: `FIXED_BOTTOM_BARS` 1 and `CONSTRAINT_FLOORS` `[1, 1, 0]`. `AssetRegisterTable`'s props are unchanged.

| file | `RAW_FIELDS` | `FIELD_CLASS_STRINGS` | `OLD_MARKUP` | `LOADER2` | `FIXED_BOTTOM_BARS` | `PENDING_FOOTER_PARTS` | `CONSTRAINT_FLOORS` |
|---|---|---|---|---|---|---|---|
| `assets/asset-register-table.tsx` | 4 → – | 4 → – | 6 (live 4) → – | 1 → – | 1 (comment `:473`) | listed → removed | 1/1/0 unchanged |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `git ls-files --eol src/components/assets/asset-register-table.tsx tests/asset-register-table-ui.test.ts`, then `node --no-warnings <temp>/p2c4-precheck.mjs assets/asset-register-table.tsx`
Expected: `git status` prints nothing; both `i/lf w/crlf`. Task 1's shared checks print `ok`, then:
```
ok      assets/asset-register-table.tsx: not in MIGRATED_FILES yet
ok      assets/asset-register-table.tsx: budgets at their c2bfbe2 row
ok      assets/asset-register-table.tsx: CONSTRAINT_FLOORS 1/1/0
ok      assets/asset-register-table.tsx: in PENDING_FOOTER_PARTS, not in BUSY_LABEL_SWAPS
ok      src/components/assets/asset-register-table.tsx exists
info    tests/form-migration-guards.test.ts: CRLF
info    assets/asset-register-table.tsx: CRLF · budget/live RAW_FIELDS 4/4 · FIELD_CLASS_STRINGS 4/4 · OLD_MARKUP 6/4 · LOADER2 1/1 · FIXED_BOTTOM_BARS 1/1 · floors live 1/1/0 · AccessibleDialog 1 · AccessibleDialogFooter 0
preconditions hold for assets/asset-register-table.tsx
```

- [ ] **Step 2: Lower the file's budgets (the failing guard)**

Run: `node --no-warnings <temp>/p2c-budget.mjs assets/asset-register-table.tsx RAW_FIELDS=4:0 FIELD_CLASS_STRINGS=4:0 OLD_MARKUP=6:0 LOADER2=1:0 FIXED_BOTTOM_BARS=1:1 --footer-done`
Expected (`FIXED_BOTTOM_BARS=1:1` names the kept row and prints nothing):
```
RAW_FIELDS: 4 -> 0
FIELD_CLASS_STRINGS: 4 -> 0
OLD_MARKUP: 6 -> 0
LOADER2: 1 -> 0
PENDING_FOOTER_PARTS: removed assets/asset-register-table.tsx
MIGRATED_FILES: added assets/asset-register-table.tsx
```

Then rewrite the kept `FIXED_BOTTOM_BARS` row's comment (one exact replacement in `tests/form-migration-guards.test.ts`; the bar's class string is `:463` today and `:473` after Step 4, which adds 10 import lines).

Replace:

```ts
  [`${C}assets/asset-register-table.tsx`]: 1, // :455 the mobile multi-select bar (2B / phase 3)
```

with:

```ts
  [`${C}assets/asset-register-table.tsx`]: 1, // :473 the phone bulk-action bar (phase 3, R-q)
```

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL, `tests 23 · pass 18 · fail 5`. Each failing guard names only `src/components/assets/asset-register-table.tsx`:
- GF2 `4 > 0`, GF3 `4 > 0`, GF7 `4 > 0`
- GB1 `1 > 0`
- GD2 `1 AccessibleDialog, 0 AccessibleDialogFooter`

- [ ] **Step 3: Append the failing test to `tests/asset-register-table-ui.test.ts`**

The file's `table()` strips `\r`. One exact replacement at the end of the file (the export-menu test, `:309-311`).

Replace:

```ts
  assert.match(source, /<DropdownMenuTrigger asChild>\n\s+<Button variant="outline" size="md">\n\s+<Download aria-hidden="true" \/>\n\s+\{t\("exportMenu"\)\}\n\s+<\/Button>\n\s+<\/DropdownMenuTrigger>/)
  assert.doesNotMatch(source, /<button\b|hover:bg-accent|focus-visible:ring/, "no hand-written trigger (N5)")
})
```

with:

```ts
  assert.match(source, /<DropdownMenuTrigger asChild>\n\s+<Button variant="outline" size="md">\n\s+<Download aria-hidden="true" \/>\n\s+\{t\("exportMenu"\)\}\n\s+<\/Button>\n\s+<\/DropdownMenuTrigger>/)
  assert.doesNotMatch(source, /<button\b|hover:bg-accent|focus-visible:ring/, "no hand-written trigger (N5)")
})

// Phase 2C batch 4 (spec 2C §5.5 row 6, §5.3, §6.3 #71-#72, §4.3 F1-F5, O1): the bulk update dialog only; the list part
// above is 2B's. Layout A: the form wraps the body and footer parts. The four fields are shared fields, and the reason
// keeps required and maxLength and now shows the star. Cancel is off while saving (it was not), the submit button is
// busy in place, and the X reads "ปิด" from the dialog itself.
test("the bulk update dialog uses the dialog parts, shared fields and a busy submit (2C batch 4, O1)", () => {
  const source = table()
  const dialog = source.slice(source.indexOf("<AccessibleDialog\n"), source.indexOf("</AccessibleDialog>"))
  assert.doesNotMatch(dialog, /closeLabel=/)
  assert.match(dialog, /<form onSubmit=\{submitBulkUpdate\} className=\{accessibleDialogFormClasses\}>\n\s+<AccessibleDialogBody className="space-y-4">/)
  assert.equal(dialog.match(/<Field label=\{labels\.(?:currentLocation|custodian|remark)\}>/g)?.length, 3)
  assert.match(dialog, /<Field label=\{labels\.reason\} required>\n\s+<Input\n[\s\S]*?\n\s+required\n\s+maxLength=\{500\}\n\s+\/>/)
  assert.equal(dialog.match(/<NativeSelect\n/g)?.length, 2)
  assert.match(dialog, /<Textarea\n[\s\S]*?rows=\{3\}\n\s+className="min-h-24"/)
  assert.match(dialog, /<AccessibleDialogFooter>\n\s+<AccessibleDialogCancel>\{labels\.cancel\}<\/AccessibleDialogCancel>\n\s+<Button type="submit" busy=\{bulkSaving\} disabled=\{!bulkForm\.toLocationId && !bulkForm\.toCustodianId\}>\n\s+\{labels\.applyBulkUpdate\}\n\s+<\/Button>\n\s+<\/AccessibleDialogFooter>\n\s+<\/form>/)
  assert.doesNotMatch(dialog, /<button\b|<select\b|<input\b|<textarea\b|<label\b|h-10|disabled:opacity/)
  assert.doesNotMatch(source, /\bLoader2\b/, "the spinner comes from Button busy")
})
```

Run: `node --test tests/asset-register-table-ui.test.ts`
Expected: FAIL, `tests 26 · pass 25 · fail 1`: the new test, first on `closeLabel=`.

- [ ] **Step 4: Move the dialog onto the parts (`src/components/assets/asset-register-table.tsx`)**

Three exact replacements; nothing else in the file changes.

(1) The `lucide-react` import (`:6`): `Loader2` goes.

Replace:

```tsx
import { Download, Edit, Loader2, Printer, X } from "lucide-react"
```

with:

```tsx
import { Download, Edit, Printer, X } from "lucide-react"
```

(2) The dialog import (`:32`): the parts and the fields come in.

Replace:

```tsx
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
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
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
```

(3) The dialog's props and children (`:685-758`).

Replace:

```tsx
        busy={bulkSaving}
        size="md"
        closeLabel={labels.close}
        onClose={() => setBulkUpdateOpen(false)}
      >
            <form onSubmit={submitBulkUpdate} className="space-y-4 px-5 py-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground">{labels.currentLocation}</span>
                <select
                  value={bulkForm.toLocationId}
                  onChange={(event) => setBulkForm((current) => ({ ...current, toLocationId: event.target.value }))}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                >
                  <option value="">{labels.noChange}</option>
                  {bulkOptions.locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground">{labels.custodian}</span>
                <select
                  value={bulkForm.toCustodianId}
                  onChange={(event) => setBulkForm((current) => ({ ...current, toCustodianId: event.target.value }))}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                >
                  <option value="">{labels.noChange}</option>
                  {bulkOptions.employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground">{labels.reason}</span>
                <input
                  value={bulkForm.reason}
                  onChange={(event) => setBulkForm((current) => ({ ...current, reason: event.target.value }))}
                  required
                  maxLength={500}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground">{labels.remark}</span>
                <textarea
                  value={bulkForm.remark}
                  onChange={(event) => setBulkForm((current) => ({ ...current, remark: event.target.value }))}
                  rows={3}
                  className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                />
              </label>
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setBulkUpdateOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
                >
                  {labels.cancel}
                </button>
                <button
                  type="submit"
                  disabled={bulkSaving || (!bulkForm.toLocationId && !bulkForm.toCustodianId)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {bulkSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {labels.applyBulkUpdate}
                </button>
              </div>
            </form>
      </AccessibleDialog>
```

with:

```tsx
        busy={bulkSaving}
        size="md"
        onClose={() => setBulkUpdateOpen(false)}
      >
        <form onSubmit={submitBulkUpdate} className={accessibleDialogFormClasses}>
          <AccessibleDialogBody className="space-y-4">
            <Field label={labels.currentLocation}>
              <NativeSelect
                value={bulkForm.toLocationId}
                onChange={(event) => setBulkForm((current) => ({ ...current, toLocationId: event.target.value }))}
              >
                <option value="">{labels.noChange}</option>
                {bulkOptions.locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label={labels.custodian}>
              <NativeSelect
                value={bulkForm.toCustodianId}
                onChange={(event) => setBulkForm((current) => ({ ...current, toCustodianId: event.target.value }))}
              >
                <option value="">{labels.noChange}</option>
                {bulkOptions.employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label={labels.reason} required>
              <Input
                value={bulkForm.reason}
                onChange={(event) => setBulkForm((current) => ({ ...current, reason: event.target.value }))}
                required
                maxLength={500}
              />
            </Field>
            <Field label={labels.remark}>
              <Textarea
                value={bulkForm.remark}
                onChange={(event) => setBulkForm((current) => ({ ...current, remark: event.target.value }))}
                rows={3}
                className="min-h-24"
              />
            </Field>
          </AccessibleDialogBody>
          <AccessibleDialogFooter>
            <AccessibleDialogCancel>{labels.cancel}</AccessibleDialogCancel>
            <Button type="submit" busy={bulkSaving} disabled={!bulkForm.toLocationId && !bulkForm.toCustodianId}>
              {labels.applyBulkUpdate}
            </Button>
          </AccessibleDialogFooter>
        </form>
      </AccessibleDialog>
```

Check: `grep -n "Loader2\|<select\|<textarea\|closeLabel\|h-10 w-full\|<button" src/components/assets/asset-register-table.tsx` prints nothing (the two list checkboxes stay `<input type="checkbox">`).

- [ ] **Step 5: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/asset-register-table-ui.test.ts tests/asset-register-ux.test.ts tests/asset-return-navigation.test.ts tests/asset-status-help-ui.test.ts tests/attachment-preview-dialog-ui.test.ts tests/modern-enterprise-theme.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts tests/asset-clone-ui.test.ts`
Expected: PASS, `tests 135 · pass 135 · fail 0` (23 + 26 + 19 + 6 + 4 + 3 + 4 + 26 + 21 + 3; on counts see Task 12 Step 5).

- [ ] **Step 6: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 0 fail and 1 test more than after Task 16 (1968 tests, 1967 pass, 1 skipped); tsc no errors; lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat`
Expected: exactly 3 files. `asset-register-table.tsx` 64 insertions and 71 deletions, `tests/asset-register-table-ui.test.ts` 18 insertions, `tests/form-migration-guards.test.ts` 2 insertions and 6 deletions. `git diff -U0 src/components/assets/asset-register-table.tsx | grep "^@@"` shows 4 hunks, at old lines `-6`, `-32`, `-687` and `-690,68` (nothing in the list part).

- [ ] **Step 7: Commit**

```bash
git add src/components/assets/asset-register-table.tsx tests/asset-register-table-ui.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): register bulk update dialog on the dialog parts with shared fields and a busy submit (2C batch 4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 3 files in the commit. `git status --short src tests messages` prints nothing.

**For the plan 4 dev-app check (Task 19):**
- `/th/assets` at 375 (select mode) and 1440: tick two rows, press "อัปเดตที่ตั้ง/ผู้ถือครอง" in the bar: the X reads "ปิด"; four labelled fields (44px / 16px at 375, 40px at 1440), the star on "เหตุผล"; the footer bar stays in view at 375 with "ยกเลิก" on top; at 1440 a right-aligned row with "อัปเดตรายการที่เลือก" last and grey until a location or a custodian is picked. Press Enter in an empty "เหตุผล" after picking a location: the browser's required message shows and nothing is sent. Close with Esc; focus returns to the bar button. Never submit.

---

### Task 18: Batch 4 · `assets/asset-import-preview-panel.tsx` (the whole file, O13: `Steps` S5, three `Button`s, the error `Notice`; the `currentStep` prop and `asset.importWizardCurrentStep` go; the guard state after batch 4)

Spec §8.9 "ชุด 4" row `assets/asset-import-preview-panel.tsx` (the whole file, O13), with §7.2.4 S5 (`:220-231` → `Steps`, `WizardStep` `:402-436` deleted, `wizardStepLabel` `:438` kept, the type line `:58` and the two page lines deleted with the key), §6.4.2 (`:112`, `:209`, `:387`), §6.5.2 (`:216`, `:393`), I35 (the error box `:297` → `Notice`), I14 and §10.2 (delete `asset.importWizardCurrentStep`), I18, §7.9 (the `steps-ui` row) and §9.4 (the row: `OLD_HELPERS` 1). The panel's line numbers at `c2bfbe2` equal the spec's. The page lines are `src/app/[locale]/(dashboard)/assets/page.tsx:459` and `src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx:81` (DH 2B-3 hand-off; they were `:451` and `:82`). One file and the two page lines it frees are one commit (I30), with the key. Every file is CRLF; edit with exact-string replacement only.

Rulings this task applies:
- **§7.2.4 S5, I18:** the five `WizardStep` boxes become `<Steps className="mt-4" label={labels.wizardTitle} steps={importSteps} />`. `importStates = getLinearStepStates(assetImportWizardSteps.length, assetImportWizardSteps.indexOf(wizardStep), wizardStep === "complete" ? "complete" : "in_progress")`, mapped to `{ id: step, label: wizardStepLabel(step, labels), state }`. `function WizardStep` goes (GL3 `OLD_HELPERS` 1 → 0); `wizardStepLabel` stays; `CheckCircle2` and `AlertCircle` stay (the success box and the row badges use them).
- **§7.2.4, I14:** the "ขั้นตอนปัจจุบัน" line under the current box goes, with `currentStep: string` in the labels type, the two page lines that pass it and the key `asset.importWizardCurrentStep` (both locales): `Steps` says "ขั้นตอนปัจจุบัน" to screen readers through `common.stepCurrent`. These three edits ride in this commit because the panel's type change frees the page lines.
- **§6.4.2, K13, GB4:** the open/close toggle is `Button variant="outline"` and keeps `aria-expanded={isOpen}` and the chevrons (now `aria-hidden`). Choose-file is `Button variant="outline" busy={isLoading} disabled={isImporting}` with `<Upload aria-hidden="true" />` and the label `{labels.chooseFile}` (no `${labels.chooseFile}...` swap; the spinner takes the icon's place). Confirm is `Button busy={isImporting} disabled={preview.summary.readyRows === 0}` with `{labels.confirmImport}` (no `labels.importing` swap). The hidden `.xlsx` input `:202-208` stays (`tests/file-evidence-ui.test.ts:108`). `labels.importing` stays in the type and both pages keep passing it (§6.5.2: no prop or key is deleted for K13).
- **I35:** the error box becomes `<Notice tone="danger" role="alert" className="mt-4"><ApiErrorText error={error} /></Notice>`. **Ruling (this plan):** `role="alert"` is new: `Notice` leaves the live region to the call site, and this box appears after a command (upload or import) fails (the `Notice` comment: "an alert for an error after a command").
- **Ruling (this plan), the R-e / R-f leftovers:** the 2B spec (§8 plans table row 7, 09-guards LV1 note) and the guard comments also name this file's table header (VFG R7 `:338`, LFG LT1 5), `toLocaleString()` ×4 (LFG LV1), the two typed `"-"` (LV2) and `SummaryPill` (LS1) as "2C plan 4 or 2D". The 2C spec's O13 lists only the stepper, the three buttons and the error box, and the table needs head and cells moved together (the panel's cells are `px-4 py-3`, `DataTable`'s `p-3`), so they go to 2D with the other boxes of this file (see "Not in this task"). The guard rows stay as they are (2C never edits LFG; VFG's panel row is untouched).

What users will see (the import wizard on `/asset-management/import-export` and at the bottom of `/assets`):
- The five step boxes (stacked 5 high on phones) become one rail of 22px circles joined by a line, with the step names from `md`; on phones one line under it says "ขั้นที่ 1 จาก 5 · แม่แบบ". Done steps show a green check; after a successful import all five are checked (the last box used to look current).
- The toggle and "เลือกไฟล์ Excel" are the shared outline button: 44px on phones, 40px from `md` (40px everywhere before). While a file is checked, "เลือกไฟล์ Excel" shows a spinner in place of its icon and keeps its label (it used to add "..."); "ยืนยันนำเข้า" shows a spinner and keeps its label while importing (it used to switch to "กำลังนำเข้า...").
- A failed upload or import shows the shared danger box (pink fill, red icon, dark text) and screen readers announce it.

Not in this task:
- the mapping, batch, success and issue boxes and `SummaryItem` (2D, I35, K28); the preview table's header (`<thead className="bg-muted/40">`, `:326` after this task; VFG R7 row and LFG LT1 5 stay), `toLocaleString()` ×4 (`:279-281`, `:394` after; LFG LV1 4), the typed `"-"` (`:361-362`; LV2 2) and `SummaryPill` (`:408`; LS1 1): 2D (ruling above)
- the rest of both pages (2B-3, done); the import API
- messages: only the deleted key. Do not run a formatter.

**Files:**
- Modify: `src/components/assets/asset-import-preview-panel.tsx` (CRLF, 8 replacements)
- Modify: `src/app/[locale]/(dashboard)/assets/page.tsx` and `src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx` (CRLF, 1 replacement each)
- Modify: `messages/th.json`, `messages/en.json` (CRLF; only through `node scripts/messages-edit.mjs`: 1 key deleted)
- Modify: `tests/steps-ui.test.ts` (CRLF, 1 test appended), `tests/asset-register-ux.test.ts` (CRLF, 1 test appended)
- Modify: `tests/form-migration-guards.test.ts` (through `p2c-budget.mjs` only)
- Temp folder only, never committed: `p2c4-guard-state.mjs`

**Must keep passing without edits:**
- `tests/asset-import-field-labels.test.ts:25-33` (`fields: Record<string, string>`, `labels.fields[column.key] ?? column.label`, both pages keep `fields: t.raw("importField")`).
- `tests/asset-register-ux.test.ts:126-140` (`const [isOpen, setIsOpen] = useState(false)`, `aria-expanded={isOpen}`, `openImportWizard`, `if (!isOpen)`, the page's open and collapse labels) and `:232-240` (the import-export page header).
- `tests/file-evidence-ui.test.ts:98-109` (only the panel and `ui/file-dropzone.tsx` keep `type="file"`), `tests/asset-import-wizard.test.ts` (`getAssetImportWizardStep` unchanged).
- `tests/list-frame-guards.test.ts` (never edit it; the panel's rows LT1 5, LV1 4, LV2 2, LS1 1 hold their live counts, and both pages are in `MIGRATED_LIST_FILES`), `tests/visual-foundation-guards.test.ts` (R7 `asset-import-preview-panel.tsx: 1` stays), `tests/thai-glossary.test.ts`, `tests/messages-parity.test.ts`, `tests/messages-edit.test.ts`.

**Interfaces:**
- Consumes: 2C-0 `Steps` (`label`, `steps`, `className`) and `getLinearStepStates` from `@/lib/step-states`; 2A `Button`; 2B-1 `Notice` (`tone` required); Task 1's scripts; Tasks 1–17 committed (Step 9 reads their rows).
- Produces: `assets/asset-import-preview-panel.tsx` is the last line of `MIGRATED_FILES` (61 files: all 18 batch-4 files) with no budget entry. The panel's `labels` type loses `currentStep`; both pages stop passing it; `asset.importWizardCurrentStep` is gone. The guard state after batch 4 (Step 9).

| file | `OLD_HELPERS` | `BUSY_LABEL_SWAPS` | messages |
|---|---|---|---|
| `assets/asset-import-preview-panel.tsx` | 1 → – | `${labels.chooseFile}...`, `labels.importing` (checked once migrated) | `asset.importWizardCurrentStep` deleted |

- [ ] **Step 1: Check what this task builds on**

Run: `git status --short src tests messages`, then `git ls-files --eol src/components/assets/asset-import-preview-panel.tsx "src/app/[locale]/(dashboard)/assets/page.tsx" "src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx" tests/steps-ui.test.ts tests/asset-register-ux.test.ts`, then `node --no-warnings <temp>/p2c4-precheck.mjs assets/asset-import-preview-panel.tsx`
Expected: `git status` prints nothing; all five `i/lf w/crlf`. Task 1's shared checks print `ok`, then:
```
ok      assets/asset-import-preview-panel.tsx: not in MIGRATED_FILES yet
ok      assets/asset-import-preview-panel.tsx: budgets at their c2bfbe2 row
ok      assets/asset-import-preview-panel.tsx: CONSTRAINT_FLOORS no row
ok      assets/asset-import-preview-panel.tsx: not in PENDING_FOOTER_PARTS, in BUSY_LABEL_SWAPS
ok      src/components/assets/asset-import-preview-panel.tsx exists
info    tests/form-migration-guards.test.ts: CRLF
info    assets/asset-import-preview-panel.tsx: CRLF · budget/live OLD_HELPERS 1/1 · floors live 0/0/0 · AccessibleDialog 0 · AccessibleDialogFooter 0
preconditions hold for assets/asset-import-preview-panel.tsx
```

Run: `git grep -n "importWizardCurrentStep\|labels\.currentStep\|currentStep: string" -- src messages`
Expected: 6 lines: `messages/en.json:723`, `messages/th.json:723`, `src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx:81`, `src/app/[locale]/(dashboard)/assets/page.tsx:459`, and the panel's `:58` (`currentStep: string`) and `:228` (`currentLabel={labels.currentStep}`). Nothing else uses the prop or the key (`disposal-workflow-stepper.tsx` has a local `currentStep` of its own; batch 5).

- [ ] **Step 2: Lower the file's budget (the failing guard)**

Run: `node --no-warnings <temp>/p2c-budget.mjs assets/asset-import-preview-panel.tsx OLD_HELPERS=1:0`
Expected:
```
OLD_HELPERS: 1 -> 0
MIGRATED_FILES: added assets/asset-import-preview-panel.tsx
```

Run: `node --test tests/form-migration-guards.test.ts`
Expected: FAIL, `tests 23 · pass 21 · fail 2`. Each failing guard names only `src/components/assets/asset-import-preview-panel.tsx`:
- GB3 `/\$\{labels\.chooseFile\}\.\.\.|labels\.importing\b/` (the file is migrated now)
- GL3 `1 > 0` (`function WizardStep`)

- [ ] **Step 3: Append the failing tests**

Both files strip `\r` before their multi-line regexes (`steps-ui`'s `read`; the new `asset-register-ux` test strips itself). Two exact replacements.

(1) `tests/steps-ui.test.ts`, at the end of the file (the LDAP test, `:103-104`).

Replace:

```ts
  assert.equal(source.match(/<div className="space-y-6 px-4 py-4">/g)?.length, 2)
})
```

with:

```ts
  assert.equal(source.match(/<div className="space-y-6 px-4 py-4">/g)?.length, 2)
})

test("the import panel shows its five steps on the shared rail, and the current-step label is gone (S5, batch 4)", () => {
  const panel = read("src/components/assets/asset-import-preview-panel.tsx")
  assert.match(panel, /import \{ Steps \} from "@\/components\/ui\/steps"/)
  assert.match(panel, /import \{ getLinearStepStates \} from "@\/lib\/step-states"/)
  assert.match(panel, /const importStates = getLinearStepStates\(\n\s+assetImportWizardSteps\.length,\n\s+assetImportWizardSteps\.indexOf\(wizardStep\),\n\s+wizardStep === "complete" \? "complete" : "in_progress",\n\s+\)/)
  assert.match(panel, /const importSteps = assetImportWizardSteps\.map\(\(step, index\) => \(\{ id: step, label: wizardStepLabel\(step, labels\), state: importStates\[index\] \}\)\)/)
  assert.match(panel, /<Steps className="mt-4" label=\{labels\.wizardTitle\} steps=\{importSteps\} \/>/)
  assert.doesNotMatch(panel, /function WizardStep|currentStep|md:grid-cols-5/)
  for (const page of ["src/app/[locale]/(dashboard)/assets/page.tsx", "src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx"]) {
    const source = read(page)
    assert.doesNotMatch(source, /importWizardCurrentStep|currentStep:/, page)
    assert.match(source, /wizardStepComplete: t\("importWizardStepComplete"\),\n\s+selectedFile: t\("selectedImportFile"\),/, page)
  }
  for (const locale of ["th", "en"]) {
    const asset = (JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { asset: Record<string, unknown> }).asset
    assert.equal(asset.importWizardCurrentStep, undefined, `${locale}: the word comes from common.stepCurrent now`)
    assert.equal(typeof asset.importWizardStepComplete, "string", locale)
  }
})
```

(2) `tests/asset-register-ux.test.ts`, after the collapsed-wizard test (`:131-133`).

Replace:

```ts
  assert.match(source, /openImportWizard/)
  assert.match(source, /if \(!isOpen\)/)
})
```

with:

```ts
  assert.match(source, /openImportWizard/)
  assert.match(source, /if \(!isOpen\)/)
})

// Phase 2C batch 4 (spec 2C §8.9 row asset-import-preview-panel.tsx, O13, §6.4.2, §6.5.2, I35): the panel's three
// buttons are Button; choose-file and import stay in place with busy and keep their labels (K13), and the error box is
// a danger Notice that is announced (role="alert"). The hidden .xlsx input stays (tests/file-evidence-ui.test.ts).
test("the import panel uses Button with busy for choose and import, and a danger Notice for errors (2C batch 4, O13)", () => {
  const source = importPanelSource().replace(/\r\n/g, "\n")
  assert.match(source, /<Button variant="outline" onClick=\{\(\) => setIsOpen\(\(current\) => !current\)\} aria-expanded=\{isOpen\}>\n\s+\{isOpen \? <ChevronUp aria-hidden="true" \/> : <ChevronDown aria-hidden="true" \/>\}/)
  assert.match(source, /<Button variant="outline" busy=\{isLoading\} disabled=\{isImporting\} onClick=\{\(\) => inputRef\.current\?\.click\(\)\}>\n\s+<Upload aria-hidden="true" \/>\n\s+\{labels\.chooseFile\}\n\s+<\/Button>/)
  assert.match(source, /<Button busy=\{isImporting\} disabled=\{preview\.summary\.readyRows === 0\} onClick=\{\(\) => void confirmImport\(\)\}>\n\s+\{labels\.confirmImport\}\n\s+<\/Button>/)
  assert.match(source, /<Notice tone="danger" role="alert" className="mt-4">\n\s+<ApiErrorText error=\{error\} \/>\n\s+<\/Notice>/)
  assert.match(source, /type="file"\n\s+accept="\.xlsx"\n\s+className="hidden"/)
  assert.doesNotMatch(source, /<button\b|labels\.importing|\$\{labels\.chooseFile\}\.\.\.|disabled:opacity|border-danger-border bg-danger-soft/)
})
```

Run: `node --test tests/steps-ui.test.ts tests/asset-register-ux.test.ts`
Expected: FAIL, `tests 28 · pass 26 · fail 2`: the two new tests (`steps-ui` first on the `import { Steps }` regex, `asset-register-ux` first on the toggle `<Button variant="outline"` regex).

- [ ] **Step 4: Move the panel onto the shared parts (`src/components/assets/asset-import-preview-panel.tsx`)**

Eight exact replacements.

(1) Imports (`:10-12`): `getLinearStepStates`, `Button`, `Notice` and `Steps` come in.

Replace:

```tsx
  type AssetImportWizardStep,
} from "@/lib/asset-import-wizard"
import { ApiErrorText } from "@/components/ui/api-error-text"
```

with:

```tsx
  type AssetImportWizardStep,
} from "@/lib/asset-import-wizard"
import { getLinearStepStates } from "@/lib/step-states"
import { ApiErrorText } from "@/components/ui/api-error-text"
import { Button } from "@/components/ui/button"
import { Notice } from "@/components/ui/notice"
import { Steps } from "@/components/ui/steps"
```

(2) The labels type (`:57-59`): `currentStep` goes.

Replace:

```tsx
    wizardStepComplete: string
    currentStep: string
    selectedFile: string
```

with:

```tsx
    wizardStepComplete: string
    selectedFile: string
```

(3) The step states (`:95-97`).

Replace:

```tsx
    hasSuccess: Boolean(success),
  })
  const issueSummary = preview ? summarizeAssetImportPreviewIssues(preview.rows) : []
```

with:

```tsx
    hasSuccess: Boolean(success),
  })
  // Steps before the current one are done; once the import succeeds every step is done (spec 2C section 7.2.4, S5).
  const importStates = getLinearStepStates(
    assetImportWizardSteps.length,
    assetImportWizardSteps.indexOf(wizardStep),
    wizardStep === "complete" ? "complete" : "in_progress",
  )
  const importSteps = assetImportWizardSteps.map((step, index) => ({ id: step, label: wizardStepLabel(step, labels), state: importStates[index] }))
  const issueSummary = preview ? summarizeAssetImportPreviewIssues(preview.rows) : []
```

(4) The open/close toggle (`:112-120`).

Replace:

```tsx
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
      >
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {isOpen ? labels.collapseImportWizard : labels.openImportWizard}
      </button>
```

with:

```tsx
      <Button variant="outline" onClick={() => setIsOpen((current) => !current)} aria-expanded={isOpen}>
        {isOpen ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
        {isOpen ? labels.collapseImportWizard : labels.openImportWizard}
      </Button>
```

(5) Choose-file and the stepper (`:209-231`).

Replace:

```tsx
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isLoading || isImporting}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {isLoading ? `${labels.chooseFile}...` : labels.chooseFile}
        </button>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-5">
        {assetImportWizardSteps.map((step, index) => (
          <WizardStep
            key={step}
            step={step}
            currentStep={wizardStep}
            index={index}
            label={wizardStepLabel(step, labels)}
            currentLabel={labels.currentStep}
          />
        ))}
      </div>
```

with:

```tsx
        <Button variant="outline" busy={isLoading} disabled={isImporting} onClick={() => inputRef.current?.click()}>
          <Upload aria-hidden="true" />
          {labels.chooseFile}
        </Button>
      </div>

      <Steps className="mt-4" label={labels.wizardTitle} steps={importSteps} />
```

(6) The error box (`:297-302`).

Replace:

```tsx
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
          <ApiErrorText error={error} />
        </div>
      )}
```

with:

```tsx
      {error && (
        <Notice tone="danger" role="alert" className="mt-4">
          <ApiErrorText error={error} />
        </Notice>
      )}
```

(7) The confirm button (`:387-394`).

Replace:

```tsx
            <button
              type="button"
              onClick={() => void confirmImport()}
              disabled={isImporting || preview.summary.readyRows === 0}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isImporting ? labels.importing : labels.confirmImport}
            </button>
```

with:

```tsx
            <Button busy={isImporting} disabled={preview.summary.readyRows === 0} onClick={() => void confirmImport()}>
              {labels.confirmImport}
            </Button>
```

(8) `function WizardStep` (`:402-438`).

Replace:

```tsx
function WizardStep({
  step,
  currentStep,
  index,
  label,
  currentLabel,
}: {
  step: AssetImportWizardStep
  currentStep: AssetImportWizardStep
  index: number
  label: string
  currentLabel: string
}) {
  const currentIndex = assetImportWizardSteps.indexOf(currentStep)
  const stepIndex = assetImportWizardSteps.indexOf(step)
  const isDone = stepIndex < currentIndex
  const isCurrent = step === currentStep

  return (
    <div
      className={[
        "rounded-md border px-3 py-2 text-sm",
        isCurrent ? "border-primary bg-primary-soft text-primary" : isDone ? "border-success-border bg-success-soft text-success" : "border-border bg-background text-muted-foreground",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-xs font-semibold">
          {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
        </span>
        <span className="font-medium">{label}</span>
      </div>
      {isCurrent ? <div className="mt-1 text-xs">{currentLabel}</div> : null}
    </div>
  )
}

function wizardStepLabel(step: AssetImportWizardStep, labels: AssetImportPreviewPanelProps["labels"]) {
```

with:

```tsx
function wizardStepLabel(step: AssetImportWizardStep, labels: AssetImportPreviewPanelProps["labels"]) {
```

Check: `grep -n "function WizardStep\|<WizardStep\|currentStep\|<button\|labels\.importing" src/components/assets/asset-import-preview-panel.tsx` prints nothing.

- [ ] **Step 5: Drop the two page lines and the key**

The same exact replacement in each page: `src/app/[locale]/(dashboard)/assets/page.tsx:458-460` and `src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx:80-82`.

Replace:

```tsx
          wizardStepComplete: t("importWizardStepComplete"),
          currentStep: t("importWizardCurrentStep"),
          selectedFile: t("selectedImportFile"),
```

with:

```tsx
          wizardStepComplete: t("importWizardStepComplete"),
          selectedFile: t("selectedImportFile"),
```

Save this file as `<temp>/p2c4-import-current-step.json` (UTF-8):

```json
{ "delete": ["asset.importWizardCurrentStep"] }
```

Run from the worktree root: `node scripts/messages-edit.mjs <temp>/p2c4-import-current-step.json`
Expected: `messages updated: 0 th, 0 en, 1 deleted`. `git diff --stat messages` shows 1 deletion in each file; both stay CRLF (`4312 4312` with the check of Task 16 Step 4).

Run: `git grep -n "importWizardCurrentStep\|labels\.currentStep\|currentStep: string" -- src messages`
Expected: nothing.

- [ ] **Step 6: Run the tests for this file**

Run: `node --test tests/form-migration-guards.test.ts tests/steps-ui.test.ts tests/asset-register-ux.test.ts tests/asset-import-field-labels.test.ts tests/asset-import-wizard.test.ts tests/file-evidence-ui.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts tests/messages-edit.test.ts`
Expected: PASS, `tests 128 · pass 128 · fail 0` (23 + 8 + 20 + 2 + 2 + 16 + 21 + 26 + 3 + 3 + 4; on counts see Task 12 Step 5).

- [ ] **Step 7: Full verification**

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: `npm test` 0 fail and 2 tests more than after Task 17 (1970 tests, 1969 pass, 1 skipped); tsc no errors (no caller passes `currentStep` any more); lint 0 errors and no new warning in `src/` or `tests/`.

Run: `git diff --stat`
Expected: exactly 8 files. `asset-import-preview-panel.tsx` 24 insertions and 77 deletions; `D/assets/page.tsx`, `D/asset-management/import-export/page.tsx`, `messages/th.json` and `messages/en.json` 1 deletion each; `tests/steps-ui.test.ts` 20 insertions; `tests/asset-register-ux.test.ts` 13 insertions; `tests/form-migration-guards.test.ts` 1 insertion and 1 deletion.

- [ ] **Step 8: Commit**

```bash
git add src/components/assets/asset-import-preview-panel.tsx "src/app/[locale]/(dashboard)/assets/page.tsx" "src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx" messages/th.json messages/en.json tests/steps-ui.test.ts tests/asset-register-ux.test.ts tests/form-migration-guards.test.ts
git commit -m "feat(ui): import panel steps on the shared rail, Button busy and a danger Notice; drop the current-step label (2C batch 4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 8 files in the commit. `git status --short src tests messages` prints nothing.

- [ ] **Step 9: Check the guard state after batch 4**

Save this script as `p2c4-guard-state.mjs` in your temp folder (never in the repo):

```js
// Guard state after batch 4: run from the worktree root. Prints every budget of tests/form-migration-guards.test.ts as
// "NAME: <entries> entries, <sum>" and fails if a batch-3 or batch-4 file holds more than the batch keeps on purpose,
// or a file still waits in PENDING_FOOTER_PARTS that batch 4 owns. Never commit this file.
import { readFileSync } from "node:fs"

const guard = readFileSync("tests/form-migration-guards.test.ts", "utf8").replace(/\r\n/g, "\n")
const block = (name) => new RegExp(`^const ${name}\\b[\\s\\S]*?^[}\\]]`, "m").exec(guard)?.[0] ?? ""
const entries = (name) => [...block(name).matchAll(/^\s+\[`\$\{C\}([^`]+)`\]: (\[[^\]]*\]|\d+)/gm)].map((match) => ({ path: match[1], value: match[2] }))
const listed = (name) => [...block(name).matchAll(/^\s+`\$\{C\}([^`]+)`,/gm)].map((match) => match[1])
const batch = (id) => [...(new RegExp(`^\\s+"${id}": \\[([^\\]]*)\\]`, "m").exec(guard)?.[1].matchAll(/"([^"]+)"/g) ?? [])].map((match) => match[1])
const batch3 = batch("3")
const batch4 = batch("4")
// What batches 3 and 4 keep on purpose (spec §9.4, I27, K21, O20): the room search, the label print toolbar's two
// fields, and the spinners outside buttons: the two bulk dialogs' status lines (batch 3), the integration manager's
// status line and row button, the label batch tool's two status lines, the scan tool's status line and the
// transaction cancel dialog's loading line (batch 4).
const KEEP = {
  "RAW_FIELDS audit/audit-scan-room-picker.tsx": "1",
  "RAW_FIELDS assets/asset-label-print.tsx": "2",
  "LOADER2 disposal/disposal-bulk-approval.tsx": "2",
  "LOADER2 disposal/disposal-bulk-execution.tsx": "1",
  "LOADER2 admin/IntegrationClientManager.tsx": "2",
  "LOADER2 assets/asset-label-batch-tool.tsx": "2",
  "LOADER2 assets/asset-scan-search-tool.tsx": "1",
  "LOADER2 asset-operations/transaction-cancel-dialog.tsx": "1",
}
const problems = []
for (const name of ["LOCAL_FIELD", "RAW_FIELDS", "FIELD_CLASS_STRINGS", "OLD_MARKUP", "LOADER2", "OLD_HELPERS", "REVERSE", "CLOSE_LABEL_IS_CANCEL", "FIXED_BOTTOM_BARS"]) {
  const list = entries(name)
  console.log(`${name}: ${list.length} entries, ${list.reduce((sum, item) => sum + Number(item.value), 0)}`)
  for (const item of list) {
    if (name === "FIXED_BOTTOM_BARS") continue // batch 5 (ActionBar) and phase 3 (the register's bulk bar)
    if ((batch3.includes(item.path) || batch4.includes(item.path)) && KEEP[`${name} ${item.path}`] !== item.value) problems.push(`${name} holds ${item.value} for ${item.path}`)
  }
}
for (const [key, value] of Object.entries(KEEP)) {
  const [name, path] = key.split(" ")
  if (!entries(name).some((item) => item.path === path && item.value === value)) problems.push(`${name} should keep ${value} for ${path}`)
}
console.log(`CONSTRAINT_FLOORS: ${entries("CONSTRAINT_FLOORS").length} entries`)
const migrated = listed("MIGRATED_FILES")
console.log(`MIGRATED_FILES: ${migrated.length} (batch 4: ${batch4.filter((path) => migrated.includes(path)).length} of ${batch4.length})`)
const pending = listed("PENDING_FOOTER_PARTS")
console.log(`PENDING_FOOTER_PARTS: ${pending.length}${pending.length ? ` (${pending.join(", ")})` : ""}`)
for (const path of pending) if (batch4.includes(path)) problems.push(`PENDING_FOOTER_PARTS still lists ${path}`)
for (const path of [...batch3, ...batch4]) if (!migrated.includes(path)) problems.push(`MIGRATED_FILES lacks ${path}`)
if (problems.length > 0) {
  console.error(problems.join("\n"))
  process.exit(1)
}
console.log("batch 4 holds only what it keeps")
```

Run: `node <temp>/p2c4-guard-state.mjs`
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
FIXED_BOTTOM_BARS: 3 entries, 3
CONSTRAINT_FLOORS: 38 entries
MIGRATED_FILES: 61 (batch 4: 18 of 18)
PENDING_FOOTER_PARTS: 1 (maintenance/maintenance-attachments.tsx)
batch 4 holds only what it keeps
```

This is the end state of batch 4. Against plan 4's start (HEAD `c2bfbe2`, DH "UI Round 4 Phase 2C Plan 3" guard line):
- `LOCAL_FIELD` 2 entries (2) → 0: `admin-user-form` and `role-permission-form` (Tasks 1–2).
- `RAW_FIELDS` 14 (33) → 2 (3): the room search (1, O20) and the label print toolbar (2, K21).
- `FIELD_CLASS_STRINGS` 12 (30) → 0 and `OLD_MARKUP` 9 (26) → 0: batch 4 holds none (the register's two list checkboxes left in 2B-3).
- `LOADER2` 15 (21) → 10 (13): batch 1 keeps 4 (`maintenance-attachments`, `disposal-asset-picker`, `audit-scan-check-form`, `asset-component-manager`), batch 3 keeps 3 (bulk approval 2, bulk execution 1), batch 4 keeps 6: `IntegrationClientManager` 2 (the status line and the row button, 2D), `asset-label-batch-tool` 2 and `asset-scan-search-tool` 1 (their status lines), `transaction-cancel-dialog` 1 (the loading line).
- `OLD_HELPERS` 1 → 0 (this task), `REVERSE` 1 → 0 and `CLOSE_LABEL_IS_CANCEL` 1 → 0 (Task 3; spec §10.4 table C: GD1 `{}` after plan 4). `FIXED_BOTTOM_BARS` 3 unchanged (the register's bulk bar for phase 3, the two mobile action bars for batch 5).
- `CONSTRAINT_FLOORS` 38 entries, unchanged (floors never drop).
- `MIGRATED_FILES` 43 → 61: the 18 batch-4 files in task order.
- `PENDING_FOOTER_PARTS` 5 → 1: only `maintenance/maintenance-attachments.tsx` (batch 5, K12).

If any line differs, stop and report it (do not edit a budget to make it match). If Tasks 3, 9, 10, 11 or 15 recorded different kept values in their Produces, the controller updates `KEEP` and the matching line together before this step.

No commit in this step.

**For the plan 4 dev-app check (Task 19):**
- `/th/asset-management/import-export` and `/th/assets` (the panel at the bottom) at 375 and 1440: "เปิดตัวช่วยนำเข้า" is outline 44 / 40px with its chevron and `aria-expanded`; open it: the rail shows 5 circles, the first current (light primary with its number), the step names from `md`; at 375 one line "ขั้นที่ 1 จาก 5 · แม่แบบ" under five circles with no sideways scroll; "เลือกไฟล์ Excel" outline 44 / 40px. Do not upload a file that would import; if a preview needs a file, record that the busy and error states could not be seen (the new tests and GB3/GB4 pin them).
- NVDA: the rail reads its name "นำเข้าทรัพย์สินแบบ Wizard", then "ขั้นตอนปัจจุบัน: แม่แบบ" and "ยังไม่ถึง: …" for the rest. Forced colors: the markers keep their borders and numbers.

---

### Task 19: Verify, production build and dev-app check (controller runs this task, not an implementer)

**Files:**
- Create then delete: a configuration in the main checkout's `.claude/launch.json` (temporary; never committed)
- Evidence: `.superpowers/sdd/screenshots/ui-phase2c-plan4/after/` in the main checkout (git-ignored)
- Modify: only files needed to fix problems found here. Each fix gets its own small commit in the worktree, with a test where one is possible, through an implementer and the normal review.

**Interfaces:**
- Consumes: Tasks 1–18 committed; the Task 0 ids and before images.
- Produces: the after images and `.superpowers/sdd/<plan workspace>/task-19-findings.md`, which Task 20 turns into the "Dev-app check" bullets.

- [ ] **Step 1: Full verify.** From the worktree, run `npm run verify` (lint, tests, build). Record the test count and the build page count for Task 21.

- [ ] **Step 2: Production server.** Confirm the worktree's dev database (Task 0 Step 2). Add a configuration `asset-2c4-start-3101` to the main checkout's `.claude/launch.json` with `runtimeExecutable: "node"`, `runtimeArgs: [".worktrees/ui-phase2c-plan4/node_modules/next/dist/bin/next", "start", ".worktrees/ui-phase2c-plan4", "-p", "3101"]`, `port: 3101`, `autoPort: false`, and start it with `preview_start`. Log in with the seed admin; do not echo the password. Prefer `waitUntil: "load"` plus a short wait over `networkidle`. Playwright scripts run inline (`browser_run_code_unsafe` with `code`); if one must be a file, put it under the main checkout's `.playwright-mcp/` and delete it right after the run (`.playwright-mcp/` is linted).

- [ ] **Step 3: Writes nothing.** Every dialog, drawer and sheet is opened to its first screen and closed with its cancel button, the X or Esc. Never press a confirm, Save, Apply, Import, Copy token or any bulk action, and never submit the login form with a password. Count POST, PUT, PATCH and DELETE requests while doing so: 0 (read-only lookups the pages already send are listed by path).

- [ ] **Step 4: Screens.** Take every Task 0 view again under the same name in `after/` and compare (height, wrapping, truncation, lost color or shape). Then check, in Thai, at 1440, 768 and 375, plus one English pass at 1440 and 200% zoom at 1440 (a 720×450 viewport):
  - **Every dialog, drawer and sheet of the batch:** the shared header with the X close ("ปิด"), the body, the footer part (no hand-made footer), the confirm on the right with its verb, the cancel before it; a busy confirm keeps its label (K13); on phones it fits above the home bar; Esc and the X close it and focus returns to the button that opened it.
  - **Every form of the batch** (admin user, role permission, data-quality rule, the create workspace, the login form): fields in `Field` with labels and the star on required ones, 40px on desktop and ≥44px with 16px text on phones; the role permission table keeps its rows and checkboxes; the data-quality rule's nameless field now has a name (K20).
  - **The login form** in a fresh browser context: the show-password button works; the error boxes are `Notice`s with `role="alert"`; the frame of the login page is unchanged (phase 3).
  - **The label tools and the scan search tool:** the headers are `PageHeader` (h1 600); the print view's toolbar keeps its look with a `focus-within` ring; the print heading stays 700; printing A4 / labels is unchanged in the print preview.
  - **The import preview panel:** `Steps` instead of the old current-step line; no button swaps its label while busy; the error box; both pages that render it no longer pass `currentStep`.
  - **The register's bulk update dialog:** it opens from the bar with two rows ticked; its fields on the shared parts; the list part and the bar look exactly as plan 2B-3 left them.
  - **The notification filter and the report presets:** the assignee select is `NativeSelect fieldSize="md"` (36px from md, 44px below); the preset name is `Field` + `Input` at the default size (40px from md) and keeps its 60-character limit.

- [ ] **Step 5: Keyboard.** Tab order in each dialog follows the visual order with cancel before confirm; focus starts on the first field or the cancel button as before; Esc closes; focus returns to the opener; the forms' fields show the focus ring; an empty required field still shows the browser warning on Save (do not let it submit).

- [ ] **Step 6: axe.** Inject `node_modules/axe-core/axe.min.js` (the worktree's) with `page.addScriptTag({ path })` and run `axe.run(<dialog or main>, { runOnly: ["color-contrast", "label", "aria-valid-attr-value", "aria-required-attr", "button-name", "nested-interactive"] })` on each open dialog, drawer and sheet of Step 4 and on each form page. Expected: 0 violations.

- [ ] **Step 7: Forced colors and reduced motion.** With Playwright `emulateMedia`: dialog borders, focus rings, field borders and the `Segmented` selected state stay visible; busy spinners stop under reduced motion; sheets and drawers do not slide.

- [ ] **Step 8: NVDA and real devices.** If NVDA is not available to you, list these checks for the user and do not mark them done: each dialog reads its title and description on open · required fields read "จำเป็น" and the star is not read · a busy confirm reads as busy · the drawers' X reads "ปิด" · the login errors read once when they appear · `Steps` reads the current step. Real iPhone and iPad: dialogs and drawers clear the home bar and the keyboard; the login and admin fields do not zoom. With data the dev database may lack: the import preview up to its apply step (never apply), the integration token shown once. Add them to the open manual checks; all of them must be done before the one phase-2 deploy.

- [ ] **Step 9: Findings report.** Write `task-19-findings.md` in the plan workspace, in the shape Task 20 fills its markers from:
  - **Fixes made:** commit + one line each, or "none".
  - **Checked and passed:** what was checked, where and at which widths, with the results.
  - **Found but not caused by plan 4.**
  - **Accepted mixes.**
  - **Still needs a person:** the Step 8 list and anything else not checked.

- [ ] **Step 10: Clean up.** Stop the server, remove the configuration from the main checkout's `.claude/launch.json` (delete the file if nothing else is in it), and delete every helper script you put under either tree. `git status --short` in the worktree must show nothing.

---

### Task 20: Repo documentation for plan 4 (repo docs only; the controller adds the verify numbers, the rebase and the wiki in Task 21)

Spec §10.6 lists what each document holds and §8.12 ends every plan with its documents; the "Handed on to 2C plan 4" bullets of the 2B plan 1, 2B plan 2, 2C plan 3 and 2B plan 3 sections of `DEVELOPER_HANDOFF.md` are the state this plan started from. Batch 4 adds no primitive. It applies three rules `DESIGN.md` does not state yet (an error inside an open dialog, callers do not restyle a sheet, a field repeated in every card, K20), restyles the boxed toolbar fields (K21), and changes five things the design docs count or list (the labels left, the `ActionButton` call sites, the field counts, the users of `Steps`, the R7 rows). The handoff and the changelog get a plan 4 entry. All four files are CRLF in the working tree (`i/lf w/crlf`): edit them with exact-string replacement, keep the endings, never run a formatter, and match on the quoted strings, not on line numbers (the numbers below are those at `c2bfbe2`; Tasks 1–19 do not touch these files).

Rulings made in this task:
- **What goes where:**
  - `DESIGN.md` (8 replacements):
    - §3 **Label** (`:288`): batch 4 moved the last old label spans and red stars of 2C (GF7 `OLD_MARKUP` is empty after Task 18).
    - §5 Buttons, **Legacy** (`:374`): "their 10 call sites" is a phase 2A number that plans 1–3 never updated; 5 are left at `c2bfbe2`, Task 4 removes 2, and the sentence names the last 3 (the check script counts them).
    - Dialogs, a new **Errors** bullet after **Busy dialogs** (`:406`): Task 3's ruling, the integration error inside the open dialog.
    - Dialogs, **Sheets** (`:410`): what Tasks 13–14 apply (spec §5.3, §5.8, O14): no caller chrome, `SheetDescription`, `EmptyNote`.
    - Inputs, the end of the **`Field`** bullet (`:450`): K20 as Task 5 applies it.
    - Inputs, **Migration** (`:462`): the field counts after batch 4, and the K21 look of the two boxed fields that stay (Task 10).
    - Forms, **`Steps`** users (`:482`): the import wizard joined in batch 4 (Task 18).
    - Data Tables (`:516`): the two R7 rows Tasks 2 and 3 deleted (2B spec R-e).
  - `docs/14_UI_UX_DESIGN_SYSTEM.md` (3 replacements) follows `DESIGN.md`: the `Field` row (`:60`) gets K20, the dialog row (`:88`) the error rule, and the "Forms and dialogs" registry row (`:115`) links this plan.
  - `DEVELOPER_HANDOFF.md` (1 replacement): a new section before `## Open Go-Live Decisions` (`:679`): what moved, the guard state after batch 4, "2C plan 5 may start once 2B plan 4 also merges", and what plan 5, 2B plan 5, 2D and the V track inherit. No older bullet becomes false: the four "Handed on to 2C plan 4" bullets (`:507`, `:569`, `:611`, `:656`) are history, and the new section says they are done. So no older line changes: plan 2B-4 writes its own section beside this one in the same days, and every untouched line is one rebase conflict less.
  - `docs/99_CHANGELOG.md` (1 or 2 replacements): the Thai entry under `## <today>`, shaped like the plan 3 entry.
  - **Not changed:** `.impeccable/design.json` (no component entry changes: its Dialog, Text Field, `Segmented` and `Steps` entries already describe what batch 4 uses) · `docs/11_FEATURE_LIST.md` (no feature row changes: batch 4 changes looks, labels and focus, not what a feature does; the asset import, label queue, status correction, data quality and Integration API rows stay true) · `docs/07_UAT_CHECKLIST.md` (the checks that need a person go into the handoff's "Still open" here and into the wiki in Task 21) · `src/`, `tests/`, `messages/`.
- **Not written into `DESIGN.md`:** the login form's `FieldLabel` + `Input` (spec §4.18 item 10) and the one-line `<label>` around the notification assignee select (F4) are single cases with their reasons; the handoff records them, and a general rule would invite copies. No sheet-footer rule either (plan 3 left the two looks for 2D).
- **The rulings these texts depend on:** the integration error shown inside the open dialog (Task 3) is the source of the `DESIGN.md` **Errors** bullet, the docs/14 dialog row and two handoff sentences; the 2B spec R-e and R-f items done in Tasks 2 and 3 are the source of the R7 clause of `:516` and the handoff's VFG and LFG lines; the LFG LS1 and LN2 rows of the integration manager (Task 3) and the import panel's R-e and R-f items (Task 18) go to 2D in the handoff. If the controller ruled otherwise on any of them before Task 1, rewrite the matching sentence, and the literal the check script tests for it, before Step 2.
- **The guard numbers** are the live totals after Task 18 (Task 18 Step 9) against `c2bfbe2`. The check script recomputes them from `tests/form-migration-guards.test.ts`, the R7 rows of `tests/visual-foundation-guards.test.ts`, the `KEEP` rows of `tests/list-frame-guards.test.ts` and the `test(` lines of the changed test files, each against `git show c2bfbe2:` (the test count against the fork from `master`), and recomputes every line number the handoff hands on from the files. If Step 3 prints other numbers (a Task 19 fix moved a line or added a test), write the printed ones and say so in the task report.
- **The findings markers** (`<from task-19-findings.md>` twice in the handoff, `<จาก task-19-findings.md>` once in the changelog) come from Task 19's `task-19-findings.md` (the controller names its path), in the shape of the plan 3 and plan 2B-3 bullets: what was checked and where, the results, fixes with their commits or "none", accepted mixes, issues found but not caused by plan 4, and what still needs a person. The "Dev-app check (Task 19)" bullet is one paragraph; "Still open" becomes nested bullets when it has more than two items. Task 21 Step 1 adds its verify bullet directly above "Dev-app check (Task 19)" and "ตรวจบนแอป (Task 19)".
- **Dates:** the handoff heading and the changelog date use the day this task runs (`<today>`, Step 1). The newest changelog date in the worktree is `## 2026-10-13`, with the 2B plan 3 entry on top. If `<today>` is 2026-10-13, the entry goes directly under that heading, above the 2B plan 3 entry; otherwise a new date block goes on top with the `---` separator the file uses.
- **The plan file name:** the docs link `docs/superpowers/plans/2026-10-13-ui-phase2c-plan4.md`. If the controller saved plan 4 under another name, replace that path everywhere in this task (the check script's `PLAN` and the docs/14 link included) before Step 2.
- **Rebase with plan 2B-4 (Task 21 Step 2):** both plans add a section before `## Open Go-Live Decisions`, an entry under the newest changelog date and a sentence to their own row of the docs/14 registry (adjacent rows). In `DESIGN.md`, `:516` (the R7 history) is the line 2B-4's docs are most likely to extend with its own count, and `:462` holds 2B's list-filter clause right after this plan's sentence. If plan 2B-4 merges first: on `:516` keep 2B-4's count and this plan's clause ("… 17 after plan 2B-2, N after plan 2B-4, and 2C plan 4 deleted …"); on `:462` keep this task's 2C sentences and 2B-4's clause; keep both handoff sections (2B-4's above) and both changelog entries (this one on top); then rerun the check script. It counts tests from the fork with `master`, so 2B-4's own tests do not count, and its other fragments do not depend on 2B-4's files.

**Files:**
- Modify: `DESIGN.md` (CRLF; 8 replacements): §3 Typography, Hierarchy, **Label** (`:288`) · §5 Buttons, **Legacy** (`:374`) · Dialogs, **Busy dialogs** (`:406`, one bullet added after it) and **Sheets** (`:410`) · Inputs / Fields, the **`Field`** bullet (`:450`) and **Migration** (`:462`) · Forms, **`Steps`** (`:482`) · Data Tables (`:516`)
- Modify: `docs/14_UI_UX_DESIGN_SYSTEM.md` (CRLF; 3 replacements): the `Field` row (`:60`), the dialog row (`:88`) and the "Forms and dialogs" registry row (`:115`)
- Modify: `DEVELOPER_HANDOFF.md` (CRLF; 1 replacement): a new section before `## Open Go-Live Decisions` (`:679`)
- Modify: `docs/99_CHANGELOG.md` (CRLF; 1 or 2 replacements): the 2C plan 4 entry at the top (`:7`)
- Not changed: `.impeccable/design.json`, `docs/07_UAT_CHECKLIST.md`, `docs/11_FEATURE_LIST.md`, `src/`, `tests/`, `messages/`, the wiki (Task 21)
- Temp folder only, never committed: `check-docs-2c4.mjs` (Task 21 Step 2 runs it again after a rebase)

**Interfaces:**
- Consumes: Tasks 1–19 committed; `task-19-findings.md` (dev-app check, fixes, accepted mixes, still open); `<temp>/p2c4-guard-state.mjs` from Task 18 Step 9 (save it again from there if it is missing).
- Produces:
  - `DEVELOPER_HANDOFF.md` section `## UI Round 4 Phase 2C Plan 4 Admin, Asset and Login Forms and Dialogs (<today>)` with a `- Dev-app check (Task 19):` bullet, and `docs/99_CHANGELOG.md` entry `### ฟอร์มและ dialog ชุดที่เหลือของผู้ดูแลระบบ ทรัพย์สิน และหน้าเข้าสู่ระบบ (UI รอบ 4 เฟส 2C plan 4)` with a `- **ตรวจบนแอป (Task 19):**` bullet. Task 21 Step 1 adds its verify bullet directly above each.
  - The hand-off that 2C plan 5 reads in its Task 0 (the guard state after batch 4, the last `PENDING_FOOTER_PARTS` entry, the 4 `confirm()` calls without a verb label), the LFG rows 2B plan 5 or 2D lowers, and the boxes and lines left for 2D and the V track.
  - `<temp>/check-docs-2c4.mjs`.

- [ ] **Step 1: Check the base**

Run: `git diff --quiet c2bfbe2 HEAD -- DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md .impeccable/design.json docs/07_UAT_CHECKLIST.md docs/11_FEATURE_LIST.md && echo DOCS-UNCHANGED`
Expected: `DOCS-UNCHANGED` (Tasks 1–19 did not touch them; if a Task 19 fix did, re-read the quoted strings below against the file).

Run: `git ls-files --eol DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md`
Expected: `i/lf    w/crlf` for all four.

Run: `ls docs/superpowers/plans/2026-10-13-ui-phase2c-plan4.md`, then read the `task-19-findings.md` the controller names.
Expected: the plan file exists (the docs link it; if it has another name, see the rulings), and the findings have the five parts of Task 19 Step 9.

Run: `git status --short src tests messages`
Expected: nothing.

Run: `node <temp>/p2c4-guard-state.mjs`
Expected (exit 0), the end state of batch 4 that Steps 6 and 7 describe:
```
LOCAL_FIELD: 0 entries, 0
RAW_FIELDS: 2 entries, 3
FIELD_CLASS_STRINGS: 0 entries, 0
OLD_MARKUP: 0 entries, 0
LOADER2: 10 entries, 13
OLD_HELPERS: 0 entries, 0
REVERSE: 0 entries, 0
CLOSE_LABEL_IS_CANCEL: 0 entries, 0
FIXED_BOTTOM_BARS: 3 entries, 3
CONSTRAINT_FLOORS: 38 entries
MIGRATED_FILES: 61 (batch 4: 18 of 18)
PENDING_FOOTER_PARTS: 1 (maintenance/maintenance-attachments.tsx)
batch 4 holds only what it keeps
```

Run: `node -e "console.log(new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }))"`
Expected: a date such as `2026-10-13`. This is `<today>` in Steps 6 and 7: replace every `<today>` below with it.

- [ ] **Step 2: Write the check script (it fails first).** Save as `check-docs-2c4.mjs` in your temp folder:

```js
// check-docs-2c4.mjs: run from the worktree root. Checks the plan 2C-4 docs edits of Task 20, and that the guard numbers
// and line numbers they give are the ones in the files now (the base numbers come from `git show c2bfbe2:`).
// Reads only. Never commit this file. Optional argument: the base commit (default c2bfbe2).
import { execFileSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync } from "node:fs"

const BASE = process.argv[2] ?? "c2bfbe2"
const PLAN = "docs/superpowers/plans/2026-10-13-ui-phase2c-plan4.md"
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
const batch = (name) => [...(new RegExp(`^\\s+"${name}": \\[([^\\]]*)\\]`, "m").exec(fmgNow)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((match) => match[1])
const BATCH4 = batch("4")
const plural = (n) => `${n} ${n === 1 ? "file" : "files"}`
const budget = (name) => {
  const was = rows(fmgBase, name)
  const now = rows(fmgNow, name)
  return `\`${name}\` ${sum(was)} in ${plural(was.length)} → ${now.length ? `${sum(now)} in ${now.length}` : "none"}`
}
const fieldsNow = rows(fmgNow, "RAW_FIELDS")
const moved = sum(rows(fmgBase, "RAW_FIELDS").filter((row) => BATCH4.includes(row.path))) - sum(fieldsNow.filter((row) => BATCH4.includes(row.path)))
const migrated = [listed(fmgBase, "MIGRATED_FILES").length, listed(fmgNow, "MIGRATED_FILES").length]
const pending = [listed(fmgBase, "PENDING_FOOTER_PARTS").length, listed(fmgNow, "PENDING_FOOTER_PARTS").length]
const emptied = ["LOCAL_FIELD", "FIELD_CLASS_STRINGS", "OLD_MARKUP", "OLD_HELPERS", "REVERSE", "CLOSE_LABEL_IS_CANCEL"]
const swaps = [...block(fmgNow, "BUSY_LABEL_SWAPS").matchAll(/^\s+\[`\$\{C\}([^`]+)`\]: \//gm)].map((match) => match[1])

// The visual guard's R7 rows (tests/visual-foundation-guards.test.ts, VFG) now and at the base.
const r7 = (source) => [...(/^const TABLE_HEADER_FILLS\b[\s\S]*?^\}/m.exec(source)?.[0] ?? "").matchAll(/^\s+(?:\[`\$\{D\}([^`]+)`\]|"([^"]+)"): (\d+),/gm)].map((match) => ({ path: match[1] ? `D/${match[1]}` : match[2], value: match[3] }))
const r7Base = r7(show("tests/visual-foundation-guards.test.ts"))
const r7Now = r7(lf(readFileSync("tests/visual-foundation-guards.test.ts", "utf8")))
const R7_GONE = ["admin/role-permission-form.tsx", "admin/IntegrationClientManager.tsx"].map((path) => `src/components/${path}`)

// The list guard's KEEP rows (tests/list-frame-guards.test.ts, LFG, 2B's file) and the live sites they count.
const lfg = lf(readFileSync("tests/list-frame-guards.test.ts", "utf8"))
const keep = /^const KEEP\b[\s\S]*?^\}/m.exec(lfg)?.[0] ?? ""
const keepRow = (counter, path) => Number(new RegExp(`\\[\`\\$\\{C\\}${path.replace(/[.]/g, "\\.")}\`\\]: (\\d+)`).exec(new RegExp(`^  ${counter}: \\{[\\s\\S]*?^  \\},?`, "m").exec(keep)?.[0] ?? "")?.[1] ?? 0)
const C = "src/components/"
const source = (path) => lf(readFileSync(path.startsWith("src/") ? path : C + path, "utf8"))
const live = {
  "LH1 assets/asset-label-batch-tool.tsx": (source("assets/asset-label-batch-tool.tsx").match(/<h1\b/g) ?? []).length,
  "LH1 assets/asset-scan-search-tool.tsx": (source("assets/asset-scan-search-tool.tsx").match(/<h1\b/g) ?? []).length,
  "LT1 admin/role-permission-form.tsx": (source("admin/role-permission-form.tsx").match(/<th(?:ead)?\b[^>]*(?:\buppercase\b|\bbg-(?:muted|accent)(?![\w/-]))/g) ?? []).length,
  "LV1 admin/IntegrationClientManager.tsx": (source("admin/IntegrationClientManager.tsx").match(/\.toLocaleString\(\)/g) ?? []).length,
}
const lfgFragment = `\`KEEP\` LH1 ${keepRow("LH1", "assets/asset-label-batch-tool.tsx")} of \`assets/asset-label-batch-tool.tsx\` and ${keepRow("LH1", "assets/asset-scan-search-tool.tsx")} of \`assets/asset-scan-search-tool.tsx\`, LT1 ${keepRow("LT1", "admin/role-permission-form.tsx")} of \`admin/role-permission-form.tsx\` and LV1 ${keepRow("LV1", "admin/IntegrationClientManager.tsx")} of \`admin/IntegrationClientManager.tsx\``

// The legacy ActionButton call sites left in src (DESIGN.md §5 Buttons, Legacy).
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? walk(`${dir}/${entry.name}`) : /\.tsx?$/.test(entry.name) ? [`${dir}/${entry.name}`] : []))
const legacy = walk("src")
  .filter((path) => !["src/components/ui/action-button.tsx", "src/lib/design-system.ts"].includes(path))
  .map((path) => ({ path: path.startsWith(C) ? path.slice(C.length) : path, n: (readFileSync(path, "utf8").match(/<ActionButton\b|\bgetActionButtonClasses\(/g) ?? []).length }))
  .filter((row) => row.n > 0)
const legacyFragment = `phase 2D moves their last ${sum(legacy.map((row) => ({ value: row.n })))} call sites (${legacy.map((row) => `\`${row.path}\``).join(" and ")}) to \`Button\` and deletes them.`

// Tests this plan added: test( lines now minus at the fork from master, over the test files that changed. The fork is
// c2bfbe2 until the branch rebases; after a rebase onto 2B-4 it is master, so 2B-4's own tests do not count.
const FORK = git("merge-base", "master", "HEAD").trim()
const changedTests = git("diff", "--name-only", FORK, "--", "tests").split("\n").filter((path) => /^tests\/.*\.test\.(?:ts|mjs|js)$/.test(path))
const tests = (value) => (value.match(/^test\(/gm) ?? []).length
const added = changedTests.reduce((total, path) => total + (existsSync(path) ? tests(readFileSync(path, "utf8")) : 0) - (git("ls-tree", "--name-only", FORK, path).trim() ? tests(lf(git("show", `${FORK}:${path}`))) : 0), 0)

// Line numbers the handoff gives, read from the files now.
const lines = (path) => source(path).split("\n")
const lineOf = (path, literal) => lines(path).findIndex((row) => row.includes(literal)) + 1
const at = (path, literal) => `\`${path}:${lineOf(path, literal)}\``
const bare = (path, literal) => `\`:${lineOf(path, literal)}\``
const ICM = "admin/IntegrationClientManager.tsx"
const PANEL = "assets/asset-import-preview-panel.tsx"
const BATCH_TOOL = "assets/asset-label-batch-tool.tsx"
const CORRECTION = "assets/asset-status-correction-button.tsx"
const CANCEL = "asset-operations/transaction-cancel-dialog.tsx"
const handedOn = [
  `the scope expansion ${at(ICM, "return confirm({ title: labels.confirmScopeExpansion })")}`,
  `${at("disposal/disposal-bulk-approval.tsx", "confirm({ title: copy.discardSelection")} and ${at("disposal/disposal-bulk-execution.tsx", "confirm({ title: copy.discardSelection")}`,
  `the unsaved-changes confirm ${at("master-data/supplier-form.tsx", 'confirm({ title: t("unsavedChangesConfirm")')}`,
  `its delete dialog ${at("maintenance/maintenance-attachments.tsx", "<AccessibleDialog open={Boolean(pendingDeleteId)}")}`,
  `the integration page's error box ${at(ICM, "{error && !editingClient ? (")}`,
  `\`OperationMetric\` ${bare(ICM, "function OperationMetric(")}, \`SummaryCard\` ${bare(ICM, "function SummaryCard(")} and \`StatusBadge\` ${bare(ICM, "function StatusBadge(")}`,
  `the system-role box ${at("admin/role-permission-form.tsx", "bg-info-soft px-3 py-2 text-sm text-info")}`,
  `\`printCount.toLocaleString()\` ${at(BATCH_TOOL, "printCount.toLocaleString()")}`,
  `the status correction panel box ${at(CORRECTION, "rounded-md border border-warning-border bg-background p-4")}`,
  `the blocked box ${at(CANCEL, 'bg-warning-soft p-4" role="status"')}`,
  `the header ${at(PANEL, '<thead className="bg-muted/40">')}`,
  `(${bare(PANEL, "preview.batch.readyRows.toLocaleString()")}–${bare(PANEL, "preview.batch.mappedColumns.toLocaleString()")}, ${bare(PANEL, ".toLocaleString()} KB")}; LV1 4)`,
  `(${bare(PANEL, '{row.values.assetTag || "-"}')}–${bare(PANEL, '{row.values.name || "-"}')}; LV2 2)`,
  `\`SummaryPill\` ${bare(PANEL, "function SummaryPill(")}`,
  `the created-to date ${at(BATCH_TOOL, "<Field label={labels.queueFilterCreatedTo}>")}`,
  `${at(CORRECTION, '<p className="mt-2 text-sm text-danger"><ApiErrorText')} and in the transaction cancel dialog ${at(CANCEL, 'text-sm text-danger" aria-live="polite"')}`,
  `\`close\` (\`D/assets/page.tsx:${lineOf("src/app/[locale]/(dashboard)/assets/page.tsx", 'close: tCommon("close"),')}\`)`,
]
const guardFragments = [
  `\`MIGRATED_FILES\` ${migrated[0]} → ${migrated[1]}`,
  `\`PENDING_FOOTER_PARTS\` ${pending[0]} → ${pending[1]}`,
  ...["LOCAL_FIELD", "RAW_FIELDS", "FIELD_CLASS_STRINGS", "OLD_MARKUP", "LOADER2", "OLD_HELPERS", "REVERSE", "CLOSE_LABEL_IS_CANCEL"].map(budget),
  `\`FIXED_BOTTOM_BARS\` ${sum(rows(fmgNow, "FIXED_BOTTOM_BARS"))} does not move`,
  `\`CONSTRAINT_FLOORS\` (${rows(fmgNow, "CONSTRAINT_FLOORS").length} files) does not move`,
  `\`BUSY_LABEL_SWAPS\` (GB3) now checks all ${swaps.length} of its files`,
  `R7 \`TABLE_HEADER_FILLS\` ${sum(r7Base)} in ${plural(r7Base.length)} at \`${BASE}\` loses the rows of \`admin/role-permission-form.tsx\` and \`admin/IntegrationClientManager.tsx\``,
  lfgFragment,
  `${added} tests in all`,
]
const HANDOFF = "## UI Round 4 Phase 2C Plan 4 Admin, Asset and Login Forms and Dialogs ("
const handoff = section("DEVELOPER_HANDOFF.md", HANDOFF)
const missing = [...handedOn, ...guardFragments, `plan \`${PLAN}\``].filter((fragment) => !handoff.includes(fragment))
const date = /^## UI Round 4 Phase 2C Plan 4 [^\n(]*\((\d{4}-\d{2}-\d{2})\)$/m.exec(text["DEVELOPER_HANDOFF.md"])?.[1] ?? "none"
const ENTRY = "### ฟอร์มและ dialog ชุดที่เหลือของผู้ดูแลระบบ ทรัพย์สิน และหน้าเข้าสู่ระบบ (UI รอบ 4 เฟส 2C plan 4)"
const entry = (() => {
  const start = text["docs/99_CHANGELOG.md"].indexOf(ENTRY)
  if (start < 0) return ""
  const end = text["docs/99_CHANGELOG.md"].indexOf("\n### ", start + ENTRY.length)
  return text["docs/99_CHANGELOG.md"].slice(start, end < 0 ? undefined : end)
})()
const entryFragments = [`\`MIGRATED_FILES\` ${migrated[0]} → ${migrated[1]}`, `\`PENDING_FOOTER_PARTS\` ${pending[0]} → ${pending[1]}`, `ช่องที่เขียนเอง (GF2) ${sum(rows(fmgBase, "RAW_FIELDS"))} → ${sum(fieldsNow)}`, `รวม ${added} test`]
const missingEntry = entryFragments.filter((fragment) => !entry.includes(fragment))

const checks = {
  "every file is CRLF only": files.every((path) => !/(^|[^\r])\n/.test(raw[path])),
  "no <today> or findings marker is left": files.every((path) => none(path, "<today>", "<from task-19-findings.md>", "<จาก task-19-findings.md>")),
  "the plan file the docs link exists": existsSync(PLAN),
  "the guard files hold what the docs say":
    migrated[1] === migrated[0] + BATCH4.length && BATCH4.every((path) => listed(fmgNow, "MIGRATED_FILES").includes(path)) &&
    block(fmgBase, "CONSTRAINT_FLOORS") === block(fmgNow, "CONSTRAINT_FLOORS") && sum(rows(fmgBase, "FIXED_BOTTOM_BARS")) === sum(rows(fmgNow, "FIXED_BOTTOM_BARS")) &&
    emptied.every((name) => rows(fmgNow, name).length === 0) &&
    fieldsNow.map((row) => `${row.path} ${row.value}`).sort().join(", ") === "assets/asset-label-print.tsx 2, audit/audit-scan-room-picker.tsx 1" &&
    listed(fmgNow, "PENDING_FOOTER_PARTS").join() === "maintenance/maintenance-attachments.tsx" &&
    swaps.every((path) => listed(fmgNow, "MIGRATED_FILES").includes(path)) &&
    R7_GONE.every((path) => r7Base.some((row) => row.path === path) && !r7Now.some((row) => row.path === path)) &&
    Object.values(live).every((n) => n === 0),
  "DESIGN.md: no old label spans left in 2C": once("DESIGN.md", "use Meta at weight 500 instead; 2C plan 4 moved the last old label spans and red stars of 2C onto them (guard GF7 `OLD_MARKUP` is empty).") && none("DESIGN.md", "the hand-written labels left in the 2C batch 4 files move to it in plan 4."),
  "DESIGN.md: the ActionButton call sites left": once("DESIGN.md", legacyFragment) && none("DESIGN.md", "phase 2D moves their 10 call sites"),
  "DESIGN.md: an error inside the open dialog": once("DESIGN.md", "- **Errors:** an error from the action of an open dialog shows inside the dialog, as the first thing in its body: `<Notice tone=\"danger\" role=\"alert\">`."),
  "DESIGN.md: sheets are not restyled by callers": once("DESIGN.md", "Callers do not restyle a sheet: no fill, header or title classes, and no `closeLabel` unless the name differs. A line under the title is `SheetDescription` (14px `muted-foreground`)"),
  "DESIGN.md: a field repeated in every card": once("DESIGN.md", "A field repeated in every card of a list keeps the same visible label and adds `aria-describedby` with the id of its card's name"),
  "DESIGN.md: the field counts after plan 4": once("DESIGN.md", `Plan 4 moved the ${moved} fields of batch 4 (the admin, login, report and notification forms, the label batch tool, the status correction, and the bulk update and transaction cancel dialogs) and ends the field work of 2C. The ${sum(fieldsNow)} hand-written fields left stay on purpose:`) &&
    none("DESIGN.md", "That leaves 33 hand-written fields in 14 files of 2C: 30 move in plan 4, and 3 stay on purpose:"),
  "DESIGN.md: Steps users and the R7 rows": once("DESIGN.md", "  - Users: the component install flow (batch 1) and the import wizard (batch 4, where a finished import shows every step done); the disposal request follows in batch 5.", "and 2C plan 4 deleted the rows of the role permission and integration client tables, which took the white 13/500 header (R-e);"),
  "docs/14: plan 4 in the registry, K20 and the dialog error": once("docs/14_UI_UX_DESIGN_SYSTEM.md", `[\`${PLAN_NAME}\`](superpowers/plans/${PLAN_NAME}) sequences plan 4 (batch 4, the admin, login, report and notification forms, the label and scan tools, and the asset dialogs and import panel, run beside plan 2B-4); plan 5 follows. |`, "; a field repeated in every card of a list adds `aria-describedby` with its card's name (K20) |", "; an error of the dialog's own action shows in its body as `Notice tone=\"danger\" role=\"alert\"`, not on the page behind it |") &&
    none("docs/14_UI_UX_DESIGN_SYSTEM.md", "plans 4–5 follow, one per batch."),
  "handoff: the 2C plan 4 section after 2B plan 3 and before Open Go-Live Decisions, with its bullets":
    count("DEVELOPER_HANDOFF.md", HANDOFF) === 1 &&
    before("DEVELOPER_HANDOFF.md", "## UI Round 4 Phase 2B Plan 3 Asset Register (", HANDOFF) &&
    before("DEVELOPER_HANDOFF.md", HANDOFF, "## Open Go-Live Decisions") &&
    ["- **2C plan 5 may start once 2B plan 4 also merges**", "- **Deploy:**", "- **What changed in each file**", "- **The files shared with 2B:**", "- **Messages:**", "- **Guards**", "- **Tests:**", "- **Accepted:**", "- **Handed on to 2C plan 5:**", "- **Handed on to 2D and the V track:**", "- Dev-app check (Task 19):", "- Before/after screenshots:", "- Still open, for a person before the one phase-2 deploy:", "- Next:"].every((literal) => handoff.split(`\n${literal}`).length === 2),
  "handoff: the guard numbers and line numbers are the live ones": missing.length === 0,
  "changelog: the 2C plan 4 entry first under the handoff's date, above the 2B plan 3 entry":
    once("docs/99_CHANGELOG.md", ENTRY) && entry.split("\n- **ตรวจบนแอป (Task 19):**").length === 2 && missingEntry.length === 0 &&
    text["docs/99_CHANGELOG.md"].includes(`\n## ${date}\n\n${ENTRY}\n`) &&
    before("docs/99_CHANGELOG.md", ENTRY, "### ทะเบียนทรัพย์สิน (UI รอบ 4 เฟส 2B plan 3)"),
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

Run: `node <temp>/check-docs-2c4.mjs`
Expected: exit 1. `ok` on the first four lines ("every file is CRLF only", "no <today> or findings marker is left", "the plan file the docs link exists", "the guard files hold what the docs say") and `FAIL` on the other eleven, then the fragments Steps 6 and 7 write:
```
the handoff section lacks these live fragments:
the scope expansion `admin/IntegrationClientManager.tsx:206`
`disposal/disposal-bulk-approval.tsx:327` and `disposal/disposal-bulk-execution.tsx:494`
the unsaved-changes confirm `master-data/supplier-form.tsx:97`
its delete dialog `maintenance/maintenance-attachments.tsx:239`
the integration page's error box `admin/IntegrationClientManager.tsx:396`
`OperationMetric` `:758`, `SummaryCard` `:777` and `StatusBadge` `:792`
the system-role box `admin/role-permission-form.tsx:144`
`printCount.toLocaleString()` `assets/asset-label-batch-tool.tsx:731`
the status correction panel box `assets/asset-status-correction-button.tsx:64`
the blocked box `asset-operations/transaction-cancel-dialog.tsx:143`
the header `assets/asset-import-preview-panel.tsx:326`
(`:279`–`:281`, `:394`; LV1 4)
(`:361`–`:362`; LV2 2)
`SummaryPill` `:408`
the created-to date `assets/asset-label-batch-tool.tsx:433`
`assets/asset-status-correction-button.tsx:76` and in the transaction cancel dialog `asset-operations/transaction-cancel-dialog.tsx:152`
`close` (`D/assets/page.tsx:405`)
`MIGRATED_FILES` 43 → 61
`PENDING_FOOTER_PARTS` 5 → 1
`LOCAL_FIELD` 2 in 2 files → none
`RAW_FIELDS` 33 in 14 files → 3 in 2
`FIELD_CLASS_STRINGS` 30 in 12 files → none
`OLD_MARKUP` 26 in 9 files → none
`LOADER2` 21 in 15 files → 13 in 10
`OLD_HELPERS` 1 in 1 file → none
`REVERSE` 1 in 1 file → none
`CLOSE_LABEL_IS_CANCEL` 1 in 1 file → none
`FIXED_BOTTOM_BARS` 3 does not move
`CONSTRAINT_FLOORS` (38 files) does not move
`BUSY_LABEL_SWAPS` (GB3) now checks all 8 of its files
R7 `TABLE_HEADER_FILLS` 17 in 11 files at `c2bfbe2` loses the rows of `admin/role-permission-form.tsx` and `admin/IntegrationClientManager.tsx`
`KEEP` LH1 1 of `assets/asset-label-batch-tool.tsx` and 1 of `assets/asset-scan-search-tool.tsx`, LT1 2 of `admin/role-permission-form.tsx` and LV1 3 of `admin/IntegrationClientManager.tsx`
19 tests in all
plan `docs/superpowers/plans/2026-10-13-ui-phase2c-plan4.md`
the changelog entry lacks these live fragments:
`MIGRATED_FILES` 43 → 61
`PENDING_FOOTER_PARTS` 5 → 1
ช่องที่เขียนเอง (GF2) 33 → 3
รวม 19 test
```
If "the guard files hold what the docs say" fails, or a fragment differs (a Task 19 fix moved a line, a row or a test), stop and report it before editing: Steps 4, 6 and 7 then use the printed numbers in place of the ones below.

- [ ] **Step 4: `DESIGN.md` (8 replacements)**

(1) §3 Typography, Hierarchy, **Label** (`:288`). Replace:

```
the hand-written labels left in the 2C batch 4 files move to it in plan 4.
```

with:

```
2C plan 4 moved the last old label spans and red stars of 2C onto them (guard GF7 `OLD_MARKUP` is empty).
```

(After Task 18, `LOCAL_FIELD` and `OLD_MARKUP` are empty: no 2C file writes the old label span or red star any more.)

(2) §5 Components, Buttons, **Legacy** (`:374`). Replace:

```
phase 2D moves their 10 call sites to `Button` and deletes them.
```

with:

```
phase 2D moves their last 3 call sites (`src/app/[locale]/(dashboard)/error.tsx` and `reports/report-filter-panel.tsx`) to `Button` and deletes them.
```

(The 3 are `<ActionButton` in `(dashboard)/error.tsx` and in `reports/report-filter-panel.tsx`, plus `getActionButtonClasses(` in the same panel; Task 4 removed the 2 of the review dialog.)

(3) Dialogs, Menus and Confirmation: a new **Errors** bullet after **Busy dialogs** (`:406`). Replace the whole **Busy dialogs** line:

```
- **Busy dialogs:** Pass `busy` while saving; the dialog then ignores Escape, outside clicks and the close button, `AccessibleDialogCancel` is disabled, and the button that started the work stays where it is with `busy`, so focus stays on it.
```

with these two lines:

```
- **Busy dialogs:** Pass `busy` while saving; the dialog then ignores Escape, outside clicks and the close button, `AccessibleDialogCancel` is disabled, and the button that started the work stays where it is with `busy`, so focus stays on it.
- **Errors:** an error from the action of an open dialog shows inside the dialog, as the first thing in its body: `<Notice tone="danger" role="alert">`. A modal hides the page behind it from sight and from screen readers, so a message there is lost; the page shows its own error box only while no dialog is open (the integration client edit dialog, 2C plan 4).
```

(4) Dialogs, Menus and Confirmation, **Sheets** (`:410`). Replace the whole line:

```
- **Sheets:** white (`bg-surface`, like dialog bodies). `SheetHeader` has a bottom line and is 56px tall (`py-4 pr-16`, room for the X), and `SheetTitle` is 16px semibold.
```

with:

```
- **Sheets:** white (`bg-surface`, like dialog bodies). `SheetHeader` has a bottom line and is 56px tall (`py-4 pr-16`, room for the X), and `SheetTitle` is 16px semibold. Callers do not restyle a sheet: no fill, header or title classes, and no `closeLabel` unless the name differs. A line under the title is `SheetDescription` (14px `muted-foreground`), which Radix reads as the sheet's description; a sheet without one passes `aria-describedby={undefined}`. An empty list inside a sheet is an `EmptyNote`, not a dashed box (2C plan 4, O14).
```

(5) §5 Inputs / Fields, the end of the **`Field`** bullet (`:450`). Replace:

```
faint ink never sits on a soft fill (§2, Neutral).
```

with:

```
faint ink never sits on a soft fill (§2, Neutral). A field repeated in every card of a list keeps the same visible label and adds `aria-describedby` with the id of its card's name, which `Field` reads before its own error and hint, so a screen reader says which card the field sets (the severity of each data-quality rule, phase 2C ruling K20).
```

(`Field` builds `aria-describedby` from the child's own value, then its error id, then its hint id, `src/components/ui/field.tsx:39`.)

(6) §5 Inputs / Fields, **Migration** (`:462`). Replace:

```
That leaves 33 hand-written fields in 14 files of 2C: 30 move in plan 4, and 3 stay on purpose: the 2 boxed fields of the label-print toolbar and the room search of the audit room picker.
```

with:

```
Plan 4 moved the 30 fields of batch 4 (the admin, login, report and notification forms, the label batch tool, the status correction, and the bulk update and transaction cancel dialogs) and ends the field work of 2C. The 3 hand-written fields left stay on purpose: the 2 boxed fields of the label-print toolbar (the box, not the control, takes the field border, the white fill, 16px text below `md` and the field's focus look through `focus-within:`, phase 2C ruling K21) and the room search of the audit room picker.
```

The line goes on unchanged ("List-page filters belong to 2B: …"). The numbers are guard GF2 (`RAW_FIELDS`): 32 fields of batch 4 at `c2bfbe2`, 2 left (the label-print toolbar, K21); 3 left in 2C in 2 files with the room search of batch 3 (O20).

(7) §5 Forms: Save Bar, Steps, Sections and Signature, **`Steps`** (`:482`). Replace the line:

```
  - Users: the component install flow (batch 1); the import wizard and the disposal request follow in batches 4 and 5.
```

with:

```
  - Users: the component install flow (batch 1) and the import wizard (batch 4, where a finished import shows every step done); the disposal request follows in batch 5.
```

(8) Data Tables, the paragraph above **`DataTable`** (`:516`). Replace:

```
17 after plan 2B-2; the commit that moves a table deletes its row.
```

with:

```
17 after plan 2B-2, and 2C plan 4 deleted the rows of the role permission and integration client tables, which took the white 13/500 header (R-e); the commit that moves a table deletes its row.
```

- [ ] **Step 5: `docs/14_UI_UX_DESIGN_SYSTEM.md` (3 replacements)**

(1) Shared Components, the `Field` row ("A label with hint and error", `:60`). Replace:

```
; a hint on a status soft fill is `FieldHint` with `className="text-muted-foreground"` |
```

with:

```
; a hint on a status soft fill is `FieldHint` with `className="text-muted-foreground"`; a field repeated in every card of a list adds `aria-describedby` with its card's name (K20) |
```

(2) Shared Components, the dialog row ("A dialog", `:88`). Replace:

```
secondary first, primary last; no `<form>` in a dialog that renders inside another form |
```

with:

```
secondary first, primary last; no `<form>` in a dialog that renders inside another form; an error of the dialog's own action shows in its body as `Notice tone="danger" role="alert"`, not on the page behind it |
```

(3) Current-Surface Registry, the "Forms and dialogs" row (`:115`). Replace:

```
sequences plan 3 (batch 3, the disposal, audit and maintenance dialogs, run beside plan 2B-3); plans 4–5 follow, one per batch. |
```

with:

```
sequences plan 3 (batch 3, the disposal, audit and maintenance dialogs, run beside plan 2B-3); [`2026-10-13-ui-phase2c-plan4.md`](superpowers/plans/2026-10-13-ui-phase2c-plan4.md) sequences plan 4 (batch 4, the admin, login, report and notification forms, the label and scan tools, and the asset dialogs and import panel, run beside plan 2B-4); plan 5 follows. |
```

- [ ] **Step 6: `DEVELOPER_HANDOFF.md` (1 replacement)**

The new section. Replace the line `## Open Go-Live Decisions` (the only one) with the block below, which ends with that same line. Replace `<today>` with the date of Step 1. Write the two `<from task-19-findings.md>` markers from `task-19-findings.md` as the rulings say. If Step 3 printed other numbers, use its fragments in the "Messages", "Guards" and "Tests" bullets and the two "Handed on" bullets.

```
## UI Round 4 Phase 2C Plan 4 Admin, Asset and Login Forms and Dialogs (<today>)

- Branch `feat/ui-phase2c-plan4` (from `master` `c2bfbe2`: 2A, 2C plans 1–3 and 2B plans 1–3 merged, not deployed), built in the git worktree `.worktrees/ui-phase2c-plan4` while plan 2B-4 ran in the main checkout. Spec `docs/superpowers/specs/2026-10-11-ui-phase2c-design.md` §8.9 batch 4 (its §10 rulings I1–I36 override the section files) · plan `docs/superpowers/plans/2026-10-13-ui-phase2c-plan4.md` · canonical values in `DESIGN.md`.
  - Batch 4 is 18 files in `src/components/`: `admin/admin-user-form.tsx`, `admin/role-permission-form.tsx`, `admin/IntegrationClientManager.tsx`, `admin/asset-state-review-dialog.tsx`, `admin/data-quality-rule-form.tsx`, `notifications/notification-center-actions.tsx`, `reports/report-preset-controls.tsx`, `auth/login-form.tsx`, `assets/asset-label-batch-tool.tsx`, `assets/asset-label-print.tsx`, `assets/asset-scan-search-tool.tsx`, `assets/asset-status-correction-button.tsx`, `assets/asset-evidence-drawer.tsx`, `ui/activity-drawer.tsx`, `asset-operations/transaction-cancel-dialog.tsx`, `assets/asset-create-workspace.tsx`, the bulk update dialog of `assets/asset-register-table.tsx` and `assets/asset-import-preview-panel.tsx`. One commit per file (Tasks 1–18); a page that only feeds a component its labels changed in that component's commit (`D/admin/data-quality/page.tsx` in Task 5, `D/assets/page.tsx` and `D/asset-management/import-export/page.tsx` in Task 18).
  - No new primitive, workflow, page, schema, RBAC, migration, dependency or token. No server change. Validation is unchanged (K4): every `required`, `maxLength`, `minLength`, `pattern`, toast and `disabled` gate stays.
- **2C plan 5 may start once 2B plan 4 also merges** (2B spec B7, §8.1): batch 5 replaces the mobile action bars and the bottom padding of the detail pages plan 2B-4 changes (`D/assets/[id]/page.tsx`, `D/maintenance/[id]/page.tsx`, `D/disposal/[id]/page.tsx`, O11) and moves the disposal stepper of `D/disposal/[id]/page.tsx` onto `Steps`. Plans 2C-4 and 2B-4 share no code file; the one that merged second rebased onto `master` in its last task.
- **Deploy:** none: one deploy after all of phase 2 and the user's checks on real devices; `ab1b873` stays the rollback point (no schema change).
- **What changed in each file** (`src/components/`):
  - Every field of the batch is `Field` with `Input`, `NativeSelect`, `Textarea` or `SearchField`: a 13px label, the orange star on required fields, 40px from `md` and 44px with 16px text below. Two exceptions: the login form (`FieldLabel` + `Input`: its tests pin the literal `htmlFor`, and the password frame holds the show-password button) and the label-print toolbar (K21, below). Every checkbox uses `checkboxVariants`. A button that starts work has `busy` and keeps its label (K13: no "กำลังบันทึก...", "กำลังเข้าสู่ระบบ...", "กำลังนำเข้า..." or "..." swaps), so focus stays on it.
  - The four dialogs (the integration client edit dialog, the asset state review dialog, the transaction cancel dialog and the register's bulk update dialog) have the footer part: `AccessibleDialogCancel` first, the primary action last. The three with a form wrap body and footer in `<form className={accessibleDialogFormClasses}>`; the cancel dialog (layout B) runs its confirm on click. None of them passes `closeLabel` any more, so every X reads "ปิด" (the integration dialog's X read "ยกเลิก").
  - `admin/admin-user-form.tsx`: 5 fields; the local `Field` helper is gone; cancel is an outline link and save is `busy`.
  - `admin/role-permission-form.tsx`: 4 fields (a system role's key is grey, not faded); the "ใช้งาน" and "เลือกทั้งโมดูล" rows are 44px; a locked row turns faint with a not-allowed cursor (`has-disabled:`); the permission table header is white 13/500 in sentence case (2B spec R-e); save is `busy`.
  - `admin/IntegrationClientManager.tsx`: the edit dialog's description is the client id in `tag`. A failed save shows `<Notice tone="danger" role="alert">` at the top of the dialog body, and the page's error box renders only while no dialog is open (`error && !editingClient`): before, the message went to the page behind the modal, where nobody saw or heard it. The display name and the two create fields gained the star; the two scope legends use `fieldLabelClasses`; the token acknowledgement row is 44px; create is `busy`; the client table header is white 13/500 (R-e) and the usage numbers go through `formatCount` (R-f); in each row only "แก้สิทธิ์" is a `Button` (outline). The one-time token, its copy button and the dismiss flow did not change.
  - `admin/asset-state-review-dialog.tsx`: the two selects and the reason, which gained the star (its help line is the field's `hint`); the confirm is `default` for "แก้ไข" and `destructive` for "ยกเว้น", with `busy` and no "กำลังบันทึก..."; `ActionButton` left the file.
  - `admin/data-quality-rule-form.tsx`: each rule's severity select has the visible label "ระดับความสำคัญ" and `aria-describedby` pointing at the rule's name (K20); the page passes `severity: t("assetStateReviews.severity")`, an existing key; the enable checkbox row is 44px; save is `busy`.
  - `notifications/notification-center-actions.tsx`: the assignee select is `NativeSelect fieldSize="md"` (O17: 36px from `md` beside the 36px buttons, 44px below) inside its one-line `<label>`, and it shows the disabled look while a change saves.
  - `reports/report-preset-controls.tsx`: the preset name is `Field` + `Input` (`maxLength={60}` kept); the device-only line stays a `<p>` under the row.
  - `auth/login-form.tsx`: "เข้าสู่ระบบ" is `Button busy` (weight 500, no "กำลังเข้าสู่ระบบ..."); the expired-session line is `<Notice tone="info" role="status" aria-live="polite">` and the error box `<Notice tone="danger" role="alert" aria-live="polite">`. The show-password button and the login page frame (phase 3) did not change.
  - `assets/asset-label-batch-tool.tsx` and `assets/asset-scan-search-tool.tsx`: the title is `PageHeader` with the subtitle as meta (2B spec I13). Batch tool: the search is `Field` + `SearchField`, whose `hint` is the 2-character line until the query is long enough; `QueueSelect` (7 calls) and the two dates are `Field` + `NativeSelect` or `Input`; the six buttons are `Button` (remove is a neutral `outline` `icon-sm`, K22). Scan tool: `Field` names `ScannerTextInput id="asset-scan-query"`, and the open button is a `Button`. Their status-line spinners stop under reduced motion.
  - `assets/asset-label-print.tsx` (K21): the two toolbar boxes keep their shape and take the field border, the white fill, 16px text below `md`, 40px from `md` (`md:h-10 md:min-h-0`; they were 44px) and the field's focus look through `focus-within:`; print is `Button busy` with no "กำลังบันทึก..."; the print heading stays 700.
  - `assets/asset-status-correction-button.tsx`: an inline panel, not a dialog. The trigger is an `outline` `Button` with the warning-colored icon; the reason is `Field` + `Textarea`; cancel is `outline` and the submit is `busy` with its label kept.
  - `assets/asset-evidence-drawer.tsx` and `ui/activity-drawer.tsx`: no `closeLabel`, fill or header classes (the sheet's own 56px header and 16px title); the evidence drawer's sub-line is `SheetDescription`; an empty list is an `EmptyNote` (O14).
  - `asset-operations/transaction-cancel-dialog.tsx`: the body part replaced the guessed `max-h-[calc(100dvh-12rem)]` box, so the buttons stay in view; "กลับไปตรวจสอบ" is `AccessibleDialogCancel`; the confirm is `destructive` with `busy`; the reason is `Field` + `Textarea`; the trigger on the document pages is `danger`.
  - `assets/asset-create-workspace.tsx`: the mode toggle is `Segmented` named "วิธีเพิ่มทรัพย์สิน" (`asset.createModeLabel`), with `aria-pressed` on the chosen option.
  - `assets/asset-register-table.tsx`, the bulk update dialog only (O1): 4 fields on `Field` (the reason gained the star); cancel is disabled while saving; the submit is `busy`.
  - `assets/asset-import-preview-panel.tsx` (O13): the five step boxes are `Steps` (S5; a finished import shows every step done); the toggle and "เลือกไฟล์ Excel" are `outline` `Button`s, and choose-file and "ยืนยันนำเข้า" are `busy` with their labels kept; the error box is `<Notice tone="danger" role="alert">`. The `currentStep` label left the panel's props, both pages and the messages.
- **The files shared with 2B:** in `assets/asset-register-table.tsx` the list part, the checkboxes and the bulk-action bar are byte for byte as plan 2B-3 left them; the two asset pages lost only their `currentStep` line. The "Handed on to 2C plan 4" lists of the 2B plan 1, 2B plan 2, 2C plan 3 and 2B plan 3 sections are done.
- **Messages:** new `asset.createModeLabel` ("วิธีเพิ่มทรัพย์สิน" / "How to add assets"); deleted `asset.importWizardCurrentStep` (`Steps` reads "ขั้นตอนปัจจุบัน" from `common.stepCurrent`). The labels the busy buttons no longer read stay in their props and keys (K13, spec §6.5.2): `labels.saving` of the review dialog, `labels.submitting` of the status correction, `labels.importing` of the import panel, `translations.recordingPrint` of the print page and `auth.loggingIn`; and the register page still passes `close` (`D/assets/page.tsx:405`), which its dialog no longer reads.
- **Guards** (`tests/form-migration-guards.test.ts`; total and files per budget, `c2bfbe2` → after this plan):
  - `MIGRATED_FILES` 43 → 61 (the 18 files in task order; every file of batches 1–4 is in) · `PENDING_FOOTER_PARTS` 5 → 1 (`maintenance/maintenance-attachments.tsx`, batch 5) · `CONSTRAINT_FLOORS` (38 files) does not move.
  - `LOCAL_FIELD` 2 in 2 files → none · `RAW_FIELDS` 33 in 14 files → 3 in 2 · `FIELD_CLASS_STRINGS` 30 in 12 files → none · `OLD_MARKUP` 26 in 9 files → none · `LOADER2` 21 in 15 files → 13 in 10 · `OLD_HELPERS` 1 in 1 file → none · `REVERSE` 1 in 1 file → none · `CLOSE_LABEL_IS_CANCEL` 1 in 1 file → none · `FIXED_BOTTOM_BARS` 3 does not move.
  - Kept on purpose: the label-print toolbar's two boxed fields (`RAW_FIELDS` 2, K21; with the room search of batch 3 the last 3) and six spinners outside buttons (I27): the integration manager's status line and rotate button (`LOADER2` 2, 2D), the label batch tool's two status lines (2), the scan tool's status line (1) and the transaction cancel dialog's loading line (1).
  - `BUSY_LABEL_SWAPS` (GB3) now checks all 8 of its files; the 5 of batch 4 dropped their swaps. The register's `OLD_MARKUP` row (6, live 4 after 2B-3) went straight to none.
  - VFG: R7 `TABLE_HEADER_FILLS` 17 in 11 files at `c2bfbe2` loses the rows of `admin/role-permission-form.tsx` and `admin/IntegrationClientManager.tsx` (Tasks 2 and 3); the import panel's row stays under "2C plan 4 or 2D" (2D, below).
  - LFG is not edited (2B's file). Four of its rows now sit above a live count of 0: `KEEP` LH1 1 of `assets/asset-label-batch-tool.tsx` and 1 of `assets/asset-scan-search-tool.tsx`, LT1 2 of `admin/role-permission-form.tsx` and LV1 3 of `admin/IntegrationClientManager.tsx`, and the same `BUDGETS` rows (2B plan 5 or 2D lowers them).
- **Tests:** new `tests/admin-user-form-ui.test.ts`, `role-permission-form-ui`, `data-quality-rule-form-ui` and `asset-status-correction-ui`; one test appended to `integration-api-client-admin`, `asset-state-review-ui`, `notification-topbar-behavior`, `report-presets`, `login-form-ui`, `asset-scan-search-tool`, `asset-transaction-cancellation-ui`, `choice-controls-ui`, `asset-register-table-ui`, `steps-ui` and `asset-register-ux`, and two to `asset-label-print-ui` (Tasks 9 and 10) and `sheet-drawers-ui` (Tasks 13 and 14): 19 tests in all. Edited pins (spec §10.4 table A): `login-form-ui:29-30`, `asset-label-print-ui:155` (it reads the batch tool's hint), `asset-scan-search-tool:43`, `asset-transaction-cancellation-ui:13`, and the two R7 rows of `visual-foundation-guards`.
- **Accepted:**
  - In each integration client row "แก้สิทธิ์" is a 40px `Button` beside three hand-made 44px buttons on desktop until 2D (spec §6.4.1 moves only the edit trigger).
  - Between 640 and 767px the show-password button is 40px wide beside a 44px field (its `sm:` sizes against the field's `md`), and the report preset's save button is 40px beside its 44px field (2D owns that button).
  - The create-mode `Segmented` has no `showCheck` (spec T3), so in forced-colors mode the chosen option differs only by its weight.
  - Rulings this plan made where the spec was silent: the integration error inside the open dialog; `role="alert"` on the import panel's error `Notice`; the login's expired-session line stays `role="status"`; the status correction stays an inline panel with no dialog parts and no `aria-expanded`; the 2B spec's R-e and R-f items of the import panel go to 2D.
- **Handed on to 2C plan 5:** `maintenance/maintenance-attachments.tsx` is the last `PENDING_FOOTER_PARTS` entry: its delete dialog `maintenance/maintenance-attachments.tsx:239` becomes `useConfirm` (K12). The 4 `confirm()` calls still without a verb `confirmLabel` are the scope expansion `admin/IntegrationClientManager.tsx:206` (its title comes from `confirmScopeExpansion` of `D/admin/integrations/page.tsx`), the discard-selection confirms `disposal/disposal-bulk-approval.tsx:327` and `disposal/disposal-bulk-execution.tsx:494` (see 2C plan 3) and the unsaved-changes confirm `master-data/supplier-form.tsx:97`. `FIXED_BOTTOM_BARS` holds the two mobile action bars for `ActionBar` (and the register's bulk-action bar for phase 3).
- **Handed on to 2D and the V track:**
  - The boxes, panels and buttons batch 4 kept (I35, K28): the integration page's error box `admin/IntegrationClientManager.tsx:396`, its token panel, `OperationMetric` `:758`, `SummaryCard` `:777` and `StatusBadge` `:792` (LFG LS1 2 and LN2 1, whose comments say "2C plan 4", but 2C spec §8.9 gives them no row and no tone mapping), and the rotate, disable and enable buttons; the system-role box `admin/role-permission-form.tsx:144`; the data-quality rule cards; the label batch tool's result and queue rows, dashed boxes and scope box, its six `"-"` (label data, R-n) and `printCount.toLocaleString()` `assets/asset-label-batch-tool.tsx:731` (LV1 1); the print page's back link, guidance boxes and result lines; the scan tool's result rows; the status correction panel box `assets/asset-status-correction-button.tsx:64` (and an `aria-expanded` on its trigger); the evidence drawer's tiles, filter buttons and file cards; the activity items; the transaction cancel dialog's facts list and the blocked box `asset-operations/transaction-cancel-dialog.tsx:143`; the import panel's mapping, batch, success and issue boxes and `SummaryItem`; the notification and report-preset buttons; the last 3 `ActionButton` call sites.
  - The import panel's items that the 2B spec left to "2C plan 4 or 2D" (R-e, R-f) go to 2D, because 2C spec O13 lists only the steps, the three buttons and the error box, and the table's head and cells must move together: the header `assets/asset-import-preview-panel.tsx:326` (VFG R7 1, LFG LT1 5), `toLocaleString()` ×4 (`:279`–`:281`, `:394`; LV1 4), the typed `"-"` (`:361`–`:362`; LV2 2) and `SummaryPill` `:408` (LS1 1).
  - The keys and props that K13 left unread (above) go with the tests that pin them (`login-form-ui.test.ts:49`, `:52`; spec §6.13).
  - V track: `min={queueFilters.createdFrom}` on the created-to date `assets/asset-label-batch-tool.tsx:433`. The error lines under the status correction `assets/asset-status-correction-button.tsx:76` and in the transaction cancel dialog `asset-operations/transaction-cancel-dialog.tsx:152` stay as they are (spec §4 ruling 17).
- Dev-app check (Task 19): <from task-19-findings.md>
- Before/after screenshots: `.superpowers/sdd/screenshots/ui-phase2c-plan4/before/` and `after/` in the main checkout (git-ignored, on the development machine only).
- Still open, for a person before the one phase-2 deploy: <from task-19-findings.md>, together with the open checks of phase 1, 2A, 2C plans 1–3 and 2B plans 1–3 above.
- Next: merge this branch (rebase it first if 2B plan 4 merged before it); 2C plan 5 once 2B plan 4 has merged too, beside 2B plan 5; then 2D and the V track (the pipeline of the 2B plan 1 section).

## Open Go-Live Decisions
```

Replace both `<from task-19-findings.md>` markers with the text from the findings; no marker may stay.

- [ ] **Step 7: `docs/99_CHANGELOG.md` (1 or 2 replacements)**

(1) Only if `<today>` is not `2026-10-13`: put a new date block on top. Replace the line `## 2026-10-13` with:

```
## <today>

---

## 2026-10-13
```

(2) The entry, directly under the `## <today>` heading (above `### ทะเบียนทรัพย์สิน (UI รอบ 4 เฟส 2B plan 3)` when `<today>` is 2026-10-13, above `---` otherwise). Replace the heading line `## <today>` (the newest one, the only line with that date) with the block below, which starts with that same heading and ends with the entry's last bullet; the blank line that followed the heading now separates this entry from the next. Write the "ตรวจบนแอป (Task 19)" bullet from `task-19-findings.md`, in Thai, in the shape of the plan 3 entry's bullet (what was checked and where, the results, fixes or "แก้เพิ่ม: ไม่มี", what was accepted, issues not caused by plan 4, and "ยังต้องให้คนตรวจ: …" ending with "รวมกับรายการเปิดของเฟส 1, 2A, 2C plan 1–3 และ 2B plan 1–3 ก่อน deploy ครั้งเดียวตอนจบเฟส 2").

```
## <today>

### ฟอร์มและ dialog ชุดที่เหลือของผู้ดูแลระบบ ทรัพย์สิน และหน้าเข้าสู่ระบบ (UI รอบ 4 เฟส 2C plan 4)

Branch `feat/ui-phase2c-plan4` ใน worktree `.worktrees/ui-phase2c-plan4` (จาก `master` `c2bfbe2` ทำคู่กับ 2B-4) · design `docs/superpowers/specs/2026-10-11-ui-phase2c-design.md` ข้อ 8.9 ชุด 4 (ข้อ 10 ใช้แทนไฟล์ส่วน) · plan `docs/superpowers/plans/2026-10-13-ui-phase2c-plan4.md` · ค่าทั้งหมดอยู่ใน `DESIGN.md`

- **ขอบเขต:** ชุด 4 จำนวน 18 ไฟล์ ไฟล์ละ 1 commit: ฟอร์มผู้ใช้ ฟอร์มบทบาทและสิทธิ์ หน้า Integration API dialog พิจารณาสถานะ กฎคุณภาพข้อมูล ผู้รับผิดชอบในหน้าการแจ้งเตือน ชุดตัวกรองรายงาน หน้าเข้าสู่ระบบ เครื่องมือพิมพ์ป้าย หน้าพิมพ์ป้าย หน้าสแกนค้นหาทรัพย์สิน แก้ไขสถานะ ศูนย์หลักฐานและกิจกรรมของทรัพย์สิน dialog ยกเลิกรายการ ตัวเลือกวิธีเพิ่มทรัพย์สิน dialog อัปเดตหลายรายการของทะเบียน และแผงนำเข้า · ทะเบียนแก้เฉพาะ dialog (ส่วนรายการเป็นของ 2B) · ไม่มีของกลางใหม่ ไม่เปลี่ยนขั้นตอนงาน ไม่แตะฐานข้อมูล ไม่แก้ server ไม่เพิ่ม token · การตรวจกรอกไม่เปลี่ยน (คง `required` / `maxLength` / `minLength` / `pattern` toast และเงื่อนไขที่ปิดปุ่มทุกจุด)
- **ช่องกรอก:** เป็น `Field` กับ `Input` / `NativeSelect` / `Textarea` / `SearchField` ป้าย 13px จอใหญ่สูง 40 มือถือสูงอย่างน้อย 44 ตัวอักษร 16px · ช่องที่บังคับกรอกมีดอกจัน (ชื่อแสดงและช่องสร้าง client ของ Integration API เหตุผลใน dialog พิจารณาสถานะ เหตุผลใน dialog อัปเดตหลายรายการ) · หน้าเข้าสู่ระบบใช้ `FieldLabel` กับ `Input` ปุ่มแสดงรหัสผ่านคงเดิม · ระดับของกฎคุณภาพข้อมูลมีป้าย "ระดับความสำคัญ" และโปรแกรมอ่านหน้าจออ่านชื่อกฎต่อท้าย · ผู้รับผิดชอบในหน้าการแจ้งเตือนสูง 36 เท่าปุ่มข้าง ๆ (มือถือ 44) · กล่องหมายเหตุและขนาดเทปบนหน้าพิมพ์ป้ายคงแบบกล่อง ได้ขอบและพื้นแบบช่อง วงโฟกัสทั้งกล่อง สูง 40 ตั้งแต่ md (เดิม 44) · checkbox แบบกลาง แถว "ใช้งาน" "เลือกทั้งโมดูล" ยอมรับ token และเปิดใช้กฎสูง 44
- **ปุ่มและ dialog:** ปุ่มที่เริ่มงานอยู่ที่เดิมพร้อมไอคอนหมุน ป้ายไม่เปลี่ยน โฟกัสไม่หลุด (เลิก "กำลังบันทึก..." "กำลังเข้าสู่ระบบ..." "กำลังนำเข้า...") · dialog ของ Integration API พิจารณาสถานะ ยกเลิกรายการ และอัปเดตหลายรายการใช้ส่วนท้ายแบบกลาง ปุ่มไม่เลื่อนหาย มือถือปุ่มยกเลิกอยู่บน · X อ่าน "ปิด" ทุกตัว (ของ Integration API เคยอ่าน "ยกเลิก") · บันทึกสิทธิ์ของ client ไม่สำเร็จ ข้อความแสดงใน dialog (เดิมไปอยู่หลัง dialog มองไม่เห็น) · "ยกเว้น" ยืนยันด้วยปุ่มแดงทึบ · ปุ่มเปิด "ยกเลิกรายการ" เป็นปุ่มขอบแดง · "แก้ไขสถานะ" เป็นปุ่มขอบ ไอคอนสีเตือน
- **หน้าและแผง:** เครื่องมือพิมพ์ป้ายและหน้าสแกนค้นหาใช้หัวหน้าแบบกลาง (600) หัวเรื่องบนหน้าพิมพ์ยังหนา 700 · ตัวเลือก "เพิ่มทีละรายการ" / "เพิ่มเป็นชุด" เป็น `Segmented` ชื่อกลุ่ม "วิธีเพิ่มทรัพย์สิน" · แผงนำเข้า: กล่องขั้นตอน 5 กล่องเป็นแถบขั้นตอนแบบกลาง (มือถือมีบรรทัดเดียว "ขั้นที่ 1 จาก 5 · แม่แบบ") นำเข้าเสร็จแล้วทุกขั้นแสดงว่าเสร็จ · error เป็นกล่องแจ้งแบบกลางที่โปรแกรมอ่านหน้าจออ่านทันที · หน้าเข้าสู่ระบบ: บรรทัด session หมดอายุเป็นบรรทัดข้อมูล error เป็นกล่องสีแดงแบบกลาง · drawer หลักฐานและกิจกรรมใช้หัวแบบกลาง (56px) ไม่มีข้อมูลเป็นบรรทัดจาง ไม่มีกล่องเส้นประ · หัวตารางสิทธิ์และตาราง client พื้นขาว 13px ไม่ใช้ตัวพิมพ์ใหญ่ ตัวเลขการใช้งานจัดรูปแบบไทย
- **ข้อความ:** เพิ่ม `asset.createModeLabel` ("วิธีเพิ่มทรัพย์สิน" / "How to add assets") · ลบ `asset.importWizardCurrentStep` (แถบขั้นตอนอ่าน "ขั้นตอนปัจจุบัน" จาก `common.stepCurrent`) · key ที่ปุ่ม busy ไม่อ่านแล้วยังคงไว้ (K13)
- **guard:** `form-migration-guards`: `MIGRATED_FILES` 43 → 61 · `PENDING_FOOTER_PARTS` 5 → 1 · ช่องที่เขียนเอง (GF2) 33 → 3 · `LOCAL_FIELD` `FIELD_CLASS_STRINGS` `OLD_MARKUP` `OLD_HELPERS` `REVERSE` `CLOSE_LABEL_IS_CANCEL` ว่าง · คงไว้ตั้งใจ: 2 ช่องในกล่องของหน้าพิมพ์ป้าย และไอคอนหมุนนอกปุ่ม 6 จุด · `CONSTRAINT_FLOORS` ไม่ลด · VFG R7 ลบแถวตารางสิทธิ์และตาราง client · ไม่แก้ `list-frame-guards` (4 แถวของไฟล์ชุดนี้นับจริงเหลือ 0 ให้ 2B-5 หรือ 2D ลด)
- **test:** ใหม่ `admin-user-form-ui` `role-permission-form-ui` `data-quality-rule-form-ui` `asset-status-correction-ui` · เพิ่มใน 13 ไฟล์ (`asset-label-print-ui` และ `sheet-drawers-ui` ไฟล์ละ 2) รวม 19 test · แก้ pin `login-form-ui:29-30` `asset-label-print-ui:155` `asset-scan-search-tool:43` `asset-transaction-cancellation-ui:13` ตามสเปกข้อ 10.4 ตาราง A และแถว R7 ของ `visual-foundation-guards`
- **deploy:** ไม่ deploy · deploy ครั้งเดียวหลังเฟส 2 ทั้งหมดและผู้ใช้ตรวจเครื่องจริง · ถอยกลับไป `ab1b873` ได้เพราะไม่มี schema เปลี่ยน
- **ตรวจบนแอป (Task 19):** <จาก task-19-findings.md>
- ภาพก่อน/หลัง: `.superpowers/sdd/screenshots/ui-phase2c-plan4/before/` และ `after/` ใน checkout หลัก (git ignore อยู่บนเครื่องพัฒนา)
- ต่อไป: merge (ถ้า 2B-4 merge ก่อนให้ rebase ก่อน) · 2C plan 5 เริ่มได้เมื่อ 2B-4 merge แล้วด้วย ทำคู่กับ 2B-5 · แล้ว 2D · งาน V
```

Replace the `<จาก task-19-findings.md>` marker with the text from the findings, and every `<today>` with the date; no marker may stay.

- [ ] **Step 8: `.impeccable/design.json` and `docs/11_FEATURE_LIST.md`: no change**

No component entry and no feature row changes in batch 4 (see the rulings): leave both files, and the `generatedAt` of `design.json`, as they are.

Run: `git diff --quiet c2bfbe2 -- .impeccable/design.json docs/11_FEATURE_LIST.md docs/07_UAT_CHECKLIST.md && echo NOT-CHANGED`
Expected: `NOT-CHANGED`.

- [ ] **Step 9: Check**

Run: `node <temp>/check-docs-2c4.mjs`
Expected: 15 `ok` lines, exit 0, and no "lacks these live fragments" list.

Run: `grep -n "<from task-19\|<จาก task-19\|<today>" DESIGN.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md docs/14_UI_UX_DESIGN_SYSTEM.md`
Expected: nothing.

Run: `git diff --numstat`
Expected: exactly the four files: `DESIGN.md` `8 7` (7 lines changed and the **Errors** bullet added), `docs/14_UI_UX_DESIGN_SYSTEM.md` `3 3`, `DEVELOPER_HANDOFF.md` about `52 0` (the findings change the count), `docs/99_CHANGELOG.md` about `16 0` (`20 0` with a new date block). A file that shows every line changed was normalized: restore its line endings.

Run: `node -e "for (const f of process.argv.slice(1)) { const s = require('fs').readFileSync(f, 'utf8'); console.log(f, (s.match(/\r\n/g) || []).length, (s.match(/\n/g) || []).length) }" DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md`
Expected: the two numbers equal on every line (CRLF throughout).

Run `npm test`, `npx tsc --noEmit` and `npm run lint`.
Expected: all green, with the test count after Task 19 (1970 tests, 1969 pass, 1 skipped, if Task 19 added no test). `tests/audit-round-cancellation.test.ts` reads the handoff and the changelog (both must still mention the round cancellation and that earlier audit work is preserved; the older sections still do); no other test reads these four files.

- [ ] **Step 10: Commit**

```bash
git add DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md
git commit -m "docs(ui): phase 2C plan 4 forms and dialogs, field counts and hand-off in DESIGN.md, design-system index, handoff and changelog

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 4 files in the commit (`git show --stat HEAD`). `git status --short` prints nothing (the worktree has no untracked files; `node_modules/`, `src/generated/` and `.env` are ignored).

---

### Task 21: Final verification, rebase if needed, wiki and memory (controller runs this task)

**Files:**
- Modify: `docs/99_CHANGELOG.md`, `DEVELOPER_HANDOFF.md` (verify numbers)
- Modify (vault `D:\Obsidian\Eltross`): `AssetSystem/ams-status.md`, `AssetSystem/ams-log.md`, `AssetSystem/ams-open-questions.md`
- Modify (auto-memory): `review-2026-10-priorities.md`

**Interfaces:**
- Consumes: Tasks 1–20 committed in the worktree.
- Produces: the branch ready for superpowers:finishing-a-development-branch, and the worktree removed after the merge.

- [ ] **Step 1: Verify.** From the worktree:
  - Run `npm run verify` and record the test count and the build page count.
  - If it passed, add one bullet to the 2C plan 4 entry in `docs/99_CHANGELOG.md`, directly above its "ตรวจบนแอป (Task 19)" bullet: `` `npm run verify` ผ่าน (test N · ผ่าน N · ข้าม 1 · build X/X หน้า) ``.
  - Add the same numbers to the 2C plan 4 section of `DEVELOPER_HANDOFF.md`, directly above its "Dev-app check (Task 19)" bullet: ``- Verification: `npm run verify` passes (tests N · pass N · skipped 1 · build X/X pages).``
  - Both files are CRLF: insert with an exact-string edit that writes `\r\n` (a Node script; `sed -i` in Git Bash writes LF).
  - Run `npm test` again (`tests/audit-round-cancellation.test.ts` reads both files).
  - Commit both files with `docs(ui): record phase 2C plan 4 verify results` and the Co-Authored-By line.

- [ ] **Step 2: Rebase if plan 2B-4 merged first (2B spec §8.2).** From the worktree run `git merge-base --is-ancestor master HEAD && echo UP-TO-DATE`.
  - If it prints `UP-TO-DATE`, skip to Step 3.
  - Otherwise `master` moved (plan 2B-4 merged). Run `git rebase master` in the worktree and resolve conflicts by 2B spec §8.2:
    - `DESIGN.md`: keep both sides; where both touched the same line, write it so it matches the code after both merges.
    - `tests/visual-foundation-guards.test.ts`: keep both sides; a budget row both lowered takes the lower number; never raise.
    - `messages/th.json`, `messages/en.json`: take `master`'s version, then re-run this plan's change files (`node scripts/messages-edit.mjs <temp>/<change file>` for `asset.createModeLabel` and the `asset.importWizardCurrentStep` deletion, in task order).
    - `DEVELOPER_HANDOFF.md` (chronological: the section that merged first stays above), `docs/99_CHANGELOG.md` (newest entry on top under its date), `docs/14_UI_UX_DESIGN_SYSTEM.md`, `docs/11_FEATURE_LIST.md`: keep both sides; adjacent table rows keep each side's own row.
    - A conflict in any other file means a fence leaked: abort the rebase (`git rebase --abort`), find the commit that touched the other plan's file, and stop to report.
  - After the rebase: run `node <temp>/check-docs-2c4.mjs` (Task 20) and, if it prints other line fragments, update the handoff text it names (new commit); then `npm run verify`, the production build from the worktree, and the dialogs of Task 19 Step 4 once more at 1440 and 375 (cancel only), above all the four that render on `/th/assets/<id>` (2B-4 changed that page). Update the verify numbers of Step 1 if they changed (new commit).

- [ ] **Step 3: Wiki.** Read `AssetSystem/_schema/ams-wiki-schema.md` first, then:
  - `ams-status.md`: the 2C row says plan 4 is built on `feat/ui-phase2c-plan4` (worktree) with the verify numbers, not merged, not deployed, and that 2C plan 5 may start once both plan 4 and 2B-4 have merged. Fix any sentence the row now contradicts (rule 8).
  - `ams-log.md`: an entry at the top of `## <today>`.
  - `ams-open-questions.md`: the plan-4 checks for a person from Task 19 Step 8 (one new numbered item, also added to the list in item 27) · anything Task 19 recorded as found but not caused by plan 4.
  - Run `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` from `D:\Obsidian\Eltross`.
  - Commit only those three files with an `ingest:` message. Other sessions have uncommitted changes in the vault; never stage them.

- [ ] **Step 4: Memory.** Update `review-2026-10-priorities.md`: 2C plan 4 built on `feat/ui-phase2c-plan4` in the worktree, not merged, not deployed; the state of 2B-4; next: the merge choice, then 2C plan 5 once both have merged.

- [ ] **Step 5:** Use superpowers:finishing-a-development-branch. While the main checkout holds plan 2B-4's branch, a local merge fast-forwards `master` without a checkout (`git fetch . feat/ui-phase2c-plan4:master` from the main checkout), then runs the tests on the merged result in the worktree. After the merge, remove the worktree from the main checkout with `git worktree remove .worktrees/ui-phase2c-plan4` (its `.env` copy goes with it, I30) and `git worktree prune`; if Windows refuses to delete the emptied folder, `rmdir` it once no process holds it.

