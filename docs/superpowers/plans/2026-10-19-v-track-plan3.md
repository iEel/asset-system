# V Track Plan 3 Implementation Plan: the system settings form and its prefix editor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the third plan of the V track, "errors under the field" (`docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md`, the user's decisions U1–U9), on the foundation of plans 1 and 2 as merged at `f1ae1828`. After it:
- the system settings form (spec §5 #45, `src/components/admin/system-settings-form.tsx`, 11 tabs) shows every setting's error under its field, never as a validation toast: its 12 validation toasts go, a save opens the tab of the first wrong setting (spec §4.2, U1), opens a closed `<details>` that holds it, and focuses it; a refusal of the server (`fieldErrors` keyed `settings.<key>`, plan 1 S-R4) lands on the same field and the same tab (G1, G2; Tasks 1–3);
- the 13 live `ValidationMessage` boxes (spec U8) move under their fields and stay live: the 12 of the page become each setting's own error, read once through `Field liveError`, and the prefix editor's box becomes the prefix field's error (Tasks 3, 4); a save shows nothing twice;
- the form and the server speak one rule set: a new pure module `src/lib/system-settings-field-rules.ts` answers, setting by setting, the code the server's `systemSettingsUpdateSchema` answers (its api-error catalog key, or `tooLong`), and restates what the controls allowed before `noValidate` (min, max, step); a test runs it against the server's schema on the same values (Task 1);
- the prefix editor (spec §5 #46: the `AccessibleDialog` inside the settings form) checks its prefix and its categories when its save is pressed, its save is no longer disabled, and its errors sit under the prefix and under the category lists (Task 4); the settings form joins `V_FORMS`, so `V_FORMS` equals `V_SCOPE` (44 files);
- the two gates of the page that hide their reason say it: the save while nothing changed and the LDAP sync apply before a preview are `aria-disabled`, tied by `aria-describedby` to the visible line that says why (spec §4.4; Task 5);
- the eleven group sentences that only the boxes and toasts read are retired (Task 6): each setting now reads its own sentence (`apiErrors.*`), the one the server already sends.

No migration, no database write, no schema change, no new dependency, no server change at all (spec §6.3: the route and its schema stay as plan 1 left them). Not in this plan: `DESIGN.md`'s form-error rule, docs/14, `.impeccable/design.json`, one shared whole-number rule (plan 2 X-R2) and the label print queue's two print buttons (plan 2 open issue 16): the track's final plan.

**Architecture:**
- **One file, six tasks, in this order**, each one commit with its test and every pin or guard edit it causes; the tree is green after every commit:
  - **Task 1 (ST1)** the rules module and the depreciation policy's tab (`src/lib/system-settings-field-rules.ts` new; `src/lib/settings-search.ts`);
  - **Task 2 (ST2)** the parts of the form that cannot show an error yet take an id and an error: the switch line (`ToggleField`), the label name choice (`LabelAssetNameModeField`, now a `FieldGroup`), the nine fields of each tape panel (`LabelTemplatePanel errorFor`), and the depreciation builder's JSON (`jsonId`, `jsonError`; the JSON's closed section opens while the JSON is invalid);
  - **Task 3 (ST3)** the form itself: `noValidate`, `validate()`, the hook, the field table in visual order, focus with the tab switch, the server's refusals, every field's error, the 12 toasts and the 12 page boxes gone;
  - **Task 4 (ST4)** the prefix editor, the last of the file's two forms, and the file's `V_FORMS` row;
  - **Task 5 (ST5)** the two gates;
  - **Task 6 (ST6)** the retired sentences.
- **Hard dependencies:** each task needs the one before (one test file, appended in order; Tasks 2–6 edit the file the task before left). Task 3 needs Task 1's module and Task 2's props; Task 4 needs Task 3's hook and `isValidCategoryPrefix` import; Task 6 needs Tasks 3 and 4 (the last readers of the sentences go there).
- **Task ids:** "ST1"…"ST6" in test names and commit messages ("(v-track plan 3 task 3, ST3)"). Rulings of this plan are `ST-R1`…`ST-R11`; a bare `S-R*`, `F-R*`, `M-R*` is plan 1's, a bare `A-R*`, `O-R*`, `U-R*`, `D-R*`, `MT-R*`, `P-R*`, `X-R*` plan 2's.
- **Branch:** `feat/v-track-3` from `master` at `f1ae1828`, in the main checkout `D:/Antigravity/asset-system`. No worktree.
- **Tests:** one new LF test file, `tests/v-track3.test.ts`, one test per task (Task 1 creates it, Tasks 2–6 append). Task 8 appends one test to `tests/v-track-docs.test.ts`.
- **Controller tasks:** Task 0 (branch, baseline, counts, before evidence), Task 7 (verify, production build, dev-app check), Task 9 (final verification, wiki, memory, merge). Task 8 (the docs) is an implementer task; it stops if Task 7's findings file is missing. In Tasks 0 and 7 **no request but a GET reaches the server**: the settings save (`PUT /api/admin/settings`) writes `system_settings`, so it is always fulfilled with a stand-in or aborted, never continued; so are the LDAP test and sync (`POST`), which reach the directory.

**Tech Stack:** Next.js 16.4 App Router · React 19 · Tailwind CSS 4 · next-intl 4 · zod 4.4.1 · Prisma 7 (not changed) · `node --test` with Node 24 type stripping (strip-only: no parameter properties, no enums in modules tests import). No new dependency.

**Spec:** `docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md` (approved by the user, 2026-10-17). **Foundation contract:** `docs/superpowers/plans/2026-10-17-v-track-plan1.md` and `docs/superpowers/plans/2026-10-18-v-track-plan2.md` (merged at `f1ae1828`): their Global Constraints, FIXED INTERFACES 1–12 as amended, and rulings (plan 1 S-R1–S-R13, F-R1–F-R10, M-R1–M-R14; plan 2 R1–R8 with A-R*, O-R*, U-R*, D-R*, MT-R*, P-R1–P-R10, X-R1–X-R5) bind every task here. The real code they shipped is what the tasks build on: `src/lib/field-errors.ts` (`settingFieldKeyFor`, `issuesToFieldErrors`), `src/lib/field-error-client.ts`, `src/lib/validation-rules.ts` (`required`, `range`, `step`, `atLeastOne`, …), `src/lib/field-focus.ts` (`focusField` opens a closed `<details>`; `waitForElement`), `src/components/ui/use-field-errors.ts` (`focusFirst(order, { idFor, reveal })`, `useValidationMessage`), `src/components/ui/field.tsx` (`liveError`), `src/components/ui/field-group.tsx`, `tests/validation-guards.test.ts` (`V_SCOPE`, `V_FORMS`, `NON_VALIDATION_TOASTS`, V1–V5).
- **What this plan covers:** spec §5 #45 and #46, §4.1–§4.5 for them (§4.2's "settings tabs" in full), U8 for the 13 settings boxes and the prefix editor, §6.1's `settings.<key>` keys on the client, §11 calls 1, 2, 3 and 7 for this form. "Spec coverage" near the end maps each section to its task.
- **Left to the builder (§10), decided here:** the per-form field order (`SETTING_FIELD_IDS`, ST-R4), how the tab switch is the hook's `reveal` (ST-R4), how the live boxes become live field errors (ST-R3), the split (six tasks, ST-R10).
- **Line numbers** are of `f1ae1828` in every "Changes" table. Tasks 2–6 edit the file the task before left, so find every site by its quoted text: every exact old text below occurs once in the file at the moment its task applies it (the rehearsal checked each).

`c/` = `src/components/` · `D/` = `src/app/[locale]/(dashboard)/` · `<temp>` = `C:/Users/Eltross/AppData/Local/Temp/claude/D--Antigravity-asset-system/f250ea8d-3040-422b-ad7a-15dd9aed94b9/scratchpad/v3-plan` (the controller hands the path to every implementer; message change files go to `<temp>/changes/`) · `<tools>` = `<temp>/tools` (`eol.mjs` prints, per file, its CRLF count, its line count and its path; `counts.mts` prints the track's counts; both read-only, run with the repo root as the working directory).

**Rehearsal (done, 2026-10-19).** The plan was drafted in a scratch clone and then replayed task by task from this text, as an implementer follows it:
- **Clone:** `<temp>/sim`, `git clone --no-hardlinks D:/Antigravity/asset-system` at `master` `f1ae1828`, `core.autocrlf=true`; every working-tree line ending set to the real checkout's file by file (`git ls-files --eol` compared; 612 files rewritten byte for byte from the real checkout's working tree, no content change, `<tools>/fix-eol.mjs`); its own `node_modules` by `npm ci`, then `npx prisma generate` (npm ci ran no install scripts, and two audit tests import `@prisma/client`; no `.env` in the clone). Base: `npm test` 2292 tests, 2291 pass, 0 fail, 1 skipped; `npx tsc --noEmit` clean; `npm run lint` 0 errors, 146 warnings (all under `.agents/`).
- **Draft** on branch `v3-draft`; the exact edits below were cut from it, and `<tools>/check-blocks.mjs` applied every edit of Tasks 1–6 to `f1ae1828`'s files and compared each file with the draft: identical.
- **Replay** on branch `v3-dry` from `f1ae1828`, by `<tools>/replay.mjs`, which reads this file: Step 1's block appended (or created) byte for byte, Step 2 run, Step 3's created files, change files and exact edits applied from this text, the "after Step 3" list run, Step 4's exact edits applied, Step 5's commands run and its eol numbers measured, Step 6's `git add` and commit. Sim commits: Task 1 `e841d208` · Task 2 `fe29d530` · Task 3 `685a7d44` · Task 4 `a946f0ed` · Task 5 `ee8af3e3` · Task 6 `d4571bc2` · Task 8 `a24f89b1` (on top of Task 6, with one placeholder sentence in each findings and answers marker and `<today>` 2026-10-19, so C1; C1b was not rehearsed).
- **Results:** every Step 2 failed with the test and message it names; every "after Step 3 and before Step 4" list failed exactly as listed; every task ended at the count of "Counts" below, 0 fail, 1 skipped; `tsc` clean; lint 0 errors and 146 warnings; every eol number of every Step 5 as printed; every edited file kept its working-tree endings; `tests/v-track3.test.ts` and `src/lib/system-settings-field-rules.ts` are LF. End state after Task 6: `npm test` **2298 tests, 2297 pass, 0 fail, 1 skipped**; `counts.mts`: toasts outside a catch in `src` 22 in 10 files, `<form … noValidate>` 47, 4083 leaf keys per locale, `V_FORMS` 44, `SELECT_STAR_ONLY` 0 in 0, FMG `STAR_ONLY` `new Set<string>([])`.
- **Text replay:** after the measured numbers were written in, `<tools>/text-replay.mjs` read this file back and applied each task's Steps 1, 3 and 4 to the previous sim commit's files: every file each task touches equals that task's sim commit (the messages excepted: `messages-edit.mjs` writes them from the change files printed here).
- **Final review (2026-10-19):** one change of code after the replay: Task 3's `reveal` sends an advanced setting to the advanced tab whatever its key's prefix (ST-R4; edit 14 and one line of Task 3's test, the same line counts). It was applied on branch `v3-critic` (`39398e42`, on top of the Task 8 commit): `tests/v-track3.test.ts` 6 of 6, `npx tsc --noEmit` clean, eslint clean on both files, `npm test` 2299 tests, 2298 pass, 0 fail, 1 skipped (the Task 8 count), eol `2639 2639` and `0 337` (unchanged). A cumulative text replay (Tasks 1–6 of this file applied in order to `f1ae1828`) gives `v3-critic`'s files exactly (messages aside). Every count, eol number and Step 2 message of the tasks is unchanged; Task 3's commit differs from `685a7d44` in those three lines only, and its own test passes there (checked on `685a7d44` with the change).
- **Not covered by the rehearsal:** the form running in React (no dev server, no browser: the dev server and the build read `.env`) and the production build; Task 7 covers both.

**Base:** `master` at `f1ae1828` (V track plans 1 and 2 merged and pushed; phase 2D and Dark Mode merged; nothing deployed).

## Global Constraints

- **Git:**
  - Work in the main checkout `D:/Antigravity/asset-system` on branch `feat/v-track-3`, which holds `f1ae1828` and this plan's commit (`docs/superpowers/plans/2026-10-19-v-track-plan3.md`).
  - Never run `git checkout`, `git switch`, `git reset`, `git stash`, `git rebase` or `git clean`, never touch `master`, never push. (A branch switch or a stash rewrites working-tree line endings: plan 2's rehearsals and this one saw it.)
  - Commit only the files your task names. Use `git add <paths>` (quote paths with brackets or parentheses) and never a bare `git add -A` or `git add .`.
  - The checkout has untracked folders and files that are not yours: `.codex/`, `.impeccable/config.json`, `.impeccable/critique/`, `.playwright-mcp/`, `.superpowers/brainstorm/` and `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`; another session may add `.claude/` while its preview server runs. Leave them alone. The local branch `fix/asset-partial-save` (`ede37dd0`, one commit on `f1ae1828`, not merged) is another piece of work: this plan does not touch it (see "Open issues", 12).
  - End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (each Step 6 passes it as a second `-m`).
- **Next.js 16.4** is not the Next.js in your training data. This plan uses one Next behaviour beyond plan 1's and 2's: the tab switch is the form's existing `selectTab`, `window.history.replaceState`, which Next syncs with `useSearchParams` (`node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`, "Native History API", "`window.history.replaceState`"; read it before changing how a tab is chosen). No route changes.
- **Repo facts:** React 19; Tailwind 4; next-intl 4; zod 4.4.1; Prisma 7; `npm test` runs `node scripts/run-tests.mjs` over `tests/**/*.test.{ts,mjs,js}`; tests import `.ts` with relative imports and read `.tsx` as text; a test that must load a module with `@/` imports registers a resolve hook for `@/` (as `tests/v-track-s.test.ts` does; Task 1's header does the same); `tsconfig.json` includes `**/*.ts`, so tests are type-checked.
- **Line endings** (`git ls-files --eol` in the real checkout at `f1ae1828`; `git config core.autocrlf` is `true`):
  - **CRLF (`i/lf w/crlf`)**: every existing file this plan edits, 15 in all: `src/components/admin/system-settings-form.tsx` (2612 lines), `src/components/admin/depreciation-policy-builder.tsx` (432), `src/app/[locale]/(dashboard)/admin/settings/page.tsx` (365), `src/lib/settings-search.ts` (45), `messages/th.json` and `messages/en.json` (4275 each), `tests/settings-depreciation-policy-ui.test.ts` (103), `tests/settings-tab-persistence-ui.test.ts` (27), `tests/validation-guards.test.ts` (224), `tests/accessible-dialog.test.ts` (104), `tests/admin-sweep-ui.test.ts` (179), `tests/sticky-form-footer-ui.test.ts` (56), and Task 8's `DEVELOPER_HANDOFF.md` (1142), `docs/99_CHANGELOG.md` (1946), `tests/v-track-docs.test.ts` (59).
  - **New and LF:** `src/lib/system-settings-field-rules.ts` (Task 1), `tests/v-track3.test.ts` (Task 1, appended by Tasks 2–6).
  - No mixed file is edited.
  - Before you edit a file, run `git ls-files --eol <file>` and keep what it shows. In Git Bash, `grep -c $'\r'` reports 0 even for CRLF files: do not use it as a check. `git add` of an LF working-tree file prints "LF will be replaced by CRLF the next time Git touches it": expected and harmless; do not renormalize.
  - Keep each file's line endings: edit with exact-string replacement (the Edit tool keeps them), never a formatter, never `sed -i` (it writes LF in Git Bash). Write new files and appended test blocks with a file tool, never a shell heredoc or `node -e`: the drafting of this plan lost a backslash and turned `\b` into a backspace through both.
  - **Never write a test that asserts working-tree line endings.** Tests that read source files strip `\r` before multi-line regexes.
  - Check line endings with `node <tools>/eol.mjs <file>…`: a CRLF file prints the same number twice; an LF file prints 0 and then its line count.
- **How to read a task** (as in plans 1 and 2):
  - **Changes at f1ae1828** is a table of the sites: the line, what is there now, what it becomes, and the rule. The exact edits that follow it are the rehearsed text: applied in order, each old text occurs once in the file at that moment, and they give the rehearsal commit byte for byte. Where a row and an exact edit differ, the exact edit wins.
  - **Step 1 code blocks are exact:** create or append them byte for byte. "Append" adds the block at the end of the file; the first line of a block shown empty is the blank line before it.
  - **Pin edits and guard edits** are exact old → new strings; each old string occurs once in its file.
  - **A comment a row adds is source the tests read.** It must not contain a string a task's `doesNotMatch` forbids (for example the words `ValidationMessage`, `hasInvalid` or a retired message key).
  - **Counts.** Each task's `npm test` numbers are the full totals after the task (below). A total that differs means stop and report, with the task's own delta (+1 for every task).
- **Counts on this plan's chain** (tests / pass / fail / skipped): base 2292 / 2291 / 0 / 1 · Task 1 2293 · Task 2 2294 · Task 3 2295 · Task 4 2296 · Task 5 2297 · Task 6 2298 · Task 8 2299 (pass one fewer, 0 fail, 1 skipped). Messages (leaf keys per locale): 4093 · Task 4: 4094 · Task 6: 4083. `V_FORMS` 43 · Task 4: 44. `<form … noValidate>` in `src` 46 · Task 3: 47. Toasts outside a catch in `src` 34 in 11 files · Task 3: 22 in 10.
- **Tests:**
  - Run one file with `node --test tests/<file>.test.ts`.
  - Tests cannot import `.tsx`; they read it as text. A plain import of a type name fails under type stripping: use inline `type` specifiers.
  - **No test imports a test file** (it would run that file's tests again). `tests/v-track3.test.ts` declares its helpers; the blocks Tasks 2–6 append declare theirs as `function` declarations (hoisted), never as `const` used by an earlier block.
- **Baseline at `f1ae1828`** (Task 0 checks it again): `npm test` 2292 tests, 2291 pass, 0 fail, 1 skipped; `npx tsc --noEmit` clean; `npm run lint` 0 errors, 146 warnings, all under `.agents/`.
- **Every task ends with all of these green:** `npm test` with 0 fail and the task's count; `npx tsc --noEmit`; `npm run lint` with 0 errors and no new warning in `src/` or `tests/`. Report any failure by name.
- **Messages:** only through `node scripts/messages-edit.mjs <change file>`, with the change files saved in `<temp>/changes/`, and only these keys: Task 4 adds `systemSettingsPage.prefixCategoriesRequired`; Task 6 deletes eleven `systemSettingsPage.*` keys (its change file names them). Words follow `docs/19_THAI_GLOSSARY.md` (category is หมวดหมู่, prefix is คำนำหน้ารหัส); `tests/thai-glossary.test.ts`, `tests/messages-parity.test.ts` and `tests/messages-edit.test.ts` stay green. If you think another key is missing, stop and report.
- **The form convention** (plan 1 FIXED 6, M-R1–M-R5; plan 2's Global Constraints): `<form onSubmit={handleSubmit} noValidate …>` with `noValidate` directly after `onSubmit`; the HTML constraint attributes stay (FMG `CONSTRAINT_FLOORS` `[0, 1, 0]` for this file: the prefix input's `maxLength={10}`); a module-level `validate()` restates them; errors go under the field through `Field error=` (a group: `FieldGroup error=` or one `FieldError` tied by `aria-describedby`); `focusFirst` on the client's errors and `if (fieldErrors.applyServer(payload) && focusFirstError()) return` on the server's, then today's toast for every other refusal (spec §4.1.3); no `toast.error`/`toast.warning` for a validation error; never `role="alert"` or `aria-live="assertive"` on a field error (F-R6); never `aria-invalid` on a `<button>` (F-R7). Prerequisite gates: `aria-disabled` plus `aria-describedby` to a visible reason, the handler returns first (M-R10).
- **Guards:** `tests/form-migration-guards.test.ts` (FMG: GD5 keeps the prefix dialog inside the settings form with no `<form>` or submit of its own; GF4; GF5), `tests/visual-foundation-guards.test.ts`, `tests/list-frame-guards.test.ts`, `tests/ui-overlay-guards.test.ts`, `tests/validation-guards.test.ts` (V1–V5).
  - A commit that changes what a guard or pin counts edits it in the same commit.
  - The only guard row this plan adds is the settings form's `V_FORMS` row (Task 4). No `EXEMPT`, `V_SCOPE`, `NOT_IN_SCOPE`, `SELECT_STAR_ONLY`, `NON_VALIDATION_TOASTS` or FMG row changes: the file's toasts outside a catch after Task 3 are none (`toast.success` and `apiError.toast` are not validation toasts, and the two `apiError.toast` calls sit in a catch). Never add a row to make a test pass. If a change would make a guard fail and the task does not list that edit, stop and report.
- **The server:** no change. `src/app/api/admin/settings/route.ts` and `src/lib/validations/system-settings.ts` stay byte for byte (Task 1's test loads the schema to compare; it never edits it). Integration v1 does not change.
- **Off limits:**
  - Never open, read or print `.env` or `.env.prod-admin`.
  - Implementers do not run `npm ci`, `npm install`, `npm run build`, the dev server, or anything against a database. The controller runs the app in Tasks 0 and 7 and writes nothing to the database there: **no settings save ever reaches the server** (it writes `system_settings`, shared by every user), and neither does an LDAP test or sync.
  - Do not run skill helper scripts; they make network calls. The scripts in `<tools>` are read-only and run with the repo root as the working directory.
  - Keep helper scripts and change files in `<temp>`, outside the repo.
  - In Git Bash, MSYS rewrites a command-line argument that looks like a path: set `MSYS_NO_PATHCONV=1` for such a call. The Edit tool does not have this problem.
- **Deploy:** none. One deploy after Dark Mode, the whole V track and the E2E suite (wiki item 27).
- **Executors** are Opus-medium subagents that see only their task brief and these Global Constraints; the controller reviews every task before the next starts.

## Rulings of this plan

- **ST-R1, the earlier rulings apply.** Plan 1's S-R*, F-R*, M-R* and its FIXED INTERFACES as amended; plan 2's FIXED 8–12 and rulings (A-R*, O-R*, U-R*, D-R*, MT-R*, P-R*, X-R*); spec 2C K4, K5 a, K6 a; Dark Mode's two-theme rule (every new style is a token class already in use: the field error look of `Field`, `FieldError`, `FieldGroup`). Where a plan-1 or plan-2 ruling and this list differ for the settings form, this list says so and why.

- **ST-R2, one rule set, the server's codes (Task 1; spec G2, §6.1, §7.1, §7.2).**
  - The rules live in `src/lib/system-settings-field-rules.ts` (new, LF, `@/` imports like the server schema it mirrors). `settingRuleCode(key, value)` answers, for one setting and its trimmed value, the code `systemSettingsUpdateSchema` answers: its custom issue's api-error catalog key (`assetTagTemplateInvalid`, `labelWidthRange`, …, `approvalSlaDaysRange`; plan 1 S-R2), so the client's error and the server's error for the same mistake read the same `apiErrors.*` sentence. `settingSaveErrors(entries, prefixRows)` checks every setting a save sends: the server's 5000-character limit after trimming (`tooLong`), then the server's rule, then `settingControlCode` (below), first failing wins; and the prefix groups (ST-R5).
  - `settingControlCode(key, value)` restates what the controls allowed before `noValidate` where the server allows more (spec §4.5, client only, §6.3): the asset tag's running digits `range(1, 12) ?? step(1)` (no rule on either side today), the LDAP sync's deactivation limit `range(0) ?? step(1)` (no rule today), the document running digits and each label's width, height and QR size `step(1)` (the server takes 40.5), each label's margin and gap `step(0.5)` (`step="0.5"`). Their codes are the shared `outOfRange` (with `{ min, max }` from `settingControlParams`) and `invalidNumber` (plan 2 MT-R2, X-R2).
  - The form's `validate()` is a module-level wrapper over `settingSaveErrors`, so the V2 guard finds `validate(` and the rules stay testable as a `.ts` module. **Task 1's test runs the module and the server's schema on the same values** (the shipped defaults, one broken value for each of the schema's 20 rules (22 values: the margin and the gap, two notification days), a 5001-character value, the controls' own limits): the form finds exactly the codes the route answers, plus the controls' own limits. A future server rule that the module lacks fails that test only if the test gains a broken value for it; the module's header says so.
  - The form keeps no copy of the rules: its `assetTagFormatTokens` list moves to the module (the token buttons import it), `isValidCategoryPrefix` moves too (the prefix table and the editor share it), and the twelve `hasInvalid…` computations go (Task 3).
  - A setting the page did not load is not sent, so it is not checked (today's boxes read a missing setting as `""`: the client checks exactly what the server will see).

- **ST-R3, the live boxes stay live, under their field (Tasks 3, 4; spec U8, U6, §7.3, F-R6).**
  - The settings whose rule a box showed while the person typed are `isLiveSetting(key)`: the asset tag template, the public QR base URL, every label template and size and layout, the two document templates and their running digits, the four notification days, the three retention days, the depreciation policy, the three approval switches with the minimum approvers and the SLA days, and the LDAP sync schedule. `settingLiveErrors(entries, prefixRows)` gives their codes on every render; the field shows `liveErrors[field] ?? fieldErrors.errors[field]` (one line: the live rule while the value breaks it, else what the last save or the server found), and each such text field takes `Field liveError`, so a new error is read once through the polite region; a submit that finds the same error adds no announcement, focus reads it through `aria-describedby`.
  - Every other rule (the tape size, the label name choice, the LDAP sync mode, the 5000 limit, the controls' own limits of ST-R2) shows after a save only (U6), so those fields have no `liveError`.
  - The scheduler box sat on the automation tab, but its field (the custom schedule) is on the LDAP sync tab: its error now shows under the custom schedule (live), and the automation tab keeps only its Notice (open issue 3). An invalid schedule is never one of the presets, so the custom schedule field is always mounted when its rule fails.
  - The prefix editor's box showed the moment "add prefix" opened, on an empty prefix: the live rule now covers a prefix that is not empty; an empty prefix is `required` on the editor's save (ST-R7, open issue 6).

- **ST-R4, keys, order, tabs (Task 3; spec §4.1, §4.2, U1; M-R1).**
  - The form's field keys are the server's, `settings.<key>` (`settingFieldKey`; `settingKeyOf` back), so `applyServer` needs no mapping.
  - `SETTING_FIELD_IDS` lists every setting the form shows, in visual order: the tabs in their order (`getSettingsTabOrder`), then down each tab; a tape's nine label settings are generated after the label name choice (`LABEL_FIELD_SUFFIXES`, ids `asset_label_<size>-<suffix with hyphens>` as the panel builds them). The advanced settings follow all of them in the page's order, each with the id `setting-<key>` on its input (new). Task 3's test checks that the table's tabs never go back.
  - A save goes to the first wrong setting: `focusFirst(fieldOrder, { idFor, reveal })` with `reveal: (field) => selectTab(SETTING_FIELD_IDS[settingKeyOf(field)] ? getSystemSettingsTabForKey(settingKeyOf(field)) : "advanced")`. An advanced setting opens the advanced tab, where its row is, whatever its key's prefix: `getSystemSettingsTabForKey` answers by prefix, and the advanced table holds keys whose prefix names another tab (`notification_digest_last_run_at`, `_last_status`, `_last_error` answer "automation", which has no input for them; a stored scheduler error over 5000 characters, or a refusal naming one, would otherwise switch to a tab with no field and focus nothing). The hook runs `reveal`, waits for the field to mount (`waitForElement`, 30 frames), then `focusField` opens a closed `<details>` around it (the advanced table, the depreciation JSON) and focuses it. No foundation change.
  - `getSystemSettingsTabForKey("accounting_depreciation_policy")` answered `"advanced"` (only `depreciation_*` mapped to organization), where the setting is not even listed; it now answers `"organization"` (Task 1). The change review's link for that setting opens the right tab too (behaviour change).
  - The settings the UI can only set to `"true"`/`"false"` or an option id (the LDAP switches, the auto provision checkbox, the default role) have no rule but the 5000 limit, which they cannot reach, so they stay out of the table (open issue 9). The approval switches are in it: the server checks them (`approvalToggleInvalid`), and a stored value other than true or false shows on load today.
  - The server's refusals that name no shown field (`Unknown settings: …`, the 403 for an LDAP setting changed by someone who is not `system_admin`) keep today's toast (spec §4.1.3, §4.1.4).

- **ST-R5, the prefix groups have no field (Task 3; spec §7.3).** The panel's body becomes one group, `<div id="category-prefix-groups" role="group" aria-label={labels.categoryPrefixes} aria-describedby=…>`, with one `FieldError` under the table (`category-prefix-groups-error`, the editor's own sentence `systemSettingsPage.invalidPrefix`, ST-R2). Focus goes to the group's first control, the first group's edit button (open issue 5). The rule only fires on stored data (the editor never writes a bad prefix). The old duplicate-category check is deleted: the groups come from a JSON object's keys (one row per category) and every edit moves categories between groups, so no state can hold a duplicate (open issue 4).

- **ST-R6, the parts that could not show an error (Task 2; spec §7.3).** `ToggleField` takes `id` and `error`: the checkbox takes `aria-invalid` and `aria-describedby`, the error sits under the line in a `data-slot="field"` wrapper (so `focusField` scrolls the whole field into view). `LabelAssetNameModeField` becomes a `FieldGroup` (legend, hint, error, id; the `Segmented` line is unchanged, pinned by `tests/field-primitives.test.ts`). `LabelTemplatePanel` takes `errorFor(key)` and gives each of its nine fields `error` and `liveError`. The depreciation builder takes `jsonId` and `jsonError` for its JSON `Field` (`liveError`), and its closed `<details>` opens while the JSON is invalid (invalid JSON disables every builder control above it, so the person needs the JSON and its error in view; spec §4.2's anti-goal "a wrong field in a closed `<details>`").

- **ST-R7, the prefix editor (Task 4; spec §4.4, §5 #46, U8).** The editor saves into the form's prefix groups, not to the server, so it has its own hook (`prefixErrors`), its own table (`PREFIX_EDITOR_FIELD_IDS`: the prefix, then the category picker as one group) and `validatePrefixEditor`: the prefix `required` then 2 to 10 letters A-Z or digits (`invalidPrefix`, which covers the input's `maxLength={10}`), the categories `atLeastOne` (shown as the new `systemSettingsPage.prefixCategoriesRequired`, th "เลือกหมวดหมู่อย่างน้อย 1 หมวดหมู่สำหรับคำนำหน้ารหัสนี้"). Its save was a content gate (`disabled={!canApplyPrefixEditor}`) and its handler a silent return: the save is enabled and says what is missing (spec §4.4). The prefix field takes the star (`Field required`, no native attribute: GF4's V-track rule, plan 2 A-R10). The category picker becomes `<div id="category-prefix-editor-categories" role="group" aria-label={labels.selectedPrefixCategories} …>` with its `FieldError` as the dialog body's last line; focus goes to its first control, the search of the available categories. Opening or closing the editor clears its errors; changing the prefix or moving categories clears that field's error. The dialog stays inside the settings form with no `<form>` or submit button of its own (FMG GD5, `tests/accessible-dialog.test.ts`). A prefix equal to another group's still merges into that group without a word (open issue 7).

- **ST-R8, the gates (Task 5; spec §4.4, §11 call 2).** "Nothing changed" is a prerequisite, not a field: the save becomes `aria-disabled={changedCount === 0 || undefined}` with `aria-describedby="settings-save-status"`, the footer's status line takes that id (it already says "ยังไม่มีรายการที่เปลี่ยนแปลง"), and `handleSubmit` returns first (Enter in a field still reaches it). The LDAP sync apply needs a preview first: `aria-disabled={!syncPreview || undefined}` with `aria-describedby="ldap-sync-no-preview"` on the empty preview line ("ยังไม่มีผลตัวอย่าง…"), and `handleLdapSync` returns first for "apply" without a preview; it keeps `disabled` while a preview runs (another action is busy, not a gate). The category transfer arrows in the editor keep `disabled` while nothing is ticked: a picker's action, not a submit (open issue 11). The LDAP test's 400 ("enter the bind password…") is not a save and keeps its toast (open issue 8).

- **ST-R9, messages (Tasks 4, 6; spec §7.1; plan 2 open issue 4's answer: a message that loses its last reader goes).** Task 4 adds `systemSettingsPage.prefixCategoriesRequired`. Task 6 deletes the eleven sentences only the boxes and toasts read (`duplicateCategory`, `invalidFormatTemplate`, `invalidPublicQrBaseUrl`, `invalidLabelTemplate`, `invalidLabelSize`, `invalidOperationDocumentTemplate`, `invalidNotificationRule`, `invalidRetentionPolicy`, `invalidAccountingDepreciationPolicy`, `invalidWorkflowApproval`, `invalidSchedulerSchedule`), with their page labels and their lines in the form's `labels` type: each was one sentence for a group of fields; each field now reads its own catalog sentence (open issue 1). `invalidPrefix` stays (the editor and the prefix groups read it). 4093 → 4094 → 4083 keys per locale.

- **ST-R10, the split and the tests.** Six code tasks on one file so that each commit is reviewable (Task 3 alone holds 70 exact edits of the form); the order puts the pure module first (it is tested against the server alone), the props before the form uses them, the editor last among the forms (its commit adds the `V_FORMS` row: "in the commit that moves the file's last form"), then the gates and the retired sentences. One new LF test file, `tests/v-track3.test.ts`: Task 1 creates it with a resolve hook for `@/` (the module and the server schema import `@/…`) and `messages`, `load`; Task 2's block adds `read` and `formSource` as `function` declarations; one test per task.

- **ST-R11, what does not change.** The route, the schema, `settingFieldKeyFor` and the hook; the LDAP test and sync routes and their toasts; the `syncError` Notice (`role="alert"`, a sync failure, not a field); the `ldapDefaultRoleMissing` warning (a warning, not an error; it never blocked the save); the "assigned to another prefix" badges; the search panel and the change review table (their links and buttons only switch tabs); `LabelPreviewPanel`; `tests/category-prefix-groups.test.ts` and `src/lib/category-prefix-groups.ts`.

## Review Focus

Five failure modes that would bite a person. Failure modes 1–4 are each held by assertions in their owning task's Step 1 block or a guard, and Task 7 checks them on the app. Failure mode 5 cannot be held by a test (it is about the controller's browser, not the code): it is held by Task 0 Step 6's handler, its two probes and the end count, and Task 8 refuses to write the check without Task 7's findings.

1. **The form and the server disagree about a setting (Task 1).** A rule only the server has ends in a refusal the person could have seen before; a rule only the client has refuses what the server accepts (spec §6.3 allows it only for the controls' own limits). **Tests:** Task 1 runs `settingSaveErrors` and `systemSettingsUpdateSchema` on the defaults, on one broken value for each of the schema's 20 rules (22 values: the margin and the gap, two notification days), and on a 5001-character value, and compares the keyed codes exactly; the controls' own limits are listed one by one, with the server shown accepting a width of 40.5. Task 7: a server refusal through a stand-in lands on its field.
2. **A wrong setting on another tab or in a closed `<details>`, and focus lands nowhere (Task 3; spec §4.2's anti-goal).** **Tests:** Task 3 pins `reveal: (field) => selectTab(SETTING_FIELD_IDS[settingKeyOf(field)] ? getSystemSettingsTabForKey(settingKeyOf(field)) : "advanced")` (an advanced setting opens the advanced tab whatever its prefix, ST-R4), `idFor` over `SETTING_FIELD_IDS` (each id once on its control) and the advanced inputs' `setting-<key>`, the table's tab order, and the depreciation key's tab (Task 1). Task 7: an invalid value on one tab, saved from another, at 1440 and 375.
3. **A live error shown twice, or no longer live (Tasks 3, 4; U8).** **Tests:** Task 3 pins `liveErrors[field] ?? fieldErrors.errors[field]` (one line), `liveError` on exactly the live settings' fields and on none of the others, and no `ValidationMessage` box but the editor's; Task 4 pins the prefix's live rule (`prefixLiveCode`) and that no box is left. Task 7: typing a bad value shows its error at once under the field, read once.
4. **A gate that hides its reason, or a content rule left as a disabled button (Tasks 4, 5).** **Tests:** Task 4 pins the editor's save without `disabled` and its `validatePrefixEditor`; Task 5 pins both `aria-disabled` / `aria-describedby` pairs, the reasons' ids on visible elements and the handlers' early returns. Task 7: both gates focusable, their reasons read, Enter sends nothing.
5. **A settings save reaches the server during the check (Tasks 0, 7).** The save writes `system_settings`, which every user reads (the asset tag format, the LDAP login, the retention days). **Rule:** Tasks 0 and 7 route the browser context before the settings page opens, prove the interception with a probe, fulfil `PUT /api/admin/settings` with a stand-in or abort it, abort every other non-GET (the LDAP test and sync included), and count every non-GET at the end (none continued). The handler is written out once, in Task 0 Step 6, and Task 7 runs it unchanged; it continues only `GET` and `HEAD`, fulfils only `PUT /api/admin/settings`, and aborts everything else by default. Every page of the check opens in the routed Playwright context, never in the Browser pane that `preview_start` opens. The one non-GET that reaches the server is the login itself (before the handler; it writes the seed admin's `lastLoginAt` in the dev database, as in plans 1 and 2).

## File structure

| File (line endings) | What changes | Task |
|---|---|---|
| `src/lib/system-settings-field-rules.ts` (new, LF) | the settings rules: `settingRuleCode`, `settingControlCode`, `settingControlParams`, `isLiveSetting`, `settingSaveErrors`, `settingLiveErrors`, `settingFieldKey`, `settingKeyOf`, `isValidCategoryPrefix`, `assetTagFormatTokens` | 1 |
| `src/lib/settings-search.ts` (CRLF) | `accounting_depreciation_policy` → organization | 1 |
| `c/admin/system-settings-form.tsx` (CRLF) | Task 2: `ToggleField`, `LabelAssetNameModeField`, `LabelTemplatePanel` take an id and an error · Task 3: `noValidate`, `validate()`, the hook, `SETTING_FIELD_IDS`, focus with the tab switch, every field's error, toasts and page boxes gone · Task 4: the prefix editor, `ValidationMessage` gone · Task 5: the two gates · Task 6: eleven `labels` type lines | 2–6 |
| `c/admin/depreciation-policy-builder.tsx` (CRLF) | `jsonId`, `jsonError`; the JSON's section opens while invalid | 2 |
| `D/admin/settings/page.tsx` (CRLF) | `prefixCategoriesRequired` passed (4); eleven labels gone (6) | 4, 6 |
| `messages/th.json`, `messages/en.json` (CRLF) | +1 key (4), −11 keys (6) | 4, 6 |
| `tests/validation-guards.test.ts` (CRLF) | the settings form's `V_FORMS` row | 4 |
| `tests/settings-depreciation-policy-ui.test.ts` (CRLF) | the builder's JSON `Field` (2); the form's depreciation error and save (3) | 2, 3 |
| `tests/settings-tab-persistence-ui.test.ts` (CRLF) | `noValidate` in the `<form>` pin | 3 |
| `tests/accessible-dialog.test.ts` (CRLF) | the editor's save without `disabled` | 4 |
| `tests/admin-sweep-ui.test.ts` (CRLF) | the `ValidationMessage` pin becomes its absence | 4 |
| `tests/sticky-form-footer-ui.test.ts` (CRLF) | the save button's gate | 5 |
| `tests/v-track3.test.ts` (new, LF) | one test per task | 1–6 |
| `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md`, `tests/v-track-docs.test.ts` (CRLF) | the plan's section and entry; plan 3's record test appended, plan 2's order assertion moved | 8 |

No change (checked): `src/app/api/admin/settings/route.ts`, `src/app/api/admin/settings/ldap-test/route.ts`, `ldap-sync/route.ts`, `src/lib/validations/system-settings.ts`, `src/lib/field-errors.ts`, `src/lib/field-error-client.ts`, `src/lib/field-focus.ts`, `src/lib/validation-rules.ts`, `src/components/ui/use-field-errors.ts`, `field.tsx`, `field-group.tsx`, `segmented.tsx`, `accessible-dialog.tsx`, `src/lib/category-prefix-groups.ts`, `src/lib/system-settings-tabs.ts`, `src/lib/settings-information-architecture.ts`; `tests/form-migration-guards.test.ts`, `tests/list-frame-guards.test.ts`, `tests/ui-overlay-guards.test.ts`, `tests/visual-foundation-guards.test.ts`, `tests/field-primitives.test.ts`, `tests/asset-label-print-ui.test.ts`, `tests/phase2d-final-ui.test.ts`, `tests/steps-ui.test.ts`, `tests/form-frames-ui.test.ts`, `tests/dark-mode-p.test.ts`, `tests/settings-ldap-role-ui.test.ts`, `tests/system-log-history.test.ts`, `tests/settings-search.test.ts`, `tests/v-track-s.test.ts` (each runs green after every task); `DESIGN.md`, docs/14, `.impeccable/design.json` (the final plan).

## Interfaces between tasks

| Made in | What | Used by |
|---|---|---|
| plans 1 and 2 (merged) | FIXED 1–12 as amended; `useFieldErrors` (`focusFirst(order, { idFor, reveal })`, `applyServer`, `clear`, `errors`), `useValidationMessage`, the rule helpers (`required`, `range`, `step`, `atLeastOne`), `Field liveError`, `FieldError`, `FieldGroup`, `settingFieldKeyFor` (the route's `settings.<key>`), `V_SCOPE`/`V_FORMS`/`NON_VALIDATION_TOASTS`, V1–V5 | every task |
| Task 1 (ST1) | `src/lib/system-settings-field-rules.ts`: `type SettingEntry`, `type SettingFieldKey`, `settingFieldKey`, `settingKeyOf`, `assetTagFormatTokens`, `settingRuleCode`, `settingControlCode`, `settingControlParams`, `isLiveSetting`, `isValidCategoryPrefix`, `settingSaveErrors`, `settingLiveErrors`; `getSystemSettingsTabForKey("accounting_depreciation_policy") === "organization"`; `tests/v-track3.test.ts` with its header (`messages`, the `@/` resolve hook, `load`) | Tasks 2–6 |
| Task 2 (ST2) | `ToggleField({ id, error })`, `LabelAssetNameModeField({ id, error })` (a `FieldGroup`), `LabelTemplatePanel({ errorFor })`, `DepreciationPolicyBuilder({ jsonId, jsonError })`; `read`, `formSource` in the test file | Task 3 |
| Task 3 (ST3) | `SETTING_FIELD_IDS`, `settingFieldId`, `validate(entries, prefixRows)`, `fieldErrors`, `validationMessage`, `submittedSettings`, `liveErrors`, `settingError(key)`, `prefixGroupsError`, `fieldOrder`, `focusFirstError` | Tasks 4, 5, 7 |
| Task 4 (ST4) | `prefixErrors`, `PREFIX_EDITOR_FIELD_IDS`, `validatePrefixEditor`; `systemSettingsPage.prefixCategoriesRequired`; the `V_FORMS` row (44) | Tasks 6, 7 |
| Task 5 (ST5) | `settings-save-status`, `ldap-sync-no-preview` | Task 7 |
| Task 6 (ST6) | 4083 keys per locale | Tasks 7, 8 |
| Task 7 | `.superpowers/sdd/v-track-plan3/task-7-findings.md` | Task 8 |
| Task 8 | the handoff section and the changelog entry | Task 9 |

---

### Task 0: Branch, baseline, counting evidence and before evidence (controller runs this task, not an implementer)

**Files:**
- Create then delete: a launch configuration for the dev server only while it runs; never committed. If `.claude/launch.json` already holds another session's configuration, add your own entry with its own name and port, and remove only that entry afterwards.
- Evidence (git-ignored): `.superpowers/sdd/screenshots/v-track-plan3/before/`, `.superpowers/sdd/v-track-plan3/task-0-baseline.md`, `.superpowers/sdd/v-track-plan3/task-0-counts/`.

**Interfaces:**
- Consumes: `master` at `f1ae1828`.
- Produces: `feat/v-track-3` with this plan's commit; the baseline numbers; the counting evidence; the before images and behaviour of the settings form and the prefix editor, which Task 7 compares against.

- [ ] **Step 1: Branch and base.**
  - `git rev-parse master` must print `f1ae1828645c773a89be67c10d94e41081df46c0`. If `master` moved (for example `fix/asset-partial-save` was merged first: one more `NON_VALIDATION_TOASTS` row, its own tests and a toast in `asset-form.tsx`), stop and tell the user: every count of this plan is `f1ae1828`'s, and the plan is re-based before it runs (open issue 12).
  - From `master`: `git switch -c feat/v-track-3` (the controller's one branch command; implementers never switch), then copy this plan to `docs/superpowers/plans/2026-10-19-v-track-plan3.md`, `git add docs/superpowers/plans/2026-10-19-v-track-plan3.md` and `git commit -m "docs(forms): V track plan 3 (the settings form and its prefix editor)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.
  - `git rev-parse --abbrev-ref HEAD` → `feat/v-track-3`; `git diff --name-only f1ae1828 HEAD` lists only this plan; `git status --short` → only the untracked items of the Global Constraints.
- [ ] **Step 2: Baseline.** `npm test` (expected 2292 tests, 2291 pass, 0 fail, 1 skipped), `npx tsc --noEmit` (clean), `npm run lint` (0 errors; 146 warnings, every one under `.agents/`). Record the numbers in `task-0-baseline.md`.
- [ ] **Step 3: Temp files.** Check that `<tools>/eol.mjs`, `<tools>/counts.mts`, `<tools>/apply-blocks.mjs`, `<tools>/replay.mjs` and `<temp>/changes/` exist; hand the paths of `<temp>` and `<tools>` to every implementer. The change files of Tasks 4 and 6 are written by those tasks (their text is in the task).
- [ ] **Step 4: Counting evidence at `f1ae1828`** (read-only; save the output under `task-0-counts/`; a difference stops the plan, because an inventory row would be wrong):
  - `node <tools>/counts.mts .` prints: toasts outside a catch 34 in 11 files; `<form … noValidate>` in `src` 46; `messages/th.json` and `en.json` 4093 leaf keys; `V_FORMS` 43; `SELECT_STAR_ONLY` `0 in 0`; FMG `STAR_ONLY` `new Set<string>([])`.
  - In `src/components/admin/system-settings-form.tsx` (2612 lines): `grep -c "toast.error(labels\." ` → 12 (lines 854–898); `grep -c "<ValidationMessage"` → 13; one `<form onSubmit={handleSubmit} className="space-y-6">` (line 976); the save `<Button type="submit" busy={saving} disabled={changedCount === 0}>` (line 2044); the editor's `<Button onClick={applyPrefixEditor} disabled={!canApplyPrefixEditor}>` (line 1457).
  - `git ls-files --eol` of every file the File structure names: as the Global Constraints list them (all CRLF).
- [ ] **Step 5: Dev server.**
  - If `preview_list` shows a dev server of this checkout on `:3000`, use it and do not stop it. Otherwise add a launch configuration `name: "asset-v3-dev-3100"`, `runtimeExecutable: "node"`, `runtimeArgs: ["node_modules/next/dist/bin/next", "dev", "-p", "3100"]`, `port: 3100`, `autoPort: false` (if another session's server holds 3100, use 3102 and say so in the baseline file), and start it with `preview_start`.
  - Memory says `.env` points at `asset_management_dev` / `asset_dev`. Confirm this without opening the file: `/th/admin/readiness` shows the database checks. If anything suggests the production database, stop.
  - Every page of this task opens in the Playwright browser (the Playwright MCP tools, `browser_run_code_unsafe` for code), in your own tab. The Browser pane that `preview_start` opens stays on the page it opened: never log in there, never open `/th/admin/settings` there (no handler covers it).
  - Log in with the seed admin of `prisma/seed.ts` (a `system_admin`); do not echo the password. The login's own request (a POST of the sign-in, made before the handler of Step 6) is the one non-GET of this task that reaches the server: it writes the seed admin's `lastLoginAt` in the dev database, as in plans 1 and 2. Never sign out (a POST) during the task.
- [ ] **Step 6: Write nothing — fulfil or abort every non-GET request.** Before opening `/th/admin/settings`, route the browser context with exactly this handler (`browser_run_code_unsafe`; it keeps its state on the context, so later calls read it), and keep it for the rest of the task. Task 7 Step 5 runs the same code unchanged. A `GET` or `HEAD` continues; `PUT /api/admin/settings` is **always fulfilled, never continued**, with the stand-in in `vTrack.standIn` (default: 400 `{ "error": "Something else", "code": "OTHER" }`, so the form shows today's toast and stays as it was); every other non-GET is aborted, the LDAP test and sync included:

```js
async (page) => {
  const context = page.context()
  if (context.vTrack) return "already routed"
  const vTrack = { log: [], standIn: { status: 400, body: { error: "Something else", code: "OTHER" } } }
  context.vTrack = vTrack
  await context.route("**/*", async (route) => {
    const request = route.request()
    const method = request.method()
    if (method === "GET" || method === "HEAD") return route.continue()
    const { pathname } = new URL(request.url())
    if (method === "PUT" && pathname === "/api/admin/settings") {
      vTrack.log.push(`${method} ${pathname} fulfilled ${vTrack.standIn.status}`)
      return route.fulfill({ status: vTrack.standIn.status, contentType: "application/json", body: JSON.stringify(vTrack.standIn.body) })
    }
    vTrack.log.push(`${method} ${pathname} aborted`)
    return route.abort()
  })
  return "routed"
}
```

  - A stand-in for the next save: `async (page) => { page.context().vTrack.standIn = { status: 400, body: { … } } }`; the log: `async (page) => page.context().vTrack.log`.
  - **Prove it first, in this order:** (1) `async (page) => page.evaluate(() => fetch("/api/v-track-probe", { method: "POST" }).then(() => "sent", (error) => error.name))` gives `"TypeError"` and the log ends with `POST /api/v-track-probe aborted`; (2) only then `async (page) => page.evaluate(() => fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: "{}" }).then((response) => response.json()))` gives exactly `{ "error": "Something else", "code": "OTHER" }` and the log ends with `PUT /api/admin/settings fulfilled 400` (the route itself would answer `"Invalid request data"`: compare the body, not the status, which is 400 either way). If either fails (a service worker in the way: `public/sw.js` handles GETs only, but check), stop, set the context up again with `serviceWorkers: "block"` (`browser.newContext`), log in again, and run the handler and both probes before opening any form.
  - If the page or the context is ever recreated, run the handler and both probes again before the settings page opens.
- [ ] **Step 7: Before evidence** at 1440 and 375, light and dark (the toggle beside the language button), `/th/admin/settings` on each of its 11 tabs and the prefix editor:
  - a screenshot of each tab as it opens to `before/settings-<tab>-<theme>-<width>.png`, and of the editor ("เพิ่มคำนำหน้ารหัส" on the asset-numbering tab) as it opens (its red box under the empty prefix);
  - each box as it shows while typing: an asset tag template without `{running}`, a public QR base URL `ftp://x`, a label width of 200 and a label template token `{owner}` (the two boxes below the four panels), a checkout template without `{running}`, a notification day of 400, a minimum approvers of 9, a retention day of 0, a custom LDAP schedule `every day` (its box is on the automation tab); the depreciation JSON made invalid in its closed section (the builder's controls turn disabled, the box under the builder);
  - each save with one of those mistakes (the stand-in of Step 6 answers any request that goes out): the validation toast that shows, and that no error shows under a field; a mistake on another tab than the one shown (for example the notification day, saved from the label tab): the toast, and the page stays on its tab;
  - the browser's own bubble: an asset tag running digit of 13 saved on its own tab (the bubble), and saved from another tab (nothing checks it; the request goes out and the stand-in answers);
  - the two gates as they are: the save with nothing changed (disabled, skipped by Tab), the LDAP sync apply before a preview (disabled; do not press preview: it is a POST and is aborted anyway);
  - the editor: its save disabled with an empty prefix or no category; a prefix of one letter; the transfer arrows;
  - **the stored values the controls' own limits would refuse** (read only, from the page as it loads, before you type anything): the asset tag running digits (1–12, whole), the LDAP sync's deactivation limit (≥ 0, whole), the document running digits (whole), and each tape's width, height and QR size (whole) and margin and gap (steps of 0.5). Write each value that breaks its limit into `task-0-baseline.md`, or "none": after Task 3 such a value stops every save until it is changed (open issue 13), and Task 7 needs to know whether the dev data holds one.
- [ ] **Step 8: Clean up.** Stop your server if you started one and remove your launch configuration (only yours). `git status --short` shows what Step 1 showed. No commit in this task besides Step 1's plan commit.

---

## The settings form and its prefix editor (Tasks 1–6, ST1–ST6)

Spec `docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md` (approved 2026-10-17): §2 U1, U2, U6, U8; §3 G1–G3, G5 and the anti-goals; §4.1–§4.5; §5 #45 and #46; §6.1 (`settings.<key>`); §7.1–§7.3; §11 calls 1, 2, 3, 7.

### Inventory (at `f1ae1828`)

`F` = `c/admin/system-settings-form.tsx` (2612 lines). One `<form onSubmit={handleSubmit} className="space-y-6">` (F:976) around 11 tabs, of which only the active one is mounted (`{activeTab === "…" ? … : null}`; `activeTab` from `useSearchParams`, F:543; `selectTab` F:772–776 by `window.history.replaceState`). The prefix editor is an `AccessibleDialog` inside it (F:1352–1464), saved by `applyPrefixEditor` (F:624–634) into the `prefixRows` state, which the main save sends as `asset_tag_category_prefixes`.

| What | Where at `f1ae1828` | Becomes | Task |
|---|---|---|---|
| 12 validation toasts in `handleSubmit` | F:853–900 (`duplicateCategory`, `invalidPrefix`, `invalidFormatTemplate`, `invalidPublicQrBaseUrl`, `invalidLabelTemplate`, `invalidLabelSize`, `invalidOperationDocumentTemplate`, `invalidNotificationRule`, `invalidRetentionPolicy`, `invalidAccountingDepreciationPolicy`, `invalidWorkflowApproval`, `invalidSchedulerSchedule`) | `fieldErrors.setErrors(validate(…))`, focus on the first wrong setting, its tab first | 3 |
| the server's `fieldErrors` dropped | F:919 `throw new Error(payload?.error ?? labels.error)` | `if (fieldErrors.applyServer(payload) && focusFirstError()) return` before it | 3 |
| 12 live boxes on the page | F:1041, 1133, 1185, 1186, 1245, 1348, 1349, 1494, 1546, 1594, 1603 (automation tab; its field is on LDAP sync), 1653 | each setting's error under its field, live (ST-R3); 1348's duplicate check deleted (ST-R5) | 3 |
| the editor's live box | F:1384 (shows on an empty prefix as the editor opens) | the prefix field's error, live once a prefix is typed | 4 |
| 12 rule computations | F:667–669, F:681–750 (`hasInvalid…`), the token list F:454–467, `isValidCategoryPrefix` F:2131–2133 | the rules module (Task 1) | 1, 3 |
| native checks the browser made on the mounted tab only | `min`/`max`/`step` on the number inputs (F:1088–1097 running digits 1–12, F:1223–1232, F:1504–1543, F:1571–1590, F:1621–1650, F:1821–1829 `min={0}`, F:2437–2488 incl. `step="0.5"`) | `noValidate`; `settingControlCode` restates them on every tab (ST-R2) | 1, 3 |
| fields with no id or no error | the JSON textarea (builder:333–338, in a closed `<details>`), the advanced inputs (F:1975–1980, in a closed `<details>`), the 3 approval switches (`ToggleField`, F:2242–2267), the label name choice (`LabelAssetNameModeField`, F:2374–2396) | ids and errors (ST-R6, ST-R4) | 2, 3 |
| the editor's content gate | F:1457 `disabled={!canApplyPrefixEditor}`, F:625 silent return | errors on save, save enabled (ST-R7) | 4 |
| the save's prerequisite | F:2044 `disabled={changedCount === 0}` (its reason F:2037–2039 untied) | `aria-disabled` + `aria-describedby` (ST-R8) | 5 |
| LDAP apply's prerequisite | F:1935 `disabled={syncingLdap === "preview" \|\| !syncPreview}` (its reason the empty preview line F:2279) | `aria-disabled` + `aria-describedby` (ST-R8) | 5 |
| the tab of the depreciation policy | `src/lib/settings-search.ts:19` maps only `depreciation_*` | `accounting_depreciation_policy` → organization | 1 |
| server rules (`src/lib/validations/system-settings.ts:53–261`) | 20 rules keyed `settings.<key>` by the route (plan 1 S-R4) | unchanged; mirrored and tested (ST-R2) | 1 |

---

### Task 1 (ST1): One rule set for the settings form, with the server's own codes, and the depreciation policy's tab (`src/lib/system-settings-field-rules.ts`, `src/lib/settings-search.ts`)

Spec §4.5, §6.1, §6.3, §7.2; ST-R2, ST-R4, ST-R10.

**Files:**
- Create: `src/lib/system-settings-field-rules.ts` (new, LF)
- Modify: `src/lib/settings-search.ts` (`i/lf w/crlf`)
- Test: `tests/v-track3.test.ts` (new, LF)

**Interfaces:**
- Consumes: `src/lib/validations/system-settings.ts` (read by the test only), `issuesToFieldErrors` and `settingFieldKeyFor` (`src/lib/field-errors.ts`), `range` and `step` (`src/lib/validation-rules.ts`), the key constants of `system-setting-defaults.ts`, `asset-label-template.ts`, `asset-depreciation.ts`, `asset-qr.ts`, `retention-policy.ts`, `workflow-approval.ts`, `ldap-sync-safety.ts`, and `normalizeCategoryPrefix` (`category-prefix-groups.ts`).
- Produces: the module's exports (Interfaces table); `tests/v-track3.test.ts` with `messages`, the `@/` resolve hook, `load`.

**Changes at f1ae1828:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| — | — | `src/lib/system-settings-field-rules.ts`, exactly as Step 3 prints it: per setting, the server's rule (`settingRuleCode`: the same 20 checks as `systemSettingsUpdateSchema`'s `superRefine`, on the trimmed value, answering the catalog key of each custom message), the controls' own limits (`settingControlCode`, `settingControlParams`), the live settings (`isLiveSetting`), `settingSaveErrors` and `settingLiveErrors` (both also check the prefix groups), `isValidCategoryPrefix` and `assetTagFormatTokens` (moved from the form in Task 3), `settingFieldKey` and `settingKeyOf` | ST-R2, ST-R3 |
| `settings-search.ts:19` | `if (key === "company_name" \|\| key === "default_currency" \|\| key.startsWith("depreciation_")) return "organization"` | the same with `\|\| key === "accounting_depreciation_policy"`, and a comment line above | ST-R4 |

- [ ] **Step 1: The failing test.** Create `tests/v-track3.test.ts` (LF) with exactly (write it with a file tool):

```ts
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import test from "node:test"
import { pathToFileURL } from "node:url"
import { issuesToFieldErrors, settingFieldKeyFor } from "../src/lib/field-errors.ts"

// V track plan 3: the settings form and its prefix editor show their errors under the field (spec
// docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §4, §5 #45 and #46, U8). One test per task, appended
// in order. The working tree is CRLF on Windows: every read strips \r before the multi-line regexes.
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))

// The settings rules and the server's schema import "@/…", which node --test cannot load: a resolve hook maps it to src,
// as tests/v-track-s.test.ts does. Nothing here needs a stand-in.
;(nodeModule as unknown as { registerHooks(hooks: { resolve(specifier: string, context: unknown, next: (specifier: string, context: unknown) => unknown): unknown }): void }).registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return next(specifier, context)
  },
})
const load = <T>(path: string) => import(pathToFileURL(path).href) as Promise<T>

type Entry = { key: string; value: string }
type Rules = {
  settingSaveErrors(entries: readonly Entry[], prefixRows: readonly { categoryId: string; prefix: string }[]): Record<string, string>
  settingLiveErrors(entries: readonly Entry[], prefixRows: readonly { categoryId: string; prefix: string }[]): Record<string, string>
  settingControlCode(key: string, value: string): string | null
  isValidCategoryPrefix(prefix: string): boolean
  settingFieldKey(key: string): string
  settingKeyOf(field: string): string
}
type Schema = { systemSettingsUpdateSchema: { safeParse(input: unknown): { success: boolean; error?: { issues: Parameters<typeof issuesToFieldErrors>[0] } } } }

// What the settings route answers for this list: no fieldErrors when the schema passes, else the keyed codes (S-R4).
async function serverErrors(entries: readonly Entry[]) {
  const { systemSettingsUpdateSchema } = await load<Schema>("src/lib/validations/system-settings.ts")
  const input = { settings: entries }
  const parsed = systemSettingsUpdateSchema.safeParse(input)
  return parsed.success ? {} : issuesToFieldErrors(parsed.error!.issues, settingFieldKeyFor(input))
}

test("the settings rules answer what the server answers for every setting, and the controls' own limits on top (v-track plan 3 task 1, ST1)", async () => {
  const rules = await load<Rules>("src/lib/system-settings-field-rules.ts")
  const { systemSettingDefaults } = await load<{ systemSettingDefaults: readonly Entry[] }>("src/lib/system-setting-defaults.ts")
  const defaults = systemSettingDefaults.map(({ key, value }) => ({ key, value }))
  // The shipped defaults break no rule on either side.
  assert.deepEqual(await serverErrors(defaults), {})
  assert.deepEqual(rules.settingSaveErrors(defaults, []), {})
  // One broken value for every rule of systemSettingsUpdateSchema: the form finds the code the server answers.
  const broken: Record<string, [string, string]> = {
    asset_tag_format_template: ["{companyCode}-{bogus}", "assetTagTemplateInvalid"],
    asset_label_default_tape_size: ["36", "labelTapeSizeInvalid"],
    asset_qr_public_base_url: ["ftp://asset.example", "publicQrUrlInvalid"],
    asset_label_12_width_mm: ["200", "labelWidthRange"],
    asset_label_18_height_mm: ["", "labelHeightRange"],
    asset_label_24_qr_size: ["19", "labelQrSizeRange"],
    asset_label_custom_margin_mm: ["11", "labelSpacingRange"],
    asset_label_12_gap_mm: ["-1", "labelSpacingRange"],
    asset_label_18_layout: ["qr-right", "labelLayoutUnsupported"],
    asset_label_compact_asset_name_enabled: ["yes", "labelToggleInvalid"],
    asset_label_24_primary_template: ["{assetTag} {owner}", "labelTemplateTokens"],
    checkout_document_template: ["CO-{year}", "documentTemplateInvalid"],
    operation_document_running_digits: ["13", "documentRunningDigitsRange"],
    notification_return_due_soon_days: ["1.5", "notificationDaysRange"],
    notification_license_expiry_days: ["366", "notificationDaysRange"],
    retention_audit_log_days: ["0", "retentionDaysRange"],
    ldap_sync_mode: ["sometimes", "schedulerModeInvalid"],
    ldap_sync_schedule: ["every day", "schedulerCronInvalid"],
    accounting_depreciation_policy: ["{", "depreciationPolicyInvalid"],
    workflow_approval_disposal_required: ["yes", "approvalToggleInvalid"],
    workflow_approval_min_approvers: ["6", "approvalMinApproversRange"],
    workflow_approval_sla_days: ["0", "approvalSlaDaysRange"],
  }
  const entries = defaults.map(({ key, value }) => ({ key, value: broken[key]?.[0] ?? value }))
  assert.equal(entries.filter((entry) => broken[entry.key]).length, Object.keys(broken).length, "every broken key is a default setting")
  const expected = Object.fromEntries(Object.entries(broken).map(([key, [, code]]) => [`settings.${key}`, code]))
  assert.deepEqual(await serverErrors(entries), expected)
  assert.deepEqual(rules.settingSaveErrors(entries, []), expected)
  // Every code reads its own sentence in both languages (the hook resolves apiErrors after common.validation).
  for (const code of new Set(Object.values(expected))) {
    for (const locale of ["th", "en"] as const) assert.equal(typeof messages(locale).apiErrors[code], "string", `${locale} apiErrors.${code}`)
  }
  // While typing, only the rules the old boxes showed (spec U8); the tape size, the compact toggle and the sync mode wait
  // for save (U6).
  const live = { ...expected }
  for (const key of ["asset_label_default_tape_size", "asset_label_compact_asset_name_enabled", "ldap_sync_mode"]) delete live[`settings.${key}`]
  assert.deepEqual(rules.settingLiveErrors(entries, []), live)
  // The server's 5000-character limit, after trimming as the server does.
  const long = defaults.map(({ key, value }) => ({ key, value: key === "company_name" ? `  ${"x".repeat(5001)}  ` : value }))
  assert.deepEqual(await serverErrors(long), { "settings.company_name": "tooLong" })
  assert.deepEqual(rules.settingSaveErrors(long, []), { "settings.company_name": "tooLong" })
  // What the control allowed before noValidate, where the server allows more: client only, on save.
  const control: [string, string, string | null][] = [
    ["asset_tag_running_digits", "13", "outOfRange"],
    ["asset_tag_running_digits", "2.5", "invalidNumber"],
    ["asset_tag_running_digits", "", null],
    ["ldap_sync_max_scheduled_deactivations", "-1", "outOfRange"],
    ["ldap_sync_max_scheduled_deactivations", "1.5", "invalidNumber"],
    ["operation_document_running_digits", "4.5", "invalidNumber"],
    ["asset_label_12_width_mm", "40.5", "invalidNumber"],
    ["asset_label_custom_margin_mm", "0.3", "invalidNumber"],
    ["asset_label_custom_margin_mm", "1.5", null],
    ["company_name", "1.5", null],
  ]
  for (const [key, value, code] of control) assert.equal(rules.settingControlCode(key, value), code, `${key} = ${value}`)
  assert.deepEqual(await serverErrors(defaults.map((entry) => (entry.key === "asset_label_12_width_mm" ? { ...entry, value: "40.5" } : entry))), {}, "the server takes a width of 40.5")
  assert.deepEqual(rules.settingSaveErrors(defaults.map((entry) => (entry.key === "asset_label_12_width_mm" ? { ...entry, value: "40.5" } : entry)), []), { "settings.asset_label_12_width_mm": "invalidNumber" })
  // A field key is the server's: settings.<key>, and back.
  assert.equal(rules.settingFieldKey("asset_label_12_width_mm"), "settings.asset_label_12_width_mm")
  assert.equal(rules.settingKeyOf("settings.asset_label_12_width_mm"), "asset_label_12_width_mm")
  // The prefix groups: no server rule; a stored group with a bad prefix shows the editor's own sentence under the table.
  assert.equal(rules.isValidCategoryPrefix(" ab1 "), true)
  assert.equal(rules.isValidCategoryPrefix("A"), false)
  assert.equal(rules.isValidCategoryPrefix("AB-1"), false)
  const badPrefix = [{ categoryId: "c1", prefix: "COM" }, { categoryId: "c2", prefix: "A" }]
  assert.deepEqual(rules.settingSaveErrors(defaults, badPrefix), { "settings.asset_tag_category_prefixes": "invalidPrefix" })
  assert.deepEqual(rules.settingLiveErrors(defaults, badPrefix), { "settings.asset_tag_category_prefixes": "invalidPrefix" })
  // Each setting opens on the tab that shows it (spec §4.2); the depreciation policy is on the organization tab.
  const { getSystemSettingsTabForKey } = await load<{ getSystemSettingsTabForKey(key: string): string }>("src/lib/settings-search.ts")
  assert.equal(getSystemSettingsTabForKey("accounting_depreciation_policy"), "organization")
  assert.equal(getSystemSettingsTabForKey("asset_tag_category_prefixes"), "asset-numbering")
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track3.test.ts`. Expected: 1 test, 1 fail: "the settings rules answer what the server answers for every setting, and the controls' own limits on top (v-track plan 3 task 1, ST1)" (`Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…/src/lib/system-settings-field-rules.ts'`).
- [ ] **Step 3: Implement** (exact; the new file with a file tool, LF; the edit with the Edit tool, which keeps the CRLF):

- Create `src/lib/system-settings-field-rules.ts` (LF) with exactly:

```ts
// The settings form's rules, one setting at a time (V track plan 3, spec
// docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §4.4, §4.5, U8). The form sends every setting in one
// list, and the server keys a refused setting settings.<key> (settingFieldKeyFor), so the form's field keys are the same.
// Each rule answers the code the server's systemSettingsUpdateSchema answers for the same setting (its api-error catalog
// key, or the shared tooLong), so a rule the form finds and the same rule the server finds read one sentence under one
// field. tests/v-track3.test.ts runs both on the same values.
import { assetLabelLayouts, assetLabelSettingKeys, assetLabelTapeSizes, assetLabelTemplateTokens } from "@/lib/asset-label-template"
import { depreciationPolicySettingKey, parseDepreciationPolicySetting } from "@/lib/asset-depreciation"
import { assetQrPublicBaseUrlKey, normalizePublicQrBaseUrl } from "@/lib/asset-qr"
import { normalizeCategoryPrefix, type CategoryPrefixRow } from "@/lib/category-prefix-groups"
import { ldapSyncMaxScheduledDeactivationsKey } from "@/lib/ldap-sync-safety"
import { validateOperationDocumentTemplate } from "@/lib/operation-document-number"
import { isValidRetentionDays, retentionPolicySettingKeys } from "@/lib/retention-policy"
import { isSupportedCronExpression } from "@/lib/scheduled-job"
import {
  assetTagCategoryPrefixesKey,
  assetTagFormatTemplateKey,
  checkinDocumentTemplateKey,
  checkoutDocumentTemplateKey,
  notificationRuleSettingKeys,
  operationDocumentRunningDigitsKey,
} from "@/lib/system-setting-defaults"
import { range, step } from "@/lib/validation-rules"
import { workflowApprovalMinApproversKey, workflowApprovalSettingKeys, workflowApprovalSlaDaysKey } from "@/lib/workflow-approval"

export type SettingEntry = { key: string; value: string }
export type SettingFieldKey = `settings.${string}`

export function settingFieldKey(key: string): SettingFieldKey {
  return `settings.${key}`
}

// The setting a field key names: settings.<key> → <key>.
export function settingKeyOf(field: string): string {
  return field.startsWith("settings.") ? field.slice("settings.".length) : field
}

// The tokens an asset tag template may use (the server's list).
export const assetTagFormatTokens = [
  "companyCode",
  "assetCompanyCode",
  "branchCode",
  "categoryCode",
  "assetPrefix",
  "globalPrefix",
  "year",
  "year2",
  "month",
  "day",
  "running",
  "separator",
]

const templateTokens = (value: string) => Array.from(value.matchAll(/\{([A-Za-z0-9]+)\}/g)).map((match) => match[1])
const labelTemplateKeys = new Set<string>(assetLabelSettingKeys.filter((key) => key.endsWith("_template")))
const labelKeys = (suffix: string) => new Set<string>(assetLabelTapeSizes.map((size) => `asset_label_${size}_${suffix}`))
const labelWidthKeys = labelKeys("width_mm")
const labelHeightKeys = labelKeys("height_mm")
const labelQrSizeKeys = labelKeys("qr_size")
const labelSpacingKeys = new Set<string>([...labelKeys("margin_mm"), ...labelKeys("gap_mm")])
const labelLayoutKeys = labelKeys("layout")
const notificationKeys = new Set<string>(notificationRuleSettingKeys)
const retentionKeys = new Set<string>(retentionPolicySettingKeys)
const approvalToggleKeys = new Set<string>(
  workflowApprovalSettingKeys.filter((key) => key !== workflowApprovalMinApproversKey && key !== workflowApprovalSlaDaysKey)
)
const outside = (value: string, min: number, max: number) => {
  const number = Number(value)
  return !Number.isFinite(number) || number < min || number > max
}
const notWhole = (value: string, min: number, max: number) => {
  const number = Number(value)
  return !Number.isInteger(number) || number < min || number > max
}

// The server's rule for one setting, on the trimmed value it checks: its catalog code, or null.
export function settingRuleCode(key: string, value: string): string | null {
  if (key === assetTagFormatTemplateKey) {
    return !value.includes("{running}") || templateTokens(value).some((token) => !assetTagFormatTokens.includes(token)) ? "assetTagTemplateInvalid" : null
  }
  if (key === "asset_label_default_tape_size") return assetLabelTapeSizes.includes(value as (typeof assetLabelTapeSizes)[number]) ? null : "labelTapeSizeInvalid"
  if (key === assetQrPublicBaseUrlKey) return value && !normalizePublicQrBaseUrl(value) ? "publicQrUrlInvalid" : null
  if (labelWidthKeys.has(key)) return outside(value, 30, 120) ? "labelWidthRange" : null
  if (labelQrSizeKeys.has(key)) return outside(value, 20, 90) ? "labelQrSizeRange" : null
  if (labelHeightKeys.has(key)) return outside(value, 10, 100) ? "labelHeightRange" : null
  if (labelSpacingKeys.has(key)) return outside(value, 0, 10) ? "labelSpacingRange" : null
  if (labelLayoutKeys.has(key)) return assetLabelLayouts.includes(value as (typeof assetLabelLayouts)[number]) ? null : "labelLayoutUnsupported"
  if (key === "asset_label_compact_asset_name_enabled") return value === "true" || value === "false" ? null : "labelToggleInvalid"
  if (labelTemplateKeys.has(key)) {
    return templateTokens(value).some((token) => !(assetLabelTemplateTokens as readonly string[]).includes(token)) ? "labelTemplateTokens" : null
  }
  if (key === checkoutDocumentTemplateKey || key === checkinDocumentTemplateKey) return validateOperationDocumentTemplate(value) ? null : "documentTemplateInvalid"
  if (key === operationDocumentRunningDigitsKey) return outside(value, 1, 12) ? "documentRunningDigitsRange" : null
  if (notificationKeys.has(key)) return notWhole(value, 0, 365) ? "notificationDaysRange" : null
  if (retentionKeys.has(key)) return isValidRetentionDays(value) ? null : "retentionDaysRange"
  if (key === "ldap_sync_mode") return ["preview", "manual", "scheduled"].includes(value) ? null : "schedulerModeInvalid"
  if (key === "ldap_sync_schedule") return isSupportedCronExpression(value) ? null : "schedulerCronInvalid"
  if (key === depreciationPolicySettingKey) return parseDepreciationPolicySetting(value).isValid ? null : "depreciationPolicyInvalid"
  if (approvalToggleKeys.has(key)) return value === "true" || value === "false" ? null : "approvalToggleInvalid"
  if (key === workflowApprovalMinApproversKey) return notWhole(value, 1, 5) ? "approvalMinApproversRange" : null
  if (key === workflowApprovalSlaDaysKey) return notWhole(value, 1, 90) ? "approvalSlaDaysRange" : null
  return null
}

// What the control itself allowed before noValidate, where the server allows more: the asset tag's running digits
// (min 1, max 12), the LDAP sync's deactivation limit (min 0), and the step of the number fields (1, or 0.5 for a label's
// margin and gap). Client rules only (spec §6.3: no new server rule).
export function settingControlCode(key: string, value: string): string | null {
  if (key === "asset_tag_running_digits") return range(value, 1, 12) ?? step(value, 1)
  if (key === ldapSyncMaxScheduledDeactivationsKey) return range(value, 0) ?? step(value, 1)
  if (key === operationDocumentRunningDigitsKey || labelWidthKeys.has(key) || labelHeightKeys.has(key) || labelQrSizeKeys.has(key)) return step(value, 1)
  if (labelSpacingKeys.has(key)) return step(value, 0.5)
  return null
}

// The limits a control's own rule names in its message (outOfRange reads them).
export const settingControlParams: Readonly<Record<string, { min: number; max?: number }>> = {
  asset_tag_running_digits: { min: 1, max: 12 },
  [ldapSyncMaxScheduledDeactivationsKey]: { min: 0 },
}

// The settings whose rule a box showed while the person typed (the 12 boxes of the page, spec U8): the same rule now
// shows under its field while the value breaks it. Every other rule waits for save (U6).
export function isLiveSetting(key: string): boolean {
  return (
    key === assetTagFormatTemplateKey ||
    key === assetQrPublicBaseUrlKey ||
    labelTemplateKeys.has(key) ||
    labelWidthKeys.has(key) ||
    labelHeightKeys.has(key) ||
    labelQrSizeKeys.has(key) ||
    labelSpacingKeys.has(key) ||
    labelLayoutKeys.has(key) ||
    key === checkoutDocumentTemplateKey ||
    key === checkinDocumentTemplateKey ||
    key === operationDocumentRunningDigitsKey ||
    notificationKeys.has(key) ||
    retentionKeys.has(key) ||
    key === depreciationPolicySettingKey ||
    approvalToggleKeys.has(key) ||
    key === workflowApprovalMinApproversKey ||
    key === workflowApprovalSlaDaysKey ||
    key === "ldap_sync_schedule"
  )
}

// A category prefix: 2 to 10 letters A-Z or digits (the prefix editor's rule, and each group of the prefix table).
export function isValidCategoryPrefix(prefix: string) {
  return /^[A-Z0-9]{2,10}$/.test(normalizeCategoryPrefix(prefix))
}

// The prefix table has no server rule: a group whose prefix breaks the editor's rule (only stored data can hold one)
// shows the editor's own sentence, systemSettingsPage.invalidPrefix, under the table.
function prefixRowsCode(rows: readonly CategoryPrefixRow[]): string | null {
  return rows.some((row) => row.categoryId && !isValidCategoryPrefix(row.prefix)) ? "invalidPrefix" : null
}

// The errors a save finds, per setting sent: the server's 5000-character limit, its rule, then the control's own rule;
// and the prefix groups of the active categories.
export function settingSaveErrors(entries: readonly SettingEntry[], prefixRows: readonly CategoryPrefixRow[]) {
  const errors: Partial<Record<SettingFieldKey, string>> = {}
  for (const { key, value } of entries) {
    const trimmed = value.trim()
    const code = (trimmed.length > 5000 ? "tooLong" : null) ?? settingRuleCode(key, trimmed) ?? settingControlCode(key, trimmed)
    if (code) errors[settingFieldKey(key)] = code
  }
  const prefixCode = prefixRowsCode(prefixRows)
  if (prefixCode) errors[settingFieldKey(assetTagCategoryPrefixesKey)] = prefixCode
  return errors
}

// The errors shown while the person types: the server's rule of each live setting, and the prefix groups.
export function settingLiveErrors(entries: readonly SettingEntry[], prefixRows: readonly CategoryPrefixRow[]) {
  const errors: Partial<Record<SettingFieldKey, string>> = {}
  for (const { key, value } of entries) {
    const code = isLiveSetting(key) ? settingRuleCode(key, value.trim()) : null
    if (code) errors[settingFieldKey(key)] = code
  }
  const prefixCode = prefixRowsCode(prefixRows)
  if (prefixCode) errors[settingFieldKey(assetTagCategoryPrefixesKey)] = prefixCode
  return errors
}
```

- `src/lib/settings-search.ts`, edit 1 of 1. Old:

```ts
  if (key === "company_name" || key === "default_currency" || key.startsWith("depreciation_")) return "organization"
```

  New:

```ts
  // The depreciation policy (accounting_depreciation_policy) is edited on the organization tab, with its builder.
  if (key === "company_name" || key === "default_currency" || key.startsWith("depreciation_") || key === "accounting_depreciation_policy") return "organization"
```

  After Step 3, `node --test tests/v-track3.test.ts tests/settings-search.test.ts` passes (3 tests); no pin breaks.
- [ ] **Step 4: Pin and guard edits.** None (the module is new; `tests/settings-search.test.ts` keeps its five keys).
- [ ] **Step 5: Verify.** `node --test tests/v-track3.test.ts tests/settings-search.test.ts tests/v-track-s.test.ts tests/validation-guards.test.ts` (20 tests, 0 fail in the rehearsal); `npm test` (+1; **2293 tests, 2292 pass, 0 fail, 1 skipped**); `npx tsc --noEmit` (clean); `npm run lint` (0 errors, 146 warnings, all under `.agents/`). `node <tools>/eol.mjs src/lib/system-settings-field-rules.ts src/lib/settings-search.ts tests/v-track3.test.ts` prints `0 182`, `46 46` and `0 126`.
- [ ] **Step 6: Commit.** `git add src/lib/system-settings-field-rules.ts src/lib/settings-search.ts tests/v-track3.test.ts`, then `git commit -m "feat(settings): one rule set for the settings form with the server's own codes, and the depreciation policy's tab (v-track plan 3 task 1, ST1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 2 (ST2): A switch, the label name choice, each label field and the depreciation JSON can show their error (`c/admin/system-settings-form.tsx`, `c/admin/depreciation-policy-builder.tsx`)

Spec §7.3 (groups, `<details>`), U8; ST-R6.

**Files:**
- Modify: `src/components/admin/system-settings-form.tsx` (`i/lf w/crlf`), `src/components/admin/depreciation-policy-builder.tsx` (`i/lf w/crlf`)
- Pin: `tests/settings-depreciation-policy-ui.test.ts` (`i/lf w/crlf`)
- Test: `tests/v-track3.test.ts` (LF, append)

**Interfaces:**
- Consumes: `FieldError` (`c/ui/field.tsx`), `FieldGroup` (`c/ui/field-group.tsx`), `Field`'s `id`, `error`, `liveError`.
- Produces: `ToggleField({ id?, error? })`, `LabelAssetNameModeField({ id?, error? })`, `LabelTemplatePanel({ errorFor? })`, `DepreciationPolicyBuilder({ jsonId?, jsonError? })`; nothing calls them with these props yet (Task 3 does), so the page looks and behaves as before except the depreciation JSON's section, which now opens by itself while the JSON is invalid. `read` and `formSource` in the test file.

**Changes at f1ae1828:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| F:18 | `import { Field, FieldHint } from "@/components/ui/field"` | `import { Field, FieldError } …` and `import { FieldGroup } from "@/components/ui/field-group"` (`FieldHint` loses its only reader) | ST-R6 |
| F:2242–2267 `ToggleField` | a `<label>` with a checkbox; no id, no error | a comment; `id?`, `error?` props; a `data-slot="field"` wrapper; the checkbox takes `id`, `aria-invalid`, `aria-describedby`; a `FieldError` under the line | ST-R6 |
| F:2374–2396 `LabelAssetNameModeField` | a label `div`, the `Segmented`, a `FieldHint` | a comment; `id?`, `error?`; `<FieldGroup legend={label} hint={description} error={error} id={id}>` around the unchanged `Segmented` line | ST-R6, spec §7.3 |
| F:2398–2410 `LabelTemplatePanel` props | `getValue`, `setValue` | + `errorFor?: (key: string) => string \| undefined` with its comment | ST-R6 |
| F:2437, 2447, 2457, 2467, 2478, 2489, 2503, 2511, 2519 | `<Field label={labels.labelWidthMm}>` … `<Field label={labels.labelTertiaryLine}>` | each takes `error={errorFor?.(…)}` with its setting key (`asset_label_<size>_width_mm` …) and `liveError` | ST-R3, ST-R6 |
| builder:70–75 props type | `labels`, `onPolicyJsonChange` | + `jsonId?: string`, `jsonError?: React.ReactNode` with a comment | ST-R6 |
| builder:77 | `export function DepreciationPolicyBuilder({ categories, policyJson, labels, onPolicyJsonChange }: …)` | + `jsonId, jsonError` | ST-R6 |
| builder after `const groupRadioName = useId()` | — | `jsonDetailsRef` and an effect that opens the section while `!isPolicyJsonValid` | ST-R6, spec §4.2 |
| builder:333–335 | `<details className=…>` and the one-line `<Field label={labels.depreciationAdvancedJson} hideLabel hint={…} className="mt-3">` | `<details ref={jsonDetailsRef} …>`; the `Field` one prop per line with `id={jsonId}`, `error={jsonError}`, `liveError` | ST-R6 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track3.test.ts` exactly this block (write it with a file tool):

```ts

// The source files the later tests read, with LF line endings.
function read(path: string) {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n")
}
function formSource() {
  return read("src/components/admin/system-settings-form.tsx")
}

test("a switch, the label's name choice, each label field and the depreciation JSON take an id and an error (v-track plan 3 task 2, ST2)", () => {
  const form = formSource()
  // ToggleField: the checkbox takes the id, aria-invalid and aria-describedby; the error sits under the line, never as an alert.
  const toggle = form.slice(form.indexOf("function ToggleField("), form.indexOf("function SyncPreviewPanel("))
  assert.match(toggle, /<input\n\s+id=\{id\}\n\s+type="checkbox"\n\s+checked=\{checked\}\n\s+aria-invalid=\{error \? true : undefined\}\n\s+aria-describedby=\{errorId\}\n/)
  assert.match(toggle, /const errorId = error && id \? `\$\{id\}-error` : undefined/)
  assert.match(toggle, /\{error \? <FieldError id=\{errorId\}>\{error\}<\/FieldError> : null\}/)
  assert.doesNotMatch(toggle, /role="alert"|aria-live/)
  // The label's name choice is one group with its legend, hint and error (spec §7.3); the Segmented line is unchanged.
  assert.match(form, /<FieldGroup legend=\{label\} hint=\{description\} error=\{error\} id=\{id\}>\n\s+<Segmented aria-label=\{label\} value=\{compactEnabled \? "compact" : "full"\}/)
  assert.doesNotMatch(form, /FieldHint/)
  // Each of the nine fields of a tape's panel shows its setting's error and announces it while typing (spec U8).
  const panel = form.slice(form.indexOf("function LabelTemplatePanel("), form.indexOf("function LabelPreviewPanel("))
  assert.match(panel, /errorFor\?: \(key: string\) => string \| undefined\n/)
  for (const suffix of ["width_mm", "height_mm", "qr_size", "margin_mm", "gap_mm", "layout", "primary_template", "secondary_template", "tertiary_template"]) {
    assert.ok(panel.includes(`error={errorFor?.(\`\${prefix}_${suffix}\`)} liveError>`), suffix)
  }
  // The depreciation JSON: its id and its live error, and its closed section opens while the JSON is invalid.
  const builder = read("src/components/admin/depreciation-policy-builder.tsx")
  assert.match(builder, /export function DepreciationPolicyBuilder\(\{ categories, policyJson, labels, onPolicyJsonChange, jsonId, jsonError \}: DepreciationPolicyBuilderProps\) \{/)
  assert.match(builder, /<details ref=\{jsonDetailsRef\} className="rounded-md border border-border bg-background p-4">/)
  assert.match(builder, /useEffect\(\(\) => \{\n\s+if \(!isPolicyJsonValid && jsonDetailsRef\.current\) jsonDetailsRef\.current\.open = true\n\s+\}, \[isPolicyJsonValid\]\)/)
  assert.match(builder, /hint=\{labels\.depreciationAdvancedJsonDescription\}\n\s+id=\{jsonId\}\n\s+error=\{jsonError\}\n\s+liveError\n\s+className="mt-3"\n\s+>\n\s+<Textarea value=\{policyJson\}/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track3.test.ts`. Expected: 2 tests, 1 fail: "a switch, the label's name choice, each label field and the depreciation JSON take an id and an error (v-track plan 3 task 2, ST2)" (`AssertionError: The input did not match the regular expression /<input\n\s+id=\{id\}\n…/`).
- [ ] **Step 3: Implement** (exact; the Edit tool keeps the files' CRLF):

- `src/components/admin/system-settings-form.tsx`, edit 1 of 13. Old:

```tsx
import { Field, FieldHint } from "@/components/ui/field"
import { checkboxVariants, fieldLabelClasses } from "@/components/ui/field-variants"
```

  New:

```tsx
import { Field, FieldError } from "@/components/ui/field"
import { FieldGroup } from "@/components/ui/field-group"
import { checkboxVariants, fieldLabelClasses } from "@/components/ui/field-variants"
```

- `src/components/admin/system-settings-form.tsx`, edit 2 of 13. Old:

```tsx
function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex min-h-10 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground">
      <span className="min-w-0">
        <span className="block">{label}</span>
        {description ? <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">{description}</span> : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className={checkboxVariants()}
      />
    </label>
  )
}
```

  New:

```tsx
// A switch setting on one line. With an error (a stored value that is neither true nor false), the error shows under
// the line and the checkbox is tied to it; id is what focus moves to (v-track plan 3 ST-R6).
function ToggleField({
  id,
  label,
  description,
  checked,
  error,
  onChange,
}: {
  id?: string
  label: string
  description?: string
  checked: boolean
  error?: React.ReactNode
  onChange: (checked: boolean) => void
}) {
  const errorId = error && id ? `${id}-error` : undefined
  return (
    <div data-slot="field" className="grid min-w-0 content-start gap-1.5">
      <label className="flex min-h-10 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground">
        <span className="min-w-0">
          <span className="block">{label}</span>
          {description ? <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">{description}</span> : null}
        </span>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          onChange={(event) => onChange(event.target.checked)}
          className={checkboxVariants()}
        />
      </label>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  )
}
```

- `src/components/admin/system-settings-form.tsx`, edit 3 of 13. Old:

```tsx
function LabelAssetNameModeField({
  label,
  description,
  compactLabel,
  fullLabel,
  compactEnabled,
  onChange,
}: {
  label: string
  description: string
  compactLabel: string
  fullLabel: string
  compactEnabled: boolean
  onChange: (compactEnabled: boolean) => void
}) {
  return (
    <div className="space-y-2">
      <div className={fieldLabelClasses}>{label}</div>
      <Segmented aria-label={label} value={compactEnabled ? "compact" : "full"} options={[{ value: "compact", label: compactLabel }, { value: "full", label: fullLabel }]} onValueChange={(next) => onChange(next === "compact")} showCheck />
      <FieldHint>{description}</FieldHint>
    </div>
  )
}
```

  New:

```tsx
// The two choices are one group (spec §7.3): its legend, its hint and, for a stored value that is neither true nor
// false, its error, tied to the group; focus goes to its first choice (v-track plan 3 ST-R6).
function LabelAssetNameModeField({
  id,
  label,
  description,
  compactLabel,
  fullLabel,
  compactEnabled,
  error,
  onChange,
}: {
  id?: string
  label: string
  description: string
  compactLabel: string
  fullLabel: string
  compactEnabled: boolean
  error?: React.ReactNode
  onChange: (compactEnabled: boolean) => void
}) {
  return (
    <FieldGroup legend={label} hint={description} error={error} id={id}>
      <Segmented aria-label={label} value={compactEnabled ? "compact" : "full"} options={[{ value: "compact", label: compactLabel }, { value: "full", label: fullLabel }]} onValueChange={(next) => onChange(next === "compact")} showCheck />
    </FieldGroup>
  )
}
```

- `src/components/admin/system-settings-form.tsx`, edit 4 of 13. Old:

```tsx
  getValue,
  setValue,
}: {
  tapeSize: AssetLabelTapeSize
  title: string
  labels: SystemSettingsFormProps["labels"]
  getValue: (key: string) => string
  setValue: (key: string, value: string) => void
}) {
```

  New:

```tsx
  getValue,
  setValue,
  errorFor,
}: {
  tapeSize: AssetLabelTapeSize
  title: string
  labels: SystemSettingsFormProps["labels"]
  getValue: (key: string) => string
  setValue: (key: string, value: string) => void
  // A setting's error under its field: its rule shows while the value breaks it (spec U8), so the field announces it.
  errorFor?: (key: string) => string | undefined
}) {
```

- `src/components/admin/system-settings-form.tsx`, edit 5 of 13. Old:

```tsx
<Field label={labels.labelWidthMm}>
```

  New:

```tsx
<Field label={labels.labelWidthMm} error={errorFor?.(`${prefix}_width_mm`)} liveError>
```

- `src/components/admin/system-settings-form.tsx`, edit 6 of 13. Old:

```tsx
<Field label={labels.labelHeightMm}>
```

  New:

```tsx
<Field label={labels.labelHeightMm} error={errorFor?.(`${prefix}_height_mm`)} liveError>
```

- `src/components/admin/system-settings-form.tsx`, edit 7 of 13. Old:

```tsx
<Field label={labels.labelQrSize}>
```

  New:

```tsx
<Field label={labels.labelQrSize} error={errorFor?.(`${prefix}_qr_size`)} liveError>
```

- `src/components/admin/system-settings-form.tsx`, edit 8 of 13. Old:

```tsx
<Field label={labels.labelMarginMm}>
```

  New:

```tsx
<Field label={labels.labelMarginMm} error={errorFor?.(`${prefix}_margin_mm`)} liveError>
```

- `src/components/admin/system-settings-form.tsx`, edit 9 of 13. Old:

```tsx
<Field label={labels.labelGapMm}>
```

  New:

```tsx
<Field label={labels.labelGapMm} error={errorFor?.(`${prefix}_gap_mm`)} liveError>
```

- `src/components/admin/system-settings-form.tsx`, edit 10 of 13. Old:

```tsx
<Field label={labels.labelLayout}>
```

  New:

```tsx
<Field label={labels.labelLayout} error={errorFor?.(`${prefix}_layout`)} liveError>
```

- `src/components/admin/system-settings-form.tsx`, edit 11 of 13. Old:

```tsx
<Field label={labels.labelPrimaryLine}>
```

  New:

```tsx
<Field label={labels.labelPrimaryLine} error={errorFor?.(`${prefix}_primary_template`)} liveError>
```

- `src/components/admin/system-settings-form.tsx`, edit 12 of 13. Old:

```tsx
<Field label={labels.labelSecondaryLine}>
```

  New:

```tsx
<Field label={labels.labelSecondaryLine} error={errorFor?.(`${prefix}_secondary_template`)} liveError>
```

- `src/components/admin/system-settings-form.tsx`, edit 13 of 13. Old:

```tsx
<Field label={labels.labelTertiaryLine}>
```

  New:

```tsx
<Field label={labels.labelTertiaryLine} error={errorFor?.(`${prefix}_tertiary_template`)} liveError>
```

- `src/components/admin/depreciation-policy-builder.tsx`, edit 1 of 4. Old:

```tsx
  labels: DepreciationPolicyBuilderLabels
  onPolicyJsonChange: (value: string) => void
}
```

  New:

```tsx
  labels: DepreciationPolicyBuilderLabels
  onPolicyJsonChange: (value: string) => void
  // The policy JSON's id and its error (the settings form's rule for accounting_depreciation_policy, spec U8).
  jsonId?: string
  jsonError?: React.ReactNode
}
```

- `src/components/admin/depreciation-policy-builder.tsx`, edit 2 of 4. Old:

```tsx
export function DepreciationPolicyBuilder({ categories, policyJson, labels, onPolicyJsonChange }: DepreciationPolicyBuilderProps) {
```

  New:

```tsx
export function DepreciationPolicyBuilder({ categories, policyJson, labels, onPolicyJsonChange, jsonId, jsonError }: DepreciationPolicyBuilderProps) {
```

- `src/components/admin/depreciation-policy-builder.tsx`, edit 3 of 4. Old:

```tsx
  const groupRadioName = useId()
```

  New:

```tsx
  const groupRadioName = useId()
  // Invalid JSON disables every control above it, so its closed section opens to show the JSON and its error (spec §4.2).
  const jsonDetailsRef = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    if (!isPolicyJsonValid && jsonDetailsRef.current) jsonDetailsRef.current.open = true
  }, [isPolicyJsonValid])
```

- `src/components/admin/depreciation-policy-builder.tsx`, edit 4 of 4. Old:

```tsx
      <details className="rounded-md border border-border bg-background p-4">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">{labels.depreciationAdvancedJson}</summary>
        <Field label={labels.depreciationAdvancedJson} hideLabel hint={labels.depreciationAdvancedJsonDescription} className="mt-3">
```

  New:

```tsx
      <details ref={jsonDetailsRef} className="rounded-md border border-border bg-background p-4">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">{labels.depreciationAdvancedJson}</summary>
        <Field
          label={labels.depreciationAdvancedJson}
          hideLabel
          hint={labels.depreciationAdvancedJsonDescription}
          id={jsonId}
          error={jsonError}
          liveError
          className="mt-3"
        >
```

  After Step 3 and before Step 4, `node --test tests/settings-depreciation-policy-ui.test.ts` fails one test: "the depreciation builder uses the shared fields: compact preview and search, and a named JSON box (1f)". That is expected; Step 4 is its edit.
- [ ] **Step 4: Pin edit** (exact; the old string occurs once):

- `tests/settings-depreciation-policy-ui.test.ts`, edit 1 of 1. Old:

```ts
  assert.match(builder, /<Field label=\{labels\.depreciationAdvancedJson\} hideLabel hint=\{labels\.depreciationAdvancedJsonDescription\} className="mt-3">/)
```

  New:

```ts
  assert.match(builder, /<Field\n\s+label=\{labels\.depreciationAdvancedJson\}\n\s+hideLabel\n\s+hint=\{labels\.depreciationAdvancedJsonDescription\}\n[\s\S]*?className="mt-3"\n\s+>/)
```

- [ ] **Step 5: Verify.** `node --test tests/v-track3.test.ts tests/settings-depreciation-policy-ui.test.ts tests/asset-label-print-ui.test.ts tests/field-primitives.test.ts tests/admin-sweep-ui.test.ts tests/steps-ui.test.ts tests/form-migration-guards.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts tests/validation-guards.test.ts` (146 tests, 0 fail in the rehearsal); `npm test` (+1; **2294 tests, 2293 pass, 0 fail, 1 skipped**); `npx tsc --noEmit`; `npm run lint` (0 errors, 146 warnings). `node <tools>/eol.mjs src/components/admin/system-settings-form.tsx src/components/admin/depreciation-policy-builder.tsx tests/settings-depreciation-policy-ui.test.ts tests/v-track3.test.ts` prints `2633 2633`, `448 448`, `103 103` and `0 159`.
- [ ] **Step 6: Commit.** `git add src/components/admin/system-settings-form.tsx src/components/admin/depreciation-policy-builder.tsx tests/settings-depreciation-policy-ui.test.ts tests/v-track3.test.ts`, then `git commit -m "feat(settings): a switch, the label name choice, each label field and the depreciation JSON can show their error (v-track plan 3 task 2, ST2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 3 (ST3): Every setting shows its error under its field, and a save opens the tab of the first wrong one (`c/admin/system-settings-form.tsx`)

Spec §4.1, §4.2 (settings tabs), §4.3, §4.5, §5 #45, U1, U2, U6, U8, §6.1; plan 1 M-R1–M-R5, F-R4–F-R6; ST-R2–ST-R5.

**Files:**
- Modify: `src/components/admin/system-settings-form.tsx` (`i/lf w/crlf`)
- Pins: `tests/settings-depreciation-policy-ui.test.ts` (`i/lf w/crlf`), `tests/settings-tab-persistence-ui.test.ts` (`i/lf w/crlf`)
- Test: `tests/v-track3.test.ts` (LF, append)

**Interfaces:**
- Consumes: Task 1's module; Task 2's props; `useFieldErrors`, `useValidationMessage`; `getSystemSettingsTabForKey`, `selectTab`.
- Produces: the form as a V form (its `V_FORMS` row waits for Task 4, the file's last form): `SETTING_FIELD_IDS`, `settingFieldId`, `validate`, `fieldErrors`, `validationMessage`, `submittedSettings`, `liveErrors`, `settingError`, `prefixGroupsError`, `fieldOrder`, `focusFirstError`.

**Changes at f1ae1828** (70 exact edits below, in the order they apply; each row names its edits):

| Line | Now | Becomes | Rule | Edits |
|---|---|---|---|---|
| F:34–47, F:67–75 imports | `assetLabelLayouts`, `type AssetLabelLayout`, `parseDepreciationPolicySetting`, `normalizePublicQrBaseUrl`, `validateOperationDocumentTemplate`, `isValidRetentionDays`, `isSupportedCronExpression` | gone (their only readers were the rule computations) | ST-R2 | 1, 2 |
| after F:88 | — | the rules module's import (`assetTagFormatTokens`, `isValidCategoryPrefix`, `settingControlParams`, `settingFieldKey`, `settingKeyOf`, `settingLiveErrors`, `settingSaveErrors`, `type SettingEntry`, `type SettingFieldKey`) | ST-R2 | 3 |
| after F:98 | — | `import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"` | M-R3 | 4 |
| F:454–467 | `const assetTagFormatTokens = [ … ]` | gone (imported) | ST-R2 | 5 |
| after F:509 | — | `LABEL_FIELD_SUFFIXES`, `SETTING_FIELD_IDS` (visual order), `settingFieldId`, and the module-level `validate(entries, prefixRows)` over `settingSaveErrors`, each with its comment | M-R1, M-R2, ST-R4 | 6 |
| after F:568 | — | `const fieldErrors = useFieldErrors<SettingFieldKey>()`, `const validationMessage = useValidationMessage()` | M-R3 | 7 |
| F:578 `setValue` | one line, `setValues` only | also `fieldErrors.clear(settingFieldKey(key))`, with a comment | M-R5, spec §4.3 | 8 |
| F:633, F:637 | `applyPrefixEditor`, `removePrefixGroup` change the groups | each also clears `settings.asset_tag_category_prefixes` | spec §4.3 | 9, 10 |
| F:667–669 | `selectedPrefixCategoryIds`, `hasDuplicateCategory`, `hasInvalidPrefix` | gone (ST-R5) | ST-R5 | 11 |
| F:681–750 | `templateTokens` … `hasInvalidSchedulerSchedule` | the values the page still shows (`publicQrBaseUrl`, `publicQrPreviewValue`, `labelTemplates`, `syncSchedule`, `selectedSyncSchedulePreset`), then `submittedSettings`, `liveErrors`, `settingError(key)`, `prefixGroupsError` | ST-R2, ST-R3 | 12 |
| F:851–919 `handleSubmit` | 12 `toast.error(…)` + `return`; `nextValues`; `throw` on any refusal | `fieldErrors.setErrors(validate(submittedSettings, activePrefixRows))`, `if (focusFirstError()) return`; the body `{ settings: submittedSettings }` (the same JSON as before); `if (fieldErrors.applyServer(payload) && focusFirstError()) return` before the `throw` | M-R4, spec §4.1 | 13 |
| after F:781 | — | `fieldOrder` and `focusFirstError` with `idFor` and `reveal` (the tab switch: the setting's tab, the advanced tab for an advanced setting whatever its prefix) | ST-R4, spec §4.2 | 14 |
| F:976 | `<form onSubmit={handleSubmit} className="space-y-6">` | `noValidate` after `onSubmit` | FIXED 6 | 15 |
| F:1032, 1041 | the template `Field`; its box | `error={settingError(assetTagFormatTemplateKey)} liveError`; the box gone | ST-R3 | 16, 17 |
| F:1067–1072 | token buttons through `setValues` | `setValue(assetTagFormatTemplateKey, …)` (clears the error) | spec §4.3 | 18 |
| F:1088, 1098, 1105 | running digits, separator, global prefix | `error={settingError("…")}` (save only) | ST-R3 | 19–21 |
| F:1123, 1133 | QR base URL `Field`; its box | `error=… liveError`; the box gone | ST-R3 | 22, 23 |
| F:1143, 1156–1163, 1179–1181 | tape size; label name choice; `LabelTemplatePanel` | `error=` (save only); `id="asset-label-compact-asset-name"` and `error=`; `errorFor={settingError}` | ST-R3, ST-R6 | 24–26 |
| F:1185–1186 | the two label boxes | gone | ST-R3 | 27 |
| F:1207, 1215, 1223, 1245 | the three document fields; their box | `error=… liveError` ×3; the box gone | ST-R3 | 28–31 |
| F:1272, 1348–1349 | the prefix panel body `div`; its two boxes | the group `div` (`id="category-prefix-groups"`, `role="group"`, `aria-label`, `aria-describedby`) with a JSX comment; one `FieldError` (`category-prefix-groups-error`) | ST-R5 | 32, 33 |
| F:1471, 1478, 1487–1494 | company name, currency; the builder and its box | `error=` ×2 (save only); `jsonId="depreciation-policy-json"`, `jsonError={settingError(depreciationPolicySettingKey)}`; the box gone | ST-R3, ST-R6 | 34–36 |
| F:1504, 1514, 1524, 1534, 1546 | four notification days; their box | `error=… liveError` ×4; the box gone | ST-R3 | 37–41 |
| F:1556–1594 | three approval switches; minimum approvers, SLA days; their box | `id` and `error` on each `ToggleField`; `error=… liveError` ×2; the box gone | ST-R3, ST-R6 | 42–47 |
| F:1603 | the scheduler box on the automation tab | gone (its field is on LDAP sync) | ST-R3 | 48 |
| F:1621, 1631, 1641, 1653 | three retention days; their box | `error=… liveError` ×3; the box gone | ST-R3 | 49–52 |
| F:1680–1746 | eight LDAP login text fields | `error={settingError("ldap_…")}` (save only) | ST-R3, ST-R4 | 53–60 |
| F:1810–1907 | sync mode, deactivation limit, base DN, three default codes, filter, custom schedule | `error=` (save only) ×7; the custom schedule `error=… liveError` | ST-R3 | 61–68 |
| F:1975–1980 | an advanced setting's `Field` and `Input` (no id), through `setValues` | `error={settingError(setting.key)}`; `id={settingFieldId(setting.key)}`; `setValue` | ST-R4 | 69 |
| F:2131–2133 | `function isValidCategoryPrefix` | gone (imported) | ST-R2 | 70 |

Not changed by this task (pinned elsewhere): the `ValidationMessage` function and the editor's box (Task 4), the editor's `canApplyPrefixEditor` (Task 4), the save button and the LDAP apply (Task 5), the `labels` type (Task 6), every `toast.success` and `apiError.toast` (not validation toasts; the two `apiError.toast` calls sit in catches).

- [ ] **Step 1: The failing test.** Append to `tests/v-track3.test.ts` exactly this block (write it with a file tool):

```ts

// Each setting the form shows, in visual order, with its id, as the form's SETTING_FIELD_IDS lists them, and the
// expression its error is read with (true: the rule shows while typing, spec U8).
function settingFields(): [key: string, id: string, errorKey: string, live: boolean][] {
  return [
    ["asset_tag_format_template", "asset-tag-template", "assetTagFormatTemplateKey", true],
    ["asset_tag_running_digits", "asset-tag-running-digits", '"asset_tag_running_digits"', false],
    ["asset_tag_separator", "asset-tag-separator", '"asset_tag_separator"', false],
    ["asset_tag_prefix", "asset-tag-global-prefix", '"asset_tag_prefix"', false],
    ["asset_tag_category_prefixes", "category-prefix-groups", "assetTagCategoryPrefixesKey", false],
    ["asset_qr_public_base_url", "asset-qr-public-base-url", "assetQrPublicBaseUrlKey", true],
    ["asset_label_default_tape_size", "asset-label-default-tape-size", '"asset_label_default_tape_size"', false],
    ["asset_label_compact_asset_name_enabled", "asset-label-compact-asset-name", '"asset_label_compact_asset_name_enabled"', false],
    ["checkout_document_template", "checkout-document-template", "checkoutDocumentTemplateKey", true],
    ["checkin_document_template", "checkin-document-template", "checkinDocumentTemplateKey", true],
    ["operation_document_running_digits", "operation-document-running-digits", "operationDocumentRunningDigitsKey", true],
    ["company_name", "company-name", '"company_name"', false],
    ["default_currency", "default-currency", '"default_currency"', false],
    ["accounting_depreciation_policy", "depreciation-policy-json", "depreciationPolicySettingKey", true],
    ["notification_return_due_soon_days", "notification-return-due-days", "notificationReturnDueSoonDaysKey", true],
    ["notification_audit_action_due_soon_days", "notification-audit-action-days", "notificationAuditActionDueSoonDaysKey", true],
    ["notification_warranty_expiry_days", "notification-warranty-expiry-days", "notificationWarrantyExpiryDaysKey", true],
    ["notification_license_expiry_days", "notification-license-expiry-days", "notificationLicenseExpiryDaysKey", true],
    ["workflow_approval_disposal_required", "workflow-approval-disposal-required", "workflowApprovalDisposalRequiredKey", false],
    ["workflow_approval_audit_close_required", "workflow-approval-audit-close-required", "workflowApprovalAuditCloseRequiredKey", false],
    ["workflow_approval_segregation_required", "workflow-approval-segregation-required", "workflowApprovalSegregationRequiredKey", false],
    ["workflow_approval_min_approvers", "workflow-approval-min-approvers", "workflowApprovalMinApproversKey", true],
    ["workflow_approval_sla_days", "workflow-approval-sla-days", "workflowApprovalSlaDaysKey", true],
    ["retention_attachment_days", "retention-attachment-days", "retentionAttachmentDaysKey", true],
    ["retention_audit_log_days", "retention-audit-log-days", "retentionAuditLogDaysKey", true],
    ["retention_orphan_file_days", "retention-orphan-file-days", "retentionOrphanFileDaysKey", true],
    ["ldap_url", "ldap-url", '"ldap_url"', false],
    ["ldap_base_dn", "ldap-base-dn", '"ldap_base_dn"', false],
    ["ldap_bind_dn", "ldap-bind-dn", '"ldap_bind_dn"', false],
    ["ldap_bind_password", "ldap-bind-password", '"ldap_bind_password"', false],
    ["ldap_user_filter", "ldap-user-filter", '"ldap_user_filter"', false],
    ["ldap_upn_domain", "ldap-upn-domain", '"ldap_upn_domain"', false],
    ["ldap_domain", "ldap-domain", '"ldap_domain"', false],
    ["ldap_user_dn_template", "ldap-user-dn-template", '"ldap_user_dn_template"', false],
    ["ldap_sync_mode", "ldap-sync-mode", '"ldap_sync_mode"', false],
    ["ldap_sync_max_scheduled_deactivations", "ldap-sync-max-scheduled-deactivations", '"ldap_sync_max_scheduled_deactivations"', false],
    ["ldap_sync_base_dn", "ldap-sync-base-dn", '"ldap_sync_base_dn"', false],
    ["ldap_sync_default_company_code", "ldap-sync-default-company", '"ldap_sync_default_company_code"', false],
    ["ldap_sync_default_branch_code", "ldap-sync-default-branch", '"ldap_sync_default_branch_code"', false],
    ["ldap_sync_default_department_code", "ldap-sync-default-department", '"ldap_sync_default_department_code"', false],
    ["ldap_sync_filter", "ldap-sync-filter", '"ldap_sync_filter"', false],
    ["ldap_sync_schedule", "ldap-sync-custom-schedule", '"ldap_sync_schedule"', true],
  ]
}

test("the settings form shows every setting's error under its field, opens its tab and focuses it, and takes the server's refusals (v-track plan 3 task 3, ST3)", async () => {
  const form = formSource()
  assert.match(form, /<form onSubmit=\{handleSubmit\} noValidate className="space-y-6">/)
  assert.match(form, /^import \{ useFieldErrors, useValidationMessage \} from "@\/components\/ui\/use-field-errors"$/m)
  assert.match(form, /\} from "@\/lib\/system-settings-field-rules"\n/)
  // The field table in visual order: the rows, with the four tapes' label settings after the compact choice.
  const table = form.match(/const SETTING_FIELD_IDS: Readonly<Record<string, string>> = \{\n([\s\S]*?)\n\}\n/)
  assert.ok(table, "const SETTING_FIELD_IDS = { … }")
  const rows = table[1].split("\n").filter((line) => /^ {2}\w+: "[\w-]+",$/.test(line))
  assert.deepEqual(rows, settingFields().map(([key, id]) => `  ${key}: "${id}",`))
  assert.match(table[1], /\n {2}\.\.\.Object\.fromEntries\(\n {4}assetLabelTapeSizes\.flatMap\(\(size\) => LABEL_FIELD_SUFFIXES\.map\(\(suffix\) => \[`asset_label_\$\{size\}_\$\{suffix\}`, `asset_label_\$\{size\}-\$\{suffix\.replace\(\/_\/g, "-"\)\}`\]\)\)\n {2}\),\n {2}checkout_document_template:/)
  assert.match(form, /const LABEL_FIELD_SUFFIXES = \["width_mm", "height_mm", "qr_size", "margin_mm", "gap_mm", "layout", "primary_template", "secondary_template", "tertiary_template"\]/)
  // Visual order is tab order: the tabs of the table's settings never go back.
  const { getSystemSettingsTabForKey } = await load<{ getSystemSettingsTabForKey(key: string): string }>("src/lib/settings-search.ts")
  const { settingsTabIds } = await load<{ settingsTabIds: readonly string[] }>("src/lib/settings-information-architecture.ts")
  const tabs = settingFields().map(([key]) => settingsTabIds.indexOf(getSystemSettingsTabForKey(key)))
  assert.ok(tabs.every((tab, index) => tab >= 0 && (index === 0 || tab >= tabs[index - 1])), `tab order ${tabs.join(" ")}`)
  // Each id once on its control, and each setting's error under its field, live where a box showed it (spec U8).
  for (const [key, id, errorKey, live] of settingFields()) {
    // The prefix groups and the depreciation JSON take their ids in their own lines (below).
    if (key !== "asset_tag_category_prefixes" && key !== "accounting_depreciation_policy") assert.equal(form.split(`id="${id}"`).length - 1, 1, `id "${id}" once`)
    if (key === "asset_tag_category_prefixes" || key === "accounting_depreciation_policy") continue
    const error = live ? `error={settingError(${errorKey})} liveError` : `error={settingError(${errorKey})}`
    assert.equal(form.split(error).length - 1, 1, `${key}: ${error}`)
    if (!live) assert.ok(!form.includes(`${error} liveError`), `${key} waits for save (U6)`)
  }
  assert.ok(form.includes('jsonId="depreciation-policy-json"\n              jsonError={settingError(depreciationPolicySettingKey)}'))
  assert.match(form, /<div\n\s+id="category-prefix-groups"\n\s+role="group"\n\s+aria-label=\{labels\.categoryPrefixes\}\n\s+aria-describedby=\{prefixGroupsError \? "category-prefix-groups-error" : undefined\}/)
  assert.ok(form.includes('{prefixGroupsError ? <FieldError id="category-prefix-groups-error">{prefixGroupsError}</FieldError> : null}'))
  assert.ok(form.includes("errorFor={settingError}"))
  assert.match(form, /<Field label=\{setting\.key\} hideLabel error=\{settingError\(setting\.key\)\}>\n\s+<Input\n\s+id=\{settingFieldId\(setting\.key\)\}/)
  assert.match(form, /const settingFieldId = \(key: string\) => SETTING_FIELD_IDS\[key\] \?\? `setting-\$\{key\}`/)
  // The live rules and the save's errors: one line per field, the live one first; invalidPrefix reads the editor's sentence.
  assert.match(form, /const liveErrors = settingLiveErrors\(submittedSettings, activePrefixRows\)/)
  assert.match(form, /const code = liveErrors\[field\] \?\? fieldErrors\.errors\[field\]\n\s+if \(!code\) return undefined\n\s+return code === "invalidPrefix" \? labels\.invalidPrefix : validationMessage\(code, settingControlParams\[key\]\)/)
  assert.match(form, /^function validate\(entries: readonly SettingEntry\[\], prefixRows: readonly CategoryPrefixRow\[\]\) \{\n {2}return settingSaveErrors\(entries, prefixRows\)\n\}$/m)
  // Save: validate, then the first wrong setting's tab opens and its field takes focus; a refusal does the same.
  const submit = form.slice(form.indexOf("  async function handleSubmit("), form.indexOf("  async function handleLdapTest("))
  assert.match(submit, /fieldErrors\.setErrors\(validate\(submittedSettings, activePrefixRows\)\)\n\s+if \(focusFirstError\(\)\) return\n/)
  assert.match(submit, /body: JSON\.stringify\(\{ settings: submittedSettings \}\)/)
  assert.match(submit, /if \(!response\.ok\) \{\n[^\n]*\n\s+if \(fieldErrors\.applyServer\(payload\) && focusFirstError\(\)\) return\n\s+throw new Error\(payload\?\.error \?\? labels\.error\)\n\s+\}/)
  assert.match(form, /const fieldOrder = \[\.\.\.Object\.keys\(SETTING_FIELD_IDS\), \.\.\.generalSettings\.map\(\(setting\) => setting\.key\)\]\.map\(settingFieldKey\)/)
  assert.match(form, /fieldErrors\.focusFirst\(fieldOrder, \{\n\s+idFor: \(field\) => settingFieldId\(settingKeyOf\(field\)\),\n\s+reveal: \(field\) => selectTab\(SETTING_FIELD_IDS\[settingKeyOf\(field\)\] \? getSystemSettingsTabForKey\(settingKeyOf\(field\)\) : "advanced"\),\n\s+\}\)/)
  // A change clears its setting's error; so does a change of the prefix groups.
  assert.match(form, /const setValue = \(key: string, value: string\) => \{\n\s+setValues\(\(current\) => \(\{ \.\.\.current, \[key\]: value \}\)\)\n\s+fieldErrors\.clear\(settingFieldKey\(key\)\)\n\s+\}/)
  assert.equal(form.split("fieldErrors.clear(settingFieldKey(assetTagCategoryPrefixesKey))").length - 1, 2)
  assert.doesNotMatch(form, /setValues\(\(current\) => \(\{ \.\.\.current, \[(?:setting\.key|assetTagFormatTemplateKey)\]/)
  // No validation toast and no box on the page: the rules live in the rules module (the prefix editor is task 4).
  assert.doesNotMatch(form, /\btoast\.(?:error|warning)\(/)
  assert.doesNotMatch(form, /hasInvalid|hasDuplicateCategory|const assetTagFormatTokens = \[|function isValidCategoryPrefix/)
  assert.doesNotMatch(form, /<ValidationMessage message=\{labels\.(?!invalidPrefix\})/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track3.test.ts`. Expected: 3 tests, 1 fail: "the settings form shows every setting's error under its field, opens its tab and focuses it, and takes the server's refusals (v-track plan 3 task 3, ST3)" (`AssertionError: The input did not match the regular expression /<form onSubmit=\{handleSubmit\} noValidate className="space-y-6">/`).
- [ ] **Step 3: Implement** (exact, in this order; the Edit tool keeps the file's CRLF; each old text occurs once at its turn):

- `src/components/admin/system-settings-form.tsx`, edit 1 of 70. Old:

```tsx
import {
  assetLabelLayouts,
  assetLabelPresets,
  assetLabelSettingKeys,
  assetLabelTapeSizes,
  assetLabelTemplateTokens,
  parseAssetLabelTemplates,
  renderAssetLabelTemplate,
  type AssetLabelLayout,
  type AssetLabelTapeSize,
  type AssetLabelTemplates,
} from "@/lib/asset-label-template"
import { depreciationPolicySettingKey, parseDepreciationPolicySetting } from "@/lib/asset-depreciation"
import { assetQrPublicBaseUrlKey, buildAssetQrValue, normalizePublicQrBaseUrl } from "@/lib/asset-qr"
```

  New:

```tsx
import {
  assetLabelPresets,
  assetLabelSettingKeys,
  assetLabelTapeSizes,
  assetLabelTemplateTokens,
  parseAssetLabelTemplates,
  renderAssetLabelTemplate,
  type AssetLabelTapeSize,
  type AssetLabelTemplates,
} from "@/lib/asset-label-template"
import { depreciationPolicySettingKey } from "@/lib/asset-depreciation"
import { assetQrPublicBaseUrlKey, buildAssetQrValue } from "@/lib/asset-qr"
```

- `src/components/admin/system-settings-form.tsx`, edit 2 of 70. Old:

```tsx
import { operationDocumentTemplateTokens, renderOperationDocumentTemplate, validateOperationDocumentTemplate } from "@/lib/operation-document-number"
import { retiredSystemSettingKeys } from "@/lib/retired-system-settings"
import {
  isValidRetentionDays,
  retentionAttachmentDaysKey,
  retentionAuditLogDaysKey,
  retentionOrphanFileDaysKey,
} from "@/lib/retention-policy"
import { isSupportedCronExpression } from "@/lib/scheduled-job"
```

  New:

```tsx
import { operationDocumentTemplateTokens, renderOperationDocumentTemplate } from "@/lib/operation-document-number"
import { retiredSystemSettingKeys } from "@/lib/retired-system-settings"
import {
  retentionAttachmentDaysKey,
  retentionAuditLogDaysKey,
  retentionOrphanFileDaysKey,
} from "@/lib/retention-policy"
```

- `src/components/admin/system-settings-form.tsx`, edit 3 of 70. Old:

```tsx
  type CategoryPrefixRow,
} from "@/lib/category-prefix-groups"
```

  New:

```tsx
  type CategoryPrefixRow,
} from "@/lib/category-prefix-groups"
import {
  assetTagFormatTokens,
  isValidCategoryPrefix,
  settingControlParams,
  settingFieldKey,
  settingKeyOf,
  settingLiveErrors,
  settingSaveErrors,
  type SettingEntry,
  type SettingFieldKey,
} from "@/lib/system-settings-field-rules"
```

- `src/components/admin/system-settings-form.tsx`, edit 4 of 70. Old:

```tsx
import { useApiError } from "@/components/ui/use-api-error"
```

  New:

```tsx
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"
```

- `src/components/admin/system-settings-form.tsx`, edit 5 of 70. Old:

```tsx
const assetTagFormatTokens = [
  "companyCode",
  "assetCompanyCode",
  "branchCode",
  "categoryCode",
  "assetPrefix",
  "globalPrefix",
  "year",
  "year2",
  "month",
  "day",
  "running",
  "separator",
]

const formatPresets = [
```

  New:

```tsx
const formatPresets = [
```

- `src/components/admin/system-settings-form.tsx`, edit 6 of 70. Old:

```tsx
  { value: "custom", labelKey: "ldapSyncCustomSchedule" },
] as const
```

  New:

```tsx
  { value: "custom", labelKey: "ldapSyncCustomSchedule" },
] as const

// Each setting the form shows, in visual order (the tabs in their order, then down each tab), with the id focus moves to
// (v-track M-R1, plan 3 ST-R4). The form's field keys are the server's, settings.<key>. A tape's nine label settings
// follow its panel; the advanced settings come after all of these, in the page's order, as setting-<key>.
const LABEL_FIELD_SUFFIXES = ["width_mm", "height_mm", "qr_size", "margin_mm", "gap_mm", "layout", "primary_template", "secondary_template", "tertiary_template"]
const SETTING_FIELD_IDS: Readonly<Record<string, string>> = {
  asset_tag_format_template: "asset-tag-template",
  asset_tag_running_digits: "asset-tag-running-digits",
  asset_tag_separator: "asset-tag-separator",
  asset_tag_prefix: "asset-tag-global-prefix",
  asset_tag_category_prefixes: "category-prefix-groups",
  asset_qr_public_base_url: "asset-qr-public-base-url",
  asset_label_default_tape_size: "asset-label-default-tape-size",
  asset_label_compact_asset_name_enabled: "asset-label-compact-asset-name",
  ...Object.fromEntries(
    assetLabelTapeSizes.flatMap((size) => LABEL_FIELD_SUFFIXES.map((suffix) => [`asset_label_${size}_${suffix}`, `asset_label_${size}-${suffix.replace(/_/g, "-")}`]))
  ),
  checkout_document_template: "checkout-document-template",
  checkin_document_template: "checkin-document-template",
  operation_document_running_digits: "operation-document-running-digits",
  company_name: "company-name",
  default_currency: "default-currency",
  accounting_depreciation_policy: "depreciation-policy-json",
  notification_return_due_soon_days: "notification-return-due-days",
  notification_audit_action_due_soon_days: "notification-audit-action-days",
  notification_warranty_expiry_days: "notification-warranty-expiry-days",
  notification_license_expiry_days: "notification-license-expiry-days",
  workflow_approval_disposal_required: "workflow-approval-disposal-required",
  workflow_approval_audit_close_required: "workflow-approval-audit-close-required",
  workflow_approval_segregation_required: "workflow-approval-segregation-required",
  workflow_approval_min_approvers: "workflow-approval-min-approvers",
  workflow_approval_sla_days: "workflow-approval-sla-days",
  retention_attachment_days: "retention-attachment-days",
  retention_audit_log_days: "retention-audit-log-days",
  retention_orphan_file_days: "retention-orphan-file-days",
  ldap_url: "ldap-url",
  ldap_base_dn: "ldap-base-dn",
  ldap_bind_dn: "ldap-bind-dn",
  ldap_bind_password: "ldap-bind-password",
  ldap_user_filter: "ldap-user-filter",
  ldap_upn_domain: "ldap-upn-domain",
  ldap_domain: "ldap-domain",
  ldap_user_dn_template: "ldap-user-dn-template",
  ldap_sync_mode: "ldap-sync-mode",
  ldap_sync_max_scheduled_deactivations: "ldap-sync-max-scheduled-deactivations",
  ldap_sync_base_dn: "ldap-sync-base-dn",
  ldap_sync_default_company_code: "ldap-sync-default-company",
  ldap_sync_default_branch_code: "ldap-sync-default-branch",
  ldap_sync_default_department_code: "ldap-sync-default-department",
  ldap_sync_filter: "ldap-sync-filter",
  ldap_sync_schedule: "ldap-sync-custom-schedule",
}
const settingFieldId = (key: string) => SETTING_FIELD_IDS[key] ?? `setting-${key}`

// noValidate turns the browser's check off, so this restates the controls' min, max and step, every rule the server
// checks for the settings a save sends (with the server's own codes) and the prefix groups' rule (v-track M-R2, plan 3
// ST-R2). The rules live in src/lib/system-settings-field-rules.ts, which tests run against the server's schema.
function validate(entries: readonly SettingEntry[], prefixRows: readonly CategoryPrefixRow[]) {
  return settingSaveErrors(entries, prefixRows)
}
```

- `src/components/admin/system-settings-form.tsx`, edit 7 of 70. Old:

```tsx
  const [checkedSelectedCategoryIds, setCheckedSelectedCategoryIds] = useState<string[]>([])
```

  New:

```tsx
  const [checkedSelectedCategoryIds, setCheckedSelectedCategoryIds] = useState<string[]>([])
  const fieldErrors = useFieldErrors<SettingFieldKey>()
  const validationMessage = useValidationMessage()
```

- `src/components/admin/system-settings-form.tsx`, edit 8 of 70. Old:

```tsx
  const setValue = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }))
```

  New:

```tsx
  // A change clears the setting's error from the last save or refusal (spec §4.3); a live rule shows again while it fails.
  const setValue = (key: string, value: string) => {
    setValues((current) => ({ ...current, [key]: value }))
    fieldErrors.clear(settingFieldKey(key))
  }
```

- `src/components/admin/system-settings-form.tsx`, edit 9 of 70. Old:

```tsx
        categoryIds: prefixEditor.categoryIds,
      })
    )
    closePrefixEditor()
```

  New:

```tsx
        categoryIds: prefixEditor.categoryIds,
      })
    )
    fieldErrors.clear(settingFieldKey(assetTagCategoryPrefixesKey))
    closePrefixEditor()
```

- `src/components/admin/system-settings-form.tsx`, edit 10 of 70. Old:

```tsx
    setPrefixRows((current) => current.filter((row) => normalizeCategoryPrefix(row.prefix) !== normalizedPrefix))
  }
```

  New:

```tsx
    setPrefixRows((current) => current.filter((row) => normalizeCategoryPrefix(row.prefix) !== normalizedPrefix))
    fieldErrors.clear(settingFieldKey(assetTagCategoryPrefixesKey))
  }
```

- `src/components/admin/system-settings-form.tsx`, edit 11 of 70. Old:

```tsx
  const selectedPrefixCategoryIds = activePrefixRows.map((row) => row.categoryId).filter(Boolean)
  const hasDuplicateCategory = new Set(selectedPrefixCategoryIds).size !== selectedPrefixCategoryIds.length
  const hasInvalidPrefix = activePrefixRows.some((row) => row.categoryId && !isValidCategoryPrefix(row.prefix))
  const unassignedCategoryCount
```

  New:

```tsx
  const unassignedCategoryCount
```

- `src/components/admin/system-settings-form.tsx`, edit 12 of 70. Old:

```tsx
  const templateTokens = Array.from(formatTemplate.matchAll(/\{([A-Za-z0-9]+)\}/g)).map((match) => match[1])
  const hasInvalidTemplate =
    !formatTemplate.includes("{running}") || templateTokens.some((token) => !assetTagFormatTokens.includes(token))
  const publicQrBaseUrl = getValue(assetQrPublicBaseUrlKey)
  const hasInvalidPublicQrBaseUrl = Boolean(publicQrBaseUrl) && !normalizePublicQrBaseUrl(publicQrBaseUrl)
  const publicQrPreviewValue = buildAssetQrValue({
    assetId: "sample-asset-id",
    publicBaseUrl: publicQrBaseUrl,
  })
  const labelTemplateKeys = assetLabelSettingKeys.filter((key) => key.endsWith("_template"))
  const hasInvalidLabelTemplate = labelTemplateKeys.some((key) => {
    const tokens = Array.from(getValue(key).matchAll(/\{([A-Za-z0-9]+)\}/g)).map((match) => match[1])
    return tokens.some((token) => !assetLabelTemplateTokens.includes(token as (typeof assetLabelTemplateTokens)[number]))
  })
  const hasInvalidLabelSize =
    assetLabelTapeSizes.some((size) => {
      const key = `asset_label_${size}_width_mm`
      const width = Number(getValue(key))
      return !Number.isFinite(width) || width < 30 || width > 120
    }) ||
    assetLabelTapeSizes.some((size) => {
      const key = `asset_label_${size}_height_mm`
      const height = Number(getValue(key))
      return !Number.isFinite(height) || height < 10 || height > 100
    }) ||
    assetLabelTapeSizes.some((size) => {
      const key = `asset_label_${size}_qr_size`
      const qrSize = Number(getValue(key))
      return !Number.isFinite(qrSize) || qrSize < 20 || qrSize > 90
    }) ||
    assetLabelTapeSizes.some((size) => {
      const margin = Number(getValue(`asset_label_${size}_margin_mm`))
      const gap = Number(getValue(`asset_label_${size}_gap_mm`))
      return !Number.isFinite(margin) || margin < 0 || margin > 10 || !Number.isFinite(gap) || gap < 0 || gap > 10
    }) ||
    assetLabelTapeSizes.some((size) => {
      const layout = getValue(`asset_label_${size}_layout`) as AssetLabelLayout
      return !assetLabelLayouts.includes(layout)
    })
  const labelTemplates = parseAssetLabelTemplates(values)
  const operationDigits = Number(getValue(operationDocumentRunningDigitsKey))
  const hasInvalidOperationDocumentTemplate =
    !validateOperationDocumentTemplate(checkoutDocumentTemplate) ||
    !validateOperationDocumentTemplate(checkinDocumentTemplate) ||
    !Number.isFinite(operationDigits) ||
    operationDigits < 1 ||
    operationDigits > 12
  const hasInvalidNotificationRule = notificationRuleSettingKeys.some((key) => {
    const days = Number(getValue(key))
    return !Number.isInteger(days) || days < 0 || days > 365
  })
  const hasInvalidRetentionPolicy = retentionPolicySettingKeys.some((key) => !isValidRetentionDays(getValue(key)))
  const depreciationPolicyParse = parseDepreciationPolicySetting(getValue(depreciationPolicySettingKey))
  const hasInvalidDepreciationPolicy = !depreciationPolicyParse.isValid
  const workflowApprovalToggleKeys = workflowApprovalSettingKeys.filter((key) => key !== workflowApprovalMinApproversKey && key !== workflowApprovalSlaDaysKey)
  const workflowApprovalMinApprovers = Number(getValue(workflowApprovalMinApproversKey))
  const workflowApprovalSlaDays = Number(getValue(workflowApprovalSlaDaysKey))
  const hasInvalidWorkflowApproval =
    workflowApprovalToggleKeys.some((key) => getValue(key) !== "true" && getValue(key) !== "false") ||
    !Number.isInteger(workflowApprovalMinApprovers) ||
    workflowApprovalMinApprovers < 1 ||
    workflowApprovalMinApprovers > 5 ||
    !Number.isInteger(workflowApprovalSlaDays) ||
    workflowApprovalSlaDays < 1 ||
    workflowApprovalSlaDays > 90
  const syncSchedule = getValue("ldap_sync_schedule")
  const selectedSyncSchedulePreset = !customScheduleSelected && ldapSchedulePresets.some((preset) => preset.value === syncSchedule)
    ? syncSchedule
    : "custom"
  const hasInvalidSchedulerSchedule = !isSupportedCronExpression(syncSchedule)
```

  New:

```tsx
  const publicQrBaseUrl = getValue(assetQrPublicBaseUrlKey)
  const publicQrPreviewValue = buildAssetQrValue({
    assetId: "sample-asset-id",
    publicBaseUrl: publicQrBaseUrl,
  })
  const labelTemplates = parseAssetLabelTemplates(values)
  const syncSchedule = getValue("ldap_sync_schedule")
  const selectedSyncSchedulePreset = !customScheduleSelected && ldapSchedulePresets.some((preset) => preset.value === syncSchedule)
    ? syncSchedule
    : "custom"
  // The settings as a save sends them: every setting the page loaded, the prefix groups serialized.
  const submittedSettings: SettingEntry[] = settings.map((setting) => ({ key: setting.key, value: effectiveValues[setting.key] ?? "" }))
  // The rules the old boxes showed while typing now show under their fields, at the same moment (spec U8, ST-R3).
  const liveErrors = settingLiveErrors(submittedSettings, activePrefixRows)
  // A setting's error under its field: its live rule while the value breaks it, else what the last save or the server
  // found. The prefix groups read the prefix editor's own sentence (ST-R2).
  const settingError = (key: string) => {
    const field = settingFieldKey(key)
    const code = liveErrors[field] ?? fieldErrors.errors[field]
    if (!code) return undefined
    return code === "invalidPrefix" ? labels.invalidPrefix : validationMessage(code, settingControlParams[key])
  }
  const prefixGroupsError = settingError(assetTagCategoryPrefixesKey)
```

- `src/components/admin/system-settings-form.tsx`, edit 13 of 70. Old:

```tsx
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (hasDuplicateCategory) {
      toast.error(labels.duplicateCategory)
      return
    }
    if (hasInvalidPrefix) {
      toast.error(labels.invalidPrefix)
      return
    }
    if (hasInvalidTemplate) {
      toast.error(labels.invalidFormatTemplate)
      return
    }
    if (hasInvalidPublicQrBaseUrl) {
      toast.error(labels.invalidPublicQrBaseUrl)
      return
    }
    if (hasInvalidLabelTemplate) {
      toast.error(labels.invalidLabelTemplate)
      return
    }
    if (hasInvalidLabelSize) {
      toast.error(labels.invalidLabelSize)
      return
    }
    if (hasInvalidOperationDocumentTemplate) {
      toast.error(labels.invalidOperationDocumentTemplate)
      return
    }
    if (hasInvalidNotificationRule) {
      toast.error(labels.invalidNotificationRule)
      return
    }
    if (hasInvalidRetentionPolicy) {
      toast.error(labels.invalidRetentionPolicy)
      return
    }
    if (hasInvalidDepreciationPolicy) {
      toast.error(labels.invalidAccountingDepreciationPolicy)
      return
    }
    if (hasInvalidWorkflowApproval) {
      toast.error(labels.invalidWorkflowApproval)
      return
    }
    if (hasInvalidSchedulerSchedule) {
      toast.error(labels.invalidSchedulerSchedule)
      return
    }

    setSaving(true)
    const nextValues: Record<string, string> = {
      ...values,
      [assetTagCategoryPrefixesKey]: serializePrefixRows(prefixRows),
    }
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: settings.map((setting) => ({
            key: setting.key,
            value: nextValues[setting.key] ?? "",
          })),
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? labels.error)
```

  New:

```tsx
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate(submittedSettings, activePrefixRows))
    if (focusFirstError()) return

    setSaving(true)
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: submittedSettings }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        // A refusal that names a setting shows under its field, on its tab; any other keeps the toast (spec §4.1).
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error(payload?.error ?? labels.error)
      }
```

- `src/components/admin/system-settings-form.tsx`, edit 14 of 70. Old:

```tsx
    window.requestAnimationFrame(() => document.getElementById("settings-workspace")?.scrollIntoView({ block: "start" }))
  }
```

  New:

```tsx
    window.requestAnimationFrame(() => document.getElementById("settings-workspace")?.scrollIntoView({ block: "start" }))
  }
  // A save goes to the first wrong setting in visual order: its tab opens first, then focus waits for its field (spec
  // §4.2, U1). The advanced settings come last, in the page's order, on the advanced tab whatever their key's prefix.
  const fieldOrder = [...Object.keys(SETTING_FIELD_IDS), ...generalSettings.map((setting) => setting.key)].map(settingFieldKey)
  const focusFirstError = () =>
    fieldErrors.focusFirst(fieldOrder, {
      idFor: (field) => settingFieldId(settingKeyOf(field)),
      reveal: (field) => selectTab(SETTING_FIELD_IDS[settingKeyOf(field)] ? getSystemSettingsTabForKey(settingKeyOf(field)) : "advanced"),
    })
```

- `src/components/admin/system-settings-form.tsx`, edit 15 of 70. Old:

```tsx
    <form onSubmit={handleSubmit} className="space-y-6">
```

  New:

```tsx
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
```

- `src/components/admin/system-settings-form.tsx`, edit 16 of 70. Old:

```tsx
              <Field label={labels.assetTagTemplate}>
```

  New:

```tsx
              <Field label={labels.assetTagTemplate} error={settingError(assetTagFormatTemplateKey)} liveError>
```

- `src/components/admin/system-settings-form.tsx`, edit 17 of 70. Old:

```tsx
              <p className="text-sm text-muted-foreground">{labels.assetTagTemplateHelp}</p>
              {hasInvalidTemplate ? <ValidationMessage message={labels.invalidFormatTemplate} /> : null}
```

  New:

```tsx
              <p className="text-sm text-muted-foreground">{labels.assetTagTemplateHelp}</p>
```

- `src/components/admin/system-settings-form.tsx`, edit 18 of 70. Old:

```tsx
                  onClick={() =>
                    setValues((current) => ({
                      ...current,
                      [assetTagFormatTemplateKey]: `${current[assetTagFormatTemplateKey] ?? defaultAssetTagFormatTemplate}{${token}}`,
                    }))
                  }
```

  New:

```tsx
                  onClick={() => setValue(assetTagFormatTemplateKey, `${formatTemplate}{${token}}`)}
```

- `src/components/admin/system-settings-form.tsx`, edit 19 of 70. Old:

```tsx
          <Field label={labels.runningDigits}>
```

  New:

```tsx
          <Field label={labels.runningDigits} error={settingError("asset_tag_running_digits")}>
```

- `src/components/admin/system-settings-form.tsx`, edit 20 of 70. Old:

```tsx
          <Field label={labels.separator}>
```

  New:

```tsx
          <Field label={labels.separator} error={settingError("asset_tag_separator")}>
```

- `src/components/admin/system-settings-form.tsx`, edit 21 of 70. Old:

```tsx
          <Field label={labels.globalPrefix}>
```

  New:

```tsx
          <Field label={labels.globalPrefix} error={settingError("asset_tag_prefix")}>
```

- `src/components/admin/system-settings-form.tsx`, edit 22 of 70. Old:

```tsx
              <Field label={labels.publicQrBaseUrl}>
```

  New:

```tsx
              <Field label={labels.publicQrBaseUrl} error={settingError(assetQrPublicBaseUrlKey)} liveError>
```

- `src/components/admin/system-settings-form.tsx`, edit 23 of 70. Old:

```tsx
              <p className="text-sm text-muted-foreground">{labels.publicQrBaseUrlDescription}</p>
              {hasInvalidPublicQrBaseUrl ? <ValidationMessage message={labels.invalidPublicQrBaseUrl} /> : null}
```

  New:

```tsx
              <p className="text-sm text-muted-foreground">{labels.publicQrBaseUrlDescription}</p>
```

- `src/components/admin/system-settings-form.tsx`, edit 24 of 70. Old:

```tsx
            <Field label={labels.defaultTapeSize}>
```

  New:

```tsx
            <Field label={labels.defaultTapeSize} error={settingError("asset_label_default_tape_size")}>
```

- `src/components/admin/system-settings-form.tsx`, edit 25 of 70. Old:

```tsx
            <LabelAssetNameModeField
              label={labels.compactLabelAssetName}
              description={labels.compactLabelAssetNameDescription}
              compactLabel={labels.compactLabelAssetNameShort}
              fullLabel={labels.compactLabelAssetNameFull}
              compactEnabled={getValue("asset_label_compact_asset_name_enabled") === "true"}
              onChange={(compactEnabled) => setBooleanValue("asset_label_compact_asset_name_enabled", compactEnabled)}
```

  New:

```tsx
            <LabelAssetNameModeField
              id="asset-label-compact-asset-name"
              label={labels.compactLabelAssetName}
              description={labels.compactLabelAssetNameDescription}
              compactLabel={labels.compactLabelAssetNameShort}
              fullLabel={labels.compactLabelAssetNameFull}
              compactEnabled={getValue("asset_label_compact_asset_name_enabled") === "true"}
              error={settingError("asset_label_compact_asset_name_enabled")}
              onChange={(compactEnabled) => setBooleanValue("asset_label_compact_asset_name_enabled", compactEnabled)}
```

- `src/components/admin/system-settings-form.tsx`, edit 26 of 70. Old:

```tsx
                getValue={getValue}
                setValue={setValue}
              />
```

  New:

```tsx
                getValue={getValue}
                setValue={setValue}
                errorFor={settingError}
              />
```

- `src/components/admin/system-settings-form.tsx`, edit 27 of 70. Old:

```tsx
          {hasInvalidLabelTemplate ? <ValidationMessage message={labels.invalidLabelTemplate} /> : null}
          {hasInvalidLabelSize ? <ValidationMessage message={labels.invalidLabelSize} /> : null}
          <LabelPreviewPanel
```

  New:

```tsx
          <LabelPreviewPanel
```

- `src/components/admin/system-settings-form.tsx`, edit 28 of 70. Old:

```tsx
              <Field label={labels.checkoutDocumentTemplate}>
```

  New:

```tsx
              <Field label={labels.checkoutDocumentTemplate} error={settingError(checkoutDocumentTemplateKey)} liveError>
```

- `src/components/admin/system-settings-form.tsx`, edit 29 of 70. Old:

```tsx
              <Field label={labels.checkinDocumentTemplate}>
```

  New:

```tsx
              <Field label={labels.checkinDocumentTemplate} error={settingError(checkinDocumentTemplateKey)} liveError>
```

- `src/components/admin/system-settings-form.tsx`, edit 30 of 70. Old:

```tsx
              <Field label={labels.operationDocumentRunningDigits}>
```

  New:

```tsx
              <Field label={labels.operationDocumentRunningDigits} error={settingError(operationDocumentRunningDigitsKey)} liveError>
```

- `src/components/admin/system-settings-form.tsx`, edit 31 of 70. Old:

```tsx
          <p className="text-sm text-muted-foreground">{labels.operationDocumentTemplateHelp}</p>
          {hasInvalidOperationDocumentTemplate ? <ValidationMessage message={labels.invalidOperationDocumentTemplate} /> : null}
```

  New:

```tsx
          <p className="text-sm text-muted-foreground">{labels.operationDocumentTemplateHelp}</p>
```

- `src/components/admin/system-settings-form.tsx`, edit 32 of 70. Old:

```tsx
        <div className="space-y-4">
          <div className="space-y-1 text-sm text-muted-foreground">
```

  New:

```tsx
        {/* The prefix groups are one group: a stored prefix that breaks the rule shows its error under the table, and
            focus goes to the table's first edit button (ST-R5). */}
        <div
          id="category-prefix-groups"
          role="group"
          aria-label={labels.categoryPrefixes}
          aria-describedby={prefixGroupsError ? "category-prefix-groups-error" : undefined}
          className="space-y-4"
        >
          <div className="space-y-1 text-sm text-muted-foreground">
```

- `src/components/admin/system-settings-form.tsx`, edit 33 of 70. Old:

```tsx
          {hasDuplicateCategory ? <ValidationMessage message={labels.duplicateCategory} /> : null}
          {hasInvalidPrefix ? <ValidationMessage message={labels.invalidPrefix} /> : null}
```

  New:

```tsx
          {prefixGroupsError ? <FieldError id="category-prefix-groups-error">{prefixGroupsError}</FieldError> : null}
```

- `src/components/admin/system-settings-form.tsx`, edit 34 of 70. Old:

```tsx
          <Field label={labels.companyName}>
```

  New:

```tsx
          <Field label={labels.companyName} error={settingError("company_name")}>
```

- `src/components/admin/system-settings-form.tsx`, edit 35 of 70. Old:

```tsx
          <Field label={labels.defaultCurrency}>
```

  New:

```tsx
          <Field label={labels.defaultCurrency} error={settingError("default_currency")}>
```

- `src/components/admin/system-settings-form.tsx`, edit 36 of 70. Old:

```tsx
              onPolicyJsonChange={(value) => setValue(depreciationPolicySettingKey, value)}
            />
            <p className="mt-2 text-sm text-muted-foreground">{labels.accountingDepreciationPolicyDescription}</p>
            {hasInvalidDepreciationPolicy ? <ValidationMessage message={labels.invalidAccountingDepreciationPolicy} /> : null}
```

  New:

```tsx
              onPolicyJsonChange={(value) => setValue(depreciationPolicySettingKey, value)}
              jsonId="depreciation-policy-json"
              jsonError={settingError(depreciationPolicySettingKey)}
            />
            <p className="mt-2 text-sm text-muted-foreground">{labels.accountingDepreciationPolicyDescription}</p>
```

- `src/components/admin/system-settings-form.tsx`, edit 37 of 70. Old:

```tsx
          <Field label={labels.returnDueSoonDays}>
```

  New:

```tsx
          <Field label={labels.returnDueSoonDays} error={settingError(notificationReturnDueSoonDaysKey)} liveError>
```

- `src/components/admin/system-settings-form.tsx`, edit 38 of 70. Old:

```tsx
          <Field label={labels.auditActionDueSoonDays}>
```

  New:

```tsx
          <Field label={labels.auditActionDueSoonDays} error={settingError(notificationAuditActionDueSoonDaysKey)} liveError>
```

- `src/components/admin/system-settings-form.tsx`, edit 39 of 70. Old:

```tsx
          <Field label={labels.warrantyExpiryDays}>
```

  New:

```tsx
          <Field label={labels.warrantyExpiryDays} error={settingError(notificationWarrantyExpiryDaysKey)} liveError>
```

- `src/components/admin/system-settings-form.tsx`, edit 40 of 70. Old:

```tsx
          <Field label={labels.licenseExpiryDays}>
```

  New:

```tsx
          <Field label={labels.licenseExpiryDays} error={settingError(notificationLicenseExpiryDaysKey)} liveError>
```

- `src/components/admin/system-settings-form.tsx`, edit 41 of 70. Old:

```tsx
        <p className="text-sm text-muted-foreground">{labels.notificationDaysHelp}</p>
        {hasInvalidNotificationRule ? <ValidationMessage message={labels.invalidNotificationRule} /> : null}
```

  New:

```tsx
        <p className="text-sm text-muted-foreground">{labels.notificationDaysHelp}</p>
```

- `src/components/admin/system-settings-form.tsx`, edit 42 of 70. Old:

```tsx
            <ToggleField
              label={labels.workflowApprovalDisposalRequired}
              checked={getValue(workflowApprovalDisposalRequiredKey) === "true"}
```

  New:

```tsx
            <ToggleField
              id="workflow-approval-disposal-required"
              label={labels.workflowApprovalDisposalRequired}
              checked={getValue(workflowApprovalDisposalRequiredKey) === "true"}
              error={settingError(workflowApprovalDisposalRequiredKey)}
```

- `src/components/admin/system-settings-form.tsx`, edit 43 of 70. Old:

```tsx
            <ToggleField
              label={labels.workflowApprovalAuditCloseRequired}
              checked={getValue(workflowApprovalAuditCloseRequiredKey) === "true"}
```

  New:

```tsx
            <ToggleField
              id="workflow-approval-audit-close-required"
              label={labels.workflowApprovalAuditCloseRequired}
              checked={getValue(workflowApprovalAuditCloseRequiredKey) === "true"}
              error={settingError(workflowApprovalAuditCloseRequiredKey)}
```

- `src/components/admin/system-settings-form.tsx`, edit 44 of 70. Old:

```tsx
            <ToggleField
              label={labels.workflowApprovalSegregationRequired}
              checked={getValue(workflowApprovalSegregationRequiredKey) === "true"}
```

  New:

```tsx
            <ToggleField
              id="workflow-approval-segregation-required"
              label={labels.workflowApprovalSegregationRequired}
              checked={getValue(workflowApprovalSegregationRequiredKey) === "true"}
              error={settingError(workflowApprovalSegregationRequiredKey)}
```

- `src/components/admin/system-settings-form.tsx`, edit 45 of 70. Old:

```tsx
            <Field label={labels.workflowApprovalMinApprovers}>
```

  New:

```tsx
            <Field label={labels.workflowApprovalMinApprovers} error={settingError(workflowApprovalMinApproversKey)} liveError>
```

- `src/components/admin/system-settings-form.tsx`, edit 46 of 70. Old:

```tsx
            <Field label={labels.workflowApprovalSlaDays}>
```

  New:

```tsx
            <Field label={labels.workflowApprovalSlaDays} error={settingError(workflowApprovalSlaDaysKey)} liveError>
```

- `src/components/admin/system-settings-form.tsx`, edit 47 of 70. Old:

```tsx
          <p className="text-sm text-muted-foreground">{labels.workflowApprovalSlaDaysHelp}</p>
          {hasInvalidWorkflowApproval ? <ValidationMessage message={labels.invalidWorkflowApproval} /> : null}
```

  New:

```tsx
          <p className="text-sm text-muted-foreground">{labels.workflowApprovalSlaDaysHelp}</p>
```

- `src/components/admin/system-settings-form.tsx`, edit 48 of 70. Old:

```tsx
          <Notice tone="neutral">{labels.schedulerHeartbeatNote}</Notice>
          {hasInvalidSchedulerSchedule ? <ValidationMessage message={labels.invalidSchedulerSchedule} /> : null}
```

  New:

```tsx
          <Notice tone="neutral">{labels.schedulerHeartbeatNote}</Notice>
```

- `src/components/admin/system-settings-form.tsx`, edit 49 of 70. Old:

```tsx
            <Field label={labels.retentionAttachmentDays}>
```

  New:

```tsx
            <Field label={labels.retentionAttachmentDays} error={settingError(retentionAttachmentDaysKey)} liveError>
```

- `src/components/admin/system-settings-form.tsx`, edit 50 of 70. Old:

```tsx
            <Field label={labels.retentionAuditLogDays}>
```

  New:

```tsx
            <Field label={labels.retentionAuditLogDays} error={settingError(retentionAuditLogDaysKey)} liveError>
```

- `src/components/admin/system-settings-form.tsx`, edit 51 of 70. Old:

```tsx
            <Field label={labels.retentionOrphanFileDays}>
```

  New:

```tsx
            <Field label={labels.retentionOrphanFileDays} error={settingError(retentionOrphanFileDaysKey)} liveError>
```

- `src/components/admin/system-settings-form.tsx`, edit 52 of 70. Old:

```tsx
          <Notice tone="neutral">{labels.retentionDaysHelp}</Notice>
          {hasInvalidRetentionPolicy ? <ValidationMessage message={labels.invalidRetentionPolicy} /> : null}
```

  New:

```tsx
          <Notice tone="neutral">{labels.retentionDaysHelp}</Notice>
```

- `src/components/admin/system-settings-form.tsx`, edit 53 of 70. Old:

```tsx
              <Field label={labels.ldapUrl}>
```

  New:

```tsx
              <Field label={labels.ldapUrl} error={settingError("ldap_url")}>
```

- `src/components/admin/system-settings-form.tsx`, edit 54 of 70. Old:

```tsx
              <Field label={labels.ldapBaseDn}>
```

  New:

```tsx
              <Field label={labels.ldapBaseDn} error={settingError("ldap_base_dn")}>
```

- `src/components/admin/system-settings-form.tsx`, edit 55 of 70. Old:

```tsx
              <Field label={labels.ldapBindDn}>
```

  New:

```tsx
              <Field label={labels.ldapBindDn} error={settingError("ldap_bind_dn")}>
```

- `src/components/admin/system-settings-form.tsx`, edit 56 of 70. Old:

```tsx
              <Field label={labels.ldapBindPassword}>
```

  New:

```tsx
              <Field label={labels.ldapBindPassword} error={settingError("ldap_bind_password")}>
```

- `src/components/admin/system-settings-form.tsx`, edit 57 of 70. Old:

```tsx
              <Field label={labels.ldapUserFilter}>
```

  New:

```tsx
              <Field label={labels.ldapUserFilter} error={settingError("ldap_user_filter")}>
```

- `src/components/admin/system-settings-form.tsx`, edit 58 of 70. Old:

```tsx
              <Field label={labels.ldapUpnDomain}>
```

  New:

```tsx
              <Field label={labels.ldapUpnDomain} error={settingError("ldap_upn_domain")}>
```

- `src/components/admin/system-settings-form.tsx`, edit 59 of 70. Old:

```tsx
              <Field label={labels.ldapDomain}>
```

  New:

```tsx
              <Field label={labels.ldapDomain} error={settingError("ldap_domain")}>
```

- `src/components/admin/system-settings-form.tsx`, edit 60 of 70. Old:

```tsx
                <Field label={labels.ldapUserDnTemplate}>
```

  New:

```tsx
                <Field label={labels.ldapUserDnTemplate} error={settingError("ldap_user_dn_template")}>
```

- `src/components/admin/system-settings-form.tsx`, edit 61 of 70. Old:

```tsx
              <Field label={labels.ldapSyncMode}>
```

  New:

```tsx
              <Field label={labels.ldapSyncMode} error={settingError("ldap_sync_mode")}>
```

- `src/components/admin/system-settings-form.tsx`, edit 62 of 70. Old:

```tsx
              <Field label={labels.ldapSyncMaxScheduledDeactivations}>
```

  New:

```tsx
              <Field label={labels.ldapSyncMaxScheduledDeactivations} error={settingError("ldap_sync_max_scheduled_deactivations")}>
```

- `src/components/admin/system-settings-form.tsx`, edit 63 of 70. Old:

```tsx
              <Field label={labels.ldapSyncBaseDn}>
```

  New:

```tsx
              <Field label={labels.ldapSyncBaseDn} error={settingError("ldap_sync_base_dn")}>
```

- `src/components/admin/system-settings-form.tsx`, edit 64 of 70. Old:

```tsx
                  <Field label={labels.ldapSyncDefaultCompanyCode}>
```

  New:

```tsx
                  <Field label={labels.ldapSyncDefaultCompanyCode} error={settingError("ldap_sync_default_company_code")}>
```

- `src/components/admin/system-settings-form.tsx`, edit 65 of 70. Old:

```tsx
                  <Field label={labels.ldapSyncDefaultBranchCode}>
```

  New:

```tsx
                  <Field label={labels.ldapSyncDefaultBranchCode} error={settingError("ldap_sync_default_branch_code")}>
```

- `src/components/admin/system-settings-form.tsx`, edit 66 of 70. Old:

```tsx
                  <Field label={labels.ldapSyncDefaultDepartmentCode}>
```

  New:

```tsx
                  <Field label={labels.ldapSyncDefaultDepartmentCode} error={settingError("ldap_sync_default_department_code")}>
```

- `src/components/admin/system-settings-form.tsx`, edit 67 of 70. Old:

```tsx
              <Field label={labels.ldapSyncFilter}>
```

  New:

```tsx
              <Field label={labels.ldapSyncFilter} error={settingError("ldap_sync_filter")}>
```

- `src/components/admin/system-settings-form.tsx`, edit 68 of 70. Old:

```tsx
                <Field label={labels.ldapSyncCustomSchedule}>
```

  New:

```tsx
                <Field label={labels.ldapSyncCustomSchedule} error={settingError("ldap_sync_schedule")} liveError>
```

- `src/components/admin/system-settings-form.tsx`, edit 69 of 70. Old:

```tsx
                      <Field label={setting.key} hideLabel>
                        <Input
                          value={values[setting.key] ?? ""}
                          onChange={(event) => setValues((current) => ({ ...current, [setting.key]: event.target.value }))}
                        />
```

  New:

```tsx
                      <Field label={setting.key} hideLabel error={settingError(setting.key)}>
                        <Input
                          id={settingFieldId(setting.key)}
                          value={values[setting.key] ?? ""}
                          onChange={(event) => setValue(setting.key, event.target.value)}
                        />
```

- `src/components/admin/system-settings-form.tsx`, edit 70 of 70. Old:

```tsx
function isValidCategoryPrefix(prefix: string) {
  return /^[A-Z0-9]{2,10}$/.test(normalizeCategoryPrefix(prefix))
}

function matchesCategorySearch(
```

  New:

```tsx
function matchesCategorySearch(
```

  After Step 3 and before Step 4, `node --test tests/settings-depreciation-policy-ui.test.ts tests/settings-tab-persistence-ui.test.ts` fails three tests: "settings form renders depreciation builder instead of primary json textarea", "settings form blocks invalid depreciation policy before saving" and "the settings tab row is TabNav, and a click switches tabs in place (O7, 2C batch 5)". That is expected; Step 4 is their edits.
- [ ] **Step 4: Pin edits** (exact; each old string occurs once in its file):

- `tests/settings-depreciation-policy-ui.test.ts`, edit 1 of 2. Old:

```ts
  assert.match(form, /hasInvalidDepreciationPolicy[\s\S]*ValidationMessage/)
```

  New:

```ts
  // The policy's error sits under its JSON in the builder (v-track plan 3 task 3, ST3).
  assert.match(form, /jsonId="depreciation-policy-json"\s+jsonError=\{settingError\(depreciationPolicySettingKey\)\}/)
```

- `tests/settings-depreciation-policy-ui.test.ts`, edit 2 of 2. Old:

```ts
  assert.match(handleSubmit, /if \(hasInvalidDepreciationPolicy\) \{[\s\S]*toast\.error\(labels\.invalidAccountingDepreciationPolicy\)[\s\S]*return[\s\S]*\}/)
```

  New:

```ts
  // validate() checks every setting sent, the depreciation policy among them, and the save goes to the first wrong field
  // instead of a toast (v-track plan 3 task 3, ST3).
  assert.match(handleSubmit, /fieldErrors\.setErrors\(validate\(submittedSettings, activePrefixRows\)\)\s+if \(focusFirstError\(\)\) return/)
  assert.doesNotMatch(handleSubmit, /toast\.error/)
```

- `tests/settings-tab-persistence-ui.test.ts`, edit 1 of 1. Old:

```ts
  assert.match(source, /<form onSubmit=\{handleSubmit\} className="space-y-6">\n\s+<TabNav
```

  New:

```ts
  assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate className="space-y-6">\n\s+<TabNav
```

- [ ] **Step 5: Verify.** `node --test tests/v-track3.test.ts tests/settings-depreciation-policy-ui.test.ts tests/settings-tab-persistence-ui.test.ts tests/accessible-dialog.test.ts tests/admin-sweep-ui.test.ts tests/sticky-form-footer-ui.test.ts tests/phase2d-final-ui.test.ts tests/asset-label-print-ui.test.ts tests/field-primitives.test.ts tests/steps-ui.test.ts tests/form-frames-ui.test.ts tests/dark-mode-p.test.ts tests/settings-ldap-role-ui.test.ts tests/system-log-history.test.ts tests/pm-generation-removed.test.ts tests/attachment-preview-dialog-ui.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/settings-search.test.ts` (200 tests, 0 fail in the rehearsal); `npm test` (+1; **2295 tests, 2294 pass, 0 fail, 1 skipped**); `npx tsc --noEmit`; `npm run lint` (0 errors, 146 warnings). `node <tools>/eol.mjs src/components/admin/system-settings-form.tsx tests/settings-depreciation-policy-ui.test.ts tests/settings-tab-persistence-ui.test.ts tests/v-track3.test.ts` prints `2601 2601`, `107 107`, `27 27` and `0 261`. `node <tools>/counts.mts .`: toasts outside a catch 22 in 10 files, `<form … noValidate>` 47, `V_FORMS` 43.
- [ ] **Step 6: Commit.** `git add src/components/admin/system-settings-form.tsx tests/settings-depreciation-policy-ui.test.ts tests/settings-tab-persistence-ui.test.ts tests/v-track3.test.ts`, then `git commit -m "feat(settings): every setting shows its error under its field, and a save opens the tab of the first wrong one (v-track plan 3 task 3, ST3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 4 (ST4): The prefix editor checks its prefix and its categories on save, and the settings form joins `V_FORMS` (`c/admin/system-settings-form.tsx`, the settings page, messages)

Spec §4.1, §4.4 (a content gate becomes errors on submit), §5 #46, U6, U8; plan 1 M-R1–M-R5, M-R12's formless pattern (F-R9: V2 needs only `validate(` for a formless submit); ST-R7, ST-R9.

**Files:**
- Modify: `src/components/admin/system-settings-form.tsx` (`i/lf w/crlf`), `src/app/[locale]/(dashboard)/admin/settings/page.tsx` (`i/lf w/crlf`), `messages/th.json`, `messages/en.json` (`i/lf w/crlf`, through `scripts/messages-edit.mjs`)
- Pins: `tests/accessible-dialog.test.ts` (`i/lf w/crlf`), `tests/admin-sweep-ui.test.ts` (`i/lf w/crlf`)
- Guard: `tests/validation-guards.test.ts` (`i/lf w/crlf`; `V_FORMS` only)
- Test: `tests/v-track3.test.ts` (LF, append)

**Interfaces:**
- Consumes: Task 3's `fieldErrors`, `validationMessage`, `settingFieldKey`; Task 1's `isValidCategoryPrefix`; `required`, `atLeastOne`; `FieldError`.
- Produces: `prefixErrors`, `PREFIX_EDITOR_FIELD_IDS`, `validatePrefixEditor`, `prefixLiveCode`, `prefixEditorError`, `prefixCategoriesError`; `labels.prefixCategoriesRequired`; the file's `V_FORMS` row (`V_FORMS` 44 = `V_SCOPE`'s 44 files).

**Changes at f1ae1828:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| after the rules module's import (Task 3) | — | `import { atLeastOne, required } from "@/lib/validation-rules"` | ST-R7 |
| after Task 3's `validate` | — | `PREFIX_EDITOR_FIELD_IDS` (`prefix`, `categoryIds`), `PrefixEditorField`, `PREFIX_EDITOR_ORDER`, `validatePrefixEditor(editor)`, with comments | M-R1, M-R2, ST-R7 |
| after Task 3's `validationMessage` | — | `const prefixErrors = useFieldErrors<PrefixEditorField>()` | M-R3 |
| F:586–600 `openPrefixEditor`, `closePrefixEditor` | reset the filters | also `prefixErrors.setErrors({})` (a comment above close) | ST-R7 |
| F:601–623 the two transfer handlers | move the ticked categories | also `prefixErrors.clear("categoryIds")` | spec §4.3 |
| F:624–625 `applyPrefixEditor` | `if (!prefixEditor \|\| !isValidCategoryPrefix(…) \|\| …length === 0) return` (silent) | `if (!prefixEditor) return`, `prefixErrors.setErrors(validatePrefixEditor(prefixEditor))`, `if (prefixErrors.focusFirst(PREFIX_EDITOR_ORDER, { idFor })) return` | M-R4, spec §4.4 |
| F:680 | `const canApplyPrefixEditor = …` | `prefixLiveCode` (live once a prefix is typed), `prefixEditorError(field)`, `prefixCategoriesError` | ST-R3, ST-R7 |
| F:1363–1371 | `<Field label={labels.prefix}>`; the input's `onChange` sets the prefix | `<Field label={labels.prefix} required error={prefixEditorError("prefix")} liveError>`; the `onChange` also clears `prefix` | ST-R7 |
| F:1382–1386 | the box under the prefix row; the transfer grid `div` | the box gone; the grid becomes the categories group (`id="category-prefix-editor-categories"`, `role="group"`, `aria-label={labels.selectedPrefixCategories}`, `aria-describedby`) with a JSX comment | ST-R7 |
| F:1453–1457 | the end of the grid; the save `<Button onClick={applyPrefixEditor} disabled={!canApplyPrefixEditor}>` | the categories' `FieldError` as the body's last line; `<Button onClick={applyPrefixEditor}>` | ST-R7, spec §4.4 |
| F:2232–2240 | `function ValidationMessage` and its comment | gone (no box left) | ST-R3 |
| F:249 (`labels` type) | `invalidPrefix: string` | + `prefixCategoriesRequired: string` | ST-R9 |
| page `:195` | `invalidPrefix: t("invalidPrefix"),` | + `prefixCategoriesRequired: t("prefixCategoriesRequired"),` | ST-R9 |
| messages | — | `systemSettingsPage.prefixCategoriesRequired` th "เลือกหมวดหมู่อย่างน้อย 1 หมวดหมู่สำหรับคำนำหน้ารหัสนี้", en "Choose at least one category for this prefix" | ST-R9 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track3.test.ts` exactly this block (write it with a file tool):

```ts

test("the prefix editor checks its prefix and its categories on save, its save is enabled, and the form is a V form (v-track plan 3 task 4, ST4)", () => {
  const form = formSource()
  // The editor's fields in visual order and its own rules: the prefix required and 2 to 10 A-Z or digits, a category.
  assert.match(form, /const PREFIX_EDITOR_FIELD_IDS = \{\n {2}prefix: "category-prefix-editor-prefix",\n {2}categoryIds: "category-prefix-editor-categories",\n\} as const/)
  assert.match(form, /const prefixCode = required\(editor\.prefix\) \?\? \(isValidCategoryPrefix\(editor\.prefix\) \? null : "invalidPrefix"\)/)
  assert.match(form, /const categoriesCode = atLeastOne\(editor\.categoryIds\)/)
  // Save runs the rules and focuses the first wrong field inside the dialog; the content gate is gone (spec §4.4).
  assert.match(form, /const applyPrefixEditor = \(\) => \{\n\s+if \(!prefixEditor\) return\n\s+prefixErrors\.setErrors\(validatePrefixEditor\(prefixEditor\)\)\n\s+if \(prefixErrors\.focusFirst\(PREFIX_EDITOR_ORDER, \{ idFor: \(key\) => PREFIX_EDITOR_FIELD_IDS\[key\] \}\)\) return\n/)
  assert.match(form, /<Button onClick=\{applyPrefixEditor\}>\n\s+<Save \/>\n\s+\{labels\.savePrefixGroup\}/)
  assert.doesNotMatch(form, /canApplyPrefixEditor/)
  // The prefix: a star, its error under it, live once there is a prefix (spec U8); an empty one waits for save (U6).
  assert.match(form, /<Field label=\{labels\.prefix\} required error=\{prefixEditorError\("prefix"\)\} liveError>/)
  assert.match(form, /const prefixLiveCode = prefixEditor\?\.prefix\.trim\(\) && !isValidCategoryPrefix\(prefixEditor\.prefix\) \? "invalidPrefix" : null/)
  assert.match(form, /return field === "categoryIds" \? labels\.prefixCategoriesRequired : validationMessage\(code\)/)
  // The two lists are one group with its error under them, still inside the dialog body (no form, no submit: GD5).
  assert.match(form, /<div\n\s+id="category-prefix-editor-categories"\n\s+role="group"\n\s+aria-label=\{labels\.selectedPrefixCategories\}\n\s+aria-describedby=\{prefixCategoriesError \? "category-prefix-editor-categories-error" : undefined\}/)
  assert.ok(form.includes('{prefixCategoriesError ? <FieldError id="category-prefix-editor-categories-error">{prefixCategoriesError}</FieldError> : null}\n              </AccessibleDialogBody>'))
  // A change clears its error; opening and closing start clean.
  assert.equal(form.split('prefixErrors.clear("categoryIds")').length - 1, 2)
  assert.match(form, /prefix: event\.target\.value\.toUpperCase\(\) \} : current\n\s+\)\n\s+prefixErrors\.clear\("prefix"\)/)
  assert.equal(form.split("prefixErrors.setErrors({})").length - 1, 2)
  // The boxes are gone; the editor keeps its maxLength (FMG CONSTRAINT_FLOORS).
  assert.doesNotMatch(form, /\bValidationMessage\b/)
  assert.match(form, /maxLength=\{10\}/)
  // The new sentence, in the glossary's words (หมวดหมู่), and the page passes it.
  assert.equal(messages("th").systemSettingsPage.prefixCategoriesRequired, "เลือกหมวดหมู่อย่างน้อย 1 หมวดหมู่สำหรับคำนำหน้ารหัสนี้")
  assert.equal(messages("en").systemSettingsPage.prefixCategoriesRequired, "Choose at least one category for this prefix")
  assert.match(read("src/app/[locale]/(dashboard)/admin/settings/page.tsx"), /prefixCategoriesRequired: t\("prefixCategoriesRequired"\),/)
  // The file is a V form now: V_FORMS equals V_SCOPE (spec §5, U5).
  const guards = read("tests/validation-guards.test.ts")
  assert.ok(guards.includes("  `${C}admin/system-settings-form.tsx`,\n]\n\n// Required selects"))
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track3.test.ts`. Expected: 4 tests, 1 fail: "the prefix editor checks its prefix and its categories on save, its save is enabled, and the form is a V form (v-track plan 3 task 4, ST4)" (`AssertionError: The input did not match the regular expression /const PREFIX_EDITOR_FIELD_IDS = \{\n …/`).
- [ ] **Step 3: Implement** (exact, in this order; the Edit tool keeps the files' CRLF):

- `src/components/admin/system-settings-form.tsx`, edit 1 of 12. Old:

```tsx
} from "@/lib/system-settings-field-rules"
```

  New:

```tsx
} from "@/lib/system-settings-field-rules"
import { atLeastOne, required } from "@/lib/validation-rules"
```

- `src/components/admin/system-settings-form.tsx`, edit 2 of 12. Old:

```tsx
function validate(entries: readonly SettingEntry[], prefixRows: readonly CategoryPrefixRow[]) {
  return settingSaveErrors(entries, prefixRows)
}
```

  New:

```tsx
function validate(entries: readonly SettingEntry[], prefixRows: readonly CategoryPrefixRow[]) {
  return settingSaveErrors(entries, prefixRows)
}

// The prefix editor's fields in visual order, with the id focus moves to (v-track M-R1, plan 3 ST-R7): the prefix, then
// the category picker as one group (focus goes to its first control, the search of the available categories).
const PREFIX_EDITOR_FIELD_IDS = {
  prefix: "category-prefix-editor-prefix",
  categoryIds: "category-prefix-editor-categories",
} as const
type PrefixEditorField = keyof typeof PREFIX_EDITOR_FIELD_IDS
const PREFIX_EDITOR_ORDER = Object.keys(PREFIX_EDITOR_FIELD_IDS) as PrefixEditorField[]

// The prefix editor saves into the form's prefix groups, not to the server: its prefix is required and 2 to 10 letters
// A-Z or digits (which covers the input's maxLength), and it needs at least one category (ST-R7). Its save button was
// disabled until both held; now it says what is missing.
function validatePrefixEditor(editor: { prefix: string; categoryIds: readonly string[] }) {
  const errors: Partial<Record<PrefixEditorField, string>> = {}
  const prefixCode = required(editor.prefix) ?? (isValidCategoryPrefix(editor.prefix) ? null : "invalidPrefix")
  if (prefixCode) errors.prefix = prefixCode
  const categoriesCode = atLeastOne(editor.categoryIds)
  if (categoriesCode) errors.categoryIds = categoriesCode
  return errors
}
```

- `src/components/admin/system-settings-form.tsx`, edit 3 of 12. Old:

```tsx
  const validationMessage = useValidationMessage()
```

  New:

```tsx
  const validationMessage = useValidationMessage()
  const prefixErrors = useFieldErrors<PrefixEditorField>()
```

- `src/components/admin/system-settings-form.tsx`, edit 4 of 12. Old:

```tsx
      categoryIds: group?.categoryIds ?? [],
    })
    resetPrefixEditorFilters()
  }
  const closePrefixEditor = () => {
    setPrefixEditor(null)
    resetPrefixEditorFilters()
  }
```

  New:

```tsx
      categoryIds: group?.categoryIds ?? [],
    })
    resetPrefixEditorFilters()
    prefixErrors.setErrors({})
  }
  // Closing drops the editor's errors, so it opens again without them.
  const closePrefixEditor = () => {
    setPrefixEditor(null)
    resetPrefixEditorFilters()
    prefixErrors.setErrors({})
  }
```

- `src/components/admin/system-settings-form.tsx`, edit 5 of 12. Old:

```tsx
    setCheckedAvailableCategoryIds([])
  }
```

  New:

```tsx
    setCheckedAvailableCategoryIds([])
    prefixErrors.clear("categoryIds")
  }
```

- `src/components/admin/system-settings-form.tsx`, edit 6 of 12. Old:

```tsx
    setCheckedSelectedCategoryIds([])
  }
  const applyPrefixEditor = () => {
    if (!prefixEditor || !isValidCategoryPrefix(prefixEditor.prefix) || prefixEditor.categoryIds.length === 0) return
```

  New:

```tsx
    setCheckedSelectedCategoryIds([])
    prefixErrors.clear("categoryIds")
  }
  const applyPrefixEditor = () => {
    if (!prefixEditor) return
    prefixErrors.setErrors(validatePrefixEditor(prefixEditor))
    if (prefixErrors.focusFirst(PREFIX_EDITOR_ORDER, { idFor: (key) => PREFIX_EDITOR_FIELD_IDS[key] })) return
```

- `src/components/admin/system-settings-form.tsx`, edit 7 of 12. Old:

```tsx
  const canApplyPrefixEditor = Boolean(prefixEditor && isValidCategoryPrefix(prefixEditor.prefix) && prefixEditor.categoryIds.length > 0)
```

  New:

```tsx
  // The prefix's rule shows while the person types, once there is a prefix (spec U8; an empty prefix waits for save, U6).
  const prefixLiveCode = prefixEditor?.prefix.trim() && !isValidCategoryPrefix(prefixEditor.prefix) ? "invalidPrefix" : null
  const prefixEditorError = (field: PrefixEditorField) => {
    const code = (field === "prefix" ? prefixLiveCode : null) ?? prefixErrors.errors[field]
    if (!code) return undefined
    if (code === "invalidPrefix") return labels.invalidPrefix
    return field === "categoryIds" ? labels.prefixCategoriesRequired : validationMessage(code)
  }
  const prefixCategoriesError = prefixEditorError("categoryIds")
```

- `src/components/admin/system-settings-form.tsx`, edit 8 of 12. Old:

```tsx
                  <Field label={labels.prefix}>
                    <Input
                      id="category-prefix-editor-prefix"
                      value={prefixEditor.prefix}
                      onChange={(event) =>
                        setPrefixEditor((current) =>
                          current ? { ...current, prefix: event.target.value.toUpperCase() } : current
                        )
                      }
```

  New:

```tsx
                  <Field label={labels.prefix} required error={prefixEditorError("prefix")} liveError>
                    <Input
                      id="category-prefix-editor-prefix"
                      value={prefixEditor.prefix}
                      onChange={(event) => {
                        setPrefixEditor((current) =>
                          current ? { ...current, prefix: event.target.value.toUpperCase() } : current
                        )
                        prefixErrors.clear("prefix")
                      }}
```

- `src/components/admin/system-settings-form.tsx`, edit 9 of 12. Old:

```tsx
                </div>

                {!isValidCategoryPrefix(prefixEditor.prefix) ? <ValidationMessage message={labels.invalidPrefix} /> : null}

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
```

  New:

```tsx
                </div>

                {/* The two lists are one field: "at least one category" shows under them, and focus goes to the first
                    control, the search of the available categories (ST-R7). */}
                <div
                  id="category-prefix-editor-categories"
                  role="group"
                  aria-label={labels.selectedPrefixCategories}
                  aria-describedby={prefixCategoriesError ? "category-prefix-editor-categories-error" : undefined}
                  className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
                >
```

- `src/components/admin/system-settings-form.tsx`, edit 10 of 12. Old:

```tsx
                    )}
                  </CategoryTransferPanel>
                </div>
              </AccessibleDialogBody>
              <AccessibleDialogFooter>
                <AccessibleDialogCancel>{labels.cancel}</AccessibleDialogCancel>
                <Button onClick={applyPrefixEditor} disabled={!canApplyPrefixEditor}>
```

  New:

```tsx
                    )}
                  </CategoryTransferPanel>
                </div>
                {prefixCategoriesError ? <FieldError id="category-prefix-editor-categories-error">{prefixCategoriesError}</FieldError> : null}
              </AccessibleDialogBody>
              <AccessibleDialogFooter>
                <AccessibleDialogCancel>{labels.cancel}</AccessibleDialogCancel>
                <Button onClick={applyPrefixEditor}>
```

- `src/components/admin/system-settings-form.tsx`, edit 11 of 12. Old:

```tsx
// A rule the current values break, under the fields of its group (D7: an error is a danger Notice). No live region: it
// shows while the user types, and the save toast says the same.
function ValidationMessage({ message }: { message: string }) {
  return (
    <Notice tone="danger" className="my-2">
      {message}
    </Notice>
  )
}

// A switch setting on one line. With an error (a stored value that is neither true nor false), the error shows under
```

  New:

```tsx
// A switch setting on one line. With an error (a stored value that is neither true nor false), the error shows under
```

- `src/components/admin/system-settings-form.tsx`, edit 12 of 12. Old:

```tsx
    invalidPrefix: string
```

  New:

```tsx
    invalidPrefix: string
    prefixCategoriesRequired: string
```

- `src/app/[locale]/(dashboard)/admin/settings/page.tsx`, edit 1 of 1. Old:

```tsx
          invalidPrefix: t("invalidPrefix"),
```

  New:

```tsx
          invalidPrefix: t("invalidPrefix"),
          prefixCategoriesRequired: t("prefixCategoriesRequired"),
```

- Save `<temp>/changes/t4-messages.json` with exactly this text, then run `node scripts/messages-edit.mjs <temp>/changes/t4-messages.json` (it prints `messages updated: 1 th, 1 en, 0 deleted`):

```json
{
  "set": {
    "th": { "systemSettingsPage.prefixCategoriesRequired": "เลือกหมวดหมู่อย่างน้อย 1 หมวดหมู่สำหรับคำนำหน้ารหัสนี้" },
    "en": { "systemSettingsPage.prefixCategoriesRequired": "Choose at least one category for this prefix" }
  }
}
```

  After Step 3 and before Step 4, `node --test tests/v-track3.test.ts tests/accessible-dialog.test.ts tests/admin-sweep-ui.test.ts` fails three tests: this task's own (its last assertion, the `V_FORMS` row), "the settings prefix dialog renders inside the settings form, so it has no form or submit button of its own (P13, 1f)" and "settings: panels are ContentPanel, notes are Notice, tables DataTable, no raw colors, and the tab row fits at 1440 (spec 2D §3.2, D18)". That is expected; Step 4 is their edits.
- [ ] **Step 4: Pin and guard edits** (exact; each old string occurs once in its file):

- `tests/accessible-dialog.test.ts`, edit 1 of 1. Old:

```ts
<Button onClick=\{applyPrefixEditor\} disabled=\{!canApplyPrefixEditor\}>/)
```

  New:

```ts
<Button onClick=\{applyPrefixEditor\}>/)
```

- `tests/admin-sweep-ui.test.ts`, edit 1 of 1. Old:

```ts
  assert.match(source, /function ValidationMessage\(\{ message \}: \{ message: string \}\) \{\n\s+return \(\n\s+<Notice tone="danger" className="my-2">/)
```

  New:

```ts
  // The danger boxes became each setting's error under its field (v-track plan 3 task 4, ST4).
  assert.doesNotMatch(source, /function ValidationMessage|<ValidationMessage\b/)
```

- `tests/validation-guards.test.ts`, edit 1 of 1. Old:

```ts
  `${C}maintenance/repair-record-actions.tsx`,
]

// Required selects
```

  New:

```ts
  `${C}maintenance/repair-record-actions.tsx`,
  `${C}admin/system-settings-form.tsx`,
]

// Required selects
```

- [ ] **Step 5: Verify.** `node --test tests/v-track3.test.ts tests/accessible-dialog.test.ts tests/admin-sweep-ui.test.ts tests/validation-guards.test.ts tests/form-migration-guards.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts tests/messages-edit.test.ts tests/phase2d-final-ui.test.ts tests/list-frame-guards.test.ts tests/ui-overlay-guards.test.ts` (110 tests, 0 fail in the rehearsal); `npm test` (+1; **2296 tests, 2295 pass, 0 fail, 1 skipped**); `npx tsc --noEmit`; `npm run lint` (0 errors, 146 warnings). `node <tools>/eol.mjs src/components/admin/system-settings-form.tsx "src/app/[locale]/(dashboard)/admin/settings/page.tsx" messages/th.json messages/en.json tests/accessible-dialog.test.ts tests/admin-sweep-ui.test.ts tests/validation-guards.test.ts tests/v-track3.test.ts` prints `2638 2638`, `366 366`, `4276 4276`, `4276 4276`, `104 104`, `180 180`, `225 225` and `0 294`. `node <tools>/counts.mts .`: 4094 leaf keys per locale, `V_FORMS` 44.
- [ ] **Step 6: Commit.** `git add src/components/admin/system-settings-form.tsx "src/app/[locale]/(dashboard)/admin/settings/page.tsx" messages/th.json messages/en.json tests/accessible-dialog.test.ts tests/admin-sweep-ui.test.ts tests/validation-guards.test.ts tests/v-track3.test.ts`, then `git commit -m "feat(settings): the prefix editor checks its prefix and its categories on save, and the settings form joins V_FORMS (v-track plan 3 task 4, ST4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 5 (ST5): The save and the LDAP apply wait with their reason beside them (`c/admin/system-settings-form.tsx`)

Spec §4.4 (prerequisites keep their gate and always say why), §11 call 2; plan 1 M-R10; ST-R8.

**Files:**
- Modify: `src/components/admin/system-settings-form.tsx` (`i/lf w/crlf`)
- Pin: `tests/sticky-form-footer-ui.test.ts` (`i/lf w/crlf`)
- Test: `tests/v-track3.test.ts` (LF, append)

**Interfaces:**
- Consumes: `changedCount`, `syncPreview`, `Button`'s `aria-disabled` styles (it stays focusable; its `aria-disabled:` classes look disabled and drop pointer events).
- Produces: the ids `settings-save-status` and `ldap-sync-no-preview`.

**Changes at f1ae1828:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| F:851–852 `handleSubmit` | `event.preventDefault()` then the checks | then a comment and `if (changedCount === 0) return` | M-R10 |
| F:952–953 `handleLdapSync` | `setSyncingLdap(action)` first | a comment and `if (action === "apply" && !syncPreview) return` first | M-R10 |
| F:1932–1937 the apply `Button` | `disabled={syncingLdap === "preview" \|\| !syncPreview}` | `disabled={syncingLdap === "preview"}`, `aria-disabled={!syncPreview \|\| undefined}`, `aria-describedby={!syncPreview ? "ldap-sync-no-preview" : undefined}` | ST-R8 |
| F:2037 the footer's status line | `<p className="text-sm font-semibold text-foreground">` | `<p id="settings-save-status" …>` | ST-R8 |
| F:2044 the save | `<Button type="submit" busy={saving} disabled={changedCount === 0}>` | one prop per line: `type="submit"`, `busy={saving}`, `aria-disabled={changedCount === 0 \|\| undefined}`, `aria-describedby={changedCount === 0 ? "settings-save-status" : undefined}` | ST-R8 |
| F:2279 `SyncPreviewPanel` | `return <EmptyNote>{labels.ldapSyncNoPreview}</EmptyNote>` | `<EmptyNote id="ldap-sync-no-preview">` | ST-R8 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track3.test.ts` exactly this block (write it with a file tool):

```ts

test("the save waits with its reason when nothing changed, and LDAP apply waits for a preview with its reason (v-track plan 3 task 5, ST5)", () => {
  const form = formSource()
  // Save: aria-disabled (it stays focusable), tied to the visible status line, and the handler returns first.
  assert.match(form, /<p id="settings-save-status" className="text-sm font-semibold text-foreground">\n\s+\{changedCount > 0 \? labels\.unsavedChanges/)
  assert.match(form, /<Button\n\s+type="submit"\n\s+busy=\{saving\}\n\s+aria-disabled=\{changedCount === 0 \|\| undefined\}\n\s+aria-describedby=\{changedCount === 0 \? "settings-save-status" : undefined\}\n\s+>/)
  assert.doesNotMatch(form, /disabled=\{changedCount === 0\}/)
  const submit = form.slice(form.indexOf("  async function handleSubmit("), form.indexOf("  async function handleLdapTest("))
  assert.match(submit, /event\.preventDefault\(\)\n(?:\s+\/\/[^\n]*\n)+\s+if \(changedCount === 0\) return\n\s+fieldErrors\.setErrors\(validate\(/)
  // LDAP apply: still disabled while a preview runs (another action is busy, not a gate); without a preview it is
  // aria-disabled, tied to the line that says no preview has run, and its handler returns first.
  assert.match(form, /disabled=\{syncingLdap === "preview"\}\n\s+aria-disabled=\{!syncPreview \|\| undefined\}\n\s+aria-describedby=\{!syncPreview \? "ldap-sync-no-preview" : undefined\}/)
  assert.match(form, /return <EmptyNote id="ldap-sync-no-preview">\{labels\.ldapSyncNoPreview\}<\/EmptyNote>/)
  assert.match(form, /async function handleLdapSync\(action: "preview" \| "apply"\) \{\n(?:\s+\/\/[^\n]*\n)+\s+if \(action === "apply" && !syncPreview\) return\n/)
  assert.doesNotMatch(form, /\|\| !syncPreview\}/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track3.test.ts`. Expected: 5 tests, 1 fail: "the save waits with its reason when nothing changed, and LDAP apply waits for a preview with its reason (v-track plan 3 task 5, ST5)" (`AssertionError: The input did not match the regular expression /<p id="settings-save-status" …/`).
- [ ] **Step 3: Implement** (exact; the Edit tool keeps the file's CRLF):

- `src/components/admin/system-settings-form.tsx`, edit 1 of 6. Old:

```tsx
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
```

  New:

```tsx
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Nothing changed is a prerequisite, not a field: the save waits and the status line beside it says why (spec §4.4,
    // ST-R8). Enter in a field still reaches here.
    if (changedCount === 0) return
```

- `src/components/admin/system-settings-form.tsx`, edit 2 of 6. Old:

```tsx
  async function handleLdapSync(action: "preview" | "apply") {
    setSyncingLdap(action)
```

  New:

```tsx
  async function handleLdapSync(action: "preview" | "apply") {
    // Apply needs a preview first: the button waits and the empty preview line says why (spec §4.4, ST-R8).
    if (action === "apply" && !syncPreview) return
    setSyncingLdap(action)
```

- `src/components/admin/system-settings-form.tsx`, edit 3 of 6. Old:

```tsx
            <Button
              onClick={() => handleLdapSync("apply")}
              busy={syncingLdap === "apply"}
              disabled={syncingLdap === "preview" || !syncPreview}
              className="w-full sm:w-auto"
            >
```

  New:

```tsx
            <Button
              onClick={() => handleLdapSync("apply")}
              busy={syncingLdap === "apply"}
              disabled={syncingLdap === "preview"}
              aria-disabled={!syncPreview || undefined}
              aria-describedby={!syncPreview ? "ldap-sync-no-preview" : undefined}
              className="w-full sm:w-auto"
            >
```

- `src/components/admin/system-settings-form.tsx`, edit 4 of 6. Old:

```tsx
            <p className="text-sm font-semibold text-foreground">
              {changedCount > 0 ? labels.unsavedChanges.replace("{count}", String(changedCount)) : labels.noUnsavedChanges}
            </p>
```

  New:

```tsx
            <p id="settings-save-status" className="text-sm font-semibold text-foreground">
              {changedCount > 0 ? labels.unsavedChanges.replace("{count}", String(changedCount)) : labels.noUnsavedChanges}
            </p>
```

- `src/components/admin/system-settings-form.tsx`, edit 5 of 6. Old:

```tsx
        <Button type="submit" busy={saving} disabled={changedCount === 0}>
```

  New:

```tsx
        <Button
          type="submit"
          busy={saving}
          aria-disabled={changedCount === 0 || undefined}
          aria-describedby={changedCount === 0 ? "settings-save-status" : undefined}
        >
```

- `src/components/admin/system-settings-form.tsx`, edit 6 of 6. Old:

```tsx
    return <EmptyNote>{labels.ldapSyncNoPreview}</EmptyNote>
```

  New:

```tsx
    return <EmptyNote id="ldap-sync-no-preview">{labels.ldapSyncNoPreview}</EmptyNote>
```

  After Step 3 and before Step 4, `node --test tests/sticky-form-footer-ui.test.ts` fails one test: "the settings form ends with the sticky save bar, inside its <form> (K14, 1f)". That is expected; Step 4 is its edit.
- [ ] **Step 4: Pin edit** (exact; the old string occurs once):

- `tests/sticky-form-footer-ui.test.ts`, edit 1 of 1. Old:

```ts
  assert.match(source, /<Button type="submit" busy=\{saving\} disabled=\{changedCount === 0\}>/)
```

  New:

```ts
  // Nothing changed: the save stays focusable and says why (v-track plan 3 task 5, ST5).
  assert.match(source, /<Button\n\s+type="submit"\n\s+busy=\{saving\}\n\s+aria-disabled=\{changedCount === 0 \|\| undefined\}\n\s+aria-describedby=\{changedCount === 0 \? "settings-save-status" : undefined\}\n\s+>/)
```

- [ ] **Step 5: Verify.** `node --test tests/v-track3.test.ts tests/sticky-form-footer-ui.test.ts tests/admin-sweep-ui.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/visual-foundation-guards.test.ts` (86 tests, 0 fail in the rehearsal); `npm test` (+1; **2297 tests, 2296 pass, 0 fail, 1 skipped**); `npx tsc --noEmit`; `npm run lint` (0 errors, 146 warnings). `node <tools>/eol.mjs src/components/admin/system-settings-form.tsx tests/sticky-form-footer-ui.test.ts tests/v-track3.test.ts` prints `2650 2650`, `57 57` and `0 310`.
- [ ] **Step 6: Commit.** `git add src/components/admin/system-settings-form.tsx tests/sticky-form-footer-ui.test.ts tests/v-track3.test.ts`, then `git commit -m "feat(settings): the save and the LDAP apply wait with their reason beside them (v-track plan 3 task 5, ST5)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 6 (ST6): The eleven group sentences of the old boxes and toasts are retired (`c/admin/system-settings-form.tsx`, the settings page, messages)

Spec §7.1; plan 2 open issue 4's answer (a message that loses its last reader goes); ST-R9.

**Files:**
- Modify: `src/components/admin/system-settings-form.tsx` (`i/lf w/crlf`; the `labels` type), `src/app/[locale]/(dashboard)/admin/settings/page.tsx` (`i/lf w/crlf`), `messages/th.json`, `messages/en.json` (`i/lf w/crlf`, through `scripts/messages-edit.mjs`)
- Test: `tests/v-track3.test.ts` (LF, append)

**Interfaces:**
- Consumes: Tasks 3 and 4 (the last readers of these sentences are gone; `labels.invalidPrefix` and `labels.prefixCategoriesRequired` stay).
- Produces: 4083 leaf keys per locale.

**Changes at f1ae1828:**

| Where | Lines that go (each a whole line; an exact edit takes the next line as its anchor) | Rule |
|---|---|---|
| F `labels` type | `invalidFormatTemplate: string` (F:179), `invalidLabelTemplate`, `invalidLabelSize`, `invalidPublicQrBaseUrl` (F:212–214), `invalidOperationDocumentTemplate` (F:224), `duplicateCategory` (F:248), `invalidAccountingDepreciationPolicy` (F:255), `invalidNotificationRule` (F:299), `invalidWorkflowApproval` (F:312), `invalidSchedulerSchedule` (F:316), `invalidRetentionPolicy` (F:326) | ST-R9 |
| page | the same eleven `key: t("key"),` lines (`:125`, `:158–160`, `:170`, `:194`, `:201`, `:245`, `:258`, `:262`, `:272`) | ST-R9 |
| messages | the same eleven `systemSettingsPage.*` keys, th and en | ST-R9 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track3.test.ts` exactly this block (write it with a file tool):

```ts

test("the eleven group sentences of the old boxes and toasts are gone with their labels; the prefix sentence stays (v-track plan 3 task 6, ST6)", () => {
  const form = formSource()
  const page = read("src/app/[locale]/(dashboard)/admin/settings/page.tsx")
  const retired = [
    "duplicateCategory",
    "invalidFormatTemplate",
    "invalidPublicQrBaseUrl",
    "invalidLabelTemplate",
    "invalidLabelSize",
    "invalidOperationDocumentTemplate",
    "invalidNotificationRule",
    "invalidRetentionPolicy",
    "invalidAccountingDepreciationPolicy",
    "invalidWorkflowApproval",
    "invalidSchedulerSchedule",
  ]
  for (const key of retired) {
    assert.doesNotMatch(form, new RegExp(`\\b${key}\\b`), `form: ${key}`)
    assert.doesNotMatch(page, new RegExp(`\\b${key}\\b`), `page: ${key}`)
    for (const locale of ["th", "en"] as const) assert.equal(messages(locale).systemSettingsPage[key], undefined, `${locale}: systemSettingsPage.${key}`)
  }
  // Each setting now reads its own sentence from apiErrors (task 1); the prefix editor and the prefix groups keep theirs.
  assert.match(page, /\n\s+invalidPrefix: t\("invalidPrefix"\),\n\s+prefixCategoriesRequired: t\("prefixCategoriesRequired"\),\n/)
  assert.match(form, /\n\s+invalidPrefix: string\n\s+prefixCategoriesRequired: string\n/)
  for (const locale of ["th", "en"] as const) assert.equal(typeof messages(locale).systemSettingsPage.invalidPrefix, "string")
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track3.test.ts`. Expected: 6 tests, 1 fail: "the eleven group sentences of the old boxes and toasts are gone with their labels; the prefix sentence stays (v-track plan 3 task 6, ST6)" (`AssertionError: form: duplicateCategory`).
- [ ] **Step 3: Implement** (exact; the Edit tool keeps the files' CRLF):

- `src/components/admin/system-settings-form.tsx`, edit 1 of 9. Old:

```tsx
    invalidFormatTemplate: string
    labelPrintTemplate: string
```

  New:

```tsx
    labelPrintTemplate: string
```

- `src/components/admin/system-settings-form.tsx`, edit 2 of 9. Old:

```tsx
    invalidLabelTemplate: string
    invalidLabelSize: string
    invalidPublicQrBaseUrl: string
    operationDocumentNumbers: string
```

  New:

```tsx
    operationDocumentNumbers: string
```

- `src/components/admin/system-settings-form.tsx`, edit 3 of 9. Old:

```tsx
    invalidOperationDocumentTemplate: string
    categoryPrefixes: string
```

  New:

```tsx
    categoryPrefixes: string
```

- `src/components/admin/system-settings-form.tsx`, edit 4 of 9. Old:

```tsx
    duplicateCategory: string
    invalidPrefix: string
```

  New:

```tsx
    invalidPrefix: string
```

- `src/components/admin/system-settings-form.tsx`, edit 5 of 9. Old:

```tsx
    invalidAccountingDepreciationPolicy: string
    depreciationPolicyBuilderTitle: string
```

  New:

```tsx
    depreciationPolicyBuilderTitle: string
```

- `src/components/admin/system-settings-form.tsx`, edit 6 of 9. Old:

```tsx
    invalidNotificationRule: string
    workflowApprovalPolicy: string
```

  New:

```tsx
    workflowApprovalPolicy: string
```

- `src/components/admin/system-settings-form.tsx`, edit 7 of 9. Old:

```tsx
    invalidWorkflowApproval: string
    schedulerSettings: string
```

  New:

```tsx
    schedulerSettings: string
```

- `src/components/admin/system-settings-form.tsx`, edit 8 of 9. Old:

```tsx
    invalidSchedulerSchedule: string
    governanceSettings: string
```

  New:

```tsx
    governanceSettings: string
```

- `src/components/admin/system-settings-form.tsx`, edit 9 of 9. Old:

```tsx
    invalidRetentionPolicy: string
    advancedSettings: string
```

  New:

```tsx
    advancedSettings: string
```

- `src/app/[locale]/(dashboard)/admin/settings/page.tsx`, edit 1 of 9. Old:

```tsx
          invalidFormatTemplate: t("invalidFormatTemplate"),
          labelPrintTemplate: t("labelPrintTemplate"),
```

  New:

```tsx
          labelPrintTemplate: t("labelPrintTemplate"),
```

- `src/app/[locale]/(dashboard)/admin/settings/page.tsx`, edit 2 of 9. Old:

```tsx
          invalidLabelTemplate: t("invalidLabelTemplate"),
          invalidLabelSize: t("invalidLabelSize"),
          invalidPublicQrBaseUrl: t("invalidPublicQrBaseUrl"),
          operationDocumentNumbers: t("operationDocumentNumbers"),
```

  New:

```tsx
          operationDocumentNumbers: t("operationDocumentNumbers"),
```

- `src/app/[locale]/(dashboard)/admin/settings/page.tsx`, edit 3 of 9. Old:

```tsx
          invalidOperationDocumentTemplate: t("invalidOperationDocumentTemplate"),
          categoryPrefixes: t("categoryPrefixes"),
```

  New:

```tsx
          categoryPrefixes: t("categoryPrefixes"),
```

- `src/app/[locale]/(dashboard)/admin/settings/page.tsx`, edit 4 of 9. Old:

```tsx
          duplicateCategory: t("duplicateCategory"),
          invalidPrefix: t("invalidPrefix"),
```

  New:

```tsx
          invalidPrefix: t("invalidPrefix"),
```

- `src/app/[locale]/(dashboard)/admin/settings/page.tsx`, edit 5 of 9. Old:

```tsx
          invalidAccountingDepreciationPolicy: t("invalidAccountingDepreciationPolicy"),
          depreciationPolicyBuilderTitle: t("depreciationPolicyBuilderTitle"),
```

  New:

```tsx
          depreciationPolicyBuilderTitle: t("depreciationPolicyBuilderTitle"),
```

- `src/app/[locale]/(dashboard)/admin/settings/page.tsx`, edit 6 of 9. Old:

```tsx
          invalidNotificationRule: t("invalidNotificationRule"),
          workflowApprovalPolicy: t("workflowApprovalPolicy"),
```

  New:

```tsx
          workflowApprovalPolicy: t("workflowApprovalPolicy"),
```

- `src/app/[locale]/(dashboard)/admin/settings/page.tsx`, edit 7 of 9. Old:

```tsx
          invalidWorkflowApproval: t("invalidWorkflowApproval"),
          schedulerSettings: t("schedulerSettings"),
```

  New:

```tsx
          schedulerSettings: t("schedulerSettings"),
```

- `src/app/[locale]/(dashboard)/admin/settings/page.tsx`, edit 8 of 9. Old:

```tsx
          invalidSchedulerSchedule: t("invalidSchedulerSchedule"),
          governanceSettings: t("governanceSettings"),
```

  New:

```tsx
          governanceSettings: t("governanceSettings"),
```

- `src/app/[locale]/(dashboard)/admin/settings/page.tsx`, edit 9 of 9. Old:

```tsx
          invalidRetentionPolicy: t("invalidRetentionPolicy"),
          advancedSettings: t("advancedSettings"),
```

  New:

```tsx
          advancedSettings: t("advancedSettings"),
```

- Save `<temp>/changes/t6-messages.json` with exactly this text, then run `node scripts/messages-edit.mjs <temp>/changes/t6-messages.json` (it prints `messages updated: 0 th, 0 en, 11 deleted`):

```json
{
  "delete": [
    "systemSettingsPage.invalidFormatTemplate",
    "systemSettingsPage.invalidLabelTemplate",
    "systemSettingsPage.invalidLabelSize",
    "systemSettingsPage.invalidPublicQrBaseUrl",
    "systemSettingsPage.invalidOperationDocumentTemplate",
    "systemSettingsPage.duplicateCategory",
    "systemSettingsPage.invalidAccountingDepreciationPolicy",
    "systemSettingsPage.invalidNotificationRule",
    "systemSettingsPage.invalidWorkflowApproval",
    "systemSettingsPage.invalidSchedulerSchedule",
    "systemSettingsPage.invalidRetentionPolicy"
  ]
}
```

  After Step 3 no other test fails (the eleven keys have no reader left; `tests/phase2d-final-ui.test.ts` checks four other names).
- [ ] **Step 4: Pin and guard edits.** None.
- [ ] **Step 5: Verify.** `node --test tests/v-track3.test.ts tests/phase2d-final-ui.test.ts tests/admin-sweep-ui.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts tests/messages-edit.test.ts tests/thai-page-english-copy.test.ts tests/validation-guards.test.ts` (50 tests, 0 fail in the rehearsal); `npm test` (+1; **2298 tests, 2297 pass, 0 fail, 1 skipped**); `npx tsc --noEmit`; `npm run lint` (0 errors, 146 warnings). `node <tools>/eol.mjs src/components/admin/system-settings-form.tsx "src/app/[locale]/(dashboard)/admin/settings/page.tsx" messages/th.json messages/en.json tests/v-track3.test.ts` prints `2639 2639`, `355 355`, `4265 4265`, `4265 4265` and `0 337`. `node <tools>/counts.mts .`: 4083 leaf keys per locale; toasts outside a catch 22 in 10 files; `<form … noValidate>` 47; `V_FORMS` 44; `SELECT_STAR_ONLY` `0 in 0`; FMG `STAR_ONLY` `new Set<string>([])`.
- [ ] **Step 6: Commit.** `git add src/components/admin/system-settings-form.tsx "src/app/[locale]/(dashboard)/admin/settings/page.tsx" messages/th.json messages/en.json tests/v-track3.test.ts`, then `git commit -m "chore(settings): retire the eleven group sentences the old boxes and toasts read (v-track plan 3 task 6, ST6)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

### Rehearsal record (Tasks 1–6)

| Task | `v3-dry` | Step 2 (the new test fails first) | failing after Step 3, before Step 4 | `npm test` after (tests / pass / fail / skipped) | `tests/v-track3.test.ts` |
|---|---|---|---|---|---|
| 1 | `e841d208` | 1 test, 1 fail: `ERR_MODULE_NOT_FOUND` for the module | none | 2293 / 2292 / 0 / 1 | `0 126` |
| 2 | `fe29d530` | the new test: the `ToggleField` input regex | 1 (the builder's JSON `Field` pin) | 2294 / 2293 / 0 / 1 | `0 159` |
| 3 | `685a7d44` | the new test: the `noValidate` form regex | 3 (the two depreciation pins, the tab row pin) | 2295 / 2294 / 0 / 1 | `0 261` |
| 4 | `a946f0ed` | the new test: the `PREFIX_EDITOR_FIELD_IDS` regex | 3 (its own `V_FORMS` assertion, the dialog footer pin, the `ValidationMessage` pin) | 2296 / 2295 / 0 / 1 | `0 294` |
| 5 | `ee8af3e3` | the new test: the `settings-save-status` regex | 1 (the save button pin) | 2297 / 2296 / 0 / 1 | `0 310` |
| 6 | `d4571bc2` | the new test: `form: duplicateCategory` | none | 2298 / 2297 / 0 / 1 | `0 337` |

- Every task: `npx tsc --noEmit` clean; `npm run lint` 0 errors, 146 warnings (all under `.agents/`); every edited CRLF file printed the same number twice; `src/lib/system-settings-field-rules.ts` and `tests/v-track3.test.ts` LF.
- What the drafting changed before the replay: Task 3's test first counted the editor's box (`<ValidationMessage ` once), which Task 4 removes, so a green Task 3 test would have failed after Task 4: it now forbids any box but the editor's (`/<ValidationMessage message=\{labels\.(?!invalidPrefix\})/`); a fix-up of the draft by `git rebase --autosquash` rewrote the two new LF files as CRLF (restored; the Global Constraints forbid a rebase); a shell `node -e` turned `\b` into a backspace in a test line (rewritten with a file tool; the Global Constraints say so).

---

## Controller: verify and dev-app check (Task 7)

### Task 7: Verify, production build and dev-app check in both themes (controller runs this task, not an implementer)

The shape of plan 2's Task 32. **No request but a GET reaches the server:** the settings save is fulfilled with a stand-in body (`route.fulfill`) built from the route's real refusal shape, or aborted; every other non-GET is aborted.

**Files:**
- Create then delete: your own launch configuration in `.claude/launch.json` while the server runs (never committed; if the file already holds another session's configuration, add your own entry with its own name and port and remove only that entry afterwards; delete the file only if you created it).
- Evidence (git-ignored): `.superpowers/sdd/screenshots/v-track-plan3/after/`, `.superpowers/sdd/v-track-plan3/task-7-counts/`, `.superpowers/sdd/v-track-plan3/task-7-findings.md`.
- Modify: only files needed to fix problems found here. Each fix is a new small task with its own test through an implementer and the normal review, before Task 8. A fix never adds an `EXEMPT`, `V_SCOPE`, `NOT_IN_SCOPE`, `NON_VALIDATION_TOASTS` or FMG row without a ruling, and it changes the counts below; say by how much in the findings.

**Interfaces:**
- Consumes: Tasks 1–6 committed; Task 0's baseline, counts and before evidence.
- Produces: `task-7-findings.md`, which Task 8 turns into the "Dev-app check" and "Still open" bullets of the handoff section and the "ตรวจบนแอป" bullet of the changelog entry, and the user's answers to the open issues (if the user has answered; else "the defaults as written").

- [ ] **Step 1: Verify.** Delete `.next/cache/turbopack` first (a stale Turbopack cache shipped old CSS before, wiki 47), then `npm run verify` (lint, tests, build). Expected: lint 0 errors and 146 warnings (all under `.agents/`); tests **2298 tests, 2297 pass, 0 fail, 1 skipped** (the replay's Task 6); build **60/60 pages** (plan 2's verify; plan 3 adds no route, so another page count is a finding). Then `npx tsc --noEmit` (clean), `git status --short` (only the untracked items of the Global Constraints), and `node <tools>/eol.mjs src/lib/system-settings-field-rules.ts tests/v-track3.test.ts` (`0 <lines>` each).
- [ ] **Step 2: The built CSS.** In `.next/static/css/*.css`, the rules the new error states use: `aria-invalid:border-danger`, `aria-invalid:ring-danger`, `aria-invalid:shadow-field-error` and `aria-invalid:focus:border-ring` (`src/components/ui/field-variants.ts`; every `Field` control takes them), `text-danger` (`FieldError`), and the Button's `aria-disabled:` styles (the two gates). Plan 3 adds no new utility class: every class token of the `className` strings it adds (`git diff f1ae1828 HEAD -- src`) was already in use at `f1ae1828` (the rehearsal checked: `grid min-w-0 content-start gap-1.5`, `space-y-4`, the grid of the transfer lists). A missing rule is a finding to fix before Step 4.
- [ ] **Step 3: Counting evidence after.** `node <tools>/counts.mts .` and the commands of Task 0 Step 4 again, into `task-7-counts/`, compared with `task-0-counts/`: toasts outside a catch in `src` 22 in 10 files (34 in 11); `<form … noValidate>` 47 (46); 4083 leaf keys per locale (4093); `V_FORMS` 44 (43); `SELECT_STAR_ONLY` `0 in 0`; FMG `STAR_ONLY` `new Set<string>([])`; in the form `grep -c "toast.error("` 0 (12), `grep -c "ValidationMessage"` 0 (13 boxes and the function), `grep -c "disabled={changedCount === 0}"` 0, `grep -c "canApplyPrefixEditor"` 0. `git grep -nE "duplicateCategory|invalidFormatTemplate|invalidPublicQrBaseUrl|invalidLabelTemplate|invalidLabelSize|invalidOperationDocumentTemplate|invalidNotificationRule|invalidRetentionPolicy|invalidAccountingDepreciationPolicy|invalidWorkflowApproval|invalidSchedulerSchedule" -- src messages` prints nothing (`category-form` matches `duplicateCategoryCustomField`: use `-w`).
- [ ] **Step 4: Production server.**
  - Add a launch configuration `name: "asset-v3-start-3110"`, `runtimeExecutable: "node"`, `runtimeArgs: ["node_modules/next/dist/bin/next", "start", "-p", "3110"]`, `port: 3110`, `autoPort: false` (another free port if 3110 is taken; say which in the findings), and start it with `preview_start`.
  - Confirm the dev database as in Task 0 Step 5 without opening `.env` (`/th/admin/readiness`); if anything suggests the production database, stop. Every page opens in the Playwright browser, never in the Browser pane `preview_start` opens (Task 0 Step 5). Log in with the seed admin of `prisma/seed.ts` (a `system_admin`); do not echo the password. The login is the one non-GET that reaches the server (Task 0 Step 5); never sign out during the task.
  - Prefer `waitUntil: "load"` plus a short wait over `networkidle`. Playwright code runs inline (`browser_run_code_unsafe`); a file you must create goes under `.playwright-mcp/` and is deleted right after the run.
- [ ] **Step 5: No request but a GET reaches the server** (the login aside). Right after the login, before `/th/admin/settings`, run Task 0 Step 6's handler code unchanged (it routes the context) and keep it for the rest of the task:
  - **The handler:** a `GET` or `HEAD` continues. `PUT /api/admin/settings` is **always fulfilled, never continued** (`route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) })`), with the stand-in set for the check in hand (default: 400 `{ "error": "Something else", "code": "OTHER" }`). Every other non-GET is aborted (`route.abort()`): `POST /api/admin/settings/ldap-test` and `POST /api/admin/settings/ldap-sync` (they reach the directory; the sync writes employees) included. Log each non-GET with its method, path and "fulfilled <status>" or "aborted".
  - **Prove it first:** Task 0 Step 6's two probes, in their order: the `POST` probe aborted, then the `PUT` probe answering exactly the default stand-in's body (`{ "error": "Something else", "code": "OTHER" }`, not the route's `"Invalid request data"`) with `PUT /api/admin/settings fulfilled 400` in the log. If either does not, stop and set the context up again with `serviceWorkers: "block"`; if the page or the context is recreated, run the handler and both probes again.
  - **Stand-ins are built from the code:** the route answers a schema refusal as `{ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors }` with keys `settings.<key>` (`settingFieldKeyFor`, `tests/v-track-s.test.ts`), an unknown key as 400 `{ error: "Unknown settings: <keys>" }`, an LDAP key changed by a non-admin as 403 `{ error: "Forbidden: only system_admin can change <key>" }`.
  - **Never:** a save with the handler off; the LDAP test, preview or apply with the handler off; any button outside the settings page that sends a non-GET.
  - Count every non-GET at the end: each fulfilled or aborted, none continued. One that continued is a finding, reported with its route, its status and whether it wrote.
- [ ] **Step 6: The settings form, at 1440 and 375, light and dark** (Task 0 Step 7's list), screenshots to `after/settings-<state>-<theme>-<width>.png`:
  - **While typing (U8):** each mistake of Task 0 Step 7 shows its error under its own field at once (the template under the template; the label width under that tape's width; the notification day under its day; the custom schedule under the custom schedule on the LDAP sync tab, and nothing on the automation tab), read once through the polite region (the accessibility tree: the field's description holds it; one live region per field); no danger box anywhere; fixing the value removes it.
  - **Save with a mistake on another tab:** e.g. the notification day 400 saved from the label tab: the page switches to the notifications tab, the field is focused and its box (label to error line) sits inside `main`, 24px clear of the top edge and of the save bar (`getBoundingClientRect` against `main` and `[data-slot="sticky-form-footer"]`); no toast, no bubble, no request. The same for an advanced setting's value over 5000 characters (set through the console; the advanced tab opens and its `<details>` opens), including one whose key's prefix names another tab if the dev data lists one in the advanced table (`notification_digest_last_error` and its two siblings: the advanced tab opens, not the automation tab; ST-R4), and for the depreciation JSON made invalid (the organization tab, its section open, the textarea focused).
  - **Save-only rules (U6):** the running digits 13 and 2.5, the LDAP deactivation limit −1, a label width of 40.5 and a margin of 0.3: no error while typing; on save each under its field ("ต้องอยู่ระหว่าง 1 ถึง 12", "ต้องไม่น้อยกว่า 0", "กรุณากรอกเป็นตัวเลข"), the first focused.
  - **Server refusals (stand-ins):** 400 `{ "error": "Invalid request data", "code": "VALIDATION_FAILED", "fieldErrors": { "settings.ldap_sync_mode": "schedulerModeInvalid" } }` saved from the asset-numbering tab → the LDAP sync tab, the mode select focused, "โหมดตั้งเวลาไม่ถูกต้อง" under it; `{ …, "fieldErrors": { "settings.workflow_approval_disposal_required": "approvalToggleInvalid" } }` → the switch line's error, the checkbox focused; `{ …, "fieldErrors": { "settings.asset_label_compact_asset_name_enabled": "labelToggleInvalid" } }` → the group's error, its first choice focused; 400 `{ "error": "Unknown settings: x" }` and 403 `{ "error": "Forbidden: only system_admin can change ldap_url" }` → today's toast once, the form as it was.
  - **Clearing:** changing a field with a save's or a refusal's error removes that error only; a new save recomputes.
  - **A stored value a control's limit refuses** (only if Task 0's baseline lists one): a save of an unrelated change stops on that field, on its tab, with its error (open issue 13's default); record it in the findings for the user.
  - **The prefix editor:** "เพิ่มคำนำหน้ารหัส" opens with no error; save → "กรุณาระบุข้อมูลนี้" under the prefix, focus in it; one letter typed → its rule at once; a valid prefix and no category → the categories' sentence under the lists, focus on the search of the available categories; inside the dialog at 375 too; cancel and reopen → no error; a valid group saves into the table (no request). The prefix-groups error under the table can be seen only with a stored bad prefix: skip it unless the dev data holds one ("covered by Task 3's test").
  - **The gates:** with nothing changed, the save is focusable, looks disabled, and its accessible description is "ยังไม่มีรายการที่เปลี่ยนแปลง"; Enter in a field sends nothing. The LDAP sync apply before a preview: focusable, described by "ยังไม่มีผลตัวอย่าง …"; Enter sends nothing (do not press preview).
- [ ] **Step 7: The shared parts.** One announcement per submit (F-R6) in the accessibility tree: the focused field's name and description hold the error, and no other region announces it, with one known exception (open issue 14): a field with `liveError` that gets its error from the save or the server, not from its live rule (the editor's empty prefix; a label width of 40.5 or a margin of 0.3 saved on the label tab; a refusal naming a live setting), also puts that error in its polite region. Record what the tree shows for the empty prefix and for a width of 40.5 in the findings; it is not a finding to fix unless the user answers open issue 14 otherwise. Forced colors and reduced motion on the settings page and the prefix editor: the error text, the field border and the gates' look show; focus scrolls without animation.
- [ ] **Step 8: Findings.** Write `task-7-findings.md` with these parts (Task 8 copies them):
  - **Fixes made:** commit and one line each, or "none".
  - **Checked and passed:** what, where, in which themes and widths, with results; the verify numbers of Step 1; the built CSS of Step 2; the counts of Step 3; every non-GET of Step 5 with "fulfilled <status>" or "aborted" (none continued).
  - **Differences from Task 0's before evidence:** each mapped to a decision of this plan (any other is a finding to fix).
  - **Found but not caused by this plan.**
  - **For the user:** the open issues on screenshots (1 the per-field sentences, 3 the scheduler's error on the LDAP sync tab, 6 the editor's empty prefix, 10 the two gates), what Step 6 and Step 7 saw for 13 (a stored value a control's limit refuses, if the dev data holds one) and 14 (the second reading of a save's error on a live field), and the user's answers if given.
  - **Still needs a person:** NVDA on the settings page (a save that switches tabs is read once) and the prefix editor; real phones (the tab row and the save bar with the focused field); an English pass of the new message.
- [ ] **Step 9: Clean up.** Stop your server, remove your launch configuration and every helper you put under the repo. `git status --short` shows only the untracked items of the Global Constraints. No commit in this task unless Step 8 lists fixes (each its own task).

---

## The docs (Task 8)

### Task 8: V track plan 3 in the handoff and the changelog (`DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md`, `tests/v-track-docs.test.ts`)

Spec §9; the shape of plan 2's Task 33. The handoff section before `## Open Go-Live Decisions`, after plan 2's (H2); the Thai changelog entry first under the newest date (C1 when `<today>` is 2026-10-19, else C1b with a new date heading); the handoff's header date (H1, only on a later date). Plan 2's record test moves its "first under the newest date" assertion (P1), as plan 2's Task 33 moved plan 1's, and the same file gains this plan's record test.

**Files:**
- Modify: `DEVELOPER_HANDOFF.md` (`i/lf w/crlf`), `docs/99_CHANGELOG.md` (`i/lf w/crlf`), `tests/v-track-docs.test.ts` (`i/lf w/crlf`; one test appended, one assertion of plan 2's test rewritten).
- Read: `.superpowers/sdd/v-track-plan3/task-7-findings.md` (Task 7, git-ignored). **If the findings file is missing, stop and report before editing anything:** never write the dev-app check text without it.

**Interfaces:** produces `## V Track Plan 3 (<today>)` with a `- Dev-app check: checked (Task 7) on …` bullet, and `### ข้อความผิดพลาดใต้ช่องกรอก รอบ 3 (งาน V plan 3)` with a `- **ตรวจบนแอป:** (Task 7) ตรวจบน …` bullet; Task 9 inserts the verify line directly above each (both prefixes occur once in their file).

**Changes at the end of Task 7** (no task of this plan edits these files before this one):

| Id | Line | What changes | Rule |
|---|---|---|---|
| H1 | `DEVELOPER_HANDOFF.md:3` | `> Last updated: 2026-10-19` → `> Last updated: <today>`, only if `<today>` is not 2026-10-19 | — |
| H2 | `DEVELOPER_HANDOFF.md:1126` | this plan's section before `## Open Go-Live Decisions` (after plan 2's) | spec §9 |
| C1 | `docs/99_CHANGELOG.md:9` | the entry above plan 2's entry under `## 2026-10-19` (C1b instead when `<today>` is another date) | spec §9, `docs/19_THAI_GLOSSARY.md` |
| P1 | `tests/v-track-docs.test.ts:51` | plan 2's entry is no longer the first under the newest date: the assertion finds it under 2026-10-19 | plan 2 Task 33 P1 |
| T | `tests/v-track-docs.test.ts` (end) | this plan's record test | spec §9 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track-docs.test.ts` exactly this block. The file is CRLF: append with the Edit tool (old string: the last five lines of the file, from `  const markers = /<today>|<N>|<from task-findings>|<จาก task-findings>|<from open-issues>|<จาก open-issues>/g` to the final `})`, which occur once before this step; new string: the same five lines followed by the block), so the appended lines are CRLF too:

```ts

// V track plan 3, the docs (task 8): the handoff section and the Thai changelog entry record plan 3 after plan 2's, with
// every marker filled; two names the section gives are checked against the code that holds them.
test("the handoff and the changelog record V track plan 3 in place, with every marker filled (v-track plan 3 task 8)", () => {
  const handoff = read("DEVELOPER_HANDOFF.md")
  const section = handoff.indexOf("\n## V Track Plan 3 (")
  assert.ok(section > handoff.indexOf("\n## V Track Plan 2 ("), "the V track plan 3 section follows the plan 2 one")
  assert.ok(section < handoff.indexOf("\n## Open Go-Live Decisions"), "and comes before Open Go-Live Decisions")
  const record = handoff.slice(section, handoff.indexOf("\n## Open Go-Live Decisions"))
  assert.match(record, /\n- Dev-app check: checked \(Task 7\) on \S/, "the dev-app check bullet")
  assert.ok(record.includes("`src/lib/system-settings-field-rules.ts`"), "the rules module")
  assert.match(read("src/lib/system-settings-field-rules.ts"), /\nexport function settingSaveErrors\(entries: readonly SettingEntry\[\], prefixRows: readonly CategoryPrefixRow\[\]\) \{\n/)
  assert.ok(record.includes("`V_FORMS` 43 → 44 (= `V_SCOPE`)"), "the V forms")
  assert.ok(read("tests/validation-guards.test.ts").includes("  `${C}admin/system-settings-form.tsx`,\n]\n"), "the settings form's V_FORMS row")
  const changelog = read("docs/99_CHANGELOG.md")
  const newest = changelog.indexOf("\n## ")
  const entry = changelog.indexOf("\n### ข้อความผิดพลาดใต้ช่องกรอก รอบ 3 (งาน V plan 3)\n")
  assert.ok(newest !== -1 && entry !== -1, "the newest date and the V track plan 3 entry")
  assert.equal(changelog.indexOf("\n### ", newest), entry, "the plan 3 entry is the first one under the newest date")
  assert.ok(entry < changelog.indexOf("\n### ข้อความผิดพลาดใต้ช่องกรอก รอบ 2 (งาน V plan 2)\n"), "above the plan 2 entry")
  assert.match(changelog.slice(entry, changelog.indexOf("\n### ", entry + 1)), /\n- \*\*ตรวจบนแอป:\*\* \(Task 7\) ตรวจบน \S/, "the dev-app check bullet")
  // Every marker of the template is filled; a failure lists the path and the markers left.
  const markers = /<today>|<N>|<from task-findings>|<จาก task-findings>|<from open-issues>|<จาก open-issues>/g
  for (const [path, text] of [["DEVELOPER_HANDOFF.md", handoff], ["docs/99_CHANGELOG.md", changelog]]) {
    assert.deepEqual([path, text.match(markers) ?? []], [path, []])
  }
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-docs.test.ts`. Expected: 3 tests, 1 fail: "the handoff and the changelog record V track plan 3 in place, with every marker filled (v-track plan 3 task 8)" ("the V track plan 3 section follows the plan 2 one").
- [ ] **Step 3: Implement.**
  - H2 (and H1 on a later date) in `DEVELOPER_HANDOFF.md`; then C1 in `docs/99_CHANGELOG.md` if `<today>` is 2026-10-19, otherwise C1b (one of the two, never both). Exact-string edits with the Edit tool, which keeps the files' CRLF:

- `DEVELOPER_HANDOFF.md`, edit 1 of 1. Old:

```md
## Open Go-Live Decisions
```

  New:

```md
## V Track Plan 3 (<today>)

- Branch `feat/v-track-3` in the main checkout (from `master` `f1ae1828`: V track plans 1 and 2 merged and pushed, not deployed). Spec `docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md` (the user's decisions U1–U9) · plan `docs/superpowers/plans/2026-10-19-v-track-plan3.md` (plan 3 of the track: the system settings form and its prefix editor, spec §5 #45 and #46).
- No migration, database write, schema, dependency or server change: `src/app/api/admin/settings/route.ts` and `src/lib/validations/system-settings.ts` are as plan 1 left them. Messages (through `scripts/messages-edit.mjs`): +1 key (`systemSettingsPage.prefixCategoriesRequired`) and −11 (`systemSettingsPage.duplicateCategory`, `invalidFormatTemplate`, `invalidPublicQrBaseUrl`, `invalidLabelTemplate`, `invalidLabelSize`, `invalidOperationDocumentTemplate`, `invalidNotificationRule`, `invalidRetentionPolicy`, `invalidAccountingDepreciationPolicy`, `invalidWorkflowApproval`, `invalidSchedulerSchedule`): 4093 → 4083 keys.
- **The rules (Task 1):** `src/lib/system-settings-field-rules.ts` holds the settings form's rules setting by setting: `settingRuleCode` answers the code the server's `systemSettingsUpdateSchema` answers for the same setting (its api-error catalog key), `settingControlCode` restates what the controls allowed before `noValidate` (running digits 1–12, the LDAP deactivation limit ≥ 0, whole numbers, a label's margin and gap in steps of 0.5), `settingSaveErrors` and `settingLiveErrors` add the 5000-character limit and the prefix groups. `tests/v-track3.test.ts` runs it and the schema on the same values. `getSystemSettingsTabForKey("accounting_depreciation_policy")` now answers the organization tab (it answered "advanced"; the change review's link for that setting opens the right tab too).
- **The form (Tasks 2, 3):** `<form onSubmit={handleSubmit} noValidate …>`, a module-level `validate()`, `useFieldErrors` keyed `settings.<key>` like the route's `fieldErrors`. Every setting the form shows has its error under its field (`SETTING_FIELD_IDS`, in visual order; the advanced settings as `setting-<key>`); a save goes to the first wrong one, switching to its tab first and opening a closed `<details>` (the advanced table, the depreciation JSON); a refusal of the server that names a setting lands the same way, and any other keeps today's toast. The 12 validation toasts went, and the 12 danger boxes of the page became each setting's error under its field, still shown while typing (`Field liveError`, spec U8); the scheduler's error now sits under the custom schedule on the LDAP sync tab, not on the automation tab. The approval switches, the label name choice (now a `FieldGroup`), each tape's nine label fields and the depreciation JSON (whose closed section opens while the JSON is invalid) can show their error.
- **The prefix editor (Task 4):** its save is no longer disabled: it checks the prefix (required, 2–10 letters A-Z or digits) and the categories (at least one, `systemSettingsPage.prefixCategoriesRequired`) and focuses the first wrong one inside the dialog; the prefix's rule shows while typing once a prefix is typed (it no longer shows on an empty prefix as the editor opens).
- **Gates (Task 5):** the save while nothing changed and the LDAP sync apply before a preview are `aria-disabled` (focusable), tied by `aria-describedby` to the line that says why (`settings-save-status`, `ldap-sync-no-preview`); their handlers return first.
- **Guards and pins:** `V_FORMS` 43 → 44 (= `V_SCOPE`); toasts outside a catch in `src` 34 in 11 files → 22 in 10; `<form … noValidate>` in `src` 46 → 47; no `EXEMPT`, `V_SCOPE`, `NOT_IN_SCOPE`, `NON_VALIDATION_TOASTS` or FMG row added. The pins that encoded the old behaviour were rewritten in the commit that changed it.
- **Tests:** new file `tests/v-track3.test.ts` (6); one test added to `tests/v-track-docs.test.ts`; 2292 → <N> tests.
- **Rulings of this plan:** ST-R1–ST-R11.
- **The user's answers to the open issues:** <from open-issues>
- **Handed on:** the final plan of the track (`DESIGN.md`'s form-error rule, `docs/14_UI_UX_DESIGN_SYSTEM.md`, `.impeccable/design.json`, one shared whole-number rule, the label print queue's two print buttons); then the E2E suite and the one deploy (wiki 27).
- Dev-app check: checked (Task 7) on <from task-findings>
- Before/after screenshots: `.superpowers/sdd/screenshots/v-track-plan3/before/` and `after/` (git-ignored, on the development machine only).
- Still open, for a person before the one deploy: <from task-findings>, together with the open checks of the sections above.
- Next: merge this branch; then the final plan of the V track, the E2E suite and the one deploy (wiki 27).

## Open Go-Live Decisions
```

- `docs/99_CHANGELOG.md`, edit 1 of 1. Old:

```md
### ข้อความผิดพลาดใต้ช่องกรอก รอบ 2 (งาน V plan 2)
```

  New:

```md
### ข้อความผิดพลาดใต้ช่องกรอก รอบ 3 (งาน V plan 3)

Branch `feat/v-track-3` (จาก `master` `f1ae1828`) · design `docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md` · plan `docs/superpowers/plans/2026-10-19-v-track-plan3.md` (plan ที่ 3 ของงาน V)

- **ขอบเขต:** ฟอร์มตั้งค่าระบบ (11 แท็บ) และหน้าต่างคำนำหน้ารหัสตามหมวดหมู่ (spec ข้อ 5 #45 และ #46) · ไม่แตะฐานข้อมูล ไม่มี migration ไม่เพิ่ม dependency ไม่แก้ server · ข้อความ: เพิ่ม 1 คีย์ ลบ 11 คีย์ ผ่าน `scripts/messages-edit.mjs` (4093 → 4083)
- **กฎชุดเดียว:** `src/lib/system-settings-field-rules.ts` ตรวจค่าตั้งค่าทีละรายการด้วยรหัสเดียวกับที่ server ตอบ จึงแสดงข้อความเดียวกันใต้ช่อง ไม่ว่าหน้าจอหรือ server จะเป็นฝ่ายพบ · ตรวจเพิ่มเฉพาะขอบเขตของช่องเดิม (จำนวนหลักเลขลำดับ 1–12 จำนวนปิดใช้งานสูงสุดต่อรอบอัตโนมัติไม่ต่ำกว่า 0 เลขจำนวนเต็ม และระยะขอบ / ช่องว่างของป้ายทีละ 0.5) · test เทียบกับ schema ของ server ด้วยค่าชุดเดียวกัน
- **หน้าจอ:** ทุกช่องแสดงข้อความผิดพลาดใต้ช่องของตัวเอง ไม่ใช้ toast แจ้งการกรอกผิด (เอาออก 12 จุด) ไม่มีกล่องเตือนของเบราว์เซอร์ · กดบันทึกแล้วสลับไปแท็บของช่องแรกที่ผิด เปิดส่วนที่ซ่อนอยู่ (รายการขั้นสูง ข้อมูลขั้นสูง JSON ของนโยบายค่าเสื่อมราคา) แล้วไปที่ช่องนั้น · server ปฏิเสธช่องไหนก็แสดงใต้ช่องนั้นบนแท็บของช่อง ข้อความที่ไม่ใช่ของช่องใดยังแสดงแบบเดิม · กล่องแดง 12 กล่องที่ขึ้นระหว่างพิมพ์ย้ายมาอยู่ใต้ช่องของตัวเองและยังขึ้นระหว่างพิมพ์เหมือนเดิม · ข้อผิดพลาดของรอบเวลาซิงก์อยู่ใต้ช่องรอบเวลาบนแท็บซิงก์ LDAP ไม่อยู่บนแท็บงานอัตโนมัติแล้ว
- **คำนำหน้ารหัส:** ปุ่มบันทึกในหน้าต่างกดได้เสมอ และบอกใต้ช่องว่าคำนำหน้ารหัสไม่ถูกต้องหรือยังไม่ได้เลือกหมวดหมู่ · ข้อความเรื่องรูปแบบคำนำหน้ารหัสไม่ขึ้นตั้งแต่เปิดหน้าต่างแล้ว ขึ้นเมื่อเริ่มพิมพ์
- **ปุ่มที่รอ:** ปุ่มบันทึกเมื่อยังไม่มีรายการที่เปลี่ยนแปลง และปุ่มซิงก์ทันทีเมื่อยังไม่ได้ดูตัวอย่าง กดโฟกัสได้และบอกเหตุผลที่เห็นบนหน้าจอ
- **test:** ไฟล์ใหม่ `tests/v-track3.test.ts` (6) · เพิ่ม 1 test ใน `tests/v-track-docs.test.ts` · `V_FORMS` 43 → 44 ไฟล์ (ครบทุกฟอร์มของ `V_SCOPE`) · test 2292 → <N>
- **deploy:** ไม่ deploy · deploy ครั้งเดียวหลังงาน V ครบทุก plan และชุด E2E
- **ตรวจบนแอป:** (Task 7) ตรวจบน <จาก task-findings>
- คำตอบของผู้ใช้ต่อข้อที่ค้างของ plan: <จาก open-issues>
- ภาพก่อน/หลัง: `.superpowers/sdd/screenshots/v-track-plan3/before/` และ `after/` (git ignore อยู่บนเครื่องพัฒนา)
- ต่อไป: merge แล้วทำ plan สุดท้ายของงาน V แล้วชุด E2E และ deploy ครั้งเดียว

### ข้อความผิดพลาดใต้ช่องกรอก รอบ 2 (งาน V plan 2)
```

  - **C1b, only if `<today>` is not 2026-10-19, instead of the changelog edit above:** replace the line `## 2026-10-19` (it occurs once) with: `## <today>`, a blank line, C1's new text without its last line (from `### ข้อความผิดพลาดใต้ช่องกรอก รอบ 3 (งาน V plan 3)` to its `- ต่อไป:` bullet), a blank line, `---`, a blank line and `## 2026-10-19`.
  - Fill the markers:
    - `<today>`: `YYYY-MM-DD`.
    - `<N>` (two places): the test count after this commit, Task 7's verify count + 1 for this task's test: **2299** when Task 7 made no fix; the same number Task 9's verify line records.
    - `<from task-findings>` (two places in the handoff) with the findings file in English, in the shape of plan 2's "Dev-app check" bullet: after `checked (Task 7) on `, the server, port and commit, the build, what passed with numbers, every non-GET request of Task 7 Step 5 with "fulfilled" or "aborted" (none reached the server), the differences from Task 0 and their decisions, the fixes or "no fixes"; in the "Still open" bullet the "Still needs a person" and "For the user" parts as sub-bullets (two spaces, `- `).
    - `<จาก task-findings>` with the same in Thai after `(Task 7) ตรวจบน `, glossary words.
    - `<from open-issues>` and `<จาก open-issues>`: the user's answers to this plan's open issues, issue by issue, as plan 2's section words them; if the user has not answered, "not answered yet: the tasks wrote the defaults of the plan's Open issues" / "ยังไม่ได้ตอบ: งานทำตามค่าตั้งต้นของข้อที่ค้างใน plan".
  - Never invent findings or answers: if the findings file does not exist, stop (the rehearsal wrote one placeholder sentence in each marker; the marker test passes either way, so the test does not catch this).
  - After Step 3 and before Step 4, `node --test tests/v-track-docs.test.ts` fails exactly one test: plan 2's, with "the plan 2 entry is the first one under the newest date".
- [ ] **Step 4: Pin edit (P1)** (exact; the old string occurs once: the appended test's message says "the plan 3 entry …"):

- `tests/v-track-docs.test.ts`, edit 1 of 1. Old:

```ts
  assert.equal(changelog.indexOf("\n### ", newest), entry, "the plan 2 entry is the first one under the newest date")
```

  New:

```ts
  assert.equal(changelog.lastIndexOf("\n## ", entry), changelog.indexOf("\n## 2026-10-19\n"), "the entry sits under 2026-10-19 (the V track plan 3 entry went above it later, v-track plan 3 task 8)")
```

  Plan 2's `newest` constant stays in use (the `assert.ok` above it). C1 and C1b both keep the line `## 2026-10-19`, so the pin holds on either date.
- [ ] **Step 5: Verify.**
  - `node --test tests/v-track-docs.test.ts tests/dark-mode-docs.test.ts tests/phase2d-docs.test.ts tests/audit-round-cancellation.test.ts` (19 tests, 0 fail in the rehearsal).
  - `grep -n "<today>\|<N>\|<from \|<จาก " DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md` → nothing.
  - `node <tools>/eol.mjs DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md tests/v-track-docs.test.ts` → equal numbers for each (all three stay CRLF): `1160 1160`, `1962 1962` and `86 86` with C1 and one-sentence findings (more when the findings add sub-bullets).
  - `git diff --numstat` → only the three files: `18 0 DEVELOPER_HANDOFF.md`, `16 0 docs/99_CHANGELOG.md`, `28 1 tests/v-track-docs.test.ts` with C1 (more lines only from the findings' sub-bullets).
  - `npm test` (+1; **2299 tests, 2298 pass, 0 fail, 1 skipped**); `npx tsc --noEmit`; `npm run lint` (0 errors, 146 warnings, all under `.agents/`).
- [ ] **Step 6: Commit.** `git add DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md tests/v-track-docs.test.ts`, then `git commit -m "docs(forms): V track plan 3 in the handoff and the changelog (v-track plan 3 task 8)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 9: Final verification, wiki and memory (controller runs this task)

**Files:**
- Modify: `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md` (the verify line each).
- Modify (vault `D:\Obsidian\Eltross`): `AssetSystem/ams-status.md`, `AssetSystem/ams-log.md`, `AssetSystem/ams-open-questions.md`, and any page that says a settings validation error is a toast or a danger box, or that the settings depreciation policy opens on the advanced tab.
- Modify (auto-memory `C:\Users\Eltross\.claude\projects\D--Antigravity-asset-system\memory\`): `v-track.md` and `MEMORY.md`'s line for it.

- [ ] **Step 1: Verify.**
  - `npm run verify`: record the test count (**2299 tests** when Task 7 made no fix) and the build's page count (60/60 expected; record what verify prints).
  - Add ``- `npm run verify` ผ่าน (test N · ผ่าน N · ข้าม 1 · build X/X หน้า)`` to the plan's changelog entry, directly above its `- **ตรวจบนแอป:** (Task 7) ตรวจบน ` bullet (numbers with thousands commas, as plan 2's entry writes them): old string `- **ตรวจบนแอป:** (Task 7) ตรวจบน `, new string the verify line, a line break and the old string.
  - Add ``- Verification: `npm run verify` passes (tests N · pass N · skipped 1 · build X/X pages).`` to the handoff section, directly above `- Dev-app check: checked (Task 7) on `, the same way.
  - Both old strings occur once in their file (plans 1 and 2 say `(Task 30)` and `(Task 32)`). Both files are CRLF: insert with the Edit tool. `node <tools>/eol.mjs DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md` → equal numbers for each, one more than after Task 8; `git diff --numstat` → `1 0` for each.
  - `npm test` again (the same count), then `git add DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md` and `git commit -m "docs(ui): record V track plan 3 verify results" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.
- [ ] **Step 2: Wiki.** Read `AssetSystem/_schema/ams-wiki-schema.md` first, then edit:
  - `ams-status.md`: the row that holds the V track (`grep -n "งาน V" AssetSystem/ams-status.md`): plan 3 built on `feat/v-track-3` with the verify numbers, not merged, not deployed; next the final plan. Fix any sentence the row now contradicts.
  - `ams-log.md`: an entry at the top of `## <today>` (a new date heading if `<today>` has none).
  - `ams-open-questions.md`: item 27's order line shows the V track's progress (plans 1 and 2 ✓, plan 3 built); this plan's open issues as answered (or as open, with their defaults); Task 7's "Still needs a person" as one new item after the last number, in the shape of plan 2's.
  - Pages that say the settings form's validation errors are toasts or danger boxes, or describe the settings rules: find them with `grep -rlnE "ValidationMessage|system-settings-form|settings-search|toast" AssetSystem` and read each hit; state what the code does now, with `sources` pointing at `src/components/admin/system-settings-form.tsx`, `src/lib/system-settings-field-rules.ts` or `src/lib/settings-search.ts`, and `confidence` as the schema says for a page checked against the code.
  - A new page (only if a fact has no page yet) gets its line in `ams-index.md` and an `ams-` name no other page of the vault holds; every page you touch keeps `status` / `verified` / `confidence` / `sources`.
  - Run `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` from `D:\Obsidian\Eltross` (0 errors), and commit only the files you edited (`git -C D:/Obsidian/Eltross add <each file>`, then `git -C D:/Obsidian/Eltross commit -m "ingest: asset-system V track plan 3 built on feat/v-track-3"`). Never stage other sessions' changes in the vault.
- [ ] **Step 3: Memory.** `v-track.md`: plan 3 built on `feat/v-track-3` (the settings form and its prefix editor; the test count verify printed), not merged, not deployed; the user's answers to its open issues (or that they are open); the wiki item of Step 2; next the final plan (DESIGN.md, docs/14, `.impeccable/design.json`, the shared whole-number rule, the print queue's two buttons), then E2E in both themes, then the one deploy. `MEMORY.md`'s one-line entry for `v-track.md` says the same in one line.
- [ ] **Step 4: Finish** with superpowers:finishing-a-development-branch. The spec merges each plan of the track in order (§9): a local merge fast-forwards `master` (`git merge --ff-only feat/v-track-3` from `master`; if `master` moved, stop and ask) and runs the tests on the merged result. No push and no merge without the user. After a merge, offer once to delete this plan's scratch clone (`<temp>/sim`; the memory's "delete scratch clones once a plan is merged"), and delete only on the user's yes.

---

## Spec coverage

Plan 3's scope is spec §5 #45 and #46 with §4 for them, U8 for the 13 settings boxes and the prefix editor, and §6.1's `settings.<key>` on the client.

### The forms

| # | Form · file | What the tasks do | Task |
|---|---|---|---|
| 45 | system settings · `c/admin/system-settings-form.tsx` | `noValidate`, `validate()` over the rules module (the server's 20 rules with its codes, the 5000 limit, the controls' min/max/step on every tab, the prefix groups); 12 validation toasts → under the field; 12 live boxes → each setting's live error under its field; a save and a server refusal open the setting's tab and its closed `<details>` and focus it; the switch lines, the label name group, the label fields, the depreciation JSON and the advanced inputs show their error; the save's "nothing changed" and LDAP apply's "preview first" gates with their reason; eleven group sentences retired | 1, 2, 3, 5, 6 |
| 46 | category prefix editor · same file (an `AccessibleDialog` inside the form, formless) | its own `validatePrefixEditor` (prefix required and 2–10 A-Z or digits, at least one category), errors under the prefix and the category lists, focus inside the dialog, the save enabled, the live box → the prefix's live error once typed; the file joins `V_FORMS` | 4 |

`V_SCOPE` counts 2 forms for this file (the form and the editor's formless submit); after Task 4 `V_FORMS` holds all 44 `V_SCOPE` files (spec U5: every form).

### The rest of the spec

| Spec | What it asks | Where in this plan |
|---|---|---|
| §2 U1 | Errors under the wrong field; the page goes to the first one, switching the settings tab first | Task 3 (`focusFirstError`: `reveal` = `selectTab(…)` with the setting's tab, the advanced tab for an advanced setting; `SETTING_FIELD_IDS` in visual order); Task 4 (the editor) |
| §2 U2 | No validation toasts | Task 3 (the 12 go; V3 holds it from Task 4); the LDAP test, the sync and a refusal that names no field keep their toasts |
| §2 U3, U9 | `fieldErrors` with dotted keys, `settings.<key>` for settings | consumed (plan 1 S-R4); `applyServer` in Task 3 |
| §2 U4 | Date pairs | none in the settings form or the editor (no date field) |
| §2 U5 | every form in one round | after Task 4 `V_FORMS` = `V_SCOPE` (44 files); the settings form is the last |
| §2 U7 | no new dependency; one shared hook plus a `validate()` per form | `useFieldErrors` ×2, module-level `validate()` and `validatePrefixEditor()`; no dependency |
| §2 U6 | Errors after save; a field's error clears when it changes | the save-only rules (ST-R3); `setValue` clears; the editor's fields clear |
| §2 U8 | Live boxes stay live, under the field; nothing twice | Tasks 3, 4 (`liveErrors[field] ?? fieldErrors.errors[field]`, `Field liveError`); Review Focus 3 |
| §3 G1–G3, G5 | under the field; server errors mapped; gates sorted; one announcement, both themes | Tasks 3–5; Task 7 Steps 6–7 |
| §3 G4 | custom server messages reach the person | every settings code reads its `apiErrors.*` sentence, client and server alike (ST-R2) |
| §3 anti-goals | a wrong field on a hidden tab or in a closed `<details>`; a live box and an error for one mistake; the bubble; five alerts | Task 3 (`reveal`, `focusField` opens `<details>`), Task 2 (the JSON section opens while invalid), ST-R3, `noValidate`, F-R6 |
| §4.1 | client then server; form-level fallback | Task 3's `handleSubmit` (the toast for a refusal that names no shown field); §4.1.1's scroll clear of the save bar and the top bar is `focusField`'s (plan 1), checked in Task 7 Step 6; §4.1.4 the LDAP test and sync keep their toasts (ST-R11) |
| §4.2 | settings tabs: switch, wait, open `<details>`, focus | Task 3 (no foundation change: the hook already awaits `reveal` and `waitForElement`) |
| §4.3 | clearing per field and per group | `setValue`; the prefix groups (Task 3); the editor's prefix and categories (Task 4) |
| §4.4 | content rules vs prerequisites | the editor's content gate → errors (Task 4); "nothing changed" and "preview first" keep their gate with a reason (Task 5); the transfer arrows are a picker's action (open issue 11) |
| §4.5 | `noValidate`; attributes stay; `validate()` restates them | Task 3; `settingControlCode` (Task 1); `CONSTRAINT_FLOORS` `[0, 1, 0]` held |
| §5 (counts, bugs) | settings 12 of the 38 client validation toasts; the listed bugs | the 12 go (Task 3); none of §5's bugs is in this file |
| §6.1 | `fieldErrors` keyed `settings.<key>`, first issue's code, catalog keys for custom issues | consumed as plan 1 S-R4 shipped it: the form's field keys are `settings.<key>` (`settingFieldKey`, ST-R4) and its codes are the same catalog keys (Task 1's test compares the module with the route's `issuesToFieldErrors(…, settingFieldKeyFor(…))`) |
| §6.2 | non-zod field refusals with `fieldErrors` | none for the settings route; the LDAP test's 400 (bind password) is not listed and keeps its toast (open issue 8); the route's `Unknown settings` 400 and the LDAP 403 name no field and keep the toast (ST-R4) |
| §6.3 | no new server rule | no server change at all; the controls' own limits are client rules (ST-R2; open issue 13 on stored values) |
| §7.1 | shared messages; domain messages | the catalog sentences per setting; `invalidPrefix` kept; one new key; eleven retired (ST-R9) |
| §7.2 | one hook, rule helpers, `validate()` per form | `useFieldErrors` ×2 (the form, the editor); `range`, `step`, `required`, `atLeastOne`; the rules module |
| §7.3 | groups (`Segmented`, a `fieldset`), one error under the group; `FieldError` not an alert; `SearchableSelect` | the label name `FieldGroup`; the prefix groups and the category lists as `role="group"` with one `FieldError` (Tasks 2–4); `FieldError` has no alert role (plan 1 F-R6) and Task 2's test keeps the switch line's error free of one; the form's one `SearchableSelect` (the LDAP default role) has no rule (open issue 9) |
| §7.4 | date pairs | none in this file |
| §8 | no dependency or write; messages through the script; the guards; pins in the same commit | Global Constraints; Tasks 0 and 7 (no settings save reaches the server); each Step 4 |
| §9 | order of work | plan 3 = the settings form; the final plan: DESIGN.md, docs/14, `.impeccable/design.json`; Task 8 (handoff, changelog), Task 9 (wiki) |
| §10 | left to the builder | the header's "Left to the builder (§10), decided here" |
| §11 calls | 1 `noValidate` · 2 gates · 3 `settings.<key>` · 7 form-level fallback | Task 3 · Task 5 · Task 3 · Task 3; calls 4 (one code set) by Task 1's codes; 5, 6, 8, 9 do not touch this file |

## Open issues (for the user before execution)

Only decisions the spec and the user's scope leave open. None blocks execution: each default is what the tasks write, and an answer that differs changes the task named.

1. **Each setting reads its own server sentence; the eleven group sentences go** (Tasks 3, 6, ST-R2, ST-R9). Today one sentence covered a group ("ขนาดป้ายต้องอยู่ในช่วงที่รองรับ: กว้าง 30-120 mm, สูง 10-100 mm, QR 20-90 px และระยะขอบ/ช่องว่าง 0-10 mm"); after this plan the width says "ความกว้างป้ายต้องอยู่ระหว่าง 30–120 mm" under the width, the same sentence the server already sends (`apiErrors.labelWidthRange`). **Default:** as written. **Recommendation:** as written (one sentence per field, the same from both sides; the old ones would show twice or show the server's under some fields and the group's under others).
2. **A whole-number or half-step setting with a fraction reads "กรุณากรอกเป็นตัวเลข"** (ST-R2: a label width of 40.5, a margin of 0.3, running digits of 2.5): the browser refused these before `noValidate`, but only on the open tab; the server takes all but none of them is a valid choice of the control. **Default:** `step()` with the shared `invalidNumber` (plan 2 MT-R2, X-R2). **Recommendation:** keep it now; the final plan's shared whole-number rule (plan 2 X-R2) can give it a clearer sentence for every form at once.
3. **The scheduler's error moves to the LDAP sync tab** (ST-R3). Today the box sits on the automation tab, whose only field-like thing is a Notice, and nothing on the LDAP sync tab shows it. **Default:** under the custom schedule on the LDAP sync tab (live), nothing on the automation tab. **Recommendation:** as written.
4. **The duplicate-category check is deleted** (ST-R5): no state of the page can hold a category twice. **Default:** deleted with its sentence. **Recommendation:** as written.
5. **A stored bad prefix group sends focus to the first group's edit button**, not the bad group's (ST-R5). It arises only from data stored before the editor (or written by hand). **Default:** the group's first control, the error under the table. **Recommendation:** as written; a mark on the bad row is a later polish if it ever happens.
6. **The editor's empty prefix shows its error only on save** (ST-R7). Today the box shows the moment "เพิ่มคำนำหน้ารหัส" opens, before anything is typed. **Default:** live once a prefix is typed, `required` on save. **Recommendation:** as written (an error before the person did anything is noise; spec U6).
7. **A new prefix equal to another group's merges into it without a word** (today's `applyCategoryPrefixGroupEdit`). **Default:** unchanged (not a field error; nothing is lost). **Recommendation:** leave it; if the user wants a notice, a small later task adds one line under the prefix ("รวมกับกลุ่มเดิม").
8. **The LDAP test's 400 (catalog `ldapBindPasswordNeeded`: enter the bind password to test another server) stays a toast** (ST-R8): the test is not a save and its route sends no `fieldErrors` (spec §6.2 does not list it). **Default:** the toast. **Recommendation:** as written; a later server task could name `ldap_bind_password`.
9. **The LDAP switches, the auto-provision checkbox and the default role have no field error** (ST-R4): the UI can only set them to `"true"`/`"false"` or an option id, and their only server rule is the 5000 limit. **Default:** out of the field table (a refusal for one falls back to the toast). **Recommendation:** as written.
10. **The save with nothing changed and LDAP apply before a preview become `aria-disabled` with their reason** (Task 5, spec §4.4, §11 call 2). They stay focusable and read "ยังไม่มีรายการที่เปลี่ยนแปลง" / "ยังไม่มีผลตัวอย่าง …". **Default:** as written. **Recommendation:** as written (plan 2 open issue 16's answer did the same for the batch's gates).
11. **The editor's transfer arrows keep `disabled` while nothing is ticked** (ST-R8): a picker's action, not a submit, and the ticked boxes beside them show why. **Default:** unchanged. **Recommendation:** leave them to the final plan's sweep with the print queue's two buttons.
12. **`fix/asset-partial-save` (`ede37dd0`) is not merged.** It changes `asset-form.tsx`, adds a `NON_VALIDATION_TOASTS` row, swaps four `asset.*` messages and adds tests; none of this plan's edits touches its lines, but every count here is `f1ae1828`'s. **Default:** this plan runs on `f1ae1828` (Task 0 Step 1 stops if `master` moved). **Recommendation:** merge one of the two first and re-count the other's numbers before it runs (the anchors hold; only the test totals, the toast counts and `NON_VALIDATION_TOASTS` move).

13. **A stored value that only a control's own limit refuses stops every save** (Tasks 1, 3, ST-R2; added by the final review). `settingSaveErrors` checks every setting the save sends, changed or not, and `settingControlCode` (running digits 1–12, the LDAP deactivation limit ≥ 0, whole numbers, the 0.5 step of a label's margin and gap) is a client-only rule: the server accepts such values, and before `noValidate` the browser checked them only on the tab on screen, so a save from another tab could have stored, say, running digits 13 or a width of 40.5. After Task 3 that stored value stops a save of any other setting: the page goes to it and asks for a change the person did not come to make (the asset tag's digits change the next asset tags). The server's own rules do not have this problem (the server checks every setting sent too, so such a save fails today as well). Spec §7.4 made the same call for the asset edit form's warranty pair (checked only when one of its dates changed). Task 0 Step 7 records whether the dev data holds such a value; production cannot be checked from here. **Default:** as written (every setting sent is checked). **Recommendation:** check the controls' own limits only on the settings this save changes (the server's rules and the 5000 limit stay on every setting): `settingSaveErrors(entries, prefixRows, changedKeys?)` in Task 1 and `validate(submittedSettings, activePrefixRows, changedSettings)` in Task 3, with a test line each; it changes Tasks 1 and 3 and needs a short re-rehearsal of both, so answer before execution starts.
14. **A save's error on a field that is live is read twice** (Tasks 3, 4, ST-R3; added by the final review). `Field liveError` puts whatever error the field shows into its polite region, and focus then reads the same error through `aria-describedby`. For an error that the live rule showed while typing this is one reading (the region already held it), but where the save or the server sets the error on a live field, the region changes on submit too: the prefix editor's empty prefix (`required` on save; its most common mistake), and in the form the controls' own limits on a live label or document field (a width of 40.5), the 5000 limit, and a refusal naming a live setting. It is the pattern plan 2 shipped for the asset form's tag and serial (a save's `required` through the same `liveError` field), so it is the track's, not this plan's. **Default:** as written; Task 7 Step 7 records it. **Recommendation:** leave it to the final plan, which can give `Field` a live text separate from its error (a foundation change for the asset form, the batch and the settings form at once); the prefix editor alone could avoid it now by passing `liveError` only while the live rule fails, at the cost of the first live error after a save-time `required` not being read.

### Behaviour changes a person would notice beyond the spec

Everything else a person sees change is a decision of the spec (errors under the field, no validation toast, focus with the tab switch, the gates of §4.4). Beyond it:
- A save checks every tab, not only the one shown: a running digit of 13 on the asset-numbering tab, saved from the LDAP tab, is caught and shown (before, the browser checked only the mounted tab and the server took it).
- Fractions in whole-number settings (a label's width, height and QR size, the document running digits) and margins off the 0.5 step say "กรุณากรอกเป็นตัวเลข" under the field on save (open issue 2).
- The automation tab no longer shows the schedule's error; the LDAP sync tab does, under the custom schedule (open issue 3).
- The depreciation policy's link in the change review opens the organization tab (it opened the advanced tab, where the setting is not listed).
- The depreciation JSON's section opens by itself while the JSON is invalid.
- The label name choice is a group with a legend (the same text, a fieldset); its look is the same within a few pixels.
- The prefix editor opens without an error; its save is always pressable and says what is missing; the prefix shows a star.
- The save button is reachable with Tab when nothing changed, and LDAP apply before a preview; both read why they wait.
