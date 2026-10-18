# V Track Plan 2 Implementation Plan: the asset, operation, audit, disposal and maintenance forms

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the second plan of the V track, "errors under the field" (`docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md`, the user's decisions U1–U9), on plan 1's foundation as merged at `e1caa29`. After it:
- every form of the assets, asset operations, audit, disposal and maintenance (spec §5 #1–#33, re-counted at `e1caa29` in each area's inventory) shows its errors under the field, never as a validation toast, focuses the first wrong field on submit, and shows the server's refusals on the same fields (G1–G3, G5; Tasks 1–31);
- the date pairs of spec §7.4 hold: the asset warranty in the asset form (on edit only when one of the two dates changed) and in the batch form (Tasks 1, 2), the audit round start/end (Task 14), the label print queue's created-from/to filter (Task 7), the repair completion date not before the reported date (Task 31);
- the gates of these forms are sorted (spec §4.4): content gates become errors on submit with their buttons enabled; prerequisites keep their gate as `aria-disabled` with a visible reason tied by `aria-describedby`;
- the bugs of spec §5 that sit in these forms are fixed: checkin's return date is checked (Task 10), bulk move's destination (Task 12), the disposal request's asset and requester (Task 21);
- review dialogs and review steps hand a server field error back to the form (spec §4.2: checkout, checkin, transfer, the asset batch; Tasks 8–11, 2), multi-step flows go back to the owning step (component install, disposal batch, bulk execution; Tasks 4, 22, 26), and the audit scan check keeps focus inside its sheet on a phone (Task 19; offline-queued replays as today);
- the asterisk-only selects are checked: `SELECT_STAR_ONLY` reaches 0 (the 14 selects in 10 files it locks at `e1caa29`, plan 1's count of the spec's "15", whose recon list names 14 places), and the two other asterisk-only controls of these forms are fixed too: the disposal request's asset picker gets its error (Task 21, D-R2) and the license total seats lose their asterisk (spec §11 call 8, Task 1); FMG `STAR_ONLY` reaches empty (Tasks 1, 10);
- the disposal execution's evidence domain errors (`DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED` / `_ACK_REQUIRED`) and the bulk execution row codes a dialog field can fix carry `fieldErrors` (the user's answer 4 of 2026-10-17 left this to "the disposal plan"; the recommendation "attach" is taken; Task 20), and the maintenance refusals about the reporter or the vendor name their field (Task 27);
- the user's answers of 2026-10-18 to this plan's open issues ("ตามที่แนะนำ": every recommendation) are built in five more tasks, the addendum (Tasks 31a–31e, R8): checkin's two refusals about a field name it, zod's `.int()` reads as a number error, one money rule with its own sentence, the batch's row-limit gates with a visible reason, and the scan check's waiting save opens its photo section.

No migration, no database write, no schema change, no new dependency, no new server rule (spec §6.3). Not in this plan: the settings form (#45) and the prefix editor (#46) (plan 3), DESIGN.md's form-error rule, docs/14 and `.impeccable/design.json` (the track's final plan), the login form (spec §3).

**Architecture:**
- **Areas in order A, O, U, D, M**, one task per form or small group, each adding its files to `V_FORMS`:
  - **A** assets (Tasks 1–7, A1–A7): the asset form, the batch, the register's bulk update, component install and removal, status correction, the import wizard, label print and the print queue filter. No server change, no shared API.
  - **O** asset operations (Tasks 8–13, O1–O6): `waitForDialogToClose` (FIXED addition 8), then checkout, checkin, transfer, bulk move, the transaction cancel dialog.
  - **U** audit (Tasks 14–19, U1–U6): the round form, the round cancel, mark not found and component missing, the finding dialogs, batch review, the scan check.
  - **D** disposal (Tasks 20–26, D1–D7): the evidence and bulk-row `fieldErrors` (server, D1), then the request, the batch, the decision, the execution, bulk approval, bulk execution; `NON_VALIDATION_TOASTS` (FIXED addition 9).
  - **M** maintenance (Tasks 27–31, M1–M5): the reporter and vendor refusals (server, M1), `step()` (FIXED addition 10, M2), the PM plan form, the repair record form, the repair record dialogs.
  - **The addendum** (Tasks 31a–31e, X-R1–X-R5; the user's answers of 2026-10-18): checkin's two refusals name their field (31a, O7), zod's `.int()` reads `invalidNumber` (31b), one money rule `decimals()` (FIXED 12, 31c), the batch's row-limit gates (31d, A8), the scan check's photo section (31e, U7).
- **One task is one commit**, with its test and every pin or guard edit it causes. The tree is green after every commit.
- **Hard dependencies:** every task needs plan 1 (merged). Inside an area each task needs the one before (each appends to its area's test file; P-R6). Tasks 9–11 need Task 8 (`waitForDialogToClose`). Task 24 (D5) and Task 26 (D7) need Task 20 (D1). Task 22 (D3) needs Task 21 (D2: the test helpers, `NON_VALIDATION_TOASTS`). Tasks 30 and 31 (M4, M5) need Task 21 (they add rows to `NON_VALIDATION_TOASTS`, P-R4). Tasks 29–31 need Task 27 (the keys the server names) and Task 28 (`step`). Task 10 (O3) needs Task 1 (A1) for its FMG edit (P-R3). Across areas nothing else depends: the areas edit disjoint source files (P-R2). The addendum runs after Task 31, each of its tasks after the one before (one test file): 31a needs Task 10, 31c needs Tasks 1, 2, 21–24, 28, 30 and 31 (it edits their money lines and tests), 31d needs Task 2, 31e needs Task 19.
- **Task ids:** every task keeps its area id in its title, its test names and its commit message: "(v-track plan 2 task 10, O3)". The text cross-references by "Task N (id)" or by id. **Ids and plan 1's:** a bare `S-R*`, `F-R*` or `M-R*` is plan 1's ruling (the foundation contract every area cites); plan 2's maintenance rulings are `MT-R*`; `A-R*`, `O-R*`, `U-R*`, `D-R*` are this plan's areas; `P-R*` are this plan's assembly rulings; "plan 1 A-R4", "plan 1 M4" name plan 1's (P-R1).
- **Branch:** `feat/v-track-2` from `master` at `e1caa29`, in the main checkout `D:/Antigravity/asset-system`. No worktree.
- **Tests:** six new LF test files, one test per task (`tests/v-track2-a.test.ts` 7, `-o` 6, `-u` 6, `-d` 7, `-m` 5, and `-x` 5 for the addendum); Task 26 (D7) also deletes one test (`validateHistoricalException`'s, D-R9); Task 33 appends one test to plan 1's `tests/v-track-docs.test.ts`. Existing pins that lock what changes are edited in the same commit (each task's Step 4 lists them).
- **Controller tasks:** Task 0 (branch, baseline, counts, before evidence), Task 32 (verify, production build, dev-app check), Task 34 (final verification, wiki, memory). Task 33 (the docs) is an implementer task; it stops if Task 32's findings file is missing. In Tasks 0 and 32 no request but a GET reaches the server: every other one is aborted, or fulfilled with a stand-in body (the audit scan's always fulfilled, Task 32 Step 5).

**Tech Stack:** Next.js 16.4 App Router · React 19 · Tailwind CSS 4 · next-intl 4 · zod 4.4.1 · Prisma 7 (not changed) · `node --test` with Node 24 type stripping (strip-only: no parameter properties, no enums in modules tests import). No new dependency; `react-hook-form` stays unused (spec §3).

**Spec:** `docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md` (approved by the user, 2026-10-17). **Foundation contract:** `docs/superpowers/plans/2026-10-17-v-track-plan1.md` (merged at `e1caa29`): its Global Constraints, FIXED INTERFACES as amended, and rulings S-R1–S-R13, F-R1–F-R10, M-R1–M-R14 bind every task here, and the real code they shipped is what the tasks build on: `src/lib/field-errors.ts`, `src/lib/field-error-response.ts`, `src/lib/validation-rules.ts`, `src/lib/field-error-client.ts`, `src/lib/field-focus.ts`, `src/components/ui/use-field-errors.ts`, `src/components/ui/field-group.tsx`, `src/components/ui/field.tsx` (`liveError`), `src/components/ui/searchable-select.tsx` (`data-invalid`), `tests/validation-guards.test.ts` (`V_SCOPE`, `NOT_IN_SCOPE`, `V_FORMS`, `SELECT_STAR_ONLY`), and the migrated forms (`c/master-data/brand-form.tsx`, `c/admin/admin-user-form.tsx` are the pattern).
- **What this plan covers:** spec §5 #1–#33, §4.1–§4.5 for them, §7.4 (all of it), §6.2's refusals of these forms, §11 calls 2, 6, 7, 8, and the user's answers of 2026-10-18 to the open issues (the addendum, Tasks 31a–31e). "Spec coverage" near the end maps each section to its task.
- **Left to the builder (§10), decided here:** how each review dialog hands back (O-R1: `waitForDialogToClose`; A-R7, A-R9, D-R3, D-R9: `reveal` back to the step), the per-form focus order (each area's field tables), the split (areas A, O, U, D, M; plan 2 of the track).
- **Line numbers** are of `e1caa29`. No two areas edit the same source file (P-R2), so a source line is still `e1caa29`'s when its task runs unless an earlier task of the same area changed that file; the shared test files (`validation-guards`, `form-migration-guards`, `choice-controls-ui`, `messages/*.json`) are edited only by anchors (P-R3, P-R4). Find every site by its quoted text. The addendum's tasks (31a–31e) quote the chain's lines after Task 31 (`37968225`).

`c/` = `src/components/` · `D/` = `src/app/[locale]/(dashboard)/` · `<temp>` = `C:/Users/Eltross/AppData/Local/Temp/claude/D--Antigravity-asset-system/f250ea8d-3040-422b-ad7a-15dd9aed94b9/scratchpad/v2-plan` (the controller hands the path to every implementer; change files go here; the area edit lists `<temp>/area-A-edits/A<N>.md` are read-only) · `<tools>` = `<temp>/tools` (`eol.mjs`, plan 1's, read-only).

**Rehearsals (done, 2026-10-18).** Each area ran alone from `e1caa29`, one commit per task, every step as written, in its own scratch clone with working-tree line endings matching the real checkout file by file:
- **A** (`<temp>/sim-A`, branch `a-dry`): A1 `b47bbce4` · A2 `1083ddb9` · A3 `5d823f7e` · A4 `c0d16c1c` · A5 `0c8bbafc` · A6 `94744074` · A7 `e511ab3c`.
- **O** (`<temp>/sim-O2`, a fresh `--no-hardlinks` clone of the real checkout, branch `o-replay`): O1 `87269f4` · O2 `3a2f9de` · O3 `bd90d0a` · O4 `f696a3a` · O5 `cb00a19` · O6 `139d08e`.
- **U** (`<temp>/sim-U`, branch `u-dry`): U1 `9507faef` · U2 `60dd57b3` · U3 `caceaae1` · U4 `053148ed` · U5 `7a584979` · U6 `080a0a3b`.
- **D** (`<temp>/sim-D`, branch `d-replay`, identical to the draft branch `d-draft`): D1 `4258a367` · D2 `a737da0e` · D3 `43431528` · D4 `bf1c37eb` · D5 `d8a08eda` · D6 `327954d7` · D7 `b2f2b3eb`.
- **M** (`<temp>/sim-M`, branch `m2-sim`; replayed from this text on `m2-replay-md`, tree-identical): M1 `bc3cffe9` · M2 `92255e3a` · M3 `adad5862` · M4 `73fe4a6a` · M5 `560d1a46`.
- In every area: every Step 2 failed with the test or error it names; every "after Step 3 and before Step 4" list failed exactly as listed; every task ended with `npm test` 0 fail and 1 skipped (+1 per task; D7 +1 −1), `npx tsc --noEmit` clean, `npm run lint` 0 errors and 146 warnings (all under `.agents/`); every edited file kept its line endings; each new test file is LF. Each area's own record is at the end of the area.
- **Assembly check (done, 2026-10-18)** — the 31 rehearsal commits replayed in this plan's order on one chain: `<temp>/sim-A/asm-wt` (a worktree of `sim-A`, branch `asm`, from `e1caa29`), each area's commits cherry-picked in order; the only conflicts were in `tests/validation-guards.test.ts` and `tests/form-migration-guards.test.ts`, and each was resolved exactly as P-R3 and P-R4 say (scripts `<temp>/asm/resolve-auto.mjs`, `resolve-m4.mjs`, `resolve-m5.mjs`). Chain commits: 1 `b47bbce4` … 7 `e511ab3c` · 8 `56fce8f1` · 9 `7212a925` · 10 `40e9eece` · 11 `0150ae96` · 12 `eb3ffb64` · 13 `5985cc07` · 14 `c478a920` · 15 `10c237ba` · 16 `1f13f8ff` · 17 `de991007` · 18 `8b7647d6` · 19 `1939467b` · 20 `8f17b911` · 21 `f70cc4a5` · 22 `f6756d8a` · 23 `0c577ac1` · 24 `31f77d9a` · 25 `15a51c40` · 26 `6b0c12b7` · 27 `a4397b57` · 28 `42b23aa2` · 29 `ba4ab9f7` · 30 `95c5255c` · 31 `aa211771`. End state: `npm test` **2286 tests, 2285 pass, 0 fail, 1 skipped** (base 2256 + 30); `tsc --noEmit` clean; `eslint src tests` clean; messages **4091** leaf keys per locale (th and en); `V_FORMS` **43** files (= `V_SCOPE`'s 44 minus `admin/system-settings-form.tsx`, plan 3); `<form … noValidate>` in `src` **46**; `SELECT_STAR_ONLY` **0**; FMG `STAR_ONLY` `new Set<string>([])`; toasts outside a catch in `src` 34 in 11 files (61 in 19 at `e1caa29`); `NON_VALIDATION_TOASTS` 4 rows. The guard and FMG test files ran green after every resolved conflict (`node --test tests/validation-guards.test.ts tests/form-migration-guards.test.ts`: 30 tests, 0 fail after Task 31). Not replayed on the chain step by step: each task's own Step 2 (each area's rehearsal checked it; no task's test reads another area's file).
- **What the assembly changed in the area texts** (P-R1–P-R10): task numbers, commit messages and chain counts; Task 30 and Task 31 (M4, M5) add `NON_VALIDATION_TOASTS` rows instead of creating `RESULT_TOASTS` (P-R4); the FMG `STAR_ONLY` case each of Tasks 1 and 10 takes (P-R3); area M's rulings renamed `MT-R*` with the three source and test comments that name them (P-R1); area D's `<temp>` paths unified (P-R7); the area rulings moved into "Rulings of this plan"; the open issues merged (P-R9).
- **Environment note for any further rehearsal:** the shared clone `<temp>/../v-sim` holds two pack files without an index; a fresh clone of it fails on commit with "invalid object … Error building trees". `git fetch -q --refetch D:/Antigravity/asset-system master` in the clone (a read of the real checkout) repairs it; a fresh `git clone --no-hardlinks D:/Antigravity/asset-system` avoids it.

**Dry run (done, 2026-10-18).** The whole plan was replayed task by task as an implementer would follow it, from this text and the Global Constraints only, in `<temp>/../v-sim` (branch `v2-dry` from `v2-base` = `e1caa29`; `core.autocrlf=true`; its own `node_modules`). Before the first task: `git fetch -q --refetch D:/Antigravity/asset-system master` in the clone (the environment note above) and the three files that are `w/lf` in the real checkout but came out CRLF in the clone (`tests/assets-sweep-ui.test.ts`, `tests/operations-sweep-ui.test.ts`, `docs/superpowers/plans/2026-10-16-ui-phase2d-plan4.md`) set back to LF (no content change), so every working-tree line ending matched `D:/Antigravity/asset-system` file by file.
- **Per task:** the Step 1 block appended byte for byte; Step 2 run (every task failed with the test and message it names; every "after Step 3 and before Step 4" list failed exactly as listed); Step 3 applied from the text (the area A edit lists, the area O and M printed edits, and for areas U and D the Changes tables written out by hand); the Step 4 pins and guard anchors as written; Step 5 (`npm test`, `npx tsc --noEmit`, `npm run lint`) and the `eol.mjs` numbers; one commit with the Step 6 message. Sim commits: 1 `4ebea50e` · 2 `89fcdf35` · 3 `60a5f285` · 4 `1aea1c11` · 5 `8cc0ffe4` · 6 `d85baff5` · 7 `9e410c95` · 8 `d53bb5ef` · 9 `68df4430` · 10 `8091d773` · 11 `6a54964a` · 12 `d45f74f8` · 13 `28a24bc4` · 14 `7bf81753` · 15 `d4d2e51e` · 16 `5ac0f491` · 17 `60701522` · 18 `a713c1ee` · 19 `5756458f` · 20 `e96ef206` · 21 `d2229906` · 22 `bd1bcc30` · 23 `5e3087ae` · 24 `5a10299b` · 25 `1862fd8f` · 26 `bce01f89` · 27 `612084e9` · 28 `1c3b81d5` · 29 `48b1aec0` · 30 `dcc1f203` · 31 `37968225`.
- **Results:** every task ended at the count of P-R5 (2257 … 2281, 2281 after Task 26, 2282 … 2286), 0 fail, 1 skipped; `tsc` clean; lint 0 errors and 146 warnings (all under `.agents/`); every eol number of every Step 5 as printed; every edited file kept its working-tree endings (the mixed files stayed mixed: exact-string edits). End state: `npm test` **2286 tests, 2285 pass, 0 fail, 1 skipped**; `counts.mts`: toasts outside a catch 34 in 11 files, `<form … noValidate>` 46, 4091 leaf keys per locale, `V_FORMS` 43, `SELECT_STAR_ONLY` 0 in 0, FMG `STAR_ONLY` `new Set<string>([])`. Each task's tree was compared with the assembly chain's commit: identical for Tasks 1–19, 23 and 25; for Tasks 20, 21, 22, 24 and 26 different only in comments and line wrapping the text did not print (now printed, below; the sim then took the rehearsed text, so each later task compared cleanly); for Tasks 27–31 different only in the three comments P-R1 renames (`M-R1`/`M-R5` → `MT-R1`/`MT-R5`: the chain predates that rename, the text has it).
- **What the dry run corrected in this text:** Task 20 prints `getDisposalBulkExecutionFieldErrors` exactly (a one-line ternary gave `23 0`, not Step 5's `25 0`); Task 21 and Task 22 quote the `shownFields` / `validate` comments the tables named without text; Task 24 replaces "comments as the source shows" (source an implementer cannot see) with the three rehearsed comments; Task 26 spells out `shownFields`'s per-step filter, the one-line signatures, the two comments and the end of `handleSubmit`; Task 10's `STAR_ONLY` edit is one exact old → new (P-R3 leaves out the other case; area O's shared-file note says so); the Global Constraints' CRLF count is 65 files in Tasks 1–31 (68 with Task 33's three: the two docs and `tests/v-track-docs.test.ts`, which Task 33 appends to); Tasks 32–34 carry measured counts instead of their count placeholders (the build's 60/60 pages is plan 1's verify at `e1caa29`; plan 2 adds no route, and the dry run did not build). Every eol label of the plan was checked against `git ls-files --eol` of the real checkout (173 labelled paths; all correct).
- **Not covered by the dry run:** the hook running in React with Radix (no dev server, no browser) and the production build; Task 32 covers both.
- **Docs rehearsal (Task 33, 2026-10-18):** Task 33 as written below, on `v2-dry` after Task 31 (`37968225`), with a placeholder `task-32-findings.md` and one-sentence placeholder text in each marker: commit `c4146a35` (C1, `<today>` 2026-10-18); C1b (`<today>` 2026-10-19, H1 too) in the working tree, then restored. Every Step 2, "after Step 3" and Step 5 number of Task 33 is what it printed (`npm test` 2287 tests, 2286 pass, 0 fail, 1 skipped; `tsc` clean; lint 0 errors, 146 warnings). Task 34 Step 1's two verify lines were inserted on that commit and restored (`1 0` each). Task 32 and the rest of Task 34 run the app, the vault and the memory, so they were not rehearsed. While writing Task 32 the dry run found that an aborted audit scan request is kept in the browser's offline queue and sent again later (a write after the check): Task 0 Step 6 and Task 32 Step 5 fulfil that route instead of aborting it, and both clean the queue at the end.
- **Final review (2026-10-18), text only, no task's code or numbers changed:** "Spec coverage" maps each of #1–#33 by name to its task; open issues 15 (the purchase document number's duplicate, which plan 1 handed to this plan, stays a toast; a post-save bug found in passing) and 16 (recon-3 gates left as plain `disabled`) added; Task 0 Step 6 routes the browser context and proves the interception with Task 32's probe; Review Focus 1 names the stand-in body Task 32 uses and Review Focus 2 lists Tasks 3 and 23; the asterisk count in the goal follows plan 1's (14 selects locked, plus the disposal picker and the license seats); two money behaviour changes listed (open issue 3).

**Addendum (2026-10-18).** The user answered the open issues with "ตามที่แนะนำ" (every recommendation). The five answers that change code are Tasks 31a–31e, after Task 31 and before Task 32, so no task number moves (R8, X-R1–X-R5; "Addendum" after area M). Rehearsed in `<temp>/../v-sim` on branch `v2-add` from `37968225` (the dry run's Task 31), one commit per task, every step as an implementer follows this text: 31a `6ef98430` · 31b `0d440c83` · 31c `97ad82af` · 31d `3b5c278c` · 31e `fbda71b9`; then Task 33 again on top, `ae8ed79a`.
- Before the first task the working-tree endings were set back to the real checkout's file by file (the branch switch had written 18 files as CRLF: the 9 LF tests, the 5 plan-2 test files and the 4 mixed files; `<temp>/add/fix-eol.mjs`, no content change), and the base gave `npm test` 2286 / 2285 / 0 / 1, `tsc` clean, lint 0 errors and 146 warnings.
- Every Step 2 failed with the test and message it names; every "after Step 3 and before Step 4" list failed exactly as listed (31c: 9 tests; 31d, 31e: 1 each); every task ended at `npm test` 2287 … 2291, 0 fail, 1 skipped, `tsc` clean, lint 0 errors and 146 warnings; every edited file kept its working-tree endings; `tests/v-track2-x.test.ts` is LF. Task 33 then gave 2292.
- The text of Tasks 31a–31e (their exact edits, pin edits, change files and Step 1 blocks) was read back by a parser and applied in order to `37968225`'s files: after each task every file it touches equals that task's `v2-add` commit (`<temp>/add/replay.mjs`).
- Tasks 32–34 carry the addendum's counts (2291 after Task 31e, 2292 after Task 33; 4093 leaf keys per locale); Task 33's two answer markers are now the user's answers, written out.

**Base:** `master` at `e1caa29` (V track plan 1 merged and pushed; phase 2D and Dark Mode merged; nothing deployed).

## Global Constraints

- **Git:**
  - Work in the main checkout `D:/Antigravity/asset-system` on branch `feat/v-track-2`, which holds `e1caa29` and this plan's commit (`docs/superpowers/plans/2026-10-18-v-track-plan2.md`).
  - Never run `git checkout`, `git switch`, `git reset`, `git stash`, `git rebase` or `git clean`, never touch `master`, never push. (A `git stash` in a rehearsal rewrote an LF test file as CRLF.)
  - Commit only the files your task names. Use `git add <paths>` (quote paths with brackets or parentheses) and never a bare `git add -A` or `git add .`; `git rm <paths>` stages a deletion; never name a path `git rm` removed in a later `git add`.
  - The checkout has untracked folders and files that are not yours: `.codex/`, `.impeccable/config.json`, `.impeccable/critique/`, `.playwright-mcp/`, `.superpowers/brainstorm/` and `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`; another session may add `.claude/` while its preview server runs. Leave them alone.
  - End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (each Step 6 passes it as a second `-m`).
  - Never create a git worktree whose `node_modules` is a junction to the main checkout's, and never let git remove one.
- **Next.js 16.4** is not the Next.js in your training data. This plan uses no new Next API; the server tasks (20, 27, 31a) keep answering with `NextResponse.json(body, { status })` through the existing helpers. Before you change how a route answers, read `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/next-response.md` (`## json()`) and `03-file-conventions/route.md`, and heed their deprecation notices.
- **Repo facts:** React 19; Tailwind 4; next-intl 4 (`t.has(key)`); zod 4.4.1; Prisma 7; `npm test` runs `node scripts/run-tests.mjs` over `tests/**/*.test.{ts,mjs,js}`; tests import `.ts` with relative imports and read `.tsx` as text; `tsconfig.json` includes `**/*.ts`, so tests are type-checked.
- **Line endings** (`git ls-files --eol` in the real checkout at `e1caa29`; `git config core.autocrlf` is `true`):
  - **LF (`i/lf w/lf`)**, 9 existing files: `tests/asset-form-sticky-actions.test.ts`, `tests/asset-handover-checkin.test.ts`, `tests/asset-handover-checkout.test.ts`, `tests/assets-sweep-ui.test.ts`, `tests/audit-pages-sweep-ui.test.ts`, `tests/button-size-switch.test.ts`, `tests/maintenance-sweep-ui.test.ts`, `tests/operations-sweep-ui.test.ts`, `tests/sticky-form-footer-ui.test.ts`.
  - **Mixed (`w/mixed`)**, 4 files: `src/lib/disposal-bulk-execution.ts`, `src/lib/disposal-bulk-execution-service.ts`, `src/lib/disposal-bulk-execution-ui.ts`, `tests/disposal-bulk-execution-ui-state.test.ts`. Edit them by exact strings; the Edit tool may rewrite a mixed file as all CRLF (Task 20's rehearsal did): git stores LF either way and `git diff --numstat` shows only the task's lines. Never normalize a file on purpose.
  - **CRLF (`i/lf w/crlf`)**: every other existing file this plan edits (65 in Tasks 1–31; 67 with Tasks 31a–31e, which add `src/app/api/assets/[id]/checkin/route.ts` and `src/lib/field-errors.ts`; 70 with Task 33's three: `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md`, `tests/v-track-docs.test.ts`), among them `messages/th.json`, `messages/en.json`, `src/lib/field-focus.ts`, `src/lib/validation-rules.ts`, `src/app/api/disposal-requests/[id]/route.ts` (CRLF at `e1caa29`; plan 1 called it mixed), every component file of the five areas, `src/app/[locale]/(dashboard)/disposal/page.tsx`, `tests/validation-guards.test.ts`, `tests/form-migration-guards.test.ts`, `tests/choice-controls-ui.test.ts`, `tests/v-track-f.test.ts`.
  - **New and LF:** `tests/v-track2-a.test.ts`, `tests/v-track2-o.test.ts`, `tests/v-track2-u.test.ts`, `tests/v-track2-d.test.ts`, `tests/v-track2-m.test.ts`, `tests/v-track2-x.test.ts` (Tasks 31a–31e).
  - Before you edit a file, run `git ls-files --eol <file>` and keep what it shows; each task's Files line says the same. In Git Bash, `grep -c $'\r'` reports 0 even for CRLF files: do not use it as a check. `git add` of an LF working-tree file prints "LF will be replaced by CRLF the next time Git touches it": expected and harmless; do not renormalize.
  - Keep each file's line endings: edit with exact-string replacement (the Edit tool keeps them), never a formatter, never `sed -i` (it writes LF in Git Bash).
  - **Never write a test that asserts working-tree line endings.** Tests that read source files strip `\r` before multi-line regexes.
  - Check line endings with `node <tools>/eol.mjs <file>…`: a CRLF file prints the same number twice; an LF file prints 0 and then its line count. A line count a step gives for a shared file (`messages/*.json`, the two guards, `tests/choice-controls-ui.test.ts`) is this plan's chain (P-R5 holds the table); what matters is that the file keeps its endings.
- **How to read a task** (as in plan 1):
  - **Changes at e1caa29** is a table of the sites: the line, what is there now (quoted as it is, LF shown), what it becomes, and the rule. "Becomes" is exact where a test pins it and an exact description otherwise; every prop and class the row does not name stays. Rows may be applied in any order. Where a task points to an exact edit list (area A's `<temp>/area-A-edits/A<N>.md`; area M prints its edits inline), that list is the rehearsed text: applied in order, each old text once in the file, it gives the rehearsal commit byte for byte.
  - **Step 1 code blocks are exact:** create or append them byte for byte. "Append" adds the block at the end of the file; the first line of a block shown empty is the blank line before it. Blocks with regex backslashes are written with a file tool, never a shell heredoc or `node -e`.
  - **Pin edits and guard edits** are exact old → new strings; each old string occurs once in its file (where a step names an occurrence "inside `SELECT_STAR_ONLY`", include that block's opening line or a row next to it that is still there as context, P-R3).
  - **A comment a row adds is source the tests read.** It must not contain a string a task's `doesNotMatch` forbids (two rehearsals tripped on a comment that named a form element in angle brackets: write "a form element").
  - **Counts.** Each task's `npm test` numbers are the full totals after the task on this plan's chain (P-R5). A total that differs means stop and report, with the task's own delta (+1 for every task but Task 26, which is +1 −1). Each `0 <number>` of an LF file is its line count in the rehearsal.
- **Tests:**
  - Run one file with `node --test tests/<file>.test.ts`.
  - Modules that tests import use relative `.ts` imports (no `@/`). Tests cannot import `.tsx`; they read it as text. A plain import of a type name fails under type stripping: use inline `type` specifiers. A class in such a module declares its fields in the class body (strip-only mode refuses parameter properties).
  - **A test file that imports another test file runs that file's tests again: no test imports a test file.** Each area's test file declares its own helpers (P-R6).
- **Baseline at `e1caa29`** (Task 0 checks it again): `npm test` 2256 tests, 2255 pass, 0 fail, 1 skipped; `npx tsc --noEmit` clean; `npm run lint` 0 errors, 146 warnings, all under `.agents/`.
- **Every task ends with all of these green:** `npm test` with 0 fail and the task's count; `npx tsc --noEmit`; `npm run lint` with 0 errors and no new warning in `src/` or `tests/`. Report any failure by name.
- **Messages:** only through `node scripts/messages-edit.mjs <change file>` (`{"set":{"th":{...},"en":{...}},"delete":[...]}`), with the change files saved in `<temp>`, and only these keys (4092 → 4093 leaf keys per locale, P-R5):
  - Task 1 (A1) adds `asset.duplicateCheckPending`, deletes `asset.licenseSeatUsageInvalid`, `asset.customFieldRequired`; Task 2 (A2) adds `asset.batchRowDuplicate`, deletes `asset.duplicateWarning`;
  - Task 9 (O2) deletes `checkout.reviewIncomplete`; Task 10 (O3) deletes three `checkin.*` keys (its change file names them); Task 11 (O4) deletes `transfer.destinationRequired`;
  - Task 17 (U4) adds `auditFinding.closeNeedsEvidence`; Task 18 (U5) adds `auditFinding.batchNeedsSelection`;
  - Task 22 (D3) adds `disposalPage.batchNeedsAssets`; Task 26 (D7) adds `disposalPage.bulkExecutionPermanentConfirmationRequired`;
  - Task 31 (M5) adds `repairRecord.returnDateBeforeReported`.
  - Task 31c adds `common.validation.tooManyDecimals`; Task 31d adds `asset.batchRowLimits`.
  - Words follow `docs/19_THAI_GLOSSARY.md`; `tests/thai-glossary.test.ts`, `tests/messages-parity.test.ts` and `tests/messages-edit.test.ts` stay green. If you think another key is missing, stop and report.
- **The form convention** (plan 1 FIXED 6, M-R1–M-R5): `<form onSubmit={…} noValidate …>` with `noValidate` directly after `onSubmit`; the HTML constraint attributes stay (FMG `CONSTRAINT_FLOORS`; a floor may rise, Task 10); a module-level `validate()` restates them through the rule helpers; errors go under the field through `Field error=` (a group: one `FieldError` or `FieldGroup error=`); `focusFirst` on the client's errors and `if (<hook>.applyServer(<body>) && <focus>()) return` on the server's, then today's handling for every other refusal (spec §4.1.3); no `toast.error`/`toast.warning` for a validation error (a catch keeps its toast for other failures, spec U2; a non-validation toast outside a catch only through a `NON_VALIDATION_TOASTS` row, P-R4); never `role="alert"` or `aria-live="assertive"` on a field error (F-R6); never `aria-invalid` on a `<button>` (F-R7). Prerequisite gates: `aria-disabled` plus `aria-describedby` to a visible reason, the handler returns first (plan 1 M-R10); inside an `AccessibleDialog` the reason is the body's last line, never in the footer (FMG GD3, U-R9).
- **Guards:** `tests/form-migration-guards.test.ts` (FMG), `tests/visual-foundation-guards.test.ts` (VFG), `tests/list-frame-guards.test.ts` (LFG), `tests/ui-overlay-guards.test.ts`, `tests/validation-guards.test.ts` (V1–V5).
  - A commit that changes what a guard or pin counts edits it in the same commit.
  - The only guard rows this plan adds are the `V_FORMS` rows of the form tasks and the four `NON_VALIDATION_TOASTS` rows (Tasks 21, 22, 30, 31, each with its reason and ruling); it deletes every `SELECT_STAR_ONLY` row and every FMG `STAR_ONLY` entry, and raises one `CONSTRAINT_FLOORS` floor (checkin `required` 4 → 5, Task 10). No task adds an `EXEMPT` row, an owner, a `V_SCOPE` or `NOT_IN_SCOPE` row. Never add a row to make a test pass. If a change would make a guard fail and the task does not list that edit, stop and report.
- **The server:** no migration, no database write, no schema change, no new dependency, no new server rule (spec §6.3). Task 20 (D1), Task 27 (M1) and Task 31a only add `fieldErrors` to refusals that exist (status codes and messages stay; the bulk execution response stays a 200 and gains `fieldErrors` only when a blocked row names a dialog field); Task 31b changes only how one zod issue maps (`expected: "int"` → `invalidNumber`). Integration v1 does not change.
- **Off limits:**
  - Never open, read or print `.env` or `.env.prod-admin`.
  - Implementers do not run `npm ci`, `npm install`, `npm run build`, the dev server, or anything against a database. The controller runs the app in Tasks 0 and 32 and writes nothing to the database there.
  - Never submit a real checkout or checkin with a photo or a signature, even an invalid one: both routes save the evidence files **before** they parse the input (`parseCheckoutRequest`, `parseCheckinRequest`), so a refused request still writes files (area O review notes).
  - Do not run skill helper scripts; they make network calls. The scripts in `<tools>` are read-only and run with the repo root as the working directory.
  - Keep helper scripts and change files in `<temp>`, outside the repo.
  - In Git Bash, MSYS rewrites a command-line argument that looks like a path: set `MSYS_NO_PATHCONV=1` for such a call. The Edit tool does not have this problem.
- **Deploy:** none. One deploy after Dark Mode, the whole V track and the E2E suite (wiki item 27).
- **Executors** are Opus-medium subagents that see only their task brief and these Global Constraints; the controller reviews every task before the next starts.

### The shared contract (plan 1's FIXED INTERFACES, verbatim)

Copied from plan 1 without a change: inside this block, "this plan" and "area F" / "area S" mean plan 1 and its areas. FIXED 8–11 below are this plan's additions.

Every area uses exactly these; they are not renamed. Where this plan amends one, the amended form below is what the tasks write.

1. src/lib/field-errors.ts (new, LF, no "@/" imports, importable by tests and by client code; no zod runtime import — structural types only):
   export const FORM_ERROR_KEY = "_form"
   export type FieldErrorCode = "required" | "tooShort" | "tooLong" | "outOfRange" | "invalidDate" | "invalidNumber" | "invalidEmail" | "invalidFormat" | "invalidChoice" | "duplicate" | "invalid"
   export type FieldErrors = Record<string, string>   // value: a FieldErrorCode or an api-error catalog key (e.g. "endBeforeStart")
   export type IssueLike = { code: string; path: readonly PropertyKey[]; message: string; minimum?: unknown; maximum?: unknown; origin?: string; format?: string; expected?: string; input?: unknown }
   export function fieldErrorKey(path: readonly PropertyKey[]): string   // dotted path; "" path -> FORM_ERROR_KEY
   export function issueToFieldErrorCode(issue: IssueLike): string       // spec §6.1 map; custom -> catalog key via getApiErrorKey, else "invalid"
   export function issuesToFieldErrors(issues: readonly IssueLike[], keyFor?: (path: readonly PropertyKey[]) => string | null): FieldErrors   // first issue per key wins
   (If getApiErrorKey lives in a module that cannot be imported here without "@/", area S decides how field-errors.ts reaches it and records the ruling.)
2. Server body: validationFailedBody(error) returns { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors } (status 400 unchanged). A helper for non-zod field refusals in src/lib/api-response.ts or a new src/lib/field-error-response.ts: fieldErrorResponse(input: { status: number; error: string; fieldErrors: FieldErrors; code?: string }) -> NextResponse; and uniqueConflictResponse(field: string, error: string) -> 409 { error, code: "DUPLICATE", fieldErrors: { [field]: "duplicate" } } plus isPrismaUniqueConstraintError(error) moved to a shared module.
3. Client hook src/components/ui/use-field-errors.ts ("use client"):
   export function useFieldErrors<K extends string = string>(): {
     errors: Partial<Record<K | "_form", string>>      // codes
     setErrors(next: Partial<Record<K | "_form", string>>): void
     applyServer(payload: unknown): boolean            // reads payload.fieldErrors; returns true if any key is in the form's keys (the caller passes keys via focusFirst order) — area F decides the exact contract and records it
     clear(...keys: K[]): void
     message(key: K | "_form"): string | undefined     // resolved text via useValidationMessage
     focusFirst(order: readonly K[], options?: { idFor?: (key: K) => string; reveal?: (key: K) => void | Promise<void> }): boolean
   }
   and export function useValidationMessage(): (code: string, params?: Record<string, string | number>) => string   // common.validation.* first, then the api-error catalog messages, then common.validation.invalid
4. Rule helpers src/lib/validation-rules.ts (new, LF, pure, importable by tests): required(value), minLength(value, n), maxLength(value, n), range(value, min, max), email(value), pattern(value, re), notBefore(end, start), atLeastOne(values) — each returns a FieldErrorCode or null.
5. Messages: common.validation.required / tooShort / tooLong / outOfRange / invalidDate / invalidNumber / invalidEmail / invalidFormat / invalidChoice / duplicate / endBeforeStart / invalid (th and en; tooShort {min}, tooLong {max}, outOfRange {min} {max} as next-intl params; a message without params when the form gives none — area F decides wording within the glossary).
6. Forms: <form onSubmit={handleSubmit} noValidate …> (noValidate directly after onSubmit); HTML constraint attributes stay; validate() declared per form returning Partial<Record<Key, string>>; errors passed to Field error={…message(key)} (and SearchableSelect error=); stable field ids via Field id= where focus needs them (prefix with the form name, like supplier's "supplier-code").
7. New guard file tests/validation-guards.test.ts (area F): V_FORMS list (files migrated so far, grows per form task) — each must contain "noValidate" and "validate(" and no toast.error/toast.warning outside a catch block (area F defines the detection); plus FMG STAR_ONLY shrinks as asterisk-only selects get error=.

**As amended by this plan:**
- 1: `IssueLike` gains `received?: unknown` (S-R1); `field-errors.ts` reaches `getApiErrorKey` through `./api-error-catalog.ts`, which imports nothing (S-R1); `keyFor` returning `null` keeps the dotted path, never drops the issue (S-R3); the module also holds `FieldRefusalError` (S-R6) and `settingFieldKeyFor` (S-R4).
- 2: `validationFailedBody(error, keyFor?)` (S-R3); `fieldErrorResponse` and `uniqueConflictResponse` live in the new `src/lib/field-error-response.ts`; `isPrismaUniqueConstraintError` stays in `src/lib/prisma-unique-retry.ts` (already shared) and is re-exported there (S-R5); one body shape `{ error, code?, fieldErrors }`, existing `code`/`id` kept (S-R9).
- 3: `useFieldErrors<K>(options?: { params?: Partial<Record<K, ValidationParams>> })` (F-R4; the no-argument call still works); `applyServer(payload)` is true when the body names any key, and its errors replace the form's; the caller writes `if (applyServer(p) && focusFirst(ORDER, …)) return`, so a refusal that names no shown field falls through to today's form-level message (F-R4, spec §4.1.3); the pure half is `src/lib/field-error-client.ts` (F-R3).
- 4: each helper returns `RuleCode = FieldErrorCode | "endBeforeStart"`; `required` counts `false` and `[]` as missing; every helper but `required` leaves an empty value alone; `atLeastOne` is `"required"` unless one value passes `required` (F-R1).
- 5: 17 keys: the 12 above plus `tooShortPlain`, `tooLongPlain`, `outOfRangeMin`, `outOfRangeMax`, `outOfRangePlain`, because a server code carries no limits (F-R2).
- 6: `noValidate` directly after `onSubmit`, wherever `onSubmit` sits (F-R9); every form declares `FIELD_IDS` in visual order (M-R1); the two button-only forms become `<form>`s (M-R12).
- 7: `V_SCOPE` (51 forms in 44 files), `NOT_IN_SCOPE` (2), `V_FORMS` (empty at Task 18), `SELECT_STAR_ONLY` (14 in 10 files), rules V1–V5; "outside a catch" is outside a `catch` block and outside a `.catch(…)` argument (F-R9). FMG's `STAR_ONLY` does not shrink in plan 1: its three entries are in later-plan forms (A-R11).

### FIXED additions of this plan

Numbered after plan 1's seven; every task uses them by these names.

8. **`waitForDialogToClose(frames = 60): Promise<void>`** in `src/lib/field-focus.ts` (Task 8, O1; area O's "O-F1"; appended at the end of the file): resolves after the dialog that holds focus when it is called (`document.activeElement?.closest('[role="dialog"]')`) has left the page and one more task has run; at once when focus is in no `[role="dialog"]`; after `frames` frames at most. A form whose submit can be refused while its own review dialog is open passes `reveal: leaveReview` to `focusFirst`, with `async function leaveReview() { const closed = waitForDialogToClose(); setReviewOpen(false); await closed }` (O-R1). `OperationReviewDialog` and `AccessibleDialog` do not change.
9. **`NON_VALIDATION_TOASTS`** in `tests/validation-guards.test.ts` (Task 21, D2; D-R5; the allowance list plan 1 F-R9 left to the later plans): `Readonly<Record<string, { count: number; why: string; ruling: string }>>`, declared directly above `const SELECT_TAGS = [`. V3 compares each `V_FORMS` file's toasts outside a catch with its row's exact `count` (default 0) and fails a row whose file is not in `V_FORMS`. Only a toast that is not about a field goes in (the upload results of a saved record); a count that drops lowers or deletes its row. Rows: `disposal-request-form.tsx` (Task 21), `disposal-batch-form.tsx` (Task 22), `repair-record-form.tsx` (Task 30), `repair-record-actions.tsx` (Task 31). Every later row is inserted directly after the list's opening line (P-R4).
10. **`step(value, size)`** in `src/lib/validation-rules.ts` (Task 28, M2; MT-R2; an addition to FIXED 4): empty → `null` (left to `required`); not a finite number → `"invalidNumber"`; else `"invalidNumber"` unless `value / size` is within 1e-6 of a whole number. It counts from 0. A money field writes `range(v, 0) ?? step(v, 0.01)`, whole days `range(v, 1, 3650) ?? step(v, 1)`. In this plan only area M uses it (P-R8); from Task 31c a money field writes `range(v, 0) ?? decimals(v, 2)` instead (FIXED 12), and `step` is left to whole numbers (the PM days).
11. **`getDisposalEvidenceFieldErrors(code, input)`** (`src/lib/disposal-evidence-exception.ts`) and **`getDisposalBulkExecutionFieldErrors(items, input)`** (`src/lib/disposal-bulk-execution.ts`) (Task 20, D1; D-R1): pure, the shared codes (`required`, `tooShort`, `tooLong`) and the catalog key `recipientRequired`; `undefined` when no field is named.

12. **`decimals(value, places)`** in `src/lib/validation-rules.ts` (Task 31c; X-R3; an addition to FIXED 4): empty → `null` (left to `required`); not a finite number → `"invalidNumber"`; else `"tooManyDecimals"` when the typed digits after the point, trailing zeros left out, are more than `places` (exponent notation is counted from the number). `RuleCode` becomes `FieldErrorCode | "endBeforeStart" | "tooManyDecimals"`; the message is `common.validation.tooManyDecimals` (th "กรอกทศนิยมได้ไม่เกิน 2 ตำแหน่ง", en "Use no more than 2 decimal places"). A money field writes `range(v, 0) ?? decimals(v, 2)`; the server never sends the code.

No other shared API changes. Every other new name is local to its form file (A-R1, U-R3, U-R6).

## Rulings of this plan

- **R1, the earlier rulings apply:** plan 1's S-R*, F-R*, M-R* and its FIXED INTERFACES as amended; spec 2C K4, K5 a, K6 a; plan 2D-5's guard vocabulary; Dark Mode's two-theme rule (every new style uses tokens; the error look and the teal focus work in both themes). Each area's rulings follow under the ids its tasks quote; R7 records the assembly decisions (`P-R1` …); R8 the addendum's (`X-R1` …).

- **R2, area A (assets, Tasks 1–7):**

  - **A-R1 Plan 1's form pattern holds (M-R1–M-R5, M-R8–M-R12).** Each form declares its field table at module level in visual order (`FIELD_IDS`, or a named table where a file holds more than one form: `COMMON_FIELD_IDS`, `BULK_FIELD_IDS`, `INSTALL_FIELD_IDS`), keyed like the server's `fieldErrors`, a module-level `validate()` built with `check(...)` lines, the hook, `focusFirst` on the client's errors and `if (<hook>.applyServer(<body>) && <focus>()) return` on the server's, then today's throw/toast for every other refusal (spec §4.1.3). The hook's local name follows the form where a file holds another form or hook (`bulkErrors`, `installErrors`, `removeErrors`). A key the server can name but no client rule checks (a date the server finds invalid) is in the table, so its error has a field to land on (M-R1).
  - **A-R2 Domain messages (spec §7.1).** A rule whose toast had its own asset message keeps it: `validate()` returns the message key as its code (`componentParentRequired`, `componentRoleRequired`, `licenseResponsibilityRequired`, `purchaseDocumentNoRequired`, `fileRequired`, `customFieldsJsonInvalid`), and the form reads it with `t(code)` through a local `isAssetMessageCode` (asset form) or one comparison (batch); every other code reads the hook's `message(key)`. A rule that the server also has uses the server's code, so both sides say one thing: the seats `licenseSeatsExceeded` and the bulk update `bulkUpdateFieldRequired` (catalog keys). A template's required custom field says `required` under itself (the old toast named the field because a toast has no field). Messages that lose their last reader go: `asset.licenseSeatUsageInvalid`, `asset.customFieldRequired` (A1), `asset.duplicateWarning` (A2). Two new ones: `asset.duplicateCheckPending` (A1, A-R3) and `asset.batchRowDuplicate` (A2, A-R7).
  - **A-R3 The asset form's gates (spec §4.4, §11 call 2).** A protected status change (recon §2: a prerequisite with its warning already under the status) and a running duplicate check are prerequisites: `saveBlockedBy` names the reason's id (`asset-status-protected` on the existing warning Notice, `asset-save-reason` on a new status line of the sticky footer, `asset.duplicateCheckPending`), the save is `aria-disabled` with `aria-describedby`, and `handleSubmit` returns first. A duplicate tag or serial is a content error: the live check keeps its line under the field (U8, `liveError`), `validate()` puts `duplicate` on the field so the save focuses it, and the `Field` shows the live line when it is there, else the hook's message (one line, nothing twice). The catch's toast for the server's protected-status refusal stays (it is not a field error).
  - **A-R4 The license and the warranty pair (spec §7.4, §11 calls 6 and 8).** Total seats lose their star (the server lets them be empty); FMG `STAR_ONLY` drops `asset-form.tsx|t("licenseTotalSeats")` (stale once the star goes) and `asset-form.tsx|t("componentRole")` (its form is a V form from A1, so GF4's `vTrack` rule covers its star; spec §8 "STAR_ONLY shrinks to empty in this round"). Seats restate `min="0"` (`range`) and `step="1"` (`pattern(…, /\d+/)`, `invalidFormat`), because the server's `int()` refuses a fraction; used > total says the server's `licenseSeatsExceeded` under the used seats. The license's "assignee or department" is one group with its error under the assignee (`custodianId`); a department change clears it. The warranty end is `notBefore` the start, with `min`/`max` on the two inputs; on the asset edit it is checked only when one of the two dates changed (`original` = the stored asset), on create and in the batch always. Money keeps `min="0"` (`range`), not `step="0.01"`: the server takes any precision (`optionalMoney`), so the client does not refuse what the server accepts. (Superseded for money by X-R3, Task 31c: the user chose one money rule on 2026-10-18.)
  - **A-R5 The asset form's add buttons.** "Add purchase document" and "Add photo" check their own fields under the same hook and merge into its map (`setErrors({ ...fieldErrors.errors, … })`), so the save's errors stay: a missing file is `fileRequired` under its drop zone, a missing number `purchaseDocumentNoRequired` under the number. A chosen file without a number also stops the save (the rule the toast had). The drop zones keep their own title as their name (no `Field` label): they take `id`, `aria-invalid` and `aria-describedby` themselves, with a `FieldError` under them; a new file clears its error (and the number's, whose rule depends on it).
  - **A-R6 The import wizard has no typed field.** Its rules are prerequisites (spec scope: a picked file, a ready row). `validate(file)` states the first (`required(file)`, shown as today's `fileRequired` in the wizard's notice); the file's own rules (10 MB, `.xlsx`) stay the server's, whose refusal comes under `_form` and shows in the same notice (S-R7, spec §4.1.3). With no ready row the import button is `aria-disabled`, tied by `aria-describedby` to the counts beside it (`asset-import-ready-summary`, "0 พร้อมนำเข้า · n มีข้อผิดพลาด"), which say why; `confirmImport` keeps its return. No hook: nothing lands under a field.
  - **A-R7 The batch.** Keys are the server's: `common.<field>` for the shared fields (`COMMON_FIELD_IDS` holds the field names, `commonKey()` adds the prefix), `rows.<i>.assetTag` / `rows.<i>.serialNumber` for the rows. The rows render twice (cards below `md`, a table from `md`, one hidden): ids `asset-batch-card-<i>-tag|serial` and `asset-batch-row-<i>-tag|serial`, and `idFor` picks the one on screen (`getClientRects().length`). In-batch duplicates use the server's own `buildAssetBatchDuplicateFieldErrors(rows, findDuplicateBatchValues(rows))` (`src/lib/asset-batch-create.ts`), live under every row that holds the value (`liveError`, `asset.batchRowDuplicate`); the warning box that listed the values goes (U8, anti-goal "a live warning box and an under-field error"). A server `duplicate` (already registered) reads `common.validation.duplicate`. Removing or pasting rows clears every row error (the rows below move, M-R7); adding a row at the end does not. A server refusal sets `reviewing` false first (`reveal`), then focuses (spec §4.2). The duplicate check's "found" result loses its toast (F-R9): its Notice reads it out (`role="status"` for that tone only); the clean result and a failure keep their toasts.
  - **A-R8 The bulk update's "one of the two" is content (spec §4.3, §4.4).** It is the server's rule (`assetBulkUpdateSchema`, path `toLocationId`), so `validate()` returns `bulkUpdateFieldRequired` under the location, apply is enabled, and choosing either clears it. An empty selection cannot open the dialog (the bar opens it); its return stays.
  - **A-R9 Component install and removal (spec §4.2 multi-step).** The details step becomes `<form onSubmit={openReview} noValidate>` (continue is its submit; Enter in a field continues); the role gets `required` on its `Field` (the star; no native attribute, so `CONSTRAINT_FLOORS` stays; GF4's `vTrack`) and `required ?? maxLength(100)`. `installComponent` keeps only `if (!selectedComponent) return` (the component is chosen in the step before: a prerequisite). A refusal at the review that names a detail sets the step back to `details` (`reveal`) and focuses the field; `componentAssetId` is not a field and keeps the toast. The removal dialog becomes `<form onSubmit={handleSubmit} noValidate className={accessibleDialogFormClasses}>` with `validateRemoval(reason)` (its `maxLength`); its reason is optional and the server has no rule for it (`optionalText`), so it has no server step.
  - **A-R10 Status correction.** The 5–500 reason is the server's content rule (spec §4.4): the panel becomes `<form onSubmit={handleSubmit} noValidate id={panelId} …>`, its confirm a submit button without `disabled`, the `Field` gets `required` (the star) and says its numbers (`validationMessage(code, { min: 5, max: 500 })`, M-R4). No HTML attribute is added (the file has no `CONSTRAINT_FLOORS` row; adding one would need a new row). The server's `nextStatusId` refusal (`statusCorrectionReadyOnly`) is not a field here: it keeps the error line under the field (`ApiErrorText`, spec §4.1.3).
  - **A-R11 Label print and the queue filter.** The toolbar's reason, tape size and print button become one `<form onSubmit={handlePrint} noValidate>` (Enter in the reason prints); `validate()` restates the reason's `maxLength` (the server's `max(500)`), its error shows under the toolbar row, tied by `aria-describedby`, and the boxed reason (2C K21, an `EXEMPT` boxed field) takes the field error look through `cn` (focus turns it teal again). The empty asset list keeps its return (the page has nothing to print). The print queue's created-from/to is a filter (not in `V_SCOPE`, no `validate()`): `max={createdTo || undefined}` / `min={createdFrom || undefined}`, like the disposal list.
  - **A-R12 Tests.** One new LF file, `tests/v-track2-a.test.ts`, one test per task, appended in order; A1 creates it with the helpers `C`, `read`, `escape`, `messages`, `functionBody`, `fieldTable` and `assertMovedForm` (no test imports another test file). Each task adds its file to `V_FORMS` and edits, in the same commit, every pin its change breaks (each Step 4 lists them).

- **R3, area O (asset operations, Tasks 8–13):**

  - **O-R1 A review dialog hands a server field error back to the form (spec §4.2).** The refusal branch is plan 1's shape, `if (fieldErrors.applyServer(payload) && focusFirstError()) return` (M-R4), and the form's `focusFirstError` passes the hook's `reveal` (F-R4): `fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key], reveal: leaveReview })`, with `async function leaveReview() { const closed = waitForDialogToClose(); setReviewOpen(false); await closed }`. The hook runs `reveal` in its effect after the errors render, then `waitForElement`, then `focusField`. `waitForDialogToClose()` (O1, FIXED addition O-F1) takes the dialog that holds focus **now** (`document.activeElement?.closest('[role="dialog"]')`: the busy confirm button keeps focus, `Button busy` sets `aria-disabled`, not `disabled`), waits per frame until it has left the page, then one more task, and resolves; with focus in no dialog (a client-side error, the review never opened) it resolves at once. Why it waits:
    - Radix's `FocusScope` traps focus while the dialog is open and pulls any outside focus back; the page behind stays `aria-hidden` until the 200 ms exit animation ends (`dialog.tsx`: `duration-200 … data-[state=closed]:animate-out`).
    - After the unmount, `AccessibleDialog`'s `onCloseAutoFocus` gives focus to the element that opened the review (the save button) in a task (`setTimeout`) — after the field, if the field were focused first. Waiting one task after the unmount lets that run, so the field takes focus last, with the page no longer hidden, and `focusField` scrolls `main` clear of the topbar (F-R5).
    - So `OperationReviewDialog` and `AccessibleDialog` do not change (their pins hold), and the save button still gets focus back when a person cancels the review.
    A refusal that names no field the form shows keeps today's handling with the review open (spec §4.1.3): checkout's `getCheckoutErrorMessage` toast, checkin's handover-code toast, transfer's `payload.error` toast. Gives up after 60 frames (about a second) like `waitForElement`.
  - **O-R2 Checkout's handover rules use the server's codes and the form's own sentences (spec §6.1, §7.1).** The server answers the handover rules with the catalog keys of its `HANDOVER_*` messages under `handoverMode`, `custodianId` and `expectedReturnDate` (S6; `asset-operations.ts:40-54`). `validate()` sends the same codes for the same rules (`handoverModeRequired`, `handoverTemporaryDueDateRequired`, `handoverReturnBeforeCheckout`), so client and server agree on the code. The text under the field is the checkout form's own sentence, in the words of its fields (`checkout.handoverModeRequired` "กรุณาเลือกลักษณะการส่งมอบก่อนดำเนินการต่อ" beside the legend "ลักษณะการส่งมอบ", where `apiErrors.handoverModeRequired` says "แบบการส่งมอบ"): `HANDOVER_MESSAGE_KEYS` maps the six handover codes to the six `checkout.*` keys that `tests/asset-handover-checkout.test.ts:24-46` pins, and `errorText(key)` reads that map first, then `fieldErrors.message(key)`. `getCheckoutErrorMessage` stays for the toast of a refusal that names no shown field. `checkout.reviewIncomplete` loses its only reader and goes (as plan 1 M4's supplier keys did).
  - **O-R3 Several server keys, one control.** Checkout's one destination select stands for `custodianId`, `departmentId`, `locationId` or `parentAssetId` by checkout type (the server's custom issues and `HANDOVER_PERMANENT_CUSTODIAN_REQUIRED` name them). `FIELD_IDS` lists all four with the one id `checkout-destination` (M-R1's table with repeated ids; the test checks each distinct id once in the markup); the select shows `errorText(destinationKey(values.checkoutType))`; a type change clears the four, the handover mode and the expected return date with the type (spec §4.3: what the change resets).
  - **O-R4 Transfer's "at least one destination".** The server names it under `toLocationId` with `transferDestinationRequired` (`asset-operations.ts:83-89`, catalog `:37`); `validate()` sends the same code under the same key: `atLeastOne([…]) && "transferDestinationRequired"`. It shows under the location select (the first destination and the key the server names); a change of any of the three destinations clears it (spec §4.3). `toCustodianId` and `toDepartmentId` are not in `FIELD_IDS`: nothing names them (M-R1). The asset's own error is the shared `required` now (the old toast said "choose a destination" when only the asset was missing). `transfer.destinationRequired` loses its only reader and goes; `apiErrors.transferDestinationRequired` reads "เลือกปลายทางการโอนย้ายอย่างน้อย 1 รายการ".
  - **O-R5 Bulk move's asset list is content, not a prerequisite.** The list is a field of the form with the star (spec §4.4's "no assets selected for a batch" is a selection made outside the form, as in the disposal bulk dialogs). One group, keyed `assetIds` like the server (`assetBulkMoveSchema`, `.min(1)` → `required`): the `role="group"` list gets `id="bulk-move-assets"` and `aria-describedby` to one `FieldError` under it (M-R8's markup; `FieldGroup` does not fit, the label is the search field's). Focus goes to the list's first checkbox (F-R5's `controlOf`); when the list shows none (a search that hides every row, or no asset at all) the error still shows and focus does not move. The text is the list's own `bulkMove.selectAssets` for `required` (like the preset name, M-R4), the shared message otherwise. The destination select gets its id and error (spec §5 bug).
  - **O-R6 The transaction cancel dialog stays without a `<form>`.** Its one field is a textarea, where Enter is a new line, so a form element would add no submit; the guard's formless path (V2: `validate(` only, F-R9) holds, as for the other formless dialogs. The reason restates the server's 5–2000 (`validations/asset-transaction-cancellation.ts:4`): `required ?? minLength(5) ?? maxLength(2000)`; empty and too short read the page-supplied `labels.reasonTooShort` (the dialog's own sentence; the four pages pass it), any other code the shared message. The danger Notice stays for the preview's and the server's other failures (DESIGN.md: an error of a dialog's action shows inside the dialog). Each opening starts without the last opening's errors.
  - **O-R7 Gates in area O (spec §4.4).** The cancel dialog's blockers are a prerequisite with a visible reason: the confirm becomes `aria-disabled={blocked || undefined}` with `aria-describedby` to the blockers Notice (`id="transaction-cancel-blockers"`), and `submitCancellation` returns first when blocked (Enter on the focused button still calls it). `loading` keeps `disabled={loading}`: it is a moment, like busy, with its own polite loading line. Checkin's "no active checkout" keeps its disabled asset select and its `ActionEmptyState` (no field or save button shows at all; nothing to gate).
  - **O-R8 Checkin.** The return date gets native `required` (spec §4.5: the control's constraint and its star go together; FMG's `STAR_ONLY` entry is stale and goes, `CONSTRAINT_FLOORS` checkin `[4, 0, 0]` → `[5, 0, 0]`, a floor may rise). The two people are keyed `returnBy` / `receiveBy`, the names the server requires (`assetCheckinSchema`: `min(1).max(100)`); their selects hold the employee ids, and `setEmployeeField` sets both, so `validate()` reads the names and restates the server's 100 (M-R2). `submitCheckin`'s repeat guard (`:255-258`) becomes a silent `return` that only narrows the type: the review opens only after `validate()` found the checkout. Three `checkin.*` keys lose their reader and go. A damage note that picks the repair status, and the legacy backfill that fills four fields, clear those fields' errors.
  - **O-R9 Shared files are edited by text anchors that hold in any order** (the list at the head of this area). The rehearsal applied each edit with an exact-once check scoped to its anchor.
  - **O-R10 Tests.** A new LF file, `tests/v-track2-o.test.ts`, one test per task, appended in order. It cannot import `tests/v-track-m.test.ts` (no test imports a test file), so O2 declares its own helpers: `validateBody` (as M's) and `assertOperationForm`, which differs from M's `assertMigratedForm` in three points: a `FIELD_IDS` value may repeat (O-R3; each distinct id once in the markup), the refusal reads `payload` (these forms' variable), and `noValidate: false` for the formless dialog. O1's test runs the real `waitForDialogToClose` with stand-in `document` and `requestAnimationFrame` globals it restores (node has neither).

- **R4, area U (audit, Tasks 14–19):**

  - **U-R1, the round's date pair** (spec §7.4, §4.3). The start input gets `max={values.endDate}`, the end input `min={values.startDate}` (the disposal list filter's pattern, `disposal/page.tsx:472-475`), so the picker cannot choose a reversed pair. `validate()` checks `notBefore(endDate, startDate)` always (the round form only creates, so spec §7.4's "the audit round always checks" holds); the same day is fine, as on the server (`endDate < startDate`). Changing either date clears both dates' errors. A server `endBeforeStart` lands under the end date through `applyServer`; its text is `common.validation.endBeforeStart` (F-R3 resolves `common.validation` first), not the catalog's older "ต้องอยู่หลัง".
  - **U-R2, the preview** (spec §4.1). The preview posts the round's body to a route that parses the same schema with an empty name filled in. It runs **no** client `validate()` (a client check would refuse an empty name, which the preview accepts today), but a refusal that names a field shows under it like save's (`if (fieldErrors.applyServer(payload) && focusFirstError()) return`), so a reversed pair or a sample rate of 150 no longer ends in "ข้อมูลที่กรอกไม่ครบหรือไม่ถูกต้อง". The client rules run on save (U6: errors after pressing save).
  - **U-R3, whole numbers.** A number input's step is 1 unless it says otherwise, and the browser checked it before `noValidate`; the server's year and sample rate are `int`. The round form restates it with a local `function wholeNumber(value: string)` → `"invalidNumber"` ("กรุณากรอกเป็นตัวเลข") after `range`. It stays local (FIXED 4 has no such helper and no other area U form needs it); if the assembly adds a shared one, U1 switches to it. The client check matters because plan 1's map sends zod's `.int()` failure (`invalid_type`, `expected: "int"`) to `required` (S-R2's "any other `invalid_type`"), so without it a year of 2569.5 would read "กรุณาระบุข้อมูลนี้" (assembly note 1). (Task 31b maps it to `invalidNumber`; the local check stays, X-R2.)
  - **U-R4, the round's keys** (M-R1). `name`, `auditYear`, `startDate`, `endDate`, `status`, `riskPreset`, `sampleRate`, in visual order. The risk preset has no client rule but the server can name it (`invalidChoice`), so it has an id and an error (as plan 1 M2 kept location's `parentId`). The eight scope selects send optional text the server never refuses and stay out. The local `Select` helper gains `id` and `error` and hands them to its `Field`. The year and the sample rate say their limits through `useValidationMessage` (M-R4's pattern for numbers; the year in the reader's calendar, `displayYearRange`).
  - **U-R5, who sends the request.** A dialog whose request is sent by its parent (the decision through the row's `review()`, the component-missing dialog and the scan check through the scan workspace) gets no hand-back: on those routes the schema cannot refuse any field the dialog shows (`reviewRemark`, `remark` and the four `actual…Id` are optional text with no limit; `action`, `confirmConflict`, `assetId` are set by code), so the parent's toast stays the form-level message (spec §4.1.3) and its test says `server: false`. A dialog that sends its own request keeps the `applyServer` line even where the route cannot name a field today (mark not found, close), so a later server rule lands under the field with no client change. The scan workspace, its offline queue and replays do not change (spec §3 non-goal).
  - **U-R6, a form with no rule.** Mark not found, component missing and batch review have nothing a person can get wrong before the request (optional remarks with no server limit, an optional photo, the batch's selection being a prerequisite). They still get `noValidate` (spec §4.5) and a module-level `validate()` that returns `{}` with a comment saying why, because V2 needs `validate(` in every `V_FORMS` file and spec §3 forbids inventing a rule; the two dialogs run it through the hook like every form, the batch calls it before it sends. No `EXEMPT` row (assembly note 2).
  - **U-R7, the cancel reason.** Required, and the server's 4,000-character limit restated (the textarea has no `maxLength`, so a longer text can be typed): `useFieldErrors<CancelField>({ params: FIELD_PARAMS })` with the module constant `FIELD_PARAMS = { reason: { max: 4000 } }` gives `tooLong` its number. An empty reason shows the form's own `auditRound.cancelReasonRequired` ("กรุณาระบุเหตุผลการยกเลิก", the toast's text; spec §7.1 lets a form use its domain message). No `maxLength` attribute is added (it would change typing; CONSTRAINT_FLOORS only protect). Closing the dialog clears the errors, so the next opening starts clean (M-R5's integration edit).
  - **U-R8, the finding row's three dialogs.** Three tables, `REVIEW_FIELD_IDS` (`reviewRemark`), `PLAN_FIELD_IDS` (`actionPlan`, `actionDueDate`, `actionStatus`), `CLOSE_FIELD_IDS` (`closureRemark`), like integration's `CREATE_`/`EDIT_` (M-R1), and one module `validate()` whose argument holds only the calling dialog's fields (`if (values.x !== undefined) check(…)`). The owner `SearchableSelect` is optional and never refused: no id, no error. The decision and the close become `<form onSubmit={handleSubmit} noValidate className={accessibleDialogFormClasses}>` around their body and footer (M-R12; `V_SCOPE` counts three forms for this file), their buttons `type="submit"`; the decision keeps its conflict flow (a second press after a conflict sends `confirmConflict`). The action plan's `onChange`s go through a `setField` that clears the key (M-R5).
  - **U-R9, closing waits for evidence** (spec §4.4 "evidence not uploaded", §11 call 2). `const needsEvidence = uploadedCount === 0`; `handleSubmit` returns first when gated; the button is `aria-disabled={needsEvidence || undefined} aria-describedby={needsEvidence ? "audit-close-reason" : undefined}` (it stays focusable; Button's `aria-disabled:` styles look disabled and drop pointer events); the reason `<p id="audit-close-reason" className="text-meta text-muted-foreground">` is the dialog body's **last line**, right above the footer, because FMG GD3 allows only buttons in `AccessibleDialogFooter` (M-R10's footer reason line is for page footers; assembly note 3). New message `auditFinding.closeNeedsEvidence`.
  - **U-R10, batch review waits for a selection** (spec §4.4 "no assets selected for a batch"). `const noSelection = selectedCount === 0`; approve and reject get `aria-disabled={noSelection || undefined} aria-describedby={noSelection ? "audit-batch-review-reason" : undefined}` and keep `disabled={reviewing === "<other>" || reviewDialogAction !== null}` (another action is running: a busy state, not a gate); `openReviewDialog` returns first when gated (it already had the silent return). The reason line `<p id="audit-batch-review-reason" className="text-meta text-muted-foreground">` is the last child of the panel's actions, after the reject button (first would break `list-pages-ui`'s pin that the actions start with the select-all button). New message `auditFinding.batchNeedsSelection`. `ConfirmTextDialog` (a shared part, `NOT_IN_SCOPE`) is #20's form, so its `<form>` takes `noValidate`; it has no constraint attribute, so nothing else changes for its callers.
  - **U-R11, the scan check** (spec §4.2 "the sheet stays open; focus moves inside it"). It stays a panel with no `<form>` (its rows, photo buttons and component actions are buttons, and save goes through a confirm for pending components); `validate()` is its only check (V2 needs only `validate(` for a formless submit, F-R9). Its key is the scan body's `actualLocationId` (M-R1), with the id `audit-check-location`; only the location has a rule, `required`, which restates its star (the location always starts filled, since an asset's location is required, and a required select hides its clear button, so this is the star's rule, not a new one; the server falls back to the expected location when it is empty). `fieldConfig` gains `key?: CheckField`; the location's `onChange` clears its error. Focus: `focusFirst` gets `reveal: (key) => revealFocusInScrollArea(bodyRef.current, document.getElementById(FIELD_IDS[key]))`, which brings the trigger into the check's own scroll area first: on desktop the check is a sticky aside **inside** `main`, whose body scrolls by itself, so `focusField`'s scroll of `main` cannot reach it; on a phone the sheet is a portal and `focusField` keeps the browser's focus scroll inside it. The photo gate (spec §4.4 "a required photo not taken"): `save` returns first when `missingPhoto`, the button gets `aria-disabled` and `aria-describedby` to the existing Notice, which gets `id="audit-check-photo-reason"`. A closed round (`disabled`) still disables the button: then the whole check is read-only (every field is disabled too) and the page's danger alert says why (`audit-scan-workspace.tsx:661-671`). `SELECT_STAR_ONLY` loses the file's row.
  - **U-R12, the test file and the shared files.** `tests/v-track2-u.test.ts` (LF, new) holds area U's helpers (`read`, `escape`, `validateBody`, `assertMigratedForm` with plan 1's checks plus `formless` and an id inside `id={TABLE.key}`) and one test per task. The shared-file edits are text anchors (header of this area).

- **R5, area D (disposal, Tasks 20–26):**

  - **D-R1, the evidence refusals and the bulk rows name their field (D1; spec §6.2, the user's "attach" of 2026-10-18).**
    - `getDisposalEvidenceFieldErrors(code, input)` (new, in `src/lib/disposal-evidence-exception.ts`, pure): `DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED` → `{ evidenceExceptionReason: "required" | "tooShort" | "tooLong" }` (the trimmed reason empty, under 20, else over 2000: the service's own count, `:19`, `:26`); `DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED` → `{ evidenceExceptionAcknowledged: "required" }`; every other code (no evidence, not an admin, not applicable, `null`) → `undefined`. The route passes it as `disposalApiError`'s fourth argument (plan 1 Task 6's), so the body is `{ code, error, fieldErrors }` for those two and unchanged for the rest; status unchanged.
    - `getDisposalBulkExecutionFieldErrors(items, input)` (new, in `src/lib/disposal-bulk-execution.ts`, pure): over the **blocked** rows, `DISPOSAL_RECIPIENT_REQUIRED` → `sharedRecipientName: "recipientRequired"` (the dialog's shared recipient fills a missing one; the code only arises for sell, donate and dispose, the types that show it), the two evidence codes as above; `DISPOSAL_DOCUMENT_REQUIRED`, `_SALE_VALUE_REQUIRED`, `_EXECUTION_REMARK_REQUIRED` are fields of each request, which the dialog does not show, so they name none. First row per key wins; `undefined` when none. `buildResponse(mode, items, input)` adds `fieldErrors` only when defined, so every existing response keeps its exact shape. The 200 stays a 200: these are outcomes, not a refusal; the client uses them only when nothing is eligible (D-R9).
    - The codes are the shared vocabulary (`required`, `tooShort`, `tooLong`) and the catalog key `recipientRequired` (plan 1 S-R2, S-R7), so the client resolves them without a new message.
  - **D-R2, the request's asset and requester (D2; spec §5 bug).** Both are `required` on submit. `DisposalAssetPicker` gains `id?: string` and `error?: React.ReactNode`: `id` names the search field (`inputId = id ?? generatedId`; the label keeps `htmlFor={showSearch ? inputId : undefined}`, pinned by `tests/choice-controls-ui.test.ts`), the error shows under the picker as a `FieldError` with `${inputId}-error`, tied by `aria-describedby`, and the search field gets `aria-invalid` (an input with `role="combobox"` supports it). The search field is the only control while nothing is chosen, which is when the error shows; choosing an asset clears it. The batch passes neither (its assets are a prerequisite, D-R3). The approver has no rule anywhere and stays out of the table (M-R1).
  - **D-R3, the batch's two steps (D3; spec §4.2, §4.4).**
    - The edit step becomes `<form onSubmit={handleReview} noValidate …>` (M-R12's precedent: a step submitted by a button joins the form convention, so `noValidate`, Enter and V2 apply) and the review button `type="submit"`.
    - The old gate mixed a prerequisite with content rules. The asset count (2–100) is the prerequisite: `needsAssets`, `handleReview` returns first, the button is `aria-disabled` with `aria-describedby` to a visible line under it, `disposalPage.batchNeedsAssets`. The requester and the reason are content errors on review.
    - `focusFirst(…, { reveal: () => setReviewing(false) })` takes a field error from the review step's confirm back to the edit step (the edit step unmounts while reviewing; the hook lives in the form and keeps its errors). The batch route answers plain `Error`s today (`prepareDisposalBatchPacket`) and never names a field, so the hand-back only runs if a later server change names one; it is kept so the step behaves like every other review step (spec §4.2). `submit`'s silent `if (!valid) return` goes: the review step is reached only through `handleReview`.
    - Pressing Enter in the picker's search field now submits the edit step (as it already submits the request form); with assets chosen it opens the review or shows the errors (behaviour change, listed below).
  - **D-R4, a field the form hides is neither checked nor focused (D2–D5, D7; spec §4.1.3, the anti-goal "a wrong field … with the person left looking at a page that shows no error").** Each form declares a module-level `shownFields(…)` that filters `FIELD_ORDER` by what it renders (the estimated values by type; the decision's next status for an approval; the execution's recipient and actual values by type and the exception's fields while chosen; the bulk dialog's fields per step). `validate()`'s `check` drops a key that is not shown, and `focusFirstError` passes `shownFields(values)` as the order, so a server refusal about a hidden field (a value left in a field the type hid, which the client still sends) falls through to today's toast or Notice. A change of the controlling field clears the keys it shows or hides (spec §4.3).
  - **D-R5, `NON_VALIDATION_TOASTS` (D2, D3; a FIXED addition to `tests/validation-guards.test.ts`, the allowance list F-R9 left to the later plans).** V3 compares each V form's toasts outside a catch with an exact count per file (`{ count, why, ruling }`, default 0) and fails a row whose file is not in `V_FORMS`. The two upload-result warnings stay toasts: they report a saved record whose evidence files did not upload, not a field (spec U2: toasts stay for other failures), and the page they lead to has no line for it. **Assembly (P-R4):** Task 21 (D2) creates it; Task 22 (D3) and the maintenance Tasks 30 and 31 (M4, M5) insert one row each directly after the list's opening line. The assets area needs none (Task 2 moves the batch's duplicate-check result into its Notice).
  - **D-R6, the shared rules are reused, and their codes are their catalog keys (D2–D5; spec §7.2).** `getDisposalRequestReasonError` (request, batch), `getDisposalDecisionFieldErrors` (decision), `getDisposalExecutionFieldErrors` (execution) give English messages; the client turns each into its code with `getApiErrorKey` (`disposalReasonTooShort`, `rejectionReasonRequired`, `recipientRequired`, `referenceDocumentRequired`, `saleValueRequired`, `executionDetailRequired`), the same key the server's custom zod issue answers with (plan 1 S-R2), so client and server show one message (`apiErrors.*`). The reason's message says its limits through `useValidationMessage` with `{ min: 12, max: 4000 }` when the server sends `tooShort`/`tooLong` (M-R4); the catalog key ignores params.
  - **D-R7, the execution's exception and evidence (D5; spec §4.4).** The historical reason (`required` → `minLength 20` → `maxLength 2000`) and the acknowledgement (`required`, F-R1 counts `false`) are content errors on save; both show the domain's own sentence (`disposalPage.errors.DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED` / `_ACK_REQUIRED`) for any code (spec §7.1: a form may use its domain message), the acknowledgement as a `FieldError` under its checkbox, tied by `aria-describedby`, the checkbox `aria-invalid`. No evidence and no exception (`evidenceBlocked`) is the prerequisite: the save is `aria-disabled` and described by the dialog's existing evidence Notice (`id="disposal-execution-evidence-reason"`), which already says why; `handleSubmit` returns first. A refusal that names a shown field (D1's two codes included) keeps the dialog open and focuses it before the existing close-and-refresh branch, which now runs only for the evidence codes that name no field, through `closeExecutionDialog()` (which also clears the errors).
  - **D-R8, bulk approval (D6).** The remark (`maxLength 4000`) is the dialog's only field. `send` throws with the body as the `Error`'s `cause`; `commit` resolves to that body when it names `approvalRemark` (plan 1 M-R9's pattern: the owner hands the refusal back to the dialog, which applies it), every other refusal keeps the dialog's danger Notice. Nothing eligible is the prerequisite: the approve button is `aria-disabled` and described by the zero-eligible Notice (`id="disposal-bulk-approval-zero-eligible"`); the retry button keeps its own `disabled`.
  - **D-R9, bulk execution (D7; spec §4.2 "multi-step flows … bulk execution").**
    - Content errors: the review step's date, executor and final status (`required`), shared recipient (`maxLength 200`), the exception's reason and acknowledgement (as D-R7, messages from `copy.errors`); the preview step's permanent confirmation (`required`; the new `disposalPage.bulkExecutionPermanentConfirmationRequired` through the page's copy). The review button is enabled (`disabled={!hasSharedValues}` goes); preview's silent `return` and its historical `setError` go, and with them `validateHistoricalException` and its one test (no importer is left: plan 1 A-R4's precedent).
    - `preview()` resolves to a body that names a review-step field: a 400 whose `fieldErrors` hold one of `FIELD_ORDER`'s keys (thrown with the body as `cause`), or a 200 preview with `eligibleCount === 0` and D1's `fieldErrors`; in both cases the dialog returns to the review step and the field shows its error. A preview with eligible rows stays the preview, as today (the person may execute those rows; the blocked ones are listed with their reasons). A retry (which sends the previous payload) never hands back.
    - Nothing eligible is the prerequisite: the confirm button is `aria-disabled` and described by the zero-eligible Notice (`id="disposal-bulk-execution-zero-eligible"`).
  - **D-R10, where the hook lives (D4–D7).** The decision and execution dialogs submit through their button component (`handleSubmit` there), so the hook lives there and the dialog gets it as a prop, typed `ReturnType<typeof useFieldErrors<Field>>`; closing the dialog clears the errors (the button stays mounted). The bulk dialogs own their hook (they unmount when closed) and get the refusal back from the provider (D-R8, D-R9). `useImperativeHandle(ref, () => ({ open: () => setOpen(true) }))` stays as `tests/dialog-trigger-handles.test.ts` pins it.
  - **D-R11, money fields.** `min="0"` is restated as `range(value, 0)` (`outOfRange`, shown with `{ min: 0 }`); `step="0.01"` is not restated: plan 1 ships no helper for it, and the server takes any non-negative number into a `Decimal(18, 2)` column (open issue 3). Superseded by X-R3 (Task 31c): `range(value, 0) ?? decimals(value, 2)`.

- **R6, area M (maintenance, Tasks 27–31; rulings MT-R*, P-R1):**

  - **MT-R1, the maintenance refusals about a field name it (Task M1; spec §6.2, U3, U9; plan 1 S-R6, S-R7).** `MaintenanceApiError` gains an optional fourth constructor argument `fieldErrors?: FieldErrors` (a field declared in the class body, not a parameter property, so tests can import the module under type stripping) and `getMaintenanceErrorPayload` adds `fieldErrors` to the body only when it is set, so every other maintenance refusal keeps its body byte for byte. The refusals: "Select who is recording this repair" keeps its code and adds `{ reportedById: "required" }` (a missing value is `required`, S-R7); "Reporter not found or inactive", "Vendor not found or inactive" (repair create, complete and edit, one helper) and "PM vendor not found or inactive" (the PM edit) become `FieldRefusalError` with the catalog key of their own message (`reporterNotFound`, `vendorNotFound`, `pmVendorNotFound`); status 400 and the message stay. No rule is added (spec §6.3). The asset-state refusals (`MAINTENANCE_ASSET_WRITTEN_OFF`, `_ON_LOAN`, `_INELIGIBLE`, `_OPEN_RECORD_EXISTS`) and the conflicts (`MAINTENANCE_CONFLICT`, `_INVALID_TRANSITION`, the plan's state) are about the asset's or the record's state, not a value typed: they keep today's handling (spec §4.1 step 4). The services import `FieldRefusalError` from `./field-errors.ts` and the routes' `errorResponse` from `@/lib/field-errors`: one file, one module, the same way `MaintenanceApiError` already crosses from `./maintenance-api-errors.ts` to the routes' `@/lib/maintenance-api-errors` (the bundler keys a module by its resolved path).
  - **MT-R2, `step(value, size)` (Task M2; FIXED 4 addition; spec §4.5).** Spec §4.5 keeps `step` on the control and has `validate()` restate it; FIXED 4's eight helpers do not cover it. `step(value, size)` in `src/lib/validation-rules.ts`: empty → `null` (left to `required`); not a finite number → `"invalidNumber"`; else `"invalidNumber"` unless `value / size` is within 1e-6 of a whole number (so `0.29` at `0.01` passes). `invalidNumber` is the code the server gives zod's `not_multiple_of` (plan 1 S-R2), so a client and a server step refusal read the same. It counts from 0, which is the step base of every step field in the maintenance forms (`min="0"` money, `min="1"` whole days). A money field writes `range(v, 0) ?? step(v, 0.01)`, whole days `range(v, 1, 3650) ?? step(v, 1)`. The asset and disposal money fields of the other areas need the same (open issue 14 is its message). (Answered 2026-10-18: X-R3, Task 31c, gives every money field `decimals(v, 2)` with its own sentence; `step` stays for whole numbers.)
  - **MT-R3, the maintenance forms follow plan 1's form pattern** (plan 1 M-R1 to M-R5, word for word where it applies): `FIELD_IDS` in visual order with the server's keys, a module-level `validate()` with `check(…)` lines, `useFieldErrors<…>()`, `fieldErrors.setErrors(validate(…))` then `if (focusFirstError()) return`, on `!response.ok` first `if (fieldErrors.applyServer(payload) && focusFirstError()) return` and then today's `throw new Error(getMaintenanceErrorMessage(payload?.code, …))` (so a refusal that names no shown field keeps today's domain toast, spec §4.1 step 3), `<form onSubmit={…} noValidate …>`, `id` after `label` and `error` last, one prop per line past about 120 characters. Additions: a field with limits says them with `validationMessage` (`{ min: 1, max: 3650 }` for the days, `{ min: 0 }` for a cost); a `MaintenanceOptionSelect` is written one prop per line with `id` first and `error` just before `onChange`; `setField` is typed by the table and clears the key it sets (`fieldErrors.clear(field)`: the values and the table hold the same keys); the PM form's frequency change also clears the days, which only a custom frequency shows (spec §4.3). The PM edit does not check the asset: its select is fixed and the update does not send it.
  - **MT-R4, focus only reaches a field on screen (spec §4.2; Task M4).** The repair form's order is `fieldOrder(values, needsReporter)`: the outcome only when the repair is done, the reporter only for an account without a linked employee. A server key outside the order (the account's own employee inactive: `reportedById` with no reporter select) makes `focusFirst` false, so the refusal falls through to today's toast (plan 1 F-R4) instead of focusing nothing. The four fields inside "more details" (`DETAIL_FIELDS`) open it first through `focusFirst`'s `reveal` (`setShowDetails(true)`), and the hook waits for the field to mount. The two radio questions become `FieldGroup`s (plan 1 F-R8): the star, and an error tied to the group for the server's `done` / `outcome` codes; the client has no rule for them (each always holds a value).
  - **MT-R5, a result toast is not a validation toast (Tasks M4, M5; plan 1 F-R9 "or adds an allowance list … with its own ruling"; P-R4).** "บันทึกแล้ว แต่แนบไฟล์ไม่สำเร็จ {count} ไฟล์ …" is the result of a save that went through; the form has gone when it shows (the page moves to the record, or the dialog closes), so neither a field nor a status line can hold it. Each file gets one row in area D's `NON_VALIDATION_TOASTS` (FIXED 9, created by Task 21): `{ count: 1, why: …, ruling: "v-track plan 2 MT-R5" }`, inserted directly after the list's opening line; V3 then allows exactly that one toast outside a catch, and fails a second one or a row whose file is not in `V_FORMS`. A validation error never goes in it. (Area M's draft created its own `RESULT_TOASTS` list keyed by the exact call; the assembly kept one list, D's, which ran green on the chain with these rows.)
  - **MT-R6, three dialogs in one file (Task M5).** `repair-record-actions.tsx` holds three forms: three tables (`COMPLETE_FIELD_IDS`, `CANCEL_FIELD_IDS`, `EDIT_FIELD_IDS`), three hooks (`completeErrors`, `cancelErrors`, `editErrors`), three handlers (`handleComplete`, `handleCancel`, `handleEdit`), and **one** `validate(values, reportedDate)` over the union of keys: each dialog passes only its own values, the required checks run only for a key passed (`if (values.x !== undefined)`), and the optional rules leave an absent key alone (V2 needs one `validate(` in the file). The shared `send(body, successKey, showRefusal)` calls `if (showRefusal(payload)) return` before today's throw; each handler passes `(payload) => <hook>.applyServer(payload) && focusFirst<Name>Error()`, so a refusal lands under the field of the dialog that sent it, the dialog stays open, and anything else keeps the toast. `close()` (cancel, Escape, the backdrop) clears all three maps, so a dialog opens again without its last errors; the header buttons (`setDialog(…)`, pinned by `button-size-switch.test.ts`) do not change.
  - **MT-R7, the repair completion date (Task M5; spec §7.4, §6.3, §11 call 6).** The return date's input gets `min={details.reportedDate}` (the picker starts at the reported date) and `validate()` restates it with `notBefore(returnDate, reportedDate)`. A client rule only: the server has none, and none is added. The error is the domain sentence `repairRecord.returnDateBeforeReported` (th "วันที่ซ่อมเสร็จต้องไม่ก่อนวันที่แจ้งซ่อม", en "The return date cannot be before the date the repair was reported"; spec §7.1 "a form's validate() may use its domain message"), because the dialog does not show the reported date and `common.validation.endBeforeStart` ("วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น") names an end and a start the dialog does not have; any other code under the field reads through `message("returnDate")`. The edit dialog's reported date gets no pair rule (spec §7.4 names only the completion; open issue 10).
  - **MT-R8, the open record and the domain fallback stay.** `MAINTENANCE_OPEN_RECORD_EXISTS` keeps its danger Notice with the link to the open record, set before the refusal is read, and its toast (a 409 conflict keeps today's handling, spec §4.1 step 4; open issue 11). `getMaintenanceErrorMessage(payload?.code, …)` stays the fallback after `applyServer` in all four call sites, so `tests/maintenance-i18n.test.ts` ("no `payload?.error`", "`getMaintenanceErrorMessage(payload?.code, t`") holds unchanged.
  - **MT-R9, tests.** One new LF file, `tests/v-track2-m.test.ts`, one test per task, appended in order. It cannot import plan 1's `tests/v-track-m.test.ts` (a test that imports a test file runs it again), so M3's block brings its own `C`, `escape`, `validateBody` and `assertMigratedForm` (plan 1's helper, with `resultToast` for MT-R5, and the server line written `if (<hook>.applyServer(payload) && `). M1 creates the file with its header (`read`, the service imports and a transaction stand-in); M2 imports `step` dynamically so the header never changes after M1.
  - **Naming (P-R1).** Plan 1's master-data rulings are the bare ids `M-R1`–`M-R14` everywhere in this plan, so this area's rulings are `MT-R1`–`MT-R9`, and the three comments the tasks write that name them say so: `// … (v-track plan 2 MT-R1)` in `maintenance-api-errors.ts`, and `(MT-R5)` in two comments of `tests/v-track2-m.test.ts`; no assertion reads those comments. The code comments that say `(v-track MT-R1)` / `(v-track MT-R2)` cite plan 1's form rulings, as plan 1's forms do.

- **R7, assembly decisions** (where two area drafts touched the same thing, or the shared contract moved):
  - **P-R1, numbering and ids.** A1–A7 are Tasks 1–7, O1–O6 Tasks 8–13, U1–U6 Tasks 14–19, D1–D7 Tasks 20–26, M1–M5 Tasks 27–31; Task 0, Task 32 and Task 34 are the controller's, Task 33 the docs. Test names keep the area ids as rehearsed ("(v-track O3)", "(v-track D2)", "(v-track2 M4)"); commit messages carry both: "(v-track plan 2 task 10, O3)". Plan 1's ids keep their meaning (a bare `M-R4` is plan 1's), so area M's own rulings are renamed `MT-R1`–`MT-R9` in its text and in the three comments that name them (`maintenance-api-errors.ts` "(v-track plan 2 MT-R1)", and two "(MT-R5)" comments in `tests/v-track2-m.test.ts`); no assertion reads them, so no test changed. A bare plan-1 task id an area wrote (as M4's supplier keys, M1's refusal line) is written "plan 1 M4", "plan 1 M1's".
  - **P-R2, the areas edit disjoint source files.** Counted on the assembly chain: no file under `src/` is edited by two areas. The files two or more areas edit are `tests/validation-guards.test.ts` (all five), `messages/th.json` and `en.json` (all five), `tests/form-migration-guards.test.ts` (A, O) and `tests/choice-controls-ui.test.ts` (O, M: each task replaces one exact line of its own form's test, no conflict on the chain). Area A's anchors in other shared test files (`assets-sweep-ui`, `asset-forms-ui`, `button-size-switch`, `v-track-f`, `sticky-form-footer-ui`) are A's alone.
  - **P-R3, the guard lists in this plan's order.** Every anchor below held on the assembly chain:
    - `V_FORMS`: area A inserts each row directly above `` `${C}reports/report-preset-controls.tsx`, ``; areas O and D directly after `const V_FORMS: readonly string[] = [`; areas U and M directly before the list's closing `]` (anchored on `]`, the empty line and the `// Required selects …` comment line). Order inside the list does not matter (V1 rejects only a duplicate). End: 43 files.
    - `SELECT_STAR_ONLY`: each task deletes its own row **inside** the block that starts `const SELECT_STAR_ONLY: Readonly<Record<string, number>> = {` (the transfer, bulk-move, scan-check, disposal and plan-form rows read exactly like their `V_SCOPE` rows; include the opening line or a row next to it that is still there). In this order the block shrinks: Task 9 −checkout, 10 −checkin, 11 −transfer, 12 −bulk move, 19 −scan check, 21 −request, 22 −batch, 24 −execution, 29 −plan form (M3's anchor is the two adjacent maintenance rows, which are still both there), 30 −repair record (`: 2,` is unique). After Task 30 the block is `{` then `}` (a `Record` may be empty; `tsc` is clean).
    - FMG `STAR_ONLY`: Task 1 (A1) takes its **variant a** (the checkin entry is still there; the line becomes `` const STAR_ONLY = new Set([`${C}asset-operations/checkin-form.tsx|t("returnDate")`]) ``); Task 10 (O3) takes its **second case** (the checkin entry is the only one left; the line becomes `const STAR_ONLY = new Set<string>([])`, because an empty `new Set([])` is `Set<never>` and `STAR_ONLY.has(…)` fails `tsc`). The other two cases are left out of the tasks.
  - **P-R4, one allowance list for non-validation toasts: `NON_VALIDATION_TOASTS` (FIXED 9), not `RESULT_TOASTS`.** Areas D and M each drafted a list for the same case (an upload result after a save that went through; plan 1 F-R9 left it to the later plans). D runs first, so Task 21 (D2) creates `NON_VALIDATION_TOASTS` and V3's exact count with D2's block, Task 22 (D3) adds its row, and Tasks 30 and 31 (M4, M5) add one row each directly after the list's opening line, `{ count: 1, why: …, ruling: "v-track plan 2 MT-R5" }`, with area M's `why` text; area M's `RESULT_TOASTS` and its V3 change are not written. An exact count per file is the stricter of the two (it fails a second toast of the same text), and it ran green on the chain (`repair-record-actions.tsx` holds one upload toast outside a catch after Task 31). The batch's duplicate-check result toast (named by F-R9) needs no row: Task 2 moves it into its Notice (A-R7).
  - **P-R5, counts on this plan's chain.** `npm test` after each task (tests; pass one fewer, 0 fail, 1 skipped): base 2256 · Tasks 1–25: 2257 … 2281 (+1 each) · Task 26: 2281 (+1 −1) · Tasks 27–31: 2282 … 2286 · the addendum, Tasks 31a–31e: 2287 … 2291 (+1 each) · Task 33: 2292. Messages (leaf keys per locale): 4092 · Task 1: 4091 · Task 2: 4091 · Task 9: 4090 · Task 10: 4087 · Task 11: 4086 · Task 17: 4087 · Task 18: 4088 · Task 22: 4089 · Task 26: 4090 · Task 31: 4091 · Task 31c: 4092 · Task 31d: 4093. Line counts of the shared CRLF files on the chain (each printed twice by `eol.mjs`): `messages/th.json` 4274 at the base, 4273 after Tasks 1–8, 4272 (9), 4269 (10), 4268 (11–16), 4269 (17), 4270 (18–21), 4271 (22–25), 4272 (26–30), 4273 (31, 31a, 31b), 4274 (31c), 4275 (31d, 31e); `tests/validation-guards.test.ts` 190 at the base, 191 … 197 (Tasks 1–7), 197 (8–12), 198 (13), 199 (14), 200 (15), 202 (16), 203 (17), 204 (18–20), 217 (21), 218 (22), 219 (23, 24), 220 (25), 221 (26–29), 222 (30), 224 (31–31e); `tests/form-migration-guards.test.ts` 503 throughout; `tests/choice-controls-ui.test.ts` 150 at the base, 151 (Tasks 9–11), 152 (12–29), 153 (30), 154 (31–31e). Each area's Step 5 numbers are rewritten to these; the areas' own rehearsal records at the end of each area keep the numbers they measured alone.
  - **P-R6, five test files, no shared helper module.** Each area declares its helpers in its own file (A-R12, O-R10, U-R12, D's D2 block, MT-R9); a test file cannot import another (it would run that file's tests again), and a shared `tests/helpers/` module would be a new shared API no area needs. The helpers differ where the forms differ (O's repeated ids, U's formless forms, D's attributes before `onSubmit`, M's `resultToast`).
  - **P-R7, paths.** `<temp>` is the `v2-plan` folder for every area (area D's draft meant the scratchpad above it: its `<temp>/v2-plan/…` paths lost the `v2-plan/` segment and `<temp>/v-sim` became `<temp>/../v-sim`).
  - **P-R8, number rules restated three ways, kept as rehearsed.** A whole number is restated by `pattern(v, /\d+/)` (license seats, A-R4), a local `wholeNumber` (the round's year and sample rate, U-R3), and `step(v, 1)` (the PM days, MT-R2; FIXED 10 lands in Task 28, after areas A and U). Money keeps `range(v, 0)` without its step in the asset and disposal forms (A-R4, D-R11) and adds `step(v, 0.01)` in the maintenance forms (MT-R2). Moving A and U onto `step` would rewrite rehearsed source; the user decides whether one follow-up task makes them one rule (open issues 3 and 12). (Answered 2026-10-18: money is one rule, `decimals`, Task 31c, X-R3; the whole numbers keep their three restatements until the final plan's shared rule, X-R2.)
  - **P-R9, open issues merged.** The areas' open issues are one numbered list at the end ("Open issues"), each with its default (what the tasks write) and a recommendation; none blocks execution. Area U's assembly notes 1 and 2 became open issues 12 and 13; its note 3 (dialog gates and GD3) is in the Global Constraints' form convention and was already followed by areas D and O.
  - **P-R10, the server tasks stay at the head of their areas.** Spec §8 put the round's server change first, and plan 1 landed it first (Tasks 1–10). Plan 2's two server tasks are small and each serves only its own area's forms: Task 20 (D1) runs before the disposal forms and Task 27 (M1) before the maintenance forms, each reviewed before its forms start. Either could move to the front of the plan without a conflict (they touch no file of another area); the order A, O, U, D, M is the user's scope order.

- **R8, the addendum: the user's answers of 2026-10-18 (Tasks 31a–31e; rulings X-R*).** The user answered the open issues with "ตามที่แนะนำ", every recommendation. Five answers change code, each one task after Task 31: 5 → 31a, 12 → 31b, 3 and 14 → 31c, 16 → 31d, 7 → 31e. Issue 15: the toast stays in this plan, and the post-save bug becomes a separate task after this plan merges. The other issues keep the defaults the tasks write. The five tasks share one new LF test file, `tests/v-track2-x.test.ts`: Task 31a creates it with its header (the resolve-hook stand-ins of `tests/v-track-s.test.ts` under `globalThis.__vTrack2X`, and `read`, `messages`, `say`), the later tasks append one test each (P-R6: no test imports a test file). Ids: 31a carries O7 (area O's next id), 31d A8 and 31e U7; 31b and 31c belong to no area, so their test names and commit messages say only "(v-track plan 2 task 31b)" and "(v-track plan 2 task 31c)".
  - **X-R1, checkin's two refusals name their field (31a, O7; open issue 5; spec §6.2).** Plan 1 S10's shape, inline as checkout's `conditionBefore`: "Invalid return condition for check-in" adds `fieldErrors: { conditionAfter: "invalidReturnCondition" }`, "Invalid return status for check-in" adds `{ nextStatusId: "invalidReturnStatus" }`; the codes are their own catalog keys (S-R7), so the field reads the sentence the toast showed. Status, message and `code` stay. The checkin form does not change: Task 10 holds both keys, shows them under the selects and hands a refusal back from its review (O-R1).
  - **X-R2, zod's `.int()` (31b; open issue 12; S-R2).** `invalid_type` with `expected: "int"` maps to `invalidNumber`; a missing whole number reports `expected: "number"` and stays `required`. The client restatements stay (U-R3's `wholeNumber`, A-R4's seats `pattern`, MT-R2's `step(v, 1)`); one shared whole-number rule is the final plan's (the recommendation's second half).
  - **X-R3, one money rule (31c; open issues 3 and 14; spec §4.5, §6.3).** `decimals(value, places)` (FIXED 12): every money field writes `range(v, 0) ?? decimals(v, 2)` and reads `common.validation.tooManyDecimals`. The code is a `RuleCode` beside `endBeforeStart`, not a `FieldErrorCode`, because the server never sends it; no server rule. "Every money field of plan 2's forms" is every control with `step="0.01"` under `src/components`, eight files: the asset form (price, document total), the batch (price), the disposal request, batch, decision and execution (sale and salvage values), the repair record form and its dialogs (cost). The decision dialog's two estimated values are money fields like the request's, so they take the rule too (the test compares the list with the source). The maintenance money fields drop `step(v, 0.01)`; whole numbers keep `step()` / `invalidNumber`. Replaces the money parts of A-R4, D-R11, MT-R2 and P-R8.
  - **X-R4, the batch's row-limit gates (31d, A8; open issue 16; spec §4.4).** A-R6's gate: "add row" at 100 rows (`atRowLimit`), the two "remove row" buttons at 2 rows (`atRowMinimum`) and "check duplicates" while the rows hold a duplicate (`hasClientDuplicates`) become `aria-disabled` with `aria-describedby="asset-batch-row-count"`, and each handler returns first; the row count line takes the id and the limits (`asset.batchRowLimits`). The duplicate check points at the same line, as the answer says; the duplicates themselves are named by the live errors under the rows (A-R7). The print queue's two buttons go to the final plan's sweep.
  - **X-R5, the scan check's photo section (31e, U7; open issue 7).** Pressing the waiting save opens the note-and-photo section (`setExtrasOpen(true)`) before the gate's return, so the picker shows; the gate, its Notice and focus stay as Task 19 left them.

## Review Focus

Five failure modes that would bite a person. Each is held by assertions in its owning task's Step 1 block or a guard, and Task 32 checks it on the app.

1. **A server refusal from a review dialog lands on a field behind the closing dialog, or nowhere (Tasks 8–11, 2, 4, 22, 26).** If the field took focus inside the dialog's 200 ms exit, Radix's focus trap would pull it back and the page behind would still be `aria-hidden`; if a step that holds the field is unmounted, focus would find nothing. **Tests:** Task 8 (O1) runs the real `waitForDialogToClose` with a scripted frame queue (dialog gone → its focus return → resolve; at once with no dialog; gives up after `frames`); Tasks 9–11 pin `reveal: leaveReview` with `setReviewOpen(false)` inside it; Task 2 pins the batch's `reveal` that leaves `reviewing`; Task 4 the install's return to `details`; Tasks 22 and 26 the disposal batch's and the bulk execution's return to their edit and review steps. Task 32: a refusal answered on each review by a stand-in body (`route.fulfill`, Task 32 Step 5; no request reaches the server).
2. **A gate that hides its reason, or a content rule left as a disabled button (Tasks 1, 3, 5, 6, 13, 17–19, 22–26, 31d).** A `disabled` button drops out of the Tab order, so its reason is never read; a content rule kept as a gate never says which field is wrong. **Tests:** each owning test pins the `aria-disabled`/`aria-describedby` pair, the reason's id on a visible element and the handler's early `return` (the asset form's `saveBlockedBy`, the import's counts, the cancel dialog's blockers, the finding close's evidence line as the body's last line, batch review, the scan check's photo Notice, the disposal batch's assets line, the execution's evidence Notice, the two bulk dialogs' zero-eligible Notices, the batch's row count line); and that the content gates are gone (status correction's 5 characters, bulk update's "one of the two", the disposal decision's rejection reason, bulk execution's shared values and permanent confirmation). Task 32: every gate at 1440 and 375, focusable, its reason read.
3. **A refusal about a field the form hides or renders twice focuses nothing and fails silently (Tasks 2, 9, 21–26, 30).** **Tests:** D-R4's `shownFields` in each conditional disposal form (pinned: `check` drops a hidden key, `focusFirstError` passes the shown order); MT-R4's `fieldOrder(values, needsReporter)` and the "more details" `reveal` (Task 30); the batch's `idFor` that picks the rendered row (cards or table, Task 2); checkout's four server keys on one control (O-R3, Task 9). In each, the fall-through line to today's toast or Notice is pinned (spec §4.1.3).
4. **A live warning shown twice, or an under-field error that hides a live one (Tasks 1, 2; U8).** **Tests:** Task 1 pins the asset tag and serial `Field`s with one `error=` that prefers the live duplicate line and falls back to the hook's message (one line, `liveError` kept); Task 2 pins the batch rows' `liveError` with `asset.batchRowDuplicate` and that the warning box listing duplicates is gone, and the duplicate-check result's Notice with `role="status"` instead of a toast.
5. **The shared guard lists drift (every form task).** A form moved without its `V_FORMS` row, a star-only select left behind, a toast kept without a reason, or a list edited out of order would let a validation toast or the browser's bubble come back. **Tests:** V1–V5 with `V_FORMS` +28 files, `SELECT_STAR_ONLY` deleted row by row to empty (V5 compares exact counts), V3's exact `NON_VALIDATION_TOASTS` counts (FIXED 9), FMG's `STAR_ONLY` meta-test (a stale entry fails) emptied by Tasks 1 and 10, and `CONSTRAINT_FLOORS` (checkin's floor raised). The assembly check ran the whole chain with these guards green after every conflict (header).

The date pairs (spec §7.4) are held by their tasks' tests: Task 1 (warranty, on edit only when a date changed: `original`), Task 2 (warranty always), Task 7 (`min`/`max` on the queue filter), Task 14 (`max`/`min` and `notBefore`, both errors cleared together), Task 31 (`min={details.reportedDate}` and `notBefore` with the domain message).

## File structure

| File (line endings) | What changes | Task |
|---|---|---|
| `c/assets/asset-form.tsx` (CRLF) | errors under the field, gates with reasons, warranty pair, license seats, add-button checks | 1 |
| `c/assets/asset-batch-form.tsx` (CRLF) | `common.*` / `rows.<i>.*` errors, live row duplicates, review hand-back, warranty pair | 2 |
| `c/assets/asset-register-table.tsx` (CRLF) | the bulk update dialog's errors, apply enabled | 3 |
| `c/assets/asset-component-manager.tsx` (CRLF) | install details and removal as forms, back to details | 4 |
| `c/assets/asset-status-correction-button.tsx` (CRLF) | the reason on submit, confirm enabled | 5 |
| `c/assets/asset-import-preview-panel.tsx` (CRLF) | the import waits with its reason | 6 |
| `c/assets/asset-label-print.tsx`, `asset-label-batch-tool.tsx` (CRLF) | the toolbar form; the queue filter's `min`/`max` | 7 |
| `src/lib/field-focus.ts` (CRLF) | `waitForDialogToClose` appended | 8 |
| `c/asset-operations/checkout-form.tsx`, `checkin-form.tsx`, `transfer-form.tsx`, `bulk-move-form.tsx`, `transaction-cancel-dialog.tsx` (CRLF) | errors, review hand-back, the return date, the destination, the cancel reason and blocked gate | 9, 10, 11, 12, 13 |
| `c/audit/audit-round-form.tsx`, `audit-round-cancel-button.tsx` (CRLF) | errors, the date pair; the cancel reason | 14, 15 |
| `c/audit/audit-mark-not-found-button.tsx`, `audit-scan-component-missing-dialog.tsx` (CRLF) | the form pattern | 16 |
| `c/audit/audit-finding-review-actions.tsx` (CRLF) | three dialogs, close waits for evidence | 17 |
| `c/audit/audit-findings-batch-actions.tsx`, `c/ui/confirm-text-dialog.tsx` (CRLF) | batch waits for a selection; `noValidate` | 18 |
| `c/audit/audit-scan-check-form.tsx` (CRLF) | the location's error, focus in the sheet, the photo gate | 19 |
| `src/app/api/disposal-requests/[id]/route.ts`, `src/lib/disposal-evidence-exception.ts` (CRLF); `src/lib/disposal-bulk-execution.ts`, `src/lib/disposal-bulk-execution-service.ts` (mixed) | evidence and bulk-row `fieldErrors` | 20 |
| `c/disposal/disposal-request-form.tsx`, `disposal-asset-picker.tsx` (CRLF) | errors, the picker's `id`/`error` | 21 |
| `c/disposal/disposal-batch-form.tsx` (CRLF) | the edit step a form, assets a prerequisite | 22 |
| `c/disposal/disposal-decision-button.tsx`, `disposal-execution-button.tsx`, `disposal-bulk-approval.tsx` (CRLF) | errors, gates tied to Notices | 23, 24, 25 |
| `c/disposal/disposal-bulk-execution.tsx`, `D/disposal/page.tsx` (CRLF); `src/lib/disposal-bulk-execution-ui.ts` (mixed) | errors per step, back to review; `validateHistoricalException` deleted | 26 |
| `src/lib/maintenance-api-errors.ts`, `repair-record-service.ts`, `maintenance-plan-service.ts` (CRLF) | reporter and vendor `fieldErrors` | 27 |
| `src/lib/validation-rules.ts` (CRLF) | `step()` | 28 |
| `c/maintenance/maintenance-plan-form.tsx`, `repair-record-form.tsx`, `repair-record-actions.tsx` (CRLF) | errors, groups, more details, three dialogs, the return date | 29, 30, 31 |
| `src/app/api/assets/[id]/checkin/route.ts` (CRLF) | the return condition and status refusals' `fieldErrors` | 31a |
| `src/lib/field-errors.ts` (CRLF) | `.int()` → `invalidNumber` | 31b |
| `src/lib/validation-rules.ts` (CRLF); `c/assets/asset-form.tsx`, `asset-batch-form.tsx`, `c/disposal/disposal-request-form.tsx`, `disposal-batch-form.tsx`, `disposal-decision-button.tsx`, `disposal-execution-button.tsx`, `c/maintenance/repair-record-form.tsx`, `repair-record-actions.tsx` (CRLF) | `decimals()`; every money field `range(v, 0) ?? decimals(v, 2)` | 31c |
| `c/assets/asset-batch-form.tsx` (CRLF) | the row-limit and duplicate-check gates, the row count line | 31d |
| `c/audit/audit-scan-check-form.tsx` (CRLF) | the waiting save opens the photo section | 31e |
| `messages/th.json`, `messages/en.json` (CRLF) | the keys of "Messages" | 1, 2, 9, 10, 11, 17, 18, 22, 26, 31, 31c, 31d |
| `tests/validation-guards.test.ts` (CRLF) | `V_FORMS` rows; `SELECT_STAR_ONLY` rows deleted; `NON_VALIDATION_TOASTS` and V3 | every form task; 21 (the list), 22, 30, 31 (rows) |
| `tests/form-migration-guards.test.ts` (CRLF) | `STAR_ONLY` emptied; checkin floor 4 → 5 | 1, 10 |
| `tests/choice-controls-ui.test.ts` (CRLF) | one pin each | 9, 12, 30, 31 |
| `tests/v-track2-a.test.ts`, `-o`, `-u`, `-d`, `-m`, `-x` (new, LF) | one test per task | 1–7 · 8–13 · 14–19 · 20–26 · 27–31 · 31a–31e |
| pins of the addendum: `v-track-f` (CRLF), `v-track2-a`, `v-track2-d`, `v-track2-m` (LF) (31c); `asset-forms-ui` (CRLF) (31d); `v-track2-u` (LF) (31e) | each in its task's Files line | 31c–31e |
| pins (each in its task's Files line): `asset-form-sticky-actions` (LF), `asset-forms-ui`, `assets-sweep-ui` (LF), `sticky-form-footer-ui` (LF), `v-track-f`, `asset-register-table-ui`, `asset-operation-status-policy`, `asset-status-correction-ui`, `asset-register-ux`, `asset-label-print-ui`, `button-size-switch` (LF), `asset-handover-checkout` (LF), `asset-handover-checkin` (LF), `asset-operation-confirmation-ui`, `asset-transaction-cancellation-ui`, `operations-sweep-ui` (LF), `audit-round-form-ui`, `audit-pages-sweep-ui` (LF), `audit-round-cancellation`, `confirm-text-dialog-ui`, `list-pages-ui`, `audit-scan-check-ui`, `audit-scan-sweep-ui`, `disposal-sweep-ui`, `disposal-bulk-approval`, `disposal-bulk-execution-ui`, `disposal-bulk-execution-ui-state` (mixed; one test deleted), `pm-plans-ui`, `maintenance-sweep-ui` (LF), `repair-record-ui`, `repair-record-detail-ui` | each in its form's task | 1–31 |
| `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md`, `tests/v-track-docs.test.ts` (CRLF) | the plan's section and entry; plan 2's record test appended, plan 1's order assertion moved | 33 |

No change (checked): `src/components/ui/operation-review-dialog.tsx`, `accessible-dialog.tsx`, `use-field-errors.ts`, `field-group.tsx`, `field.tsx`, `searchable-select.tsx`, `maintenance-option-select.tsx`, `audit-scan-check-field.tsx` (plan 1 Task 16 already passes `id`/`error`); the audit scan workspace and its offline queue (U-R5, spec §3 non-goal); every route except Tasks 20, 27 and 31a's; `prisma/`; `DESIGN.md`, docs/14, `.impeccable/design.json` (the final plan); `c/admin/system-settings-form.tsx` (plan 3); `tests/list-frame-guards.test.ts`, `tests/ui-overlay-guards.test.ts`, `tests/visual-foundation-guards.test.ts` (run green after every task).

## Interfaces between tasks

| Made in | What | Used by |
|---|---|---|
| plan 1 (merged) | FIXED 1–7 as amended; `useFieldErrors` (`focusFirst(order, { idFor, reveal })`), `useValidationMessage`, the rule helpers, `common.validation.*`, `FieldGroup`, `Field liveError`, SearchableSelect `data-invalid`, `MaintenanceOptionSelect`/`AuditScanCheckField` `id`/`error`, `FieldRefusalError`, `disposalApiError(code, error, status, fieldErrors?)`, the batch's `buildAssetBatchDuplicateFieldErrors`, `V_SCOPE`/`V_FORMS`/`SELECT_STAR_ONLY`, V1–V5 | every task |
| Task 1 (A1) | `tests/v-track2-a.test.ts` with `C`, `read`, `escape`, `messages`, `functionBody`, `fieldTable`, `assertMovedForm`; FMG `STAR_ONLY` left with the checkin entry only | Tasks 2–7; Task 10 (P-R3) |
| Task 2 (A2) | the batch's review hand-back (`reveal` leaving `reviewing`); live row duplicates | Task 32 |
| Task 8 (O1) | `waitForDialogToClose` (FIXED 8); `tests/v-track2-o.test.ts` | Tasks 9–11 |
| Task 9 (O2) | `assertOperationForm`, `validateBody`, `messagesOf`, `C`, `escape` in `tests/v-track2-o.test.ts` | Tasks 10–13 |
| Task 10 (O3) | FMG `STAR_ONLY` = `new Set<string>([])`; checkin floor 5 | Task 32 (counts) |
| Task 14 (U1) | `tests/v-track2-u.test.ts` with `read`, `escape`, `validateBody`, `assertMigratedForm` | Tasks 15–19 |
| Task 20 (D1) | FIXED 11: the evidence and bulk-row `fieldErrors`; `tests/v-track2-d.test.ts` | Tasks 24, 26 |
| Task 21 (D2) | `NON_VALIDATION_TOASTS` and V3's exact count (FIXED 9); the area's test helpers (`C`, the form regex) | Tasks 22–26; Tasks 30, 31 (rows, P-R4) |
| Task 27 (M1) | `reportedById`, `vendorId` field refusals (`reporterNotFound`, `vendorNotFound`, `pmVendorNotFound`, `required`); `tests/v-track2-m.test.ts` header | Tasks 29–31 |
| Task 28 (M2) | `step(value, size)` (FIXED 10) | Tasks 29–31 (from Task 31c only the PM days) |
| Task 29 (M3) | M's `assertMigratedForm` (with `resultToast`) in `tests/v-track2-m.test.ts` | Tasks 30, 31 |
| Task 31a (O7) | checkin's `fieldErrors` (`conditionAfter`, `nextStatusId`); `tests/v-track2-x.test.ts` with its header (`C`, `read`, `messages`, `lookup`, `say`, the route stand-ins, `load`, `stubDb`) | Tasks 31b–31e; Task 32 (stand-ins) |
| Task 31c | FIXED 12 `decimals(value, places)`, `RuleCode` `"tooManyDecimals"`, `common.validation.tooManyDecimals` | Task 32; any later money field (plan 3, the final plan) |
| Task 31d (A8) | `asset-batch-row-count` with `asset.batchRowLimits`; `atRowLimit`, `atRowMinimum` | Task 32 |
| Tasks 1–31, 31a–31e | the code and guard end state (header, "Assembly check", "Addendum") | Tasks 32, 33 |
| Task 32 | `.superpowers/sdd/v-track-plan2/task-32-findings.md` | Task 33 |
| Task 33 | the handoff section and the changelog entry | Task 34 |

---

### Task 0: Branch, baseline, counting evidence and before evidence (controller runs this task, not an implementer)

**Files:**
- Create then delete: a launch configuration for the dev server only while it runs; never committed. If `.claude/launch.json` already holds another session's configuration, add your own entry with its own name and port, and remove only that entry afterwards.
- Evidence (git-ignored): `.superpowers/sdd/screenshots/v-track-plan2/before/`, `.superpowers/sdd/v-track-plan2/task-0-baseline.md` and `.superpowers/sdd/v-track-plan2/task-0-counts/`.

**Interfaces:**
- Consumes: `feat/v-track-2` at the plan commit (on `e1caa29`).
- Produces: the baseline numbers, the counting evidence, and the before images and behaviour of the plan-2 forms, which Task 32 compares against.

- [ ] **Step 1: Branch and base.**
  - From `master` at `e1caa29`: `git switch -c feat/v-track-2` (the controller's one branch command; implementers never switch), then commit this plan alone: `git add docs/superpowers/plans/2026-10-18-v-track-plan2.md` and `git commit -m "docs(forms): V track plan 2 (assets, operations, audit, disposal, maintenance)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.
  - `git rev-parse --abbrev-ref HEAD` → `feat/v-track-2`; `git diff --name-only e1caa29 HEAD` lists only this plan.
  - `git status --short` → only the untracked folders and files of the Global Constraints.
- [ ] **Step 2: Baseline.** `npm test` (expected 2256 tests, 2255 pass, 0 fail, 1 skipped), `npx tsc --noEmit` (clean), `npm run lint` (0 errors; 146 warnings, every one under `.agents/`). Record the numbers in `task-0-baseline.md`.
- [ ] **Step 3: Temp files.** Check `<tools>/eol.mjs` against plan 1's block (the same file); check that `<temp>/area-A-edits/A1.md` … `A7.md` exist; hand the paths of `<temp>` and `<tools>` to every implementer. The change files of the message tasks are written by those tasks.
- [ ] **Step 4: Counting evidence at `e1caa29`** (read-only `git grep`, `node <temp>/asm/counts.mts .` with the repo root as the working directory, and `node <tools>/eol.mjs`; save the output under `task-0-counts/`; a difference stops the plan, because an inventory row would be wrong):
  - `node <temp>/asm/counts.mts .` prints: toasts outside a catch 61 in 19 files; `<form … noValidate>` in `src` 17; `messages/th.json` and `en.json` 4092 leaf keys; `V_FORMS` 15; `SELECT_STAR_ONLY` 14 in 10; FMG `STAR_ONLY` the three entries (checkin return date, license total seats, component role);
  - the inventory of each area at `e1caa29` (spec §5 #1–#33): 33 forms in 28 files of `V_SCOPE` (the assets, operations, audit, disposal and maintenance rows), each submit and `<form>` line as the area tables give them; the toasts the areas name (asset form 12, batch 3 with the duplicate-check result, component manager 1, checkout 4, checkin 4, transfer 1, bulk move 1, round cancel 1, the two disposal and two maintenance upload-result toasts);
  - `git ls-files --eol` of every file the File structure names: as the Global Constraints list them (9 LF, 4 mixed, the rest CRLF).
- [ ] **Step 5: Dev server.**
  - If `preview_list` shows a dev server of this checkout on `:3000`, use it and do not stop it. Otherwise add a launch configuration `name: "asset-v2-dev-3100"`, `runtimeExecutable: "node"`, `runtimeArgs: ["node_modules/next/dist/bin/next", "dev", "-p", "3100"]`, `port: 3100`, `autoPort: false` (if another session's server holds 3100, use 3102 and say so in the baseline file), and start it with `preview_start`.
  - Memory says `.env` points at `asset_management_dev` / `asset_dev`. Confirm this without opening the file: `/th/admin/readiness` shows the database checks. If anything suggests the production database, stop.
  - Log in with the seed admin of `prisma/seed.ts`; do not echo the password. Use your own browser tab.
- [ ] **Step 6: Write nothing — abort every non-GET request.** Before opening any plan-2 form, intercept the browser context's requests (Playwright `page.context().route("**/*", route => route.request().method() === "GET" ? route.continue() : route.abort())`, with the scan exception below), so that no POST, PUT, PATCH or DELETE leaves the browser for the rest of this task (the login's own request comes before it). Prove it first as Task 32 Step 5 does: `await fetch("/api/v-track-probe", { method: "POST" }).catch((error) => error.name)` from the page must show in your log as aborted; if it does not (a service worker in the way), set the context up again with `serviceWorkers: "block"` before opening any form. One route is fulfilled instead of aborted: `POST /api/audit-rounds/<id>/scan` answers a stand-in 400 `{ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { actualLocationId: "required" } }` (`route.fulfill`), because an aborted scan is a network error, which the scan workspace keeps in its offline queue and sends again later (at `e1caa29` the scan check is not a form element, so an empty check may send its request). Log each aborted request with its method and URL; expected: only the ones an empty or invalid submit of this step sends. Never submit a checkout or checkin with a photo or a signature, even with the abort on.
- [ ] **Step 7: Before evidence** at 1440 and 375, light and dark (the toggle beside the language button), for every plan-2 form: the asset create and edit (`/th/assets/new`, one edit page), the batch (edit step and review), the register's bulk update dialog, component install (each step) and removal, status correction, the import wizard, label print and the print queue filter; checkout, checkin, transfer, bulk move, the transaction cancel dialog (with and without blockers); the audit round form, round cancel, mark not found, the finding dialogs (decision, action plan, close), batch review, the scan check (aside at 1440, sheet at 375) and its component-missing dialog; the disposal request, batch (both steps), decision, execution, bulk approval, bulk execution (each step); the PM plan form, the repair record form, the complete, cancel and edit dialogs:
  - a screenshot of the form as it opens to `before/<form>-<theme>-<width>.png`;
  - the empty submit (the abort holds any request it sends): which validation toast or browser bubble shows, which field it names, and that no error shows under any field;
  - every gate as it is: the asset save while a duplicate check runs and on a protected status change, bulk update's apply with neither value, status correction's confirm with 4 characters, import with no ready row, the cancel dialog's confirm when blocked, the finding close with no evidence, batch review with nothing selected, the scan check's save with a required photo missing, the disposal batch's review with one asset, the decision's save on a rejection without a reason, the execution's save without evidence, the two bulk dialogs with nothing eligible, bulk execution's review without shared values and its confirm with the box unticked, the batch's add row at 100 rows, remove row at 2 and check duplicates with a duplicate in the rows (Task 31d), the scan check's save with a required photo missing and its note-and-photo section closed (Task 31e);
  - a money field with three decimals (12.345) in the asset form's price and the repair record's cost (Task 31c);
  - the date pairs as they are: a warranty end before its start, a round end before its start, a queue created-to before created-from, a repair return date before the reported date (the pickers allow each today).
- [ ] **Step 8: Clean up.** Stop your server if you started one and remove your launch configuration (only yours). In your browser context, `indexedDB.deleteDatabase("asset-system-audit-offline")` and remove every `localStorage` key that starts with `audit-offline-scan:` (nothing should be there; say so in the baseline file if something was). `git status --short` shows what Step 1 showed. No commit in this task besides Step 1's plan commit.

---

## Area A: the asset forms show their errors under the field, and the server's refusals land on the same fields (Tasks 1–7, A1–A7)

Spec `docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md` (approved 2026-10-17): §2 U1, U2, U4, U6, U8, U9; §3 G1–G3, G5 and the anti-goals; §4.1–§4.5; §5 forms #1–#8 (assets); §7.1–§7.4; §11 calls 1, 2, 6, 7, 8. Area A runs **first** in plan 2, on plan 1's contract as merged at `e1caa29` (FIXED INTERFACES 1–7 as amended, F-R1–F-R9, M-R1–M-R14). It uses `useFieldErrors` / `useValidationMessage` (`src/components/ui/use-field-errors.ts`), the rule helpers of `src/lib/validation-rules.ts`, `Field error=` / `liveError`, `FieldError`, `SearchableSelect id= error=`, and the guard file `tests/validation-guards.test.ts` (`V_FORMS`). It adds **no shared API**: every new name is local to its form file.

What this area does, in one line each:
- **A1** the asset form (#1): its 12 validation toasts become errors under their fields (9 in the save, 3 in the purchase-document and photo add buttons); the license's total seats lose their star (spec §11 call 8); the warranty pair holds, on edit only when one of its dates changed (spec §7.4); the duplicate tag and serial stay live (U8); the protected-status change and the running duplicate check keep their gate, focusable and named (spec §4.4).
- **A2** the asset batch form (#2): the shared fields and every row show their errors with the server's keys (`common.<field>`, `rows.<i>.<field>`, S-R12); the duplicate warning box moves under each row as a live error (U8); a server refusal leaves the review step (spec §4.2); the warranty pair always holds.
- **A3** the register's bulk update dialog (#3): "one of location or custodian" and the reason are errors on submit with the server's own code; apply is enabled.
- **A4** component install and removal (#4, #5): the details step and the removal dialog become `<form noValidate>`s; the role gets its star and its rule; a server refusal at the review goes back to the details step (spec §4.2).
- **A5** status correction (#6): the reason's 5 characters become an error on submit (content gate, spec §4.4); the panel becomes a form; its confirm is enabled.
- **A6** import wizard (#7): two prerequisites (a picked file, a ready row), no typed field: the import waits focusable, tied to the counts beside it.
- **A7** label print (#8) and the print queue filter: the toolbar becomes a form whose optional reason shows its error under the row; the queue's created-from/to hold their order (spec §7.4).

Nothing else changes: no server change (plan 1 built every key this area reads), no migration, no new dependency, no `EXEMPT` row, no `CONSTRAINT_FLOORS` change (no attribute is removed or added), no `SELECT_STAR_ONLY` change (no asset file holds a row: the asset forms' `SearchableSelect`s are optional), no DESIGN.md change. FMG `STAR_ONLY` loses its two asset-form entries in A1 (A-R4). Messages: A1 +1 −2, A2 +1 −1 (4092 → 4091 → 4091 leaf keys per locale).

Line numbers are of `e1caa29` (plan 1 merged). No other area of plan 2 edits these source files; the shared test files are listed in "Interfaces with the other areas". Find every site by its quoted text.

**Area rehearsal (done, 2026-10-18).** A1–A7 ran in order, one commit each, every step as written, in `<temp>/sim-A` (a clone of `<temp>/../v-sim` at `v2-base` = `e1caa29`, `core.autocrlf=true`, its own `node_modules`; the 372 files of `src`, `tests`, `messages` and `scripts` that are `i/lf w/lf` in the real checkout were copied over the clone's CRLF copies first, so working-tree line endings match `D:/Antigravity/asset-system` file by file), branch `a-dry`: A1 `b47bbce4` · A2 `1083ddb9` · A3 `5d823f7e` · A4 `c0d16c1c` · A5 `0c8bbafc` · A6 `94744074` · A7 `e511ab3c`. Every Step 2 failed with the message it names (checked by running the final test file at each task's parent commit in a detached worktree, `<temp>/sim-A-base`); every "after Step 3, before Step 4" list failed exactly as listed; every task ended with `npm test` 0 fail and 1 skipped at the count its Step 5 gives, `npx tsc --noEmit` clean and `npm run lint` 0 errors and 146 warnings, all under `.agents/`; every edited file kept its working-tree line endings and the new test file is LF.
- **What the rehearsal corrected in this text:** A1's two drop zones keep `file=` and `onFileChange=` as their first props, so `tests/file-evidence-ui.test.ts` ("The two drop zones themselves do not change") needs no edit; A2's four row `Field`s stay on one line each, so `tests/asset-batch-form-layout.test.ts` (it looks for the substring `Field label={t("batchAssetTag")}`) needs no edit; A5's form puts `onSubmit` first (`<form onSubmit={handleSubmit} noValidate id={panelId} …>`), as FIXED 6 reads; A7's reason box keeps `border-input` in its class string and adds the error look through `cn`, which drops `border-input` (tailwind-merge), so the tape box's pins hold.
- **Environment note for every clone of `v-sim`:** `v2-base` there references objects `v-sim` does not hold (tree `87ef812d…` of `src/components/pwa`), so the first `git commit` in a fresh clone fails with "invalid object … Error building trees". `git fetch -q --refetch D:/Antigravity/asset-system master` in the clone (a read of the real checkout) brings them; the A1 commit above was made before that fetch and is intact after it (`git fsck --connectivity-only` clean).

### Inventory (A at `e1caa29`)

| # | Form · file | Submit · `<form>` | Today (validation · server errors) | Decision | Task |
|---|---|---|---|---|---|
| 1 | asset form `c/assets/asset-form.tsx` | `handleSubmit :542` · `:842` | native `required` ×12 (SelectField `:1475`, status `:1041`, condition `:1067`, name `:861`, template fields `:1612,:1627`), `maxLength` ×10, `min="0"`; **9 validation toasts** in the save `:545,:549,:553,:560,:564,:568,:572,:579,:584`, **3** in the add buttons `:668,:672,:699`; **gate** `disabled={isProtectedStatusChange \|\| duplicateState.checking \|\| …Exists}` `:1436` (no reason while checking); live duplicate errors `:844,:896` (`liveError`, F5); total seats star-only `:976` (FMG `STAR_ONLY`); warranty pair `:1131/:1134` no `min`, no rule anywhere · `throw new Error(result?.error …)` `:601` → `apiError.toast :656`; protected-status string match `:655` (in the catch) | errors under the fields (A-R2, A-R3, A-R4, A-R5); serial `duplicate` (S10), seats `licenseSeatsExceeded` (catalog) | A1 |
| 2 | batch `c/assets/asset-batch-form.tsx` | `handleSubmit :576` (2 steps: `reviewing :586`) · `:619` | native `required` ×10, `maxLength` ×5; **toasts** `:579` (duplicates), `:583` (license); duplicate box `:823-829` (a warning Notice listing values); check-duplicates **result toast outside a catch** `:522` (F-R9); **gate** `disabled={hasClientDuplicates}` `:1061`; warranty pair `:752/:755` · `getErrorMessage :1071` → `apiError.toast :609` | the server's keys `common.*` / `rows.<i>.*` (S-R12); duplicates live under each row; the review hands back (A-R7) | A2 |
| 3 | bulk update `c/assets/asset-register-table.tsx` (dialog `:696`) | `submitBulkUpdate :372` · `:704` | reason `required` + `maxLength` `:736`; **silent return** `:374`; **gate** `disabled={!toLocationId && !toCustodianId}` `:751` (a content rule: the server's `bulkUpdateFieldRequired` under `toLocationId`) · `apiError.toast :395` | errors on submit, apply enabled (A-R8) | A3 |
| 4 | component install `c/assets/asset-component-manager.tsx` (Steps `:278`) | `openReview :204`, `installComponent :212` · none | role has no star, no client rule (server `min(1)`); **toast** `labels.error` `:206`; **silent return** `:213` · `apiError.toast :234` | the details step a form, back to it on a refusal (A-R9) | A4 |
| 5 | component removal (same file, dialog `:536`) | `onConfirm :562` · none | reason `maxLength={500}`, optional (server `optionalText`) · `apiError.toast :256` | a form with its one rule, no server step (A-R9) | A4 |
| 6 | status correction `c/assets/asset-status-correction-button.tsx` | `submitCorrection :35` · none | no star, no hint; **content gate** `disabled={reason.trim().length < 5}` `:95` (server 5–500) · `setError` → `ApiErrorText :84` | an error on submit, confirm enabled (A-R10) | A5 |
| 7 | import wizard `c/assets/asset-import-preview-panel.tsx` (Steps `:224`) | `handleFile :136` (upload on pick), `confirmImport :169` · none | no file → `setError(fileRequired)` `:137-138` (shown); **gate** `disabled={readyRows === 0}` `:354`, silent return `:170` · server `_form` file rules (S-R7) → the danger Notice | prerequisites keep their gate and say why (A-R6) | A6 |
| 8 | label print `c/assets/asset-label-print.tsx` | `handlePrint :85` · none | reason `maxLength={500}` `:226` (optional; server `max(500)`); **silent return** `:86` · fixed `recordError` | the toolbar a form, the reason's error under the row (A-R11) | A7 |
| — | print queue filter `c/assets/asset-label-batch-tool.tsx` | a filter (GET), not in `V_SCOPE` | created from/to `:422/:429`, no `min`/`max` | `max`/`min` only (spec §7.4) | A7 |

Counted at `e1caa29` by the rehearsal (the guard's readers): toasts outside a catch in these files 12 (asset form) + 3 (batch) + 1 (component manager) = 16 (the batch's `:522` is the F-R9 non-validation one); after A7, 0 except the asset form's catch toast for the server's protected-status refusal (inside `catch`, V3 allows it). `<form … noValidate>` in `src`: 17 → 24 (A1, A2, A3 one each, A4 two, A5 and A7 one each).

Rulings: R2 of "Rulings of this plan" (A-R*).

### Interfaces with the other areas of plan 2

- **`V_FORMS` (`tests/validation-guards.test.ts`):** every area A task inserts its row **directly above the line** `` `${C}reports/report-preset-controls.tsx`, `` (plan 1's last row; the edit's old string is that one line, which occurs once in the file), so the edit works whatever rows other areas inserted before or after: old `` `  \`${C}reports/report-preset-controls.tsx\`,` `` → new two lines, the task's row then that line. Other areas can use the same anchor.
- **FMG `STAR_ONLY` (`tests/form-migration-guards.test.ts:53`):** A1 removes the two asset-form entries. If area O (checkin) has not removed `checkin-form.tsx|t("returnDate")` yet, old is the three-entry line and new keeps the checkin entry (A1 Step 4, variant a); if it has, old is the two-entry line and new is `const STAR_ONLY = new Set<string>([])` (variant b; `Set<string>` because an empty `new Set([])` is `Set<never>` and `STAR_ONLY.has(…)` would not type-check). Whichever area empties the set writes `new Set<string>([])`.
- **`SELECT_STAR_ONLY`:** area A has no row in it and does not edit it.
- **Messages:** A1 and A2 change only `asset.*` keys through their own change files (`<temp>/a1-messages.json`, `<temp>/a2-messages.json`); order-independent.
- **Shared test files area A edits** (by single-line or short exact anchors that other areas' forms do not touch): `tests/assets-sweep-ui.test.ts` (A1 `:139`, A2 `:154`, A5 `:31`), `tests/asset-forms-ui.test.ts` (A1, A2, A4), `tests/button-size-switch.test.ts` (A7 `:22`), `tests/v-track-f.test.ts` (A1 `:200-201`), `tests/sticky-form-footer-ui.test.ts` (A1 `:33`).
- **Counts:** +1 test per task (7 in all); the absolute numbers below are with area A first on `e1caa29` (2256 tests, 2255 pass, 1 skipped). If another area runs first, add its delta; a different **delta** means stop and report.

---

### Task 1 (A1): The asset form shows its errors under the field and names why save waits (`c/assets/asset-form.tsx`)

Spec §4.1, §4.3, §4.4, §4.5, §5 #1, §7.1, §7.4, §11 calls 2, 6, 8; U8. A-R1–A-R5.

**Files:**
- Modify: `src/components/assets/asset-form.tsx` (CRLF); `messages/th.json`, `messages/en.json` (CRLF, through `scripts/messages-edit.mjs`)
- Pins: `tests/asset-form-sticky-actions.test.ts` (LF), `tests/asset-forms-ui.test.ts` (CRLF), `tests/assets-sweep-ui.test.ts` (LF), `tests/sticky-form-footer-ui.test.ts` (LF), `tests/v-track-f.test.ts` (CRLF)
- Guards: `tests/validation-guards.test.ts` (CRLF, `V_FORMS`), `tests/form-migration-guards.test.ts` (CRLF, `STAR_ONLY`)
- Test: `tests/v-track2-a.test.ts` (new, LF)

**Changes at e1caa29:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:14` | `import { Field } from "@/components/ui/field"` | `import { Field, FieldError } from "@/components/ui/field"` | A-R5 |
| after `:26` | `import { useApiError } from "@/components/ui/use-api-error"` | add `import { useFieldErrors } from "@/components/ui/use-field-errors"` | A-R1 |
| after `:34` | `import { cn } from "@/lib/utils"` | add `import { atLeastOne, maxLength, notBefore, pattern, range, required } from "@/lib/validation-rules"` | A-R1 |
| after `emptyAsset` (`:183`) | — | the module block (below, exact) | A-R1–A-R5 |
| after `:259` (`}>({ checking: false, … })`) | — | `const fieldErrors = useFieldErrors<AssetField>()` | A-R1 |
| after `:366` (`const effectivePhotoLabel = …`) | — | the component block (below, exact): `saveBlockedBy`, `focusFirstError` (with `reveal` for the raw JSON), `errorText` | A-R2, A-R3 |
| `setField :423-425` | `setValues(…)` | the `setField` block (below, exact): clears its key and the pairs | spec §4.3 |
| `handleCompanyChange :440` | first line `setValues(…)` | first line `fieldErrors.clear("companyId", "branchId", "departmentId", "custodianId", "currentLocationId")` | spec §4.3 |
| `handleBranchChange :452` | — | first line `fieldErrors.clear("branchId", "custodianId", "currentLocationId")` | spec §4.3 |
| `handleOwnershipTypeChange :495` | — | first lines `// The ownership type decides the department, the license and the parent rules.` / `fieldErrors.clear("ownershipType", "departmentId", "custodianId", "licenseTotalSeats", "licenseUsedSeats", "parentAssetId")` | spec §4.3 |
| `handleCategoryChange :503` | — | first line `fieldErrors.clear("categoryId")` | spec §4.3 |
| `handleSubmit :543-586` | the 9 `toast.error` guards | the `handleSubmit` head (below, exact): `if (saveBlockedBy) return`, `setErrors(validate({…}))`, `if (focusFirstError()) return` | A-R2, A-R3 |
| `:600-601` | `if (!response.ok) {` / `throw new Error(result?.error ?? tCommon("error"))` | between them: `// A refusal that names a field of this form shows under it; any other keeps the toast (spec §4.1).` / `if (fieldErrors.applyServer(result) && focusFirstError()) return` | M-R4 |
| `setInstallField :662-664` … `addPurchaseDocument :666-674` | the setter; two `toast.error` guards | the block (below, exact): the setter clears its key (`reason` → `installReason`; a parent change clears the role too), `selectPurchaseFile`, `selectAssetPhotoFile`, and `addPurchaseDocument` checks through `validatePurchaseDocument` | A-R5 |
| `addAssetPhoto :698-701` | `toast.error(t("fileRequired"))` | `fieldErrors.setErrors({ ...fieldErrors.errors, assetPhotoFile: "fileRequired" })` / `focusFirstError()` (then `return`) | A-R5 |
| `handleTemplateCustomFieldChange :799-806` | ends `handleCustomFieldRowsChange(nextRows)` | add `fieldErrors.clear(customFieldKey(fieldName))` | spec §4.3 |
| `<form>` `:842` | `<form onSubmit={handleSubmit} className="space-y-5">` | `<form onSubmit={handleSubmit} noValidate className="space-y-5">` | FIXED 6 |
| asset tag `:844` | `<Field label={t("assetTag")} liveError error={duplicateState.assetTagExists ? t("duplicateAssetTag") : undefined}>` | the comment `{/* The duplicate check stays live (spec U8); a save that finds it focuses the field and shows the same line. */}`, then one prop per line: `<Field` / `label={t("assetTag")}` / `id="asset-tag"` / `liveError` / `error={duplicateState.assetTagExists ? t("duplicateAssetTag") : errorText("assetTag")}` / `>` | A-R3 |
| name `:853` | `<Field label={t("assetName")} required hint={t("assetNameHelp")}>` | `<Field label={t("assetName")} id="asset-name" required hint={t("assetNameHelp")} error={errorText("name")}>` | M-R5 |
| category `:884` | `<SelectField label={t("category")} value={values.categoryId} required onChange={handleCategoryChange}>` | `<SelectField label={t("category")} id="asset-category" value={values.categoryId} required error={errorText("categoryId")} onChange={handleCategoryChange}>` | M-R5 |
| serial `:896` | `<Field label={isSoftwareLicense ? t("licenseKey") : t("serialNumber")} liveError error={… : undefined}>` | one prop per line: `<Field` / `label={isSoftwareLicense ? t("licenseKey") : t("serialNumber")}` / `id="asset-serial-number"` / `liveError` / `error={duplicateState.serialNumberExists ? t("duplicateSerialNumber") : errorText("serialNumber")}` / `>` | A-R3 |
| ownership, company, branch, department `:922,:928,:932,:936` | one-line `<SelectField …>` | one prop per line, `id` after `label`, `error` before `onChange`: ids `asset-ownership-type`, `asset-company`, `asset-branch`, `asset-department`; errors `errorText("ownershipType" \| "companyId" \| "branchId" \| "departmentId")` | M-R5 |
| custodian `:942-950` | `<SearchableSelect label=… onChange=… />` | first prop `id="asset-custodian"`, and `error={errorText("custodianId")}` before `onChange` | A-R4 |
| total seats `:976` | `<Field label={t("licenseTotalSeats")} required>` | `{/* The server lets the total stay empty, so it has no star (spec §11 call 8). */}` / `<Field label={t("licenseTotalSeats")} id="asset-license-total-seats" error={errorText("licenseTotalSeats")}>` | A-R4 |
| used seats `:985` | `<Field label={t("licenseUsedSeats")}>` | `<Field label={t("licenseUsedSeats")} id="asset-license-used-seats" error={errorText("licenseUsedSeats")}>` | A-R4 |
| current location `:1035` | one-line `<SelectField …>` | one prop per line: `id="asset-current-location"`, `error={errorText("currentLocationId")}` | M-R5 |
| status `:1040` | `<Field label={t("status")} required labelAction={…} hint={selectedStatus?.description}>` | one prop per line: `<Field` / `label={t("status")}` / `id="asset-status"` / `required` / `labelAction={<AssetStateHelpPopover {...assetStatusHelp} />}` / `hint={selectedStatus?.description}` / `error={errorText("statusId")}` / `>` | M-R5 |
| `:1046-1047` | `{isProtectedStatusChange && (` / `<Notice tone="warning" className="mt-2" title={t("protectedStatusEditBlocked")}>` | before it `{/* The save's reason while this change is blocked: the save names it with aria-describedby. */}`; the Notice gains `id="asset-status-protected"` as its first prop | A-R3 |
| condition `:1061-1066` | `label={t("condition")}` / `required` / … | `id="asset-condition"` after `label`, `error={errorText("conditionId")}` last | M-R5 |
| parent `:1081-1085` | `<SelectField label={t("parentAsset")} value=… onChange=…>` | adds `id="asset-install-parent"` after `label` and `error={errorText("parentAssetId")}` before `onChange` (no star: it is required only for a component) | A-R1 |
| role, slot, install reason `:1091,:1100,:1109` | `<Field label={t("componentRole")} required={Boolean(…)}>`, `<Field label={t("slotNo")}>`, `<Field label={t("reason")}>` | role one prop per line with `id="asset-install-role"` and `error={errorText("componentRole")}`; `<Field label={t("slotNo")} id="asset-install-slot" error={errorText("slotNo")}>`; `<Field label={t("reason")} id="asset-install-reason" error={errorText("installReason")}>` | A-R1 |
| purchase date, price `:1121,:1124` | `<Field label={t("purchaseDate")}>`, `<Field label={t("purchasePriceBaht")}>` | `id="asset-purchase-date" error={errorText("purchaseDate")}`, `id="asset-purchase-price" error={errorText("purchasePrice")}` | A-R1, A-R4 |
| warranty `:1131-1136` | two `<Field>`s with one-line date `<Input>`s | `{/* The end cannot be picked before the start (spec U4, §7.4). */}`; `<Field label={t("warrantyStart")} id="asset-warranty-start" error={errorText("warrantyStartDate")}>` with the `Input` one prop per line and `max={values.warrantyEndDate \|\| undefined}` after `value`; `<Field label={t("warrantyEnd")} id="asset-warranty-end" error={errorText("warrantyEndDate")}>` with `min={values.warrantyStartDate \|\| undefined}` after `value` | A-R4 |
| fixed asset code, PO, invoice `:1137,:1140,:1143` | `<Field label={t("…")}>` | `id="asset-fixed-asset-code" error={errorText("fixedAssetCode")}`, `id="asset-po-number" error={errorText("poNumber")}`, `id="asset-invoice-number" error={errorText("invoiceNumber")}` | M-R2 |
| document number `:1187-1189` | `<Field label={t("purchaseDocumentNo")}>` / one-line `<Input …/>` | `<Field label={t("purchaseDocumentNo")} id="asset-purchase-document-no" error={errorText("purchaseDocumentNo")}>`; the `Input` one prop per line, its `onChange` a block that also runs `fieldErrors.clear("purchaseDocumentNo")` | A-R5 |
| document amount `:1193-1202` | `<Field label={t("purchaseDocumentAmountBaht")}>`, `onChange={(event) => setPurchaseDocumentTotalAmount(…)}` | `id="asset-purchase-document-amount" error={errorText("purchaseDocumentAmount")}`; `onChange` a block that also clears `"purchaseDocumentAmount"` | A-R4 |
| document drop zone `:1204-1212` | `<FileDropzone` / `file={selectedPurchaseFile}` / `onFileChange={setSelectedPurchaseFile}` / … | the comment `{/* The drop box's title is its name, so it takes the field's id, error tie and look itself (no Field label). */}` above it; keep `file=` first; `onFileChange={selectPurchaseFile}`, then `id="asset-purchase-document-file"`, `aria-invalid={fieldErrors.errors.purchaseDocumentFile ? true : undefined}`, `aria-describedby={fieldErrors.errors.purchaseDocumentFile ? "asset-purchase-document-file-error" : undefined}`; after it `{fieldErrors.errors.purchaseDocumentFile ? (` / `<FieldError id="asset-purchase-document-file-error" className="mt-1.5">{errorText("purchaseDocumentFile")}</FieldError>` / `) : null}` | A-R5 |
| photo drop zone `:1290-1299` | `<FileDropzone` / `file={selectedAssetPhotoFile}` / `onFileChange={setSelectedAssetPhotoFile}` | the same with `selectAssetPhotoFile`, `asset-photo-file`, `fieldErrors.errors.assetPhotoFile`, `asset-photo-file-error`, `errorText("assetPhotoFile")` | A-R5 |
| template fields `:1386-1391` | `<TemplateCustomFields definitions=… locale=… getValue=… onChange=… />` | adds `getError={(fieldName) => errorText(customFieldKey(fieldName))}` before `onChange` | A-R1 |
| raw JSON `:1412` | `<Field label={t("customFieldsJson")} hint={t("customFieldsJsonHelp")}>` | `<Field label={t("customFieldsJson")} id="asset-custom-fields-json" hint={t("customFieldsJsonHelp")} error={errorText("customFieldsJson")}>` | A-R2 |
| footer `:1429` | `<StickyFormFooter>` | `<StickyFormFooter status={duplicateState.checking ? <span id="asset-save-reason">{t("duplicateCheckPending")}</span> : undefined}>` | A-R3 |
| save `:1436` | `disabled={isProtectedStatusChange \|\| duplicateState.checking \|\| …}` | two lines: `aria-disabled={saveBlockedBy ? true : undefined}` / `aria-describedby={saveBlockedBy ?? undefined}` | A-R3 |
| `SelectField :1458-1480` | props `label, value, required, hint, onChange, children` | the `SelectField` block (below, exact): `id` and `error` passed to `Field` | M-R5 |
| `TemplateCustomFields :1558`, `TemplateField :1584` | no id, no error | the block (below, exact): ids `asset-custom-field-<index>`; the checkbox field gets its error under the box, tied to the checkbox | A-R1 |
| messages | — | change file `<temp>/a1-messages.json`: `{"set":{"th":{"asset.duplicateCheckPending":"กำลังตรวจรหัสทรัพย์สินและ Serial ซ้ำ รอสักครู่แล้วจึงบันทึก"},"en":{"asset.duplicateCheckPending":"Checking the asset tag and serial for duplicates. Save once the check finishes."}},"delete":["asset.licenseSeatUsageInvalid","asset.customFieldRequired"]}`, then `node scripts/messages-edit.mjs <temp>/a1-messages.json` | A-R2, A-R3 |

The full rehearsed edit list of this task's source files (exact old → new, each old text once in the file at that point, applied in order; rebuilt from `e1caa29` in the rehearsal and checked to give the rehearsal commit byte for byte) is `<temp>/area-A-edits/A1.md` (read-only). The Changes table is the brief; the exact blocks below are what Step 1 pins.

The module block, after `emptyAsset` (exact):

```tsx
// The fields in visual order, keyed like the server's fieldErrors (the asset body's keys; the install, purchase
// document and photo keys are this form's own), with the id focus moves to (v-track M-R1). The template's custom
// fields sit between the photo and the raw JSON: fieldOrder() puts them there and fieldId() names them.
const FIELD_IDS = {
  assetTag: "asset-tag",
  name: "asset-name",
  categoryId: "asset-category",
  serialNumber: "asset-serial-number",
  ownershipType: "asset-ownership-type",
  companyId: "asset-company",
  branchId: "asset-branch",
  departmentId: "asset-department",
  custodianId: "asset-custodian",
  licenseTotalSeats: "asset-license-total-seats",
  licenseUsedSeats: "asset-license-used-seats",
  currentLocationId: "asset-current-location",
  statusId: "asset-status",
  conditionId: "asset-condition",
  parentAssetId: "asset-install-parent",
  componentRole: "asset-install-role",
  slotNo: "asset-install-slot",
  installReason: "asset-install-reason",
  purchaseDate: "asset-purchase-date",
  purchasePrice: "asset-purchase-price",
  warrantyStartDate: "asset-warranty-start",
  warrantyEndDate: "asset-warranty-end",
  fixedAssetCode: "asset-fixed-asset-code",
  poNumber: "asset-po-number",
  invoiceNumber: "asset-invoice-number",
  purchaseDocumentNo: "asset-purchase-document-no",
  purchaseDocumentAmount: "asset-purchase-document-amount",
  purchaseDocumentFile: "asset-purchase-document-file",
  assetPhotoFile: "asset-photo-file",
  customFieldsJson: "asset-custom-fields-json",
} as const
type AssetFixedField = keyof typeof FIELD_IDS
type AssetField = AssetFixedField | `customFields.${string}`

// The asset rules that read the message their toast used (spec §7.1); every other code reads common.validation or the
// api-error catalog through the hook.
const ASSET_MESSAGE_CODES = [
  "componentParentRequired",
  "componentRoleRequired",
  "licenseResponsibilityRequired",
  "purchaseDocumentNoRequired",
  "fileRequired",
  "customFieldsJsonInvalid",
] as const
type AssetMessageCode = (typeof ASSET_MESSAGE_CODES)[number]

function isAssetMessageCode(code: string): code is AssetMessageCode {
  return (ASSET_MESSAGE_CODES as readonly string[]).includes(code)
}

function customFieldKey(fieldName: string): AssetField {
  return `customFields.${fieldName}`
}

// Visual order: the fixed fields, the template's custom fields, then the raw JSON.
function fieldOrder(definitions: CustomFieldDefinition[]): AssetField[] {
  const fixed = (Object.keys(FIELD_IDS) as AssetFixedField[]).filter((key) => key !== "customFieldsJson")
  return [...fixed, ...definitions.map((definition) => customFieldKey(definition.fieldName)), "customFieldsJson"]
}

// A custom field's id is its place in the template: a field name may hold a space, which an id list cannot.
function fieldId(key: AssetField, definitions: CustomFieldDefinition[]): string {
  if (key in FIELD_IDS) return FIELD_IDS[key as AssetFixedField]
  return `asset-custom-field-${definitions.findIndex((definition) => customFieldKey(definition.fieldName) === key)}`
}

type AssetRuleInput = {
  values: AssetFormValues
  // The stored asset on edit: the warranty pair is checked only when one of its dates changed (spec §7.4).
  original?: AssetFormValues
  duplicates: { assetTag: boolean; serialNumber: boolean }
  install: { parentAssetId: string; componentRole: string; slotNo: string; reason: string }
  customFields: { definitions: CustomFieldDefinition[]; valueOf: (fieldName: string) => string }
  purchaseDocument: { file: File | null; documentNo: string; totalAmount: string }
}

// noValidate turns the browser's check off, so this restates the controls' required, maxLength, min and the seats'
// step, and the rules the toasts used to say: the duplicate tag and serial, the license's assignee or department and
// its seats, the warranty pair, the install after create, the template's required fields, the raw JSON and a chosen
// purchase document's number (v-track M-R2, spec §7.4).
function validate({ values, original, duplicates, install, customFields, purchaseDocument }: AssetRuleInput): Partial<Record<AssetField, string>> {
  const errors: Partial<Record<AssetField, string>> = {}
  const check = (key: AssetField, code: string | null) => {
    if (code) errors[key] = code
  }
  const ownershipType = normalizeAssetOwnershipType(values.ownershipType)
  const isLicense = ownershipType === "software_license"
  const warrantyChanged =
    !original ||
    (values.warrantyStartDate ?? "") !== (original.warrantyStartDate ?? "") ||
    (values.warrantyEndDate ?? "") !== (original.warrantyEndDate ?? "")
  check("assetTag", duplicates.assetTag ? "duplicate" : maxLength(values.assetTag, 50))
  check("name", required(values.name) ?? maxLength(values.name, 200))
  check("categoryId", required(values.categoryId))
  check("serialNumber", duplicates.serialNumber ? "duplicate" : maxLength(values.serialNumber, 100))
  check("ownershipType", required(values.ownershipType))
  check("companyId", required(values.companyId))
  check("branchId", required(values.branchId))
  check("departmentId", ownershipType !== "personal" && !isLicense ? required(values.departmentId) : null)
  check("custodianId", isLicense && atLeastOne([values.departmentId, values.custodianId]) ? "licenseResponsibilityRequired" : null)
  if (isLicense) {
    check("licenseTotalSeats", range(values.licenseTotalSeats, 0) ?? pattern(String(values.licenseTotalSeats ?? ""), /\d+/))
    check("licenseUsedSeats", range(values.licenseUsedSeats, 0) ?? pattern(String(values.licenseUsedSeats ?? ""), /\d+/) ?? seatsExceeded(values))
  }
  check("currentLocationId", required(values.currentLocationId))
  check("statusId", required(values.statusId))
  check("conditionId", required(values.conditionId))
  if (!original) {
    check("parentAssetId", ownershipType === "component" && required(install.parentAssetId) ? "componentParentRequired" : null)
    check("componentRole", install.parentAssetId && required(install.componentRole) ? "componentRoleRequired" : maxLength(install.componentRole, 100))
    check("slotNo", maxLength(install.slotNo, 50))
    check("installReason", maxLength(install.reason, 500))
  }
  check("purchasePrice", range(values.purchasePrice, 0))
  check("warrantyEndDate", warrantyChanged ? notBefore(values.warrantyEndDate, values.warrantyStartDate) : null)
  check("fixedAssetCode", maxLength(values.fixedAssetCode, 50))
  check("poNumber", maxLength(values.poNumber, 50))
  check("invoiceNumber", maxLength(values.invoiceNumber, 50))
  check("purchaseDocumentNo", purchaseDocument.file && required(purchaseDocument.documentNo) ? "purchaseDocumentNoRequired" : maxLength(purchaseDocument.documentNo, 100))
  check("purchaseDocumentAmount", range(purchaseDocument.totalAmount, 0))
  for (const definition of customFields.definitions) {
    if (definition.isRequired) check(customFieldKey(definition.fieldName), required(customFields.valueOf(definition.fieldName)))
  }
  check("customFieldsJson", isValidCustomFieldsJson(values.customFieldsJson) ? null : "customFieldsJsonInvalid")
  return errors
}

// The purchase document's add button: a file and its number (the number's rule matches the save's).
function validatePurchaseDocument(file: File | null, documentNo: string): Partial<Record<AssetField, string>> {
  const errors: Partial<Record<AssetField, string>> = {}
  if (!file) errors.purchaseDocumentFile = "fileRequired"
  const number = required(documentNo) ? "purchaseDocumentNoRequired" : maxLength(documentNo, 100)
  if (number) errors.purchaseDocumentNo = number
  return errors
}

// The server's rule (validations/asset.ts): used seats never exceed the total, when both are given.
function seatsExceeded(values: AssetFormValues): "licenseSeatsExceeded" | null {
  if (required(values.licenseTotalSeats) || required(values.licenseUsedSeats)) return null
  return Number(values.licenseUsedSeats) > Number(values.licenseTotalSeats) ? "licenseSeatsExceeded" : null
}
```

The component block, after `const effectivePhotoLabel = …` (exact):

```tsx
  // Prerequisites, not fields (spec §4.4): a protected status changes through its workflow (the warning under the
  // status says so), and the duplicate check has to finish. The save stays focusable and names its reason.
  const saveBlockedBy = isProtectedStatusChange ? "asset-status-protected" : duplicateState.checking ? "asset-save-reason" : null
  const focusFirstError = () =>
    fieldErrors.focusFirst(fieldOrder(selectedCustomFieldDefinitions), {
      idFor: (key) => fieldId(key, selectedCustomFieldDefinitions),
      // The raw JSON shows only after its toggle.
      reveal: (key) => {
        if (key === "customFieldsJson") setShowRawJson(true)
      },
    })
  // A rule with a message of its own reads it from the asset messages; any other code reads the hook's message.
  const errorText = (key: AssetField) => {
    const code = fieldErrors.errors[key]
    return code && isAssetMessageCode(code) ? t(code) : fieldErrors.message(key)
  }
```

`setField` (exact):

```tsx
  function setField<K extends keyof AssetFormValues>(field: K, value: AssetFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field in FIELD_IDS) fieldErrors.clear(field as AssetFixedField)
    // A pair or a group clears together (spec §4.3): the warranty dates, the seats, the license's assignee or department.
    if (field === "warrantyStartDate") fieldErrors.clear("warrantyEndDate")
    if (field === "licenseTotalSeats") fieldErrors.clear("licenseUsedSeats")
    if (field === "departmentId") fieldErrors.clear("custodianId")
  }
```

The head of `handleSubmit` (exact; the nine guards go):

```tsx
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saveBlockedBy) return
    fieldErrors.setErrors(
      validate({
        values,
        original: isEdit ? asset : undefined,
        duplicates: { assetTag: duplicateState.assetTagExists, serialNumber: duplicateState.serialNumberExists },
        install: installAfterCreate,
        customFields: { definitions: selectedCustomFieldDefinitions, valueOf: getCustomFieldValue },
        purchaseDocument: { file: selectedPurchaseFile, documentNo: purchaseDocumentNo, totalAmount: purchaseDocumentTotalAmount },
      }),
    )
    if (focusFirstError()) return
    setSaving(true)
```

`setInstallField` to the head of `addPurchaseDocument` (exact; the rest of `addPurchaseDocument` stays):

```tsx
  function setInstallField(field: keyof typeof installAfterCreate, value: string) {
    setInstallAfterCreate((current) => ({ ...current, [field]: value }))
    // The role's rule depends on the parent, so a parent change clears both.
    if (field === "parentAssetId") fieldErrors.clear("parentAssetId", "componentRole")
    else fieldErrors.clear(field === "reason" ? "installReason" : field)
  }

  function selectPurchaseFile(file: File | null) {
    setSelectedPurchaseFile(file)
    // The number's rule depends on the file, so a new file clears both.
    fieldErrors.clear("purchaseDocumentFile", "purchaseDocumentNo")
  }

  function selectAssetPhotoFile(file: File | null) {
    setSelectedAssetPhotoFile(file)
    fieldErrors.clear("assetPhotoFile")
  }

  function addPurchaseDocument() {
    // The add button checks its own two fields; the errors of the save stay as they are.
    const documentErrors = validatePurchaseDocument(selectedPurchaseFile, purchaseDocumentNo)
    if (Object.keys(documentErrors).length > 0) {
      fieldErrors.setErrors({ ...fieldErrors.errors, ...documentErrors })
      focusFirstError()
      return
    }
    if (!selectedPurchaseFile) return
```

`SelectField` (exact):

```tsx
function SelectField({
  label,
  id,
  value,
  required,
  hint,
  error,
  onChange,
  children,
}: {
  label: string
  // The id focus moves to and the error is tied to (v-track M-R1).
  id?: string
  value: string
  required?: boolean
  hint?: React.ReactNode
  error?: React.ReactNode
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <Field label={label} id={id} required={required} hint={hint} error={error}>
      <NativeSelect value={value} required={required} onChange={(event) => onChange(event.target.value)}>
        {children}
      </NativeSelect>
    </Field>
  )
}
```

`TemplateCustomFields` and `TemplateField` (exact):

```tsx
function TemplateCustomFields({
  definitions,
  locale,
  getValue,
  getError,
  onChange,
}: {
  definitions: CustomFieldDefinition[]
  locale: string
  getValue: (fieldName: string) => string
  getError: (fieldName: string) => string | undefined
  onChange: (fieldName: string, value: string) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {definitions.map((definition, index) => (
        <TemplateField
          key={definition.id}
          id={`asset-custom-field-${index}`}
          definition={definition}
          label={getTemplateFieldLabel(definition, locale)}
          value={getValue(definition.fieldName)}
          error={getError(definition.fieldName)}
          onChange={(value) => onChange(definition.fieldName, value)}
        />
      ))}
    </div>
  )
}

function TemplateField({
  id,
  definition,
  label,
  value,
  error,
  onChange,
}: {
  // The id fieldId() gives this field's key: its place in the template.
  id: string
  definition: CustomFieldDefinition
  label: string
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  if (definition.fieldType === "boolean") {
    // A checkbox has no Field: its error sits under the box and is tied to the checkbox.
    return (
      <div className="grid min-w-0 content-start gap-1.5">
        <label className="flex min-h-10 items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
          <input
            id={id}
            type="checkbox"
            checked={value === "true"}
            onChange={(event) => onChange(event.target.checked ? "true" : "false")}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={checkboxVariants()}
          />
          {label}
        </label>
        {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
      </div>
    )
  }

  if (definition.fieldType === "select") {
    return (
      <Field label={label} id={id} required={definition.isRequired} error={error}>
        <NativeSelect value={value} required={definition.isRequired} onChange={(event) => onChange(event.target.value)}>
          <option value=""></option>
          {definition.options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </NativeSelect>
      </Field>
    )
  }

  return (
    <Field label={label} id={id} required={definition.isRequired} error={error}>
      <Input
        type={definition.fieldType === "number" ? "number" : definition.fieldType === "date" ? "date" : "text"}
        value={value}
        required={definition.isRequired}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  )
}
```

- [ ] **Step 1: The failing test.** Create `tests/v-track2-a.test.ts` (LF) with exactly:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// V track plan 2, area A: the asset forms show their errors under the field (spec
// docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §4, §5, §7). One test per task, appended in order.
// The working tree is CRLF on Windows: every read strips \r before the multi-line regexes.
const C = "src/components/"
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))

// The body of a module-level function, up to the first line that is only "}".
function functionBody(source: string, name = "validate") {
  const start = source.search(new RegExp(`^function ${name}\\(`, "m"))
  assert.notEqual(start, -1, `a module-level function ${name}(`)
  return source.slice(start, source.indexOf("\n}\n", start))
}

// The rows of a field table (v-track M-R1): `const NAME = {`, one `  key: "id",` per line, `} as const`.
function fieldTable(source: string, name = "FIELD_IDS") {
  const block = source.match(new RegExp(`const ${name} = \\{\\n([\\s\\S]*?)\\n\\} as const`))
  assert.ok(block, `const ${name} = { … } as const`)
  return block[1].split("\n")
}

// What every moved form shares (v-track M-R1 to M-R4): noValidate straight after onSubmit, the hook, the client's errors
// from validate(), the server's on the same fields, focus on the first wrong one, and each table id on one control.
function assertMovedForm(
  source: string,
  form: { ids: Record<string, string>; handler?: string; table?: string; hook?: string; server?: false; formless?: true },
) {
  const handler = form.handler ?? "handleSubmit"
  const hook = form.hook ?? "fieldErrors"
  if (!form.formless) assert.match(source, new RegExp(`<form onSubmit=\\{${handler}\\} noValidate[ >\\n]`), "noValidate directly after onSubmit")
  assert.match(source, /import \{ useFieldErrors(?:, useValidationMessage)? \} from "@\/components\/ui\/use-field-errors"/)
  assert.deepEqual(fieldTable(source, form.table), Object.entries(form.ids).map(([key, id]) => `  ${key}: "${id}",`), "the fields in visual order with their ids")
  for (const id of Object.values(form.ids)) {
    assert.equal(source.match(new RegExp(`\\bid="${escape(id)}"`, "g"))?.length, 1, `id "${id}" once`)
  }
  assert.match(source, new RegExp(`${hook}\\.setErrors\\(\\s*validate\\(`), "the client's errors come from validate()")
  if (form.server !== false) {
    assert.match(source, new RegExp(`if \\(${hook}\\.applyServer\\((?:result|payload|body|refusal)\\) && `), "the server's fieldErrors land on the same fields")
  }
  assert.match(source, new RegExp(`${hook}\\.focusFirst\\(`), "focus goes to the first wrong field")
}

test("asset form: validate() restates every rule the toasts said, the save gates name their reason, and the warranty pair holds (v-track A1)", () => {
  const source = read(`${C}assets/asset-form.tsx`)
  assertMovedForm(source, {
    ids: {
      assetTag: "asset-tag",
      name: "asset-name",
      categoryId: "asset-category",
      serialNumber: "asset-serial-number",
      ownershipType: "asset-ownership-type",
      companyId: "asset-company",
      branchId: "asset-branch",
      departmentId: "asset-department",
      custodianId: "asset-custodian",
      licenseTotalSeats: "asset-license-total-seats",
      licenseUsedSeats: "asset-license-used-seats",
      currentLocationId: "asset-current-location",
      statusId: "asset-status",
      conditionId: "asset-condition",
      parentAssetId: "asset-install-parent",
      componentRole: "asset-install-role",
      slotNo: "asset-install-slot",
      installReason: "asset-install-reason",
      purchaseDate: "asset-purchase-date",
      purchasePrice: "asset-purchase-price",
      warrantyStartDate: "asset-warranty-start",
      warrantyEndDate: "asset-warranty-end",
      fixedAssetCode: "asset-fixed-asset-code",
      poNumber: "asset-po-number",
      invoiceNumber: "asset-invoice-number",
      purchaseDocumentNo: "asset-purchase-document-no",
      purchaseDocumentAmount: "asset-purchase-document-amount",
      purchaseDocumentFile: "asset-purchase-document-file",
      assetPhotoFile: "asset-photo-file",
      customFieldsJson: "asset-custom-fields-json",
    },
  })
  const rules = functionBody(source)
  assert.match(source, /^function validate\(\{ values, original, duplicates, install, customFields, purchaseDocument \}: AssetRuleInput\): Partial<Record<AssetField, string>> \{$/m)
  for (const rule of [
    'check("assetTag", duplicates.assetTag ? "duplicate" : maxLength(values.assetTag, 50))',
    'check("name", required(values.name) ?? maxLength(values.name, 200))',
    'check("categoryId", required(values.categoryId))',
    'check("serialNumber", duplicates.serialNumber ? "duplicate" : maxLength(values.serialNumber, 100))',
    'check("departmentId", ownershipType !== "personal" && !isLicense ? required(values.departmentId) : null)',
    'check("custodianId", isLicense && atLeastOne([values.departmentId, values.custodianId]) ? "licenseResponsibilityRequired" : null)',
    'check("licenseTotalSeats", range(values.licenseTotalSeats, 0) ?? pattern(String(values.licenseTotalSeats ?? ""), /\\d+/))',
    'check("licenseUsedSeats", range(values.licenseUsedSeats, 0) ?? pattern(String(values.licenseUsedSeats ?? ""), /\\d+/) ?? seatsExceeded(values))',
    'check("parentAssetId", ownershipType === "component" && required(install.parentAssetId) ? "componentParentRequired" : null)',
    'check("componentRole", install.parentAssetId && required(install.componentRole) ? "componentRoleRequired" : maxLength(install.componentRole, 100))',
    'check("purchasePrice", range(values.purchasePrice, 0))',
    'check("warrantyEndDate", warrantyChanged ? notBefore(values.warrantyEndDate, values.warrantyStartDate) : null)',
    'check("purchaseDocumentNo", purchaseDocument.file && required(purchaseDocument.documentNo) ? "purchaseDocumentNoRequired" : maxLength(purchaseDocument.documentNo, 100))',
    'if (definition.isRequired) check(customFieldKey(definition.fieldName), required(customFields.valueOf(definition.fieldName)))',
    'check("customFieldsJson", isValidCustomFieldsJson(values.customFieldsJson) ? null : "customFieldsJsonInvalid")',
  ]) assert.ok(rules.includes(rule), rule)
  // The warranty pair on edit is checked only when one of its dates changed, so an old asset stored with reversed dates
  // still saves an unrelated change (spec §7.4); the end cannot be picked before the start (U4).
  assert.match(rules, /const warrantyChanged =\n\s+!original \|\|\n\s+\(values\.warrantyStartDate \?\? ""\) !== \(original\.warrantyStartDate \?\? ""\) \|\|\n\s+\(values\.warrantyEndDate \?\? ""\) !== \(original\.warrantyEndDate \?\? ""\)/)
  assert.match(source, /value=\{values\.warrantyStartDate \?\? ""\}\n\s+max=\{values\.warrantyEndDate \|\| undefined\}/)
  assert.match(source, /value=\{values\.warrantyEndDate \?\? ""\}\n\s+min=\{values\.warrantyStartDate \|\| undefined\}/)
  assert.match(functionBody(source, "seatsExceeded"), /return Number\(values\.licenseUsedSeats\) > Number\(values\.licenseTotalSeats\) \? "licenseSeatsExceeded" : null/)
  // The asset rules keep the message their toast used (spec §7.1); the server's own codes read the catalog.
  assert.match(source, /const ASSET_MESSAGE_CODES = \[\n\s+"componentParentRequired",\n\s+"componentRoleRequired",\n\s+"licenseResponsibilityRequired",\n\s+"purchaseDocumentNoRequired",\n\s+"fileRequired",\n\s+"customFieldsJsonInvalid",\n\] as const/)
  assert.match(source, /return code && isAssetMessageCode\(code\) \? t\(code\) : fieldErrors\.message\(key\)/)
  // No validation toast is left; the catch keeps its toast for the server's protected-status refusal.
  assert.doesNotMatch(source, /toast\.error\(t\("(?:duplicateWarning|customFieldsJsonInvalid|customFieldRequired|componentRoleRequired|componentParentRequired|licenseResponsibilityRequired|licenseSeatUsageInvalid|purchaseDocumentNoRequired|fileRequired)"/)
  assert.match(source, /if \(errorMessage\.includes\("Protected lifecycle statuses"\)\) toast\.error\(t\("protectedStatusEditBlocked"\)\)/)
  // Prerequisites keep their gate, focusable and tied to a visible reason (spec §4.4); a duplicate is a field error now.
  assert.ok(source.includes('const saveBlockedBy = isProtectedStatusChange ? "asset-status-protected" : duplicateState.checking ? "asset-save-reason" : null'))
  assert.match(source, /event\.preventDefault\(\)\n\s+if \(saveBlockedBy\) return\n\s+fieldErrors\.setErrors\(/)
  assert.match(source, /aria-disabled=\{saveBlockedBy \? true : undefined\}\n\s+aria-describedby=\{saveBlockedBy \?\? undefined\}/)
  assert.match(source, /<Notice id="asset-status-protected" tone="warning" className="mt-2" title=\{t\("protectedStatusEditBlocked"\)\}>/)
  assert.ok(source.includes('<StickyFormFooter status={duplicateState.checking ? <span id="asset-save-reason">{t("duplicateCheckPending")}</span> : undefined}>'))
  assert.doesNotMatch(source, /disabled=\{isProtectedStatusChange/)
  for (const locale of ["th", "en"] as const) {
    assert.equal(typeof messages(locale).asset.duplicateCheckPending, "string", `${locale} asset.duplicateCheckPending`)
    assert.equal(messages(locale).asset.licenseSeatUsageInvalid, undefined, `${locale}: the seats read apiErrors.licenseSeatsExceeded`)
    assert.equal(messages(locale).asset.customFieldRequired, undefined, `${locale}: a template field says required under itself`)
  }
  // The duplicate checks stay live (spec U8): a save that finds one shows the same line, not a second one.
  assert.match(source, /liveError\n\s+error=\{duplicateState\.assetTagExists \? t\("duplicateAssetTag"\) : errorText\("assetTag"\)\}/)
  assert.match(source, /liveError\n\s+error=\{duplicateState\.serialNumberExists \? t\("duplicateSerialNumber"\) : errorText\("serialNumber"\)\}/)
  // The server lets the total seats stay empty, so the star goes (spec §11 call 8).
  assert.ok(source.includes('<Field label={t("licenseTotalSeats")} id="asset-license-total-seats" error={errorText("licenseTotalSeats")}>'))
  // The server's refusal lands on the same fields; the raw JSON opens first; the template fields are ids by place.
  assert.match(source, /if \(fieldErrors\.applyServer\(result\) && focusFirstError\(\)\) return\n\s+throw new Error\(result\?\.error \?\? tCommon\("error"\)\)/)
  assert.match(source, /reveal: \(key\) => \{\n\s+if \(key === "customFieldsJson"\) setShowRawJson\(true\)/)
  assert.match(source, /id=\{`asset-custom-field-\$\{index\}`\}/)
  // The add buttons check their own fields under the same hook; the save's errors stay.
  assert.match(source, /const documentErrors = validatePurchaseDocument\(selectedPurchaseFile, purchaseDocumentNo\)/)
  assert.match(source, /fieldErrors\.setErrors\(\{ \.\.\.fieldErrors\.errors, assetPhotoFile: "fileRequired" \}\)/)
  // A pair or a group clears together (spec §4.3).
  assert.match(source, /if \(field === "warrantyStartDate"\) fieldErrors\.clear\("warrantyEndDate"\)/)
  assert.match(source, /if \(field === "licenseTotalSeats"\) fieldErrors\.clear\("licenseUsedSeats"\)/)
  assert.match(source, /if \(field === "departmentId"\) fieldErrors\.clear\("custodianId"\)/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-a.test.ts`. Expected to fail: "asset form: validate() restates every rule the toasts said, the save gates name their reason, and the warranty pair holds (v-track A1)" ("noValidate directly after onSubmit"). After Step 3 and before Step 4, `node --test tests/asset-form-sticky-actions.test.ts tests/asset-forms-ui.test.ts tests/assets-sweep-ui.test.ts tests/sticky-form-footer-ui.test.ts tests/v-track-f.test.ts tests/form-migration-guards.test.ts` fails nine tests: "asset form keeps save actions in a sticky form footer", "asset form save action is busy while saving and keeps its other disabled guards", "asset form: status and condition keep their help button beside the label, outside the <label> (K2, I4)", "asset form: the duplicate tag and serial errors belong to their fields (K4 a)", "asset form: money fields carry their unit and the decimal keypad; the new purchase document row has visible labels (K26, I34)", "asset form: sections are ContentPanels, notes are Notice by meaning, empty lists EmptyNote, documents ChoiceCards with Nil, and no box in a box (spec 2D D7, D9, M21)", "the asset form ends its <form> with the sticky footer: cancel first, save last (K8, K14)", "errors shown by a submit are read once, through focus, and a live error keeps a polite announcement (V spec §7.3, G5, U8)" and "the guard's own lists name real files, and every EXEMPT row has a count, a kind, a why and a ruling (spec 2D §5.1)" (`STAR_ONLY: …|t("licenseTotalSeats") is not a star without native required any more; remove it`). That is expected; Step 4 is their edit. `tests/file-evidence-ui.test.ts` still passes (the drop zones keep `file=` first).
- [ ] **Step 3: Implement** with the rehearsed edits, in order (the Changes table says what each does).
- [ ] **Step 4: Pin and guard edits** (exact old → new; each old string occurs once in its file):

- `tests/asset-form-sticky-actions.test.ts:11`, old:

  ```ts
    assert.match(source, /<form onSubmit=\{handleSubmit\} className="space-y-5">/)
  ```

  new:

  ```ts
    assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate className="space-y-5">/)
  ```
- `tests/asset-form-sticky-actions.test.ts:19`, old:

  ```ts
    assert.match(
      source,
      /disabled=\{isProtectedStatusChange\s*\|\|\s*duplicateState\.checking\s*\|\|\s*duplicateState\.assetTagExists\s*\|\|\s*duplicateState\.serialNumberExists\}/,
    )
  ```

  new:

  ```ts
    // A protected status change and a running duplicate check gate the save, focusable with their reason; a duplicate is
    // an error under its field (v-track plan 2 A1).
    assert.match(source, /aria-disabled=\{saveBlockedBy \? true : undefined\}\s+aria-describedby=\{saveBlockedBy \?\? undefined\}/)
  ```
- `tests/asset-forms-ui.test.ts:16`, old:

  ```ts
      /<Field label=\{t\("status"\)\} required labelAction=\{<AssetStateHelpPopover \{\.\.\.assetStatusHelp\} \/>\} hint=\{selectedStatus\?\.description\}>/,
  ```

  new:

  ```ts
      /label=\{t\("status"\)\}\n\s*id="asset-status"\n\s*required\n\s*labelAction=\{<AssetStateHelpPopover \{\.\.\.assetStatusHelp\} \/>\}\n\s*hint=\{selectedStatus\?\.description\}/,
  ```
- `tests/asset-forms-ui.test.ts:18`, old:

  ```ts
    assert.match(source, /label=\{t\("condition"\)\}\n\s*required\n\s*labelAction=\{<AssetStateHelpPopover \{\.\.\.assetConditionHelp\} \/>\}/)
  ```

  new:

  ```ts
    assert.match(source, /label=\{t\("condition"\)\}\n\s*id="asset-condition"\n\s*required\n\s*labelAction=\{<AssetStateHelpPopover \{\.\.\.assetConditionHelp\} \/>\}/)
  ```
- `tests/asset-forms-ui.test.ts:25`, old:

  ```ts
    assert.match(source, /<Field label=\{t\("assetTag"\)\} liveError error=\{duplicateState\.assetTagExists \? t\("duplicateAssetTag"\) : undefined\}>/)
    assert.match(source, /liveError error=\{duplicateState\.serialNumberExists \? t\("duplicateSerialNumber"\) : undefined\}>\n\s*<ScannerTextInput/)
  ```

  new:

  ```ts
    // A save that finds a duplicate shows the same line; any other error of the field shows in its place (v-track plan 2 A1).
    assert.match(source, /label=\{t\("assetTag"\)\}\n\s*id="asset-tag"\n\s*liveError\n\s*error=\{duplicateState\.assetTagExists \? t\("duplicateAssetTag"\) : errorText\("assetTag"\)\}\n\s*>/)
    assert.match(source, /liveError\n\s*error=\{duplicateState\.serialNumberExists \? t\("duplicateSerialNumber"\) : errorText\("serialNumber"\)\}\n\s*>\n\s*<ScannerTextInput/)
  ```
- `tests/asset-forms-ui.test.ts:32`, old:

  ```ts
    assert.match(source, /<Field label=\{t\("purchasePriceBaht"\)\}>\n\s*<Input type="number" min="0" step="0\.01" inputMode="decimal" /)
    assert.match(source, /<Field label=\{t\("purchaseDocumentAmountBaht"\)\}>\n\s*<Input\n\s*type="number"\n\s*min="0"\n\s*step="0\.01"\n\s*inputMode="decimal"/)
  ```

  new:

  ```ts
    assert.match(source, /<Field label=\{t\("purchasePriceBaht"\)\} id="asset-purchase-price" error=\{errorText\("purchasePrice"\)\}>\n\s*<Input type="number" min="0" step="0\.01" inputMode="decimal" /)
    assert.match(source, /<Field label=\{t\("purchaseDocumentAmountBaht"\)\} id="asset-purchase-document-amount" error=\{errorText\("purchaseDocumentAmount"\)\}>\n\s*<Input\n\s*type="number"\n\s*min="0"\n\s*step="0\.01"\n\s*inputMode="decimal"/)
    // The visible labels stay; the number gains its id and its error (v-track plan 2 A1).
  ```
- `tests/asset-forms-ui.test.ts:35`, old:

  ```ts
      assert.match(source, new RegExp(`<Field label=\\{t\\("${key}"\\)\\}>`), key)
  ```

  new:

  ```ts
      assert.match(source, new RegExp(`<Field label=\\{t\\("${key}"\\)\\}[ >]`), key)
  ```
- `tests/assets-sweep-ui.test.ts:139`, old:

  ```ts
    assert.match(source, /<Notice tone="warning" className="mt-2" title=\{t\("protectedStatusEditBlocked"\)\}>/)
  ```

  new:

  ```ts
    assert.match(source, /<Notice id="asset-status-protected" tone="warning" className="mt-2" title=\{t\("protectedStatusEditBlocked"\)\}>/)
  ```
- `tests/sticky-form-footer-ui.test.ts:33`, old:

  ```ts
    const footerStart = source.indexOf("<StickyFormFooter>")
  ```

  new:

  ```ts
    const footerStart = source.indexOf("<StickyFormFooter")
  ```
- `tests/v-track-f.test.ts:200`, old:

  ```ts
    assert.match(assetForm, /<Field label=\{t\("assetTag"\)\} liveError error=\{duplicateState\.assetTagExists \? t\("duplicateAssetTag"\) : undefined\}>/)
    assert.match(assetForm, /liveError error=\{duplicateState\.serialNumberExists \? t\("duplicateSerialNumber"\) : undefined\}>/)
  ```

  new:

  ```ts
    // v-track plan 2 A1: a save's other error of these fields shows in the same place (errorText).
    assert.match(assetForm, /id="asset-tag"\n\s+liveError\n\s+error=\{duplicateState\.assetTagExists \? t\("duplicateAssetTag"\) : errorText\("assetTag"\)\}/)
    assert.match(assetForm, /liveError\n\s+error=\{duplicateState\.serialNumberExists \? t\("duplicateSerialNumber"\) : errorText\("serialNumber"\)\}/)
  ```
- `tests/form-migration-guards.test.ts:53` (A-R4; variant a: area O's Task 10 (O3) runs after this task and removes the checkin entry, P-R3):

  ```ts
  const STAR_ONLY = new Set([`${C}asset-operations/checkin-form.tsx|t("returnDate")`, `${C}assets/asset-form.tsx|t("licenseTotalSeats")`, `${C}assets/asset-form.tsx|t("componentRole")`])
  ```

  new:

  ```ts
  const STAR_ONLY = new Set([`${C}asset-operations/checkin-form.tsx|t("returnDate")`])
  ```

- `tests/validation-guards.test.ts` (`V_FORMS`, the anchor of "Interfaces with the other areas"), old:

  ```ts
    `${C}reports/report-preset-controls.tsx`,
  ```

  new:

  ```ts
    `${C}assets/asset-form.tsx`,
    `${C}reports/report-preset-controls.tsx`,
  ```

- [ ] **Step 5: Verify.** `node --test tests/v-track2-a.test.ts tests/asset-form-sticky-actions.test.ts tests/asset-forms-ui.test.ts tests/assets-sweep-ui.test.ts tests/sticky-form-footer-ui.test.ts tests/v-track-f.test.ts tests/file-evidence-ui.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts tests/asset-operation-status-policy.test.ts`; `npm test` (+1; 2257 tests, 2256 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint` (0 errors, no new warning in `src/` or `tests/`). Messages 4091 leaf keys per locale (+1 −2). `node <tools>/eol.mjs src/components/assets/asset-form.tsx tests/v-track2-a.test.ts tests/asset-forms-ui.test.ts tests/asset-form-sticky-actions.test.ts tests/assets-sweep-ui.test.ts tests/sticky-form-footer-ui.test.ts tests/v-track-f.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts messages/th.json` prints `2061 2061`, `0 143`, `135 135`, `0 24`, `0 280`, `0 56`, `247 247`, `503 503`, `191 191`, `4273 4273` (with area A first; other areas' rows move the guard files' counts, keep their endings).
- [ ] **Step 6: Commit.** `git add src/components/assets/asset-form.tsx messages/th.json messages/en.json tests/v-track2-a.test.ts tests/asset-form-sticky-actions.test.ts tests/asset-forms-ui.test.ts tests/assets-sweep-ui.test.ts tests/sticky-form-footer-ui.test.ts tests/v-track-f.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts`, then `git commit -m "feat(assets): the asset form shows its errors under the field and names why save waits (v-track plan 2 task 1, A1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 2 (A2): The batch form shows its errors under the shared fields and each row, and a refusal leaves the review (`c/assets/asset-batch-form.tsx`)

Spec §4.2 (review steps), §4.3, §5 #2, §7.4 (the batch always checks the warranty pair), U8 (the batch duplicate warning); S-R12 (the server's keys). A-R1, A-R2, A-R7.

**Files:**
- Modify: `src/components/assets/asset-batch-form.tsx` (CRLF); `messages/th.json`, `messages/en.json` (CRLF)
- Pins: `tests/asset-forms-ui.test.ts` (CRLF), `tests/assets-sweep-ui.test.ts` (LF)
- Guard: `tests/validation-guards.test.ts` (CRLF)
- Test: `tests/v-track2-a.test.ts` (LF)

**Changes at e1caa29:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:29` | the one-line `import { buildAssetBatchPreviewRows, … } from "@/lib/asset-batch-create"` | one name per line, adding `buildAssetBatchDuplicateFieldErrors` first | A-R7 |
| after `:30` (`organization-option-filter`) | — | `import { atLeastOne, maxLength, notBefore, range, required } from "@/lib/validation-rules"` | A-R1 |
| after `:31` (`use-api-error`) | — | `import { useFieldErrors } from "@/components/ui/use-field-errors"` | A-R1 |
| after `emptyCommon` (`:122`) | — | the module block (below, exact) | A-R1, A-R7 |
| after `:156` (`createdBatch`) | — | `const fieldErrors = useFieldErrors<BatchField>()` | A-R1 |
| after `:227` (`hasClientDuplicates`) | — | the component block (below, exact): `liveDuplicates`, `focusFirstError` (visible row, `reveal`), `errorText`, `rowError` | A-R7 |
| `setCommonField :243`, `setRowField :250` | — | the block (below, exact): each clears its key and the pairs; `clearRowErrors()` | spec §4.3 |
| `handleCategoryChange :279`, `handleCompanyChange :327`, `handleBranchChange :342` | — | first line `fieldErrors.clear("common.categoryId")`; `fieldErrors.clear("common.companyId", "common.branchId", "common.departmentId", "common.custodianId", "common.currentLocationId")`; `fieldErrors.clear("common.branchId", "common.custodianId", "common.currentLocationId")` | spec §4.3 |
| `handleRemoveRow :478-486`, `handleSerialPaste :533-557` | after the `setRows(…)` call | `clearRowErrors()` | A-R7 |
| `handleCheckDuplicates :519-522` | `setDuplicateCheckMessage(message)` / `setDuplicateCheckStatus("duplicate")` / `toast.error(message)` | the comment `// The result shows in the Notice under the buttons, which reads it out (role status); no toast says it again.` above the two setters; the toast goes | A-R7, F-R9 |
| `handleSubmit :577-589` | two `toast.error` guards, then `if (!reviewing) {` | `event.preventDefault()` / `fieldErrors.setErrors(validate(common, rows))` / `if (focusFirstError()) return` / `if (!reviewing) {` | A-R7 |
| `:603` | `if (!response.ok) throw new Error(getErrorMessage(result) ?? tCommon("error"))` | `if (!response.ok) {` / `// A refusal that names a field leaves the review and shows under it (spec §4.2); any other keeps the toast.` / `if (fieldErrors.applyServer(result) && focusFirstError()) return` / `throw new Error(getErrorMessage(result) ?? tCommon("error"))` / `}` | spec §4.2 |
| `<form>` `:619` | `<form onSubmit={handleSubmit} className="space-y-5">` | `<form onSubmit={handleSubmit} noValidate className="space-y-5">` | FIXED 6 |
| name `:622` | `<Field label={t("assetName")} required hint={t("assetNameHelp")}>` | `<Field label={t("assetName")} id="asset-batch-name" required hint={t("assetNameHelp")} error={errorText("common.name")}>` | M-R5 |
| the eight required or checked selects `:653,:665,:668,:672,:676,:723,:731,:735` | one-line `<SelectField …>` | one prop per line, `id` after `label`, `error={errorText("common.<field>")}` before `onChange`: ids `asset-batch-category`, `-ownership-type`, `-company`, `-branch`, `-department`, `-current-location`, `-status`, `-condition` | M-R5 |
| custodian `:681-689` | `<SearchableSelect label=… onChange=… />` | first prop `id="asset-batch-custodian"`, `error={errorText("common.custodianId")}` before `onChange` | A-R4 |
| purchase date, price `:742,:745` | `<Field label={t("purchaseDate")}>`, `<Field label={t("purchasePriceBaht")}>` | `id="asset-batch-purchase-date" error={errorText("common.purchaseDate")}`, `id="asset-batch-purchase-price" error={errorText("common.purchasePrice")}` | A-R4 |
| warranty `:752-757` | two `<Field>`s with one-line date `<Input>`s | as A1's warranty row with `common.*`, ids `asset-batch-warranty-start` / `asset-batch-warranty-end`, `max={common.warrantyEndDate \|\| undefined}` / `min={common.warrantyStartDate \|\| undefined}` | A-R4 |
| PO, invoice `:758,:761` | `<Field label={t("poNumber")}>`, `<Field label={t("invoiceNumber")}>` | `id="asset-batch-po-number" error={errorText("common.poNumber")}`, `id="asset-batch-invoice-number" error={errorText("common.invoiceNumber")}` | M-R2 |
| duplicate box `:823-829` | `{hasClientDuplicates ? (<Notice tone="warning" className="md:col-span-2">{t("duplicateWarning")} …</Notice>) : null}` and the blank line after it | gone | A-R7 |
| check result `:831-836` | comment "… A toast already announces it, so the Notice takes no live role." and `<Notice tone=… className="md:col-span-2">` | the comment (two lines) `{/* Spec 2D D7: the check result by meaning. The clean result and a failure have their toast; the duplicates found` / `have only this Notice, which reads them out (v-track plan 2 A2). */}`; the Notice gains `role={duplicateCheckStatus === "duplicate" ? "status" : undefined}` after `className` | A-R7 |
| row fields `:859,:862` (cards), `:907,:912` (table) | `<Field label={t("batchAssetTag")} hint={…}>` … | one line each (`tests/asset-batch-form-layout.test.ts` reads the substring `Field label={t("batchAssetTag")}`): `<Field label={t("batchAssetTag")} id={rowFieldId(index, "assetTag", "card")} hint={t("batchAssetTagHelp")} liveError error={rowError(index, "assetTag")}>`; `<Field label={t("batchSerialNumber")} id={rowFieldId(index, "serialNumber", "card")} hint={t("batchPasteSerialHint")} liveError error={rowError(index, "serialNumber")}>`; the table's two with `"row"` and `hideLabel` after `id` | A-R7 |
| save `:1061` | `<Button type="submit" className="w-full sm:w-auto" busy={saving} disabled={hasClientDuplicates}>` | `<Button type="submit" className="w-full sm:w-auto" busy={saving}>` | A-R7 |
| `SelectField :1111-1133` | as A1 | as A1 (`id`, `error`) | M-R5 |
| messages | — | `<temp>/a2-messages.json`: `{"set":{"th":{"asset.batchRowDuplicate":"ค่านี้ซ้ำกับแถวอื่นในชุดนี้"},"en":{"asset.batchRowDuplicate":"This value repeats another row of this batch."}},"delete":["asset.duplicateWarning"]}`, then `node scripts/messages-edit.mjs <temp>/a2-messages.json` | A-R2, A-R7 |

The full rehearsed edit list of this task's source files (exact old → new, each old text once in the file at that point, applied in order; rebuilt from `e1caa29` in the rehearsal and checked to give the rehearsal commit byte for byte) is `<temp>/area-A-edits/A2.md` (read-only). The Changes table is the brief; the exact blocks below are what Step 1 pins.

The module block, after `emptyCommon` (exact):

```tsx
// The shared fields in visual order, with the id focus moves to (v-track M-R1). The server keys them common.<field>
// (S-R12); the rows' tag and serial are rows.<index>.<field>, after the shared fields (fieldOrder).
const COMMON_FIELD_IDS = {
  name: "asset-batch-name",
  categoryId: "asset-batch-category",
  ownershipType: "asset-batch-ownership-type",
  companyId: "asset-batch-company",
  branchId: "asset-batch-branch",
  departmentId: "asset-batch-department",
  custodianId: "asset-batch-custodian",
  currentLocationId: "asset-batch-current-location",
  statusId: "asset-batch-status",
  conditionId: "asset-batch-condition",
  purchaseDate: "asset-batch-purchase-date",
  purchasePrice: "asset-batch-purchase-price",
  warrantyStartDate: "asset-batch-warranty-start",
  warrantyEndDate: "asset-batch-warranty-end",
  poNumber: "asset-batch-po-number",
  invoiceNumber: "asset-batch-invoice-number",
} as const
type CommonField = keyof typeof COMMON_FIELD_IDS
type RowField = "assetTag" | "serialNumber"
type BatchField = `common.${CommonField}` | `rows.${number}.${RowField}`

function commonKey(field: CommonField): BatchField {
  return `common.${field}`
}

function rowKey(index: number, field: RowField): BatchField {
  return `rows.${index}.${field}`
}

// A row's control in the table (from md) or in its card (below md): both are rendered, one is hidden.
function rowFieldId(index: number, field: RowField, view: "row" | "card") {
  return `asset-batch-${view}-${index}-${field === "assetTag" ? "tag" : "serial"}`
}

// Visual order: the shared fields, then each row's tag and serial.
function fieldOrder(rows: BatchRow[]): BatchField[] {
  return [
    ...(Object.keys(COMMON_FIELD_IDS) as CommonField[]).map(commonKey),
    ...rows.flatMap((_, index) => [rowKey(index, "assetTag"), rowKey(index, "serialNumber")]),
  ]
}

// noValidate turns the browser's check off, so this restates the controls' required, maxLength and min, and the rules
// the toasts used to say: the license's assignee or department, and the rows' duplicate tags and serials. The warranty
// pair always holds in a batch (v-track M-R2, spec §7.4).
function validate(common: BatchCommonValues, rows: BatchRow[]): Partial<Record<BatchField, string>> {
  const errors: Partial<Record<BatchField, string>> = {}
  const check = (key: BatchField, code: string | null) => {
    if (code) errors[key] = code
  }
  const ownershipType = normalizeAssetOwnershipType(common.ownershipType)
  const isLicense = ownershipType === "software_license"
  check("common.name", required(common.name) ?? maxLength(common.name, 200))
  check("common.categoryId", required(common.categoryId))
  check("common.ownershipType", required(common.ownershipType))
  check("common.companyId", required(common.companyId))
  check("common.branchId", required(common.branchId))
  check("common.departmentId", ownershipType !== "personal" && !isLicense ? required(common.departmentId) : null)
  check("common.custodianId", isLicense && atLeastOne([common.departmentId, common.custodianId]) ? "licenseResponsibilityRequired" : null)
  check("common.currentLocationId", required(common.currentLocationId))
  check("common.statusId", required(common.statusId))
  check("common.conditionId", required(common.conditionId))
  check("common.purchasePrice", range(common.purchasePrice, 0))
  check("common.warrantyEndDate", notBefore(common.warrantyEndDate, common.warrantyStartDate))
  check("common.poNumber", maxLength(common.poNumber, 50))
  check("common.invoiceNumber", maxLength(common.invoiceNumber, 50))
  rows.forEach((row, index) => check(rowKey(index, "serialNumber"), maxLength(row.serialNumber, 100)))
  // A tag or a serial two rows share is an error on every row that holds it, keyed as the server keys it (S-R12).
  Object.assign(errors, buildAssetBatchDuplicateFieldErrors(rows, findDuplicateBatchValues(rows)))
  return errors
}
```

The component block, after `hasClientDuplicates` (exact):

```tsx
  // The duplicate warning shows while typing, under each row that holds the value (spec U8); a save says nothing twice.
  const liveDuplicates = useMemo(() => buildAssetBatchDuplicateFieldErrors(rows, duplicateValues), [rows, duplicateValues])
  // A server refusal leaves the review and goes back to the field (spec §4.2); the row on screen takes the focus.
  const focusFirstError = () =>
    fieldErrors.focusFirst(fieldOrder(rows), {
      idFor: (key) => {
        const row = key.match(/^rows\.(\d+)\.(assetTag|serialNumber)$/)
        if (!row) return COMMON_FIELD_IDS[key.slice("common.".length) as CommonField]
        const tableId = rowFieldId(Number(row[1]), row[2] as RowField, "row")
        return document.getElementById(tableId)?.getClientRects().length ? tableId : rowFieldId(Number(row[1]), row[2] as RowField, "card")
      },
      reveal: () => setReviewing(false),
    })
  const errorText = (key: BatchField) => {
    const code = fieldErrors.errors[key]
    return code === "licenseResponsibilityRequired" ? t(code) : fieldErrors.message(key)
  }
  const rowError = (index: number, field: RowField) =>
    liveDuplicates[rowKey(index, field)] ? t("batchRowDuplicate") : fieldErrors.message(rowKey(index, field))
```

`setCommonField`, `setRowField` and `clearRowErrors` (exact):

```tsx
  function setCommonField<K extends keyof BatchCommonValues>(field: K, value: BatchCommonValues[K]) {
    setCreatedBatch(null)
    setReviewing(false)
    clearDuplicateCheck()
    setCommon((current) => ({ ...current, [field]: value }))
    if (field in COMMON_FIELD_IDS) fieldErrors.clear(commonKey(field as CommonField))
    // A pair or a group clears together (spec §4.3): the warranty dates; the license's assignee or department.
    if (field === "warrantyStartDate") fieldErrors.clear("common.warrantyEndDate")
    if (field === "departmentId" || field === "ownershipType") fieldErrors.clear("common.departmentId", "common.custodianId")
  }

  function setRowField<K extends keyof BatchRow>(clientId: string, field: K, value: BatchRow[K]) {
    setCreatedBatch(null)
    setReviewing(false)
    clearDuplicateCheck()
    setRows((current) => current.map((row) => (row.clientId === clientId ? { ...row, [field]: value } : row)))
    const index = rows.findIndex((row) => row.clientId === clientId)
    if (field === "assetTag" || field === "serialNumber") fieldErrors.clear(rowKey(index, field as RowField))
  }

  // Adding, removing or pasting rows moves the rows below, so every row error goes (spec §4.3, v-track M-R7).
  function clearRowErrors() {
    fieldErrors.clear(...(Object.keys(fieldErrors.errors).filter((key) => key.startsWith("rows.")) as BatchField[]))
  }
```

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-a.test.ts`:

```ts

test("asset batch form: shared fields and rows show their errors, duplicates stay live under the rows, and a refusal leaves the review (v-track A2)", () => {
  const source = read(`${C}assets/asset-batch-form.tsx`)
  assertMovedForm(source, {
    table: "COMMON_FIELD_IDS",
    ids: {
      name: "asset-batch-name",
      categoryId: "asset-batch-category",
      ownershipType: "asset-batch-ownership-type",
      companyId: "asset-batch-company",
      branchId: "asset-batch-branch",
      departmentId: "asset-batch-department",
      custodianId: "asset-batch-custodian",
      currentLocationId: "asset-batch-current-location",
      statusId: "asset-batch-status",
      conditionId: "asset-batch-condition",
      purchaseDate: "asset-batch-purchase-date",
      purchasePrice: "asset-batch-purchase-price",
      warrantyStartDate: "asset-batch-warranty-start",
      warrantyEndDate: "asset-batch-warranty-end",
      poNumber: "asset-batch-po-number",
      invoiceNumber: "asset-batch-invoice-number",
    },
  })
  // The keys are the server's (S-R12): common.<field> for the shared fields, rows.<index>.<field> for each row.
  assert.match(source, /type BatchField = `common\.\$\{CommonField\}` \| `rows\.\$\{number\}\.\$\{RowField\}`/)
  const rules = functionBody(source)
  for (const rule of [
    'check("common.name", required(common.name) ?? maxLength(common.name, 200))',
    'check("common.departmentId", ownershipType !== "personal" && !isLicense ? required(common.departmentId) : null)',
    'check("common.custodianId", isLicense && atLeastOne([common.departmentId, common.custodianId]) ? "licenseResponsibilityRequired" : null)',
    'check("common.purchasePrice", range(common.purchasePrice, 0))',
    'check("common.warrantyEndDate", notBefore(common.warrantyEndDate, common.warrantyStartDate))',
    'rows.forEach((row, index) => check(rowKey(index, "serialNumber"), maxLength(row.serialNumber, 100)))',
    "Object.assign(errors, buildAssetBatchDuplicateFieldErrors(rows, findDuplicateBatchValues(rows)))",
  ]) assert.ok(rules.includes(rule), rule)
  assert.match(source, /value=\{common\.warrantyStartDate\}\n\s+max=\{common\.warrantyEndDate \|\| undefined\}/)
  assert.match(source, /value=\{common\.warrantyEndDate\}\n\s+min=\{common\.warrantyStartDate \|\| undefined\}/)
  // Both row views are rendered (cards below md, the table from md): focus goes to the one on screen; a server refusal
  // closes the review first (spec §4.2).
  assert.match(functionBody(source, "rowFieldId"), /return `asset-batch-\$\{view\}-\$\{index\}-\$\{field === "assetTag" \? "tag" : "serial"\}`/)
  assert.match(source, /return document\.getElementById\(tableId\)\?\.getClientRects\(\)\.length \? tableId : rowFieldId\(Number\(row\[1\]\), row\[2\] as RowField, "card"\)/)
  assert.match(source, /reveal: \(\) => setReviewing\(false\),/)
  assert.match(source, /event\.preventDefault\(\)\n\s+fieldErrors\.setErrors\(validate\(common, rows\)\)\n\s+if \(focusFirstError\(\)\) return\n\s+if \(!reviewing\) \{/)
  // The duplicate warning moves under each row that holds the value and stays live (spec U8); no box says it again.
  assert.match(source, /const liveDuplicates = useMemo\(\(\) => buildAssetBatchDuplicateFieldErrors\(rows, duplicateValues\), \[rows, duplicateValues\]\)/)
  assert.match(source, /liveDuplicates\[rowKey\(index, field\)\] \? t\("batchRowDuplicate"\) : fieldErrors\.message\(rowKey\(index, field\)\)/)
  for (const view of ["card", "row"]) {
    for (const field of ["assetTag", "serialNumber"]) {
      assert.match(source, new RegExp(`id=\\{rowFieldId\\(index, "${field}", "${view}"\\)\\}[^\\n]* liveError error=\\{rowError\\(index, "${field}"\\)\\}>`), `${view} ${field}`)
    }
  }
  assert.doesNotMatch(source, /\{t\("duplicateWarning"\)\}/)
  // No toast for a validation error or for the duplicates the check found: the check's Notice reads them out.
  assert.doesNotMatch(source, /\btoast\.(?:error|warning)\(/)
  assert.match(source, /className="md:col-span-2"\n\s+role=\{duplicateCheckStatus === "duplicate" \? "status" : undefined\}/)
  assert.match(source, /<Button type="submit" className="w-full sm:w-auto" busy=\{saving\}>/)
  assert.match(source, /if \(fieldErrors\.applyServer\(result\) && focusFirstError\(\)\) return\n\s+throw new Error\(getErrorMessage\(result\) \?\? tCommon\("error"\)\)/)
  for (const locale of ["th", "en"] as const) {
    assert.equal(typeof messages(locale).asset.batchRowDuplicate, "string", `${locale} asset.batchRowDuplicate`)
    assert.equal(messages(locale).asset.duplicateWarning, undefined, `${locale}: the duplicate box is gone`)
  }
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-a.test.ts`. Expected to fail: "asset batch form: shared fields and rows show their errors, duplicates stay live under the rows, and a refusal leaves the review (v-track A2)" ("noValidate directly after onSubmit"). After Step 3 and before Step 4, `node --test tests/asset-forms-ui.test.ts tests/assets-sweep-ui.test.ts tests/asset-batch-form-layout.test.ts` fails three tests: "asset batch form: row fields are named by Field and their help, not by aria-label help text (K20)", "asset batch form: the duplicate check and the save button are busy without a label swap (K13)" and "asset batch form: ContentPanel sections, three DataTables, Notice by meaning, ChoiceCard documents, a KeyValueList review and Nil (spec 2D D7, D9, M21, D19)"; Step 4 is their edit.
- [ ] **Step 3: Implement** with the rehearsed edits, in order (the Changes table says what each does).
- [ ] **Step 4: Pin and guard edits:**

- `tests/asset-forms-ui.test.ts:68`, old:

  ```ts
    assert.match(source, /<Field label=\{t\("batchAssetTag"\)\} hint=\{t\("batchAssetTagHelp"\)\}>/)
    assert.match(source, /<Field label=\{t\("batchAssetTag"\)\} hideLabel hint=\{t\("batchAssetTagHelp"\)\}>/)
    assert.match(source, /<Field label=\{t\("batchSerialNumber"\)\} hideLabel hint=\{t\("batchPasteSerialHint"\)\}>\n\s*<ScannerTextInput /)
  ```

  new:

  ```ts
    // Each row field has its id (card or table row) and its live error (v-track plan 2 A2).
    assert.match(source, /<Field label=\{t\("batchAssetTag"\)\} id=\{rowFieldId\(index, "assetTag", "card"\)\} hint=\{t\("batchAssetTagHelp"\)\} liveError error=\{rowError\(index, "assetTag"\)\}>/)
    assert.match(source, /<Field label=\{t\("batchAssetTag"\)\} id=\{rowFieldId\(index, "assetTag", "row"\)\} hideLabel hint=\{t\("batchAssetTagHelp"\)\} liveError error=\{rowError\(index, "assetTag"\)\}>/)
    assert.match(source, /<Field label=\{t\("batchSerialNumber"\)\} id=\{rowFieldId\(index, "serialNumber", "row"\)\} hideLabel hint=\{t\("batchPasteSerialHint"\)\} liveError error=\{rowError\(index, "serialNumber"\)\}>\n\s*<ScannerTextInput /)
  ```
- `tests/asset-forms-ui.test.ts:73`, old:

  ```ts
    assert.match(source, /<Field label=\{t\("purchasePriceBaht"\)\}>\n\s*<Input type="number" min="0" step="0\.01" inputMode="decimal" /)
  ```

  new:

  ```ts
    assert.match(source, /<Field label=\{t\("purchasePriceBaht"\)\} id="asset-batch-purchase-price" error=\{errorText\("common\.purchasePrice"\)\}>\n\s*<Input type="number" min="0" step="0\.01" inputMode="decimal" /)
  ```
- `tests/asset-forms-ui.test.ts:80`, old:

  ```ts
    assert.match(source, /<Button type="submit" className="w-full sm:w-auto" busy=\{saving\} disabled=\{hasClientDuplicates\}>/)
  ```

  new:

  ```ts
    // A duplicate is an error under its row now, so it does not gate the save (v-track plan 2 A2).
    assert.match(source, /<Button type="submit" className="w-full sm:w-auto" busy=\{saving\}>/)
  ```
- `tests/assets-sweep-ui.test.ts:154`, old:

  ```ts
    assert.match(source, /<Notice tone="warning" className="md:col-span-2">\n\s+\{t\("duplicateWarning"\)\}/)
  ```

  new:

  ```ts
    // The duplicate box went under the rows as each row's error (v-track plan 2 A2, spec U8).
    assert.doesNotMatch(source, /\{t\("duplicateWarning"\)\}/)
  ```
- `V_FORMS`: insert `` `${C}assets/asset-batch-form.tsx`, `` directly above `` `${C}reports/report-preset-controls.tsx`, `` (as A1).
- [ ] **Step 5: Verify.** `node --test tests/v-track2-a.test.ts tests/asset-forms-ui.test.ts tests/assets-sweep-ui.test.ts tests/asset-batch-form-layout.test.ts tests/asset-batch-create.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts`; `npm test` (+1; 2258 tests, 2257 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint`. Messages 4091 (+1 −1). eol: `src/components/assets/asset-batch-form.tsx` `1322 1322`, `tests/v-track2-a.test.ts` `0 206`, `tests/asset-forms-ui.test.ts` `137 137`, `tests/assets-sweep-ui.test.ts` `0 281`.
- [ ] **Step 6: Commit.** `git add src/components/assets/asset-batch-form.tsx messages/th.json messages/en.json tests/v-track2-a.test.ts tests/asset-forms-ui.test.ts tests/assets-sweep-ui.test.ts tests/validation-guards.test.ts`, then `git commit -m "feat(assets): the batch form shows its errors under the shared fields and each row, and a refusal leaves the review (v-track plan 2 task 2, A2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 3 (A3): The register's bulk update shows its errors under the field and its apply is no longer gated by them (`c/assets/asset-register-table.tsx`)

Spec §4.3 ("at least one destination" is a group), §4.4, §5 #3, §5 silent returns. A-R1, A-R8.

**Files:** Modify `src/components/assets/asset-register-table.tsx` (CRLF) · Pins `tests/asset-register-table-ui.test.ts` (CRLF) · Guard `tests/validation-guards.test.ts` · Test `tests/v-track2-a.test.ts` (LF).

**Changes at e1caa29** (the exact text is the rehearsed edit list below the table):

| Line | Now | Becomes | Rule |
|---|---|---|---|
| after `:56` | `import { useApiError } …` | `import { useFieldErrors } from "@/components/ui/use-field-errors"`, `import { atLeastOne, maxLength, required } from "@/lib/validation-rules"` | A-R1 |
| before `type AssetRegisterTableProps` `:75` | — | `BULK_FIELD_IDS` (`toLocationId: "asset-bulk-location"`, `toCustodianId: "asset-bulk-custodian"`, `reason: "asset-bulk-reason"`), `BulkField`, `BULK_FIELD_ORDER`, `BulkUpdateValues`, `validate(values)` | A-R8 |
| `bulkForm :203-208` | `useState({ … })` | `useState<BulkUpdateValues>({ … })`, then `bulkErrors` and `focusBulkError` | A-R1 |
| before `submitBulkUpdate :372` | — | `openBulkUpdate()` (starts without errors) and `setBulkField(field, value)` (the two changes clear together) | spec §4.3 |
| `:374` | `if (selectedAssets.length === 0 \|\| (!bulkForm.toLocationId && !bulkForm.toCustodianId)) return` | `// The dialog opens only from the bar of a selection; the rest are the fields' rules.` / `if (selectedAssets.length === 0) return` / `bulkErrors.setErrors(validate(bulkForm))` / `if (focusBulkError()) return` | A-R8 |
| `:387` | `if (!response.ok) throw new Error(payload?.error ?? labels.bulkUpdateFailed)` | the refusal block (M-R4) with `bulkErrors.applyServer(payload) && focusBulkError()` | M-R4 |
| `:489` | `onClick={() => setBulkUpdateOpen(true)}` | `onClick={openBulkUpdate}` | M-R5 |
| `:704` | `<form onSubmit={submitBulkUpdate} className={accessibleDialogFormClasses}>` | `<form onSubmit={submitBulkUpdate} noValidate className={accessibleDialogFormClasses}>` | FIXED 6 |
| `:706,:719,:732` | `<Field label={labels.currentLocation}>`, `<Field label={labels.custodian}>`, `<Field label={labels.reason} required>` | `id` and `error={bulkErrors.message(…)}`; each `onChange` calls `setBulkField(…)` (the remark's too) | M-R5 |
| `:751` | `<Button type="submit" busy={bulkSaving} disabled={!bulkForm.toLocationId && !bulkForm.toCustodianId}>` | `<Button type="submit" busy={bulkSaving}>` | A-R8 |

The full rehearsed edit list of this task's source files (exact old → new, each old text once in the file at that point, applied in order; rebuilt from `e1caa29` in the rehearsal and checked to give the rehearsal commit byte for byte) is `<temp>/area-A-edits/A3.md` (read-only). The Changes table is the brief; the exact blocks below are what Step 1 pins.

The module block, before `type AssetRegisterTableProps` (exact):

```tsx
// The bulk update's fields in visual order, keyed like the server's fieldErrors (validations/asset-operations.ts), with
// the id focus moves to (v-track M-R1).
const BULK_FIELD_IDS = {
  toLocationId: "asset-bulk-location",
  toCustodianId: "asset-bulk-custodian",
  reason: "asset-bulk-reason",
} as const
type BulkField = keyof typeof BULK_FIELD_IDS
const BULK_FIELD_ORDER = Object.keys(BULK_FIELD_IDS) as BulkField[]

type BulkUpdateValues = { toLocationId: string; toCustodianId: string; reason: string; remark: string }

// noValidate turns the browser's check off, so this restates the reason's required and maxLength, and the server's rule
// that one of the two changes is chosen, with the server's own code under the location (v-track M-R2, spec §4.4).
function validate(values: BulkUpdateValues): Partial<Record<BulkField, string>> {
  const errors: Partial<Record<BulkField, string>> = {}
  const check = (key: BulkField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("toLocationId", atLeastOne([values.toLocationId, values.toCustodianId]) ? "bulkUpdateFieldRequired" : null)
  check("reason", required(values.reason) ?? maxLength(values.reason, 500))
  return errors
}
```

`openBulkUpdate`, `setBulkField` and the head of `submitBulkUpdate` (exact):

```tsx
  function openBulkUpdate() {
    bulkErrors.setErrors({})
    setBulkUpdateOpen(true)
  }

  function setBulkField(field: keyof BulkUpdateValues, value: string) {
    setBulkForm((current) => ({ ...current, [field]: value }))
    // The two changes are one rule: choosing either clears it (spec §4.3).
    if (field === "toLocationId" || field === "toCustodianId") bulkErrors.clear("toLocationId", "toCustodianId")
    else if (field === "reason") bulkErrors.clear("reason")
  }

  async function submitBulkUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // The dialog opens only from the bar of a selection; the rest are the fields' rules.
    if (selectedAssets.length === 0) return
    bulkErrors.setErrors(validate(bulkForm))
    if (focusBulkError()) return
```

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-a.test.ts`:

```ts

test("asset register bulk update: one of the two changes and the reason are errors on submit, apply is enabled, and a refusal stays in the dialog (v-track A3)", () => {
  const source = read(`${C}assets/asset-register-table.tsx`)
  assertMovedForm(source, {
    handler: "submitBulkUpdate",
    table: "BULK_FIELD_IDS",
    hook: "bulkErrors",
    ids: { toLocationId: "asset-bulk-location", toCustodianId: "asset-bulk-custodian", reason: "asset-bulk-reason" },
  })
  const rules = functionBody(source)
  for (const rule of [
    'check("toLocationId", atLeastOne([values.toLocationId, values.toCustodianId]) ? "bulkUpdateFieldRequired" : null)',
    'check("reason", required(values.reason) ?? maxLength(values.reason, 500))',
  ]) assert.ok(rules.includes(rule), rule)
  // A content rule, not a gate (spec §4.4): apply is enabled. An empty selection cannot open the dialog.
  assert.match(source, /<Button type="submit" busy=\{bulkSaving\}>/)
  assert.doesNotMatch(source, /disabled=\{!bulkForm\.toLocationId/)
  assert.match(source, /if \(selectedAssets\.length === 0\) return\n\s+bulkErrors\.setErrors\(validate\(bulkForm\)\)\n\s+if \(focusBulkError\(\)\) return/)
  assert.ok(source.includes('<Field label={labels.currentLocation} id="asset-bulk-location" error={bulkErrors.message("toLocationId")}>'))
  assert.ok(source.includes('<Field label={labels.custodian} id="asset-bulk-custodian" error={bulkErrors.message("toCustodianId")}>'))
  assert.ok(source.includes('<Field label={labels.reason} id="asset-bulk-reason" required error={bulkErrors.message("reason")}>'))
  // The two changes are one rule and clear together; each opening starts without errors (spec §4.3).
  assert.match(source, /if \(field === "toLocationId" \|\| field === "toCustodianId"\) bulkErrors\.clear\("toLocationId", "toCustodianId"\)/)
  assert.match(source, /function openBulkUpdate\(\) \{\n\s+bulkErrors\.setErrors\(\{\}\)/)
  assert.match(source, /if \(bulkErrors\.applyServer\(payload\) && focusBulkError\(\)\) return\n\s+throw new Error\(payload\?\.error \?\? labels\.bulkUpdateFailed\)/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-a.test.ts`. Expected to fail: "asset register bulk update: one of the two changes and the reason are errors on submit, apply is enabled, and a refusal stays in the dialog (v-track A3)" ("noValidate directly after onSubmit"). After Step 3 and before Step 4, `node --test tests/asset-register-table-ui.test.ts` fails "the bulk update dialog uses the dialog parts, shared fields and a busy submit (2C batch 4, O1)"; Step 4 is its edit.
- [ ] **Step 3: Implement** with the rehearsed edits, in order (the Changes table says what each does).
- [ ] **Step 4: Pin and guard edits:**

- `tests/asset-register-table-ui.test.ts:323`, old:

  ```ts
    assert.match(dialog, /<form onSubmit=\{submitBulkUpdate\} className=\{accessibleDialogFormClasses\}>\n\s+<AccessibleDialogBody className="space-y-4">/)
    assert.equal(dialog.match(/<Field label=\{labels\.(?:currentLocation|custodian|remark)\}>/g)?.length, 3)
    assert.match(dialog, /<Field label=\{labels\.reason\} required>\n\s+<Input\n[\s\S]*?\n\s+required\n\s+maxLength=\{500\}\n\s+\/>/)
  ```

  new:

  ```ts
    // v-track plan 2 A3: noValidate, each checked field with its id and error, and apply no longer gated by its rule.
    assert.match(dialog, /<form onSubmit=\{submitBulkUpdate\} noValidate className=\{accessibleDialogFormClasses\}>\n\s+<AccessibleDialogBody className="space-y-4">/)
    assert.equal(dialog.match(/<Field label=\{labels\.(?:currentLocation|custodian)\} id="asset-bulk-[\w-]+" error=\{bulkErrors\.message\("\w+"\)\}>/g)?.length, 2)
    assert.equal(dialog.match(/<Field label=\{labels\.remark\}>/g)?.length, 1)
    assert.match(dialog, /<Field label=\{labels\.reason\} id="asset-bulk-reason" required error=\{bulkErrors\.message\("reason"\)\}>\n\s+<Input\n[\s\S]*?\n\s+required\n\s+maxLength=\{500\}\n\s+\/>/)
  ```
- `tests/asset-register-table-ui.test.ts:328`, old:

  ```ts
    assert.match(dialog, /<AccessibleDialogFooter>\n\s+<AccessibleDialogCancel>\{labels\.cancel\}<\/AccessibleDialogCancel>\n\s+<Button type="submit" busy=\{bulkSaving\} disabled=\{!bulkForm\.toLocationId && !bulkForm\.toCustodianId\}>\n\s+\{labels\.applyBulkUpdate\}\n\s+<\/Button>\n\s+<\/AccessibleDialogFooter>\n\s+<\/form>/)
  ```

  new:

  ```ts
    assert.match(dialog, /<AccessibleDialogFooter>\n\s+<AccessibleDialogCancel>\{labels\.cancel\}<\/AccessibleDialogCancel>\n\s+<Button type="submit" busy=\{bulkSaving\}>\n\s+\{labels\.applyBulkUpdate\}\n\s+<\/Button>\n\s+<\/AccessibleDialogFooter>\n\s+<\/form>/)
  ```
- `V_FORMS`: insert `` `${C}assets/asset-register-table.tsx`, `` directly above `` `${C}reports/report-preset-controls.tsx`, ``.
- [ ] **Step 5: Verify.** `node --test tests/v-track2-a.test.ts tests/asset-register-table-ui.test.ts tests/asset-register-ux.test.ts tests/accessible-dialog.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/visual-foundation-guards.test.ts`; `npm test` (+1; 2259 tests, 2258 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint`. eol: `src/components/assets/asset-register-table.tsx` `825 825`, `tests/asset-register-table-ui.test.ts` `333 333`, `tests/v-track2-a.test.ts` `0 232`.
- [ ] **Step 6: Commit.** `git add src/components/assets/asset-register-table.tsx tests/asset-register-table-ui.test.ts tests/v-track2-a.test.ts tests/validation-guards.test.ts`, then `git commit -m "feat(assets): the register's bulk update shows its errors under the field and its apply is no longer gated by them (v-track plan 2 task 3, A3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 4 (A4): Component install and removal check their fields on submit, and a refusal returns to the details step (`c/assets/asset-component-manager.tsx`)

Spec §4.2 (multi-step flows go back to the owning step), §4.4, §4.5, §5 #4, #5, §5 the 21 gates and 14 silent returns. A-R1, A-R9.

**Files:** Modify `src/components/assets/asset-component-manager.tsx` (CRLF) · Pins `tests/asset-forms-ui.test.ts` (CRLF) · Guard `tests/validation-guards.test.ts` · Test `tests/v-track2-a.test.ts` (LF).

**Changes at e1caa29** (the exact text is the rehearsed edit list below the table):

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:9` | one-line `import { AccessibleDialog, … } from "@/components/ui/accessible-dialog"` | one name per line, adding `accessibleDialogFormClasses` | A-R9 |
| after `:24` | `import { useApiError } …` | `import { useFieldErrors } …`, `import { maxLength, required } from "@/lib/validation-rules"` | A-R1 |
| after `componentRoles :116` | — | `INSTALL_FIELD_IDS` (`componentRole: "component-install-role"`, `slotNo: "component-install-slot"`, `installedAt: "component-install-installed-at"`, `reason: "component-install-reason"`), `InstallField`, `INSTALL_FIELD_ORDER`, `validate(values)`, `validateRemoval(reason)` | A-R9 |
| after `:152` | — | `installErrors` and `focusInstallError` (`reveal: () => setInstallStep("details")`) | spec §4.2 |
| `resetInstallFlow :192-202` | ends `setInstallEvidence(null)` | adds `installErrors.setErrors({})` | spec §4.3 |
| `openReview :204-210` | `toast.error(labels.error)` guard | `openReview(event)` with `preventDefault`, `setErrors(validate({ componentRole, slotNo, reason }))`, `if (focusInstallError()) return` | A-R9 |
| `installComponent :213` | `if (!selectedComponent \|\| !componentRole.trim()) return` | the comment `// The review shows only for a chosen component whose details passed validate().` and `if (!selectedComponent) return` | A-R9 |
| `:227` | `if (!response.ok) throw new Error(payload?.error ?? labels.error)` | the refusal block with `installErrors.applyServer(payload) && focusInstallError()` | spec §4.2 |
| details step `:323`, `:360` | `<div className="space-y-4">` … `</div>` | `<form onSubmit={openReview} noValidate className="space-y-4">` … `</form>` | A-R9 |
| `:326-340` | four `Field`s without id or error | `id` and `error={installErrors.message(…)}` each, the role `required`; each `onChange` a block that also clears its key | A-R9 |
| `:355` | `<Button onClick={openReview}>` | `<Button type="submit">` | A-R9 |
| removal dialog `:533` | after `removeEvidence` state | `removeErrors` and `handleSubmit(event)` | A-R9 |
| `:552-566` | `<>` … `</>` around the body and footer | `<form onSubmit={handleSubmit} noValidate className={accessibleDialogFormClasses}>` … `</form>`; the reason `Field` gets `id="component-remove-reason"` and its error; the confirm is `<Button type="submit" variant="destructive" busy={busy}>` | A-R9 |

The full rehearsed edit list of this task's source files (exact old → new, each old text once in the file at that point, applied in order; rebuilt from `e1caa29` in the rehearsal and checked to give the rehearsal commit byte for byte) is `<temp>/area-A-edits/A4.md` (read-only). The Changes table is the brief; the exact blocks below are what Step 1 pins.

The module block, after `componentRoles` (exact):

```tsx
// The install's details in visual order, keyed like the server's fieldErrors (validations/asset-operations.ts), with the
// id focus moves to (v-track M-R1). The component itself is chosen in the step before: a prerequisite, not a field.
const INSTALL_FIELD_IDS = {
  componentRole: "component-install-role",
  slotNo: "component-install-slot",
  installedAt: "component-install-installed-at",
  reason: "component-install-reason",
} as const
type InstallField = keyof typeof INSTALL_FIELD_IDS
const INSTALL_FIELD_ORDER = Object.keys(INSTALL_FIELD_IDS) as InstallField[]

// noValidate turns the browser's check off, so this restates the controls' maxLength and the server's required role
// (v-track M-R2). The removal's reason is optional; its rule is its maxLength (validateRemoval).
function validate(values: { componentRole: string; slotNo: string; reason: string }): Partial<Record<InstallField, string>> {
  const errors: Partial<Record<InstallField, string>> = {}
  const check = (key: InstallField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("componentRole", required(values.componentRole) ?? maxLength(values.componentRole, 100))
  check("slotNo", maxLength(values.slotNo, 50))
  check("reason", maxLength(values.reason, 500))
  return errors
}

function validateRemoval(reason: string): Partial<Record<"reason", string>> {
  const code = maxLength(reason, 500)
  return code ? { reason: code } : {}
}
```

`openReview` and the head of `installComponent` (exact):

```tsx
  function openReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    installErrors.setErrors(validate({ componentRole, slotNo, reason }))
    if (focusInstallError()) return
    setInstallStep("review")
  }

  async function installComponent() {
    // The review shows only for a chosen component whose details passed validate().
    if (!selectedComponent) return
```

The removal dialog's hook and submit (exact):

```tsx
  // The removal's reason is optional and the server has no rule for it, so this form has no server step.
  const removeErrors = useFieldErrors<"reason">()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    removeErrors.setErrors(validateRemoval(reason))
    if (removeErrors.focusFirst(["reason"], { idFor: () => "component-remove-reason" })) return
    onConfirm(reason.trim(), removeEvidence)
  }
```

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-a.test.ts`:

```ts

test("component install and removal: the details step and the removal dialog are forms that check themselves, and a refusal returns to the details step (v-track A4)", () => {
  const source = read(`${C}assets/asset-component-manager.tsx`)
  assertMovedForm(source, {
    handler: "openReview",
    table: "INSTALL_FIELD_IDS",
    hook: "installErrors",
    ids: {
      componentRole: "component-install-role",
      slotNo: "component-install-slot",
      installedAt: "component-install-installed-at",
      reason: "component-install-reason",
    },
  })
  const rules = functionBody(source)
  for (const rule of [
    'check("componentRole", required(values.componentRole) ?? maxLength(values.componentRole, 100))',
    'check("slotNo", maxLength(values.slotNo, 50))',
    'check("reason", maxLength(values.reason, 500))',
  ]) assert.ok(rules.includes(rule), rule)
  // The role is required by the server, so it shows the star; the continue button submits the details step.
  assert.ok(source.includes('<Field label={labels.componentRole} id="component-install-role" required error={installErrors.message("componentRole")}>'))
  assert.match(source, /<form onSubmit=\{openReview\} noValidate className="space-y-4">/)
  assert.match(source, /<Button type="submit">\n\s+<CheckCircle2 aria-hidden="true" \/>\n\s+\{labels\.continueReview\}/)
  // A multi-step flow goes back to the step that owns the field (spec §4.2).
  assert.match(source, /reveal: \(\) => setInstallStep\("details"\)/)
  assert.match(source, /if \(installErrors\.applyServer\(payload\) && focusInstallError\(\)\) return\n\s+throw new Error\(payload\?\.error \?\? labels\.error\)/)
  assert.match(source, /async function installComponent\(\) \{\n\s+\/\/[^\n]*\n\s+if \(!selectedComponent\) return\n/)
  // The removal dialog is a form too: its optional reason keeps its maxLength; the server has no rule for it.
  assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate className=\{accessibleDialogFormClasses\}>/)
  assert.match(functionBody(source, "validateRemoval"), /const code = maxLength\(reason, 500\)/)
  assert.match(source, /removeErrors\.setErrors\(validateRemoval\(reason\)\)\n\s+if \(removeErrors\.focusFirst\(\["reason"\], \{ idFor: \(\) => "component-remove-reason" \}\)\) return/)
  assert.match(source, /<Button type="submit" variant="destructive" busy=\{busy\}>/)
  assert.doesNotMatch(source, /\btoast\.(?:error|warning)\(/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-a.test.ts`. Expected to fail: "component install and removal: the details step and the removal dialog are forms that check themselves, and a refusal returns to the details step (v-track A4)" ("noValidate directly after onSubmit"). After Step 3 and before Step 4, `node --test tests/asset-forms-ui.test.ts` fails "component removal dialog uses the shared parts, a code tag in its description and a busy destructive confirm (K9, K11, K13)"; Step 4 is its edit.
- [ ] **Step 3: Implement** with the rehearsed edits, in order (the Changes table says what each does).
- [ ] **Step 4: Pin and guard edits:**

- `tests/asset-forms-ui.test.ts:117`, old:

  ```ts
    assert.match(manager, /<AccessibleDialogBody className="space-y-4">\n\s*<Field label=\{labels\.removeReason\}>\n\s*<Textarea ref=\{reasonRef\}/)
  ```

  new:

  ```ts
    // v-track plan 2 A4: the dialog is a form; the reason has its id and error, and the confirm submits it.
    assert.match(manager, /<AccessibleDialogBody className="space-y-4">\n\s*<Field label=\{labels\.removeReason\} id="component-remove-reason" error=\{removeErrors\.message\("reason"\)\}>\n\s*<Textarea\n\s*ref=\{reasonRef\}/)
  ```
- `tests/asset-forms-ui.test.ts:120`, old:

  ```ts
      /<AccessibleDialogFooter>\n\s*<AccessibleDialogCancel>\{labels\.cancel\}<\/AccessibleDialogCancel>\n\s*<Button variant="destructive" busy=\{busy\} onClick=/,
  ```

  new:

  ```ts
      /<AccessibleDialogFooter>\n\s*<AccessibleDialogCancel>\{labels\.cancel\}<\/AccessibleDialogCancel>\n\s*<Button type="submit" variant="destructive" busy=\{busy\}>/,
  ```
- `V_FORMS`: insert `` `${C}assets/asset-component-manager.tsx`, `` directly above `` `${C}reports/report-preset-controls.tsx`, ``.
- [ ] **Step 5: Verify.** `node --test tests/v-track2-a.test.ts tests/asset-forms-ui.test.ts tests/asset-component-manager.test.ts tests/steps-ui.test.ts tests/assets-sweep-ui.test.ts tests/accessible-dialog.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts`; `npm test` (+1; 2260 tests, 2259 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint`. eol: `src/components/assets/asset-component-manager.tsx` `670 670`, `tests/asset-forms-ui.test.ts` `138 138`, `tests/v-track2-a.test.ts` `0 267`.
- [ ] **Step 6: Commit.** `git add src/components/assets/asset-component-manager.tsx tests/asset-forms-ui.test.ts tests/v-track2-a.test.ts tests/validation-guards.test.ts`, then `git commit -m "feat(assets): component install and removal check their fields on submit, and a refusal returns to the details step (v-track plan 2 task 4, A4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 5 (A5): The status correction checks its reason on submit and its confirm is enabled (`c/assets/asset-status-correction-button.tsx`)

Spec §4.4 ("status-correction reason ≥ 5 characters" is a content rule; its button becomes enabled), §5 #6. A-R1, A-R10; M-R4 (the minimum says its numbers).

**Files:** Modify `src/components/assets/asset-status-correction-button.tsx` (CRLF) · Pins `tests/asset-status-correction-ui.test.ts` (CRLF), `tests/asset-operation-status-policy.test.ts` (CRLF), `tests/assets-sweep-ui.test.ts` (LF) · Guard `tests/validation-guards.test.ts` · Test `tests/v-track2-a.test.ts` (LF).

**Changes at e1caa29** (the exact text is the rehearsed edit list below the table):

| Line | Now | Becomes | Rule |
|---|---|---|---|
| after `:10` | `import { Textarea } …` | the hook and rule imports; `FIELD_IDS` (`reason: "asset-status-correction-reason"`, the Textarea's existing id), `CorrectionField`, `FIELD_ORDER`, `validate(values)` | A-R10 |
| `:33-37` | `async function submitCorrection() {` / `setError(null)` / `setIsSubmitting(true)` | `fieldErrors`, `validationMessage`, `focusFirstError`; `async function handleSubmit(event)` with `preventDefault`, `setError(null)`, `setErrors(validate({ reason }))`, `if (focusFirstError()) return`, `setIsSubmitting(true)` | A-R10 |
| `:46-47` | `if (!response.ok) {` / `setError(payload?.error ?? labels.errorFallback)` | between them the refusal comment and `if (fieldErrors.applyServer(payload) && focusFirstError()) return` | spec §4.1.3 |
| `:72` | `<div id={panelId} className="rounded-md border border-border bg-background p-4">` | `<form onSubmit={handleSubmit} noValidate id={panelId} className="rounded-md border border-border bg-background p-4">` (and its `</div>` → `</form>`) | A-R10 |
| `:75-79` | `<Field label={labels.reason} className="mt-3">`, `onChange={(event) => setReason(event.target.value)}` | one prop per line: `label`, `required`, `className="mt-3"`, `error={fieldErrors.errors.reason ? validationMessage(fieldErrors.errors.reason, { min: 5, max: 500 }) : undefined}`; `onChange` a block that also clears `"reason"` | M-R4 |
| cancel `:88-91` | `setOpen(false)` / `setError(null)` | adds `fieldErrors.setErrors({})` | spec §4.3 |
| `:95` | `<Button busy={isSubmitting} disabled={reason.trim().length < 5} onClick={submitCorrection}>` | `<Button type="submit" busy={isSubmitting}>` | A-R10 |

The full rehearsed edit list of this task's source files (exact old → new, each old text once in the file at that point, applied in order; rebuilt from `e1caa29` in the rehearsal and checked to give the rehearsal commit byte for byte) is `<temp>/area-A-edits/A5.md` (read-only). The Changes table is the brief; the exact blocks below are what Step 1 pins.

The imports and the module block, after `import { Textarea } …` (exact):

```tsx
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"
import { maxLength, minLength, required } from "@/lib/validation-rules"

// The one field, keyed like the server's fieldErrors (validations/asset-status-correction.ts), with the id focus moves to
// (v-track M-R1). The server's other key, nextStatusId, is not a field here (the target is always Ready): its refusal
// shows in the error line under the field, as today (spec §4.1.3).
const FIELD_IDS = {
  reason: "asset-status-correction-reason",
} as const
type CorrectionField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as CorrectionField[]

// The server's rule for the reason, 5 to 500 characters, which a disabled button used to hide (spec §4.4, v-track M-R2).
function validate(values: { reason: string }): Partial<Record<CorrectionField, string>> {
  const errors: Partial<Record<CorrectionField, string>> = {}
  const check = (key: CorrectionField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("reason", required(values.reason) ?? minLength(values.reason, 5) ?? maxLength(values.reason, 500))
  return errors
}
```

The hook and the head of `handleSubmit` (exact):

```tsx
  const fieldErrors = useFieldErrors<CorrectionField>()
  const validationMessage = useValidationMessage()
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    fieldErrors.setErrors(validate({ reason }))
    if (focusFirstError()) return
    setIsSubmitting(true)
```

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-a.test.ts`:

```ts

test("status correction: the reason's 5 characters are an error on submit with its numbers, and the confirm is enabled (v-track A5)", () => {
  const source = read(`${C}assets/asset-status-correction-button.tsx`)
  assertMovedForm(source, { ids: { reason: "asset-status-correction-reason" } })
  assert.ok(functionBody(source).includes('check("reason", required(values.reason) ?? minLength(values.reason, 5) ?? maxLength(values.reason, 500))'))
  // A content rule, not a gate (spec §4.4): the panel is a form and its confirm is enabled.
  assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate id=\{panelId\} className="rounded-md border border-border bg-background p-4">/)
  assert.match(source, /<Button type="submit" busy=\{isSubmitting\}>/)
  assert.doesNotMatch(source, /(?<![\w-])disabled=\{/)
  // The field says its numbers and shows the star; the server's other refusals keep the error line under it.
  assert.match(source, /<Field\n\s+label=\{labels\.reason\}\n\s+required\n\s+className="mt-3"\n\s+error=\{fieldErrors\.errors\.reason \? validationMessage\(fieldErrors\.errors\.reason, \{ min: 5, max: 500 \}\) : undefined\}\n\s+>/)
  assert.match(source, /if \(fieldErrors\.applyServer\(payload\) && focusFirstError\(\)\) return\n\s+setError\(payload\?\.error \?\? labels\.errorFallback\)/)
  assert.match(source, /\{error \? <p className="mt-2 text-sm text-danger"><ApiErrorText error=\{error\} \/><\/p> : null\}/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-a.test.ts`. Expected to fail: "status correction: the reason's 5 characters are an error on submit with its numbers, and the confirm is enabled (v-track A5)" ("noValidate directly after onSubmit"). After Step 3 and before Step 4, `node --test tests/asset-status-correction-ui.test.ts tests/asset-operation-status-policy.test.ts tests/assets-sweep-ui.test.ts` fails "the status correction uses Button, a shared reason field and a busy submit that keeps its label (2C batch 4)", "asset detail exposes controlled status correction action" and "status correction: the trigger says whether its panel is open, and the panel is a quiet grouping with a neutral Notice (spec 2D M27, D7)"; Step 4 is their edit.
- [ ] **Step 3: Implement** with the rehearsed edits, in order (the Changes table says what each does).
- [ ] **Step 4: Pin and guard edits:**

- `tests/asset-status-correction-ui.test.ts:14`, old:

  ```ts
    assert.match(source, /<Field label=\{labels\.reason\} className="mt-3">\n\s+<Textarea\n\s+id="asset-status-correction-reason"/)
  ```

  new:

  ```ts
    // v-track plan 2 A5: the reason shows the star and its error; its rule is checked on submit, not by a disabled button.
    assert.match(source, /<Field\n\s+label=\{labels\.reason\}\n\s+required\n\s+className="mt-3"\n[^\n]*\n\s+>\n\s+<Textarea\n\s+id="asset-status-correction-reason"/)
  ```
- `tests/asset-status-correction-ui.test.ts:16`, old:

  ```ts
    assert.match(source, /<Button busy=\{isSubmitting\} disabled=\{reason\.trim\(\)\.length < 5\} onClick=\{submitCorrection\}>\n\s+\{labels\.submit\}\n\s+<\/Button>/)
  ```

  new:

  ```ts
    assert.match(source, /<Button type="submit" busy=\{isSubmitting\}>\n\s+\{labels\.submit\}\n\s+<\/Button>/)
  ```
- `tests/asset-operation-status-policy.test.ts:105`, old:

  ```ts
    assert.match(componentSource, /reason\.trim\(\)\.length < 5/)
  ```

  new:

  ```ts
    // v-track plan 2 A5: the 5-character rule is checked on submit (validate), not by a disabled button.
    assert.match(componentSource, /minLength\(values\.reason, 5\)/)
  ```
- `tests/assets-sweep-ui.test.ts:31`, old:

  ```ts
    assert.match(source, /<div id=\{panelId\} className="rounded-md border border-border bg-background p-4">/)
  ```

  new:

  ```ts
    // v-track plan 2 A5: the quiet grouping is the correction's form.
    assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate id=\{panelId\} className="rounded-md border border-border bg-background p-4">/)
  ```
- `V_FORMS`: insert `` `${C}assets/asset-status-correction-button.tsx`, `` directly above `` `${C}reports/report-preset-controls.tsx`, ``.
- [ ] **Step 5: Verify.** `node --test tests/v-track2-a.test.ts tests/asset-status-correction-ui.test.ts tests/asset-operation-status-policy.test.ts tests/assets-sweep-ui.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts`; `npm test` (+1; 2261 tests, 2260 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint`. eol: `src/components/assets/asset-status-correction-button.tsx` `141 141`, `tests/asset-status-correction-ui.test.ts` `21 21`, `tests/asset-operation-status-policy.test.ts` `131 131`, `tests/assets-sweep-ui.test.ts` `0 282`, `tests/v-track2-a.test.ts` `0 281`.
- [ ] **Step 6: Commit.** `git add src/components/assets/asset-status-correction-button.tsx tests/asset-status-correction-ui.test.ts tests/asset-operation-status-policy.test.ts tests/assets-sweep-ui.test.ts tests/v-track2-a.test.ts tests/validation-guards.test.ts`, then `git commit -m "feat(assets): the status correction checks its reason on submit and its confirm is enabled (v-track plan 2 task 5, A5)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 6 (A6): The import wizard says why the import waits and checks the picked file (`c/assets/asset-import-preview-panel.tsx`)

Spec §4.4 (prerequisites keep their gate and say why; `aria-disabled` plus a reason), §5 #7; S-R7 (the file rules under `_form`). A-R6.

**Files:** Modify `src/components/assets/asset-import-preview-panel.tsx` (CRLF) · Pins `tests/asset-register-ux.test.ts` (CRLF) · Guard `tests/validation-guards.test.ts` · Test `tests/v-track2-a.test.ts` (LF).

**Changes at e1caa29** (the exact text is the rehearsed edit list below the table):

| Line | Now | Becomes | Rule |
|---|---|---|---|
| after `:26` | `import type { AssetImportColumnMapping } …` | `import { required } from "@/lib/validation-rules"` | A-R6 |
| before `:90` | `export function AssetImportPreviewPanel(` | the comment and `function validate(file: File \| undefined): string \| null { return required(file) }` | A-R6 |
| after `:116` | `const missingColumns = …` | the comment and `const noReadyRows = preview?.summary.readyRows === 0` | A-R6 |
| `:137` | `if (!file) {` | `if (validate(file) \|\| !file) {` | A-R6 |
| `:351` | `<p className="text-sm text-muted-foreground">` | `<p id="asset-import-ready-summary" className="text-sm text-muted-foreground">` | A-R6 |
| `:354` | `<Button busy={isImporting} disabled={preview.summary.readyRows === 0} onClick={() => void confirmImport()}>` | one prop per line: `busy={isImporting}`, `aria-disabled={noReadyRows \|\| undefined}`, `aria-describedby={noReadyRows ? "asset-import-ready-summary" : undefined}`, `onClick={() => void confirmImport()}` | A-R6 |

The full rehearsed edit list of this task's source files (exact old → new, each old text once in the file at that point, applied in order; rebuilt from `e1caa29` in the rehearsal and checked to give the rehearsal commit byte for byte) is `<temp>/area-A-edits/A6.md` (read-only). The Changes table is the brief; the exact blocks below are what Step 1 pins.

`validate`, before `export function AssetImportPreviewPanel(` (exact):

```tsx
// The wizard has no field a person types (v-track plan 2 A-R6): its one rule before the upload is its prerequisite, a
// picked file (spec §4.4). The file's own rules (10 MB, .xlsx) stay the server's; that refusal comes under _form and
// shows in the wizard's error notice like every other refusal (S-R7, spec §4.1.3).
function validate(file: File | undefined): string | null {
  return required(file)
}
```

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-a.test.ts`:

```ts

test("import wizard: a picked file is its one rule, and the import waits for a ready row, focusable and tied to the counts (v-track A6)", () => {
  const source = read(`${C}assets/asset-import-preview-panel.tsx`)
  // No field a person types: validate() states the wizard's prerequisite; the file's own rules stay the server's (_form).
  assert.match(functionBody(source), /^function validate\(file: File \| undefined\): string \| null \{\n\s+return required\(file\)$/)
  assert.match(source, /if \(validate\(file\) \|\| !file\) \{\n\s+setError\(labels\.fileRequired\)/)
  // A prerequisite keeps its gate and says why (spec §4.4): aria-disabled, tied to the counts beside the button.
  assert.match(source, /const noReadyRows = preview\?\.summary\.readyRows === 0\n/)
  assert.match(source, /<p id="asset-import-ready-summary" className="text-sm text-muted-foreground">/)
  assert.match(source, /aria-disabled=\{noReadyRows \|\| undefined\}\n\s+aria-describedby=\{noReadyRows \? "asset-import-ready-summary" : undefined\}/)
  assert.doesNotMatch(source, /disabled=\{preview\.summary\.readyRows === 0\}/)
  assert.match(source, /if \(!selectedFile \|\| !preview \|\| preview\.summary\.readyRows === 0\) return/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-a.test.ts`. Expected to fail: "import wizard: a picked file is its one rule, and the import waits for a ready row, focusable and tied to the counts (v-track A6)" ("a module-level function validate("). After Step 3 and before Step 4, `node --test tests/asset-register-ux.test.ts` fails "the import panel uses Button with busy for choose and import, and a danger Notice for errors (2C batch 4, O13)"; Step 4 is its edit.
- [ ] **Step 3: Implement** with the rehearsed edits, in order (the Changes table says what each does).
- [ ] **Step 4: Pin and guard edits:**

- `tests/asset-register-ux.test.ts:142`, old:

  ```ts
    assert.match(source, /<Button busy=\{isImporting\} disabled=\{preview\.summary\.readyRows === 0\} onClick=\{\(\) => void confirmImport\(\)\}>\n\s+\{labels\.confirmImport\}\n\s+<\/Button>/)
  ```

  new:

  ```ts
    // v-track plan 2 A6: with no ready row the import waits focusable, tied to the counts beside it.
    assert.match(source, /<Button\n\s+busy=\{isImporting\}\n\s+aria-disabled=\{noReadyRows \|\| undefined\}\n\s+aria-describedby=\{noReadyRows \? "asset-import-ready-summary" : undefined\}\n\s+onClick=\{\(\) => void confirmImport\(\)\}\n\s+>\n\s+\{labels\.confirmImport\}\n\s+<\/Button>/)
  ```
- `V_FORMS`: insert `` `${C}assets/asset-import-preview-panel.tsx`, `` directly above `` `${C}reports/report-preset-controls.tsx`, `` (V2: `validate(` and no `<form>`; V3: no toast).
- [ ] **Step 5: Verify.** `node --test tests/v-track2-a.test.ts tests/asset-register-ux.test.ts tests/asset-import-field-labels.test.ts tests/steps-ui.test.ts tests/validation-guards.test.ts`; `npm test` (+1; 2262 tests, 2261 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint`. eol: `src/components/assets/asset-import-preview-panel.tsx` `397 397`, `tests/asset-register-ux.test.ts` `254 254`, `tests/v-track2-a.test.ts` `0 294`.
- [ ] **Step 6: Commit.** `git add src/components/assets/asset-import-preview-panel.tsx tests/asset-register-ux.test.ts tests/v-track2-a.test.ts tests/validation-guards.test.ts`, then `git commit -m "feat(assets): the import wizard says why the import waits and checks the picked file (v-track plan 2 task 6, A6)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 7 (A7): The label print reason shows its error under the toolbar, and the print queue's created dates hold their order (`c/assets/asset-label-print.tsx`, `asset-label-batch-tool.tsx`)

Spec §4.5, §5 #8, §7.4 (the label print queue's created-from/to filter). A-R1, A-R11.

**Files:** Modify `src/components/assets/asset-label-print.tsx`, `src/components/assets/asset-label-batch-tool.tsx` (CRLF) · Pins `tests/asset-label-print-ui.test.ts` (CRLF), `tests/button-size-switch.test.ts` (LF) · Guard `tests/validation-guards.test.ts` · Test `tests/v-track2-a.test.ts` (LF).

**Changes at e1caa29** (the exact text is the rehearsed edit list below the table):

| Line | Now | Becomes | Rule |
|---|---|---|---|
| print `:6-8` | `Button`, `Notice`, `PageBackLink` imports | adds `import { FieldError } from "@/components/ui/field"` and `import { useFieldErrors } from "@/components/ui/use-field-errors"` | A-R11 |
| print after `:19` | `} from "@/lib/asset-label-template"` | `import { cn } from "@/lib/utils"`, `import { maxLength } from "@/lib/validation-rules"`, `FIELD_IDS` (`reason: "asset-label-print-reason"`), `PrintField`, `FIELD_ORDER`, `validate(values)` | A-R11 |
| print after `:74` | `recordError` state | `fieldErrors`, `focusFirstError` | A-R1 |
| print `:85-86` | `async function handlePrint() {` / `if (recordingPrint \|\| assetIds.length === 0) return` | `handlePrint(event)` with `preventDefault`, that return, `setErrors(validate({ reason: printReason }))`, `if (focusFirstError()) return` | A-R11 |
| print `:102` | `if (!response.ok) throw new Error("Unable to record label print")` | the refusal block (M-R4) | M-R4 |
| print `:218-255` | the toolbar's `<div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">` and its children | wrapped in `<form onSubmit={handlePrint} noValidate className="grid min-w-0 gap-1.5">` (its contents indented two spaces), with a comment above; the reason `<label>` takes `className={cn("<the same string>", fieldErrors.errors.reason && "border-danger ring-1 ring-danger shadow-field-error")}`; the reason `<input>` gets `id`, `aria-invalid`, `aria-describedby` and an `onChange` block that clears its error; the print button `<Button type="submit" size="lg" busy={recordingPrint} className="w-full sm:w-auto">` (no `onClick`); after the row `{fieldErrors.errors.reason ? <FieldError id="asset-label-print-reason-error">{fieldErrors.message("reason")}</FieldError> : null}` | A-R11 |
| queue `:422-435` | the two date `Input`s | a comment above; `max={queueFilters.createdTo \|\| undefined}` after the from's `value`, `min={queueFilters.createdFrom \|\| undefined}` after the to's | A-R11 |

The full rehearsed edit list of this task's source files (exact old → new, each old text once in the file at that point, applied in order; rebuilt from `e1caa29` in the rehearsal and checked to give the rehearsal commit byte for byte) is `<temp>/area-A-edits/A7.md` (read-only). The Changes table is the brief; the exact blocks below are what Step 1 pins.

The imports and the module block, after `} from "@/lib/asset-label-template"` (exact):

```tsx
import { cn } from "@/lib/utils"
import { maxLength } from "@/lib/validation-rules"

// The print's one field, keyed like the server's fieldErrors (the label-prints route), with the id focus moves to
// (v-track M-R1). The tape size always holds one of its choices.
const FIELD_IDS = {
  reason: "asset-label-print-reason",
} as const
type PrintField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as PrintField[]

// noValidate turns the browser's check off, so this restates the reason's maxLength, the server's max(500) (v-track M-R2).
function validate(values: { reason: string }): Partial<Record<PrintField, string>> {
  const errors: Partial<Record<PrintField, string>> = {}
  const check = (key: PrintField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("reason", maxLength(values.reason, 500))
  return errors
}

export type AssetLabelPrintItem = {
  id: string
  assetTag: string
  name: string
  serialNumber?: string | null
  category: string
  company: string
  branch: string
  location: string
  qrValue: string
}
```

The print's form, the toolbar row inside it (exact):

```tsx
          {/* The toolbar is the print's form: Enter in the reason prints, and the reason's error shows under the row. */}
          <form onSubmit={handlePrint} noValidate className="grid min-w-0 gap-1.5">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <label
                className={cn(
                  "flex min-h-11 w-full min-w-0 flex-wrap items-center gap-2 rounded-md border border-input bg-surface px-3 py-2 text-base sm:min-w-[240px] sm:flex-nowrap sm:py-0 md:h-10 md:min-h-0 md:text-sm focus-within:border-ring focus-within:ring-1 focus-within:ring-ring focus-within:shadow-field-focus",
                  // The field error look of the shared fields (cn drops border-input); focus turns it teal again.
                  fieldErrors.errors.reason && "border-danger ring-1 ring-danger shadow-field-error",
                )}
              >
                <span className="shrink-0 font-medium text-muted-foreground">{translations.printReason}</span>
                <input
                  id="asset-label-print-reason"
                  type="text"
                  value={printReason}
                  onChange={(event) => {
                    setPrintReason(event.target.value)
                    fieldErrors.clear("reason")
                  }}
                  aria-invalid={fieldErrors.errors.reason ? true : undefined}
                  aria-describedby={fieldErrors.errors.reason ? "asset-label-print-reason-error" : undefined}
                  placeholder={translations.printReasonPlaceholder}
                  maxLength={500}
                  className="min-w-0 flex-1 bg-transparent outline-none"
                />
              </label>
              {/* Spec 2D M27: shrink-0 keeps the tape box at its value's width; the reason box beside it takes the shrink. */}
              <label className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-surface px-3 text-base sm:w-auto sm:shrink-0 md:h-10 md:min-h-0 md:text-sm focus-within:border-ring focus-within:ring-1 focus-within:ring-ring focus-within:shadow-field-focus">
                <span className="shrink-0 font-medium text-muted-foreground">{translations.tapeSize}</span>
                <select
                  value={tapeSize}
                  onChange={(event) => setTapeSize(event.target.value as AssetLabelTapeSize)}
                  className="min-w-0 flex-1 bg-transparent font-medium outline-none sm:flex-none"
                >
                  {assetLabelTapeSizes.map((size) => (
                    <option key={size} value={size}>
                      {size === "12"
                        ? `${translations.tape12mm} / 0.47"`
                        : size === "18"
                          ? `${translations.tape18mm} / 0.70"`
                          : size === "24"
                            ? `${translations.tape24mm} / 0.94"`
                            : translations.tapeCustom}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit" size="lg" busy={recordingPrint} className="w-full sm:w-auto">
                <Printer aria-hidden="true" />
                {translations.print}
              </Button>
            </div>
            {fieldErrors.errors.reason ? <FieldError id="asset-label-print-reason-error">{fieldErrors.message("reason")}</FieldError> : null}
          </form>
        </div>
```

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-a.test.ts`:

```ts

test("label print: the toolbar is a form whose reason shows its error under the row, and the queue's created dates hold their order (v-track A7)", () => {
  const source = read(`${C}assets/asset-label-print.tsx`)
  assertMovedForm(source, { handler: "handlePrint", ids: { reason: "asset-label-print-reason" } })
  assert.ok(functionBody(source).includes('check("reason", maxLength(values.reason, 500))'))
  assert.match(source, /event\.preventDefault\(\)\n\s+if \(recordingPrint \|\| assetIds\.length === 0\) return\n\s+fieldErrors\.setErrors\(validate\(\{ reason: printReason \}\)\)/)
  assert.match(source, /<Button type="submit" size="lg" busy=\{recordingPrint\} className="w-full sm:w-auto">/)
  // The boxed reason (2C K21) takes the error look itself, ties its error line, and turns teal on focus.
  assert.match(source, /fieldErrors\.errors\.reason && "border-danger ring-1 ring-danger shadow-field-error",/)
  assert.match(source, /aria-invalid=\{fieldErrors\.errors\.reason \? true : undefined\}\n\s+aria-describedby=\{fieldErrors\.errors\.reason \? "asset-label-print-reason-error" : undefined\}/)
  assert.ok(source.includes('{fieldErrors.errors.reason ? <FieldError id="asset-label-print-reason-error">{fieldErrors.message("reason")}</FieldError> : null}'))
  assert.match(source, /if \(fieldErrors\.applyServer\(payload\) && focusFirstError\(\)\) return\n\s+throw new Error\("Unable to record label print"\)/)
  // The print queue's filter: the end cannot be picked before the start (spec U4, §7.4); a filter has no validate().
  const queue = read(`${C}assets/asset-label-batch-tool.tsx`)
  assert.match(queue, /value=\{queueFilters\.createdFrom\}\n\s+max=\{queueFilters\.createdTo \|\| undefined\}/)
  assert.match(queue, /value=\{queueFilters\.createdTo\}\n\s+min=\{queueFilters\.createdFrom \|\| undefined\}/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-a.test.ts`. Expected to fail: "label print: the toolbar is a form whose reason shows its error under the row, and the queue's created dates hold their order (v-track A7)" ("noValidate directly after onSubmit"). After Step 3 and before Step 4, `node --test tests/asset-label-print-ui.test.ts tests/button-size-switch.test.ts` fails "the label print toolbar keeps its boxed fields with a focus ring and a busy print button (2C batch 4)" and "buttons in a row of 40px fields stay 40px: lg for text, icon-lg for icons (spec 2D D3, D5, M2)"; Step 4 is their edit.
- [ ] **Step 3: Implement** with the rehearsed edits, in order (the Changes table says what each does).
- [ ] **Step 4: Pin and guard edits:**

- `tests/asset-label-print-ui.test.ts:210`, old:

  ```ts
    const boxes = [...source.matchAll(/<label className="([^"]+)">/g)].map((match) => match[1])
  ```

  new:

  ```ts
    // v-track plan 2 A7: the reason box adds the field error look through cn, so its class string opens a cn( call.
    const boxes = [...source.matchAll(/<label className="([^"]+)">|<label\n\s+className=\{cn\(\n\s+"([^"]+)",/g)].map((match) => match[1] ?? match[2])
  ```
- `tests/asset-label-print-ui.test.ts:218`, old:

  ```ts
    assert.match(source, /<Button size="lg" onClick=\{handlePrint\} busy=\{recordingPrint\} className="w-full sm:w-auto">\n\s+<Printer aria-hidden="true" \/>\n\s+\{translations\.print\}\n\s+<\/Button>/)
  ```

  new:

  ```ts
    assert.match(source, /<Button type="submit" size="lg" busy=\{recordingPrint\} className="w-full sm:w-auto">\n\s+<Printer aria-hidden="true" \/>\n\s+\{translations\.print\}\n\s+<\/Button>/)
  ```
- `tests/button-size-switch.test.ts:22`, old:

  ```ts
    assert.match(read(`${C}assets/asset-label-print.tsx`), /<Button size="lg" onClick=\{handlePrint\} busy=\{recordingPrint\} className="w-full sm:w-auto">/)
  ```

  new:

  ```ts
    assert.match(read(`${C}assets/asset-label-print.tsx`), /<Button type="submit" size="lg" busy=\{recordingPrint\} className="w-full sm:w-auto">/)
  ```
- `V_FORMS`: insert `` `${C}assets/asset-label-print.tsx`, `` directly above `` `${C}reports/report-preset-controls.tsx`, ``.
- [ ] **Step 5: Verify.** `node --test tests/v-track2-a.test.ts tests/asset-label-print-ui.test.ts tests/button-size-switch.test.ts tests/assets-sweep-ui.test.ts tests/dark-mode-p.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/visual-foundation-guards.test.ts tests/class-merge.test.ts tests/validation-guards.test.ts`; `npm test` (+1; 2263 tests, 2262 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint`. eol: `src/components/assets/asset-label-print.tsx` `427 427`, `src/components/assets/asset-label-batch-tool.tsx` `754 754`, `tests/asset-label-print-ui.test.ts` `223 223`, `tests/button-size-switch.test.ts` `0 30`, `tests/v-track2-a.test.ts` `0 311`.
- [ ] **Step 6: Commit.** `git add src/components/assets/asset-label-print.tsx src/components/assets/asset-label-batch-tool.tsx tests/asset-label-print-ui.test.ts tests/button-size-switch.test.ts tests/v-track2-a.test.ts tests/validation-guards.test.ts`, then `git commit -m "feat(assets): the label print reason shows its error under the toolbar, and the print queue's created dates hold their order (v-track plan 2 task 7, A7)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Rehearsal record (area A)

| Task | Commit (`a-dry`) | Step 2 failed with | Pins failed before Step 4 | `npm test` after | Messages |
|---|---|---|---|---|---|
| A1 | `b47bbce4` | noValidate directly after onSubmit | 9 (as listed) | 2257 / 2256 / 0 / 1 | 4091 |
| A2 | `1083ddb9` | noValidate directly after onSubmit | 3 | 2258 / 2257 / 0 / 1 | 4091 |
| A3 | `5d823f7e` | noValidate directly after onSubmit | 1 | 2259 / 2258 / 0 / 1 | 4091 |
| A4 | `c0d16c1c` | noValidate directly after onSubmit | 1 | 2260 / 2259 / 0 / 1 | 4091 |
| A5 | `0c8bbafc` | noValidate directly after onSubmit | 3 | 2261 / 2260 / 0 / 1 | 4091 |
| A6 | `94744074` | a module-level function validate( | 1 | 2262 / 2261 / 0 / 1 | 4091 |
| A7 | `e511ab3c` | noValidate directly after onSubmit | 2 | 2263 / 2262 / 0 / 1 | 4091 |

Every task: `npx tsc --noEmit` clean; `npm run lint` 0 errors, 146 warnings, all under `.agents/`. End state of area A: `V_FORMS` 22 files (plan 1's 15 + the 7 asset files, every file of the assets rows of `V_SCOPE`), `<form … noValidate>` 24 in `src`, FMG `STAR_ONLY` 1 entry (the checkin's), `SELECT_STAR_ONLY` unchanged (14 in 10 files), 0 `toast.error`/`toast.warning` outside a catch in `src/components/assets/`.

### Open issues (area A)

Area A's open issues 1–4 are open issues 1, 2, 3 and 4 at the end of the plan (merged, P-R9); its behaviour changes are in the plan's list there.

---

## Area O: the asset operation forms show their errors under the field, and a refusal from a review goes back to its field (Tasks 8–13, O1–O6)

Spec `docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md` (approved 2026-10-17) §2 U1, U2, U4–U6; §3 G1–G3, G5 and the anti-goals ("a wrong field … behind an open review dialog"); §4.1, §4.2 (review dialogs), §4.3 (pairs and groups), §4.4 (content rules and prerequisites), §4.5; §5 #9–#13 and its bugs ("the checkin return date is marked required and never checked; bulk move's destination is never checked"); §7.1–§7.3 (as plan 1 built them); §11 calls 1, 2, 7. Area O uses plan 1's shared contract as it shipped at `e1caa29` (FIXED INTERFACES 2–7, F-R1–F-R10, M-R1–M-R14) and adds one shared function, `waitForDialogToClose` (FIXED addition O-F1, Task O1).

What this area does, in one line each:
- **O1** `waitForDialogToClose()` in `src/lib/field-focus.ts`: a review dialog closes before the form's field takes focus (O-R1).
- **O2** checkout: 4 validation toasts go; the asset and destination selects get their errors (2 of `SELECT_STAR_ONLY`); the handover mode becomes a `FieldGroup`; the handover rules use the server's codes and read the checkout form's own sentences (O-R2, O-R3); a refusal from the review closes it and focuses the field.
- **O3** checkin: 4 toasts go; the return date gets its check and its native `required` (the bug of spec §5; FMG `STAR_ONLY` loses its checkin entry); the three required selects get their errors (3 of `SELECT_STAR_ONLY`); the review hands back (O-R8).
- **O4** transfer: the toast goes; "at least one destination" is an error under the location select with the server's code (O-R4); the review hands back.
- **O5** bulk move: the toast goes; the destination is checked (the bug of spec §5); the asset list is one group with one error under it (O-R5).
- **O6** the transaction cancel dialog: the 5-character reason is an error under the field instead of the dialog's Notice; a blocked cancellation keeps its gate as `aria-disabled` tied to the blockers it lists (O-R6, O-R7).

Nothing else changes: no server change, no migration, no new dependency, no `EXEMPT` row, no `CONSTRAINT_FLOORS` drop (O3 raises checkin's `required` floor 4 → 5), no new message. Messages: −1 (O2), −3 (O3), −1 (O4); 4091 → 4086 leaf keys per locale on this plan's chain, after area A (4092 → 4087 when area O ran alone on `e1caa29`).

**Line numbers** are of `e1caa29`. Plan 1 changed none of the five form files, so their lines are the recon's of `9e17cab`; `src/lib/field-focus.ts` is plan 1's (Task 13). Find every site by its quoted text; the exact old strings below are what the rehearsal replaced. **Task ids:** O1–O6 stay in the test names and the commit messages ("(v-track plan 2 task 10, O3)"); the plan's task numbers stand beside them (P-R1).

**Order and shared files.** O1 must run before O2–O4 (they import `waitForDialogToClose`); O2–O6 append to `tests/v-track2-o.test.ts` in order (O2 adds the helpers the later blocks use). Other areas of plan 2 run before or after area O and edit the same shared files; every edit of area O to a shared file is a text anchor that holds whatever they appended or removed (O-R9):
- `tests/validation-guards.test.ts` `V_FORMS`: each task inserts its row directly **after** the line `const V_FORMS: readonly string[] = [` (never before `]`, which moves); order inside the list does not matter (V1 only rejects a duplicate).
- `tests/validation-guards.test.ts` `SELECT_STAR_ONLY`: each task deletes its own row **inside** `const SELECT_STAR_ONLY … = {` … `}`. The transfer and bulk-move rows read exactly like their `V_SCOPE` rows (`]: 1,`): delete the occurrence after `const SELECT_STAR_ONLY`, never the `V_SCOPE` one.
- `tests/form-migration-guards.test.ts` `STAR_ONLY`: O3 removes only its own entry; in this plan's order it is the only entry left after Task 1 (A1), so O3's Step 4 writes `new Set<string>([])` (P-R3).
- `messages/*.json`: deletions by key, through `scripts/messages-edit.mjs`.
- `src/lib/field-focus.ts`: O1 appends at the end of the file, after whatever is last there.
- `tests/choice-controls-ui.test.ts`: O2 and O5 each replace one exact line of their own form's test.

### Inventory (O at `e1caa29`)

| # | Form · file | Submit · `<form>` | Today (validation · server errors) | Decision | Task |
|---|---|---|---|---|---|
| 9 | Checkout `c/asset-operations/checkout-form.tsx` (CRLF) | `handleSubmit :130` → `OperationReviewDialog :333` → `submitCheckout :151` · `<form>` `:190` | native `required`; **4 toasts** `:133` (`reviewIncomplete`), `:137`, `:141`, `:145`; **2 star-only selects** asset `:196`, destination `:228`; handover radios in a hand-made `<fieldset>` `:240-267`; `min={values.checkoutDate}` `:292` already there · `getCheckoutErrorMessage :354` → `apiError.toast :182`, the review stays open | errors under the field; the handover codes of the server (O-R2); one destination control for four server keys (O-R3); `FieldGroup`; the review hands back (O-R1) | O2 |
| 10 | Checkin `c/asset-operations/checkin-form.tsx` (CRLF) | `handleSubmit :236` → review `:562` → `submitCheckin :253` · `<form … noValidate>` `:303` | **4 toasts** `:239`, `:243`, `:247`, repeat guard `:257`; **3 star-only selects** `:309`, `:443`, `:453`; **return date star without `required` and never checked** `:398-399` (FMG `STAR_ONLY`) · inline code map `:281-286` → `apiError.toast :293` | errors under the field; the return date checked and `required` (O-R8); the review hands back | O3 |
| 11 | Transfer `c/asset-operations/transfer-form.tsx` (CRLF) | `handleSubmit :89` → review `:155` → `submitTransfer :98` · `<form>` `:128` | reason native `required`, `maxLength` `:140`; **toast** `:92` (`destinationRequired`, also shown when only the asset is missing); **star-only** asset select `:134` · `apiError.toast :118` | errors under the field; "at least one destination" under the location select with the server's code (O-R4); the review hands back | O4 |
| 12 | Bulk move `c/asset-operations/bulk-move-form.tsx` (CRLF) | `handleSubmit :59` · `<form>` `:89` | **toast** `:62` (asset list); **destination star-only and never checked** `:126`; reason native `required`, `maxLength` `:128` · `apiError.toast :79` | errors under the field and under the asset list (O-R5) | O5 |
| 13 | Transaction cancel dialog `c/asset-operations/transaction-cancel-dialog.tsx` (CRLF), no `<form>` | `submitCancellation :98` (confirm button `:165`) | reason < 5: `setError(labels.reasonTooShort)` + focus `:99-102`, shown in the dialog's danger Notice `:141`; confirm `disabled={loading \|\| blockers.length > 0}` `:165`, blockers listed in a warning Notice `:151` · server error → the same Notice | the reason under its field; blocked → `aria-disabled` tied to the blockers (O-R6, O-R7) | O6 |

Not in area O: `operation-document-print.tsx`, `signature-pad.tsx` (optional everywhere, spec §7.3), `void-document-banner.tsx`; the legacy return backfill button in the checkin form (an action, not a form); the server routes (no server change, open issue 5).

Rulings: R3 of "Rulings of this plan" (O-R*).

FIXED addition O-F1 is FIXED 8 of the Global Constraints (`waitForDialogToClose`).

### Review notes (area O)

1. **Focus after a refusal from the review (O1, O2–O4).** The order that matters (dialog gone → its focus return → the field) is unit-tested with a scripted frame queue in O1; the forms' wiring (`reveal: leaveReview`, `setReviewOpen(false)` inside `leaveReview`) is pinned in each form's test. Not rehearsed: the hook running in React with Radix (no DOM test library; no dev server in a rehearsal). The controller's dev-app check covers it (below).
2. **A refusal that names no field** keeps the review open with today's toast (checkout's `HANDOVER_*` fallback, checkin's `ASSET_HANDOVER_*` 409s, every 404/409). Each test pins the fall-through line.
3. **The server stays as it is.** Checkin's condition and status refusals carry no `fieldErrors` (open issue 5); they keep the toast.

**For the controller's dev-app check** (both themes, 1440 and 375; never a database write):
- Each form: an empty submit shows the errors under the fields, no toast and no browser bubble; focus on the first wrong field (checkout: the asset select; checkin: the asset select, or the return date after clearing it; transfer: the asset, then the location after choosing an asset; bulk move: the first checkbox, then the destination; cancel dialog: the reason).
- Checkout: temporary loan without a due date, and a due date before the checkout date (the `min` lets a typed date through): `checkout.temporaryDueDateRequired` / `checkout.returnBeforeCheckout` under the date.
- A refusal from the review, **without the server**: in the console, wrap `window.fetch` so the operation's `POST` answers `new Response(JSON.stringify({ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { conditionBefore: "required" } }), { status: 400 })` (checkin: `nextLocationId`; transfer: `reason`), fill the form, open the review, confirm: the review closes, focus lands on that field after the dialog has gone (not on the save button), the error is under it. Then cancel a review without a refusal: focus returns to the save button. Repeat with reduced motion.
- Never submit a real checkout or checkin with a photo or a signature: both routes save the evidence files **before** they parse the input (`parseCheckoutRequest`, `parseCheckinRequest`), so even a refused request writes files.
- Cancel dialog: a blocked transaction (any with blockers in its preview) shows the confirm looking disabled, focusable, its description the blockers Notice; a 4-character reason shows `labels.reasonTooShort` under the field.

### File structure (area O)

| File | Line endings (real checkout) | What changes | Task |
|---|---|---|---|
| `src/lib/field-focus.ts` | `w/crlf` | `waitForDialogToClose` appended | O1 |
| `tests/v-track2-o.test.ts` (new) | LF | one test per task | O1–O6 |
| `src/components/asset-operations/checkout-form.tsx` | `w/crlf` | errors, `FieldGroup`, handover codes, review hand-back | O2 |
| `src/components/asset-operations/checkin-form.tsx` | `w/crlf` | errors, return date, review hand-back | O3 |
| `src/components/asset-operations/transfer-form.tsx` | `w/crlf` | errors, destination rule, review hand-back | O4 |
| `src/components/asset-operations/bulk-move-form.tsx` | `w/crlf` | errors, the asset group, the destination | O5 |
| `src/components/asset-operations/transaction-cancel-dialog.tsx` | `w/crlf` | the reason's error, the blocked gate | O6 |
| `messages/th.json`, `messages/en.json` | `w/crlf` | −1, −3, −1 keys | O2, O3, O4 |
| `tests/validation-guards.test.ts` | `w/crlf` | `V_FORMS` +5 rows, `SELECT_STAR_ONLY` −4 rows (−7 selects) | O2–O6 |
| `tests/form-migration-guards.test.ts` | `w/crlf` | `STAR_ONLY` −1 entry, checkin floor 4 → 5 | O3 |
| `tests/asset-handover-checkout.test.ts` | **`w/lf`** | the expected-return Field pin | O2 |
| `tests/choice-controls-ui.test.ts` | `w/crlf` | the handover group pin · the asset list pin | O2 · O5 |
| `tests/asset-handover-checkin.test.ts` | **`w/lf`** | the return date Field pin | O3 |
| `tests/asset-operation-confirmation-ui.test.ts` | `w/crlf` | the transfer reason Field pin | O4 |
| `tests/asset-transaction-cancellation-ui.test.ts` | `w/crlf` | the reason rule, the Field and the confirm pins | O6 |
| `tests/operations-sweep-ui.test.ts` | **`w/lf`** | the confirm pin | O6 |

No change (checked): `src/components/ui/operation-review-dialog.tsx` and `accessible-dialog.tsx` (O-R1; `tests/asset-operation-confirmation-ui.test.ts:25-33,42-50` and `tests/accessible-dialog.test.ts` hold), `use-field-errors.ts`, `field-group.tsx`, `searchable-select.tsx`, every route, `tests/form-frames-ui.test.ts`, `tests/file-evidence-ui.test.ts`, `tests/dropdown-menus-ui.test.ts`, `tests/assets-sweep-ui.test.ts`, `tests/legacy-checkin-flow.test.ts`, `tests/checkin-send-to-repair-ui.test.ts` (all run green after each task).

### Interfaces (area O)

| From | What area O uses | Where |
|---|---|---|
| plan 1 F4 | `useFieldErrors<K>()` → `errors`, `setErrors`, `applyServer`, `clear`, `message`, `focusFirst(order, { idFor, reveal })` (`reveal` awaited before `waitForElement`) | every task |
| plan 1 F1 | `required`, `minLength`, `maxLength`, `notBefore`, `atLeastOne` (null for an empty value except `required` / `atLeastOne`) | O2–O6 |
| plan 1 F3 | `waitForElement`, `focusField` (through the hook); the module O1 extends | O1 |
| plan 1 F5, F7 | `FieldError` without a role; `FieldGroup({ legend, required, error, id })` | O5; O2 |
| plan 1 F8 | `V_FORMS`, `SELECT_STAR_ONLY`, V2's formless path | every task |
| plan 1 S2, S6 | 400 `{ error, code: "VALIDATION_FAILED", fieldErrors }`; checkout's `HANDOVER_*` 400 with `code` and `fieldErrors`; checkout's condition refusal `fieldErrors: { conditionBefore: "invalidCheckoutCondition" }` (S10) | O2–O6 |
| O1 | `waitForDialogToClose(frames = 60)` | O2–O4; any later form refused behind its own dialog |
| O2 | `assertOperationForm`, `validateBody`, `messagesOf`, `C`, `escape` in `tests/v-track2-o.test.ts` | O3–O6 |

---

### Task 8 (O1): A review dialog closes before the form's field takes focus (`src/lib/field-focus.ts`)

Spec §4.2 ("a server field error closes the review and returns to the form, then focuses the field"); O-R1, O-F1.

**Files:** Modify `src/lib/field-focus.ts` (`w/crlf`; append only) · Test `tests/v-track2-o.test.ts` (new, LF).

**Changes at e1caa29:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| end of file (after `waitForElement`, `:95-110`, or after whatever another area appended) | — | a blank line and `waitForDialogToClose` exactly as Step 3 shows | O-R1, O-F1 |

- [ ] **Step 1: The failing test.** Create `tests/v-track2-o.test.ts` (LF) with exactly (write it with a file tool):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { waitForDialogToClose } from "../src/lib/field-focus.ts"

// V track plan 2, area O: the asset operation forms show their errors under the field (spec
// docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §4, §5 #9–#13, §7). One test per task, appended in
// order. The working tree is CRLF on Windows: every read strips \r before the multi-line regexes.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("a review dialog closes before the form's field takes focus: waitForDialogToClose waits for the dialog that holds focus to leave and hand focus back (v-track O1)", async () => {
  const globals = globalThis as unknown as Record<string, unknown>
  const had = { document: Object.hasOwn(globals, "document"), frame: Object.hasOwn(globals, "requestAnimationFrame") }
  const saved = { document: globals.document, frame: globals.requestAnimationFrame }
  // Frames run when the test says so.
  const frames: Array<() => void> = []
  const nextFrame = () => frames.shift()?.()
  const tick = () => new Promise((resolve) => setTimeout(resolve, 5))
  globals.requestAnimationFrame = (callback: () => void) => frames.push(callback)
  try {
    // Focus in no dialog (a client-side error: the review never opened): resolves at once.
    globals.document = { activeElement: { closest: () => null } }
    await waitForDialogToClose()
    assert.equal(frames.length, 0, "no frame was asked for")

    // Focus in the review dialog: it resolves only after the dialog has left the page, and after the task in which the
    // dialog hands focus back to its opener (Radix runs it after the unmount), so the field takes focus last.
    const dialog = { isConnected: true }
    globals.document = { activeElement: { closest: (selector: string) => (selector === '[role="dialog"]' ? dialog : null) } }
    const order: string[] = []
    const closing = waitForDialogToClose().then(() => order.push("field"))
    nextFrame()
    nextFrame()
    await tick()
    assert.equal(order.length, 0, "still open")
    dialog.isConnected = false
    setTimeout(() => order.push("dialog hands focus back"), 0)
    nextFrame()
    await closing
    assert.deepEqual(order, ["dialog hands focus back", "field"])

    // A dialog that never leaves: it gives up after the frames it was given, like waitForElement.
    const stuck = { isConnected: true }
    globals.document = { activeElement: { closest: () => stuck } }
    let gaveUp = false
    const waiting = waitForDialogToClose(2).then(() => {
      gaveUp = true
    })
    nextFrame()
    nextFrame()
    nextFrame()
    await waiting
    assert.equal(gaveUp, true)
  } finally {
    if (had.document) globals.document = saved.document
    else delete globals.document
    if (had.frame) globals.requestAnimationFrame = saved.frame
    else delete globals.requestAnimationFrame
  }
  const focus = read("src/lib/field-focus.ts")
  assert.match(focus, /export function waitForDialogToClose\(frames = 60\): Promise<void>/)
  assert.match(focus, /const dialog = document\.activeElement\?\.closest\('\[role="dialog"\]'\)/)
  assert.doesNotMatch(focus, /from "@\/|"use client"|from "react"/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-o.test.ts`. Expected to fail: `SyntaxError: The requested module '../src/lib/field-focus.ts' does not provide an export named 'waitForDialogToClose'`.
- [ ] **Step 3: Implement.** Append at the end of `src/lib/field-focus.ts`, after one blank line, keeping the file's CRLF (the Edit tool keeps it):

```ts

// A review dialog closes before the form's field takes focus (spec §4.2): when a refusal comes back, focus is still in
// the dialog, and the dialog hands focus back to its opener in a task after it leaves the page. This resolves once the
// dialog that holds focus now has gone and that task has run, so the field takes focus last; at once when focus is in no
// dialog. It gives up after `frames` frames, like waitForElement.
export function waitForDialogToClose(frames = 60): Promise<void> {
  const dialog = document.activeElement?.closest('[role="dialog"]')
  return new Promise((resolve) => {
    if (!dialog) {
      resolve()
      return
    }
    let left = frames
    const look = () => {
      if (!dialog.isConnected || left <= 0) {
        setTimeout(resolve, 0)
        return
      }
      left -= 1
      requestAnimationFrame(look)
    }
    look()
  })
}
```

- [ ] **Step 4: Pin and guard edits:** none.
- [ ] **Step 5: Verify.** `node --test tests/v-track2-o.test.ts tests/v-track-f.test.ts` (8 tests pass); `npm test` (+1; 2264 tests, 2263 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint` (0 errors, no new warning in `src/` or `tests/`). `node <tools>/eol.mjs src/lib/field-focus.ts tests/v-track2-o.test.ts` prints `134 134` (when nothing else was appended) and `0 64`.
- [ ] **Step 6: Commit.** `git add src/lib/field-focus.ts tests/v-track2-o.test.ts`, then `git commit -m "feat(forms): a review dialog closes before the form's field takes focus (v-track plan 2 task 8, O1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 9 (O2): Checkout shows its errors under the field, and a refusal from the review goes back to its field (`c/asset-operations/checkout-form.tsx`)

Spec §4.1, §4.2, §4.3, §4.5, §5 #9 (4 toasts, 2 star-only selects), §6.1 (the `HANDOVER_*` branch's `fieldErrors`), §7.1; M-R1–M-R5, F-R8, O-R1–O-R3.

**Files:** Modify `src/components/asset-operations/checkout-form.tsx` (`w/crlf`); `messages/th.json`, `messages/en.json` (`w/crlf`, through `scripts/messages-edit.mjs`) · Pins `tests/asset-handover-checkout.test.ts` (**`w/lf`**), `tests/choice-controls-ui.test.ts` (`w/crlf`) · Guard `tests/validation-guards.test.ts` (`w/crlf`) · Test `tests/v-track2-o.test.ts` (LF).

**Changes at e1caa29:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| imports `:12`, `:24-26` | `Field, FieldRequiredMark`; `cn` | `Field` and `FieldGroup`; `cn` goes (its one use was the legend); + `waitForDialogToClose`, `notBefore`, `required`, `useFieldErrors` | M-R3 |
| after `CheckoutFormValues` `:43` | — | `FIELD_IDS` (10 keys, 7 ids, O-R3), `CheckoutField`, `FIELD_ORDER`, `DESTINATION_KEYS`, `HANDOVER_MESSAGE_KEYS` (O-R2), `validate()` | M-R1, M-R2, O-R2, O-R3 |
| after `reviewOpen` `:68` | — | `const fieldErrors = useFieldErrors<CheckoutField>()` | M-R3 |
| `setField`, `handleSubmit` `:126-149` | 4 toast guards | `leaveReview`, `focusFirstError` (with `reveal`), `errorText`; `setField` clears its key, the two dates together; `handleSubmit` = `setErrors(validate(values))` / `if (focusFirstError()) return` / `setReviewOpen(true)` | O-R1, M-R4, M-R5 |
| `:176` | `if (!response.ok) throw new Error(getCheckoutErrorMessage(…))` | the refusal block of M-R4 | O-R1 |
| `<form>` `:190` | no `noValidate` | `noValidate` after `onSubmit` | FIXED 6 |
| asset `:196`, destination `:228` | star-only `SearchableSelect`s | `id` first, `error` before `onChange` | V4, O-R3 |
| type `:206`, condition `:276` | local `Select` | `id`, `error`; the type change also clears what it resets | M-R5, O-R3 |
| handover `:240-267` | hand-made `<fieldset>` / `<legend>` / `FieldRequiredMark` | `FieldGroup`; a mode change clears the mode and the due date | F-R8, M-R5 |
| dates `:284`, `:288` | `Field … required` | `id`, `error` | M-R5 |
| `destinationValue` `:379`; `Select` `:401-421` | — ; no `id`/`error` | `destinationKey()` before it; `Select` takes `id?` and `error?` and gives them to `Field` | O-R3 |
| messages | `checkout.reviewIncomplete` | deleted | O-R2 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-o.test.ts` exactly (with a file tool; the first line of the block is the blank line before it):

```ts

const C = "src/components/"
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// The body of the module-level `function validate(`, up to the first line that is only "}".
function validateBody(source: string) {
  const start = source.search(/^function validate\(/m)
  assert.notEqual(start, -1, "a module-level function validate(")
  const end = source.indexOf("\n}\n", start)
  return source.slice(start, end)
}

// The shape every operation form shares (plan 1's M-R1 to M-R4, O-R1): the FIELD_IDS table in visual order (several
// server keys may share the one control that shows them, O-R3), each id once in the markup, validate() through the hook,
// the server's refusal on the same fields, focus on the first wrong field, and no toast for a validation error. A
// dialog without a <form> (O-R6) passes noValidate: false.
function assertOperationForm(source: string, form: { ids: Record<string, string>; noValidate?: false }) {
  if (form.noValidate !== false) assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate[ >\n]/, "noValidate directly after onSubmit")
  assert.match(source, /import \{ useFieldErrors(?:, useValidationMessage)? \} from "@\/components\/ui\/use-field-errors"/)
  const block = source.match(/const FIELD_IDS = \{\n([\s\S]*?)\n\} as const/)
  assert.ok(block, "const FIELD_IDS = { … } as const")
  assert.deepEqual(block[1].split("\n"), Object.entries(form.ids).map(([key, id]) => `  ${key}: "${id}",`), "FIELD_IDS: the fields in visual order with their ids")
  for (const id of new Set(Object.values(form.ids))) {
    assert.equal(source.match(new RegExp(`\\bid="${escape(id)}"`, "g"))?.length, 1, `id "${id}" once`)
  }
  assert.match(source, /fieldErrors\.setErrors\(validate\(/, "the client's errors come from validate()")
  assert.match(source, /if \(fieldErrors\.applyServer\(payload\) && focusFirstError\(\)\) return/, "the server's fieldErrors land on the same fields")
  assert.match(source, /fieldErrors\.focusFirst\(FIELD_ORDER, /, "focus goes to the first wrong field")
  assert.doesNotMatch(source, /\btoast\.(?:error|warning)\(/, "no validation toast (the catch keeps apiError.toast)")
}

const messagesOf = (locale: string) => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as Record<string, Record<string, unknown>>

test("checkout: errors under the field, the handover rules with the server's codes, and a refusal from the review back on its field (v-track O2)", () => {
  const source = read(`${C}asset-operations/checkout-form.tsx`)
  assertOperationForm(source, {
    ids: {
      assetId: "checkout-asset",
      checkoutType: "checkout-type",
      custodianId: "checkout-destination",
      departmentId: "checkout-destination",
      locationId: "checkout-destination",
      parentAssetId: "checkout-destination",
      handoverMode: "checkout-handover-mode",
      conditionBefore: "checkout-condition",
      checkoutDate: "checkout-date",
      expectedReturnDate: "checkout-expected-return",
    },
  })
  const rules = validateBody(source)
  for (const rule of [
    'check("assetId", required(values.assetId))',
    'check("checkoutType", required(values.checkoutType))',
    "check(destinationKey(values.checkoutType), required(destinationValue(values)))",
    'if (values.checkoutType === "user") check("handoverMode", required(values.handoverMode) && "handoverModeRequired")',
    'check("conditionBefore", required(values.conditionBefore))',
    'check("checkoutDate", required(values.checkoutDate))',
    '(required(values.expectedReturnDate) && "handoverTemporaryDueDateRequired") ??',
    '(notBefore(values.expectedReturnDate, values.checkoutDate) && "handoverReturnBeforeCheckout"),',
  ]) assert.ok(rules.includes(rule), rule)
  // Every message under its control; the one destination select shows the key of the checkout type (O-R3).
  for (const key of ["assetId", "checkoutType", "handoverMode", "conditionBefore", "checkoutDate", "expectedReturnDate"]) {
    assert.ok(source.includes(`error={errorText("${key}")}`), key)
  }
  assert.ok(source.includes("error={errorText(destinationKey(values.checkoutType))}"))
  // The handover codes, from the form or the server, read the checkout form's own sentences (spec §7.1, O-R2).
  assert.ok(source.includes("return code && Object.hasOwn(HANDOVER_MESSAGE_KEYS, code) ? t(HANDOVER_MESSAGE_KEYS[code]) : fieldErrors.message(key)"))
  for (const [code, key] of [
    ["handoverModeRequired", "handoverModeRequired"],
    ["handoverPermanentUserOnly", "permanentUserOnly"],
    ["handoverPermanentCustodianRequired", "permanentCustodianRequired"],
    ["handoverPermanentNoDueDate", "permanentDueDateNotAllowed"],
    ["handoverTemporaryDueDateRequired", "temporaryDueDateRequired"],
    ["handoverReturnBeforeCheckout", "returnBeforeCheckout"],
  ]) {
    assert.ok(source.includes(`  ${code}: "${key}",\n`), code)
    for (const locale of ["th", "en"]) assert.equal(typeof messagesOf(locale).checkout[key], "string", `${locale}.checkout.${key}`)
  }
  // The two required selects have an id for focus and show their error (V4); the handover mode is one group (F-R8).
  assert.match(source, /<SearchableSelect\n\s+id="checkout-asset"\n/)
  assert.match(source, /<SearchableSelect\n\s+id="checkout-destination"\n/)
  assert.match(source, /<FieldGroup legend=\{t\("handoverMode"\)\} id="checkout-handover-mode" required error=\{errorText\("handoverMode"\)\}>/)
  // A refusal from the review: the review closes, and the field takes focus once the dialog has gone (O-R1).
  assert.match(source, /const closed = waitForDialogToClose\(\)\n\s+setReviewOpen\(false\)\n\s+await closed\n/)
  assert.ok(source.includes("fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key], reveal: leaveReview })"))
  // Clearing (spec §4.3): the dates are one rule; a new checkout type or handover mode clears what it resets.
  assert.ok(source.includes('if (field === "checkoutDate" || field === "expectedReturnDate") fieldErrors.clear("checkoutDate", "expectedReturnDate")'))
  assert.ok(source.includes('fieldErrors.clear("checkoutType", ...DESTINATION_KEYS, "handoverMode", "expectedReturnDate")'))
  assert.ok(source.includes('fieldErrors.clear("handoverMode", "expectedReturnDate")'))
  // A refusal that names no field of the form keeps today's message through the catch.
  assert.match(source, /throw new Error\(getCheckoutErrorMessage\(payload\?\.code \?\? payload\?\.error\)\)/)
  assert.doesNotMatch(source, /reviewIncomplete/)
  for (const locale of ["th", "en"]) {
    assert.equal(messagesOf(locale).checkout.reviewIncomplete, undefined, `${locale}.checkout.reviewIncomplete has no reader and is removed`)
  }
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-o.test.ts`. Expected to fail: "checkout: errors under the field, the handover rules with the server's codes, and a refusal from the review back on its field (v-track O2)" ("noValidate directly after onSubmit"). After Step 3 and before Step 4, `node --test tests/asset-handover-checkout.test.ts tests/choice-controls-ui.test.ts tests/validation-guards.test.ts` fails three tests: "the checkout form uses the shared fields and a busy save button (2C batch 1b)", "checkout picks the handover mode with required ChoiceCard radios, and no file in src uses accent-primary (R1)" and "V5 the required selects that nothing checks only count down (spec §5)". That is expected; Step 4 is their edit.
- [ ] **Step 3: Implement.** The exact edits, in `src/components/asset-operations/checkout-form.tsx` (each old string occurs once; keep the file's CRLF):

**`src/components/asset-operations/checkout-form.tsx`, edit 1 of 16.** Old:
```tsx
import { Field, FieldRequiredMark } from "@/components/ui/field"
```
New:
```tsx
import { Field } from "@/components/ui/field"
import { FieldGroup } from "@/components/ui/field-group"
```

**`src/components/asset-operations/checkout-form.tsx`, edit 2 of 16.** Old:
```tsx
import type { AssetHandoverMode } from "@/lib/asset-handover-mode"
import { cn } from "@/lib/utils"
import { useApiError } from "@/components/ui/use-api-error"
```
New:
```tsx
import type { AssetHandoverMode } from "@/lib/asset-handover-mode"
import { waitForDialogToClose } from "@/lib/field-focus"
import { notBefore, required } from "@/lib/validation-rules"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
```

**`src/components/asset-operations/checkout-form.tsx`, edit 3 of 16.** Old:
```tsx
  conditionBefore: string
  remark: string
}

export function CheckoutForm({
```
New:
```tsx
  conditionBefore: string
  remark: string
}

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1). The one
// destination select shows the key of the checkout type: custodianId, departmentId, locationId or parentAssetId (O-R3).
const FIELD_IDS = {
  assetId: "checkout-asset",
  checkoutType: "checkout-type",
  custodianId: "checkout-destination",
  departmentId: "checkout-destination",
  locationId: "checkout-destination",
  parentAssetId: "checkout-destination",
  handoverMode: "checkout-handover-mode",
  conditionBefore: "checkout-condition",
  checkoutDate: "checkout-date",
  expectedReturnDate: "checkout-expected-return",
} as const
type CheckoutField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as CheckoutField[]
const DESTINATION_KEYS = ["custodianId", "departmentId", "locationId", "parentAssetId"] as const
// The handover codes (the server's catalog keys, which validate() sends too) read the checkout form's own sentences, in
// the words of its fields (spec §7.1); every other code reads the shared message (O-R2).
const HANDOVER_MESSAGE_KEYS: Readonly<Record<string, string>> = {
  handoverModeRequired: "handoverModeRequired",
  handoverPermanentUserOnly: "permanentUserOnly",
  handoverPermanentCustodianRequired: "permanentCustodianRequired",
  handoverPermanentNoDueDate: "permanentDueDateNotAllowed",
  handoverTemporaryDueDateRequired: "temporaryDueDateRequired",
  handoverReturnBeforeCheckout: "returnBeforeCheckout",
}

// noValidate turns the browser's check off, so this restates the controls' required, and the handover rules with the
// server's own codes (HANDOVER_*), so a refusal from either side reads the same under the field (v-track M-R2, O-R2).
function validate(values: CheckoutFormValues): Partial<Record<CheckoutField, string>> {
  const errors: Partial<Record<CheckoutField, string>> = {}
  const check = (key: CheckoutField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("assetId", required(values.assetId))
  check("checkoutType", required(values.checkoutType))
  check(destinationKey(values.checkoutType), required(destinationValue(values)))
  if (values.checkoutType === "user") check("handoverMode", required(values.handoverMode) && "handoverModeRequired")
  check("conditionBefore", required(values.conditionBefore))
  check("checkoutDate", required(values.checkoutDate))
  if (values.handoverMode === "temporary_loan") {
    check(
      "expectedReturnDate",
      (required(values.expectedReturnDate) && "handoverTemporaryDueDateRequired") ??
        (notBefore(values.expectedReturnDate, values.checkoutDate) && "handoverReturnBeforeCheckout"),
    )
  }
  return errors
}

export function CheckoutForm({
```

**`src/components/asset-operations/checkout-form.tsx`, edit 4 of 16.** Old:
```tsx
  const [reviewOpen, setReviewOpen] = useState(false)
  const [photoBefore, setPhotoBefore]
```
New:
```tsx
  const [reviewOpen, setReviewOpen] = useState(false)
  const fieldErrors = useFieldErrors<CheckoutField>()
  const [photoBefore, setPhotoBefore]
```

**`src/components/asset-operations/checkout-form.tsx`, edit 5 of 16.** Old:
```tsx
  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedAsset || !selectedDestination || !selectedCondition) {
      toast.error(t("reviewIncomplete"))
      return
    }
    if (!values.handoverMode) {
      toast.error(t("handoverModeRequired"))
      return
    }
    if (values.handoverMode === "temporary_loan" && !values.expectedReturnDate) {
      toast.error(t("temporaryDueDateRequired"))
      return
    }
    if (values.expectedReturnDate && values.expectedReturnDate < values.checkoutDate) {
      toast.error(t("returnBeforeCheckout"))
      return
    }
    setReviewOpen(true)
  }
```
New:
```tsx
  // A refusal from the review closes it, and the field takes focus once the dialog has gone (spec §4.2, O-R1).
  async function leaveReview() {
    const closed = waitForDialogToClose()
    setReviewOpen(false)
    await closed
  }
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key], reveal: leaveReview })
  const errorText = (key: CheckoutField) => {
    const code = fieldErrors.errors[key]
    return code && Object.hasOwn(HANDOVER_MESSAGE_KEYS, code) ? t(HANDOVER_MESSAGE_KEYS[code]) : fieldErrors.message(key)
  }

  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    // The two dates are one rule, so a change of either clears both (spec §4.3).
    if (field === "checkoutDate" || field === "expectedReturnDate") fieldErrors.clear("checkoutDate", "expectedReturnDate")
    else if (field in FIELD_IDS) fieldErrors.clear(field as CheckoutField)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate(values))
    if (focusFirstError()) return
    setReviewOpen(true)
  }
```

**`src/components/asset-operations/checkout-form.tsx`, edit 6 of 16.** Old:
```tsx
      if (!response.ok) throw new Error(getCheckoutErrorMessage(payload?.code ?? payload?.error))
```
New:
```tsx
      if (!response.ok) {
        // A refusal that names a field of this form closes the review and shows under it; any other keeps the toast.
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error(getCheckoutErrorMessage(payload?.code ?? payload?.error))
      }
```

**`src/components/asset-operations/checkout-form.tsx`, edit 7 of 16.** Old:
```tsx
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
```
New:
```tsx
      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
```

**`src/components/asset-operations/checkout-form.tsx`, edit 8 of 16.** Old:
```tsx
        <SearchableSelect
          label={t("asset")}
          value={values.assetId}
          required
          options={assets}
          placeholder={t("selectAsset")}
          searchPlaceholder={tCommon("searchSelectPlaceholder")}
          emptyLabel={tCommon("searchSelectNoResults")}
          onChange={(value) => setField("assetId", value)}
        />
        <Select
          label={t("checkoutType")}
          value={values.checkoutType}
          required
          onChange={(value) => {
            setValues((current) => ({
              ...current,
              checkoutType: value as CheckoutType,
              handoverMode: value === "user" ? "" : "temporary_loan",
              custodianId: "",
              departmentId: "",
              locationId: "",
              parentAssetId: "",
              expectedReturnDate: "",
            }))
          }}
        >
```
New:
```tsx
        <SearchableSelect
          id="checkout-asset"
          label={t("asset")}
          value={values.assetId}
          required
          options={assets}
          placeholder={t("selectAsset")}
          searchPlaceholder={tCommon("searchSelectPlaceholder")}
          emptyLabel={tCommon("searchSelectNoResults")}
          error={errorText("assetId")}
          onChange={(value) => setField("assetId", value)}
        />
        <Select
          label={t("checkoutType")}
          id="checkout-type"
          value={values.checkoutType}
          required
          error={errorText("checkoutType")}
          onChange={(value) => {
            setValues((current) => ({
              ...current,
              checkoutType: value as CheckoutType,
              handoverMode: value === "user" ? "" : "temporary_loan",
              custodianId: "",
              departmentId: "",
              locationId: "",
              parentAssetId: "",
              expectedReturnDate: "",
            }))
            fieldErrors.clear("checkoutType", ...DESTINATION_KEYS, "handoverMode", "expectedReturnDate")
          }}
        >
```

**`src/components/asset-operations/checkout-form.tsx`, edit 9 of 16.** Old:
```tsx
        <SearchableSelect
          label={t("checkoutTo")}
          value={destinationValue(values)}
          required
          options={destinationOptions}
          placeholder={t("selectDestination")}
          searchPlaceholder={tCommon("searchSelectPlaceholder")}
          emptyLabel={tCommon("searchSelectNoResults")}
          onChange={(value) => setDestinationValue(values.checkoutType, value)}
        />
```
New:
```tsx
        <SearchableSelect
          id="checkout-destination"
          label={t("checkoutTo")}
          value={destinationValue(values)}
          required
          options={destinationOptions}
          placeholder={t("selectDestination")}
          searchPlaceholder={tCommon("searchSelectPlaceholder")}
          emptyLabel={tCommon("searchSelectNoResults")}
          error={errorText(destinationKey(values.checkoutType))}
          onChange={(value) => setDestinationValue(values.checkoutType, value)}
        />
```

**`src/components/asset-operations/checkout-form.tsx`, edit 10 of 16.** Old:
```tsx
            <fieldset className="min-w-0">
              <legend className={cn(fieldLabelClasses, "mb-1.5")}>
                {t("handoverMode")}
                <FieldRequiredMark />
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
```
New:
```tsx
            <FieldGroup legend={t("handoverMode")} id="checkout-handover-mode" required error={errorText("handoverMode")}>
              <div className="grid gap-2 sm:grid-cols-2">
```

**`src/components/asset-operations/checkout-form.tsx`, edit 11 of 16.** Old:
```tsx
                    onChange={() => setValues((current) => ({
                      ...current,
                      handoverMode: mode,
                      expectedReturnDate: mode === "permanent_assignment" ? "" : current.expectedReturnDate,
                    }))}
                  />
                ))}
              </div>
            </fieldset>
```
New:
```tsx
                    onChange={() => {
                      setValues((current) => ({
                        ...current,
                        handoverMode: mode,
                        expectedReturnDate: mode === "permanent_assignment" ? "" : current.expectedReturnDate,
                      }))
                      fieldErrors.clear("handoverMode", "expectedReturnDate")
                    }}
                  />
                ))}
              </div>
            </FieldGroup>
```

**`src/components/asset-operations/checkout-form.tsx`, edit 12 of 16.** Old:
```tsx
        <Select label={t("conditionBefore")} value={values.conditionBefore} required onChange={(value) => setField("conditionBefore", value)}>
```
New:
```tsx
        <Select
          label={t("conditionBefore")}
          id="checkout-condition"
          value={values.conditionBefore}
          required
          error={errorText("conditionBefore")}
          onChange={(value) => setField("conditionBefore", value)}
        >
```

**`src/components/asset-operations/checkout-form.tsx`, edit 13 of 16.** Old:
```tsx
        <Field label={t("checkoutDate")} required>
```
New:
```tsx
        <Field label={t("checkoutDate")} id="checkout-date" required error={errorText("checkoutDate")}>
```

**`src/components/asset-operations/checkout-form.tsx`, edit 14 of 16.** Old:
```tsx
          <Field label={t("expectedReturn")} required>
```
New:
```tsx
          <Field label={t("expectedReturn")} id="checkout-expected-return" required error={errorText("expectedReturnDate")}>
```

**`src/components/asset-operations/checkout-form.tsx`, edit 15 of 16.** Old:
```tsx
function destinationValue(values: {
```
New:
```tsx
function destinationKey(type: CheckoutType): (typeof DESTINATION_KEYS)[number] {
  if (type === "user") return "custodianId"
  if (type === "department") return "departmentId"
  if (type === "location") return "locationId"
  return "parentAssetId"
}

function destinationValue(values: {
```

**`src/components/asset-operations/checkout-form.tsx`, edit 16 of 16.** Old:
```tsx
function Select({
  label,
  value,
  required,
  onChange,
  children,
}: {
  label: string
  value: string
  required?: boolean
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <Field label={label} required={required}>
```
New:
```tsx
function Select({
  label,
  id,
  value,
  required,
  error,
  onChange,
  children,
}: {
  label: string
  id?: string
  value: string
  required?: boolean
  error?: React.ReactNode
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <Field label={label} id={id} required={required} error={error}>
```


Then the messages: save `{"delete":["checkout.reviewIncomplete"]}` as `<temp>/o2-messages.json` and run `node scripts/messages-edit.mjs <temp>/o2-messages.json` (prints `messages updated: 0 th, 0 en, 1 deleted`).

- [ ] **Step 4: Pin and guard edits** (exact old → new; the `SELECT_STAR_ONLY` row is the one inside that list, O-R9):

**`tests/asset-handover-checkout.test.ts`, edit 1 of 1.** Old:
```ts
/<Field label=\{t\("expectedReturn"\)\} required>\n
```
New:
```ts
/<Field label=\{t\("expectedReturn"\)\} id="checkout-expected-return" required error=\{errorText\("expectedReturnDate"\)\}>\n
```

**`tests/choice-controls-ui.test.ts`, edit 1 of 1.** Old:
```ts
  assert.match(source, /<fieldset className="min-w-0">\n\s+<legend className=\{cn\(fieldLabelClasses, "mb-1\.5"\)\}>\n\s+\{t\("handoverMode"\)\}\n\s+<FieldRequiredMark \/>/)
```
New:
```ts
  // The radios are one FieldGroup with the star and one error under it (v-track plan 2 O2).
  assert.match(source, /<FieldGroup legend=\{t\("handoverMode"\)\} id="checkout-handover-mode" required error=\{errorText\("handoverMode"\)\}>\n\s+<div className="grid gap-2 sm:grid-cols-2">/)
```

**`tests/validation-guards.test.ts`, edit 1 of 2.** Old:
```ts
const V_FORMS: readonly string[] = [
```
New:
```ts
const V_FORMS: readonly string[] = [
  `${C}asset-operations/checkout-form.tsx`,
```

**`tests/validation-guards.test.ts`, edit 2 of 2 (the occurrence after `const SELECT_STAR_ONLY: Readonly<Record<string, number>> = {`; the same line earlier in the file stays).** Old:
```ts
  [`${C}asset-operations/checkout-form.tsx`]: 2,
```
New: nothing (delete the old text, its line break included).


- [ ] **Step 5: Verify.** `node --test tests/v-track2-o.test.ts tests/asset-handover-checkout.test.ts tests/choice-controls-ui.test.ts tests/validation-guards.test.ts tests/form-migration-guards.test.ts tests/asset-operation-confirmation-ui.test.ts tests/operations-sweep-ui.test.ts tests/file-evidence-ui.test.ts tests/form-frames-ui.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts tests/messages-edit.test.ts` (0 fail); `npm test` (+1; 2265 tests, 2264 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint`. eol: checkout-form `505 505`, `asset-handover-checkout.test.ts` `0 57`, `choice-controls-ui.test.ts` `151 151` (when O5 has not run), `v-track2-o.test.ts` `0 160`; `messages/*.json` and the guard keep CRLF (their line counts depend on the other areas).
- [ ] **Step 6: Commit.** `git add src/components/asset-operations/checkout-form.tsx messages/th.json messages/en.json tests/asset-handover-checkout.test.ts tests/choice-controls-ui.test.ts tests/validation-guards.test.ts tests/v-track2-o.test.ts`, then `git commit -m "feat(operations): checkout shows its errors under the field, and a refusal from the review goes back to its field (v-track plan 2 task 9, O2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 10 (O3): Checkin checks its return date and shows its errors under the field, and a refusal from the review goes back to its field (`c/asset-operations/checkin-form.tsx`)

Spec §4.1, §4.2, §4.5, §5 #10 and its bug (the return date), §8 (FMG `STAR_ONLY` shrinks); M-R1–M-R5, O-R1, O-R8.

**Files:** Modify `src/components/asset-operations/checkin-form.tsx` (`w/crlf`); `messages/th.json`, `messages/en.json` (`w/crlf`) · Pins `tests/asset-handover-checkin.test.ts` (**`w/lf`**) · Guards `tests/form-migration-guards.test.ts`, `tests/validation-guards.test.ts` (`w/crlf`) · Test `tests/v-track2-o.test.ts` (LF).

**Changes at e1caa29:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| imports `:29-31` | — | + `waitForDialogToClose`, `maxLength`, `required`, `useFieldErrors` | M-R3 |
| after `QueuedPhoto` `:60-64` | — | `CheckinFormValues`, `FIELD_IDS` (7 keys), `CheckinField`, `FIELD_ORDER`, `validate()` | M-R1, M-R2, O-R8 |
| `:93`, `:104` | — ; `useState({` | `fieldErrors`; `useState<CheckinFormValues>({` | M-R3 |
| `setField` `:173-175`; `handleDamageNoteChange` `:184`; legacy backfill `:218-224` | — | `leaveReview`, `focusFirstError`; `setField` clears its key; the repair status pick and the backfill clear what they fill | O-R1, M-R5, O-R8 |
| `handleSubmit` `:238-249` | 3 toast guards | `setErrors(validate(values))` / `if (focusFirstError()) return` | M-R4 |
| `submitCheckin` `:254-259` | repeat guard with a toast | a type-narrowing `return` | O-R8 |
| `:280` | `if (!response.ok) {` | + the refusal line of M-R4 before the code map | O-R1 |
| selects `:309`, `:443`, `:453` | star-only | `id` first, `error` before `onChange` | V4 |
| return date `:398-399` | `<Field … required>` / `<Input type="date" … />` | `id`, `error`; the Input gets `required` | O-R8 |
| `Select`s `:463`, `:469`, `:475`; `Select` `:578-586` | one line each; no `id`/`error` | one prop per line with `id` and `error`; `Select` takes `id?` and `error?` | M-R5 |
| messages | `checkin.selectCheckoutRequired`, `selectReturnAndReceiver`, `completeRequiredFields` | deleted | O-R8 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-o.test.ts`:

```ts

test("checkin: the return date is checked at last, errors under the field instead of four toasts, and a refusal from the review back on its field (v-track O3)", () => {
  const source = read(`${C}asset-operations/checkin-form.tsx`)
  const ids = {
    checkoutId: "checkin-checkout",
    returnDate: "checkin-return-date",
    returnBy: "checkin-return-by",
    receiveBy: "checkin-receive-by",
    conditionAfter: "checkin-condition-after",
    nextStatusId: "checkin-next-status",
    nextLocationId: "checkin-next-location",
  }
  assertOperationForm(source, { ids })
  const rules = validateBody(source)
  for (const rule of [
    'check("checkoutId", required(values.checkoutId))',
    'check("returnDate", required(values.returnDate))',
    'check("returnBy", required(values.returnBy) ?? maxLength(values.returnBy, 100))',
    'check("receiveBy", required(values.receiveBy) ?? maxLength(values.receiveBy, 100))',
    'check("conditionAfter", required(values.conditionAfter))',
    'check("nextStatusId", required(values.nextStatusId))',
    'check("nextLocationId", required(values.nextLocationId))',
  ]) assert.ok(rules.includes(rule), rule)
  for (const key of Object.keys(ids)) assert.ok(source.includes(`error={fieldErrors.message("${key}")}`), key)
  // The return date had the star and no check (spec §5): native required joins the star and validate() checks it.
  assert.match(source, /<Field label=\{t\("returnDate"\)\} id="checkin-return-date" required error=\{fieldErrors\.message\("returnDate"\)\}>\n\s+<Input type="date" value=\{values\.returnDate\} onChange=\{\(event\) => setField\("returnDate", event\.target\.value\)\} required \/>/)
  // The three required selects have an id for focus and show their error (V4).
  for (const id of ["checkin-checkout", "checkin-return-by", "checkin-receive-by"]) {
    assert.match(source, new RegExp(`<SearchableSelect\\n\\s+id="${id}"\\n`), id)
  }
  // A refusal from the review closes it, and the field takes focus once the dialog has gone (O-R1).
  assert.match(source, /const closed = waitForDialogToClose\(\)\n\s+setReviewOpen\(false\)\n\s+await closed\n/)
  assert.ok(source.includes("fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key], reveal: leaveReview })"))
  // A refusal that names no field keeps today's handover messages through the catch.
  assert.match(source, /payload\?\.code === "ASSET_HANDOVER_MODE_MISSING"/)
  // Clearing (spec §4.3): a set clears its key; the legacy backfill and the repair status it picks clear theirs.
  assert.match(source, /setValues\(\(current\) => \(\{ \.\.\.current, \[field\]: value \}\)\)\n\s+if \(field in FIELD_IDS\) fieldErrors\.clear\(field as CheckinField\)/)
  assert.ok(source.includes('fieldErrors.clear("checkoutId", "returnBy", "conditionAfter", "nextLocationId")'))
  assert.ok(source.includes('if (value.trim() && !values.nextStatusId && repairStatus) fieldErrors.clear("nextStatusId")'))
  for (const locale of ["th", "en"]) {
    const checkin = messagesOf(locale).checkin
    for (const key of ["selectCheckoutRequired", "selectReturnAndReceiver", "completeRequiredFields"]) {
      assert.equal(checkin[key], undefined, `${locale}.checkin.${key} has no reader and is removed`)
    }
  }
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-o.test.ts`. Expected to fail: "checkin: the return date is checked at last, errors under the field instead of four toasts, and a refusal from the review back on its field (v-track O3)" (the form already has `noValidate`, so the first failure is `The input did not match the regular expression /import \{ useFieldErrors…`). After Step 3 and before Step 4, `node --test tests/asset-handover-checkin.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts` fails three tests: "the check-in form uses the shared fields and a busy save button (2C batch 1b)", "the guard's own lists name real files, and every EXEMPT row has a count, a kind, a why and a ruling (spec 2D §5.1)" (`STAR_ONLY: … checkin-form.tsx|t("returnDate") is not a star without native required any more; remove it`) and "V5 the required selects that nothing checks only count down (spec §5)"; Step 4 is their edit.
- [ ] **Step 3: Implement.** The exact edits, in `src/components/asset-operations/checkin-form.tsx`:

**`src/components/asset-operations/checkin-form.tsx`, edit 1 of 16.** Old:
```tsx
import { formatCount } from "@/lib/display-format"
import { toLocalDateInputValue } from "@/lib/local-date"
import { useApiError } from "@/components/ui/use-api-error"
```
New:
```tsx
import { formatCount } from "@/lib/display-format"
import { waitForDialogToClose } from "@/lib/field-focus"
import { toLocalDateInputValue } from "@/lib/local-date"
import { maxLength, required } from "@/lib/validation-rules"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
```

**`src/components/asset-operations/checkin-form.tsx`, edit 2 of 16.** Old:
```tsx
type QueuedPhoto = {
  id: string
  label: string
  file: File
}
```
New:
```tsx
type QueuedPhoto = {
  id: string
  label: string
  file: File
}
type CheckinFormValues = {
  checkoutId: string
  returnDate: string
  returnBy: string
  receiveBy: string
  conditionAfter: string
  nextStatusId: string
  nextLocationId: string
  missingAccessories: string
  damageNote: string
  remark: string
  maintenanceProblem: string
}

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1). The two
// people are keyed by their names (returnBy, receiveBy), the fields the server requires; the selects hold their ids.
const FIELD_IDS = {
  checkoutId: "checkin-checkout",
  returnDate: "checkin-return-date",
  returnBy: "checkin-return-by",
  receiveBy: "checkin-receive-by",
  conditionAfter: "checkin-condition-after",
  nextStatusId: "checkin-next-status",
  nextLocationId: "checkin-next-location",
} as const
type CheckinField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as CheckinField[]

// noValidate turns the browser's check off, so this restates the controls' required (the return date had the star and
// no check at all, spec §5) and the server's 100-character limit on the two names (v-track M-R2).
function validate(values: CheckinFormValues): Partial<Record<CheckinField, string>> {
  const errors: Partial<Record<CheckinField, string>> = {}
  const check = (key: CheckinField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("checkoutId", required(values.checkoutId))
  check("returnDate", required(values.returnDate))
  check("returnBy", required(values.returnBy) ?? maxLength(values.returnBy, 100))
  check("receiveBy", required(values.receiveBy) ?? maxLength(values.receiveBy, 100))
  check("conditionAfter", required(values.conditionAfter))
  check("nextStatusId", required(values.nextStatusId))
  check("nextLocationId", required(values.nextLocationId))
  return errors
}
```

**`src/components/asset-operations/checkin-form.tsx`, edit 3 of 16.** Old:
```tsx
  const [reviewOpen, setReviewOpen] = useState(false)
  const [legacyBackfillSavingId
```
New:
```tsx
  const [reviewOpen, setReviewOpen] = useState(false)
  const fieldErrors = useFieldErrors<CheckinField>()
  const [legacyBackfillSavingId
```

**`src/components/asset-operations/checkin-form.tsx`, edit 4 of 16.** Old:
```tsx
  const [values, setValues] = useState({
    checkoutId: initialCheckout?.id ?? "",
```
New:
```tsx
  const [values, setValues] = useState<CheckinFormValues>({
    checkoutId: initialCheckout?.id ?? "",
```

**`src/components/asset-operations/checkin-form.tsx`, edit 5 of 16.** Old:
```tsx
  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }
```
New:
```tsx
  // A refusal from the review closes it, and the field takes focus once the dialog has gone (spec §4.2, O-R1).
  async function leaveReview() {
    const closed = waitForDialogToClose()
    setReviewOpen(false)
    await closed
  }
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key], reveal: leaveReview })

  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field in FIELD_IDS) fieldErrors.clear(field as CheckinField)
  }
```

**`src/components/asset-operations/checkin-form.tsx`, edit 6 of 16.** Old:
```tsx
  function handleDamageNoteChange(value: string) {
    setValues((current) => ({
```
New:
```tsx
  function handleDamageNoteChange(value: string) {
    // A damage note picks the repair status when none is chosen yet, which settles that field's error too.
    if (value.trim() && !values.nextStatusId && repairStatus) fieldErrors.clear("nextStatusId")
    setValues((current) => ({
```

**`src/components/asset-operations/checkin-form.tsx`, edit 7 of 16.** Old:
```tsx
          nextLocationId: current.nextLocationId || candidate.currentLocationId,
        }))
      }
```
New:
```tsx
          nextLocationId: current.nextLocationId || candidate.currentLocationId,
        }))
        fieldErrors.clear("checkoutId", "returnBy", "conditionAfter", "nextLocationId")
      }
```

**`src/components/asset-operations/checkin-form.tsx`, edit 8 of 16.** Old:
```tsx
    event.preventDefault()
    if (!selectedCheckout?.assetId) {
      toast.error(t("selectCheckoutRequired"))
      return
    }
    if (!returnByEmployeeId || !receiveByEmployeeId) {
      toast.error(t("selectReturnAndReceiver"))
      return
    }
    if (!values.conditionAfter || !values.nextStatusId || !values.nextLocationId) {
      toast.error(t("completeRequiredFields"))
      return
    }
    setReviewOpen(true)
```
New:
```tsx
    event.preventDefault()
    fieldErrors.setErrors(validate(values))
    if (focusFirstError()) return
    setReviewOpen(true)
```

**`src/components/asset-operations/checkin-form.tsx`, edit 9 of 16.** Old:
```tsx
    const assetId = selectedCheckout?.assetId
    if (!assetId) {
      setReviewOpen(false)
      toast.error(t("selectCheckoutRequired"))
      return
    }
```
New:
```tsx
    // The review opens only after validate() found the checkout, so this only narrows the type.
    const assetId = selectedCheckout?.assetId
    if (!assetId) return
```

**`src/components/asset-operations/checkin-form.tsx`, edit 10 of 16.** Old:
```tsx
      if (!response.ok) {
        const message = payload?.code === "ASSET_HANDOVER_MODE_MISSING"
```
New:
```tsx
      if (!response.ok) {
        // A refusal that names a field of this form closes the review and shows under it; any other keeps the toast.
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        const message = payload?.code === "ASSET_HANDOVER_MODE_MISSING"
```

**`src/components/asset-operations/checkin-form.tsx`, edit 11 of 16.** Old:
```tsx
          <SearchableSelect
            label={t("asset")}
            value={values.checkoutId}
            required
            disabled={!hasActiveCheckoutRecords}
            options={activeCheckoutOptions}
            placeholder={hasActiveCheckoutRecords ? t("selectCheckout") : t("noActiveCheckoutsOption")}
            searchPlaceholder={tCommon("searchSelectPlaceholder")}
            emptyLabel={tCommon("searchSelectNoResults")}
            onChange={(value) => setField("checkoutId", value)}
          />
```
New:
```tsx
          <SearchableSelect
            id="checkin-checkout"
            label={t("asset")}
            value={values.checkoutId}
            required
            disabled={!hasActiveCheckoutRecords}
            options={activeCheckoutOptions}
            placeholder={hasActiveCheckoutRecords ? t("selectCheckout") : t("noActiveCheckoutsOption")}
            searchPlaceholder={tCommon("searchSelectPlaceholder")}
            emptyLabel={tCommon("searchSelectNoResults")}
            error={fieldErrors.message("checkoutId")}
            onChange={(value) => setField("checkoutId", value)}
          />
```

**`src/components/asset-operations/checkin-form.tsx`, edit 12 of 16.** Old:
```tsx
          <Field label={t("returnDate")} required>
            <Input type="date" value={values.returnDate} onChange={(event) => setField("returnDate", event.target.value)} />
```
New:
```tsx
          <Field label={t("returnDate")} id="checkin-return-date" required error={fieldErrors.message("returnDate")}>
            <Input type="date" value={values.returnDate} onChange={(event) => setField("returnDate", event.target.value)} required />
```

**`src/components/asset-operations/checkin-form.tsx`, edit 13 of 16.** Old:
```tsx
          <SearchableSelect
            label={t("returnBy")}
            value={returnByEmployeeId}
            required
            options={employees}
            placeholder={t("selectReturnBy")}
            searchPlaceholder={tCommon("searchSelectPlaceholder")}
            emptyLabel={tCommon("searchSelectNoResults")}
            onChange={(value) => setEmployeeField("returnBy", value)}
          />
          <SearchableSelect
            label={t("receiveBy")}
            value={receiveByEmployeeId}
            required
            options={employees}
            placeholder={t("selectReceiveBy")}
            searchPlaceholder={tCommon("searchSelectPlaceholder")}
            emptyLabel={tCommon("searchSelectNoResults")}
            onChange={(value) => setEmployeeField("receiveBy", value)}
          />
          <Select label={t("conditionAfter")} value={values.conditionAfter} required onChange={(value) => setField("conditionAfter", value)}>
```
New:
```tsx
          <SearchableSelect
            id="checkin-return-by"
            label={t("returnBy")}
            value={returnByEmployeeId}
            required
            options={employees}
            placeholder={t("selectReturnBy")}
            searchPlaceholder={tCommon("searchSelectPlaceholder")}
            emptyLabel={tCommon("searchSelectNoResults")}
            error={fieldErrors.message("returnBy")}
            onChange={(value) => setEmployeeField("returnBy", value)}
          />
          <SearchableSelect
            id="checkin-receive-by"
            label={t("receiveBy")}
            value={receiveByEmployeeId}
            required
            options={employees}
            placeholder={t("selectReceiveBy")}
            searchPlaceholder={tCommon("searchSelectPlaceholder")}
            emptyLabel={tCommon("searchSelectNoResults")}
            error={fieldErrors.message("receiveBy")}
            onChange={(value) => setEmployeeField("receiveBy", value)}
          />
          <Select
            label={t("conditionAfter")}
            id="checkin-condition-after"
            value={values.conditionAfter}
            required
            error={fieldErrors.message("conditionAfter")}
            onChange={(value) => setField("conditionAfter", value)}
          >
```

**`src/components/asset-operations/checkin-form.tsx`, edit 14 of 16.** Old:
```tsx
          <Select label={t("nextStatus")} value={values.nextStatusId} required onChange={(value) => setField("nextStatusId", value)}>
```
New:
```tsx
          <Select
            label={t("nextStatus")}
            id="checkin-next-status"
            value={values.nextStatusId}
            required
            error={fieldErrors.message("nextStatusId")}
            onChange={(value) => setField("nextStatusId", value)}
          >
```

**`src/components/asset-operations/checkin-form.tsx`, edit 15 of 16.** Old:
```tsx
          <Select label={t("nextLocation")} value={values.nextLocationId} required onChange={(value) => setField("nextLocationId", value)}>
```
New:
```tsx
          <Select
            label={t("nextLocation")}
            id="checkin-next-location"
            value={values.nextLocationId}
            required
            error={fieldErrors.message("nextLocationId")}
            onChange={(value) => setField("nextLocationId", value)}
          >
```

**`src/components/asset-operations/checkin-form.tsx`, edit 16 of 16.** Old:
```tsx
function Select({ label, value, required, disabled, onChange, children }: { label: string; value: string; required?: boolean; disabled?: boolean; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <Field label={label} required={required}>
```
New:
```tsx
function Select({
  label,
  id,
  value,
  required,
  disabled,
  error,
  onChange,
  children,
}: {
  label: string
  id?: string
  value: string
  required?: boolean
  disabled?: boolean
  error?: React.ReactNode
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <Field label={label} id={id} required={required} error={error}>
```


Then the messages: `{"delete":["checkin.selectCheckoutRequired","checkin.selectReturnAndReceiver","checkin.completeRequiredFields"]}` as `<temp>/o3-messages.json`, `node scripts/messages-edit.mjs <temp>/o3-messages.json` (`0 th, 0 en, 3 deleted`).

- [ ] **Step 4: Pin and guard edits.**

**`tests/asset-handover-checkin.test.ts`, edit 1 of 1.** Old:
```ts
  assert.match(source, /<Field label=\{t\("returnDate"\)\} required>\n\s+<Input type="date" value=\{values\.returnDate\}/)
```
New:
```ts
  assert.match(source, /<Field label=\{t\("returnDate"\)\} id="checkin-return-date" required error=\{fieldErrors\.message\("returnDate"\)\}>\n\s+<Input type="date" value=\{values\.returnDate\}[^\n]* required \/>/)
```

**`tests/form-migration-guards.test.ts`, edit 1 of 2.** Old:
```ts
  [`${C}asset-operations/checkin-form.tsx`]: [4, 0, 0],
```
New:
```ts
  [`${C}asset-operations/checkin-form.tsx`]: [5, 0, 0],
```

**`tests/validation-guards.test.ts`, edit 1 of 2.** Old:
```ts
const V_FORMS: readonly string[] = [
```
New:
```ts
const V_FORMS: readonly string[] = [
  `${C}asset-operations/checkin-form.tsx`,
```

**`tests/validation-guards.test.ts`, edit 2 of 2 (the occurrence after `const SELECT_STAR_ONLY: Readonly<Record<string, number>> = {`; the same line earlier in the file stays).** Old:
```ts
  [`${C}asset-operations/checkin-form.tsx`]: 3,
```
New: nothing (delete the old text, its line break included).


**`tests/form-migration-guards.test.ts`, edit 2 of 2 (`STAR_ONLY`).** In this plan's order Task 1 (A1) already removed the asset form's two entries, so the checkin entry is the only one left (P-R3), and the emptied set is typed (an empty `new Set([])` is a `Set<never>`, and `STAR_ONLY.has(…)` then fails `tsc`). Old:
```ts
const STAR_ONLY = new Set([`${C}asset-operations/checkin-form.tsx|t("returnDate")`])
```
New:
```ts
const STAR_ONLY = new Set<string>([])
```

- [ ] **Step 5: Verify.** `node --test tests/v-track2-o.test.ts tests/asset-handover-checkin.test.ts tests/checkin-send-to-repair-ui.test.ts tests/legacy-checkin-flow.test.ts tests/validation-guards.test.ts tests/form-migration-guards.test.ts tests/asset-operation-confirmation-ui.test.ts tests/operations-sweep-ui.test.ts tests/file-evidence-ui.test.ts tests/form-frames-ui.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts` (0 fail); `npm test` (+1; 2266 tests, 2265 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint`. eol: checkin-form `701 701`, `asset-handover-checkin.test.ts` `0 58`, `form-migration-guards.test.ts` keeps CRLF, `v-track2-o.test.ts` `0 206`.
- [ ] **Step 6: Commit.** `git add src/components/asset-operations/checkin-form.tsx messages/th.json messages/en.json tests/asset-handover-checkin.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/v-track2-o.test.ts`, then `git commit -m "fix(operations): checkin checks its return date and shows its errors under the field, and a refusal from the review goes back to its field (v-track plan 2 task 10, O3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 11 (O4): Transfer shows its errors under the field, and a refusal from the review goes back to its field (`c/asset-operations/transfer-form.tsx`)

Spec §4.1–§4.3 (the "at least one destination" group), §5 #11; M-R1–M-R5, O-R1, O-R4.

**Files:** Modify `src/components/asset-operations/transfer-form.tsx` (`w/crlf`); `messages/th.json`, `messages/en.json` (`w/crlf`) · Pins `tests/asset-operation-confirmation-ui.test.ts` (`w/crlf`) · Guard `tests/validation-guards.test.ts` · Test `tests/v-track2-o.test.ts` (LF).

**Changes at e1caa29:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| imports `:17-20` | — | + `waitForDialogToClose`, `atLeastOne`, `maxLength`, `required`, `useFieldErrors`; `TransferFormValues`, `FIELD_IDS` (3 keys), `validate()` after `Option` | M-R1, M-R2, O-R4 |
| `:43`, `:45` | — ; `useState({` | `fieldErrors`; `useState<TransferFormValues>({` | M-R3 |
| `setField` `:75` | — | `leaveReview`, `focusFirstError` before it; the three destinations clear `toLocationId`, a table key clears itself | O-R1, O-R4 |
| `handleSubmit` `:91-94` | toast guard | `setErrors(validate(values))` / `if (focusFirstError()) return` | M-R4 |
| `:113`; `<form>` `:128` | refusal throws; no `noValidate` | the refusal block of M-R4; `noValidate` | O-R1, FIXED 6 |
| asset `:134`, location `:135` | no `id`/`error` | `id` first, `error` before `onChange` (one line each, as today) | V4, O-R4 |
| reason `:139` | `<Field label={t("reason")} required>` | `id`, `error` | M-R5 |
| messages | `transfer.destinationRequired` | deleted | O-R4 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-o.test.ts`:

```ts

test("transfer: errors under the field, the at-least-one destination under the location with the server's code, and a refusal from the review back on its field (v-track O4)", () => {
  const source = read(`${C}asset-operations/transfer-form.tsx`)
  const ids = { assetId: "transfer-asset", toLocationId: "transfer-to-location", reason: "transfer-reason" }
  assertOperationForm(source, { ids })
  const rules = validateBody(source)
  for (const rule of [
    'check("assetId", required(values.assetId))',
    'check("toLocationId", atLeastOne([values.toLocationId, values.toCustodianId, values.toDepartmentId]) && "transferDestinationRequired")',
    'check("reason", required(values.reason) ?? maxLength(values.reason, 500))',
  ]) assert.ok(rules.includes(rule), rule)
  for (const key of Object.keys(ids)) assert.ok(source.includes(`error={fieldErrors.message("${key}")}`), key)
  // The required asset select has an id for focus and shows its error (V4); the destination rule shows under the
  // location select, the key the server names (O-R4).
  assert.match(source, /<SearchableSelect id="transfer-asset" label=\{t\("asset"\)\} [^\n]*error=\{fieldErrors\.message\("assetId"\)\}/)
  assert.match(source, /<SearchableSelect id="transfer-to-location" label=\{t\("toLocation"\)\} [^\n]*error=\{fieldErrors\.message\("toLocationId"\)\}/)
  assert.match(source, /<Field label=\{t\("reason"\)\} id="transfer-reason" required error=\{fieldErrors\.message\("reason"\)\}>/)
  // The three destinations are one rule: a change of any clears it (spec §4.3).
  assert.ok(source.includes('if (field === "toLocationId" || field === "toCustodianId" || field === "toDepartmentId") fieldErrors.clear("toLocationId")'))
  // A refusal from the review closes it, and the field takes focus once the dialog has gone (O-R1).
  assert.match(source, /const closed = waitForDialogToClose\(\)\n\s+setReviewOpen\(false\)\n\s+await closed\n/)
  assert.ok(source.includes("fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key], reveal: leaveReview })"))
  assert.doesNotMatch(source, /destinationRequired"\)/)
  for (const locale of ["th", "en"]) {
    assert.equal(messagesOf(locale).transfer.destinationRequired, undefined, `${locale}.transfer.destinationRequired has no reader and is removed`)
  }
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-o.test.ts`. Expected to fail: "transfer: errors under the field, the at-least-one destination under the location with the server's code, and a refusal from the review back on its field (v-track O4)" ("noValidate directly after onSubmit"). After Step 3 and before Step 4, `node --test tests/asset-operation-confirmation-ui.test.ts tests/validation-guards.test.ts` fails "the transfer form uses the shared fields and a busy save button (2C batch 1b)" and "V5 the required selects that nothing checks only count down (spec §5)"; Step 4 is their edit.
- [ ] **Step 3: Implement.** The exact edits, in `src/components/asset-operations/transfer-form.tsx`:

**`src/components/asset-operations/transfer-form.tsx`, edit 1 of 9.** Old:
```tsx
import { buildOperationReviewSummary } from "@/lib/asset-operation-review"
import { useApiError } from "@/components/ui/use-api-error"

type Option = { id: string; label: string; disabled?: boolean; personalTransferEligible?: boolean }
```
New:
```tsx
import { buildOperationReviewSummary } from "@/lib/asset-operation-review"
import { waitForDialogToClose } from "@/lib/field-focus"
import { atLeastOne, maxLength, required } from "@/lib/validation-rules"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"

type Option = { id: string; label: string; disabled?: boolean; personalTransferEligible?: boolean }
type TransferFormValues = {
  assetId: string
  toLocationId: string
  toCustodianId: string
  toDepartmentId: string
  reason: string
  remark: string
}

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1). The server
// names "at least one destination" under toLocationId, so the rule shows under the location select (O-R4).
const FIELD_IDS = {
  assetId: "transfer-asset",
  toLocationId: "transfer-to-location",
  reason: "transfer-reason",
} as const
type TransferField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as TransferField[]

// noValidate turns the browser's check off, so this restates the controls' required and maxLength, and the server's
// "at least one destination" with the server's own code (v-track M-R2, O-R4).
function validate(values: TransferFormValues): Partial<Record<TransferField, string>> {
  const errors: Partial<Record<TransferField, string>> = {}
  const check = (key: TransferField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("assetId", required(values.assetId))
  check("toLocationId", atLeastOne([values.toLocationId, values.toCustodianId, values.toDepartmentId]) && "transferDestinationRequired")
  check("reason", required(values.reason) ?? maxLength(values.reason, 500))
  return errors
}
```

**`src/components/asset-operations/transfer-form.tsx`, edit 2 of 9.** Old:
```tsx
  const [reviewOpen, setReviewOpen] = useState(false)
  const initialAsset
```
New:
```tsx
  const [reviewOpen, setReviewOpen] = useState(false)
  const fieldErrors = useFieldErrors<TransferField>()
  const initialAsset
```

**`src/components/asset-operations/transfer-form.tsx`, edit 3 of 9.** Old:
```tsx
  const [values, setValues] = useState({
    assetId: initialAsset?.id ?? "",
```
New:
```tsx
  const [values, setValues] = useState<TransferFormValues>({
    assetId: initialAsset?.id ?? "",
```

**`src/components/asset-operations/transfer-form.tsx`, edit 4 of 9.** Old:
```tsx
  function setField(field: string, value: string) {
    setValues((current) => {
```
New:
```tsx
  // A refusal from the review closes it, and the field takes focus once the dialog has gone (spec §4.2, O-R1).
  async function leaveReview() {
    const closed = waitForDialogToClose()
    setReviewOpen(false)
    await closed
  }
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key], reveal: leaveReview })

  function setField(field: string, value: string) {
    // The three destinations are one rule, so a change of any clears it (spec §4.3).
    if (field === "toLocationId" || field === "toCustodianId" || field === "toDepartmentId") fieldErrors.clear("toLocationId")
    else if (field in FIELD_IDS) fieldErrors.clear(field as TransferField)
    setValues((current) => {
```

**`src/components/asset-operations/transfer-form.tsx`, edit 5 of 9.** Old:
```tsx
    event.preventDefault()
    if (!selectedAsset || (!values.toLocationId && !values.toCustodianId && !values.toDepartmentId)) {
      toast.error(t("destinationRequired"))
      return
    }
    setReviewOpen(true)
```
New:
```tsx
    event.preventDefault()
    fieldErrors.setErrors(validate(values))
    if (focusFirstError()) return
    setReviewOpen(true)
```

**`src/components/asset-operations/transfer-form.tsx`, edit 6 of 9.** Old:
```tsx
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
```
New:
```tsx
      if (!response.ok) {
        // A refusal that names a field of this form closes the review and shows under it; any other keeps the toast.
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error(payload?.error ?? tCommon("error"))
      }
```

**`src/components/asset-operations/transfer-form.tsx`, edit 7 of 9.** Old:
```tsx
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
```
New:
```tsx
        <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
```

**`src/components/asset-operations/transfer-form.tsx`, edit 8 of 9.** Old:
```tsx
          <SearchableSelect label={t("asset")} value={values.assetId} required options={availableAssets} placeholder={t("selectAsset")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setField("assetId", value)} />
          <SearchableSelect label={t("toLocation")} value={values.toLocationId} options={locations} placeholder={t("noChange")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setField("toLocationId", value)} />
```
New:
```tsx
          <SearchableSelect id="transfer-asset" label={t("asset")} value={values.assetId} required options={availableAssets} placeholder={t("selectAsset")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} error={fieldErrors.message("assetId")} onChange={(value) => setField("assetId", value)} />
          <SearchableSelect id="transfer-to-location" label={t("toLocation")} value={values.toLocationId} options={locations} placeholder={t("noChange")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} error={fieldErrors.message("toLocationId")} onChange={(value) => setField("toLocationId", value)} />
```

**`src/components/asset-operations/transfer-form.tsx`, edit 9 of 9.** Old:
```tsx
            <Field label={t("reason")} required>
```
New:
```tsx
            <Field label={t("reason")} id="transfer-reason" required error={fieldErrors.message("reason")}>
```


Then the messages: `{"delete":["transfer.destinationRequired"]}` as `<temp>/o4-messages.json`, `node scripts/messages-edit.mjs <temp>/o4-messages.json` (`0 th, 0 en, 1 deleted`).

- [ ] **Step 4: Pin and guard edits** (the transfer row of `SELECT_STAR_ONLY` reads exactly like its `V_SCOPE` row: delete the one inside `SELECT_STAR_ONLY`):

**`tests/asset-operation-confirmation-ui.test.ts`, edit 1 of 1.** Old:
```ts
  assert.match(source, /<Field label=\{t\("reason"\)\} required>\n\s+<Input value=
```
New:
```ts
  assert.match(source, /<Field label=\{t\("reason"\)\} id="transfer-reason" required error=\{fieldErrors\.message\("reason"\)\}>\n\s+<Input value=
```

**`tests/validation-guards.test.ts`, edit 1 of 2.** Old:
```ts
const V_FORMS: readonly string[] = [
```
New:
```ts
const V_FORMS: readonly string[] = [
  `${C}asset-operations/transfer-form.tsx`,
```

**`tests/validation-guards.test.ts`, edit 2 of 2 (the occurrence after `const SELECT_STAR_ONLY: Readonly<Record<string, number>> = {`; the same line earlier in the file stays).** Old:
```ts
  [`${C}asset-operations/transfer-form.tsx`]: 1,
```
New: nothing (delete the old text, its line break included).


- [ ] **Step 5: Verify.** `node --test tests/v-track2-o.test.ts tests/asset-operation-confirmation-ui.test.ts tests/validation-guards.test.ts tests/form-migration-guards.test.ts tests/operations-sweep-ui.test.ts tests/form-frames-ui.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts` (0 fail); `npm test` (+1; 2267 tests, 2266 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint`. eol: transfer-form `217 217`, `asset-operation-confirmation-ui.test.ts` `50 50`, `v-track2-o.test.ts` `0 233`.
- [ ] **Step 6: Commit.** `git add src/components/asset-operations/transfer-form.tsx messages/th.json messages/en.json tests/asset-operation-confirmation-ui.test.ts tests/validation-guards.test.ts tests/v-track2-o.test.ts`, then `git commit -m "feat(operations): transfer shows its errors under the field, and a refusal from the review goes back to its field (v-track plan 2 task 11, O4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 12 (O5): Bulk move checks its destination and shows its errors under the field and under the asset list (`c/asset-operations/bulk-move-form.tsx`)

Spec §4.1, §4.3, §4.4, §4.5, §5 #12 and its bug (the destination), §7.3 (groups); M-R1–M-R5, M-R8, O-R5.

**Files:** Modify `src/components/asset-operations/bulk-move-form.tsx` (`w/crlf`) · Pins `tests/choice-controls-ui.test.ts` (`w/crlf`) · Guard `tests/validation-guards.test.ts` · Test `tests/v-track2-o.test.ts` (LF).

**Changes at e1caa29:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| imports `:12`, `:19-21` | `Field, FieldLabel` | `Field, FieldError, FieldLabel`; + `useFieldErrors`, `maxLength`, `required`; `BulkMoveFormValues`, `FIELD_IDS` (3 keys), `validate()` | M-R1–M-R3, O-R5 |
| `:29` | — | `fieldErrors` | M-R3 |
| `setField`, `toggleAsset`, `handleSubmit` `:49-65` | toast guard | `focusFirstError`; `setField` and `toggleAsset` clear their keys; `setErrors(validate({ ...values, assetIds }))` / `if (focusFirstError()) return` | M-R4, M-R5 |
| `:74`; `<form>` `:89` | refusal throws; no `noValidate` | the refusal block of M-R4; `noValidate` | FIXED 6 |
| asset list `:101` | `<div role="group" aria-labelledby=… className=…>` | one prop per line with `id="bulk-move-assets"` and `aria-describedby`; a `FieldError` under the list | O-R5 |
| destination `:126`, reason `:127` | star-only select; `Field … required` | `id`, `error` | V4, M-R5 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-o.test.ts`:

```ts

test("bulk move: the destination is checked at last, and the errors show under the field and under the asset list (v-track O5)", () => {
  const source = read(`${C}asset-operations/bulk-move-form.tsx`)
  assertOperationForm(source, { ids: { assetIds: "bulk-move-assets", toLocationId: "bulk-move-to-location", reason: "bulk-move-reason" } })
  const rules = validateBody(source)
  for (const rule of [
    'check("assetIds", required(values.assetIds))',
    'check("toLocationId", required(values.toLocationId))',
    'check("reason", required(values.reason) ?? maxLength(values.reason, 500))',
  ]) assert.ok(rules.includes(rule), rule)
  assert.match(source, /fieldErrors\.setErrors\(validate\(\{ \.\.\.values, assetIds \}\)\)/)
  // The destination had the star and nothing checked it (spec §5): an id for focus and its error (V4).
  assert.match(source, /<SearchableSelect id="bulk-move-to-location" label=\{t\("toLocation"\)\} [^\n]*error=\{fieldErrors\.message\("toLocationId"\)\}/)
  assert.match(source, /<Field label=\{t\("reason"\)\} id="bulk-move-reason" required error=\{fieldErrors\.message\("reason"\)\}>/)
  // The asset list is one group with one error under it, in the list's own words; focus goes to its first checkbox (O-R5).
  assert.match(source, /<div\n\s+role="group"\n\s+id="bulk-move-assets"\n\s+aria-labelledby=\{assetsLabelId\}\n\s+aria-describedby=\{fieldErrors\.errors\.assetIds \? "bulk-move-assets-error" : undefined\}\n/)
  assert.ok(source.includes('<FieldError id="bulk-move-assets-error" className="mt-1.5">'))
  assert.ok(source.includes('{fieldErrors.errors.assetIds === "required" ? t("selectAssets") : fieldErrors.message("assetIds")}'))
  assert.match(source, /current\.includes\(assetId\) \? current\.filter\(\(id\) => id !== assetId\) : \[\.\.\.current, assetId\]\n\s+\)\n\s+fieldErrors\.clear\("assetIds"\)/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-o.test.ts`. Expected to fail: "bulk move: the destination is checked at last, and the errors show under the field and under the asset list (v-track O5)" ("noValidate directly after onSubmit"). After Step 3 and before Step 4, `node --test tests/choice-controls-ui.test.ts tests/validation-guards.test.ts` fails "bulk move lists assets as real checkbox rows that Enter cannot submit (P1)" and "V5 the required selects that nothing checks only count down (spec §5)"; Step 4 is their edit.
- [ ] **Step 3: Implement.** The exact edits, in `src/components/asset-operations/bulk-move-form.tsx`:

**`src/components/asset-operations/bulk-move-form.tsx`, edit 1 of 8.** Old:
```tsx
import { Field, FieldLabel } from "@/components/ui/field"
```
New:
```tsx
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
```

**`src/components/asset-operations/bulk-move-form.tsx`, edit 2 of 8.** Old:
```tsx
import { useApiError } from "@/components/ui/use-api-error"

type Option = { id: string; label: string; disabled?: boolean }
```
New:
```tsx
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { maxLength, required } from "@/lib/validation-rules"

type Option = { id: string; label: string; disabled?: boolean }
type BulkMoveFormValues = { assetIds: readonly string[]; toLocationId: string; reason: string; remark: string }

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1). The asset
// list is one group: its id is on the list, and focus goes to its first checkbox (O-R5).
const FIELD_IDS = {
  assetIds: "bulk-move-assets",
  toLocationId: "bulk-move-to-location",
  reason: "bulk-move-reason",
} as const
type BulkMoveField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as BulkMoveField[]

// noValidate turns the browser's check off, so this restates the controls' required and maxLength; the destination had
// the star and nothing checked it (spec §5) (v-track M-R2).
function validate(values: BulkMoveFormValues): Partial<Record<BulkMoveField, string>> {
  const errors: Partial<Record<BulkMoveField, string>> = {}
  const check = (key: BulkMoveField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("assetIds", required(values.assetIds))
  check("toLocationId", required(values.toLocationId))
  check("reason", required(values.reason) ?? maxLength(values.reason, 500))
  return errors
}
```

**`src/components/asset-operations/bulk-move-form.tsx`, edit 3 of 8.** Old:
```tsx
  const [saving, setSaving] = useState(false)
  const [assetQuery, setAssetQuery]
```
New:
```tsx
  const [saving, setSaving] = useState(false)
  const fieldErrors = useFieldErrors<BulkMoveField>()
  const [assetQuery, setAssetQuery]
```

**`src/components/asset-operations/bulk-move-form.tsx`, edit 4 of 8.** Old:
```tsx
  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function toggleAsset(assetId: string) {
    setAssetIds((current) =>
      current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId]
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (assetIds.length === 0) {
      toast.error(t("selectAssets"))
      return
    }

    setSaving(true)
```
New:
```tsx
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field in FIELD_IDS) fieldErrors.clear(field as BulkMoveField)
  }

  function toggleAsset(assetId: string) {
    setAssetIds((current) =>
      current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId]
    )
    fieldErrors.clear("assetIds")
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate({ ...values, assetIds }))
    if (focusFirstError()) return

    setSaving(true)
```

**`src/components/asset-operations/bulk-move-form.tsx`, edit 5 of 8.** Old:
```tsx
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
```
New:
```tsx
      if (!response.ok) {
        // A refusal that names a field of this form shows under it; any other keeps the toast (spec §4.1).
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error(payload?.error ?? tCommon("error"))
      }
```

**`src/components/asset-operations/bulk-move-form.tsx`, edit 6 of 8.** Old:
```tsx
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
```
New:
```tsx
        <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-5 md:grid-cols-2">
```

**`src/components/asset-operations/bulk-move-form.tsx`, edit 7 of 8.** Old:
```tsx
            <div role="group" aria-labelledby={assetsLabelId} className="max-h-72 overflow-y-auto rounded-md border border-border bg-surface">
```
New:
```tsx
            <div
              role="group"
              id="bulk-move-assets"
              aria-labelledby={assetsLabelId}
              aria-describedby={fieldErrors.errors.assetIds ? "bulk-move-assets-error" : undefined}
              className="max-h-72 overflow-y-auto rounded-md border border-border bg-surface"
            >
```

**`src/components/asset-operations/bulk-move-form.tsx`, edit 8 of 8.** Old:
```tsx
                })
              )}
            </div>
          </div>
          <SearchableSelect label={t("toLocation")} value={values.toLocationId} required options={locations} placeholder={t("selectLocation")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setField("toLocationId", value)} />
          <Field label={t("reason")} required>
```
New:
```tsx
                })
              )}
            </div>
            {fieldErrors.errors.assetIds ? (
              <FieldError id="bulk-move-assets-error" className="mt-1.5">
                {fieldErrors.errors.assetIds === "required" ? t("selectAssets") : fieldErrors.message("assetIds")}
              </FieldError>
            ) : null}
          </div>
          <SearchableSelect id="bulk-move-to-location" label={t("toLocation")} value={values.toLocationId} required options={locations} placeholder={t("selectLocation")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} error={fieldErrors.message("toLocationId")} onChange={(value) => setField("toLocationId", value)} />
          <Field label={t("reason")} id="bulk-move-reason" required error={fieldErrors.message("reason")}>
```


- [ ] **Step 4: Pin and guard edits** (the bulk-move row of `SELECT_STAR_ONLY` reads exactly like its `V_SCOPE` row: delete the one inside `SELECT_STAR_ONLY`):

**`tests/choice-controls-ui.test.ts`, edit 1 of 1.** Old:
```ts
  assert.match(source, /<div role="group" aria-labelledby=\{assetsLabelId\} className="max-h-72 overflow-y-auto rounded-md border border-border bg-surface">/)
```
New:
```ts
  // The list is the group that holds the assets' error (v-track plan 2 O5).
  assert.match(source, /<div\n\s+role="group"\n\s+id="bulk-move-assets"\n\s+aria-labelledby=\{assetsLabelId\}\n[^\n]*\n\s+className="max-h-72 overflow-y-auto rounded-md border border-border bg-surface"\n\s+>/)
```

**`tests/validation-guards.test.ts`, edit 1 of 2.** Old:
```ts
const V_FORMS: readonly string[] = [
```
New:
```ts
const V_FORMS: readonly string[] = [
  `${C}asset-operations/bulk-move-form.tsx`,
```

**`tests/validation-guards.test.ts`, edit 2 of 2 (the occurrence after `const SELECT_STAR_ONLY: Readonly<Record<string, number>> = {`; the same line earlier in the file stays).** Old:
```ts
  [`${C}asset-operations/bulk-move-form.tsx`]: 1,
```
New: nothing (delete the old text, its line break included).


- [ ] **Step 5: Verify.** `node --test tests/v-track2-o.test.ts tests/choice-controls-ui.test.ts tests/validation-guards.test.ts tests/form-migration-guards.test.ts tests/operations-sweep-ui.test.ts tests/form-frames-ui.test.ts` (0 fail); `npm test` (+1; 2268 tests, 2267 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint`. eol: bulk-move-form `189 189`, `choice-controls-ui.test.ts` `152 152` (after O2), `v-track2-o.test.ts` `0 253`.
- [ ] **Step 6: Commit.** `git add src/components/asset-operations/bulk-move-form.tsx tests/choice-controls-ui.test.ts tests/validation-guards.test.ts tests/v-track2-o.test.ts`, then `git commit -m "fix(operations): bulk move checks its destination and shows its errors under the field and under the asset list (v-track plan 2 task 12, O5)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 13 (O6): The transaction cancel dialog shows the reason's error under the field, and a blocked confirm says why (`c/asset-operations/transaction-cancel-dialog.tsx`)

Spec §4.1, §4.4 (the blockers are a prerequisite; `aria-disabled` plus the reason, §11 call 2), §5 #13; M-R1–M-R5, O-R6, O-R7.

**Files:** Modify `src/components/asset-operations/transaction-cancel-dialog.tsx` (`w/crlf`) · Pins `tests/asset-transaction-cancellation-ui.test.ts` (`w/crlf`), `tests/operations-sweep-ui.test.ts` (**`w/lf`**) · Guard `tests/validation-guards.test.ts` · Test `tests/v-track2-o.test.ts` (LF).

**Changes at e1caa29:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| imports `:12-13` | — | + `useFieldErrors`, `maxLength`, `minLength`, `required` | M-R3 |
| after `TransactionType` `:15` | — | `FIELD_IDS` (`reason`), `CancelField`, `FIELD_ORDER`, `validate()` | M-R1, M-R2, O-R6 |
| after `blockers` `:76-77` | — | `fieldErrors`, `blocked`, `focusFirstError`, `changeReason` | M-R3, M-R5 |
| `openPreview` `:82-83` | — | `fieldErrors.setErrors({})` | O-R6 |
| `submitCancellation` `:99-105` | `if (reason.trim().length < 5) { setError(labels.reasonTooShort); reasonRef.current?.focus(); return }` | `if (blocked) return` / `setError(null)` / `setErrors(validate({ reason }))` / `if (focusFirstError()) return` | O-R6, O-R7 |
| `:114` | — | the refusal line of M-R4 after the blockers line | M-R4 |
| blockers Notice `:152` | — | `id="transaction-cancel-blockers"` after `title` | O-R7 |
| reason `:157-158` | `<Field label={labels.reasonLabel} className="mt-4">`; `onChange={(event) => setReason(…)}` | one prop per line with `id` and `error` (O-R6's sentence); `onChange` calls `changeReason` | O-R6 |
| confirm `:165` | `disabled={loading \|\| blockers.length > 0}` | `disabled={loading} aria-disabled={blocked \|\| undefined} aria-describedby={blocked ? "transaction-cancel-blockers" : undefined}` | O-R7 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-o.test.ts`:

```ts

test("transaction cancel dialog: the reason's error under the field instead of the dialog Notice, and a blocked confirm says why and stays focusable (v-track O6)", () => {
  const source = read(`${C}asset-operations/transaction-cancel-dialog.tsx`)
  assertOperationForm(source, { ids: { reason: "transaction-cancel-reason" }, noValidate: false })
  assert.ok(validateBody(source).includes('check("reason", required(values.reason) ?? minLength(values.reason, 5) ?? maxLength(values.reason, 2000))'))
  assert.doesNotMatch(source, /<form\b/, "a textarea and a button: no <form> to submit (O-R6)")
  assert.doesNotMatch(source, /setError\(labels\.reasonTooShort\)|reason\.trim\(\)\.length < 5/)
  // Empty and too short read the dialog's own sentence; any other code from the server reads the shared one.
  assert.ok(source.includes('error={fieldErrors.errors.reason === "required" || fieldErrors.errors.reason === "tooShort" ? labels.reasonTooShort : fieldErrors.message("reason")}'))
  assert.match(source, /function changeReason\(value: string\) \{\n\s+setReason\(value\)\n\s+fieldErrors\.clear\("reason"\)\n/)
  // A blocked cancellation keeps its gate (a prerequisite, spec §4.4): aria-disabled, tied to the blockers it lists.
  assert.match(source, /if \(blocked\) return\n/)
  assert.ok(source.includes('<Button variant="destructive" busy={saving} disabled={loading} aria-disabled={blocked || undefined} aria-describedby={blocked ? "transaction-cancel-blockers" : undefined} onClick={() => void submitCancellation()}>'))
  assert.match(source, /<Notice tone="warning" role="status" title=\{labels\.blockedTitle\} id="transaction-cancel-blockers" className="mt-4">/)
  // Each opening starts without the last opening's errors.
  assert.match(source, /setBlockers\(\[\]\)\n\s+fieldErrors\.setErrors\(\{\}\)/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-o.test.ts`. Expected to fail: "transaction cancel dialog: the reason's error under the field instead of the dialog Notice, and a blocked confirm says why and stays focusable (v-track O6)" (`The input did not match the regular expression /import \{ useFieldErrors…`). After Step 3 and before Step 4, `node --test tests/asset-transaction-cancellation-ui.test.ts tests/operations-sweep-ui.test.ts` fails "cancel dialog previews blockers and preserves the required reason", "the transaction cancel dialog uses the dialog parts, a shared reason field and a busy destructive confirm (2C batch 4)" and "review focus 3: a blocked cancellation keeps its confirm and reason disabled, and the warning Notice says why (plan 2D-4)"; Step 4 is their edit.
- [ ] **Step 3: Implement.** The exact edits, in `src/components/asset-operations/transaction-cancel-dialog.tsx` (a comment there must not contain the text `<form`: the test's `doesNotMatch` reads comments too):

**`src/components/asset-operations/transaction-cancel-dialog.tsx`, edit 1 of 9.** Old:
```tsx
import { Textarea } from "@/components/ui/textarea"
import { formatCount } from "@/lib/display-format"
```
New:
```tsx
import { Textarea } from "@/components/ui/textarea"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { formatCount } from "@/lib/display-format"
import { maxLength, minLength, required } from "@/lib/validation-rules"
```

**`src/components/asset-operations/transaction-cancel-dialog.tsx`, edit 2 of 9.** Old:
```tsx
type TransactionType = "checkout" | "checkin" | "transfer"
```
New:
```tsx
type TransactionType = "checkout" | "checkin" | "transfer"

// The one field, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1). The confirm button
// submits, as before: the one field is a textarea, where Enter is a new line, so a form element would add nothing (O-R6).
const FIELD_IDS = {
  reason: "transaction-cancel-reason",
} as const
type CancelField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as CancelField[]

// The server's 5 to 2000 characters (the textarea carries maxLength); the minimum was a check whose message sat in the
// dialog's Notice (v-track M-R2).
function validate(values: { reason: string }): Partial<Record<CancelField, string>> {
  const errors: Partial<Record<CancelField, string>> = {}
  const check = (key: CancelField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("reason", required(values.reason) ?? minLength(values.reason, 5) ?? maxLength(values.reason, 2000))
  return errors
}
```

**`src/components/asset-operations/transaction-cancel-dialog.tsx`, edit 3 of 9.** Old:
```tsx
  const [blockers, setBlockers] = useState<string[]>([])
  const endpoint = `/api/asset-${type}s/${transactionId}`
```
New:
```tsx
  const [blockers, setBlockers] = useState<string[]>([])
  const fieldErrors = useFieldErrors<CancelField>()
  const blocked = blockers.length > 0
  const endpoint = `/api/asset-${type}s/${transactionId}`
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  function changeReason(value: string) {
    setReason(value)
    fieldErrors.clear("reason")
  }
```

**`src/components/asset-operations/transaction-cancel-dialog.tsx`, edit 4 of 9.** Old:
```tsx
    setError(null)
    setBlockers([])
    try {
```
New:
```tsx
    setError(null)
    setBlockers([])
    fieldErrors.setErrors({})
    try {
```

**`src/components/asset-operations/transaction-cancel-dialog.tsx`, edit 5 of 9.** Old:
```tsx
  async function submitCancellation() {
    if (reason.trim().length < 5) {
      setError(labels.reasonTooShort)
      reasonRef.current?.focus()
      return
    }
    setSaving(true)
    setError(null)
```
New:
```tsx
  async function submitCancellation() {
    // A blocked cancellation keeps its gate; the blockers beside the reason say why (spec §4.4).
    if (blocked) return
    setError(null)
    fieldErrors.setErrors(validate({ reason }))
    if (focusFirstError()) return
    setSaving(true)
```

**`src/components/asset-operations/transaction-cancel-dialog.tsx`, edit 6 of 9.** Old:
```tsx
        if (payload?.status === "blocked") setBlockers(Array.isArray(payload.reasons) ? payload.reasons : [])
```
New:
```tsx
        if (payload?.status === "blocked") setBlockers(Array.isArray(payload.reasons) ? payload.reasons : [])
        // A refusal that names the reason shows under it; any other keeps the dialog's Notice (spec §4.1).
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
```

**`src/components/asset-operations/transaction-cancel-dialog.tsx`, edit 7 of 9.** Old:
```tsx
                <Notice tone="warning" role="status" title={labels.blockedTitle} className="mt-4">
```
New:
```tsx
                <Notice tone="warning" role="status" title={labels.blockedTitle} id="transaction-cancel-blockers" className="mt-4">
```

**`src/components/asset-operations/transaction-cancel-dialog.tsx`, edit 8 of 9.** Old:
```tsx
              <Field label={labels.reasonLabel} className="mt-4">
                <Textarea ref={reasonRef} value={reason} onChange={(event) => setReason(event.target.value)} disabled={saving || blockers.length > 0}
```
New:
```tsx
              <Field
                label={labels.reasonLabel}
                id="transaction-cancel-reason"
                className="mt-4"
                error={fieldErrors.errors.reason === "required" || fieldErrors.errors.reason === "tooShort" ? labels.reasonTooShort : fieldErrors.message("reason")}
              >
                <Textarea ref={reasonRef} value={reason} onChange={(event) => changeReason(event.target.value)} disabled={saving || blockers.length > 0}
```

**`src/components/asset-operations/transaction-cancel-dialog.tsx`, edit 9 of 9.** Old:
```tsx
          <Button variant="destructive" busy={saving} disabled={loading || blockers.length > 0} onClick={() => void submitCancellation()}>
```
New:
```tsx
          <Button variant="destructive" busy={saving} disabled={loading} aria-disabled={blocked || undefined} aria-describedby={blocked ? "transaction-cancel-blockers" : undefined} onClick={() => void submitCancellation()}>
```


- [ ] **Step 4: Pin and guard edits** (the button edit is the same in both test files):

**`tests/asset-transaction-cancellation-ui.test.ts`, edit 1 of 3.** Old:
```ts
  assert.match(source, /reason\.trim\(\)\.length < 5/)
```
New:
```ts
  assert.match(source, /minLength\(values\.reason, 5\)/)
```

**`tests/asset-transaction-cancellation-ui.test.ts`, edit 2 of 3.** Old:
```ts
  assert.match(source, /<Field label=\{labels\.reasonLabel\} className="mt-4">\n\s+<Textarea ref=\{reasonRef\}
```
New:
```ts
  assert.match(source, /<Field\n\s+label=\{labels\.reasonLabel\}\n\s+id="transaction-cancel-reason"\n\s+className="mt-4"\n[^\n]*\n\s+>\n\s+<Textarea ref=\{reasonRef\}
```

**`tests/asset-transaction-cancellation-ui.test.ts`, edit 3 of 3.** Old:
```ts
busy=\{saving\} disabled=\{loading \|\| blockers\.length > 0\} onClick
```
New:
```ts
busy=\{saving\} disabled=\{loading\} aria-disabled=\{blocked \|\| undefined\} aria-describedby=\{blocked \? "transaction-cancel-blockers" : undefined\} onClick
```

**`tests/operations-sweep-ui.test.ts`, edit 1 of 1.** Old:
```ts
busy=\{saving\} disabled=\{loading \|\| blockers\.length > 0\} onClick
```
New:
```ts
busy=\{saving\} disabled=\{loading\} aria-disabled=\{blocked \|\| undefined\} aria-describedby=\{blocked \? "transaction-cancel-blockers" : undefined\} onClick
```

**`tests/validation-guards.test.ts`, edit 1 of 1.** Old:
```ts
const V_FORMS: readonly string[] = [
```
New:
```ts
const V_FORMS: readonly string[] = [
  `${C}asset-operations/transaction-cancel-dialog.tsx`,
```


- [ ] **Step 5: Verify.** `node --test tests/v-track2-o.test.ts tests/asset-transaction-cancellation-ui.test.ts tests/operations-sweep-ui.test.ts tests/validation-guards.test.ts tests/form-migration-guards.test.ts tests/dropdown-menus-ui.test.ts tests/assets-sweep-ui.test.ts tests/accessible-dialog.test.ts tests/ui-overlay-guards.test.ts` (0 fail); `npm test` (+1; 2269 tests, 2268 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint` (0 errors, 146 warnings, all under `.agents/`). eol: transaction-cancel-dialog `208 208`, `asset-transaction-cancellation-ui.test.ts` `75 75`, `operations-sweep-ui.test.ts` `0 110`, `v-track2-o.test.ts` `0 270`.
- [ ] **Step 6: Commit.** `git add src/components/asset-operations/transaction-cancel-dialog.tsx tests/asset-transaction-cancellation-ui.test.ts tests/operations-sweep-ui.test.ts tests/validation-guards.test.ts tests/v-track2-o.test.ts`, then `git commit -m "feat(operations): the transaction cancel dialog shows the reason's error under the field, and a blocked confirm says why (v-track plan 2 task 13, O6)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Rehearsal record (area O)

Clone `<temp>/sim-O2` of the real checkout at `e1caa29` (`git clone --no-hardlinks D:/Antigravity/asset-system`, read only; `core.autocrlf=true`, so the working tree came out CRLF everywhere: the five files the real checkout holds as `w/lf` and this area reads or edits — `tests/asset-handover-checkin.test.ts`, `asset-handover-checkout.test.ts`, `assets-sweep-ui.test.ts`, `file-evidence-ui.test.ts`, `operations-sweep-ui.test.ts` — were set back to LF first, no content change), its own copy of `node_modules`, branch `o-replay`. Each task ran as written: its Step 1 block appended from the text, Step 2 run, the Step 3 edits applied by an exact-once script (`<temp>/o-tools/o<N>-src.mjs`, the source of the edits printed above), the messages through `scripts/messages-edit.mjs`, the "before Step 4" run, the Step 4 edits (`o<N>-pins.mjs`), then the full checks and one commit (`<temp>/o-tools/replay.sh`, log `replay2.log`).

| Task | Commit | Step 2 failed with | Before Step 4 failing | `npm test` after (tests / pass / fail / skipped) | `tsc` · lint |
|---|---|---|---|---|---|
| O1 | `87269f4` | `SyntaxError` … no export named `waitForDialogToClose` | — | 2257 / 2256 / 0 / 1 | clean · clean |
| O2 | `3a2f9de` | O2's test, "noValidate directly after onSubmit" | 3, as Step 2 lists | 2258 / 2257 / 0 / 1 | clean · clean |
| O3 | `bd90d0a` | O3's test, the `useFieldErrors` import | 3, as Step 2 lists | 2259 / 2258 / 0 / 1 | clean · clean |
| O4 | `f696a3a` | O4's test, "noValidate directly after onSubmit" | 2, as Step 2 lists | 2260 / 2259 / 0 / 1 | clean · clean |
| O5 | `cb00a19` | O5's test, "noValidate directly after onSubmit" | 2, as Step 2 lists | 2261 / 2260 / 0 / 1 | clean · clean |
| O6 | `139d08e` | O6's test, the `useFieldErrors` import | 3, as Step 2 lists | 2262 / 2261 / 0 / 1 | clean · clean |

`npx eslint` on each task's files: clean (the two `messages/*.json` paths only print eslint's "File ignored because no matching configuration was supplied", which is not a lint warning of `npm run lint`); full `npm run lint` after O6: 0 errors, 146 warnings (the baseline, all under `.agents/`). Messages 4092 → 4091 → 4088 → 4087 leaf keys per locale. End state: `V_FORMS` 20 files (plan 1's 15 + 5); `SELECT_STAR_ONLY` 6 rows, 7 selects (`audit-scan-check-form`, `disposal-batch-form`, `disposal-execution-button`, `disposal-request-form`, `maintenance-plan-form` 1 each, `repair-record-form` 2); FMG `STAR_ONLY` holds the asset form's two entries; every task file kept its line endings (the eol numbers in each Step 5).

What the rehearsal changed in this text:
- **O-R1:** the first draft focused the field from the refusal branch and pointed `AccessibleDialog`'s `returnFocusRef` at it. Reading `accessible-dialog.tsx` and Radix showed the field would take focus inside the 200 ms exit animation, while the page behind is still `aria-hidden` and the trap pulls focus back; `waitForDialogToClose` (O1) replaced it, and `OperationReviewDialog` no longer changes.
- **O-R2:** the first draft read the handover codes through `fieldErrors.message`, which resolves them to `apiErrors.*` ("แบบการส่งมอบ", "วันครบกำหนดคืน") beside fields labelled "ลักษณะการส่งมอบ" and "กำหนดคืน"; `errorText` and `HANDOVER_MESSAGE_KEYS` now read the checkout form's own pinned sentences.
- **O-R9:** deleting the transfer and bulk-move rows of `SELECT_STAR_ONLY` by their text alone failed ("expected 1 occurrence, found 2"): `V_SCOPE` holds the same line. Every `SELECT_STAR_ONLY` delete now names its list.
- **O1:** `assert.deepEqual(order, [])` narrowed `order` to `never[]` for `tsc`; the block checks `order.length`.
- **O6:** a first comment named a form element in angle brackets and tripped the test's `doesNotMatch(/<form\b/)`; the comment says "a form element".
- **Rehearsal environment:** a first chain in a clone of the shared `v-sim` (branch `o-dry`) passed every task with the first-draft texts, but its object store lost objects mid-run (packs without their `.idx`, `Error building trees` on commit), so the final chain ran in a fresh clone of the real checkout. Both chains print the same Step 2 and pin failures.

### Open issues (area O)

Area O's open issue O-a is open issue 5 at the end of the plan (P-R9).

### Behaviour changes a person would notice beyond the spec (area O)

- Transfer: a missing asset now says "required" under the asset, not "choose a destination" in a toast; "at least one destination" shows under the location select.
- Checkout: the handover messages that were toasts now sit under the handover group and the due date, in the same words.
- The cancel dialog's confirm, when the transaction is blocked, can take focus and reads the blockers as its description; it still does nothing when pressed.
- Checkin: the return date is required by the form (it always was by the server).

---

## Area U: the audit forms show their errors under the field, and the audit gates say why they wait (Tasks 14–19, U1–U6)

Spec `docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md` (approved 2026-10-17) §2 U1, U2, U4, U6; §3 G1–G3, G5 and the anti-goals and non-goals (offline-queued scans); §4.1 (on submit), §4.2 (the mobile sheet), §4.3 (clearing, the date pair), §4.4 (content rules and prerequisites: "no assets selected for a batch", "evidence not uploaded", "a required photo not taken"), §4.5 (`noValidate`); §5 forms #14–#22; §7.1–§7.4 (as used, not built; §7.4's audit round pair); §11 calls 1, 2, 7. Area U runs on plan 1's foundation (FIXED INTERFACES 3–7 as amended, F-R1–F-R10, M-R1–M-R14) and changes no server file: the one server rule it meets, the round's `endBeforeStart` (`src/lib/validations/audit.ts:33-41`, path `endDate`), already comes back as `fieldErrors.endDate` since plan 1's S2.

What this area does, in one line each:
- **U1** the audit round form (#14): `noValidate`, a table and `validate()` for name, year, the date pair, status, risk preset and sample rate; the date pair limits its pickers (`max`/`min`, spec §7.4) and clears together; save and preview put the server's refusal (the round's `endBeforeStart`) under the field.
- **U2** the round cancel dialog (#15): its one validation toast becomes the error under the reason, with the toast's own text.
- **U3** mark not found (#16) and the scan's component-missing dialog (#22): the V-track form pattern on two dialogs that have no rule to restate (U-R6).
- **U4** the finding row's three dialogs (#17–#19): the decision and the close become `<form>`s; the action plan restates its rules; closing waits for evidence with a visible reason (`aria-disabled`, U-R9).
- **U5** batch review (#20): approve and reject stay focusable with nothing selected and say why; `ConfirmTextDialog`'s form takes `noValidate`.
- **U6** the scan check (#21): the location's star gets its rule and its error (SELECT_STAR_ONLY −1), focus stays inside the phone sheet, a missing photo keeps save focusable with its reason; the workspace and its offline queue do not change.

Nothing else changes: no server file, no migration, no new dependency, no new shared API (U-R3 keeps its one helper local), no `EXEMPT` row, no `CONSTRAINT_FLOORS` change (every `required` / `maxLength` stays; none is added), no FMG `STAR_ONLY` change (none of its three entries is an audit file), no DESIGN.md change. Messages: +2 (`auditFinding.closeNeedsEvidence` U4, `auditFinding.batchNeedsSelection` U5).

Line numbers are of `e1caa29` (plan 1 merged; no plan-1 task touched an audit file except `audit-scan-check-field.tsx`, F6). Find every site by its quoted text: other areas of this plan touch none of these source files, but they append to the same shared files (below).

**Shared files and order (U-R12).** Other areas run before or after this one in the same plan and append to `tests/validation-guards.test.ts` (`V_FORMS`, `SELECT_STAR_ONLY`) and `messages/*.json`. Every edit of area U to those files is a text anchor that holds whatever was appended before it:
- a `V_FORMS` row is inserted directly before the list's closing `]`, anchored on that `]` and the comment line that follows it (old, three lines: `]` / empty / `// Required selects (SearchableSelect and its two wrappers) with no error=: an asterisk that nothing checks (spec §5).` → new: the row(s), then the same three lines); rows end up in task order after whatever rows were already there;
- U6 deletes its `SELECT_STAR_ONLY` row by its own text **inside** the block that starts `const SELECT_STAR_ONLY: Readonly<Record<string, number>> = {` (the same text is also `V_SCOPE`'s row, which stays), whatever rows around it are already gone;
- messages go through `node scripts/messages-edit.mjs` change files with `set` only, keys only area U writes.
- `tests/v-track2-u.test.ts` is area U's own file (U1 creates it, U2–U6 append); it imports no other test file and defines its own helpers.

**Area rehearsal** (2026-10-18). Clone `<temp>/sim-U` of `v-sim` at tag `v2-base` (= `e1caa29`, `core.autocrlf=true`, its own copy of `node_modules`), branch `u-dry`; the two files that are LF in the real checkout and that the area or its verify reads as LF (`tests/audit-pages-sweep-ui.test.ts`, `tests/file-evidence-ui.test.ts`) set back to LF first (no content change). U1–U6 ran in order, one commit each, every step as written: `9507faef` · `60dd57b3` · `caceaae1` · `053148ed` · `7a584979` · `080a0a3b`. Every Step 2 failed with the message it names; every "after Step 3 and before Step 4" list failed exactly as listed (replayed per commit with the parent's pin and guard files); every task ended with `npm test` 0 fail and 1 skipped (2257 … 2262 on `e1caa29`, +1 per task), `npx tsc --noEmit` clean, `npm run lint` 0 errors and 146 warnings (all under `.agents/`), and every edited file kept its working-tree line endings. Messages 4092 → 4094 per locale. `V_FORMS` 15 → 22 files; `<form … noValidate>` in `src` 17 → 25; `SELECT_STAR_ONLY` 14 selects in 10 files → 13 in 9. What the rehearsal changed in this text is at the end of the area.

### Inventory (U at `e1caa29`)

| # | Form · file | Submit · `<form>` | Today (validation · server errors) | Decision | Task |
|---|---|---|---|---|---|
| 14 | audit round `c/audit/audit-round-form.tsx` | `handleSubmit :123` · `:147`; preview `handlePreview :105` (button `:194`) | native `required` ×7 (5 `Input`, status `Select` `:160` and its `NativeSelect` `:305`), `maxLength={200}` `:149`, year `min`/`max` `:152` (display year, `displayYearRange`), sample rate `min={1} max={100}` `:184-185`; **the date pair `:155`/`:158` has no `min`/`max`**; local `Select` helper `:302-310` passes no id or error · save `throw … :133` → `apiError.toast :138`; preview `:114` → `:117`. Server `auditRoundSchema` (`validations/audit.ts:14-41`): name 1–200, year int 2000–2100, sample rate int 1–100, enums, `endDate < startDate` → `endBeforeStart` on `endDate`; the preview route (`api/audit-rounds/preview/route.ts:13-16`) parses the same schema with an empty name filled in | the table, `validate()`, the pair (U-R1), preview's refusal under the field (U-R2), whole numbers (U-R3), the helper's id/error (U-R4) | U1 |
| 15 | round cancel `c/audit/audit-round-cancel-button.tsx` | `handleSubmit :48` · `:91` | native `required` `:111`; **validation toast** `toast.error(t("cancelReasonRequired"))` `:52`; `useId` reason id `:37`/`:106`; no `maxLength` (server `max(4000)`, `validations/audit.ts:63-65`) · `:64` → `apiError.toast :70` | error under the reason with the toast's text; the server's limit restated (U-R7) | U2 |
| 16 | mark not found `c/audit/audit-mark-not-found-button.tsx` | `handleSubmit :66` · `:123` | none: optional remark (`useId` `:44`/`:127`), optional photo `FileDropzone :137` · `:80` → `apiError.toast :85`. Server: `auditMarkNotFoundSchema` (remark optional text, no limit); the photo's file checks throw plain errors (`src/lib/uploads.ts:58-83`) | the pattern with a `validate()` that names no rule (U-R6) | U3 |
| 22 | component missing `c/audit/audit-scan-component-missing-dialog.tsx` | `submit :36` · `:52` | none (empty remark → the default remark `:38`) · the workspace sends it, `apiError.toast` (`audit-scan-workspace.tsx:633`) | the same; no hand-back (U-R5) | U3 |
| 17 | ReviewDecisionModal `c/audit/audit-finding-review-actions.tsx:237` | `submit :260` (no `<form>`, button `:304`) → the row's `review :95` | the remark's `maxLength={4000}` `:299` · 409 conflict → Notice `:286-296`; other refusals `apiError.toast :113` in `review` | a `<form>`; `validate()` restates the `maxLength`; no hand-back (U-R5, U-R8) | U4 |
| 18 | ActionPlanModal `:313` | `handleSubmit :344` · `:373` | native `required` `:378`, `maxLength={4000}` `:380`; owner `SearchableSelect :386` optional; due date `:395`, status `:403` · `:360` → `apiError.toast :365`. Server `auditFindingActionPlanSchema` (`validations/audit.ts:78-83`): plan 1–4000, optional date, status enum | the table (plan, due date, status), `validate()`, `setField` (U-R8) | U4 |
| 19 | CloseFindingModal `:428` | `closeFinding :470` (no `<form>`, button `:510`) | **gate** `disabled={uploadedCount === 0}` `:510`, the count line `:503` not tied; remark `maxLength={4000}` `:505` · `:479` → `apiError.toast :484`; upload on pick `:449-468` (not a form step) | a `<form>`; the evidence gate keeps `aria-disabled` and says why (U-R9) | U4 |
| 20 | batch review `c/audit/audit-findings-batch-actions.tsx`, form `c/ui/confirm-text-dialog.tsx:77` | `reviewSelected :44` via `onConfirm :129`; silent return `:40` | **gates** `disabled={selectedCount === 0 \|\| …}` `:83`, `:93`, no reason shown; the remark has no rule (server optional, no limit) · `apiError.toast :61` | `aria-disabled` and a reason line beside the buttons (U-R10); `noValidate` on the shared dialog's form; `validate()` names no rule (U-R6) | U5 |
| 21 | scan check `c/audit/audit-scan-check-form.tsx` (no `<form>`; aside on desktop, Sheet on mobile `audit-scan-check-panel.tsx:58-77`) | `save :223` → workspace `submitCheck :502` | location star only: `fieldConfig :257` `required: true` → `AuditScanCheckField :271-283` (no `id`, no `error`; SELECT_STAR_ONLY 1); **gate** `disabled={disabled \|\| missingPhoto}` `:407`, the photo Notice `:392-396` not tied · the workspace: `apiError.toast :536`, offline queue `:523-528` | `validate()` for the location, its id and error, focus inside the sheet, the photo gate `aria-disabled` tied to the Notice (U-R11); the workspace unchanged | U6 |

Not in area U: `audit-round-close-button.tsx` (a confirm with no field, recon "left out"), `audit-pending-row-actions.tsx` (opens #16), the scan search (`role="search"`), the workspace's own toasts (`componentOutOfRound` `:585`, `:642`, `:775`: prerequisite toasts outside a form; the offline-queue `toast.warning` `:499`: not a validation), and every non-audit form.

### Interfaces with plan 1 and the other areas

| # | From | What area U uses | Where |
|---|---|---|---|
| 1 | plan 1 F4 | `useFieldErrors<K>(options?: { params })`, `useValidationMessage()` (`@/components/ui/use-field-errors`), the contract of M-R3/F-R4 (`setErrors` and `applyServer` take effect at once for `focusFirst`; `focusFirst(order, { idFor, reveal })`) | every task; `params` in U2, `reveal` in U6 |
| 2 | plan 1 F1 | `required`, `maxLength`, `range`, `notBefore` (`@/lib/validation-rules`), `null` for an empty value except `required` | U1, U2, U4, U6 |
| 3 | plan 1 F2 | `common.validation.*` (`outOfRange {min} {max}`, `tooLong {max}`, `invalidNumber`, `endBeforeStart` "ต้องไม่ก่อน") | U1, U2 |
| 4 | plan 1 F3 | `focusField`: inside `<main data-dashboard-main>` it scrolls `main`; outside (dialogs, the phone sheet: portals) the browser's own scroll on focus | U2–U6 (dialogs), U6 (`reveal` for the desktop aside, U-R11) |
| 5 | plan 1 F6 | `AuditScanCheckField` takes `id` and `error` and passes both to `SearchableSelect` (`data-invalid`, the error under the select) | U6 |
| 6 | plan 1 F8 | `V_FORMS`, `SELECT_STAR_ONLY`, V1–V5; `V_SCOPE` already counts 3 forms for `audit-finding-review-actions.tsx` and 1 for `audit-findings-batch-actions.tsx`; `ui/confirm-text-dialog.tsx` is `NOT_IN_SCOPE` | every task, Step 4 |
| 7 | plan 1 S2 | 400 `{ error, code: "VALIDATION_FAILED", fieldErrors }`; the round's `endBeforeStart` under `endDate` | U1, U2, U3, U4 |
| 8 | plan 1 M-R1–M-R5, M-R10, M-R12 | the table, `validate()`, the submit sequence, `Field` markup, the prerequisite gate (`aria-disabled` plus a visible reason), button-only forms become `<form>`s | every task |
| 9 | the other areas of plan 2 | `V_FORMS` and `SELECT_STAR_ONLY` rows, messages: text anchors only (U-R12) | Step 4 of every task |

Rulings: R4 of "Rulings of this plan" (U-R*).

### Review notes (area U)

1. **A gate that hides its reason from keyboard users (U4–U6).** `aria-disabled` keeps the button focusable; a `disabled` attribute would drop it from the Tab order and its `aria-describedby` would never be read. Each test pins the `aria-disabled`/`aria-describedby` pair and the gate's early `return` (pointer events are off, Enter and Space are not).
2. **The date pair refuses what the server accepts, or the reverse (U1).** `notBefore` refuses only `end < start` (same day fine), like `audit.ts`; `min`/`max` limit the pickers; U1's test pins both and the pair clearing.
3. **Focus that lands outside the visible part of the scan check (U6).** The desktop aside scrolls by itself inside `main`; the `reveal` step is pinned. Task 30-style dev-app check: the check at 1440 (aside) and 375 (sheet), with the location emptied through the console (the select hides its clear button) and with the photo gate.
4. **A server refusal that disappears (U1–U4).** Every form that sends its own request writes `if (fieldErrors.applyServer(payload) && focusFirstError()) return` before today's `throw`, so a body that names no shown field keeps its toast (spec §4.1.3); the three that do not send their own request keep the parent's toast (U-R5).

---

### Task 14 (U1): The audit round form shows its errors under the field, and the date pair limits its pickers (`c/audit/audit-round-form.tsx`)

Spec §4.1, §4.3, §4.5, §5 #14, §7.4 (the audit round pair); M-R1–M-R5; U-R1–U-R4.

**Files:**
- Modify: `src/components/audit/audit-round-form.tsx` (`i/lf w/crlf`)
- Pins: `tests/audit-round-form-ui.test.ts` (`i/lf w/crlf`), `tests/audit-pages-sweep-ui.test.ts` (`i/lf w/lf`)
- Guard: `tests/validation-guards.test.ts` (`i/lf w/crlf`; `V_FORMS` only)
- Test: `tests/v-track2-u.test.ts` (new, LF)

**Changes at e1caa29:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| imports `:19`, `:23` | `import { useApiError } from "@/components/ui/use-api-error"`; `import { cn } from "@/lib/utils"` | add after the first `import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"`; after the second `import { maxLength, notBefore, range, required } from "@/lib/validation-rules"` | M-R3 |
| after `const riskPresetValues … :53` | — | a blank line, then: the comment `// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1). The scope` / `// selects send optional ids the server never refuses, so they stay out.`; `const FIELD_IDS = {` with the seven rows of the Step 1 test, in that order, `} as const`; `type AuditRoundField = keyof typeof FIELD_IDS`; `const FIELD_ORDER = Object.keys(FIELD_IDS) as AuditRoundField[]`; a blank line; the comment `// A number field's step is 1 unless it says otherwise, and the browser checked it before noValidate; the server's year` / `// and sample rate are whole numbers too (v-track U-R3).` and `function wholeNumber(value: string) {` / `  return Number.isInteger(Number(value.trim())) ? null : "invalidNumber"` / `}`; a blank line; the comment `// noValidate turns the browser's check off, so this restates the controls' required, maxLength, min, max and step, and` / `// the end date not before the start date, the server's endBeforeStart (spec §7.4; v-track M-R2, U-R1).`, then `validate` with the signature and the six `check(…)` lines of the Step 1 test (plan 1 M1's `errors` / `check` shape) | M-R1, M-R2, U-R3 |
| after `const [preview, setPreview] … :64` | — | `const fieldErrors = useFieldErrors<AuditRoundField>()` and `const validationMessage = useValidationMessage()` | M-R3 |
| after `const componentItems = … :84` | — | `const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })` | M-R4 |
| `setField :91-94` | `setValues((current) => ({ ...current, [field]: value }))` | after it: `// The date pair clears together: either date can fix "end before start" (spec §4.3).` / `if (field === "startDate" \|\| field === "endDate") fieldErrors.clear("startDate", "endDate")` / `else if (field in FIELD_IDS) fieldErrors.clear(field as AuditRoundField)` | M-R5, U-R1 |
| `handlePreview :114` | `if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))` | `if (!response.ok) {` / `// The preview sends the round's body: a refusal that names a field shows under it, like save's (v-track U-R2).` / `if (fieldErrors.applyServer(payload) && focusFirstError()) return` / `throw new Error(payload?.error ?? tCommon("error"))` / `}` | U-R2 |
| `handleSubmit :124-125` | `event.preventDefault()` / `setSaving(true)` | `event.preventDefault()` / `fieldErrors.setErrors(validate(values, yearRange))` / `if (focusFirstError()) return` / `setSaving(true)` | M-R4 |
| `handleSubmit :133` | `if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))` | `if (!response.ok) {` / `// A refusal that names a field of this form shows under it; any other keeps the toast (spec §4.1).` / `if (fieldErrors.applyServer(payload) && focusFirstError()) return` / `throw …` (as today) / `}` | M-R4 |
| `<form>` `:147` | `<form onSubmit={handleSubmit} className={cn(getPanelClasses(), "grid grid-cols-1 gap-5 p-4 sm:p-5 md:grid-cols-2")}>` | `<form onSubmit={handleSubmit} noValidate className={…as today…}>` | FIXED 6 |
| `:148` | `<Field label={t("name")} required>` | `<Field label={t("name")} id="audit-round-name" required error={fieldErrors.message("name")}>` | M-R5 |
| `:151` | `<Field label={t("auditYear")} required>` | one prop per line: `<Field` / `label={t("auditYear")}` / `id="audit-round-year"` / `required` / `error={fieldErrors.errors.auditYear ? validationMessage(fieldErrors.errors.auditYear, yearRange) : undefined}` / `>`; the `Input` line `:152` stays as it is (`html-lang-and-years.test.ts` pins its `min={yearRange.min} max={yearRange.max}`) | M-R4, U-R4 |
| `:154-159` | the start and end `Field`s and their `Input`s | the JSX comment `{/* The pair limits each other's picker (spec §7.4), as the disposal list's date filter does. */}` above; `<Field label={t("startDate")} id="audit-round-start-date" required error={fieldErrors.message("startDate")}>` with its `Input` ending `required max={values.endDate} />`; `<Field label={t("endDate")} id="audit-round-end-date" required error={fieldErrors.message("endDate")}>` with its `Input` ending `required min={values.startDate} />` | U-R1 |
| `:160` | `<Select label={t("status")} value={values.status} required onChange={(value) => setField("status", value)}>` | `<Select label={t("status")} id="audit-round-status" value={values.status} required error={fieldErrors.message("status")} onChange={(value) => setField("status", value)}>` | U-R4 |
| `:171` | `<Select label={t("riskPreset")} value={values.riskPreset} onChange=…>` | `<Select label={t("riskPreset")} id="audit-round-risk-preset" value={values.riskPreset} error={fieldErrors.message("riskPreset")} onChange=…>` | U-R4 |
| `:178` | `<Field label={t("sampleRate")} required hint={t("sampleRateHelp")}>` | one prop per line: `<Field` / `label={t("sampleRate")}` / `id="audit-round-sample-rate"` / `required` / `hint={t("sampleRateHelp")}` / `error={fieldErrors.errors.sampleRate ? validationMessage(fieldErrors.errors.sampleRate, { min: 1, max: 100 }) : undefined}` / `>` | M-R4 |
| `Select` helper `:302-304` | `function Select({ label, value, required, onChange, children }: { label: string; value: string; required?: boolean; onChange: (value: string) => void; children: React.ReactNode }) {` / `return (` / `<Field label={label} required={required}>` | the props one per line, `id` after `label` and `error` after `required` in both the pattern and the type (`id?: string`, `error?: string`); `<Field label={label} id={id} required={required} error={error}>`; the `NativeSelect` line stays | U-R4 |

The save button `:269` (`busy={saving} disabled={previewing}`) stays: the preview is another action running, not a gate.

- [ ] **Step 1: The failing test.** Create `tests/v-track2-u.test.ts` (LF) with exactly (write it with a file tool):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// V track plan 2, area U: the audit forms show their errors under the field (spec
// docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §4, §5 #14–#22, §7). One test per task, appended in order.
// The working tree is CRLF on Windows: every read strips \r before the multi-line regexes.
const C = "src/components/audit/"
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// The body of the module-level `function validate(`, up to the first line that is only "}".
function validateBody(source: string) {
  const start = source.search(/^function validate\(/m)
  assert.notEqual(start, -1, "a module-level function validate(")
  const end = source.indexOf("\n}\n", start)
  return source.slice(start, end)
}

// The shape every migrated audit form shares (plan 1's M-R1 to M-R4): noValidate straight after onSubmit (unless the
// submit has no <form>), the table of ids in visual order, validate() feeding the hook, focus on the first wrong field,
// each listed key's message under its field, the server's fieldErrors on the same fields (unless the request is sent by
// a parent, U-R5), and no toast for a validation error.
function assertMigratedForm(
  source: string,
  form: { ids: Record<string, string>; handler?: string; messages?: readonly string[]; table?: string; hook?: string; server?: false; formless?: true },
) {
  const handler = form.handler ?? "handleSubmit"
  const table = form.table ?? "FIELD_IDS"
  const hook = form.hook ?? "fieldErrors"
  if (!form.formless) {
    assert.match(source, new RegExp(`<form onSubmit=\\{${handler}\\} noValidate[ >\\n]`), "noValidate directly after onSubmit")
  }
  assert.match(source, /import \{ useFieldErrors(?:, useValidationMessage)? \} from "@\/components\/ui\/use-field-errors"/)
  const block = source.match(new RegExp(`const ${table} = \\{\\n([\\s\\S]*?)\\n\\} as const`))
  assert.ok(block, `const ${table} = { … } as const`)
  const rows = Object.entries(form.ids).map(([key, id]) => `  ${key}: "${id}",`)
  assert.deepEqual(block[1].split("\n"), rows, `${table}: the fields in visual order with their ids`)
  // Each id once: id="…", or the table's own entry inside id={…}.
  for (const [key, id] of Object.entries(form.ids)) {
    const uses = source.match(new RegExp(`\\bid=(?:"${escape(id)}"|\\{${table}\\.${key}\\})`, "g"))
    assert.equal(uses?.length, 1, `id "${id}" once`)
  }
  for (const key of form.messages ?? Object.keys(form.ids)) {
    assert.match(source, new RegExp(`error=\\{${hook}\\.message\\("${escape(key)}"\\)\\}`), `${key}: its error under the field`)
  }
  assert.match(source, new RegExp(`${hook}\\.setErrors\\(validate\\(`), "the client's errors come from validate()")
  if (form.server !== false) {
    assert.match(source, new RegExp(`if \\(${hook}\\.applyServer\\((?:result|payload|body|refusal)\\) && `), "the server's fieldErrors land on the same fields")
  }
  assert.match(source, new RegExp(`${hook}\\.focusFirst\\(`), "focus goes to the first wrong field")
  assert.doesNotMatch(source, /\btoast\.(?:error|warning)\(/, "no validation toast (the catch keeps apiError.toast)")
}

test("audit round: the date pair limits its pickers, validate() restates every rule, and save and preview show the server's refusal under the field (v-track U1)", () => {
  const source = read(`${C}audit-round-form.tsx`)
  assertMigratedForm(source, {
    ids: {
      name: "audit-round-name",
      auditYear: "audit-round-year",
      startDate: "audit-round-start-date",
      endDate: "audit-round-end-date",
      status: "audit-round-status",
      riskPreset: "audit-round-risk-preset",
      sampleRate: "audit-round-sample-rate",
    },
    messages: ["name", "startDate", "endDate", "status", "riskPreset"],
  })
  assert.match(source, /^function validate\(\n\s+values: \{ name: string; auditYear: string; startDate: string; endDate: string; status: string; sampleRate: string \},\n\s+yearRange: \{ min: number; max: number \},\n\): Partial<Record<AuditRoundField, string>> \{$/m)
  const rules = validateBody(source)
  for (const rule of [
    'check("name", required(values.name) ?? maxLength(values.name, 200))',
    'check("auditYear", required(values.auditYear) ?? range(values.auditYear, yearRange.min, yearRange.max) ?? wholeNumber(values.auditYear))',
    'check("startDate", required(values.startDate))',
    'check("endDate", required(values.endDate) ?? notBefore(values.endDate, values.startDate))',
    'check("status", required(values.status))',
    'check("sampleRate", required(values.sampleRate) ?? range(values.sampleRate, 1, 100) ?? wholeNumber(values.sampleRate))',
  ]) assert.ok(rules.includes(rule), rule)
  // The number fields' step of 1, which the browser checked before noValidate (U-R3).
  assert.match(source, /function wholeNumber\(value: string\) \{\n\s+return Number\.isInteger\(Number\(value\.trim\(\)\)\) \? null : "invalidNumber"\n\}/)
  assert.match(source, /fieldErrors\.setErrors\(validate\(values, yearRange\)\)/)
  // The date pair (spec §7.4): each picker is limited by the other date, and changing either clears both errors.
  assert.match(source, /onChange=\{\(event\) => setField\("startDate", event\.target\.value\)\} required max=\{values\.endDate\} \/>/)
  assert.match(source, /onChange=\{\(event\) => setField\("endDate", event\.target\.value\)\} required min=\{values\.startDate\} \/>/)
  assert.match(source, /if \(field === "startDate" \|\| field === "endDate"\) fieldErrors\.clear\("startDate", "endDate"\)\n\s+else if \(field in FIELD_IDS\) fieldErrors\.clear\(field as AuditRoundField\)/)
  // The year and the sample rate say their limits (the year in the reader's calendar).
  assert.ok(source.includes("error={fieldErrors.errors.auditYear ? validationMessage(fieldErrors.errors.auditYear, yearRange) : undefined}"))
  assert.ok(source.includes("error={fieldErrors.errors.sampleRate ? validationMessage(fieldErrors.errors.sampleRate, { min: 1, max: 100 }) : undefined}"))
  // The status and risk selects pass their id and error through the form's Select (U-R4).
  assert.match(source, /<Field label=\{label\} id=\{id\} required=\{required\} error=\{error\}>\n\s+<NativeSelect value=\{value\} required=\{required\}/)
  // Save and preview both put the server's fieldErrors under the fields (the server's endBeforeStart lands on endDate).
  assert.equal(source.match(/if \(fieldErrors\.applyServer\(payload\) && focusFirstError\(\)\) return/g)?.length, 2)
  // The save still waits while the preview runs (that is the busy state of another action, not a gate).
  assert.match(source, /<Button type="submit" busy=\{saving\} disabled=\{previewing\}>/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-u.test.ts`. Expected to fail: "audit round: the date pair limits its pickers, validate() restates every rule, and save and preview show the server's refusal under the field (v-track U1)" (`AssertionError: noValidate directly after onSubmit`). After Step 3 and before Step 4, `node --test tests/audit-round-form-ui.test.ts tests/audit-pages-sweep-ui.test.ts` fails two tests: "the audit round form uses the shared fields, the sample-rate hint and busy preview and save buttons (2C batch 3)" and "audit round form: the form is the panel, the sampling box a quiet grouping, the preview a StatStrip with an info Notice, codes as tag, an EmptyNote and the include-closed choice a ChoiceCard (spec 2D D7, D9, D19, M22, M33)". That is expected; Step 4 is their edit.
- [ ] **Step 3: Implement** per the Changes table (exact string replacement; keep the file's CRLF).
- [ ] **Step 4: Pin and guard edits** (exact old → new; each old string occurs once in its file):
  - `tests/audit-round-form-ui.test.ts:16-20`, old (five lines): `  assert.equal(inputs.filter((tag) => hasJsxAttr(tag.text, "required")).length, 5, "every round field keeps the browser's own required check")` / `  assert.equal(source.match(/<Field label=\{t\("(?:name|auditYear|startDate|endDate)"\)\} required>/g)?.length, 4)` / `  assert.match(source, /<Field label=\{t\("sampleRate"\)\} required hint=\{t\("sampleRateHelp"\)\}>/)` / `  assert.match(source, /<Field label=\{label\} required=\{required\}>\n\s+<NativeSelect value=\{value\} required=\{required\} onChange=\{\(event\) => onChange\(event\.target\.value\)\}>/)` / `  assert.match(source, /<Select label=\{t\("status"\)\} value=\{values\.status\} required onChange=/)` → new (seven lines): `  assert.equal(inputs.filter((tag) => hasJsxAttr(tag.text, "required")).length, 5, "every round field keeps its required attribute (validate() restates it, v-track U1)")` / `  // Each Field names its control and shows its error (v-track plan 2 U1).` / `  assert.equal(source.match(/<Field label=\{t\("(?:name|startDate|endDate)"\)\} id="audit-round-[\w-]+" required error=\{fieldErrors\.message\("\w+"\)\}>/g)?.length, 3)` / `  assert.match(source, /<Field\n\s+label=\{t\("auditYear"\)\}\n\s+id="audit-round-year"\n\s+required\n[^\n]*\n\s+>/)` / `  assert.match(source, /<Field\n\s+label=\{t\("sampleRate"\)\}\n\s+id="audit-round-sample-rate"\n\s+required\n\s+hint=\{t\("sampleRateHelp"\)\}\n[^\n]*\n\s+>/)` / `  assert.match(source, /<Field label=\{label\} id=\{id\} required=\{required\} error=\{error\}>\n\s+<NativeSelect value=\{value\} required=\{required\} onChange=\{\(event\) => onChange\(event\.target\.value\)\}>/)` / `  assert.match(source, /<Select label=\{t\("status"\)\} id="audit-round-status" value=\{values\.status\} required error=\{fieldErrors\.message\("status"\)\} onChange=/)`.
  - `tests/audit-pages-sweep-ui.test.ts:49`, old `  assert.match(source, /<form onSubmit=\{handleSubmit\} className=\{cn\(getPanelClasses\(\), "grid grid-cols-1 gap-5 p-4 sm:p-5 md:grid-cols-2"\)\}>/)` → new `  assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate className=\{cn\(getPanelClasses\(\), "grid grid-cols-1 gap-5 p-4 sm:p-5 md:grid-cols-2"\)\}>/)`.
  - `tests/validation-guards.test.ts`, `V_FORMS` (U-R12): old, three lines, `]` / (empty) / `// Required selects (SearchableSelect and its two wrappers) with no error=: an asterisk that nothing checks (spec §5).` → new, four lines: `` `${C}audit/audit-round-form.tsx`, `` (indented two spaces) / `]` / (empty) / the same comment line.
- [ ] **Step 5: Verify.** `node --test tests/v-track2-u.test.ts tests/audit-round-form-ui.test.ts tests/audit-pages-sweep-ui.test.ts tests/html-lang-and-years.test.ts tests/form-frames-ui.test.ts tests/audit-component-round-routes.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/visual-foundation-guards.test.ts` (93 tests, 0 fail in the rehearsal); `npm test` (+1; 2270 tests, 2269 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint` (0 errors, no new warning in `src/` or `tests/`). `node <tools>/eol.mjs src/components/audit/audit-round-form.tsx tests/audit-round-form-ui.test.ts tests/audit-pages-sweep-ui.test.ts tests/validation-guards.test.ts tests/v-track2-u.test.ts` prints `395 395`, `26 26`, `0 146`, the guard's line count twice (CRLF; 199 on this plan's chain, P-R5) and `0 95`.
- [ ] **Step 6: Commit.** `git add src/components/audit/audit-round-form.tsx tests/audit-round-form-ui.test.ts tests/audit-pages-sweep-ui.test.ts tests/validation-guards.test.ts tests/v-track2-u.test.ts`, then `git commit -m "feat(audit): the audit round form shows its errors under the field, and the date pair limits its pickers (v-track plan 2 task 14, U1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 15 (U2): The round cancel dialog shows a missing reason under the field instead of a toast (`c/audit/audit-round-cancel-button.tsx`)

Spec §2 U2, §4.1, §5 #15 (one of the 38 validation toasts), §7.1 (a form's domain message); M-R1–M-R5; U-R7.

**Files:**
- Modify: `src/components/audit/audit-round-cancel-button.tsx` (`i/lf w/crlf`)
- Pins: `tests/audit-round-cancellation.test.ts` (`i/lf w/crlf`)
- Guard: `tests/validation-guards.test.ts` (`V_FORMS`)
- Test: `tests/v-track2-u.test.ts` (LF)

**Changes at e1caa29:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:3` | `import { useId, useState, type FormEvent } from "react"` | `import { useState, type FormEvent } from "react"` | U-R7 |
| imports `:20-21` | `import { useApiError } …` / `import { formatCount } from "@/lib/display-format"` | `import { useFieldErrors } from "@/components/ui/use-field-errors"` after the first; `import { maxLength, required } from "@/lib/validation-rules"` after the second | M-R3 |
| after the `AuditRoundCancellationImpact` type `:30` | — | a blank line; `// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1).`; `const FIELD_IDS = {` / `  reason: "audit-round-cancel-reason",` / `} as const`; `type CancelField = keyof typeof FIELD_IDS`; `const FIELD_ORDER = Object.keys(FIELD_IDS) as CancelField[]`; `// The reason's limit for its message: the textarea has no maxLength, so a long reason can be typed (v-track U-R7).`; `const FIELD_PARAMS = { reason: { max: 4000 } }`; a blank line; `// noValidate turns the browser's check off, so this restates the control's required and the server's 4,000-character` / `// limit (auditRoundCancelSchema) (v-track M-R2, U-R7).`; `function validate(values: { reason: string }): Partial<Record<CancelField, string>> {` with plan 1 M1's `errors` / `check` shape and the one `check` line of the Step 1 test | M-R1, M-R2, U-R7 |
| `:37` | `const reasonId = useId()` | gone; after `const [saving, setSaving] = useState(false)`: `const fieldErrors = useFieldErrors<CancelField>({ params: FIELD_PARAMS })` and `const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })` | M-R3, U-R7 |
| `closeDialog :42-46` | ends `setReason("")` | the comment `// The next opening starts with no errors.` above the function; `fieldErrors.setErrors({})` after `setReason("")` | U-R7 |
| `handleSubmit :49-54` | `event.preventDefault()` / `const trimmedReason = reason.trim()` / `if (!trimmedReason) {` / `toast.error(t("cancelReasonRequired"))` / `return` / `}` | `event.preventDefault()` / `fieldErrors.setErrors(validate({ reason }))` / `if (focusFirstError()) return` / `const trimmedReason = reason.trim()` (the toast and its `if` go; `toast` stays imported for `toast.success`) | M-R4 |
| `:64` | `if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))` | plan 1 M1's refusal block: `if (!response.ok) {` / `// A refusal that names a field of this form shows under it; any other keeps the toast (spec §4.1).` / `if (fieldErrors.applyServer(payload) && focusFirstError()) return` / `throw …` / `}` | M-R4 |
| `<form>` `:91` | `<form onSubmit={handleSubmit} className={accessibleDialogFormClasses}>` | `<form onSubmit={handleSubmit} noValidate className={accessibleDialogFormClasses}>` | FIXED 6 |
| `:104-108` | `<Field label={t("cancelReason")} required>` / `<Textarea` / `id={reasonId}` / `value={reason}` / `onChange={(event) => setReason(event.target.value)}` | `{/* An empty reason keeps its own message, the one the toast showed before (spec §7.1). */}`; one prop per line: `<Field` / `label={t("cancelReason")}` / `id="audit-round-cancel-reason"` / `required` / `error={fieldErrors.errors.reason === "required" ? t("cancelReasonRequired") : fieldErrors.message("reason")}` / `>`; the `Textarea` loses `id={reasonId}`; its `onChange` a block: `setReason(event.target.value)` / `fieldErrors.clear("reason")` | M-R5, U-R7 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-u.test.ts` (with a file tool):

```ts

test("round cancel: the empty reason is an error under the field with its own message, not a toast, and the server's limit is restated (v-track U2)", () => {
  const source = read(`${C}audit-round-cancel-button.tsx`)
  assertMigratedForm(source, { ids: { reason: "audit-round-cancel-reason" }, messages: [] })
  assert.ok(validateBody(source).includes('check("reason", required(values.reason) ?? maxLength(values.reason, 4000))'))
  // The reason's limit reaches its message through the hook's params (the textarea has no maxLength).
  assert.match(source, /const FIELD_PARAMS = \{ reason: \{ max: 4000 \} \}/)
  assert.match(source, /useFieldErrors<CancelField>\(\{ params: FIELD_PARAMS \}\)/)
  assert.ok(source.includes('error={fieldErrors.errors.reason === "required" ? t("cancelReasonRequired") : fieldErrors.message("reason")}'))
  // The id is the Field's, stable for focus (no useId on the textarea); a change clears the error; closing starts over.
  assert.doesNotMatch(source, /useId|reasonId/)
  assert.match(source, /setReason\(event\.target\.value\)\n\s+fieldErrors\.clear\("reason"\)/)
  assert.match(source, /setReason\(""\)\n\s+fieldErrors\.setErrors\(\{\}\)/)
  assert.doesNotMatch(source, /if \(!trimmedReason\)/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-u.test.ts`. Expected to fail: "round cancel: the empty reason is an error under the field with its own message, not a toast, and the server's limit is restated (v-track U2)" (`noValidate directly after onSubmit`). After Step 3 and before Step 4, `node --test tests/audit-round-cancellation.test.ts` fails "the round cancel dialog keeps its footer in view, with a busy destructive confirm and a danger trigger (2C batch 3)"; Step 4 is its edit.
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Pin and guard edits:**
  - `tests/audit-round-cancellation.test.ts:162-163`, old (two lines): `  assert.match(source, /<form onSubmit=\{handleSubmit\} className=\{accessibleDialogFormClasses\}>\n\s+<AccessibleDialogBody className="space-y-4">/)` / `  assert.match(source, /<Field label=\{t\("cancelReason"\)\} required>\n\s+<Textarea\n\s+id=\{reasonId\}[\s\S]*?\n\s+required\n[\s\S]*?className="min-h-28"\n\s+\/>\n\s+<\/Field>/)` → new (three lines): `  assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate className=\{accessibleDialogFormClasses\}>\n\s+<AccessibleDialogBody className="space-y-4">/)` / `  // The Field names the textarea and shows its error (v-track plan 2 U2).` / `  assert.match(source, /<Field\n\s+label=\{t\("cancelReason"\)\}\n\s+id="audit-round-cancel-reason"\n\s+required\n[^\n]*\n\s+>\n\s+<Textarea\n\s+value=\{reason\}[\s\S]*?\n\s+required\n[\s\S]*?className="min-h-28"\n\s+\/>\n\s+<\/Field>/)`.
  - `V_FORMS` (U-R12's anchor): the row `` `${C}audit/audit-round-cancel-button.tsx`, ``.
- [ ] **Step 5: Verify.** `node --test tests/v-track2-u.test.ts tests/audit-round-cancellation.test.ts tests/audit-pages-sweep-ui.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/accessible-dialog.test.ts tests/visual-foundation-guards.test.ts tests/ui-overlay-guards.test.ts`; `npm test` (+1; 2271 tests, 2270 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint`. eol: `164 164` (the dialog), `167 167` (the pin), the guard CRLF, `0 110` (the test file).
- [ ] **Step 6: Commit.** `git add src/components/audit/audit-round-cancel-button.tsx tests/audit-round-cancellation.test.ts tests/validation-guards.test.ts tests/v-track2-u.test.ts`, then `git commit -m "feat(audit): the round cancel dialog shows a missing reason under the field instead of a toast (v-track plan 2 task 15, U2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 16 (U3): The not-found and component-missing dialogs move onto the V-track form pattern (`c/audit/audit-mark-not-found-button.tsx`, `audit-scan-component-missing-dialog.tsx`)

Spec §4.5, §5 #16, #22; M-R1–M-R5; U-R5, U-R6.

**Files:**
- Modify: `src/components/audit/audit-mark-not-found-button.tsx`, `src/components/audit/audit-scan-component-missing-dialog.tsx` (`i/lf w/crlf`)
- Pins: none (`tests/audit-not-found-dialog.test.ts`, `dialog-trigger-handles`, `audit-mobile-flow-completion`, `audit-scan-check-ui` stay green unchanged)
- Guard: `tests/validation-guards.test.ts` (`V_FORMS`)
- Test: `tests/v-track2-u.test.ts` (LF)

**Changes at e1caa29:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| not found `:3` | `import { useId, useImperativeHandle, useState, type FormEvent, type Ref, type RefObject } from "react"` | `useId, ` goes | M-R5 |
| not found after `:19` (`use-api-error`) | — | `import { useFieldErrors } from "@/components/ui/use-field-errors"` | M-R3 |
| not found after `type AuditMarkNotFoundButtonVariant … :21` | — | a blank line; `// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1). The photo` / `// is not a key: the server's file checks answer with a plain error, which keeps its toast.`; `const FIELD_IDS = {` / `  remark: "audit-not-found-remark",` / `} as const`; `type NotFoundField = keyof typeof FIELD_IDS`; `const FIELD_ORDER = Object.keys(FIELD_IDS) as NotFoundField[]`; a blank line; `// noValidate keeps the browser out like every V-track form (spec §4.5). Nothing here can be wrong before the request:` / `// the remark is optional and the server sets no limit on it, and the photo is optional (v-track U-R6).`; `function validate(): Partial<Record<NotFoundField, string>> {` / `  return {}` / `}` | M-R1, U-R6 |
| not found `:44` | `const remarkId = useId()` | gone; after `const [saving, setSaving] = useState(false)`: `const fieldErrors = useFieldErrors<NotFoundField>()` and `const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })` | M-R3 |
| not found `resetDialog :56-60` | ends `setEvidenceFile(null)` | `fieldErrors.setErrors({})` after it | M-R5 |
| not found `handleSubmit :67-69` | `event.preventDefault()` / (empty) / `setSaving(true)` | `event.preventDefault()` / `fieldErrors.setErrors(validate())` / `if (focusFirstError()) return` / (empty) / `setSaving(true)` | M-R4 |
| not found `:80` | `if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))` | plan 1 M1's refusal block with `payload` | M-R4, U-R5 |
| not found `:123-129` | `<form onSubmit={handleSubmit} className={accessibleDialogFormClasses}>`; `<Field label={t("notFoundRemarkOptional")}>`; `<Textarea` / `id={remarkId}` / `value={remark}` / `onChange={(event) => setRemark(event.target.value)}` | `<form onSubmit={handleSubmit} noValidate className={accessibleDialogFormClasses}>`; `<Field label={t("notFoundRemarkOptional")} id="audit-not-found-remark" error={fieldErrors.message("remark")}>`; the `Textarea` loses `id={remarkId}`, its `onChange` a block: `setRemark(event.target.value)` / `fieldErrors.clear("remark")` | FIXED 6, M-R5 |
| missing after `:16` (`textarea`) | — | `import { useFieldErrors } from "@/components/ui/use-field-errors"` | M-R3 |
| missing after the imports `:17` | — | a blank line; `// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1).`; `const FIELD_IDS = {` / `  remark: "audit-component-missing-remark",` / `} as const`; `type ComponentMissingField = keyof typeof FIELD_IDS`; `const FIELD_ORDER = Object.keys(FIELD_IDS) as ComponentMissingField[]`; a blank line; `// noValidate keeps the browser out like every V-track form (spec §4.5). Nothing here can be wrong before the request:` / `// an empty remark becomes the default one, and the photo is optional. The scan workspace sends the request and keeps` / `// its toast for a refusal (v-track U-R5, U-R6).`; `function validate(): Partial<Record<ComponentMissingField, string>> {` / `  return {}` / `}` | M-R1, U-R5, U-R6 |
| missing `:34-37` | `const [evidence, setEvidence] = …` / (empty) / `function submit(…) {` / `event.preventDefault()` | `const fieldErrors = useFieldErrors<ComponentMissingField>()` after the state; in `submit`, after `event.preventDefault()`: `fieldErrors.setErrors(validate())` / `if (fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })) return`; the `onSubmit(…)` line stays | M-R4 |
| missing `:52-57` | `<form onSubmit={submit} className=…>`; `<Field label={t("componentMissingRemarkOptional")}>`; `onChange={(event) => setRemark(event.target.value)}` | `<form onSubmit={submit} noValidate className=…>`; `<Field label={t("componentMissingRemarkOptional")} id="audit-component-missing-remark" error={fieldErrors.message("remark")}>`; the `onChange` a block with `fieldErrors.clear("remark")` | FIXED 6, M-R5 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-u.test.ts` (with a file tool):

```ts

test("the two not-found dialogs keep the browser out, name their remark for focus and have a validate() with no rule to restate (v-track U3)", () => {
  // Mark not found sends its own request, so a refusal that names the remark lands under it.
  const notFound = read(`${C}audit-mark-not-found-button.tsx`)
  assertMigratedForm(notFound, { ids: { remark: "audit-not-found-remark" } })
  // The component-missing dialog hands its values to the scan workspace, which sends them and keeps its toast (U-R5).
  const missing = read(`${C}audit-scan-component-missing-dialog.tsx`)
  assertMigratedForm(missing, { ids: { remark: "audit-component-missing-remark" }, handler: "submit", server: false })
  for (const [name, source, type] of [["not found", notFound, "NotFoundField"], ["component missing", missing, "ComponentMissingField"]] as const) {
    // Nothing can be wrong before the request (U-R6): the remark is optional with no limit, the photo optional.
    assert.match(source, new RegExp(`^function validate\\(\\): Partial<Record<${type}, string>> \\{\\n  return \\{\\}\\n\\}$`, "m"), name)
    assert.match(source, /fieldErrors\.setErrors\(validate\(\)\)/, name)
    assert.match(source, /setRemark\(event\.target\.value\)\n\s+fieldErrors\.clear\("remark"\)/, name)
    assert.doesNotMatch(source, /useId|remarkId/, name)
  }
  // Closing the mark-not-found dialog starts the next one with no errors; the empty component remark keeps its default.
  assert.match(notFound, /setEvidenceFile\(null\)\n\s+fieldErrors\.setErrors\(\{\}\)/)
  assert.ok(missing.includes('onSubmit(remark.trim() || t("componentMissingDefaultRemark", { assetTag: parentAssetTag }), evidence)'))
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-u.test.ts`. Expected to fail: "the two not-found dialogs keep the browser out, name their remark for focus and have a validate() with no rule to restate (v-track U3)" (`noValidate directly after onSubmit`). No pin fails after Step 3.
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard edit:** `V_FORMS` (U-R12's anchor): the rows `` `${C}audit/audit-mark-not-found-button.tsx`, `` and `` `${C}audit/audit-scan-component-missing-dialog.tsx`, ``.
- [ ] **Step 5: Verify.** `node --test tests/v-track2-u.test.ts tests/audit-not-found-dialog.test.ts tests/dialog-trigger-handles.test.ts tests/audit-mobile-flow-completion.test.ts tests/audit-scan-check-ui.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/file-evidence-ui.test.ts tests/accessible-dialog.test.ts` (85 tests, 0 fail in the rehearsal); `npm test` (+1; 2272 tests, 2271 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint`. eol: `185 185`, `105 105`, the guard CRLF, `0 129`.
- [ ] **Step 6: Commit.** `git add src/components/audit/audit-mark-not-found-button.tsx src/components/audit/audit-scan-component-missing-dialog.tsx tests/validation-guards.test.ts tests/v-track2-u.test.ts`, then `git commit -m "feat(audit): the not-found and component-missing dialogs move onto the V-track form pattern (v-track plan 2 task 16, U3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 17 (U4): The finding dialogs validate as forms, and closing a finding says it waits for evidence (`c/audit/audit-finding-review-actions.tsx`, messages)

Spec §4.4 ("evidence not uploaded" is a prerequisite; `aria-disabled` plus a reason, §11 call 2), §4.5, §5 #17–#19; M-R1–M-R5, M-R10, M-R12; U-R5, U-R8, U-R9.

**Files:**
- Modify: `src/components/audit/audit-finding-review-actions.tsx` (`i/lf w/crlf`); `messages/th.json`, `messages/en.json` (`i/lf w/crlf`, through `scripts/messages-edit.mjs`)
- Pins: none (`audit-finding-resolution`, `audit-pages-sweep-ui`, `list-pages-ui`, `ui-overlay-guards` stay green unchanged)
- Guard: `tests/validation-guards.test.ts` (`V_FORMS`)
- Test: `tests/v-track2-u.test.ts` (LF)

**Changes at e1caa29:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| imports `:25-26` | `import { useApiError } …` / `import { formatDateTime } from "@/lib/utils"` | `import { useFieldErrors } from "@/components/ui/use-field-errors"` after the first; `import { maxLength, required } from "@/lib/validation-rules"` after the second | M-R3 |
| after `type ReviewConflictPayload … :30-35` | — | a blank line; `// The fields of the three dialogs in visual order, keyed like the server's fieldErrors, with the id focus moves to` / `// (v-track M-R1). The owner select is optional and the server never refuses it, so it stays out.`; the three tables of the Step 1 test, each followed by its `type` and `ORDER` lines (`type ReviewField = keyof typeof REVIEW_FIELD_IDS`, `const REVIEW_FIELD_ORDER = Object.keys(REVIEW_FIELD_IDS) as ReviewField[]`; `PlanField` / `PLAN_FIELD_ORDER`; `CloseField` / `CLOSE_FIELD_ORDER`); `type FindingField = ReviewField \| PlanField \| CloseField`; a blank line; `// noValidate turns the browser's check off, so this restates the controls' required and maxLength. Each dialog passes` / `// only its own fields (v-track M-R2, U-R8).`; `function validate(` / `  values: { reviewRemark?: string; actionPlan?: string; closureRemark?: string },` / `): Partial<Record<FindingField, string>> {` with plan 1 M1's `errors` / `check` shape (keys `FindingField`) and the three `if (… !== undefined) check(…)` lines of the Step 1 test | M-R1, M-R2, U-R8 |
| ReviewDecisionModal `:258-265` | `const [conflict, setConflict] = …` / `async function submit(confirmConflict = false) {` / `const nextConflict = await onReview(action, reviewRemark.trim(), confirmConflict)` / … | after the state: `const fieldErrors = useFieldErrors<ReviewField>()`; the comment `// The row's review() sends the decision and keeps its toast for a refusal: the route cannot refuse the remark` / `// (v-track U-R5). A second press after a conflict confirms it.`; `async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {` / `event.preventDefault()` / `fieldErrors.setErrors(validate({ reviewRemark }))` / `if (fieldErrors.focusFirst(REVIEW_FIELD_ORDER, { idFor: (key) => REVIEW_FIELD_IDS[key] })) return` / `const nextConflict = await onReview(action, reviewRemark.trim(), Boolean(conflict))` / the `if (nextConflict?.code …)` block as today | U-R5, U-R8 |
| ReviewDecisionModal `:268-309` | `<AccessibleDialog …>` / `<AccessibleDialogBody …>` … `</AccessibleDialogFooter>` / `</AccessibleDialog>` | body and footer wrapped in `<form onSubmit={handleSubmit} noValidate className={accessibleDialogFormClasses}>` … `</form>`, re-indented two spaces | M-R12, U-R8 |
| `:298-300` | `<Field label={t(\`reviewRemarkLabel_${action}\`)}>` / `<Textarea value={reviewRemark} rows={3} maxLength={4000} onChange={(event) => setReviewRemark(event.target.value)} />` | `<Field label={t(\`reviewRemarkLabel_${action}\`)} id="audit-review-remark" error={fieldErrors.message("reviewRemark")}>`; the `Textarea` one prop per line, its `onChange` a block with `fieldErrors.clear("reviewRemark")` | M-R5 |
| `:304` | `<Button variant={action === "approve" ? "default" : "destructive"} busy={reviewing} onClick={() => submit(Boolean(conflict))}>` | `<Button type="submit" variant={action === "approve" ? "default" : "destructive"} busy={reviewing}>` | M-R12 |
| ActionPlanModal after `values` `:342` | — | `const fieldErrors = useFieldErrors<PlanField>()`; `const focusFirstError = () => fieldErrors.focusFirst(PLAN_FIELD_ORDER, { idFor: (key) => PLAN_FIELD_IDS[key] })`; `function setField(field: keyof typeof values, value: string) {` / `setValues((current) => ({ ...current, [field]: value }))` / `if (field in PLAN_FIELD_IDS) fieldErrors.clear(field as PlanField)` / `}` | M-R5 |
| `handleSubmit :345-346` | `event.preventDefault()` / `setSaving(true)` | `event.preventDefault()` / `fieldErrors.setErrors(validate({ actionPlan: values.actionPlan }))` / `if (focusFirstError()) return` / `setSaving(true)` | M-R4 |
| `:360` | `if (!response.ok) throw …` | plan 1 M1's refusal block with `payload` | M-R4 |
| `:373`, `:375`, `:395`, `:403` | `<form onSubmit={handleSubmit} className=…>`; `<Field label={t("actionPlan")} required>`; `<Field label={t("actionDueDate")}>`; `<Field label={t("actionStatus")}>` | `<form onSubmit={handleSubmit} noValidate className=…>`; `<Field label={t("actionPlan")} id="audit-plan-action-plan" required error={fieldErrors.message("actionPlan")}>`; `<Field label={t("actionDueDate")} id="audit-plan-due-date" error={fieldErrors.message("actionDueDate")}>`; `<Field label={t("actionStatus")} id="audit-plan-status" error={fieldErrors.message("actionStatus")}>` | FIXED 6, M-R5 |
| `:381`, `:393`, `:399`, `:406` | four `onChange`s that call `setValues((current) => ({ ...current, <key>: … }))` | `setField("actionPlan", event.target.value)`, `setField("actionOwnerId", value)`, `setField("actionDueDate", event.target.value)`, `setField("actionStatus", event.target.value)` | M-R5 |
| CloseFindingModal after `closureRemark` `:447` | — | `const fieldErrors = useFieldErrors<CloseField>()`; `const focusFirstError = () => fieldErrors.focusFirst(CLOSE_FIELD_ORDER, { idFor: (key) => CLOSE_FIELD_IDS[key] })`; `// A prerequisite, not a field (spec §4.4): closing waits for one evidence file and says so beside the button.`; `const needsEvidence = uploadedCount === 0` | U-R9 |
| `closeFinding :470-471` | `async function closeFinding() {` / `setSaving(true)` | `async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {` / `event.preventDefault()` / `if (needsEvidence) return` / `fieldErrors.setErrors(validate({ closureRemark }))` / `if (focusFirstError()) return` / `setSaving(true)` | U-R9, M-R4 |
| `:479` | `if (!response.ok) throw …` | plan 1 M1's refusal block with `payload` | M-R4, U-R5 |
| `:491-515` | the dialog's body and footer, no `<form>` | wrapped in `<form onSubmit={handleSubmit} noValidate className={accessibleDialogFormClasses}>` … `</form>`, re-indented two spaces | M-R12 |
| `:504-506` | `<Field label={t("closureRemark")}>` / `<Textarea value={closureRemark} rows={3} maxLength={4000} onChange={(event) => setClosureRemark(event.target.value)} />` / `</Field>` | `<Field label={t("closureRemark")} id="audit-close-remark" error={fieldErrors.message("closureRemark")}>`; the `Textarea` one prop per line, its `onChange` a block with `fieldErrors.clear("closureRemark")`; after `</Field>`, the body's last lines: `{/* Why close waits, the body's last line right above the button (the footer holds only buttons, GD3). */}` / `{needsEvidence ? <p id="audit-close-reason" className="text-meta text-muted-foreground">{t("closeNeedsEvidence")}</p> : null}` | U-R9 |
| `:510` | `<Button busy={saving} disabled={uploadedCount === 0} onClick={closeFinding}>` | one prop per line: `<Button` / `type="submit"` / `busy={saving}` / `aria-disabled={needsEvidence \|\| undefined}` / `aria-describedby={needsEvidence ? "audit-close-reason" : undefined}` / `>` | U-R9 |
| messages | — | change file `<temp>/u4-messages.json`: `{"set":{"th":{"auditFinding.closeNeedsEvidence":"ยังไม่มีหลักฐานปิดงาน ต้องแนบหลักฐานอย่างน้อย 1 ไฟล์ก่อนจึงจะปิดรายการไม่ตรงได้"},"en":{"auditFinding.closeNeedsEvidence":"No closure evidence yet. Attach at least one file before you close this discrepancy."}}}`, then `node scripts/messages-edit.mjs <temp>/u4-messages.json` | U-R9 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-u.test.ts` (with a file tool):

```ts

test("finding dialogs: decision, action plan and close are forms that validate themselves, and close waits for evidence with its reason beside the button (v-track U4)", () => {
  const source = read(`${C}audit-finding-review-actions.tsx`)
  // Three dialogs, three tables; the decision's request is sent by the row's review(), which keeps its toast (U-R5).
  assertMigratedForm(source, { ids: { reviewRemark: "audit-review-remark" }, table: "REVIEW_FIELD_IDS", server: false })
  assertMigratedForm(source, {
    ids: { actionPlan: "audit-plan-action-plan", actionDueDate: "audit-plan-due-date", actionStatus: "audit-plan-status" },
    table: "PLAN_FIELD_IDS",
  })
  assertMigratedForm(source, { ids: { closureRemark: "audit-close-remark" }, table: "CLOSE_FIELD_IDS" })
  assert.equal(source.match(/<form onSubmit=\{handleSubmit\} noValidate className=\{accessibleDialogFormClasses\}>/g)?.length, 3)
  const rules = validateBody(source)
  for (const rule of [
    'if (values.reviewRemark !== undefined) check("reviewRemark", maxLength(values.reviewRemark, 4000))',
    'if (values.actionPlan !== undefined) check("actionPlan", required(values.actionPlan) ?? maxLength(values.actionPlan, 4000))',
    'if (values.closureRemark !== undefined) check("closureRemark", maxLength(values.closureRemark, 4000))',
  ]) assert.ok(rules.includes(rule), rule)
  for (const call of ["validate({ reviewRemark })", "validate({ actionPlan: values.actionPlan })", "validate({ closureRemark })"]) {
    assert.ok(source.includes(`fieldErrors.setErrors(${call})`), call)
  }
  // The decision submits its form; a second press after a conflict confirms it, as before.
  assert.match(source, /const nextConflict = await onReview\(action, reviewRemark\.trim\(\), Boolean\(conflict\)\)/)
  assert.match(source, /<Button type="submit" variant=\{action === "approve" \? "default" : "destructive"\} busy=\{reviewing\}>/)
  assert.doesNotMatch(source, /onClick=\{\(\) => submit\(|onClick=\{closeFinding\}/)
  // The plan's fields clear their own error when they change.
  assert.match(source, /setValues\(\(current\) => \(\{ \.\.\.current, \[field\]: value \}\)\)\n\s+if \(field in PLAN_FIELD_IDS\) fieldErrors\.clear\(field as PlanField\)/)
  // Close: the evidence is a prerequisite (spec §4.4): the gate returns first, the button stays focusable with its reason.
  assert.match(source, /const needsEvidence = uploadedCount === 0/)
  assert.match(source, /event\.preventDefault\(\)\n\s+if \(needsEvidence\) return\n\s+fieldErrors\.setErrors\(validate\(\{ closureRemark \}\)\)/)
  // The reason is the body's last line, right above the footer, which holds only buttons (FMG GD3).
  assert.match(source, /\{needsEvidence \? <p id="audit-close-reason" className="text-meta text-muted-foreground">\{t\("closeNeedsEvidence"\)\}<\/p> : null\}\n\s+<\/AccessibleDialogBody>/)
  assert.match(source, /<Button\n\s+type="submit"\n\s+busy=\{saving\}\n\s+aria-disabled=\{needsEvidence \|\| undefined\}\n\s+aria-describedby=\{needsEvidence \? "audit-close-reason" : undefined\}\n\s+>/)
  assert.doesNotMatch(source, /disabled=\{uploadedCount === 0\}/)
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  assert.equal(th.auditFinding.closeNeedsEvidence, "ยังไม่มีหลักฐานปิดงาน ต้องแนบหลักฐานอย่างน้อย 1 ไฟล์ก่อนจึงจะปิดรายการไม่ตรงได้")
  assert.equal(en.auditFinding.closeNeedsEvidence, "No closure evidence yet. Attach at least one file before you close this discrepancy.")
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-u.test.ts`. Expected to fail: "finding dialogs: decision, action plan and close are forms that validate themselves, and close waits for evidence with its reason beside the button (v-track U4)" (`noValidate directly after onSubmit`). No pin fails after Step 3. FMG "GD3 a dialog footer holds only Button parts" fails if the reason line is put in the footer (U-R9): it belongs in the body.
- [ ] **Step 3: Implement** per the Changes table (re-indent the two dialogs' body and footer inside their new `<form>`), then apply the change file.
- [ ] **Step 4: Guard edit:** `V_FORMS` (U-R12's anchor): the row `` `${C}audit/audit-finding-review-actions.tsx`, ``.
- [ ] **Step 5: Verify.** `node --test tests/v-track2-u.test.ts tests/audit-finding-resolution.test.ts tests/audit-pages-sweep-ui.test.ts tests/list-pages-ui.test.ts tests/ui-overlay-guards.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/accessible-dialog.test.ts tests/visual-foundation-guards.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts tests/messages-edit.test.ts tests/file-evidence-ui.test.ts` (175 tests, 0 fail in the rehearsal); `npm test` (+1; 2273 tests, 2272 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint`. Messages +1 leaf key per locale (4087 on this plan's chain). eol: `613 613` (the file), the messages' and the guard's line counts twice (CRLF), `0 167`.
- [ ] **Step 6: Commit.** `git add src/components/audit/audit-finding-review-actions.tsx messages/th.json messages/en.json tests/validation-guards.test.ts tests/v-track2-u.test.ts`, then `git commit -m "feat(audit): the finding dialogs validate as forms, and closing a finding says it waits for evidence (v-track plan 2 task 17, U4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 18 (U5): Batch review says why approve and reject wait for a selection, and its dialog keeps the browser out (`c/audit/audit-findings-batch-actions.tsx`, `c/ui/confirm-text-dialog.tsx`, messages)

Spec §4.4 ("no assets selected for a batch" is a prerequisite), §4.5, §5 #20 (the silent return `:40`, the gates `:83`/`:93`); M-R10; U-R6, U-R10.

**Files:**
- Modify: `src/components/audit/audit-findings-batch-actions.tsx`, `src/components/ui/confirm-text-dialog.tsx` (`i/lf w/crlf`); `messages/th.json`, `messages/en.json`
- Pins: `tests/list-pages-ui.test.ts`, `tests/confirm-text-dialog-ui.test.ts` (`i/lf w/crlf`)
- Guard: `tests/validation-guards.test.ts` (`V_FORMS`)
- Test: `tests/v-track2-u.test.ts` (LF)

**Changes at e1caa29:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| batch after `type BatchFinding … :14-18` | — | a blank line; `// The batch's form is ConfirmTextDialog's, which turns the browser's check off (spec §4.5). Nothing in it can be wrong` / `// before the request: the remark is optional and the server sets no limit on it. The selection is a prerequisite` / `// (spec §4.4), gated on the buttons with its reason (v-track U-R6, U-R10).`; `function validate(): Partial<Record<"reviewRemark", string>> {` / `  return {}` / `}` | U-R6 |
| batch `:29` | `const selectedCount = selectedIds.length` | the same line, then `const noSelection = selectedCount === 0` | U-R10 |
| batch `:39-40` | `function openReviewDialog(action: "approve" \| "reject") {` / `if (selectedIds.length === 0) return` | the comment `// The buttons stay focusable while nothing is selected (aria-disabled), so the gate returns here.` above; `if (noSelection) return` | U-R10 |
| batch `:44-45` | `async function reviewSelected(…) {` / `setReviewing(action)` | between them `if (Object.keys(validate()).length > 0) return` | U-R6 |
| batch `:83`, `:93` | `disabled={selectedCount === 0 \|\| reviewing === "reject" \|\| reviewDialogAction !== null}` (approve); `disabled={selectedCount === 0 \|\| reviewing === "approve" \|\| reviewDialogAction !== null}` (reject) | three lines each: `aria-disabled={noSelection \|\| undefined}` / `aria-describedby={noSelection ? "audit-batch-review-reason" : undefined}` / `disabled={reviewing === "reject" \|\| reviewDialogAction !== null}` (reject: `"approve"`) | U-R10 |
| batch after the reject `</Button>` `:97` | — | `{/* Why the decision waits: a prerequisite keeps its gate and says so beside the buttons (spec §4.4). */}` / `{noSelection ? <p id="audit-batch-review-reason" className="text-meta text-muted-foreground">{t("batchNeedsSelection")}</p> : null}` (the last children of the actions fragment) | U-R10 |
| dialog `:76-77` | `return (` / `<form onSubmit={handleSubmit} className={accessibleDialogFormClasses}>` | the comment `// noValidate like every V-track form (spec §4.5): the caller checks what it needs before it acts.` above `return (`; `<form onSubmit={handleSubmit} noValidate className={accessibleDialogFormClasses}>` | U-R10 |
| messages | — | change file `<temp>/u5-messages.json`: `{"set":{"th":{"auditFinding.batchNeedsSelection":"ยังไม่ได้เลือกรายการ ต้องเลือกรายการไม่ตรงอย่างน้อย 1 รายการก่อนจึงจะพิจารณาได้"},"en":{"auditFinding.batchNeedsSelection":"Nothing selected yet. Select at least one discrepancy before you decide."}}}`, then `node scripts/messages-edit.mjs <temp>/u5-messages.json` | U-R10 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-u.test.ts` (with a file tool):

```ts

test("batch review: approve and reject stay focusable with nothing selected and say why beside them; the confirm dialog's form keeps the browser out (v-track U5)", () => {
  const source = read(`${C}audit-findings-batch-actions.tsx`)
  // The form is ConfirmTextDialog's (a shared part, NOT_IN_SCOPE); it takes noValidate for its caller (spec §4.5).
  assert.match(read("src/components/ui/confirm-text-dialog.tsx"), /<form onSubmit=\{handleSubmit\} noValidate className=\{accessibleDialogFormClasses\}>/)
  // Nothing in the dialog can be wrong before the request (U-R6); no toast for a validation error.
  assert.match(source, /^function validate\(\): Partial<Record<"reviewRemark", string>> \{\n  return \{\}\n\}$/m)
  assert.match(source, /async function reviewSelected\(action: "approve" \| "reject", reviewRemark: string\) \{\n\s+if \(Object\.keys\(validate\(\)\)\.length > 0\) return/)
  assert.doesNotMatch(source, /\btoast\.(?:error|warning)\(/)
  // The selection is a prerequisite (spec §4.4): aria-disabled with the reason beside the buttons; busy stays disabled.
  assert.match(source, /const noSelection = selectedCount === 0/)
  assert.match(source, /function openReviewDialog\(action: "approve" \| "reject"\) \{\n\s+if \(noSelection\) return/)
  for (const [action, other] of [["approve", "reject"], ["reject", "approve"]]) {
    assert.match(
      source,
      new RegExp(`onClick=\\{\\(\\) => openReviewDialog\\("${action}"\\)\\}\\n\\s+busy=\\{reviewing === "${action}"\\}\\n\\s+aria-disabled=\\{noSelection \\|\\| undefined\\}\\n\\s+aria-describedby=\\{noSelection \\? "audit-batch-review-reason" : undefined\\}\\n\\s+disabled=\\{reviewing === "${other}" \\|\\| reviewDialogAction !== null\\}\\n`),
      action,
    )
  }
  assert.ok(source.includes('{noSelection ? <p id="audit-batch-review-reason" className="text-meta text-muted-foreground">{t("batchNeedsSelection")}</p> : null}'))
  assert.doesNotMatch(source, /selectedCount === 0 \|\|/)
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  assert.equal(th.auditFinding.batchNeedsSelection, "ยังไม่ได้เลือกรายการ ต้องเลือกรายการไม่ตรงอย่างน้อย 1 รายการก่อนจึงจะพิจารณาได้")
  assert.equal(en.auditFinding.batchNeedsSelection, "Nothing selected yet. Select at least one discrepancy before you decide.")
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-u.test.ts`. Expected to fail: "batch review: approve and reject stay focusable with nothing selected and say why beside them; the confirm dialog's form keeps the browser out (v-track U5)" (`The input did not match the regular expression /<form onSubmit=\{handleSubmit\} noValidate className=\{accessibleDialogFormClasses\}>/`). After Step 3 and before Step 4, `node --test tests/list-pages-ui.test.ts tests/confirm-text-dialog-ui.test.ts` fails "the findings batch panel: shared checkboxes, Button with busy, approve in the primary color and reject as danger (spec 2B R-c, §8.6 row 8)" and "the confirmation dialog uses the dialog parts, a shared field and a busy confirm button (2C batch 3)"; Step 4 is their edit.
- [ ] **Step 3: Implement** per the Changes table, then apply the change file.
- [ ] **Step 4: Pin and guard edits:**
  - `tests/list-pages-ui.test.ts:249-250`, old (two lines): `  assert.match(source, /<Button\n\s+size="md"\n\s+onClick=\{\(\) => openReviewDialog\("approve"\)\}\n\s+busy=\{reviewing === "approve"\}\n\s+disabled=\{selectedCount === 0 \|\| reviewing === "reject" \|\| reviewDialogAction !== null\}\n\s+>/)` / `  assert.match(source, /<Button\n\s+variant="danger"\n\s+size="md"\n\s+onClick=\{\(\) => openReviewDialog\("reject"\)\}\n\s+busy=\{reviewing === "reject"\}\n\s+disabled=\{selectedCount === 0 \|\| reviewing === "approve" \|\| reviewDialogAction !== null\}\n\s+>/)` → new (three lines): `  // With nothing selected the buttons are aria-disabled with their reason (v-track plan 2 U5); busy stays disabled.` / `  assert.match(source, /<Button\n\s+size="md"\n\s+onClick=\{\(\) => openReviewDialog\("approve"\)\}\n\s+busy=\{reviewing === "approve"\}\n\s+aria-disabled=\{noSelection \|\| undefined\}\n[^\n]*\n\s+disabled=\{reviewing === "reject" \|\| reviewDialogAction !== null\}\n\s+>/)` / `  assert.match(source, /<Button\n\s+variant="danger"\n\s+size="md"\n\s+onClick=\{\(\) => openReviewDialog\("reject"\)\}\n\s+busy=\{reviewing === "reject"\}\n\s+aria-disabled=\{noSelection \|\| undefined\}\n[^\n]*\n\s+disabled=\{reviewing === "approve" \|\| reviewDialogAction !== null\}\n\s+>/)`.
  - `tests/confirm-text-dialog-ui.test.ts:30`, old `  assert.match(source, /<form onSubmit=\{handleSubmit\} className=\{accessibleDialogFormClasses\}>\n\s+<AccessibleDialogBody>\n` → new `  assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate className=\{accessibleDialogFormClasses\}>\n\s+<AccessibleDialogBody>\n` (the rest of the line as it is).
  - `V_FORMS` (U-R12's anchor): the row `` `${C}audit/audit-findings-batch-actions.tsx`, ``. (`ui/confirm-text-dialog.tsx` stays in `NOT_IN_SCOPE`; V1 counts no `<form>` in the batch file.)
- [ ] **Step 5: Verify.** `node --test tests/v-track2-u.test.ts tests/list-pages-ui.test.ts tests/confirm-text-dialog-ui.test.ts tests/audit-pages-sweep-ui.test.ts tests/accessible-dialog.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts` (163 tests, 0 fail in the rehearsal); `npm test` (+1; 2274 tests, 2273 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint`. Messages +1 per locale (4088 on this plan's chain). eol: `151 151` (batch), `99 99` (dialog), the two pins keep CRLF (`888 888` and `40 40` alone), the guard CRLF, `0 193`.
- [ ] **Step 6: Commit.** `git add src/components/audit/audit-findings-batch-actions.tsx src/components/ui/confirm-text-dialog.tsx tests/list-pages-ui.test.ts tests/confirm-text-dialog-ui.test.ts tests/validation-guards.test.ts tests/v-track2-u.test.ts messages/th.json messages/en.json`, then `git commit -m "feat(audit): batch review says why approve and reject wait for a selection, and its dialog keeps the browser out (v-track plan 2 task 18, U5)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 19 (U6): The scan check's location shows its error, focus stays in the sheet, and a missing photo says why save waits (`c/audit/audit-scan-check-form.tsx`)

Spec §4.2 (the mobile sheet), §4.4 ("a required photo not taken"), §5 #21 and its asterisk-only select, §3 (offline-queued scans keep today's behaviour); M-R1–M-R5, M-R10; U-R5, U-R11.

**Files:**
- Modify: `src/components/audit/audit-scan-check-form.tsx` (`i/lf w/crlf`)
- Pins: `tests/audit-scan-check-ui.test.ts`, `tests/audit-scan-sweep-ui.test.ts` (`i/lf w/crlf`)
- Guard: `tests/validation-guards.test.ts` (`V_FORMS` and `SELECT_STAR_ONLY`)
- Test: `tests/v-track2-u.test.ts` (LF)
- No change: `audit-scan-workspace.tsx`, `audit-scan-check-panel.tsx`, `audit-scan-check-field.tsx` (plan 1 F6 gave it `id` and `error`).

**Changes at e1caa29:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| imports `:13`, `:34` | `import { Textarea } from "@/components/ui/textarea"`; `} from "@/lib/audit-scan-session"` | `import { useFieldErrors } from "@/components/ui/use-field-errors"` after the first; `import { required } from "@/lib/validation-rules"` after the second | M-R3 |
| after `const fieldLabelKey = { … } as const :55-60` | — | a blank line; `// The fields in visual order, keyed like the scan body's actual… ids, with the id focus moves to (v-track M-R1). Only` / `// the location has a rule; the other three are optional and the server never refuses them.`; `const FIELD_IDS = {` / `  actualLocationId: "audit-check-location",` / `} as const`; `type CheckField = keyof typeof FIELD_IDS`; `const FIELD_ORDER = Object.keys(FIELD_IDS) as CheckField[]`; a blank line; `// The check is not a form element (it is a panel of rows, photos and component actions), so nothing checks it but this:` / `// the location keeps its star and its rule (v-track M-R2, U-R11).`; `function validate(values: AuditCheckValues): Partial<Record<CheckField, string>> {` with plan 1 M1's `errors` / `check` shape and the one `check` line of the Step 1 test. The comment must not contain the text `<form` (the test's `doesNotMatch`). | M-R1, M-R2, U-R11 |
| after `const extrasId = useId() :124` | — | `const fieldErrors = useFieldErrors<CheckField>()`; the comment `// On a phone the check is a sheet: it stays open and focus moves inside it (spec §4.2). The field is first brought into` / `// the check's own scroll area, which the dashboard's scroll does not reach.`; `const focusFirstError = () =>` / `fieldErrors.focusFirst(FIELD_ORDER, {` / `idFor: (key) => FIELD_IDS[key],` / `reveal: (key) => revealFocusInScrollArea(bodyRef.current, document.getElementById(FIELD_IDS[key])),` / `})` | U-R11 |
| `save :222-224` | `// Saving the parent while components are still pending asks first; cancelling sends nothing (D4).` / `async function save() {` / `if (pendingComponents.length > 0) {` | the comment `// A missing photo is a prerequisite: save stays focusable and returns here (spec §4.4). Then the fields, then saving the` / `// parent while components are still pending asks first; cancelling sends nothing (D4).`; `async function save() {` / `if (missingPhoto) return` / `fieldErrors.setErrors(validate(values))` / `if (focusFirstError()) return` / `if (pendingComponents.length > 0) {` | U-R11, M-R4 |
| `fieldConfig :256-257` | the type `Array<{ field: AuditCheckField; required?: boolean; … }>`; `{ field: "location", required: true, options: options.locations, onChange: (value) => setValues((current) => ({ ...current, location: value })) },` | the type gains `key?: CheckField` after `field: AuditCheckField;`; the location row one prop per line: `{` / `field: "location",` / `key: "actualLocationId",` / `required: true,` / `options: options.locations,` / `onChange: (value) => {` / `setValues((current) => ({ ...current, location: value }))` / `fieldErrors.clear("actualLocationId")` / `},` / `},`; the other three rows stay | U-R11 |
| `<AuditScanCheckField` `:271-282` | `key={config.field}` / `label=…`; … `labelFor={labelFor(config.field)}` / `onChange={config.onChange}` | `id={config.key ? FIELD_IDS[config.key] : undefined}` directly after `key={config.field}`; `error={config.key ? fieldErrors.message(config.key) : undefined}` directly after `labelFor=…` | V4, U-R11 |
| `:391-393` | `{/* Why save is disabled: a condition before acting, one inline line that does not grow the bar (spec 2D D7). */}`; `<Notice tone="neutral">` | `{/* Why save waits: a condition before acting, one inline line that does not grow the bar (spec 2D D7), tied to` / `the save button, which stays focusable (spec §4.4). */}`; `<Notice id="audit-check-photo-reason" tone="neutral">` | U-R11 |
| `:406-407` | `busy={saving}` / `disabled={disabled \|\| missingPhoto}` | `busy={saving}` / `aria-disabled={missingPhoto \|\| undefined}` / `aria-describedby={missingPhoto ? "audit-check-photo-reason" : undefined}` / `disabled={disabled}` | U-R11 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-u.test.ts` (with a file tool):

```ts

test("scan check: the location's star has its rule and its error, focus stays inside the sheet, and a missing photo keeps save focusable with its reason (v-track U6)", () => {
  const source = read(`${C}audit-scan-check-form.tsx`)
  // No <form>: the check is a panel of rows, photos and component actions (U-R11); validate() is its only check.
  assert.doesNotMatch(source, /<form\b/)
  assert.match(source, /import \{ useFieldErrors \} from "@\/components\/ui\/use-field-errors"/)
  assert.match(source, /const FIELD_IDS = \{\n  actualLocationId: "audit-check-location",\n\} as const/)
  assert.ok(validateBody(source).includes('check("actualLocationId", required(values.location))'))
  // The location select (AuditScanCheckField) gets the table's id and its error; the other three are optional.
  assert.match(source, /\{\n\s+field: "location",\n\s+key: "actualLocationId",\n\s+required: true,/)
  assert.match(source, /<AuditScanCheckField\n\s+key=\{config\.field\}\n\s+id=\{config\.key \? FIELD_IDS\[config\.key\] : undefined\}\n/)
  assert.match(source, /\n\s+error=\{config\.key \? fieldErrors\.message\(config\.key\) : undefined\}\n/)
  assert.match(source, /setValues\(\(current\) => \(\{ \.\.\.current, location: value \}\)\)\n\s+fieldErrors\.clear\("actualLocationId"\)/)
  // Save: the photo gate returns first, then the fields; focus is brought into the check's own scroll area (spec §4.2).
  assert.match(source, /async function save\(\) \{\n\s+if \(missingPhoto\) return\n\s+fieldErrors\.setErrors\(validate\(values\)\)\n\s+if \(focusFirstError\(\)\) return\n/)
  assert.match(source, /reveal: \(key\) => revealFocusInScrollArea\(bodyRef\.current, document\.getElementById\(FIELD_IDS\[key\]\)\)/)
  // The photo is a prerequisite (spec §4.4): aria-disabled tied to the Notice that says why; a closed round still disables.
  assert.match(source, /<Notice id="audit-check-photo-reason" tone="neutral">/)
  assert.match(source, /busy=\{saving\}\n\s+aria-disabled=\{missingPhoto \|\| undefined\}\n\s+aria-describedby=\{missingPhoto \? "audit-check-photo-reason" : undefined\}\n\s+disabled=\{disabled\}\n/)
  assert.doesNotMatch(source, /disabled=\{disabled \|\| missingPhoto\}/)
  assert.doesNotMatch(source, /\btoast\.(?:error|warning)\(/)
  // The workspace still sends the check and keeps its toasts and its offline queue (spec §3, U-R5).
  const workspace = read(`${C}audit-scan-workspace.tsx`)
  assert.match(workspace, /await queueOffline\(payload, submission\.photos\)/)
  assert.match(workspace, /if \(isRoundClosedError\(result\?\.error\)\) setRoundClosed\(true\)\n\s+apiError\.toast\(result\?\.error\)/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-u.test.ts`. Expected to fail: "scan check: the location's star has its rule and its error, focus stays inside the sheet, and a missing photo keeps save focusable with its reason (v-track U6)" (`The input did not match the regular expression /import \{ useFieldErrors \} from "@\/components\/ui\/use-field-errors"/`). After Step 3 and before Step 4, `node --test tests/audit-scan-check-ui.test.ts tests/audit-scan-sweep-ui.test.ts tests/validation-guards.test.ts` fails three tests: "one save button names the result, and a missing photo blocks it with a reason", "check form: the installed-in note is an info Notice, the note and photo toggle a Button over a quiet grouping, the photo rule a neutral Notice and the correction a ChoiceCard (spec 2D D7, D9, M20, M29)" and "V5 the required selects that nothing checks only count down (spec §5)" (the file's star-only select is now checked); Step 4 is their edit.
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Pin and guard edits:**
  - `tests/audit-scan-check-ui.test.ts:23`, old `  assert.match(source, /disabled=\{disabled \|\| missingPhoto\}/)` → new, two lines: `  // The photo gate keeps save focusable with its reason (v-track plan 2 U6); a closed round still disables it.` / `  assert.match(source, /aria-disabled=\{missingPhoto \|\| undefined\}\n\s+aria-describedby=\{missingPhoto \? "audit-check-photo-reason" : undefined\}\n\s+disabled=\{disabled\}\n/)`. `:24` (`doesNotMatch … disabled={saving || disabled || missingPhoto}`) stays.
  - `tests/audit-scan-sweep-ui.test.ts:52`, old `  assert.match(source, /<Notice tone="neutral">\s*\{mode === "out_of_scope"` → new `  assert.match(source, /<Notice id="audit-check-photo-reason" tone="neutral">\s*\{mode === "out_of_scope"` (the rest of the line as it is); `:55`, old `  const rule = source.indexOf('<Notice tone="neutral">')` → new `  const rule = source.indexOf('<Notice id="audit-check-photo-reason" tone="neutral">')`.
  - `tests/validation-guards.test.ts` (U-R12): in the block that starts `const SELECT_STAR_ONLY: Readonly<Record<string, number>> = {`, delete the line `` [`${C}audit/audit-scan-check-form.tsx`]: 1, `` (indented two spaces). The same text is also `V_SCOPE`'s row near the top of the file, which stays: edit the one below `const SELECT_STAR_ONLY` (with the Edit tool, include that block's opening line or a neighbouring row that is still there as context). Afterwards `git grep -c 'audit/audit-scan-check-form.tsx`\]: 1,' tests/validation-guards.test.ts` prints `tests/validation-guards.test.ts:1`.
  - `V_FORMS` (U-R12's anchor): the row `` `${C}audit/audit-scan-check-form.tsx`, ``.
- [ ] **Step 5: Verify.** `node --test tests/v-track2-u.test.ts tests/audit-component-scan-ui.test.ts tests/audit-out-of-scope-actual-field.test.ts tests/audit-scan-check-ui.test.ts tests/audit-scan-result-semantics.test.ts tests/audit-scan-search-ui.test.ts tests/audit-scan-sweep-ui.test.ts tests/dark-mode-t.test.ts tests/file-evidence-ui.test.ts tests/form-migration-guards.test.ts tests/list-frame-guards.test.ts tests/validation-guards.test.ts tests/visual-foundation-guards.test.ts tests/audit-scan-workspace-ui.test.ts tests/audit-mobile-flow-completion.test.ts tests/audit-scan-offline-ux.test.ts tests/v-track-f.test.ts` (201 tests, 0 fail in the rehearsal); `npm test` (+1; 2275 tests, 2274 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint` (0 errors, 146 warnings, all under `.agents/`). eol: `475 475`, `137 137`, `179 179`, the guard CRLF, `0 219`.
- [ ] **Step 6: Commit.** `git add src/components/audit/audit-scan-check-form.tsx tests/audit-scan-check-ui.test.ts tests/audit-scan-sweep-ui.test.ts tests/validation-guards.test.ts tests/v-track2-u.test.ts`, then `git commit -m "feat(audit): the scan check's location shows its error, focus stays in the sheet, and a missing photo says why save waits (v-track plan 2 task 19, U6)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Rehearsal record (area U)

| Task | `u-dry` | Step 2 (the new test fails first) | Step 4 pins failing before their edit | `npm test` after (tests / pass / fail / skipped) | test file |
|---|---|---|---|---|---|
| U1 | `9507faef` | U1's test, "noValidate directly after onSubmit" | 2: the round form UI test, the round form sweep test | 2257 / 2256 / 0 / 1 | `0 95` |
| U2 | `60dd57b3` | U2's test, same message | 1: "the round cancel dialog keeps its footer in view…" | 2258 / 2257 / 0 / 1 | `0 110` |
| U3 | `caceaae1` | U3's test, same message | none | 2259 / 2258 / 0 / 1 | `0 129` |
| U4 | `053148ed` | U4's test, same message | none | 2260 / 2259 / 0 / 1 | `0 167` |
| U5 | `7a584979` | U5's test, the `ConfirmTextDialog` `<form … noValidate …>` regex | 2: "the findings batch panel…", "the confirmation dialog uses the dialog parts…" | 2261 / 2260 / 0 / 1 | `0 193` |
| U6 | `080a0a3b` | U6's test, the `useFieldErrors` import regex | 3: "one save button names the result…", "check form: the installed-in note…", "V5 the required selects…" | 2262 / 2261 / 0 / 1 | `0 219` |

Every task: `npx tsc --noEmit` clean; `npx eslint` on the task's files clean; full `npm run lint` 0 errors, 146 warnings (all under `.agents/`). Messages 4092 → 4093 (U4) → 4094 (U5) per locale; `thai-glossary`, `messages-parity`, `messages-edit` green. The "Step 4 pins" column was replayed per commit with the parent's pin and guard files. Not rehearsed: the hook in React (no dev server in a rehearsal); the controller's dev-app check covers it (review note 3).

What the rehearsal changed in this text:
- U4: the close dialog's reason line was first written into `AccessibleDialogFooter` (M-R10's page-footer pattern) and failed FMG "GD3 a dialog footer holds only Button parts" (`className=` in a footer); it is the body's last line (U-R9, assembly note 3).
- U6: a first comment said "The check has no `<form>`", which the test's `doesNotMatch(/<form\b/)` caught; the comment now says "not a form element".
- U6: `SELECT_STAR_ONLY`'s row has the same text as `V_SCOPE`'s row; the deletion is anchored on the `SELECT_STAR_ONLY` block (U-R12).
- The clone `v-sim` holds two pack files without an index (`pack-5ae6582…`, `pack-74160cb…`), so a commit that rebuilt `src/components` failed with "invalid object … for 'src/components/pwa/pwa-service-worker-register.tsx'"; `git index-pack` of both packs in `sim-U` fixed it. This is the sim's state only (the real checkout is not a clone of `v-sim`); a later rehearsal from `v-sim` will meet it.

### Assembly notes (area U, not for the user)

1. **Zod `.int()` reaches the client as `required`.** Plan 1's map (S-R2, `src/lib/field-errors.ts`) sends `invalid_type` with `expected: "int"` (what zod 4 reports for `2025.5` into `.int()`) to `required`; a probe on `e1caa29` gave `{ auditYear: "required" }`. Area U's client check (U-R3) means the round form never shows it, but any form of plan 2 with an `.int()` field and no client whole-number check would read "กรุณาระบุข้อมูลนี้" for a fraction (maintenance interval days, license seats). A one-line server fix (`expected: "int"` → `invalidNumber`) with a Task 1-style test belongs to whichever area of plan 2 owns the server map; if a shared `wholeNumber`/`integer` rule helper is added, U1 switches to it.
2. **Empty `validate()`** (U-R6) in three files: if the assembly prefers a V2 allowance list (`NO_RULE` with reasons) to an empty function, U3 and U5 change their Step 1 blocks and the guard; nothing else moves.
3. **Dialog gates and GD3.** A prerequisite reason inside an `AccessibleDialog` cannot sit in its footer (FMG GD3); the other areas' dialog gates (disposal decision and execution, bulk approval and execution) should use U-R9's "body's last line".
4. **Counts for the chain.** Area U adds +1 test per task (6), +2 message keys, +7 `V_FORMS` files, +8 `<form … noValidate>`, −1 `SELECT_STAR_ONLY` select (file row deleted), −1 validation toast outside a catch (`audit-round-cancel-button.tsx:52`). It touches no file another area touches except `tests/validation-guards.test.ts` and `messages/*.json` (anchors, U-R12).

### Open issues (area U)

Area U's open issues 1 and 2 are open issues 6 and 7 at the end of the plan; its assembly notes 1 and 2 are open issues 12 and 13 (P-R9).

---

## Area D: the disposal forms show their errors under the field, and the evidence refusals name their field (Tasks 20–26, D1–D7)

Spec `docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md` (approved 2026-10-17) §2 U1–U3, U5, U6, U9; §3 G1–G3, G5 and the anti-goals; §4.1–§4.5; §5 #23–#28 and its bugs ("the disposal request's asset and requester are never checked"); §6.1, §6.2; §7.1–§7.3 (as used, not built); §11 calls 1, 2, 7. Area D runs **after plan 1** (`master` `e1caa29`): it uses plan 1's FIXED INTERFACES 1–7 as amended there (the body `{ error, code?, fieldErrors }`, `useFieldErrors` / `useValidationMessage`, the rule helpers, `common.validation.*`, the form convention, `tests/validation-guards.test.ts`) and the rulings M-R1–M-R13 and F-R1–F-R10 unchanged. It adds one guard list (`NON_VALIDATION_TOASTS`, D-R5, a FIXED addition) and two pure server functions (D1).

What this area does, in one line each:
- **D1** (server, first in the area, like plan 1's area S): the execution's two evidence refusals (`DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED`, `_ACK_REQUIRED`) add `fieldErrors` under the field they are about, and a bulk execution preview or commit names the dialog field a blocked row's code points at (the shared recipient, the exception's reason and acknowledgement) (D-R1).
- **D2** request: the asset picker and the requester, which nothing checked (spec §5 bug), the reason through the server's own 12-character rule, the money fields' minimum; the picker learns `id` and `error`; the upload-result toast is allowed by name (D-R2, D-R4, D-R5, D-R6).
- **D3** batch: the edit step becomes a form; the mixed gate splits into a prerequisite (2–100 assets, a visible reason beside the button) and content errors (requester, reason); a field refusal on the review step goes back to the edit step (D-R3).
- **D4** decision dialog: a rejection's reason is an error on save through `getDisposalDecisionFieldErrors`, no longer a disabled save; a refusal lands under its field in the open dialog (D-R6, D-R10).
- **D5** execution dialog: the executor star is checked, the type's own rules come from `getDisposalExecutionFieldErrors`, the historical reason (20–2000) and acknowledgement are errors on save; no evidence stays a prerequisite tied to the dialog's evidence Notice; D1's evidence refusals stay in the open dialog (D-R6, D-R7, D-R10).
- **D6** bulk approval: the shared remark is a field with its error; nothing eligible is a prerequisite tied to the zero-eligible Notice (D-R8).
- **D7** bulk execution: the shared values, the exception's two fields and the permanent confirmation are errors on submit (the review button is enabled, preview's silent return goes); a refusal, or a preview whose every row a shared value blocks, goes back to the review step; nothing eligible is a prerequisite (D-R9).

Nothing else changes: no migration, no database write, no new dependency, no new server rule (spec §6.3: every refusal of D1 existed; only its body gains `fieldErrors`), no status code change, no `EXEMPT` row, no `CONSTRAINT_FLOORS` change (every `required` / `maxLength` / `minLength` stays), no FMG `STAR_ONLY` change (none of its three entries is a disposal form), no change to DESIGN.md (the final plan). Messages: +2 (D3, D7).

**Line numbers** are of `e1caa29`; for every disposal file they equal the recon's `9e17cab` lines, except `src/app/api/disposal-requests/[id]/route.ts`, which plan 1 Task 6 changed (its lines below are `e1caa29`'s). Find every site by its quoted text.

### Inventory (D at `e1caa29`)

| # | Form · file | Submit · `<form>` | Today (validation · server errors) | Decision | Task |
|---|---|---|---|---|---|
| — | execution evidence refusals `src/app/api/disposal-requests/[id]/route.ts` · `src/lib/disposal-evidence-exception.ts` | route `:55-56`: `DisposalExecutionServiceError` → `disposalApiError(error.code, error.message, status)`; the codes come from `getDisposalExecutionEvidenceError` `:12-29` (`:26` reason, `:27` acknowledgement) | `{ code, error }`, 400, no `fieldErrors`; the zod branch `:210-218` (max 2000 only) already has them (plan 1 Task 6) | the reason and acknowledgement codes add `fieldErrors` (D-R1) | D1 |
| — | bulk execution rows `src/lib/disposal-bulk-execution-service.ts`, `src/lib/disposal-bulk-execution.ts` | `buildResponse` `:301-315`; row codes from `getDisposalExecutionFieldErrorCode` `:286-299` and `getDisposalExecutionEvidenceError` | 200 with per-row `code`; nothing names a field | the response names the dialog field a blocked row points at (D-R1) | D1 |
| 23 | request `c/disposal/disposal-request-form.tsx` (+ `disposal-asset-picker.tsx`) | `handleSubmit :63` · `:117` | native `required` (`:129` select, `:184` reason), `minLength={12}` `:185`, `maxLength` `:187`, money `min="0"` `:157,:169` · **the picker's star `disposal-asset-picker.tsx:65` and the requester `SearchableSelect :137-150` are never checked** · `getDisposalApiErrorMessage :84` → `apiError.toast :104` · upload result `toast.warning :97` (not in a catch) | errors under the field; the picker gains `id`/`error`; the upload toast allowed by name (D-R2, D-R4, D-R5, D-R6) | D2 |
| 24 | batch `c/disposal/disposal-batch-form.tsx` (no `<form>`, two steps) | review button `:157`, `submit :42` | **mixed gate** `valid :40` (2–100 assets, reason ≥ 12, requester) disables the review button `:157`, no reason shown; silent `if (!valid) return :43`; `minLength={12}` `:148` never applied · `getDisposalApiErrorMessage :52` · upload result `toast.warning :61` | the edit step becomes `<form onSubmit={handleReview} noValidate>`; assets a prerequisite with a reason line, requester and reason content errors; a field refusal goes back to the edit step (D-R3) | D3 |
| 25 | decision `c/disposal/disposal-decision-button.tsx` (dialog) | `handleSubmit :90` (in the button) · `<form onSubmit={onSubmit}>` `:186` (in `DecisionDialog`) | native `required` `:189,:196`, conditional `:215`; **content gate** `disabled={rejectionReasonRequired && !values.approvalRemark.trim()}` `:221` · `getDisposalApiErrorMessage :106` → `apiError.toast :111` | errors under the field, the remark through `getDisposalDecisionFieldErrors`; the gate goes (D-R6, D-R10) | D4 |
| 26 | execution `c/disposal/disposal-execution-button.tsx` (dialog) | `handleSubmit :131` · `<form onSubmit={onSubmit}>` `:248` | native `required`, `minLength={20}` `:288`; **the executor `SearchableSelect :254` has the star only**; `submitDisabled :231` = `evidenceBlocked :227` (prerequisite) ‖ `historicalInputInvalid :228-230` (content) at `:298` · `getDisposalApiErrorMessage :159`; the evidence codes close the dialog and refresh `:160-164` | errors under the field, the type's rules through `getDisposalExecutionFieldErrors`; the evidence gate tied to the evidence Notice `:250` (D-R6, D-R7, D-R10) | D5 |
| 27 | bulk approval `c/disposal/disposal-bulk-approval.tsx` (dialog) | `handleSubmit :546` → `commit :296` · `<form data-disposal-bulk-dialog="true" onSubmit={handleSubmit}>` `:562` | `maxLength={4000}` `:584`; silent `:298`; `disabled={eligible.length === 0}` `:594` (prerequisite, the zero Notice `:578`) · `send :264-268` throws fixed texts into the dialog Notice `:564` | the remark a field; the gate tied to the zero Notice; a remark refusal back to the field (D-R8) | D6 |
| 28 | bulk execution `c/disposal/disposal-bulk-execution.tsx` (dialog, review → preview → result) | `handleSubmit :813` → `preview :393` / `commit :451` · `<form … onSubmit={handleSubmit}>` `:831` | `required` `:1018,:1025,:1037` (+ `:892,:908`), `minLength={20}` `:890`, `maxLength` `:891,:1050`; **content gate** `disabled={!hasSharedValues}` `:955` and silent `:410`; the historical rule `setError :411-422` into the dialog Notice `:838`; `disabled={eligible.length === 0 \|\| !permanentConfirmed}` `:960`; silent `:452,:456` | errors under the field per step; the review button enabled; a field refusal or an all-blocked preview back to the review step; nothing eligible a prerequisite (D-R9) | D7 |

Not in area D: the disposal list's date filter (`role="search"`), the attachment uploader (uploads on pick), the batch detail page. `ConfirmDialog`s have no field.

Rulings: R5 of "Rulings of this plan" (D-R*).

### Interfaces with the other areas

| # | From / to | What | Where |
|---|---|---|---|
| 1 | plan 1 (FIXED 1–7) | `useFieldErrors`, `useValidationMessage`, `required`/`minLength`/`maxLength`/`range`, `readFieldErrors`, `getApiErrorKey`, `FieldError`, the 400 body, `disposalApiError(code, error, status, fieldErrors?)` | every task |
| 2 | D → plan 2 | `NON_VALIDATION_TOASTS` and V3's exact count (D-R5): the first task that needs it creates it with D2's block, others insert one row after `const NON_VALIDATION_TOASTS: … = {` | maintenance, assets |
| 3 | D → plan 2 | `V_FORMS` rows are inserted directly **after** `const V_FORMS: readonly string[] = [` (never before a neighbour), so the six rows land whatever order the areas run in; `SELECT_STAR_ONLY` rows are deleted by their own line, the second occurrence in the file (`V_SCOPE` holds the first, which stays) | all form areas |
| 4 | D → plan 2 | `shownFields` + `check` dropping hidden keys (D-R4) for any form with conditional fields | operations (checkout handover), maintenance (repair outcome) |
| 5 | D → plan 2 | the `Error` `cause` hand-back of a provider's refusal to its dialog (D-R8, D-R9) | any provider-owned dialog |
| 6 | D | messages `disposalPage.batchNeedsAssets` (D3), `disposalPage.bulkExecutionPermanentConfirmationRequired` (D7): change files `<temp>/d3-messages.json`, `<temp>/d7-messages.json`; other areas' keys go through their own change files, so the order does not matter | — |

### Line endings (checked with `git ls-files --eol` in `D:/Antigravity/asset-system` at `e1caa29`)

- CRLF (`i/lf w/crlf`): `src/app/api/disposal-requests/[id]/route.ts` (plan 1 called it `w/mixed`; it is CRLF at `e1caa29`), `src/lib/disposal-evidence-exception.ts`, every `src/components/disposal/*.tsx` this area edits, `src/app/[locale]/(dashboard)/disposal/page.tsx`, `messages/th.json`, `messages/en.json`, `tests/validation-guards.test.ts`, `tests/disposal-sweep-ui.test.ts`, `tests/disposal-bulk-approval.test.ts`, `tests/disposal-bulk-execution-ui.test.ts`.
- `w/mixed`: `src/lib/disposal-bulk-execution.ts` (63 of 68 lines CRLF), `src/lib/disposal-bulk-execution-service.ts` (273 of 346), `src/lib/disposal-bulk-execution-ui.ts` (181 of 247), `tests/disposal-bulk-execution-ui-state.test.ts` (123 of 146). Edit them by exact strings; the Edit tool may rewrite a whole mixed file as CRLF (the rehearsal's D1 did): git stores LF either way, so `git diff --numstat` shows only the task's lines. Never normalize a file on purpose.
- New and LF: `tests/v-track2-d.test.ts`.
- `<tools>/eol.mjs` (plan 1's) prints the counts each Step 5 gives.

---

### Task 20 (D1): The execution's evidence refusals and the bulk rows a dialog field can fix name that field (`src/app/api/disposal-requests/[id]/route.ts`, `src/lib/disposal-evidence-exception.ts`, `src/lib/disposal-bulk-execution.ts`, `src/lib/disposal-bulk-execution-service.ts`)

Spec §6.2 ("other non-zod field refusals with `fieldErrors`", U9), §6.3 (no new rule); D-R1. A server task, first in the area, like plan 1's area S.

**Files:**
- Modify: `src/app/api/disposal-requests/[id]/route.ts`, `src/lib/disposal-evidence-exception.ts` (CRLF); `src/lib/disposal-bulk-execution.ts`, `src/lib/disposal-bulk-execution-service.ts` (`w/mixed`)
- Test: `tests/v-track2-d.test.ts` (new, LF)

**Changes at e1caa29:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `src/lib/disposal-evidence-exception.ts:1` | `export type DisposalExecutionEvidenceErrorCode =` | `import type { FieldErrors } from "./field-errors.ts"` and a blank line before it | — |
| after `getDisposalExecutionEvidenceError` (ends `:29`) | — | a blank line, the three comment lines `// The two evidence refusals that are about one field of the execution form name it (V track spec §6.2): the reason says` / `// what is wrong with it (empty, under 20 or over 2000 characters, counted trimmed as above), the acknowledgement is` / `// required. Any other code (no evidence, not an admin, an exception that does not apply) is not about a field: undefined.`, then `export function getDisposalEvidenceFieldErrors(code: string \| null, input: { evidenceExceptionReason?: string \| null }): FieldErrors \| undefined` (parameters one per line): the reason code returns `{ evidenceExceptionReason: length === 0 ? "required" : length < 20 ? "tooShort" : "tooLong" }` with `const length = input.evidenceExceptionReason?.trim().length ?? 0`; the acknowledgement code returns `{ evidenceExceptionAcknowledged: "required" }`; else `undefined` | D-R1 |
| route `:16` | `import { disposalApiError } from "@/lib/disposal-api-errors"` | it, then `import { getDisposalEvidenceFieldErrors } from "@/lib/disposal-evidence-exception"` | — |
| route `:56` | `          return disposalApiError(error.code, error.message, getDisposalExecutionErrorStatus(error.code))` | `          return disposalApiError(error.code, error.message, getDisposalExecutionErrorStatus(error.code), getDisposalEvidenceFieldErrors(error.code, input))` | D-R1 |
| `src/lib/disposal-bulk-execution.ts:2` | `import type { DisposalType } from "./disposal-type-policy.ts"` | it, then `import { getDisposalEvidenceFieldErrors } from "./disposal-evidence-exception.ts"` and `import type { FieldErrors } from "./field-errors.ts"` | — |
| `:46-47` (`DisposalBulkExecutionResponse`) | `  items: DisposalBulkExecutionItem[]` / `}` | between them: `  // The fields of the dialog that a blocked row names (getDisposalBulkExecutionFieldErrors); absent when none.` / `  fieldErrors?: FieldErrors` | D-R1 |
| after `summarizeDisposalBulkExecution` (ends `:68`) | — | a blank line, a four-line comment (the rows a dialog field can fix name it; the per-request codes name none; first row per field wins; undefined when none), then `export function getDisposalBulkExecutionFieldErrors(items: readonly Pick<DisposalBulkExecutionItem, "outcome" \| "code">[], input: { evidenceExceptionReason?: string \| null }): FieldErrors \| undefined` (parameters one per line): for each item with `outcome === "blocked"`, `const named = item.code === "DISPOSAL_RECIPIENT_REQUIRED" ? { sharedRecipientName: "recipientRequired" } : getDisposalEvidenceFieldErrors(item.code, input)`, and each of its keys not yet set is set; returns the map when it has a key, else `undefined` | D-R1 |
| `src/lib/disposal-bulk-execution-service.ts:2-4` | `import {` / `  getDisposalBulkSelectionBlockCode,` | `getDisposalBulkExecutionFieldErrors,` as the first name of that import | — |
| `:83`, `:123` | `return buildResponse("preview", inspection.items.map(({ item }) => item))`, `return buildResponse("commit", items)` | `return buildResponse("preview", inspection.items.map(({ item }) => item), command.input)`, `return buildResponse("commit", items, command.input)` | D-R1 |
| `buildResponse :301-315` | `  items: DisposalBulkExecutionItem[],` / `): DisposalBulkExecutionResponse {` / `  const summary = …` … `    items,` / `  }` | a third parameter `  input: DisposalBulkExecutionInput,` (the type is already imported); after `const summary`: `  // A blocked row that a field of the dialog can fix names that field, so the dialog can show it there (v-track D-R1).` / `  const fieldErrors = getDisposalBulkExecutionFieldErrors(items, input)`; after `    items,`: `    ...(fieldErrors ? { fieldErrors } : {}),` | D-R1 |

The new function in `src/lib/disposal-bulk-execution.ts`, after `summarizeDisposalBulkExecution` and a blank line (exact; the ternary spans three lines, which Step 5's `git diff --numstat` `25 0` counts):

```ts
// The blocked rows whose code a field of the bulk execution dialog can fix name that field (V track spec §6.2): a
// missing recipient is the shared recipient, the evidence exception's reason and acknowledgement are their own fields.
// Every other row code is about the request itself (its document, sale value, remark, stage) and names none. The first
// row of each field wins; undefined when no row names a field.
export function getDisposalBulkExecutionFieldErrors(
  items: readonly Pick<DisposalBulkExecutionItem, "outcome" | "code">[],
  input: { evidenceExceptionReason?: string | null },
): FieldErrors | undefined {
  const fieldErrors: FieldErrors = {}
  for (const item of items) {
    if (item.outcome !== "blocked") continue
    const named = item.code === "DISPOSAL_RECIPIENT_REQUIRED"
      ? { sharedRecipientName: "recipientRequired" }
      : getDisposalEvidenceFieldErrors(item.code, input)
    for (const [key, code] of Object.entries(named ?? {})) {
      if (!(key in fieldErrors)) fieldErrors[key] = code
    }
  }
  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined
}
```

- [ ] **Step 1: The failing test.** Create `tests/v-track2-d.test.ts` (LF) with exactly:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// V track plan 2, area D: the disposal forms show their errors under the field (spec
// docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §4, §5, §6.2, §7). One test per task, appended in order.
// The working tree is CRLF on Windows: every read strips \r before the multi-line regexes.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("the execution's evidence refusals and the bulk rows a dialog field can fix name that field (v-track D1)", async () => {
  const { getDisposalEvidenceFieldErrors } = await import("../src/lib/disposal-evidence-exception.ts")
  const reasonCode = "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED"
  const ackCode = "DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED"
  // The reason's code says what is wrong with it, counted on the trimmed text as the service counts it.
  assert.deepEqual(getDisposalEvidenceFieldErrors(reasonCode, { evidenceExceptionReason: "   " }), { evidenceExceptionReason: "required" })
  assert.deepEqual(getDisposalEvidenceFieldErrors(reasonCode, { evidenceExceptionReason: null }), { evidenceExceptionReason: "required" })
  assert.deepEqual(getDisposalEvidenceFieldErrors(reasonCode, { evidenceExceptionReason: " nineteen characters " }), { evidenceExceptionReason: "tooShort" })
  assert.deepEqual(getDisposalEvidenceFieldErrors(reasonCode, { evidenceExceptionReason: "x".repeat(2001) }), { evidenceExceptionReason: "tooLong" })
  assert.deepEqual(getDisposalEvidenceFieldErrors(ackCode, {}), { evidenceExceptionAcknowledged: "required" })
  // No evidence, not an admin, or an exception that does not apply: not about a field, so no fieldErrors.
  for (const code of ["DISPOSAL_EVIDENCE_REQUIRED", "DISPOSAL_EVIDENCE_EXCEPTION_FORBIDDEN", "DISPOSAL_EVIDENCE_EXCEPTION_NOT_APPLICABLE", null]) {
    assert.equal(getDisposalEvidenceFieldErrors(code, { evidenceExceptionReason: "" }), undefined, String(code))
  }

  // The single execution: the service's evidence refusal keeps its code and adds the field it is about.
  const route = read("src/app/api/disposal-requests/[id]/route.ts")
  assert.match(route, /^import \{ getDisposalEvidenceFieldErrors \} from "@\/lib\/disposal-evidence-exception"$/m)
  assert.ok(route.includes("return disposalApiError(error.code, error.message, getDisposalExecutionErrorStatus(error.code), getDisposalEvidenceFieldErrors(error.code, input))"))

  // The bulk execution: a blocked row whose code a field of the dialog can fix names that field; the rows' own fields
  // (document, sale value, remark) are not in the dialog and name none.
  const { getDisposalBulkExecutionFieldErrors } = await import("../src/lib/disposal-bulk-execution.ts")
  assert.deepEqual(
    getDisposalBulkExecutionFieldErrors([
      { outcome: "eligible", code: null },
      { outcome: "blocked", code: "DISPOSAL_DOCUMENT_REQUIRED" },
      { outcome: "blocked", code: "DISPOSAL_RECIPIENT_REQUIRED" },
      { outcome: "blocked", code: reasonCode },
      { outcome: "blocked", code: ackCode },
      { outcome: "blocked", code: "DISPOSAL_RECIPIENT_REQUIRED" },
    ], { evidenceExceptionReason: "short" }),
    { sharedRecipientName: "recipientRequired", evidenceExceptionReason: "tooShort", evidenceExceptionAcknowledged: "required" },
  )
  assert.equal(getDisposalBulkExecutionFieldErrors([
    { outcome: "blocked", code: "DISPOSAL_DOCUMENT_REQUIRED" },
    { outcome: "blocked", code: "DISPOSAL_SALE_VALUE_REQUIRED" },
    { outcome: "blocked", code: "DISPOSAL_EXECUTION_REMARK_REQUIRED" },
    { outcome: "failed", code: "DISPOSAL_BULK_EXECUTION_FAILED" },
    { outcome: "executed", code: null },
  ], {}), undefined)
  const service = read("src/lib/disposal-bulk-execution-service.ts")
  assert.ok(service.includes('return buildResponse("preview", inspection.items.map(({ item }) => item), command.input)'))
  assert.ok(service.includes('return buildResponse("commit", items, command.input)'))
  assert.match(service, /const fieldErrors = getDisposalBulkExecutionFieldErrors\(items, input\)\n[\s\S]*?\.\.\.\(fieldErrors \? \{ fieldErrors \} : \{\}\),\n/)
  assert.match(read("src/lib/disposal-bulk-execution.ts"), /^ {2}fieldErrors\?: FieldErrors$/m)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-d.test.ts`. Expected to fail: "the execution's evidence refusals and the bulk rows a dialog field can fix name that field (v-track D1)" (`TypeError: getDisposalEvidenceFieldErrors is not a function`).
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Pin edits:** none. `tests/disposal-route-structure.test.ts` (the evidence branch and `issue.path[0] === "evidenceExceptionReason"`), `tests/disposal-bulk-execution-service.test.ts` (it reads `items`, codes and counts, never the whole response) and `tests/disposal-evidence-exception.test.ts` stay green.
- [ ] **Step 5: Verify.** `node --test tests/v-track2-d.test.ts tests/disposal-bulk-execution-service.test.ts tests/disposal-bulk-execution.test.ts tests/disposal-evidence-exception.test.ts tests/disposal-route-structure.test.ts tests/disposal-bulk-execution-route.test.ts tests/disposal-execution-service.test.ts tests/disposal-bulk-execution-ui-state.test.ts` (90 tests, 0 fail); `npm test` (+1; 2276 tests, 2275 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint` (0 errors, no new warning in `src/` or `tests/`). `node <tools>/eol.mjs tests/v-track2-d.test.ts` prints `0 56`; the four source files keep CRLF or end all CRLF (mixed ones), and `git diff --numstat` shows `2 1`, `17 0`, `25 0`, `7 2` (route, evidence, bulk, service).
- [ ] **Step 6: Commit.** `git add "src/app/api/disposal-requests/[id]/route.ts" src/lib/disposal-evidence-exception.ts src/lib/disposal-bulk-execution.ts src/lib/disposal-bulk-execution-service.ts tests/v-track2-d.test.ts`, then `git commit -m "feat(api): disposal execution's evidence refusals and the bulk rows a dialog field can fix name that field (v-track plan 2 task 20, D1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 21 (D2): The disposal request checks its asset, requester and reason on save and shows errors under the field (`c/disposal/disposal-request-form.tsx`, `disposal-asset-picker.tsx`)

Spec §4.1, §4.3, §4.5, §5 #23 and its bug; D-R2, D-R4, D-R5, D-R6, D-R11. The first disposal form: its test block holds the area's copy of plan 1's form helpers.

**Files:**
- Modify: `src/components/disposal/disposal-request-form.tsx`, `src/components/disposal/disposal-asset-picker.tsx` (CRLF)
- Pins: `tests/disposal-sweep-ui.test.ts` (CRLF)
- Guard: `tests/validation-guards.test.ts` (CRLF): `V_FORMS`, `SELECT_STAR_ONLY`, `NON_VALIDATION_TOASTS` and V3 (D-R5)
- Test: `tests/v-track2-d.test.ts` (LF)

**Changes at e1caa29:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| request imports `:18-22` | `import { showsEstimatedSaleValue, showsEstimatedSalvageValue, type DisposalType } from "@/lib/disposal-type-policy"` | after the picker import: `import { getApiErrorKey } from "@/lib/api-error-catalog"`; the policy import one name per line with `getDisposalRequestReasonError` first; after `disposal-error-message`: `import { maxLength, range, required } from "@/lib/validation-rules"`; after `use-api-error`: `import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"` | M-R3 |
| after `type Option` `:24` | — | `type DisposalRequestValues = { assetId; disposalType; reason; requestedById; approverId; saleValue; salvageValue }` (all `string`, one per line); the table `assetId: "disposal-request-asset"`, `disposalType: "disposal-request-type"`, `requestedById: "disposal-request-requested-by"`, `saleValue: "disposal-request-sale-value"`, `salvageValue: "disposal-request-salvage-value"`, `reason: "disposal-request-reason"` with M-R1's comment plus `The` / `// approver has no rule anywhere and stays out.`; `type DisposalRequestField`, `FIELD_ORDER`; `function shownFields(values: DisposalRequestValues): DisposalRequestField[]` (the type's `showsEstimatedSaleValue` / `showsEstimatedSalvageValue` filter the two money keys, as the Step 1 test reads it); `function validate(values: DisposalRequestValues)` with `const shown = shownFields(values)`, `if (code && shown.includes(key)) errors[key] = code` and the rules of the Step 1 test, the reason line under `// The server's own 12-character rule; its code is the message's catalog key (disposalReasonTooShort).` | M-R1, M-R2, D-R4, D-R6 |
| `:47` | `const [values, setValues] = useState({` | `useState<DisposalRequestValues>({`; after the initial values: `const fieldErrors = useFieldErrors<DisposalRequestField>()`, `const validationMessage = useValidationMessage()`, `const focusFirstError = () => fieldErrors.focusFirst(shownFields(values), { idFor: (key) => FIELD_IDS[key] })` | M-R3, D-R4 |
| `setField :57-59` | `function setField(field: string, value: string) {` / `setValues(…)` | `function setField(field: keyof DisposalRequestValues, value: string) {`; after `setValues`: `// The type decides which estimated values show: it clears them with itself.` / `if (field === "disposalType") fieldErrors.clear("disposalType", "saleValue", "salvageValue")` / `else if (field in FIELD_IDS) fieldErrors.clear(field as DisposalRequestField)` | M-R5, D-R4 |
| `handleSubmit :64-65` | `event.preventDefault()` / `setSaving(true)` | `event.preventDefault()` / `fieldErrors.setErrors(validate(values))` / `if (focusFirstError()) return` / `setSaving(true)` | M-R4 |
| `:84` | `if (!response.ok) throw new Error(getDisposalApiErrorMessage(payload, t, tCommon("error")))` | `if (!response.ok) {` / plan 1 M1's comment `// A refusal that names a field of this form shows under it; any other keeps the toast (spec §4.1).` / `if (fieldErrors.applyServer(payload) && focusFirstError()) return` / `throw new Error(getDisposalApiErrorMessage(payload, t, tCommon("error")))` / `}` | M-R4 |
| `:97` | `toast.warning(t("createSuccessWithUploadErrors", …))` | unchanged (D-R5) | D-R5 |
| `:117` | `<form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">` | `<form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-5 md:grid-cols-2">` | FIXED 6 |
| `:119-128` | `<DisposalAssetPicker` / `label={t("asset")}` … | `id="disposal-request-asset"` as its first prop, `error={fieldErrors.message("assetId")}` as its last | D-R2 |
| `:129` | `<Select label={t("disposalType")} value={values.disposalType} required onChange={(value) => setField("disposalType", value)}>` | one prop per line: `label`, `id="disposal-request-type"`, `value`, `required`, `onChange`, `error={fieldErrors.message("disposalType")}`; the local `Select` `:224-244` gains `id?: string` and `error?: React.ReactNode` and renders `<Field label={label} id={id} required={required} error={error}>` | M-R5 |
| `:137-150` | `<SearchableSelect` / `label={t("requestedBy")}` … `onChange={(value) => setValues((current) => ({ … }))}` | `id="disposal-request-requested-by"` as its first prop; `error={fieldErrors.message("requestedById")}` before `onChange`; `onChange` a block: the same `setValues` call, then `fieldErrors.clear("requestedById")` | D-R2, V4 |
| `:153`, `:165` | `<Field label={t("saleValueBaht")}>`, `<Field label={t("salvageValueBaht")}>` | one prop per line: `label`, `id="disposal-request-sale-value"` (`-salvage-value`), `error={fieldErrors.errors.saleValue ? validationMessage(fieldErrors.errors.saleValue, { min: 0 }) : undefined}` (`salvageValue`) | D-R11 |
| `:177-181` | `<Field` / `label={t("reason")}` / `required` / `hint={…}` / `>` | `id="disposal-request-reason"` after `label`; after `hint`: `error={fieldErrors.errors.reason ? validationMessage(fieldErrors.errors.reason, { min: 12, max: 4000 }) : undefined}` | M-R4 |
| picker `:8` | `import { FieldLabel } from "@/components/ui/field"` | `import { FieldError, FieldLabel } from "@/components/ui/field"` | D-R2 |
| picker `:21-25` | `export function DisposalAssetPicker({ label, …, selectedCountLabel }: { label: string; …; selectedCountLabel?: string }) {` … `const inputId = useId()` | above it the comment `// id names the search field, so a form's focusFirst reaches it; error shows under the picker and is tied to the search` / `// field (v-track D-R2). The search field is the only control while nothing is chosen, which is when an error shows.`; `id` first and `error` last in the destructuring, `id?: string;` first and `error?: React.ReactNode` last in the type; `const generatedId = useId()` / `const inputId = id ?? generatedId` / ``const errorId = error ? `${inputId}-error` : undefined`` | D-R2 |
| picker `:67` | `… role="combobox" aria-expanded={options.length > 0} aria-controls={listboxId} className="pl-9 pr-10" />` | `aria-describedby={errorId} aria-invalid={error ? true : undefined}` before `className` | D-R2 |
| picker `:72-73` | the chosen-assets line, then `  </div>` | between them: `    {error ? <FieldError id={errorId} className="mt-1.5">{error}</FieldError> : null}` | D-R2 |

The two comments the table names but does not quote (exact, as rehearsed; no test reads them): above `function shownFields(`, `// The fields the form shows: the estimated values follow the type. A hidden field is neither checked nor focused, so a` / `// refusal about one falls through to the toast (v-track D-R4).`; above `function validate(`, `// noValidate turns the browser's check off, so this restates the controls' required, min, minLength and maxLength, and` / `// checks the asset and the requester the server requires, which nothing checked before (v-track M-R2, D-R2).`

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-d.test.ts` (the area's copy of plan 1's M1 helpers, with one change: `toasts` counts the toasts a form keeps outside a catch, D-R5, and the `<form` may carry attributes before `onSubmit`, as V2 allows):

```ts

// The form helpers (plan 1's area M, tests/v-track-m.test.ts M1; copied, because no test imports a test file).
const C = "src/components/"
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// The body of the module-level `function validate(`, up to the first line that is only "}".
function validateBody(source: string) {
  const start = source.search(/^function validate\(/m)
  assert.notEqual(start, -1, "a module-level function validate(")
  const end = source.indexOf("\n}\n", start)
  return source.slice(start, end)
}

// The shape every migrated form shares (plan 1 M-R1 to M-R4): noValidate straight after onSubmit, the FIELD_IDS table in
// visual order, validate() with one check per rule, the hook, focus on the first wrong field for the client's errors
// and the server's, each listed key's message under its field, and no validation toast.
function assertMigratedForm(
  source: string,
  form: { ids: Record<string, string>; handler?: string; messages?: readonly string[]; table?: string; hook?: string; server?: false; toasts?: number },
) {
  const handler = form.handler ?? "handleSubmit"
  const table = form.table ?? "FIELD_IDS"
  const hook = form.hook ?? "fieldErrors"
  // The bulk dialogs' forms carry a data attribute before onSubmit, as the V2 guard allows.
  assert.match(source, new RegExp(`<form\\b[^>]*?\\bonSubmit=\\{${handler}\\} noValidate[ >\\n]`), "noValidate directly after onSubmit")
  assert.match(source, /import \{ useFieldErrors(?:, useValidationMessage)? \} from "@\/components\/ui\/use-field-errors"/)
  const block = source.match(new RegExp(`const ${table} = \\{\\n([\\s\\S]*?)\\n\\} as const`))
  assert.ok(block, `const ${table} = { … } as const`)
  const rows = Object.entries(form.ids).map(([key, id]) => `  ${key}: "${id}",`)
  assert.deepEqual(block[1].split("\n"), rows, `${table}: the fields in visual order with their ids`)
  // Each id once: id="…", or a quoted literal inside id={…} (the first checkbox of a group).
  for (const id of Object.values(form.ids)) {
    const uses = source.match(new RegExp(`\\bid=(?:"${escape(id)}"|\\{[^}\\n]*"${escape(id)}"[^}\\n]*\\})`, "g"))
    assert.equal(uses?.length, 1, `id "${id}" once`)
  }
  for (const key of form.messages ?? Object.keys(form.ids)) {
    assert.match(source, new RegExp(`error=\\{${hook}\\.message\\("${escape(key)}"\\)\\}`), `${key}: its error under the field`)
  }
  assert.match(source, new RegExp(`${hook}\\.setErrors\\(validate\\(`), "the client's errors come from validate()")
  if (form.server !== false) {
    assert.match(source, new RegExp(`if \\(${hook}\\.applyServer\\((?:result|payload|body|refusal)\\) && `), "the server's fieldErrors land on the same fields")
  }
  assert.match(source, new RegExp(`${hook}\\.focusFirst\\(`), "focus goes to the first wrong field")
  // Only a toast that is not about a field may stay outside a catch (NON_VALIDATION_TOASTS, v-track D-R5).
  assert.equal(source.match(/\btoast\.(?:error|warning)\(/g)?.length ?? 0, form.toasts ?? 0, "no validation toast (the catch keeps apiError.toast)")
}

test("disposal request: the asset, the requester and the reason are checked on save, and errors show under the field (v-track D2)", () => {
  const source = read(`${C}disposal/disposal-request-form.tsx`)
  assertMigratedForm(source, {
    ids: {
      assetId: "disposal-request-asset",
      disposalType: "disposal-request-type",
      requestedById: "disposal-request-requested-by",
      saleValue: "disposal-request-sale-value",
      salvageValue: "disposal-request-salvage-value",
      reason: "disposal-request-reason",
    },
    messages: ["assetId", "disposalType", "requestedById"],
    toasts: 1,
  })
  const rules = validateBody(source)
  for (const rule of [
    'check("assetId", required(values.assetId))',
    'check("disposalType", required(values.disposalType))',
    'check("requestedById", required(values.requestedById))',
    'check("saleValue", range(values.saleValue, 0))',
    'check("salvageValue", range(values.salvageValue, 0))',
    // The server's own 12-character rule; its code is the message's catalog key (disposalReasonTooShort).
    "const reasonTooShort = getDisposalRequestReasonError(values.reason)",
    'check("reason", required(values.reason) ?? (reasonTooShort && getApiErrorKey(reasonTooShort)) ?? maxLength(values.reason, 4000))',
  ]) assert.ok(rules.includes(rule), rule)
  // A hidden estimated value is neither checked nor focused (D-R4), and a type change clears them with itself.
  assert.ok(rules.includes("if (code && shown.includes(key)) errors[key] = code"))
  assert.match(source, /if \(key === "saleValue"\) return showsEstimatedSaleValue\(type\)\n\s+if \(key === "salvageValue"\) return showsEstimatedSalvageValue\(type\)\n/)
  assert.ok(source.includes("const focusFirstError = () => fieldErrors.focusFirst(shownFields(values), { idFor: (key) => FIELD_IDS[key] })"))
  assert.match(source, /if \(field === "disposalType"\) fieldErrors\.clear\("disposalType", "saleValue", "salvageValue"\)\n\s+else if \(field in FIELD_IDS\) fieldErrors\.clear\(field as DisposalRequestField\)/)
  // The two stars nothing checked (spec §5 bug): the picker and the requester show their errors and take focus.
  assert.match(source, /<DisposalAssetPicker\n\s+id="disposal-request-asset"\n/)
  assert.ok(source.includes('error={fieldErrors.message("assetId")}'))
  assert.match(source, /<SearchableSelect\n\s+id="disposal-request-requested-by"\n\s+label=\{t\("requestedBy"\)\}/)
  // The money fields and the reason say their limits.
  for (const key of ["saleValue", "salvageValue"]) {
    assert.ok(source.includes(`error={fieldErrors.errors.${key} ? validationMessage(fieldErrors.errors.${key}, { min: 0 }) : undefined}`), key)
  }
  assert.ok(source.includes("error={fieldErrors.errors.reason ? validationMessage(fieldErrors.errors.reason, { min: 12, max: 4000 }) : undefined}"))
  // A requester change clears its error, and the approver it may reset is not a field with a rule.
  assert.match(source, /approverId: current\.approverId === value \? "" : current\.approverId,\n\s+\}\)\)\n\s+fieldErrors\.clear\("requestedById"\)/)
  // The upload result after a saved request stays a toast: it is not about a field (NON_VALIDATION_TOASTS).
  assert.match(source, /toast\.warning\(t\("createSuccessWithUploadErrors"/)

  const picker = read(`${C}disposal/disposal-asset-picker.tsx`)
  assert.match(picker, /const inputId = id \?\? generatedId\n/)
  assert.match(picker, /aria-describedby=\{errorId\} aria-invalid=\{error \? true : undefined\}/)
  assert.ok(picker.includes('{error ? <FieldError id={errorId} className="mt-1.5">{error}</FieldError> : null}'))
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-d.test.ts`. Expected to fail: "disposal request: the asset, the requester and the reason are checked on save, and errors show under the field (v-track D2)" ("noValidate directly after onSubmit"). After Step 3 and before Step 4, `node --test tests/disposal-sweep-ui.test.ts tests/validation-guards.test.ts` fails "disposal request form: the form sits in a ContentPanel at the one panel spacing (spec 2D D9)" and "V5 the required selects that nothing checks only count down (spec §5)"; Step 4 is their edit.
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Pin and guard edits** (exact old → new; each old string occurs once in its file):
  - `tests/disposal-sweep-ui.test.ts`, old (exact):

    ```text
      assert.match(source, /<ContentPanel>\n\s+<form onSubmit=\{handleSubmit\} className="grid grid-cols-1 gap-5 md:grid-cols-2">/)
    ```

    new:

    ```text
      assert.match(source, /<ContentPanel>\n\s+<form onSubmit=\{handleSubmit\} noValidate className="grid grid-cols-1 gap-5 md:grid-cols-2">/)
    ```

  - `tests/validation-guards.test.ts`, old (exact):

    ```text
    const SELECT_TAGS = ["SearchableSelect", "MaintenanceOptionSelect", "AuditScanCheckField"]
    ```

    new:

    ```text
    // Toasts outside a catch in a V form that are not about a field (spec U2: toasts stay for other failures), with the exact
    // count per file, why each stays a toast and the ruling that keeps it. Never a validation message; a count that drops
    // lowers or deletes its row.
    const NON_VALIDATION_TOASTS: Readonly<Record<string, { count: number; why: string; ruling: string }>> = {
      [`${C}disposal/disposal-request-form.tsx`]: { count: 1, why: "the request is saved and some evidence files did not upload", ruling: "v-track plan 2 D-R5" },
    }
    
    const SELECT_TAGS = ["SearchableSelect", "MaintenanceOptionSelect", "AuditScanCheckField"]
    ```

  - `tests/validation-guards.test.ts`, old (exact):

    ```text
      const problems = V_FORMS.flatMap((path) => linesOutsideCatch(read(path), VALIDATION_TOAST).map((line) => `${path}:${line}`))
    ```

    new:

    ```text
      const problems: string[] = []
      for (const path of V_FORMS) {
        const lines = linesOutsideCatch(read(path), VALIDATION_TOAST)
        const allowed = NON_VALIDATION_TOASTS[path]?.count ?? 0
        if (lines.length !== allowed) problems.push(`${path}: ${lines.length} outside a catch (lines ${lines.join(", ")}), NON_VALIDATION_TOASTS allows ${allowed}`)
      }
      for (const path of Object.keys(NON_VALIDATION_TOASTS)) if (!V_FORMS.includes(path)) problems.push(`NON_VALIDATION_TOASTS: ${path} is not in V_FORMS`)
    ```

  - `tests/validation-guards.test.ts`, `V_FORMS` (order-independent anchor, A-D3 below): old `const V_FORMS: readonly string[] = [` + line break → new, the same line, then the row `` `${C}disposal/disposal-request-form.tsx`, `` (two spaces before it).
  - `tests/validation-guards.test.ts`, `SELECT_STAR_ONLY`: delete the line `` [`${C}disposal/disposal-request-form.tsx`]: 1, `` (two spaces before it) **inside `SELECT_STAR_ONLY`**: the file has two such lines, `V_SCOPE`'s first (it stays) and `SELECT_STAR_ONLY`'s second.
  - In this plan's order this task creates the list (P-R4). Only if `NON_VALIDATION_TOASTS` already existed when this task ran would you skip the two `validation-guards` edits above that create it and change V3, and insert only the request row directly after `const NON_VALIDATION_TOASTS: Readonly<Record<string, { count: number; why: string; ruling: string }>> = {`.
- [ ] **Step 5: Verify.** `node --test tests/v-track2-d.test.ts tests/disposal-sweep-ui.test.ts tests/disposal-route-structure.test.ts tests/file-evidence-ui.test.ts tests/choice-controls-ui.test.ts tests/disposal-forms-ux.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/visual-foundation-guards.test.ts` (129 tests, 0 fail); `npm test` (+1; 2277 tests, 2276 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint`. `node <tools>/eol.mjs src/components/disposal/disposal-request-form.tsx src/components/disposal/disposal-asset-picker.tsx tests/v-track2-d.test.ts` prints `345 345`, `79 79`, `0 152`.
- [ ] **Step 6: Commit.** `git add src/components/disposal/disposal-request-form.tsx src/components/disposal/disposal-asset-picker.tsx tests/v-track2-d.test.ts tests/validation-guards.test.ts tests/disposal-sweep-ui.test.ts`, then `git commit -m "feat(disposal): the disposal request checks its asset, requester and reason on save and shows errors under the field (v-track plan 2 task 21, D2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 22 (D3): The disposal batch checks its requester and reason when it is reviewed and says why review waits for assets (`c/disposal/disposal-batch-form.tsx`, messages)

Spec §4.2 (a review step hands a field error back), §4.4 (the mixed gate splits), §5 #24; D-R3, D-R4, D-R5, D-R6.

**Files:**
- Modify: `src/components/disposal/disposal-batch-form.tsx` (CRLF); `messages/th.json`, `messages/en.json` (CRLF, through `scripts/messages-edit.mjs`)
- Guard: `tests/validation-guards.test.ts`
- Test: `tests/v-track2-d.test.ts` (LF)

**Changes at e1caa29:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| imports `:19-23` | as D2's request form | `getApiErrorKey`; the policy import one name per line with `getDisposalRequestReasonError` first; `import { maxLength, range, required } from "@/lib/validation-rules"` after `display-format`; `useFieldErrors, useValidationMessage` after `use-api-error` | M-R3 |
| after `type Option` `:25` | — | `type DisposalBatchValues` (the six `string` values); the table `requestedById: "disposal-batch-requested-by"`, `saleValue: "disposal-batch-sale-value"`, `salvageValue: "disposal-batch-salvage-value"`, `reason: "disposal-batch-reason"` with the comment `// The fields of the edit step in visual order, keyed like the request body, with the id focus moves to (v-track M-R1).` / `// The type always holds a choice and the approver has no rule, so they stay out; the asset count is a prerequisite.`; `shownFields` as D2's; `validate` as D2's minus the asset and the type (the Step 1 test's rules), its comment `// The content rules the review button used to hide behind its gate, and the controls' min, minLength and maxLength,` / `// which nothing applied because the step was not a form (v-track M-R2, D-R3).` | M-R1, M-R2, D-R4, D-R6 |
| `:37-40` | `useState({ disposalType: … })`; `const valid = selectedIds.length >= 2 && … && Boolean(values.requestedById)` | `useState<DisposalBatchValues>({ … })`; the hook and `validationMessage`; `valid` goes; `// A prerequisite, not a field (spec §4.4): review waits for 2 to 100 assets and says so beside the button.` / `const needsAssets = selectedIds.length < 2 \|\| selectedIds.length > 100`; `// A field the server names on the review step sends the person back to the edit step that owns it (spec §4.2).` / `const focusFirstError = () => fieldErrors.focusFirst(shownFields(values), { idFor: (key) => FIELD_IDS[key], reveal: () => setReviewing(false) })`; `setField(field: keyof DisposalBatchValues, value: string)` (`setValues`, then `// The type decides which estimated values show: it clears them.` / `if (field === "disposalType") fieldErrors.clear("saleValue", "salvageValue")` / `else if (field in FIELD_IDS) fieldErrors.clear(field as DisposalBatchField)`); `function handleReview(event: React.FormEvent<HTMLFormElement>)` as the Step 1 test reads it | D-R3 |
| `submit :42-43` | `async function submit() {` / `if (!valid) return` | the `if` goes | D-R3 |
| `:52` | `if (!response.ok) throw new Error(getDisposalApiErrorMessage(payload, t, tCommon("error")))` | `if (!response.ok) {` / `// A refusal that names a field of the edit step shows under it there; any other keeps the toast (spec §4.1, §4.2).` / `if (fieldErrors.applyServer(payload) && focusFirstError()) return` / the `throw` / `}` | D-R3 |
| `:61` | `if (failedUploads > 0) toast.warning(…)` | unchanged (D-R5) | D-R5 |
| `:111` | `<div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">` and its closing `</div>` `:162` | `<form onSubmit={handleReview} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">` … `</form>` | D-R3, FIXED 6 |
| `:127` | `<NativeSelect value={values.disposalType} onChange={(event) => setValues((current) => ({ ...current, disposalType: event.target.value }))}>` | `<NativeSelect value={values.disposalType} onChange={(event) => setField("disposalType", event.target.value)}>` | D-R4 |
| `:131` | the one-line requester `<SearchableSelect label={t("requestedBy")} required … />` | one prop per line: `id="disposal-batch-requested-by"`, `label`, `required`, `value`, `options`, `placeholder`, `searchPlaceholder`, `emptyLabel`, `error={fieldErrors.message("requestedById")}`, `onChange` a block (the same `setValues`, then `fieldErrors.clear("requestedById")`) | V4 |
| `:134-135`, `:139-140` | `<Field label={t("saleValueBaht")}>` + its `Input` `onChange={(event) => setValues(…)}` (salvage likewise) | as D2's money `Field`s with `disposal-batch-sale-value` / `-salvage-value`; each `onChange={(event) => setField("saleValue", event.target.value)}` (`salvageValue`) | D-R11 |
| `:143-148` | `<Field label={t("reason")} required hint={…}>`; `onChange={(event) => setValues(…)}` | `id="disposal-batch-reason"` after `label`, `error` as D2's reason after `hint`; `onChange={(event) => setField("reason", event.target.value)}` | M-R4 |
| `:157-160` | `<Button disabled={!valid} onClick={() => setReviewing(true)} className="w-full">` … `</Button>` | `<Button` / `type="submit"` / `aria-disabled={needsAssets \|\| undefined}` / `aria-describedby={needsAssets ? "disposal-batch-review-reason" : undefined}` / `className="w-full"` / `>` … `</Button>`, then `{needsAssets ? <p id="disposal-batch-review-reason" className="text-meta text-muted-foreground">{t("batchNeedsAssets")}</p> : null}` | D-R3 |
| messages | — | change file `<temp>/d3-messages.json`: `{"set":{"th":{"disposalPage.batchNeedsAssets":"เลือกทรัพย์สินอย่างน้อย 2 รายการก่อนตรวจสอบชุดคำขอ"},"en":{"disposalPage.batchNeedsAssets":"Select at least 2 assets before you review the batch."}}}`, then `node scripts/messages-edit.mjs <temp>/d3-messages.json` | D-R3 |

"`shownFields` as D2's" keeps D2's body; its comment here reads (exact, as rehearsed; no test reads it): `// The fields the edit step shows: the estimated values follow the type. A hidden field is neither checked nor focused` / `// (v-track D-R4).`

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-d.test.ts`:

```ts

test("disposal batch: the edit step is a form whose requester and reason are errors on review, and the asset count says why review waits (v-track D3)", () => {
  const source = read(`${C}disposal/disposal-batch-form.tsx`)
  assertMigratedForm(source, {
    handler: "handleReview",
    ids: {
      requestedById: "disposal-batch-requested-by",
      saleValue: "disposal-batch-sale-value",
      salvageValue: "disposal-batch-salvage-value",
      reason: "disposal-batch-reason",
    },
    messages: ["requestedById"],
    toasts: 1,
  })
  const rules = validateBody(source)
  for (const rule of [
    'check("requestedById", required(values.requestedById))',
    'check("saleValue", range(values.saleValue, 0))',
    'check("salvageValue", range(values.salvageValue, 0))',
    "const reasonTooShort = getDisposalRequestReasonError(values.reason)",
    'check("reason", required(values.reason) ?? (reasonTooShort && getApiErrorKey(reasonTooShort)) ?? maxLength(values.reason, 4000))',
  ]) assert.ok(rules.includes(rule), rule)
  // The old gate mixed a prerequisite with content rules (spec §4.4): the reason and the requester are now errors on
  // review, and only the asset count still holds the button, focusable and tied to the visible reason beside it.
  assert.doesNotMatch(source, /const valid = /)
  assert.doesNotMatch(source, /(?<![\w-])disabled=\{!valid\}/)
  assert.match(source, /const needsAssets = selectedIds\.length < 2 \|\| selectedIds\.length > 100\n/)
  assert.match(source, /event\.preventDefault\(\)\n\s+if \(needsAssets\) return\n\s+fieldErrors\.setErrors\(validate\(values\)\)\n\s+if \(focusFirstError\(\)\) return\n\s+setReviewing\(true\)/)
  assert.match(source, /<Button\n\s+type="submit"\n\s+aria-disabled=\{needsAssets \|\| undefined\}\n\s+aria-describedby=\{needsAssets \? "disposal-batch-review-reason" : undefined\}\n\s+className="w-full"\n\s+>/)
  assert.ok(source.includes('{needsAssets ? <p id="disposal-batch-review-reason" className="text-meta text-muted-foreground">{t("batchNeedsAssets")}</p> : null}'))
  // A refusal on the review step goes back to the edit step that owns the field (spec §4.2): reveal leaves the review.
  assert.ok(source.includes("const focusFirstError = () => fieldErrors.focusFirst(shownFields(values), { idFor: (key) => FIELD_IDS[key], reveal: () => setReviewing(false) })"))
  // A hidden estimated value is neither checked nor focused (D-R4), and a type change clears them.
  assert.ok(rules.includes("if (code && shown.includes(key)) errors[key] = code"))
  assert.match(source, /if \(field === "disposalType"\) fieldErrors\.clear\("saleValue", "salvageValue"\)\n\s+else if \(field in FIELD_IDS\) fieldErrors\.clear\(field as DisposalBatchField\)/)
  assert.ok(source.includes('<NativeSelect value={values.disposalType} onChange={(event) => setField("disposalType", event.target.value)}>'))
  assert.doesNotMatch(source, /if \(!valid\) return/)
  assert.match(source, /onChange=\{\(value\) => \{\n\s+setValues\(\(current\) => \(\{ \.\.\.current, requestedById: value, approverId: current\.approverId === value \? "" : current\.approverId \}\)\)\n\s+fieldErrors\.clear\("requestedById"\)\n/)
  for (const locale of ["th", "en"] as const) {
    assert.equal(typeof JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).disposalPage.batchNeedsAssets, "string", locale)
  }
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-d.test.ts`. Expected to fail: "disposal batch: the edit step is a form whose requester and reason are errors on review, and the asset count says why review waits (v-track D3)" ("noValidate directly after onSubmit"). After Step 3 and before Step 4, `node --test tests/validation-guards.test.ts` fails "V5 the required selects that nothing checks only count down (spec §5)" (no other pin breaks: `tests/disposal-sweep-ui.test.ts`, `file-evidence-ui`, `disposal-batch`, `disposal-route-structure`, `disposal-forms-ux` and LFG read text the change keeps); Step 4 is its edit.
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard edits:**
  - `V_FORMS`: insert the row `` `${C}disposal/disposal-batch-form.tsx`, `` directly after `const V_FORMS: readonly string[] = [`.
  - `SELECT_STAR_ONLY`: delete its line `` [`${C}disposal/disposal-batch-form.tsx`]: 1, `` (the second of the file's two such lines; `V_SCOPE`'s stays).
  - `NON_VALIDATION_TOASTS`: insert directly after `const NON_VALIDATION_TOASTS: Readonly<Record<string, { count: number; why: string; ruling: string }>> = {` the row ``  [`${C}disposal/disposal-batch-form.tsx`]: { count: 1, why: "the batch is saved and some shared evidence files did not upload", ruling: "v-track plan 2 D-R5" },``.
- [ ] **Step 5: Verify.** `node --test tests/v-track2-d.test.ts tests/disposal-sweep-ui.test.ts tests/disposal-route-structure.test.ts tests/file-evidence-ui.test.ts tests/disposal-batch.test.ts tests/disposal-forms-ux.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/visual-foundation-guards.test.ts tests/list-frame-guards.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts` (156 tests, 0 fail); `npm test` (+1; 2278 tests, 2277 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint`. Messages +1 key per locale (4089 on this plan's chain). eol: `274 274` (batch form), `0 194` (test).
- [ ] **Step 6: Commit.** `git add src/components/disposal/disposal-batch-form.tsx tests/v-track2-d.test.ts tests/validation-guards.test.ts messages/th.json messages/en.json`, then `git commit -m "feat(disposal): the disposal batch checks its requester and reason when it is reviewed and says why review waits for assets (v-track plan 2 task 22, D3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 23 (D4): The disposal decision checks a rejection's reason on save and keeps the server's refusal under its field (`c/disposal/disposal-decision-button.tsx`)

Spec §4.4 (the rejection reason is content, its button enabled), §4.1, §5 #25; D-R4, D-R6, D-R10, D-R11.

**Files:** Modify `src/components/disposal/disposal-decision-button.tsx` (CRLF) · Guard `tests/validation-guards.test.ts` · Test `tests/v-track2-d.test.ts` (LF).

**Changes at e1caa29:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| imports `:21-23` | `getDisposalApiErrorMessage`; `showsEstimatedSaleValue, showsEstimatedSalvageValue, type DisposalType`; `useApiError` | `import { getApiErrorKey } from "@/lib/api-error-catalog"` first; the policy import one name per line with `getDisposalDecisionFieldErrors` first; `import { maxLength, range, required } from "@/lib/validation-rules"`; `import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"` last | M-R3 |
| after `type DecisionValues` `:27-33` | — | the table `decision: "disposal-decision-decision"`, `nextStatusId: "disposal-decision-next-status"`, `saleValue: "disposal-decision-sale-value"`, `salvageValue: "disposal-decision-salvage-value"`, `approvalRemark: "disposal-decision-remark"`; `type DecisionField`, `FIELD_ORDER`, `type DecisionFieldErrors = ReturnType<typeof useFieldErrors<DecisionField>>`; `shownFields(values: DecisionValues, disposalType: DisposalType)` (next status for an approval, the money keys by type); `validate(values: DecisionValues, disposalType: DisposalType)` with the Step 1 test's rules, its comment `// noValidate turns the browser's check off, so this restates the controls' required, min and maxLength; a rejection's` / `// reason comes from the server's own rule, getDisposalDecisionFieldErrors, whose code is its catalog key, and is no` / `// longer a disabled save (v-track M-R2, D-R6).` | M-R1, M-R2, D-R4, D-R6 |
| before `setField :78` | — | `const fieldErrors = useFieldErrors<DecisionField>()`; `const focusFirstError = () => fieldErrors.focusFirst(shownFields(values, disposalType as DisposalType), { idFor: (key) => FIELD_IDS[key] })` | D-R10 |
| `setField :78-88` | ends `    })` / `  }` | after the `setValues` call: `// The decision sets which status is shown and whether the reason is required: it clears them with itself.` / `if (field === "decision") fieldErrors.clear("decision", "nextStatusId", "approvalRemark")` / `else fieldErrors.clear(field)`; then `function closeDialog() { fieldErrors.setErrors({}); setOpen(false) }` (three lines) | M-R5, D-R10 |
| `handleSubmit :91-92` | `event.preventDefault()` / `setSaving(true)` | `event.preventDefault()` / `fieldErrors.setErrors(validate(values, disposalType as DisposalType))` / `if (focusFirstError()) return` / `setSaving(true)` | M-R4 |
| `:106` | `if (!response.ok) throw new Error(getDisposalApiErrorMessage(payload, t, tCommon("error")))` | `if (!response.ok) {` / `// A refusal that names a field the dialog shows lands under it, the dialog still open; any other keeps the toast.` / `if (fieldErrors.applyServer(payload) && focusFirstError()) return` / the `throw` / `}` | M-R4 |
| `:133-134` | `triggerRef={returnFocusRef ?? triggerRef}` / `onClose={() => setOpen(false)}` | `triggerRef=…` / `fieldErrors={fieldErrors}` / `onClose={closeDialog}` | D-R10 |
| `DecisionDialog` props `:150-162` | `triggerRef,` … `triggerRef: React.RefObject<HTMLElement \| null>` | `fieldErrors,` after `triggerRef,`; `fieldErrors: DecisionFieldErrors` after its type; in the body `const validationMessage = useValidationMessage()` after `const t` | D-R10 |
| `:186` | `<form onSubmit={onSubmit} className={accessibleDialogFormClasses}>` | `<form onSubmit={onSubmit} noValidate className={accessibleDialogFormClasses}>` | FIXED 6 |
| `:188`, `:195`, `:204`, `:209`, `:214` | the five `Field`s | `<Field label={t("decision")} id="disposal-decision-decision" required error={fieldErrors.message("decision")}>`; the next status one prop per line with `id="disposal-decision-next-status"` after `label` and `error={fieldErrors.message("nextStatusId")}` last; the money fields as D2's (`disposal-decision-sale-value`, `-salvage-value`); the remark one prop per line with `id="disposal-decision-remark"` after `label` and `error={fieldErrors.message("approvalRemark")}` last | M-R5, D-R11 |
| `:221` | `<Button type="submit" busy={saving} disabled={rejectionReasonRequired && !values.approvalRemark.trim()}>` | `<Button type="submit" busy={saving}>` | D-R6 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-d.test.ts`:

```ts

test("disposal decision: a rejection's reason is an error on save through the server's own rule, and a refusal lands under its field in the open dialog (v-track D4)", () => {
  const source = read(`${C}disposal/disposal-decision-button.tsx`)
  assertMigratedForm(source, {
    handler: "onSubmit",
    ids: {
      decision: "disposal-decision-decision",
      nextStatusId: "disposal-decision-next-status",
      saleValue: "disposal-decision-sale-value",
      salvageValue: "disposal-decision-salvage-value",
      approvalRemark: "disposal-decision-remark",
    },
    messages: ["decision", "nextStatusId", "approvalRemark"],
  })
  assert.match(source, /^function validate\(values: DecisionValues, disposalType: DisposalType\): Partial<Record<DecisionField, string>> \{$/m)
  const rules = validateBody(source)
  for (const rule of [
    "if (code && shown.includes(key)) errors[key] = code",
    'check("decision", required(values.decision))',
    'check("nextStatusId", required(values.nextStatusId))',
    'check("saleValue", range(values.saleValue, 0))',
    'check("salvageValue", range(values.salvageValue, 0))',
    'check("approvalRemark", maxLength(values.approvalRemark, 4000))',
    // The server's own rule (spec §7.2): its message's catalog key is the code, rejectionReasonRequired.
    "for (const error of getDisposalDecisionFieldErrors(values)) check(error.field, getApiErrorKey(error.message))",
  ]) assert.ok(rules.includes(rule), rule)
  // A content rule, not a gate (spec §4.4): save is enabled while the reason is empty.
  assert.doesNotMatch(source, /(?<![\w-])disabled=\{rejectionReasonRequired/)
  assert.match(source, /<Button type="submit" busy=\{saving\}>\n\s+<CheckCircle2 aria-hidden="true" \/>/)
  // Only the fields the dialog shows are checked and focused, so a refusal about a hidden one keeps the toast (D-R4).
  assert.match(source, /if \(key === "nextStatusId"\) return values\.decision === "approve"\n\s+if \(key === "saleValue"\) return showsEstimatedSaleValue\(disposalType\)\n\s+if \(key === "salvageValue"\) return showsEstimatedSalvageValue\(disposalType\)\n/)
  assert.ok(source.includes("const focusFirstError = () => fieldErrors.focusFirst(shownFields(values, disposalType as DisposalType), { idFor: (key) => FIELD_IDS[key] })"))
  // The hook lives with the submit; the dialog shows its errors and closing it clears them.
  assert.ok(source.includes("type DecisionFieldErrors = ReturnType<typeof useFieldErrors<DecisionField>>"))
  assert.match(source, /function closeDialog\(\) \{\n\s+fieldErrors\.setErrors\(\{\}\)\n\s+setOpen\(false\)\n\s+\}/)
  assert.match(source, /fieldErrors=\{fieldErrors\}\n\s+onClose=\{closeDialog\}/)
  assert.match(source, /if \(field === "decision"\) fieldErrors\.clear\("decision", "nextStatusId", "approvalRemark"\)\n\s+else fieldErrors\.clear\(field\)/)
  for (const key of ["saleValue", "salvageValue"]) {
    assert.ok(source.includes(`error={fieldErrors.errors.${key} ? validationMessage(fieldErrors.errors.${key}, { min: 0 }) : undefined}`), key)
  }
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-d.test.ts`. Expected to fail: "disposal decision: a rejection's reason is an error on save through the server's own rule, and a refusal lands under its field in the open dialog (v-track D4)" ("noValidate directly after onSubmit"). No pin fails after Step 3 (`tests/dialog-trigger-handles.test.ts`, `disposal-detail-workspace`, `disposal-sweep-ui` read text the change keeps).
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Guard edit:** `V_FORMS`: insert `` `${C}disposal/disposal-decision-button.tsx`, `` directly after `const V_FORMS: readonly string[] = [`.
- [ ] **Step 5: Verify.** `node --test tests/v-track2-d.test.ts tests/dialog-trigger-handles.test.ts tests/disposal-detail-workspace.test.ts tests/disposal-sweep-ui.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/visual-foundation-guards.test.ts tests/ui-overlay-guards.test.ts tests/accessible-dialog.test.ts tests/confirm-dialog-ui.test.ts` (121 tests, 0 fail); `npm test` (+1; 2279 tests, 2278 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint`. eol: `319 319`, `0 235`.
- [ ] **Step 6: Commit.** `git add src/components/disposal/disposal-decision-button.tsx tests/v-track2-d.test.ts tests/validation-guards.test.ts`, then `git commit -m "feat(disposal): the disposal decision checks a rejection's reason on save and keeps the server's refusal under its field (v-track plan 2 task 23, D4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 24 (D5): The disposal execution checks its executor, its type's rules and the historical exception on save and says why save waits for evidence (`c/disposal/disposal-execution-button.tsx`)

Spec §4.4 (the historical reason ≥ 20 and the acknowledgement are content; evidence is a prerequisite), §5 #26 (the executor star); D-R4, D-R6, D-R7, D-R10, D-R11; uses D1.

**Files:** Modify `src/components/disposal/disposal-execution-button.tsx` (CRLF) · Pins `tests/disposal-sweep-ui.test.ts` (CRLF) · Guard `tests/validation-guards.test.ts` · Test `tests/v-track2-d.test.ts` (LF).

**Changes at e1caa29:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| imports `:16-31` | `import { Field, FieldHint } from "@/components/ui/field"`; the policy import; `useApiError` | `Field, FieldError, FieldHint`; `import { getApiErrorKey } from "@/lib/api-error-catalog"` before `disposal-error-message`; `getDisposalExecutionFieldErrors` first in the policy import; `import { maxLength, minLength, range, required } from "@/lib/validation-rules"` after it; `import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"` last | M-R3 |
| before `const evidencePolicyErrorCodes :49` | — | the table (ten keys, the Step 1 test's ids); `type ExecutionField`, `FIELD_ORDER`, `type ExecutionFieldErrors = ReturnType<typeof useFieldErrors<ExecutionField>>`; `shownFields(values: ExecutionValues, disposalType: DisposalType)` (recipient by `requiresDisposalExecutionRecipient`, the actual values by `showsActualSaleValue` / `showsActualSalvageValue`, the exception's two keys by `values.useHistoricalEvidenceException`); `validate(values: ExecutionValues, disposalType: DisposalType)` with the Step 1 test's rules, where `const policyInput = { ...values, disposalType, actualSaleValue: values.actualSaleValue.trim() === "" ? null : Number(values.actualSaleValue) }` feeds `getDisposalExecutionFieldErrors`; the two comments below the table (M-R2, D-R6, D-R7) | M-R1, M-R2, D-R4, D-R6, D-R7 |
| before `closeExecutionDialog :122` | — | `const fieldErrors = useFieldErrors<ExecutionField>()`; `const focusFirstError = () => fieldErrors.focusFirst(shownFields(values, disposalType as DisposalType), { idFor: (key) => FIELD_IDS[key] })`; `// A prerequisite, not a field (spec §4.4): no evidence and no exception. The dialog's evidence Notice says why.` / `const evidenceBlocked = effectiveEvidenceCount === 0 && !values.useHistoricalEvidenceException` | D-R7, D-R10 |
| `closeExecutionDialog :122-125` | `resetHistoricalEvidenceException()` / `setOpen(false)` | `resetHistoricalEvidenceException()` / `fieldErrors.setErrors({})` / `setOpen(false)` | D-R10 |
| `setField :127-129` | `setValues(…)` | after it: `// The exception decides whether the document number is required and whether its own two fields show.` / `if (field === "useHistoricalEvidenceException") fieldErrors.clear("documentNo", "evidenceExceptionReason", "evidenceExceptionAcknowledged")` / `else if (field in FIELD_IDS) fieldErrors.clear(field as ExecutionField)` | M-R5 |
| `handleSubmit :132-133` | `event.preventDefault()` / `setSaving(true)` | `event.preventDefault()` / `if (evidenceBlocked) return` / `fieldErrors.setErrors(validate(values, disposalType as DisposalType))` / `if (focusFirstError()) return` / `setSaving(true)` | D-R7, M-R4 |
| `:158-166` | `if (!response.ok) {` / `const message = …` / `if (payload?.code && evidencePolicyErrorCodes.has(payload.code)) {` / `resetHistoricalEvidenceException()` / `setOpen(false)` / `router.refresh()` / `}` / `throw new Error(message)` | first in the block: the two-line comment below the table and `if (fieldErrors.applyServer(payload) && focusFirstError()) return`; inside the evidence branch `closeExecutionDialog()` replaces `resetHistoricalEvidenceException()` / `setOpen(false)` | D-R7 |
| `:185` | `<ExecutionDialog … canUseHistoricalEvidenceException={…} triggerRef=…` | `evidenceBlocked={evidenceBlocked} fieldErrors={fieldErrors}` before `triggerRef` | D-R10 |
| `ExecutionDialog` `:190-231` | props end `canUseHistoricalEvidenceException,` / `triggerRef,`; the body computes `evidenceBlocked`, `historicalInputInvalid`, `submitDisabled` | `evidenceBlocked,` and `fieldErrors,` after `canUseHistoricalEvidenceException,` (types `evidenceBlocked: boolean`, `fieldErrors: ExecutionFieldErrors`); `const validationMessage = useValidationMessage()` after `tCommon`; the three `const`s go | D-R7, D-R10 |
| `:248` | `<form onSubmit={onSubmit} className={accessibleDialogFormClasses}>` | `<form onSubmit={onSubmit} noValidate className={accessibleDialogFormClasses}>` | FIXED 6 |
| `:250` | `<Notice tone="warning" role="alert" className="md:col-span-2">` | `<Notice tone="warning" role="alert" id="disposal-execution-evidence-reason" className="md:col-span-2">` | D-R7 |
| `:251`, `:255`, `:261`, `:279` | `<Field label={t("executionDate")} required>`, `nextStatus`, `recipientName`, `executionRemark` | `id` after `label` (`disposal-execution-date`, `-next-status`, `-recipient`, `-remark`), `error={fieldErrors.message("<key>")}` last | M-R5 |
| `:254` | the one-line executor `<SearchableSelect label={t("executedBy")} … required … />` | one prop per line, `id="disposal-execution-executed-by"` first, `error={fieldErrors.message("executedById")}` before `onChange` | V4 |
| `:265` | `<Field label={t("documentNo")} required={!values.useHistoricalEvidenceException}>` | one prop per line: `label`, `id="disposal-execution-document-no"`, `required={…}`, `error={fieldErrors.message("documentNo")}` | M-R5 |
| `:269`, `:274` | `<Field label={t("actualSaleValueBaht")} required>`, `<Field label={t("actualSalvageValueBaht")}>` | one prop per line with `id="disposal-execution-sale-value"` (`-salvage-value`) and D2's money `error` (`actualSaleValue`, `actualSalvageValue`) | D-R11 |
| `:287` | `<Field label={t("historicalEvidenceReason")} required>` | the JSX comment `{/* The reason and the acknowledgement are errors on save (spec §4.4); both say the rule in the domain's words. */}` above it; one prop per line: `label`, `id="disposal-execution-exception-reason"`, `required`, `error={fieldErrors.errors.evidenceExceptionReason ? t("errors.DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED") : undefined}` | D-R7 |
| `:292` | `<div className="md:col-span-2"><label …><input type="checkbox" checked={values.evidenceExceptionAcknowledged} required disabled={saving} onChange={…} className={checkboxVariants()} />{t("historicalEvidenceAcknowledgement")}</label></div>` | the same `div` and `label` (same classes) over several lines; the input gets `id="disposal-execution-exception-acknowledged"` first, `aria-invalid={fieldErrors.errors.evidenceExceptionAcknowledged ? true : undefined}` and `aria-describedby={fieldErrors.errors.evidenceExceptionAcknowledged ? "disposal-execution-exception-acknowledged-error" : undefined}` before `onChange`; after the `label`: `{fieldErrors.errors.evidenceExceptionAcknowledged ? (` / `<FieldError id="disposal-execution-exception-acknowledged-error" className="mt-1.5">{t("errors.DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED")}</FieldError>` / `) : null}` | D-R7 |
| `:298` | `<Button type="submit" busy={saving} disabled={submitDisabled}>` | `<Button` / `type="submit"` / `busy={saving}` / `aria-disabled={evidenceBlocked \|\| undefined}` / `aria-describedby={evidenceBlocked ? "disposal-execution-evidence-reason" : undefined}` / `>` | D-R7 |

The comments the table points to (exact, as rehearsed; no test reads them):
- above `function shownFields(`: `// The fields the dialog shows: the recipient and the actual values follow the request's type, the exception's reason and` / `// acknowledgement show while the exception is chosen. A hidden field is neither checked nor focused (v-track D-R4).`
- above `function validate(`: `// noValidate turns the browser's check off, so this restates the controls' required, min, minLength and maxLength, with` / `// the server's own rules for the type (getDisposalExecutionFieldErrors, codes are their catalog keys) and the historical` / `// exception's reason and acknowledgement, which were a disabled save (v-track M-R2, D-R6, D-R7).`
- first in the `if (!response.ok) {` block, indented eight spaces: `// A refusal that names a field the dialog shows lands under it, the dialog still open (spec §4.1); the evidence` / `// reason and acknowledgement name theirs (v-track D1), so only the evidence refusals about no field still close.`

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-d.test.ts`:

```ts

test("disposal execution: the executor, the type's own rules and the historical exception are errors on save, and missing evidence says why save waits (v-track D5)", () => {
  const source = read(`${C}disposal/disposal-execution-button.tsx`)
  assertMigratedForm(source, {
    handler: "onSubmit",
    ids: {
      executionDate: "disposal-execution-date",
      executedById: "disposal-execution-executed-by",
      nextStatusId: "disposal-execution-next-status",
      recipientName: "disposal-execution-recipient",
      documentNo: "disposal-execution-document-no",
      actualSaleValue: "disposal-execution-sale-value",
      actualSalvageValue: "disposal-execution-salvage-value",
      executionRemark: "disposal-execution-remark",
      evidenceExceptionReason: "disposal-execution-exception-reason",
      evidenceExceptionAcknowledged: "disposal-execution-exception-acknowledged",
    },
    messages: ["executionDate", "executedById", "nextStatusId", "recipientName", "documentNo", "executionRemark"],
  })
  const rules = validateBody(source)
  for (const rule of [
    "if (code && shown.includes(key)) errors[key] = code",
    'check("executionDate", required(values.executionDate))',
    'check("executedById", required(values.executedById))',
    'check("nextStatusId", required(values.nextStatusId))',
    'check("recipientName", maxLength(values.recipientName, 200))',
    'check("documentNo", maxLength(values.documentNo, 100))',
    'check("actualSaleValue", range(values.actualSaleValue, 0))',
    'check("actualSalvageValue", range(values.actualSalvageValue, 0))',
    'check("executionRemark", maxLength(values.executionRemark, 4000))',
    // The server's own rules for the type (spec §7.2): recipient, document, sale value and remark, by catalog key.
    "for (const error of getDisposalExecutionFieldErrors(policyInput)) check(error.field, getApiErrorKey(error.message))",
    // The historical exception (spec §4.4): content rules, no longer a disabled save.
    'check("evidenceExceptionReason", required(values.evidenceExceptionReason) ?? minLength(values.evidenceExceptionReason, 20) ?? maxLength(values.evidenceExceptionReason, 2000))',
    'check("evidenceExceptionAcknowledged", required(values.evidenceExceptionAcknowledged))',
  ]) assert.ok(rules.includes(rule), rule)
  assert.doesNotMatch(source, /historicalInputInvalid|submitDisabled/)
  // The prerequisite (no evidence and no exception) keeps its gate, focusable and tied to the dialog's evidence Notice.
  assert.match(source, /const evidenceBlocked = effectiveEvidenceCount === 0 && !values\.useHistoricalEvidenceException\n/)
  assert.match(source, /event\.preventDefault\(\)\n\s+if \(evidenceBlocked\) return\n\s+fieldErrors\.setErrors\(validate\(values, disposalType as DisposalType\)\)/)
  assert.match(source, /<Button\n\s+type="submit"\n\s+busy=\{saving\}\n\s+aria-disabled=\{evidenceBlocked \|\| undefined\}\n\s+aria-describedby=\{evidenceBlocked \? "disposal-execution-evidence-reason" : undefined\}\n\s+>/)
  assert.ok(source.includes('<Notice tone="warning" role="alert" id="disposal-execution-evidence-reason" className="md:col-span-2">'))
  // The executor star is checked now (spec §5), and the exception's two fields say the rule in the domain's words.
  assert.match(source, /<SearchableSelect\n\s+id="disposal-execution-executed-by"\n/)
  assert.ok(source.includes('error={fieldErrors.errors.evidenceExceptionReason ? t("errors.DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED") : undefined}'))
  assert.ok(source.includes('<FieldError id="disposal-execution-exception-acknowledged-error" className="mt-1.5">{t("errors.DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED")}</FieldError>'))
  assert.match(source, /aria-describedby=\{fieldErrors\.errors\.evidenceExceptionAcknowledged \? "disposal-execution-exception-acknowledged-error" : undefined\}/)
  // A field refusal stays in the open dialog before the evidence refusals that are about no field close it (D1, D-R1).
  assert.match(source, /if \(fieldErrors\.applyServer\(payload\) && focusFirstError\(\)\) return\n\s+const message = getDisposalApiErrorMessage\(payload, t, tCommon\("error"\)\)\n\s+if \(payload\?\.code && evidencePolicyErrorCodes\.has\(payload\.code\)\) \{\n\s+closeExecutionDialog\(\)/)
  assert.match(source, /function closeExecutionDialog\(\) \{\n\s+resetHistoricalEvidenceException\(\)\n\s+fieldErrors\.setErrors\(\{\}\)\n\s+setOpen\(false\)\n\s+\}/)
  assert.match(source, /if \(field === "useHistoricalEvidenceException"\) fieldErrors\.clear\("documentNo", "evidenceExceptionReason", "evidenceExceptionAcknowledged"\)\n\s+else if \(field in FIELD_IDS\) fieldErrors\.clear\(field as ExecutionField\)/)
  assert.match(source, /if \(key === "evidenceExceptionReason" \|\| key === "evidenceExceptionAcknowledged"\) return values\.useHistoricalEvidenceException\n/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-d.test.ts`. Expected to fail: "disposal execution: the executor, the type's own rules and the historical exception are errors on save, and missing evidence says why save waits (v-track D5)" ("noValidate directly after onSubmit"). After Step 3 and before Step 4, `node --test tests/disposal-sweep-ui.test.ts tests/validation-guards.test.ts` fails "disposal execution dialog: the missing-evidence and historical warnings are warning Notices (spec 2D D7)" and "V5 the required selects that nothing checks only count down (spec §5)"; `tests/disposal-evidence-exception.test.ts` stays green (`resetHistoricalEvidenceException()`, `setOpen(false)`, `router.refresh()`, `minLength={20}`, `aria-describedby={evidenceExceptionReasonHelpId}` all stay).
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Pin and guard edits:**
  - `tests/disposal-sweep-ui.test.ts`, old (exact):

    ```text
      assert.match(source, /<Notice tone="warning" role="alert" className="md:col-span-2">\{t\("errors\.DISPOSAL_EVIDENCE_REQUIRED"\)\}<\/Notice>/)
    ```

    new:

    ```text
      assert.match(source, /<Notice tone="warning" role="alert" id="disposal-execution-evidence-reason" className="md:col-span-2">\{t\("errors\.DISPOSAL_EVIDENCE_REQUIRED"\)\}<\/Notice>/)
    ```

  - `V_FORMS`: insert `` `${C}disposal/disposal-execution-button.tsx`, `` directly after `const V_FORMS: readonly string[] = [`.
  - `SELECT_STAR_ONLY`: delete its line `` [`${C}disposal/disposal-execution-button.tsx`]: 1, `` (the second of the file's two such lines).
- [ ] **Step 5: Verify.** `node --test tests/v-track2-d.test.ts tests/dialog-trigger-handles.test.ts tests/disposal-detail-workspace.test.ts tests/disposal-sweep-ui.test.ts tests/disposal-evidence-exception.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/visual-foundation-guards.test.ts tests/ui-overlay-guards.test.ts tests/accessible-dialog.test.ts` (129 tests, 0 fail); `npm test` (+1; 2280 tests, 2279 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint`. eol: `432 432`, `0 288`.
- [ ] **Step 6: Commit.** `git add src/components/disposal/disposal-execution-button.tsx tests/v-track2-d.test.ts tests/validation-guards.test.ts tests/disposal-sweep-ui.test.ts`, then `git commit -m "feat(disposal): the disposal execution checks its executor, its type's rules and the historical exception on save and says why save waits for evidence (v-track plan 2 task 24, D5)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 25 (D6): Bulk approval shows a refused remark under its field and says why approve waits when nothing is eligible (`c/disposal/disposal-bulk-approval.tsx`)

Spec §4.4 (nothing eligible is a prerequisite), §4.1, §5 #27; D-R8.

**Files:** Modify `src/components/disposal/disposal-bulk-approval.tsx` (CRLF) · Pins `tests/disposal-sweep-ui.test.ts`, `tests/disposal-bulk-approval.test.ts` (CRLF) · Guard `tests/validation-guards.test.ts` · Test `tests/v-track2-d.test.ts` (LF).

**Changes at e1caa29:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| imports `:34-37` | `Textarea`, `formatCount`, `shouldGuardLinkClick`, `cn` | `import { useFieldErrors } from "@/components/ui/use-field-errors"` after `textarea`; `import { readFieldErrors } from "@/lib/field-error-client"` after `display-format`; `import { maxLength } from "@/lib/validation-rules"` after `utils` | M-R3 |
| after `MAX_DISPOSAL_BULK_APPROVAL_ITEMS` `:39` | — | the table `approvalRemark: "disposal-bulk-approval-remark"` (comment `// The dialog's one field, keyed like the request body, with the id focus moves to (v-track M-R1).`), `type BulkApprovalField`, `FIELD_ORDER`; `function validate(values: { approvalRemark: string })` with the one rule, its comment `// noValidate turns the browser's check off, so this restates the remark's maxLength (v-track M-R2). Nothing eligible is` / `// a prerequisite, not a field: the approve button keeps that gate (v-track D-R8).` | M-R1, M-R2 |
| `:112` | `  commit: () => Promise<void>` | `  // Resolves to the server's body when it refused the shared remark (the dialog shows it under the field), else nothing.` / `  commit: () => Promise<unknown>` | D-R8 |
| `send :267` | `throw new Error(mode === "preview" ? copy.requestFailed : copy.approvalFailed)` | `// The body rides along as the cause, so a refusal of the remark can go back to its field (v-track D-R8).` / `throw new Error(mode === "preview" ? copy.requestFailed : copy.approvalFailed, { cause: payload })` | D-R8 |
| `commit`'s catch `:316-319` | `if (!isCurrentRequest(…)) return` / `setError(…)` | between them: `// A refusal of the shared remark goes back to the dialog, which shows it under the field (spec §4.1).` / `if (caught instanceof Error && readFieldErrors(caught.cause)?.approvalRemark) {` / `setDialogState("preview")` / `return caught.cause` / `}` | D-R8 |
| `DisposalBulkApprovalDialog` `:544-549` | `const description = …` / `function handleSubmit(event: FormEvent<HTMLFormElement>) {` / `event.preventDefault()` / `if (dialogState === "preview") void commit()` | after `description`: the hook, `focusFirstError` (plan 1 M1's), `// A prerequisite, not a field (spec §4.4): nothing to approve. The zero-eligible Notice says why.` / `const nothingEligible = eligible.length === 0`; `async function handleSubmit` as the Step 1 test reads it | D-R8 |
| `:562` | `<form data-disposal-bulk-dialog="true" onSubmit={handleSubmit} className={accessibleDialogFormClasses}>` | `… onSubmit={handleSubmit} noValidate className=…` | FIXED 6 |
| `:578` | `<Notice tone="warning" role="alert">{copy.zeroEligible}</Notice>` | `<Notice tone="warning" role="alert" id="disposal-bulk-approval-zero-eligible">{copy.zeroEligible}</Notice>` | D-R8 |
| `:580-585` | `<Field` / `label={copy.sharedRemark}` / `hint={…}` / `>` / the one-line `Textarea` | `id="disposal-bulk-approval-remark"` after `label`, `error={fieldErrors.message("approvalRemark")}` after `hint`; the `Textarea` one prop per line, `onChange` a block: `setApprovalRemark(event.target.value)` / `fieldErrors.clear("approvalRemark")` | M-R5 |
| `:594` | `<Button type="submit" busy={dialogState === "committing"} disabled={eligible.length === 0}>` | `<Button` / `type="submit"` / `busy={dialogState === "committing"}` / `aria-disabled={nothingEligible \|\| undefined}` / `aria-describedby={nothingEligible ? "disposal-bulk-approval-zero-eligible" : undefined}` / `>` | D-R8 |

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-d.test.ts`:

```ts

test("disposal bulk approval: the shared remark shows its error under the field, and nothing eligible says why approve waits (v-track D6)", () => {
  const source = read(`${C}disposal/disposal-bulk-approval.tsx`)
  assertMigratedForm(source, { ids: { approvalRemark: "disposal-bulk-approval-remark" } })
  assert.ok(validateBody(source).includes('check("approvalRemark", maxLength(values.approvalRemark, 4000))'))
  assert.match(source, /<form data-disposal-bulk-dialog="true" onSubmit=\{handleSubmit\} noValidate className=\{accessibleDialogFormClasses\}>/)
  // The prerequisite keeps its gate, focusable and tied to the zero-eligible Notice (spec §4.4).
  assert.match(source, /const nothingEligible = eligible\.length === 0\n/)
  assert.match(source, /event\.preventDefault\(\)\n\s+if \(dialogState !== "preview" \|\| nothingEligible\) return\n\s+fieldErrors\.setErrors\(validate\(\{ approvalRemark \}\)\)/)
  assert.ok(source.includes('<Notice tone="warning" role="alert" id="disposal-bulk-approval-zero-eligible">{copy.zeroEligible}</Notice>'))
  assert.match(source, /aria-disabled=\{nothingEligible \|\| undefined\}\n\s+aria-describedby=\{nothingEligible \? "disposal-bulk-approval-zero-eligible" : undefined\}/)
  // The commit hands a refusal of the remark back to the dialog (plan 1 M-R9's pattern); every other refusal keeps the
  // dialog's danger Notice.
  assert.match(source, /commit: \(\) => Promise<unknown>/)
  assert.ok(source.includes("throw new Error(mode === \"preview\" ? copy.requestFailed : copy.approvalFailed, { cause: payload })"))
  assert.match(source, /if \(caught instanceof Error && readFieldErrors\(caught\.cause\)\?\.approvalRemark\) \{\n\s+setDialogState\("preview"\)\n\s+return caught\.cause\n\s+\}\n\s+setError\(/)
  assert.match(source, /const refusal = await commit\(\)\n\s+if \(fieldErrors\.applyServer\(refusal\) && focusFirstError\(\)\) return/)
  assert.match(source, /setApprovalRemark\(event\.target\.value\)\n\s+fieldErrors\.clear\("approvalRemark"\)/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-d.test.ts`. Expected to fail: "disposal bulk approval: the shared remark shows its error under the field, and nothing eligible says why approve waits (v-track D6)" ("noValidate directly after onSubmit"). After Step 3 and before Step 4, `node --test tests/disposal-bulk-approval.test.ts tests/disposal-sweep-ui.test.ts` fails "bulk approval dialog uses the dialog parts, a shared remark field and a busy approve button (2C batch 3)" and "bulk approval: the toolbar is a quiet grouping, errors and the zero case are Notices, the counts a StatStrip and codes tag (spec 2D M26, D7, M33)"; Step 4 is their edit.
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Pin and guard edits:**
  - `tests/disposal-sweep-ui.test.ts`, old (exact):

    ```text
      assert.match(source, /<Notice tone="warning" role="alert">\{copy\.zeroEligible\}<\/Notice>/)
    ```

    new:

    ```text
      assert.match(source, /<Notice tone="warning" role="alert" id="disposal-bulk-approval-zero-eligible">\{copy\.zeroEligible\}<\/Notice>/)
    ```

  - `tests/disposal-bulk-approval.test.ts`, old (exact):

    ```text
    onSubmit=\{handleSubmit\} className=\{accessibleDialogFormClasses\}>\n\s+<AccessibleDialogBody className="space-y-5">/)
    ```

    new:

    ```text
    onSubmit=\{handleSubmit\} noValidate className=\{accessibleDialogFormClasses\}>\n\s+<AccessibleDialogBody className="space-y-5">/)
    ```

  - `tests/disposal-bulk-approval.test.ts`, old (exact):

    ```text
      assert.match(dialog, /<Field\n\s+label=\{copy\.sharedRemark\}\n\s+hint=\{<><span className="block">\{copy\.sharedRemarkHelp\}<\/span><span className="block">\{formatCopy\(copy\.remarkLimit, \{ count: approvalRemark\.length \}\)\}<\/span><\/>\}\n\s+>\n\s+<Textarea value=\{approvalRemark\} maxLength=\{4000\} rows=\{4\} disabled=\{busy\}/)
    ```

    new:

    ```text
      // The remark shows its error under the field, and a change clears it (v-track plan 2 D6).
      assert.match(dialog, /<Field\n\s+label=\{copy\.sharedRemark\}\n\s+id="disposal-bulk-approval-remark"\n\s+hint=\{<><span className="block">\{copy\.sharedRemarkHelp\}<\/span><span className="block">\{formatCopy\(copy\.remarkLimit, \{ count: approvalRemark\.length \}\)\}<\/span><\/>\}\n\s+error=\{fieldErrors\.message\("approvalRemark"\)\}\n\s+>\n\s+<Textarea\n\s+value=\{approvalRemark\}\n\s+maxLength=\{4000\}\n\s+rows=\{4\}\n\s+disabled=\{busy\}/)
    ```

  - `tests/disposal-bulk-approval.test.ts`, old (exact):

    ```text
    \n\s+<Button type="submit" busy=\{dialogState === "committing"\} disabled=\{eligible\.length === 0\}>\n\s+<CheckSquare2 aria-hidden="true" \/>/)
    ```

    new:

    ```text
    \n\s+<Button\n\s+type="submit"\n\s+busy=\{dialogState === "committing"\}\n\s+aria-disabled=\{nothingEligible \|\| undefined\}\n\s+aria-describedby=\{nothingEligible \? "disposal-bulk-approval-zero-eligible" : undefined\}\n\s+>\n\s+<CheckSquare2 aria-hidden="true" \/>/)
    ```

  - `V_FORMS`: insert `` `${C}disposal/disposal-bulk-approval.tsx`, `` directly after `const V_FORMS: readonly string[] = [`.
- [ ] **Step 5: Verify.** `node --test tests/v-track2-d.test.ts tests/disposal-bulk-approval.test.ts tests/disposal-sweep-ui.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/visual-foundation-guards.test.ts tests/ui-overlay-guards.test.ts tests/accessible-dialog.test.ts tests/confirm-dialog-ui.test.ts tests/list-frame-guards.test.ts` (144 tests, 0 fail); `npm test` (+1; 2281 tests, 2280 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint`. eol: `675 675`, `0 307`.
- [ ] **Step 6: Commit.** `git add src/components/disposal/disposal-bulk-approval.tsx tests/v-track2-d.test.ts tests/validation-guards.test.ts tests/disposal-sweep-ui.test.ts tests/disposal-bulk-approval.test.ts`, then `git commit -m "feat(disposal): bulk approval shows a refused remark under its field and says why approve waits when nothing is eligible (v-track plan 2 task 25, D6)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 26 (D7): Bulk execution checks its shared values, exception and confirmation on submit and takes a field refusal back to the review step (`c/disposal/disposal-bulk-execution.tsx`, `src/lib/disposal-bulk-execution-ui.ts`, the disposal page, messages)

Spec §4.2 (multi-step: back to the step that owns the field), §4.4 (shared values are content; nothing eligible is a prerequisite), §5 #28; D-R1, D-R4, D-R9, D-R10; uses D1.

**Files:**
- Modify: `src/components/disposal/disposal-bulk-execution.tsx`, `src/app/[locale]/(dashboard)/disposal/page.tsx` (CRLF); `src/lib/disposal-bulk-execution-ui.ts` (`w/mixed`); `messages/th.json`, `messages/en.json` (CRLF, through `scripts/messages-edit.mjs`)
- Pins: `tests/disposal-bulk-execution-ui.test.ts` (CRLF), `tests/disposal-bulk-execution-ui-state.test.ts` (`w/mixed`; one test goes)
- Guard: `tests/validation-guards.test.ts`
- Test: `tests/v-track2-d.test.ts` (LF)

**Changes at e1caa29:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `src/lib/disposal-bulk-execution-ui.ts:144-155` | `export function validateHistoricalException(input: {` … `}` and the blank line after it | gone (its last importer leaves; plan 1 A-R4's precedent) | D-R9 |
| component imports `:35`, `:49-60` | `  validateHistoricalException,`; `Field, FieldHint`; … `Textarea`; `formatCount`; `shouldGuardLinkClick`; `cn` | the first goes; `Field, FieldError, FieldHint`; `import { useFieldErrors } from "@/components/ui/use-field-errors"` after `textarea`; `import { readFieldErrors } from "@/lib/field-error-client"` after `display-format`; `import { maxLength, minLength, required } from "@/lib/validation-rules"` after `utils` | M-R3 |
| after `BULK_EXECUTION_MODES` `:62-65` | — | the table (seven keys, the Step 1 test's ids) with the comment `// The dialog's fields in visual order, keyed like the request body, with the id focus moves to (v-track M-R1). The first` / `// six are the review step's shared values, the last is the preview step's confirmation (client only).`; `type BulkExecutionField`, `FIELD_ORDER`, `type BulkExecutionFieldErrors = ReturnType<typeof useFieldErrors<BulkExecutionField>>`; `type BulkExecutionValues` (the seven values); `function shownFields(step: "review" \| "preview", options: { recipient: boolean; historical: boolean; confirm: boolean }): BulkExecutionField[]` (D-R9's per-step lists); `function validate(values: BulkExecutionValues, shown: readonly BulkExecutionField[])` with the Step 1 test's rules | M-R1, M-R2, D-R4, D-R9 |
| copy type `:110` | `  permanentConfirmation: string` | it, then `  permanentConfirmationRequired: string` | D-R9 |
| context type `:180` | `  preview: (requestIds?: string[], previousPayload?: BulkExecutionPreviewPayload) => Promise<void>` | the two-line comment `// Resolves to a body that names fields of the review step (a refusal, or a preview whose every row such a field blocks);` / `// the dialog shows them under their fields there. Otherwise resolves to nothing.`, then the same line with `Promise<unknown>` | D-R9 |
| `send :366` | `throw new Error(typeof code === "string" ? copy.errors[code] ?? fallback : fallback)` | `// The body rides along as the cause, so a refusal that names a field can go back to it (v-track D-R9).` / `throw new Error(typeof code === "string" ? copy.errors[code] ?? fallback : fallback, { cause: body })` | D-R9 |
| `preview :410-422` | `if (!values.executionDate \|\| !values.executedById \|\| !values.nextStatusId) return` and the `historicalError` block | gone; one comment line `// The dialog's validate() checked the shared values before this preview; a retry sends values that passed it.` before `abortPreview()` | D-R9 |
| `preview :435-437` | `const result = await send(payload, controller)` / `if (!currentRequest(…)) return` / `setResponse(result)` | between the second and third: `// Every row blocked by a field of the review step (v-track D1): back to that step, where the field shows it.` / `if (!previousPayload && result.eligibleCount === 0 && result.fieldErrors) {` / `setDialogState("review")` / `return result` / `}` | D-R9 |
| `preview`'s catch `:443-445` | `if (!currentRequest(…)) return` / `setError(…)` / `setDialogState("review")` | `if (!currentRequest(…)) return` / `setDialogState("review")` / `// A refusal that names a field of the review step goes back to the dialog, which shows it there (spec §4.1); any` / `// other keeps the dialog's danger Notice.` / `const named = caught instanceof Error ? readFieldErrors(caught.cause) : null` / `if (!previousPayload && named && FIELD_ORDER.some((key) => key in named)) return { fieldErrors: named }` / `setError(…)` | D-R9 |
| dialog `:803-817` | `const hasSharedValues = …`; `function handleSubmit(event)` with `void preview()` / `void commit()` | `hasSharedValues` goes; after `description`: the hook; `// A prerequisite, not a field (spec §4.4): nothing to execute. The zero-eligible Notice says why.` / `const nothingEligible = eligible.length === 0`; `const fieldsOf = (step: "review" \| "preview") => shownFields(step, { recipient: recipientFallbackApplicable, historical: historicalAvailable && useHistoricalEvidenceException, confirm: !nothingEligible })` (the object one key per line); `const focusFirstError = (step: "review" \| "preview") => fieldErrors.focusFirst(fieldsOf(step), { idFor: (key) => FIELD_IDS[key] })`; `const values: BulkExecutionValues = { … }` (the seven, one per line); `async function handleSubmit` as the Step 1 test reads it, with the comment `// A refusal, or a preview whose every row a shared value blocks, comes back to this step's fields (spec §4.2).` before its `applyServer` line | D-R9 |
| `<form …>` `:831-836` | `aria-busy={busy}` / `data-disposal-bulk-dialog` / `onSubmit={handleSubmit}` / `className=…` | the third line `onSubmit={handleSubmit} noValidate` (V2 reads `onSubmit={handleSubmit} noValidate` with one space) | FIXED 6 |
| `<SharedValueFields` `:845-859` | `disabled={previewing}` | `fieldErrors={fieldErrors}` after it | D-R10 |
| the exception `:874-913` | the exception checkbox; `<Field label={copy.historicalReason} required>`; the reason `Textarea`; the acknowledgement `label` | the exception checkbox's `onChange` a block that also clears `"evidenceExceptionReason", "evidenceExceptionAcknowledged"`; the JSX comment `{/* The reason and the acknowledgement are errors on preview (spec §4.4), in the domain's words. */}`; the reason `Field` one prop per line with `id="disposal-bulk-execution-exception-reason"` after `label` and `error={fieldErrors.errors.evidenceExceptionReason ? copy.errors.DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED : undefined}` last, its `onChange` a block that also clears its key; the acknowledgement `label` inside a `<div>` with the input's `id="disposal-bulk-execution-exception-acknowledged"` first, `onChange` a block that also clears its key, ``aria-invalid={…}``, ``aria-describedby={fieldErrors.errors.evidenceExceptionAcknowledged ? `disposal-bulk-execution-exception-acknowledged-error ${historicalWarningId}` : `${historicalWarningId} ${historicalHelpId}`}``, and after the `label` `{fieldErrors.errors.evidenceExceptionAcknowledged ? (` / `<FieldError id="disposal-bulk-execution-exception-acknowledged-error" className="mt-1.5">{copy.errors.DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED}</FieldError>` / `) : null}` | D-R9 |
| `:934` | `<Notice tone="warning" role="alert">{copy.zeroEligible}</Notice>` | `<Notice tone="warning" role="alert" id="disposal-bulk-execution-zero-eligible">{copy.zeroEligible}</Notice>` | D-R9 |
| `:938-946` | `<label className="flex min-h-11 items-start gap-3 border-t border-border pt-4 text-sm font-medium text-foreground">` + the confirmation checkbox | `<div className="border-t border-border pt-4">` around `<label className="flex min-h-11 items-start gap-3 text-sm font-medium text-foreground">`; the input `id="disposal-bulk-execution-permanent"` first, `onChange` a block that also clears `"permanentConfirmed"`, `aria-invalid` and `aria-describedby` (`"disposal-bulk-execution-permanent-error"`) like the acknowledgement; after the `label` `{fieldErrors.errors.permanentConfirmed ? (` / `<FieldError id="disposal-bulk-execution-permanent-error" className="mt-1.5">{copy.permanentConfirmationRequired}</FieldError>` / `) : null}` | D-R9 |
| `:955`, `:960` | `<Button type="submit" busy={previewing} disabled={!hasSharedValues}>`; `<Button type="submit" busy={committing} disabled={eligible.length === 0 \|\| !permanentConfirmed}>` | `<Button type="submit" busy={previewing}>`; `<Button` / `type="submit"` / `busy={committing}` / `aria-disabled={nothingEligible \|\| undefined}` / `aria-describedby={nothingEligible ? "disposal-bulk-execution-zero-eligible" : undefined}` / `>` | D-R9 |
| `SharedValueFields` `:982-1056` | props end `disabled,`; three `<Field label={copy.…} required>`; `<Field label={copy.sharedRecipient} hint={copy.sharedRecipientHelp} className="sm:col-span-3">` | `fieldErrors,` after `disabled,` (type `fieldErrors: BulkExecutionFieldErrors`); `<Field label={copy.executionDate} id="disposal-bulk-execution-date" required error={fieldErrors.message("executionDate")}>`, likewise `executor` (`-executor`, `executedById`) and `finalStatus` (`-status`, `nextStatusId`); the recipient one prop per line `label`, `id="disposal-bulk-execution-recipient"`, `hint`, `className`, `error={fieldErrors.message("sharedRecipientName")}`; each control's `onChange` a block: the same call, then `fieldErrors.clear("<key>")` | M-R5 |
| page `:255` (one long line) | `permanentConfirmation: t("bulkExecutionPermanentConfirmation"), ` | it, then `permanentConfirmationRequired: t("bulkExecutionPermanentConfirmationRequired"), ` | D-R9 |
| messages | — | change file `<temp>/d7-messages.json`: `{"set":{"th":{"disposalPage.bulkExecutionPermanentConfirmationRequired":"กรุณาเลือกช่องยืนยันก่อนดำเนินการ"},"en":{"disposalPage.bulkExecutionPermanentConfirmationRequired":"Tick the confirmation box before you continue."}}}`, then `node scripts/messages-edit.mjs <temp>/d7-messages.json` | D-R9 |

`shownFields` and `validate` are each declared on one line as the table writes them (`function shownFields(step: "review" | "preview", options: { recipient: boolean; historical: boolean; confirm: boolean }): BulkExecutionField[] {`; `function validate(values: BulkExecutionValues, shown: readonly BulkExecutionField[]): Partial<Record<BulkExecutionField, string>> {`). `shownFields` filters `FIELD_ORDER`: `permanentConfirmed` only for `step === "preview" && options.confirm`; on the preview step nothing else; on the review step the recipient by `options.recipient`, the exception's two keys by `options.historical`, the other three always. `validate`'s `check` keeps a code only for a key in `shown` (`if (code && shown.includes(key)) errors[key] = code`). Their comments (exact, as rehearsed; no test reads them): above `shownFields`, `// The fields a step shows (spec §4.2: an error goes to the step that owns its field): the review step's shared values,` / `// with the recipient for the types that take one and the exception's two fields while it is chosen; the preview step's` / `// confirmation while something is eligible. A hidden field is neither checked nor focused (v-track D-R4).`; above `validate`, `// noValidate turns the browser's check off, so this restates the controls' required, minLength and maxLength; the shared` / `// values, the exception's reason and acknowledgement and the confirmation were a disabled button or a silent return` / `// (v-track M-R2, D-R9).`. `handleSubmit`'s preview branch ends `if (focusFirstError("preview")) return` / `void commit()`.

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-d.test.ts`:

```ts

test("disposal bulk execution: the shared values, the exception and the confirmation are errors on submit, a field refusal goes back to the review step, and nothing eligible says why (v-track D7)", () => {
  const source = read(`${C}disposal/disposal-bulk-execution.tsx`)
  assertMigratedForm(source, {
    ids: {
      executionDate: "disposal-bulk-execution-date",
      executedById: "disposal-bulk-execution-executor",
      nextStatusId: "disposal-bulk-execution-status",
      sharedRecipientName: "disposal-bulk-execution-recipient",
      evidenceExceptionReason: "disposal-bulk-execution-exception-reason",
      evidenceExceptionAcknowledged: "disposal-bulk-execution-exception-acknowledged",
      permanentConfirmed: "disposal-bulk-execution-permanent",
    },
    messages: ["executionDate", "executedById", "nextStatusId", "sharedRecipientName"],
  })
  const rules = validateBody(source)
  for (const rule of [
    "if (code && shown.includes(key)) errors[key] = code",
    'check("executionDate", required(values.executionDate))',
    'check("executedById", required(values.executedById))',
    'check("nextStatusId", required(values.nextStatusId))',
    'check("sharedRecipientName", maxLength(values.sharedRecipientName, 200))',
    'check("evidenceExceptionReason", required(values.evidenceExceptionReason) ?? minLength(values.evidenceExceptionReason, 20) ?? maxLength(values.evidenceExceptionReason, 2000))',
    'check("evidenceExceptionAcknowledged", required(values.evidenceExceptionAcknowledged))',
    'check("permanentConfirmed", required(values.permanentConfirmed))',
  ]) assert.ok(rules.includes(rule), rule)
  // The old gates and silent returns go (spec §4.4): the review button is enabled and preview no longer checks for itself.
  assert.doesNotMatch(source, /hasSharedValues|validateHistoricalException/)
  assert.doesNotMatch(source, /if \(!values\.executionDate \|\| !values\.executedById \|\| !values\.nextStatusId\) return/)
  // Each step checks its own fields (spec §4.2), and a refusal or an all-blocked preview comes back to the review step.
  assert.match(source, /if \(dialogState === "review"\) \{\n\s+fieldErrors\.setErrors\(validate\(values, fieldsOf\("review"\)\)\)\n\s+if \(focusFirstError\("review"\)\) return\n\s+const refusal = await preview\(\)\n[^\n]*\n\s+if \(fieldErrors\.applyServer\(refusal\) && focusFirstError\("review"\)\) return\n\s+\} else if \(dialogState === "preview"\) \{\n\s+if \(nothingEligible\) return\n\s+fieldErrors\.setErrors\(validate\(values, fieldsOf\("preview"\)\)\)/)
  assert.match(source, /if \(!previousPayload && result\.eligibleCount === 0 && result\.fieldErrors\) \{\n\s+setDialogState\("review"\)\n\s+return result\n\s+\}/)
  assert.match(source, /if \(!previousPayload && named && FIELD_ORDER\.some\(\(key\) => key in named\)\) return \{ fieldErrors: named \}/)
  assert.ok(source.includes("throw new Error(typeof code === \"string\" ? copy.errors[code] ?? fallback : fallback, { cause: body })"))
  assert.match(source, /preview: \(requestIds\?: string\[\], previousPayload\?: BulkExecutionPreviewPayload\) => Promise<unknown>/)
  // The prerequisite keeps its gate, focusable and tied to the zero-eligible Notice.
  assert.ok(source.includes('<Notice tone="warning" role="alert" id="disposal-bulk-execution-zero-eligible">{copy.zeroEligible}</Notice>'))
  // The exception's two fields and the confirmation say the rule in the domain's words, tied to their checkbox.
  assert.ok(source.includes("error={fieldErrors.errors.evidenceExceptionReason ? copy.errors.DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED : undefined}"))
  assert.ok(source.includes('<FieldError id="disposal-bulk-execution-exception-acknowledged-error" className="mt-1.5">{copy.errors.DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED}</FieldError>'))
  assert.ok(source.includes('<FieldError id="disposal-bulk-execution-permanent-error" className="mt-1.5">{copy.permanentConfirmationRequired}</FieldError>'))
  assert.match(source, /permanentConfirmationRequired: string\n/)
  const page = read("src/app/[locale]/(dashboard)/disposal/page.tsx")
  assert.ok(page.includes('permanentConfirmationRequired: t("bulkExecutionPermanentConfirmationRequired"), '))
  for (const locale of ["th", "en"] as const) {
    assert.equal(typeof JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).disposalPage.bulkExecutionPermanentConfirmationRequired, "string", locale)
  }
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-d.test.ts`. Expected to fail: "disposal bulk execution: the shared values, the exception and the confirmation are errors on submit, a field refusal goes back to the review step, and nothing eligible says why (v-track D7)" ("noValidate directly after onSubmit"). After Step 3 and before Step 4, `node --test tests/disposal-bulk-execution-ui.test.ts tests/disposal-bulk-execution-ui-state.test.ts` fails "bulk execution reviews server-derived item values and gates historical controls", "bulk execution dialog uses the dialog parts, busy buttons that stay in place and the shared fields (2C batch 3)" and the file `tests\disposal-bulk-execution-ui-state.test.ts` (`SyntaxError: The requested module '../src/lib/disposal-bulk-execution-ui.ts' does not provide an export named 'validateHistoricalException'`); Step 4 is their edit.
- [ ] **Step 3: Implement** per the Changes table.
- [ ] **Step 4: Pin and guard edits:**
  - `tests/disposal-bulk-execution-ui.test.ts`, old (exact):

    ```text
      assert.match(component, /validateHistoricalException/)
    ```

    new:

    ```text
      // The exception's reason and acknowledgement are checked by the dialog's validate() (v-track plan 2 D7).
      assert.match(component, /check\("evidenceExceptionReason", required\(values\.evidenceExceptionReason\) \?\? minLength\(values\.evidenceExceptionReason, 20\) \?\? maxLength\(values\.evidenceExceptionReason, 2000\)\)/)
    ```

  - `tests/disposal-bulk-execution-ui.test.ts`, old (exact):

    ```text
      assert.match(dialog, /onSubmit=\{handleSubmit\}\n\s+className=\{accessibleDialogFormClasses\}\n\s+>\n\s+<AccessibleDialogBody className="space-y-5">/)
    ```

    new:

    ```text
      assert.match(dialog, /onSubmit=\{handleSubmit\} noValidate\n\s+className=\{accessibleDialogFormClasses\}\n\s+>\n\s+<AccessibleDialogBody className="space-y-5">/)
    ```

  - `tests/disposal-bulk-execution-ui.test.ts`, old (exact):

    ```text
      assert.match(dialog, /<Notice tone="warning" role="alert">\{copy\.zeroEligible\}<\/Notice>/)
    ```

    new:

    ```text
      assert.match(dialog, /<Notice tone="warning" role="alert" id="disposal-bulk-execution-zero-eligible">\{copy\.zeroEligible\}<\/Notice>/)
    ```

  - `tests/disposal-bulk-execution-ui.test.ts`, old (exact):

    ```text
      assert.match(dialog, /\{dialogState === "review" \|\| previewing \? \(\n\s+<Button type="submit" busy=\{previewing\} disabled=\{!hasSharedValues\}>/)
      assert.match(dialog, /\{dialogState === "preview" \|\| committing \? \(\n\s+<Button type="submit" busy=\{committing\} disabled=\{eligible\.length === 0 \|\| !permanentConfirmed\}>\n\s+\{format\(copy\.confirm, \{ count: eligible\.length \}\)\}/)
    ```

    new:

    ```text
      // The shared values and the confirmation are errors on submit; nothing eligible keeps its gate, tied to the Notice
      // (v-track plan 2 D7).
      assert.match(dialog, /\{dialogState === "review" \|\| previewing \? \(\n\s+<Button type="submit" busy=\{previewing\}>/)
      assert.match(dialog, /\{dialogState === "preview" \|\| committing \? \(\n\s+<Button\n\s+type="submit"\n\s+busy=\{committing\}\n\s+aria-disabled=\{nothingEligible \|\| undefined\}\n\s+aria-describedby=\{nothingEligible \? "disposal-bulk-execution-zero-eligible" : undefined\}\n\s+>\n\s+\{format\(copy\.confirm, \{ count: eligible\.length \}\)\}/)
    ```

  - `tests/disposal-bulk-execution-ui.test.ts`, old (exact):

    ```text
      assert.match(dialog, /<Field label=\{copy\.historicalReason\} required>\n\s+<Textarea\n/)
    ```

    new:

    ```text
      assert.match(dialog, /<Field\n\s+label=\{copy\.historicalReason\}\n\s+id="disposal-bulk-execution-exception-reason"\n\s+required\n[^\n]*\n\s+>\n\s+<Textarea\n/)
    ```

  - `tests/disposal-bulk-execution-ui.test.ts`, old (exact):

    ```text
      assert.equal(dialog.match(/<Field label=\{copy\.(?:executionDate|executor|finalStatus)\} required>/g)?.length, 3)
      assert.match(dialog, /<Field label=\{copy\.sharedRecipient\} hint=\{copy\.sharedRecipientHelp\} className="sm:col-span-3">/)
    ```

    new:

    ```text
      assert.equal(dialog.match(/<Field label=\{copy\.(?:executionDate|executor|finalStatus)\} id="disposal-bulk-execution-[\w-]+" required error=\{fieldErrors\.message\("\w+"\)\}>/g)?.length, 3)
      assert.match(dialog, /<Field\n\s+label=\{copy\.sharedRecipient\}\n\s+id="disposal-bulk-execution-recipient"\n\s+hint=\{copy\.sharedRecipientHelp\}\n\s+className="sm:col-span-3"\n\s+error=\{fieldErrors\.message\("sharedRecipientName"\)\}\n\s+>/)
    ```

  - `tests/disposal-bulk-execution-ui-state.test.ts`, old (exact):

    ```text
      toggleBulkExecutionPage,
      validateHistoricalException,
    ```

    new:

    ```text
      toggleBulkExecutionPage,
    ```

  - `tests/disposal-bulk-execution-ui-state.test.ts`: delete the test below (with the blank line after it), exactly:

    ```text
    test("historical exception validates reason and acknowledgement before preview", () => {
      assert.equal(validateHistoricalException({ enabled: false, reason: "", acknowledged: false }), null)
      assert.equal(validateHistoricalException({ enabled: true, reason: "too short", acknowledged: true }), "reason")
      assert.equal(validateHistoricalException({ enabled: true, reason: "x".repeat(2001), acknowledged: true }), "reason")
      assert.equal(validateHistoricalException({ enabled: true, reason: "x".repeat(20), acknowledged: false }), "acknowledgement")
      assert.equal(validateHistoricalException({ enabled: true, reason: " x".repeat(20), acknowledged: true }), null)
    })
    ```

  - `V_FORMS`: insert `` `${C}disposal/disposal-bulk-execution.tsx`, `` directly after `const V_FORMS: readonly string[] = [`.
- [ ] **Step 5: Verify.** `node --test tests/v-track2-d.test.ts tests/disposal-bulk-execution-ui.test.ts tests/disposal-bulk-execution-ui-state.test.ts tests/disposal-sweep-ui.test.ts tests/disposal-bulk-execution.test.ts tests/disposal-evidence-exception.test.ts tests/disposal-queue-ux.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/visual-foundation-guards.test.ts tests/ui-overlay-guards.test.ts tests/list-frame-guards.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts` (173 tests, 0 fail); `npm test` (+1 −1 = 0; 2281 tests, 2280 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint`. Messages +1 key per locale (4090 on this plan's chain). eol: `1320 1320` (component), `0 355` (test); `git diff --numstat` shows `0 12` for `src/lib/disposal-bulk-execution-ui.ts` and `0 9` for the state test.
- [ ] **Step 6: Commit.** `git add src/components/disposal/disposal-bulk-execution.tsx src/lib/disposal-bulk-execution-ui.ts "src/app/[locale]/(dashboard)/disposal/page.tsx" tests/disposal-bulk-execution-ui.test.ts tests/disposal-bulk-execution-ui-state.test.ts tests/v-track2-d.test.ts tests/validation-guards.test.ts messages/th.json messages/en.json`, then `git commit -m "feat(disposal): bulk execution checks its shared values, exception and confirmation on submit and takes a field refusal back to the review step (v-track plan 2 task 26, D7)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Assembly notes (area D)

- **A-D1, counts.** Area D's own deltas: `npm test` +1 for D1–D6 and 0 for D7 (+1 test, −1 test): **+6** in all; messages **+2** keys per locale; `V_FORMS` **+6** files; `SELECT_STAR_ONLY` **−3** (one each from request, batch, execution; 14 in 10 files → 11 in 7 if no other area has run); `<form … noValidate>` in `src` **+6** (17 → 23 alone; the batch edit step is a new `<form>`, so non-search forms in `src` 41 → 42); `NON_VALIDATION_TOASTS` **2** rows. The absolute numbers in each Step 5 are those of the area's rehearsal chain from `e1caa29`; the assembled plan rewrites them for its order.
- **A-D2, order inside the area.** D1 first (D5 and D7 use its codes; D7's test reads the response type). D2 before D3 (D2's block holds the helpers; D2 creates `NON_VALIDATION_TOASTS`; D3 inserts into it). D4–D7 in any order after D2, each appending its test; the rehearsal ran D1…D7.
- **A-D3, shared files when other areas run in the same plan.** `tests/validation-guards.test.ts`: every `V_FORMS` row goes directly after the list's opening line and every `SELECT_STAR_ONLY` row is deleted by its own text (the second occurrence), so the edits hold in any order; `NON_VALIDATION_TOASTS` is created once (D-R5). `messages/*.json`: one change file per task through `messages-edit.mjs`, independent of order. `tests/v-track2-d.test.ts` is area D's alone (other areas keep their own files; no test imports another).
- **A-D4, nothing else is shared:** area D touches no file of the other plan-2 areas (the disposal page `src/app/[locale]/(dashboard)/disposal/page.tsx` only for the copy line).

### Rehearsal record (area D)

Clone `<temp>/sim-D` (`git clone --no-hardlinks` of `<temp>/../v-sim`, branch `v2-base` = `e1caa29`, `core.autocrlf=true`, its own copy of `v-sim`'s `node_modules`). Before any edit, every tracked file of `src`, `tests`, `messages` and `scripts` was copied from `D:/Antigravity/asset-system` (read only), so the working tree's line endings match the real checkout file by file (`git diff --numstat` empty). The `v-sim` object store has two packs without an `.idx` (`pack-5ae6582a…`, `pack-74160cba…`, dated 2026-10-16), so the clone lacked some trees (`git commit` failed with "invalid object … Error building trees" at the fifth task of the draft); `git fetch --refetch D:/Antigravity/asset-system master` (a read of the real repo) restored them; `git fsck --connectivity-only` then printed nothing. **Other areas cloning `v-sim` will hit the same.**

Draft (branch `d-draft`, from `e1caa29`): each task written and run, the plan text corrected where it differed (below). Replay (branch `d-replay`, from `e1caa29`, by `<temp>/tools/d-replay.mjs`): every Step 1 block copied byte for byte from this text, each Step 3 from the draft's final source of that task (checked against its Changes table), each Step 4 edit applied as the exact old → new strings above (`<temp>/tools/d-edits.mjs`, the same strings), the `V_FORMS` / `SELECT_STAR_ONLY` / `NON_VALIDATION_TOASTS` edits by their anchors; `git diff d-draft d-replay` is empty.

| Task | `d-replay` | Step 2 (the new test fails first) | Step 4 pins failing before their edit | `npm test` after (tests / pass / fail / skipped) | test file |
|---|---|---|---|---|---|
| D1 | `4258a367` | D1's test, `TypeError: getDisposalEvidenceFieldErrors is not a function` | none (90 related tests green) | 2257 / 2256 / 0 / 1 | `0 56` |
| D2 | `a737da0e` | D2's test, "noValidate directly after onSubmit" | 2: the request ContentPanel test, V5 | 2258 / 2257 / 0 / 1 | `0 152` |
| D3 | `43431528` | D3's test, same message | 1: V5 | 2259 / 2258 / 0 / 1 | `0 194` |
| D4 | `bf1c37eb` | D4's test, same message | none | 2260 / 2259 / 0 / 1 | `0 235` |
| D5 | `d8a08eda` | D5's test, same message | 2: the execution Notice test, V5 | 2261 / 2260 / 0 / 1 | `0 288` |
| D6 | `327954d7` | D6's test, same message | 2: the bulk approval dialog test, the bulk approval sweep test | 2262 / 2261 / 0 / 1 | `0 307` |
| D7 | `b2f2b3eb` | D7's test, same message | 3: two bulk execution UI tests and the state test file (missing export) | 2262 / 2261 / 0 / 1 (+1 −1) | `0 355` |

Every task: `npx tsc --noEmit` clean; `npm run lint` 0 errors, 146 warnings (the baseline, all under `.agents/`). Messages 4092 → 4093 (D3) → 4094 (D7) per locale. End of the chain: `V_FORMS` 21 files; `SELECT_STAR_ONLY` 11 selects in 7 files; non-search `<form>`s in `src` 42, 23 with `noValidate`; `git show --numstat` per commit as each Step 5 says.

What the draft changed in this text:
- The helper's `<form` regex: the bulk dialogs' forms carry `data-disposal-bulk-dialog` (and `aria-busy`) before `onSubmit`, so it reads `<form\b[^>]*?\bonSubmit=…` (V2 already allowed it); and `noValidate` sits on the `onSubmit` line of the multi-line bulk execution form, because V2 looks for `onSubmit={handleSubmit} noValidate` with one space.
- D-R4 came from the decision dialog's hidden next status: the request and batch forms first checked and focused their money fields even when the type hid them (a value left in a hidden field is still sent, and the server's refusal of it would have focused nothing); every conditional form now filters by `shownFields`.
- The bulk providers first returned any refusal with `fieldErrors` to the dialog; a refusal naming only `requestIds` or `_form` would then have shown nothing. Approval hands back only `approvalRemark`, execution only a key of its `FIELD_ORDER`; every other refusal keeps the dialog's danger Notice.
- D1's first test declared the area's `C` constant, unused until D2: lint warned (`'C' is assigned a value but never used`); `C` moved into D2's block.
- `validateHistoricalException` lost its importer in D7; lint would not catch an unused export, so D7 deletes it and its test (the count stays: +1 −1).
- Editing a `w/mixed` file with the Edit tool rewrote it all CRLF (D1's two `src/lib` files); git stores LF, `git diff --numstat` showed only the task's lines, so the text says so instead of forbidding it. `src/lib/disposal-bulk-execution-ui.ts` and the state test, edited by exact strings, stayed mixed.
- The `v-sim` clone's missing objects (above).

### Open issues (area D)

Area D's open issues 1–3 are open issues 3, 8 and 9 at the end of the plan (the wording of issue 3 is open issue 2; P-R9).

### Behaviour changes a person would notice (area D)

- The request form's save, the batch's review, the decision's save (for a rejection without a reason) and the bulk execution's review are no longer disabled or silent: pressing them shows the errors under the fields.
- In the batch, Enter in a field of the edit step (the asset search included) now submits the step, as it already does in the request form.
- A bulk execution preview in which no row can run because of the shared recipient or the exception fields goes back to those fields instead of showing a preview whose only way out was Cancel.
- The execution dialog no longer closes on the evidence reason or acknowledgement refusal; it keeps the person's entries and shows the error under the field (the other evidence refusals still close and refresh).

---

## Area M: the maintenance forms show their errors under the field, and the maintenance refusals about a field land on it (Tasks 27–31, M1–M5)

Spec `docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md` (approved 2026-10-17) §2 U1–U3, U6, U9; §3 G1–G3, G5 and the anti-goals; §4.1, §4.2 (a field the person cannot see is revealed first), §4.3, §4.4, §4.5; §5 forms #29–#33 and the 3 asterisk-only selects of maintenance; §6.2 ("PM vendor not found or inactive", and the reporter and vendor refusals of the same kind); §6.3 and §11 call 6 (the repair completion date is a client rule); §7.2–§7.4. Area M runs on plan 1 (merged, `e1caa29`): it uses FIXED INTERFACES 1–7 as plan 1 amended them, plan 1's form pattern (plan 1 M-R1 to M-R5: the field table, `validate()`, the hook, the submit sequence, the markup and clearing) and its server bodies. It adds one rule helper (FIXED 10, MT-R2) and two rows of area D's guard list (`NON_VALIDATION_TOASTS`, FIXED 9; MT-R5, P-R4).

What this area does, in one line each:
- **M1** server: the reporter and vendor refusals of a repair record and the vendor refusal of a PM plan's edit name their field (MT-R1).
- **M2** the rule helper `step(value, size)`: a number field's `step` is restated like `min`/`max` (MT-R2).
- **M3** the PM plan form: errors under the field, the asset select checked, whole days 1–3650, the server's refusals on the same fields.
- **M4** the repair record form: the same, the asset and reporter selects checked, the two questions as `FieldGroup`s, "more details" opened for an error inside it (MT-R4), the upload-result toast kept by a reasoned `NON_VALIDATION_TOASTS` row (MT-R5).
- **M5** the complete, cancel and edit dialogs of a repair record: the same per dialog, the return date not before the reported date (`min` and `validate()`, MT-R7), a refusal handed back to the dialog that sent it (MT-R6).

Nothing else changes: no migration, no new dependency, no `EXEMPT` row, no `CONSTRAINT_FLOORS` change (every `required` / `maxLength` stays), no FMG `STAR_ONLY` change (none of its three entries is in maintenance), no `MaintenanceOptionSelect` change (plan 1 Task 16 already passes `id` and `error` on), no DESIGN.md change (the final plan). Messages: +1 (`repairRecord.returnDateBeforeReported`, M5). `SELECT_STAR_ONLY`: −3 selects in 2 rows (M3 −1, M4 −2). `V_FORMS`: +3 files holding 5 forms.

Line numbers are of `e1caa29` (the recon's `9e17cab` numbers still hold for every file of this area). Find every site by its quoted text.

**Area rehearsal (done, 2026-10-18).** M1–M5 ran in order, one commit each, in a clone of the real checkout (`<temp>/sim-M`, from `<temp>/../v-sim` branch `v2-base` = `e1caa29`, `core.autocrlf=true`, its own copy of `node_modules`), branch `m2-sim`: M1 `bc3cffe9` · M2 `92255e3a` · M3 `adad5862` · M4 `73fe4a6a` · M5 `560d1a46`. Every Step 1 block below is the byte-exact text that ran (the five blocks concatenated reproduce the final `tests/v-track2-m.test.ts`, checked); every source edit and pin edit was applied as the exact old → new strings printed below by a replace script that keeps each file's line endings. Every Step 2 failed with the test and the assertion it names; the "after Step 3, before Step 4" lists failed exactly as listed; every task ended with `npm test` 0 fail and 1 skipped (2257, 2258, 2259, 2260, 2261 tests from the base's 2256: +1 per task), `npx tsc --noEmit` clean, `npm run lint` 0 errors and 146 warnings (all under `.agents/`). Messages 4092 → 4093 leaf keys per locale (M5). The guard anchors of M3–M5 were also applied to a copy of `tests/validation-guards.test.ts` on which another area had already appended `V_FORMS` rows (all eight applied once each; see "Interfaces with the other areas").

**Line endings.** In the real checkout every existing file this area edits is CRLF (`i/lf w/crlf`), except `tests/maintenance-sweep-ui.test.ts`, which is **LF** (`i/lf w/lf`). The new `tests/v-track2-m.test.ts` is LF. The clone was CRLF everywhere (`core.autocrlf` on checkout), so the sim's `eol.mjs` line for `maintenance-sweep-ui` printed `118 118`; in the real checkout it prints `0 118`. Every edit is an exact-string replacement whose old and new text hold no line ending of their own beyond `\n` inside the string, so the same strings apply to either ending (the Edit tool keeps the file's).

### Inventory (M at `e1caa29`)

| # | Form · file | Submit · `<form>` | Today (validation · server errors) | Decision | Task |
|---|---|---|---|---|---|
| 29 | PM plan `c/maintenance/maintenance-plan-form.tsx` | `handleSubmit :61` · `:91` | native `required` ×4 (`:96,:104,:120,:129`), `maxLength` ×2, interval `min="1" max="3650"` `:117-118` (default step 1) · **asset `MaintenanceOptionSelect` `:92` asterisk only** (V5 row 1) · `throw new Error(getMaintenanceErrorMessage(payload?.code, …))` `:79` → `apiError.toast :83`: a refusal without a maintenance `code` (the zod 400, the vendor) shows the generic "เกิดข้อผิดพลาด" | plan 1's pattern; the asset checked on create (the edit does not send it); the days whole 1–3650 (`range`, `step`, MT-R2); the server's `fieldErrors` first, then today's domain message | M3 |
| 30 | repair record `c/maintenance/repair-record-form.tsx` | `handleSubmit :82` · `:122` | native `required` `:151,:155`, `maxLength` ×3, cost `min="0" step="0.01"` `:228` · **asset `:124` and reporter `:190` asterisk only** (V5 row 2) · radio `fieldset`s with `FieldRequiredMark` `:164-182` (both always hold a value) · "more details" `:203-260` unmounts its four fields when closed · `MAINTENANCE_OPEN_RECORD_EXISTS` → danger `Notice` with a link `:138-148` (and the toast) · upload result `toast.warning :110` in the `try` (not a catch: V3 would refuse it) | the same; the two questions as `FieldGroup`s (spec §7.3); focus only over shown fields, "more details" opens first (MT-R4); the open record keeps its Notice (MT-R8); the upload result keeps its toast through a `NON_VALIDATION_TOASTS` row (MT-R5) | M4 |
| 31 | complete dialog `c/maintenance/repair-record-actions.tsx` | inline `onSubmit :124` → `send :82` · `:122` | return date `required` `:140`, no `min`, nothing compares it with `details.reportedDate` (client, schema and service: recon-3 §3) · outcome `fieldset` `:142-149` · cost `min`/`step` `:153`, `maxLength` ×2 · `send` throws `getMaintenanceErrorMessage(…)` `:91`, upload result `toast.warning :93` | the same; `min={details.reportedDate}` + `notBefore` with a domain message (MT-R7); the outcome a `FieldGroup`; a refusal goes back to this dialog (MT-R6) | M5 |
| 32 | cancel dialog (same file) | inline `onSubmit :196` · `:194` | reason optional, `maxLength={1000}` `:204` | the same (`maxLength` only) | M5 |
| 33 | edit dialog (same file) | inline `onSubmit :219` · `:217` | `required` `:235,:238`, `maxLength` ×3, cost `min`/`step` `:243` | the same | M5 |

Server (M1): `src/lib/repair-record-service.ts` throws `MaintenanceApiError("MAINTENANCE_REPORTER_REQUIRED", …)` `:44` (body `{ code, error }`), `new Error("Reporter not found or inactive")` `:291`, `new Error("Vendor not found or inactive")` `:296` (create, complete and edit); `src/lib/maintenance-plan-service.ts:59` `new Error("PM vendor not found or inactive")` (the PM edit; plan 1 Task 10 answered only the create route `maintenance-plans/route.ts:55`). The routes (`maintenance-tickets/route.ts:52-55`, `[id]/route.ts:86-89`, `maintenance-plans/[id]/route.ts:35-38`) answer a `MaintenanceApiError` through `getMaintenanceErrorPayload`, anything else through `errorResponse(error, 400)`, which already answers a `FieldRefusalError` (plan 1 S-R6). Not in area M: `maintenance-plan-state-actions.tsx` (confirm-only, recon-2 "not counted"), `maintenance-attachments.tsx` (uploads on pick), the checkin route's own `MAINTENANCE_REPORTER_REQUIRED` body (`assets/[id]/checkin/route.ts:75`, the operations area).

Gates (recon-3 §2) in these files: none is a disabled button or a silent return. The asset picker's ineligible assets carry their reason in the option label (`formatReason`) — a prerequisite that already says why. `MAINTENANCE_OPEN_RECORD_EXISTS` is a server refusal shown in a Notice with a link (MT-R8). The reporter select (`needsReporter`) is a content rule: it becomes `validate()`'s.

Rulings: R6 of "Rulings of this plan" (MT-R1–MT-R9).

### Interfaces with the other areas

| # | From / to | What | Where |
|---|---|---|---|
| 1 | plan 1 (merged) | `useFieldErrors`, `useValidationMessage`, `FieldGroup`, `MaintenanceOptionSelect` `id`/`error`, `FieldRefusalError`, `errorResponse`'s refusal branch, the rule helpers, `common.validation.*` | M1, M3–M5 |
| 2 | M → A, D | `step(value, size)` (M2, FIXED 4 addition) for the money fields of the asset, batch and disposal forms (`range(v, 0) ?? step(v, 0.01)`). If another area drafted its own step helper, the assembly keeps one and runs it first; M2 has no other dependency, so it can move to the front of plan 2. | M2 |
| 3 | M ↔ D | `NON_VALIDATION_TOASTS` in `tests/validation-guards.test.ts` (FIXED 9, created by Task 21, D2; MT-R5, P-R4): M4 and M5 each insert one row directly after `const NON_VALIDATION_TOASTS: Readonly<Record<string, { count: number; why: string; ruling: string }>> = {`. | M4, M5 |
| 4 | shared files | `V_FORMS`: each task inserts its row directly before `]\n\n// Required selects (SearchableSelect and its two wrappers) with no error=` (the line after the list), so it holds whatever rows other areas appended. `SELECT_STAR_ONLY`: M3 replaces the two maintenance rows (`maintenance-plan-form` 1 and `repair-record-form` 2, adjacent, both this area's) by the second; M4 deletes `` [`${C}maintenance/repair-record-form.tsx`]: 2, `` (unique: `V_SCOPE` says `: 1,`). Messages: one key through `messages-edit.mjs`, independent of order. Checked on a guard file with other areas' rows already appended. | M3–M5 |
| 5 | M → O | the checkin route's own `{ code: "MAINTENANCE_REPORTER_REQUIRED" }` body (send to repair) is the operations area's; MT-R1's `MaintenanceApiError` change does not reach it (the route builds its body by hand). | — |

### Task 27 (M1): The maintenance refusals about the reporter or the vendor name their field (`src/lib/maintenance-api-errors.ts`, `repair-record-service.ts`, `maintenance-plan-service.ts`)

Spec §6.2 ("PM vendor not found or inactive"; the reporter and the repair vendor are the same kind of refusal), U3, U9; MT-R1.

**Files:** Modify `src/lib/maintenance-api-errors.ts`, `src/lib/repair-record-service.ts`, `src/lib/maintenance-plan-service.ts` (CRLF) · Test `tests/v-track2-m.test.ts` (new, LF).

**Changes at e1caa29:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `maintenance-api-errors.ts:1` | `export const maintenanceErrorCodes = [` | above it `import type { FieldErrors } from "./field-errors.ts"` and a blank line | MT-R1 |
| `:16-27` the class | `readonly status: number`, a three-argument constructor | `readonly fieldErrors: FieldErrors \| undefined` with a comment, a fourth argument `fieldErrors?: FieldErrors`, `this.fieldErrors = fieldErrors` | MT-R1 |
| `:38` | `body: { code: error.code, error: error.message },` | `body: { code: error.code, error: error.message, ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}) },` | MT-R1 |
| `repair-record-service.ts:2`, `maintenance-plan-service.ts:1` | imports | `import { FieldRefusalError } from "./field-errors.ts"` (after the `@prisma/client` type import) | MT-R1 |
| `repair-record-service.ts:44`, `:291`, `:296`; `maintenance-plan-service.ts:59` | the four refusals | as the exact edits below | MT-R1 |

Exact edits (rehearsed):

- `src/lib/maintenance-api-errors.ts`, edit 1 of 3. Old:

```ts
export const maintenanceErrorCodes = [
```

  New:

```ts
import type { FieldErrors } from "./field-errors.ts"

export const maintenanceErrorCodes = [
```

- `src/lib/maintenance-api-errors.ts`, edit 2 of 3. Old:

```ts
  readonly status: number

  constructor(
    code: MaintenanceErrorCode,
    message: string,
    status = 400,
  ) {
    super(message)
    this.name = "MaintenanceApiError"
    this.code = code
    this.status = status
  }
```

  New:

```ts
  readonly status: number
  // The field a refusal is about, so the form shows it under that field (v-track plan 2 MT-R1).
  readonly fieldErrors: FieldErrors | undefined

  constructor(
    code: MaintenanceErrorCode,
    message: string,
    status = 400,
    fieldErrors?: FieldErrors,
  ) {
    super(message)
    this.name = "MaintenanceApiError"
    this.code = code
    this.status = status
    this.fieldErrors = fieldErrors
  }
```

- `src/lib/maintenance-api-errors.ts`, edit 3 of 3. Old:

```ts
    body: { code: error.code, error: error.message },
```

  New:

```ts
    body: { code: error.code, error: error.message, ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}) },
```

- `src/lib/repair-record-service.ts`, edit 1 of 4. Old:

```ts
import type { Prisma, PrismaClient } from "@prisma/client"
import { MaintenanceApiError } from "./maintenance-api-errors.ts"
```

  New:

```ts
import type { Prisma, PrismaClient } from "@prisma/client"
import { FieldRefusalError } from "./field-errors.ts"
import { MaintenanceApiError } from "./maintenance-api-errors.ts"
```

- `src/lib/repair-record-service.ts`, edit 2 of 4. Old:

```ts
    throw new MaintenanceApiError("MAINTENANCE_REPORTER_REQUIRED", "Select who is recording this repair")
```

  New:

```ts
    throw new MaintenanceApiError("MAINTENANCE_REPORTER_REQUIRED", "Select who is recording this repair", 400, { reportedById: "required" })
```

- `src/lib/repair-record-service.ts`, edit 3 of 4. Old:

```ts
  if (!record) throw new Error("Reporter not found or inactive")
```

  New:

```ts
  if (!record) throw new FieldRefusalError("Reporter not found or inactive", { reportedById: "reporterNotFound" })
```

- `src/lib/repair-record-service.ts`, edit 4 of 4. Old:

```ts
  if (!record) throw new Error("Vendor not found or inactive")
```

  New:

```ts
  if (!record) throw new FieldRefusalError("Vendor not found or inactive", { vendorId: "vendorNotFound" })
```

- `src/lib/maintenance-plan-service.ts`, edit 1 of 2 (whole lines). Old:

```ts
import type { PrismaClient } from "@prisma/client"
```

  New:

```ts
import type { PrismaClient } from "@prisma/client"
import { FieldRefusalError } from "./field-errors.ts"
```

- `src/lib/maintenance-plan-service.ts`, edit 2 of 2. Old:

```ts
        if (!vendor) throw new Error("PM vendor not found or inactive")
```

  New:

```ts
        if (!vendor) throw new FieldRefusalError("PM vendor not found or inactive", { vendorId: "pmVendorNotFound" })
```

- [ ] **Step 1: The failing test.** Create `tests/v-track2-m.test.ts` (LF) with exactly:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { FieldRefusalError } from "../src/lib/field-errors.ts"
import { MaintenanceApiError, getMaintenanceErrorPayload } from "../src/lib/maintenance-api-errors.ts"
import { mutateMaintenancePlan } from "../src/lib/maintenance-plan-service.ts"
import { completeRepairRecord, createRepairRecord, updateRepairRecordDetails } from "../src/lib/repair-record-service.ts"

// V track plan 2, area M: the maintenance forms show their errors under the field (spec
// docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §4, §5 #29–#33, §6.2, §7). One test per task,
// appended in order. The working tree is CRLF on Windows: every read strips \r before the multi-line regexes.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

// A transaction stand-in for the maintenance services: each `model.method` call answers from `answers`, else from the
// defaults (an active asset nobody holds, no open record, an open ticket, an active employee, supplier and PM plan).
function fakeMaintenanceDb(answers: Record<string, () => unknown> = {}) {
  const asset = { id: "asset-1", statusId: "status-ready", ownershipType: "shared", custodianId: null, status: { name: "Ready" } }
  const defaults: Record<string, () => unknown> = {
    "asset.findFirst": () => asset,
    "asset.updateMany": () => ({ count: 1 }),
    "assetCheckout.count": () => 0,
    "maintenanceTicket.count": () => 0,
    "maintenanceTicket.findFirst": () => ({ id: "ticket-1", repairStatus: "in_progress", updatedAt: new Date("2026-10-18T00:00:00Z"), assetId: "asset-1", asset }),
    "employee.findFirst": () => ({ id: "emp-1" }),
    "supplier.findFirst": () => ({ id: "vendor-1" }),
    "maintenancePlan.findFirst": () => ({ id: "plan-1", assetId: "asset-1", planState: "active", isActive: true, vendorId: null }),
  }
  const tx = new Proxy({}, {
    get: (_target, model: string) => new Proxy({}, {
      get: (_inner, method: string) => async () => {
        const answer = answers[`${model}.${method}`] ?? defaults[`${model}.${method}`]
        if (!answer) throw new Error(`Unexpected call ${model}.${method}`)
        return answer()
      },
    }),
  })
  return { $transaction: async (callback: (client: unknown) => Promise<unknown>) => callback(tx) }
}

test("maintenance refusals about a field name it: the reporter and the vendor of a repair and of a PM plan (v-track2 M1)", async () => {
  // The typed refusal keeps its code and adds the field (spec §6.2; S-R7: a missing value is "required").
  const reporter = new MaintenanceApiError("MAINTENANCE_REPORTER_REQUIRED", "Select who is recording this repair", 400, { reportedById: "required" })
  assert.deepEqual(getMaintenanceErrorPayload(reporter), {
    status: 400,
    body: { code: "MAINTENANCE_REPORTER_REQUIRED", error: "Select who is recording this repair", fieldErrors: { reportedById: "required" } },
  })
  assert.deepEqual(getMaintenanceErrorPayload(new MaintenanceApiError("MAINTENANCE_CONFLICT", "Ticket changed", 409)), {
    status: 409,
    body: { code: "MAINTENANCE_CONFLICT", error: "Ticket changed" },
  }, "a refusal about no field keeps today's body")

  const user = { id: "user-1", employeeId: "emp-1" }
  const input = {
    assetId: "asset-1",
    maintenancePlanId: null,
    problem: "จอไม่ติด",
    reportedDate: new Date("2026-10-18T00:00:00Z"),
    done: true,
    outcome: "usable" as const,
    reportedById: null,
    vendorId: null,
    repairCost: null,
    invoiceNo: null,
    remark: null,
  }
  const refusal = (fieldErrors: Record<string, string>, message: string) => (error: unknown) => {
    assert.ok(error instanceof FieldRefusalError || error instanceof MaintenanceApiError, String(error))
    assert.equal(error.message, message)
    assert.deepEqual(error.fieldErrors, fieldErrors)
    return true
  }

  await assert.rejects(createRepairRecord(fakeMaintenanceDb() as never, input, { id: "admin" }), refusal({ reportedById: "required" }, "Select who is recording this repair"))
  await assert.rejects(
    createRepairRecord(fakeMaintenanceDb({ "employee.findFirst": () => null }) as never, { ...input, reportedById: "emp-9" }, user),
    refusal({ reportedById: "reporterNotFound" }, "Reporter not found or inactive"),
  )
  const noVendor = { "supplier.findFirst": () => null }
  await assert.rejects(createRepairRecord(fakeMaintenanceDb(noVendor) as never, { ...input, vendorId: "vendor-9" }, user), refusal({ vendorId: "vendorNotFound" }, "Vendor not found or inactive"))
  const complete = { action: "complete" as const, expectedUpdatedAt: new Date("2026-10-18T00:00:00Z"), returnDate: new Date("2026-10-18T00:00:00Z"), outcome: "usable" as const, vendorId: "vendor-9", repairCost: null, invoiceNo: null, remark: null }
  await assert.rejects(completeRepairRecord(fakeMaintenanceDb(noVendor) as never, "ticket-1", complete, user), refusal({ vendorId: "vendorNotFound" }, "Vendor not found or inactive"))
  const update = { action: "update" as const, expectedUpdatedAt: new Date("2026-10-18T00:00:00Z"), reportedDate: new Date("2026-10-18T00:00:00Z"), problem: "จอไม่ติด", vendorId: "vendor-9", repairCost: null, invoiceNo: null, remark: null }
  await assert.rejects(updateRepairRecordDetails(fakeMaintenanceDb(noVendor) as never, "ticket-1", update, user), refusal({ vendorId: "vendorNotFound" }, "Vendor not found or inactive"))
  // The PM plan's edit refuses an inactive vendor as its create does (plan 1 S10 answered the create only).
  const plan = { action: "update" as const, title: "PM", frequency: "monthly" as const, intervalDays: undefined, nextDueDate: new Date("2026-11-01T00:00:00Z"), vendorId: "vendor-9", notes: undefined }
  await assert.rejects(mutateMaintenancePlan(fakeMaintenanceDb(noVendor) as never, "plan-1", plan, "user-1"), refusal({ vendorId: "pmVendorNotFound" }, "PM vendor not found or inactive"))

  // The routes answer a FieldRefusalError through errorResponse (S-R6) and a MaintenanceApiError through its payload.
  for (const route of ["src/app/api/maintenance-tickets/route.ts", "src/app/api/maintenance-tickets/[id]/route.ts", "src/app/api/maintenance-plans/[id]/route.ts"]) {
    assert.match(read(route), /const payload = getMaintenanceErrorPayload\(error\)\n\s+if \(payload\) return NextResponse\.json\(payload\.body, \{ status: payload\.status \}\)\n\s+return errorResponse\(error, 400\)/, route)
  }
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-m.test.ts`. Expected to fail: "maintenance refusals about a field name it: the reporter and the vendor of a repair and of a PM plan (v-track2 M1)" (`Expected values to be strictly deep-equal`: the reporter's body has no `fieldErrors`). No other test fails after Step 3.
- [ ] **Step 3: Implement** per the exact edits.
- [ ] **Step 4: Pin and guard edits:** none (`tests/maintenance-api-errors.test.ts` pins a refusal without a field, whose body does not change; `tests/repair-record-service.test.ts:150-156` checks only the reporter refusal's class and code; the catalog scan of `tests/api-error-catalog.test.ts` reads `new FieldRefusalError("…")` and finds all four messages in the catalog).
- [ ] **Step 5: Verify.** `node --test tests/v-track2-m.test.ts tests/maintenance-api-errors.test.ts tests/repair-record-service.test.ts tests/maintenance-plan-service.test.ts tests/maintenance-plan-routes.test.ts tests/repair-record-routes.test.ts tests/api-error-catalog.test.ts tests/v-track-s.test.ts`; `npm test` (+1; 2282 tests, 2281 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint` (0 errors, no new warning in `src/` or `tests/`). `node <tools>/eol.mjs src/lib/maintenance-api-errors.ts src/lib/repair-record-service.ts src/lib/maintenance-plan-service.ts tests/v-track2-m.test.ts` prints `54 54`, `321 321`, `85 85`, `0 92`.
- [ ] **Step 6: Commit.** `git add src/lib/maintenance-api-errors.ts src/lib/repair-record-service.ts src/lib/maintenance-plan-service.ts tests/v-track2-m.test.ts`, then `git commit -m "feat(api): maintenance refusals about the reporter or the vendor name their field (v-track plan 2 task 27, M1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 28 (M2): A step rule helper restates a number field's step (`src/lib/validation-rules.ts`)

Spec §4.5 (`step` stays on the control, `validate()` restates it), §7.2; MT-R2 (FIXED 4 addition).

**Files:** Modify `src/lib/validation-rules.ts` (CRLF) · Test `tests/v-track2-m.test.ts` (LF).

**Changes at e1caa29:** after `range(…)` (`:38-46`), the new exported `step` with its two comment lines, exactly:

- `src/lib/validation-rules.ts`, edit 1 of 1 (whole lines). Old:

```ts
  if (max !== undefined && max !== null && number > max) return "outOfRange"
  return null
}
```

  New:

```ts
  if (max !== undefined && max !== null && number > max) return "outOfRange"
  return null
}

// A number field's step (step="0.01" for money, the default step 1 of a whole-number field): a whole multiple of size.
// Off the step is "invalidNumber", the code the server gives zod's not_multiple_of; text that is not a number too.
export function step(value: number | string | null | undefined, size: number): RuleCode | null {
  if (isEmpty(value)) return null
  const number = typeof value === "number" ? value : Number((value as string).trim())
  if (!Number.isFinite(number)) return "invalidNumber"
  const steps = number / size
  return Math.abs(steps - Math.round(steps)) < 1e-6 ? null : "invalidNumber"
}
```

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-m.test.ts`:

```ts

test("the step rule: a number field's step (money to 0.01, whole days) is restated like the other constraints (v-track2 M2)", async () => {
  const { step } = await import("../src/lib/validation-rules.ts")
  assert.equal(step("12.34", 0.01), null)
  assert.equal(step("0.29", 0.01), null, "a binary fraction is not off the step")
  assert.equal(step("1.255", 0.01), "invalidNumber", "the code the server gives zod's not_multiple_of")
  assert.equal(step("30", 1), null)
  assert.equal(step(30, 1), null)
  assert.equal(step("1.5", 1), "invalidNumber")
  assert.equal(step("abc", 0.01), "invalidNumber")
  for (const empty of ["", "  ", null, undefined]) assert.equal(step(empty, 0.01), null, "an empty value is left to required")
  assert.match(read("src/lib/validation-rules.ts"), /^export function step\(value: number \| string \| null \| undefined, size: number\): RuleCode \| null \{$/m)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-m.test.ts`. Expected to fail: "the step rule: a number field's step (money to 0.01, whole days) is restated like the other constraints (v-track2 M2)" (`TypeError: step is not a function`).
- [ ] **Step 3: Implement** per the exact edit.
- [ ] **Step 4: Pin and guard edits:** none (`tests/v-track-f.test.ts` imports eight helpers by name and pins the module's imports; both hold).
- [ ] **Step 5: Verify.** `node --test tests/v-track2-m.test.ts tests/v-track-f.test.ts`; `npm test` (+1; 2283 tests, 2282 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint`. eol: `79 79`, `0 105`.
- [ ] **Step 6: Commit.** `git add src/lib/validation-rules.ts tests/v-track2-m.test.ts`, then `git commit -m "feat(forms): a step rule helper restates a number field's step (v-track plan 2 task 28, M2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 29 (M3): The PM plan form shows its errors under the field and checks its asset (`c/maintenance/maintenance-plan-form.tsx`)

Spec §4.1, §4.3, §4.5, §5 #29 (the asset select was an asterisk nothing checked); plan 1 M-R1 to M-R5; MT-R3.

**Files:** Modify `src/components/maintenance/maintenance-plan-form.tsx` (CRLF) · Pins `tests/pm-plans-ui.test.ts` (CRLF), `tests/maintenance-sweep-ui.test.ts` (**LF**) · Guard `tests/validation-guards.test.ts` (CRLF; `V_FORMS`, `SELECT_STAR_ONLY`) · Test `tests/v-track2-m.test.ts` (LF).

**Changes at e1caa29:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| imports `:16-17` | `local-date`, `use-api-error` | + `import { maxLength, range, required, step } from "@/lib/validation-rules"` after `local-date`; + `import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"` after `use-api-error` | MT-R3 |
| after `type Option` `:19` | — | `type PlanValues`, `FIELD_IDS` (7 keys), `PlanField`, `FIELD_ORDER`, `function validate(values: PlanValues, isEdit: boolean)` exactly as below | plan 1 M-R1, M-R2 |
| `:47` | `useState({` | `useState<PlanValues>({` | MT-R3 |
| `setField :57-59` | untyped, no clearing | `fieldErrors`, `validationMessage`, `focusFirstError`, then a typed `setField` that clears its key (and the days with the frequency) | MT-R3 |
| `handleSubmit :62-63`, `:79` | `setSaving(true)`; `if (!response.ok) throw …` | `setErrors(validate(values, Boolean(planId)))`, `if (focusFirstError()) return`; the refusal block | plan 1 M-R4 |
| `<form>` `:91` | `<form onSubmit={handleSubmit} className=…>` | `noValidate` after `onSubmit` | FIXED 6 |
| `:92`, `:133` | the two one-line `MaintenanceOptionSelect`s | one prop per line, `id` first, `error` before `onChange` | MT-R3 |
| `:93`, `:101`, `:114`, `:125`, `:135` | the five `Field`s | `id` and `error`; the days one prop per line with `validationMessage(…, { min: 1, max: 3650 })` | MT-R3 |

Exact edits (rehearsed):

- `src/components/maintenance/maintenance-plan-form.tsx`, edit 1 of 11 (whole lines). Old:

```tsx
import { toLocalDateInputValue } from "@/lib/local-date"
import { useApiError } from "@/components/ui/use-api-error"

type Option = { id: string; label: string }
```

  New:

```tsx
import { toLocalDateInputValue } from "@/lib/local-date"
import { maxLength, range, required, step } from "@/lib/validation-rules"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"

type Option = { id: string; label: string }
type PlanValues = { assetId: string; title: string; frequency: string; intervalDays: string; nextDueDate: string; vendorId: string; notes: string }

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1).
const FIELD_IDS = {
  assetId: "maintenance-plan-asset",
  title: "maintenance-plan-title",
  frequency: "maintenance-plan-frequency",
  intervalDays: "maintenance-plan-interval-days",
  nextDueDate: "maintenance-plan-next-due-date",
  vendorId: "maintenance-plan-vendor",
  notes: "maintenance-plan-notes",
} as const
type PlanField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as PlanField[]

// noValidate turns the browser's check off, so this restates the controls' required, min, max, step and maxLength, and
// the asset the server needs on create; an edit keeps its asset (the select is fixed and not sent) (v-track M-R2).
function validate(values: PlanValues, isEdit: boolean) {
  const errors: Partial<Record<PlanField, string>> = {}
  const check = (key: PlanField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("assetId", isEdit ? null : required(values.assetId))
  check("title", required(values.title) ?? maxLength(values.title, 200))
  check("frequency", required(values.frequency))
  // The days count only for a custom frequency: whole days from 1 to 3650.
  check("intervalDays", values.frequency === "custom" ? required(values.intervalDays) ?? range(values.intervalDays, 1, 3650) ?? step(values.intervalDays, 1) : null)
  check("nextDueDate", required(values.nextDueDate))
  check("notes", maxLength(values.notes, 4000))
  return errors
}
```

- `src/components/maintenance/maintenance-plan-form.tsx`, edit 2 of 11. Old:

```tsx
  const [values, setValues] = useState({
    assetId: initialAsset?.id ?? "",
```

  New:

```tsx
  const [values, setValues] = useState<PlanValues>({
    assetId: initialAsset?.id ?? "",
```

- `src/components/maintenance/maintenance-plan-form.tsx`, edit 3 of 11 (whole lines). Old:

```tsx
  function setField(field: string, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }
```

  New:

```tsx
  const fieldErrors = useFieldErrors<PlanField>()
  const validationMessage = useValidationMessage()
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  function setField<K extends PlanField>(field: K, value: PlanValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    // The days show only for a custom frequency, so a frequency change clears their error too.
    if (field === "frequency") fieldErrors.clear("frequency", "intervalDays")
    else fieldErrors.clear(field)
  }
```

- `src/components/maintenance/maintenance-plan-form.tsx`, edit 4 of 11 (whole lines). Old:

```tsx
    event.preventDefault()
    setSaving(true)
```

  New:

```tsx
    event.preventDefault()
    fieldErrors.setErrors(validate(values, Boolean(planId)))
    if (focusFirstError()) return
    setSaving(true)
```

- `src/components/maintenance/maintenance-plan-form.tsx`, edit 5 of 11 (whole lines). Old:

```tsx
      if (!response.ok) throw new Error(getMaintenanceErrorMessage(payload?.code, t, tCommon("error")))
```

  New:

```tsx
      if (!response.ok) {
        // A refusal that names a field of this form shows under it; any other keeps the toast (spec §4.1).
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error(getMaintenanceErrorMessage(payload?.code, t, tCommon("error")))
      }
```

- `src/components/maintenance/maintenance-plan-form.tsx`, edit 6 of 11 (whole lines). Old:

```tsx
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MaintenanceOptionSelect type="asset" label={t("asset")} value={values.assetId} required disabled={Boolean(planId)} initialOption={initialAsset} placeholder={t("selectAsset")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} loadingLabel={tCommon("loading")} onChange={(value) => setField("assetId", value)} />
        <Field label={t("pmPlanTitle")} required>
```

  New:

```tsx
      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MaintenanceOptionSelect
          id="maintenance-plan-asset"
          type="asset"
          label={t("asset")}
          value={values.assetId}
          required
          disabled={Boolean(planId)}
          initialOption={initialAsset}
          placeholder={t("selectAsset")}
          searchPlaceholder={tCommon("searchSelectPlaceholder")}
          emptyLabel={tCommon("searchSelectNoResults")}
          loadingLabel={tCommon("loading")}
          error={fieldErrors.message("assetId")}
          onChange={(value) => setField("assetId", value)}
        />
        <Field label={t("pmPlanTitle")} id="maintenance-plan-title" required error={fieldErrors.message("title")}>
```

- `src/components/maintenance/maintenance-plan-form.tsx`, edit 7 of 11 (whole lines). Old:

```tsx
        <Field label={t("pmFrequencyLabel")} required>
```

  New:

```tsx
        <Field label={t("pmFrequencyLabel")} id="maintenance-plan-frequency" required error={fieldErrors.message("frequency")}>
```

- `src/components/maintenance/maintenance-plan-form.tsx`, edit 8 of 11 (whole lines). Old:

```tsx
          <Field label={t("pmIntervalDays")} required>
```

  New:

```tsx
          <Field
            label={t("pmIntervalDays")}
            id="maintenance-plan-interval-days"
            required
            error={fieldErrors.errors.intervalDays ? validationMessage(fieldErrors.errors.intervalDays, { min: 1, max: 3650 }) : undefined}
          >
```

- `src/components/maintenance/maintenance-plan-form.tsx`, edit 9 of 11 (whole lines). Old:

```tsx
        <Field label={t("pmNextDueDate")} required>
```

  New:

```tsx
        <Field label={t("pmNextDueDate")} id="maintenance-plan-next-due-date" required error={fieldErrors.message("nextDueDate")}>
```

- `src/components/maintenance/maintenance-plan-form.tsx`, edit 10 of 11 (whole lines). Old:

```tsx
        <MaintenanceOptionSelect type="supplier" label={t("pmExternalProvider")} value={values.vendorId} placeholder={t("pmNoExternalProvider")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} loadingLabel={tCommon("loading")} onChange={(value) => setField("vendorId", value)} />
```

  New:

```tsx
        <MaintenanceOptionSelect
          id="maintenance-plan-vendor"
          type="supplier"
          label={t("pmExternalProvider")}
          value={values.vendorId}
          placeholder={t("pmNoExternalProvider")}
          searchPlaceholder={tCommon("searchSelectPlaceholder")}
          emptyLabel={tCommon("searchSelectNoResults")}
          loadingLabel={tCommon("loading")}
          error={fieldErrors.message("vendorId")}
          onChange={(value) => setField("vendorId", value)}
        />
```

- `src/components/maintenance/maintenance-plan-form.tsx`, edit 11 of 11 (whole lines). Old:

```tsx
          <Field label={t("pmNotes")}>
```

  New:

```tsx
          <Field label={t("pmNotes")} id="maintenance-plan-notes" error={fieldErrors.message("notes")}>
```

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-m.test.ts`:

```ts

// The maintenance forms, read as text (tests cannot import .tsx).
const C = "src/components/"
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// The body of the module-level `function validate(`, up to the first line that is only "}".
function validateBody(source: string) {
  const start = source.search(/^function validate\(/m)
  assert.notEqual(start, -1, "a module-level function validate(")
  return source.slice(start, source.indexOf("\n}\n", start))
}

// The shape every migrated form shares (plan 1 M-R1 to M-R4): noValidate straight after onSubmit, the field table in
// visual order, validate(), the hook, focus on the first wrong field, each listed key's message under its field, and no
// toast for a validation error. `resultToast` is the one toast a file may keep outside a catch (MT-R5).
function assertMigratedForm(
  source: string,
  form: { ids: Record<string, string>; handler?: string; messages?: readonly string[]; table?: string; hook?: string; server?: false; resultToast?: string },
) {
  const handler = form.handler ?? "handleSubmit"
  const table = form.table ?? "FIELD_IDS"
  const hook = form.hook ?? "fieldErrors"
  assert.match(source, new RegExp(`<form onSubmit=\\{${handler}\\} noValidate[ >\\n]`), "noValidate directly after onSubmit")
  assert.match(source, /import \{ useFieldErrors(?:, useValidationMessage)? \} from "@\/components\/ui\/use-field-errors"/)
  const block = source.match(new RegExp(`const ${table} = \\{\\n([\\s\\S]*?)\\n\\} as const`))
  assert.ok(block, `const ${table} = { … } as const`)
  assert.deepEqual(block[1].split("\n"), Object.entries(form.ids).map(([key, id]) => `  ${key}: "${id}",`), `${table}: the fields in visual order with their ids`)
  for (const id of Object.values(form.ids)) {
    assert.equal(source.match(new RegExp(`\\bid="${escape(id)}"`, "g"))?.length, 1, `id "${id}" once`)
  }
  for (const key of form.messages ?? Object.keys(form.ids)) {
    assert.match(source, new RegExp(`error=\\{${hook}\\.message\\("${escape(key)}"\\)\\}`), `${key}: its error under the field`)
  }
  assert.match(source, new RegExp(`${hook}\\.setErrors\\(validate\\(`), "the client's errors come from validate()")
  if (form.server !== false) {
    assert.match(source, new RegExp(`if \\(${hook}\\.applyServer\\(payload\\) && `), "the server's fieldErrors land on the same fields")
  }
  assert.match(source, new RegExp(`${hook}\\.focusFirst\\(`), "focus goes to the first wrong field")
  const rest = form.resultToast ? source.split(form.resultToast).join("") : source
  assert.doesNotMatch(rest, /\btoast\.(?:error|warning)\(/, "no validation toast (the catch keeps apiError.toast)")
}

test("PM plan: errors under the field, the asset select checked, whole days from 1 to 3650, and the server's refusals on the same fields (v-track2 M3)", () => {
  const source = read(`${C}maintenance/maintenance-plan-form.tsx`)
  assertMigratedForm(source, {
    ids: {
      assetId: "maintenance-plan-asset",
      title: "maintenance-plan-title",
      frequency: "maintenance-plan-frequency",
      intervalDays: "maintenance-plan-interval-days",
      nextDueDate: "maintenance-plan-next-due-date",
      vendorId: "maintenance-plan-vendor",
      notes: "maintenance-plan-notes",
    },
    messages: ["assetId", "title", "frequency", "nextDueDate", "vendorId", "notes"],
  })
  assert.match(source, /^function validate\(values: PlanValues, isEdit: boolean\) \{$/m)
  const rules = validateBody(source)
  for (const rule of [
    'check("assetId", isEdit ? null : required(values.assetId))',
    'check("title", required(values.title) ?? maxLength(values.title, 200))',
    'check("frequency", required(values.frequency))',
    'check("intervalDays", values.frequency === "custom" ? required(values.intervalDays) ?? range(values.intervalDays, 1, 3650) ?? step(values.intervalDays, 1) : null)',
    'check("nextDueDate", required(values.nextDueDate))',
    'check("notes", maxLength(values.notes, 4000))',
  ]) assert.ok(rules.includes(rule), rule)
  assert.match(source, /fieldErrors\.setErrors\(validate\(values, Boolean\(planId\)\)\)/)
  // The days say their range (plan 1 M-R4: a field with limits says its numbers).
  assert.ok(source.includes("error={fieldErrors.errors.intervalDays ? validationMessage(fieldErrors.errors.intervalDays, { min: 1, max: 3650 }) : undefined}"))
  // The asset select was an asterisk nothing checked (spec §5): it has an id for focus and shows its error.
  assert.match(source, /<MaintenanceOptionSelect\n\s+id="maintenance-plan-asset"\n\s+type="asset"\n[\s\S]*?\n\s+required\n[\s\S]*?\n\s+error=\{fieldErrors\.message\("assetId"\)\}\n/)
  // A field's error clears when it changes; a frequency change also clears the days, which only a custom frequency shows.
  assert.match(source, /setValues\(\(current\) => \(\{ \.\.\.current, \[field\]: value \}\)\)\n[^\n]*\n\s+if \(field === "frequency"\) fieldErrors\.clear\("frequency", "intervalDays"\)\n\s+else fieldErrors\.clear\(field\)/)
  // A refusal with a field (the vendor, a zod 400) lands under it; any other keeps the domain message.
  assert.match(source, /if \(fieldErrors\.applyServer\(payload\) && focusFirstError\(\)\) return\n\s+throw new Error\(getMaintenanceErrorMessage\(payload\?\.code, t, tCommon\("error"\)\)\)/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-m.test.ts`. Expected to fail: "PM plan: errors under the field, the asset select checked, whole days from 1 to 3650, and the server's refusals on the same fields (v-track2 M3)" ("noValidate directly after onSubmit"). After Step 3 and before Step 4, `node --test tests/pm-plans-ui.test.ts tests/maintenance-sweep-ui.test.ts tests/validation-guards.test.ts` fails three tests: "the PM plan form uses the shared field primitives and a busy save button (2C batch 1a)", "PM plan form: a plain ContentPanel with no tinted frame and no heading of its own; the page header names the form (spec 2D D9)" and "V5 the required selects that nothing checks only count down (spec §5)"; Step 4 is their edit.
- [ ] **Step 3: Implement** per the exact edits.
- [ ] **Step 4: Pin and guard edits** (exact old → new; each old string occurs once in its file):

- `tests/pm-plans-ui.test.ts`, edit 1 of 1 (whole lines). Old:

```ts
  assert.equal(form.match(/<Field label=\{t\("pm\w+"\)\} required>/g)?.length, 4)
  assert.equal(form.match(/^\s+required$/gm)?.length, 4, "each starred field keeps the browser's own required check")
```

  New:

```ts
  // Each starred Field names its control and shows its error (v-track plan 2 M3); the days Field says its range.
  assert.equal(form.match(/<Field label=\{t\("pm\w+"\)\} id="maintenance-plan-[\w-]+" required error=\{fieldErrors\.message\("\w+"\)\}>/g)?.length, 3)
  assert.match(form, /<Field\n\s+label=\{t\("pmIntervalDays"\)\}\n\s+id="maintenance-plan-interval-days"\n\s+required\n/)
  // Four controls keep the browser's own required; the asset select and the days Field write theirs on a line too.
  assert.equal(form.match(/^\s+required$/gm)?.length, 6, "each starred field keeps the browser's own required check")
```

- `tests/maintenance-sweep-ui.test.ts`, edit 1 of 1. Old:

```ts
<form onSubmit=\{handleSubmit\} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">/)
```

  New:

```ts
<form onSubmit=\{handleSubmit\} noValidate className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">/)
```

- `tests/validation-guards.test.ts`, edit 1 of 2 (whole lines). Old:

```ts
  [`${C}maintenance/maintenance-plan-form.tsx`]: 1,
  [`${C}maintenance/repair-record-form.tsx`]: 2,
```

  New:

```ts
  [`${C}maintenance/repair-record-form.tsx`]: 2,
```

- `tests/validation-guards.test.ts`, edit 2 of 2. Old:

```ts
]

// Required selects (SearchableSelect and its two wrappers) with no error=
```

  New:

```ts
  `${C}maintenance/maintenance-plan-form.tsx`,
]

// Required selects (SearchableSelect and its two wrappers) with no error=
```

- [ ] **Step 5: Verify.** `node --test tests/v-track2-m.test.ts tests/pm-plans-ui.test.ts tests/maintenance-sweep-ui.test.ts tests/maintenance-option-select.test.ts tests/maintenance-i18n.test.ts tests/operational-return-navigation.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/visual-foundation-guards.test.ts tests/v-track-f.test.ts`; `npm test` (+1; 2284 tests, 2283 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint`. eol: `maintenance-plan-form.tsx` `230 230`, `pm-plans-ui` `41 41`, `maintenance-sweep-ui` `0 118` (LF), `validation-guards` its line count with CRLF (`221 221` on this plan's chain, P-R5), `v-track2-m` `0 181`.
- [ ] **Step 6: Commit.** `git add src/components/maintenance/maintenance-plan-form.tsx tests/pm-plans-ui.test.ts tests/maintenance-sweep-ui.test.ts tests/validation-guards.test.ts tests/v-track2-m.test.ts`, then `git commit -m "feat(maintenance): the PM plan form shows its errors under the field and checks its asset (v-track plan 2 task 29, M3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 30 (M4): The repair record form shows its errors under the field and checks its asset and reporter (`c/maintenance/repair-record-form.tsx`)

Spec §4.1, §4.2 (the closed "more details"), §4.3, §4.4 (the reporter a content rule), §4.5, §5 #30 (two asterisk-only selects), §7.3 (radio groups); plan 1 M-R1 to M-R5; MT-R3, MT-R4, MT-R5, MT-R8.

**Files:** Modify `src/components/maintenance/repair-record-form.tsx` (CRLF) · Pins `tests/repair-record-ui.test.ts`, `tests/choice-controls-ui.test.ts` (CRLF), `tests/maintenance-sweep-ui.test.ts` (**LF**) · Guard `tests/validation-guards.test.ts` (`V_FORMS`, `SELECT_STAR_ONLY`, a `NON_VALIDATION_TOASTS` row) · Test `tests/v-track2-m.test.ts` (LF).

**Changes at e1caa29:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| imports `:13-14` | `Field, FieldRequiredMark`; `fieldLabelClasses` | `Field`; `FieldGroup` from `@/components/ui/field-group` | MT-R4 |
| imports `:26-27` | `cn`, `use-api-error` | + `maxLength, range, required, step` from `@/lib/validation-rules`; + `useFieldErrors, useValidationMessage` | MT-R3 |
| after `type Outcome` `:30` | — | `type RepairValues`, `FIELD_IDS` (10 keys), `RepairField`, `FIELD_ORDER`, `DETAIL_FIELDS`, `fieldOrder(values, needsReporter)`, `function validate(values: RepairValues, needsReporter: boolean)` exactly as below | MT-R3, MT-R4 |
| `:55` | `useState({` | `useState<RepairValues>({` | MT-R3 |
| after `effectKey :67`; `setField :69-71` | — | `fieldErrors`, `validationMessage`, `focusFirstError` with `reveal`; `setField` clears its key | MT-R3, MT-R4 |
| `handleSubmit :83-85`, `:106-107` | `setSaving(true)` …; the open-record line, then `throw` | `setErrors(validate(values, needsReporter))`, `if (focusFirstError()) return`; between the open-record line and the `throw`: the comment and the `applyServer` line | MT-R3, MT-R8 |
| `<form>` `:122` | `<form onSubmit={handleSubmit} className="space-y-5">` | `noValidate` after `onSubmit` | FIXED 6 |
| asset `:124-137`, reporter `:190-201`, vendor `:216-226` | `MaintenanceOptionSelect`s | `id` first, `error` before `onChange` | MT-R3 |
| `:150`, `:153`, `:227`, `:230`, `:255` | date, problem, cost, invoice, remark `Field`s | `id` and `error`; the cost one prop per line with `{ min: 0 }` | MT-R3 |
| `:164-182` | two `fieldset`s with `legend` and `FieldRequiredMark` | two `FieldGroup`s with `required` and `error` | MT-R4 |
| `:110` | `if (failed > 0) toast.warning(t("uploadFailed", { count: failed }))` | unchanged (a `NON_VALIDATION_TOASTS` row) | MT-R5 |

Exact edits (rehearsed):

- `src/components/maintenance/repair-record-form.tsx`, edit 1 of 20 (whole lines). Old:

```tsx
import { Field, FieldRequiredMark } from "@/components/ui/field"
import { fieldLabelClasses } from "@/components/ui/field-variants"
```

  New:

```tsx
import { Field } from "@/components/ui/field"
import { FieldGroup } from "@/components/ui/field-group"
```

- `src/components/maintenance/repair-record-form.tsx`, edit 2 of 20 (whole lines). Old:

```tsx
import { cn } from "@/lib/utils"
import { useApiError } from "@/components/ui/use-api-error"

type Option = { id: string; label: string }
type Outcome = "usable" | "beyond_repair"
```

  New:

```tsx
import { cn } from "@/lib/utils"
import { maxLength, range, required, step } from "@/lib/validation-rules"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"

type Option = { id: string; label: string }
type Outcome = "usable" | "beyond_repair"
type RepairValues = {
  assetId: string
  reportedDate: string
  problem: string
  done: boolean
  outcome: Outcome
  reportedById: string
  vendorId: string
  repairCost: string
  invoiceNo: string
  remark: string
}

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1). The two
// questions are radio groups: their id is the FieldGroup's.
const FIELD_IDS = {
  assetId: "repair-record-asset",
  reportedDate: "repair-record-date",
  problem: "repair-record-problem",
  done: "repair-record-done",
  outcome: "repair-record-outcome",
  reportedById: "repair-record-reporter",
  vendorId: "repair-record-vendor",
  repairCost: "repair-record-cost",
  invoiceNo: "repair-record-invoice-no",
  remark: "repair-record-remark",
} as const
type RepairField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as RepairField[]
// The fields inside "more details", which opens before focus moves there (spec §4.2).
const DETAIL_FIELDS: readonly RepairField[] = ["vendorId", "repairCost", "invoiceNo", "remark"]

// The fields on screen: the outcome only when the repair is done, the reporter only for an account without an employee.
function fieldOrder(values: RepairValues, needsReporter: boolean) {
  return FIELD_ORDER.filter((key) => (key !== "outcome" || values.done) && (key !== "reportedById" || needsReporter))
}

// noValidate turns the browser's check off, so this restates the controls' required, maxLength, min and step, and the
// reporter the server needs from an account without a linked employee (MAINTENANCE_REPORTER_REQUIRED) (v-track M-R2).
function validate(values: RepairValues, needsReporter: boolean) {
  const errors: Partial<Record<RepairField, string>> = {}
  const check = (key: RepairField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("assetId", required(values.assetId))
  check("reportedDate", required(values.reportedDate))
  check("problem", required(values.problem) ?? maxLength(values.problem, 4000))
  check("reportedById", needsReporter ? required(values.reportedById) : null)
  check("repairCost", range(values.repairCost, 0) ?? step(values.repairCost, 0.01))
  check("invoiceNo", maxLength(values.invoiceNo, 100))
  check("remark", maxLength(values.remark, 4000))
  return errors
}
```

- `src/components/maintenance/repair-record-form.tsx`, edit 3 of 20. Old:

```tsx
  const [values, setValues] = useState({
    assetId: initialAsset?.id ?? "",
```

  New:

```tsx
  const [values, setValues] = useState<RepairValues>({
    assetId: initialAsset?.id ?? "",
```

- `src/components/maintenance/repair-record-form.tsx`, edit 4 of 20 (whole lines). Old:

```tsx
  const effectKey = !values.done ? "toMaintenance" : values.outcome === "beyond_repair" ? "toDisposal" : null

  function setField<K extends keyof typeof values>(field: K, value: (typeof values)[K]) {
    setValues((current) => ({ ...current, [field]: value }))
  }
```

  New:

```tsx
  const effectKey = !values.done ? "toMaintenance" : values.outcome === "beyond_repair" ? "toDisposal" : null
  const fieldErrors = useFieldErrors<RepairField>()
  const validationMessage = useValidationMessage()
  const focusFirstError = () =>
    fieldErrors.focusFirst(fieldOrder(values, needsReporter), {
      idFor: (key) => FIELD_IDS[key],
      reveal: (key) => {
        if (DETAIL_FIELDS.includes(key)) setShowDetails(true)
      },
    })

  function setField<K extends keyof typeof values>(field: K, value: (typeof values)[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    fieldErrors.clear(field)
  }
```

- `src/components/maintenance/repair-record-form.tsx`, edit 5 of 20 (whole lines). Old:

```tsx
    event.preventDefault()
    setSaving(true)
    setOpenRecordAssetId(null)
```

  New:

```tsx
    event.preventDefault()
    fieldErrors.setErrors(validate(values, needsReporter))
    if (focusFirstError()) return
    setSaving(true)
    setOpenRecordAssetId(null)
```

- `src/components/maintenance/repair-record-form.tsx`, edit 6 of 20. Old:

```tsx
        if (payload?.code === "MAINTENANCE_OPEN_RECORD_EXISTS") setOpenRecordAssetId(values.assetId)
        throw new Error(
```

  New:

```tsx
        if (payload?.code === "MAINTENANCE_OPEN_RECORD_EXISTS") setOpenRecordAssetId(values.assetId)
        // A refusal that names a field of this form shows under it; any other keeps the toast (spec §4.1).
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error(
```

- `src/components/maintenance/repair-record-form.tsx`, edit 7 of 20 (whole lines). Old:

```tsx
      <form onSubmit={handleSubmit} className="space-y-5">
```

  New:

```tsx
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
```

- `src/components/maintenance/repair-record-form.tsx`, edit 8 of 20 (whole lines). Old:

```tsx
        <MaintenanceOptionSelect
          type="asset"
```

  New:

```tsx
        <MaintenanceOptionSelect
          id="repair-record-asset"
          type="asset"
```

- `src/components/maintenance/repair-record-form.tsx`, edit 9 of 20 (whole lines). Old:

```tsx
          formatReason={(code) => getMaintenanceErrorMessage(code, tMaintenance, code)}
          onChange={(value) => setField("assetId", value)}
```

  New:

```tsx
          formatReason={(code) => getMaintenanceErrorMessage(code, tMaintenance, code)}
          error={fieldErrors.message("assetId")}
          onChange={(value) => setField("assetId", value)}
```

- `src/components/maintenance/repair-record-form.tsx`, edit 10 of 20 (whole lines). Old:

```tsx
          <Field label={t("date")} required>
```

  New:

```tsx
          <Field label={t("date")} id="repair-record-date" required error={fieldErrors.message("reportedDate")}>
```

- `src/components/maintenance/repair-record-form.tsx`, edit 11 of 20 (whole lines). Old:

```tsx
          <Field label={t("problem")} required>
```

  New:

```tsx
          <Field label={t("problem")} id="repair-record-problem" required error={fieldErrors.message("problem")}>
```

- `src/components/maintenance/repair-record-form.tsx`, edit 12 of 20 (whole lines). Old:

```tsx
        <fieldset className="min-w-0">
          <legend className={cn(fieldLabelClasses, "mb-1.5")}>
            {t("doneQuestion")}<FieldRequiredMark />
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <ChoiceCard type="radio" name="done" checked={values.done} label={t("doneYes")} onChange={() => setField("done", true)} />
            <ChoiceCard type="radio" name="done" checked={!values.done} label={t("doneNo")} onChange={() => setField("done", false)} />
          </div>
        </fieldset>
        {values.done ? (
          <fieldset className="min-w-0">
            <legend className={cn(fieldLabelClasses, "mb-1.5")}>
              {t("outcomeQuestion")}<FieldRequiredMark />
            </legend>
```

  New:

```tsx
        <FieldGroup legend={t("doneQuestion")} id="repair-record-done" required error={fieldErrors.message("done")}>
          <div className="grid gap-2 sm:grid-cols-2">
            <ChoiceCard type="radio" name="done" checked={values.done} label={t("doneYes")} onChange={() => setField("done", true)} />
            <ChoiceCard type="radio" name="done" checked={!values.done} label={t("doneNo")} onChange={() => setField("done", false)} />
          </div>
        </FieldGroup>
        {values.done ? (
          <FieldGroup legend={t("outcomeQuestion")} id="repair-record-outcome" required error={fieldErrors.message("outcome")}>
```

- `src/components/maintenance/repair-record-form.tsx`, edit 13 of 20 (whole lines). Old:

```tsx
              <ChoiceCard type="radio" name="outcome" checked={values.outcome === "beyond_repair"} label={t("outcome.beyond_repair")} onChange={() => setField("outcome", "beyond_repair")} />
            </div>
          </fieldset>
```

  New:

```tsx
              <ChoiceCard type="radio" name="outcome" checked={values.outcome === "beyond_repair"} label={t("outcome.beyond_repair")} onChange={() => setField("outcome", "beyond_repair")} />
            </div>
          </FieldGroup>
```

- `src/components/maintenance/repair-record-form.tsx`, edit 14 of 20 (whole lines). Old:

```tsx
          <MaintenanceOptionSelect
            type="employee"
```

  New:

```tsx
          <MaintenanceOptionSelect
            id="repair-record-reporter"
            type="employee"
```

- `src/components/maintenance/repair-record-form.tsx`, edit 15 of 20 (whole lines). Old:

```tsx
            hint={t("reporterHelp")}
            onChange={(value) => setField("reportedById", value)}
```

  New:

```tsx
            hint={t("reporterHelp")}
            error={fieldErrors.message("reportedById")}
            onChange={(value) => setField("reportedById", value)}
```

- `src/components/maintenance/repair-record-form.tsx`, edit 16 of 20 (whole lines). Old:

```tsx
              <MaintenanceOptionSelect
                type="supplier"
```

  New:

```tsx
              <MaintenanceOptionSelect
                id="repair-record-vendor"
                type="supplier"
```

- `src/components/maintenance/repair-record-form.tsx`, edit 17 of 20 (whole lines). Old:

```tsx
                loadingLabel={tCommon("loading")}
                onChange={(value) => setField("vendorId", value)}
```

  New:

```tsx
                loadingLabel={tCommon("loading")}
                error={fieldErrors.message("vendorId")}
                onChange={(value) => setField("vendorId", value)}
```

- `src/components/maintenance/repair-record-form.tsx`, edit 18 of 20 (whole lines). Old:

```tsx
              <Field label={t("cost")}>
```

  New:

```tsx
              <Field
                label={t("cost")}
                id="repair-record-cost"
                error={fieldErrors.errors.repairCost ? validationMessage(fieldErrors.errors.repairCost, { min: 0 }) : undefined}
              >
```

- `src/components/maintenance/repair-record-form.tsx`, edit 19 of 20 (whole lines). Old:

```tsx
              <Field label={t("invoiceNo")}>
```

  New:

```tsx
              <Field label={t("invoiceNo")} id="repair-record-invoice-no" error={fieldErrors.message("invoiceNo")}>
```

- `src/components/maintenance/repair-record-form.tsx`, edit 20 of 20 (whole lines). Old:

```tsx
                <Field label={t("remark")}>
```

  New:

```tsx
                <Field label={t("remark")} id="repair-record-remark" error={fieldErrors.message("remark")}>
```

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-m.test.ts`:

```ts

test("repair record: errors under the field, the asset and reporter selects checked, the two questions as groups, and more details opened for an error inside (v-track2 M4)", () => {
  const source = read(`${C}maintenance/repair-record-form.tsx`)
  const uploadToast = 'toast.warning(t("uploadFailed", { count: failed }))'
  assertMigratedForm(source, {
    ids: {
      assetId: "repair-record-asset",
      reportedDate: "repair-record-date",
      problem: "repair-record-problem",
      done: "repair-record-done",
      outcome: "repair-record-outcome",
      reportedById: "repair-record-reporter",
      vendorId: "repair-record-vendor",
      repairCost: "repair-record-cost",
      invoiceNo: "repair-record-invoice-no",
      remark: "repair-record-remark",
    },
    messages: ["assetId", "reportedDate", "problem", "done", "outcome", "reportedById", "vendorId", "invoiceNo", "remark"],
    resultToast: uploadToast,
  })
  assert.match(source, /^function validate\(values: RepairValues, needsReporter: boolean\) \{$/m)
  const rules = validateBody(source)
  for (const rule of [
    'check("assetId", required(values.assetId))',
    'check("reportedDate", required(values.reportedDate))',
    'check("problem", required(values.problem) ?? maxLength(values.problem, 4000))',
    'check("reportedById", needsReporter ? required(values.reportedById) : null)',
    'check("repairCost", range(values.repairCost, 0) ?? step(values.repairCost, 0.01))',
    'check("invoiceNo", maxLength(values.invoiceNo, 100))',
    'check("remark", maxLength(values.remark, 4000))',
  ]) assert.ok(rules.includes(rule), rule)
  assert.match(source, /fieldErrors\.setErrors\(validate\(values, needsReporter\)\)/)
  assert.ok(source.includes("error={fieldErrors.errors.repairCost ? validationMessage(fieldErrors.errors.repairCost, { min: 0 }) : undefined}"), "the cost says its floor")
  // The two selects were asterisks nothing checked (spec §5): each has an id for focus and shows its error.
  assert.match(source, /<MaintenanceOptionSelect\n\s+id="repair-record-asset"\n\s+type="asset"\n[\s\S]*?\n\s+error=\{fieldErrors\.message\("assetId"\)\}\n/)
  assert.match(source, /<MaintenanceOptionSelect\n\s+id="repair-record-reporter"\n\s+type="employee"\n[\s\S]*?\n\s+error=\{fieldErrors\.message\("reportedById"\)\}\n/)
  // The two questions are FieldGroups (spec §7.3): the star, and an error tied to the group.
  for (const key of ["done", "outcome"]) {
    assert.ok(source.includes(`<FieldGroup legend={t("${key}Question")} id="repair-record-${key}" required error={fieldErrors.message("${key}")}>`), key)
  }
  // Focus only goes to a field on screen; a field inside "more details" opens it first (spec §4.2).
  assert.match(source, /^const DETAIL_FIELDS: readonly RepairField\[\] = \["vendorId", "repairCost", "invoiceNo", "remark"\]$/m)
  assert.match(source, /return FIELD_ORDER\.filter\(\(key\) => \(key !== "outcome" \|\| values\.done\) && \(key !== "reportedById" \|\| needsReporter\)\)/)
  assert.match(source, /reveal: \(key\) => \{\n\s+if \(DETAIL_FIELDS\.includes\(key\)\) setShowDetails\(true\)\n\s+\},/)
  // The open record keeps its Notice with the link; a refusal with a field lands under it; the rest keeps the toast.
  assert.match(source, /if \(payload\?\.code === "MAINTENANCE_OPEN_RECORD_EXISTS"\) setOpenRecordAssetId\(values\.assetId\)\n[^\n]*\n\s+if \(fieldErrors\.applyServer\(payload\) && focusFirstError\(\)\) return\n\s+throw new Error\(getMaintenanceErrorMessage\(payload\?\.code, tMaintenance, tCommon\("error"\)\)\)/)
  assert.match(source, /setValues\(\(current\) => \(\{ \.\.\.current, \[field\]: value \}\)\)\n\s+fieldErrors\.clear\(field\)/)
  // The upload result is not a field error: it stays a toast after the record is saved (MT-R5).
  assert.equal(source.split(uploadToast).length - 1, 1)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-m.test.ts`. Expected to fail: "repair record: errors under the field, the asset and reporter selects checked, the two questions as groups, and more details opened for an error inside (v-track2 M4)" ("noValidate directly after onSubmit"). After Step 3 and before Step 4, `node --test tests/repair-record-ui.test.ts tests/choice-controls-ui.test.ts tests/maintenance-sweep-ui.test.ts tests/validation-guards.test.ts` fails four tests: "the repair form uses the shared fields, a busy save button and an underlined link on the warning (2C batch 1a)", "the repair form asks its two questions with ChoiceCard radios under a field-style legend (R2)", "repair form: a ContentPanel, the open-record error and the status effect as Notices, the reporter hint on its select, and an outline disclosure over a quiet grouping (spec 2D D7, D9, M29)" and "V5 the required selects that nothing checks only count down (spec §5)"; Step 4 is their edit. (Without its `NON_VALIDATION_TOASTS` row, V3 would fail on `repair-record-form.tsx`'s upload toast as soon as the file is in `V_FORMS`: that is why Step 4 adds both together.)
- [ ] **Step 3: Implement** per the exact edits.
- [ ] **Step 4: Pin and guard edits** (exact old → new; each old string occurs once in its file):

- `tests/repair-record-ui.test.ts`, edit 1 of 1. Old:

```ts
  assert.match(source, /<Field label=\{t\("date"\)\} required>\n\s+<Input type="date" required /)
  assert.match(source, /<Field label=\{t\("problem"\)\} required>\n\s+<Textarea\n
```

  New:

```ts
  // Each Field names its control and shows its error (v-track plan 2 M4).
  assert.match(source, /<Field label=\{t\("date"\)\} id="repair-record-date" required error=\{fieldErrors\.message\("reportedDate"\)\}>\n\s+<Input type="date" required /)
  assert.match(source, /<Field label=\{t\("problem"\)\} id="repair-record-problem" required error=\{fieldErrors\.message\("problem"\)\}>\n\s+<Textarea\n
```

- `tests/choice-controls-ui.test.ts`, edit 1 of 1 (whole lines). Old:

```ts
  assert.equal(source.match(/<fieldset className="min-w-0">\n\s+<legend className=\{cn\(fieldLabelClasses, "mb-1\.5"\)\}>/g)?.length, 2)
  assert.equal(source.match(/<FieldRequiredMark \/>/g)?.length, 2)
```

  New:

```ts
  // The two questions are FieldGroups with the star and one error each (v-track plan 2 M4).
  assert.equal(source.match(/<FieldGroup legend=\{t\("(?:done|outcome)Question"\)\} id="repair-record-(?:done|outcome)" required error=\{fieldErrors\.message\("(?:done|outcome)"\)\}>/g)?.length, 2)
  assert.doesNotMatch(source, /<fieldset\b|<FieldRequiredMark \/>/)
```

- `tests/maintenance-sweep-ui.test.ts`, edit 1 of 1. Old:

```ts
<form onSubmit=\{handleSubmit\} className="space-y-5">/)
```

  New:

```ts
<form onSubmit=\{handleSubmit\} noValidate className="space-y-5">/)
```

- `tests/validation-guards.test.ts`, edit 1 of 3 (whole lines). Old:

```ts
  [`${C}maintenance/repair-record-form.tsx`]: 2,
```

  New: nothing (the line goes, with its line break).

- `tests/validation-guards.test.ts`, edit 2 of 3. Old:

```ts
]

// Required selects (SearchableSelect and its two wrappers) with no error=
```

  New:

```ts
  `${C}maintenance/repair-record-form.tsx`,
]

// Required selects (SearchableSelect and its two wrappers) with no error=
```

- `tests/validation-guards.test.ts`, edit 3 of 3 (P-R4: a row of the list Task 21 created; insert it directly after the list's opening line). Old:

```ts
const NON_VALIDATION_TOASTS: Readonly<Record<string, { count: number; why: string; ruling: string }>> = {
```

  New:

```ts
const NON_VALIDATION_TOASTS: Readonly<Record<string, { count: number; why: string; ruling: string }>> = {
  [`${C}maintenance/repair-record-form.tsx`]: { count: 1, why: "the record is saved and the page moves to it; files that did not upload can be attached there", ruling: "v-track plan 2 MT-R5" },
```

- [ ] **Step 5: Verify.** `node --test tests/v-track2-m.test.ts tests/repair-record-ui.test.ts tests/choice-controls-ui.test.ts tests/file-evidence-ui.test.ts tests/maintenance-sweep-ui.test.ts tests/maintenance-option-select.test.ts tests/maintenance-i18n.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/visual-foundation-guards.test.ts tests/field-primitives.test.ts tests/v-track-f.test.ts`; `npm test` (+1; 2285 tests, 2284 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint`. eol: `repair-record-form.tsx` `344 344`, `repair-record-ui` `63 63`, `choice-controls-ui` `153 153`, `maintenance-sweep-ui` `0 118` (LF), `validation-guards` CRLF (`222 222` on this plan's chain), `v-track2-m` `0 231`.
- [ ] **Step 6: Commit.** `git add src/components/maintenance/repair-record-form.tsx tests/repair-record-ui.test.ts tests/choice-controls-ui.test.ts tests/maintenance-sweep-ui.test.ts tests/validation-guards.test.ts tests/v-track2-m.test.ts`, then `git commit -m "feat(maintenance): the repair record form shows its errors under the field and checks its asset and reporter (v-track plan 2 task 30, M4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 31 (M5): The repair record dialogs show their errors under the field and the return date is not before the reported date (`c/maintenance/repair-record-actions.tsx`, messages)

Spec §4.1, §4.3, §4.5, §5 #31–#33, §7.4 (the repair completion date), §6.3 and §11 call 6 (a client rule); plan 1 M-R1 to M-R5; MT-R3, MT-R5, MT-R6, MT-R7.

**Files:** Modify `src/components/maintenance/repair-record-actions.tsx`, `messages/th.json`, `messages/en.json` (CRLF; messages only through the script) · Pins `tests/repair-record-detail-ui.test.ts`, `tests/choice-controls-ui.test.ts` (CRLF) · Guard `tests/validation-guards.test.ts` (`V_FORMS`, a `NON_VALIDATION_TOASTS` row) · Test `tests/v-track2-m.test.ts` (LF).

**Changes at e1caa29:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| imports `:11-12`, `:21-22` | `Field, FieldRequiredMark`, `fieldLabelClasses`, `cn` | `Field`, `FieldGroup`; `maxLength, notBefore, range, required, step`; `useFieldErrors, useValidationMessage` (`cn` and `fieldLabelClasses` had no other use) | MT-R6 |
| after `type Dialog :26` | — | the three tables, `RepairActionField`, one `validate(values, reportedDate)` exactly as below | MT-R6, MT-R7 |
| after `edit` state `:65`; `close :67-71` | — | the three hooks, `validationMessage`, three `focusFirst…Error`; `close()` also clears the three maps; `setCompleteField`, `setEditField` | MT-R6 |
| `send :82`, `:91` | two arguments; `if (!response.ok) throw …` | a third argument `showRefusal`; `if (showRefusal(payload)) return` before the throw | MT-R6 |
| before `return (` `:105` | — | `handleComplete`, `handleCancel`, `handleEdit` (the bodies the three inline `onSubmit`s held, after `validate()`) | MT-R6 |
| `:122-136`, `:194-200`, `:217-231` | `<form` / `className={accessibleDialogFormClasses}` / inline `onSubmit` | `<form onSubmit={handleComplete} noValidate className={accessibleDialogFormClasses}>` (Cancel, Edit) | FIXED 6 |
| `:139-140` | return date `Field` and `Input` | one prop per line with the domain error (MT-R7); `min={details.reportedDate}` | MT-R7 |
| `:142-149` | outcome `fieldset` | `FieldGroup` | MT-R4 |
| `:150`, `:240` | one-line vendor selects | one prop per line, `id`, `error` | MT-R3 |
| the other `Field`s and every `setComplete((v) => …)` / `setEdit((v) => …)` / `setReason` | — | `id`, `error`; `setCompleteField` / `setEditField`; the reason clears its error | MT-R3 |
| `:93` | upload `toast.warning` | unchanged (a `NON_VALIDATION_TOASTS` row) | MT-R5 |

Exact edits (rehearsed):

- `src/components/maintenance/repair-record-actions.tsx`, edit 1 of 14 (whole lines). Old:

```tsx
import { Field, FieldRequiredMark } from "@/components/ui/field"
import { fieldLabelClasses } from "@/components/ui/field-variants"
```

  New:

```tsx
import { Field } from "@/components/ui/field"
import { FieldGroup } from "@/components/ui/field-group"
```

- `src/components/maintenance/repair-record-actions.tsx`, edit 2 of 14 (whole lines). Old:

```tsx
import { cn } from "@/lib/utils"
import { useApiError } from "@/components/ui/use-api-error"
```

  New:

```tsx
import { maxLength, notBefore, range, required, step } from "@/lib/validation-rules"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"
```

- `src/components/maintenance/repair-record-actions.tsx`, edit 3 of 14 (whole lines). Old:

```tsx
type Dialog = "complete" | "cancel" | "edit" | null
```

  New:

```tsx
type Dialog = "complete" | "cancel" | "edit" | null

// The fields of each dialog in visual order, keyed like the server's fieldErrors, with the id focus moves to
// (v-track M-R1). The outcome is a radio group: its id is the FieldGroup's.
const COMPLETE_FIELD_IDS = {
  returnDate: "repair-complete-return-date",
  outcome: "repair-complete-outcome",
  vendorId: "repair-complete-vendor",
  repairCost: "repair-complete-cost",
  invoiceNo: "repair-complete-invoice-no",
  remark: "repair-complete-remark",
} as const
type CompleteField = keyof typeof COMPLETE_FIELD_IDS
const COMPLETE_FIELD_ORDER = Object.keys(COMPLETE_FIELD_IDS) as CompleteField[]
const CANCEL_FIELD_IDS = {
  reason: "repair-cancel-reason",
} as const
type CancelField = keyof typeof CANCEL_FIELD_IDS
const CANCEL_FIELD_ORDER = Object.keys(CANCEL_FIELD_IDS) as CancelField[]
const EDIT_FIELD_IDS = {
  reportedDate: "repair-edit-date",
  problem: "repair-edit-problem",
  vendorId: "repair-edit-vendor",
  repairCost: "repair-edit-cost",
  invoiceNo: "repair-edit-invoice-no",
  remark: "repair-edit-remark",
} as const
type EditField = keyof typeof EDIT_FIELD_IDS
const EDIT_FIELD_ORDER = Object.keys(EDIT_FIELD_IDS) as EditField[]
type RepairActionField = CompleteField | CancelField | EditField

// noValidate turns the browser's check off, so this restates the controls' required, min, step and maxLength for the
// three dialogs; each passes only its own fields, and a field it does not pass is not checked. The return date is not
// before the reported date: a client rule, the server has none (spec §7.4, §11 call 6) (v-track M-R2).
function validate(values: Partial<Record<RepairActionField, string>>, reportedDate: string) {
  const errors: Partial<Record<RepairActionField, string>> = {}
  const check = (key: RepairActionField, code: string | null) => {
    if (code) errors[key] = code
  }
  if (values.returnDate !== undefined) check("returnDate", required(values.returnDate) ?? notBefore(values.returnDate, reportedDate))
  if (values.reportedDate !== undefined) check("reportedDate", required(values.reportedDate))
  if (values.problem !== undefined) check("problem", required(values.problem) ?? maxLength(values.problem, 4000))
  check("repairCost", range(values.repairCost, 0) ?? step(values.repairCost, 0.01))
  check("invoiceNo", maxLength(values.invoiceNo, 100))
  check("remark", maxLength(values.remark, 4000))
  check("reason", maxLength(values.reason, 1000))
  return errors
}
```

- `src/components/maintenance/repair-record-actions.tsx`, edit 4 of 14 (whole lines). Old:

```tsx
    remark: details.remark,
  })

  function close() {
    if (saving) return
    setDialog(null)
    setFiles([])
  }
```

  New:

```tsx
    remark: details.remark,
  })
  const completeErrors = useFieldErrors<CompleteField>()
  const cancelErrors = useFieldErrors<CancelField>()
  const editErrors = useFieldErrors<EditField>()
  const validationMessage = useValidationMessage()
  const focusFirstCompleteError = () => completeErrors.focusFirst(COMPLETE_FIELD_ORDER, { idFor: (key) => COMPLETE_FIELD_IDS[key] })
  const focusFirstCancelError = () => cancelErrors.focusFirst(CANCEL_FIELD_ORDER, { idFor: (key) => CANCEL_FIELD_IDS[key] })
  const focusFirstEditError = () => editErrors.focusFirst(EDIT_FIELD_ORDER, { idFor: (key) => EDIT_FIELD_IDS[key] })

  function close() {
    if (saving) return
    setDialog(null)
    setFiles([])
    // A dialog opens again without the errors of its last try.
    completeErrors.setErrors({})
    cancelErrors.setErrors({})
    editErrors.setErrors({})
  }

  function setCompleteField<K extends CompleteField>(field: K, value: (typeof complete)[K]) {
    setComplete((current) => ({ ...current, [field]: value }))
    completeErrors.clear(field)
  }

  function setEditField<K extends EditField>(field: K, value: (typeof edit)[K]) {
    setEdit((current) => ({ ...current, [field]: value }))
    editErrors.clear(field)
  }
```

- `src/components/maintenance/repair-record-actions.tsx`, edit 5 of 14 (whole lines). Old:

```tsx
  async function send(body: Record<string, unknown>, successKey: "completed" | "cancelled" | "updated") {
```

  New:

```tsx
  // Sends one dialog's action. showRefusal puts a refusal that names a field of that dialog under the field; any other
  // refusal keeps the toast (spec §4.1).
  async function send(body: Record<string, unknown>, successKey: "completed" | "cancelled" | "updated", showRefusal: (payload: unknown) => boolean) {
```

- `src/components/maintenance/repair-record-actions.tsx`, edit 6 of 14 (whole lines). Old:

```tsx
      if (!response.ok) throw new Error(getMaintenanceErrorMessage(payload?.code, tMaintenance, tCommon("error")))
```

  New:

```tsx
      if (!response.ok) {
        if (showRefusal(payload)) return
        throw new Error(getMaintenanceErrorMessage(payload?.code, tMaintenance, tCommon("error")))
      }
```

- `src/components/maintenance/repair-record-actions.tsx`, edit 7 of 14 (whole lines). Old:

```tsx
      setSaving(false)
    }
  }

  return (
```

  New:

```tsx
      setSaving(false)
    }
  }

  function handleComplete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    completeErrors.setErrors(validate(complete, details.reportedDate))
    if (focusFirstCompleteError()) return
    void send({
      action: "complete",
      returnDate: complete.returnDate,
      outcome: complete.outcome,
      vendorId: complete.vendorId || null,
      repairCost: complete.repairCost || null,
      invoiceNo: complete.invoiceNo || null,
      remark: complete.remark || null,
    }, "completed", (payload) => completeErrors.applyServer(payload) && focusFirstCompleteError())
  }

  function handleCancel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    cancelErrors.setErrors(validate({ reason }, details.reportedDate))
    if (focusFirstCancelError()) return
    void send({ action: "cancel", reason: reason.trim() || null }, "cancelled", (payload) => cancelErrors.applyServer(payload) && focusFirstCancelError())
  }

  function handleEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    editErrors.setErrors(validate(edit, details.reportedDate))
    if (focusFirstEditError()) return
    void send({
      action: "update",
      reportedDate: edit.reportedDate,
      problem: edit.problem,
      vendorId: edit.vendorId || null,
      repairCost: edit.repairCost || null,
      invoiceNo: edit.invoiceNo || null,
      remark: edit.remark || null,
    }, "updated", (payload) => editErrors.applyServer(payload) && focusFirstEditError())
  }

  return (
```

- `src/components/maintenance/repair-record-actions.tsx`, edit 8 of 14 (whole lines). Old:

```tsx
        <form
          className={accessibleDialogFormClasses}
          onSubmit={(event) => {
            event.preventDefault()
            void send({
              action: "complete",
              returnDate: complete.returnDate,
              outcome: complete.outcome,
              vendorId: complete.vendorId || null,
              repairCost: complete.repairCost || null,
              invoiceNo: complete.invoiceNo || null,
              remark: complete.remark || null,
            }, "completed")
          }}
        >
```

  New:

```tsx
        <form onSubmit={handleComplete} noValidate className={accessibleDialogFormClasses}>
```

- `src/components/maintenance/repair-record-actions.tsx`, edit 9 of 14 (whole lines). Old:

```tsx
            <Field label={t("returnDate")} required>
              <Input type="date" required value={complete.returnDate} onChange={(event) => setComplete((v) => ({ ...v, returnDate: event.target.value }))} />
            </Field>
            <fieldset className="min-w-0">
              <legend className={cn(fieldLabelClasses, "mb-1.5")}>{t("outcomeQuestion")}<FieldRequiredMark /></legend>
              <div className="grid gap-2">
                {(["usable", "beyond_repair"] as const).map((outcome) => (
                  <ChoiceCard key={outcome} type="radio" name="outcome" checked={complete.outcome === outcome} label={t(`outcome.${outcome}`)} onChange={() => setComplete((v) => ({ ...v, outcome }))} />
                ))}
              </div>
            </fieldset>
            <MaintenanceOptionSelect type="supplier" label={t("vendor")} value={complete.vendorId} initialOption={details.vendor ?? undefined} placeholder={t("vendorPlaceholder")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} loadingLabel={tCommon("loading")} onChange={(value) => setComplete((v) => ({ ...v, vendorId: value }))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("cost")}>
                <Input type="number" min="0" step="0.01" inputMode="decimal" value={complete.repairCost} onChange={(event) => setComplete((v) => ({ ...v, repairCost: event.target.value }))} />
              </Field>
              <Field label={t("invoiceNo")}>
                <Input maxLength={100} value={complete.invoiceNo} onChange={(event) => setComplete((v) => ({ ...v, invoiceNo: event.target.value }))} />
              </Field>
```

  New:

```tsx
            <Field
              label={t("returnDate")}
              id="repair-complete-return-date"
              required
              error={completeErrors.errors.returnDate === "endBeforeStart" ? t("returnDateBeforeReported") : completeErrors.message("returnDate")}
            >
              <Input type="date" required min={details.reportedDate} value={complete.returnDate} onChange={(event) => setCompleteField("returnDate", event.target.value)} />
            </Field>
            <FieldGroup legend={t("outcomeQuestion")} id="repair-complete-outcome" required error={completeErrors.message("outcome")}>
              <div className="grid gap-2">
                {(["usable", "beyond_repair"] as const).map((outcome) => (
                  <ChoiceCard key={outcome} type="radio" name="outcome" checked={complete.outcome === outcome} label={t(`outcome.${outcome}`)} onChange={() => setCompleteField("outcome", outcome)} />
                ))}
              </div>
            </FieldGroup>
            <MaintenanceOptionSelect
              id="repair-complete-vendor"
              type="supplier"
              label={t("vendor")}
              value={complete.vendorId}
              initialOption={details.vendor ?? undefined}
              placeholder={t("vendorPlaceholder")}
              searchPlaceholder={tCommon("searchSelectPlaceholder")}
              emptyLabel={tCommon("searchSelectNoResults")}
              loadingLabel={tCommon("loading")}
              error={completeErrors.message("vendorId")}
              onChange={(value) => setCompleteField("vendorId", value)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t("cost")}
                id="repair-complete-cost"
                error={completeErrors.errors.repairCost ? validationMessage(completeErrors.errors.repairCost, { min: 0 }) : undefined}
              >
                <Input type="number" min="0" step="0.01" inputMode="decimal" value={complete.repairCost} onChange={(event) => setCompleteField("repairCost", event.target.value)} />
              </Field>
              <Field label={t("invoiceNo")} id="repair-complete-invoice-no" error={completeErrors.message("invoiceNo")}>
                <Input maxLength={100} value={complete.invoiceNo} onChange={(event) => setCompleteField("invoiceNo", event.target.value)} />
              </Field>
```

- `src/components/maintenance/repair-record-actions.tsx`, edit 10 of 14 (whole lines). Old:

```tsx
            <Field label={t("remark")}>
              <Textarea rows={2} maxLength={4000} value={complete.remark} onChange={(event) => setComplete((v) => ({ ...v, remark: event.target.value }))} className="min-h-16" />
```

  New:

```tsx
            <Field label={t("remark")} id="repair-complete-remark" error={completeErrors.message("remark")}>
              <Textarea rows={2} maxLength={4000} value={complete.remark} onChange={(event) => setCompleteField("remark", event.target.value)} className="min-h-16" />
```

- `src/components/maintenance/repair-record-actions.tsx`, edit 11 of 14 (whole lines). Old:

```tsx
        <form
          className={accessibleDialogFormClasses}
          onSubmit={(event) => {
            event.preventDefault()
            void send({ action: "cancel", reason: reason.trim() || null }, "cancelled")
          }}
        >
```

  New:

```tsx
        <form onSubmit={handleCancel} noValidate className={accessibleDialogFormClasses}>
```

- `src/components/maintenance/repair-record-actions.tsx`, edit 12 of 14 (whole lines). Old:

```tsx
            <Field label={t("cancelReason")}>
              <Textarea rows={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
```

  New:

```tsx
            <Field label={t("cancelReason")} id="repair-cancel-reason" error={cancelErrors.message("reason")}>
              <Textarea
                rows={3}
                maxLength={1000}
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value)
                  cancelErrors.clear("reason")
                }}
              />
```

- `src/components/maintenance/repair-record-actions.tsx`, edit 13 of 14 (whole lines). Old:

```tsx
        <form
          className={accessibleDialogFormClasses}
          onSubmit={(event) => {
            event.preventDefault()
            void send({
              action: "update",
              reportedDate: edit.reportedDate,
              problem: edit.problem,
              vendorId: edit.vendorId || null,
              repairCost: edit.repairCost || null,
              invoiceNo: edit.invoiceNo || null,
              remark: edit.remark || null,
            }, "updated")
          }}
        >
```

  New:

```tsx
        <form onSubmit={handleEdit} noValidate className={accessibleDialogFormClasses}>
```

- `src/components/maintenance/repair-record-actions.tsx`, edit 14 of 14 (whole lines). Old:

```tsx
            <Field label={t("date")} required>
              <Input type="date" required value={edit.reportedDate} onChange={(event) => setEdit((v) => ({ ...v, reportedDate: event.target.value }))} />
            </Field>
            <Field label={t("problem")} required>
              <Textarea required rows={3} maxLength={4000} value={edit.problem} onChange={(event) => setEdit((v) => ({ ...v, problem: event.target.value }))} />
            </Field>
            <MaintenanceOptionSelect type="supplier" label={t("vendor")} value={edit.vendorId} initialOption={details.vendor ?? undefined} placeholder={t("vendorPlaceholder")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} loadingLabel={tCommon("loading")} onChange={(value) => setEdit((v) => ({ ...v, vendorId: value }))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("cost")}>
                <Input type="number" min="0" step="0.01" inputMode="decimal" value={edit.repairCost} onChange={(event) => setEdit((v) => ({ ...v, repairCost: event.target.value }))} />
              </Field>
              <Field label={t("invoiceNo")}>
                <Input maxLength={100} value={edit.invoiceNo} onChange={(event) => setEdit((v) => ({ ...v, invoiceNo: event.target.value }))} />
              </Field>
            </div>
            <Field label={t("remark")}>
              <Textarea rows={2} maxLength={4000} value={edit.remark} onChange={(event) => setEdit((v) => ({ ...v, remark: event.target.value }))} className="min-h-16" />
```

  New:

```tsx
            <Field label={t("date")} id="repair-edit-date" required error={editErrors.message("reportedDate")}>
              <Input type="date" required value={edit.reportedDate} onChange={(event) => setEditField("reportedDate", event.target.value)} />
            </Field>
            <Field label={t("problem")} id="repair-edit-problem" required error={editErrors.message("problem")}>
              <Textarea required rows={3} maxLength={4000} value={edit.problem} onChange={(event) => setEditField("problem", event.target.value)} />
            </Field>
            <MaintenanceOptionSelect
              id="repair-edit-vendor"
              type="supplier"
              label={t("vendor")}
              value={edit.vendorId}
              initialOption={details.vendor ?? undefined}
              placeholder={t("vendorPlaceholder")}
              searchPlaceholder={tCommon("searchSelectPlaceholder")}
              emptyLabel={tCommon("searchSelectNoResults")}
              loadingLabel={tCommon("loading")}
              error={editErrors.message("vendorId")}
              onChange={(value) => setEditField("vendorId", value)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t("cost")}
                id="repair-edit-cost"
                error={editErrors.errors.repairCost ? validationMessage(editErrors.errors.repairCost, { min: 0 }) : undefined}
              >
                <Input type="number" min="0" step="0.01" inputMode="decimal" value={edit.repairCost} onChange={(event) => setEditField("repairCost", event.target.value)} />
              </Field>
              <Field label={t("invoiceNo")} id="repair-edit-invoice-no" error={editErrors.message("invoiceNo")}>
                <Input maxLength={100} value={edit.invoiceNo} onChange={(event) => setEditField("invoiceNo", event.target.value)} />
              </Field>
            </div>
            <Field label={t("remark")} id="repair-edit-remark" error={editErrors.message("remark")}>
              <Textarea rows={2} maxLength={4000} value={edit.remark} onChange={(event) => setEditField("remark", event.target.value)} className="min-h-16" />
```

Messages: save `<temp>/m5-messages.json` with exactly the line below and run `node scripts/messages-edit.mjs <temp>/m5-messages.json` (prints `messages updated: 1 th, 1 en, 0 deleted`):

```json
{"set":{"th":{"repairRecord.returnDateBeforeReported":"วันที่ซ่อมเสร็จต้องไม่ก่อนวันที่แจ้งซ่อม"},"en":{"repairRecord.returnDateBeforeReported":"The return date cannot be before the date the repair was reported"}}}
```

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-m.test.ts`:

```ts

test("repair record actions: complete, cancel and edit show errors under the field, the return date is not before the reported date, and a refusal lands in its dialog (v-track2 M5)", () => {
  const source = read(`${C}maintenance/repair-record-actions.tsx`)
  const uploadToast = 'toast.warning(t("uploadFailed", { count: failed }))'
  const complete = {
    returnDate: "repair-complete-return-date",
    outcome: "repair-complete-outcome",
    vendorId: "repair-complete-vendor",
    repairCost: "repair-complete-cost",
    invoiceNo: "repair-complete-invoice-no",
    remark: "repair-complete-remark",
  }
  const edit = {
    reportedDate: "repair-edit-date",
    problem: "repair-edit-problem",
    vendorId: "repair-edit-vendor",
    repairCost: "repair-edit-cost",
    invoiceNo: "repair-edit-invoice-no",
    remark: "repair-edit-remark",
  }
  for (const [name, form] of [
    ["Complete", { ids: complete, messages: ["outcome", "vendorId", "invoiceNo", "remark"] }],
    ["Cancel", { ids: { reason: "repair-cancel-reason" } }],
    ["Edit", { ids: edit, messages: ["reportedDate", "problem", "vendorId", "invoiceNo", "remark"] }],
  ] as const) {
    const hook = `${name.toLowerCase()}Errors`
    assertMigratedForm(source, { ...form, handler: `handle${name}`, table: `${name.toUpperCase()}_FIELD_IDS`, hook, server: false, resultToast: uploadToast })
    // send() hands a refusal back to the dialog that sent it; one that names none of its fields keeps the toast.
    assert.ok(source.includes(`(payload) => ${hook}.applyServer(payload) && focusFirst${name}Error())`), `${name}: the refusal goes back to its dialog`)
    // A dialog opens again without the errors of its last try.
    assert.match(source, new RegExp(`function close\\(\\) \\{[\\s\\S]*?\\n\\s+${hook}\\.setErrors\\(\\{\\}\\)\\n[\\s\\S]*?\\n {2}\\}\\n`))
  }
  assert.match(source, /if \(!response\.ok\) \{\n\s+if \(showRefusal\(payload\)\) return\n\s+throw new Error\(getMaintenanceErrorMessage\(payload\?\.code, tMaintenance, tCommon\("error"\)\)\)/)
  assert.match(source, /^function validate\(values: Partial<Record<RepairActionField, string>>, reportedDate: string\) \{$/m)
  const rules = validateBody(source)
  for (const rule of [
    'if (values.returnDate !== undefined) check("returnDate", required(values.returnDate) ?? notBefore(values.returnDate, reportedDate))',
    'if (values.reportedDate !== undefined) check("reportedDate", required(values.reportedDate))',
    'if (values.problem !== undefined) check("problem", required(values.problem) ?? maxLength(values.problem, 4000))',
    'check("repairCost", range(values.repairCost, 0) ?? step(values.repairCost, 0.01))',
    'check("invoiceNo", maxLength(values.invoiceNo, 100))',
    'check("remark", maxLength(values.remark, 4000))',
    'check("reason", maxLength(values.reason, 1000))',
  ]) assert.ok(rules.includes(rule), rule)
  assert.match(source, /completeErrors\.setErrors\(validate\(complete, details\.reportedDate\)\)/)
  assert.match(source, /cancelErrors\.setErrors\(validate\(\{ reason \}, details\.reportedDate\)\)/)
  assert.match(source, /editErrors\.setErrors\(validate\(edit, details\.reportedDate\)\)/)
  // The return date (spec §7.4): the picker starts at the reported date, and the error names the reported date.
  assert.match(source, /<Input type="date" required min=\{details\.reportedDate\} value=\{complete\.returnDate\} /)
  assert.ok(source.includes('error={completeErrors.errors.returnDate === "endBeforeStart" ? t("returnDateBeforeReported") : completeErrors.message("returnDate")}'))
  for (const hook of ["completeErrors", "editErrors"]) {
    assert.ok(source.includes(`error={${hook}.errors.repairCost ? validationMessage(${hook}.errors.repairCost, { min: 0 }) : undefined}`), `${hook}: the cost says its floor`)
  }
  assert.ok(source.includes('<FieldGroup legend={t("outcomeQuestion")} id="repair-complete-outcome" required error={completeErrors.message("outcome")}>'))
  // A field's error clears when it changes.
  assert.match(source, /setComplete\(\(current\) => \(\{ \.\.\.current, \[field\]: value \}\)\)\n\s+completeErrors\.clear\(field\)/)
  assert.match(source, /setEdit\(\(current\) => \(\{ \.\.\.current, \[field\]: value \}\)\)\n\s+editErrors\.clear\(field\)/)
  assert.match(source, /setReason\(event\.target\.value\)\n\s+cancelErrors\.clear\("reason"\)/)
  for (const locale of ["th", "en"]) {
    const repairRecord = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).repairRecord as Record<string, string>
    assert.ok(repairRecord.returnDateBeforeReported?.trim(), `${locale}.repairRecord.returnDateBeforeReported`)
  }
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-m.test.ts`. Expected to fail: "repair record actions: complete, cancel and edit show errors under the field, the return date is not before the reported date, and a refusal lands in its dialog (v-track2 M5)" ("noValidate directly after onSubmit"). After Step 3 and before Step 4, `node --test tests/repair-record-detail-ui.test.ts tests/choice-controls-ui.test.ts` fails two tests: "the three repair dialogs keep their buttons in a fixed footer and keep focus while saving (2C batch 1a)" and "the finish-repair dialog picks the outcome with ChoiceCard radios (R3)"; Step 4 is their edit.
- [ ] **Step 3: Implement** per the exact edits and the messages change.
- [ ] **Step 4: Pin and guard edits** (exact old → new; each old string occurs once in its file):

- `tests/repair-record-detail-ui.test.ts`, edit 1 of 1 (whole lines). Old:

```ts
  assert.equal(source.match(/<form\n\s+className=\{accessibleDialogFormClasses\}/g)?.length, 3)
```

  New:

```ts
  // Each dialog's form checks itself (v-track plan 2 M5).
  assert.equal(source.match(/<form onSubmit=\{handle(?:Complete|Cancel|Edit)\} noValidate className=\{accessibleDialogFormClasses\}>/g)?.length, 3)
```

- `tests/choice-controls-ui.test.ts`, edit 1 of 1 (whole lines). Old:

```ts
  assert.match(source, /<fieldset className="min-w-0">\n\s+<legend className=\{cn\(fieldLabelClasses, "mb-1\.5"\)\}>\{t\("outcomeQuestion"\)\}<FieldRequiredMark \/><\/legend>/)
```

  New:

```ts
  // The outcome is a FieldGroup with the star and its error (v-track plan 2 M5).
  assert.match(source, /<FieldGroup legend=\{t\("outcomeQuestion"\)\} id="repair-complete-outcome" required error=\{completeErrors\.message\("outcome"\)\}>/)
```

- `tests/validation-guards.test.ts`, edit 1 of 2. Old:

```ts
]

// Required selects (SearchableSelect and its two wrappers) with no error=
```

  New:

```ts
  `${C}maintenance/repair-record-actions.tsx`,
]

// Required selects (SearchableSelect and its two wrappers) with no error=
```

- `tests/validation-guards.test.ts`, edit 2 of 2 (P-R4: a row of `NON_VALIDATION_TOASTS`, directly after its opening line). Old:

```ts
const NON_VALIDATION_TOASTS: Readonly<Record<string, { count: number; why: string; ruling: string }>> = {
```

  New:

```ts
const NON_VALIDATION_TOASTS: Readonly<Record<string, { count: number; why: string; ruling: string }>> = {
  [`${C}maintenance/repair-record-actions.tsx`]: { count: 1, why: "the dialog has closed on the saved change; files that did not upload can be attached on the record", ruling: "v-track plan 2 MT-R5" },
```

- [ ] **Step 5: Verify.** `node --test tests/v-track2-m.test.ts tests/repair-record-detail-ui.test.ts tests/choice-controls-ui.test.ts tests/file-evidence-ui.test.ts tests/button-size-switch.test.ts tests/maintenance-i18n.test.ts tests/repair-record-ui.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/visual-foundation-guards.test.ts tests/ui-overlay-guards.test.ts tests/accessible-dialog.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts tests/messages-edit.test.ts`; `npm test` (+1; 2286 tests, 2285 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint`. Leaf keys per locale +1 (4090 → 4091 on this plan's chain). eol: `repair-record-actions.tsx` `384 384`, `messages/*.json` CRLF (`4273 4273` on this plan's chain), `repair-record-detail-ui` `91 91`, `choice-controls-ui` `154 154`, `validation-guards` CRLF (`224 224` on this plan's chain), `v-track2-m` `0 294`.
- [ ] **Step 6: Commit.** `git add src/components/maintenance/repair-record-actions.tsx messages/th.json messages/en.json tests/repair-record-detail-ui.test.ts tests/choice-controls-ui.test.ts tests/validation-guards.test.ts tests/v-track2-m.test.ts`, then `git commit -m "feat(maintenance): the repair record dialogs show their errors under the field and the return date is not before the reported date (v-track plan 2 task 31, M5)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Rehearsal record (area M)

- Clone `<temp>/sim-M` of `<temp>/../v-sim` at `v2-base` (`e1caa29`), its own copy of `node_modules`, branch `m2-sim`. Base: `npm test` 2256 tests, 2255 pass, 0 fail, 1 skipped (23 s).
- Commits: M1 `bc3cffe9` · M2 `92255e3a` · M3 `adad5862` · M4 `73fe4a6a` · M5 `560d1a46`. Diffstat against the base: 16 files, +734 −118.
- Each Step 2 failed with the named test and assertion (M1 by reverting its three source files after the fact: the reporter body's deep-equal; M2–M5 written before their source change). The "before Step 4" lists failed exactly (3, 4 and 2 tests). Each task: full `npm test` 0 fail, 1 skipped at 2257 … 2261; `tsc` clean; lint 0 errors, 146 warnings.
- End state (area alone, with its own `RESULT_TOASTS`; on this plan's chain they are two `NON_VALIDATION_TOASTS` rows, P-R4): `V_FORMS` 18 files (plan 1's 15 + 3); `SELECT_STAR_ONLY` 11 selects in 8 files (14 in 10 − 3); `RESULT_TOASTS` 2 rows; 4093 leaf keys per locale; `<form … noValidate>` +5. The 28 related test files listed in the Verify steps: all pass at the end state.
- Text check: this section was read back by a parser (every "exact edit", Step 1 block, pin edit and the messages change, as printed here) and replayed from `e1caa29` on branch `m2-replay-md`, one commit per task: after each task the tree equals the rehearsal commit's tree (M1–M5, all five).
- Order check: the eight `tests/validation-guards.test.ts` edits of M3–M5 applied in order to a copy of the base file on which `V_FORMS` already held two other areas' rows: each old string occurred once.
- What the rehearsal corrected in the draft: `SELECT_STAR_ONLY`'s plan-form row `` [`${C}maintenance/maintenance-plan-form.tsx`]: 1, `` also occurs in `V_SCOPE`, so M3's edit takes the two adjacent maintenance rows as its anchor; `pm-plans-ui.test.ts`'s count of `required`-only lines is 6 after M3 (the asset select and the days `Field` add one each), not 4; `repair-record-detail-ui.test.ts` pins the dialogs' `<form` line (`:66`), so M5 edits it; the complete dialog's state stays `useState({` (`:21-25` of that test reads `useState\(\{\s*returnDate`), and the edit handler keeps `action: "update"` first in its body with no `outcome` in the next 400 characters (`:28-31`), both held.

### Calls made in area M (for the review)

- M1 is a server task inside a form area. Spec §6.2 names "PM vendor not found or inactive"; plan 1 Task 10 answered it on the create route only. The PM edit, the repair vendor (create, complete, edit) and the two reporter refusals are the same kind of refusal (U9: "other non-zod field refusals with `fieldErrors`"), and today all of them reach the person as the generic "เกิดข้อผิดพลาด", because the forms' fallback reads only a maintenance `code`. Without M1, M3–M5's `applyServer` would have nothing to show for them.
- `step()` is a shared helper added by this area (MT-R2), because spec §4.5 lists `step` among the constraints `validate()` restates and the maintenance forms are the first in the round to need it.
- The upload-result toasts take rows in area D's `NON_VALIDATION_TOASTS` (MT-R5, P-R4), the option plan 1 F-R9 left to the later plans; the area's draft had its own `RESULT_TOASTS`.

### Open issues (area M)

Area M's open issues 1–4 are open issues 2, 10, 11 and 14 at the end of the plan (P-R9).

### Behaviour changes a person would notice beyond the spec

- An inactive vendor (PM edit; repair create, complete, edit) or an inactive reporter shows its own sentence under that select, where today it was the generic "เกิดข้อผิดพลาด" toast (M1).
- "รายละเอียดเพิ่มเติม" opens by itself when a field inside it has an error (MT-R4).
- The return date's calendar starts at the reported date (`min`), so an earlier day cannot be picked (MT-R7).
- A dialog closed with errors opens again without them (MT-R6).

---

## Addendum: the user's answers of 2026-10-18 (Tasks 31a–31e)

The user answered this plan's open issues on 2026-10-18 with "ตามที่แนะนำ": every recommendation of "Open issues" (end of the plan). Five of the answers change code; each is one task here, after Task 31 and before Task 32, numbered 31a–31e so that no other task number moves. The other answers keep the defaults the tasks already write (R8 lists them). Rulings X-R1–X-R5 (R8, "Rulings of this plan").

- **Order and dependencies:** 31a → 31e, each needs the one before (each appends to `tests/v-track2-x.test.ts`, which 31a creates). 31a needs Task 10 (the checkin form's keys); 31c needs Tasks 1, 2, 21–24, 28, 30, 31 (it edits their `validate()` lines and their tests); 31d needs Task 2 and 31c (the batch form); 31e needs Task 19. 31b needs only plan 1's map.
- **Line numbers** are the chain's after Task 31 (`37968225`). Inside the addendum only 31c and 31d both edit `asset-batch-form.tsx` and `messages/*.json`: 31c changes two lines of the batch form in place (no line moves), and the messages only through the script, so every line number below holds when its task runs. Find each site by its quoted text.
- **Rehearsed (2026-10-18)** in `<temp>/../v-sim`, branch `v2-add` from `37968225`, one commit per task as an implementer follows this text: 31a `6ef98430` · 31b `0d440c83` · 31c `97ad82af` · 31d `3b5c278c` · 31e `fbda71b9`. The record is at the end of the addendum.

---

### Task 31a (O7): Checkin's refusals of the return condition and the return status name their field (`src/app/api/assets/[id]/checkin/route.ts`)

The user's answer to open issue 5; spec §6.2, U3, U9; plan 1 S-R7 and its S10 shape (checkout's `conditionBefore` refusal, `assets/[id]/checkout/route.ts:61-64` on the chain); O-R1, O-R8; X-R1.

**Files:**
- Modify: `src/app/api/assets/[id]/checkin/route.ts` (`i/lf w/crlf`)
- Test: create `tests/v-track2-x.test.ts` (new, LF): the addendum's test file, one test per task
- No change (checked): `c/asset-operations/checkin-form.tsx` (Task 10 holds both keys in `FIELD_IDS`, shows each under its select through `fieldErrors.message`, and hands a refusal back from its review: `reveal: leaveReview`); `src/lib/api-error-catalog.ts:160-161` and `messages/*.json` (`invalidReturnCondition` "สภาพตอนรับคืนไม่ถูกต้อง", `invalidReturnStatus` "สถานะตอนรับคืนไม่ถูกต้อง" are catalog keys with their sentences under `apiErrors`).

**Interfaces:**
- Consumes: Task 10's checkin form; plan 1's `resolveValidationMessage` (`src/lib/field-error-client.ts`).
- Produces: the two 400 bodies `{ code, error: "Invalid return condition for check-in", fieldErrors: { conditionAfter: "invalidReturnCondition" } }` and `{ error: "Invalid return status for check-in", fieldErrors: { nextStatusId: "invalidReturnStatus" } }` (status, message and `code` unchanged); `tests/v-track2-x.test.ts` with its header (`C`, `read`, `messages`, `lookup`, `say`, the resolve-hook stand-ins of `tests/v-track-s.test.ts` under `globalThis.__vTrack2X`, `load`, `stubDb`), which Tasks 31b–31e append to.

**Changes at `37968225`:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `route.ts:57` | `      return NextResponse.json({ code: conditionError, error: "Invalid return condition for check-in" }, { status: 400 })` | four lines, S10's shape: `      return NextResponse.json(` / `        { code: conditionError, error: "Invalid return condition for check-in", fieldErrors: { conditionAfter: "invalidReturnCondition" } },` / `        { status: 400 },` / `      )` | S-R7, X-R1 |
| `route.ts:60` | `      return NextResponse.json({ error: "Invalid return status for check-in" }, { status: 400 })` | `      return NextResponse.json(` / `        { error: "Invalid return status for check-in", fieldErrors: { nextStatusId: "invalidReturnStatus" } },` / `        { status: 400 },` / `      )` | S-R7, X-R1 |

The exact edits (whole lines; each old text occurs once):

- `src/app/api/assets/[id]/checkin/route.ts`, edit 1 of 2. Old:

```ts
      return NextResponse.json({ code: conditionError, error: "Invalid return condition for check-in" }, { status: 400 })
```

  New:

```ts
      return NextResponse.json(
        { code: conditionError, error: "Invalid return condition for check-in", fieldErrors: { conditionAfter: "invalidReturnCondition" } },
        { status: 400 },
      )
```

- `src/app/api/assets/[id]/checkin/route.ts`, edit 2 of 2. Old:

```ts
      return NextResponse.json({ error: "Invalid return status for check-in" }, { status: 400 })
```

  New:

```ts
      return NextResponse.json(
        { error: "Invalid return status for check-in", fieldErrors: { nextStatusId: "invalidReturnStatus" } },
        { status: 400 },
      )
```

- [ ] **Step 1: The failing test.** Create `tests/v-track2-x.test.ts` with a file tool (LF; the block has regex backslashes), exactly:

```ts
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import test from "node:test"
import { pathToFileURL } from "node:url"
import { resolveValidationMessage, type MessageLookup } from "../src/lib/field-error-client.ts"

// V track plan 2, the addendum (the user's answers of 2026-10-18 to the plan's open issues, Tasks 31a–31e). One test per
// task. Sources are read with LF line endings, so the regexes may contain \n.
const C = "src/components/"
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
const lookup = (table: Record<string, string>): MessageLookup => ({
  has: (key) => typeof table[key] === "string",
  get: (key, params) => table[key].replace(/\{(\w+)\}/g, (_, name: string) => String(params?.[name])),
})
// The form's message for a code, as useValidationMessage resolves it (common.validation, then the api-error catalog).
const say = (locale: "th" | "en", code: string) => {
  const table = messages(locale)
  return resolveValidationMessage(code, undefined, { validation: lookup(table.common.validation), apiErrors: lookup(table.apiErrors) })
}

// Route modules import next/server and "@/…", which node --test cannot load, so a resolve hook serves stand-ins (as in
// tests/v-track-s.test.ts). The prisma stand-in calls globalThis.__vTrack2X.prisma[model][method]; a call with no handler
// throws, so a test names every query its route makes.
const stubs = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() { return { id: "actor-1", roles: ["system_admin"], permissions: [], employeeId: null } }
    export function hasRole() { return true }
    export function hasPermission() { return true }
    export function requirePermission() {}
  `],
  ["@/lib/audit-log", `export async function logAudit() {}`],
  ["@/lib/db", `
    const call = (model, method) => (...args) => {
      const handler = globalThis.__vTrack2X?.prisma?.[model]?.[method]
      if (!handler) throw new Error("no stand-in for prisma." + model + "." + method)
      return handler(...args)
    }
    export const prisma = new Proxy({}, {
      get: (_, model) => model === "$transaction"
        ? async (work) => (typeof work === "function" ? work(prisma) : Promise.all(work))
        : new Proxy({}, { get: (_, method) => call(model, method) }),
    })
  `],
])
;(nodeModule as unknown as { registerHooks(hooks: { resolve(specifier: string, context: unknown, next: (specifier: string, context: unknown) => unknown): unknown }): void }).registerHooks({
  resolve(specifier, context, next) {
    const stub = stubs.get(specifier)
    if (stub !== undefined) return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(stub)}`, shortCircuit: true }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return next(specifier, context)
  },
})
const load = <T>(path: string) => import(pathToFileURL(path).href) as Promise<T>
const stubDb = (prisma: Record<string, Record<string, (...args: never[]) => unknown>>) => Object.assign(globalThis, { __vTrack2X: { prisma } })

test("checkin's refusals of the return condition and the return status name their field, which the form already shows (v-track plan 2 task 31a, O7)", async () => {
  type Handler = (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>
  const { POST } = await load<{ POST: Handler }>("src/app/api/assets/[id]/checkin/route.ts")
  const params = { params: Promise.resolve({ id: "asset-1" }) }
  const checkin = () => new Request("http://localhost/api/assets/asset-1/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      checkoutId: "checkout-1", returnDate: "2026-10-18", returnBy: "Somchai", receiveBy: "Somsri", conditionAfter: "condition-1",
      nextStatusId: "status-1", nextLocationId: "location-1",
    }),
  })
  const refusal = async (response: Response) => [response.status, await response.json()]
  const prisma = (condition: unknown, returnStatus: unknown) => ({
    asset: { findFirst: () => ({ id: "asset-1" }) },
    assetCheckout: { findFirst: () => ({ id: "checkout-1" }) },
    assetCondition: { findUnique: () => condition },
    assetStatus: { findFirst: () => returnStatus },
  })

  // A condition that is gone, inactive or not offered for a return: the condition select, plan 1 S10's shape (S-R7).
  stubDb(prisma(null, null))
  assert.deepEqual(await refusal(await POST(checkin(), params)), [400, {
    code: "ASSET_STATE_MASTER_NOT_FOUND", error: "Invalid return condition for check-in", fieldErrors: { conditionAfter: "invalidReturnCondition" },
  }])
  stubDb(prisma({ name: "Excellent", isActive: true }, null))
  assert.deepEqual(await refusal(await POST(checkin(), params)), [400, {
    code: "ASSET_CONDITION_NOT_SELECTABLE", error: "Invalid return condition for check-in", fieldErrors: { conditionAfter: "invalidReturnCondition" },
  }])
  // A status that is not a return status: the status select. Status codes and messages are unchanged.
  stubDb(prisma({ name: "Good", isActive: true }, null))
  assert.deepEqual(await refusal(await POST(checkin(), params)), [400, {
    error: "Invalid return status for check-in", fieldErrors: { nextStatusId: "invalidReturnStatus" },
  }])

  // Both codes are api-error catalog keys, so the field reads the sentence the toast showed, not the generic one.
  for (const locale of ["th", "en"] as const) {
    const table = messages(locale)
    assert.equal(say(locale, "invalidReturnCondition"), table.apiErrors.invalidReturnCondition, locale)
    assert.equal(say(locale, "invalidReturnStatus"), table.apiErrors.invalidReturnStatus, locale)
    assert.notEqual(say(locale, "invalidReturnStatus"), table.common.validation.invalid, locale)
  }
  assert.equal(say("th", "invalidReturnCondition"), "สภาพตอนรับคืนไม่ถูกต้อง")

  // The checkin form (Task 10, O3) already holds both keys, shows each under its select and hands a refusal back from
  // its review dialog (O-R1): no form change.
  const form = read(`${C}asset-operations/checkin-form.tsx`)
  assert.match(form, /\n  conditionAfter: "checkin-condition-after",\n  nextStatusId: "checkin-next-status",\n/)
  assert.ok(form.includes('error={fieldErrors.message("conditionAfter")}'))
  assert.ok(form.includes('error={fieldErrors.message("nextStatusId")}'))
  assert.ok(form.includes("const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key], reveal: leaveReview })"))
  assert.ok(form.includes("if (fieldErrors.applyServer(payload) && focusFirstError()) return"))
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-x.test.ts`. Expected: 1 test, 1 fail: "checkin's refusals of the return condition and the return status name their field, which the form already shows (v-track plan 2 task 31a, O7)" (`Expected values to be strictly deep-equal`: the 400 body has no `fieldErrors`).
- [ ] **Step 3: Implement** per the exact edits.
- [ ] **Step 4: Pin and guard edits:** none. The four tests that read or load the route (`asset-component-sync-routes`, `asset-handover-checkin`, `asset-transaction-snapshot-routes`, `checkin-maintenance-ticket-route`) do not read these two lines; plan 1's `tests/v-track-s.test.ts` does not load the checkin route.
- [ ] **Step 5: Verify.** `node --test tests/v-track2-x.test.ts tests/asset-component-sync-routes.test.ts tests/asset-handover-checkin.test.ts tests/asset-transaction-snapshot-routes.test.ts tests/checkin-maintenance-ticket-route.test.ts tests/v-track-s.test.ts tests/v-track2-o.test.ts` (38 tests, 0 fail); `npm test` (+1; 2287 tests, 2286 pass, 0 fail, 1 skipped on this plan's chain, P-R5); `npx tsc --noEmit`; `npm run lint` (0 errors, 146 warnings, all under `.agents/`). eol: the route `385 385`, `tests/v-track2-x.test.ts` `0 120`. `git diff --numstat`: `8 2` for the route.
- [ ] **Step 6: Commit.** `git add "src/app/api/assets/[id]/checkin/route.ts" tests/v-track2-x.test.ts`, then `git commit -m "fix(api): checkin's refusals of the return condition and the return status name their field (v-track plan 2 task 31a, O7)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 31b: zod's whole-number refusal of a fraction reads as a number error, not a missing value (`src/lib/field-errors.ts`)

The user's answer to open issue 12 (its recommendation: "a one-line fix in `src/lib/field-errors.ts` … as a small task here"); area U's assembly note 1; plan 1 S-R2 (the map), spec §6.1; X-R2.

**What zod 4.4.1 emits** (probed on the chain, 2026-10-18): `z.number().int()` on `1.5` and `z.coerce.number().int()` on `"2025.5"` give `{ expected: "int", format: "safeint", code: "invalid_type", path, message: "Invalid input: expected int, received number" }`, with no `received`; a missing value gives `expected: "number"` (so it stays `required`), also for `z.int()`; text that is not a number through `coerce` gives `expected: "number", received: "NaN"` (already `invalidNumber`). The test pins the first shape.

**Files:** Modify `src/lib/field-errors.ts` (`i/lf w/crlf`) · Test `tests/v-track2-x.test.ts` (LF, append).

**Interfaces:**
- Consumes: plan 1's `issueToFieldErrorCode` / `issuesToFieldErrors` (FIXED 1).
- Produces: `invalid_type` with `expected: "int"` → `"invalidNumber"` in every route's 400 that goes through `validationFailedBody` ("กรุณากรอกเป็นตัวเลข" under the field instead of "กรุณาระบุข้อมูลนี้"). No form changes: plan 2's whole-number fields already check on the client (U-R3's `wholeNumber`, A-R4's seats `pattern`, MT-R2's `step(v, 1)`), so the change shows only when such a refusal comes from the server.

**Changes at `37968225`:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `field-errors.ts:56-57` | `      if (issue.expected === "number" && issue.received !== undefined) return "invalidNumber"` / `      return "required"` | the first line; then `      // .int() refusing a fraction says expected "int" (a missing value says "number"): a number error, not a missing one.` / `      if (issue.expected === "int") return "invalidNumber"`; then `      return "required"` | S-R2, X-R2 |

The exact edit:

- `src/lib/field-errors.ts`, edit 1 of 1. Old:

```ts
      if (issue.expected === "number" && issue.received !== undefined) return "invalidNumber"
      return "required"
```

  New:

```ts
      if (issue.expected === "number" && issue.received !== undefined) return "invalidNumber"
      // .int() refusing a fraction says expected "int" (a missing value says "number"): a number error, not a missing one.
      if (issue.expected === "int") return "invalidNumber"
      return "required"
```

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-x.test.ts` (with a file tool):

```ts

test("zod's .int() refusing a fraction reads as a number error, not as a missing value (v-track plan 2 task 31b)", async () => {
  const { z } = await import("zod")
  const { issueToFieldErrorCode, issuesToFieldErrors } = await import("../src/lib/field-errors.ts")
  // What zod 4.4.1 reports for a fraction in .int(): invalid_type with expected "int" and no received. A missing value
  // reports expected "number", and text that is not a number received "NaN".
  const schema = z.object({
    auditYear: z.coerce.number().int().min(2000).max(2100),
    licenseTotalSeats: z.number().int().min(0).optional(),
    intervalDays: z.coerce.number().int().min(1),
    sampleRate: z.number().int(),
  })
  const issues = schema.safeParse({ auditYear: "2025.5", licenseTotalSeats: 1.5, intervalDays: "abc" }).error!.issues
  assert.deepEqual(issues.find((issue) => issue.path[0] === "auditYear"), {
    expected: "int", format: "safeint", code: "invalid_type", path: ["auditYear"], message: "Invalid input: expected int, received number",
  })
  assert.deepEqual(issuesToFieldErrors(issues), { auditYear: "invalidNumber", licenseTotalSeats: "invalidNumber", intervalDays: "invalidNumber", sampleRate: "required" })
  assert.equal(issueToFieldErrorCode({ code: "invalid_type", expected: "int", path: ["sampleRate"], message: "Invalid input: expected int, received number" }), "invalidNumber")
  // The field reads the shared number sentence, no longer "กรุณาระบุข้อมูลนี้".
  assert.equal(say("th", "invalidNumber"), "กรุณากรอกเป็นตัวเลข")
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-x.test.ts`. Expected: 2 tests, 1 fail: "zod's .int() refusing a fraction reads as a number error, not as a missing value (v-track plan 2 task 31b)" (`Expected values to be strictly deep-equal`: `auditYear: 'required'` and `licenseTotalSeats: 'required'` where `'invalidNumber'` is expected). The assertion on the issue's shape before it passes: that is zod's own output.
- [ ] **Step 3: Implement** per the exact edit.
- [ ] **Step 4: Pin and guard edits:** none (plan 1's mapping test in `tests/v-track-s.test.ts` has no fraction in an `.int()` field; `qty: "abc"` stays `invalidNumber` through `received`).
- [ ] **Step 5: Verify.** `node --test tests/v-track2-x.test.ts tests/v-track-s.test.ts tests/v-track-f.test.ts tests/v-track2-u.test.ts` (26 tests, 0 fail); `npm test` (+1; 2288 tests, 2287 pass, 0 fail, 1 skipped); `npx tsc --noEmit`; `npm run lint` (0 errors, 146 warnings). eol: `src/lib/field-errors.ts` `120 120`, `tests/v-track2-x.test.ts` `0 141`. `git diff --numstat`: `2 0`, `21 0`.
- [ ] **Step 6: Commit.** `git add src/lib/field-errors.ts tests/v-track2-x.test.ts`, then `git commit -m "fix(forms): zod's whole-number refusal of a fraction reads as a number error, not a missing value (v-track plan 2 task 31b)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 31c: One money rule: every money field refuses more than 2 decimal places with its own sentence (`src/lib/validation-rules.ts`, eight forms, messages)

The user's answers to open issues 3 and 14 (one rule for money; a clearer sentence); spec §4.5 (`validate()` restates `step`), §7.1, §7.2, §6.3 (no server rule); X-R3, which replaces the money parts of A-R4, D-R11, MT-R2 and P-R8.

**Files:**
- Modify: `src/lib/validation-rules.ts`; `c/assets/asset-form.tsx`, `c/assets/asset-batch-form.tsx`; `c/disposal/disposal-request-form.tsx`, `disposal-batch-form.tsx`, `disposal-decision-button.tsx`, `disposal-execution-button.tsx`; `c/maintenance/repair-record-form.tsx`, `repair-record-actions.tsx` (all `i/lf w/crlf`); `messages/th.json`, `messages/en.json` (`i/lf w/crlf`, through the script)
- Pins: `tests/v-track-f.test.ts` (`i/lf w/crlf`); `tests/v-track2-a.test.ts`, `tests/v-track2-d.test.ts`, `tests/v-track2-m.test.ts` (LF)
- Test: `tests/v-track2-x.test.ts` (LF, append)
- No change: the server (`optionalMoney` keeps taking any precision; the `Decimal(18, 2)` columns round); the money inputs keep `min="0" step="0.01"` (FMG's `CONSTRAINT_FLOORS` and `tests/asset-forms-ui.test.ts:33,34,74` hold); `step()` stays, for whole numbers (the PM days, `maintenance-plan-form.tsx:48`); how each form shows a money error (`errorText(key)` in the asset forms, `validationMessage(code, { min: 0 })` in the disposal and repair forms both resolve `common.validation.tooManyDecimals` first, F-R3).

**Interfaces:**
- Consumes: `range` (FIXED 4), the forms' message readers above.
- Produces: FIXED 12, `decimals(value, places)` with the code `"tooManyDecimals"` (`RuleCode` gains it; it is not a `FieldErrorCode`, because the server never sends it); the message `common.validation.tooManyDecimals` (th "กรอกทศนิยมได้ไม่เกิน 2 ตำแหน่ง", en "Use no more than 2 decimal places").

**Changes at `37968225`:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `validation-rules.ts:9` | `export type RuleCode = FieldErrorCode \| "endBeforeStart"` | a comment line, then `export type RuleCode = FieldErrorCode \| "endBeforeStart" \| "tooManyDecimals"` | X-R3 |
| after `step()` `:48-56` | — | a blank line, a two-line comment and `export function decimals(…)` (exact edit 2) | FIXED 12, X-R3 |
| the `@/lib/validation-rules` import of each form (`asset-form.tsx:36`, `asset-batch-form.tsx:39`, `disposal-request-form.tsx:28`, `disposal-batch-form.tsx:29`, `disposal-decision-button.tsx:29`, `disposal-execution-button.tsx:33`, `repair-record-form.tsx:27`, `repair-record-actions.tsx:21`) | e.g. `import { maxLength, range, required } from "@/lib/validation-rules"` | `decimals` added in alphabetical order; the two repair files drop `step` (no money step left in them) | X-R3 |
| `asset-form.tsx:304`, `:310` | `  check("purchasePrice", range(values.purchasePrice, 0))`; `  check("purchaseDocumentAmount", range(purchaseDocument.totalAmount, 0))` | each `range(v, 0) ?? decimals(v, 2)` | X-R3 |
| `asset-batch-form.tsx:199` | `  check("common.purchasePrice", range(common.purchasePrice, 0))` | `range(…, 0) ?? decimals(…, 2)` | X-R3 |
| `disposal-request-form.tsx:79-80`, `disposal-batch-form.tsx:75-76`, `disposal-decision-button.tsx:77-78` | `  check("saleValue", range(values.saleValue, 0))` / `  check("salvageValue", range(values.salvageValue, 0))` | each `range(v, 0) ?? decimals(v, 2)` | X-R3 |
| `disposal-execution-button.tsx:96-97` | `  check("actualSaleValue", range(values.actualSaleValue, 0))` / `  check("actualSalvageValue", range(values.actualSalvageValue, 0))` | each `range(v, 0) ?? decimals(v, 2)` | X-R3 |
| `repair-record-form.tsx:81`, `repair-record-actions.tsx:69` | `  check("repairCost", range(values.repairCost, 0) ?? step(values.repairCost, 0.01))` | `  check("repairCost", range(values.repairCost, 0) ?? decimals(values.repairCost, 2))` | X-R3 |
| `messages/*.json` | — | `common.validation.tooManyDecimals` (the change file below) | X-R3 |

The exact edits (each old text occurs once in its file; a two-line old text keeps both lines):

- `src/lib/validation-rules.ts`, edit 1 of 2. Old:

```ts
export type RuleCode = FieldErrorCode | "endBeforeStart"
```

  New:

```ts
// "tooManyDecimals" is the money rule's own code (common.validation.tooManyDecimals, v-track plan 2 task 31c).
export type RuleCode = FieldErrorCode | "endBeforeStart" | "tooManyDecimals"
```

- `src/lib/validation-rules.ts`, edit 2 of 2. Old:

```ts
  const steps = number / size
  return Math.abs(steps - Math.round(steps)) < 1e-6 ? null : "invalidNumber"
}
```

  New:

```ts
  const steps = number / size
  return Math.abs(steps - Math.round(steps)) < 1e-6 ? null : "invalidNumber"
}

// A money field's step (step="0.01"): at most `places` digits after the point, with its own sentence. The typed digits
// count, trailing zeros left out (12.50 passes), so a large amount keeps its fraction; 1e-3 is counted as a number.
export function decimals(value: number | string | null | undefined, places: number): RuleCode | null {
  if (isEmpty(value)) return null
  const text = typeof value === "number" ? String(value) : (value as string).trim()
  const number = Number(text)
  if (!Number.isFinite(number)) return "invalidNumber"
  const typed = /^[+-]?\d*(?:\.(\d*))?$/.exec(text)
  if (typed) return (typed[1] ?? "").replace(/0+$/, "").length > places ? "tooManyDecimals" : null
  const scaled = number * 10 ** places
  return Math.abs(scaled - Math.round(scaled)) < 1e-6 ? null : "tooManyDecimals"
}
```

- `src/components/assets/asset-form.tsx`, edit 1 of 3. Old:

```ts
import { atLeastOne, maxLength, notBefore, pattern, range, required } from "@/lib/validation-rules"
```

  New:

```ts
import { atLeastOne, decimals, maxLength, notBefore, pattern, range, required } from "@/lib/validation-rules"
```

- `src/components/assets/asset-form.tsx`, edit 2 of 3. Old:

```ts
  check("purchasePrice", range(values.purchasePrice, 0))
```

  New:

```ts
  check("purchasePrice", range(values.purchasePrice, 0) ?? decimals(values.purchasePrice, 2))
```

- `src/components/assets/asset-form.tsx`, edit 3 of 3. Old:

```ts
  check("purchaseDocumentAmount", range(purchaseDocument.totalAmount, 0))
```

  New:

```ts
  check("purchaseDocumentAmount", range(purchaseDocument.totalAmount, 0) ?? decimals(purchaseDocument.totalAmount, 2))
```

- `src/components/assets/asset-batch-form.tsx`, edit 1 of 2. Old:

```ts
import { atLeastOne, maxLength, notBefore, range, required } from "@/lib/validation-rules"
```

  New:

```ts
import { atLeastOne, decimals, maxLength, notBefore, range, required } from "@/lib/validation-rules"
```

- `src/components/assets/asset-batch-form.tsx`, edit 2 of 2. Old:

```ts
  check("common.purchasePrice", range(common.purchasePrice, 0))
```

  New:

```ts
  check("common.purchasePrice", range(common.purchasePrice, 0) ?? decimals(common.purchasePrice, 2))
```

- `src/components/disposal/disposal-request-form.tsx`, edit 1 of 2. Old:

```ts
import { maxLength, range, required } from "@/lib/validation-rules"
```

  New:

```ts
import { decimals, maxLength, range, required } from "@/lib/validation-rules"
```

- `src/components/disposal/disposal-request-form.tsx`, edit 2 of 2. Old:

```ts
  check("saleValue", range(values.saleValue, 0))
  check("salvageValue", range(values.salvageValue, 0))
```

  New:

```ts
  check("saleValue", range(values.saleValue, 0) ?? decimals(values.saleValue, 2))
  check("salvageValue", range(values.salvageValue, 0) ?? decimals(values.salvageValue, 2))
```

- `src/components/disposal/disposal-batch-form.tsx`, edit 1 of 2. Old:

```ts
import { maxLength, range, required } from "@/lib/validation-rules"
```

  New:

```ts
import { decimals, maxLength, range, required } from "@/lib/validation-rules"
```

- `src/components/disposal/disposal-batch-form.tsx`, edit 2 of 2. Old:

```ts
  check("saleValue", range(values.saleValue, 0))
  check("salvageValue", range(values.salvageValue, 0))
```

  New:

```ts
  check("saleValue", range(values.saleValue, 0) ?? decimals(values.saleValue, 2))
  check("salvageValue", range(values.salvageValue, 0) ?? decimals(values.salvageValue, 2))
```

- `src/components/disposal/disposal-decision-button.tsx`, edit 1 of 2. Old:

```ts
import { maxLength, range, required } from "@/lib/validation-rules"
```

  New:

```ts
import { decimals, maxLength, range, required } from "@/lib/validation-rules"
```

- `src/components/disposal/disposal-decision-button.tsx`, edit 2 of 2. Old:

```ts
  check("saleValue", range(values.saleValue, 0))
  check("salvageValue", range(values.salvageValue, 0))
```

  New:

```ts
  check("saleValue", range(values.saleValue, 0) ?? decimals(values.saleValue, 2))
  check("salvageValue", range(values.salvageValue, 0) ?? decimals(values.salvageValue, 2))
```

- `src/components/disposal/disposal-execution-button.tsx`, edit 1 of 2. Old:

```ts
import { maxLength, minLength, range, required } from "@/lib/validation-rules"
```

  New:

```ts
import { decimals, maxLength, minLength, range, required } from "@/lib/validation-rules"
```

- `src/components/disposal/disposal-execution-button.tsx`, edit 2 of 2. Old:

```ts
  check("actualSaleValue", range(values.actualSaleValue, 0))
  check("actualSalvageValue", range(values.actualSalvageValue, 0))
```

  New:

```ts
  check("actualSaleValue", range(values.actualSaleValue, 0) ?? decimals(values.actualSaleValue, 2))
  check("actualSalvageValue", range(values.actualSalvageValue, 0) ?? decimals(values.actualSalvageValue, 2))
```

- `src/components/maintenance/repair-record-form.tsx`, edit 1 of 2. Old:

```ts
import { maxLength, range, required, step } from "@/lib/validation-rules"
```

  New:

```ts
import { decimals, maxLength, range, required } from "@/lib/validation-rules"
```

- `src/components/maintenance/repair-record-form.tsx`, edit 2 of 2. Old:

```ts
  check("repairCost", range(values.repairCost, 0) ?? step(values.repairCost, 0.01))
```

  New:

```ts
  check("repairCost", range(values.repairCost, 0) ?? decimals(values.repairCost, 2))
```

- `src/components/maintenance/repair-record-actions.tsx`, edit 1 of 2. Old:

```ts
import { maxLength, notBefore, range, required, step } from "@/lib/validation-rules"
```

  New:

```ts
import { decimals, maxLength, notBefore, range, required } from "@/lib/validation-rules"
```

- `src/components/maintenance/repair-record-actions.tsx`, edit 2 of 2. Old:

```ts
  check("repairCost", range(values.repairCost, 0) ?? step(values.repairCost, 0.01))
```

  New:

```ts
  check("repairCost", range(values.repairCost, 0) ?? decimals(values.repairCost, 2))
```

The messages: save this change file as `<temp>/add-31c-messages.json` and run `node scripts/messages-edit.mjs <temp>/add-31c-messages.json` (4091 → 4092 leaf keys per locale; the key goes last in `common.validation`):

```json
{"set":{"th":{"common.validation.tooManyDecimals":"กรอกทศนิยมได้ไม่เกิน 2 ตำแหน่ง"},"en":{"common.validation.tooManyDecimals":"Use no more than 2 decimal places"}}}
```

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-x.test.ts` (with a file tool):

```ts

test("one money rule: every money field of plan 2's forms refuses more than 2 decimal places with its own sentence (v-track plan 2 task 31c)", async () => {
  const { decimals } = await import("../src/lib/validation-rules.ts")
  const { readSourceFiles } = await import("./helpers/source-files.ts")
  // The typed digits after the point count, trailing zeros left out; exponent notation is counted from the number.
  for (const value of ["12.34", "0.29", "12.5", "12.50", "12.500", "1255", " 7.1 ", "-0.01", "1e2"]) assert.equal(decimals(value, 2), null, value)
  for (const value of ["12.345", "0.001", "1e-3", 12.345]) assert.equal(decimals(value, 2), "tooManyDecimals", String(value))
  assert.equal(decimals("12345678901234.567", 2), "tooManyDecimals", "a large amount keeps its fraction")
  assert.equal(decimals("abc", 2), "invalidNumber")
  for (const empty of ["", "  ", null, undefined]) assert.equal(decimals(empty, 2), null, "an empty value is left to required")
  assert.match(read("src/lib/validation-rules.ts"), /^export function decimals\(value: number \| string \| null \| undefined, places: number\): RuleCode \| null \{$/m)
  assert.match(read("src/lib/validation-rules.ts"), /^export type RuleCode = FieldErrorCode \| "endBeforeStart" \| "tooManyDecimals"$/m)
  // Its own sentence, clearer than invalidNumber's "กรุณากรอกเป็นตัวเลข" (open issue 14).
  assert.equal(messages("th").common.validation.tooManyDecimals, "กรอกทศนิยมได้ไม่เกิน 2 ตำแหน่ง")
  assert.equal(messages("en").common.validation.tooManyDecimals, "Use no more than 2 decimal places")
  for (const locale of ["th", "en"] as const) assert.equal(say(locale, "tooManyDecimals"), messages(locale).common.validation.tooManyDecimals, locale)

  // Each money control keeps step="0.01" and its validate() restates it after min: range(v, 0) ?? decimals(v, 2).
  const money: Record<string, readonly string[]> = {
    [`${C}assets/asset-form.tsx`]: ["values.purchasePrice", "purchaseDocument.totalAmount"],
    [`${C}assets/asset-batch-form.tsx`]: ["common.purchasePrice"],
    [`${C}disposal/disposal-request-form.tsx`]: ["values.saleValue", "values.salvageValue"],
    [`${C}disposal/disposal-batch-form.tsx`]: ["values.saleValue", "values.salvageValue"],
    [`${C}disposal/disposal-decision-button.tsx`]: ["values.saleValue", "values.salvageValue"],
    [`${C}disposal/disposal-execution-button.tsx`]: ["values.actualSaleValue", "values.actualSalvageValue"],
    [`${C}maintenance/repair-record-form.tsx`]: ["values.repairCost"],
    [`${C}maintenance/repair-record-actions.tsx`]: ["values.repairCost"],
  }
  const withMoney = readSourceFiles("src/components").filter((file) => file.source.includes('step="0.01"')).map((file) => file.path)
  assert.deepEqual(withMoney.sort(), Object.keys(money).sort(), "every money control of the forms is in the list")
  for (const [path, values] of Object.entries(money)) {
    const source = read(path)
    for (const value of values) assert.ok(source.includes(`range(${value}, 0) ?? decimals(${value}, 2))`), `${path}: ${value}`)
    assert.doesNotMatch(source, /step\([^)]*, 0\.01\)/, `${path}: no money step() left`)
    assert.match(source, /^import \{[^}]*\bdecimals\b[^}]*\} from "@\/lib\/validation-rules"$/m, path)
  }
  // Whole numbers keep step() and invalidNumber: the PM days.
  assert.ok(read(`${C}maintenance/maintenance-plan-form.tsx`).includes("range(values.intervalDays, 1, 3650) ?? step(values.intervalDays, 1)"))
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-x.test.ts`. Expected: 3 tests, 1 fail: "one money rule: every money field of plan 2's forms refuses more than 2 decimal places with its own sentence (v-track plan 2 task 31c)" (`TypeError: decimals is not a function`). After Step 3 and before Step 4, `npm test` fails exactly 9 tests, each on its old money line or the old message table: "every code has a Thai and an English message, with its limits when the form gives them (V spec §6.1, §7.1)", "asset form: validate() restates every rule the toasts said, the save gates name their reason, and the warranty pair holds (v-track A1)", "asset batch form: shared fields and rows show their errors, duplicates stay live under the rows, and a refusal leaves the review (v-track A2)", "disposal request: the asset, the requester and the reason are checked on save, and errors show under the field (v-track D2)", "disposal batch: the edit step is a form whose requester and reason are errors on review, and the asset count says why review waits (v-track D3)", "disposal decision: a rejection's reason is an error on save through the server's own rule, and a refusal lands under its field in the open dialog (v-track D4)", "disposal execution: the executor, the type's own rules and the historical exception are errors on save, and missing evidence says why save waits (v-track D5)", "repair record: errors under the field, the asset and reporter selects checked, the two questions as groups, and more details opened for an error inside (v-track2 M4)", "repair record actions: complete, cancel and edit show errors under the field, the return date is not before the reported date, and a refusal lands in its dialog (v-track2 M5)"; Step 4 is their edit.
- [ ] **Step 3: Implement** per the exact edits and the change file.
- [ ] **Step 4: Pin edits** (exact; the money lines of `tests/v-track2-d.test.ts` and `tests/v-track2-m.test.ts` repeat across their tests, so each old text takes a neighbouring line as its anchor):

- `tests/v-track2-a.test.ts`, pin 1 of 2. Old:

```ts
    'check("purchasePrice", range(values.purchasePrice, 0))',
```

  New:

```ts
    'check("purchasePrice", range(values.purchasePrice, 0) ?? decimals(values.purchasePrice, 2))',
```

- `tests/v-track2-a.test.ts`, pin 2 of 2. Old:

```ts
    'check("common.purchasePrice", range(common.purchasePrice, 0))',
```

  New:

```ts
    'check("common.purchasePrice", range(common.purchasePrice, 0) ?? decimals(common.purchasePrice, 2))',
```

- `tests/v-track2-d.test.ts`, pin 1 of 4. Old:

```ts
    'check("saleValue", range(values.saleValue, 0))',
    'check("salvageValue", range(values.salvageValue, 0))',
    // The server's own 12-character rule
```

  New:

```ts
    'check("saleValue", range(values.saleValue, 0) ?? decimals(values.saleValue, 2))',
    'check("salvageValue", range(values.salvageValue, 0) ?? decimals(values.salvageValue, 2))',
    // The server's own 12-character rule
```

- `tests/v-track2-d.test.ts`, pin 2 of 4. Old:

```ts
    'check("saleValue", range(values.saleValue, 0))',
    'check("salvageValue", range(values.salvageValue, 0))',
    "const reasonTooShort
```

  New:

```ts
    'check("saleValue", range(values.saleValue, 0) ?? decimals(values.saleValue, 2))',
    'check("salvageValue", range(values.salvageValue, 0) ?? decimals(values.salvageValue, 2))',
    "const reasonTooShort
```

- `tests/v-track2-d.test.ts`, pin 3 of 4. Old:

```ts
    'check("saleValue", range(values.saleValue, 0))',
    'check("salvageValue", range(values.salvageValue, 0))',
    'check("approvalRemark"
```

  New:

```ts
    'check("saleValue", range(values.saleValue, 0) ?? decimals(values.saleValue, 2))',
    'check("salvageValue", range(values.salvageValue, 0) ?? decimals(values.salvageValue, 2))',
    'check("approvalRemark"
```

- `tests/v-track2-d.test.ts`, pin 4 of 4. Old:

```ts
    'check("actualSaleValue", range(values.actualSaleValue, 0))',
    'check("actualSalvageValue", range(values.actualSalvageValue, 0))',
```

  New:

```ts
    'check("actualSaleValue", range(values.actualSaleValue, 0) ?? decimals(values.actualSaleValue, 2))',
    'check("actualSalvageValue", range(values.actualSalvageValue, 0) ?? decimals(values.actualSalvageValue, 2))',
```

- `tests/v-track2-m.test.ts`, pin 1 of 2. Old:

```ts
    'check("reportedById", needsReporter ? required(values.reportedById) : null)',
    'check("repairCost", range(values.repairCost, 0) ?? step(values.repairCost, 0.01))',
```

  New:

```ts
    'check("reportedById", needsReporter ? required(values.reportedById) : null)',
    'check("repairCost", range(values.repairCost, 0) ?? decimals(values.repairCost, 2))',
```

- `tests/v-track2-m.test.ts`, pin 2 of 2. Old:

```ts
    'if (values.problem !== undefined) check("problem", required(values.problem) ?? maxLength(values.problem, 4000))',
    'check("repairCost", range(values.repairCost, 0) ?? step(values.repairCost, 0.01))',
```

  New:

```ts
    'if (values.problem !== undefined) check("problem", required(values.problem) ?? maxLength(values.problem, 4000))',
    'check("repairCost", range(values.repairCost, 0) ?? decimals(values.repairCost, 2))',
```

- `tests/v-track-f.test.ts`, pin 1 of 1. Old:

```ts
    invalid: "ข้อมูลไม่ถูกต้อง",
  })
```

  New:

```ts
    invalid: "ข้อมูลไม่ถูกต้อง",
    tooManyDecimals: "กรอกทศนิยมได้ไม่เกิน 2 ตำแหน่ง",
  })
```

- [ ] **Step 5: Verify.** `node --test tests/v-track2-x.test.ts tests/v-track-f.test.ts tests/v-track2-a.test.ts tests/v-track2-d.test.ts tests/v-track2-m.test.ts tests/asset-forms-ui.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts tests/messages-edit.test.ts tests/validation-guards.test.ts tests/form-migration-guards.test.ts` (78 tests, 0 fail); `npm test` (+1; 2289 tests, 2288 pass, 0 fail, 1 skipped); `npx tsc --noEmit`; `npm run lint` (0 errors, 146 warnings). Leaf keys per locale 4091 → 4092. eol: `validation-rules.ts` `93 93`, `messages/*.json` `4274 4274`, `asset-form.tsx` `2061 2061`, `asset-batch-form.tsx` `1322 1322`, `disposal-request-form.tsx` `345 345`, `disposal-batch-form.tsx` `274 274`, `disposal-decision-button.tsx` `319 319`, `disposal-execution-button.tsx` `432 432`, `repair-record-form.tsx` `344 344`, `repair-record-actions.tsx` `384 384`, `v-track-f` `248 248`, `v-track2-a` `0 311`, `v-track2-d` `0 355`, `v-track2-m` `0 294`, `v-track2-x` `0 180`. `git diff --numstat`: `15 1` validation-rules; `2 1` each messages file; `3 3` the asset form and the four disposal forms; `2 2` the batch and the two repair files; `1 0` v-track-f; `2 2` v-track2-a, `8 8` v-track2-d, `2 2` v-track2-m; `39 0` v-track2-x.
- [ ] **Step 6: Commit.** `git add src/lib/validation-rules.ts messages/th.json messages/en.json src/components/assets/asset-form.tsx src/components/assets/asset-batch-form.tsx src/components/disposal/disposal-request-form.tsx src/components/disposal/disposal-batch-form.tsx src/components/disposal/disposal-decision-button.tsx src/components/disposal/disposal-execution-button.tsx src/components/maintenance/repair-record-form.tsx src/components/maintenance/repair-record-actions.tsx tests/v-track-f.test.ts tests/v-track2-a.test.ts tests/v-track2-d.test.ts tests/v-track2-m.test.ts tests/v-track2-x.test.ts`, then `git commit -m "feat(forms): every money field refuses more than 2 decimal places with one clear sentence (v-track plan 2 task 31c)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 31d (A8): The batch's row limits and its duplicate check stay focusable and say why beside the row count (`c/assets/asset-batch-form.tsx`, messages)

The user's answer to open issue 16 (its recommendation: one small task, A8); spec §4.4 ("a gate that shows nothing today gets a visible reason line"), §11 call 2; A-R6's gate (Task 6: `aria-disabled` with `aria-describedby` to a visible line, the handler returns first), A-R7; X-R4.

**Files:**
- Modify: `src/components/assets/asset-batch-form.tsx` (`i/lf w/crlf`); `messages/th.json`, `messages/en.json` (through the script)
- Pin: `tests/asset-forms-ui.test.ts` (`i/lf w/crlf`)
- Test: `tests/v-track2-x.test.ts` (LF, append)
- No change: `tests/button-size-switch.test.ts` (its two remove-button pins end at `onClick`, which stays right after `className="shrink-0"` / `size="icon-lg"`); the paste handler's own 100-row cap (`:654-668`); the label print queue's two print buttons (open issue 16's other half: the final plan's sweep).

**Interfaces:** consumes Task 2's `hasClientDuplicates` and the row count line; produces the reason line `id="asset-batch-row-count"` with `asset.batchRowLimits` (th "ชุดหนึ่งมีได้ 2–100 รายการ", en "A batch holds 2–100 items") and the two gate constants `atRowLimit`, `atRowMinimum`.

**Changes at `37968225`:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| after `:313` `const hasClientDuplicates = …` | — | a two-line comment; `  const atRowLimit = rows.length >= 100`; `  const atRowMinimum = rows.length <= 2` | X-R4 |
| `handleAddRow :587`, `handleRemoveRow :597`, `handleCheckDuplicates :615` | the function's first line, then its body | `    if (atRowLimit) return`, `    if (atRowMinimum) return`, `    if (hasClientDuplicates) return` as the first statement (a press does nothing; the inner `setRows` guards stay) | A-R6, X-R4 |
| `:983` | `<div className="text-sm font-medium text-foreground">{t("batchCurrentCount", { count: rows.length })}</div>` | `<div id="asset-batch-row-count" className="text-sm font-medium text-foreground">{t("batchCurrentCount", { count: rows.length })} · {t("batchRowLimits")}</div>` | X-R4 |
| `:986` add row | `<Button variant="outline" className="w-full sm:w-auto" onClick={handleAddRow} disabled={rows.length >= 100}>` | one prop per line; `disabled` → `aria-disabled={atRowLimit \|\| undefined}` / `aria-describedby={atRowLimit ? "asset-batch-row-count" : undefined}` | A-R6, X-R4 |
| `:990` check duplicates | `… onClick={handleCheckDuplicates} busy={checkingDuplicates} disabled={hasClientDuplicates}>` | one prop per line; `disabled` → `aria-disabled={hasClientDuplicates \|\| undefined}` / `aria-describedby={hasClientDuplicates ? "asset-batch-row-count" : undefined}` (`busy` keeps its own `aria-disabled`: Button ORs the two) | A-R6, X-R4 |
| `:1035`, `:1132` remove row (cards, table) | `disabled={rows.length <= 2}` | `aria-disabled={atRowMinimum \|\| undefined}` / `aria-describedby={atRowMinimum ? "asset-batch-row-count" : undefined}` | A-R6, X-R4 |
| `messages/*.json` | — | `asset.batchRowLimits` (the change file below) | X-R4 |

The exact edits (the two remove buttons differ only in indentation, so each old text starts at the line before `onClick`):

- `src/components/assets/asset-batch-form.tsx`, edit 1 of 9. Old:

```ts
  const hasClientDuplicates = duplicateValues.serialNumbers.length > 0 || duplicateValues.assetTags.length > 0

```

  New:

```ts
  const hasClientDuplicates = duplicateValues.serialNumbers.length > 0 || duplicateValues.assetTags.length > 0
  // A batch holds 2–100 rows. At a limit, add or remove is a prerequisite gate: it stays focusable, does nothing and says
  // why on the row count line (spec §4.4, A-R6); so does the duplicate check while the rows hold a duplicate (A-R7).
  const atRowLimit = rows.length >= 100
  const atRowMinimum = rows.length <= 2

```

- `src/components/assets/asset-batch-form.tsx`, edit 2 of 9. Old:

```ts
  function handleAddRow() {
    setRows((current) => {

```

  New:

```ts
  function handleAddRow() {
    if (atRowLimit) return
    setRows((current) => {

```

- `src/components/assets/asset-batch-form.tsx`, edit 3 of 9. Old:

```ts
  function handleRemoveRow(clientId: string) {
    setRows((current) => {

```

  New:

```ts
  function handleRemoveRow(clientId: string) {
    if (atRowMinimum) return
    setRows((current) => {

```

- `src/components/assets/asset-batch-form.tsx`, edit 4 of 9. Old:

```ts
  async function handleCheckDuplicates() {
    setCheckingDuplicates(true)

```

  New:

```ts
  async function handleCheckDuplicates() {
    if (hasClientDuplicates) return
    setCheckingDuplicates(true)

```

- `src/components/assets/asset-batch-form.tsx`, edit 5 of 9. Old:

```ts
              <div className="text-sm font-medium text-foreground">{t("batchCurrentCount", { count: rows.length })}</div>

```

  New:

```ts
              <div id="asset-batch-row-count" className="text-sm font-medium text-foreground">{t("batchCurrentCount", { count: rows.length })} · {t("batchRowLimits")}</div>

```

- `src/components/assets/asset-batch-form.tsx`, edit 6 of 9. Old:

```ts
            <Button variant="outline" className="w-full sm:w-auto" onClick={handleAddRow} disabled={rows.length >= 100}>

```

  New:

```ts
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleAddRow}
              aria-disabled={atRowLimit || undefined}
              aria-describedby={atRowLimit ? "asset-batch-row-count" : undefined}
            >

```

- `src/components/assets/asset-batch-form.tsx`, edit 7 of 9. Old:

```ts
            <Button variant="outline" className="w-full sm:w-auto" onClick={handleCheckDuplicates} busy={checkingDuplicates} disabled={hasClientDuplicates}>

```

  New:

```ts
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleCheckDuplicates}
              busy={checkingDuplicates}
              aria-disabled={hasClientDuplicates || undefined}
              aria-describedby={hasClientDuplicates ? "asset-batch-row-count" : undefined}
            >

```

- `src/components/assets/asset-batch-form.tsx`, edit 8 of 9. Old:

```ts
                    className="shrink-0"
                    onClick={() => handleRemoveRow(row.clientId)}
                    disabled={rows.length <= 2}

```

  New:

```ts
                    className="shrink-0"
                    onClick={() => handleRemoveRow(row.clientId)}
                    aria-disabled={atRowMinimum || undefined}
                    aria-describedby={atRowMinimum ? "asset-batch-row-count" : undefined}

```

- `src/components/assets/asset-batch-form.tsx`, edit 9 of 9. Old:

```ts
                      size="icon-lg"
                      onClick={() => handleRemoveRow(row.clientId)}
                      disabled={rows.length <= 2}

```

  New:

```ts
                      size="icon-lg"
                      onClick={() => handleRemoveRow(row.clientId)}
                      aria-disabled={atRowMinimum || undefined}
                      aria-describedby={atRowMinimum ? "asset-batch-row-count" : undefined}

```

The messages: save as `<temp>/add-31d-messages.json` and run `node scripts/messages-edit.mjs <temp>/add-31d-messages.json` (4092 → 4093 leaf keys per locale; the key goes last in `asset`):

```json
{"set":{"th":{"asset.batchRowLimits":"ชุดหนึ่งมีได้ 2–100 รายการ"},"en":{"asset.batchRowLimits":"A batch holds 2–100 items"}}}
```

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-x.test.ts` (with a file tool):

```ts

test("the batch's row limits and its duplicate check stay focusable and say why beside the row count (v-track plan 2 task 31d, A8)", () => {
  const source = read(`${C}assets/asset-batch-form.tsx`)
  // One visible reason line: the row count gains the 2–100 limits (spec §4.4: a gate that showed nothing gets a reason).
  assert.ok(source.includes('<div id="asset-batch-row-count" className="text-sm font-medium text-foreground">{t("batchCurrentCount", { count: rows.length })} · {t("batchRowLimits")}</div>'))
  assert.equal(messages("th").asset.batchRowLimits, "ชุดหนึ่งมีได้ 2–100 รายการ")
  assert.equal(messages("en").asset.batchRowLimits, "A batch holds 2–100 items")
  assert.match(source, /\n  const atRowLimit = rows\.length >= 100\n  const atRowMinimum = rows\.length <= 2\n/)
  // Add at 100 rows, remove at 2 (the cards and the table), check duplicates while the rows hold one: each stays
  // focusable, aria-disabled and tied to the line (A-R6's gate), never disabled.
  const count = (text: string) => source.split(text).length - 1
  for (const [condition, buttons] of [["atRowLimit", 1], ["atRowMinimum", 2], ["hasClientDuplicates", 1]] as const) {
    assert.equal(count(`aria-disabled={${condition} || undefined}`), buttons, condition)
    assert.equal(count(`aria-describedby={${condition} ? "asset-batch-row-count" : undefined}`), buttons, condition)
  }
  assert.match(source, /onClick=\{handleAddRow\}\n\s+aria-disabled=\{atRowLimit /)
  assert.match(source, /busy=\{checkingDuplicates\}\n\s+aria-disabled=\{hasClientDuplicates /)
  assert.equal(source.match(/onClick=\{\(\) => handleRemoveRow\(row\.clientId\)\}\n\s+aria-disabled=\{atRowMinimum /g)?.length, 2)
  assert.doesNotMatch(source, /disabled=\{rows\.length (?:>= 100|<= 2)\}|disabled=\{hasClientDuplicates\}/)
  // A press does nothing: each handler returns first.
  assert.match(source, /function handleAddRow\(\) \{\n\s+if \(atRowLimit\) return\n/)
  assert.match(source, /function handleRemoveRow\(clientId: string\) \{\n\s+if \(atRowMinimum\) return\n/)
  assert.match(source, /async function handleCheckDuplicates\(\) \{\n\s+if \(hasClientDuplicates\) return\n/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-x.test.ts`. Expected: 4 tests, 1 fail: "the batch's row limits and its duplicate check stay focusable and say why beside the row count (v-track plan 2 task 31d, A8)" (`The expression evaluated to a falsy value`: the row count line has no id yet). After Step 3 and before Step 4, `npm test` fails exactly one test: "asset batch form: the duplicate check and the save button are busy without a label swap (K13)" (`tests/asset-forms-ui.test.ts`, its `disabled={hasClientDuplicates}` pin); Step 4 is its edit.
- [ ] **Step 3: Implement** per the exact edits and the change file.
- [ ] **Step 4: Pin edit:**

- `tests/asset-forms-ui.test.ts`, pin 1 of 1. Old:

```ts
  assert.match(source, /busy=\{checkingDuplicates\} disabled=\{hasClientDuplicates\}>\n\s*\{t\("batchCheckDuplicates"\)\}/)
```

  New:

```ts
  // While the rows hold a duplicate the check waits, focusable with its reason (v-track plan 2 task 31d).
  assert.match(source, /busy=\{checkingDuplicates\}\n\s*aria-disabled=\{hasClientDuplicates \|\| undefined\}\n\s*aria-describedby=\{hasClientDuplicates \? "asset-batch-row-count" : undefined\}\n\s*>\n\s*\{t\("batchCheckDuplicates"\)\}/)
```

- [ ] **Step 5: Verify.** `node --test tests/v-track2-x.test.ts tests/v-track2-a.test.ts tests/asset-forms-ui.test.ts tests/button-size-switch.test.ts tests/assets-sweep-ui.test.ts tests/thai-glossary.test.ts tests/messages-parity.test.ts tests/messages-edit.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/visual-foundation-guards.test.ts` (115 tests, 0 fail); `npm test` (+1; 2290 tests, 2289 pass, 0 fail, 1 skipped); `npx tsc --noEmit`; `npm run lint` (0 errors, 146 warnings). Leaf keys per locale 4092 → 4093. eol: `asset-batch-form.tsx` `1344 1344`, `messages/*.json` `4275 4275`, `asset-forms-ui` `139 139`, `v-track2-x` `0 204`. `git diff --numstat`: `27 5` the batch form, `2 1` each messages file, `2 1` asset-forms-ui, `24 0` v-track2-x.
- [ ] **Step 6: Commit.** `git add src/components/assets/asset-batch-form.tsx messages/th.json messages/en.json tests/asset-forms-ui.test.ts tests/v-track2-x.test.ts`, then `git commit -m "feat(assets): the batch's row limits and its duplicate check stay focusable and say why beside the row count (v-track plan 2 task 31d, A8)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 31e (U7): The scan check's waiting save opens the note-and-photo section that holds the picker (`c/audit/audit-scan-check-form.tsx`)

The user's answer to open issue 7; spec §4.4 ("a required photo not taken"), §4.2; U-R11; X-R5.

**Files:** Modify `src/components/audit/audit-scan-check-form.tsx` (`i/lf w/crlf`) · Pin `tests/v-track2-u.test.ts` (LF) · Test `tests/v-track2-x.test.ts` (LF, append). No change: the gate itself (Task 19: `aria-disabled` tied to `audit-check-photo-reason`), the toggle button (`tests/audit-scan-sweep-ui.test.ts:50` holds), the workspace.

**Interfaces:** consumes Task 19's `save` and the existing `extrasOpen` state (`:140`, `useState(target.kind === "out_of_scope")`); produces nothing for later tasks.

**Changes at `37968225`:**

| Line | Now | Becomes | Rule |
|---|---|---|---|
| `:251-254` | `  // A missing photo is a prerequisite: save stays focusable and returns here (spec §4.4). Then the fields, then saving the` / `  // parent while components are still pending asks first; cancelling sends nothing (D4).` / `  async function save() {` / `    if (missingPhoto) return` | the comment in three lines (save also opens the section); `  async function save() {` / `    if (missingPhoto) {` / `      setExtrasOpen(true)` / `      return` / `    }` | U-R11, X-R5 |

The exact edit:

- `src/components/audit/audit-scan-check-form.tsx`, edit 1 of 1. Old:

```ts
  // A missing photo is a prerequisite: save stays focusable and returns here (spec §4.4). Then the fields, then saving the
  // parent while components are still pending asks first; cancelling sends nothing (D4).
  async function save() {
    if (missingPhoto) return

```

  New:

```ts
  // A missing photo is a prerequisite: save stays focusable, opens the note-and-photo section that holds the picker and
  // returns here (spec §4.4). Then the fields, then saving the parent while components are still pending asks first;
  // cancelling sends nothing (D4).
  async function save() {
    if (missingPhoto) {
      setExtrasOpen(true)
      return
    }

```

- [ ] **Step 1: The failing test.** Append to `tests/v-track2-x.test.ts` (with a file tool):

```ts

test("the scan check's waiting save opens the note-and-photo section, so the missing photo's picker is in view (v-track plan 2 task 31e, U7)", () => {
  const source = read(`${C}audit/audit-scan-check-form.tsx`)
  // Save still returns first while a required photo is missing (U-R11), and now opens the section that holds the picker.
  assert.match(source, /async function save\(\) \{\n\s+if \(missingPhoto\) \{\n\s+setExtrasOpen\(true\)\n\s+return\n\s+\}\n\s+fieldErrors\.setErrors\(validate\(values\)\)\n/)
  const section = source.slice(source.indexOf("{extrasOpen ? ("), source.indexOf("<div data-audit-check-actions"))
  assert.ok(section.includes('title={t("dropAuditPhotoTitle")}'), "the photo picker sits in that section")
  // The toggle still opens and closes it, and the gate is as Task 19 left it: focusable, tied to its Notice.
  assert.ok(source.includes("onClick={() => setExtrasOpen((current) => !current)}"))
  assert.match(source, /aria-disabled=\{missingPhoto \|\| undefined\}\n\s+aria-describedby=\{missingPhoto \? "audit-check-photo-reason" : undefined\}\n/)
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track2-x.test.ts`. Expected: 5 tests, 1 fail: "the scan check's waiting save opens the note-and-photo section, so the missing photo's picker is in view (v-track plan 2 task 31e, U7)" (`The input did not match the regular expression /async function save\(\) \{\n\s+if \(missingPhoto\) \{…/`). After Step 3 and before Step 4, `npm test` fails exactly one test: "scan check: the location's star has its rule and its error, focus stays inside the sheet, and a missing photo keeps save focusable with its reason (v-track U6)" (`tests/v-track2-u.test.ts`, its `if (missingPhoto) return` regex); Step 4 is its edit.
- [ ] **Step 3: Implement** per the exact edit.
- [ ] **Step 4: Pin edit:**

- `tests/v-track2-u.test.ts`, pin 1 of 1. Old:

```ts
  assert.match(source, /async function save\(\) \{\n\s+if \(missingPhoto\) return\n\s+fieldErrors\.setErrors\(validate\(values\)\)\n\s+if \(focusFirstError\(\)\) return\n/)
```

  New:

```ts
  assert.match(source, /async function save\(\) \{\n\s+if \(missingPhoto\) \{\n\s+setExtrasOpen\(true\)\n\s+return\n\s+\}\n\s+fieldErrors\.setErrors\(validate\(values\)\)\n\s+if \(focusFirstError\(\)\) return\n/)
```

- [ ] **Step 5: Verify.** `node --test tests/v-track2-x.test.ts tests/v-track2-u.test.ts tests/audit-scan-check-ui.test.ts tests/audit-scan-sweep-ui.test.ts tests/audit-component-scan-ui.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts` (80 tests, 0 fail); `npm test` (+1; 2291 tests, 2290 pass, 0 fail, 1 skipped); `npx tsc --noEmit`; `npm run lint` (0 errors, 146 warnings). eol: `audit-scan-check-form.tsx` `479 479`, `v-track2-u` `0 219`, `v-track2-x` `0 215`. `git diff --numstat`: `7 3`, `1 1`, `11 0`.
- [ ] **Step 6: Commit.** `git add src/components/audit/audit-scan-check-form.tsx tests/v-track2-u.test.ts tests/v-track2-x.test.ts`, then `git commit -m "feat(audit): the scan check's waiting save opens the note-and-photo section that holds the picker (v-track plan 2 task 31e, U7)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Rehearsal record (the addendum)

| Task | `v2-add` | Step 2 (the new test fails first) | failing before Step 4 | `npm test` after (tests / pass / fail / skipped) | `tests/v-track2-x.test.ts` |
|---|---|---|---|---|---|
| 31a | `6ef98430` | 31a's test, the 400 body's deep-equal | none | 2287 / 2286 / 0 / 1 | `0 120` |
| 31b | `0d440c83` | 31b's test, `auditYear: 'required'` | none | 2288 / 2287 / 0 / 1 | `0 141` |
| 31c | `97ad82af` | 31c's test, `decimals is not a function` | 9 (the money lines of A1, A2, D2–D5, M4, M5 and the message table) | 2289 / 2288 / 0 / 1 | `0 180` |
| 31d | `3b5c278c` | 31d's test, the row count line | 1 (the K13 pin) | 2290 / 2289 / 0 / 1 | `0 204` |
| 31e | `fbda71b9` | 31e's test, the `save` regex | 1 (U6's `save` regex) | 2291 / 2290 / 0 / 1 | `0 215` |

- Clone `<temp>/../v-sim`, its own `node_modules`, branch `v2-add` from `37968225`. The switch from `v2-base` wrote 18 files with the wrong endings (the 9 LF tests and the 5 plan-2 test files as CRLF, the 4 mixed files as all CRLF); `<temp>/add/fix-eol.mjs` set the LF files back to LF and rebuilt each mixed file's endings line by line from the real checkout's, and `git add` of those unchanged files refreshed the index. Then `git ls-files --eol` matched `D:/Antigravity/asset-system` file by file, and the base gave `npm test` 2286 / 2285 / 0 / 1, `tsc` clean, lint 0 errors and 146 warnings.
- Every task: `npx tsc --noEmit` clean; `npm run lint` 0 errors, 146 warnings (all under `.agents/`); every edited file kept its endings; `tests/v-track2-x.test.ts` LF. End state after 31e: `counts.mts` toasts outside a catch 34 in 11 files, `<form … noValidate>` 46, 4093 leaf keys per locale, `V_FORMS` 43, `SELECT_STAR_ONLY` 0 in 0, FMG `STAR_ONLY` `new Set<string>([])`; `tests/validation-guards.test.ts` `224 224`, `tests/form-migration-guards.test.ts` `503 503`, `tests/choice-controls-ui.test.ts` `154 154`, `messages/th.json` `4275 4275`.
- Text replay: this section's exact edits, change files and Step 1 blocks were read back by a parser and applied in order to `37968225`'s files (LF): after each task every file it touches equals that task's `v2-add` commit (31a–31e, all five).
- What the rehearsal changed in the draft: 31c includes the disposal decision's two estimated values (every `step="0.01"` control under `src/components` is one of the eight files; X-R3); 31c's test checks that list against the source, so a later money field without the rule fails it; 31d's first test draft built a `RegExp` from a template string whose backslashes a shell heredoc had eaten (it matched everything): the test counts plain strings instead, and every block here is written with a file tool; the 31d gate comment names A-R6 and A-R7.
- Task 33 rehearsed again on top: `ae8ed79a` (C1, `<today>` 2026-10-18; Task 33's numbers there).

---

## Controller: verify and dev-app check (Task 32)

### Task 32: Verify, production build and dev-app check in both themes (controller runs this task, not an implementer)

The shape of plan 1's Task 30. One rule is stricter than plan 1's: **no request other than a GET reaches the server.** Plan 1 let a few refusals through because the server refuses them before it writes; plan 2 shows every server refusal through a stand-in body (`route.fulfill`), and aborts every other non-GET request.

**Files:**
- Create then delete: your own launch configuration in `.claude/launch.json` while the server runs (never committed; if the file already holds another session's configuration, add your own entry with its own name and port and remove only that entry afterwards; delete the file only if you created it).
- Evidence (git-ignored): `.superpowers/sdd/screenshots/v-track-plan2/after/`, `.superpowers/sdd/v-track-plan2/task-32-counts/`, `.superpowers/sdd/v-track-plan2/task-32-findings.md`.
- Modify: only files needed to fix problems found here. Each fix is a new small task with its own test through an implementer and the normal review, before Task 33. A fix never adds an `EXEMPT`, `V_SCOPE`, `NOT_IN_SCOPE`, `SELECT_STAR_ONLY`, FMG `STAR_ONLY` or `NON_VALIDATION_TOASTS` row without a ruling, and it changes the counts below; say by how much in the findings.

**Interfaces:**
- Consumes: Tasks 1–31 and 31a–31e committed; Task 0's baseline, counts and before evidence (`.superpowers/sdd/v-track-plan2/task-0-*`, `before/`).
- Produces: `task-32-findings.md`, which Task 33 turns into the "Dev-app check" and "Still open" bullets of the handoff section and the "ตรวจบนแอป" bullet of the changelog entry. The user's answers to the open issues (2026-10-18) are already written into Task 33's blocks; a new answer the user gives on the screenshots goes to the controller before Task 33.

- [ ] **Step 1: Verify.** Delete `.next/cache/turbopack` first (a stale Turbopack cache shipped old CSS before, wiki 47), then `npm run verify` (lint, tests, build). Expected: lint 0 errors and 146 warnings (all under `.agents/`); tests **2291, 2290 pass, 0 fail, 1 skipped** (the addendum rehearsal, `v2-add` `fbda71b9`; 2286 after Task 31 on the assembly chain and in the dry run); build **60/60 pages** (plan 1's verify at `e1caa29`; plan 2 adds no route, so another page count is a finding; the dry run did not build, because the build reads `.env`). Then `npx tsc --noEmit` (clean), `git status --short` (only the untracked items of the Global Constraints), and `node <tools>/eol.mjs` on the six new test files (each `0 <lines>`) and the four mixed files of the Global Constraints (two different numbers each: still mixed).
- [ ] **Step 2: The built CSS.** In `.next/static/css/*.css`, the rules the new error states use: the field error look `aria-invalid:border-danger`, `aria-invalid:ring-danger`, `aria-invalid:shadow-field-error` and its focus row `aria-invalid:focus:border-ring` (`src/components/ui/field-variants.ts`; the drop zones of Task 1 and every `Field` take it); the SearchableSelect trigger's `data-invalid` look with `border-danger` and its `focus` and `aria-expanded` compounds with `border-ring` (plan 1 F-R7; the 14 selects of `SELECT_STAR_ONLY` now show it); the label print reason box's `border-danger ring-1 ring-danger shadow-field-error` (Task 7, through `cn`); the Button's `aria-disabled:` styles (every prerequisite gate of plan 2). Plan 2 adds no new utility class: the dry run compared every class token of the `className` strings plan 2 adds (`git diff e1caa29 HEAD -- src`) with `e1caa29`'s `src`, and each was already in use. A missing rule is a finding to fix before Step 4.
- [ ] **Step 3: Counting evidence after.** `node <temp>/asm/counts.mts .` (repo root as the working directory) and the commands of Task 0 Step 4 again, into `task-32-counts/`, compared with `task-0-counts/`:
  - toasts outside a catch in `src` 34 in 11 files (61 in 19 at `e1caa29`); `<form … noValidate>` in `src` 46 (17); `messages/th.json` and `en.json` 4093 leaf keys each (4092); `V_FORMS` 43 (15; every `V_SCOPE` file but `admin/system-settings-form.tsx`, plan 3); `SELECT_STAR_ONLY` `0 in 0` (14 in 10); FMG `STAR_ONLY` `new Set<string>([])` (three entries); `NON_VALIDATION_TOASTS` 4 rows (none); FMG `CONSTRAINT_FLOORS` checkin `required` 5 (4). These are the addendum rehearsal's numbers at `fbda71b9` (Tasks 31a–31e change only the key count among them; the dry run gave the others at `37968225`).
  - `git grep -nE "licenseSeatUsageInvalid|customFieldRequired|duplicateWarning|reviewIncomplete|selectCheckoutRequired|selectReturnAndReceiver|completeRequiredFields|destinationRequired|validateHistoricalException" -- src messages` prints nothing (the eight deleted keys and the deleted function; tests may still name them in a `doesNotMatch`).
- [ ] **Step 4: Production server.**
  - Add a launch configuration `name: "asset-v2-start-3110"`, `runtimeExecutable: "node"`, `runtimeArgs: ["node_modules/next/dist/bin/next", "start", "-p", "3110"]`, `port: 3110`, `autoPort: false` (another free port if 3110 is taken; say which in the findings), and start it with `preview_start`.
  - Confirm the dev database as in Task 0 Step 5 without opening `.env` (`/th/admin/readiness`); if anything suggests the production database, stop. Log in with the seed admin of `prisma/seed.ts`; do not echo the password. Use your own browser tab.
  - Prefer `waitUntil: "load"` plus a short wait over `networkidle`. Playwright code runs inline (`browser_run_code_unsafe`); a file you must create goes under `.playwright-mcp/` and is deleted right after the run.
- [ ] **Step 5: No request but a GET reaches the server.** Right after the login, before any plan-2 page, route the browser context (`page.context().route("**/*", handler)`), and keep the handler for the rest of the task:
  - **The handler:** a `GET` or `HEAD` continues. A non-GET whose method and path match the stand-in you set for the check in hand is fulfilled with that stand-in (`route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) })`). `POST /api/audit-rounds/<id>/scan` is **always fulfilled, never aborted** (its default stand-in: 400 `{ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { actualLocationId: "required" } }`): an aborted scan is a network error, which the scan workspace keeps in its offline queue (IndexedDB `asset-system-audit-offline`) and sends again later, a write after the check. Every other non-GET is aborted (`route.abort()`). Log each non-GET with its method, path and "fulfilled <status>" or "aborted".
  - **Prove it first:** from the page, `await fetch("/api/v-track-probe", { method: "POST" }).catch((error) => error.name)` must appear in the handler's log as aborted. If the log does not show it (a service worker in the way: `public/sw.js` handles GETs only, but check), stop and set it up again with service workers blocked (`browser.newContext({ serviceWorkers: "block" })`) before going on.
  - **Stand-ins are built from the code**, not guessed: the body a route sends on that refusal (the `fieldErrors` keys are the form's field table keys; Step 6 lists the ones to use). A read-only step that needs a `POST` (the audit round's `POST /api/audit-rounds/preview`, the import's `POST /api/assets/import-preview`, the batch's `POST /api/assets/batch/check-duplicates`, bulk execution's preview `POST /api/disposal-requests/bulk-execution`) is aborted like any other, unless a check needs the step behind it; then fulfill it with a body in the route's response shape (read the route and its response type), or skip that check and say so in the findings ("covered by the task's test").
  - **Never:** a photo or a signature on checkout or checkin, even with the handler on (both routes save the evidence files before they parse the input); a submit of any form with the handler off; a notification click (it may mark it read); the LDAP sync; any button outside the plan-2 forms that sends a non-GET.
  - Count every non-GET at the end: each fulfilled or aborted, none continued. One that continued is a finding, reported with its route, its status and whether it wrote.
- [ ] **Step 6: Every plan-2 form, at 1440 and 375, light and dark** (Task 0 Step 7's list), screenshots to `after/<form>-<state>-<theme>-<width>.png`. For every form:
  - **Empty submit:** no browser bubble, no validation toast, no request; focus on the first wrong field of the form's field table order (`FIELD_IDS`, or the named table: `COMMON_FIELD_IDS`, `BULK_FIELD_IDS`, `INSTALL_FIELD_IDS`, `REVIEW_FIELD_IDS`, `PLAN_FIELD_IDS`, `CLOSE_FIELD_IDS`, `COMPLETE_FIELD_IDS`, `CANCEL_FIELD_IDS`, `EDIT_FIELD_IDS`); under each wrong field its message (`common.validation.*` or the form's own domain message); the focused field's box (label to error line) inside `main` (or the dialog), 24px clear of the top edge and of the save bar (`getBoundingClientRect` against `main` and `[data-slot="sticky-form-footer"]`); the focused control's accessible description holds its error; no field error carries `role="alert"` or a live region; a required select shows the error look (red border at rest, teal while focused or open).
  - **Clearing:** typing in or changing a wrong field clears only its error; a group clears together (the warranty pair, the round's two dates, the license's assignee or department, transfer's three destinations, checkout's destination on a type change, the execution's exception pair); a new submit recomputes everything.
  - **Server refusals** (stand-ins only): each lands under its field with focus there, inside the dialog when the form is a dialog; a stand-in that names no field of the form (for example 400 `{ error: "Something else", code: "OTHER" }`) shows today's form-level message once (toast or Notice) and leaves the form as it was.
  - **Area A** (assets):
    - The asset form, create (`/th/assets/new`) and edit (`/th/assets/<id>/edit`): the 12 old toasts' rules each under its field (license seats used above total → `licenseSeatsExceeded` under the used seats; a fraction in total seats → the format message; the license's assignee or department → one error under the assignee; a template's required custom field → `required` under it; bad custom fields JSON; "Add purchase document" without a file or a number and "Add photo" without a file → under the drop zone or the number); the total seats show no asterisk; the warranty end before its start typed on create → under the end; on edit, changing one warranty date to a reversed pair → under the end, and a stored reversed pair (if the dev data holds one) does not stop the save when neither date changed (the save request is then aborted). Stand-in: `PUT` of the edit → 400 `{ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { serialNumber: "duplicate" } }` → under the serial.
    - The asset form's gates: a protected status change on edit (save `aria-disabled`, its description the warning under the status); the duplicate check running (delay the `GET /api/assets/duplicates*` by 3 s in the handler with `await new Promise((r) => setTimeout(r, 3000))` before `route.continue()`, type a tag and press save: `aria-disabled` with `asset.duplicateCheckPending` beside it, Enter sends nothing). The live duplicate tag and serial (an existing tag and serial typed, no save): one line under each, read once through the polite region, not twice (U8).
    - The batch (`/th/assets/new`, many): the shared fields' errors (`common.*`) and each row's (`rows.<i>.*`); two rows with one serial → `asset.batchRowDuplicate` under both, live, in the cards at 375 and the table at 1440; the check-duplicates result (fulfilled stand-in) in its Notice, no toast; from the review step, stand-in `POST /api/assets/batch` 400 `{ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { "rows.0.serialNumber": "duplicate" } }` → back to the edit step, focus on row 0's serial in the layout that shows (A-R7).
    - The register's bulk update (`/th/assets`, rows selected): apply enabled; neither location nor custodian → `bulkUpdateFieldRequired` under the location; the reason `required`; stand-in `POST /api/assets/bulk-update` 400 `{ …, fieldErrors: { reason: "required" } }`.
    - Component install (`/th/assets/<id>/components`): the role's asterisk and `required` on continue; Enter in a detail continues to the review; from the review, stand-in `POST /api/assets/<id>/components` 400 `{ …, fieldErrors: { componentRole: "required" } }` → back to the details step, focus on the role (A-R9). Removal: a reason over 500 characters → `tooLong` under it.
    - Status correction (asset detail, an asset that offers it): 4 characters → `tooShort` under the reason; the confirm enabled.
    - The import wizard (`/th/asset-management/import-export`): no file → `fileRequired` in the wizard's notice; with no ready row (a fulfilled preview stand-in with every row in error, or skip) the import is `aria-disabled` and its description is the counts beside it.
    - Label print (`/th/assets/labels?…` and one asset's label page): a reason over 500 characters → its error under the toolbar row; Enter in the reason prints (the record request aborted → today's `recordError`). The print queue filter (`/th/asset-management/labels`): created-from's picker stops at created-to, created-to's starts at created-from.
  - **Area O** (operations; O review notes):
    - Checkout (`/th/asset-management/checkout`): empty → the asset select; temporary loan without a due date → `checkout.temporaryDueDateRequired`, a due date before the checkout date (typed) → `checkout.returnBeforeCheckout`, both under the date; the handover group's error under the group.
    - Checkin (`/th/asset-management/checkin`): empty → the checkout select; the return date cleared → `required` under it (spec §5 bug, Task 10).
    - Transfer (`/th/asset-management/transfer`): empty → `required` under the asset; with an asset and no destination → the server's "at least one destination" under the location.
    - The review hand-back of checkout, checkin and transfer (Review Focus 1): fill the form (no photo, no signature), open the review, set the stand-in `POST /api/assets/<id>/checkout` (checkin: `/checkin`, transfer: `/transfer`) 400 `{ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { conditionBefore: "required" } }` (checkin: `{ nextLocationId: "required" }`, transfer: `{ reason: "required" }`), confirm: the review closes, focus lands on that field after the dialog has left the page (not on the save button), the error under it, nothing behind `aria-hidden`; cancelling a review without a refusal returns focus to the save button; again with reduced motion.
    - Bulk move (`/th/asset-management/bulk-move`): no asset → the error under the asset list, focus on the first checkbox; no destination → under the destination (spec §5 bug, Task 12).
    - The transaction cancel dialog (a checkout's print page or the asset detail menu): 4 characters → the reason's error under it; a transaction with blockers → the confirm focusable, looking disabled, its description the blockers Notice, Enter sends nothing.
  - **Area U** (audit):
    - The round form (`/th/audit/rounds/new`): a fraction in the year or the sample rate → its error; an end before the start typed → `endBeforeStart` under the end, both cleared together; the start picker stops at the end, the end picker starts at the start; stand-in `POST /api/audit-rounds/preview` 400 `{ …, fieldErrors: { endDate: "endBeforeStart" } }` → under the end, not the old "ข้อมูลที่กรอกไม่ครบหรือไม่ถูกต้อง" toast.
    - Round cancel (a round's detail): an empty reason → `required` under it, no toast; over 4,000 characters → `tooLong` with the number.
    - Mark not found and component missing: Enter submits; a stand-in that names no field keeps the parent's toast (U-R5).
    - The finding dialogs (`/th/audit/findings`): decision, action plan and close show their errors under the field and submit on Enter; a close without evidence is `aria-disabled` with `auditFinding.closeNeedsEvidence` as the body's last line. Batch review with nothing selected: approve and reject `aria-disabled` with `auditFinding.batchNeedsSelection`; the confirm-text dialog shows no browser bubble.
    - The scan check (`/th/audit/rounds/<id>/scan`) is Step 7's.
  - **Area D** (disposal):
    - The request (`/th/disposal/new`): empty → the asset picker, then the requester (spec §5 bug, Task 21); a reason under 12 characters → `tooShort`; a negative value → its range error; stand-in `POST /api/disposal-requests` 400 `{ …, fieldErrors: { reason: "tooShort" } }` → under the reason.
    - The batch (`/th/disposal/batch/new`): one asset → review `aria-disabled` with `disposalPage.batchNeedsAssets` beside it; two assets and no requester or reason → their errors on review; Enter in the asset search submits the step; from the review step, stand-in `POST /api/disposal-batches` 400 `{ …, fieldErrors: { reason: "tooShort" } }` → back to the edit step, focus on the reason (D-R3).
    - The decision dialog: a rejection without a reason → the error under the remark, save enabled.
    - The execution dialog: the executor `required`; the type's own rules (`getDisposalExecutionFieldErrors`); a historical reason under 20 characters → `tooShort`, the acknowledgement unticked → `required`; no evidence → save `aria-disabled` tied to the evidence Notice; stand-in `PATCH /api/disposal-requests/<id>` 400 `{ code: "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED", error: "…", fieldErrors: { evidenceExceptionReason: "tooShort" } }` → the dialog stays open with its entries and the error under the reason (Task 20; before, it closed and refreshed).
    - Bulk approval (the disposal list, rows selected): stand-in `POST /api/disposal-requests/bulk-decision` 400 `{ …, fieldErrors: { approvalRemark: "tooLong" } }` → under the remark; nothing eligible → approve `aria-disabled` tied to the zero-eligible Notice.
    - Bulk execution: the review step's shared values on review (errors, the button enabled); a preview stand-in (200, the route's preview shape, every row `blocked` by `DISPOSAL_RECIPIENT_REQUIRED`, and `fieldErrors: { sharedRecipientName: "recipientRequired" }`) → back to the review step, focus on the shared recipient (D-R9); on the preview step the permanent confirmation unticked → `disposalPage.bulkExecutionPermanentConfirmationRequired` under the box; nothing eligible → `aria-disabled` tied to its Notice.
  - **Area M** (maintenance):
    - The PM plan form (`/th/maintenance/pm/new`, and an edit): empty → the asset select (create); the days 0, 1.5 and 3651 → their range or number errors; on the edit, stand-in `PATCH /api/maintenance-plans/<id>` 400 `{ error: "PM vendor not found or inactive", fieldErrors: { vendorId: "pmVendorNotFound" } }` → under the vendor.
    - The repair record form (`/th/maintenance/new`): empty → the asset, then the reporter where it is asked for; the two questions as groups; a cost of `-1` or `0.001` inside "รายละเอียดเพิ่มเติม" while it is closed → it opens and focus lands on the cost (MT-R4); stand-in `POST /api/maintenance-tickets` 400 `{ error: "Vendor not found or inactive", fieldErrors: { vendorId: "vendorNotFound" } }` → under the vendor; stand-in 409 `{ code: "MAINTENANCE_OPEN_RECORD_EXISTS", error: "…" }` → today's Notice with its link and the toast (MT-R8, open issue 11).
    - The repair dialogs (`/th/maintenance/<id>`): complete — the return date's picker starts at the reported date, a typed earlier date → `repairRecord.returnDateBeforeReported`; cancel — a reason over 1,000 characters → `tooLong`; edit — its errors; a stand-in refusal goes back to the dialog that sent it (MT-R6); a dialog closed with errors opens again without them.
  - **The addendum** (Tasks 31a–31e):
    - Checkin (31a): from the review, stand-in `POST /api/assets/<id>/checkin` 400 `{ error: "Invalid return condition for check-in", code: "ASSET_CONDITION_NOT_SELECTABLE", fieldErrors: { conditionAfter: "invalidReturnCondition" } }` → the review closes, focus on the return condition, "สภาพตอนรับคืนไม่ถูกต้อง" under it; again with `{ error: "Invalid return status for check-in", fieldErrors: { nextStatusId: "invalidReturnStatus" } }` → under the next status, "สถานะตอนรับคืนไม่ถูกต้อง". (The route's own body is Task 31a's test; no request reaches the server.)
    - zod's `.int()` (31b): stand-in `POST /api/audit-rounds/preview` 400 `{ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { sampleRate: "invalidNumber" } }` → "กรุณากรอกเป็นตัวเลข" under the sample rate (the server's map is Task 31b's test).
    - The money rule (31c): 12.345 in the asset form's price (create) and its purchase document total, the batch's price, the disposal request's sale value, the execution's actual sale value and the repair record's cost (inside "รายละเอียดเพิ่มเติม", which opens) → "กรอกทศนิยมได้ไม่เกิน 2 ตำแหน่ง" under each, focus on the first; 12.50 and 12.5 pass that rule; −1 still reads its range message.
    - The batch's gates (31d): at 2 rows each remove button (cards at 375, table at 1440) is focusable, looks disabled, and its accessible description is the row count line "รายการตอนนี้ 2 รายการ · ชุดหนึ่งมีได้ 2–100 รายการ"; Enter or a click removes nothing; after pasting 100 serials, add row the same and nothing is added; two rows with one serial: check duplicates the same, and no request leaves.
    - The scan check (31e): Step 7.
- [ ] **Step 7: The shared parts.**
  - **The scan check** (Task 19, U-R11): at 1440 (the aside) and at 375 (the sheet), light and dark. Empty the location through the console (the select hides its clear button) and save: the error under the location; at 1440 the aside scrolls its own body to it; at 375 the sheet stays open and `document.activeElement` is inside it. With a required photo missing: save `aria-disabled`, its description the photo Notice; with the note-and-photo section closed, pressing save opens it, the picker shows, and nothing is sent (Task 31e). The scan stand-in (Step 5) answers any scan request that goes out: record what shows (today's handling; offline replays as today, spec §3). Before leaving the page, the offline bar shows nothing queued.
  - **One announcement per submit** (F-R6) on two plan-2 forms, in the accessibility tree (NVDA itself is a person's check, Step 8): the focused field's name and description hold the error, and no other region announces it.
  - **Forced colors and reduced motion** on two plan-2 forms (one page, one dialog): the error text, the field border and the gate's look show; focus scrolls without animation (F-R5).
- [ ] **Step 8: Findings.** Write `task-32-findings.md` with these parts (Task 33 copies them):
  - **Fixes made:** commit and one line each, or "none".
  - **Checked and passed:** what, where, in which themes and widths, with results; the verify numbers of Step 1; the built CSS of Step 2; the counts of Step 3; every non-GET of Step 5 with "fulfilled <status>" or "aborted" (none continued).
  - **Differences from Task 0's before evidence:** each mapped to a decision of this plan (any other is a finding to fix).
  - **Found but not caused by this plan.**
  - **For the user:** the open issues as answered on 2026-10-18, on screenshots: 2 (the nine new messages under real fields: `after/*-empty-*`, the asset save's `duplicateCheckPending`, the batch's row duplicate and row limits, the finding close and batch review reasons, the disposal batch's assets line, bulk execution's confirmation, the repair return date, the money sentence), 3 and 14 (a money field with three decimals in the asset form and in the repair record: both refused with the same sentence), 7 (the scan photo gate, its section opened by save), 11 (the open repair record's Notice and toast, for UAT), 16 (the batch's remove buttons at 2 rows with the row count line); anything else to decide.
  - **Still needs a person:** NVDA on one plan-2 page form and one review dialog (the hand-back read once), real phones (iOS Safari and Android Chrome: the scan check sheet, focus clear of the keyboard and the save bar), an English pass of the nine new messages.
- [ ] **Step 9: Clean up.** Stop your server, remove your launch configuration and every helper you put under the repo. In your browser context: `indexedDB.deleteDatabase("asset-system-audit-offline")` and remove every `localStorage` key that starts with `audit-offline-scan:` (nothing should be there; if something was, it is a finding). `git status --short` shows only the untracked folders and files of the Global Constraints. No commit in this task unless Step 8 lists fixes (each its own task).

---

## The docs (Task 33)

### Task 33: V track plan 2 in the handoff and the changelog (`DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md`, `tests/v-track-docs.test.ts`)

Spec §9 ("a handoff section and a changelog entry per plan"); the shape of plan 1's Task 31. The record of this plan: the handoff section before `## Open Go-Live Decisions`, after plan 1's (H2); the Thai changelog entry first under the newest date (C1 when `<today>` is 2026-10-18, else C1b with a new date heading); the handoff's header date (H1, only on a later date). Plan 1's record test moves its "first under the newest date" assertion (P1), as plan 1's P1 moved Dark Mode's, and the same file gains this plan's record test (one test).

**Files:**
- Modify: `DEVELOPER_HANDOFF.md` (`i/lf w/crlf`), `docs/99_CHANGELOG.md` (`i/lf w/crlf`), `tests/v-track-docs.test.ts` (`i/lf w/crlf`; one test appended, one assertion of plan 1's test rewritten).
- Read: `.superpowers/sdd/v-track-plan2/task-32-findings.md` (Task 32, git-ignored). The user's answers to this plan's open issues (2026-10-18, every recommendation) are already written into H2 and C1 below. **If the findings file is missing, stop and report before editing anything:** never write the dev-app check text without it.

**Interfaces:** produces `## V Track Plan 2 (<today>)` with a `- Dev-app check: checked (Task 32) on …` bullet, and `### ข้อความผิดพลาดใต้ช่องกรอก รอบ 2 (งาน V plan 2)` with a `- **ตรวจบนแอป:** (Task 32) ตรวจบน …` bullet; Task 34 inserts the verify line directly above each (both prefixes occur once in their file; checked in the rehearsal).

**Changes at the end of Task 32** (the files are as `e1caa29` left them; no task of this plan edits them before this one):

| Id | Line | What changes | Rule |
|---|---|---|---|
| H1 | `DEVELOPER_HANDOFF.md:3` | `> Last updated: 2026-10-18` → `> Last updated: <today>`, only if `<today>` is not 2026-10-18 | — |
| H2 | `DEVELOPER_HANDOFF.md:1098` | this plan's section before `## Open Go-Live Decisions` (after plan 1's section) | spec §9 |
| C1 | `docs/99_CHANGELOG.md:9` | the entry above plan 1's entry under `## 2026-10-18` (C1b instead when `<today>` is another date) | spec §9, `docs/19_THAI_GLOSSARY.md` |
| P1 | `tests/v-track-docs.test.ts:24` | plan 1's entry is no longer the first under the newest date: the assertion finds it under 2026-10-18 | plan 1 Task 31 P1 |
| T | `tests/v-track-docs.test.ts` (end) | this plan's record test | spec §9 |

**(H2)** The plan's own section. Replace (the line occurs once in the file):

```
## Open Go-Live Decisions
```

with

```
## V Track Plan 2 (<today>)

- Branch `feat/v-track-2` in the main checkout (from `master` `e1caa29`: V track plan 1 merged and pushed, not deployed). Spec `docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md` (the user's decisions U1–U9) · plan `docs/superpowers/plans/2026-10-18-v-track-plan2.md` (plan 2 of the track: the asset, asset operation, audit, disposal and maintenance forms, spec §5 #1–#33, 33 forms in 28 files).
- No migration, database write, schema or dependency change. No server rule was added (spec §6.3): Tasks 20, 27 and 31a only add `fieldErrors` to refusals that existed, and Task 31b changes only how one zod issue reads; status codes and messages are unchanged. Messages (through `scripts/messages-edit.mjs`): +9 keys (`asset.duplicateCheckPending`, `asset.batchRowDuplicate`, `auditFinding.closeNeedsEvidence`, `auditFinding.batchNeedsSelection`, `disposalPage.batchNeedsAssets`, `disposalPage.bulkExecutionPermanentConfirmationRequired`, `repairRecord.returnDateBeforeReported`, `common.validation.tooManyDecimals`, `asset.batchRowLimits`) and −8 (`asset.licenseSeatUsageInvalid`, `asset.customFieldRequired`, `asset.duplicateWarning`, `checkout.reviewIncomplete`, `checkin.selectCheckoutRequired`, `checkin.selectReturnAndReceiver`, `checkin.completeRequiredFields`, `transfer.destinationRequired`): 4092 → 4093 keys.
- **The server (Tasks 20, 27, 31a, 31b):** the disposal execution's evidence refusals `DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED` and `DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED` keep their `code` and add `fieldErrors` under `evidenceExceptionReason` (`required`, `tooShort` or `tooLong`) and `evidenceExceptionAcknowledged` (`required`) (`getDisposalEvidenceFieldErrors`, `src/lib/disposal-evidence-exception.ts`). A bulk execution preview or commit stays a 200 and adds `fieldErrors` when a blocked row's code points at a field of the dialog (`sharedRecipientName: "recipientRequired"` and the exception's two fields; `getDisposalBulkExecutionFieldErrors`, `src/lib/disposal-bulk-execution.ts`). A repair record's reporter refusals (`reportedById`: `required`, `reporterNotFound`), its vendor refusal on create, complete and edit (`vendorId`: `vendorNotFound`) and the PM plan edit's vendor refusal (`vendorId`: `pmVendorNotFound`) name their field, through the new `fieldErrors` of `MaintenanceApiError` and plan 1's `FieldRefusalError`; before, they reached the person as the generic "เกิดข้อผิดพลาด". Checkin's refusals of the return condition and the return status keep their message and add `fieldErrors` (`conditionAfter: "invalidReturnCondition"`, `nextStatusId: "invalidReturnStatus"`), which the checkin form shows under its selects after closing its review (Task 31a). zod's `.int()` refusing a fraction reads `invalidNumber` instead of `required` (`src/lib/field-errors.ts`, Task 31b).
- **Shared additions (Tasks 8, 21, 28, 31c):** `waitForDialogToClose(frames = 60)` in `src/lib/field-focus.ts` (a form refused while its own review dialog is open closes the dialog before the field takes focus: `reveal: leaveReview`); `step(value, size)` in `src/lib/validation-rules.ts` (a whole-number field's `step` restated, `invalidNumber`) and `decimals(value, places)` beside it (a money field's two decimal places, with its own code `tooManyDecimals` and sentence `common.validation.tooManyDecimals`, Task 31c); `NON_VALIDATION_TOASTS` in `tests/validation-guards.test.ts` (the toasts outside a catch that are not about a field, with an exact count, a reason and a ruling each: the upload results of the disposal request and batch and of the repair record form and dialogs).
- **The forms (Tasks 1–19, 21–26, 29–31, 31c–31e):** the asset form, the batch, the register's bulk update, component install and removal, status correction, the import wizard and label print; checkout, checkin, transfer, bulk move and the transaction cancel dialog; the audit round form, round cancel, mark not found, component missing, the finding dialogs (decision, action plan, close), batch review and the scan check; the disposal request, batch, decision, execution, bulk approval and bulk execution; the PM plan form, the repair record form and its complete, cancel and edit dialogs. Each has `noValidate` straight after `onSubmit`, a module-level `validate()` that restates every constraint its controls carry, errors under the field (a group: one error), focus on the first wrong field, and the server's `fieldErrors` on the same fields; a refusal that names no field keeps today's message. 26 validation toasts went (the asset form's 12, checkout's 4, checkin's 4, the batch's 2, component install, transfer, bulk move and round cancel one each); the batch's duplicate-check result moved into its Notice. Every money field (the asset form's price and document total, the batch's price, the disposal request's, batch's, decision's and execution's values, the repair cost) refuses more than two decimal places with one sentence (Task 31c).
- **Review dialogs and steps (spec §4.2):** checkout, checkin and transfer close their review dialog before the refused field takes focus; a refusal goes back to the batch's edit step, component install's details step, the disposal batch's edit step and bulk execution's review step (also when no row of a preview can run because of the shared values). The audit scan check keeps focus inside its sheet on a phone; offline-queued scans replay as before.
- **Date pairs (spec §7.4, client rules only):** the warranty end not before its start in the asset form (on edit only when one of the two dates changed) and in the batch; the audit round's end not before its start (the pickers limit each other); the label print queue's created-from/to (`min`/`max`); a repair's completion date not before its reported date (`min` and `repairRecord.returnDateBeforeReported`).
- **Gates (spec §4.4):** content gates became errors on submit with the button enabled: status correction's 5 characters, bulk update's location or custodian, the disposal batch's requester and reason, the decision's rejection reason, the execution's historical reason and acknowledgement, bulk execution's shared values and its permanent confirmation. Prerequisites stay gated, `aria-disabled` with a visible reason tied by `aria-describedby`: the asset save on a protected status change or while the duplicate check runs, the import with no ready row, the cancel dialog's blockers, the finding close without evidence, batch review with nothing selected, the scan check's missing photo (pressing the waiting save also opens the note-and-photo section that holds the picker, Task 31e), the disposal batch with fewer than 2 assets, the execution without evidence, the two bulk dialogs with nothing eligible, and the batch's add row at 100 rows, remove row at 2 and check duplicates while the rows hold a duplicate (the row count line names the 2–100 limits, `asset.batchRowLimits`, Task 31d).
- **Spec §5's bugs in these forms:** checkin's return date, bulk move's destination, and the disposal request's asset and requester are checked. The 14 asterisk-only selects show their error (`SELECT_STAR_ONLY` 14 → 0); the license's total seats lost their asterisk (spec §11 call 8).
- **Guards and pins:** `V_FORMS` 15 → 43 files (every `V_SCOPE` file but the settings form, plan 3); FMG `STAR_ONLY` empty; checkin's `required` floor 4 → 5 in `CONSTRAINT_FLOORS`; `NON_VALIDATION_TOASTS` 4 rows; no `EXEMPT`, `V_SCOPE` or `NOT_IN_SCOPE` row added. `<form … noValidate>` in `src` 17 → 46; toasts outside a catch in `src` 61 in 19 files → 34 in 11. The pins that encoded the old behaviour were rewritten in the commit that changed it.
- **Tests:** new files `tests/v-track2-a.test.ts` (7), `tests/v-track2-o.test.ts` (6), `tests/v-track2-u.test.ts` (6), `tests/v-track2-d.test.ts` (7), `tests/v-track2-m.test.ts` (5), `tests/v-track2-x.test.ts` (5, the addendum); one test added to `tests/v-track-docs.test.ts`; `validateHistoricalException` and its test deleted (`src/lib/disposal-bulk-execution-ui.ts`, `tests/disposal-bulk-execution-ui-state.test.ts`); 2256 → <N> tests.
- **Rulings of this plan:** R1 (the earlier rulings), R2 area A (A-R*), R3 area O (O-R*), R4 area U (U-R*), R5 area D (D-R*), R6 area M (MT-R*), R7 assembly (P-R1–P-R10), R8 the addendum (X-R1–X-R5).
- **The user's answers to the open issues:** answered on 2026-10-18 with "ตามที่แนะนำ", every recommendation of the plan's "Open issues": 1 the protected-status change stays a gate; 2 the seven new messages stay as written (Tasks 31c and 31d add `common.validation.tooManyDecimals` and `asset.batchRowLimits` in the user's words); 3 one money rule: every money field refuses more than two decimal places (Task 31c); 4 the eight messages that lost their reader are deleted; 5 checkin's two refusals carry `fieldErrors` (Task 31a); 6 the photo and evidence upload refusals stay toasts; 7 the scan check's waiting save opens its note-and-photo section (Task 31e); 8 bulk execution goes back to the shared values only when every row is blocked by them; 9 bulk execution's permanent confirmation is a field; 10 the repair edit's reported date gets no pair rule; 11 the open repair record keeps its Notice and its toast, to be decided in UAT; 12 zod's `.int()` reads as `invalidNumber` (Task 31b), and one shared whole-number rule goes to the final plan; 13 the three forms with no rule keep an empty `validate()`; 14 the money rule has its own sentence, "กรอกทศนิยมได้ไม่เกิน 2 ตำแหน่ง" (Task 31c); 15 the purchase document number's duplicate stays a toast, and the bug of a second asset after a failed attachment is queued as a separate task after this plan merges; 16 the batch's add row, remove row and check duplicates gates say why beside the row count (Task 31d), and the print queue's two print buttons go to the final plan's sweep.
- **Not taken:** a server rule for the warranty or repair date pairs (spec §11 call 6), `react-hook-form`, a `NO_RULE` allowance for the three forms with nothing to check (an empty `validate()` with a comment, U-R6), `aria-invalid` on a `<button>`, an alert role per field error.
- **Handed on:** V track plan 3 (the settings form and the prefix editor: `settings.<key>`, `reveal` for the tabs), then the final plan (DESIGN.md's form-error rule, `docs/14_UI_UX_DESIGN_SYSTEM.md`, `.impeccable/design.json`); then the E2E suite and the one deploy (wiki 27).
- Dev-app check: checked (Task 32) on <from task-findings>
- Before/after screenshots: `.superpowers/sdd/screenshots/v-track-plan2/before/` and `after/` (git-ignored, on the development machine only).
- Still open, for a person before the one deploy: <from task-findings>, together with the open checks of the sections above.
- Next: merge this branch; then V track plan 3 (the settings form), the final plan, the E2E suite and the one deploy (wiki 27).

## Open Go-Live Decisions
```

**(C1)** The entry, first under `## 2026-10-18` (only when `<today>` is 2026-10-18). Replace (the line occurs once in the file):

```
### ข้อความผิดพลาดใต้ช่องกรอก รอบ 1 (งาน V plan 1)
```

with

```
### ข้อความผิดพลาดใต้ช่องกรอก รอบ 2 (งาน V plan 2)

Branch `feat/v-track-2` (จาก `master` `e1caa29`) · design `docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md` · plan `docs/superpowers/plans/2026-10-18-v-track-plan2.md` (plan ที่ 2 ของงาน V)

- **ขอบเขต:** ฟอร์มทรัพย์สิน ธุรกรรมทรัพย์สิน ตรวจนับ ตัดจำหน่าย และซ่อมบำรุง 33 ฟอร์มใน 28 ไฟล์ (spec ข้อ 5 #1–#33) · ไม่แตะฐานข้อมูล ไม่มี migration ไม่เพิ่ม dependency ไม่เพิ่มกฎใหม่ฝั่ง server · ข้อความ: เพิ่ม 9 คีย์ ลบ 8 คีย์ ผ่าน `scripts/messages-edit.mjs` (4092 → 4093)
- **server:** การบันทึกตัดจำหน่ายที่ถูกปฏิเสธเพราะเหตุผลของข้อยกเว้นหลักฐานหรือการยืนยันรับทราบ (`DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED` และ `DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED`) บอกช่องของตัวเองใน `fieldErrors` · บันทึกตัดจำหน่ายหลายรายการ (ทั้งตัวอย่างและการบันทึก) บอกช่องของ dialog เมื่อแถวที่ถูกกันชี้ไปที่ผู้รับร่วมหรือช่องของข้อยกเว้น · ผู้บันทึกการซ่อมและผู้ขาย (ตอนเพิ่ม ปิดงาน และแก้ไข) และผู้ขายของแผน PM ตอนแก้ไข บอกช่องของตัวเองแทน "เกิดข้อผิดพลาด" · การรับคืนที่ถูกปฏิเสธเพราะสภาพหรือสถานะตอนรับคืนบอกช่องของตัวเอง · ตัวเลขที่ต้องเป็นจำนวนเต็มแต่กรอกทศนิยมมา แสดง "กรุณากรอกเป็นตัวเลข" แทน "กรุณาระบุข้อมูลนี้" · status code และข้อความเดิมไม่เปลี่ยน
- **หน้าจอ:** ฟอร์มทรัพย์สิน เพิ่มหลายรายการ อัปเดตหลายรายการในทะเบียน ติดตั้งและถอดส่วนควบ แก้ไขสถานะ ตัวช่วยนำเข้า พิมพ์ป้าย · ส่งมอบ รับคืน โอนย้าย ย้ายที่ตั้งหลายรายการ ยกเลิกธุรกรรม · รอบตรวจนับ ยกเลิกรอบ ไม่พบทรัพย์สิน ส่วนควบหาย dialog ของรายการไม่ตรง (พิจารณา แผนแก้ไข ปิดรายการ) พิจารณาหลายรายการ และช่องตรวจของหน้าสแกน · คำขอตัดจำหน่าย ชุดคำขอ การพิจารณา การบันทึกตัดจำหน่าย อนุมัติหลายรายการ บันทึกตัดจำหน่ายหลายรายการ · แผน PM บันทึกการซ่อม และ dialog ปิดงาน ยกเลิก แก้ไข ของการซ่อม: แสดงข้อความผิดพลาดใต้ช่องกรอก ไม่ใช้ toast แจ้งการกรอกผิด (เอาออก 26 จุด) ไม่มีกล่องเตือนของเบราว์เซอร์ · กดบันทึกแล้วไปที่ช่องแรกที่ผิด · server ปฏิเสธช่องไหนก็แสดงใต้ช่องนั้น ข้อความที่ไม่ใช่ของช่องใดยังแสดงแบบเดิม · ช่องจำนวนเงินทุกช่องรับทศนิยมได้ไม่เกิน 2 ตำแหน่ง และแจ้งใต้ช่องว่า "กรอกทศนิยมได้ไม่เกิน 2 ตำแหน่ง"
- **ขั้นตรวจสอบและหลายขั้น:** ส่งมอบ รับคืน และโอนย้าย ปิดหน้าต่างตรวจสอบก่อนไปที่ช่องที่ server ปฏิเสธ · เพิ่มหลายรายการ ติดตั้งส่วนควบ ชุดคำขอตัดจำหน่าย และบันทึกตัดจำหน่ายหลายรายการ กลับไปขั้นที่มีช่องนั้น · ช่องตรวจของหน้าสแกนบนมือถือเก็บโฟกัสไว้ในแผ่นที่เปิดอยู่ · การสแกนที่ค้างในคิวออฟไลน์ส่งเหมือนเดิม
- **คู่วันที่ (ตรวจฝั่งหน้าจอเท่านั้น):** วันหมดประกันต้องไม่ก่อนวันเริ่มประกัน ในฟอร์มทรัพย์สิน (ตอนแก้ไขตรวจเฉพาะเมื่อเปลี่ยนวันใดวันหนึ่ง) และในเพิ่มหลายรายการ · วันสิ้นสุดรอบตรวจนับต้องไม่ก่อนวันเริ่ม · ตัวกรองวันที่สร้างของคิวพิมพ์ป้าย · วันที่ซ่อมเสร็จต้องไม่ก่อนวันที่แจ้งซ่อม
- **ปุ่มที่เคยปิด:** กฎของข้อมูลแจ้งตอนกดแทนการปิดปุ่ม (เหตุผลแก้ไขสถานะ 5 ตัวอักษร ที่ตั้งหรือผู้ถือครองของการอัปเดตหลายรายการ ผู้ขอและเหตุผลของชุดคำขอ เหตุผลเมื่อไม่อนุมัติ เหตุผลและการยืนยันของข้อยกเว้นหลักฐาน ค่าร่วมและช่องยืนยันของบันทึกตัดจำหน่ายหลายรายการ) · สิ่งที่ต้องมีก่อนยังรออยู่ แต่ปุ่มกดโฟกัสได้และบอกเหตุผลที่เห็นบนหน้าจอ (บันทึกทรัพย์สินระหว่างตรวจรหัสซ้ำหรือเมื่อเปลี่ยนสถานะที่ป้องกันไว้ นำเข้าเมื่อไม่มีแถวพร้อม ยกเลิกธุรกรรมที่มีรายการกันไว้ ปิดรายการไม่ตรงที่ยังไม่มีหลักฐาน พิจารณาหลายรายการที่ยังไม่ได้เลือก รูปที่ต้องถ่ายของการสแกน (กดบันทึกแล้วเปิดส่วนหมายเหตุ / รูปให้) ชุดคำขอที่มีทรัพย์สินไม่ถึง 2 รายการ บันทึกตัดจำหน่ายที่ยังไม่มีหลักฐาน dialog หลายรายการที่ไม่มีรายการที่ทำได้ และปุ่มเพิ่มแถว ลบแถว และตรวจสอบข้อมูลซ้ำของการเพิ่มหลายรายการ ซึ่งบอกไว้ข้างจำนวนรายการว่าชุดหนึ่งมีได้ 2–100 รายการ)
- **บั๊กที่แก้:** วันที่รับคืน ปลายทางของการย้ายหลายรายการ ทรัพย์สินและผู้ขอของคำขอตัดจำหน่าย ถูกตรวจแล้ว · ช่องเลือกที่มีแต่ดอกจัน 14 ช่องแสดงข้อความผิดพลาดแล้ว (`SELECT_STAR_ONLY` 14 → 0) · จำนวน License ทั้งหมดไม่มีดอกจันแล้ว
- **ชิ้นส่วนกลาง:** `waitForDialogToClose` (`src/lib/field-focus.ts`) · `step()` และ `decimals()` (`src/lib/validation-rules.ts`) · `NON_VALIDATION_TOASTS` ใน `tests/validation-guards.test.ts` (toast ผลการอัปโหลดหลังบันทึกสำเร็จ 4 ไฟล์ พร้อมเหตุผล)
- **test:** ไฟล์ใหม่ `tests/v-track2-a.test.ts` (7), `tests/v-track2-o.test.ts` (6), `tests/v-track2-u.test.ts` (6), `tests/v-track2-d.test.ts` (7), `tests/v-track2-m.test.ts` (5), `tests/v-track2-x.test.ts` (5) · เพิ่ม 1 test ใน `tests/v-track-docs.test.ts` · ลบ test ของ `validateHistoricalException` · `V_FORMS` 15 → 43 ไฟล์ (เหลือฟอร์มตั้งค่าระบบใน plan 3) · test 2256 → <N>
- **deploy:** ไม่ deploy · deploy ครั้งเดียวหลังงาน V ครบทุก plan และชุด E2E
- **ตรวจบนแอป:** (Task 32) ตรวจบน <จาก task-findings>
- คำตอบของผู้ใช้ต่อข้อที่ค้างของ plan: ผู้ใช้ตอบเมื่อ 2026-10-18 ว่า "ตามที่แนะนำ" ทุกข้อ: 1 การเปลี่ยนสถานะที่ป้องกันไว้ยังเป็นเงื่อนไขก่อนบันทึก · 2 ข้อความใหม่ 7 ข้อความใช้ตามที่เขียน (Task 31c และ 31d เพิ่ม `common.validation.tooManyDecimals` และ `asset.batchRowLimits` ตามคำของผู้ใช้) · 3 ช่องจำนวนเงินทุกช่องใช้กฎเดียว ทศนิยมไม่เกิน 2 ตำแหน่ง (Task 31c) · 4 ลบ 8 ข้อความที่ไม่มีที่ใช้แล้ว · 5 การปฏิเสธ 2 กรณีของการรับคืนบอกช่องใน `fieldErrors` (Task 31a) · 6 การปฏิเสธไฟล์รูปและหลักฐานยังแจ้งด้วย toast · 7 กดบันทึกที่รอรูปของการสแกนแล้วเปิดส่วนหมายเหตุ / รูป (Task 31e) · 8 บันทึกตัดจำหน่ายหลายรายการกลับไปที่ค่าร่วมเมื่อทุกแถวถูกกันเพราะค่าร่วมเท่านั้น · 9 ช่องยืนยันการตัดจำหน่ายถาวรเป็นช่องกรอก ไม่ใช่การปิดปุ่ม · 10 วันที่แจ้งซ่อมใน dialog แก้ไขไม่มีกฎคู่วันที่ · 11 บันทึกการซ่อมที่ยังเปิดอยู่แสดงทั้ง Notice และ toast ตัดสินตอน UAT · 12 `.int()` ของ zod อ่านเป็น `invalidNumber` (Task 31b) กฎจำนวนเต็มร่วมไปทำใน plan สุดท้าย · 13 ฟอร์มที่ไม่มีกฎ 3 ฟอร์มใช้ `validate()` ว่างพร้อมคำอธิบาย · 14 กฎจำนวนเงินมีข้อความของตัวเอง "กรอกทศนิยมได้ไม่เกิน 2 ตำแหน่ง" (Task 31c) · 15 เลขที่เอกสารจัดซื้อซ้ำยังแจ้งด้วย toast ส่วนบั๊กที่บันทึกทรัพย์สินซ้ำได้หลังแนบไฟล์ไม่สำเร็จ จัดคิวเป็นงานแยกหลัง merge plan นี้ · 16 ปุ่มเพิ่มแถว ลบแถว และตรวจสอบข้อมูลซ้ำของการเพิ่มหลายรายการบอกเหตุผลไว้ข้างจำนวนรายการ (Task 31d) ส่วนปุ่มพิมพ์ 2 ปุ่มของคิวพิมพ์ป้ายไปทำใน plan สุดท้าย
- ภาพก่อน/หลัง: `.superpowers/sdd/screenshots/v-track-plan2/before/` และ `after/` (git ignore อยู่บนเครื่องพัฒนา)
- ต่อไป: merge แล้วทำงาน V plan 3 (ฟอร์มตั้งค่าระบบ) และ plan สุดท้าย แล้วชุด E2E และ deploy ครั้งเดียว

### ข้อความผิดพลาดใต้ช่องกรอก รอบ 1 (งาน V plan 1)
```

**(C1b, only if `<today>` is not 2026-10-18, instead of C1)** Replace the line `## 2026-10-18` (it occurs once) with: `## <today>`, a blank line, C1's new text without its last line (the entry from `### ข้อความผิดพลาดใต้ช่องกรอก รอบ 2 (งาน V plan 2)` to its `- ต่อไป:` bullet, ending with that bullet's line), a blank line, `---`, a blank line and `## 2026-10-18`. The result reads like the file's other dates: `---` with a blank line on each side between two dates.

- [ ] **Step 1: The failing test.** Append to `tests/v-track-docs.test.ts` exactly this block (the first line of the block is the blank line after the file's last line `})`). The file is CRLF: append with the Edit tool (old string: the file's last three lines, `    assert.deepEqual([path, text.match(markers) ?? []], [path, []])`, `  }`, `})`, which occur once before this step; new string: the same three lines followed by the block), so the appended lines are CRLF too:

```ts

// V track plan 2, the docs (task 33): the handoff section and the Thai changelog entry record plan 2 after plan 1's, with
// every marker filled; two names the section gives are checked against the code that holds them.
test("the handoff and the changelog record V track plan 2 in place, with every marker filled (v-track plan 2 task 33)", () => {
  const handoff = read("DEVELOPER_HANDOFF.md")
  const section = handoff.indexOf("\n## V Track Plan 2 (")
  assert.ok(section > handoff.indexOf("\n## V Track Plan 1 ("), "the V track plan 2 section follows the plan 1 one")
  assert.ok(section < handoff.indexOf("\n## Open Go-Live Decisions"), "and comes before Open Go-Live Decisions")
  const record = handoff.slice(section, handoff.indexOf("\n## Open Go-Live Decisions"))
  assert.match(record, /\n- Dev-app check: checked \(Task 32\) on \S/, "the dev-app check bullet")
  assert.ok(record.includes("`waitForDialogToClose(frames = 60)`"), "the review dialog hand-back")
  assert.match(read("src/lib/field-focus.ts"), /\nexport function waitForDialogToClose\(frames = 60\): Promise<void> \{\n/)
  assert.ok(record.includes("(`SELECT_STAR_ONLY` 14 → 0)"), "the asterisk-only selects")
  assert.match(read("tests/validation-guards.test.ts"), /\nconst SELECT_STAR_ONLY: Readonly<Record<string, number>> = \{\n\}\n/)
  const changelog = read("docs/99_CHANGELOG.md")
  const newest = changelog.indexOf("\n## ")
  const entry = changelog.indexOf("\n### ข้อความผิดพลาดใต้ช่องกรอก รอบ 2 (งาน V plan 2)\n")
  assert.ok(newest !== -1 && entry !== -1, "the newest date and the V track plan 2 entry")
  assert.equal(changelog.indexOf("\n### ", newest), entry, "the plan 2 entry is the first one under the newest date")
  assert.ok(entry < changelog.indexOf("\n### ข้อความผิดพลาดใต้ช่องกรอก รอบ 1 (งาน V plan 1)\n"), "above the plan 1 entry")
  assert.match(changelog.slice(entry, changelog.indexOf("\n### ", entry + 1)), /\n- \*\*ตรวจบนแอป:\*\* \(Task 32\) ตรวจบน \S/, "the dev-app check bullet")
  // Every marker of the template is filled; a failure lists the path and the markers left.
  const markers = /<today>|<N>|<from task-findings>|<จาก task-findings>|<from open-issues>|<จาก open-issues>/g
  for (const [path, text] of [["DEVELOPER_HANDOFF.md", handoff], ["docs/99_CHANGELOG.md", changelog]]) {
    assert.deepEqual([path, text.match(markers) ?? []], [path, []])
  }
})
```

- [ ] **Step 2: Watch it fail.** `node --test tests/v-track-docs.test.ts`. Expected: 2 tests, 1 fail: "the handoff and the changelog record V track plan 2 in place, with every marker filled (v-track plan 2 task 33)" ("the V track plan 2 section follows the plan 1 one").
- [ ] **Step 3: Implement.**
  - H2 (and H1 on a later date) in `DEVELOPER_HANDOFF.md`; then C1 in `docs/99_CHANGELOG.md` if `<today>` is 2026-10-18 (the newest date at `e1caa29`), otherwise C1b (one of the two, never both). Exact-string edits with the Edit tool, which keeps the files' CRLF.
  - Fill the markers:
    - `<today>`: `YYYY-MM-DD`.
    - `<N>` (two places): the test count after this commit, Task 32's verify count + 1 for this task's test: **2292** when Task 32 made no fix (the addendum rehearsal: 2291 before this task); the same number Task 34's verify line records.
    - `<from task-findings>` (two places in the handoff) with the findings file in English, in the shape of plan 1's "Dev-app check" bullet (`DEVELOPER_HANDOFF.md`, the V Track Plan 1 section): after `checked (Task 32) on `, the server, port and commit, the build, what passed with numbers, every non-GET request of Task 32 Step 5 with "fulfilled" or "aborted" (none reached the server), the differences from Task 0 and their decisions, the fixes or "no fixes"; in the "Still open" bullet the "Still needs a person" and "For the user" parts as sub-bullets (two spaces, `- `), as plan 1's section does.
    - `<จาก task-findings>` with the same in Thai after `(Task 32) ตรวจบน `, glossary words (`docs/19_THAI_GLOSSARY.md`), as plan 1's entry's "ตรวจบนแอป" bullet does.
    - The user's answers (open issues 1–16, 2026-10-18) are already written in both blocks: the bullet "The user's answers to the open issues" and "คำตอบของผู้ใช้ต่อข้อที่ค้างของ plan"; no marker is left for them. If the controller hands over a different answer given later, change that issue's sentence in both.
  - Never invent findings or answers: if the findings file does not exist, stop (the dry run had no Task 32 and wrote one placeholder sentence in each marker; the marker test passes either way, so the test does not catch this).
  - After Step 3 and before Step 4, `node --test tests/v-track-docs.test.ts` fails exactly one test: plan 1's, with "the entry is the first one under the newest date".
- [ ] **Step 4: Pin edit (P1).** `tests/v-track-docs.test.ts:24`, in plan 1's record test. Replace (it occurs once: the appended test's message says "the plan 2 entry …"):

```
  assert.equal(changelog.indexOf("\n### ", newest), entry, "the entry is the first one under the newest date")
```

  with

```
  assert.equal(changelog.lastIndexOf("\n## ", entry), changelog.indexOf("\n## 2026-10-18\n"), "the entry sits under 2026-10-18 (the V track plan 2 entry went above it later, v-track plan 2 task 33)")
```

  Plan 1's `newest` constant stays in use (the `assert.ok` above it). C1 and C1b both keep the line `## 2026-10-18`, so the pin holds on either date; `tests/dark-mode-docs.test.ts` and `tests/phase2d-docs.test.ts` look for `\n## 2026-10-17\n` and do not change.
- [ ] **Step 5: Verify.**
  - `node --test tests/v-track-docs.test.ts tests/dark-mode-docs.test.ts tests/phase2d-docs.test.ts tests/audit-round-cancellation.test.ts` → 18 tests, 0 fail (the last reads both files for the round cancellation words, which stay).
  - `grep -n "<today>\|<N>\|<from \|<จาก " DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md` → nothing.
  - `node <tools>/eol.mjs DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md tests/v-track-docs.test.ts` → equal numbers for each (all three stay CRLF): `59 59` for the test file; the two docs at least `1136 1136` and `1941 1941` (C1) or `1136 1136` and `1945 1945` (C1b) — more when the findings add sub-bullets.
  - `git diff --numstat` → only the three files: `28 1 tests/v-track-docs.test.ts`; C1: the handoff at least `22 0`, the changelog at least `19 0`; C1b: the handoff at least `23 1`, the changelog at least `23 0` (more lines only from the findings' sub-bullets).
  - `npm test` (**2292 tests, 2291 pass, 0 fail, 1 skipped**; +1); `npx tsc --noEmit`; `npm run lint` (0 errors, 146 warnings, all under `.agents/`).
  - Rehearsed (2026-10-18) on the dry run's Task 31 result (`v2-dry` `37968225`) with one-sentence placeholder findings: Step 2 failed as written; after Step 3 the four docs test files gave 18 tests, 1 fail (plan 1's, as written); after Step 4, 18 tests, 0 fail. C1 (`<today>` 2026-10-18): eol `1136 1136`, `1941 1941`, `59 59`; numstat `22 0`, `19 0`, `28 1`; `npm test` 2287 / 2286 / 0 / 1; tsc clean; lint 0 errors, 146 warnings; commit `c4146a35`. C1b (`<today>` 2026-10-19, H1 too): eol `1136 1136`, `1945 1945`, `59 59`; numstat `23 1`, `23 0`, `28 1`; the four docs test files 18 tests, 0 fail (working tree only, then restored). Rehearsed again (2026-10-18) on the addendum (`v2-add` after Task 31e, `fbda71b9`) with the blocks above (the answers written out) and the same placeholder findings: Step 2 as written; after Step 3, 18 tests, 1 fail (plan 1's); after Step 4, 18 tests, 0 fail. C1: eol `1136 1136`, `1941 1941`, `59 59`; numstat `22 0`, `19 0`, `28 1` (the answers lengthen lines and add none); `npm test` 2292 / 2291 / 0 / 1; tsc clean; lint 0 errors, 146 warnings; commit `ae8ed79a`. C1b (`<today>` 2026-10-19): eol `1136 1136`, `1945 1945`, `59 59`; numstat `23 1`, `23 0`, `28 1`; 18 tests, 0 fail (working tree only, then restored).
- [ ] **Step 6: Commit.** `git add DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md tests/v-track-docs.test.ts`, then `git commit -m "docs(forms): V track plan 2 in the handoff and the changelog (v-track plan 2 task 33)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

---

### Task 34: Final verification, wiki and memory (controller runs this task)

**Files:**
- Modify: `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md` (the verify line each).
- Modify (vault `D:\Obsidian\Eltross`): `AssetSystem/ams-status.md`, `AssetSystem/ams-log.md`, `AssetSystem/ams-open-questions.md`, and any page that says a validation error of the asset, operation, audit, disposal or maintenance forms is a toast or a disabled button.
- Modify (auto-memory `C:\Users\Eltross\.claude\projects\D--Antigravity-asset-system\memory\`): `v-track.md` and `MEMORY.md`'s line for it; `dark-mode-track.md` and `review-2026-10-priorities.md` only if they state the V-track order differently.

- [ ] **Step 1: Verify.**
  - `npm run verify`: record the test count (**2292 tests, 2291 pass, 0 fail, 1 skipped** when Task 32 made no fix) and the build's page count (60/60 expected; record what verify prints).
  - Add ``- `npm run verify` ผ่าน (test N · ผ่าน N · ข้าม 1 · build X/X หน้า)`` to the plan's changelog entry, directly above its `- **ตรวจบนแอป:** (Task 32) ตรวจบน ` bullet (numbers with thousands commas, as plan 1's entry writes `test 2,256`): old string `- **ตรวจบนแอป:** (Task 32) ตรวจบน `, new string the verify line, a line break and the old string.
  - Add ``- Verification: `npm run verify` passes (tests N · pass N · skipped 1 · build X/X pages).`` to the handoff section, directly above `- Dev-app check: checked (Task 32) on `, the same way.
  - Both old strings occur once in their file (plan 1's bullets say `(Task 30)`). Both files are CRLF in the working tree: insert with the Edit tool (or a Node script that writes `\r\n`; `sed -i` in Git Bash writes LF). `node <tools>/eol.mjs DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md` → equal numbers for each, one more than after Task 33; `git diff --numstat` → `1 0` for each. (Rehearsed on the dry run's Task 33 commit with 2,287 / 2,286 / 60/60, and again on the addendum's (`ae8ed79a`) with 2,292 / 2,291 / 60/60: `1 0` each, eol `1137 1137` and `1942 1942`, the three docs test files 9 tests, 0 fail; working tree only.)
  - `npm test` again (the docs tests still pass: the verify lines add no marker; the same count as above), then `git add DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md` and `git commit -m "docs(ui): record V track plan 2 verify results" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.
- [ ] **Step 2: Wiki.** Read `AssetSystem/_schema/ams-wiki-schema.md` first, then edit:
  - `ams-status.md`: the row that holds the V track (`grep -n "งาน V" AssetSystem/ams-status.md`): plan 2 built on `feat/v-track-2` with the verify numbers, not merged, not deployed; next plan 3 (the settings form), then the final plan. Fix any sentence the row now contradicts.
  - `ams-log.md`: an entry at the top of `## <today>` (a new date heading if `<today>` has none).
  - `ams-open-questions.md`: item 27's order line shows the V track's progress (plan 1 ✓, plan 2 built); the user's answers of 2026-10-18 to this plan's open issues 1–16 (every recommendation: 3, 5, 7, 12, 14 and 16 built in Tasks 31a–31e; 6 stays toasts; 11 waits for UAT; 12's shared whole-number rule and 16's two print-queue buttons on the final plan's list); open issue 15's post-save bug (a second asset after a failed attachment) as its own item, queued as a separate task after this plan merges; Task 32's "Still needs a person" as one new item after the last number (48 is plan 1's), in the shape of item 48.
  - Pages that say these forms' validation errors are toasts, or that the disposal evidence, the bulk execution rows or the maintenance reporter and vendor refusals carry no field: find them with `grep -rlnE "toast|fieldErrors|DISPOSAL_EVIDENCE_EXCEPTION|Vendor not found|Reporter not found" AssetSystem` and read each hit; state what the code does now, with `sources` pointing at the files of Tasks 20 and 27 (`src/lib/disposal-evidence-exception.ts`, `src/lib/disposal-bulk-execution.ts`, `src/lib/maintenance-api-errors.ts`, `src/lib/repair-record-service.ts`, `src/lib/maintenance-plan-service.ts`) or the form, and `confidence` as the schema says for a page checked against the code.
  - A new page (only if a fact has no page yet) gets its line in `ams-index.md` and an `ams-` name no other page of the vault holds; every page you touch keeps `status` / `verified` / `confidence` / `sources`, with `sources` real paths of the repo.
  - Run `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` from `D:\Obsidian\Eltross` (0 errors), and commit only the files you edited (`git -C D:/Obsidian/Eltross add <each file>`, then `git -C D:/Obsidian/Eltross commit -m "ingest: asset-system V track plan 2 built on feat/v-track-2"`). Never stage other sessions' changes in the vault.
- [ ] **Step 3: Memory.** `v-track.md`: plan 2 built on `feat/v-track-2` (assets, operations, audit, disposal, maintenance; 2,292 tests, or the number verify printed), not merged, not deployed; the user's answers of 2026-10-18 (every recommendation, Tasks 31a–31e) and the post-save bug queued after the merge; the wiki item of Step 2; next plan 3 (settings), then the final plan (DESIGN.md), then E2E in both themes, then the one deploy. `MEMORY.md`'s one-line entry for `v-track.md` says the same in one line. Edit `dark-mode-track.md` or `review-2026-10-priorities.md` only where they state another order.
- [ ] **Step 4: Finish** with superpowers:finishing-a-development-branch. The spec merges each plan of the track in order (§9): a local merge fast-forwards `master` (`git merge --ff-only feat/v-track-2` from `master`) and runs the tests on the merged result. No push and no merge without the user. After a merge, offer once to delete plan 2's scratch clones (`<temp>/sim-A`, `sim-A-base`, `sim-D`, `sim-M`, `sim-O`, `sim-O2`, `sim-U`; the memory's "delete scratch clones once a plan is merged"), and delete only on the user's yes.

---

## Spec coverage

Plan 2's scope is spec §5 #1–#33 with §4 for them, §7.4, and §6.2's refusals these forms meet. A row that says "plan 3" or "the final plan" is outside plan 2 by the user's scope (2026-10-18).

### The forms (spec §5 #1–#33, the recon inventory re-counted at `e1caa29`)

33 forms in 28 files; each file gets its `V_FORMS` row in its task (15 → 43). "Star" is a `SELECT_STAR_ONLY` row the task deletes.

| # | Form · file | What the task does | Task |
|---|---|---|---|
| 1 | asset form · `c/assets/asset-form.tsx` | 12 validation toasts → under the field (9 in the save, 3 in the add buttons); protected status and running duplicate check stay gates with a reason; live duplicates once (U8); warranty pair on edit only when a date changed; total seats lose their asterisk; the money fields to two decimals (31c) | 1 (A1), 31c |
| 2 | asset batch · `c/assets/asset-batch-form.tsx` | `common.*` / `rows.<i>.*` errors; the duplicate box → live row errors; the duplicate-check result → its Notice; review hands back; warranty pair always; the price to two decimals (31c); add row, remove row and check duplicates gated with the row limits beside the count (31d) | 2 (A2), 31c, 31d (A8) |
| 3 | register bulk update dialog · `c/assets/asset-register-table.tsx` | "location or custodian" and the reason on submit; apply enabled | 3 (A3) |
| 4 | component install · `c/assets/asset-component-manager.tsx` | the details step a form; the role's star and rule; back to details on a refusal | 4 (A4) |
| 5 | component removal dialog · same file | a form with its `maxLength` | 4 (A4) |
| 6 | status correction · `c/assets/asset-status-correction-button.tsx` | the 5–500 reason on submit; confirm enabled | 5 (A5) |
| 7 | import wizard · `c/assets/asset-import-preview-panel.tsx` | prerequisites only (file, a ready row): import `aria-disabled`, tied to the counts | 6 (A6) |
| 8 | label print · `c/assets/asset-label-print.tsx` | the toolbar a form; the reason's error under the row (and the print queue filter's `min`/`max`, `asset-label-batch-tool.tsx`, not a form) | 7 (A7) |
| 9 | checkout · `c/asset-operations/checkout-form.tsx` | 4 toasts → under the field; handover group; review hands back (`waitForDialogToClose`); star ×2 | 8 (O1), 9 (O2) |
| 10 | checkin · `c/asset-operations/checkin-form.tsx` | 4 toasts → under the field; the return date checked (spec §5 bug); review hands back; star ×3; the return condition and status refusals under their selects (31a) | 10 (O3), 31a (O7) |
| 11 | transfer · `c/asset-operations/transfer-form.tsx` | 1 toast → the asset's `required` and "at least one destination" under the location; review hands back; star | 11 (O4) |
| 12 | bulk move · `c/asset-operations/bulk-move-form.tsx` | 1 toast → under the asset list; the destination checked (spec §5 bug); star | 12 (O5) |
| 13 | transaction cancel dialog · `c/asset-operations/transaction-cancel-dialog.tsx` | the reason's 5–2000 under the field; the blockers gate focusable with its reason | 13 (O6) |
| 14 | audit round · `c/audit/audit-round-form.tsx` | errors under the field; the date pair (`max`/`min` and `notBefore`); the preview's refusal under its field | 14 (U1) |
| 15 | round cancel dialog · `c/audit/audit-round-cancel-button.tsx` | 1 toast → under the reason; 4,000 restated | 15 (U2) |
| 16 | mark not found dialog · `c/audit/audit-mark-not-found-button.tsx` | the pattern, an empty `validate()` (U-R6) | 16 (U3) |
| 17 | review decision · `c/audit/audit-finding-review-actions.tsx` | a form; the remark's `maxLength` | 17 (U4) |
| 18 | action plan · same file | errors under the field | 17 (U4) |
| 19 | close finding · same file | a form; the evidence gate focusable with its reason | 17 (U4) |
| 20 | batch review · `c/audit/audit-findings-batch-actions.tsx` (form in `c/ui/confirm-text-dialog.tsx`) | the selection gate with its reason; `noValidate` | 18 (U5) |
| 21 | scan check · `c/audit/audit-scan-check-form.tsx` | the location's error; focus in the aside or the sheet; the photo gate with its reason; star; the waiting save opens the photo section (31e) | 19 (U6), 31e (U7) |
| 22 | component missing dialog · `c/audit/audit-scan-component-missing-dialog.tsx` | the pattern, an empty `validate()` (U-R6) | 16 (U3) |
| 23 | disposal request · `c/disposal/disposal-request-form.tsx` (+ `disposal-asset-picker.tsx`) | the asset and requester checked (spec §5 bug); the picker's `id`/`error`; star; the values to two decimals (31c) | 21 (D2), 31c |
| 24 | disposal batch · `c/disposal/disposal-batch-form.tsx` | the edit step a form; assets a prerequisite, requester and reason content; back to the edit step; star; the values to two decimals (31c) | 22 (D3), 31c |
| 25 | decision dialog · `c/disposal/disposal-decision-button.tsx` | the rejection reason on save, save enabled; the estimated values to two decimals (31c) | 23 (D4), 31c |
| 26 | execution dialog · `c/disposal/disposal-execution-button.tsx` | the executor, the type's rules, the exception pair on save; the evidence gate with its reason; the evidence refusals under their fields; star; the actual values to two decimals (31c) | 20 (D1), 24 (D5), 31c |
| 27 | bulk approval dialog · `c/disposal/disposal-bulk-approval.tsx` | the remark's refusal under it; nothing eligible a gate with its reason | 25 (D6) |
| 28 | bulk execution dialog · `c/disposal/disposal-bulk-execution.tsx` | shared values, exception and confirmation on submit; back to the review step; nothing eligible a gate with its reason | 20 (D1), 26 (D7) |
| 29 | PM plan · `c/maintenance/maintenance-plan-form.tsx` | errors under the field; the days' range and step; the vendor refusal under it; star | 27 (M1), 28 (M2), 29 (M3) |
| 30 | repair record · `c/maintenance/repair-record-form.tsx` | errors under the field; the two questions as groups; "more details" opens for its field; reporter and vendor refusals under them; star ×2; the cost to two decimals (31c) | 27, 28, 30 (M4), 31c |
| 31 | complete dialog · `c/maintenance/repair-record-actions.tsx` | errors under the field; the return date not before the reported date; the cost to two decimals (31c) | 31 (M5), 31c |
| 32 | cancel dialog · same file | the reason's limit | 31 (M5) |
| 33 | edit dialog · same file | errors under the field; the refusal back to this dialog; the cost to two decimals (31c) | 31 (M5), 31c |

### The rest of the spec

| Spec | What it asks | Where in this plan |
|---|---|---|
| §2 U1 | Errors under the wrong field; the page goes to the first one | every form task (`focusFirstError`, each area's field table in visual order); Task 8 (after a review dialog) |
| §2 U2 | No validation toasts; toasts stay for other failures | the 26 client validation toasts of these forms go (asset form 12, batch 2, component manager 1, checkout 4, checkin 4, transfer 1, bulk move 1, round cancel 1), and the batch's duplicate-check result moves into its Notice; V3 with `NON_VALIDATION_TOASTS` (P-R4) for the four upload results |
| §2 U3 | `fieldErrors` in every route's 400 | plan 1; Tasks 20, 27 and 31a add them to the evidence, bulk-row, reporter, vendor and checkin condition and status refusals |
| §2 U4 | Date pairs | Tasks 1, 2, 7, 14, 31 |
| §2 U5 | Every form in one round | plan 2 of the round; `V_FORMS` 43 of `V_SCOPE`'s 44 files after Task 31 (the settings form: plan 3) |
| §2 U6 | Errors after save; a field's error clears when it changes | every task's `setField`/`clear`; no new live check |
| §2 U8 | Live warnings stay live, under the field; nothing twice | Task 1 (tag, serial), Task 2 (rows; the warning box goes); Review Focus 4 |
| §2 U9 | Dotted keys, one code set, other non-zod refusals | Task 2 (`common.*`, `rows.<i>.*`); Tasks 20, 27 |
| §3 G1–G3, G5 | Every form; the server's errors mapped; gates sorted; one announcement, both themes | Tasks 1–31; `applyServer` in each; each area's gate decisions (A-R3, A-R6, A-R8, A-R10, O-R7, U-R9–U-R11, D-R3, D-R7–D-R9); Task 32 Steps 6–7 |
| §3 G4 | The custom server messages reach the person | the forms read the catalog keys through `message()` (plan 1 F-R3): `licenseSeatsExceeded` (1), `bulkUpdateFieldRequired` (3), `transferDestinationRequired` (11), `endBeforeStart` (14), the disposal keys of D-R6 (21–26), `reporterNotFound`, `vendorNotFound`, `pmVendorNotFound` (27, 29–31), `invalidReturnCondition`, `invalidReturnStatus` (31a) |
| §3 non-goals | No new live validation, no new server rule, offline scans as today | Global Constraints ("The server"); U-R5 (the workspace and its queue unchanged); Task 32 Step 5 (the scan is fulfilled, never aborted, so nothing enters the queue) |
| §3 anti-goals | Silent refusals; toast plus error; live box plus error; the bubble; a wrong field hidden or behind a review; five alerts | Review Focus 3 (fall-through pinned), V3 (no toast), Review Focus 4, `noValidate` (V2), Review Focus 1 and D-R4 / MT-R4 (hidden fields), F-R6 (no alert role; Task 32 Step 7) |
| §4.1 | On submit; form-level fallback; other failures unchanged | each form's refusal line and its pinned fall-through (Review Focus 3) |
| §4.2 | Review dialogs, review steps, multi-step flows, the mobile sheet | Task 8 (FIXED 8) and Tasks 9–11; Task 2 (batch review); Task 4 (install details); Task 6 (the import has no field: its prerequisites keep their gate, A-R6); Tasks 22, 26 (disposal batch, bulk execution); Task 19 (the sheet; U-R11) |
| §4.3 | Clearing per field and per group | the pairs and groups of each area (warranty, license, destinations, round dates, transfer's three destinations, checkout's type change, the execution's and bulk execution's exception pair) |
| §4.4 | Content rules vs prerequisites | the content gates that go: status correction (Task 5), bulk update (3), the batch's in-batch duplicates (2), disposal batch reason and requester (22), the decision's reason (23), the execution's historical reason and acknowledgement (24), bulk execution's shared values and confirmation (26); the prerequisites with a reason: asset save (1), import (6), cancel blockers (13), finding close (17), batch review (18), the scan photo (19), disposal batch assets (22), the execution's evidence (24), the bulk dialogs' eligible rows (25, 26); the batch's add row, remove row and check duplicates with the row count line (31d); the scan photo's section opens on save (31e); the print queue's two buttons go to the final plan (open issue 16) |
| §4.5 | `noValidate`; the attributes stay; `validate()` restates them | every `<form>` of these files (29 more `noValidate` forms, 46 in `src`); `CONSTRAINT_FLOORS` unchanged except checkin's rise; the money step: one rule, `decimals` (31c, X-R3); whole numbers: P-R8 |
| §5 counts and bugs | the asterisk-only selects; the checkin return date, bulk move's destination, the disposal request's asset and requester | `SELECT_STAR_ONLY` 14 → 0 (Tasks 9–12, 19, 21, 22, 24, 29, 30), the disposal asset picker (21) and the license total seats' asterisk (1); Tasks 10, 12, 21 |
| §6.1 | The body; the two special routes keep their `code` | consumed: checkout's `HANDOVER_*` codes (Task 9, O-R2), the execution's `evidenceExceptionReason` zod branch (Task 24), the batch's keys (Task 2); plan 1 built them; zod's `.int()` on a fraction reads `invalidNumber` (31b) |
| §6.2 | Non-zod field refusals | Task 20 (the evidence refusals and the bulk rows; the user's answer 4 of 2026-10-17, "decided in the disposal plan": attach); Task 27 (reporter, vendor, PM vendor on edit); consumed from plan 1 S10: serial `duplicate` (1), checkout condition `conditionBefore` (9), the PM vendor (29), the import rules under `_form` (6); the status correction's `nextStatusId` names no field the panel shows, so it keeps its line (5, A-R10); the purchase document number's `documentNo` stays a toast (open issue 15, answered: kept); checkin's two refusals carry `fieldErrors` (31a) |
| §6.3 | No new server rule | Global Constraints; the warranty and repair-date pairs are client rules (spec §11 call 6); so is the money rule (31c) |
| §7.1 | Shared messages; domain messages stay | the domain messages each area keeps (A-R2, O-R2, U-R7, D-R6, D-R7, MT-R7); "Messages" in the Global Constraints (+9 −8, 4092 → 4093) |
| §7.2 | One hook, rule helpers, `validate()` per form, the disposal helpers reused | every task; D-R6 (`getDisposalExecutionFieldErrors`, `getDisposalDecisionFieldErrors`, `getDisposalRequestReasonError`); FIXED 10 (`step`), FIXED 12 (`decimals`) |
| §7.3 | `Field`/`FieldError`, SearchableSelect, groups, `SignaturePad` unchanged | the SearchableSelect error look on the 14 selects (and `MaintenanceOptionSelect` / `AuditScanCheckField` `error`, plan 1); `FieldGroup` for checkout's handover (9) and the repair questions (30, 31); one `FieldError` under bulk move's list (12), each acknowledgement and confirmation checkbox (24, 26); the license's assignee or department as one error under the assignee and the drop zones (1); `SignaturePad` untouched |
| §7.4 | Date pairs, the asset edit only when a date changed | Tasks 1, 2, 7, 14, 31 |
| §8 | No dependency or write; messages through the script; the guards; FMG `STAR_ONLY` shrinks to empty; pins in the same commit; no line-ending test | Global Constraints; Tasks 0 and 32 (no non-GET reaches the server); Review Focus 5; Tasks 1 and 10 (`STAR_ONLY` empty); each Step 4; the rehearsals and the assembly check |
| §9 | Order of work | plan 2 = "assets; operations; audit; disposal and maintenance"; settings: plan 3; DESIGN.md, docs/14, `.impeccable/design.json`: the final plan; Task 33 (handoff, changelog), Task 34 (wiki) |
| §10 | Left to the builder | the header's "Left to the builder (§10), decided here" |
| §11 calls | 1 `noValidate` · 2 gates · 6 client-only pairs · 7 form-level fallback · 8 license seats asterisk | FIXED 6 · Review Focus 2 · Tasks 1, 2, 31 · Review Focus 3 · Task 1 (A-R4) |

## Open issues (for the user before execution)

**Answered (2026-10-18):** the user answered "ตามที่แนะนำ", every recommendation below. Built in the addendum: 5 → Task 31a; 12 → Task 31b (the map; the shared whole-number rule stays with the final plan); 3 and 14 → Task 31c (one money rule, `decimals`, with `common.validation.tooManyDecimals`); 16 → Task 31d (the batch's three gates; the print queue's two buttons to the final plan's sweep); 7 → Task 31e. 15: the toast stays in plan 2, and the post-save bug is queued as a separate task after this plan merges. Every other issue (1, 2, 4, 6, 8, 9, 10, 11, 13) stays at the default the tasks write. The issues are kept below for the record.

Only decisions the spec and the user's scope leave open. None blocks execution; each default is what the tasks write, and an answer that differs changes the task named. Issues 15 and 16 came from the final review (coverage against plan 1's hand-over and recon-3's gate list); their defaults change nothing in Tasks 1–31.

1. **The protected-status change stays a gate** (Task 1, A-R3): save is `aria-disabled` and names the warning under the status, which already explains and links to the repair workflow. The other way is an error under the status field on submit, which would repeat the warning's title under the same field (the anti-goal "a live warning box and an under-field error"). **Recommendation:** the gate.
2. **The wording of the seven new messages** (glossary words only): `asset.duplicateCheckPending` "กำลังตรวจรหัสทรัพย์สินและ Serial ซ้ำ รอสักครู่แล้วจึงบันทึก" (Task 1); `asset.batchRowDuplicate` "ค่านี้ซ้ำกับแถวอื่นในชุดนี้" (Task 2); `auditFinding.closeNeedsEvidence` "ยังไม่มีหลักฐานปิดงาน ต้องแนบหลักฐานอย่างน้อย 1 ไฟล์ก่อนจึงจะปิดรายการไม่ตรงได้" (Task 17); `auditFinding.batchNeedsSelection` "ยังไม่ได้เลือกรายการ ต้องเลือกรายการไม่ตรงอย่างน้อย 1 รายการก่อนจึงจะพิจารณาได้" (Task 18); `disposalPage.batchNeedsAssets` "เลือกทรัพย์สินอย่างน้อย 2 รายการก่อนตรวจสอบชุดคำขอ" (Task 22); `disposalPage.bulkExecutionPermanentConfirmationRequired` "กรุณาเลือกช่องยืนยันก่อนดำเนินการ" (Task 26); `repairRecord.returnDateBeforeReported` "วันที่ซ่อมเสร็จต้องไม่ก่อนวันที่แจ้งซ่อม" (Task 31). **Recommendation:** as written; the user reads them under real fields on Task 32's screenshots. A change edits that task's change file and its test's string.
3. **Money and the step** (P-R8; areas A, D, M). With `noValidate` the browser no longer refuses 12.345 baht. The asset and disposal money fields keep `range(v, 0)` only (the server accepts any precision and the `Decimal(18, 2)` column rounds); the maintenance money fields restate `step(v, 0.01)` with the `invalidNumber` sentence. **Default:** as drafted (the two differ). **Recommendation:** make them one rule after Task 28: either one small task adds `?? step(v, 0.01)` to the asset form, the batch and the disposal request, batch and execution money fields (not rehearsed; their tests' `validate()` lines change), or Task 29–31 drop the money step; ask the user which.
4. **Messages that go** (they lose their last reader): `asset.licenseSeatUsageInvalid`, `asset.customFieldRequired`, `asset.duplicateWarning` (Tasks 1, 2); `checkout.reviewIncomplete` (Task 9); three `checkin.*` keys (Task 10); `transfer.destinationRequired` (Task 11). The shared or catalog sentences say the same under the field. **Recommendation:** delete, as plan 1 did with the supplier's.
5. **Checkin's two refusals about a field carry no `fieldErrors`** (area O, O-a): `assets/[id]/checkin/route.ts:57` ("Invalid return condition for check-in", `invalidReturnCondition`) and `:60` ("Invalid return status for check-in", `invalidReturnStatus`). As drafted they keep today's toast with the review open (a person meets them only with a stale page). **Recommendation:** a small server task like plan 1's S10 (two lines and one test): `fieldErrors: { conditionAfter: "invalidReturnCondition" }` and `{ nextStatusId: "invalidReturnStatus" }`; the checkin form already holds both keys, so no form change follows. Not rehearsed; it would run after Task 10.
6. **The photo and evidence upload refusals stay toasts** (area U): mark not found, component missing and the finding close's evidence are refused by the server's file checks with a plain error. **Recommendation:** leave them as toasts in plan 2 (about the file, not a typed field); the alternative is a small server task sending `fieldErrors: { evidence: … }` from the two audit routes.
7. **A missing photo while the scan check's note-and-photo section is closed** (Task 19): save waits and the Notice above it says why, but the picker sits in a closed section. **Recommendation:** pressing the waiting save also opens that section (one line, `setExtrasOpen(true)` before the gate's `return`); not in Task 19 as written, because the spec does not name it.
8. **Bulk execution returns to the shared values only when every row is blocked by them** (Task 26, D-R9): with some rows eligible the preview stays, so those rows can still run. **Recommendation:** as drafted.
9. **The permanent confirmation of bulk execution is a field, not a gate** (Task 26): the confirm is enabled while the box is unticked; pressing it shows the error under the box (spec §4.4). **Recommendation:** as drafted (the wording is open issue 2).
10. **The repair edit dialog's reported date has no pair rule** (Task 31): spec §7.4 names only the completion date, and a server rule could refuse stored rows (§11 call 6). **Recommendation:** no rule.
11. **The open repair record shows its Notice and a toast** (Task 30, MT-R8: today's handling of a 409). **Recommendation:** keep both this round; decide in UAT.
12. **Whole numbers, and zod's `.int()` read as `required`** (area U assembly note 1; P-R8). Plan 1's map sends zod's `invalid_type` with `expected: "int"` to `required`, so a fraction refused by the server reads "กรุณาระบุข้อมูลนี้". Every whole-number field of plan 2 checks it on the client first (license seats, the round's year and sample rate, the PM days), so no plan-2 form shows it. **Recommendation:** a one-line fix in `src/lib/field-errors.ts` (`expected: "int"` → `invalidNumber`, with a plan-1-Task-1-style test) in plan 3 or as a small task here; and one shared whole-number rule in the final plan (three restatements today, P-R8).
13. **The empty `validate()` of three forms with no rule** (U-R6: mark not found, component missing, batch review): V2 needs `validate(` in every `V_FORMS` file and the spec forbids inventing a rule. **Default:** an empty `validate()` with a comment. The other way is a `NO_RULE` allowance list in the V2 guard (Tasks 16 and 18 change their Step 1 blocks). **Recommendation:** as drafted.
14. **The step sentence** (MT-R2): `step()` answers `invalidNumber` ("กรุณากรอกเป็นตัวเลข"), loose for 1.255 baht or 1.5 days. **Recommendation:** keep it in plan 2; a clearer shared key (for example `common.validation.invalidStep`) goes with open issue 3 if the user wants it.
15. **The purchase document number's duplicate stays a toast** (Task 1; plan 1 S10 built `fieldErrors: { documentNo: "duplicate" }` on `/api/purchase-documents`'s 409 and handed it to "the assets plan"). The asset form posts its documents only after the asset save went through (`createPurchaseDocuments` after the `POST`/`PUT` of `/api/assets`), and a document queued with "Add purchase document" has already left the number field, so the error would sit under an empty field or a different number, with the asset already saved. **Default:** today's toast in the catch (Task 1 as rehearsed). **Recommendation:** keep it in plan 2. Found while checking, not caused by this plan: on create, any failure after the asset `POST` (install after create, a document, the link, a photo) leaves the person on the filled form with the asset already saved, and pressing save again creates a second asset (unless its tag or serial now refuses as a duplicate). A separate task outside the V track (go to the saved asset and say what did not attach, as the disposal and repair forms' upload-result toasts do) fixes both; ask the user whether to queue it.
16. **Gates of recon-3 that plan 2 leaves as plain `disabled` with no reason** (spec §4.4: "a gate that shows nothing today gets a visible reason line"). In the batch (#2): "add row" at 100 rows (`asset-batch-form.tsx:796`), the two "remove row" buttons at 2 rows (`:851`, `:948`; nothing on the page names the 2–100 limits), and "check duplicates" while in-batch duplicates exist (`:800`; after Task 2 the live errors under the rows say why, but the button is not tied to them). On the label print queue page (`asset-label-batch-tool.tsx`, not a form of #1–#33): print and print-first-label with nothing selected (`:496`, `:500`) and "add filtered" with none (`:359`, whose label already changes to say why). **Default:** unchanged (Tasks 2 and 7 do not touch them). **Recommendation:** one small task after Task 7 (A8, not rehearsed) for the batch's three buttons: `aria-disabled` with `aria-describedby` to the row count line, which gains the limits (one new message, for example `asset.batchRowLimits` "ชุดหนึ่งมีได้ 2–100 รายการ"), and "check duplicates" described by that line too; the queue's two print buttons go to the final plan's sweep (a page action, not a form).

### Behaviour changes a person would notice beyond the spec

Everything else a person sees change is a decision of the spec (errors under the field, no validation toast, focus, the gates of §4.4, the date pairs, the checked selects). Beyond it:
- **Assets:** the component role shows an asterisk (the server already required it); Enter in a component-install detail continues to the review, and Enter in the label print reason prints (both are forms now); a purchase price or a document total with more than two decimals (12.345) shows "กรอกทศนิยมได้ไม่เกิน 2 ตำแหน่ง" under the field instead of the browser's bubble (Task 31c, as in every money field); the batch's add row, remove row and check duplicates stay focusable at their limits, and the row count line says "ชุดหนึ่งมีได้ 2–100 รายการ" (Task 31d); the batch "check duplicates" result that finds duplicates no longer pops a toast (its Notice reads it out); the status correction's reason shows a star and its confirm is always pressable.
- **Operations:** transfer's missing asset says "required" under the asset, not "choose a destination" in a toast, and "at least one destination" shows under the location select; checkout's handover messages sit under the handover group and the due date in the same words; the cancel dialog's blocked confirm takes focus and reads the blockers; checkin's return date is required by the form (the server always required it); a checkin refused for its return condition or status shows the reason under that select after the review closes (Task 31a).
- **Audit:** the round's date pickers cannot choose a reversed pair; a server refusal of the preview shows under its field instead of "ข้อมูลที่กรอกไม่ครบหรือไม่ถูกต้อง"; the decision and close dialogs submit on Enter; the scan check's waiting save opens the note-and-photo section (Task 31e).
- **Disposal:** a sale or salvage value with more than two decimals shows the money sentence under the field, as in the asset form (Task 31c); the request's save, the batch's review, the decision's save on a rejection without a reason and bulk execution's review are no longer disabled or silent; Enter in the batch's edit step (the asset search included) submits the step; a bulk execution preview that nothing can run because of the shared values goes back to them; the execution dialog no longer closes on the evidence reason or acknowledgement refusal (it keeps the entries and shows the error).
- **Maintenance:** an inactive vendor or reporter shows its own sentence under its select instead of "เกิดข้อผิดพลาด"; "รายละเอียดเพิ่มเติม" opens by itself when a field inside has an error; the return date's calendar starts at the reported date; a dialog closed with errors opens again without them; a repair cost with three decimals reads the money sentence instead of "กรุณากรอกเป็นตัวเลข" (Task 31c).
